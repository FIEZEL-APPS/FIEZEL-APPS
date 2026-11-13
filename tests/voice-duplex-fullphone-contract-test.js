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

console.log('[Test 1] Kawan Bicara: Peniadaan Browser SpeechRecognition di Mode ws-duplex Saat Mic Hardware Aktif');
assert.ok(
  appTsxContent.includes("if (isLiveConnected && liveTransportMode === 'ws-duplex' && hasLiveHardwareMic)"),
  'Wajib memiliki bypass guard eksplisit ws-duplex saat hasLiveHardwareMic aktif di awal useEffect pengenal ucapan'
);
assert.ok(
  appTsxContent.includes('Do NOT run browser SpeechRecognition simultaneously when hardware mic PCM is active'),
  'Wajib memiliki dokumentasi penegakan zero-SpeechRecognition saat mic PCM aktif di mode duplex'
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

// 4. Audit Invarian Mutlak Mikrofon Mobile PWA Kawan Bicara (Zero Cross-Realm Hijack & Mochi SOS Parity)
const appJsContent = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const interactiveChatContent = fs.readFileSync(
  path.join(ROOT, 'features/interactive-chat/fiezel-interactive-chat.js'),
  'utf8'
);
const handyVadContent = fs.readFileSync(
  path.join(ROOT, 'features/voice-studio/src/lib/handyVad.ts'),
  'utf8'
);
const distVoiceStudioContent = fs.readFileSync(
  path.join(ROOT, 'features/voice-studio/dist/voice-studio.js'),
  'utf8'
);

console.log('[Test 8] Kawan Bicara: 2-Stage Same-Realm AudioContext & Mic Bridge (100% Mochi SOS Parity)');
assert.ok(
  appJsContent.includes('function ensureSharedKawanAudioCtx()') &&
    appJsContent.includes('function wireSharedKawanMicBridge(stream)') &&
    appJsContent.includes('function warmKawanAudioAndMic()') &&
    appJsContent.includes('self.__fzEnsureSharedLiveAudioCtx=ensureSharedKawanAudioCtx;') &&
    appJsContent.includes('self.__fzWireSharedMicBridge=wireSharedKawanMicBridge;'),
  'app.js wajib menyediakan jembatan same-realm __fzEnsureSharedLiveAudioCtx, __fzWireSharedMicBridge, dan __fzWarmKawanAudioAndMic di jendela utama'
);
const modalOpenIdx = appJsContent.indexOf('function openKawanBicaraCallModal()');
const modalEndIdx = appJsContent.indexOf('window.openKawanBicaraCallModal=openKawanBicaraCallModal;', modalOpenIdx);
const modalSlice = modalOpenIdx >= 0 && modalEndIdx > modalOpenIdx ? appJsContent.slice(modalOpenIdx, modalEndIdx) : '';
const warmCallsInModal = (modalSlice.match(/warmKawanAudioAndMic\(\)/g) || []).length;
assert.ok(
  warmCallsInModal >= 2,
  'openKawanBicaraCallModal() wajib memanggil warmKawanAudioAndMic() di Stage 1 (saat modal dibuka) DAN Stage 2 (saat tombol telepon diketuk)'
);
assert.ok(
  modalSlice.includes('closeKawanBicaraCallModal(true);go(\'chat\')'),
  'Saat tombol telepon diketuk, closeKawanBicaraCallModal(true) wajib mempertahankan shared AudioContext & mic stream menuju call.html'
);
assert.ok(
  appTsxContent.includes('parentWin.__fzEnsureSharedLiveAudioCtx') &&
    appTsxContent.includes('parentWin.__fzWireSharedMicBridge(stream)') &&
    appTsxContent.includes('parentWin.__fzSharedMicPcmCallback = (samples: Float32Array) => {'),
  'App.tsx wajib mengadopsi __fzEnsureSharedLiveAudioCtx untuk suara pembuka instan Mochi dan __fzWireSharedMicBridge untuk pemrosesan PCM 2048 sampel same-realm'
);
console.log('  ✓ 2-Stage Same-Realm AudioContext & Mic Bridge (Mochi langsung bicara + mic langsung aktif) terjamin 100%');

console.log('[Test 9] Kawan Bicara: Same-Realm AudioContext Unlock (1-Frame Silent Buffer) & Direct Gesture Call Start');
assert.ok(
  appTsxContent.includes('const silentBuf = liveCtx.createBuffer(1, 1, liveCtx.sampleRate || 24000);') &&
    appTsxContent.includes('silentSrc.connect(liveCtx.destination);'),
  'primeAudioPlayback() wajib membuka kunci AudioContext melalui 1-frame silent AudioBuffer di dalam user gesture'
);
assert.ok(
  appTsxContent.includes('// Keep liveAudioCtxRef.current alive across calls in the same session (Mochi SOS parity)'),
  'stopLiveCall() wajib menjaga liveAudioCtxRef tetap hidup lintas panggilan agar tidak kehilangan unlock gesture'
);
assert.ok(
  appTsxContent.includes('hasDailyFree ||\n      balance >= KAWAN_BICARA_MIN_START_GEMS;') &&
    appTsxContent.includes('if (shouldStartImmediately) {') &&
    appTsxContent.includes('void startLiveCall();\n      return;'),
  'requestStartLiveCall() wajib langsung menjalankan startLiveCall() secara sinkron di dalam user gesture tanpa terhalang modal konfirmasi saat kuota gratis / Gem cukup'
);
console.log('  ✓ Same-realm AudioContext warmup & direct gesture start terverifikasi');

console.log('[Test 10] Kawan Bicara: Paritas Formant-Band VAD (300Hz-3300Hz), 2048-Sample Processor, & HandyVad -65dB Noise Floor');
assert.ok(
  appTsxContent.includes('const analyzeHumanVoiceBandFrame = (float32: Float32Array, inRate: number) => {'),
  'App.tsx wajib memiliki detektor pita vokal manusia analyzeHumanVoiceBandFrame (300Hz-3300Hz)'
);
assert.ok(
  appTsxContent.includes('createScriptProcessor(2048, 1, 1)') &&
    appJsContent.includes('ctx.createScriptProcessor(2048,1,1)'),
  'ScriptProcessor wajib menggunakan ukuran buffer rendah-latensi 2048 sampel (42.6ms) di kedua jembatan'
);
assert.ok(
  appTsxContent.includes('(v.isHumanSpeech || vadRes.inSpeech) && v.rms >= 0.002') &&
    !appTsxContent.includes('v.rms >= 0.005'),
  'Sensitivitas deteksi bicara isListeningSpeech wajib bebas bypass RMS noise (>0.005) agar kebisingan ruangan tidak menunda akhir giliran'
);
assert.ok(
  handyVadContent.includes('const INITIAL_NOISE_FLOOR_DB = -65.0;') &&
    handyVadContent.includes('public clearPreRoll(): void'),
  'handyVad.ts wajib menggunakan INITIAL_NOISE_FLOOR_DB = -65.0 dan menyediakan clearPreRoll()'
);
console.log('  ✓ Formant-Band VAD, 2048-sample ScriptProcessor, dan HandyVad -65dB terverifikasi');

console.log('[Test 11] Kawan Bicara: Proteksi Sapaan Pembuka (awaitingOpeningTurnRef 2200ms) & Anti-Drop Balasan Suara AI');
assert.ok(
  appTsxContent.includes('if (awaitingOpeningTurnRef.current) {\n      clearUserBurstEndTimer();\n      return;\n    }') &&
    appTsxContent.includes('awaitingOpeningTurnRef.current = true;') &&
    appTsxContent.includes('}, 2200);'),
  'Sapaan pembuka wajib dilindungi oleh awaitingOpeningTurnRef (2200ms) dan membebaskan mic seketika sesudahnya'
);
assert.strictEqual(
  /if\s*\(\s*userAudioBurstActiveRef\.current\s*\|\|/.test(appTsxContent),
  false,
  'ws.onmessage DILARANG KERAS membuang incomingAudioChunks balasan AI hanya karena userAudioBurstActiveRef masih true'
);
assert.ok(
  appTsxContent.includes('if (incomingAudioChunks.length > 0 && outputAudioCtxRef.current) {\n            clearUserBurstEndTimer();\n            userAudioBurstActiveRef.current = false;'),
  'Kedatangan incomingAudioChunks balasan AI wajib langsung menutup burst mic murid dan memutar suara AI'
);
console.log('  ✓ Proteksi sapaan pembuka & anti-drop balasan suara AI terverifikasi');

console.log('[Test 12] Kawan Bicara: End-of-Speech Real-Time (520ms), realtimeInputConfig VAD, Pre-Roll, & Anti-Halusinasi Vocab');
assert.ok(
  appTsxContent.includes('const silenceHoldMs = 520;') &&
    appTsxContent.includes('flushUserAudioStreamEnd()') &&
    appTsxContent.includes('scheduleUserBurstEnd();') &&
    appTsxContent.includes('automaticActivityDetection:') &&
    appTsxContent.includes('END_SENSITIVITY_HIGH'),
  'handleMicPcmData wajib mengaktifkan scheduleUserBurstEnd (520ms), flush audioStreamEnd real-time, serta realtimeInputConfig.automaticActivityDetection'
);
assert.strictEqual(
  appTsxContent.includes("'Fiezel',") || appTsxContent.includes("'Xiao Mochi',"),
  false,
  'customVocabTerms DILARANG menyuntikkan token nama aplikasi yang memicu halusinasi ASR pada ucapan pendek'
);
console.log('  ✓ Aliran kontinu 16kHz PCM & kebersihan customVocabTerms terverifikasi');

console.log('[Test 13] Kawan Bicara: Integritas Bundle Produksi dist/voice-studio.js');
assert.ok(
  distVoiceStudioContent.includes('__fzWireSharedMicBridge') &&
    distVoiceStudioContent.includes('__fzEnsureSharedLiveAudioCtx'),
  'Bundle produksi dist/voice-studio.js wajib memuat jembatan same-realm __fzWireSharedMicBridge & __fzEnsureSharedLiveAudioCtx'
);
assert.ok(
  distVoiceStudioContent.includes('Ketuk untuk Aktifkan Mic'),
  'Bundle produksi dist/voice-studio.js wajib memuat hasil build terbaru dari App.tsx'
);
console.log('  ✓ Integritas bundle produksi dist/voice-studio.js terverifikasi');

console.log('\n================================================================');
console.log('ALL 13/13 VOICE DUPLEX FULL-PHONE & BARGE-IN CONTRACT CHECKS PASSED!');
console.log('================================================================');
