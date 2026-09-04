/**
 * workers/api/teacher/csv-core.js — pipa IMPOR/EKSPOR CSV konten guru (§7-§12).
 * MURNI: nol D1, nol jaringan, nol jam implisit. Seluruh keputusan "baris ini
 * diterima / diperingatkan / ditolak" ada di sini dan bisa diuji tanpa Worker.
 *
 * ==========================================================================
 * PIPA (§7) — DAN KENAPA `PREVIEW` DAN `COMMIT` ADALAH DUA FUNGSI
 * ==========================================================================
 *   unggah -> parse -> deteksi skema -> pemetaan kolom -> validasi -> PREVIEW
 *          -> konfirmasi -> COMMIT -> D1 -> mesin konten -> Braincore
 *
 * `buildPreview()` TIDAK menulis apa pun dan `planCommit()` tidak memvalidasi
 * ulang dari nol — ia memakai hasil preview yang sama. Pemisahan ini bukan gaya:
 * §8 melarang "diam-diam merusak atau mengubah sebagian konten guru", dan satu-
 * satunya cara menjamin itu adalah memutuskan SELURUH berkas sebelum menyentuh
 * baris pertama. Impor yang menulis sambil jalan lalu gagal di baris 140
 * meninggalkan 139 baris setengah jadi yang tidak diminta siapa pun.
 *
 * ==========================================================================
 * KENAPA PARSER SENDIRI
 * ==========================================================================
 * `split(',')` salah untuk CSV nyata: satu soal yang memuat koma atau tanda
 * kutip di dalam kutipan akan pecah menjadi kolom hantu, dan hasilnya BUKAN
 * galat — melainkan soal yang tersimpan dengan potongan teks yang salah. Cacat
 * senyap itu persis yang §8 larang. Parser di bawah menangani RFC 4180:
 * kutipan, kutipan ganda yang di-escape, baris baru DI DALAM sel, dan CRLF.
 * Dependency dilarang di jalur produksi (lihat kepala workers/api/index.js),
 * jadi parsernya ada di sini, dan gerbang `teacher-csv-test.js` mengujinya.
 *
 * ==========================================================================
 * SUNTIKAN RUMUS (§8 "dangerous formulas")
 * ==========================================================================
 * Sel yang diawali = + - @ TAB CR dieksekusi sebagai RUMUS oleh Excel/Sheets
 * saat guru membuka file EKSPOR kita. Itu menjadikan FIEZEL saluran serangan
 * antar-guru: guru A menulis soal `=HYPERLINK("http://jahat", "klik")`, guru B
 * membuka ekspornya. Karena itu penjagaannya ada di DUA sisi dan keduanya perlu:
 * impor MEMPERINGATKAN (konten tetap disimpan apa adanya — merusaknya diam-diam
 * juga terlarang), dan ekspor MENETRALKAN dengan awalan `'`. Menetralkan hanya
 * saat impor tidak cukup: data lama sudah telanjur ada di database.
 */

import {
  CONTENT_STATUS, CONTENT_SOURCE, DIFFICULTY, LEVELS, SKILLS, QUESTION_TYPES,
  LIMITS, validateQuestion, cleanTags, questionNeedsOptions
} from './content-core.js';

/** Batas berkas (§8 "excessively large files"). */
export const CSV_LIMITS = Object.freeze({
  /** 2 MiB. Angka ini BUKAN selera: `mw-guard` menegakkan cap byte SEBELUM
   *  routing, dan parse CSV adalah CPU murni — anggaran paling langka di plan
   *  gratis. 2 MiB ≈ 8.000 soal, jauh di atas satu unggahan guru yang wajar. */
  MAX_BYTES: 2 * 1024 * 1024,
  MAX_ROWS: 5000,
  MAX_COLUMNS: 40,
  MAX_CELL_CHARS: 4000,
  /** Baris yang ditampilkan di preview. Sisanya diringkas — mengirim 5.000
   *  baris ke peramban ponsel murahan adalah cara membuat tab guru mati. */
  PREVIEW_ROWS: 25
});

