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

Pulsar has no official Linux binary release cadence as reliable as
building from `master`, so build it yourself first. Machines this has
been done on: Ubuntu 22.04 (`CX-2UA54333GL`, apt), Arch, and
Bazzite/Fedora (rpm-ostree). **Only the Ubuntu path below has actually
been run end-to-end** — its commands were verified live on
`CX-2UA54333GL`. The Arch and Fedora/Bazzite package names are correct
to the best of available knowledge but untested; if a package name below
is wrong or renamed, `pacman -Ss <name>` (Arch) or `dnf search <name>`
(Fedora, or inside the Bazzite distrobox container below) will find the
current one. Update this note once they're confirmed on those boxes.

Three traps to avoid, then the build:

1. **Don't rely on the distro's `node`.** Pulsar's `package.json`
   requires `node >=20.16.0` (pinned in `.nvmrc`). Ubuntu 22.04's repo
   node is 12.x — far too old. Arch (rolling) and Fedora usually carry
   something newer, but pin the exact version with
   [nvm](https://github.com/nvm-sh/nvm) on all three anyway, so the same
   commands below work everywhere and nothing else on the system that
   depends on a particular system Node gets disturbed. Installs to
   `~/.config/nvm`, no sudo, same on every distro:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   # reopen the shell, or: export NVM_DIR="$HOME/.config/nvm"; . "$NVM_DIR/nvm.sh"
   nvm install 20.16.0 && nvm alias default 20.16.0
   ```
2. **Skip the distro's `yarn` package entirely.** On Debian/Ubuntu,
   `/usr/bin/yarn` from apt is `cmdtest`'s unrelated `yarn` tool
   (reports version `0.32+git`), not Yarnpkg — confirmed the hard way on
   `CX-2UA54333GL`. Rather than tracking which distros' `yarn` package is
   the real one, use Corepack everywhere — it ships with Node ≥16 and,
   once nvm's Node is active, its shim takes priority on `PATH` over
   any distro package regardless:
   ```bash
   corepack enable
   corepack prepare yarn@1.22.22 --activate
   ```
3. **Native modules need Wayland/xkb/X11/libsecret headers**, which
   node-gyp compiles against directly — this is the one genuinely
   distro-specific step, since it's real system packages, not anything
   nvm/Corepack can paper over. `claude-chat`'s `keytar` dependency is
   what needs libsecret; the rest is `@pulsar-edit/keyboard-layout`.

   **Debian/Ubuntu** (verified on `CX-2UA54333GL`):
   ```bash
   sudo apt-get update && sudo apt-get install -y \
     build-essential libx11-dev fakeroot \
     libwayland-dev libxkbcommon-dev libxkbfile-dev libsecret-1-dev
   ```
   (`build-essential`, `libx11-dev`, `fakeroot` were already covered by
   `~/dotfiles/apt-and-sudo-steps.sh` from the sway setup, hence not
   listed as newly-added in the original pass — included here so this
   block is complete standalone.)

   **Arch** (untested — Arch doesn't split runtime/`-dev` packages, so
   these single packages should cover both):
   ```bash
   sudo pacman -S --needed base-devel wayland libxkbcommon libxkbfile libsecret libx11
   ```

   **Fedora, non-atomic** (untested):
   ```bash
   sudo dnf install -y gcc-c++ make \
     wayland-devel libxkbcommon-devel libxkbfile-devel libsecret-devel libX11-devel
   ```

   **Bazzite / Fedora Atomic (Silverblue/Kinoite base)** (untested): this
   is the one place the distro actually changes the approach, not just
   the package manager. Bazzite's base image is immutable — `rpm-ostree
   install` works but layers onto the base image and needs a reboot to
   take effect, which is heavy for build-time-only headers you don't
   need after `yarn install` finishes. The idiomatic uBlue/Bazzite move
   is a [distrobox](https://distrobox.it/) (ships preconfigured on
   Bazzite) so the dev headers live in a disposable container instead of
   the host:
   ```bash
   distrobox create --name pulsar-build --image fedora:latest
   distrobox enter pulsar-build
   # inside the container:
   sudo dnf install -y gcc-c++ make \
     wayland-devel libxkbcommon-devel libxkbfile-devel libsecret-devel libX11-devel
   ```
   Then run the `nvm`/Corepack/`git clone`/`yarn` steps below inside that
   same `distrobox enter pulsar-build` shell too (nvm installs to
   `~/.config/nvm` inside the container's home, which distrobox shares
   with the host `$HOME` by default — check `distrobox enter` output if
   that's not the case on the version installed). The resulting
   `~/pulsar` checkout and `~/.pulsar` config are then usable from the
   host normally, via `distrobox-export` or just launching Pulsar from
   inside the container. If `rpm-ostree install` is preferred instead
   (e.g. to run Pulsar's Electron/Chromium sandbox unconfined, which can
   be fussier through a container), swap `dnf install` for `rpm-ostree
   install`, drop `sudo`, and reboot before continuing.

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
packaged install, not a raw checkout; see the `bin/pulsar` note in step 2
above.)

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
