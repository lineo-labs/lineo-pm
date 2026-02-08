import type { Project, Task } from "../lib/types";
import { TaskList } from "./TaskList";

interface ProjectCardProps {
  project?: Project;
  onEdit: () => void;
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

export const ProjectCard = ({ project, onEdit, tasks, onEditTask }: ProjectCardProps) => {
  return (
    <section className="flex h-[360px] flex-col rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            {project?.name ?? "Nessun progetto selezionato"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {project?.description ??
              "Seleziona un progetto dalla colonna sinistra per vedere i dettagli."}
          </p>
        </div>
        {project && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-200"
          >
            Modifica
          </button>
        )}
      </div>
      {project && (
        <>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
            <div className="rounded-lg border border-slate-900 bg-slate-900/40 px-3 py-2">
              Inizio: <span className="text-slate-200">{project.startDate}</span>
            </div>
            <div className="rounded-lg border border-slate-900 bg-slate-900/40 px-3 py-2">
              Fine: <span className="text-slate-200">{project.endDate}</span>
            </div>
          </div>
          <details className="mt-4 flex-1 rounded-xl border border-slate-900 bg-slate-950/60 p-3">
            <summary className="cursor-pointer text-xs text-slate-400">
              Task esistenti ({tasks.length})
            </summary>
            <div className="mt-2 max-h-32 overflow-y-auto pr-2">
              <TaskList tasks={tasks} onEditTask={onEditTask} variant="compact" />
            </div>
          </details>
        </>
      )}
    </section>
  );
};
