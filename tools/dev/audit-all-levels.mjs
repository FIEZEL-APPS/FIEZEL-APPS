import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const AudioKey = require(path.join(ROOT, 'features/audio-assets/fiezel-audio-key.js'));

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio/manifest.json'), 'utf8'));
const vocab = JSON.parse(fs.readFileSync(path.join(ROOT, 'vocabulary-master.json'), 'utf8'));

const existingProfiles = Array.isArray(manifest?.voiceProfiles) ? manifest.voiceProfiles : [];
const currentProfile = {
  voiceId: 'Aoede',
  modelId: 'gemini-tts-gemini-2.5-flash-preview-tts',
  locale: 'en-US',
  settings: { pitch: 0, speakingRate: 1 }
};
const profilesToCheck = existingProfiles.some((p) => p.voiceId === currentProfile.voiceId && p.modelId === currentProfile.modelId)
  ? existingProfiles
  : [currentProfile, ...existingProfiles];

function isTextVoiced(text, contentType) {
  if (!text) return false;
  for (const profile of profilesToCheck) {
    try {
      const key = AudioKey.build({
        text,
        locale: 'en-US',
        contentType,
        voiceId: profile.voiceId,
        modelId: profile.modelId,
        settings: profile.settings
      }).audioKey;
      const asset = manifest.assets[key];
      if (asset && (asset.status === 'ready' || asset.status === 'READY') && asset.url) {
        return true;
      }
    } catch (_) {}
  }
  return false;
}

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
console.log('=== AUDIT KOSAKATA & CONTOH KALIMAT SELURUH LEVEL (A1 - C2) ===\n');
console.log('| Level | Total Kosakata | Kata Bersuara (%) | Kalimat Bersuara (%) | Status |');
console.log('|---|---|---|---|---|');

let grandTotalVocab = 0;
let grandTotalWordsReady = 0;
let grandTotalSentencesReady = 0;

levels.forEach(lvl => {
  const items = vocab.filter(item => item.level === lvl);
  let wordsReady = 0;
  let sentencesReady = 0;

  items.forEach(item => {
    if (isTextVoiced(item.word, 'word')) wordsReady++;
    const s = item.example || (item.examples && item.examples[0] && item.examples[0].en);
    if (s && isTextVoiced(s, 'sentence')) sentencesReady++;
  });

  const wordPct = items.length ? ((wordsReady / items.length) * 100).toFixed(1) : '0.0';
  const sentPct = items.length ? ((sentencesReady / items.length) * 100).toFixed(1) : '0.0';
  const status = (wordsReady === items.length && sentencesReady === items.length) ? '100% TUNTAS' : 'Dalam Proses';

  grandTotalVocab += items.length;
  grandTotalWordsReady += wordsReady;
  grandTotalSentencesReady += sentencesReady;

  console.log(`| ${lvl} | ${items.length} | ${wordsReady}/${items.length} (${wordPct}%) | ${sentencesReady}/${items.length} (${sentPct}%) | ${status} |`);
});

const totalWordPct = ((grandTotalWordsReady / grandTotalVocab) * 100).toFixed(1);
const totalSentPct = ((grandTotalSentencesReady / grandTotalVocab) * 100).toFixed(1);
console.log(`| **TOTAL** | **${grandTotalVocab}** | **${grandTotalWordsReady}/${grandTotalVocab} (${totalWordPct}%)** | **${grandTotalSentencesReady}/${grandTotalVocab} (${totalSentPct}%)** | |`);
