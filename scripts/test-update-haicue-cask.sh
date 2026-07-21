#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/Casks" "$TMP/scripts"
cp "$ROOT/scripts/update-haicue-cask.sh" "$TMP/scripts/update-haicue-cask.sh"
chmod +x "$TMP/scripts/update-haicue-cask.sh"
touch "$TMP/Casks/haicue.rb"

digest="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
"$TMP/scripts/update-haicue-cask.sh" --version 9.8.7 --sha256 "$digest"

rg -q 'version "9\.8\.7"' "$TMP/Casks/haicue.rb"
rg -q "sha256 arm: \"$digest\"" "$TMP/Casks/haicue.rb"
rg -q 'com\.devheart\.haicue' "$TMP/Casks/haicue.rb"
rg -q 'com\.gy\.claude-window' "$TMP/Casks/haicue.rb"
ruby -c "$TMP/Casks/haicue.rb" >/dev/null

printf 'Homebrew cask updater tests passed.\n'
