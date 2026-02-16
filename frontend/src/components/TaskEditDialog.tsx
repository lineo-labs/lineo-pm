import { useEffect, useMemo, useState } from "react";

import type { Task, TaskStatus } from "../lib/types";
import { fetchPossibleDependencies, getAllTasks } from "../lib/api";
import { DateRangePicker } from "./DateRangePicker";
import MultiSelectDropdown from "./MultiSelectDropdown";

interface TaskEditDialogProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onCreateUpdate: (payload: { text: string; taskId: number }) => Promise<void> | void;
  onSave: (taskId: number, payload: {
    title: string;
    description?: string;
    status: TaskStatus;
    startDate: string;
    endDate: string;
    dependencies?: number[];
  }) => void;
  onDelete: (taskId: number) => Promise<void> | void;
  onDependencyChange?: (taskId: number, dependencies: number[]) => Promise<void> | void;
}

/**
 * Dialog for editing an existing task, dependencies and adding updates.
 *
 * Provides ability to save, delete or add a textual update for the task.
 * Supports changing dependencies via `onDependencyChange` when supplied.
 *
 * @param {object} props - Component props
 * @param {import("../lib/types").Task | null} props.task - Task to edit or null
 * @param {boolean} props.open - Whether the dialog is visible
 * @param {() => void} props.onClose - Close handler
 * @param {(payload: {text: string, taskId: number}) => Promise<void> | void} props.onCreateUpdate - Handler to add a task update
 * @param {(taskId: number, payload: {title: string, description?: string, status: import("../lib/types").TaskStatus, startDate: string, endDate: string, dependencies?: number[]}) => void} props.onSave - Save handler
 * @param {(taskId: number) => Promise<void> | void} props.onDelete - Delete handler
 * @param {(taskId: number, dependencies: number[]) => Promise<void> | void} [props.onDependencyChange] - Optional dependency change handler
 * @returns {JSX.Element | null} The task edit dialog element or null when closed
 */
