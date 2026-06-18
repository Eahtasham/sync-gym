import { db } from "@/lib/db";

export type StrengthPoint = { date: Date; topWeight: number; volume: number };
export type CardioPoint = {
  date: Date;
  durationMinutes: number;
  distanceKm: number | null;
};

export async function getProgressExercises() {
  const [strength, cardio] = await Promise.all([
    db.exercise.findMany({
      where: { type: "STRENGTH", logs: { some: { sets: { some: {} } } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.exercise.findMany({
      where: { type: "CARDIO", cardioLogs: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  // Deduplicate by name (same exercise can exist under several workout days).
  const dedupe = (rows: { id: string; name: string }[]) => {
    const seen = new Set<string>();
    return rows.filter((r) => {
      if (seen.has(r.name)) return false;
      seen.add(r.name);
      return true;
    });
  };
  return { strength: dedupe(strength), cardio: dedupe(cardio) };
}

export async function getStrengthSeries(
  exerciseId: string,
): Promise<{ name: string; points: StrengthPoint[] }> {
  const exercise = await db.exercise.findUnique({
    where: { id: exerciseId },
    select: { name: true },
  });
  // Match all exercises with the same name (across workout days) for a full history.
  const logs = await db.exerciseLog.findMany({
    where: {
      exercise: { name: exercise?.name },
      sets: { some: { weight: { gt: 0 } } },
    },
    orderBy: { workoutSession: { sessionDate: "asc" } },
    include: {
      sets: { select: { weight: true, reps: true } },
      workoutSession: { select: { sessionDate: true } },
    },
  });
  const points = logs.map((l) => ({
    date: l.workoutSession.sessionDate,
    topWeight: Math.max(...l.sets.map((s) => s.weight), 0),
    volume: l.sets.reduce((a, s) => a + s.weight * s.reps, 0),
  }));
  return { name: exercise?.name ?? "Exercise", points };
}

export async function getCardioSeries(
  exerciseId: string,
): Promise<{ name: string; points: CardioPoint[] }> {
  const exercise = await db.exercise.findUnique({
    where: { id: exerciseId },
    select: { name: true },
  });
  const logs = await db.cardioLog.findMany({
    where: { exercise: { name: exercise?.name } },
    orderBy: { workoutSession: { sessionDate: "asc" } },
    include: { workoutSession: { select: { sessionDate: true } } },
  });
  const points = logs.map((l) => ({
    date: l.workoutSession.sessionDate,
    durationMinutes: l.durationMinutes,
    distanceKm: l.distanceKm,
  }));
  return { name: exercise?.name ?? "Cardio", points };
}
