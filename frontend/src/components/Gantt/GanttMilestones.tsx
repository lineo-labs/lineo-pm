import { useEffect, useRef, useState, type PointerEvent } from "react";

import type { Milestone } from "../../lib/types";
import type { DateScale } from "../../lib/dateScale";
import {
  addMonths,
  diffInDays,
  diffInDaysSigned,
  diffInMonths,
  parseISODate,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  addDays,
  formatDayLabel,
} from "../../lib/dateRange";

interface GanttMilestonesProps {
  milestones: Milestone[];
  rangeStart: Date;
  columnWidth: number;
  scale: DateScale;
  height: number;
  headerHeight: number;
  onMoveMilestone: (milestoneId: number, deltaDays: number) => void;
}

interface MilestoneLineProps {
  milestone: Milestone;
  left: number;
  height: number;
  columnWidth: number;
  scale: DateScale;
  onMoveMilestone: (milestoneId: number, deltaDays: number) => void;
}

const formatMilestoneDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
};

const MilestoneLine = ({
  milestone,
  left,
  height,
  columnWidth,
  scale,
  onMoveMilestone,
}: MilestoneLineProps) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [previewLabel, setPreviewLabel] = useState<string | null>(null);
  const startXRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  const finishDrag = (event: { clientX: number; pointerId: number }, shouldCommit: boolean) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }
    const delta = event.clientX - startXRef.current;
    const computeDeltaDays = (deltaPx: number) => {
      if (scale === "week") {
        const dayPixel = columnWidth / 7;
        return Math.round(deltaPx / dayPixel);
      }
      if (scale === "month") {
        const base = parseISODate(milestone.targetDate);
        const monthStart = startOfMonth(base);
        const daysInMonth = endOfMonth(monthStart).getUTCDate();
        const dayPixel = columnWidth / daysInMonth;
        return Math.round(deltaPx / dayPixel);
      }
      // day scale
      return Math.round(deltaPx / columnWidth);
    };

    const deltaDays = computeDeltaDays(delta);
    setDragOffset(0);
    setDragging(false);
    pointerIdRef.current = null;
    setPreviewLabel(null);
    if (shouldCommit && deltaDays !== 0) {
      onMoveMilestone(milestone.id, deltaDays);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    startXRef.current = event.clientX;
    pointerIdRef.current = event.pointerId;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || pointerIdRef.current !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const delta = event.clientX - startXRef.current;
    setDragOffset(delta);
    // update preview label similar to tasks
    const computeDeltaDays = (deltaPx: number) => {
      if (scale === "week") {
        const dayPixel = columnWidth / 7;
        return Math.round(deltaPx / dayPixel);
      }
      if (scale === "month") {
        const base = parseISODate(milestone.targetDate);
        const monthStart = startOfMonth(base);
        const daysInMonth = endOfMonth(monthStart).getUTCDate();
        const dayPixel = columnWidth / daysInMonth;
        return Math.round(deltaPx / dayPixel);
      }
      return Math.round(deltaPx / columnWidth);
    };
    const deltaDays = computeDeltaDays(delta);
    const next = addDays(parseISODate(milestone.targetDate), deltaDays);
    setPreviewLabel(formatDayLabel(next));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) {
      return;
    }
    if (event.currentTarget?.releasePointerCapture) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishDrag(event, true);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) {
      return;
    }
    if (event.currentTarget?.releasePointerCapture) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishDrag(event, false);
  };

  useEffect(() => {
    if (!dragging) {
      return;
    }

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }
      event.preventDefault();
      const delta = event.clientX - startXRef.current;
      setDragOffset(delta);
      // update preview
      const computeDeltaDays = (deltaPx: number) => {
        if (scale === "week") {
          const dayPixel = columnWidth / 7;
          return Math.round(deltaPx / dayPixel);
        }
        if (scale === "month") {
          const base = parseISODate(milestone.targetDate);
          const monthStart = startOfMonth(base);
          const daysInMonth = endOfMonth(monthStart).getUTCDate();
          const dayPixel = columnWidth / daysInMonth;
          return Math.round(deltaPx / dayPixel);
        }
        return Math.round(deltaPx / columnWidth);
      };
      const deltaDays = computeDeltaDays(delta);
      const next = addDays(parseISODate(milestone.targetDate), deltaDays);
      setPreviewLabel(formatDayLabel(next));
    };

    const handleWindowPointerUp = (event: globalThis.PointerEvent) => {
      finishDrag(event, true);
    };

    const handleWindowPointerCancel = (event: globalThis.PointerEvent) => {
      finishDrag(event, false);
    };

    window.addEventListener("pointermove", handleWindowPointerMove, { passive: false });
    window.addEventListener("pointerup", handleWindowPointerUp, { passive: false });
    window.addEventListener("pointercancel", handleWindowPointerCancel, { passive: false });

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
    };
  }, [dragging, columnWidth, scale, milestone.id, milestone.targetDate, onMoveMilestone]);

  return (
    <div
      className={`absolute top-0 z-20 flex h-full w-4 -translate-x-1/2 items-start justify-center ${
        dragging ? "cursor-grabbing" : "cursor-ew-resize"
      }`}
      style={{ left: left + dragOffset }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div className="relative flex h-full flex-col items-center group">
        <div className="mt-1 h-2 w-2 rounded-full bg-amber-400 shadow shadow-amber-500/40" />
        <div className="mt-1 w-px flex-1 bg-amber-400/70" />
          <div className="pointer-events-none absolute top-2 left-3 z-30 w-52 rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-[11px] text-slate-200 opacity-0 shadow-lg transition group-hover:opacity-100">
          <div className="text-xs font-semibold text-slate-100">{milestone.title}</div>
          <div className="mt-1 text-[10px] text-slate-400">
            {formatMilestoneDate(milestone.targetDate)}
          </div>
          {milestone.description && (
            <div className="mt-1 text-[11px] text-slate-300">{milestone.description}</div>
          )}
        </div>
          {dragging && previewLabel && (
            <div
              className="absolute -top-8 z-40 rounded-md bg-slate-800/90 px-2 py-0.5 text-xs text-slate-100 shadow"
              style={{ left: dragOffset > 0 ? "100%" : "0%", transform: dragOffset > 0 ? "translateX(-100%)" : undefined }}
            >
              {previewLabel}
            </div>
          )}
      </div>
    </div>
  );
};

