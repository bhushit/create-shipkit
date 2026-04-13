Get the Dev System Working Today

Philosophy

You are one person building many things from many places. The system should:





Let AI do most of the coding work asynchronously



Let you review, steer, and test from anywhere -- phone, MacBook on the couch, Mac Mini at desk, or cloud agents while you sleep



Use GitHub as the shared backbone so nothing depends on one machine or one session



Give you previews and CI on every PR so you can review real output, not just code



Work with any AI coding tool -- Claude Code CLI, Cursor, Codex -- not lock into one



Start working today with one app, then replicate the pattern

Do not over-design. Get one full loop working, then copy the pattern.

Your Devices





Mac Mini -- always on, persistent anchor for Apple toolchain and long-running sessions



MacBook -- portable, used from couch/travel, full local dev when needed



Phone -- remote control, PR review, quick steering, preview testing



Cloud agents -- async parallel work that does not need any local machine

All four are first-class. GitHub + shared instructions keep them in sync. You pick up wherever you left off because the repo and PR are the state, not any one machine.

The Loop You Want Working

flowchart LR
  you[YouOnPhone] -->|steer| agent[AIAgent]
  agent -->|code| github[GitHubPR]
  github -->|triggers| ci[CIAndPreview]
  ci -->|produces| artifact[PreviewOrBuild]
  artifact -->|you review on| you

Every app should eventually run this loop. Today we prove it works once.

Strategic Sequence (4-5 hours)

Hour 1: Remote Coding Access + Mac Mini Tooling

Goal: Prove you can steer AI coding sessions from your phone and get the Mac Mini ready as a dev host.

Available tools:





Claude Code Max plan (CLI, remote control, cloud agents)



Cursor (desktop IDE, iOS app coming soon)



Codex Max plan (optional, for cloud-native agent sessions)



Mac Mini (always on)



MacBook (portable)



Phone (remote control + review)

What to do:





Install Tailscale on Mac Mini and MacBook so both are reachable from anywhere



Install the essential CLI tools on both machines (see CLI Tooling section below)



SSH into Mac Mini from your phone (Blink or Termius)



Start a Claude Code CLI session on the Mac Mini



Use Claude Code's remote control feature to connect from phone browser



Test: give it a small task and watch it work



Bonus: also confirm MacBook can SSH to Mac Mini over Tailscale (for couch/travel coding)

Why Claude Code on Mac Mini first: It gives you both local Apple toolchain access (Xcode, simulators, signing) AND remote phone control in one setup. Cloud agents via the Max plan are available as a second lane when you want async parallel work without tying up any machine.

Done when: You can steer a Claude Code session from your phone, and both Mac Mini and MacBook have CLI tools installed.

Hour 2: Build the Bootstrapping Scaffolder

Goal: Build a scaffolder that generates project structure + wires up services so you can test it immediately with real apps in Hour 3.

Bootstrapping is two things:





Code scaffolding -- generate the right file structure, configs, and instructions



Service wiring -- create the actual Cloudflare project, GitHub repo, EAS project, Sentry project, CI workflows, and preview connections

Scaffolding tool: Turborepo turbo gen + Plop

Turborepo has built-in code generation powered by Plop. Generators live in turbo/generators/config.ts and are auto-discovered. This means the scaffolder lives inside your dev tooling, not as a separate system.

Templates to create:





monorepo-app -- full multi-surface app (API + web + mobile + shared packages)



web-only -- single-surface web app (Hono + Drizzle + Vite)



mobile-only -- single-surface Expo app



api-only -- standalone Hono API worker

Each template should generate:





Directory structure with all the right folders (see Reference Structures below)



package.json with correct scripts and deps



AGENTS.md and CLAUDE.md with project-specific instructions pre-filled



.claude/rules/ and .cursor/rules/ with stack-appropriate rules



CI workflow files (.github/workflows/)



scripts/dev.sh, scripts/status.sh



docs/decisions/ with an initial README



Config files: tsconfig.json, vitest.config.ts, drizzle.config.ts, etc.

Where generators live (in a dedicated tooling repo):

