(function(root,factory){
  // Pola muat UMD/require yang sama dengan modul repo lain: di Node pakai require
  // relatif, di browser pakai global yang sudah dimuat lewat <script>.
  const isNode=typeof module==='object'&&module.exports;
  const canary=isNode?require('./content-canary.js'):root?.FIEZEL_CONTENT_CANARY;
  const statGate=isNode?require('./features/brain/fiezel-stat-gate.js'):root?.FiezelStatGate;
  const api=factory(canary,statGate);
  if(isNode)module.exports=api;
  if(root)root.FIEZEL_CONTENT_PROMOTION=api;
})(typeof self!=='undefined'?self:globalThis,function(canary,statGate){
  'use strict';
  // KENAPA GATE INI DITULIS ULANG (temuan council §3.2, model-council-claude_opus_5_0.md):
  // aturan lama "8 attempt per lengan + toleransi regresi 5pp" adalah lempar koin —
  // Monte Carlo 200k trial membuktikan kandidat IDENTIK dengan kontrol dipromosikan 53,9%
  // dan di-rollback 46,1%, karena lebar-setengah CI proporsi pada n=8 adalah ±30pp.
  // Keputusan promote/reject sekarang diambil FiezelStatGate.verdict (Wilson/Newcombe,
  // non-inferioritas margin 5pp), bukan perbandingan titik akurasi.
  //
  // KONTRAK PENTING: 'hold' TANPA BATAS WAKTU ADALAH HASIL YANG SAH, BUKAN KEGAGALAN.
  // Saat bukti belum bisa membedakan sinyal dari derau, keputusan yang benar adalah
  // TIDAK memutuskan: kontrol tetap dipakai, canary terus mengumpulkan bukti (atau
  // kedaluwarsa lewat expiresAt — jalur rollback runtime yang memang terpisah).
  // Pemanggil TIDAK boleh memperlakukan 'hold' berkepanjangan sebagai error yang harus
  // "dipaksa selesai"; memaksa keputusan biner dari data bisu adalah persis bug lama.
  const PROMOTION_SCHEMA='fiezel-content-promotion-v1';
  const MIN_EXPOSURE_SESSIONS=3;
  // MIN_CONTROL_ATTEMPTS/MIN_CANARY_ATTEMPTS=8 dipertahankan HANYA sebagai guard
  // runtime-safety minimum (lantai kewarasan data sebelum statistik dihitung sama
  // sekali). Sesuai temuan Sol (model-council-gpt_5_6_sol.md, rekomendasi #4):
  // 8-attempt adalah 'runtime safety threshold', BUKAN 'learning promotion evidence'
  // — lolos ambang ini TIDAK PERNAH cukup untuk promote; promote butuh verdict gate.
  const MIN_CONTROL_ATTEMPTS=8;
  const MIN_CANARY_ATTEMPTS=8;
  // Lantai akurasi absolut lama tetap jadi guard promote: kandidat non-inferior yang
  // akurasinya tetap di bawah 70% tidak layak dipromosikan — tapi ini alasan MENAHAN
  // (kontennya tidak memburuk), bukan alasan rollback.
  const MIN_CANARY_ACCURACY=70;
  // 5pp lama kini menjadi margin non-inferioritas statistik (bukan ambang selisih titik).
  const MAX_CANARY_REGRESSION_PP=5;
  const STAT_MARGIN=MAX_CANARY_REGRESSION_PP/100;
  // Lantai bukti per lengan milik gate statistik; ikut default modul gate (25) supaya
  // tidak ada dua sumber kebenaran. Di bawah ini gate SELALU hold (underpowered).
  const MIN_N_PER_ARM=statGate?.DEFAULTS?.minNPerArm??25;
  const MIN_POST_PROMOTION_ATTEMPTS=5;
  const MIN_POST_PROMOTION_ACCURACY=60;
  const MAX_POST_PROMOTION_REGRESSION_PP=10;
  const text=v=>String(v??'').trim();
  const pct=(correct,attempts)=>attempts>0?Math.round((Number(correct)||0)/(Number(attempts)||1)*100):null;
  const roundPp=v=>typeof v==='number'&&isFinite(v)?Math.round(v*1000)/10:null;
  function decision(status,reason,config,evidence,metrics={},brain=null){
    // Kontrak Braincore v3: setiap keputusan membawa rationale berprefix brain3_ dan
    // confidence numerik. Keputusan guard (privasi, expiry, kelengkapan data) bersifat
    // deterministik dari aturan — confidence 0.9 mencerminkan "kami sangat yakin guard
    // ini benar", bukan inferensi statistik.
    const rationale=text(brain?.rationale)||`brain3_promotion_${status}_${reason}`.slice(0,120);
    const confidence=typeof brain?.confidence==='number'&&isFinite(brain.confidence)?Math.min(0.99,Math.max(0,brain.confidence)):0.9;
    return{schema:PROMOTION_SCHEMA,status,reason,rationale,confidence,canaryId:text(config?.canaryId).slice(0,120),patchId:text(config?.candidate?.patchId).slice(0,160),sourceVersion:text(config?.candidate?.target?.sourceVersion).slice(0,40),metrics,thresholds:{minExposureSessions:MIN_EXPOSURE_SESSIONS,minControlAttempts:MIN_CONTROL_ATTEMPTS,minCanaryAttempts:MIN_CANARY_ATTEMPTS,minCanaryAccuracy:MIN_CANARY_ACCURACY,maxCanaryRegressionPp:MAX_CANARY_REGRESSION_PP,minNPerArm:MIN_N_PER_ARM,statMarginPp:MAX_CANARY_REGRESSION_PP,attemptFloorSemantics:'runtime_safety_threshold_not_learning_promotion_evidence',minPostPromotionAttempts:MIN_POST_PROMOTION_ATTEMPTS,minPostPromotionAccuracy:MIN_POST_PROMOTION_ACCURACY,maxPostPromotionRegressionPp:MAX_POST_PROMOTION_REGRESSION_PP},privacy:{rawAnswersIncluded:false,rawHistoryIncluded:false}};
  }
  function evaluate(rawConfig,rawEvidence,now=Date.now()){
    if(!canary?.sanitizeConfig||!canary?.sanitizeEvidence)return decision('rollback','canary_runtime_unavailable',null,null);
    const config=canary.sanitizeConfig(rawConfig);if(!config)return decision('rollback','invalid_config',null,null);
    if(rawEvidence?.privacy?.rawAnswersIncluded===true||rawEvidence?.privacy?.rawHistoryIncluded===true)return decision('rollback','privacy_violation',config,null);
    const evidence=canary.sanitizeEvidence(rawEvidence,config.canaryId||rawEvidence?.canaryId||'');
    if(!config.enabled||config.mode!=='canary')return decision('hold','canary_not_active',config,evidence);
    if(config.expiresAt){const exp=Date.parse(config.expiresAt);if(!Number.isFinite(exp)||exp<=now)return decision('rollback','expired',config,evidence);}else return decision('rollback','expiry_required',config,evidence);
    if(evidence.privacy?.rawAnswersIncluded||evidence.privacy?.rawHistoryIncluded)return decision('rollback','privacy_violation',config,evidence);
    const controlAttempts=Number(evidence.controlAttempts||0),controlCorrect=Number(evidence.controlCorrect||0),canaryAttempts=Number(evidence.canaryAttempts||0),canaryCorrect=Number(evidence.canaryCorrect||0),promotedAttempts=Number(evidence.promotedAttempts||0),promotedCorrect=Number(evidence.promotedCorrect||0);
    const controlAccuracy=pct(controlCorrect,controlAttempts),canaryAccuracy=pct(canaryCorrect,canaryAttempts),promotedAccuracy=pct(promotedCorrect,promotedAttempts);
    const metrics={exposureSessions:Number(evidence.exposureSessions||0),controlAttempts,controlCorrect,controlAccuracy,canaryAttempts,canaryCorrect,canaryAccuracy,promotedAttempts,promotedCorrect,promotedAccuracy,rollbackCount:Number(evidence.rollbackCount||0)};
    if(metrics.rollbackCount>0)return decision('rollback','prior_runtime_rollback',config,evidence,metrics);
    // Pemantauan pasca-promosi: keputusan "pertahankan vs cabut" overlay yang SUDAH
    // dipromosikan. Ini guard runtime (default: pertahankan kecuali regresi), bukan
    // keputusan promosi belajar — jadi ambang lama tetap dipakai apa adanya.
    if(promotedAttempts>=MIN_POST_PROMOTION_ATTEMPTS){
      const floor=Math.max(MIN_POST_PROMOTION_ACCURACY,(controlAccuracy??MIN_POST_PROMOTION_ACCURACY)-MAX_POST_PROMOTION_REGRESSION_PP);
      if(promotedAccuracy===null||promotedAccuracy<floor)return decision('rollback','post_promotion_regression',config,evidence,{...metrics,requiredPostPromotionAccuracy:floor});
      return decision('promote','post_promotion_stable',config,evidence,{...metrics,requiredPostPromotionAccuracy:floor});
    }
    // ---- Guard runtime-safety minimum (ambang lama). Perlu, tapi TIDAK cukup untuk
    // promote: lolos semua guard di bawah hanya berarti "data layak dihitung". ----
    if(metrics.exposureSessions<MIN_EXPOSURE_SESSIONS)return decision('hold','insufficient_exposure_sessions',config,evidence,metrics);
    if(controlAttempts<MIN_CONTROL_ATTEMPTS)return decision('hold','insufficient_control_evidence',config,evidence,metrics);
    if(canaryAttempts<MIN_CANARY_ATTEMPTS)return decision('hold','insufficient_canary_evidence',config,evidence,metrics);
    // ---- Keputusan promosi yang sebenarnya: FiezelStatGate.verdict. Tanpa gate,
    // fail-safe ke hold — promosi tanpa statistik adalah bug lama, bukan fallback. ----
    if(typeof statGate?.verdict!=='function')return decision('hold','stat_gate_unavailable',config,evidence,metrics);
    const v=statGate.verdict({control:{successes:controlCorrect,n:controlAttempts},candidate:{successes:canaryCorrect,n:canaryAttempts},marginPp:STAT_MARGIN,minNPerArm:MIN_N_PER_ARM});
    const t=v.test||null;
    const statMetrics={...metrics,statDecision:v.decision,statRationale:v.rationale,statConfidence:v.confidence,statDiffPp:t?roundPp(t.diff):null,statCiLoPp:t?roundPp(t.ciLo):null,statCiHiPp:t?roundPp(t.ciHi):null,statPValue:t?Math.round(t.pValue*10000)/10000:null,statNeedPerArm:Number.isFinite(v.needPerArm)?v.needPerArm:null};
    // Reject = kandidat TERBUKTI lebih buruk (seluruh CI selisih < 0) → rollback.
    // Nama reason lama dipertahankan agar kosakata ledger/consumer tidak berubah.
    if(v.decision==='reject')return decision('rollback','canary_learning_regression',config,evidence,statMetrics,v);
    if(v.decision==='promote'){
      // Guard absolut lama: non-inferior saja tidak cukup bila akurasi mutlak masih
      // rendah (kontrol dan kandidat sama-sama buruk). Ini hold, bukan rollback:
      // kandidat tidak memburukkan apa pun, ia hanya belum layak dipromosikan.
      if(canaryAccuracy===null||canaryAccuracy<MIN_CANARY_ACCURACY)return decision('hold','below_absolute_accuracy_floor',config,evidence,{...statMetrics,requiredCanaryAccuracy:MIN_CANARY_ACCURACY},{rationale:'brain3_promotion_hold_below_absolute_floor',confidence:0.8});
      return decision('promote','evidence_threshold_pass',config,evidence,{...statMetrics,requiredCanaryAccuracy:MIN_CANARY_ACCURACY},v);
    }
    // Hold gate (underpowered/inconclusive): status SAH tanpa batas waktu — lihat
    // kontrak di header. statNeedPerArm memberi tahu pemanggil harga bukti sebenarnya.
    return decision('hold',v.rationale==='brain3_stat_hold_underpowered'?'stat_underpowered':'stat_inconclusive',config,evidence,statMetrics,v);
  }
  return{PROMOTION_SCHEMA,MIN_EXPOSURE_SESSIONS,MIN_CONTROL_ATTEMPTS,MIN_CANARY_ATTEMPTS,MIN_CANARY_ACCURACY,MAX_CANARY_REGRESSION_PP,STAT_MARGIN,MIN_N_PER_ARM,MIN_POST_PROMOTION_ATTEMPTS,MIN_POST_PROMOTION_ACCURACY,MAX_POST_PROMOTION_REGRESSION_PP,pct,evaluate};
});
