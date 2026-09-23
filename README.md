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
