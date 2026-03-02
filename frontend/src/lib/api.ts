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
  scenario_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  start_date: string;
  end_date: string;
  actual_start?: string | null;
  actual_end?: string | null;
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

const toTask = (dto: any): Task => ({
  id: dto.id,
  scenarioId: dto.scenario_id ?? dto.project_id,
  title: dto.title,
  description: dto.description ?? undefined,
  status: dto.status,
  startDate: dto.start_date ?? dto.startDate,
  endDate: dto.end_date ?? dto.endDate,
  actualStart: dto.actual_start ?? dto.actualStart ?? undefined,
  actualEnd: dto.actual_end ?? dto.actualEnd ?? undefined,
  dependencies: dto.dependencies ?? [],
  orderIndex: dto.order_index ?? dto.orderIndex,
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

export const fetchTasks = async (scenarioId: number) => {
  // fetch tasks for a scenario (baseline) - uses scenario tasks endpoint
  const data = await fetchScenarioTasks(scenarioId);
  // fetchScenarioTasks already maps to scenario task shape; convert to Task
  return data.map((st) =>
    toTask({
      id: st.id,
      scenario_id: st.scenarioId,
      task_id: st.taskId ?? null,
      title: st.title,
      description: st.description ?? null,
      status: st.status,
      start_date: st.startDate,
      end_date: st.endDate,
      actual_start: (st as any).actualStart ?? (st as any).actual_start ?? undefined,
      actual_end: (st as any).actualEnd ?? (st as any).actual_end ?? undefined,
      dependencies: st.dependencies ?? [],
      order_index: st.orderIndex ?? 0,
    } as any)
  );
};

export const exportTasksCsv = async (scenarioId: number) => {
  // attempt scenario-scoped export; fallback to task export query param
  const response = await fetch(`${API_BASE}/tasks/export?scenario_id=${scenarioId}`);
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

export const getAllTasks = async (scenarioId?: number) => {
  if (scenarioId) {
    return fetchTasks(scenarioId);
  }
  const url = `${API_BASE}/tasks`;
  const response = await fetch(url);
  const data = await handleResponse<TaskDto[]>(response);
  return data.map(toTask);
};

export const createTask = async (payload: {
  scenarioId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  startDate: string;
  endDate: string;
}) => {
  // create a scenario task via scenario endpoints
  const created = await createScenarioTask(payload.scenarioId, {
    taskId: null,
    title: payload.title,
    description: payload.description ?? null,
    status: payload.status,
    startDate: payload.startDate,
    endDate: payload.endDate,
    orderIndex: 0,
  });
  return toTask({
    id: created.id,
    scenario_id: created.scenarioId,
    task_id: created.taskId ?? null,
    title: created.title,
    description: created.description ?? null,
    status: created.status,
    start_date: created.startDate,
    end_date: created.endDate,
    dependencies: created.dependencies ?? [],
    order_index: created.orderIndex ?? 0,
  } as any);
};

export const updateTask = async (
  taskId: number,
  payload: Partial<{
    title: string;
    description?: string;
    status: TaskStatus;
    startDate: string;
    endDate: string;
    dependencies: number[] | null;
    taskId: number | null;
  }>
) => {
  // update scenario task
  const updated = await updateScenarioTask(taskId, {
    title: payload.title,
    description: payload.description ?? null,
    status: payload.status,
    startDate: payload.startDate,
    endDate: payload.endDate,
    orderIndex: payload.orderIndex ?? undefined,
    taskId: payload.taskId ?? undefined,
  } as any);
  return [toTask({
    id: updated.id,
    scenario_id: updated.scenarioId,
    task_id: updated.taskId ?? null,
    title: updated.title,
    description: updated.description ?? null,
    status: updated.status,
    start_date: updated.startDate,
    end_date: updated.endDate,
    dependencies: updated.dependencies ?? [],
    order_index: updated.orderIndex ?? 0,
  } as any)];
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

export const createRelation = async (payload: { source_task_id: number; destination_task_id: number; relation_type?: string; scenario_id?: number }) => {
  const response = await fetch(`${API_BASE}/relations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_task_id: payload.source_task_id,
      destination_task_id: payload.destination_task_id,
      relation_type: payload.relation_type ?? "FS",
      scenario_id: payload.scenario_id,
    }),
  });
  return handleResponse<any>(response);
};

export const deleteRelation = async (id_relation: number) => {
  const response = await fetch(`${API_BASE}/relations/${id_relation}`, {
    method: "DELETE",
  });
  return handleVoidResponse(response);
};

export const setTaskDependencies = async (taskId: number, newDeps: number[], scenarioId?: number) => {
  // fetch active relations for the task
  const resp = await fetch(`${API_BASE}/relations/possible?task_id=${taskId}&direction=predecessors`);
  const data = await handleResponse<{ possible: any[]; active: { id_relation: number; source_task_id: number; destination_task_id: number }[] }>(resp);
  const existing = new Set<number>(data.active.map((a) => a.source_task_id));
  const toAdd = newDeps.filter((d) => !existing.has(d));
  const toRemove = data.active.filter((a) => !newDeps.includes(a.source_task_id));

  // create new relations
  for (const src of toAdd) {
    await createRelation({ source_task_id: src, destination_task_id: taskId, relation_type: "FS", scenario_id: scenarioId });
  }

  // remove removed relations
  for (const r of toRemove) {
    await deleteRelation(r.id_relation);
  }
};

export const reorderTasks = async (orderedIds: number[], scenarioId?: number) => {
  // prefer scenario-scoped reorder when scenarioId is provided
  const url = scenarioId ? `${API_BASE}/scenarios/tasks/reorder` : `${API_BASE}/tasks/reorder`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ordered_ids: orderedIds, scenario_id: scenarioId ?? undefined }),
  });
  const data = await handleResponse<any[]>(response);
  return data.map(toTask);
};

export const deleteTask = async (taskId: number) => {
  // delete scenario task
  await deleteScenarioTask(taskId);
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

// --- Monte Carlo simulation ---
interface MonteCarloRequestDto {
  scenario_id: number;
  runs?: number;
  risk_overrides?: Record<number, string> | null;
}

interface MonteCarloResultDto {
  runs: number;
  baseline_end: string;
  slip_probability: number;
  mean_delay_days_when_slip: number;
  percentiles_days: Record<string, number>;
  per_task_slip_probability: Record<number, number>;
  critical_index?: Record<number, number>;
  critical_path?: number[];
}

export const runMonteCarlo = async (payload: {
  scenarioId: number;
  runs?: number;
  riskOverrides?: Record<number, string> | null;
}) => {
  const body: MonteCarloRequestDto = {
    scenario_id: payload.scenarioId,
    runs: payload.runs,
    risk_overrides: payload.riskOverrides ?? null,
  };
  const response = await fetch(`${API_BASE}/simulations/montecarlo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await handleResponse<MonteCarloResultDto>(response);
  return data;
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

// --- Scenarios API ---

interface ScenarioDto {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  created_at: string;
}

interface ScenarioTaskDto {
  id: number;
  scenario_id: number;
  task_id: number | null;
  title: string;
  description: string | null;
  status: TaskDto['status'];
  start_date: string;
  end_date: string;
  dependencies: number[];
  order_index: number;
}

const toScenario = (dto: ScenarioDto) => ({
  id: dto.id,
  projectId: dto.project_id,
  name: dto.name,
  description: dto.description ?? undefined,
  isBaseline: (dto as any).is_baseline === true,
  createdAt: dto.created_at,
});

export const promoteScenarioToBaseline = async (scenarioId: number) => {
  const response = await fetch(`${API_BASE}/scenarios/${scenarioId}/promote`, {
    method: "POST",
  });
  await handleVoidResponse(response);
};

const toScenarioTask = (dto: ScenarioTaskDto) => ({
  id: dto.id,
  scenarioId: dto.scenario_id,
  taskId: dto.task_id ?? undefined,
  title: dto.title,
  description: dto.description ?? undefined,
  status: dto.status,
  startDate: dto.start_date,
  endDate: dto.end_date,
  actualStart: (dto as any).actual_start ?? (dto as any).actualStart ?? undefined,
  actualEnd: (dto as any).actual_end ?? (dto as any).actualEnd ?? undefined,
  dependencies: dto.dependencies,
  orderIndex: dto.order_index,
});

export const createScenario = async (payload: { projectId: number; name: string; description?: string }) => {
  const response = await fetch(`${API_BASE}/scenarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: payload.projectId, name: payload.name, description: payload.description }),
  });
  const data = await handleResponse<ScenarioDto>(response);
  return toScenario(data);
};

export const fetchScenarios = async (projectId?: number) => {
  const url = projectId ? `${API_BASE}/scenarios?project_id=${projectId}` : `${API_BASE}/scenarios`;
  const response = await fetch(url);
  const data = await handleResponse<ScenarioDto[]>(response);
  return data.map(toScenario);
};

export const fetchScenarioTasks = async (scenarioId: number) => {
  const response = await fetch(`${API_BASE}/scenarios/${scenarioId}/tasks`);
  const data = await handleResponse<ScenarioTaskDto[]>(response);
  // map scenario-task DTO to the frontend `Task` shape, using `baselineId` to
  // preserve an optional reference to the baseline task when present.
  return data.map(toScenarioTask);
};

export const createRiskAdjustedScenario = async (sourceScenarioId: number, payload: { targetP: number; runs?: number; name?: string }) => {
  const response = await fetch(`${API_BASE}/scenarios/${sourceScenarioId}/risk_adjust`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_p: payload.targetP, runs: payload.runs, name: payload.name }),
  });
  return handleResponse<any>(response);
};

export const createScenarioTask = async (
  scenarioId: number,
  payload: {
    taskId?: number | null;
    title: string;
    description?: string | null;
    status: TaskStatus;
    startDate: string;
    endDate: string;
    orderIndex: number;
    dependencies?: number[];
  }
) => {
  const response = await fetch(`${API_BASE}/scenarios/${scenarioId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task_id: payload.taskId,
      title: payload.title,
      description: payload.description,
      status: payload.status,
      start_date: payload.startDate,
      end_date: payload.endDate,
      order_index: payload.orderIndex,
    }),
  });
  const data = await handleResponse<ScenarioTaskDto>(response);
  return toScenarioTask(data);
};

export const updateScenarioTask = async (
  taskId: number,
  payload: Partial<{
    title: string;
    description?: string | null;
    status: TaskStatus;
    startDate: string;
    endDate: string;
    orderIndex: number;
    dependencies: number[] | null;
    taskId: number | null;
  }>
) => {
  const response = await fetch(`${API_BASE}/scenarios/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      status: payload.status,
      start_date: payload.startDate,
      end_date: payload.endDate,
      order_index: payload.orderIndex,
      task_id: payload.taskId ?? undefined,
    }),
  });
  const data = await handleResponse<ScenarioTaskDto>(response);
  return toScenarioTask(data);
};

export const getScenarioTask = async (taskId: number) => {
  const response = await fetch(`${API_BASE}/scenarios/tasks/${taskId}`);
  const data = await handleResponse<ScenarioTaskDto>(response);
  return toScenarioTask(data);
};

export const deleteScenarioTask = async (taskId: number) => {
  const response = await fetch(`${API_BASE}/scenarios/tasks/${taskId}`, { method: "DELETE" });
  await handleVoidResponse(response);
};

export const deleteScenario = async (scenarioId: number) => {
  const response = await fetch(`${API_BASE}/scenarios/${scenarioId}`, {
    method: "DELETE",
  });
  await handleVoidResponse(response);
};
