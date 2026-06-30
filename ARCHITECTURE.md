# ListingStudio — Architecture

ListingStudio is a multi-tenant SaaS for Etsy sellers. Its flagship
differentiator is the **Brand Engine**: every piece of AI-generated content —
listing titles, descriptions, tags, captions — is produced from a saved Brand
Profile, so output stays consistent with a seller's voice instead of reading
like generic AI copy.

This document describes the system as built in **Phase 1** (the scope
currently shipped) and the boundaries reserved for later phases.

## Phase roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Auth, multi-tenancy, Brand Engine, Listing Generator, dashboard, export | **Shipped** |
| 2 | Etsy OAuth, listing publishing, image uploads | Modeled in schema, not implemented |
| 3 | Stripe billing, usage limits | Modeled in schema, not implemented |
| 4 | AI mockups, bulk generation, analytics, advanced automation | Not started |

Phase 2/3 data models (`EtsyConnection`, `Subscription`, `Usage`) already
exist in `prisma/schema.prisma` so that shipping those phases later doesn't
require a breaking migration, but no application code reads or writes them
yet beyond the default rows created at registration.

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
- **Etsy OAuth tokens** (Phase 2, reserved): `EtsyConnection` stores
  `accessTokenEncrypted` / `refreshTokenEncrypted` columns; the encryption
  helper for those already exists at `src/lib/security/encryption.ts` ahead
  of Phase 2 wiring it up, so token storage doesn't start out plaintext.

## Data model summary

See `prisma/schema.prisma` for the full annotated schema. The Phase 1 models:

- `Organization`, `Membership`, `User` (+ NextAuth's `Account`, `Session`,
  `VerificationToken`) — identity and tenancy.
- `BrandProfile` — the Brand Engine's core record.
- `Product` — seller-supplied facts used to ground generation (never
  invented by the AI).
- `Listing` — the structured generated output; every field is independently
  editable and independently regenerable.
- `GenerationHistory` — AI call audit trail (cost, tokens, success/failure).
- `AuditLog` — general mutation audit trail.

`EtsyConnection`, `Subscription`, and `Usage` exist for Phase 2/3 and are
populated with default rows at registration (a `FREE_TRIAL` subscription and
an empty `Usage` record for the current period) but are not otherwise read
from application code yet.

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
