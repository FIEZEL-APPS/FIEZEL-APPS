#!/usr/bin/env node
/**
 * PHASE 0 · audio-locale-guard-test.js — PAGAR: LOCALE UI DILARANG MASUK KE AUDIO
 *
 * Audit v2, AI-17 F02 (P0): locale ikut di-hash ke kunci cache audio konten
 * (features/audio-assets/fiezel-audio-key.js dan workers/api/tts/tts-key.js). Kalau locale UI
 * (id/th) bocor ke opsi audio, SELURUH korpus berbayar (1.170 aset ElevenLabs + korpus
 * Deepgram 604.962 karakter) yatim secara diam-diam: aset tetap di R2, kunci tidak pernah
 * cocok lagi, penagihan mulai dari nol, tanpa satu error pun.
 * AI-17 F05: utterance.lang yang bocor 'th-TH' membuat suara sistem Thai melafalkan Inggris.
 *
 * Gerbang ini menegakkan invariannya SEKARANG, sebelum ada kode i18n sama sekali, supaya
 * pelanggaran pertama langsung merah di CI, bukan ditemukan lewat tagihan.
 *
 * ENV: FIEZEL_ROOT → root repo (default __dirname).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.env.FIEZEL_ROOT || __dirname;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, ok, details: details || '' });
  if (!ok) failed = true;
};

// Zona audio: berkas yang boleh menyebut locale HANYA sebagai en-US default / kunci cache.
const AUDIO_ZONES = [];
const collect = (dir) => {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (e.isDirectory()) collect(p);
    else if (e.name.endsWith('.js')) AUDIO_ZONES.push(p);
  }
};
['features/neural-voice', 'features/audio', 'features/audio-assets', 'workers/api/tts'].forEach(collect);

// 1. Default en-US di boundary browser-synthesis masih utuh.
check("voice-say: utterance.lang = opts.locale || 'en-US'",
  /utterance\.lang\s*=\s*opts\.locale\s*\|\|\s*'en-US'/.test(read('features/neural-voice/fiezel-voice-say.js')),
  'fiezel-voice-say.js:487');
check("audibility-fix: utterance.lang = options.lang || 'en-US'",
  /utterance\.lang\s*=\s*options\.lang\s*\|\|\s*'en-US'/.test(read('features/neural-voice/fiezel-neural-voice-audibility-fix.js')),
  'fiezel-neural-voice-audibility-fix.js:100');

// 2. Tidak ada satu pun berkas zona audio yang menyentuh i18n/locale murid.
//    Regex sengaja kasar: menyebut nama-nama ini di zona audio adalah bau desain yang salah,
//    apa pun konteksnya — pengecualian sah harus didaftarkan eksplisit di sini dengan alasan.
const FORBIDDEN = /(FiezelI18n|learnerLocale|['"]th-TH['"]|['"]id-ID['"])/;
const EXEMPT = new Set([
  // fiezel-cf-voice-notice.js: 'id-ID' di sini adalah Intl.DateTimeFormat untuk NASKAH
  // pemberitahuan (jam reset jatah, AI-02 F03) — bukan opsi audio. Jadi pekerjaan i18n
  // Phase 1 (format tanggal ikut learnerLocale), bukan pelanggaran kunci audio.
  'features/neural-voice/fiezel-cf-voice-notice.js'
]);
for (const f of AUDIO_ZONES) {
  if (EXEMPT.has(f)) continue;
  const hit = read(f).match(FORBIDDEN);
  check(`zona audio bersih: ${f}`, !hit, hit ? `menyebut ${hit[1]}` : '');
}

// 3. Recognizer latihan speaking tetap pinned en-US (target language, BUKAN locale murid).
const slDir = 'features/speaking-listening';
let slSrc = '';
if (fs.existsSync(path.join(ROOT, slDir))) {
  for (const e of fs.readdirSync(path.join(ROOT, slDir))) {
    if (e.endsWith('.js')) slSrc += read(slDir + '/' + e);
  }
}
check("speaking practice: recognition en-US masih pinned",
  !/recognition\.lang\s*=\s*(?!['"]en-US['"])/.test(slSrc),
  'recognition.lang selain en-US di features/speaking-listening = regresi target-language');

for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.details ? ' — ' + c.details : ''}`);
console.log(failed
  ? '\nMERAH: locale menyentuh zona audio. Baca AI-17 F02 sebelum menyentuh apa pun.'
  : '\nHIJAU: audio tetap locale-independent.');
process.exit(failed ? 1 : 0);
