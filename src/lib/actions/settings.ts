"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

/** Delete all workout history (sessions + logs). Templates are kept. */
export async function clearAllHistory() {
  await db.workoutSession.deleteMany({});
  revalidatePath("/history");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
}
