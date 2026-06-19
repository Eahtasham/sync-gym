"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

/** Log the current user's bodyweight (kg) for a given day (defaults to today). */
export async function logBodyweight(weightKg: number, dateISO?: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 1000) return;

  await db.bodyweightLog.create({
    data: {
      userId,
      weightKg,
      loggedAt: dateISO ? new Date(dateISO) : new Date(),
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/progress");
}

export async function deleteBodyweight(id: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await db.bodyweightLog.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard");
  revalidatePath("/progress");
}
