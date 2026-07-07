/**
 * Shared-password gate. The password lives ONLY in env (APP_PASSWORD, via
 * .env.local — gitignored). The session cookie holds a SHA-256 digest derived
 * from the password, so rotating the password invalidates all sessions.
 * Edge-safe (Web Crypto only) — used by both middleware and the auth route.
 */

export const SESSION_COOKIE = "watchdog_session";

export async function sessionToken(): Promise<string | null> {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return null;
  const data = new TextEncoder().encode(`a11y-watchdog:v1:${pw}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Only allow same-site relative redirect targets. */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//"))
    return "/";
  return next;
}
