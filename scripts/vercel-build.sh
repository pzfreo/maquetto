#!/bin/bash
# Vercel build script — fetches full git history for accurate build number

echo "=== Git debug ==="
echo "Before fetch: $(git rev-list --count HEAD) commits"
git remote -v
echo "Shallow: $(git rev-parse --is-shallow-repository)"

git fetch --unshallow origin 2>&1 || echo "unshallow failed"
git fetch --depth=100000 origin main 2>&1 || echo "deep fetch failed"

echo "After fetch: $(git rev-list --count HEAD) commits"
echo "=== End git debug ==="

pnpm build
