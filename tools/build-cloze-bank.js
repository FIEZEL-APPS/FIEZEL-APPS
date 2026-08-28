#!/usr/bin/env node
/**
 * build-cloze-bank.js — Pemilik: B7 (kurasi jawaban: SA-CLOZE, perbaikan A08/A20)
 *
 * KENAPA file ini ada:
 * Audit council (model-council-claude_fable_5.md P8, "efek testing") menunjukkan
 * recall aktif adalah pengungkit retensi terbesar yang belum dipakai FIEZEL:
 * semua latihan grammar saat ini berbentuk recognition (pilih dari opsi), padahal
 * literatur efek testing konsisten menemukan produksi/recall memberi retensi jauh
 * lebih kuat daripada sekadar mengenali jawaban. 139 template di
 * grammar-templates.json sudah punya kalimat target lengkap, jadi konversi ke
 * item cloze (isi-titik-titik tanpa opsi terlihat) sebagian besar mekanis.
 *
 * Prinsip keras: JANGAN MENGARANG KONTEN dari nol. Setiap item cloze diturunkan
 * dari kalimat target template yang sudah diaudit. Kandidat yang konversinya
 * TIDAK mekanis-aman ditolak dengan alasan tercatat:
 *   - no_blank_marker : stem tidak memuat ___
 *   - multi_blank     : stem memuat >1 ___ dengan jawaban gabungan
 *   - answer_too_short: jawaban <3 karakter (grading edit-distance tidak andal)
 *   - answer_ambiguous: jawaban muncul >1 kali di kalimat target (bocor)
 *
 * LAPISAN KURASI (perbaikan A08-F2/F3/F4/F5/F6 + A20-F1):
 * Konversi mekanis SAJA terbukti tidak adil untuk mode ketik: murid yang
 * menjawab dengan Bahasa Inggris yang BENAR (can't vs cannot, Despite vs
 * In spite of) ditandai salah, dan empat template menghasilkan item yang tidak
 * bisa dijawab sebagai isian ketik. Karena itu builder ini sekarang membawa
 * tiga blok data kurasi yang DIPERTAHANKAN di setiap regenerasi (--write):
 *
 * 1. TEMPLATE_PATCHES — patch in-memory KHUSUS JALUR CLOZE untuk 4 template
 *    yang jawabannya meta-string/'tak terjawab' sebagai isian ketik
 *    (b4_018 '[no word needed]', AR-002 '(no article)', RS-002 & QN-003 tanpa
 *    kalimat sumber). grammar-templates.json TIDAK diubah — jalur MCQ tetap
 *    memakai versi aslinya yang di sana memang sah (opsinya terlihat).
 * 2. CLOZE_CURATION[id].alternates — jawaban lain yang juga benar 100% di
 *    kalimat itu (kontraksi/bentuk penuh, modal setara, konektor setara,
 *    ejaan AmE/BrE, kata kerja lazim untuk blank verba terbuka). Diverifikasi
 *    manual per item; tidak boleh sama dengan jawaban utama maupun distraktor
 *    berlabel (dijaga assertCuration di bawah).
 * 3. explain {why, rule, memory} — Indonesia sederhana per item, diambil dari
 *    explanation.{whyCorrectId, ruleId, memoryCueId} template (join via
 *    templateId), dengan override di CLOZE_CURATION[id].explain untuk item
 *    yang ditulis ulang / teks template yang masih kaku.
 *
 * KEPUTUSAN ARSITEKTUR (dicatat untuk auditor): bank TETAP hasil generate —
 * `node tools/build-cloze-bank.js --write` selalu mereproduksi
 * cloze-bank-v1.json byte-identik, karena seluruh kurasi hidup di file ini,
 * bukan sebagai suntingan tangan pada JSON keluaran. Gate anti-drift (mode
 * default) tetap berlaku.
 *
 * HASIL DATA NYATA: 139 template -> 112 item cloze (27 ditolak, tercatat).
 * Gate MIN_ITEMS=110; JANGAN naikkan ke 200 tanpa konten baru.
 *
 * Cara pakai:
 *   node tools/build-cloze-bank.js           -> validasi file yang ada
 *   node tools/build-cloze-bank.js --write   -> regenerasi cloze-bank-v1.json
 *   node tools/build-cloze-bank.js --report  -> distribusi level + alasan tolak
 *
 * Determinisme: tanpa Math.random, tanpa Date.now; urutan item mengikuti
 * urutan template; id = templateId + '-cz' + indeks (stabil).
 *
 * Skema keluaran (kontrak lintas-agen perbaikan 2026-08-28):
 * {schema:'fiezel-cloze-bank-v1', items:[{id, templateId, skill, level,
 *  sentence(berisi ___), blank:{answer, alternates[], position},
 *  explain:{why, rule, memory},
 *  distractors:[{text, misconception, whyFailsId}]}]}
 * app.js makeClozeQuestion membaca blank.alternates (grader), explain
 * (umpan balik murid), dan whyFailsId (diagnosis Indonesia per distraktor,
 * A08-F7 — dulu terbuang di konversi sehingga revealCloze jatuh ke teks
 * generik). Label misconception tetap verbatim untuk
 * FiezelProductionGrader.matchedDistractor + FiezelMisconceptionLedger.
 */

