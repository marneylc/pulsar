# Pulsar user config

My Pulsar setup (`~/.pulsar`), kept on this orphan branch of my fork so it's
separate from the Pulsar source on `master`.

## Install on a new machine

```bash
git clone -b user-config https://github.com/marneylc/pulsar.git pulsar-config
cd pulsar-config && ./install.sh
```

Needs Pulsar installed (a recent release that bundles the `terminal`
package) and, for `claude-chat`, the Claude Code CLI logged in.

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
git clone https://github.com/marneylc/pulsar.git ~/pulsar   # master, the source
cd ~/pulsar
yarn install
yarn build
yarn build:apm
yarn start        # or: ./pulsar.sh
```

`yarn install` runs `electron-rebuild` as a postinstall step, which is
where the header requirements above actually get exercised — that's the
step that fails first if one is missing. Once `pulsar` is on `PATH` (or
via `~/pulsar/pulsar.sh`), come back here and run `./install.sh` to lay
down this config.

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
