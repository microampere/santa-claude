# Sets up user-level Claude Code on this machine to match santa-claude.
# Copies config/ into ~/.claude (backing up anything it replaces), installs the
# task-band plugin, sets git's commit email, then checks the result.
# Safe to run more than once. Run from anywhere:
#   powershell -ExecutionPolicy Bypass -File <repo>\setup.ps1
$ErrorActionPreference = 'Stop'

# ── Prerequisites ────────────────────────────────────────────
$missing = @('git', 'node', 'claude') | Where-Object { -not (Get-Command $_ -ErrorAction SilentlyContinue) }
if ($missing) {
    Write-Host "Missing: $($missing -join ', '). Install them, open a new terminal, and run this again."
    exit 1
}

$src    = Join-Path $PSScriptRoot 'config'
$dest   = Join-Path $HOME '.claude'
$stamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $dest "backups\santa-claude-$stamp"
$files  = 'CLAUDE.md', 'statusline.js', 'settings.json'

New-Item -ItemType Directory -Force $dest | Out-Null

# ── Plugins ──────────────────────────────────────────────────
# Runs before the config copy: `claude plugin marketplace add` rewrites settings.json
# (it drops "autoUpdate"), so the repo's settings.json has to be copied after it.
$marketplace = 'santa-claude'
$plugin      = 'task-band@santa-claude'

$known = claude plugin marketplace list --json | ConvertFrom-Json
if (@($known | Where-Object { $_.name -eq $marketplace }).Count -eq 0) {
    claude plugin marketplace add microampere/santa-claude
    if ($LASTEXITCODE -ne 0) { Write-Host "Could not add the $marketplace marketplace."; exit 1 }
} else {
    Write-Host "Marketplace $marketplace already added"
}

$installed = claude plugin list --json | ConvertFrom-Json
if (@($installed | Where-Object { $_.id -eq $plugin -and $_.scope -eq 'user' }).Count -eq 0) {
    claude plugin install $plugin --scope user
    if ($LASTEXITCODE -ne 0) { Write-Host "Could not install $plugin."; exit 1 }
} else {
    Write-Host "Plugin $plugin already installed"
}

# ── Config files ─────────────────────────────────────────────
foreach ($name in $files) {
    $from   = Join-Path $src $name
    $target = Join-Path $dest $name
    if (Test-Path $target) {
        if ((Get-FileHash $target).Hash -eq (Get-FileHash $from).Hash) {
            Write-Host "$name already up to date"
            continue
        }
        New-Item -ItemType Directory -Force $backup | Out-Null
        Copy-Item $target (Join-Path $backup $name)
        Write-Host "Backed up $name -> $backup"
    }
    Copy-Item $from $target -Force
    Write-Host "Installed $name"
}

# ── Git identity ─────────────────────────────────────────────
# Commit with GitHub's private noreply address so pushes don't expose a personal email.
# author.email and committer.email take priority over user.email, so set all three.
$noreply = '6538201+microampere@users.noreply.github.com'
foreach ($key in 'user.email', 'author.email', 'committer.email') {
    git config --global $key $noreply
}
Write-Host "Set git user/author/committer email to $noreply"

# ── Check ────────────────────────────────────────────────────
Write-Host ''
Write-Host 'Checking:'
$failed = 0
function Write-Check($ok, $label) {
    if ($ok) { Write-Host "  PASS  $label" } else { Write-Host "  FAIL  $label"; $script:failed++ }
}

foreach ($name in $files) {
    $target = Join-Path $dest $name
    $ok = (Test-Path $target) -and ((Get-FileHash $target).Hash -eq (Get-FileHash (Join-Path $src $name)).Hash)
    Write-Check $ok "~/.claude/$name matches config/$name"
}

$installed = claude plugin list --json | ConvertFrom-Json
$tb = @($installed | Where-Object { $_.id -eq $plugin -and $_.scope -eq 'user' })
Write-Check ($tb.Count -gt 0 -and $tb[0].enabled) "$plugin installed and enabled"

foreach ($key in 'user.email', 'author.email', 'committer.email') {
    Write-Check ((git config --global $key) -eq $noreply) "git $key is the noreply address"
}

Write-Host ''
if ($failed -gt 0) {
    Write-Host "$failed check(s) failed."
    exit 1
}
Write-Host 'All checks passed. Restart Claude Code (close every session) to load the new config.'
