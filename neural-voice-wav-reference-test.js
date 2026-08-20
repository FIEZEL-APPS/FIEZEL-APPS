/**
 * FIEZEL audio lane gate — pembanding pemutaran WAV dan saklar A/B di dalam aplikasi.
 *
 * Kenapa ini ada. Tiga rilis berturut-turut (m025-45, m025-48, m025-51) dinyatakan gagal oleh
 * pemilik, dan tidak satu pun bisa menjawab pertanyaan paling dasar: cacatnya di suara yang
 * dihasilkan model, atau di jalur pemutaran FIEZEL? A/B `raw` vs `conditioned` tidak bisa
 * menjawabnya karena keduanya tetap melewati WebAudio, worklet, penjadwalan, dan fade yang sama.
 *
 * `wavref` memutar PCM yang persis sama lewat elemen <audio> biasa. Bersih di sini sementara
 * mode normal pecah berarti cacatnya ada di jalur pemutaran kita. Pecah di keduanya berarti
 * bukan penjadwalan kita penyebabnya. Itulah pembanding yang selama ini hilang.
 *
 * Bagian kedua sama pentingnya: mode harus bisa dipilih DI DALAM aplikasi terpasang, karena
 * bentuk URL-nya tidak bisa dipakai di perangkat yang punya cacatnya.
 */
const assert = require('assert');
const fs = require('fs');
const player = require('./features/neural-voice/fiezel-web-audio-player.js');

let failures = 0;
const tests = [];
function test(name, fn) { tests.push([name, fn]); }

const { URLSearchParams } = require('url');

function storeEnv(extra) {
  const store = new Map();
  return Object.assign({
    URLSearchParams,
    location: { search: '' },
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k)
    },
    _store: store
  }, extra || {});
}

test('wavref adalah mode yang sah, dan mode asing tetap ditolak', () => {
  assert.ok(player.PCM_DIAGNOSTIC_MODES.includes('wavref'));
  assert.ok(player.PCM_DIAGNOSTIC_MODES.includes('raw') && player.PCM_DIAGNOSTIC_MODES.includes('conditioned'));
  const env = { location: { search: '?fiezelPcmMode=wavref' }, URLSearchParams };
  assert.strictEqual(player.pcmDiagnosticMode(env, {}), 'wavref');
  assert.strictEqual(player.pcmDiagnosticMode({ location: { search: '?fiezelPcmMode=ngawur' }, URLSearchParams }, {}), '');
});

test('mode tersimpan membuat A/B bisa dijalankan di aplikasi terpasang', () => {
  // Tanpa ini, A/B hanya bisa dipicu lewat parameter URL - dan tab Safari berhenti di gerbang
  // notifikasi, sehingga percobaannya tidak pernah bisa dijalankan di perangkat yang bermasalah.
  const env = storeEnv();
  assert.strictEqual(player.pcmDiagnosticMode(env, {}), '', 'tanpa apa-apa berarti produksi normal');
  assert.strictEqual(player.setPcmDiagnosticMode('wavref', env), 'wavref');
  assert.strictEqual(player.pcmDiagnosticMode(env, {}), 'wavref');
  assert.strictEqual(player.setPcmDiagnosticMode('', env), '', 'kosong berarti kembali normal');
  assert.strictEqual(player.pcmDiagnosticMode(env, {}), '');
});

test('urutan penentuan tidak mengubah perilaku yang sudah ada', () => {
  const env = storeEnv();
  player.setPcmDiagnosticMode('raw', env);
  env.location.search = '?fiezelPcmMode=conditioned';
  assert.strictEqual(player.pcmDiagnosticMode(env, {}), 'conditioned', 'URL tetap menang atas mode tersimpan');
  assert.strictEqual(player.pcmDiagnosticMode(env, { pcmDiagnosticMode: 'wavref' }), 'wavref', 'opsi eksplisit menang atas keduanya');
});

test('mode diagnostik tidak hidup lebih lama dari pengujiannya', () => {
  const env = storeEnv();
  const at = Date.now();
  player.setPcmDiagnosticMode('wavref', env, at);
  assert.strictEqual(player.pcmDiagnosticMode(env, {}, at + 60000), 'wavref');
  assert.strictEqual(player.pcmDiagnosticMode(env, {}, at + player.PCM_DIAGNOSTIC_TTL_MS + 1), '',
    'mode kedaluwarsa kembali ke jalur produksi');
});

