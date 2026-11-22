# santa-claude

My Claude Code toolkit: a plugin marketplace for the plugins I build, plus my global
config, so a new machine can be set up from this one repo.

## What's here

| Path | What it is |
|---|---|
| `.claude-plugin/marketplace.json` | Makes this repo a plugin marketplace named `santa-claude` |
| `plugins/task-band/` | A mod that draws a 3-column band above the prompt: progress %, task + status, and numbered y/n decisions you can answer with `1 y, 2 n` |
| `config/CLAUDE.md` | Global instructions (`~/.claude/CLAUDE.md`) |
| `config/statusline.js` | Status line: model, context %, 5h/7d limits, effort |
| `config/settings.json` | Global settings; also registers this marketplace and enables task-band |
| `setup.ps1` | Copies `config/` into `~/.claude`, backing up anything it replaces, and sets git's global `user.email` to my GitHub noreply address |

Third-party skills are not copied here. They come from their own sources: Matt Pocock's
skills via the `mattpocock-skills` plugin synced from claude.ai, and superpowers via its marketplace.

## task-band

A band above the prompt that shows what Claude is doing and what it needs from you.

| Column | Shows |
|---|---|
| **Progress** | A large %, worked out from Claude's task list (steps done out of total). `…` when there's no task list. While Claude is working, this is the only column at full brightness. |
| **Task** | A very short description of your last request, plus a status: ● running, ✓ done, ⏸ waiting on you, ✗ failed |
| **Decisions [y/n]** | Numbered questions for you, each answerable with y, n or continue |

- **Answering:** reply `1 y, 2 n, 3 continue`. Before Claude sees the message, the mod expands it with each question's text, e.g. `1 (Commit the changes?): yes`, so an answer can't land on the wrong item. A message that isn't purely numbered answers is sent unchanged.
- **Layout:** side by side, with thin vertical dividers, on wide windows. Below 80 columns the sections stack, separated by a horizontal line the full width of the band.
- **How it's fed:** the mod registers a `report` tool and adds a system-prompt section telling Claude to call it at the end of every turn. Progress comes from Claude's task-list updates, so it moves without extra calls.

## Set up a new machine (Windows)

Prerequisites: Git, Node.js (for the status line), Claude Code.

```powershell
git clone https://github.com/microampere/santa-claude C:\ws\santa-claude
```

```powershell
powershell -ExecutionPolicy Bypass -File C:\ws\santa-claude\setup.ps1
```

Then start Claude Code. If the task band doesn't appear, install it yourself:

```powershell
claude plugin install task-band --marketplace microampere/santa-claude
```

If that says the marketplace is unknown, add it first:

```powershell
claude plugin marketplace add microampere/santa-claude
```

Or at the prompt of a terminal session: `/plugin install task-band --marketplace microampere/santa-claude`.
Answer `y` to add the marketplace, then pick the user scope.

In the desktop app, where `/plugin` doesn't run: click + next to the prompt box, choose Plugins,
then Add marketplace with `microampere/santa-claude`, then Add plugin.

## Keeping it in sync

**Config.** `setup.ps1` copies files; it doesn't link them. After you edit `~/.claude/CLAUDE.md`,
`statusline.js` or `settings.json` on a machine, copy the file back into `config/` and commit it.

**Plugins.** To pick up a new plugin version on a machine:

```powershell
claude plugin marketplace update santa-claude
```

```powershell
claude plugin update task-band@santa-claude
```

Then start a new session. The marketplace is also set to auto-update.

**Changing a plugin.** Edit it under `plugins/<name>/`, bump `version` in its
`.claude-plugin/plugin.json` (an update only installs when the version changes), check it
with `claude plugin validate .`, then commit and push.

## Notes

- `settings.json` allows `Bash(*)` and skips the dangerous-mode prompt. That's deliberate for my own machines.
  Review it before using it anywhere else.
- `settings.local.json` is per-machine and is never tracked.
