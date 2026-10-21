$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$repo = 'https://github.com/sayeedmohd77-creator/hitestore.com.git'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Write-Host 'Install Git for Windows first: https://git-scm.com' -ForegroundColor Red; exit 1 }
Write-Host 'PREREQUISITE: Create an EMPTY private or public GitHub repository named hitestore.com under sayeedmohd77-creator (do not initialize README/gitignore).'
$ok = Read-Host 'Have you created this empty repository? Type YES to continue'
if ($ok -ne 'YES') { Write-Host 'Cancelled. No changes made.'; exit 0 }
if (-not (Test-Path '.git')) { git init }
git branch -M main
git add .
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { git commit -m 'Initial offline HiteStore storefront prototype'; if ($LASTEXITCODE -ne 0) { Write-Host 'Configure Git name/email: git config --global user.name and user.email'; exit 1 } }
$existing = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
  if ($existing -ne $repo) { Write-Host "Existing origin points to $existing. Please review manually; no remote changed." -ForegroundColor Yellow; exit 1 }
} else { git remote add origin $repo }
Write-Host "Pushing to $repo" -ForegroundColor Cyan
git push -u origin main
if ($LASTEXITCODE -ne 0) { Write-Host 'Push failed. Verify GitHub authentication and repo access. Files are still safe locally.' -ForegroundColor Yellow; exit 1 }
Write-Host 'GitHub push completed.' -ForegroundColor Green
