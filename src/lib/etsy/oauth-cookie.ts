export const ETSY_OAUTH_COOKIE = "etsy_oauth_pkce";
export const ETSY_OAUTH_COOKIE_MAX_AGE_SECONDS = 600;

export interface EtsyOAuthCookiePayload {
  codeVerifier: string;
  state: string;
  organizationId: string;
  redirectUri: string;
}

export function parseEtsyOAuthCookie(raw: string | undefined): EtsyOAuthCookiePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<EtsyOAuthCookiePayload>;
    if (
      typeof parsed.codeVerifier === "string" &&
      typeof parsed.state === "string" &&
      typeof parsed.organizationId === "string" &&
      typeof parsed.redirectUri === "string"
    ) {
      return parsed as EtsyOAuthCookiePayload;
    }
    return null;
  } catch {
    return null;
  }
}
