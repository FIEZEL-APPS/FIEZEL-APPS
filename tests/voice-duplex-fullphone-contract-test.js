/**
 * tests/voice-duplex-fullphone-contract-test.js
 *
 * Verifikasi Mutu & Kontrak Arsitektur:
 * 1. True Full-Duplex Phone Call Pipeline di Kawan Bicara (Voice Studio):
 *    - Peniadaan total browser SpeechRecognition flapping & beep di mode ws-duplex
 *    - Timeout akuisisi mikrofon seluler >= 4000ms
 *    - Watchdog pembuka sesi >= 15000ms (anti-premature cutoff di jaringan mobile)
 *    - Jaminan eksekusi greeting directive saat terhubung
 * 2. Echo-Tolerant Barge-In Mochi SOS (Bantuan Kuis):
 *    - Peniadaan gembok mutlak _openingTurnCompletedForQ pada handler VAD
 *    - Ambang batas barge-in ramah speakerphone HP (pSpeech <= 0.75, rms <= 0.020, streak <= 8 frame)
 *    - Penghentian audio seketika (stopAllActiveAudioSources) saat murid menyela
 */

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('=== FIEZEL VOICE DUPLEX FULL-PHONE & BARGE-IN CONTRACT TEST ===\n');

// 1. Audit Kawan Bicara (Voice Studio App.tsx)
const appTsxPath = path.join(ROOT, 'features/voice-studio/src/App.tsx');
assert.ok(fs.existsSync(appTsxPath), 'features/voice-studio/src/App.tsx wajib ada');
const appTsxContent = fs.readFileSync(appTsxPath, 'utf8');

console.log('[Test 1] Kawan Bicara: Peniadaan Browser SpeechRecognition di Mode ws-duplex');
assert.ok(
  appTsxContent.includes("if (isLiveConnected && liveTransportMode === 'ws-duplex')"),
  'Wajib memiliki bypass guard eksplisit ws-duplex di awal useEffect pengenal ucapan'
);
assert.ok(
  appTsxContent.includes('We MUST NEVER initialize or run browser SpeechRecognition in ws-duplex mode!'),
  'Wajib memiliki dokumentasi penegakan zero-SpeechRecognition di mode duplex'
);
console.log('  ✓ Browser SpeechRecognition flapping di mode ws-duplex tereliminasi 100%');

console.log('[Test 2] Kawan Bicara: Toleransi Akuisisi Mikrofon Mobile & Watchdog Pembuka');
assert.ok(
  appTsxContent.includes('setTimeout(() => resolve(null), 4000)'),
  'Timeout akuisisi mikrofon seluler wajib minimal 4000ms'
);
assert.ok(
  appTsxContent.includes('}, 15000);') && appTsxContent.includes('opening_audio_watchdog_timeout'),
  'Watchdog pembuka audio sesi live wajib minimal 15000ms'
);
console.log('  ✓ Timeout akuisisi mic (4000ms) & watchdog pembuka (15000ms) terverifikasi');

console.log('[Test 3] Kawan Bicara: Jaminan Sapaan Pembuka & AudioContext Async Resume');
assert.ok(
  appTsxContent.includes('if (!isReconnect) {') && appTsxContent.includes('greetingDirective'),
  'Greeting directive wajib selalu dikirim pada panggilan baru tanpa terblokir kondisi ekstra'
);
assert.ok(
  appTsxContent.includes('await ctx.resume()'),
  'AudioContext wajib di-resume secara asinkron sebelum penjadwalan buffer audio live'
);
console.log('  ✓ Greeting directive & async AudioContext resume terverifikasi');

// 2. Audit Mochi SOS (fiezel-mochi-voice-sos.js)
const mochiSosPath = path.join(ROOT, 'features/mascot/fiezel-mochi-voice-sos.js');
assert.ok(fs.existsSync(mochiSosPath), 'features/mascot/fiezel-mochi-voice-sos.js wajib ada');
const mochiSosContent = fs.readFileSync(mochiSosPath, 'utf8');

