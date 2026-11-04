import {
  BraincoreStoreState,
  CallScenario,
  CallTurn,
  ChronicGrammarWeakness,
  CompetencyRecord,
  DualBrainMemoryState,
  LearnerCharacterArchetype,
  LearnerLocale,
  MasteryStateName,
  MentorSessionMemoryEntry,
  MisconceptionLedgerEntry,
  SpeakingSessionMetric,
  TargetLang,
} from '../types/voiceCall';

/**
 * Canonical parameters from coordination/braincore-contract.json
 */
export const BRAINCORE_PARAMS = {
  P_INIT: 0.25,
  P_LEARN: 0.18,
  P_SLIP: 0.10,
  P_GUESS: 0.20,
  MASTERY_T: 0.80,
  DEVELOPING_T: 0.60,
  MIN_CORRECT_FOR_MASTERY: 3,
  RETENTION_DAYS: 3,
  DISCRIMINATION: 1.5,
  GUESS_FLOOR: 0.25,
  TARGET_SUCCESS: 0.80,
  HALF_LIFE_DAYS: 30.0,
} as const;

const STORAGE_KEY = 'fiezel-braincore-voice-v1';
const TAB_ID = `tab_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

let studioNonce: string | null = null;
let studioSeq: number = 0;

export function getStudioNonce(): string {
  if (studioNonce !== null) return studioNonce;
  try {
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      studioNonce = params.get('nonce') || '';
    }
  } catch {
    studioNonce = '';
  }
  return studioNonce || '';
}

/**
 * IRT 3PL Success Probability: P = c + (1 - c) / (1 + exp(-a * (theta - b)))
 */
export function successProbability(
  ability: number,
  difficulty: number,
  discrimination: number = BRAINCORE_PARAMS.DISCRIMINATION
): number {
  const a = Math.max(0.01, Number(discrimination || BRAINCORE_PARAMS.DISCRIMINATION));
  const diff = Number(ability || 0) - Number(difficulty || 0);
  const z = -a * diff;
  let latent: number;
  if (z > 40.0) {
    latent = 0.0;
  } else if (z < -40.0) {
    latent = 1.0;
  } else {
    latent = 1.0 / (1.0 + Math.exp(z));
  }
  return BRAINCORE_PARAMS.GUESS_FLOOR + (1.0 - BRAINCORE_PARAMS.GUESS_FLOOR) * latent;
}

/**
 * IRT 3PL Inverse: b = theta - logit((p - c) / (1 - c)) / a
 */
export function optimalDifficulty(
  ability: number,
  targetSuccess: number = BRAINCORE_PARAMS.TARGET_SUCCESS,
  discrimination: number = BRAINCORE_PARAMS.DISCRIMINATION
): number {
  const p = Math.max(BRAINCORE_PARAMS.GUESS_FLOOR + 0.05, Math.min(0.97, Number(targetSuccess)));
  const a = Math.max(0.01, Number(discrimination));
  const latent = Math.max(
    0.01,
    Math.min(0.99, (p - BRAINCORE_PARAMS.GUESS_FLOOR) / (1.0 - BRAINCORE_PARAMS.GUESS_FLOOR))
  );
  return Number((Number(ability || 0) - Math.log(latent / (1.0 - latent)) / a).toFixed(3));
}

/**
 * Canonical Theta mapping: 1.0 + 4.0 * clamp(p, 0, 1)
 */
export function abilityThetaFromMastery(pMastery: number): number {
  const clamped = Math.max(0.0, Math.min(1.0, Number(pMastery || BRAINCORE_PARAMS.P_INIT)));
  return Number((1.0 + 4.0 * clamped).toFixed(2));
}

/**
 * Exponential forgetting model BKT-FSRS: L(t) = L_0 + (L_last - L_0) * exp(-dt / tau)
 */
export function bktDecay(
  p: number | null | undefined,
  elapsedDays: number,
  halfLifeDays: number = BRAINCORE_PARAMS.HALF_LIFE_DAYS
): number {
  let pVal = Number(p ?? BRAINCORE_PARAMS.P_INIT);
  if (Number.isNaN(pVal) || !Number.isFinite(pVal)) {
    pVal = BRAINCORE_PARAMS.P_INIT;
  }
  const dt = Number(elapsedDays || 0);
  if (Number.isNaN(dt) || !Number.isFinite(dt) || dt <= 0 || pVal <= BRAINCORE_PARAMS.P_INIT) {
    return Number(pVal.toFixed(4));
  }
  const tau = Math.max(1.0, halfLifeDays) / Math.LN2;
  const decayRatio = Math.exp(-Math.min(50.0, dt / tau));
  const decayed = BRAINCORE_PARAMS.P_INIT + (pVal - BRAINCORE_PARAMS.P_INIT) * decayRatio;
  return Number(Math.max(0.01, Math.min(0.99, decayed)).toFixed(4));
}

/**
 * Classical BKT step (Bayes posterior + learning transition)
 */
export function bktStep(
  p: number,
  correct: boolean,
  slip: number = BRAINCORE_PARAMS.P_SLIP,
  guess: number = BRAINCORE_PARAMS.P_GUESS,
  learn: number = BRAINCORE_PARAMS.P_LEARN
): number {
  let pVal = Number(p ?? BRAINCORE_PARAMS.P_INIT);
  if (Number.isNaN(pVal) || !Number.isFinite(pVal)) {
    pVal = BRAINCORE_PARAMS.P_INIT;
  }
  pVal = Math.max(0.001, Math.min(0.999, pVal));
  const s = Math.max(0.01, Math.min(0.49, slip));
  const g = Math.max(0.01, Math.min(0.49, guess));
  const l = Math.max(0.0, Math.min(0.50, learn));

  const num = correct ? pVal * (1.0 - s) : pVal * s;
  const den = correct ? num + (1.0 - pVal) * g : num + (1.0 - pVal) * (1.0 - g);
  const post = den > 0 ? num / den : pVal;
  return post + (1.0 - post) * l;
}

/**
 * Behavioral BKT update (hints weaken positive evidence; low confidence increases guess; high confidence on error reduces slip)
 */
export function bktUpdate(
  p: number,
  correct: boolean,
  hints: number = 0,
  confidence: number = 0.8
): number {
  let slip: number = BRAINCORE_PARAMS.P_SLIP;
  let guess: number = BRAINCORE_PARAMS.P_GUESS;
  const h = Math.max(0, Math.floor(hints || 0));
  if (h > 0 && correct) {
    slip = Math.min(0.35, BRAINCORE_PARAMS.P_SLIP + 0.08 * h);
  }
  if (typeof confidence === 'number' && !Number.isNaN(confidence)) {
    if (correct && confidence <= 0.34) {
      guess = Math.min(0.45, guess + 0.15);
    }
    if (!correct && confidence >= 0.9) {
      slip = Math.max(0.04, slip - 0.05);
    }
  }
  return Number(
    Math.max(0.01, Math.min(0.99, bktStep(p, correct, slip, guess, BRAINCORE_PARAMS.P_LEARN))).toFixed(4)
  );
}

export function deriveMasteryState(rec: CompetencyRecord): MasteryStateName {
  if (rec.attempts === 0) {
    return rec.exposures === 0 ? 'NOT_EXPOSED' : 'EXPOSED';
  }
  const pVal = rec.pMasteryDecayed ?? rec.pMastery ?? BRAINCORE_PARAMS.P_INIT;
  const stillMastered =
    pVal >= BRAINCORE_PARAMS.MASTERY_T && rec.correct >= BRAINCORE_PARAMS.MIN_CORRECT_FOR_MASTERY;
  if (rec.transferredAt && stillMastered) return 'TRANSFERRED';
  if (rec.retainedAt && stillMastered) return 'RETAINED';
  if (stillMastered) return 'MASTERED';
  if (pVal >= BRAINCORE_PARAMS.DEVELOPING_T) return 'DEVELOPING';
  if (rec.attempts >= 2) return 'PRACTICING';
  return 'EXPOSED';
}

export function createBlankCompetency(
  competencyId: string,
  initialMastery: number = BRAINCORE_PARAMS.P_INIT,
  initialAttempts: number = 0,
  initialCorrect: number = 0
): CompetencyRecord {
  const rec: CompetencyRecord = {
    competencyId,
    pMastery: initialMastery,
    pMasteryDecayed: initialMastery,
    state: 'NOT_EXPOSED',
    exposures: initialAttempts > 0 ? initialAttempts : 1,
    attempts: initialAttempts,
    correct: initialCorrect,
    streak: initialCorrect,
    hintsUsed: 0,
    stabilityDays: initialMastery >= 0.8 ? 7.0 : 2.0,
    lastAt: initialAttempts > 0 ? Date.now() - 3600_000 : null,
    masteredAt: initialMastery >= 0.8 ? Date.now() - 86400_000 : null,
    retainedAt: null,
    transferredAt: null,
  };
  rec.state = deriveMasteryState(rec);
  return rec;
}

export function getDefaultSpeakingHistory(): SpeakingSessionMetric[] {
  return [];
}

const COMPETENCY_HUMAN_LABELS: Record<string, { id: string; th: string; lang: TargetLang }> = {
  vocab_daily_a2: { id: 'Kosakata Harian & Aktivitas Rutin (En)', th: 'คำศัพท์ในชีวิตประจำวัน (En)', lang: 'en' },
  vocab_travel_a2: { id: 'Kosakata Perjalanan & Pengalaman Lampau (En)', th: 'คำศัพท์การเดินทางและอดีต (En)', lang: 'en' },
  vocab_academic_b1: { id: 'Kosakata Diskusi & Kerja Profesional (En)', th: 'คำศัพท์การทำงานและการอภิปราย (En)', lang: 'en' },
  vocab_ja_cafe_n5: { id: 'Kosakata Kafe & Pemesanan Dasar Jepang', th: 'คำศัพท์ร้านกาแฟและการสั่งอาหารญี่ปุ่น', lang: 'ja' },
  vocab_ja_campus_n4: { id: 'Kosakata Kehidupan Kampus & Konsultasi Jepang', th: 'คำศัพท์ชีวิตมหาวิทยาลัยญี่ปุ่น', lang: 'ja' },
  speak_en_a2_cafe: { id: 'Speaking Transaksi Sopan (Would like) & Present Continuous', th: 'การสั่งอย่างสุภาพและ Present Continuous', lang: 'en' },
  speak_en_a2_past_trip: { id: 'Speaking Narasi Masa Lampau & Irregular Past Verbs', th: 'การเล่าเรื่องในอดีตและ Irregular Verbs', lang: 'en' },
  speak_en_b1_job_interview: { id: 'Speaking Wawancara Kerja & Present Perfect Experience', th: 'การสัมภาษณ์งานและ Present Perfect', lang: 'en' },
  speak_en_b2_ielts_part3: { id: 'Speaking Argumentasi Terstruktur & Klausa Kompleks (Although/Whereas)', th: 'การโต้แย้งเชิงลึกและประโยคซับซ้อน', lang: 'en' },
  speak_en_free_talk: { id: 'Speaking Spontanitas Percakapan Bebas (En)', th: 'การสนทนาภาษาอังกฤษอย่างเป็นธรรมชาติ', lang: 'en' },
  speak_ja_n5_kissaten: { id: 'Kaiwa Pemesanan Sopan (～をください) & Partikel Objek を', th: 'การสั่งอาหารสุภาพและคำช่วย を', lang: 'ja' },
  speak_ja_n4_senpai_advice: { id: 'Kaiwa Konsultasi (～たらいいですか) & Partikel Aksi で vs に', th: 'การขอคำปรึกษาและคำช่วย で vs に', lang: 'ja' },
  speak_ja_free_talk: { id: 'Kaiwa Spontanitas Obrolan Jepang Natural', th: 'การสนทนาภาษาญี่ปุ่นแบบธรรมชาติ', lang: 'ja' },
  'jp-n5-particles-wa-ga': { id: 'Partikel Dasar は / が / を', th: 'คำช่วยพื้นฐาน は / が / を', lang: 'ja' },
  'jp-n5-verb-masu': { id: 'Konjugasi Kata Kerja Sopan (〜ます / 〜ました)', th: 'การผันกริยารูปสุภาพ (〜ます / 〜ました)', lang: 'ja' },
  'jp-n5-adjective-desu': { id: 'Kata Sifat い & な (〜いです / 〜かったです)', th: 'คำคุณศัพท์ い & な (〜いです / 〜かったです)', lang: 'ja' },
  'jp-n4-tara-conditional': { id: 'Pola Pengandaian & Saran (〜たら / 〜ば)', th: 'รูปเงื่อนไขและคำแนะนำ (〜たら / 〜ば)', lang: 'ja' },
  'en-a2-past-simple': { id: 'Simple Past Tense & Irregular Verbs (V2)', th: 'Simple Past Tense & Irregular Verbs (V2)', lang: 'en' },
  'en-a2-present-continuous': { id: 'Present Continuous & Stative Verbs', th: 'Present Continuous & Stative Verbs', lang: 'en' },
  'en-b1-present-perfect': { id: 'Present Perfect & Pengalaman Kerja', th: 'Present Perfect & ประสบการณ์ทำงาน', lang: 'en' },
};

const MISCONCEPTION_HUMAN_LABELS: Record<
  string,
  { id: string; th: string; fix: string; lang?: TargetLang }
> = {
  polite_past_masu_deshita: {
    id: 'Menggabungkan ～ます + でした untuk lampau (misal ×食べますでした)',
    th: 'ใช้ ～ます + でした ซ้อนกันในรูปอดีต (เช่น ×食べますでした)',
    fix: 'Gunakan bentuk ～ました langsung (✓食べました / ✓行きました)',
    lang: 'ja',
  },
  verb_plus_desu: {
    id: 'Menempelkan です langsung setelah kata kerja bentuk kamus (×行くです / ×飲むです)',
    th: 'วาง です ต่อท้ายกริยารูปพจนานุกรมโดยตรง (×行くです / ×飲むです)',
    fix: 'Konjugasikan ke ～ます (sopan) atau pakai bentuk kasual murni tanpa です',
    lang: 'ja',
  },
  i_adj_past_deshita: {
    id: 'Mengubah kata sifat-い lampau dengan でした (×美味しいでした / ×いいでした)',
    th: 'ผันคำคุณศัพท์ -い รูปอดีตด้วย でした (×美味しいでした)',
    fix: 'Ubah akhiran い → かったです (✓美味しかったです / ✓よかったです)',
    lang: 'ja',
  },
  particle_confusion_ni_de: {
    id: 'Tertukar partikel lokasi aksi で dengan に (×図書館に勉強する)',
    th: 'สับสนคำช่วยสถานที่ทำกิจกรรม で กับ に (×図書館に勉強する)',
    fix: 'Tempat berlangsungnya aktivitas aktif WAJIB memakai で (✓図書館で勉強する)',
    lang: 'ja',
  },
  ja_particle_ni_for_action_place: {
    id: 'Partikel Lokasi Aksi (で vs に) — ×図書館に勉強する',
    th: 'คำช่วยสถานที่ทำกิจกรรม (で vs に) — ×図書館に勉強する',
    fix: 'Tempat berlangsungnya aktivitas aktif WAJIB memakai で (✓図書館で勉強する)',
    lang: 'ja',
  },
  particle_o_missing: {
    id: 'Lupa atau salah partikel objek langsung を saat meminta/memesan',
    th: 'ตกหล่นหรือใช้คำช่วยกรรมตรง を ผิดเมื่อสั่งของ',
    fix: 'Pasang を di antara benda dan kata kerja/ください (✓コーヒーをください)',
    lang: 'ja',
  },
  tara_conditional_conjugation: {
    id: 'Menempelkan ～たら langsung ke kata kerja kamus (×勉強するたら)',
    th: 'เติม ～たら ต่อท้ายกริยารูปพจนานุกรมโดยตรง (×勉強するたら)',
    fix: 'Ubah ke bentuk lampau た dulu baru + ら (✓勉強したら / ✓行ったら)',
    lang: 'ja',
  },
  overuse_watashi_wa: {
    id: 'Mengulang 私は (watashi wa) di setiap awal kalimat seperti buku teks kaku',
    th: 'พูด 私は (watashi wa) ซ้ำทุกประโยคจนฟังดูแข็งทื่อ',
    fix: 'Tanggalkan 私は bila subjek sudah jelas dari konteks percakapan',
    lang: 'ja',
  },
  stative_verb_continuous: {
    id: 'Memasang to be (am/is/are) di depan kata kerja dasar/statif (×I am want / ×I am agree / ×I\'m think)',
    th: 'ใส่ Verb to be หน้ากริยาพื้นฐานหรือกริยาบอกสถานะ (×I am want / ×I am agree)',
    fix: 'Langsung subjek + kata kerja aktif (✓I\'d like / ✓I agree / ✓I think)',
    lang: 'en',
  },
  be_plus_base_verb: {
    id: 'Mencampur to be (am/is/are) dengan kata kerja dasar (×I am agree / ×It is look)',
    th: 'ใช้ Verb to be คู่กับกริยาช่อง 1 โดยตรง (×I am agree / ×It is look)',
    fix: 'Hapus am/is/are dan sesuaikan kata kerjanya (✓I agree / ✓It looks)',
    lang: 'en',
  },
  missing_be_auxiliary_continuous: {
    id: 'Lupa auxiliary am/is/are sebelum V-ing (×I meeting my friend)',
    th: 'ลืม am/is/are หน้ากริยาเติม -ing (×I meeting my friend)',
    fix: 'Sertakan to be sebelum V-ing (✓I am meeting my friend)',
    lang: 'en',
  },
  past_tense_irregular_goed: {
    id: 'Salah bentuk lampau irregular verb atau lupa V2 (×goed / ×buyed / ×eat yesterday)',
    th: 'ผันกริยาช่อง 2 แบบไม่ปกติผิด หรือลืมผันรูปอดีต (×goed / ×eat yesterday)',
    fix: 'Gunakan Irregular V2 yang tepat (✓went / ✓bought / ✓ate / ✓took)',
    lang: 'en',
  },
  unconjugated_past_verb: {
    id: 'Memakai kata kerja bentuk sekarang (V1) untuk kejadian masa lampau',
    th: 'ใช้กริยาช่อง 1 กับเหตุการณ์ที่จบไปแล้วในอดีต',
    fix: 'Ubah kata kerja ke Simple Past V2 saat menceritakan masa lalu',
    lang: 'en',
  },
  double_conjunction_although_but: {
    id: 'Konjungsi ganda "Although ... but ..." dalam satu kalimat',
    th: 'ใช้คำเชื่อมซ้ำซ้อน "Although ... but ..." ในประโยคเดียวกัน',
    fix: 'Gunakan "Although [klausa 1], [klausa 2]" TANPA "but"',
    lang: 'en',
  },
  possessive_pronoun_mine_noun: {
    id: 'Memakai kata ganti "mine" di depan kata benda (×mine job)',
    th: 'ใช้ "mine" นำหน้าคำนามโดยตรง (×mine job)',
    fix: 'Gunakan possessive determiner "my" sebelum kata benda (✓my job)',
    lang: 'en',
  },
  preposition_collocation_similar_with: {
    id: 'Salah preposisi pasangan kata sifat (×similar with)',
    th: 'ใช้บุพบทคู่กับ similar ผิด (×similar with)',
    fix: 'Pasangan tetapnya adalah "similar to" (✓similar to)',
    lang: 'en',
  },
  modal_plus_to_infinitive: {
    id: 'Menambahkan "to" setelah modal verb can/will/must/should (×can to go)',
    th: 'เติม "to" หลังกริยาช่วย can/will/must/should (×can to go)',
    fix: 'Modal verb langsung diikuti bare infinitive (✓can go / ✓should try)',
    lang: 'en',
  },
};

export function humanizeMisconceptionId(
  misconceptionId: string,
  locale: LearnerLocale = 'id',
  conceptHint?: string
): { label: string; fix: string } {
  const cleanKey = String(misconceptionId || '').trim();
  const known = MISCONCEPTION_HUMAN_LABELS[cleanKey];
  if (known) {
    return {
      label: locale === 'th' ? known.th : known.id,
      fix: known.fix,
    };
  }
  const readable = cleanKey
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const conceptClean = conceptHint
    ? String(conceptHint)
        .replace(/^(speak|vocab|kaiwa)_(en|ja)_[a-z0-9]+_?/i, '')
        .replace(/[_-]+/g, ' ')
        .trim()
    : '';
  const prefix = conceptClean ? `[${conceptClean}] ` : '';
  return {
    label: `${prefix}${readable || 'pola tata bahasa kurang tepat'}`,
    fix: '',
  };
}

export function humanizeCompetencyId(
  competencyId: string,
  locale: LearnerLocale = 'id'
): string {
  const known = COMPETENCY_HUMAN_LABELS[competencyId];
  if (known) {
    return locale === 'th' ? known.th : known.id;
  }
  return String(competencyId || '')
    .replace(/^(lesson|grammar|vocab|speak|kaiwa)[_:-]+/i, '')
    .replace(/[_:-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function getDefaultDualBrainMemory(): DualBrainMemoryState {
  const now = Date.now();
  return {
    userBrain: {
      learnerName: '',
      activeCourseLevel: '',
      characterArchetype: 'balanced_growing',
      characterNoteId:
        'Murid sedang berkembang. Jaga obrolan tetap hidup, tangkap setiap salah grammar seketika, dan pancing keberanian bicara.',
      characterNoteTh:
        'ผู้เรียนกำลังพัฒนา รักษาจังหวะการคุยให้มีชีวิตชีวา แก้ไวยากรณ์ที่ผิดทันที และกระตุ้นความมั่นใจ',
      personalFacts: [],
      verifiedStrengths: [],
      chronicWeaknesses: {},
      updatedAt: now,
    },
    mentorBrain: {
      totalMentoredTurns: 0,
      activeFocusAssignment: '',
      lastRoastTheme: '',
      rapportNotes: [],
      sessionSummaries: [],
      updatedAt: now,
    },
  };
}

const HOST_COMPETENCY_ALIASES: Record<string, string[]> = {
  vocab_daily_a2: ['vocab_daily_a2', 'vocab_en_a2_cafe', 'vocab_en_a2_daily'],
  vocab_travel_a2: ['vocab_travel_a2', 'vocab_en_b1_work', 'vocab_en_a2_past_trip'],
  vocab_academic_b1: ['vocab_academic_b1', 'vocab_en_b2_academic', 'vocab_en_b2_ielts'],
  vocab_ja_cafe_n5: ['vocab_ja_cafe_n5', 'vocab_ja_n5_cafe', 'vocab_ja_n5_kissaten'],
  vocab_ja_campus_n4: ['vocab_ja_campus_n4', 'vocab_ja_n4_campus', 'vocab_ja_n4_senpai'],
  speak_en_a2_cafe: ['speak_en_a2_cafe', 'kaiwa_en_a2_cafe'],
  speak_en_a2_past_trip: ['speak_en_a2_past_trip', 'kaiwa_en_a2_past_trip'],
  speak_en_b1_job_interview: ['speak_en_b1_job_interview', 'kaiwa_en_b1_work'],
  speak_en_b2_ielts_part3: ['speak_en_b2_ielts_part3', 'kaiwa_en_b2_academic'],
  speak_ja_n5_kissaten: ['speak_ja_n5_kissaten', 'kaiwa_ja_n5_kissaten'],
  speak_ja_n4_senpai_advice: ['speak_ja_n4_senpai_advice', 'kaiwa_ja_n4_senpai'],
};

function enumerateMatchingStorageKeys(prefix: string): string[] {
  if (typeof localStorage === 'undefined') return [];
  const keys: string[] = [];
  try {
    const exactCandidates = [prefix, `${prefix}@ja`];
    for (const c of exactCandidates) {
      if (localStorage.getItem(c) !== null && !keys.includes(c)) {
        keys.push(c);
      }
    }
    const len = typeof localStorage.length === 'number' ? localStorage.length : 0;
    for (let i = 0; i < len; i++) {
      const k = localStorage.key ? localStorage.key(i) : null;
      if (k && k.startsWith(prefix) && !keys.includes(k)) {
        keys.push(k);
      }
    }
  } catch {
    // Ignore storage enumeration failure
  }
  return keys;
}

function mergeHostBraincoreMastery(
  competencies: Record<string, CompetencyRecord>
): Record<string, CompetencyRecord> {
  if (typeof localStorage === 'undefined') return competencies;
  try {
    const bktKeys = enumerateMatchingStorageKeys('fiezel-mastery-bkt-v1');
    if (bktKeys.length === 0) return competencies;

    const merged = { ...competencies };
    const applySkillEntry = (targetId: string, entry: any) => {
      if (!entry || typeof entry !== 'object') return;
      const hostP = Number(entry.L ?? entry.p ?? entry.pMastery ?? entry.mastery ?? NaN);
      if (Number.isNaN(hostP) || !Number.isFinite(hostP)) return;
      const clampedP = Number(Math.max(0.01, Math.min(0.99, hostP)).toFixed(4));
      const hostAttempts = Math.max(0, Number(entry.attempts ?? entry.n ?? 0));
      const hostCorrect = Math.max(
        0,
        Number(
          entry.correct ??
            entry.c ??
            (typeof entry.n === 'number' && typeof entry.L === 'number'
              ? Math.round(entry.n * entry.L)
              : 0)
        )
      );
      const existing = merged[targetId] || createBlankCompetency(targetId, BRAINCORE_PARAMS.P_INIT);
      if (clampedP > existing.pMastery || hostAttempts > existing.attempts) {
        const nextP = Math.max(existing.pMastery, clampedP);
        const updated: CompetencyRecord = {
          ...existing,
          pMastery: nextP,
          pMasteryDecayed: nextP,
          attempts: Math.max(existing.attempts, hostAttempts),
          correct: Math.max(existing.correct, hostCorrect),
          exposures: Math.max(existing.exposures, hostAttempts > 0 ? hostAttempts : 1),
          lastAt: entry.lastAt || existing.lastAt || Date.now(),
        };
        updated.state = deriveMasteryState(updated);
        merged[targetId] = updated;
      }
    };

    for (const storageKey of bktKeys) {
      const rawHostBkt = localStorage.getItem(storageKey);
      if (!rawHostBkt) continue;
      let hostBkt: any = null;
      try {
        hostBkt = JSON.parse(rawHostBkt);
      } catch {
        continue;
      }
      if (!hostBkt || typeof hostBkt !== 'object') continue;

      const buckets = [
        hostBkt.lessons,
        hostBkt.skills,
        hostBkt.competencies,
        !hostBkt.lessons && !hostBkt.skills && !hostBkt.competencies && !hostBkt.schema
          ? hostBkt
          : null,
      ].filter((b) => b && typeof b === 'object' && !Array.isArray(b));

      for (const hostSkills of buckets) {
        for (const [canonicalId, aliases] of Object.entries(HOST_COMPETENCY_ALIASES)) {
          for (const alias of aliases) {
            if (hostSkills[alias]) {
              applySkillEntry(canonicalId, hostSkills[alias]);
              if (alias !== canonicalId) {
                applySkillEntry(alias, hostSkills[alias]);
              }
            }
          }
        }
        for (const [skillKey, skillVal] of Object.entries(hostSkills)) {
          applySkillEntry(skillKey, skillVal);
        }
      }
    }
    return merged;
  } catch {
    return competencies;
  }
}

function syncCompetencyToHostBkt(comp: CompetencyRecord): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const isJa =
      comp.competencyId.includes('_ja_') ||
      comp.competencyId.startsWith('ja_') ||
      localStorage.getItem('fz_target_course') === 'ja';
    const targetKeys = isJa
      ? ['fiezel-mastery-bkt-v1@ja', 'fiezel-mastery-bkt-v1']
      : ['fiezel-mastery-bkt-v1'];

    for (const key of targetKeys) {
      let hostBkt: any = null;
      try {
        hostBkt = JSON.parse(localStorage.getItem(key) || 'null');
      } catch {
        hostBkt = null;
      }
      if (!hostBkt || typeof hostBkt !== 'object' || Array.isArray(hostBkt)) {
        hostBkt = { schema: 'fiezel-mastery-bkt-v1', version: 1, lessons: {}, skills: {} };
      }
      if (!hostBkt.schema) {
        hostBkt.schema = 'fiezel-mastery-bkt-v1';
      }
      if (!hostBkt.lessons || typeof hostBkt.lessons !== 'object') {
        hostBkt.lessons = {};
      }
      if (!hostBkt.skills || typeof hostBkt.skills !== 'object') {
        hostBkt.skills = {};
      }
      const pVal = Number(
        Math.max(0.01, Math.min(0.99, comp.pMasteryDecayed ?? comp.pMastery)).toFixed(4)
      );
      const now = comp.lastAt || Date.now();
      const aliases = HOST_COMPETENCY_ALIASES[comp.competencyId] || [comp.competencyId];
      for (const targetKey of aliases) {
        const prevSkill = hostBkt.skills[targetKey] || {};
        hostBkt.skills[targetKey] = {
          ...prevSkill,
          p: pVal,
          pMastery: comp.pMastery,
          attempts: comp.attempts,
          correct: comp.correct,
          streak: comp.streak,
          state: comp.state,
          lastAt: now,
        };
        const prevLesson = hostBkt.lessons[targetKey] || {};
        const nextN = Math.max(Number(prevLesson.n || 0), comp.attempts);
        const passedAt =
          prevLesson.gatePassedAt || (pVal >= 0.95 && nextN >= 5 ? now : 0);
        hostBkt.lessons[targetKey] = {
          L: Math.max(Number(prevLesson.L || 0), pVal),
          n: nextN,
          lastAt: now,
          ...(passedAt ? { gatePassedAt: passedAt } : {}),
        };
      }
      hostBkt.updatedAt = Date.now();
      localStorage.setItem(key, JSON.stringify(hostBkt));
    }
  } catch {
    // Ignore storage errors
  }
}

export function ensureDualBrainMemory(
  raw?: Partial<DualBrainMemoryState> | null
): DualBrainMemoryState {
  const base = getDefaultDualBrainMemory();
  if (!raw || typeof raw !== 'object') return base;
  const ub: Partial<DualBrainMemoryState['userBrain']> = raw.userBrain || {};
  const mb: Partial<DualBrainMemoryState['mentorBrain']> = raw.mentorBrain || {};
  return {
    userBrain: {
      learnerName: typeof ub.learnerName === 'string' ? ub.learnerName.trim() : '',
      activeCourseLevel: typeof ub.activeCourseLevel === 'string' ? ub.activeCourseLevel.trim() : '',
      characterArchetype: ub.characterArchetype || base.userBrain.characterArchetype,
      characterNoteId:
        typeof ub.characterNoteId === 'string' && ub.characterNoteId
          ? ub.characterNoteId
          : base.userBrain.characterNoteId,
      characterNoteTh:
        typeof ub.characterNoteTh === 'string' && ub.characterNoteTh
          ? ub.characterNoteTh
          : base.userBrain.characterNoteTh,
      personalFacts: Array.isArray(ub.personalFacts)
        ? ub.personalFacts.filter((x) => typeof x === 'string' && x.trim()).slice(-12)
        : [],
      verifiedStrengths: Array.isArray(ub.verifiedStrengths)
        ? ub.verifiedStrengths.filter((x) => typeof x === 'string' && x.trim()).slice(-10)
        : [],
      chronicWeaknesses:
        ub.chronicWeaknesses && typeof ub.chronicWeaknesses === 'object'
          ? { ...ub.chronicWeaknesses }
          : {},
      updatedAt: Number(ub.updatedAt || base.userBrain.updatedAt),
    },
    mentorBrain: {
      totalMentoredTurns: Math.max(0, Number(mb.totalMentoredTurns || 0)),
      activeFocusAssignment:
        typeof mb.activeFocusAssignment === 'string' ? mb.activeFocusAssignment : '',
      lastRoastTheme: typeof mb.lastRoastTheme === 'string' ? mb.lastRoastTheme : '',
      rapportNotes: Array.isArray(mb.rapportNotes)
        ? mb.rapportNotes.filter((x) => typeof x === 'string' && x.trim()).slice(-10)
        : [],
      sessionSummaries: Array.isArray(mb.sessionSummaries)
        ? mb.sessionSummaries.slice(-8)
        : [],
      updatedAt: Number(mb.updatedAt || base.mentorBrain.updatedAt),
    },
  };
}

export interface HostPwaCognitiveSnapshot {
  learnerName: string;
  hostLevel: string;
  streakDays: number;
  hostStrongTopics: string[];
  hostWeakTopics: string[];
  hostMisconceptions: {
    key: string;
    concept: string;
    misconceptionId: string;
    belief: number;
    hits: number;
    lastUtterance?: string;
  }[];
}

export function readHostPwaCognitiveSnapshot(
  targetLang: TargetLang,
  locale: LearnerLocale = 'id'
): HostPwaCognitiveSnapshot {
  const snapshot: HostPwaCognitiveSnapshot = {
    learnerName: '',
    hostLevel: '',
    streakDays: 0,
    hostStrongTopics: [],
    hostWeakTopics: [],
    hostMisconceptions: [],
  };
  try {
    // 1. Inspect same-origin window.parent.state if embedded in FIEZEL shell
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      try {
        const parentWin = window.parent as any;
        const pState = parentWin.state;
        if (pState && typeof pState === 'object') {
          const pName = String(pState.userName || pState.name || pState.learnerName || '').trim();
          if (pName && pName.length <= 40) snapshot.learnerName = pName;
          if (pState.level != null) snapshot.hostLevel = `Level ${pState.level}`;
          if (typeof pState.streak === 'number') snapshot.streakDays = pState.streak;
        }
      } catch {
        // Cross-origin guard
      }
    }

    if (typeof localStorage === 'undefined') return snapshot;

    // 2. Inspect localStorage learner identity & main PWA state
    if (!snapshot.learnerName) {
      const rawLname = localStorage.getItem('fiezel-lname-sync-v1');
      if (rawLname) {
        try {
          const parsedName = JSON.parse(rawLname);
          const candidate =
            typeof parsedName === 'string'
              ? parsedName
              : String(parsedName?.name || parsedName?.userName || '');
          if (candidate.trim()) snapshot.learnerName = candidate.trim().slice(0, 40);
        } catch {
          if (rawLname.trim().length <= 40 && !rawLname.trim().startsWith('{')) {
            snapshot.learnerName = rawLname.trim();
          }
        }
      }
    }

    if (!snapshot.learnerName) {
      const rawAuth = localStorage.getItem('fiezel-auth-v1');
      if (rawAuth) {
        try {
          const authObj = JSON.parse(rawAuth);
          const candidate = String(
            authObj?.user?.displayName ||
              authObj?.user?.name ||
              authObj?.displayName ||
              authObj?.name ||
              ''
          ).trim();
          if (candidate && !candidate.includes('@')) {
            snapshot.learnerName = candidate.slice(0, 40);
          }
        } catch {
          // Ignore
        }
      }
    }

    const stateKeys = [
      ...enumerateMatchingStorageKeys('fiezel-v5-state'),
      ...enumerateMatchingStorageKeys('fiezel-v4-state'),
    ];
    for (const sk of stateKeys) {
      const isJaKey = sk.endsWith('@ja');
      if (targetLang === 'ja' && stateKeys.some((k) => k.endsWith('@ja')) && !isJaKey) continue;
      if (targetLang === 'en' && isJaKey) continue;
      const rawSt = localStorage.getItem(sk);
      if (!rawSt) continue;
      try {
        const st = JSON.parse(rawSt);
        if (!st || typeof st !== 'object') continue;
        if (!snapshot.learnerName) {
          const candidate = String(st.userName || st.name || st.learnerName || '').trim();
          if (candidate && candidate.length <= 40) snapshot.learnerName = candidate;
        }
        if (!snapshot.hostLevel && st.level != null) {
          snapshot.hostLevel = `Level ${st.level}`;
        }
        if (!snapshot.streakDays && typeof st.streak === 'number') {
          snapshot.streakDays = st.streak;
        }
        // Summarize quiz history accuracy by domain/type if available
        if (Array.isArray(st.history) && st.history.length > 0) {
          const domainTotals: Record<string, { total: number; ok: number }> = {};
          for (const h of st.history.slice(-80)) {
            if (!h || typeof h !== 'object') continue;
            const dom = String(h.domain || h.type || h.category || h.skill || '').trim();
            if (!dom) continue;
            if (!domainTotals[dom]) domainTotals[dom] = { total: 0, ok: 0 };
            domainTotals[dom].total += 1;
            if (h.ok || h.correct) domainTotals[dom].ok += 1;
          }
          for (const [dom, stat] of Object.entries(domainTotals)) {
            if (stat.total < 3) continue;
            const acc = Math.round((stat.ok / stat.total) * 100);
            const label = `${humanizeCompetencyId(dom, locale)} (akurasi kuis ${acc}%)`;
            if (acc >= 80 && snapshot.hostStrongTopics.length < 4) {
              snapshot.hostStrongTopics.push(label);
            } else if (acc <= 55 && snapshot.hostWeakTopics.length < 4) {
              snapshot.hostWeakTopics.push(label);
            }
          }
        }
      } catch {
        // Ignore malformed state
      }
    }

    // 3. Scan Host BKT lessons for strong & weak curriculum lessons matching targetLang
    const bktKeys = enumerateMatchingStorageKeys('fiezel-mastery-bkt-v1');
    for (const bk of bktKeys) {
      const isJaKey = bk.endsWith('@ja');
      if (targetLang === 'ja' && bktKeys.some((k) => k.endsWith('@ja')) && !isJaKey) continue;
      if (targetLang === 'en' && isJaKey) continue;
      const rawBkt = localStorage.getItem(bk);
      if (!rawBkt) continue;
      try {
        const parsedBkt = JSON.parse(rawBkt);
        const lessons = parsedBkt?.lessons || {};
        if (lessons && typeof lessons === 'object') {
          for (const [lessonId, row] of Object.entries<any>(lessons)) {
            if (!row || typeof row !== 'object') continue;
            const L = Number(row.L ?? row.p ?? NaN);
            const n = Number(row.n ?? row.attempts ?? 0);
            if (!Number.isFinite(L) || n < 2) continue;
            const lessonIsJa = /(_ja_|^ja[_-]|n5|n4|kana|kanji|particle)/i.test(lessonId) || isJaKey;
            if (targetLang === 'ja' && !lessonIsJa && /(_en_|^en[_-])/i.test(lessonId)) continue;
            if (targetLang === 'en' && /(_ja_|^ja[_-])/i.test(lessonId)) continue;

            const pct = Math.round(L * 100);
            const label = `${humanizeCompetencyId(lessonId, locale)} (${pct}%)`;
            if (L >= 0.78 && snapshot.hostStrongTopics.length < 5 && !snapshot.hostStrongTopics.includes(label)) {
              snapshot.hostStrongTopics.push(label);
            } else if (L <= 0.48 && snapshot.hostWeakTopics.length < 5 && !snapshot.hostWeakTopics.includes(label)) {
              snapshot.hostWeakTopics.push(label);
            }
          }
        }
      } catch {
        // Ignore
      }
    }

    // 4. Scan Host Misconception Ledger (`entries`, `concepts`, and `items`)
    const ledgerKeys = enumerateMatchingStorageKeys('fiezel-misconception-ledger-v1');
    for (const lk of ledgerKeys) {
      const isJaKey = lk.endsWith('@ja');
      if (targetLang === 'ja' && ledgerKeys.some((k) => k.endsWith('@ja')) && !isJaKey) continue;
      if (targetLang === 'en' && isJaKey) continue;
      const rawLedger = localStorage.getItem(lk);
      if (!rawLedger) continue;
      try {
        const parsedLedger = JSON.parse(rawLedger);
        if (!parsedLedger || typeof parsedLedger !== 'object') continue;

        // 4a. Canonical Braincore v3 `entries` (Bayesian log-odds)
        if (parsedLedger.entries && typeof parsedLedger.entries === 'object') {
          for (const [eKey, entry] of Object.entries<any>(parsedLedger.entries)) {
            if (!entry || typeof entry !== 'object') continue;
            const logOdds = Number(entry.logOdds ?? -2.197);
            const belief = 1 / (1 + Math.exp(-logOdds));
            const hits = Number(entry.hits ?? 1);
            if (belief < 0.35 && hits < 2) continue;
            snapshot.hostMisconceptions.push({
              key: eKey,
              concept: String(entry.concept || ''),
              misconceptionId: String(entry.canonical || entry.misconception || eKey),
              belief: Number(belief.toFixed(2)),
              hits,
            });
          }
        }

        // 4b. Legacy interactive-chat `concepts`
        if (parsedLedger.concepts && typeof parsedLedger.concepts === 'object') {
          for (const [conceptId, cObj] of Object.entries<any>(parsedLedger.concepts)) {
            const miscMap = cObj?.misconceptions;
            if (!miscMap || typeof miscMap !== 'object') continue;
            for (const [mId, mEntry] of Object.entries<any>(miscMap)) {
              if (!mEntry || mEntry.resolved) continue;
              snapshot.hostMisconceptions.push({
                key: `${conceptId}::${mId}`,
                concept: conceptId,
                misconceptionId: mId,
                belief: Math.min(0.95, 0.45 + 0.15 * Number(mEntry.count || 1)),
                hits: Number(mEntry.count || 1),
                lastUtterance: mEntry.lastUtterance ? String(mEntry.lastUtterance) : undefined,
              });
            }
          }
        }

        // 4c. Voice Studio `items`
        if (parsedLedger.items && typeof parsedLedger.items === 'object') {
          for (const [mId, item] of Object.entries<any>(parsedLedger.items)) {
            if (!item || typeof item !== 'object') continue;
            const cId = String(item.competencyId || '');
            if (targetLang === 'ja' && cId.includes('_en_')) continue;
            if (targetLang === 'en' && cId.includes('_ja_')) continue;
            if (!snapshot.hostMisconceptions.some((x) => x.misconceptionId === mId)) {
              snapshot.hostMisconceptions.push({
                key: `${cId || 'voice'}::${mId}`,
                concept: cId,
                misconceptionId: mId,
                belief: Math.min(0.95, 0.5 + 0.15 * Number(item.count || 1)),
                hits: Number(item.count || 1),
                lastUtterance: item.lastUtterance ? String(item.lastUtterance) : undefined,
              });
            }
          }
        }
      } catch {
        // Ignore
      }
    }

    snapshot.hostMisconceptions.sort((a, b) => b.belief * b.hits - a.belief * a.hits);
  } catch {
    // Safe fallback
  }
  return snapshot;
}

export function extractPersonalFactsFromUtterance(text: string): {
  inferredName?: string;
  facts: string[];
} {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean || /[\u0400-\u052F]/.test(clean)) return { facts: [] };

  let inferredName: string | undefined;
  const facts: string[] = [];

  const namePatterns = [
    /\b(?:my name is|call me|i'm|i am)\s+([A-Z][a-zA-Z]{1,18})\b/,
    /\b(?:nama saya|namaku|nama aku|panggil aku|panggil saya)\s+([A-Za-z]{2,18})\b/i,
    /(?:私は|僕は|俺は|名前は)\s*([ァ-ヶー一-龠ぁ-んA-Za-z]{2,12})\s*(?:です|と申します|だよ)/,
  ];
  const nonNames = new Set([
    'fine', 'good', 'great', 'happy', 'tired', 'busy', 'ready', 'sorry', 'here',
    'going', 'meeting', 'working', 'studying', 'agree', 'want', 'think', 'from',
  ]);
  for (const rx of namePatterns) {
    const m = clean.match(rx);
    if (m && m[1] && !nonNames.has(m[1].toLowerCase())) {
      inferredName = m[1].trim();
      break;
    }
  }

  const factMatchers: { rx: RegExp; prefix: string }[] = [
    { rx: /\b(?:i live in|i'm from|i am from|my hometown is)\s+([^.,!?]{2,40})/i, prefix: 'Domisili/Asal: ' },
    { rx: /\b(?:i work as|i work at|i work in|my job is)\s+([^.,!?]{2,45})/i, prefix: 'Pekerjaan: ' },
    { rx: /\b(?:i study|i'm studying|my major is)\s+([^.,!?]{2,45})/i, prefix: 'Studi/Belajar: ' },
    { rx: /\b(?:i am|i'm)\s+((?:building|making|working on|creating)\s+[^.,!?]{3,50})/i, prefix: 'Proyek/Aktivitas: ' },
    { rx: /\b(?:my hobby is|in my free time i like|i really like|i love)\s+([^.,!?]{3,45})/i, prefix: 'Minat/Hobi: ' },
    { rx: /([^\s、。！？]{2,20})(?:に住んでいます|に住んでる|出身です)/, prefix: 'Domisili/Asal: ' },
    { rx: /([^\s、。！？]{2,24})(?:を勉強しています|を専攻しています|で働いています)/, prefix: 'Aktivitas/Studi: ' },
    { rx: /(?:趣味は|好きなことは)([^。！？]{2,28})/, prefix: 'Minat/Hobi: ' },
  ];

  for (const fm of factMatchers) {
    const m = clean.match(fm.rx);
    if (m && m[1]) {
      facts.push(`${fm.prefix}${m[1].trim()}`);
    }
  }

  return { inferredName, facts };
}

export function inferLearnerCharacterProfile(
  history: SpeakingSessionMetric[],
  latestTranscript?: string
): {
  archetype: LearnerCharacterArchetype;
  noteId: string;
  noteTh: string;
} {
  const recent = Array.isArray(history) ? history.slice(-8) : [];
  const sampleText = `${recent.map((r) => r.userExactTranscript).join(' ')} ${latestTranscript || ''}`;
  const watashiCount = (sampleText.match(/私は|わたしは|\bwatashi wa\b/gi) || []).length;

  if (watashiCount >= 2) {
    return {
      archetype: 'stiff_textbook',
      noteId:
        'Karakter: Kaku Buku Teks ("Kanebo Kering") — sering mengulang subjek formal seperti 私は/watashi wa. Roasting kekakuannya dengan hangat dan ajari cara bicara ringkas ala penutur asli!',
      noteTh:
        'บุคลิก: ติดสำนวนตำราเรียน แข็งทื่อ ชอบพูดประธานซ้ำๆ แซวอย่างอบอุ่นแล้วสอนสำนวนธรรมชาติของเจ้าของภาษา',
    };
  }

  if (recent.length >= 2) {
    const avgGrammar =
      recent.reduce((sum, item) => sum + (item.grammarScore || 0), 0) / recent.length;
    const avgFluency =
      recent.reduce((sum, item) => sum + (item.fluencyScore || 0), 0) / recent.length;
    const avgWords =
      recent.reduce(
        (sum, item) => sum + Math.max(1, item.userExactTranscript.trim().split(/\s+/).length),
        0
      ) / recent.length;

    if (avgFluency >= 72 && avgWords >= 6 && avgGrammar < 68) {
      return {
        archetype: 'fast_careless',
        noteId:
          'Karakter: Lancar tapi Ceroboh (Autopilot Tabrak Lari Grammar) — berani bicara cepat namun sering salah partikel/tenses karena terjemahan kata-per-kata di kepala. Tegur & roasting kebiasaan autopilotnya dengan tajam tapi peduli!',
        noteTh:
          'บุคลิก: พูดคล่องแต่สะเพร่าเรื่องไวยากรณ์ มักแปลคำต่อคำในหัว ต้องเบรกและแก้ไวยากรณ์ทันทีอย่างเข้มงวดแต่จริงใจ',
      };
    }

    if (avgWords <= 4 && avgFluency < 70) {
      return {
        archetype: 'hesitant_shy',
        noteId:
          'Karakter: Ragu-ragu & Hati-hati — kalimat masih pendek karena takut salah. Jangan mengintimidasi berlebihan; bangun kepercayaan dirinya sambil tetap mengoreksi salah grammar dengan jelas.',
        noteTh:
          'บุคลิก: ขี้อายและลังเล ประโยคสั้นเพราะกลัวผิด ให้กำลังใจควบคู่กับการแก้ไวยากรณ์อย่างชัดเจน',
      };
    }

    if (recent.length >= 3 && avgGrammar >= 86 && avgFluency >= 84) {
      return {
        archetype: 'confident_natural',
        noteId:
          'Karakter: Percaya Diri & Tajam — akurasi grammar tinggi. Tantang dengan tempo natural, idiom/slang asli, atau variasi dialek/aksen agar naik kelas!',
        noteTh:
          'บุคลิก: มั่นใจและแม่นยำ ท้าทายด้วยความเร็วธรรมชาติ สำนวนเจ้าของภาษา หรือสำเนียงท้องถิ่น',
      };
    }
  }

  return {
    archetype: 'balanced_growing',
    noteId:
      'Karakter: Bertumbuh Stabil — responsif dalam percakapan. Tangkap setiap salah grammar seketika (wajib Echo Redemption) dan pancing kalimat yang lebih ekspresif.',
    noteTh:
      'บุคลิก: กำลังพัฒนาอย่างสมดุล แก้ไวยากรณ์ที่ผิดทันทีและให้พูดทวนประโยคที่ถูกต้องเสมอ',
  };
}

export function getInitialBraincoreState(): BraincoreStoreState {
  const baseCompetencies: Record<string, CompetencyRecord> = {
    vocab_daily_a2: createBlankCompetency('vocab_daily_a2', 0.74, 5, 4),
    vocab_travel_a2: createBlankCompetency('vocab_travel_a2', 0.42, 2, 1),
    vocab_academic_b1: createBlankCompetency('vocab_academic_b1', 0.68, 4, 3),
    vocab_ja_cafe_n5: createBlankCompetency('vocab_ja_cafe_n5', 0.65, 4, 3),
    vocab_ja_campus_n4: createBlankCompetency('vocab_ja_campus_n4', 0.38, 2, 1),
    speak_en_a2_cafe: createBlankCompetency('speak_en_a2_cafe', 0.62, 4, 3),
    speak_en_a2_past_trip: createBlankCompetency('speak_en_a2_past_trip', 0.48, 3, 1),
    speak_en_b1_job_interview: createBlankCompetency('speak_en_b1_job_interview', 0.56, 3, 2),
    speak_en_b2_ielts_part3: createBlankCompetency('speak_en_b2_ielts_part3', 0.64, 4, 3),
    speak_ja_n5_kissaten: createBlankCompetency('speak_ja_n5_kissaten', 0.58, 3, 2),
    speak_ja_n4_senpai_advice: createBlankCompetency('speak_ja_n4_senpai_advice', 0.44, 2, 1),
  };

  return {
    version: 1,
    updatedAt: Date.now(),
    tabId: TAB_ID,
    learnerLocale: 'id',
    targetLang: 'en',
    competencies: mergeHostBraincoreMastery(baseCompetencies),
    misconceptionLedger: {},
    syncQueue: [],
    speakingHistory: [],
    totalVoiceMinutes: 0,
    totalSpeakingSeconds: 0,
    completedCallSessions: 0,
    dualBrainMemory: getDefaultDualBrainMemory(),
  };
}

function readHostPwaPreferences(): { targetLang?: TargetLang; learnerLocale?: 'id' | 'th' } {
  try {
    let targetLang: TargetLang | undefined;
    let learnerLocale: 'id' | 'th' | undefined;
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const langParam = params.get('lang') || params.get('course');
      if (langParam === 'ja' || langParam === 'en' || langParam === 'zh') {
        targetLang = langParam;
      }
      const locParam = params.get('locale') || params.get('hl');
      if (locParam === 'th' || locParam === 'id') {
        learnerLocale = locParam;
      }
    }
    if (!targetLang) {
      const courseRaw = localStorage.getItem('fz_target_course');
      if (courseRaw === 'ja' || courseRaw === 'en' || courseRaw === 'zh') {
        targetLang = courseRaw;
      }
    }
    if (!learnerLocale) {
      const legacyRaw = localStorage.getItem('fiezel-v4-state');
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        if (legacy?.learnerLocale === 'th' || legacy?.locale === 'th') {
          learnerLocale = 'th';
        } else if (legacy?.learnerLocale === 'id' || legacy?.locale === 'id') {
          learnerLocale = 'id';
        }
      }
    }
    return { targetLang, learnerLocale };
  } catch {
    return {};
  }
}

/**
 * Non-destructively appends a voice speaking attempt to FIEZEL's IndexedDB learning queue
 * (`fiezel-learning-queue-v1` -> store `events`) and notifies parent PWA window / custom element.
 */
export function bridgeAttemptToHostPwa(eventPayload: Record<string, unknown>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const coursePrefix =
        String(eventPayload.competencyId || '').includes('_ja_') ||
        String(eventPayload.scenarioId || '').includes('_ja_') ||
        localStorage.getItem('fz_target_course') === 'ja'
          ? 'ja'
          : 'en';
      const chatKey = 'fiezel-interactive-chat-v1';
      let chatSaved: any = null;
      try {
        chatSaved = JSON.parse(localStorage.getItem(chatKey) || 'null');
      } catch {
        chatSaved = null;
      }
      if (!chatSaved || typeof chatSaved !== 'object') {
        chatSaved = { correctionMode: true, scenarioHistories: {} };
      }
      if (!chatSaved.scenarioHistories || typeof chatSaved.scenarioHistories !== 'object') {
        chatSaved.scenarioHistories = {};
      }
      const histKey = `${coursePrefix}_studio`;
      if (!Array.isArray(chatSaved.scenarioHistories[histKey])) {
        chatSaved.scenarioHistories[histKey] = [];
      }
      chatSaved.scenarioHistories[histKey].push({
        id: String(eventPayload.id || `vs_${Date.now()}`),
        role: 'user',
        text: String(eventPayload.userTranscript || ''),
        ts: Date.now(),
      });
      localStorage.setItem(chatKey, JSON.stringify(chatSaved));

      if (!eventPayload.ok && eventPayload.misconceptionId) {
        try {
          const targetKeys =
            coursePrefix === 'ja'
              ? ['fiezel-misconception-ledger-v1@ja', 'fiezel-misconception-ledger-v1']
              : ['fiezel-misconception-ledger-v1'];
          const nowMs = Date.now();
          const mId = String(eventPayload.misconceptionId);
          const conceptId = String(eventPayload.competencyId || 'voice_speaking');
          const entryKey = `${conceptId}::${mId}`;
          const sessionTag = `vs_${new Date(nowMs).toISOString().slice(0, 10)}`;

          for (const ledgerKey of targetKeys) {
            const rawLedger = localStorage.getItem(ledgerKey);
            let hostLedger: any = null;
            try {
              hostLedger = rawLedger ? JSON.parse(rawLedger) : null;
            } catch {
              hostLedger = null;
            }
            if (!hostLedger || typeof hostLedger !== 'object' || Array.isArray(hostLedger)) {
              hostLedger = { schema: 'fiezel-misconception-ledger-v1', version: 1, entries: {}, items: {} };
            }
            if (!hostLedger.schema) {
              hostLedger.schema = 'fiezel-misconception-ledger-v1';
            }
            if (!hostLedger.entries || typeof hostLedger.entries !== 'object') {
              hostLedger.entries = {};
            }
            if (!hostLedger.items || typeof hostLedger.items !== 'object') {
              hostLedger.items = {};
            }

            // 1. Update canonical Braincore v3 `entries` (Bayesian log-odds)
            const prevCanonical = hostLedger.entries[entryKey];
            const prevLogOdds =
              typeof prevCanonical?.logOdds === 'number'
                ? prevCanonical.logOdds
                : Math.log(0.1 / 0.9);
            const nextLogOdds = Math.min(Math.log(0.99 / 0.01), prevLogOdds + Math.log(10));
            const prevSessions = Array.isArray(prevCanonical?.sessions)
              ? prevCanonical.sessions
              : [];
            const nextSessions = prevSessions.includes(sessionTag)
              ? prevSessions
              : [...prevSessions, sessionTag].slice(-24);
            const nextHits = (Number(prevCanonical?.hits) || 0) + 1;
            hostLedger.entries[entryKey] = {
              concept: conceptId,
              misconception: mId,
              canonical: mId,
              family: 'voice_speaking',
              logOdds: Number(nextLogOdds.toFixed(4)),
              lastMs: nowMs,
              hits: nextHits,
              sessions: nextSessions,
              everActive: Boolean(
                prevCanonical?.everActive || (nextHits >= 3 && nextSessions.length >= 2)
              ),
            };

            // 2. Preserve legacy `items` map for backward compatibility
            const prev = hostLedger.items[mId] || { count: 0, firstSeen: nowMs };
            hostLedger.items[mId] = {
              ...prev,
              id: mId,
              competencyId: conceptId,
              scenarioId: String(eventPayload.scenarioId || ''),
              lastUtterance: String(eventPayload.userTranscript || ''),
              count: (prev.count || 0) + 1,
              lastSeen: nowMs,
            };
            localStorage.setItem(ledgerKey, JSON.stringify(hostLedger));
          }
        } catch {
          // Ignore
        }
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fiezel:voice-studio:attempt', { detail: eventPayload })
      );
      const isIframe = window.parent && window.parent !== window;
      if (!isIframe) {
        // Standalone window mode: update local window if available
        try {
          const w = window as any;
          if (typeof w.bktRecord === 'function') {
            w.bktRecord(
              String(eventPayload.competencyId || 'kaiwa_general'),
              Boolean(eventPayload.ok),
              {
                source: 'voice-studio',
                misconceptionId: eventPayload.misconceptionId || null,
              }
            );
          }
        } catch {
          // Ignore
        }
      } else {
        // Iframe mode: Shell handles Braincore state via secure nonce protocol & fallback
        const targetOrigin =
          window.location.origin && window.location.origin !== 'null' ? window.location.origin : '*';
        const nonce = getStudioNonce();
        if (nonce) {
          window.parent.postMessage(
            {
              v: 1,
              type: 'fz.studio.attempt',
              nonce: nonce,
              seq: studioSeq++,
              sentAt: Date.now(),
              payload: {
                turnId: eventPayload.id || `turn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                competencyId: String(eventPayload.competencyId || 'kaiwa_general'),
                scenarioId: String(eventPayload.scenarioId || 'scen_ja_n5_kissaten'),
                course:
                  eventPayload.competencyId?.includes('ja') || (eventPayload as any).course === 'ja'
                    ? 'ja'
                    : 'en',
                verdict:
                  typeof (eventPayload as any).verdict === 'boolean' || (eventPayload as any).verdict === null
                    ? (eventPayload as any).verdict
                    : Boolean(eventPayload.ok),
                userTranscript: String(eventPayload.userTranscript || '').slice(0, 500),
                misconceptionId: eventPayload.misconceptionId || null,
                latencyMs: eventPayload.latencyMs || 3000,
                hintsUsed: eventPayload.hintsUsed || 0,
              },
            },
            targetOrigin
          );
        }
        window.parent.postMessage(
          { type: 'FIEZEL_VOICE_STUDIO_ATTEMPT', payload: eventPayload },
          targetOrigin
        );
      }
    }
    if (typeof indexedDB !== 'undefined') {
      const req = indexedDB.open('fiezel-learning-queue-v1', 1);
      req.onsuccess = () => {
        try {
          const db = req.result;
          if (db.objectStoreNames.contains('events')) {
            const tx = db.transaction('events', 'readwrite');
            tx.objectStore('events').put({
              id: eventPayload.id || `vs_${Date.now()}`,
              type: 'voice_studio_turn',
              ts: Date.now(),
              ...eventPayload,
            });
          }
          db.close();
        } catch {
          // Ignore if host schema differs
        }
      };
    }
  } catch {
    // Safe no-op in restricted iframe / private mode
  }
}

