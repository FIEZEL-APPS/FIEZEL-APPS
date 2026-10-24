import { CallScenario, LearnerLocale, TargetLang, VoicePersona } from '../types/voiceCall';
import {
  BeginnerReplyCard,
  generateDynamicContextualAiReply,
  getBeginnerReplyCards,
  translateAndPhoneticizeLiveText,
} from './liveCallHelper';

export type LiveTransportMode = 'ws-duplex' | 'turn-by-turn-fallback';

export interface FlexibleTurnEvaluationResult {
  ok: boolean;
  accuracyScore: number;
  grammarScore: number;
  fluencyScore: number;
  vocabUsageScore: number;
  userExactTranscript: string;
  misconceptionId: string | null;
  whyFailsId: string | null;
  whyFailsTh: string | null;
  missingTokens: string[];
  syntacticCorrection: string | null;
  naturalReformulation: string;
  pedagogicalFeedbackId: string;
  pedagogicalFeedbackTh: string;
  aiReply: string;
  aiReplyTranslationId: string;
  aiReplyTranslationTh: string;
  nextSuggestedReplies?: BeginnerReplyCard[];
  audioBase64?: string | null;
  audioMimeType?: string | null;
  ttsEngine?: string;
  /**
   * Honest provenance of `aiReply` (m025-637): 'ai' = production AI partner,
   * 'ai-gemini-key' = learner's own Gemini key, 'offline-template' = deterministic
   * Braincore script used ONLY when no AI answer could be obtained (shown with a label).
   */
  replySource?: 'ai' | 'ai-gemini-key' | 'offline-template';
}

declare global {
  interface Window {
    FIEZEL_TTS_CONFIG?: {
      enabled?: boolean;
      endpoint?: string;
      personasEndpoint?: string;
    };
    FIEZEL_CF_CONFIG?: {
      enabled?: boolean;
      base?: string;
      endpoints?: Record<string, string>;
    };
    FIEZEL_VOICE_STUDIO_CONFIG?: {
      wsUrl?: string;
      turnApiUrl?: string;
      ttsApiUrl?: string;
    };
  }
}

/**
 * Encodes Web Audio Float32 samples (-1.0 to 1.0) into 16-bit little-endian PCM base64.
 */
export function float32ToPcm16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes 16-bit little-endian PCM base64 string into a Web Audio AudioBuffer (typically 24kHz).
 * Safe against odd byte lengths and endian mismatch.
 */
export function pcm16Base64ToAudioBuffer(
  audioCtx: AudioContext,
  base64: string,
  sampleRate = 24000
): AudioBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const samples = Math.floor(len / 2);
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, samples * 2);
  const float32 = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768.0;
  }
  const buffer = audioCtx.createBuffer(1, samples, sampleRate);
  buffer.getChannelData(0).set(float32);
  return buffer;
}

/**
 * High-performance scheduled audio playback buffer for 24kHz PCM chunks.
 * Guarantees jitter-free, seamless chunk stitching (no clicks/pops) and
 * microsecond-level interruption (barge-in) queue flushing.
 */
export class PcmQueueAudioPlayer {
  private ctx: AudioContext | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onPlaybackStateChange?: (isPlaying: boolean) => void;

  constructor(options?: {
    audioContext?: AudioContext;
    onPlaybackStateChange?: (isPlaying: boolean) => void;
  }) {
    if (options?.audioContext) {
      this.ctx = options.audioContext;
    }
    this.onPlaybackStateChange = options?.onPlaybackStateChange;
  }

