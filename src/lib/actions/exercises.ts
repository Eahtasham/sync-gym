"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { exerciseSchema, exerciseUpdateSchema } from "@/lib/validation";
import type { ExerciseType } from "@/lib/types";

export async function createExercise(input: {
  workoutDayId: string;
  name: string;
  type: ExerciseType;
}) {
  const parsed = exerciseSchema.parse(input);
  const max = await db.exercise.aggregate({
    where: { workoutDayId: parsed.workoutDayId },
    _max: { displayOrder: true },
  });
  await db.exercise.create({
    data: {
      workoutDayId: parsed.workoutDayId,
      name: parsed.name,
      type: parsed.type,
      displayOrder: (max._max.displayOrder ?? -1) + 1,
    },
  });
  revalidatePath(`/workouts/${parsed.workoutDayId}`);
}

export async function updateExercise(
  id: string,
  input: { name: string; type: ExerciseType },
) {
  const parsed = exerciseUpdateSchema.parse(input);
  const ex = await db.exercise.update({
    where: { id },
    data: { name: parsed.name, type: parsed.type },
  });
  revalidatePath(`/workouts/${ex.workoutDayId}`);
}

export async function deleteExercise(id: string) {
  const ex = await db.exercise.delete({ where: { id } });
  revalidatePath(`/workouts/${ex.workoutDayId}`);
}

export async function toggleFavorite(id: string) {
  const ex = await db.exercise.findUniqueOrThrow({ where: { id } });
  await db.exercise.update({
    where: { id },
    data: { isFavorite: !ex.isFavorite },
  });
  revalidatePath(`/workouts/${ex.workoutDayId}`);
}

export async function reorderExercises(
  workoutDayId: string,
  orderedIds: string[],
) {
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.exercise.update({ where: { id }, data: { displayOrder: index } }),
    ),
  );
  revalidatePath(`/workouts/${workoutDayId}`);
}
