/**
 * workers/api/teacher/content-core.js — MODEL KONTEN GURU FIEZEL.
 * MURNI: nol D1, nol env, nol jam implisit (waktu selalu PARAMETER). Seluruh
 * aturan "apa yang sah, siapa boleh melihat, kapan boleh terbit" hidup di sini,
 * dan lapisan rute hanya menjalankannya.
 *
 * ==========================================================================
 * KENAPA MEMPERLUAS MODEL FIEZEL, BUKAN MEMBUAT FORMAT GURU SENDIRI
 * ==========================================================================
 * Mandat §3 melarang format konten guru yang tidak kompatibel, dan alasannya
 * bukan kerapian: Braincore FIEZEL mengambil keputusan adaptif dari `skill` dan
 * `level` CEFR. Konten dengan kosakata bidang sendiri ("difficulty: hard")
 * tidak bisa masuk keputusan itu tanpa penerjemah, dan penerjemah adalah tempat
 * makna diam-diam berubah. Jadi enum di bawah DIAMBIL dari yang sudah dipakai
 * mesin: SKILLS = features/personal-journey/fiezel-personal-journey.js:44,
 * LEVELS = features/brain/fiezel-core-brain.js:60. Gerbang
 * `teacher-content-test.js` mengunci kesamaan itu; kalau salah satu berubah
 * sepihak, gerbang merah.
 *
 * Yang DITAMBAHKAN di atas model inti hanyalah yang tidak punya padanan:
 * kepemilikan (`teacher_sub`), lingkup (`institution_id`), hierarki
 * (subject/course/topic/lesson), dan siklus terbit. Tidak ada satu pun dari
 * empat itu yang mengubah arti `skill`/`level` bagi Braincore.
 *
 * ==========================================================================
 * SATU TABEL UNTUK EMPAT TINGKAT HIERARKI
 * ==========================================================================
 * subject/course/topic/lesson disimpan di SATU tabel `tc_node` dengan kolom
 * `kind`, bukan empat tabel. Alasannya bisa diperiksa: keempatnya punya kolom
 * yang identik 90% (pemilik, judul, status, versi, stempel waktu), dan
 * perjalanan yang paling sering dilakukan produk ini adalah "ambil seluruh
 * pohon milik guru X" — satu SELECT ber-`teacher_sub` di satu tabel, bukan
 * empat kueri plus penggabungan di memori pada plan gratis.
 *
 * Harga yang dibayar, disebut supaya jujur: D1 tidak bisa menegakkan "orang tua
 * sebuah lesson wajib bertipe topic" lewat FK. Karena itu penegakannya ada di
 * `checkParent()` di bawah dan gerbang mengujinya secara langsung. Aturan yang
 * ditegakkan kode WAJIB punya gerbang; itu syarat memilih desain ini.
 */

/** Tingkat hierarki (§4). Urutan array = urutan kedalaman, dipakai checkParent. */
export const NODE_KIND = Object.freeze({
  SUBJECT: 'subject',
  COURSE: 'course',
  TOPIC: 'topic',
  LESSON: 'lesson'
});

/** Rantai induk sah. `null` = akar (hanya subject boleh tanpa induk). */
export const HIERARCHY = Object.freeze([
  NODE_KIND.SUBJECT, NODE_KIND.COURSE, NODE_KIND.TOPIC, NODE_KIND.LESSON
]);

export const NODE_KINDS = HIERARCHY;

/** Status terbit (§13). Enum tertutup; transisi diatur PUBLISH_TRANSITIONS. */
export const CONTENT_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED'
});

/**
 * Mesin status terbit (§14). Perhatikan dua keputusan:
 *   - PUBLISHED -> DRAFT DIIZINKAN ("tarik kembali jadi draft"): guru yang
 *     menemukan salah ketik sesudah menerbitkan harus punya jalan keluar yang
 *     bukan "arsipkan dan buat ulang", karena membuat ulang memutus ID stabil
 *     yang dipakai bukti belajar murid.
 *   - ARCHIVED -> DRAFT DIIZINKAN (pemulihan), tetapi ARCHIVED -> PUBLISHED
 *     TIDAK: konten yang pernah diarsipkan wajib lewat draft + validasi lagi
 *     sebelum sampai ke murid. Ini yang mencegah "hidupkan lagi yang lama"
 *     menjadi jalan pintas yang melewati validator.
 */
