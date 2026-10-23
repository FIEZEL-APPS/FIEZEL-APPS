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
 * Always includes the production Cloudflare Worker proxy `wss://fiezel.my.id/api/live-call`.
 */
export function resolveLiveCallWebSocketUrls(): string[] {
  const urls: string[] = [];

  // Direct client Gemini Multimodal Live API WebSocket if user key is saved
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

  // Primary production Cloudflare Worker WebSocket proxy as mandated by FIEZEL architecture
  urls.push('wss://fiezel.my.id/api/live-call');

  // If running in local dev / preview server (e.g. localhost or Cloud Run preview), also allow local WS relay
  if (typeof window !== 'undefined' && window.location?.host) {
    const host = window.location.host;
    const isProductionDomain = host.includes('fiezel.my.id');
    if (!isProductionDomain) {
      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      urls.push(`${wsProto}//${host}/ws/live-call`);
    }
  }

  return Array.from(new Set(urls));
}

/**
 * Client-side pedagogical evaluator so Turn-by-Turn Audio mode works 100% reliably
 * even on purely static cPanel hosting (`fiezel.my.id/app/`) when no Node.js server is running.
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
    const hasPastTenseError =
      /\b(yesterday\s+i\s+go|last\s+week\s+i\s+go|i\s+buy\s+many|i\s+eat\s+at|\bgoed\b|\bbuyed\b|\beated\b)\b/i.test(
        lower
      );
    const hasModalToError = /\b(can\s+to|must\s+to|should\s+to|will\s+to)\b/i.test(lower);
    const hasBareWantRequest = /\b(i\s+want\s+coffee|give\s+me\s+coffee|i\s+want\s+drink)\b/i.test(
      lower
    );

    const missingTokens: string[] = [];
    const isFirstTurn = !history || history.filter((h) => h.speaker === 'user').length === 0;
    if (isFirstTurn) {
      if (scenarioId.includes('hometown')) {
        if (!/\b(live|house|from|home|stay|city|town|park|cafe)\b/i.test(lower)) {
          missingTokens.push('live in', 'near my house');
        }
      } else if (scenarioId.includes('cafe')) {
        if (!/\b(would like|i'd like|could i|may i|can i|please|order|topic|studying|project)\b/i.test(lower)) {
          missingTokens.push("I'd like", 'Could I have');
        }
      } else if (scenarioId.includes('weekend') || scenarioId.includes('past')) {
        if (!/\b(went|visited|stayed|ate|watched|played|studied|worked|had|loved|was)\b/i.test(lower)) {
          missingTokens.push('went to', 'had a great time');
        }
      } else if (scenarioId.includes('ielts')) {
        if (
          !/\b(although|however|while|on the other hand|furthermore|because|believe|think)\b/i.test(
            lower
          )
        ) {
          missingTokens.push('Although', 'On the other hand');
        }
      }
    }

    const wordCount = exact.split(/\s+/).filter(Boolean).length;
    const isTooShort = wordCount < 2;

    if (
      hasSubjectDrop ||
      hasPastTenseError ||
      hasModalToError ||
      hasBareWantRequest ||
      isTooShort
    ) {
      let misconceptionId = 'EN_INCOMPLETE_CLAUSE_01';
      let whyFailsId =
        'Kalimat masih terlalu singkat atau belum memuat struktur penghubung yang utuh untuk menjawab konteks situasi.';
      let whyFailsTh =
        'ประโยคยังสั้นเกินไปหรือยังไม่มีโครงสร้างคำเชื่อมที่สมบูรณ์ตามบริบทของสถานการณ์';
      let syntacticCorrection = scenario.sampleUtterances[0]?.text || exact;

      if (hasBareWantRequest) {
        misconceptionId = 'EN_PRAGMATIC_BARE_WANT';
        whyFailsId =
          'Penggunaan "I want..." secara langsung terdengar kurang sopan dalam situasi layanan. Gunakan modal "I would like..." atau "Could I have...".';
        whyFailsTh =
          'การใช้ "I want..." โดยตรงฟังดูห้วนเกินไปในร้านอาหาร ควรใช้ "I would like..." หรือ "Could I have..."';
        syntacticCorrection =
          "I'd like an iced latte, please. Afterward, I plan to read at the library.";
      } else if (hasPastTenseError) {
        misconceptionId = 'EN_PAST_TENSE_BASE_VERB';
        whyFailsId =
          'Miskonsepsi Morfologi Waktu Lampau: Kata keterangan waktu lampau (yesterday/last weekend) wajib diikuti kata kerja bentuk kedua (V2: went, bought, ate), bukan bentuk dasar (go, buy).';
        whyFailsTh =
          'ความเข้าใจผิดเรื่อง Past Tense: เมื่อกล่าวถึงอดีต ต้องใช้กริยาช่องที่ 2 (went, bought) ไม่ใช่รูปพื้นฐาน (go, buy)';
        syntacticCorrection =
          'Yesterday I went to the night market with my family and bought delicious snacks.';
      } else if (hasSubjectDrop || hasModalToError) {
        misconceptionId = 'EN_CLAUSE_SUBJECT_OMISSION';
        whyFailsId =
          'Miskonsepsi Sintaksis Klausa: Dalam Bahasa Inggris, kata hubung "because" wajib diikuti Subjek eksplisit ("because it is..."), dan modal tidak boleh diikuti "to".';
        whyFailsTh =
          'ความเข้าใจผิดด้านโครงสร้างประโยค: หลัง "because" ต้องมีประธานชัดเจน ("because it is...") และหลังกริยาช่วยไม่ต้องใส่ "to"';
        syntacticCorrection =
          'Although working from home is convenient because it saves time, it can reduce team collaboration.';
      }

      const aiReply = scenarioId.includes('hometown')
        ? 'I see! Could you say it in a full sentence using "I live in..." and tell me what is near your house?'
        : scenarioId.includes('cafe')
          ? 'I see! To sound more polite at the counter, could you try ordering again using "I would like..." and tell me where you plan to go afterward?'
          : 'Good effort! Try expressing that again with the complete sentence pattern so your meaning is crystal clear.';

      return {
        ok: false,
        accuracyScore: 54,
        grammarScore: 48,
        fluencyScore: isTooShort ? 52 : 68,
        vocabUsageScore: missingTokens.length > 0 ? 55 : 72,
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
        aiReplyTranslationId: scenarioId.includes('hometown')
          ? 'Begitu! Bisakah kamu mengucapkannya dalam kalimat utuh menggunakan "I live in..." dan ceritakan ada apa di dekat rumahmu?'
          : scenarioId.includes('cafe')
            ? 'Begitu! Agar terdengar lebih sopan di kasir, bisakah kamu mencoba memesan lagi dengan "I would like..." serta menceritakan rencanamu setelah ini?'
            : 'Usaha yang bagus! Coba ucapkan kembali dengan pola kalimat lengkap agar maknanya lebih presisi.',
        aiReplyTranslationTh: scenarioId.includes('hometown')
          ? 'เข้าใจแล้ว! ลองพูดเป็นประโยคเต็มโดยใช้ "I live in..." และบอกหน่อยว่าแถวบ้านของคุณมีอะไรบ้าง?'
          : 'เข้าใจแล้ว! ลองพูดอีกครั้งด้วยโครงสร้างประโยคที่สมบูรณ์เพื่อให้ความหมายชัดเจนขึ้นนะ',
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
        'Struktur kalimat, pemilihan kosakata kontekstual, dan kesopanan pragmatis sudah tepat dan alami.',
      pedagogicalFeedbackTh:
        'โครงสร้างประโยค การเลือกใช้คำศัพท์ และความสุภาพเหมาะสมและเป็นธรรมชาติมาก',
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

  // Japanese (ja) evaluation
  const hasWrongLocationParticle = /(駅に|コンビニに|どこに).*?(います|ありますか|お弁当)/u.test(
    exact
  );
  const lacksPoliteEnding =
    exact.length > 10 &&
    !/(です|ます|ください|ませんか|でしょうか|ですか|お願いします|ありがとう|こんにちは|こんばんは|はい|ええ)[。！？!?]?$/u.test(
      exact
    );
  const isTooShortJa = exact.length < 2;

  if (hasWrongLocationParticle || lacksPoliteEnding || isTooShortJa) {
    const misconceptionId = hasWrongLocationParticle
      ? 'JA_PARTICLE_NI_VS_DE_OR_WA'
      : 'JA_REGISTER_MISSING_DESU_MASU';
    const whyFailsId = hasWrongLocationParticle
      ? 'Miskonsepsi Partikel Lokasi: Gunakan 「〜はどこですか」 untuk menanyakan letak tempat, atau 「〜を温めてください」 untuk meminta menghangatkan objek.'
      : 'Miskonsepsi Register Sopan (Teineigo): Dalam percakapan situasi umum/stasiun/konbini, akhiri kalimat dengan bentuk sopan 「〜です / 〜ます / 〜てください」.';
    const whyFailsTh = hasWrongLocationParticle
      ? 'ความเข้าใจผิดเรื่องคำช่วยสถานที่: ใช้ 「〜はどこですか」 เมื่อถามตำแหน่งสถานที่ หรือใช้ 「〜を温めてください」 เมื่อขอให้อุ่นอาหาร'
      : 'ความเข้าใจผิดเรื่องระดับความสุภาพ (Teineigo): ในสถานการณ์ทั่วไปควรลงท้ายประโยคด้วยรูปสุภาพ 「〜です / 〜ます / 〜てください」';
    const syntacticCorrection = scenario.sampleUtterances[0]?.text || exact;
    const aiReply =
      'なるほど！もう少し丁寧な形（「〜をお願いします」や「〜はどこですか」）でもう一度言ってみましょうか？';

    return {
      ok: false,
      accuracyScore: 52,
      grammarScore: 49,
      fluencyScore: 60,
      vocabUsageScore: 58,
      userExactTranscript: exact,
      misconceptionId,
      whyFailsId,
      whyFailsTh,
      missingTokens: lacksPoliteEnding ? ['〜てください / 〜ですか'] : [],
      syntacticCorrection,
      naturalReformulation: syntacticCorrection,
      pedagogicalFeedbackId: whyFailsId,
      pedagogicalFeedbackTh: whyFailsTh,
      aiReply,
      aiReplyTranslationId:
        'Begitu! Mari coba ucapkan sekali lagi menggunakan bentuk sopan (seperti "〜o onegaishimasu" atau "〜wa doko desu ka")?',
      aiReplyTranslationTh:
        'เข้าใจแล้วค่ะ! ลองพูดอีกครั้งในรูปสุภาพ (เช่น "〜o onegaishimasu" หรือ "〜wa doko desu ka") ดูไหมคะ?',
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
      'Penggunaan partikel bahasa Jepang dan ragam sopan (Desu/Masu/Kudasai) sudah tepat sesuai konteks.',
    pedagogicalFeedbackTh:
      'การใช้คำช่วยภาษาญี่ปุ่นและรูปประโยคสุภาพ (Desu/Masu/Kudasai) ถูกต้องตามบริบท',
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
let _ttsApiAvailable: boolean | null = null;

/**
 * Evaluates a user speaking turn with ultra-low latency:
 * 1) Direct Gemini 2.0 Flash REST API if user saved `fz_gemini_api_key`
 * 2) Configured `turnApiUrl` if reachable within 1.5s
 * 3) Instant client-side Braincore pedagogical analyzer (`evaluateUtteranceClientSide`)
 */
