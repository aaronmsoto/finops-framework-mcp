#!/usr/bin/env bash
# Publish the package in the current directory unless this exact version is
# already on npm (used by .github/workflows/publish.yml).
set -euo pipefail
name=$(node -p "require('./package.json').name")
version=$(node -p "require('./package.json').version")
if npm view "${name}@${version}" version >/dev/null 2>&1; then
  echo "${name}@${version} is already on npm; skipping publish."
  exit 0
fi
npm publish --access public --provenance
