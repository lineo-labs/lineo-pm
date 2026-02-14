import { useEffect, useMemo, useState } from "react";

import type { Task, TaskStatus } from "../lib/types";
import { fetchPossibleDependencies, fetchRelations, getAllTasks } from "../lib/api";
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
    setSelectedDependencies(task.dependencies ?? []);

    // fetch possible dependency candidates and existing relations concurrently,
    // but tolerate failures by falling back to all tasks.
    (async () => {
      const [candRes, allRes, relsRes] = await Promise.allSettled([
        fetchPossibleDependencies(task.id, "both"),
        getAllTasks(task.projectId),
        fetchRelations(task.projectId),
      ]);

      const candidates: Task[] = candRes.status === "fulfilled" ? candRes.value : [];
      const allTasks: Task[] = allRes.status === "fulfilled" ? allRes.value : [];
      const rels: any[] = relsRes.status === "fulfilled" ? relsRes.value : [];

      // build sets from relations: predecessors (source -> this) and related (both ways)
      const predecessorIds = new Set<number>();
      const relatedIds = new Set<number>();
      rels.forEach((r) => {
        if (r.source_task_id === task.id) {
          relatedIds.add(r.destination_task_id);
        }
        if (r.destination_task_id === task.id) {
          // predecessor: another task -> this task
          relatedIds.add(r.source_task_id);
          predecessorIds.add(r.source_task_id);
        }
      });

      const relatedTasks = allTasks.filter((t) => relatedIds.has(t.id));

      // if both candidates and relatedTasks are empty, fallback to show all other tasks
      let finalTasks: Task[] = [];
      if (candidates.length > 0 || relatedTasks.length > 0) {
        const map = new Map<number, Task>();
        candidates.forEach((c) => map.set(c.id, c));
        relatedTasks.forEach((c) => map.set(c.id, c));

        // ensure any explicit dependencies from task.dependencies are included
        (task.dependencies ?? []).forEach((depId) => {
          if (!map.has(depId)) {
            const found = allTasks.find((t) => t.id === depId);
            if (found) map.set(found.id, found);
          }
        });

        finalTasks = Array.from(map.values());
      } else if (allTasks.length > 0) {
        finalTasks = allTasks.filter((t) => t.id !== task.id);
      } else {
        finalTasks = [];
      }

      // sort options by id ascending
      finalTasks.sort((a, b) => a.id - b.id);

      setPossibleTasks(finalTasks);

      // ensure selectedDependencies includes predecessors and task.dependencies
      const preDeps = new Set<number>(task.dependencies ?? []);
      predecessorIds.forEach((id) => preDeps.add(id));

      // Only keep selected ids that are present in the final options
      const finalIds = new Set(finalTasks.map((t) => t.id));
      const filteredSelected = Array.from(preDeps).filter((id) => finalIds.has(id));

      setSelectedDependencies(filteredSelected);
    })();
  }, [task]);

  // fetch possibleTasks + relations when deps dropdown is opened
  useEffect(() => {
    if (!depsOpen || !task) return;

    (async () => {
      const [candRes, allRes, relsRes] = await Promise.allSettled([
        fetchPossibleDependencies(task.id, "both"),
        getAllTasks(task.projectId),
        fetchRelations(task.projectId),
      ]);

      const candidates: Task[] = candRes.status === "fulfilled" ? candRes.value : [];
      const allTasks: Task[] = allRes.status === "fulfilled" ? allRes.value : [];
      const rels: any[] = relsRes.status === "fulfilled" ? relsRes.value : [];

      // build sets from relations: predecessors (source -> this) and related (both ways)
      const predecessorIds = new Set<number>();
      const relatedIds = new Set<number>();
      rels.forEach((r) => {
        if (r.source_task_id === task.id) {
          relatedIds.add(r.destination_task_id);
        }
        if (r.destination_task_id === task.id) {
          // predecessor: another task -> this task
          relatedIds.add(r.source_task_id);
          predecessorIds.add(r.source_task_id);
        }
      });

      const relatedTasks = allTasks.filter((t) => relatedIds.has(t.id));

      // if both candidates and relatedTasks are empty, fallback to show all other tasks
      let finalTasks: Task[] = [];
      if (candidates.length > 0 || relatedTasks.length > 0) {
        const map = new Map<number, Task>();
        candidates.forEach((c) => map.set(c.id, c));
        relatedTasks.forEach((c) => map.set(c.id, c));

        // ensure any explicit dependencies from task.dependencies are included
        (task.dependencies ?? []).forEach((depId) => {
          if (!map.has(depId)) {
            const found = allTasks.find((t) => t.id === depId);
            if (found) map.set(found.id, found);
          }
        });

        finalTasks = Array.from(map.values());
      } else if (allTasks.length > 0) {
        finalTasks = allTasks.filter((t) => t.id !== task.id);
      } else {
        finalTasks = [];
      }

      // sort options by id ascending
      finalTasks.sort((a, b) => a.id - b.id);

      setPossibleTasks(finalTasks);

      // ensure selectedDependencies includes predecessors and task.dependencies
      const preDeps = new Set<number>(task.dependencies ?? []);
      predecessorIds.forEach((id) => preDeps.add(id));

      // Only keep selected ids that are present in the final options
      const finalIds = new Set(finalTasks.map((t) => t.id));
      const filteredSelected = Array.from(preDeps).filter((id) => finalIds.has(id));

      setSelectedDependencies(filteredSelected);
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
            <select
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
            >
              <option value="todo">Todo</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div className="rounded-xl border border-slate-900 bg-slate-950/60 p-4">
            <div className="text-sm font-semibold text-slate-200">Add update</div>
            <textarea
              className="mt-3 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={updateText}
              onChange={(event) => setUpdateText(event.target.value)}
              rows={3}
              placeholder="Write an update for this task..."
            />
            <div className="mt-3 flex justify-end">
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
