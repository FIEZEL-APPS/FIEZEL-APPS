# FIEZEL HANDOFF DOSSIER: INTERACTIVE CHAT SHADOWING & SCENARIO GOALS (m025-588)

**Tanggal**: 17 Oktober 2026<br>
**Build Rilis**: `m025-588` (Hexa-Sync: `BUILD-VERSION.json`, `sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`)<br>
**Penulis**: Pair Programming Antigravity Assistant<br>
**Cakupan**: Interactive Chat & Speaking Partner Phase 2 Enhancement

---

## 1. Ringkasan Latar Belakang & Alasan Perubahan
Menindaklanjuti rilis awal fitur Percakapan Interaktif (Kaiwa & Speaking Partner) di FIEZEL, dilakukan peningkatan komprehensif pada fase 2:
1. **Latihan Pelafalan & Shadowing Interaktif (`🎙️ Latih Ucapkan`)**:
   - Menambahkan tombol *Latih Ucapkan* pada setiap gelembung ucapan asisten.
   - Mengaktifkan Speech-to-Text browser yang langsung mengevaluasi kesesuaian ucapan murid terhadap kalimat target melalui algoritma Levenshtein distance dan token similarity.
   - Memberikan umpan balik akurasi seketika: *Luar Biasa* (≥85%), *Bagus* (≥60%), atau *Terus Latih* (<60%) dengan reward XP dan telemetri Braincore (`updateMastery('ja_speaking_shadowing')`).
2. **Penyelamatan Status Multi-Skenario & Perbaikan Anti-Race Condition**:
   - Menangani temuan review Fiezel Bot v2: balasan AI yang tertunda tidak lagi mengontaminasi obrolan baru bila murid berganti skenario saat asisten sedang mengetik.
   - Menyimpan riwayat percakapan per skenario (`state.scenarioHistories`) di `localStorage`, sehingga saat murid berpindah antar skenario (*Ramen*, *Konbini*, *Directions*, dll.), riwayat percakapan sebelumnya tidak hilang (*Zero-Loss*).
3. **Pelacak Target Percakapan Skenario (*Scenario Goal Milestones*)**:
   - Menambahkan 3 target capaian percakapan kontekstual di setiap skenario (misalnya pada skenario Ramen: *Pilih Kuah Ramen*, *Tentukan Kematangan Mie*, *Selesai & Bayar*).
   - Menampilkan checklist interaktif di kartu misi skenario yang otomatis tercentang hijau saat murid mencapai milestone.
4. **Peluasan Deteksi Miskonsepsi Gramatika**:
   - Bahasa Jepang: deteksi partikel `を` vs `が` pada kata kerja transitif, duplikasi partikel tanya `か`.
   - Bahasa Inggris: deteksi `I am agree`, *Subject-Verb Agreement* (`He go`), *Simple Past Tense* (`Yesterday I go`), *Double Comparative* (`more better`), dan *Verb Form* (`I am study`).
   - Seluruh naskah pembungkus mematuhi protokol `t('key', 'fallback')` untuk menjamin nol kebocoran di mode Thai.

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright)
Pengujian empiris dilakukan dengan mengemulasikan murid nyata di peramban Chromium:
- **Skrip Probe**: `tools/dev/probe-interactive-chat.mjs`
- **Hasil Eksekusi**:
  ```text
  Probe server running at http://127.0.0.1:4512
  1. Navigating to Latihan hub...
  Has Chat card in Latihan: YES
  2. Clicking Chat card to launch interactive Kaiwa chat...
  Current state.view: chat
  Is chat container mounted in DOM: YES
  Scenario chips count: 5
  3. Selecting Ramen restaurant scenario...
  Scenario goals checklist mounted: YES
  4. Toggling translation on AI message...
  Is translation visible after toggle: YES
  Shadowing action button present: YES
  5. Clicking quick suggestion chip...
  Clicked chip with text: I am currently practicing my English skills.
  User bubbles in feed: 1
  6. Typing student reply with zero-loss text...
  User bubbles after custom send: 2
  Preserved student input in second bubble: ごちそうさまでした！とても美味しかったです。
  7. Testing Topbar back navigation...
  State.view after handleTopbarBack(): latihan
  8. Capturing preview screenshot...
  Screenshot saved to tools/dev/interactive-chat-preview.png

  >>> EMPIRICAL PLAYWRIGHT AUDIT: 100% PASS <<<
  ```
- **Tangkapan Layar Antarmuka**: `tools/dev/interactive-chat-preview.png` diperiksa secara visual dan dinyatakan bebas dari pemotongan teks maupun tumpang tindih tata letak.

---

## 3. Daftar Berkas yang Disentuh & Perubahan
1. `features/interactive-chat/fiezel-interactive-chat.js`:
   - Implementasi `evaluatePronunciation(target, spoken, course)` berbasis Levenshtein distance dengan dual normalisasi (Kanji surface form & Furigana kana reading + konversi Hiragana) agar input STT peramban tidak gagal secara salah.
   - Implementasi `startShadowing(msgId, targetText)` dan `dispatchShadowingTelemetry()`.
   - Implementasi `evaluateGoalProgress(scenario, messages)` untuk checklist target skenario.
   - Implementasi `state.scenarioHistories` dan perbaikan anti-race condition pada `deliverAssistantReply`.
   - Penambahan detektor miskonsepsi sintaksis Jepang dan Inggris.
2. `features/interactive-chat/interactive-chat.css`:
   - Penambahan styling `.fzc-shadow-box`, `.fzc-shadow-badge`, `.fzc-shadow-xp`, `.fzc-action-btn.is-shadowing`.
   - Penambahan styling `.fzc-goals-container`, `.fzc-goal-item`, `.fzc-goal-check`, `.fzc-goal-bonus-tag`.
   - Penambahan styling `.fzc-interim-banner`.
3. `tests/interactive-chat-test.js`:
   - Penambahan uji unit untuk `evaluatePronunciation` (exact match, furigana normalization, minor difference tolerance).
   - Penambahan uji unit untuk `evaluateGoalProgress` (awal 0 target selesai, order lengkap 3 target selesai).
   - Penambahan uji unit untuk miskonsepsi partikel `を` vs `が` dan *Subject-Verb Agreement*.
   - Status: **8/8 PASS**.
4. `tools/dev/probe-interactive-chat.mjs`:
   - Penambahan verifikasi keberadaan checklist goals dan tombol aksi Shadowing di DOM.
5. `id-golden-baseline.json`:
   - Pembaruan baseline snapshot literatur (5.705 entri).
6. Koordinasi Build (`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`):
   - Selaras di versi `m025-588`.

---

## 4. Status Gerbang Mutu Lokal
- `node tools/bump-build.mjs --check`: **Selaras (m025-588)**.
- `node tests/th-ui-leak-test.js`: **PASS (Nol kebocoran naskah)**.
- `node tests/id-golden-snapshot-test.js`: **PASS (Baseline emas Indonesia utuh)**.
- `node tests/curriculum-cache-version-test.js`: **PASS (26 penegasan selaras)**.
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**.
- `node tests/interactive-chat-test.js`: **PASS (8/8 assertions passed)**.
- `node tools/dev/probe-interactive-chat.mjs`: **PASS (100% browser probe execution)**.