'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var TEMPLATES_PATH = path.join(ROOT, 'grammar-templates.json');
var OUT_PATH = path.join(ROOT, 'cloze-bank-v1.json');

var SCHEMA = 'fiezel-cloze-bank-v1';
var BLANK = '___';
/* Gate berbasis data nyata: 112 item dari 139 template (lihat header). */
var MIN_ITEMS = 110;
/* Minimal level CEFR yang harus terwakili (data nyata: 6 dari 6). */
var MIN_LEVELS = 4;
var MIN_ANSWER_LEN = 3;

/* ============================================================
 * DATA KURASI (SA-CLOZE, 2026-08-28) — lihat header untuk aturan.
 * Sumber bukti: feedback-audit-08-writing.json (A08-F2..F6) +
 * feedback-redteam-20.json (A20-F1). Log lengkap:
 * fiezel-audit/repairs/repair-log-cloze.json.
 * ============================================================ */

/* Patch template KHUSUS jalur cloze (id template tetap; MCQ tidak tersentuh). */
var TEMPLATE_PATCHES = {
  "b4_018": {
    "stem": "The book ___ I borrowed from the library was due back yesterday.",
    "options": [
      "that",
      "what",
      "who"
    ],
    "correctIndex": 0,
    "distractors": [
      {
        "option": "what",
        "misconception": "Uses 'what' as a relative pronoun, a common cross-linguistic transfer error.",
        "whyFailsId": "“what” nggak bisa nempel ke kata benda kayak “the book”."
      },
      {
        "option": "who",
        "misconception": "Uses a personal relative pronoun for a non-human antecedent.",
        "whyFailsId": "“who” buat orang, padahal “the book” itu benda."
      }
    ]
  },
  "AR-002": {
    "stem": "___ elephants we saw at Ragunan Zoo yesterday were huge.",
    "options": [
      "The",
      "A",
      "An"
    ],
    "correctIndex": 0,
    "distractors": [
      {
        "option": "A",
        "misconception": "applies a singular indefinite article to a plural noun",
        "whyFailsId": "“a” buat satu benda, padahal “elephants” jamak."
      },
      {
        "option": "An",
        "misconception": "applies a singular indefinite article to a plural noun and ignores the consonant sound",
        "whyFailsId": "“an” buat satu benda bunyi vokal, padahal “elephants” jamak."
      }
    ]
  },
  "RS-002": {
    "stem": "She asked me, “Where do you live?” -> She asked me where ___.",
    "options": [
      "I lived",
      "did I live",
      "I did live",
      "lived I"
    ],
    "correctIndex": 0,
    "distractors": [
      {
        "option": "did I live",
        "misconception": "keeps the question-form inversion (auxiliary before subject) inside the reported clause",
        "whyFailsId": "masih susunan tanya, padahal laporan bentuknya pernyataan."
      },
      {
        "option": "I did live",
        "misconception": "keeps 'did' as an unnecessary emphatic auxiliary instead of a simple backshifted past verb",
        "whyFailsId": "“did” nggak dibutuhin; cukup kata kerjanya mundur jadi “lived”."
      },
      {
        "option": "lived I",
        "misconception": "produces an ungrammatical inversion not used in either direct or reported questions in this pattern",
        "whyFailsId": "susunan kebalik kayak gini nggak ada polanya di bahasa Inggris."
      }
    ]
  },
  "QN-003": {
    "stem": "Direct question: “Where is the nearest pharmacy?” -> Excuse me, could you tell me where ___?",
    "options": [
      "the nearest pharmacy is",
      "is the nearest pharmacy",
      "the nearest pharmacy was"
    ],
    "correctIndex": 0,
    "distractors": [
      {
        "option": "is the nearest pharmacy",
        "misconception": "keeps direct-question inversion (verb before subject) inside the embedded clause",
        "whyFailsId": "masih susunan tanya langsung, padahal di kalimat sopan subjek duluan."
      },
      {
        "option": "the nearest pharmacy was",
        "misconception": "unnecessarily backshifts to past tense when the pharmacy's existence is a current, general fact",
        "whyFailsId": "“was” bikin lampau, padahal letak apotek fakta sekarang."
      }
    ]
  }
};

