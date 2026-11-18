#!/usr/bin/env node
/**
 * tests/i18n-english-first-and-purity-test.js
 *
 * CI GATE: ENGLISH-FIRST ARCHITECTURE, ZERO-PAW MASCOT, & GADO-GADO CORRUPTION GUARD
 * Enforces:
 * 1. Zero PAW mascot branding across all 36 locale JSON catalogs & JS copy-maps.
 * 2. Zero historical gado-gado / machine-mistranslation regressions (e.g., modal "can" as tin/缶/банки,
 *    "is/are" as sedang/គឺ, "Articles" as 記事, "聴解/会話" kanji corruptions, etc.).
 * 3. English-First runtime pivot in app.js (grammarItemForEn, applyContentLocale, non-ID prompts).
 * 4. English-First runtime wiring in native feature modules & Voice Studio 9-locale engine.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'features', 'i18n', 'locales');
const I18N_DIR = path.join(ROOT, 'features', 'i18n');
const LOCALES = ['en', 'id', 'th', 'vi', 'ms', 'fil', 'ja', 'km', 'ru'];
const NAMESPACES = ['ui', 'quiz', 'grammar', 'vocab'];

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}\n  -> ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('--- FIEZEL ENGLISH-FIRST ARCHITECTURE & GLOBAL PURITY GATE ---');

check('1. Zero PAW mascot branding across all 36 JSON catalogs and copy-id/th maps', () => {
  const pawHits = [];
  for (const loc of LOCALES) {
    for (const ns of NAMESPACES) {
      const p = path.join(LOCALES_DIR, loc, `${ns}.json`);
      const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const [k, v] of Object.entries(obj)) {
        if (/\bPAW\b/.test(String(v))) {
          pawHits.push(`${loc}/${ns}.json:${k} -> ${String(v).slice(0, 60)}`);
        }
      }
    }
  }
  for (const fname of fs.readdirSync(I18N_DIR)) {
    if (!/^copy-(?:id|th)-.*\.js$/.test(fname)) continue;
    const raw = fs.readFileSync(path.join(I18N_DIR, fname), 'utf8');
    // Match PAW inside quoted string values (excluding keys/comments)
    const lines = raw.split('\n');
    lines.forEach((line, idx) => {
      const m = line.match(/:\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/);
      if (m && /\bPAW\b/.test(m[2])) {
        pawHits.push(`${fname}:${idx + 1} -> ${m[2].slice(0, 60)}`);
      }
    });
  }
  assert.deepStrictEqual(pawHits, [], `Found PAW mascot strings: ${pawHits.slice(0, 5).join(' | ')}`);
});

check('2. Zero gado-gado and semantic mistranslation regressions across catalogs', () => {
  const forbiddenGlobal = [
    'KelasKu for Учительs',
    'have gone, not have gone',
    '鳥海',
    '海和',
    'Случайный студент',
    'Selesai + Evidence Sidecar',
    'for と because',
    'pudar kata',
  ];
  const hits = [];
  for (const loc of LOCALES) {
    for (const ns of NAMESPACES) {
      const p = path.join(LOCALES_DIR, loc, `${ns}.json`);
      const raw = fs.readFileSync(p, 'utf8');
      for (const bad of forbiddenGlobal) {
        if (raw.includes(bad)) hits.push(`${loc}/${ns}.json contains "${bad}"`);
      }
    }
  }
  const enUi = fs.readFileSync(path.join(LOCALES_DIR, 'en', 'ui.json'), 'utf8');
  const enGrammar = fs.readFileSync(path.join(LOCALES_DIR, 'en', 'grammar.json'), 'utf8');
  if (/\bPonteng\b/i.test(enUi) || /\bPonteng\b/i.test(fs.readFileSync(path.join(LOCALES_DIR, 'ms', 'grammar.json'), 'utf8'))) {
    hits.push('Ponteng mistranslation still present');
  }
  assert(!/sekolah\.ai-label["']\s*:\s*["']Ask the AI Guru["']/i.test(enUi), 'sekolah.ai-label in EN must not say Ask the AI Guru');
  assert(!enGrammar.includes('Tin &'), 'EN grammar must not contain Tin corruption for modal can');
  assert.deepStrictEqual(hits, [], hits.join(' | '));
});

check('3. app.js enforces English-First pivot (grammarItemForEn, applyContentLocale, non-ID prompts & chrome)', () => {
  const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  assert(appJs.includes('function grammarItemForEn('), 'app.js must define grammarItemForEn()');
  assert(/function applyContentLocale[\s\S]{0,1800}grammarItemForEn\(/m.test(appJs), 'applyContentLocale must pivot non-ID/non-TH grammar items via grammarItemForEn');
  assert(/function grammarReasonForLearner[\s\S]{0,1200}loc\s*===\s*['"]id['"]\s*&&\s*!tutorIndonesian/m.test(appJs), 'grammarReasonForLearner must serve English first for non-ID/non-TH locales');
  assert(/function grammarMisconceptionReason[\s\S]{0,1200}grammarCapFirst\(key\)/m.test(appJs), 'grammarMisconceptionReason must resolve English key fallback cleanly');
  assert(appJs.includes('d?.enMisconception'), 'grammarItemForEn must prefer d?.enMisconception for non-ID/non-TH');
  assert(!appJs.includes("'Cerita Bergambar N5'"), 'Unwrapped Indonesian string Cerita Bergambar N5 must not appear in app.js');
  assert(!appJs.includes("'Pusat Tutor'"), 'Unwrapped Indonesian string Pusat Tutor must not appear in app.js');
  assert(!appJs.includes('>SKILL INTI TES<'), 'Hardcoded SKILL INTI TES badge must use i18n key');
  assert(!appJs.includes("'Bantuan mochi'"), 'Hardcoded Bantuan mochi tag must not appear in app.js');

  const wrBank = JSON.parse(fs.readFileSync(path.join(ROOT, 'writing-prompts-v1.json'), 'utf8'));
  const missingFocusEn = (wrBank.prompts || []).filter((p) => !p.focusEn || !p.focusEn.trim());
  assert.strictEqual(missingFocusEn.length, 0, 'writing-prompts-v1.json every prompt must carry focusEn');
});

check('4. Native feature modules route via FiezelI18n with English defaults', () => {
  const undercoverJs = fs.readFileSync(path.join(ROOT, 'features', 'undercover', 'fiezel-undercover-ui.js'), 'utf8');
  assert(/loc\s*!==\s*['"]id['"][\s\S]{0,400}loadLocale\(['"]en['"]\)/m.test(undercoverJs), 'fiezel-undercover-ui.js must load en Golden Pivot for non-ID locales');
  assert(undercoverJs.includes("localStorageKey") || undercoverJs.includes("normLoc("), 'fiezel-undercover-ui.js resolveLocale must accept all 9 locales');

  const storyJs = fs.readFileSync(path.join(ROOT, 'features', 'japanese', 'fiezel-story-reader.js'), 'utf8');
  assert(storyJs.includes('STORY_COPY_EN'), 'fiezel-story-reader.js must register STORY_COPY_EN');
  assert(storyJs.includes('STORY_SCENE_I18N') && storyJs.includes('WORD_GLOSS_I18N'), 'fiezel-story-reader.js must provide EN+TH scenes and word glosses');
  assert(storyJs.includes('function getStoryCategory(') && storyJs.includes('story.cat-teknologi'), 'fiezel-story-reader.js must localize story categories including Teknologi & Perjalanan');
  assert(!storyJs.includes('var STORY_COPY_ID'), 'fiezel-story-reader.js must not duplicate STORY_COPY_ID inline');

  const sosJs = fs.readFileSync(path.join(ROOT, 'features', 'mascot', 'fiezel-mochi-voice-sos.js'), 'utf8');
  assert(!sosJs.includes('Aktifkan bantuan suara Mochi'), 'fiezel-mochi-voice-sos.js must not contain stale inline Aktifkan bantuan suara Mochi string');

  const mandarinJs = fs.readFileSync(path.join(ROOT, 'features', 'mandarin', 'mandarin-ui.js'), 'utf8');
  assert(mandarinJs.includes('function mt(') && mandarinJs.includes("'mandarin.step_1'"), 'mandarin-ui.js must localize step labels via mt()');
  assert(mandarinJs.includes('function pickM(') && mandarinJs.includes('enMeaning'), 'mandarin-ui.js must localize modals via pickM() and prefer enMeaning in non-ID HSK vocab');
});

check('5. Voice Studio supports 9 locales with English Golden Pivot and scenario/vocab EN resolvers', () => {
  const vsI18n = fs.readFileSync(path.join(ROOT, 'features', 'voice-studio', 'src', 'lib', 'i18n.ts'), 'utf8');
  for (const loc of LOCALES) {
    assert(new RegExp(`\\b${loc}\\s*:`).test(vsI18n), `Voice Studio i18n.ts missing locale block: ${loc}`);
  }
  assert(vsI18n.includes('export const SCENARIO_EN_META'), 'Voice Studio i18n.ts must export SCENARIO_EN_META');
  assert(vsI18n.includes('export function scenarioMetaForLocale'), 'Voice Studio i18n.ts must export scenarioMetaForLocale');
  assert(vsI18n.includes('export function vocabMeaningForLocale'), 'Voice Studio i18n.ts must export vocabMeaningForLocale');
  assert(/COPY\[locale\]\?\.\[key\]\s*\?\?\s*COPY\.en\?\.\[key\]/.test(vsI18n), 'Voice Studio t() must use COPY.en as Golden Pivot fallback before COPY.id');

  const wbDirector = fs.readFileSync(path.join(ROOT, 'features', 'voice-studio', 'src', 'lib', 'whiteboardDirector.ts'), 'utf8');
  assert(!/:\s*'Bahasa Indonesia';\s*\n\s*const targetLocaleCode/m.test(wbDirector), 'whiteboardDirector.ts must default unknown non-ID locales to English, not Bahasa Indonesia');

  const homeView = fs.readFileSync(path.join(ROOT, 'features', 'voice-studio', 'src', 'components', 'HomeRedesignView.tsx'), 'utf8');
  assert(homeView.includes('scenarioMetaForLocale(') && homeView.includes('vocabMeaningForLocale('), 'HomeRedesignView.tsx must resolve scenarios & vocab via i18n helpers');
  assert(!homeView.includes('Mochi si Teman Bicara'), 'HomeRedesignView.tsx must not hardcode Indonesian Mochi helper title');

  const vsApp = fs.readFileSync(path.join(ROOT, 'features', 'voice-studio', 'src', 'App.tsx'), 'utf8');
  assert(!vsApp.includes("'Transkrip Percakapan'") && !vsApp.includes("'Ketik pesan...'"), 'App.tsx Voice Studio must route History/Composer UI through i18n t()');
});

console.log(`\nFIEZEL English-First & Global Purity: ${passed} checks passed.`);
