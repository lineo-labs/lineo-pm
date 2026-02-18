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
import { GanttRelations } from "./GanttRelations";
import { computeScenarioDeltas } from "./ganttUtils";

interface GanttLayoutProps {
  tasks: Task[];
  milestones: Milestone[];
  onEditTask: (task: Task) => void;
  onAdjustTaskDates: (taskId: number, mode: "start" | "end", deltaDays: number) => void;
  onMoveTaskDates: (taskId: number, deltaDays: number) => void;
  onReorderTasks: (orderedIds: number[]) => void;
  onMoveMilestone: (milestoneId: number, deltaDays: number) => void;
}

const ROW_HEIGHT = 44;
const DAY_WIDTH = 40;
const WEEK_WIDTH = 120;
const MONTH_WIDTH = 160;
const HEADER_HEIGHT = 38;

export const GanttLayout = ({
  tasks,
  milestones,
  onEditTask,
  onAdjustTaskDates,
  onMoveTaskDates,
  onReorderTasks,
  onMoveMilestone,
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

  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const scenarioTaskMap = useMemo(() => {
    if (!scenarioTasks) return new Map<number, Task>();
    return new Map(scenarioTasks.map((t) => [t.id, t]));
  }, [scenarioTasks]);

  

  const visibleTasks = useMemo(() => {
    if (!hideDone) return tasks;
    return tasks.filter((t) => !(t.status && t.status.toLowerCase() === "done"));
  }, [tasks, hideDone]);

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

  const positions = useMemo(() => visibleTasks.map((t) => ({ id: t.id, ...getTaskPosition(t) })), [visibleTasks, columnWidth, scale, rangeStart]);

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

  const draggingIndex = draggingTaskId !== null ? visibleTasks.findIndex((t) => t.id === draggingTaskId) : null;

  return (
    <section className="rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Gantt</h2>
          <p className="text-xs text-slate-500">
            Scale: {scale === "month" ? "Months" : scale === "week" ? "Weeks" : "Days"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500">{visibleTasks.length} tasks</div>
          <button
            type="button"
            onClick={() => setHideDone((s) => !s)}
            aria-pressed={hideDone}
            className={`text-xs px-2 py-1 rounded-md border ${hideDone ? 'bg-sky-500 text-white border-sky-600' : 'bg-transparent text-slate-200 border-slate-700'}`}
          >
            {hideDone ? 'Show done' : 'Hide done'}
          </button>
          <button
            type="button"
            aria-pressed={!showRelations}
            onClick={() => setShowRelations((s) => !s)}
            className={`text-xs px-2 py-1 rounded-md border ${showRelations ? 'bg-sky-500 text-white border-sky-600' : 'bg-transparent text-slate-200 border-slate-700'}`}
          >
            {showRelations ? 'Hide relations' : 'Show relations'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!scenarioMode) {
                // enter scenario: clone tasks into temporary state
                setScenarioTasks(tasks.map((t) => ({ ...t })));
                setScenarioMode(true);
              } else {
                // exit scenario and discard
                setScenarioMode(false);
                setScenarioTasks(null);
              }
            }}
            className={`text-xs px-2 py-1 rounded-md border ${scenarioMode ? 'bg-red-600 text-white border-red-700' : 'bg-emerald-500 text-white border-emerald-600'}`}
          >
            {scenarioMode ? 'Exit scenario' : 'New scenario'}
          </button>
        </div>

        
      </div>

      <div ref={layoutRef} className="relative grid grid-cols-[260px_1fr] gap-0">
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
          tasks={tasks}
          hideDone={hideDone}
          rowHeight={ROW_HEIGHT}
          onEditTask={onEditTask}
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
              {visibleTasks.map((task, index) => {
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

                // In scenario mode: render the interactive scenario row in-flow,
                // and render a thin, immobile base bar absolutely underneath it to show the original state.
                const scenarioTask = scenarioTasks ? scenarioTasks.find((st) => st.id === task.id) : null;
                const basePos = getTaskPosition(task);
                const scenarioPos = scenarioTask ? getTaskPosition(scenarioTask) : null;

                return (
                  <div key={task.id} style={{ position: "relative", height: ROW_HEIGHT }}>
                    {/* scenario interactive row in flow */}
                    {scenarioTask ? (
                      <GanttRow
                        key={`scenario-${task.id}`}
                        variant="scenario"
                        task={scenarioTask}
                        rowIndex={index}
                        rowHeight={ROW_HEIGHT}
                        position={scenarioPos ?? basePos}
                        columnWidth={columnWidth}
                        scale={scale}
                        taskMap={scenarioTaskMap}
                        onAdjustTaskDates={localOnAdjustTaskDates}
                        onMoveTaskDates={localOnMoveTaskDates}
                        onEditTask={onEditTask}
                        onRowDragStart={noopRowDrag}
                        isRowDragging={false}
                        hideDone={hideDone}
                      />
                    ) : (
                      // fallback to main task if scenario task missing
                      <GanttRow
                        key={task.id}
                        variant="scenario"
                        task={task}
                        rowIndex={index}
                        rowHeight={ROW_HEIGHT}
                        position={basePos}
                        columnWidth={columnWidth}
                        scale={scale}
                        taskMap={taskMap}
                        onAdjustTaskDates={noopAdjust}
                        onMoveTaskDates={noopMove}
                        onEditTask={onEditTask}
                        onRowDragStart={noopRowDrag}
                        isRowDragging={false}
                        hideDone={hideDone}
                      />
                    )}

                    {/* base bar rendered overlapping bottom of the scenario task row (overlay at lower part) */}
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        top: ROW_HEIGHT - 12,
                        left: basePos.offset,
                        width: basePos.width,
                        pointerEvents: "none",
                        zIndex: 25,
                      }}
                    >
                      <GanttBar
                        title={task.title}
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
    </section>
  );
};
