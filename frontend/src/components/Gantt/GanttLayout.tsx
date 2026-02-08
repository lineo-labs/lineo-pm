import type { Task } from "../../lib/types";
import {
  diffInDays,
  formatDayLabel,
  formatWeekLabel,
  getDateColumns,
  getTaskRange,
  getWeekColumns,
  parseISODate,
  startOfWeek,
} from "../../lib/dateRange";
import { getDateScale } from "../../lib/dateScale";
import { GanttGrid } from "./GanttGrid";
import { GanttHeader } from "./GanttHeader";
import { GanttRow } from "./GanttRow";
import { GanttTaskList } from "./GanttTaskList";

interface GanttLayoutProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onAdjustTaskDates: (taskId: number, mode: "start" | "end", deltaDays: number) => void;
}

const ROW_HEIGHT = 44;
const DAY_WIDTH = 40;
const WEEK_WIDTH = 120;
const HEADER_HEIGHT = 38;

export const GanttLayout = ({ tasks, onEditTask, onAdjustTaskDates }: GanttLayoutProps) => {
  const { start, end } = getTaskRange(tasks);
  const scale = getDateScale(start, end);
  const rangeStart = scale === "week" ? startOfWeek(start) : start;
  const columns = scale === "week" ? getWeekColumns(start, end) : getDateColumns(start, end);
  const columnWidth = scale === "week" ? WEEK_WIDTH : DAY_WIDTH;

  const headerLabels = columns.map((column) =>
    scale === "week" ? formatWeekLabel(column) : formatDayLabel(column)
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

    const startIndex = diffInDays(rangeStart, taskStart);
    const endIndex = diffInDays(rangeStart, taskEnd);
    return {
      offset: startIndex * columnWidth,
      width: (endIndex - startIndex + 1) * columnWidth,
    };
  };

  return (
    <section className="rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Gantt</h2>
          <p className="text-xs text-slate-500">
            Scala: {scale === "week" ? "Settimane" : "Giorni"}
          </p>
        </div>
        <div className="text-xs text-slate-500">{tasks.length} task</div>
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-0">
        <GanttTaskList
          tasks={tasks}
          rowHeight={ROW_HEIGHT}
          onEditTask={onEditTask}
          headerHeight={HEADER_HEIGHT}
        />
        <div className="relative overflow-x-auto rounded-r-xl border border-slate-900 bg-slate-950">
          <div style={{ minWidth: columns.length * columnWidth }}>
            <GanttHeader labels={headerLabels} columnWidth={columnWidth} height={HEADER_HEIGHT} />
            <GanttGrid
              columns={columns.length}
              columnWidth={columnWidth}
              rowCount={Math.max(tasks.length, 1)}
              rowHeight={ROW_HEIGHT}
              headerHeight={HEADER_HEIGHT}
            />
            <div className="relative" style={{ paddingTop: HEADER_HEIGHT }}>
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
                  onEditTask={onEditTask}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
