// Temporary deployment-only proof route. This file is inserted only for an explicitly marked Core proof deploy.
// proof deploy trigger v5 - overwrite original bound Worker source path
router.post('/api/reminders/proof',async({request})=>{
  if(!(await cronAuthorized(request)))return json({error:'unauthorized'},401);
  const rows=await me.puter.kv.list({pattern:USER_PREFIX+'*',returnValues:true});
  const row=rows.slice(0,MAX_USERS).find(x=>x?.value?.subscription);
  if(!row)return {generatedAt:new Date().toISOString(),count:0,due:[]};
  return {generatedAt:new Date().toISOString(),count:1,due:[{
    id:row.key.slice(USER_PREFIX.length),
    subscription:row.value.subscription,
    notification:{kind:'proof',title:'FIEZEL - Remote Push Test',body:'Closed-app remote push proof berhasil.',url:'./',tag:'fiezel-remote-proof',meta:{proof:true}}
  }]};
});