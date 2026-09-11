#!/usr/bin/env bash
# Renders every mascot composition to MP4 + WebM + poster JPG.
# WebM (VP8) is the primary source for browsers without an H.264 decoder.
set -euo pipefail

# Jalur diturunkan dari letak skrip ini, bukan dari /app: PR yang melahirkan berkas
# ini menuliskan /app/remotion dan /app/assets apa adanya - jalur kontainer build
# Emergent, yang tidak ada di checkout siapa pun termasuk CI.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/remotion"
OUT="$ROOT/assets/motion"
mkdir -p "$OUT/posters" public

# public/assets WAJIB ada supaya staticFile() Remotion melihat aset karakter, tetapi
# ia TIDAK dilacak git (lihat .gitignore): symlink direktori yang terlacak memerahkan
# pemindai berkas repo. Jadi dibuat di sini, tiap render, idempoten.
ln -sfn ../assets public/assets

render() {
  local comp=$1 slug=$2 poster=${3:-15}
  echo "== $comp -> $slug"
  npx remotion render src/index.js "$comp" "$OUT/$slug.mp4"  --codec=h264 --log=error --jpeg-quality=95
  npx remotion render src/index.js "$comp" "$OUT/$slug.webm" --codec=vp8  --log=error
  npx remotion still  src/index.js "$comp" "$OUT/posters/$slug.jpg" --frame="$poster" --log=error
}

TARGETS=${1:-all}

if [ "$TARGETS" = "all" ]; then
  render Hero hero 20
  render NusaWave nusa-wave 12
  render NusaCelebrate nusa-celebrate 20
  render NusaSleep nusa-sleep 40
  render NusaOops nusa-oops 14
  render NusaCurious nusa-curious 30
  render NusaThinking nusa-thinking 30
  render MiraCheer mira-cheer 20
  render MiraWave mira-wave 12
  render TeamWalk team-walk 60
else
  for t in $TARGETS; do
    case $t in
      hero) render Hero hero 20;;
      nusa-wave) render NusaWave nusa-wave 12;;
      nusa-celebrate) render NusaCelebrate nusa-celebrate 20;;
      nusa-sleep) render NusaSleep nusa-sleep 40;;
      nusa-oops) render NusaOops nusa-oops 14;;
      nusa-curious) render NusaCurious nusa-curious 30;;
      nusa-thinking) render NusaThinking nusa-thinking 30;;
      mira-cheer) render MiraCheer mira-cheer 20;;
      mira-wave) render MiraWave mira-wave 12;;
      team-walk) render TeamWalk team-walk 60;;
      *) echo "unknown target: $t"; exit 1;;
    esac
  done
fi
echo "DONE"
