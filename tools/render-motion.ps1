# Renders mascot compositions to MP4 + WebM + poster JPG on Windows
param (
    [string]$Target = "all"
)

$Root = (Resolve-Path "$PSScriptRoot/..").Path
Set-Location "$Root/remotion"

# Ensure assets are synchronized
& "$PSScriptRoot/sync-remotion-assets.ps1"

$OutDir = "$Root\assets\motion"
$PosterDir = "$OutDir\posters"
if (-not (Test-Path $PosterDir)) {
    New-Item -ItemType Directory -Force -Path $PosterDir | Out-Null
}

function Invoke-Render($comp, $slug, $poster=15) {
    Write-Host "== $comp -> $slug"
    npx remotion render src/index.js $comp "$OutDir\$slug.mp4" --codec=h264 --log=error --jpeg-quality=95
    npx remotion render src/index.js $comp "$OutDir\$slug.webm" --codec=vp8 --log=error
    npx remotion still src/index.js $comp "$PosterDir\$slug.jpg" --frame=$poster --log=error
}

$compositions = @(
    @{ Comp = "Hero"; Slug = "hero"; Poster = 20 },
    @{ Comp = "NusaWave"; Slug = "nusa-wave"; Poster = 12 },
    @{ Comp = "NusaCelebrate"; Slug = "nusa-celebrate"; Poster = 20 },
    @{ Comp = "NusaSleep"; Slug = "nusa-sleep"; Poster = 40 },
    @{ Comp = "NusaOops"; Slug = "nusa-oops"; Poster = 14 },
    @{ Comp = "NusaCurious"; Slug = "nusa-curious"; Poster = 30 },
    @{ Comp = "NusaThinking"; Slug = "nusa-thinking"; Poster = 30 },
    @{ Comp = "MiraCheer"; Slug = "mira-cheer"; Poster = 20 },
    @{ Comp = "MiraWave"; Slug = "mira-wave"; Poster = 12 },
    @{ Comp = "TeamWalk"; Slug = "team-walk"; Poster = 60 }
)

if ($Target -eq "all") {
    foreach ($item in $compositions) {
        Invoke-Render $item.Comp $item.Slug $item.Poster
    }
} else {
    $match = $compositions | Where-Object { $_.Comp -eq $Target -or $_.Slug -eq $Target }
    if ($match) {
        Invoke-Render $match.Comp $match.Slug $match.Poster
    } else {
        Write-Warning "Composition '$Target' not found."
    }
}
