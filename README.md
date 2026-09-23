# Pulsar user config

My Pulsar setup (`~/.pulsar`), kept on this orphan branch of my fork so it's
separate from the Pulsar source on `master`.

## Install on a new machine

**Step 1: get Pulsar itself onto the machine.**

- macOS/Windows, or Linux if a release happens to exist for it: download
  from https://pulsar-edit.dev and install normally.
- Linux otherwise (this is the normal case — see below): build from
  source, following "Building Pulsar from source on Linux" first, then
  come back here.

**Step 2: install this config.**

```bash
git clone -b user-config https://github.com/marneylc/pulsar.git pulsar-config
cd pulsar-config && ./install.sh
```

For `claude-chat` this also needs the Claude Code CLI logged in —
`install.sh` checks and prints the install command if it's missing.

If `~/pulsar` exists (a source build), `install.sh` also links
`bin/pulsar` and `bin/ppm` from this repo into `~/.local/bin`, so plain
`pulsar` and `ppm` commands work afterwards. This matters because
upstream's own `pulsar.sh`/`ppm` don't work against a raw git checkout —
they expect a packaged install's directory layout (`resources/app/...`
alongside a top-level `pulsar` binary), which `yarn build` doesn't
produce; `bin/pulsar` just runs `yarn start` from `~/pulsar`, and
`bin/ppm` sets `ATOM_ELECTRON_VERSION` (see the electron-version note
below) before calling `~/pulsar/ppm/bin/ppm` directly.

## Building Pulsar from source on Linux

Pulsar has no official Linux binary release cadence as reliable as building
from `master`, so on Ubuntu/apt boxes (this is what's set up on
`CX-2UA54333GL`) build it yourself first. Three traps to avoid, then the
build:

1. **Ignore apt's `node`/`yarn`.** Ubuntu 22.04 ships Node 12, but Pulsar's
   `package.json` requires `node >=20.16.0` (pinned in `.nvmrc`). Use
   [nvm](https://github.com/nvm-sh/nvm) instead of the apt package — it
   installs to `~/.config/nvm`, needs no sudo, and won't touch the system
   Node:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   # reopen the shell, or: export NVM_DIR="$HOME/.config/nvm"; . "$NVM_DIR/nvm.sh"
   nvm install 20.16.0 && nvm alias default 20.16.0
   ```
2. **`/usr/bin/yarn` from apt is not Yarn.** On Debian/Ubuntu that package
   is `cmdtest`'s unrelated `yarn` tool (reports version `0.32+git`). Get
   the real one via Corepack, which ships with Node ≥16 and takes
   priority on `PATH` once nvm's Node is active:
   ```bash
   corepack enable
   corepack prepare yarn@1.22.22 --activate
   ```
3. **Native modules need Wayland/xkb headers**, not just X11. The sway
   setup installed the runtime `libwayland-client0`/`libxkbcommon0` libs,
   but not the `-dev` headers node-gyp needs to compile against them, and
   `claude-chat`'s `keytar` dependency needs `libsecret`:
   ```bash
   sudo apt-get update && sudo apt-get install -y \
     libwayland-dev libxkbcommon-dev libxkbfile-dev libsecret-1-dev
   ```
   (`build-essential`, `libx11-dev`, and `fakeroot` are already covered by
   `~/dotfiles/apt-and-sudo-steps.sh` from the sway setup.)

With those in place:

```bash
git clone --recurse-submodules https://github.com/marneylc/pulsar.git ~/pulsar   # master, the source
cd ~/pulsar
yarn install
yarn build
yarn build:apm
yarn start
```

(`yarn start`, not `./pulsar.sh` — the latter only works against a
packaged install, not a raw checkout; see the `bin/pulsar` note below.)

`--recurse-submodules` matters: `ppm/` is a git submodule
(`pulsar-edit/ppm`), and `yarn build:apm` silently no-ops in an empty
directory if it wasn't fetched (fix with `git submodule update --init`
after the fact). `yarn install` runs `electron-rebuild` as a postinstall
step, which is where the header requirements above actually get exercised
— that's the step that fails first if one is missing.

Once built, go back to step 2 above: `install.sh` finds
`~/pulsar/ppm/bin/ppm` on its own and reads `~/pulsar/package.json`'s
`electronVersion` to work around `ppm install` otherwise failing with
"Could not determine Electron version" — that error means ppm can't tell
what Electron a source checkout was built against (it normally gets this
from an installed release, which a source build isn't). If invoking `ppm`
directly instead of through `install.sh`, export `ATOM_ELECTRON_VERSION`
first (see `package.json`'s `electronVersion` field for the value).

## What's here

- `dotpulsar/` → copied into `~/.pulsar/`
  - `config.cson` — terminal colour theme, vim-mode-plus, no welcome screen
  - `keymap.cson` — `ctrl/shift-enter` sends line/selection to terminal;
    `alt-h/j/k/l` pane navigation (mirrors nvim)
  - `init.js` — the commands behind those keys (pane-nav works even inside
    the terminal; send-to-terminal starts the shell if needed)
  - `styles.less` — Caladan colour theme, matching sway/alacritty
- `packages.txt` — community packages, pinned to the versions I use:
  `claude-chat` + `pulsar-mcp` (Claude Code chat panel with editor tools),
  `vim-mode-plus`, `ex-mode`, `language-r`

## Updating

After changing config on a machine, copy the files back into `dotpulsar/`,
and refresh `packages.txt` with `ppm list --installed --bare`.
