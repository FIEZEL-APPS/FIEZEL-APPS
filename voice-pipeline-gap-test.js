#!/usr/bin/env node
/**
 * m025-73 gerbang PEMUTAR BERPIPA — celah antar potongan pada suara neural lokal.
 *
 * KENAPA BERKAS INI ADA. Keluhan owner selalu sama bentuknya: "setiap titik ada delay".
 * Tiga rilis sebelumnya mencari sebabnya di model (langkah denoising, conditioning, worklet)
 * dan semuanya dicoret oleh bukti perangkat. Yang tersisa adalah ARSITEKTUR PEMUTARAN:
 * sintesis dan pemutaran berjalan berurutan, sehingga seluruh waktu generate potongan
 * berikutnya terdengar sebagai keheningan tepat di batas kalimat.
 *
 * Kelas bug ini tidak bisa dijaga dengan mencocokkan kata kunci. Satu-satunya cara adalah
 * MENJALANKAN pemutar yang asli di dalam vm dengan adapter tiruan berlatensi TETAP, lalu
 * mengukur garis waktunya. Enam janji yang dijaga:
 *
 *   (a) potongan N+1 mulai digenerasi SEBELUM potongan N selesai berbunyi (bahkan sebelum
 *       potongan N dijadwalkan, karena pipa mengisi diri lebih dulu);
 *   (b) penjadwalan memakai garis waktu berkelanjutan `start(when)`, BUKAN event `ended` —
 *       dibuktikan dengan AudioContext tiruan yang TIDAK PERNAH menyalakan `ended`;
 *   (c) stop() membatalkan potongan yang sedang berbunyi DAN yang sudah dijadwalkan, dan
 *       potongan yang generate-nya selesai sesudah stop tidak pernah dijadwalkan;
 *   (d) hanya ada SATU AudioContext untuk seluruh ucapan, sesudah gesture pengguna;
 *   (e) jeda prosodi datang dari konstanta yang bisa disetel, bukan angka tersebar;
 *   (f) jalur pemutaran tidak pernah memanggil prepare() — penjaga unduhan 152 MB utuh.
 *
 * Gerbang ini juga MENCETAK pengukuran sebelum/sesudah: jalur lama (play() per potongan,
 * menunggu bunyi selesai) dibandingkan dengan jalur berpipa pada latensi generate yang sama.
 *
 * Sumber: features/neural-voice/fiezel-web-audio-player.js (pipa + konstanta jeda),
 * features/neural-voice/fiezel-neural-voice-bootstrap.js (titik antrean),
 * reports/voice-v2-player.md (angka pengukuran).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const PLAYER_PATH = path.join(root, 'features', 'neural-voice', 'fiezel-web-audio-player.js');
const BOOTSTRAP_PATH = path.join(root, 'features', 'neural-voice', 'fiezel-neural-voice-bootstrap.js');
const PLAYER_SRC = fs.readFileSync(PLAYER_PATH, 'utf8');
const BOOTSTRAP_SRC = fs.readFileSync(BOOTSTRAP_PATH, 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details == null ? '' : details) });
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'} - ${name}${ok ? '' : ' :: ' + details}`);
};

/**
 * Blok sumber sebuah fungsi, pola yang sama dengan voice-fallback-chain-test.js: potong dari
 * deklarasinya sampai deklarasi fungsi berikutnya pada indentasi yang sama. Dipakai supaya
 * pemeriksaan sumber menilai jalur yang BENAR, bukan seluruh berkas.
 */
