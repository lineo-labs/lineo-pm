import { diffInDays, getMonthColumns, getWeekColumns } from "./dateRange";

export type DateScale = "day" | "week" | "month";

const DAYS_TO_WEEK_THRESHOLD = 45;
const DAYS_TO_MONTH_THRESHOLD = 180;
const MIN_DAY_WIDTH = 26;
const MIN_WEEK_WIDTH = 72;

export const getRangeScale = (start: Date, end: Date): DateScale => {
  const range = diffInDays(start, end) + 1;
  if (range > DAYS_TO_MONTH_THRESHOLD) {
    return "month";
  }
  if (range > DAYS_TO_WEEK_THRESHOLD) {
    return "week";
  }
  return "day";
};

export const getAutoScale = (start: Date, end: Date, availableWidth: number) => {
  const days = diffInDays(start, end) + 1;
  const dayWidth = availableWidth / Math.max(days, 1);
  if (dayWidth >= MIN_DAY_WIDTH) {
    return { scale: "day" as const, columnWidth: dayWidth };
  }

  const weeks = getWeekColumns(start, end).length;
  const weekWidth = availableWidth / Math.max(weeks, 1);
  if (weekWidth >= MIN_WEEK_WIDTH) {
    return { scale: "week" as const, columnWidth: weekWidth };
  }

  const months = getMonthColumns(start, end).length;
  const monthWidth = availableWidth / Math.max(months, 1);
  return { scale: "month" as const, columnWidth: monthWidth };
};