dev-platform/                    # Your scaffolding + tooling repo
├── turbo/
│   └── generators/
│       ├── config.ts            # Plop config, registers all generators
│       └── templates/
│           ├── monorepo-app/    # Handlebars templates for full multi-surface app
│           ├── web-only/
│           ├── mobile-only/
│           └── api-only/
├── scripts/
│   └── bootstrap-services.sh   # Service wiring script
├── CLAUDE.md
├── AGENTS.md
├── package.json
└── turbo.json

Service wiring script: scripts/bootstrap-services.sh

After code scaffolding, this script wires up the external services. Uses the CLIs from Hour 1.

What it does:





gh repo create <name> --private --source . -- create GitHub repo



gh api repos/{owner}/{repo}/branches/main/protection -- set branch protection



wrangler d1 create <name>-db -- create Cloudflare D1 database



wrangler pages project create <name>-web -- create Cloudflare Pages project (for web preview)



eas init -- initialize EAS project (for mobile apps)



sentry-cli projects create <name> -- create Sentry project (optional)



Write the generated IDs/names back into wrangler.toml, app.json, .env.example

Example usage:

# Step 1: Generate the code
turbo gen workspace --name my-new-app --copy monorepo-app

# Step 2: Wire up services
cd my-new-app
./scripts/bootstrap-services.sh --name my-new-app --type monorepo

Done when: The scaffolder can generate a project with the right structure, and the service wiring script can create GitHub + Cloudflare + EAS projects. Does not need to be perfect -- you will fix it in Hours 3-5 as you use it on real apps.

Hour 3: Use Scaffolder to Create App 1

Goal: Use the scaffolder on a real app, verify it works, fix the scaffolder on the spot.

What to do:





Pick your first real app (VeriCam or Yours Truly)



Run the scaffolder to generate the project



Run the service wiring script



Verify: does the structure look right? Does lint/typecheck pass? Do the scripts work?



Fix any scaffolder issues immediately -- this is the feedback loop



Push to GitHub, confirm repo is set up correctly

What to test:





pnpm install works



pnpm dev starts the app



pnpm lint and pnpm typecheck pass



AGENTS.md and CLAUDE.md are present and make sense



GitHub repo exists with branch protection

Done when: App 1 exists on GitHub with clean structure, passing checks, and agent instructions. Any scaffolder bugs found are fixed.

Hour 4: CI + Preview on App 1

Goal: Get the full PR loop working on the first app.

CI:





GitHub Actions workflow: lint, typecheck, test, build



Branch protection on main: require CI to pass

Preview (depends on app type):





Web: connect to Cloudflare Pages for automatic preview URLs on PRs



Expo: wire up EAS Update for JS-only PRs, EAS Build trigger for native-affecting PRs



PR comment should include the preview link or build status

What to test:





Push a branch with a visible change



Open PR



CI runs, preview deploys



Open the preview on your phone



For Expo: load the update on your actual iPhone

Done when: You can review a real working preview from your phone browser or device.

Hour 5: Use Scaffolder for App 2, Repeat

Goal: Prove the scaffolder and pattern transfer to a second app.

What to do:





Run the scaffolder for app 2 (the other of VeriCam / Yours Truly)



Run service wiring



Apply CI + preview setup



Open a PR, confirm the full loop works

What to test:





How long did it take compared to app 1?



Did the scaffolder produce a working project without manual fixes?



Did the agent instructions transfer cleanly?



Feed any improvements back into the scaffolder templates

Done when: Two apps both run the full loop: code -> PR -> CI -> preview -> review from phone. Scaffolder improvements from app 1 are already baked in.

Hour 6: Full End-to-End Test + Iterate

Goal: Prove the whole system works end to end from phone and polish the scaffolder.

End to end test:





From your phone, connect to Claude Code on Mac Mini



Give it a feature task on one of the apps



Watch it branch, implement, open PR



CI triggers, preview deploys



Review the preview on your phone



Approve or request changes

Iterate on scaffolder:





Feed all learnings from app 1 and app 2 back into templates



Better AGENTS.md content based on what agents got wrong



CI workflow tweaks



Service wiring fixes



Bonus: scaffold app 3 to prove the improved version works

Done when: You trust that starting any new app takes minutes, not hours.



Reference Structures

These are the directory structures the scaffolder templates should produce. Kept here for reference.

Monorepo (default for multi-surface apps)

One repo per product. API, web, and mobile share types, Zod schemas, and utilities via packages/shared/.

