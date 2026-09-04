# LAPORAN — Rebrand Layar B: Quiz Grammar (FIEZEL "Warm Paper, Bright Mind")

Lima layar hi-fi statis offline, 390×844, di `/home/user/workspace/redesign/screens/b/`.
Sumber kebenaran: `redesign/DIRECTION.md`, `redesign/audit/AUDIT.md`, screenshot asli `redesign/audit/shots/` (f02, f03, f04b, f05b, f06, f06b).

## Deliverables

| File | Isi | PNG (390×844, dsf 2) |
|---|---|---|
| `quiz.html` | Kartu soal + 4 answer choice state default + strip "Mode Adaptif" | `png/quiz.png` |
| `quiz-analyzing.html` | State ANALYZING: panel AI core gelap `#1B1418` + garis neural kuning + "FIEZEL membaca jawabanmu…" + maskot thinking | `png/quiz-analyzing.png` |
| `quiz-correct.html` | Feedback benar + kartu "KENAPA INI BENAR" + accordion "Bandingkan pilihan lain" + toast ink/krem + maskot correct di dock | `png/quiz-correct.png` |
| `quiz-wrong.html` | Feedback salah encouraging + panel gelap "DIAGNOSIS FIEZEL" (miskonsepsi) + CTA "Lihat kenapa" + maskot encouraging | `png/quiz-wrong.png` |
| `quiz-hint.html` | Jeda mengajar 4/25: stepper PROBE→HINT→EXAMPLE→EXPLAIN, **langkah 2 (HINT) aktif**, probe done, 3–4 terkunci, CTA sticky "Oke, aku siap coba lagi" | `png/quiz-hint.png` |

Pendukung: `fz.css` (token + komponen), `build.py` (generator), `shoot_verify.py` + `verify_report.json` (verifikasi programatik), `assets/fonts/` (FZ Plus Jakarta Sans woff2 lokal — offline penuh, tanpa CDN).

## Konten nyata dari audit (tidak mengarang format)
- Soal 1/25: "___ name is Sari." — opsi She / Her / Me / Hers; benar = **Her** (f02, f05b).
- Eyebrow lesson: "Kata ganti subjek, objek & kepemilikan · Soal 1" (f02).
- Penjelasan benar + perbandingan jebakan (She/Me/Hers), memory-tip "Inget fokus kata ganti…", tombol AI "Jelaskan dengan cara yang lebih sederhana" (f05b).
- Feedback salah: "Belum tepat — nggak apa-apa." + "Tenang, kita bedah jawabannya" (f06b, f03); diagnosis "pakai kata ganti subjek sebelum kata benda, padahal posisi itu butuh bentuk kepemilikan" (f05b/f04b).
- Jeda mengajar 4/25 "AJAR ULANG": blockquote "Yang bikin tadi keliru… lesson Artikel a, an, the", strategi "Mulai dari subjek, kata kerja utama, dan waktu kejadian…", CTA "Oke, aku siap coba lagi" (f06); probe "Coba baca ulang kalimatnya pelan-pelan" (f04b).
- Copy feedback distandarkan ke satu bentuk ("nggak apa-apa") — audit 3e menandai inkonsistensi.

## Sistem visual yang diterapkan
- **Warm Paper**: permukaan `#FFF9EE`/putih, ink `#241A11`, aksen Solar `#FFC700` + gradasi `#FFDE59→#FFA500` untuk CTA/progress/tab aktif.
- **Bright Mind (hemat, panel bukan layar)**: 3 momen AI memakai core `#1B1418` + garis neural kuning — strip "Mode Adaptif" (quiz), panel ANALYZING, panel DIAGNOSIS FIEZEL; tombol AI "Jelaskan lebih sederhana" ikut permukaan core (kontras ≥10:1).
- **Tipografi**: FZ Plus Jakarta Sans 400–700 saja (weight 650/750/800 faux-bold dihapus). Skala 22/18/16/15/14/13/12. Catatan: file font Fredoka tidak tersedia di workspace aset (`fiezel-apps/assets/fonts/` hanya Jakarta + Instrument Serif), jadi judul layar memakai Jakarta 700 — sesuai aturan DIRECTION "judul kartu/UI pakai Jakarta 700"; kalau aset Fredoka ditambahkan, cukup ganti font-family `.q-title/.teach-title`.
- **Maskot PAW**: 4 ekspresi kontekstual (default/thinking/correct/encouraging/hinting, SVG diadaptasi dari `paw-mascot-head.svg`). Dock kanan-bawah kini **strip in-flow** (bukan overlay) → secara struktural mustahil menutupi konten; bubble coach maks 2 baris + tombol dismiss 44×44. Di layar hint, maskot pakai **inline slot kartu** (aturan maskot DIRECTION memperbolehkan dock ATAU inline slot).

