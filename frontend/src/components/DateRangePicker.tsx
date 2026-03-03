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
  const [draft, setDraft] = useState<DateRange | undefined>(undefined);

  const selected = useMemo<DateRange>(
    () => ({ from: parseISODate(startDate), to: parseISODate(endDate) }),
    [startDate, endDate]
  );

  const handleSelect = (value?: DateRange | Date | Date[]) => {
    if (!value || value instanceof Date || Array.isArray(value)) {
      return;
    }
    setDraft(value);
  };

  const openPicker = () => {
    if (disabled) {
      return;
    }
    setDraft(undefined);
    setOpen(true);
  };

  const handleCancel = () => {
    setDraft(selected);
    setOpen(false);
  };

  const handleConfirm = () => {
    if (!draft?.from) {
      setOpen(false);
      return;
    }
    const from = draft.from;
    const to = draft.to ?? draft.from;
    onChange(toISODate(from), toISODate(to));
    setOpen(false);
  };

  return (
    <div className="relative">
      <label className="text-xs text-slate-400">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={openPicker}
        className="mt-1 flex w-full items-center justify-between rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
      >
        <span>
          {startDate} → {endDate}
        </span>
        <span className="text-xs text-slate-500">Select</span>
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-2 w-[320px] max-w-[90vw] rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl">
          <DayPicker
            mode="range"
            selected={draft ?? selected}
            onSelect={handleSelect}
            defaultMonth={parseISODate(startDate)}
            weekStartsOn={1}
            className="rdp-dark"
          />
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Select start and end, then confirm.</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-800 px-2 py-1 text-slate-300"
                onClick={handleCancel}
              >
                X
              </button>
              <button
                type="button"
                className="rounded-md bg-indigo-500 px-2 py-1 text-white"
                onClick={handleConfirm}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
