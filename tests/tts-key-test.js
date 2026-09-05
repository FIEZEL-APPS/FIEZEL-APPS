const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
// E5 — gerbang kunci cache TTS v2 (workers/api/tts/tts-key.js).
//
// Satu berkas ini menjaga uang. Kunci cache TTS adalah satu-satunya hal yang membedakan "korpus
// 604.962 karakter dibayar sekali US$9,07" dari "dibayar berulang setiap kali murid menekan
// putar". Tiga cara kunci bisa rusak tanpa satu pun galat yang terlihat, dan ketiganya diuji di
// bawah: (a) `speed` ikut masuk kunci lagi — satu kalimat menjadi tiga aset berbayar dengan bunyi
// identik; (b) satu sisi (Node vs Worker) menghitung hash berbeda — seluruh katalog dianggap
// belum ada; (c) `engineVersion` tidak ikut — pergantian model diam-diam memakai suara lama.
const fs = require('fs');
const path = require('path');

const root = __fzRoot;
const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details == null ? '' : details) });
  if (!ok) failed = true;
};

const TtsKey = require(path.join(root, 'workers/api/tts/tts-key.js'));
const AudioKey = require(path.join(root, 'features/audio-assets/fiezel-audio-key.js'));

const BASE = {
  text: 'It is raining and I am at the school gate.',
  locale: 'en-US',
  voiceId: 'aura-asteria-en',
  engineId: '@cf/deepgram/aura-1',
  engineVersion: 'cf-aura-1@v1',
  settings: { container: 'mp3', sampleRate: 24000, bitRate: 128 }
};
const keyOf = (over) => TtsKey.build({ ...BASE, ...over }).audioKey;

// --- 1. DETERMINISTIK ------------------------------------------------------------------
{
  const a = keyOf();
  const b = keyOf();
  check('Kunci deterministik untuk input identik', a === b && /^[0-9a-f]{64}$/.test(a), a);

  // Objek settings dengan urutan kunci berbeda tidak boleh melahirkan kunci kedua: urutan kunci
  // objek JS bergeser begitu saja saat kode disunting.
  const reordered = keyOf({ settings: { bitRate: 128, sampleRate: 24000, container: 'mp3' } });
  check('Urutan field settings tidak mengubah kunci', reordered === a, reordered);

  // Hash-nya harus sama dengan implementasi frontend untuk material yang sama. Kalau tidak,
  // pra-render dan runtime hidup di dua katalog yang berbeda.
  const vector = 'fiezel-parity-vector-2026';
  check('SHA-256 Worker identik dengan implementasi frontend',
    TtsKey.sha256(vector) === AudioKey.sha256(vector), TtsKey.sha256(vector).slice(0, 16));
}

// --- 2. SPEED TIDAK MEMPENGARUHI KUNCI (bug bayar-ulang cf-a5/cf-a10) ------------------
{
  const base = keyOf();
  const speeds = [0.75, 0.86, 1, 1.25, 2];
  const asField = speeds.map((speed) => TtsKey.build({ ...BASE, speed }).audioKey);
  check('speed sebagai field lepas tidak mengubah kunci',
    asField.every((k) => k === base), [...new Set(asField)].length + ' kunci unik');

  const inSettings = speeds.map((speed) => keyOf({ settings: { ...BASE.settings, speed } }));
  check('speed DI DALAM settings juga tidak mengubah kunci',
    inSettings.every((k) => k === base), [...new Set(inSettings)].length + ' kunci unik');

  const playbackOnly = TtsKey.PLAYBACK_ONLY.map((field) => keyOf({ settings: { ...BASE.settings, [field]: 1.5 } }));
  check('Seluruh field pemutar (speed/rate/pitch/volume/gain) di luar kunci',
    playbackOnly.every((k) => k === base), TtsKey.PLAYBACK_ONLY.join(','));

  // Library punya SPEED_STEPS [0.75, 1, 1.25] dan Listening memakai ttsRate 0.86. Sebelum
  // perbaikan ini, satu narasi buku dibayar 3x dan satu kalimat listening 2x.
  const libraryAndListening = [0.75, 1, 1.25, 0.86].map((speed) => TtsKey.build({ ...BASE, speed }).audioKey);
  check('SPEED_STEPS Library + ttsRate Listening menghasilkan SATU objek berbayar',
    new Set(libraryAndListening).size === 1, new Set(libraryAndListening).size + ' objek');

  const ignored = TtsKey.build({ ...BASE, settings: { ...BASE.settings, speed: 1.25 } }).ignoredSettings;
  check('speed dilaporkan sebagai setelan yang diabaikan (bisa diperiksa, tidak menghitung)',
    ignored.includes('speed'), ignored.join(','));
}

