#!/usr/bin/env node
/**
 * V6 GERBANG SISI PEMANGGIL (tests/voice-callsite-prefetch-test.js)
 *
 * KENAPA BERKAS INI ADA. Tiga agen sebelumnya memperbaiki MESIN suara: prefetch() kini
 * benar-benar menyentuh mesin neural lokal (reports/voice-v5-prefetch.md), planUtterance()
 * menerima TEKS UTUH dan mengembalikan potongan bertanda batas (reports/voice-v3-chunk.md),
 * dan pemutar menyambung antrean lintas panggilan sambil memangkas senyap
 * (reports/voice-v2-player.md). Ketiganya tidak berbuah apa pun selama PEMANGGIL tetap
 * mengirim satu kalimat per panggilan dan tidak pernah menghangatkan kalimat berikutnya -
 * itulah daftar yang ditulis voice-v5-prefetch.md §3.
 *
 * ANGKA MANA UNTUK PEKERJAAN MANA - jangan dirangkai (temuan add-a10-kepatuhan.md KB-6).
 * Ada DUA metrik jeda di paket suara ini, dan keduanya pernah dikutip sebagai satu tren
 * perbaikan. Itu salah, dan koreksinya bukan menghapus angkanya melainkan melabelinya:
 *
 *   - JEDA TERDENGAR (meanAudibleGapMs) = keheningan yang benar-benar didengar murid,
 *     dihitung dari sinyal PCM termasuk keheningan kepala/ekor yang justru DIPANGKAS
 *     pemutar di jalur tersambung. Ia batas ATAS, bukan jeda nyata.
 *     Angka V5: 4.510,7 -> 797,2 ms (reports/voice-v5-prefetch.md §2, harness-door.html +
 *     measure_door.py, reports/voice-v5-data/door-measurements.json). Itu mengukur
 *     perbaikan MESIN prefetch V5 - BUKAN pekerjaan sisi-pemanggil yang dijaga berkas ini.
 *
 *   - JEDA PENJADWALAN (meanSchedulingGapMs) = selisih antara satu bunyi selesai dan bunyi
 *     berikutnya dijadwalkan. Ia metrik V6, dan ia yang mengukur pekerjaan sisi pemanggil.
 *     Angka V6 pola SATU KALIMAT per panggilan (classroom, tutor, flashcards, kuis):
 *     3.750,6 -> 449,1 ms; porsi sunyi 47,7% -> 9,7% (reports/voice-v6-callers.md §4,
 *     harness-callers.html + measure_callers.py, voice-v6-data/caller-measurements.json).
 *
 * DAN ANGKA MANA YANG BERLAKU UNTUK PRODUKSI. Konfigurasi narasi Library yang benar-benar
 * dikirim adalah blok bertangga (LEAD_BLOCK_CHARS 80, RAMP_COVER_FACTOR 1,15), bukan pola
 * satu-kalimat-per-panggilan. Ia membayar lebih: jeda penjadwalan 560,6 ms, jeda terdengar
 * 1.286,0 ms, porsi sunyi 12,6%, suara pertama 2.816,8 ms (reports/voice-v6-callers.md §5,
 * measure_blocks.py, voice-v6-data/block-measurements.json). Jadi 449 ms adalah angka pola
 * pemanggil, dan 560,6 ms adalah angka yang berlaku untuk narasi Library di produksi.
 * Mengutip "3.750 -> 449" untuk Library, atau merangkainya dengan "4.510 -> 797", adalah
 * dua kesalahan berbeda; keduanya dilarang di sini.
 *
 * Kelas bug yang dijaga bukan "fungsinya tidak ada" tapi "fungsinya ada dan tidak dipanggil
 * dari tempat yang penting". Karena itu pemindaiannya SPESIFIK - nama pemanggil, nama
 * fungsi hangat, dan URUTAN terhadap await - bukan mencari kata 'prefetch' di dalam berkas.
 * Berkas 200 KB seperti app.js akan lulus pemeriksaan kata kunci tanpa satu pun titik yang
 * benar-benar tersambung.
 *
 * Lima janji:
 *   (a) setiap titik pemanggil di voice-v5-prefetch.md §3 benar-benar menghangatkan item
 *       BERIKUTNYA, dan mengajukannya SESUDAH pemutaran berangkat, SEBELUM ditunggu.
 *   (b) jalur UJIAN tidak pernah menghangatkan item berikutnya (anti-kebocoran) - diuji
 *       dengan MENJALANKAN penjaganya untuk keempat domain, bukan dengan membaca komentar.
 *   (c) pembacaan teks panjang (audiobook Library) mengirim TEKS UTUH lewat planUtterance:
 *       dibuktikan pada data buku NYATA dengan chunks.length > 1.
 *   (d) subtitle/sorotan tetap mendapat batas per kalimat, digerakkan penanda batas
 *       planUtterance - dan mati begitu murid menekan jeda.
 *   (e) tidak ada prepare()/ensureReady()/prewarm() baru di jalur pemanggil: pekerjaan
 *       spekulatif tidak boleh memulai unduhan model 152 MB.
 *
 * Node murni, tanpa dependency. Sumber: reports/voice-v1-audit.md §1/§4,
 * reports/voice-v5-prefetch.md §3, reports/voice-v3-chunk.md §1-§3,
 * reports/voice-v2-player.md §1.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __fzRoot;
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const APP_PATH = 'app.js';
const TUTOR_PATH = 'features/tutor-classroom/fiezel-tutor-v3.js';
const CLASSROOM_PATH = 'features/classroom/fiezel-classroom.js';
const SL_PATH = 'features/speaking-listening/fiezel-speaking-listening-addon.js';
const LIB_UI_PATH = 'features/library/fiezel-library-ui.js';

const APP = read(APP_PATH);
const TUTOR = read(TUTOR_PATH);
const CLASSROOM = read(CLASSROOM_PATH);
const SL = read(SL_PATH);
const LIB = read(LIB_UI_PATH);

const PROSODY = require(path.join(ROOT, 'features/neural-voice/fiezel-prosody.js'));
const BOOKS = JSON.parse(read('features/library/library-books-v1.json'));

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details == null ? '' : details) });
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'} - ${name}${ok ? '' : ' :: ' + details}`);
};

/**
 * Blok sumber sebuah fungsi/metode, dipotong dengan HITUNGAN KURUNG, bukan dengan
 * "sampai fungsi berikutnya". Alasannya konkret: app.js menyimpan banyak fungsi dalam satu
 * baris panjang, dan pemotong berbasis baris akan menelan pemanggil di sebelahnya sehingga
 * penjaga urutan await di bawah bisa lulus karena membaca fungsi yang salah.
 */
