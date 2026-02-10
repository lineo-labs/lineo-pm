import { useMemo, useState } from "react";

import type { TaskStatus } from "../lib/types";
import { DateRangePicker } from "./DateRangePicker";

interface TaskCreateFormProps {
  projectId?: number;
  onSubmit: (payload: {
    title: string;
    description?: string;
    status: TaskStatus;
    startDate: string;
    endDate: string;
  }) => Promise<void> | void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export const TaskCreateForm = ({ projectId, onSubmit }: TaskCreateFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());

  const disabled = useMemo(() => !projectId || !title.trim(), [projectId, title]);

  return (
    <form
      className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-900 bg-slate-900/40 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled) {
          return;
        }
        onSubmit({
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          startDate,
          endDate,
        });
        setTitle("");
        setDescription("");
      }}
    >
      {!projectId && (
        <div className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-500">
          Select a project to add tasks.
        </div>
      )}
      <div>
        <label className="text-xs text-slate-400">Title</label>
        <input
          className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="New task"
          disabled={!projectId}
        />
      </div>
      <div>
        <label className="text-xs text-slate-400">Description</label>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Short description"
          rows={2}
          disabled={!projectId}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr]">
        <DateRangePicker
          label="Dates"
          startDate={startDate}
          endDate={endDate}
          onChange={(nextStart, nextEnd) => {
            setStartDate(nextStart);
            setEndDate(nextEnd);
          }}
          disabled={!projectId}
        />
        <div>
          <label className="text-xs text-slate-400">Status</label>
          <select
            className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={status}
            onChange={(event) => setStatus(event.target.value as TaskStatus)}
            disabled={!projectId}
          >
            <option value="todo">Todo</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition enabled:hover:bg-indigo-500 disabled:opacity-60"
      >
        Add task
      </button>
    </form>
  );
};