<app-name>/
├── apps/
│   ├── api/                     # Hono + Drizzle backend
│   │   ├── src/
│   │   │   ├── app/             # router.ts, routes/, handlers/, services/, schemas/, types.ts
│   │   │   ├── platform/        # cloudflare.ts (thin adapter, like curio)
│   │   │   └── db/              # Drizzle schema, migrations, client
│   │   ├── tests/
│   │   ├── wrangler.toml
│   │   ├── drizzle.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── web/                     # Landing page + web app (Vite + React)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── lib/
│   │   ├── tests/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── mobile/                  # Expo + React Native
│       ├── src/
│       │   ├── app/             # Expo Router (thin routes)
│       │   ├── screens/
│       │   ├── components/
│       │   ├── services/        # Business logic (no RN imports)
│       │   ├── platform/        # Native module wrappers
│       │   ├── hooks/
│       │   ├── providers/
│       │   ├── lib/
│       │   └── theme.ts
│       ├── assets/
│       ├── ios/
│       ├── android/
│       ├── app.json
│       ├── eas.json
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── shared/                  # Types, Zod schemas, constants used by all apps
│   │   ├── src/
│   │   │   ├── schemas/         # API request/response Zod schemas (single source of truth)
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── ui/                      # Optional: shared UI primitives
│       └── package.json
├── scripts/
│   ├── dev.sh
│   └── status.sh
├── docs/decisions/
├── CLAUDE.md
├── AGENTS.md
├── .claude/rules/*.md
├── .cursor/rules/*.mdc
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── .nvmrc
└── .gitignore

Single-Surface Web App (Hono + Drizzle)

Platform separation pattern from curio: src/platform/cloudflare.ts is a thin adapter, core logic in src/app/ depends on interfaces not infrastructure.

<app-name>/
├── src/
│   ├── app/                 # router.ts, routes/, handlers/, services/, schemas/, types.ts
│   ├── platform/            # cloudflare.ts (swap to node.ts later if needed)
│   ├── db/                  # Drizzle schema, migrations, client
│   ├── lib/                 # Shared utilities, types, constants
│   ├── workers/             # Queue consumers, cron handlers
│   └── web/                 # Landing page / frontend (Vite + React)
├── scripts/
├── docs/decisions/
├── tests/
├── CLAUDE.md
├── AGENTS.md
├── .claude/rules/*.md
├── .cursor/rules/*.mdc
├── drizzle.config.ts
├── wrangler.toml
├── vitest.config.ts
├── tsconfig.json
├── tsconfig.worker.json
├── package.json
├── .nvmrc
└── .gitignore

Single-Surface Mobile App (Expo)

Same separation: routes thin, services framework-agnostic, native code isolated in src/platform/.

<app-name>/
├── src/
│   ├── app/                 # Expo Router file-based routes (thin)
│   ├── screens/             # Screen implementations
│   ├── components/          # Reusable UI
│   ├── services/            # Business logic (no RN imports)
│   ├── schemas/             # Zod validation
│   ├── platform/            # Native module wrappers
│   ├── hooks/
│   ├── providers/
│   ├── lib/
│   └── theme.ts
├── assets/
├── scripts/
├── docs/decisions/
├── tests/
├── ios/
├── android/
├── CLAUDE.md
├── AGENTS.md
├── .claude/rules/*.md
├── .cursor/rules/*.mdc
├── app.json
├── eas.json
├── tsconfig.json
├── package.json
├── .nvmrc
└── .gitignore

Structural Parallels (web and mobile follow the same mental model)







Concern



Web App



Mobile App





Routing (thin)



src/app/routes/



src/app/ (Expo Router)





Handlers/Screens



src/app/handlers/



src/screens/





Business logic



src/app/services/



src/services/





Validation



src/app/schemas/



src/schemas/





Platform adapters



src/platform/cloudflare.ts



src/platform/ (native)





Shared utilities



src/lib/



src/lib/





UI components



src/web/components/



src/components/

Agent Instructions (all repos)





AGENTS.md -- tool-agnostic source of truth (project purpose, commands, stack, structure, mistake guards)



CLAUDE.md -- references AGENTS.md, adds Claude Code specifics (Skills, permissions)



.claude/rules/*.md -- modular Claude Code rules (stack, testing, safety)



.cursor/rules/*.mdc -- Cursor IDE rules, same content adapted

Write guidance in AGENTS.md. Let CLAUDE.md and .cursor/rules/ reference it with tool-specific hooks.

Stack Defaults (Use These Unless There Is a Reason Not To)





Language: TypeScript everywhere



Package manager: pnpm



API framework: Hono (runs on Cloudflare Workers, Vercel Edge, Bun, Node)



ORM: Drizzle (lightweight, edge-friendly, works with D1/Turso/Postgres)



Database: Cloudflare D1 to start (upgrade to Turso or Neon Postgres when needed)



Web frontend: Vite + React (upgrade to Next.js only if SSR is needed)



Mobile framework: Expo (managed workflow, dev builds when native modules demand it)



Hosting/backend: Cloudflare Workers



Web previews: Cloudflare Pages



Mobile builds: EAS Build + EAS Update



CI: GitHub Actions



Testing: Vitest (web/API), Jest or Vitest (Expo)



Formatting: Biome (fast, replaces ESLint + Prettier) or ESLint + Prettier if Biome gaps appear



Remote coding: Claude Code CLI on Mac Mini or MacBook with remote control from phone



Desktop coding: Cursor on MacBook or Mac Mini



Async parallel work: Claude Code cloud agents or Codex for tasks that do not need any local machine



Agent instructions: AGENTS.md (tool-agnostic) + CLAUDE.md (Claude Code) + .cursor/rules/ (Cursor)



Source of truth: GitHub (code, PRs, decisions, CI results)

CLI Tools To Install On Mac Mini + MacBook

These should be available on both machines so agents and you can use them from anywhere:

Essential:





gh -- GitHub CLI (create PRs, manage issues, review from terminal)



wrangler -- Cloudflare CLI (deploy workers, manage D1, tail logs)



pnpm -- package manager



node via fnm or nvm -- pinned to LTS (20+)



git -- obviously



tmux -- session persistence



claude -- Claude Code CLI

Mobile/Apple:





eas-cli -- Expo Application Services (builds, updates, submit)



expo-cli -- Expo dev tools



xcode-select / Xcode -- for native iOS builds



cocoapods -- if native modules need it



fastlane -- optional, for signing/release automation later

Infrastructure:





tailscale -- mesh VPN for remote access



docker -- optional, for local services that need isolation

Useful:





jq -- JSON processing in scripts



ripgrep (rg) -- fast code search



fzf -- fuzzy finder



bat -- better cat with syntax highlighting

Services and Accounts To Have Ready

Must have:





GitHub -- repos, PRs, Actions CI



Cloudflare -- Workers, Pages, D1, R2 (storage)



Expo / EAS -- mobile builds and OTA updates



Apple Developer Program -- signing, TestFlight, App Store



Tailscale -- remote access to Mac Mini

Should have soon:





Sentry -- error tracking and crash reporting (web and mobile)



Turso or Neon -- when D1 is not enough (multi-region, Postgres features)

Nice to have later:





Posthog or Plausible -- analytics



Upstash -- Redis/queues on edge (for async job processing in Yours Truly)



Resend or Postmark -- transactional email



1Password or Doppler -- secrets management across many projects

Common AI Mistake Guards (Bake Into Every Repo)

These go in AGENTS.md (tool-agnostic source of truth), then referenced by CLAUDE.md and .cursor/rules/:





Do not switch package managers or add major dependencies without asking



Run lint, typecheck, and tests before claiming anything is done



Keep PRs focused on one thing -- do not bundle unrelated changes



Write decisions down in docs/decisions/ rather than leaving them in conversation



Do not modify CI workflows, deploy configs, or signing without explicit approval



When stuck, say so -- do not silently guess and ship broken code



For Expo: do not assume Expo Go works when native modules are involved



For Expo: anything touching ios/, app.json, or native deps requires a dev build, not just EAS Update



For web: keep the dev server startable with one command



For Hono/Drizzle: do not change the DB schema without generating and reviewing a migration



Always use path aliases (@/) instead of deep relative imports

What NOT To Do Today





Do not build a template generator or scaffolder -- just copy the working repo



Do not build dashboards or cost tracking automation



Do not over-engineer the instruction hierarchy -- start with AGENTS.md + CLAUDE.md + a few modular rules



Do not try to set up all 5+ apps -- prove the pattern with 2



Do not over-document -- write just enough that you remember next week


