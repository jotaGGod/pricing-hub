import type { Period } from "../services/finance";

const storageKey = "pricing-hub:finance-period:v1";

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentMonthPeriod(): Period {
  const now = new Date();
  return {
    start: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  };
}

const yearMonthPattern = /^\d{4}-\d{2}$/;

// The period picker only lets the user choose a month/year (native <input type="month">
// gives a "YYYY-MM" value), but Period.start/end stay full ISO dates so the backend's
// day-granularity range query and validation don't need to change.
export function monthStartISODate(yearMonth: string): string {
  if (!yearMonthPattern.test(yearMonth)) {
    return yearMonth;
  }
  return `${yearMonth}-01`;
}

export function monthEndISODate(yearMonth: string): string {
  if (!yearMonthPattern.test(yearMonth)) {
    return yearMonth;
  }
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
}

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

// The period is shared between the dashboard and the transactions screen, so it
// lives in localStorage instead of component state — switching sub-tabs keeps
// the user looking at the same window.
export function readFinancePeriod(): Period {
  if (typeof window === "undefined") {
    return currentMonthPeriod();
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return currentMonthPeriod();
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      isoDatePattern.test((parsed as Period).start ?? "") &&
      isoDatePattern.test((parsed as Period).end ?? "")
    ) {
      return parsed as Period;
    }
  } catch {
    // Corrupted or blocked storage just falls back to the current month.
  }
  return currentMonthPeriod();
}

export function writeFinancePeriod(period: Period) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(period));
  } catch {
    // Losing the persisted period is non-critical.
  }
}

export function formatPeriodLabel(period: Period): string {
  return `${formatDateLabel(period.start)} até ${formatDateLabel(period.end)}`;
}

export function formatDateLabel(value: string): string {
  if (!isoDatePattern.test(value)) {
    return value;
  }
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
