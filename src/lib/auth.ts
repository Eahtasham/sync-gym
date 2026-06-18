import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  authSecret,
  signSession,
  verifySession,
} from "./session";

const enc = new TextEncoder();

async function hashPin(pin: string): Promise<string> {
  const data = enc.encode(`${pin}:${authSecret()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSettings() {
  return db.setting.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

/** Has the user set up a PIN yet? */
export async function isPinSet(): Promise<boolean> {
  const s = await getSettings();
  return !!s.pinHash;
}

/** Set (or change) the PIN. */
export async function setPin(pin: string): Promise<void> {
  const pinHash = await hashPin(pin);
  await db.setting.upsert({
    where: { id: "singleton" },
    update: { pinHash },
    create: { id: "singleton", pinHash },
  });
}

/** Verify a PIN against the stored hash. */
export async function checkPin(pin: string): Promise<boolean> {
  const s = await getSettings();
  if (!s.pinHash) return false;
  return (await hashPin(pin)) === s.pinHash;
}

/** Write the signed session cookie. */
export async function startSession(): Promise<void> {
  const token = await signSession(authSecret());
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

/** Clear the session cookie (lock the app). */
export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Is the current request authenticated? (for server components) */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySession(authSecret(), token);
}
