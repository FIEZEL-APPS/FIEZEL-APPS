import React, { useState, useEffect, useRef } from 'react';
import {
  LearnerLocale,
  TargetLang,
  CallScenario,
  VoicePersona,
  VoiceUiAction,
} from '../types/voiceCall';
import { playFiezelSfx } from '../lib/sfx';

export type WorkbenchContextMode =
  | 'confusing_pair'   // Timbangan Konseptual / Dual Contrast Stream
  | 'syntax_ribbon'    // Pita Kalimat Sintaksis Berwarna
  | 'magic_character'  // Kanvas Kaligrafi Zen & Radikal
  | 'tone_waveform'    // Kurva Nada Suara & Intonasi
  | 'standard_clarity';// Penjelasan Kontekstual Bersih

export type WorkbenchQuizMode = 'multiple_choice' | 'cloze_gap' | 'sentence_blocks';

export interface DynamicQuizData {
  prompt: string;
  // Mode Pilihan Ganda (3-4 Opsi, Anti-Spoiling)
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
  }>;
  // Mode Isian Rumpang (Fill-in-the-Blank / Cloze)
  cloze: {
    prefix: string;
    blankWord: string;
    suffix: string;
    chips: string[];
    feedback: string;
  };
  // Mode Susun Balok Kata (Sentence Builder)
  blocks: {
    correctOrder: string[];
    pool: string[];
    meaningId: string;
    feedback: string;
  };
}

export interface DynamicBoardState {
  contextMode: WorkbenchContextMode;
  topicTitle: string;
  patternFormula: string;
  coachExplanation: string;
  // Data Khusus Confusing Pair (Dual-Stream Contrast)
  pairData?: {
    termA: string;
    descA: string;
    colorA: string;
    termB: string;
    descB: string;
    colorB: string;
    keyAnalogy: string;
  };
  // Data Khusus Syntax Ribbon
  ribbonSegments?: Array<{
    role: string;
    word: string;
    tagColor: string;
  }>;
  // Data Khusus Karakter / Kanji / Hanzi
  characterData?: {
    char: string;
    reading: string;
    meaning: string;
    radical: string;
    radicalMeaning: string;
    strokesCount: number;
  };
  // Data Khusus Nada / Pelafalan
  toneData?: {
    word: string;
    phonetic: string;
    toneType: string;
    toneShape: string;
  };
  // Kuis Interaktif Multi-Mode
  quiz: DynamicQuizData;
}

export interface InCallLearningWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  locale: LearnerLocale;
  targetLang: TargetLang;
  scenario: CallScenario;
  persona: VoicePersona;
  isLiveConnected: boolean;
  callDurationSec?: number;
  isPlayingPreview?: boolean;
  topicTitle: string;
  focusType?: 'grammar' | 'vocab' | 'kanji' | 'kana' | 'sentence_drill';
  explanationText?: string;
  patternFormula?: string;
  drillInstruction?: string;
  sampleTarget?: string;
  currentMasteryPct?: number;
  uiAction?: VoiceUiAction;
  topMisconceptionId?: string | null;
  isGeneratingTopic?: boolean;
  onRequestCustomTopic?: (customQuestion: string, bankTopicId?: string) => void;
  onSpeakPreview?: (sampleText: string, spokenLang?: string) => void;
  onResumeConversation?: (completedSentence?: string, topicTitle?: string) => void;
  onEvaluatePractice?: (
    writtenText: string,
    sampleTarget: string,
    patternFormula: string,
    meta?: any
  ) => any;
  onSendToMentor?: (writtenSentence: string) => void;
  onNavigateModule?: (destination: string) => void;
  forcedExerciseMode?: 'multiple_choice' | 'cloze_gap' | 'sentence_blocks' | null;
  externalQuizSeed?: number;
}

/**
 * Memeriksa apakah `uiAction` membawa data dinamis lengkap dari backend Fiezel.
 */
export function hasRichDynamicAction(action?: VoiceUiAction): boolean {
  if (!action) return false;
  const hasSample = Boolean(action.sampleTarget && action.sampleTarget.trim().length > 3);
  const hasFormula = Boolean(
    action.patternFormula &&
    action.patternFormula.trim().length > 3 &&
    !action.patternFormula.includes('Pola kalimat tepat untuk:')
  );
  const hasRightWord = Boolean(
    action.rightWord &&
    action.rightWord.trim().length > 0 &&
    action.rightWord !== 'bentuk tepat'
  );
  return hasSample || (hasFormula && hasRightWord);
}

/**
 * Menganalisis topik dan menurunkan Kanvas Kontekstual + Soal Interaktif Multi-Mode
 * dengan prinsip ANTI-SPOILING (soal kuis selalu menguji transfer pemahaman baru).
 */
