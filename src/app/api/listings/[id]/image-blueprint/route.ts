import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireTenant, isTenantContext } from "@/lib/tenant";
import { verifySameOrigin } from "@/lib/security/origin-check";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { logAudit } from "@/lib/audit";
import { generateStructured } from "@/lib/ai/generate";
import { AI_MODELS } from "@/lib/ai/client";
import { imageBlueprintSchema } from "@/lib/validations/image-blueprint";
import { IMAGE_BLUEPRINT_SYSTEM, buildImageBlueprintPrompt } from "@/lib/ai/prompts/image-blueprint";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const originError = verifySameOrigin(request);
  if (originError) return originError;

  const limit = rateLimit(`ai:image-blueprint:${ctx.organizationId}`, 30, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const { id } = await params;

  const listing = await prisma.listing.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (!listing.seoTitle || !listing.description) {
    return NextResponse.json(
      { error: "Generate the listing title and description before running the Image Blueprint." },
      { status: 400 },
    );
  }

  const blueprint = await generateStructured({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    model: AI_MODELS.HIGH_VALUE,
    system: IMAGE_BLUEPRINT_SYSTEM,
    prompt: buildImageBlueprintPrompt({
      title: listing.seoTitle,
      description: listing.description,
    }),
    schema: imageBlueprintSchema,
    toolName: "submit_image_blueprint",
    generationType: "IMAGE_BLUEPRINT",
    inputSummary: { listingId: id, title: listing.seoTitle },
    maxTokens: 8192,
    listingId: id,
  });

  await prisma.listing.update({
    where: { id },
    data: { imageBlueprintData: blueprint as unknown as Prisma.InputJsonValue },
  });

  await logAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "listing.image_blueprint_generated",
    entityType: "Listing",
    entityId: id,
    ipAddress: getClientIp(request.headers),
  });

  return NextResponse.json({ blueprint });
}
