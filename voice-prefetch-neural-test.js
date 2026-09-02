#!/usr/bin/env node
/**
 * v5 gerbang PREFETCH NEURAL — jeda antar kalimat, dan pagar 152 MB yang menjaganya.
 *
 * KENAPA BERKAS INI ADA. reports/voice-v1-audit.md §4 mengukur dengan model supertonic-3
 * sungguhan bahwa prefetch di pintu bersama BERHENTI di lapisan Puter dan tidak pernah
 * menyentuh mesin neural di perangkat. Bentuk bug-nya sama dengan keluarga bug tangga suara:
 * fungsinya BERNAMA prefetch, komentarnya menjanjikan kalimat berikutnya dihangatkan, tetapi
 * lapisan yang benar-benar dipakai untuk kalimat tanpa aset tidak pernah dipanggil. Mencocok-
 * kan kata kunci tidak menangkap kelas bug itu — satu-satunya cara adalah MENJALANKAN
 * prefetch() yang asli di dalam vm dan melihat siapa yang menyahut.
 *
 * Angka yang dijaga (audit §1): jeda terdengar 4.422 ms (skenario A, prefetch tidak sampai
 * ke neural) vs 777 ms (skenario A2, prefetch sampai ke neural).
 *
 * Tujuh janji:
 *   (a) prefetch() MEMANGGIL jalur neural lokal ketika mesin sudah prepared.
 *   (b) prefetch() TIDAK PERNAH memanggil prepare()/ensureReady()/prewarm() dalam keadaan
 *       apa pun — dibuktikan dengan tiruan yang MELEMPAR bila dipanggil. Pekerjaan
 *       spekulatif tidak boleh memulai unduhan model 152 MB tanpa persetujuan murid
 *       (reports/cf-a5, reports/voice-v1-audit.md §5 butir 1).
 *   (c) mesin belum prepared → false DENGAN TENANG, dan mesin neural tidak disentuh.
 *   (d) galat di lapisan mana pun tidak menjalar ke pemanggil: janjinya tidak pernah reject.
 *   (e) deduplikasi kunci teks kanonik: teks yang sama tidak dihangatkan dua kali.
 *   (f) batas konkurensi dihormati — ponsel kelas bawah tidak menjalankan tiga generasi.
 *   (g) urutan lapisan aset R2 → Puter → neural lokal dipertahankan, sama seperti say().
 *   (h) runtime neural menghangatkan CHUNK PERTAMA dari utterance multi-chunk, dengan
 *       position.total yang sama seperti saat utterance benar-benar dimainkan.
 *
 * Sumber: reports/voice-v1-audit.md §1/§4/§5, reports/cf-c1-konsistensi.md K10,
 * reports/cf-b4-ai-tts.md §5.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const SAY_PATH = 'features/neural-voice/fiezel-voice-say.js';
const RUNTIME_PATH = 'features/neural-voice/fiezel-neural-voice.js';
const SAY = fs.readFileSync(path.join(root, SAY_PATH), 'utf8');
const RUNTIME = require(path.join(root, RUNTIME_PATH));

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details == null ? '' : details) });
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'} - ${name}${ok ? '' : ' :: ' + details}`);
};

/**
 * Blok sumber sebuah fungsi puncak — pola yang sama dengan voice-fallback-chain-test.js:
 * potong dari deklarasinya sampai deklarasi fungsi berikutnya. Bedanya satu: fungsi di
 * fiezel-voice-say.js hidup di dalam pembungkus UMD, jadi deklarasinya MENJOROK dua spasi
 * dan pemotong yang menuntut kolom nol akan menelan seluruh sisa berkas.
 *
 * m025-232: sentinel lama untuk kekeliruan itu adalah kata `speechSynthesis` di stop(). Kata
 * itu SUDAH TIDAK ADA di mana pun (L4 dihapus), jadi penjaga yang memakainya kini lulus
 * secara hampa - ia tidak lagi bisa membedakan potongan yang benar dari potongan yang
 * menelan seluruh berkas. Sentinelnya diganti di bawah dengan sesuatu yang MASIH hidup di
 * luar blok prefetch: `emitSpeech(` milik jalur say().
 */
