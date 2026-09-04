#!/usr/bin/env node
/**
 * m025-125 — terjemahan lengkap listening bank.
 *
 * Script yang lebih agresif untuk menerjemahkan questions dan options
 * dengan pola-pola umum dalam listening comprehension.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BANK = path.join(ROOT, 'features/speaking-listening/listening-bank-v1.json');

const data = JSON.parse(fs.readFileSync(BANK, 'utf8'));

// Terjemahan pola pertanyaan (urutkan dari panjang terpanjang)
const Q_PATTERNS = [
  // Question starters
  ["What will ^X probably do next?", "Apa yang mungkin ^X lakukan selanjutnya?"],
  ["What will ^X probably do?", "Apa yang mungkin ^X lakukan?"],
  ["What will ^X do?", "Apa yang akan ^X lakukan?"],
  ["What did ^X do?", "Apa yang ^X lakukan?"],
  ["What does ^X do?", "Apa yang ^X lakukan?"],
  ["What is ^X doing?", "Apa yang sedang ^X lakukan?"],
  ["What does ^X want?", "Apa yang ^X inginkan?"],
  ["What does ^X need?", "Apa yang ^X butuhkan?"],
  ["Where is", "Di mana"],
  ["Where does", "Di mana"],
  ["Where did", "Di mana"],
  ["Where will", "Di mana"],
  ["Why does", "Mengapa"],
  ["Why did", "Mengapa"],
  ["Why will", "Mengapa"],
  ["How does", "Bagaimana"],
  ["How did", "Bagaimana"],
  ["How will", "Bagaimana"],
  ["How late", "Berapa lama terlambat"],
  ["How long", "Berapa lama"],
  ["When does", "Kapan"],
  ["When did", "Kapan"],
  ["When will", "Kapan"],
  ["Which", "Mana"],
  ["What is Fajar", "Apa yang Fajar"],
  ["What is", "Apa itu"],
  ["What are", "Apa itu"],
  ["What was", "Apa itu"],
  ["What time", "Jam berapa"],
];

// Vocabulary terjemahan
const VOCAB_TRANS = {
  // Names/subjects (keep as-is but note)
  "Fajar's": "Fajar",
  "Dewi's": "Dewi",
  "Bayu's": "Bayu",
  "her": "dia",
  "his": "dia",
  "their": "mereka",

  // Common verbs/concepts
  "probably": "mungkin",
  "do next": "lakukan selanjutnya",
  "do": "lakukan",
  "feel": "rasakan",
  "feels": "merasa",
  "feeling": "perasaan",
  "now": "sekarang",
  "later": "nanti",
  "after": "setelah",
  "before": "sebelum",
  "because": "karena",
  "will": "akan",
  "does": " ",  // helper
  "did": " ",   // helper
  "is": "adalah",
  "are": " ",   // helper
  "was": "adalah",
  "were": " ",  // helper

  // Nouns
  "umbrella": "payung",
  "payung": "payung",  // already translated
  "school": "sekolah",
  "sekolah": "sekolah",  // already translated
  "kitchen": "dapur",
  "table": "meja",
  "gate": "gerbang",
  "kitchen table": "meja dapur",
  "school gate": "pintu gerbang sekolah",
  "brother": "kakak laki-laki",
  "mother": "ibu",
  "bus": "bus",
  "time": "waktu",
  "homework": "pekerjaan rumah",
  "work": "pekerjaan",
  "cook": "memasak",
  "cooking": "memasak",
};

function translateQuestion(q) {
  let result = String(q);

  // Ganti pola pertanyaan
  for (const [pattern, trans] of Q_PATTERNS) {
    if (pattern.startsWith("/")) continue;  // skip regex patterns for now
    const rx = new RegExp(pattern.replace(/\^X/g, "[A-Za-z]+"), "i");
    if (rx.test(result)) {
      // Simple replacement for now
      result = result.replace(pattern.replace(/\?.*/, ""), trans);
      break;
    }
  }

  // Ganti vocabulary
  for (const [en, id] of Object.entries(VOCAB_TRANS)) {
    if (id.trim().length < 2) continue;  // skip helpers
    const rx = new RegExp("\\b" + en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi");
    result = result.replace(rx, id);
  }

  return result;
}

function translateOption(opt) {
  let result = String(opt);

  // Ganti vocabulary yang paling sering
  const common = [
    ["umbrella", "payung"],
    ["school", "sekolah"],
    ["kitchen table", "meja dapur"],
    ["probably", "mungkin"],
    ["do next", "lakukan selanjutnya"],
    ["home", "rumah"],
    ["time", "waktu"],
    ["brother", "kakak laki-laki"],
    ["mother", "ibu"],
    ["cooking", "memasak"],
    ["cook", "memasak"],
    ["feel", "rasakan"],
    ["feels", "merasa"],
  ];

  for (const [en, id] of common) {
    const rx = new RegExp("\\b" + en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi");
    result = result.replace(rx, id);
  }

  return result;
}

let qPatched = 0, oPatched = 0;

for (const item of data.items) {
  // Terjemahkan question
  const newQ = translateQuestion(item.question || "");
  if (newQ !== item.question && /[a-z]/.test(newQ)) {
    item.question = newQ;
    qPatched++;
  }

  // Terjemahkan options
  if (item.options && Array.isArray(item.options)) {
    for (let i = 0; i < item.options.length; i++) {
      const newOpt = translateOption(item.options[i]);
      if (newOpt !== item.options[i]) {
        item.options[i] = newOpt;
        oPatched++;
      }
    }
  }
}

fs.writeFileSync(BANK, JSON.stringify(data, null, 2) + '\n');
console.log('Terjemahan listening:');
console.log('- Questions diterjemahkan:', qPatched);
console.log('- Options diterjemahkan:', oPatched);
