import { NextRequest, NextResponse } from "next/server";

import { requireTenant, isTenantContext } from "@/lib/tenant";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  flattenTaxonomyNodes,
  getSellerTaxonomyNodes,
  getValidAccessToken,
  EtsyNotConnectedError,
  type EtsyTaxonomyNode,
} from "@/lib/etsy/client";

// Etsy's full seller taxonomy tree rarely changes and is identical for every
// shop, so it's cached in-process rather than re-fetched on every keystroke
// of a taxonomy search. Same single-instance caveat as src/lib/security/rate-limit.ts.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let cache: { nodes: EtsyTaxonomyNode[]; expiresAt: number } | null = null;

async function getCachedFlatTaxonomy(accessToken: string): Promise<EtsyTaxonomyNode[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.nodes;
  const tree = await getSellerTaxonomyNodes(accessToken);
  const nodes = flattenTaxonomyNodes(tree);
  cache = { nodes, expiresAt: Date.now() + CACHE_TTL_MS };
  return nodes;
}

export async function GET(request: NextRequest) {
  const ctx = await requireTenant();
  if (!isTenantContext(ctx)) return ctx;

  const limit = rateLimit(`etsy:taxonomy:${ctx.organizationId}`, 60, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const query = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";

  try {
    const auth = await getValidAccessToken(ctx.organizationId);
    const flat = await getCachedFlatTaxonomy(auth.accessToken);
    const matches = (query ? flat.filter((node) => node.name.toLowerCase().includes(query)) : flat).slice(
      0,
      50,
    );
    return NextResponse.json({
      nodes: matches.map(({ id, name, level }) => ({ id, name, level })),
    });
  } catch (err) {
    if (err instanceof EtsyNotConnectedError) {
      return NextResponse.json({ error: "Etsy is not connected" }, { status: 409 });
    }
    console.error("[api/etsy/taxonomy]", err);
    return NextResponse.json({ error: "Could not load Etsy categories." }, { status: 502 });
  }
}
