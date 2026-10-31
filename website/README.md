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
npm run bible:import    # WEB, KJV, Douay-Rheims (public domain) + keyword index + topic map, ~20 s
```

After a schema change, restart `npm run dev`: the running server keeps the old Prisma client.

## Bible (`lib/bible/`)

- `npm run bible:import` downloads the three translations (eBible.org, scrollmapper), maps them to 73 books
  (`lib/bible/books.ts`), and rebuilds the keyword index and the topic map (`lib/bible/topics.ts` + the funnel's
  verses). Safe to run again.
- Search indexes live in the `search` Postgres schema, outside Prisma (it can't express a tsvector GIN or an HNSW
  index). Queried with raw SQL in `lib/bible/search.ts`.
- Meaning-based search is optional: set `VOYAGE_API_KEY`, then run `npm run bible:embed` once (about 70k texts,
  cents). Without it the companion finds verses by reference, topic and keywords.
- Douay-Rheims numbers the Psalms differently (its Psalm 22 is "The Lord is my shepherd"), so Psalms in DRA are
  shown from the WEB for now; the response says which translation was used.
- API: `GET /api/bible/books?t=WEB`, `GET /api/bible/WEB/Phil/4`, `GET /api/bible/passage?ref=Phil 4:6-7&t=KJV`.

## Companion (`lib/ai/`)

- Needs `ANTHROPIC_API_KEY` (answers) and `CHAT_ENCRYPTION_KEY` (messages are encrypted at rest; never change it
  once real chats exist). Without the Anthropic key, crisis and other fixed replies still work and normal
  messages return "not set up".
- Per message: Haiku safety check (+ a keyword crisis net) → daily quota (free 5, premium 100; fixed replies and
  crisis never count) → verse search → Sonnet streams the answer citing passages as `[[P2]]` → markers are removed
  while streaming, citations validated, both messages saved encrypted, cost logged in `AiUsage`.
- API: `GET/POST /api/chat/conversations`, `GET/DELETE /api/chat/conversations/:id`,
  `POST /api/chat/conversations/:id/messages` (SSE: `meta`, `delta`…, `done` or `blocked`), `GET /api/chat/quota`.

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
