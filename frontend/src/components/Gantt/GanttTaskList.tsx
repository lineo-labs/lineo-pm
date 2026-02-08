import type { Task } from "../../lib/types";

interface GanttTaskListProps {
  tasks: Task[];
  rowHeight: number;
  onEditTask: (task: Task) => void;
  headerHeight: number;
}

export const GanttTaskList = ({
  tasks,
  rowHeight,
  onEditTask,
  headerHeight,
}: GanttTaskListProps) => {
  return (
    <div className="rounded-l-xl border border-slate-900 bg-slate-950">
      <div
        className="sticky top-0 z-10 flex items-center border-b border-slate-900 bg-slate-950 px-3 text-xs text-slate-500"
        style={{ height: headerHeight }}
      >
        Task
      </div>
      <div style={{ paddingTop: headerHeight }}>
        {tasks.length === 0 && (
          <div className="flex items-center px-3 text-xs text-slate-500" style={{ height: rowHeight }}>
            Nessun task
          </div>
        )}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between border-b border-slate-900/70 px-3 text-xs text-slate-200"
            style={{ height: rowHeight }}
          >
            <span className="truncate">{task.title}</span>
            <div className="flex items-center gap-1">
              {task.description && (
                <div className="relative group">
                  <button
                    type="button"
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-800 text-[10px] text-slate-300"
                  >
                    i
                  </button>
                  <div className="pointer-events-none absolute right-0 top-full mt-2 w-48 rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 opacity-0 shadow-lg transition group-hover:opacity-100">
                    {task.description}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => onEditTask(task)}
                className="rounded-md border border-slate-800 px-2 py-1 text-[10px] text-slate-300"
              >
                Modifica
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
