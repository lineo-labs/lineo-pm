import type { PointerEvent } from "react";

interface GanttBarProps {
  title: string;
  offset: number;
  width: number;
  isDragging: boolean;
  isRowDragging: boolean;
  onBarPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onResizeStartPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onResizeEndPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
}

export const GanttBar = ({
  title,
  offset,
  width,
  isDragging,
  isRowDragging,
  onBarPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onResizeStartPointerDown,
  onResizeEndPointerDown,
}: GanttBarProps) => {
  return (
    <div
      className={`absolute top-2 flex h-7 touch-none select-none items-center justify-between gap-2 rounded-full bg-indigo-500/70 px-2 text-xs font-medium text-white shadow-sm shadow-indigo-500/30 ${
        isDragging ? "cursor-ew-resize" : isRowDragging ? "cursor-grabbing" : "cursor-grab"
      } ${isRowDragging ? "opacity-80" : ""}`}
      style={{
        left: offset,
        width,
        transition: isDragging ? "none" : "left 150ms ease",
      }}
      onPointerDown={onBarPointerDown}
    >
      <div
        className="h-4 w-2 cursor-ew-resize rounded-full bg-white/60"
        onPointerDown={(event) => {
          event.stopPropagation();
          onResizeStartPointerDown(event);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      />
      <div className="truncate leading-7">{title}</div>
      {/* Edit button removed from draggable bar */}
      <div
        className="h-4 w-2 cursor-ew-resize rounded-full bg-white/60"
        onPointerDown={(event) => {
          event.stopPropagation();
          onResizeEndPointerDown(event);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      />
    </div>
  );
};
