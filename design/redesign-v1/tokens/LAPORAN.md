# LAPORAN — Rebrand: Board + Tokens (FIEZEL "WARM PAPER, BRIGHT MIND")

Semua deliverable ada di `/home/user/workspace/redesign/tokens/`.

## Deliverable

| File | Isi |
|---|---|
| `tokens.css` | Token FINAL: seluruh token DIRECTION (surface/ink/solar/core/semantic/radius/shadow/motion/tipografi) + state hover/press/focus/disabled lengkap + resep komponen (btn-sun, btn-ink, focus-visible, disabled, toast, ai-panel) + blok dark-mode **kosong** ber-komentar "fase 2" (`@media prefers-color-scheme` dan `[data-theme="dark"]`) |
| `tokens.json` | Format W3C Design Tokens ($type/$value, alias `{color...}`, gradient, shadow composite, typography composite, cubicBezier, duration); tervalidasi JSON |
| `WCAG.md` | Matriks kontras **39 pasangan**, semua dihitung programatik — **39/39 LULUS** setelah 5 penyesuaian; berisi tabel penyesuaian + 6 aturan pakai mengikat |
| `brand-board.png` | **1600×2000** (diverifikasi PIL), HTML→Playwright. Berisi: nama konsep, palet 4 kelompok dengan swatch + rasio, duo tipografi (Fredoka + Jakarta, skala lantai 12px), kartu belajar vs panel AI berdampingan (dengan state correct/wrong/disabled+gembok/focus-ring), maskot PAW full + aturan perilaku, 8 ikon Lucide stroke 1,75, do/don't 6 butir |
| `LAPORAN.md` | file ini |

Pendukung (jangan dihapus): `contrast.py`, `final_matrix.py`, `contrast_results.json`, `final_tokens.json`, `matrix_rows.md`, `board.html`, `board_final.html`, `build_board.py`, `board-assets/` (font Fredoka variable + Jakarta woff2 lokal, maskot SVG dari `fiezel-apps/assets/brand/`, ikon Lucide).

## Keputusan penting (perubahan dari draf DIRECTION — semua karena WCAG)

| Token | Draf → Final | Alasan |
|---|---|---|
| `--muted-soft` | #857350 → **#7E6C4B** | 4,39:1 di `--bg` gagal AA normal; 14px regular tetap "teks normal" WCAG (large = 18px / 14px **bold**) |
| `--good` | #2E8B69 → **#1F6B4E** | 3,80:1 di good-soft, 4,00:1 di bg — gagal; final 5,82:1 / 6,12:1. Draf disimpan sebagai `--good-bright` (ikon/≥18px) |
| `--bad` | #B8432D → **#AC3E2A** | 4,44:1 di bad-soft — gagal tipis; final 4,95:1. Draf jadi `--bad-bright` |
| `--info` | #8C6D1F → **#7A5F1B** | 4,37:1 di info-soft — gagal; final 5,42:1 |
| `--focus-ring` | (draf: pakai `--sun-deep`) → token BARU **#A67A00** | `--sun-deep` cuma 2,01:1 vs bg / 2,11 vs panel — indikator non-teks wajib ≥3:1 (SC 1.4.11). Final 3,71/3,89/3,53:1. `--sun-deep` TETAP jadi hover CTA sun (ink 8,10:1) |

Token state baru yang belum ada di draf: `--ink-hover` #3A2B1C, `--ink-press` #120C07 (CTA ink), `--focus-ring-on-core` #FFC700 (ring di panel AI), `--text-disabled` #75654C (5,13:1 di panel-soft, sesuai perbaikan audit #4), `--surface-disabled`/`--line-disabled`, `--on-core-disabled` (α .52, efektif ±6,1:1), `--radius-pill`, `--tap-min` 44px, `--mascot-dock` 88px.

Warna alpha (`--on-core-muted` α .68) dihitung sebagai komposit efektif di permukaannya: 8,43:1 di core, 7,67:1 di core-soft — lulus.

## Catatan untuk agen layar (hi-fi screens)

1. Muat `tokens.css` apa adanya — jangan hardcode warna; nilai `--good/--bad/--info/--muted-soft` BERBEDA dari draf DIRECTION.
2. Focus ring: `--focus-ring` (bukan `--sun-deep`) 2px offset 2px; di panel gelap pakai `--focus-ring-on-core`.
3. Disabled: `--panel-soft` + `--text-disabled` + ikon gembok. Dilarang opacity rendah.
4. Toast: `--ink` + teks `--bg` (atau varian `--info-soft` + `--info`).
5. Font Fredoka TIDAK ada di `fiezel-apps/assets/fonts/` — variable woff2 (wght 300–700) sudah diunduh ke `tokens/board-assets/Fredoka-var.woff2`, siap dipakai layar hi-fi offline.
6. Maskot: sumber SVG `fiezel-apps/assets/brand/paw-mascot-full.svg` — dipakai langsung di board, aman di-embed inline.