test('storage rusak atau tidak ada tidak menjatuhkan apa pun', () => {
  const env = storeEnv();
  env._store.set(player.PCM_DIAGNOSTIC_STORAGE_KEY, 'bukan json');
  assert.strictEqual(player.pcmDiagnosticMode(env, {}), '');
  const tanpaStorage = { URLSearchParams, location: { search: '' } };
  assert.strictEqual(player.setPcmDiagnosticMode('wavref', tanpaStorage), '');
  assert.strictEqual(player.pcmDiagnosticMode(tanpaStorage, {}), '');
});

test('WAV yang dihasilkan benar-benar WAV, bukan byte asal-asalan', () => {
  const samples = Float32Array.from([0, 0.5, -0.5, 1, -1]);
  const buffer = player.encodeWav(samples, 24000);
  const view = new DataView(buffer);
  const ascii = (offset, length) => Array.from({ length }, (_, i) => String.fromCharCode(view.getUint8(offset + i))).join('');
  assert.strictEqual(ascii(0, 4), 'RIFF');
  assert.strictEqual(ascii(8, 4), 'WAVE');
  assert.strictEqual(ascii(12, 4), 'fmt ');
  assert.strictEqual(ascii(36, 4), 'data');
  assert.strictEqual(view.getUint16(22, true), 1, 'mono');
  assert.strictEqual(view.getUint32(24, true), 24000, 'sample rate ikut sumbernya');
  assert.strictEqual(view.getUint16(34, true), 16, '16 bit');
  assert.strictEqual(view.getUint32(40, true), samples.length * 2, 'panjang data cocok');
  assert.strictEqual(buffer.byteLength, 44 + samples.length * 2);
  assert.strictEqual(view.getInt16(44, true), 0);
  assert.strictEqual(view.getInt16(46, true), Math.round(0.5 * 32767));
  // Nilai di luar rentang dipotong, bukan dibiarkan meluap menjadi bunyi keras.
  assert.strictEqual(view.getInt16(44 + 3 * 2, true), 32767);
  assert.strictEqual(view.getInt16(44 + 4 * 2, true), -32767);
});

test('nilai tidak wajar tidak menghasilkan WAV yang meledak', () => {
  const buffer = player.encodeWav(Float32Array.from([NaN, Infinity, -Infinity, 5, -5]), 24000);
  const view = new DataView(buffer);
  assert.strictEqual(view.getInt16(44, true), 0, 'NaN menjadi diam, bukan derau');
  assert.strictEqual(view.getInt16(46, true), 32767);
  assert.strictEqual(view.getInt16(48, true), -32767);
});

test('pembanding benar-benar melewati Web Audio, bukan hanya mengaku begitu', async () => {
  // Kalau jalur ini masih menuntut AudioContext, ia bukan pembanding independen. Env di sini
  // sengaja TIDAK punya AudioContext sama sekali.
  const played = [];
  const revoked = [];
  let ended = null;
  const env = storeEnv({
    Audio: function () {
      this.play = async () => { played.push(this.src); setTimeout(() => this.onended && this.onended(), 0); };
      this.pause = () => {};
      Object.defineProperty(this, 'onended', { set(fn) { ended = fn; }, get() { return ended; }, configurable: true });
    },
    Blob: function (parts, options) { this.parts = parts; this.type = options && options.type; this.size = parts[0].byteLength; },
    URL: { createObjectURL: blob => 'blob:wav-' + blob.size + '-' + blob.type, revokeObjectURL: url => revoked.push(url) },
    navigator: {},
    FiezelVoiceDiagnostics: { record: entry => { env._diag = entry; return true; }, begin() {}, end() {} }
  });
  player.setPcmDiagnosticMode('wavref', env);

  const instance = player.createPlayer(env, {});
  const samples = new Float32Array(2400).fill(0.25);
  const handle = await instance.play({ audio: samples, sampling_rate: 24000 }, {});
  assert.strictEqual(handle.diagnosticMode, 'wavref');
  assert.strictEqual(played.length, 1, 'PCM dimainkan lewat elemen media');
  assert.ok(/^blob:wav-\d+-audio\/wav$/.test(played[0]), 'yang dimainkan adalah blob WAV');
  assert.strictEqual(env._diag.playbackPath, 'media_element', 'telemetri menyebut jalur yang dipakai');
  assert.strictEqual(env._diag.contextSampleRate, null, 'tidak ada AudioContext yang terlibat');
  assert.ok(env._diag.wavBytes > 4800, 'ukuran WAV tercatat sebagai bukti isinya nyata');
  await handle.done;
  assert.strictEqual(revoked.length, 1, 'URL blob dilepas setelah selesai, bukan menumpuk');
});

