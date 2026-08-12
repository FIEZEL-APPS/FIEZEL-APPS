/* FIEZEL Shadow/Canary runtime configuration.
 * Default is OFF. Activate only with a candidate that passed content-patch-gate.js.
 * Keep rollout bounded; never place secrets or learner raw answer/history here.
 */
self.FIEZEL_CONTENT_CANARY_CONFIG=Object.freeze({
  schema:'fiezel-content-canary-v1',
  enabled:false,
  mode:'off',
  canaryId:'',
  exposurePercent:0,
  maxExposureSessions:0,
  expiresAt:'',
  targetLearnerKey:'',
  candidate:null,
  gateProof:null
});
