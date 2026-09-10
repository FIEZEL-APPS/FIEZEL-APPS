# LAPORAN — Rebrand: Komponen (Warm Paper, Bright Mind)

Deliverable component library satu halaman, offline, sesuai kontrak `/redesign/DIRECTION.md` + temuan `/redesign/audit/AUDIT.md`.

## File

| File | Isi |
|---|---|
| `redesign/components/index.html` | Library satu halaman (offline, tanpa CDN) — 17 keluarga komponen, tiap komponen berlabel nama + anotasi token |
| `redesign/components/components.css` | Token draf DIRECTION disalin **persis** di `:root` + seluruh gaya komponen |
| `redesign/components/components-full.png` | Screenshot QA Playwright full-page (1280px, tinggi 10.435px) |
| `redesign/components/components-mobile-full.png` | Screenshot full-page lebar 390px (referensi mobile) |
| `redesign/components/contrast-report.json` | Hasil cek kontras terprogram (22 titik) + scan lantai font |
| `redesign/components/qa_components.py` | Skrip QA (screenshot + hitung rasio WCAG dari computed style + komposit bg efektif) |
| `redesign/components/assets/` | Font Jakarta 400–700 woff2 lokal + maskot `paw-mascot-head.svg` (offline) |
| `redesign/components/_qa_part1..6.png` | Potongan screenshot untuk review visual |

## Cakupan komponen & state

Semua komponen diminta task tersedia dengan state relevan (default/hover/press/focus-visible/disabled/loading/success/error, ditampilkan sebagai state paksa `.is-*` agar terdokumentasi statis):

1. **Tombol**: primer ink, primer sun (+ varian gradasi `--sun-grad`), sekunder outline, ghost, ikon 44px — 6–8 state per varian, disabled memakai `--panel-soft` + `--muted` + ikon gembok (bukan opacity).
2. **Kartu**: lesson (default/hover/focus/terkunci), modul grid (default/hover/skeleton), **panel AI core gelap** `--core` dengan garis neural SVG kuning (default diagnosis + loading analyzing dengan pulse dots).
3. **Chip/badge**: CEFR A1–C2 (default/aktif/hover/focus/disabled+gembok), streak (flame + angka tabular), NEEDS ATTENTION, badge level ink. Hit-area chip diperluas ≥44px via pseudo-element.
4. **Progress**: bar 45%/0%/100% (fill `--sun-grad`, selesai `--good`) + ring 3/5 hari + ring loading.
5. **Tabs** segmented: aktif ink, hover, focus, disabled+gembok.
6. **Bottom nav 5 item**: label **12px** (audit fix #3, dulu 9,44px), aktif tile `--sun` + dot, item ≥56px, state focus-visible.
7. **Answer choice**: default/hover/focus/selected/correct/wrong/**disabled + gembok** (teks tetap `--muted` 5,69:1 — audit fix #4, dulu 2,28:1).
8. **Feedback banner** benar/salah/info (judul ink, semantik hanya di border+ikon; copy dikanonkan “Belum tepat, tidak apa-apa.”).
9. **Hint panel bertahap** PROBE→HINT→EXAMPLE→EXPLAIN: stepper done/current/locked+gembok, dua tahap didemokan.
10. **Audio player listening**: default + playing (equalizer) + disabled; **“Dengarkan” = permukaan ink 16,37:1** (audit fix #1, dulu 1,92:1), **“Nilai jawaban” = sun 10,9:1** (dulu 1,45:1 saat disabled → kini disabled 5,69:1 + gembok).
11. **Maskot dock 88px + coach bubble** sesuai aturan DIRECTION: slot kanan-bawah di atas bottom nav (tidak menutupi konten interaktif), mood badge kontekstual (hinting/celebrating), bubble maks 2 baris (line-clamp), tombol tutup hit-area 44px.
12. **Empty state** (art `--sun-soft` + CTA sun).
13. **Skeleton loading** shimmer.
14. **Toast baru ink+krem** (audit fix #2, REPLACE navy): info/success/error + aksi `--sun` — 16,37:1.
15. **Modal** (backdrop ink .45, dialog role/aria, tutup 44px).
16. **Form field**: default/focus/error/success/disabled.
17. **Toggle**: off/on (track ink + knob sun)/focus/disabled.

## QA terprogram (Playwright, computed style + komposit alpha)

**22/22 titik kontras LULUS AA** (`contrast-report.json`), termasuk semua tombol kritis:

| Titik kritis | Rasio | Min |
|---|---|---|
| Dengarkan (ink + krem) | **16,37:1** | 4,5 |
| Nilai jawaban (sun + ink) | **10,9:1** | 4,5 |
| Primer ink / toast ink+krem | 16,37:1 | 4,5 |
| Primer sun default/hover/press | 10,9 / 8,1 / 6,44:1 | 4,5 |
| Disabled (muted di panel-soft) + gembok | 5,69:1 | 4,5 |
| Label bottom nav 12px | 6,14:1 | 4,5 |
| Badge NEEDS ATTENTION | 5,54:1 | 4,5 |
| Aksi toast (sun di ink) | 10,9:1 | 4,5 |
| Pesan error form (`--bad` di bg) | 5,17:1 | 4,5 |

**Scan lantai font: 0 elemen <12px** (audit fix #3 terpenuhi di seluruh halaman).

## Keputusan & catatan untuk agen lain

1. **Token `:root` = salinan persis DIRECTION** (termasuk komentar). Satu deviasi terdokumentasi di level komponen: teks badge NEEDS ATTENTION memakai `#9D3C28` (mix 82% `--bad` + 18% `--text`) karena `--bad` murni di `--bad-soft` terukur **4,44:1 < 4,5**. Usulan ke agen token: tambah token final `--bad-deep ±#9D3C28`.
2. **Font FZ Fredoka belum ada filenya** di `/fiezel-apps/assets/fonts/` maupun `/promo-v7/shared/fonts/` (hanya Jakarta 400–700 + Instrument Serif 400). Display memakai stack `"FZ Fredoka",Fredoka,"Baloo 2",Jakarta 700` — agen aset perlu menambah woff2 Fredoka.
3. Teks kecil tidak pernah memakai `--good`/`--bad` mentah sebagai body (audit 3a): banner feedback memakai judul ink + semantik di border/ikon.
4. Focus ring seragam: `outline:2px solid var(--sun-deep); offset 2px` (audit fix #7), didemokan di tiap keluarga komponen.
5. Ikon: sprite SVG inline gaya Lucide stroke 1.75 ukuran 20/24 (offline, tanpa emoji — aturan DIRECTION).
6. Weight font dibatasi 400/500/600/700 (file yang benar-benar ada; menghapus faux-bold 650/750/800 temuan audit).
7. Panel AI core (`--core`) hanya untuk momen AI, didemokan di latar gelap sendiri; komponen lain semua di Warm Paper.

Siap dipakai agen layar hi-fi sebagai sumber kebenaran komponen.
