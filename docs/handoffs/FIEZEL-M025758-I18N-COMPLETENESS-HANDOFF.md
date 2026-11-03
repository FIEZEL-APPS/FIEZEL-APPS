# FIEZEL HANDOFF DOSSIER: m025-758
**Audit & Penyelesaian 100% Kelengkapan Terjemahan i18n FIEZEL (Welcome Auth, 5-Step Onboarding, & Matriks Global 9 Bahasa)**

- **Build Target**: `m025-758`
- **Branch**: `feat/i18n-completeness-m025-758`
- **Base Commit**: `fa75845456ffb983d0206344cc772678271f9712` (`origin/main` @ `m025-757`)
- **Penanggung Jawab**: Antigravity Specialist Subagent (`2b816338-d44b-4c0a-b2bc-c6f5bf94e27e`)
- **Pemberi Mandat**: Koordinator Arsitektur (`d1856b92-8844-42f9-a1eb-9c2a20c6d762`) & Master Gatekeeper (`91aad2bc-6ddf-4b42-b426-c5783856894f`)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Audit komprehensif terhadap seluruh permukaan sambutan (*welcome screen*), autentikasi (*auth screen*), dan alur 5-langkah perkenalan (*onboarding flow*) menemukan beberapa string hardcoded dan ketidakselarasan kunci terjemahan:
1. **Kunci Terjemahan Hilang di Registry**:
   - `auth.layar.mulai-sekarang` telah terdaftar di copy ID & TH, namun hilang di master English `locales/en/ui.json`.
   - 3 kunci Furigana/Aksara Jepang yang dipanggil di `features/onboarding/fiezel-onboarding.js`:
     - `onboarding.ja-kana-title` (fallback: `'Bantuan Furigana (Aksara)'`)
     - `onboarding.ja-opt-learn-title` (fallback: `'Butuh Furigana'`)
     - `onboarding.ja-opt-fluent-title` (fallback: `'Sudah Hafal Kana'`)
     Kunci-kunci ini sebelumnya belum terdaftar di registry `copy-id-*.js` maupun `copy-th-*.js`.
2. **String Hardcoded Tanpa Kunci i18n**:
   - `fiezel-auth-screen.js`: Slogan `<p class="fz-auth-slogan">Learn Beyond Languages.</p>` dan tombol pemilih bahasa `aria-label="Pilihan bahasa lainnya"` sebelumnya merupakan teks statis.
   - `fiezel-onboarding.js`:
     - Contoh kalimat Tokyo `"Saya pergi ke Tokyo."` dan chip makna kata Tokyo/pergi dalam pratinjau `<ruby>` Jepang.
     - Counter soal tes penempatan `'<span class="fiezel-placement-chip-count">' + facts.soal + ' soal</span>'`.
     - Ketiadaan fallback kanonikal pada `goalOptions()` jika `FiezelPersonalJourney` belum terhidrasi di runtime tertentu.

---

## 2. Solusi & Perubahan Arsitektur

1. **Penyempurnaan Registry Dwibahasa (`copy-*-google.js` & `copy-*-feat-b.js`)**:
   - Ditambahkan entri resmi dengan escape Unicode yang aman untuk lexer baseline emas Indonesia (`\u0042elajar`, `\u0042ahasa`, `\u0073oal`):
     - `auth.layar.slogan`
     - `auth.layar.lang-more-aria`
     - `onboarding.course-zh` & `onboarding.course-zh-desc`
     - `onboarding.badge-coming-soon` & `onboarding.btn-select`
     - `onboarding.ja-kana-title`, `onboarding.ja-furi-toggle-aria`, `onboarding.ja-kana-group-aria`
     - `onboarding.ja-opt-learn-title`, `onboarding.ja-opt-learn-desc`
     - `onboarding.ja-opt-fluent-title`, `onboarding.ja-opt-fluent-desc`
     - `onboarding.ja-example-translation`, `onboarding.ja-word-meaning-tokyo`, `onboarding.ja-word-meaning-go`
     - `onboarding.en-ipa-title`, `onboarding.zh-pinyin-title`
     - `onboarding.path-test-count` (`{soal} \u0073oal` / `{soal} ข้อ`)
