import type { Task, TaskStatus } from "../lib/types";
import { TaskCreateForm } from "./TaskCreateForm";

interface TasksCardProps {
  tasks: Task[];
  projectId?: number;
  onCreateTask: (payload: {
    title: string;
    description?: string;
    status: TaskStatus;
    startDate: string;
    endDate: string;
  }) => Promise<void> | void;
}

export const TasksCard = ({ tasks, projectId, onCreateTask }: TasksCardProps) => {
  const handleCreateTask = async (payload: {
    title: string;
    description?: string;
    status: TaskStatus;
    startDate: string;
    endDate: string;
  }) => {
    await onCreateTask(payload);
  };

  return (
    <section className="rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
      <details>
        <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-slate-100">
          <span>New task</span>
          <span className="text-xs font-normal text-slate-500">{tasks.length} total</span>
        </summary>
        <TaskCreateForm projectId={projectId} onSubmit={handleCreateTask} />
      </details>
    </section>
  );
};
