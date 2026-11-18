/**
 * FIEZEL · features/interactive-chat/fiezel-voice-pedagogy.js
 * Pedagogical Linguistic Analyzer & Braincore Misconception Diagnosis Engine.
 * Ported from Google AI Studio Voice Call Architecture.
 *
 * Enforces:
 * 1. Zero-Dumbing Invariant: Zero praise for incorrect grammar; exact misconceptionId & whyFailsId.
 * 2. Zero-Loss Input: Preserves verbatim student utterances.
 * 3. Exact Syntactic & Morphological corrections for English and Japanese.
 * 4. Braincore BKT (Bayesian Knowledge Tracing) & IRT 3PL parameter telemetry.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.FiezelVoicePedagogy = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  'use strict';

  /**
   * Canonical client Braincore defaults ("Satu Otak, Satu Penggaris"):
   * Exact match with features/brain/fiezel-brain-config.js & fiezel-mastery-bkt.js.
   */
  var BRAINCORE_PARAMS = {
    P_INIT: 0.20,
    P_LEARN: 0.15,
    P_SLIP: 0.10,
    P_GUESS: 0.25,
    MASTERY_T: 0.95,
    DEVELOPING_T: 0.55,
    MIN_CORRECT_FOR_MASTERY: 5,
    DISCRIMINATION: 1.5,
    GUESS_FLOOR: 0.25,
    TARGET_SUCCESS: 0.80,
    HALF_LIFE_DAYS: 30.0
  };

  function resolveCanonicalBktParams() {
    var cfg = null;
    var bkt = null;
    try {
      cfg = root.FiezelBrainConfig || (root.parent && root.parent !== root ? root.parent.FiezelBrainConfig : null);
      bkt = root.FiezelMasteryBKT || (root.parent && root.parent !== root ? root.parent.FiezelMasteryBKT : null);
    } catch (_) {}
    var b = (bkt && bkt.PARAMS) || (cfg && cfg.bkt) || null;
    var g = (bkt && bkt.GATE) || null;
    var z = (bkt && bkt.ZPD) || null;
    var d = (cfg && cfg.difficulty) || null;
    var m = (cfg && cfg.memory) || null;
    function n(v, fb) { return typeof v === 'number' && isFinite(v) ? v : fb; }
    return {
      P_INIT: n(b && b.L0, BRAINCORE_PARAMS.P_INIT),
      P_LEARN: n(b && b.T, BRAINCORE_PARAMS.P_LEARN),
      P_SLIP: n(b && b.slip, BRAINCORE_PARAMS.P_SLIP),
      P_GUESS: n(b && b.guess, BRAINCORE_PARAMS.P_GUESS),
      MASTERY_T: n(g && g.L, BRAINCORE_PARAMS.MASTERY_T),
      DEVELOPING_T: n(z && z.lo, BRAINCORE_PARAMS.DEVELOPING_T),
      MIN_CORRECT_FOR_MASTERY: Math.max(1, Math.round(n(g && g.minN, BRAINCORE_PARAMS.MIN_CORRECT_FOR_MASTERY))),
      DISCRIMINATION: n(d && d.discrimination, BRAINCORE_PARAMS.DISCRIMINATION),
      GUESS_FLOOR: n(d && d.guessFloor, BRAINCORE_PARAMS.GUESS_FLOOR),
      TARGET_SUCCESS: n(d && d.targetSuccess, BRAINCORE_PARAMS.TARGET_SUCCESS),
      HALF_LIFE_DAYS: n(m && m.baseHalfLifeDays, BRAINCORE_PARAMS.HALF_LIFE_DAYS)
    };
  }

  var CANONICAL_TAXONOMY_CODES = [
    'tense_aspect.aspect_for_completed', 'tense_aspect.habitual_overgeneralized',
    'tense_aspect.progressive_overuse', 'tense_aspect.perfect_misuse',
    'tense_aspect.timeline_mismatch', 'tense_aspect.future_form_confusion',
    'agreement.bare_form', 'agreement.number_mismatch', 'agreement.missing_auxiliary',
    'structure.double_marking', 'structure.word_order', 'structure.inversion_error',
    'structure.malformed_blend', 'structure.omitted_element',
    'modality.function_confusion', 'modality.strength_miscalibrated',
    'modality.negation_scope', 'modality.past_reference_error',
    'conditionals.type_mismatch', 'conditionals.clause_form_swap',
    'passive.active_for_passive', 'passive.participle_form',
    'passive.causative_confusion', 'passive.impersonal_pattern',
    'reported.backshift_error', 'reported.deixis_shift',
    'articles.definiteness_mismatch', 'articles.countability_quantifier',
    'articles.sound_rule', 'articles.zero_article',
    'comparison.degree_scope', 'comparison.form_intensifier',
    'prepositions.semantic_category', 'prepositions.collocation',
    'lexical.form_confusion', 'lexical.register_mismatch',
    'complementation.gerund_infinitive_swap', 'complementation.meaning_pair_shift',
    'complementation.bare_form_error', 'complementation.verb_pattern',
    'relative.pronoun_choice', 'relative.restrictiveness', 'relative.reduction_error',
    'question.auxiliary_error', 'question.polarity_negation', 'question.wh_choice',
    'pronouns.case_form', 'linking.connector_choice', 'transfer.id_l1_pattern'
  ];

  var CANONICAL_SET = {};
  for (var ci = 0; ci < CANONICAL_TAXONOMY_CODES.length; ci++) {
    CANONICAL_SET[CANONICAL_TAXONOMY_CODES[ci]] = true;
  }

  function mapToCanonicalTaxonomyCode(rawCode, detailText, targetLang) {
    var raw = String(rawCode || '').trim();
    if (CANONICAL_SET[raw]) return raw;
    var probe = (raw + ' ' + String(detailText || '')).toLowerCase();
    if (/overregulariz|past_tense_irregular|tense|timeline|lampau|yesterday|last\s+week/.test(probe)) {
      return 'tense_aspect.timeline_mismatch';
    }
    if (/stative|progressive|-ing\b/.test(probe)) return 'tense_aspect.progressive_overuse';
    if (/perfect|already|since|for\s+\d/.test(probe)) return 'tense_aspect.perfect_misuse';
    if (/future|will\s|going\s+to/.test(probe)) return 'tense_aspect.future_form_confusion';
    if (/agree\b|be_plus_base_verb|l1_transfer|indonesian|terjemah|kopula/.test(probe)) {
      return 'transfer.id_l1_pattern';
    }
    if (/auxiliary|do\/does|missing_aux|tanya|question/.test(probe)) return 'agreement.missing_auxiliary';
    if (/plural|singular|number|jamak|tunggal|subject.?verb/.test(probe)) return 'agreement.number_mismatch';
    if (/bare_form|infleksi|third\s*person|goed|buyed|eated|seed/.test(probe)) return 'agreement.bare_form';
    if (/double_mark|although.*but|negasi\s+ganda|would.*if/.test(probe)) return 'structure.double_marking';
    if (/word_order|urutan|svo|time.?place|incomplete_clause/.test(probe)) return 'structure.word_order';
    if (/omitted|missing|hilang|bolong/.test(probe)) return 'structure.omitted_element';
    if (/tara|conditional|andaian|if\s+clause/.test(probe)) return 'conditionals.clause_form_swap';
    if (/particle|partikel|preposit|in\/on\/at|は|が|を|に|で/.test(probe)) return 'prepositions.semantic_category';
    if (/desu_verb|blend|malformed|konjugasi|conjugat/.test(probe)) return 'structure.malformed_blend';
    if (/measure_word|satuan|量词|article|a\/an\/the|countable/.test(probe)) return 'articles.countability_quantifier';
    if (/modal|must|should|might|can|could/.test(probe)) return 'modality.function_confusion';
    if (/passive|pasif|v3|participle/.test(probe)) return 'passive.participle_form';
    if (/gerund|infinitive|to\s*\+\s*-ing/.test(probe)) return 'complementation.gerund_infinitive_swap';
    if (/pronoun|kata\s+ganti/.test(probe)) return 'pronouns.case_form';
    if (/tone|pitch|pronunci|phonem|nada|aksen|intonasi|mora/.test(probe)) return 'lexical.form_confusion';
    if (/register|formal|sopan|keigo|casual/.test(probe)) return 'lexical.register_mismatch';
    if (targetLang === 'ja' || targetLang === 'zh') return 'structure.malformed_blend';
    return 'lexical.form_confusion';
  }

  // Bug #1 & #2: Hasil "tidak dinilai". Analyzer deterministik hanya berwenang menyatakan SALAH
  // untuk pola yang ia kenali secara eksplisit. Selain itu ia DIAM (ok: null) — penilaian final
  // adalah hak AI (turn.mistakeSignal). Zero-Dumbing: tidak ada pujian tanpa bukti.
  function undecided(text) {
    return {
      ok: null,
      userExactTranscript: text,
      misconceptionId: null,
      canonicalCode: null,
      whyFailsId: null,
      whyFailsTh: null,
      missingTokens: [],
      syntacticCorrection: null,
      naturalReformulation: null,
      pedagogicalFeedbackId: null,
      pedagogicalFeedbackTh: null,
      aiReply: null,
      aiReplyTranslationId: null,
      aiReplyTranslationTh: null
    };
  }

  /**
   * Normalizes and validates output from a pre-trained neural classifier
   * (Workers AI JSON-mode / Gemini Live / Turn-by-Turn evaluator) for ANY free-form
   * utterance — enforces Zero-Dumbing + canonical misconception-taxonomy-v1 mapping.
   */
  function normalizeNeuralDiagnosis(neuralPayload, rawTranscript, targetLang) {
    var text = String(rawTranscript || '').trim();
    var p = neuralPayload && typeof neuralPayload === 'object' ? neuralPayload : null;
    if (!text || !p || typeof p.ok !== 'boolean') return undecided(text);

    var ok = p.ok;
    var rawCode = !ok ? String(p.misconceptionId || p.misconceptionCode || p.errorType || 'freeform_grammar_error').trim() : null;
    var whyId = !ok ? String(p.whyFailsId || p.explanationId || p.reason || '').trim() : null;
    var corr = String(p.syntacticCorrection || p.correction || p.naturalReformulation || '').trim() || null;
    if (!ok && (!whyId || whyId.length < 6)) {
      whyId = 'Sistem mendeteksi ketidaksesuaian tata bahasa pada "' + text + '"' + (corr ? '; bentuk yang lebih tepat: "' + corr + '".' : '.');
    }
    var canonicalCode = !ok ? mapToCanonicalTaxonomyCode(p.canonicalCode || rawCode, whyId + ' ' + text, targetLang) : null;
    var specificMiscId = !ok ? (rawCode || canonicalCode) : null;

    var acc = typeof p.accuracyScore === 'number' && isFinite(p.accuracyScore)
      ? Math.max(0, Math.min(100, Math.round(p.accuracyScore)))
      : (ok ? 90 : 52);
    var gram = typeof p.grammarScore === 'number' && isFinite(p.grammarScore)
      ? Math.max(0, Math.min(100, Math.round(p.grammarScore)))
      : (ok ? 92 : 46);

    return {
      ok: ok,
      accuracyScore: ok ? acc : Math.min(acc, 72),
      grammarScore: ok ? gram : Math.min(gram, 68),
      fluencyScore: typeof p.fluencyScore === 'number' && isFinite(p.fluencyScore) ? Math.round(p.fluencyScore) : (ok ? 88 : 68),
      vocabUsageScore: typeof p.vocabUsageScore === 'number' && isFinite(p.vocabUsageScore) ? Math.round(p.vocabUsageScore) : (ok ? 90 : 66),
      userExactTranscript: text,
      misconceptionId: specificMiscId,
      canonicalCode: canonicalCode,
      whyFailsId: whyId,
      whyFailsTh: !ok ? String(p.whyFailsTh || p.explanationTh || whyId || '').trim() || null : null,
      missingTokens: Array.isArray(p.missingTokens) ? p.missingTokens.slice(0, 8).map(String) : [],
      syntacticCorrection: corr,
      naturalReformulation: String(p.naturalReformulation || corr || text).trim(),
      pedagogicalFeedbackId: String(p.pedagogicalFeedbackId || whyId || (ok ? 'Struktur dan tata bahasa sudah natural.' : '')).trim() || null,
      pedagogicalFeedbackTh: String(p.pedagogicalFeedbackTh || '').trim() || null,
      aiReply: p.aiReply ? String(p.aiReply) : null,
      aiReplyTranslationId: p.aiReplyTranslationId ? String(p.aiReplyTranslationId) : null,
      aiReplyTranslationTh: p.aiReplyTranslationTh ? String(p.aiReplyTranslationTh) : null,
      source: 'neural_classifier'
    };
  }

  // Analyzer kalengan ini dirancang HANYA untuk skenario terukur 'scen_*'.
  function isScopedScenario(sId) {
    return typeof sId === 'string' && sId.indexOf('scen_') === 0;
  }

  /**
   * Deterministic linguistic analyzer fallback & augmentation for Zero-Dumbing Invariant
   */
  function analyzeUtterancePedagogy(rawTranscript, scenarioId, targetLang) {
    var text = String(rawTranscript || '').trim();
    var lower = text.toLowerCase();
    var sId = scenarioId || '';
    var lang = targetLang || (sId.indexOf('ja') >= 0 ? 'ja' : 'en');
    if (!text || !isScopedScenario(sId)) return undecided(text);

    if (lang === 'en') {
      // 1. Check morphological overregularization (goed, buyed, eated, seed)
      var irrMatch = lower.match(/\b(goed|buyed|eated|seed)\b/i);
      if (irrMatch) {
        var matched = irrMatch[1].toLowerCase();
        var replacementMap = {
          goed: 'went',
          buyed: 'bought',
          eated: 'ate',
          seed: 'saw'
        };
        var fixedWord = replacementMap[matched] || 'went';
        var corrected = text.replace(new RegExp('\\b' + matched + '\\b', 'gi'), fixedWord);
        return {
          ok: false,
          accuracyScore: 48,
          grammarScore: 40,
          fluencyScore: 72,
          vocabUsageScore: 65,
          userExactTranscript: text,
          misconceptionId: 'past_tense_irregular_' + matched,
          whyFailsId: 'Miskonsepsi Morfologi (Overregularization): Kata kerja tak beraturan "' + matched + '" tidak boleh ditambah akhiran -ed. Gunakan bentuk lampau "' + fixedWord + '".',
          whyFailsTh: 'ความเข้าใจผิดด้านรูปคำ (Overregularization): กริยาไม่ปกติ "' + matched + '" ไม่สามารถเติม -ed ได้ ต้องใช้รูปอดีต "' + fixedWord + '"',
          missingTokens: [],
          syntacticCorrection: corrected,
          naturalReformulation: 'Last weekend I went to Bandung with my brother, and we ate delicious local street food.',
          pedagogicalFeedbackId: 'Perhatikan bentuk kata kerja lampau: ganti "' + matched + '" menjadi "' + fixedWord + '". Dalam narasi masa lampau (last weekend), semua kata kerja utama wajib konsisten dalam Past Simple.',
          pedagogicalFeedbackTh: 'สังเกตรูปกริยาอดีต: เปลี่ยน "' + matched + '" เป็น "' + fixedWord + '" เมื่อเล่าเรื่องในอดีต กริยาหลักทั้งหมดต้องอยู่ในรูป Past Simple อย่างสม่ำเสมอ',
          aiReply: 'Ah, sounds like a fun trip! Just a quick tip: instead of saying "' + matched + '", we say "' + fixedWord + '"—so, "Last weekend I ' + fixedWord + ' to Bandung." What else did you do while you were there?',
          aiReplyTranslationId: 'Wah, terdengar seperti perjalanan yang seru! Sedikit catatan: alih-alih mengatakan "' + matched + '", kita menggunakan "' + fixedWord + '". Apa lagi yang kamu lakukan selama di sana?',
          aiReplyTranslationTh: 'ฟังดูเป็นทริปที่สนุกมาก! คำแนะนำสั้นๆ: แทนที่จะพูดว่า "' + matched + '" เราจะใช้คำว่า "' + fixedWord + '" ครับ แล้วตอนอยู่ที่นั่นคุณได้ทำอะไรอีกบ้าง?'
        };
      }

      // 2. Check stative verbs & auxiliary misuse (I am want, I am agree, I am like)
      if (/\bi\s+am\s+want\b|\bi\s+am\s+agree\b|\bi\s+am\s+like\b/i.test(lower)) {
        var isAgree = /\bi\s+am\s+agree\b/i.test(lower);
        return {
          ok: false,
          accuracyScore: 52,
          grammarScore: 44,
          fluencyScore: 70,
          vocabUsageScore: 68,
          userExactTranscript: text,
          misconceptionId: isAgree ? 'be_plus_base_verb_agree' : 'be_plus_stative_verb_want',
          whyFailsId: isAgree
            ? 'Miskonsepsi Sintaksis: "agree" adalah kata kerja (verb), bukan kata sifat (adjective), sehingga tidak boleh didahului "am/is/are".'
            : 'Miskonsepsi Sintaksis: Kata kerja statif "want" tidak digabung dengan "am" (hindari "I am want"). Gunakan "I would like" atau "I want".',
          whyFailsTh: isAgree
            ? 'ความเข้าใจผิดทางไวยากรณ์: "agree" เป็นคำกริยา ไม่ใช่คำคุณศัพท์ จึงไม่ต้องมี "am" นำหน้า ให้พูดว่า "I agree"'
            : 'ความเข้าใจผิดทางไวยากรณ์: คำกริยา "want" ไม่ใช้คู่กับ "am" (หลีกเลี่ยง "I am want") ให้ใช้ "I would like" แทน',
          missingTokens: isAgree ? [] : ['would like', 'am meeting'],
          syntacticCorrection: isAgree
            ? text.replace(/\bI\s+am\s+agree\b/gi, 'I agree').replace(/\bAlthough\s+([^,]+),\s*but\b/gi, 'Although $1,')
            : "I'd like a hot coffee, please. After this, I am meeting my friend at the library.",
          naturalReformulation: isAgree
            ? 'I agree that remote work has benefits. Although it saves time, employees can feel isolated at home.'
            : "I'd like a hot coffee, please. After this, I'm meeting my friend at the library.",
          pedagogicalFeedbackId: isAgree
            ? 'Hilangkan "am" sebelum "agree" (cukup "I agree"). Selain itu, jika sudah menggunakan "Although" di awal kalimat, jangan tambahkan "but" di klausa kedua.'
            : 'Ganti "I am want" menjadi "I would like" untuk memesan dengan sopan, dan tambahkan to-be "am" sebelum "meeting" ("I am meeting") untuk Present Continuous.',
          pedagogicalFeedbackTh: isAgree
            ? 'ตัด "am" หน้า "agree" ออก (ใช้แค่ "I agree") และหากใช้ "Although" แล้ว ไม่ต้องใส่ "but" ซ้ำในประโยคหลัง'
            : 'เปลี่ยน "I am want" เป็น "I would like" เพื่อความสุภาพ และเติม "am" หน้า "meeting" ("I am meeting") สำหรับ Present Continuous',
          aiReply: isAgree
            ? 'That is an important point about isolation. Remember to say "I agree" rather than "I am agree." How do you think companies can help remote workers feel more connected?'
            : 'Got it, one hot coffee coming up! By the way, to make it sound super natural, say "I would like a hot coffee" and "I am meeting my friend." What are you and your friend studying at the library?',
          aiReplyTranslationId: isAgree
            ? 'Itu poin penting soal rasa terisolasi. Ingat untuk mengatakan "I agree", bukan "I am agree". Menurutmu bagaimana perusahaan bisa membantu pekerja jarak jauh tetap terhubung?'
            : 'Siap, satu kopi panas! Ngomong-ngomong, agar terdengar sangat natural, ucapkan "I would like a hot coffee" dan "I am meeting my friend." Apa yang akan kamu pelajari bersama temanmu di perpustakaan?',
          aiReplyTranslationTh: isAgree
            ? 'นั่นเป็นประเด็นสำคัญเรื่องความรู้สึกโดดเดี่ยว อย่าลืมพูดว่า "I agree" แทน "I am agree" นะคะ คุณคิดว่าบริษัทจะช่วยให้พนักงานที่ทำงานจากบ้านรู้สึกเชื่อมโยงกันมากขึ้นได้อย่างไร?'
            : 'รับทราบ กาแฟร้อน 1 แก้วครับ! เพื่อให้ฟังดูเป็นธรรมชาติมากขึ้น ลองพูดว่า "I would like a hot coffee" และ "I am meeting my friend" นะครับ วันนี้จะไปติววิชาอะไรกับเพื่อนที่ห้องสมุดเอ่ย?'
        };
      }

      // 3. Incomplete clause or word order (pola salah eksplisit, tanpa batas panjang kata)
      if (/^went\s+i\b/i.test(lower) || /\band\s+later\s+go\s+library\b/i.test(lower)) {
        return {
          ok: false,
          accuracyScore: 45,
          grammarScore: 42,
          fluencyScore: 55,
          vocabUsageScore: 50,
          userExactTranscript: text,
          misconceptionId: 'incomplete_clause_or_word_order',
          whyFailsId:
            'Urutan Sintaksis & Kelengkapan Kalimat: Subjek atau kata kerja bantu (auxiliary/preposition) masih tertinggal sehingga struktur S-V-O belum utuh.',
          whyFailsTh:
            'การเรียงลำดับคำและความสมบูรณ์ของประโยค: ขาดคำกริยาช่วยหรือคำบุพบท ทำให้โครงสร้างประโยคยังไม่สมบูรณ์',
          missingTokens: sId.indexOf('past') >= 0 ? ['Last weekend', 'went to'] : ['would like', 'am going to'],
          syntacticCorrection: sId.indexOf('past') >= 0
            ? 'Yesterday I went to Bandung and felt very happy.'
            : "I'd like a coffee, and later I am going to the library.",
          naturalReformulation: sId.indexOf('past') >= 0
            ? 'Yesterday, I went to Bandung with my family and had a great time.'
            : "I'd like an iced coffee, please, and later I'm heading to the library.",
          pedagogicalFeedbackId:
            'Susun kalimat dimulai dari Subjek + Kata Kerja ("I went to..." atau "I am going to..."), dan gunakan preposisi "to" sebelum nama tempat.',
          pedagogicalFeedbackTh:
            'เรียงประโยคโดยเริ่มจาก ประธาน + กริยา ("I went to..." หรือ "I am going to...") และใส่คำบุพบท "to" หน้าสถานที่เสมอ',
          aiReply: sId.indexOf('past') >= 0
            ? 'Oh, you went to Bandung yesterday! You can say, "Yesterday I went to Bandung and I was very happy." Who did you go with?'
            : 'Nice! To make the sentence complete, you can say: "I would like a coffee, and later I am going to the library." How long are you staying at the library today?',
          aiReplyTranslationId: sId.indexOf('past') >= 0
            ? 'Oh, kamu pergi ke Bandung kemarin! Kamu bisa mengatakan, "Yesterday I went to Bandung and I was very happy." Bersama siapa kamu pergi ke sana?'
            : 'Bagus! Agar kalimatnya utuh, kamu bisa mengatakan: "I would like a coffee, and later I am going to the library." Berapa lama kamu akan berada di perpustakaan hari ini?',
          aiReplyTranslationTh: sId.indexOf('past') >= 0
            ? 'อ๋อ เมื่อวานไปบันดุงมาใช่ไหมครับ! คุณสามารถพูดได้ว่า "Yesterday I went to Bandung and I was very happy." ไปเที่ยวกับใครมาเอ่ย?'
            : 'ดีเลย! เพื่อให้ประโยคสมบูรณ์ ลองพูดว่า "I would like a coffee, and later I am going to the library." วันนี้จะอยู่ที่ห้องสมุดนานไหมครับ?'
        };
      }

      // Zero-Dumbing Target Fulfillment: Hanya nyatakan ok: true bila memenuhi bukti target pembelajaran skenario
      var meetsTargetEn = false;
      if (sId.indexOf('cafe') >= 0 && /(would\s+like|'d\s+like)/i.test(lower) && /\bam\s+(meeting|working|preparing|going|heading)\b/i.test(lower)) {
        meetsTargetEn = true;
      } else if (sId.indexOf('past') >= 0 && /\b(went|ate|saw|took|visited)\b/i.test(lower) && text.split(/\s+/).length >= 6) {
        meetsTargetEn = true;
      } else if (sId.indexOf('ielts') >= 0 && /\b(although|whereas|while)\b/i.test(lower) && !/\bbut\b/i.test(lower)) {
        meetsTargetEn = true;
      }

      if (meetsTargetEn) {
        return {
          ok: true,
          accuracyScore: 94,
          grammarScore: 95,
          fluencyScore: 92,
          vocabUsageScore: 94,
          userExactTranscript: text,
          misconceptionId: null,
          whyFailsId: null,
          whyFailsTh: null,
          missingTokens: [],
          syntacticCorrection: null,
          naturalReformulation: text,
          pedagogicalFeedbackId:
            'Struktur kalimat, pemilihan tense, dan penghubung klausa sudah akurat serta terdengar natural.',
          pedagogicalFeedbackTh:
            'โครงสร้างประโยค การเลือกใช้ Tense และการเชื่อมประโยคถูกต้องและเป็นธรรมชาติมาก',
          aiReply: sId.indexOf('ielts') >= 0
            ? 'Excellent point. Your use of a concessive clause with "Although" clearly contrasts the benefits and drawbacks. Do you think governments should regulate remote work hours in the future?'
            : sId.indexOf('past') >= 0
              ? 'That sounds like an awesome weekend in Bandung! Street food in the mountain air is the best. Which dish was your favorite?'
              : 'One iced latte coming right up! Best of luck preparing your presentation with your team this afternoon. What is your presentation topic about?',
          aiReplyTranslationId: sId.indexOf('ielts') >= 0
            ? 'Poin yang sangat tajam. Penggunaan klausa konsesif "Although" mempertentangkan kelebihan dan kekurangan dengan sangat jelas. Menurutmu apakah pemerintah perlu mengatur jam kerja jarak jauh di masa depan?'
            : sId.indexOf('past') >= 0
              ? 'Terdengar seperti akhir pekan yang luar biasa di Bandung! Jajanan kaki lima di udara pegunungan memang paling nikmat. Makanan mana yang paling kamu sukai?'
              : 'Satu iced latte segera disiapkan! Semoga sukses menyiapkan presentasi bersama timmu sore ini. Apa topik presentasi kalian?',
          aiReplyTranslationTh: sId.indexOf('ielts') >= 0
            ? 'เป็นประเด็นที่ยอดเยี่ยมมาก การใช้ประโยค "Although" ช่วยเปรียบเทียบข้อดีและข้อเสียได้ชัดเจน คุณคิดว่ารัฐบาลควรกำหนดกฎหมายชั่วโมงการทำงานทางไกลในอนาคตไหมคะ?'
            : sId.indexOf('past') >= 0
              ? 'ฟังดูเป็นวันหยุดสุดสัปดาห์ที่ยอดเยี่ยมที่บันดุงเลย! อาหารริมทางท่ามกลางอากาศบนภูเขาคือที่สุดแล้ว ชอบเมนูไหนมากที่สุดครับ?'
              : 'ลาเต้เย็น 1 แก้วได้แล้วครับ! ขอให้การเตรียมงานนำเสนอกับทีมช่วงบ่ายนี้ราบรื่นนะ หัวข้อที่นำเสนอเกี่ยวกับเรื่องอะไรครับ?'
        };
      }

      // Zero-Dumbing: Kalimat bahasa Inggris yang tidak cocok dengan pola salah eksplisit di atas
      // diserahkan ke AI. Tidak ada pujian tanpa bukti (ok: null).
      return undecided(text);
    }

    // Japanese (Kaiwa N5–N4)
    var isN4 = sId.indexOf('n4') >= 0;
    // Bug #1 & #15: Hanya deteksi pola salah nyata. "コーヒーにします" adalah bahasa Jepang yang sah.
    if (/飲むです|するたら|コーヒーにください/.test(text)) {
      return {
        ok: false,
        accuracyScore: 50,
        grammarScore: 45,
        fluencyScore: 68,
        vocabUsageScore: 64,
        userExactTranscript: text,
        misconceptionId: isN4 ? 'ja_tara_conjugation_error' : 'ja_particle_o_and_desu_verb',
        whyFailsId: isN4
          ? 'Miskonsepsi Konjugasi ～たら: Pola kondisional ～たら wajib dibentuk dari bentuk lampau pendek (た-form: 勉強したら), bukan kamus + たら (勉強するたら).'
          : 'Miskonsepsi Partikel & Kopula: Objek langsung wajib ditandai partikel を (bukan に), dan kata kerja tidak boleh langsung diikuti です ("飲むです" → "飲みます" atau "～をください").',
        whyFailsTh: isN4
          ? 'ความเข้าใจผิดการผันรูป ～たら: ต้องผันกริยาเป็นรูปอดีต (た-form) ก่อนเติม ら เช่น 勉強したら ไม่ใช่ 勉強するたら'
          : 'ความเข้าใจผิดเรื่องคำช่วยและรูปสุภาพ: กรรมตรงต้องใช้คำช่วย を (ไม่ใช่ に) และห้ามวาง です หลังคำกริยารูปพจนานุกรมโดยตรง ("飲むです" ผิด)',
        missingTokens: isN4 ? ['ので', '勉強したらいいですか'] : ['を', 'ください'],
        syntacticCorrection: isN4
          ? '来週テストがあるので、どう勉強したらいいですか。'
          : 'ホットコーヒーを一つください。',
        naturalReformulation: isN4
          ? '来週大切なテストがあるので、毎日どう勉強したらいいですか。'
          : 'すみません、ホットコーヒーを一つとチーズケーキを一つください。',
        pedagogicalFeedbackId: isN4
          ? 'Ganti "勉強するたら" menjadi bentuk lampau pendek + ら: "勉強したらいいですか", serta gunakan "テストがあるので" agar terdengar sopan kepada senpai.'
          : 'Gunakan partikel を setelah nama pesanan dan akhiri dengan ください: "ホットコーヒーを一つください。"',
        pedagogicalFeedbackTh: isN4
          ? 'เปลี่ยน "勉強するたら" เป็นรูป た + ら คือ "勉強したらいいですか" และใช้ "テストがあるので" เพื่อความสุภาพเมื่อคุยกับรุ่นพี่'
          : 'ใช้คำช่วย を หลังชื่อเมนู และลงท้ายด้วย ください: "ホットコーヒーを一つください。"',
        aiReply: isN4
          ? 'なるほど、来週テストがあるんだね！「どう勉強したらいいですか」と言うと自然だよ。まずは教科書のまとめから一緒に始めようか？'
          : 'ホットコーヒーですね！注文するときは「ホットコーヒーを一つください」と言ってみましょう。お砂糖とミルクはお使いになりますか？',
        aiReplyTranslationId: isN4
          ? 'Begitu ya, minggu depan ada ujian! Akan terdengar natural jika kamu mengatakan "Dou benkyou shitara ii desu ka". Bagaimana kalau kita mulai dari rangkuman buku teks dulu?'
          : 'Kopi panas ya! Saat memesan, mari ucapkan "Hotto koohii o hitotsu kudasai". Apakah Anda ingin menggunakan gula dan susu?',
        aiReplyTranslationTh: isN4
          ? 'อย่างนี้นี่เอง สัปดาห์หน้ามีสอบสินะ! ถ้าพูดว่า "Dou benkyou shitara ii desu ka" จะเป็นธรรมชาติมากเลย เรามาเริ่มจากสรุปเนื้อหาในหนังสือเรียนกันก่อนดีไหม?'
          : 'กาแฟร้อนนะคะ! เวลาสั่งลองพูดว่า "Hotto koohii o hitotsu kudasai" ดูนะคะ รับน้ำตาลกับนมด้วยไหมคะ?'
      };
    }

    // Zero-Dumbing Target Fulfillment: Hanya nyatakan ok: true bila terbukti memenuhi target skenario
    var meetsTargetJa = false;
    if (sId.indexOf('kissaten') >= 0 && /(を|お).*(ください|お願いします)/.test(text)) {
      meetsTargetJa = true;
    } else if (isN4 && /(ので|から).*(したらいい|どうすれば)/.test(text)) {
      meetsTargetJa = true;
    }

    if (meetsTargetJa) {
      return {
        ok: true,
        accuracyScore: 95,
        grammarScore: 96,
        fluencyScore: 92,
        vocabUsageScore: 95,
        userExactTranscript: text,
        misconceptionId: null,
        whyFailsId: null,
        whyFailsTh: null,
        missingTokens: [],
        syntacticCorrection: null,
        naturalReformulation: text,
        pedagogicalFeedbackId:
          'Penggunaan partikel, konjugasi kata kerja sopan, dan intonasi kalimat sudah tepat.',
        pedagogicalFeedbackTh:
          'การใช้คำช่วย การผันกริยารูปสุภาพ และโครงสร้างประโยคถูกต้องสมบูรณ์',
        aiReply: isN4
          ? 'いい質問だね！毎日30分ずつ重要な文法を復習するのがおすすめだよ。今週の金曜日、図書館で一緒に練習しない？'
          : 'かしこまりました！ホットコーヒーをお一つと、チーズケーキをお一つですね。店内でお召し上がりですか？',
        aiReplyTranslationId: isN4
          ? 'Pertanyaan yang bagus! Aku sarankan kamu mengulang tata bahasa penting 30 menit setiap hari. Jumat minggu ini, mau latihan bersama di perpustakaan?'
          : 'Baik, dimengerti! Satu kopi panas dan satu cheesecake ya. Apakah ingin dinikmati di dalam kafe?',
        aiReplyTranslationTh: isN4
          ? 'เป็นคำถามที่ดีเลย! แนะนำให้ทบทวนไวยากรณ์สำคัญวันละ 30 นาทีนะ วันศุกร์นี้มาฝึกด้วยกันที่ห้องสมุดไหม?'
          : 'รับทราบค่ะ! กาแฟร้อน 1 ที่ และชีสเค้ก 1 ที่นะคะ รับประทานที่ร้านใช่ไหมคะ?'
      };
    }

    // Zero-Dumbing: Kalimat bahasa Jepang yang tidak cocok dengan pola salah eksplisit
    // diserahkan ke AI. Tidak ada pujian tanpa bukti (ok: null).
    return undecided(text);
  }

  /**
   * IRT 3PL Success Probability calculation
   */
  function calculateIRTProbability(abilityTheta, difficultyB, discriminationA) {
    var cfg = resolveCanonicalBktParams();
    var a = Math.max(0.01, Number(discriminationA || cfg.DISCRIMINATION));
    var diff = Number(abilityTheta || 0) - Number(difficultyB || 0);
    var z = -a * diff;
    var latent;
    if (z > 40.0) latent = 0.0;
    else if (z < -40.0) latent = 1.0;
    else latent = 1.0 / (1.0 + Math.exp(z));
    return cfg.GUESS_FLOOR + (1.0 - cfg.GUESS_FLOOR) * latent;
  }

  /**
   * BKT Update computation (unified with canonical FiezelMasteryBKT)
   */
  function computeBktUpdate(pCurrent, isCorrect, hintsUsed, confidence) {
    var cfg = resolveCanonicalBktParams();
    var p = Math.max(0.001, Math.min(0.999, Number(pCurrent == null ? cfg.P_INIT : pCurrent)));
    var s = cfg.P_SLIP;
    var g = cfg.P_GUESS;
    var l = cfg.P_LEARN;
    var h = Math.max(0, Math.floor(hintsUsed || 0));

    if (h > 0 && isCorrect) {
      s = Math.min(0.35, s + 0.08 * h);
    }
    if (typeof confidence === 'number' && !isNaN(confidence)) {
      if (isCorrect && confidence <= 0.35) {
        g = Math.min(0.45, g + 0.15);
      }
      if (!isCorrect && confidence >= 0.9) {
        s = Math.max(0.04, s - 0.05);
      }
    }

    var num = isCorrect ? p * (1.0 - s) : p * s;
    var den = isCorrect ? num + (1.0 - p) * g : num + (1.0 - p) * (1.0 - g);
    var post = den > 0 ? num / den : p;
    var updated = post + (1.0 - post) * l;
    return Math.max(0.01, Math.min(0.99, Number(updated.toFixed(4))));
  }

  function resolveSideKey(baseKey) {
    try {
      if (typeof root.sideStateKey === 'function') return root.sideStateKey(baseKey);
    } catch (_) {}
    return baseKey;
  }

  /**
   * Telemetry recording into Braincore BKT & Misconception Ledger
   */
  function recordPedagogicalAttempt(params) {
    var p = params || {};
    var cid = String(p.competencyId || '').trim();
    // Bug #1 & #15: Tolak verdict non-boolean (termasuk ok: null dari undecided)
    if (!cid || typeof p.ok !== 'boolean') return null;

    var cfg = resolveCanonicalBktParams();
    var ok = p.ok;
    var now = Date.now();
    var hasHostBkt = typeof root.bktRecord === 'function';
    var hasHostLedger = typeof root.misconceptionLedgerRecord === 'function';
    var kappa = p.hintsUsed ? 0.45 : (ok ? 0.70 : 0.55);
    var boost = 1.2;

    // 1. Baca estimasi BKT awal sebelum pembaruan (canonical BKT atau standalone fallback)
    var bktModule = root.FiezelMasteryBKT || null;
    var bktKey = resolveSideKey('fiezel-mastery-bkt-v1');
    var bktBefore = cfg.P_INIT;
    var bktAfter = cfg.P_INIT;
    var obsCount = 1;
    if (hasHostBkt && bktModule && typeof bktModule.mastery === 'function') {
      try {
        var rawHostBkt = localStorage.getItem(bktKey);
        var hostBktData = rawHostBkt ? JSON.parse(rawHostBkt) : null;
        var pre = bktModule.mastery(hostBktData, cid, now);
        if (pre && typeof pre.L === 'number') bktBefore = pre.L;
        if (pre && typeof pre.n === 'number') obsCount = pre.n + 1;
      } catch (_) {}
    }

    var resolvedCanonical = (!ok && p.misconceptionId)
      ? mapToCanonicalTaxonomyCode(p.canonicalCode || p.misconceptionId, p.userExactTranscript, p.targetLang)
      : null;

    // Rute ke Host Braincore Gateway bila berjalan di aplikasi web Fiezel
    if (typeof root.updateMastery === 'function') {
      try {
        root.updateMastery('speaking', cid, ok, p.latencyMs || 2500, p.confidence || null, now);
      } catch (_) {}
    }
    if (hasHostBkt) {
      try {
        root.bktRecord({ lessonSkill: cid, skill: cid, competencyId: cid }, ok, kappa, boost);
        if (bktModule && typeof bktModule.mastery === 'function') {
          var postRaw = localStorage.getItem(bktKey);
          var postData = postRaw ? JSON.parse(postRaw) : null;
          var post = bktModule.mastery(postData, cid, now);
          if (post && typeof post.L === 'number') bktAfter = post.L;
          if (post && typeof post.n === 'number') obsCount = post.n;
        } else {
          bktAfter = computeBktUpdate(bktBefore, ok, p.hintsUsed, p.confidence || 0.85);
        }
      } catch (_) {}
    }
    if (hasHostLedger) {
      try {
        var qPayload = { id: 'kaiwa:' + cid, lessonSkill: cid, skill: cid, conceptId: cid, target: cid, type: 'speaking' };
        var diagPayload = (!ok && p.misconceptionId)
          ? { misconception: String(p.misconceptionId), canonical: resolvedCanonical, timing: 'normal' }
          : null;
        root.misconceptionLedgerRecord({ startedAt: now }, qPayload, diagPayload, ok);
      } catch (_) {}
    }

    // 2. Fallback standalone untuk Node test harness saat host Braincore tidak dimuat.
    //    Jangan menimpa skema host `{ schema, lessons }` saat `root.bktRecord` aktif.
    if (!hasHostBkt) {
      try {
        var rawBkt = localStorage.getItem(bktKey);
        var bktData = rawBkt ? JSON.parse(rawBkt) : { skills: {} };
        if (!bktData || typeof bktData !== 'object') bktData = { skills: {} };
        if (!bktData.skills) bktData.skills = {};
        var curSkill = bktData.skills[cid] || { p: cfg.P_INIT, attempts: 0, correct: 0 };
        bktBefore = typeof curSkill.p === 'number' ? curSkill.p : cfg.P_INIT;
        bktAfter = computeBktUpdate(bktBefore, ok, p.hintsUsed, p.confidence || 0.85);
        obsCount = (curSkill.attempts || 0) + 1;
        bktData.skills[cid] = {
          p: bktAfter,
          attempts: obsCount,
          correct: (curSkill.correct || 0) + (ok ? 1 : 0),
          updatedAt: now
        };
        localStorage.setItem(bktKey, JSON.stringify(bktData));
      } catch (_) {}
    }

    // 3. Fallback Misconception Ledger saat host misconceptionLedgerRecord tidak tersedia
    if (!hasHostLedger && !ok && p.misconceptionId) {
      try {
        var ledgerKey = resolveSideKey('fiezel-misconception-ledger-v1');
        var rawLedger = localStorage.getItem(ledgerKey);
        var ledger = rawLedger ? JSON.parse(rawLedger) : { concepts: {} };
        if (!ledger || typeof ledger !== 'object') ledger = { concepts: {} };
        if (!ledger.concepts) ledger.concepts = {};
        var entry = ledger.concepts[cid] || { misconceptions: {} };
        var mKey = String(p.misconceptionId);
        var mObj = entry.misconceptions[mKey] || { count: 0, firstAt: now };
        mObj.count = (mObj.count || 0) + 1;
        mObj.lastAt = now;
        mObj.resolved = false;
        mObj.canonical = resolvedCanonical;
        mObj.lastUtterance = p.userExactTranscript;
        entry.misconceptions[mKey] = mObj;
        ledger.concepts[cid] = entry;
        localStorage.setItem(ledgerKey, JSON.stringify(ledger));
      } catch (_) {}
    }

    var thetaAfter = Number((1.0 + 4.0 * bktAfter).toFixed(2));
    var masteryState = (bktAfter >= cfg.MASTERY_T && obsCount >= cfg.MIN_CORRECT_FOR_MASTERY)
      ? 'MASTERED'
      : (bktAfter >= cfg.DEVELOPING_T ? 'DEVELOPING' : 'PRACTICING');

    return {
      competencyId: cid,
      bktBefore: bktBefore,
      bktAfter: bktAfter,
      thetaAfter: thetaAfter,
      masteryStateAfter: masteryState,
      canonicalCode: resolvedCanonical
    };
  }

  return {
    BRAINCORE_PARAMS: BRAINCORE_PARAMS,
    CANONICAL_TAXONOMY_CODES: CANONICAL_TAXONOMY_CODES,
    resolveCanonicalBktParams: resolveCanonicalBktParams,
    mapToCanonicalTaxonomyCode: mapToCanonicalTaxonomyCode,
    normalizeNeuralDiagnosis: normalizeNeuralDiagnosis,
    analyzeUtterancePedagogy: analyzeUtterancePedagogy,
    calculateIRTProbability: calculateIRTProbability,
    computeBktUpdate: computeBktUpdate,
    recordPedagogicalAttempt: recordPedagogicalAttempt
  };
}));
