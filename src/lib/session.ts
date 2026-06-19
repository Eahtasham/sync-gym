/**
 * Stateless signed session token (HMAC-SHA256), usable in both the Edge
 * middleware and Node server actions. The token only proves "the correct PIN
 * was entered before <exp>"; no DB lookup is needed to verify it.
 */
const enc = new TextEncoder();

export const SESSION_COOKIE = "gym_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlEncodeStr(str: string): string {
  return b64urlEncode(enc.encode(str));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(
  secret: string,
  userId: string,
): Promise<string> {
  const payload = JSON.stringify({ uid: userId, exp: Date.now() + SESSION_TTL_MS });
  const payloadB64 = b64urlEncodeStr(payload);
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  return `${payloadB64}.${b64urlEncode(new Uint8Array(sig))}`;
}

/** Returns the authenticated userId if the token is valid & unexpired, else null. */
export async function readSession(
  secret: string,
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;

  const key = await hmacKey(secret);
  const expected = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  if (b64urlEncode(new Uint8Array(expected)) !== sigB64) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")),
          (c) => c.charCodeAt(0),
        ),
      ),
    ) as { exp?: number; uid?: string };
    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) return null;
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

/** Secret used to sign sessions + hash the PIN. Override with AUTH_SECRET in prod. */
export function authSecret(): string {
  return (
    process.env.AUTH_SECRET ??
    process.env.CRON_SECRET ??
    "dev-insecure-secret-change-me"
  );
}
