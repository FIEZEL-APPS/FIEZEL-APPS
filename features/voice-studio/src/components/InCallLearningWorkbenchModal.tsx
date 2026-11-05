import React, { useState, useEffect } from 'react';
import {
  LearnerLocale,
  TargetLang,
  CallScenario,
  VoicePersona,
  VoiceUiAction,
} from '../types/voiceCall';
import { playFiezelSfx } from '../lib/sfx';

export interface DynamicBoardState {
  topicTitle: string;
  patternFormula: string;
  coachExplanation: string;
  wrongSentence: string;
  rightSentence: string;
  wrongReason?: string;
  quiz: {
    prompt: string;
    optionA: {
      text: string;
      isCorrect: boolean;
      feedback: string;
    };
    optionB: {
      text: string;
      isCorrect: boolean;
      feedback: string;
    };
  };
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
}

/**
 * Memeriksa apakah `uiAction` membawa data dinamis yang sudah lengkap dari backend Fiezel.
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
 * Membangun kuis uji pemahaman 2 opsi yang menantang dan mengecoh
 * untuk menguji kepahaman murid secara instan tanpa clutter.
 */
function buildComprehensionChallengeQuiz(
  topicTitle: string,
  sampleRightSent: string,
  sampleWrongSent: string,
  locale: LearnerLocale,
  lowerQ: string,
  action?: VoiceUiAction
): {
  prompt: string;
  optionA: { text: string; isCorrect: boolean; feedback: string };
  optionB: { text: string; isCorrect: boolean; feedback: string };
} {
  const isThai = locale === 'th';
  const isJa = locale === 'ja';
  const isZh = locale === 'zh';
  const isEn = locale === 'en';

  const makeQuizPair = (
    prompt: string,
    correctSent: string,
    wrongSent: string,
    rightFeedback: string,
    wrongFeedback: string
  ) => {
    let hash = 0;
    const seed = `${topicTitle}:${correctSent}`;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    const swapOrder = Math.abs(hash) % 2 === 1;
    const rightOpt = { text: correctSent, isCorrect: true, feedback: rightFeedback };
    const wrongOpt = { text: wrongSent, isCorrect: false, feedback: wrongFeedback };
    return {
      prompt,
      optionA: swapOrder ? wrongOpt : rightOpt,
      optionB: swapOrder ? rightOpt : wrongOpt,
    };
  };

  // 0. PRIORITAS UTAMA MUTLAK: Kalimat Kuis Dinamis Asli dari AI berdasar pertanyaan spesifik murid!
  const dynCorrect = (action?.drillTargetSentence || '').trim();
  const dynTrap = (action?.drillTrapSentence || '').trim();
  if (dynCorrect.length > 4 && dynTrap.length > 4 && dynCorrect !== dynTrap) {
    const prompt =
      (action?.drillMeaningPrompt || '').trim() ||
      (isThai
        ? `ทดสอบความเข้าใจ: เลือกประโยคที่ถูกต้องสำหรับ "${topicTitle}":`
        : isJa
          ? `理解度テスト: 「${topicTitle}」について正しい文を選択してください:`
          : isZh
            ? `理解测试：请选择符合「${topicTitle}」的正确句子：`
            : isEn
              ? `Quick Check: Choose the correct sentence for "${topicTitle}":`
              : `Tes Kepahaman: Pilih kalimat yang BENAR untuk "${topicTitle}":`);
    const rightFeedback = isThai
      ? 'ถูกต้องที่สุด! โครงสร้างประโยคถูกต้องและเป็นธรรมชาติ'
      : isJa
        ? '完璧です！自然な文法構造です。'
        : isZh
          ? '完全正确！句子结构自然准确。'
          : isEn
            ? 'Spot on! That sentence uses the exact right structure.'
            : 'Tepat sekali! Susunan kalimat ini sudah benar dan alami.';
    const wrongFeedback =
      (action?.trapWrongReason || '').trim() ||
      (isThai
        ? 'ระวัง! ประโยคนี้มีจุดที่ผิดหลักไวยากรณ์'
        : isJa
          ? '注意！この文には文法の誤りがあります。'
          : isZh
            ? '注意！这个句子里有语法陷阱。'
            : isEn
              ? 'Watch out! That option contains the grammar trap.'
              : 'Terkecoh! Kalimat ini mengandung jebakan penggunaan kata yang keliru.');
    return makeQuizPair(prompt, dynCorrect, dynTrap, rightFeedback, wrongFeedback);
  }

  // 1. Kasus Verb ing / Present Continuous
  if (
    /verb.*ing|continuous|sedang|right now|studying|bentuk ing|penggunaan ing|กริยา.*ing|เติม\s*ing/i.test(lowerQ) ||
    /verb.*ing|continuous|กริยา.*ing|เติม\s*ing/i.test(topicTitle)
  ) {
    const prompt = isThai
      ? 'ทดสอบความเข้าใจ: ประโยคใดถูกต้องเมื่อทีมงานกำลังทดสอบระบบใหม่อยู่ในขณะนี้?'
      : isJa
      ? '理解度テスト: 現在新しいシステムをテストしている文として正しいのはどれ？'
      : 'Tes Kepahaman: Manakah kalimat yang BENAR saat teknisi sedang menguji sistem baru saat ini?';
    const correctSent = 'The engineers are currently testing the new security system.';
    const trickyDistractor = 'The engineers are currently test the new security system.';
    const rightFeedback = isThai
      ? 'ยอดเยี่ยมมาก! หลัง are กริยาต้องเติม ing (testing) เสมอ'
      : isJa
      ? '正解！areの後は動詞ing形（testing）になります。'
      : 'Tepat sekali! Setelah "are", kata kerja wajib memakai bentuk ing (testing).';
    const wrongFeedback = isThai
      ? 'ระวัง! หลัง to be ต้องใช้ testing ไม่ใช่ test'
      : isJa
      ? '注意！areの後は原型ではなくing形が必要です。'
      : 'Terkecoh! Setelah to be "are", kata kerja wajib memakai bentuk ing (testing, bukan test).';

    return {
      prompt,
      optionA: { text: correctSent, isCorrect: true, feedback: rightFeedback },
      optionB: { text: trickyDistractor, isCorrect: false, feedback: wrongFeedback },
    };
  }

  // 2. Kasus Hard versus Hardly
  if (/hard/i.test(lowerQ)) {
    const prompt = isThai
      ? 'ทดสอบความเข้าใจ: เลือกประโยคที่ถูกต้องสำหรับ "คุณหมอแทบจะไม่ได้นอนเลยระหว่างเข้าเวรฉุกเฉิน":'
      : isJa
      ? '理解度テスト: 「外科医は緊急当直中にほとんど眠らなかった」の正しい文はどれ？'
      : 'Tes Kepahaman: Pilih kalimat yang BENAR untuk "Dokter bedah hampir tidak tidur selama tugas darurat":';
    const correctSent = 'The dedicated surgeon hardly slept during the emergency shifts.';
    const trickyDistractor = 'The dedicated surgeon hard slept during the emergency shifts.';
    const rightFeedback = isThai
      ? 'เก่งมาก! hardly วางไว้หน้ากริยาและแปลว่า "แทบจะไม่เลย"'
      : isJa
      ? '正解！hardlyは動詞の前で「ほとんど〜ない」という意味になります。'
      : 'Tepat sekali! "Hardly" diletakkan sebelum kata kerja dan bermakna "hampir tidak sama sekali".';
    const wrongFeedback = isThai
      ? 'โดนหลอกแล้ว! ถ้าแปลว่าแทบไม่ได้นอน ต้องใช้ hardly slept ห้ามใช้ hard'
      : isJa
      ? '間違い！「ほとんど眠らない」はhardly sleptを使います。'
      : 'Terkecoh! Jika maksudnya "hampir tidak pernah tidur", gunakan "hardly slept".';

    return {
      prompt,
      optionA: { text: correctSent, isCorrect: true, feedback: rightFeedback },
      optionB: { text: trickyDistractor, isCorrect: false, feedback: wrongFeedback },
    };
  }

  // 3. Kasus Borrow versus Lend
  if (/borrow|lend|pinjam/i.test(lowerQ)) {
    const prompt = isThai
      ? 'ทดสอบความเข้าใจ: เลือกประโยคที่ถูกต้องเมื่อคุณต้องการขอยืมแล็ปท็อปของเพื่อนร่วมงาน:'
      : isJa
      ? '理解度テスト: 同僚のノートPCを借りたい時の正しい表現はどれ？'
      : 'Tes Kepahaman: Pilih kalimat yang BENAR saat kamu ingin meminjam laptop rekan kerjamu:';
    const correctSent = 'Could I please borrow your laptop for thirty minutes?';
    const trickyDistractor = 'Could I please lend your laptop for thirty minutes?';
    const rightFeedback = isThai
      ? 'ถูกต้อง! borrow คือการขอยืม ส่วน lend คือการให้ยืม'
      : isJa
      ? '正解！borrowは「借りる」、lendは「貸す」です。'
      : 'Tepat sekali! "Borrow" digunakan saat kamu menerima pinjaman (meminjam).';
    const wrongFeedback = isThai
      ? 'ระวัง! lend แปลว่าให้ยืม ห้ามใช้เมื่อเราเป็นคนขอยืม'
      : isJa
      ? '間違い！自分が借りる時はlendではなくborrowを使います。'
      : 'Terkecoh! "Lend" artinya meminjamkan ke orang lain, bukan meminjam.';

    return {
      prompt,
      optionA: { text: correctSent, isCorrect: true, feedback: rightFeedback },
      optionB: { text: trickyDistractor, isCorrect: false, feedback: wrongFeedback },
    };
  }

  // 4. Kasus Since versus For
  if (/since|for/i.test(lowerQ)) {
    const prompt = isThai
      ? 'ทดสอบความเข้าใจ: ประโยคใดถูกต้องเมื่อระบุระยะเวลาการทำงานต่อเนื่องมา 8 ปี?'
      : isJa
      ? '理解度テスト: 8年間継続して働いている期間を表す正しい文はどれ？'
      : 'Tes Kepahaman: Manakah kalimat yang BENAR saat menyatakan durasi pengalaman kerja 8 tahun?';
    const correctSent = 'Our architect has been designing eco-friendly houses for eight years.';
    const trickyDistractor = 'Our architect has been designing eco-friendly houses since eight years.';
    const rightFeedback = isThai
      ? 'ถูกต้อง! eight years คือช่วงระยะเวลารวม จึงต้องใช้ for'
      : isJa
      ? '正解！期間（8年間）にはforを使います。'
      : 'Tepat sekali! "Eight years" adalah durasi total waktu, sehingga wajib memakai "for".';
    const wrongFeedback = isThai
      ? 'โดนหลอกแล้ว! ห้ามใช้ since กับช่วงความยาวของเวลา ให้ใช้ for'
      : isJa
      ? '間違い！期間にはsinceではなくforを使います。'
      : 'Terkecoh! Jangan gunakan "since" untuk durasi angka waktu. Wajib gunakan "for"!';

    return {
      prompt,
      optionA: { text: correctSent, isCorrect: true, feedback: rightFeedback },
      optionB: { text: trickyDistractor, isCorrect: false, feedback: wrongFeedback },
    };
  }

  // 5. Kasus Preposisi Waktu: In / On / At
  if (/in.*on.*at|at.*on.*in|preposisi|waktu/i.test(lowerQ)) {
    const prompt = isThai
      ? 'ทดสอบความเข้าใจ: เลือกประโยคที่ถูกต้องสำหรับกำหนดการประชุม:'
      : isJa
      ? '理解度テスト: 会議のスケジュールとして正しい文はどれ？'
      : 'Tes Kepahaman: Pilih kalimat yang BENAR untuk jadwal rapat:';
    const correctSent = 'The international conference starts at 9 AM on Monday.';
    const trickyDistractor = 'The international conference starts in 9 AM at Monday.';
    const rightFeedback = isThai
      ? 'ถูกต้อง! at ใช้กับเวลาเจาะจง (9 AM) และ on ใช้กับวัน (Monday)'
      : isJa
      ? '正解！時刻にはat、曜日にはonを使います。'
      : 'Tepat sekali! "At" untuk titik jam (9 AM) dan "on" untuk nama hari (Monday).';
    const wrongFeedback = isThai
      ? 'ระวัง! เวลาเจาะจงต้องใช้ at และวันต้องใช้ on'
      : isJa
      ? '間違い！時刻はat、曜日はonが正しい前置詞です。'
      : 'Terkecoh! Jam spesifik memakai "at" dan hari kalender memakai "on".';

    return {
      prompt,
      optionA: { text: correctSent, isCorrect: true, feedback: rightFeedback },
      optionB: { text: trickyDistractor, isCorrect: false, feedback: wrongFeedback },
    };
  }

  // 6. Kasus Did + Verb 1 / Pertanyaan Lampau
  if (/did|past tense|lampau/i.test(lowerQ)) {
    const prompt = isThai
      ? 'ทดสอบความเข้าใจ: เลือกประโยคคำถามอดีตที่ถูกต้อง:'
      : isJa
      ? '理解度テスト: 正しい過去形の疑問文を選択してください:'
      : 'Tes Kepahaman: Pilih kalimat tanya masa lampau yang BENAR:';
    const correctSent = 'Did your supervisor review the quarterly report yesterday?';
    const trickyDistractor = 'Did your supervisor reviewed the quarterly report yesterday?';
    const rightFeedback = isThai
      ? 'ถูกต้อง! เมื่อมี Did แล้ว กริยาหลักต้องกลับเป็นรูปเดิม (review)'
      : isJa
      ? '正解！Didの後は動詞の原形（review）になります。'
      : 'Tepat sekali! Karena sudah ada "Did", kata kerja utama wajib bentuk dasar (review).';
    const wrongFeedback = isThai
      ? 'ระวัง! ห้ามใช้ Did คู่กับกริยาช่อง 2 (reviewed)'
      : isJa
      ? '注意！Didの後ろに過去形（reviewed）は使えません。'
      : 'Terkecoh! Sudah ada "Did", tidak boleh memakai bentuk lampau (reviewed) lagi!';

    return {
      prompt,
      optionA: { text: correctSent, isCorrect: true, feedback: rightFeedback },
      optionB: { text: trickyDistractor, isCorrect: false, feedback: wrongFeedback },
    };
  }

  // 7. Kasus Make versus Do
  if (/make.*do|do.*make/i.test(lowerQ)) {
    const prompt = isThai
      ? 'ทดสอบความเข้าใจ: เลือกประโยคที่ถูกต้องเกี่ยวกับการตัดสินใจ:'
      : isJa
      ? '理解度テスト: 「決定を下す」の正しい表現はどれ？'
      : 'Tes Kepahaman: Pilih kalimat yang BENAR untuk pembuatan keputusan penting:';
    const correctSent = 'The executive board made a crucial decision this morning.';
    const trickyDistractor = 'The executive board did a crucial decision this morning.';
    const rightFeedback = isThai
      ? 'ยอดเยี่ยม! สำนวนการตัดสินใจใช้ make a decision เสมอ'
      : isJa
      ? '正解！「決定する」は make a decision です。'
      : 'Tepat sekali! Frasa untuk keputusan adalah "make a decision", bukan "do".';
    const wrongFeedback = isThai
      ? 'ระวัง! ห้ามใช้ did a decision'
      : isJa
      ? '注意！did a decisionという表現はありません。'
      : 'Terkecoh! Bahasa Inggris menggunakan "made a decision", bukan "did a decision".';

    return {
      prompt,
      optionA: { text: correctSent, isCorrect: true, feedback: rightFeedback },
      optionB: { text: trickyDistractor, isCorrect: false, feedback: wrongFeedback },
    };
  }

  // 8. Topik Khusus dari Payload Server / Worker (Prioritas Sentences Terpisah)
  if (action?.drillTargetSentence && action?.drillTrapSentence) {
    const prompt =
      action.drillMeaningPrompt ||
      (isThai
        ? `ทดสอบความเข้าใจ: เลือกประโยคที่ถูกต้องสำหรับ "${topicTitle}":`
        : isJa
        ? `理解度テスト: 「${topicTitle}」について正しい文を選択してください:`
        : `Tes Kepahaman: Pilih kalimat yang BENAR untuk "${topicTitle}":`);
    return {
      prompt,
      optionA: {
        text: action.drillTargetSentence,
        isCorrect: true,
        feedback: isThai
          ? 'ถูกต้องที่สุด! โครงสร้างประโยคถูกต้องและเป็นธรรมชาติ'
          : isJa
          ? '完璧です！自然な文法構造です。'
          : 'Tepat sekali! Susunan kalimat ini sudah benar dan alami.',
      },
      optionB: {
        text: action.drillTrapSentence,
        isCorrect: false,
        feedback:
          action.trapWrongReason ||
          (isThai
            ? 'ระวัง! ประโยคนี้มีจุดที่ผิดหลักไวยากรณ์'
            : isJa
            ? '注意！この文には文法の誤りがあります。'
            : 'Terkecoh! Kalimat ini masih mengandung jebakan tata bahasa.'),
      },
    };
  }

  // 9. Topik Dinamis Berdasarkan Kalimat Coach (Dijamin Tidak Mengulang Contoh Penjelasan)
  let baseCorrect = sampleRightSent.trim() || 'I study diligently every single day.';
  let baseWrong = sampleWrongSent.trim() || 'I study hardly every single day.';
  if (baseCorrect === baseWrong) {
    baseWrong = baseCorrect.replace(/\b(\w+)\b/, '$1 to');
  }

  return {
    prompt: isThai
      ? `ทดสอบความเข้าใจ: เลือกประโยคที่ถูกต้องสำหรับ "${topicTitle}":`
      : isJa
      ? `理解度テスト: 「${topicTitle}」について正しい文を選択してください:`
      : `Tes Kepahaman: Pilih kalimat yang BENAR untuk "${topicTitle}":`,
    optionA: {
      text: baseCorrect,
      isCorrect: true,
      feedback: isThai
        ? 'ถูกต้องที่สุด! โครงสร้างประโยคถูกต้อง'
        : isJa
        ? '完璧です！自然な文法構造です。'
        : 'Tepat sekali! Susunan kalimat ini sudah benar dan alami.',
    },
    optionB: {
      text: baseWrong,
      isCorrect: false,
      feedback: isThai
        ? 'ระวัง! ประโยคนี้มีจุดที่ผิดหลักไวยากรณ์'
        : isJa
        ? '注意！この文には文法の誤りがあります。'
        : 'Terkecoh! Kalimat ini masih mengandung kesalahan tata bahasa.',
    },
  };
}

