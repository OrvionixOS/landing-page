import { NextResponse } from "next/server";

/**
 * Defense-in-depth CSRF check for state-changing API routes. The session
 * cookie's SameSite=Lax attribute already stops browsers from attaching it
 * to cross-site requests, but this adds an explicit Origin/Host match so
 * the protection doesn't disappear silently if a cookie setting ever
 * regresses. Non-browser callers (curl, server-to-server) omit the Origin
 * header and are allowed through, since they can't ride on a victim's
 * session cookie the way a browser-based CSRF attack would.
 */
export function verifySameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const host = request.headers.get("host");
  if (!host || originHost !== host) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }

  return null;
}
