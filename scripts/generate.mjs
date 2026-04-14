#!/usr/bin/env node

// Scaffold a new project from templates with optional features
//
// Usage:
//   node scripts/generate.mjs <generator> --name my-app [--output /path] [--feature1] [--feature2] ...
//
// Generators:
//   web-only     Hono API + Vite/React on Cloudflare Workers
//   mobile-only  Expo (React Native) app
//
// Features:
//   web-only:    --db, --auth (requires --db), --e2e (Playwright)
//   mobile-only: --e2e (Maestro)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, "../turbo/generators/templates");

// --- Generator + feature definitions ---
// Features are per-generator because the same flag (e.g. --e2e) can mean
// different things (Playwright for web, Maestro for mobile).

const GENERATORS = {
  "web-only": {
    features: {
      db: {
        deps: { "drizzle-orm": "^0.38.0" },
        devDeps: { "drizzle-kit": "^0.30.0" },
        scripts: {
          "db:generate": "drizzle-kit generate",
          "db:migrate": "drizzle-kit migrate",
          "db:studio": "drizzle-kit studio",
        },
        ownedPaths: ["src/db", "drizzle.config.ts"],
      },
      auth: {
        deps: { "better-auth": "^1.2.0" },
        devDeps: {},
        scripts: {},
        ownedPaths: ["src/auth"],
        requires: ["db"],
      },
      e2e: {
        deps: {},
        devDeps: { "@playwright/test": "^1.50.0" },
        scripts: {
          "test:e2e": "playwright test",
          "test:e2e:smoke": "playwright test --grep @smoke",
          "test:e2e:ui": "playwright test --ui",
        },
        ownedPaths: ["e2e", "playwright.config.ts"],
      },
    },
  },
  "mobile-only": {
    features: {
      e2e: {
        // Maestro is installed via shell, not npm. No deps/scripts.
        deps: {},
        devDeps: {},
        scripts: {},
        ownedPaths: [".maestro"],
      },
    },
  },
};

// --- Parse CLI args ---

const args = process.argv.slice(2);
const generator = args[0];
const nameIdx = args.indexOf("--name");
const outputIdx = args.indexOf("--output");

if (!generator || !GENERATORS[generator] || nameIdx === -1 || !args[nameIdx + 1]) {
  console.error(`Usage: node scripts/generate.mjs <generator> --name <app-name> [--output <path>] [feature flags]`);
  console.error(`\nGenerators: ${Object.keys(GENERATORS).join(", ")}`);
  for (const [gen, cfg] of Object.entries(GENERATORS)) {
    const flags = Object.keys(cfg.features).map((f) => `--${f}`).join(" ");
    console.error(`  ${gen}: ${flags}`);
  }
  process.exit(1);
}

const name = args[nameIdx + 1];
const outputDir = outputIdx !== -1 ? path.resolve(args[outputIdx + 1]) : path.resolve(`./${name}`);
const templateDir = path.join(TEMPLATES_DIR, generator);

const FEATURES = GENERATORS[generator].features;

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
  console.error(`Generator "${generator}" template directory missing: ${templateDir}`);
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
  if (fs.existsSync(dest)) {
    const entries = fs.readdirSync(dest);
    if (entries.length === 0) {
      fs.rmdirSync(dest);
    }
  }
}

// --- Build template variables ---

const vars = { name };
for (const feature of Object.keys(FEATURES)) {
  vars[feature] = enabledFeatures.has(feature);
}

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
    Object.assign(pkg.dependencies || {}, config.deps || {});
    Object.assign(pkg.devDependencies || {}, config.devDeps || {});
    Object.assign(pkg.scripts || {}, config.scripts || {});
  }

  // Remove empty dep objects
  if (pkg.dependencies && Object.keys(pkg.dependencies).length === 0) delete pkg.dependencies;
  if (pkg.devDependencies && Object.keys(pkg.devDependencies).length === 0) delete pkg.devDependencies;

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

console.log(`\nDone! Next steps:`);
console.log(`  cd ${name}`);
console.log(`  pnpm install`);
if (generator === "mobile-only") {
  console.log(`  # Update app.config.ts: set 'owner' to your Expo username`);
  console.log(`  eas init       # create EAS project and link`);
  console.log(`  pnpm dev       # start Expo dev server`);
} else {
  console.log(`  pnpm dev`);
}
if (enabledFeatures.has("e2e") && generator === "web-only") {
  console.log(`  npx playwright install    # first time only`);
}
