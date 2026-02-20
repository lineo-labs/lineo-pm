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
    <section className="flex flex-col rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            {project?.name ?? "No project selected"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {project?.description ??
              "Select a project from the left column to view details."}
          </p>
        </div>
        {project && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-200"
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
            className="ml-2 rounded-md border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-200"
          >
            Export CSV
          </button>
        )}
        {/* Monte Carlo panel intentionally omitted here; available under the Gantt view only */}
      </div>
      {project && (
        <>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
            <div className="rounded-lg border border-slate-900 bg-slate-900/40 px-3 py-2">
              Start: <span className="text-slate-200">{project.startDate}</span>
            </div>
            <div className="rounded-lg border border-slate-900 bg-slate-900/40 px-3 py-2">
              End: <span className="text-slate-200">{project.endDate}</span>
            </div>
          </div>
          <details className="mt-6 rounded-xl border border-slate-900 bg-slate-950/60 p-4 open:h-[220px]">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-200">
              <span>Milestones ({milestones.length})</span>
            </summary>
            {milestones.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No milestones.</p>
            ) : (
              <div className="mt-3 max-h-[150px] overflow-y-auto pr-2 scrollbar-gantt">
                <ul className="flex flex-col gap-2">
                  {milestones.map((milestone) => (
                    <li
                      key={milestone.id}
                      className="rounded-lg border border-slate-900 bg-slate-900/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium text-slate-100">
                            {milestone.title}
                          </div>
                          {milestone.description && (
                            <div className="mt-1 text-xs text-slate-400">
                              {milestone.description}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onEditMilestone(milestone)}
                          className="rounded-md border border-slate-800 px-2 py-1 text-[10px] text-slate-300"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">{milestone.targetDate}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </details>
          <details className="mt-6 rounded-xl border border-slate-900 bg-slate-950/60 p-4 open:h-[280px]">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-200">
              <span>Updates ({updates.length})</span>
            </summary>
            <div className="mt-3 max-h-[200px] overflow-y-auto pr-2 scrollbar-gantt">
              {updates.length === 0 ? (
                <p className="text-xs text-slate-500">No updates yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {updates.map((update) => {
                    const taskTitle = update.taskId ? taskNames.get(update.taskId) : undefined;
                    const sourceLabel = taskTitle ? `Task: ${taskTitle}` : "Project update";
                    return (
                      <div
                        key={update.id}
                        className="rounded-lg border border-slate-900 bg-slate-900/40 px-3 py-2"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{formatDate(update.createdAt)}</span>
                          <span>{sourceLabel}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-200">{update.text}</p>
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
