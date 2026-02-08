import type { Task } from "./types";

const MS_PER_DAY = 86_400_000;

export const parseISODate = (value: string) => new Date(`${value}T00:00:00Z`);

export const toISODate = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (date: Date, amount: number) => new Date(date.getTime() + amount * MS_PER_DAY);

export const addWeeks = (date: Date, amount: number) => addDays(date, amount * 7);

export const diffInDays = (start: Date, end: Date) =>
  Math.max(0, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY));

export const startOfWeek = (date: Date) => {
  const utcDay = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  return addDays(date, 1 - utcDay);
};

export const endOfWeek = (date: Date) => addDays(startOfWeek(date), 6);

export const formatDayLabel = (date: Date) =>
  date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });

export const formatWeekLabel = (date: Date) => {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  return `${formatDayLabel(start)} - ${formatDayLabel(end)}`;
};

export const getTaskRange = (tasks: Task[]) => {
  if (tasks.length === 0) {
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const end = addDays(start, 14);
    return { start, end };
  }

  const dates = tasks.flatMap((task) => [parseISODate(task.startDate), parseISODate(task.endDate)]);
  const start = new Date(Math.min(...dates.map((date) => date.getTime())));
  const end = new Date(Math.max(...dates.map((date) => date.getTime())));
  return { start, end };
};

export const getDateColumns = (start: Date, end: Date) => {
  const days = diffInDays(start, end) + 1;
  return Array.from({ length: days }, (_, index) => addDays(start, index));
};

export const getWeekColumns = (start: Date, end: Date) => {
  const alignedStart = startOfWeek(start);
  const alignedEnd = endOfWeek(end);
  const weeks = Math.ceil((diffInDays(alignedStart, alignedEnd) + 1) / 7);
  return Array.from({ length: weeks }, (_, index) => addWeeks(alignedStart, index));
};
