# ListingStudio — Architecture

ListingStudio is a multi-tenant SaaS for Etsy sellers. Its flagship
differentiator is the **Brand Engine**: every piece of AI-generated content —
listing titles, descriptions, tags, captions — is produced from a saved Brand
Profile, so output stays consistent with a seller's voice instead of reading
like generic AI copy.

This document describes the system as built in **Phase 1 and Phase 2** (the
scope currently shipped) and the boundaries reserved for later phases.

## Phase roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Auth, multi-tenancy, Brand Engine, Listing Generator, dashboard, export | **Shipped** |
| 2 | Etsy OAuth, listing publishing, image uploads | **Shipped** |
| 3 | Stripe billing, usage limits | Modeled in schema, not implemented |
| 4 | AI mockups, bulk generation, analytics, advanced automation | Not started |

Phase 3 data models (`Subscription`, `Usage`) already exist in
`prisma/schema.prisma` so that shipping that phase later doesn't require a
breaking migration, but no application code reads or writes them yet beyond
the default rows created at registration.

**Phase 2 limitation:** the Etsy OAuth flow, taxonomy/shipping/return-policy
lookups, draft creation, and image upload were all implemented and verified
against Etsy's published Open API v3 documentation, but could not be
exercised against a live Etsy shop in this environment — that requires a
real Etsy developer app (a `client_id`/"Keystring" issued at
etsy.com/developers/your-apps) and a connected Etsy seller account, neither
of which is available here. `ETSY_CLIENT_ID` is left unset in
`.env.example`; every Etsy-calling route fails closed with a clear error
until it's configured.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19) for both the UI and the
  API (Route Handlers under `src/app/api/`).
- **PostgreSQL + Prisma 6** for persistence. `prisma/schema.prisma` is the
  single source of truth for the data model.
- **Auth.js (NextAuth v5)** with the Credentials provider and the Prisma
  adapter. Sessions are JWT-based; the JWT and session callbacks
  (`src/lib/auth.ts`) resolve `organizationId`, `role`, and
  `organizationSlug` from the user's `Membership` row so every request
  carries its tenant identity without an extra query.
- **Anthropic Claude** for all AI generation, called only from the server.
- **Tailwind CSS v4** (CSS-first theme, see `src/app/globals.css`) plus a
  small local component library (`src/components/ui/`) built with
  `class-variance-authority`.

## Multi-tenancy

`Organization` is the tenant boundary. Every tenant-owned table carries an
`organizationId` column, and the schema's onDelete: Cascade rules mean
deleting an organization cleans up its data deterministically.

This is a **shared database, shared schema** design — there is no
Postgres-level row security (RLS) layer. Isolation is enforced entirely in
the application layer through two functions in `src/lib/tenant.ts`:

- `requireTenant()` — used at the top of every API Route Handler. Reads the
  session, returns a `401`/`403` `NextResponse` if there's no authenticated
  user or no organization, otherwise returns a `TenantContext` with
  `organizationId` sourced from the server-verified session (never from
  client-supplied input).
- `requireTenantOrRedirect()` — the Server Component equivalent, used at the
  top of pages under the `(app)` route group; redirects to sign-in instead of
  returning a response object.

Every Prisma query that touches tenant data filters on `organizationId`
(typically via `findFirst({ where: { id, organizationId } })` rather than
`findUnique({ where: { id } })`, so a request for another tenant's record ID
returns 404 instead of leaking existence). This pattern is applied
uniformly across brand profiles, products, listings, and generation history.

## Brand Engine

A `BrandProfile` captures name, tagline, positioning, voice, target customer,
and visual direction, either entered directly (`origin: EXISTING`) or drafted
by `generateBrandSuggestions()` from a short questionnaire
(`origin: AI_GENERATED`). Sellers can edit the AI draft before saving it.

Every downstream generation — full listings and per-section regenerations —
takes the active `BrandProfile` as direct input to its prompt
(`src/lib/ai/prompts/`), so brand voice is structurally part of every
request rather than a post-processing pass.

## AI service layer

All AI calls go through `src/lib/ai/generate.ts`'s `generateStructured()`:

1. A Zod schema is converted to JSON Schema and bound as a single Claude
   **tool**, with `tool_choice` forced to that tool — the model cannot
   respond with anything except that shape.
2. The tool-use result is parsed against the same Zod schema again
   (constraints a JSON Schema can't express — exact list lengths, for
   example — are still enforced this way).
