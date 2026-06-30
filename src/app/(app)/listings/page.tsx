import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import type { Prisma, ListingStatus } from "@prisma/client";

import { requireTenantOrRedirect } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { ListingsFilterBar } from "./listings-filter-bar";

export const metadata = { title: "Listings — ListingStudio" };

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-muted-surface text-muted",
  READY: "bg-accent-soft text-accent",
  PUBLISHED: "bg-success-soft text-success",
  ARCHIVED: "bg-muted-surface text-muted",
};

const VALID_STATUSES: ListingStatus[] = ["DRAFT", "READY", "PUBLISHED", "ARCHIVED"];

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function ListingsPage({ searchParams }: PageProps) {
  const ctx = await requireTenantOrRedirect();
  const { q, status } = await searchParams;

  const where: Prisma.ListingWhereInput = { organizationId: ctx.organizationId };

  if (!status || status === "ACTIVE") {
    where.status = { not: "ARCHIVED" };
  } else if (status !== "ALL" && VALID_STATUSES.includes(status as ListingStatus)) {
    where.status = status as ListingStatus;
  }

  const query = q?.trim();
  if (query) {
    where.OR = [
      { seoTitle: { contains: query, mode: "insensitive" } },
      { product: { name: { contains: query, mode: "insensitive" } } },
    ];
  }

  const listings = await prisma.listing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true } } },
  });

  const hasAnyListings = await prisma.listing.count({ where: { organizationId: ctx.organizationId } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Listings</h1>
          <p className="mt-1 text-sm text-muted">Every Etsy listing ListingStudio has generated for you.</p>
        </div>
        <Link href="/listings/new" className={buttonVariants({})}>
          <Plus className="h-4 w-4" /> New listing
        </Link>
      </div>

      {hasAnyListings > 0 && <ListingsFilterBar />}

      {hasAnyListings === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <FileText className="h-10 w-10 text-accent" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">No listings yet</h2>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Generate your first AI-written, brand-voiced Etsy listing in under a minute.
              </p>
            </div>
            <Link href="/listings/new" className={buttonVariants({})}>
              Create your first listing
            </Link>
          </div>
        </Card>
      ) : listings.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <FileText className="h-8 w-8 text-muted" aria-hidden="true" />
            <p className="text-sm text-muted">No listings match your search or filter.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {listings.map((listing) => (
              <li key={listing.id}>
                <Link
                  href={`/listings/${listing.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted-surface"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {listing.seoTitle || listing.product.name}
                    </p>
                    <p className="text-xs text-muted">{formatDate(listing.createdAt)}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      STATUS_STYLES[listing.status] ?? STATUS_STYLES.DRAFT
                    }`}
                  >
                    {listing.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
