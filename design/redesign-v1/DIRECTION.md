# FIEZEL REBRAND — BRAND DIRECTION (kontrak untuk semua agen)

Baca dulu: /home/user/workspace/redesign/audit/AUDIT.md (temuan + PRESERVE/REFINE/REPLACE).

## Posisi
Intelligent, adaptive AI learning companion. Kepribadian: Smart, Warm, Curious, Supportive, Adaptive, Confident, Human-like, Modern. Core idea: "Not just learning with you. Learning about you." Rasa: AI + Education + Human — BUKAN cyberpunk, BUKAN kartun anak.

## Konsep arah: "WARM PAPER, BRIGHT MIND"
Dua dunia dalam satu sistem:
1. **Warm Paper (belajar)** — permukaan krem hangat terang tempat SEMUA aktivitas belajar. Tenang, kontras tinggi, ramah baca. Ini evolusi dari desain pastel sekarang (PRESERVE fondasi krem, rapikan aksen).
2. **Bright Mind (kecerdasan)** — momen AI (BrainCore, analyzing, diagnosis, adaptive path) memakai permukaan gelap hangat `#1B1418` dengan energi kuning solar + garis neural halus, senada kampanye V3. Dipakai HEMAT: panel/kartu momen AI, bukan seluruh layar.

Kuning = benang merah brand (app pastel → kampanye premium): dinaikkan dari #FFD23F ke keluarga **Solar #FFC700** dengan gradasi dimensional #FFDE59→#FFA500 untuk CTA/energi.

## Token inti (draf — agen token memfinalkan + matriks WCAG)
```css
:root{
  /* surface */
  --bg:#FFF9EE; --panel:#FFFFFF; --panel-soft:#FFF3DC; --line:#F0E4CF; --line-soft:#F7EFDF;
  /* ink */
  --text:#241A11; --muted:#6E5E47; --muted-soft:#857350; /* muted-soft hanya ≥14px */
  /* brand energy */
  --sun:#FFC700; --sun-deep:#E6A800; --sun-press:#CC9600; --sun-soft:#FFF3C4;
  --sun-grad:linear-gradient(180deg,#FFDE59,#FFA500);
  /* intelligence (panel AI) */
  --core:#1B1418; --core-soft:#2A2126; --core-line:#3A3038; --on-core:#FDFAF3; --on-core-muted:rgba(253,250,243,.68);
  /* semantic */
  --good:#2E8B69; --good-soft:#E9F7F0; --bad:#B8432D; --bad-soft:#FDE3DE;
  --info:#8C6D1F; --info-soft:#FFF3C4; /* pengganti toast navy */
  /* CTA utama: permukaan --text (ink) dgn teks krem, ATAU --sun dgn teks ink — dua-duanya ≥10:1 */
  --radius-lg:24px; --radius-md:16px; --radius-sm:12px;
  --shadow-sm:0 2px 10px rgba(36,26,17,.06); --shadow-md:0 10px 30px rgba(36,26,17,.09); --shadow-lg:0 24px 60px rgba(36,26,17,.15);
  --ease:cubic-bezier(.22,.8,.28,1); --ease-spring:cubic-bezier(.34,1.4,.4,1);
}
```
Demosi: coral/mint/lilac TIDAK lagi jadi permukaan tombol/aksi (kontras gagal). Boleh hidup terbatas di ilustrasi/stiker modul dengan teks ink.

## Tipografi
- Heading/display: **FZ Fredoka** (dipertahankan — kehangatan brand) tapi HANYA display & judul layar; judul kartu/UI pakai Jakarta 700.
- Body/UI: **FZ Plus Jakarta Sans** 400–700. Instrument Serif dihapus perannya (REPLACE) kecuali kutipan testimonial.
- Skala (mobile): display 28, h1 22, h2 18, body 15, label 13, micro 12 (LANTAI 12px — tak ada teks <12px; ganti eyebrow 7–10px sekarang).
- Angka data: Jakarta 700 tabular-nums.

## Aturan maskot (REFINE perilaku, PRESERVE identitas)
Maskot PAW tetap wajah AI tutor. Aturan baru: (1) TIDAK PERNAH menutupi konten interaktif/feedback — slot maskot khusus (dock kanan-bawah 88px atau inline slot kartu); (2) reaksi kontekstual state nyata (correct/encouraging/hinting/listening/celebrating/thinking); (3) bubble coach maks 2 baris, auto-dismiss, tak menghalangi tap target.

## Ikonografi & ilustrasi
Lucide (sudah ada) stroke 1.75, ukuran 20/24. Ilustrasi = flat warm shapes + garis neural kuning untuk momen AI. Dilarang emoji sebagai ikon UI.

## Bahasa motion (pakai fiezel-motion v2.1 yang sudah ada)
OBSERVE→ANALYZE→ADAPT→TEACH→IMPROVE. Spring lembut (--ease-spring), morph antar state, durasi 160–420ms, respect prefers-reduced-motion. Jangan over-animate konten edukasi.

## Perbaikan wajib dari audit (masuk semua layar terkait)
1. Tombol "Dengarkan"/"Nilai jawaban": permukaan ink/sun, kontras ≥4.5:1 (audit: 1.92/1.45 — REPLACE).
2. Toast: panel ink + teks krem (audit: navy+gelap — REPLACE).
3. Lantai font 12px; nav label 12, eyebrow 12 tracking lebar.
4. Disabled state: teks 4.5:1 minimum di --panel-soft + ikon gembok, bukan opacity rendah.
5. Kunci internal ("PARTOFSPEECH") tak boleh bocor ke UI — label id.
6. Touch target ≥44px semua kontrol (coach-strip-more 22px → 44px).
7. Focus-visible ring 2px --sun-deep offset 2px konsisten.

## Layar inti hi-fi (mobile 390×844, HTML statis offline)
Onboarding, Home/dashboard, Lesson selection/library, Quiz grammar (+ confidence + feedback benar/salah + hint/teach card), Listening, Vocabulary, Progress/analytics, Completion, Profile/settings.
Setiap layar: pertahankan ARSITEKTUR INFORMASI & fungsi yang ada (lihat screenshot audit di /home/user/workspace/redesign/audit/shots/), ganti kulit visual ke sistem baru. Sertakan state penting (default/press/disabled/loading/success/error) bila relevan.

## Aset
Font: /home/user/workspace/fiezel-apps/assets/fonts/. Maskot SVG: /home/user/workspace/fiezel-apps/assets/brand/ + /home/user/workspace/promo-v7/shared/mascot/. Logo: /home/user/workspace/promo-v7/shared/brand/.
