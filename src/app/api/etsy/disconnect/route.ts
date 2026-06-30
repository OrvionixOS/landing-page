import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTenant, isTenantContext } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { verifySameOrigin } from "@/lib/security/origin-check";

/**
 * Etsy's v3 API has no token-revocation endpoint, so this only deletes our
 * stored (encrypted) tokens — it can't force-expire the grant on Etsy's side.
 * The seller can additionally revoke ListingStudio's access from their own
 * Etsy account's "Connected apps" page if they want to fully cut access.
 */
export async function POST(request: NextRequest) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const originError = verifySameOrigin(request);
  if (originError) return originError;

  const limit = rateLimit(`etsy:disconnect:${ctx.organizationId}`, 20, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const existing = await prisma.etsyConnection.findUnique({
    where: { organizationId: ctx.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "No Etsy connection found" }, { status: 404 });
  }

  await prisma.etsyConnection.delete({ where: { organizationId: ctx.organizationId } });

  await logAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "etsy_connection.disconnected",
    entityType: "EtsyConnection",
    entityId: existing.id,
    ipAddress: getClientIp(request.headers),
  });

  return NextResponse.json({ success: true });
}