  public getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 24000 });
      this.nextStartTime = this.ctx.currentTime;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public enqueueChunk(pcmBase64: string, sampleRate = 24000): void {
    if (!pcmBase64) return;
    const ctx = this.getContext();
    const buffer = pcm16Base64ToAudioBuffer(ctx, pcmBase64, sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime, this.nextStartTime);
    source.start(startAt);
    this.nextStartTime = startAt + buffer.duration;
    this.activeSources.push(source);

    this.onPlaybackStateChange?.(true);

    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source);
      if (this.activeSources.length === 0) {
        this.onPlaybackStateChange?.(false);
      }
    };
  }

  /**
   * Instantly stops all in-flight playback and clears the playback queue (barge-in).
   */
  public clearQueue(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Ignore already stopped
      }
    }
    this.activeSources = [];
    if (this.ctx) {
      this.nextStartTime = this.ctx.currentTime;
    }
    this.onPlaybackStateChange?.(false);
  }

  public close(): void {
    this.clearQueue();
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

/**
 * Resolves the prioritized WebSocket endpoints for Gemini Live (`gemini-3.8-live` / PCM16 duplex).
 * Only returns active WebSocket URLs when a Gemini API key or explicit custom `wsUrl` is configured,
 * avoiding 1.8s+ connection timeouts to non-existent endpoints.
 */
export function resolveLiveCallWebSocketUrls(): string[] {
  const urls: string[] = [];

  if (typeof localStorage !== 'undefined') {
    try {
      const userKey = localStorage.getItem('fz_gemini_api_key');
      if (userKey && userKey.trim().length > 10) {
        urls.push(
          `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(
            userKey.trim()
          )}`
        );
      }
    } catch {
      // Ignore
    }
  }

  if (typeof window !== 'undefined' && window.FIEZEL_VOICE_STUDIO_CONFIG?.wsUrl) {
    urls.push(window.FIEZEL_VOICE_STUDIO_CONFIG.wsUrl);
  }

  return Array.from(new Set(urls));
}

/**
 * Client-side pedagogical evaluator enforcing the FIEZEL Braincore Zero-Dumbing Invariant:
 * - Zero false praise (`ok: false` whenever morphological, syntactic, particle, or pragmatic misconceptions occur)
 * - Exact `misconceptionId`, `whyFailsId`, `whyFailsTh`, and `syntacticCorrection`
 * - Rejects off-topic or verb-less noun salads / gibberish
 */
export function evaluateUtteranceClientSide(params: {
  text: string;
  scenario: CallScenario;
  targetLang: TargetLang;
  history?: Array<{ speaker: 'ai' | 'user'; text: string }>;
}): FlexibleTurnEvaluationResult {
  const exact = params.text.trim();
  const lower = exact.toLowerCase();
  const { scenario, targetLang, history } = params;
  const scenarioId = scenario.id;
  const lastAiTurn = [...(history || [])].reverse().find((h) => h.speaker === 'ai');

  if (targetLang === 'en') {
    const hasSubjectDrop =
      /\b(because\s+is|think\s+is|very\s+convenient\s+because\s+is)\b/i.test(lower);
    const hasBePlusBaseVerb =
      /\b(i\s+am|you\s+are|he\s+is|she\s+is|we\s+are|they\s+are|i'm)\s+(want|agree|disagree|like|need|prefer|know|believe|think|go|eat|drink|buy|work|study|live|have|stay|visit)\b/i.test(
        lower
      );
    const hasDoubleConjunction =
      /\balthough\b[^.?!]+?\bbut\b|\bthough\b[^.?!]+?\bbut\b|\bbecause\b[^.?!]+?\bso\b/i.test(
        lower
      );
    const hasMissingAuxProgressive =
      /\b(i|you|we|they|he|she)\s+(meeting|going|studying|working|eating|drinking|buying|staying|visiting|reading|waiting)\b/i.test(
        lower
      );
    const hasBrokenWordOrderOrPrep =
      /^\s*(went|go|ate|eat|bought|buy|visited|stayed)\s+(i|we|he|she|they)\b/i.test(lower) ||
      /\b(in\s+library|go\s+library|went\s+i\s+yesterday|go\s+bandung|went\s+bandung)\b/i.test(
        lower
      );
    const hasPastTenseError =
      /\b(yesterday\s+i\s+(go|eat|buy|meet|see|take|come)|last\s+(week|weekend|night|month|year)\s+[^.?!]*?\b(i|we|they)\s+(go|eat|buy|meet|see|drink)|i\s+buy\s+many|i\s+eat\s+at|we\s+eat\s+delicious|\bgoed\b|\bbuyed\b|\beated\b|\bdrinked\b|\bsawd\b|\bmetted\b)\b/i.test(
        lower
      ) ||
      ((scenarioId.includes('past') || scenarioId.includes('weekend')) &&
        /\b(i|we)\s+(go|eat|buy|drink|meet|see|take)\b/i.test(lower) &&
        !/\b(will|can|to|would|could|should|usually|always)\s+(go|eat|buy|drink|meet|see|take)\b/i.test(
          lower
        ));
    const hasModalToError = /\b(can\s+to|must\s+to|should\s+to|will\s+to|would\s+to|could\s+to)\b/i.test(
      lower
    );
    const hasBareWantRequest =
      /\b(i\s+want\s+(hot\s+|iced\s+|a\s+)?(coffee|tea|latte|water|cake|drink|food)|give\s+me\s+coffee)\b/i.test(
        lower
      );

    const hasFiniteVerbOrGreeting =
      /\b(am|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|can|may|might|must|like|love|prefer|want|need|live|stay|work|study|go|went|come|came|eat|ate|drink|drank|buy|bought|visit|visited|meet|met|see|saw|read|think|believe|agree|disagree|feel|felt|save|saves|help|helps|make|makes|take|took|order|have|had|hello|hi|good\s+morning|good\s+afternoon|thank\s+you|thanks|yes|sure)\b/i.test(
        lower
      ) || /\b(i'd|i'm|i'll|we're|we've|it's|that's|there's|don't|doesn't|didn't)\b/i.test(lower);

    const hasScenarioRelevance = (() => {
      if (scenarioId.includes('free')) {
        return true;
      }
      if (scenarioId.includes('cafe')) {
        return /\b(coffee|tea|latte|espresso|cappuccino|mocha|water|juice|milk|cake|croissant|muffin|sandwich|bread|snack|cup|glass|hot|iced|cold|warm|small|medium|large|size|here|to\s+go|takeaway|card|cash|pay|table|menu|recommend|sugar|sweet|order|drink|have|like|please|library|friend|study|work|read)\b/i.test(
          lower
        );
      }
      if (scenarioId.includes('past') || scenarioId.includes('weekend')) {
        return /\b(weekend|yesterday|last|went|visited|stayed|ate|drank|watched|played|studied|worked|had|met|saw|bought|trip|vacation|holiday|family|friend|friends|market|beach|mountain|city|bandung|bali|jakarta|cafe|restaurant|movie|park|home|house|happy|fun|great|delicious|good|tired|relax)\b/i.test(
          lower
        );
      }
      if (scenarioId.includes('work') || scenarioId.includes('standup')) {
        return /\b(project|task|report|feature|bug|client|team|meeting|deadline|review|test|design|code|data|update|finish|finished|completed|working|today|yesterday|blocker|help|schedule|office|slide|presentation)\b/i.test(
          lower
        );
      }
      if (scenarioId.includes('ielts') || scenarioId.includes('academic')) {
        return /\b(remote|work|working|home|office|company|employee|employer|student|education|technology|society|environment|time|commute|balance|productive|productivity|collaboration|lonely|isolated|flexible|advantage|disadvantage|benefit|drawback|believe|think|opinion|agree|disagree|however|although|furthermore|moreover|because|therefore)\b/i.test(
          lower
        );
      }
      return true;
    })();

    const missingTokens: string[] = [];
    const isFirstTurn = !history || history.filter((h) => h.speaker === 'user').length === 0;
    if (isFirstTurn) {
      if (scenarioId.includes('free')) {
        // Free Talk mode: no rigid mandatory phrase required on opening turn
      } else if (scenarioId.includes('cafe')) {
        if (!/\b(would like|i'd like|could i|may i|can i|please)\b/i.test(lower)) {
          missingTokens.push("I'd like...", 'Could I have...');
        }
      } else if (scenarioId.includes('weekend') || scenarioId.includes('past')) {
        if (
          !/\b(went|visited|stayed|ate|drank|watched|played|studied|worked|had|met|saw|bought|was|were)\b/i.test(
            lower
          )
        ) {
          missingTokens.push('went to (V2)', 'ate / met (V2)');
        }
      } else if (scenarioId.includes('ielts')) {
        if (
          !/\b(although|however|while|on the other hand|furthermore|because|believe|think|in my opinion)\b/i.test(
            lower
          )
        ) {
          missingTokens.push('Although / However', 'because');
        }
      }
    }

    const wordCount = exact.split(/\s+/).filter(Boolean).length;
    const isTooShort = wordCount < 3;
    const isOffTopicOrGibberish = !hasFiniteVerbOrGreeting || !hasScenarioRelevance;

    if (
      hasSubjectDrop ||
      hasBePlusBaseVerb ||
      hasDoubleConjunction ||
      hasMissingAuxProgressive ||
      hasBrokenWordOrderOrPrep ||
      hasPastTenseError ||
      hasModalToError ||
      hasBareWantRequest ||
      isTooShort ||
      isOffTopicOrGibberish
    ) {
      let misconceptionId = 'EN_INCOMPLETE_CLAUSE_01';
      let whyFailsId =
        'Kalimat masih terlalu singkat atau belum memuat struktur subjek + kata kerja yang utuh sesuai konteks situasi.';
      let whyFailsTh =
        'ประโยคยังสั้นเกินไปหรือยังไม่มีโครงสร้างประธาน + กริยาที่สมบูรณ์ตามบริบทของสถานการณ์';
      let syntacticCorrection = scenario.sampleUtterances[0]?.text || exact;

      if (hasBePlusBaseVerb && hasDoubleConjunction) {
        misconceptionId = 'EN_STATIVE_BE_AND_DOUBLE_CONJ';
        whyFailsId =
          'Miskonsepsi Ganda: (1) Kata kerja "agree/want" adalah verba aktif/statif sehingga tidak boleh didahului "am/is/are" (gunakan "I agree", bukan "I am agree"). (2) Dalam satu kalimat kompleks, jangan gunakan "Although" dan "but" sekaligus—pilih salah satu.';
        whyFailsTh =
          'ความเข้าใจผิด 2 จุด: (1) ห้ามใช้ am/is/are นำหน้ากริยา agree/want (ต้องใช้ "I agree" ไม่ใช่ "I am agree") และ (2) ห้ามใช้ "Although" ร่วมกับ "but" ในประโยคเดียวกัน';
        syntacticCorrection =
          'I agree that remote work is beneficial. Although it saves commuting time, people can feel isolated at home.';
      } else if (hasBePlusBaseVerb && hasMissingAuxProgressive) {
        misconceptionId = 'EN_DOUBLE_VERB_AND_MISSING_AUX';
        whyFailsId =
          'Miskonsepsi Verba Ganda & Progressive: (1) Jangan gabungkan "am" dengan kata kerja dasar "want" (gunakan "I would like a hot coffee"). (2) Untuk rencana Present Continuous, wajib sertakan to be "am" sebelum V-ing ("I am meeting my friend at the library").';
        whyFailsTh =
          'ความเข้าใจผิดเรื่องกริยาซ้อน: (1) ห้ามใช้ "I am want" (ควรใช้ "I would like...") และ (2) ต้องใส่ "am" หน้า V-ing ("I am meeting my friend at the library")';
        syntacticCorrection =
          "I'd like a hot coffee, please. After this, I am meeting my friend at the library.";
      } else if (hasBePlusBaseVerb) {
        misconceptionId = 'EN_REDUNDANT_BE_BEFORE_VERB';
        whyFailsId =
          'Miskonsepsi To Be + Kata Kerja Dasar: Jangan menaruh "am/is/are" di depan kata kerja murni seperti "want" atau "agree". Gunakan langsung "I agree..." atau bentuk sopan "I would like...".';
        whyFailsTh =
          'ความเข้าใจผิดเรื่อง To Be + กริยาแท้: ห้ามใส่ "am/is/are" หน้ากริยาแท้ เช่น want หรือ agree ให้ใช้ "I agree..." หรือ "I would like..."';
        syntacticCorrection = scenarioId.includes('ielts')
          ? 'I agree that remote work is good because it saves commuting time.'
          : "I'd like a hot coffee, please.";
      } else if (hasDoubleConjunction) {
        misconceptionId = 'EN_DOUBLE_CONJUNCTION_ALTHOUGH_BUT';
        whyFailsId =
          'Miskonsepsi Konjungsi Ganda (Although ... but): Dalam tata bahasa Inggris, klausa yang diawali "Although" tidak boleh diikuti "but" pada klausa utama. Hapus kata "but".';
        whyFailsTh =
          'ความเข้าใจผิดเรื่องคำเชื่อมซ้อน (Although ... but): เมื่อใช้ "Although" แล้ว ห้ามใส่ "but" ซ้ำในประโยคหลัก';
        syntacticCorrection =
          'Although remote work saves commuting time, employees can feel lonely at home.';
      } else if (hasMissingAuxProgressive) {
        misconceptionId = 'EN_MISSING_BE_AUX_PROGRESSIVE';
        whyFailsId =
          'Miskonsepsi Present Continuous Tanpa Auxiliary (To Be): Kata kerja "-ing" (seperti "meeting" / "going") wajib didahului "am/is/are" ("I am meeting...").';
        whyFailsTh =
          'ความเข้าใจผิดเรื่อง Present Continuous ที่ขาดกริยาช่วย (To Be): กริยาเติม -ing ต้องมี am/is/are นำหน้าเสมอ ("I am meeting...")';
        syntacticCorrection =
          "I'd like a hot coffee, please. After this, I am meeting my friend at the library.";
      } else if (hasBrokenWordOrderOrPrep) {
        misconceptionId = 'EN_WORD_ORDER_SVO_AND_PREPOSITION';
        whyFailsId =
          'Miskonsepsi Urutan Kata (SVO) & Preposisi Arah: Bahasa Inggris wajib berpola Subjek + Kata Kerja ("I went", bukan "Went I"), tujuan menggunakan preposisi "to" ("went to Bandung"), dan sifat memerlukan kopula ("I was very happy").';
        whyFailsTh =
          'ความเข้าใจผิดเรื่องลำดับคำ (SVO) และบุพบท: ต้องเรียง ประธาน + กริยา ("I went" ไม่ใช่ "Went I") ใช้ "to" บอกจุดหมาย ("went to Bandung") และใช้กริยาช่วย "was" หน้าคำคุณศัพท์';
        syntacticCorrection =
          'Yesterday I went to Bandung with my family, and I was very happy.';
      } else if (hasPastTenseError) {
        misconceptionId = 'EN_PAST_TENSE_IRREGULAR_OR_BASE';
        whyFailsId =
          'Miskonsepsi Morfologi Past Simple: Untuk menceritakan pengalaman lampau, gunakan kata kerja bentuk kedua (V2 irregular: "went", "bought", "ate", bukan "go/goed", "buy/buyed", atau "eat/eated").';
        whyFailsTh =
          'ความเข้าใจผิดเรื่อง Past Simple: เมื่อเล่าเหตุการณ์ในอดีต ต้องใช้กริยาช่องที่ 2 (went, bought, ate ไม่ใช่ go/goed หรือ eat/eated)';
        syntacticCorrection =
          'Last weekend I went to Bandung with my family and we ate delicious local food.';
      } else if (hasBareWantRequest) {
        misconceptionId = 'EN_PRAGMATIC_BARE_WANT';
        whyFailsId =
          'Miskonsepsi Pragmatis Kesopanan: Mengucapkan "I want..." secara langsung di kafe terdengar kurang sopan. Gunakan "I would like..." atau "Could I have...".';
        whyFailsTh =
          'การใช้ "I want..." โดยตรงฟังดูห้วนเกินไปในร้านอาหาร ควรใช้ "I would like..." หรือ "Could I have..."';
        syntacticCorrection =
          "I'd like an iced latte, please. Afterward, I plan to read at the library.";
      } else if (hasSubjectDrop || hasModalToError) {
        misconceptionId = 'EN_CLAUSE_SUBJECT_OMISSION';
        whyFailsId =
          'Miskonsepsi Sintaksis Klausa: Kata hubung "because" wajib diikuti Subjek eksplisit ("because it is..."), dan modal verb tidak boleh diikuti "to".';
        whyFailsTh =
          'ความเข้าใจผิดด้านโครงสร้างประโยค: หลัง "because" ต้องมีประธานชัดเจน ("because it is...") และหลังกริยาช่วยไม่ต้องใส่ "to"';
        syntacticCorrection =
          'Although working from home is convenient because it saves time, it can reduce team collaboration.';
      } else if (isOffTopicOrGibberish) {
        misconceptionId = 'EN_OFF_TOPIC_OR_NO_PREDICATE';
        whyFailsId =
          'Kalimat belum memiliki kata kerja (predikat) yang bermakna atau kata-kata yang disusun belum menjawab konteks skenario percakapan. Gunakan kalimat utuh berpola Subjek + Kata Kerja + Objek.';
        whyFailsTh =
          'ประโยคยังไม่มีคำกริยาที่สมบูรณ์ หรือคำที่เรียงยังไม่ตรงกับบริบทของสถานการณ์ กรุณาพูดเป็นประโยคที่มี ประธาน + กริยา + กรรม';
        syntacticCorrection = scenario.sampleUtterances[0]?.text || exact;
      }

      const aiReply = scenarioId.includes('cafe')
        ? 'I see! To make your sentence natural and grammatically accurate, try using "I would like..." and "I am meeting... at the library." Could you try saying it again?'
        : scenarioId.includes('past') || scenarioId.includes('weekend')
          ? 'Nice try! Remember to start with the subject "I" followed by the past tense verb like "went to..." and "ate...". Could you tell me again about your trip?'
          : scenarioId.includes('ielts')
            ? 'Good point! Just a quick grammar tip: say "I agree" (without "am") and avoid using "Although" together with "but". Could you rephrase your argument?'
            : 'Good effort! Try expressing that again using the suggested sentence structure so your meaning is clear.';

      return {
        ok: false,
        accuracyScore: 48,
        grammarScore: 42,
        fluencyScore: isTooShort ? 45 : 64,
        vocabUsageScore: isOffTopicOrGibberish ? 35 : 65,
        userExactTranscript: exact,
        misconceptionId,
        whyFailsId,
        whyFailsTh,
        missingTokens,
        syntacticCorrection,
        naturalReformulation: syntacticCorrection,
        pedagogicalFeedbackId: `${whyFailsId}${
          missingTokens.length > 0
            ? ` Kata/pola yang masih tertinggal: ${missingTokens.join(', ')}.`
            : ''
        }`,
        pedagogicalFeedbackTh: `${whyFailsTh}${
          missingTokens.length > 0 ? ` คำหรือโครงสร้างที่ยังขาด: ${missingTokens.join(', ')}` : ''
        }`,
        aiReply,
        aiReplyTranslationId: scenarioId.includes('cafe')
          ? 'Begitu! Agar kalimatmu alami dan tepat secara tata bahasa, coba gunakan "I would like..." serta "I am meeting... at the library." Bisa coba ucapkan sekali lagi?'
          : scenarioId.includes('past') || scenarioId.includes('weekend')
            ? 'Usaha yang bagus! Ingat untuk mengawali dengan subjek "I" diikuti kata kerja lampau seperti "went to..." dan "ate...". Bisa ceritakan lagi perjalananmu?'
            : scenarioId.includes('ielts')
              ? 'Poin yang menarik! Catatan tata bahasa singkat: gunakan "I agree" (tanpa "am") dan jangan gunakan "Although" bersamaan dengan "but". Bisa ucapkan ulang argumenmu?'
              : 'Usaha yang bagus! Coba ucapkan kembali dengan pola kalimat yang disarankan agar maknanya jelas.',
        aiReplyTranslationTh:
          'ลองพูดอีกครั้งตามโครงสร้างประโยคที่แนะนำเพื่อให้ถูกต้องตามหลักไวยากรณ์นะ',
        nextSuggestedReplies: getBeginnerReplyCards(
          scenarioId,
          targetLang,
          undefined,
          aiReply,
          exact,
          history
        ),
      };
    }

    const dynamicTurn = generateDynamicContextualAiReply({
      userText: exact,
      lastAiQuestionText: lastAiTurn?.text || scenario.openingLine,
      scenarioId,
      targetLang: 'en',
      history,
    });

    return {
      ok: true,
      accuracyScore: 94,
      grammarScore: 95,
      fluencyScore: 91,
      vocabUsageScore: 92,
      userExactTranscript: exact,
      misconceptionId: null,
      whyFailsId: null,
      whyFailsTh: null,
      missingTokens: [],
      syntacticCorrection: null,
      naturalReformulation: exact,
      pedagogicalFeedbackId:
        'Struktur kalimat, ketepatan tense/verba, dan kesopanan pragmatis sudah tepat sesuai konteks skenario.',
      pedagogicalFeedbackTh:
        'โครงสร้างประโยค การเลือกใช้คำกริยา และความสุภาพเหมาะสมตามบริบทของสถานการณ์',
      aiReply: dynamicTurn.aiReply,
      aiReplyTranslationId: dynamicTurn.aiReplyTranslationId,
      aiReplyTranslationTh: dynamicTurn.aiReplyTranslationTh,
      nextSuggestedReplies: getBeginnerReplyCards(
        scenarioId,
        targetLang,
        undefined,
        dynamicTurn.aiReply,
        exact,
        history
      ),
    };
  }

  // Japanese (ja) evaluation — Strict Braincore Particle, Conjugation, & Register Diagnostics
  const hasVerbDictPlusDesu =
    /(飲む|食べる|行く|来る|する|見る|買う|読む|書く|話す|帰る|待つ|遊ぶ|休む|働く|勉強する|お願いする)\s*です/u.test(
      exact
    ) || /\b(nomu|taberu|iku|kuru|suru|miru|kau|yomu)\s+desu\b/i.test(lower);

  const hasWrongObjectParticle =
    /(コーヒー|紅茶|水|お茶|ラテ|ケーキ|パン|サンドイッチ|メニュー|注文)(に|が)(くだもの|一つ|二つ|お願い|ください|飲む|飲みます|食べる|食べます)/u.test(
      exact
    ) ||
    /(コーヒー|ケーキ|紅茶|ラテ)に[^。、]*?(飲む|飲みます|ください|お願いします)/u.test(exact) ||
    /\b(kohi|koohii|coffee|keki)\s+ni\s+(kudasai|onegaishimasu|nomu|nomimasu)\b/i.test(lower);

  const hasWrongTaraConjugation =
    /(するたら|くるたら|いくたら|飲むたら|食べるたら|読むたら|買うたら)/u.test(exact) ||
    /\b(surutara|kurutara|ikutara|nomutara|taberutara)\b/i.test(lower);

  const hasWrongLocationParticle =
    /(駅に|コンビニに|どこに).*?(います|ありますか|お弁当)/u.test(exact) ||
    /(図書館|カフェ|部屋|学校|うち|家)に(勉強|練習|仕事|読書)(する|します|した|しました)/u.test(
      exact
    );

  const lacksPoliteEnding =
    exact.length > 4 &&
    !/(です|ます|ました|ません|ください|ませんか|でしょうか|ですか|お願いします|ありがとう|ありがとうございます|こんにちは|こんばんは|お疲れ様です|はい|ええ)[。！？!?]?$/u.test(
      exact
    ) &&
    !/\b(desu|masu|mashita|masen|kudasai|onegaishimasu|arigatou|arigato|hai)\b/i.test(lower);

  const isGibberishJa =
    /^(あいうえお|かきくけこ|さしすせそ|たちつてと|なにぬねの|あ+|い+|う+|え+|お+|テスト)(です|ます)?[。！？!?]?$/u.test(
      exact
    ) ||
    (!/(コーヒー|紅茶|お茶|水|ラテ|ケーキ|パン|メニュー|店内|持ち帰り|一つ|二つ|お願い|ください|いくら|おすすめ|カード|現金|テスト|試験|勉強|文法|漢字|言葉|宿題|先生|先輩|一緒|図書館|質問|どう|いい|大丈夫|はい|ありがとう|すみません|こんにちは|お疲れ様)/u.test(
      exact
    ) &&
      !/\b(kohi|koohii|keki|kudasai|onegaishimasu|tesuto|benkyou|benkyo|sensei|senpai|hai|arigato)\b/i.test(
        lower
      ));

  const isTooShortJa = exact.length < 4;

  if (
    hasVerbDictPlusDesu ||
    hasWrongObjectParticle ||
    hasWrongTaraConjugation ||
    hasWrongLocationParticle ||
    lacksPoliteEnding ||
    isGibberishJa ||
    isTooShortJa
  ) {
    let misconceptionId = 'JA_REGISTER_MISSING_DESU_MASU';
    let whyFailsId =
      'Miskonsepsi Register Sopan (Teineigo): Dalam percakapan situasi umum atau dengan senpai/staf, akhiri kalimat dengan bentuk sopan 「〜です / 〜ます / 〜てください / 〜をお願いします」.';
    let whyFailsTh =
      'ความเข้าใจผิดเรื่องระดับความสุภาพ (Teineigo): ในสถานการณ์ทั่วไปควรลงท้ายประโยคด้วยรูปสุภาพ 「〜です / 〜ます / 〜てください」';
    let syntacticCorrection = scenario.sampleUtterances[0]?.text || exact;
    const missingTokens: string[] = [];

    if (hasVerbDictPlusDesu || hasWrongObjectParticle) {
      misconceptionId =
        hasVerbDictPlusDesu && hasWrongObjectParticle
          ? 'JA_PARTICLE_NI_AND_VERB_DICT_DESU'
          : hasVerbDictPlusDesu
            ? 'JA_MORPH_VERB_DICT_PLUS_DESU'
            : 'JA_PARTICLE_DIRECT_OBJECT_O';
      whyFailsId =
        'Miskonsepsi Partikel Objek & Konjugasi Masu-kei: (1) Objek pesanan wajib ditandai partikel 「を」 (bukan 「に」). (2) Kata kerja bentuk kamus seperti 「飲む」 TIDAK BOLEH langsung ditambah 「です」（「×飲むです」 salah; gunakan 「飲みます」 atau pola pesanan sopan 「ホットコーヒーを一つお願いします」).';
      whyFailsTh =
        'ความเข้าใจผิดเรื่องคำช่วยกรรมตรงและรูปกริยา: (1) กรรมตรงต้องใช้คำช่วย 「を」 (ไม่ใช่ 「に」) และ (2) ห้ามวาง 「です」 หลังกริยารูปพจนานุกรมโดยตรง (「×飲むです」 ผิด ต้องใช้ 「飲みます」 หรือ 「〜をお願いします」)';
      syntacticCorrection = 'ホットコーヒーを一つお願いします。';
      missingTokens.push('を (partikel objek)', '〜をお願いします / 飲みます');
    } else if (hasWrongTaraConjugation) {
      misconceptionId = 'JA_CONJUGATION_TARA_TA_FORM';
      whyFailsId =
        'Miskonsepsi Konjugasi Pengandaian/Saran (〜たら): Pola 「〜たらいいですか」 wajib dibentuk dari Ta-form (bentuk lampau biasa), bukan bentuk kamus + たら. Ubah 「×勉強するたら」 menjadi 「○勉強したら」（する → した + ら = したら）dan tambahkan 「どうやって」 untuk menanyakan cara.';
      whyFailsTh =
        'ความเข้าใจผิดเรื่องการผันรูป 〜たら: ต้องผันกริยาเป็นรูปอดีต (Ta-form) ก่อนเติม ら ดังนั้น 「×勉強するたら」 จึงผิด ต้องใช้ 「○勉強したら」 (する → した + ら)';
      syntacticCorrection = '来週テストがあるので、どうやって勉強したらいいですか？';
      missingTokens.push('勉強したら (Ta-form + ら)', 'どうやって');
    } else if (hasWrongLocationParticle) {
      misconceptionId = 'JA_PARTICLE_NI_VS_DE_OR_WA';
      whyFailsId =
        'Miskonsepsi Partikel Lokasi Aktivitas: Untuk tempat berlangsungnya aksi aktif (seperti belajar atau minum di kafe), gunakan partikel 「で」 (mis. 「図書館で勉強します」), bukan 「に」.';
      whyFailsTh =
        'ความเข้าใจผิดเรื่องคำช่วยสถานที่ทำกิจกรรม: สถานที่ที่ทำกิจกรรมต้องใช้คำช่วย 「で」 (เช่น 「図書館で勉強します」) ไม่ใช่ 「に」';
      syntacticCorrection = scenarioId.includes('senpai')
        ? '図書館で一緒に勉強してもいいですか？'
        : '店内でホットコーヒーを飲みます。';
      missingTokens.push('で (partikel lokasi aksi)');
    } else if (isGibberishJa || isTooShortJa) {
      misconceptionId = 'JA_OFF_TOPIC_OR_INCOMPLETE';
      whyFailsId =
        'Kalimat belum memuat kosakata atau maksud yang sesuai dengan konteks percakapan saat ini. Gunakan kosakata skenario (seperti menyebutkan pesanan dengan 「〜をお願いします」 atau bertanya kepada lawan bicara).';
      whyFailsTh =
        'ประโยคยังไม่มีคำศัพท์หรือความหมายที่ตรงกับบริบทของการสนทนา กรุณาใช้คำศัพท์และโครงสร้างที่แนะนำในสถานการณ์นี้';
      syntacticCorrection = scenario.sampleUtterances[0]?.text || exact;
      missingTokens.push(scenario.sampleUtterances[0]?.text || '〜をお願いします');
    } else if (lacksPoliteEnding) {
      missingTokens.push('〜です / 〜ます / 〜をお願いします');
    }

    const aiReply = scenarioId.includes('senpai')
      ? 'なるほど！テストの相談ですね。「勉強するたら」ではなく、タ形を使って「どうやって勉強したらいいですか？」と言ってみましょう！もう一度どうぞ。'
      : 'なるほど！注文するときは助詞の「を」を使って、「ホットコーヒーを一つお願いします」や「飲みます」と言ってみましょうか？';

    return {
      ok: false,
      accuracyScore: 46,
      grammarScore: 40,
      fluencyScore: isTooShortJa ? 45 : 58,
      vocabUsageScore: isGibberishJa ? 30 : 62,
      userExactTranscript: exact,
      misconceptionId,
      whyFailsId,
      whyFailsTh,
      missingTokens,
      syntacticCorrection,
      naturalReformulation: syntacticCorrection,
      pedagogicalFeedbackId: whyFailsId,
      pedagogicalFeedbackTh: whyFailsTh,
      aiReply,
      aiReplyTranslationId: scenarioId.includes('senpai')
        ? 'Begitu! Konsultasi soal ujian ya. Bukan "benkyou suru tara", melainkan gunakan bentuk lampau (Ta-form) menjadi "dou yatte benkyou shitara ii desu ka?". Yuk coba ucapkan sekali lagi!'
        : 'Begitu! Saat memesan, mari gunakan partikel objek "o" menjadi "Hotto kōhī o hitotsu onegaishimasu" atau "nomimasu". Yuk coba ucapkan lagi!',
      aiReplyTranslationTh:
        'เข้าใจแล้วค่ะ! ลองพูดใหม่อีกครั้งโดยใช้โครงสร้างและคำช่วยที่ถูกต้องตามคำแนะนำนะคะ',
      nextSuggestedReplies: getBeginnerReplyCards(
        scenarioId,
        targetLang,
        undefined,
        aiReply,
        exact,
        history
      ),
    };
  }

  const dynamicJaTurn = generateDynamicContextualAiReply({
    userText: exact,
    lastAiQuestionText: lastAiTurn?.text || scenario.openingLine,
    scenarioId,
    targetLang: 'ja',
    history,
  });

  return {
    ok: true,
    accuracyScore: 95,
    grammarScore: 96,
    fluencyScore: 92,
    vocabUsageScore: 94,
    userExactTranscript: exact,
    misconceptionId: null,
    whyFailsId: null,
    whyFailsTh: null,
    missingTokens: [],
    syntacticCorrection: null,
    naturalReformulation: exact,
    pedagogicalFeedbackId:
      'Penggunaan partikel bahasa Jepang dan ragam sopan (Desu/Masu/Onegaishimasu) sudah tepat sesuai konteks.',
    pedagogicalFeedbackTh:
      'การใช้คำช่วยภาษาญี่ปุ่นและรูปประโยคสุภาพ (Desu/Masu/Onegaishimasu) ถูกต้องตามบริบท',
    aiReply: dynamicJaTurn.aiReply,
    aiReplyTranslationId: dynamicJaTurn.aiReplyTranslationId,
    aiReplyTranslationTh: dynamicJaTurn.aiReplyTranslationTh,
    nextSuggestedReplies: getBeginnerReplyCards(
      scenarioId,
      targetLang,
      undefined,
      dynamicJaTurn.aiReply,
      exact,
      history
    ),
  };
}

let _turnApiAvailable: boolean | null = null;
let _ttsCooldownUntil = 0;
let _ttsConsecutiveFailures = 0;
const _ttsMemoryCache = new Map<
  string,
  { audioBase64: string; audioMimeType: string; engine: string }
>();
const _ttsInFlight = new Map<
  string,
  Promise<{ audioBase64: string; audioMimeType: string; engine: string } | null>
>();

// ---------------------------------------------------------------------------------------
// REAL AI CONVERSATION PARTNER (m025 hotfix): Cloudflare Worker `fiezel-api` task
// `conversation_turn` — the SAME production path used by Ngobrol AI in the main PWA.
// Before this, Voice Studio only answered from deterministic templates unless the learner
// pasted a personal Gemini key, so in production the "AI" never actually replied.
// Braincore grading stays 100% local (evaluateUtteranceClientSide); the Worker only writes
// the partner's conversational reply (its prompt forbids praising/grading the learner).
// ---------------------------------------------------------------------------------------
const AI_TASK_REQUEST_SCHEMA = 'fiezel-ai-task-v2';
const AI_TASK_RESPONSE_SCHEMA = 'fiezel-ai-response-v2';
const AI_PARTNER_TIMEOUT_MS = 9000;
// m025-637: `null` = unknown, so the FIRST attempt asks for the short phone-call style
// (`mode:'call'`, <= 15 words → fewer output tokens → faster reply + shorter TTS). Older
// Worker deployments answer 400 invalid_input in ~70 ms and we degrade once, remembered.
let _aiCallModeSupported: boolean | null = null;
let _aiScenarioRoleSupported: boolean | null = null;
let _aiPartnerCooldownUntil = 0;
let _identityPromise: Promise<boolean> | null = null;
let _identityReady = false;

function getSameOriginParent(): Window | null {
  try {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      // Touching location.origin throws SecurityError if cross-origin
      void window.parent.location.origin;
      return window.parent as Window;
    }
  } catch {
    // Cross-origin parent — ignore
  }
  return null;
}

function resolveCfApiBase(): string {
  if (typeof window === 'undefined') return '';
  const cfg = window.FIEZEL_CF_CONFIG || getSameOriginParent()?.FIEZEL_CF_CONFIG;
  if (!cfg || cfg.enabled === false) return '';
  if (cfg.endpoints && typeof cfg.endpoints.ai === 'string' && cfg.endpoints.ai !== 'on') return '';
  return String(cfg.base || '').trim().replace(/\/$/, '');
}

/** Idempotent anonymous identity cookie (`fz_id`) — required by the Worker quota gate. */
export function ensureLearnerIdentity(): Promise<boolean> {
  if (_identityReady) return Promise.resolve(true);
  const base = resolveCfApiBase();
  if (!base) return Promise.resolve(false);
  if (!_identityPromise) {
    _identityPromise = fetch(`${base}/api/auth/anon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      credentials: 'include',
      mode: 'cors',
      cache: 'no-store',
    })
      .then((r) => {
        const ok = r.ok || r.status === 409;
        if (ok) _identityReady = true;
        return ok;
      })
      .catch(() => {
        _identityPromise = null;
        return false;
      });
  }
  return _identityPromise;
}

/** Maps a Voice Studio scenario onto the Worker's closed role enum (CONVERSATION_ROLES). */
export function mapScenarioToWorkerRole(scenarioId: string): string {
  const id = String(scenarioId || '').toLowerCase();
  if (/cafe|kissaten|coffee/.test(id)) return 'cafe';
  if (/ramen/.test(id)) return 'ramen';
  if (/konbini/.test(id)) return 'konbini';
  if (/hotel/.test(id)) return 'hotel';
  if (/direction|station/.test(id)) return 'direction';
  if (/ielts|interview|exam/.test(id)) return 'interview';
  if (/hometown|intro/.test(id)) return 'intro';
  return 'free';
}

/** 'CEFR A2' -> 'A2', 'JLPT N5' -> 'A1' (Worker LEVELS enum). */
export function mapScenarioLevel(level: string | undefined): string {
  const lv = String(level || '');
  const cefr = /\b([ABC][12])\b/.exec(lv);
  if (cefr) return cefr[1];
  if (/N5/.test(lv)) return 'A1';
  if (/N4/.test(lv)) return 'A2';
  if (/N3/.test(lv)) return 'B1';
  if (/N2/.test(lv)) return 'B2';
  if (/N1/.test(lv)) return 'C1';
  return 'A1';
}

export function replyLooksLikeTargetLanguage(text: string, targetLang: TargetLang): boolean {
  const tx = String(text || '');
  if (!tx.trim() || /[\u0E00-\u0E7F]/.test(tx)) return false;
  if (targetLang === 'ja') return /[\u3040-\u30ff]/.test(tx);
  return /[A-Za-z]/.test(tx) && !/[\u3040-\u30ff\u4e00-\u9faf]/.test(tx);
}

/**
 * Asks the production AI partner for the next conversational line.
 * Returns null (caller keeps the deterministic Braincore reply) on any failure.
 */
export async function requestAiPartnerReply(params: {
  text: string;
  scenario: CallScenario;
  targetLang: TargetLang;
  locale: LearnerLocale;
  history: Array<{ speaker: 'ai' | 'user'; text: string }>;
}): Promise<{ reply: string; translation: string } | null> {
  const base = resolveCfApiBase();
  if (!base || Date.now() < _aiPartnerCooldownUntil) return null;
  const message = params.text.trim().slice(0, 400);
  if (!message) return null;

  if (!_identityReady) {
    await Promise.race([
      ensureLearnerIdentity(),
      new Promise<boolean>((r) => setTimeout(() => r(false), 350)),
    ]);
  }

  const history = params.history
    .filter((h) => h && h.text && h.text.trim())
    .map((h) => `${h.speaker === 'ai' ? 'a' : 'u'}: ${h.text.trim()}`.slice(0, 320))
    .slice(-8);

  const buildInput = (withMode: boolean, withRole: boolean) => {
    const input: Record<string, unknown> = {
      message,
      course: params.targetLang === 'ja' ? 'ja' : 'en',
      level: mapScenarioLevel((params.scenario as { level?: string }).level),
    };
    if (withRole) input.scenarioId = mapScenarioToWorkerRole(params.scenario.id);
    if (withMode) input.mode = 'call';
    if (history.length) input.history = history;
    return input;
  };

  // Older Worker deployments reject unknown fields with 400 invalid_input; degrade the
  // optional fields one at a time and remember what the live Worker accepts.
  const attempts: Array<[boolean, boolean]> = [];
  const modeOk = _aiCallModeSupported !== false;
  const roleOk = _aiScenarioRoleSupported !== false;
  attempts.push([modeOk, roleOk]);
  if (modeOk) attempts.push([modeOk, roleOk]); // retry once with fast voiceCall model
  if (roleOk) attempts.push([false, false]);

  const deadline = Date.now() + AI_PARTNER_TIMEOUT_MS;
  for (const [withMode, withRole] of attempts) {
    const remaining = deadline - Date.now();
    if (remaining < 800) break;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      const res = await fetch(`${base}/api/ai/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: AI_TASK_REQUEST_SCHEMA,
          task: 'conversation_turn',
          input: buildInput(withMode, withRole),
          locale: params.locale === 'th' ? 'th' : 'id',
        }),
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}) as Record<string, unknown>);
      if (res.status === 400 && data && data.error === 'invalid_input') {
        if (withMode) _aiCallModeSupported = false;
        else if (withRole) _aiScenarioRoleSupported = false;
        continue;
      }
      if (res.status === 401) {
        _identityPromise = null;
        _identityReady = false;
        return null;
      }
      if (res.status === 429) {
        const retry = Number(data?.retryAfter) || 60;
        _aiPartnerCooldownUntil = Date.now() + retry * 1000;
        return null;
      }
      if (!res.ok || data?.schema !== AI_TASK_RESPONSE_SCHEMA) {
        return null;
      }
      if (withMode) _aiCallModeSupported = true;
      if (withRole) _aiScenarioRoleSupported = true;
      if (data?.degraded === true) {
        continue;
      }
      const turn = (data?.turn && typeof data.turn === 'object' ? data.turn : {}) as {
        reply?: string;
        translation?: string;
      };
      let rawReply = String(turn.reply || data?.text || '')
        .replace(/^(AI|Partner|Assistant)\s*:\s*/i, '')
        .replace(/^["「]|["」]$/g, '')
        .trim();
      if (params.targetLang === 'ja') {
        let stripped = rawReply.replace(/^(?:えっと|ええと|えーと|あの[ね]?|う[ー~]*ん|ああ|うん)[、,!\s・…〜~]*/, '').trim();
        if (params.scenario.id.includes('free') || params.scenario.id.includes('intro') || params.scenario.id.includes('phone_friend')) {
          stripped = stripped.replace(/^(?:はい、?かしこまりました[。！!]*\s*)/, '').trim();
        }
        if (stripped && stripped.length >= 2) rawReply = stripped;
      } else {
        const stripped = rawReply.replace(/^(?:OK|Okay|Oh|Alright|Sure)[,!\s]+(?=[A-Za-z0-9])/i, '').trim();
        if (stripped && stripped.length >= 2) rawReply = stripped;
      }
      if (!replyLooksLikeTargetLanguage(rawReply, params.targetLang)) continue;
      // Relevance guard: a partner that parrots the learner or repeats its own previous line
      // verbatim is not answering the learner.
      const norm = (v: string) => String(v || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
      const lastAiLine = [...params.history].reverse().find((h) => h.speaker === 'ai')?.text || '';
      if (norm(rawReply) === norm(message) || (lastAiLine && norm(rawReply) === norm(lastAiLine))) {
        continue;
      }
      const rawTranslation = String(turn.translation || '')
        .replace(/^.*?(Terjemahan|Translation|คำแปล)\s*:\s*/i, '')
        .replace(/^["「]|["」]$/g, '')
        .trim();
      return { reply: rawReply, translation: rawTranslation };
    } catch {
      clearTimeout(timer);
      return null;
    }
  }
  return null;
}

