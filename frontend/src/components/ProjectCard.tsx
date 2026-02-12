import { useMemo, useState } from "react";

import type { Project, ProjectUpdate, Task } from "../lib/types";
import { TaskList } from "./TaskList";

interface ProjectCardProps {
  project?: Project;
  onEdit: () => void;
  tasks: Task[];
  updates: ProjectUpdate[];
  onEditTask: (task: Task) => void;
  onCreateUpdate: (payload: { text: string }) => Promise<void> | void;
}

export const ProjectCard = ({
  project,
  onEdit,
  tasks,
  updates,
  onEditTask,
  onCreateUpdate,
}: ProjectCardProps) => {
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [updateText, setUpdateText] = useState("");

  const updateDisabled = useMemo(() => !project || !updateText.trim(), [project, updateText]);
  const taskNames = useMemo(
    () => new Map(tasks.map((task) => [task.id, task.title])),
    [tasks]
  );

  const handleSubmitUpdate = async () => {
    if (updateDisabled) {
      return;
    }
    await onCreateUpdate({ text: updateText.trim() });
    setUpdateText("");
    setIsAddingUpdate(false);
  };

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
          <details className="mt-6 rounded-xl border border-slate-900 bg-slate-950/60 p-4">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-200">
              <span>Updates ({updates.length})</span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  setIsAddingUpdate((prev) => !prev);
                }}
                className="rounded-md border border-slate-800 px-3 py-1 text-xs font-semibold text-slate-200"
              >
                {isAddingUpdate ? "Cancel" : "New update"}
              </button>
            </summary>
            {isAddingUpdate && (
              <div className="mt-3 flex flex-col gap-2">
                <textarea
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={updateText}
                  onChange={(event) => setUpdateText(event.target.value)}
                  rows={3}
                  placeholder="Write the latest update..."
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={updateDisabled}
                    onClick={handleSubmitUpdate}
                    className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition enabled:hover:bg-indigo-500 disabled:opacity-60"
                  >
                    Add update
                  </button>
                </div>
              </div>
            )}
            {updates.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">No updates yet.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
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
          </details>
          <details className="mt-4 flex-1 rounded-xl border border-slate-900 bg-slate-950/60 p-3">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200">
              Existing tasks ({tasks.length})
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
