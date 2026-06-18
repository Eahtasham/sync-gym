"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { avgSpeed } from "@/lib/format";

/** Create a session for a workout day, prefilling each exercise from its last session. */
export async function startSession(workoutDayId: string) {
  const day = await db.workoutDay.findUniqueOrThrow({
    where: { id: workoutDayId },
    include: { exercises: { orderBy: { displayOrder: "asc" } } },
  });

  const session = await db.workoutSession.create({ data: { workoutDayId } });

  for (const ex of day.exercises) {
    if (ex.type === "CARDIO") {
      const prev = await db.cardioLog.findFirst({
        where: { exerciseId: ex.id },
        orderBy: { workoutSession: { sessionDate: "desc" } },
      });
      await db.cardioLog.create({
        data: {
          workoutSessionId: session.id,
          exerciseId: ex.id,
          durationMinutes: prev?.durationMinutes ?? 0,
          distanceKm: prev?.distanceKm ?? null,
          calories: prev?.calories ?? null,
          avgSpeedKmh: prev?.avgSpeedKmh ?? null,
        },
      });
    } else {
      const prev = await db.exerciseLog.findFirst({
        where: { exerciseId: ex.id },
        orderBy: { workoutSession: { sessionDate: "desc" } },
        include: { sets: { orderBy: { setNumber: "asc" } } },
      });
      const sets =
        prev && prev.sets.length > 0
          ? prev.sets.map((s) => ({
              setNumber: s.setNumber,
              weight: s.weight,
              reps: s.reps,
            }))
          : [{ setNumber: 1, weight: 0, reps: 0 }];
      await db.exerciseLog.create({
        data: {
          workoutSessionId: session.id,
          exerciseId: ex.id,
          sets: { create: sets },
        },
      });
    }
  }

  redirect(`/session/${session.id}`);
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
