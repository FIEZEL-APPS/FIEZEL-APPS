# LAPORAN — Rebrand: Layar D (progress / completion / settings)

Hi-fi redesign HTML statis offline **390×844**, konsep "WARM PAPER, BRIGHT MIND".
Semua deliverable di `/home/user/workspace/redesign/screens/d/`.

## Deliverable

| File | Isi |
|---|---|
| `progress.html` + `progress.png` | Peta Belajar & Lab (redesign `m16_progress_view`) |
| `completion.html` + `completion.png` | Lesson selesai (redesign `f07_grammar_completion`) |
| `settings.html` + `settings.png` | FIEZEL Control Room / profil (redesign `m11_settings_modal`) |
| `tokens.css` | Salinan token FINAL dari `redesign/tokens/tokens.css` (dimuat apa adanya, tanpa hardcode warna) |
| `d.css` | Stylesheet komponen layar D (topbar, nav, kartu, core panel, toggle, toast, dsb.) |
| `assets/fonts/` | FZ Plus Jakarta Sans 400–700 + Fredoka variable (woff2 lokal — offline penuh) |
| `assets/mascot/` | `paw-mascot-head.svg`, `paw-mascot-full.svg` |
| `verify_d.py` + `verify_report.json` | Screenshot + verifikasi programatik (hasil di bawah) |

## Isi layar

### progress.html — analytics
- **PERSONAL LEARNING MAP**: bar per skill (Kosakata 72 / Grammar 58 / Reading 41 / Listening 35 / Speaking 22 / Writing 18%) dengan ikon Lucide per skill, angka tabular-nums, fill `--sun-grad`.
- **Panel AI core gelap "NEXT SESSION"** (`--core` #1B1418): garis neural kuning halus, eyebrow Solar + ikon brain, rekomendasi adaptif ("Grammar · Past Simple", pola salah 3×, prediksi +9%), CTA `--sun-grad` "Mulai sesi 10 mnt" + ghost "Ubah fokus". Bright Mind dipakai hemat — satu panel, bukan seluruh layar.
- **Streak kalender**: kartu "Runtun belajar" + chip api "6 hari", strip 7 hari (Sen–Jum ✓ sun, Sab hari-ini dot ink + ring `--sun-deep`, Min dashed).
- IA asli dipertahankan: filter chips (Ringkasan aktif) kini dengan **fade + chevron affordance** (perbaikan audit 3b: chip terpotong tanpa indikator), level pill "A2 · Ganti", bottom nav Peta aktif.
- Maskot pindah ke **slot inline** di kartu map ("Ini peta kemampuanmu — bukan rapor") — tidak lagi menutupi konten (audit 3c).

### completion.html — lesson selesai
- **Ring skor** SVG 84% (stroke gradien #FFDE59→#FFA500) + "SKOR SESI".
- **Maskot celebrating**: PAW mata happy + mulut terbuka + lengan diangkat + bintang, inline SVG dari `paw-mascot-full.svg` (identitas PRESERVE, state kontekstual sesuai aturan maskot).
- IA asli dipertahankan: eyebrow "SESSION COMPLETE", "21 dari 25 benar percobaan pertama", insight "3 hal yang tadinya keliru", note "Progres sudah masuk ke profil skill…".
- **Toast BARU ink+krem**: `--ink` #241A11 + teks `--bg` #FFF9EE + badge check sun — **kontras terukur 16,28:1** (audit: toast navy+teks gelap GAGAL ±1,x:1). Posisi toast tidak menutup tombol/nav.
- **Tombol lanjut**: primer `--sun-grad` "Lanjut lesson berikutnya" + sekunder "Kembali ke Home", 52px.

### settings.html — profil + pengaturan
- Header "FIEZEL CONTROL ROOM / Pengalaman Rara" (Fredoka) + tombol tutup 44px.
- Profil: avatar maskot PAW di tile sun-soft (audit: lingkaran maskot kosong → terisi), chip "Level A2 · Jalur sekolah", chip streak, input nama panggilan (hit ≥44px + tombol edit 44px).
- **Item list dengan ikon Lucide** stroke 1.75 (refresh-ccw, bell, vibrate, volume-2, smartphone, wand-sparkles, trash) — perbaikan audit "ikon tile kosong".
- **Toggle baru** (pengganti checkbox merah): track ink saat aktif + knob sun ber-check, visual 50×30 dengan **hit-area pseudo ≥44px**; role="switch" + aria-checked.
- **Disabled state baru** "Pengingat belajar": permukaan `--surface-disabled` + teks `--text-disabled` (tetap ≥4,5:1) + **ikon gembok** — bukan opacity rendah (audit #4).
- Status bunyi = row info + badge "Aktif" (good-soft). Reset progres = tombol danger 48px. **Versi app**: "FIEZEL v3.2.0 · Build 184".

## Verifikasi programatik (verify_d.py → verify_report.json)

Semua layar **LULUS** (`SEMUA LULUS`):
1. PNG **780×1688** = 390×844 @ deviceScaleFactor 2 (dicek PIL) — 3/3 OK.
2. Font termuat: FZ Plus Jakarta Sans + FZ Fredoka (document.fonts.check) — 3/3 OK.
3. **Lantai font 12px**: 0 pelanggaran (audit: label 7–10,6px).
4. **Touch target ≥44px** semua button/input/switch: 0 pelanggaran (toggle dihitung dengan hit-area pseudo +8/+4).
5. Tidak ada overflow horizontal; konten muat 844px tanpa scroll (scrollH ≤ clientH) — 3/3.
6. **Toast ink+krem kontras 16,28:1** (AA ≥4,5 lulus jauh).
7. Maskot tidak overlap kontrol interaktif: 0 temuan.
8. Semua gambar termuat (0 broken img) — offline penuh, tanpa CDN.

## Keputusan desain
- Token dipakai dari `tokens.css` FINAL (nilai `--good/--bad/--info/--muted-soft/--focus-ring` versi koreksi WCAG agen token, bukan draf DIRECTION).
- Fredoka hanya untuk judul layar (h1); judul kartu/UI Jakarta 700; angka data Jakarta 700 tabular-nums.
- Eyebrow 12px tracking lebar warna `--info`; nav label 12px (audit #3).
- Chips filter ala segmented: aktif = permukaan ink + teks krem (≥14:1), bukan merah accent lama.
- Konsistensi dengan layar sibling A/B/C: topbar wordmark + "Tanya FIEZEL" 44px, bottom nav tile `--sun-soft` + dot, frame `.phone` 390×844.
