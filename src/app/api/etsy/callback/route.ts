import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTenant, isTenantContext } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/security/rate-limit";
import { encrypt } from "@/lib/security/encryption";
import { exchangeCodeForTokens, ETSY_OAUTH_SCOPES } from "@/lib/etsy/oauth";
import { getShopForUser } from "@/lib/etsy/client";
import { ETSY_OAUTH_COOKIE, parseEtsyOAuthCookie } from "@/lib/etsy/oauth-cookie";

function clearOAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set(ETSY_OAUTH_COOKIE, "", { path: "/api/etsy", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  const settingsUrl = (status: string) => new URL(`/settings?etsy=${status}`, request.url);
  const { searchParams } = new URL(request.url);

  const oauthError = searchParams.get("error");
  if (oauthError) {
    return clearOAuthCookie(NextResponse.redirect(settingsUrl("denied")));
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookiePayload = parseEtsyOAuthCookie(request.cookies.get(ETSY_OAUTH_COOKIE)?.value);

  if (!code || !state || !cookiePayload) {
    return clearOAuthCookie(NextResponse.redirect(settingsUrl("expired")));
  }

  // The state must match the value minted for this exact flow, and the
  // organization must match the session that started it — otherwise someone
  // could splice their own Etsy connection into a different org's session
  // (or vice versa) by getting a victim to open a crafted callback URL.
  if (cookiePayload.state !== state || cookiePayload.organizationId !== ctx.organizationId) {
    return clearOAuthCookie(NextResponse.redirect(settingsUrl("invalid_state")));
  }

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier: cookiePayload.codeVerifier,
      redirectUri: cookiePayload.redirectUri,
    });

    const shop = await getShopForUser(tokens.accessToken, tokens.etsyUserId).catch(() => null);

    const connectionData = {
      etsyShopId: shop ? String(shop.shop_id) : null,
      etsyShopName: shop?.shop_name ?? null,
      etsyUserId: tokens.etsyUserId,
      accessTokenEncrypted: encrypt(tokens.accessToken),
      refreshTokenEncrypted: encrypt(tokens.refreshToken),
      scope: ETSY_OAUTH_SCOPES,
      tokenExpiresAt: tokens.expiresAt,
      status: "CONNECTED" as const,
      lastError: null,
    };

    await prisma.etsyConnection.upsert({
      where: { organizationId: ctx.organizationId },
      create: { organizationId: ctx.organizationId, ...connectionData },
      update: connectionData,
    });

    await logAudit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "etsy_connection.connected",
      entityType: "EtsyConnection",
      ipAddress: getClientIp(request.headers),
    });

    return clearOAuthCookie(NextResponse.redirect(settingsUrl("connected")));
  } catch (err) {
    console.error("[api/etsy/callback] connection failed", err);

    await prisma.etsyConnection
      .updateMany({
        where: { organizationId: ctx.organizationId },
        data: { status: "ERROR", lastError: err instanceof Error ? err.message : "Unknown error" },
      })
      .catch(() => {});

    return clearOAuthCookie(NextResponse.redirect(settingsUrl("error")));
  }
}
