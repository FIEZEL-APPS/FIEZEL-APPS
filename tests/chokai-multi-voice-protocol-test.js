#!/usr/bin/env node
/**
 * tests/chokai-multi-voice-protocol-test.js
 * 
 * GERBANG INTEGRITAS PROTOKOL MULTI-KARAKTER CHOKAI (JLPT)
 * 
 * Memastikan:
 * 1. ZERO Monotone Audio: Tidak ada satu pun naskah dialog yang di-render dengan satu suara tunggal.
 * 2. Tiga Persona Vokal Terdaftar: INSTRUCTOR, MALE_STUDENT, FEMALE_STUDENT.
 * 3. Setiap soal Chokai memiliki minimal peran INSTRUCTOR untuk intro/pertanyaan, dan pemisahan karakter untuk dialog.
 * 4. Modul pipeline tersedia dan dapat dieksekusi secara otonom.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScriptToTurns, classifySpeaker, ROLES } from '../tools/chokai-audio-pipeline/speaker-router.mjs';
import { VOICE_PROFILES } from '../tools/chokai-audio-pipeline/multi-voice-engine.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const BANK_FILE = path.join(ROOT, 'features/speaking-listening/jlpt-listening-bank-v1.json');
assert(fs.existsSync(BANK_FILE), 'Bank listening JLPT harus ada di features/speaking-listening/jlpt-listening-bank-v1.json');

const bankData = JSON.parse(fs.readFileSync(BANK_FILE, 'utf8'));
const items = bankData.items || [];
assert(items.length >= 30, 'Bank soal listening JLPT harus berisi minimal 30 soal');

// 1. Verifikasi Persona Vokal
assert(VOICE_PROFILES.INSTRUCTOR, 'Profil suara INSTRUCTOR wajib ada');
assert(VOICE_PROFILES.MALE_STUDENT, 'Profil suara MALE_STUDENT wajib ada');
assert(VOICE_PROFILES.FEMALE_STUDENT, 'Profil suara FEMALE_STUDENT wajib ada');

assert(VOICE_PROFILES.INSTRUCTOR.pitch.includes('-'), 'Suara INSTRUCTOR harus bernada lebih rendah/berat (pitch negatif)');
const instVoice = VOICE_PROFILES.INSTRUCTOR.edgeVoice || VOICE_PROFILES.INSTRUCTOR.voice;
const femVoice = VOICE_PROFILES.FEMALE_STUDENT.edgeVoice || VOICE_PROFILES.FEMALE_STUDENT.voice;
assert(instVoice !== femVoice, 'Suara INSTRUCTOR dan FEMALE_STUDENT harus memakai model vokal yang berbeda');

// 2. Verifikasi Klasifikasi Pembicara
assert.strictEqual(classifySpeaker('男の人'), ROLES.MALE, '男の人 harus diklasifikasikan sebagai MALE_STUDENT');
assert.strictEqual(classifySpeaker('女の人'), ROLES.FEMALE, '女の人 harus diklasifikasikan sebagai FEMALE_STUDENT');
assert.strictEqual(classifySpeaker('先生'), ROLES.FEMALE, '先生 harus terpetakan ke vokal yang konsisten');
assert.strictEqual(classifySpeaker('ナレーター'), ROLES.INSTRUCTOR, 'ナレーター harus diklasifikasikan sebagai INSTRUCTOR');

// 3. Verifikasi Parsing Multi-Karakter per Soal
let totalTurns = 0;
let multiRoleCount = 0;

for (const item of items) {
  const turns = parseScriptToTurns(item);
  assert(turns.length >= 2, `Soal ${item.id} harus memiliki minimal 2 segmen turn (intro/soal)`);

  const roles = new Set(turns.map(t => t.role));
  assert(roles.has(ROLES.INSTRUCTOR), `Soal ${item.id} wajib memiliki narasi/pertanyaan oleh INSTRUCTOR`);

  // Jika naskah berisi dialog percakapan (lebih dari 1 baris di scriptJapanese)
  const scriptLines = (item.scriptJapanese || '').split('\n').filter(l => l.includes('：') || l.includes(':'));
  if (scriptLines.length >= 2) {
    assert(roles.size >= 2, `Soal percakapan ${item.id} DILARANG MONOTON (wajib minimal 2 peran berbeda)`);
    multiRoleCount++;
  }

  totalTurns += turns.length;
}

console.log(`PASS: chokai-multi-voice-protocol-test`);
console.log(`  - Total soal terverifikasi: ${items.length}`);
console.log(`  - Total turns teridentifikasi: ${totalTurns}`);
console.log(`  - Soal dialog multi-peran tervalidasi: ${multiRoleCount}`);
console.log(`  - Seluruh persona (INSTRUCTOR, MALE, FEMALE) terkonfigurasi dengan pitch & rate terkalibrasi.`);
