#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1; then
  printf 'Error: node is not installed. Please install Node.js 18+ and try again.\n' >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  printf 'Error: npm is not installed. Please install npm 9+ and try again.\n' >&2
  exit 1
fi

printf '==> Installing dependencies\n'
npm install

printf '==> Running type check\n'
npm run typecheck

printf '==> Running lint\n'
npm run lint

printf '==> Running tests\n'
npm test

printf '==> Building macOS package\n'
npm run make -- --platform=darwin

printf '\nBuild complete. Check artifacts in out/make/.\n'

if [ -z "${APPLE_ID:-}" ] || [ -z "${APPLE_APP_SPECIFIC_PASSWORD:-}" ] || [ -z "${APPLE_TEAM_ID:-}" ]; then
  printf 'Note: APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID are not fully set, so notarization will be skipped.\n'
fi
