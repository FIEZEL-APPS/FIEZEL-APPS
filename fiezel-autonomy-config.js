(function(root,factory){
  // Pola muat UMD/require standar repo: Node pakai require relatif, browser pakai global.
  const isNode=typeof module==='object'&&module.exports;
  const statGate=isNode?require('./features/brain/fiezel-stat-gate.js'):root?.FiezelStatGate;
  const api=factory(statGate);
  if(isNode)module.exports=api;
  if(root)root.FIEZEL_AUTONOMY_CONFIG=api;
})(typeof self!=='undefined'?self:globalThis,function(statGate){
  'use strict';
  const CONFIG_SCHEMA='fiezel-autonomy-config-v1';
  const LEVELS=new Set(['advisory','canary','full']);
  // minNPerArm TIDAK ditulis sebagai angka ajaib: diturunkan dari mdeForProportion
  // milik FiezelStatGate. Definisinya: n per lengan terkecil di mana MDE (baseline
  // 0.80, kalibrasi council §3.3) masih terdefinisi sama sekali, lalu tidak pernah di
  // bawah lantai fail-safe gate (25). Hasil saat ini 25 — dan mdeForProportion(0.80,25)
  // ≈ 37.7pp, artinya lantai ini HANYA cukup menangkap regresi bencana; membuktikan
  // margin 5pp sungguhan butuh sampleSizeForProportion(0.80,0.05) ≈ 906 per lengan.
  function deriveMinNPerArm(){
    const floor=statGate?.DEFAULTS?.minNPerArm??25;
    if(typeof statGate?.mdeForProportion!=='function')return floor; // fail-safe bila gate belum termuat (urutan <script> browser)
    for(let n=1;n<=floor*4;n++){if(statGate.mdeForProportion(0.80,n)!==null)return Math.max(floor,n);}
    return floor;
  }
  // CATATAN SEMANTIK (temuan Sol, model-council-gpt_5_6_sol.md rekomendasi #4):
  // minControlAttempts/minCanaryAttempts=8 adalah 'runtime safety threshold' — lantai
  // kewarasan data sebelum statistik dihitung — dan BUKAN 'learning promotion evidence'.
  // Lolos 8 attempt tidak pernah cukup untuk promote; bukti promosi datang dari
  // FiezelStatGate.verdict dengan minNPerArm di bawah ini. Label mesin-terbaca ada di
  // THRESHOLD_SEMANTICS supaya konsumen/audit tidak salah tafsir lagi.
  const DEFAULT_THRESHOLDS={minExposureSessions:3,minControlAttempts:8,minCanaryAttempts:8,minCanaryAccuracy:70,maxCanaryRegressionPp:5,minNPerArm:deriveMinNPerArm(),minPostPromotionAttempts:5,minPostPromotionAccuracy:60,maxPostPromotionRegressionPp:10};
  const THRESHOLD_SEMANTICS={minControlAttempts:'runtime_safety_threshold_not_learning_promotion_evidence',minCanaryAttempts:'runtime_safety_threshold_not_learning_promotion_evidence',minNPerArm:'statistical_evidence_floor_from_mdeForProportion',maxCanaryRegressionPp:'noninferiority_margin_pp_decided_by_stat_gate_ci'};
  const text=v=>String(v??'').trim();
  const num=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  const bound=(v,max)=>text(v).slice(0,max);
  const UUID_RE=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const ISO_RE=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  function sanitizeThresholds(raw){
    const t=raw&&typeof raw==='object'?raw:{};
    const pick=(k,min,max,def)=>{const v=Number(t[k]);return Number.isFinite(v)?Math.round(Math.max(min,Math.min(max,v))):def};
    return{minExposureSessions:pick('minExposureSessions',1,1e6,DEFAULT_THRESHOLDS.minExposureSessions),minControlAttempts:pick('minControlAttempts',1,1e6,DEFAULT_THRESHOLDS.minControlAttempts),minCanaryAttempts:pick('minCanaryAttempts',1,1e6,DEFAULT_THRESHOLDS.minCanaryAttempts),minCanaryAccuracy:pick('minCanaryAccuracy',0,100,DEFAULT_THRESHOLDS.minCanaryAccuracy),maxCanaryRegressionPp:pick('maxCanaryRegressionPp',0,100,DEFAULT_THRESHOLDS.maxCanaryRegressionPp),minNPerArm:pick('minNPerArm',1,1e6,DEFAULT_THRESHOLDS.minNPerArm),minPostPromotionAttempts:pick('minPostPromotionAttempts',1,1e6,DEFAULT_THRESHOLDS.minPostPromotionAttempts),minPostPromotionAccuracy:pick('minPostPromotionAccuracy',0,100,DEFAULT_THRESHOLDS.minPostPromotionAccuracy),maxPostPromotionRegressionPp:pick('maxPostPromotionRegressionPp',0,100,DEFAULT_THRESHOLDS.maxPostPromotionRegressionPp)};
  }
  function sanitizeConfig(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
    if(raw.schema&&raw.schema!==CONFIG_SCHEMA)return null;
    const level=bound(raw.autonomyLevel,20);
    if(!LEVELS.has(level))return null;
    const ownerRef=bound(raw.ownerRef,64);
    const approvedAt=bound(raw.approvedAt,40);
    const ownerApproved=raw.ownerApproved===true;
    const autoCanonicalAdoption=raw.autoCanonicalAdoption===true;
    const halt=raw.halt===true;
    if(level==='full'&&(!ownerApproved||!ownerRef||!UUID_RE.test(ownerRef)||!approvedAt||!ISO_RE.test(approvedAt)))return null;
    if(level!=='full'&&autoCanonicalAdoption)return null;
    if(ownerApproved&&(!ownerRef||!UUID_RE.test(ownerRef)||!approvedAt||!ISO_RE.test(approvedAt)))return null;
    return{schema:CONFIG_SCHEMA,autonomyLevel:level,ownerApproved,ownerRef,approvedAt,autoCanonicalAdoption,halt,thresholds:sanitizeThresholds(raw.thresholds)};
  }
  function effectiveLevel(raw){
    const c=sanitizeConfig(raw);
    if(!c)return'halt';
    if(c.halt)return'halt';
    return c.autonomyLevel;
  }
  return{CONFIG_SCHEMA,LEVELS,DEFAULT_THRESHOLDS,THRESHOLD_SEMANTICS,sanitizeThresholds,sanitizeConfig,effectiveLevel};
});