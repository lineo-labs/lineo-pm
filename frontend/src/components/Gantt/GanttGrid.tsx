import type { DateScale } from "../../lib/dateScale";
import { toISODate } from "../../lib/dateRange";

interface GanttGridProps {
  columns: number;
  columnWidth: number;
  rowCount: number;
  rowHeight: number;
  headerHeight: number;
  scale: DateScale;
  columnDates: Date[];
}

export const GanttGrid = ({
  columns,
  columnWidth,
  rowCount,
  rowHeight,
  headerHeight,
  scale,
  columnDates,
}: GanttGridProps) => {
  const gridHeight = rowCount * rowHeight;
  const isDayScale = scale === "day" && columnDates.length === columns;
  const todayUtc = new Date();
  const todayKey = toISODate(
    new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate()))
  );
  const todayIndex = isDayScale
    ? columnDates.findIndex((date) => toISODate(date) === todayKey)
    : -1;

  return (
    <div
      className="absolute left-0 right-0"
      style={{ top: headerHeight, height: gridHeight + 1 }}
    >
      <div
        className="grid h-full border-b border-slate-900/70"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${columnWidth}px)`,
        }}
      >
        {Array.from({ length: columns }).map((_, columnIndex) => {
          const isWeekend =
            isDayScale &&
            [0, 6].includes(columnDates[columnIndex]?.getUTCDay?.() ?? -1);
          return (
            <div
              key={columnIndex}
              className={`border-r border-slate-900/70 ${isWeekend ? "bg-slate-900/40" : ""}`}
            />
          );
        })}
      </div>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${rowHeight - 1}px, rgba(15, 23, 42, 0.6) ${rowHeight}px)`,
        }}
      />
      {todayIndex >= 0 && (
        <div
          className="absolute top-0 bottom-0 w-px bg-sky-400/70"
          style={{ left: todayIndex * columnWidth + columnWidth / 2 }}
        />
      )}
    </div>
  );
};
