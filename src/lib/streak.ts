import { istDayKey } from "./tz";

/** Convert an IST day key (yyyy-MM-dd) to an integer day number. */
const dayNum = (key: string) => Math.round(Date.parse(`${key}T00:00:00Z`) / 86_400_000);

/** Number of distinct IST calendar days within [from, to] (instants compared directly). */
export function distinctDayCount(dates: Date[], from: Date, to?: Date): number {
  const set = new Set<string>();
  for (const d of dates) {
    if (d >= from && (!to || d <= to)) set.add(istDayKey(d));
  }
  return set.size;
}

/**
 * Streak that tolerates rest days based on a weekly goal, computed in IST.
 *
 * maxGap = ceil(7 / weeklyGoal): with a goal of 5 you may rest up to 2 days
 * between workouts. The streak is the number of IST calendar days from the
 * earliest "on-pace" workout through today, as long as the most recent workout
 * is within maxGap days of today.
 */
export function computeStreak(dates: Date[], weeklyGoal: number): number {
  if (dates.length === 0) return 0;
  const maxGap = Math.max(1, Math.ceil(7 / Math.max(1, weeklyGoal)));

  const today = dayNum(istDayKey(new Date()));
  const days = Array.from(new Set(dates.map((d) => dayNum(istDayKey(d))))).sort(
    (a, b) => b - a,
  );

  if (today - days[0] > maxGap) return 0;

  let earliest = days[0];
  for (let i = 1; i < days.length; i++) {
    if (earliest - days[i] > maxGap) break;
    earliest = days[i];
  }

  return today - earliest + 1;
}
