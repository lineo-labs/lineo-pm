import { useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";

import { parseISODate, toISODate } from "../lib/dateRange";

interface DateRangePickerProps {
  label: string;
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
  disabled?: boolean;
}

export const DateRangePicker = ({
  label,
  startDate,
  endDate,
  onChange,
  disabled = false,
}: DateRangePickerProps) => {
  const [open, setOpen] = useState(false);

  const selected = useMemo<DateRange>(
    () => ({ from: parseISODate(startDate), to: parseISODate(endDate) }),
    [startDate, endDate]
  );

  const handleSelect = (range?: DateRange) => {
    if (!range?.from) {
      return;
    }
    const from = range.from;
    const to = range.to ?? range.from;
    onChange(toISODate(from), toISODate(to));
    if (range.to) {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <label className="text-xs text-slate-400">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="mt-1 flex w-full items-center justify-between rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
      >
        <span>
          {startDate} → {endDate}
        </span>
        <span className="text-xs text-slate-500">Seleziona</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-[320px] rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl">
          <DayPicker
            mode="range"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={parseISODate(startDate)}
            weekStartsOn={1}
            className="rdp-dark"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Seleziona inizio e fine nello stesso calendario.</span>
            <button
              type="button"
              className="rounded-md border border-slate-800 px-2 py-1 text-slate-300"
              onClick={() => setOpen(false)}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
