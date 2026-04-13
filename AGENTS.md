# create-shipkit - Agent Instructions

AI-first project scaffolder for shipping apps fast.

## What This Repo Does

- `scripts/generate.mjs` — scaffolds new projects from templates with optional features (--db, --auth, --e2e)
- `scripts/bootstrap-services.sh` — wires up GitHub repos, Cloudflare D1, Pages projects
- `turbo/generators/templates/` — Handlebars templates for each project type

## Structure

- `scripts/generate.mjs` — the scaffolder (feature flags, template processing, dep injection)
- `scripts/bootstrap-services.sh` — service wiring (gh, wrangler CLIs)
- `turbo/generators/templates/web-only/` — web app template (Hono + Vite/React)
- Templates use `{{#if feature}}` for conditional blocks and `<% expr %>` for GitHub Actions expressions

## Stack Defaults (for generated projects)

- Language: TypeScript everywhere
- Package manager: pnpm
- API: Hono on Cloudflare Workers
- ORM: Drizzle with D1
- Auth: Better Auth (self-hosted)
- Web: Vite + React
- Mobile: Expo (future)
- CI: GitHub Actions
- Linting: Biome
- Testing: Playwright (E2E) + Vitest (unit)

## Rules

- Do not switch package managers or add major dependencies without asking
- Do not modify CI workflows or deploy configs without explicit approval
- Keep PRs focused on one thing
- When stuck, say so
- No silent failures in generated code — errors must crash loudly
- Platform separation — routes are portable, infra stays in src/platform/
