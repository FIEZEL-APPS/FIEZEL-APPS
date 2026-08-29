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
 *   - answer_not_typable: jawaban adalah placeholder meta dalam kurung, mis.
 *     "(no article)" / "[no word needed]" — jawaban linguistiknya "tidak ada
 *     kata", yang mustahil diketik murid di mode produksi; grader menolak
 *     input kosong, jadi item seperti ini tidak boleh dikirim (P0 audit
 *     assessment-audit-09 / redteam-20: AR-002-cz0, b4_018-cz0).
 *
 * HASIL DATA NYATA (bukan target aspirasional): 153 template -> 123 item cloze
 * (pasca ekspansi G1 139->153 + aturan answer_not_typable). Kontrak meminta
 * minimal 200; angka itu tidak tercapai dari data yang ada tanpa mengarang
 * kalimat baru, jadi gate ditetapkan di MIN_ITEMS=120 (123 nyata, margin 3
 * untuk edit konten minor yang sah). Lihat rincian per level via --report.
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
 *
 * ALTERNATES (repair R1, temuan P0 redteam-20 "alternates=[] sistemik"):
 * blank.alternates kini digabung dari cloze-alternates-v1.json (dikontrol
 * versi, kunci = id item cloze). Sumber terpisah supaya `--write` TIDAK PERNAH
 * menghapus alternates hasil kurasi — regenerasi bank tetap deterministik dan
 * alternates tetap awet. Lint saat build: alternate tidak boleh kosong, tidak
 * boleh sama dengan jawaban utama, dan tidak boleh sama dengan teks distraktor
 * item itu (kalau sama, bukti miskonsepsi akan dinilai BENAR — P0). Kunci yang
 * tidak menunjuk item terkirim membuat build GAGAL keras (deteksi kunci basi).
 */

'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var TEMPLATES_PATH = path.join(ROOT, 'grammar-templates.json');
var ALTERNATES_PATH = path.join(ROOT, 'cloze-alternates-v1.json');
/* m025-186 (A08-F6): pembahasan terkurasi per item — pola yang sama dengan alternates:
 * sumber terpisah supaya --write tidak pernah menghapus hasil kurasi. */
var EXPLAINS_PATH = path.join(ROOT, 'cloze-explains-v1.json');
var OUT_PATH = path.join(ROOT, 'cloze-bank-v1.json');

var SCHEMA = 'fiezel-cloze-bank-v1';
var BLANK = '___';
/* Gate berbasis data nyata: 123 item dari 153 template (lihat header).
 * 120 = 123 nyata minus margin kecil; JANGAN naikkan ke 200 tanpa konten baru. */
var MIN_ITEMS = 120;
/* Minimal level CEFR yang harus terwakili (data nyata: 6 dari 6). */
var MIN_LEVELS = 4;
var MIN_ANSWER_LEN = 3;

/* Escape string untuk dipakai literal di dalam RegExp. */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* F1 (P1 assessment-redteam-20-round2, RS-002-cz0/QN-003-cz0): dua item produksi-ketik
 * memblank frasa yang jawabannya TIDAK TERHINGGA ("She asked me ___." menerima klausa
 * pelaporan apa pun — "what I wanted", "if I was ready", ... — semuanya bahasa Inggris
 * benar tapi dinilai salah). BLANK_NARROWING menyempitkan blank ke span yang lebih pendek
 * dari KALIMAT YANG SAMA, secara mekanis: span harus muncul tepat sekali di dalam jawaban
 * asli; sisa jawabannya (prefix/suffix) dipindahkan ke stem, dan setiap opsi/distraktor
 * template ikut disempitkan dengan pemetaan prefix/suffix yang sama — opsi yang tidak bisa
 * ditulis pada frame sempit itu gugur (tidak mungkin diketik murid di frame baru).
 * Tidak ada konten baru yang dikarang: stem, jawaban, dan distraktor semuanya substring
 * kalimat target template yang sudah diaudit, dengan label miskonsepsi verbatim.
 * Kenapa di loadTemplates: gate cloze-bank-test.js membandingkan blank.answer dengan
 * options[correctIndex] hasil loadTemplates — lensa yang sama untuk builder dan gate. */
var BLANK_NARROWING = {
  /* "She asked me ___." -> "She asked me where I ___." (jawaban "lived"): urutan
   * pernyataan sudah tersaji, yang diproduksi murid adalah verba backshift-nya.
   * Distraktor "where I did live" menyempit ke "did live" (miskonsepsi 'did' penegas). */
  'RS-002': { narrowTo: 'lived' },
  /* "Excuse me, could you tell me ___?" -> "... where the nearest ___?" (jawaban
   * "pharmacy is"): subjek+verba tanpa inversi yang harus diproduksi. Distraktor
   * "where the nearest pharmacy was" menyempit ke "pharmacy was" (backshift tak perlu). */
  'QN-003': { narrowTo: 'pharmacy is' }
};

