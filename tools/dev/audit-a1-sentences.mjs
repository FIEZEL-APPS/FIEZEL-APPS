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

const a1Items = vocab.filter(item => item.level === 'A1');
const missingWords = [];
const readyWords = [];
const missingSentences = [];
const readySentences = [];

a1Items.forEach(item => {
  // Check word
  if (isTextVoiced(item.word, 'word')) {
    readyWords.push(item);
  } else {
    missingWords.push(item);
  }

  // Check example sentence
  const sentenceText = item.example || (item.examples && item.examples[0] && item.examples[0].en);
  if (sentenceText && isTextVoiced(sentenceText, 'sentence')) {
    readySentences.push(item);
  } else {
    missingSentences.push(item);
  }
});

console.log('=== AUDIT KOSAKATA & CONTOH KALIMAT LEVEL A1 (RUNTIME AUDIO RESOLUTION) ===');
console.log('Total Kosa Kata A1:', a1Items.length);
console.log('Kata Berstatus READY:', readyWords.length, '/', a1Items.length, `(${(readyWords.length / a1Items.length * 100).toFixed(1)}%)`);
console.log('Kalimat Berstatus READY:', readySentences.length, '/', a1Items.length, `(${(readySentences.length / a1Items.length * 100).toFixed(1)}%)`);

if (missingWords.length > 0) {
  console.log('\nKata A1 yang Belum Ada Suara:');
  missingWords.forEach((item, idx) => console.log(`${idx + 1}. [${item.id}] ${item.word}`));
}

if (missingSentences.length > 0) {
  console.log('\nKalimat A1 yang Belum Ada Suara:');
  missingSentences.forEach((item, idx) => {
    const s = item.example || (item.examples && item.examples[0] && item.examples[0].en);
    console.log(`${idx + 1}. [${item.id}] ${item.word} -> "${s}"`);
  });
} else {
  console.log('\n100% CONTOH KALIMAT LEVEL A1 SUDAH MEMILIKI AUDIO STUDIO NATIVE!');
}