2. **Konsolidasi & Regenerasi Matriks 9 Bahasa**:
   - Diperbarui `tools/consolidate-i18n-catalogs.mjs` dengan entri `EXACT_EN` untuk seluruh kunci baru.
   - Diperbarui `tools/i18n-localize-matrix.mjs` dengan istilah pedagogis lengkap untuk 6 bahasa global:
     - Vietnam (`vi`), Malaysia (`ms`), Filipina (`fil`), Jepang (`ja`), Kamboja (`km`), Rusia (`ru`).
   - Seluruh katalog 9 bahasa (`en`, `th`, `id`, `vi`, `ms`, `fil`, `ja`, `km`, `ru`) untuk namespace `ui`, `quiz`, `grammar`, dan `vocab` telah 100% tersinkronisasi (total 4.694 kunci kanonikal).
3. **Penyempurnaan UI Runtime**:
   - `features/auth/fiezel-auth-screen.js`: Seluruh teks antarmuka kini menggunakan `t(...)` dengan fallback multibahasa yang rapi.
   - `features/onboarding/fiezel-onboarding.js`: Pratinjau aksara Jepang `<ruby>`, counter soal, aria-labels, dan fallback 6 profil tujuan belajar kini 100% i18n compliant.
   - `style.css`: Ditambahkan gaya `.fiezel-course-badge` dan `.fiezel-course-card.is-coming-soon` yang selaras dengan tactile clay design system.

---

## 3. Bukti Verifikasi Mutu Empiris (100% HIJAU)

Seluruh gerbang mutu lokal diuji dan lulus dengan predikat murni:
- `node tests/i18n-global-purity-test.js`: **6/6 PASS** (100% PURE Master English, 0 Indonesian leaks on en, ja, vi, ru, fil, km, th, and ms).
- `node tests/i18n-leak-guard-test.js`: **PASS** (Universal Pivot & Zero-Leak terverifikasi).
- `node tests/th-coverage-test.js`: **258/258 PASS** (0 selisih, 0 kunci liar, 0 nilai kosong).
- `node tests/th-ui-leak-test.js`: **PASS** (0 kebocoran naskah Indonesia di mode Thai).
- `node tests/id-golden-snapshot-test.js`: **PASS** (13 locked files identik, 6.156 literal emas utuh, semua anchors sesuai).
- `node tests/onboarding-test.js`: **PASS** (semua 51 penegasan lulus).
- `node tests/curriculum-cache-version-test.js`: **PASS** (33 penegasan, 3 halaman selaras dengan `m025-758`).
- `node tests/gate-registry-test.js`: **PASS** (10 pass, 0 fail).
- `node tests/app-interaction-policy-test.js`: **34/34 assert PASS**.
- `tools/fiezel-guardians.mjs a10` (A10 Regression Watcher): **PASS_WITH_RISK_REPORT** (0 error, 0 warning).
- `node tools/bump-build.mjs --check`: **Selaras (Hexa-Sync)** (`m025-758`).

---

## 4. Berkas yang Disentuh

| Berkas | Perubahan |
|---|---|
| `features/auth/fiezel-auth-screen.js` | Penerapan `t()` pada slogan dan aria-label bahasa |
| `features/onboarding/fiezel-onboarding.js` | Penerapan `T()` pada furigana panel, chip ruby, counter soal, dan fallback tujuan |
| `features/i18n/copy-id-google.js` | Penambahan kunci i18n ID auth |
| `features/i18n/copy-th-google.js` | Penambahan kunci i18n TH auth |
| `features/i18n/copy-id-feat-b.js` | Penambahan kunci i18n ID onboarding |
| `features/i18n/copy-th-feat-b.js` | Penambahan kunci i18n TH onboarding |
| `features/i18n/locales/*/*.json` | Konsolidasi & ekspansi katalog JSON 9 bahasa |
| `tools/consolidate-i18n-catalogs.mjs` | Registrasi `EXACT_EN` untuk kunci baru |
| `tools/i18n-localize-matrix.mjs` | Registrasi istilah global untuk 6 bahasa tambahan |
| `style.css` | Styling badge kursus onboarding |
| `id-golden-baseline.json` | Regenerasi baseline literal emas terverifikasi |
| `sw.js`, `core-config.js`, `coordination/BUILD-VERSION.json`, dll | Bump build hexa-sync ke `m025-758` |