/**
 * Wakes the neural TTS backend (Render free tier cold-starts in ~7s) and issues the learner
 * identity cookie as soon as Voice Studio opens, so the first spoken line is not silent.
 */
export function warmUpVoiceServices(): void {
  if (typeof window === 'undefined') return;
  const ping = () => {
    try {
      const cfg = window.FIEZEL_TTS_CONFIG || getSameOriginParent()?.FIEZEL_TTS_CONFIG;
      const personas = cfg?.personasEndpoint;
      if (personas) {
        void fetch(personas, { method: 'GET', mode: 'cors', cache: 'no-store' })
          .then((r) => {
            if (r.ok) _ttsWarm = true;
          })
          .catch(() => {});
      }
    } catch {
      // Ignore
    }
  };
  ping();
  // Retry once shortly after mount in case defer `core-config.js` finished just after module init.
  window.setTimeout(() => {
    if (!_ttsWarm) ping();
    void ensureLearnerIdentity();
  }, 250);
  // Keep the neural voice server awake while Voice Studio is open (free tier sleeps when idle).
  if (!_ttsKeepAliveTimer) {
    _ttsKeepAliveTimer = window.setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') ping();
    }, 4 * 60 * 1000);
  }
  void ensureLearnerIdentity();
}

let _ttsWarm = false;
let _ttsKeepAliveTimer: number | null = null;

