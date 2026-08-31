/**
 * FIEZEL gerbang — gems-test.js · Gem Terjemahan (ekonomi + toggle terjemahan listening).
 *
 * Kontrak owner yang dijaga berkas ini, satu per satu:
 *
 *   G1  aturan hadiah    — 5 benar beruntun dalam sesi listening = +2 gem; runtun 4 = 0
 *   G2  pagar farming    — maksimal 2 hadiah per sesi; hadiah ketiga tertahan
 *   G3  belanja          — saldo cukup memotong 1; saldo kurang MENOLAK tanpa efek samping
 *   G4  invarian dompet  — balance === earnedTotal - spentTotal >= 0; ledger dipotong 60
 *   G5  state default    — state kanonik app.js punya `gems` dan ikut sanitize()
 *   G6  tagih-saat-tampil— gem dipotong sekali saja, dan HANYA kalau terjemahan tampil
 *   G7  m025-148         — suppressSubtitles tetap dikirim ke TTS walau terjemahan ON
 *   G8  bukan paywall    — teks keadaan habis mengajak belajar, tidak menjual apa pun
 *
 * MENGAPA VM. Aturan uang tidak boleh diuji lewat tiruan aturannya. Modul gems-core.js
 * dieksekusi apa adanya di dalam vm dengan sandbox yang SENGAJA kosong: tanpa document,
 * tanpa localStorage, tanpa fetch, tanpa navigator. Kalau suatu hari ada yang menyelipkan
 * penyimpanan atau jaringan ke dalam aturan ekonomi, berkas ini gagal saat dimuat - bukan
 * nanti di perangkat murid.
 *
 * Tidak ada DOM sungguhan dan tidak ada jaringan di seluruh gerbang ini. Bagian yang
 * memang butuh elemen (G6, G7) memakai DOM tiruan seukuran kebutuhan, dan justru itu yang
 * membuatnya bisa memeriksa argumen yang benar-benar dikirim ke TTS.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const feature = path.join(root, 'features', 'speaking-listening');
const gemsSource = fs.readFileSync(path.join(feature, 'gems-core.js'), 'utf8');
const addonSource = fs.readFileSync(path.join(feature, 'fiezel-speaking-listening-addon.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const copySource = (() => {
  for (const p of [path.join(root, 'reports', 'copy-tour-gems.md'), path.join(root, '..', 'reports', 'copy-tour-gems.md')]) {
    try { return fs.readFileSync(p, 'utf8'); } catch (_) {}
  }
  return '';
})();

let failed = 0, passed = 0;
// Antrean, bukan eksekusi langsung. Sebagian pemeriksaan (tagih-saat-tampil, regresi
// suppressSubtitles) memang asinkron, dan assertion di dalam promise yang tidak pernah
// ditunggu akan hilang tanpa jejak - gerbang yang bisa lolos tanpa menjalankan isinya
// lebih berbahaya daripada tidak ada gerbang. Semua tes karena itu dijalankan berurutan
// dan hasilnya di-await satu per satu di akhir berkas.
const queue = [];
function test(name, fn) { queue.push({ name, fn }); }
async function runQueue() {
  for (const entry of queue) {
    try { await entry.fn(); passed++; console.log('ok   - ' + entry.name); }
    catch (error) { failed++; console.log('FAIL - ' + entry.name + '\n       ' + (error && error.message ? error.message : error)); }
  }
}

/* ============================================================ modul di sandbox kosong === */

// Sandbox tanpa satu pun pintu efek samping. `module` disediakan supaya cabang CommonJS
// UMD yang dipakai aplikasi Node-nya sendiri yang diuji, bukan cabang browser.
const sandbox = { module: { exports: {} }, exports: {}, console: { log() {} } };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(gemsSource, sandbox, { filename: 'gems-core.js' });
const GEMS = sandbox.module.exports;

