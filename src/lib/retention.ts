import { subDays } from "date-fns";
import { db } from "@/lib/db";
import { RETENTION_DAYS } from "@/lib/types";

/**
 * Delete workout sessions older than the retention window. Cascades remove their
 * logs/sets/cardio. Workout days + exercises (templates) are never touched.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const cutoff = subDays(new Date(), RETENTION_DAYS);
  const res = await db.workoutSession.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return res.count;
}
