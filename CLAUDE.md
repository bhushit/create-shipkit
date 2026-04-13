# create-shipkit - Claude Code Instructions

See AGENTS.md for project context and rules.

## Commands

- `node scripts/generate.mjs web-only --name my-app [--db] [--auth] [--e2e]` — scaffold a new project
- `./scripts/bootstrap-services.sh --name my-app --type web [--dry-run]` — wire up services

## Working on This Repo

When modifying templates in `turbo/generators/templates/`, test by running the generator with different feature combos:
```
node scripts/generate.mjs web-only --name /tmp/test --output /tmp/test
node scripts/generate.mjs web-only --name /tmp/test --output /tmp/test --db --auth --e2e
```

Template syntax:
- `{{name}}` — variable substitution
- `{{#if db}}...{{/if}}` — conditional blocks
- `<% expr %>` — GitHub Actions expressions (converted to `${{ expr }}`)