export const PUBLISH_TRANSITIONS = Object.freeze({
  [CONTENT_STATUS.DRAFT]: Object.freeze([CONTENT_STATUS.PUBLISHED, CONTENT_STATUS.ARCHIVED]),
  [CONTENT_STATUS.PUBLISHED]: Object.freeze([CONTENT_STATUS.DRAFT, CONTENT_STATUS.ARCHIVED]),
  [CONTENT_STATUS.ARCHIVED]: Object.freeze([CONTENT_STATUS.DRAFT])
});

/**
 * Sumber konten (§17). Braincore WAJIB bisa membedakan keduanya: keputusan
 * adaptif atas materi guru satu kelas tidak boleh mencemari prior item bank
 * inti yang dipakai seluruh murid FIEZEL.
 */
export const CONTENT_SOURCE = Object.freeze({
  CORE: 'CORE',
  TEACHER: 'TEACHER'
});

/** Keterampilan — SALINAN enum inti (fiezel-personal-journey.js:44). */
export const SKILLS = Object.freeze([
  'vocabulary', 'grammar', 'reading', 'listening', 'speaking'
]);

/** CEFR — SALINAN enum inti (fiezel-core-brain.js:60). */
export const LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

/**
 * Tipe soal. Tujuh nilai ini dipilih karena masing-masing sudah punya
 * penilai di FIEZEL — bukan karena daftar panjang terlihat lengkap. Tipe tanpa
 * penilai berarti jawaban murid tidak bisa dinilai, dan soal yang tidak bisa
 * dinilai tidak menghasilkan bukti belajar, sehingga Braincore buta terhadapnya.
 */
export const QUESTION_TYPE = Object.freeze({
  MCQ: 'mcq',
  CLOZE: 'cloze',
  SHORT_ANSWER: 'short_answer',
  ORDERING: 'ordering',
  MATCHING: 'matching',
  LISTENING_MCQ: 'listening_mcq',
  SPEAKING_PROMPT: 'speaking_prompt'
});

export const QUESTION_TYPES = Object.freeze(Object.values(QUESTION_TYPE));

/**
 * Kesulitan 1..5. Skala TERBATAS dan BILANGAN BULAT dengan sengaja: guru yang
 * boleh menulis 0..100 menghasilkan sebaran yang tidak sebanding antar guru,
 * dan kalibrasi item Braincore (`fiezel-item-prior.js`) membaca angka ini
 * sebagai prior. Lima langkah adalah yang bisa dipakai manusia secara konsisten.
 */
export const DIFFICULTY = Object.freeze({ MIN: 1, MAX: 5, DEFAULT: 3 });

export const LIMITS = Object.freeze({
  TITLE_MAX: 120,
  DESCRIPTION_MAX: 1000,
  OBJECTIVE_MAX: 400,
  STEM_MAX: 1000,
  OPTION_MAX: 300,
  EXPLANATION_MAX: 1000,
  OPTIONS_MIN: 2,
  OPTIONS_MAX: 6,
  TAGS_MAX: 12,
  TAG_MAX: 32,
  VOCAB_MAX: 200,
  DURATION_MAX_MIN: 240
});

