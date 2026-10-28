# FIEZEL · Handoff Dossier: Universal Japanese Furigana Ruby & Phonetic Romaji Overhaul

**Nomor Rilis**: `m025-703`
**Branch**: `feat/universal-ja-furigana-romaji-m025-702`
**Otoritas**: OWNER / Subagent 5 (QA Empirical Probe & Content Integrity Gatekeeper)
**Status**: SELESAI & TERVERIFIKASI EMPIRIS PENUH (100% HIJAU)

---

## 1. Executive Summary

Pembaruan arsitektural berskala besar ini mereformasi total seluruh ekosistem bahasa Jepang di FIEZEL Apps dengan jaminan **Zero-Bare-Kanji Invariant** (0% kanji tanpa furigana) dan **100% Phonetic Romaji Availability** di seluruh permukaan aplikasi murid (180 teks bacaan, cerita berjenjang/Graded Stories N5, kuis miskonsepsi Braincore, dan obrolan interaktif AI Kaiwa).

Sebelum rilis ini, kanji dalam bacaan dan latihan sering kali gundul (bare kanji) tanpa furigana ruby, romaji kerap kali kosong (`undefined`/`null`), transliterasi fonetik mengalami anomali (misal `jya`/`jyu` alih-alih Hepburn murni `ja`/`ju`, partikel `wa`/`o`/`e` bocor sebagai `ha`/`wo`/`he`, dan kata-kata berkana kecil terputus di tengah jalan).

Melalui kolaborasi orkestrator multi-agent (Subagent 1 s/d 5), FIEZEL kini dipersenjatai dengan:
1. **Master Japanese Lexicon & Kanji Engine** (`fiezel-ja-dictionary.js`): 6.128 kata majemuk, 1.561 batang okurigana, 1.653 kanji tunggal, 20 pola penghitung counter numerik.
2. **Universal Furigana & Phonetic Romaji Annotator** (`fiezel-ja-ui.js`): Algoritma greedy matching terpanjang dengan pelindung batas partikel sintaksis.
3. **Graded Story Reader & Braincore Bridge** (`fiezel-story-reader.js` & `fiezel-story-brain-bridge.js`): 3 cerita N5 lengkap (15 adegan) dengan ilustrasi WebP fisik autentik dan kuis diagnostik ber-ledger miskonsepsi.
4. **Hepburn Standard Phonetics Arbiter** (`japanesePhonetics.js`): Kepatuhan 100% fonetik Hepburn internasional.
5. **Interactive Kaiwa Live Subtitle Card** (`fiezel-interactive-chat.js` & `fiezel-voice-call.js`): Subtitle panggung suara dua baris (kanji ruby + romaji).

---

## 2. Quantitative Verification Table (Zero-Potemkin Invariant)

Sesuai ketentuan **AGENTS.md Bagian 2**, berikut adalah tabel verifikasi kuantitatif perbandingan kondisi *Sebelum vs Sesudah*:

| Item/Fitur | Spesifikasi Target | Kondisi Sebelum Overhaul | Aktual Terealisasi | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Master Lexicon Compound Words** | $\ge 6.000$ entri | 0 (hanya ~50 kata hardcoded) | **6.128 kata majemuk** | **PASS (100%)** |
| **Master Lexicon Kanji Stems** | $\ge 1.500$ batang | 0 (tidak ada engine stem) | **1.561 batang konjugasi** | **PASS (100%)** |
| **Master Lexicon Single Kanji** | $\ge 1.640$ kanji | 0 (kanji asing bocor gundul) | **1.653 kanji unik (100% repo)** | **PASS (100%)** |
| **Reading Bank Passages Volume** | 180 teks bacaan N5/N4 | 180 teks | **180 teks bacaan** | **PASS (100%)** |
| **Zero-Bare-Kanji (Reading Bank)** | 0 kanji gundul | >1.000 kanji gundul | **0 kanji gundul (100% ruby)** | **PASS (100%)** |
| **Reading Bank Romaji Availability** | 100% (180/180) | <15% teks menghasilkan romaji | **180 / 180 teks (100%)** | **PASS (100%)** |
| **Graded Readers Story Volume** | $\ge 3$ judul cerita | 0 judul (hanya mockup statis) | **3 judul (15 adegan total)** | **PASS (100%)** |
| **Graded Reader Physical Artworks** | $\ge 150$ bita per adegan | 0 aset gambar nyata | **12 WebP fisik (34KB - 109KB)** | **PASS (100%)** |
| **Misconception Ledger & Distractors**| $\ge 3$ opsi + failWhy | 0 kuis diagnostik cerita | **3 kuis terverifikasi penuh** | **PASS (100%)** |
| **Pure Hepburn Phonetics (wa/o/e)** | 100% kaidah murni | Bocor: `ha`, `wo`, `jya`, `cch` | **0 pelanggaran fonetik** | **PASS (100%)** |
| **Interactive Voice Live Subtitle** | `#fzcCallSubRomaji` | Subtitle hanya teks kanji mentah | **Kontainer aktif & styled** | **PASS (100%)** |
| **Anti-Island Monolith Linkage** | `index.html` & `sw.js` | Modul terisolasi tanpa skrip | **4 modul terdaftar & precached** | **PASS (100%)** |
| **Hexa-Sync PWA Release Arbiter** | 6 titik selaras | m025-698 | **m025-703 selaras penuh** | **PASS (100%)** |

