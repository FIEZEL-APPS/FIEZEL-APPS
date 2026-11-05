import type {
  CallScenario,
  LearnerLocale,
  TargetLang,
  VoicePersona,
  VoiceUiAction,
} from '../types/voiceCall.ts';
import {
  type BeginnerReplyCard,
  generateDynamicContextualAiReply,
  translateAndPhoneticizeLiveText,
} from './liveCallHelper.ts';
import { stripEmojisAndEmotWords, toPhoneticRomaji } from './japanesePhonetics.js';
import { toPhoneticPinyin, containsHanzi, stripHanzi } from './mandarinPhonetics.ts';

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
   * Provenance of `aiReply`: strictly online AI ('ai' = production AI partner,
   * 'ai-gemini-key' = learner's own Gemini key). Zero offline templates.
   */
  replySource?: 'ai' | 'ai-gemini-key';
  uiAction?: VoiceUiAction;
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
 * Resamples Float32 audio samples from native device rate (e.g. 48kHz / 44.1kHz)
 * down to target rate (16kHz standard for Gemini Multimodal Live API) using
 * linear interpolation, and encodes to little-endian 16-bit PCM base64.
 */
export function resampleAndConvertToPcm16Base64(
  float32: Float32Array,
  fromSampleRate: number,
  toSampleRate = 16000
): string {
  if (!fromSampleRate || fromSampleRate <= 0) fromSampleRate = toSampleRate;
  if (fromSampleRate === toSampleRate) {
    return float32ToPcm16Base64(float32);
  }
  const ratio = fromSampleRate / toSampleRate;
  const newLength = Math.max(1, Math.floor(float32.length / ratio));
  const int16 = new Int16Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const originIdx = i * ratio;
    const low = Math.floor(originIdx);
    const high = Math.min(low + 1, float32.length - 1);
    const weight = originIdx - low;
    const sample = (1 - weight) * float32[low] + weight * float32[high];
    const s = Math.max(-1, Math.min(1, sample));
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
      const userKey =
        localStorage.getItem('fz_gemini_api_key') ||
        localStorage.getItem('gemini_api_key') ||
        localStorage.getItem('GEMINI_API_KEY');
      if (userKey && userKey.trim().length > 10) {
        const cleanKey = encodeURIComponent(userKey.trim());
        urls.push(
          `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${cleanKey}`
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

export interface GeminiLiveSessionInfo {
  ok: boolean;
  token?: string;
  model?: string;
  endpoint?: string;
  keyIndex?: number;
  totalKeys?: number;
  fallback?: boolean;
}

/**
 * Resolves ordered API base URLs for Voice Studio real-time endpoints.
 * On localhost/127.0.0.1 preview server, tries same-origin (`""`) first so local
 * 16-key Gemini endpoints respond directly without cross-origin blocks; in production,
 * routes directly to Cloudflare Worker (`api.fiezel.my.id`).
 * Strict Invariant: NEVER routes to same-origin `""` in remote production because
 * static cPanel hosts return 404 HTML pages for `/api/*` endpoints.
 */
export function resolveVoiceApiCandidateBases(): string[] {
  const bases: string[] = [];
  const isLocalHost =
    typeof window !== 'undefined' &&
    /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(window.location?.hostname || '');
  const cfBase =
    resolveCfApiBase() ||
    (typeof window !== 'undefined' && window.FIEZEL_CF_CONFIG?.base
      ? window.FIEZEL_CF_CONFIG.base
      : 'https://api.fiezel.my.id');

  if (isLocalHost) {
    bases.push('');
  }
  if (cfBase) {
    bases.push(cfBase.replace(/\/$/, ''));
  }
  return Array.from(new Set(bases));
}

/**
 * Requests an ephemeral session token from the Cloudflare Worker / Local 16-key pool.
 * Automatically round-robins and fails over if a key encounters quota limits.
 */
export async function requestGeminiLiveSessionToken(): Promise<GeminiLiveSessionInfo> {
  for (const base of resolveVoiceApiCandidateBases()) {
    const url = `${base}/api/voice/live-session`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        mode: 'cors',
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (data && data.ok && data.token) {
          return {
            ok: true,
            token: data.token,
            model: data.model || 'gemini-3.8-live',
            endpoint:
              data.endpoint ||
              'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained',
            keyIndex: data.keyIndex,
            totalKeys: data.totalKeys,
          };
        }
      }
    } catch {
      // Try next base candidate
    }
  }
  return { ok: false, fallback: true };
}

/**
 * Reports a mid-call WebSocket drop or quota limit back to Worker to rotate the key.
 */
export async function reportGeminiLiveSessionDrop(
  reason: string,
  code?: number,
  keyIndex?: number
): Promise<void> {
  if (code === 1000 || code === 1005 || code === 1007) {
    return;
  }
  const base = resolveVoiceApiCandidateBases()[0] ?? 'https://api.fiezel.my.id';
  try {
    await fetch(`${base}/api/voice/report-drop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, code, keyIndex }),
      mode: 'cors',
    });
  } catch {
    // Ignore
  }
}

export interface RealtimeCopilotAssistResult {
  ok: boolean;
  source: 'ai-realtime';
  aiMeaningId: string;
  aiMeaningTh: string;
  replies: BeginnerReplyCard[];
  cards: BeginnerReplyCard[];
}

const COPILOT_CACHE_MAX = 60;
const _copilotTurnCache = new Map<string, RealtimeCopilotAssistResult>();
function copilotCacheSet(key: string, value: RealtimeCopilotAssistResult): void {
  if (_copilotTurnCache.has(key)) _copilotTurnCache.delete(key);
  _copilotTurnCache.set(key, value);
  while (_copilotTurnCache.size > COPILOT_CACHE_MAX) {
    const oldest = _copilotTurnCache.keys().next().value;
    if (oldest === undefined) break;
    _copilotTurnCache.delete(oldest);
  }
}

let _copilotServerCooldownUntil = 0;

export type CopilotSpeechAct =
  | 'echo_redemption'
  | 'clarification_repeat'
  | 'wh_what_action'
  | 'invitation'
  | 'choice'
  | 'wh_how_long'
  | 'wh_how_often'
  | 'wh_how_many'
  | 'wh_how_feel_day'
  | 'wh_how_method'
  | 'wh_where_origin'
  | 'wh_where_action'
  | 'wh_what_food'
  | 'wh_what_talk'
  | 'wh_what_general'
  | 'wh_why'
  | 'wh_when'
  | 'wh_who'
  | 'yesno_are'
  | 'yesno_can'
  | 'yesno_have'
  | 'yesno_did'
  | 'yesno_would'
  | 'yesno_do'
  | 'greeting'
  | 'statement';

export interface FocalClauseResult {
  fullText: string;
  focalText: string;
  isEchoRedemption: boolean;
  echoCorrectionTarget?: string;
  choiceOptionA?: string;
  choiceOptionB?: string;
  extractedTopic?: string;
}

export function extractFocalClause(aiText: string, targetLang: TargetLang): FocalClauseResult {
  const clean = stripEmojisAndEmotWords(aiText || '').trim();
  if (!clean) {
    return { fullText: '', focalText: '', isEchoRedemption: false };
  }

  // 1. Check for Echo Redemption correction request
  const echoMatchEn =
    clean.match(
      /(?:repeat|say (?:it|this)?(?:\s+back)?(?:\s+to me)?(?:\s+cleanly|\s+out loud|\s+like this)?|say after me|repeat after me|should say|gotta say|try saying)[:\s,]+["'“‘『「]([^"'”’』」]+)["'”’』」]/i
    ) ||
    clean.match(
      /["'“‘『「]([^"'”’』」]{2,120})["'”’』」][.!,?\s]*(?:come on[,!\s]*|now[,!\s]*)?(?:repeat|say it(?:\s+again|\s+back|\s+with me|\s+after me)?|try saying it)/i
    );
  const echoMatchJa =
    clean.match(
      /(?:[「『"“])([^」』"”]+)[」』"”](?:と|って)?[、。！!\s]*(?:ほら[、\s]*|さあ[、\s]*)?(?:もう一度|もう一回)?(?:言って(?:みて|ごらん|み)?|リピートして|読ん(?:でみて)?|言い直して)/u
    ) ||
    clean.match(
      /(?:(?:もう一度|もう一回|リピートして|言ってみて|言ってごらん|こう言う(?:んだ|のよ|ねん)|正しくは)[:：、\s]*(?:[「『"“])([^」』"”]+)[」』"”])/u
    );
  const echoMatchZh =
    clean.match(
      /(?:[“"「『])([^”"」』]+)[”"」』][，。！!\s]*(?:来[，\s]*|快[，\s]*)?(?:跟我(?:重新)?(?:读|说|念|重复)(?:一遍)?|(?:重新|再)(?:说|读|念|重复)一遍|重复一遍|读一遍|说一遍)/u
    ) ||
    clean.match(
      /(?:(?:跟我(?:重新)?(?:读|说|念|重复)(?:一遍)?|(?:再|重新)?(?:说|读|念|重复)一遍|重复一遍|读一遍|(?:得|要|应该|该)这么说|正确(?:的)?说法是)[:：，\s]*(?:[“"「『])([^”"」』]+)[”"」』])/u
    );
  const echoTarget = (echoMatchEn?.[1] || echoMatchJa?.[1] || echoMatchZh?.[1])?.trim();
  if (echoTarget) {
    return {
      fullText: clean,
      focalText: echoTarget,
      isEchoRedemption: true,
      echoCorrectionTarget: echoTarget,
    };
  }

  // 2. Split into sentences to isolate terminal speech act
  const isCjk = targetLang === 'ja' || targetLang === 'zh';
  const splitRe = isCjk ? /([。！？!?\n]+)/ : /([.?!;\n]+)/;
  const rawParts = clean.split(splitRe).map((p) => p.trim()).filter(Boolean);
  const sentences: string[] = [];
  for (let i = 0; i < rawParts.length; i += 2) {
    const s = rawParts[i] + (rawParts[i + 1] || '');
    if (s.trim()) sentences.push(s.trim());
  }

  const parseDetails = (focalText: string): FocalClauseResult => {
    let choiceOptionA: string | undefined;
    let choiceOptionB: string | undefined;

    if (targetLang === 'ja') {
      const mChoice = focalText.match(
        /([^、。？！?]+?)(?:、?\s*それとも|\s*か、?\s*)([^、。？！?]+?)(?:のどちら|のどっち|ですか|がいい|[？?])/u
      );
      if (mChoice) {
        choiceOptionA = mChoice[1].replace(/^(?:店内|お持ち帰り|アイス|ホット)/, (m) => m).trim();
        choiceOptionB = mChoice[2].trim();
      }
    } else if (targetLang === 'zh') {
      const mChoice = focalText.match(/([^，。？！?]+?)\s*还是\s*([^，。？！?]+?)(?:[？?]?)$/u);
      if (mChoice) {
        choiceOptionA = mChoice[1].replace(/^(?:你想(?:喝|吃|要)?|你(?:要|喜欢)?|想(?:喝|吃)?|喜欢)\s*/u, '').trim();
        choiceOptionB = mChoice[2].replace(/[？?]$/u, '').trim();
      }
    } else {
      const mChoice =
        focalText.match(
          /(?:(?:do you|would you)?\s*(?:prefer|rather|choose between|like|have|want))\s+([a-zA-Z\s]{2,20}?)\s+or\s+([a-zA-Z\s]{2,20}?)(?:[?.!]|$)/i
        ) || focalText.match(/([a-zA-Z\s]{2,20}?)\s+or\s+([a-zA-Z\s]{2,20}?)(?:[?.!]|$)/i);
      if (mChoice) {
        choiceOptionA = mChoice[1].replace(/^(?:do you|would you|prefer|like|have|want|a|an|the)\s+/i, '').trim();
        choiceOptionB = mChoice[2].replace(/^(?:a|an|the)\s+/i, '').trim();
      }
    }

    let extractedTopic: string | undefined;
    if (targetLang === 'ja') {
      const jaStop = new Set([
        '今日', '明日', '昨日', '今週末', '今週', '毎日', '最近', '普段', 'いつも',
        'あなた', 'わたし', '私', '僕', '俺', '君', 'お前', '先生', '後輩',
        'ところ', 'なに', '何', 'どこ', 'いつ', 'だれ', '誰', 'どう', 'それ', 'これ', 'あれ',
        '変な日本語', '日本語', '直訳',
      ]);
      const rawTopic = focalText.match(/([一-龯ぁ-んァ-ン]{2,6})(?:は|が|を|に|について|のこと)/)?.[1];
      extractedTopic = rawTopic && !jaStop.has(rawTopic) ? rawTopic : undefined;
    } else if (targetLang === 'zh') {
      const zhStop = new Set([
        '今天', '明天', '昨天', '最近', '平时', '现在', '我们', '你们', '他们',
        '什么', '点儿', '点什么', '哪里', '怎么', '为什么', '今天你想', '你想', '想聊', '小糯米', '声调', '生词',
      ]);
      const rawTopic =
        focalText.match(/(?:关于|喜欢|觉得|对|聊聊|谈谈)([\u4e00-\u9fff]{2,4})/u)?.[1] ||
        focalText.match(/([\u4e00-\u9fff]{2,4})(?:方面|的话)/u)?.[1];
      extractedTopic = rawTopic && !zhStop.has(rawTopic) ? rawTopic : undefined;
    } else {
      const stop = new Set([
        'the', 'a', 'an', 'your', 'you', 'do', 'does', 'did', 'what', 'where', 'how', 'why', 'when',
        'who', 'is', 'are', 'about', 'like', 'this', 'that', 'there', 'here', 'today', 'and', 'or',
        'to', 'of', 'in', 'on', 'for', 'with', 'it', 'me', 'my', 'we', 'so', 'any', 'some', 'usually', 'would',
        'lately', 'recently', 'been', 'tripping', 'part', 'english', 'japanese', 'mandarin', 'chinese',
        'real', 'talk', 'door', 'spot', 'voice', 'robot', 'textbook', 'leave', 'stiff', 'slips', 'calling',
      ]);
      const words = focalText
        .toLowerCase()
        .replace(/[^a-z\s']/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stop.has(w));
      extractedTopic = words.length ? words[words.length - 1] : undefined;
    }

    return {
      fullText: clean,
      focalText,
      isEchoRedemption: false,
      choiceOptionA,
      choiceOptionB,
      extractedTopic,
    };
  };

  if (sentences.length <= 1) {
    return parseDetails(clean);
  }

  // Look backwards for the last sentence containing a question or proposal/invitation
  for (let i = sentences.length - 1; i >= 0; i--) {
    const s = sentences[i];
    if (
      /[?？]/.test(s) ||
      /\b(why don't|shall we|let's|what about|how about|would you like|do you want|can we)\b/i.test(s) ||
      /(?:ませんか|ない[？?]|ましょう|どうですか|いかがですか)/u.test(s) ||
      /(?:要不要|好吗|怎么样|吧[？?]?)/u.test(s)
    ) {
      return parseDetails(s);
    }
  }

  return parseDetails(sentences[sentences.length - 1]);
}

export function detectAiIntent(aiText: string, targetLang: TargetLang): CopilotSpeechAct {
  const focal = extractFocalClause(aiText, targetLang);
  if (focal.isEchoRedemption) return 'echo_redemption';

  const s = focal.focalText.toLowerCase();

  // 0. Clarification / Repeat request (e.g. "could you say that again?", "repeat that?")
  if (targetLang === 'ja') {
    if (/(?:もう一度|もう一回|聞き取れ|電波が.*途切れ|言って(?:いただけますか|ください|みて))/u.test(focal.focalText)) {
      return 'clarification_repeat';
    }
  } else if (targetLang === 'zh') {
    if (/(?:再说一遍|信号.*断|刚才没听清|能重复一遍吗|再说一次|重新说一遍)/u.test(focal.focalText)) {
      return 'clarification_repeat';
    }
  } else {
    if (
      /\b(?:could you|can you|would you|please)?\s*(?:say that again|repeat that|say again|speak again|one more time)\b/i.test(s) ||
      /\b(?:pardon|what did you say|line glitched)\b/i.test(s)
    ) {
      return 'clarification_repeat';
    }
  }

  // 0.5. What Action / Activity (e.g. "what are you doing?", "what are you watching?", "what did you do today?")
  if (targetLang === 'ja') {
    if (/(?:何をしている|何をしてる|今何してる|何してた|何を食べた|何を見てる|何やってる|何をしていらっしゃ)/u.test(focal.focalText)) {
      return 'wh_what_action';
    }
  } else if (targetLang === 'zh') {
    if (/(?:在干嘛|在做什么|在干什么|做了什么|吃了什么|看什么|在忙什么)/u.test(focal.focalText)) {
      return 'wh_what_action';
    }
  } else {
    if (
      /\bwhat (?:are you doing|are you up to|is going on|did you do|were you doing|do you do now)\b/i.test(s) ||
      /\bwhat (?:did you eat|are you watching|are you eating|are you working on)\b/i.test(s)
    ) {
      return 'wh_what_action';
    }
  }

  // 1. Invitations & Proposals
  if (targetLang === 'ja') {
    if (/(?:ませんか|ない[？?]|ましょう(?:か)?|どうですか|いかがですか)/u.test(focal.focalText)) {
      return 'invitation';
    }
  } else if (targetLang === 'zh') {
    if (/(?:要不要|我们一起|好吗|怎么样|吧[？?]?)/u.test(focal.focalText)) {
      return 'invitation';
    }
  } else {
    if (
      /\b(why don't (?:we|you)|shall we|let's|how about|what about|care to join)\b/i.test(s) ||
      (!/\b(what|where|when|why|how)\b/i.test(s) && /\b(would you like to|do you want to)\b/i.test(s))
    ) {
      return 'invitation';
    }
  }

  // 2. Choice Questions (A or B)
  if (targetLang === 'ja') {
    if (/(?:それとも|どっち|どちら)/u.test(focal.focalText) || /か、?[^？?]*か[？?]/u.test(focal.focalText)) {
      return 'choice';
    }
  } else if (targetLang === 'zh') {
    if (/(?:还是|哪个|哪一个)/u.test(focal.focalText)) {
      return 'choice';
    }
  } else {
    if (/\bor\b.*\?/i.test(s) || /\b(which one|prefer|rather)\b.*\?/i.test(s)) {
      return 'choice';
    }
  }

  // 3. WH-Questions
  // How long (Duration)
  if (targetLang === 'ja') {
    if (/(?:どのくらい|どれくらい|何年間|何ヶ月|何時間)/u.test(focal.focalText)) return 'wh_how_long';
  } else if (targetLang === 'zh') {
    if (/(?:多久|多长时间|多长)/u.test(focal.focalText)) return 'wh_how_long';
  } else {
    if (/\bhow long\b/i.test(s)) return 'wh_how_long';
  }

  // How often (Frequency)
  if (targetLang === 'ja') {
    if (/(?:頻度|何回|週に|月に)/u.test(focal.focalText)) return 'wh_how_often';
  } else if (targetLang === 'zh') {
    if (/(?:多久一次|经常|常常|几次)/u.test(focal.focalText)) return 'wh_how_often';
  } else {
    if (/\bhow often\b/i.test(s) || /\bhow many times\b/i.test(s)) return 'wh_how_often';
  }

  // How many / How much (Quantity)
  if (targetLang === 'ja') {
    if (/(?:いくつ|何人|いくら|何個|何枚|何本)/u.test(focal.focalText)) return 'wh_how_many';
  } else if (targetLang === 'zh') {
    if (/(?:多少|几个|几位|多少钱)/u.test(focal.focalText)) return 'wh_how_many';
  } else {
    if (/\bhow (many|much)\b/i.test(s)) return 'wh_how_many';
  }

  // How feel / day / state
  if (targetLang === 'ja') {
    if (/(?:どんな一日|調子はどう|元気(?:ですか)?|いかがお過ごし)/u.test(focal.focalText))
      return 'wh_how_feel_day';
  } else if (targetLang === 'zh') {
    if (/(?:今天怎么样|过得怎么样|最近好吗|心情怎么样)/u.test(focal.focalText)) return 'wh_how_feel_day';
  } else {
    if (
      /\bhow (was|is|has been) your (day|weekend|trip|morning|evening)\b/i.test(s) ||
      /\bhow are you\b/i.test(s) ||
      /\bhow('s| is) it going\b/i.test(s)
    )
      return 'wh_how_feel_day';
  }

  // How method
  if (targetLang === 'ja') {
    if (/(?:どうやって|どのように|どうすれば)/u.test(focal.focalText)) return 'wh_how_method';
  } else if (targetLang === 'zh') {
    if (/(?:怎么|如何|怎样)/u.test(focal.focalText)) return 'wh_how_method';
  } else {
    if (/\bhow (do|can|could|did|would) you\b/i.test(s) || /\bhow to\b/i.test(s)) return 'wh_how_method';
  }

  // Where (Origin vs Action)
  if (targetLang === 'ja') {
    if (/(?:出身はどこ|どこから来ました|どこ出身)/u.test(focal.focalText)) return 'wh_where_origin';
    if (/どこ/.test(focal.focalText)) return 'wh_where_action';
  } else if (targetLang === 'zh') {
    if (/(?:哪里人|从哪里来|家乡在哪里)/u.test(focal.focalText)) return 'wh_where_origin';
    if (/(?:哪里|哪儿|什么地方)/u.test(focal.focalText)) return 'wh_where_action';
  } else {
    if (/\bwhere (are you|do you come) from\b/i.test(s) || /\bwhere were you born\b/i.test(s))
      return 'wh_where_origin';
    if (/\bwhere\b/i.test(s)) return 'wh_where_action';
  }

  // What (Food vs Open Conversation Topic vs General)
  if (targetLang === 'ja') {
    if (/(?:何にしますか|何を食べ|何を飲み|ご注文|おすすめ)/u.test(focal.focalText)) return 'wh_what_food';
    if (/(?:何から話す|何の話|何を話|どんな話|話したい)/u.test(focal.focalText)) return 'wh_what_talk';
    if (/(?:なに|何)/u.test(focal.focalText)) return 'wh_what_general';
  } else if (targetLang === 'zh') {
    if (/(?:想喝什么|吃什么|点什么|要点什么)/u.test(focal.focalText)) return 'wh_what_food';
    if (/(?:聊点儿什么|聊点什么|聊什么|想聊|谈什么|说说什么)/u.test(focal.focalText)) return 'wh_what_talk';
    if (/什么/.test(focal.focalText)) return 'wh_what_general';
  } else {
    if (
      /\bwhat\s+(?:can i|shall i|would you|do you)?\s*(?:get|get started|like|order|have)\b/i.test(s) ||
      /\bwhat\s+(?:to drink|to eat|kind of (?:coffee|tea|food|drink))\b/i.test(s) ||
      /\b(coffee|tea|order|drink|food|lunch|dinner|latte)\b.*\?/i.test(s)
    )
      return 'wh_what_food';
    if (
      /\bwhat(?:'s| is) on your mind\b/i.test(s) ||
      /\bwhat (?:do you want|would you like|shall we) (?:to )?talk about\b/i.test(s) ||
      /\bwhat challenge did you tackle\b/i.test(s)
    )
      return 'wh_what_talk';
    if (/\bwhat\b/i.test(s)) return 'wh_what_general';
  }

  // Why
  if (targetLang === 'ja') {
    if (/(?:なぜ|どうして|なんで)/u.test(focal.focalText)) return 'wh_why';
  } else if (targetLang === 'zh') {
    if (/(?:为什么|为何|怎么会)/u.test(focal.focalText)) return 'wh_why';
  } else {
    if (/\bwhy\b/i.test(s)) return 'wh_why';
  }

  // When
  if (targetLang === 'ja') {
    if (/(?:いつ|何時)/u.test(focal.focalText)) return 'wh_when';
  } else if (targetLang === 'zh') {
    if (/(?:什么时候|几点)/u.test(focal.focalText)) return 'wh_when';
  } else {
    if (/\bwhen\b/i.test(s) || /\bwhat time\b/i.test(s)) return 'wh_when';
  }

  // Who
  if (targetLang === 'ja') {
    if (/(?:だれ|誰)/u.test(focal.focalText)) return 'wh_who';
  } else if (targetLang === 'zh') {
    if (/(?:谁|跟谁)/u.test(focal.focalText)) return 'wh_who';
  } else {
    if (/\bwho\b/i.test(s) || /\bwith whom\b/i.test(s)) return 'wh_who';
  }

  // 4. Yes/No Questions with Auxiliary Matching
  if (targetLang === 'ja') {
    if (/(?:ましたか|でしたか)/u.test(focal.focalText)) return 'yesno_did';
    if (/(?:ありますか|いますか)/u.test(focal.focalText)) return 'yesno_are';
    if (/(?:ですか|でしょうか)/u.test(focal.focalText)) return 'yesno_are';
    if (/(?:ますか)/u.test(focal.focalText)) return 'yesno_do';
    if (/か[？?]|の[？?]/.test(focal.focalText)) return 'yesno_do';
  } else if (targetLang === 'zh') {
    if (/(?:有没有|有.*吗)/u.test(focal.focalText)) return 'yesno_have';
    if (/(?:会不会|能.*吗|可以.*吗)/u.test(focal.focalText)) return 'yesno_can';
    if (/(?:是不是|是.*吗)/u.test(focal.focalText)) return 'yesno_are';
    if (/(?:去了吗|做了吗|过.*吗)/u.test(focal.focalText)) return 'yesno_did';
    if (/(?:想不想|愿意.*吗)/u.test(focal.focalText)) return 'yesno_would';
    if (/[吗不]/.test(focal.focalText)) return 'yesno_do';
  } else {
    if (/\b(are you|is it|is that|are they|aren't you|isn't it)\b/i.test(s)) return 'yesno_are';
    if (/\b(can you|could you|can we|could we)\b/i.test(s)) return 'yesno_can';
    if (/\b(have you|has it|haven't you)\b/i.test(s)) return 'yesno_have';
    if (/\b(did you|were you|was it|didn't you)\b/i.test(s)) return 'yesno_did';
    if (/\b(would you|will you|would it|won't you)\b/i.test(s)) return 'yesno_would';
    if (/\b(do you|does it|don't you|doesn't it)\b/i.test(s)) return 'yesno_do';
    if (/\?/.test(s)) return 'yesno_do';
  }

  // 5. Greeting (only if focal sentence itself is a greeting)
  if (targetLang === 'ja') {
    if (/^(?:こんにちは|おはよう(?:ございます)?|こんばんは|はじめまして)\b/u.test(focal.focalText))
      return 'greeting';
  } else if (targetLang === 'zh') {
    if (/^(?:你好|早上好|下午好|晚上好|很高兴认识你)\b/u.test(focal.focalText)) return 'greeting';
  } else {
    if (/^(?:hi|hello|hey|good (?:morning|afternoon|evening)|nice to meet you)\b/i.test(s))
      return 'greeting';
  }

  return 'statement';
}

function capitalizeWord(w: string): string {
  if (!w) return '';
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/**
 * Fallback kontekstual lokal presisi: dipilih dari speech act kalimat AI penutup
 * + topik/pilihan yang diekstrak secara spesifik.
 * Menjamin kartu 1 · Singkat selalu menjawab pertanyaan/ajakan secara 100% nyambung.
 */
export function buildContextualFallbackCards(params: {
  aiText: string;
  targetLang: TargetLang;
  locale: LearnerLocale;
  lastUserText?: string;
  variationSeed?: number;
  excludeTexts?: string[];
}): BeginnerReplyCard[] {
  const rawAi = String(params.aiText || '');
  const th = params.locale === 'th';
  const variationSeed = Number(params.variationSeed || 0);

  // Special handler for proactive struggle diagnosis questions ("what part been tripping you up", "モヤモヤ", "头疼")
  if (
    /\b(tripping you up|struggl|confus|hardest part|messing you up|bothering you)\b/i.test(rawAi) ||
    /(?:モヤモヤ|苦手|難しい|つまず|ややこしい|引っかか)/u.test(rawAi) ||
    /(?:头疼|难懂|卡壳|搞混|最难)/u.test(rawAi)
  ) {
    if (params.targetLang === 'ja') {
      if (variationSeed % 2 === 1) {
        return [
          {
            id: 'ctx_struggle_ja_v2_1',
            tier: 'easy',
            badgeId: 'Singkat & Mudah',
            badgeTh: 'สั้นและง่าย',
            tierLabelId: '1 · Singkat',
            tierLabelTh: '1 · สั้นและง่าย',
            text: '動詞の活用と敬語の使い分けが一番難しいです。',
            pronunciation: 'Doushi no katsuyou to keigo no tsukaiwake ga ichiban muzukashii desu.',
            hintId: 'Konjugasi kata kerja dan penggunaan keigo yang paling sulit bagiku.',
            hintTh: 'การผันคำกริยาและการใช้คำสุภาพเป็นสิ่งที่ยากที่สุดสำหรับฉัน',
            meaningId: 'Konjugasi kata kerja dan penggunaan keigo yang paling sulit bagiku.',
            meaningTh: 'การผันคำกริยาและการใช้คำสุภาพเป็นสิ่งที่ยากที่สุดสำหรับฉัน',
            isRealtimeAi: false,
            isOfflineFallback: true,
          },
          {
            id: 'ctx_struggle_ja_v2_2',
            tier: 'mission',
            badgeId: 'Alami & Kontekstual',
            badgeTh: 'เป็นธรรมชาติ',
            tierLabelId: '2 · Alami',
            tierLabelTh: '2 · เป็นธรรมชาติ',
            text: '頭では分かっていても、早口で話されると聞き取れなくなります。',
            pronunciation: 'Atama de wa wakatte itemo, hayakuchi de hanasareru to kikitorenaku narimasu.',
            hintId: 'Di kepala paham, tapi kalau diajak bicara cepat aku jadi tidak bisa menangkap artinya.',
            hintTh: 'ในหัวเข้าใจนะ แต่พอพูดเร็วๆ ฉันฟังไม่ทันเลย',
            meaningId: 'Di kepala paham, tapi kalau diajak bicara cepat aku jadi tidak bisa menangkap artinya.',
            meaningTh: 'ในหัวเข้าใจนะ แต่พอพูดเร็วๆ ฉันฟังไม่ทันเลย',
            isRealtimeAi: false,
            isOfflineFallback: true,
          },
          {
            id: 'ctx_struggle_ja_v2_3',
            tier: 'rescue',
            badgeId: 'Jawab + Tanya Balik',
            badgeTh: 'ตอบและถามกลับ',
            tierLabelId: '3 · + Tanya Balik',
            tierLabelTh: '3 · + ถามกลับ',
            text: '言いたい単語がすぐに出てきません。ゆっくり話してもらえますか？',
            pronunciation: 'Iitai tango ga sugu ni dete kimasen. Yukkuri hanashite moraemasu ka?',
            hintId: 'Kata yang mau kuucapkan tidak langsung keluar. Bisakah bicara lebih pelan?',
            hintTh: 'คำที่อยากพูดยังนึกไม่ออกทันที ช่วยพูดช้าลงหน่อยได้ไหมครับ/ค่ะ?',
            meaningId: 'Kata yang mau kuucapkan tidak langsung keluar. Bisakah bicara lebih pelan?',
            meaningTh: 'คำที่อยากพูดยังนึกไม่ออกทันที ช่วยพูดช้าลงหน่อยได้ไหมครับ/ค่ะ?',
            isRealtimeAi: false,
            isOfflineFallback: true,
          },
        ];
      }
      return [
        {
          id: 'ctx_struggle_ja_1',
          tier: 'easy',
          badgeId: 'Singkat & Mudah',
          badgeTh: 'สั้นและง่าย',
          tierLabelId: '1 · Singkat',
          tierLabelTh: '1 · สั้นและง่าย',
          text: '助詞の「は」と「が」の使い分けが一番モヤモヤしています。',
          pronunciation: 'Joshi no "wa" to "ga" no tsukaiwake ga ichiban moyamoya shite imasu.',
          hintId: 'Perbedaan partikel "wa" dan "ga" yang paling bikin aku bingung.',
          hintTh: 'การใช้คำช่วย "wa" กับ "ga" คือสิ่งที่ฉันสับสนที่สุด',
          meaningId: 'Perbedaan partikel "wa" dan "ga" yang paling bikin aku bingung.',
          meaningTh: 'การใช้คำช่วย "wa" กับ "ga" คือสิ่งที่ฉันสับสนที่สุด',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
        {
          id: 'ctx_struggle_ja_2',
          tier: 'mission',
          badgeId: 'Alami & Kontekstual',
          badgeTh: 'เป็นธรรมชาติ',
          tierLabelId: '2 · Alami',
          tierLabelTh: '2 · เป็นธรรมชาติ',
          text: '正直、動詞のて形と過去形の活用をすぐ口に出すのがまだ難しいです。',
          pronunciation: 'Shoujiki, doushi no te-kei to kakokei no katsuyou o sugu kuchi ni dasu no ga mada muzukashii desu.',
          hintId: 'Jujur, konjugasi kata kerja bentuk Te dan bentuk lampau masih sulit langsung kuucapkan.',
          hintTh: 'พูดตามตรง การผันกริยารูป Te และรูปอดีตให้พูดออกมาได้ทันทียังยากอยู่',
          meaningId: 'Jujur, konjugasi kata kerja bentuk Te dan bentuk lampau masih sulit langsung kuucapkan.',
          meaningTh: 'พูดตามตรง การผันกริยารูป Te และรูปอดีตให้พูดออกมาได้ทันทียังยากอยู่',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
        {
          id: 'ctx_struggle_ja_3',
          tier: 'rescue',
          badgeId: 'Jawab + Tanya Balik',
          badgeTh: 'ตอบและถามกลับ',
          tierLabelId: '3 · + Tanya Balik',
          tierLabelTh: '3 · + ถามกลับ',
          text: '「に」と「で」の助詞でよく迷います。今すぐ一緒に練習できますか？',
          pronunciation: '"Ni" to "de" no joshi de yoku mayoimasu. Ima sugu issho ni renshuu dekimasu ka?',
          hintId: 'Aku sering bingung antara partikel "ni" dan "de". Bisa kita latih sekarang juga?',
          hintTh: 'ฉันมักจะสับสนระหว่างคำช่วย "ni" กับ "de" เราฝึกด้วยกันตอนนี้เลยได้ไหม?',
          meaningId: 'Aku sering bingung antara partikel "ni" dan "de". Bisa kita latih sekarang juga?',
          meaningTh: 'ฉันมักจะสับสนระหว่างคำช่วย "ni" กับ "de" เราฝึกด้วยกันตอนนี้เลยได้ไหม?',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
      ];
    }
    if (params.targetLang === 'zh') {
      if (variationSeed % 2 === 1) {
        return [
          {
            id: 'ctx_struggle_zh_v2_1',
            tier: 'easy',
            badgeId: 'Singkat & Mudah',
            badgeTh: 'สั้นและง่าย',
            tierLabelId: '1 · Singkat',
            tierLabelTh: '1 · สั้นและง่าย',
            text: '生词太多了，我经常记不住。',
            pronunciation: 'Shēngcí tài duō le, wǒ jīngcháng jì bù zhù.',
            hintId: 'Kosakata baru terlalu banyak, aku sering tidak ingat.',
            hintTh: 'คำศัพท์ใหม่เยอะมาก ฉันมักจำไม่ค่อยได้',
            meaningId: 'Kosakata baru terlalu banyak, aku sering tidak ingat.',
            meaningTh: 'คำศัพท์ใหม่เยอะมาก ฉันมักจำไม่ค่อยได้',
            isRealtimeAi: false,
            isOfflineFallback: true,
          },
          {
            id: 'ctx_struggle_zh_v2_2',
            tier: 'mission',
            badgeId: 'Alami & Kontekstual',
            badgeTh: 'เป็นธรรมชาติ',
            tierLabelId: '2 · Alami',
            tierLabelTh: '2 · เป็นธรรมชาติ',
            text: '听中国人说话语速太快，我有点反应不过来。',
            pronunciation: 'Tīng Zhōngguórén shuōhuà yǔsù tài kuài, wǒ yǒudiǎn fǎnyìng bù guòlái.',
            hintId: 'Mendengar orang Tiongkok bicara terlalu cepat, refleksku agak lambat.',
            hintTh: 'ฟังคนจีนพูดเร็วมาก ฉันตามไม่ค่อยทันเลย',
            meaningId: 'Mendengar orang Tiongkok bicara terlalu cepat, refleksku agak lambat.',
            meaningTh: 'ฟังคนจีนพูดเร็วมาก ฉันตามไม่ค่อยทันเลย',
            isRealtimeAi: false,
            isOfflineFallback: true,
          },
          {
            id: 'ctx_struggle_zh_v2_3',
            tier: 'rescue',
            badgeId: 'Jawab + Tanya Balik',
            badgeTh: 'ตอบและถามกลับ',
            tierLabelId: '3 · + Tanya Balik',
            tierLabelTh: '3 · + ถามกลับ',
            text: '我能听懂一点，但是不知道怎么回答。你能教我吗？',
            pronunciation: 'Wǒ néng tīng dǒng yīdiǎn, dànshì bù zhīdào zěnme huídá. Nǐ néng jiāo wǒ ma?',
            hintId: 'Aku paham sedikit tapi bingung bagaimana menjawabnya. Bisakah kamu ajari aku?',
            hintTh: 'ฉันฟังเข้าใจนิดหน่อยแต่ไม่รู้จะตอบยังไง ช่วยสอนฉันหน่อยได้ไหม?',
            meaningId: 'Aku paham sedikit tapi bingung bagaimana menjawabnya. Bisakah kamu ajari aku?',
            meaningTh: 'ฉันฟังเข้าใจนิดหน่อยแต่ไม่รู้จะตอบยังไง ช่วยสอนฉันหน่อยได้ไหม?',
            isRealtimeAi: false,
            isOfflineFallback: true,
          },
        ];
      }
      return [
        {
          id: 'ctx_struggle_zh_1',
          tier: 'easy',
          badgeId: 'Singkat & Mudah',
          badgeTh: 'สั้นและง่าย',
          tierLabelId: '1 · Singkat',
          tierLabelTh: '1 · สั้นและง่าย',
          text: '我最头疼的是四个声调和“了”的用法。',
          pronunciation: 'Wǒ zuì tóuténg de shì sì gè shēngdiào hé "le" de yòngfǎ.',
          hintId: 'Yang paling bikin aku pusing itu empat nada dan cara pakai partikel "le".',
          hintTh: 'สิ่งที่ฉันปวดหัวที่สุดคือวรรณยุกต์ทั้งสี่เสียงและการใช้ "le"',
          meaningId: 'Yang paling bikin aku pusing itu empat nada dan cara pakai partikel "le".',
          meaningTh: 'สิ่งที่ฉันปวดหัวที่สุดคือวรรณยุกต์ทั้งสี่เสียงและการใช้ "le"',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
        {
          id: 'ctx_struggle_zh_2',
          tier: 'mission',
          badgeId: 'Alami & Kontekstual',
          badgeTh: 'เป็นธรรมชาติ',
          tierLabelId: '2 · Alami',
          tierLabelTh: '2 · เป็นธรรมชาติ',
          text: '说实话，我经常把时间词放错位置，还容易用错量词。',
          pronunciation: 'Shuō shíhuà, wǒ jīngcháng bǎ shíjiāncí fàng cuò wèizhì, hái róngyì yòng cuò liàngcí.',
          hintId: 'Jujur, aku sering salah taruh posisi keterangan waktu dan salah pakai kata bantu bilangan.',
          hintTh: 'พูดตามตรง ฉันมักวางคำบอกเวลาผิดตำแหน่งและใช้ลักษณนามผิดบ่อยๆ',
          meaningId: 'Jujur, aku sering salah taruh posisi keterangan waktu dan salah pakai kata bantu bilangan.',
          meaningTh: 'พูดตามตรง ฉันมักวางคำบอกเวลาผิดตำแหน่งและใช้ลักษณนามผิดบ่อยๆ',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
        {
          id: 'ctx_struggle_zh_3',
          tier: 'rescue',
          badgeId: 'Jawab + Tanya Balik',
          badgeTh: 'ตอบและถามกลับ',
          tierLabelId: '3 · + Tanya Balik',
          tierLabelTh: '3 · + ถามกลับ',
          text: '“不”和“没”的区别老是搞混，你能带我练一下吗？',
          pronunciation: '"Bù" hé "méi" de qūbié lǎoshì gǎohùn, nǐ néng dài wǒ liàn yīxià ma?',
          hintId: 'Bedanya "bù" dan "méi" sering ketukar terus, bisa bantu latih aku sebentar?',
          hintTh: 'ฉันสับสนความแตกต่างระหว่าง "bù" กับ "méi" ตลอดเลย ช่วยพาฉันฝึกหน่อยได้ไหม?',
          meaningId: 'Bedanya "bù" dan "méi" sering ketukar terus, bisa bantu latih aku sebentar?',
          meaningTh: 'ฉันสับสนความแตกต่างระหว่าง "bù" กับ "méi" ตลอดเลย ช่วยพาฉันฝึกหน่อยได้ไหม?',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
      ];
    }
    if (variationSeed % 2 === 1) {
      return [
        {
          id: 'ctx_struggle_en_v2_1',
          tier: 'easy',
          badgeId: 'Singkat & Mudah',
          badgeTh: 'สั้นและง่าย',
          tierLabelId: '1 · Singkat',
          tierLabelTh: '1 · สั้นและง่าย',
          text: 'Vocabulary and word order are my biggest obstacles.',
          pronunciation: 'vokebyuleri end werd order ar mai bigest obstakels',
          hintId: th
            ? 'คำศัพท์และลำดับคำเป็นอุปสรรคที่ใหญ่ที่สุดของฉัน'
            : 'Kosakata dan urutan kata adalah rintangan terbesarku.',
          hintTh: 'คำศัพท์และลำดับคำเป็นอุปสรรคที่ใหญ่ที่สุดของฉัน',
          meaningId: th
            ? 'คำศัพท์และลำดับคำเป็นอุปสรรคที่ใหญ่ที่สุดของฉัน'
            : 'Kosakata dan urutan kata adalah rintangan terbesarku.',
          meaningTh: 'คำศัพท์และลำดับคำเป็นอุปสรรคที่ใหญ่ที่สุดของฉัน',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
        {
          id: 'ctx_struggle_en_v2_2',
          tier: 'mission',
          badgeId: 'Alami & Kontekstual',
          badgeTh: 'เป็นธรรมชาติ',
          tierLabelId: '2 · Alami',
          tierLabelTh: '2 · เป็นธรรมชาติ',
          text: 'I hesitate a lot when forming questions under pressure.',
          pronunciation: 'ai heziteit e lot wen forming kwescens ander presyer',
          hintId: th
            ? 'ฉันลังเลบ่อยมากเวลาสร้างประโยคคำถามตอนกดดัน'
            : 'Aku sering ragu-ragu saat menyusun pertanyaan di bawah tekanan.',
          hintTh: 'ฉันลังเลบ่อยมากเวลาสร้างประโยคคำถามตอนกดดัน',
          meaningId: th
            ? 'ฉันลังเลบ่อยมากเวลาสร้างประโยคคำถามตอนกดดัน'
            : 'Aku sering ragu-ragu saat menyusun pertanyaan di bawah tekanan.',
          meaningTh: 'ฉันลังเลบ่อยมากเวลาสร้างประโยคคำถามตอนกดดัน',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
        {
          id: 'ctx_struggle_en_v2_3',
          tier: 'rescue',
          badgeId: 'Jawab + Tanya Balik',
          badgeTh: 'ตอบและถามกลับ',
          tierLabelId: '3 · + Tanya Balik',
          tierLabelTh: '3 · + ถามกลับ',
          text: "I know the words in my head, but can't speak fast enough. Can you help me?",
          pronunciation: 'ai nou de werds in mai hed, bat kent spik fast inaf. ken yu help mi?',
          hintId: th
            ? 'ฉันรู้คำศัพท์ในหัวแต่ยังพูดไม่เร็วพอ คุณช่วยฝึกให้ฉันหน่อยได้ไหม?'
            : 'Aku tahu kata-katanya di kepala tapi belum bisa bicara cepat. Bisa bantu latih aku?',
          hintTh: 'ฉันรู้คำศัพท์ในหัวแต่ยังพูดไม่เร็วพอ คุณช่วยฝึกให้ฉันหน่อยได้ไหม?',
          meaningId: th
            ? 'ฉันรู้คำศัพท์ในหัวแต่ยังพูดไม่เร็วพอ คุณช่วยฝึกให้ฉันหน่อยได้ไหม?'
            : 'Aku tahu kata-katanya di kepala tapi belum bisa bicara cepat. Bisa bantu latih aku?',
          meaningTh: 'ฉันรู้คำศัพท์ในหัวแต่ยังพูดไม่เร็วพอ คุณช่วยฝึกให้ฉันหน่อยได้ไหม?',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
      ];
    }
    return [
      {
        id: 'ctx_struggle_en_1',
        tier: 'easy',
        badgeId: 'Singkat & Mudah',
        badgeTh: 'สั้นและง่าย',
        tierLabelId: '1 · Singkat',
        tierLabelTh: '1 · สั้นและง่าย',
        text: 'Honestly, past tense and prepositions trip me up the most.',
        pronunciation: 'onestli, past tens end prepozisyens trip mi ap de moust',
        hintId: th
          ? 'พูดตามตรง รูปอดีตและคำบุพบททำให้ฉันสับสนที่สุด'
          : 'Jujur, past tense dan preposisi yang paling sering bikin aku kepleset.',
        hintTh: 'พูดตามตรง รูปอดีตและคำบุพบททำให้ฉันสับสนที่สุด',
        meaningId: th
          ? 'พูดตามตรง รูปอดีตและคำบุพบททำให้ฉันสับสนที่สุด'
          : 'Jujur, past tense dan preposisi yang paling sering bikin aku kepleset.',
        meaningTh: 'พูดตามตรง รูปอดีตและคำบุพบททำให้ฉันสับสนที่สุด',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
      {
        id: 'ctx_struggle_en_2',
        tier: 'mission',
        badgeId: 'Alami & Kontekstual',
        badgeTh: 'เป็นธรรมชาติ',
        tierLabelId: '2 · Alami',
        tierLabelTh: '2 · เป็นธรรมชาติ',
        text: 'For real, I always mix up when to use "am/is/are" versus action verbs.',
        pronunciation: 'for ril, ai olweiz miks ap wen tu yuz em iz ar verses eksyen verbs',
        hintId: th
          ? 'เอาจริงๆ ฉันมักสับสนว่าเมื่อไหร่ควรใช้ am/is/are กับกริยาแท้'
          : 'Serius, aku sering ketukar kapan harus pakai "am/is/are" lawan kata kerja langsung.',
        hintTh: 'เอาจริงๆ ฉันมักสับสนว่าเมื่อไหร่ควรใช้ am/is/are กับกริยาแท้',
        meaningId: th
          ? 'เอาจริงๆ ฉันมักสับสนว่าเมื่อไหร่ควรใช้ am/is/are กับกริยาแท้'
          : 'Serius, aku sering ketukar kapan harus pakai "am/is/are" lawan kata kerja langsung.',
        meaningTh: 'เอาจริงๆ ฉันมักสับสนว่าเมื่อไหร่ควรใช้ am/is/are กับกริยาแท้',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
      {
        id: 'ctx_struggle_en_3',
        tier: 'rescue',
        badgeId: 'Jawab + Tanya Balik',
        badgeTh: 'ตอบและถามกลับ',
        tierLabelId: '3 · + Tanya Balik',
        tierLabelTh: '3 · + ถามกลับ',
        text: 'Grammar tenses mess me up when I speak fast. Can we drill that right now?',
        pronunciation: 'gremer tenses mes mi ap wen ai spik fast. ken wi dril det rait nau?',
        hintId: th
          ? 'เทนส์ไวยากรณ์ทำให้ฉันรวนเวลาพูดเร็วๆ เราฝึกเรื่องนี้กันตอนนี้เลยได้ไหม?'
          : 'Tenses grammar bikin aku kacau pas ngomong cepat. Bisa kita latih itu sekarang?',
        hintTh: 'เทนส์ไวยากรณ์ทำให้ฉันรวนเวลาพูดเร็วๆ เราฝึกเรื่องนี้กันตอนนี้เลยได้ไหม?',
        meaningId: th
          ? 'เทนส์ไวยากรณ์ทำให้ฉันรวนเวลาพูดเร็วๆ เราฝึกเรื่องนี้กันตอนนี้เลยได้ไหม?'
          : 'Tenses grammar bikin aku kacau pas ngomong cepat. Bisa kita latih itu sekarang?',
        meaningTh: 'เทนส์ไวยากรณ์ทำให้ฉันรวนเวลาพูดเร็วๆ เราฝึกเรื่องนี้กันตอนนี้เลยได้ไหม?',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
    ];
  }

  // Special handler when AI opens the interactive learning popup / explains a grammar rule or particle
  if (
    /\b(popped up|on your screen|writing drill|latihan.*layar|papan tulis|partikel)\b/i.test(rawAi) ||
    /(?:画面に.*カード|練習.*画面|書いてみて)/u.test(rawAi) ||
    /(?:屏幕上|练习卡片|试着写|的用法)/u.test(rawAi)
  ) {
    if (params.targetLang === 'zh') {
      return [
        {
          id: 'ctx_wb_zh_1',
          tier: 'easy',
          badgeId: 'Singkat & Mudah',
          badgeTh: 'สั้นและง่าย',
          tierLabelId: '1 · Singkat',
          tierLabelTh: '1 · สั้นและง่าย',
          text: '好的，我现在就试着造一个句子！',
          pronunciation: 'Hǎo de, wǒ xiànzài jiù shìzhe zào yī gè jùzi!',
          hintId: 'Baik, aku coba buat satu kalimat sekarang juga!',
          hintTh: 'โอเค ฉันจะลองแต่งประโยคดูเดี๋ยวนี้เลย!',
          meaningId: 'Baik, aku coba buat satu kalimat sekarang juga!',
          meaningTh: 'โอเค ฉันจะลองแต่งประโยคดูเดี๋ยวนี้เลย!',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
        {
          id: 'ctx_wb_zh_2',
          tier: 'mission',
          badgeId: 'Alami & Kontekstual',
          badgeTh: 'เป็นธรรมชาติ',
          tierLabelId: '2 · Alami',
          tierLabelTh: '2 · เป็นธรรมชาติ',
          text: '我看懂屏幕上的规则了，比如：这是我的中文书。',
          pronunciation: 'Wǒ kàn dǒng píngmù shàng de guīzé le, bǐrú: zhè shì wǒ de Zhōngwén shū.',
          hintId: 'Aku sudah paham aturan di layar, misalnya: ini adalah buku bahasa Mandarinku.',
          hintTh: 'ฉันเข้าใจกฎบนหน้าจอแล้ว เช่น นี่คือหนังสือภาษาจีนของฉัน',
          meaningId: 'Aku sudah paham aturan di layar, misalnya: ini adalah buku bahasa Mandarinku.',
          meaningTh: 'ฉันเข้าใจกฎบนหน้าจอแล้ว เช่น นี่คือหนังสือภาษาจีนของฉัน',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
        {
          id: 'ctx_wb_zh_3',
          tier: 'rescue',
          badgeId: 'Jawab + Tanya Balik',
          badgeTh: 'ตอบและถามกลับ',
          tierLabelId: '3 · + Tanya Balik',
          tierLabelTh: '3 · + ถามกลับ',
          text: '原来是这样用的！你觉得我刚才的发音标准吗？',
          pronunciation: 'Yuánlái shì zhèyàng yòng de! Nǐ juéde wǒ gāngcái de fāyīn biāozhǔn ma?',
          hintId: 'Ternyata begini cara pakainya! Menurutmu pelafalanku barusan sudah tepat?',
          hintTh: 'ใช้แบบนี้เองเหรอ! คุณคิดว่าการออกเสียงของฉันเมื่อกี้ชัดเจนไหม?',
          meaningId: 'Ternyata begini cara pakainya! Menurutmu pelafalanku barusan sudah tepat?',
          meaningTh: 'ใช้แบบนี้เองเหรอ! คุณคิดว่าการออกเสียงของฉันเมื่อกี้ชัดเจนไหม?',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
      ];
    }
    if (params.targetLang === 'ja') {
      return [
        {
          id: 'ctx_wb_ja_1',
          tier: 'easy',
          badgeId: 'Singkat & Mudah',
          badgeTh: 'สั้นและง่าย',
          tierLabelId: '1 · Singkat',
          tierLabelTh: '1 · สั้นและง่าย',
          text: 'わかりました、今すぐ文を作ってみます！',
          pronunciation: 'Wakarimashita, ima sugu bun o tsukutte mimasu!',
          hintId: 'Mengerti, aku coba buat kalimatnya sekarang juga!',
          hintTh: 'เข้าใจแล้ว ฉันจะลองแต่งประโยคดูเดี๋ยวนี้เลย!',
          meaningId: 'Mengerti, aku coba buat kalimatnya sekarang juga!',
          meaningTh: 'เข้าใจแล้ว ฉันจะลองแต่งประโยคดูเดี๋ยวนี้เลย!',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
        {
          id: 'ctx_wb_ja_2',
          tier: 'mission',
          badgeId: 'Alami & Kontekstual',
          badgeTh: 'เป็นธรรมชาติ',
          tierLabelId: '2 · Alami',
          tierLabelTh: '2 · เป็นธรรมชาติ',
          text: '画面の解説でスッキリ分かりました、練習してみますね。',
          pronunciation: 'Gamen no kaisetsu de sukkiri wakarimashita, renshuu shite mimasu ne.',
          hintId: 'Penjelasan di layar bikin langsung paham, aku coba latihannya ya.',
          hintTh: 'คำอธิบายบนหน้าจอทำให้เข้าใจชัดเจนเลย เดี๋ยวลองฝึกดูนะ',
          meaningId: 'Penjelasan di layar bikin langsung paham, aku coba latihannya ya.',
          meaningTh: 'คำอธิบายบนหน้าจอทำให้เข้าใจชัดเจนเลย เดี๋ยวลองฝึกดูนะ',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
        {
          id: 'ctx_wb_ja_3',
          tier: 'rescue',
          badgeId: 'Jawab + Tanya Balik',
          badgeTh: 'ตอบและถามกลับ',
          tierLabelId: '3 · + Tanya Balik',
          tierLabelTh: '3 · + ถามกลับ',
          text: 'なるほど、そういう使い分けなんですね！もう一つ例文を教えてくれますか？',
          pronunciation: 'Naruhodo, sou iu tsukaiwake nan desu ne! Mou hitotsu reibun o oshiete kuremasu ka?',
          hintId: 'Begitu toh perbedaannya! Bisa kasih satu contoh kalimat lagi?',
          hintTh: 'อ๋อ แยกใช้อย่างนี้นี่เอง! ช่วยยกตัวอย่างประโยคอีกสักอันได้ไหม?',
          meaningId: 'Begitu toh perbedaannya! Bisa kasih satu contoh kalimat lagi?',
          meaningTh: 'อ๋อ แยกใช้อย่างนี้นี่เอง! ช่วยยกตัวอย่างประโยคอีกสักอันได้ไหม?',
          isRealtimeAi: false,
          isOfflineFallback: true,
        },
      ];
    }
    return [
      {
        id: 'ctx_wb_en_1',
        tier: 'easy',
        badgeId: 'Singkat & Mudah',
        badgeTh: 'สั้นและง่าย',
        tierLabelId: '1 · Singkat',
        tierLabelTh: '1 · สั้นและง่าย',
        text: 'Got it, let me try writing a sentence right now!',
        pronunciation: 'got it, let mi trai raiting e sentens rait nau!',
        hintId: 'Mengerti, coba aku tulis kalimatnya sekarang!',
        hintTh: 'เข้าใจแล้ว ขอฉันลองเขียนประโยคดูเดี๋ยวนี้เลย!',
        meaningId: 'Mengerti, coba aku tulis kalimatnya sekarang!',
        meaningTh: 'เข้าใจแล้ว ขอฉันลองเขียนประโยคดูเดี๋ยวนี้เลย!',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
      {
        id: 'ctx_wb_en_2',
        tier: 'mission',
        badgeId: 'Alami & Kontekstual',
        badgeTh: 'เป็นธรรมชาติ',
        tierLabelId: '2 · Alami',
        tierLabelTh: '2 · เป็นธรรมชาติ',
        text: 'The formula on screen makes total sense, I see the difference now.',
        pronunciation: 'de formula on skrin meiks toutal sens, ai si de diferens nau',
        hintId: 'Rumus di layar masuk akal banget, sekarang aku paham bedanya.',
        hintTh: 'สูตรบนหน้าจอเข้าใจง่ายมาก ตอนนี้ฉันเห็นความแตกต่างแล้ว',
        meaningId: 'Rumus di layar masuk akal banget, sekarang aku paham bedanya.',
        meaningTh: 'สูตรบนหน้าจอเข้าใจง่ายมาก ตอนนี้ฉันเห็นความแตกต่างแล้ว',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
      {
        id: 'ctx_wb_en_3',
        tier: 'rescue',
        badgeId: 'Jawab + Tanya Balik',
        badgeTh: 'ตอบและถามกลับ',
        tierLabelId: '3 · + Tanya Balik',
        tierLabelTh: '3 · + ถามกลับ',
        text: 'That clears it up! Can you give me one more situation to test it?',
        pronunciation: 'det klirs it ap! ken yu giv mi wan mor sicuesyen tu test it?',
        hintId: 'Itu bikin jelas! Bisa kasih satu situasi lagi buat mengujinya?',
        hintTh: 'ชัดเจนเลย! ช่วยยกอีกสักสถานการณ์ให้ฉันลองทดสอบหน่อยได้ไหม?',
        meaningId: 'Itu bikin jelas! Bisa kasih satu situasi lagi buat mengujinya?',
        meaningTh: 'ชัดเจนเลย! ช่วยยกอีกสักสถานการณ์ให้ฉันลองทดสอบหน่อยได้ไหม?',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
    ];
  }

  const focal = extractFocalClause(params.aiText || '', params.targetLang);
  const act = detectAiIntent(params.aiText || '', params.targetLang);
  const topic = focal.extractedTopic || '';
  const optA = focal.choiceOptionA ? capitalizeWord(focal.choiceOptionA) : '';
  const optB = focal.choiceOptionB ? capitalizeWord(focal.choiceOptionB) : '';
  const chosenOpt = variationSeed % 2 === 1 && optB ? optB : optA;
  const echo = focal.echoCorrectionTarget || '';

  type CardRow = [string, string, string, string]; // [text, pronunciation, hintId, hintTh]
  type Tpl = { easy: CardRow; mission: CardRow; rescue: CardRow };
  const userEcho = (params.lastUserText || '').trim();

  const EN: Record<CopilotSpeechAct, Tpl> = {
    echo_redemption: {
      easy: [echo, echo.toLowerCase(), `Ulangi: "${echo}"`, `พูดตาม: "${echo}"`],
      mission: [`${echo}, got it.`, `${echo.toLowerCase()}, got it`, `Mengerti: "${echo}"`, `เข้าใจแล้ว: "${echo}"`],
      rescue: [`${echo}. Did I say that right?`, `${echo.toLowerCase()}. did ai sei det rait?`, `"${echo}". Apakah pengucapanku sudah tepat?`, `"${echo}". ฉันออกเสียงถูกต้องไหม?`],
    },
    clarification_repeat: {
      easy: [
        userEcho || "I said I'm practicing my English with you!",
        userEcho ? userEcho.toLowerCase() : "ai sed aim praktising mai ingglis wid yu",
        userEcho ? `Ulangi: "${userEcho}"` : "Kukatakan aku lagi latihan bahasa Inggris!",
        userEcho ? `พูดซ้ำ: "${userEcho}"` : "ฉันบอกว่ากำลังฝึกภาษาอังกฤษอยู่!",
      ],
      mission: [
        userEcho ? `Sorry about that, I said: "${userEcho}".` : "Sorry about that! My connection glitched for a moment.",
        userEcho ? `sori abaut det, ai sed: "${userEcho.toLowerCase()}".` : "sori abaut det! mai koneksyen glichd for e moument.",
        userEcho ? `Maaf ya, tadi kukatakan: "${userEcho}".` : "Maaf ya! Koneksiku tadi sempat terputus sebentar.",
        userEcho ? `ขอโทษทีนะ ฉันบอกว่า: "${userEcho}"` : "ขอโทษทีนะ สัญญาณของฉันสะดุดไปนิดหน่อย",
      ],
      rescue: [
        "Can you hear me clearly now? Let's keep going!",
        "ken yu hir mi klirli nau? lets kip gouing!",
        "Apakah sekarang sudah terdengar jelas? Ayo kita lanjut!",
        "ตอนนี้คุณได้ยินฉันชัดเจนไหม? มาคุยกันต่อนะ!",
      ],
    },
    wh_what_action: {
      easy: [
        "I'm just relaxing at home right now.",
        "aim jast rileksing et houm rait nau",
        "Aku lagi santai di rumah sekarang.",
        "ตอนนี้ฉันแค่พักผ่อนอยู่ที่บ้านครับ/ค่ะ",
      ],
      mission: [
        "I'm watching a good show and chilling out today.",
        "aim wocing e gud syou end ciling aut tudei",
        "Hari ini aku lagi nonton acara seru dan bersantai.",
        "วันนี้ฉันกำลังดูรายการสนุกๆ และพักผ่อนอยู่",
      ],
      rescue: [
        "Just resting at home. What about you, what are you doing?",
        "jast resting et houm. wat abaut yu, wat ar yu duing?",
        "Lagi santai di rumah. Kalau kamu lagi ngapain?",
        "แค่พักผ่อนอยู่บ้าน แล้วคุณล่ะครับ/ค่ะ กำลังทำอะไรอยู่?",
      ],
    },
    invitation: {
      easy: ['Sure, I would love to!', 'syur, ai wud lav tu!', 'Tentu, aku mau banget!', 'ได้เลย ฉันอยากไปมาก!'],
      mission: ["That sounds great, let's do it this week!", 'det saunds greit, lets du it dis wik!', 'Kedengarannya bagus, ayo minggu ini!', 'ฟังดูดีมาก ไปสัปดาห์นี้กันเถอะ!'],
      rescue: ["I'd love to join! What time works best for you?", 'aid lav tu join! wat taim werks best for yu?', 'Aku mau ikut! Jam berapa yang cocok untukmu?', 'ฉันอยากไปด้วยจัง! คุณสะดวกกี่โมงดี?'],
    },
    choice: {
      easy: [chosenOpt ? `${chosenOpt}, please.` : 'The first option, please.', chosenOpt ? `${chosenOpt.toLowerCase()}, pliz` : 'de ferst opsyen, pliz', chosenOpt ? `${chosenOpt}, tolong.` : 'Pilihan yang pertama saja.', chosenOpt ? `ขอเป็น${chosenOpt}ครับ/ค่ะ` : 'ขอตัวเลือกแรกครับ/ค่ะ'],
      mission: [chosenOpt ? `I'd prefer ${chosenOpt}, because I really like the taste.` : "I'd prefer the first option, actually.", chosenOpt ? `aid prifer ${chosenOpt.toLowerCase()}, bikoz ai rili laik de teist` : 'aid prifer de ferst opsyen, ekcuali', chosenOpt ? `Aku lebih pilih ${chosenOpt}, karena suka rasanya.` : 'Aku lebih pilih opsi yang pertama sih.', chosenOpt ? `ฉันชอบ${chosenOpt}มากกว่า เพราะชอบรสชาตินี้` : 'ฉันขอเลือกอันแรกมากกว่านะ'],
      rescue: [chosenOpt ? `I'll go with ${chosenOpt}. Which one do you recommend?` : "I'm not sure. Which one do you recommend?", chosenOpt ? `ail gou wid ${chosenOpt.toLowerCase()}. wich wan du yu rekomand?` : 'aim not syur. wich wan du yu rekomand?', chosenOpt ? `Aku pilih ${chosenOpt}. Menurutmu mana yang enak?` : 'Aku belum yakin. Menurutmu mana yang kamu rekomendasikan?', chosenOpt ? `ฉันเลือก${chosenOpt}นะ แล้วคุณแนะนำอันไหนล่ะ?` : 'ฉันยังไม่แน่ใจ คุณแนะนำอันไหนเหรอ?'],
    },
    wh_how_long: {
      easy: ['For about two years now.', 'for abaut tu yirs nau', 'Sudah sekitar dua tahun sekarang.', 'ประมาณสองปีแล้วครับ/ค่ะ'],
      mission: ["I've been working on it for about two years now.", 'aiv bin werking on it for abaut tu yirs nau', 'Aku sudah mengerjakannya sekitar dua tahun.', 'ฉันทำสิ่งนี้มาประมาณสองปีแล้ว'],
      rescue: ['About two years. How long have you been doing it?', 'abaut tu yirs. hau long hev yu bin duing it?', 'Sekitar dua tahun. Kamu sendiri sudah berapa lama?', 'ประมาณสองปี แล้วคุณทำมานานแค่ไหนแล้วเหรอ?'],
    },
    wh_how_often: {
      easy: ['Usually two or three times a week.', 'yuzuali tu or tri taims e wik', 'Biasanya dua atau tiga kali seminggu.', 'ปกติสองถึงสามครั้งต่อสัปดาห์ครับ/ค่ะ'],
      mission: ['I try to do it two or three times a week.', 'ai trai tu du it tu or tri taims e wik', 'Aku usahakan dua atau tiga kali dalam seminggu.', 'ฉันพยายามทำให้ได้สองถึงสามครั้งต่อสัปดาห์'],
      rescue: ['Two or three times a week. How often do you go?', 'tu or tri taims e wik. hau often du yu gou?', 'Dua atau tiga kali seminggu. Kamu sendiri seberapa sering?', 'สองถึงสามครั้งต่อสัปดาห์ แล้วคุณไปบ่อยแค่ไหนเหรอ?'],
    },
    wh_how_many: {
      easy: ['Just a couple of them, actually.', 'jast e kapel of dem, ekcuali', 'Hanya beberapa saja sebenarnya.', 'แค่สองสามอันเท่านั้นเองครับ/ค่ะ'],
      mission: ['Usually around two or three items is enough.', 'yuzuali eraund tu or tri aitems iz inaf', 'Biasanya sekitar dua atau tiga barang sudah cukup.', 'ปกติประมาณสองถึงสามอย่างก็พอแล้ว'],
      rescue: ['Just two or three. How many do you usually need?', 'jast tu or tri. hau meni du yu yuzuali nid?', 'Cuma dua atau tiga. Kamu biasanya butuh berapa banyak?', 'แค่สองหรือสามอัน แล้วปกติคุณต้องใช้เท่าไหร่เหรอ?'],
    },
    wh_how_feel_day: {
      easy: ['My day was pretty good, thanks!', 'mai dei waz priti gud, teng-ks!', 'Hariku menyenangkan, terima kasih!', 'วันนี้ของฉันราบรื่นดีมาก ขอบคุณนะ!'],
      mission: ["It's been a busy but very productive day.", 'its bin e bizi bat veri produktiv dei', 'Hari yang sibuk tapi sangat produktif.', 'เป็นวันที่ยุ่งแต่มีประสิทธิภาพมากเลย'],
      rescue: ['Pretty good so far! How has your day been?', 'priti gud sou far! hau hez yor dei bin?', 'Sejauh ini baik! Bagaimana dengan harimu?', 'จนถึงตอนนี้ก็ดีมากเลย! แล้ววันของคุณเป็นยังไงบ้าง?'],
    },
    wh_how_method: {
      easy: ["I usually take the train, it's very convenient.", 'ai yuzuali teik de trein, its veri konvinient', 'Aku biasanya naik kereta, sangat praktis.', 'ฉันมักจะนั่งรถไฟไป สะดวกมากเลย'],
      mission: ['I take the public train, which takes about twenty minutes.', 'ai teik de pablik trein, wich teiks abaut twenti minits', 'Aku naik kereta umum, sekitar dua puluh menit.', 'ฉันนั่งรถไฟ ใช้เวลาประมาณยี่สิบนาที'],
      rescue: ['I usually go by train. How do you usually get there?', 'ai yuzuali gou bai trein. hau du yu yuzuali get der?', 'Biasanya naik kereta. Kamu biasanya ke sana naik apa?', 'ปกติฉันนั่งรถไฟ แล้วคุณเดินทางไปที่นั่นยังไงเหรอ?'],
    },
    wh_where_origin: {
      easy: ["I'm from Indonesia.", 'aim from indonisia', 'Aku dari Indonesia.', 'ฉันมาจากประเทศอินโดนีเซีย'],
      mission: ["I was born and raised in Indonesia.", 'ai waz born end reizd in indonisia', 'Aku lahir dan dibesarkan di Indonesia.', 'ฉันเกิดและเติบโตที่ประเทศอินโดนีเซีย'],
      rescue: ["I'm from Indonesia. Have you ever visited there?", 'aim from indonisia. hev yu ever vizited der?', 'Aku dari Indonesia. Apakah kamu pernah berkunjung ke sana?', 'ฉันมาจากอินโดนีเซีย คุณเคยไปเที่ยวที่นั่นไหม?'],
    },
    wh_where_action: {
      easy: ['At a quiet cafe near my house.', 'et e kwaiet kafei nir mai haus', 'Di kafe yang tenang dekat rumahku.', 'ที่คาเฟ่เงียบๆ แถวบ้านฉัน'],
      mission: ['I usually go to a cozy place near the city center.', 'ai yuzuali gou tu e kouzi pleis nir de siti senter', 'Biasanya aku ke tempat nyaman dekat pusat kota.', 'ปกติฉันชอบไปร้านบรรยากาศสบายๆ แถวใจกลางเมือง'],
      rescue: ['Near my neighborhood. Where do you usually like to go?', 'nir mai neiborhud. wer du yu yuzuali laik tu gou?', 'Dekat lingkunganku. Kamu sendiri biasanya suka ke mana?', 'แถวๆ บ้านฉัน แล้วปกติคุณชอบไปที่ไหนเหรอ?'],
    },
    wh_what_food: {
      easy: ['Hot coffee, please.', 'hot kofi, pliz', 'Kopi panas, tolong.', 'ขอกาแฟร้อนครับ/ค่ะ'],
      mission: ["I'd like an iced latte with less sugar, please.", 'aid laik en aist late wid les syugar, pliz', 'Saya mau es latte sedikit gula, tolong.', 'ขอลาเต้เย็นหวานน้อยครับ/ค่ะ'],
      rescue: ["I'll have an iced latte. What drink do you recommend?", 'ail hev en aist late. wat drink du yu rekomand?', 'Aku pesan es latte. Minuman apa yang kamu rekomendasikan?', 'ฉันเอาลาเต้เย็น แล้วคุณแนะนำเครื่องดื่มอะไรเหรอ?'],
    },
    wh_what_talk: {
      easy: ["I'd like to talk about my daily routine.", 'aid laik tu tok abaut mai deili rutin', 'Aku ingin ngobrol tentang rutinitasku sehari-hari.', 'ฉันอยากคุยเรื่องกิจวัตรประจำวันของฉันครับ/ค่ะ'],
      mission: ['Actually, I had a really busy week and want to practice talking about it.', 'ekcuali, ai hed e rili bizi wik end wont tu praktis toking abaut it', 'Sebenarnya mingguku sangat padat dan aku ingin latihan menceritakannya.', 'ความจริงสัปดาห์นี้ฉันยุ่งมาก เลยอยากฝึกเล่าเรื่องนี้ดู'],
      rescue: ["Let's talk about weekend plans! What do you usually do on weekends?", 'lets tok abaut wikend plenz! wat du yu yuzuali du on wikendz?', 'Ayo bahas rencana akhir pekan! Kamu biasanya ngapain saat akhir pekan?', 'มาคุยเรื่องแผนวันหยุดกันเถอะ! ปกติวันหยุดสุดสัปดาห์คุณทำอะไรเหรอ?'],
    },
    wh_what_general: {
      easy: [topic ? `I really enjoy ${topic}.` : 'I enjoy learning new things.', topic ? `ai rili enjoy ${topic}` : 'ai enjoy lerning nyu tings', topic ? `Aku sangat menikmati ${topic}.` : 'Aku suka belajar hal-hal baru.', topic ? `ฉันชอบ${topic}มากเลย` : 'ฉันชอบเรียนรู้สิ่งใหม่ๆ'],
      mission: [topic ? `My favorite thing is ${topic}, because it relaxes me.` : 'I love practicing languages because it opens my horizons.', topic ? `mai feivrit ting iz ${topic}, bikoz it rilekses mi` : 'ai lav praktising lenggwijez bikoz it opens mai horaizons', topic ? `Hal favoritku adalah ${topic}, karena bikin rileks.` : 'Aku suka latihan bahasa karena membuka wawasan.', topic ? `สิ่งที่ฉันชอบที่สุดคือ${topic} เพราะทำให้ผ่อนคลาย` : 'ฉันชอบฝึกภาษาเพราะช่วยเปิดโลกทัศน์'],
      rescue: ["That's an interesting topic. What do you think about it?", 'dets en intresting topik. wat du yu tink abaut it?', 'Topik yang menarik. Bagaimana menurutmu tentang hal itu?', 'หัวข้อน่าสนใจมาก แล้วคุณคิดเห็นอย่างไรเกี่ยวกับเรื่องนี้?'],
    },
    wh_why: {
      easy: ['Because it helps me improve my speaking skills.', 'bikoz it helps mi impruv mai spiking skilz', 'Karena itu membantuku meningkatkan kemampuan bicara.', 'เพราะช่วยให้ฉันพัฒนาทักษะการพูดได้ดีขึ้น'],
      mission: ['Because I want to communicate fluently with people around the world.', 'bikoz ai wont tu komyunikeit fluently wid pipel eraund de werld', 'Karena aku ingin berkomunikasi lancar dengan orang dari berbagai negara.', 'เพราะฉันอยากสื่อสารกับผู้คนทั่วโลกได้อย่างคล่องแคล่ว'],
      rescue: ["Because it's very useful for my future. Why do you ask?", 'bikoz its veri yusful for mai fyucur. wai du yu ask?', 'Karena sangat berguna untuk masa depanku. Kenapa kamu bertanya?', 'เพราะมันมีประโยชน์มากสำหรับอนาคตของฉัน ทำไมคุณถึงถามเหรอ?'],
    },
    wh_when: {
      easy: ['Usually in the evening after work.', 'yuzuali in di ivning efter werk', 'Biasanya di malam hari sepulang kerja.', 'ปกติช่วงเย็นหลังเลิกงานครับ/ค่ะ'],
      mission: ['I prefer doing it on weekends when I have more free time.', 'ai prifer duing it on wikendz wen ai hev mor fri taim', 'Aku lebih suka akhir pekan saat punya lebih banyak waktu luang.', 'ฉันชอบทำช่วงวันหยุดสุดสัปดาห์เพราะมีเวลาว่างมากกว่า'],
      rescue: ['Mostly on weekends. When is the best time for you?', 'moustli on wikendz. wen iz de best taim for yu?', 'Kebanyakan di akhir pekan. Kapan waktu terbaik buatmu?', 'ส่วนใหญ่จะเป็นช่วงวันหยุด แล้วเวลาไหนสะดวกที่สุดสำหรับคุณเหรอ?'],
    },
    wh_who: {
      easy: ['Usually with my friends or classmates.', 'yuzuali wid mai frendz or klasmeits', 'Biasanya bersama teman atau rekan sekelas.', 'ปกติไปกับเพื่อนหรือเพื่อนร่วมชั้นครับ/ค่ะ'],
      mission: ['I often go with my close friends from school.', 'ai often gou wid mai klous frendz from skul', 'Aku sering pergi bersama teman dekat dari sekolah.', 'ฉันมักจะไปกับเพื่อนสนิทที่โรงเรียน'],
      rescue: ['With my best friend. Who do you usually hang out with?', 'wid mai best frend. hu du yu yuzuali heng aut wid?', 'Bersama sahabatku. Kamu sendiri biasanya berkumpul dengan siapa?', 'ไปกับเพื่อนสนิท แล้วปกติคุณไปเที่ยวกับใครเหรอ?'],
    },
    yesno_are: {
      easy: ['Yes, I am.', 'yes, ai em', 'Ya, betul.', 'ใช่ครับ/ค่ะ'],
      mission: ['Yes, definitely. Everything is going smoothly.', 'yes, definitli. evriting iz gouing smudli', 'Ya, tentu saja. Semuanya berjalan lancar.', 'ใช่แน่นอน ทุกอย่างกำลังดำเนินไปด้วยดี'],
      rescue: ['Yes, I am. Are you having a good day too?', 'yes, ai em. ar yu heving e gud dei tu?', 'Ya, betul. Apakah harimu juga menyenangkan?', 'ใช่เลย วันนี้ของคุณโอเคดีเหมือนกันไหม?'],
    },
    yesno_can: {
      easy: ['Yes, I can do that.', 'yes, ai ken du det', 'Ya, saya bisa melakukannya.', 'ใช่ ฉันทำได้ครับ/ค่ะ'],
      mission: ['Yes, I have some practice with that.', 'yes, ai hev sam praktis wid det', 'Ya, saya sudah beberapa kali melatihnya.', 'ใช่ ฉันเคยฝึกทำเรื่องนี้มาบ้างแล้ว'],
      rescue: ['I think I can! Can you give me a quick tip?', 'ai tink ai ken! ken yu giv mi e kwik tip?', 'Kurasa bisa! Bisakah kamu beri sedikit tips?', 'คิดว่าทำได้นะ! คุณช่วยให้คำแนะนำสั้นๆ ได้ไหม?'],
    },
    yesno_have: {
      easy: ['Yes, I have tried it before.', 'yes, ai hev traid it bifor', 'Ya, saya sudah pernah mencobanya.', 'ใช่ ฉันเคยลองมาก่อนแล้วครับ/ค่ะ'],
      mission: ['Yes, I tried it a while ago and really enjoyed it.', 'yes, ai traid it e wail egou end rili enjoyd it', 'Ya, saya mencobanya beberapa waktu lalu dan sangat menikmatinya.', 'ใช่ ฉันเคยลองทำเมื่อไม่นานมานี้และชอบมากเลย'],
      rescue: ['Yes, I have. Have you had a chance to try it?', 'yes, ai hev. hev yu hed e chens tu trai it?', 'Ya, sudah. Apakah kamu sudah sempat mencobanya?', 'ใช่ เคยแล้ว แล้วคุณมีโอกาสได้ลองหรือยัง?'],
    },
    yesno_did: {
      easy: ['Yes, I did that recently.', 'yes, ai did det risentli', 'Ya, saya melakukannya baru-baru ini.', 'ใช่ ฉันเพิ่งทำสิ่งนั้นไปเมื่อเร็วๆ นี้'],
      mission: ['Yes, I went there last week and it was great.', 'yes, ai went der last wik end it waz greit', 'Ya, saya pergi ke sana minggu lalu dan seru sekali.', 'ใช่ ฉันเพิ่งไปที่นั่นเมื่อสัปดาห์ก่อน และมันยอดเยี่ยมมาก'],
      rescue: ['Yes, I did! Did you also do something fun?', 'yes, ai did! did yu olso du samting fan?', 'Ya, benar! Apakah kamu juga melakukan sesuatu yang seru?', 'ใช่ ฉันทำ! แล้วคุณได้ทำอะไรสนุกๆ บ้างไหม?'],
    },
    yesno_would: {
      easy: ['Yes, I would really like that.', 'yes, ai wud rili laik det', 'Ya, saya sangat menyukainya.', 'ใช่ ฉันชอบแบบนั้นมากเลยครับ/ค่ะ'],
      mission: ['Yes, I would love to, that sounds like a great plan.', 'yes, ai wud lav tu, det saunds laik e greit plen', 'Ya, saya ingin sekali, kedengarannya rencana bagus.', 'ใช่ อยากมากเลย ฟังดูเป็นแผนที่ยอดเยี่ยมมาก'],
      rescue: ["I'd love to! Would that time work for you?", 'aid lav tu! wud det taim werk for yu?', 'Aku mau sekali! Apakah waktu itu pas untukmu?', 'ฉันอยากมากเลย! แล้วเวลานั้นสะดวกสำหรับคุณไหม?'],
    },
    yesno_do: {
      easy: ['Yes, I do.', 'yes, ai du', 'Ya, tentu.', 'ใช่ครับ/ค่ะ'],
      mission: [topic ? `Yes, I really enjoy ${topic}.` : 'Yes, I really enjoy it.', topic ? `yes, ai rili enjoy ${topic}` : 'yes, ai rili enjoy it', topic ? `Ya, aku suka banget ${topic}.` : 'Ya, aku sangat menyukainya.', topic ? `ใช่ ฉันชอบ${topic}มากเลย` : 'ใช่ ฉันชอบสิ่งนี้มากเลย'],
      rescue: ['Yes, I do! Do you enjoy it as well?', 'yes, ai du! du yu enjoy it ez wel?', 'Ya, tentu! Apakah kamu juga menyukainya?', 'ใช่แน่นอน! แล้วคุณชอบเหมือนกันไหม?'],
    },
    greeting: {
      easy: ['Hi! Good to see you today.', 'hai! gud tu si yu tudei', 'Hai! Senang bertemu denganmu hari ini.', 'สวัสดี! ดีใจที่ได้พบคุณวันนี้'],
      mission: ["Hello! I'm feeling great and ready to practice.", 'helo! aim fiiling greit end redi tu praktis', 'Halo! Aku merasa prima dan siap berlatih.', 'สวัสดี! ฉันรู้สึกสดชื่นและพร้อมฝึกแล้ว'],
      rescue: ['Hi there! How are you doing today?', 'hai der! hau ar yu duing tudei?', 'Hai! Bagaimana kabarmu hari ini?', 'สวัสดี! วันนี้คุณเป็นอย่างไรบ้าง?'],
    },
    statement: {
      easy: ['That makes a lot of sense!', 'det meiks e lot of sens!', 'Itu sangat masuk akal!', 'ฟังดูสมเหตุสมผลมากเลย!'],
      mission: ["That sounds really interesting, I hadn't thought about it that way.", 'det saunds rili intresting, ai hedent tot abaut it det wei', 'Kedengarannya sangat menarik, aku belum pernah terpikir seperti itu.', 'ฟังดูน่าสนใจมาก ฉันไม่เคยคิดในมุมนั้นมาก่อนเลย'],
      rescue: ['Really? Could you tell me a bit more about that?', 'rili? kud yu tel mi e bit mor abaut det?', 'Benarkah? Bisakah ceritakan lebih banyak tentang itu?', 'จริงเหรอ? คุณช่วยเล่ารายละเอียดเพิ่มเติมให้ฟังหน่อยได้ไหม?'],
    },
  };

  const JA: Record<CopilotSpeechAct, Tpl> = {
    echo_redemption: {
      easy: [echo, toPhoneticRomaji(echo), `Ulangi: 「${echo}」`, `พูดตาม: 「${echo}」`],
      mission: [`${echo}、ですね。`, `${toPhoneticRomaji(echo)}, desu ne`, `Mengerti: 「${echo}」`, `เข้าใจแล้ว: 「${echo}」`],
      rescue: [`${echo}。これで合っていますか？`, `${toPhoneticRomaji(echo)}. kore de atte imasu ka?`, `「${echo}」. Apakah ini sudah benar?`, `「${echo}」 ถูกต้องไหมครับ/ค่ะ?`],
    },
    clarification_repeat: {
      easy: [
        userEcho || "もう一度言いますね！",
        userEcho ? toPhoneticRomaji(userEcho) : "Mou ichido iimasu ne!",
        userEcho ? `Ulangi: 「${userEcho}」` : "Kukatakan sekali lagi ya!",
        userEcho ? `พูดซ้ำ: 「${userEcho}」` : "ฉันจะพูดอีกรอบนะ!",
      ],
      mission: [
        userEcho ? `すみません、さっき「${userEcho}」と言っていました。` : "すみません、電波が少し途切れてしまいました。",
        userEcho ? `Sumimasen, sakki "${toPhoneticRomaji(userEcho)}" to itte imashita.` : "Sumimasen, denpa ga sukoshi togirete shimaimashita.",
        userEcho ? `Maaf, tadi aku bilang: 「${userEcho}」.` : "Maaf, tadi sinyalku agak terputus sebentar.",
        userEcho ? `ขอโทษที เมื่อกี้ฉันพูดว่า: 「${userEcho}」` : "ขอโทษที สัญญาณขัดข้องนิดหน่อยครับ/ค่ะ",
      ],
      rescue: [
        "今はっきり聞こえますか？続けましょう！",
        "Ima hakkiri kikoemasu ka? Tsuzukemashou!",
        "Sekarang sudah terdengar jelas? Ayo kita lanjut!",
        "ตอนนี้ได้ยินชัดเจนไหมครับ/ค่ะ? มาคุยกันต่อเถอะ!",
      ],
    },
    wh_what_action: {
      easy: [
        "今は家でのんびり休んでいます。",
        "Ima wa ie de nonbiri yasunde imasu.",
        "Sekarang aku lagi santai istirahat di rumah.",
        "ตอนนี้ฉันกำลังพักผ่อนสบายๆ อยู่ที่บ้านครับ/ค่ะ",
      ],
      mission: [
        "アニメを見ながら、少しリラックスしています。",
        "Anime o minagara, sukoshi rirakkusu shite imasu.",
        "Aku lagi santai sambil nonton anime.",
        "กำลังดูอนิเมะและผ่อนคลายอยู่นิดหน่อย",
      ],
      rescue: [
        "家でくつろいでいます。先生は何をしているんですか？",
        "Ie de kutsuroide imasu. Sensei wa nani o shite iru n desu ka?",
        "Aku lagi santai di rumah. Kalau Sensei lagi ngapain?",
        "พักผ่อนอยู่บ้าน แล้วคุณครูกำลังทำอะไรอยู่เหรอครับ/ค่ะ?",
      ],
    },
    invitation: {
      easy: ['はい、ぜひ一緒にお願いします！', 'hai, zehi issho ni onegai shimasu!', 'Ya, mari kita lakukan bersama!', 'ได้เลย ไปด้วยกันนะ!'],
      mission: ['いいですね！ちょうど時間が空いていますよ。', 'ii desu ne! choudo jikan ga aite imasu yo.', 'Bagus sekali! Pas banget aku ada waktu luang.', 'ดีเลย! ฉันกำลังว่างอยู่พอดีเลย'],
      rescue: ['ぜひ行きたいです！何時ごろが都合がいいですか？', 'zehi ikitai desu! nanji goro ga tsugou ga ii desu ka?', 'Pasti mau ikut! Jam berapa yang cocok untukmu?', 'อยากไปมากเลย! คุณสะดวกประมาณกี่โมงดี?'],
    },
    choice: {
      easy: [chosenOpt ? `${chosenOpt}をお願いします。` : '一つ目をお願いします。', chosenOpt ? `${toPhoneticRomaji(chosenOpt)} o onegai shimasu` : 'hitotsume o onegai shimasu', chosenOpt ? `Minta ${chosenOpt}, tolong.` : 'Yang pertama saja, tolong.', chosenOpt ? `ขอเป็น${chosenOpt}ครับ/ค่ะ` : 'ขอตัวเลือกแรกครับ/ค่ะ'],
      mission: [chosenOpt ? `${chosenOpt}のほうが好きなので、そちらにします。` : '二つ目のほうがいいです。', chosenOpt ? `${toPhoneticRomaji(chosenOpt)} no hou ga suki na no de, sochira ni shimasu` : 'futatsume no hou ga ii desu', chosenOpt ? `Karena lebih suka ${chosenOpt}, aku pilih itu.` : 'Yang kedua lebih baik.', chosenOpt ? `ฉันชอบ${chosenOpt}มากกว่า เลยขอเลือกอันนี้นะ` : 'ฉันว่าอันที่สองดีกว่านะ'],
      rescue: ['うーん、迷いますね。どちらがおすすめですか？', 'uun, mayoimasu ne. dochira ga osusume desu ka?', 'Hmm, bingung ya. Yang mana yang kamu rekomendasikan?', 'อืม เลือกยากจัง คุณแนะนำอันไหนเหรอ?'],
    },
    wh_how_long: {
      easy: ['だいたい二年ぐらいになります。', 'daitai ninen gurai ni narimasu.', 'Kira-kira sudah dua tahun.', 'ประมาณสองปีแล้วครับ/ค่ะ'],
      mission: ['二年ぐらい前からずっと続けていますよ。', 'ninen gurai mae kara zutto tsuzukete imasu yo.', 'Sudah terus menekuninya sejak dua tahun lalu.', 'ฉันทำต่อเนื่องมาตั้งแต่ประมาณสองปีก่อนแล้ว'],
      rescue: ['二年ほどです。あなたはどのくらい続けていますか？', 'ninen hodo desu. anata wa dono kurai tsuzukete imasu ka?', 'Kira-kira dua tahun. Kalau kamu sudah berapa lama?', 'ประมาณสองปี แล้วคุณทำมานานแค่ไหนแล้วเหรอ?'],
    },
    wh_how_often: {
      easy: ['週に二、三回ぐらいです。', 'shuu ni ni, sankai gurai desu.', 'Kira-kira dua atau tiga kali seminggu.', 'ประมาณสองถึงสามครั้งต่อสัปดาห์ครับ/ค่ะ'],
      mission: ['だいたい週に二回か三回は行くようにしています。', 'daitai shuu ni nikai ka sankai wa iku you ni shite imasu.', 'Biasanya aku usahakan pergi 2-3 kali seminggu.', 'ปกติฉันพยายามไปให้ได้สัปดาห์ละสองหรือสามครั้ง'],
      rescue: ['週に二回ほどです。あなたはどのくらいのペースですか？', 'shuu ni nikai hodo desu. anata wa dono kurai no peesu desu ka?', 'Sekitar dua kali seminggu. Kalau kamu bagaimana temponya?', 'ประมาณสองครั้งต่อสัปดาห์ แล้วคุณไปบ่อยแค่ไหนเหรอ?'],
    },
    wh_how_many: {
      easy: ['二、三個ぐらいですね。', 'ni, sanko gurai desu ne.', 'Kira-kira dua atau tiga buah ya.', 'ประมาณสองหรือสามอันครับ/ค่ะ'],
      mission: ['だいたい二つか三つぐらいを用意しています。', 'daitai futatsu ka mittsu gurai o youi shite imasu.', 'Biasanya saya siapkan sekitar dua atau tiga buah.', 'ปกติฉันเตรียมไว้ประมาณสองถึงสามอัน'],
      rescue: ['二、三個です。あなたは普段どのくらい必要ですか？', 'ni, sanko desu. anata wa fudan dono kurai hitsuyou desu ka?', 'Dua atau tiga. Kamu biasanya perlu berapa banyak?', 'สองหรือสามอัน แล้วปกติคุณต้องใช้เท่าไหร่เหรอ?'],
    },
    wh_how_feel_day: {
      easy: ['今日はとてもいい一日でしたよ。', 'kyou wa totemo ii ichinichi deshita yo.', 'Hari ini hari yang sangat menyenangkan.', 'วันนี้เป็นวันที่ดีมากเลยครับ/ค่ะ'],
      mission: ['少し忙しかったですが、とても充実した一日でした。', 'sukoshi isogashikatta desu ga, totemo juujitsu shita ichinichi deshita.', 'Agak sibuk tapi hari yang sangat produktif.', 'ค่อนข้างยุ่งนิดหน่อยแต่ก็เป็นวันที่คุ้มค่ามากเลย'],
      rescue: ['とても元気です！あなたの一日はどうでしたか？', 'totemo genki desu! anata no ichinichi wa dou deshita ka?', 'Sangat bersemangat! Bagaimana harimu?', 'ฉันสบายดีมากเลย! แล้ววันของคุณเป็นยังไงบ้าง?'],
    },
    wh_how_method: {
      easy: ['いつも電車を使っています。とても便利ですよ。', 'itsumo densha o tsukatte imasu. totemo benri desu yo.', 'Selalu naik kereta. Sangat praktis lho.', 'ปกติฉันนั่งรถไฟไป สะดวกมากเลย'],
      mission: ['電車で二十分くらいかけて通っています。', 'densha de nijuppun kurai kakete kayotte imasu.', 'Pergi naik kereta memakan waktu sekitar 20 menit.', 'ฉันนั่งรถไฟไป ใช้เวลาเดินทางประมาณยี่สิบนาที'],
      rescue: ['電車で行きます。あなたはどうやって行きますか？', 'densha de ikimasu. anata wa dou yatte ikimasu ka?', 'Naik kereta. Kamu sendiri ke sana bagaimana caranya?', 'ฉันไปโดยรถไฟ แล้วคุณเดินทางไปอย่างไรเหรอ?'],
    },
    wh_where_origin: {
      easy: ['インドネシアから来ました。', 'indoneshia kara kimashita.', 'Aku dari Indonesia.', 'ฉันมาจากประเทศอินโดนีเซีย'],
      mission: ['インドネシアの生まれで、日本が大好きです。', 'indoneshia no umare de, nihon ga daisuki desu.', 'Lahir di Indonesia, dan sangat suka Jepang.', 'ฉันเกิดที่อินโดนีเซีย และชอบประเทศญี่ปุ่นมาก'],
      rescue: ['インドネシアからです。行ったことがありますか？', 'indoneshia kara desu. itta koto ga arimasu ka?', 'Dari Indonesia. Pernahkah kamu ke sana?', 'มาจากอินโดนีเซียครับ/ค่ะ คุณเคยไปเที่ยวที่นั่นไหม?'],
    },
    wh_where_action: {
      easy: ['家の近くの静かなカフェに行きます。', 'ie no chikaku no shizuka na kafe ni ikimasu.', 'Pergi ke kafe tenang dekat rumah.', 'ไปคาเฟ่เงียบๆ แถวบ้านครับ/ค่ะ'],
      mission: ['駅の近くにある落ち着いたお店によく行きますよ。', 'eki no chikaku ni aru ochitsuita omise ni yoku ikimasu yo.', 'Sering pergi ke tempat nyaman dekat stasiun.', 'ฉันมักจะไปร้านบรรยากาศสงบๆ แถวสถานีรถไฟ'],
      rescue: ['家の近くです。あなたは普段どこに行きますか？', 'ie no chikaku desu. anata wa fudan doko ni ikimasu ka?', 'Dekat rumahku. Kalau kamu biasanya ke mana?', 'แถวบ้านฉัน แล้วปกติคุณไปไหนเหรอ?'],
    },
    wh_what_food: {
      easy: ['ホットコーヒーをお願いします。', 'hotto koohii o onegai shimasu.', 'Minta kopi panas, tolong.', 'ขอกาแฟร้อนครับ/ค่ะ'],
      mission: ['アイスラテを一つ、テイクアウトでお願いします。', 'aisu rate o hitotsu, teikuauto de onegai shimasu.', 'Minta satu es latte, dibungkus (takeaway).', 'ขอลาเต้เย็นหนึ่งแก้ว สั่งกลับบ้านครับ/ค่ะ'],
      rescue: ['アイスラテにします。一番人気は何ですか？', 'aisu rate ni shimasu. ichiban ninki wa nan desu ka?', 'Aku pilih es latte. Yang paling populer apa ya?', 'ฉันเอาลาเต้เย็น แล้วเมนูยอดนิยมที่สุดคืออะไรเหรอ?'],
    },
    wh_what_talk: {
      easy: ['最近の出来事について話したいです。', 'saikin no dekigoto ni tsuite hanashitai desu.', 'Aku ingin cerita tentang kejadian belakangan ini.', 'อยากเล่าเรื่องราวที่เกิดขึ้นช่วงนี้ครับ/ค่ะ'],
      mission: ['今週は仕事や勉強が忙しかったので、その話を聞いてほしいです。', 'konshuu wa shigoto ya benkyou ga isogashikatta no de, sono hanashi o kiite hoshii desu.', 'Minggu ini kerjaan dan belajar cukup padat, jadi ingin cerita soal itu.', 'สัปดาห์นี้ทั้งงานและการเรียนยุ่งมาก เลยอยากเล่าเรื่องนี้ให้ฟังครับ/ค่ะ'],
      rescue: ['週末の予定について話しましょう！休みの日は何をしますか？', 'shuumatsu no yotei ni tsuite hanashimashou! yasumi no hi wa nani o shimasu ka?', 'Ayo bahas rencana akhir pekan! Saat hari libur kamu biasanya ngapain?', 'มาคุยเรื่องแผนสุดสัปดาห์กันเถอะ! วันหยุดปกติคุณทำอะไรเหรอ?'],
    },
    wh_what_general: {
      easy: [topic ? `${topic}がとても好きです。` : '新しいことを学ぶのが好きです。', topic ? `${toPhoneticRomaji(topic)} ga totemo suki desu.` : 'atarashii koto o manabu no ga suki desu.', topic ? `Sangat suka "${toPhoneticRomaji(topic)}".` : 'Suka belajar hal-hal baru.', topic ? `ฉันชอบ "${toPhoneticRomaji(topic)}" มากเลย` : 'ฉันชอบเรียนรู้สิ่งใหม่ๆ'],
      mission: [topic ? `一番好きなのは${topic}です。リラックスできますから。` : '会話の練習をするのが一番楽しいですね。', topic ? `ichiban suki na no wa ${toPhoneticRomaji(topic)} desu. rirakkusu dekimasu kara.` : 'kaiwa no renshuu o suru no ga ichiban tanoshii desu ne.', topic ? `Yang paling kusuka "${toPhoneticRomaji(topic)}", karena bikin santai.` : 'Paling menyenangkan melatih percakapan.', topic ? `สิ่งที่ชอบที่สุดคือ "${toPhoneticRomaji(topic)}" เพราะทำให้ผ่อนคลาย` : 'การฝึกสนทนาเป็นสิ่งที่สนุกที่สุดเลย'],
      rescue: ['面白いですね。あなたは何が一番おすすめですか？', 'omoshiroi desu ne. anata wa nani ga ichiban osusume desu ka?', 'Menarik ya. Menurutmu apa yang paling direkomendasikan?', 'น่าสนใจจัง แล้วคุณมีอะไรแนะนำเป็นพิเศษไหม?'],
    },
    wh_why: {
      easy: ['会話の練習になって楽しいからです。', 'kaiwa no renshuu ni natte tanoshii kara desu.', 'Karena menyenangkan melatih percakapan.', 'เพราะได้ฝึกสนทนาแล้วสนุกดีครับ/ค่ะ'],
      mission: ['世界中の人と自然に話せるようになりたいからです。', 'sekaijuu no hito to shizen ni hanaseru you ni naritai kara desu.', 'Karena ingin bisa bicara natural dengan orang sedunia.', 'เพราะฉันอยากพูดคุยกับผู้คนทั่วโลกได้อย่างเป็นธรรมชาติ'],
      rescue: ['将来の役に立つからです。どうしてそう思ったのですか？', 'shourai no yaku ni tatsu kara desu. doushite sou omotta no desu ka?', 'Karena berguna untuk masa depan. Kenapa kamu bertanya?', 'เพราะมันมีประโยชน์ต่ออนาคต ทำไมคุณถึงคิดแบบนั้นเหรอ?'],
    },
    wh_when: {
      easy: ['普段は仕事の後の夜です。', 'fudan wa shigoto no ato no yoru desu.', 'Biasanya malam hari sepulang kerja.', 'ปกติช่วงค่ำหลังเลิกงานครับ/ค่ะ'],
      mission: ['時間がある週末にゆっくりやることが多いですね。', 'jikan ga aru shuumatsu ni yukkuri yaru koto ga ooi desu ne.', 'Sering melakukan santai di akhir pekan saat senggang.', 'ฉันมักจะทำอย่างสบายๆ ในช่วงวันหยุดสุดสัปดาห์'],
      rescue: ['週末が多いです。あなたはいつ頃が一番いいですか？', 'shuumatsu ga ooi desu. anata wa itsugoro ga ichiban ii desu ka?', 'Banyakan akhir pekan. Kalau kamu kapan yang paling pas?', 'ส่วนใหญ่เป็นวันหยุดสุดสัปดาห์ แล้วคุณสะดวกช่วงไหนที่สุดเหรอ?'],
    },
    wh_who: {
      easy: ['学校の友だちと一緒です。', 'gakkou no tomodachi to issho desu.', 'Bersama teman-teman sekolah.', 'ไปกับเพื่อนที่โรงเรียนครับ/ค่ะ'],
      mission: ['仲のいい友だちや同僚と行くことが多いですね。', 'naka no ii tomodachi ya douryou to iku koto ga ooi desu ne.', 'Sering pergi dengan kawan akrab atau rekan kerja.', 'ฉันมักจะไปกับเพื่อนสนิทหรือเพื่อนร่วมงาน'],
      rescue: ['親しい友だちとです。あなたは誰と過ごすことが多いですか？', 'shitashii tomodachi to desu. anata wa dare to sugosu koto ga ooi desu ka?', 'Dengan teman akrab. Kamu biasanya bersama siapa?', 'ไปกับเพื่อนสนิท แล้วปกติคุณมักจะใช้เวลาร่วมกับใครเหรอ?'],
    },
    yesno_are: {
      easy: ['はい、その通りです。', 'hai, sono toori desu.', 'Ya, tepat sekali.', 'ใช่ เป็นไปตามนั้นเลยครับ/ค่ะ'],
      mission: ['はい、順調に進んでいますよ。', 'hai, junchou ni susunde imasu yo.', 'Ya, berjalan lancar kok.', 'ใช่ ทุกอย่างกำลังดำเนินไปด้วยดี'],
      rescue: ['はい、そうです！あなたはどうですか？', 'hai, sou desu! anata wa dou desu ka?', 'Ya, benar! Kalau kamu bagaimana?', 'ใช่เลยครับ/ค่ะ! แล้วคุณล่ะเป็นยังไงบ้าง?'],
    },
    yesno_can: {
      easy: ['はい、大丈夫です、できますよ。', 'hai, daijoubu desu, dekimasu yo.', 'Ya, tidak apa-apa, saya bisa.', 'ใช่ ไม่เป็นไร ทำได้แน่นอนครับ/ค่ะ'],
      mission: ['はい、少し練習したのでできますよ。', 'hai, sukoshi renshuu shita no de dekimasu yo.', 'Ya, karena sudah sedikit latihan, saya bisa.', 'ใช่ เพราะได้ฝึกมาบ้างแล้วเลยพอทำได้ครับ/ค่ะ'],
      rescue: ['できると思います！何かコツはありますか？', 'dekiru to omoimasu! nanika kotsu wa arimasu ka?', 'Kurasa bisa! Ada tips atau kiatnya?', 'คิดว่าทำได้นะ! พอมีเคล็ดลับอะไรแนะนำไหม?'],
    },
    yesno_have: {
      easy: ['はい、前に行ったことがあります。', 'hai, mae ni itta koto ga arimasu.', 'Ya, saya pernah ke sana sebelumnya.', 'ใช่ เคยไปมาก่อนแล้วครับ/ค่ะ'],
      mission: ['はい、以前に体験してとても楽しかったですよ。', 'hai, izen ni taiken shite totemo tanoshikatta desu yo.', 'Ya, dulu pernah mencobanya dan menyenangkan sekali.', 'ใช่ เคยลองเมื่อก่อนและรู้สึกสนุกมากเลย'],
      rescue: ['はい、ありますよ。あなたも試したことがありますか？', 'hai, arimasu yo. anata mo tameshita koto ga arimasu ka?', 'Ya, pernah. Apakah kamu juga pernah mencobanya?', 'ใช่ เคยนะ แล้วคุณเคยลองดูบ้างหรือยัง?'],
    },
    yesno_did: {
      easy: ['はい、最近そうしましたよ。', 'hai, saikin sou shimashita yo.', 'Ya, baru-baru ini saya melakukannya.', 'ใช่ ฉันเพิ่งทำอย่างนั้นไปเมื่อเร็วๆ นี้ครับ/ค่ะ'],
      mission: ['はい、先週行ってみてすごく良かったです。', 'hai, senshuu itte mite sugoku yokatta desu.', 'Ya, minggu lalu saya coba pergi dan bagus sekali.', 'ใช่ สัปดาห์ก่อนฉันลองไปดูแล้วรู้สึกดีมากๆ เลย'],
      rescue: ['はい、そうでした！あなたもどこか行きましたか？', 'hai, sou deshita! anata mo dokoka ikimashita ka?', 'Ya, begitu! Kamu sendiri pergi ke suatu tempat juga?', 'ใช่ เป็นอย่างนั้นเลย! แล้วคุณได้ไปเที่ยวที่ไหนมาบ้างไหม?'],
    },
    yesno_would: {
      easy: ['はい、ぜひお願いしたいです。', 'hai, zehi onegai shitai desu.', 'Ya, tentu saja saya ingin.', 'ใช่ อยากให้เป็นอย่างนั้นมากเลยครับ/ค่ะ'],
      mission: ['はい、とても良さそうですね。ぜひそうしたいです。', 'hai, totemo yosasou desu ne. zehi sou shitai desu.', 'Ya, kedengarannya sangat bagus. Saya pasti ingin.', 'ใช่ ดูดีมากๆ เลย อยากทำแบบนั้นแน่นอนครับ/ค่ะ'],
      rescue: ['ぜひ！その時間でご都合はよろしいですか？', 'zehi! sono jikan de go-tsugou wa yoroshii desu ka?', 'Tentu! Apakah di jam itu kamu ada waktu?', 'ยินดีเลย! แล้วเวลานั้นคุณสะดวกใช่ไหมครับ/ค่ะ?'],
    },
    yesno_do: {
      easy: ['はい、よくそうします。', 'hai, yoku sou shimasu.', 'Ya, sering kali begitu.', 'ใช่ มักจะเป็นอย่างนั้นครับ/ค่ะ'],
      mission: [topic ? `はい、${topic}が大好きです。` : 'はい、とても楽しんでやっていますよ。', topic ? `hai, ${toPhoneticRomaji(topic)} ga daisuki desu.` : 'hai, totemo tanoshinde yatte imasu yo.', topic ? `Ya, aku sangat suka "${toPhoneticRomaji(topic)}".` : 'Ya, aku sangat menikmatinya.', topic ? `ใช่ ฉันชอบ "${toPhoneticRomaji(topic)}" มากเลย` : 'ใช่ ฉันสนุกกับมันมากเลย'],
      rescue: ['はい、そうです！あなたもよくしますか？', 'hai, sou desu! anata mo yoku shimasu ka?', 'Ya, benar! Kamu juga sering melakukannya?', 'ใช่เลย! แล้วคุณทำบ่อยเหมือนกันไหม?'],
    },
    greeting: {
      easy: ['こんにちは！よろしくお願いします。', 'konnichiwa! yoroshiku onegai shimasu.', 'Halo! Senang bisa berbincang denganmu.', 'สวัสดี! ยินดีที่ได้คุยกันนะ'],
      mission: ['こんにちは！今日も元気いっぱいですよ。', 'konnichiwa! kyou mo genki ippai desu yo.', 'Halo! Hari ini aku sangat bersemangat.', 'สวัสดี! วันนี้ฉันสดชื่นเต็มที่เลย'],
      rescue: ['こんにちは！調子はいかがですか？', 'konnichiwa! choushi wa ikaga desu ka?', 'Halo! Bagaimana kabarmu?', 'สวัสดี! คุณสบายดีไหมวันนี้?'],
    },
    statement: {
      easy: ['なるほど、よく分かります！', 'naruhodo, yoku wakarimasu!', 'Begitu rupanya, aku sangat paham!', 'อย่างนี้นี่เอง เข้าใจแจ่มแจ้งเลย!'],
      mission: ['それは面白い視点ですね。とても勉強になります。', 'sore wa omoshiroi shiten desu ne. totemo benkyou ni narimasu.', 'Itu sudut pandang yang menarik, banyak belajar darinya.', 'เป็นมุมมองที่น่าสนใจมาก ได้ความรู้เพิ่มขึ้นเลย'],
      rescue: ['そうなんですか？ぜひもっと詳しく聞かせてください。', 'sou nan desu ka? zehi motto kuwashiku kikasete kudasai.', 'Begitukah? Tolong ceritakan lebih detail lagi.', 'อย่างนั้นเหรอ? ช่วยเล่ารายละเอียดให้ฟังหน่อยได้ไหม?'],
    },
  };

  const ZH: Record<CopilotSpeechAct, Tpl> = {
    echo_redemption: {
      easy: [echo, toPhoneticPinyin(echo), `Ulangi: “${toPhoneticPinyin(echo)}”`, `พูดตาม: “${toPhoneticPinyin(echo)}”`],
      mission: [`${echo}，对吧？`, `${toPhoneticPinyin(echo)}, duì ba?`, `Mengerti: “${toPhoneticPinyin(echo)}”`, `เข้าใจแล้ว: “${toPhoneticPinyin(echo)}”`],
      rescue: [`${echo}。我读得对吗？`, `${toPhoneticPinyin(echo)}. Wǒ dú de duì ma?`, `“${toPhoneticPinyin(echo)}”. Apakah pengucapanku sudah benar?`, `“${toPhoneticPinyin(echo)}” ฉันอ่านถูกต้องไหม?`],
    },
    clarification_repeat: {
      easy: [
        userEcho || "那我再说一遍吧！",
        userEcho ? toPhoneticPinyin(userEcho) : "Nà wǒ zài shuō yí biàn ba!",
        userEcho ? `Ulangi: "${userEcho}"` : "Kalau begitu aku ulangi lagi ya!",
        userEcho ? `พูดซ้ำ: "${userEcho}"` : "งั้นฉันพูดอีกรอบนะ!",
      ],
      mission: [
        userEcho ? `不好意思，我刚才说的是：“${userEcho}”。` : "不好意思，刚才我这边的网络卡了一下。",
        userEcho ? `Bù hǎoyìsi, wǒ gāngcái shuō de shì: "${toPhoneticPinyin(userEcho)}".` : "Bù hǎoyìsi, gāngcái wǒ zhè biān de wǎngluò kǎ le yíxià.",
        userEcho ? `Maaf ya, tadi maksudku: "${userEcho}".` : "Maaf ya, tadi jaringanku sempat macet sebentar.",
        userEcho ? `ขอโทษที เมื่อกี้ฉันบอกว่า: "${userEcho}"` : "ขอโทษที เมื่อกี้เน็ตฉันกระตุกนิดหน่อย",
      ],
      rescue: [
        "现在能听清楚了吗？我们继续聊吧！",
        "Xiànzài néng tīng qīngchu le ma? Wǒmen jìxù liáo ba!",
        "Sekarang sudah terdengar jelas? Ayo kita lanjut ngobrol!",
        "ตอนนี้ได้ยินชัดเจนไหม? มาคุยกันต่อนะ!",
      ],
    },
    wh_what_action: {
      easy: [
        "我现在在家里休息呢。",
        "Wǒ xiànzài zài jiālǐ xiūxi ne.",
        "Sekarang aku lagi istirahat di rumah.",
        "ตอนนี้ฉันพักผ่อนอยู่ที่บ้านครับ/ค่ะ",
      ],
      mission: [
        "我正在看一部电影，顺便放松一下。",
        "Wǒ zhèngzài kàn yí bù diànyǐng, shùnbiàn fàngsōng yíxià.",
        "Aku lagi nonton film sambil santai.",
        "ฉันกำลังดูหนังและพักผ่อนอยู่",
      ],
      rescue: [
        "在家里休息。老师您在忙些什么呢？",
        "Zài jiālǐ xiūxi. Lǎoshī nín zài máng xiē shénme ne?",
        "Lagi santai di rumah. Kalau Laoshi lagi sibuk apa?",
        "พักผ่อนอยู่บ้าน แล้วคุณครูกำลังทำอะไรอยู่เหรอครับ/ค่ะ?",
      ],
    },
    invitation: {
      easy: ['好啊，我们一起去吧！', 'Hǎo a, wǒmen yīqǐ qù ba!', 'Boleh, ayo kita pergi sama-sama!', 'ดีเลย ไปด้วยกันเถอะ!'],
      mission: ['太好了！我这几天正好有空呢。', 'Tài hǎo le! Wǒ zhè jǐ tiān zhènghǎo yǒu kòng ne.', 'Bagus sekali! Beberapa hari ini aku lagi luang.', 'ยอดไปเลย! ช่วงสองสามวันนี้ฉันว่างพอดี'],
      rescue: ['好主意！你打算什么时候去呢？', 'Hǎo zhǔyì! Nǐ dǎsuàn shénme shíhòu qù ne?', 'Ide bagus! Kamu rencana kapan perginya?', 'ความคิดดีเลย! คุณตั้งใจจะไปตอนไหนเหรอ?'],
    },
    choice: {
      easy: [chosenOpt ? `我要${chosenOpt}，谢谢。` : '我选第一个吧。', chosenOpt ? `Wǒ yào ${toPhoneticPinyin(chosenOpt)}, xièxie.` : 'Wǒ xuǎn dì yī gè ba.', chosenOpt ? `Saya mau ${toPhoneticPinyin(chosenOpt)}, terima kasih.` : 'Saya pilih yang pertama saja.', chosenOpt ? `ขอเป็น${toPhoneticPinyin(chosenOpt)} ขอบคุณครับ/ค่ะ` : 'ขอเลือกอันแรกครับ/ค่ะ'],
      mission: [chosenOpt ? `我更喜欢${chosenOpt}，感觉味道很不错。` : '我选第一个，感觉挺好的。', chosenOpt ? `Wǒ gèng xǐhuān ${toPhoneticPinyin(chosenOpt)}, gǎnjué wèidào hěn bùcuò.` : 'Wǒ xuǎn dì yī gè, gǎnjué tǐng hǎo de.', chosenOpt ? `Aku lebih suka ${toPhoneticPinyin(chosenOpt)}, rasanya enak.` : 'Aku pilih yang pertama, rasanya oke.', chosenOpt ? `ฉันชอบ${toPhoneticPinyin(chosenOpt)}มากกว่า รู้สึกว่ารสชาติดีเลย` : 'ฉันเลือกอันแรก รู้สึกว่าน่าจะดี'],
      rescue: ['这两个都不错，你平时更喜欢哪一个？', 'Zhè liǎng gè dōu bùcuò, nǐ píngshí gèng xǐhuān nǎ yī gè?', 'Dua-duanya oke, kamu biasanya lebih suka yang mana?', 'ทั้งสองอย่างดูดีทั้งคู่เลย คุณชอบอันไหนมากกว่าเหรอ?'],
    },
    wh_how_long: {
      easy: ['大概有两年左右了。', 'Dàgài yǒu liǎng nián zuǒyòu le.', 'Kira-kira sudah dua tahun.', 'ประมาณสองปีแล้วครับ/ค่ะ'],
      mission: ['我已经学了大概两年了，感觉挺有收获的。', 'Wǒ yǐjīng xué le dàgài liǎng nián le, gǎnjué tǐng yǒu shōuhuò de.', 'Aku sudah belajar sekitar dua tahun, terasa banyak hasilnya.', 'ฉันเรียนมาประมาณสองปีแล้ว รู้สึกว่าได้อะไรเยอะเลย'],
      rescue: ['差不多两年了。你接触这个有多长时间了？', 'Chàbùduō liǎng nián le. Nǐ jiēchù zhè gè yǒu duō cháng shíjiān le?', 'Kurang lebih dua tahun. Kamu sudah berapa lama berkecimpung di hal ini?', 'เกือบสองปีแล้ว แล้วคุณสัมผัสกับสิ่งนี้มานานแค่ไหนแล้วเหรอ?'],
    },
    wh_how_often: {
      easy: ['大概一周两三次吧。', 'Dàgài yī zhōu liǎng sān cì ba.', 'Kira-kira seminggu dua atau tiga kali.', 'ประมาณสัปดาห์ละสองถึงสามครั้งครับ/ค่ะ'],
      mission: ['我一般一周去两到三次，尽量保持习惯。', 'Wǒ yībān yī zhōu qù liǎng dào sān cì, jǐnliàng bǎochí xíguàn.', 'Biasanya seminggu 2-3 kali, menjaga kebiasaan.', 'ปกติฉันพยายามไปสัปดาห์ละสองถึงสามครั้งเพื่อรักษาความเคยชิน'],
      rescue: ['差不多一周两三次。你一般多久去一次？', 'Chàbùduō yī zhōu liǎng sān cì. Nǐ yībān duōjiǔ qù yī cì?', 'Sekitar seminggu 2-3 kali. Kamu biasanya seberapa sering?', 'ประมาณสัปดาห์ละสองถึงสามครั้ง แล้วคุณไปบ่อยแค่ไหนเหรอ?'],
    },
    wh_how_many: {
      easy: ['大概两三个左右。', 'Dàgài liǎng sān gè zuǒyòu.', 'Kira-kira dua atau tiga buah.', 'ประมาณสองหรือสามอันครับ/ค่ะ'],
      mission: ['一般准备两三个就差不多够用了。', 'Yībān zhǔnbèi liǎng sān gè jiù chàbùduō gòuyòng le.', 'Biasanya siapkan 2-3 buah sudah cukup.', 'ปกติเตรียมไว้สองถึงสามอันก็เพียงพอแล้ว'],
      rescue: ['大概两三个吧。你一般需要多少？', 'Dàgài liǎng sān gè ba. Nǐ yībān xūyào duōshǎo?', 'Kira-kira dua atau tiga. Kamu biasanya perlu berapa?', 'ประมาณสองถึงสามอัน แล้วปกติคุณต้องใช้เท่าไหร่เหรอ?'],
    },
    wh_how_feel_day: {
      easy: ['我今天过得挺充实的，谢谢！', 'Wǒ jīntiān guò de tǐng chōngshí de, xièxie!', 'Hariku sangat memuaskan, terima kasih!', 'วันนี้ของฉันรู้สึกมีคุณค่ามาก ขอบคุณนะ!'],
      mission: ['今天稍微有点忙，不过整体挺顺利的。', 'Jīntiān shāowēi yǒudiǎn máng, bùguò zhěngtǐ tǐng shùnlì de.', 'Hari ini agak sibuk, tapi keseluruhannya lancar.', 'วันนี้ค่อนข้างยุ่งนิดหน่อย แต่โดยรวมราบรื่นดีมาก'],
      rescue: ['挺好的！你今天过得怎么样？', 'Tǐng hǎo de! Nǐ jīntiān guò de zěnmeyàng?', 'Cukup baik! Bagaimana harimu hari ini?', 'ดีมากเลย! แล้ววันนี้ของคุณเป็นอย่างไรบ้าง?'],
    },
    wh_how_method: {
      easy: ['我平时坐地铁去，挺方便的。', 'Wǒ píngshí zuò dìtiě qù, tǐng fāngbiàn de.', 'Biasanya naik kereta bawah tanah, praktis sekali.', 'ปกติฉันนั่งรถไฟใต้ดินไป สะดวกมากเลย'],
      mission: ['我一般坐地铁，大概二十分钟就能到。', 'Wǒ yībān zuò dìtiě, dàgài èrshí fēnzhōng jiù néng dào.', 'Biasanya naik kereta bawah tanah, sekitar 20 menit sampai.', 'ปกติฉันนั่งรถไฟใต้ดิน ประมาณยี่สิบนาทีก็ถึงแล้ว'],
      rescue: ['我坐地铁去。你平时是怎么过去的？', 'Wǒ zuò dìtiě qù. Nǐ píngshí shì zěnme guòqù de?', 'Naik kereta bawah tanah. Kamu sendiri biasanya ke sana naik apa?', 'ฉันนั่งรถไฟใต้ดินไป แล้วปกติคุณเดินทางไปอย่างไรเหรอ?'],
    },
    wh_where_origin: {
      easy: ['我来自印度尼西亚。', 'Wǒ láizì Yìndùníxīyà.', 'Saya berasal dari Indonesia.', 'ฉันมาจากประเทศอินโดนีเซีย'],
      mission: ['我是在印度尼西亚出生长大的。', 'Wǒ shì zài Yìndùníxīyà chūshēng zhǎngdà de.', 'Saya lahir dan besar di Indonesia.', 'ฉันเกิดและเติบโตที่ประเทศอินโดนีเซีย'],
      rescue: ['我是印尼人。你以前去过那里吗？', 'Wǒ shì Yìnní rén. Nǐ yǐqián qù guò nàlǐ ma?', 'Saya orang Indonesia. Apakah kamu pernah ke sana sebelumnya?', 'ฉันเป็นคนอินโดนีเซีย คุณเคยไปที่นั่นมาก่อนไหม?'],
    },
    wh_where_action: {
      easy: ['我平时常去家附近的一家小店。', 'Wǒ píngshí cháng qù jiā fùjìn de yī jiā xiǎodiàn.', 'Biasanya ke toko kecil dekat rumah.', 'ปกติฉันชอบไปร้านเล็กๆ แถวบ้าน'],
      mission: ['我喜欢去市中心一家挺舒服的咖啡馆坐坐。', 'Wǒ xǐhuān qù shì zhōngxīn yī jiā tǐng shūfú de kāfēiguǎn zuòzuò.', 'Aku suka duduk di kafe nyaman di pusat kota.', 'ฉันชอบไปนั่งคาเฟ่สบายๆ แถวใจกลางเมือง'],
      rescue: ['就在我家附近。你平时最喜欢去哪里？', 'Jiù zài wǒ jiā fùjìn. Nǐ píngshí zuì xǐhuān qù nǎlǐ?', 'Di dekat rumahku. Kamu sendiri paling suka ke mana?', 'อยู่ใกล้บ้านฉันเลย แล้วปกติคุณชอบไปที่ไหนที่สุดเหรอ?'],
    },
    wh_what_food: {
      easy: ['我要一杯热咖啡，谢谢。', 'Wǒ yào yī bēi rè kāfēi, xièxie.', 'Saya mau secangkir kopi panas, terima kasih.', 'ขอเป็นกาแฟร้อนหนึ่งแก้ว ขอบคุณครับ/ค่ะ'],
      mission: ['我要一杯冰拿铁，少糖少冰，谢谢。', 'Wǒ yào yī bēi bīng nátiě, shǎo táng shǎo bīng, xièxie.', 'Saya mau es latte, sedikit gula sedikit es, terima kasih.', 'ขอลาเต้เย็น หวานน้อยน้ำแข็งน้อย ขอบคุณครับ/ค่ะ'],
      rescue: ['我点一杯冰拿铁。你们这里最受欢迎的是什么？', 'Wǒ diǎn yī bēi bīng nátiě. Nǐmen zhèlǐ zuì shòu huānyíng de shì shénme?', 'Aku pesan es latte. Yang paling laris di sini apa ya?', 'ฉันสั่งลาเต้เย็นแก้วหนึ่ง แล้วที่นี่อะไรขายดีที่สุดเหรอ?'],
    },
    wh_what_talk: {
      easy: ['我想聊聊我最近的日常生活。', 'Wǒ xiǎng liáoliao wǒ zuìjìn de rìcháng shēnghuó.', 'Aku ingin ngobrol soal keseharianku belakangan ini.', 'ฉันอยากคุยเรื่องชีวิตประจำวันช่วงนี้ครับ/ค่ะ'],
      mission: ['这周我过得挺忙的，想用中文跟你分享一下。', 'Zhè zhōu wǒ guò de tǐng máng de, xiǎng yòng Zhōngwén gēn nǐ fēnxiǎng yīxià.', 'Minggu ini aku cukup sibuk, ingin menceritakannya pakai bahasa Mandarin.', 'สัปดาห์นี้ฉันยุ่งมาก อยากลองเล่าให้คุณฟังเป็นภาษาจีนดู'],
      rescue: ['我们聊聊周末的安排吧！你周末一般喜欢做什么？', 'Wǒmen liáoliao zhōumò de ānpái ba! Nǐ zhōumò yībān xǐhuān zuò shénme?', 'Ayo ngobrol soal rencana akhir pekan! Kamu biasanya suka ngapain saat akhir pekan?', 'มาคุยเรื่องแผนวันหยุดสุดสัปดาห์กันเถอะ! ปกติวันเสาร์อาทิตย์คุณชอบทำอะไรเหรอ?'],
    },
    wh_what_general: {
      easy: [topic ? `我挺喜欢${topic}的。` : '我挺喜欢学新东西的。', topic ? `Wǒ tǐng xǐhuān ${toPhoneticPinyin(topic)} de.` : 'Wǒ tǐng xǐhuān xué xīn dōngxi de.', topic ? `Aku suka sekali "${toPhoneticPinyin(topic)}".` : 'Aku suka belajar hal baru.', topic ? `ฉันชอบ "${toPhoneticPinyin(topic)}" มากเลย` : 'ฉันชอบเรียนรู้สิ่งใหม่ๆ'],
      mission: [topic ? `我最喜欢的就是${topic}，能让我放松下来。` : '平时最喜欢练练口语，很有成就感。', topic ? `Wǒ zuì xǐhuān de jiù shì ${toPhoneticPinyin(topic)}, néng ràng wǒ fàngsōng xiàlái.` : 'Píngshí zuì xǐhuān liànlian kǒuyǔ, hěn yǒu chéngjiùgǎn.', topic ? `Yang paling kusuka adalah "${toPhoneticPinyin(topic)}", bisa bikin rileks.` : 'Paling suka melatih percakapan, sangat memuaskan.', topic ? `สิ่งที่ฉันชอบที่สุดคือ "${toPhoneticPinyin(topic)}" เพราะทำให้ผ่อนคลาย` : 'ปกติชอบฝึกสนทนา รู้สึกว่าคุ้มค่ามากเลย'],
      rescue: ['这个挺有意思的。你平时最推荐什么？', 'Zhè gè tǐng yǒu yìsi de. Nǐ píngshí zuì tuījiàn shénme?', 'Menarik ya. Kalau kamu paling rekomendasikan apa?', 'น่าสนใจดีจัง แล้วปกติคุณแนะนำอะไรที่สุดเหรอ?'],
    },
    wh_why: {
      easy: ['因为这样能锻炼我的口语表达能力。', 'Yīnwèi zhèyàng néng duànliàn wǒ de kǒuyǔ biǎodá nénglì.', 'Karena ini melatih kemampuan bicaraku.', 'เพราะช่วยให้ฉันฝึกทักษะการพูดได้ดีขึ้น'],
      mission: ['因为我想更自然地跟不同国家的人交流。', 'Yīnwèi wǒ xiǎng gèng zìrán de gēn bùtóng guójiā de rén jiāoliú.', 'Karena ingin bisa ngobrol natural dengan orang berbagai negara.', 'เพราะฉันอยากพูดคุยกับผู้คนจากประเทศต่างๆ ได้อย่างเป็นธรรมชาติ'],
      rescue: ['因为这对我的未来很有帮助。你为什么这么问呢？', 'Yīnwèi zhè duì wǒ de wèilái hěn yǒu bāngzhù. Nǐ wèishénme zhème wèn ne?', 'Karena ini sangat membantu masa depanku. Kenapa kamu bertanya?', 'เพราะมันมีประโยชน์มากต่ออนาคตของฉัน ทำไมคุณถึงถามเหรอ?'],
    },
    wh_when: {
      easy: ['一般是下班之后的晚上。', 'Yībān shì xiàbān zhīhòu de wǎnshàng.', 'Biasanya malam hari setelah jam kerja.', 'ปกติช่วงค่ำหลังเลิกงานครับ/ค่ะ'],
      mission: ['我更喜欢周末有空的时候静下心来做。', 'Wǒ gèng xǐhuān zhōumò yǒu kòng de shíhòu jìng xià xīn lái zuò.', 'Lebih suka saat senggang di akhir pekan.', 'ฉันชอบทำช่วงวันหยุดสุดสัปดาห์ตอนมีเวลาว่าง'],
      rescue: ['大多数是在周末。你一般什么时候最方便？', 'Dàduōshù shì zài zhōumò. Nǐ yībān shénme shíhòu zuì fāngbiàn?', 'Kebanyakan saat akhir pekan. Kamu sendiri kapan paling senggang?', 'ส่วนใหญ่จะเป็นช่วงวันหยุด แล้วคุณสะดวกช่วงไหนที่สุดเหรอ?'],
    },
    wh_who: {
      easy: ['一般是和朋友或者同学一起。', 'Yībān shì hé péngyǒu huòzhě tóngxué yīqǐ.', 'Biasanya bersama teman atau rekan sekelas.', 'ปกติไปกับเพื่อนหรือเพื่อนร่วมชั้นครับ/ค่ะ'],
      mission: ['我经常和学校里关系挺好的朋友一块儿去。', 'Wǒ jīngcháng hé xuéxiào lǐ guānxì tǐng hǎo de péngyǒu yīkuàir qù.', 'Sering pergi dengan kawan akrab di sekolah.', 'ฉันมักจะไปกับเพื่อนสนิทที่โรงเรียน'],
      rescue: ['和我最好的朋友一起。你平时一般跟谁在一起？', 'Hé wǒ zuì hǎo de péngyǒu yīqǐ. Nǐ píngshí yībān gēn shéi zài yīqǐ?', 'Bersama sahabat terbaikku. Kamu sendiri biasanya kumpul sama siapa?', 'ไปกับเพื่อนสนิท แล้วปกติคุณชอบอยู่กับใครเหรอ?'],
    },
    yesno_are: {
      easy: ['是的，确实是这样。', 'Shì de, quèshí shì zhèyàng.', 'Ya, memang begitu.', 'ใช่ เป็นอย่างนั้นจริงๆ ครับ/ค่ะ'],
      mission: ['是的，目前一切都挺顺利的。', 'Shì de, mùqián yīqiè dōu tǐng shùnlì de.', 'Ya, saat ini semuanya berjalan lancar.', 'ใช่ ตอนนี้ทุกอย่างราบรื่นดีเลย'],
      rescue: ['是的！你今天也过得挺顺心的吗？', 'Shì de! Nǐ jīntiān yě guò de tǐng shùnxīn de ma?', 'Ya! Apakah harimu hari ini juga lancar menyenangkan?', 'ใช่เลย! วันนี้ของคุณราบรื่นดีเหมือนกันไหม?'],
    },
    yesno_can: {
      easy: ['没问题，我可以做到。', 'Méi wèntí, wǒ kěyǐ zuò dào.', 'Tidak masalah, saya bisa melakukannya.', 'ไม่มีปัญหา ฉันทำได้ครับ/ค่ะ'],
      mission: ['可以的，我之前稍微练习过这个。', 'Kěyǐ de, wǒ zhīqián shāowēi liànxí guò zhè gè.', 'Bisa kok, sebelumnya saya sudah sempat melatih ini.', 'ทำได้นะ ก่อนหน้านี้ฉันเคยฝึกเรื่องนี้มาบ้าง'],
      rescue: ['我想我可以！你有什么好建议吗？', 'Wǒ xiǎng wǒ kěyǐ! Nǐ yǒu shénme hǎo jiànyì ma?', 'Kurasa bisa! Kamu punya saran yang bagus?', 'ฉันคิดว่าทำได้นะ! คุณมีคำแนะนำดีๆ บ้างไหม?'],
    },
    yesno_have: {
      easy: ['有的，我之前尝试过。', 'Yǒu de, wǒ zhīqián chángshì guò.', 'Pernah, saya sudah pernah mencobanya.', 'เคยครับ/ค่ะ ฉันเคยลองมาก่อนแล้ว'],
      mission: ['有的，我之前去过一次，感觉印象很深。', 'Yǒu de, wǒ zhīqián qù guò yī cì, gǎnjué yìnxiàng hěn shēn.', 'Pernah, dulu pernah ke sana sekali dan sangat berkesan.', 'เคยนะ ฉันเคยไปครั้งหนึ่ง รู้สึกประทับใจมาก'],
      rescue: ['去过一次呢。你之前有去体验过吗？', 'Qù guò yī cì ne. Nǐ zhīqián yǒu qù tǐyàn guò ma?', 'Pernah sekali. Kamu sebelumnya sudah pernah mengalaminya?', 'เคยไปครั้งหนึ่ง แล้วก่อนหน้านี้คุณเคยไปสัมผัสดูไหม?'],
    },
    yesno_did: {
      easy: ['是的，我最近刚去过。', 'Shì de, wǒ zuìjìn gāng qù guò.', 'Ya, saya baru saja pergi baru-baru ini.', 'ใช่ ฉันเพิ่งไปมาเมื่อเร็วๆ นี้เองครับ/ค่ะ'],
      mission: ['对呀，我上周去了一趟，感觉特别棒。', 'Duì ya, wǒ shàng zhōu qù le yī tàng, gǎnjué tèbié bàng.', 'Betul, saya pergi minggu lalu dan rasanya mantap sekali.', 'ใช่เลย สัปดาห์ก่อนฉันไปมา รู้สึกสุดยอดมาก'],
      rescue: ['是的！你上周末过得也挺精彩吗？', 'Shì de! Nǐ shàng zhōumò guò de yě tǐng jīngcǎi ma?', 'Ya! Apakah akhir pekanmu juga seru?', 'ใช่เลย! แล้วสุดสัปดาห์ที่ผ่านมาของคุณสนุกสนานดีเหมือนกันไหม?'],
    },
    yesno_would: {
      easy: ['好的，我非常愿意。', 'Hǎo de, wǒ fēicháng yuànyì.', 'Baik, saya sangat bersedia.', 'ดีเลย ฉันยินดีเป็นอย่างยิ่งครับ/ค่ะ'],
      mission: ['太好了，听起来是一个非常好的提议。', 'Tài hǎo le, tīng qǐlái shì yī gè fēicháng hǎo de tíyì.', 'Mantap, kedengarannya usulan yang sangat bagus.', 'ยอดไปเลย ฟังดูเป็นข้อเสนอที่ยอดเยี่ยมมาก'],
      rescue: ['我挺乐意的！那个时间你方便吗？', 'Wǒ tǐng lèyì de! Nà gè shíjiān nǐ fāngbiàn ma?', 'Saya senang sekali! Apakah di waktu itu kamu senggang?', 'ฉันยินดีเลยนะ! แล้วเวลานั้นคุณสะดวกไหม?'],
    },
    yesno_do: {
      easy: ['是的，我挺喜欢的。', 'Shì de, wǒ tǐng xǐhuān de.', 'Ya, saya menyukainya.', 'ใช่ ฉันชอบสิ่งนี้ครับ/ค่ะ'],
      mission: [topic ? `是的，我非常喜欢${topic}。` : '是的，我觉得这非常有意思。', topic ? `Shì de, wǒ fēicháng xǐhuān ${toPhoneticPinyin(topic)}.` : 'Shì de, wǒ juéde zhè fēicháng yǒu yìsi.', topic ? `Ya, saya sangat suka "${toPhoneticPinyin(topic)}".` : 'Ya, kurasa ini sangat menarik.', topic ? `ใช่ ฉันชอบ "${toPhoneticPinyin(topic)}" มากเลย` : 'ใช่ ฉันคิดว่าสิ่งนี้น่าสนใจมาก'],
      rescue: ['是的！你平时也喜欢这个吗？', 'Shì de! Nǐ píngshí yě xǐhuān zhè gè ma?', 'Ya! Kamu sendiri biasanya suka ini juga?', 'ใช่เลย! แล้วปกติคุณชอบสิ่งนี้เหมือนกันไหม?'],
    },
    greeting: {
      easy: ['你好！今天很高兴跟你聊天。', 'Nǐ hǎo! Jīntiān hěn gāoxìng gēn nǐ liáotiān.', 'Halo! Senang bisa mengobrol denganmu hari ini.', 'สวัสดี! วันนี้ยินดีที่ได้คุยกับคุณนะ'],
      mission: ['你好呀！我今天状态挺不错的，准备好练习了。', 'Nǐ hǎo ya! Wǒ jīntiān zhuàngtài tǐng bùcuò de, zhǔnbèi hǎo liànxí le.', 'Halo! Keadaanku prima hari ini, siap berlatih.', 'สวัสดี! วันนี้ฉันรู้สึกดีมาก พร้อมฝึกแล้ว'],
      rescue: ['你好！你今天过得怎么样？', 'Nǐ hǎo! Nǐ jīntiān guò de zěnmeyàng?', 'Halo! Bagaimana kabarmu hari ini?', 'สวัสดี! วันนี้ของคุณเป็นอย่างไรบ้าง?'],
    },
    statement: {
      easy: ['原来是这样，确实很有道理！', 'Yuánlái shì zhèyàng, quèshí hěn yǒu dàolǐ!', 'Begitu rupanya, memang sangat masuk akal!', 'อย่างนี้นี่เอง ฟังดูสมเหตุสมผลจริงๆ!'],
      mission: ['这个观点挺有意思的，我之前还真没这么想过。', 'Zhè gè guāndiǎn tǐng yǒu yìsi de, wǒ zhīqián hái zhēn méi zhème xiǎng guò.', 'Sudut pandang yang menarik, saya belum pernah terpikir begitu.', 'มุมมองนี้น่าสนใจมาก ฉันไม่เคยคิดแบบนี้มาก่อนเลย'],
      rescue: ['真的吗？能跟我多分享一些细节吗？', 'Zhēn de ma? Néng gēn wǒ duō fēnxiǎng yīxiē xìjié ma?', 'Benarkah? Bisakah berbagi lebih banyak detail denganku?', 'จริงเหรอ? คุณช่วยเล่ารายละเอียดเพิ่มเติมให้ฟังหน่อยได้ไหม?'],
    },
  };

  const table = params.targetLang === 'ja' ? JA : params.targetLang === 'zh' ? ZH : EN;
  const tpl = table[act] || table.statement;

  const meta: Array<{
    tier: 'easy' | 'mission' | 'rescue';
    badgeId: string;
    badgeTh: string;
    row: CardRow;
  }> = [
    { tier: 'easy', badgeId: 'Singkat & Mudah', badgeTh: 'สั้นและง่าย', row: tpl.easy },
    { tier: 'mission', badgeId: 'Alami & Kontekstual', badgeTh: 'เป็นธรรมชาติ', row: tpl.mission },
    { tier: 'rescue', badgeId: 'Jawab + Tanya Balik', badgeTh: 'ตอบและถามกลับ', row: tpl.rescue },
  ];

  const stamp = Date.now();
  const sanitizePron = (p: string, lang: TargetLang, fallbackText: string) => {
    let cleanP = String(p || '').trim();
    if (lang === 'zh') {
      if (!cleanP || containsHanzi(cleanP)) {
        cleanP = toPhoneticPinyin(fallbackText);
      }
      return cleanP.replace(/[\u3400-\u4DBF\u4E00-\u9FFF]/g, '').trim();
    }
    if (lang === 'ja') {
      if (!cleanP || /[\u3040-\u30ff\u3400-\u4DBF\u4E00-\u9FFF]/.test(cleanP)) {
        cleanP = toPhoneticRomaji(fallbackText);
      }
      return cleanP.replace(/[\u3040-\u30ff\u3400-\u4DBF\u4E00-\u9FFF]/g, '').trim();
    }
    return cleanP;
  };

  const sanitizeHint = (h: string, lang: TargetLang) => {
    if (!h) return '';
    return h
      .replace(/["'“‘「『]([\u4e00-\u9fff\u3040-\u30ff]+)["'”’」』]/g, (_m, inner) => {
        if (lang === 'zh') return `"${toPhoneticPinyin(inner)}"`;
        if (lang === 'ja') return `"${toPhoneticRomaji(inner)}"`;
        return inner;
      })
      .replace(/[\u4e00-\u9fff\u3040-\u30ff]+/g, (run) => {
        if (lang === 'zh') {
          const py = toPhoneticPinyin(run);
          return py ? `"${py}"` : '';
        }
        if (lang === 'ja') {
          const ro = toPhoneticRomaji(run);
          return ro ? `"${ro}"` : '';
        }
        return '';
      })
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  return meta.map((m, i) => ({
    id: `fb_ctx_${stamp}_${i}`,
    tier: m.tier,
    badgeId: m.badgeId,
    badgeTh: m.badgeTh,
    text: m.row[0],
    pronunciation: sanitizePron(m.row[1], params.targetLang, m.row[0]),
    hintId: sanitizeHint(m.row[2], params.targetLang),
    hintTh: sanitizeHint(th ? m.row[3] : m.row[2], params.targetLang),
    isRealtimeAi: false,
    isOfflineFallback: true,
    wordBreakdown: [],
  }));
}

function normalizeServerCopilotCards(
  rawList: unknown,
  targetLang: TargetLang
): BeginnerReplyCard[] {
  if (!Array.isArray(rawList)) return [];
  const defaultMeta: Array<{ tier: 'easy' | 'mission' | 'rescue'; badgeId: string; badgeTh: string }> = [
    { tier: 'easy', badgeId: 'Singkat & Mudah', badgeTh: 'สั้นและง่าย' },
    { tier: 'mission', badgeId: 'Alami & Kontekstual', badgeTh: 'เป็นธรรมชาติ' },
    { tier: 'rescue', badgeId: 'Jawab + Tanya Balik', badgeTh: 'ตอบและถามกลับ' },
  ];
  const out: BeginnerReplyCard[] = [];
  for (let i = 0; i < rawList.length && out.length < 3; i++) {
    const item = rawList[i] as Record<string, unknown> | null;
    if (!item || typeof item !== 'object') continue;
    const text = stripEmojisAndEmotWords(String(item.text || '')).trim();
    if (!text || !replyLooksLikeTargetLanguage(text, targetLang)) continue;
    const meta = defaultMeta[out.length] || defaultMeta[0];
    const rawPron = stripEmojisAndEmotWords(String(item.pronunciation || item.phonetic || '')).trim();

    // STRICT SANITIZATION: Zero Hanzi/Kanji in pronunciation
    let safePron = '';
    if (targetLang === 'zh') {
      if (rawPron && !containsHanzi(rawPron)) {
        safePron = rawPron;
      } else {
        safePron = toPhoneticPinyin(text);
      }
      safePron = safePron.replace(/[\u3400-\u4DBF\u4E00-\u9FFF]/g, '').trim();
    } else if (targetLang === 'ja') {
      if (rawPron && !/[\u3040-\u30ff\u3400-\u4DBF\u4E00-\u9FFF]/.test(rawPron)) {
        safePron = rawPron;
      } else {
        safePron = toPhoneticRomaji(text);
      }
      safePron = safePron.replace(/[\u3040-\u30ff\u3400-\u4DBF\u4E00-\u9FFF]/g, '').trim();
    } else {
      safePron = rawPron || text;
    }

    const rawHintId = stripEmojisAndEmotWords(String(item.hintId || item.translationId || item.hint || '')).trim();
    const rawHintTh = stripEmojisAndEmotWords(String(item.hintTh || item.translationTh || item.hint || rawHintId)).trim();

    const sanitizeHint = (h: string) => {
      return h
        .replace(/["'“‘「『]([\u4e00-\u9fff\u3040-\u30ff]+)["'”’」』]/g, (_m, inner) => {
          if (targetLang === 'zh') return `"${toPhoneticPinyin(inner)}"`;
          if (targetLang === 'ja') return `"${toPhoneticRomaji(inner)}"`;
          return inner;
        })
        .replace(/[\u4e00-\u9fff\u3040-\u30ff]+/g, (run) => {
          if (targetLang === 'zh') {
            const py = toPhoneticPinyin(run);
            return py ? `"${py}"` : '';
          }
          if (targetLang === 'ja') {
            const ro = toPhoneticRomaji(run);
            return ro ? `"${ro}"` : '';
          }
          return '';
        })
        .replace(/\s{2,}/g, ' ')
        .trim();
    };

    out.push({
      id: String(item.id || `ai_rt_${Date.now()}_${out.length}`),
      tier:
        item.tier === 'easy' || item.tier === 'mission' || item.tier === 'rescue'
          ? item.tier
          : meta.tier,
      badgeId: stripEmojisAndEmotWords(String(item.badgeId || item.levelLabel || meta.badgeId)).trim() || meta.badgeId,
      badgeTh: stripEmojisAndEmotWords(String(item.badgeTh || meta.badgeTh)).trim() || meta.badgeTh,
      text,
      pronunciation: safePron,
      hintId: sanitizeHint(rawHintId),
      hintTh: sanitizeHint(rawHintTh),
      isRealtimeAi: true,
      wordBreakdown: [],
    });
  }
  return out;
}

export async function requestRealtimeCopilotAssist(params: {
  aiText?: string;
  aiQuestionText?: string;
  lastUserText?: string;
  scenario: CallScenario;
  persona?: VoicePersona;
  targetLang: TargetLang;
  locale: LearnerLocale;
  history?: Array<{ speaker: 'ai' | 'user'; text: string }>;
  variationSeed?: number;
  excludeTexts?: string[];
  signal?: AbortSignal;
  budgetMs?: number;
}): Promise<RealtimeCopilotAssistResult> {
  const empty: RealtimeCopilotAssistResult = { ok: false, source: 'ai-realtime', aiMeaningId: '', aiMeaningTh: '', replies: [], cards: [] };
  const cleanAiText = stripEmojisAndEmotWords(params.aiText || params.aiQuestionText || '').trim();
  if (!cleanAiText || params.signal?.aborted) return empty;

  const variationSeed = params.variationSeed || 0;
  const cacheKey = `${params.targetLang}::${cleanAiText.toLowerCase()}::${(params.lastUserText || '').trim().toLowerCase()}`;
  if (variationSeed === 0 && (!params.excludeTexts || params.excludeTexts.length === 0)) {
    const cached = _copilotTurnCache.get(cacheKey);
    if (cached && cached.replies.length > 0) return cached;
  }

  const fallback = (): RealtimeCopilotAssistResult => {
    const cards = buildContextualFallbackCards({
      aiText: cleanAiText,
      targetLang: params.targetLang,
      locale: params.locale,
      lastUserText: params.lastUserText,
      variationSeed,
      excludeTexts: params.excludeTexts,
    });
    const meaning = translateAndPhoneticizeLiveText(cleanAiText, params.targetLang);
    return {
      ok: true,
      source: 'ai-realtime',
      aiMeaningId: meaning.translationId || '',
      aiMeaningTh: meaning.translationTh || '',
      replies: cards,
      cards,
    };
  };

  // Instant 0ms local copilot cards on initial scenario opening greeting (zero wasted API quota on mount)
  if (!params.lastUserText && variationSeed === 0 && (!params.history || params.history.length <= 1)) {
    const initialRes = fallback();
    copilotCacheSet(cacheKey, initialRes);
    return initialRes;
  }

  const budgetMs = Math.max(1000, Math.min(params.budgetMs ?? 3500, 5000));
  const deadline = Date.now() + budgetMs;

  // 1) Fast-Path: kunci Gemini pribadi murid (gemini-3-flash-preview)
  let userGeminiKey = '';
  try {
    if (typeof localStorage !== 'undefined') {
      userGeminiKey = (localStorage.getItem('fz_gemini_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('GEMINI_API_KEY') || '').trim();
    }
  } catch {
    // Ignore
  }
  if (userGeminiKey.length > 10 && !params.signal?.aborted) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(4000, deadline - Date.now()));
    try {
      const langSpec = params.targetLang === 'ja'
        ? 'Japanese (N5-N3, Kanji+Hiragana, NO emojis; word-spaced Hepburn Romaji in pronunciation)'
        : params.targetLang === 'zh'
          ? 'Mandarin Chinese (HSK1-HSK3, Simplified Chinese characters, NO emojis; tone-marked Pinyin in pronunciation)'
          : 'English (A2-B1, NO emojis; easy phonetic guide in pronunciation)';
      const learnerLangName = params.locale === 'th' ? 'Thai' : 'Indonesian';
      const hist = (params.history || []).slice(-6).map((h) => `- ${h.speaker === 'user' ? 'Learner' : 'Partner'}: "${h.text}"`).join('\n');
      const prompt = [
        `Speech Copilot (${params.scenario.titleId}). Target: ${langSpec}.`,
        hist ? `Context:\n${hist}` : '',
        params.lastUserText ? `Learner said: "${params.lastUserText}"` : '',
        `Partner said: "${cleanAiText}"`,
        params.excludeTexts?.length ? `Do NOT repeat: ${JSON.stringify(params.excludeTexts)}.` : '',
        `Generate 3 spontaneous spoken replies directly answering it (easy=1 short sentence, mission=natural reply with detail, rescue=reply + question back). Translate it into aiMeaning (${learnerLangName}); each reply's first-person translation in hint (${learnerLangName}).`,
        `JSON only: {"aiMeaning":"...","replies":[{"tier":"easy","text":"...","pronunciation":"...","hint":"..."},{"tier":"mission","text":"...","pronunciation":"...","hint":"..."},{"tier":"rescue","text":"...","pronunciation":"..."}]}`,
      ].filter(Boolean).join('\n');
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Revision': '2026-05-20',
          'x-goog-api-key': userGeminiKey,
        },
        body: JSON.stringify({
          model: 'gemini-3.1-flash-lite',
          input: prompt,
          response_mime_type: 'application/json',
          generation_config: {
            temperature: variationSeed > 0 ? 0.75 : 0.45,
            max_output_tokens: 600,
            thinking_level: 'minimal',
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const outputs = Array.isArray(data?.outputs) ? data.outputs : [];
        const textOut = outputs.find((o: any) => o && o.type === 'text' && typeof o.text === 'string');
        const raw = String(textOut?.text || data?.candidates?.[0]?.content?.parts?.[0]?.text || '')
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        const parsed = raw ? JSON.parse(raw) : null;
        const cards = normalizeServerCopilotCards(parsed?.replies, params.targetLang);
        if (cards.length > 0) {
          const meaning = stripEmojisAndEmotWords(String(parsed?.aiMeaning || '')).trim();
          const result: RealtimeCopilotAssistResult = {
            ok: true, source: 'ai-realtime',
            aiMeaningId: params.locale === 'id' ? meaning : '',
            aiMeaningTh: params.locale === 'th' ? meaning : '',
            replies: cards, cards,
          };
          if (variationSeed === 0) copilotCacheSet(cacheKey, result);
          return result;
        }
      }
    } catch {
      clearTimeout(timer);
    }
  }

  // 2) Server pool, dilewati sementara bila server baru saja menjawab 503/429 (circuit breaker 20 dtk)
  const payload = {
    aiText: cleanAiText,
    lastUserText: params.lastUserText || '',
    scenarioTitle: params.scenario.titleId,
    scenarioId: params.scenario.id,
    personaName: params.persona?.name || '',
    targetLang: params.targetLang,
    locale: params.locale,
    history: (params.history || []).slice(-6),
    variationSeed,
    excludeTexts: params.excludeTexts || [],
  };

  if (Date.now() < _copilotServerCooldownUntil) {
    return fallback();
  }

  for (const base of resolveVoiceApiCandidateBases()) {
    if (params.signal?.aborted) return empty;
    const remaining = deadline - Date.now();
    if (remaining < 600) break;
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    params.signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      const res = await fetch(`${base}/api/voice/copilot-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'cors',
        signal: controller.signal,
      });
      clearTimeout(timer);
      params.signal?.removeEventListener('abort', onAbort);
      if (res.status === 429) {
        const ra = Number(res.headers.get('retry-after') || 0);
        _copilotServerCooldownUntil = Date.now() + (ra > 0 ? Math.min(ra, 30) * 1000 : 8000);
        continue;
      }
      if (res.status === 503) {
        continue;
      }
      if (res.ok) {
        const data = await res.json();
        const cards = normalizeServerCopilotCards(data?.replies || data?.suggestions, params.targetLang);
        if (cards.length > 0) {
          const result: RealtimeCopilotAssistResult = {
            ok: true, source: 'ai-realtime',
            aiMeaningId: stripEmojisAndEmotWords(String(data?.aiMeaningId || '')).trim(),
            aiMeaningTh: stripEmojisAndEmotWords(String(data?.aiMeaningTh || '')).trim(),
            replies: cards, cards,
          };
          if (variationSeed === 0) copilotCacheSet(cacheKey, result);
          return result;
        }
      }
    } catch {
      clearTimeout(timer);
      params.signal?.removeEventListener('abort', onAbort);
    }
  }

  // 3) Tidak ada AI realtime dalam budget → kartu kontekstual lokal (tidak pernah kosong).
  return fallback();
}

/**
 * Synthesizes a natural, grammatical reformulation of the student's EXACT words,
 * addressing their exact grammar/morphology/spelling misconception while strictly
 * preserving their original intended meaning and words.
 */
export function synthesizeNaturalReformulation(
  rawText: string,
  targetLang: TargetLang,
  _misconceptionId?: string
): string {
  let text = (rawText || '').trim();
  if (!text) return '';

  if (targetLang === 'en') {
    // 1. Clean introductory hesitation sounds ("ahem", "ahm", "uh", "um", "ah")
    text = text.replace(/^\s*\b(ahem|ahm|uh|um|er|ah)\b\s*[,.]*\s*/i, '');

    // 2. Fix common spoken typos & possessive pronouns (e.g. "mine jobe" -> "my job")
    text = text.replace(/\bmine\s+([a-zA-Z]+)\b/gi, (_match, word) => {
      if (word.toLowerCase() === 'jobe') return 'my job';
      return `my ${word}`;
    });
    text = text.replace(/\bjobe\b/gi, 'job');
    text = text.replace(/\ban\s+apps\b/gi, 'an app');
    text = text.replace(/\ba\s+apps\b/gi, 'an app');
    text = text.replace(/\byour's\s+([a-zA-Z]+)\b/gi, 'your $1');
    text = text.replace(/\byours\s+([a-zA-Z]+)\b/gi, 'your $1');

    // 3. Fix Redundant 'Be' before Base Verb (e.g. "I'm agree" -> "I agree", "I am think" -> "I think")
    text = text.replace(
      /\b(i|we|they|you)\s+am\s+(agree|disagree|think|believe|want|need|prefer|like|know|understand|feel)\b/gi,
      '$1 $2'
    );
    text = text.replace(
      /\bi'm\s+(agree|disagree|think|believe|want|need|prefer|like|know|understand|feel)\b/gi,
      'I $1'
    );
    text = text.replace(
      /\b(you|we|they)\s+are\s+(agree|disagree|think|believe|want|need|prefer|like|know|understand|feel)\b/gi,
      '$1 $2'
    );
    text = text.replace(
      /\b(he|she|it)\s+is\s+(agree|disagree|think|believe|want|need|prefer|like|know|understand|feel)\b/gi,
      '$1 $2s'
    );

    // 4. Fix Double Conjunctions: "Although A, but B" -> "Although A, B"
    text = text.replace(/\b(although|though)\b([^.?!]+?),\s*but\b/gi, '$1$2,');
    text = text.replace(/\bbecause\b([^.?!]+?),\s*so\b/gi, 'Because$1,');

    // 5. Fix Missing Auxiliary in Progressive: "I still figuring" -> "I am still figuring"
    text = text.replace(
      /\b(i)\s+still\s+(figuring|finding|working|trying|looking|learning)\b/gi,
      'I am still $2'
    );
    text = text.replace(
      /\b(i)\s+(meeting|going|studying|working|eating|drinking|buying|staying|visiting|reading|waiting)\b/gi,
      'I am $2'
    );
    text = text.replace(
      /\b(we|they|you)\s+(meeting|going|studying|working|eating|drinking)\b/gi,
      '$1 are $2'
    );
    text = text.replace(
      /\b(he|she)\s+(meeting|going|studying|working|eating|drinking)\b/gi,
      '$1 is $2'
    );

    // 6. Fix Modal + to: "can to do" -> "can do"
    text = text.replace(/\b(can|could|must|should|will|would)\s+to\s+([a-zA-Z]+)\b/gi, '$1 $2');

    // 7. Fix Irregular Past Tense: "goed" -> "went"
    text = text.replace(/\bgoed\b/gi, 'went');
    text = text.replace(/\bbuyed\b/gi, 'bought');
    text = text.replace(/\beated\b/gi, 'ate');
    text = text.replace(/\bdrinked\b/gi, 'drank');

    // 8. Fix Word Order & Prepositions
    text = text.replace(/\bwent\s+i\b/gi, 'I went');
    text = text.replace(/\bbought\s+i\b/gi, 'I bought');
    text = text.replace(/\bate\s+i\b/gi, 'I ate');
    text = text.replace(/\b(went|go)\s+(bandung|jakarta|bali|tokyo|osaka|kyoto)\b/gi, '$1 to $2');
    text = text.replace(/\b(in|go)\s+library\b/gi, 'at the library');

    // 8b. Fix Redundant Subject Pronoun after Noun: "this app it has" -> "this app has"
    text = text.replace(/\b(this\s+[a-zA-Z]+|the\s+[a-zA-Z]+|my\s+[a-zA-Z]+)\s+(it|he|she|they)\s+/gi, '$1 ');

    // 8c. Fix Copula before Sensory Verbs & "similar with": "it is look similar with" -> "it looks similar to"
    text = text.replace(/\b(it|this|that)\s+is\s+(look|seem|sound|taste|feel)s?\b/gi, '$1 $2s');
    text = text.replace(/\b(it|this|that)'s\s+(look|seem|sound|taste|feel)s?\b/gi, '$1 $2s');
    text = text.replace(/\bsimilar\s+with\b/gi, 'similar to');

    // 9. Fix Bare Want in Service Request Context
    text = text.replace(
      /\bi\s+want\s+(a\s+|an\s+)?(hot\s+|iced\s+)?(coffee|latte|tea|espresso|water)\b/gi,
      'I would like a $2$3, please'
    );

    // Clean spacing and formatting
    text = text.replace(/\s{2,}/g, ' ').trim();
    if (text.length > 0) {
      text = text.charAt(0).toUpperCase() + text.slice(1);
      if (!/[.!?]$/.test(text)) {
        text += '.';
      }
    }
    return text;
  }

  if (targetLang === 'ja') {
    // Clean hesitation sounds
    text = text.replace(/^(\s*(えっと|ええと|あの[ね]?|う[ー~]*ん|ああ|うん)\s*[,、]*\s*)+/, '');
    // Fix subject / object particle slip
    text = text.replace(/(私|僕|俺|君|あなた)を(行き|来|食べ|飲み|勉強し)/g, '$1は$2');
    // Fix verb dict + desu: "飲むです" -> "飲みます"
    text = text.replace(/飲むです/g, '飲みます');
    text = text.replace(/食べるです/g, '食べます');
    text = text.replace(/勉強するです/g, '勉強します');
    // Fix location particle: "図書館に勉強" -> "図書館で勉強"
    text = text.replace(/(図書館|カフェ|部屋|学校|うち|家|教室)に(勉強|練習|仕事|読書)(する|します|した|しました)/g, '$1で$2$3');

    // Fix past tense slips
    text = text.replace(/行きますでした/g, '行きました');
    text = text.replace(/食べますでした/g, '食べました');
    text = text.replace(/飲みますでした/g, '飲みました');
    text = text.replace(/見ますでした/g, '見ました');
    text = text.replace(/言いますでした/g, '言いました');
    // Fix i-adjective past: "美味しいでした" -> "美味しかったです"
    text = text.replace(/美味しいでした/g, '美味しかったです');
    text = text.replace(/いいでした/g, 'よかったです');
    // Fix na-adjective / noun double copula
    text = text.replace(/静かでしたです/g, '静かでした');
    text = text.replace(/綺麗でしたです/g, '綺麗でした');
    // Fix conditional tara: "勉強するたら" -> "勉強したら"
    text = text.replace(/勉強するたら/g, '勉強したら');
    text = text.replace(/行くたら/g, '行ったら');
    text = text.replace(/食べるたら/g, '食べたら');

    text = text.replace(/\s{2,}/g, ' ').trim();
    return text;
  }

  if (targetLang === 'zh') {
    text = text.replace(/^(\s*(呃|嗯|那个|就是)\s*[,，]*\s*)+/u, '');
    text = text.replace(/(我|你|他|她|我们)是(喜欢|想|要|去|吃|喝|觉得|知道)/gu, '$1$2');
    text = text.replace(/一个(咖啡|拿铁|美式|奶茶|茶|水|牛奶|果汁)/gu, '一杯$1');
    text = text.replace(/不(吃|喝|去|看|买|做)了昨天/gu, '昨天没$1');
    text = text.replace(/很非常/gu, '非常');
    text = text.replace(/\s{2,}/g, ' ').trim();
    return text;
  }

  return text;
}

/**
 * Acoustic & Script Sanitizer, Rejects Russian/Cyrillic and unrelated foreign-script ASR hallucinations
 * before they can pollute live transcripts, trigger Russian replies, or enter Braincore memory.
 */
export function sanitizeHallucinatedTranscript(
  rawText: string,
  targetLang: TargetLang = 'ja',
  locale: LearnerLocale = 'id'
): string {
  const text = String(rawText || '');
  if (!text.trim()) return '';

  const locCode = String(locale || 'id').toLowerCase().split(/[-_]/)[0];

  // Forbidden scripts that indicate unconstrained multilingual ASR misfire (unless matching the learner's UI locale)
  const forbiddenScriptRegex =
    locCode === 'ru'
      ? /[\u0370-\u03FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\uAC00-\uD7AF\u1100-\u11FF]/g
      : locCode === 'ko'
        ? /[\u0400-\u052F\u2DE0-\u2DFF\uA640-\uA69F\u0370-\u03FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F]/g
        : locCode === 'ar'
          ? /[\u0400-\u052F\u2DE0-\u2DFF\uA640-\uA69F\u0370-\u03FF\u0590-\u05FF\u0900-\u097F\uAC00-\uD7AF\u1100-\u11FF]/g
          : /[\u0400-\u052F\u2DE0-\u2DFF\uA640-\uA69F\u0370-\u03FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\uAC00-\uD7AF\u1100-\u11FF]/g;

  const forbiddenMatches = text.match(forbiddenScriptRegex);
  if (forbiddenMatches && forbiddenMatches.length > 0) {
    const stripped = text.replace(forbiddenScriptRegex, ' ').replace(/\s{2,}/g, ' ').trim();
    const validScriptRegex =
      targetLang === 'ja'
        ? locCode === 'th'
          ? /[A-Za-zÀ-ÖØ-öø-ÿ\u1E00-\u1EFF\u3040-\u30FF\u4E00-\u9FAF\u0E00-\u0E7F]/g
          : /[A-Za-zÀ-ÖØ-öø-ÿ\u1E00-\u1EFF\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FAF]/g
        : targetLang === 'zh'
          ? locCode === 'th'
            ? /[A-Za-zÀ-ÖØ-öø-ÿ\u1E00-\u1EFF\u4E00-\u9FFF\u0E00-\u0E7F]/g
            : /[A-Za-zÀ-ÖØ-öø-ÿ\u1E00-\u1EFF\u0400-\u04FF\u4E00-\u9FFF]/g
          : locCode === 'th'
            ? /[A-Za-zÀ-ÖØ-öø-ÿ\u1E00-\u1EFF\u0E00-\u0E7F]/g
            : /[A-Za-zÀ-ÖØ-öø-ÿ\u1E00-\u1EFF\u0400-\u04FF]/g;
    const validMatches = stripped.match(validScriptRegex) || [];
    if (validMatches.length < 2 || forbiddenMatches.length >= validMatches.length) {
      return '';
    }
    return stripped;
  }

  // If locale is not Thai ('th'), Thai script should also be stripped from ASR hallucinations
  if (locCode !== 'th' && /[\u0E00-\u0E7F]/.test(text)) {
    const stripped = text.replace(/[\u0E00-\u0E7F]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    return stripped.length >= 2 ? stripped : '';
  }

  return text;
}

/**
 * Classic TTS Sanitizer, Removes literal laugh tokens ("haha", "wkwk", "あはは") before sending
 * to classical `/api/tts/line` (Edge-TTS) so the synthesizer never spells out robotic laughter.
 */
export function sanitizeSpokenTextForClassicTts(
  rawText: string,
  targetLang: TargetLang
): string {
  let clean = stripEmojisAndEmotWords(rawText).trim();
  if (!clean) return '';
  if (targetLang === 'ja') {
    clean = clean
      .replace(/^(?:あはは+|アハハ+|ハハハ+|ふふふ+|フフフ+|えへへ+)[！!、,。\s]*/u, '')
      .replace(/[（(]\s*(?:笑|わら|w+)\s*[）)]/giu, '')
      .trim();
  } else {
    clean = clean
      .replace(/^(?:ha\s*ha(?:\s*ha)*|he\s*he|hahaha+|haha+|hehe+|wkwk(?:wk)*)[!,.\s—-]*/i, '')
      .replace(/\b(?:hahaha+|haha|hehe|wkwk(?:wk)*)\b[!,.\s]*/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (clean.length > 0 && /^[a-z]/.test(clean)) {
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
  }
  return clean || stripEmojisAndEmotWords(rawText).trim();
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
    const hasPossessiveMineNoun =
      /\bmine\s+(job|jobe|work|house|home|friend|friends|family|brother|sister|car|school|office|hobby|life|name|team|project|idea)\b/i.test(
        lower
      );
    const hasItIsLookOrSimilarWith =
      /\b(it\s+is\s+look|it's\s+look|similar\s+with)\b/i.test(lower);
    const hasBareWantRequest =
      /\b(i\s+want\s+(hot\s+|iced\s+|a\s+)?(coffee|tea|latte|water|cake|drink|food)|give\s+me\s+coffee)\b/i.test(
        lower
      );

    const isAffirmationEn =
      /^(yes|no|sure|ok|okay|hi|hello|yep|nope|thanks|thank you|of course|why not|me too|i agree|hot coffee|iced coffee|iced tea|black coffee)[.!?]?$/i.test(
        lower
      ) ||
      /^(yes please|no thank you|sounds great|sounds good|not really|not yet|hot coffee, please|hot coffee please|iced latte please|iced latte, please)[.!?]?$/i.test(
        lower
      ) ||
      /\b(coffee|tea|latte|water|espresso)\s*,?\s*please\b/i.test(lower);

    const hasFiniteVerbOrGreeting =
      isAffirmationEn ||
      /\b(am|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|can|may|might|must|like|love|prefer|want|need|live|stay|work|study|go|went|come|came|eat|ate|drink|drank|buy|bought|visit|visited|meet|met|see|saw|read|think|believe|agree|disagree|feel|felt|save|saves|help|helps|make|makes|take|took|order|have|had|hello|hi|good\s+morning|good\s+afternoon|thank\s+you|thanks|yes|sure|please|sounds|great|fine)\b/i.test(
        lower
      ) || /\b(i'd|i'm|i'll|we're|we've|it's|that's|there's|don't|doesn't|didn't)\b/i.test(lower);

    const hasScenarioRelevance = (() => {
      if (isAffirmationEn) {
        return true;
      }
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
    const isTooShort = wordCount < 2 && !isAffirmationEn;
    const isOffTopicOrGibberish = !hasFiniteVerbOrGreeting || !hasScenarioRelevance;

    if (
      hasSubjectDrop ||
      hasBePlusBaseVerb ||
      hasDoubleConjunction ||
      hasMissingAuxProgressive ||
      hasBrokenWordOrderOrPrep ||
      hasPastTenseError ||
      hasModalToError ||
      hasPossessiveMineNoun ||
      hasItIsLookOrSimilarWith ||
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
          'Miskonsepsi Ganda: (1) Kata kerja "agree/want" adalah verba aktif/statif sehingga tidak boleh didahului "am/is/are" (gunakan "I agree", bukan "I am agree"). (2) Dalam satu kalimat kompleks, jangan gunakan "Although" dan "but" sekaligus, pilih salah satu.';
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
        misconceptionId = 'stative_verb_continuous';
        whyFailsId =
          'Miskonsepsi To Be + Kata Kerja Dasar: Jangan menaruh "am/is/are" di depan kata kerja murni seperti "want", "think", atau "agree". Gunakan langsung "I agree...", "I think...", atau bentuk sopan "I would like...".';
        whyFailsTh =
          'ความเข้าใจผิดเรื่อง To Be + กริยาแท้: ห้ามใส่ "am/is/are" หน้ากริยาแท้ เช่น want, think หรือ agree ให้ใช้ "I agree..." หรือ "I would like..."';
        syntacticCorrection = scenarioId.includes('ielts')
          ? 'I agree that remote work is good because it saves commuting time.'
          : "I'd like a hot coffee, please.";
      } else if (hasDoubleConjunction) {
        misconceptionId = 'double_conjunction_although_but';
        whyFailsId =
          'Miskonsepsi Konjungsi Ganda (Although ... but): Dalam tata bahasa Inggris, klausa yang diawali "Although" tidak boleh diikuti "but" pada klausa utama. Hapus kata "but".';
        whyFailsTh =
          'ความเข้าใจผิดเรื่องคำเชื่อมซ้อน (Although ... but): เมื่อใช้ "Although" แล้ว ห้ามใส่ "but" ซ้ำในประโยคหลัก';
        syntacticCorrection =
          'Although remote work saves commuting time, employees can feel lonely at home.';
      } else if (hasMissingAuxProgressive) {
        misconceptionId = 'missing_be_auxiliary_continuous';
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
        misconceptionId = 'past_tense_irregular_goed';
        whyFailsId =
          'Miskonsepsi Morfologi Past Simple: Untuk menceritakan pengalaman lampau, gunakan kata kerja bentuk kedua (V2 irregular: "went", "bought", "ate", bukan "go/goed", "buy/buyed", atau "eat/eated").';
        whyFailsTh =
          'ความเข้าใจผิดเรื่อง Past Simple: เมื่อเล่าเหตุการณ์ในอดีต ต้องใช้กริยาช่องที่ 2 (went, bought, ate ไม่ใช่ go/goed หรือ eat/eated)';
        syntacticCorrection =
          'Last weekend I went to Bandung with my family and we ate delicious local food.';
      } else if (hasPossessiveMineNoun) {
        misconceptionId = 'possessive_pronoun_mine_noun';
        whyFailsId =
          'Miskonsepsi Kata Ganti Kepemilikan: Jangan gunakan "mine" di depan kata benda (seperti "mine job"). Gunakan possessive determiner "my" sebelum kata benda ("my job").';
        whyFailsTh =
          'ความเข้าใจผิดเรื่องคำแสดงความเป็นเจ้าของ: ห้ามใช้ "mine" หน้าคำนามโดยตรง ให้ใช้ "my" หน้าคำนาม ("my job")';
        syntacticCorrection = 'I like my job.';
      } else if (hasItIsLookOrSimilarWith) {
        misconceptionId = 'preposition_collocation_similar_with';
        whyFailsId =
          'Miskonsepsi Verba Kopula & Preposisi Pasangan: Jangan gunakan "it is look" (gunakan "it looks") dan pasangan tepat untuk "similar" adalah "similar to" (bukan "similar with").';
        whyFailsTh =
          'ความเข้าใจผิดเรื่องกริยาและบุพบท: ห้ามใช้ "it is look" (ต้องใช้ "it looks") และคำว่า "similar" ต้องคู่กับ "to" ("similar to")';
        syntacticCorrection = 'It looks similar to Duolingo.';
      } else if (hasBareWantRequest) {
        misconceptionId = 'EN_PRAGMATIC_BARE_WANT';
        whyFailsId =
          'Miskonsepsi Pragmatis Kesopanan: Mengucapkan "I want..." secara langsung di kafe terdengar kurang sopan. Gunakan "I would like..." atau "Could I have...".';
        whyFailsTh =
          'การใช้ "I want..." โดยตรงฟังดูห้วนเกินไปในร้านอาหาร ควรใช้ "I would like..." หรือ "Could I have..."';
        syntacticCorrection =
          "I'd like an iced latte, please. Afterward, I plan to read at the library.";
      } else if (hasSubjectDrop || hasModalToError) {
        misconceptionId = hasModalToError ? 'modal_plus_to_infinitive' : 'EN_CLAUSE_SUBJECT_OMISSION';
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

      // ANTI-NONSENSE NATURAL REFORMULATION:
      // Derive natural reformulation directly from the learner's ACTUAL utterance!
      // Never force a canned scenario sentence (like "I'd like a hot coffee, please")
      // when the learner actually said "ahem All right, yeah, I'm agree" or "i like mine jobe".
      const naturalReform = synthesizeNaturalReformulation(exact, 'en', misconceptionId);
      if (
        naturalReform &&
        naturalReform.trim().toLowerCase() !== exact.trim().toLowerCase() &&
        naturalReform.split(/\s+/).length >= 2
      ) {
        syntacticCorrection = naturalReform;
      }

      const aiReply = scenarioId.includes('cafe')
        ? `Hold on! Drop the direct translation, use "I would like..." and "I am meeting... at the library." Say it back to me cleanly right now: "${syntacticCorrection}"`
        : scenarioId.includes('past') || scenarioId.includes('weekend')
          ? `Wait right there! For past events, use the real past tense verb like "went to..." and "ate...". Repeat this sentence aloud first: "${syntacticCorrection}"`
          : scenarioId.includes('ielts')
            ? `Hold on, let's fix that grammar slip right now: say "I agree" (never "I am agree") and don't pair "Although" with "but". Repeat cleanly: "${syntacticCorrection}"`
            : `Hold on, your grammar slipped there! Don't translate word-by-word in your head. Repeat this natural sentence out loud right now: "${syntacticCorrection}"`;

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
          ? `Tunggu dulu! Jangan terjemahkan mentah, gunakan "I would like..." serta "I am meeting... at the library." Coba ulangi kalimat yang benar sekarang: "${syntacticCorrection}"`
          : scenarioId.includes('past') || scenarioId.includes('weekend')
            ? `Stop sebentar! Untuk cerita masa lalu, wajib pakai kata kerja lampau V2 seperti "went to..." dan "ate...". Ulangi dengan lantang dulu: "${syntacticCorrection}"`
            : scenarioId.includes('ielts')
              ? `Tunggu dulu, kita luruskan grammar-mu sekarang: katakan "I agree" (tanpa "am") dan jangan gabungkan "Although" dengan "but". Ulangi dengan bersih: "${syntacticCorrection}"`
              : `Tunggu sebentar, grammar-mu meleset! Jangan terjemahkan kata-per-kata di kepala. Coba ulangi kalimat natural ini sekarang: "${syntacticCorrection}"`,
        aiReplyTranslationTh:
          'เดี๋ยวก่อน ไวยากรณ์ยังคลาดเคลื่อนอยู่ ลองพูดทวนประโยคที่ถูกต้องตามคำแนะนำนี้อีกครั้งนะ',
        nextSuggestedReplies: [],
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
      nextSuggestedReplies: [],
    };
  }

  // Mandarin Chinese (zh) evaluation, Braincore Copula, Measure Word, Negation & Word-Order Diagnostics
  if (targetLang === 'zh') {
    const hasCopulaBeforeVerb = /(我|你|他|她|我们)是(喜欢|想|要|去|吃|喝|觉得|知道|学习|工作)/u.test(exact);
    const hasWrongMeasureWordDrink = /一个(咖啡|拿铁|美式|奶茶|茶|水|牛奶|果汁)/u.test(exact);
    const hasPastBuLeTrap = /不(吃|喝|去|看|买|做)了(昨天|刚才|上个)/u.test(exact);
    const hasDoubleDegreeAdv = /很非常|非常很/u.test(exact);
    const isTooShortZh = exact.replace(/[^\u4E00-\u9FFFA-Za-z0-9]/g, '').length < 1;

    if (hasCopulaBeforeVerb || hasWrongMeasureWordDrink || hasPastBuLeTrap || hasDoubleDegreeAdv || isTooShortZh) {
      let misconceptionId = 'ZH_GRAMMAR_SLIP';
      let whyFailsId =
        'Susunan kalimat Mandarin masih terpengaruh terjemahan kata-per-kata. Perhatikan kata bantu dan kata penggolong yang tepat.';
      let whyFailsTh =
        'โครงสร้างประโยคภาษาจีนยังแปลตรงตัวเกินไป โปรดสังเกตคำลักษณนามและรูปประโยคที่ถูกต้อง';
      let syntacticCorrection = synthesizeNaturalReformulation(exact, 'zh') || scenario.sampleUtterances[0]?.text || '我想喝一杯冰美式咖啡。';

      if (hasCopulaBeforeVerb) {
        misconceptionId = 'zh_copula_shi_before_verb';
        whyFailsId =
          'Dalam bahasa Mandarin, jangan letakkan "是 (shì)" langsung di depan kata kerja seperti 喜欢/想/去. Langsung gunakan Subjek + Kata Kerja.';
        whyFailsTh =
          'ในภาษาจีน ห้ามวาง "是 (shì)" หน้าคำกริยาอย่าง 喜欢/想/去 ให้ใช้ ประธาน + กริยา ได้เลย';
      } else if (hasWrongMeasureWordDrink) {
        misconceptionId = 'zh_measure_word_ge_for_drink';
        whyFailsId =
          'Untuk minuman dalam cangkir/gelas, gunakan kata penggolong "一杯 (yī bēi)", bukan "一个 (yī gè)".';
        whyFailsTh =
          'สำหรับเครื่องดื่มในแก้วหรือถ้วย ต้องใช้คำลักษณนาม "一杯 (yī bēi)" ไม่ใช่ "一个 (yī gè)"';
      } else if (hasPastBuLeTrap) {
        misconceptionId = 'zh_past_negation_bu_vs_mei';
        whyFailsId =
          'Untuk menyatakan belum/tidak melakukan sesuatu di masa lampau, gunakan "没 (méi)" dan letakkan keterangan waktu sebelum kata kerja.';
        whyFailsTh =
          'การปฏิเสธเหตุการณ์ในอดีตต้องใช้ "没 (méi)" และวางคำบอกเวลาไว้หน้ากริยา';
      } else if (hasDoubleDegreeAdv) {
        misconceptionId = 'zh_double_degree_adverb';
        whyFailsId =
          'Jangan menumpuk dua kata keterangan tingkat seperti "很 (hěn)" dan "非常 (fēicháng)" bersamaan.';
        whyFailsTh =
          'ห้ามซ้อนคำวิเศษณ์บอกระดับ "很 (hěn)" กับ "非常 (fēicháng)" ในที่เดียวกัน';
      }

      const corrPinyin = toPhoneticPinyin(syntacticCorrection);
      return {
        ok: false,
        accuracyScore: 52,
        grammarScore: 46,
        fluencyScore: 68,
        vocabUsageScore: 66,
        userExactTranscript: exact,
        misconceptionId,
        whyFailsId,
        whyFailsTh,
        missingTokens: [],
        syntacticCorrection,
        naturalReformulation: syntacticCorrection,
        pedagogicalFeedbackId: whyFailsId,
        pedagogicalFeedbackTh: whyFailsTh,
        aiReply: `停一下！这句话不够地道哦。跟我清楚地读一遍：“${syntacticCorrection}”`,
        aiReplyTranslationId: `Tunggu sebentar! Kalimat barusan belum alami. Coba ulangi dengan jelas bersamaku: "${corrPinyin}"`,
        aiReplyTranslationTh: `เดี๋ยวก่อนนะ! ประโยคเมื่อกี้ยังไม่เป็นธรรมชาติ ลองพูดตามชัดๆ อีกครั้งนะ: "${corrPinyin}"`,
        nextSuggestedReplies: [],
      };
    }

    return {
      ok: true,
      accuracyScore: 94,
      grammarScore: 95,
      fluencyScore: 92,
      vocabUsageScore: 92,
      userExactTranscript: exact,
      misconceptionId: null,
      whyFailsId: null,
      whyFailsTh: null,
      missingTokens: [],
      syntacticCorrection: null,
      naturalReformulation: exact,
      pedagogicalFeedbackId: 'Susunan kata, kata penggolong, dan pilihan kosakata Mandarin sudah tepat dan alami.',
      pedagogicalFeedbackTh: 'การเรียงคำ คำลักษณนาม และการเลือกใช้คำศัพท์ภาษาจีนถูกต้องและเป็นธรรมชาติ',
      aiReply: '说得很地道！那我们继续聊，你平时还喜欢做什么呢？',
      aiReplyTranslationId: 'Pengucapanmu sangat alami! Yuk lanjut ngobrol, biasanya kamu suka melakukan kegiatan apa lagi?',
      aiReplyTranslationTh: 'พูดได้เป็นธรรมชาติมากเลย! มาคุยกันต่อนะ ปกติคุณชอบทำกิจกรรมอะไรอีกบ้าง?',
      nextSuggestedReplies: [],
    };
  }

  // Japanese (ja) evaluation, Strict Braincore Particle, Conjugation, & Register Diagnostics
  const hasVerbDictPlusDesu =
    /(飲む|食べる|行く|来る|する|見る|買う|読む|書く|話す|帰る|待つ|遊ぶ|休む|働く|勉強する|お願いする)\s*です/u.test(
      exact
    ) || /\b(nomu|taberu|iku|kuru|suru|miru|kau|yomu)\s+desu\b/i.test(lower);

  const hasPolitePastMasuDeshita =
    /(行きます|食べます|飲みます|見ます|言います|します|来ます|買います|読みます|書きます|話します|勉強します)でした/u.test(
      exact
    ) || /\b(ikimasu|tabemasu|nomimasu|shimasu|kimasu)\s+deshita\b/i.test(lower);

  const hasIAdjPastDeshita =
    /(美味しい|おいしい|いい|良い|忙しい|楽しい|面白い|難しい|易しい|高い|安い|暑い|寒い)でした/u.test(
      exact
    ) || /\b(oishii|ii|tanoshii|isogashii|muzukashii)\s+deshita\b/i.test(lower);

  const hasOverusedWatashiWa =
    (exact.match(/私は|わたしは|\bwatashi\s+wa\b/gi) || []).length >= 2;

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

  const isAffirmationJa =
    /^(はい|ええ|うん|いいえ|大丈夫|了解|そうですね|そう|そうです|ホットで|アイスで|水で|コーヒーで|お茶で|ラテで)[。！？!?]?$/u.test(
      exact
    );

  const lacksPoliteEnding =
    !isAffirmationJa &&
    !scenarioId.includes('free') &&
    exact.length > 4 &&
    !/(です|ます|ました|ません|ください|ませんか|でしょうか|ですか|お願いします|ありがとう|ありがとうございます|こんにちは|こんばんは|お疲れ様です|はい|ええ)[。！？!?]?$/u.test(
      exact
    ) &&
    !/\b(desu|masu|mashita|masen|kudasai|onegaishimasu|arigatou|arigato|hai)\b/i.test(lower);

  const isGibberishJa =
    !isAffirmationJa &&
    (/^(あいうえお|かきくけこ|さしすせそ|たちつてと|なにぬねの|あ+|い+|う+|え+|お+|テスト)(です|ます)?[。！？!?]?$/u.test(
      exact
    ) ||
    (!scenarioId.includes('free') &&
      !/(コーヒー|紅茶|お茶|水|ラテ|ケーキ|パン|メニュー|店内|持ち帰り|ホット|アイス|一つ|二つ|お願い|ください|いくら|おすすめ|カード|現金|テスト|試験|勉強|文法|漢字|言葉|宿題|先生|先輩|一緒|図書館|質問|どう|いい|大丈夫|はい|ありがとう|すみません|こんにちは|お疲れ様)/u.test(
        exact
      ) &&
      !/\b(kohi|koohii|keki|kudasai|onegaishimasu|tesuto|benkyou|benkyo|sensei|senpai|hai|arigato)\b/i.test(
        lower
      )));

  const isTooShortJa = exact.length < 3 && !isAffirmationJa;

  if (
    hasVerbDictPlusDesu ||
    hasPolitePastMasuDeshita ||
    hasIAdjPastDeshita ||
    hasOverusedWatashiWa ||
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

    if (hasPolitePastMasuDeshita) {
      misconceptionId = 'polite_past_masu_deshita';
      whyFailsId =
        'Miskonsepsi Bentuk Lampau Sopan (×～ますでした): Kata kerja bentuk ～ます TIDAK BOLEH ditempel 「でした」 (seperti 「×食べますでした / ×行きますでした」). Ubah langsung akhiran ～ます menjadi 「～ました」（「○食べました / ○行きました」).';
      whyFailsTh =
        'ความเข้าใจผิดเรื่องรูปอดีตสุภาพ (×～ますでした): ห้ามเติม 「でした」 หลังกริยารูป ～ます โดยตรง ต้องผันเป็น 「～ました」（「○食べました / ○行きました」）';
      syntacticCorrection = synthesizeNaturalReformulation(exact, 'ja', misconceptionId);
      missingTokens.push('～ました (bukan ～ますでした)');
    } else if (hasIAdjPastDeshita) {
      misconceptionId = 'i_adj_past_deshita';
      whyFailsId =
        'Miskonsepsi Kata Sifat-い Lampau (×～いでした): Kata sifat berakhiran い (seperti 美味しい / いい) tidak boleh langsung diikuti 「でした」. Ubah akhiran い menjadi 「かったです」（「○美味しかったです / ○よかったです」).';
      whyFailsTh =
        'ความเข้าใจผิดเรื่องคำคุณศัพท์ -い รูปอดีต: ห้ามวาง 「でした」 หลังคำคุณศัพท์ -い โดยตรง ต้องเปลี่ยน い เป็น 「かったです」（「○美味しかったです」）';
      syntacticCorrection = synthesizeNaturalReformulation(exact, 'ja', misconceptionId);
      missingTokens.push('～かったです (bukan ～いでした)');
    } else if (hasVerbDictPlusDesu || hasWrongObjectParticle) {
      misconceptionId =
        hasVerbDictPlusDesu && hasWrongObjectParticle
          ? 'JA_PARTICLE_NI_AND_VERB_DICT_DESU'
          : hasVerbDictPlusDesu
            ? 'verb_plus_desu'
            : 'particle_o_missing';
      whyFailsId =
        'Miskonsepsi Partikel Objek & Konjugasi Masu-kei: (1) Objek pesanan wajib ditandai partikel 「を」 (bukan 「に」). (2) Kata kerja bentuk kamus seperti 「飲む」 TIDAK BOLEH langsung ditambah 「です」（「×飲むです」 salah; gunakan 「飲みます」 atau pola pesanan sopan 「ホットコーヒーを一つお願いします」).';
      whyFailsTh =
        'ความเข้าใจผิดเรื่องคำช่วยกรรมตรงและรูปกริยา: (1) กรรมตรงต้องใช้คำช่วย 「を」 (ไม่ใช่ 「に」) และ (2) ห้ามวาง 「です」 หลังกริยารูปพจนานุกรมโดยตรง (「×飲むです」 ผิด ต้องใช้ 「飲みます」 หรือ 「〜をお願いします」)';
      syntacticCorrection = 'ホットコーヒーを一つお願いします。';
      missingTokens.push('を (partikel objek)', '〜をお願いします / 飲みます');
    } else if (hasWrongTaraConjugation) {
      misconceptionId = 'tara_conditional_conjugation';
      whyFailsId =
        'Miskonsepsi Konjugasi Pengandaian/Saran (〜たら): Pola 「〜たらいいですか」 wajib dibentuk dari Ta-form (bentuk lampau biasa), bukan bentuk kamus + たら. Ubah 「×勉強するたら」 menjadi 「○勉強したら」（する → した + ら = したら）dan tambahkan 「どうやって」 untuk menanyakan cara.';
      whyFailsTh =
        'ความเข้าใจผิดเรื่องการผันรูป 〜たら: ต้องผันกริยาเป็นรูปอดีต (Ta-form) ก่อนเติม ら ดังนั้น 「×勉強するたら」 จึงผิด ต้องใช้ 「○勉強したら」 (する → した + ら)';
      syntacticCorrection = '来週テストがあるので、どうやって勉強したらいいですか？';
      missingTokens.push('勉強したら (Ta-form + ら)', 'どうやって');
    } else if (hasWrongLocationParticle) {
      misconceptionId = 'particle_confusion_ni_de';
      whyFailsId =
        'Miskonsepsi Partikel Lokasi Aktivitas: Untuk tempat berlangsungnya aksi aktif (seperti belajar atau minum di kafe), gunakan partikel 「で」 (mis. 「図書館で勉強します」), bukan 「に」.';
      whyFailsTh =
        'ความเข้าใจผิดเรื่องคำช่วยสถานที่ทำกิจกรรม: สถานที่ที่ทำกิจกรรมต้องใช้คำช่วย 「で」 (เช่น 「図書館で勉強します」) ไม่ใช่ 「に」';
      syntacticCorrection = scenarioId.includes('senpai')
        ? '図書館で一緒に勉強してもいいですか？'
        : '店内でホットコーヒーを飲みます。';
      missingTokens.push('で (partikel lokasi aksi)');
    } else if (hasOverusedWatashiWa) {
      misconceptionId = 'overuse_watashi_wa';
      whyFailsId =
        'Kebiasaan Kaku Buku Teks (Mengulang 私は): Dalam percakapan Jepang alami, jangan mengulang 「私は (watashi wa)」 di setiap kalimat bila subjek pembicara sudah jelas.';
      whyFailsTh =
        'การพูด 私は (watashi wa) ซ้ำทุกประโยคทำให้ฟังดูแข็งทื่อเหมือนตำราเรียน ในภาษาญี่ปุ่นธรรมชาติสามารถละประธานเมื่อรู้กันอยู่แล้วได้';
      syntacticCorrection = exact.replace(/(?:私は|わたしは)\s*/g, '').trim() || exact;
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

    // ANTI-NONSENSE NATURAL REFORMULATION (JAPANESE):
    const naturalReformJa = synthesizeNaturalReformulation(exact, 'ja', misconceptionId);
    if (
      naturalReformJa &&
      naturalReformJa.trim() !== exact.trim() &&
      naturalReformJa.length >= 3
    ) {
      syntacticCorrection = naturalReformJa;
    }

    const aiReply = scenarioId.includes('senpai')
      ? `ちょっと待った！「勉強するたら」じゃなくて、タ形を使って「${syntacticCorrection}」って言ってみて！もう一回どうぞ！`
      : `ちょっと待って、今の文法はおかしいわよ！正しくは「${syntacticCorrection}」よ。ほら、今すぐもう一回声に出して言ってみて！`;

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
        ? `Tunggu dulu! Bukan "benkyou suru tara", tapi pakai bentuk Ta menjadi "${syntacticCorrection}". Ayo coba ulangi sekali lagi sekarang!`
        : `Tunggu sebentar, grammar-mu barusan keliru! Yang benar adalah "${syntacticCorrection}". Ayo, langsung ucapkan ulang kalimat yang benar sekarang!`,
      aiReplyTranslationTh:
        'เดี๋ยวก่อน ไวยากรณ์เมื่อกี้ผิดนะ! ต้องพูดว่า "' + syntacticCorrection + '" ลองพูดทวนอีกครั้งเดี๋ยวนี้เลย!',
      nextSuggestedReplies: [],
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
    nextSuggestedReplies: [],
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
// `conversation_turn`, the SAME production path used by Ngobrol AI in the main PWA.
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
    // Cross-origin parent, ignore
  }
  return null;
}

function isLocalDevHost(): boolean {
  return (
    typeof window !== 'undefined' &&
    /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(window.location?.hostname || '')
  );
}

function resolveCfApiBase(): string {
  if (typeof window === 'undefined') return '';
  const cfg = window.FIEZEL_CF_CONFIG || getSameOriginParent()?.FIEZEL_CF_CONFIG;
  if (!cfg || cfg.enabled === false) return '';
  return String(cfg.base || '').trim().replace(/\/$/, '');
}

/** Idempotent anonymous identity cookie (`fz_id`), required by the Worker quota gate. */
export function ensureLearnerIdentity(): Promise<boolean> {
  if (_identityReady) return Promise.resolve(true);
  if (isLocalDevHost()) return Promise.resolve(false);
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
  if (targetLang === 'ja') return /[\u3040-\u30ff\u4e00-\u9faf]/.test(tx);
  if (targetLang === 'zh') return /[\u4e00-\u9fff]/.test(tx) && !/[\u3040-\u30ff]/.test(tx);
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
      course: params.targetLang === 'ja' ? 'ja' : params.targetLang === 'zh' ? 'zh' : 'en',
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
      const personas = isLocalDevHost() ? '/api/tts/personas' : cfg?.personasEndpoint;
      if (personas) {
        void fetch(personas, { method: 'GET', mode: 'cors', cache: 'no-store' })
          .then((r) => {
            if (r.ok) {
              _ttsWarm = true;
            }
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
    if (isLocalDevHost()) return '/api/tts/line';
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
  learnerDossier?: string;
  callMode?: 'tutor_coach' | 'casual_chat';
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

function normalizeServerUiAction(raw: any): VoiceUiAction | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const actionType = String(raw.actionType || 'none').trim();
  if (
    actionType !== 'open_learning_popup' &&
    actionType !== 'navigate_app' &&
    actionType !== 'switch_call_mode'
  ) {
    return undefined;
  }
  const focusRaw = String(raw.focusType || 'grammar').trim();
  const focusType = (['grammar', 'vocab', 'kanji', 'kana', 'sentence_drill'] as const).includes(
    focusRaw as any
  )
    ? (focusRaw as VoiceUiAction['focusType'])
    : 'grammar';
  return {
    actionType: actionType as VoiceUiAction['actionType'],
    callMode:
      raw.callMode === 'casual_chat'
        ? 'casual_chat'
        : raw.callMode === 'tutor_coach'
          ? 'tutor_coach'
          : undefined,
    destination: typeof raw.destination === 'string' ? raw.destination.trim() : undefined,
    bankTopicId: typeof raw.bankTopicId === 'string' ? raw.bankTopicId.trim() : undefined,
    sourceLayer:
      raw.sourceLayer === 'bank' ||
      raw.sourceLayer === 'ai_dynamic' ||
      raw.sourceLayer === 'live_ws_native'
        ? raw.sourceLayer
        : undefined,
    topicTitle: typeof raw.topicTitle === 'string' ? raw.topicTitle.trim() : undefined,
    focusType,
    coachSpokenScript:
      typeof raw.coachSpokenScript === 'string' ? raw.coachSpokenScript.trim() : undefined,
    explanationText:
      typeof raw.explanationText === 'string' ? raw.explanationText.trim() : undefined,
    patternFormula: typeof raw.patternFormula === 'string' ? raw.patternFormula.trim() : undefined,
    drillInstruction:
      typeof raw.drillInstruction === 'string' ? raw.drillInstruction.trim() : undefined,
    sampleTarget: typeof raw.sampleTarget === 'string' ? raw.sampleTarget.trim() : undefined,
    leadText: typeof raw.leadText === 'string' ? raw.leadText.trim() : undefined,
    triggerWord: typeof raw.triggerWord === 'string' ? raw.triggerWord.trim() : undefined,
    triggerTag: typeof raw.triggerTag === 'string' ? raw.triggerTag.trim() : undefined,
    wrongWord: typeof raw.wrongWord === 'string' ? raw.wrongWord.trim() : undefined,
    wrongTag: typeof raw.wrongTag === 'string' ? raw.wrongTag.trim() : undefined,
    rightWord: typeof raw.rightWord === 'string' ? raw.rightWord.trim() : undefined,
    rightTag: typeof raw.rightTag === 'string' ? raw.rightTag.trim() : undefined,
    tailText: typeof raw.tailText === 'string' ? raw.tailText.trim() : undefined,
    secondLeadText: typeof raw.secondLeadText === 'string' ? raw.secondLeadText.trim() : undefined,
    secondTriggerWord:
      typeof raw.secondTriggerWord === 'string' ? raw.secondTriggerWord.trim() : undefined,
    secondWrongWord: typeof raw.secondWrongWord === 'string' ? raw.secondWrongWord.trim() : undefined,
    secondRightWord: typeof raw.secondRightWord === 'string' ? raw.secondRightWord.trim() : undefined,
    secondTailText: typeof raw.secondTailText === 'string' ? raw.secondTailText.trim() : undefined,
    secondCoachScript:
      typeof raw.secondCoachScript === 'string' ? raw.secondCoachScript.trim() : undefined,
    trapWrongSentence:
      typeof raw.trapWrongSentence === 'string' ? raw.trapWrongSentence.trim() : undefined,
    trapWrongToken: typeof raw.trapWrongToken === 'string' ? raw.trapWrongToken.trim() : undefined,
    trapWrongReason:
      typeof raw.trapWrongReason === 'string' ? raw.trapWrongReason.trim() : undefined,
    drillMeaningPrompt:
      typeof raw.drillMeaningPrompt === 'string' ? raw.drillMeaningPrompt.trim() : undefined,
    drillTargetSentence:
      typeof raw.drillTargetSentence === 'string' ? raw.drillTargetSentence.trim() : undefined,
    drillTrapSentence:
      typeof raw.drillTrapSentence === 'string' ? raw.drillTrapSentence.trim() : undefined,
    drillBlocks: Array.isArray(raw.drillBlocks)
      ? raw.drillBlocks.map((b: any) => String(b || '').trim()).filter(Boolean)
      : undefined,
    drillDistractors: Array.isArray(raw.drillDistractors)
      ? raw.drillDistractors.map((b: any) => String(b || '').trim()).filter(Boolean)
      : undefined,
  };
}

export async function resolveAiReply(
  params: TurnEvaluationParams,
  localResult: FlexibleTurnEvaluationResult,
  options?: {
    onTextReady?: (
      aiReply: string,
      translationId: string,
      translationTh: string,
      nextSuggestedReplies?: BeginnerReplyCard[],
      uiAction?: VoiceUiAction
    ) => void;
  }
): Promise<FlexibleTurnEvaluationResult> {
  // 0) Unified Gemini Partner + Real-Time Copilot Turn (/api/voice/partner-turn)
  //    Generates BOTH Partner AI's spoken reply, 3 bespoke Real-Time Copilot replies, AND optional uiAction in ONE call!
  for (const base of resolveVoiceApiCandidateBases()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 24000);
    try {
      const res = await fetch(`${base}/api/voice/partner-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: params.text,
          personaId: params.persona.id,
          personaName: params.persona.name,
          scenarioId: params.scenario.id,
          scenarioTitle: params.scenario.titleId,
          targetLang: params.targetLang,
          locale: params.locale,
          callMode: params.callMode || 'tutor_coach',
          history: params.history.slice(-6),
          learnerDossier: params.learnerDossier || undefined,
        }),
        mode: 'cors',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const partnerReply = stripEmojisAndEmotWords(String(data?.aiReply || '')).trim();
        const uiAction = normalizeServerUiAction(data?.uiAction);
        const isExplanation =
          Boolean(data?.isExplanation) ||
          Boolean(uiAction && uiAction.actionType === 'open_learning_popup');
        if (partnerReply && (isExplanation || replyLooksLikeTargetLanguage(partnerReply, params.targetLang))) {
          const transId = stripEmojisAndEmotWords(String(data?.aiReplyTranslationId || '')).trim();
          const transTh = stripEmojisAndEmotWords(String(data?.aiReplyTranslationTh || '')).trim();
          const rtCards = normalizeServerCopilotCards(data?.replies, params.targetLang);
          if (rtCards.length > 0) {
            const cacheKey = `${params.targetLang}::${partnerReply.toLowerCase()}::${params.text.trim().toLowerCase()}`;
            _copilotTurnCache.set(cacheKey, {
              ok: true,
              source: 'ai-realtime',
              aiMeaningId: transId,
              aiMeaningTh: transTh,
              replies: rtCards,
              cards: rtCards,
            });
          }

          options?.onTextReady?.(
            partnerReply,
            transId,
            transTh,
            rtCards.length > 0 ? rtCards : undefined,
            uiAction
          );

          // When opening a learning popup, InCallLearningWorkbenchModal owns the single unified explanation
          // speech in the learner's locale (`id` / `th`), so NEVER fire a second competing English TTS here!
          if (uiAction && uiAction.actionType === 'open_learning_popup') {
            return {
              ...localResult,
              aiReply: partnerReply,
              aiReplyTranslationId: transId,
              aiReplyTranslationTh: transTh,
              nextSuggestedReplies: rtCards.length > 0 ? rtCards : undefined,
              audioBase64: null,
              audioMimeType: 'audio/wav',
              ttsEngine: 'workbench-unified-tts',
              replySource: 'ai',
              uiAction,
            };
          }

          const ttsRes = await synthesizeFlexibleTts({
            text: partnerReply,
            targetLang: params.targetLang,
            persona: params.persona,
          });
          return {
            ...localResult,
            aiReply: partnerReply,
            aiReplyTranslationId: transId,
            aiReplyTranslationTh: transTh,
            nextSuggestedReplies: rtCards.length > 0 ? rtCards : undefined,
            audioBase64: ttsRes?.audioBase64 || null,
            audioMimeType: ttsRes?.audioMimeType || 'audio/wav',
            ttsEngine: ttsRes?.engine || 'gemini-3.8-flash-lite-tts',
            replySource: 'ai',
            uiAction,
          };
        }
      }
    } catch {
      clearTimeout(timer);
    }
  }

  // 1) Learner's own Gemini key (optional): upgraded to ultra-fast gemini-3-flash-preview + unified real-time copilot replies
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
      const langLabel =
        params.targetLang === 'ja'
          ? 'Japanese (natural N5/N4, Kanji+Hiragana, NO emojis; word-spaced Hepburn Romaji in pronunciation)'
          : params.targetLang === 'zh'
            ? 'Mandarin Chinese (natural HSK1-HSK3, Simplified Chinese characters, NO emojis; tone-marked Pinyin in pronunciation)'
            : 'English (natural A2/B1, NO emojis; easy phonetic guide in pronunciation)';
      const historyLines = params.history
        .filter((h) => h && h.text && h.text.trim())
        .slice(-6)
        .map((h) => `${h.speaker === 'ai' ? 'You' : 'Learner'}: ${h.text.trim().slice(0, 240)}`);
      const promptText = [
        `You are ${params.persona.name}, a sharp, observant, deeply caring speaking mentor ("guru galak tapi penuh perhatian") in FIEZEL. Scenario: "${params.scenario.titleId}".`,
        `[FIEZEL ECOSYSTEM & IDENTITY]: Created by Fitra Rustqi (@fitrarustqi) from Banda Aceh; powered by Braincore Engine; mascot is Mochi the Daifuku cat.`,
        `[WHY FIEZEL CRUSHES CHATGPT VOICE]: ChatGPT Voice is 'blind audio' (no subtitles, no hints, no Kanji phonetics) where users waste 70% of time in 'The Interruption Trap' asking for translations. FIEZEL gives Zero-Friction Flow: instant subtitles & translations, Furigana & Romaji phonetics for Kanji, and 3 beginner answer hints with audio preview, training vocal muscles 100% of the time!`,
        params.learnerDossier || '',
        `[RUTHLESS CARING MENTOR & MANDATORY LIVE GRAMMAR INTERCEPTION]:
- NEVER laugh on every turn! Do NOT start replies with "Haha!" or "あはは！". Stay composed, sharp, and genuinely attentive.
- ZERO SILENT PASS ON GRAMMAR ERRORS: If the learner's last message has ANY grammar, particle, conjugation, or tense error (e.g. "×食べますでした", "×行くです/飲むです", "×美味しいでした", "×図書館に勉強する", "×勉強するたら", "×I am agree", "×I am want", "×I meeting", "×goed / ×eat yesterday", "×Although... but...", "×mine job", "×similar with", or word-by-word translation), STOP them immediately!
  1) Call out the exact grammar slip with dry, contextual tough-love wit (never insult their dignity; if they admit "aku belum tahu", teach warmly).
  2) Give the exact natural native sentence.
  3) Demand ECHO REDEMPTION: require them to repeat the corrected sentence out loud right now ("Coba ulangi sekali lagi: '...'!" / "もう一回言ってみて：『...』！" / "Say it back to me cleanly right now: '...'!"), and make Option 1 ("easy") in "replies" that exact corrected sentence!
- If the learner's grammar is clean and natural, praise them with earned mentor pride and advance the conversation with a sharp question or dialect/accent nuance.`,
        `Reply in ${langLabel}, 1-3 punchy spoken sentences (max 25 words).`,
        'ABSOLUTE BAN ON EMOJIS & EMOTICONS: Pure clean spoken words only.',
        historyLines.length ? `Conversation so far:\n${historyLines.join('\n')}` : '',
        `Learner (last message): "${params.text}"`,
        'Also generate "replies": 3 real-time spoken reply suggestions (easy, mission, rescue) that directly answer YOUR new aiReply (if you demanded Echo Redemption of a corrected sentence, Option 1 "easy" MUST be that exact corrected sentence!).',
        `Respond ONLY with valid JSON: {"aiReply":"...","aiReplyTranslationId":"...","aiReplyTranslationTh":"...","replies":[{"tier":"easy","badgeId":"Singkat & Mudah","badgeTh":"สั้นและง่าย","text":"...","pronunciation":"...","hintId":"...","hintTh":"..."},{"tier":"mission","badgeId":"Alami & Kontekstual","badgeTh":"เป็นธรรมชาติ","text":"...","pronunciation":"...","hintId":"...","hintTh":"..."},{"tier":"rescue","badgeId":"Jawab + Tanya Balik","badgeTh":"ตอบและถามกลับ","text":"...","pronunciation":"...","hintId":"...","hintTh":"..."}]}`,
      ]
        .filter(Boolean)
        .join('\n');
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Revision': '2026-05-20',
          'x-goog-api-key': userGeminiKey,
        },
        body: JSON.stringify({
          model: 'gemini-3.1-flash-lite',
          input: promptText,
          response_mime_type: 'application/json',
          generation_config: {
            temperature: 0.5,
            max_output_tokens: 750,
            thinking_level: 'minimal',
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        const outputs = Array.isArray(data?.outputs) ? data.outputs : [];
        const textOut = outputs.find((o: any) => o && o.type === 'text' && typeof o.text === 'string');
        const rawText = String(textOut?.text || data?.candidates?.[0]?.content?.parts?.[0]?.text || '')
          .replace(/^```json\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        const parsedRaw = JSON.parse(rawText);
        const parsed = Array.isArray(parsedRaw) ? parsedRaw[0] : parsedRaw;
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
        geminiReply = stripEmojisAndEmotWords(geminiReply);
        const geminiTransId = stripEmojisAndEmotWords(parsed?.aiReplyTranslationId || '');
        const geminiTransTh = stripEmojisAndEmotWords(parsed?.aiReplyTranslationTh || '');
        if (geminiReply && replyLooksLikeTargetLanguage(geminiReply, params.targetLang)) {
          const rtCards = normalizeServerCopilotCards(parsed?.replies, params.targetLang);
          options?.onTextReady?.(
            geminiReply,
            geminiTransId,
            geminiTransTh,
            rtCards.length > 0 ? rtCards : undefined
          );

          const ttsRes = await synthesizeFlexibleTts({
            text: geminiReply,
            targetLang: params.targetLang,
            persona: params.persona,
          });
          return {
            ...localResult,
            aiReply: geminiReply,
            aiReplyTranslationId: geminiTransId,
            aiReplyTranslationTh: geminiTransTh,
            nextSuggestedReplies: rtCards.length > 0 ? rtCards : undefined,
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

  // 2) Production AI partner (/api/ai/task conversation_turn fallback).
  //    Never inject static template cards here, fire real-time Copilot assist in parallel with TTS!
  const partner = await requestAiPartnerReply({
    text: params.text,
    scenario: params.scenario,
    targetLang: params.targetLang,
    locale: params.locale,
    history: params.history,
  });

  if (partner) {
    const cleanPartnerReply = stripEmojisAndEmotWords(partner.reply);
    const cleanPartnerTrans = stripEmojisAndEmotWords(partner.translation);
    const transId = params.locale === 'th' ? '' : cleanPartnerTrans;
    const transTh = params.locale === 'th' ? cleanPartnerTrans : '';

    // Reveal AI reply text immediately; App.tsx triggers real-time Copilot assist in parallel!
    options?.onTextReady?.(cleanPartnerReply, transId, transTh, undefined);

    const [ttsRes, copilotRes] = await Promise.all([
      synthesizeFlexibleTts({
        text: cleanPartnerReply,
        targetLang: params.targetLang,
        persona: params.persona,
      }),
      requestRealtimeCopilotAssist({
        aiText: cleanPartnerReply,
        lastUserText: params.text,
        scenario: params.scenario,
        targetLang: params.targetLang,
        locale: params.locale,
        history: params.history,
      }),
    ]);

    return {
      ...localResult,
      aiReply: cleanPartnerReply,
      aiReplyTranslationId: transId || copilotRes.aiMeaningId,
      aiReplyTranslationTh: transTh || copilotRes.aiMeaningTh,
      nextSuggestedReplies: copilotRes.ok ? copilotRes.replies : undefined,
      audioBase64: ttsRes?.audioBase64 || null,
      audioMimeType: ttsRes?.audioMimeType || 'audio/mpeg',
      ttsEngine: ttsRes?.engine || 'fiezel-ai-partner',
      replySource: 'ai',
    };
  }

  // 3) Online AI unavailable or transient network error:
  //    Return a spoken conversational retry line in character. Zero offline template cards.
  const networkApologyReply =
    params.targetLang === 'ja'
      ? 'すみません、電波が少し途切れました。もう一度お話しいただけますか？'
      : params.targetLang === 'zh'
        ? '不好意思，信号刚才断了一下。你可以再说一遍吗？'
        : 'Sorry, the line glitched for a second. Could you say that again?';
  const networkApologyTransId =
    'Maaf, koneksi sempat terputus sebentar. Bisa tolong ucapkan sekali lagi?';
  const networkApologyTransTh =
    'ขออภัย การเชื่อมต่อขัดข้องชั่วคราว ช่วยพูดอีกครั้งได้ไหมคะ?';

  options?.onTextReady?.(
    networkApologyReply,
    networkApologyTransId,
    networkApologyTransTh,
    []
  );

  const ttsRes = await synthesizeFlexibleTts({
    text: networkApologyReply,
    targetLang: params.targetLang,
    persona: params.persona,
  }).catch(() => null);

  return {
    ...localResult,
    aiReply: networkApologyReply,
    aiReplyTranslationId: networkApologyTransId,
    aiReplyTranslationTh: networkApologyTransTh,
    nextSuggestedReplies: [],
    audioBase64: ttsRes?.audioBase64 || null,
    audioMimeType: ttsRes?.audioMimeType || 'audio/mpeg',
    ttsEngine: ttsRes?.engine || 'fiezel-edge-tts-binary',
    replySource: 'ai',
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
  // Short replies (<= 52 chars) stay as 1 chunk; multi-clause / multi-sentence replies split into
  // a fast first chunk (~5-8 words, ~850ms TTS) + second chunk prefetched during playback!
  const singleLimit = 52;
  if (clean.length <= singleLimit) return [clean];
  const isCjkLang = targetLang === 'ja' || targetLang === 'zh';
  let parts =
    isCjkLang
      ? clean.match(/[^。！？!?]+[。！？!?]*/g) || [clean]
      : clean.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g) || [clean];
  if (parts.length === 1 && clean.length > 68) {
    const clauseMatch = clean.slice(22).match(/[,;:、，]\s*/);
    if (clauseMatch && clauseMatch.index !== undefined) {
      const cutAt = 22 + clauseMatch.index + clauseMatch[0].length;
      const firstClause = clean.slice(0, cutAt).trim();
      const restClause = clean.slice(cutAt).trim();
      if (firstClause.length >= 20 && restClause.length >= 16) {
        parts = [firstClause, restClause];
      }
    }
  }
  const minLen = isCjkLang ? 10 : 24;
  const chunks: string[] = [];
  let carry = '';
  for (const raw of parts) {
    const piece = raw.trim();
    if (!piece) continue;
    const merged = carry ? `${carry}${isCjkLang ? '' : ' '}${piece}` : piece;
    if (merged.length < minLen) {
      carry = merged;
      continue;
    }
    chunks.push(merged);
    carry = '';
  }
  if (carry) {
    if (chunks.length) chunks[chunks.length - 1] += `${isCjkLang ? '' : ' '}${carry}`;
    else chunks.push(carry);
  }
  if (chunks.length > maxChunks) {
    const head = chunks.slice(0, maxChunks - 1);
    head.push(chunks.slice(maxChunks - 1).join(isCjkLang ? '' : ' '));
    return head;
  }
  return chunks;
}

/**
 * Conversational acoustic fillers (Aizuchi 相槌 / Backchannels) disabled.
 * Ensures AI partner responds directly and synchronously without artificial canned phrases like "naruhodo".
 */
export function getThinkingFillers(_targetLang: TargetLang): string[] {
  return [];
}

/**
 * Pre-synthesizes and caches thinking fillers (No-op when fillers disabled).
 */
export function prewarmThinkingFillers(
  _targetLang: TargetLang,
  _persona?: VoicePersona
): void {
  // Acoustic fillers intentionally disabled, AI replies directly without canned filler sounds
}

/**
 * Wraps raw 16-bit little-endian mono PCM chunks (24kHz Gemini Live output) into a
 * standard 44-byte RIFF/WAVE container encoded as base64 (`audio/wav`), natively
 * playable by both HTMLAudioElement and AudioContext.decodeAudioData() across all browsers.
 */
export function pcm16ChunksToWavBase64(chunks: Uint8Array[], sampleRate = 24000): string {
  let pcmBytesLen = 0;
  for (const c of chunks) {
    pcmBytesLen += c.byteLength;
  }
  // Ensure even byte length for 16-bit PCM samples
  if (pcmBytesLen % 2 === 1) {
    pcmBytesLen -= 1;
  }
  if (pcmBytesLen <= 0) return '';

  const wavBuffer = new ArrayBuffer(44 + pcmBytesLen);
  const view = new DataView(wavBuffer);
  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + pcmBytesLen, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM subchunk1 size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, 'data');
  view.setUint32(40, pcmBytesLen, true);

  const outBytes = new Uint8Array(wavBuffer);
  let cursor = 44;
  for (const c of chunks) {
    const copyLen = Math.min(c.byteLength, 44 + pcmBytesLen - cursor);
    if (copyLen <= 0) break;
    outBytes.set(c.subarray(0, copyLen), cursor);
    cursor += copyLen;
  }

  let binary = '';
  const chunkStep = 0x8000;
  for (let i = 0; i < outBytes.byteLength; i += chunkStep) {
    const slice = outBytes.subarray(i, Math.min(i + chunkStep, outBytes.byteLength));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

/**
 * Zero-Cold-Start Neural TTS Failover via Gemini 3.8 Live 18-Key Pool (`audio/wav`).
 * Guarantees 100% genuine neural voice in ~1.5-2.2s whenever Render Edge-TTS is cold-starting
 * or when running on a local static dev server without `/api/tts/line`.
 */
export async function synthesizeViaGeminiLiveWav(params: {
  text: string;
  targetLang: TargetLang | LearnerLocale | string;
  persona?: VoicePersona;
}): Promise<{ audioBase64: string; audioMimeType: string; engine: string } | null> {
  if (typeof WebSocket === 'undefined') return null;
  const cleanText = stripEmojisAndEmotWords(params.text).trim();
  if (!cleanText) return null;

  let wsEndpoint = '';
  let sessionKeyIndex: number | undefined;
  const session = await requestGeminiLiveSessionToken().catch(() => ({
    ok: false,
  } as GeminiLiveSessionInfo));

  if (session && session.ok && session.token) {
    const baseEp =
      session.endpoint ||
      'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';
    const sep = baseEp.includes('?') ? '&' : '?';
    wsEndpoint = `${baseEp}${sep}access_token=${encodeURIComponent(session.token)}`;
    sessionKeyIndex = session.keyIndex;
  } else {
    const directCandidates = resolveLiveCallWebSocketUrls();
    if (directCandidates.length > 0) {
      wsEndpoint = directCandidates[0];
    }
  }

  if (!wsEndpoint) return null;

  const rawLang = String(params.targetLang || 'en').toLowerCase().split(/[-_]/)[0].trim();
  const isIdSpeech =
    rawLang === 'id' ||
    /\b(adalah|sedangkan|gunakan|perhatikan|kalimat|karena|untuk|dalam|jangan|ketika|pakai|bedanya|artinya|lihat|papan|kata)\b/i.test(
      cleanText
    );
  const isThSpeech = rawLang === 'th' || /[\u0E00-\u0E7F]{2,}/.test(cleanText);
  const isRuSpeech = rawLang === 'ru' || /[\u0400-\u04FF]{3,}/.test(cleanText);
  const isViSpeech = rawLang === 'vi' || /[\u1EA0-\u1EF9]{2,}/.test(cleanText);
  const effectiveLang = isThSpeech
    ? 'th'
    : isRuSpeech
      ? 'ru'
      : isViSpeech
        ? 'vi'
        : isIdSpeech
          ? 'id'
          : ['ja', 'zh', 'en', 'ko', 'ms', 'es', 'fr', 'de'].includes(rawLang)
            ? rawLang
            : 'en';

  const voiceName =
    params.persona?.geminiVoice ||
    (effectiveLang === 'ja' || effectiveLang === 'zh' ? 'Aoede' : 'Puck');
  const langLabel =
    effectiveLang === 'id'
      ? 'natural conversational Bahasa Indonesia'
      : effectiveLang === 'th'
        ? 'natural conversational Thai'
        : effectiveLang === 'vi'
          ? 'natural conversational Vietnamese'
          : effectiveLang === 'ru'
            ? 'natural conversational Russian'
            : effectiveLang === 'ms'
              ? 'natural conversational Malay'
              : effectiveLang === 'ko'
                ? 'natural conversational Korean'
                : effectiveLang === 'ja'
                  ? 'natural Japanese'
                  : effectiveLang === 'zh'
                    ? 'natural Putonghua Mandarin Chinese'
                    : 'natural English';
  const personaStyle =
    effectiveLang === 'id'
      ? 'Warm, charismatic native Indonesian language mentor speaking natural conversational Bahasa Indonesia with friendly Jakarta cadence and crisp foreign word quoting'
      : effectiveLang === 'th'
        ? 'Warm, lively native Thai language mentor speaking natural conversational Thai with friendly Bangkok cadence'
        : effectiveLang === 'vi'
          ? 'Warm, lively native Vietnamese language mentor speaking natural conversational Vietnamese with clear pronunciation'
          : effectiveLang === 'ru'
            ? 'Warm, expressive native Russian language mentor speaking natural conversational Russian with clear articulation'
            : params.persona?.ttsStylePrompt ||
              params.persona?.speakingStyle ||
              (effectiveLang === 'ja'
                ? 'Expressive, sassy, sharp-witted Tokyo-Osaka mentor with authentic Kansai/Tokyo pitch accent'
                : effectiveLang === 'zh'
                  ? 'Witty, brisk, expressive Beijing Putonghua Mandarin mentor with authentic erhua rhythm and crystal-clear four tones'
                  : 'Urban street-smart American English mentor with natural hood cadence, warm rasp, and witty older-brother sarcasm');

  return new Promise((resolve) => {
    let settled = false;
    const pcmChunks: Uint8Array[] = [];
    let ws: WebSocket | null = null;

    const finalize = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (ws) {
        try {
          ws.onopen = null;
          ws.onmessage = null;
          ws.onerror = null;
          ws.onclose = null;
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close(1000, 'tts_complete');
          }
        } catch {
          // Ignore close error
        }
      }
      if (ok && pcmChunks.length > 0) {
        const wavBase64 = pcm16ChunksToWavBase64(pcmChunks, 24000);
        if (wavBase64.length > 64) {
          resolve({
            audioBase64: wavBase64,
            audioMimeType: 'audio/wav',
            engine: 'gemini-3.8-live-wav',
          });
          return;
        }
      }
      resolve(null);
    };

    const timeoutId = setTimeout(() => {
      finalize(pcmChunks.length > 0);
    }, 8500);

    try {
      ws = new WebSocket(wsEndpoint);
    } catch {
      finalize(false);
      return;
    }

    ws.onopen = () => {
      try {
        const speechLangCode =
          effectiveLang === 'ja'
            ? 'ja-JP'
            : effectiveLang === 'zh'
              ? 'cmn-CN'
              : effectiveLang === 'th'
                ? 'th-TH'
                : effectiveLang === 'vi'
                  ? 'vi-VN'
                  : effectiveLang === 'ru'
                    ? 'ru-RU'
                    : effectiveLang === 'ko'
                      ? 'ko-KR'
                      : effectiveLang === 'ms'
                        ? 'ms-MY'
                        : effectiveLang === 'id'
                          ? 'id-ID'
                          : 'en-US';
        ws?.send(
          JSON.stringify({
            setup: {
              model: 'models/gemini-3.8-live',
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  languageCode: speechLangCode,
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName,
                    },
                  },
                },
              },
              systemInstruction: {
                parts: [
                  {
                    text: `You are ${params.persona?.name || 'a charismatic native mentor'}, a 100% native speaker performing spoken dialogue in ${langLabel} (${speechLangCode}) with authentic native phonology and zero foreign/Indonesian accent. Vocal profile: ${personaStyle}. Perform ONLY the exact line inside quotes with vivid human prosody, natural breath, and authentic emotional inflection. Never spell out literal laugh words like "h-a-h-a", if a chuckle is present, render it acoustically as a subtle, genuine human sound. Never add extra words outside the quotes.`,
                  },
                ],
              },
            },
          })
        );
      } catch {
        finalize(false);
      }
    };

    const handleParsedMsg = (raw: string) => {
      let msg: any;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (msg?.setupComplete) {
        try {
          ws?.send(
            JSON.stringify({
              clientContent: {
                turns: [
                  {
                    role: 'user',
                    parts: [
                      {
                        text: `Perform naturally in ${langLabel}: "${cleanText}"`,
                      },
                    ],
                  },
                ],
                turnComplete: true,
              },
            })
          );
        } catch {
          finalize(false);
        }
        return;
      }

      const parts = msg?.serverContent?.modelTurn?.parts;
      if (Array.isArray(parts)) {
        for (const p of parts) {
          const b64 = p?.inlineData?.data;
          if (typeof b64 === 'string' && b64.length > 0) {
            try {
              const bin = atob(b64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) {
                bytes[i] = bin.charCodeAt(i);
              }
              pcmChunks.push(bytes);
            } catch {
              // Skip malformed chunk
            }
          }
        }
      }

      if (msg?.serverContent?.turnComplete) {
        finalize(pcmChunks.length > 0);
      }
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        handleParsedMsg(ev.data);
      } else if (typeof Blob !== 'undefined' && ev.data instanceof Blob) {
        void ev.data
          .text()
          .then(handleParsedMsg)
          .catch(() => {});
      } else if (ev.data instanceof ArrayBuffer) {
        try {
          handleParsedMsg(new TextDecoder().decode(ev.data));
        } catch {
          // Ignore
        }
      }
    };

    ws.onerror = () => {
      finalize(pcmChunks.length > 0);
    };

    ws.onclose = (ev) => {
      if (ev.code !== 1000 && pcmChunks.length === 0 && sessionKeyIndex !== undefined) {
        void reportGeminiLiveSessionDrop(ev.reason || 'tts_ws_closed', ev.code, sessionKeyIndex);
      }
      finalize(pcmChunks.length > 0);
    };
  });
}

/**
 * Primary Neural AI Voice Synthesis via FIEZEL Worker `/api/voice/gemini-tts`
 * (`gemini-3.8-flash-lite-tts` / `gemini-3.8-flash-tts`, `audio/wav`, `speech_metadata.style`).
 * Delivers genuine human prosody, authentic Hood American / Tokyo-Osaka Tsundere / Beijing Putonghua
 * accents, and expressive sarcastic inflection, NEVER flat robotic Edge TTS!
 */
export async function synthesizeViaWorkerGeminiTts(params: {
  text: string;
  targetLang: TargetLang | LearnerLocale | string;
  persona?: VoicePersona;
}): Promise<{ audioBase64: string; audioMimeType: string; engine: string } | null> {
  const cleanText = stripEmojisAndEmotWords(params.text || '').trim();
  if (!cleanText) return null;

  const rawLang = String(params.targetLang || 'en').toLowerCase().split(/[-_]/)[0].trim();
  const isNativeExplainLang = ['id', 'th', 'vi', 'ru', 'ms', 'ko', 'es', 'fr', 'de'].includes(rawLang);

  for (const base of resolveVoiceApiCandidateBases()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(`${base}/api/voice/gemini-tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          targetLang: rawLang,
          spokenLang: rawLang,
          personaId: params.persona?.id || '',
          voiceName: params.persona?.geminiVoice || '',
          stylePrompt: isNativeExplainLang
            ? ''
            : params.persona?.ttsStylePrompt || params.persona?.speakingStyle || '',
        }),
        mode: 'cors',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json().catch(() => null);
        const b64 = String(json?.audioBase64 || '').replace(/^data:audio\/[^;]+;base64,/, '');
        if (b64.length > 64) {
          return {
            audioBase64: b64,
            audioMimeType: String(json?.audioMimeType || 'audio/wav'),
            engine: String(json?.model || json?.engine || 'gemini-3.8-flash-lite-tts'),
          };
        }
      }
    } catch {
      clearTimeout(timer);
    }
  }
  return null;
}

/**
 * Neural AI Voice Synthesis with per-persona accent styling and in-memory audio cache.
 * Priority 1: Gemini 3.8 TTS (`/api/voice/gemini-tts` with `speech_metadata.style` accent & sarcasm).
 * Priority 2: Gemini 3.8 Live WebSocket WAV (`synthesizeViaGeminiLiveWav`).
 * Priority 3 (Last-Resort Emergency Only): Classic Edge TTS (`/api/tts/line`).
 */
export async function synthesizeFlexibleTts(params: {
  text: string;
  targetLang: TargetLang | LearnerLocale | string;
  persona?: VoicePersona;
  /** Retry path: ignore the short failure cooldown. */
  force?: boolean;
}): Promise<{ audioBase64: string; audioMimeType: string; engine: string } | null> {
  const rawLang = String(params.targetLang || 'en').toLowerCase().trim();
  const sanitizeLang: TargetLang = rawLang === 'ja' ? 'ja' : rawLang === 'zh' ? 'zh' : 'en';
  const cleanSpokenText = sanitizeSpokenTextForClassicTts(params.text, sanitizeLang);
  if (!cleanSpokenText) return null;

  const speakerMap: Record<string, string> = {
    coach_alex: 'coach_alex',
    coach_sarah: 'coach_sarah',
    sensei_nanami: 'sensei_nanami',
    sensei_keita: 'keita',
    nanami: 'sensei_nanami',
    keita: 'keita',
    xiao_mochi: 'xiao_mochi',
    xiaoxiao: 'xiao_mochi',
    yunxi: 'yunxi',
  };
  const speaker =
    (params.persona && speakerMap[params.persona.id]) ||
    (rawLang === 'ja'
      ? 'sensei_nanami'
      : rawLang === 'zh'
        ? 'xiao_mochi'
        : 'coach_alex');

  const cacheKey = `gemini-tts:${speaker}:${rawLang}:${cleanSpokenText}`;
  const cached = _ttsMemoryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const inflight = _ttsInFlight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const endpoint = resolveTtsEndpoint();

  const requestPromise = (async () => {
    try {
      // 1) PRIMARY: Genuine Gemini 3.8 Neural TTS with Persona Accent & Sarcastic Style!
      const geminiTts = await synthesizeViaWorkerGeminiTts({
        text: cleanSpokenText,
        targetLang: params.targetLang,
        persona: params.persona,
      });
      if (geminiTts) {
        _ttsMemoryCache.set(cacheKey, geminiTts);
        return geminiTts;
      }

      // 2) SECONDARY: Gemini 3.8 Live WebSocket WAV synthesis!
      const liveWav = await synthesizeViaGeminiLiveWav({
        text: cleanSpokenText,
        targetLang: params.targetLang,
        persona: params.persona,
      });
      if (liveWav) {
        _ttsMemoryCache.set(cacheKey, liveWav);
        return liveWav;
      }

      // 3) EMERGENCY LAST RESORT ONLY: Classic `/api/tts/line` if both Gemini neural pipelines are unreachable
      if (params.force || Date.now() >= _ttsCooldownUntil) {
        const controller = new AbortController();
        const httpTimeoutMs = _ttsWarm ? 5500 : 3500;
        const timer = setTimeout(() => controller.abort(), httpTimeoutMs);
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: cleanSpokenText,
              speaker,
              lang: params.targetLang,
            }),
            mode: 'cors',
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('audio/')) {
              const buf = await res.arrayBuffer();
              if (buf.byteLength > 64) {
                _ttsWarm = true;
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
            } else if (contentType.includes('application/json')) {
              const json = await res.json();
              const voiceNameResp = String(json?.voiceName || '').toLowerCase();
              const isVoiceLangMismatch =
                (params.targetLang === 'zh' && voiceNameResp && !voiceNameResp.startsWith('zh')) ||
                (params.targetLang === 'ja' && voiceNameResp && !voiceNameResp.startsWith('ja')) ||
                (params.targetLang === 'en' && voiceNameResp && !voiceNameResp.startsWith('en'));
              const b64 = json?.audioBase64 || json?.audio_base64 || json?.audio || json?.data;
              if (!isVoiceLangMismatch && typeof b64 === 'string' && b64.length > 32) {
                _ttsWarm = true;
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
          if (_ttsConsecutiveFailures >= 2) {
            _ttsCooldownUntil = Date.now() + 8000;
          }
        } catch {
          clearTimeout(timer);
          _ttsConsecutiveFailures += 1;
          if (_ttsConsecutiveFailures >= 2) {
            _ttsCooldownUntil = Date.now() + 8000;
          }
        }
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