test('menghentikan pembanding tidak menggantung janji selesainya', async () => {
  const env = storeEnv({
    Audio: function () { this.play = async () => {}; this.pause = () => { this.paused = true; }; },
    Blob: function (parts) { this.size = parts[0].byteLength; },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    navigator: {}
  });
  player.setPcmDiagnosticMode('wavref', env);
  const handle = await player.createPlayer(env, {}).play({ audio: new Float32Array(240).fill(0.1), sampling_rate: 24000 }, {});
  handle.stop();
  await handle.done;
  assert.ok(true, 'done selesai setelah stop');
});

test('pembanding yang gagal jatuh ke jalur normal, tidak merusak suara', async () => {
  // Uji fisik m025-66: arm WAV REF bisu total dan aplikasi malah menyuruh mengunduh ulang
  // suara yang sudah ada. Penyebabnya pembanding melempar error, lalu runtime suara
  // menyimpulkan asetnya belum siap. Kegagalan pembanding tidak boleh pernah terlihat
  // seperti suara yang rusak.
  const diag = [];
  let started = 0;
  const env = storeEnv({
    navigator: {},
    AudioContext: function () {
      this.sampleRate = 24000; this.state = 'running'; this.currentTime = 0;
      this.destination = {}; this.resume = async () => {};
      this.createBufferSource = () => ({ buffer: null, connect() {}, start() { started++; }, stop() {}, onended: null });
      this.createBuffer = (ch, len, rate) => ({ length: len, sampleRate: rate, getChannelData: () => new Float32Array(len), copyToChannel() {} });
      this.createGain = () => ({ gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} }, connect() {} });
    },
    FiezelVoiceDiagnostics: { record: entry => { diag.push(entry); return true; }, begin() {}, end() {} }
  });
  player.setPcmDiagnosticMode('wavref', env);
  const handle = await player.createPlayer(env, {}).play({ audio: new Float32Array(2400).fill(0.2), sampling_rate: 24000 }, {});
  assert.ok(handle, 'pemutaran tetap berhasil lewat jalur normal');
  assert.ok(started > 0, 'jalur Web Audio biasa dipakai sebagai cadangan');
  const fallback = diag.find(e => e.referenceFallback);
  assert.ok(fallback, 'alasan kegagalan pembanding tercatat, bukan hilang diam-diam');
  assert.strictEqual(fallback.referenceFallback, 'media_element_unavailable');
});

test('elemen pembanding dibuka kuncinya di dalam gesture pengguna', async () => {
  // iOS hanya mengizinkan play() pada elemen yang pernah diputar saat gesture. Elemen yang
  // baru dibuat beberapa detik kemudian - setelah generate selesai - akan ditolak.
  const plays = [];
  const env = storeEnv({
    Audio: function () {
      this.play = async () => { plays.push(this.src); };
      this.pause = () => { this.paused = true; };
    }
  });
  assert.strictEqual(await player.primeReferenceElement(env), true);
  assert.strictEqual(env.__fiezelWavRefPrimed, true);
  assert.strictEqual(plays.length, 1);
  assert.ok(/^data:audio\/wav;base64,/.test(plays[0]), 'yang diputar saat membuka kunci adalah WAV diam');
  assert.ok(env.__fiezelWavRefElement, 'elemennya disimpan untuk dipakai ulang');
  // Perangkat yang menolak sekalipun tidak boleh melempar.
  const menolak = storeEnv({ Audio: function () { this.play = async () => { throw new Error('NotAllowedError'); }; this.pause = () => {}; } });
  assert.strictEqual(await player.primeReferenceElement(menolak), false);
  assert.strictEqual(menolak.__fiezelWavRefPrimed, false);
  assert.strictEqual(await player.primeReferenceElement({}), false, 'tanpa Audio pun tidak melempar');
});

