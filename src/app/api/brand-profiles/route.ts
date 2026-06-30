import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTenant, isTenantContext } from "@/lib/tenant";
import { brandProfileInputSchema } from "@/lib/validations/brand";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/security/rate-limit";

export async function GET() {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const brandProfiles = await prisma.brandProfile.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ brandProfiles });
}

export async function POST(request: NextRequest) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const body = await request.json().catch(() => null);
  const parsed = brandProfileInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const brandProfile = await prisma.brandProfile.create({
    data: {
      organizationId: ctx.organizationId,
      createdById: ctx.userId,
      name: parsed.data.name,
      tagline: parsed.data.tagline,
      positioning: parsed.data.positioning,
      voice: parsed.data.voice,
      targetCustomer: parsed.data.targetCustomer,
      visualDirection: parsed.data.visualDirection,
      palette: parsed.data.palette,
      typography: parsed.data.typography,
      origin: parsed.data.origin,
      assumptions: parsed.data.assumptions,
    },
  });

  await logAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "brand_profile.created",
    entityType: "BrandProfile",
    entityId: brandProfile.id,
    ipAddress: getClientIp(request.headers),
  });

  return NextResponse.json({ brandProfile }, { status: 201 });
}
