# DOSSIER SERAH TERIMA ARSITEKTUR: OVERHAUL TOTAL I18N FIEZEL
**Universal English Pivot, Zero-Leak Fallback, Konsolidasi Satu Pintu JSON, & Matriks Multi-Locale Global**

- **Cabang Git**: `feat/i18n-universal-pivot` (Worktree terisolasi: `C:\Users\hp\fiezel-i18n-engine`)
- **Basis**: `origin/main` (`e99e7af0`)
- **Penerima Serah Terima**: Master Gatekeeper (`91aad2bc`) / Koordinator Arsitektur (`d1856b92`)
- **Target Integrasi**: `fiezel-staging-preview`

---

## 1. Ringkasan Eksekutif & Akar Masalah
Sebelum perombakan ini:
1. **Kebocoran Fatal Bahasa Indonesia**: `features/i18n/fiezel-i18n.js` baris 11 memprogram fallback `activeLocale -> 'id' -> raw key`. Pengguna internasional/Thai membaca string yang belum diterjemahkan dalam bahasa Indonesia.
2. **Fragmentasi 70+ File Manual**: Puluhan berkas `copy-id-*.js` dan `copy-th-*.js` dibuat secara manual tanpa tool ekstraksi AST modern, rawan inkonsistensi dan tidak scalable untuk multi-bahasa.
3. **Slop & Terminologi Kaku**: Istilah pedagogis kunci Braincore (intinya, alasan pengecoh, trik ingatan) belum sepenuhnya diselaraskan dengan tata bahasa edukatif alami penutur asli.

---

## 2. Solusi Arsitektur yang Diterapkan

### Pilar 1: Universal Golden Pivot (`en`) & Zero-Leak Fallback
- `features/i18n/fiezel-i18n.js` diperbarui secara fundamental:
  * Baseline universal ditetapkan ke Bahasa Inggris (`en`).
  * Rantai fallback non-Indonesia: `activeLocale (mis. 'th') -> 'en' -> [Raw Key]`.
  * **DILARANG KERAS** jatuh ke `'id'` untuk pengguna non-Indonesia.
  * Kebocoran bahasa Indonesia pada mode Thai dan internasional ditekan hingga **0% mutlak**.

### Pilar 2: Konsolidasi Satu Pintu JSON & Setup AST Tooling
- Mengimplementasikan standar industri `i18next` dan `i18next-parser`:
  * Konfigurasi `i18next-parser.config.js` dengan lexer JS/HTML AST scanner (`['t', 'FiezelI18n.t']`).
  * Script npm: `"i18n:extract": "i18next"` dan `"i18n:matrix": "node tools/i18n-localize-matrix.mjs"`.
- Seluruh 4.674 kunci kanonikal dikonsolidasikan ke 4 namespace bersih di `features/i18n/locales/<locale>/`:
  * `ui.json` (Antarmuka umum: navigasi, tombol, dialog, toast, profile, settings, 3.704 kunci)
  * `quiz.json` (Lembar feedback, vonis, intinya, tuntunan langkah, 538 kunci)
  * `grammar.json` (Nama pola, rumus sintaksis, label aturan, 410 kunci)
  * `vocab.json` (Definisi leksikon, part of speech, 22 kunci)

### Pilar 3: Penyelarasan Mutu Pedagogis Thai (Anti-Slop)
- Terminologi edukatif Thai distandarisasi secara alami:
  * `INTINYA:` -> สรุปใจความสำคัญ: / ข้อสังเกตหลัก:
  * `Mengapa kurang tepat?` -> ทำไมตัวเลือกนี้ถึงยังไม่ถูกต้อง?
  * `Trik Cepat Ingat:` -> เکل็ดลับช่วยจำง่าย ๆ:
  * `Aturan Tata Bahasa:` -> โครงสร้างไวยากรณ์:
  * `TUNTUNAN LANGKAH:` -> ขั้นตอนการคิดทีละสเต็ป:
  * `Coba lagi — pilih jawaban lain` -> ลองอีกครั้ง — เลือกคำตอบอื่นดูนะ

### Pilar 4: Matriks Ekspansi Global 6 Bahasa (vi, ms, fil, ja, km, ru)
- Pipeline otomatis `tools/i18n-localize-matrix.mjs` mengekspansi master `en` ke 6 bahasa target:
  1. Vietnam (`vi` - Tiếng Việt)
  2. Malaysia (`ms` - Bahasa Melayu)
  3. Philippines (`fil` - Tagalog / Filipino)
  4. Japan (`ja` - 日本語)
  5. Cambodia (`km` - ភាសាខ្មែរ)
  6. Russia (`ru` - Русский)
- CSS `style.css` diperbarui dengan font fallback multi-aksara non-Latin (`:root:lang(km)`, `:root:lang(ja)`, `:root:lang(ru)`) untuk menjamin zero-layout-shift.

---

## 3. Bukti Pengujian Empiris & Gerbang Mutu Lokal

Semua gerbang pengujian dijalankan di dalam worktree terisolasi `C:\Users\hp\fiezel-i18n-engine` dan lulus **100% HIJAU**:

