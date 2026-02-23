import React, { useEffect, useRef, useState } from "react";

interface Option {
  id: number;
  label: string;
}

interface Props {
  label: string;
  options: Option[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabledIds?: number[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

const MultiSelectDropdown = ({
  label,
  options,
  selectedIds,
  onChange,
  disabledIds = [],
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const open = typeof controlledOpen === "boolean" ? controlledOpen : internalOpen;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        if (open) {
          if (onOpenChange) onOpenChange(false);
          else setInternalOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, onOpenChange]);

  const setOpen = (v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setInternalOpen(v);
  };

  const toggleOpen = () => setOpen(!open);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  const disabledSet = new Set<number>(disabledIds || []);

  const toggleId = (id: number) => {
    if (disabledSet.has(id)) return;
    const next = new Set<number>(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {!hideTrigger && (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={toggleOpen}
          className="w-full cursor-pointer rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-left text-sm text-slate-100"
        >
          <div className="flex items-center justify-between">
            <div className="truncate">
              <span className="font-medium text-slate-100">{label}</span>
              <div className="text-xs text-slate-400">
                {selectedIds.length === 0 ? "No items selected" : `${selectedIds.length} selected`}
              </div>
            </div>
            <div className="ml-3 text-slate-400">{open ? "▴" : "▾"}</div>
          </div>
        </button>
      )}

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-md border border-slate-800 bg-slate-950 p-3 shadow-lg">
          <div className="mb-2">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-3 text-sm text-slate-400">No results</div>
            ) : (
              <ul className="flex flex-col gap-2">
                {filtered.map((o) => {
                  const active = selectedIds.includes(o.id);
                  const isDisabled = disabledSet.has(o.id);
                  const baseCls = "rounded-lg border border-slate-900 bg-slate-900/40 p-3 cursor-pointer hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";
                  const activeCls = "bg-indigo-600 text-white ring-2 ring-indigo-500 border-indigo-600";
                  const disabledCls = "opacity-50 cursor-not-allowed";
                  return (
                    <li key={o.id}>
                      <div
                        role="option"
                        aria-selected={active}
                        tabIndex={0}
                        onClick={() => toggleId(o.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleId(o.id);
                          }
                        }}
                        className={`${baseCls} ${active ? activeCls : ""} ${isDisabled ? disabledCls : ""}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="text-sm font-medium">{o.label}</div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2">
            <div className="text-xs text-slate-400">{selectedIds.length} selected</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  // clear search but keep open
                  setSearch("");
                }}
                className="rounded-md px-2 py-1 text-xs text-slate-300"
              >
                Clear search
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-indigo-500 px-2 py-1 text-xs font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
