/* FIEZEL Core Brain runtime configuration.
 * workerUrl remains empty in distributable source until an operator-owned Puter Worker is deployed.
 * Never put VAPID private keys, cron tokens, or Puter auth tokens here.
 */
self.FIEZEL_CORE_CONFIG=Object.freeze({
  workerUrl:'https://fiezel-core.puter.work',
  protocolVersion:'1.7',
  aiGateway:'core-only',
  remotePushRequired:true,
  deploymentState:'validated'
});
