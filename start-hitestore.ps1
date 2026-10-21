$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js is not installed or is not on PATH. Install Node.js LTS from https://nodejs.org and reopen PowerShell.' -ForegroundColor Red
  exit 1
}
Write-Host 'Starting HiteStore demo at http://localhost:3009' -ForegroundColor Green
Write-Host 'Keep this PowerShell window open. Press Ctrl+C to stop.'
node .\server.js
