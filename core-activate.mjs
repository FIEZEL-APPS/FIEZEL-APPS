import fs from 'node:fs';import process from 'node:process';
const base=String(process.env.FIEZEL_CORE_WORKER_URL||process.argv[2]||'').trim().replace(/\/$/,'');
if(!/^https:\/\/[a-z0-9-]+\.puter\.work$/i.test(base)){console.error('Usage: node core-activate.mjs https://<worker>.puter.work');process.exit(2)}
const health=await fetch(base+'/health',{cache:'no-store'});const h=await health.json().catch(()=>({}));
if(!health.ok||h.status!=='ok'||h.protocol!=='1.7'||h.aiGateway!=='core-only'||!h.capabilities?.includes('policy-outcome-v1')||!h.capabilities?.includes('context-coach-v1')||!h.capabilities?.includes('content-qa-v1')||!h.capabilities?.includes('guarded-content-patch-v1'))throw new Error(`Core health mismatch: HTTP ${health.status} ${JSON.stringify(h)}`);
const pub=await fetch(base+'/api/push/public-key',{cache:'no-store'});const p=await pub.json().catch(()=>({}));
if(!pub.ok||!p.configured||typeof p.vapidPublicKey!=='string'||p.vapidPublicKey.length<80)throw new Error('Worker VAPID public key is not configured yet');
const file='core-config.js',src=fs.readFileSync(file,'utf8');
if(/VAPID_PRIVATE_KEY|PUTER_AUTH_TOKEN|FIEZEL_REMINDER_CRON_TOKEN/.test(src))throw new Error('Refusing to edit a config containing private secret identifiers');
const next=src.replace(/workerUrl:'[^']*'/,`workerUrl:'${base}'`).replace(/deploymentState:'[^']*'/,"deploymentState:'validated'");
if(next===src)throw new Error('core-config.js format not recognized');fs.writeFileSync(file,next);
console.log(JSON.stringify({status:'ACTIVATED_LOCALLY',workerUrl:base,protocol:h.protocol,pushConfigured:true,next:'rerun full quality gates and deploy static PWA'},null,2));
