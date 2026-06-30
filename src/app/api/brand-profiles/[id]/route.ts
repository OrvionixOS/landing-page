import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTenant, isTenantContext } from "@/lib/tenant";
import { brandProfileUpdateSchema } from "@/lib/validations/brand";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/security/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;
  const { id } = await params;

  const brandProfile = await prisma.brandProfile.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!brandProfile) {
    return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
  }

  return NextResponse.json({ brandProfile });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.brandProfile.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = brandProfileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const brandProfile = await prisma.brandProfile.update({
    where: { id },
    data: parsed.data,
  });

  await logAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "brand_profile.updated",
    entityType: "BrandProfile",
    entityId: brandProfile.id,
    ipAddress: getClientIp(request.headers),
  });

  return NextResponse.json({ brandProfile });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;
  const { id } = await params;

  const existing = await prisma.brandProfile.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
  }

  await prisma.brandProfile.update({ where: { id }, data: { status: "ARCHIVED" } });

  await logAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "brand_profile.archived",
    entityType: "BrandProfile",
    entityId: id,
    ipAddress: getClientIp(request.headers),
  });

  return NextResponse.json({ success: true });
}
