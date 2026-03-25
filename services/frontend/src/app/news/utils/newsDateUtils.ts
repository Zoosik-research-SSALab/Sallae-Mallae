import type { NewsDateRange, NewsPeriodOption } from "../types/news";

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function getTodayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function cloneDate(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function addDays(date: Date, days: number) {
  const next = cloneDate(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function formatNewsDateInputValue(date: Date | null) {
  if (!date) {
    return null;
  }

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function parseNewsDateInputValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function createEmptyNewsDateRange(): NewsDateRange {
  return {
    preset: null,
    startDate: null,
    endDate: null,
  };
}

export function createTodayNewsDateRange(): NewsDateRange {
  const today = getTodayDate();
  const formattedToday = formatNewsDateInputValue(today);

  return {
    preset: null,
    startDate: formattedToday,
    endDate: formattedToday,
  };
}

export function createPresetNewsDateRange(preset: NewsPeriodOption): NewsDateRange {
  const endDate = getTodayDate();
  const startDate = addDays(endDate, preset === "WEEK" ? -6 : preset === "MONTH" ? -29 : -89);

  return {
    preset,
    startDate: formatNewsDateInputValue(startDate),
    endDate: formatNewsDateInputValue(endDate),
  };
}