export const CSV_SEVERITY = Object.freeze({
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  ERROR: 'ERROR'
});

export const CSV_PROBLEM = Object.freeze({
  FILE_EMPTY: 'csv_file_empty',
  FILE_TOO_LARGE: 'csv_file_too_large',
  TOO_MANY_ROWS: 'csv_too_many_rows',
  TOO_MANY_COLUMNS: 'csv_too_many_columns',
  HEADER_MISSING: 'csv_header_missing',
  COLUMN_REQUIRED_MISSING: 'csv_column_required_missing',
  COLUMN_UNKNOWN: 'csv_column_unknown',
  COLUMN_DUPLICATE: 'csv_column_duplicate',
  ROW_RAGGED: 'csv_row_ragged',
  ROW_EMPTY: 'csv_row_empty',
  CELL_TOO_LONG: 'csv_cell_too_long',
  DUPLICATE_ID: 'csv_duplicate_id',
  DUPLICATE_QUESTION: 'csv_duplicate_question',
  UNKNOWN_REFERENCE: 'csv_unknown_reference',
  FORMULA_SUSPECT: 'csv_formula_suspect',
  UNSUPPORTED_FIELD: 'csv_unsupported_field'
});

/* ========================================================================== */
/* 1. PARSER RFC 4180                                                          */
/* ========================================================================== */

/**
 * parseCsv(text) -> { rows: string[][], problems }
 * Baris ke-N dari berkas = rows[N-1]. Nomor baris yang dilaporkan ke guru
 * SELALU nomor baris BERKAS (1-basis, header = 1), bukan indeks array — guru
 * membaca laporan sambil menatap spreadsheet-nya, dan angka yang tidak cocok
 * dengan yang ia lihat lebih buruk daripada tidak ada angka.
 */
export function parseCsv(text) {
  const problems = [];
  const source = typeof text === 'string' ? text : '';
  if (!source.trim()) return { rows: [], problems: [{ problem: CSV_PROBLEM.FILE_EMPTY }] };

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let index = 0;

  // BOM UTF-8: Excel Windows menulisnya, dan kalau dibiarkan ia menempel di
  // nama kolom pertama sehingga 'question_text' tidak pernah cocok. Kegagalan
  // ini tampak seperti "kolom wajib hilang" dan sangat mahal untuk didiagnosis.
  if (source.charCodeAt(0) === 0xfeff) index = 1;

  while (index < source.length) {
    const ch = source[index];
    if (inQuotes) {
      if (ch === '"') {
        if (source[index + 1] === '"') { field += '"'; index += 2; continue; }
        inQuotes = false; index += 1; continue;
      }
      field += ch; index += 1; continue;
    }
    if (ch === '"') { inQuotes = true; index += 1; continue; }
    if (ch === ',') { row.push(field); field = ''; index += 1; continue; }
    if (ch === '\r') {
      if (source[index + 1] === '\n') index += 1;
      row.push(field); rows.push(row); row = []; field = ''; index += 1; continue;
    }
    if (ch === '\n') {
      row.push(field); rows.push(row); row = []; field = ''; index += 1; continue;
    }
    field += ch; index += 1;
  }
  row.push(field);
  rows.push(row);

  // Baris terakhir kosong karena berkas diakhiri newline: itu normal, bukan galat.
  while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop();
  }

  if (!rows.length) problems.push({ problem: CSV_PROBLEM.FILE_EMPTY });
  if (rows.length > CSV_LIMITS.MAX_ROWS + 1) problems.push({ problem: CSV_PROBLEM.TOO_MANY_ROWS });
  if (rows[0] && rows[0].length > CSV_LIMITS.MAX_COLUMNS) {
    problems.push({ problem: CSV_PROBLEM.TOO_MANY_COLUMNS });
  }
  return { rows, problems };
}

