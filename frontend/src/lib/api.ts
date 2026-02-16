import type { Milestone, Project, ProjectUpdate, Task, TaskStatus } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

interface ProjectDto {
  id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
}

interface TaskDto {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  start_date: string;
  end_date: string;
  dependencies: number[];
  order_index: number;
}

interface UpdateDto {
  id: number;
  project_id: number;
  task_id: number | null;
  text: string;
  created_at: string;
}

interface MilestoneDto {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  target_date: string;
}

const toProject = (dto: ProjectDto): Project => ({
  id: dto.id,
  name: dto.name,
  description: dto.description ?? undefined,
  startDate: dto.start_date,
  endDate: dto.end_date,
});

const toTask = (dto: TaskDto): Task => ({
  id: dto.id,
  projectId: dto.project_id,
  title: dto.title,
  description: dto.description ?? undefined,
  status: dto.status,
  startDate: dto.start_date,
  endDate: dto.end_date,
  dependencies: dto.dependencies,
  orderIndex: dto.order_index,
});

const toUpdate = (dto: UpdateDto): ProjectUpdate => ({
  id: dto.id,
  projectId: dto.project_id,
  taskId: dto.task_id,
  text: dto.text,
  createdAt: dto.created_at,
});

const toMilestone = (dto: MilestoneDto): Milestone => ({
  id: dto.id,
  projectId: dto.project_id,
  title: dto.title,
  description: dto.description ?? undefined,
  targetDate: dto.target_date,
});

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
};

const handleVoidResponse = async (response: Response): Promise<void> => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
};

export const fetchProjects = async () => {
  const response = await fetch(`${API_BASE}/projects`);
  const data = await handleResponse<ProjectDto[]>(response);
  return data.map(toProject);
};

export const createProject = async (payload: {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}) => {
  const response = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: payload.name,
      description: payload.description,
      start_date: payload.startDate,
      end_date: payload.endDate,
    }),
  });
  const data = await handleResponse<ProjectDto>(response);
  return toProject(data);
};

export const fetchTasks = async (projectId: number) => {
  const response = await fetch(`${API_BASE}/tasks?project_id=${projectId}`);
  const data = await handleResponse<TaskDto[]>(response);
  return data.map(toTask);
};

export const exportTasksCsv = async (projectId: number) => {
  const response = await fetch(`${API_BASE}/tasks/export?project_id=${projectId}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  let filename = `project_${projectId}_tasks.csv`;
  const match = /filename\s*=\s*"?([^";]+)"?/.exec(disposition);
  if (match) filename = match[1];
  return { blob, filename };
};

export const getAllTasks = async (projectId?: number) => {
  const url = projectId ? `${API_BASE}/tasks?project_id=${projectId}` : `${API_BASE}/tasks`;
  const response = await fetch(url);
  const data = await handleResponse<TaskDto[]>(response);
  return data.map(toTask);
};

export const createTask = async (payload: {
  projectId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
}) => {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project_id: payload.projectId,
      title: payload.title,
      description: payload.description,
      status: payload.status,
      start_date: payload.startDate,
      end_date: payload.endDate,
      dependencies: [],
    }),
  });
  const data = await handleResponse<TaskDto>(response);
  return toTask(data);
};

export const updateTask = async (
  taskId: number,
  payload: Partial<{
    projectId: number;
    title: string;
    description?: string;
    status: TaskStatus;
    startDate: string;
    endDate: string;
    dependencies: number[];
  }>
) => {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project_id: payload.projectId,
      title: payload.title,
      description: payload.description,
      status: payload.status,
      start_date: payload.startDate,
      end_date: payload.endDate,
      dependencies: payload.dependencies,
    }),
  });
  // backend returns a list of updated tasks (propagations included)
  const data = await handleResponse<TaskDto[]>(response);
  return data.map(toTask);
};

export const fetchPossibleDependencies = async (
  taskId: number,
  direction: "predecessors" = "predecessors"
) => {
  const response = await fetch(`${API_BASE}/relations/possible?task_id=${taskId}&direction=${direction}`);
  const data = await handleResponse<{
    possible: TaskDto[];
    active: {
      id_relation: number;
      project_id: number | null;
      source_task_id: number;
      destination_task_id: number;
      relation_type: string;
    }[];
  }>(response);

  return {
    possible: data.possible.map(toTask),
    active: data.active,
  };
};

export const fetchRelations = async (projectId?: number) => {
  const url = projectId ? `${API_BASE}/relations?project_id=${projectId}` : `${API_BASE}/relations`;
  const response = await fetch(url);
  const data = await handleResponse<{
    id_relation: number;
    project_id: number | null;
    source_task_id: number;
    destination_task_id: number;
    relation_type: string;
  }[]>(response);
  return data;
};

export const reorderTasks = async (orderedIds: number[]) => {
  const response = await fetch(`${API_BASE}/tasks/reorder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ordered_ids: orderedIds,
    }),
  });
  const data = await handleResponse<TaskDto[]>(response);
  return data.map(toTask);
};

export const deleteTask = async (taskId: number) => {
  const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: "DELETE",
  });
  await handleVoidResponse(response);
};

export const updateProject = async (
  projectId: number,
  payload: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
  }
) => {
  const response = await fetch(`${API_BASE}/projects/${projectId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: payload.name,
      description: payload.description,
      start_date: payload.startDate,
      end_date: payload.endDate,
    }),
  });
  const data = await handleResponse<ProjectDto>(response);
  return toProject(data);
};

export const fetchMilestones = async (projectId: number) => {
  const response = await fetch(`${API_BASE}/milestones?project_id=${projectId}`);
  const data = await handleResponse<MilestoneDto[]>(response);
  return data.map(toMilestone);
};

export const createMilestone = async (payload: {
  projectId: number;
  title: string;
  description?: string;
  targetDate: string;
}) => {
  const response = await fetch(`${API_BASE}/milestones`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project_id: payload.projectId,
      title: payload.title,
      description: payload.description,
      target_date: payload.targetDate,
    }),
  });
  const data = await handleResponse<MilestoneDto>(response);
  return toMilestone(data);
};

export const updateMilestone = async (
  milestoneId: number,
  payload: Partial<{
    projectId: number;
    title: string;
    description?: string;
    targetDate: string;
  }>
) => {
  const response = await fetch(`${API_BASE}/milestones/${milestoneId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project_id: payload.projectId,
      title: payload.title,
      description: payload.description,
      target_date: payload.targetDate,
    }),
  });
  const data = await handleResponse<MilestoneDto>(response);
  return toMilestone(data);
};

export const deleteMilestone = async (milestoneId: number) => {
  const response = await fetch(`${API_BASE}/milestones/${milestoneId}`, {
    method: "DELETE",
  });
  await handleVoidResponse(response);
};

export const fetchUpdates = async (projectId: number) => {
  const response = await fetch(`${API_BASE}/updates?project_id=${projectId}`);
  const data = await handleResponse<UpdateDto[]>(response);
  return data.map(toUpdate);
};

export const createUpdate = async (payload: {
  projectId: number;
  text: string;
  taskId?: number | null;
}) => {
  const response = await fetch(`${API_BASE}/updates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project_id: payload.projectId,
      task_id: payload.taskId,
      text: payload.text,
    }),
  });
  const data = await handleResponse<UpdateDto>(response);
  return toUpdate(data);
};
