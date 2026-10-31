# FIEZEL Handoff Dossier — `m025-732` (FSRS-6 Shadow Memory Engine & Listening Due-Review Queue)

- **Build Kanonik:** `m025-732` (`bundleVersion` Braincore: `3.15.0`)
- **Otoritas:** `OWNER` / `MASTER` (`fsrs6Shadow: 'shadow'` secara bawaan; penulis jadwal produksi `b.nextReview` tetap tunggal pada FSRS-lite `FiezelCoreBrain` sampai `OWNER` menyalakan aktivasi eksplisit)
- **Status:** `READY FOR OWNER REVIEW (SHADOW-SAFE — PR BELUM DI-MERGE AGAR LIVE TETAP STERIL)`
- **Tanggal:** 2026-10-31

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Audit komparatif Braincore terhadap repositori open-source mutakhir (`open-spaced-repetition/ts-fsrs@6.0.0`, `pykt-toolkit`, `EduStudio`, `OATutor`, `catsim`) menemukan dua celah spesifik di lapisan ingatan jangka panjang FIEZEL:

1. **Keterbatasan Matematis FSRS-lite (`fiezel-core-brain.js`):**
   - Peluruhan eksponensial $R(t) = 2^{-t/h}$ melebih-lebihkan kelupaan pada ingatan matang dibandingkan kurva lupa *power-law* manusia $R(t, S) = (1 + \text{factor} \cdot t / S)^{-w_{20}}$ dengan parameter ekor pribadi/kohort $w_{20} \in [0.10, 0.80]$.
   - FSRS-lite belum memisahkan *short-term stability* hari-yang-sama ($\Delta t = 0$, bobot $w_{17}..w_{19}$) dan masih menerima sinyal biner `ok/salah` tanpa membedakan jawaban fasih mandiri dari jawaban benar yang rapuh (ketukan kilat $< 1{,}4\text{ dtk}$, dibantu *hint*, atau putar ulang audio berkali-kali).
   - **Jembatan Tanpa-Lompatan (`legacyHalfLifeToStability`):** `b.stabilityDays` pada FSRS-lite adalah paruh-waktu eksponensial $h$ ($R=0.50$) yang menjadwalkan ulangan $R=0.90$ pada $-h\log_2(0.9) \approx 0.1520\cdot h$ hari, sedangkan `stability` $S$ FSRS-6 didefinisikan langsung pada $R(S)=0.90$. Menjembatani keduanya tepat pada titik operasional $R=0.90$ menjamin **0,000% diskontinuitas jadwal** saat migrasi item lama.
2. **Lubang Buta Ulangan Mendengar (`state.listening` vs `dueItems()`):**
   - Sesi kuis dan JLPT Listening menulis penguasaan ke `state.listening[key]`, tetapi `dueItems()`, `contentLevelFor()`, `record()`, `settleReviewScheduleSilently()`, `setConfidence()`, dan `skillsLab()` (English Listening) belum menyambungkan ember `'listening'`. Akibatnya, soal mendengar yang sudah jatuh tempo tidak pernah terhitung di pengingat ulangan murid.

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright Probe Dua Arah)

Probe peramban Chromium Playwright diisolasi penuh dengan `Cache-Control: no-cache, no-store, must-revalidate`, mengklik pilihan kuis Kosakata dan JLPT Chōkai seperti murid sungguhan serta membaca `state`, `localStorage`, dan basis data `IndexedDB`:

| Metrik Empiris | Sebelum (`m025-731`) | Sesudah (`m025-732`) |
| --- | --- | --- |
| `window.FiezelFsrs6` termuat & *deep-frozen* | `false` | `true` (`Object.isFrozen === true`) |
| Sidecar `state.vocab[key].fsrs6` pasca klik kuis | `null` | `{ v: 1, stability: 0.212, difficulty: 4.78931, reps: 1, lapses: 1, lastRating: 1, ... }` |
| `state.vocab[key].stabilityDays` (FSRS-lite tetap utuh) | `0.449` | `0.449` (0 perubahan perilaku jadwal aktif) |
| Sidecar `state.listening['jlpt-n5-m1-01'].fsrs6` | `null` | `{ v: 1, stability: 2.3065, difficulty: 1.78267278, reps: 1, lapses: 0, lastRating: 3, ... }` |
| `window.__fiezelDueReviews()` pada level aktif `A2` (`jlpt-n5-m1-01` + `listen_sc_a1_gist_001` jatuh tempo, `C1` & kunci yatim disaring) | `0` *(buta terhadap listening)* | `2` *(akurat menghitung 2 item A1 dan menolak C1 + kunci yatim)* |
| Basis data IndexedDB aktif | `fiezel-braincore-evidence-v1`, `fiezel-braincore-learner-evidence-v1` | `fiezel-braincore-evidence-v1`, `fiezel-braincore-learner-evidence-v1` |

