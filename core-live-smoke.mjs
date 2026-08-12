import process from 'node:process';
const base=String(process.env.FIEZEL_CORE_WORKER_URL||process.argv[2]||'').trim().replace(/\/$/,'');
if(!/^https:\/\/[a-z0-9-]+\.puter\.work$/i.test(base)){console.error('Set FIEZEL_CORE_WORKER_URL or pass https://<name>.puter.work');process.exit(2)}
const health=await fetch(base+'/health',{cache:'no-store'});const h=await health.json().catch(()=>({}));if(!health.ok||h.status!=='ok'||h.protocol!=='1.7'||h.aiGateway!=='core-only'||!h.capabilities?.includes('adaptive-policy-v1')||!h.capabilities?.includes('policy-outcome-v1')||!h.capabilities?.includes('context-coach-v1')||!h.capabilities?.includes('content-qa-v1')||!h.capabilities?.includes('guarded-content-patch-v1'))throw new Error('Core health/protocol/capability mismatch');
const pub=await fetch(base+'/api/push/public-key',{cache:'no-store'});const p=await pub.json().catch(()=>({}));if(!pub.ok||!p.configured||typeof p.vapidPublicKey!=='string'||p.vapidPublicKey.length<80)throw new Error('VAPID public key not configured');
console.log(JSON.stringify({status:'PASS',worker:base,protocol:h.protocol,coreOnlyAI:h.aiGateway==='core-only',pushConfigured:true,capabilities:h.capabilities},null,2));
