# FIEZEL HANDOFF DOSSIER: M025-513
## Transformasi Sesi Susun Kata (Token-Order) Menjadi Menerjemahkan Kalimat Bahasa Indonesia ke Bahasa Inggris

- **Build Version**: `m025-513`
- **Tanggal**: 2026-10-08
- **Tipe**: `feat(grammar)`
- **Status Mutu**: 100% HIJAU (Seluruh Gerbang Mutu Lokal Lulus)
- **Hexa-Sync**: Selaras di 6 titik kanonik (`m025-513`)

---

### 1. Ringkasan Eksekutif & Amanat Perubahan

Sebelumnya, sesi latihan susun kata (`token-order`) menampilkan potongan kalimat rumpang bahasa Inggris sebagai soal (misal: *"Look! The chef ___ a new dish right now. You can smell it."*), lalu murid diminta menyusun kata bahasa Inggris di bawahnya. Hal ini menyebabkan kebingungan kognitif:
1. Murid hanya mencocokkan kata (word matching) tanpa berpikir aktif.
2. Template rumpang bocor karena kata kunci ikut terbaca di prompt soal.
3. Potensi bug rumpang ganda atau duplikasi kata.

**Transformasi Sistem Baru**:
Seluruh 512 bank template grammar bahasa Inggris kini dilengkapi dengan terjemahan Bahasa Indonesia yang luwes, alami, dan komunikatif:
- **Instruksi Soal**: `"Terjemahkan ke Bahasa Inggris:"`
- **Teks Soal / Stem**: Kalimat utuh Bahasa Indonesia, contoh:
  *"Lihat! Kokinya sedang menyiapkan hidangan baru saat ini, kamu bisa menciumnya."*
- **Token Kata**: Murid menyusun struktur kalimat Bahasa Inggris dari kata-kata acak di bawahnya (`Look!`, `The`, `chef`, `is`, `preparing`, `a`, `new`, `dish`, `right`, `now.`, `You`, `can`, `smell`, `it.`).
- **Pedagogical Impact**: Mengadopsi standar emas pembelajaran bahasa global (Duolingo, Babbel) dengan melatih *Active Productive Recall*.

---

### 2. Berkas yang Dibuat & Diubah

1. **`features/i18n/grammar-sentence-translations.js`**:
   - Memetakan 512 template grammar (`TA-001` s/d `A2-416`) ke kalimat terjemahan Bahasa Indonesia yang natural.
   - Diekspor secara aman ke `self.FiezelGrammarTranslations`, `window`, dan `globalThis`.
2. **`features/grammar/grammar-sentence-translations.json`**:
   - Arsip JSON sumber terjemahan untuk keperluan generator dan integrasi kurikulum.
3. **`app.js` (`makeGrammarTokenOrderQuestion` & `renderQuizQuestionContent`)**:
   - Mengambil terjemahan Bahasa Indonesia dari `self.FiezelGrammarTranslations[templateId]`.
   - Mengatur `instruction: FiezelI18n.t('grammar.token-order-translate-instruction', 'Terjemahkan ke Bahasa Inggris:')`.
   - Mengatur `question: idTranslation`.
4. **`features/i18n/copy-id-grammar-labels.js` & `copy-th-grammar-labels.js`**:
   - Menambahkan kunci `grammar.token-order-translate-instruction` dan `grammar.token-order-panduan-label` dengan paritas 100% Thai.
5. **`index.html` & `sw.js`**:
   - Mendaftarkan skrip `./features/i18n/grammar-sentence-translations.js` di shell PWA dan precache `ASSETS`.
6. **`id-golden-baseline.json`**:
   - Menyimpan baseline literal emas baru (5493 literal terverifikasi).
7. **Hexa-Sync Arbiter (`m025-513`)**:
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`

---

### 3. Bukti Pengujian Empiris (Playwright Headless Probe)

Skrip probe empiris peramban `tools/dev/quick-probe-translation.mjs` dijalankan pada Chromium headless:
1. `hasTranslationsObj`: `true` (512 kalimat terdaftar).
2. `qInstruction`: `"Terjemahkan ke Bahasa Inggris:"`
3. `qQuestion`: `"Lihat! Kokinya sedang menyiapkan hidangan baru saat ini, kamu bisa menciumnya."`
4. `qTokens`: `["Look", "The", "chef", "is", "preparing", "a", "new", "dish", "right", "now", "You", "can", "smell", "it"]`
5. Tangkapan layar empiris tersimpan di:
   `reports/audit-user-bugs/token-order-translation-live.png`

---

### 4. Status Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js` : **PASS** (13 berkas identik, 5493 literal selaras)
- `node tests/th-coverage-test.js` : **PASS** (250/250 asserts)
- `node tests/th-ui-leak-test.js` : **PASS** (0 kebocoran baru)
- `node tests/curriculum-cache-version-test.js` : **PASS** (26 penegasan, 2 halaman, build m025-513)
- `node tests/precache-covers-shell-test.js` : **PASS** (5/5 asserts)
- `node tests/gate-registry-test.js` : **PASS** (10 pass, 0 fail)
- `node tools/bump-build.mjs --check` : **SELARAS** di seluruh 6 titik kanonik (`m025-513`).
