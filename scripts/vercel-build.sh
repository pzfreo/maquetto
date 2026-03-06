#!/bin/bash
# Vercel build script — sets up git remote for full history, then builds

# Vercel's clone has no 'origin' remote. Add it so we can fetch full history.
REPO_URL="https://github.com/pzfreo/maquetto.git"
git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"
git fetch --unshallow origin main 2>/dev/null || git fetch --depth=100000 origin main 2>/dev/null || true

echo "Build number: $(git rev-list --count HEAD)"

pnpm build
