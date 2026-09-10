#!/usr/bin/env node
/**
 * V3 chunker baseline measurement (evidence for reports/voice-v3-chunk.md).
 * Pure measurement, no mutation. Run: node analysis/vchunk-baseline.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const NV = require(path.join(ROOT, 'features/neural-voice/fiezel-neural-voice.js'));
const P = require(path.join(ROOT, 'features/neural-voice/fiezel-prosody.js'));

const reading = JSON.parse(fs.readFileSync(path.join(ROOT, 'reading-bank.json'), 'utf8'));
const listening = JSON.parse(fs.readFileSync(path.join(ROOT, 'features/speaking-listening/listening-bank-v1.json'), 'utf8')).items;

const passage = reading.find((r) => r.id === 'r0123');
const script = listening.find((x) => x.id === 'listen_sc_b1_gist_007');

function stats(label, chunks) {
  const lens = chunks.map((c) => c.length);
  const avg = lens.reduce((a, b) => a + b, 0) / (lens.length || 1);
  console.log(`${label}: chunks=${chunks.length} avgChars=${avg.toFixed(1)} min=${Math.min(...lens)} max=${Math.max(...lens)}`);
  chunks.forEach((c, i) => console.log(`   [${i}] (${c.length}) ${c}`));
  return { count: chunks.length, avg: Number(avg.toFixed(1)), min: Math.min(...lens), max: Math.max(...lens) };
}

const out = {};
for (const sample of [
  { id: passage.id, kind: 'reading B1 passage', text: passage.text },
  { id: script.id, kind: 'listening B1 script', text: script.script }
]) {
  console.log('\n=== ' + sample.id + ' (' + sample.kind + ', ' + sample.text.length + ' chars) ===');
  // what the runtime actually feeds the engine today: whitespace-collapsed
  const flat = sample.text.replace(/\s+/g, ' ').trim();
  const planStream = stats('planStream(maxWords=26)', NV.planStream(flat, { maxWords: 26 }));
  const phrases = stats('prosody.phrases(160)', P.phrases(flat, 160, 'en'));
  const grouped = P.groupChunks ? stats('groupChunks(new)', P.groupChunks(sample.text, { lang: 'en' }).map((c) => c.text)) : null;
  out[sample.id] = { chars: sample.text.length, planStream, phrases, grouped };
}
console.log('\nJSON: ' + JSON.stringify(out, null, 2));
