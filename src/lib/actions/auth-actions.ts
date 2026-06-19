"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  checkPin,
  endSession,
  getCurrentUserId,
  isPinSet,
  setPin,
  startSessionFor,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { pinSchema } from "@/lib/validation";

export type PinState = { error?: string; success?: boolean };

/** First-run for a profile: create its PIN (with confirmation), then unlock. */
export async function createPinAction(
  _prev: PinState,
  formData: FormData,
): Promise<PinState> {
  const userId = String(formData.get("userId") ?? "");
  const pin = String(formData.get("pin") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!userId) return { error: "Pick a profile" };
  if (!pinSchema.safeParse(pin).success) return { error: "PIN must be 4 digits" };
  if (pin !== confirm) return { error: "PINs do not match" };

  await setPin(userId, pin);
  await startSessionFor(userId);
  redirect("/dashboard");
}

/** Unlock an existing profile with its PIN. */
export async function unlockAction(
  _prev: PinState,
  formData: FormData,
): Promise<PinState> {
  const userId = String(formData.get("userId") ?? "");
  const pin = String(formData.get("pin") ?? "");

  if (!userId) return { error: "Pick a profile" };
  if (!pinSchema.safeParse(pin).success) return { error: "Enter your 4-digit PIN" };

  if (!(await isPinSet(userId))) {
    await setPin(userId, pin);
    await startSessionFor(userId);
    redirect("/dashboard");
  }

  if (!(await checkPin(userId, pin))) return { error: "Incorrect PIN" };

  await startSessionFor(userId);
  redirect("/dashboard");
}

/** Change the current user's PIN. */
export async function changePinAction(
  _prev: PinState,
  formData: FormData,
): Promise<PinState> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not signed in" };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (await isPinSet(userId)) {
    if (!(await checkPin(userId, current))) return { error: "Current PIN is incorrect" };
  }
  if (!pinSchema.safeParse(next).success) return { error: "New PIN must be 4 digits" };
  if (next !== confirm) return { error: "New PINs do not match" };

  await setPin(userId, next);
  return { success: true };
}

/** Rename the current profile. */
export async function renameProfileAction(name: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const trimmed = name.trim().slice(0, 30);
  if (!trimmed) return;
  await db.user.update({ where: { id: userId }, data: { name: trimmed } });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

/** Set the current user's weekly workout goal (1-7). */
export async function setWeeklyGoalAction(goal: number) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const clamped = Math.min(7, Math.max(1, Math.round(goal)));
  await db.user.update({ where: { id: userId }, data: { weeklyGoal: clamped } });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

/** Lock the app / switch user (clear session) and return to the lock screen. */
export async function lockAction() {
  await endSession();
  redirect("/lock");
}