---

## 3. Komponen Inti yang Diterbitkan

### 3.1. `features/japanese/fiezel-ja-dictionary.js`
- Dihasilkan secara deterministik via generator Python/Node.js dari seluruh korpus kamus repo: JMdict, JLPT N5-N1 vocabulary bank, dan kanji repository.
- Menyediakan metode greedy: `lookupWord()`, `lookupStem()`, `lookupSingle()`, `lookupCounter()`, `kanaToRomaji()`.
- Menjamin kanji apa pun yang ada di FIEZEL (1.653 karakter) memiliki pemetaan cara baca On'yomi/Kun'yomi yang valid.

### 3.2. `features/japanese/fiezel-ja-ui.js`
- `annotateText(value, pool)`: Melakukan segmentasi teks otomatis. Kata majemuk panjang diutamakan terlebih dahulu (*longest-match first*), diikuti batang kanji dengan okurigana berkonjugasi, lalu penanganan kanji tunggal.
- Koreksi batas partikel: Partikel `は/を/へ/に/で/と/も/の` tidak lagi memotong kata-kata berkana kecil (seperti `ぎゅうにゅう` atau `ちかく`).
- Menghasilkan markup standar ganda: `<ruby class="ja-word">漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>` dan baris romaji `.ja-romaji.ja-run-romaji`.

### 3.3. `features/japanese/fiezel-story-reader.js` & `fiezel-story-brain-bridge.js`
- 3 Judul Cerita N5:
  1. *Mizuki no Maiko* (Mizuki dan Impian Maiko di Kyoto)
  2. *Asakusa no Neko* (Kucing Kuil Sensoji Asakusa)
  3. *Shinkansen Trip* (Perjalanan Cepat Tokyo ke Osaka)
- Setiap cerita terdiri dari 4 adegan naratif bergambar nyata + 1 adegan kuis diagnostik.
- Kuis diagnostik terhubung langsung ke Braincore Misconception Ledger (`misconceptionId`, `failWhy`, telemetri BKT `bktRecord()`, OLM `updateMastery()`).
- Invarian Pedagogis: Jawaban salah tidak pernah dipuji (*Zero-Praise Invariant*).

### 3.4. `features/voice-studio/src/lib/japanesePhonetics.js`
- Kaidah fonetik Hepburn murni:
  - Partikel topik `は` $\rightarrow$ `wa` (termasuk kata sapaan `こんにちは` $\rightarrow$ `konnichiwa`).
  - Partikel objek `を` $\rightarrow$ `o` (Dilarang keras `wo`).
  - Partikel arah `へ` $\rightarrow$ `e` (sebelum verba gerak atau tempat).
  - Yoon: `じゃ/じゅ/じょ` $\rightarrow$ `ja/ju/jo` (Dilarang keras `jya/jyu/jyo`).
  - Sokuon sebelum `ch`: `っ` $\rightarrow$ `tch` (contoh: `ちょっと` $\rightarrow$ `chotto`, `まっち` $\rightarrow$ `matchi`, `こっち` $\rightarrow$ `kotchi`, `ぼっちゃん` $\rightarrow$ `botchan`).
  - Vokal panjang: Chōonpu `ー` dan vokal `おう/おお` $\rightarrow$ `ou/oo` dipertahankan akurat.

