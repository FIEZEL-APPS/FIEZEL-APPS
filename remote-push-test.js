const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=__dirname,read=f=>fs.readFileSync(path.join(root,f),'utf8');
const app=read('app.js'),sw=read('sw.js'),idx=read('index.html'),cfg=read('core-config.js'),worker=read('fiezel-core-worker.js'),dispatcher=read('push-dispatcher.mjs'),workflow=read('.github/workflows/push-reminders.yml'),pkg=JSON.parse(read('package.json'));
const workerUrl=(cfg.match(/workerUrl:'([^']*)'/)||[])[1]||'';
const deploymentState=(cfg.match(/deploymentState:'([^']*)'/)||[])[1]||'';
const deploymentConfigValid=(workerUrl===''&&deploymentState==='unconfigured')||(/^https:\/\/[a-z0-9-]+\.puter\.work$/i.test(workerUrl)&&deploymentState==='validated');
const checks={
  coreConfigBeforeApp:idx.indexOf('./core-config.js')>0&&idx.indexOf('./core-config.js')<idx.indexOf('./app.js'),
  browserSubscription:app.includes('pushManager.subscribe')&&app.includes('userVisibleOnly:true')&&app.includes('applicationServerKey'),
  authenticatedPuterWorker:app.includes("puter.workers.exec")&&worker.includes("Puter authentication required")&&app.includes('coreWorkerExec'),
  serviceWorkerPush:sw.includes("addEventListener('push'")&&sw.includes('registration.showNotification'),
  centralizedStore:worker.includes('me.puter.kv')&&worker.includes('subscription:sub'),
  boundedActivity:worker.includes('lastStudyAt')&&worker.includes('todayAttempts')&&worker.includes('dueReviews')&&!worker.includes('raw answer history'),
  ownerOnlyConfig:worker.includes('isOwner(user)')&&worker.includes("/api/admin/configure"),
  schedulerAuth:worker.includes('cronAuthorized')&&worker.includes("/api/reminders/due")&&worker.includes("/api/reminders/ack"),
  webPushDispatcher:dispatcher.includes('webpush.sendNotification')&&dispatcher.includes('VAPID_PRIVATE_KEY')&&dispatcher.includes('FIEZEL_REMINDER_CRON_TOKEN'),
  newUserInactivityGuard:dispatcher.includes('looksUninitialized')&&dispatcher.includes("notification.kind==='inactivity_7'")&&dispatcher.includes("meta.trigger==='inactive_7_plus_days'")&&dispatcher.includes('suppressed++'),
  // Nilai topic sekarang dihitung sekali ke `sentTopic` supaya bisa ikut dicetak saat gagal;
  // yang dijaga tetap sama: topic berasal dari safeTopic(notification.tag), bukan tag mentah.
  rfc8030TopicSanitized:dispatcher.includes('safeTopic')&&dispatcher.includes('replace(/[^A-Za-z0-9_-]+/g')&&dispatcher.includes('const sentTopic=safeTopic(notification.tag)')&&dispatcher.includes('topic:sentTopic')&&!dispatcher.includes('topic:String(notification.tag'),
  // Tanpa host endpoint dan nilai topic yang benar-benar terkirim, log 400 BadWebPushTopic
  // tidak bisa dibedakan antar layanan push - itulah yang membuat kegagalan ini bertahan.
  topicFailureDiagnostics:dispatcher.includes('const endpointHost=')&&dispatcher.includes('topicLength:sentTopic.length')&&dispatcher.includes('host:endpointHost(item.subscription)'),
  // Endpoint penuh dan kunci langganan adalah data murid: host saja, tidak lebih.
  subscriptionNotLogged:!dispatcher.includes('endpoint:')&&!dispatcher.includes('keys:')&&dispatcher.includes('.host'),
  hourlySchedule:workflow.includes("cron: '17 * * * *'")&&workflow.includes('workflow_dispatch:'),
  secretsNotRuntime:!app.includes('VAPID_PRIVATE_KEY')&&!worker.includes('VAPID_PRIVATE_KEY')&&!cfg.includes('VAPID_PRIVATE_KEY')&&!cfg.includes('VAPID_PRIVATE_KEY')&&!cfg.includes('FIEZEL_REMINDER_CRON_TOKEN')&&!cfg.includes('PUTER_AUTH_TOKEN'),
  coreDeploymentConfig:cfg.includes("aiGateway:'core-only'")&&deploymentConfigValid,
  pinnedWebPush:pkg.dependencies&&pkg.dependencies['web-push']==='3.6.7'
};
let generated={};try{generated=JSON.parse(cp.execFileSync(process.execPath,[path.join(root,'generate-push-secrets.mjs')],{encoding:'utf8'}));}catch{}
checks.secretGenerator=typeof generated.VAPID_PUBLIC_KEY==='string'&&generated.VAPID_PUBLIC_KEY.length>=80&&typeof generated.VAPID_PRIVATE_KEY==='string'&&generated.VAPID_PRIVATE_KEY.length>=40&&typeof generated.FIEZEL_REMINDER_CRON_TOKEN==='string'&&generated.FIEZEL_REMINDER_CRON_TOKEN.length>=40;
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);if(failed.length){console.error(JSON.stringify({status:'FAIL',failed,checks},null,2));process.exit(1)}
console.log('FIEZEL remote push architecture: PASS');console.log(JSON.stringify({status:'PASS',checks,liveDeploymentConfigured:workerUrl!==''&&deploymentState==='validated'}));
