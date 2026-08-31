/**
 * FIEZEL — fiezel-social.js · inti lapisan online/sosial (SLOT 7 frontend).
 *
 * Pola berkas: gems-core / prasasti-core — modul mandiri TANPA import, TANPA menyentuh
 * state belajar app.js. Semua yang bisa gagal (jaringan, flag mati, storage penuh)
 * gagal DIAM dan aplikasi belajar tetap utuh: seluruh pemanggil di app.js membaca
 * `self.FiezelSocial?.…` di belakang try/catch.
 *
 * Empat tanggung jawab:
 *   1. VALIDASI HANDLE (cermin klien dari HANDLE_RULES server — server tetap otoritatif):
 *      3–20 karakter a-z 0-9 _, huruf pertama alfabet, tanpa __, tanpa akhiran _,
 *      tanpa deret ≥6 digit, blocklist peniruan.
 *   2. KLIEN API `api.fiezel.my.id` (kontrak IMPLEMENTATION-SOCIAL-BACKEND.md §4):
 *      credentials 'include', identitas SELALU cookie fz_id, galat dibaca dari
 *      `data.error` lalu diterjemahkan ke kalimat Indonesia yang ramah.
 *   3. OUTBOX BUKTI offline-first: antrean localStorage, jti = uuid per batch,
 *      flush saat online/visibilitychange, item dibuang HANYA setelah ack server
 *      (replay aman — server menjawab `{accepted:0}` untuk jti yang sama).
 *   4. LABEL Indonesia untuk enum server (presence, stiker sorakan, milestone) +
 *      hitung mundur liga ke Senin 00:00 WIB.
 *
 * PRIVASI: tidak ada teks bebas apa pun yang dikirim dari modul ini — hanya enum,
 * count, handle, dan tanggal (granularitas HARI, zona WIB tetap).
 */
