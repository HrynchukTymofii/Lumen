# Website

Next.js (App Router) + TypeScript + Tailwind CSS + Prisma (PostgreSQL).

## Setup

```bash
npm install            # also runs prisma generate
cp .env.example .env   # then set DATABASE_URL
npm run dev            # http://localhost:3000
```

## Database

- Schema: `prisma/schema.prisma`, config: `prisma.config.ts`
- Client: `import { prisma } from "@/lib/prisma"` (generated into `lib/generated/prisma`)
- `npm run db:migrate` applies schema changes, `npm run db:studio` opens Prisma Studio

Local Postgres for development (Docker, port 5433, matches `.env.example`):

```bash
docker start lumen-db   # first time: docker run -d --name lumen-db -e POSTGRES_USER=lumen -e POSTGRES_PASSWORD=lumen -e POSTGRES_DB=lumen -p 5433:5432 pgvector/pgvector:pg17
npm run db:migrate
```

## Admin: prayer library (`/admin`)

Prayers live in the database and on Cloudflare R2, not inside the app, so publishing here updates the app
without a new release. See `docs/SPEC.md` §8.8.

1. Put your email in `ADMIN_EMAILS` in `.env`, run `npm run dev`, open http://localhost:3000/admin.
2. Sign in with the 6-digit code. Without `RESEND_API_KEY` the code is printed in the `npm run dev` terminal.
3. Write a prayer (or generate drafts: `npm run prayers:generate -- --category peace --count 5`, needs `ANTHROPIC_API_KEY`).
4. Read it, press **Mark reviewed**, add audio (**Generate voice** needs `ELEVENLABS_*`; **Upload MP3** needs `R2_*`), **Publish**.

The app reads the catalog from `GET /api/library` (checks `GET /api/library/version` first).

R2 setup: create a bucket, an API token with read/write on it, connect a public domain (→ `R2_PUBLIC_URL`), and add a
CORS rule allowing `PUT` from your site's origin (for browser uploads).

## Funnel, accounts and payments

- **Funnel:** `/f/struggle` (config in `funnels/struggle.ts`, engine in `app/(site)/f/[slug]/funnel.tsx`).
  Quiz → loading → plan + sample prayer → email (consent checkbox) → paywall → Stripe → `/success`.
  The sample prayer uses Claude when `ANTHROPIC_API_KEY` is set, otherwise a template; it can only cite the
  verses in `funnels/verses.ts`.
- **Accounts:** passwordless. `/app/login` emails a 6-digit code + a one-time link (printed in the dev terminal
  without `RESEND_API_KEY`). Needs `JWT_SECRET`. Apple/Google routes are ready for the phone app
  (`APPLE_CLIENT_ID`, `GOOGLE_CLIENT_ID`).
- **Web app:** `/app` (Today, Prayers, Companion placeholder, Settings, Upgrade), signed-in only.
- **Stripe: won't work for us** (no legal entity, Stripe doesn't onboard Ukraine). The code stays as a reference until
  a replacement is chosen (Paddle, WayForPay, monobank). For the record, Stripe test setup was: create two recurring prices, fill `STRIPE_*` in `.env`, then
  `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and copy the `whsec_` into `STRIPE_WEBHOOK_SECRET`.
  Without keys the paywall says "Payments aren't set up yet" and "continue free" still works.
