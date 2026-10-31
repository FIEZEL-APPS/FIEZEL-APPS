#!/usr/bin/env node
'use strict';
/**
 * tests/japanese-grammar-conjugator-test.js
 *
 * Menguji seluruh peningkatan Batch #2A & #2B:
 *   1. FiezelJaConjugator (kamiya-codec): konjugasi Godan, Ichidan, Irregular (する/来る/行く),
 *      i-Adjective / na-Adjective, serta pembangkit pengecoh berbasis taksonomi miskonsepsi.
 *   2. Lightweight Deconjugator (jp-verb-deconjugator) & diagnoseJapaneseMorpheme di FiezelProductionGrader:
 *      menolak typo bernilai gramatikal (食べた vs 食べて, 行いた vs 行った, 食べらない vs 食べない)
 *      sekaligus mengembalikan ID miskonsepsi yang sah menurut FiezelMisconceptionLedger.ID_RE.
 *   3. Validator Susun Kata Bahasa Jepang (Unicode norm() + Bunsetsu SOV Free-Order):
 *      menutup celah "" === "", menerima urutan Bunsetsu bebas yang sah secara tata bahasa Jepang,
 *      serta mendiagnosis pelanggaran predikat SOV (ja-sov-predicate-position-error) dan
 *      pertukaran partikel (ja-particle-role-swap).
 *   4. Okurigana Peeling Solver (solveFuriganaSegments & normalizeStoryRubyMarkup):
 *      memastikan okurigana awalan/tengah/akhiran (お茶, 持ち運ぶ, 買いました, 美しい, 練習します)
 *      tidak pernah digumpalkan di dalam <ruby> bersama kanji, serta bebas bocoran di Mode Ujian.
 */
const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const Conjugator = require(path.join(ROOT, 'features/japanese/fiezel-ja-conjugator.js'));
const Grader = require(path.join(ROOT, 'features/brain/fiezel-production-grader.js'));
const Ledger = require(path.join(ROOT, 'features/brain/fiezel-misconception-ledger.js'));
const GrammarUpgrade = require(path.join(ROOT, 'features/grammar/fiezel-grammar-upgrade.js'));
const JaUi = require(path.join(ROOT, 'features/japanese/fiezel-ja-ui.js'));
const StoryReader = require(path.join(ROOT, 'features/japanese/fiezel-story-reader.js'));

let passed = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  passed++;
  console.log('  ok - ' + msg);
}

console.log('[TEST] Japanese Grammar Conjugator, Deconjugator, Bunsetsu SOV & Okurigana Suite');

// 1. kamiya-codec Verb & Adjective Conjugation
ok(Conjugator.conjugate('食べる', 'Te', true).includes('食べて'), 'Ichidan Te-form: 食べる -> 食べて');
ok(Conjugator.conjugateAuxiliaries('食べる', ['Nai'], 'Dictionary', true).includes('食べない'), 'Ichidan Negative (Nai): 食べる -> 食べない');
ok(Conjugator.conjugate('書く', 'Te', false).includes('書いて'), 'Godan -ku Te-form: 書く -> 書いて');
ok(Conjugator.conjugate('泳ぐ', 'Ta', false).includes('泳いだ'), 'Godan -gu Ta-form: 泳ぐ -> 泳いだ');
ok(Conjugator.conjugate('飲む', 'Te', false).includes('飲んで'), 'Godan -mu Te-form: 飲む -> 飲んで');
ok(Conjugator.conjugate('買う', 'Te', false).includes('買って'), 'Godan -u Te-form: 買う -> 買って');
ok(Conjugator.conjugateAuxiliaries('買う', ['Nai'], 'Dictionary', false).includes('買わない'), 'Godan -u Negative -wanai: 買う -> 買わない');
ok(Conjugator.conjugate('行く', 'Te', false).includes('行って'), 'Exception 行く Te-form: 行って (bukan 行いて)');
ok(Conjugator.conjugate('行く', 'Ta', false).includes('行った'), 'Exception 行く Ta-form: 行った');
ok(Conjugator.conjugateAuxiliaries('する', ['Potential'], 'Dictionary', false).includes('できる'), 'Irregular する Potential: できる');
ok(Conjugator.conjugateAuxiliaries('食べる', ['Masu'], 'Negative', true).includes('食べません'), 'Polite Negative (Masu + Negative): 食べません');
ok(Conjugator.adjConjugate('高い', true, 'Ta').includes('高かった'), 'i-Adjective Past (Ta): 高い -> 高かった');
ok(Conjugator.adjConjugate('いい', true, 'Negative').includes('よくない'), 'Irregular いい Negative: よくない');

