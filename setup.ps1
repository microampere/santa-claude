# Copies santa-claude's config into ~/.claude, backing up anything it replaces.
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File <repo>\setup.ps1
$ErrorActionPreference = 'Stop'

$src    = Join-Path $PSScriptRoot 'config'
$dest   = Join-Path $HOME '.claude'
$stamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $dest "backups\santa-claude-$stamp"

New-Item -ItemType Directory -Force $dest | Out-Null

foreach ($name in 'CLAUDE.md', 'statusline.js', 'settings.json') {
    $target = Join-Path $dest $name
    if (Test-Path $target) {
        New-Item -ItemType Directory -Force $backup | Out-Null
        Copy-Item $target (Join-Path $backup $name)
        Write-Host "Backed up $name -> $backup"
    }
    Copy-Item (Join-Path $src $name) $target -Force
    Write-Host "Installed $name"
}

Write-Host ''
Write-Host 'Done. Start Claude Code; if task-band is not active, run:'
Write-Host '  claude plugin install task-band --marketplace microampere/santa-claude'
