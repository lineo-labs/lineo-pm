import { useEffect, useMemo, useState } from "react";

import type { Task, TaskStatus } from "../lib/types";
import { DateRangePicker } from "./DateRangePicker";

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
  }) => void;
  onDelete: (taskId: number) => Promise<void> | void;
}

export const TaskEditDialog = ({
  task,
  open,
  onClose,
  onCreateUpdate,
  onSave,
  onDelete,
}: TaskEditDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [updateText, setUpdateText] = useState("");

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
  }, [task]);

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