/* Per item cloze: alternates (jawaban lain yang 100% benar) + override explain. */
var CLOZE_CURATION = {
  "TA-001-cz0": {
    "alternates": [
      "is cooking",
      "is making"
    ]
  },
  "TA-002-cz0": {
    "alternates": [
      "travelled",
      "went"
    ]
  },
  "TA-003-cz0": {
    "alternates": [
      "'ll get",
      "will answer",
      "'ll answer"
    ]
  },
  "MO-001-cz0": {
    "alternates": [
      "have to",
      "need to"
    ]
  },
  "MO-002-cz0": {
    "alternates": [
      "cannot"
    ]
  },
  "CO-001-cz0": {
    "alternates": []
  },
  "CO-002-cz0": {
    "alternates": []
  },
  "PA-001-cz0": {
    "alternates": [
      "was built"
    ]
  },
  "RS-001-cz0": {
    "alternates": []
  },
  "GI-001-cz0": {
    "alternates": [
      "to get"
    ]
  },
  "CM-001-cz0": {
    "alternates": []
  },
  "QN-001-cz0": {
    "alternates": []
  },
  "TA-004-cz0": {
    "alternates": [
      "was making",
      "was preparing",
      "was eating",
      "was having"
    ]
  },
  "TA-005-cz0": {
    "alternates": [
      "has finished",
      "has completed"
    ]
  },
  "TA-006-cz0": {
    "alternates": [
      "had given"
    ]
  },
  "TA-007-cz0": {
    "alternates": [
      "'ll be having",
      "will be eating",
      "'ll be eating"
    ]
  },
  "MO-003-cz0": {
    "alternates": [
      "managed to get"
    ]
  },
  "MO-004-cz0": {
    "alternates": [
      "must've"
    ]
  },
  "MO-005-cz0": {
    "alternates": [
      "need not",
      "don't have to",
      "don't need to"
    ]
  },
  "CO-003-cz0": {
    "alternates": [
      "'d left"
    ]
  },
  "CO-004-cz0": {
    "alternates": [
      "would not be"
    ]
  },
  "CO-005-cz0": {
    "alternates": []
  },
  "PA-002-cz0": {
    "alternates": [
      "has to be signed",
      "needs to be signed"
    ]
  },
  "PA-003-cz0": {
    "alternates": []
  },
  "RS-002-cz0": {
    "alternates": [
      "I live"
    ],
    "explain": {
      "why": "Pertanyaan langsung “Where do you live?” dilaporin jadi kayak pernyataan: “where I lived”. Kata bantu “do” hilang, subjeknya duluan.",
      "rule": "Pertanyaan yang dilaporin: kata tanya + subjek + kata kerja. Kata kerjanya biasanya mundur: “live” jadi “lived”.",
      "memory": "Pertanyaan yang dilaporin bunyinya kayak pernyataan, bukan pertanyaan."
    }
  },
  "RS-003-cz0": {
    "alternates": [
      "to stop talking and to listen"
    ]
  },
  "RS-004-cz0": {
    "alternates": [
      "proposed",
      "recommended"
    ]
  },
  "AR-002-cz0": {
    "alternates": [
      "Those"
    ],
    "explain": {
      "why": "Ada keterangan “we saw at Ragunan Zoo yesterday”, jadi gajahnya udah jelas yang mana. Benda yang udah jelas pakai “The”.",
      "rule": "“The” buat benda yang udah sama-sama diketahui. Pernyataan umum soal semua gajah malah tanpa artikel: “Elephants are big”.",
      "memory": "Udah tahu yang mana: pakai “the”. Semua secara umum: tanpa artikel."
    }
  },
  "AR-003-cz0": {
    "alternates": [
      "enough"
    ]
  },
  "GI-002-cz0": {
    "alternates": [
      "having locked"
    ]
  },
  "GI-003-cz0": {
    "alternates": [
      "in order to have",
      "so as to have"
    ]
  },
  "RC-003-cz0": {
    "alternates": []
  },
  "CM-002-cz0": {
    "alternates": [
      "as quick as"
    ]
  },
  "CM-003-cz0": {
    "alternates": [
      "increasingly busy"
    ]
  },
  "QN-002-cz0": {
    "alternates": [
      "Did"
    ]
  },
  "QN-003-cz0": {
    "alternates": [],
    "explain": {
      "why": "Di dalam “could you tell me ...”, urutannya jadi kayak pernyataan: “the nearest pharmacy is”. Nggak dibalik jadi “is the nearest pharmacy”.",
      "rule": "Pertanyaan sopan: kata tanya + subjek + kata kerja. “Is” tetap present karena letak apotek nggak berubah.",
      "memory": "Pertanyaan sopan yang nyempil: subjek dulu, kata kerja nyusul."
    }
  },
  "TA-008-cz0": {
    "alternates": [
      "was going to transform"
    ]
  },
  "TA-009-cz0": {
    "alternates": [
      "'d been studying"
    ]
  },
  "MO-006-cz0": {
    "alternates": [
      "'d better"
    ]
  },
  "MO-007-cz0": {
    "alternates": [
      "may",
      "could"
    ]
  },
  "MO-008-cz0": {
    "alternates": [
      "should not have stayed"
    ]
  },
  "CO-006-cz0": {
    "alternates": [
      "If I had",
      "If I'd"
    ]
  },
  "CO-007-cz0": {
    "alternates": [
      "would've been"
    ]
  },
  "PA-005-cz0": {
    "alternates": [
      "It is thought",
      "It is said",
      "It's believed"
    ]
  },
  "PA-006-cz0": {
    "alternates": []
  },
  "RS-005-cz0": {
    "alternates": [
      "on that day"
    ]
  },
  "AR-005-cz0": {
    "alternates": [
      "the"
    ]
  },
  "PR-004-cz0": {
    "alternates": [
      "back"
    ]
  },
  "PR-005-cz0": {
    "alternates": []
  },
  "GI-005-cz0": {
    "alternates": []
  },
  "RC-004-cz0": {
    "alternates": []
  },
  "CM-004-cz0": {
    "alternates": []
  },
  "QN-004-cz0": {
    "alternates": []
  },
  "QN-005-cz0": {
    "alternates": [
      "Nor do"
    ]
  },
  "TA-010-cz0": {
    "alternates": [
      "departs"
    ]
  },
  "b4_001-cz0": {
    "alternates": []
  },
  "b4_002-cz0": {
    "alternates": [
      "had departed",
      "had gone"
    ]
  },
  "b4_003-cz0": {
    "alternates": []
  },
  "b4_004-cz0": {
    "alternates": [
      "could've taken"
    ]
  },
  "b4_005-cz0": {
    "alternates": []
  },
  "b4_006-cz0": {
    "alternates": [
      "If I were to",
      "Should I"
    ]
  },
  "b4_007-cz0": {
    "alternates": [
      "comes",
      "gets in",
      "gets here",
      "has arrived"
    ]
  },
  "b4_008-cz0": {
    "alternates": [
      "got"
    ]
  },
  "b4_009-cz0": {
    "alternates": [
      "is thought to",
      "is said to"
    ]
  },
  "b4_011-cz0": {
    "alternates": [
      "if I had locked",
      "whether I'd locked",
      "if I'd locked",
      "whether I locked",
      "if I locked"
    ]
  },
  "b4_012-cz0": {
    "alternates": [],
    "explain": {
      "why": "Anak-anak itu pergi buat belajar, sesuai fungsi sekolahnya. Makanya “go to school” tanpa artikel."
    }
  },
  "b4_013-cz0": {
    "alternates": [
      "a friend",
      "my friend"
    ],
    "explain": {
      "why": "“A friend of mine” artinya salah satu temanku. Ini pola baku buat ngenalin satu dari beberapa teman."
    }
  },
  "b4_014-cz0": {
    "alternates": []
  },
  "b4_015-cz0": {
    "alternates": []
  },
  "b4_016-cz0": {
    "alternates": [
      "To exercise",
      "Working out"
    ]
  },
  "b4_018-cz0": {
    "alternates": [
      "which"
    ],
    "explain": {
      "why": "Kata yang hilang jadi objek dari “borrowed”: the book that I borrowed. Bendanya buku, jadi pakai “that” atau “which”, bukan “what”.",
      "rule": "Anak kalimat penjelas buat benda pakai “that” atau “which”. Kalau posisinya objek, katanya malah boleh dihilangin: “The book I borrowed” juga benar.",
      "memory": "Benda pakai “that” atau “which”. “What” nggak pernah nempel ke kata benda kayak “the book”."
    }
  },
  "b4_019-cz0": {
    "alternates": [
      "far",
      "a lot",
      "way",
      "a bit"
    ]
  },
  "b4_020-cz0": {
    "alternates": []
  },
  "b4_022-cz0": {
    "alternates": [
      "In spite of",
      "Notwithstanding"
    ]
  },
  "b4_024-cz0": {
    "alternates": [
      "It was Sarah who"
    ]
  },
  "b5_001-cz0": {
    "alternates": [
      "lived in"
    ]
  },
  "b5_002-cz0": {
    "alternates": [
      "'ve sent",
      "have written",
      "'ve written"
    ]
  },
  "b5_003-cz0": {
    "alternates": [
      "should've read",
      "ought to have read"
    ]
  },
  "b5_004-cz0": {
    "alternates": []
  },
  "b5_005-cz0": {
    "alternates": [
      "were not"
    ]
  },
  "b5_006-cz0": {
    "alternates": [
      "as long as",
      "provided",
      "providing",
      "on condition that"
    ]
  },
  "b5_007-cz0": {
    "alternates": []
  },
  "b5_008-cz0": {
    "alternates": []
  },
  "b5_010-cz0": {
    "alternates": [
      "for arriving",
      "for coming"
    ]
  },
  "b5_011-cz0": {
    "alternates": [],
    "explain": {
      "why": "Nama negaranya berbentuk jamak: “Netherlands”. Nama negara kayak gitu selalu pakai “the”."
    }
  },
  "b5_012-cz0": {
    "alternates": [
      "The two of"
    ]
  },
  "b5_015-cz0": {
    "alternates": [
      "to tell"
    ]
  },
  "b5_016-cz0": {
    "alternates": []
  },
  "b5_017-cz0": {
    "alternates": []
  },
  "b5_019-cz0": {
    "alternates": [
      "What broke"
    ]
  },
  "b5_021-cz0": {
    "alternates": [
      "so",
      "in order that"
    ]
  },
  "b5_022-cz0": {
    "alternates": [
      "Moreover",
      "In addition",
      "Additionally"
    ]
  },
  "b5_023-cz0": {
    "alternates": []
  },
  "b5_024-cz0": {
    "alternates": [
      "So great was the impact"
    ]
  },
  "A1-003-cz0": {
    "alternates": [
      "has"
    ]
  },
  "A1-004-cz0": {
    "alternates": []
  },
  "A1-005-cz0": {
    "alternates": []
  },
  "A1-006-cz0": {
    "alternates": []
  },
  "A1-007-cz0": {
    "alternates": []
  },
  "C2-002-cz0": {
    "alternates": []
  },
  "C2-003-cz0": {
    "alternates": []
  },
  "C2-004-cz0": {
    "alternates": []
  },
  "C2-005-cz0": {
    "alternates": []
  },
  "C2-006-cz0": {
    "alternates": [
      "After reviewing",
      "After having reviewed"
    ]
  },
  "C2-007-cz0": {
    "alternates": []
  },
  "A1-009-cz0": {
    "alternates": []
  },
  "A1-010-cz0": {
    "alternates": []
  },
  "A1-011-cz0": {
    "alternates": []
  },
  "A1-014-cz0": {
    "alternates": [
      "is making",
      "is preparing",
      "is eating",
      "is having"
    ]
  },
  "A1-015-cz0": {
    "alternates": []
  },
  "A1-016-cz0": {
    "alternates": [
      "much"
    ]
  },
  "A1-017-cz0": {
    "alternates": [
      "My",
      "His"
    ]
  }
};

