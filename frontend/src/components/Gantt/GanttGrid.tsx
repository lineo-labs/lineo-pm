interface GanttGridProps {
  columns: number;
  columnWidth: number;
  rowCount: number;
  rowHeight: number;
  headerHeight: number;
}

export const GanttGrid = ({
  columns,
  columnWidth,
  rowCount,
  rowHeight,
  headerHeight,
}: GanttGridProps) => {
  return (
    <div
      className="absolute left-0 right-0"
      style={{ top: headerHeight, height: rowCount * rowHeight }}
    >
      <div
        className="grid h-full"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${columnWidth}px)`,
        }}
      >
        {Array.from({ length: columns }).map((_, columnIndex) => (
          <div
            key={columnIndex}
            className="border-r border-slate-900/70"
          />
        ))}
      </div>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${rowHeight - 1}px, rgba(15, 23, 42, 0.6) ${rowHeight}px)`,
        }}
      />
    </div>
  );
};
