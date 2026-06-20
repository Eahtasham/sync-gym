import { formatDistanceToNowStrict } from "date-fns";
import { formatIST, istDayKey } from "./tz";

/** Format a weight in kg, trimming trailing ".0" (e.g. 62.5kg, 60kg). */
export function kg(weight: number): string {
  const rounded = Math.round(weight * 100) / 100;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded}kg`;
}

/** "3 × 10 @ 62.5kg" style summary for a set group. */
export function setsSummary(sets: { reps: number; weight: number }[]): string {
  if (sets.length === 0) return "—";
  const topWeight = Math.max(...sets.map((s) => s.weight));
  const reps = sets.map((s) => s.reps);
  const allSameReps = reps.every((r) => r === reps[0]);
  const repPart = allSameReps ? `${reps[0]}` : reps.join("/");
  return `${sets.length} × ${repPart} @ ${kg(topWeight)}`;
}

/** Friendly date in IST: Today / Yesterday / "Mon, 12 Jun". */
export function friendlyDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const key = istDayKey(d);
  const today = istDayKey(new Date());
  const yesterday = istDayKey(new Date(Date.now() - 86_400_000));
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return formatIST(d, "EEE, d MMM");
}

/** Short date for tight spots: "12 Jun" (IST). */
export function shortDate(date: Date | string): string {
  return formatIST(date, "d MMM");
}

/** "3 days ago" relative time. */
export function relativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

/** Format a duration in minutes -> "25 min" or "1h 05m". */
export function duration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/** Format distance in km. */
export function km(distance: number | null | undefined): string {
  if (distance == null) return "—";
  const rounded = Math.round(distance * 100) / 100;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded} km`;
}

/** Average speed from distance + duration. */
export function avgSpeed(distanceKm: number, durationMinutes: number): number | null {
  if (!distanceKm || !durationMinutes) return null;
  return Math.round((distanceKm / (durationMinutes / 60)) * 100) / 100;
}
