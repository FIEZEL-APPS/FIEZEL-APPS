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

// 1. m025-232: BOUNDARY-NYA SENDIRI YANG DIHAPUS, dan gerbangnya ikut naik kelas.
//
// AI-17 F05 dulu dijaga dengan memastikan `utterance.lang` punya default 'en-US' yang benar:
// selama defaultnya betul, locale murid 'th-TH' tidak akan bocor dan membuat suara sistem Thai
// melafalkan kalimat Inggris. Itu penjagaan atas SATU NILAI di satu baris.
//
// Cadangan speechSynthesis peramban kini dihapus total (keputusan OWNER). Tidak ada lagi
// utterance yang bisa salah locale, jadi menjaga nilai defaultnya berarti menjaga baris yang
// sudah tidak ada. Gantinya invarian yang lebih kuat dan tidak bisa lapuk: TIDAK ADA satu pun
// berkas zona audio yang boleh menyentuh API speechSynthesis lagi. Kelas bugnya hilang secara
// struktural, bukan karena nilainya kebetulan benar.
//
// Komentar yang MENJELASKAN penghapusan tetap boleh menyebut namanya - yang dilarang adalah
// KODE. Karena itu komentar dilucuti dulu sebelum dicocokkan.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
const SPEECH_API = /\b(speechSynthesis|SpeechSynthesisUtterance)\b/;
for (const zone of AUDIO_ZONES) {
  check('zona audio bebas speechSynthesis: ' + zone,
    !SPEECH_API.test(stripComments(read(zone))),
    'L4 dihapus m025-232 — cadangan suara peramban tidak boleh kembali lewat pintu mana pun');
}
// 1b. m025-246: OWNER MEMBALIK LARANGAN TOTAL DI app.js — dan menggantinya dengan larangan
//     yang lebih tepat sasaran. Dua baris brief 3 Sep 2026 memintanya secara eksplisit:
//       "Listening gagal audio: ... opsi coba lagi / SUARA PERAMBAN / lewati tanpa penalti."
//       "Android low-end: Kokoro WASM bisa mematikan tab — ... FALLBACK SUARA PERAMBAN."
//
//     Larangan total di app.js karena itu tidak bisa dipertahankan apa adanya. Yang PENTING
//     adalah larangan itu tidak pernah tentang API-nya; ia tentang DUA KELAS BUG:
//
//       (a) KEBOCORAN LOCALE (AI-17 F05). `utterance.lang` yang mengikuti locale murid
//           membuat suara sistem Thai melafalkan kalimat Inggris.
//       (b) DUA SUARA SEKALIGUS (m025-232). `speechSynthesis` punya antrean GLOBAL milik
//           peramban yang tidak ikut berhenti saat pemutar kita berhenti, jadi lapisan
//           OTOMATIS di dalam tangga akan berbunyi di atas audio yang sudah berjalan.
//
//     Keduanya masih dilarang, dan sekarang dijaga secara struktural, bukan dengan menutup
//     namanya:
//
//       - ZONA AUDIO (features/neural-voice, features/audio, features/audio-assets,
//         workers/api/tts) tetap BEBAS TOTAL dari speechSynthesis — pemeriksaan di atas
//         tidak dilonggarkan satu berkas pun. Di situlah tangga suara hidup, dan lapisan
//         otomatis hanya bisa lahir di sana. Kelas bug (b) tetap mustahil secara struktur.
//       - Di app.js, tiap utterance WAJIB memaku lang ke 'en-US' literal. Kelas bug (a)
//         karena itu tetap mustahil: tidak ada jalan bagi locale murid untuk sampai ke sana.
//       - Dan jalur itu WAJIB memanggil stop()/cancel() lebih dulu, jadi ia tidak pernah
//         menumpuk di atas audio yang sedang berjalan.
{
  const appCode = stripComments(read('app.js'));
  const touchesSpeech = SPEECH_API.test(appCode);
  if (touchesSpeech) {
    const helper = /function speakWithBrowserVoice\(text,rate\)\{([\s\S]*?)\n\}/.exec(appCode);
    check('app.js: speechSynthesis hanya lewat satu helper bernama',
      !!helper,
      'API suara peramban dipakai di app.js tanpa lewat speakWithBrowserVoice() — jalur kedua adalah jalur yang akan menyimpang');
    const body = helper ? helper[1] : '';
    check("app.js: utterance memaku lang 'en-US', tidak pernah locale murid (AI-17 F05)",
      /u\.lang='en-US'/.test(body),
      'lang tidak dipaku ke en-US: kelas bug kebocoran locale kembali terbuka');
    check('app.js: suara peramban menghentikan pemutar kita lebih dulu (anti dua-suara, m025-232)',
      /audio\.stop\(\)/.test(body) && /speechSynthesis\.cancel\(\)/.test(body),
      'tanpa stop()+cancel(), utterance bisa berbunyi di atas audio yang sedang berjalan');
    /* Otomatis = lapisan. Yang diizinkan owner adalah TOMBOL. Kalau helper ini pernah
       dijadwalkan sendiri, ia sudah berubah jadi lapisan tanpa ada yang memutuskannya. */
    check('app.js: suara peramban tidak pernah dijadwalkan sendiri (tombol, bukan lapisan)',
      !/set(Timeout|Interval)\([^)]*speakWithBrowserVoice/.test(appCode),
      'suara peramban dijadwalkan otomatis — itu mengembalikan lapisan L4 lewat pintu belakang');
  } else {
    check('app.js bebas speechSynthesis', true, '');
  }
}

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