test('pemutaran pembanding memakai elemen yang sudah dibuka kuncinya', async () => {
  const plays = [];
  const env = storeEnv({
    Audio: function () { this.play = async () => { plays.push(this.src); }; this.pause = () => {}; },
    Blob: function (parts) { this.size = parts[0].byteLength; },
    URL: { createObjectURL: () => 'blob:ref', revokeObjectURL() {} },
    navigator: {},
    FiezelVoiceDiagnostics: { record: entry => { env._diag = entry; return true; }, begin() {}, end() {} }
  });
  await player.primeReferenceElement(env);
  const unlocked = env.__fiezelWavRefElement;
  player.setPcmDiagnosticMode('wavref', env);
  await player.createPlayer(env, {}).play({ audio: new Float32Array(240).fill(0.2), sampling_rate: 24000 }, {});
  assert.strictEqual(env.__fiezelWavRefElement, unlocked, 'elemen yang sama dipakai ulang');
  assert.strictEqual(plays[plays.length - 1], 'blob:ref');
  assert.strictEqual(env._diag.referencePrimed, true, 'laporan menyebut pembandingnya benar-benar siap');
});

test('arm plainbuffer memutar lewat buffer polos, melewati worklet dan fade', async () => {
  // Bukti m025-67: iOS menolak elemen media 13 dari 13 kali (NotAllowedError), jadi arm
  // wavref tidak bisa diandalkan di perangkat itu. AudioContext-nya sendiri SUDAH terbuka
  // oleh alur normal aplikasi, jadi arm ini bisa berjalan tanpa masalah gesture - dan ia
  // tetap memisahkan tiga tersangka: worklet, fade, dan penjadwalan seam.
  const started = [];
  const connected = [];
  const env = storeEnv({
    navigator: {},
    AudioContext: function () {
      this.sampleRate = 44100; this.state = 'running'; this.currentTime = 0; this.destination = { id: 'dest' };
      this.resume = async () => {};
      this.createBuffer = (ch, len, rate) => {
        const data = new Float32Array(len);
        return { length: len, sampleRate: rate, numberOfChannels: ch, getChannelData: () => data, copyToChannel: (src) => data.set(src) };
      };
      this.createBufferSource = () => ({
        buffer: null, onended: null,
        connect(target) { connected.push(target && target.id); },
        start() { started.push(true); }, stop() {}
      });
      this.audioWorklet = { addModule: async () => { throw new Error('worklet must not be used by this arm'); } };
    },
    FiezelVoiceDiagnostics: { record: entry => { (env._diag = env._diag || []).push(entry); return true; }, begin() {}, end() {} }
  });
  player.setPcmDiagnosticMode('plainbuffer', env);
  const handle = await player.createPlayer(env, {}).play({ audio: new Float32Array(4410).fill(0.3), sampling_rate: 44100 }, {});
  assert.strictEqual(handle.diagnosticMode, 'plainbuffer');
  assert.strictEqual(started.length, 1, 'satu source diputar');
  assert.deepStrictEqual(connected, ['dest'], 'tersambung langsung ke destination, tanpa gain atau fade di antaranya');
  const record = env._diag.find(e => e.playbackPath === 'plain_buffer');
  assert.ok(record, 'jalur yang dipakai tercatat');
  assert.strictEqual(record.bypassed, 'worklet,fade,seam_scheduling', 'laporan menyebut apa yang dilewati');
  assert.strictEqual(record.contextSampleRate, 44100);
  assert.strictEqual(record.resamplingExpected, false);
});

