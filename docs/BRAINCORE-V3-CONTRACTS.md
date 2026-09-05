# Braincore v3 — Kontrak Antar-Modul (WAJIB DIIKUTI SEMUA AGENT)

Repo: /home/user/workspace/fiezel-repo (FIEZEL 5.19.0, PWA offline, zero runtime cost).
Referensi audit: /home/user/workspace/model-council-synthesis.md dan model-council-{claude_fable_5,claude_opus_5_0,claude_sonnet_5_0,gpt_5_6_sol}.md

## Aturan keras (semua modul)
1. MODUL MURNI: tanpa DOM, tanpa network, tanpa storage, tanpa Math.random tanpa seed, waktu SELALU argumen (nowMs). Tanpa Date.now() fallback.
2. Pola UMD sama dengan features/brain/fiezel-core-brain.js: `(function(root,factory){var api=factory(); if(typeof module==='object'&&module.exports)module.exports=api; if(root)root.<GlobalName>=api;})(typeof globalThis!=='undefined'?globalThis:this, function(){ 'use strict'; ... })`.
3. Komentar dan naskah berbahasa Indonesia, gaya penjelasan seperti file brain yang ada (jelaskan KENAPA, bukan apa).
4. Setiap keluaran keputusan membawa `rationale` (kode string prefix `brain3_`) dan `confidence` bila relevan.
5. Setiap modul baru WAJIB punya file test Node mandiri di root repo (pola seperti tests/core-brain-v2-test.js: require modul, assert, console.log 'ok - ...', exit non-zero saat gagal, baris akhir '<Nama>: PASS').
6. JANGAN mengedit file di luar kepemilikanmu. JANGAN commit/push git. JANGAN menjalankan git write commands.
7. Sebelum selesai: jalankan file test milikmu DAN `node tests/core-brain-v2-test.js && node tests/tutor-brain-v3-test.js && node tests/regression-test.js` — semuanya harus PASS. Kalau perubahanmu memecahkan gate lama, perbaiki pendekatanmu, bukan gate-nya (kecuali gate itu menguji perilaku yang memang defek terverifikasi council — dokumentasikan di komentar test).

## Kepemilikan file (EKSKLUSIF)
- A1: features/brain/fiezel-core-brain.js, tests/core-brain-v3-upgrade-test.js
- A2: features/brain/fiezel-tutor-brain.js, tests/tutor-brain-v3-test.js (boleh update gate yang menguji defek)
- A3: app.js, index.html, service worker (sw.js/service-worker.js)
- A4: features/brain/fiezel-misconception-ledger.js, tests/misconception-ledger-test.js
- A5: misconception-taxonomy-v1.json, tools/build-misconception-taxonomy.js, tests/misconception-taxonomy-test.js
- A6: features/brain/fiezel-item-prior.js, tests/item-prior-test.js
- A7: features/brain/fiezel-confusion-matrix.js, tests/confusion-matrix-test.js
- A8: features/brain/fiezel-olm.js, tests/olm-test.js
- A9: features/brain/fiezel-affect.js, tests/affect-test.js
- A10: features/brain/fiezel-mastery-bkt.js, tests/mastery-bkt-test.js
- A11: adaptivity-simulation-v3.js
- A12: features/brain/fiezel-evidence-credibility.js, tests/evidence-credibility-test.js
- A13: features/brain/fiezel-step-tutor.js, tests/step-tutor-test.js
- A14: features/brain/fiezel-production-grader.js, tests/production-grader-test.js
- A15: BRAINCORE-V3-REPORT.md

## API yang dipinjam antar-agent (tanda tangan FINAL — jangan diubah)
- FiezelCoreBrain.updateMemory({stability, retrievability, difficulty, ok}) -> {stability, rationale}
  FSRS-lite: sukses S'=S*(1+1.2*(11-Dmap)*S^-0.15*(e^(1.8*(1-R))-1)); lapse S'=min(S, 1.5*Dmap^-0.6*((S+1)^0.35-1)) dengan floor >=10% S; Dmap=clamp(difficulty*1.6,1,10). stability dalam HARI.
