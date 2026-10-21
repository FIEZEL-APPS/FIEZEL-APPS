# Syncs character assets to remotion/public/assets on Windows
$Root = Resolve-Path "$PSScriptRoot/.."
$source = Join-Path $Root "assets\characters"
$dest = Join-Path $Root "remotion\public\assets\characters"

if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
}

robocopy $source $dest /E /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -le 7) {
    exit 0
} else {
    exit $LASTEXITCODE
}
