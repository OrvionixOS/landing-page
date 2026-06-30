import Link from "next/link";
import { Plus, Palette, FileText } from "lucide-react";

import { requireTenantOrRedirect } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard — ListingStudio" };

export default async function DashboardPage() {
  const ctx = await requireTenantOrRedirect();

  const [brandCount, listingCount, recentBrandProfiles, recentListings] = await Promise.all([
    prisma.brandProfile.count({ where: { organizationId: ctx.organizationId, status: "ACTIVE" } }),
    prisma.listing.count({ where: { organizationId: ctx.organizationId } }),
    prisma.brandProfile.findMany({
      where: { organizationId: ctx.organizationId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.listing.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { product: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">An overview of your brand and listings.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/brand/new" className={buttonVariants({ variant: "secondary" })}>
            <Plus className="h-4 w-4" /> New brand
          </Link>
          <Link href="/listings/new" className={buttonVariants({})}>
            <Plus className="h-4 w-4" /> New listing
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Brand profiles</CardDescription>
            <CardTitle className="text-3xl">{brandCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Listings generated</CardDescription>
            <CardTitle className="text-3xl">{listingCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {brandCount === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Palette className="h-10 w-10 text-accent" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Start with your Brand Profile</h2>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Every listing ListingStudio generates flows through a saved Brand Profile, so your
                copy always sounds like you. It takes about two minutes.
              </p>
            </div>
            <Link href="/brand/new" className={buttonVariants({})}>
              Create your Brand Profile
            </Link>
          </CardContent>
        </Card>
      ) : (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Brand profiles</h2>
            <Link href="/brand" className="text-sm font-medium text-accent hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {recentBrandProfiles.map((brand) => (
              <Link key={brand.id} href={`/brand/${brand.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base">{brand.name}</CardTitle>
                    {brand.tagline && <CardDescription>{brand.tagline}</CardDescription>}
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent listings</h2>
          <Link href="/listings" className="text-sm font-medium text-accent hover:underline">
            View all
          </Link>
        </div>
        {recentListings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <FileText className="h-8 w-8 text-muted" aria-hidden="true" />
              <p className="text-sm text-muted">No listings yet. Generate your first one.</p>
              <Link href="/listings/new" className={buttonVariants({ size: "sm" })}>
                New listing
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {recentListings.map((listing) => (
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
                    <span className="rounded-full bg-muted-surface px-2.5 py-1 text-xs font-medium text-muted">
                      {listing.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
