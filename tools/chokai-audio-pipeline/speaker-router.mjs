/**
 * tools/chokai-audio-pipeline/speaker-router.mjs
 * 
 * Pengklasifikasi peran dan gender pembicara untuk naskah dialog JLPT Chokai.
 * Memetakan setiap baris percakapan dan narasi instruksi ke 3 peran vokal standar:
 * - INSTRUCTOR: Pria dewasa tegas, berwibawa (Penyiar / Pemberi Soal)
 * - MALE_STUDENT: Pemuda / Mahasiswa laki-laki
 * - FEMALE_STUDENT: Mahasiswi / Wanita
 */

export const ROLES = {
  INSTRUCTOR: 'INSTRUCTOR',
  MALE: 'MALE_STUDENT',
  FEMALE: 'FEMALE_STUDENT'
};

const MALE_LABELS = [
  '男の人', '男', '男の子', '学生（男）', '男子学生', '彼', 'お父さん', '父',
  '店長', '医者', '駅員', '部長', '課長', 'ジョン', '田中（男）', '佐藤（男）'
];

const FEMALE_LABELS = [
  '女の人', '女', '女の子', '学生（女）', '女子学生', '彼女', 'お母さん', '母',
  '受付', '先生', 'アルバイト', '山田', '患者', '店員（女）', '田中（女）'
];

/**
 * Memetakan tag nama pembicara ke peran vokal
 * @param {string} speakerTag - Nama label sebelum titik dua (contoh: "男の人", "先生", "学生")
 * @param {number} lineIndex - Urutan baris untuk resolusi jika tag ambigu
 * @returns {string} Salah satu dari ROLES.INSTRUCTOR, ROLES.MALE, ROLES.FEMALE
 */
export function classifySpeaker(speakerTag, lineIndex = 0) {
  if (!speakerTag) return ROLES.INSTRUCTOR;
  const tag = speakerTag.trim();

  if (tag.includes('ナレーター') || tag.includes('指示') || tag.includes('問題')) {
    return ROLES.INSTRUCTOR;
  }

  for (const m of MALE_LABELS) {
    if (tag.includes(m)) return ROLES.MALE;
  }

  for (const f of FEMALE_LABELS) {
    if (tag.includes(f)) return ROLES.FEMALE;
  }

  // Tag umum "学生" jika berpasangan dengan "先生"
  if (tag.includes('学生')) {
    return ROLES.MALE; // default mahasiswa
  }

  // Fallback: genap = Pria, ganjil = Wanita agar dialog selalu kontras
  return (lineIndex % 2 === 0) ? ROLES.MALE : ROLES.FEMALE;
}

/**
 * Mem-parse teks naskah dialog utuh menjadi segmen-segmen ujaran berkarakter
 * @param {object} item - Item soal dari jlpt-listening-bank-v1.json
 * @returns {Array<{ role: string, speaker: string, text: string, type: 'intro'|'dialogue'|'question' }>}
 */
export function parseScriptToTurns(item) {
  const turns = [];

  // 1. Babak 1: Intro Instruksi / Situasi (oleh Narator / Instruktor)
  const mondaiNum = (item.mondai || '').replace(/^mondai_/, '');
  const introText = item.situation
    ? `問題${mondaiNum || '一'}。状況を聞いてください。`
    : `問題${mondaiNum || '一'}。まず話を聞いてください。`;
  turns.push({
    role: ROLES.INSTRUCTOR,
    speaker: 'Instruktor',
    text: introText,
    type: 'intro'
  });

  // 2. Babak 2: Percakapan Dialog (Multi-Karakter)
  const rawScript = item.scriptJapanese || '';
  const lines = rawScript.split('\n').map(l => l.trim()).filter(Boolean);

  let maleCount = 0;
  let femaleCount = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const colonMatch = line.match(/^([^：:]+)[：:]([\s\S]+)$/);

    if (colonMatch) {
      const speakerTag = colonMatch[1].trim();
      const dialogueText = colonMatch[2].trim();
      let role = classifySpeaker(speakerTag, idx);

      // Pastikan kedua karakter pria & wanita hadir jika ada 2 pembicara berbeda
      if (role === ROLES.MALE) maleCount++;
      if (role === ROLES.FEMALE) femaleCount++;

      turns.push({
        role,
        speaker: speakerTag,
        text: dialogueText,
        type: 'dialogue'
      });
    } else {
      // Baris tanpa titik dua: diperlakukan sebagai narasi instruktor
      turns.push({
        role: ROLES.INSTRUCTOR,
        speaker: 'Instruktor',
        text: line,
        type: 'dialogue'
      });
    }
  }

  // 3. Babak 3: Pertanyaan Soal (oleh Instruktor)
  if (item.questionJapanese) {
    turns.push({
      role: ROLES.INSTRUCTOR,
      speaker: 'Instruktor',
      text: item.questionJapanese.trim(),
      type: 'question'
    });
  }

  return turns;
}