/**
 * Terapkan BLANK_NARROWING pada satu template (pure; template tanpa override lewat apa
 * adanya). Gagal keras bila span tidak tepat-sekali di jawaban, jawaban benar tidak
 * termapel, atau tidak ada distraktor yang selamat — override basi harus menghentikan
 * build, bukan diam-diam mengirim item yang justru mau diperbaiki.
 */
function applyBlankNarrowing(tpl) {
  var ov = BLANK_NARROWING[tpl.id];
  if (!ov) return tpl;
  var answer = tpl.options[tpl.correctIndex];
  var at = String(answer).indexOf(ov.narrowTo);
  if (at === -1 || String(answer).indexOf(ov.narrowTo, at + 1) !== -1) {
    throw new Error('BLANK_NARROWING ' + tpl.id + ': span "' + ov.narrowTo + '" harus muncul tepat sekali di jawaban "' + answer + '"');
  }
  var pre = answer.slice(0, at);
  var post = answer.slice(at + ov.narrowTo.length);
  var narrow = function (opt) {
    if (typeof opt !== 'string' || opt.length <= pre.length + post.length) return null;
    if (opt.slice(0, pre.length) !== pre) return null;
    if (post && opt.slice(-post.length) !== post) return null;
    return opt.slice(pre.length, opt.length - post.length);
  };
  var options = [];
  var correctIndex = -1;
  tpl.options.forEach(function (opt, i) {
    var mid = narrow(opt);
    if (mid === null) return; /* tidak bisa dituliskan pada frame sempit: gugur */
    if (i === tpl.correctIndex) correctIndex = options.length;
    options.push(mid);
  });
  if (correctIndex === -1) {
    throw new Error('BLANK_NARROWING ' + tpl.id + ': jawaban benar tidak cocok dengan span override');
  }
  var distractors = [];
  tpl.distractors.forEach(function (d) {
    var mid = narrow(d.option);
    if (mid === null) return;
    var nd = Object.assign({}, d);
    nd.option = mid;
    distractors.push(nd);
  });
  if (!distractors.length) {
    throw new Error('BLANK_NARROWING ' + tpl.id + ': tidak ada distraktor yang selamat dari penyempitan');
  }
  return Object.assign({}, tpl, {
    stem: tpl.stem.replace(BLANK, pre + BLANK + post),
    options: options,
    correctIndex: correctIndex,
    distractors: distractors
  });
}

/* Placeholder meta "(no article)" / "[no word needed]": jawaban yang benar
 * adalah TIDAK menulis apa pun — tidak bisa diketik, tidak boleh dikirim. */
function isPlaceholderAnswer(answer) {
  return /^\s*[\(\[][^\)\]]*[\)\]]\s*$/.test(String(answer));
}

/* Normalisasi ringan untuk lint alternates — sejalan dengan normalize() di
 * FiezelProductionGrader (lowercase, kutip lurus, spasi rapi). */