export const TaskEditDialog = ({
  task,
  open,
  onClose,
  onCreateUpdate,
  onSave,
  onDelete,
  onDependencyChange,
}: TaskEditDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [updateText, setUpdateText] = useState("");
  
  const [possibleTasks, setPossibleTasks] = useState<Task[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<number[]>([]);
  const [depsOpen, setDepsOpen] = useState(false);

  useEffect(() => {
    if (!task) {
      return;
    }
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setStartDate(task.startDate);
    setEndDate(task.endDate);
    setUpdateText("");
    setSelectedDependencies([]);

    (async () => {
      try {
        const [resRes, allRes] = await Promise.allSettled([
          fetchPossibleDependencies(task.id, "predecessors"),
          getAllTasks(task.projectId),
        ]);

        const possibleRaw: any[] =
          resRes.status === "fulfilled" && Array.isArray(resRes.value.possible) ? resRes.value.possible : [];
        const activeRaw: any[] =
          resRes.status === "fulfilled" && Array.isArray(resRes.value.active) ? resRes.value.active : [];
        const allTasks: Task[] = allRes.status === "fulfilled" ? allRes.value : [];

        const possibleMapped: Task[] = possibleRaw.map((p: any) => ({
          id: p.id,
          projectId: p.projectId,
          title: p.title,
          description: p.description,
          status: p.status,
          startDate: p.startDate,
          endDate: p.endDate,
          dependencies: p.dependencies ?? [],
          orderIndex: p.orderIndex,
        }));

        // map active relations' source_task_id to Task objects using allTasks
        const activeSourceIds = new Set<number>(activeRaw.map((a: any) => a.source_task_id));
        const activeTasks: Task[] = allTasks.filter((t) => activeSourceIds.has(t.id));

        // merge possible + active + any explicit dependencies present in allTasks
        const map = new Map<number, Task>();
        possibleMapped.forEach((t) => map.set(t.id, t));
        activeTasks.forEach((t) => map.set(t.id, t));
        (task.dependencies ?? []).forEach((depId) => {
          if (!map.has(depId)) {
            const found = allTasks.find((t) => t.id === depId);
            if (found) map.set(found.id, found);
          }
        });

        const finalTasks = Array.from(map.values()).sort((a, b) => a.id - b.id);

        setPossibleTasks(finalTasks);

        // only keep pre-existing dependencies that are present in final options
        const possibleIds = new Set(finalTasks.map((t) => t.id));
        const filteredSelected = (task.dependencies ?? []).filter((id) => possibleIds.has(id));
        setSelectedDependencies(filteredSelected);
      } catch (err) {
        setPossibleTasks([]);
        setSelectedDependencies([]);
      }
    })();
  }, [task]);

  // fetch possibleTasks + relations when deps dropdown is opened
  useEffect(() => {
    if (!depsOpen || !task) return;

    (async () => {
      try {
        const [resRes, allRes] = await Promise.allSettled([
          fetchPossibleDependencies(task.id, "predecessors"),
          getAllTasks(task.projectId),
        ]);

        const possibleRaw: any[] =
          resRes.status === "fulfilled" && Array.isArray(resRes.value.possible) ? resRes.value.possible : [];
        const activeRaw: any[] =
          resRes.status === "fulfilled" && Array.isArray(resRes.value.active) ? resRes.value.active : [];
        const allTasks: Task[] = allRes.status === "fulfilled" ? allRes.value : [];

        const possibleMapped: Task[] = possibleRaw.map((p: any) => ({
          id: p.id,
          projectId: p.projectId,
          title: p.title,
          description: p.description,
          status: p.status,
          startDate: p.startDate,
          endDate: p.endDate,
          dependencies: p.dependencies ?? [],
          orderIndex: p.orderIndex,
        }));

        const activeSourceIds = new Set<number>(activeRaw.map((a: any) => a.source_task_id));
        const activeTasks: Task[] = allTasks.filter((t) => activeSourceIds.has(t.id));

        const map = new Map<number, Task>();
        possibleMapped.forEach((t) => map.set(t.id, t));
        activeTasks.forEach((t) => map.set(t.id, t));

        const finalTasks = Array.from(map.values()).sort((a, b) => a.id - b.id);

        setPossibleTasks(finalTasks);

        const possibleIds = new Set(finalTasks.map((t) => t.id));
        const filteredSelected = (task.dependencies ?? []).filter((id) => possibleIds.has(id));
        setSelectedDependencies(filteredSelected);
      } catch (err) {
        setPossibleTasks([]);
        setSelectedDependencies([]);
      }
    })();
  }, [depsOpen, task]);

  // fetching and preselection occur when dropdown opens (see effect below)

  const disabled = useMemo(() => !task || !title.trim(), [task, title]);
  const updateDisabled = useMemo(() => !task || !updateText.trim(), [task, updateText]);

  if (!open || !task) {
    return null;
  }

  const handleDelete = async () => {
    if (!task) {
      return;
    }
    const confirmed = window.confirm("Delete this task?");
    if (!confirmed) {
      return;
    }
    await onDelete(task.id);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Edit task</h3>
            <p className="text-xs text-slate-500">Update title, status, and dates.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-800 px-2 py-1 text-xs text-slate-300"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-xs text-slate-400">Title</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Description</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>
          <DateRangePicker
            label="Dates"
            startDate={startDate}
            endDate={endDate}
            onChange={(nextStart, nextEnd) => {
              setStartDate(nextStart);
              setEndDate(nextEnd);
            }}
          />
          <div>
            <div className="flex items-center justify-between">
              <label onClick={() => setDepsOpen(true)} className="text-xs text-slate-400 cursor-pointer select-none">
                Depends on
              </label>
              <div className="text-xs text-slate-400">Select one or more tasks this task depends on.</div>
            </div>
            <div className="mt-1">
              <MultiSelectDropdown
                label={selectedDependencies.length === 0 ? "Depends on" : `${selectedDependencies.length} selected`}
                options={possibleTasks.map((t) => ({ id: t.id, label: t.title }))}
                selectedIds={selectedDependencies}
                open={depsOpen}
                onOpenChange={(v) => setDepsOpen(v)}
                  hideTrigger={true}
                onChange={(ids) => {
                  setSelectedDependencies(ids);
                  if (task && onDependencyChange) {
                    void onDependencyChange(task.id, ids);
                  }
                }}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Status</label>
            <div className="mt-2 flex gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  name="task-status"
                  value="todo"
                  checked={status === "todo"}
                  onChange={() => setStatus("todo")}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-500"
                />
                <span className="text-xs text-slate-100">Todo</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  name="task-status"
                  value="in_progress"
                  checked={status === "in_progress"}
                  onChange={() => setStatus("in_progress")}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-500"
                />
                <span className="text-xs text-slate-100">In progress</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  name="task-status"
                  value="done"
                  checked={status === "done"}
                  onChange={() => setStatus("done")}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-500"
                />
                <span className="text-xs text-slate-100">Done</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <details className="mt-6">
            <summary className="flex cursor-pointer items-center justify-between text-lg font-semibold text-slate-100">
              <span>New update</span>
              <span />
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                value={updateText}
                onChange={(event) => setUpdateText(event.target.value)}
                rows={3}
                placeholder="Write the latest update..." // using same placeholder as TasksCard.tsx
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={updateDisabled}
                  onClick={() => {
                    if (!task) {
                      return;
                    }
                    onCreateUpdate({ text: updateText.trim(), taskId: task.id });
                    setUpdateText("");
                  }}
                  className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition enabled:hover:bg-indigo-500 disabled:opacity-60"
                >
                  Add update
                </button>
              </div>
            </div>
          </details>
          <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-md border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-200 transition hover:border-red-500 hover:text-red-100"
          >
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                  onSave(task.id, {
                    title: title.trim(),
                    description: description.trim() || undefined,
                    status,
                    startDate,
                    endDate,
                    dependencies: selectedDependencies,
                  })
                }
              className="rounded-md bg-indigo-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              Save
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
