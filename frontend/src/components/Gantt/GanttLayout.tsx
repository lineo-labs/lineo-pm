import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

import type { Task } from "../../lib/types";
import {
  diffInDays,
  formatDayLabel,
  formatMonthLabel,
  formatWeekLabel,
  getDateColumns,
  getMonthColumns,
  getTaskRange,
  getWeekColumns,
  parseISODate,
  startOfMonth,
  startOfWeek,
  diffInMonths,
} from "../../lib/dateRange";
import { getAutoScale, getRangeScale } from "../../lib/dateScale";
import { GanttGrid } from "./GanttGrid";
import { GanttHeader } from "./GanttHeader";
import { GanttRow } from "./GanttRow";
import { GanttTaskList } from "./GanttTaskList";

interface GanttLayoutProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onAdjustTaskDates: (taskId: number, mode: "start" | "end", deltaDays: number) => void;
  onMoveTaskDates: (taskId: number, deltaDays: number) => void;
  onReorderTasks: (orderedIds: number[]) => void;
}

const ROW_HEIGHT = 44;
const DAY_WIDTH = 40;
const WEEK_WIDTH = 120;
const MONTH_WIDTH = 160;
const HEADER_HEIGHT = 38;

export const GanttLayout = ({
  tasks,
  onEditTask,
  onAdjustTaskDates,
  onMoveTaskDates,
  onReorderTasks,
}: GanttLayoutProps) => {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartIndexRef = useRef<number>(0);
  const dropIndexRef = useRef<number | null>(null);

  const clampIndex = (value: number) => {
    if (tasks.length === 0) {
      return 0;
    }
    return Math.max(0, Math.min(tasks.length - 1, value));
  };

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

  const { start, end } = getTaskRange(tasks);
  const fallbackScale = getRangeScale(start, end);
  const autoScale = useMemo(() => {
    if (timelineWidth <= 0) {
      return null;
    }
    return getAutoScale(start, end, timelineWidth);
  }, [start, end, timelineWidth]);

  const scale = autoScale?.scale ?? fallbackScale;
  const columnWidth = autoScale?.columnWidth ??
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
      const startIndex = Math.floor(diffInDays(rangeStart, startOfWeek(taskStart)) / 7);
      const endIndex = Math.floor(diffInDays(rangeStart, startOfWeek(taskEnd)) / 7);
      return {
        offset: startIndex * columnWidth,
        width: (endIndex - startIndex + 1) * columnWidth,
      };
    }

    if (scale === "month") {
      const startIndex = diffInMonths(rangeStart, startOfMonth(taskStart));
      const endIndex = diffInMonths(rangeStart, startOfMonth(taskEnd));
      return {
        offset: startIndex * columnWidth,
        width: (endIndex - startIndex + 1) * columnWidth,
      };
    }

    const startIndex = diffInDays(rangeStart, taskStart);
    const endIndex = diffInDays(rangeStart, taskEnd);
    return {
      offset: startIndex * columnWidth,
      width: (endIndex - startIndex + 1) * columnWidth,
    };
  };

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
    dropIndexRef.current = index;
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
      dropIndexRef.current = nextIndex;
    };

    const finishDrag = (event: globalThis.PointerEvent) => {
      if (dragPointerIdRef.current !== event.pointerId) {
        return;
      }
      const startIndex = dragStartIndexRef.current;
      const nextIndex = dropIndexRef.current ?? startIndex;
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

  return (
    <section className="rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Gantt</h2>
          <p className="text-xs text-slate-500">
            Scale: {scale === "week" ? "Weeks" : "Days"}
          </p>
        </div>
        <div className="text-xs text-slate-500">{tasks.length} tasks</div>
      </div>

      <div ref={layoutRef} className="grid grid-cols-[220px_1fr] gap-0">
        <GanttTaskList
          tasks={tasks}
          rowHeight={ROW_HEIGHT}
          onEditTask={onEditTask}
          headerHeight={HEADER_HEIGHT}
        />
        <div
          ref={timelineRef}
          className="relative overflow-hidden rounded-r-xl border border-slate-900 bg-slate-950"
        >
          <div>
            <GanttHeader labels={headerLabels} columnWidth={columnWidth} height={HEADER_HEIGHT} />
            <GanttGrid
              columns={columns.length}
              columnWidth={columnWidth}
              rowCount={Math.max(tasks.length, 1)}
              rowHeight={ROW_HEIGHT}
              headerHeight={HEADER_HEIGHT}
              scale={scale}
              columnDates={scale === "day" ? columns : []}
            />
            <div className="relative">
              {draggingTaskId !== null && dropIndex !== null && (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-sky-400/80"
                  style={{ top: dropIndex * ROW_HEIGHT + ROW_HEIGHT - 2 }}
                />
              )}
              {tasks.map((task, index) => (
                <GanttRow
                  key={task.id}
                  task={task}
                  rowIndex={index}
                  rowHeight={ROW_HEIGHT}
                  position={getTaskPosition(task)}
                  columnWidth={columnWidth}
                  scale={scale}
                  onAdjustTaskDates={onAdjustTaskDates}
                  onMoveTaskDates={onMoveTaskDates}
                  onEditTask={onEditTask}
                  onRowDragStart={handleRowDragStart}
                  isRowDragging={draggingTaskId === task.id}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
