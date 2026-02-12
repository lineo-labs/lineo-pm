import { useEffect, useRef, useState, type PointerEvent } from "react";

import type { Task } from "../../lib/types";
import type { DateScale } from "../../lib/dateScale";
import {
  addMonths,
  diffInDaysSigned,
  parseISODate,
  endOfMonth,
  startOfMonth,
  addDays,
  formatDayLabel,
} from "../../lib/dateRange";
import { GanttBar } from "./GanttBar";

interface GanttRowProps {
  task: Task;
  rowIndex: number;
  rowHeight: number;
  position: {
    offset: number;
    width: number;
  };
  columnWidth: number;
  scale: DateScale;
  onAdjustTaskDates: (taskId: number, mode: "start" | "end", deltaDays: number) => void;
  onMoveTaskDates: (taskId: number, deltaDays: number) => void;
  onEditTask: (task: Task) => void;
  onRowDragStart: (taskId: number, event: PointerEvent<Element>) => void;
  isRowDragging: boolean;
}

export const GanttRow = ({
  task,
  rowIndex,
  rowHeight,
  position,
  columnWidth,
  scale,
  onAdjustTaskDates,
  onMoveTaskDates,
  onEditTask,
  onRowDragStart,
  isRowDragging,
}: GanttRowProps) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [dragWidthDelta, setDragWidthDelta] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const modeRef = useRef<"start" | "end" | "move" | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const applyDelta = (delta: number) => {
    if (modeRef.current === "start") {
      setDragOffset(delta);
      setDragWidthDelta(-delta);
    } else if (modeRef.current === "end") {
      setDragOffset(0);
      setDragWidthDelta(delta);
    } else if (modeRef.current === "move") {
      setDragOffset(delta);
      setDragWidthDelta(0);
    }
  };

  const [previewLabel, setPreviewLabel] = useState<string | null>(null);

  const computeDeltaDaysFromPixels = (delta: number, edge: "start" | "end" | "move") => {
    if (scale === "week") {
      const dayPixel = columnWidth / 7;
      return Math.round(delta / dayPixel);
    }

    if (scale === "month") {
      // use the month of the affected edge to compute days-per-pixel
      const base = parseISODate(edge === "end" ? task.endDate : task.startDate);
      const monthStart = startOfMonth(base);
      const daysInMonth = endOfMonth(monthStart).getUTCDate();
      const dayPixel = columnWidth / daysInMonth;
      return Math.round(delta / dayPixel);
    }

    // day scale
    return Math.round(delta / columnWidth);
  };

  const updatePreview = (delta: number) => {
    if (!modeRef.current) {
      setPreviewLabel(null);
      return;
    }
    const edge = modeRef.current === "move" ? "move" : modeRef.current;
    const deltaDays = computeDeltaDaysFromPixels(delta, edge as any);
    if (modeRef.current === "move") {
      const nextStart = addDays(parseISODate(task.startDate), deltaDays);
      setPreviewLabel(formatDayLabel(nextStart));
      return;
    }
    if (modeRef.current === "start") {
      const candidate = addDays(parseISODate(task.startDate), deltaDays);
      setPreviewLabel(formatDayLabel(candidate));
      return;
    }
    if (modeRef.current === "end") {
      const candidate = addDays(parseISODate(task.endDate), deltaDays);
      setPreviewLabel(formatDayLabel(candidate));
      return;
    }
    setPreviewLabel(null);
  };

  const finishDrag = (event: { clientX: number; pointerId: number }, shouldCommit: boolean) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }
    const delta = event.clientX - startXRef.current;
    let deltaDays = computeDeltaDaysFromPixels(delta, modeRef.current === "move" ? "move" : (modeRef.current ?? "move"));
    const mode = modeRef.current;
    setDragOffset(0);
    setDragWidthDelta(0);
    setDragging(false);
    modeRef.current = null;
    pointerIdRef.current = null;
    setPreviewLabel(null);
    if (shouldCommit && deltaDays !== 0 && mode) {
      if (mode === "move") {
        onMoveTaskDates(task.id, deltaDays);
      } else {
        onAdjustTaskDates(task.id, mode, deltaDays);
      }
    }
  };

  const handlePointerDown = (mode: "start" | "end") => (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    modeRef.current = mode;
    startXRef.current = event.clientX;
    pointerIdRef.current = event.pointerId;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMovePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    modeRef.current = "move";
    startXRef.current = event.clientX;
    pointerIdRef.current = event.pointerId;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleRowPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    onRowDragStart(task.id, event);
  };

  const handlePointerMoveLocal = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || pointerIdRef.current !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const delta = event.clientX - startXRef.current;
    applyDelta(delta);
    updatePreview(delta);
  };

  const handlePointerUpLocal = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) {
      return;
    }
    if (event.currentTarget?.releasePointerCapture) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishDrag(event, true);
  };

  const handlePointerCancelLocal = (event: PointerEvent<HTMLDivElement>) => {
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

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) {
        return;
      }
      event.preventDefault();
      const delta = event.clientX - startXRef.current;
      applyDelta(delta);
      updatePreview(delta);
    };

    const handlePointerUp = (event: globalThis.PointerEvent) => {
      finishDrag(event, true);
    };

    const handlePointerCancel = (event: globalThis.PointerEvent) => {
      finishDrag(event, false);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp, { passive: false });
    window.addEventListener("pointercancel", handlePointerCancel, { passive: false });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [dragging, columnWidth, scale, onAdjustTaskDates, onMoveTaskDates, task.id]);

  const minWidth = columnWidth;
  let visualOffset = position.offset + dragOffset;
  let visualWidth = position.width + dragWidthDelta;
  if (visualWidth < minWidth) {
    visualWidth = minWidth;
    if (modeRef.current === "start") {
      visualOffset = position.offset + (position.width - minWidth);
    }
  }

  const previewLeft = (() => {
    const mode = modeRef.current;
    if (mode === "end") return visualOffset + visualWidth;
    if (mode === "move") return visualOffset + visualWidth / 2;
    return visualOffset;
  })();

  const previewTransform = (() => {
    const mode = modeRef.current;
    if (mode === "end") return "translateX(-100%)";
    if (mode === "move") return "translateX(-50%)";
    return undefined;
  })();

  return (
    <div className="relative" style={{ height: rowHeight }} onPointerDown={handleRowPointerDown}>
      <GanttBar
        title={task.title}
        offset={visualOffset}
        width={visualWidth}
        isDragging={dragging}
        isRowDragging={isRowDragging}
        onBarPointerDown={handleMovePointerDown}
        onPointerMove={handlePointerMoveLocal}
        onPointerUp={handlePointerUpLocal}
        onPointerCancel={handlePointerCancelLocal}
        onResizeStartPointerDown={handlePointerDown("start")}
        onResizeEndPointerDown={handlePointerDown("end")}
        onEdit={() => onEditTask(task)}
      />
      {dragging && previewLabel && (
        <div
          className="absolute -top-6 rounded-md bg-slate-800/90 px-2 py-0.5 text-xs text-slate-100 shadow"
          style={{ left: previewLeft, transform: previewTransform as any }}
        >
          {previewLabel}
        </div>
      )}
    </div>
  );
};
