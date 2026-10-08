# FIEZEL Handoff Dossier: m025-517 UI/UX Overhaul, Contextual Topbar, Fit Flashcard Deck, dan Zero-Void Layout

- **Versi Build**: `m025-517`
- **Branch**: `fix/m025-517-uiux-overhaul-and-topbar`
- **Target**: `main`
- **Tanggal**: 2026-10-08

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Sesi rilis ini menuntaskan perbaikan UI/UX komprehensif atas daftar isu yang dilaporkan:

1. **Topbar Kontekstual per Panel (Home, Latihan, KelasKu, Game, Progres, Profil)**:
   - Tag status merek di topbar (`#topBrandTag`) sebelumnya statis ("Aktif"). Kini diselaraskan secara kontekstual di `app.js:renderInner()`:
     - Home: `AKTIF`
     - Latihan & Sub-modul (Vocab, Grammar, Reading, Skills, Listening, Speaking, Writing, Library): `LATIHAN`
     - KelasKu: `KELAS` / `AKTIF` (Emerald wordmark + selector kelas)
     - Game / Arena: `ARENA`
     - Progres: `PROGRES`
     - Profil / Online: `PROFIL`
   - Sisi kanan topbar menyajikan tindakan kontekstual: selektor kelas di KelasKu, tombol preferensi/pengaturan di Profil, dan selektor kursus tactile di Home/Latihan/Game/Progres.

2. **Eliminasi Kartu Capability Gate & Evidence Lokal di Bicara & Dengar**:
   - Menghapus kartu non-pedagogis internal (`Capability gate` audio output/neural voice status dan `Evidence lokal` attempt count) dari `renderHub()` pada `features/speaking-listening/fiezel-speaking-listening-addon.js`.
   - Grid kini menyajikan murni opsi latihan berfokus murid: Listening, Listening Exam, Speaking, dan Speaking Exam.

3. **Eliminasi Template Grammar Rusak & Penguatan Guards**:
   - Memastikan generator susun kata `makeGrammarTokenOrderQuestion` menolak 27 template yang bukan tepat 1 rumpang (0 rumpang atau $\ge 2$ rumpang) serta stem perbaikan kesalahan meta (`find and correct`).
   - Probe browser Chromium headless membuktikan 0 soal token-order rusak yang lolos ke layar murid.

4. **Perapian Tumpukan Kartu Kosakata (Flashcard Deck & Review Spacing/Layering)**:
   - Menambahkan efek kedalaman fisik tumpukan kartu (*card deck layering*) via pseudo-elements `::before` dan `::after` pada `.flashcard` di `features/ui/mobile-edge-fit.css` dan `style.css`.
   - Menyelaraskan kartu review kosakata (`reviewVocab`) dengan styling pill chip `.eyebrow` (`ULANGAN · {level}`) berlatar amber hangat dan margin rapi, seimbang dengan kartu flashcard harian.

5. **Perbaikan Unescaped `&amp;` di KelasKu dan Redesign Strings**:
   - Mengganti entitas HTML mentah `&amp;` menjadi karakter literal `&` pada `features/i18n/copy-id-redesign.js` (`kelasku.strip-latihan-materi`, `kelasku.strip-sinkron-guru`, `home.aurora-target-desc`).
   - Mencegah double-escaping yang menyebabkan teks tampil mentah sebagai `&amp;` di layar murid.
   - Memperbarui baseline emas Indonesia `id-golden-baseline.json` melalui tindakan sadar `--write-baseline`.

6. **Pangkas Void Space & Viewport Latihan Fit di Layar (Zero-Void Layout)**:
   - Menyelaraskan batas tinggi flashcard (`clamp(380px, 56vh, 540px)`) dan memastikan tidak ada dead space hitam di bagian bawah.
   - Panggung sesi quiz dan latihan fit dengan satu layar (*single-screen viewport*) tanpa scroll berlebih.

7. **Invarian Maskot Tetap Terpelihara**:
   - 3D Mochi companion dan PAW mascot tetap aktif dan lulus 35/35 pemeriksaan pada `tests/paw-mascot-test.js`.

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright & Node Tests)

- **Audit Token Order & Grammar Probe**:
  - `tools/dev/grammar-tokenorder-audit-2026-10-08-probe.js` -> PASS (0 soal rusak dirender)
- **Hexa-Sync Invariant Check**:
  - `node tools/bump-build.mjs --check` -> PASS (`Selaras`)
- **Baseline Emas Bahasa Indonesia**:
  - `node tests/id-golden-snapshot-test.js` -> PASS (5.489 literal utuh)
- **Kebocoran UI Thai**:
  - `node tests/th-ui-leak-test.js` -> PASS
- **Kurikulum Cache Version**:
  - `node tests/curriculum-cache-version-test.js` -> PASS (build `m025-517`)
- **Gate Registry Invariant**:
  - `node tests/gate-registry-test.js` -> PASS (10/10 checks)
- **Anti-Flicker & Shell UI/UX Invariant**:
  - `node tests/anti-flicker-uiux-invariant-test.js` -> PASS (14/14 checks)
- **PAW Mascot Rig**:
  - `node tests/paw-mascot-test.js` -> PASS (35/35 checks)
- **Gems Core & Economic Engine**:
  - `node tests/gems-test.js` -> PASS (34/34 checks)
- **Classroom & Persian Tutor**:
  - `node tests/classroom-test.js` -> PASS (20/20 checks)
- **Course Persistence**:
  - `node tests/course-persistence-test.js` -> PASS (8/8 checks)
- **PWA Cache Invariant**:
  - `node tests/pwa-cache-test.js` -> PASS

---

## 3. Berkas yang Dimodifikasi

1. `features/speaking-listening/fiezel-speaking-listening-addon.js`:
   - Menghapus kartu `Capability gate` dan `Evidence lokal` dari `renderHub()`.
2. `features/i18n/copy-id-redesign.js`:
   - Memperbaiki `&amp;` menjadi `&` pada kunci `kelasku.strip-latihan-materi`, `kelasku.strip-sinkron-guru`, dan `home.aurora-target-desc`.
3. `index.html`:
   - Menyematkan `id="topBrandTag"` pada elemen `.fiezel-brand-tag` topbar.
4. `app.js`:
   - Memperbarui `renderInner()` untuk mengatur teks tag topbar secara kontekstual per panel (`AKTIF`, `LATIHAN`, `PROGRES`, `ARENA`, `PROFIL`, `KELAS`).
5. `features/ui/mobile-edge-fit.css` & `style.css`:
   - Menambahkan layering dek kartu bertumpuk (`.flashcard::before`, `.flashcard::after`) dengan bayangan dan border hangat.
   - Menambahkan gaya chip pill `.eyebrow` pada kartu review.
6. `id-golden-baseline.json`:
   - Regenerasi baseline emas setelah pembersihan kartu non-pedagogis dan perbaikan entity string.
7. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`:
   - Bumping versi build ke `m025-517` secara hexa-sync via arbiter `tools/bump-build.mjs`.
8. `reports/th-ui-leak-report.json`:
   - Snapshot diperbarui saat validasi `th-ui-leak-test.js`.

---

## 4. Status Gerbang Mutu Lokal

Seluruh 12 gerbang uji lokal utama lulus 100% HIJAU.
Tidak ada utang teknis baru yang ditinggalkan.
Semua perubahan siap dirilis melalui Pull Request sesuai Git Protection Rule.