(function(root){
  'use strict';

  // ---------------------------------------------------------------- konstanta beku
  var I18N = root.FiezelI18n;
  function t(key, fallback, params) { return I18N ? I18N.t(key, params) : fallback; }
  
  var API_PATHS=Object.freeze({
    config:'/api/config',
    anon:'/api/auth/anon',
    profileCreate:'/api/social/profile/create',
    profileCheck:'/api/social/profile/check',
    profileMe:'/api/social/profile/me',
    invite:'/api/social/friends/invite',
    redeem:'/api/social/friends/redeem',
    friends:'/api/social/friends',
    cheer:'/api/social/cheer',
    evidence:'/api/social/rank/evidence',
    boardFriends:'/api/social/rank/board/friends',
    boardLeague:'/api/social/rank/board/league',
    optout:'/api/social/rank/optout'
  });
  // Enum stiker sorakan (token mesin dari server; emoji + label urusan sini).
  var STICKERS=Object.freeze([
    Object.freeze({id:'clap',emoji:'\uD83D\uDC4F',label:t('social.sticker-1', 'Gaskeun!')}),
    Object.freeze({id:'fire',emoji:'\uD83D\uDD25',label:t('social.sticker-2', 'Rata!')}),
    Object.freeze({id:'gem',emoji:'\uD83D\uDC8E',label:t('social.sticker-3', 'Kinclong!')}),
    Object.freeze({id:'target',emoji:'\uD83C\uDFAF',label:t('social.sticker-4', 'Tepat sasaran!')}),
    Object.freeze({id:'sunrise',emoji:'\uD83C\uDF05',label:t('social.sticker-5', 'Pagi amat!')}),
    Object.freeze({id:'finish',emoji:'\uD83C\uDFC1',label:t('social.sticker-6', 'Finis!')})
  ]);
  // Enum kind evidence yang dikenal server (PB dihitung server, bukan di sini).
  var EVIDENCE_KINDS=Object.freeze(['meaningful_day','daily_target','lesson_mastered','srs_review','exam_passed','book_finished','weekly_mission']);
  var MILESTONE_LABELS=Object.freeze({
    meaningful_day:t('social.milestone-meaningful-day', 'Belajar bermakna'),
    daily_target:t('social.milestone-daily-target', 'Target harian tercapai'),
    lesson_mastered:t('social.milestone-lesson-mastered', 'Menguasai lesson baru'),
    srs_review:t('social.milestone-srs-review', 'Menyelesaikan pengulangan'),
    exam_passed:t('social.milestone-exam-passed', 'Lulus ujian level'),
    book_finished:t('social.milestone-book-finished', 'Menamatkan buku'),
    weekly_mission:t('social.milestone-weekly-mission', 'Menyelesaikan misi mingguan')
  });
  // Blocklist klien = subset kecil anti-peniruan; daftar penuh milik server.
  var HANDLE_BLOCKLIST=Object.freeze(['fiezel','admin','official','owner','moderator']);
  var OUTBOX_KEY='fiezel-social-outbox-v1';
  var OUTBOX_MAX=40;              // antrean lebih panjang dari ini = ada yang salah; buang yang tertua
  var OUTBOX_MAX_AGE_MS=3*86400000; // >2 hari lampau ditolak server (DAY_SKEW_DAYS) — 3 hari = sudah pasti hangus
  var CFG_TTL_MS=300000;          // cermin flag sosial 5 menit, pola cermin kill switch
  var WIB_OFFSET_MS=7*3600000;    // WIB = UTC+7 tetap, tanpa DST — aman dihitung manual

  // ---------------------------------------------------------------- util dasar
  function baseUrl(){
    try{
      var cfg=root.FIEZEL_CF_CONFIG||{};
      var base=String(cfg.base||'').trim().replace(/\/$/,'');
      return base;
    }catch(_){return ''}
  }
  function online(){try{return !(root.navigator&&root.navigator.onLine===false)}catch(_){return true}}
  function uuid(){
    try{if(root.crypto&&typeof root.crypto.randomUUID==='function')return root.crypto.randomUUID()}catch(_){/* jatuh ke bawah */}
    // Fallback: tetap memenuhi kontrak jti server 8–64 char [A-Za-z0-9_-].
    var s='',t=Date.now().toString(36);
    while(s.length<20)s+=Math.random().toString(36).slice(2);
    return ('jti-'+t+'-'+s).slice(0,64).replace(/[^A-Za-z0-9_-]/g,'');
  }
  // Hari WIB 'YYYY-MM-DD' — kunci `day` evidence. Offset tetap, bukan Intl: WIB tanpa DST.
  function wibDay(nowMs){
    var t=Number(nowMs);if(!isFinite(t))t=Date.now();
    return new Date(t+WIB_OFFSET_MS).toISOString().slice(0,10);
  }
  // Senin pekan berjalan versi WIB — kunci cache papan (`week` di respons server).
  function wibWeekMonday(nowMs){
    var t=Number(nowMs);if(!isFinite(t))t=Date.now();
    var d=new Date(t+WIB_OFFSET_MS);
    var dow=(d.getUTCDay()+6)%7; // Senin=0
    d.setUTCDate(d.getUTCDate()-dow);
    return d.toISOString().slice(0,10);
  }
  // Sisa waktu menuju Senin 00:00 WIB berikutnya (reset liga), dalam ms + label ramah.
  function leagueCountdown(nowMs){
    var t_val=Number(nowMs);if(!isFinite(t_val))t_val=Date.now();
    var w=t_val+WIB_OFFSET_MS;
    var d=new Date(w);
    var dow=(d.getUTCDay()+6)%7;
    var startToday=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
    var nextMonday=startToday+(7-dow)*86400000;
    var ms=Math.max(0,nextMonday-w);
    var days=Math.floor(ms/86400000),hours=Math.floor(ms%86400000/3600000),minutes=Math.floor(ms%3600000/60000);
    var label=days>0?t('social.countdown-days', days+' hari '+hours+' jam lagi', {days:days, hours:hours}):hours>0?t('social.countdown-hours', hours+' jam '+minutes+' menit lagi', {hours:hours, minutes:minutes}):t('social.countdown-minutes', Math.max(1,minutes)+' menit lagi', {minutes:Math.max(1,minutes)});
    return {ms:ms,days:days,hours:hours,minutes:minutes,label:label};
  }

  // ---------------------------------------------------------------- validasi handle
  /**
   * Cermin klien HANDLE_RULES server. Mengembalikan {ok:boolean, reason:string} —
   * reason SUDAH berbahasa manusia supaya UI tinggal menaruhnya di bawah kolom input.
   * Input di-lowercase dulu (keunikan server case-insensitive).
   */
  function validateHandle(raw){
    var h=String(raw==null?'':raw).trim().toLowerCase();
    if(!h)return {ok:false,handle:h,reason:t('social.validate-empty', 'Tulis dulu nama samarannya.')};
    if(h.length<3)return {ok:false,handle:h,reason:t('social.validate-too-short', 'Kependekan — minimal 3 karakter.')};
    if(h.length>20)return {ok:false,handle:h,reason:t('social.validate-too-long', 'Kepanjangan — maksimal 20 karakter.')};
    if(!/^[a-z0-9_]+$/.test(h))return {ok:false,handle:h,reason:t('social.validate-chars', 'Hanya huruf kecil a-z, angka, dan garis bawah (_).')};
    if(!/^[a-z]/.test(h))return {ok:false,handle:h,reason:t('social.validate-start', 'Mulai dengan huruf, bukan angka atau _.')};
    if(h.indexOf('__')>=0)return {ok:false,handle:h,reason:t('social.validate-double-underscore', 'Garis bawah ganda (__) tidak boleh.')};
    if(/_$/.test(h))return {ok:false,handle:h,reason:t('social.validate-end-underscore', 'Jangan diakhiri garis bawah.')};
    if(/[0-9]{6,}/.test(h))return {ok:false,handle:h,reason:t('social.validate-phone-like', 'Deret angka panjang mirip nomor HP — demi keamananmu, itu tidak boleh.')};
    for(var i=0;i<HANDLE_BLOCKLIST.length;i++)if(h.indexOf(HANDLE_BLOCKLIST[i])>=0)return {ok:false,handle:h,reason:t('social.validate-impersonation', 'Nama itu terkesan akun resmi — pilih yang lain ya.')};
    return {ok:true,handle:h,reason:''};
  }

  // ---------------------------------------------------------------- label enum → Indonesia
  function stickerMeta(id){
    for(var i=0;i<STICKERS.length;i++)if(STICKERS[i].id===id)return STICKERS[i];
    return null;
  }
  /** Kartu teman server → label presence Indonesia. HANYA granularitas hari (spec §3.3). */
  function presenceLabel(friend){
    if(!friend||friend.visible===false)return t('social.presence-hidden', 'Progresnya disembunyikan');
    if(friend.studiedToday===true)return t('social.presence-active', 'Belajar hari ini \u2713');
    return t('social.presence-inactive', 'Belum belajar hari ini');
  }
  function milestoneLabel(kind){return MILESTONE_LABELS[kind]||t('social.milestone-default', 'Pencapaian baru')}

  // ---------------------------------------------------------------- galat → kalimat ramah
  /** Kode `data.error` server → kalimat Indonesia. retryAfter (detik) opsional untuk 429. */
  function errorCopy(code,retryAfter){
    switch(String(code||'')){
      case 'social_disabled':return t('social.error-social-disabled', 'Fitur online belum aktif. Semua belajarmu tetap jalan seperti biasa.');
      case 'profile_required':return t('social.error-profile-required', 'Buat dulu profil online-mu untuk memakai fitur ini.');
      case 'profile_exists':return t('social.error-profile-exists', 'Kamu sudah punya profil online.');
      case 'handle_taken':return t('social.error-handle-taken', 'Nama itu sudah dipakai orang lain — coba variasi lain.');
      case 'schema_invalid':return t('social.error-schema-invalid', 'Isian belum sesuai aturan. Periksa lagi ya.');
      case 'code_invalid':return t('social.error-code-invalid', 'Kode tidak berlaku. Minta kode baru dari temanmu.');
      case 'limit_reached':return t('social.error-limit-reached', 'Batas tercapai. Tunggu kode lama kedaluwarsa atau coba lagi nanti.');
      case 'rate_limited':return retryAfter?t('social.error-rate-limited-with-retry', 'Pelan-pelan dulu ya — coba lagi dalam '+Math.max(1,Math.ceil(Number(retryAfter)/60))+' menit.', {minutes:Math.max(1,Math.ceil(Number(retryAfter)/60))}):t('social.error-rate-limited', 'Pelan-pelan dulu ya — coba lagi sebentar lagi.');
      case 'unavailable':return t('social.error-unavailable', 'Server sedang tidak bisa dihubungi. Coba lagi nanti.');
      case 'offline':return t('social.error-offline', 'Kamu sedang offline. Fitur online menunggu koneksi — belajarmu tetap aman.');
      case 'unauthorized':return t('social.error-unauthorized', 'Sesi online-mu belum siap. Coba buka lagi halaman ini.');
      default:return t('social.error-default', 'Ada yang belum beres di jalur online. Belajarmu tidak terganggu — coba lagi nanti.');
    }
  }

  // ---------------------------------------------------------------- flag sosial (fail-closed)
  // Status: 'on' | 'off' | 'offline' | 'unknown'. `cfSocialEnabled` TIDAK ikut daftar enam
  // flag kill switch app.js (daftar itu tertutup dan diuji gerbang), jadi modul ini membaca
  // /api/config sendiri — sekali per 5 menit, di luar jalur boot, tanpa cookie.
  var flagState={status:'unknown',at:0};
  function flagFresh(){return flagState.at>0&&(Date.now()-flagState.at)<CFG_TTL_MS}
  function socialFlag(){return flagState.status}
  async function probeFlag(force){
    if(!force&&flagFresh())return flagState.status;
    if(!online()){flagState={status:'offline',at:Date.now()};return 'offline'}
    var base=baseUrl();
    if(!base){flagState={status:'off',at:Date.now()};return 'off'}
    try{
      var r=await fetch(base+API_PATHS.config,{method:'GET',cache:'no-store',mode:'cors',credentials:'omit'});
      if(!r||!r.ok){flagState={status:'off',at:Date.now()};return 'off'}
      var data=await r.json();
      // Hanya `=== true` yang berarti hidup — flag absen/ambigu = mati (fail-closed).
      var on=data&&data.flags&&data.flags.cfSocialEnabled===true;
      flagState={status:on?'on':'off',at:Date.now()};
      return flagState.status;
    }catch(_){flagState={status:online()?'off':'offline',at:Date.now()};return flagState.status}
  }

  // ---------------------------------------------------------------- klien API
  var anonReady=false;
  /** POST /api/auth/anon sekali per sesi — menerbitkan cookie fz_id bila belum ada. */
  async function ensureAnon(){
    if(anonReady)return true;
    var base=baseUrl();if(!base)return false;
    try{
      var r=await fetch(base+API_PATHS.anon,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',credentials:'include',mode:'cors',cache:'no-store'});
      anonReady=!!(r&&(r.ok||r.status===409));
      return anonReady;
    }catch(_){return false}
  }
  /**
   * Satu pintu semua panggilan sosial. Jawaban SERAGAM dan tidak pernah melempar:
   * {ok:boolean, status:number, data:object|null, error:string, message:string}.
   * `message` sudah kalimat Indonesia siap tampil.
   */
  async function call(path,body,method){
    if(!online())return {ok:false,status:0,data:null,error:'offline',message:errorCopy('offline')};
    var base=baseUrl();
    if(!base)return {ok:false,status:0,data:null,error:'social_disabled',message:errorCopy('social_disabled')};
    var m=method||(body===undefined?'GET':'POST');
    var opts={method:m,credentials:'include',mode:'cors',cache:'no-store'};
    if(m!=='GET'){opts.headers={'Content-Type':'application/json'};opts.body=JSON.stringify(body||{})}
    try{
      var r=await fetch(base+path,opts);
      var data=null;try{data=await r.json()}catch(_){data=null}
      if(r.ok)return {ok:true,status:r.status,data:data,error:'',message:''};
      var code=data&&data.error?String(data.error):(r.status===401?'unauthorized':r.status===403?'social_disabled':r.status===503?'unavailable':'unknown');
      // 401 = cookie belum ada; terbitkan sekali lalu ulang SEKALI (bukan loop).
      if(r.status===401&&!anonReady){
        if(await ensureAnon())return call(path,body,method);
      }
      return {ok:false,status:r.status,data:data,error:code,message:errorCopy(code,data&&data.retryAfter)};
    }catch(_){
      return {ok:false,status:0,data:null,error:online()?'unavailable':'offline',message:errorCopy(online()?'unavailable':'offline')};
    }
  }

  var api=Object.freeze({
    profileMe:function(){return call(API_PATHS.profileMe)},
    profileCheck:function(handle){return call(API_PATHS.profileCheck,{handle:String(handle||'').toLowerCase()})},
    profileCreate:function(payload){return call(API_PATHS.profileCreate,payload)},
    invite:function(){return call(API_PATHS.invite,{})},
    redeem:function(code){return call(API_PATHS.redeem,{code:String(code||'').trim()})},
    friends:function(){return call(API_PATHS.friends)},
    cheer:function(handle,sticker){return call(API_PATHS.cheer,{handle:String(handle||''),sticker:String(sticker||'')})},
    boardFriends:function(){return call(API_PATHS.boardFriends)},
    boardLeague:function(){return call(API_PATHS.boardLeague)},
    optout:function(hidden){return call(API_PATHS.optout,{hidden:hidden===true})}
  });

  // ---------------------------------------------------------------- outbox bukti (offline-first)
  // Bentuk item: {jti, day, events:[{kind,count?,band?}], at}. jti disimpan BERSAMA item
  // supaya retry offline idempoten: server menjawab replay dengan {accepted:0} — aman.
  function outboxRead(){
    try{
      var raw=root.localStorage?root.localStorage.getItem(OUTBOX_KEY):null;
      if(!raw)return [];
      var box=JSON.parse(raw);
      return Array.isArray(box)?box:[];
    }catch(_){return []}
  }
  function outboxWrite(items){
    try{root.localStorage&&root.localStorage.setItem(OUTBOX_KEY,JSON.stringify(items.slice(-OUTBOX_MAX)))}catch(_){/* storage penuh = bukti sesi ini hangus, belajar tetap jalan */}
  }
  /** Buang item yang sudah pasti hangus di server (lewat 3 hari / bentuk rusak). */
  function outboxPrune(items,nowMs){
    var t=Number(nowMs);if(!isFinite(t))t=Date.now();
    var out=[];
    for(var i=0;i<items.length;i++){
      var it=items[i];
      if(!it||!it.jti||!Array.isArray(it.events)||!it.events.length)continue;
      if(t-Number(it.at||0)>OUTBOX_MAX_AGE_MS)continue;
      out.push(it);
    }
    return out;
  }
  /**
   * Antrekan satu batch bukti. events = [{kind, count?, band?}] — kind di luar enum
   * DIBUANG di sini (server 400-kan seluruh batch untuk kind asing; lebih baik disaring).
   * Tidak pernah melempar; mengembalikan item yang di-antre atau null.
   */
  function queueEvidence(events,nowMs){
    try{
      var t=Number(nowMs);if(!isFinite(t))t=Date.now();
      var clean=[];
      for(var i=0;i<(Array.isArray(events)?events.length:0)&&clean.length<20;i++){
        var e=events[i];
        if(!e||EVIDENCE_KINDS.indexOf(e.kind)<0)continue;
        var item={kind:e.kind};
        if(e.count!=null){var c=Math.max(1,Math.min(20,Math.floor(Number(e.count)||1)));item.count=c}
        if(e.band&&/^[ABC][12]$/.test(String(e.band)))item.band=String(e.band);
        clean.push(item);
      }
      if(!clean.length)return null;
      var entry={jti:uuid(),day:wibDay(t),events:clean,at:t};
      var box=outboxPrune(outboxRead(),t);
      box.push(entry);
      outboxWrite(box);
      return entry;
    }catch(_){return null}
  }
  var flushing=false;
  /**
   * Kirim isi outbox berurutan. Aturan buang:
   *   - 200 (ack server, termasuk accepted:0 = replay/cap penuh) → buang;
   *   - 400 schema_invalid → buang (batch beracun tidak boleh menyumbat antrean);
   *   - galat lain (offline, 401/403/404/5xx) → SIMPAN, coba lagi nanti — diam-diam.
   * Tidak pernah melempar; UI tidak pernah menunggu fungsi ini.
   */
  async function flushOutbox(nowMs){
    if(flushing)return {sent:0,kept:outboxRead().length,reason:'busy'};
    if(!online())return {sent:0,kept:outboxRead().length,reason:'offline'};
    flushing=true;
    var sent=0;
    try{
      var box=outboxPrune(outboxRead(),nowMs);
      outboxWrite(box);
      var keep=[];
      for(var i=0;i<box.length;i++){
        var it=box[i];
        var res=await call(API_PATHS.evidence,{jti:it.jti,day:it.day,events:it.events});
        if(res.ok){sent++;continue}                       // ack (accepted berapa pun) = tuntas
        if(res.status===400){continue}                    // batch beracun = buang diam
        keep.push(it);                                    // lainnya: coba lagi nanti
        if(res.error==='offline'||res.error==='unavailable'){for(var j=i+1;j<box.length;j++)keep.push(box[j]);break}
      }
      outboxWrite(keep);
      return {sent:sent,kept:keep.length,reason:''};
    }catch(_){return {sent:sent,kept:outboxRead().length,reason:'error'}}
    finally{flushing=false}
  }
  /**
   * Berapa batch yang masih menunggu kirim.
   *
   * `nowMs` OPSIONAL dan mencerminkan dua saudaranya tepat di atas — outboxPrune(items,nowMs)
   * dan flushOutbox(nowMs) — yang keduanya sudah menerima waktu suntikan. Fungsi ini satu-satunya
   * di modul yang dulu membaca jam langsung, dan justru itu yang membuat gerbangnya jadi BOM
   * WAKTU: social-frontend-test menstempel item dengan tanggal fiktif (2026-08-28) lalu
   * memeriksanya lewat fungsi yang membaca jam ASLI, jadi gerbangnya dijamin merah tepat tiga
   * hari sesudah tanggal fiktif itu — dan memang merah pada 2026-08-31T18:00:00Z, tanpa satu
   * baris kode pun berubah.
   *
   * Pemanggil tanpa argumen (app.js:9437) tidak berubah artinya: tanpa nowMs, jam dipakai
   * seperti dulu. Yang ditambah cuma kemampuan menyuntik waktu, sesuai kontrak modul ini.
   */
  function outboxPending(nowMs){
    var t=Number(nowMs);
    return outboxPrune(outboxRead(),isFinite(t)?t:Date.now()).length;
  }

  // Flush otomatis: saat kembali online dan saat tab kembali terlihat. Keduanya jalur
  // latar — tanpa await dari UI, tanpa toast, tanpa yang bisa mengganggu sesi belajar.
  function bindAutoFlush(){
    try{
      root.addEventListener&&root.addEventListener('online',function(){flushOutbox()});
      var doc=root.document;
      doc&&doc.addEventListener&&doc.addEventListener('visibilitychange',function(){
        try{if(doc.visibilityState==='visible')flushOutbox()}catch(_){/* diam */}
      });
    }catch(_){/* lingkungan tanpa event = tanpa auto-flush, antre tetap jalan manual */}
  }
  bindAutoFlush();

  // ---------------------------------------------------------------- ekspor
  root.FiezelSocial=Object.freeze({
    STICKERS:STICKERS,
    EVIDENCE_KINDS:EVIDENCE_KINDS,
    validateHandle:validateHandle,
    stickerMeta:stickerMeta,
    presenceLabel:presenceLabel,
    milestoneLabel:milestoneLabel,
    errorCopy:errorCopy,
    wibDay:wibDay,
    wibWeekMonday:wibWeekMonday,
    leagueCountdown:leagueCountdown,
    socialFlag:socialFlag,
    probeFlag:probeFlag,
    ensureAnon:ensureAnon,
    api:api,
    queueEvidence:queueEvidence,
    flushOutbox:flushOutbox,
    outboxPending:outboxPending,
    _outboxKey:OUTBOX_KEY
  });
})(typeof self!=='undefined'?self:this);
