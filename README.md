```
        ~
       ~
  _____|_____
  \         /
   \_______/     create-shipkit
    \     /
     \   /       AI-first dev kit.
      \_/        You steer. AI ships.
   ___| |___
  |_________|
~~~~~~~~~~~~~~~~~~~~
```

# create-shipkit

A dev kit for AI-first development. Scaffold apps, wire up services, and start shipping — with a workflow designed around the way AI actually writes code.

## What this is

This isn't just a project generator. It's an opinionated setup for an **AI-first software development lifecycle**.

The idea: you should be able to steer an AI agent from your phone, your laptop, your desktop, or a cloud agent — and every PR should produce a working preview you can test immediately. The repo is the state. The machine doesn't matter.

**create-shipkit** handles the boring parts of that workflow:

- **Scaffolding** — generates a project with the right structure, config, and dependencies so you're coding in minutes, not hours
- **Agent instructions** — every project ships with `AGENTS.md`, `CLAUDE.md`, and editor rules so AI agents write code *your way*, consistently, across every project
- **Service wiring** — creates your GitHub repo, Cloudflare project, database, and CI pipeline in one script
- **Preview deploys** — every PR automatically deploys a preview you can open on your phone
- **Testing for the AI era** — Playwright E2E tests that survive AI rewrites, not brittle unit tests coupled to implementation details

## The workflow

```
You (phone/laptop/desktop)
  |
  | steer
  v
AI Agent (Claude Code, Cursor, Codex, any tool)
  |
  | codes + opens PR
  v
GitHub (CI runs, preview deploys)
  |
  | produces
  v
Preview URL (test on any device)
  |
  | you review
  v
Merge or request changes
```

Every project scaffolded by create-shipkit is wired for this loop from day one. You pick up wherever you left off because the repo and the PR are the state, not any one machine or session.

## Quick start

```bash
git clone https://github.com/bhushit/create-shipkit.git
cd create-shipkit

# Scaffold a minimal web app
node scripts/generate.mjs web-only --name my-app

# Scaffold with database, auth, and E2E testing
node scripts/generate.mjs web-only --name my-app --db --auth --e2e

# Wire up GitHub repo, Cloudflare, CI
cd my-app && ../scripts/bootstrap-services.sh --name my-app --type web
```

## Features (opt-in)

Everything is optional. Start with a bare Hono + React app, cook in what you need.

| Flag | What it adds |
|---|---|
| *(none)* | Hono API + Vite/React on Cloudflare Workers. TypeScript, Biome, CI, preview deploys. |
| `--db` | Cloudflare D1 + Drizzle ORM. Schema, migrations, client. |
| `--auth` | Better Auth (self-hosted, OSS). Email/password, social login, passkeys via plugins. Requires `--db`. |
| `--e2e` | Playwright E2E testing. Smoke tests in CI on merge, full suite runs locally. |

## Designed to not lock you in

The stack starts simple and cheap, but everything is portable:

- **API routes** are pure [Hono](https://hono.dev) — no Cloudflare-specific code in your business logic. Swap to Bun, Node, or Vercel Edge without rewriting routes.
- **Database** uses [Drizzle ORM](https://orm.drizzle.team) — start with Cloudflare D1 (free, edge SQLite), graduate to Turso or Postgres when you outgrow it. Change the adapter, keep your schema.
- **Auth** uses [Better Auth](https://www.better-auth.com) — OSS, self-hosted, stores in your own database. No vendor, no per-user fees, no ceiling.
- **Platform-specific code** lives in `src/platform/` — a thin adapter layer. Your routes, services, and business logic never import Cloudflare.

You start on Cloudflare's free tier (which handles tens of thousands of users). When a project takes off, you swap the infra layer without rewriting the app.

## What AI agents get

Every generated project includes instructions that work with *any* AI coding tool:

| File | Purpose |
|---|---|
| `AGENTS.md` | Tool-agnostic source of truth. Stack, structure, commands, rules. |
| `CLAUDE.md` | Claude Code specifics. References AGENTS.md. |
| `.claude/rules/` | Modular Claude Code rules. |
| `.cursor/rules/` | Cursor IDE rules. |

Rules baked into every project:
- **No silent failures.** Never add empty catch blocks, swallow errors, or add defensive defaults that hide bugs. If something breaks, it breaks loudly.
- **No backward-compat shims without asking.** This might be v0. Breaking changes are fine.
- **Platform separation.** Routes are portable. Infra stays in `src/platform/`.
- **No DB schema changes without a migration.** Generate it, review it, then apply it.
- **Run lint + typecheck before claiming done.**

These aren't generic best practices — they're guardrails learned from real AI coding sessions where agents silently broke things.

## Testing strategy

create-shipkit follows an **inverted testing pyramid** designed for AI-first development:

| Layer | What | When it runs |
|---|---|---|
| TypeScript strict + Biome | Catches type errors and style issues | Every PR |
| Playwright `@smoke` tests | Critical user paths | On merge to main |
| Playwright full suite | All user flows | Locally, on demand |
| Unit tests (Vitest) | Pure algorithmic logic only | When you write them |

Why inverted? When AI writes and rewrites code frequently, E2E tests that verify *what the user sees* survive better than unit tests coupled to implementation details. AI writes the test code, you define the scenarios.

## What gets generated

```
my-app/
├── src/
│   ├── app/              # Routes, handlers, services, schemas (pure Hono, portable)
│   ├── platform/         # Cloudflare adapter (thin, the only infra-specific code)
│   ├── db/               # Drizzle schema + migrations (--db)
│   ├── auth/             # Better Auth config + middleware (--auth)
│   ├── lib/              # Shared utilities
│   ├── workers/          # Queue consumers, cron handlers
│   └── web/              # Frontend (Vite + React)
├── e2e/                  # Playwright E2E tests (--e2e)
├── tests/                # Unit tests
├── .github/workflows/    # CI + preview deploy + smoke tests
├── AGENTS.md             # AI agent instructions
├── CLAUDE.md             # Claude Code instructions
├── .claude/rules/        # Claude Code rules
├── .cursor/rules/        # Cursor IDE rules
└── ...config files
```

## Prerequisites

Install and authenticate these CLIs on your dev machine:

```bash
# Required
gh auth login          # GitHub CLI
wrangler login         # Cloudflare CLI
npm i -g pnpm          # Package manager
# Node 22+ via fnm or nvm
```

For CI preview deploys, set these secrets on your GitHub repo:
```bash
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set CLOUDFLARE_API_TOKEN
```

## Roadmap

- [ ] `api-only` template (Hono worker, no frontend)
- [ ] `mobile-only` template (Expo + React Native)
- [ ] `monorepo-app` template (API + web + mobile + shared packages)
- [ ] `--payments` feature flag (Stripe)
- [ ] `--storage` feature flag (R2 file uploads)
- [ ] `npx create-shipkit` — run without cloning

## License

MIT
