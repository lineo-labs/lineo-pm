import { useEffect, useMemo, useState } from "react";

import { AppShell } from "./components/AppShell";
import { CrossProjectGantt } from "./components/CrossProjectGantt";
import { MainSection } from "./components/MainSection";
import { Sidebar } from "./components/Sidebar";
import {
  createProject,
  createTask,
  createUpdate,
  createMilestone,
  deleteTask,
  deleteMilestone,
  fetchMilestones,
  fetchProjects,
  fetchScenarios,
  fetchScenarioTasks,
  getAllTasks,
  fetchUpdates,
  reorderTasks,
  updateMilestone,
  updateProject,
  updateTask,
  setTaskDependencies,
} from "./lib/api";
import { addDays, parseISODate, toISODate } from "./lib/dateRange";
import type { Milestone, Project, ProjectUpdate, Task, TaskStatus } from "./lib/types";

export const App = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clear scenario selection when project changes to force baseline loading
  useEffect(() => {
    setSelectedScenarioId(null);
  }, [selectedProjectId]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchProjects()
      .then((data) => {
        if (!active) {
          return;
        }
        setProjects(data);
        setSelectedProjectId(null);
        setError(null);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "API error");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };

  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }
    let active = true;
    getAllTasks(selectedProjectId)
      .then((data) => {
        if (!active) {
          return;
        }
        setTasks(data);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "API error");
      });

    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setUpdates([]);
      return;
    }
    let active = true;
    fetchUpdates(selectedProjectId)
      .then((data) => {
        if (!active) {
          return;
        }
        setUpdates(data);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "API error");
      });

    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setMilestones([]);
      return;
    }
    let active = true;
    // load tasks for the baseline scenario if selected
    const load = async () => {
      if (!selectedScenarioId) {
        // if no selected scenario, try to fetch scenarios and pick baseline
        try {
          const scenarios = await fetchScenarios(selectedProjectId);
          if (scenarios.length === 0) {
            if (!active) return;
            setTasks([]);
            setError("No scenarios found for project");
            return;
          }
          
          // Find baseline scenario or fallback to first scenario
          const baseline = scenarios.find((s: any) => (s as any).isBaseline === true) ?? scenarios[0];
          if (baseline) {
            setSelectedScenarioId(baseline.id);
            const t = await fetchScenarioTasks(baseline.id);
            if (!active) return;
            setTasks(t.map((st) => ({
              id: st.id,
              scenarioId: st.scenarioId,
              title: st.title,
              description: st.description ?? undefined,
              status: st.status,
              startDate: st.startDate,
              endDate: st.endDate,
              dependencies: st.dependencies ?? [],
              orderIndex: st.orderIndex,
            })));
          } else {
            if (!active) return;
            setTasks([]);
            setError("No valid scenarios found for project");
          }
        } catch (err) {
          if (!active) return;
          setError(err instanceof Error ? err.message : "Failed to load baseline scenario");
          setTasks([]);
        }
        return;
      }

      // if scenario selected, fetch its tasks
      try {
        const t = await fetchScenarioTasks(selectedScenarioId);
        if (!active) return;
        setTasks(t.map((st) => ({
          id: st.id,
          scenarioId: st.scenarioId,
          title: st.title,
          description: st.description ?? undefined,
          status: st.status,
          startDate: st.startDate,
          endDate: st.endDate,
          dependencies: st.dependencies ?? [],
          orderIndex: st.orderIndex,
        })));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "API error");
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [selectedProjectId, selectedScenarioId]);

  const selectedProject = useMemo<Project | undefined>(() => {
    return projects.find((project) => project.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const sortedTasks = useMemo<Task[]>(() => {
    return [...tasks].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [tasks]);

  const handleCreateProject = async (payload: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
  }) => {
    try {
      const project = await createProject(payload);
      setProjects((prev) => [...prev, project]);
      setSelectedProjectId(project.id);
      // load scenarios for the newly created project and select baseline if present
      try {
        const scenarios = await fetchScenarios(project.id);
        const baseline = scenarios.find((s: any) => (s as any).isBaseline === true) ?? scenarios[0];
        setSelectedScenarioId(baseline?.id ?? null);
      } catch (e) {
        setSelectedScenarioId(null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Project creation error");
    }
  };

  const handleCreateTask = async (payload: {
    title: string;
    description?: string;
    status: TaskStatus;
    startDate: string;
    endDate: string;
  }) => {
    if (!selectedScenarioId) {
      return;
    }
    try {
      const task = await createTask({
        scenarioId: selectedScenarioId,
        ...payload,
      });
      setTasks((prev) => [...prev, task]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task creation error");
    }
  };

  const handleCreateUpdate = async (payload: { text: string; taskId?: number }) => {
    const targetTask = payload.taskId ? tasks.find((task) => task.id === payload.taskId) : undefined;
    const projectId = selectedProjectId;
    if (!projectId) {
      return;
    }
    try {
      const update = await createUpdate({
        projectId,
        text: payload.text,
        taskId: payload.taskId,
      });
      setUpdates((prev) => [update, ...prev]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update creation error");
    }
  };

  const handleCreateMilestone = async (payload: {
    title: string;
    description?: string;
    targetDate: string;
  }) => {
    if (!selectedProjectId) {
      return;
    }
    try {
      const milestone = await createMilestone({
        projectId: selectedProjectId,
        ...payload,
      });
      setMilestones((prev) =>
        [...prev, milestone].sort((a, b) => a.targetDate.localeCompare(b.targetDate))
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Milestone creation error");
    }
  };

  const handleUpdateTask = async (
    taskId: number,
    payload: {
      title: string;
      description?: string;
      status: TaskStatus;
      startDate: string;
      endDate: string;
      dependencies?: number[];
    }
  ) => {
    const previous = tasks;
    // minimal optimistic update
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...payload } : task)));
    try {
      // first synchronize relations if dependencies provided
      if (payload.dependencies) {
        await setTaskDependencies(taskId, payload.dependencies, selectedScenarioId ?? undefined);
      }
      await updateTask(taskId, payload);
      // reload full list from server to get propagated changes
      const all = selectedScenarioId ? await getAllTasks(selectedScenarioId) : [];
      setTasks(all);
      setError(null);
    } catch (err) {
      setTasks(previous);
      setError(err instanceof Error ? err.message : "Task update error");
    }
  };

  const handleAdjustTaskDates = async (
    taskId: number,
    mode: "start" | "end",
    deltaDays: number
  ) => {
    if (deltaDays === 0) {
      return;
    }
    const target = tasks.find((task) => task.id === taskId);
    if (!target) {
      return;
    }
    const currentStart = parseISODate(target.startDate);
    const currentEnd = parseISODate(target.endDate);

    let nextStart = currentStart;
    let nextEnd = currentEnd;

    if (mode === "start") {
      nextStart = addDays(currentStart, deltaDays);
      if (nextStart > currentEnd) {
        nextStart = currentEnd;
      }
    } else {
      nextEnd = addDays(currentEnd, deltaDays);
      if (nextEnd < currentStart) {
        nextEnd = currentStart;
      }
    }

    await handleUpdateTask(taskId, {
      title: target.title,
      description: target.description,
      status: target.status,
      startDate: toISODate(nextStart),
      endDate: toISODate(nextEnd),
    });
  };

  const handleMoveTaskDates = async (taskId: number, deltaDays: number) => {
    if (deltaDays === 0) {
      return;
    }
    const target = tasks.find((task) => task.id === taskId);
    if (!target) {
      return;
    }

    // build map: predecessor -> [dependents]
    const dependentsMap = new Map<number, number[]>();
    for (const t of tasks) {
      for (const dep of t.dependencies ?? []) {
        const list = dependentsMap.get(dep) ?? [];
        list.push(t.id);
        dependentsMap.set(dep, list);
      }
    }

    // collect all descendants of the moved task (BFS)
    const affected = new Set<number>();
    const queue: number[] = [taskId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const deps = dependentsMap.get(cur) ?? [];
      for (const d of deps) {
        if (!affected.has(d)) {
          affected.add(d);
          queue.push(d);
        }
      }
    }
    // include the original task
    affected.add(taskId);

    const previous = tasks;

    // apply optimistic update: shift all affected tasks by deltaDays
    const nextTasks = tasks.map((t) => {
      if (!affected.has(t.id)) return t;
      const s = parseISODate(t.startDate);
      const e = parseISODate(t.endDate);
      return {
        ...t,
        startDate: toISODate(addDays(s, deltaDays)),
        endDate: toISODate(addDays(e, deltaDays)),
      };
    });

    setTasks(nextTasks);

    try {
      // update server in an order where predecessors are updated before dependents
      const updateOrder: number[] = [];
      const seen = new Set<number>();
      const q: number[] = [taskId];
      seen.add(taskId);
      while (q.length > 0) {
        const cur = q.shift()!;
        updateOrder.push(cur);
        const deps = dependentsMap.get(cur) ?? [];
        for (const d of deps) {
          if (!seen.has(d)) {
            seen.add(d);
            q.push(d);
          }
        }
      }

      for (const id of updateOrder) {
        const t = nextTasks.find((x) => x.id === id);
        if (!t) continue;
        await updateTask(id, {
          title: t.title,
          description: t.description,
          status: t.status,
          startDate: t.startDate,
          endDate: t.endDate,
        });
      }
      setError(null);
    } catch (err) {
      // rollback on error
      setTasks(previous);
      setError(err instanceof Error ? err.message : "Task update error");
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    const previous = tasks;
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    try {
      await deleteTask(taskId);
      setError(null);
    } catch (err) {
      setTasks(previous);
      setError(err instanceof Error ? err.message : "Task deletion error");
    }
  };

  const handleReorderTasks = async (orderedIds: number[]) => {
    const previous = tasks;
    const taskMap = new Map(previous.map((task) => [task.id, task]));
    const nextTasks: Task[] = [];

    orderedIds.forEach((taskId, index) => {
      const task = taskMap.get(taskId);
      if (!task) {
        return;
      }
      nextTasks.push({
        ...task,
        orderIndex: index + 1,
      });
    });

    if (nextTasks.length !== previous.length) {
      return;
    }

    setTasks(nextTasks);
    try {
      const updated = await reorderTasks(orderedIds, selectedScenarioId ?? undefined);
      setTasks(updated);
      setError(null);
    } catch (err) {
      setTasks(previous);
      setError(err instanceof Error ? err.message : "Task reorder error");
    }
  };

  const handleUpdateProject = async (
    projectId: number,
    payload: {
      name: string;
      description?: string;
      startDate: string;
      endDate: string;
    }
  ) => {
    const previous = projects;
    setProjects((prev) => prev.map((project) => (project.id === projectId ? { ...project, ...payload } : project)));
    try {
      const updated = await updateProject(projectId, payload);
      setProjects((prev) => prev.map((project) => (project.id === projectId ? updated : project)));
      setError(null);
    } catch (err) {
      setProjects(previous);
      setError(err instanceof Error ? err.message : "Project update error");
    }
  };

  const handleUpdateMilestone = async (
    milestoneId: number,
    payload: {
      title: string;
      description?: string;
      targetDate: string;
    }
  ) => {
    const previous = milestones;
    setMilestones((prev) =>
      prev
        .map((milestone) =>
          milestone.id === milestoneId ? { ...milestone, ...payload } : milestone
        )
        .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
    );
    try {
      const updated = await updateMilestone(milestoneId, payload);
      setMilestones((prev) =>
        prev
          .map((milestone) => (milestone.id === milestoneId ? updated : milestone))
          .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
      );
      setError(null);
    } catch (err) {
      setMilestones(previous);
      setError(err instanceof Error ? err.message : "Milestone update error");
    }
  };

  const handleDeleteMilestone = async (milestoneId: number) => {
    const previous = milestones;
    setMilestones((prev) => prev.filter((milestone) => milestone.id !== milestoneId));
    try {
      await deleteMilestone(milestoneId);
      setError(null);
    } catch (err) {
      setMilestones(previous);
      setError(err instanceof Error ? err.message : "Milestone deletion error");
    }
  };

  const handleMoveMilestone = async (milestoneId: number, deltaDays: number) => {
    if (deltaDays === 0) {
      return;
    }
    const target = milestones.find((milestone) => milestone.id === milestoneId);
    if (!target) {
      return;
    }
    const currentDate = parseISODate(target.targetDate);
    const nextDate = addDays(currentDate, deltaDays);
    const previous = milestones;
    setMilestones((prev) =>
      prev.map((milestone) =>
        milestone.id === milestoneId ? { ...milestone, targetDate: toISODate(nextDate) } : milestone
      )
    );
    try {
      const updated = await updateMilestone(milestoneId, { targetDate: toISODate(nextDate) });
      setMilestones((prev) =>
        prev.map((milestone) => (milestone.id === milestoneId ? updated : milestone))
      );
      setError(null);
    } catch (err) {
      setMilestones(previous);
      setError(err instanceof Error ? err.message : "Milestone update error");
    }
  };

  return (
    <AppShell
      sidebar={
        <Sidebar
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
          onCreateProject={handleCreateProject}
        />
      }
      main={
        <div className="flex flex-col gap-6">
          <CrossProjectGantt
            projects={projects}
            onSelectProject={setSelectedProjectId}
          />
          {selectedProjectId && (
            <MainSection
              project={selectedProject}
              tasks={sortedTasks}
              updates={updates}
              onCreateTask={handleCreateTask}
              onCreateUpdate={handleCreateUpdate}
              onCreateMilestone={handleCreateMilestone}
              onUpdateMilestone={handleUpdateMilestone}
              onDeleteMilestone={handleDeleteMilestone}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onAdjustTaskDates={handleAdjustTaskDates}
              onMoveTaskDates={handleMoveTaskDates}
              onReorderTasks={handleReorderTasks}
              milestones={milestones}
              onMoveMilestone={handleMoveMilestone}
              onUpdateProject={handleUpdateProject}
              loading={isLoading}
              error={error}
              selectedScenarioId={selectedScenarioId}
              onSelectScenario={setSelectedScenarioId}
            />
          )}
        </div>
      }
    />
  );
};
