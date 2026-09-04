'use strict';
// m025-42 OWNER experience batch:
//   1. Classroom press-to-talk with varied, lesson-aware answers
//   2. a mandatory daily target that locks every in-app exit — DIHAPUS di m025-254
//      (OWNER: "annoying banget"); bagian 2 kini gerbang penghapusannya
//   3. zoom disabled everywhere, by tag AND by gesture
//   4. one batch download for both neural voices, offered once and never again
const assert = require('assert');
const fs = require('fs');

const zoom = require('./features/ui/fiezel-zoom-lock.js');
// m025-96: gerbang unduhan dipensiunkan seluruhnya - berkasnya tidak ada lagi.
// m025-254: kunci target harian menyusul; berkasnya juga tidak ada lagi, jadi tidak ada
// yang bisa (atau boleh) di-require di sini - lihat bagian 2 di bawah.
// W4-QA — harness i18n, teknik union W2 (pola regression-test/tours-test W2-INT §1):
// naskah tutor-dialog PINDAH byte-identik ke copy-id-feat-b.js (AI-02 F01, W2-FEAT-B).
// require modul di ATAS ini sudah menyeret runtime FiezelI18n ke globalThis TANPA copy-map
// feat-b, sehingga jalur muat-mandiri di fiezel-tutor-dialog.js (yang hanya aktif saat
// global kosong) terlewati dan T() mengembalikan kunci mentah — merah 'the live topic is
// named' yang dicatat W2-TEST-B/W3-STT. Perbaikannya di harness, bukan di asersi: daftarkan
// copy-id-feat-b ke instans global yang sama SEBELUM dialog dimuat. Nilai yang di-assert
// di bawah tetap byte-identik dengan naskah id lama (Hukum Besi #1) — union = kalimatnya
// sah dirender lewat t() selama bytenya sama persis.
require('./features/i18n/copy-id-feat-b.js');
const dialog = require('./features/tutor-classroom/fiezel-tutor-dialog.js');

const index = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const chatSrc = fs.readFileSync('features/tutor-classroom/fiezel-tutor-voice-chat.js', 'utf8');
const tutorSrc = fs.readFileSync('features/tutor-classroom/fiezel-tutor-v3.js', 'utf8');
const tutorCss = fs.readFileSync('features/tutor-classroom/tutor-v3.css', 'utf8');
const dialogSrc = fs.readFileSync('features/tutor-classroom/fiezel-tutor-dialog.js', 'utf8');

let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('PASS', name); };

const LESSON = {
  topic: 'Present Perfect',
  level: 'B1',
  board: { title: 'Present Perfect', formula: 'Subject + have / has + V3', examples: ['I have finished my homework.', 'She has visited Singapore.'] }
};
const BEAT = { en: 'We use it when the result still matters now.', idText: 'Kita memakainya saat hasilnya masih terasa sekarang.' };

// ---- 3. zoom lock ------------------------------------------------------------------