test('modul gems termuat di sandbox tanpa DOM/penyimpanan/jaringan', () => {
  assert.equal(GEMS.SCHEMA, 'fiezel-gems-v1');
  for (const key of ['gemsAward', 'gemsSpend', 'gemsEarn', 'sanitizeGems', 'freshGems'])
    assert.equal(typeof GEMS[key], 'function', 'hilang: ' + key);
  for (const forbidden of ['document', 'localStorage', 'fetch', 'navigator', 'window'])
    assert.equal(typeof sandbox[forbidden], 'undefined', 'sandbox mendapat ' + forbidden + ' — aturan uang tidak boleh butuh itu');
});
test('sumber gems-core tidak menyentuh penyimpanan, jaringan, atau waktu tersembunyi', () => {
  // Komentar dikupas dulu: berkas itu MENJELASKAN kenapa ia tidak memakai localStorage,
  // dan pemindaian naif akan menuduhnya justru karena kejujuran itu.
  const code = gemsSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of ['localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'document.', 'Date.now()']) {
    assert.ok(!code.includes(forbidden),
      'gems-core.js memakai ' + forbidden + ' — aturan ekonomi harus murni; waktu diterima sebagai argumen, bukan diambil sendiri');
  }
});

/* =========================================================== G1/G2: aturan hadiah ====== */

test('G1 runtun 5 memberi +2 gem', () => assert.equal(GEMS.gemsAward(5, 0), 2));
test('G1 runtun 4 memberi 0 gem (belum sampai target)', () => assert.equal(GEMS.gemsAward(4, 0), 0));
test('G1 runtun 1..4 dan 6..9 tidak pernah memberi hadiah', () => {
  for (const s of [1, 2, 3, 4, 6, 7, 8, 9]) assert.equal(GEMS.gemsAward(s, 0), 0, 'runtun ' + s);
});
test('G1 runtun 10 memberi hadiah kedua', () => assert.equal(GEMS.gemsAward(10, 1), 2));
test('G2 hadiah ketiga tertahan pagar maks 2/sesi', () => {
  assert.equal(GEMS.gemsAward(15, 2), 0);
  assert.equal(GEMS.gemsAward(5, 2), 0);
  assert.equal(GEMS.gemsAward(100, 2), 0);
});
test('G2 pagar dibaca dari GEMS_RULES, bukan angka tertanam', () => {
  assert.deepStrictEqual(
    [GEMS.GEMS_RULES.streakTarget, GEMS.GEMS_RULES.perAward, GEMS.GEMS_RULES.maxAwardsPerSession, GEMS.GEMS_RULES.translationCost],
    [5, 2, 2, 1]);
  assert.ok(Object.isFrozen(GEMS.GEMS_RULES), 'GEMS_RULES harus dibekukan');
});
test('G1 masukan rusak tidak melempar dan tidak pernah negatif', () => {
  for (const bad of [-1, NaN, undefined, null, '5', {}, Infinity, -Infinity]) {
    const out = GEMS.gemsAward(bad, 0);
    assert.ok(Number.isFinite(out) && out >= 0, 'gemsAward(' + String(bad) + ') = ' + out);
  }
});
test('G1 jawaban salah menol-kan runtun: [T,T,T,T,F,T,T,T,T,T] tepat satu hadiah di akhir', () => {
  const sequence = [true, true, true, true, false, true, true, true, true, true];
  let streak = 0, awards = 0;
  const wonAt = [];
  sequence.forEach((ok, index) => {
    streak = ok ? streak + 1 : 0;
    const won = GEMS.gemsAward(streak, awards);
    if (won > 0) { awards++; wonAt.push(index); }
  });
  assert.deepStrictEqual(wonAt, [9], 'hadiah jatuh di indeks ' + wonAt.join(','));
  assert.equal(awards, 1);
});

/* ================================================================ G3/G4: dompet ======== */