3. On a validation failure or an empty tool call, the request is retried
   once with the model told exactly what was wrong, up to `MAX_ATTEMPTS = 2`.
4. Every attempt is recorded to `GenerationHistory` — model, token counts,
   estimated cost, and a sanitized summary of input/output — regardless of
   whether it succeeded, for cost and quality observability. Recording
   failures are logged but never thrown, so an audit-trail outage can't take
   down a generation request.

Two models are used deliberately (`src/lib/ai/client.ts`):
`AI_MODELS.HIGH_VALUE` (`claude-sonnet-4-6`) for brand suggestions and full
listing generation, where quality matters most; `AI_MODELS.LIGHTWEIGHT`
(`claude-haiku-4-5-20251001`) for single-section regenerations, where
latency and cost matter more than the last percent of quality.

**Assumption flagging, not invention.** Prompts instruct the model to flag
anything it had to assume (a material, a care instruction) in an
`assumptions` array on the output rather than presenting an invented fact as
given. This is surfaced directly in the listing detail UI so sellers know
exactly what to double-check before publishing.

## Etsy integration (Phase 2)

Sellers connect their own Etsy shop and publish listings as **drafts only**
— ListingStudio never activates a live Etsy listing on a seller's behalf.
The seller always does the final review and activation from their own Etsy
shop manager.

**Connect flow** (`src/lib/etsy/oauth.ts`, `src/app/api/etsy/connect`,
`.../callback`): standard OAuth 2.0 PKCE against Etsy's public-client API
(no client secret). `connect` mints a PKCE verifier/challenge and a random
`state`, stores them in a short-lived (600s), httpOnly, path-scoped
(`/api/etsy`) cookie, and redirects to Etsy's authorize endpoint. `callback`
validates the returned `state` against both the cookie and the
*organization id of the session handling the callback* — this second check
specifically defends against a session being swapped out between the
redirect and the callback (e.g. a shared browser, or an attacker getting a
victim to open a crafted callback URL while signed into a different org).
On success, the access/refresh tokens are envelope-encrypted
(`src/lib/security/encryption.ts`, AES-256-GCM) and stored on
`EtsyConnection`; on failure, the connection is marked `ERROR` with a
human-readable `lastError` rather than left in an ambiguous state.

**Token refresh** (`src/lib/etsy/client.ts`'s `getValidAccessToken()`): the
single choke point every Etsy-calling route uses to get a bearer token.
Etsy rotates the refresh token on every use, so a refresh always
re-encrypts and re-persists both tokens together; a refresh failure flips
the connection to `EXPIRED` so the UI can prompt a reconnect instead of
silently failing API calls.

**Shop data is always sourced live, never free-typed.** Shipping profiles,
return policies, and the Etsy category (taxonomy) tree are fetched from the
seller's own connected shop (`/api/etsy/shipping-profiles`,
`/api/etsy/return-policies`, `/api/etsy/taxonomy`) and presented as
selectable options on the publish form — a seller can't submit an
ID that doesn't belong to their shop. Etsy's v3 API exposes the taxonomy
only as a full tree with no search endpoint, so the flattened tree is
cached in-process for 24h (it's identical for every shop and rarely
changes) rather than refetched on every search keystroke.

**Publishing** (`src/app/api/listings/[id]/publish`): validates the
listing has a title/description, calls `createDraftListing()` with no
`state` param (Etsy defaults new listings to `draft`), and records the
returned `etsyListingId`/`publishedAt` on the `Listing` row. A listing can
only be published once; republishing requires unpublishing on Etsy first.