- FiezelCoreBrain.halfLife(item): jika item.stability angka positif -> pakai langsung (clamp 0.2..365); selain itu formula lama (kompat mundur).
- FiezelMisconceptionLedger (global): SCHEMA='fiezel-misconception-ledger-v1';
  update(ledger, evidence, nowMs) -> ledger'  (evidence: {concept, family, misconception, canonical?, correct, timing, sessionId}); murni, ledger boleh null -> dibuat.
  active(ledger, nowMs) -> [{concept, misconception, canonical, belief, evidenceCount, sessions}] — gate: >=3 bukti, >=2 sesi, belief>=0.7. Log-odds prior logit(0.1); salah+distraktor: +ln(10) (guess ×0.3, struggled ×1); benar pada konsep sama: -ln(2) untuk m aktif; decay ke prior half-life 14 hari.
  summarize(ledger, nowMs) -> {active:[...], resolved:[...], total}
- FiezelItemPrior.difficultyFor({level, mode, domain}) -> number kontinu (basis LEVELS.indexOf(level)+1, modeCost ±0.9); MODE_COST diekspor untuk 25 mode grammar (apply_form/complete_sentence/justify_correct/teach_back dll lebih berat; recognition dasar lebih ringan).
- FiezelEvidenceCredibility.weigh({timing, langLoad, integrity}) -> {kappa, reasons[]}; guess=0.3, langLoad penuh-EN utk A1/A2=0.45, evidence_mismatch=0.
- FiezelMasteryBKT: update(st,{lesson,correct,weight}) -> st'; mastery(st,lesson) -> {L,n}; params L0=0.2,T=0.15,slip=0.1,guess=0.25; frontier(st, graphRows, predictFn) -> lessons layak (prasyarat L>=0.95, p prediksi 0.55..0.90).
- FiezelAffect.assess(sessionAttempts, opts) -> {state:'neutral'|'frustrated'|'bored'|'gaming'|'fatigued', confidence, rationale}; min 8-10 attempt; histeresis via opts.previous.
- FiezelOLM.summarize({bkt, ledger, memory, calibration}, nowMs) -> struktur tampilan + pesan coaching kalibrasi (Brier, bias) — presentasi saja, tanpa keputusan sesi.
- FiezelStepTutor.stepsFor(template) -> [{ask, expect, rationale}] dari field reasoningOperation di grammar-templates.json.
- FiezelProductionGrader.grade(answer, target, opts) -> {ok, distance, matchedDistractor} (normalisasi, edit distance <=1 non-inisial).

## Integrasi app.js (hanya A3)
Semua wiring modul baru WAJIB dibungkus availability-check + try/catch (pola coreBrainAvailable). State baru di kunci localStorage baru (mis. 'fiezel-misconception-ledger-v1'), JANGAN sentuh fiezel-sl-v1-state. Kalau modul absen, perilaku identik hari ini.

# FASE 2 — Kontrak Gelombang B (berlaku aturan keras yang sama)

## Kepemilikan file (EKSKLUSIF)
- B1: features/brain/fiezel-core-brain.js, tests/core-brain-v3-upgrade-test.js
- B2: features/brain/fiezel-tutor-brain.js, tests/tutor-brain-v3-test.js
- B3: app.js, index.html, sw.js
- B5: adaptivity-simulation-v3.js
- B6: features/brain/fiezel-listening-adaptive.js, tests/listening-adaptive-test.js
- B7: tools/build-cloze-bank.js, cloze-bank-v1.json, tests/cloze-bank-test.js
- B8: BRAINCORE-V3-REPORT.md

