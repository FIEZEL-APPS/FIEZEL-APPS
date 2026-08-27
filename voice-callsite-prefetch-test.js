#!/usr/bin/env node
/**
 * V6 GERBANG SISI PEMANGGIL (voice-callsite-prefetch-test.js)
 *
 * KENAPA BERKAS INI ADA. Tiga agen sebelumnya memperbaiki MESIN suara: prefetch() kini
 * benar-benar menyentuh mesin neural lokal (reports/voice-v5-prefetch.md, jeda terukur
 * 4.510 ms -> 797 ms), planUtterance() menerima TEKS UTUH dan mengembalikan potongan
 * bertanda batas (reports/voice-v3-chunk.md), dan pemutar menyambung antrean lintas
 * panggilan sambil memangkas senyap (reports/voice-v2-player.md). Ketiganya tidak berbuah
 * apa pun selama PEMANGGIL tetap mengirim satu kalimat per panggilan dan tidak pernah
 * menghangatkan kalimat berikutnya - itulah daftar yang ditulis voice-v5-prefetch.md §3.
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

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
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
check('c1 narasi Library mengirim teks blok utuh dalam SATU say()',
  /speak\(\{ en: block\.text, id: block\.translation \}\)/.test(narrate) &&
  !/session\.current\(\)/.test(narrate),
  'narrate harus mengirim block.text, bukan session.current() per kalimat');
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
  LIB.match(/var RAMP_COVER_FACTOR = [\d.]+;/)[0] +
  LIB.match(/var RAMP_SETTLED_CHARS = \d+;/)[0] +
  block(LIB, /function nextBlockBudget\(previousChars\)/) +
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
 * Tangga anggaran harus TETAP di bawah batas penutup terukur: sebuah blok hanya boleh
 * tumbuh sampai ~1,15x panjang blok sebelumnya, karena itulah rasio antara laju bicara
 * (0,065 s/char) dan laju generasi (0,056 s/char) yang diukur di
 * reports/voice-v6-data/. Tangga yang melampaui rasio ini terukur membayar 7.351 ms di
 * batas pertama - itu bukan hipotesis, itu hasil percobaan yang ditolak.
 */
const budgets = [0, 60, 120, 200, 223, 224, 500].map((prev) => [prev, sandbox.nextBlockBudget(prev)]);
check('c9 pertumbuhan anggaran tidak melewati batas penutup terukur (1,15x)',
  budgets.every(([prev, next]) => (prev >= 224 ? next === 900 : next <= Math.max(80, Math.ceil(prev * 1.15)))) &&
  sandbox.nextBlockBudget(224) === 900 && sandbox.nextBlockBudget(0) === sandbox.LEAD_BLOCK_CHARS,
  JSON.stringify(budgets));

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
  /translation: picked\.map/.test(blockAtSource) && /id: block\.translation/.test(narrate),
  'block.translation harus dibangun dari pasangan {en,id} lalu dioper ke say()');

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
  measured: {
    jedaTerdengarSebelumMs: 4510.7,
    jedaTerdengarSesudahMs: 797.2,
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