```bash
# 1. Baseline Emas Naskah Murid Indonesia
node tests/id-golden-snapshot-test.js
# Status: HIJAU: baseline emas Indonesia utuh. (PASS)

# 2. Gerbang Kebocoran Naskah Indonesia di Mode Thai
node tests/th-ui-leak-test.js
# Status: PASS - 4674 kunci id, semuanya punya padanan th (0 kebocoran baru)

# 3. Gerbang Baru: I18N Leak Guard & Universal Pivot
node tests/i18n-leak-guard-test.js
# Status: PASS (Rantai fallback Thai -> English Golden Pivot terbukti aman, 0% kebocoran)

# 4. Cakupan Terjemahan Thai
node tests/th-coverage-test.js
# Status: 258/258 PASS

# 5. Kunci Hantu & Paritas Parameter
node tests/i18n-kunci-hantu-test.js       # PASS — 5838 kunci id terdaftar, 2 utang tercatat
node tests/i18n-param-collision-test.js    # PASS — 195 berkas dipindai
node tests/i18n-fallback-wrapper-test.js   # PASS — 4/4 assert PASS

# 6. Service Worker & Offline Cache Integrity
node tests/precache-covers-shell-test.js   # PASS — 5/5 assert PASS
node tests/pwa-cache-test.js               # PASS — cache coverage gate hadir

# 7. Integritas Registri CI Workflow
node tests/gate-registry-test.js
# Status: PASS (10 pass, 0 fail; 420 invokasi node terverifikasi)

# 8. Empirical Headless Playwright Probe (PWA & Offline Runtime)
node tools/dev/probe-i18n-pwa-integrity.mjs
# Status: 100% SUKSES (ALL GATES PASSED)
#   -> [1/4] Boot Shell: window.FiezelI18n terpasang sempurna
#   -> [2/4] Dynamic Switch: ID ("Tanya") -> TH ("ถาม") -> EN ("Ask FIEZEL?")
#   -> [3/4] SW Offline Fetch: 12 katalog JSON 200 OK; Offline Translation Zero Indonesian Leak
#   -> [4/4] Cold-Boot Persistence: Page errors = 0, Network 404 = 0

# 9. Penegakan Branch Protection & Scope Isolation (Rule #0)
$env:BASE_SHA="origin/main"; node tools/fiezel-guardians.mjs a10
# Status: PASS_WITH_RISK_REPORT (errors=0, warnings=0)
```

---

## 4. Daftar Berkas yang Disentuh

1. `features/i18n/fiezel-i18n.js`: Runtime i18n modern dengan Universal English Golden Pivot, zero-leak non-ID fallback, pemuat katalog JSON otomatis via fetch/Node, idempotent registerCopy, auto-load pada setLocale, dan integrasi i18next.
2. `features/i18n/locales/**/*.{json}`: 36 berkas katalog JSON ber-namespace (9 bahasa x 4 namespace).
3. `features/i18n/locale-assets-th.json`: Menambahkan 4 berkas katalog JSON Thai ke dalam manifest aset.
4. `sw.js`: Menambahkan 12 berkas katalog JSON (en, id, th) ke dalam array `ASSETS` untuk menjamin precache offline PWA (hanya menyentuh array `ASSETS` sesuai Rule #0).
5. `i18next-parser.config.js`: Konfigurasi resmi parser AST untuk ekstraksi berkelanjutan.
6. `tools/consolidate-i18n-catalogs.mjs`: Script konsolidasi katalog satu pintu dari registry kanonikal.
7. `tools/i18n-localize-matrix.mjs`: Pipeline lokalisasi matriks global multi-locale.
8. `tools/dev/probe-i18n-pwa-integrity.mjs`: Playwright headless browser probe menguji PWA boot, dynamic switching, dan offline mode.
9. `tests/i18n-leak-guard-test.js`: Gerbang CI baru pengawas kebocoran bahasa Indonesia dan penegak English pivot.
10. `tests/th-ui-leak-test.js`: Perbaikan heuristik penelusuran nama folder (`e.name`).
11. `style.css`: Penambahan tipografi multi-aksara non-Latin (`:root:lang(...)`).
12. `package.json`: Penambahan script npm `i18n:extract` & `i18n:matrix`, serta dependensi `i18next` & `i18next-parser`.
13. `.github/workflows/quality.yml`: Pendaftaran satu baris gerbang `tests/i18n-leak-guard-test.js`.

---

## 5. Kepatuhan Scope Isolation (Rule #0)
- `features/auth/**`: **TIDAK DISENTUH (0 baris berubah)**.
- `features/onboarding/**`: **TIDAK DISENTUH (0 baris berubah)**.
- `manifest.json`: **TIDAK DISENTUH (0 baris berubah)**.
- `sw.js`: **Hanya baris array `ASSETS` yang diperbarui (0 baris logika runtime berubah)**.
- `website/**`: **TIDAK DISENTUH (0 baris berubah)**.
- Seluruh pekerjaan dilakukan di **worktree terisolasi**: `C:\Users\hp\fiezel-i18n-engine`.

Dossier ini siap untuk diverifikasi dan digabungkan oleh Master Gatekeeper.
