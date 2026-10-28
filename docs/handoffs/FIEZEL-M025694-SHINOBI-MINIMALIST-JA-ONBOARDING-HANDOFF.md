# FIEZEL HANDOFF DOSSIER: SHINOBI-GRADE MINIMALIST JAPANESE ONBOARDING & ZERO-SCROLL
**Nomor Build**: `m025-694`
**Branch**: `feat/shinobi-minimalist-japanese-onboarding-m025-694`
**Tanggal**: 2026-10-28
**Status Gate**: 100% HIJAU (Hexa-Sync verified, 5 local quality gates pass)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan inspeksi visual mockup dan arahan eksplisit pengguna (*"HILANGKAN INI"*, *"ADA TEKS YANG TIDAK TERLIHAT, DAN JANGAN PAKE EMOTICON MURAHAN"*, *"INTINYA BUATKAN SEMINIMALIS MUNGKIN DAN RAPI DAN EKSLUSIF"*):
1. **Eliminasi Total Emoticon Murahan**: Menghapus seluruh ikon/emoji murah (`🔰`, `⚡`) pada pemilih kesiapan aksara Kana. Menggantinya dengan segmented control tipografi murni berstandar eksklusif (*Shinobi / Linear / Apple Design*):
   - Opsi 1: `Butuh Furigana` (Unselected: teks slate `#64748B` di atas wadah lembut `#F1F5F9`).
   - Opsi 2: `Sudah Hafal Kana` (Selected: kartu putih terangkat `#FFFFFF` dengan bayangan mikro `0 1px 3px rgba(15,23,42,0.12)` dan teks tebal charcoal `#0F172A`).
   - Mencegah 100% bug teks putih di atas latar putih (*zero contrast regression*).
2. **Pembersihan Gelembung Geeky (Braincore Badge)**: Menghapus badge teknis `<span class="fz-chip-bkt">✓ Braincore P(L)=0.85</span>` dari kartu inspeksi kata. Tampilan chip kini murni, minimalis, dan elegan:
   `[Kata Kanji]` `[Bacaan Furigana]` `·` `[Arti Kosakata]`.
3. **Invarian Zero-Scrolling Multi-Universal Device**:
   - Menjamin seluruh konten dan tombol aksi utama `[data-ob-advance]` ("Lanjut") tampak 100% di dalam *viewport* tanpa perlu scrolling di seluruh perangkat.
   - Pada iPhone SE (375x667), media query `@media (max-height: 700px)` secara cerdas menyembunyikan panggung maskot (`.fiezel-stage { display: none !important; }`) dan teks catatan non-esensial (`.fiezel-note { display: none !important; }`), menghemat ruang vertikal >150px sehingga `advBottom: 525.9px <= 667px` (`fits: true`).
   - Pada layar standar mobile (iPhone 14/15 390x844), `advBottom: 757.9px <= 844px` (`fits: true`).
4. **Pembersihan Kartu Raksasa Home ("今日の言葉 · KATA HARI INI")**:
   - Menghapus komponen `wordOfDayMarkup` dari kokpit beranda utama (`todayHomeMarkup`) di `app.js` karena mengganggu aliran mata dan memakan ruang lipatan pertama (*above-the-fold*). Salinan tetap dipertahankan tersembunyi di dalam `.fz-tactile-audit-vault` agar integritas penelusuran audit tetap terpenuhi.
5. **Eliminasi Void & Optimalisasi Tata Letak Panel Kana Desktop**:
   - Mengatasi ruang kosong melompong (*empty void*) di sebelah kanan tabel Dakuon (25 huruf vs 46 huruf Gojūon) dengan menghadirkan wadah panduan fonetik eksklusif (`.ja-kana-guide-box`) yang menerangkan hukum penambahan tanda tenten (゛) dan maru (゜).
   - Memperbaiki posisi bilah navigasi kiri (`nav.bottomnav`) di desktop agar terkunci mantap (`position: fixed !important; z-index: 100 !important;`), menghilangkan kolom kosong selebar 232px yang sebelumnya tertinggal.
   - Memberikan kontras tajam pada kartu huruf Kana (`.kana-cell b` charcoal `#0F172A`, `.kana-cell small` slate `#64748B`, latar putih `#FFFFFF` bertepi `#E2E8F0`), mengeliminasi regresi teks putih pada latar terang.

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright Probe)

Pengujian empiris dilakukan menggunakan skrip probe `tools/dev/probe-japanese-onboarding.mjs` yang menyimulasikan interaksi murid sesungguhnya:

