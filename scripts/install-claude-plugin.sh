#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="${REPO_ROOT}/packages/adapter-claude-code"

echo "Building standalone Claude Code plugin bundle..."
cd "${REPO_ROOT}"
npm run build:claude-code-plugin

if command -v claude >/dev/null 2>&1; then
  echo "Validating plugin manifest..."
  claude plugin validate "${PLUGIN_DIR}"
else
  echo "Claude CLI not found in PATH, skipping manifest validation."
fi

cat <<EOF

Engram Claude Code plugin is ready.

Plugin directory:
  ${PLUGIN_DIR}

Run Claude Code with:
  claude --plugin-dir "${PLUGIN_DIR}"

After Claude starts, run:
  /reload-plugins

EOF
