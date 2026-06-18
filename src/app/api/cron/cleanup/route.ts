import { NextResponse } from "next/server";
import { cleanupExpiredSessions } from "@/lib/retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily retention job. Deletes workout sessions older than 30 days.
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
 * Also accepts `?secret=` for manual triggering.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
    const urlSecret = new URL(req.url).searchParams.get("secret");
    if (bearer !== secret && urlSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const deleted = await cleanupExpiredSessions();
  return NextResponse.json({ ok: true, deleted });
}
