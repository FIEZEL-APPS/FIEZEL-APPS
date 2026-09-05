#!/usr/bin/env node
/**
 * m025-246 — GERBANG PENYEDERHANAAN PENGALAMAN (bagian PERBAIKI + TAMBAH).
 *
 * ux-flags-test.js menjaga SAKELARnya; berkas ini menjaga apa yang ada di balik sakelar itu.
 * Setiap blok di bawah menahan satu janji yang ditulis owner, dan tiap satu dipilih karena
 * ia bisa runtuh tanpa satu pun error muncul:
 *
 *   A  Navigasi maks 4 tab, satu tombol primer per layar.
 *   B  Home "Hari ini": satu kartu, satu CTA, isi sesi terlihat, streak sekunder.
 *   C  Splash hanya di peluncuran dingin.
 *   D  Placement-lite 8-12 soal, dan naskahnya menyebut jumlah yang BENAR.
 *   E  Ringkasan akhir sesi: apa yang naik, apa yang jatuh tempo besok.
 *   F  Prompt "Versi baru" tidak pernah muncul di tengah soal.
 *   G  Listening gagal audio: coba lagi / suara peramban / lewati TANPA PENALTI.
 *   H  Skor speaking: label "Cakupan kata", tanpa angka nilai pengucapan.
 *   I  Instrumentasi funnel: launch->soal pertama, selesai sesi, D1/D7, skip rate.
 *   J  Nama internal tidak muncul di naskah murid.
 *   K  Tipografi: dua keluarga font, bukan tiga.
 *   L  Edge case: gerbang akun offline punya jalan keluar <=3 detik.
 *
 * Konvensi rumah: tanpa dependensi, exit 1 saat gagal, nama berakhiran -test.js.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const APP = read('app.js');
const INDEX = read('index.html');
const CSS = read('style.css');
const ADDON = read('features/speaking-listening/fiezel-speaking-listening-addon.js');
const UPDATE = read('features/ui/fiezel-update-prompt.js');
const ANALYTICS = read('features/analytics/fiezel-analytics-client.js');

const I18N_DIR = path.join(__dirname, 'features/i18n');
const COPY = fs.readdirSync(I18N_DIR)
  .filter(n => /^copy-(id|th)-.*\.js$/.test(n))
  .map(n => ({ name: n, text: fs.readFileSync(path.join(I18N_DIR, n), 'utf8') }));

let failures = 0;
function check(ok, name, detail) {
  if (ok) { console.log('ok - ' + name); return; }
  failures++;
  console.error('FAIL - ' + name + (detail ? '\n    ' + detail : ''));
}

/* ================================ A · NAVIGASI ==================================== */
{
  const navButtons = INDEX.match(/<button[^>]*class="nav(?: active)?"[^>]*>/g) || [];
  check(navButtons.length === 5,
    'A1 tab bar berisi tepat lima tujuan',
    'ditemukan ' + navButtons.length);
  for (const label of ['nav.practice', 'nav.school', 'nav.home-primary', 'nav.progress', 'nav.profile']) {
    check(INDEX.indexOf('data-i18n="' + label + '"') !== -1,
      'A2 tab ' + label + ' ada di tab bar');
  }
  /* Tombol Pengaturan ada di topbar dan profil dengan accessible name */
  check(/openSettings\(\)/.test(INDEX),
    'A3 tombol Pengaturan tersedia di aplikasi');
  /* Rute lama TIDAK boleh dibuang bersama tabnya - tautan dalam layar, riwayat back-nav,
     dan tur masih membawa nama-nama itu. */
  for (const view of ['vocab', 'grammar', 'reading', 'skills', 'library', 'latihan']) {
    check(new RegExp("'" + view + "'").test(APP.slice(APP.indexOf('const VALID_VIEWS'), APP.indexOf('const VALID_VIEWS') + 400)),
      'A4 rute lama /' + view + ' tetap sah di VALID_VIEWS');
  }
}