export function loadBraincoreState(): BraincoreStoreState {
  try {
    const hostPrefs = readHostPwaPreferences();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = getInitialBraincoreState();
      if (hostPrefs.targetLang) seed.targetLang = hostPrefs.targetLang;
      if (hostPrefs.learnerLocale) seed.learnerLocale = hostPrefs.learnerLocale;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as BraincoreStoreState;
    if (hostPrefs.targetLang) {
      parsed.targetLang = hostPrefs.targetLang;
    }
    if (hostPrefs.learnerLocale) {
      parsed.learnerLocale = hostPrefs.learnerLocale;
    }
    const now = Date.now();
    if (!Array.isArray(parsed.speakingHistory)) {
      parsed.speakingHistory = [];
    } else {
      parsed.speakingHistory = parsed.speakingHistory.filter(
        (item) => !/^hist_[1-5]$/.test(String(item?.id || ''))
      );
    }
    if (
      parsed.misconceptionLedger &&
      parsed.misconceptionLedger['speak_en_a2_past_trip::past_tense_irregular_goed']?.lastUtterance ===
        'Last weekend I goed to Bandung with my brother.'
    ) {
      delete parsed.misconceptionLedger['speak_en_a2_past_trip::past_tense_irregular_goed'];
    }
    if (typeof parsed.totalSpeakingSeconds !== 'number' || parsed.totalSpeakingSeconds < 0) {
      parsed.totalSpeakingSeconds = parsed.speakingHistory.reduce(
        (acc, item) => acc + (item.speakingDurationSec || 0),
        0
      );
    }
    parsed.competencies = mergeHostBraincoreMastery(parsed.competencies || {});
    if (parsed.competencies) {
      for (const cid of Object.keys(parsed.competencies)) {
        const c = parsed.competencies[cid];
        if (c.lastAt) {
          const elapsedDays = Math.max(0, (now - c.lastAt) / 86400_000);
          c.pMasteryDecayed = bktDecay(c.pMastery, elapsedDays);
        } else {
          c.pMasteryDecayed = c.pMastery;
        }
        c.state = deriveMasteryState(c);
      }
    }
    parsed.dualBrainMemory = ensureDualBrainMemory(parsed.dualBrainMemory);
    const hostSnap = readHostPwaCognitiveSnapshot(
      parsed.targetLang || 'en',
      parsed.learnerLocale || 'id'
    );
    if (hostSnap.learnerName && !parsed.dualBrainMemory.userBrain.learnerName) {
      parsed.dualBrainMemory.userBrain.learnerName = hostSnap.learnerName;
    }
    if (hostSnap.hostLevel && !parsed.dualBrainMemory.userBrain.activeCourseLevel) {
      parsed.dualBrainMemory.userBrain.activeCourseLevel = hostSnap.hostLevel;
    }
    return parsed;
  } catch {
    return getInitialBraincoreState();
  }
}

