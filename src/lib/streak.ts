import { differenceInCalendarDays, startOfDay } from "date-fns";

/**
 * Streak that tolerates rest days based on a weekly goal.
 *
 * maxGap = ceil(7 / weeklyGoal): with a goal of 5 you may rest up to 2 days
 * between workouts; with 3, up to ~3 days. The streak is the number of calendar
 * days from the earliest "on-pace" workout through today, as long as the most
 * recent workout is within maxGap days of today (otherwise the streak is broken).
 */
export function computeStreak(dates: Date[], weeklyGoal: number): number {
  if (dates.length === 0) return 0;
  const maxGap = Math.max(1, Math.ceil(7 / Math.max(1, weeklyGoal)));
  const today = startOfDay(new Date());

  // Unique workout days, newest first.
  const days = Array.from(
    new Set(dates.map((d) => startOfDay(d).getTime())),
  )
    .sort((a, b) => b - a)
    .map((t) => new Date(t));

  if (differenceInCalendarDays(today, days[0]) > maxGap) return 0;

  let earliest = days[0];
  for (let i = 1; i < days.length; i++) {
    if (differenceInCalendarDays(earliest, days[i]) > maxGap) break;
    earliest = days[i];
  }

  return differenceInCalendarDays(today, earliest) + 1;
}