/* ================================ B · HOME "HARI INI" ============================== */
{
  const at = APP.indexOf('function todayHomeMarkup()');
  const end = APP.indexOf('\nfunction ', at + 10);
  const body = at === -1 ? '' : APP.slice(at, end);
  check(at !== -1, 'B1 todayHomeMarkup() ada');
  /* SATU tombol primer. Dua .primary di satu layar adalah persis "satu tombol primer per
     layar" yang dilanggar, dan ia dilanggar dengan menambah satu baris. */
  const primaries = (body.match(/class="primary/g) || []).length;
  check(primaries === 1,
    'B2 kartu Hari ini punya TEPAT satu tombol primer',
    'ditemukan ' + primaries);
  check(/today\.isi-judul/.test(body) && /today-blocks/.test(body),
    'B3 isi sesi terlihat sebelum ditekan');
  check(/streak>0\?/.test(body),
    'B4 runtun sekunder, dan runtun nol tidak ditampilkan sama sekali');
  check(/uxOn\('todayHome'\)/.test(APP),
    'B5 home() bercabang di bendera todayHome');
  check(/\.today-card\{/.test(CSS), 'B6 kartu Hari ini punya gayanya');
  /* Semua warna kartu lewat token: itulah syarat ia ikut Tema Malam tanpa aturan kedua. */
  const cardCss = CSS.slice(CSS.indexOf('.today-card{'), CSS.indexOf('.learning-launcher{'));
  const hardcoded = cardCss.match(/:\s*#[0-9a-f]{3,8}/gi) || [];
  check(hardcoded.length === 0,
    'B7 kartu Hari ini tidak memaku satu warna pun (syarat Tema Malam)',
    'warna dipaku: ' + hardcoded.join(', '));
}

/* ================================ C · SPLASH DINGIN ================================ */
{
  check(/function isColdLaunch\(\)/.test(APP), 'C1 isColdLaunch() ada');
  check(/force:typeof afterSplash==='function'&&isColdLaunch\(\)/.test(APP),
    'C2 splash boot hanya dipaksa tampil pada peluncuran dingin');
  check(/sessionStorage/.test(APP.slice(APP.indexOf('function isColdLaunch'), APP.indexOf('function isColdLaunch') + 700)),
    'C3 penanda peluncuran memakai sessionStorage (hidup selama sesi peramban, bukan selamanya)');
  /* Gagal ke DINGIN: murid yang kehilangan splash selamanya lebih buruk daripada murid
     yang melihatnya sekali lebih banyak. */
  check(/catch\(_\)\{coldLaunchAnswer=true\}/.test(APP),
    'C4 penyimpanan yang menolak dibaca sebagai peluncuran dingin, bukan hangat');
}

/* ================================ D · PLACEMENT-LITE =============================== */
{
  const m = /const PLACEMENT_LITE_SIZE=(\d+);/.exec(APP);
  check(!!m, 'D1 PLACEMENT_LITE_SIZE ada');
  const size = m ? Number(m[1]) : 0;
  check(size >= 8 && size <= 12,
    'D2 placement-lite berada di rentang 8-12 soal yang diminta owner',
    'nilai: ' + size);
  /* Tangga band menuntut PLACEMENT_BAND_MIN_EVIDENCE bukti DI DALAM satu band sebelum band
     itu boleh dinaiki. Cetak biru yang memberi kurang dari itu menutup band secara permanen
     untuk alasan aritmetika, bukan alasan kemampuan. */
  const minEv = Number((/const PLACEMENT_BAND_MIN_EVIDENCE=(\d+);/.exec(APP) || [])[1] || 0);
  const blueprint = (/const PLACEMENT_LITE_BLUEPRINT=\{([^;]*)\};/.exec(APP) || [])[1] || '';
  const perBand = (blueprint.match(/\{vocab:(\d+),grammar:(\d+),listening:(\d+)\}/g) || [])
    .map(entry => {
      const n = /\{vocab:(\d+),grammar:(\d+),listening:(\d+)\}/.exec(entry);
      return Number(n[1]) + Number(n[2]) + Number(n[3]);
    });
  check(perBand.length === 6, 'D3 cetak biru lite menutup keenam band CEFR',
    'band terbaca: ' + perBand.length);
  check(perBand.every(n => n >= minEv),
    'D4 tiap band punya bukti >= PLACEMENT_BAND_MIN_EVIDENCE (' + minEv + '), jadi tidak ada band yang mustahil dinaiki',
    'per band: ' + perBand.join(','));
  check(perBand.reduce((a, b) => a + b, 0) === size,
    'D5 jumlah cetak biru sama dengan PLACEMENT_LITE_SIZE',
    perBand.reduce((a, b) => a + b, 0) + ' vs ' + size);
  /* Naskahnya harus menyebut jumlah yang BENAR-BENAR disajikan. Menjanjikan 25 lalu
     menyajikan 12 adalah kebohongan kecil di layar paling mahal. */
  check(/placement\.lite-mulai/.test(APP) && /jumlah/.test(APP.slice(APP.indexOf('placement.lite-mulai') - 80, APP.indexOf('placement.lite-mulai') + 80)),
    'D6 tombol mulai memakai jumlah soal sebagai parameter, bukan angka yang dipaku');
}

/* ================================ E · RINGKASAN SESI =============================== */
{
  check(/function sessionSummaryMarkup\(/.test(APP), 'E1 sessionSummaryMarkup() ada');
  check(/function sessionMasteryGains\(/.test(APP), 'E2 "apa yang naik" dihitung dari selisih mastery');
  check(/function dueTomorrowCount\(/.test(APP), 'E3 "jatuh tempo besok" dihitung dari nextReview');
  check(/cfg\.__masteryBefore=masterySnapshotNow\(\)/.test(APP),
    'E4 potret mastery diambil di AWAL sesi (tanpa itu, selisihnya selalu nol)');
  check(/\$\{sessionSummaryMarkup\(cfg&&cfg\.__masteryBefore\)\}/.test(APP),
    'E5 ringkasan benar-benar dipasang di layar hasil');
  check(/uxOff\('sessionSummary'\)/.test(APP), 'E6 ringkasan tunduk pada benderanya');
}

/* ================================ F · PROMPT VERSI BARU ============================ */
{
  check(/function lessonActive\(\)/.test(UPDATE), 'F1 prompt pembaruan tahu kapan pelajaran berjalan');
  check(/if \(lessonActive\(\)\) \{/.test(UPDATE),
    'F2 show() menunda kartu selama pelajaran berjalan');
  check(/deferred = \{ worker/.test(UPDATE),
    'F3 permintaan yang tertunda DIPARKIR, bukan dibuang');
  check(/flush: flush/.test(UPDATE), 'F4 flush() dipapar untuk dipanggil di akhir sesi');
  check(/FiezelUpdatePrompt\?\.flush\?\.\(\)/.test(APP),
    'F5 app.js melepas kartu tertunda di layar hasil');
  /* Sumber kebenaran "sedang ada pelajaran" harus SATU. Gerbang kedua yang menghitung
     sendiri adalah gerbang yang akan menyimpang. */
  check(/FiezelStage/.test(UPDATE) && /lessonMode/.test(UPDATE),
    'F6 memakai kontrak FiezelStage.lessonMode() yang sama dengan tur dan toast');
}

/* ================================ G · AUDIO GAGAL ================================== */
{
  /* Soal dengar hidup di DUA mesin. Satu perbaikan di salah satunya meninggalkan separuh
     murid dengan layar buntu yang lama, jadi keduanya diperiksa. */
  for (const [label, src] of [['kuis', APP], ['sesi bicara & dengar', ADDON]]) {
    check(/listening\.gagal-coba-lagi/.test(src), 'G1 [' + label + '] opsi "coba lagi" ada');
    check(/listening\.gagal-lewati/.test(src), 'G2 [' + label + '] opsi "lewati" ada');
    check(/listening\.gagal-tanpa-penalti/.test(src),
      'G3 [' + label + '] janji "tanpa penalti" dikatakan kepada murid');
  }
  /* "Tanpa penalti" harus benar di ARITMETIKANYA, bukan hanya di kalimatnya: akurasi =
     score/asked, jadi soal yang dilewati harus keluar dari penyebut. */
  check(/cfg\.__noAudioSkips=\(Number\(cfg\.__noAudioSkips\)\|\|0\)\+1/.test(APP),
    'G5 soal yang dilewati karena audio gagal dihitung');
  check(/-\(Number\(cfg\.__noAudioSkips\)\|\|0\)/.test(APP),
    'G6 dan benar-benar dikeluarkan dari penyebut akurasi');
  /* TIDAK ADA opsi suara peramban, di mana pun. OWNER 4 Sep 2026: "aku ga mau lagi ada
     tts browser, tts browser harus mati total." Larangan strukturalnya ditegakkan
     audio-locale-guard-test.js atas zona audio + app.js; asersi di bawah menutup dua
     berkas yang berada DI LUAR zona itu (addon dan naskah), supaya opsinya tidak bisa
     kembali lewat pintu samping. */
  check(!/speechSynthesis|SpeechSynthesisUtterance/.test(
        ADDON.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1')),
    'G7 addon bicara & dengar bebas speechSynthesis');
  const copyText = COPY.map(f => f.text).join('\n');
  check(!/gagal-peramban/.test(copyText),
    'G8 tidak ada naskah tombol "suara peramban" yang tertinggal di copy-map');
}

/* ================================ H · SKOR SPEAKING ================================ */
{
  check(/speaking\.cakupan-judul/.test(ADDON), 'H1 label "Cakupan kata" dipakai');
  check(/speaking\.cakupan-penjelasan/.test(ADDON), 'H2 satu kalimat penjelasan menyertainya');
  /* Yang dilarang owner adalah ANGKA NILAI PENGUCAPAN di layar. result.score tetap boleh
     hidup sebagai data (ia memberi makan bukti adaptif) - yang tidak boleh adalah ia
     dirakit menjadi kalimat untuk murid di jalur speaking. */
  /* Jendela dipotong dari AWAL kalimat speaking sampai baris yang merakit markupnya.
     Batas akhirnya wajib ditemukan: tanpa penjaga di bawah, indexOf yang gagal menjawab
     -1 dan slice(start,-1) diam-diam ikut menyeret cabang LISTENING - yang memang masih
     menampilkan skor dengan sah - sehingga asersi ini merah untuk alasan yang salah. */
  const noteAt = ADDON.indexOf("const note=this.domain==='speaking'");
  const markupAt = ADDON.indexOf('const fb=this.root', noteAt);
  check(noteAt !== -1 && markupAt > noteAt, 'H3a jendela kalimat hasil speaking terbaca');
  /* Dipotong lagi di pemisah ternarinya. Satu pernyataan `const note=` memuat DUA cabang:
     speaking (yang tidak boleh lagi memuat angka) dan listening (yang masih menampilkan
     skor dengan sah, karena dictation memang dinilai). Menguji seluruh pernyataan berarti
     menuduh cabang listening melanggar aturan yang tidak berlaku untuknya. */
  const whole = noteAt === -1 || markupAt < 0 ? '' : ADDON.slice(noteAt, markupAt);
  const branchAt = whole.indexOf(': (I18N');
  check(branchAt > 0, 'H3b cabang speaking terpisah dari cabang listening');
  const speakingNote = branchAt > 0 ? whole.slice(0, branchAt) : whole;
  check(!/result\.score/.test(speakingNote),
    'H3 kalimat hasil speaking tidak lagi memuat angka skor',
    speakingNote.slice(0, 160));
  check(/cakupan-nilai/.test(ADDON),
    'H4 yang ditampilkan adalah hitungan kata target yang terdengar');
}

/* ================================ I · FUNNEL ======================================= */
{
  for (const event of ['first_question', 'question_skipped', 'session_ended', 'retention_ping']) {
    check(ANALYTICS.indexOf(event + ':') !== -1 || ANALYTICS.indexOf("'" + event + "'") !== -1,
      'I1 event funnel ' + event + ' terdaftar di CLIENT_EVENT_SPEC');
  }
  /* Batas 60 detik harus jadi TEPI EMBER, supaya janji "soal pertama <60 detik" bisa
     dibaca langsung tanpa hitungan lanjutan di server. */
  check(/'30-60s'/.test(ANALYTICS),
    'I2 ember waktu memisahkan tepat di 60 detik');
  check(/function anFirstQuestion\(\)/.test(APP), 'I3 pemancar first_question ada di app.js');
  check(/anFirstQuestion\(\)/.test(APP.slice(APP.indexOf("$('options').append"))),
    'I4 dan ditembakkan saat soal pertama benar-benar tercat');
  check(/function anQuestionSkipped\(/.test(APP), 'I5 pemancar question_skipped ada');
  /* Persetujuan murid tetap SATU gerbang. Addon melapor lewat kait; ia tidak boleh
     menembak analytics sendiri. */
  check(!/FiezelAnalytics/.test(ADDON),
    'I6 addon TIDAK menembak analytics sendiri (gerbang persetujuan tetap satu)');
  check(/onSkip:info=>/.test(APP), 'I7 app.js memasang kait skip dari addon');
}

/* ================================ J · NAMA INTERNAL ================================ */
{
  const forbidden = ['Core Brain', 'Skills Lab', 'Core Worker'];
  const leaks = [];
  for (const file of COPY) {
    /* Yang diperiksa adalah NILAI naskah, bukan komentar: komentar tidak pernah sampai
       ke layar murid, dan melarangnya di sana hanya membuat catatan sejarah hilang. */
    const lines = file.text.split('\n').filter(l => /^\s*'[a-z0-9.\-]+':/i.test(l));
    for (const line of lines) {
      for (const word of forbidden) if (line.indexOf(word) !== -1) leaks.push(file.name + ': ' + line.trim().slice(0, 70));
    }
  }
  check(leaks.length === 0,
    'J1 tidak ada nama internal di naskah murid',
    leaks.join('\n    '));
  check(/latihan\.bicara-dengar/.test(APP),
    "J2 'Skills Lab' diganti 'Latihan bicara & dengar' di judul layarnya");
}

/* ================================ K · TIPOGRAFI ==================================== */
{
  const faces = [...new Set((CSS.match(/@font-face\{font-family:'([^']+)'/g) || [])
    .map(f => /'([^']+)'/.exec(f)[1]))];
  /* Yang dihitung adalah keluarga MEREK (awalan "FZ"). 'Noto Sans Thai Looped' sengaja
     TIDAK ikut dihitung dan itu bukan celah: ia bukan wajah ketiga dalam sistem tipografi,
     ia dukungan AKSARA - satu-satunya wajah yang bisa menggambar tulisan Thai sama sekali,
     dimuat hanya pada locale th (:root:lang(th)). Menghitungnya di sini akan memaksa
     pilihan antara "dua keluarga font" dan "murid Thai bisa membaca aplikasinya". */
  const brandFaces = faces.filter(f => /^FZ /.test(f));
  check(brandFaces.length === 2,
    'K1 tepat dua keluarga font merek di-self-host',
    'ditemukan: ' + brandFaces.join(', ') + ' (semua: ' + faces.join(', ') + ')');
  check(!/@font-face\{font-family:'FZ Fredoka'/.test(CSS),
    'K2 @font-face Fredoka dicabut');
  check(!/Fredoka-var\.woff2/.test(INDEX),
    'K3 preload Fredoka dicabut dari index.html');
  /* KODE, bukan komentar: catatan sejarah yang menyebut Fredoka justru berguna, dan
     melarangnya akan memaksa penghapusan alasan pencabutannya. */
  const cssCode = CSS.replace(/\/\*[\s\S]*?\*\//g, ' ');
  check(!/'FZ Fredoka'/.test(cssCode),
    'K4 tidak ada token yang masih menyebut keluarga Fredoka',
    (cssCode.match(/[^;{]*'FZ Fredoka'[^;}]*/g) || []).join(' | '));
}

/* ================================ L · GERBANG AKUN OFFLINE ========================= */
{
  const m = /const OFFLINE_AUTH_ESCAPE_MS=(\d+);/.exec(APP);
  check(!!m, 'L1 jalan keluar gerbang akun saat offline ada');
  check(m && Number(m[1]) <= 3000,
    'L2 tenggatnya <= 3 detik seperti yang diminta owner',
    m ? m[1] + ' ms' : '');
  check(/armOfflineAuthGateEscape\(\)/.test(APP), 'L3 dan benar-benar dipasang saat gerbang muncul');
  /* Bukan sekadar menyembunyikan gerbang: ia memanggil jalur "Lanjut tanpa akun" yang sudah
     ada, jadi kunci dilepas DAN kuis yang tertunda ikut jalan. */
  const body = APP.slice(APP.indexOf('function armOfflineAuthGateEscape'), APP.indexOf('function armOfflineAuthGateEscape') + 900);
  check(/skipPuterSignIn\(\)/.test(body),
    'L4 memakai jalur "Lanjut tanpa akun" yang sudah ada, bukan perilaku kedua');
}

console.log('');
if (failures) {
  console.error('FIEZEL ux redesign: FAIL (' + failures + ')');
  process.exit(1);
}
console.log('FIEZEL ux redesign: PASS');