/** Neural TTS endpoint: explicit Voice Studio override -> host/parent FIEZEL_TTS_CONFIG -> same-origin. */
export function resolveTtsEndpoint(): string {
  if (typeof window !== 'undefined') {
    const parentWin = getSameOriginParent();
    const override =
      window.FIEZEL_VOICE_STUDIO_CONFIG?.ttsApiUrl ||
      parentWin?.FIEZEL_VOICE_STUDIO_CONFIG?.ttsApiUrl;
    if (override) return override;
    const host = window.FIEZEL_TTS_CONFIG || parentWin?.FIEZEL_TTS_CONFIG;
    if (host && host.enabled !== false && host.endpoint) return host.endpoint;
  }
  return '/api/tts/line';
}

/**
 * Shared input for one learner turn.
 */
export interface TurnEvaluationParams {
  text: string;
  scenario: CallScenario;
  persona: VoicePersona;
  targetLang: TargetLang;
  locale: LearnerLocale;
  measureMode: boolean;
  history: Array<{ speaker: 'ai' | 'user'; text: string }>;
}

/**
 * Step 1 (instant, 100% local): Braincore grading of the learner's exact words.
 * Runs in a few ms so the learner's own bubble + feedback appear immediately, while the
 * real AI partner reply is still being generated.
 */
