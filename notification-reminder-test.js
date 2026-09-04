/*
 * OWNER MEMBALIK m025-34: notifikasi WAJIB menjadi notifikasi yang DIUNDANG, TIDAK DIPAKSA.
 *
 * Berkas ini dulu menjaga kebalikannya. Dua pernyataan pertamanya berbunyi "denied
 * permission must lock the application" dan "Home rendered before notification permission
 * was granted" - artinya tes ini ikut MENJAMIN pola yang dinilai OWNER sebagai
 * dark-pattern. Pernyataannya sekarang dibalik, bukan dihapus: yang dijaga adalah janji
 * baru - izin yang ditolak TIDAK mengunci apa pun, Home tetap tergambar, dan mesin
 * pengingat tetap bekerja begitu izinnya benar-benar ada.
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__dirname,app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const expectedVersion=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8')).version;
const failures=[];const assert=(c,m)=>{if(!c)failures.push(m)};
function classList(){const s=new Set();return{add(...xs){xs.forEach(x=>s.add(x))},remove(...xs){xs.forEach(x=>s.delete(x))},toggle(x,v){if(v===undefined?v:!s.has(x))s.add(x);else s.delete(x)},contains(x){return s.has(x)},values:s}}
/* `querySelector`/`querySelectorAll` ADA di elemen palsu ini sejak m025-236. Alasannya bukan
   kelengkapan demi kelengkapan: sejak naskah gerbang notifikasi pindah ke copy-map,
   setNotificationGateState() menyisir anak-anak panel (`.welcome-mark`,
   `.notification-requirement span`) untuk menerjemahkannya. Elemen palsu tanpa dua metode itu
   membuat harness meledak dengan `gate.querySelector is not a function` — kegagalan HARNESS
   yang menyamar sebagai kegagalan produk, sebab di peramban `$('welcome')` adalah elemen
   sungguhan yang punya keduanya. Kembalian `null`/`[]` sudah cukup: kode produksi menjaga
   setiap hasilnya dengan `if(...)`, dan itu justru yang ikut terjaga di sini. */
