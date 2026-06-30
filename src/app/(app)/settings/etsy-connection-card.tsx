"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EtsyConnectionStatus } from "@prisma/client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

interface EtsyConnectionSummary {
  etsyShopId: string | null;
  etsyShopName: string | null;
  status: EtsyConnectionStatus;
  lastError: string | null;
  connectedAt: Date;
}

const STATUS_BANNERS: Record<string, { variant: "success" | "danger" | "info"; message: string }> = {
  connected: { variant: "success", message: "Etsy connected." },
  denied: { variant: "info", message: "Connection canceled — Etsy authorization was not granted." },
  expired: { variant: "danger", message: "That connection link expired. Please try connecting again." },
  invalid_state: {
    variant: "danger",
    message: "Could not verify the connection request. Please try connecting again.",
  },
  error: { variant: "danger", message: "Something went wrong connecting to Etsy. Please try again." },
};

const STATUS_LABELS: Record<EtsyConnectionStatus, string> = {
  CONNECTED: "Connected",
  EXPIRED: "Connection expired",
  REVOKED: "Revoked",
  ERROR: "Connection error",
};

export function EtsyConnectionCard({
  connection,
  statusParam,
}: {
  connection: EtsyConnectionSummary | null;
  statusParam?: string;
}) {
  const router = useRouter();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const banner = statusParam ? STATUS_BANNERS[statusParam] : undefined;

  async function handleDisconnect() {
    setError(null);
    setIsDisconnecting(true);

    const response = await fetch("/api/etsy/disconnect", { method: "POST" });

    setIsDisconnecting(false);

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setError(result?.error || "Could not disconnect Etsy.");
      return;
    }

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Etsy</CardTitle>
        <CardDescription>
          Connect your Etsy shop to publish listings as drafts directly from ListingStudio.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {banner && <Alert variant={banner.variant}>{banner.message}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}

        {connection && connection.status === "CONNECTED" ? (
          <div className="flex items-center justify-between gap-4 rounded-md border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {connection.etsyShopName ?? "Etsy shop"}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {STATUS_LABELS[connection.status]} · since{" "}
                {connection.connectedAt.toLocaleDateString()}
              </p>
            </div>
            <Button variant="secondary" onClick={handleDisconnect} isLoading={isDisconnecting}>
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-md border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Not connected</p>
              {connection && connection.status !== "CONNECTED" && (
                <p className="mt-0.5 text-sm text-muted">
                  {STATUS_LABELS[connection.status]}
                  {connection.lastError ? ` — ${connection.lastError}` : ""}
                </p>
              )}
            </div>
            <a href="/api/etsy/connect" className={buttonVariants({})}>
              Connect Etsy
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