// --- 3. TEKS BEDA ⇒ KUNCI BEDA ---------------------------------------------------------
{
  const base = keyOf();
  check('Teks berbeda menghasilkan kunci berbeda',
    keyOf({ text: 'It is raining and I am at the school gates.' }) !== base, 'satu huruf cukup');
  check('Huruf besar dipertahankan (mengubah intonasi ⇒ aset memang berbeda)',
    keyOf({ text: 'IT IS RAINING and I am at the school gate.' }) !== base, 'kapital masuk kunci');
  check('Tanda tanya dipertahankan',
    keyOf({ text: 'It is raining and I am at the school gate?' }) !== base, 'tanda baca masuk kunci');

  // Normalisasi kanonik: yang tidak terdengar TIDAK boleh memecah aset.
  check('Spasi ganda dinormalisasi',
    keyOf({ text: 'It is raining  and I am at the school gate.' }) === base, 'spasi ganda = satu aset');
  check('Spasi tak terlihat (ZWSP/BOM) dinormalisasi',
    keyOf({ text: '\ufeffIt is raining\u200b and I am at the school gate. ' }) === base, 'ZWSP/BOM dibuang');
  check('NBSP dan newline dinormalisasi',
    keyOf({ text: 'It is raining\u00a0and I am at\nthe school gate.' }) === base, 'NBSP/newline = spasi');
  check('canonicalText tersedia sebagai fungsi normalisasi terpisah',
    typeof TtsKey.canonicalText === 'function' &&
    TtsKey.canonicalText('  a\u200b  b\u00a0c \n') === 'a b c', TtsKey.canonicalText('  a\u200b  b\u00a0c \n'));
}

// --- 4. DIMENSI YANG WAJIB MASUK KUNCI -------------------------------------------------
{
  const base = keyOf();
  check('engineVersion masuk kunci (naik versi ⇒ katalog lama ditinggalkan tanpa dihapus)',
    keyOf({ engineVersion: 'cf-aura-1@v2' }) !== base, 'v1 != v2');
  check('engineId masuk kunci', keyOf({ engineId: '@cf/myshell-ai/melotts' }) !== base, 'aura != melotts');
  check('voiceId masuk kunci', keyOf({ voiceId: 'aura-luna-en' }) !== base, 'suara berbeda = aset berbeda');
  check('locale masuk kunci', keyOf({ locale: 'id-ID' }) !== base, 'en-US != id-ID');
  check('sampleRate/bitRate/container masuk kunci',
    keyOf({ settings: { ...BASE.settings, sampleRate: 48000 } }) !== base &&
    keyOf({ settings: { ...BASE.settings, bitRate: 64 } }) !== base &&
    keyOf({ settings: { ...BASE.settings, container: 'wav' } }) !== base, 'allowlist berpengaruh');

  // contentType SENGAJA di luar hash: tombol pengucapan flashcard mengirim 'sentence' untuk
  // sebuah kata lalu menemukan ABSENT padahal MP3-nya sudah dibayar.
  check('contentType TIDAK mengubah kunci',
    keyOf({ contentType: 'word' }) === base && keyOf({ contentType: 'book' }) === base, 'label di luar hash');

  check('Setelan di luar allowlist diabaikan, bukan di-hash',
    keyOf({ settings: { ...BASE.settings, requestId: 'abc', ui: 'library', stability: 0.5 } }) === base,
    'penambahan opsi kosmetik tidak me-nol-kan katalog');
}

// --- 5. FAIL-CLOSED --------------------------------------------------------------------
{
  const throws = (over) => {
    try { TtsKey.build({ ...BASE, ...over }); return ''; } catch (e) { return e.message; }
  };
  check('Teks kosong ditolak', throws({ text: '   ' }) === 'tts_key_empty_text', throws({ text: '' }));
  check('voiceId kosong ditolak', throws({ voiceId: '' }) === 'tts_key_missing_voice', throws({ voiceId: '' }));
  check('engineId kosong ditolak', throws({ engineId: '' }) === 'tts_key_missing_engine', throws({ engineId: '' }));
  // engineVersion wajib eksplisit: menebaknya otomatis membuat pembaruan model diam-diam
  // membayar ulang seluruh korpus.
  check('engineVersion kosong ditolak',
    throws({ engineVersion: '' }) === 'tts_key_missing_engine_version', throws({ engineVersion: '' }));
}

// --- 6. NAMA OBJEK ---------------------------------------------------------------------
{
  const name = TtsKey.objectName(TtsKey.build(BASE));
  check('Nama objek cocok pola yang dilayani worker audio (^[0-9a-f]{64}\\.mp3$)',
    TtsKey.isValidObjectName(name) && /^[0-9a-f]{64}\.mp3$/.test(name), name);
  check('Nama objek datar, tanpa direktori', !name.includes('/'), name);
}

// --- 7. KODE SUMBER: djb2 tidak boleh kembali ------------------------------------------
{
  const src = fs.readFileSync(path.join(root, 'workers/api/tts/tts-key.js'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('Tidak ada hash 32-bit djb2 di jalur kunci', !/djb2|<<\s*5\)\s*[-+]/.test(code), 'hanya SHA-256');
  check('speed tidak muncul di material hash',
    !/canon\.speed|speed\s*:/.test(code) && /PLAYBACK_ONLY/.test(code), 'speed hanya sebagai larangan');
  check('Allowlist settings tertutup dan tepat tiga field',
    TtsKey.SETTINGS_ALLOWLIST.length === 3 &&
    ['bitRate', 'container', 'sampleRate'].every((f) => TtsKey.SETTINGS_ALLOWLIST.includes(f)),
    TtsKey.SETTINGS_ALLOWLIST.join(','));
  check('Skema kunci v2 dieja eksplisit', TtsKey.SCHEMA === 'fiezel-tts-key-v2', TtsKey.SCHEMA);
}

const report = {
  status: failed ? 'NOT READY' : 'PASS',
  gate: 'tts-key-test',
  counts: { pass: checks.filter((c) => c.status === 'PASS').length, fail: checks.filter((c) => c.status === 'FAIL').length },
  checks
};
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