/** Alasan penolakan — enum tertutup, dipetakan ke i18n. TIDAK PERNAH kalimat. */
export const CONTENT_PROBLEM = Object.freeze({
  KIND_INVALID: 'content_kind_invalid',
  PARENT_REQUIRED: 'content_parent_required',
  PARENT_FORBIDDEN: 'content_parent_forbidden',
  PARENT_KIND_MISMATCH: 'content_parent_kind_mismatch',
  PARENT_NOT_OWNED: 'content_parent_not_owned',
  TITLE_EMPTY: 'content_title_empty',
  TITLE_TOO_LONG: 'content_title_too_long',
  DESCRIPTION_TOO_LONG: 'content_description_too_long',
  OBJECTIVE_TOO_LONG: 'content_objective_too_long',
  SKILL_INVALID: 'content_skill_invalid',
  LEVEL_INVALID: 'content_level_invalid',
  DIFFICULTY_INVALID: 'content_difficulty_invalid',
  DURATION_INVALID: 'content_duration_invalid',
  TAGS_TOO_MANY: 'content_tags_too_many',
  TAG_TOO_LONG: 'content_tag_too_long',
  STATUS_INVALID: 'content_status_invalid',
  TRANSITION_INVALID: 'content_transition_invalid',
  PUBLISH_NO_QUESTIONS: 'content_publish_no_questions',
  PUBLISH_PARENT_DRAFT: 'content_publish_parent_draft',
  PUBLISH_QUESTION_INVALID: 'content_publish_question_invalid',
  QUESTION_TYPE_INVALID: 'question_type_invalid',
  QUESTION_STEM_EMPTY: 'question_stem_empty',
  QUESTION_STEM_TOO_LONG: 'question_stem_too_long',
  QUESTION_OPTIONS_TOO_FEW: 'question_options_too_few',
  QUESTION_OPTIONS_TOO_MANY: 'question_options_too_many',
  QUESTION_OPTION_EMPTY: 'question_option_empty',
  QUESTION_OPTION_DUPLICATE: 'question_option_duplicate',
  QUESTION_ANSWER_MISSING: 'question_answer_missing',
  QUESTION_ANSWER_NOT_IN_OPTIONS: 'question_answer_not_in_options',
  QUESTION_LESSON_MISSING: 'question_lesson_missing',
  NOT_OWNED: 'content_not_owned',
  NOT_FOUND: 'content_not_found'
});

/* -------------------------------------------------------------------------- */
/* Sanitasi                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Membuang karakter kontrol dan merapikan spasi. Ini BUKAN pengganti escaping
 * di titik render — konten guru tetap keluar lewat textContent, bukan innerHTML.
 * Yang dilakukan di sini adalah menjaga penyimpanan tetap bersih supaya ekspor
 * CSV dan log tidak bisa dirusak satu byte 0x0D.
 */
export function cleanText(raw, maxLength) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
    .slice(0, Number(maxLength) || LIMITS.TITLE_MAX);
}

/** Tag: huruf kecil, tanpa spasi, aman untuk kolom CSV dan untuk indeks. */
export function cleanTag(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, LIMITS.TAG_MAX);
}