export function deriveContextualPedagogicalBoard(
  action: VoiceUiAction | undefined,
  rawQuery: string,
  targetLang: TargetLang,
  locale: LearnerLocale,
  seedVariant = 0
): DynamicBoardState {
  const query = (action?.topicTitle || rawQuery || '').trim();
  const lowerQ = query.toLowerCase();

  // -------------------------------------------------------------
  // 1. KASUS CONFUSING PAIR: DO VS THAT / DID VS DO
  // -------------------------------------------------------------
  if (/do\s*(?:vs|versus|sama|dan|ke)\s*that|do\s*that|did\s*(?:vs|versus|sama)\s*do/i.test(lowerQ)) {
    return {
      contextMode: 'confusing_pair',
      topicTitle: 'Penggunaan "Do" vs "That"',
      patternFormula: 'Do (Melakukan Tindakan) vs That (Merujuk Benda/Hal Tersebut)',
      coachExplanation:
        '"Do" adalah kata kerja tindakan (melakukan/mengerjakan), sedangkan "that" adalah kata penunjuk benda atau hal yang sedang dibicarakan. Sering dipadukan menjadi: "I do that" (Saya melakukan hal itu).',
      pairData: {
        termA: 'Do / Did',
        descA: 'Kata kerja perbuatan (Aksi)',
        colorA: '#FAF2E6',
        termB: 'That',
        descB: 'Kata penunjuk hal / objek (Benda)',
        colorB: '#F4EFEA',
        keyAnalogy: 'Do = Gerakannya (Aksi). That = Yang ditunjuk (Hal itu).',
      },
      quiz: {
        prompt: 'Lengkapi kalimat: "Kemarin saya sudah menyelesaikan tugas itu."',
        options: [
          { id: 'opt_1', text: 'I did that homework yesterday.', isCorrect: true, feedback: 'Tepat sekali! "Did" untuk lampau, "that" merujuk tugas tersebut.' },
          { id: 'opt_2', text: 'I that did homework yesterday.', isCorrect: false, feedback: 'Urutan terbalik! Kata kerja "did" diletakkan sebelum "that".' },
          { id: 'opt_3', text: 'I do that yesterday.', isCorrect: false, feedback: 'Karena ada kata "yesterday", gunakan bentuk lampau "did", bukan "do".' },
        ],
        cloze: {
          prefix: 'I really enjoyed the movie, so I will',
          blankWord: 'do',
          suffix: 'that again next weekend.',
          chips: ['do', 'that', 'did'],
          feedback: 'Keren! Setelah "will" gunakan kata kerja dasar "do", lalu "that" sebagai objek.',
        },
        blocks: {
          correctOrder: ['Can', 'you', 'do', 'that', 'for', 'me?'],
          pool: ['that', 'do', 'Can', 'for', 'you', 'me?', 'did'],
          meaningId: 'Bisakah kamu melakukan hal itu untukku?',
          feedback: 'Susunan sempurna! "Can you do that for me?"',
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 2. KASUS CONFUSING PAIR: HARD VS HARDLY
  // -------------------------------------------------------------
  if (/hard/i.test(lowerQ)) {
    return {
      contextMode: 'confusing_pair',
      topicTitle: 'Hard versus Hardly',
      patternFormula: 'Work hard (giat/keras) vs Hardly work (hampir tidak)',
      coachExplanation:
        'Kata "hard" berarti giat atau bersungguh-sungguh. Sebaliknya, "hardly" bermakna hampir tidak sama sekali. Hati-hati, arti keduanya bertolak belakang 180 derajat!',
      pairData: {
        termA: 'Hard',
        descA: 'Giat, keras, sungguh-sungguh',
        colorA: '#FEF3C7',
        termB: 'Hardly',
        descB: 'Hampir tidak pernah sama sekali',
        colorB: '#FDE8E4',
        keyAnalogy: 'He works hard (Rajin banget) ≠ He hardly works (Pemalas, gak kerja).',
      },
      quiz: {
        prompt: seedVariant % 2 === 0
          ? 'Pilih kata yang tepat: "Chef itu bekerja ______ untuk menyiapkan hidangan pesta."'
          : 'Pilih kata yang tepat: "Rian begitu kelelahan sampai dia ______ bisa membuka matanya."',
        options: seedVariant % 2 === 0
          ? [
              { id: 'opt_1', text: 'The dedicated chef worked hard all evening.', isCorrect: true, feedback: 'Benar! "Worked hard" artinya bekerja giat dan bersungguh-sungguh.' },
              { id: 'opt_2', text: 'The dedicated chef worked hardly all evening.', isCorrect: false, feedback: 'Terkecoh! "Hardly" artinya hampir tidak bekerja sama sekali.' },
              { id: 'opt_3', text: 'The dedicated chef hardly working all evening.', isCorrect: false, feedback: 'Bentuk tata bahasa kurang tepat.' },
            ]
          : [
              { id: 'opt_1', text: 'Rian was so exhausted that he could hardly open his eyes.', isCorrect: true, feedback: 'Tepat sekali! "Hardly" diletakkan sebelum kata kerja untuk arti "hampir tidak bisa".' },
              { id: 'opt_2', text: 'Rian was so exhausted that he could hard open his eyes.', isCorrect: false, feedback: 'Gunakan "hardly" untuk arti hampir tidak bisa.' },
              { id: 'opt_3', text: 'Rian was so exhausted that he hard opened his eyes.', isCorrect: false, feedback: 'Kata "hard" bukan bermakna hampir tidak.' },
            ],
        cloze: {
          prefix: 'Athletes must train',
          blankWord: 'hard',
          suffix: 'every morning to win the trophy.',
          chips: ['hard', 'hardly', 'hardness'],
          feedback: 'Mantap! Untuk menyatakan usaha keras, selalu gunakan "hard".',
        },
        blocks: {
          correctOrder: ['He', 'studied', 'hard', 'for', 'the', 'final', 'exam.'],
          pool: ['hard', 'studied', 'He', 'for', 'the', 'hardly', 'final', 'exam.'],
          meaningId: 'Dia belajar giat untuk ujian akhir.',
          feedback: 'Susunan kalimat tepat sekali!',
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 3. KASUS CONFUSING PAIR: BORROW VS LEND
  // -------------------------------------------------------------
  if (/borrow|lend|pinjam/i.test(lowerQ)) {
    return {
      contextMode: 'confusing_pair',
      topicTitle: 'Borrow versus Lend',
      patternFormula: 'Borrow from (Meminjam dari orang) vs Lend to (Meminjamkan ke orang)',
      coachExplanation:
        '"Borrow" artinya meminjam (kita yang menerima barang dari teman). "Lend" artinya meminjamkan (kita yang memberikan barang ke orang lain). Perhatikan arah barangnya!',
      pairData: {
        termA: 'Borrow (← Menerima)',
        descA: 'Kita meminjam dari orang lain',
        colorA: '#E6F4EA',
        termB: 'Lend (→ Memberi)',
        descB: 'Kita meminjamkan ke orang lain',
        colorB: '#FEF3C7',
        keyAnalogy: 'Barang masuk ke kita = Borrow. Barang keluar dari kita = Lend.',
      },
      quiz: {
        prompt: 'Pilih kalimat yang sopan saat kamu ingin meminjam payung temanmu:',
        options: [
          { id: 'opt_1', text: 'Could I please borrow your umbrella for an hour?', isCorrect: true, feedback: 'Tepat! Kita yang meminjam, jadi gunakan "borrow".' },
          { id: 'opt_2', text: 'Could I please lend your umbrella for an hour?', isCorrect: false, feedback: 'Salah arah! "Lend" artinya kamu meminjamkan payung temanmu ke orang lain.' },
          { id: 'opt_3', text: 'Could you please borrow me your umbrella?', isCorrect: false, feedback: 'Jika subjeknya "you", gunakan "lend me", bukan "borrow me".' },
        ],
        cloze: {
          prefix: 'My brother agreed to',
          blankWord: 'lend',
          suffix: 'me his gaming laptop tonight.',
          chips: ['lend', 'borrow', 'lending'],
          feedback: 'Benar! Kakak memberikan pinjaman ke saya, jadi gunakan "lend me".',
        },
        blocks: {
          correctOrder: ['May', 'I', 'borrow', 'your', 'dictionary', 'please?'],
          pool: ['borrow', 'May', 'I', 'lend', 'your', 'please?', 'dictionary'],
          meaningId: 'Bolehkah saya meminjam kamusmu?',
          feedback: 'Luar biasa! Kalimat tersusun dengan sangat sopan.',
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 4. KASUS TATA BAHASA SINTAKSIS: VERB ING / PRESENT CONTINUOUS
  // -------------------------------------------------------------
  if (/verb.*ing|continuous|sedang|right now|studying/i.test(lowerQ)) {
    return {
      contextMode: 'syntax_ribbon',
      topicTitle: 'Pola Waktu Sedang Berlangsung (Verb-ing)',
      patternFormula: 'Subjek + [am / is / are] + Kata Kerja (Verb-ing)',
      coachExplanation:
        'Gunakan kata bantu to be (am/is/are) diikuti kata kerja berakhiran -ing saat menyatakan kegiatan yang sedang berlangsung detik ini juga. Jangan pernah meninggalkan to be!',
      ribbonSegments: [
        { role: 'Subjek', word: 'The engineers', tagColor: '#FEF3C7' },
        { role: 'Kata Bantu', word: 'are', tagColor: '#E6F4EA' },
        { role: 'Kata Kerja (-ing)', word: 'testing', tagColor: '#FDE8E4' },
        { role: 'Keterangan', word: 'the new system', tagColor: '#F1F0F7' },
      ],
      quiz: {
        prompt: 'Pilih kalimat yang BENAR saat para siswa sedang membaca buku di perpustakaan saat ini:',
        options: [
          { id: 'opt_1', text: 'The students are reading books in the library right now.', isCorrect: true, feedback: 'Tepat sekali! "Are reading" menyatakan kegiatan yang sedang berlangsung.' },
          { id: 'opt_2', text: 'The students are read books in the library right now.', isCorrect: false, feedback: 'Setelah "are", kata kerja wajib memakai bentuk -ing (reading).' },
          { id: 'opt_3', text: 'The students reading books in the library right now.', isCorrect: false, feedback: 'Jangan hilangkan kata bantu to be "are"!' },
        ],
        cloze: {
          prefix: 'Listen! The choir is',
          blankWord: 'singing',
          suffix: 'a beautiful song on stage.',
          chips: ['singing', 'sing', 'sang'],
          feedback: 'Sempurna! Setelah "is", kata kerja bernyanyi menjadi "singing".',
        },
        blocks: {
          correctOrder: ['We', 'are', 'learning', 'English', 'together', 'today.'],
          pool: ['learning', 'are', 'We', 'learn', 'English', 'together', 'today.'],
          meaningId: 'Kita sedang belajar bahasa Inggris bersama hari ini.',
          feedback: 'Rangkaian kalimat sangat alami dan tepat!',
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 5. KASUS JEPANG: PARTIKEL に (NI) VS で (DE)
  // -------------------------------------------------------------
  if (/ni\s*(?:vs|sama|dan)\s*de|partikel\s*ni|partikel\s*de|に.*で/i.test(lowerQ)) {
    return {
      contextMode: 'confusing_pair',
      topicTitle: 'Partikel に (Ni) vs で (De)',
      patternFormula: 'Tempat + に (Tujuan Gerakan / Keberadaan) vs Tempat + で (Lokasi Aktivitas)',
      coachExplanation:
        'Partikel に (ni) dipakai untuk titik tujuan gerakan (pergi ke...) atau tempat diamnya sesuatu (ada di...). Sedangkan partikel で (de) dipakai untuk tempat berlangsungnya suatu kegiatan aktif (belajar di..., makan di...).',
      pairData: {
        termA: 'Tempat + に (Ni)',
        descA: 'Titik tujuan (pergi ke) / Posisi diam',
        colorA: '#FAF2E6',
        termB: 'Tempat + で (De)',
        descB: 'Tempat melakukan aktivitas / aksi',
        colorB: '#E6F4EA',
        keyAnalogy: 'Tujuan pergi = に (Ni). Tempat beraksi = で (De).',
      },
      quiz: {
        prompt: 'Lengkapi kalimat: "Saya makan ramen di restoran."',
        options: [
          { id: 'opt_1', text: 'レストランで ラーメンを 食べます。', isCorrect: true, feedback: 'Tepat sekali! Makan ramen adalah aktivitas, jadi gunakan partikel で (de).' },
          { id: 'opt_2', text: 'レストランに ラーメンを 食べます。', isCorrect: false, feedback: 'Kurang pas. Partikel に untuk tujuan arah, bukan tempat beraktivitas.' },
          { id: 'opt_3', text: 'レストランを ラーメンに 食べます。', isCorrect: false, feedback: 'Partikel terbalik.' },
        ],
        cloze: {
          prefix: 'あした ともだちと としょかん',
          blankWord: 'で',
          suffix: 'べんきょうします。',
          chips: ['で', 'に', 'を'],
          feedback: 'Benar! Belajar (べんきょうします) adalah aktivitas, jadi gunakan で.',
        },
        blocks: {
          correctOrder: ['わたしは', 'にちようびに', 'とうきょうに', 'いきます。'],
          pool: ['いきます。', 'わたしは', 'とうきょうに', 'とうきょうで', 'にちようびに'],
          meaningId: 'Saya pergi ke Tokyo pada hari Minggu.',
          feedback: 'Susunan kalimat bahasa Jepang sudah sangat tepat!',
        },
      },
    };
  }

  // -------------------------------------------------------------
  // 6. DEFAULT ADAPTIVE FALLBACK (BEBAS KAKU)
  // -------------------------------------------------------------
  const cleanTitle = (action?.topicTitle || query || 'Pemahaman Materi').trim();
  const cleanFormula = (action?.patternFormula || `Pola Inti: ${cleanTitle}`).trim();
  const cleanExplanation = (
    action?.coachSpokenScript ||
    action?.explanationText ||
    'Perhatikan pola dan penggunaannya dalam kalimat agar tuturanmu terdengar alami dan percaya diri.'
  ).trim();

  const targetSent = (action?.drillTargetSentence || action?.sampleTarget || 'I practice speaking English every day.').trim();
  const trapSent = (action?.drillTrapSentence || action?.trapWrongSentence || 'I practice speak English every day.').trim();

  // Pisahkan kata menjadi balok kata dinamis
  const words = targetSent.replace(/[.?!,]/g, '').split(/\s+/).filter(Boolean);
  const blockPool = [...words];
  if (words.length > 2) {
    blockPool.push('is');
  }

  return {
    contextMode: 'standard_clarity',
    topicTitle: cleanTitle,
    patternFormula: cleanFormula,
    coachExplanation: cleanExplanation,
    quiz: {
      prompt: action?.drillMeaningPrompt || `Manakah kalimat yang BENAR untuk "${cleanTitle}"?`,
      options: [
        { id: 'opt_1', text: targetSent, isCorrect: true, feedback: 'Tepat sekali! Susunan kalimat ini sudah benar dan alami.' },
        { id: 'opt_2', text: trapSent, isCorrect: false, feedback: action?.trapWrongReason || 'Terkecoh! Pilihan ini memiliki susunan kata yang kurang tepat.' },
      ],
      cloze: {
        prefix: words.slice(0, Math.max(1, Math.floor(words.length / 2))).join(' '),
        blankWord: words[Math.max(1, Math.floor(words.length / 2))] || 'practice',
        suffix: words.slice(Math.max(1, Math.floor(words.length / 2)) + 1).join(' '),
        chips: [words[Math.max(1, Math.floor(words.length / 2))] || 'practice', 'practicing', 'practiced'],
        feedback: 'Mantap! Kata yang kamu pilih tepat melengkapi kalimat.',
      },
      blocks: {
        correctOrder: words,
        pool: blockPool.sort(() => Math.random() - 0.5),
        meaningId: 'Susun kata-kata berikut agar membentuk kalimat yang padu.',
        feedback: 'Susunan kalimat selesai dengan rapi!',
      },
    },
  };
}

/**
 * KOMPONEN UTAMA KANVAS ADAPTIF KAWAN BICARA
 * Desain Minimalis, Elegan, Anti-AI-Slop, Palet Pastel Lembut FIEZEL.
 */
export const InCallLearningWorkbenchModal: React.FC<InCallLearningWorkbenchProps> = ({
  isOpen,
  onClose,
  locale,
  targetLang,
  persona,
  isLiveConnected,
  topicTitle,
  uiAction,
  isGeneratingTopic,
  onSpeakPreview,
  onResumeConversation,
  onEvaluatePractice,
  onRequestCustomTopic,
  forcedExerciseMode,
  externalQuizSeed,
}) => {
  const [boardState, setBoardState] = useState<DynamicBoardState | null>(null);
  const [quizMode, setQuizMode] = useState<WorkbenchQuizMode>(forcedExerciseMode || 'multiple_choice');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [clozeAnswer, setClozeAnswer] = useState<string | null>(null);
  const [placedBlocks, setPlacedBlocks] = useState<string[]>([]);
  const [isQuizCompleted, setIsQuizCompleted] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [quizSeed, setQuizSeed] = useState<number>(externalQuizSeed ?? 0);

  useEffect(() => {
    if (externalQuizSeed !== undefined && externalQuizSeed !== quizSeed) {
      setQuizSeed(externalQuizSeed);
      setSelectedOptionId(null);
      setClozeAnswer(null);
      setPlacedBlocks([]);
      setIsQuizCompleted(false);
    }
  }, [externalQuizSeed]);

  useEffect(() => {
    if (forcedExerciseMode && forcedExerciseMode !== quizMode) {
      setQuizMode(forcedExerciseMode);
      setSelectedOptionId(null);
      setClozeAnswer(null);
      setPlacedBlocks([]);
      setIsQuizCompleted(false);
    }
  }, [forcedExerciseMode]);

  const onSpeakPreviewRef = useRef(onSpeakPreview);
  onSpeakPreviewRef.current = onSpeakPreview;
  const lastSpokenKeyRef = useRef<string>('');

  // Identifikasi kunci soal saat ini
  const currentKey = `${uiAction?.bankTopicId || ''}::${uiAction?.topicTitle || topicTitle || ''}::${quizSeed}`;
  const lastKeyRef = useRef<string>('');

  // SIKLUS HIDUP STATE BERSIH (PEMBERANTAS MUTLAK GHOST ANSWER BUG)
  useEffect(() => {
    if (!isOpen) {
      setBoardState(null);
      setSelectedOptionId(null);
      setClozeAnswer(null);
      setPlacedBlocks([]);
      setIsQuizCompleted(false);
      setIsReady(false);
      lastKeyRef.current = '';
      lastSpokenKeyRef.current = '';
      return;
    }

    // JIKA TOPIK BERGANTI SELAGI MODAL TERBUKA: BERSIHKAN JAWABAN LAMA SEKETIKA!
    if (lastKeyRef.current && lastKeyRef.current !== currentKey) {
      setSelectedOptionId(null);
      setClozeAnswer(null);
      setPlacedBlocks([]);
      setIsQuizCompleted(false);
    }
    lastKeyRef.current = currentKey;

    const query = (uiAction?.topicTitle || topicTitle || '').trim();
    const hasRich = hasRichDynamicAction(uiAction);

    if (hasRich) {
      const derived = deriveContextualPedagogicalBoard(uiAction, query, targetLang, locale, quizSeed);
      setBoardState(derived);
      setIsReady(true);
      return;
    }

    setIsReady(false);
    const delayMs = isGeneratingTopic ? 5500 : 1800;
    const timer = setTimeout(() => {
      const derived = deriveContextualPedagogicalBoard(uiAction, query, targetLang, locale, quizSeed);
      setBoardState(derived);
      setIsReady(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [isOpen, currentKey, topicTitle, uiAction, targetLang, locale, isGeneratingTopic, quizSeed]);

  // Handler Suara Guru
  useEffect(() => {
    if (isReady && boardState?.coachExplanation && onSpeakPreviewRef.current) {
      const key = `${boardState.topicTitle}::${boardState.coachExplanation}`;
      if (lastSpokenKeyRef.current !== key) {
        lastSpokenKeyRef.current = key;
        if (!isLiveConnected) {
          const locCode = String(locale || 'id').toLowerCase().split(/[-_]/)[0];
          onSpeakPreviewRef.current(boardState.coachExplanation, locCode);
        }
      }
    }
  }, [isReady, boardState, isLiveConnected, locale]);

  if (!isOpen) return null;

  // Interaksi 1: Pilihan Ganda 3 Opsi
  const handleSelectOption = (optId: string) => {
    if (!boardState) return;
    setSelectedOptionId(optId);
    const opt = boardState.quiz.options.find((o) => o.id === optId);
    if (opt?.isCorrect) {
      playFiezelSfx('answer_correct');
      setIsQuizCompleted(true);
      if (onEvaluatePractice) {
        onEvaluatePractice(opt.text, opt.text, boardState.patternFormula, { isQuizSuccess: true });
      }
    } else {
      playFiezelSfx('answer_wrong');
    }
  };

  // Interaksi 2: Isian Rumpang (Cloze)
  const handleSelectClozeChip = (word: string) => {
    if (!boardState || isQuizCompleted) return;
    setClozeAnswer(word);
    const isCorrect = word.toLowerCase().trim() === boardState.quiz.cloze.blankWord.toLowerCase().trim();
    if (isCorrect) {
      playFiezelSfx('answer_correct');
      setIsQuizCompleted(true);
      if (onEvaluatePractice) {
        const full = `${boardState.quiz.cloze.prefix} ${word} ${boardState.quiz.cloze.suffix}`;
        onEvaluatePractice(full, full, boardState.patternFormula, { isQuizSuccess: true });
      }
    } else {
      playFiezelSfx('answer_wrong');
    }
  };

  // Interaksi 3: Susun Balok Kata (Sentence Blocks)
  const handleAddBlock = (word: string) => {
    if (isQuizCompleted) return;
    playFiezelSfx('tap');
    const nextBlocks = [...placedBlocks, word];
    setPlacedBlocks(nextBlocks);

    if (nextBlocks.length === boardState?.quiz.blocks.correctOrder.length) {
      const joinedPlaced = nextBlocks.join(' ').toLowerCase();
      const joinedTarget = boardState.quiz.blocks.correctOrder.join(' ').toLowerCase();
      if (joinedPlaced === joinedTarget) {
        playFiezelSfx('answer_correct');
        setIsQuizCompleted(true);
        if (onEvaluatePractice) {
          onEvaluatePractice(joinedPlaced, joinedTarget, boardState.patternFormula, { isQuizSuccess: true });
        }
      } else {
        playFiezelSfx('answer_wrong');
      }
    }
  };

  const handleRemoveBlock = (index: number) => {
    if (isQuizCompleted) return;
    playFiezelSfx('tap');
    setPlacedBlocks(placedBlocks.filter((_, i) => i !== index));
  };

  // Handler Ganti Soal Bersih (Clean State Regeneration)
  const handleReRollQuestion = () => {
    playFiezelSfx('tap');
    setSelectedOptionId(null);
    setClozeAnswer(null);
    setPlacedBlocks([]);
    setIsQuizCompleted(false);
    setQuizSeed((prev) => prev + 1);

    if (onRequestCustomTopic) {
      onRequestCustomTopic(`Soal latihan baru tentang ${topicTitle}`, 'custom_dynamic');
    }
  };

  const handleReplayVoice = () => {
    if (boardState?.coachExplanation && onSpeakPreview) {
      const locCode = String(locale || 'id').toLowerCase().split(/[-_]/)[0];
      onSpeakPreview(boardState.coachExplanation, locCode);
    }
  };

  const handleResumeTalk = () => {
    if (onResumeConversation) {
      onResumeConversation(undefined, boardState?.topicTitle || topicTitle);
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1C1611]/60 backdrop-blur-sm animate-in fade-in duration-200"
      data-testid="in-call-learning-workbench"
    >
      <div className="w-full max-w-md rounded-[28px] bg-[#FDFAF4] border border-[#EADBCE] shadow-[0_20px_50px_rgba(28,22,17,0.18)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER MINIMALIS PASTEL FIEZEL */}
        <div className="px-5 py-3.5 bg-[#FBF8F1] border-b border-[#F0E6D9] flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FDE8E4] text-[#B85D43] text-[10px] font-bold tracking-wide uppercase w-fit">
                ✦ Papan Belajar
              </span>
              <h3 className="text-xs sm:text-sm font-extrabold text-[#231A12] leading-tight line-clamp-1" data-testid="workbench-topic-title">
                {boardState?.topicTitle || topicTitle || 'Papan Belajar'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="workbench-close-btn"
            className="w-8 h-8 rounded-full bg-[#F3EBE0] hover:bg-[#EADBCE] text-[#5C4A38] font-bold text-xs flex items-center justify-center cursor-pointer shrink-0 transition-transform active:scale-90"
            title="Tutup & Lanjut Ngobrol"
          >
            ✕
          </button>
        </div>

        {/* JIKA SEDANG MERACIK MATERI: ANIMASI ORGANIK MINIMALIS */}
        {!isReady && (
          <div data-testid="workbench-buffering-state" className="p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[280px]">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#FDE8E4] animate-ping opacity-75" />
              <div className="relative w-14 h-14 rounded-2xl bg-[#FFF9F5] border border-[#F5D5CE] flex items-center justify-center shadow-xs">
                <span className="text-2xl select-none">✨</span>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-[#231A12] tracking-tight">
                {locale === 'th' ? 'Fiezel กำลังเตรียมบทเรียน...' : locale === 'ja' ? 'Fiezelが教材を準備中...' : 'Menyiapkan papan belajar...'}
              </h3>
              <p className="text-xs text-[#8C7760] max-w-[220px] leading-relaxed">
                Meracik penjelasan visual dan latihan khusus untukmu
              </p>
            </div>
          </div>
        )}

        {/* JIKA MATERI SIAP: KANVAS ADAPTIF & LATIHAN MULTI-MODE */}
        {isReady && boardState && (
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            {/* -------------------------------------------------------------
                KANVAS 1: DUAL-STREAM CONTRAST (UNTUK CONFUSING PAIR)
            ------------------------------------------------------------- */}
            {boardState.contextMode === 'confusing_pair' && boardState.pairData && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Sisi A */}
                  <div className="p-3 rounded-2xl bg-[#FFF9F2] border border-[#F0E4D3] space-y-1">
                    <span className="text-xs font-black text-[#B45309] block">{boardState.pairData.termA}</span>
                    <p className="text-[11px] font-medium text-[#5C4A38] leading-tight">{boardState.pairData.descA}</p>
                  </div>
                  {/* Sisi B */}
                  <div className="p-3 rounded-2xl bg-[#F7F9F5] border border-[#E3EBDC] space-y-1">
                    <span className="text-xs font-black text-[#2D7A4D] block">{boardState.pairData.termB}</span>
                    <p className="text-[11px] font-medium text-[#5C4A38] leading-tight">{boardState.pairData.descB}</p>
                  </div>
                </div>
                {/* Analogi Inti */}
                <div className="px-3.5 py-2 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] text-[11.5px] font-semibold text-[#5C4A38] flex items-center gap-2">
                  <span className="text-amber-600 font-bold">💡 Intinya:</span>
                  <span>{boardState.pairData.keyAnalogy}</span>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                KANVAS 2: PITA KALIMAT SINTAKSIS (UNTUK GRAMMAR / FORMULA)
            ------------------------------------------------------------- */}
            {boardState.contextMode === 'syntax_ribbon' && boardState.ribbonSegments && (
              <div className="space-y-2 p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE]">
                <span className="text-[10px] font-bold text-[#8C7760] tracking-wider uppercase block">
                  Pola Susunan Kalimat
                </span>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {boardState.ribbonSegments.map((seg, idx) => (
                    <React.Fragment key={idx}>
                      <div className="px-2.5 py-1.5 rounded-xl border border-black/5 flex flex-col items-center" style={{ backgroundColor: seg.tagColor }}>
                        <span className="text-[9px] font-bold text-black/60 uppercase">{seg.role}</span>
                        <span className="text-xs font-black text-[#231A12]">{seg.word}</span>
                      </div>
                      {idx < boardState.ribbonSegments!.length - 1 && (
                        <span className="text-[#8C7760] font-bold text-xs">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* PENJELASAN SINGKAT GURU DENGAN TOMBOL AUDIO */}
            <div className="p-3.5 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] space-y-2">
              <p className="text-xs text-[#3D2E20] leading-relaxed font-medium">
                {boardState.coachExplanation}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-[#F0E6D9]">
                <span className="text-[11px] font-semibold text-[#8C7760]">
                  {persona.name} {persona.voiceName ? `(${persona.voiceName})` : ''}
                </span>
                <button
                  type="button"
                  onClick={handleReplayVoice}
                  data-testid="wb-replay-voice-btn"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[11px] font-bold cursor-pointer transition-colors active:scale-95"
                >
                  <span>🔊</span>
                  <span>Dengarkan</span>
                </button>
              </div>
            </div>

            {/* -------------------------------------------------------------
                AREA LATIHAN INTERAKTIF MULTI-MODE (ANTI-SPOILING)
            ------------------------------------------------------------- */}
            <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#EADBCE] space-y-3">
              {/* Top Bar Kuis & Switcher Mode */}
              <div className="flex items-center justify-between gap-2 border-b border-[#F0E6D9] pb-2.5">
                <div className="flex items-center gap-1 bg-[#FAF4E8] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { playFiezelSfx('tap'); setQuizMode('multiple_choice'); }}
                    data-testid="mode-tab-multiple_choice"
                    className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all ${
                      quizMode === 'multiple_choice' ? 'bg-[#FFFFFF] text-[#231A12] shadow-xs' : 'text-[#8C7760] hover:text-[#5C4A38]'
                    }`}
                  >
                    Pilihan
                  </button>
                  <button
                    type="button"
                    onClick={() => { playFiezelSfx('tap'); setQuizMode('cloze_gap'); }}
                    data-testid="mode-tab-cloze_gap"
                    className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all ${
                      quizMode === 'cloze_gap' ? 'bg-[#FFFFFF] text-[#231A12] shadow-xs' : 'text-[#8C7760] hover:text-[#5C4A38]'
                    }`}
                  >
                    Isian Kata
                  </button>
                  <button
                    type="button"
                    onClick={() => { playFiezelSfx('tap'); setQuizMode('sentence_blocks'); }}
                    data-testid="mode-tab-sentence_blocks"
                    className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all ${
                      quizMode === 'sentence_blocks' ? 'bg-[#FFFFFF] text-[#231A12] shadow-xs' : 'text-[#8C7760] hover:text-[#5C4A38]'
                    }`}
                  >
                    Susun Balok
                  </button>
                </div>

                {/* Tombol Ganti Soal Bersih */}
                <button
                  type="button"
                  onClick={handleReRollQuestion}
                  data-testid="wb-reroll-btn"
                  className="px-2.5 py-1 rounded-xl bg-[#FAF4E8] hover:bg-[#F3EBE0] text-[#5C4A38] text-[10.5px] font-bold inline-flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                  title="Ganti Soal Baru Tanpa Terjawab Duluan"
                >
                  <span>↻</span>
                  <span>Ganti Soal</span>
                </button>
              </div>

              {/* MODE 1: PILIHAN GANDA (3 OPSI TRANSFER) */}
              {quizMode === 'multiple_choice' && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-bold text-[#231A12]">{boardState.quiz.prompt}</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {boardState.quiz.options.map((opt) => {
                      const isSelected = selectedOptionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(opt.id)}
                          data-testid={`quiz-option-${opt.id}`}
                          className={`w-full p-2.5 rounded-xl border text-left text-xs font-semibold cursor-pointer transition-all active:scale-98 ${
                            isSelected
                              ? opt.isCorrect
                                ? 'bg-[#E6F4EA] border-[#34D399] text-[#1B5E34]'
                                : 'bg-[#FDE8E4] border-[#F87171] text-[#991B1B]'
                              : 'bg-[#FDFAF4] border-[#EADBCE] text-[#3D2E20] hover:border-[#D8CBB5]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>{opt.text}</span>
                            {isSelected && <span>{opt.isCorrect ? '✓' : '✕'}</span>}
                          </div>
                          {isSelected && (
                            <p className="text-[10.5px] mt-1 font-medium opacity-90">{opt.feedback}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MODE 2: ISIAN RUMPANG (CLOZE GAP) */}
              {quizMode === 'cloze_gap' && (
                <div className="space-y-2.5 pt-1">
                  <p className="text-xs font-bold text-[#231A12]">Ketuk kata yang tepat untuk melengkapi kalimat:</p>
                  <div className="p-3 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] text-xs font-medium text-[#231A12] leading-relaxed">
                    {boardState.quiz.cloze.prefix}{' '}
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-[#FFFFFF] border-2 border-dashed border-[#B45309] font-bold text-[#B45309] min-w-[50px] text-center">
                      {clozeAnswer || '______'}
                    </span>{' '}
                    {boardState.quiz.cloze.suffix}
                  </div>
                  {/* Pilihan Kata Chip */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {boardState.quiz.cloze.chips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectClozeChip(chip)}
                        data-testid={`cloze-chip-${idx}`}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                          clozeAnswer === chip
                            ? chip.toLowerCase() === boardState.quiz.cloze.blankWord.toLowerCase()
                              ? 'bg-[#E6F4EA] border-[#34D399] text-[#1B5E34]'
                              : 'bg-[#FDE8E4] border-[#F87171] text-[#991B1B]'
                            : 'bg-[#FFFFFF] border-[#EADBCE] text-[#3D2E20] hover:border-[#D8CBB5]'
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                  {clozeAnswer && (
                    <p className={`text-[11px] font-semibold ${
                      clozeAnswer.toLowerCase() === boardState.quiz.cloze.blankWord.toLowerCase()
                        ? 'text-[#1B5E34]'
                        : 'text-[#991B1B]'
                    }`}>
                      {clozeAnswer.toLowerCase() === boardState.quiz.cloze.blankWord.toLowerCase()
                        ? boardState.quiz.cloze.feedback
                        : 'Kata tersebut belum pas. Coba kata yang lain!'}
                    </p>
                  )}
                </div>
              )}

              {/* MODE 3: SUSUN BALOK KATA (SENTENCE BLOCKS) */}
              {quizMode === 'sentence_blocks' && (
                <div className="space-y-2.5 pt-1">
                  <p className="text-xs font-bold text-[#231A12]">{boardState.quiz.blocks.meaningId}</p>
                  {/* Slot Kalimat yang Sedang Disusun */}
                  <div className="min-h-[44px] p-2 rounded-xl bg-[#FAF6EE] border border-[#EADBCE] flex flex-wrap gap-1.5 items-center">
                    {placedBlocks.length === 0 ? (
                      <span className="text-[11px] text-[#8C7760] italic">Ketuk balok di bawah untuk menyusun kalimat...</span>
                    ) : (
                      placedBlocks.map((blk, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleRemoveBlock(idx)}
                          className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] border border-[#D8CBB5] text-xs font-bold text-[#231A12] shadow-2xs hover:bg-[#FEE2E2] cursor-pointer"
                        >
                          {blk} ✕
                        </button>
                      ))
                    )}
                  </div>
                  {/* Pool Balok Kata Tersedia */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {boardState.quiz.blocks.pool.map((blk, idx) => {
                      const countInPool = boardState.quiz.blocks.pool.filter(w => w === blk).length;
                      const countPlaced = placedBlocks.filter(w => w === blk).length;
                      const isExhausted = countPlaced >= countInPool;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isExhausted}
                          onClick={() => handleAddBlock(blk)}
                          data-testid={`available-block-${idx}`}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isExhausted
                              ? 'opacity-35 bg-[#EADBCE] border-transparent text-[#8C7760] cursor-not-allowed'
                              : 'bg-[#FFFFFF] border-[#EADBCE] text-[#3D2E20] hover:border-[#B45309] active:scale-95'
                          }`}
                        >
                          {blk}
                        </button>
                      );
                    })}
                  </div>
                  {isQuizCompleted && (
                    <p className="text-[11px] font-bold text-[#1B5E34]">
                      ✓ {boardState.quiz.blocks.feedback}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* STATUS SUARA MIKROFON & TOMBOL SELESAI */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FBF8F1] border border-[#F0E6D9] text-[11px] text-[#5C4A38]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping shrink-0" />
              <span className="font-semibold truncate">
                {persona.name} sedang mendengarkan (bisa bicara langsung via mic)
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1 pb-1">
              <button
                type="button"
                onClick={handleResumeTalk}
                data-testid="wb-talk-coach-btn"
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#231A12] hover:bg-[#3D2E20] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98 transition-all"
              >
                <span>🎙️</span>
                <span>Lanjut Bicara dengan {persona.name}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                data-testid="wb-dismiss-footer-btn"
                className="py-2.5 px-3.5 rounded-xl bg-[#F3EBE0] hover:bg-[#EADBCE] text-[#5C4A38] text-xs font-bold cursor-pointer transition-colors"
              >
                Tutup ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
