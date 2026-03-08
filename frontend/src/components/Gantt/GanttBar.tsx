import type { PointerEvent } from "react";

interface GanttBarProps {
  title: string;
  offset: number;
  width: number;
  actualOffset?: number | null;
  actualWidth?: number | null;
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
  actualOffset,
  actualWidth,
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
          ? `absolute top-0 h-7 rounded-full border-2 border-dashed border-amber-400/60 bg-amber-500/10 pointer-events-none`
          : `absolute top-2 flex h-7 touch-none select-none items-center justify-between gap-2 rounded-full bg-indigo-600 px-2 text-xs font-medium text-white shadow-sm shadow-indigo-500/30 ${
              isDragging ? "cursor-ew-resize" : isRowDragging ? "cursor-grabbing" : "cursor-grab"
            } ${isRowDragging ? "opacity-80" : ""}`
      }
      style={
        variant === "base"
          ? {
              left: offset,
              width,
              transition: "left 150ms ease",
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
            {/* Actuals: thin line overlay */}
            {typeof actualOffset === "number" && actualOffset !== null && (
              <div
                aria-hidden
                className="absolute top-1 left-0 h-1"
                style={
                  actualWidth && typeof actualWidth === "number"
                    ? {
                        left: actualOffset,
                        width: actualWidth,
                        background: "linear-gradient(90deg, rgba(34,197,94,0.95) 0%, rgba(34,197,94,0.95) 100%)",
                        zIndex: 5,
                      }
                    : {
                        left: actualOffset,
                        width: Math.max(2, 60),
                        background: "linear-gradient(90deg, rgba(34,197,94,0.95) 0%, rgba(34,197,94,0.0) 100%)",
                        zIndex: 5,
                      }
                }
              />
            )}
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
        // base variant: ghost placeholder — no interactive content
        null
      )}
    </div>
  );
};
