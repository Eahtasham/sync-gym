import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  authSecret,
  readSession,
  signSession,
} from "./session";

const enc = new TextEncoder();

async function hashPin(userId: string, pin: string): Promise<string> {
  const data = enc.encode(`${userId}:${pin}:${authSecret()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** All profiles (for the lock screen), with whether each has a PIN set. */
export async function getProfiles() {
  const users = await db.user.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, pinHash: true },
  });
  return users.map((u) => ({ id: u.id, name: u.name, hasPin: !!u.pinHash }));
}

export async function setPin(userId: string, pin: string): Promise<void> {
  const pinHash = await hashPin(userId, pin);
  await db.user.update({ where: { id: userId }, data: { pinHash } });
}

export async function checkPin(userId: string, pin: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { pinHash: true },
  });
  if (!user?.pinHash) return false;
  return (await hashPin(userId, pin)) === user.pinHash;
}

export async function isPinSet(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { pinHash: true },
  });
  return !!user?.pinHash;
}

/** Write the signed session cookie for a user. */
export async function startSessionFor(userId: string): Promise<void> {
  const token = await signSession(authSecret(), userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** The authenticated userId from the cookie, or null. */
export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return readSession(authSecret(), token);
}

export type CurrentUser = {
  id: string;
  name: string;
  weeklyGoal: number;
};

/** The current user record, or null if unauthenticated / user missing. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const id = await getCurrentUserId();
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, weeklyGoal: true },
  });
  return user;
}

/** Like getCurrentUser but redirects to /lock if not authenticated. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/lock");
  return user;
}

/** The "other" profile (the friend), if any. */
export async function getOtherUser(userId: string) {
  return db.user.findFirst({
    where: { id: { not: userId } },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, weeklyGoal: true },
  });
}