test('G3 saldo cukup: 1 gem terpotong dan ledger mencatat delta -1', () => {
  const before = GEMS.gemsEarn(GEMS.freshGems(), 2, 'listening_streak_5', 1000, 'sl-a', 'A1');
  const out = GEMS.gemsSpend(before, 1, 'translation_session', 2000, 'sl-a');
  assert.equal(out.ok, true);
  assert.deepStrictEqual([out.gems.balance, out.gems.earnedTotal, out.gems.spentTotal], [1, 2, 1]);
  assert.equal(out.gems.ledger.length, 2);
  assert.equal(out.gems.ledger[1].delta, -1);
  assert.equal(out.gems.ledger[1].reason, 'translation_session');
});
test('G3 saldo kurang: {ok:false} DAN objek masukan tidak termutasi sama sekali', () => {
  const empty = GEMS.freshGems();
  const snapshot = JSON.parse(JSON.stringify(empty));
  const out = GEMS.gemsSpend(empty, 1, 'translation_session', 2000, 'sl-a');
  assert.equal(out.ok, false);
  assert.equal(JSON.stringify(empty), JSON.stringify(snapshot), 'penolakan meninggalkan efek samping — itu bukan penolakan bersih');
  assert.equal(out.gems, empty, 'penolakan harus mengembalikan objek yang sama, bukan salinan baru');
});
test('G3 gemsEarn tidak memutasi masukan', () => {
  const before = GEMS.freshGems();
  const snapshot = JSON.parse(JSON.stringify(before));
  GEMS.gemsEarn(before, 2, 'listening_streak_5', 1000, 'sl-a', 'A1');
  assert.equal(JSON.stringify(before), JSON.stringify(snapshot));
});
test('G4 invarian balance === earnedTotal - spentTotal bertahan lewat urutan acak', () => {
  let gems = GEMS.freshGems();
  for (let i = 0; i < 400; i++) {
    if (i % 3 === 0) gems = GEMS.gemsEarn(gems, 2, 'listening_streak_5', 1000 + i, 'sl-' + i, 'A1');
    else { const r = GEMS.gemsSpend(gems, 1, 'translation_session', 1000 + i, 'sl-' + i); if (r.ok) gems = r.gems; }
    assert.equal(gems.balance, gems.earnedTotal - gems.spentTotal, 'invarian pecah di langkah ' + i);
    assert.ok(gems.balance >= 0, 'saldo negatif di langkah ' + i);
  }
  assert.equal(gems.ledger.length, GEMS.LEDGER_LIMIT, 'ledger harus dipotong ke ' + GEMS.LEDGER_LIMIT);
});
test('G4 sanitizeGems: schema asing direset bersih', () => {
  const fresh = JSON.stringify(GEMS.freshGems());
  assert.equal(JSON.stringify(GEMS.sanitizeGems({ schema: 'sesuatu-lain', balance: 999 })), fresh);
  assert.equal(JSON.stringify(GEMS.sanitizeGems(null)), fresh);
  assert.equal(JSON.stringify(GEMS.sanitizeGems('rusak')), fresh);
});
test('G4 sanitizeGems: angka rusak direkonsiliasi, tidak melempar', () => {
  const negative = GEMS.sanitizeGems({ schema: 'fiezel-gems-v1', balance: -8, earnedTotal: 6, spentTotal: 2, ledger: null });
  assert.deepStrictEqual([negative.balance, negative.earnedTotal, negative.spentTotal], [4, 6, 2]);
  const impossible = GEMS.sanitizeGems({
    schema: 'fiezel-gems-v1', balance: 50, earnedTotal: 1, spentTotal: 9,
    ledger: [{ at: 1, delta: 4, reason: 'listening_streak_5' }, { at: 2, delta: -1, reason: 'translation_session' }]
  });
  assert.equal(impossible.balance, impossible.earnedTotal - impossible.spentTotal);
  assert.deepStrictEqual([impossible.earnedTotal, impossible.spentTotal, impossible.balance], [4, 1, 3]);
  assert.ok(GEMS.sanitizeGems({ schema: 'fiezel-gems-v1', ledger: [null, 'x', { delta: 0 }] }).ledger.length === 0);
});

/* ============================================================== G5: state kanonik ====== */

