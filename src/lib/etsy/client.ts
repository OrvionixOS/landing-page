import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/security/encryption";
import { refreshAccessToken } from "@/lib/etsy/oauth";

const ETSY_API_BASE = "https://openapi.etsy.com/v3/application";

// Refresh a bit before the real expiry so an in-flight publish request
// never races a token that goes stale mid-call.
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export class EtsyNotConnectedError extends Error {
  constructor() {
    super("Etsy is not connected for this organization");
    this.name = "EtsyNotConnectedError";
  }
}

function getApiKey(): string {
  // Etsy requires the app's keystring as `x-api-key` on every Open API v3
  // call, in addition to the per-seller OAuth bearer token. It's the same
  // value as ETSY_CLIENT_ID (Etsy calls it "Keystring" in the developer
  // dashboard); kept as one source of truth for both.
  return process.env.ETSY_CLIENT_ID ?? "";
}

async function etsyFetch(path: string, accessToken: string, init?: RequestInit): Promise<Response> {
  return fetch(`${ETSY_API_BASE}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      "x-api-key": getApiKey(),
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function etsyFetchJson<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await etsyFetch(path, accessToken, init);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Etsy API request to ${path} failed (${response.status}): ${text}`);
  }
  return (await response.json()) as T;
}

export interface EtsyAuthContext {
  accessToken: string;
  etsyShopId: string;
  etsyUserId: string;
}

/**
 * Returns a guaranteed-fresh access token for the organization's Etsy
 * connection, transparently refreshing (and re-persisting the rotated
 * refresh token) when the stored one is expired or close to it. Every call
 * site that talks to Etsy on behalf of a seller should go through this
 * rather than reading EtsyConnection directly.
 */
export async function getValidAccessToken(organizationId: string): Promise<EtsyAuthContext> {
  const connection = await prisma.etsyConnection.findUnique({ where: { organizationId } });

  if (
    !connection ||
    connection.status !== "CONNECTED" ||
    !connection.accessTokenEncrypted ||
    !connection.refreshTokenEncrypted
  ) {
    throw new EtsyNotConnectedError();
  }

  const needsRefresh =
    !connection.tokenExpiresAt || connection.tokenExpiresAt.getTime() - Date.now() < REFRESH_BUFFER_MS;

  if (!needsRefresh) {
    return {
      accessToken: decrypt(connection.accessTokenEncrypted),
      etsyShopId: connection.etsyShopId ?? "",
      etsyUserId: connection.etsyUserId ?? "",
    };
  }

  try {
    const refreshToken = decrypt(connection.refreshTokenEncrypted);
    const tokens = await refreshAccessToken(refreshToken);

    await prisma.etsyConnection.update({
      where: { organizationId },
      data: {
        accessTokenEncrypted: encrypt(tokens.accessToken),
        refreshTokenEncrypted: encrypt(tokens.refreshToken),
        tokenExpiresAt: tokens.expiresAt,
        status: "CONNECTED",
        lastError: null,
      },
    });

    return {
      accessToken: tokens.accessToken,
      etsyShopId: connection.etsyShopId ?? "",
      etsyUserId: tokens.etsyUserId,
    };
  } catch (err) {
    await prisma.etsyConnection
      .update({
        where: { organizationId },
        data: {
          status: "EXPIRED",
          lastError: err instanceof Error ? err.message : "Token refresh failed",
        },
      })
      .catch(() => {});
    throw err;
  }
}

export interface EtsyShop {
  shop_id: number;
  shop_name: string;
}

