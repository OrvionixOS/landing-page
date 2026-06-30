import Link from "next/link";
import { Palette } from "lucide-react";

import { requireTenantOrRedirect } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ListingBuilder } from "./listing-builder";

export const metadata = { title: "New listing — ListingStudio" };

export default async function NewListingPage() {
  const ctx = await requireTenantOrRedirect();

  const [brandProfiles, products] = await Promise.all([
    prisma.brandProfile.findMany({
      where: { organizationId: ctx.organizationId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, category: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Generate a listing</h1>
        <p className="mt-1 text-sm text-muted">
          ListingStudio writes a complete, ready-to-publish Etsy listing grounded in your Brand Profile.
        </p>
      </div>

      {brandProfiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Palette className="h-10 w-10 text-accent" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Create a Brand Profile first</h2>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Every listing is generated from a saved Brand Profile so the copy sounds like you. It takes
                about two minutes to set up.
              </p>
            </div>
            <Link href="/brand/new" className={buttonVariants({})}>
              Create your Brand Profile
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ListingBuilder brandProfiles={brandProfiles} products={products} />
      )}
    </div>
  );
}