// Blok fungsi dompet app.js dijalankan di vm dengan FiezelGems yang sudah terbukti di atas.
// Yang diuji bukan "apakah ada teks gems di app.js", melainkan bahwa fungsinya benar-benar
// mengembalikan dompet berskema dan bahwa sanitize memakai jalur yang sama.
function sourceBlock(name, source) {
  // Pemotong berbasis kurung seimbang, bukan "sampai fungsi berikutnya": app.js menyelipkan
  // const dan IIFE di antara deklarasi fungsi, dan potongan yang kelebihan satu baris akan
  // menarik separuh aplikasi ke dalam vm.
  const start = source.search(new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\('));
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return source.slice(start, i + 1); }
  }
  return '';
}
test('G5 defaultState app.js memuat gems dan sanitizeState menyalurkannya', () => {
  assert.ok(/const defaultState=\{[^\n]*gems:defaultGems\(\)/.test(appSource),
    'defaultState tidak memuat gems:defaultGems() — dompet tidak akan ikut save()');
  assert.ok(appSource.includes('gems:sanitizeGemsState(raw?.gems)'),
    'sanitizeState tidak menyalurkan gems — state rusak akan lolos ke runtime');
});
test('G5 defaultGems()/sanitizeGemsState() app.js mengembalikan dompet berskema', () => {
  const blocks = ['gemsCore', 'defaultGems', 'sanitizeGemsState', 'gemsBalance']
    .map(name => { const b = sourceBlock(name, appSource); assert.ok(b, 'blok ' + name + '() tidak ditemukan di app.js'); return b; })
    .join('\n');
  const appBox = { self: { FiezelGems: GEMS }, state: null, APP_VERSION: 'test', console: { log() {}, warn() {} } };
  appBox.globalThis = appBox;
  vm.createContext(appBox);
  // `var`, bukan `const`: deklarasi leksikal di vm.runInContext tidak menempel sebagai
  // properti objek global, jadi hasilnya tidak akan pernah terlihat dari luar.
  vm.runInContext(blocks + '\nvar __fresh=defaultGems();var __clean=sanitizeGemsState({schema:"x"});state={gems:{balance:7}};var __bal=gemsBalance();', appBox);
  assert.equal(JSON.stringify(appBox.__fresh), JSON.stringify(GEMS.freshGems()));
  assert.equal(appBox.__fresh.schema, 'fiezel-gems-v1');
  assert.equal(JSON.stringify(appBox.__clean), JSON.stringify(GEMS.freshGems()), 'state gems berskema asing harus direset');
  assert.equal(appBox.__bal, 7);
});
test('G5 kait dompet disuntik ke addon dari skillsLab(), bukan disentuh sidecar langsung', () => {
  assert.ok(appSource.includes('gems:gemsHook()'), 'FiezelSLAddon.create tidak menerima kait gems');
  const hook = sourceBlock('gemsHook', appSource);
  assert.ok(hook.includes('gemsEarn(') && hook.includes('gemsSpend(') && hook.includes('save()'),
    'gemsHook harus memakai fungsi murni dan memanggil save()');
  assert.ok(!/harga|beli|purchase|topup|top-up|iap/i.test(hook),
    'gemsHook memuat jalur pembelian — gem tidak pernah dijual');
});

/* ====================== DOM tiruan seukuran kebutuhan (untuk G6 dan G7) ================= */

function fakeElement(tag) {
  return {
    tagName: tag || 'div', innerHTML: '', textContent: '', hidden: false, disabled: false, value: '',
    className: '', dataset: {}, style: {}, attrs: {}, listeners: {},
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); },
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    fire(type) { return Promise.all((this.listeners[type] || []).map(fn => fn({ currentTarget: this }))); },
    querySelector() { return null; }, querySelectorAll() { return []; }
  };
}
function fakeRoot(selectors) {
  const map = {};
  for (const sel of selectors) map[sel] = fakeElement('div');
  map['[data-translate-toggle]'].attrs['data-translate-toggle'] = '';
  return {
    innerHTML: '', map,
    querySelector(sel) { return map[sel] || null; },
    querySelectorAll(sel) { const el = map[sel]; return el ? [el] : []; }
  };
}
const SESSION_SELECTORS = ['[data-play]', '[data-exit]', '[data-work]', '[data-submit]', '[data-replays]',
  '[data-feedback]', '[data-translation]', '[data-translate-toggle]', '[data-gem-chip]', '[data-gem-count]',
  '[data-gem-price]', '[data-gem-streak]', '[data-gem-empty]', 'button'];

// FiezelGems dan FiezelSubtitleTranslate dipasang di global SEBELUM addon di-require: addon
// membacanya lewat `global` seperti di browser, jadi jalur yang diuji sama dengan jalur nyata.
globalThis.FiezelGems = GEMS;
let translateCalls = [];
let translateResult = '';
globalThis.FiezelSubtitleTranslate = {
  translate(text) { translateCalls.push(String(text)); return Promise.resolve(translateResult); }
};
const runtime = require(path.join(feature, 'fiezel-speaking-listening-addon.js'));
const Controller = runtime.__test.Controller;

const ITEM = Object.freeze({
  id: 'listen_sc_test_0001', level: 'A1', mode: 'gist', script: 'The bus leaves at seven.',
  question: 'Apa inti percakapannya?', options: ['Bus pukul tujuh', 'Bus pukul delapan', 'Tidak ada bus', 'Bus penuh'],
  answerIndex: 0, maxReplays: 2, voice: 'af_bella'
});

