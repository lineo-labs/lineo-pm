import { useMemo } from "react";
import { exportTasksCsv } from "../lib/api";

import type { Milestone, Project, ProjectUpdate, Task } from "../lib/types";

interface ProjectCardProps {
  project?: Project;
  onEdit: () => void;
  tasks: Task[];
  milestones: Milestone[];
  updates: ProjectUpdate[];
  onEditTask: (task: Task) => void;
  onEditMilestone: (milestone: Milestone) => void;
}

export const ProjectCard = ({
  project,
  onEdit,
  tasks,
  milestones,
  updates,
  onEditTask,
  onEditMilestone,
}: ProjectCardProps) => {
  const taskNames = useMemo(
    () => new Map(tasks.map((task) => [task.id, task.title])),
    [tasks]
  );

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString();
  };

  return (
    <section className="flex flex-col rounded-2xl border border-transparent bg-gradient-to-b from-slate-900/70 to-slate-950/60 p-6 card-elev-2 transition-base" aria-labelledby="project-title">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-100">
            {project?.name ?? "No project selected"}
          </h2>
          <p className="mt-2 text-sm text-slate-300 truncate">
            {project?.description ??
              "Select a project from the left column to view details."}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center">
          {project && (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit project"
              className="rounded-md bg-gradient-to-br from-[var(--accent-500)] to-[var(--accent-600)] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:shadow-md hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-400)] transition-base"
            >
              Edit
            </button>
          )}
          {project && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const { blob, filename } = await exportTasksCsv(project.id);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error("Export failed", err);
                  alert("Export failed");
                }
              }}
              aria-label="Export tasks as CSV"
              className="ml-3 rounded-md border border-slate-800/40 bg-slate-800/30 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 transition-base"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {project && (
        <>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-300">
            <div className="rounded-lg bg-slate-800/30 px-3 py-2">
              <div className="text-[11px] text-slate-400">Start</div>
              <div className="text-sm font-medium text-slate-100">{project.startDate}</div>
            </div>
            <div className="rounded-lg bg-slate-800/30 px-3 py-2">
              <div className="text-[11px] text-slate-400">End</div>
              <div className="text-sm font-medium text-slate-100">{project.endDate}</div>
            </div>
          </div>

          <details className="mt-6 rounded-xl border border-slate-800/30 bg-slate-900/35 p-3">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-200">
              <span>Milestones ({milestones.length})</span>
            </summary>
            {milestones.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">No milestones.</p>
            ) : (
              <div className="mt-3 max-h-[160px] overflow-y-auto pr-2 scrollbar-gantt">
                <ul className="flex flex-col gap-3">
                  {milestones.map((milestone) => (
                    <li
                      key={milestone.id}
                      className="rounded-lg border border-slate-800/20 bg-slate-800/25 p-3 transition-base"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium text-slate-100">
                            {milestone.title}
                          </div>
                          {milestone.description && (
                            <div className="mt-1 text-xs text-slate-300">
                              {milestone.description}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-xs text-slate-400">{milestone.targetDate}</div>
                          <button
                            type="button"
                            onClick={() => onEditMilestone(milestone)}
                            aria-label={`Edit milestone ${milestone.title}`}
                            className="rounded-md bg-slate-800/30 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-800/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-400)] transition-base"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </details>

          <details className="mt-6 rounded-xl border border-slate-800/30 bg-slate-900/35 p-3">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-200">
              <span>Updates ({updates.length})</span>
            </summary>
            <div className="mt-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-gantt">
              {updates.length === 0 ? (
                <p className="text-sm text-slate-400">No updates yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {updates.map((update) => {
                    const taskTitle = update.taskId ? taskNames.get(update.taskId) : undefined;
                    const sourceLabel = taskTitle ? `Task: ${taskTitle}` : "Project update";
                    return (
                      <div
                        key={update.id}
                        className="rounded-lg border border-slate-800/20 bg-slate-800/25 px-3 py-2 transition-base"
                      >
                        <div className="flex items-center justify-between text-[12px] text-slate-400">
                          <span>{formatDate(update.createdAt)}</span>
                          <span>{sourceLabel}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-100">{update.text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </details>
        </>
      )}
    </section>
  );
};
