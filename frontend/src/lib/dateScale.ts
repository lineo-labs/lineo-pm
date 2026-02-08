import { diffInDays } from "./dateRange";

export type DateScale = "day" | "week";

const DAYS_THRESHOLD = 45;

export const getDateScale = (start: Date, end: Date): DateScale => {
  const range = diffInDays(start, end) + 1;
  return range > DAYS_THRESHOLD ? "week" : "day";
};
