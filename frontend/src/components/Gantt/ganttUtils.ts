import { parseISODate, businessDaysBetweenInclusive, diffInDaysSigned } from '../../lib/dateRange';

type TaskInput = { id: number; startDate: string; endDate: string };

export type ScenarioDeltas = {
  totalDeltaDays: number;
  deltaStart: number;
  deltaEnd: number;
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

  const scenMap = new Map<number, TaskInput>();
  for (const s of scenarioTasks) {
    if (s && typeof s.id === 'number') scenMap.set(s.id, s);
  }

  let totalDeltaDays = 0;

  let origEarliestTs: number | null = null;
  let origLatestTs: number | null = null;
  let scenEarliestTs: number | null = null;
  let scenLatestTs: number | null = null;

  for (const v of visibleTasks) {
    if (!v || !v.startDate || !v.endDate) return null;

    const origStart = parseISODate(v.startDate);
    const origEnd = parseISODate(v.endDate);
    if (!origStart || !origEnd || isNaN(origStart.getTime()) || isNaN(origEnd.getTime())) return null;

    const s = scenMap.get(v.id) ?? v;
    if (!s || !s.startDate || !s.endDate) return null;

    const scenStart = parseISODate(s.startDate);
    const scenEnd = parseISODate(s.endDate);
    if (!scenStart || !scenEnd || isNaN(scenStart.getTime()) || isNaN(scenEnd.getTime())) return null;

    const origDays = businessDaysBetweenInclusive(origStart, origEnd);
    const scenDays = businessDaysBetweenInclusive(scenStart, scenEnd);
    totalDeltaDays += scenDays - origDays;

    const oStartTs = origStart.getTime();
    const oEndTs = origEnd.getTime();
    const sStartTs = scenStart.getTime();
    const sEndTs = scenEnd.getTime();

    origEarliestTs = origEarliestTs === null ? oStartTs : Math.min(origEarliestTs, oStartTs);
    origLatestTs = origLatestTs === null ? oEndTs : Math.max(origLatestTs, oEndTs);
    scenEarliestTs = scenEarliestTs === null ? sStartTs : Math.min(scenEarliestTs, sStartTs);
    scenLatestTs = scenLatestTs === null ? sEndTs : Math.max(scenLatestTs, sEndTs);
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
  };
}

// Example usage:
// const deltas = computeScenarioDeltas(visibleTasks, scenarioTasks);
// if (deltas) console.log(deltas.totalDeltaDays, deltas.deltaStart, deltas.deltaEnd);
