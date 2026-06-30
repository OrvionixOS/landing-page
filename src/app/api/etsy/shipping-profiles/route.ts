import { NextResponse } from "next/server";

import { requireTenant, isTenantContext } from "@/lib/tenant";
import { rateLimit } from "@/lib/security/rate-limit";
import { getValidAccessToken, listShippingProfiles, EtsyNotConnectedError } from "@/lib/etsy/client";

export async function GET() {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const limit = rateLimit(`etsy:shipping-profiles:${ctx.organizationId}`, 60, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const auth = await getValidAccessToken(ctx.organizationId);
    const profiles = await listShippingProfiles(auth.accessToken, auth.etsyShopId);
    return NextResponse.json({ profiles });
  } catch (err) {
    if (err instanceof EtsyNotConnectedError) {
      return NextResponse.json({ error: "Etsy is not connected" }, { status: 409 });
    }
    console.error("[api/etsy/shipping-profiles]", err);
    return NextResponse.json({ error: "Could not load shipping profiles from Etsy." }, { status: 502 });
  }
}
