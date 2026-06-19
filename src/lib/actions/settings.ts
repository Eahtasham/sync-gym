"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

/** Delete the current user's workout history (sessions + logs). Templates are kept. */
export async function clearAllHistory() {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await db.workoutSession.deleteMany({ where: { userId } });
  revalidatePath("/history");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
}