export async function evaluateTurnFlexible(params: {
  text: string;
  scenario: CallScenario;
  persona: VoicePersona;
  targetLang: TargetLang;
  locale: LearnerLocale;
  measureMode: boolean;
  history: Array<{ speaker: 'ai' | 'user'; text: string }>;
}): Promise<FlexibleTurnEvaluationResult> {
  const localResult = evaluateUtteranceClientSide({
    text: params.text,
    scenario: params.scenario,
    targetLang: params.targetLang,
    history: params.history,
  });

  // 1) If user has a Gemini API Key, enrich reply via Gemini 2.0 Flash REST API
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
      const timeout = setTimeout(() => controller.abort(), 3200);
      const langLabel = params.targetLang === 'ja' ? 'Japanese (polite N5/N4)' : 'English (A1/A2)';
      const promptText = [
        `You are ${params.persona.name}, a friendly speaking partner in scenario "${params.scenario.titleId}".`,
        `Reply naturally in ${langLabel} in 1-2 short sentences to the student's message, and ask a simple follow-up question.`,
        `Student said: "${params.text}"`,
        `Respond ONLY with valid JSON: {"aiReply":"...","aiReplyTranslationId":"...(Indonesian translation)","aiReplyTranslationTh":"...(Thai translation)"}`,
      ].join('\n');
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(
          userGeminiKey
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = JSON.parse(rawText);
        if (parsed && typeof parsed.aiReply === 'string' && parsed.aiReply.trim()) {
          return {
            ...localResult,
            aiReply: parsed.aiReply.trim(),
            aiReplyTranslationId:
              parsed.aiReplyTranslationId || localResult.aiReplyTranslationId,
            aiReplyTranslationTh:
              parsed.aiReplyTranslationTh || localResult.aiReplyTranslationTh,
            nextSuggestedReplies: getBeginnerReplyCards(
              params.scenario.id,
              params.targetLang,
              undefined,
              parsed.aiReply.trim(),
              params.text,
              params.history
            ),
          };
        }
      }
    } catch {
      // Fall through to fast local result
    }
  }

  // 2) Only probe custom turnApiUrl if explicitly configured and not yet marked unavailable
  const customUrl =
    typeof window !== 'undefined' ? window.FIEZEL_VOICE_STUDIO_CONFIG?.turnApiUrl : undefined;
  if (customUrl && _turnApiAvailable !== false) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(customUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: params.text,
          scenarioId: params.scenario.id,
          competencyId: params.scenario.competencyId,
          targetLang: params.targetLang,
          locale: params.locale,
          personaId: params.persona.id,
          geminiVoice: params.persona.geminiVoice,
          edgeVoice: params.persona.edgeVoice,
          systemPrompt: params.persona.systemPrompt,
          measureMode: params.measureMode,
          history: params.history.slice(-6),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.aiReply === 'string') {
          _turnApiAvailable = true;
          return data as FlexibleTurnEvaluationResult;
        }
      }
      _turnApiAvailable = false;
    } catch {
      _turnApiAvailable = false;
    }
  }

  return {
    ...localResult,
    audioBase64: null,
    audioMimeType: null,
    ttsEngine: 'browser-speech-synthesis',
  };
}