---

## 4. Hasil Verifikasi Baterai Uji Lengkap (100% Hijau)

Semua 8 modul uji coba dieksekusi secara ketat di lingkungan lokal worktree dan dinyatakan **100% LULUS**:

```text
1. node tests/japanese-reading-bank-test.js
   -> PASS (10/10 assertions)

2. node tests/japanese-ja-ui-test.js
   -> PASS (29/29 assertions)

3. node tests/japanese-phonetics-test.js
   -> PASS (8 suites, 100% accuracy, ZERO Kanji leaks)

4. node tests/content-integrity-gate.js
   -> PASS: Gate 1 (Anti-Island Monolith Verification) Lulus 100%.
   -> PASS: Gate 2 (Numeric Volume & Pedagogical Integrity) Lulus 100%.
   -> PASS: Gate 3 (Real Asset Purity) Lulus 100%.
   -> PASS: Gate 4 (Offline Sync Hardening) Lulus 100%.

5. node tests/japanese-dictionary-test.js
   -> PASS (30/30 assertions)

6. node tests/story-brain-bridge-test.js
   -> PASS (8/8 assertions, BKT/OLM/Misconception verified)

7. node tests/story-reader-integration-test.js
   -> PASS (5/5 assertions)

8. node tests/japanese-universal-furigana-test.js
   -> PASS (26/26 assertions across 6 universal suites + quantitative table)
```

---

## 5. Visual Probe Screenshots

Bukti visual Playwright Chromium telah diambil secara empiris pada 2 resolusi standar (Mobile `390×844 px` dan Desktop `1280×800 px`):

- **Story Reader Mobile**: `C:\Users\hp\.gemini\antigravity\brain\f9fb823d-f10c-48df-870b-f0e7a5e58f3a\ja-story-mobile.png`
- **Story Reader Desktop**: `C:\Users\hp\.gemini\antigravity\brain\f9fb823d-f10c-48df-870b-f0e7a5e58f3a\ja-story-desktop.png`
- **Kana Hub Mobile**: `C:\Users\hp\.gemini\antigravity\brain\f9fb823d-f10c-48df-870b-f0e7a5e58f3a\ja-kana-mobile.png`
- **Kana Hub Desktop**: `C:\Users\hp\.gemini\antigravity\brain\f9fb823d-f10c-48df-870b-f0e7a5e58f3a\ja-kana-desktop.png`
- **Kaiwa Chat Mobile**: `C:\Users\hp\.gemini\antigravity\brain\f9fb823d-f10c-48df-870b-f0e7a5e58f3a\ja-chat-mobile.png`
- **Kaiwa Chat Desktop**: `C:\Users\hp\.gemini\antigravity\brain\f9fb823d-f10c-48df-870b-f0e7a5e58f3a\ja-chat-desktop.png`

---

## 6. Verifikasi Keselarasan PWA (Hexa-Sync)

Arbiter rilis resmi `node tools/bump-build.mjs --check` memverifikasi keselarasan 6 titik:
- `coordination/BUILD-VERSION.json`: `m025-703`
- `sw.js`: `m025-703`
- `core-config.js`: `m025-703`
- `features/neural-voice/fiezel-diag-panel.js`: `m025-703`
- `kurikulum.html`: `m025-703`
- `misi.html`: `m025-703`

Hasil: **"selaras": true**.

---

## 7. Instruksi Penggabungan (Merge & PR Guidance)

Sesuai **AGENTS.md Bagian 1 & 12**:
1. Seluruh perubahan telah dikomit di branch terisolasi: `feat/universal-ja-furigana-romaji-m025-702`.
2. Dilarang melakukan merge langsung ke `main` tanpa PR.
3. Buat Pull Request melalui GitHub CLI:
   ```bash
   gh pr create --repo FIEZEL-APPS/FIEZEL-APPS --base main --head feat/universal-ja-furigana-romaji-m025-702 --title "feat(japanese): universal furigana ruby and phonetic hepburn romaji overhaul (m025-703)" --body "Memperbaiki 100% furigana ruby (zero bare kanji) dan phonetic romaji pada 180 bacaan, 3 graded reader stories, serta obrolan interaktif AI."
   ```
4. Pastikan pipeline CI `FIEZEL Quality Gate` menyelesaikan seluruh gerbang integritas secara tuntas sebelum penggabungan.
