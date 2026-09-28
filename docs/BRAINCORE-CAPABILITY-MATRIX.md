# FIEZEL Braincore — Capability Matrix & Runtime Audit
**Audit Date:** 2026-09-27 · **Build:** FIEZEL 5.19.0 · **Target Engine:** Braincore v3.11.0 / Living Intelligence

**Revisi 2026-09-28:** klaim "0ms", "cryptographic" dan "differential privacy" dikoreksi mengikuti audit pra-uji-tuntas. Kolom *Offline?* kini hanya menyatakan modul berjalan lokal; latensi yang terukur ada di Bagian 4.

---

## 1. Classification Taxonomy

Setiap kemampuan dalam FIEZEL Braincore ditandai dan diaudit berdasarkan **perilaku runtime aktual**, bukan sekadar keberadaan file atau fungsi di codebase:

1. **`PROVEN & ACTIVE`**:
   Kode ada, diimpor, diinisialisasi, dipanggil langsung saat murid berinteraksi, mengubah jalur belajar/tingkat kesulitan/perancah/kehadiran PAW di UI secara nyata, datanya tersimpan deterministik, dan telah dibuktikan 100% lulus dalam pengujian integrasi runtime End-to-End (`tests/braincore-runtime-e2e-proof.js` & `tests/braincore-living-system-test.js`).
2. **`IMPLEMENTED BUT NOT PROVEN`**:
   Logika algoritma dan modul telah diimplementasikan lengkap dan lolos pengujian unit terisolasi, namun belum diuji/divalidasi terhadap data empiris populasi siswa riil di lapangan (masih menggunakan kalibrasi sintetis/laboratorium) atau belum diaktifkan dalam eksperimen kandidat aktif.
3. **`INFRASTRUCTURE ONLY`**:
   Skema database D1, API Worker Cloudflare, endpoint sinkronisasi, dashboard analitik, dan pipa agregasi data telah selesai dibangun dan lulus uji kontrak, tetapi masih berada di lingkungan staging/menunggu data telemetri langsung dari armada sekolah.
4. **`NOT IMPLEMENTED`**:
   Konsep yang sengaja tidak diimplementasikan demi mematuhi batasan arsitektur (misal: penolakan model Deep Neural Network DKT demi menjaga latensi di bawah 1 ms secara offline dan auditabilitas; penolakan biometrik kamera demi privasi anak; serta larangan penulisan kurikulum sepihak tanpa persetujuan manusia).

---

## 2. Complete Capability Inventory