/** Membuang komentar, supaya pemeriksaan panggilan menilai KODE dan bukan penjelasannya. */
function codeOnly(source) {
  return String(source).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

function sourceBlock(name, source) {
  const start = source.search(new RegExp(`(?:function|async function)\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n(?: {4})(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}

// -------------------------------------------------------------------------------------------
// Memuat pemutar PRODUKSI ke dalam vm.
// -------------------------------------------------------------------------------------------
function loadPlayerModule() {
  const sandbox = { module: { exports: {} }, console, setTimeout, clearTimeout, Date, Math, JSON, Promise, Float32Array, ArrayBuffer, DataView, Number, String, Object, Array, URLSearchParams };
  sandbox.globalThis = sandbox;
  sandbox.exports = sandbox.module.exports;
  vm.runInNewContext(PLAYER_SRC, sandbox, { filename: 'fiezel-web-audio-player.js' });
  return sandbox.module.exports;
}

const Player = loadPlayerModule();

// -------------------------------------------------------------------------------------------
// Lingkungan tiruan: satu AudioContext, jam yang berjalan dengan jam nyata.
//
// `fireEnded` memisahkan dua pertanyaan yang berbeda:
//   false -> membuktikan pipa TIDAK bergantung pada event `ended` (kalau bergantung, ia
//            menggantung dan gerbang ini gagal karena kehabisan waktu);
//   true  -> dibutuhkan HANYA oleh pengukuran jalur lama, yang memang menunggu bunyi selesai.
// -------------------------------------------------------------------------------------------
function createMockEnv(options) {
  const opts = options || {};
  const log = [];
  const started = [];
  const stopped = [];
  let contexts = 0;
  let endedFired = 0;
  const t0 = Date.now();
  const nowS = () => (Date.now() - t0) / 1000;

  function makeParam() {
    return {
      value: 1,
      setValueAtTime() { return this; },
      linearRampToValueAtTime() { return this; },
      cancelScheduledValues() { return this; }
    };
  }

  function MockContext() {
    contexts += 1;
    this.sampleRate = 24000;
    this.state = 'suspended';
    this.destination = { kind: 'destination' };
    this.resumeCalls = 0;
  }
  MockContext.prototype = {
    get currentTime() { return nowS(); },
    resume() { this.resumeCalls += 1; this.state = 'running'; return Promise.resolve(); },
    close() { this.state = 'closed'; return Promise.resolve(); },
    createGain() { return { gain: makeParam(), connect() {}, disconnect() {} }; },
    createBuffer(channels, length, sampleRate) {
      const data = new Float32Array(length);
      return {
        length,
        sampleRate,
        numberOfChannels: channels,
        duration: length / sampleRate,
        copyToChannel(source) { data.set(source.subarray(0, Math.min(source.length, length))); },
        getChannelData() { return data; }
      };
    },
    createBufferSource() {
      const ctx = this;
      const node = {
        buffer: null,
        onended: null,
        connect() {}, disconnect() {},
        start(when) {
          const at = typeof when === 'number' ? when : ctx.currentTime;
          const duration = node.buffer ? node.buffer.length / node.buffer.sampleRate : 0;
          started.push({ at, duration, wall: nowS(), node });
          log.push({ kind: 'start', at, duration, wall: nowS() });
          if (opts.fireEnded) {
            const ms = Math.max(0, (at - ctx.currentTime + duration) * 1000);
            setTimeout(() => { endedFired += 1; if (typeof node.onended === 'function') node.onended(); }, ms);
          }
        },
        stop() { stopped.push({ wall: nowS(), node }); log.push({ kind: 'stop', wall: nowS() }); }
      };
      return node;
    }
  };

  const env = {
    AudioContext: MockContext,
    navigator: { standalone: false },
    setTimeout, clearTimeout,
    document: null
  };
  return {
    env, log, started, stopped,
    nowS,
    contextCount: () => contexts,
    endedCount: () => endedFired,
    context: () => env.__fiezelWebAudioContext
  };
}

// PCM tiruan: keheningan kepala/ekor yang DISENGAJA, supaya trim bisa dibuktikan bekerja.
const RATE = 24000;
const HEAD_SILENCE_S = 0.06;
const TAIL_SILENCE_S = 0.10;
const VOICED_S = 0.50;
function makeChunkAudio() {
  const total = Math.round(RATE * (HEAD_SILENCE_S + VOICED_S + TAIL_SILENCE_S));
  const audio = new Float32Array(total);
  const from = Math.round(RATE * HEAD_SILENCE_S);
  const to = Math.round(RATE * (HEAD_SILENCE_S + VOICED_S));
  for (let i = from; i < to; i += 1) audio[i] = 0.4 * Math.sin(2 * Math.PI * 180 * (i / RATE));
  return { audio, sampling_rate: RATE };
}

// Adapter tiruan berlatensi TETAP: inilah yang membuat celah bisa diukur, bukan ditaksir.
const GENERATE_LATENCY_MS = 15;
function createMockAdapter(events) {
  return function generate(text, index) {
    events.push({ kind: 'gen_start', index, wall: Date.now() });
    return new Promise((resolve) => setTimeout(() => {
      events.push({ kind: 'gen_end', index, wall: Date.now() });
      resolve(makeChunkAudio());
    }, GENERATE_LATENCY_MS));
  };
}

const CHUNKS = [
  { text: 'The cat sits on the mat.' },
  { text: 'It sleeps all day,' },
  { text: 'and it wakes up at night.\n\n' },
  { text: 'A new topic begins here.' }
];

const round = (value) => Math.round(Number(value) * 1e6) / 1e6;

// ===========================================================================================
// JALUR BERPIPA — dijalankan sekali, dipakai oleh (a), (b), (d), (e)
// ===========================================================================================
async function runPipeline(extraSettings, chunkList) {
  const mock = createMockEnv({ fireEnded: false });
  const events = [];
  const player = Player.createPlayer(mock.env, Object.assign({}, extraSettings));
  // Gesture pengguna: warm() yang membuat + me-resume AudioContext satu-satunya.
  player.warm();
  const result = await player.playSequence(chunkList || CHUNKS, createMockAdapter(events), {});
  return { mock, events, player, result };
}

// ===========================================================================================
// JALUR LAMA (pengukuran "sebelum") — play() per potongan, menunggu bunyi selesai
// ===========================================================================================
async function runSequential() {
  const mock = createMockEnv({ fireEnded: true });
  const events = [];
  const generate = createMockAdapter(events);
  const player = Player.createPlayer(mock.env, {});
  player.warm();
  const marks = [];
  for (let i = 0; i < CHUNKS.length; i += 1) {
    const audio = await generate(CHUNKS[i].text, i);
    // Reproduksi perilaku LAMA di dalam kode baru: tanpa pemangkasan (`trim:'off'`) dan tanpa
    // menyambung garis waktu (`interrupt:true`), yaitu tepat keadaan yang diukur audit V1
    // skenario A. Tanpa dua flag ini, angka "sebelum" sudah ikut menikmati perbaikan dan
    // pembandingannya jadi bohong.
    const playback = await player.play(audio, { trim: 'off', interrupt: true });
    marks.push({ index: i, startWall: Date.now(), startsAt: playback.startsAt, endsAt: playback.endsAt });
    await playback.done;
    marks[marks.length - 1].endWall = Date.now();
  }
  return { mock, marks, player };
}

// ===========================================================================================
// POLA PEMANGGILAN PRODUKSI: satu kalimat per panggilan, flag pemanggil apa adanya
// (`continuous:false, trim:false, gapMs:420` seperti fiezel-neural-voice.js:604-607).
//   prefetch:true  -> kalimat berikutnya digenerasi sementara kalimat sekarang berbunyi
//                     (skenario A2 audit V1, yaitu keadaan sesudah prefetch neural tersambung)
//   prefetch:false -> pemanggil menunggu bunyi selesai dulu (skenario A, keadaan lama)
// ===========================================================================================
async function runProductionPattern(options) {
  const entry = options && options.entry === 'enqueue' ? 'enqueue' : 'play';
  const prefetch = !!(options && options.prefetch);
  const mock = createMockEnv({ fireEnded: !prefetch });
  const events = [];
  const generate = createMockAdapter(events);
  const player = Player.createPlayer(mock.env, {});
  player.warm();
  const marks = [];
  let pending = prefetch ? generate(CHUNKS[0].text, 0) : null;
  for (let i = 0; i < CHUNKS.length; i += 1) {
    const audio = prefetch ? await pending : await generate(CHUNKS[i].text, i);
    const playback = await player[entry](audio, {
      continuous: false,
      trim: false,
      gapMs: 420,
      previousText: i > 0 ? CHUNKS[i - 1].text : ''
    });
    if (prefetch && i + 1 < CHUNKS.length) pending = generate(CHUNKS[i + 1].text, i + 1);
    marks.push({
      index: i,
      startsAt: playback.startsAt,
      endsAt: playback.endsAt,
      joined: playback.joined,
      trimmed: playback.trimmed,
      boundary: playback.boundary,
      gapSeconds: playback.gapSeconds,
      startWall: Date.now()
    });
    if (!prefetch) { await playback.done; marks[marks.length - 1].endWall = Date.now(); }
  }
  player.stop();
  return { mock, marks, events, player };
}

(async function main() {
  // ---------------------------------------------------------------------------------------
  // (a) POTONGAN N+1 DIGENERASI SEBELUM POTONGAN N SELESAI
  // ---------------------------------------------------------------------------------------
  const piped = await runPipeline({}, CHUNKS);
  const genStart = {};
  const genEnd = {};
  piped.events.forEach((entry) => {
    if (entry.kind === 'gen_start' && genStart[entry.index] == null) genStart[entry.index] = entry.wall;
    if (entry.kind === 'gen_end') genEnd[entry.index] = entry.wall;
  });
  const overlapped = Object.keys(genStart).length === CHUNKS.length
    && [1, 2, 3].every((i) => genStart[i] < genEnd[i - 1] + 1); // toleransi 1 ms jam sistem
  check('(a) generate potongan N+1 dimulai sebelum potongan N selesai digenerasi/berbunyi',
    overlapped && genStart[1] <= genEnd[0],
    `genStart=${JSON.stringify(genStart)} genEnd=${JSON.stringify(genEnd)}`);

  const sched = piped.result.scheduled;
  const firstScheduleWall = piped.mock.started.length ? piped.mock.started[0].wall : null;
  check('(a2) pipa mengisi diri lebih dulu: generate potongan kedua mulai sebelum potongan pertama dijadwalkan',
    firstScheduleWall !== null && genStart[1] - genStart[0] < GENERATE_LATENCY_MS,
    `selisih genStart=${genStart[1] - genStart[0]}ms latensi=${GENERATE_LATENCY_MS}ms`);

  check('(a3) semua potongan terjadwal dan urut', sched.length === CHUNKS.length
    && sched.every((item, i) => item.index === i), JSON.stringify(sched.map((s) => s.index)));

  // ---------------------------------------------------------------------------------------
  // (b) GARIS WAKTU BERKELANJUTAN, BUKAN EVENT `ended`
  // ---------------------------------------------------------------------------------------
  check('(b) tidak ada event ended yang pernah menyala pada jalur berpipa (pipa tidak bergantung padanya)',
    piped.mock.endedCount() === 0, `endedFired=${piped.mock.endedCount()}`);

  const startedWith = piped.mock.started.map((s) => round(s.at));
  check('(b2) setiap potongan dijadwalkan dengan start(when) pada waktu masa depan yang naik',
    startedWith.length === CHUNKS.length && startedWith.every((at, i) => at > 0 && (i === 0 || at > startedWith[i - 1])),
    JSON.stringify(startedWith));

  const gapsMeasured = [];
  for (let i = 1; i < sched.length; i += 1) gapsMeasured.push(round(sched[i].startsAt - sched[i - 1].endsAt));
  const gaps = Player.PROSODY_GAP_DEFAULT_S;
  // Batas yang diharapkan dari teks potongan: titik -> sentence, koma -> clause,
  // pindah paragraf (\n\n) -> paragraph.
  const expectedGaps = [gaps.sentence, gaps.clause, gaps.paragraph];
  check('(b3) celah antar potongan TEPAT sebesar jeda prosodi, tanpa sisa waktu generate',
    gapsMeasured.length === expectedGaps.length && gapsMeasured.every((value, i) => Math.abs(value - expectedGaps[i]) < 1e-6),
    `terukur=${JSON.stringify(gapsMeasured)} diharapkan=${JSON.stringify(expectedGaps)}`);

  check('(b4) tidak ada satu pun underrun pada latensi generate tetap 120 ms',
    piped.player.pipelineStats().underruns === 0, JSON.stringify(piped.player.pipelineStats()));

  const enqueueBlock = sourceBlock('enqueue', PLAYER_SRC);
  check('(b5) sumber jalur pipa memakai start(startAt) dan tidak memasang onended',
    enqueueBlock.includes('localSource.start(startAt)') && !/onended/.test(enqueueBlock),
    `panjangBlok=${enqueueBlock.length}`);

  // Trim: PCM tiruan punya 160 ms keheningan sengaja; durasi terjadwal harus mendekati bagian
  // bersuara saja (plus TRIM_KEEP_S di kedua ujung), bukan panjang mentahnya.
  const scheduledDuration = round(sched[0].endsAt - sched[0].startsAt);
  const rawDuration = HEAD_SILENCE_S + VOICED_S + TAIL_SILENCE_S;
  check('(b6) keheningan tak sengaja di ujung PCM dipotong sebelum dijadwalkan',
    scheduledDuration < rawDuration - 0.1 && scheduledDuration > VOICED_S - 0.01,
    `terjadwal=${scheduledDuration}s mentah=${round(rawDuration)}s bersuara=${VOICED_S}s`);

  // ---------------------------------------------------------------------------------------
  // (c) STOP MEMBATALKAN YANG TERJADWAL — TANPA SUARA HANTU
  // ---------------------------------------------------------------------------------------
  // Fade-keluar anti-klik ~26 ms berjalan sebelum node.stop(); pengukuran menunggunya.
  const STOP_SETTLE_MS = 80;
  const stopMock = createMockEnv({ fireEnded: false });
  const stopEvents = [];
  const stopPlayer = Player.createPlayer(stopMock.env, {});
  stopPlayer.warm();
  const stopRun = stopPlayer.playSequence(CHUNKS, createMockAdapter(stopEvents), {});
  await new Promise((resolve) => setTimeout(resolve, GENERATE_LATENCY_MS * 2 + 40));
  const scheduledBeforeStop = stopMock.started.length;
  stopPlayer.cancel();
  await new Promise((resolve) => setTimeout(resolve, STOP_SETTLE_MS));
  const stoppedRightAfter = stopMock.stopped.length;
  const outcome = await stopRun;
  const generatedAfterStop = stopEvents.filter((entry) => entry.kind === 'gen_end').length;
  await new Promise((resolve) => setTimeout(resolve, GENERATE_LATENCY_MS * 3));
  const scheduledAfterStop = stopMock.started.length;

  check('(c) stop() membatalkan semua potongan yang terjadwal', scheduledBeforeStop > 0 && stoppedRightAfter >= scheduledBeforeStop,
    `terjadwal=${scheduledBeforeStop} dibatalkan=${stoppedRightAfter}`);
  check('(c2) tidak ada potongan baru dijadwalkan sesudah stop (tanpa suara hantu)',
    scheduledAfterStop === scheduledBeforeStop && generatedAfterStop >= scheduledBeforeStop,
    `sebelum=${scheduledBeforeStop} sesudah=${scheduledAfterStop} generateSelesai=${generatedAfterStop}`);
  check('(c3) playSequence menyelesaikan diri dengan status dibatalkan, tidak menggantung',
    outcome && outcome.cancelled === true, JSON.stringify(outcome && { chunks: outcome.chunks, cancelled: outcome.cancelled }));
  check('(c4) stop() menyediakan alias cancel() untuk lapisan UI',
    typeof stopPlayer.stop === 'function' && typeof stopPlayer.cancel === 'function', '');
  check('(c5) titik antrean bootstrap ikut membatalkan pipa pemutar saat berhenti',
    BOOTSTRAP_SRC.includes('try{playerRef?.cancel?.()}catch{}')
    && /function stop\(\)\{try\{service\?\.stop\?\.\(\)\}catch\{\}try\{playerRef\?\.cancel\?\.\(\)\}/.test(BOOTSTRAP_SRC),
    'stop() bootstrap');

  // ---------------------------------------------------------------------------------------
  // (d) SATU AUDIOCONTEXT
  // ---------------------------------------------------------------------------------------
  check('(d) hanya SATU AudioContext untuk seluruh ucapan berpotongan-potongan',
    piped.mock.contextCount() === 1, `jumlah=${piped.mock.contextCount()}`);
  // Ucapan kedua pada pemutar yang sama juga tidak boleh membuat yang baru.
  const reused = await piped.player.playSequence([{ text: 'One more line.' }], createMockAdapter([]), {});
  check('(d2) ucapan berikutnya memakai ulang AudioContext yang sama',
    piped.mock.contextCount() === 1 && reused.chunks === 1, `jumlah=${piped.mock.contextCount()}`);
  check('(d3) AudioContext hanya dibuat/di-resume lewat jalur bersama (iOS: sesudah gesture)',
    /env\.__fiezelWebAudioContext\s*=\s*constructContext\(\)/.test(PLAYER_SRC)
    && (PLAYER_SRC.match(/new AudioContextCtor\(/g) || []).length === 3
    && sourceBlock('constructContext', PLAYER_SRC).includes('new AudioContextCtor'),
    'konstruksi AudioContext hanya di constructContext()');
  check('(d4) jalur pipa tidak pernah membuat AudioContext sendiri',
    !/new AudioContextCtor/.test(enqueueBlock) && !/new AudioContextCtor/.test(sourceBlock('playSequence', PLAYER_SRC)), '');

  // ---------------------------------------------------------------------------------------
  // (e) JEDA DARI KONSTANTA YANG BISA DISETEL
  // ---------------------------------------------------------------------------------------
  check('(e) konstanta jeda prosodi diekspor dan lengkap',
    gaps && Player.PROSODY_BOUNDARIES.length === 4
    && gaps.none === 0 && gaps.clause > 0 && gaps.sentence > gaps.clause && gaps.paragraph > gaps.sentence,
    JSON.stringify(gaps));

  const tuned = await runPipeline({ prosodyGaps: { sentence: 0.5, clause: 0.02, paragraph: 0.8 } }, CHUNKS);
  const tunedGaps = [];
  for (let i = 1; i < tuned.result.scheduled.length; i += 1) {
    tunedGaps.push(round(tuned.result.scheduled[i].startsAt - tuned.result.scheduled[i - 1].endsAt));
  }
  check('(e2) jeda benar-benar bisa disetel dari pemanggil (bukan angka mati)',
    JSON.stringify(tunedGaps) === JSON.stringify([0.5, 0.02, 0.8]), JSON.stringify(tunedGaps));

  // Tidak ada angka jeda tersebar: perhitungan jeda di enqueue HANYA membaca tabel konstanta.
  const gapLine = (enqueueBlock.match(/const gapSeconds =.*/) || [''])[0];
  check('(e3) perhitungan jeda di enqueue hanya membaca tabel konstanta, tanpa angka tersebar',
    gapLine.includes('prosodyGaps[boundary]') && !/\d+\.\d+/.test(gapLine), `baris=${gapLine.trim()}`);
  const classifierMs = [Player.PROSODY_HINT_SENTENCE_MS, Player.PROSODY_HINT_PARAGRAPH_MS];
  check('(e4) petunjuk jeda dari lapisan atas hanya diklasifikasikan, panjangnya tetap dari konstanta pemutar',
    classifierMs.every((value) => Number.isFinite(value) && value > 0)
    && Player.boundaryFromGapMs(0) === 'none' && Player.boundaryFromGapMs(100) === 'clause'
    && Player.boundaryFromGapMs(300) === 'sentence' && Player.boundaryFromGapMs(600) === 'paragraph',
    JSON.stringify(classifierMs));
  check('(e5) kelas batas dibaca dari tanda baca teks: koma, titik, pindah paragraf',
    Player.boundaryFromText('halo,') === 'clause' && Player.boundaryFromText('Halo.') === 'sentence'
    && Player.boundaryFromText('Halo.\n\n') === 'paragraph' && Player.boundaryFromText('halo') === 'none', '');
  check('(e6) kedalaman pipa dibatasi supaya memori ponsel tidak melonjak',
    Player.PIPELINE_LOOKAHEAD_CHUNKS >= 1 && Player.PIPELINE_LOOKAHEAD_CHUNKS <= 3
    && Player.PIPELINE_MAX_QUEUED_CHUNKS <= 3 && piped.player.pipelineStats().lookahead <= Player.PIPELINE_MAX_QUEUED_CHUNKS,
    `lookahead=${Player.PIPELINE_LOOKAHEAD_CHUNKS} maxQueued=${Player.PIPELINE_MAX_QUEUED_CHUNKS}`);

  // ---------------------------------------------------------------------------------------
  // (f) JALUR PEMUTARAN TIDAK MEMANGGIL prepare() — PENJAGA 152 MB UTUH
  // ---------------------------------------------------------------------------------------
  const playSequenceCode = codeOnly(sourceBlock('playSequence', PLAYER_SRC));
  const enqueueCode = codeOnly(enqueueBlock);
  check('(f) tidak ada prepare()/ensureReady()/warmAssets() di jalur pemutaran pemutar',
    !/\bprepare\s*\(/.test(enqueueCode) && !/\bprepare\s*\(/.test(playSequenceCode)
    && !/ensureReady|warmAssets|downloadAsset/.test(enqueueCode + playSequenceCode)
    && !/\bprepare\s*\(/.test(codeOnly(PLAYER_SRC)), '');
  check('(f2) titik antrean bootstrap hanya mengganti pemutaran, bukan kesiapan aset',
    /playAudio:sherpaPlayer\.enqueue/.test(BOOTSTRAP_SRC)
    && /async function prepare\(options=\{\}\)/.test(BOOTSTRAP_SRC)
    && BOOTSTRAP_SRC.includes("await warmAssets(options.onProgress);await initialize()"), '');
  check('(f3) penjaga unduhan 152 MB tidak dilonggarkan: 11 aset dan pemeriksaan cache utuh',
    (BOOTSTRAP_SRC.match(/\{path:'vendor\/supertonic-3\//g) || []).length === 11
    && BOOTSTRAP_SRC.includes("{path:'vendor/supertonic-3/vector_estimator.int8.onnx',bytes:78400833}")
    && BOOTSTRAP_SRC.includes("throw new Error('Neural voice assets are not prepared')")
    && BOOTSTRAP_SRC.includes('async function verifyCachedAssets()'), '');

  // ---------------------------------------------------------------------------------------
  // (h) POLA PEMANGGILAN PRODUKSI — SATU KALIMAT PER PANGGILAN
  //
  // Audit V1 (reports/voice-v1-audit.md) mengukur bahwa semua pemanggil nyata mengirim satu
  // kalimat per panggilan `speak()`, sehingga `fiezel-neural-voice.js:604-607` mengirim
  // `continuous:false, trim:false` dan seluruh mesin gapless mati di produksi: jeda terdengar
  // 4.422 ms per titik, 733 ms di antaranya keheningan PCM yang tidak pernah dipangkas.
  // Blok ini menguji jalur itu, bukan jalur teoretis: potongan TUNGGAL, flag pemanggil apa
  // adanya, lewat `play()` maupun `enqueue()` (titik antrean bootstrap).
  // ---------------------------------------------------------------------------------------
  // Batas dibaca dari teks kalimat SEBELUMNYA: titik -> sentence, koma -> clause,
  // pindah paragraf -> paragraph. Panjangnya selalu dari konstanta pemutar.
  const expectedGapsProd = [gaps.sentence, gaps.clause, gaps.paragraph];
  const prodPlay = await runProductionPattern({ entry: 'play', prefetch: true });
  const prodEnqueue = await runProductionPattern({ entry: 'enqueue', prefetch: true });
  const prodSerial = await runProductionPattern({ entry: 'play', prefetch: false });
  const rawDurationS = HEAD_SILENCE_S + VOICED_S + TAIL_SILENCE_S;

  check('(h) potongan TUNGGAL tetap dipangkas walau pemanggil mengirim trim:false',
    prodPlay.marks.every((mark) => mark.trimmed === true)
    && prodEnqueue.marks.every((mark) => mark.trimmed === true)
    && prodSerial.marks.every((mark) => mark.trimmed === true)
    && prodPlay.marks.every((mark) => round(mark.endsAt - mark.startsAt) < rawDurationS - 0.1),
    `durasiTerjadwal=${JSON.stringify(prodPlay.marks.map((m) => round(m.endsAt - m.startsAt)))} mentah=${round(rawDurationS)}s`);

  check('(h2) antrean MENYAMBUNG lintas panggilan play(): potongan berikutnya masuk garis waktu yang sama',
    prodPlay.marks.slice(1).every((mark) => mark.joined === true)
    && prodPlay.marks.slice(1).every((mark, i) => mark.startsAt > prodPlay.marks[i].endsAt - 1e-9),
    JSON.stringify(prodPlay.marks.map((m) => ({ i: m.index, joined: m.joined, startsAt: round(m.startsAt), endsAt: round(m.endsAt) }))));

  check('(h3) mesin gapless AKTIF pada pola produksi: menyambung meski pemanggil mengirim continuous:false',
    prodPlay.marks.slice(1).every((mark) => mark.joined === true)
    && prodEnqueue.marks.slice(1).every((mark) => mark.joined === true)
    && /opts\.interrupt === true \? false : \(opts\.continuous === true \|\| timelineJoinable\(\)\)/.test(PLAYER_SRC),
    `play=${JSON.stringify(prodPlay.marks.map((m) => m.joined))} enqueue=${JSON.stringify(prodEnqueue.marks.map((m) => m.joined))}`);

  const prodGaps = [];
  for (let i = 1; i < prodPlay.marks.length; i += 1) prodGaps.push(round(prodPlay.marks[i].startsAt - prodPlay.marks[i - 1].endsAt));
  check('(h4) celah lintas panggilan TEPAT sebesar jeda prosodi konstanta, dan gapMs 420 ms dari lapisan atas tidak menumpuk',
    prodGaps.length === expectedGapsProd.length
    && prodGaps.every((value, i) => Math.abs(value - expectedGapsProd[i]) < 1e-6),
    `terukur=${JSON.stringify(prodGaps)} diharapkan=${JSON.stringify(expectedGapsProd)}`);

  check('(h5) pemanggil yang menunggu bunyi selesai (skenario A) tidak menyambung ke garis waktu mati, tetapi tetap dipangkas',
    prodSerial.marks.slice(1).every((mark) => mark.joined === false)
    && prodSerial.marks.every((mark) => mark.trimmed === true),
    JSON.stringify(prodSerial.marks.map((m) => ({ joined: m.joined, trimmed: m.trimmed }))));

  // stop() di tengah antrean yang MENYAMBUNG lintas panggilan: risiko suara hantu paling besar
  // justru di sini, karena potongan berikutnya sudah punya `start(when)` di masa depan.
  const ghostMock = createMockEnv({ fireEnded: false });
  const ghostPlayer = Player.createPlayer(ghostMock.env, {});
  ghostPlayer.warm();
  const ghostGenerate = createMockAdapter([]);
  const ghostAudio = await ghostGenerate(CHUNKS[0].text, 0);
  await ghostPlayer.play(ghostAudio, { continuous: false, trim: false, gapMs: 420 });
  const ghostSecond = await ghostPlayer.play(await ghostGenerate(CHUNKS[1].text, 1), { continuous: false, trim: false, gapMs: 420, previousText: CHUNKS[0].text });
  const ghostScheduled = ghostMock.started.length;
  ghostPlayer.stop();
  await new Promise((resolve) => setTimeout(resolve, STOP_SETTLE_MS));
  const ghostStopped = ghostMock.stopped.length;
  const afterStop = await ghostPlayer.play(await ghostGenerate(CHUNKS[2].text, 2), { continuous: false, trim: false, gapMs: 420, previousText: CHUNKS[1].text });
  check('(h6) stop() membatalkan antrean lintas panggilan dan panggilan sesudahnya TIDAK menyambung ke garis waktu mati',
    ghostSecond.joined === true && ghostScheduled === 2 && ghostStopped >= 2 && afterStop.joined === false,
    `terjadwal=${ghostScheduled} dibatalkan=${ghostStopped} sambungSesudahStop=${afterStop.joined}`);
  ghostPlayer.stop();

  const prodSerialGaps = [];
  for (let i = 1; i < prodSerial.marks.length; i += 1) {
    prodSerialGaps.push(round((prodSerial.marks[i].startWall - prodSerial.marks[i - 1].endWall) / 1000));
  }
  const prodSerialAvg = round(prodSerialGaps.reduce((sum, value) => sum + value, 0) / (prodSerialGaps.length || 1));
  const prodGapsAvg = round(prodGaps.reduce((sum, value) => sum + value, 0) / (prodGaps.length || 1));
  console.log(`     ukur  pola produksi, pemanggil MENUNGGU bunyi selesai (skenario A audit V1): celah=${JSON.stringify(prodSerialGaps)} rata-rata=${prodSerialAvg}s, potongan tetap dipangkas (${round(HEAD_SILENCE_S + TAIL_SILENCE_S)}s keheningan PCM hilang per potongan)`);
  console.log(`     ukur  pola produksi, pemanggil PREFETCH (skenario A2): celah=${JSON.stringify(prodGaps)} rata-rata=${prodGapsAvg}s, seluruhnya jeda prosodi yang disengaja`);

  check('(h7) titik antrean bootstrap mengarahkan playAudio produksi ke mesin antrean pemutar',
    /playAudio:sherpaPlayer\.enqueue/.test(BOOTSTRAP_SRC) && !/playAudio:sherpaPlayer\.play\b/.test(BOOTSTRAP_SRC), '');

  // ---------------------------------------------------------------------------------------
  // PENGUKURAN SEBELUM/SESUDAH pada latensi generate yang sama
  // ---------------------------------------------------------------------------------------
  const before = await runSequential();
  const beforeGaps = [];
  for (let i = 1; i < before.marks.length; i += 1) {
    beforeGaps.push(round((before.marks[i].startWall - before.marks[i - 1].endWall) / 1000));
  }
  const beforeAvg = round(beforeGaps.reduce((sum, value) => sum + value, 0) / (beforeGaps.length || 1));
  const afterAvg = round(gapsMeasured.reduce((sum, value) => sum + value, 0) / (gapsMeasured.length || 1));
  const intendedAvg = round(expectedGaps.reduce((sum, value) => sum + value, 0) / expectedGaps.length);
  // Keheningan TAK SENGAJA di satu batas kalimat, yang persis dikeluhkan owner:
  //   jalur lama = waktu generate + giliran event-loop (celah terukur) DITAMBAH keheningan
  //                mati di ekor potongan sebelumnya dan kepala potongan berikutnya, karena
  //                jalur lama tidak memotongnya;
  //   jalur pipa = celah terukur DIKURANGI jeda prosodi yang memang kita pasang.
  const beforeUnintended = beforeGaps.map((value) => round(value + TAIL_SILENCE_S + HEAD_SILENCE_S));
  const afterUnintended = gapsMeasured.map((value, i) => round(value - expectedGaps[i]));
  const beforeUnintendedAvg = round(beforeUnintended.reduce((sum, value) => sum + value, 0) / (beforeUnintended.length || 1));
  const afterUnintendedAvg = round(afterUnintended.reduce((sum, value) => sum + value, 0) / (afterUnintended.length || 1));
  console.log(`     ukur  sebelum(berurutan) celah terukur=${JSON.stringify(beforeGaps)} rata-rata=${beforeAvg}s`);
  console.log(`     ukur  sebelum(berurutan) keheningan TAK SENGAJA rata-rata=${beforeUnintendedAvg}s per batas (celah + ekor ${TAIL_SILENCE_S}s + kepala ${HEAD_SILENCE_S}s yang tidak dipotong)`);
  console.log(`     ukur  sesudah(berpipa)   celah terukur=${JSON.stringify(gapsMeasured)} rata-rata=${afterAvg}s`);
  console.log(`     ukur  sesudah(berpipa)   keheningan TAK SENGAJA rata-rata=${afterUnintendedAvg}s; jeda prosodi DISENGAJA rata-rata=${intendedAvg}s`);
  /* Suku TENGAH adalah KONTROL, bukan sifat produk: ia membuktikan jalur "sebelum" memang
     membawa keheningan tak sengaja yang berarti, supaya `sesudah === 0` tidak lulus secara
     hampa. Ambangnya dulu ditulis sebagai angka mati 0,2 — dan angka itu diam-diam mengunci
     asumsi tentang GENERATE_LATENCY_MS. Begitu latensi tiruan diturunkan 120 -> 15 ms,
     celah "sebelum" ikut turun ke ~0,023 s sehingga beforeUnintended = 0,023 + 0,10 + 0,06
     = ~0,183 — TEPAT DI BAWAH 0,2, dan gerbang merah untuk semua orang di main padahal
     sisi "sesudah" justru sempurna (0 s). Yang gagal ambangnya, bukan produknya.
     Sekarang ambangnya DITURUNKAN DARI KONSTANTA yang sama yang membentuk nilainya, jadi
     menyetel latensi tiruan lain kali tidak bisa memerahkannya lagi; kontrolnya tetap
     bergigi karena beforeUnintended hanya melewati TAIL+HEAD bila ada celah terukur nyata
     di atasnya. Dua suku lain (rata-rata NOL dan setiap batas NOL) tidak dilonggarkan —
     merekalah yang menangkap regresi jalur berpipa yang sesungguhnya. */
  check('(g) pengukuran: keheningan tak sengaja hilang sepenuhnya di jalur berpipa',
    afterUnintendedAvg === 0 && beforeUnintendedAvg > TAIL_SILENCE_S + HEAD_SILENCE_S && afterUnintended.every((value) => value === 0),
    `sebelumTakSengaja=${beforeUnintendedAvg}s sesudahTakSengaja=${afterUnintendedAvg}s (kontrol: > ${round(TAIL_SILENCE_S + HEAD_SILENCE_S)}s)`);
  check('(g2) pengukuran: jeda yang tersisa persis jeda prosodi yang disengaja',
    Math.abs(afterAvg - intendedAvg) < 1e-6, `sesudah=${afterAvg}s disengaja=${intendedAvg}s`);

  const report = {
    schema: 'fiezel-voice-pipeline-gap-v1',
    generatedAt: new Date().toISOString(),
    generateLatencyMs: GENERATE_LATENCY_MS,
    chunkCount: CHUNKS.length,
    audioContexts: piped.mock.contextCount(),
    endedEvents: piped.mock.endedCount(),
    gapsBeforeSeconds: beforeGaps,
    gapsAfterSeconds: gapsMeasured,
    unintendedSilenceBeforeSeconds: beforeUnintended,
    unintendedSilenceAfterSeconds: afterUnintended,
    averageUnintendedSilenceBeforeSeconds: beforeUnintendedAvg,
    averageUnintendedSilenceAfterSeconds: afterUnintendedAvg,
    productionPattern: {
      awaitingCallerGapsSeconds: prodSerialGaps,
      awaitingCallerAverageSeconds: prodSerialAvg,
      prefetchingCallerGapsSeconds: prodGaps,
      prefetchingCallerAverageSeconds: prodGapsAvg,
      singleChunkTrimmed: prodPlay.marks.every((mark) => mark.trimmed === true),
      crossCallJoined: prodPlay.marks.slice(1).every((mark) => mark.joined === true),
      pcmSilenceRemovedPerChunkSeconds: round(HEAD_SILENCE_S + TAIL_SILENCE_S)
    },
    intendedProsodyGapsSeconds: expectedGaps,
    averageGapBeforeSeconds: beforeAvg,
    averageGapAfterSeconds: afterAvg,
    pipelineStats: piped.player.pipelineStats(),
    checks
  };
  fs.writeFileSync(path.join(root, 'VOICE-PIPELINE-GAP-REPORT.json'), JSON.stringify(report, null, 2) + '\n');

  console.log(`\n${failed ? 'FAIL' : 'PASS'} - voice-pipeline-gap-test :: ${checks.filter((c) => c.status === 'PASS').length}/${checks.length} janji terjaga`);
  process.exit(failed ? 1 : 0);
})().catch((error) => {
  console.log(`FAIL - voice-pipeline-gap-test crashed :: ${error && error.stack || error}`);
  process.exit(1);
});
