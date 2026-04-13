#!/usr/bin/env bash
set -euo pipefail

# Bootstrap external services for a new app
# Usage: ./scripts/bootstrap-services.sh --name my-app [--type web|api|mobile|monorepo] [--dry-run]

NAME=""
TYPE="web"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --name) NAME="$2"; shift 2 ;;
    --type) TYPE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ -z "$NAME" ]]; then
  echo "Error: --name is required"
  echo "Usage: ./scripts/bootstrap-services.sh --name my-app [--type web] [--dry-run]"
  exit 1
fi

run() {
  if $DRY_RUN; then
    echo "[dry-run] $*"
  else
    echo ">>> $*"
    "$@"
  fi
}

echo "=== Bootstrapping services for: $NAME (type: $TYPE) ==="
echo ""

# 1. Initialize git if needed
if [[ ! -d .git ]]; then
  echo "--- Initializing git ---"
  run git init -b main
  run git add -A
  run git commit -m "Initial scaffold"
fi

# 2. Create GitHub repo
echo ""
echo "--- Creating GitHub repo ---"
if gh repo view "$NAME" &>/dev/null; then
  echo "Repo $NAME already exists, skipping"
else
  run gh repo create "$NAME" --private --source . --push
fi

# 3. Set branch protection on main
echo ""
echo "--- Setting branch protection ---"
OWNER=$(gh api user --jq '.login')
run gh api "repos/$OWNER/$NAME/branches/main/protection" \
  --method PUT \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["check"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
EOF

# 4. Cloudflare D1 (for web and api types)
if [[ "$TYPE" == "web" || "$TYPE" == "api" || "$TYPE" == "monorepo" ]]; then
  echo ""
  echo "--- Creating Cloudflare D1 database ---"
  D1_OUTPUT=$(run wrangler d1 create "${NAME}-db" 2>&1) || true
  echo "$D1_OUTPUT"

  # Extract database_id and write to wrangler.toml
  DB_ID=$(echo "$D1_OUTPUT" | grep -o 'database_id = "[^"]*"' | head -1 | cut -d'"' -f2) || true
  if [[ -n "$DB_ID" && -f wrangler.toml ]]; then
    echo "Writing D1 database_id to wrangler.toml..."
    if ! $DRY_RUN; then
      sed -i '' "s/# database_id = \"\"/database_id = \"$DB_ID\"/" wrangler.toml
      # Uncomment the d1_databases block
      sed -i '' 's/# \[\[ d1_databases \]\]/[[ d1_databases ]]/' wrangler.toml
      sed -i '' 's/# binding = "DB"/binding = "DB"/' wrangler.toml
      sed -i '' "s/# database_name = \"${NAME}-db\"/database_name = \"${NAME}-db\"/" wrangler.toml
    fi
  fi
fi

# 5. Cloudflare Pages (for web types)
if [[ "$TYPE" == "web" || "$TYPE" == "monorepo" ]]; then
  echo ""
  echo "--- Creating Cloudflare Pages project ---"
  run wrangler pages project create "${NAME}-web" --production-branch main 2>&1 || echo "Pages project may already exist"
fi

echo ""
echo "=== Done! ==="
echo ""
echo "Next steps:"
echo "  cd $NAME"
echo "  pnpm install"
echo "  pnpm dev"
