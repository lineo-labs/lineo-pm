interface GanttHeaderProps {
  labels: string[];
  columnWidth: number;
  height: number;
  hideDone?: boolean;
  onToggleHideDone?: () => void;
}

export const GanttHeader = ({ labels, columnWidth, height, hideDone = false, onToggleHideDone }: GanttHeaderProps) => {
  return (
    <div
      className="sticky top-0 z-10 grid box-border border-b border-slate-900 bg-slate-950"
      style={{
        gridTemplateColumns: `repeat(${labels.length}, ${columnWidth}px)`,
        height,
      }}
    >
      {labels.map((label, index) => (
        <div
          key={`${label}-${index}`}
          className="flex items-center border-r border-slate-900 px-2 text-xs text-slate-500"
        >
          {label}
        </div>
      ))}
          {/* Toggle moved to layout controls (left of Show relations) */}
    </div>
  );
};
