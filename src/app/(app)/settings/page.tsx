import { requireTenantOrRedirect } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { EtsyConnectionCard } from "./etsy-connection-card";

interface PageProps {
  searchParams: Promise<{ etsy?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const ctx = await requireTenantOrRedirect();
  const { etsy } = await searchParams;

  // Never select accessTokenEncrypted/refreshTokenEncrypted here — this data
  // reaches a Client Component, and OAuth tokens must never leave the server.
  const connection = await prisma.etsyConnection.findUnique({
    where: { organizationId: ctx.organizationId },
    select: {
      etsyShopId: true,
      etsyShopName: true,
      status: true,
      lastError: true,
      connectedAt: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage integrations for your workspace.</p>
      </div>

      <EtsyConnectionCard connection={connection} statusParam={etsy} />
    </div>
  );
}