function block(source, pattern) {
  const at = source.search(pattern);
  if (at < 0) return '';
  // Kurung buka BADAN fungsi, bukan kurung pertama yang kebetulan lewat: parameter default
  // seperti `options={}` membawa kurung sendiri, dan mengambilnya akan memotong badan
  // fungsi jadi satu karakter sehingga penjaga di bawah lulus/gagal untuk alasan palsu.
  let open = -1;
  let paren = 0;
  for (let i = at; i < source.length; i++) {
    const c = source[i];
    if (c === '(') paren++;
    else if (c === ')') paren--;
    else if (c === '{' && paren === 0) { open = i; break; }
  }
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return source.slice(at, i + 1);
    }
  }
  return source.slice(at);
}

/** Titik pengajuan hangat harus mendahului titik menunggu di dalam satu blok. */
function warmBeforeAwait(body, warmPattern, awaitPattern) {
  const warm = body.search(warmPattern);
  const wait = body.search(awaitPattern);
  if (warm < 0) return { ok: false, why: 'pengajuan hangat tidak ditemukan' };
  if (wait < 0) return { ok: false, why: 'titik menunggu tidak ditemukan' };
  return { ok: warm < wait, why: `warm@${warm} vs await@${wait}` };
}

// =======================================================================================
// (a) SEPULUH BARIS §3 — setiap titik pemanggil yang didaftarkan V5
// =======================================================================================

