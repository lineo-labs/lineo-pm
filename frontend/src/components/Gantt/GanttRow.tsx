import { useEffect, useRef, useState, type PointerEvent } from "react";

import type { Task } from "../../lib/types";
import type { DateScale } from "../../lib/dateScale";
import { addMonths, diffInDaysSigned, parseISODate } from "../../lib/dateRange";
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
  onEditTask: (task: Task) => void;
}

export const GanttRow = ({
  task,
  rowIndex,
  rowHeight,
  position,
  columnWidth,
  scale,
  onAdjustTaskDates,
  onEditTask,
}: GanttRowProps) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [dragWidthDelta, setDragWidthDelta] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const modeRef = useRef<"start" | "end" | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const applyDelta = (delta: number) => {
    if (modeRef.current === "start") {
      setDragOffset(delta);
      setDragWidthDelta(-delta);
    } else if (modeRef.current === "end") {
      setDragOffset(0);
      setDragWidthDelta(delta);
    }
  };

  const finishDrag = (event: { clientX: number; pointerId: number }, shouldCommit: boolean) => {
    if (pointerIdRef.current !== event.pointerId) {
      return;
    }
    const delta = event.clientX - startXRef.current;
    const steps = Math.round(delta / columnWidth);
    let deltaDays = steps * (scale === "week" ? 7 : 1);
    if (scale === "month" && steps !== 0) {
      const baseDate = parseISODate(modeRef.current === "start" ? task.startDate : task.endDate);
      const nextDate = addMonths(baseDate, steps);
      deltaDays = diffInDaysSigned(baseDate, nextDate);
    }
    const mode = modeRef.current;
    setDragOffset(0);
    setDragWidthDelta(0);
    setDragging(false);
    modeRef.current = null;
    pointerIdRef.current = null;
    if (shouldCommit && deltaDays !== 0 && mode) {
      onAdjustTaskDates(task.id, mode, deltaDays);
    }
  };

  const handlePointerDown = (mode: "start" | "end") => (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    modeRef.current = mode;
    startXRef.current = event.clientX;
    pointerIdRef.current = event.pointerId;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMoveLocal = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || pointerIdRef.current !== event.pointerId) {
      return;
    }
    event.preventDefault();
    applyDelta(event.clientX - startXRef.current);
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
      applyDelta(event.clientX - startXRef.current);
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
  }, [dragging, columnWidth, scale, onAdjustTaskDates, task.id]);

  const minWidth = columnWidth;
  let visualOffset = position.offset + dragOffset;
  let visualWidth = position.width + dragWidthDelta;
  if (visualWidth < minWidth) {
    visualWidth = minWidth;
    if (modeRef.current === "start") {
      visualOffset = position.offset + (position.width - minWidth);
    }
  }

  return (
    <div className="relative" style={{ height: rowHeight }}>
      <GanttBar
        title={task.title}
        offset={visualOffset}
        width={visualWidth}
        isDragging={dragging}
        onPointerMove={handlePointerMoveLocal}
        onPointerUp={handlePointerUpLocal}
        onPointerCancel={handlePointerCancelLocal}
        onResizeStartPointerDown={handlePointerDown("start")}
        onResizeEndPointerDown={handlePointerDown("end")}
        onEdit={() => onEditTask(task)}
      />
    </div>
  );
};
