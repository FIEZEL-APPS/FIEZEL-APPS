#!/usr/bin/env node
/**
 * tools/chokai-audio-pipeline/pipeline-orchestrator.mjs
 * 
 * ORKESTRATOR PIPELINE AUDIO CHOKAI MULTI-KARAKTER
 * 
 * Menjamin 100% kepatuhan terhadap PROTOKOL-AUDIO-CHOKAI-MULTI-KARAKTER.md:
 * - Setiap dialog percakapan disintesis dengan suara berbeda untuk karakter pria & wanita.
 * - Pembuka konteks dan pertanyaan penutup disintesis dengan suara narator/instruktor tegas & dewasa.
 * - Jeda bernapas alami diselipkan antar baris dialog dan sebelum pertanyaan.
 * - File master MP3 disimpan di features/speaking-listening/audio-jlpt/
 * 
 * Penggunaan:
 *   node tools/chokai-audio-pipeline/pipeline-orchestrator.mjs --item=jlpt-n5-m1-01
 *   node tools/chokai-audio-pipeline/pipeline-orchestrator.mjs --all
 *   node tools/chokai-audio-pipeline/pipeline-orchestrator.mjs --start=0 --end=5
 *   node tools/chokai-audio-pipeline/pipeline-orchestrator.mjs --verify
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScriptToTurns, ROLES } from './speaker-router.mjs';
import { synthesizeTurn, stitchSegments, VOICE_PROFILES } from './multi-voice-engine.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

const BANK_FILE = path.join(ROOT, 'features/speaking-listening/jlpt-listening-bank-v1.json');
const OUT_DIR = path.join(ROOT, 'features/speaking-listening/audio-jlpt');
const TEMP_BASE = path.join(ROOT, 'scratch/chokai-pipeline');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(TEMP_BASE)) fs.mkdirSync(TEMP_BASE, { recursive: true });

export async function processQuestionItem(item, force = false) {
  const finalMp3 = path.join(OUT_DIR, `${item.id}.mp3`);
  const itemTempDir = path.join(TEMP_BASE, item.id);
  if (!fs.existsSync(itemTempDir)) fs.mkdirSync(itemTempDir, { recursive: true });

  const turns = parseScriptToTurns(item);
  const distinctRoles = new Set(turns.map(t => t.role));

  console.log(`\n======================================================`);
  console.log(`[CHOKAI PIPELINE] Memproses Soal: ${item.id} (${item.level} - ${item.title})`);
  console.log(`- Jumlah Babak/Giliran Bicara: ${turns.length} baris`);
  console.log(`- Karakter Terlibat: ${Array.from(distinctRoles).join(', ')}`);
  console.log(`======================================================`);

  const segments = [];

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const segFileName = `seg_${String(i).padStart(2, '0')}_${turn.role}.mp3`;
    const segPath = path.join(itemTempDir, segFileName);

    const profile = VOICE_PROFILES[turn.role];
    console.log(`  [Turn ${i + 1}/${turns.length}] [${turn.speaker}] (${profile.role})`);
    console.log(`    Teks: "${turn.text.slice(0, 50)}${turn.text.length > 50 ? '...' : ''}"`);

    const ok = await synthesizeTurn(turn.text, turn.role, segPath);
    if (!ok) {
      console.error(`    -> GAGAL mensintesis turn ${i + 1}`);
      return false;
    }
    segments.push({ filePath: segPath, type: turn.type, role: turn.role });
  }

  console.log(`  -> Menyambungkan (stitching) ${segments.length} segmen audio dengan jeda nafas terukur...`);
  const stitchOk = stitchSegments(segments, finalMp3, itemTempDir);
  if (stitchOk) {
    const stat = fs.statSync(finalMp3);
    console.log(`  ✓ BERHASIL! Audio Master selesai: ${item.id}.mp3 (${Math.round(stat.size / 1024)} KB)`);
    return {
      id: item.id,
      turnsCount: turns.length,
      roles: Array.from(distinctRoles),
      fileSize: stat.size,
      multiVoiceCertified: distinctRoles.size >= 2
    };
  } else {
    console.error(`  ✗ GAGAL menyambungkan segmen untuk ${item.id}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const bankData = JSON.parse(fs.readFileSync(BANK_FILE, 'utf8'));
  const items = bankData.items || [];

  let singleId = null;
  let startIdx = 0;
  let endIdx = items.length - 1;
  let isVerify = false;

  for (const a of args) {
    if (a.startsWith('--item=')) singleId = a.split('=')[1];
    if (a.startsWith('--start=')) startIdx = parseInt(a.split('=')[1], 10);
    if (a.startsWith('--end=')) endIdx = parseInt(a.split('=')[1], 10);
    if (a === '--verify') isVerify = true;
  }

  if (isVerify) {
    console.log(`=== AUDIT PROTOKOL MULTI-KARAKTER AUDIO JLPT ===`);
    let passed = 0;
    for (const item of items) {
      const turns = parseScriptToTurns(item);
      const roles = new Set(turns.map(t => t.role));
      const mp3 = path.join(OUT_DIR, `${item.id}.mp3`);
      const exists = fs.existsSync(mp3) && fs.statSync(mp3).size > 1000;
      const isMulti = roles.size >= 2;
      console.log(`[${item.id}] Turns: ${turns.length}, Roles: [${Array.from(roles).join(', ')}], File: ${exists ? 'OK' : 'MISSING'}`);
      if (isMulti && exists) passed++;
    }
    console.log(`Audit selesai: ${passed}/${items.length} mematuhi protokol multi-karakter.`);
    return;
  }

  let targets = items;
  if (singleId) {
    targets = items.filter(i => i.id === singleId);
    if (targets.length === 0) {
      console.error(`Soal dengan id ${singleId} tidak ditemukan.`);
      process.exit(1);
    }
  } else {
    targets = items.slice(startIdx, endIdx + 1);
  }

  console.log(`Memulai Chokai Multi-Voice Pipeline untuk ${targets.length} soal...`);
  const results = [];
  for (const item of targets) {
    const res = await processQuestionItem(item, true);
    if (res) results.push(res);
  }

  console.log(`\n======================================================`);
  console.log(`PIPELINE SELESAI: ${results.length}/${targets.length} audio multi-karakter berhasil di-render.`);
  console.log(`======================================================`);
}

if (process.argv[1] && process.argv[1].endsWith('pipeline-orchestrator.mjs')) {
  main().catch(err => {
    console.error('Pipeline error:', err);
    process.exit(1);
  });
}
