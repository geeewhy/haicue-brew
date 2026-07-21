#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CASK="$ROOT/Casks/haicue.rb"

version=""
sha256=""
arch="aarch64"

usage() {
  cat >&2 <<'EOF'
usage: update-haicue-cask.sh --version <version> --sha256 <sha256> [--arch aarch64]

Updates Casks/haicue.rb for the latest public Haicue DMG.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      version="${2:-}"
      shift 2
      ;;
    --sha256)
      sha256="${2:-}"
      shift 2
      ;;
    --arch)
      arch="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$version" || -z "$sha256" ]]; then
  usage
  exit 1
fi

case "$arch" in
  aarch64) ;;
  *)
    echo "unsupported arch: $arch" >&2
    exit 1
    ;;
esac

if [[ ! "$sha256" =~ ^[0-9a-fA-F]{64}$ ]]; then
  echo "sha256 must be a 64-character hex digest" >&2
  exit 1
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

cat > "$tmp" <<EOF
cask "haicue" do
  arch arm: "$arch"

  version "$version"
  sha256 arm: "$(printf '%s' "$sha256" | tr '[:upper:]' '[:lower:]')"

  url "https://downloads.haicue.com/public/releases/public/#{version}/macos/#{arch}/Haicue_#{version}_#{arch}.dmg"
  name "Haicue"
  desc "Threaded workspace for agent work"
  homepage "https://haicue.com/"

  auto_updates true
  depends_on arch: :arm64
  depends_on :macos
  app "Haicue.app"

  zap trash: [
    "~/.haicue",
    "~/Library/Application Support/com.devheart.haicue",
    "~/Library/Application Support/com.gy.claude-window",
    "~/Library/Caches/com.devheart.haicue",
    "~/Library/Caches/com.gy.claude-window",
    "~/Library/HTTPStorages/com.devheart.haicue",
    "~/Library/HTTPStorages/com.gy.claude-window",
    "~/Library/Preferences/com.devheart.haicue.plist",
    "~/Library/Preferences/com.gy.claude-window.plist",
    "~/Library/Saved Application State/com.devheart.haicue.savedState",
    "~/Library/Saved Application State/com.gy.claude-window.savedState",
    "~/Library/WebKit/com.devheart.haicue",
    "~/Library/WebKit/com.gy.claude-window",
  ]
end
EOF

mv "$tmp" "$CASK"
echo "updated $CASK"
