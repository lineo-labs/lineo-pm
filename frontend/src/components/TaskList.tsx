import type { Task, TaskStatus } from "../lib/types";

interface TaskListProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  variant?: "default" | "compact";
}

const statusLabel: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In corso",
  done: "Fatto",
};

const statusColor: Record<TaskStatus, string> = {
  todo: "bg-slate-700 text-slate-200",
  in_progress: "bg-indigo-500/30 text-indigo-200",
  done: "bg-emerald-500/30 text-emerald-200",
};

export const TaskList = ({ tasks, onEditTask, variant = "default" }: TaskListProps) => {
  if (tasks.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">Nessun task.</p>;
  }

  const itemClass =
    variant === "compact"
      ? "rounded-lg border border-slate-900 bg-slate-900/40 p-3"
      : "rounded-xl border border-slate-900 bg-slate-900/40 p-4";

  return (
    <ul className={variant === "compact" ? "mt-3 flex flex-col gap-2" : "mt-4 flex flex-col gap-3"}>
      {tasks.map((task) => (
        <li key={task.id} className={itemClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-100">{task.title}</div>
              {task.description && (
                <div className="mt-1 text-xs text-slate-400">{task.description}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {task.description && (
                <div className="relative group">
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-800 text-[11px] text-slate-300"
                  >
                    i
                  </button>
                  <div className="pointer-events-none absolute right-0 top-full mt-2 w-48 rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 opacity-0 shadow-lg transition group-hover:opacity-100">
                    {task.description}
                  </div>
                </div>
              )}
              <span
                className={`rounded-full px-2 py-1 text-[10px] uppercase ${statusColor[task.status]}`}
              >
                {statusLabel[task.status]}
              </span>
              <button
                type="button"
                onClick={() => onEditTask(task)}
                className="rounded-md border border-slate-800 px-2 py-1 text-[10px] text-slate-300"
              >
                Modifica
              </button>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {task.startDate} → {task.endDate}
          </div>
        </li>
      ))}
    </ul>
  );
};