const elements={};function element(id){return elements[id]||=( {id,innerHTML:'',textContent:'',disabled:false,onclick:null,className:'',classList:classList(),setAttribute(){},addEventListener(){},focus(){},querySelector(){return null},querySelectorAll(){return[]}} )}
const bodyClasses=classList();
const document={baseURI:'http://localhost/',body:{classList:bodyClasses},visibilityState:'visible',getElementById:element,querySelector(){return null},querySelectorAll(){return[]},createElement(){return{className:'',textContent:'',disabled:false,onclick:null,classList:classList(),append(){},addEventListener(){}}},addEventListener(){}};
const store={};const localStorage={getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]};
const notifications=[];const Notification=function(title,options){notifications.push({title,options});this.close=()=>{};};Notification.permission='denied';Notification.requestPermission=async()=>Notification.permission;
const fetch=async u=>{const file=String(u).split('/').pop();return{ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))}};
const noopTimer=()=>({unref(){}});
const navigator={vibrate(){return true}};
const context={console,document,localStorage,Notification,navigator,fetch,location:{href:'http://localhost/'},window:null,self:null,Date,Intl,Math,URL,Error,Promise,setTimeout,clearTimeout,setInterval:noopTimer,clearInterval(){},SpeechSynthesisUtterance:function(){},speechSynthesis:{cancel(){},speak(){}},FIEZEL_REQUIRE_NOTIFICATIONS:false};context.window=context;context.self=context;context.window.scrollTo=()=>{};context.window.focus=()=>{};
vm.createContext(context);
// AI-20 F06 (W1-TESTPLAN 2b): harness i18n KONDISIONAL — meniru urutan <script> index.html
// (fiezel-i18n.js lalu copy-id-*.js SEBELUM app.js). Begitu naskah pengingat pindah ke
// copy-map, app.js memanggil FiezelI18n.t() saat boot; tanpa harness ini vm meledak.
// existsSync menjaga tes tetap hijau dua arah (pra & pasca ekstraksi). Asersi id di bawah
// TIDAK berubah — keluaran id wajib byte-identik (id-golden-snapshot-test.js).
const i18nDir=path.join(root,'features','i18n');
if(fs.existsSync(path.join(i18nDir,'fiezel-i18n.js'))){
  vm.runInContext(fs.readFileSync(path.join(i18nDir,'fiezel-i18n.js'),'utf8'),context,{filename:'fiezel-i18n.js'});
  for(const f of fs.readdirSync(i18nDir).filter(n=>/^copy-id-.*\.js$/.test(n)).sort())
    vm.runInContext(fs.readFileSync(path.join(i18nDir,f),'utf8'),context,{filename:f});
}
vm.runInContext(app,context,{filename:'app.js'});
setTimeout(async()=>{
  try{
    // WAJIB -> DIUNDANG, TIDAK DIPAKSA: izin 'denied' tidak boleh mengunci apa pun.
    assert(!bodyClasses.contains('notification-locked'),'izin ditolak TIDAK boleh mengunci aplikasi lagi');
    assert(/launcher-shell/.test(element('app').innerHTML),'Home harus tergambar walaupun izin notifikasi ditolak');
    // Panel undangan pun tidak ditawarkan pada izin yang sudah 'denied': browser tidak akan
    // menampilkan dialognya lagi, jadi tawaran itu hanya akan jadi panel buntu.
    assert(element('welcome').classList.contains('hidden')||!/terkunci|belum bisa dibuka|wajib/i.test(element('notificationGateBody').textContent),'tidak boleh ada naskah "terkunci"/"wajib" yang tersisa di panel');
    assert(typeof context.requestStudyNotificationPermission==='function','undangan harus punya jalur menerima');
    assert(typeof context.declineStudyNotifications==='function','undangan harus punya jalur menolak yang tidak mengunci apa pun');
    // Menolak lewat "Nanti saja" tetap meninggalkan aplikasi yang utuh dan terpakai.
    context.declineStudyNotifications();
    assert(!bodyClasses.contains('notification-locked'),'"Nanti saja" tidak boleh mengunci aplikasi');
    assert(/launcher-shell/.test(element('app').innerHTML),'Home tetap ada setelah menolak pengingat');
    // Izin yang kemudian diberikan tetap menyalakan pengingatnya seperti sebelumnya.
    Notification.permission='granted';await context.requestStudyNotificationPermission();
    assert(!bodyClasses.contains('notification-locked'),'izin diberikan tetap tidak boleh menyentuh kunci apa pun');
    assert(context.__getFiezelState().preferences.reminders===true,'izin yang diberikan harus tercatat sebagai preferensi pengingat murid');
    assert(notifications.length===0,'app update must stay silent, no update notification shown');
    assert(store['fiezel.seenAppVersion']===expectedVersion,'seen app version was not persisted');
    context.notifyAppUpdateIfNew();
    assert(notifications.length===0,'app update must stay silent on repeated check');
    const st=context.__getFiezelState();st.totalAnswered=1;st.history=[{type:'grammar',skill:'test',ok:true,at:Date.now()-4*86400000}];st.daily={date:'',attempts:0,count:0,meaningful:false};st.reminderMeta={lastNotificationAt:0,lastNotificationDay:'',lastNotificationKind:'',lastMessageIndex:-1};
    await context.__fiezelAudit.checkStudyReminders(true);
    assert(notifications.length===1,`expected one inactivity notification, got ${notifications.length}`);
    assert(/FIEZEL/.test(notifications[0]?.title||''),'inactivity reminder title missing');
    // "Tawarkan sekali lagi dengan lembut" tidak boleh berubah menjadi tawaran di setiap
    // boot - itu dark-pattern yang sama, hanya lebih pelan. Jatahnya dibatasi dua kali
    // seumur pemasangan, dan izin yang sudah 'denied' tidak ditawari lagi sama sekali
    // (browser tidak akan menampilkan dialognya untuk kedua kali).
    delete store['fiezel-reminder-invite-v1'];
    context.__getFiezelState().preferences.reminders=null;
    Notification.permission='default';
    assert(context.shouldInviteNotifications()===true,'izin yang belum diputuskan harus boleh ditawari');
    context.writeReminderInvite({offers:2});
    assert(context.shouldInviteNotifications()===false,'jatah tawaran habis harus menutup tawaran berikutnya');
    context.writeReminderInvite({offers:0});
    context.__getFiezelState().preferences.reminders=false;
    assert(context.shouldInviteNotifications()===false,'murid yang mematikan pengingat tidak boleh ditawari lagi');
    context.__getFiezelState().preferences.reminders=null;
    Notification.permission='denied';
    assert(context.shouldInviteNotifications()===false,'izin yang sudah ditolak browser tidak boleh ditawari lagi');
    // Jalan masuk kembali: Pengaturan menyalakan pengingat dan menyimpannya sebagai
    // preferensi, bukan sebagai syarat masuk.
    Notification.permission='granted';
    await context.toggleStudyReminders({checked:true});
    assert(context.__getFiezelState().preferences.reminders===true,'Pengaturan harus bisa menyalakan pengingat lagi');
    await context.toggleStudyReminders({checked:false});
    assert(context.__getFiezelState().preferences.reminders===false,'Pengaturan harus bisa mematikan pengingat');
    assert(context.remindersActive()===false,'pengingat yang dimatikan murid tidak boleh dikirim walau izinnya ada');
    context.__getFiezelState().preferences.reminders=true;
    const m=context.__fiezelAudit.selectLoginMessage();assert(m&&m.headline&&m.lead,'login reminder did not return headline + lead');
    assert(store['fiezel-last-login-message']!=null,'login reminder index was not persisted to avoid immediate repetition');
  }catch(e){failures.push(e.stack||String(e))}
  if(failures.length){console.error('FIEZEL notification reminder: FAIL');failures.forEach(x=>console.error('- '+x));process.exitCode=1;return}
  console.log('FIEZEL notification reminder: PASS');console.log(JSON.stringify({deniedNeverLocksApp:true,homeRendersWithoutPermission:true,declineKeepsAppUsable:true,grantedEnablesReminders:true,inviteOfferCapped:true,settingsCanReEnable:true,inactivityNotification:true,rotatingLoginMessage:true,silentUpdate:true,updateNoRepeat:true}));
},260);
