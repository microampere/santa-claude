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
| `setup.ps1` | Copies `config/` into `~/.claude`, backing up anything it replaces |

Third-party skills are not copied here. They come from their own sources: Matt Pocock's
skills via the `mattpocock-skills` plugin synced from claude.ai, and superpowers via its marketplace.

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

Or at the prompt of a terminal session: `/plugin install task-band --marketplace microampere/santa-claude`.
Answer `y` to add the marketplace, then pick the user scope.

In the desktop app, where `/plugin` doesn't run: click + next to the prompt box, choose Plugins,
then Add marketplace with `microampere/santa-claude`, then Add plugin.

## Keeping it in sync

`setup.ps1` copies files; it doesn't link them. After you edit `~/.claude/CLAUDE.md`,
`statusline.js` or `settings.json` on a machine, copy the file back into `config/` and commit it.

## Notes

- `settings.json` allows `Bash(*)` and skips the dangerous-mode prompt. That's deliberate for my own machines.
  Review it before using it anywhere else.
- `settings.local.json` is per-machine and is never tracked.
