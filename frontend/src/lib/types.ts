export type TaskStatus = "todo" | "in_progress" | "done";

export interface Project {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export interface ProjectUpdate {
  id: number;
  projectId: number;
  taskId?: number | null;
  text: string;
  createdAt: string;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  dependencies: number[];
  orderIndex?: number;
}

export interface Milestone {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  targetDate: string;
}

export interface Scenario {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  createdAt: string;
}

export interface ScenarioTask {
  id: number;
  scenarioId: number;
  taskId?: number;
  title: string;
  description?: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
  dependencies: number[];
  overrides?: Record<string, any> | null;
  orderIndex?: number;
}
