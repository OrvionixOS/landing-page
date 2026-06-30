import { NextRequest, NextResponse } from "next/server";

import { requireTenant, isTenantContext } from "@/lib/tenant";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  buildAuthorizeUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "@/lib/etsy/oauth";
import { ETSY_OAUTH_COOKIE, ETSY_OAUTH_COOKIE_MAX_AGE_SECONDS } from "@/lib/etsy/oauth-cookie";

/**
 * Starts the Etsy OAuth PKCE flow. This is a top-level browser navigation
 * (the seller clicks "Connect Etsy" on /settings), not a fetch call, so
 * there's no Origin header to check the way there is on JSON API writes —
 * the only state this route creates is the short-lived PKCE cookie below,
 * scoped to the seller's own organization.
 */
export async function GET(request: NextRequest) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const limit = rateLimit(`etsy:connect:${ctx.organizationId}`, 10, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many connection attempts. Please try again later." },
      { status: 429 },
    );
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();
  const redirectUri = new URL("/api/etsy/callback", request.url).toString();

  const authorizeUrl = buildAuthorizeUrl({ redirectUri, state, codeChallenge });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(
    ETSY_OAUTH_COOKIE,
    JSON.stringify({ codeVerifier, state, organizationId: ctx.organizationId, redirectUri }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/etsy",
      maxAge: ETSY_OAUTH_COOKIE_MAX_AGE_SECONDS,
    },
  );
  return response;
}
