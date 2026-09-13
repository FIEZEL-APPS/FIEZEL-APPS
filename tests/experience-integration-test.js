const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
require('./app-report-control-path-test.js');
const fs=require('fs'),path=require('path');
const root=__fzRoot;
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const app=read('app.js'),css=read('style.css'),html=read('index.html');
/* m025-307: `fiezel-report-worker.js`, `creator-report-setup.html`, dan
   `creator-report-dashboard.html` dihapus oleh migrasi Cloudflare (73cd02a2). Gerbang ini
   dulu membaca ketiganya. Setiap assert yang bergantung padanya diperiksa satu per satu,
   BUKAN dibuang bersama berkasnya - hasilnya di bawah. */
const evidenceCore=read('workers/api/evidence/evidence-core.js'),
      learnerCore=read('workers/api/evidence/learner-evidence-core.js'),
      routeEvidence=read('workers/api/evidence/route-evidence.js'),
      ownerWorker=read('workers/owner/index.js');
// AI-20 F06 (kategori 2a, UNION-CORPUS): naskah Indonesia boleh PINDAH byte-identik ke
// copy-map features/i18n/copy-id-*.js (dijaga tests/id-golden-snapshot-test.js). Literal naskah
// karena itu dicari di gabungan app.js + copy-map id; identifier kode tetap dicek di app.js.
// Glob yang kosong = perilaku lama, jadi cek ini hijau sebelum maupun sesudah ekstraksi.
const i18nDir=path.join(root,'features','i18n');
const copyIdCorpus=fs.existsSync(i18nDir)?fs.readdirSync(i18nDir).filter(n=>/^copy-id-.*\.js$/.test(n)).sort().map(n=>fs.readFileSync(path.join(i18nDir,n),'utf8')).join('\n'):'';
const idCorpus=app+'\n'+copyIdCorpus;
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};

