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
