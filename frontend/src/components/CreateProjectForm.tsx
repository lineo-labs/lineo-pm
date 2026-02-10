import { useState } from "react";

import { DateRangePicker } from "./DateRangePicker";

interface CreateProjectFormProps {
  onSubmit: (payload: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
  }) => Promise<void> | void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export const CreateProjectForm = ({ onSubmit }: CreateProjectFormProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());

  return (
    <form
      className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-900 bg-slate-900/40 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) {
          return;
        }
        onSubmit({
          name: name.trim(),
          description: description.trim() || undefined,
          startDate,
          endDate,
        });
        setName("");
        setDescription("");
      }}
    >
      <div>
        <label className="text-xs text-slate-400">Name</label>
        <input
          className="mt-1 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New project"
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
      <button
        type="submit"
        className="rounded-md bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400"
      >
        Save project
      </button>
    </form>
  );
};
