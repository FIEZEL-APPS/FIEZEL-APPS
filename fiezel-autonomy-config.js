(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FIEZEL_AUTONOMY_CONFIG=api;
})(typeof self!=='undefined'?self:globalThis,function(){
  'use strict';
  const CONFIG_SCHEMA='fiezel-autonomy-config-v1';
  const LEVELS=new Set(['advisory','canary','full']);
  const DEFAULT_THRESHOLDS={minExposureSessions:3,minControlAttempts:8,minCanaryAttempts:8,minCanaryAccuracy:70,maxCanaryRegressionPp:5,minPostPromotionAttempts:5,minPostPromotionAccuracy:60,maxPostPromotionRegressionPp:10};
  const text=v=>String(v??'').trim();
  const num=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  const bound=(v,max)=>text(v).slice(0,max);
  const UUID_RE=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const ISO_RE=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  function sanitizeThresholds(raw){
    const t=raw&&typeof raw==='object'?raw:{};
    const pick=(k,min,max,def)=>{const v=Number(t[k]);return Number.isFinite(v)?Math.round(Math.max(min,Math.min(max,v))):def};
    return{minExposureSessions:pick('minExposureSessions',1,1e6,DEFAULT_THRESHOLDS.minExposureSessions),minControlAttempts:pick('minControlAttempts',1,1e6,DEFAULT_THRESHOLDS.minControlAttempts),minCanaryAttempts:pick('minCanaryAttempts',1,1e6,DEFAULT_THRESHOLDS.minCanaryAttempts),minCanaryAccuracy:pick('minCanaryAccuracy',0,100,DEFAULT_THRESHOLDS.minCanaryAccuracy),maxCanaryRegressionPp:pick('maxCanaryRegressionPp',0,100,DEFAULT_THRESHOLDS.maxCanaryRegressionPp),minPostPromotionAttempts:pick('minPostPromotionAttempts',1,1e6,DEFAULT_THRESHOLDS.minPostPromotionAttempts),minPostPromotionAccuracy:pick('minPostPromotionAccuracy',0,100,DEFAULT_THRESHOLDS.minPostPromotionAccuracy),maxPostPromotionRegressionPp:pick('maxPostPromotionRegressionPp',0,100,DEFAULT_THRESHOLDS.maxPostPromotionRegressionPp)};
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
  return{CONFIG_SCHEMA,LEVELS,DEFAULT_THRESHOLDS,sanitizeThresholds,sanitizeConfig,effectiveLevel};
});