/** Merangkai satu sel untuk ekspor: kutip bila perlu, netralkan rumus. */
export function encodeCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  // §8: netralkan rumus pada EKSPOR. Awalan `'` adalah konvensi yang dipahami
  // Excel dan Sheets: sel dibaca sebagai teks, dan `'` tidak ikut tampil.
  const neutral = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(neutral) ? `"${neutral.replace(/"/g, '""')}"` : neutral;
}

export function encodeCsv(rows) {
  return rows.map((row) => row.map(encodeCell).join(',')).join('\r\n');
}

/** Deteksi sel yang akan dieksekusi spreadsheet sebagai rumus. */
export function looksLikeFormula(value) {
  return typeof value === 'string' && /^[=+\-@\t\r]/.test(value.trim())
    // '-12' adalah angka, bukan rumus. Menandainya akan membanjiri laporan
    // dengan peringatan palsu sampai guru berhenti membacanya sama sekali.
    && !/^-?\d+([.,]\d+)?$/.test(value.trim());
}

/* ========================================================================== */
/* 2. SKEMA & PEMETAAN KOLOM (§9, §10)                                         */
/* ========================================================================== */

/**
 * Skema kanonik soal — DITURUNKAN dari content-core.js, bukan diketik ulang.
 * `aliases` adalah nama kolom yang PERNAH ditulis manusia untuk maksud yang
 * sama; deteksi otomatis memakainya supaya guru tidak wajib memetakan manual
 * pada kasus normal, dan pemetaan manual (§9) tetap tersedia untuk sisanya.
 */
export const QUESTION_SCHEMA = Object.freeze([
  Object.freeze({
    key: 'content_id', label: 'Content ID', required: false,
    aliases: ['content_id', 'id', 'question_id', 'contentid'],
    help: 'Kosongkan untuk CREATE. Isi dengan ID hasil ekspor untuk UPDATE.'
  }),
  Object.freeze({
    key: 'lesson_id', label: 'Lesson ID', required: true,
    aliases: ['lesson_id', 'lesson', 'lessonid']
  }),
  Object.freeze({
    key: 'type', label: 'Question Type', required: true,
    aliases: ['type', 'question_type', 'qtype'], enum: QUESTION_TYPES
  }),
  Object.freeze({
    key: 'stem', label: 'Question Text', required: true,
    aliases: ['stem', 'question_text', 'question', 'text', 'prompt']
  }),
  Object.freeze({
    key: 'options', label: 'Options', required: false,
    aliases: ['options', 'choices', 'option_list'],
    help: 'Dipisah tanda "|". Wajib untuk mcq/listening_mcq/matching/ordering.'
  }),
  Object.freeze({
    key: 'answer', label: 'Correct Answer', required: true,
    aliases: ['answer', 'correct_answer', 'correct', 'key']
  }),
  Object.freeze({
    key: 'explanation', label: 'Explanation', required: false,
    aliases: ['explanation', 'rationale', 'why']
  }),
  Object.freeze({
    key: 'example', label: 'Example', required: false,
    aliases: ['example', 'sample']
  }),
  Object.freeze({
    key: 'skill', label: 'Skill', required: true,
    aliases: ['skill', 'category', 'competency'], enum: SKILLS
  }),
  Object.freeze({
    key: 'level', label: 'CEFR', required: true,
    aliases: ['level', 'cefr', 'cefr_level'], enum: LEVELS
  }),
  Object.freeze({
    key: 'difficulty', label: 'Difficulty', required: false,
    aliases: ['difficulty', 'diff'],
    help: `Bilangan bulat ${DIFFICULTY.MIN}..${DIFFICULTY.MAX}.`
  }),
  Object.freeze({
    key: 'tags', label: 'Tags', required: false,
    aliases: ['tags', 'tag', 'labels'], help: 'Dipisah tanda "|".'
  })
]);

