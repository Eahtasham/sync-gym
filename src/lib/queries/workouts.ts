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

export type WorkoutDayWithCount = Awaited<
  ReturnType<typeof getWorkoutDays>
>[number];
export type WorkoutDayWithExercises = NonNullable<
  Awaited<ReturnType<typeof getWorkoutDay>>
>;
export type ExerciseRecord = WorkoutDayWithExercises["exercises"][number];