// 2. Misconception Distractor Spec Builder & Ledger ID Compatibility
const spec = Conjugator.buildVerbExerciseSpec('行く', false, 'Te', []);
ok(spec.correct === '行って', 'buildVerbExerciseSpec kunci 行く Te = 行って');
ok(spec.distractors.some(d => d.text === '行いて' && d.misconception === 'ja-iku-kiku-te-exception'),
  'buildVerbExerciseSpec menghasilkan pengecoh spesifik 行いて (ja-iku-kiku-te-exception)');
for (const d of spec.distractors) {
  const updated = Ledger.update(null, {
    concept: 'ja-verb-te',
    family: 'verbs',
    misconception: d.misconception,
    correct: false,
    timing: 'normal',
    sessionId: 'ses-1'
  }, 1700000000000);
  ok(Object.values(updated.entries).some(e => e.misconception === d.misconception),
    'MisconceptionLedger menerima & mencatat ID miskonsepsi nyata: ' + d.misconception);
}

// 3. Deconjugator & ProductionGrader Integration (Anti-False-Typo Forgiveness)
const deconj = Conjugator.unconjugate('食べませんでした');
ok(deconj.some(r => r.base === '食べる' || r.word === '食べる'), 'unconjugate mengurai 食べませんでした -> 食べる');

const gTenseSwap = Grader.grade('食べた', '食べて');
ok(gTenseSwap.ok === false && gTenseSwap.rationale === 'brain3_production_morpheme_miss',
  'ProductionGrader menolak 食べた saat target 食べて (bukan typo 1 huruf)');
ok(gTenseSwap.matchedDistractor && gTenseSwap.matchedDistractor.misconception === 'ja-te-vs-ta-form-confusion',
  'ProductionGrader mengembalikan miskonsepsi ja-te-vs-ta-form-confusion pada 食べた vs 食べて');

const gIkuTrap = Grader.grade('行いた', '行った');
ok(gIkuTrap.ok === false && gIkuTrap.matchedDistractor?.misconception === 'ja-iku-kiku-te-exception',
  'ProductionGrader mendeteksi jebakan 行いた vs 行った sebagai ja-iku-kiku-te-exception');

const gIchidanTrap = Grader.grade('食べらない', '食べない');
ok(gIchidanTrap.ok === false && gIchidanTrap.matchedDistractor?.misconception === 'ja-ichidan-conjugated-as-godan',
  'ProductionGrader mendeteksi 食べらない vs 食べない sebagai ja-ichidan-conjugated-as-godan');

const gParticleSwap = Grader.grade('で', 'に');
ok(gParticleSwap.ok === false && gParticleSwap.matchedDistractor?.misconception === 'ja-ni-vs-de-location-action',
  'ProductionGrader mendeteksi tertukarnya partikel に vs で sebagai ja-ni-vs-de-location-action');

// 4. Bunsetsu SOV Sentence Order Validator & Unicode Token Normalization
const targetTokens = ['私は', '毎日', '図書館で', '本を', '読みます'];

// 4a. Urutan alternatif Bunsetsu yang sah (毎日 di depan topik 私は, predikat 読みます tetap di akhir)
const validScramble = Conjugator.validateJapaneseSentenceOrder(
  ['毎日', '私は', '図書館で', '本を', '読みます'],
  targetTokens
);
ok(validScramble.ok === true && validScramble.exact === false && validScramble.rationale === 'ja_bunsetsu_equivalent_order',
  'Bunsetsu validator menerima urutan keterangan-topik sah [毎日][私は][図書館で][本を][読みます]');

// 4b. Pelanggaran posisi predikat SOV (kata kerja ditaruh di tengah seperti SVO Inggris/Indonesia)
const badSov = Conjugator.validateJapaneseSentenceOrder(
  ['私は', '読みます', '毎日', '図書館で', '本を'],
  targetTokens
);
ok(badSov.ok === false && badSov.misconception === 'ja-sov-predicate-position-error',
  'Bunsetsu validator menangkap kesalahan posisi predikat SOV (ja-sov-predicate-position-error)');

