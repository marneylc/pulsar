// Alt+h/j/k/l pane navigation that works everywhere, including inside
// the terminal. xterm.js consumes Alt+<letter> (sends ESC <letter>)
// and stops propagation, so Pulsar's keymap (a bubble-phase listener on
// document) never sees it. Intercept in the capture phase instead.
const paneNav = {
  KeyH: 'window:focus-pane-on-left',
  KeyJ: 'window:focus-pane-below',
  KeyK: 'window:focus-pane-above',
  KeyL: 'window:focus-pane-on-right',
};

// Electron's Linux menu bar highlights on an Alt press/release with no other
// key in between. Since we swallow the h/j/k/l keydown, it never sees one,
// so also swallow the Alt keyup that ends a pane-nav chord.
let swallowAltUp = false;

window.addEventListener('keyup', (event) => {
  if (event.key !== 'Alt' || !swallowAltUp) return;
  swallowAltUp = false;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Alt') { if (!event.repeat) swallowAltUp = false; return; }
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const command = paneNav[event.code];
  if (!command) return;
  swallowAltUp = true;
  event.preventDefault();
  event.stopImmediatePropagation();
  atom.commands.dispatch(atom.views.getView(atom.workspace), command);
}, true);

// Send the current line (or selection) to a terminal and advance the cursor.
// Targets Pulsar's built-in `terminal` package (<pulsar-terminal> elements,
// terminal:// URIs): the terminal most recently focused, else a visible one,
// else any.
let lastTerminalElement = null;

window.addEventListener('focusin', (event) => {
  const el = event.target.closest && event.target.closest('pulsar-terminal');
  if (el) lastTerminalElement = el;
}, true);

function findTargetTerminal() {
  const terminals = atom.workspace.getPaneItems().filter((item) =>
    typeof item.getURI === 'function' &&
    String(item.getURI()).startsWith('terminal://') &&
    item.element);
  const isVisible = (item) => {
    const pane = atom.workspace.paneForItem(item);
    const dock = pane && pane.getContainer();
    return pane && pane.getActiveItem() === item &&
      (!dock || !dock.isVisible || dock.isVisible());
  };
  return terminals.find((t) => t.element === lastTerminalElement) ||
    terminals.find(isVisible) || terminals[0];
}

// The terminal only spawns a terminal's shell the first time it becomes
// visible (e.g. terminals restored at startup, or sitting in a background tab or
// hidden dock), so bring the target into view and wait for its shell to start.
async function ensureTerminalRunning(terminal) {
  const el = terminal.element;
  if (el.isPtyProcessRunning()) return true;
  const pane = atom.workspace.paneForItem(terminal);
  if (!pane) return false;
  pane.activateItem(terminal);
  const dock = pane.getContainer();
  if (dock && dock.show) dock.show();
  for (let i = 0; i < 50 && !el.isPtyProcessRunning(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return el.isPtyProcessRunning();
}

atom.commands.add('atom-text-editor:not([mini])', 'user:send-line-to-terminal', async () => {
  const editor = atom.workspace.getActiveTextEditor();
  if (!editor) return;
  const terminal = findTargetTerminal();
  if (!terminal) {
    atom.notifications.addWarning('No terminal open to send to.');
    return;
  }
  let text = editor.getSelectedText().replace(/[\r\n]+$/, '');
  if (!text) {
    text = editor.lineTextForBufferRow(editor.getCursorBufferPosition().row);
    editor.moveDown(1);
  }
  if (!(await ensureTerminalRunning(terminal))) {
    atom.notifications.addWarning('Terminal shell is not running (exited or failed to start).');
    return;
  }
  terminal.element.pty.write(text + '\r');
});