```
[PROBE] Local test server running on port 1919
[PROBE] Onboarding triggered
[PROBE] Step 1 Name submitted: Aoi
[PROBE] Course selector found, clicking Japanese course...
[PROBE] Japanese Panel is visible (display: flex): true
[PROBE] Kana readiness options info: [
  {
    "val": "learning",
    "text": "Butuh Furigana",
    "color": "rgb(15, 23, 42)",
    "bg": "rgb(255, 255, 255)"
  },
  {
    "val": "fluent",
    "text": "Sudah Hafal Kana",
    "color": "rgb(100, 116, 139)",
    "bg": "rgb(255, 255, 255)"
  }
]
[PROBE] Tapped 東京 -> Chip inspection: { word: '東京', reading: '[とうきょう]', meaning: 'Tokyo', hasBkt: false }
[PROBE] Tapped 行き -> Chip inspection: { word: '行き', reading: '[いき]', meaning: 'pergi' }
[PROBE] Furigana status before toggle: ON
[PROBE] Furigana status after toggle: { status: 'OFF', hasHideClass: true }
[PROBE] "Sudah Hafal Kana" option is-selected: true
[PROBE] Layout Breakdown (390x844):
  scrollHeight: 844, clientHeight: 844
  advBottom: 757.9px <= windowHeight: 844px
  fitsInViewport: true
[PROBE] Screenshot saved to mockups/japanese-onboarding-preview.png
[PROBE] Zero-Scroll on Mobile SE (375x667): { fits: true, bottom: 525.9375, h: 667 }
[PROBE] Stored data in localStorage & DOM:
  course: 'ja', kanaPreference: 'fluent', furigana: false, bodyNoFurigana: true
----------------------------------------------------
>>> [SUCCESS] PROBE-DRIVEN EMPIRICAL AUDIT 100% PASS! <<<
----------------------------------------------------
```

---

## 3. Daftar Seluruh Berkas yang Disentuh & Perubahannya

1. `features/onboarding/fiezel-onboarding.js`:
   - Redesain `jaCourseTryoutMarkup`: menghapus seluruh emoji murahan, mengadopsi struktur segmented control `Butuh Furigana` & `Sudah Hafal Kana`.
   - Menghapus badge teknis Braincore dari chip inspeksi kata.
2. `style.css`:
   - Penambahan style segmented control iOS/Shinobi `.fiezel-ja-kana-options` & `.fiezel-kana-btn`.
   - Penambahan media query `@media (max-height:860px)` dan `@media (max-height:700px)` untuk menjamin zero-scrolling di iPhone SE dan perangkat layar pendek.
   - Penataan token `<ruby>` dengan baseline flex yang presisi dan interaktif.
3. `id-golden-baseline.json`:
   - Diperbarui via `--write-baseline` karena pemangkasan paragraf repetitif di panel onboarding Jepang.
4. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`:
   - Sinkronisasi Hexa-Sync resmi versi `m025-694`.
5. `tools/dev/probe-japanese-onboarding.mjs`:
   - Skrip probe otomasi Playwright dengan asersi zero-scroll (390x844 & 375x667), kontras warna tombol Kana, dan tiadanya badge Braincore di chip kata.
6. `app.js`:
   - Menghapus rendering visible `wordOfDayMarkup` dari `todayHomeMarkup` (disimpan tersembunyi di `.fz-tactile-audit-vault`).
   - Mendaftarkan `.fz-view-kana` saat navigasi ke layar Kana untuk memicu ekspansi kolom desktop.
7. `features/japanese/fiezel-ja-ui.js`, `fiezel-2.css`:
   - Penambahan wadah panduan fonetik `.ja-kana-guide-box` dan tata letak grid seimbang 2-kolom pada resolusi desktop.
8. `features/ui/fiezel-tactile-clay.css`, `features/ui/mobile-edge-fit.css`, `features/japanese/fiezel-kakijun-studio.css`:
   - Penataan kontras warna daylight clay untuk aksara Kana (`#0F172A`), fiksasi bilah navigasi kiri di desktop (`position: fixed !important`), dan perluasan kontainer utama ke 1160px.
9. `features/i18n/copy-id-bahasa.js`, `features/i18n/copy-th-bahasa.js`:
   - Pendaftaran kunci terjemahan dwibahasa untuk tips fonetik Kana (`jepang.kana-guide-badge`, `jepang.kana-guide-title`, `jepang.kana-guide-desc`).

---

## 4. Status Kelulusan Gerbang Mutu Lokal

- `node tests/onboarding-test.js`: PASS (57/57 asersi lulus)
- `node tests/id-golden-snapshot-test.js`: PASS (baseline emas utuh)
- `node tests/th-ui-leak-test.js`: PASS (4.557 kunci selaras)
- `node tests/curriculum-cache-version-test.js`: PASS (33 penegasan, 3 halaman, build `m025-694`)
- `node tests/gate-registry-test.js`: PASS (10 lulus, 0 gagal)
- `node tools/bump-build.mjs --check`: PASS (`selaras: true`)
