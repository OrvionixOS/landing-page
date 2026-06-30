import { NextRequest, NextResponse } from "next/server";
import type { EtsyWhoMade } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireTenant, isTenantContext } from "@/lib/tenant";
import { verifySameOrigin } from "@/lib/security/origin-check";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { logAudit } from "@/lib/audit";
import { listingPublishSchema } from "@/lib/validations/etsy";
import { createDraftListing, getValidAccessToken, EtsyNotConnectedError } from "@/lib/etsy/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const WHO_MADE_TO_ENUM: Record<string, EtsyWhoMade> = {
  i_did: "I_DID",
  someone_else: "SOMEONE_ELSE",
  collective: "COLLECTIVE",
};

/**
 * Creates a draft listing on Etsy (Etsy's API defaults new listings to
 * `state: "draft"` when none is sent) and records the result. This never
 * activates a live Etsy listing — the seller reviews and publishes it
 * themselves from their Etsy shop manager.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const originError = verifySameOrigin(request);
  if (originError) return originError;

  const limit = rateLimit(`etsy:publish:${ctx.organizationId}`, 20, 60 * 60 * 1000);
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
  if (listing.etsyListingId) {
    return NextResponse.json(
      { error: "This listing has already been published to Etsy." },
      { status: 409 },
    );
  }
  if (!listing.seoTitle || !listing.description) {
    return NextResponse.json(
      { error: "Generate the listing's title and description before publishing." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = listingPublishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  let auth;
  try {
    auth = await getValidAccessToken(ctx.organizationId);
  } catch (err) {
    if (err instanceof EtsyNotConnectedError) {
      return NextResponse.json(
        { error: "Connect your Etsy shop in Settings first." },
        { status: 409 },
      );
    }
    console.error("[api/listings/publish] token refresh failed", err);
    return NextResponse.json(
      { error: "Could not authenticate with Etsy. Try reconnecting in Settings." },
      { status: 502 },
    );
  }

  let etsyListing;
  try {
    etsyListing = await createDraftListing(auth.accessToken, auth.etsyShopId, {
      title: listing.seoTitle,
      description: listing.description,
      price: parsed.data.price,
      quantity: parsed.data.quantity,
      whoMade: parsed.data.whoMade,
      whenMade: parsed.data.whenMade,
      isSupply: parsed.data.isSupply,
      taxonomyId: parsed.data.taxonomyId,
      shippingProfileId: Number(parsed.data.shippingProfileId),
      returnPolicyId: Number(parsed.data.returnPolicyId),
      tags: (listing.tags as string[] | null) ?? undefined,
    });
  } catch (err) {
    console.error("[api/listings/publish] Etsy draft creation failed", err);
    return NextResponse.json(
      { error: "Etsy rejected the draft listing. Please review the publish settings and try again." },
      { status: 502 },
    );
  }

  const updated = await prisma.listing.update({
    where: { id },
    data: {
      etsyListingId: String(etsyListing.listing_id),
      publishedAt: new Date(),
      status: "PUBLISHED",
      whoMade: WHO_MADE_TO_ENUM[parsed.data.whoMade],
      whenMade: parsed.data.whenMade,
      isSupply: parsed.data.isSupply,
      quantity: parsed.data.quantity,
      taxonomyId: String(parsed.data.taxonomyId),
      shippingProfileId: parsed.data.shippingProfileId,
      returnPolicyId: parsed.data.returnPolicyId,
    },
  });

  await logAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "listing.published_to_etsy",
    entityType: "Listing",
    entityId: updated.id,
    metadata: { etsyListingId: updated.etsyListingId },
    ipAddress: getClientIp(request.headers),
  });

  return NextResponse.json({ listing: updated });
}
