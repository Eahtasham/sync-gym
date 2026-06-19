import { db } from "@/lib/db";

export type BodyweightPoint = { date: Date; weightKg: number; id: string };

export async function getBodyweightSeries(
  userId: string,
): Promise<BodyweightPoint[]> {
  const logs = await db.bodyweightLog.findMany({
    where: { userId },
    orderBy: { loggedAt: "asc" },
    select: { id: true, weightKg: true, loggedAt: true },
  });
  return logs.map((l) => ({ id: l.id, date: l.loggedAt, weightKg: l.weightKg }));
}

export async function getLatestBodyweight(userId: string) {
  const log = await db.bodyweightLog.findFirst({
    where: { userId },
    orderBy: { loggedAt: "desc" },
    select: { weightKg: true, loggedAt: true },
  });
  // Also grab the previous one to compute a delta.
  const prev = await db.bodyweightLog.findFirst({
    where: { userId },
    orderBy: { loggedAt: "desc" },
    skip: 1,
    select: { weightKg: true },
  });
  if (!log) return null;
  return {
    weightKg: log.weightKg,
    loggedAt: log.loggedAt,
    deltaKg: prev ? Math.round((log.weightKg - prev.weightKg) * 10) / 10 : null,
  };
}