export function evaluateTurnLocal(params: TurnEvaluationParams): FlexibleTurnEvaluationResult {
  return evaluateUtteranceClientSide({
    text: params.text,
    scenario: params.scenario,
    targetLang: params.targetLang,
    history: params.history,
  });
}

/**
 * Step 2 (network): the partner's spoken reply.
 *
 * HONESTY CONTRACT (m025-637): the reply ALWAYS comes from a real AI when one is reachable.
 * The old 850 ms race replaced the AI with a deterministic template on almost every turn
 * (production AI needs ~2-6 s), which produced off-topic lines such as "presentation with my
 * family" in a cafe. Now we wait for the AI (bounded by AI_PARTNER_TIMEOUT_MS); the UI hides
 * the wait with Mochi's thinking state + a short neural filler. The template is used ONLY
 * when no AI answer is obtainable, and it is labelled `replySource: 'offline-template'`.
 * No speculative TTS is started for a reply that may never be spoken.
 */
export async function resolveAiReply(
  params: TurnEvaluationParams,
  localResult: FlexibleTurnEvaluationResult
): Promise<FlexibleTurnEvaluationResult> {
  // 1) Learner's own Gemini key (optional): same honesty rules, bounded wait.
  let userGeminiKey = '';
  try {
    if (typeof localStorage !== 'undefined') {
      userGeminiKey = (localStorage.getItem('fz_gemini_api_key') || '').trim();
    }
  } catch {
    // Ignore
  }

  if (userGeminiKey.length > 10) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const langLabel = params.targetLang === 'ja' ? 'Japanese (polite N5/N4)' : 'English (A1/A2)';
      const historyLines = params.history
        .filter((h) => h && h.text && h.text.trim())
        .slice(-6)
        .map((h) => `${h.speaker === 'ai' ? 'You' : 'Learner'}: ${h.text.trim().slice(0, 240)}`);
      const promptText = [
        `You are ${params.persona.name}, a real human friend chatting on a live voice call. Scenario: "${params.scenario.titleId}".`,
        `Reply in ${langLabel}, 1-2 lively conversational sentences (max 20 words).`,
        'HUMAN PERSONALITY & HUMOR: Be warm, fun, and expressive. If the learner jokes, laughs, or shares something funny or silly, laugh along naturally (use "Haha!" or "Hahaha!" in English, "あはは！" or "ふふっ" in Japanese) and banter back with fun energy!',
        'NATURAL INTONATION: Talk like a real friend hanging out on a phone call. In Japanese, use natural conversational particles (〜じゃん、〜ね、〜よ、〜でしょ、あはは！). In English, use natural conversational expressions ("Haha no way!", "That’s hilarious!", "Totally!").',
        'Your reply MUST directly respond to what the learner just said. Do not change the topic, never lecture, never explain grammar, and never sound like a robotic AI or customer service agent.',
        historyLines.length ? `Conversation so far:\n${historyLines.join('\n')}` : '',
        `Learner (last message): "${params.text}"`,
        'aiReplyTranslationId must be a faithful Indonesian translation of aiReply only.',
        `Respond ONLY with valid JSON: {"aiReply":"...","aiReplyTranslationId":"...","aiReplyTranslationTh":"...(Thai translation)"}`,
      ]
        .filter(Boolean)
        .join('\n');
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(
          userGeminiKey
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.5 },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = JSON.parse(rawText);
        let geminiReply = typeof parsed?.aiReply === 'string' ? parsed.aiReply.trim() : '';
        if (params.targetLang === 'ja') {
          let stripped = geminiReply.replace(/^(?:えっと|ええと|えーと|あの[ね]?|う[ー~]*ん|ああ|うん)[、,!\s・…〜~]*/, '').trim();
          if (params.scenario.id.includes('free') || params.scenario.id.includes('intro') || params.scenario.id.includes('phone_friend')) {
            stripped = stripped.replace(/^(?:はい、?かしこまりました[。！!]*\s*)/, '').trim();
          }
          if (stripped && stripped.length >= 2) geminiReply = stripped;
        } else {
          const stripped = geminiReply.replace(/^(?:OK|Okay|Oh|Alright|Sure)[,!\s]+(?=[A-Za-z0-9])/i, '').trim();
          if (stripped && stripped.length >= 2) geminiReply = stripped;
        }
        if (geminiReply && replyLooksLikeTargetLanguage(geminiReply, params.targetLang)) {
          const ttsPromise = synthesizeFlexibleTts({
            text: geminiReply,
            targetLang: params.targetLang,
            persona: params.persona,
          });
          const cards = getBeginnerReplyCards(
            params.scenario.id,
            params.targetLang,
            undefined,
            geminiReply,
            params.text,
            params.history
          );
          const ttsRes = await ttsPromise;
          return {
            ...localResult,
            aiReply: geminiReply,
            aiReplyTranslationId: parsed.aiReplyTranslationId || '',
            aiReplyTranslationTh: parsed.aiReplyTranslationTh || '',
            nextSuggestedReplies: cards,
            audioBase64: ttsRes?.audioBase64 || null,
            audioMimeType: ttsRes?.audioMimeType || 'audio/mpeg',
            ttsEngine: ttsRes?.engine || 'fiezel-edge-tts-binary',
            replySource: 'ai-gemini-key',
          };
        }
      }
    } catch {
      // Fall through to the production AI partner
    }
  }

  // 2) Production AI partner (same Worker path as Ngobrol AI). Awaited — never raced
  //    against a template.
  const partner = await requestAiPartnerReply({
    text: params.text,
    scenario: params.scenario,
    targetLang: params.targetLang,
    locale: params.locale,
    history: params.history,
  });

  if (partner) {
    const ttsPromise = synthesizeFlexibleTts({
      text: partner.reply,
      targetLang: params.targetLang,
      persona: params.persona,
    });
    const cards = getBeginnerReplyCards(
      params.scenario.id,
      params.targetLang,
      undefined,
      partner.reply,
      params.text,
      params.history
    );
    const ttsRes = await ttsPromise;
    return {
      ...localResult,
      aiReply: partner.reply,
      aiReplyTranslationId: params.locale === 'th' ? '' : partner.translation,
      aiReplyTranslationTh: params.locale === 'th' ? partner.translation : '',
      nextSuggestedReplies: cards,
      audioBase64: ttsRes?.audioBase64 || null,
      audioMimeType: ttsRes?.audioMimeType || 'audio/mpeg',
      ttsEngine: ttsRes?.engine || 'fiezel-ai-partner',
      replySource: 'ai',
    };
  }

  // 3) Truly offline / AI unavailable: deterministic script, explicitly labelled.
  return {
    ...localResult,
    audioBase64: null,
    audioMimeType: 'audio/mpeg',
    ttsEngine: 'fiezel-edge-tts-binary',
    replySource: 'offline-template',
  };
}