## API FINAL Fase 2
- FiezelCoreBrain.momentum(attempts, opts): baris boleh membawa `predicted` (0..1, prediksi P saat penyajian). Bila >=60% baris punya predicted -> hitung tren pada RESIDUAL (ok?1:0)-predicted per blok, field baru `basis:'residual'`; tanpa predicted -> perilaku lama, `basis:'accuracy'`. Ambang slope residual ±0.03.
- FiezelCoreBrain.estimateAbility: baris boleh membawa `credibility` (0..1, default 1) yang MENGALIKAN bobot langkah (recency*credibility). Tambah keluaran `sd` (deviasi gaya Glicko: naik sqrt(sd^2+0.03^2*hariMenganggur) saat senggang, turun dengan informasi Fisher per jawaban; sd0=1.2, sdMax=1.2, sdMin=0.15) dan `sdConfidence = 1 - sd/sdMax`. JANGAN ubah semantik `confidence` lama.
- FiezelCoreBrain.nextReviewGapDays(stability, targetRetention): semantik sama, dipakai sebagai SATU-SATUNYA sumber interval oleh app (single-writer via B3).
- FiezelTutorBrain.decideMove(s, d, opts): opts.affect {state:'frustrated'|'bored'|'gaming'|'fatigued'|'neutral'} -> intervensi berbeda SEBELUM aturan stretch/continue: frustrated->breathe(reason 'affect_frustrated'), bored->stretch('affect_bored'), gaming->continue+flag suggestModeSwitch('affect_gaming'), fatigued->wrapup('affect_fatigued', hanya bila remaining>2). Aturan keselamatan lama (miss streak, reteach) tetap menang.
- FiezelTutorBrain scaffold FADING: dua keberhasilan independen berturut pada konsep -> titik mulai tangga turun satu anak tangga (tidak pernah di bawah probe). Rationale 'scaffold_faded'.
- FiezelTutorBrain.selectNext(pool, s, opts): opts.seed (angka) -> sampling softmax suhu 0.35 di atas 4 kandidat teratas dengan PRNG mulberry32 berseed (deterministik utk test); tanpa seed -> argmax lama. Penalti exposure -0.3*seenCount tetap.
- FiezelListeningAdaptive.policy({mastery, replayHistory, targetSuccess}) -> {rateBand:'slow'|'natural'|'fast', replayQuota:0..3, clipLength:'short'|'medium'|'long', rationale:['brain3_listening_*']}. Murni; kesulitan listening = kecepatan+replay+panjang, dikontrol aturan 0.80.
- Cloze bank: {schema:'fiezel-cloze-bank-v1', items:[{id, templateId, skill, level, sentence(berisi ___), blank:{answer, alternates[], position}, distractors:[{text, misconception}]}]} dibangun dari kalimat target grammar-templates.json; minimal 200 item lintas level; jawaban blank = jawaban benar template, distractors dibawa beserta label miskonsepsinya (untuk FiezelProductionGrader + ledger).

## Wiring B3 (app.js) — semua guarded try/catch + availability check
1. Simpan `predicted` (successProbability saat penyajian) dan `kappa` (FiezelEvidenceCredibility.weigh) di baris riwayat; coreBrainAttempts meneruskan keduanya (predicted->momentum, kappa->credibility).
2. SINGLE-WRITER MEMORY: scheduleNext memakai stability FSRS (b.stabilityDays) + nextReviewGapDays sebagai penulis nextReview TUNGGAL bila FiezelCoreBrain.updateMemory tersedia; forgettingProbability = 1 - retrievability(stability) dari model yang sama; field legacy tetap ditulis untuk rollback; tanpa modul -> jalur lama utuh.
3. BKT: update 'fiezel-mastery-bkt-v1' per jawaban grammar (weight=kappa); rootCause/frontier BKT tampil di panel diagnostik sebagai SHADOW (tanpa otoritas unlock).
4. Confusion matrix: record 'fiezel-confusion-matrix-v1' dari optionSources saat opsi pinjaman dipilih salah.
5. Affect: FiezelAffect.assess di tutorObserve (attempts sesi, histeresis via state sesi); hasil diteruskan ke decideMove opts.affect; targetSuccess digeser terbatas (frustrated 0.90, bored 0.75, netral kembali 0.80).
6. Listening: hitung replayCount per item listening, teruskan ke kappa (replay>=3 -> diskon) dan ke FiezelListeningAdaptive.policy bila ada.
7. Panel: coreBrainPanelMarkup menambah seksi OLM dari FiezelOLM.summarize (mastery+interval, miskonsepsi aktif, coaching kalibrasi) — tampilan saja.
8. Script tag + precache utk fiezel-listening-adaptive.js dan cloze-bank-v1.json.

# FASE 3 — Kontrak Gelombang C (berlaku aturan keras yang sama)

## Kepemilikan file (EKSKLUSIF)
- C1: features/brain/fiezel-item-calibration.js, tests/item-calibration-test.js
- C2: features/brain/fiezel-speaking-adaptive.js, tests/speaking-adaptive-test.js
- C3: features/brain/fiezel-olm.js, tests/olm-test.js
- C4: features/brain/fiezel-srl-coach.js, tests/srl-coach-test.js
- C5: app.js, index.html, sw.js
- C6: adaptivity-simulation-v3.js
- C7: BRAINCORE-V3-REPORT.md

