import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authSecret, readSession } from "@/lib/session";

const PUBLIC_PREFIXES = ["/lock", "/api/cron"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes (lock screen + cron endpoint) skip auth.
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const userId = await readSession(authSecret(), token);

  if (!userId) {
    const url = req.nextUrl.clone();
    url.pathname = "/lock";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
