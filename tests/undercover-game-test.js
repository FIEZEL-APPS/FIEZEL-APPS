#!/usr/bin/env node
'use strict';
/**
 * tests/undercover-game-test.js — GERBANG PERMAINAN UNDERCOVER (m025-561)
 *
 * undercover.html adalah halaman satelit yang tidak dimuat index.html, jadi hampir semua
 * gerbang lain (precache-covers-shell, kunci-hantu, a11y) tidak pernah melihatnya. Berkas ini
 * menjaga lima kontrak yang kalau patah tidak akan memerahkan apa pun selain dirinya:
 *
 *   1. DATASET — tiap pasangan kata lengkap (chip bersama, condong, bocor-total, keliru,
 *      umpan), tidak ada chip yang menyebut katanya sendiri, dan setiap vocabId menunjuk entri
 *      vocabulary-master.json yang katanya cocok. Kata yang diberi null wajib memang TIDAK ada
 *      di bank — kalau ada, bukti untuknya sedang dibuang percuma.
 *   2. DUA BAHASA — setiap kunci yang dipakai halaman (data-t di HTML, t('undercover.…') di
 *      modul UI, arti kata/chip/nuansa dari dataset) ada di copy-id DAN copy-th.
 *   3. MESIN — komposisi peran per mode, Si Polos tidak pernah membuka ronde, chip menawarkan
 *      tepat 3 yang cocok dari 5, bukti hanya lahir untuk murid + kata bank + bukan giliran
 *      habis waktu, dan setiap pertandingan berakhir dengan pemenang.
 *   4. JEMBATAN BRAINCORE — undercoverEvidenceDrain() DIJALANKAN (diekstrak dari app.js, di
 *      atas stub) dan dibuktikan: baris sah masuk lewat updateMastery('vocab', id bank) +
 *      bktRecord('vocab_<kata>', kappa), baris cacat dibuang dan dihitung, kursus Jepang tidak
 *      menyentuh antrean, dan tanda terimanya membawa angka sebelum → sesudah.
 *   5. LURING — halaman tidak memuat satu pun aset dari luar asal, dan semua skripnya ada di
 *      precache sw.js (copy-th lewat manifest cache locale Thai).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const __fzRoot = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

let pass = 0;
let fail = 0;
function check(name, ok, detail) {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail !== undefined ? '  → ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
}

const D = require(path.join(__fzRoot, 'features/undercover/fiezel-undercover-data.js'));
const E = require(path.join(__fzRoot, 'features/undercover/fiezel-undercover-engine.js'));

/* ===================================== 1 · DATASET ===================================== */
const bank = JSON.parse(read('vocabulary-master.json'));
const bankById = new Map(bank.map((v) => [String(v.id), v]));
const bankWords = new Set(bank.map((v) => String(v.word).toLowerCase()));