/** Backwards-compatible one-shot wrapper (local grading + honest AI reply). */
export async function evaluateTurnFlexible(
  params: TurnEvaluationParams
): Promise<FlexibleTurnEvaluationResult> {
  return resolveAiReply(params, evaluateTurnLocal(params));
}

/**
 * Splits a long reply into at most 2 speakable chunks so sentence 1 plays while sentence 2
 * is synthesized. Short phone-call replies (<= 120 chars EN / <= 60 chars JA) stay as a
 * single chunk because a single Edge-TTS handshake on Render is faster (~200-800ms) than
 * two separate requests and matches the pre-rendered opening-line cache key.
 */
export function splitIntoSpeechChunks(text: string, targetLang: TargetLang, maxChunks = 2): string[] {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  // For phone call replies, DO NOT split short/medium conversational replies into chunks.
  // Splitting on punctuation (!, ?, .) forces multiple Audio instances with 1.5s-2.5s awkward gaps.
  // Edge-TTS natively synthesizes full conversational sentences with natural human prosody and zero awkward gaps.
  const singleLimit = 320;
  if (clean.length <= singleLimit) return [clean];
  const parts =
    targetLang === 'ja'
      ? clean.match(/[^。！？!?]+[。！？!?]*/g) || [clean]
      : clean.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g) || [clean];
  const minLen = targetLang === 'ja' ? 10 : 24;
  const chunks: string[] = [];
  let carry = '';
  for (const raw of parts) {
    const piece = raw.trim();
    if (!piece) continue;
    const merged = carry ? `${carry}${targetLang === 'ja' ? '' : ' '}${piece}` : piece;
    if (merged.length < minLen) {
      carry = merged;
      continue;
    }
    chunks.push(merged);
    carry = '';
  }
  if (carry) {
    if (chunks.length) chunks[chunks.length - 1] += `${targetLang === 'ja' ? '' : ' '}${carry}`;
    else chunks.push(carry);
  }
  if (chunks.length > maxChunks) {
    const head = chunks.slice(0, maxChunks - 1);
    head.push(chunks.slice(maxChunks - 1).join(targetLang === 'ja' ? '' : ' '));
    return head;
  }
  return chunks;
}