// 4c. Pertukaran kata benda dengan partikel (図書館を 本で 読みます)
const badParticleRole = Conjugator.validateJapaneseSentenceOrder(
  ['私は', '毎日', '図書館を', '本で', '読みます'],
  targetTokens
);
ok(badParticleRole.ok === false && badParticleRole.misconception === 'ja-particle-role-swap',
  'Bunsetsu validator menangkap pertukaran peran partikel (ja-particle-role-swap)');

// 4d. Pastikan grammarReasonEntry (app.js) & GrammarUpgrade.renderTokenOrder menangani Kanji/Kana tanpa kolaps "" === ""
const fs = require('fs');
const vm = require('vm');
const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8').replace(/\r\n/g, '\n');
const reasonHit = appSrc.match(/function grammarReasonEntry\([\s\S]*?\n\}/);
const hideKeyHit = appSrc.match(/function grammarHideKey\([\s\S]*?\n\}/);
ok(Boolean(reasonHit && hideKeyHit), 'grammarReasonEntry & grammarHideKey ditemukan di app.js');
const reasonCtx = {};
vm.createContext(reasonCtx);
vm.runInContext(reasonHit[0] + '\n' + hideKeyHit[0] + '\nthis.grammarReasonEntry = grammarReasonEntry;\nthis.grammarHideKey = grammarHideKey;', reasonCtx);
const jaMcq = {
  options: ['行った', '行いた', '行って'],
  answerIndex: 0,
  explain: {
    distractors: [
      { option: '行った', reason: 'Bentuk lampau 行く yang benar adalah 行った.' },
      { option: '行いた', reason: '行く adalah pengecualian konsonan ganda (促音便):正解は行ったです, bukan 行いた.' },
      { option: '行って', reason: '行って adalah bentuk sambung -te, bukan bentuk lampau selesai.' }
    ]
  }
};
const matchedReason = reasonCtx.grammarReasonEntry(jaMcq, '行いた');
ok(matchedReason && matchedReason.option === '行いた' && matchedReason.reason.includes('促音便'),
  'grammarReasonEntry mencocokkan distractor Kanji/Kana (行いた) secara presisi tanpa kolaps Unicode');
const maskedReason = reasonCtx.grammarHideKey(matchedReason.reason, '行った', '行いた');
ok(!maskedReason.includes('行った') && maskedReason.includes('行いた') && maskedReason.includes('…'),
  'grammarHideKey menyensor kunci jawaban CJK (行った -> …) tanpa menghapus opsi murid (行いた)');

function makeMockDom() {
  function makeEl(tag) {
    const classes = new Set();
    const attrs = {};
    const el = {
      tagName: String(tag || 'DIV').toUpperCase(),
      className: '',
      textContent: '',
      disabled: false,
      offsetWidth: 100,
      onclick: null,
      children: [],
      classList: {
        add: (...c) => c.forEach(x => classes.add(x)),
        remove: (...c) => c.forEach(x => classes.delete(x)),
        toggle: (x, f) => { if (f === undefined ? !classes.has(x) : f) classes.add(x); else classes.delete(x); }
      },
      setAttribute: (k, v) => { attrs[k] = String(v); },
      getAttribute: (k) => attrs[k] || null,
      appendChild: (child) => { el.children.push(child); return child; },
      querySelector: (sel) => {
        if (sel.startsWith('#')) {
          const id = sel.slice(1);
          return el._byId && el._byId[id] ? el._byId[id] : null;
        }
        return null;
      }
    };
    let _html = '';
    Object.defineProperty(el, 'innerHTML', {
      get: () => _html,
      set: (v) => {
        _html = String(v || '');
        el.children = [];
        el._byId = {};
        const idRe = /id="([^"]+)"/g;
        let m;
        while ((m = idRe.exec(_html)) !== null) {
          const child = makeEl('div');
          child.id = m[1];
          el._byId[m[1]] = child;
        }
      }
    });
    return el;
  }
  return { createElement: makeEl };
}

global.self = global;
global.FiezelJaConjugator = Conjugator;
global.FiezelI18n = { t: (_k, fb) => fb || _k, getLocale: () => 'id', hasCopy: () => false };
global.document = makeMockDom();

