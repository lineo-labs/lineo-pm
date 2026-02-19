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
  variant?: "base" | "scenario";
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
  variant = "scenario",
}: GanttBarProps) => {
  const interactive = variant === "scenario";

  return (
    <div
      className={
            variant === "base"
              ? `relative flex h-2 touch-none select-none items-center gap-2 rounded-full bg-emerald-600 px-2 text-xs font-medium text-emerald-200 pointer-events-none`
          : `absolute top-2 flex h-7 touch-none select-none items-center justify-between gap-2 rounded-full bg-indigo-500/70 px-2 text-xs font-medium text-white shadow-sm shadow-indigo-500/30 ${
              isDragging ? "cursor-ew-resize" : isRowDragging ? "cursor-grabbing" : "cursor-grab"
            } ${isRowDragging ? "opacity-80" : ""}`
      }
      style={
        variant === "base"
          ? {
              marginLeft: offset,
              width,
              transition: isDragging ? "none" : "margin-left 150ms ease",
            }
          : {
              left: offset,
              width,
              transition: isDragging ? "none" : "left 150ms ease",
              zIndex: 20,
            }
      }
      onPointerDown={interactive ? onBarPointerDown : undefined}
    >
      {interactive ? (
        <>
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
        </>
      ) : (
        // base variant: render no title (visual-only thin bar)
        <div className="w-full" />
      )}
    </div>
  );
};
