import { useMemo, useState } from "react";

import type { Task, TaskStatus } from "../lib/types";
import { MilestoneCreateForm } from "./MilestoneCreateForm";
import { TaskCreateForm } from "./TaskCreateForm";

interface TasksCardProps {
  tasks: Task[];
  projectId?: number;
  activitiesCount?: number;
  onCreateTask: (payload: {
    title: string;
    description?: string;
    status: TaskStatus;
    startDate: string;
    endDate: string;
  }) => Promise<void> | void;
  onCreateMilestone: (payload: {
    title: string;
    description?: string;
    targetDate: string;
  }) => Promise<void> | void;
  onCreateUpdate: (payload: { text: string; taskId?: number }) => Promise<void> | void;
}

export const TasksCard = ({
  tasks,
  projectId,
  activitiesCount,
  onCreateTask,
  onCreateMilestone,
  onCreateUpdate,
}: TasksCardProps) => {
  const [updateText, setUpdateText] = useState("");

  const updateDisabled = useMemo(
    () => !projectId || !updateText.trim(),
    [projectId, updateText]
  );
  const handleCreateTask = async (payload: {
    title: string;
    description?: string;
    status: TaskStatus;
    startDate: string;
    endDate: string;
  }) => {
    await onCreateTask(payload);
  };

  const handleCreateMilestone = async (payload: {
    title: string;
    description?: string;
    targetDate: string;
  }) => {
    await onCreateMilestone(payload);
  };

  const handleSubmitUpdate = async () => {
    if (updateDisabled) {
      return;
    }
    await onCreateUpdate({ text: updateText.trim() });
    setUpdateText("");
  };

  return (
    <section className="rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
      <details>
        <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-slate-100">
          <span>New task</span>
          <span className="text-xs font-normal text-slate-500">{activitiesCount ?? tasks.length} total</span>
        </summary>
        <TaskCreateForm projectId={projectId} onSubmit={handleCreateTask} />
      </details>
      <details className="mt-6">
        <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-slate-100">
          <span>New milestone</span>
          <span />
        </summary>
        <MilestoneCreateForm projectId={projectId} onSubmit={handleCreateMilestone} />
      </details>
      <details className="mt-6">
        <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-slate-100">
          <span>New update</span>
          <span />
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          {!projectId && (
            <div className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-500">
              Select a project to add updates.
            </div>
          )}
          <textarea
            className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={updateText}
            onChange={(event) => setUpdateText(event.target.value)}
            rows={3}
            placeholder="Write the latest update..."
            disabled={!projectId}
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
      </details>
    </section>
  );
};