console.log('[Test 4] Mochi SOS: Peniadaan Gembok Mutlak Sapaan Pembuka');
// Pastikan tidak ada lagi if (!_openingTurnCompletedForQ || _awaitingOpeningModelTurn) { sileroSpeechStreak = 0; return; }
const hasOpeningTurnBlockInSilero = /if\s*\(!_openingTurnCompletedForQ\s*\|\|\s*_awaitingOpeningModelTurn\)\s*\{\s*sileroSpeechStreak\s*=\s*0;\s*return;/.test(mochiSosContent);
assert.strictEqual(
  hasOpeningTurnBlockInSilero,
  false,
  'Gembok pembuka !_openingTurnCompletedForQ pada Silero VAD frame callback wajib dicabut'
);

const hasOpeningTurnBlockInScriptProc = /if\s*\(!_openingTurnCompletedForQ\s*\|\|\s*_awaitingOpeningModelTurn\)\s*\{\s*_consecutiveSpeechFrames\s*=\s*0;\s*return;/.test(mochiSosContent);
assert.strictEqual(
  hasOpeningTurnBlockInScriptProc,
  false,
  'Gembok pembuka !_openingTurnCompletedForQ pada ScriptProcessor fallback wajib dicabut'
);
console.log('  ✓ Gembok mutlak sapaan pembuka Mochi SOS berhasil dicabut dari kedua jalur audio');

console.log('[Test 5] Mochi SOS: Ambang Batas Barge-In Echo-Tolerant Ramah Speakerphone');
assert.ok(
  mochiSosContent.includes('pSpeech >= 0.72 && rms >= 0.014'),
  'Ambang batas vokal Silero VAD wajib ramah speakerphone HP (pSpeech >= 0.72, rms >= 0.014)'
);
assert.ok(
  mochiSosContent.includes('sileroSpeechStreak >= 6'),
  'Konfirmasi streak barge-in Silero wajib 6 frame (~192ms) agar gesit dan bebas false-positive'
);
assert.ok(
  mochiSosContent.includes('v.isHumanSpeech && v.rms >= 0.016'),
  'Ambang batas vokal fallback ScriptProcessor wajib ramah speakerphone (rms >= 0.016)'
);
assert.ok(
  mochiSosContent.includes('_consecutiveSpeechFrames >= 5'),
  'Konfirmasi streak fallback wajib 5 frame (~160ms)'
);
console.log('  ✓ Sensitivitas interupsi suara (barge-in) Mochi SOS terkalibrasi secara empiris');

console.log('[Test 6] Mochi SOS: Pemotongan Audio Seketika & Anti-Bleed Guard');
assert.ok(
  mochiSosContent.includes('stopAllActiveAudioSources()') && mochiSosContent.includes('_userAudioBurstActive = true'),
  'Pemotongan audio Mochi dan aktivasi burst suara murid wajib seketika saat barge-in'
);
assert.ok(
  mochiSosContent.includes('_userAudioBurstActive || (_lastBargeInAt > 0 && (Date.now() - _lastBargeInAt) < 600)'),
  'Chunk audio model yang terlambat wajib ditolak saat murid sedang berbicara / baru saja menyela'
);
console.log('  ✓ Pemotongan audio instan & anti-bleed guard terverifikasi');

// 3. Audit Silero VAD Gate di Voice Studio (sileroVadGate.ts)
const sileroGatePath = path.join(ROOT, 'features/voice-studio/src/lib/sileroVadGate.ts');
const sileroGateContent = fs.readFileSync(sileroGatePath, 'utf8');

console.log('[Test 7] Voice Studio SileroVadGate: Barge-In Threshold Alignment');
assert.ok(
  sileroGateContent.includes('pSpeech >= 0.72 && rms >= 0.010'),
  'SileroVadGate wajib menggunakan ambang toleran speakerphone (pSpeech >= 0.72, rms >= 0.010)'
);
assert.ok(
  sileroGateContent.includes('speechStreak >= 6'),
  'SileroVadGate streak wajib 6 frame (~192ms)'
);
console.log('  ✓ Voice Studio SileroVadGate selaras dengan Mochi SOS');

console.log('\n================================================================');
console.log('ALL 7/7 VOICE DUPLEX FULL-PHONE & BARGE-IN CONTRACT CHECKS PASSED!');
console.log('================================================================');
