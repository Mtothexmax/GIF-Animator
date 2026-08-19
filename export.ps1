<#
.SYNOPSIS
    Builds the GIF Animator as a static site for GitHub Pages and publishes it to ./docs.

.DESCRIPTION
    Runs `npm run build` in GitHub Pages mode (GH_PAGES=1 -> base path "/GIF-Animator/")
    and copies the resulting static site into the ./docs folder, so the repository
    can be served by GitHub Pages ("Deploy from a branch" -> folder "/docs").

    Usage:  .\export.ps1
#>
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

Write-Host '==> Building static site (GitHub Pages mode)...' -ForegroundColor Cyan
$env:GH_PAGES = '1'
npm run build
if ($LASTEXITCODE -ne 0) {
    throw 'npm run build failed.'
}

$build = Join-Path $root 'build'
$docs  = Join-Path $root 'docs'

Write-Host '==> Copying build output to ./docs ...' -ForegroundColor Cyan
if (Test-Path $docs) {
    Remove-Item $docs -Recurse -Force
}
New-Item -ItemType Directory -Path $docs | Out-Null
Copy-Item (Join-Path $build '*') $docs -Recurse -Force

# Tell GitHub Pages not to run the Jekyll pipeline over the static files.
New-Item -ItemType File -Path (Join-Path $docs '.nojekyll') -Force | Out-Null

Write-Host ''
Write-Host '==> Done.' -ForegroundColor Green
Write-Host '    docs/ is ready for GitHub Pages.'
Write-Host '    Commit it and enable Pages:  Settings -> Pages -> Deploy from a branch -> /docs'