function runTokenOrderSimulation(clickSequence) {
  const qSim = {
    type: 'token-order',
    options: ['私は毎日図書館で本を読みます。', '私は読みます本を。'],
    answerIndex: 0,
    tokens: targetTokens
  };
  let verdict = null;
  const widget = GrammarUpgrade.renderTokenOrder(qSim, (isCorrect, detail) => {
    verdict = { isCorrect, detail, qMisconception: qSim.__detectedMisconceptionId || null };
  });
  const bankEl = widget.querySelector('#tokenBank');
  const submitBtn = widget.querySelector('#tokenSubmitBtn');
  for (const word of clickSequence) {
    const chip = bankEl.children.find(ch => ch.onclick && ch.textContent === word);
    assert.ok(chip, 'Chip token tidak ditemukan di bank: ' + word);
    chip.onclick();
  }
  submitBtn.onclick();
  return verdict;
}

const simValidBunsetsu = runTokenOrderSimulation(['毎日', '私は', '図書館で', '本を', '読みます']);
ok(simValidBunsetsu && simValidBunsetsu.isCorrect === true,
  'GrammarUpgrade.renderTokenOrder meluluskan urutan Bunsetsu ekuivalen [毎日][私は][図書館で][本を][読みます]');

const simBadSov = runTokenOrderSimulation(['私は', '読みます', '毎日', '図書館で', '本を']);
ok(simBadSov && simBadSov.isCorrect === false && simBadSov.detail.misconceptionId === 'ja-sov-predicate-position-error' && simBadSov.qMisconception === 'ja-sov-predicate-position-error',
  'GrammarUpgrade.renderTokenOrder menolak SVO salah & menandai q.__detectedMisconceptionId = ja-sov-predicate-position-error');

// 5. Okurigana Peeling Solver (FiezelJaUi & FiezelStoryReader)
const segOcha = JaUi.solveFuriganaSegments('お茶', 'おちゃ');
ok(segOcha.length === 2 && segOcha[0].ruby === 'お' && !segOcha[0].rt && segOcha[1].ruby === '茶' && segOcha[1].rt === 'ちゃ',
  'solveFuriganaSegments mengupas awalan kana: お茶 -> お + 茶[ちゃ]');

const segMochiHakobu = JaUi.solveFuriganaSegments('持ち運ぶ', 'もちはこぶ');
ok(segMochiHakobu.length === 4 &&
   segMochiHakobu[0].rt === 'も' &&
   !segMochiHakobu[1].rt && segMochiHakobu[1].ruby === 'ち' &&
   segMochiHakobu[2].rt === 'はこ' &&
   !segMochiHakobu[3].rt && segMochiHakobu[3].ruby === 'ぶ',
   'solveFuriganaSegments mengupas okurigana tengah & ujung: 持ち運ぶ -> 持[も] + ち + 運[はこ] + ぶ');

const segOmiyage = JaUi.solveFuriganaSegments('お土産', 'おみやげ');
ok(segOmiyage.length === 2 && segOmiyage[0].ruby === 'お' && !segOmiyage[0].rt && segOmiyage[1].ruby === '土産' && segOmiyage[1].rt === 'みやげ',
  'solveFuriganaSegments menjaga jukujikun 土産[みやげ] sambil mengupas awalan お');

const storyNormalized = StoryReader.normalizeStoryRubyMarkup(
  '<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'練習します\',\'れんしゅうします\',\'berlatih\')">練習します<rt>れんしゅうします</rt></ruby>',
  false
);
ok(storyNormalized.includes('<ruby>練習<rt>れんしゅう</rt></ruby>します') && storyNormalized.includes('class="fz-story-token"'),
  'StoryReader.normalizeStoryRubyMarkup mengupas okurigana します keluar dari <ruby> tanpa menghilangkan klik BKT');

const storyExamPurified = StoryReader.normalizeStoryRubyMarkup(
  '<ruby class="fz-story-token" onclick="window.FiezelStoryReader.inspectWord(\'美しい\',\'うつくしい\',\'indah\')">美しい<rt>うつくしい</rt></ruby>',
  true
);
ok(storyExamPurified === '美しい' && !storyExamPurified.includes('<rt>') && !storyExamPurified.includes('onclick'),
  'StoryReader.normalizeStoryRubyMarkup menanggalkan furigana & klik arti kata di Mode Ujian');

console.log(`\nFIEZEL japanese grammar, conjugator & okurigana: PASS (${passed} assertions)`);