/**
 * Intelligent Pedagogical Deriver:
 * Merangkum 1 baris rumus inti, papan sorot 2 kalimat (Salah vs Benar),
 * dan kuis uji pemahaman tanpa embel-embel paragraf panjang di layar.
 */
export function derivePedagogicalBoard(
  action: VoiceUiAction | undefined,
  rawQuery: string,
  targetLang: TargetLang,
  locale: LearnerLocale
): DynamicBoardState {
  const query = (action?.topicTitle || rawQuery || '').trim();
  const lowerQ = query.toLowerCase();
  const isThai = locale === 'th';
  const isJa = locale === 'ja';
  const isEn = locale === 'en';

  // JIKA ACTION MEMILIKI DATA DARI FIEZEL (PRIORITAS MUTLAK)
  const cleanTitle = (action?.topicTitle || query || (isThai ? 'ไวยากรณ์' : isJa ? '文法' : 'Tata Bahasa'))
    .replace(/[—–]/g, ' ')
    .replace(/verb-ing/gi, 'Verb ing')
    .trim();
  const cleanFormula = (
    action?.patternFormula ||
    (/borrow|lend/i.test(cleanTitle)
      ? (isThai
          ? 'Borrow from (ยืมจาก) vs Lend to (ให้ยืมแก่)'
          : isJa
          ? 'Borrow from (〜から借りる) vs Lend to (〜に貸す)'
          : 'Borrow from (meminjam dari) vs Lend to (meminjamkan ke)')
      : /hard/i.test(cleanTitle)
      ? (isThai
          ? 'Work hard (ทำงานหนัก/ขยัน) vs Hardly work (แทบไม่ทำ)'
          : isJa
          ? 'Work hard (熱心に働く) vs Hardly work (ほとんど働かない)'
          : 'Work hard (giat/keras) vs Hardly work (hampir tidak)')
      : /verb.*ing/i.test(cleanTitle)
      ? 'Subject + [is/am/are] + Verb ing'
      : (isThai ? `โครงสร้าง: ${cleanTitle}` : isJa ? `文法形式: ${cleanTitle}` : `Pola: ${cleanTitle}`))
  )
    .replace(/[—–]/g, ' ')
    .replace(/verb-ing/gi, 'Verb ing')
    .trim();

  const cleanExplanation = (
    action?.coachSpokenScript ||
    action?.explanationText ||
    (/borrow|lend/i.test(cleanTitle)
      ? (isThai
          ? 'Borrow หมายถึงขอยืม (รับมา) ส่วน Lend หมายถึงให้ยืม (มอบให้ผู้อื่น)'
          : isJa
          ? 'Borrowは「借りる（受け取る）」、Lendは「貸す（相手に渡す）」という意味です。'
          : 'Borrow artinya meminjam (menerima), sedangkan lend artinya meminjamkan (memberi ke orang lain).')
      : /hard/i.test(cleanTitle)
      ? (isThai
          ? 'คำว่า hard แปลว่าขยันหรือเต็มที่ ส่วน hardly แปลว่าแทบจะไม่เลย'
          : isJa
          ? 'hardは「一生懸命に」、hardlyは「ほとんど〜ない」という意味になります。'
          : 'Kata "hard" berarti giat atau keras, sedangkan "hardly" berarti hampir tidak sama sekali.')
      : /verb.*ing/i.test(cleanTitle)
      ? (isThai
          ? 'ใช้ to be ตามด้วย Verb ing สำหรับการกระทำที่กำลังดำเนินอยู่ในขณะนี้'
          : isJa
          ? '今まさに行われている動作を表すには「be動詞 ＋ Verb ing」を使います。'
          : 'Gunakan to be ditambah verb ing untuk kegiatan yang sedang berlangsung sekarang.')
      : (isThai
          ? 'สังเกตความแตกต่างของสองคำนี้ เพื่อให้ประโยคดูเป็นธรรมชาติ'
          : isJa
          ? '自然な表現になるよう、単語の使い分けに注意しましょう。'
          : 'Perhatikan perbedaan kedua kata ini agar kalimatmu terdengar alami.'))
  )
    .replace(/[—–]/g, ' ')
    .replace(/verb-ing/gi, 'Verb ing')
    .trim();

  let rightSent = (action?.sampleTarget || action?.drillTargetSentence || '').trim();
  let wrongSent = (action?.trapWrongSentence || '').trim();

  if (!rightSent || rightSent.includes('Bentuk alami')) {
    if (targetLang === 'zh') {
      if (/听|看|一下/i.test(lowerQ)) {
        rightSent = '我想听听看。';
        wrongSent = '我想听一下吧。';
      } else if (/的/i.test(lowerQ)) {
        rightSent = '这是我的书。';
        wrongSent = '这是我书。';
      } else {
        rightSent = '我想听听看。';
        wrongSent = '我想听一下吧。';
      }
    } else if (targetLang === 'ja') {
      if (/で|に|図書館/i.test(lowerQ)) {
        rightSent = '図書館で勉強します。';
        wrongSent = '図書館に勉強します。';
      } else if (/たら/i.test(lowerQ)) {
        rightSent = '勉強したら分かります。';
        wrongSent = '勉強するたら分かります。';
      } else {
        rightSent = '図書館で勉強します。';
        wrongSent = '図書館に勉強します。';
      }
    } else {
      if (/borrow|lend/i.test(lowerQ)) {
        rightSent = 'Can I borrow your pen?';
        wrongSent = 'Can I lend your pen?';
      } else if (/hard/i.test(lowerQ)) {
        rightSent = 'I study hard every day for the exam.';
        wrongSent = 'I study hardly every day for the exam.';
      } else if (/verb.*ing|sedang/i.test(lowerQ)) {
        rightSent = 'I am studying English right now.';
        wrongSent = 'I am study English right now.';
      } else if (/since|for/i.test(lowerQ)) {
        rightSent = 'I have lived here since 2020.';
        wrongSent = 'I have lived here for 2020.';
      } else {
        rightSent = 'I study hard every day for the exam.';
        wrongSent = 'I study hardly every day for the exam.';
      }
    }
  }

  if (!wrongSent || wrongSent === rightSent || wrongSent.includes('Bentuk kaku')) {
    if (targetLang === 'zh') {
      wrongSent = rightSent.includes('听听看')
        ? '我想听一下吧。'
        : rightSent.includes('的')
          ? rightSent.replace(/的/g, '')
          : '我想听一下吧。';
    } else if (targetLang === 'ja') {
      wrongSent = rightSent.includes('で')
        ? rightSent.replace(/で/, 'に')
        : rightSent.includes('たら')
          ? rightSent.replace(/したら/, 'するたら')
          : '図書館に勉強します。';
    } else {
      if (/\bborrow\b/i.test(rightSent)) {
        wrongSent = rightSent.replace(/\bborrow\b/i, 'lend');
      } else if (/\bhard\b/i.test(rightSent)) {
        wrongSent = rightSent.replace(/\bhard\b/i, 'hardly');
      } else if (/\b(am|is|are)\s+(\w+ing)\b/i.test(rightSent)) {
        wrongSent = rightSent.replace(/\b(am|is|are)\s+(\w+)ing\b/i, '$1 $2');
      } else {
        wrongSent = rightSent.replace(/\b(\w+)\b/, '$1 to');
      }
    }
  }

  const quiz = buildComprehensionChallengeQuiz(
    cleanTitle,
    rightSent,
    wrongSent,
    locale,
    lowerQ,
    action
  );

  return {
    topicTitle: cleanTitle,
    patternFormula: cleanFormula,
    coachExplanation: cleanExplanation,
    wrongSentence: wrongSent,
    rightSentence: rightSent,
    wrongReason:
      action?.trapWrongReason ||
      (isThai
        ? 'โครงสร้างนี้ยังไม่ถูกต้อง'
        : isJa
        ? 'この構造は文法的に誤りです。'
        : 'Bentuk ini kurang tepat dalam kaidah tata bahasa.'),
    quiz,
  };
}

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
}) => {
  const [boardState, setBoardState] = useState<DynamicBoardState | null>(null);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null);
  const [isQuizCompleted, setIsQuizCompleted] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  const onSpeakPreviewRef = React.useRef(onSpeakPreview);
  onSpeakPreviewRef.current = onSpeakPreview;
  const lastSpokenKeyRef = React.useRef<string>('');

  useEffect(() => {
    if (!isOpen) {
      setBoardState(null);
      setSelectedOption(null);
      setIsQuizCompleted(false);
      setIsReady(false);
      lastSpokenKeyRef.current = '';
      return;
    }

    const hasRich = hasRichDynamicAction(uiAction);
    const query = (uiAction?.topicTitle || topicTitle || '').trim();
    if (hasRich) {
      const board = derivePedagogicalBoard(uiAction, query, targetLang, locale);
      setBoardState(board);
      setIsReady(true);
      return;
    }

    // Sedang meracik data materi dinamis dari server:
    // Jangan pernah memunculkan template statis selagi AI sedang menyusun jawaban spesifik murid!
    setIsReady(false);
    const fallbackDelayMs = isGeneratingTopic ? 6500 : 2100;
    const timer = setTimeout(() => {
      const board = derivePedagogicalBoard(uiAction, query, targetLang, locale);
      setBoardState(board);
      setIsReady(true);
    }, fallbackDelayMs);

    return () => clearTimeout(timer);
  }, [isOpen, topicTitle, uiAction, targetLang, locale, isGeneratingTopic]);

  if (!isOpen) return null;

  const handleSelectOption = (opt: 'A' | 'B') => {
    if (!boardState) return;
    setSelectedOption(opt);
    const isCorrect =
      opt === 'A' ? boardState.quiz.optionA.isCorrect : boardState.quiz.optionB.isCorrect;
    const correctSent = boardState.quiz.optionA.isCorrect
      ? boardState.quiz.optionA.text
      : boardState.quiz.optionB.text;
    if (isCorrect) {
      playFiezelSfx('answer_correct');
      setIsQuizCompleted(true);
      if (onEvaluatePractice) {
        onEvaluatePractice(
          opt === 'A' ? boardState.quiz.optionA.text : boardState.quiz.optionB.text,
          correctSent,
          boardState.patternFormula,
          { isQuizSuccess: true }
        );
      }
    } else {
      playFiezelSfx('answer_wrong');
    }
  };

  const handleReplayVoice = () => {
    if (boardState?.coachExplanation && onSpeakPreview) {
      const locCode = String(locale || 'id').toLowerCase().split(/[-_]/)[0];
      onSpeakPreview(boardState.coachExplanation, locCode);
    }
  };

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

  const handleResumeTalk = () => {
    const correctSent = boardState
      ? boardState.quiz.optionA.isCorrect
        ? boardState.quiz.optionA.text
        : boardState.quiz.optionB.text
      : undefined;
    if (onResumeConversation) {
      onResumeConversation(isQuizCompleted ? correctSent : undefined, boardState?.topicTitle || topicTitle);
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1C1611]/70 backdrop-blur-xs animate-in fade-in duration-200"
      data-testid="in-call-learning-workbench"
    >
      <div className="w-full max-w-md rounded-[24px] bg-[#FAF4E8] border-2 border-[#D8CBB5] shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER MINIMALIS: JUDUL & TOMBOL TUTUP */}
        <div className="px-4 py-3 bg-[#FFFDF8] border-b border-[#E5DAC6] flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#065F46] text-[10px] font-black tracking-wide uppercase">
                Papan Belajar
              </span>
              <h3
                className="text-xs sm:text-sm font-black text-[#1C1611] truncate"
                data-testid="workbench-topic-title"
              >
                {boardState?.topicTitle || topicTitle || 'Papan Belajar'}
              </h3>
            </div>
            {isReady && boardState?.patternFormula && (
              <p
                className="text-[11px] font-bold text-[#854D0E] bg-[#FEF3C7] border border-[#F59E0B]/30 rounded-md px-2 py-0.5 mt-1 truncate"
                data-testid="workbench-formula-pill"
              >
                {boardState.patternFormula}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="workbench-close-btn"
            className="px-2.5 py-1 rounded-full bg-[#EFE6D5] hover:bg-[#E2D5BE] text-[#4A3E30] font-black text-xs flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
            title="Tutup & Lanjut Ngobrol"
          >
            <span>Tutup</span>
            <span>✕</span>
          </button>
        </div>

        {/* JIKA SEDANG MERACIK: ANIMASI BUFFERING FIEZEL (ZERO CLUTTER) */}
        {!isReady && (
          <div
            data-testid="workbench-buffering-state"
            className="p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[260px]"
          >
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#10B981]/20 animate-ping" />
              <div className="relative w-14 h-14 rounded-2xl bg-[#ECFDF5] border-2 border-[#A7F3D0] flex items-center justify-center shadow-md animate-pulse">
                <span className="text-2xl select-none">🌱</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-[#1C1611] tracking-tight">
                {locale === 'th'
                  ? 'Fiezel กำลังเตรียมบทเรียน...'
                  : locale === 'ja'
                  ? 'Fiezelが教材を準備しています...'
                  : 'Fiezel sedang meracik materi...'}
              </h3>
              <p className="text-xs font-semibold text-[#5C4E3C] max-w-[240px] leading-relaxed">
                {locale === 'th'
                  ? 'กำลังสรุปสูตรและกระดานเน้นประโยคให้คุณ'
                  : locale === 'ja'
                  ? '要点公式と例文ボードを作成中'
                  : 'Menyiapkan rumus dan papan sorot untukmu'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 pt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-bounce" />
            </div>
          </div>
        )}

        {/* JIKA SIAP: 3 ELEMEN MINIMALIS MURNI */}
        {isReady && boardState && (
          <div className="p-3.5 sm:p-4 space-y-3.5 overflow-y-auto max-h-[80vh]">
            {/* ELEMEN 1: PAPAN SOROT KALIMAT (SALAH VS BENAR) */}
            <div
              className="rounded-2xl bg-[#FFFDF8] border-2 border-[#E2D5C1] p-3.5 sm:p-4 shadow-xs space-y-3"
              data-testid="whiteboard-spotlight-card"
            >
              <div className="space-y-2">
                {/* Baris 1: SALAH */}
                <div
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA]"
                  data-testid="wb-row-wrong"
                >
                  <span className="px-2 py-0.5 rounded-md bg-[#EF4444] text-white text-[10px] font-black shrink-0 tracking-wide">
                    ✕ SALAH
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-[#991B1B] line-through leading-snug">
                    {boardState.wrongSentence}
                  </p>
                </div>

                {/* Baris 2: BENAR */}
                <div
                  className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]"
                  data-testid="wb-row-right"
                >
                  <span className="px-2 py-0.5 rounded-md bg-[#10B981] text-white text-[10px] font-black shrink-0 tracking-wide">
                    ✓ BENAR
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-[#065F46] leading-snug">
                    {boardState.rightSentence}
                  </p>
                </div>
              </div>

              {/* Baris 3: Penjelasan Inti Guru (Dalam Bahasa Interface Murid) */}
              {boardState.coachExplanation && (
                <div
                  className="p-3 rounded-xl bg-[#FDF8EE] border border-[#E8DFC8] text-xs leading-relaxed text-[#4A3E30] font-medium"
                  data-testid="wb-coach-explanation-box"
                >
                  <span className="font-bold text-[#8C2233] block mb-1">
                    {locale === 'th'
                      ? 'คำอธิบาย:'
                      : locale === 'ja'
                        ? '解説:'
                        : locale === 'zh'
                          ? '讲解说明:'
                          : locale === 'vi'
                            ? 'Giải thích:'
                            : locale === 'ru'
                              ? 'Объяснение:'
                              : 'Penjelasan:'}
                  </span>
                  <p>{boardState.coachExplanation}</p>
                </div>
              )}

              {/* Baris 4: Suara Coach */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="font-bold text-[#4A3E30] truncate">
                  {persona.name}{' '}
                  {locale === 'th'
                    ? 'กำลังอธิบาย'
                    : locale === 'ja'
                      ? 'が説明中'
                      : locale === 'zh'
                        ? '正在讲解'
                        : locale === 'vi'
                          ? 'đang giải thích'
                          : locale === 'ru'
                            ? 'объясняет'
                            : 'sedang menjelaskan'}
                </span>
                <button
                  type="button"
                  onClick={handleReplayVoice}
                  data-testid="wb-replay-voice-btn"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#EAE2D2] hover:bg-[#DDD3C0] text-[#3D3225] text-[11px] font-bold cursor-pointer transition-colors active:scale-95"
                >
                  <span>🔊</span>
                  <span>
                    {locale === 'th'
                      ? 'ฟังซ้ำ'
                      : locale === 'ja'
                        ? '音声再生'
                        : locale === 'zh'
                          ? '重播语音'
                          : locale === 'vi'
                            ? 'Nghe lại'
                            : locale === 'ru'
                              ? 'Повторить'
                              : 'Ulangi Suara'}
                  </span>
                </button>
              </div>
            </div>

            {/* ELEMEN 2: KUIS TES KEPAHAMAN (2 OPSI CEPAT) */}
            <div className="rounded-2xl bg-[#FFFDF8] border-2 border-[#E2D5C1] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-[#3B82F6]/15 text-[#1D4ED8] text-[9px] font-black uppercase tracking-wider">
                    Uji Pemahaman
                  </span>
                  <span className="text-xs font-black text-[#1C1611]" data-testid="wb-quiz-prompt">
                    {boardState.quiz.prompt}
                  </span>
                </div>
                {isQuizCompleted && (
                  <span className="text-[11px] font-black text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded-full shrink-0">
                    ✓ Benar
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1">
                {/* Opsi A */}
                <button
                  type="button"
                  data-testid="quiz-option-a"
                  onClick={() => handleSelectOption('A')}
                  className={`w-full p-3 rounded-xl border-2 text-left text-xs font-bold cursor-pointer transition-all ${
                    selectedOption === 'A'
                      ? boardState.quiz.optionA.isCorrect
                        ? 'bg-[#D1FAE5] border-[#10B981] text-[#065F46]'
                        : 'bg-[#FEE2E2] border-[#EF4444] text-[#991B1B]'
                      : 'bg-[#FAF4E8] border-[#E5DAC6] text-[#29221B] hover:border-[#D8CBB5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="leading-snug">{boardState.quiz.optionA.text}</span>
                    {selectedOption === 'A' && (
                      <span className="shrink-0">{boardState.quiz.optionA.isCorrect ? '✓' : '✕'}</span>
                    )}
                  </div>
                  {selectedOption === 'A' && (
                    <p className="text-[11px] mt-1.5 font-semibold opacity-95">
                      {boardState.quiz.optionA.feedback}
                    </p>
                  )}
                </button>

                {/* Opsi B */}
                <button
                  type="button"
                  data-testid="quiz-option-b"
                  onClick={() => handleSelectOption('B')}
                  className={`w-full p-3 rounded-xl border-2 text-left text-xs font-bold cursor-pointer transition-all ${
                    selectedOption === 'B'
                      ? boardState.quiz.optionB.isCorrect
                        ? 'bg-[#D1FAE5] border-[#10B981] text-[#065F46]'
                        : 'bg-[#FEE2E2] border-[#EF4444] text-[#991B1B]'
                      : 'bg-[#FAF4E8] border-[#E5DAC6] text-[#29221B] hover:border-[#D8CBB5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="leading-snug">{boardState.quiz.optionB.text}</span>
                    {selectedOption === 'B' && (
                      <span className="shrink-0">{boardState.quiz.optionB.isCorrect ? '✓' : '✕'}</span>
                    )}
                  </div>
                  {selectedOption === 'B' && (
                    <p className="text-[11px] mt-1.5 font-semibold opacity-95">
                      {boardState.quiz.optionB.feedback}
                    </p>
                  )}
                </button>
              </div>
            </div>

            {/* ELEMEN 3: INDIKATOR MIKROFON & TOMBOL AKSI */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0E5D3] border border-[#DFCDB3] text-[11px] text-[#423628]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping shrink-0"></span>
              <span className="font-semibold truncate">
                {locale === 'th'
                  ? `${persona.name} กำลังฟังคุณอยู่... (พูดคุยได้ทันที)`
                  : locale === 'ja'
                  ? `${persona.name}が聞いています…（話しかけてください）`
                  : `${persona.name} sedang mendengarkan... (Kamu bisa langsung bicara)`}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleResumeTalk}
                data-testid="wb-talk-coach-btn"
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#1C1611] hover:bg-[#2F261E] text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-98 transition-all"
              >
                <span>🎙️</span>
                <span>
                  {locale === 'th'
                    ? `คุยต่อกับ ${persona.name}`
                    : locale === 'ja'
                    ? `${persona.name}と会話を続ける`
                    : `Lanjut Ngobrol dengan ${persona.name}`}
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                data-testid="wb-dismiss-footer-btn"
                className="py-2.5 px-3 rounded-xl bg-[#EFE6D5] hover:bg-[#E2D5BE] text-[#4A3E30] text-xs font-bold cursor-pointer transition-colors"
              >
                {locale === 'th' ? 'ปิด ✕' : locale === 'ja' ? '閉じる ✕' : 'Tutup ✕'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
