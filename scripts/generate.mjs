#!/usr/bin/env node

// Scaffold a new project from templates with optional features
//
// Usage:
//   node scripts/generate.mjs web-only --name my-app [--output /path] [--db] [--auth] [--e2e]
//
// Features (all optional):
//   --db       Include D1 database + Drizzle ORM
//   --auth     Include Better Auth (requires --db)
//   --e2e      Include Playwright E2E testing with smoke/full tiers
//
// Examples:
//   node scripts/generate.mjs web-only --name my-app                    # minimal: API + web only
//   node scripts/generate.mjs web-only --name my-app --db               # with database
//   node scripts/generate.mjs web-only --name my-app --db --auth --e2e  # full stack

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, "../turbo/generators/templates");

// --- Feature definitions ---
// Each feature declares its deps, devDeps, scripts, and which template directories it owns.
// Files inside feature-owned dirs are only included when that feature is enabled.

const FEATURES = {
  db: {
    deps: {
      "drizzle-orm": "^0.38.0",
    },
    devDeps: {
      "drizzle-kit": "^0.30.0",
    },
    scripts: {
      "db:generate": "drizzle-kit generate",
      "db:migrate": "drizzle-kit migrate",
      "db:studio": "drizzle-kit studio",
    },
    // Template paths owned by this feature (relative to template root)
    ownedPaths: ["src/db", "drizzle.config.ts"],
  },
  auth: {
    deps: {
      "better-auth": "^1.2.0",
    },
    devDeps: {},
    scripts: {},
    ownedPaths: ["src/auth"],
    requires: ["db"], // auth needs a database
  },
  e2e: {
    deps: {},
    devDeps: {
      "@playwright/test": "^1.50.0",
    },
    scripts: {
      "test:e2e": "playwright test",
      "test:e2e:smoke": "playwright test --grep @smoke",
      "test:e2e:ui": "playwright test --ui",
    },
    ownedPaths: ["e2e", "playwright.config.ts"],
  },
};

// --- Parse CLI args ---

const args = process.argv.slice(2);
const generator = args[0];
const nameIdx = args.indexOf("--name");
const outputIdx = args.indexOf("--output");

if (!generator || nameIdx === -1 || !args[nameIdx + 1]) {
  console.error(`Usage: node scripts/generate.mjs <generator> --name <app-name> [--output <path>] [--db] [--auth] [--e2e]`);
  console.error(`\nGenerators: ${fs.readdirSync(TEMPLATES_DIR).join(", ")}`);
  process.exit(1);
}

const name = args[nameIdx + 1];
const outputDir = outputIdx !== -1 ? path.resolve(args[outputIdx + 1]) : path.resolve(`./${name}`);
const templateDir = path.join(TEMPLATES_DIR, generator);

// Parse feature flags
const enabledFeatures = new Set();
for (const feature of Object.keys(FEATURES)) {
  if (args.includes(`--${feature}`)) {
    enabledFeatures.add(feature);
  }
}

// Check dependencies between features
for (const feature of enabledFeatures) {
  const requires = FEATURES[feature].requires || [];
  for (const req of requires) {
    if (!enabledFeatures.has(req)) {
      console.error(`Error: --${feature} requires --${req}`);
      process.exit(1);
    }
  }
}

if (!fs.existsSync(templateDir)) {
  console.error(`Generator "${generator}" not found. Available: ${fs.readdirSync(TEMPLATES_DIR).join(", ")}`);
  process.exit(1);
}

if (fs.existsSync(outputDir)) {
  console.error(`Error: ${outputDir} already exists`);
  process.exit(1);
}

// --- Handlebars-lite processor ---
// Supports: {{var}}, {{#if var}}...{{/if}}, {{#unless var}}...{{/unless}}

function processTemplate(content, vars) {
  // Process {{#if var}}...{{/if}} blocks (including multiline)
  content = content.replace(
    /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, body) => (vars[key] ? body : "")
  );

  // Process {{#unless var}}...{{/unless}} blocks
  content = content.replace(
    /\{\{#unless (\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
    (_, key, body) => (vars[key] ? "" : body)
  );

  // Process {{var}} substitutions
  content = content.replace(
    /\{\{(\w+)\}\}/g,
    (match, key) => vars[key] ?? match
  );

  // Restore GitHub Actions expressions: <% expr %> → ${{ expr }}
  content = content.replace(/<%\s*(.*?)\s*%>/g, (_, expr) => `\${{ ${expr} }}`);

  // Clean up excessive blank lines left by removed blocks
  content = content.replace(/\n{3,}/g, "\n\n");

  return content;
}

// --- Check if a path is owned by a disabled feature ---

function isOwnedByDisabledFeature(relativePath) {
  for (const [feature, config] of Object.entries(FEATURES)) {
    if (enabledFeatures.has(feature)) continue;
    for (const owned of config.ownedPaths) {
      if (relativePath === owned || relativePath.startsWith(owned + "/")) {
        return true;
      }
    }
  }
  return false;
}

// --- Copy and process templates ---

function copyDir(src, dest, vars, relativeBase = "") {
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    let destName = entry.name;

    // Compute the relative path from template root
    const isHbs = destName.endsWith(".hbs");
    const cleanName = isHbs ? destName.slice(0, -4) : destName;
    const relativePath = relativeBase ? `${relativeBase}/${cleanName}` : cleanName;

    // Skip files/dirs owned by disabled features
    if (isOwnedByDisabledFeature(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, path.join(dest, destName), vars, relativeBase ? `${relativeBase}/${destName}` : destName);
    } else if (isHbs) {
      const content = fs.readFileSync(srcPath, "utf-8");
      const processed = processTemplate(content, vars);
      // Skip files that are empty after template processing (just whitespace)
      if (processed.trim()) {
        fs.writeFileSync(path.join(dest, cleanName), processed);
        console.log(`  + ${relativePath}`);
      }
    } else {
      // Copy as-is (e.g. .gitkeep)
      fs.copyFileSync(srcPath, path.join(dest, cleanName));
    }
  }

  // Remove empty directories
  const entries = fs.readdirSync(dest);
  if (entries.length === 0) {
    fs.rmdirSync(dest);
  }
}

// --- Build template variables ---

const vars = {
  name,
  db: enabledFeatures.has("db"),
  auth: enabledFeatures.has("auth"),
  e2e: enabledFeatures.has("e2e"),
};

// --- Generate ---

const featureList = [...enabledFeatures];
console.log(`\nScaffolding "${generator}" app: ${name}`);
console.log(`Features: ${featureList.length ? featureList.join(", ") : "none (minimal)"}`);
console.log(`Output: ${outputDir}\n`);

copyDir(templateDir, outputDir, vars);

// --- Post-process package.json to add feature deps/scripts ---

const pkgPath = path.join(outputDir, "package.json");
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  for (const feature of enabledFeatures) {
    const config = FEATURES[feature];
    Object.assign(pkg.dependencies || {}, config.deps);
    Object.assign(pkg.devDependencies || {}, config.devDeps);
    Object.assign(pkg.scripts || {}, config.scripts);
  }

  // Remove empty dep objects
  if (Object.keys(pkg.dependencies).length === 0) delete pkg.dependencies;
  if (Object.keys(pkg.devDependencies).length === 0) delete pkg.devDependencies;

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

console.log(`\nDone! Next steps:`);
console.log(`  cd ${name}`);
console.log(`  pnpm install`);
console.log(`  pnpm dev`);
if (enabledFeatures.has("e2e")) {
  console.log(`  npx playwright install    # first time only`);
}
