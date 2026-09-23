#!/usr/bin/env bash
# Install this Pulsar setup on a new machine:
#   - copies config/keymap/init/styles into ~/.pulsar (backing up existing ones)
#   - installs the community packages listed in packages.txt
#   - checks for the Claude Code CLI that claude-chat needs
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
dest="${PULSAR_HOME:-$HOME/.pulsar}"

# Find ppm: on PATH, via `pulsar -p`, or from a source checkout.
if command -v ppm >/dev/null; then
  ppm=(ppm)
elif command -v pulsar >/dev/null; then
  ppm=(pulsar -p)
elif [ -x "$HOME/pulsar/ppm/bin/ppm" ]; then
  ppm=("$HOME/pulsar/ppm/bin/ppm")
else
  echo "error: can't find ppm; install Pulsar first (https://pulsar-edit.dev)" >&2
  exit 1
fi

# A source build (the ppm/bin/ppm fallback above) isn't "installed", so
# ppm can't find its Electron version the normal way and errors with
# "Could not determine Electron version" on every install. Read it
# straight from the checkout's package.json instead.
if [ -z "${ATOM_ELECTRON_VERSION:-}" ] && [ -f "$HOME/pulsar/package.json" ]; then
  ATOM_ELECTRON_VERSION="$(node -p "require('$HOME/pulsar/package.json').electronVersion" 2>/dev/null || true)"
  [ -n "$ATOM_ELECTRON_VERSION" ] && export ATOM_ELECTRON_VERSION
fi

mkdir -p "$dest"
stamp="$(date +%Y%m%d-%H%M%S)"
for f in "$here"/dotpulsar/*; do
  name="$(basename "$f")"
  if [ -e "$dest/$name" ] && ! cmp -s "$f" "$dest/$name"; then
    cp "$dest/$name" "$dest/$name.bak-$stamp"
    echo "backed up $dest/$name -> $name.bak-$stamp"
  fi
  cp "$f" "$dest/$name"
  echo "installed $dest/$name"
done

grep -v '^\s*\(#\|$\)' "$here/packages.txt" | while read -r pkg; do
  echo "ppm install $pkg"
  "${ppm[@]}" install "$pkg"
done

if command -v claude >/dev/null; then
  echo "claude CLI found: $(command -v claude)"
else
  echo "note: claude-chat needs the Claude Code CLI:"
  echo "  curl -fsSL https://claude.ai/install.sh | bash   # then run 'claude' once to log in"
fi

echo "done - restart Pulsar (or Window: Reload)."
