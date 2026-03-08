import { useEffect, useMemo, useState } from "react";

import type { Project } from "../lib/types";
import { DateRangePicker } from "./DateRangePicker";

interface ProjectEditDialogProps {
  project: Project | undefined;
  open: boolean;
  onClose: () => void;
  onSave: (projectId: number, payload: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
  }) => void;
}

export const ProjectEditDialog = ({ project, open, onClose, onSave }: ProjectEditDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!project) {
      return;
    }
    setName(project.name);
    setDescription(project.description ?? "");
    setStartDate(project.startDate);
    setEndDate(project.endDate);
  }, [project]);

  const disabled = useMemo(() => !project || !name.trim(), [project, name]);

  if (!open || !project) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 pt-16">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Edit project</h3>
            <p className="text-xs text-slate-500">Update details and dates.</p>
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
            <label className="text-xs text-slate-400">Name</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              value={name}
              onChange={(event) => setName(event.target.value)}
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
            label="Project dates"
            startDate={startDate}
            endDate={endDate}
            onChange={(nextStart, nextEnd) => {
              setStartDate(nextStart);
              setEndDate(nextEnd);
            }}
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
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
              onSave(project.id, {
                name: name.trim(),
                description: description.trim() || undefined,
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
  );
};
