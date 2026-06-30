import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTenant, isTenantContext } from "@/lib/tenant";

export async function GET() {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const products = await prisma.product.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, category: true, createdAt: true },
  });

  return NextResponse.json({ products });
}