test('plainbuffer yang gagal pun tidak merusak suara', async () => {
  const env = storeEnv({
    navigator: {},
    AudioContext: function () {
      this.sampleRate = 44100; this.state = 'running'; this.currentTime = 0; this.destination = {};
      this.resume = async () => {};
      // Gagal HANYA pada percobaan pembanding; jalur normal sesudahnya harus tetap bisa jalan,
      // karena itulah inti jaminannya: arm diagnostik yang gagal tidak boleh membisukan suara.
      let calls = 0;
      this.createBuffer = (ch, len, rate) => {
        calls += 1;
        if (calls === 1) throw new Error('QuotaExceededError');
        const data = new Float32Array(len);
        return { length: len, sampleRate: rate, numberOfChannels: ch, getChannelData: () => data, copyToChannel: (src) => data.set(src) };
      };
      this.createBufferSource = () => ({ buffer: null, connect() {}, start() {}, stop() {}, onended: null });
      this.createGain = () => ({ gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} }, connect() {} });
    },
    FiezelVoiceDiagnostics: { record: entry => { (env._diag = env._diag || []).push(entry); return true; }, begin() {}, end() {} }
  });
  player.setPcmDiagnosticMode('plainbuffer', env);
  const player2 = player.createPlayer(env, {});
  await assert.doesNotReject(() => player2.play({ audio: new Float32Array(441).fill(0.1), sampling_rate: 44100 }, {}));
  assert.ok(env._diag.some(e => e.referenceFallback), 'alasan kegagalan tercatat, lalu jatuh ke jalur normal');
});

test('pembuka kunci dipasang pada sentuhan mana pun, bukan hanya tombol mode', () => {
  // referencePrimed: false di m025-67 terjadi karena membuka kunci hanya lewat tombol mode:
  // modenya bertahan 24 jam sementara tombolnya bisa ditekan di sesi atau build lain.
  const listeners = [];
  const env = storeEnv({
    document: {
      addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }),
      removeEventListener: (type) => listeners.splice(listeners.findIndex(l => l.type === type), 1)
    },
    Audio: function () { this.play = async () => {}; this.pause = () => {}; }
  });
  assert.strictEqual(player.armReferenceUnlock(env), true);
  assert.deepStrictEqual(listeners.map(l => l.type).sort(), ['click', 'touchend']);
  assert.strictEqual(player.armReferenceUnlock(env), false, 'tidak dipasang dua kali');
  // Sentuhan pertama membuka kunci lalu melepas dirinya sendiri.
  listeners[0].fn();
  assert.ok(env.__fiezelWavRefElement, 'elemen dibuat pada gesture');
  assert.strictEqual(player.armReferenceUnlock({}), false, 'tanpa document tidak melempar');
});

test('nada uji tidak pernah menyentuh PCM model', async () => {
  // m025-68 sudah mencoret jalur pemutaran kita. Yang tersisa: PCM model, atau keluaran
  // perangkat. Nada ini dibuat FIEZEL sendiri, jadi kalau ia pun pecah, modelnya tidak bersalah.
  const buffers = [];
  const env = storeEnv({
    navigator: {},
    AudioContext: function () {
      this.sampleRate = 44100; this.state = 'running'; this.currentTime = 0; this.destination = { id: 'dest' };
      this.resume = async () => {};
      this.createBuffer = (ch, len, rate) => {
        const data = new Float32Array(len);
        buffers.push(data);
        return { length: len, sampleRate: rate, numberOfChannels: ch, getChannelData: () => data, copyToChannel: (src) => data.set(src) };
      };
      this.createBufferSource = () => ({ buffer: null, connect() {}, start() {}, stop() {}, onended: null });
    },
    FiezelVoiceDiagnostics: { record: entry => { (env._diag = env._diag || []).push(entry); return true; }, begin() {}, end() {} }
  });
  player.setPcmDiagnosticMode('toneref', env);
  // PCM "model" di sini sengaja diam total; kalau nada uji berasal darinya, hasilnya juga diam.
  const handle = await player.createPlayer(env, {}).play({ audio: new Float32Array(44100), sampling_rate: 44100 }, {});
  assert.strictEqual(handle.diagnosticMode, 'toneref');
  const played = buffers[buffers.length - 1];
  let peak = 0;
  for (let i = 0; i < played.length; i++) peak = Math.max(peak, Math.abs(played[i]));
  assert.ok(peak > 0.3, `yang diputar harus nada buatan, bukan PCM model yang diam: peak ${peak}`);
  const record = env._diag.find(e => e.syntheticReference === true);
  assert.ok(record, 'telemetri menandai arm ini sebagai sinyal buatan');
  assert.strictEqual(record.playbackPath, 'plain_buffer');
});

