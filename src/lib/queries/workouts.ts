import { db } from "@/lib/db";

export async function getWorkoutDays() {
  return db.workoutDay.findMany({
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { exercises: true } } },
  });
}

export async function getWorkoutDay(id: string) {
  return db.workoutDay.findUnique({
    where: { id },
    include: { exercises: { orderBy: { displayOrder: "asc" } } },
  });
}

/** All exercises (deduped by name) for the in-session "add exercise" picker. */
export async function getAllExercises() {
  const rows = await db.exercise.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true },
  });
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.name)) return false;
    seen.add(r.name);
    return true;
  });
}

export type WorkoutDayWithCount = Awaited<
  ReturnType<typeof getWorkoutDays>
>[number];
export type WorkoutDayWithExercises = NonNullable<
  Awaited<ReturnType<typeof getWorkoutDay>>
>;
export type ExerciseRecord = WorkoutDayWithExercises["exercises"][number];
