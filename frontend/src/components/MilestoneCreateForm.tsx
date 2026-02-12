import { useMemo, useState } from "react";

interface MilestoneCreateFormProps {
  projectId?: number;
  onSubmit: (payload: {
    title: string;
    description?: string;
    targetDate: string;
  }) => Promise<void> | void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export const MilestoneCreateForm = ({ projectId, onSubmit }: MilestoneCreateFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState(todayIso());

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
          targetDate,
        });
        setTitle("");
        setDescription("");
      }}
    >
      {!projectId && (
        <div className="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-500">
          Select a project to add milestones.
        </div>
      )}
      <div>
        <label className="text-xs text-slate-400">Title</label>
        <input
          className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Milestone title"
          disabled={!projectId}
        />
      </div>
      <div>
        <label className="text-xs text-slate-400">Description</label>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional details"
          rows={2}
          disabled={!projectId}
        />
      </div>
      <div>
        <label className="text-xs text-slate-400">Target date</label>
        <input
          type="date"
          className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
          disabled={!projectId}
        />
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition enabled:hover:bg-indigo-500 disabled:opacity-60"
      >
        Add milestone
      </button>
    </form>
  );
};
