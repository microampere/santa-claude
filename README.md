# santa-claude

My Claude Code toolkit: a plugin marketplace for the plugins I build, plus my global
config, so a new machine can be set up from this one repo.

## What's here

| Path | What it is |
|---|---|
| `.claude-plugin/marketplace.json` | Makes this repo a plugin marketplace named `santa-claude` |
| `plugins/task-band/` | A mod that draws a 3-column band above the prompt: progress %, task + status, and numbered y/n decisions you can answer with `1 y, 2 n` |
| `config/CLAUDE.md` | Global instructions (`~/.claude/CLAUDE.md`) |
| `config/statusline.js` | Status line: model, effort, context % and tokens, 5h/7d limits |
| `config/settings.json` | Global settings; also registers this marketplace and enables task-band |
| `setup.ps1` | Copies `config/` into `~/.claude` (backing up anything it replaces), installs task-band, sets git's global user, author and committer email to my GitHub noreply address, then checks each step |

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

Prerequisites: Git, Node.js (for the status line), Claude Code, signed in.

The easy way: start Claude Code and tell it
`Set up my Claude from github.com/microampere/santa-claude`. It follows the steps in
"For Claude" below. Everything installs at user level (`~/.claude`, user-scope plugins,
global git config); no project folder is touched.

Or do it yourself:

```powershell
git clone https://github.com/microampere/santa-claude C:\ws\santa-claude
```

```powershell
powershell -ExecutionPolicy Bypass -File C:\ws\santa-claude\setup.ps1
```

It installs the config files and the task-band plugin, sets git's commit email, and ends
with a PASS/FAIL check of each one. It's safe to run again. Restart Claude Code afterwards.

### For Claude: setting up this machine

If the user asked you to set up their Claude from this repo, this is the whole job.
`setup.ps1` is the source of truth. Don't copy or edit files by hand.

1. Check that `git`, `node` and `claude` are on PATH. If any is missing, tell the user which and stop.
2. Clone this repo to `C:\ws\santa-claude`. If it's already there, `git pull` instead.
3. Run `powershell -ExecutionPolicy Bypass -File C:\ws\santa-claude\setup.ps1`.
4. Read its output. Every line under `Checking:` must say PASS and the exit code must be 0.
   If anything fails, report the failing lines to the user. Don't work around them.
5. Tell the user to quit every Claude Code session and start a new one. Config and plugins
   load at startup, so the current session won't show the changes.

What this repo deliberately does not manage:

- Credentials and sign-in. The user signs in to Claude Code themselves.
- `~/.claude/settings.local.json`, which is per-machine.
- Skills and plugins synced from claude.ai (`mattpocock-skills`), and claude.ai connectors.
  Both come back when the user signs in.
- Desktop app (Code tab) preferences.
- The `claude-code-plugins` marketplace (anthropics/claude-code). No plugin in use comes from it.

## Keeping it in sync

**Config.** This repo is the only source of truth for user-level config. `setup.ps1` copies
files; it doesn't link them. After you edit `~/.claude/CLAUDE.md`, `statusline.js` or
`settings.json` on a machine, copy the file back into `config/` and commit it.

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
