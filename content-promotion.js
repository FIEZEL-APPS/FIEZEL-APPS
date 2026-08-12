(function(root,factory){
  const canary=(typeof module==='object'&&module.exports)?require('./content-canary.js'):root?.FIEZEL_CONTENT_CANARY;
  const api=factory(canary);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FIEZEL_CONTENT_PROMOTION=api;
})(typeof self!=='undefined'?self:globalThis,function(canary){
  'use strict';
  const PROMOTION_SCHEMA='fiezel-content-promotion-v1';
  const MIN_EXPOSURE_SESSIONS=3;
  const MIN_CONTROL_ATTEMPTS=8;
  const MIN_CANARY_ATTEMPTS=8;
  const MIN_CANARY_ACCURACY=70;
  const MAX_CANARY_REGRESSION_PP=5;
  const MIN_POST_PROMOTION_ATTEMPTS=5;
  const MIN_POST_PROMOTION_ACCURACY=60;
  const MAX_POST_PROMOTION_REGRESSION_PP=10;
  const text=v=>String(v??'').trim();
  const pct=(correct,attempts)=>attempts>0?Math.round((Number(correct)||0)/(Number(attempts)||1)*100):null;
  function decision(status,reason,config,evidence,metrics={}){
    return{schema:PROMOTION_SCHEMA,status,reason,canaryId:text(config?.canaryId).slice(0,120),patchId:text(config?.candidate?.patchId).slice(0,160),sourceVersion:text(config?.candidate?.target?.sourceVersion).slice(0,40),metrics,thresholds:{minExposureSessions:MIN_EXPOSURE_SESSIONS,minControlAttempts:MIN_CONTROL_ATTEMPTS,minCanaryAttempts:MIN_CANARY_ATTEMPTS,minCanaryAccuracy:MIN_CANARY_ACCURACY,maxCanaryRegressionPp:MAX_CANARY_REGRESSION_PP,minPostPromotionAttempts:MIN_POST_PROMOTION_ATTEMPTS,minPostPromotionAccuracy:MIN_POST_PROMOTION_ACCURACY,maxPostPromotionRegressionPp:MAX_POST_PROMOTION_REGRESSION_PP},privacy:{rawAnswersIncluded:false,rawHistoryIncluded:false}};
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
    if(promotedAttempts>=MIN_POST_PROMOTION_ATTEMPTS){
      const floor=Math.max(MIN_POST_PROMOTION_ACCURACY,(controlAccuracy??MIN_POST_PROMOTION_ACCURACY)-MAX_POST_PROMOTION_REGRESSION_PP);
      if(promotedAccuracy===null||promotedAccuracy<floor)return decision('rollback','post_promotion_regression',config,evidence,{...metrics,requiredPostPromotionAccuracy:floor});
      return decision('promote','post_promotion_stable',config,evidence,{...metrics,requiredPostPromotionAccuracy:floor});
    }
    if(metrics.exposureSessions<MIN_EXPOSURE_SESSIONS)return decision('hold','insufficient_exposure_sessions',config,evidence,metrics);
    if(controlAttempts<MIN_CONTROL_ATTEMPTS)return decision('hold','insufficient_control_evidence',config,evidence,metrics);
    if(canaryAttempts<MIN_CANARY_ATTEMPTS)return decision('hold','insufficient_canary_evidence',config,evidence,metrics);
    const required=Math.max(MIN_CANARY_ACCURACY,(controlAccuracy??MIN_CANARY_ACCURACY)-MAX_CANARY_REGRESSION_PP);
    if(canaryAccuracy===null||canaryAccuracy<required)return decision('rollback','canary_learning_regression',config,evidence,{...metrics,requiredCanaryAccuracy:required});
    return decision('promote','evidence_threshold_pass',config,evidence,{...metrics,requiredCanaryAccuracy:required});
  }
  return{PROMOTION_SCHEMA,MIN_EXPOSURE_SESSIONS,MIN_CONTROL_ATTEMPTS,MIN_CANARY_ATTEMPTS,MIN_CANARY_ACCURACY,MAX_CANARY_REGRESSION_PP,MIN_POST_PROMOTION_ATTEMPTS,MIN_POST_PROMOTION_ACCURACY,MAX_POST_PROMOTION_REGRESSION_PP,pct,evaluate};
});
