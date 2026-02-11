#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIBS_DIR="$ROOT_DIR/.playwright-libs"
DEBS_DIR="$LIBS_DIR/debs"

if ! command -v apt >/dev/null 2>&1; then
  echo "apt is required to download browser dependency packages." >&2
  exit 1
fi

if ! command -v dpkg-deb >/dev/null 2>&1; then
  echo "dpkg-deb is required to extract browser dependency packages." >&2
  exit 1
fi

ASOUND_PACKAGE="libasound2"
if apt-cache policy libasound2 | grep -q "Candidate: (none)"; then
  ASOUND_PACKAGE="libasound2t64"
fi

mkdir -p "$DEBS_DIR"
cd "$DEBS_DIR"

echo "Downloading packages: libnspr4 libnss3 $ASOUND_PACKAGE"
apt download libnspr4 libnss3 "$ASOUND_PACKAGE"

rm -rf "$LIBS_DIR/usr" "$LIBS_DIR/lib" "$LIBS_DIR/etc" "$LIBS_DIR/var"
for deb in ./*.deb; do
  dpkg-deb -x "$deb" "$LIBS_DIR"
done

echo "Local Playwright libraries installed at:"
echo "  $LIBS_DIR/usr/lib/x86_64-linux-gnu"