export function cleanTags(raw) {
  const list = Array.isArray(raw) ? raw : String(raw || '').split(/[|,;]/);
  const out = [];
  for (const item of list) {
    const tag = cleanTag(item);
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

/**
 * normalizeLevel(raw) -> { level, normalized } | null
 * `normalized:true` berarti nilai masukan DIUBAH (mis. 'b1' -> 'B1'), dan
 * pemanggil WAJIB melaporkannya sebagai WARNING di laporan impor (§8 "Row 44:
 * WARNING — CEFR value normalized"). Normalisasi diam-diam adalah cara paling
 * halus konten guru berubah tanpa ia tahu.
 */
export function normalizeLevel(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase().replace(/\s+/g, '');
  if (!LEVELS.includes(upper)) return null;
  return { level: upper, normalized: upper !== trimmed };
}

export function normalizeSkill(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  if (!SKILLS.includes(lower)) return null;
  return { skill: lower, normalized: lower !== trimmed };
}

export function normalizeQuestionType(raw) {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return QUESTION_TYPES.includes(lower) ? lower : null;
}

export function normalizeDifficulty(raw) {
  const value = Number(raw);
  if (!Number.isInteger(value)) return null;
  if (value < DIFFICULTY.MIN || value > DIFFICULTY.MAX) return null;
  return value;
}

/* -------------------------------------------------------------------------- */
/* Hierarki                                                                    */
/* -------------------------------------------------------------------------- */

/** parentKindOf(kind) -> kind induk sah | null (akar). */
export function parentKindOf(kind) {
  const index = HIERARCHY.indexOf(kind);
  if (index <= 0) return null;
  return HIERARCHY[index - 1];
}

/**
 * checkParent({ kind, parent, teacherSub }) -> null | { problem }
 *
 * `parent` = baris node induk yang SUDAH DIBACA dari D1 (atau null). Fungsi ini
 * sengaja tidak membaca sendiri: kepemilikan induk harus diperiksa atas baris
 * yang benar-benar ada di database, bukan atas ID yang dikirim klien.
 *
 * Pemeriksaan `parent.teacher_sub !== teacherSub` adalah penahan IDOR (§28):
 * tanpa itu, guru B bisa menggantungkan lesson miliknya di bawah subject milik
 * guru A dan dengan begitu membaca posisinya di pohon orang lain.
 */
export function checkParent(input) {
  const kind = input && input.kind;
  if (!NODE_KINDS.includes(kind)) return { problem: CONTENT_PROBLEM.KIND_INVALID };
  const expected = parentKindOf(kind);
  const parent = input.parent || null;
  if (!expected) {
    return parent ? { problem: CONTENT_PROBLEM.PARENT_FORBIDDEN } : null;
  }
  if (!parent) return { problem: CONTENT_PROBLEM.PARENT_REQUIRED };
  if (parent.kind !== expected) return { problem: CONTENT_PROBLEM.PARENT_KIND_MISMATCH };
  if (parent.teacher_sub !== input.teacherSub) {
    return { problem: CONTENT_PROBLEM.PARENT_NOT_OWNED };
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Validasi node                                                               */
/* -------------------------------------------------------------------------- */

/**
 * validateNode(input) -> { ok:true, node, warnings } | { ok:false, problems }
 *
 * Mengembalikan SELURUH masalah, bukan yang pertama. Guru yang mengunggah CSV
 * 200 baris tidak boleh harus mengulang unggah tujuh kali untuk menemukan tujuh
 * kesalahan di baris yang sama.
 */
export function validateNode(input, nowMs) {
  const problems = [];
  const warnings = [];
  const raw = input || {};

  const kind = typeof raw.kind === 'string' ? raw.kind.trim().toLowerCase() : '';
  if (!NODE_KINDS.includes(kind)) problems.push({ problem: CONTENT_PROBLEM.KIND_INVALID });

  const title = cleanText(raw.title, LIMITS.TITLE_MAX);
  if (!title) problems.push({ problem: CONTENT_PROBLEM.TITLE_EMPTY });
  else if (typeof raw.title === 'string' && raw.title.trim().length > LIMITS.TITLE_MAX) {
    problems.push({ problem: CONTENT_PROBLEM.TITLE_TOO_LONG });
  }

  const description = cleanText(raw.description, LIMITS.DESCRIPTION_MAX);
  if (typeof raw.description === 'string' && raw.description.trim().length > LIMITS.DESCRIPTION_MAX) {
    problems.push({ problem: CONTENT_PROBLEM.DESCRIPTION_TOO_LONG });
  }

  const objective = cleanText(raw.objective, LIMITS.OBJECTIVE_MAX);
  if (typeof raw.objective === 'string' && raw.objective.trim().length > LIMITS.OBJECTIVE_MAX) {
    problems.push({ problem: CONTENT_PROBLEM.OBJECTIVE_TOO_LONG });
  }

  // skill/level/difficulty WAJIB pada lesson (Braincore membacanya), OPSIONAL di
  // atasnya: sebuah subject "English for Hospitality" tidak punya satu CEFR.
  const requiresPedagogy = kind === NODE_KIND.LESSON;

  let skill = null;
  if (raw.skill !== undefined && raw.skill !== null && raw.skill !== '') {
    const parsed = normalizeSkill(raw.skill);
    if (!parsed) problems.push({ problem: CONTENT_PROBLEM.SKILL_INVALID });
    else {
      skill = parsed.skill;
      if (parsed.normalized) warnings.push({ field: 'skill', from: String(raw.skill), to: skill });
    }
  } else if (requiresPedagogy) {
    problems.push({ problem: CONTENT_PROBLEM.SKILL_INVALID });
  }

  let level = null;
  if (raw.level !== undefined && raw.level !== null && raw.level !== '') {
    const parsed = normalizeLevel(raw.level);
    if (!parsed) problems.push({ problem: CONTENT_PROBLEM.LEVEL_INVALID });
    else {
      level = parsed.level;
      if (parsed.normalized) warnings.push({ field: 'level', from: String(raw.level), to: level });
    }
  } else if (requiresPedagogy) {
    problems.push({ problem: CONTENT_PROBLEM.LEVEL_INVALID });
  }

  let difficulty = DIFFICULTY.DEFAULT;
  if (raw.difficulty !== undefined && raw.difficulty !== null && raw.difficulty !== '') {
    const parsed = normalizeDifficulty(raw.difficulty);
    if (parsed === null) problems.push({ problem: CONTENT_PROBLEM.DIFFICULTY_INVALID });
    else difficulty = parsed;
  }

  let durationMin = 0;
  if (raw.durationMin !== undefined && raw.durationMin !== null && raw.durationMin !== '') {
    const value = Number(raw.durationMin);
    if (!Number.isInteger(value) || value < 0 || value > LIMITS.DURATION_MAX_MIN) {
      problems.push({ problem: CONTENT_PROBLEM.DURATION_INVALID });
    } else durationMin = value;
  }

  const tags = cleanTags(raw.tags);
  if (tags.length > LIMITS.TAGS_MAX) problems.push({ problem: CONTENT_PROBLEM.TAGS_TOO_MANY });

  const vocabulary = Array.isArray(raw.vocabulary)
    ? raw.vocabulary.map((v) => cleanText(v, LIMITS.TAG_MAX)).filter(Boolean).slice(0, LIMITS.VOCAB_MAX)
    : cleanTags(raw.vocabulary).slice(0, LIMITS.VOCAB_MAX);

  const status = typeof raw.status === 'string' ? raw.status.trim().toUpperCase() : CONTENT_STATUS.DRAFT;
  if (!Object.values(CONTENT_STATUS).includes(status)) {
    problems.push({ problem: CONTENT_PROBLEM.STATUS_INVALID });
  }

  if (problems.length) return { ok: false, problems, warnings };

  return {
    ok: true,
    warnings,
    node: {
      kind,
      title,
      description,
      objective,
      skill,
      level,
      difficulty,
      duration_min: durationMin,
      tags,
      vocabulary,
      // Konten guru yang BARU dibuat SELALU lahir sebagai DRAFT (§13 "jangan
      // langsung terbitkan konten impor yang belum tervalidasi"). Status yang
      // dikirim klien hanya dihormati untuk pembaruan, dan bahkan di sana ia
      // lewat `checkTransition`, bukan ditulis langsung.
      status: CONTENT_STATUS.DRAFT,
      content_source: CONTENT_SOURCE.TEACHER,
      updated_at: Number(nowMs) || 0
    }
  };
}

/* -------------------------------------------------------------------------- */
/* Validasi soal                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Tipe soal yang butuh daftar opsi. `speaking_prompt` dan `short_answer` tidak:
 * keduanya dinilai terhadap jawaban acuan, bukan terhadap pilihan.
 */
const OPTION_TYPES = Object.freeze([
  QUESTION_TYPE.MCQ, QUESTION_TYPE.LISTENING_MCQ, QUESTION_TYPE.MATCHING, QUESTION_TYPE.ORDERING
]);

export function questionNeedsOptions(type) {
  return OPTION_TYPES.includes(type);
}

/**
 * validateQuestion(input, nowMs) -> { ok, question, warnings } | { ok:false, problems }
 *
 * Aturan yang paling penting dan paling mudah dilewatkan: untuk tipe berpilihan,
 * jawaban benar WAJIB ada DI DALAM daftar opsi. Soal yang jawabannya di luar
 * opsi tidak bisa dijawab benar oleh murid mana pun, jadi ia menghasilkan bukti
 * "seluruh kelas gagal" yang PALSU — dan Braincore mempercayainya, lalu
 * menurunkan estimasi penguasaan seluruh kelas atas keterampilan itu. Satu soal
 * rusak mencemari model belajar banyak murid; itu sebabnya ini ERROR, bukan
 * WARNING.
 */
export function validateQuestion(input, nowMs) {
  const problems = [];
  const warnings = [];
  const raw = input || {};

  const type = normalizeQuestionType(raw.type);
  if (!type) problems.push({ problem: CONTENT_PROBLEM.QUESTION_TYPE_INVALID });

  const stem = cleanText(raw.stem, LIMITS.STEM_MAX);
  if (!stem) problems.push({ problem: CONTENT_PROBLEM.QUESTION_STEM_EMPTY });
  else if (typeof raw.stem === 'string' && raw.stem.trim().length > LIMITS.STEM_MAX) {
    problems.push({ problem: CONTENT_PROBLEM.QUESTION_STEM_TOO_LONG });
  }

  const rawOptions = Array.isArray(raw.options)
    ? raw.options
    : String(raw.options || '').split('|');
  const options = rawOptions.map((o) => cleanText(o, LIMITS.OPTION_MAX)).filter((o) => o !== '');

  if (type && questionNeedsOptions(type)) {
    if (options.length < LIMITS.OPTIONS_MIN) {
      problems.push({ problem: CONTENT_PROBLEM.QUESTION_OPTIONS_TOO_FEW });
    }
    if (options.length > LIMITS.OPTIONS_MAX) {
      problems.push({ problem: CONTENT_PROBLEM.QUESTION_OPTIONS_TOO_MANY });
    }
    if (rawOptions.length !== options.length && rawOptions.some((o) => String(o).trim() === '')) {
      problems.push({ problem: CONTENT_PROBLEM.QUESTION_OPTION_EMPTY });
    }
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
      problems.push({ problem: CONTENT_PROBLEM.QUESTION_OPTION_DUPLICATE });
    }
  }

  const answer = cleanText(raw.answer, LIMITS.OPTION_MAX);
  if (!answer) problems.push({ problem: CONTENT_PROBLEM.QUESTION_ANSWER_MISSING });
  else if (type && questionNeedsOptions(type) && options.length
           && !options.some((o) => o.toLowerCase() === answer.toLowerCase())) {
    problems.push({ problem: CONTENT_PROBLEM.QUESTION_ANSWER_NOT_IN_OPTIONS });
  }

  let skill = null;
  if (raw.skill !== undefined && raw.skill !== null && raw.skill !== '') {
    const parsed = normalizeSkill(raw.skill);
    if (!parsed) problems.push({ problem: CONTENT_PROBLEM.SKILL_INVALID });
    else {
      skill = parsed.skill;
      if (parsed.normalized) warnings.push({ field: 'skill', from: String(raw.skill), to: skill });
    }
  } else problems.push({ problem: CONTENT_PROBLEM.SKILL_INVALID });

  let level = null;
  if (raw.level !== undefined && raw.level !== null && raw.level !== '') {
    const parsed = normalizeLevel(raw.level);
    if (!parsed) problems.push({ problem: CONTENT_PROBLEM.LEVEL_INVALID });
    else {
      level = parsed.level;
      if (parsed.normalized) warnings.push({ field: 'level', from: String(raw.level), to: level });
    }
  } else problems.push({ problem: CONTENT_PROBLEM.LEVEL_INVALID });

  let difficulty = DIFFICULTY.DEFAULT;
  if (raw.difficulty !== undefined && raw.difficulty !== null && raw.difficulty !== '') {
    const parsed = normalizeDifficulty(raw.difficulty);
    if (parsed === null) problems.push({ problem: CONTENT_PROBLEM.DIFFICULTY_INVALID });
    else difficulty = parsed;
  }

  const lessonId = typeof raw.lessonId === 'string' ? raw.lessonId.trim() : '';
  if (!lessonId) problems.push({ problem: CONTENT_PROBLEM.QUESTION_LESSON_MISSING });

  const tags = cleanTags(raw.tags);
  if (tags.length > LIMITS.TAGS_MAX) problems.push({ problem: CONTENT_PROBLEM.TAGS_TOO_MANY });

  if (problems.length) return { ok: false, problems, warnings };

  return {
    ok: true,
    warnings,
    question: {
      lesson_id: lessonId,
      type,
      stem,
      options,
      answer,
      explanation: cleanText(raw.explanation, LIMITS.EXPLANATION_MAX),
      example: cleanText(raw.example, LIMITS.EXPLANATION_MAX),
      skill,
      level,
      difficulty,
      tags,
      status: CONTENT_STATUS.DRAFT,
      content_source: CONTENT_SOURCE.TEACHER,
      updated_at: Number(nowMs) || 0
    }
  };
}

/* -------------------------------------------------------------------------- */
/* Terbit & versi                                                              */
/* -------------------------------------------------------------------------- */

/** checkTransition(from, to) -> null | { problem } */
export function checkTransition(from, to) {
  const source = String(from || '').toUpperCase();
  const target = String(to || '').toUpperCase();
  if (!Object.values(CONTENT_STATUS).includes(source)) return { problem: CONTENT_PROBLEM.STATUS_INVALID };
  if (!Object.values(CONTENT_STATUS).includes(target)) return { problem: CONTENT_PROBLEM.STATUS_INVALID };
  const allowed = PUBLISH_TRANSITIONS[source] || [];
  return allowed.includes(target) ? null : { problem: CONTENT_PROBLEM.TRANSITION_INVALID };
}

/**
 * checkPublishReady({ node, questions, ancestors }) -> null | { problem, detail? }
 *
 * §14 menuntut VALIDATE sebelum PUBLISH, dan "validasi" di sini punya arti yang
 * spesifik dan bisa gagal:
 *   (a) lesson tanpa satu pun soal tidak boleh terbit — murid akan membukanya
 *       dan menemukan halaman kosong, lalu menganggap aplikasinya rusak;
 *   (b) setiap soal di dalamnya WAJIB lolos validateQuestion LAGI. Soal bisa
 *       lolos saat disimpan lalu menjadi tidak sah karena enum berubah, dan
 *       titik terbit adalah gerbang terakhir sebelum murid melihatnya;
 *   (c) induk yang masih DRAFT memblokir penerbitan anak. Lesson terbit di
 *       bawah subject draft adalah konten yang tidak punya jalan navigasi —
 *       ia ada di database tetapi tidak bisa dicapai murid mana pun.
 */
export function checkPublishReady(input) {
  const node = (input && input.node) || null;
  if (!node) return { problem: CONTENT_PROBLEM.NOT_FOUND };

  const ancestors = Array.isArray(input.ancestors) ? input.ancestors : [];
  for (const ancestor of ancestors) {
    if (ancestor && ancestor.status !== CONTENT_STATUS.PUBLISHED) {
      return { problem: CONTENT_PROBLEM.PUBLISH_PARENT_DRAFT, detail: ancestor.id };
    }
  }

  if (node.kind !== NODE_KIND.LESSON) return null;

  const questions = Array.isArray(input.questions) ? input.questions : [];
  if (!questions.length) return { problem: CONTENT_PROBLEM.PUBLISH_NO_QUESTIONS };

  for (const question of questions) {
    const verdict = validateQuestion({ ...question, lessonId: question.lesson_id || node.id }, 0);
    if (!verdict.ok) {
      return {
        problem: CONTENT_PROBLEM.PUBLISH_QUESTION_INVALID,
        detail: question.id,
        problems: verdict.problems
      };
    }
  }
  return null;
}

/**
 * nextVersion(current) -> versi berikutnya.
 * Versi naik pada setiap TULIS yang mengubah isi, bukan pada perubahan status:
 * "diterbitkan" bukan isi baru, dan menaikkan versi karenanya membuat riwayat
 * versi berbohong tentang berapa kali materi benar-benar disunting.
 */
export function nextVersion(current) {
  const value = Number(current);
  return Number.isInteger(value) && value > 0 ? value + 1 : 1;
}

/**
 * versionStamp({ record, actorSub, nowMs, isCreate }) -> bidang versi (§13).
 * `created_by`/`created_at` TIDAK PERNAH ditulis ulang pada pembaruan: itulah
 * yang membuat kolom itu berguna sebagai jejak.
 */
export function versionStamp(input) {
  const now = Number(input && input.nowMs) || 0;
  const actor = (input && input.actorSub) || '';
  if (input && input.isCreate) {
    return { version: 1, created_at: now, created_by: actor, updated_at: now, updated_by: actor };
  }
  const record = (input && input.record) || {};
  return {
    version: nextVersion(record.version),
    created_at: Number(record.created_at) || now,
    created_by: record.created_by || actor,
    updated_at: now,
    updated_by: actor
  };
}

/* -------------------------------------------------------------------------- */
/* Lingkup & kepemilikan (§18)                                                 */
/* -------------------------------------------------------------------------- */

/** Lingkup keterlihatan konten guru. */
export const SCOPE = Object.freeze({
  PRIVATE: 'private',
  INSTITUTION: 'institution'
});

/**
 * canTeacherRead(node, viewer) -> boolean.
 *
 * Guru A TIDAK melihat konten privat guru B, TITIK. Berbagi se-institusi HARUS
 * eksplisit (`scope === 'institution'`) — mandat §18 "if content is shared
 * institution-wide, that must be explicit". Default `SCOPE.PRIVATE` dipilih
 * karena default yang salah di sini bocor senyap: guru tidak akan pernah tahu
 * materinya terbaca sampai seseorang memberitahunya.
 */
export function canTeacherRead(node, viewer) {
  if (!node || !viewer) return false;
  if (node.teacher_sub === viewer.sub) return true;
  if (node.scope !== SCOPE.INSTITUTION) return false;
  if (!node.institution_id || !viewer.institutionId) return false;
  return node.institution_id === viewer.institutionId;
}

/** canTeacherWrite — HANYA pemilik. Berbagi institusi adalah BACA, bukan tulis. */
export function canTeacherWrite(node, viewer) {
  if (!node || !viewer) return false;
  return node.teacher_sub === viewer.sub;
}

/**
 * canLearnerSee(node, learner) -> boolean.
 *
 * Dua syarat, dan keduanya perlu (§5 "jangan otomatis paparkan materi guru ke
 * semua murid FIEZEL"): konten WAJIB berstatus PUBLISHED, DAN murid WAJIB ada
 * di daftar penerima penugasan. Status saja tidak cukup — "terbit" berarti siap,
 * bukan publik.
 */
export function canLearnerSee(node, learner) {
  if (!node || !learner) return false;
  if (node.status !== CONTENT_STATUS.PUBLISHED) return false;
  const assigned = Array.isArray(learner.assignedNodeIds) ? learner.assignedNodeIds : [];
  return assigned.includes(node.id);
}

/**
 * publicNodeView(node) -> bentuk yang aman dikirim ke MURID.
 * Sengaja membuang `teacher_sub`, `institution_id`, `created_by`, `updated_by`
 * dan seluruh jejak kepemilikan: murid tidak butuh pengenal internal guru, dan
 * pengenal yang tidak dikirim tidak bisa dipakai untuk menebak endpoint lain.
 */
export function publicNodeView(node) {
  if (!node) return null;
  return {
    id: node.id,
    kind: node.kind,
    title: node.title,
    description: node.description || '',
    objective: node.objective || '',
    skill: node.skill || null,
    level: node.level || null,
    difficulty: node.difficulty || DIFFICULTY.DEFAULT,
    durationMin: node.duration_min || 0,
    vocabulary: Array.isArray(node.vocabulary) ? node.vocabulary : [],
    contentSource: CONTENT_SOURCE.TEACHER
  };
}