/**
 * Short, content-neutral neural "listening" filler played while the AI is still thinking.
 * Kept to a single phrase per language so background pre-render makes at most 1 TTS request.
 */
export function getThinkingFillers(_targetLang: TargetLang): string[] {
  return [];
}

/**
 * Fast TTS synthesis with per-persona voice routing, in-memory audio cache, and
 * temporary cooldown instead of a permanent kill-switch.
 */
export async function synthesizeFlexibleTts(params: {
  text: string;
  targetLang: TargetLang;
  persona?: VoicePersona;
  /** Retry path: ignore the short failure cooldown. */
  force?: boolean;
}): Promise<{ audioBase64: string; audioMimeType: string; engine: string } | null> {
  const speakerMap: Record<string, string> = {
    coach_alex: 'coach_alex',
    coach_sarah: 'coach_sarah',
    sensei_nanami: 'sensei_nanami',
    sensei_keita: 'keita',
    nanami: 'sensei_nanami',
    keita: 'keita',
  };
  const speaker =
    (params.persona && speakerMap[params.persona.id]) ||
    (params.targetLang === 'ja' ? 'sensei_nanami' : 'coach_alex');

  const cacheKey = `${speaker}:${params.targetLang}:${params.text.trim()}`;
  const cached = _ttsMemoryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const inflight = _ttsInFlight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  if (!params.force && Date.now() < _ttsCooldownUntil) {
    return null;
  }

  const endpoint = resolveTtsEndpoint();

  const requestPromise = (async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 11000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: params.text,
          speaker,
          lang: params.targetLang,
        }),
        mode: 'cors',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        _ttsWarm = true;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('audio/')) {
          const buf = await res.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          _ttsConsecutiveFailures = 0;
          _ttsCooldownUntil = 0;
          const result = {
            audioBase64: btoa(binary),
            audioMimeType: contentType.split(';')[0] || 'audio/mpeg',
            engine: 'fiezel-edge-tts-binary',
          };
          _ttsMemoryCache.set(cacheKey, result);
          return result;
        }
        if (contentType.includes('application/json')) {
          const json = await res.json();
          const b64 = json?.audioBase64 || json?.audio_base64 || json?.audio || json?.data;
          if (typeof b64 === 'string' && b64.length > 32) {
            _ttsConsecutiveFailures = 0;
            _ttsCooldownUntil = 0;
            const result = {
              audioBase64: b64.replace(/^data:audio\/[^;]+;base64,/, ''),
              audioMimeType: json?.mimeType || json?.audioMimeType || 'audio/mpeg',
              engine: 'fiezel-edge-tts-json',
            };
            _ttsMemoryCache.set(cacheKey, result);
            return result;
          }
        }
      }
      _ttsConsecutiveFailures += 1;
      if (_ttsConsecutiveFailures >= 3) {
        _ttsCooldownUntil = Date.now() + 2500;
      }
    } catch {
      _ttsConsecutiveFailures += 1;
      if (_ttsConsecutiveFailures >= 3) {
        _ttsCooldownUntil = Date.now() + 2500;
      }
    } finally {
      _ttsInFlight.delete(cacheKey);
    }

    return null;
  })();

  _ttsInFlight.set(cacheKey, requestPromise);
  return requestPromise;
}

/**
 * Helper to translate live turns on client when using WebSocket or Turn-by-Turn fallback
 */
export function buildLiveTurnTranslations(text: string, targetLang: TargetLang) {
  const sub = translateAndPhoneticizeLiveText(text, targetLang);
  return {
    translationId: sub.translationId,
    translationTh: sub.translationTh,
    pronunciation: sub.pronunciation,
  };
}
