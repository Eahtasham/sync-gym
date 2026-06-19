import { db } from "@/lib/db";

export type PersonalRecords = {
  heaviest: { exercise: string; weight: number; reps: number } | null;
  mostReps: { exercise: string; reps: number; weight: number } | null;
  longestCardio: { exercise: string; minutes: number } | null;
  longestDistance: { exercise: string; km: number } | null;
};

export async function getPersonalRecords(userId: string): Promise<PersonalRecords> {
  const [heaviest, mostReps, longestCardio, longestDistance] =
    await Promise.all([
      db.exerciseSet.findFirst({
        where: { weight: { gt: 0 }, exerciseLog: { workoutSession: { userId } } },
        orderBy: [{ weight: "desc" }, { reps: "desc" }],
        include: {
          exerciseLog: { include: { exercise: { select: { name: true } } } },
        },
      }),
      db.exerciseSet.findFirst({
        where: { reps: { gt: 0 }, exerciseLog: { workoutSession: { userId } } },
        orderBy: [{ reps: "desc" }, { weight: "desc" }],
        include: {
          exerciseLog: { include: { exercise: { select: { name: true } } } },
        },
      }),
      db.cardioLog.findFirst({
        where: { durationMinutes: { gt: 0 }, workoutSession: { userId } },
        orderBy: { durationMinutes: "desc" },
        include: { exercise: { select: { name: true } } },
      }),
      db.cardioLog.findFirst({
        where: { distanceKm: { gt: 0 }, workoutSession: { userId } },
        orderBy: { distanceKm: "desc" },
        include: { exercise: { select: { name: true } } },
      }),
    ]);

  return {
    heaviest: heaviest
      ? {
          exercise: heaviest.exerciseLog.exercise.name,
          weight: heaviest.weight,
          reps: heaviest.reps,
        }
      : null,
    mostReps: mostReps
      ? {
          exercise: mostReps.exerciseLog.exercise.name,
          reps: mostReps.reps,
          weight: mostReps.weight,
        }
      : null,
    longestCardio: longestCardio
      ? {
          exercise: longestCardio.exercise?.name ?? "Cardio",
          minutes: longestCardio.durationMinutes,
        }
      : null,
    longestDistance: longestDistance
      ? {
          exercise: longestDistance.exercise?.name ?? "Cardio",
          km: longestDistance.distanceKm ?? 0,
        }
      : null,
  };
}