function mergeDualBrainMemory(
  diskMem?: DualBrainMemoryState,
  nextMem?: DualBrainMemoryState
): DualBrainMemoryState {
  const a = ensureDualBrainMemory(diskMem);
  const b = ensureDualBrainMemory(nextMem);
  const mergedWeaknesses: Record<string, ChronicGrammarWeakness> = {
    ...a.userBrain.chronicWeaknesses,
    ...b.userBrain.chronicWeaknesses,
  };
  for (const k of Object.keys(mergedWeaknesses)) {
    const wa = a.userBrain.chronicWeaknesses[k];
    const wb = b.userBrain.chronicWeaknesses[k];
    if (wa && wb) {
      mergedWeaknesses[k] = (wb.lastSeenAt || 0) >= (wa.lastSeenAt || 0)
        ? { ...wb, hits: Math.max(wa.hits, wb.hits) }
        : { ...wa, hits: Math.max(wa.hits, wb.hits) };
    }
  }
  const sessionIds = new Set<string>();
  const mergedSessions = [
    ...a.mentorBrain.sessionSummaries,
    ...b.mentorBrain.sessionSummaries,
  ]
    .filter((s) => {
      if (!s || !s.sessionId || sessionIds.has(s.sessionId)) return false;
      sessionIds.add(s.sessionId);
      return true;
    })
    .slice(-8);

  return {
    userBrain: {
      learnerName: b.userBrain.learnerName || a.userBrain.learnerName,
      activeCourseLevel: b.userBrain.activeCourseLevel || a.userBrain.activeCourseLevel,
      characterArchetype: b.userBrain.characterArchetype || a.userBrain.characterArchetype,
      characterNoteId: b.userBrain.characterNoteId || a.userBrain.characterNoteId,
      characterNoteTh: b.userBrain.characterNoteTh || a.userBrain.characterNoteTh,
      personalFacts: Array.from(
        new Set([...a.userBrain.personalFacts, ...b.userBrain.personalFacts])
      ).slice(-12),
      verifiedStrengths: Array.from(
        new Set([...a.userBrain.verifiedStrengths, ...b.userBrain.verifiedStrengths])
      ).slice(-10),
      chronicWeaknesses: mergedWeaknesses,
      updatedAt: Math.max(a.userBrain.updatedAt, b.userBrain.updatedAt, Date.now()),
    },
    mentorBrain: {
      totalMentoredTurns: Math.max(
        a.mentorBrain.totalMentoredTurns,
        b.mentorBrain.totalMentoredTurns
      ),
      activeFocusAssignment:
        b.mentorBrain.activeFocusAssignment || a.mentorBrain.activeFocusAssignment,
      lastRoastTheme: b.mentorBrain.lastRoastTheme || a.mentorBrain.lastRoastTheme,
      rapportNotes: Array.from(
        new Set([...a.mentorBrain.rapportNotes, ...b.mentorBrain.rapportNotes])
      ).slice(-10),
      sessionSummaries: mergedSessions,
      updatedAt: Math.max(a.mentorBrain.updatedAt, b.mentorBrain.updatedAt, Date.now()),
    },
  };
}

