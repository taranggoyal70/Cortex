# Cortex — the company brain

The blocker to AI automation is no longer the models — it's the domain knowledge
scattered across people's heads, Slack, tickets, and docs. **Cortex** extracts
that know-how, structures it into a living, versioned, cited map of *how a
company actually works*, keeps it current, and exports it as an **executable
skills file** an AI agent can load to do the work safely and consistently.

Not doc-search and not a chatbot — a structured operational-knowledge layer
between raw company data and reliable AI automation.

**Live:** https://cortex-lyart-rho.vercel.app

## The core primitive: a SKILL

Every skill is a cited, versioned procedure an agent can execute:

- `whenToUse` / `triggers` — how an agent matches a scenario to this skill
- `steps` — ordered instructions
- `decisionRules` — condition → action
- `exceptions` and `guardrails` (`must` / `should`)
- `owners`, `confidence`
- **citations** — every claim points at a source chunk with a verbatim quote
  that is verified as an actual substring before it is trusted
  (the anti-hallucination gate)

## How it works

1. **Ingest** — paste/upload sources (or seed a sample company); content is
   deduped by hash and chunked with citation offsets.
2. **Extract** — budget-guarded, batch-packed model calls turn chunks into
   candidate skills; every citation quote is verified verbatim.
3. **Review** — approve/edit/version skills; contradictions between sources
   surface as conflicts to resolve.
4. **Export** — approved skills compile to `SKILL.md` / JSON / YAML.
5. **Consume** — an agent pulls the compiled brain via a token-authed endpoint,
   or you run a scenario against it in the playground.

## Stack

- Next.js (App Router) + React, TypeScript, deployed on Vercel
- Neon Postgres + Drizzle ORM
- Clerk Organizations for multi-tenant workspaces
- GitHub Models (free tier) for extraction and scenario execution
- Durable Vercel Workflow orchestration; optional Upstash rate limiting + budget

## Key endpoints

- `GET /api/export?format=md|json|yaml` — session-authed download of the brain
- `GET /api/agent/skills` — token-authed pull (`Authorization: Bearer <token>`);
  how an external agent loads the brain
- `POST /api/agent/execute` — run a scenario against the compiled skills

## Local setup

The Vercel project is linked to managed Clerk and Neon resources. Pull the
development environment, then run migrations and the dev server:

```bash
vercel link
vercel env pull .env.local
pnpm install
pnpm db:migrate
pnpm dev
```

## Configuration

Required environment variables:

- `DATABASE_URL` — Neon Postgres
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `GITHUB_MODELS_TOKEN` — GitHub PAT with `models:read` (enables extraction and
  the playground; the app boots without it and fails those paths cleanly)
- `NEXT_PUBLIC_APP_URL`

Optional: `KV_REST_API_URL` / `KV_REST_API_TOKEN` (Upstash),
`CORTEX_ENCRYPTION_KEY`, `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET`.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm build
```
