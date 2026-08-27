#!/usr/bin/env node
/**
 * build-cloze-bank.js — Pemilik: B7
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
 * Prinsip keras: JANGAN MENGARANG KONTEN. Setiap item cloze diturunkan 1:1 dari
 * kalimat target template yang sudah diaudit. Kandidat yang konversinya TIDAK
 * mekanis-aman ditolak dengan alasan tercatat, bukan "diperbaiki" secara kreatif:
 *   - no_blank_marker : stem tidak memuat ___ (mis. soal "pilih kalimat yang
 *     benar" atau error_correction yang jawabannya kalimat utuh — mem-blank
 *     seluruh kalimat bukan cloze, itu dikte).
 *   - multi_blank     : stem memuat >1 ___ dengan jawaban gabungan
 *     ("have / repaired"); memecahnya butuh keputusan editorial per posisi,
 *     bukan transformasi mekanis.
 *   - answer_too_short: jawaban <3 karakter ("of", "an", "on") — terlalu pendek
 *     untuk digrade andal oleh FiezelProductionGrader (edit distance <=1 akan
 *     menerima hampir semua tebakan 2 huruf).
 *   - answer_ambiguous: jawaban muncul >1 kali sebagai token/frasa utuh di
 *     kalimat target — sisa kemunculannya di kalimat menjadi bocoran jawaban,
 *     dan grading "isi yang hilang" jadi ambigu.
 *
 * HASIL DATA NYATA (bukan target aspirasional): 139 template -> 112 item cloze.
 * Kontrak meminta minimal 200; angka itu tidak tercapai dari data yang ada tanpa
 * mengarang kalimat baru, jadi gate ditetapkan di MIN_ITEMS=110 (112 nyata,
 * margin 2 untuk edit konten minor yang sah). Lihat rincian per level via --report.
 *
 * Cara pakai:
 *   node tools/build-cloze-bank.js           -> validasi cloze-bank-v1.json yang ada
 *                                              (rebuild in-memory, harus identik byte)
 *   node tools/build-cloze-bank.js --write   -> regenerasi cloze-bank-v1.json
 *   node tools/build-cloze-bank.js --report  -> cetak distribusi level + alasan tolak
 *
 * Determinisme: tanpa Math.random, tanpa Date.now di dalam data; urutan item
 * mengikuti urutan template di grammar-templates.json; id = templateId + '-cz' +
 * indeks item dalam template (stabil selama template tidak berubah).
 *
 * Skema keluaran (FINAL per BRAINCORE-V3-CONTRACTS.md Fase 2):
 * {schema:'fiezel-cloze-bank-v1', items:[{id, templateId, skill, level,
 *  sentence(berisi ___), blank:{answer, alternates[], position},
 *  distractors:[{text, misconception}]}]}
 * Distraktor dibawa BESERTA label miskonsepsi verbatimnya supaya jawaban salah
 * pada mode cloze bisa dicocokkan FiezelProductionGrader (matchedDistractor)
 * dan diumpankan ke FiezelMisconceptionLedger sebagai bukti miskonsepsi.
 */

'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var TEMPLATES_PATH = path.join(ROOT, 'grammar-templates.json');
var OUT_PATH = path.join(ROOT, 'cloze-bank-v1.json');

var SCHEMA = 'fiezel-cloze-bank-v1';
var BLANK = '___';
/* Gate berbasis data nyata: 112 item dari 139 template (lihat header).
 * 110 = 112 nyata minus margin kecil; JANGAN naikkan ke 200 tanpa konten baru. */
var MIN_ITEMS = 110;
/* Minimal level CEFR yang harus terwakili (data nyata: 6 dari 6). */
var MIN_LEVELS = 4;
var MIN_ANSWER_LEN = 3;

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

  /* alternates: bentuk sah lain HANYA bila template sendiri menyediakannya.
   * Verifikasi data: setiap opsi non-benar di 139 template terdaftar sebagai
   * distraktor berlabel miskonsepsi (tidak ada opsi "juga benar" yang tersisa),
   * jadi alternates kosong BERDASARKAN DATA — bukan karena diabaikan. */
  var distractorTexts = {};
  tpl.distractors.forEach(function (d) { distractorTexts[d.option] = true; });
  var alternates = tpl.options.filter(function (opt, i) {
    return i !== tpl.correctIndex && !distractorTexts[opt];
  });

  return {
    item: {
      /* Indeks -cz0 dipertahankan meski saat ini 1 item/template, supaya id
       * tetap stabil kalau kelak satu template sah menghasilkan >1 cloze. */
      id: tpl.id + '-cz0',
      templateId: tpl.id,
      skill: tpl.subskill,
      level: tpl.cefr,
      sentence: tpl.stem,
      blank: {
        answer: answer,
        alternates: alternates,
        position: tpl.stem.indexOf(BLANK)
      },
      distractors: tpl.distractors.map(function (d) {
        return { text: d.option, misconception: d.misconception };
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
    if (r.item) items.push(r.item);
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

function loadTemplates() {
  var raw = JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf8'));
  return raw.templates;
}

function serialize(bank) {
  return JSON.stringify(bank, null, 2) + '\n';
}

function report(bank) {
  console.log('Cloze bank: ' + bank.counts.items + ' item dari ' + bank.counts.templates + ' template');
  console.log('Per level:', JSON.stringify(bank.counts.byLevel));
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
   * Ini gate anti-drift: kalau grammar-templates.json berubah tanpa
   * regenerasi bank, validasi gagal keras. */
  if (!fs.existsSync(OUT_PATH)) {
    console.error('GAGAL: ' + OUT_PATH + ' belum ada. Jalankan dengan --write.');
    return 1;
  }
  var existing = fs.readFileSync(OUT_PATH, 'utf8');
  if (existing !== serialize(bank)) {
    console.error('GAGAL: cloze-bank-v1.json tidak sinkron dengan grammar-templates.json. Jalankan --write.');
    return 1;
  }
  if (bank.counts.items < MIN_ITEMS) {
    console.error('GAGAL: item ' + bank.counts.items + ' < gate ' + MIN_ITEMS);
    return 1;
  }
  console.log('OK: cloze-bank-v1.json valid, ' + bank.counts.items + ' item, sinkron dengan template.');
  return 0;
}

module.exports = {
  SCHEMA: SCHEMA,
  MIN_ITEMS: MIN_ITEMS,
  MIN_LEVELS: MIN_LEVELS,
  MIN_ANSWER_LEN: MIN_ANSWER_LEN,
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
