import { useEffect, useMemo, useRef, useState } from "react";

import type { Project } from "../lib/types";
import type { DateScale } from "../lib/dateScale";
import {
  diffInDays,
  diffInMonths,
  formatDayLabel,
  formatMonthLabel,
  formatWeekLabel,
  getDateColumns,
  getMonthColumns,
  getWeekColumns,
  parseISODate,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  addDays,
  toISODate,
} from "../lib/dateRange";
import { getAutoScale, getRangeScale } from "../lib/dateScale";
import { GanttGrid } from "./Gantt/GanttGrid";
import { GanttHeader } from "./Gantt/GanttHeader";

interface CrossProjectGanttProps {
  projects: Project[];
  onSelectProject: (projectId: number) => void;
}

const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 38;
const NAME_COLUMN_WIDTH = 200;
export const CrossProjectGantt = ({ projects, onSelectProject }: CrossProjectGanttProps) => {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const element = timelineRef.current;
    if (!element) return;
    const updateWidth = () => setTimelineWidth(element.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { start, end } = useMemo(() => {
    const dates: Date[] = [];
    for (const p of projects) {
      const s = parseISODate(p.startDate);
      const e = parseISODate(p.endDate);
      if (!isNaN(s.getTime())) dates.push(s);
      if (!isNaN(e.getTime())) dates.push(e);
    }
    if (dates.length === 0) {
      const today = new Date();
      const s = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      return { start: s, end: addDays(s, 30) };
    }
    const rawStart = new Date(Math.min(...dates.map((d) => d.getTime())));
    const rawEnd = new Date(Math.max(...dates.map((d) => d.getTime())));
    return { start: addDays(rawStart, -2), end: addDays(rawEnd, 2) };
  }, [projects]);

  const fallbackScale = getRangeScale(start, end);
  const autoScale = useMemo(() => {
    if (timelineWidth <= 0) return null;
    return getAutoScale(start, end, timelineWidth);
  }, [start, end, timelineWidth]);

  const scale: DateScale = autoScale?.scale ?? fallbackScale;
  const DAY_WIDTH = 40;
  const WEEK_WIDTH = 120;
  const MONTH_WIDTH = 160;
  const columnWidth =
    autoScale?.columnWidth ??
    (scale === "week" ? WEEK_WIDTH : scale === "month" ? MONTH_WIDTH : DAY_WIDTH);

  const rangeStart =
    scale === "week" ? startOfWeek(start) : scale === "month" ? startOfMonth(start) : start;

  const columns =
    scale === "week"
      ? getWeekColumns(start, end)
      : scale === "month"
      ? getMonthColumns(start, end)
      : getDateColumns(start, end);

  const headerLabels = columns.map((col) =>
    scale === "week"
      ? formatWeekLabel(col)
      : scale === "month"
      ? formatMonthLabel(col)
      : formatDayLabel(col)
  );

  const getProjectPosition = (project: Project) => {
    const effectiveColumnWidth = columnWidth;
    const pStart = parseISODate(project.startDate);
    const pEnd = parseISODate(project.endDate);

    if (scale === "week") {
      const daysToStart = diffInDays(rangeStart, pStart);
      const daysToEnd = diffInDays(rangeStart, pEnd);
      const dayPixel = effectiveColumnWidth / 7;
      return { offset: daysToStart * dayPixel, width: (daysToEnd - daysToStart + 1) * dayPixel };
    }

    if (scale === "month") {
      const startMonthIndex = diffInMonths(rangeStart, startOfMonth(pStart));
      const endMonthIndex = diffInMonths(rangeStart, startOfMonth(pEnd));
      const startMonthDate = startOfMonth(pStart);
      const daysInStartMonth = endOfMonth(startMonthDate).getUTCDate();
      const dayOfStart = pStart.getUTCDate();
      const offset =
        startMonthIndex * effectiveColumnWidth + ((dayOfStart - 1) / daysInStartMonth) * effectiveColumnWidth;

      let width = 0;
      if (startMonthIndex === endMonthIndex) {
        const dayOfEnd = pEnd.getUTCDate();
        width = ((dayOfEnd - dayOfStart + 1) / daysInStartMonth) * effectiveColumnWidth;
      } else {
        const daysRemainingInStart = daysInStartMonth - (dayOfStart - 1);
        width += (daysRemainingInStart / daysInStartMonth) * effectiveColumnWidth;
        for (let mi = startMonthIndex + 1; mi < endMonthIndex; mi++) {
          width += effectiveColumnWidth;
        }
        const endMonthDate = startOfMonth(pEnd);
        const daysInEndMonth = endOfMonth(endMonthDate).getUTCDate();
        const dayOfEnd = pEnd.getUTCDate();
        width += (dayOfEnd / daysInEndMonth) * effectiveColumnWidth;
      }
      return { offset, width };
    }

    // day scale
    const startIndex = diffInDays(rangeStart, pStart);
    const endIndex = diffInDays(rangeStart, pEnd);
    return { offset: startIndex * effectiveColumnWidth, width: (endIndex - startIndex + 1) * effectiveColumnWidth };
  };

  if (projects.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left"
          onClick={() => setCollapsed((c) => !c)}
        >
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${collapsed ? "-rotate-90" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
          <h2 className="text-lg font-semibold text-slate-100">Projects Overview</h2>
        </button>
        {!collapsed && (
          <p className="mt-4 text-sm text-slate-400">No projects yet. Create one from the sidebar.</p>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-900 bg-slate-950/70 p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="flex items-center gap-2 text-left"
          onClick={() => setCollapsed((c) => !c)}
        >
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${collapsed ? "-rotate-90" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Projects Overview</h2>
            <p className="text-xs text-slate-500">
              Scale: {scale === "month" ? "Months" : scale === "week" ? "Weeks" : "Days"}
            </p>
          </div>
        </button>
        <div className="text-xs text-slate-500">{projects.length} projects</div>
      </div>

      {collapsed ? null : (
      <div className="relative grid grid-cols-[200px_1fr] gap-0">
        {/* Left: Project names */}
        <div className="border-r border-slate-900" style={{ width: NAME_COLUMN_WIDTH }}>
          <div
            className="sticky top-0 z-10 flex items-center border-b border-slate-900 bg-slate-950 px-3 text-xs font-medium text-slate-400"
            style={{ height: HEADER_HEIGHT }}
          >
            Project
          </div>
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center border-b border-slate-900/40 px-3 cursor-pointer hover:bg-slate-800/40 transition-colors"
              style={{ height: ROW_HEIGHT }}
              onClick={() => onSelectProject(project.id)}
              title={project.description || project.name}
            >
              <span className="truncate text-sm text-slate-200">{project.name}</span>
            </div>
          ))}
        </div>

        {/* Right: Timeline */}
        <div
          ref={timelineRef}
          className="relative overflow-visible rounded-r-xl border border-slate-900 bg-slate-950"
        >
          <div className="overflow-hidden">
            <GanttHeader labels={headerLabels} columnWidth={columnWidth} height={HEADER_HEIGHT} />
            <GanttGrid
              columns={columns.length}
              columnWidth={columnWidth}
              rowCount={projects.length}
              rowHeight={ROW_HEIGHT}
              headerHeight={HEADER_HEIGHT}
              scale={scale}
              columnDates={scale === "day" ? columns : []}
            />
            <div className="relative">
              {projects.map((project, index) => {
                const { offset, width } = getProjectPosition(project);
                return (
                  <div
                    key={project.id}
                    className="relative"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <div
                      className="absolute top-2 flex h-7 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500/80 to-blue-500/80 px-3 text-xs font-medium text-white shadow-sm shadow-blue-500/30 cursor-pointer hover:from-cyan-400/90 hover:to-blue-400/90 transition-colors"
                      style={{
                        left: offset,
                        width: Math.max(width, 20),
                        transition: "left 150ms ease",
                      }}
                      onClick={() => onSelectProject(project.id)}
                      title={`${project.name}${project.description ? ` — ${project.description}` : ""}`}
                    >
                      <span className="truncate">{project.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      )}
    </section>
  );
};