/**
 * Multi-tab safe Zero-Loss State persistence
 */
export function saveBraincoreState(nextState: BraincoreStoreState): BraincoreStoreState {
  try {
    const rawCurrent = localStorage.getItem(STORAGE_KEY);
    let merged = {
      ...nextState,
      dualBrainMemory: ensureDualBrainMemory(nextState.dualBrainMemory),
    };
    if (rawCurrent) {
      const disk = JSON.parse(rawCurrent) as BraincoreStoreState;
      if (disk && disk.version > nextState.version) {
        const mergedComps: Record<string, CompetencyRecord> = {
          ...disk.competencies,
          ...nextState.competencies,
        };
        for (const cid of Object.keys(mergedComps)) {
          const a = disk.competencies?.[cid];
          const b = nextState.competencies?.[cid];
          if (a && b) {
            mergedComps[cid] = (a.lastAt || 0) > (b.lastAt || 0) ? a : b;
          }
        }
        const mergedLedger: Record<string, MisconceptionLedgerEntry> = {
          ...disk.misconceptionLedger,
          ...nextState.misconceptionLedger,
        };
        const queueIds = new Set<string>();
        const mergedQueue = [...(disk.syncQueue || []), ...(nextState.syncQueue || [])].filter(
          (item) => {
            if (queueIds.has(item.id)) return false;
            queueIds.add(item.id);
            return true;
          }
        );
        const histIds = new Set<string>();
        const mergedHistory = [
          ...(disk.speakingHistory || []),
          ...(nextState.speakingHistory || []),
        ].filter((item) => {
          if (histIds.has(item.id)) return false;
          histIds.add(item.id);
          return true;
        });

        merged = {
          ...nextState,
          version: Math.max(disk.version, nextState.version) + 1,
          updatedAt: Date.now(),
          tabId: TAB_ID,
          competencies: mergedComps,
          misconceptionLedger: mergedLedger,
          syncQueue: mergedQueue,
          speakingHistory: mergedHistory,
          totalSpeakingSeconds: Math.max(
            disk.totalSpeakingSeconds || 0,
            nextState.totalSpeakingSeconds || 0
          ),
          totalVoiceMinutes: Math.max(
            disk.totalVoiceMinutes || 0,
            nextState.totalVoiceMinutes || 0
          ),
          completedCallSessions: Math.max(
            disk.completedCallSessions || 0,
            nextState.completedCallSessions || 0
          ),
          dualBrainMemory: mergeDualBrainMemory(disk.dualBrainMemory, nextState.dualBrainMemory),
        };
      } else {
        merged = {
          ...nextState,
          version: (nextState.version || 1) + 1,
          updatedAt: Date.now(),
          tabId: TAB_ID,
          dualBrainMemory: mergeDualBrainMemory(disk?.dualBrainMemory, nextState.dualBrainMemory),
        };
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return nextState;
  }
}

export function checkPrerequisiteStatus(
  state: BraincoreStoreState,
  prereqCompetencyId?: string
): { isReady: boolean; pMastery: number; stateLabel: MasteryStateName } {
  if (!prereqCompetencyId) {
    return { isReady: true, pMastery: 1.0, stateLabel: 'mastered' };
  }
  const mergedComps = mergeHostBraincoreMastery(state.competencies || {});
  const comp =
    mergedComps[prereqCompetencyId] ||
    state.competencies[prereqCompetencyId] ||
    createBlankCompetency(prereqCompetencyId, BRAINCORE_PARAMS.P_INIT);
  const p = comp.pMasteryDecayed ?? comp.pMastery ?? BRAINCORE_PARAMS.P_INIT;
  return {
    isReady: p >= BRAINCORE_PARAMS.DEVELOPING_T,
    pMastery: p,
    stateLabel: comp.state,
  };
}

export function recordVocabPrereqMastery(
  state: BraincoreStoreState,
  prereqCompetencyId?: string
): BraincoreStoreState {
  if (!prereqCompetencyId) return state;
  const existing =
    state.competencies[prereqCompetencyId] ||
    createBlankCompetency(prereqCompetencyId, BRAINCORE_PARAMS.P_INIT);
  const p1 = bktUpdate(existing.pMasteryDecayed ?? existing.pMastery, true, 0, 0.9);
  const p2 = bktUpdate(p1, true, 0, 0.9);
  const updatedComp: CompetencyRecord = {
    ...existing,
    pMastery: p2,
    pMasteryDecayed: p2,
    exposures: existing.exposures + 1,
    attempts: existing.attempts + 2,
    correct: existing.correct + 2,
    streak: existing.streak + 2,
    lastAt: Date.now(),
  };
  updatedComp.state = deriveMasteryState(updatedComp);
  syncCompetencyToHostBkt(updatedComp);

  const nextState: BraincoreStoreState = {
    ...state,
    competencies: {
      ...state.competencies,
      [prereqCompetencyId]: updatedComp,
    },
  };
  return saveBraincoreState(nextState);
}

/**
 * Record a real speaking turn evaluation into Braincore BKT, Misconception Ledger, Speaking History, and Sync Queue.
 */
export function recordSpeakingAttempt(
  state: BraincoreStoreState,
  params: {
    competencyId: string;
    scenarioId: string;
    targetLang?: TargetLang;
    userExactTranscript: string;
    ok: boolean;
    grammarScore?: number;
    fluencyScore?: number;
    vocabUsageScore?: number;
    accuracyScore?: number;
    speakingDurationSec?: number;
    misconceptionId: string | null;
    correctionPattern: string | null;
    hintsUsed: number;
    confidence: number;
    measureMode: boolean;
    isTransfer?: boolean;
  }
): {
  nextState: BraincoreStoreState;
  bktBefore: number;
  bktAfter: number;
  thetaAfter: number;
  masteryStateAfter: MasteryStateName;
} {
  const now = Date.now();
  const existing =
    state.competencies[params.competencyId] ||
    createBlankCompetency(params.competencyId, BRAINCORE_PARAMS.P_INIT);

  const elapsedDays = existing.lastAt ? Math.max(0, (now - existing.lastAt) / 86400_000) : 0;
  const startP = bktDecay(existing.pMastery, elapsedDays);
  const nextP = bktUpdate(startP, params.ok, params.hintsUsed, params.confidence);

  const nextStreak = params.ok ? existing.streak + 1 : 0;
  const nextCorrect = params.ok ? existing.correct + 1 : existing.correct;
  const prevMastered = existing.masteredAt;

  const updatedComp: CompetencyRecord = {
    ...existing,
    pMastery: nextP,
    pMasteryDecayed: nextP,
    exposures: Math.max(1, existing.exposures + 1),
    attempts: existing.attempts + 1,
    correct: nextCorrect,
    streak: nextStreak,
    hintsUsed: existing.hintsUsed + (params.hintsUsed || 0),
    lastAt: now,
  };

  const candidateState = deriveMasteryState(updatedComp);
  if (candidateState === 'MASTERED' && !prevMastered) {
    updatedComp.masteredAt = now;
    updatedComp.stabilityDays = 3.0;
  } else if (prevMastered && params.ok) {
    if (
      (now - prevMastered) / 86400_000 >= BRAINCORE_PARAMS.RETENTION_DAYS &&
      !updatedComp.retainedAt
    ) {
      updatedComp.retainedAt = now;
    }
    updatedComp.stabilityDays = Number(
      Math.min(180.0, (updatedComp.stabilityDays || 3.0) * 1.9).toFixed(2)
    );
  } else if (prevMastered && !params.ok) {
    updatedComp.stabilityDays = Number(
      Math.max(1.0, (updatedComp.stabilityDays || 3.0) * 0.5).toFixed(2)
    );
    updatedComp.retainedAt = null;
  }

  if (params.isTransfer && params.ok && nextP >= BRAINCORE_PARAMS.MASTERY_T) {
    updatedComp.transferredAt = updatedComp.transferredAt || now;
  }
  updatedComp.state = deriveMasteryState(updatedComp);

  // Update Misconception Ledger
  const nextLedger = { ...state.misconceptionLedger };
  if (!params.ok && params.misconceptionId) {
    const key = `${params.competencyId}::${params.misconceptionId}`;
    const prevEntry = nextLedger[key];
    nextLedger[key] = {
      competencyId: params.competencyId,
      misconceptionId: params.misconceptionId,
      frequency: (prevEntry?.frequency || 0) + 1,
      firstAt: prevEntry?.firstAt || now,
      lastAt: now,
      resolved: false,
      lastUtterance: params.userExactTranscript,
      correctionPattern: params.correctionPattern || prevEntry?.correctionPattern || '',
    };
  } else if (params.ok && nextStreak >= 2) {
    for (const k of Object.keys(nextLedger)) {
      if (nextLedger[k].competencyId === params.competencyId && !nextLedger[k].resolved) {
        nextLedger[k] = {
          ...nextLedger[k],
          resolved: true,
          lastAt: now,
        };
      }
    }
  }

  const queueItem = {
    id: `att_${now}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now,
    competencyId: params.competencyId,
    scenarioId: params.scenarioId,
    userTranscript: params.userExactTranscript,
    ok: params.ok,
    pMasteryBefore: startP,
    pMasteryAfter: nextP,
    misconceptionId: params.misconceptionId,
    hintsUsed: params.hintsUsed,
    confidence: params.confidence,
    measureMode: params.measureMode,
  };

  // Estimate speaking duration from word/character length if not explicitly measured by mic timer
  const wordCount = Math.max(1, params.userExactTranscript.trim().split(/\s+/).length);
  const estimatedSec =
    params.speakingDurationSec && params.speakingDurationSec > 0
      ? Math.round(params.speakingDurationSec)
      : Math.max(6, Math.min(45, wordCount * 2));

  const prevHistory = Array.isArray(state.speakingHistory)
    ? state.speakingHistory
    : getDefaultSpeakingHistory();
  const nextTurnNumber = prevHistory.length + 1;

  const newMetric: SpeakingSessionMetric = {
    id: `turn_metric_${now}_${Math.random().toString(36).slice(2, 6)}`,
    turnLabel: `Gilir #${nextTurnNumber}`,
    timestamp: now,
    scenarioId: params.scenarioId,
    competencyId: params.competencyId,
    targetLang: params.targetLang || state.targetLang || 'en',
    ok: params.ok,
    grammarScore: params.grammarScore ?? (params.ok ? 94 : 45),
    fluencyScore: params.fluencyScore ?? (params.ok ? 91 : 65),
    vocabUsageScore: params.vocabUsageScore ?? (params.ok ? 93 : 62),
    accuracyScore: params.accuracyScore ?? (params.ok ? 93 : 48),
    bktMasteryPct: Math.round(nextP * 100),
    speakingDurationSec: estimatedSec,
    userExactTranscript: params.userExactTranscript,
  };

  const nextTotalSpeakingSeconds = (state.totalSpeakingSeconds || 0) + estimatedSec;
  const updatedHistory = [...prevHistory.slice(-19), newMetric];

  // Update persistent Two-Way Memory (User Brain + Mentor Brain)
  const mem = ensureDualBrainMemory(state.dualBrainMemory);
  const extracted = extractPersonalFactsFromUtterance(params.userExactTranscript);
  if (extracted.inferredName && !mem.userBrain.learnerName) {
    mem.userBrain.learnerName = extracted.inferredName;
  }
  if (extracted.facts.length > 0) {
    mem.userBrain.personalFacts = Array.from(
      new Set([...mem.userBrain.personalFacts, ...extracted.facts])
    ).slice(-12);
  }
  const charProfile = inferLearnerCharacterProfile(updatedHistory, params.userExactTranscript);
  mem.userBrain.characterArchetype = charProfile.archetype;
  mem.userBrain.characterNoteId = charProfile.noteId;
  mem.userBrain.characterNoteTh = charProfile.noteTh;

  if (params.ok && nextP >= 0.72) {
    const strengthLabel = `${humanizeCompetencyId(params.competencyId, state.learnerLocale)} (${Math.round(nextP * 100)}%)`;
    if (!mem.userBrain.verifiedStrengths.includes(strengthLabel)) {
      mem.userBrain.verifiedStrengths = [
        ...mem.userBrain.verifiedStrengths.filter(
          (s) => !s.startsWith(humanizeCompetencyId(params.competencyId, state.learnerLocale))
        ),
        strengthLabel,
      ].slice(-10);
    }
  }

  if (!params.ok && params.misconceptionId) {
    const mInfoId = humanizeMisconceptionId(params.misconceptionId, 'id', params.competencyId);
    const mInfoTh = humanizeMisconceptionId(params.misconceptionId, 'th', params.competencyId);
    const prevWeak = mem.userBrain.chronicWeaknesses[params.misconceptionId];
    mem.userBrain.chronicWeaknesses[params.misconceptionId] = {
      misconceptionId: params.misconceptionId,
      labelId: mInfoId.label,
      labelTh: mInfoTh.label,
      hits: (prevWeak?.hits || 0) + 1,
      resolvedHits: 0,
      lastBrokenUtterance: params.userExactTranscript.slice(0, 160),
      targetFixPattern:
        params.correctionPattern || mInfoId.fix || prevWeak?.targetFixPattern || '',
      lastSeenAt: now,
      active: true,
    };
    mem.mentorBrain.activeFocusAssignment = `Wajib latih & pastikan murid tidak mengulang kesalahan: ${mInfoId.label}${mInfoId.fix ? ` (${mInfoId.fix})` : ''}.`;
    mem.mentorBrain.lastRoastTheme = mInfoId.label;
  } else if (params.ok && nextStreak >= 2) {
    for (const wk of Object.keys(mem.userBrain.chronicWeaknesses)) {
      const w = mem.userBrain.chronicWeaknesses[wk];
      if (w && w.active) {
        const nextResolved = (w.resolvedHits || 0) + 1;
        mem.userBrain.chronicWeaknesses[wk] = {
          ...w,
          resolvedHits: nextResolved,
          active: nextResolved < 2,
        };
      }
    }
  }
  mem.userBrain.updatedAt = now;
  mem.mentorBrain.totalMentoredTurns = (mem.mentorBrain.totalMentoredTurns || 0) + 1;
  mem.mentorBrain.updatedAt = now;

  const nextState = saveBraincoreState({
    ...state,
    competencies: {
      ...state.competencies,
      [params.competencyId]: updatedComp,
    },
    misconceptionLedger: nextLedger,
    syncQueue: [...state.syncQueue, queueItem],
    speakingHistory: updatedHistory,
    totalSpeakingSeconds: nextTotalSpeakingSeconds,
    totalVoiceMinutes: Math.max(1, Math.round(nextTotalSpeakingSeconds / 60)),
    dualBrainMemory: mem,
  });

  syncCompetencyToHostBkt(updatedComp);
  bridgeAttemptToHostPwa(queueItem);

  return {
    nextState,
    bktBefore: startP,
    bktAfter: nextP,
    thetaAfter: abilityThetaFromMastery(nextP),
    masteryStateAfter: updatedComp.state,
  };
}

/**
 * Finalize and persist cross-session Mentor Brain + User Brain memory at the end of a voice call.
 */
export function finalizeCallSessionMemory(
  state: BraincoreStoreState,
  params: {
    scenario: CallScenario;
    personaId: string;
    turns: CallTurn[];
    durationSec: number;
  }
): BraincoreStoreState {
  const userTurns = (params.turns || []).filter(
    (t) => t.speaker === 'user' && String(t.text || '').trim().length > 0
  );
  if (userTurns.length === 0) return state;

  const now = Date.now();
  const mem = ensureDualBrainMemory(state.dualBrainMemory);

  const mistakesCaught: string[] = [];
  const strengthsObserved: string[] = [];
  const topicsDiscussed: string[] = [];

  for (const ut of userTurns) {
    const cleanText = String(ut.text || '').trim();
    const extracted = extractPersonalFactsFromUtterance(cleanText);
    if (extracted.inferredName && !mem.userBrain.learnerName) {
      mem.userBrain.learnerName = extracted.inferredName;
    }
    if (extracted.facts.length > 0) {
      mem.userBrain.personalFacts = Array.from(
        new Set([...mem.userBrain.personalFacts, ...extracted.facts])
      ).slice(-12);
    }
    if (cleanText.length >= 6 && topicsDiscussed.length < 3) {
      topicsDiscussed.push(cleanText.slice(0, 70));
    }
    if (ut.diagnosis) {
      if (!ut.diagnosis.ok) {
        const mLabel = ut.diagnosis.misconceptionId
          ? humanizeMisconceptionId(ut.diagnosis.misconceptionId, state.learnerLocale, params.scenario.competencyId).label
          : ut.diagnosis.whyFailsId || `Kalimat kurang tepat: "${cleanText.slice(0, 50)}"`;
        if (!mistakesCaught.includes(mLabel)) {
          mistakesCaught.push(mLabel);
        }
      } else if (ut.diagnosis.grammarScore >= 82) {
        const sLabel = `Kalimat natural: "${cleanText.slice(0, 55)}"`;
        if (strengthsObserved.length < 2) {
          strengthsObserved.push(sLabel);
        }
      }
    }
  }

  const mentorTakeaway =
    mistakesCaught.length > 0
      ? `Murid sempat terpeleset di [${mistakesCaught.slice(0, 2).join('; ')}]. Di telepon berikutnya, uji ulang pola ini!`
      : `Murid menyelesaikan ${userTurns.length} giliran bicara di "${params.scenario.titleId}" dengan rapi. Naikkan tantangan ekspresi natural!`;

  const entry: MentorSessionMemoryEntry = {
    sessionId: `sess_${now}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
    scenarioId: params.scenario.id,
    personaId: params.personaId,
    targetLang: params.scenario.targetLang,
    turnCount: userTurns.length,
    durationSec: Math.max(1, Math.round(params.durationSec || 0)),
    mistakesCaught: mistakesCaught.slice(0, 4),
    strengthsObserved: strengthsObserved.slice(0, 3),
    topicsDiscussed: topicsDiscussed.slice(0, 3),
    mentorTakeaway,
  };

  mem.mentorBrain.sessionSummaries = [...mem.mentorBrain.sessionSummaries, entry].slice(-8);
  if (mistakesCaught.length > 0) {
    mem.mentorBrain.activeFocusAssignment = `Fokus perbaikan dari telepon terakhir: ${mistakesCaught[0]}`;
  } else if (!mem.mentorBrain.activeFocusAssignment) {
    mem.mentorBrain.activeFocusAssignment = `Pertahankan kelancaran di ${params.scenario.competencyNameId} dan tantang variasi kalimat lebih panjang.`;
  }
  mem.mentorBrain.updatedAt = now;
  mem.userBrain.updatedAt = now;

  return saveBraincoreState({
    ...state,
    completedCallSessions: (state.completedCallSessions || 0) + 1,
    dualBrainMemory: mem,
  });
}

/**
 * Build an authoritative, real-time Braincore Cognitive Dossier for Gemini Live & Turn Coach.
 * Connects the AI directly to:
 * 1) Who the learner is & their character archetype
 * 2) TITIK PINTAR (Verified Strengths across Voice Studio + Host FIEZEL PWA)
 * 3) TITIK LEMAH & MISKONSEPSI AKTIF (Weaknesses & Grammar Traps to Watch/Roast/Fix)
 * 4) MEMORI DUA ARAH (User Brain personal facts + Mentor Brain cross-call memory & focus assignment)
 */
export function buildBraincoreCognitiveDossier(
  state: BraincoreStoreState,
  scenario: CallScenario,
  locale: LearnerLocale = state.learnerLocale || 'id'
): string {
  const targetLang = scenario.targetLang;
  const mem = ensureDualBrainMemory(state.dualBrainMemory);
  const hostSnap = readHostPwaCognitiveSnapshot(targetLang, locale);
  const mergedComps = mergeHostBraincoreMastery(state.competencies || {});

  const learnerName =
    mem.userBrain.learnerName ||
    hostSnap.learnerName ||
    (locale === 'th' ? 'นักเรียน (ยังไม่ได้ระบุชื่อ)' : 'Murid FIEZEL');
  const activeLevel =
    hostSnap.hostLevel ||
    mem.userBrain.activeCourseLevel ||
    scenario.level.replace(/^CEFR\s+|^JLPT\s+/i, 'Level ');
  const charProfile = inferLearnerCharacterProfile(state.speakingHistory || []);

  // 1. Collect TITIK PINTAR (Strengths)
  const strengths: string[] = [];
  for (const [cid, rec] of Object.entries(mergedComps)) {
    if (!rec) continue;
    const isJaComp = cid.includes('_ja_') || cid.startsWith('ja_');
    const isEnComp = cid.includes('_en_') || cid.includes('daily_a2') || cid.includes('travel_a2') || cid.includes('academic_b1');
    if (targetLang === 'ja' && isEnComp && !isJaComp) continue;
    if (targetLang === 'en' && isJaComp) continue;
    const p = rec.pMasteryDecayed ?? rec.pMastery ?? 0;
    if (p >= 0.65 && rec.attempts >= 1) {
      strengths.push(`${humanizeCompetencyId(cid, locale)} (Penguasaan ${Math.round(p * 100)}%)`);
    }
  }
  for (const hs of hostSnap.hostStrongTopics) {
    if (strengths.length < 5 && !strengths.includes(hs)) {
      strengths.push(hs);
    }
  }
  for (const vs of mem.userBrain.verifiedStrengths) {
    if (strengths.length < 5 && !strengths.includes(vs)) {
      strengths.push(vs);
    }
  }

  // 2. Collect TITIK LEMAH & ACTIVE MISCONCEPTIONS (Weaknesses)
  const weaknesses: string[] = [];

  // 2a. Chronic weaknesses from DualBrainMemory
  const chronicList = Object.values(mem.userBrain.chronicWeaknesses || {})
    .filter((w) => w && w.active)
    .sort((a, b) => (b.hits || 0) - (a.hits || 0));
  for (const cw of chronicList.slice(0, 3)) {
    const label = locale === 'th' ? cw.labelTh : cw.labelId;
    const sample = cw.lastBrokenUtterance ? ` — Contoh salah murid: "${cw.lastBrokenUtterance}"` : '';
    const fix = cw.targetFixPattern ? ` → Perbaikan: "${cw.targetFixPattern}"` : '';
    weaknesses.push(`Miskonsepsi Berulang (${cw.hits}x): ${label}${sample}${fix}`);
  }

  // 2b. Unresolved Voice Studio misconceptionLedger entries
  for (const entry of Object.values(state.misconceptionLedger || {})) {
    if (!entry || entry.resolved) continue;
    const isJaEntry = entry.competencyId.includes('_ja_');
    if (targetLang === 'ja' && !isJaEntry && entry.competencyId.includes('_en_')) continue;
    if (targetLang === 'en' && isJaEntry) continue;
    const h = humanizeMisconceptionId(entry.misconceptionId, locale, entry.competencyId);
    const line = `jebakan ${h.label} (${entry.frequency}x, ucapan terakhir: "${entry.lastUtterance}")${
      entry.correctionPattern || h.fix ? ` → seharusnya: ${entry.correctionPattern || h.fix}` : ''
    }`;
    if (weaknesses.length < 5 && !weaknesses.some((w) => w.includes(h.label))) {
      weaknesses.push(line);
    }
  }

  // 2c. Host PWA Misconception Ledger (Bayesian log-odds from grammar/quiz engine)
  for (const hm of hostSnap.hostMisconceptions.slice(0, 4)) {
    const h = humanizeMisconceptionId(hm.misconceptionId, locale, hm.concept);
    const line = `Rekam Jejak Kuis Utama [${h.label}] (keyakinan miskonsepsi ${Math.round(hm.belief * 100)}%, ${hm.hits}x terpeleset)${
      h.fix ? ` → wajib arahkan ke: ${h.fix}` : ''
    }`;
    if (weaknesses.length < 5 && !weaknesses.some((w) => w.includes(h.label))) {
      weaknesses.push(line);
    }
  }

  // 2d. Host PWA low-mastery curriculum lessons (prioritized because they have verified quiz attempts)
  for (const hw of hostSnap.hostWeakTopics) {
    if (weaknesses.length < 6 && !weaknesses.some((w) => w.includes(hw))) {
      weaknesses.push(`Materi kuis lemah: ${hw}`);
    }
  }

  // 2e. Low-mastery attempted competencies for target language
  for (const [cid, rec] of Object.entries(mergedComps)) {
    if (!rec || (rec.attempts || 0) < 1) continue;
    const isJaComp = cid.includes('_ja_') || cid.startsWith('ja_') || cid.startsWith('jp-');
    const isEnComp =
      cid.includes('_en_') ||
      cid.startsWith('en-') ||
      cid.includes('daily_a2') ||
      cid.includes('travel_a2') ||
      cid.includes('academic_b1');
    if (targetLang === 'ja' && isEnComp && !isJaComp) continue;
    if (targetLang === 'en' && isJaComp) continue;
    const p = rec.pMasteryDecayed ?? rec.pMastery ?? 0;
    if (p < 0.55) {
      const hName = humanizeCompetencyId(cid, locale);
      const wLabel = `Kompetensi masih lemah: ${hName} (baru ${Math.round(p * 100)}%)`;
      if (weaknesses.length < 6 && !weaknesses.some((w) => w.includes(hName))) {
        weaknesses.push(wLabel);
      }
    }
  }

  // 3. Active competency status & focus directive
  const currentComp = mergedComps[scenario.competencyId];
  const currentMasteryPct = Math.round(
    ((currentComp?.pMasteryDecayed ?? currentComp?.pMastery ?? BRAINCORE_PARAMS.P_INIT) as number) * 100
  );
  const focusDirective =
    mem.mentorBrain.activeFocusAssignment ||
    (weaknesses.length > 0
      ? `Uji dan perbaiki kelemahan utama murid di: ${weaknesses[0]}`
      : `Latih kelancaran dan ketepatan tata bahasa pada misi: ${scenario.competencyNameId} (penguasaan saat ini ${currentMasteryPct}%)`);

  // 4. Cross-session memory summary
  const personalFactsLine =
    mem.userBrain.personalFacts.length > 0
      ? mem.userBrain.personalFacts.join(' | ')
      : 'Belum ada fakta pribadi tercatat — tanyakan dan ingat cerita/hobi/aktivitas murid!';
  const recentSessions = (mem.mentorBrain.sessionSummaries || [])
    .filter((s) => s.targetLang === targetLang)
    .slice(-2);
  const sessionMemLine =
    recentSessions.length > 0
      ? recentSessions
          .map(
            (s) =>
              `[${new Date(s.timestamp).toLocaleDateString('id-ID')}: ${s.turnCount} gilir; ${s.mentorTakeaway}]`
          )
          .join(' ')
      : 'Ini sesi awal bersama murid di bahasa ini — bangun kesan pertama sebagai guru galak tapi penuh perhatian!';

  return [
    '[FIEZEL BRAINCORE LIVE TELEMETRY & TWO-WAY MEMORY DOSSIER]:',
    `- Profil Murid: Nama="${learnerName}" | Level=${activeLevel} | Streak=${hostSnap.streakDays || 1} hari | Total Sesi Telepon=${state.completedCallSessions || 0}`,
    `- Pembacaan Karakter Murid (User Character Reading): ${locale === 'th' ? charProfile.noteTh : charProfile.noteId}`,
    `- TITIK PINTAR MURID (Verified Strengths — akui & apresiasi saat relevan): ${
      strengths.length > 0 ? strengths.slice(0, 5).join(' ; ') : 'Sedang membangun fondasi percakapan awal'
    }`,
    `- TITIK LEMAH & MISKONSEPSI AKTIF (Weaknesses & Grammar Traps — WAJIB diuji, ditegur jika terulang, dan diarahkan): ${
      weaknesses.length > 0
        ? weaknesses.slice(0, 6).join(' ; ')
        : 'Pantau ketepatan partikel/tenses dan cegah terjemahan kata-per-kata'
    }`,
    `- FOKUS INSTRUKSI GURU HARI INI: ${focusDirective}`,
    `- MEMORI OTAK USER (Fakta & Cerita Murid Lintas Sesi): ${personalFactsLine}`,
    `- MEMORI OTAK AI MENTOR (Catatan Sesi Sebelumnya): ${sessionMemLine}`,
    `- KEWAJIBAN PENGGUNAAN DATA BRAINCORE: Kamu TERHUBUNG PENUH dengan otak aplikasi FIEZEL di atas. Jika murid bertanya "aku pintar di mana / lemah di mana / harus fokus apa?", sebutkan data nyata TITIK PINTAR dan TITIK LEMAH mereka secara spesifik! Saat ngobrol, pancing mereka memakai pola yang masih lemah agar mereka benar-benar naik level.`,
  ].join('\n');
}

function resolveSyncApiBase(): string {
  try {
    if (typeof window !== 'undefined') {
      const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(window.location?.hostname || '');
      if (isLocalHost) return '';
      const cfg = (window as any).FIEZEL_CF_CONFIG;
      if (cfg && cfg.base) return String(cfg.base).replace(/\/$/, '');
    }
  } catch (_) {}
  return 'https://api.fiezel.my.id';
}

export async function brainSyncFlush(
  state: BraincoreStoreState
): Promise<{ nextState: BraincoreStoreState; flushedCount: number }> {
  if (!state.syncQueue || state.syncQueue.length === 0) {
    return { nextState: state, flushedCount: 0 };
  }
  try {
    const syncUrl = `${resolveSyncApiBase()}/api/braincore/sync`;
    const res = await fetch(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tabId: state.tabId,
        attempts: state.syncQueue,
      }),
    });
    if (!res.ok) {
      // If server returns error, cap syncQueue to 40 items to prevent local storage quota crash
      const capped = state.syncQueue.length > 40 ? state.syncQueue.slice(-30) : state.syncQueue;
      const updated = saveBraincoreState({
        ...state,
        syncQueue: capped,
      });
      return { nextState: updated, flushedCount: 0 };
    }
    const data = await res.json().catch(() => null);
    const acceptedList: string[] = Array.isArray(data?.acceptedIds)
      ? data.acceptedIds
      : data?.ok
        ? state.syncQueue.map((item) => item.id)
        : [];
    const acceptedIds = new Set<string>(acceptedList);
    const remaining = state.syncQueue.filter((item) => !acceptedIds.has(item.id));
    const updated = saveBraincoreState({
      ...state,
      syncQueue: remaining,
    });
    return { nextState: updated, flushedCount: acceptedIds.size };
  } catch {
    const capped = state.syncQueue.length > 40 ? state.syncQueue.slice(-30) : state.syncQueue;
    const updated = saveBraincoreState({
      ...state,
      syncQueue: capped,
    });
    return { nextState: updated, flushedCount: 0 };
  }
}

export { STORAGE_KEY };
