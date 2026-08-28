// m026-02 — gate untuk popup Puter: SEKALI per periode, dan NEVER di tengah sesi dengar.
//
// AKAR yang dijaga gate ini (reports/recon-puter.md §A dan §B):
//
//   1. Gerbang akun dipasang di setiap boot tanpa memori periode - presentPuterAuthGateIfNeeded()
//      dulu hanya memeriksa puterAuthAvailable() dan puterSignedIn(), jadi murid yang belum mau
//      login menghadapi panel penuh layar yang sama setiap kali membuka aplikasi.
//   2. Dialog "upgrade" milik SDK js.puter.com muncul SATU PER PANGGILAN yang kandas dengan 402,
//      dan tiap item listening adalah skrip unik - satu sesi 10 item bisa memunculkan 10 dialog.
//      Obatnya adalah memo per-sesi di mesin suara plus SATU pemberitahuan FIEZEL sendiri yang
//      ditunda ke luar sesi.
//
// Karena itu yang diuji di sini adalah KEPUTUSANNYA, bukan tampilannya: shouldPresentPuterPopup()
// dijalankan sungguhan di dalam vm dengan jam palsu dan store palsu. Regex saja tidak cukup -
// temuan aslinya justru berupa kode yang MENYEBUT gerbang dan terlihat benar dari luar,
// sementara yang tidak ada adalah penekanannya. Hanya eksekusi yang bisa membedakan keduanya.
//
// Tidak ada DOM, storage nyata, jaringan, maupun boot aplikasi yang dilibatkan.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details });
  if (!ok) failed = true;
};

