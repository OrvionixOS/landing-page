import { notFound } from "next/navigation";

import { requireTenantOrRedirect } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { ListingDetail } from "./listing-detail";
import type { EditableListingData } from "./listing-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ListingDetailPage({ params }: PageProps) {
  const ctx = await requireTenantOrRedirect();
  const { id } = await params;

  const listing = await prisma.listing.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { product: { select: { name: true } }, brandProfile: { select: { name: true } } },
  });

  if (!listing) notFound();

  const data: EditableListingData = {
    seoTitle: listing.seoTitle ?? "",
    tags: (listing.tags as unknown as string[]) ?? [],
    taxonomyPath: listing.taxonomyPath ?? "",
    attributes: (listing.attributes as unknown as Record<string, string>) ?? {},
    description: listing.description ?? "",
    imageShotList: (listing.imageShotList as unknown as EditableListingData["imageShotList"]) ?? [],
    videoConcept: listing.videoConcept ?? "",
    heroImageDirection: listing.heroImageDirection ?? "",
    pricingGuidance: (listing.pricingGuidance as unknown as EditableListingData["pricingGuidance"]) ?? {
      suggestedPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      rationale: "",
    },
    pinterestCopy: listing.pinterestCopy ?? "",
    instagramCopy: listing.instagramCopy ?? "",
    status: listing.status,
  };

  const assumptions = (listing.assumptions as unknown as string[]) ?? [];

  return (
    <ListingDetail
      listingId={listing.id}
      initialData={data}
      assumptions={assumptions}
      meta={{
        brandName: listing.brandProfile.name,
        productName: listing.product.name,
        createdAt: listing.createdAt.toISOString(),
      }}
    />
  );
}
