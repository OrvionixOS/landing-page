import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTenant, isTenantContext } from "@/lib/tenant";
import { verifySameOrigin } from "@/lib/security/origin-check";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { logAudit } from "@/lib/audit";
import { getValidAccessToken, uploadListingImage, EtsyNotConnectedError } from "@/lib/etsy/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif"]);
const MAX_IMAGES_PER_LISTING = 10;

/**
 * Etsy hosts listing images directly, so this streams the uploaded file
 * straight through to Etsy's listing-image endpoint and only stores the
 * resulting Etsy id/url locally — there's no local/cloud object storage
 * layer for image bytes on our side.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const originError = verifySameOrigin(request);
  if (originError) return originError;

  const limit = rateLimit(`etsy:image-upload:${ctx.organizationId}`, 60, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const { id } = await params;

  const listing = await prisma.listing.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { images: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (!listing.etsyListingId) {
    return NextResponse.json(
      { error: "Publish this listing to Etsy before uploading images." },
      { status: 409 },
    );
  }
  if (listing.images.length >= MAX_IMAGES_PER_LISTING) {
    return NextResponse.json(
      { error: `Etsy listings support at most ${MAX_IMAGES_PER_LISTING} images.` },
      { status: 400 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Image must be JPEG, PNG, or GIF." }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image must be 10MB or smaller." }, { status: 400 });
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
    console.error("[api/listings/images] token refresh failed", err);
    return NextResponse.json(
      { error: "Could not authenticate with Etsy. Try reconnecting in Settings." },
      { status: 502 },
    );
  }

  let uploaded;
  try {
    uploaded = await uploadListingImage(
      auth.accessToken,
      auth.etsyShopId,
      listing.etsyListingId,
      file,
      file.name,
      listing.images.length,
    );
  } catch (err) {
    console.error("[api/listings/images] Etsy image upload failed", err);
    return NextResponse.json(
      { error: "Etsy rejected the image upload. Please try again." },
      { status: 502 },
    );
  }

  const image = await prisma.listingImage.create({
    data: {
      organizationId: ctx.organizationId,
      listingId: listing.id,
      etsyImageId: String(uploaded.listing_image_id),
      url: uploaded.url_fullxfull,
      rank: listing.images.length,
    },
  });

  await logAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "listing.image_uploaded",
    entityType: "ListingImage",
    entityId: image.id,
    ipAddress: getClientIp(request.headers),
  });

  return NextResponse.json({ image }, { status: 201 });
}
