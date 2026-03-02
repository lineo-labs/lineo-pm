import { useState } from "react";

import type { Milestone, Project, ProjectUpdate, Task, TaskStatus } from "../lib/types";
import { ProjectCard } from "./ProjectCard";
import { MilestoneEditDialog } from "./MilestoneEditDialog";
import { ProjectEditDialog } from "./ProjectEditDialog";
import { TaskEditDialog } from "./TaskEditDialog";
import { TasksCard } from "./TasksCard";
import { GanttLayout } from "./Gantt/GanttLayout";

interface MainSectionProps {
  project?: Project;
  tasks: Task[];
  updates: ProjectUpdate[];
  milestones: Milestone[];
  onCreateTask: (payload: {
    title: string;
    description?: string;
    status: TaskStatus;
    startDate: string;
    endDate: string;
  }) => Promise<void> | void;
  onCreateUpdate: (payload: { text: string; taskId?: number }) => Promise<void> | void;
  onCreateMilestone: (payload: {
    title: string;
    description?: string;
    targetDate: string;
  }) => Promise<void> | void;
  onUpdateMilestone: (milestoneId: number, payload: {
    title: string;
    description?: string;
    targetDate: string;
  }) => Promise<void> | void;
  onDeleteMilestone: (milestoneId: number) => Promise<void> | void;
  onUpdateTask: (taskId: number, payload: {
    title: string;
    description?: string;
    status: TaskStatus;
    startDate: string;
    endDate: string;
    dependencies?: number[];
  }) => Promise<void> | void;
  onDeleteTask: (taskId: number) => Promise<void> | void;
  onAdjustTaskDates: (taskId: number, mode: "start" | "end", deltaDays: number) => Promise<void> | void;
  onMoveTaskDates: (taskId: number, deltaDays: number) => Promise<void> | void;
  onReorderTasks: (orderedIds: number[]) => Promise<void> | void;
  onMoveMilestone: (milestoneId: number, deltaDays: number) => Promise<void> | void;
  onUpdateProject: (projectId: number, payload: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
  }) => Promise<void> | void;
  loading: boolean;
  error: string | null;
  selectedScenarioId?: number | null;
  onSelectScenario?: (id: number | null) => void;
}

export const MainSection = ({
  project,
  tasks,
  updates,
  milestones,
  onCreateTask,
  onCreateUpdate,
  onCreateMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onUpdateTask,
  onDeleteTask,
  onAdjustTaskDates,
  onMoveTaskDates,
  onReorderTasks,
  onMoveMilestone,
  onUpdateProject,
  loading,
  error,
  selectedScenarioId,
  onSelectScenario,
}: MainSectionProps) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [isProjectEditing, setIsProjectEditing] = useState(false);
  const [displayedTasksCount, setDisplayedTasksCount] = useState<number | null>(null);
  

  

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
          milestones={milestones}
          updates={updates}
          onEditTask={setEditingTask}
          onEditMilestone={setEditingMilestone}
          onEdit={() => setIsProjectEditing(true)}
        />
        <TasksCard
          tasks={tasks}
          projectId={project?.id}
          activitiesCount={displayedTasksCount ?? tasks.length}
          onCreateTask={onCreateTask}
          onCreateMilestone={onCreateMilestone}
          onCreateUpdate={onCreateUpdate}
        />
      </div>

      {/* risk-adjust controls moved into GanttLayout (rendered below the Gantt) */}

      <GanttLayout
        projectId={project?.id}
        tasks={tasks}
        milestones={milestones}
        onEditTask={setEditingTask}
        onAdjustTaskDates={onAdjustTaskDates}
        onMoveTaskDates={onMoveTaskDates}
        onReorderTasks={onReorderTasks}
        onMoveMilestone={onMoveMilestone}
        onDisplayedTasksCount={setDisplayedTasksCount}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={onSelectScenario}
      />

      <TaskEditDialog
        task={editingTask}
        open={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        onCreateUpdate={onCreateUpdate}
        onSave={(taskId, payload) => {
          onUpdateTask(taskId, payload);
          setEditingTask(null);
        }}
        onDependencyChange={(taskId, dependencies) => {
          const source = tasks.find((t) => t.id === taskId) ?? editingTask;
          if (!source) {
            return;
          }
          onUpdateTask(taskId, {
            title: source.title,
            description: source.description,
            status: source.status,
            startDate: source.startDate,
            endDate: source.endDate,
            dependencies,
          });
        }}
        onDelete={async (taskId) => {
          await onDeleteTask(taskId);
          setEditingTask(null);
        }}
      />
      <MilestoneEditDialog
        milestone={editingMilestone}
        open={Boolean(editingMilestone)}
        onClose={() => setEditingMilestone(null)}
        onSave={(milestoneId, payload) => {
          onUpdateMilestone(milestoneId, payload);
          setEditingMilestone(null);
        }}
        onDelete={async (milestoneId) => {
          await onDeleteMilestone(milestoneId);
          setEditingMilestone(null);
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
