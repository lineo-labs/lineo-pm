import React, { useMemo, useState } from "react";

import type { Task } from "../../lib/types";

interface Position {
  id: number;
  offset: number;
  width: number;
}

interface Props {
  tasks: Task[];
  positions: Position[];
  rowHeight: number;
  headerHeight: number;
  visible?: boolean;
}

export const GanttRelations = ({ tasks, positions, rowHeight, visible = true }: Props) => {
  if (!visible) return null;
  const height = Math.max(tasks.length, 1) * rowHeight;

  const posMap = useMemo(() => {
    const m = new Map<number, Position>();
    positions.forEach((p) => m.set(p.id, p));
    return m;
  }, [positions]);

  const indexMap = useMemo(() => {
    const m = new Map<number, number>();
    positions.forEach((p, i) => m.set(p.id, i));
    return m;
  }, [positions]);

  // edges computed (not rendered) and prepare adjacency + directional maps + lock positions for connected components
  const { edges, compIdByNode, lockKeys, preds, succs } = useMemo(() => {
    const adj = new Map<number, Set<number>>();
    const preds = new Map<number, Set<number>>();
    const succs = new Map<number, Set<number>>();
    const ensure = (id: number) => {
      if (!adj.has(id)) adj.set(id, new Set());
      if (!preds.has(id)) preds.set(id, new Set());
      if (!succs.has(id)) succs.set(id, new Set());
    };

    const outEdges: Array<{ src: number; tgt: number; srcX: number; srcY: number; tgtX: number; tgtY: number }> = [];
    const lockSet = new Set<string>();

    for (const t of tasks) {
      ensure(t.id);
      if (Array.isArray(t.dependencies) && t.dependencies.length > 0) {
        // mark locks for relation endpoints: end of source, start of target
        for (const d of t.dependencies as number[]) {
          ensure(d);
          adj.get(t.id)!.add(d);
          adj.get(d)!.add(t.id);
          preds.get(t.id)!.add(d);
          succs.get(d)!.add(t.id);

          const tgtPos = posMap.get(t.id);
          const srcPos = posMap.get(d);
          const tgtIndex = indexMap.get(t.id);
          const srcIndex = indexMap.get(d);
          // only add locks/edges if both tasks are currently visible (have positions)
          if (tgtPos && srcPos && tgtIndex !== undefined && srcIndex !== undefined) {
            // lock at src end and tgt start
            lockSet.add(`${d}:end`);
            lockSet.add(`${t.id}:start`);
            const tgtY = tgtIndex * rowHeight + rowHeight / 2;
            const srcY = srcIndex * rowHeight + rowHeight / 2;
            const tgtX = tgtPos.offset;
            const srcX = srcPos.offset + srcPos.width;
            outEdges.push({ src: d, tgt: t.id, srcX, srcY, tgtX, tgtY });
          }
        }
      }
    }

    // also ensure standalone nodes that are referenced but have no explicit dependencies
    for (const id of posMap.keys()) ensure(id);

    const compIdByNode = new Map<number, number>();
    let compCounter = 0;
    for (const node of adj.keys()) {
      if (compIdByNode.has(node)) continue;
      const stack = [node];
      while (stack.length) {
        const n = stack.pop()!;
        if (compIdByNode.has(n)) continue;
        compIdByNode.set(n, compCounter);
        for (const nb of adj.get(n) ?? []) if (!compIdByNode.has(nb)) stack.push(nb);
      }
      compCounter += 1;
    }

    return { edges: outEdges, compIdByNode, lockKeys: lockSet, preds, succs };
  }, [tasks, posMap, indexMap, rowHeight]);

  // hoveredLockKeys: when hovering a specific lock we compute a directional set of lock keys to highlight
  const [hoveredLockKeys, setHoveredLockKeys] = useState<Set<string> | null>(null);

  const lockSize = 12; // approx px
  const lockHalf = lockSize / 2;

  return (
    <div
      aria-hidden={false}
      className="absolute left-0 right-0 top-0"
      // allow pointer events to pass through by default so underlying rows keep drag handlers,
      // but enable pointer events on the lock groups themselves (see below)
      style={{ height, zIndex: 30, pointerEvents: "none" }}
    >
      <svg width="100%" height={height}>
        {Array.from(lockKeys).map((k) => {
          const [idStr, posLabel] = k.split(":");
          const taskId = Number(idStr);
          const pos = posMap.get(taskId);
          const idx = indexMap.get(taskId);
          if (!pos || idx === undefined) return null;
          // position the lock at the task row center (ends of the task bar)
          const y = idx * rowHeight + rowHeight / 2;

          const compId = compIdByNode.get(taskId) ?? -1;
          const isHighlighted = hoveredLockKeys ? hoveredLockKeys.has(k) : false;
          // brighter, more saturated highlight colors for better visibility
          const fill = isHighlighted ? "#60A5FA" : "#E5E7EB"; // blue-400 when highlighted
          const stroke = isHighlighted ? "#0369A1" : "#4B5563"; // darker blue stroke when highlighted

          const x = posLabel === "start" ? pos.offset : pos.offset + pos.width;
          const key = `lock-${taskId}-${posLabel}`;

          return (
            <g
              key={key}
              transform={`translate(${x}, ${y})`}
              onMouseEnter={() => {
                // compute directional highlight set based on which side of the task the lock is
                const nodePreds = preds.get(taskId) ?? new Set<number>();
                const nodeSuccs = succs.get(taskId) ?? new Set<number>();

                const collectAncestors = (start: number) => {
                  const visited = new Set<number>();
                  const stack: number[] = [];
                  for (const p of preds.get(start) ?? []) stack.push(p);
                  while (stack.length) {
                    const n = stack.pop()!;
                    if (visited.has(n)) continue;
                    visited.add(n);
                    for (const p of preds.get(n) ?? []) if (!visited.has(p)) stack.push(p);
                  }
                  return visited;
                };

                const collectDescendants = (start: number) => {
                  const visited = new Set<number>();
                  const stack: number[] = [];
                  for (const s of succs.get(start) ?? []) stack.push(s);
                  while (stack.length) {
                    const n = stack.pop()!;
                    if (visited.has(n)) continue;
                    visited.add(n);
                    for (const s of succs.get(n) ?? []) if (!visited.has(s)) stack.push(s);
                  }
                  return visited;
                };

                // If hovering the start lock, always show only upstream tasks (previous tasks)
                if (posLabel === "start") {
                  const anc = collectAncestors(taskId);
                  const set = new Set<string>();
                  for (const a of anc) set.add(`${a}:end`);
                  set.add(`${taskId}:start`);
                  setHoveredLockKeys(set);
                  return;
                }

                // If hovering the end lock, show only downstream tasks (subsequent tasks)
                if (posLabel === "end") {
                  const desc = collectDescendants(taskId);
                  const set = new Set<string>();
                  for (const d of desc) set.add(`${d}:start`);
                  set.add(`${taskId}:end`);
                  setHoveredLockKeys(set);
                  return;
                }

                // fallback: highlight entire connected component
                const set = new Set<string>();
                for (const [nid, cid] of compIdByNode.entries()) if (cid === compId) {
                  set.add(`${nid}:start`);
                  set.add(`${nid}:end`);
                }
                setHoveredLockKeys(set);
              }}
              onMouseLeave={() => setHoveredLockKeys(null)}
              role="button"
              aria-label={`${posLabel} lock for task ${taskId}`}
              aria-hidden={false}
              style={{ cursor: "pointer", pointerEvents: "all" }}
            >
                {/* invisible larger hit area to make hovering easier */}
                <rect x={-10} y={-10} width={20} height={20} fill="transparent" style={{ pointerEvents: "all" }} />
                {isHighlighted && (
                  <rect
                    x={-8}
                    y={-6}
                    width={16}
                    height={12}
                    rx={3}
                    fill="none"
                    stroke="#FBBF24"
                    strokeWidth={2}
                    opacity={0.95}
                  />
                )}
                <rect x={-6} y={-4} width={12} height={8} rx={2} ry={2} fill={fill} stroke={stroke} strokeWidth={1} />
              <path d={`M -4 -3 A 4 4 0 0 1 4 -3`} fill="none" stroke={stroke} strokeWidth={1.25} />
              <rect x={-1} y={-1} width={2} height={2} fill={stroke} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default GanttRelations;
