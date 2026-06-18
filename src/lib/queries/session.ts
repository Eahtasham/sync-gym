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
  notes: string | null;
  sets: { weight: number; reps: number }[];
  previous: PreviousStrength;
};

export type SessionCardioEntry = {
  logId: string;
  exerciseId: string | null;
  name: string;
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

/** Most recent strength sets for an exercise, excluding the current session. */
async function previousStrength(
  exerciseId: string,
  excludeSessionId: string,
): Promise<PreviousStrength> {
  const prev = await db.exerciseLog.findFirst({
    where: { exerciseId, workoutSessionId: { not: excludeSessionId } },
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
  exerciseId: string | null,
  excludeSessionId: string,
): Promise<PreviousCardio> {
  if (!exerciseId) return null;
  const prev = await db.cardioLog.findFirst({
    where: { exerciseId, workoutSessionId: { not: excludeSessionId } },
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
): Promise<SessionForEdit | null> {
  const session = await db.workoutSession.findUnique({
    where: { id },
    include: {
      workoutDay: { select: { id: true, name: true } },
      exerciseLogs: {
        orderBy: { exercise: { displayOrder: "asc" } },
        include: {
          exercise: { select: { id: true, name: true } },
          sets: { orderBy: { setNumber: "asc" } },
        },
      },
      cardioLogs: {
        orderBy: { exercise: { displayOrder: "asc" } },
        include: { exercise: { select: { id: true, name: true } } },
      },
    },
  });
  if (!session) return null;

  const strength: SessionStrengthEntry[] = await Promise.all(
    session.exerciseLogs.map(async (log) => ({
      logId: log.id,
      exerciseId: log.exerciseId,
      name: log.exercise.name,
      notes: log.notes,
      sets: log.sets.map((s) => ({ weight: s.weight, reps: s.reps })),
      previous: await previousStrength(log.exerciseId, session.id),
    })),
  );

  const cardio: SessionCardioEntry[] = await Promise.all(
    session.cardioLogs.map(async (log) => ({
      logId: log.id,
      exerciseId: log.exerciseId,
      name: log.exercise?.name ?? "Cardio",
      durationMinutes: log.durationMinutes,
      distanceKm: log.distanceKm,
      calories: log.calories,
      notes: log.notes,
      previous: await previousCardio(log.exerciseId, session.id),
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