check('dataset: minimal 6 pasangan kata kontras', D.PAIRS.length >= 6, D.PAIRS.length);
check('dataset: id pasangan unik', new Set(D.PAIRS.map((p) => p.id)).size === D.PAIRS.length);
{
  const problems = [];
  for (const p of D.PAIRS) {
    for (const dim of ['a', 'b']) {
      const d = p[dim];
      if (!d || !Array.isArray(d.shared) || d.shared.length !== 2) problems.push(p.id + '.' + dim + ': chip bersama');
      for (const side of ['civ', 'spy']) {
        const risks = (d[side] || []).map((c) => c[2]).join(',');
        if (risks !== 'mid,high') problems.push(p.id + '.' + dim + '.' + side + ': risiko ' + risks);
      }
      if (!Array.isArray(d.none) || d.none.length !== 2) problems.push(p.id + '.' + dim + ': 2 chip keliru');
    }
    if (!Array.isArray(p.decoys) || p.decoys.length !== 3) problems.push(p.id + ': 3 kata umpan');
    if (p.decoys.includes(p.civ.en) || p.decoys.includes(p.spy.en)) problems.push(p.id + ': umpan sama dengan kata main');
    const chips = D.chipsOf(p);
    if (new Set(chips.map((c) => c.id)).size !== chips.length) problems.push(p.id + ': id chip ganda');
    for (const c of chips) {
      for (const w of [p.civ.en, p.spy.en]) {
        if (new RegExp('\\b' + w + '\\b', 'i').test(c.en)) problems.push(p.id + '.' + c.id + ' menyebut ' + w);
      }
    }
  }
  check('dataset: struktur chip tiap pasangan lengkap (bersama · mid · high · 2 keliru · 3 umpan)', problems.length === 0, problems.slice(0, 6));
}
{
  const bad = [];
  for (const p of D.PAIRS) {
    for (const side of ['civ', 'spy']) {
      const w = p[side];
      if (w.vocabId) {
        const v = bankById.get(w.vocabId);
        if (!v) bad.push(w.en + ': ' + w.vocabId + ' tidak ada di bank');
        else if (String(v.word).toLowerCase() !== String(w.bank)) bad.push(w.en + ': bank berkata "' + v.word + '"');
      } else if (bankWords.has(w.en.toLowerCase())) {
        bad.push(w.en + ': ADA di bank tetapi vocabId null — buktinya terbuang');
      }
    }
  }
  check('dataset: setiap vocabId menunjuk entri bank yang katanya cocok; kata null memang di luar bank', bad.length === 0, bad);
}
check('dataset: mayoritas pasangan bisa menghasilkan bukti bank (≥ 6 pasangan punya kata warga di bank)',
  D.PAIRS.filter((p) => p.civ.vocabId).length >= 6, D.PAIRS.filter((p) => p.civ.vocabId).map((p) => p.id));
check('dataset: 6 bot berkepribadian + 6 barang meja', D.BOTS.length === 6 && D.ITEMS.length === 6);