export const REQUIRED_KEYS = Object.freeze(
  QUESTION_SCHEMA.filter((f) => f.required).map((f) => f.key)
);

function normalizeHeader(name) {
  return String(name || '').trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

/**
 * detectMapping(header) -> { mapping, problems, unknown }
 * `mapping[schemaKey] = indeks kolom`. Kolom yang tidak dikenali TIDAK menggagalkan
 * impor — ia dilaporkan sebagai WARNING `UNSUPPORTED_FIELD` dan diabaikan.
 * Menolak seluruh berkas karena satu kolom "catatan_guru" berarti guru harus
 * menyunting ekspor dari sistem lain sebelum boleh memakainya, dan itu adalah
 * pekerjaan yang kita timpakan ke dia tanpa alasan.
 */
export function detectMapping(header) {
  const mapping = {};
  const problems = [];
  const unknown = [];
  const seen = new Set();
  const columns = Array.isArray(header) ? header : [];

  columns.forEach((raw, index) => {
    const normalized = normalizeHeader(raw);
    if (!normalized) return;
    const field = QUESTION_SCHEMA.find((f) => f.aliases.includes(normalized));
    if (!field) { unknown.push({ column: index, name: String(raw).trim() }); return; }
    if (seen.has(field.key)) {
      problems.push({ problem: CSV_PROBLEM.COLUMN_DUPLICATE, column: index, field: field.key });
      return;
    }
    seen.add(field.key);
    mapping[field.key] = index;
  });

  for (const key of REQUIRED_KEYS) {
    if (!(key in mapping)) problems.push({ problem: CSV_PROBLEM.COLUMN_REQUIRED_MISSING, field: key });
  }
  return { mapping, problems, unknown };
}

/**
 * applyOverrides(mapping, overrides) -> mapping baru.
 * §9: guru boleh memetakan kolom sendiri. Override MENIMPA deteksi otomatis dan
 * divalidasi terhadap skema — kunci yang bukan milik skema dibuang, bukan
 * diteruskan, supaya klien tidak bisa mengarang bidang baru lewat pemetaan.
 */
export function applyOverrides(mapping, overrides) {
  const out = { ...mapping };
  if (!overrides || typeof overrides !== 'object') return out;
  for (const [key, value] of Object.entries(overrides)) {
    if (!QUESTION_SCHEMA.some((f) => f.key === key)) continue;
    const index = Number(value);
    if (Number.isInteger(index) && index >= 0) out[key] = index;
    else if (value === null) delete out[key];
  }
  return out;
}

/**
 * templateCsv() -> teks CSV template (§10), DITURUNKAN dari skema.
 * Diturunkan, bukan diketik: template yang diketik tangan akan menyimpang dari
 * skema pada perubahan berikutnya dan mengajari guru format yang sudah salah.
 */
export function templateCsv() {
  const header = QUESTION_SCHEMA.map((f) => f.key);
  const example = QUESTION_SCHEMA.map((f) => {
    switch (f.key) {
      case 'content_id': return '';
      case 'lesson_id': return 'LESSON_HOTEL_CHECKIN';
      case 'type': return 'mcq';
      case 'stem': return 'Guest: "I have a ___ under the name Putri." (hotel front desk)';
      case 'options': return 'reservation|receipt|reception|refund';
      case 'answer': return 'reservation';
      case 'explanation': return '"Reservation" is the booking made in advance.';
      case 'example': return 'I made a reservation for two nights.';
      case 'skill': return 'vocabulary';
      case 'level': return 'A2';
      case 'difficulty': return '2';
      case 'tags': return 'hospitality|check-in';
      default: return '';
    }
  });
  const legend = QUESTION_SCHEMA.map((f) => {
    const parts = [f.required ? 'WAJIB' : 'opsional'];
    if (f.enum) parts.push(`nilai: ${f.enum.join(' | ')}`);
    if (f.help) parts.push(f.help);
    return `${f.key}: ${parts.join(' — ')}`;
  });
  return encodeCsv([header, example, [], ['# PANDUAN KOLOM'], ...legend.map((l) => [l])]);
}

/* ========================================================================== */
/* 3. VALIDASI + PREVIEW (§8)                                                  */
/* ========================================================================== */

function cellAt(row, mapping, key) {
  const index = mapping[key];
  if (index === undefined || index === null) return '';
  const value = row[index];
  return value === undefined || value === null ? '' : String(value);
}

/**
 * buildPreview({ text, overrides, knownLessonIds, existingIds, existingStems }, nowMs)
 *   -> laporan lengkap (§8): ringkasan + diagnostik PER BARIS + rencana tulis.
 *
 * Kembaliannya TIDAK PERNAH memuat baris "setengah sah". Sebuah baris ada di
 * `plan` (akan ditulis) atau di `rows` dengan severity ERROR (tidak akan
 * ditulis) — tidak ada keadaan ketiga, karena keadaan ketiga adalah tempat
 * "impor sebagian" lahir.
 *
 * `knownLessonIds` = lesson milik GURU INI yang sudah ada di D1. Rujukan ke
 * lesson di luar himpunan itu adalah ERROR dan bukan hanya soal kerapian: tanpa
 * pemeriksaan ini, guru bisa menggantungkan soal pada lesson milik guru lain
 * hanya dengan mengetik ID-nya di CSV — IDOR lewat unggahan berkas (§28).
 */
export function buildPreview(input, nowMs) {
  const text = (input && input.text) || '';
  const byteLength = new TextEncoder().encode(text).length;
  const report = {
    counts: { total: 0, create: 0, update: 0, warning: 0, error: 0 },
    fileProblems: [],
    unknownColumns: [],
    mapping: {},
    rows: [],
    plan: [],
    truncatedPreview: false
  };

  if (byteLength > CSV_LIMITS.MAX_BYTES) {
    report.fileProblems.push({ problem: CSV_PROBLEM.FILE_TOO_LARGE, bytes: byteLength });
    return report;
  }

  const parsed = parseCsv(text);
  report.fileProblems.push(...parsed.problems);
  if (!parsed.rows.length) return report;
  if (report.fileProblems.some((p) => p.problem === CSV_PROBLEM.FILE_EMPTY
      || p.problem === CSV_PROBLEM.TOO_MANY_ROWS
      || p.problem === CSV_PROBLEM.TOO_MANY_COLUMNS)) {
    return report;
  }

  const header = parsed.rows[0];
  const detected = detectMapping(header);
  const mapping = applyOverrides(detected.mapping, input && input.overrides);
  report.mapping = mapping;
  report.unknownColumns = detected.unknown;

  // Kolom wajib diperiksa ULANG sesudah override: guru boleh memperbaiki kolom
  // yang tidak terdeteksi otomatis, dan menolak berdasarkan deteksi awal saja
  // akan membuat fitur pemetaan manual (§9) tidak ada gunanya.
  const problems = detected.problems.filter((p) => p.problem !== CSV_PROBLEM.COLUMN_REQUIRED_MISSING);
  for (const key of REQUIRED_KEYS) {
    if (!(key in mapping)) problems.push({ problem: CSV_PROBLEM.COLUMN_REQUIRED_MISSING, field: key });
  }
  report.fileProblems.push(...problems);
  if (problems.some((p) => p.problem === CSV_PROBLEM.COLUMN_REQUIRED_MISSING)) return report;

  const knownLessons = new Set(Array.isArray(input.knownLessonIds) ? input.knownLessonIds : []);
  const existingIds = new Set(Array.isArray(input.existingIds) ? input.existingIds : []);
  // Kunci dedup soal = lesson + tipe + batang soal ternormalisasi. Bukan batang
  // saja: "Choose the correct answer." adalah batang yang sah dipakai ulang di
  // banyak lesson, dan menolaknya akan menghukum guru yang bekerja rapi.
  const existingStems = new Map();
  for (const item of (Array.isArray(input.existingStems) ? input.existingStems : [])) {
    existingStems.set(dedupKey(item), item.id);
  }
  const seenIds = new Set();
  const seenStems = new Map();

  for (let rowIndex = 1; rowIndex < parsed.rows.length; rowIndex += 1) {
    const row = parsed.rows[rowIndex];
    const lineNumber = rowIndex + 1;
    const diagnostics = [];
    let severity = CSV_SEVERITY.SUCCESS;

    const isBlank = row.every((cell) => String(cell || '').trim() === '');
    if (isBlank) continue;

    report.counts.total += 1;

    if (row.length !== header.length) {
      diagnostics.push({ problem: CSV_PROBLEM.ROW_RAGGED, expected: header.length, got: row.length });
      severity = CSV_SEVERITY.ERROR;
    }

    for (const cell of row) {
      if (String(cell).length > CSV_LIMITS.MAX_CELL_CHARS) {
        diagnostics.push({ problem: CSV_PROBLEM.CELL_TOO_LONG });
        severity = CSV_SEVERITY.ERROR;
        break;
      }
    }

    const raw = {
      contentId: cellAt(row, mapping, 'content_id').trim(),
      lessonId: cellAt(row, mapping, 'lesson_id').trim(),
      type: cellAt(row, mapping, 'type'),
      stem: cellAt(row, mapping, 'stem'),
      options: cellAt(row, mapping, 'options'),
      answer: cellAt(row, mapping, 'answer'),
      explanation: cellAt(row, mapping, 'explanation'),
      example: cellAt(row, mapping, 'example'),
      skill: cellAt(row, mapping, 'skill'),
      level: cellAt(row, mapping, 'level'),
      difficulty: cellAt(row, mapping, 'difficulty'),
      tags: cellAt(row, mapping, 'tags')
    };

    for (const [field, value] of Object.entries(raw)) {
      if (looksLikeFormula(value)) {
        diagnostics.push({ problem: CSV_PROBLEM.FORMULA_SUSPECT, field });
        if (severity === CSV_SEVERITY.SUCCESS) severity = CSV_SEVERITY.WARNING;
      }
    }

    const verdict = validateQuestion({
      lessonId: raw.lessonId,
      type: raw.type,
      stem: raw.stem,
      options: raw.options ? raw.options.split('|') : [],
      answer: raw.answer,
      explanation: raw.explanation,
      example: raw.example,
      skill: raw.skill,
      level: raw.level,
      difficulty: raw.difficulty === '' ? undefined : raw.difficulty,
      tags: raw.tags
    }, nowMs);

    if (!verdict.ok) {
      diagnostics.push(...verdict.problems);
      severity = CSV_SEVERITY.ERROR;
    }
    for (const warning of verdict.warnings || []) {
      diagnostics.push({ problem: 'value_normalized', ...warning });
      if (severity === CSV_SEVERITY.SUCCESS) severity = CSV_SEVERITY.WARNING;
    }

    if (raw.lessonId && !knownLessons.has(raw.lessonId)) {
      diagnostics.push({ problem: CSV_PROBLEM.UNKNOWN_REFERENCE, field: 'lesson_id', value: raw.lessonId });
      severity = CSV_SEVERITY.ERROR;
    }

    // §12: ID stabil membedakan CREATE dari UPDATE. ID yang TIDAK dikenali
    // adalah ERROR, bukan "ya sudah buat baru": menganggapnya CREATE berarti
    // guru yang salah ketik satu karakter mendapat duplikat diam-diam, dan
    // §12 secara eksplisit melarang duplikat dari impor berulang.
    let operation = 'create';
    if (raw.contentId) {
      if (!existingIds.has(raw.contentId)) {
        diagnostics.push({ problem: CSV_PROBLEM.UNKNOWN_REFERENCE, field: 'content_id', value: raw.contentId });
        severity = CSV_SEVERITY.ERROR;
      } else if (seenIds.has(raw.contentId)) {
        diagnostics.push({ problem: CSV_PROBLEM.DUPLICATE_ID, value: raw.contentId });
        severity = CSV_SEVERITY.ERROR;
      } else {
        seenIds.add(raw.contentId);
        operation = 'update';
      }
    }

    if (verdict.ok) {
      const key = dedupKey({ lesson_id: verdict.question.lesson_id, type: verdict.question.type, stem: verdict.question.stem });
      const duplicateInFile = seenStems.get(key);
      const duplicateInDb = existingStems.get(key);
      if (duplicateInFile !== undefined) {
        diagnostics.push({ problem: CSV_PROBLEM.DUPLICATE_QUESTION, line: duplicateInFile });
        severity = CSV_SEVERITY.ERROR;
      } else if (duplicateInDb && duplicateInDb !== raw.contentId) {
        // Soal identik yang sudah ada di bank dengan ID LAIN: ini yang terjadi
        // saat guru mengekspor, menghapus kolom content_id, lalu mengimpor lagi.
        // WARNING dan bukan ERROR karena niatnya bisa sah (menyalin ke lesson
        // lain), tetapi ia WAJIB terlihat sebelum konfirmasi.
        diagnostics.push({ problem: CSV_PROBLEM.DUPLICATE_QUESTION, existingId: duplicateInDb });
        if (severity === CSV_SEVERITY.SUCCESS) severity = CSV_SEVERITY.WARNING;
      } else {
        seenStems.set(key, lineNumber);
      }
    }

    const entry = { line: lineNumber, severity, operation, diagnostics };
    if (severity === CSV_SEVERITY.ERROR) report.counts.error += 1;
    else {
      if (severity === CSV_SEVERITY.WARNING) report.counts.warning += 1;
      if (operation === 'update') report.counts.update += 1;
      else report.counts.create += 1;
      report.plan.push({
        line: lineNumber,
        operation,
        contentId: raw.contentId || null,
        question: verdict.question
      });
    }

    if (report.rows.length < CSV_LIMITS.PREVIEW_ROWS) report.rows.push(entry);
    else report.truncatedPreview = true;
  }

  for (const column of report.unknownColumns) {
    report.fileProblems.push({ problem: CSV_PROBLEM.UNSUPPORTED_FIELD, name: column.name });
  }
  return report;
}

/** Kunci dedup soal — dipakai preview DAN gerbang. */
export function dedupKey(item) {
  const lesson = String((item && (item.lesson_id || item.lessonId)) || '').trim();
  const type = String((item && item.type) || '').trim().toLowerCase();
  const stem = String((item && item.stem) || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `${lesson}::${type}::${stem}`;
}

/**
 * planCommit(report) -> { ok, writes, refused }
 *
 * ATURAN SEMUA-ATAU-TIDAK ADA UNTUK BARIS BERGALAT: baris ERROR tidak pernah
 * ditulis. Baris yang sah TETAP ditulis meski ada baris lain yang gagal, dan itu
 * keputusan sadar yang berbeda dari "transaksi utuh": guru dengan 182 baris
 * benar dan 4 salah menginginkan 182 baris itu masuk, dan laporan §8 memang
 * dirancang untuk melaporkan campuran itu ("Imported: 182, Errors: 4"). Yang
 * dilarang §8 adalah perubahan SEBAGIAN pada SATU konten — dan itu mustahil di
 * sini karena satu baris = satu soal utuh, ditulis sekali.
 */
export function planCommit(report) {
  if (!report || !Array.isArray(report.plan)) return { ok: false, writes: [], refused: 0 };
  const blocking = (report.fileProblems || []).filter((p) => p.problem !== CSV_PROBLEM.UNSUPPORTED_FIELD);
  if (blocking.length) return { ok: false, writes: [], refused: report.counts.total || 0 };
  return {
    ok: true,
    writes: report.plan.map((entry) => ({
      operation: entry.operation,
      contentId: entry.contentId,
      // Konten hasil impor SELALU mendarat sebagai DRAFT (§13). Guru menerbitkan
      // secara sadar sesudah melihat pratinjau — impor tidak pernah menjadi
      // jalan pintas ke layar murid.
      question: { ...entry.question, status: CONTENT_STATUS.DRAFT, content_source: CONTENT_SOURCE.TEACHER }
    })),
    refused: report.counts.error || 0
  };
}

/* ========================================================================== */
/* 4. EKSPOR (§11)                                                             */
/* ========================================================================== */

/**
 * exportQuestionsCsv(questions, viewer) -> teks CSV.
 *
 * OTORISASI ADALAH BAGIAN DARI FUNGSI INI, bukan tanggung jawab pemanggil.
 * §11 melarang ekspor membocorkan data yang tidak berhak, dan penyaring yang
 * hidup di route bisa dilewati route berikutnya yang lupa. `viewer` WAJIB ada;
 * tanpa itu kembaliannya hanya header, bukan seluruh isi bank.
 *
 * Kolom yang TIDAK PERNAH keluar, apa pun isinya: `teacher_sub`, `created_by`,
 * `updated_by`, `institution_id` (pengenal internal), dan seluruh kolom bukti
 * belajar murid. Ekspor adalah konten, bukan orang.
 */
export function exportQuestionsCsv(questions, viewer) {
  const header = QUESTION_SCHEMA.map((f) => f.key);
  const rows = [header];
  if (!viewer || !viewer.sub) return encodeCsv(rows);

  for (const question of (Array.isArray(questions) ? questions : [])) {
    if (!question || question.teacher_sub !== viewer.sub) continue;
    rows.push([
      question.id || '',
      question.lesson_id || '',
      question.type || '',
      question.stem || '',
      Array.isArray(question.options) ? question.options.join('|') : String(question.options || ''),
      question.answer || '',
      question.explanation || '',
      question.example || '',
      question.skill || '',
      question.level || '',
      question.difficulty === undefined || question.difficulty === null
        ? DIFFICULTY.DEFAULT : question.difficulty,
      Array.isArray(question.tags) ? question.tags.join('|') : String(question.tags || '')
    ]);
  }
  return encodeCsv(rows);
}

/**
 * roundTripSafe(question) -> boolean.
 * Dipakai gerbang §12: sebuah soal yang diekspor lalu diimpor kembali harus
 * menghasilkan soal yang setara. Yang bisa merusaknya adalah pemisah `|` yang
 * MUNCUL DI DALAM sebuah opsi atau tag — ia akan pecah menjadi dua saat impor.
 * Ini dilaporkan, bukan diperbaiki diam-diam.
 */
export function roundTripSafe(question) {
  const lists = [
    Array.isArray(question && question.options) ? question.options : [],
    Array.isArray(question && question.tags) ? question.tags : []
  ];
  for (const list of lists) {
    for (const item of list) if (String(item).includes('|')) return false;
  }
  return true;
}

/** Ringkasan yang ditampilkan ke guru (§8). Angka, bukan kalimat. */
export function summarize(report) {
  const counts = (report && report.counts) || {};
  return {
    imported: (counts.create || 0) + (counts.update || 0),
    created: counts.create || 0,
    updated: counts.update || 0,
    warnings: counts.warning || 0,
    errors: counts.error || 0,
    total: counts.total || 0
  };
}

export const CSV_INTERNAL = Object.freeze({ normalizeHeader, cellAt, questionNeedsOptions, LIMITS });
