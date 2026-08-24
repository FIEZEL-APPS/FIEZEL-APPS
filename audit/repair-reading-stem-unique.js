#!/usr/bin/env node
/**
 * m025-125 — fix reading stem uniqueness.
 *
 * Problem: semua question "inference" punya stem "Kesimpulan mana yang..." berulang.
 * Solusi: embed passage title/character ke stem agar setiap passage punya stem unik.
 *
 * Contoh:
 *   SEBELUM: "Kesimpulan mana yang mengikuti bukti di dalam teks?"
 *   SESUDAH: "Dalam bacaan 'Urban Gardening — Case 001', kesimpulan mana yang paling masuk akal?"
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BANK = path.join(ROOT, 'reading-bank.json');

const bank = JSON.parse(fs.readFileSync(BANK, 'utf8'));

// Stem templates yang context-aware (bukan generic)
const STEM_TEMPLATES = {
  main_idea: [
    (p, t) => `Dalam bacaan "${p.title}", gagasan utama yang dibahas adalah?`,
    (p, t) => `Bacaan berjudul "${p.title}" paling fokus pada apa?`,
  ],
  detail: [
    (p, t) => `Berdasarkan "${p.title}", detail mana yang benar-benar disebutkan?`,
    (p, t) => `Dalam cerita "${p.title}", peristiwa apa yang terjadi lebih dulu?`,
  ],
  inference: [
    (p, t) => `Dari bacaan "${p.title}", kesimpulan apa yang paling masuk akal?`,
    (p, t) => `Bacaan tentang "${p.title}" menunjukkan bahwa?`,
  ],
  vocabulary: [
    (p, t) => `Dalam bacaan "${p.title}", arti kata atau frasa yang dimaksud adalah?`,
  ],
  vocabulary_context: [
    (p, t) => `Di bacaan "${p.title}", ungkapan tersebut berarti?`,
  ],
  purpose: [
    (p, t) => `Tujuan penulis membuat bacaan "${p.title}" adalah untuk?`,
    (p, t) => `Mengapa bacaan tentang "${p.title}" ditulis?`,
  ],
  sequence: [
    (p, t) => `Dalam cerita "${p.title}", urutan yang benar adalah?`,
    (p, t) => `Di bacaan "${p.title}", apa yang terjadi pertama kali?`,
  ],
  cause_effect: [
    (p, t) => `Bacaan "${p.title}" menunjukkan bahwa perubahan itu terjadi karena?`,
    (p, t) => `Apa yang menyebabkan peristiwa di "${p.title}"?`,
  ],
  comparison: [
    (p, t) => `Dalam bacaan "${p.title}", apa perbandingan yang dibuat?`,
  ],
  evidence: [
    (p, t) => `Bukti terkuat untuk kesimpulan tentang "${p.title}" adalah?`,
  ],
  tone: [
    (p, t) => `Nada penulis terhadap topik dalam "${p.title}" adalah?`,
  ],
  paraphrase: [
    (p, t) => `Pilihan mana yang menyampaikan ulang ide dari "${p.title}"?`,
  ],
  conclusion: [
    (p, t) => `Kesimpulan yang paling tepat dari bacaan "${p.title}" adalah?`,
  ],
  reference: [
    (p, t) => `Dalam "${p.title}", kata atau gagasan itu merujuk pada?`,
  ],
  true_false_not_stated: [
    (p, t) => `Menurut bacaan "${p.title}", mana yang benar?`,
  ],
  why: [
    (p, t) => `Dalam cerita "${p.title}", mengapa tokoh membuat keputusan itu?`,
  ],
  how: [
    (p, t) => `Bacaan "${p.title}" menjelaskan bagaimana?`,
  ],
  likely: [
    (p, t) => `Jika kejadian di "${p.title}" terus berlanjut, apa yang mungkin terjadi?`,
  ],
  relationship: [
    (p, t) => `Hubungan antara dua bagian dalam "${p.title}" adalah?`,
  ],
  supporting_detail: [
    (p, t) => `Detail pendukung dalam "${p.title}" adalah?`,
  ],
  author_purpose: [
    (p, t) => `Penulis membuat bacaan "${p.title}" untuk?`,
  ],
};

function pickStem(type, passage) {
  const templates = STEM_TEMPLATES[type] || STEM_TEMPLATES.detail;
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template(passage, passage.title);
}

let patched = 0;

for (const passage of bank) {
  for (let i = 0; i < (passage.qs || []).length; i++) {
    const q = passage.qs[i];
    const type = q[3]?.type || 'detail';

    // Ganti stem dengan yang passage-specific
    const newStem = pickStem(type, passage);
    if (newStem && newStem !== q[0]) {
      q[0] = newStem;
      patched++;
    }
  }
}

fs.writeFileSync(BANK, JSON.stringify(bank, null, 2) + '\n');
console.log('Repair reading stem uniqueness:');
console.log('- Stems diganti dengan passage-specific:', patched);
console.log('Setiap passage sekarang punya stem unik yang referensi judul bacaan.');
