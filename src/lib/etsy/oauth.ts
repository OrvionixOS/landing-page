import { createHash, randomBytes } from "node:crypto";

/**
 * Etsy Open API v3 OAuth 2.0 Authorization Code flow with PKCE
 * (https://developers.etsy.com/documentation/essentials/authentication).
 * Etsy issues "public" client credentials for most third-party apps, so the
 * code_verifier (not a client_secret) is what proves the token-exchange
 * request came from whoever started the authorize redirect.
 */

const ETSY_AUTHORIZE_URL = "https://www.etsy.com/oauth/connect";
const ETSY_TOKEN_URL = "https://api.etsy.com/v3/public/oauth/token";

// Scopes needed for shop lookup, draft listing creation, and image upload.
export const ETSY_OAUTH_SCOPES = "listings_r listings_w shops_r";

export function getEtsyClientId(): string {
  const clientId = process.env.ETSY_CLIENT_ID;
  if (!clientId) {
    throw new Error("ETSY_CLIENT_ID environment variable is not set");
  }
  return clientId;
}

function base64url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  return base64url(randomBytes(32));
}

export function generateCodeChallenge(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

export function generateState(): string {
  return base64url(randomBytes(16));
}

export function buildAuthorizeUrl(params: {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(ETSY_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", getEtsyClientId());
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", ETSY_OAUTH_SCOPES);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

interface EtsyTokenResponsePayload {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface EtsyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  /** Etsy access tokens are formatted "{etsy_user_id}.{opaque_token}". */
  etsyUserId: string;
}

function toEtsyTokens(payload: EtsyTokenResponsePayload): EtsyTokens {
  const [etsyUserId] = payload.access_token.split(".");
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: new Date(Date.now() + payload.expires_in * 1000),
    etsyUserId,
  };
}

async function postToken(body: URLSearchParams): Promise<EtsyTokens> {
  const response = await fetch(ETSY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Etsy token request failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as EtsyTokenResponsePayload;
  return toEtsyTokens(payload);
}

export function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<EtsyTokens> {
  return postToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: getEtsyClientId(),
      redirect_uri: params.redirectUri,
      code: params.code,
      code_verifier: params.codeVerifier,
    }),
  );
}

/** Etsy rotates the refresh token on every use — callers must persist the new one. */
export function refreshAccessToken(refreshToken: string): Promise<EtsyTokens> {
  return postToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: getEtsyClientId(),
      refresh_token: refreshToken,
    }),
  );
}
