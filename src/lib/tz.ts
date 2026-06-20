import {
  endOfMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * The app's fixed timezone. All "what day is it" logic is computed in IST,
 * independent of the server's host timezone (Vercel runs in UTC), so day
 * labels and streak/week/month boundaries are always correct for India.
 */
export const APP_TZ = "Asia/Kolkata";

/** Format a UTC instant in IST. */
export function formatIST(date: Date | string, fmt: string): string {
  return formatInTimeZone(typeof date === "string" ? new Date(date) : date, APP_TZ, fmt);
}

/** IST calendar-day key (yyyy-MM-dd) for a given instant — used to dedupe days. */
export function istDayKey(date: Date): string {
  return formatInTimeZone(date, APP_TZ, "yyyy-MM-dd");
}

/** Start of today in IST, as a UTC instant (for Prisma range queries). */
export function istStartOfToday(now: Date = new Date()): Date {
  return fromZonedTime(startOfDay(toZonedTime(now, APP_TZ)), APP_TZ);
}

/** Start of this week (Mon) in IST, as a UTC instant. */
export function istStartOfWeek(now: Date = new Date()): Date {
  return fromZonedTime(
    startOfWeek(toZonedTime(now, APP_TZ), { weekStartsOn: 1 }),
    APP_TZ,
  );
}

/** Start of this month in IST, as a UTC instant. */
export function istStartOfMonth(now: Date = new Date()): Date {
  return fromZonedTime(startOfMonth(toZonedTime(now, APP_TZ)), APP_TZ);
}

/** End of this month in IST, as a UTC instant. */
export function istEndOfMonth(now: Date = new Date()): Date {
  return fromZonedTime(endOfMonth(toZonedTime(now, APP_TZ)), APP_TZ);
}

/** Whole-day difference between two instants, measured in IST calendar days. */
export function istDayDiff(later: Date, earlier: Date): number {
  const a = istDayKey(later);
  const b = istDayKey(earlier);
  return Math.round(
    (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000,
  );
}
