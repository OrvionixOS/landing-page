import { NextRequest, NextResponse } from "next/server";
import type { Prisma, ListingStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireTenant, isTenantContext } from "@/lib/tenant";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { logAudit } from "@/lib/audit";

const VALID_STATUSES: ListingStatus[] = ["DRAFT", "READY", "PUBLISHED", "ARCHIVED"];

function csvCell(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const CSV_COLUMNS = [
  "Title",
  "Status",
  "Brand",
  "Product",
  "Tags",
  "Taxonomy path",
  "Description",
  "Suggested price",
  "Min price",
  "Max price",
  "Pricing rationale",
  "Video concept",
  "Hero image direction",
  "Pinterest caption",
  "Instagram caption",
  "Created at",
  "Updated at",
] as const;

export async function GET(request: NextRequest) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const limit = rateLimit(`listings:export:${ctx.organizationId}`, 30, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "You've hit the export limit for this hour. Please try again later." },
      { status: 429 },
    );
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "json" ? "json" : "csv";
  const statusParam = searchParams.get("status");
  const query = searchParams.get("q")?.trim();

  const where: Prisma.ListingWhereInput = { organizationId: ctx.organizationId };

  if (!statusParam || statusParam === "ACTIVE") {
    where.status = { not: "ARCHIVED" };
  } else if (statusParam !== "ALL" && VALID_STATUSES.includes(statusParam as ListingStatus)) {
    where.status = statusParam as ListingStatus;
  }

  if (query) {
    where.OR = [
      { seoTitle: { contains: query, mode: "insensitive" } },
      { product: { name: { contains: query, mode: "insensitive" } } },
    ];
  }

  const listings = await prisma.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true } }, brandProfile: { select: { name: true } } },
  });

  const timestamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const payload = listings.map((listing) => ({
      id: listing.id,
      seoTitle: listing.seoTitle,
      status: listing.status,
      brand: listing.brandProfile.name,
      product: listing.product.name,
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
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
    }));

    await logExport(ctx, request, listings.length, "json");

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="listingstudio-listings-${timestamp}.json"`,
      },
    });
  }

  const rows = listings.map((listing) => {
    const pricing = listing.pricingGuidance as Prisma.JsonValue as {
      suggestedPrice?: number;
      minPrice?: number;
      maxPrice?: number;
      rationale?: string;
    } | null;
    const tags = (listing.tags as unknown as string[] | null) ?? [];

    return [
      listing.seoTitle ?? "",
      listing.status,
      listing.brandProfile.name,
      listing.product.name,
      tags.join("; "),
      listing.taxonomyPath ?? "",
      listing.description ?? "",
      pricing?.suggestedPrice ?? "",
      pricing?.minPrice ?? "",
      pricing?.maxPrice ?? "",
      pricing?.rationale ?? "",
      listing.videoConcept ?? "",
      listing.heroImageDirection ?? "",
      listing.pinterestCopy ?? "",
      listing.instagramCopy ?? "",
      listing.createdAt.toISOString(),
      listing.updatedAt.toISOString(),
    ];
  });

  const csv = [CSV_COLUMNS, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  await logExport(ctx, request, listings.length, "csv");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="listingstudio-listings-${timestamp}.csv"`,
    },
  });
}

async function logExport(
  ctx: { organizationId: string; userId: string },
  request: NextRequest,
  count: number,
  format: "csv" | "json",
) {
  await logAudit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "listing.exported",
    entityType: "Listing",
    metadata: { format, count },
    ipAddress: getClientIp(request.headers),
  });
}
