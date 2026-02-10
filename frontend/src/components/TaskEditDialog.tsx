import { useEffect, useMemo, useState } from "react";

import type { Task, TaskStatus } from "../lib/types";
import { DateRangePicker } from "./DateRangePicker";

interface TaskEditDialogProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onSave: (taskId: number, payload: {
    title: string;
    description?: string;
    status: TaskStatus;
    startDate: string;
    endDate: string;
  }) => void;
  onDelete: (taskId: number) => Promise<void> | void;
}

export const TaskEditDialog = ({ task, open, onClose, onSave, onDelete }: TaskEditDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!task) {
      return;
    }
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setStartDate(task.startDate);
    setEndDate(task.endDate);
  }, [task]);

  const disabled = useMemo(() => !task || !title.trim(), [task, title]);

  if (!open || !task) {
    return null;
  }

  const handleDelete = async () => {
    if (!task) {
      return;
    }
    const confirmed = window.confirm("Eliminare questo task?");
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
            <h3 className="text-lg font-semibold text-slate-100">Modifica task</h3>
            <p className="text-xs text-slate-500">Aggiorna titolo, stato e date.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-800 px-2 py-1 text-xs text-slate-300"
          >
            Chiudi
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label className="text-xs text-slate-400">Titolo</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Descrizione</label>
            <textarea
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>
          <DateRangePicker
            label="Date"
            startDate={startDate}
            endDate={endDate}
            onChange={(nextStart, nextEnd) => {
              setStartDate(nextStart);
              setEndDate(nextEnd);
            }}
          />
          <div>
            <label className="text-xs text-slate-400">Stato</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
            >
              <option value="todo">Todo</option>
              <option value="in_progress">In corso</option>
              <option value="done">Fatto</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-md border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-200 transition hover:border-red-500 hover:text-red-100"
          >
            Elimina
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-300"
            >
              Annulla
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
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
