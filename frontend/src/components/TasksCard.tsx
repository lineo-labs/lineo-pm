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
  return (
    <section className="rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Nuovo task</h2>
        <span className="text-xs text-slate-500">{tasks.length} totali</span>
      </div>
      <TaskCreateForm projectId={projectId} onSubmit={onCreateTask} />
    </section>
  );
};