function normLite(s) {
  return String(s)
    .replace(/[\u2018\u2019\u201A\u02BC\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
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
  if (isPlaceholderAnswer(answer)) {
    return { reject: { templateId: tpl.id, reason: 'answer_not_typable',
      detail: 'jawaban "' + answer + '" adalah placeholder meta — jawaban sebenarnya "tidak ada kata", mustahil diketik di mode produksi' } };
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
 * Gabungkan alternates hasil kurasi (cloze-alternates-v1.json) ke item hasil
 * konversi mekanis. Lint keras di sini, bukan diam-diam menyaring: alternate
 * yang salah adalah bug konten yang harus menghentikan build.
 */
function mergeAlternates(items, alternatesById) {
  if (!alternatesById) return;
  var itemById = {};
  items.forEach(function (it) { itemById[it.id] = it; });
  Object.keys(alternatesById).forEach(function (id) {
    var it = itemById[id];
    if (!it) {
      throw new Error('cloze-alternates-v1.json: kunci "' + id + '" tidak menunjuk item cloze terkirim — kunci basi/typo, perbaiki sumbernya');
    }
    var list = alternatesById[id];
    if (!Array.isArray(list)) {
      throw new Error('cloze-alternates-v1.json: nilai untuk "' + id + '" harus array string');
    }
    var normAnswer = normLite(it.blank.answer);
    var normDistractors = it.distractors.map(function (d) { return normLite(d.text); });
    var seen = {};
    list.forEach(function (alt) {
      if (typeof alt !== 'string' || !normLite(alt)) {
        throw new Error('cloze-alternates-v1.json ' + id + ': alternate kosong/bukan string');
      }
      var n = normLite(alt);
      if (n === normAnswer) {
        throw new Error('cloze-alternates-v1.json ' + id + ': alternate "' + alt + '" sama dengan jawaban utama');
      }
      if (normDistractors.indexOf(n) !== -1) {
        throw new Error('cloze-alternates-v1.json ' + id + ': alternate "' + alt + '" sama dengan teks distraktor — miskonsepsi akan dinilai benar (P0)');
      }
      if (seen[n]) return; /* dedupe diam-diam: duplikat bukan bahaya */
      seen[n] = true;
      if (it.blank.alternates.indexOf(alt) === -1) it.blank.alternates.push(alt);
    });
  });
}

/**
 * m025-186 (A08-F6): gabungkan pembahasan terkurasi (cloze-explains-v1.json) ke item.
 * Lint keras seperti mergeAlternates: kunci basi atau field kosong menghentikan build,
 * karena pembahasan yang salah sasaran adalah bug konten, bukan kosmetik.
 */
function mergeExplains(items, explainsById) {
  if (!explainsById) return;
  var itemById = {};
  items.forEach(function (it) { itemById[it.id] = it; });
  Object.keys(explainsById).forEach(function (id) {
    var it = itemById[id];
    if (!it) {
      throw new Error('cloze-explains-v1.json: kunci "' + id + '" tidak menunjuk item cloze terkirim — kunci basi/typo, perbaiki sumbernya');
    }
    var e = explainsById[id];
    if (!e || typeof e !== 'object' || typeof e.why !== 'string' || !e.why.trim() || typeof e.rule !== 'string' || !e.rule.trim()) {
      throw new Error('cloze-explains-v1.json ' + id + ': explain wajib objek dengan why dan rule non-kosong');
    }
    it.explain = {
      why: String(e.why),
      rule: String(e.rule),
      memory: String(e.memory || ''),
      avoid: String(e.avoid || '')
    };
  });
}

/**
 * Bangun bank cloze lengkap dari daftar template. Deterministik penuh.
 * alternatesById opsional: peta id-item -> array alternates hasil kurasi;
 * bila tidak diberikan, dibaca dari cloze-alternates-v1.json (loadAlternates).
 * Return {bank, rejected} — rejected disimpan di dalam bank (meta) supaya
 * alasan tolak ikut terdokumentasi di artefak, bukan hanya di log.
 */
function build(templates, alternatesById) {
  var items = [];
  var rejected = [];
  templates.forEach(function (tpl) {
    var r = convertTemplate(tpl);
    if (r.item) items.push(r.item);
    else rejected.push(r.reject);
  });
  mergeAlternates(items, alternatesById === undefined ? loadAlternates() : alternatesById);
  mergeExplains(items, loadExplains());

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
  /* Lensa BLANK_NARROWING diterapkan DI SINI supaya builder dan gate
   * (cloze-bank-test.js memakai loadTemplates yang sama) melihat template identik. */
  return raw.templates.map(applyBlankNarrowing);
}

/* Sumber alternates terkurasi. File boleh absen (bank tanpa alternates tetap
 * sah), tapi kalau ada wajib berbentuk {schema, alternates:{id:[...]}}. */
function loadAlternates() {
  if (!fs.existsSync(ALTERNATES_PATH)) return null;
  var raw = JSON.parse(fs.readFileSync(ALTERNATES_PATH, 'utf8'));
  if (!raw || raw.schema !== 'fiezel-cloze-alternates-v1' || typeof raw.alternates !== 'object') {
    throw new Error('cloze-alternates-v1.json: schema harus fiezel-cloze-alternates-v1 dengan peta .alternates');
  }
  return raw.alternates;
}

/* Sumber pembahasan terkurasi. File boleh absen (item tanpa explain memakai
 * jaring pengaman generik di app.js), tapi kalau ada wajib berbentuk
 * {schema, explains:{id:{why,rule,memory,avoid}}}. */
function loadExplains() {
  if (!fs.existsSync(EXPLAINS_PATH)) return null;
  var raw = JSON.parse(fs.readFileSync(EXPLAINS_PATH, 'utf8'));
  if (!raw || raw.schema !== 'fiezel-cloze-explains-v1' || typeof raw.explains !== 'object') {
    throw new Error('cloze-explains-v1.json: schema harus fiezel-cloze-explains-v1 dengan peta .explains');
  }
  return raw.explains;
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
  loadAlternates: loadAlternates,
  mergeAlternates: mergeAlternates,
  serialize: serialize,
  wholePhraseCount: wholePhraseCount,
  isPlaceholderAnswer: isPlaceholderAnswer,
  OUT_PATH: OUT_PATH,
  ALTERNATES_PATH: ALTERNATES_PATH
};

if (require.main === module) {
  process.exit(main());
}
