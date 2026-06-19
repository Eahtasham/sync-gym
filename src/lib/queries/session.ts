import { db } from "@/lib/db";

export type PreviousStrength = {
  date: Date;
  sets: { weight: number; reps: number }[];
} | null;

export type PreviousCardio = {
  date: Date;
  durationMinutes: number;
  distanceKm: number | null;
} | null;

export type SessionStrengthEntry = {
  logId: string;
  exerciseId: string;
  name: string;
  postureUrl: string | null;
  notes: string | null;
  sets: { weight: number; reps: number }[];
  previous: PreviousStrength;
  /** Heaviest set from the previous session (the "beat this" target). */
  lastBest: { weight: number; reps: number } | null;
};

export type SessionCardioEntry = {
  logId: string;
  exerciseId: string | null;
  name: string;
  postureUrl: string | null;
  durationMinutes: number;
  distanceKm: number | null;
  calories: number | null;
  notes: string | null;
  previous: PreviousCardio;
};

export type SessionForEdit = {
  id: string;
  notes: string | null;
  sessionDate: Date;
  day: { id: string; name: string };
  strength: SessionStrengthEntry[];
  cardio: SessionCardioEntry[];
};

/**
 * Most recent strength sets for an exercise *by name* (across any workout day),
 * excluding the current session. Matching by name means a "Back Day" started
 * today shows your last numbers even if you logged that lift under another day.
 */
async function previousStrength(
  exerciseName: string,
  excludeSessionId: string,
  userId: string,
): Promise<PreviousStrength> {
  const prev = await db.exerciseLog.findFirst({
    where: {
      exercise: { name: exerciseName },
      workoutSessionId: { not: excludeSessionId },
      sets: { some: {} },
      workoutSession: { userId },
    },
    orderBy: { workoutSession: { sessionDate: "desc" } },
    include: {
      sets: { orderBy: { setNumber: "asc" } },
      workoutSession: { select: { sessionDate: true } },
    },
  });
  if (!prev || prev.sets.length === 0) return null;
  return {
    date: prev.workoutSession.sessionDate,
    sets: prev.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
  };
}

async function previousCardio(
  exerciseName: string | null,
  excludeSessionId: string,
  userId: string,
): Promise<PreviousCardio> {
  if (!exerciseName) return null;
  const prev = await db.cardioLog.findFirst({
    where: {
      exercise: { name: exerciseName },
      workoutSessionId: { not: excludeSessionId },
      workoutSession: { userId },
    },
    orderBy: { workoutSession: { sessionDate: "desc" } },
    include: { workoutSession: { select: { sessionDate: true } } },
  });
  if (!prev) return null;
  return {
    date: prev.workoutSession.sessionDate,
    durationMinutes: prev.durationMinutes,
    distanceKm: prev.distanceKm,
  };
}

export async function getSessionForEdit(
  id: string,
  userId: string,
): Promise<SessionForEdit | null> {
  const session = await db.workoutSession.findFirst({
    where: { id, userId },
    include: {
      workoutDay: { select: { id: true, name: true } },
      exerciseLogs: {
        orderBy: { exercise: { displayOrder: "asc" } },
        include: {
          exercise: { select: { id: true, name: true, postureUrl: true } },
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
      cardioLogs: {
        orderBy: { exercise: { displayOrder: "asc" } },
        include: { exercise: { select: { id: true, name: true, postureUrl: true } } },
      },
    },
  });
  if (!session) return null;

  const strength: SessionStrengthEntry[] = await Promise.all(
    session.exerciseLogs.map(async (log) => {
      const previous = await previousStrength(log.exercise.name, session.id, userId);
      const lastBest =
        previous && previous.sets.length > 0
          ? previous.sets.reduce((best, s) => (s.weight > best.weight ? s : best))
          : null;
      return {
        logId: log.id,
        exerciseId: log.exerciseId,
        name: log.exercise.name,
        postureUrl: log.exercise.postureUrl,
        notes: log.notes,
        sets: log.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
        previous,
        lastBest,
      };
    }),
  );

  const cardio: SessionCardioEntry[] = await Promise.all(
    session.cardioLogs.map(async (log) => ({
      logId: log.id,
      exerciseId: log.exerciseId,
      name: log.exercise?.name ?? "Cardio",
      postureUrl: log.exercise?.postureUrl ?? null,
      durationMinutes: log.durationMinutes,
      distanceKm: log.distanceKm,
      calories: log.calories,
      notes: log.notes,
      previous: await previousCardio(log.exercise?.name ?? null, session.id, userId),
    })),
  );

  return {
    id: session.id,
    notes: session.notes,
    sessionDate: session.sessionDate,
    day: session.workoutDay,
    strength,
    cardio,
  };
}