**Images** (`src/app/api/listings/[id]/images`): Etsy hosts listing images
directly, so an uploaded file streams straight through to Etsy's
`POST /shops/{shop}/listings/{listing}/images` endpoint — there is no
local or cloud object-storage layer for image bytes on our side. Only the
returned Etsy image id/URL is persisted, in `ListingImage`. Uploads are
gated on the listing already having an `etsyListingId` and capped at 10
images per listing (Etsy's own limit).

**Disconnecting** (`src/app/api/etsy/disconnect`): Etsy's v3 API has no
token-revocation endpoint, so disconnecting only deletes the locally stored
encrypted tokens — it cannot force-expire the grant on Etsy's side. Sellers
who want to fully cut access need to also revoke ListingStudio from their
Etsy account's own "connected apps" page.

## Security

- **CSRF / cross-origin defense in depth** (`src/lib/security/origin-check.ts`):
  NextAuth's session cookie already defaults to `SameSite=Lax`, which stops
  browsers from attaching it to cross-site requests. `verifySameOrigin()`
  adds an explicit `Origin`/`Host` header match on every state-changing
  route as a second, independent layer, so the protection doesn't silently
  disappear if a cookie setting ever regresses. Requests with no `Origin`
  header (non-browser, server-to-server callers) are let through, since they
  can't ride on a victim's session cookie the way a browser-based CSRF
  attack would.
- **Rate limiting** (`src/lib/security/rate-limit.ts`): an in-process,
  fixed-window limiter keyed by route and identity (organization ID for
  authenticated writes, IP for unauthenticated routes like registration).
  AI-generation routes have tighter limits than plain CRUD writes, since
  they're the more expensive operation.
- **Security headers** (`next.config.ts`): a Content-Security-Policy
  (loosened only in development to allow Turbopack's HMR websocket and
  `eval`-based runtime), `X-Frame-Options: DENY`, `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive
  `Permissions-Policy`, and HSTS.
- **Audit logging** (`src/lib/audit.ts`): every mutation — registration,
  brand profile and listing CRUD, AI generation, export — writes an
  `AuditLog` row with the actor, organization, action, entity, and IP. Audit
  writes never throw, so a logging failure can't block the underlying
  operation.
- **Secrets**: `ANTHROPIC_API_KEY` and `DATABASE_URL` are read from
  `process.env` only inside server-only modules (Route Handlers, Server
  Components, `src/lib/`). Nothing under `src/lib/ai/` or `src/lib/auth.ts`
  is imported from a Client Component. `.env` is git-ignored and has never
  been committed.
- **Etsy OAuth tokens**: `EtsyConnection.accessTokenEncrypted` /
  `refreshTokenEncrypted` are AES-256-GCM ciphertext
  (`src/lib/security/encryption.ts`), decrypted only inside
  `src/lib/etsy/client.ts` on the server. Server Components that read
  `EtsyConnection` for display (`/settings`, `/listings/[id]`) always use an
  explicit Prisma `select` that omits both token columns, so a token can
  never reach a Client Component's props even by accident.
- **OAuth CSRF protection**: the Etsy connect flow's PKCE `state` is
  validated against both a short-lived signed cookie and the session's
  `organizationId` on callback (see "Etsy integration" above), independent
  of the origin-check mechanism used for JSON API writes.

## Data model summary

See `prisma/schema.prisma` for the full annotated schema. The Phase 1 models:

- `Organization`, `Membership`, `User` (+ NextAuth's `Account`, `Session`,
  `VerificationToken`) — identity and tenancy.
- `BrandProfile` — the Brand Engine's core record.
- `Product` — seller-supplied facts used to ground generation (never
  invented by the AI).
- `Listing` — the structured generated output; every field is independently
  editable and independently regenerable. Carries the Etsy publish fields
  (`etsyListingId`, `publishedAt`, `whoMade`, `whenMade`, `isSupply`,
  `quantity`, `taxonomyId`, `shippingProfileId`, `returnPolicyId`) once
  published.
- `ListingImage` — Etsy-hosted listing images (`etsyImageId`, `url`, `rank`);
  no image bytes are stored locally.
- `EtsyConnection` — one per organization; encrypted OAuth tokens, shop id/
  name, and connection `status` (`CONNECTED` / `EXPIRED` / `ERROR`).
- `GenerationHistory` — AI call audit trail (cost, tokens, success/failure).
- `AuditLog` — general mutation audit trail.

`Subscription` and `Usage` exist for Phase 3 and are populated with default
rows at registration (a `FREE_TRIAL` subscription and an empty `Usage`
record for the current period) but are not otherwise read from application
code yet.

## Conventions for extending this codebase

- Never query a tenant-owned model without filtering on `organizationId`.
  Use `requireTenant()` / `requireTenantOrRedirect()` to obtain it — never
  trust an `organizationId` supplied in a request body or query string.
- Every state-changing Route Handler should call `verifySameOrigin()`
  immediately after the tenant guard, then apply a `rateLimit()` call scoped
  to `${action}:${organizationId}` (or `${action}:${ip}` for unauthenticated
  routes), then `logAudit()` after the mutation succeeds.
- New AI generation should go through `generateStructured()` rather than
  calling the Anthropic SDK directly, so it gets schema validation, retries,
  and `GenerationHistory` tracking for free.
- Prompts should instruct the model to flag uncertain claims as assumptions
  rather than inventing specifics — this is a product principle, not just an
  implementation detail of the existing prompts.
