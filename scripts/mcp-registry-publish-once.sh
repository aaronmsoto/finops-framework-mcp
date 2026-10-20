#!/usr/bin/env bash
# Submit a server.json to the MCP Registry unless that exact name@version is
# already listed (used by .github/workflows/publish.yml, so a release that
# bumps only one package does not fail on the others' unchanged manifests).
set -euo pipefail
manifest="$1"
name=$(node -p "require('./${manifest}').name")
version=$(node -p "require('./${manifest}').version")
encoded=$(node -p "encodeURIComponent(process.argv[1])" "$name")
url="https://registry.modelcontextprotocol.io/v0/servers/${encoded}/versions/${version}"
if [ "$(curl -sS -o /dev/null -w '%{http_code}' "$url")" = "200" ]; then
  echo "${name}@${version} is already in the MCP Registry; skipping."
  exit 0
fi
publisher publish "$manifest"
