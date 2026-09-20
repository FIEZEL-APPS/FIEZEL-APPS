#!/usr/bin/env node
/* tools/build-offline-map.mjs — PETA BUTIR STATIS -> KOMPETENSI SERVER (F9 fase 2).
 *
 * Aturan TUNGGAL yang tidak bisa ditawar: kecocokan EKSak string prompt, setelah
 * normalisasi spasi. Parafrasa = TIDAK dipetakan (butirnya tetap terrekam sebagai
 * aktivitas tanpa kompetensi, bukan dipaksa ke kompetensi yang salah — bukti palsu
 * lebih buruk daripada tidak ada bukti, kontrak handoff butir 5).
 *
 * Keluaran: backend/offline_static_map.py (STATIC_COMPETENCY + META).
 * Deterministik: urut kunci, tanpa cap waktu. Jalankan ulang kapan saja.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const kur = require(path.join(ROOT, 'features/teacher/fiezel-teacher-curriculum.js'));
const seed = fs.readFileSync(path.join(ROOT, 'backend/seed_soal.py'), 'utf8');

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

const stems = new Map();
const blockRe = /"(KOMP-[A-Za-z0-9-]+)"\s*:\s*\[/g;
const blocks = [];
let b;
while ((b = blockRe.exec(seed))) blocks.push({ komp: b[1], idx: b.index });
const qRe = /Q\(\s*"((?:[^"\\]|\\.)*)"/g;
blocks.forEach((bl, i) => {
  const seg = seed.slice(bl.idx, i + 1 < blocks.length ? blocks[i + 1].idx : seed.length);
  let m;
  while ((m = qRe.exec(seg))) {
    const k = norm(m[1]);
    if (!stems.has(k)) stems.set(k, bl.komp);
  }
});

const entries = {};
const units = kur.allUnits();
let total = 0;
units.forEach((u) => {
  u.items.forEach((it) => {
    total++;
    const cid = stems.get(norm(it.prompt));
    if (cid) entries[it.id] = cid;
  });
});

const keys = Object.keys(entries).sort();
const lines = keys.map((k) => `    ${JSON.stringify(k)}: ${JSON.stringify(entries[k])},`);
const out = `"""Peta butir statis offline -> kompetensi server (F9 fase 2). DIBANGKITKAN OTOMATIS
oleh tools/build-offline-map.mjs — jangan sunting tangan (nanti tertimpa).

Aturan: prompt EKSak (normalisasi spasi). ${keys.length}/${total} butir terpetakan;
sisanya direkam sebagai aktivitas TANPA kompetensi. Memaksa parafasa ke kompetensi
sama dengan mengarang bukti.
"""
STATIC_COMPETENCY = {
${lines.join('\n')}
}
META = {"mapped": ${keys.length}, "total_static": ${total}, "rule": "exact-prompt"}
`;
fs.writeFileSync(path.join(ROOT, 'backend/offline_static_map.py'), out);
console.log(`offline_static_map.py: ${keys.length}/${total} terpetakan`);
