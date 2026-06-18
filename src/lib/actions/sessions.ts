"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { avgSpeed } from "@/lib/format";

/**
 * Create a session for a workout day, prefilling each exercise from the last
 * time it was done (matched by name, across any day). Batched into ~3 queries
 * + one nested create to keep it fast on a remote (Turso) database.
 */
export async function startSession(workoutDayId: string) {
  const day = await db.workoutDay.findUniqueOrThrow({
    where: { id: workoutDayId },
    include: { exercises: { orderBy: { displayOrder: "asc" } } },
  });

  const strengthEx = day.exercises.filter((e) => e.type !== "CARDIO");
  const cardioEx = day.exercises.filter((e) => e.type === "CARDIO");

  const [prevStrength, prevCardio] = await Promise.all([
    strengthEx.length
      ? db.exerciseLog.findMany({
          where: {
            exercise: { name: { in: strengthEx.map((e) => e.name) } },
            sets: { some: {} },
          },
          orderBy: { workoutSession: { sessionDate: "desc" } },
          include: {
            sets: { orderBy: { setNumber: "asc" } },
            exercise: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    cardioEx.length
      ? db.cardioLog.findMany({
          where: { exercise: { name: { in: cardioEx.map((e) => e.name) } } },
          orderBy: { workoutSession: { sessionDate: "desc" } },
          include: { exercise: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const latestStrength = new Map<string, (typeof prevStrength)[number]>();
  for (const log of prevStrength) {
    if (!latestStrength.has(log.exercise.name)) latestStrength.set(log.exercise.name, log);
  }
  const latestCardio = new Map<string, (typeof prevCardio)[number]>();
  for (const log of prevCardio) {
    const n = log.exercise?.name;
    if (n && !latestCardio.has(n)) latestCardio.set(n, log);
  }

  const session = await db.workoutSession.create({
    data: {
      workoutDayId,
      exerciseLogs: {
        create: strengthEx.map((ex) => {
          const prev = latestStrength.get(ex.name);
          const sets =
            prev && prev.sets.length > 0
              ? prev.sets.map((s) => ({ setNumber: s.setNumber, weight: s.weight, reps: s.reps }))
              : [{ setNumber: 1, weight: 0, reps: 0 }];
          return { exerciseId: ex.id, sets: { create: sets } };
        }),
      },
      cardioLogs: {
        create: cardioEx.map((ex) => {
          const prev = latestCardio.get(ex.name);
          return {
            exerciseId: ex.id,
            durationMinutes: prev?.durationMinutes ?? 0,
            distanceKm: prev?.distanceKm ?? null,
            calories: prev?.calories ?? null,
            avgSpeedKmh: prev?.avgSpeedKmh ?? null,
          };
        }),
      },
    },
  });

  redirect(`/session/${session.id}`);
}

/** Add extra exercises to an in-progress session (e.g. add biceps + cardio to back day). */
export async function addExercisesToSession(sessionId: string, exerciseIds: string[]) {
  const exercises = await db.exercise.findMany({
    where: { id: { in: exerciseIds } },
  });

  for (const ex of exercises) {
    if (ex.type === "CARDIO") {
      const exists = await db.cardioLog.findFirst({
        where: { workoutSessionId: sessionId, exerciseId: ex.id },
        select: { id: true },
      });
      if (exists) continue;
      const prev = await db.cardioLog.findFirst({
        where: { exercise: { name: ex.name }, workoutSessionId: { not: sessionId } },
        orderBy: { workoutSession: { sessionDate: "desc" } },
      });
      await db.cardioLog.create({
        data: {
          workoutSessionId: sessionId,
          exerciseId: ex.id,
          durationMinutes: prev?.durationMinutes ?? 0,
          distanceKm: prev?.distanceKm ?? null,
          calories: prev?.calories ?? null,
          avgSpeedKmh: prev?.avgSpeedKmh ?? null,
        },
      });
    } else {
      const exists = await db.exerciseLog.findFirst({
        where: { workoutSessionId: sessionId, exerciseId: ex.id },
        select: { id: true },
      });
      if (exists) continue;
      const prev = await db.exerciseLog.findFirst({
        where: {
          exercise: { name: ex.name },
          workoutSessionId: { not: sessionId },
          sets: { some: {} },
        },
        orderBy: { workoutSession: { sessionDate: "desc" } },
        include: { sets: { orderBy: { setNumber: "asc" } } },
      });
      const sets =
        prev && prev.sets.length > 0
          ? prev.sets.map((s) => ({ setNumber: s.setNumber, weight: s.weight, reps: s.reps }))
          : [{ setNumber: 1, weight: 0, reps: 0 }];
      await db.exerciseLog.create({
        data: { workoutSessionId: sessionId, exerciseId: ex.id, sets: { create: sets } },
      });
    }
  }

  revalidatePath(`/session/${sessionId}`);
}

export async function removeExerciseLog(logId: string) {
  const log = await db.exerciseLog.delete({ where: { id: logId } });
  revalidatePath(`/session/${log.workoutSessionId}`);
}

export async function removeCardioLog(logId: string) {
  const log = await db.cardioLog.delete({ where: { id: logId } });
  revalidatePath(`/session/${log.workoutSessionId}`);
}

export type SaveSessionPayload = {
  notes?: string | null;
  logs: {
    exerciseLogId: string;
    notes?: string | null;
    sets: { weight: number; reps: number }[];
  }[];
  cardio: {
    cardioLogId: string;
    durationMinutes: number;
    distanceKm?: number | null;
    calories?: number | null;
    notes?: string | null;
  }[];
};

/** Persist the full session state (used for autosave and finish). */
export async function saveSession(sessionId: string, payload: SaveSessionPayload) {
  await db.$transaction(async (tx) => {
    await tx.workoutSession.update({
      where: { id: sessionId },
      data: { notes: payload.notes ?? null },
    });

    for (const log of payload.logs) {
      await tx.exerciseSet.deleteMany({ where: { exerciseLogId: log.exerciseLogId } });
      await tx.exerciseLog.update({
        where: { id: log.exerciseLogId },
        data: {
          notes: log.notes ?? null,
          sets: {
            create: log.sets.map((s, i) => ({
              setNumber: i + 1,
              weight: s.weight,
              reps: s.reps,
            })),
          },
        },
      });
    }

    for (const c of payload.cardio) {
      await tx.cardioLog.update({
        where: { id: c.cardioLogId },
        data: {
          durationMinutes: c.durationMinutes,
          distanceKm: c.distanceKm ?? null,
          calories: c.calories ?? null,
          avgSpeedKmh:
            c.distanceKm && c.durationMinutes
              ? avgSpeed(c.distanceKm, c.durationMinutes)
              : null,
          notes: c.notes ?? null,
        },
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/progress");
}

/** Save and finish: drops empty entries to keep history clean, then go to dashboard. */
export async function finishSession(sessionId: string, payload: SaveSessionPayload) {
  await saveSession(sessionId, payload);

  // Remove sets that are entirely empty (0 weight & 0 reps).
  await db.exerciseSet.deleteMany({
    where: {
      exerciseLog: { workoutSessionId: sessionId },
      weight: 0,
      reps: 0,
    },
  });
  // Remove exercise logs that ended up with no sets and no notes.
  const emptyLogs = await db.exerciseLog.findMany({
    where: { workoutSessionId: sessionId, notes: null, sets: { none: {} } },
    select: { id: true },
  });
  if (emptyLogs.length > 0) {
    await db.exerciseLog.deleteMany({
      where: { id: { in: emptyLogs.map((l) => l.id) } },
    });
  }
  // Remove cardio logs with no duration and no distance.
  await db.cardioLog.deleteMany({
    where: {
      workoutSessionId: sessionId,
      durationMinutes: 0,
      OR: [{ distanceKm: null }, { distanceKm: 0 }],
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/progress");
  redirect("/dashboard");
}

export async function deleteSession(id: string) {
  await db.workoutSession.delete({ where: { id } });
  revalidatePath("/history");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
}

/** Duplicate a past session as a fresh session today (copying values), then open it. */
export async function duplicateSession(id: string) {
  const src = await db.workoutSession.findUniqueOrThrow({
    where: { id },
    include: {
      exerciseLogs: { include: { sets: { orderBy: { setNumber: "asc" } } } },
      cardioLogs: true,
    },
  });

  const created = await db.workoutSession.create({
    data: {
      workoutDayId: src.workoutDayId,
      notes: src.notes,
      exerciseLogs: {
        create: src.exerciseLogs.map((log) => ({
          exerciseId: log.exerciseId,
          notes: log.notes,
          sets: {
            create: log.sets.map((s) => ({
              setNumber: s.setNumber,
              weight: s.weight,
              reps: s.reps,
            })),
          },
        })),
      },
      cardioLogs: {
        create: src.cardioLogs.map((c) => ({
          exerciseId: c.exerciseId,
          durationMinutes: c.durationMinutes,
          distanceKm: c.distanceKm,
          calories: c.calories,
          avgSpeedKmh: c.avgSpeedKmh,
          notes: c.notes,
        })),
      },
    },
  });

  redirect(`/session/${created.id}`);
}
