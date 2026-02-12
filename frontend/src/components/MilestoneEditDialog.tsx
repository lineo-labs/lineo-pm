import { useEffect, useMemo, useState } from "react";

import type { Milestone } from "../lib/types";

interface MilestoneEditDialogProps {
  milestone: Milestone | null;
  open: boolean;
  onClose: () => void;
  onSave: (
    milestoneId: number,
    payload: {
      title: string;
      description?: string;
      targetDate: string;
    }
  ) => void;
  onDelete: (milestoneId: number) => Promise<void> | void;
}

export const MilestoneEditDialog = ({
  milestone,
  open,
  onClose,
  onSave,
  onDelete,
}: MilestoneEditDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");

  useEffect(() => {
    if (!milestone) {
      return;
    }
    setTitle(milestone.title);
    setDescription(milestone.description ?? "");
    setTargetDate(milestone.targetDate);
  }, [milestone]);

  const disabled = useMemo(() => !milestone || !title.trim(), [milestone, title]);

  if (!open || !milestone) {
    return null;
  }

  const handleDelete = async () => {
    if (!milestone) {
      return;
    }
    const confirmed = window.confirm("Delete this milestone?");
    if (!confirmed) {
      return;
    }
    await onDelete(milestone.id);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Edit milestone</h3>
            <p className="text-xs text-slate-500">Update title, description, and date.</p>
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
          <div>
            <label className="text-xs text-slate-400">Target date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
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
                onSave(milestone.id, {
                  title: title.trim(),
                  description: description.trim() || undefined,
                  targetDate,
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
  );
};