// --- baris 1: app.js classroomSpeak (+ 5 pemanggilnya di wireClassroom) ---------------
const helper = block(APP, /function prefetchNextVoice\(/);
check('a1 app.js punya satu pintu hangat prefetchNextVoice() yang memanggil say.prefetch',
  /say\.prefetch\(/.test(helper) && /generation!==voicePrefetchGeneration/.test(helper),
  'prefetchNextVoice harus memanggil say.prefetch dan memeriksa generation');

const classroomSpeak = block(APP, /async function classroomSpeak\(/);
check('a2 classroomSpeak menghangatkan kalimat berikutnya',
  /prefetchNextVoice\(next===undefined\?classroomPeekNextText\(\):next/.test(classroomSpeak),
  'pola prefetchNextVoice(next===undefined?classroomPeekNextText():next, ...) tidak ditemukan');

const order1 = warmBeforeAwait(classroomSpeak, /prefetchNextVoice\(/, /await speaking/);
check('a3 classroomSpeak mengajukan hangat SEBELUM menunggu bunyi sekarang', order1.ok, order1.why);

check('a4 classroomPeekNextText mengintip kursor sesi tanpa memindahkannya',
  /function classroomPeekNextText\(\)/.test(APP) && /peekSegment\(\)/.test(APP) &&
  !/nextSegment\(\)/.test(block(APP, /function classroomPeekNextText\(/)),
  'harus lewat peekSegment(), bukan nextSegment() yang memindahkan kursor');

const peek = block(CLASSROOM, /function peekSegment\(/);
check('a5 sesi Classroom mengekspor peekSegment() yang murni',
  peek.length > 0 && /segmentIndex \+ 1/.test(peek) && /peekSegment: peekSegment/.test(CLASSROOM) &&
  !/state\.segmentIndex\s*(\+\+|=)/.test(peek),
  'peekSegment harus membaca segmentIndex+1 dan tidak menulis state');

// --- baris 2: features/tutor-classroom/fiezel-tutor-v3.js speak() --------------------
const nextBeat = block(TUTOR, /function prefetchNextBeat\(/);
const tutorSpeak = block(TUTOR, /async function speak\(pair, speedFactor\)/);
check('a6 tutor v3 punya prefetchNextBeat() yang membaca beat berikutnya dari snapshot',
  /session\.beats\(\)\[Number\(snap\.beatIndex\) \+ 1\]/.test(nextBeat) && /say\.prefetch\(/.test(nextBeat),
  'harus mengambil beats()[beatIndex+1] lalu say.prefetch');
check('a7 tutor v3 speak() memanggil prefetchNextBeat', /prefetchNextBeat\(speedFactor\)/.test(tutorSpeak),
  'prefetchNextBeat(speedFactor) tidak dipanggil dari speak()');
const order2 = warmBeforeAwait(tutorSpeak, /prefetchNextBeat\(/, /await speaking/);
check('a8 tutor v3 mengajukan hangat SEBELUM menunggu bunyi sekarang', order2.ok, order2.why);
check('a9 stopVoice tutor v3 membatalkan pengajuan yang menganggur',
  /prefetchGeneration\+\+/.test(block(TUTOR, /function stopVoice\(/)),
  'stopVoice harus menaikkan prefetchGeneration');

// --- baris 3: features/speaking-listening (+ adaptor host) ----------------------------
const slPrefetchMethod = block(SL, /\n\s{4}prefetch\(text,options=\{\}\)/);
check('a10 TTSService addon punya pipa prefetch ke pintu suara',
  /FiezelVoiceSay/.test(slPrefetchMethod) && /say\.prefetch\(/.test(slPrefetchMethod),
  'TTSService.prefetch harus meneruskan ke FiezelVoiceSay.prefetch');

const nextScript = block(SL, /prefetchNextScript\(\)\s*\{/);
check('a11 Controller addon menghangatkan naskah item BERIKUTNYA',
  /this\.items\[this\.index\+1\]/.test(nextScript) && /this\.tts\.prefetch\(script/.test(nextScript),
  'harus items[index+1] lalu tts.prefetch(script, ...)');

const renderListening = block(SL, /\n\s{4}renderListening\(item,progress\)\{/);
check('a12 renderListening memanggil prefetchNextScript sesudah play diajukan, sebelum ditunggu',
  /const playing=this\.tts\.play\(item\.script/.test(renderListening) &&
  warmBeforeAwait(renderListening, /this\.prefetchNextScript\(\)/, /await Promise\.race\(\[playing/).ok,
  'urutan harus: play() -> prefetchNextScript() -> await Promise.race([playing, ...])');

check('a13 adaptor tts di app.js meneruskan prefetch addon ke pintu suara',
  /prefetch:\(text,options=\{\}\)=>prefetchNextVoice\(text,/.test(APP),
  'adaptor tts skillsLab harus punya prefetch yang memanggil prefetchNextVoice');

// --- baris 4: app.js AudioService (Reading/Vocabulary/Grammar) ------------------------
const audioPlay = block(APP, /\n  play\(text,options=\{\}\)\{/);
check('a14 AudioService.play menghormati options.next',
  /if\(options\.next\)this\.prefetch\(options\.next/.test(audioPlay), 'options.next tidak dihangatkan');
const order3 = warmBeforeAwait(audioPlay, /if\(options\.next\)this\.prefetch\(/, /return viaDoor\.then/);
check('a15 AudioService mengajukan hangat sesudah pemutaran diajukan', order3.ok, order3.why);
check('a16 AudioService.stop membatalkan pengajuan yang menganggur',
  /stop\(\)\{cancelVoicePrefetch\(\)/.test(APP), 'stop() harus memanggil cancelVoicePrefetch()');

// --- baris 5: flashcards -------------------------------------------------------------
check('a17 flashcards menghangatkan kartu berikutnya (kata dan contoh)',
  /const nextCard=pool\[i\+1\]\|\|null;/.test(APP) &&
  /next:nextCard\?nextCard\.word:''/.test(APP) &&
  /next:nextCard\?nextCard\.example:''/.test(APP),
  'pool[i+1] harus dioper sebagai options.next untuk word dan example');

// --- baris 6: kuis listening ----------------------------------------------------------
check('a18 kuis listening menghangatkan soal listening berikutnya di kolam sisa',
  /const nextListening=remaining\.find\(x=>x&&x\.type==='listening'/.test(APP) &&
  /next:nextListening\?nextListening\.script:''/.test(APP),
  'soal listening berikutnya harus dicari dari remaining lalu dioper sebagai options.next');

// --- baris 10 + penghenti global -----------------------------------------------------
check('a19 penghenti global membatalkan prefetch (silenceNeuralVoice + keluar Classroom)',
  /function silenceNeuralVoice\(\)\{cancelVoicePrefetch\(\)/.test(APP) &&
  (APP.match(/cancelVoicePrefetch\(\)/g) || []).length >= 5,
  'cancelVoicePrefetch harus dipasang di penghenti, minimal 5 titik');

// --- Library: warmNext menghangatkan BLOK berikutnya ---------------------------------
const narrateSource = block(LIB, /async function narrate\(\)/);
const warmNext = block(LIB, /function warmNext\(token, index, budget\)/);
check('a20 Library menghangatkan BLOK berikutnya, bukan kalimat berikutnya',
  /blockAt\(/.test(warmNext) && /say\.prefetch\(upcoming\.text/.test(warmNext),
  'warmNext harus menghangatkan blockAt(...).text');
check('a22 anggaran yang dihangatkan sama dengan anggaran yang nanti dikirim',
  /var upcomingBudget = nextBlockBudget\(block\.text\.length\);/.test(narrateSource) &&
  /warmNext\(token, block\.to \+ 1, upcomingBudget\);/.test(narrateSource) &&
  /budget = upcomingBudget;/.test(narrateSource) &&
  /blockAt\(snap\.sentenceIndex, budget\)/.test(narrateSource),
  'kalau anggaran hangat berbeda dari anggaran kirim, kunci dedup pintu suara tidak cocok');
check('a21 Library tetap menunda pengajuan satu task (pagar inversi antrean m025-47)',
  /setTimeout\(function \(\) \{/.test(warmNext) && /m025-47/.test(LIB),
  'penundaan satu task dan catatannya harus dipertahankan');

// =======================================================================================
// (b) ANTI-KEBOCORAN UJIAN — dijalankan, bukan dibaca
// =======================================================================================

/**
 * Penjaga diuji dengan MENJALANKAN metodenya untuk keempat domain. Membaca komentar tidak
 * cukup: bentuk kebocoran yang ditakuti adalah penjaga yang ada tapi salah arah (mis.
 * memakai daftar-hitam yang kelupaan satu domain ujian).
 */
const runNextScript = vm.runInNewContext(`(function(){return function ${nextScript.trim()}})()`,
  { global: { setTimeout: (fn) => { fn(); } } });

const fakeController = (domain) => {
  const seen = [];
  const controller = {
    domain,
    index: 0,
    prefetchGeneration: 0,
    config: { ttsRate: 1 },
    items: [{ script: 'Item yang sedang diputar.' }, { script: 'Item berikutnya yang belum boleh didengar.' }],
    tts: { prefetch: (text) => { seen.push(text); return true; } },
    seen
  };
  return controller;
};

['listening_exam', 'speaking_exam', 'speaking'].forEach((domain) => {
  const c = fakeController(domain);
  const result = runNextScript.call(c);
  check(`b1 ${domain}: TIDAK menghangatkan item berikutnya`,
    result === false && c.seen.length === 0,
    `hasil=${result} dihangatkan=${JSON.stringify(c.seen)}`);
});

const listening = fakeController('listening');
const listeningResult = runNextScript.call(listening);
check('b2 listening biasa: item berikutnya dihangatkan',
  listeningResult === true && listening.seen.length === 1 &&
  listening.seen[0] === 'Item berikutnya yang belum boleh didengar.',
  `hasil=${listeningResult} dihangatkan=${JSON.stringify(listening.seen)}`);

check('b3 penjaganya berbentuk daftar-putih satu domain, bukan daftar-hitam',
  /this\.domain!=='listening'\)return false/.test(nextScript),
  'harus menolak semua domain kecuali listening');

const renderExam = block(SL, /renderListeningExam\(set,progress\)\s*\{/);
check('b4 renderListeningExam tidak menyebut prefetch sama sekali',
  renderExam.length > 0 && !/prefetch/i.test(renderExam),
  'jalur ujian tidak boleh memanggil prefetch');

check('b5 pindah domain dan keluar sesi membatalkan pengajuan yang menganggur',
  /cancelPrefetch\(\)/.test(block(SL, /open\(domain,level\)\{/)) &&
  /exit\(\)\{this\.cancelPrefetch\(\)/.test(SL) &&
  /destroy\(\)\{this\.cancelPrefetch\(\)/.test(SL),
  'open(), exit(), destroy() harus memanggil cancelPrefetch()');

const genGuard = fakeController('listening');
let deferred = null;
const runDeferred = vm.runInNewContext(`(function(){return function ${nextScript.trim()}})()`,
  { global: { setTimeout: (fn) => { deferred = fn; } } });
runDeferred.call(genGuard);
genGuard.prefetchGeneration++; // murid menekan stop / pindah layar
deferred();
check('b6 pengajuan yang menganggur tidak berbunyi belakangan setelah penghenti',
  genGuard.seen.length === 0, `dihangatkan=${JSON.stringify(genGuard.seen)}`);

// =======================================================================================
// (c) TEKS UTUH lewat planUtterance — pada data buku NYATA
// =======================================================================================

const narrate = block(LIB, /async function narrate\(\)/);
const dispatchSource = block(LIB, /function dispatchBlock\(block, token\)/);
check('c1 narasi Library mengirim teks blok utuh dalam SATU say()',
  /speak\(\{ en: block\.text, id: block\.translation \}\)/.test(dispatchSource) &&
  /dispatchBlock\(block, token\)/.test(narrate) &&
  !/session\.current\(\)/.test(narrate),
  'satu-satunya jalan teks blok ke say() adalah dispatchBlock(block, token)');
check('c2 narasi Library memakai planUtterance untuk teks utuh',
  /planUtterance\(text\)/.test(block(LIB, /function planBlock\(/)) && /planBlock\(block\.text\)/.test(narrate),
  'planBlock harus memanggil FiezelProsody.planUtterance dan dipakai di narrate');

/**
 * blockAt() dijalankan dari sumbernya sendiri di dalam vm, dengan data buku NYATA. Yang
 * diuji adalah fungsi yang benar-benar dikirim, bukan tiruannya.
 */
const blockAtSource = block(LIB, /function blockAt\(startIndex, budget\)/);
const scheduleSource = block(LIB, /function scheduleBlockHighlight\(block, plan, token\)/);
const constants = LIB.match(/var BLOCK_MAX_CHARS = \d+;/)[0] +
  LIB.match(/var LEAD_BLOCK_CHARS = \d+;/)[0] +
  LIB.match(/var GEN_S_PER_CHAR = [\d.]+;/)[0] +
  LIB.match(/var SPEAK_S_PER_CHAR = [\d.]+;/)[0] +
  LIB.match(/var BOUNDARY_SLACK_S = [\d.]+;/)[0] +
  LIB.match(/var RAMP_SETTLED_CHARS = \d+;/)[0] +
  block(LIB, /function nextBlockBudget\(previousChars\)/) +
  block(LIB, /function blockCoverMs\(previousChars\)/) +
  LIB.match(/var NARRATION_CHARS_PER_SECOND = [\d.]+;/)[0] +
  LIB.match(/var BOUNDARY_GAP_S = \{[^}]+\};/)[0];

const book = BOOKS.books[0];
const sentences = [];
book.chapters.forEach((chapter, chapterIndex) => {
  chapter.sentences.forEach((s) => {
    sentences.push({ index: sentences.length, chapterIndex, chapterTitle: chapter.title, en: s.en, id: s.id });
  });
});

const highlighted = [];
const timers = [];
const sandbox = {
  console,
  session: { sentences: () => sentences },
  highlightTimers: [],
  narrating: true,
  narrationToken: 7,
  highlight: (index) => { highlighted.push(index); },
  currentRate: () => 1,
  clearHighlightTimers: function () { sandbox.highlightTimers.length = 0; },
  root: {
    setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; },
    clearTimeout: () => {},
    FiezelProsody: PROSODY
  }
};
vm.createContext(sandbox);
vm.runInContext(`${constants}\n${blockAtSource}\n${scheduleSource}`, sandbox);

const firstBlock = sandbox.blockAt(0);
check('c3 blok pertama audiobook menggabungkan beberapa kalimat dalam satu bab',
  firstBlock && firstBlock.sentences.length > 1 &&
  firstBlock.sentences.every((s) => s.chapterIndex === firstBlock.sentences[0].chapterIndex),
  `kalimat=${firstBlock ? firstBlock.sentences.length : 0}`);

const plan = PROSODY.planUtterance(firstBlock.text);
check('c4 teks utuh blok NYATA menghasilkan lebih dari satu potongan (chunks.length > 1)',
  plan.chunks.length > 1,
  `buku="${book.title}" chars=${firstBlock.text.length} chunks=${plan.chunks.length}`);
check('c5 setiap potongan membawa penanda batas',
  plan.chunks.every((c) => ['comma', 'sentence', 'paragraph'].includes(c.boundary)),
  JSON.stringify(plan.chunks.map((c) => c.boundary)));

const perSentence = sentences.slice(firstBlock.from, firstBlock.to + 1)
  .map((s) => PROSODY.planUtterance(s.en).chunks.length)
  .reduce((a, b) => a + b, 0);
check('c6 satu blok utuh membayar lebih sedikit batas generasi daripada satu-kalimat-per-panggilan',
  plan.chunks.length < perSentence,
  `blok utuh=${plan.chunks.length} potongan vs per kalimat=${perSentence} potongan`);

/**
 * Blok PERTAMA harus kecil. Penjaga angka, bukan selera: pengukuran V6
 * (reports/voice-v6-data/caller-measurements.json) menunjukkan potongan pembuka 248 char
 * menunda suara pertama 12.395 ms, sedangkan 60 char cukup 3.407 ms. Kalau tangga ini nanti
 * "disederhanakan" menjadi satu angka besar, gerbang ini yang menolak.
 */
const leadBlock = sandbox.blockAt(0, sandbox.LEAD_BLOCK_CHARS);
check('c8 blok pembuka kecil, jadi suara pertama tidak menunggu generasi panjang',
  sandbox.LEAD_BLOCK_CHARS <= 120 &&
  leadBlock.text.length <= Math.max(120, String(sentences[0].en).length),
  `LEAD_BLOCK_CHARS=${sandbox.LEAD_BLOCK_CHARS} blok pembuka=${leadBlock.text.length} char`);

/**
 * V7: anggaran tidak boleh MENJANJIKAN generasi lebih panjang daripada tutupan terukur
 * ditambah kelonggaran yang DIDEKLARASIKAN. Bentuk lamanya (`next <= max(80, prev*1,15)`)
 * lulus untuk tangga V6 yang justru sedang bocor: lantai 80 char-nya membuat anggaran
 * sesudah blok 35 char berjanji 80 char padahal tutupannya cuma 40 - dan itulah batas yang
 * terukur 2.453,2 ms di reports/voice-v7-data/block-measurements-v7.json. Jadi penjaganya
 * sekarang membandingkan anggaran dengan TUTUPAN, bukan dengan pengali.
 *
 * Kelonggaran diizinkan tapi dibatasi di DUA tempat, karena satu angka saja bisa dipermainkan:
 *   - kelonggaran yang DIDEKLARASIKAN di dalam rumus (BOUNDARY_SLACK_S) maksimal 800 ms, dan
 *     angka 800 itu sendiri berasal dari ukuran: satu batas blok yang dihilangkan menghemat
 *     ~530 ms senyap penjadwalan plus senyap tepi satu render (~250-535 ms per sisi);
 *   - utang yang BENAR-BENAR terjadi pada buku nyata (termasuk utang dari kalimat tunggal yang
 *     lebih panjang daripada anggaran) maksimal 1.000 ms per batas.
 * Yang mengikat adalah lubang TERBESAR, bukan totalnya. Sebab totalnya bisa turun sambil
 * lubang tunggal 2,4 detik tetap ada, dan lubang tunggal itulah yang didengar murid. Pada
 * seluruh "The Three Little Pigs" (32 kalimat): aturan V6 lubang terbesar 2.206 ms / total
 * 4.356 ms; aturan yang terkirim sekarang lubang terbesar 852 ms / total 3.813 ms. Totalnya
 * cuma turun 12,5% dan itu memang diakui lemah - gerbang totalnya karena itu ditaruh di 90%
 * sebagai penjaga kemunduran saja, bukan sebagai klaim perbaikan.
 */
const SLACK_CEILING_MS = 800;
const HOLE_CEILING_MS = 1000;
/** Aturan V6 yang dulu terkirim, disimpan sebagai PEMBANDING - bukan untuk dipakai lagi. */
const budgetV6Reference = (prev) => (prev >= 224 ? 900 : Math.max(80, Math.round(prev * 1.15)));
/** Utang tak tertutup di setiap batas, dihitung dari blok yang BENAR-BENAR dihasilkan. */
function uncoveredDebt(budgetFn) {
  const rows = [];
  let cursor = 0;
  let budget = sandbox.LEAD_BLOCK_CHARS;
  let prevChars = null;
  while (cursor < sentences.length) {
    const b = sandbox.blockAt(cursor, budget);
    if (!b) break;
    const chars = b.text.length;
    if (prevChars != null) {
      rows.push({ prev: prevChars, chars,
        lebihMs: Math.max(0, Math.round(chars * sandbox.GEN_S_PER_CHAR * 1000 - sandbox.blockCoverMs(prevChars))) });
    }
    prevChars = chars;
    budget = budgetFn(chars);
    cursor = b.to + 1;
  }
  return { rows, total: rows.reduce((a, r) => a + r.lebihMs, 0), max: Math.max(0, ...rows.map((r) => r.lebihMs)) };
}
const debtNow = uncoveredDebt(sandbox.nextBlockBudget);
const debtV6 = uncoveredDebt(budgetV6Reference);
check('c9 utang generasi tak tertutup di tiap batas jauh di bawah aturan V6',
  sandbox.BOUNDARY_SLACK_S * 1000 <= SLACK_CEILING_MS &&
  sandbox.nextBlockBudget(226) === sandbox.BLOCK_MAX_CHARS &&
  debtNow.max <= HOLE_CEILING_MS &&
  debtNow.total <= debtV6.total * 0.9,
  `sekarang total=${debtNow.total} max=${debtNow.max} ms; aturan V6 total=${debtV6.total} max=${debtV6.max} ms; ` +
  `kelonggaran dideklarasikan=${sandbox.BOUNDARY_SLACK_S * 1000} ms`);

/**
 * Tangga HARUS benar-benar naik pada buku NYATA. Ini gerbang yang tidak ada di V6, dan
 * ketiadaannya itulah yang membuat cacatnya lolos: tangga V6 dihitung dari panjang blok yang
 * TERCAPAI (selalu <= anggaran, karena blok pecah di batas kalimat), jadi ia punya titik
 * tetap di sekitar 80 char dan tidak pernah menyentuh 224 apalagi 900. Narasi Library
 * berperilaku seperti V5 sepanjang buku sementara komentarnya menjanjikan blok menyatu.
 */
const rampSizes = [];
(function () {
  let cursor = 0;
  let budget = sandbox.LEAD_BLOCK_CHARS;
  while (cursor < sentences.length && rampSizes.length < 40) {
    const b = sandbox.blockAt(cursor, budget);
    if (!b) break;
    rampSizes.push(b.text.length);
    budget = sandbox.nextBlockBudget(b.text.length);
    cursor = b.to + 1;
  }
}());
const rampMax = Math.max(...rampSizes);
// Yang TIDAK boleh dituntut di sini: "blok terakhir >= blok pertama". Tangga memang turun lagi
// di batas bab dan sesudah kalimat pendek, dan itu benar - blok tidak pernah melewati bab (c7).
// Yang dituntut: tangga pernah benar-benar melewati blok pembuka, dan narasi tidak merosot
// jadi satu kalimat per blok.
check('c10 tangga anggaran benar-benar naik pada buku nyata, bukan macet di lantai',
  rampMax > sandbox.LEAD_BLOCK_CHARS &&
  rampSizes.length <= Math.ceil(sentences.length * 0.7),
  `buku="${book.title}" blok=${rampSizes.length} ukuran=${JSON.stringify(rampSizes)}`);

check('c7 blok tidak pernah melewati batas bab',
  (function () {
    let cursor = 0;
    while (cursor < sentences.length) {
      const b = sandbox.blockAt(cursor);
      if (!b) return false;
      const chapter = sentences[cursor].chapterIndex;
      if (!b.sentences.every((s) => s.chapterIndex === chapter)) return false;
      if (b.text.length > 900 && b.sentences.length > 1) return false;
      cursor = b.to + 1;
    }
    return true;
  }()), 'setiap blok harus satu bab dan menghormati anggaran karakter');

// =======================================================================================
// (d) SUBTITLE/SOROTAN PER KALIMAT tetap hidup
// =======================================================================================

highlighted.length = 0;
timers.length = 0;
const scheduled = sandbox.scheduleBlockHighlight(firstBlock, plan, sandbox.narrationToken);
check('d1 sorotan dijadwalkan untuk SETIAP kalimat di dalam blok',
  scheduled === firstBlock.sentences.length - 1 && highlighted[0] === firstBlock.from,
  `dijadwalkan=${scheduled} untuk ${firstBlock.sentences.length} kalimat, sorotan awal=${highlighted[0]}`);

timers.forEach((t) => t.fn());
check('d2 setiap kalimat blok benar-benar tersorot, berurutan',
  JSON.stringify(highlighted) === JSON.stringify(firstBlock.sentences.map((s) => s.index)),
  `tersorot=${JSON.stringify(highlighted)}`);

check('d3 jadwal sorotan naik monoton dan memperhitungkan jeda batas potongan',
  timers.every((t, i) => t.delay > 0 && (i === 0 || t.delay > timers[i - 1].delay)) &&
  /BOUNDARY_GAP_S\[seams\[s\]\.boundary\]/.test(scheduleSource) &&
  /chunk\.boundary/.test(scheduleSource),
  `delay=${JSON.stringify(timers.map((t) => Math.round(t.delay)))}`);

highlighted.length = 0;
timers.length = 0;
sandbox.scheduleBlockHighlight(firstBlock, plan, 7);
sandbox.narrationToken = 8; // murid menekan jeda / pindah layar
timers.forEach((t) => t.fn());
check('d4 sorotan berhenti begitu narasi dihentikan (token berubah)',
  highlighted.length === 1 && highlighted[0] === firstBlock.from,
  `tersorot setelah stop=${JSON.stringify(highlighted)}`);

check('d5 stopNarration membatalkan semua timer sorotan',
  /clearHighlightTimers\(\)/.test(block(LIB, /function stopNarration\(\)/)),
  'stopNarration harus memanggil clearHighlightTimers()');

check('d6 terjemahan blok dioper ke pita subtitle, jadi penerjemah tidak dipanggil',
  /translation: picked\.map/.test(blockAtSource) && /id: block\.translation/.test(dispatchSource),
  'block.translation harus dibangun dari pasangan {en,id} lalu dioper ke say()');

// =======================================================================================
// (f) PAGAR URUTAN V7 — dijalankan, bukan dibaca
// =======================================================================================
//
// Aturan anggaran V7 memperbesar blok dan membuat prefetch lebih sering benar-benar terpakai.
// Itu menaikkan satu risiko yang jauh lebih buruk daripada jeda: blok N+1 berbunyi mendahului
// N. Inversi antrean seperti itu pernah terjadi di repo ini (m025-47). Karena itu SEMUA teks
// narasi harus lewat satu pintu, dispatchBlock(), dan pintu itu diuji dengan MENJALANKANNYA.

const guardSaid = [];
const guardPrefetched = [];
const guardTimers = [];
const guardSandbox = {
  console,
  narrating: true,
  narrationToken: 3,
  session: { sentences: () => sentences, snapshot: () => ({ sentenceIndex: 0 }) },
  speak: (payload) => { guardSaid.push(payload.en); return Promise.resolve(); },
  setTimeout: (fn) => { guardTimers.push(fn); return guardTimers.length; },
  narrationOptions: () => ({ speed: 1 }),
  root: {
    FiezelVoiceSay: { prefetch: (text) => { guardPrefetched.push(text); } },
    setTimeout: (fn) => { guardTimers.push(fn); return guardTimers.length; },
    clearTimeout: () => {}
  }
};
vm.createContext(guardSandbox);
vm.runInContext([
  constants,
  blockAtSource,
  LIB.match(/var dispatchedThrough = -?\d+;/)[0],
  LIB.match(/var dispatchRejects = \{[^}]+\};/)[0],
  block(LIB, /function resetDispatchCursor\(startIndex\)/),
  dispatchSource,
  block(LIB, /function warmNext\(token, index, budget\)/)
].join('\n'), guardSandbox);

const runGuardTimers = () => { while (guardTimers.length) guardTimers.shift()(); };

// f1: urutan normal - tiga blok berurutan semuanya terkirim, kursor maju ke block.to.
guardSandbox.resetDispatchCursor(0);
const seq = [];
(function () {
  let cursor = 0;
  let budget = guardSandbox.LEAD_BLOCK_CHARS;
  for (let i = 0; i < 3; i++) {
    const b = guardSandbox.blockAt(cursor, budget);
    seq.push(b);
    guardSandbox.dispatchBlock(b, guardSandbox.narrationToken);
    budget = guardSandbox.nextBlockBudget(b.text.length);
    cursor = b.to + 1;
  }
}());
check('f1 tiga blok berurutan terkirim berurutan dan kursor kirim maju ke block.to',
  JSON.stringify(guardSaid) === JSON.stringify(seq.map((b) => b.text)) &&
  guardSandbox.dispatchedThrough === seq[2].to &&
  guardSandbox.dispatchRejects.order === 0 && guardSandbox.dispatchRejects.replay === 0,
  `terkirim=${guardSaid.length} kursor=${guardSandbox.dispatchedThrough} tolak=${JSON.stringify(guardSandbox.dispatchRejects)}`);

// f2: blok yang MELOMPAT (N+2 sebelum N+1) harus ditolak, bukan dibunyikan.
const beforeJump = guardSaid.length;
const jumped = guardSandbox.blockAt(guardSandbox.dispatchedThrough + 3, 200);
const jumpResult = guardSandbox.dispatchBlock(jumped, guardSandbox.narrationToken);
check('f2 blok yang melompat di depan urutannya ditolak, tidak ada yang berbunyi',
  jumpResult === null && guardSaid.length === beforeJump && guardSandbox.dispatchRejects.order === 1,
  `hasil=${jumpResult} terkirim=${guardSaid.length - beforeJump} tolak=${JSON.stringify(guardSandbox.dispatchRejects)}`);

// f3: blok yang SUDAH pernah dikirim tidak boleh berbunyi dua kali.
const beforeReplay = guardSaid.length;
const replayResult = guardSandbox.dispatchBlock(seq[0], guardSandbox.narrationToken);
check('f3 blok yang sudah pernah dikirim ditolak sebagai replay',
  replayResult === null && guardSaid.length === beforeReplay && guardSandbox.dispatchRejects.replay === 1,
  `hasil=${replayResult} tolak=${JSON.stringify(guardSandbox.dispatchRejects)}`);

// f4: murid menekan jeda - narrating false. Blok yang sudah diantre tidak boleh berbunyi.
const nextInOrder = guardSandbox.blockAt(guardSandbox.dispatchedThrough + 1, 200);
guardSandbox.narrating = false;
const beforeStop = guardSaid.length;
const stopResult = guardSandbox.dispatchBlock(nextInOrder, guardSandbox.narrationToken);
check('f4 penghenti bekerja: narasi dihentikan berarti blok berikutnya tidak berbunyi',
  stopResult === null && guardSaid.length === beforeStop && guardSandbox.dispatchRejects.stopped === 1,
  `hasil=${stopResult} tolak=${JSON.stringify(guardSandbox.dispatchRejects)}`);

// f5: murid pindah halaman - stopNarration menaikkan token. Token lama tidak boleh lolos.
guardSandbox.narrating = true;
guardSandbox.narrationToken = 4; // stopNarration() menaikkan token
const staleResult = guardSandbox.dispatchBlock(nextInOrder, 3);
check('f5 penghenti bekerja: token kedaluwarsa (pindah halaman) tidak boleh berbunyi',
  staleResult === null && guardSandbox.dispatchRejects.stopped === 2,
  `hasil=${staleResult} tolak=${JSON.stringify(guardSandbox.dispatchRejects)}`);

// f6: prefetch tidak boleh berbunyi belakangan - blok di BELAKANG kursor kirim tidak dihangatkan.
guardPrefetched.length = 0;
guardSandbox.warmNext(4, 0, 200);
runGuardTimers();
const lateCount = guardSandbox.dispatchRejects.prefetchLate;
guardSandbox.warmNext(4, guardSandbox.dispatchedThrough + 1, 200);
runGuardTimers();
check('f6 prefetch untuk blok di belakang kursor kirim ditolak, yang di depan tetap jalan',
  lateCount === 1 && guardPrefetched.length === 1 &&
  guardPrefetched[0] === guardSandbox.blockAt(guardSandbox.dispatchedThrough + 1, 200).text,
  `tolakTerlambat=${lateCount} dihangatkan=${guardPrefetched.length}`);

// f7: prefetch yang sudah diantre tidak boleh menyentuh mesin sesudah penghenti.
guardPrefetched.length = 0;
guardSandbox.warmNext(4, guardSandbox.dispatchedThrough + 1, 200);
guardSandbox.narrationToken = 5; // murid menekan jeda sebelum timer jalan
runGuardTimers();
check('f7 pengajuan prefetch yang menganggur mati sesudah penghenti',
  guardPrefetched.length === 0,
  `dihangatkan setelah stop=${guardPrefetched.length}`);

// f8: tidak ada jalan pintas. narrate() sendiri tidak boleh memanggil speak() langsung.
check('f8 narrate() tidak punya jalur say() selain lewat dispatchBlock',
  !/\bspeak\(/.test(narrate) && /dispatchBlock\(block, token\)/.test(narrate) &&
  /if \(!speaking\) \{ clearHighlightTimers\(\); return; \}/.test(narrate),
  'narrate harus menolak lanjut kalau dispatchBlock menolak');

// f9: dua penghenti produksi benar-benar mereset kursor kirim dan narrate menyetelnya ulang.
check('f9 stopNarration mereset kursor kirim, narrate menyetelnya dari posisi murid',
  /resetDispatchCursor\(null\)/.test(block(LIB, /function stopNarration\(\)/)) &&
  /resetDispatchCursor\(session\.snapshot\(\)\.sentenceIndex\)/.test(narrate),
  'kursor kirim harus disetel ulang di kedua tempat, kalau tidak putar-ulang ditolak sebagai replay');

// =======================================================================================
// (e) TIDAK ADA prepare()/ensureReady()/prewarm() BARU di jalur pemanggil
// =======================================================================================

const FORBIDDEN = /\b(prepare|ensureReady|prewarm|ensureNeural[A-Za-z]*|download)\s*\(/;
const warmPaths = [
  ['app.js prefetchNextVoice', helper],
  ['app.js cancelVoicePrefetch', block(APP, /function cancelVoicePrefetch\(/)],
  ['app.js classroomPeekNextText', block(APP, /function classroomPeekNextText\(/)],
  ['app.js AudioService.prefetch', block(APP, /\n  prefetch\(next,options=\{\}\)\{/)],
  ['tutor-v3 prefetchNextBeat', nextBeat],
  ['addon TTSService.prefetch', slPrefetchMethod],
  ['addon Controller.prefetchNextScript', nextScript],
  ['library warmNext', warmNext],
  ['library dispatchBlock', dispatchSource],
  ['library blockAt', blockAtSource],
  ['library planBlock', block(LIB, /function planBlock\(/)],
  ['library scheduleBlockHighlight', scheduleSource]
];
warmPaths.forEach(([name, body]) => {
  check(`e1 ${name} tidak menyentuh prepare()/ensureReady()/prewarm()`,
    body.length > 0 && !FORBIDDEN.test(body),
    body.length ? (body.match(FORBIDDEN) || []).join(',') : 'blok tidak ditemukan');
});

check('e2 berkas mesin suara tidak diubah dari sisi pemanggil (kontraknya sudah selesai)',
  /prefetch\s*\(/.test(read('features/neural-voice/fiezel-voice-say.js')) &&
  typeof PROSODY.planUtterance === 'function',
  'kontrak prefetch() dan planUtterance() harus tetap ada');

// =======================================================================================
// LAPORAN
// =======================================================================================

const report = {
  gate: 'voice-callsite-prefetch',
  generatedAt: new Date().toISOString(),
  status: failed ? 'FAIL' : 'PASS',
  sources: [
    'reports/voice-v1-audit.md#1',
    'reports/voice-v5-prefetch.md#3',
    'reports/voice-v3-chunk.md#3',
    'reports/voice-v2-player.md#1'
  ],
  // Blok ini SENGAJA tidak lagi bernama `measured` dengan dua angka telanjang. Bentuk lamanya
  // (`jedaTerdengarSebelumMs: 4510.7` / `jedaTerdengarSesudahMs: 797.2`) menaruh metrik V5
  // ke dalam laporan gerbang V6 tanpa menyebut metriknya, patternnya, atau angka mana yang
  // berlaku untuk produksi - persis perangkaian yang dilarang add-a10-kepatuhan.md KB-6.
  // Angkanya TIDAK dihapus; masing-masing sekarang membawa metrik, cara ukur, pola
  // pemanggilan, dan status produksinya sendiri.
  metrics: {
    catatan:
      'DUA metrik berbeda, jangan dirangkai jadi satu tren. jedaTerdengar = keheningan yang ' +
      'didengar murid (batas ATAS: memuat keheningan kepala/ekor PCM yang dipangkas pemutar). ' +
      'jedaPenjadwalan = selisih bunyi-selesai ke bunyi-berikutnya-dijadwalkan.',
    v5MesinPrefetch: {
      metrik: 'jedaTerdengar (meanAudibleGapMs)',
      diukurBagaimana: 'reports/voice-v5-data/harness-door.html + measure_door.py, mesin supertonic-3 lokal',
      data: 'reports/voice-v5-data/door-measurements.json',
      pola: 'pintu suara per kalimat',
      sebelumMs: 4510.7,
      sesudahMs: 797.2,
      mengukurPekerjaan: 'V5 - prefetch() sampai ke mesin neural lokal. BUKAN pekerjaan sisi pemanggil yang dijaga gerbang ini.',
      berlakuUntukProduksi: false
    },
    v6SisiPemanggil: {
      metrik: 'jedaPenjadwalan (meanSchedulingGapMs)',
      diukurBagaimana: 'reports/voice-v6-data/harness-callers.html + measure_callers.py',
      data: 'reports/voice-v6-data/caller-measurements.json',
      pola: 'satu kalimat per panggilan - classroom, tutor, flashcards, kuis',
      sebelumMs: 3750.6,
      sesudahMs: 449.1,
      porsiSunyiSebelum: 0.4769,
      porsiSunyiSesudah: 0.0969,
      mengukurPekerjaan: 'V6 - pemanggil menghangatkan item BERIKUTNYA. Inilah metrik gerbang ini.',
      berlakuUntukProduksi: 'ya untuk classroom/tutor/flashcards/kuis; TIDAK untuk narasi Library'
    },
    v6NarasiLibraryTerkirim: {
      metrik: 'jedaPenjadwalan + jedaTerdengar',
      diukurBagaimana: 'reports/voice-v6-data/measure_blocks.py pada library-books-v1.json, 18 kalimat pertama',
      data: 'reports/voice-v6-data/block-measurements.json',
      pola: 'blok bertangga LEAD_BLOCK_CHARS 80, RAMP_COVER_FACTOR 1.15 - konfigurasi yang BENAR-BENAR dikirim',
      jedaPenjadwalanMs: 560.6,
      jedaTerdengarMs: 1286.0,
      porsiSunyi: 0.126,
      suaraPertamaMs: 2816.8,
      mengukurPekerjaan: 'V6 pada pola yang dipakai Library di produksi - lebih mahal daripada 449,1 ms, dan itu angka yang berlaku.',
      berlakuUntukProduksi: true
    },
    v7NarasiLibraryTerkirim: {
      metrik: 'jedaPenjadwalan + jedaTerdengar + porsiSunyi, ketiganya terpisah',
      diukurBagaimana: 'reports/voice-v7-data/measure_v7.py - harness yang SAMA (measure_callers.py + '
        + 'harness-callers.html dari reports/voice-v6-data/), 18 kalimat pertama library-books-v1.json',
      data: 'reports/voice-v7-data/block-measurements-v7.json, -v7b.json, -v7c.json',
      pola: 'anggaran = (prevChars * SPEAK + 0,80 s) / GEN, TANPA lantai minimum - 9 blok. '
        + 'INI konfigurasi yang benar-benar dikirim ke murid sesudah V7.',
      ulangan: 5,
      blok: 9,
      jedaPenjadwalanMs: 533.5,
      jedaTerdengarMs: 1278.6,
      jedaTerdengarTerburukMs: 2072.2,
      porsiSunyi: 0.1076,
      suaraPertamaMs: 2659.5,
      totalSenyapPenjadwalanS: 4.27,
      pembandingDiSesiPeramban_YANG_SAMA: {
        pola: 'aturan V6 terkirim (lantai 80, pengali 1,15) - 10 blok',
        ulangan: 7,
        jedaPenjadwalanMs: 603.6,
        jedaTerdengarMs: 1318.8,
        jedaTerdengarTerburukMs: 3203.7,
        porsiSunyi: 0.1344,
        suaraPertamaMs: 2677.7,
        totalSenyapPenjadwalanS: 5.43
      },
      mengukurPekerjaan: 'Perbandingan hanya sah di dalam sesi peramban yang sama: mesin ini '
        + 'mengukur aturan V6 di 603,6 ms, BUKAN 560,6 ms seperti yang tercatat di '
        + 'block-measurements.json, jadi "di bawah 560,6 ms" tidak bisa dipakai sebagai lulus/gagal. '
        + 'Yang sah: -11,6% jeda penjadwalan, -20,0% porsi sunyi, -35,3% jeda terdengar TERBURUK, '
        + 'suara pertama tidak tertunda (-18,2 ms, di dalam derau).',
      berlakuUntukProduksi: true
    }
  },
  measured: {
    contohBlokAudiobook: {
      buku: book.title,
      kalimat: firstBlock.sentences.length,
      chars: firstBlock.text.length,
      chunksTeksUtuh: plan.chunks.length,
      chunksSatuKalimatPerPanggilan: perSentence
    }
  },
  counts: {
    pass: checks.filter((c) => c.status === 'PASS').length,
    fail: checks.filter((c) => c.status === 'FAIL').length
  },
  checks
};
fs.writeFileSync(path.join(ROOT, 'VOICE-CALLSITE-PREFETCH-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log('');
console.log(`FIEZEL callsite prefetch: ${report.status} (${report.counts.pass} pass, ${report.counts.fail} fail)`);
if (failed) process.exitCode = 1;
