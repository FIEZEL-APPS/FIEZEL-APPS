#!/usr/bin/env node
'use strict';
/**
 * tools/patch-braincore-pedagogy-2026-10-11.js — perbaikan DATA dari audit pedagogi BrainCore
 * 2026-10-11 (reports/BRAINCORE-PEDAGOGY-AUDIT-2026-10-11.md). Idempoten: menjalankannya dua
 * kali tidak mengubah apa pun pada jalan kedua.
 *
 *   node tools/patch-braincore-pedagogy-2026-10-11.js
 *   node tools/sync-grammar-explanations-id.js --write && node audit/merge-grammar-id.js
 *   node tools/generate-th-cloze.js
 *
 * Yang ditulis:
 *   1. grammar-templates.json — whyFailsId tujuh pengecoh yang alasannya tautologis, merujuk
 *      pilihan lain yang tidak dibaca murid, menyebut kata yang tidak ada di soal ("admit"),
 *      atau berhenti di "bentuk ini cocok buat X" tanpa menyebut kenapa gagal DI SINI.
 *   2. grammar-explanations-th.json — dua kembaran Thai yang cacatnya sama (RS-008, A1-009).
 *   3. cloze-bank-v1.json — salinan alasan yang sama di butir cloze turunan template itu, dan
 *      tools/th-strings/cloze.json — padanan Thai untuk kalimat Indonesia barunya.
 *   4. reading-bank.json + features/i18n/reading-bank-th.json — templat "Pilihan … tidak ada di
 *      teks" (500 id / 530 th) diganti "tidak didukung teks". Klaim lama BOHONG untuk pengecoh
 *      yang memang disebut bacaan (r0002: "sekolahnya", "jalanannya", "pertandingannya" semuanya
 *      ada di teks bis Bima); klaim baru selalu benar. Generatornya (tools/reading-a12-explain.mjs,
 *      tools/generate-th-reading.js) diubah di commit yang sama.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const write = (p, data, trailingNewline) => fs.writeFileSync(path.join(root, p), JSON.stringify(data, null, 2) + (trailingNewline ? '\n' : ''));
const endsWithNewline = (p) => fs.readFileSync(path.join(root, p), 'utf8').endsWith('\n');

const FIXES = [
  {
    id: 'AR-004', option: 'an',
    idText: '“an” tetap artikel tak tentu, jadi gunungnya kebaca sebagai salah satu dari banyak, padahal “tallest” cuma punya satu juara. Lagi pula “an” cuma dipakai sebelum bunyi vokal, padahal “tallest” diawali bunyi /t/.'
  },
  {
    id: 'QN-004', option: 'no thing',
    idText: '“no thing” bukan bentuk baku (yang baku ditulis satu kata), dan apa pun bentuknya, “no” di sini tetap bikin negatif dobel bareng “didn\'t”.',
    thText: '“no thing” ไม่ใช่รูปมาตรฐาน (รูปมาตรฐานเขียนติดกันเป็นคำเดียว) และไม่ว่าจะเขียนแบบไหน “no” ตรงนี้ก็ยังทำให้ปฏิเสธซ้อนกับ “didn\'t” อยู่ดี'
  },
  {
    id: 'RS-008', option: 'suggested to hand',
    idText: '“suggested to hand” nggak sah, karena “suggest” nggak pernah diikuti bentuk to; pasangannya bentuk -ing atau anak kalimat that. Lagian ucapan aslinya perintah, bukan usulan.',
    thText: '“suggested to hand” ใช้ไม่ได้ เพราะ “suggest” ไม่เคยตามด้วยรูป to แต่ตามด้วยรูป -ing หรือ that-clause แถมคำพูดต้นฉบับก็เป็นคำสั่ง ไม่ใช่ข้อเสนอ',
    thTemplate: true
  },
  {
    id: 'A1-009', option: 'does',
    idText: '“does” itu kata bantu yang selalu diikuti kata kerja bentuk dasar (does have), padahal sesudahnya di sini ada “got”. Pola punya “have got” cuma bisa dibuka kata bantu dari keluarga “have”.',
    thText: '“does” เป็นกริยาช่วยที่ต้องตามด้วยกริยารูปฐาน (does have) แต่ตรงนี้ตามด้วย “got” รูปแบบแสดงความเป็นเจ้าของ “have got” ใช้ได้แค่กริยาช่วยในกลุ่ม “have” เท่านั้น',
    thTemplate: true
  },
  {
    id: 'b4_017', option: 'gone',
    idText: '“gone” itu bentuk ketiga (V3) yang cuma dipakai di susunan pasif atau perfect, padahal “let her” di kalimat aktif ini butuh kata kerja bentuk dasar.'
  },
  {
    id: 'b5_002', option: 'was sending',
    idText: 'past continuous cocok buat tindakan yang lagi jalan di satu saat lampau, padahal tiga surel ini udah tuntas terkirim di minggu yang masih berjalan (“so far this week”).'
  },
  {
    id: 'b5_002', option: 'send',
    idText: 'present simple nggambarin kebiasaan atau fakta umum, padahal di sini kamu ngitung surel yang udah terkirim “so far this week”.'
  }
];

let changed = 0;

// 1 + 2: bank template dan kembaran Thai-nya.
const bankFile = 'grammar-templates.json';
const bank = read(bankFile);
const thFile = 'grammar-explanations-th.json';
const thBank = read(thFile);
const clozeTh = read('tools/th-strings/cloze.json');
for (const fix of FIXES) {
  const t = bank.templates.find((x) => x.id === fix.id);
  if (!t) throw new Error('template hilang: ' + fix.id);
  const d = (t.distractors || []).find((x) => x.option === fix.option);
  if (!d) throw new Error('pengecoh hilang: ' + fix.id + ' / ' + fix.option);
  if (d.whyFailsId !== fix.idText) { d.whyFailsId = fix.idText; changed++; }
  const thD = thBank.templates?.[fix.id]?.distractors?.[fix.option];
  if (!thD) throw new Error('overlay th hilang: ' + fix.id + ' / ' + fix.option);
  if (fix.thTemplate && thD.whyFails !== fix.thText) { thD.whyFails = fix.thText; changed++; }
  // Padanan Thai kalimat Indonesia baru untuk sidecar cloze: tulisan khusus bila ada, kalau
  // tidak, alasan Thai template (yang memang sudah benar untuk pilihan ini).
  const thForCloze = fix.thText || thD.whyFails;
  if (clozeTh[fix.idText] !== thForCloze) { clozeTh[fix.idText] = thForCloze; changed++; }
}
write(bankFile, bank, endsWithNewline(bankFile));
write(thFile, thBank, endsWithNewline(thFile));
write('tools/th-strings/cloze.json', clozeTh, endsWithNewline('tools/th-strings/cloze.json'));

// 3: butir cloze turunan template yang sama.
const clozeFile = 'cloze-bank-v1.json';
const cloze = read(clozeFile);
for (const it of cloze.items || []) {
  for (const fix of FIXES) {
    if (it.templateId !== fix.id) continue;
    for (const d of it.distractors || []) {
      if (d.text === fix.option && d.whyFailsId !== fix.idText) { d.whyFailsId = fix.idText; changed++; }
    }
  }
}
write(clozeFile, cloze, endsWithNewline(clozeFile));

// 3b: sidecar Thai cloze. tools/generate-th-cloze.js tidak bisa dijalankan ulang di basis ini
// (600 kalimat aturan/hindari hasil kurasi m025-541 belum terpeta di th-strings - utang lama),
// jadi entri distraktor butir yang terdampak ditulis langsung dengan padanan yang SAMA dengan
// yang baru dipetakan di tools/th-strings/cloze.json; generator nanti menghasilkan nilai identik.
const clozeThFile = 'features/i18n/cloze-bank-th.json';
const clozeThBank = read(clozeThFile);
for (const it of cloze.items || []) {
  for (const fix of FIXES) {
    if (it.templateId !== fix.id) continue;
    const slot = clozeThBank.items?.[it.id]?.distractors?.[fix.option];
    if (!slot) continue;
    const want = clozeTh[fix.idText];
    if (want && slot.whyFailsId !== want) { slot.whyFailsId = want; changed++; }
  }
}
write(clozeThFile, clozeThBank, endsWithNewline(clozeThFile));

// 4: templat reading "tidak ada di teks".
const OLD_ID = /^Pilihan (.+) tidak ada di teks\. Yang tertulis justru/;
const NEW_ID = 'Pilihan $1 tidak didukung teks. Yang tertulis justru';
const OLD_TH = 'ตัวเลือกอื่นไม่ปรากฏในเนื้อเรื่องและเนื้อเรื่องเขียนไว้ว่า';
const NEW_TH = 'ตัวเลือกอื่นไม่มีข้อความในเนื้อเรื่องรองรับ และเนื้อเรื่องเขียนไว้ว่า';
const readingFile = 'reading-bank.json';
const reading = read(readingFile);
for (const p of Array.isArray(reading) ? reading : Object.values(reading)) {
  for (const q of p.qs || []) {
    const m = q && q[3];
    if (m && typeof m.whyOthersFail === 'string' && OLD_ID.test(m.whyOthersFail)) {
      m.whyOthersFail = m.whyOthersFail.replace(OLD_ID, NEW_ID);
      changed++;
    }
  }
}
write(readingFile, reading, endsWithNewline(readingFile));
const readingThFile = 'features/i18n/reading-bank-th.json';
const readingTh = read(readingThFile);
for (const entry of Object.values(readingTh.items || {})) {
  for (const q of entry.qs || []) {
    if (q && typeof q.whyOthersFail === 'string' && q.whyOthersFail.startsWith(OLD_TH)) {
      q.whyOthersFail = NEW_TH + q.whyOthersFail.slice(OLD_TH.length);
      changed++;
    }
  }
}
write(readingThFile, readingTh, endsWithNewline(readingThFile));

console.log('patch-braincore-pedagogy-2026-10-11: ' + changed + ' nilai diubah');