check(html.includes('./lucide.min.js')&&html.indexOf('./lucide.min.js')<html.indexOf('./app.js'),'Lucide must load locally before app.js');
check(/function buildLearningSnapshot/.test(app)&&/function askCoachAI/.test(app)&&/aiProfileContext/.test(app),'AI skill-profile pipeline missing');
check(/function haptic/.test(app)&&/navigator\.vibrate/.test(app)&&/document\.addEventListener\?\.\('click'/.test(app),'Global haptic system missing');
check(/function playFeedbackSound/.test(app)&&/function answerFeedbackSignal/.test(app)&&/feedbackSounds:true/.test(app),'Correct/wrong answer sound feedback missing');
check(/id="answerBurst"/.test(html)&&/\.answer-burst/.test(css)&&/circle-check-big/.test(app)&&/circle-x/.test(app),'Animated answer popup missing');
check(/document\.startViewTransition/.test(app)&&/\.reduce-motion \*/.test(css),'Motion system or reduced-motion control missing');
check(/launcher-shell/.test(app)&&/launcher-shell/.test(css)&&/coach-preview/.test(css),'Premium launcher surface missing');
/* m025-246: pola lama memaku LIMA nama pertama VALID_VIEWS berikut URUTANNYA sebagai
   satu literal. Yang dijanjikan pemeriksaan ini bukan urutan itu - ia "rute Skills Lab
   ada, dan pengendalinya dibersihkan". Menyisipkan satu tujuan baru di awal himpunan
   (tab 'latihan') memerahkannya tanpa satu pun janji yang benar-benar dilanggar. Kini
   yang diuji KEANGGOTAAN: kelima rute wajib itu harus ada, di mana pun letaknya. */
{
  const set=/VALID_VIEWS=new Set\(\[([^\]]*)\]/.exec(app);
  const views=set?set[1].split(',').map(x=>x.trim().replace(/^'|'$/g,'')):[];
  const wajib=['home','vocab','grammar','reading','skills'];
  check(!!set&&wajib.every(v=>views.includes(v))&&/FiezelSLAddon\.create/.test(app)&&/speakingListeningController\.destroy/.test(app),
    'Skills Lab route or lifecycle cleanup missing'+(set?' (rute hilang: '+wajib.filter(v=>!views.includes(v)).join(', ')+')':' (VALID_VIEWS tidak terbaca)'));
}
check(/FiezelVoiceSay/.test(app)&&/Simpan untuk offline/.test(idCorpus)&&/Tidak ada yang perlu diunduh/.test(idCorpus),'m025-96: suara harus lewat pintu bersama, dan unduhan lokal hanya tambahan opsional');
check(html.includes('./features/speaking-listening/speaking-listening-addon.css')&&html.includes('./features/neural-voice/fiezel-voice-say.js'),'Feature assets are not wired into the document');
check(/LOGIN_MESSAGES=(?:\[|__fzI18nTable\(\[\])/.test(app)&&/* v49-F1 2026-08-29: wrapper i18n-refresh *//selectLoginMessage/.test(app)&&/fiezel-last-login-message/.test(app)&&/LEARNER_STAGE/.test(app),'Rotating learner-stage login reminders missing');
// OWNER MEMBALIK m025-34: notifikasi DIUNDANG, tidak diwajibkan. Yang diperiksa sekarang
// adalah undangan yang lengkap - ada tombol menerima, ada tombol menolak, dan tidak ada
// satu pun jalur yang memasang kunci badan halaman. Dulu baris ini justru menuntut
// kebalikannya ("Mandatory notification permission gate missing").
check(/requestStudyNotificationPermission/.test(app)&&/declineStudyNotifications/.test(app)&&/notificationPermission\(\)/.test(app)&&/id="notificationGateButton"/.test(html)&&/id="notificationGateSkip"/.test(html),'Notification invitation (ask + decline) missing');
check(!/classList\?\.add\?\.\('notification-locked'\)/.test(app),'nothing may lock the app for notifications again');
check(/\.notification-locked/.test(css),'kelas kunci lama sengaja dibiarkan di stylesheet: sesi lama masih bisa memegangnya sampai halaman dimuat ulang');
check(/checkStudyReminders/.test(app)&&/showStudyNotification/.test(app)&&/NOTIFICATION_REMINDER_INTERVAL_MS/.test(app)&&/notificationclick/.test(read('sw.js')),'Study reminder notification engine missing');
check(/function getCelestialState/.test(app)&&/function getScenePalette/.test(app)&&/SUNRISE_MINUTE/.test(app)&&/global-sky/.test(css)&&/sky-light/.test(css)&&/id="globalSky"/.test(html),'Full-screen real-time sun/moon cycle missing');
check(/GRAMMAR_SESSION_SIZE=25/.test(app)&&/function buildGrammarLessonQuestions/.test(app)&&/count:GRAMMAR_SESSION_SIZE/.test(app),'Grammar lesson contract is not fixed at 25 questions');
check(/NATURAL_AI_STYLE/.test(app)&&/Hindari gaya buku teks/.test(idCorpus)&&/readingFocusLabel/.test(app),'Natural Indonesian explanation contract missing');
check(/function buildCreatorReport/.test(app)&&/session_complete/.test(app)&&/daily_access/.test(app),'Automatic access/session reporting missing');
check(/queueCreatorReport/.test(app)&&/flushReportQueue/.test(app),'Report retry queue missing');
check(/reportConsent:false/.test(app)&&/openReportPreview/.test(app),'Explicit reporting consent/privacy preview missing');
/* Endpoint laporan dibatasi ke host Puter: MEKANISMENYA PENSIUN, invariannya tidak.
   Yang dijaga aslinya adalah "laporan murid tidak boleh dikirim ke host sembarangan".
   Penggantinya di app.js adalah validReportEndpoint(); itulah yang dituntut sekarang. */
check(/function validReportEndpoint/.test(app),'Report endpoint is not validated at all');

/* Batas ukuran + whitelist: PINDAH ke workers/api/evidence. Bentuknya berubah dari
   sanitizeReport()+MAX_BODY_BYTES di satu berkas menjadi LIMITS.MAX_BODY_BYTES +
   readBoundedJson() di lapis rute, tetapi yang dijaga sama - badan permintaan tidak boleh
   tak terbatas, dan isinya tidak boleh diterima apa adanya. */
check(/MAX_BODY_BYTES/.test(evidenceCore)&&/MAX_BODY_BYTES/.test(learnerCore),'Evidence size cap missing');
check(/readBoundedJson/.test(routeEvidence),'Evidence route does not bound the request body');

/* Penyimpanan owner-only: PINDAH ke workers/owner. `isOwner` + "Creator account required"
   + me.puter.kv jadi ownerGate() dengan inventaris rute default-deny - lebih kuat daripada
   yang lama, karena rute yang TIDAK terdaftar pun ditolak. */
check(/ownerGate\(\)/.test(ownerWorker)&&/OWNER_ROUTES/.test(ownerWorker),'Owner-only gating missing');

/* Ekspor CSV: PINDAH ke workers/owner sebagai /api/export/*.csv. */
check(/\/api\/export\/evidence\.csv/.test(ownerWorker),'Owner CSV export missing');

/* Deploy Worker satu-klik (puter.workers.create + puter.fs.write): SENGAJA PENSIUN bersama
   Puter, dan TIDAK diganti assert baru. Alasannya: mekanismenya spesifik Puter, dan
   penggantinya (deploy lewat wrangler di CI) bukan sesuatu yang bisa dijaga dari sisi klien.
   Dicatat di sini supaya hilangnya tidak terbaca sebagai kelalaian. */

const runtime=[html,app,evidenceCore,learnerCore,routeEvidence,ownerWorker,read('report-config.js')].join('\n');
check(!/(AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,})/.test(runtime),'Secret-like credential found in runtime files');
check(!/password\s*[:=]\s*['"][^'"]+['"]/i.test(runtime),'Hard-coded password found');

if(failures.length){
  console.error('FIEZEL experience integration: FAIL');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('FIEZEL experience integration: PASS');
console.log(JSON.stringify({aiSkillProfile:true,haptics:true,answerSounds:true,answerPopups:true,realtimeSky:true,grammarQuestionsPerLesson:25,naturalIndonesian:true,motion:true,creatorHub:true,rotatingLoginReminder:true,notificationsInvitedNotForced:true,studyReminderEngine:true,apiKeyBundled:false}));
