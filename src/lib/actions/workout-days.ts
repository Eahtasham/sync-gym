"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { workoutDaySchema } from "@/lib/validation";

export async function createWorkoutDay(name: string) {
  const parsed = workoutDaySchema.parse({ name });
  const max = await db.workoutDay.aggregate({ _max: { displayOrder: true } });
  const day = await db.workoutDay.create({
    data: {
      name: parsed.name,
      displayOrder: (max._max.displayOrder ?? -1) + 1,
    },
  });
  revalidatePath("/workouts");
  revalidatePath("/dashboard");
  return day;
}

export async function updateWorkoutDay(id: string, name: string) {
  const parsed = workoutDaySchema.parse({ name });
  await db.workoutDay.update({ where: { id }, data: { name: parsed.name } });
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteWorkoutDay(id: string) {
  await db.workoutDay.delete({ where: { id } });
  revalidatePath("/workouts");
  revalidatePath("/dashboard");
}

export async function reorderWorkoutDays(orderedIds: string[]) {
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.workoutDay.update({ where: { id }, data: { displayOrder: index } }),
    ),
  );
  revalidatePath("/workouts");
  revalidatePath("/dashboard");
}
