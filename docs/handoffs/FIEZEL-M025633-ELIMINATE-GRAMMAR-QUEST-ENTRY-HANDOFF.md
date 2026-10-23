# FIEZEL-M025633 — Handoff Dossier: Eliminasi Total Fiezel Quest Saat Memasuki Sesi Latihan Baru di Grammar

- **Nomor Build**: `m025-633`
- **Tanggal**: 24 Oktober 2026
- **Otoritas**: OWNER & MASTER Architecture Directive
- **Status Hexa-Sync (`node tools/bump-build.mjs --check`)**: `Selaras` (`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan arahan eksplisit pengguna (*"sepertinya fiezel quest saat memasuki sesi latihan baru di grammar, tidak di perlukan, hapuskan aja semuanua"*):
1. **Friksi Masuk Sesi Grammar Sebelumnya**:
   - Setiap kali murid membuka atau mengetuk salah satu materi tata bahasa di Grammar Hub (`openGrammarLesson(skill)` atau `practiceSkill(skill)`), sistem secara otomatis menginterupsi alur dengan memunculkan modal lembar layar penuh **FIEZEL QUEST** (`.modal-mini-game-sheet`).
   - Murid dipaksa menyelesaikan 3 babak permainan mini kosakata (babak 1: mencocokkan kartu EN/ID, babak 2: pilihan arti kilat ABCD, babak 3: susun kalimat token, lalu modal kemenangan) sebelum diizinkan masuk ke latihan tata bahasa yang sebenarnya.
   - Hal ini menimbulkan hambatan mental, memperlambat murid yang ingin langsung menguji pemahaman gramatika, serta memicu kebingungan konteks belajar.
2. **Solusi Arsitektur yang Diterapkan**:
   - **Bypass Langsung**: Menghapus seluruh panggilan interseptor `openLessonPrerequisiteGate(skill)` di dalam `openGrammarLesson(skill)` ([`app.js`](file:///c:/Users/hp/fiezel-apps/app.js#L14005)) dan `practiceSkill(skill)` ([`app.js`](file:///c:/Users/hp/fiezel-apps/app.js#L14411)).
   - **Gerbang Prasyarat Murni Menembus**: Memperbarui fungsi `openLessonPrerequisiteGate(skill)` di [`features/grammar/grammar-vocab-bridge.js`](file:///c:/Users/hp/fiezel-apps/features/grammar/grammar-vocab-bridge.js) agar selalu langsung menandai `vocabReady = true` dan mengalirkan murid langsung ke `enterStage('grammar-lesson', ...)` / `practiceSkill(skill)` tanpa pernah memanggil `startVocabMiniGame(skill)`.
   - **Nol Distraksi & Sesi Murni**: Murid kini dapat mengetuk simpul jalur (*path-node*), kartu di list view, maupun tombol CTA *"Buka Lesson"* di Grammar Hub dan langsung masuk seketika ke latihan kuis grammar 10–20 soal (`.quiz-shell`).

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright Probe)

Probe empiris peramban Chromium Playwright dijalankan pada skenario nyata menggunakan [`tests/probe-grammar-quest-eliminated-test.js`](file:///c:/Users/hp/fiezel-apps/tests/probe-grammar-quest-eliminated-test.js):

### Perbandingan Dua Arah (Before vs After):
* **Kondisi Sebelum Perbaikan**:
  ```json
  {
    "hasQuestSheet": true,
    "questText": "FIEZEL QUEST",
    "hasQuizShell": false,
    "quizStem": null
  }
  ```
  *(Murid terblokir oleh modal FIEZEL QUEST, kuis tata bahasa belum terbuka)*

* **Kondisi Sesudah Perbaikan (Build `m025-633`)**:
  ```json
  {
    "hasQuestSheet": false,
    "questText": null,
    "hasQuizShell": true,
    "quizStem": "Lengkapi kalimat ini:My brother is at school. ___ is ten yea..."
  }
  ```
  *(Fiezel Quest tereliminasi 100%, murid langsung disambut soal pertama kuis latihan grammar)*

---

## 3. Daftar Berkas yang Disentuh & Perubahannya

1. [`app.js`](file:///c:/Users/hp/fiezel-apps/app.js):
   - Membersihkan interseptor `openLessonPrerequisiteGate(skill)` dari `openGrammarLesson(skill)`.
   - Membersihkan interseptor `openLessonPrerequisiteGate(skill)` dari `practiceSkill(skill)`.
2. [`features/grammar/grammar-vocab-bridge.js`](file:///c:/Users/hp/fiezel-apps/features/grammar/grammar-vocab-bridge.js):
   - Mengubah `openLessonPrerequisiteGate(skill)` menjadi bypass langsung tanpa memanggil `startVocabMiniGame(skill)`.
3. [`tests/probe-grammar-quest-eliminated-test.js`](file:///c:/Users/hp/fiezel-apps/tests/probe-grammar-quest-eliminated-test.js):
   - Berkas probe Playwright headless otomatis baru untuk memverifikasi secara empiris eliminasi total Fiezel Quest saat membuka pelajaran grammar.
4. [`tests/gate-registry-test.js`](file:///c:/Users/hp/fiezel-apps/tests/gate-registry-test.js):
   - Mendaftarkan `tests/probe-grammar-quest-eliminated-test.js` ke dalam `EXCLUSIONS` (kategori probe grafis Playwright lokal).
5. [`tests/no-network-test.js`](file:///c:/Users/hp/fiezel-apps/tests/no-network-test.js):
   - Mendaftarkan `tests/probe-grammar-quest-eliminated-test.js` ke dalam `EXCLUDED_DEV_TOOLS`.
6. [`id-golden-baseline.json`](file:///c:/Users/hp/fiezel-apps/id-golden-baseline.json):
   - Menyelaraskan snapshot baseline emas teks bahasa Indonesia pasca-penghapusan blok logika lama.
7. Berkas Penanda Rilis Hexa-Sync:
   - [`coordination/BUILD-VERSION.json`](file:///c:/Users/hp/fiezel-apps/coordination/BUILD-VERSION.json): dinaikkan ke `m025-633`.
   - [`sw.js`](file:///c:/Users/hp/fiezel-apps/sw.js): `SW_REV` dinaikkan ke `m025-633-unified-grammar-20261002`.
   - [`core-config.js`](file:///c:/Users/hp/fiezel-apps/core-config.js): `self.FIEZEL_PAGE_BUILD` diselaraskan ke `m025-633`.
   - [`features/neural-voice/fiezel-diag-panel.js`](file:///c:/Users/hp/fiezel-apps/features/neural-voice/fiezel-diag-panel.js): diselaraskan ke `m025-633`.
   - [`kurikulum.html`](file:///c:/Users/hp/fiezel-apps/kurikulum.html): parameter versi aset diselaraskan ke `m025-633`.
   - [`misi.html`](file:///c:/Users/hp/fiezel-apps/misi.html): parameter versi aset diselaraskan ke `m025-633`.

---

## 4. Status Kelulusan Gerbang Mutu Lokal

- `node tools/bump-build.mjs --check` → **PASS (`Selaras` 6 titik)**
- `node tests/gate-registry-test.js` → **PASS (10/10)**
- `node tests/no-network-test.js` → **PASS (41/41)**
- `node tests/id-golden-snapshot-test.js` → **PASS (baseline utuh)**
- `node tests/th-ui-leak-test.js` → **PASS (4412/4412 kunci)**
- `node tests/curriculum-cache-version-test.js` → **PASS (26/26, build `m025-633`)**
- `node tests/grammar-vocab-leveling-test.js` → **PASS (10/10)**
- `node tests/grammar-ux-p1-2026-10-04-test.js` → **PASS (11/11)**
- `node tests/grammar-ux-p3-2026-10-04-test.js` → **PASS (23/23)**
- `node tests/grammar-8-upgrades-full-test.js` → **PASS (9/9)**
- `node tests/braincore-pedagogy-audit-2026-10-11-test.js` → **PASS (15/15)**
- `node tests/probe-grammar-quest-eliminated-test.js` → **PASS (100% empiris Playwright)**