function makeController(balance) {
  const wallet = { balance: Math.max(0, Number(balance) || 0), spends: [], awards: [] };
  const tts = { calls: [], play(text, options) { this.calls.push({ text, options }); return Promise.resolve({ provider: 'stub' }); }, stop() {} };
  const controller = new Controller({
    activeLevel: 'A1', tts,
    gems: {
      balance: () => wallet.balance,
      award: (n, reason, meta) => { wallet.awards.push({ n, reason, meta }); wallet.balance += n; return n; },
      spend: (cost, reason) => {
        wallet.spends.push({ cost, reason });
        if (wallet.balance < cost) return false;
        wallet.balance -= cost; return true;
      }
    }
  });
  controller.domain = 'listening';
  controller.items = [ITEM];
  controller.root = fakeRoot(SESSION_SELECTORS);
  return { controller, wallet, tts };
}

/* ============================================== G6: tagih saat tampil, sekali saja ====== */

test('G6 gem dipotong tepat SEKALI walau terjemahan dirender berulang di satu sesi', async () => {
  translateCalls = []; translateResult = 'Bus berangkat pukul tujuh.\nBus pukul tujuh\nBus pukul delapan\nTidak ada bus\nBus penuh';
  const { controller, wallet } = makeController(3);
  controller.translationOn = true;
  assert.equal(await controller.renderTranslationLine(ITEM), true);
  assert.equal(await controller.renderTranslationLine(ITEM), true);
  assert.equal(await controller.renderTranslationLine(ITEM), true);
  assert.equal(wallet.spends.length, 1, 'spend dipanggil ' + wallet.spends.length + '× — tagihan ganda');
  assert.equal(wallet.balance, 2, 'saldo turun lebih dari 1 gem untuk satu sesi');
  assert.equal(controller.translationCharged, true);
  const host = controller.root.map['[data-translation]'];
  assert.equal(host.hidden, false);
  assert.ok(host.innerHTML.includes('Bus berangkat pukul tujuh.'), 'baris terjemahan tidak dirender');
  assert.ok(host.innerHTML.includes('terjemahan otomatis'), 'label kejujuran "terjemahan otomatis" hilang');
});

test('G6 terjemahan gagal (offline/jatah AI habis) TIDAK menghanguskan gem', async () => {
  translateCalls = []; translateResult = '';
  const { controller, wallet } = makeController(3);
  controller.translationOn = true;
  assert.equal(await controller.renderTranslationLine(ITEM), false);
  assert.equal(wallet.spends.length, 0, 'gem ditagih untuk terjemahan yang tidak pernah tampil');
  assert.equal(wallet.balance, 3);
  assert.equal(controller.translationCharged, false);
  const host = controller.root.map['[data-translation]'];
  assert.ok(/nggak terpakai/.test(host.innerHTML), 'murid tidak diberi tahu bahwa gem-nya tidak terpakai: ' + host.innerHTML);
  assert.ok(/jaringan/.test(host.innerHTML), 'kegagalan jaringan tidak dikatakan apa adanya');
});

test('G6 saldo 0: terjemahan tidak dirender dan toggle mundur ke OFF', async () => {
  translateCalls = []; translateResult = 'Bus berangkat pukul tujuh.';
  const { controller, wallet } = makeController(0);
  controller.translationOn = true;
  assert.equal(await controller.renderTranslationLine(ITEM), false);
  assert.equal(wallet.balance, 0);
  assert.equal(controller.translationOn, false, 'toggle tetap ON padahal tidak ada gem — itu janji palsu');
  assert.equal(controller.translationCharged, false);
  assert.ok(/nggak dijual/.test(controller.root.map['[data-translation]'].innerHTML),
    'keadaan habis tidak menyebut bahwa gem tidak dijual');
});

test('G6 satu permintaan AI menanggung skrip DAN pilihan jawaban', async () => {
  translateCalls = []; translateResult = 'a\nb\nc\nd\ne';
  const { controller } = makeController(3);
  controller.translationOn = true;
  await controller.renderTranslationLine(ITEM);
  assert.equal(translateCalls.length, 1, 'jatah AI 40/jam: satu item harus cukup satu permintaan');
  assert.ok(translateCalls[0].includes(ITEM.script), 'skrip tidak ikut diterjemahkan');
  for (const option of ITEM.options) assert.ok(translateCalls[0].includes(option), 'opsi "' + option + '" tidak ikut diterjemahkan');
});