## Perbaikan wajib audit yang masuk
1. **Toast navy → ink+krem** (audit "bug kontras paling parah"): toast "Progres tersimpan · Streak 1/5" di quiz-correct, kontras ±15:1, inline (tidak menutupi kontrol).
2. **Lantai font 12px**: eyebrow 12 tracking .14em, label nav 12, "Tanya FIEZEL?" 12 (dulu 7px), micro-caps ≥12 — diverifikasi programatik (0 pelanggaran di 5 layar).
3. **Disabled state terbaca**: "Lanjut" disabled = teks `--muted` di `--panel-soft` (±5,5:1) + ikon gembok, bukan opacity; opsi review tetap `--muted` ≥4,5:1 (bukan 2,28:1 seperti aslinya).
4. **Touch target ≥44px**: semua button/link ≥44px (icon-btn 44, coach-close 44, acc-head 44, ghost-link 44) — diverifikasi programatik, 0 pelanggaran.
5. **Focus-visible** ring 2px `--sun-deep` offset 2px global.
6. **Maskot tak menutupi konten** (audit 3c): dock strip in-flow + inline slot; tombol dismiss ada.
7. **Feedback panjang diringkas** (audit 3b): perbandingan jebakan jadi accordion collapsed, opsi non-jawaban jadi mini-chip; CTA "Lanjut" selalu terlihat di header + CTA hint sticky.
8. **Ruang kosong quiz** (audit 3b): diisi strip Mode Adaptif; tidak ada void ±350px lagi.
9. Tidak ada kunci internal yang bocor (label manusiawi); tidak ada emoji sebagai ikon UI (semua Lucide-style stroke 1.75); coral/mint/lilac tidak dipakai sebagai permukaan tombol.

## Verifikasi programatik (`verify_report.json`)
Playwright 390×844: seluruh node teks dicek font-size (lantai 12px), seluruh kontrol dicek bounding box (≥44px), dan kontras teks dihitung dari warna komputasi vs latar efektif (blending alpha rantai ancestor), ambang WCAG AA 4.5:1 (3:1 teks besar).

| Layar | Font <12px | Target <44px | Kontras gagal / dicek |
|---|---|---|---|
| quiz | 0 | 0 | 0 / 25 |
| quiz-analyzing | 0 | 0 | 0 / 25 |
| quiz-correct | 0 | 0 | 0 / 36 |
| quiz-wrong | 0 | 0 | 0 / 32 |
| quiz-hint | 0 | 0 | 0 / 34 |

Fix kontras selama iterasi: bead/mark hijau → `--good-deep #1F6B4E`, tag "PILIHANMU" merah → `--bad-deep #93331F`, eyebrow di `--sun-soft` → `--info-deep #6F5716` (token tambahan, konsisten dgn aturan DIRECTION "varian gelap untuk teks kecil").

## Catatan untuk agen lain
- Token tambahan yang saya perkenalkan: `--good-deep`, `--bad-deep`, `--info-deep` — dibutuhkan agar teks semantik kecil lolos 4.5:1 di permukaan soft; usul dimasukkan ke matriks token final.
- Pola reusable di `fz.css`: `.core-panel` (momen AI), `.dock` strip maskot in-flow, `.toast` ink, `.option` + state, `.steps` stepper — bisa dipakai layar listening/vocab.