/* =================================== 2 · DUA BAHASA ==================================== */
function loadCopy(file) {
  const out = {};
  new Function('self', read(file))({ FiezelI18n: { registerCopy: (l, m) => Object.assign(out, m) } });
  return out;
}
const ID = loadCopy('features/i18n/copy-id-undercover.js');
const TH = loadCopy('features/i18n/copy-th-undercover.js');
const html = read('undercover.html');
const ui = read('features/undercover/fiezel-undercover-ui.js');
const used = new Set();
for (const m of html.matchAll(/data-t(?:-aria)?="([^"]+)"/g)) used.add(m[1]);
for (const m of ui.matchAll(/\bt\('((?:undercover|game)\.[a-z0-9.-]*[a-z0-9])'/g)) used.add(m[1]);
for (const m of ui.matchAll(/'(undercover\.[a-z0-9-]+\.)' \+ ([a-z]+)/g)) used.add('prefix:' + m[1]);
for (const p of D.PAIRS) {
  used.add(D.wordKey(p.civ.en)); used.add(D.wordKey(p.spy.en)); used.add(D.nuanceKey(p.id));
  for (const c of D.chipsOf(p)) used.add(D.clueKey(p.id, c.id));
}
/* Kunci yang dirakit dari nama: fase, kode, peran, mood, bot, barang, seruan, banter, risiko, tip. */
const dynamic = [];
['lobby', 'reveal', 'clue', 'debate', 'tribunal', 'showdown', 'debrief'].forEach((ph) => { dynamic.push('undercover.code.' + ph, 'undercover.phase.' + ph); });
['civ', 'spy', 'white'].forEach((r) => dynamic.push('undercover.role.' + r, 'undercover.role-tag.' + r, 'undercover.reveal.mission-' + r, 'undercover.tip.' + r));
['calm', 'nervous', 'accusing', 'busted'].forEach((m) => dynamic.push('undercover.mood.' + m));
D.BOTS.forEach((b) => dynamic.push('undercover.bot.' + b.id));
D.ITEMS.forEach((it) => dynamic.push('undercover.item.' + it.id));
['vague', 'sweat', 'alibi', 'legit'].forEach((k) => dynamic.push('undercover.shout.' + k));
['accuse', 'agree', 'doubt', 'defend', 'swear', 'ouch', 'thanks'].forEach((k) => dynamic.push('undercover.banter.' + k));
['low', 'mid', 'high'].forEach((k) => dynamic.push('undercover.clue.leak-' + k));
['yes', 'no', 'timeout', 'white'].forEach((k) => dynamic.push('undercover.debrief.fit-' + k));
dynamic.forEach((k) => used.add(k));
const keys = Array.from(used).filter((k) => !k.startsWith('prefix:'));
const missId = keys.filter((k) => !(k in ID) && !k.startsWith('game.'));
const missTh = keys.filter((k) => !(k in TH) && !k.startsWith('game.'));
check('dua bahasa: setiap kunci yang dipakai halaman ada di copy-id-undercover', missId.length === 0, missId.slice(0, 10));
check('dua bahasa: setiap kunci yang dipakai halaman ada di copy-th-undercover', missTh.length === 0, missTh.slice(0, 10));
check('dua bahasa: copy-id dan copy-th berkunci identik', Object.keys(ID).sort().join('|') === Object.keys(TH).sort().join('|'));
{
  const prefixes = Array.from(used).filter((k) => k.startsWith('prefix:')).map((k) => k.slice(7));
  const orphan = prefixes.filter((pre) => !Object.keys(ID).some((k) => k.startsWith(pre)));
  check('dua bahasa: setiap prefiks kunci dinamis di modul UI punya kunci terdaftar', orphan.length === 0, orphan);
}
check('dua bahasa: kartu masuk Undercover di app.js/PAW ARENA memakai kunci game.* dua bahasa',
  /game\.undercover-badge/.test(read('app.js')) && /game\.undercover-desc/.test(read('features/learner-flow/fiezel-paw-arena.js')) &&
  /'game\.undercover-desc'/.test(read('features/i18n/copy-th-redesign.js')) && !/2–5P ONLINE|2-5P ONLINE/.test(read('app.js') + read('features/learner-flow/fiezel-paw-arena.js')));

/* ===================================== 3 · MESIN ======================================= */
{
  const BOTS = ['rian', 'alya', 'dimas', 'nadia', 'kevin'];
  const issues = [];
  let games = 0; let winners = 0; let evidenceRows = 0; let timeoutEvidence = 0; let nonBankEvidence = 0;
  for (const mode of ['agent', 'white']) {
    for (const size of [4, 6]) {
      const want = E.LAYOUT[mode][size];
      for (let seed = 1; seed <= 150; seed++) {
        const g = E.newGame({ mode, size, seed, bots: BOTS }, D);
        games++;
        const count = (r) => g.players.filter((p) => p.role === r).length;
        if (count('civ') !== want.civ || count('spy') !== want.spy || count('white') !== want.white) issues.push(`${mode}${size}#${seed} komposisi`);
        if (!g.players[0].isMe || g.players.filter((p) => p.isMe).length !== 1) issues.push(`${mode}${size}#${seed} kursi murid`);
        const replay = E.newGame({ mode, size, seed, bots: BOTS }, D);
        if (replay.pair.id !== g.pair.id || replay.players.map((p) => p.role).join() !== g.players.map((p) => p.role).join()) issues.push(`${mode}${size}#${seed} tidak deterministik`);
        let guard = 0;
        while (!g.winner && guard++ < size + 2) {
          const order = E.startRound(g);
          if (E.player(g, order[0]).role === 'white') issues.push(`${mode}${size}#${seed} Si Polos membuka ronde`);
          for (const s of order) {
            const p = E.player(g, s);
            if (p.isMe) {
              const ch = E.chipsFor(g, s);
              for (const dim of ['a', 'b']) {
                if (ch[dim].length !== 5) issues.push('chip per dimensi bukan 5');
                if (p.role !== 'white' && ch[dim].filter((c) => E.fits(c, p.role)).length !== 3) issues.push(`${mode}${size}#${seed} chip cocok bukan 3`);
              }
              const timeout = seed % 7 === 0 && g.round === 1;
              const before = g.evidence.length;
              const res = E.applyClue(g, s, timeout ? null : { a: ch.a[seed % 5].id, b: ch.b[(seed + 1) % 5].id }, { ms: 4000, at: 1700000000000 });
              const added = g.evidence.length - before;
              if (timeout && added) timeoutEvidence++;
              const w = p.role === 'spy' ? g.pair.spy : (p.role === 'civ' ? g.pair.civ : null);
              if (added && (!w || !w.vocabId)) nonBankEvidence++;
              if (!timeout && w && w.vocabId && p.role !== 'white' && added !== 1) issues.push('bukti petunjuk tidak lahir');
              if (res.evidence && (res.evidence.kappa !== E.KAPPA.clue || typeof res.evidence.ok !== 'boolean')) issues.push('skema bukti petunjuk');
            } else {
              const before = g.evidence.length;
              E.applyClue(g, s, E.botPickClue(g, s), {});
              if (g.evidence.length !== before) issues.push('bot menghasilkan bukti murid');
            }
          }
          const ballots = {};
          E.alive(g).forEach((p) => { ballots[p.seat] = E.botVote(g, p.seat); });
          const t = E.tally(g, ballots);
          const out = E.eliminate(g, t.eliminated);
          if (out.infiltrator) {
            const p = E.player(g, out.seat);
            const opts = E.guessOptions(g, out.seat);
            if (opts.length !== 4 || !opts.includes(g.pair.civ.en) || new Set(opts).size !== 4) issues.push('kisi intel tidak sah');
            if (p.role === 'spy' && opts.includes(g.pair.spy.en)) issues.push('kisi penyusup memuat katanya sendiri');
            const word = p.isMe ? g.pair.civ.en : E.botGuess(g, out.seat);
            E.resolveGuess(g, out.seat, word, { ms: 3000, at: 1700000000000 });
          }
          E.checkWinner(g);
        }
        if (g.winner) winners++; else issues.push(`${mode}${size}#${seed} tanpa pemenang`);
        evidenceRows += g.evidence.length;
        const sm = E.summary(g);
        if (sm.score < 0 || typeof sm.won !== 'boolean') issues.push('ringkasan');
        g.evidence.forEach((r) => {
          if (!bankById.has(r.vocabId) || String(bankById.get(r.vocabId).word).toLowerCase() !== r.word) issues.push('bukti menunjuk kata di luar bank: ' + r.word);
          if (r.kind === 'guess' && r.kappa !== E.KAPPA.guess) issues.push('kappa tebakan');
        });
      }
    }
  }
  check(`mesin: ${games} pertandingan (2 mode × 2 formasi × 150 seed) sah, deterministik, dan berakhir`, issues.length === 0 && winners === games, issues.slice(0, 8));
  check('mesin: giliran habis waktu tidak pernah menjadi bukti', timeoutEvidence === 0, timeoutEvidence);
  check('mesin: kata di luar bank dan Si Polos tidak pernah menghasilkan bukti petunjuk', nonBankEvidence === 0, nonBankEvidence);
  check('mesin: simulasi memang menghasilkan bukti (gerbang tidak lolos karena nol data)', evidenceRows > 200, evidenceRows);
}

/* =============================== 4 · JEMBATAN BRAINCORE ================================= */
{
  const app = read('app.js');
  const start = app.indexOf("const UNDERCOVER_EVIDENCE_KEY=");
  const endMarker = 'function undercoverEvidenceDrain(';
  const fnStart = app.indexOf(endMarker);
  let depth = 0; let i = app.indexOf('{', fnStart); let end = -1;
  for (; i < app.length; i++) { if (app[i] === '{') depth++; else if (app[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } } }
  check('jembatan: undercoverEvidenceDrain() ada di app.js', start >= 0 && fnStart > start && end > fnStart);
  const uiKey = (ui.match(/evidence: '([^']+)'/) || [])[1];
  const appKey = (app.match(/UNDERCOVER_EVIDENCE_KEY='([^']+)'/) || [])[1];
  const uiReceipt = (ui.match(/receipt: '([^']+)'/) || [])[1];
  const appReceipt = (app.match(/UNDERCOVER_RECEIPT_KEY='([^']+)'/) || [])[1];
  const uiLocale = (ui.match(/locale: '([^']+)'/) || [])[1];
  const appLocale = (app.match(/UNDERCOVER_LOCALE_HINT_KEY='([^']+)'/) || [])[1];
  check('jembatan: kunci antrean, tanda terima, dan petunjuk locale sama di halaman dan app.js', uiKey && uiKey === appKey && uiReceipt === appReceipt && uiLocale === appLocale, { uiKey, appKey, uiReceipt, appReceipt, uiLocale, appLocale });
  const openApp = app.slice(app.indexOf('function openApp(){'), app.indexOf('function openApp(){') + 6000);
  check('jembatan: antrean dikuras dari openApp() dan saat murid kembali ke tab', /undercoverEvidenceDrain\(\)/.test(openApp) && /pageshow/.test(openApp) && /visibilitychange/.test(openApp));

  function run(lang, rows) {
    const store = new Map();
    if (rows) store.set(appKey, JSON.stringify({ v: 1, rows }));
    const calls = { mastery: [], bkt: [], save: 0 };
    const sandbox = {
      localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
      self: { FiezelI18n: { getLocale: () => 'th' }, FiezelMasteryBKT: { mastery: (st, lesson) => ({ L: lesson === 'vocab_bicycle' ? (calls.bkt.length ? 0.31 : 0.2) : 0.2, n: 0 }) } },
      V: [{ id: 'vocab_00082', word: 'bicycle' }, { id: 'a1_curated_0077', word: 'pen' }],
      state: { vocab: { vocab_00082: { mastery: 20 } } },
      activeTargetLang: () => lang,
      bktRead: () => null,
      updateMastery: (bucket, key, ok, ms, conf, at) => {
        calls.mastery.push({ bucket, key, ok, ms, conf, at });
        sandbox.state.vocab[key] = { mastery: (sandbox.state.vocab[key] ? sandbox.state.vocab[key].mastery : 0) + (ok ? 16 : -5) };
      },
      bktRecord: (q, ok, kappa) => calls.bkt.push({ lesson: q.lessonSkill, ok, kappa }),
      save: () => { calls.save++; }
    };
    vm.createContext(sandbox);
    vm.runInContext(app.slice(start, end) + '\nthis.__drain = undercoverEvidenceDrain; this.__hint = undercoverLocaleHint;', sandbox);
    const receipt = sandbox.__drain(1700000100000);
    sandbox.__hint();
    return { receipt, calls, store };
  }
  const rows = [
    { id: 'r1', at: 1700000000000, kind: 'clue', word: 'bicycle', vocabId: 'vocab_00082', ok: true, ms: 4200, kappa: 0.5 },
    { id: 'r2', at: 1700000000500, kind: 'guess', word: 'pen', vocabId: 'a1_curated_0077', ok: false, ms: 3100, kappa: 0.6 },
    { id: 'r3', at: 1700000000000, kind: 'clue', word: 'motorcycle', vocabId: 'vocab_00082', ok: true, ms: 4000, kappa: 0.5 },
    { id: 'r4', at: 1700000000000, kind: 'clue', word: 'tea', vocabId: 'vocab_99999', ok: true, ms: 4000, kappa: 0.5 },
    { id: 'r5', at: 1800000000000, kind: 'clue', word: 'bicycle', vocabId: 'vocab_00082', ok: true, ms: 4000, kappa: 0.5 },
    { id: 'r6', at: 1700000000000, kind: 'clue', word: 'bicycle', vocabId: 'vocab_00082', ok: 'yes', ms: 4000, kappa: 0.5 }
  ];
  const en = run('en', rows);
  check('jembatan: baris sah masuk lewat updateMastery("vocab", id bank, ok, ms, null, at)',
    en.calls.mastery.length === 2 && en.calls.mastery[0].bucket === 'vocab' && en.calls.mastery[0].key === 'vocab_00082' && en.calls.mastery[0].ok === true &&
    en.calls.mastery[0].ms === 4200 && en.calls.mastery[0].at === 1700000000000 && en.calls.mastery[1].key === 'a1_curated_0077' && en.calls.mastery[1].ok === false, en.calls.mastery);
  check('jembatan: bktRecord menerima lesson vocab_<kata> dengan kappa permainan',
    en.calls.bkt.length === 2 && en.calls.bkt[0].lesson === 'vocab_bicycle' && en.calls.bkt[0].kappa === 0.5 && en.calls.bkt[1].lesson === 'vocab_pen' && en.calls.bkt[1].kappa === 0.6, en.calls.bkt);
  check('jembatan: kata tak cocok, id asing, waktu masa depan, ok non-boolean dibuang dan dihitung', en.receipt.applied === 2 && en.receipt.skipped === 4, en.receipt);
  check('jembatan: antrean dikosongkan dan state disimpan sekali', !en.store.has(appKey) && en.calls.save === 1);
  const it = (en.receipt.items || []).find((x) => x.vocabId === 'vocab_00082');
  check('jembatan: tanda terima membawa penguasaan sebelum → sesudah dari state sesungguhnya', it && it.before === 20 && it.after === 36 && it.ok === 1 && it.total === 1 && JSON.parse(en.store.get(appReceipt)).applied === 2, it);
  check('jembatan: petunjuk locale ditulis untuk halaman satelit', en.store.get(appLocale) === 'th');
  const ja = run('ja', rows);
  check('jembatan: kursus Jepang tidak menyentuh antrean bukti kosakata Inggris', ja.receipt === null && ja.calls.mastery.length === 0 && ja.store.has(appKey));
}

/* ======================================= 5 · LURING ===================================== */
{
  const external = Array.from(html.matchAll(/\b(?:src|href)="(https?:)?\/\/[^"]*"/g)).map((m) => m[0]);
  const imports = /@import\s+url\(/.test(html);
  check('luring: undercover.html tanpa aset dari luar asal (tanpa CDN Tailwind / Google Fonts)', external.length === 0 && !imports && !/fonts\.googleapis|tailwindcss/i.test(html), external);
  check('luring: tanpa skrip inline (CSP script-src \'self\')', !/<script(?![^>]*\bsrc=)[^>]*>/i.test(html) && /script-src 'self'/.test(html));
  const scripts = Array.from(html.matchAll(/<script src="\.\/([^"]+)"/g)).map((m) => m[1]);
  check('luring: urutan skrip i18n → copy-id → data → mesin → UI',
    scripts.join(',') === 'features/i18n/fiezel-i18n.js,features/i18n/copy-id-undercover.js,features/undercover/fiezel-undercover-data.js,features/undercover/fiezel-undercover-engine.js,features/undercover/fiezel-undercover-ui.js', scripts);
  const sw = read('sw.js');
  const missing = ['undercover.html'].concat(scripts).filter((f) => sw.indexOf("'./" + f + "'") < 0);
  check('luring: halaman dan semua skripnya ada di precache sw.js', missing.length === 0, missing);
  check('luring: copy-th-undercover.js terdaftar di manifest cache locale Thai', read('features/i18n/locale-assets-th.json').indexOf('./features/i18n/copy-th-undercover.js') >= 0);
  const fonts = Array.from(html.matchAll(/url\('\.\/([^']+)'\)/g)).map((m) => m[1]);
  check('luring: semua font yang dirujuk ada di repo', fonts.length > 0 && fonts.every((f) => fs.existsSync(path.join(__fzRoot, f))), fonts.filter((f) => !fs.existsSync(path.join(__fzRoot, f))));
}

console.log(`\nundercover-game-test: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