| # | Kemampuan / Sub-sistem | Modul Runtime | Titik Masuk Runtime | Kategori Status | Offline? | Bukti Uji Verifikasi |
|:--|:-----------------------|:--------------|:--------------------|:---------------:|:--------:|:---------------------|
| 1 | **IRT 3PL terkendala (a = 1,5 dan c = 0,25 tetap) & Estimasi Kemampuan** | `features/brain/fiezel-core-brain.js` | `FiezelCoreBrain.analyze()` / `estimateAbility()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/core-brain-v2-test.js`, `tests/braincore-runtime-e2e-proof.js` |
| 2 | **Memori ala FSRS (kurva paruh-waktu) & Pengulangan Berjarak** | `features/brain/fiezel-core-brain.js` | `FiezelCoreBrain.updateMemory()` / `scheduleNext()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/core-brain-v2-test.js` |
| 3 | **Prerequisite Knowledge DAG (Root Cause)** | `features/brain/fiezel-core-brain.js` | `FiezelCoreBrain.rootCause()` / `setFamilyGraph()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/prerequisite-graph-test.js` |
| 4 | **BKT Knowledge Tracing** | `features/brain/fiezel-mastery-bkt.js` | `FiezelMasteryBKT.update()` / `bktRecord()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/mastery-bkt-test.js`, `tests/braincore-runtime-e2e-proof.js` |
| 5 | **BKT Lesson Unlocking Engine** | `features/brain/fiezel-mastery-bkt.js` | `bktMasteredSkills()` / `lessonUnlockState()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/grammar-unlock-test.js` |
| 6 | **ZPD Frontier Item Selection** | `features/brain/fiezel-mastery-bkt.js` | `FiezelMasteryBKT.frontier()` / `zpdFrontierPick()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/mastery-bkt-test.js` |
| 7 | **Tutor Scaffolding FSM** | `features/brain/fiezel-tutor-brain.js` | `FiezelTutorBrain.observe()` / `decideMove()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/tutor-brain-v3-test.js`, `tests/braincore-runtime-e2e-proof.js` |
| 8 | **Scaffold Ladder Escalation (Probe $\to$ Hint $\to$ Worked $\to$ Tell)** | `features/brain/fiezel-tutor-brain.js` | `FiezelTutorBrain.escalate()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/tutor-brain-v3-test.js`, `tests/braincore-runtime-e2e-proof.js` |
| 9 | **Worked Example Decomposition** | `features/brain/fiezel-step-tutor.js` | `stepTutorGuidanceMarkup()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/step-tutor-test.js` |
| 10 | **Cloze Production Syntax Grader** | `features/brain/fiezel-production-grader.js` | `FiezelProductionGrader.grade()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/production-grader-test.js` |
| 11 | **Misconception Ledger & Distractor Analysis** | `features/brain/fiezel-misconception-ledger.js` | `FiezelMisconceptionLedger.update()` / `active()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/misconception-ledger-test.js`, `tests/braincore-runtime-e2e-proof.js` |
| 12 | **Continuous Item Prior & Difficulty Anchoring** | `features/brain/fiezel-item-prior.js` | `FiezelItemPrior.difficultyFor()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/item-prior-test.js` |
| 13 | **Presence Engine (Brain $\to$ PAW Dispatch)** | `features/mascot/fiezel-presence-engine.js` | `FiezelPresenceEngine.determine()` & PAW pose | `PROVEN & ACTIVE` | ✅ Lokal | `tests/brain-presence-test.js`, `tests/braincore-runtime-e2e-proof.js` |
| 14 | **Flow Silence Principle (Zero-Distraction)** | `features/mascot/fiezel-presence-engine.js` | `determine({ move: 'continue' }) -> SILENT` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/braincore-runtime-e2e-proof.js` (Inv 1) |
| 15 | **Cognitive Decision Trace & Rantai Checksum Integritas** | `features/learner-flow/fiezel-decision-trace.js` | `recordDecision()` & 64-bit FNV-1a/fmix32 chain | `PROVEN & ACTIVE` | ✅ Lokal | `tests/braincore-runtime-e2e-proof.js` (Inv 9), `tests/braincore-living-system-test.js` |
| 16 | **Closed-Loop Outcome Evaluation (Keep/Modify/Rollback)** | `features/learner-flow/fiezel-decision-trace.js` | `evaluateOutcome(traceId, observation)`: rekomendasi keep/modify/rollback dicatat di jejak; tidak ada rollback otomatis sejak penyetel dimatikan | `PROVEN & ACTIVE` | ✅ Lokal | `tests/braincore-runtime-e2e-proof.js` (Inv 4 & 5) |
| 17 | **~~Bounded Self-Tuning Parameter Engine~~** | `features/learner-flow/fiezel-decision-trace.js` | `targetSuccess` dynamic tuning — **DIMATIKAN OWNER 2026-09-26 (m025-375)**: tanpa stat-gate/halt/ledger, mengunci murid di 0.90 (audit A1, `reports/BRAINCORE-AUDIT-2026-09-26.md`) | `DISABLED` | — | `tests/braincore-living-system-test.js` (Scenario K/K2 membuktikan parameter TIDAK bergeser) |
| 18 | **Local-First Architecture (di bawah 1 ms)** | `app.js`, `fiezel-decision-trace.js` | 100% client execution, p50 0,18 ms per keputusan, zero network calls | `PROVEN & ACTIVE` | ✅ Lokal | `tests/braincore-runtime-e2e-proof.js` (Inv 8), `tests/session-security-test.js` |
| 19 | **Bankor Item Allocator & Anti-Repeat Memory** | `features/brain/fiezel-question-allocator.js` | `FiezelQuestionAllocator.allocate()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/bankor-latihan-test.js` |
| 20 | **Listening Adaptive Pacing** | `features/brain/fiezel-listening-adaptive.js` | `listeningAdaptivePolicy()` (rate & replays) | `PROVEN & ACTIVE` | ✅ Lokal | `tests/listening-adaptive-test.js` |
| 21 | **Open Learner Model (OLM) & Dispute** | `features/brain/fiezel-olm.js` | `FiezelOLM.summarize()` / `olmDispute()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/olm-test.js` |
| 22 | **Target Language Separation (JA/EN/ID)** | `features/brain/fiezel-target-language.js` | `FiezelTargetLanguage.setCourse()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/target-language-axis-test.js` |
| 23 | **PvE Arena Bot Engine** | `features/brain/fiezel-arena-bot.js` | `FiezelArenaBot.decideStep()` | `PROVEN & ACTIVE` | ✅ Lokal | `tests/arena-bot-test.js` |
| 24 | **Baker 4-State Sensor-Free Affect Detector** | `features/brain/fiezel-affect.js` | `FiezelAffect.assess()` | `IMPLEMENTED BUT NOT PROVEN` | ✅ Lokal | `tests/affect-test.js` (Unproven on field cohorts) |
| 25 | **Evidence Credibility Discounting ($\kappa$)** | `features/brain/fiezel-evidence-credibility.js` | `FiezelEvidenceCredibility.weigh()` | `IMPLEMENTED BUT NOT PROVEN` | ✅ Lokal | `tests/evidence-credibility-test.js` (Synthetic calibration) |
| 26 | **SRL Metacognitive Coach** | `features/brain/fiezel-srl-coach.js` | `srlSessionPlan()` / `srlPredictPrompt()` | `IMPLEMENTED BUT NOT PROVEN` | ✅ Lokal | `tests/srl-coach-test.js` (Long-term retention unproven) |
| 27 | **Confusion Matrix AI Booster** | `features/brain/fiezel-confusion-matrix.js` | `topConfusions()` / `aiBoosterCard()` | `IMPLEMENTED BUT NOT PROVEN` | ✅ Lokal | `tests/confusion-matrix-test.js` (Efficacy unproven vs random) |
| 28 | **N-of-1 Within-Subject Interleaved Trials** | `features/brain/fiezel-nof1.js` | `FiezelNof1.assign()` membagi LESSON ke lengan kontrol/kandidat percobaan retensi self-tune (m025-376, A3) | `ACTIVE (menunggu bukti retensi)` | ✅ Lokal | `tests/nof1-test.js`, `tests/self-tune-retention-test.js` |
| 29 | **Statistical Policy Verdict Engine** | `features/brain/fiezel-policy-verdict.js` | `FiezelPolicyVerdict.evaluate()` (Wilson/Newcombe) | `IMPLEMENTED BUT NOT PROVEN` | ✅ Lokal | `tests/policy-verdict-test.js` (Awaiting live field sample) |
| 30 | **Speaking Adaptive Coverage** | `features/brain/fiezel-speaking-adaptive.js` | `speakingAdaptiveEvidence()` | `IMPLEMENTED BUT NOT PROVEN` | ✅ Lokal | `tests/speaking-adaptive-test.js` (Hardware mic variation) |
| 31 | **Global Empirical Bayes Calibration Pipeline** | `workers/api/teacher/braincore-bridge.js` | `recalibrateItemEmpiricalBayes()` | `INFRASTRUCTURE ONLY` | ❌ Server | `tests/teacher-braincore-test.js` (Awaiting fleet volume) |
| 32 | **Owner Dashboard Aggregate Evidence & CSV Export** | `workers/owner/index.js` | `GET /api/export/evidence.csv` & D1 tables | `INFRASTRUCTURE ONLY` | ❌ Server | `tests/owner-teacher-panel-test.js` (Tested, zero live rows) |
| 33 | **Model Parameter Ledger (rantai checksum)** | `features/brain/fiezel-param-ledger.js` | `FiezelParamLedger.append()` | `INFRASTRUCTURE ONLY` | ❌ Server | `tests/param-ledger-test.js` (Distribution offline) |
| 34 | **Content Canary & Promotion Pipeline** | `features/brain/fiezel-content-chain.js` | `FiezelContentChain.assess()` / StatGate | `INFRASTRUCTURE ONLY` | ❌ CI/Tool | `tests/content-chain-test.js` (Human gate enforced) |
| 35 | **Deep Neural Knowledge Tracing (DKT) / Neural Decision Brain** | N/A (Excluded by design) | N/A | `NOT IMPLEMENTED` | N/A | Sengaja ditolak: BKT/IRT dipilih untuk latensi di bawah 1 ms & auditabilitas |
| 36 | **Raw Multimodal Biometric Surveillance (Kamera/Wajah)** | N/A (Excluded by design) | N/A | `NOT IMPLEMENTED` | N/A | Sengaja ditolak: Perlindungan privasi anak tanpa kamera |
| 37 | **Autonomous Unbounded Curriculum Modification** | N/A (Excluded by governance) | N/A | `NOT IMPLEMENTED` | N/A | Dilarang keras: Perubahan kurikulum wajib verifikasi guru/owner |
| 38 | **Centralized Monolithic Real-Time Retraining** | N/A (Excluded by architecture) | N/A | `NOT IMPLEMENTED` | N/A | Ditolak: Model desentralisasi lokal-first dengan $k \ge 5$ |

---

## 3. End-to-End Runtime Proof: The 10 Invariants

Runtime lingkaran penuh Braincore dibuktikan melalui 10 invarian deterministik dalam `tests/braincore-runtime-e2e-proof.js` (10/10 PASS):

```
======================================================================
 FIEZEL BRAINCORE RUNTIME INTEGRATION & END-TO-END PROOF AUDIT