test('G6 runtun & tagihan direset saat sesi baru dibuka', () => {
  const { controller } = makeController(3);
  controller.sessionStreak = 4; controller.sessionAwards = 2;
  controller.translationOn = true; controller.translationCharged = true;
  controller.resetGemSession();
  assert.deepStrictEqual(
    [controller.sessionStreak, controller.sessionAwards, controller.translationOn, controller.translationCharged],
    [0, 0, false, false]);
  assert.ok(/open\(domain,level\)\{[^\n]*this\.resetGemSession\(\)/.test(addonSource),
    'open() tidak me-reset sesi gem — runtun akan bocor antar sesi');
  assert.ok(!addonSource.includes('sessionStreak:') || !/STATE_SCHEMA[\s\S]{0,400}sessionStreak/.test(addonSource),
    'runtun sesi tidak boleh ikut disimpan di StateStore (celah farming)');
});

test('G6 hadiah hanya diberikan di domain listening, dan tepat sekali per runtun 5', () => {
  const { controller, wallet } = makeController(0);
  for (let i = 0; i < 5; i++) controller.finishItem(ITEM, { passed: true, score: 100, metric: 'answer_key' });
  assert.equal(wallet.awards.length, 1, 'hadiah diberikan ' + wallet.awards.length + '× untuk runtun 5');
  assert.deepStrictEqual([wallet.awards[0].n, wallet.awards[0].reason], [2, 'listening_streak_5']);
  assert.equal(controller.sessionStreak, 5);

  controller.finishItem(ITEM, { passed: false, score: 0, metric: 'answer_key' });
  assert.equal(controller.sessionStreak, 0, 'jawaban salah tidak menol-kan runtun');
  for (let i = 0; i < 5; i++) controller.finishItem(ITEM, { passed: true, score: 100, metric: 'answer_key' });
  assert.equal(wallet.awards.length, 2, 'hadiah kedua tidak diberikan');
  controller.finishItem(ITEM, { passed: false, score: 0, metric: 'answer_key' });
  for (let i = 0; i < 5; i++) controller.finishItem(ITEM, { passed: true, score: 100, metric: 'answer_key' });
  assert.equal(wallet.awards.length, 2, 'hadiah KETIGA lolos pagar maks 2/sesi');

  const speaking = makeController(0);
  speaking.controller.domain = 'speaking';
  for (let i = 0; i < 6; i++) speaking.controller.finishItem(
    { id: 'speak_0001', level: 'A1', mode: 'repeat_target', sampleAnswer: 'ok' },
    { passed: true, score: 100, metric: 'token_f1' });
  assert.equal(speaking.wallet.awards.length, 0, 'sesi speaking ikut memberi Gem Terjemahan — kontrak owner melebar');
  assert.ok(/if\(this\.domain==='listening'\)\{\s*this\.sessionStreak/.test(addonSource),
    'penjagaan domain listening di finishItem hilang');
});

/* ================================================= G7: regresi kejujuran m025-148 ====== */

test('G7 suppressSubtitles:true tetap dikirim ke TTS walau terjemahan ON', async () => {
  const { controller, tts } = makeController(9);
  controller.translationOn = true;   // gem sudah dibayar, terjemahan aktif
  controller.renderListening(ITEM, 0);
  await controller.root.map['[data-play]'].fire('click');
  assert.equal(tts.calls.length, 1, 'audio tidak diputar');
  assert.strictEqual(tts.calls[0].options.suppressSubtitles, true,
    'suppressSubtitles hilang saat terjemahan ON — subtitle akan bocor ke fase audio (m025-148)');
  assert.equal(tts.calls[0].text, ITEM.script);
  const host = controller.root.map['[data-translation]'];
  assert.ok(!host.innerHTML, 'terjemahan tampil sebelum jawaban dinilai — itu membaca, bukan mendengar');
});

test('G7 statis: suppressSubtitles tidak pernah dikondisikan pada status terjemahan', () => {
  const playCalls = addonSource.match(/this\.tts\.play\([^\n]*?\)/g) || [];
  assert.ok(playCalls.length >= 2, 'panggilan tts.play tidak ditemukan — regex kadaluarsa?');
  for (const call of playCalls) {
    if (!/suppressSubtitles/.test(call)) continue;
    assert.ok(/suppressSubtitles:true/.test(call),
      'suppressSubtitles dijadikan variabel/kondisi: ' + call);
  }
  assert.ok(!/suppressSubtitles:\s*(?!true)/.test(addonSource),
    'ada suppressSubtitles yang tidak dipaku true');
  assert.ok(/renderListening\(item,progress\)\{[\s\S]*?suppressSubtitles:true/.test(addonSource),
    'jalur listening harian kehilangan suppressSubtitles:true');
});

test('G7 terjemahan hanya dirender dari blok feedback pasca-jawab', () => {
  assert.ok(/finishItem\(item,result,prefix=''\)\{[\s\S]*?if\(this\.translationOn\)this\.renderTranslationLine\(item\)/.test(addonSource),
    'renderTranslationLine tidak dipanggil dari finishItem');
  assert.ok(/data-translation hidden><\/div>/.test(addonSource),
    'wadah [data-translation] tidak hidup di dalam markup feedback');
  const playHandler = (addonSource.match(/\[data-play\]'\)\.addEventListener\([\s\S]*?finally\{button\.disabled=false\}\}\)/) || [''])[0];
  assert.ok(playHandler, 'penangan tombol Dengarkan tidak ditemukan');
  assert.ok(!/renderTranslationLine|translationOn/.test(playHandler),
    'penangan pemutar audio menyentuh terjemahan — pelanggaran m025-148');
});

/* ======================================================= G8: bukan paywall + copy ====== */

test('G8 id kontrak bersama #fslTranslateToggle dan chip saldo ada di header sesi', () => {
  assert.ok(addonSource.includes('id="fslTranslateToggle"'), 'id kontrak #fslTranslateToggle hilang');
  assert.ok(addonSource.includes('id="fslGemChip"'), 'chip saldo #fslGemChip hilang');
  /* 2026-08-31: jangkar pemeriksaan ini DIPINDAH, bukan dilonggarkan. Sebelumnya ia
     mencari literal `<span class="fsl-kicker">Listening` pada baris yang sama dengan
     gemBarMarkup(). Kicker itu kini dihapus atas permintaan OWNER (ia mengulang pilihan
     yang baru saja dibuat murid dan membocorkan nama mode internal "inference"), jadi
     jangkar lama menguji sesuatu yang memang sudah tidak ada.
     Yang DIJAGA tetap sama persis dan tidak berkurang: baris gem harus berada di dalam
     kartu sesi listening yang sama - bukan mengambang di layar lain, dan bukan berdiri
     di antara soal dan pemutar. Jangkarnya sekarang kelas kartunya sendiri
     (`fsl-card-listening`), yang justru lebih stabil daripada teks kicker: ia tidak ikut
     berubah setiap kali naskahnya diperbarui. */
  assert.ok(/<article class="fsl-card fsl-card-listening">[^\n]*?\$\{this\.gemBarMarkup\(\)\}/.test(addonSource),
    'baris gem tidak duduk di dalam kartu sesi listening');
  assert.ok(!/<span class="fsl-kicker">Listening ·/.test(addonSource),
    'kicker "Listening · level · mode" kembali muncul di kartu sesi (dihapus 2026-08-31)');
  assert.ok(/aria-pressed="\$\{String\(on\)\}"/.test(addonSource), 'toggle tanpa aria-pressed');
});
test('G8 teks keadaan habis mengajak belajar dan menolak menjual', () => {
  const empty = GEMS.GEMS_COPY.emptyBody;
  assert.ok(/nggak dijual/.test(empty) && /nggak akan pernah/.test(empty), 'janji "tidak pernah dijual" hilang');
  assert.ok(/belajar/.test(empty) && /streak/.test(empty), 'ajakan streak hilang');
  for (const forbidden of [/beli/i, /harga/i, /upgrade/i, /premium/i, /langganan/i])
    assert.ok(!forbidden.test(empty), 'teks keadaan habis memuat bahasa jualan: ' + forbidden);
});
test('G8 teks Settings memuat dua kalimat dan menyebut butuh jaringan', () => {
  const body = GEMS.GEMS_COPY.settingsBody;
  assert.equal(body.split(/(?<=[.!?])\s+/).filter(Boolean).length, 2, 'panel Settings harus tepat dua kalimat');
  assert.ok(/butuh jaringan/.test(body), 'klaim jujur "butuh jaringan" hilang');
  assert.ok(/nggak dijual/.test(body) && /nggak bisa dibeli/.test(body), 'janji gratis hilang');
  assert.ok(appSource.includes('gemsSettingsRowMarkup()'), 'entri Settings tidak dirender');
  assert.ok(/grupBelajar=[\s\S]*?\$\{gemsSettingsRowMarkup\(\)\}/.test(appSource),
    'entri gems tidak berada di lipatan "Belajar"');
});
test('G2 label progres tidak pernah mencetak "Runtun 6/5" dan tidak menjanjikan hadiah yang tidak ada', () => {
  assert.equal(GEMS.streakLabel(0, 0), 'Runtun 0/5');
  assert.equal(GEMS.streakLabel(3, 0), 'Runtun 3/5');
  assert.equal(GEMS.streakLabel(5, 1), 'Runtun 0/5', 'setelah hadiah pertama, hitungan mulai lagi dari nol');
  assert.equal(GEMS.streakLabel(6, 1), 'Runtun 1/5');
  assert.equal(GEMS.streakLabel(9, 1), 'Runtun 4/5');
  // Jatah sesi penuh: penyebut dilepas, karena "/5" di sini menjanjikan hadiah yang tidak
  // akan pernah datang.
  assert.equal(GEMS.streakLabel(12, 2), 'Runtun 12');
  assert.equal(GEMS.streakLabel(10, 2), 'Runtun 10');
  for (let streak = 0; streak <= 60; streak++) {
    for (let awards = 0; awards <= 2; awards++) {
      const label = GEMS.streakLabel(streak, awards);
      const parts = label.match(/^Runtun (\d+)(?:\/(\d+))?$/);
      assert.ok(parts, 'label tidak berbentuk: ' + label);
      if (parts[2]) assert.ok(Number(parts[1]) < Number(parts[2]),
        'pembilang menyamai/melebihi penyebut: ' + label + ' (streak=' + streak + ', awards=' + awards + ')');
    }
  }
  assert.ok(!addonSource.includes('Runtun ${this.sessionStreak}'),
    'addon masih mencetak runtun mentah ke chip — "Runtun 6/5" akan kembali');
});
test('G8 teks toast/toggle/chip verbatim seperti reports/copy-tour-gems.md §4', () => {
  assert.equal(GEMS.GEMS_COPY.toastStreak, 'Streak 5! +2 Gem Terjemahan buat kamu — simpan atau langsung pakai, bebas.');
  assert.equal(GEMS.GEMS_COPY.toggleLabel, 'Terjemahan Indonesia');
  assert.equal(GEMS.priceHint(3), '1 gem per sesi · saldo kamu: 3 gem');
  assert.equal(GEMS.chipLabel(0), '0 gem');
  assert.equal(GEMS.chipAria(3), 'Gem Terjemahan kamu: 3. Didapat gratis dari streak jawaban benar, dipakai buat terjemahan otomatis.');
  assert.equal(GEMS.toastFor(5, 2), GEMS.GEMS_COPY.toastStreak);
  assert.ok(GEMS.toastFor(10, 2).startsWith('Streak 10! +2 Gem Terjemahan'), 'toast hadiah kedua mengarang angka runtun');
  if (copySource) {
    for (const line of [GEMS.GEMS_COPY.toastStreak, GEMS.GEMS_COPY.emptyBody, GEMS.GEMS_COPY.settingsBody, GEMS.GEMS_COPY.emptyTitle])
      assert.ok(copySource.includes(line), 'teks menyimpang dari copy-tour-gems.md: ' + line.slice(0, 48));
  } else {
    console.log('     (catatan: reports/copy-tour-gems.md tidak ditemukan di worktree ini; perbandingan verbatim dilewati)');
  }
});
test('G8 tidak ada jalur pembelian gem di seluruh kode gems', () => {
  for (const [name, source] of [['gems-core.js', gemsSource], ['addon', addonSource]]) {
    for (const forbidden of [/purchase/i, /checkout/i, /\bIAP\b/, /stripe/i, /top-?up/i])
      assert.ok(!forbidden.test(source), name + ' memuat jalur pembelian: ' + forbidden);
  }
});

/* ================================================================= penutup ============= */

runQueue().then(() => {
  if (failed) { console.log('\n' + failed + ' gagal, ' + passed + ' lolos'); process.exit(1); }
  console.log('\ngems-test: ' + passed + ' pemeriksaan lolos');
}).catch(error => { console.log('FATAL - ' + (error && error.stack ? error.stack : error)); process.exit(1); });
