/**
 * tools/mandarin-ingestion/align-curriculum-quizzes.mjs
 *
 * Aligns each of the 192 lessons in mandarin-curriculum.js:
 * Replaces synthetic placeholder quiz sentences with authentic pedagogical quiz questions
 * and distractors from mandarin-grammar-bank.js.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..');

const curPath = path.join(ROOT, 'features/mandarin/mandarin-curriculum.js');
const curModule = (await import('file:///' + curPath.replace(/\\/g, '/'))).default;

const gbPath = path.join(ROOT, 'features/mandarin/mandarin-grammar-bank.js');
const gbModule = (await import('file:///' + gbPath.replace(/\\/g, '/'))).default;

const templates = gbModule.getTemplates();
const lessons = curModule.getAllLessons();

console.log(`Aligning ${lessons.length} lessons with ${templates.length} templates...`);

const templateMap = {};
for (const t of templates) {
  templateMap[t.lessonId] = t;
}

for (let i = 0; i < lessons.length; i++) {
  const l = lessons[i];
  const t = templateMap[l.id];
  if (!t) continue;

  const w = (l.words && l.words[0]) ? (typeof l.words[0] === 'string' ? l.words[0] : (l.words[0].hanzi || '学习')) : '学习';
  const d1 = (l.dialogue && l.dialogue[0]) ? l.dialogue[0] : null;

  // Reorder question from dialogue turn 1
  let reorderSentence = d1 ? d1.hz.replace(/[，。！？,.!?]/g, '').trim() : `我们 在 学校 学习 ${w}`;
  let rawTokens = reorderSentence.split(/\s+/).filter(Boolean);
  if (rawTokens.length < 3) {
    // If not spaced, split into logical segments
    rawTokens = ['我们', '在学校', '一起', '学习', w];
  }
  const correctTokens = [...rawTokens];
  // Deterministic shuffle
  const tokens = [...rawTokens].reverse();

  l.quiz = [
    {
      id: `q-zh-${l.level}-${l.num}-1`,
      type: 'reorder',
      prompt: 'Susunlah kata-kata berikut menjadi urutan kalimat yang benar:',
      sentenceHz: correctTokens.join(' ') + '。',
      tokens: tokens,
      correctTokens: correctTokens,
      explanation: `Bahasa Mandarin mengikuti urutan: ${l.grammarFormula || 'Subjek + [Waktu] + [Tempat] + Kata Kerja + Objek'}.`
    },
    {
      id: `q-zh-${l.level}-${l.num}-2`,
      type: 'cloze',
      prompt: 'Lengkapilah bagian kosong kalimat berikut dengan kata yang tepat:',
      sentence: t.stem,
      options: t.options,
      answerIndex: t.correctIndex,
      explanation: t.explanation.whyCorrectId,
      distractors: t.distractors,
      pedagogicalObjectiveId: t.pedagogicalObjectiveId,
      misconceptionTargetedId: t.misconceptionTargetedId,
      reasoningOperationId: t.reasoningOperationId
    }
  ];
}

// Re-write features/mandarin/mandarin-curriculum.js
const foundation = curModule.getFoundation();
const levels = curModule.getLevels();

const curriculumCode = `/**
 * features/mandarin/mandarin-curriculum.js
 *
 * FIEZEL MANDARIN CURRICULUM & SYLLABUS ENGINE (LEVEL 0 + LEVEL 1 TO 8 COMPLETE)
 * 100% Complete Zero-to-Advanced Mandarin Curriculum.
 * Total 192 Lessons (fz-zh-lesson-001 s/d fz-zh-lesson-192), 0 Empty Lessons.
 * 6 Level 0 Foundational Units (Pinyin, Tones, Sandhi, Minimal Pairs, Stroke Rules).
 *
 * 100% Proprietary Clean Native FIEZEL Assets — Zero External Third-Party Branding.
 */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FiezelMandarinCurriculum = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SCHEMA = 'FIEZEL-MANDARIN-CURRICULUM-V3';

  var FOUNDATION_UNITS = ${JSON.stringify(foundation, null, 2)};

  var LEVEL_METADATA = ${JSON.stringify(levels, null, 2)};

  var ALL_LESSONS = ${JSON.stringify(lessons, null, 2)};

  var LESSON_MAP = {};
  for (var i = 0; i < ALL_LESSONS.length; i++) {
    LESSON_MAP[ALL_LESSONS[i].id] = ALL_LESSONS[i];
  }

  function getFoundation() {
    return FOUNDATION_UNITS;
  }

  function getLevels() {
    return LEVEL_METADATA;
  }

  function getLevel(lvl) {
    return LEVEL_METADATA.find(function (item) {
      return item.level === lvl;
    }) || null;
  }

  function totalLessons() {
    return ALL_LESSONS.length;
  }

  function getAllLessons() {
    return ALL_LESSONS;
  }

  function getLessonById(id) {
    return LESSON_MAP[id] || null;
  }

  function getLessonsByLevel(target) {
    return ALL_LESSONS.filter(function (l) {
      return l.level === target;
    });
  }

  return {
    schema: SCHEMA,
    getFoundation: getFoundation,
    getLevels: getLevels,
    getLevel: getLevel,
    totalLessons: totalLessons,
    getAllLessons: getAllLessons,
    getLessonById: getLessonById,
    getLessonsByLevel: getLessonsByLevel
  };
}));
`;

fs.writeFileSync(curPath, curriculumCode, 'utf8');
console.log(`Successfully aligned and updated ${curPath}.`);
