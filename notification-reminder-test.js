const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__dirname,app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const failures=[];const assert=(c,m)=>{if(!c)failures.push(m)};
function classList(){const s=new Set();return{add(...xs){xs.forEach(x=>s.add(x))},remove(...xs){xs.forEach(x=>s.delete(x))},toggle(x,v){if(v===undefined?v:!s.has(x))s.add(x);else s.delete(x)},contains(x){return s.has(x)},values:s}}
const elements={};function element(id){return elements[id]||=( {id,innerHTML:'',textContent:'',disabled:false,onclick:null,className:'',classList:classList(),setAttribute(){},addEventListener(){},focus(){}} )}
const bodyClasses=classList();
const document={baseURI:'http://localhost/',body:{classList:bodyClasses},visibilityState:'visible',getElementById:element,querySelector(){return null},querySelectorAll(){return[]},createElement(){return{className:'',textContent:'',disabled:false,onclick:null,classList:classList(),append(){},addEventListener(){}}},addEventListener(){}};
const store={};const localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
const notifications=[];const Notification=function(title,options){notifications.push({title,options});this.close=()=>{};};Notification.permission='denied';Notification.requestPermission=async()=>Notification.permission;
const fetch=async u=>{const file=String(u).split('/').pop();return{ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))}};
const noopTimer=()=>({unref(){}});
const navigator={vibrate(){return true}};
const context={console,document,localStorage,Notification,navigator,fetch,location:{href:'http://localhost/'},window:null,self:null,Date,Intl,Math,URL,Error,Promise,setTimeout,clearTimeout,setInterval:noopTimer,clearInterval(){},SpeechSynthesisUtterance:function(){},speechSynthesis:{cancel(){},speak(){}}};context.window=context;context.self=context;context.window.scrollTo=()=>{};context.window.focus=()=>{};
vm.createContext(context);vm.runInContext(app,context,{filename:'app.js'});
setTimeout(async()=>{
  try{
    assert(bodyClasses.contains('notification-locked'),'denied permission must lock the application');
    assert(!/launcher-shell/.test(element('app').innerHTML),'Home rendered before notification permission was granted');
    assert(/tetap terkunci|ditolak/i.test(element('notificationGateStatus').textContent),'denied permission status is not visible');
    Notification.permission='granted';await context.requestRequiredNotificationPermission();
    assert(!bodyClasses.contains('notification-locked'),'granted permission did not unlock the application');
    assert(/launcher-shell/.test(element('app').innerHTML),'Home did not render after notification permission became granted');
    const st=context.__getFiezelState();st.totalAnswered=1;st.history=[{type:'grammar',skill:'test',ok:true,at:Date.now()-4*86400000}];st.daily={date:'',attempts:0,count:0,meaningful:false};st.reminderMeta={lastNotificationAt:0,lastNotificationDay:'',lastNotificationKind:'',lastMessageIndex:-1};
    await context.__fiezelAudit.checkStudyReminders(true);
    assert(notifications.length===1,`expected one inactivity notification, got ${notifications.length}`);
    assert(/FIEZEL/.test(notifications[0]?.title||''),'inactivity reminder title missing');
    const m=context.__fiezelAudit.selectLoginMessage();assert(m&&m.headline&&m.lead,'login reminder did not return headline + lead');
    assert(store['fiezel-last-login-message']!=null,'login reminder index was not persisted to avoid immediate repetition');
  }catch(e){failures.push(e.stack||String(e))}
  if(failures.length){console.error('FIEZEL notification reminder: FAIL');failures.forEach(x=>console.error('- '+x));process.exitCode=1;return}
  console.log('FIEZEL notification reminder: PASS');console.log(JSON.stringify({deniedLocksApp:true,grantedUnlocksApp:true,inactivityNotification:true,rotatingLoginMessage:true}));
},260);
