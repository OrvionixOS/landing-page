import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireTenant, isTenantContext } from "@/lib/tenant";
import { listingCreateSchema } from "@/lib/validations/listing";
import { generateListing } from "@/lib/ai/listing-generator";
import { logAudit } from "@/lib/audit";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import type { BrandProfileContext, ProductContext } from "@/lib/ai/prompts/listing-generator";

export async function POST(request: NextRequest) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const limit = rateLimit(`ai:listing-generate:${ctx.organizationId}`, 20, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "You've hit the listing generation limit for this hour. Please try again later." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = listingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const brand = await prisma.brandProfile.findFirst({
    where: { id: parsed.data.brandProfileId, organizationId: ctx.organizationId, status: "ACTIVE" },
  });
  if (!brand) {
    return NextResponse.json({ error: "Brand profile not found" }, { status: 404 });
  }

  let product;
  if (parsed.data.productId) {
    product = await prisma.product.findFirst({
      where: { id: parsed.data.productId, organizationId: ctx.organizationId },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
  } else {
    const p = parsed.data.product!;
    product = await prisma.product.create({
      data: {
        organizationId: ctx.organizationId,
        brandProfileId: brand.id,
        name: p.name,
        category: p.category,
        materials: p.materials,
        description: p.description,
        keyFeatures: p.keyFeatures as Prisma.InputJsonValue | undefined,
        priceRangeMin: p.priceRangeMin,
        priceRangeMax: p.priceRangeMax,
        attributes: p.attributes as Prisma.InputJsonValue | undefined,
      },
    });
  }

  const brandContext: BrandProfileContext = {
    name: brand.name,
    tagline: brand.tagline,
    positioning: brand.positioning,
    voice: brand.voice,
    targetCustomer: brand.targetCustomer,
    visualDirection: brand.visualDirection,
  };

  const productContext: ProductContext = {
    name: product.name,
    category: product.category,
    materials: product.materials,
    description: product.description,
    keyFeatures: (product.keyFeatures as string[] | null) ?? null,
    priceRangeMin: product.priceRangeMin ? product.priceRangeMin.toNumber() : null,
    priceRangeMax: product.priceRangeMax ? product.priceRangeMax.toNumber() : null,
    attributes: (product.attributes as Record<string, unknown> | null) ?? null,
  };

  let generated;
  try {
    generated = await generateListing({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      brandProfileId: brand.id,
      brand: brandContext,
      product: productContext,
    });
  } catch (error) {
    console.error("[api/listings] generation failed", error);
    return NextResponse.json({ error: "Listing generation failed. Please try again." }, { status: 502 });
  }

  const listing = await prisma.listing.create({
    data: {
      organizationId: ctx.organizationId,
      brandProfileId: brand.id,
      productId: product.id,
      createdById: ctx.userId,
      status: "DRAFT",
      seoTitle: generated.seoTitle,
      tags: generated.tags as Prisma.InputJsonValue,
      taxonomyPath: generated.taxonomyPath,
      attributes: generated.attributes as Prisma.InputJsonValue,
      description: generated.description,
      imageShotList: generated.imageShotList as Prisma.InputJsonValue,
      videoConcept: generated.videoConcept,
      heroImageDirection: generated.heroImageDirection,
      pricingGuidance: generated.pricingGuidance as Prisma.InputJsonValue,
      pinterestCopy: generated.pinterestCopy,
      instagramCopy: generated.instagramCopy,
      assumptions: generated.assumptions as Prisma.InputJsonValue,
    },
  });

  await logAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "listing.generated",
    entityType: "Listing",
    entityId: listing.id,
    ipAddress: getClientIp(request.headers),
  });

  return NextResponse.json({ listing }, { status: 201 });
}