---

## 3. Daftar Berkas yang Disentuh

1. `features/brain/fiezel-fsrs6.js` *(baru)* — Mesin memori murni FSRS-6 (21 parameter, paritas 8 desimal `ts-fsrs@6.0.0`), jembatan `legacyHalfLifeToStability`, penurun 4 grade implisit kuis `deriveImplicitRating` (dengan pagar anti-tebakan $<1{,}4\text{ dtk}$), pencatat bayangan idempoten `observeShadow` (dengan perbandingan *out-of-sample log-loss* vs FSRS-lite), dan penyetel ekor berbatas `tuneDecayW20`.
2. `features/brain/fiezel-brain-manifest.js` — Menaikkan `BUNDLE_VERSION` `3.14.0` $\to$ `3.15.0` dan mendaftarkan `fiezel-fsrs6.js` dengan `authorityKey: 'fsrs6Shadow'` (`'shadow'`).
3. `features/brain/fiezel-brain-config.js` — Menambahkan seksi berbatas `fsrs6: { decayW20: 0.1542, desiredRetention: 0.9 }` beserta `BOUNDS.fsrs6`.
4. `app.js` — Menyambungkan sidecar bayangan `FiezelFsrs6.observeShadow` secara idempoten di `scheduleNext`/`updateMastery`/`settleReviewScheduleSilently`/`setConfidence`, menambahkan dukungan `'listening'` bebas-TDZ di `contentLevelFor`, `memoryItemDifficulty`, `dueItems`, `record`, `buildLearnerEvidenceModel`, `olmSummarizeInput`, serta pembungkus eksternal `controller.finishItem` di `skillsLab`.
5. `index.html` & `sw.js` — Memuat `<script defer src="./features/brain/fiezel-fsrs6.js"></script>` dan mendaftarkan precache offline di `ASSETS`.
6. `tests/fsrs6-memory-engine-test.js` *(baru)*, `tests/brain-manifest-test.js`, `tests/brain-config-test.js`, `.github/workflows/quality.yml` — Gerbang paritas vektor emas `ts-fsrs@6.0.0`, kontinuitas paruh-waktu, idempotensi penjadwalan, dan antrean `dueItems()` listening.
7. Berkas penyelarasan versi rilis resmi (`tools/bump-build.mjs`): `coordination/BUILD-VERSION.json`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`.

---

## 4. Status Gerbang Mutu & Langkah Berikutnya (Next Steps / Roadmap)

- **Gerbang Mutu Lokal:** Lulus 100% (`fsrs6-memory-engine-test`, `brain-manifest-test`, `brain-page-wiring-test`, `braincore-purity-test`, `braincore-contract-test`, `brain-config-test`, `self-tune-test`, `brain-param-tune-test`, `learning-integrity-2026-10-04-test`, `review-continuity-2026-10-04-test`, `id-golden-snapshot-test`, `th-ui-leak-test`, `curriculum-cache-version-test`, `gate-registry-test`, serta guardian `A9`, `A10`, `A11`, `A13`).
- **Next Steps / Roadmap Lanjutan:**
  1. Setelah PR disetujui dan digabungkan oleh `OWNER`, kumpulkan metrik perbandingan *out-of-sample* `logLossSum` (FSRS-6) vs `liteLogLossSum` (FSRS-lite) pada kohort nyata.
  2. Bila log-loss FSRS-6 unggul konsisten dengan selang kepercayaan bootstrap positif, naikkan otoritas `fsrs6Shadow` dari `'shadow'` menjadi `'active'` (`self.FiezelFsrs6Active = true`) melalui keputusan sadar `OWNER`.
  3. Sambungkan agregat anonim kurva lupa `w20` per kohort ke pipeline "Ketua Braincore" (`tools/item-pool-job.mjs`) menggunakan `FiezelFsrs6.tuneDecayW20`.