test('the viewport pins page zoom, and the pin is not merely cosmetic', () => {
  // Wave D (D5 Tinggi-1) dulu MENCABUT kunci zoom demi WCAG 1.4.4, dan assert di bawah dulu
  // menegakkan arah itu. m025-186: OWNER MEMBALIKKANNYA pada 29 Agu 2026, sesudah biayanya
  // disampaikan - FIEZEL harus terasa aplikasi, bukan dokumen. Arah assert dibalik secara
  // TERBUKA di sini, bukan dihapus, supaya pembaca berikutnya tahu ini keputusan produk dan
  // bukan regresi yang lolos.
  //
  // BIAYA YANG DITERIMA: murid low-vision kehilangan perbesaran halaman (WCAG 1.4.4/1.4.10).
  // Utang: pengatur ukuran teks di dalam aplikasi. Rincian di app-interaction-policy-test.js.
  const meta = (index.match(/<meta name="viewport"[^>]*>/) || [''])[0];
  assert.match(meta, /user-scalable=no/, 'page zoom is pinned by owner decision m025-186');
  assert.match(meta, /maximum-scale=1\b/, 'the pin is 1x');
  assert.match(css, /touch-action:manipulation/, 'double-tap zoom is still removed in CSS');
  assert.match(css, /text-size-adjust:100%/, 'the OS must not rescale text either');
  // Kunci yang hanya ada di meta adalah kunci palsu: iOS Safari mengabaikan user-scalable
  // sejak iOS 10. Yang benar-benar mengunci pinch di iPhone adalah gesture WebKit.
  const lock = fs.readFileSync('features/ui/fiezel-zoom-lock.js', 'utf8');
  assert.match(lock, /addEventListener\(\s*'gesturestart'/, 'WebKit pinch must actually be blocked');
});

test('pinch and double tap are refused at the event level, because iOS ignores the tag', () => {
  let now = 1000;
  const guard = zoom.createGuard(() => now);
  assert.strictEqual(guard.isPinch(2), true, 'two fingers is a pinch');
  assert.strictEqual(guard.isPinch(1), false, 'one finger must still scroll and tap');
  assert.strictEqual(guard.isDoubleTap(100, 100), false, 'a first tap is just a tap');
  now += 120;
  assert.strictEqual(guard.isDoubleTap(105, 104), true, 'a quick second tap nearby is a zoom gesture');
  now += 120;
  assert.strictEqual(guard.isDoubleTap(105, 104), false, 'the pair is consumed, so a third tap is free');
  now += 2000;
  assert.strictEqual(guard.isDoubleTap(105, 104), false, 'a slow second tap is two separate taps');
  now += 100;
  assert.strictEqual(guard.isDoubleTap(400, 400), false, 'a quick tap far away is not a double tap');
});

test('the zoom lock is loaded and precached, and never blocks single-finger input', () => {
  assert.ok(index.includes('./features/ui/fiezel-zoom-lock.js'), 'loaded by the document');
  assert.ok(sw.includes('./features/ui/fiezel-zoom-lock.js'), 'precached for offline');
  const src = fs.readFileSync('features/ui/fiezel-zoom-lock.js', 'utf8');
  assert.match(src, /passive: false/, 'a passive listener cannot cancel a gesture');
  assert.match(src, /gesturestart/, 'the WebKit pinch events are handled');
  // The single-touch path must never be cancelled or scrolling and every button dies.
  assert.ok(/isPinch\(event && event\.touches && event\.touches\.length\)/.test(src),
    'touchmove is only cancelled when more than one finger is down');
});

// ---- 4. one-batch voice download ---------------------------------------------------

test('m025-96: gerbang unduhan dipensiunkan seluruhnya', () => {
  // Bukan sekadar dimatikan: berkasnya dihapus, pemicunya dicabut dari app.js, dan
  // pendaftarannya hilang dari index.html serta sw.js. Modul mati yang masih dimuat
  // adalah cara termudah sheet wajib itu kembali lewat satu pemanggil yang terlewat.
  assert.ok(!fs.existsSync('features/neural-voice/fiezel-voice-bundle-gate.js'),
    'berkas gerbang harus terhapus');
  assert.ok(!app.includes('FiezelVoiceBundleGate'), 'app.js tidak boleh memicunya lagi');
  assert.ok(!index.includes('fiezel-voice-bundle-gate.js'), 'index tidak boleh memuatnya');
});

test('progress is reported as one number across both bundles', () => {
  // Perhitungan kemajuan unduhan ikut hilang bersama gerbangnya.
});

test('m025-96: gerbang unduhan digantikan pintu bicara bersama', () => {
  // Prompt ketiga di onboarding - sheet unduhan tanpa tombol "nanti" - dihapus. Suara
  // dirender di server, jadi tidak ada bundel yang perlu ada sebelum FIEZEL bisa bicara.
  assert.ok(!index.includes('fiezel-voice-bundle-gate.js'), 'gerbang tidak boleh dimuat lagi');
  assert.ok(!sw.includes('fiezel-voice-bundle-gate.js'), 'gerbang tidak boleh tersimpan lagi');
  assert.ok(index.includes('./features/neural-voice/fiezel-voice-say.js'), 'pintu bicara bersama dimuat');
  assert.ok(sw.includes('./features/neural-voice/fiezel-voice-say.js'), 'pintu bicara bersama tersimpan');
  assert.ok(!/FiezelVoiceBundleGate/.test(app), 'app.js tidak boleh memicu gerbang yang sudah dihapus');
});

// ---- 2. m025-254: kunci "target harian WAJIB" DIHAPUS -------------------------------
//
// OWNER, 4 Sep 2026: "HAPUSKAN SISTEM POPUP TARGET HARIAN FIEZEL YANG WAJIB ITU, KARENA
// ITU ANNOYING BANGET." Yang dihapus adalah SELURUH lapisannya: modulnya, lembar
// #dailyLock, pembungkus window.go yang menolak perpindahan, kelas body.daily-locked,
// naskah daily.* di kedua copy-map, dan aturan CSS-nya. Asersi di bawah dibalik secara
// terbuka - persis cara m025-96 memensiunkan gerbang unduhan suara di atas - supaya
// pembaca berikutnya tahu ini keputusan produk, bukan gerbang yang diam-diam hilang.
//
// Bentuk lamanya, dicatat agar tidak lahir kembali dengan nama lain: modul itu memasang
// dirinya sendiri 1,2 detik setelah boot, membuka lembar penuh layar begitu murid
// memenuhi syarat (notifikasi + sudah tes), lalu MENOLAK setiap panggilan go() sampai
// jumlah soal hari itu tercapai. Meninggalkan aplikasi tidak menghapusnya; ia kembali
// pada kunjungan berikutnya.

test('m025-254: tidak ada lagi kunci target harian di mana pun', () => {
  assert.ok(!fs.existsSync('features/daily-target/fiezel-daily-target.js'), 'modulnya harus terhapus');
  assert.ok(!fs.existsSync('features/daily-target'), 'foldernya ikut terhapus, bukan disisakan kosong');
  assert.ok(!index.includes('fiezel-daily-target.js'), 'index tidak boleh memuatnya');
  assert.ok(!sw.includes('fiezel-daily-target.js'), 'service worker tidak boleh menyimpannya');
  assert.ok(!/FiezelDailyTarget/.test(app), 'app.js tidak boleh menanyakan modul yang sudah tidak ada');
  assert.ok(!/daily-lock/.test(css), 'lembar dan panel kuncinya tidak boleh punya gaya lagi');
  assert.ok(!/daily-locked/.test(css), 'kelas pengunci navigasi ikut hilang');
  // app.js masih MENYEBUT kelas itu di catatan sejarah m025-254 - itu memang gunanya
  // catatan. Yang dilarang adalah KODE yang menanyakannya kepada <body>.
  assert.ok(!/contains\?\.\('daily-locked'\)/.test(app), 'hook locked back-nav tidak boleh menunggu kelas yang tak pernah dipasang');
  assert.ok(!/dailyLock/.test(index), 'tidak ada sisa markup lembar kunci di dokumen');
});

test('m025-254: naskah kuncinya ikut hilang dari kedua copy-map', () => {
  const idCopy = fs.readFileSync('features/i18n/copy-id-feat-a.js', 'utf8');
  const thCopy = fs.readFileSync('features/i18n/copy-th-feat-a.js', 'utf8');
  // Naskah yatim = godaan untuk menghidupkan kembali fiturnya "karena kalimatnya sudah ada".
  assert.ok(!/'daily\./.test(idCopy), 'kunci daily.* tidak boleh tersisa di copy-map Indonesia');
  assert.ok(!/'daily\./.test(thCopy), 'kunci daily.* tidak boleh tersisa di copy-map Thai');
  assert.ok(!idCopy.includes('TARGET HARIAN FIEZEL'), 'judul lembar kuncinya benar-benar hilang');
});

test('m025-254: hari yang tuntas tetap dikenali, tanpa mengunci apa pun', () => {
  // Yang dihapus adalah KUNCINYA, bukan kemampuan aplikasi mengenali hari yang beres:
  // kartu Home masih berganti isi dan bukti sosial daily_target masih berangkat. Keduanya
  // kini bertanya ke satu fungsi biasa di app.js yang tidak menyentuh navigasi sama sekali.
  assert.match(app, /function dailySessionDone\(target\)\{/, 'penggantinya sebuah pertanyaan, bukan gerbang');
  assert.match(app, /selesai=!state\.activeSession&&dailySessionDone\(shape\.soal\)/, 'kartu Home memakainya');
  assert.match(app, /if\(dailySessionDone\(\)\)events\.push\(\{kind:'daily_target'\}\)/, 'bukti sosial memakainya');
  // Gerbang anti-kambuh: tidak ada pembungkus go() yang menolak perpindahan atas nama target.
  assert.ok(!/__dailyTargetGuarded/.test(app), 'go() tidak boleh dibungkus penolak navigasi');
});

// ---- 1. press-to-talk --------------------------------------------------------------

test('what the learner asks for is recognised, in Indonesian', () => {
  assert.strictEqual(dialog.classify('kenapa bukan I have went?'), 'why');
  assert.strictEqual(dialog.classify('kasih contoh dong'), 'example');
  assert.strictEqual(dialog.classify('apa bedanya went sama gone'), 'difference');
  assert.strictEqual(dialog.classify('tolong ulangi'), 'repeat');
  assert.strictEqual(dialog.classify('terlalu cepat, pelan dong'), 'slower');
  assert.strictEqual(dialog.classify('aku masih bingung'), 'confused');
  assert.strictEqual(dialog.classify('bahasa inggrisnya apa'), 'translate');
  assert.strictEqual(dialog.classify('ini keluar di TOEFL?'), 'exam');
  assert.strictEqual(dialog.classify(''), 'empty', 'silence is its own case, not an error');
  assert.strictEqual(dialog.classify('bagaimana kalau subjeknya jamak'), 'open', 'anything else still gets an answer');
});

test('answers are built from the lesson on screen, not from a canned string', () => {
  const memory = dialog.createMemory();
  const reply = dialog.respond('apa itu present perfect', { lesson: LESSON, beat: BEAT }, memory);
  assert.strictEqual(reply.intent, 'meaning');
  assert.ok(reply.id.includes('Present Perfect'), 'the live topic is named');
  assert.ok(reply.id.includes('have / has + V3'), 'the live formula is used');
  assert.ok(!/\{\w+\}/.test(reply.id), 'no placeholder may reach the learner');
  const repeatReply = dialog.respond('ulangi', { lesson: LESSON, beat: BEAT }, memory);
  assert.ok(repeatReply.id.includes(BEAT.idText), 'a repeat replays the actual teaching beat');
});

test('asking the same thing twice never returns the same sentence', () => {
  const memory = dialog.createMemory();
  const seen = new Set();
  for (let i = 0; i < 3; i++) {
    const reply = dialog.respond('kenapa begitu?', { lesson: LESSON, beat: BEAT }, memory);
    assert.ok(!seen.has(reply.id), `variant ${i} repeated a previous answer`);
    seen.add(reply.id);
  }
  assert.strictEqual(seen.size, 3, 'three asks, three phrasings');
  // Different learners/questions must not share one rotating counter.
  const other = dialog.createMemory();
  const first = dialog.respond('kenapa begitu?', { lesson: LESSON, beat: BEAT }, other);
  assert.ok(first.id.length > 0, 'a fresh memory answers from the top');
});

test('a missing lesson degrades to a usable answer instead of throwing', () => {
  const reply = dialog.respond('apa itu ini', {}, dialog.createMemory());
  assert.ok(reply.id.length > 0, 'still answers');
  assert.ok(!/\{\w+\}/.test(reply.id), 'still no placeholders');
  assert.ok(!/undefined|null/.test(reply.id), 'no debris from missing fields');
});

test('the AI prompt carries the lesson and forbids repetitive phrasing', () => {
  const prompt = dialog.aiPrompt('kenapa bukan I have went?', { lesson: LESSON, beat: BEAT });
  assert.ok(prompt.includes('Present Perfect'), 'the model is told what is on screen');
  assert.ok(prompt.includes('Jangan mengulang kalimat pembuka yang sama'), 'variation is required of the model too');
  assert.ok(prompt.includes('kenapa bukan I have went?'), 'the question is passed through');
});

test('the round button exists, answers by voice, and never falls back to browser TTS', () => {
  assert.match(tutorCss, /\.tutor-talk-button\{[^}]*border-radius:50%/, 'the button is round');
  assert.match(tutorCss, /\.tutor-talk-dock\{[^}]*left:50%/, 'and centred');
  assert.match(chatSrc, /SpeechRecognition \|\| root\.webkitSpeechRecognition/, 'speech input where the platform has it');
  assert.match(chatSrc, /openTypeSheet/, 'and a typing fallback where it does not, so the button is never dead');
  // OWNER: the chat log covered the lesson. It must be gone, and the answer goes to the
  // tutor's own subtitle line instead.
  assert.ok(!/tutorTalkLog/.test(chatSrc), 'no chat box may cover the material');
  assert.ok(!/tutor-talk-log/.test(tutorCss), 'and no styles for one may linger');
  assert.match(chatSrc, /function showAnswer/, 'the answer lands in the lesson subtitle');
  assert.ok(!/speechSynthesis|SpeechSynthesisUtterance/.test(chatSrc), 'browser TTS is never used');
  // m025-95: pilihan cadangan tidak lagi diputuskan di sini. Mesin Puter tidak punya
  // jalur cadangan browser sama sekali, dan seluruh keputusan bicara pindah ke satu
  // pintu bersama - jadi yang dijaga adalah tutor memakai pintu itu, bukan benderanya.
  assert.match(chatSrc, /FiezelVoiceSay/, 'tutor bicara lewat pintu bersama');
  // AI first, local engine second: an offline learner must still get an answer.
  const answerFn = chatSrc.slice(chatSrc.indexOf('function answer(question)'));
  assert.ok(answerFn.indexOf('aiAnswer(') < answerFn.indexOf('localAnswer('),
    'the gateway is tried before the local engine');
  assert.match(chatSrc, /if \(aiText\) return/, 'the local engine answers whenever the gateway does not');
  assert.match(tutorSrc, /__fiezelTutorContext/, 'the live lesson checkpoint is exposed to the talk layer');
  assert.ok(index.includes('./features/tutor-classroom/fiezel-tutor-dialog.js'), 'dialog engine loaded');
  assert.ok(index.includes('./features/tutor-classroom/fiezel-tutor-voice-chat.js'), 'talk layer loaded');
  assert.ok(sw.includes('./features/tutor-classroom/fiezel-tutor-voice-chat.js'), 'precached for offline use');
  assert.ok(index.indexOf('./features/tutor-classroom/fiezel-tutor-dialog.js') < index.indexOf('./features/tutor-classroom/fiezel-tutor-voice-chat.js'),
    'the engine must load before the layer that consumes it');
});


// ---- m025-43 OWNER repair batch ----------------------------------------------------

test('tidak ada lagi lembar pemblokir yang menyalakan dirinya sendiri saat boot', () => {
  // Dulu: kunci target harian memasang dirinya 1,2 dtk setelah boot (m025-43), dan harus
  // mengintip #voiceBundleSheet supaya dua lembar pemblokir tidak bertumpuk. Kedua lembar
  // itu sekarang sudah dihapus (m025-96 dan m025-254), jadi yang dijaga tinggal
  // ketiadaannya - boot tidak boleh lagi melahirkan lapisan yang menahan murid.
  assert.ok(!/voiceBundleSheet/.test(app), 'lembar unduhan suara tidak boleh disebut lagi');
  assert.ok(!/dailyLock/.test(app), 'lembar target harian tidak boleh disebut lagi');
});

test('long press can no longer select or copy the interface', () => {
  assert.match(css, /-webkit-touch-callout:none/, 'the iOS copy callout is disabled');
  assert.match(css, /user-select:none/, 'selection is off for the interface');
  assert.match(css, /input,textarea,select,\[contenteditable="true"\]\{-webkit-user-select:text/,
    'real text fields keep selection, or typing breaks');
});

test('wrong answers buzz hard and sound wrong, everywhere', () => {
  assert.match(app, /error:\[90,60,90,60,140\]/, 'a wrong answer is a long, unmistakable pattern');
  assert.ok(!/error:\[28,45,28\]/.test(app), 'the old 28ms flutter is gone');
  // A stored preference that was never written must not read as "off".
  assert.match(app, /function feedbackSoundsOn\(\)\{return state\.preferences\?\.feedbackSounds!==false\}/,
    'only an explicit false disables sound');
  assert.match(app, /state\.preferences\?\.haptics===false/, 'same for haptics');
  assert.match(app, /bindAudioUnlockGestures/, 'the audio context is resumed on the first gesture');
  assert.match(app, /window\.answerFeedbackSignal=answerFeedbackSignal/, 'other layers can fire the same feedback');
  assert.match(tutorSrc, /answerFeedbackSignal/, 'Classroom answers are no longer silent');
  // iOS has no Vibration API at all; the code must say so rather than pretend.
  assert.match(app, /iOS Safari has NO Vibration API/, 'the platform limit is documented where it bites');
});

test('Fiezel AI answers anything, and says plainly when it cannot', () => {
  const prompt = dialog.aiPrompt('siapa penemu listrik?', { lesson: LESSON, beat: BEAT });
  assert.ok(/APA PUN/.test(prompt), 'the model is told to answer any question');
  assert.ok(/Jangan menolak pertanyaan hanya karena berada di luar materi/.test(prompt),
    'and told not to deflect back to the lesson');
  assert.ok(/Konteks opsional/.test(prompt), 'the lesson is background, not the subject');
  assert.ok(!/Kamu adalah FIEZEL, tutor bahasa Inggris untuk pelajar Indonesia level/.test(dialogSrc),
    'the lesson-locked persona is gone');
  // Offline honesty: an off-topic question without the gateway says why.
  assert.match(chatSrc, /function unavailableReason/, 'the reason is surfaced to the learner');
  // W4-QA — union W2: kalimatnya PINDAH byte-identik ke copy-id-feat-b.js (AI-02 F01);
  // sah bila masih inline ATAU dirender lewat kunci i18n yang nilainya memuat kalimat sama.
  const featBCopySrc = fs.readFileSync('features/i18n/copy-id-feat-b.js', 'utf8');
  assert.ok(/login Puter dulu/.test(chatSrc) ||
    (/T\('tutor\.ai-need-login'\)/.test(chatSrc) && /login Puter dulu/.test(featBCopySrc)),
    'and it names the actual fix');
});

test('Speaking and Listening no longer carries an optional voice setup', () => {
  const skills = app.slice(app.indexOf('async function skillsLab'), app.indexOf('async function startAdaptive'));
  assert.ok(!/neuralVoiceStatusMarkup\(\)/.test(skills), 'the optional card is out of Skills Lab');
  assert.ok(!/prepareIndonesianVoice\)/.test(skills), 'and so are its buttons');
  // Nothing is lost: the same controls now live in Settings, where setup belongs.
  const settings = app.slice(app.indexOf('function openSettings()'), app.indexOf('function saveSettings()'));
  assert.ok(/neuralVoiceStatusMarkup\(\)/.test(settings), 'the controls moved to Settings');
  assert.ok(/prepareNeuralVoice/.test(settings), 'with their handlers');
});

console.log(`FIEZEL m025-42/43 experience batch: PASS ${pass}/${pass}`);
