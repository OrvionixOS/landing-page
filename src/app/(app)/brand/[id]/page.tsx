import { notFound } from "next/navigation";

import { requireTenantOrRedirect } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { BrandDetail } from "./brand-detail";
import type { EditableBrandData } from "../new/editable-brand-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BrandDetailPage({ params }: PageProps) {
  const ctx = await requireTenantOrRedirect();
  const { id } = await params;

  const brand = await prisma.brandProfile.findFirst({
    where: { id, organizationId: ctx.organizationId },
  });

  if (!brand) notFound();

  const data: EditableBrandData = {
    name: brand.name,
    tagline: brand.tagline ?? "",
    positioning: brand.positioning ?? "",
    voice: brand.voice ?? "",
    targetCustomer: brand.targetCustomer ?? "",
    visualDirection: brand.visualDirection ?? "",
    palette: (brand.palette as unknown as EditableBrandData["palette"]) ?? [],
    typography: (brand.typography as unknown as EditableBrandData["typography"]) ?? {
      heading: "",
      body: "",
      accent: "",
      rationale: "",
    },
  };

  return <BrandDetail brandId={brand.id} initialData={data} />;
}
