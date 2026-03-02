import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

import type { Milestone, Task } from "../../lib/types";
import {
  diffInDays,
  diffInMonths,
  formatDayLabel,
  formatMonthLabel,
  formatWeekLabel,
  getDateColumns,
  getMonthColumns,
  getWeekColumns,
  parseISODate,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  addDays,
  diffInDaysSigned,
  businessDaysBetweenInclusive,
} from "../../lib/dateRange";
import { getAutoScale, getRangeScale } from "../../lib/dateScale";
import { GanttGrid } from "./GanttGrid";
import { GanttHeader } from "./GanttHeader";
import { GanttMilestones } from "./GanttMilestones";
import { GanttRow } from "./GanttRow";
import { GanttBar } from "./GanttBar";
import { GanttTaskList } from "./GanttTaskList";
import { TaskEditDialog } from "../TaskEditDialog";
import { GanttRelations } from "./GanttRelations";
import { computeScenarioDeltas } from "./ganttUtils";
import { createScenario, createScenarioTask, updateScenarioTask, fetchScenarios, fetchScenarioTasks, deleteScenario, promoteScenarioToBaseline, createRiskAdjustedScenario } from "../../lib/api";
import MonteCarloPanel from "../MonteCarloPanel";
import { RiskAdjustResultPanel, type RiskAdjustResult } from "../RiskAdjustResultPanel";
import { Button } from "../ui/Button";

interface GanttLayoutProps {
  projectId?: number;
  tasks: Task[];
  milestones: Milestone[];
  onEditTask: (task: Task) => void;
  onAdjustTaskDates: (taskId: number, mode: "start" | "end", deltaDays: number) => void;
  onMoveTaskDates: (taskId: number, deltaDays: number) => void;
  onReorderTasks: (orderedIds: number[]) => void;
  onMoveMilestone: (milestoneId: number, deltaDays: number) => void;
  onDisplayedTasksCount?: (count: number) => void;
  // optional scenario selection wiring from parent
  selectedScenarioId?: number | null;
  onSelectScenario?: (id: number | null) => void;
}

const ROW_HEIGHT = 44;
const DAY_WIDTH = 40;
const WEEK_WIDTH = 120;
const MONTH_WIDTH = 160;
const HEADER_HEIGHT = 38;