export const GanttMilestones = ({
  milestones,
  rangeStart,
  columnWidth,
  scale,
  height,
  headerHeight,
  onMoveMilestone,
}: GanttMilestonesProps) => {
  const getMilestoneOffset = (value: string) => {
    const date = parseISODate(value);
    if (scale === "week") {
      const daysFromRangeStart = diffInDays(rangeStart, date);
      const dayPixel = columnWidth / 7;
      // center inside the day cell
      return daysFromRangeStart * dayPixel + dayPixel / 2;
    }

    if (scale === "month") {
      const monthIndex = diffInMonths(rangeStart, startOfMonth(date));
      const monthStart = startOfMonth(date);
      const daysInMonth = endOfMonth(monthStart).getUTCDate();
      const dayOfMonth = date.getUTCDate();
      const fraction = (dayOfMonth - 1 + 0.5) / daysInMonth; // center of the day
      return monthIndex * columnWidth + fraction * columnWidth;
    }

    const startIndex = diffInDays(rangeStart, date);
    // center inside the day column
    return startIndex * columnWidth + columnWidth / 2;
  };

  return (
    <div
      className="absolute left-0 right-0 pointer-events-none z-20"
      style={{ top: headerHeight, height }}
    >
      <div className="absolute left-0 right-0 h-0.5 bg-slate-800/70" style={{ top: 8 }} />
      {milestones.map((milestone) => (
        <div key={milestone.id} className="pointer-events-auto">
          <MilestoneLine
            milestone={milestone}
            left={getMilestoneOffset(milestone.targetDate)}
            height={height}
            columnWidth={columnWidth}
            scale={scale}
            onMoveMilestone={onMoveMilestone}
          />
        </div>
      ))}
    </div>
  );
};