## API FINAL Fase 3
- FiezelItemCalibration (SCHEMA 'fiezel-item-calibration-v1'): observe(state, {itemId, priorDifficulty, ability, ok, kappa}, nowMs) -> state' (Elo dua-sisi sisi item: delta_i -= Kb*(y - p) dengan Kb = 0.35/(1+0.08*n_i), p = successProbability 3PL; SHRINKAGE keras: |delta_i| <= 0.6 dari prior — clamp setiap update; kappa mengalikan langkah). effective(state, itemId, priorDifficulty) -> {difficulty, n, applied} — difficulty = prior + delta HANYA bila n_i >= 8, selain itu prior apa adanya (applied:false). Murni, tahan korup. Rationale brain3_item_calibration_*.
- FiezelSpeakingAdaptive (mengikuti konsensus council: TANPA ONNX/ASR baru; pakai recognition existing sebagai target coverage, agregat saja, TANPA audio/transkrip): policy({coverageHistory:[{coverage 0..1, latencyMs, scaffold}], weakLessons:[skill], mastery}) -> {promptComplexity:'word'|'phrase'|'sentence'|'open', targetSkill, scaffold:'model_first'|'cue_only'|'free', rationale}. evidence({coverage, latencyMs, replays}) -> {kappa (<=0.6 selalu — bukti speaking selalu didiskon), signal:'strong'|'weak'|'noise'}. Satu dimensi naik per langkah seperti listening.
- FiezelOLM tambahan (file sama, JANGAN ubah API summarize lama): negotiate(state, {claimId, action:'dispute'}, nowMs) -> {state', instruction} dengan instruction salah satu dari {type:'remeasure', targetSkill, probeCount:3, rationale:'brain3_olm_dispute_remeasure'} untuk klaim mastery/miskonsepsi, atau {type:'discount_evidence', target, rationale} untuk klaim memori; disputes tercatat di state dgn nowMs; summarize menandai klaim yang disputed ('sedang diukur ulang'). Murni.
- FiezelSrlCoach (SCHEMA 'fiezel-srl-coach-v1'): sessionPlan(state, {suggestedFocus, sessionSize}, nowMs) -> {goalPrompt (pilihan tujuan: fokus lemah/review/bebas), rationale}. predictPrompt(state, {itemIndex, sessionSize}) -> null | {ask:'seberapa yakin?', scale:[0.25,0.5,0.75,0.95]} — MAKSIMAL 1 per sesi, hanya pada item ke-2..4, TIDAK PERNAH saat affect frustrated (terima opts.affect). reflect(state, {predictions:[{confidence, correct}], sessionAccuracy}, nowMs) -> {message kalibrasi spesifik-konten Indonesia, state'} — fading: jika 3 sesi berturut kalibrasi baik, prompt berhenti muncul 5 sesi (brain3_srl_faded). Murni.
- Cloze practice: app menambah mode latihan 'cloze' — item dari cloze-bank-v1.json, input ketik, dinilai FiezelProductionGrader.grade; matchedDistractor -> umpan ledger miskonsepsi (kappa penuh, bukti produksi weight 1.5 di BKT); salah morfem (brain3_production_morpheme_miss) -> tutor reteach bentuk. Digerbang: hanya item yang BKT L>=0.6 pada skill-nya (recall belum siap sebelum recognition stabil, P8 Fable).
- Step-tutor rendering: saat scaffold mencapai 'worked' pada soal grammar yang template-nya punya langkah (FiezelStepTutor.decompose), app menampilkan langkah bertahap sebagai teks tuntunan sebelum opsi (tampilan saja, jawaban tetap pilihan/ketikan yang sama).

## Wiring C5 (app.js) — semua guarded try/catch, modul absen = perilaku lama
1. Item calibration: observe() per jawaban grammar (kappa dari riwayat); buildAdaptivePool memakai effective() untuk difficulty kandidat grammar; state 'fiezel-item-calibration-v1'.
2. Speaking: agregat coverage/latency dari Speaking Lab existing -> FiezelSpeakingAdaptive.evidence() masuk learner evidence dgn kappa-nya; policy() menentukan prompt berikutnya bila lab aktif. TANPA menyimpan audio/transkrip (jaga observability-privacy-test).
3. OLM negotiated: tombol 'menurutku ini salah' pada klaim panel OLM -> FiezelOLM.negotiate; instruction remeasure -> antrikan forceConcept 3 probe pada skill itu di sesi berikutnya; discount_evidence -> tandai kappa 0.5 pada bukti terkait.
4. SRL: goalPrompt saat mulai sesi; predictPrompt (pakai setConfidence existing sebagai input); reflect di akhir sesi -> pesan kalibrasi; state 'fiezel-srl-coach-v1'; hormati fading & larangan saat frustrated.
5. Mode cloze + step-tutor rendering sesuai kontrak di atas.
6. Script tag + precache modul baru (fiezel-item-calibration.js, fiezel-speaking-adaptive.js, fiezel-srl-coach.js).
