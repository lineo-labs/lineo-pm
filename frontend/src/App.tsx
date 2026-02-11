import { useEffect, useMemo, useState } from "react";

import { AppShell } from "./components/AppShell";
import { MainSection } from "./components/MainSection";
import { Sidebar } from "./components/Sidebar";
import {
  createProject,
  createTask,
  createUpdate,
  deleteTask,
  fetchProjects,
  fetchTasks,
  fetchUpdates,
  reorderTasks,
  updateProject,
  updateTask,
} from "./lib/api";
import { addDays, parseISODate, toISODate } from "./lib/dateRange";
import type { Project, ProjectUpdate, Task, TaskStatus } from "./lib/types";

export const App = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchProjects()
      .then((data) => {
        if (!active) {
          return;
        }
        setProjects(data);
        setSelectedProjectId(data[0]?.id ?? null);
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
    fetchTasks(selectedProjectId)
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
    if (!selectedProjectId) {
      return;
    }
    try {
      const task = await createTask({
        projectId: selectedProjectId,
        ...payload,
      });
      setTasks((prev) => [...prev, task]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task creation error");
    }
  };

  const handleCreateUpdate = async (payload: { text: string }) => {
    if (!selectedProjectId) {
      return;
    }
    try {
      const update = await createUpdate({
        projectId: selectedProjectId,
        text: payload.text,
      });
      setUpdates((prev) => [update, ...prev]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update creation error");
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
    }
  ) => {
    const previous = tasks;
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, ...payload } : task))
    );
    try {
      const updated = await updateTask(taskId, payload);
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
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
    const currentStart = parseISODate(target.startDate);
    const currentEnd = parseISODate(target.endDate);
    const nextStart = addDays(currentStart, deltaDays);
    const nextEnd = addDays(currentEnd, deltaDays);

    await handleUpdateTask(taskId, {
      title: target.title,
      description: target.description,
      status: target.status,
      startDate: toISODate(nextStart),
      endDate: toISODate(nextEnd),
    });
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
      const updated = await reorderTasks(orderedIds);
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
        <MainSection
          project={selectedProject}
          tasks={sortedTasks}
          updates={updates}
          onCreateTask={handleCreateTask}
          onCreateUpdate={handleCreateUpdate}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onAdjustTaskDates={handleAdjustTaskDates}
          onMoveTaskDates={handleMoveTaskDates}
          onReorderTasks={handleReorderTasks}
          onUpdateProject={handleUpdateProject}
          loading={isLoading}
          error={error}
        />
      }
    />
  );
};
