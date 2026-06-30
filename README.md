# ListingStudio

An AI-powered Etsy listing platform for sellers. ListingStudio's **Brand
Engine** is the core differentiator: every AI-generated title, description,
tag set, and caption flows through a saved brand profile, so output stays
consistent with a seller's voice instead of reading like generic AI copy.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the system design, data
model, multi-tenancy strategy, AI service layer, and security model.

## Getting started

1. Copy `.env.example` to `.env` (if present) or set the required
   environment variables directly: `DATABASE_URL` (PostgreSQL),
   `ANTHROPIC_API_KEY`, and the NextAuth secret/URL variables.
2. Install dependencies and apply migrations:

   ```bash
   npm install
   npx prisma migrate deploy
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the Next.js dev server (Turbopack).
- `npm run build` — production build.
- `npm run start` — run a production build.
- `npm run lint` — ESLint.
- `npx tsc --noEmit` — type-check without emitting output.
- `npx prisma studio` — browse the database.

## Project layout

- `src/app/(app)/` — authenticated product pages (dashboard, Brand Engine,
  listings), gated by the layout's session check.
- `src/app/api/` — Route Handlers; every tenant-scoped route starts with
  `requireTenant()`.
- `src/app/auth/` — sign-in / sign-up pages.
- `src/lib/` — server-only application logic: auth config, multi-tenancy
  guards, the AI service layer, security helpers, and Zod validation
  schemas.
- `prisma/schema.prisma` — the data model, annotated with the tenancy
  strategy and which models are reserved for later phases.
