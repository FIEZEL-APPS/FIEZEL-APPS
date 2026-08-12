import webpush from 'web-push';
const required=['FIEZEL_CORE_WORKER_URL','FIEZEL_REMINDER_CRON_TOKEN','VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT'];
for(const k of required)if(!process.env[k])throw new Error(`Missing ${k}`);
const base=process.env.FIEZEL_CORE_WORKER_URL.replace(/\/$/,'');
const auth={Authorization:`Bearer ${process.env.FIEZEL_REMINDER_CRON_TOKEN}`,'Content-Type':'application/json'};
webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
const dueRes=await fetch(`${base}/api/reminders/due`,{method:'POST',headers:auth});if(!dueRes.ok)throw new Error(`due endpoint ${dueRes.status}: ${await dueRes.text()}`);
const payload=await dueRes.json();let sent=0,failed=0;
for(const item of payload.due||[]){let status='sent';try{await webpush.sendNotification(item.subscription,JSON.stringify(item.notification),{TTL:86400,urgency:'normal',topic:String(item.notification.tag||'fiezel').slice(0,32)});sent++}catch(e){status=(e.statusCode===404||e.statusCode===410)?'expired':`failed:${e.statusCode||'error'}`;failed++;console.error('push failed',item.id,e.statusCode||'',e.body||e.message)}
  const ack=await fetch(`${base}/api/reminders/ack`,{method:'POST',headers:auth,body:JSON.stringify({id:item.id,kind:item.notification.kind,status,evidence:item.notification.meta||{}})});if(!ack.ok)console.error('ack failed',item.id,ack.status,await ack.text());
}
console.log(JSON.stringify({checked:payload.count||0,sent,failed,at:new Date().toISOString()}));if(failed)process.exitCode=1;
