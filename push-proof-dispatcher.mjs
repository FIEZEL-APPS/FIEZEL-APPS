// closed-app proof trigger v4 — validated live route, one iPhone delivery
import webpush from 'web-push';
const required=['FIEZEL_CORE_WORKER_URL','FIEZEL_REMINDER_CRON_TOKEN','VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT'];
for(const k of required)if(!process.env[k])throw new Error(`Missing ${k}`);
const base=process.env.FIEZEL_CORE_WORKER_URL.replace(/\/$/,'');
const auth={Authorization:`Bearer ${process.env.FIEZEL_REMINDER_CRON_TOKEN}`,'Content-Type':'application/json'};
const proofRes=await fetch(`${base}/api/reminders/proof`,{method:'POST',headers:auth});
if(!proofRes.ok)throw new Error(`proof endpoint ${proofRes.status}: ${await proofRes.text()}`);
const payload=await proofRes.json(),item=(payload.due||[])[0];
if(Number(payload.count||0)<1||!item?.subscription)throw new Error('No registered subscription available for proof');
webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
try{
  await webpush.sendNotification(item.subscription,JSON.stringify(item.notification),{TTL:300,urgency:'high',topic:'fiezel-remote-proof'});
  console.log(JSON.stringify({checked:1,sent:1,failed:0,policyAcked:false,at:new Date().toISOString()}));
}catch(e){
  console.error(`proof push failed ${e.statusCode||'error'} ${e.body||e.message||''}`);
  console.log(JSON.stringify({checked:1,sent:0,failed:1,policyAcked:false,at:new Date().toISOString()}));
  process.exit(1);
}