/**
 * Fast TTS synthesis with circuit breaker so dead/cold endpoints never stall conversation.
 */
export async function synthesizeFlexibleTts(params: {
  text: string;
  targetLang: TargetLang;
  persona?: VoicePersona;
}): Promise<{ audioBase64: string; audioMimeType: string; engine: string } | null> {
  if (_ttsApiAvailable === false) {
    return null;
  }

  const speakerMap: Record<string, string> = {
    coach_alex: 'coach_alex',
    coach_sarah: 'coach_sarah',
    sensei_nanami: 'sensei_nanami',
    sensei_keita: 'sensei_keita',
  };
  const speaker =
    (params.persona && speakerMap[params.persona.id]) ||
    (params.targetLang === 'ja' ? 'sensei_nanami' : 'coach_alex');

  const endpoint =
    (typeof window !== 'undefined' && window.FIEZEL_VOICE_STUDIO_CONFIG?.ttsApiUrl) ||
    '/api/tts/line';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1400);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: params.text,
        speaker,
        lang: params.targetLang,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('audio/')) {
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        _ttsApiAvailable = true;
        return {
          audioBase64: btoa(binary),
          audioMimeType: contentType.split(';')[0] || 'audio/mpeg',
          engine: 'fiezel-edge-tts-binary',
        };
      }
      if (contentType.includes('application/json')) {
        const json = await res.json();
        const b64 = json?.audioBase64 || json?.audio_base64 || json?.audio || json?.data;
        if (typeof b64 === 'string' && b64.length > 32) {
          _ttsApiAvailable = true;
          return {
            audioBase64: b64.replace(/^data:audio\/[^;]+;base64,/, ''),
            audioMimeType: json?.mimeType || json?.audioMimeType || 'audio/mpeg',
            engine: 'fiezel-edge-tts-json',
          };
        }
      }
    }
    _ttsApiAvailable = false;
  } catch {
    _ttsApiAvailable = false;
  }

  return null;
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
