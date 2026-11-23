# Spec: fresh-machine setup from santa-claude

Session: santa-setup-01 · 2026-11-22 · Status: **executed 2026-11-23** — reviewed by fresh subagent (SATISFIES SPEC); D1 GitHub archive left to user

## Goal

On a new Windows machine running a fresh Claude Code install, the user says "set up my
Claude from github.com/microampere/santa-claude". Claude should then be able to make
the user-level Claude config match the repo exactly, with no guesswork and no human
fallback steps.

## Done when

1. A fresh Claude can follow the README alone, from clone to a verified install.
2. `setup.ps1` installs the config **and** the task-band plugin, and it is safe to run twice.
3. `setup.ps1` ends with a check that prints PASS/FAIL for each item.
4. Everything this machine relies on is either in the repo or deliberately left out, and the README says which.
5. santa-claude is the only source of truth for user-level config.

## Changes

### Repo (santa-claude)

| # | File | Change |
|---|---|---|
| R1 | `README.md` | Add a "Setting up a new machine (for Claude)" section: prerequisites check (git, node, claude), clone, run `setup.ps1`, read its PASS/FAIL output, then tell the user to restart Claude Code. Note what is intentionally not managed (credentials, `settings.local.json`, claude.ai-synced skills, desktop-app preferences). Remove the "if the band doesn't appear" fallback steps. |
| R2 | `setup.ps1` | (a) Stop early with a clear message if git, node or claude is missing. (b) After copying, run `claude plugin marketplace add microampere/santa-claude` and `claude plugin install task-band@santa-claude`, skipping either step if it's already done. (c) Finish by checking that each installed file matches `config/` and that task-band is installed, printing PASS/FAIL and exiting non-zero on any FAIL. |
| R3 | `config/CLAUDE.md` | Fix the Status Line table: segment order, violet 5h, token count, red at 100K. |
| R4 | `config/CLAUDE.md` | **Remove** the "PowerShell Profile Setup" section (see decision D2). |

### This machine

| # | Change |
|---|---|
| M1 | Delete `~/.claude/add-permission.ps1` (decision D3). |
| M2 | Retire the `~/.claude` git repo: remove `~/.claude/.git` and `~/.claude/.gitignore`. The user archives `microampere/global-claude-settings` on GitHub (decision D1). |
| M3 | Run the new `setup.ps1` here, so live config matches the repo (this adds `autoUpdate: true` back to the santa-claude marketplace). |

## Decisions (need user sign-off)

- **D1. Retire `global-claude-settings`.** It tracks the same files as santa-claude. It has 4 uncommitted modified files and its last commit was 2026-06-27, so it has already drifted. Two sources of truth means a fresh Claude might pick the wrong one. Proposal: delete the local `.git` folder, and the user archives the GitHub repo (archived, not deleted, so it can be restored).
- **D2. Drop the PowerShell-profile section instead of automating it.** It is marked "Required", but this machine has no profile at all and works fine. It also sets `$env:SHELL = "pwsh"`, and pwsh isn't installed here. Its `ls` override changes `ls` for every script, not only for Claude. Claude Code has its own Bash and PowerShell tools, so the section is outdated advice. Proposal: delete it.
- **D3. Delete `add-permission.ps1`.** Nothing calls it: no settings file in `~/.claude` or `C:\ws\*` references it. What it does is broaden narrow allow rules in a project's `settings.local.json`, which `Bash(*)` already makes unnecessary.
- **D4. Don't declare the `claude-code-plugins` marketplace** (anthropics/claude-code). No installed plugin comes from it. It was a one-off add, so leave it out of the repo.

## Verification

- Test run of `setup.ps1` against a throwaway home folder. Set `USERPROFILE` to a temp directory in a child PowerShell, so the real `~/.claude` and global git config are untouched. All checks must PASS, and a second run must also PASS.
- Then run it for real on this machine (M3).
- Subagent review gate: a fresh agent gets only the diff and this spec, and confirms "Done when" 1–5.

## Out of scope

macOS/Linux setup, desktop-app (Code tab) preferences, claude.ai connectors (these sync from your account), and the task-band plugin code itself.
