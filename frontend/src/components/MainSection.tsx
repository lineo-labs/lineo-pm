import { useState } from "react";

import type { Project, Task, TaskStatus } from "../lib/types";
import { ProjectCard } from "./ProjectCard";
import { ProjectEditDialog } from "./ProjectEditDialog";
import { TaskEditDialog } from "./TaskEditDialog";
import { TasksCard } from "./TasksCard";
import { GanttLayout } from "./Gantt/GanttLayout";

interface MainSectionProps {
  project?: Project;
  tasks: Task[];
  onCreateTask: (payload: {
    title: string;
    description?: string;
    status: TaskStatus;
    startDate: string;
    endDate: string;
  }) => Promise<void> | void;
  onUpdateTask: (taskId: number, payload: {
    title: string;
    description?: string;
    status: TaskStatus;
    startDate: string;
    endDate: string;
  }) => Promise<void> | void;
  onDeleteTask: (taskId: number) => Promise<void> | void;
  onAdjustTaskDates: (taskId: number, mode: "start" | "end", deltaDays: number) => Promise<void> | void;
  onReorderTasks: (orderedIds: number[]) => Promise<void> | void;
  onUpdateProject: (projectId: number, payload: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
  }) => Promise<void> | void;
  loading: boolean;
  error: string | null;
}

export const MainSection = ({
  project,
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onAdjustTaskDates,
  onReorderTasks,
  onUpdateProject,
  loading,
  error,
}: MainSectionProps) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isProjectEditing, setIsProjectEditing] = useState(false);

  return (
    <div className="flex h-full flex-col gap-6">
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {loading && (
        <div className="rounded-xl border border-slate-900 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
          Loading data...
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <ProjectCard
          project={project}
          tasks={tasks}
          onEditTask={setEditingTask}
          onEdit={() => setIsProjectEditing(true)}
        />
        <TasksCard
          tasks={tasks}
          projectId={project?.id}
          onCreateTask={onCreateTask}
        />
      </div>

      <GanttLayout
        tasks={tasks}
        onEditTask={setEditingTask}
        onAdjustTaskDates={onAdjustTaskDates}
        onReorderTasks={onReorderTasks}
      />

      <TaskEditDialog
        task={editingTask}
        open={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        onSave={(taskId, payload) => {
          onUpdateTask(taskId, payload);
          setEditingTask(null);
        }}
        onDelete={async (taskId) => {
          await onDeleteTask(taskId);
          setEditingTask(null);
        }}
      />
      <ProjectEditDialog
        project={project}
        open={isProjectEditing}
        onClose={() => setIsProjectEditing(false)}
        onSave={(projectId, payload) => {
          onUpdateProject(projectId, payload);
          setIsProjectEditing(false);
        }}
      />
    </div>
  );
};