function sourceBlock(name, source) {
  const start = source.search(new RegExp(`(?:function|async function)\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n[ \t]*(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}

const hang = () => new Promise(() => {});

/**
 * Harness prefetch. Semua lapisan dapat dinyalakan/dimatikan, dan setiap sentuhan dicatat
 * dalam SATU jejak berurutan supaya urutan lapisan bisa diuji, bukan hanya jumlahnya.
 *
 * prepare/ensureReady/prewarm sengaja MELEMPAR: kalau jalur prefetch menyentuh salah satu
 * dari mereka, gerbang ini gagal keras, bukan diam-diam mencatat angka.
 */
function harness(options) {
  const opts = options || {};
  const calls = {
    trace: [], assets: 0, puter: 0, neural: 0,
    prepare: 0, ensureReady: 0, prewarm: 0,
    subtitleCreate: 0, subtitleBegin: 0, translate: 0,
    synth: 0, status: 0
  };
  const guard = (label) => () => {
    calls[label]++;
    throw new Error(`${label}_must_never_be_called_from_prefetch_it_starts_the_152MB_download`);
  };
  const sandbox = {
    console,
    setTimeout, clearTimeout,
    fetch: () => Promise.resolve({ ok: true }),
    FiezelAudioResolver: opts.noAssets ? undefined : {
      resolve() { return Promise.resolve({ state: 'MISSING' }); },
      playUrl() { return Promise.resolve(false); },
      prefetch() {
        calls.assets++; calls.trace.push('assets');
        if (opts.assetsHang) return hang();
        if (opts.assetsThrows) return Promise.reject(new Error('manifest_offline'));
        return Promise.resolve(!!opts.assetsCached);
      },
      status() { return { manifest: { loaded: true, assetCount: 1 } }; },
      stop() {}
    },
    FiezelPuterVoice: opts.noPuter ? undefined : {
      speak() { return Promise.reject(new Error('not_used_here')); },
      creditStatus() { return { outOfCredit: !!opts.puterOutOfCredit }; },
      prefetch() {
        calls.puter++; calls.trace.push('puter');
        if (opts.puterHang) return hang();
        if (opts.puterThrows) return Promise.reject(new Error('puter_offline'));
        return Promise.resolve(!!opts.puterWarms);
      },
      stop() {}
    },
    FiezelVoiceRuntime: opts.noRuntime ? undefined : {
      status() { calls.status++; return { prepared: !!opts.prepared, ready: !!opts.prepared }; },
      speak() { return Promise.reject(new Error('not_used_here')); },
      prefetch(text) {
        calls.neural++; calls.trace.push('neural:' + text);
        if (opts.neuralHang) return hang();
        if (opts.neuralThrows) return Promise.reject(new Error('neural_generate_failed'));
        if (opts.neuralSyncThrows) throw new Error('neural_threw_synchronously');
        return Promise.resolve(opts.neuralWarms !== false);
      },
      prepare: guard('prepare'),
      ensureReady: guard('ensureReady'),
      prewarm: guard('prewarm'),
      stop() {}
    },
    // Prefetch tidak boleh menyentuh pita subtitle maupun penerjemah: itu jatah AI murid.
    FiezelSubtitle: {
      create() {
        calls.subtitleCreate++;
        return { begin() { calls.subtitleBegin++; }, update() {}, end() {} };
      }
    },
    FiezelSubtitleTranslate: { translate() { calls.translate++; return Promise.resolve('baris'); } },
    // Prefetch juga tidak boleh membunyikan L4: suara peramban tidak punya cache, jadi
    // "menghangatkannya" sama dengan berbicara lebih awal.
    speechSynthesis: { speak() { calls.synth++; }, cancel() {} },
    SpeechSynthesisUtterance: function (text) { this.text = text; }
  };
  vm.createContext(sandbox);
  vm.runInContext(SAY, sandbox, { timeout: 5000, filename: SAY_PATH });
  return { api: sandbox.FiezelVoiceSay, calls };
}

const settled = (promise) => promise.then(
  (value) => ({ ok: true, value }),
  (error) => ({ ok: false, error: String((error && error.message) || error) })
);
const idle = () => new Promise((resolve) => setTimeout(resolve, 5));

/**
 * Harness runtime neural sungguhan. Prosody palsu hanya menentukan rencana chunk secara
 * deterministik; yang diuji tetap createVoiceService().prefetch()/speak() produksi.
 */
function runtimeHarness() {
  const FIRST = 'First chunk ends naturally.';
  const SECOND = 'Second chunk continues without loading at the seam.';
  const THIRD = 'Third chunk closes the longer passage.';
  const TWO = `${FIRST} ${SECOND}`;
  const THREE = `${FIRST} ${SECOND} ${THIRD}`;
  const calls = [];
  const plans = new Map([
    [TWO, [
      { text: FIRST, boundary: 'sentence' },
      { text: SECOND, boundary: 'paragraph' }
    ]],
    [THREE, [
      { text: FIRST, boundary: 'sentence' },
      { text: SECOND, boundary: 'sentence' },
      { text: THIRD, boundary: 'paragraph' }
    ]]
  ]);
  const prosody = {
    CHUNK_CHARS: { target: 220, max: 260 },
    groupChunks(text) {
      const plan = plans.get(String(text));
      if (plan) return plan.map((entry) => ({ ...entry }));
      return [{ text: String(text), boundary: 'paragraph' }];
    },
    gapAfter() { return 220; },
    punctuate(text) { return String(text); },
    planUtterance(text) {
      const plan = plans.get(String(text)) || [{ text: String(text), boundary: 'paragraph' }];
      return { stats: { sentences: plan.length } };
    }
  };
  const adapter = {
    kind: 'test-neural',
    generate(text, options) {
      calls.push({ text: String(text), position: { ...(options && options.position) } });
      return Promise.resolve({ audio: Float32Array.from([0, 0.1, -0.1, 0]), sampling_rate: 24000 });
    }
  };
  const service = RUNTIME.createVoiceService({
    config: {
      voices: { fiezelPrimary: 'test-voice' },
      limits: { maxInputChars: 3600, chunkMaxChars: 260, chunkTargetChars: 220 }
    },
    adapter,
    env: { FIEZEL_VERSION: 'prefetch-regression' },
    streamSentences: true,
    prosody
  });
  return { service, calls, FIRST, SECOND, THIRD, TWO, THREE };
}

(async function run() {
  // -------------------------------------------------------------------------------------
  // (a) + (g) mesin prepared: jalur neural TERCAPAI, dan urutannya aset → Puter → neural
  // -------------------------------------------------------------------------------------
  const warm = harness({ prepared: true });
  const warmOut = await settled(warm.api.prefetch('The market opens at eight.', { speed: 1 }));
  check('(a) prefetch() memanggil jalur neural lokal ketika mesin sudah prepared',
    warmOut.ok && warmOut.value === true && warm.calls.neural === 1,
    `hasil=${JSON.stringify(warmOut)} neural.prefetch=${warm.calls.neural}`);
  check('(g) urutan lapisan dipertahankan: aset R2 → Puter → neural lokal',
    warm.calls.trace.length === 3 &&
      warm.calls.trace[0] === 'assets' && warm.calls.trace[1] === 'puter' &&
      String(warm.calls.trace[2]).startsWith('neural:'),
    JSON.stringify(warm.calls.trace));
  check('(g) teks yang dihangatkan neural adalah teks yang diminta, apa adanya',
    warm.calls.trace[2] === 'neural:The market opens at eight.',
    JSON.stringify(warm.calls.trace[2]));
  check('(b) prepared: prepare()/ensureReady()/prewarm() tidak pernah disentuh',
    warm.calls.prepare === 0 && warm.calls.ensureReady === 0 && warm.calls.prewarm === 0,
    `prepare=${warm.calls.prepare} ensureReady=${warm.calls.ensureReady} prewarm=${warm.calls.prewarm}`);
  check('prefetch tidak menyentuh subtitle, penerjemah, maupun suara peramban',
    warm.calls.subtitleBegin === 0 && warm.calls.translate === 0 && warm.calls.synth === 0,
    `subtitle.begin=${warm.calls.subtitleBegin} translate=${warm.calls.translate} speechSynthesis=${warm.calls.synth}`);

  // Lapisan yang lebih tinggi BERHASIL → neural tidak dibangunkan sia-sia.
  const cached = harness({ prepared: true, assetsCached: true });
  const cachedOut = await settled(cached.api.prefetch('Cached line.', {}));
  check('(g) aset R2 yang sudah hangat menghentikan tangga: Puter dan neural tidak dipanggil',
    cachedOut.value === true && cached.calls.puter === 0 && cached.calls.neural === 0,
    `hasil=${cachedOut.value} puter=${cached.calls.puter} neural=${cached.calls.neural}`);

  const viaPuter = harness({ prepared: true, puterWarms: true });
  await settled(viaPuter.api.prefetch('Puter line.', {}));
  check('(g) Puter yang berhasil menghentikan tangga sebelum neural',
    viaPuter.calls.puter === 1 && viaPuter.calls.neural === 0,
    `puter=${viaPuter.calls.puter} neural=${viaPuter.calls.neural}`);

  // -------------------------------------------------------------------------------------
  // (c) mesin BELUM prepared → false dengan tenang, mesin neural tidak disentuh
  // -------------------------------------------------------------------------------------
  const fresh = harness({ prepared: false });
  const freshOut = await settled(fresh.api.prefetch('New learner sentence.', {}));
  check('(c) mesin belum prepared → prefetch mengembalikan false DENGAN TENANG',
    freshOut.ok && freshOut.value === false,
    JSON.stringify(freshOut));
  check('(c) mesin belum prepared → mesin neural sama sekali tidak disentuh',
    fresh.calls.neural === 0,
    `neural.prefetch=${fresh.calls.neural}`);
  check('(b) PENJAGA 152 MB: belum prepared pun tidak ada prepare()/ensureReady()/prewarm()',
    fresh.calls.prepare === 0 && fresh.calls.ensureReady === 0 && fresh.calls.prewarm === 0,
    `prepare=${fresh.calls.prepare} ensureReady=${fresh.calls.ensureReady} prewarm=${fresh.calls.prewarm}`);
  check('(c) penjaga dibaca dari status(), bukan ditebak',
    fresh.calls.status >= 1,
    `status()=${fresh.calls.status}`);

  // Semua lapisan atas gagal DAN mesin belum prepared: keadaan murid baru yang luring.
  const offlineFresh = harness({ prepared: false, assetsThrows: true, puterThrows: true });
  const offlineOut = await settled(offlineFresh.api.prefetch('Offline new learner.', {}));
  check('(b/c) murid baru + luring: tetap false tenang, tidak ada unduhan model yang dimulai',
    offlineOut.ok && offlineOut.value === false && offlineFresh.calls.neural === 0 &&
      offlineFresh.calls.prepare === 0 && offlineFresh.calls.ensureReady === 0 && offlineFresh.calls.prewarm === 0,
    `hasil=${JSON.stringify(offlineOut)} neural=${offlineFresh.calls.neural} prepare=${offlineFresh.calls.prepare}`);

  // -------------------------------------------------------------------------------------
  // (d) galat tidak pernah menjalar ke pemanggil
  // -------------------------------------------------------------------------------------
  const allFail = harness({ prepared: true, assetsThrows: true, puterThrows: true, neuralThrows: true });
  const allOut = await settled(allFail.api.prefetch('Everything fails.', {}));
  check('(d) semua lapisan gagal → resolve false, TIDAK reject ke pemanggil',
    allOut.ok && allOut.value === false,
    JSON.stringify(allOut));
  check('(d) resolver yang gagal tidak melewatkan lapisan di bawahnya',
    allFail.calls.puter === 1 && allFail.calls.neural === 1,
    `puter=${allFail.calls.puter} neural=${allFail.calls.neural}`);

  const syncThrow = harness({ prepared: true, neuralSyncThrows: true });
  const syncOut = await settled(syncThrow.api.prefetch('Sync throw.', {}));
  check('(d) mesin neural yang MELEMPAR sinkron juga tidak menjalar',
    syncOut.ok && syncOut.value === false,
    JSON.stringify(syncOut));

  const noneAtAll = harness({ noAssets: true, noPuter: true, noRuntime: true });
  const noneOut = await settled(noneAtAll.api.prefetch('Nothing available.', {}));
  check('(d) tanpa satu pun modul suara: false tenang, bukan galat',
    noneOut.ok && noneOut.value === false,
    JSON.stringify(noneOut));
  const emptyOut = await settled(noneAtAll.api.prefetch('   ', {}));
  check('(d) teks kosong dijawab false tanpa menyentuh apa pun',
    emptyOut.ok && emptyOut.value === false,
    JSON.stringify(emptyOut));

  const creditGone = harness({ prepared: true, puterOutOfCredit: true });
  await settled(creditGone.api.prefetch('Out of credit.', {}));
  check('kuota: memo kredit Puter habis → Puter dilewati, neural tetap dihangatkan',
    creditGone.calls.puter === 0 && creditGone.calls.neural === 1,
    `puter=${creditGone.calls.puter} neural=${creditGone.calls.neural}`);

  // -------------------------------------------------------------------------------------
  // (e) deduplikasi kunci teks kanonik
  // -------------------------------------------------------------------------------------
  const dedupe = harness({ prepared: true, neuralHang: true });
  const first = dedupe.api.prefetch('Same sentence, twice.', { speed: 1 });
  const second = dedupe.api.prefetch('Same sentence, twice.', { speed: 1 });
  await idle();
  check('(e) teks yang sama tidak dihangatkan dua kali',
    dedupe.calls.assets === 1 && dedupe.calls.neural === 1,
    `assets=${dedupe.calls.assets} neural=${dedupe.calls.neural}`);
  check('(e) pemanggil kedua menerima janji yang sama, bukan penolakan',
    first === second,
    'dedup harus mengembalikan janji berjalan, supaya pemanggil kedua tidak menganggapnya gagal');

  const canonical = harness({ prepared: true, neuralHang: true });
  canonical.api.prefetch('Same   Sentence, twice.', { speed: 1 });
  canonical.api.prefetch('same sentence, twice.', { speed: 1 });
  await idle();
  check('(e) kunci dedup KANONIK: beda spasi dan huruf besar-kecil tetap satu prefetch',
    canonical.calls.neural === 1,
    `neural=${canonical.calls.neural}`);

  const distinct = harness({ prepared: true, neuralHang: true });
  distinct.api.prefetch('Sentence one.', { speed: 1 });
  distinct.api.prefetch('Sentence two.', { speed: 1 });
  await idle();
  check('(e) dedup tidak kebablasan: dua teks BERBEDA tetap dua prefetch',
    distinct.calls.neural === 2,
    `neural=${distinct.calls.neural}`);

  // Slot dibebaskan setelah selesai, jadi kalimat yang sama boleh dihangatkan lagi
  // pada putaran narasi berikutnya (replay buku).
  const reuse = harness({ prepared: true });
  await settled(reuse.api.prefetch('Replayed sentence.', {}));
  await settled(reuse.api.prefetch('Replayed sentence.', {}));
  check('(e) slot dedup dibebaskan setelah selesai (replay tetap bisa menghangatkan)',
    reuse.calls.neural === 2,
    `neural=${reuse.calls.neural}`);

  // -------------------------------------------------------------------------------------
  // (f) batas konkurensi
  // -------------------------------------------------------------------------------------
  const limit = Number((/PREFETCH_MAX_INFLIGHT\s*=\s*(\d+)/.exec(SAY) || [])[1]);
  check('(f) batas konkurensi dinyatakan dan kecil (1-2), supaya ponsel murah tidak tersedak',
    limit >= 1 && limit <= 2,
    `PREFETCH_MAX_INFLIGHT=${limit}`);

  const busy = harness({ prepared: true, neuralHang: true });
  const started = [];
  for (let i = 0; i < limit + 2; i += 1) started.push(busy.api.prefetch(`Line number ${i}.`, {}));
  await idle();
  check('(f) prefetch melebihi batas TIDAK memasuki lapisan mana pun',
    busy.calls.assets === limit && busy.calls.neural === limit,
    `batas=${limit} assets=${busy.calls.assets} neural=${busy.calls.neural}`);
  const overflow = await settled(started[started.length - 1]);
  check('(f) prefetch yang ditolak batas menjawab false tenang, bukan mengantre selamanya',
    overflow.ok && overflow.value === false,
    JSON.stringify(overflow));

  // Slot harus kembali setelah prefetch selesai; kalau tidak, prefetch mati sesudah dua
  // kalimat pertama dan jeda 4.422 ms kembali diam-diam.
  const cycling = harness({ prepared: true });
  for (let i = 0; i < limit + 3; i += 1) await settled(cycling.api.prefetch(`Cycle ${i}.`, {}));
  check('(f) slot konkurensi dikembalikan setelah selesai (prefetch tidak mati sesudah 2 kalimat)',
    cycling.calls.neural === limit + 3,
    `neural=${cycling.calls.neural} diharapkan=${limit + 3}`);

  // -------------------------------------------------------------------------------------
  // (h) runtime neural: prefetch utterance multi-chunk harus menghangatkan chunk PERTAMA
  // -------------------------------------------------------------------------------------
  const multi = runtimeHarness();
  const multiWarm = await settled(multi.service.prefetch(multi.TWO, {
    voice: 'test-voice', speed: 1, lang: 'en-US'
  }));
  check('(h1) runtime prefetch multi-chunk berhasil, bukan menolak karena chunks.length > 1',
    multiWarm.ok && multiWarm.value === true,
    JSON.stringify(multiWarm));
  check('(h2) prefetch multi-chunk merender HANYA chunk pertama, bukan seluruh blok',
    multi.calls.length === 1 && multi.calls[0].text === multi.FIRST,
    JSON.stringify(multi.calls));
  check('(h3) render hangat membawa position.total utterance asli agar prosodi tidak berubah',
    multi.calls.length === 1 && multi.calls[0].position.index === 0 && multi.calls[0].position.total === 2,
    JSON.stringify(multi.calls[0]));
  const played = await settled(multi.service.speak(multi.TWO, {
    voice: 'test-voice', speed: 1, lang: 'en-US', allowFallback: false
  }));
  check('(h4) speak() mengonsumsi chunk hangat tanpa mensintesis chunk pertama dua kali',
    played.ok && multi.calls.length === 2 &&
      multi.calls[0].text === multi.FIRST && multi.calls[1].text === multi.SECOND,
    JSON.stringify(multi.calls));

  // Kunci hangat juga harus mengandung total posisi. Teks pembuka yang kebetulan sama tidak
  // boleh memakai audio dari utterance 2-chunk ketika sekarang ia membuka utterance 3-chunk.
  const collision = runtimeHarness();
  await settled(collision.service.prefetch(collision.TWO, {
    voice: 'test-voice', speed: 1, lang: 'en-US'
  }));
  const collisionPlayed = await settled(collision.service.speak(collision.THREE, {
    voice: 'test-voice', speed: 1, lang: 'en-US', allowFallback: false
  }));
  check('(h5) warm key membedakan position.total: audio pembuka 2-chunk tidak dipakai untuk utterance 3-chunk',
    collisionPlayed.ok && collision.calls.length === 4 &&
      collision.calls[0].text === collision.FIRST && collision.calls[0].position.total === 2 &&
      collision.calls[1].text === collision.FIRST && collision.calls[1].position.total === 3,
    JSON.stringify(collision.calls));

  // -------------------------------------------------------------------------------------
  // Penjaga statis: jalur prefetch tidak menyebut satu pun pemicu unduhan
  // -------------------------------------------------------------------------------------
  const prefetchBlocks = ['prefetch', 'prefetchWithLocal', 'prefetchWithEngine', 'prefetchKey']
    .map((name) => sourceBlock(name, SAY)).join('\n');
  const live = prefetchBlocks.split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');
  check('penjaga statis: blok prefetch benar-benar ada di sumber',
    /function prefetchWithLocal\(/.test(SAY) && /function prefetchWithEngine\(/.test(SAY) && live.length > 200,
    `${live.length} karakter kode hidup`);
  check('penjaga statis: jalur prefetch tidak menyebut prepare/ensureReady/prewarm sama sekali',
    !/\bprepare\s*\(/.test(live) && !/\bensureReady\s*\(/.test(live) && !/\bprewarm\s*\(/.test(live),
    'prefetch spekulatif tidak boleh memulai unduhan 152 MB tanpa persetujuan murid');
  check('penjaga statis: prefetch neural lewat localEngine(), bukan FiezelVoiceRuntime langsung',
    /localEngine\(\)/.test(sourceBlock('prefetchWithLocal', SAY)) &&
      !/FiezelVoiceRuntime/.test(live),
    'pintu bersama itulah yang membaca status().prepared || ready');
  check('penjaga statis: pemotong blok masih memotong, bukan menelan seluruh berkas',
    live.length > 0 && !/emitSpeech\(/.test(live) && !/function stop\(/.test(live),
    'sentinel pengganti speechSynthesis (m025-232): emitSpeech() hidup di jalur say(), bukan prefetch');
  check('penjaga statis: jalur prefetch tidak membunyikan apa pun dan tidak menyentuh subtitle',
    !/speechSynthesis/.test(live) && !/subtitles\(\)/.test(live) && !/prepareSubtitle/.test(live),
    'prefetch menghangatkan, tidak memutar - dan tidak boleh membakar jatah terjemahan');
  check('penjaga statis: localEngine() tetap membaca prepared || ready (pagar tidak dilonggarkan)',
    /st\.prepared \|\| st\.ready/.test(SAY),
    'ini pagar yang sama yang dijaga voice-fallback-chain-test.js');

  process.on('exit', () => {
    const report = {
      status: failed ? 'NOT READY' : 'PASS',
      gate: 'voice-prefetch-neural',
      sources: [
        'reports/voice-v1-audit.md#1',
        'reports/voice-v1-audit.md#4',
        'reports/voice-v1-audit.md#5',
        'reports/cf-c1-konsistensi.md#K10'
      ],
      measured: {
        jedaTerdengarTanpaPrefetchNeuralMs: 4422,
        jedaTerdengarDenganPrefetchNeuralMs: 777,
        prefetchMaxInflight: limit
      },
      counts: {
        pass: checks.filter((entry) => entry.status === 'PASS').length,
        fail: checks.filter((entry) => entry.status === 'FAIL').length
      },
      checks
    };
    fs.writeFileSync(path.join(root, 'VOICE-PREFETCH-NEURAL-REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log('');
    console.log(`FIEZEL prefetch neural: ${report.status} (${report.counts.pass} pass, ${report.counts.fail} fail)`);
    if (failed) process.exitCode = 1;
  });
}()).catch((error) => {
  console.error('gerbang prefetch neural meledak:', error);
  process.exitCode = 1;
});