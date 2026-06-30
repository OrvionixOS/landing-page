import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireTenant, isTenantContext } from "@/lib/tenant";
import { regenerateSectionSchema } from "@/lib/validations/listing";
import { regenerateListingSection } from "@/lib/ai/listing-generator";
import { logAudit } from "@/lib/audit";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import type { BrandProfileContext, ProductContext } from "@/lib/ai/prompts/listing-generator";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;
  const { id } = await params;

  const limit = rateLimit(`ai:listing-regenerate:${ctx.organizationId}`, 60, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "You've hit the regeneration limit for this hour. Please try again later." },
      { status: 429 },
    );
  }

  const listing = await prisma.listing.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { product: true, brandProfile: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = regenerateSectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const brandContext: BrandProfileContext = {
    name: listing.brandProfile.name,
    tagline: listing.brandProfile.tagline,
    positioning: listing.brandProfile.positioning,
    voice: listing.brandProfile.voice,
    targetCustomer: listing.brandProfile.targetCustomer,
    visualDirection: listing.brandProfile.visualDirection,
  };

  const productContext: ProductContext = {
    name: listing.product.name,
    category: listing.product.category,
    materials: listing.product.materials,
    description: listing.product.description,
    keyFeatures: (listing.product.keyFeatures as string[] | null) ?? null,
    priceRangeMin: listing.product.priceRangeMin ? listing.product.priceRangeMin.toNumber() : null,
    priceRangeMax: listing.product.priceRangeMax ? listing.product.priceRangeMax.toNumber() : null,
    attributes: (listing.product.attributes as Record<string, unknown> | null) ?? null,
  };

  const currentListing = {
    seoTitle: listing.seoTitle,
    tags: listing.tags,
    taxonomyPath: listing.taxonomyPath,
    attributes: listing.attributes,
    description: listing.description,
    imageShotList: listing.imageShotList,
    videoConcept: listing.videoConcept,
    heroImageDirection: listing.heroImageDirection,
    pricingGuidance: listing.pricingGuidance,
    pinterestCopy: listing.pinterestCopy,
    instagramCopy: listing.instagramCopy,
  };

  let result;
  try {
    result = await regenerateListingSection({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      listingId: listing.id,
      brandProfileId: listing.brandProfileId,
      brand: brandContext,
      product: productContext,
      section: parsed.data.section,
      currentListing,
      instruction: parsed.data.instruction,
    });
  } catch (error) {
    console.error("[api/listings/regenerate] generation failed", error);
    return NextResponse.json({ error: "Regeneration failed. Please try again." }, { status: 502 });
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: result as unknown as Prisma.ListingUpdateInput,
  });

  await logAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "listing.section_regenerated",
    entityType: "Listing",
    entityId: listing.id,
    metadata: { section: parsed.data.section },
    ipAddress: getClientIp(request.headers),
  });

  return NextResponse.json({ listing: updated, section: parsed.data.section, value: result[parsed.data.section] });
}