test('nada uji deterministik, aman, dan tidak pernah mendekati clipping', () => {
  const a = player.buildReferenceTone(44100, 3);
  const b = player.buildReferenceTone(44100, 3);
  assert.strictEqual(a.length, 44100 * 3);
  assert.deepStrictEqual(Array.from(a.slice(0, 50)), Array.from(b.slice(0, 50)), 'dua panggilan menghasilkan sinyal identik');
  let peak = 0, nonFinite = 0;
  for (let i = 0; i < a.length; i++) { const v = a[i]; if (!Number.isFinite(v)) nonFinite++; peak = Math.max(peak, Math.abs(v)); }
  assert.strictEqual(nonFinite, 0);
  assert.ok(peak <= 0.55, `nada uji tidak boleh mendekati batas: ${peak.toFixed(3)}`);
  assert.ok(peak > 0.35, 'tetap cukup keras untuk dinilai telinga');
  // Sample rate lain tetap menghasilkan durasi yang benar.
  assert.strictEqual(player.buildReferenceTone(24000, 2).length, 48000);
});

test('panel memperingatkan bila pembanding tidak bisa dibuka', () => {
  const panel = fs.readFileSync('./features/neural-voice/fiezel-diag-panel.js', 'utf8');
  assert.ok(/primeReferenceElement\(root\)/.test(panel), 'tombol WAV REF membuka kunci di dalam gesture');
  assert.ok(/PERINGATAN: pemutar pembanding TIDAK bisa dibuka/.test(panel),
    'kegagalan harus terlihat, karena arm yang diam-diam jatuh ke jalur normal akan menyesatkan penguji');
});

test('jalur produksi normal tidak tersentuh sama sekali', () => {
  const source = fs.readFileSync('./features/neural-voice/fiezel-web-audio-player.js', 'utf8');
  // Cabang pembanding hanya boleh dimasuki lewat mode diagnostik.
  assert.ok(/if \(diagnosticMode === 'wavref'\) \{[\s\S]{0,600}playViaMediaElement/.test(source),
    'cabang pembanding hanya dimasuki lewat mode diagnostik');
  assert.ok(/if \(reference\) return reference;/.test(source),
    'pembanding yang gagal jatuh ke jalur normal, bukan melempar');
  // conditionSamples tetap berjalan di mode normal seperti sebelumnya.
  assert.ok(/if \(diagnosticMode !== 'raw'\) samples = conditionSamples\(samples\);/.test(source));
  // encodeWav tidak pernah dipanggil di luar pembanding.
  const pemanggilan = source.match(/encodeWav\(/g) || [];
  assert.strictEqual(pemanggilan.length, 2, 'satu definisi, satu pemanggilan di jalur pembanding');
});

test('panel Diagnostics menyediakan keempat mode dan menyebut mode yang aktif', () => {
  const panel = fs.readFileSync('./features/neural-voice/fiezel-diag-panel.js', 'utf8');
  for (const label of ['PCM: Normal', 'PCM: RAW', 'PCM: CONDITIONED', 'PCM: WAV REF', 'PCM: PLAIN BUFFER', 'PCM: NADA UJI']) {
    assert.ok(panel.indexOf(label) !== -1, `tombol ${label} hilang`);
  }
  assert.ok(/Mode PCM aktif: /.test(panel), 'panel menyebut mode yang benar-benar aktif');
  // Mode dibaca saat player dibuat; kalau ini tidak dikatakan, penguji akan mengira modenya
  // langsung berlaku dan hasil ujinya jadi tidak sah.
  assert.ok(/Tutup FIEZEL sepenuhnya lalu buka lagi/.test(panel));
  assert.ok(/pcmMode: safe\(/.test(panel), 'dump Diagnostics membawa mode yang aktif');
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); console.log('ok - ' + name); }
    catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
  }
  console.log('');
  if (failures) { console.error('FIEZEL wav reference: FAIL (' + failures + ')'); process.exit(1); }
  console.log('FIEZEL wav reference: PASS');
})();
