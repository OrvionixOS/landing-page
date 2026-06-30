import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireTenant, isTenantContext } from "@/lib/tenant";
import { listingUpdateSchema } from "@/lib/validations/listing";
import { logAudit } from "@/lib/audit";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { verifySameOrigin } from "@/lib/security/origin-check";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;
  const { id } = await params;

  const listing = await prisma.listing.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { product: true, brandProfile: { select: { id: true, name: true } } },
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  return NextResponse.json({ listing });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const originError = verifySameOrigin(request);
  if (originError) return originError;

  const limit = rateLimit(`write:listing:${ctx.organizationId}`, 120, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const { id } = await params;

  const existing = await prisma.listing.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = listingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const listing = await prisma.listing.update({
    where: { id },
    data: parsed.data as unknown as Prisma.ListingUpdateInput,
  });

  await logAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "listing.updated",
    entityType: "Listing",
    entityId: listing.id,
    ipAddress: getClientIp(request.headers),
  });

  return NextResponse.json({ listing });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const originError = verifySameOrigin(request);
  if (originError) return originError;

  const limit = rateLimit(`write:listing:${ctx.organizationId}`, 120, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const { id } = await params;

  const existing = await prisma.listing.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  await prisma.listing.update({ where: { id }, data: { status: "ARCHIVED" } });

  await logAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "listing.archived",
    entityType: "Listing",
    entityId: id,
    ipAddress: getClientIp(request.headers),
  });

  return NextResponse.json({ success: true });
}