function sourceBlock(name, source = app) {
  const start = source.search(new RegExp(`(?:function|async function)\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}

/* ---- konstanta bernama ------------------------------------------------------------------ */

const periodMatch = app.match(/const\s+PUTER_POPUP_PERIOD_MS\s*=\s*([0-9_]+)/);
const PERIOD = periodMatch ? Number(String(periodMatch[1]).replace(/_/g, '')) : NaN;
check(
  'Periode popup adalah konstanta bernama yang berhingga dan positif',
  Number.isFinite(PERIOD) && PERIOD > 0,
  `PUTER_POPUP_PERIOD_MS=${periodMatch ? periodMatch[1] : 'missing'}`
);

const lastKeyMatch = app.match(/const\s+PUTER_POPUP_LAST_KEY\s*=\s*'([^']+)'/);
const LAST_KEY = lastKeyMatch ? lastKeyMatch[1] : '';
check(
  'Kunci penyimpanan popup adalah konstanta bernama',
  !!LAST_KEY,
  `PUTER_POPUP_LAST_KEY=${LAST_KEY || 'missing'}`
);

/* ---- fungsi keputusan murni, dijalankan sungguhan ---------------------------------------- */

const decisionBlock = sourceBlock('shouldPresentPuterPopup');
const markBlock = sourceBlock('markPuterPopupShown');
check(
  'shouldPresentPuterPopup() dan markPuterPopupShown() bisa di-extract dari app.js',
  !!decisionBlock && !!markBlock,
  [decisionBlock ? '' : 'shouldPresentPuterPopup', markBlock ? '' : 'markPuterPopupShown'].filter(Boolean).join(', ') || 'keduanya ditemukan'
);
// Kegagalan extraction adalah FAIL, bukan SKIP: gate yang diam-diam hijau lebih buruk
// daripada gate yang merah, karena ia menghapus perlindungannya tanpa memberi tahu siapa pun.
if (!decisionBlock || !markBlock) {
  const report = { schema: 'fiezel-puter-popup-once-v1', generatedAt: new Date().toISOString(), pass: false, checks };
  fs.writeFileSync(path.join(root, 'PUTER-POPUP-ONCE-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = 1;
  return;
}

// Jam palsu: `now` adalah angka yang dimajukan manual. Waktu HARUS datang dari parameter,
// jadi block keputusannya tidak boleh memanggil Date.now() sendiri.
check(
  'Keputusan tidak memanggil Date.now() sendiri - waktu datang dari parameter',
  !/Date\.now\(/.test(decisionBlock),
  'jam yang bocor membuat "sekali per periode" tidak bisa diuji dan tidak bisa dipercaya'
);

const store = new Map();
const fakeStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); }
};
const sandbox = { PUTER_POPUP_PERIOD_MS: PERIOD, PUTER_POPUP_LAST_KEY: LAST_KEY };
vm.createContext(sandbox);
vm.runInContext(`${decisionBlock}\n${markBlock}\n`, sandbox, { timeout: 2000 });
sandbox.__store = fakeStorage;
const decide = ctx => vm.runInContext(`shouldPresentPuterPopup(${JSON.stringify(ctx)})`, sandbox, { timeout: 1000 });
const mark = now => vm.runInContext(`markPuterPopupShown(${JSON.stringify(now)},__store)`, sandbox, { timeout: 1000 });
const lastShown = () => fakeStorage.getItem(LAST_KEY);

const T0 = 1772000000000;

// Q1 — panggilan eligible pertama tampil.
check(
  'Q1 panggilan eligible pertama menampilkan popup',
  decide({ now: T0, lastShownAt: null, signedIn: false, listeningActive: false }) === true,
  'lastShownAt null berarti belum pernah ditampilkan'
);

// Q2 — sekali per periode. markPuterPopupShown() menulis lewat store yang di-inject.
mark(T0);
check(
  'Q2 timestamp ditulis ke store yang di-inject, bukan ke localStorage nyata',
  Number(lastShown()) === T0,
  `store[${LAST_KEY}]=${lastShown()}`
);
check(
  'Q2 popup kedua di dalam periode yang sama ditolak',
  decide({ now: T0 + PERIOD - 1, lastShownAt: Number(lastShown()), signedIn: false, listeningActive: false }) === false,
  'satu milidetik sebelum periode berakhir masih periode yang sama'
);

// Q3 — periode baru membuka lagi.
check(
  'Q3 periode baru membuka popup lagi',
  decide({ now: T0 + PERIOD, lastShownAt: Number(lastShown()), signedIn: false, listeningActive: false }) === true,
  'batasnya inklusif: tepat satu periode sudah lewat'
);

// Q4 — sesi listening aktif selalu menekan popup, betapapun lama periodenya sudah lewat.
// Inilah aturan yang membuat murid tidak pernah dipotong di tengah item listening.
const beforeSuppressed = lastShown();
check(
  'Q4 sesi listening aktif menekan popup meski periode sudah lewat',
  decide({ now: T0 + 2 * PERIOD, lastShownAt: Number(lastShown()), signedIn: false, listeningActive: true }) === false,
  'popup tidak boleh memotong sesi dengar'
);

// Q5 — penekanan saat listening TIDAK mengonsumsi jatah periode: jalur tolak tidak menulis
// timestamp apa pun, jadi begitu sesi selesai popupnya masih berhak muncul.
check(
  'Q5 penekanan saat listening tidak mengonsumsi jatah periode',
  lastShown() === beforeSuppressed &&
  decide({ now: T0 + 2 * PERIOD, lastShownAt: Number(lastShown()), signedIn: false, listeningActive: false }) === true,
  `timestamp tetap ${lastShown()} setelah jalur tolak`
);

// Q6 — akun tersambung: tidak ada yang perlu ditawarkan, pada kombinasi apa pun.
const signedInCombos = [
  { now: T0, lastShownAt: null, signedIn: true, listeningActive: false },
  { now: T0 + 5 * PERIOD, lastShownAt: T0, signedIn: true, listeningActive: false },
  { now: T0 + 5 * PERIOD, lastShownAt: null, signedIn: true, listeningActive: true }
];
check(
  'Q6 akun yang sudah tersambung tidak pernah melihat popup',
  signedInCombos.every(ctx => decide(ctx) === false),
  `${signedInCombos.length} kombinasi diuji`
);

// Q7 — lastShownAt korup tidak boleh melempar; ia berperilaku seperti "belum pernah".
let corruptThrew = false;
let corruptResults = [];
try {
  corruptResults = [
    decide({ now: T0, lastShownAt: 'abc', signedIn: false, listeningActive: false }),
    decide({ now: T0, lastShownAt: -5, signedIn: false, listeningActive: false }),
    decide({ now: T0, lastShownAt: undefined, signedIn: false, listeningActive: false })
  ];
} catch (_) { corruptThrew = true; }
check(
  'Q7 lastShownAt korup diperlakukan seperti null dan tidak melempar',
  !corruptThrew && corruptResults.length === 3 && corruptResults.every(v => v === true),
  `hasil=${JSON.stringify(corruptResults)} threw=${corruptThrew}`
);

// Q8 — statis: penolakan harus ada di PINTUNYA, bukan hanya tersedia sebagai fungsi.
const gateBlocks = `${sourceBlock('presentPuterAuthGateIfNeeded')}\n${sourceBlock('armPuterAuthGate')}`;
check(
  'Q8 gerbang akun berkonsultasi ke shouldPresentPuterPopup( dan tahu sesi dengar',
  /shouldPresentPuterPopup\(/.test(gateBlocks) &&
  (/speakingListeningController/.test(gateBlocks) || /puterListeningActive\(/.test(gateBlocks)) &&
  /speakingListeningController/.test(sourceBlock('puterListeningActive')),
  'gerbang yang tidak berkonsultasi akan kembali muncul di setiap boot'
);

// Q9 — kunci popup BUKAN kunci progres. Kalau ia berprefix kunci state, membersihkan
// catatan popup berarti menghapus bukti belajar - kerusakan yang jauh lebih besar.
const progressKeys = ['fiezel-v4-state', 'fiezel-v5-state:', 'fiezel-v5-legacy-owner'];
check(
  'Q9 kunci popup bukan (dan tidak berprefix) kunci progres',
  !!LAST_KEY && progressKeys.every(k => LAST_KEY !== k && !LAST_KEY.startsWith(k)),
  `PUTER_POPUP_LAST_KEY=${LAST_KEY} vs ${progressKeys.join(', ')}`
);

/* ---- jalan keluar & jalan masuk kembali (akar §A: gerbang tanpa pintu keluar) ------------ */

check(
  'Panel gerbang punya tombol sekunder "Lanjut tanpa akun"',
  /id="authGateSkip"[^>]*onclick="skipPuterSignIn\(\)"/.test(html) && /Lanjut tanpa akun/.test(html),
  'tanpa tombol ini, murid yang tidak mau login terkurung di balik .auth-locked'
);
const skipBlock = sourceBlock('skipPuterSignIn');
check(
  'skipPuterSignIn() melepas kunci body DAN menulis penanda persisten',
  /classList\?\.remove\?\.\('auth-locked'\)|classList\.remove\('auth-locked'\)/.test(skipBlock) &&
  /PUTER_AUTH_SKIP_KEY/.test(skipBlock),
  'melepas kunci tanpa penanda berarti gerbangnya balik lagi di boot berikutnya'
);
check(
  'Gerbang menghormati penanda lewat',
  /puterAuthSkipped\(\)/.test(sourceBlock('presentPuterAuthGateIfNeeded')),
  'penanda yang tidak dibaca sama dengan tidak ada penanda'
);
check(
  'Jalan masuk kembali ada di Pengaturan (Akun Puter)',
  /accountSignIn/.test(sourceBlock('accountSettingsMarkup')) &&
  /accountSignIn/.test(sourceBlock('bindAccountSettingControls')) &&
  /PUTER_AUTH_SKIP_KEY/.test(sourceBlock('runPuterSignInFromSettings')),
  'jalan keluar tanpa jalan masuk kembali adalah jalan buntu yang lain'
);

/* ---- memo kredit: berhenti memanggil, jangan menebak naskah galat ------------------------ */

const voice = fs.readFileSync(path.join(root, 'features/neural-voice/fiezel-puter-voice.js'), 'utf8');
const say = fs.readFileSync(path.join(root, 'features/neural-voice/fiezel-voice-say.js'), 'utf8');
const addon = fs.readFileSync(path.join(root, 'features/speaking-listening/fiezel-speaking-listening-addon.js'), 'utf8');

check(
  'Deteksi kredit habis TERSTRUKTUR (402 / code insufficient), bukan menebak naskah pesan',
  /=== ?402|== ?402/.test(voice) && /insufficient_funds/.test(voice) &&
  !/message[\s\S]{0,40}indexOf\(['"](?:insufficient|credit|upgrade)/i.test(voice),
  'menebak dari naskah pesan akan diam-diam salah pada hari Puter mengubah kalimatnya'
);
check(
  'Memo kredit menghentikan panggilan SDK berikutnya di dalam render()',
  /if \(creditExhausted\) return Promise\.reject\(outOfCreditError\(\)\);/.test(voice) &&
  voice.indexOf('if (creditExhausted)') < voice.indexOf('p.ai.txt2speech'),
  'dialog SDK lahir dari panggilan; satu-satunya cara memadamkannya adalah tidak memanggil lagi'
);
check(
  'Singgah simpan tetap diperiksa lebih dulu, jadi audio gratis tidak ikut dibisukan',
  voice.indexOf('state.cacheHits++') < voice.indexOf('if (creditExhausted)'),
  'memo tidak boleh membisukan kalimat yang sudah ada di cache'
);
check(
  'Pintu bicara melewati Puter saat memo menyala dan langsung ke suara perangkat',
  /creditStatus\(\)/.test(say) && /credit\.outOfCredit\) return speakWithLocal\(/.test(say),
  'fallback harus terjadi TANPA memicu dialog SDK sekali pun'
);
check(
  'Pemberitahuan FIEZEL diantrikan, lalu dikonsumsi HANYA di ujung sesi',
  /consumeCreditNotice/.test(voice) &&
  /consumeCreditNotice/.test(sourceBlock('maybePresentPuterCreditNotice')) &&
  /onSessionEnd:\(\)=>\{try\{maybePresentPuterCreditNotice\(\)/.test(app) &&
  /notifySessionEnd\('exit'\)/.test(addon) && /notifySessionEnd\('complete'\)/.test(addon),
  'renderComplete()/exit() adalah dua satu-satunya cara sesi berakhir'
);
/* A8 (naskah + aksesibilitas) MENGUBAH tiga hal yang dulu diperiksa di sini, dan assert-nya
   ikut berubah bersama naskahnya — bukan dilonggarkan:
     - judul "Kredit AI Puter kamu habis" menyebut nama layanan mesin. Kanon naskah murid
       melarangnya (istilah teknis: nama mesin), dan nama itu juga bukan sesuatu yang bisa
       diperbaiki murid. Judulnya kini datang dari features/quota/quota-copy.js.
     - "Pelajari opsi upgrade" adalah TAUTAN <a> ke halaman pemakaian berbayar. Itu permukaan
       bayar di panel jatah; `paymentEnabled=false` ditegakkan sebagai KETIADAAN elemen. Jadi
       yang diperiksa sekarang justru KEBALIKANNYA: tautan itu harus HILANG.
     - yang TETAP dijaga persis seperti dulu: pemberitahuannya milik FIEZEL (bukan dialog SDK),
       ia nggak pernah memanggil requestUpgrade, dan ia tetap mengatakan aplikasinya jalan
       penuh tanpa bayar apa pun.
   Naskah lengkapnya sekarang punya gerbangnya sendiri: quota-notice-a11y-test.js. */
/* AI-20 F06 (W1-TESTPLAN 2a): tombol 'Oke, lanjut belajar' adalah naskah murid — ia boleh
   PINDAH byte-identik dari app.js ke copy-map features/i18n/copy-id-*.js (id-golden-snapshot
   menjaga byte-nya). Literal itu dicari di UNION app.js + copy-id; glob kosong hari ini =
   perilaku persis seperti sebelum ekstraksi. Call-site presentQuotaNotice dan larangan
   permukaan bayar tetap diperiksa pada app.js. */
const i18nDir = path.join(root, 'features', 'i18n');
const copyIdUnion = fs.existsSync(i18nDir)
  ? fs.readdirSync(i18nDir).filter((f) => /^copy-id-.*\.js$/.test(f)).sort()
      .map((f) => fs.readFileSync(path.join(i18nDir, f), 'utf8')).join('\n')
  : '';
check(
  'Pemberitahuan memakai copy FIEZEL sendiri, bukan dialog SDK, dan tanpa permukaan bayar',
  /presentQuotaNotice\(\{copyKey:'quota\.ai\.exhausted'/.test(app) &&
  /Oke, lanjut belajar/.test(app + '\n' + copyIdUnion) &&
  !/Pelajari opsi upgrade/.test(app) && !/puter\.com\/settings\/usage/.test(app) &&
  !/puter\.ui\.requestUpgrade/.test(app),
  'FIEZEL tetap jalan penuh tanpa bayar - naskahnya mengatakan itu, dan tautan berbayarnya hilang'
);

/* ---- ringkasan -------------------------------------------------------------------------- */

const report = {
  schema: 'fiezel-puter-popup-once-v1',
  generatedAt: new Date().toISOString(),
  pass: !failed,
  periodMs: PERIOD,
  storageKey: LAST_KEY,
  stateMachine: {
    Q1_first_eligible: true,
    Q2_within_period: false,
    Q3_next_period: true,
    Q4_listening_active: false,
    Q5_after_listening: true,
    Q6_signed_in: false,
    Q7_corrupt_last_shown: 'treated as null',
    Q8_gate_consults_decision: /shouldPresentPuterPopup\(/.test(gateBlocks),
    Q9_key_is_not_progress: !progressKeys.some(k => LAST_KEY.startsWith(k))
  },
  checks
};
fs.writeFileSync(path.join(root, 'PUTER-POPUP-ONCE-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
console.log(`\nFIEZEL m026-02 popup Puter sekali per periode: ${failed ? 'FAIL' : 'PASS'}`);
if (failed) process.exitCode = 1;
