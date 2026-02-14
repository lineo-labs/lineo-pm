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
  getTaskRange,
  getWeekColumns,
  parseISODate,
  startOfMonth,
  startOfWeek,
  endOfMonth,
} from "../../lib/dateRange";
import { getAutoScale, getRangeScale } from "../../lib/dateScale";
import { GanttGrid } from "./GanttGrid";
import { GanttHeader } from "./GanttHeader";
import { GanttMilestones } from "./GanttMilestones";
import { GanttRow } from "./GanttRow";
import { GanttTaskList } from "./GanttTaskList";

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

  const { start, end } = useMemo(() => {
    if (tasks.length === 0 && milestones.length === 0) {
      return getTaskRange([]);
    }
    const dates: Date[] = [];
    tasks.forEach((task) => {
      dates.push(parseISODate(task.startDate));
      dates.push(parseISODate(task.endDate));
    });
    milestones.forEach((milestone) => {
      dates.push(parseISODate(milestone.targetDate));
    });
    const start = new Date(Math.min(...dates.map((date) => date.getTime())));
    const end = new Date(Math.max(...dates.map((date) => date.getTime())));
    return { start, end };
  }, [milestones, tasks]);

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

  const draggingIndex = draggingTaskId !== null ? tasks.findIndex((t) => t.id === draggingTaskId) : null;

  return (
    <section className="rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Gantt</h2>
          <p className="text-xs text-slate-500">
            Scale: {scale === "month" ? "Months" : scale === "week" ? "Weeks" : "Days"}
          </p>
        </div>
        <div className="text-xs text-slate-500">{tasks.length} tasks</div>
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
          rowHeight={ROW_HEIGHT}
          onEditTask={onEditTask}
          headerHeight={HEADER_HEIGHT}
        />
        <div
          ref={timelineRef}
          className="relative overflow-visible rounded-r-xl border border-slate-900 bg-slate-950"
        >
          <div className="overflow-hidden">
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
                  taskMap={taskMap}
                  onAdjustTaskDates={onAdjustTaskDates}
                  onMoveTaskDates={onMoveTaskDates}
                  onEditTask={onEditTask}
                  onRowDragStart={handleRowDragStart}
                  isRowDragging={draggingTaskId === task.id}
                />
              ))}
            </div>
          </div>
          {milestones.length > 0 && (
            <GanttMilestones
              milestones={milestones}
              rangeStart={rangeStart}
              columnWidth={columnWidth}
              scale={scale}
              height={Math.max(tasks.length, 1) * ROW_HEIGHT}
              headerHeight={HEADER_HEIGHT}
              onMoveMilestone={onMoveMilestone}
            />
          )}
        </div>
      </div>
    </section>
  );
};
