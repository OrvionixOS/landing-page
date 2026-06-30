import Link from "next/link";
import { Plus } from "lucide-react";

import { requireTenantOrRedirect } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata = { title: "Brand Engine — ListingStudio" };

export default async function BrandListPage() {
  const ctx = await requireTenantOrRedirect();

  const brandProfiles = await prisma.brandProfile.findMany({
    where: { organizationId: ctx.organizationId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Brand Engine</h1>
          <p className="mt-1 text-sm text-muted">
            Every listing is generated from one of these saved brand profiles.
          </p>
        </div>
        <Link href="/brand/new" className={buttonVariants({})}>
          <Plus className="h-4 w-4" /> New brand
        </Link>
      </div>

      {brandProfiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-muted">You haven&apos;t created a brand profile yet.</p>
            <Link href="/brand/new" className={buttonVariants({})}>
              Create your first brand
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {brandProfiles.map((brand) => (
            <Link key={brand.id} href={`/brand/${brand.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{brand.name}</CardTitle>
                    {brand.origin === "AI_GENERATED" && (
                      <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                        AI-generated
                      </span>
                    )}
                  </div>
                  {brand.tagline && <CardDescription>{brand.tagline}</CardDescription>}
                </CardHeader>
                {brand.palette ? (
                  <CardContent className="flex gap-1.5">
                    {(brand.palette as Array<{ hex: string }>).slice(0, 6).map((color, i) => (
                      <span
                        key={i}
                        className="h-5 w-5 rounded-full border border-border"
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                  </CardContent>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
