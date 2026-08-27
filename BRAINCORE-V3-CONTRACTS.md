# Braincore v3 — Kontrak Antar-Modul (WAJIB DIIKUTI SEMUA AGENT)

Repo: /home/user/workspace/fiezel-repo (FIEZEL 5.19.0, PWA offline, zero runtime cost).
Referensi audit: /home/user/workspace/model-council-synthesis.md dan model-council-{claude_fable_5,claude_opus_5_0,claude_sonnet_5_0,gpt_5_6_sol}.md

## Aturan keras (semua modul)
1. MODUL MURNI: tanpa DOM, tanpa network, tanpa storage, tanpa Math.random tanpa seed, waktu SELALU argumen (nowMs). Tanpa Date.now() fallback.
2. Pola UMD sama dengan features/brain/fiezel-core-brain.js: `(function(root,factory){var api=factory(); if(typeof module==='object'&&module.exports)module.exports=api; if(root)root.<GlobalName>=api;})(typeof globalThis!=='undefined'?globalThis:this, function(){ 'use strict'; ... })`.
3. Komentar dan naskah berbahasa Indonesia, gaya penjelasan seperti file brain yang ada (jelaskan KENAPA, bukan apa).
4. Setiap keluaran keputusan membawa `rationale` (kode string prefix `brain3_`) dan `confidence` bila relevan.
5. Setiap modul baru WAJIB punya file test Node mandiri di root repo (pola seperti core-brain-v2-test.js: require modul, assert, console.log 'ok - ...', exit non-zero saat gagal, baris akhir '<Nama>: PASS').
6. JANGAN mengedit file di luar kepemilikanmu. JANGAN commit/push git. JANGAN menjalankan git write commands.
7. Sebelum selesai: jalankan file test milikmu DAN `node core-brain-v2-test.js && node tutor-brain-v3-test.js && node regression-test.js` — semuanya harus PASS. Kalau perubahanmu memecahkan gate lama, perbaiki pendekatanmu, bukan gate-nya (kecuali gate itu menguji perilaku yang memang defek terverifikasi council — dokumentasikan di komentar test).

## Kepemilikan file (EKSKLUSIF)
- A1: features/brain/fiezel-core-brain.js, core-brain-v3-upgrade-test.js
- A2: features/brain/fiezel-tutor-brain.js, tutor-brain-v3-test.js (boleh update gate yang menguji defek)
- A3: app.js, index.html, service worker (sw.js/service-worker.js)
- A4: features/brain/fiezel-misconception-ledger.js, misconception-ledger-test.js
- A5: misconception-taxonomy-v1.json, tools/build-misconception-taxonomy.js, misconception-taxonomy-test.js
- A6: features/brain/fiezel-item-prior.js, item-prior-test.js
- A7: features/brain/fiezel-confusion-matrix.js, confusion-matrix-test.js
- A8: features/brain/fiezel-olm.js, olm-test.js
- A9: features/brain/fiezel-affect.js, affect-test.js
- A10: features/brain/fiezel-mastery-bkt.js, mastery-bkt-test.js
- A11: adaptivity-simulation-v3.js
- A12: features/brain/fiezel-evidence-credibility.js, evidence-credibility-test.js
- A13: features/brain/fiezel-step-tutor.js, step-tutor-test.js
- A14: features/brain/fiezel-production-grader.js, production-grader-test.js
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
- B1: features/brain/fiezel-core-brain.js, core-brain-v3-upgrade-test.js
- B2: features/brain/fiezel-tutor-brain.js, tutor-brain-v3-test.js
- B3: app.js, index.html, sw.js
- B5: adaptivity-simulation-v3.js
- B6: features/brain/fiezel-listening-adaptive.js, listening-adaptive-test.js
- B7: tools/build-cloze-bank.js, cloze-bank-v1.json, cloze-bank-test.js
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