/** A newly-connected seller has exactly one shop tied to their Etsy user id. */
export async function getShopForUser(accessToken: string, etsyUserId: string): Promise<EtsyShop | null> {
  const response = await etsyFetch(`/users/${etsyUserId}/shops`, accessToken);
  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Etsy shop lookup failed (${response.status}): ${text}`);
  }
  const shop = (await response.json()) as EtsyShop;
  return shop ?? null;
}

export interface EtsyShippingProfile {
  shipping_profile_id: number;
  title: string;
}

export async function listShippingProfiles(
  accessToken: string,
  shopId: string,
): Promise<EtsyShippingProfile[]> {
  const data = await etsyFetchJson<{ results: EtsyShippingProfile[] }>(
    `/shops/${shopId}/shipping-profiles`,
    accessToken,
  );
  return data.results;
}

export interface EtsyReturnPolicy {
  return_policy_id: number;
  accepts_returns: boolean;
  accepts_exchanges: boolean;
  return_deadline: number | null;
}

export async function listReturnPolicies(
  accessToken: string,
  shopId: string,
): Promise<EtsyReturnPolicy[]> {
  const data = await etsyFetchJson<{ results: EtsyReturnPolicy[] }>(
    `/shops/${shopId}/policies/return`,
    accessToken,
  );
  return data.results;
}

export interface EtsyTaxonomyNode {
  id: number;
  name: string;
  level: number;
  parent_id: number | null;
  children?: EtsyTaxonomyNode[];
}

/**
 * Etsy's v3 API has no taxonomy search endpoint — it only exposes the full
 * tree. Callers filter the flattened result client-side.
 */
export async function getSellerTaxonomyNodes(accessToken: string): Promise<EtsyTaxonomyNode[]> {
  const data = await etsyFetchJson<{ results: EtsyTaxonomyNode[] }>(
    "/seller-taxonomy/nodes",
    accessToken,
  );
  return data.results;
}

export function flattenTaxonomyNodes(nodes: EtsyTaxonomyNode[]): EtsyTaxonomyNode[] {
  const flat: EtsyTaxonomyNode[] = [];
  const visit = (node: EtsyTaxonomyNode) => {
    flat.push(node);
    node.children?.forEach(visit);
  };
  nodes.forEach(visit);
  return flat;
}

export interface CreateDraftListingInput {
  title: string;
  description: string;
  price: number;
  quantity: number;
  whoMade: "i_did" | "someone_else" | "collective";
  whenMade: string;
  isSupply: boolean;
  taxonomyId: number;
  shippingProfileId: number;
  returnPolicyId: number;
  tags?: string[];
}

export interface EtsyListing {
  listing_id: number;
  state: string;
}

/**
 * Always creates the listing in Etsy's "draft" state (the default when no
 * `state` is sent) — this app never activates a live Etsy listing on the
 * seller's behalf. The seller reviews and publishes it from their own Etsy
 * dashboard.
 */
export async function createDraftListing(
  accessToken: string,
  shopId: string,
  input: CreateDraftListingInput,
): Promise<EtsyListing> {
  return etsyFetchJson<EtsyListing>(`/shops/${shopId}/listings`, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      price: input.price,
      quantity: input.quantity,
      who_made: input.whoMade,
      when_made: input.whenMade,
      is_supply: input.isSupply,
      taxonomy_id: input.taxonomyId,
      shipping_profile_id: input.shippingProfileId,
      return_policy_id: input.returnPolicyId,
      tags: input.tags,
    }),
  });
}

export interface EtsyListingImage {
  listing_image_id: number;
  url_fullxfull: string;
  rank: number;
}

/**
 * Etsy hosts listing images directly, so this streams the file straight
 * through to Etsy's listing-image endpoint — there is no local/cloud object
 * storage layer on our side to manage.
 */
export async function uploadListingImage(
  accessToken: string,
  shopId: string,
  listingId: string,
  file: Blob,
  filename: string,
  rank: number,
): Promise<EtsyListingImage> {
  const form = new FormData();
  form.append("image", file, filename);
  form.append("rank", String(rank));

  const response = await etsyFetch(`/shops/${shopId}/listings/${listingId}/images`, accessToken, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Etsy image upload failed (${response.status}): ${text}`);
  }

  return (await response.json()) as EtsyListingImage;
}