/* Escape string untuk dipakai literal di dalam RegExp. */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Hitung berapa kali `phrase` muncul sebagai token/frasa UTUH di `text`
 * (case-insensitive). Batas kata = non-huruf, supaya "no" tidak tertangkap
 * di dalam "nothing" tetapi "don't" tetap cocok utuh (apostrof bagian frasa).
 * Case-insensitive DISENGAJA: "The" di awal kalimat tetap bocoran untuk
 * blank "the" di tengah kalimat.
 */
function wholePhraseCount(text, phrase) {
  var re = new RegExp('(^|[^A-Za-z])' + escapeRegExp(phrase) + '([^A-Za-z]|$)', 'gi');
  var count = 0;
  var m;
  while ((m = re.exec(text)) !== null) {
    count++;
    /* Mundur satu karakter supaya kemunculan yang bersebelahan
     * ("the the") tidak lolos karena boundary character terkonsumsi. */
    re.lastIndex = m.index + 1;
  }
  return count;
}

/* Normalisasi ringan untuk perbandingan alternates vs jawaban/distraktor. */
function normLite(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Penjaga kurasi: alternates tidak boleh kosong-string, tidak boleh sama
 * dengan jawaban utama, dan tidak boleh sama dengan distraktor berlabel
 * (alternate yang = miskonsepsi berlabel akan MENERIMA jawaban yang justru
 * ingin dideteksi salah — dilarang keras, A08-F1). explain wajib terisi tiga
 * bidang non-kosong dan tidak boleh menyalin mentah jawaban sebagai "aturan".
 */
function assertCuration(item) {
  var ans = normLite(item.blank.answer);
  var disSet = {};
  item.distractors.forEach(function (d) { disSet[normLite(d.text)] = true; });
  item.blank.alternates.forEach(function (alt) {
    var n = normLite(alt);
    if (!n) throw new Error(item.id + ': alternate kosong');
    if (n === ans) throw new Error(item.id + ': alternate "' + alt + '" sama dengan jawaban utama');
    if (disSet[n]) throw new Error(item.id + ': alternate "' + alt + '" sama dengan distraktor berlabel');
  });
  var seen = {};
  item.blank.alternates.forEach(function (alt) {
    var n = normLite(alt);
    if (seen[n]) throw new Error(item.id + ': alternate duplikat "' + alt + '"');
    seen[n] = true;
  });
  ['why', 'rule', 'memory'].forEach(function (k) {
    var v = item.explain && item.explain[k];
    if (typeof v !== 'string' || !v.trim()) throw new Error(item.id + ': explain.' + k + ' kosong');
  });
}

/**
 * Konversi satu template menjadi kandidat item cloze, atau tolakan beralasan.
 * Return {item} bila lolos, {reject:{templateId, reason, detail}} bila tidak.
 * Murni: tidak menyentuh disk, tidak ada waktu, tidak ada random.
 */
function convertTemplate(tpl) {
  var answer = tpl.options[tpl.correctIndex];

  if (typeof tpl.stem !== 'string' || tpl.stem.indexOf(BLANK) === -1) {
    return { reject: { templateId: tpl.id, reason: 'no_blank_marker',
      detail: 'stem tidak memuat ___ — jawaban template bukan token/frasa di dalam kalimat target' } };
  }
  var markerCount = tpl.stem.split(BLANK).length - 1;
  if (markerCount > 1) {
    return { reject: { templateId: tpl.id, reason: 'multi_blank',
      detail: 'stem memuat ' + markerCount + ' blank dengan jawaban gabungan "' + answer + '" — pemecahan per posisi tidak mekanis' } };
  }
  if (typeof answer !== 'string' || answer.trim().length < MIN_ANSWER_LEN) {
    return { reject: { templateId: tpl.id, reason: 'answer_too_short',
      detail: 'jawaban "' + answer + '" <' + MIN_ANSWER_LEN + ' karakter — grading edit-distance tidak andal' } };
  }

  /* Kalimat target = stem dengan jawaban benar diisikan. Item cloze valid
   * hanya bila jawaban muncul TEPAT SEKALI sebagai frasa utuh di kalimat
   * target: >1 berarti sisa kemunculan di kalimat ber-blank membocorkan
   * jawaban (mis. "The ... the" untuk blank "the"). */
  var target = tpl.stem.replace(BLANK, answer);
  var occurrences = wholePhraseCount(target, answer);
  if (occurrences !== 1) {
    return { reject: { templateId: tpl.id, reason: 'answer_ambiguous',
      detail: 'jawaban "' + answer + '" muncul ' + occurrences + 'x sebagai frasa utuh di kalimat target' } };
  }

  var id = tpl.id + '-cz0';
  var cur = CLOZE_CURATION[id] || {};

  /* alternates: dulu selalu kosong "berdasarkan data" — audit A08-F4/A20-F1
   * membuktikan pembenaran itu keliru: datanya hanya menjamin semua OPSI
   * non-benar berlabel distraktor, bukan bahwa tidak ada jawaban sah lain di
   * luar daftar opsi. Sekarang alternates diisi dari kurasi manual per item
   * (verifikasi bahasa oleh SA-CLOZE) dan dijaga assertCuration. */
  var alternates = Array.isArray(cur.alternates) ? cur.alternates.slice() : [];

  /* explain: diambil dari penjelasan Indonesia template (join templateId),
   * lalu boleh dioverride per bidang lewat kurasi (A08-F6: jangan buang
   * penjelasan kaya milik template, jangan fabrikasi teks sirkular). */
  var ex = tpl.explanation || {};
  var ov = cur.explain || {};
  var explain = {
    why: String(ov.why || ex.whyCorrectId || '').trim(),
    rule: String(ov.rule || ex.ruleId || '').trim(),
    memory: String(ov.memory || ex.memoryCueId || '').trim()
  };

  return {
    item: {
      /* Indeks -cz0 dipertahankan meski saat ini 1 item/template, supaya id
       * tetap stabil kalau kelak satu template sah menghasilkan >1 cloze. */
      id: id,
      templateId: tpl.id,
      skill: tpl.subskill,
      level: tpl.cefr,
      sentence: tpl.stem,
      blank: {
        answer: answer,
        alternates: alternates,
        position: tpl.stem.indexOf(BLANK)
      },
      explain: explain,
      distractors: tpl.distractors.map(function (d) {
        /* whyFailsId = diagnosis Indonesia kasual per distraktor (ada di semua
         * 139 template + patch). app.js menampilkannya di revealCloze (A08-F7). */
        return { text: d.option, misconception: d.misconception, whyFailsId: String(d.whyFailsId || '') };
      })
    }
  };
}

/**
 * Bangun bank cloze lengkap dari daftar template. Deterministik penuh.
 * Return {bank, rejected} — rejected disimpan di dalam bank (meta) supaya
 * alasan tolak ikut terdokumentasi di artefak, bukan hanya di log.
 */
function build(templates) {
  var items = [];
  var rejected = [];
  templates.forEach(function (tpl) {
    var r = convertTemplate(tpl);
    if (r.item) { assertCuration(r.item); items.push(r.item); }
    else rejected.push(r.reject);
  });

  var byLevel = {};
  items.forEach(function (it) { byLevel[it.level] = (byLevel[it.level] || 0) + 1; });

  var bank = {
    schema: SCHEMA,
    generatedFrom: 'grammar-templates.json',
    counts: {
      templates: templates.length,
      items: items.length,
      rejected: rejected.length,
      byLevel: byLevel
    },
    rejected: rejected,
    items: items
  };
  return bank;
}

/**
 * Muat template + terapkan TEMPLATE_PATCHES (in-memory, khusus jalur cloze).
 * grammar-templates.json di disk tidak pernah ditulis dari sini.
 */
function loadTemplates() {
  var raw = JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf8'));
  return raw.templates.map(function (t) {
    var p = TEMPLATE_PATCHES[t.id];
    if (!p) return t;
    var patched = {};
    Object.keys(t).forEach(function (k) { patched[k] = t[k]; });
    Object.keys(p).forEach(function (k) { patched[k] = p[k]; });
    return patched;
  });
}

function serialize(bank) {
  return JSON.stringify(bank, null, 2) + '\n';
}

function report(bank) {
  console.log('Cloze bank: ' + bank.counts.items + ' item dari ' + bank.counts.templates + ' template');
  console.log('Per level:', JSON.stringify(bank.counts.byLevel));
  var withAlt = bank.items.filter(function (it) { return it.blank.alternates.length > 0; }).length;
  console.log('Item dengan alternates: ' + withAlt + '; item dengan explain: ' +
    bank.items.filter(function (it) { return it.explain && it.explain.why; }).length);
  var reasons = {};
  bank.rejected.forEach(function (r) { reasons[r.reason] = (reasons[r.reason] || 0) + 1; });
  console.log('Ditolak (' + bank.rejected.length + '):', JSON.stringify(reasons));
  bank.rejected.forEach(function (r) {
    console.log('  - ' + r.templateId + ' [' + r.reason + '] ' + r.detail);
  });
}

function main() {
  var args = process.argv.slice(2);
  var bank = build(loadTemplates());

  if (args.indexOf('--report') !== -1) {
    report(bank);
    return 0;
  }
  if (args.indexOf('--write') !== -1) {
    fs.writeFileSync(OUT_PATH, serialize(bank));
    console.log('Ditulis: ' + OUT_PATH + ' (' + bank.counts.items + ' item)');
    return 0;
  }
  /* Mode default: validasi file yang ada harus identik dengan hasil rebuild.
   * Ini gate anti-drift: kalau grammar-templates.json ATAU kurasi di file ini
   * berubah tanpa regenerasi bank, validasi gagal keras. */
  if (!fs.existsSync(OUT_PATH)) {
    console.error('GAGAL: ' + OUT_PATH + ' belum ada. Jalankan dengan --write.');
    return 1;
  }
  var existing = fs.readFileSync(OUT_PATH, 'utf8');
  if (existing !== serialize(bank)) {
    console.error('GAGAL: cloze-bank-v1.json tidak sinkron dengan grammar-templates.json + kurasi. Jalankan --write.');
    return 1;
  }
  if (bank.counts.items < MIN_ITEMS) {
    console.error('GAGAL: item ' + bank.counts.items + ' < gate ' + MIN_ITEMS);
    return 1;
  }
  console.log('OK: cloze-bank-v1.json valid, ' + bank.counts.items + ' item, sinkron dengan template + kurasi.');
  return 0;
}

module.exports = {
  SCHEMA: SCHEMA,
  MIN_ITEMS: MIN_ITEMS,
  MIN_LEVELS: MIN_LEVELS,
  MIN_ANSWER_LEN: MIN_ANSWER_LEN,
  TEMPLATE_PATCHES: TEMPLATE_PATCHES,
  CLOZE_CURATION: CLOZE_CURATION,
  build: build,
  convertTemplate: convertTemplate,
  loadTemplates: loadTemplates,
  serialize: serialize,
  wholePhraseCount: wholePhraseCount,
  OUT_PATH: OUT_PATH
};

if (require.main === module) {
  process.exit(main());
}
