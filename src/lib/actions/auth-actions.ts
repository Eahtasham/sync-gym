"use server";

import { redirect } from "next/navigation";
import {
  checkPin,
  endSession,
  isPinSet,
  setPin,
  startSession,
} from "@/lib/auth";
import { pinSchema } from "@/lib/validation";

export type PinState = { error?: string; success?: boolean };

/** First-run: create the PIN (with confirmation), then unlock. */
export async function createPinAction(
  _prev: PinState,
  formData: FormData,
): Promise<PinState> {
  const pin = String(formData.get("pin") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!pinSchema.safeParse(pin).success) return { error: "PIN must be 4 digits" };
  if (pin !== confirm) return { error: "PINs do not match" };

  await setPin(pin);
  await startSession();
  redirect("/dashboard");
}

/** Unlock with the existing PIN. */
export async function unlockAction(
  _prev: PinState,
  formData: FormData,
): Promise<PinState> {
  const pin = String(formData.get("pin") ?? "");
  if (!pinSchema.safeParse(pin).success) return { error: "Enter your 4-digit PIN" };

  // Safety: if somehow no PIN is set, treat this as first-run.
  if (!(await isPinSet())) {
    await setPin(pin);
    await startSession();
    redirect("/dashboard");
  }

  if (!(await checkPin(pin))) return { error: "Incorrect PIN" };

  await startSession();
  redirect("/dashboard");
}

/** Change the PIN from settings. */
export async function changePinAction(
  _prev: PinState,
  formData: FormData,
): Promise<PinState> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (await isPinSet()) {
    if (!(await checkPin(current))) return { error: "Current PIN is incorrect" };
  }
  if (!pinSchema.safeParse(next).success) return { error: "New PIN must be 4 digits" };
  if (next !== confirm) return { error: "New PINs do not match" };

  await setPin(next);
  return { success: true };
}

/** Lock the app (clear session) and return to the lock screen. */
export async function lockAction() {
  await endSession();
  redirect("/lock");
}