======================================================================

ok - Invariant 1 · Normal correct answer -> Braincore stays quiet (prinsip keheningan flow)
ok - Invariant 2 · Single mistake -> Gentle correction (CORRECTING, no reveal, retry enabled)
ok - Invariant 3 · Repeated misconception -> Strategy changes (REINFORCING, teach card, forceConcept)
ok - Invariant 4 · Intervention -> Learner improves (evaluateOutcome: POSITIVE, KEEP)
ok - Invariant 5 · Intervention fails -> rollback recommended, parameters untouched & CONCERNED presence
ok - Invariant 6 · Mastery milestone -> Intervention fades, CELEBRATING, avoid newly mastered concept
ok - Invariant 7 · Identical event stream -> Identical Braincore result (replay determinism)
ok - Invariant 8 · Offline execution -> Core loop works 100% locally with zero network calls
ok - Invariant 9 · Decision -> Evidence trace (integrity checksum chain & tamper detection)
ok - Invariant 10 · Evidence -> Subsequent Braincore behavior (PROVE Braincore decision changes NEXT learning item)

======================================================
Runtime E2E Proof Gate: 10/10 PASS
======================================================
```

### Bukti Nyata Perubahan Soal (Invariant 10):
Sejak m025-375 (OWNER 2026-09-26) bukti tidak lagi menggeser target — penyetel otomatis yang dulu menaikkan target ke $0.84$ (dan memilih soal *lebih mudah*) dimatikan. Bukti kini bekerja lewat jalur yang semestinya: dua belas jawaban benar pada soal tingkat 3 menaikkan taksiran kemampuan dari $2.0$ ke $\approx 3.49$, dan dengan target yang sama $0.80$ Braincore beralih dari `item_foundation` ke `item_stretch` (soal yang lebih menantang).

---

## 4. Architectural Guarantees & Safeguards

1. **Local-First, Latensi di Bawah 1 ms**:
   Seluruh inferensi kognitif (BKT, IRT 3PL, memori ala FSRS, FSM Scaffolding, PAW Presence, Decision Trace) dieksekusi murni di JavaScript lokal perangkat murid. Nol dependensi jaringan eksternal, nol API key berbayar untuk alur belajar inti. Satu keputusan penuh (memilih soal dari 512 kandidat lalu memperbarui kemampuan, BKT dan kalibrasi) terukur p50 0,18 ms, p95 0,41 ms, maksimum 2,0 ms di desktop (Node 22, 2026-09-28). Angka ponsel murah belum diukur.
2. **Kerendahan Hati Statistik (Statistical Humility)**:
   Modul evaluasi kebijakan (`fiezel-policy-verdict.js` & `fiezel-stat-gate.js`) menggunakan interval kepercayaan Wilson dan Newcombe. Jika ukuran sampel tidak memadai untuk mendeteksi perbedaan non-inferioritas pada margin $\pm 5\%$, Braincore mengeluarkan status `hold` (tidak mengambil keputusan gegabah).
3. **Otonomi Belajar Berbatas (Bounded Authority)**:
   - Penyetelan `difficulty.targetSuccess` otomatis di `fiezel-decision-trace.js` **dimatikan** (OWNER 2026-09-26, m025-375). Satu-satunya geseran target yang tersisa adalah afek sesi berjalan (frustrasi 0.90 / bosan 0.75), yang tidak pernah disimpan.
   - Jalur penyetelan resmi (`fiezel-self-tune.js` + `fiezel-param-ledger.js`) disambung ke pemilihan soal sejak m025-376 (audit A3, keputusan OWNER 2026-09-27) lewat `experiment()`: satu percobaan ±0.02 pada satu waktu, lesson dibagi `FiezelNof1.assign`, diputus RETENSI tertunda (probe 3/7/21 hari) — arah sulit non-inferioritas, arah mudah superioritas, penjaga Brier, kadaluwarsa 120 hari, setiap langkah tercatat di ledger. Akurasi sesi tidak pernah menjadi ukurannya.
   - Otak dilarang mengubah silabus atau menerbitkan materi baru (`ownerDecisionRequired: true`).
4. **Privasi: Supresi Kelompok Kecil (differential privacy sengaja tidak dipakai, lihat `docs/BRAIN-EVOLUTION-DECISIONS.md` §6)**:
   - Tidak ada pengiriman nama murid, nomor induk, atau transkrip interaksi mentah ke server.
   - Ringkasan diagnostik untuk Owner Dashboard menerapkan agregasi $k \ge 5$.
   - Riwayat jejak keputusan diberi rantai checksum 64-bit (FNV-1a/fmix32) yang menangkap kerusakan dan suntingan biasa. Ini bukan hash kriptografis; bukti anti-pemalsuan yang sungguhan butuh SHA-256 dan kepala rantai yang disimpan di server.
