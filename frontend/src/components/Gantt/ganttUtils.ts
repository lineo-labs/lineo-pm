import { parseISODate, businessDaysBetweenInclusive, diffInDaysSigned } from '../../lib/dateRange';

type TaskInput = { id: number; startDate: string; endDate: string; title?: string };

export type ScenarioDeltas = {
  totalDeltaDays: number;
  deltaStart: number;
  deltaEnd: number;
  activityDelta: number;
};

/**
 * Compute deltas between the currently visible Gantt tasks and a scenario set.
 *
 * Returns null when `scenarioTasks` is null or when inputs are empty/invalid.
 */
export function computeScenarioDeltas(
  visibleTasks: TaskInput[],
  scenarioTasks: TaskInput[] | null
): ScenarioDeltas | null {
  if (scenarioTasks === null || visibleTasks.length === 0) return null;
  // use normalized task title as matching key (fallback to id when title missing)
  const scenMap = new Map<string, TaskInput>();
  const baseMap = new Map<string, TaskInput>();
  for (const s of scenarioTasks) {
    if (!s || typeof s.id !== 'number') continue;
    const nameKey = (s as any).title ? String((s as any).title).trim().toLowerCase() : String(s.id);
    scenMap.set(nameKey, { id: s.id, startDate: s.startDate, endDate: s.endDate, title: (s as any).title });
  }
  for (const b of visibleTasks) {
    if (!b || typeof b.id !== 'number') continue;
    const nameKey = (b as any).title ? String((b as any).title).trim().toLowerCase() : String(b.id);
    baseMap.set(nameKey, { id: b.id, startDate: b.startDate, endDate: b.endDate, title: (b as any).title });
  }

  // union of keys so scenario-only tasks are considered
  const keySet = new Set<string>([...baseMap.keys(), ...scenMap.keys()]);

  let totalDeltaDays = 0;

  let origEarliestTs: number | null = null;
  let origLatestTs: number | null = null;
  let scenEarliestTs: number | null = null;
  let scenLatestTs: number | null = null;

  // compute activity count delta
  const baseCount = baseMap.size;
  const scenCount = scenMap.size || baseMap.size; // scenMap may include replacements and new tasks
  const activityDelta = scenCount - baseCount;

  for (const key of keySet) {
    const base = baseMap.get(key) ?? null;
    const s = scenMap.get(key) ?? null;

    // If both missing or any missing dates, skip this id for per-task day deltas but still allow
    // scenario-only tasks to contribute via origDays=0.
    if (s === null && base === null) continue;

    // parse scenario dates (prefer scenario values)
    let scenStart: Date | null = null;
    let scenEnd: Date | null = null;
    if (s && s.startDate && s.endDate) {
      scenStart = parseISODate(s.startDate);
      scenEnd = parseISODate(s.endDate);
    }

    let origStart: Date | null = null;
    let origEnd: Date | null = null;
    if (base && base.startDate && base.endDate) {
      origStart = parseISODate(base.startDate);
      origEnd = parseISODate(base.endDate);
    }

    // If scenario or base dates are invalid, skip this id for delta days
    const validScen = scenStart instanceof Date && scenEnd instanceof Date && !isNaN(scenStart.getTime()) && !isNaN(scenEnd.getTime());
    const validOrig = origStart instanceof Date && origEnd instanceof Date && !isNaN(origStart.getTime()) && !isNaN(origEnd.getTime());

    const origDays = validOrig ? businessDaysBetweenInclusive(origStart!, origEnd!) : 0;
    const scenDays = validScen ? businessDaysBetweenInclusive(scenStart!, scenEnd!) : 0;
    totalDeltaDays += scenDays - origDays;

    if (validOrig) {
      const oStartTs = origStart!.getTime();
      const oEndTs = origEnd!.getTime();
      origEarliestTs = origEarliestTs === null ? oStartTs : Math.min(origEarliestTs, oStartTs);
      origLatestTs = origLatestTs === null ? oEndTs : Math.max(origLatestTs, oEndTs);
    }

    if (validScen) {
      const sStartTs = scenStart!.getTime();
      const sEndTs = scenEnd!.getTime();
      scenEarliestTs = scenEarliestTs === null ? sStartTs : Math.min(scenEarliestTs, sStartTs);
      scenLatestTs = scenLatestTs === null ? sEndTs : Math.max(scenLatestTs, sEndTs);
    }
  }

  if (origEarliestTs === null || origLatestTs === null || scenEarliestTs === null || scenLatestTs === null) {
    return null;
  }

  const origEarliest = new Date(origEarliestTs);
  const origLatest = new Date(origLatestTs);
  const scenEarliest = new Date(scenEarliestTs);
  const scenLatest = new Date(scenLatestTs);

  // positive means scenario is later than baseline
  const deltaStart = diffInDaysSigned(origEarliest, scenEarliest);
  const deltaEnd = diffInDaysSigned(origLatest, scenLatest);

  return {
    totalDeltaDays,
    deltaStart,
    deltaEnd,
    activityDelta,
  };
}

// Example usage:
// const deltas = computeScenarioDeltas(visibleTasks, scenarioTasks);
// if (deltas) console.log(deltas.totalDeltaDays, deltas.deltaStart, deltas.deltaEnd);