export const GanttLayout = ({
  projectId: projectIdProp,
  tasks,
  milestones,
  onEditTask,
  onAdjustTaskDates,
  onMoveTaskDates,
  onReorderTasks,
  onMoveMilestone,
  onDisplayedTasksCount,
  selectedScenarioId: propSelectedScenarioId,
  onSelectScenario,
}: GanttLayoutProps) => {
  const [hideDone, setHideDone] = useState(false);
  const [showRelations, setShowRelations] = useState(false);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartIndexRef = useRef<number>(0);
  const dropIndexRef = useRef<number | null>(null);

  // Scenario mode state: temporary local copy of tasks to edit visually
  const [scenarioMode, setScenarioMode] = useState(false);
  const [scenarioTasks, setScenarioTasks] = useState<Task[] | null>(null);
  const [editingScenarioTask, setEditingScenarioTask] = useState<Task | null>(null);
  const [baselineTasks, setBaselineTasks] = useState<Task[] | null>(null);
  const [savingScenario, setSavingScenario] = useState(false);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [availableScenarios, setAvailableScenarios] = useState<{ id: number; name: string; isBaseline?: boolean }[] | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [showSaveName, setShowSaveName] = useState(false);
  const [saveName, setSaveName] = useState("");
  const tempIdRef = useRef<number>(-1);
  const [riskTarget, setRiskTarget] = useState<number>(90);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [showRiskMenu, setShowRiskMenu] = useState(false);
  const [riskAdjustResult, setRiskAdjustResult] = useState<RiskAdjustResult | null>(null);

  const handleCreateRiskAdjusted = async () => {
    const sourceId = propSelectedScenarioId ?? selectedScenarioId ?? tasks[0]?.scenarioId ?? null;
    if (!sourceId) {
      alert("No source scenario selected");
      return;
    }
    setIsAdjusting(true);
    try {
      const res = await createRiskAdjustedScenario(sourceId, { targetP: riskTarget, runs: 100000 });
      const newId = res?.new_scenario_id ?? res?.newScenarioId ?? null;
      if (newId) {
        // notify parent first, then update local to maintain sync
        if (typeof onSelectScenario === "function") onSelectScenario(newId);
        setSelectedScenarioId(newId);
      }
      // Store full result with task shift details and original Monte Carlo
      if (res?.task_details && res?.original_montecarlo) {
        setRiskAdjustResult(res as RiskAdjustResult);
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to create risk-adjusted scenario");
    } finally {
      setIsAdjusting(false);
      setShowRiskMenu(false);
    }
  };
  

  

  // Reset local scenario state when project changes to ensure baseline is loaded
  useEffect(() => {
    if (projectIdProp) {
      setSelectedScenarioId(null);
      setScenarioMode(false);
      setScenarioTasks(null);
      setAvailableScenarios(null);
      setShowLoadMenu(false);
    }
  }, [projectIdProp]);

  // Sync local scenario state with parent when parent changes
  useEffect(() => {
    if (propSelectedScenarioId !== undefined && propSelectedScenarioId !== selectedScenarioId) {
      setSelectedScenarioId(propSelectedScenarioId);
    }
  }, [propSelectedScenarioId]);

  useEffect(() => {
    const element = timelineRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => {
      setTimelineWidth(element.clientWidth);
    };

    updateWidth();
    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const { start, end } = useMemo(() => {
    const dates: Date[] = [];

    const pushIfValid = (d: Date | null | undefined) => {
      if (d instanceof Date && !isNaN(d.getTime())) dates.push(d);
    };

    if (scenarioMode && scenarioTasks) {
      for (const t of scenarioTasks) {
        pushIfValid(parseISODate(t.startDate));
        pushIfValid(parseISODate(t.endDate));
      }
    } else {
      for (const t of tasks ?? []) {
        pushIfValid(parseISODate(t.startDate));
        pushIfValid(parseISODate(t.endDate));
      }
    }

    for (const m of milestones ?? []) {
      pushIfValid(parseISODate(m.targetDate || m.dueDate));
    }

    if (dates.length === 0) {
      const today = new Date();
      const s = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      return { start: s, end: addDays(s, 14) };
    }
      

    const rawStart = new Date(Math.min(...dates.map((date) => date.getTime())));
    const rawEnd = new Date(Math.max(...dates.map((date) => date.getTime())));
    // always pad two days before start and two days after end
    return { start: addDays(rawStart, -2), end: addDays(rawEnd, 2) };
  }, [milestones, tasks, scenarioMode, scenarioTasks]);

  const fallbackScale = getRangeScale(start, end);
  const autoScale = useMemo(() => {
    if (timelineWidth <= 0) {
      return null;
    }
    return getAutoScale(start, end, timelineWidth);
  }, [start, end, timelineWidth]);

  const scale = autoScale?.scale ?? fallbackScale;
  const columnWidth =
    autoScale?.columnWidth ??
    (scale === "week" ? WEEK_WIDTH : scale === "month" ? MONTH_WIDTH : DAY_WIDTH);

  const rangeStart =
    scale === "week" ? startOfWeek(start) : scale === "month" ? startOfMonth(start) : start;
  const columns =
    scale === "week"
      ? getWeekColumns(start, end)
      : scale === "month"
      ? getMonthColumns(start, end)
      : getDateColumns(start, end);

  const headerLabels = columns.map((column) =>
    scale === "week"
      ? formatWeekLabel(column)
      : scale === "month"
      ? formatMonthLabel(column)
      : formatDayLabel(column)
  );

  const getTaskPosition = (task: Task) => {
    const taskStart = parseISODate(task.startDate);
    const taskEnd = parseISODate(task.endDate);

    if (scale === "week") {
      const daysFromRangeStartToStart = diffInDays(rangeStart, taskStart);
      const daysFromRangeStartToEnd = diffInDays(rangeStart, taskEnd);
      const dayPixel = columnWidth / 7;
      const offset = daysFromRangeStartToStart * dayPixel;
      const width = (daysFromRangeStartToEnd - daysFromRangeStartToStart + 1) * dayPixel;
      return { offset, width };
    }

    if (scale === "month") {
      const startMonthIndex = diffInMonths(rangeStart, startOfMonth(taskStart));
      const endMonthIndex = diffInMonths(rangeStart, startOfMonth(taskEnd));

      // compute offset: full months before start + fraction of the start month
      const startMonthDate = startOfMonth(taskStart);
      const daysInStartMonth = endOfMonth(startMonthDate).getUTCDate();
      const dayOfStart = taskStart.getUTCDate();
      const offset = startMonthIndex * columnWidth + ((dayOfStart - 1) / daysInStartMonth) * columnWidth;

      // compute width by summing fractional widths across months
      let width = 0;
      if (startMonthIndex === endMonthIndex) {
        const daysInThisMonth = daysInStartMonth;
        const dayOfEnd = taskEnd.getUTCDate();
        width = ((dayOfEnd - dayOfStart + 1) / daysInThisMonth) * columnWidth;
      } else {
        // first partial month
        const daysRemainingInStart = daysInStartMonth - (dayOfStart - 1);
        width += (daysRemainingInStart / daysInStartMonth) * columnWidth;

        // middle full months
        for (let mi = startMonthIndex + 1; mi < endMonthIndex; mi += 1) {
          width += columnWidth;
        }

        // last partial month
        const endMonthDate = startOfMonth(taskEnd);
        const daysInEndMonth = endOfMonth(endMonthDate).getUTCDate();
        const dayOfEnd = taskEnd.getUTCDate();
        width += (dayOfEnd / daysInEndMonth) * columnWidth;
      }

      return { offset, width };
    }

    const startIndex = diffInDays(rangeStart, taskStart);
    const endIndex = diffInDays(rangeStart, taskEnd);
    return {
      offset: startIndex * columnWidth,
      width: (endIndex - startIndex + 1) * columnWidth,
    };
  };

  const getDatePosition = (dateStart: Date, dateEnd: Date) => {
    if (scale === "week") {
      const daysFromRangeStartToStart = diffInDays(rangeStart, dateStart);
      const daysFromRangeStartToEnd = diffInDays(rangeStart, dateEnd);
      const dayPixel = columnWidth / 7;
      const offset = daysFromRangeStartToStart * dayPixel;
      const width = (daysFromRangeStartToEnd - daysFromRangeStartToStart + 1) * dayPixel;
      return { offset, width };
    }

    if (scale === "month") {
      const startMonthIndex = diffInMonths(rangeStart, startOfMonth(dateStart));
      const endMonthIndex = diffInMonths(rangeStart, startOfMonth(dateEnd));

      const startMonthDate = startOfMonth(dateStart);
      const daysInStartMonth = endOfMonth(startMonthDate).getUTCDate();
      const dayOfStart = dateStart.getUTCDate();
      const offset = startMonthIndex * columnWidth + ((dayOfStart - 1) / daysInStartMonth) * columnWidth;

      let width = 0;
      if (startMonthIndex === endMonthIndex) {
        const daysInThisMonth = daysInStartMonth;
        const dayOfEnd = dateEnd.getUTCDate();
        width = ((dayOfEnd - dayOfStart + 1) / daysInThisMonth) * columnWidth;
      } else {
        const daysRemainingInStart = daysInStartMonth - (dayOfStart - 1);
        width += (daysRemainingInStart / daysInStartMonth) * columnWidth;
        for (let mi = startMonthIndex + 1; mi < endMonthIndex; mi += 1) {
          width += columnWidth;
        }
        const endMonthDate = startOfMonth(dateEnd);
        const daysInEndMonth = endOfMonth(endMonthDate).getUTCDate();
        const dayOfEnd = dateEnd.getUTCDate();
        width += (dayOfEnd / daysInEndMonth) * columnWidth;
      }

      return { offset, width };
    }

    const startIndex = diffInDays(rangeStart, dateStart);
    const endIndex = diffInDays(rangeStart, dateEnd);
    return {
      offset: startIndex * columnWidth,
      width: (endIndex - startIndex + 1) * columnWidth,
    };
  };

  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const scenarioTaskMap = useMemo(() => {
    if (!scenarioTasks) return new Map<number, Task>();
    return new Map(scenarioTasks.map((t) => [t.id, t]));
  }, [scenarioTasks]);

  const isScenarioTaskChanged = (scenarioTask: Task, baseTask?: Task): boolean => {
    if (!baseTask) return true;

    const sStart = parseISODate(scenarioTask.startDate)?.getTime();
    const bStart = parseISODate(baseTask.startDate)?.getTime();
    const sEnd = parseISODate(scenarioTask.endDate)?.getTime();
    const bEnd = parseISODate(baseTask.endDate)?.getTime();

    return sStart !== bStart || sEnd !== bEnd;
  };

  

  const visibleTasks = useMemo(() => {
    if (!hideDone) return tasks;
    return tasks.filter((t) => !(t.status && t.status.toLowerCase() === "done"));
  }, [tasks, hideDone]);

  // left column list: when in scenario mode, show only scenario tasks
  const leftColumnTasks = useMemo(() => {
    if (!scenarioMode || !scenarioTasks) return visibleTasks;
    // map ScenarioTask -> Task shape for the left column; do NOT merge baseline tasks here
    const mapped = scenarioTasks.map((st) => ({
      id: st.id,
      scenarioId: st.scenarioId ?? (typeof projectIdProp !== 'undefined' ? projectIdProp : tasks[0]?.scenarioId ?? 0),
      title: st.title,
      description: st.description ?? undefined,
      status: st.status,
      startDate: st.startDate,
      endDate: st.endDate,
      dependencies: st.dependencies ?? [],
      orderIndex: st.orderIndex,
    } as Task));
    return mapped.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [scenarioMode, scenarioTasks, tasks, visibleTasks]);

  // When in scenario mode, display scenarioTasks (which may include scenario-only tasks)
  const displayedTasks = useMemo(() => {
    if (scenarioMode && scenarioTasks) return scenarioTasks;
    return visibleTasks;
  }, [scenarioMode, scenarioTasks, visibleTasks]);

  // notify parent about current displayed tasks count (includes scenario-only tasks)
  useEffect(() => {
    if (typeof onDisplayedTasksCount === "function") {
      onDisplayedTasksCount(displayedTasks.length);
    }
  }, [displayedTasks, onDisplayedTasksCount]);

  const clampIndex = (value: number) => {
    if (visibleTasks.length === 0) {
      return 0;
    }
    return Math.max(0, Math.min(visibleTasks.length - 1, value));
  };

  const scenarioDeltas = useMemo(() => {
    if (!scenarioMode) return null;
    return computeScenarioDeltas(visibleTasks, scenarioTasks);
  }, [scenarioMode, scenarioTasks, visibleTasks]);

  // Relations are always visible now; removed toggle state

  const positions = useMemo(() =>
    displayedTasks.map((t) => {
      const base = { id: t.id, ...getTaskPosition(t) } as any;
      // compute optional actuals if present
      try {
        if ((t as any).actualStart) {
          const aStart = parseISODate((t as any).actualStart);
          if (!isNaN(aStart.getTime())) {
            if ((t as any).actualEnd) {
              const aEnd = parseISODate((t as any).actualEnd);
              if (!isNaN(aEnd.getTime())) {
                const pos = getDatePosition(aStart, aEnd);
                base.actualOffset = pos.offset;
                base.actualWidth = pos.width;
              } else {
                const pos = getDatePosition(aStart, aStart);
                base.actualOffset = pos.offset;
                base.actualWidth = undefined;
              }
            } else {
              const pos = getDatePosition(aStart, aStart);
              base.actualOffset = pos.offset;
              base.actualWidth = undefined;
            }
          }
        }
      } catch (e) {
        // ignore parsing errors
      }
      return base;
    })
  , [displayedTasks, columnWidth, scale, rangeStart]);

  // Local handlers that modify only the temporary scenarioTasks state
  const localOnAdjustTaskDates = (taskId: number, mode: "start" | "end", deltaDays: number) => {
    setScenarioTasks((prev) => {
      if (!prev) return prev;
      return prev.map((t) => {
        if (t.id !== taskId) return t;
        const s = parseISODate(t.startDate);
        const e = parseISODate(t.endDate);
        if (mode === "start") {
          const ns = addDays(s, deltaDays);
          return { ...t, startDate: ns.toISOString().slice(0, 10) };
        }
        const ne = addDays(e, deltaDays);
        return { ...t, endDate: ne.toISOString().slice(0, 10) };
      });
    });
  };

  const localOnMoveTaskDates = (taskId: number, deltaDays: number) => {
    setScenarioTasks((prev) => {
      if (!prev) return prev;
      return prev.map((t) => {
        if (t.id !== taskId) return t;
        const s = parseISODate(t.startDate);
        const e = parseISODate(t.endDate);
        const ns = addDays(s, deltaDays);
        const ne = addDays(e, deltaDays);
        return { ...t, startDate: ns.toISOString().slice(0, 10), endDate: ne.toISOString().slice(0, 10) };
      });
    });
  };

  const createScenarioTaskLocal = () => {
    const localId = tempIdRef.current--;
    const projectId = (typeof projectIdProp !== 'undefined' ? projectIdProp : tasks[0]?.scenarioId) ?? 0;
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const startDate = start.toISOString().slice(0, 10);
    const endDate = addDays(start, 2).toISOString().slice(0, 10);

    const newTask: Task = {
      id: localId,
      scenarioId: projectId,
      title: "New task",
      description: undefined,
      status: "todo",
      startDate,
      endDate,
      dependencies: [],
      orderIndex: 0,
    } as Task;

    setScenarioTasks((prev) => {
      const list = prev ? [...prev] : [];
      const maxOrder = list.reduce((m, t) => Math.max(m, t.orderIndex ?? 0), 0);
      const orderIndex = maxOrder + 1;
      newTask.orderIndex = orderIndex;
      return [...list, newTask];
    });

    // open editor for the newly created scenario task
    setEditingScenarioTask({ ...newTask } as any);
  };

  // typed no-op handlers for base vs scenario wiring
  const noopAdjust = (taskId: number, mode: "start" | "end", deltaDays: number) => {};
  const noopMove = (taskId: number, deltaDays: number) => {};
  const noopRowDrag = (taskId: number, _event: any) => {};

  const handleRowDragStart = (taskId: number, event: PointerEvent<Element>) => {
    const index = tasks.findIndex((task) => task.id === taskId);
    if (index < 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    dragPointerIdRef.current = event.pointerId;
    dragStartIndexRef.current = index;
    setDraggingTaskId(taskId);
    setDropIndex(index);
    // store dropIndexRef as visible-row index when possible
    const visIndex = visibleTasks.findIndex((t) => t.id === taskId);
    dropIndexRef.current = visIndex >= 0 ? visIndex : index;
    if (event.currentTarget?.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    if (draggingTaskId === null) {
      return;
    }

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (dragPointerIdRef.current !== event.pointerId) {
        return;
      }
      event.preventDefault();
      const rect = layoutRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const relativeY = event.clientY - rect.top - HEADER_HEIGHT;
      const nextIndex = clampIndex(Math.floor(relativeY / ROW_HEIGHT));
      setDropIndex(nextIndex);
      // store visible-row index; will be converted to full-task index on drop
      dropIndexRef.current = nextIndex;
    };

    const finishDrag = (event: globalThis.PointerEvent) => {
      if (dragPointerIdRef.current !== event.pointerId) {
        return;
      }
      const startIndex = dragStartIndexRef.current;
      // convert visible next index to full tasks index if necessary
      let nextIndex = startIndex;
      if (dropIndexRef.current !== null && dropIndexRef.current !== undefined) {
        const vis = dropIndexRef.current;
        const visTask = visibleTasks[vis];
        if (visTask) {
          const mapped = tasks.findIndex((t) => t.id === visTask.id);
          nextIndex = mapped >= 0 ? mapped : startIndex;
        } else {
          nextIndex = startIndex;
        }
      }
      setDraggingTaskId(null);
      setDropIndex(null);
      dragPointerIdRef.current = null;
      dropIndexRef.current = null;
      if (startIndex === nextIndex || tasks.length === 0) {
        return;
      }
      const orderedIds = tasks.map((task) => task.id);
      const [moved] = orderedIds.splice(startIndex, 1);
      orderedIds.splice(nextIndex, 0, moved);
      onReorderTasks(orderedIds);
    };

    const handlePointerUp = (event: globalThis.PointerEvent) => {
      finishDrag(event);
    };

    const handlePointerCancel = (event: globalThis.PointerEvent) => {
      if (dragPointerIdRef.current !== event.pointerId) {
        return;
      }
      setDraggingTaskId(null);
      setDropIndex(null);
      dragPointerIdRef.current = null;
      dropIndexRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp, { passive: false });
    window.addEventListener("pointercancel", handlePointerCancel, { passive: false });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [draggingTaskId, onReorderTasks, tasks]);

  const draggingIndex = draggingTaskId !== null ? displayedTasks.findIndex((t) => t.id === draggingTaskId) : null;

  // Determine if currently viewing baseline scenario
  const isViewingBaseline = useMemo(() => {
    if (!availableScenarios || !propSelectedScenarioId) return false;
    const currentScenario = availableScenarios.find(s => s.id === propSelectedScenarioId);
    return currentScenario?.isBaseline === true;
  }, [availableScenarios, propSelectedScenarioId]);

  return (
    <section className="rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-100">Gantt</h2>
            {isViewingBaseline && (
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                Baseline
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Scale: {scale === "month" ? "Months" : scale === "week" ? "Weeks" : "Days"}
          </p>
        </div>
        <div className="relative flex items-center gap-3">
          <div className="text-xs text-slate-500">{displayedTasks.length} tasks</div>
          <Button type="button" onClick={() => setHideDone((s) => !s)} aria-pressed={hideDone} variant={hideDone ? "success" : "ghost"}>
            {hideDone ? "Show done" : "Hide done"}
          </Button>
          <Button type="button" aria-pressed={!showRelations} onClick={() => setShowRelations((s) => !s)} variant={showRelations ? "primary" : "ghost"}>
            {showRelations ? "Hide relations" : "Show relations"}
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (!scenarioMode) {
                setScenarioTasks(tasks.map((t) => ({ ...(t as any) })) as Task[]);
                setBaselineTasks(tasks.map((t) => ({ ...t })));
                setScenarioMode(true);
              } else {
                setScenarioMode(false);
                setScenarioTasks(null);
              }
            }}
            variant={scenarioMode ? "danger" : "success"}
          >
            {scenarioMode ? "Exit scenario" : "New scenario"}
          </Button>
          {scenarioMode && (
            <Button type="button" onClick={() => createScenarioTaskLocal()} variant="primary">
              New task
            </Button>
          )}

          <div>
            <Button
              type="button"
              onClick={async () => {
                const projectId = typeof projectIdProp !== "undefined" ? projectIdProp : tasks[0]?.scenarioId ?? undefined;
                try {
                  setShowLoadMenu((s) => !s);
                  const list = await fetchScenarios(projectId);
                  const mapped = list.map((s) => ({ 
                    id: s.id, 
                    name: s.name, 
                    isBaseline: (s as any).isBaseline === true 
                  }));
                  setAvailableScenarios(mapped);
                  // Don't auto-select when loading scenarios list - let parent control selection
                } catch (err) {
                  console.error(err);
                }
              }}
              variant="primary"
            >
              Load scenario
            </Button>
            {showLoadMenu && (
              <div className="absolute right-0 mt-2 p-3 rounded-md bg-slate-800 border border-slate-700 z-40 origin-top-right">
                <div className="mb-2 text-sm text-slate-300">Choose scenario</div>
                <div className="mb-2 block w-64 text-sm p-1 bg-slate-900 border border-slate-700 max-h-60 overflow-auto">
                  {(availableScenarios ?? []).map((s) => (
                    <div
                      key={s.id}
                      className={`p-2 cursor-pointer text-slate-200 hover:bg-slate-700 flex items-center justify-between ${selectedScenarioId === s.id ? 'bg-slate-700' : ''}`}
                      onClick={async () => {
                        try {
                          const tasksForScenario = await fetchScenarioTasks(s.id);
                          setScenarioTasks(tasksForScenario as Task[]);
                          try {
                            const projectId = typeof projectIdProp !== 'undefined' ? projectIdProp : tasks[0]?.scenarioId ?? undefined;
                            if (projectId) {
                              const scenarios = await fetchScenarios(projectId);
                              const baseline = scenarios.find((s: any) => (s as any).isBaseline === true) ?? scenarios[0];
                              if (baseline) {
                                const baselineDtos = await fetchScenarioTasks(baseline.id);
                                setBaselineTasks(
                                  baselineDtos.map((st) => ({
                                    id: (st as any).taskId ?? st.id,
                                    scenarioId: st.scenarioId,
                                    title: st.title,
                                    description: st.description ?? undefined,
                                    status: st.status,
                                    startDate: st.startDate,
                                    endDate: st.endDate,
                                    dependencies: st.dependencies ?? [],
                                    orderIndex: st.orderIndex,
                                  }))
                                );
                              } else {
                                setBaselineTasks(null);
                              }
                            }
                          } catch (e) {
                            console.error(e);
                            setBaselineTasks(null);
                          }
                          setScenarioMode(true);
                          // notify parent first, then update local to maintain sync
                          if (typeof onSelectScenario === "function") onSelectScenario(s.id);
                          setSelectedScenarioId(s.id);
                          setShowLoadMenu(false);
                        } catch (err) {
                          console.error(err);
                          alert(`Failed to load scenario: ${String(err)}`);
                        }
                      }}
                    >
                      <div className="flex-1 flex items-center gap-2">
                        <span>{s.name}</span>
                        {s.isBaseline && (
                          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                            Baseline
                          </span>
                        )}
                      </div>
                      <div className="flex items-center">
                        <Button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const confirmed = confirm(`Delete scenario "${s.name}"?`);
                            if (!confirmed) return;
                            try {
                              const projectId = typeof projectIdProp !== 'undefined' ? projectIdProp : tasks[0]?.scenarioId ?? undefined;
                              await deleteScenario(s.id);
                              const list = await fetchScenarios(projectId);
                              const mappedList = list.map((ss) => ({ 
                                id: ss.id, 
                                name: ss.name, 
                                isBaseline: (ss as any).isBaseline === true 
                              }));
                              setAvailableScenarios(mappedList);
                              
                              // If we deleted the currently selected scenario, reset to null and let parent handle baseline selection
                              if (selectedScenarioId === s.id) {
                                if (typeof onSelectScenario === "function") onSelectScenario(null);
                                setSelectedScenarioId(null);
                              }
                              
                              if (scenarioMode && selectedScenarioId === s.id) {
                                setScenarioMode(false);
                                setScenarioTasks(null);
                              }
                            } catch (err) {
                              console.error(err);
                              alert(`Failed to delete scenario: ${String(err)}`);
                            }
                          }}
                          variant="ghost"
                          className="ml-2 text-red-400 border-red-600"
                        >
                          Delete
                        </Button>
                        <Button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const confirmed = confirm(`Promote scenario "${s.name}" to baseline?`);
                            if (!confirmed) return;
                            try {
                              const projectId = typeof projectIdProp !== 'undefined' ? projectIdProp : tasks[0]?.scenarioId ?? undefined;
                              await promoteScenarioToBaseline(s.id);
                              const list = await fetchScenarios(projectId);
                              const mappedList = list.map((ss) => ({ 
                                id: ss.id, 
                                name: ss.name, 
                                isBaseline: (ss as any).isBaseline === true 
                              }));
                              setAvailableScenarios(mappedList);
                              
                              // Notify parent that this scenario is now baseline
                              if (typeof onSelectScenario === "function") onSelectScenario(s.id);
                              setSelectedScenarioId(s.id);
                              
                              alert("Scenario promoted to baseline");
                            } catch (err) {
                              console.error(err);
                              alert(`Failed to promote scenario: ${String(err)}`);
                            }
                          }}
                          variant="ghost"
                          className="ml-2 text-amber-300 border-amber-600"
                        >
                          Promote
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => setShowLoadMenu(false)} variant="ghost">
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
          {/* Save name input */}
          {scenarioMode && (
            <div className="ml-2">
              {!showSaveName ? (
                <Button
                  type="button"
                  onClick={() => {
                    setShowSaveName(true);
                    setSaveName(`Scenario ${new Date().toISOString().slice(0, 19)}`);
                  }}
                  variant="primary"
                >
                  Save scenario
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    className="text-sm p-1 rounded-md bg-slate-900 border border-slate-700"
                  />
                  <Button
                    type="button"
                    onClick={async () => {
                      if (!saveName || !scenarioTasks) return;
                      try {
                        setSavingScenario(true);
                        const projectId = typeof projectIdProp !== 'undefined' ? projectIdProp : tasks[0]?.scenarioId ?? 0;
                        const scenario = await createScenario({ projectId, name: saveName, description: null });

                        const mapping = new Map<number, number>(); // local id -> created scenario_task id
                        // create scenario tasks in order
                        for (const [idx, st] of scenarioTasks.entries()) {
                          const localId = st.id;
                          const payload = {
                            taskId: localId > 0 ? localId : null,
                            title: st.title,
                            description: st.description ?? null,
                            status: st.status,
                            startDate: st.startDate,
                            endDate: st.endDate,
                            orderIndex: st.orderIndex ?? idx + 1,
                            dependencies: [],
                                
                          } as const;

                          const created = await createScenarioTask(scenario.id, payload as any);
                          mapping.set(localId, created.id);
                        }

                        // update dependencies
                        for (const st of scenarioTasks) {
                          const localId = st.id;
                          const newId = mapping.get(localId);
                          if (!newId) continue;
                          const deps = (st.dependencies || [])
                            .map((d) => mapping.get(d))
                            .filter(Boolean) as number[];
                          if (deps.length > 0) {
                            await updateScenarioTask(newId, { dependencies: deps });
                          }
                        }

                        setScenarioMode(false);
                        setScenarioTasks(null);
                        setShowSaveName(false);
                      } catch (err) {
                        console.error(err);
                        alert(`Failed to save scenario: ${String(err)}`);
                      } finally {
                        setSavingScenario(false);
                      }
                    }}
                    variant="success"
                  >
                    Confirm
                  </Button>
                  <Button type="button" onClick={() => setShowSaveName(false)} variant="ghost">
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        
      </div>

      <div ref={layoutRef} className="relative grid grid-cols-[300px_1fr] gap-0">
        {/* full-row overlays span both columns to color the entire row during reordering */}
        {draggingIndex !== null && draggingIndex >= 0 && (
          <div
            aria-hidden
            className="absolute left-0 right-0 rounded-xl pointer-events-none transition-all"
            style={{
              top: HEADER_HEIGHT + draggingIndex * ROW_HEIGHT,
              height: ROW_HEIGHT,
              background: "rgba(99,102,241,0.06)",
              boxShadow: "0 6px 18px rgba(15, 23, 42, 0.25)",
              zIndex: 20,
            }}
          />
        )}
        {dropIndex !== null && (
          <div
            aria-hidden
            className="absolute left-0 right-0 rounded-xl pointer-events-none transition-all"
            style={{
              top: HEADER_HEIGHT + dropIndex * ROW_HEIGHT,
              height: ROW_HEIGHT,
              background: "rgba(16,185,129,0.06)",
              zIndex: 15,
            }}
          />
        )}
        <GanttTaskList
          tasks={leftColumnTasks}
          hideDone={hideDone}
          rowHeight={ROW_HEIGHT}
          onEditTask={(task) => {
            // if in scenario mode and this task exists in scenarioTasks, open local scenario editor
            if (scenarioMode && scenarioTasks) {
              const st = scenarioTasks.find((t) => t.id === task.id);
              if (st) {
                setEditingScenarioTask({ ...st });
                return;
              }
            }
            // otherwise fall back to parent handler
            onEditTask(task);
          }}
          headerHeight={HEADER_HEIGHT}
        />
        <div
          ref={timelineRef}
          className="relative overflow-visible rounded-r-xl border border-slate-900 bg-slate-950"
        >
          <div className="overflow-hidden">
            <GanttHeader
              labels={headerLabels}
              columnWidth={columnWidth}
              height={HEADER_HEIGHT}
              hideDone={hideDone}
              onToggleHideDone={() => setHideDone((s) => !s)}
            />
            <GanttGrid
              columns={columns.length}
              columnWidth={columnWidth}
              rowCount={Math.max(visibleTasks.length, 1)}
              rowHeight={ROW_HEIGHT}
              headerHeight={HEADER_HEIGHT}
              scale={scale}
              columnDates={scale === "day" ? columns : []}
            />
            <div className="relative">
              <GanttRelations
                tasks={visibleTasks}
                positions={positions}
                  rowHeight={ROW_HEIGHT}
                  headerHeight={HEADER_HEIGHT}
                  visible={showRelations}
              />
              {draggingTaskId !== null && dropIndex !== null && (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-sky-400/80"
                  style={{ top: dropIndex * ROW_HEIGHT + ROW_HEIGHT - 2 }}
                />
              )}
              {displayedTasks.map((task, index) => {
                // default: when NOT in scenario mode, render the regular interactive row
                if (!scenarioMode) {
                  return (
                    <GanttRow
                      key={task.id}
                      variant="scenario"
                      task={task}
                      rowIndex={index}
                      rowHeight={ROW_HEIGHT}
                      position={getTaskPosition(task)}
                      columnWidth={columnWidth}
                      scale={scale}
                      taskMap={taskMap}
                      onAdjustTaskDates={onAdjustTaskDates}
                      onMoveTaskDates={onMoveTaskDates}
                      onEditTask={onEditTask}
                      onRowDragStart={handleRowDragStart}
                      isRowDragging={draggingTaskId === task.id}
                      hideDone={hideDone}
                    />
                  );
                }

                // scenarioMode: render scenario task directly. If it maps to a baseline
                // task, we render a faint base bar underneath.
                const scenarioTask = task as Task; // already from scenarioTasks when in scenarioMode
                // baseline task id is returned by the scenario-task DTO as `taskId`.
                // prefer `baselineTasks` fetched for the project if available, otherwise fall back to `tasks` prop
                const baseCollection = baselineTasks ?? tasks;
                // Prefer server-provided `taskId` when available, but many backends
                // create scenario tasks with new ids. Try id-based matching first
                // then fall back to title-based matching (case-insensitive trimmed)
                // because `taskId` may not match in some flows.
                const taskIdRef = (scenarioTask as any).taskId ?? undefined;
                const titleKey = String((scenarioTask.title ?? "")).trim().toLowerCase();
                let baseTask = taskIdRef ? baseCollection.find((t) => t.id === taskIdRef) : undefined;
                if (!baseTask && titleKey) {
                  baseTask = baseCollection.find((t) => String((t.title ?? "")).trim().toLowerCase() === titleKey);
                }
                const basePos = baseTask ? getTaskPosition(baseTask) : { offset: 0, width: 0 };
                const scenarioPos = getTaskPosition(scenarioTask);

                return (
                  <div key={task.id} style={{ position: "relative", height: ROW_HEIGHT }}>
                    <GanttRow
                      key={`scenario-${task.id}`}
                      variant="scenario"
                      task={scenarioTask}
                      rowIndex={index}
                      rowHeight={ROW_HEIGHT}
                      position={scenarioPos}
                      columnWidth={columnWidth}
                      scale={scale}
                      taskMap={scenarioTaskMap}
                      onAdjustTaskDates={localOnAdjustTaskDates}
                      onMoveTaskDates={localOnMoveTaskDates}
                      onEditTask={(t) => {
                        setEditingScenarioTask({ ...scenarioTask });
                      }}
                      onRowDragStart={noopRowDrag}
                      isRowDragging={false}
                      hideDone={hideDone}
                    />

                    {baseTask && isScenarioTaskChanged(scenarioTask, baseTask) && (
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          // align baseline bar with the scenario bar vertically so it remains visible
                          top: 2,
                          left: basePos.offset,
                          width: basePos.width,
                          pointerEvents: "none",
                          // render behind the interactive scenario bar so it appears as a faint baseline
                          zIndex: 10,
                        }}
                      >
                        <GanttBar
                          title={baseTask.title}
                          offset={0}
                          width={basePos.width}
                          isDragging={false}
                          isRowDragging={false}
                          onBarPointerDown={() => {}}
                          onPointerMove={() => {}}
                          onPointerUp={() => {}}
                          onPointerCancel={() => {}}
                          onResizeStartPointerDown={() => {}}
                          onResizeEndPointerDown={() => {}}
                          variant="base"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scenario deltas panel rendered under the Gantt timeline when scenario active */}
          {scenarioMode && scenarioDeltas && (
            <div className="mt-3 px-4">
              <div className="rounded-md border border-slate-900 bg-slate-900/30 p-3 text-sm text-slate-200">
                <div className="flex gap-6 items-center">
                  <div>
                    <div className="text-xs text-slate-400">Delta work days</div>
                    <div className="font-medium">{scenarioDeltas.totalDeltaDays >= 0 ? '+' : ''}{scenarioDeltas.totalDeltaDays}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Delta activities</div>
                    <div className="font-medium">{scenarioDeltas.activityDelta >= 0 ? '+' : ''}{scenarioDeltas.activityDelta}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Start delta (scenario vs baseline)</div>
                    <div className="font-medium">
                      {scenarioDeltas.deltaStart < 0
                        ? `${Math.abs(scenarioDeltas.deltaStart)} days earlier`
                        : scenarioDeltas.deltaStart > 0
                        ? `${scenarioDeltas.deltaStart} days later`
                        : 'no change'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">End delta (scenario vs baseline)</div>
                    <div className="font-medium">
                      {scenarioDeltas.deltaEnd > 0
                        ? `${scenarioDeltas.deltaEnd} days later`
                        : scenarioDeltas.deltaEnd < 0
                        ? `${Math.abs(scenarioDeltas.deltaEnd)} days earlier`
                        : 'no change'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Monte Carlo simulation panel removed from inside timeline; rendered separately below */}

          {milestones.length > 0 && (
            <GanttMilestones
              milestones={milestones}
              rangeStart={rangeStart}
              columnWidth={columnWidth}
              scale={scale}
              height={Math.max(visibleTasks.length, 1) * ROW_HEIGHT}
              headerHeight={HEADER_HEIGHT}
              onMoveMilestone={onMoveMilestone}
            />
          )}
        </div>
      </div>

      {/* Risk-adjust controls: placed under Gantt, before MonteCarlo panel */}
      <div className="mt-3 grid grid-cols-[300px_1fr] gap-0">
        <div className="px-4 col-span-2">
          <div className="max-w-full">
            <div className="flex items-center gap-3 rounded-md border border-slate-900 bg-slate-900/30 p-3">
              <div className="text-sm text-slate-300">Create risk-adjusted scenario</div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRiskMenu((s) => !s)}
                  className="flex items-center gap-2 rounded-full bg-slate-800/60 px-3 py-1 text-sm font-medium text-slate-100 hover:bg-slate-700"
                >
                  <span>{`P${riskTarget}`}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9l6 6 6-6" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {showRiskMenu && (
                  <div className="absolute mt-2 w-36 rounded-md border border-slate-800 bg-slate-800 z-40">
                    <button className={`w-full text-left px-3 py-2 ${riskTarget === 80 ? 'bg-slate-700' : 'hover:bg-slate-700'}`} onClick={() => { setRiskTarget(80); setShowRiskMenu(false); }}>P80</button>
                    <button className={`w-full text-left px-3 py-2 ${riskTarget === 90 ? 'bg-slate-700' : 'hover:bg-slate-700'}`} onClick={() => { setRiskTarget(90); setShowRiskMenu(false); }}>P90</button>
                    <button className={`w-full text-left px-3 py-2 ${riskTarget === 99 ? 'bg-slate-700' : 'hover:bg-slate-700'}`} onClick={() => { setRiskTarget(99); setShowRiskMenu(false); }}>P99</button>
                  </div>
                )}
              </div>
              <div className="ml-2">
                <button
                  type="button"
                  onClick={handleCreateRiskAdjusted}
                  disabled={isAdjusting}
                  className="rounded-md bg-amber-500 px-3 py-1 text-sm font-semibold text-slate-900 disabled:opacity-60"
                >
                  {isAdjusting ? 'Running...' : 'Create'}
                </button>
              </div>
              <div className="ml-auto text-xs text-slate-400">Source: baseline scenario</div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk-adjust result panel: task shift reasons + original Monte Carlo */}
      {riskAdjustResult && (
        <div className="mt-3 grid grid-cols-[300px_1fr] gap-0">
          <div className="px-4 col-span-2">
            <RiskAdjustResultPanel
              result={riskAdjustResult}
              onClose={() => setRiskAdjustResult(null)}
            />
          </div>
        </div>
      )}

      {/* Monte Carlo panel rendered in its own container, aligned with the left task list */}
      <div className="mt-3 grid grid-cols-[300px_1fr] gap-0">
        <div className="px-4 col-span-2">
          <div className="max-w-full">
            <MonteCarloPanel projectId={typeof projectIdProp !== 'undefined' ? projectIdProp : tasks[0]?.scenarioId ?? 0} tasks={visibleTasks} />
          </div>
        </div>
      </div>

      {/* Scenario task editor (local-only) */}
      {scenarioMode && (
        <TaskEditDialog
          task={editingScenarioTask}
          open={!!editingScenarioTask}
          onClose={() => setEditingScenarioTask(null)}
          onCreateUpdate={async (_payload) => {
            // no-op for local scenario updates for now
            return;
          }}
          onSave={(taskId, payload) => {
            setScenarioTasks((prev) => {
              if (!prev) return prev;
              return prev.map((t) => {
                if (t.id !== taskId) return t;
                return {
                  ...t,
                  title: payload.title,
                  description: payload.description ?? undefined,
                  status: payload.status,
                  startDate: payload.startDate,
                  endDate: payload.endDate,
                  dependencies: payload.dependencies ?? [],
                } as Task;
              });
            });
            setEditingScenarioTask(null);
          }}
          onDelete={async (taskId) => {
            setScenarioTasks((prev) => (prev ? prev.filter((t) => t.id !== taskId) : prev));
            setEditingScenarioTask(null);
          }}
          onDependencyChange={(taskId, dependencies) => {
            setScenarioTasks((prev) => {
              if (!prev) return prev;
              return prev.map((t) => (t.id === taskId ? { ...t, dependencies } : t));
            });
          }}
        />
      )}
    </section>
  );
};
