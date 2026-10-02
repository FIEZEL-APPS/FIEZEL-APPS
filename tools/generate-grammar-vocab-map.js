/**
 * tools/generate-grammar-vocab-map.js
 * Generates content/grammar-vocab-map-v1.json mapping all 180 grammar curriculum lessons
 * to 15 relevant vocabulary words from vocabulary-master.json, supporting the 3 leveling tiers:
 * - Pelajar Santai (5 vocab / 10 grammar questions)
 * - Siswa Teladan (10 vocab / 15 grammar questions)
 * - Super Rajin (15 vocab / 20 grammar questions)
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const curPath = path.join(root, 'grammar-curriculum-v1.json');
const tplsPath = path.join(root, 'grammar-templates.json');
const vocabPath = path.join(root, 'vocabulary-master.json');
const outPath = path.join(root, 'content', 'grammar-vocab-map-v1.json');

const cur = JSON.parse(fs.readFileSync(curPath, 'utf8')).lessons;
const tpls = JSON.parse(fs.readFileSync(tplsPath, 'utf8')).templates;
const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));

const vocabByWord = new Map();
const vocabById = new Map();
const vocabByLevel = { A1: [], A2: [], B1: [], B2: [], C1: [], C2: [] };

for (const v of vocab) {
  if (!v.word || !v.id) continue;
  const w = v.word.trim().toLowerCase();
  vocabById.set(v.id, v);
  if (!vocabByWord.has(w)) vocabByWord.set(w, []);
  vocabByWord.get(w).push(v);
  if (vocabByLevel[v.level]) vocabByLevel[v.level].push(v);
}

const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const stopWords = new Set([
  'the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its', 'this', 'that',
  'these', 'those', 'not', 'no', 'or', 'so', 'as', 'if', 'from', 'into', 'than',
  'too', 'very', 'just', 'out', 'up', 'down', 'about'
]);

const posPriority = { noun: 1, verb: 2, adjective: 3, adverb: 4, pronoun: 5 };

const levelsConfig = {
  santai: {
    id: 'santai',
    name: 'Pelajar Santai',
    vocabTarget: 5,
    grammarQuestionCount: 10,
    grammarMin: 5,
    grammarMax: 10,
    badge: '5 Kata · 10 Soal',
    description: 'Santai tapi konsisten: 5 kosakata & 10 soal grammar per sesi.'
  },
  teladan: {
    id: 'teladan',
    name: 'Siswa Teladan',
    vocabTarget: 10,
    grammarQuestionCount: 15,
    grammarMin: 10,
    grammarMax: 15,
    badge: '10 Kata · 15 Soal',
    description: 'Fokus berimbang: 10 kosakata & 15 soal grammar per sesi.'
  },
  rajin: {
    id: 'rajin',
    name: 'Super Rajin',
    vocabTarget: 15,
    grammarQuestionCount: 20,
    grammarMin: 15,
    grammarMax: 20,
    badge: '15 Kata · 20 Soal',
    description: 'Intensitas maksimal: 15 kosakata & 20 soal grammar per sesi.'
  }
};

const lessonsMap = {};

for (const lesson of cur) {
  const lessonTpls = tpls.filter(t => t.subskill === lesson.lessonId);
  const textCorpus = [
    lesson.titleEn || '',
    lesson.lessonId.replace(/_/g, ' '),
    ...lessonTpls.flatMap(t => [
      t.stem || '',
      ...(t.options || []),
      t.explanation?.rule || '',
      t.pedagogicalObjective || ''
    ])
  ].join(' ').toLowerCase();

  const rawTokens = textCorpus.match(/[a-z]{3,}/g) || [];
  const tokenSet = new Set(rawTokens);

  const matchedVocab = [];
  const seenIds = new Set();

  // 1. Direct word match from lesson content
  for (const token of tokenSet) {
    if (stopWords.has(token)) continue;
    const cands = vocabByWord.get(token);
    if (cands) {
      for (const cand of cands) {
        if (!seenIds.has(cand.id)) {
          seenIds.add(cand.id);
          matchedVocab.push(cand);
        }
      }
    }
  }

  // Sort matched: prioritize nouns/verbs/adjectives and level proximity
  const lIdx = Math.max(0, levelOrder.indexOf(lesson.level));
  matchedVocab.sort((a, b) => {
    const pA = posPriority[a.partOfSpeech] || 8;
    const pB = posPriority[b.partOfSpeech] || 8;
    if (pA !== pB) return pA - pB;
    const aDist = Math.abs(levelOrder.indexOf(a.level) - lIdx);
    const bDist = Math.abs(levelOrder.indexOf(b.level) - lIdx);
    return aDist - bDist;
  });

  // 2. Supplement if fewer than 15 words
  if (matchedVocab.length < 15) {
    const candidateLevels = [
      lesson.level,
      levelOrder[Math.max(0, lIdx - 1)],
      levelOrder[Math.min(levelOrder.length - 1, lIdx + 1)],
      'A1',
      'A2'
    ];
    for (const lvl of candidateLevels) {
      if (matchedVocab.length >= 15) break;
      const list = vocabByLevel[lvl] || [];
      if (!list.length) continue;
      const offset = ((lesson.sequence || 1) * 11) % list.length;
      for (let i = 0; i < list.length && matchedVocab.length < 15; i++) {
        const cand = list[(offset + i) % list.length];
        if (!seenIds.has(cand.id) && !stopWords.has(cand.word.toLowerCase())) {
          seenIds.add(cand.id);
          matchedVocab.push(cand);
        }
      }
    }
  }

  const selected = matchedVocab.slice(0, 15);

  lessonsMap[lesson.lessonId] = {
    lessonId: lesson.lessonId,
    level: lesson.level,
    sequence: lesson.sequence,
    title: lesson.title,
    titleEn: lesson.titleEn || '',
    vocabIds: selected.map(v => v.id),
    words: selected.map(v => v.word),
    vocabDetails: selected.map(v => ({
      id: v.id,
      word: v.word,
      meaning: v.meaning || (v.meanings?.[0]?.meaning || ''),
      level: v.level,
      partOfSpeech: v.partOfSpeech || 'noun',
      example: v.example || (v.examples?.[0]?.en || '')
    }))
  };
}

const output = {
  schema: 'fiezel-grammar-vocab-map-v1',
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  levels: levelsConfig,
  lessonsCount: Object.keys(lessonsMap).length,
  lessons: lessonsMap
};

fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`Successfully generated ${outPath} with ${Object.keys(lessonsMap).length} lessons mapped!`);
