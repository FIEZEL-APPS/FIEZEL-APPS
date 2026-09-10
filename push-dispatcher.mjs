import webpush from 'web-push';
const required=['FIEZEL_CORE_WORKER_URL','FIEZEL_REMINDER_CRON_TOKEN','VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT'];
for(const k of required)if(!process.env[k])throw new Error(`Missing ${k}`);
const base=process.env.FIEZEL_CORE_WORKER_URL.replace(/\/$/,'');
// RFC 8030: Topic header MUST be 1-32 chars and only URL-safe base64 [A-Za-z0-9_-].
// Legacy/stale records may carry tags with spaces or non-ASCII -> would 400 BadWebPushTopic.
const safeTopic=(t)=>{const s=String(t||'fiezel').replace(/[^A-Za-z0-9_-]+/g,'-').slice(0,32).replace(/^[-_]+/,'');return s||'fiezel'};
const auth={Authorization:`Bearer ${process.env.FIEZEL_REMINDER_CRON_TOKEN}`,'Content-Type':'application/json'};
webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
const dueRes=await fetch(`${base}/api/reminders/due`,{method:'POST',headers:auth});if(!dueRes.ok)throw new Error(`due endpoint ${dueRes.status}: ${await dueRes.text()}`);
const payload=await dueRes.json();let sent=0,failed=0,suppressed=0;
for(const item of payload.due||[]){
  const notification=item?.notification||{},meta=notification?.meta||{};
  const looksUninitialized=notification.kind==='inactivity_7'&&meta.trigger==='inactive_7_plus_days'&&Number(meta.daysInactive||0)>=365&&Number(meta.todayAttempts||0)===0&&Number(meta.streakDays||0)===0&&Number(meta.dueReviews||0)===0&&Number(meta.maxForgettingRisk||0)===0&&Number(meta.consistency14d||0)===0&&Number(meta.recurringErrorSkills||0)===0;
  if(looksUninitialized){suppressed++;continue}
  let status='sent';try{await webpush.sendNotification(item.subscription,JSON.stringify(notification),{TTL:86400,urgency:'normal',topic:safeTopic(notification.tag)});sent++}catch(e){status=(e.statusCode===404||e.statusCode===410)?'expired':`failed:${e.statusCode||'error'}`;failed++;console.error('push failed',e.statusCode||'',e.body||e.message)}
  const ack=await fetch(`${base}/api/reminders/ack`,{method:'POST',headers:auth,body:JSON.stringify({id:item.id,kind:notification.kind,status,evidence:notification.meta||{}})});if(!ack.ok)console.error('ack failed',ack.status,await ack.text());
}
console.log(JSON.stringify({checked:payload.count||0,sent,failed,suppressed,at:new Date().toISOString()}));if(failed)process.exitCode=1;
