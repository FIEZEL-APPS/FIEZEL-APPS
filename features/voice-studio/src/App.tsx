import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock,
  Download,
  Home,
  Compass,
  SlidersHorizontal,
  ArrowLeft,
  X,
  MessageSquare,
  BookOpen,
  Video,
} from 'lucide-react';
import {
  BraincoreStoreState,
  CallMode,
  CallScenario,
  CallTurn,
  LearnerLocale,
  TargetLang,
  TurnDiagnosis,
  VoiceUiAction,
} from './types/voiceCall';
import {
  abilityThetaFromMastery,
  brainSyncFlush,
  buildBraincoreCognitiveDossier,
  checkPrerequisiteStatus,
  dispatchVoiceAppNavigation,
  finalizeCallSessionMemory,
  loadBraincoreState,
  recordSpeakingAttempt,
  recordVocabPrereqMastery,
  saveBraincoreState,
  STORAGE_KEY,
} from './lib/braincore';
import {
  InCallLearningWorkbenchModal,
  type WorkbenchEvaluationMeta,
  type WorkbenchPracticeCheckResult,
} from './components/InCallLearningWorkbenchModal';
import { CALL_SCENARIOS, VOICE_PERSONAS } from './data/callScenarios';
import { t, tMasteryState } from './lib/i18n';
import { playFiezelSfx } from './lib/sfx';
import { BraincoreTrendChart } from './components/BraincoreTrendChart';
import { HomeRedesignView } from './components/HomeRedesignView';
import { BeginnerAnswerAssistant } from './components/BeginnerAnswerAssistant';
import {
  FiezelBrandCrest,
  FiezelCornerOrnament,
  FiezelNeuralConstellation,
  FiezelPawStamp,
  FiezelSparkleOrnament,
} from './components/FiezelOrnaments';
import {
  type BeginnerReplyCard,
  fetchLiveTranslation,
  translateAndPhoneticizeLiveText,
} from './lib/liveCallHelper';
import { JapaneseRubyDisplay } from './components/JapaneseRubyDisplay';
import { stripEmojisAndEmotWords, toPhoneticRomaji } from './lib/japanesePhonetics';
import { toPhoneticPinyin } from './lib/mandarinPhonetics';
import {
  evaluateTurnLocal,
  type LiveTransportMode,
  pcm16Base64ToAudioBuffer,
  reportGeminiLiveSessionDrop,
  requestGeminiLiveSessionToken,
  requestRealtimeCopilotAssist,
  resolveAiReply,
  resolveLiveCallWebSocketUrls,
  resolveVoiceApiCandidateBases,
  sanitizeHallucinatedTranscript,
  splitIntoSpeechChunks,
  synthesizeFlexibleTts,
  warmUpVoiceServices,
} from './lib/liveTransport';
import {
  HandyHumanVad,
  float32At16kToPcm16Base64,
  resampleFloat32To16kPcmBase64,
} from './lib/handyVad';
import { SileroNeuralVadGate } from './lib/sileroVadGate';

// 44-byte silent WAV used to "unlock" one persistent <audio> element inside a user tap.
// iOS Safari / Android WebView only allow later programmatic play() on an element that
// was started during a gesture; replies arrive seconds after the tap (hands-free STT).
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

const KAWAN_BICARA_OPENING_GEM_COST = 3;
const KAWAN_BICARA_TURN_GEM_COST = 2;
const KAWAN_BICARA_MAX_SESSION_GEMS = 25;
const KAWAN_BICARA_MIN_START_GEMS = KAWAN_BICARA_OPENING_GEM_COST;
const KAWAN_BICARA_GEM_COST = KAWAN_BICARA_MAX_SESSION_GEMS;
const DAILY_FREE_CALL_MAX_TURNS = 5;
const MAX_CALL_DURATION_SEC = Infinity; // Bebas batas waktu percakapan (unlimited)
const DAILY_FREE_CALL_LIMIT = 1;

function resolveHostFiezelState(win: any): any {
  if (!win) return null;
  try {
    if (typeof win.__getFiezelState === 'function') {
      const s = win.__getFiezelState();
      if (s && typeof s === 'object') return s;
    }
  } catch {}
  try {
    if (win.state && typeof win.state === 'object') return win.state;
  } catch {}
  return null;
}

function syncGemBadgeInDom(doc: Document | null | undefined, balance: number): void {
  if (!doc) return;
  try {
    const formatted = Math.max(0, Math.floor(balance)).toLocaleString('id-ID');
    const topEl = doc.getElementById('quizTopbarGemCount');
    if (topEl) topEl.textContent = formatted;
    const nodes = doc.querySelectorAll('.gem-count, [data-gem-count]');
    nodes.forEach((n) => {
      n.textContent = formatted;
    });
  } catch {}
}

export function isLocalTestEnvironment(): boolean {
  try {
    if (typeof location === 'undefined') return false;
    const h = location.hostname;
    const p = location.port;
    if (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === '0.0.0.0' ||
      h.startsWith('192.168.') ||
      h.startsWith('10.') ||
      h.endsWith('.local')
    ) {
      return true;
    }
    if (p === '3000' || p === '3005' || p === '4173' || p === '5173') return true;
    if (typeof window !== 'undefined') {
      const parentWin = window.parent as any;
      if (parentWin && parentWin !== window) {
        if (typeof parentWin.isLocalTestServer === 'function' && parentWin.isLocalTestServer()) {
          return true;
        }
        const ph = parentWin.location?.hostname;
        if (ph === 'localhost' || ph === '127.0.0.1') return true;
      }
    }
  } catch {}
  return false;
}

function getHostGemBalance(): number {
  if (isLocalTestEnvironment()) {
    return 99999;
  }
  try {
    if (typeof window !== 'undefined') {
      const candidates =
        window.parent && window.parent !== window ? [window.parent, window] : [window];
      for (const w of candidates) {
        const st = resolveHostFiezelState(w);
        if (st && st.gems != null) {
          if (typeof st.gems.balance === 'number') return st.gems.balance;
          if (typeof st.gems === 'number') return st.gems;
        }
      }
    }
  } catch {}
  try {
    if (typeof localStorage !== 'undefined') {
      const keys = ['fz_state_v1', 'fz_state_v1@ja', 'fz_state_v1@en', 'fiezel-v5', 'fiezel-v4-state'];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.gems != null) {
            if (typeof parsed.gems.balance === 'number') return parsed.gems.balance;
            if (typeof parsed.gems === 'number') return parsed.gems;
          }
        } catch {}
      }
    }
  } catch {}
  return 120;
}

function deductHostGems(amount: number, reason = 'kawan_bicara_voice_turn'): number {
  if (isLocalTestEnvironment()) {
    return 0; // Localhost test bypass: never deduct user gems
  }
  if (!amount || amount <= 0) return 0;
  let actualDeducted = 0;
  let updatedBalance: number | null = null;

  try {
    if (typeof window !== 'undefined') {
      const candidates =
        window.parent && window.parent !== window ? [window.parent, window] : [window];
      for (const w of candidates) {
        const pWin = w as any;
        const st = resolveHostFiezelState(pWin);
        if (st && st.gems != null) {
          if (typeof st.gems.balance === 'number') {
            const avail = Math.max(0, st.gems.balance);
            const spend = actualDeducted > 0 ? actualDeducted : Math.min(amount, avail);
            if (spend > 0) {
              st.gems.balance = Math.max(0, avail - spend);
              if (typeof st.gems.spentTotal === 'number') st.gems.spentTotal += spend;
              if (Array.isArray(st.gems.ledger)) {
                st.gems.ledger.push({
                  at: Date.now(),
                  delta: -spend,
                  reason,
                });
                if (st.gems.ledger.length > 60) st.gems.ledger.shift();
              }
              actualDeducted = spend;
              updatedBalance = st.gems.balance;
            }
          } else if (typeof st.gems === 'number') {
            const avail = Math.max(0, st.gems);
            const spend = actualDeducted > 0 ? actualDeducted : Math.min(amount, avail);
            if (spend > 0) {
              st.gems = Math.max(0, avail - spend);
              actualDeducted = spend;
              updatedBalance = st.gems;
            }
          }
          if (actualDeducted > 0) {
            try {
              if (typeof pWin.save === 'function') pWin.save();
            } catch {}
            syncGemBadgeInDom(pWin.document, updatedBalance ?? st.gems?.balance ?? 0);
            break;
          }
        }
      }
    }
  } catch {}

  try {
    if (typeof localStorage !== 'undefined') {
      const keys = ['fz_state_v1', 'fz_state_v1@ja', 'fz_state_v1@en', 'fiezel-v5', 'fiezel-v4-state'];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.gems != null) {
            if (typeof parsed.gems.balance === 'number') {
              const avail = Math.max(0, parsed.gems.balance);
              const spend = actualDeducted > 0 ? actualDeducted : Math.min(amount, avail);
              if (spend > 0 || updatedBalance !== null) {
                parsed.gems.balance =
                  updatedBalance !== null ? updatedBalance : Math.max(0, avail - spend);
                if (typeof parsed.gems.spentTotal === 'number' && actualDeducted === 0) {
                  parsed.gems.spentTotal += spend;
                }
                localStorage.setItem(k, JSON.stringify(parsed));
                if (actualDeducted === 0) {
                  actualDeducted = spend;
                  updatedBalance = parsed.gems.balance;
                }
              }
            } else if (typeof parsed.gems === 'number') {
              const avail = Math.max(0, parsed.gems);
              const spend = actualDeducted > 0 ? actualDeducted : Math.min(amount, avail);
              if (spend > 0 || updatedBalance !== null) {
                parsed.gems =
                  updatedBalance !== null ? updatedBalance : Math.max(0, avail - spend);
                localStorage.setItem(k, JSON.stringify(parsed));
                if (actualDeducted === 0) {
                  actualDeducted = spend;
                  updatedBalance = parsed.gems;
                }
              }
            }
          }
        } catch {}
      }
    }
  } catch {}

  if (updatedBalance !== null && typeof document !== 'undefined') {
    syncGemBadgeInDom(document, updatedBalance);
  }
  return actualDeducted;
}

function getDailyFreeCallAvailable(): boolean {
  if (isLocalTestEnvironment()) {
    return true; // Localhost test bypass: daily free calls are unlimited
  }
  try {
    if (typeof localStorage === 'undefined') return true;
    const today = new Date().toISOString().slice(0, 10);
    const storedDate = localStorage.getItem('fz_kawan_bicara_daily_date');
    const storedCount = parseInt(localStorage.getItem('fz_kawan_bicara_daily_count') || '0', 10);
    if (storedDate !== today) return true;
    return storedCount < DAILY_FREE_CALL_LIMIT;
  } catch {
    return true;
  }
}

function markDailyFreeCallUsed(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const today = new Date().toISOString().slice(0, 10);
    const storedDate = localStorage.getItem('fz_kawan_bicara_daily_date');
    const storedCount = parseInt(localStorage.getItem('fz_kawan_bicara_daily_count') || '0', 10);
    const nextCount = storedDate === today ? (storedCount + 1) : 1;
    localStorage.setItem('fz_kawan_bicara_daily_date', today);
    localStorage.setItem('fz_kawan_bicara_daily_count', String(nextCount));
  } catch {}
}

export default function App() {
  const [brainState, setBrainState] = useState<BraincoreStoreState>(() => loadBraincoreState());
  const [activeTab, setActiveTab] = useState<'home' | 'call' | 'braincore'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab') || urlParams.get('view');
        if (tabParam === 'home' || tabParam === 'call' || tabParam === 'braincore') {
          return tabParam === 'braincore' ? 'braincore' : 'call';
        }
      }
    } catch {
      // Ignore
    }
    return 'call'; // Single unified Mitra Kaiwa / Kawan Bicara Call Room
  });
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(() => {
    const initialLang = loadBraincoreState().targetLang || 'en';
    try {
      const saved = localStorage.getItem('fiezel_voice_persona_pref');
      if (saved && VOICE_PERSONAS[saved] && VOICE_PERSONAS[saved].targetLang === initialLang) return saved;
    } catch {}
    return initialLang === 'ja' ? 'nanami' : (initialLang === 'zh' ? 'xiao_mochi' : 'coach_alex');
  });
  const [showPersonaModal, setShowPersonaModal] = useState<boolean>(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string>(() => {
    const initialLang = loadBraincoreState().targetLang || 'en';
    const freeScenario = CALL_SCENARIOS.find((s) => s.targetLang === initialLang && s.id.includes('free'));
    if (freeScenario) return freeScenario.id;
    const firstForLang = CALL_SCENARIOS.find((s) => s.targetLang === initialLang);
    return firstForLang ? firstForLang.id : 'scen_en_free_talk';
  });
  const [customMeasureOverride, setCustomMeasureOverride] = useState<boolean | null>(null);
  // Mode tampilan di tab Panggilan: 'stage' (Panggung Live terpusat, zero-scroll) vs 'history' (Riwayat Chat & Evaluasi)
  const [callViewMode, setCallViewMode] = useState<'stage' | 'history'>('stage');

  const [turns, setTurns] = useState<CallTurn[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isAnalyzingTurn, setIsAnalyzingTurn] = useState<boolean>(false);
  // m025-637: true while the REAL AI partner is generating its reply (Mochi "thinking").
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isPlayingAiAudio, setIsPlayingAiAudio] = useState<boolean>(false);
  const isPlayingAiAudioRef = useRef<boolean>(false);
  const aiPlayoutTailTimerRef = useRef<number | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(0.88);

  const isLiveConnectingRef = useRef<boolean>(false);
  const connectSeqRef = useRef<number>(0);
  const isAiServerTurnOpenRef = useRef<boolean>(false);
  const lastAiPlayoutEndedAtRef = useRef<number>(0);

  const setAiAudioPlaying = (playing: boolean, tailDelayMs = 0) => {
    if (aiPlayoutTailTimerRef.current) {
      window.clearTimeout(aiPlayoutTailTimerRef.current);
      aiPlayoutTailTimerRef.current = null;
    }
    if (playing) {
      isPlayingAiAudioRef.current = true;
      setIsPlayingAiAudio(true);
    } else if (tailDelayMs > 0) {
      aiPlayoutTailTimerRef.current = window.setTimeout(() => {
        aiPlayoutTailTimerRef.current = null;
        isPlayingAiAudioRef.current = false;
        lastAiPlayoutEndedAtRef.current = Date.now();
        handyVadRef.current.reset();
        setIsPlayingAiAudio(false);
      }, tailDelayMs);
    } else {
      isPlayingAiAudioRef.current = false;
      lastAiPlayoutEndedAtRef.current = Date.now();
      handyVadRef.current.reset();
      setIsPlayingAiAudio(false);
    }
  };
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [pttRecordingSec, setPttRecordingSec] = useState<number>(0);
  const [copilotCards, setCopilotCards] = useState<BeginnerReplyCard[]>([]);
  const [copilotSource, setCopilotSource] = useState<'ai-realtime' | 'loading'>('loading');
  const [isGeneratingCopilot, setIsGeneratingCopilot] = useState<boolean>(false);
  const [isRefreshingAssist, setIsRefreshingAssist] = useState<boolean>(false);
  const copilotAbortRef = useRef<AbortController | null>(null);
  const inFlightCopilotKeyRef = useRef<string>('');
  const lastCopilotAiKeyRef = useRef<string>('');
  const copilotVariationSeedRef = useRef<number>(0);
  const copilotCardsRef = useRef<BeginnerReplyCard[]>([]);
  copilotCardsRef.current = copilotCards;
  const lastStreamedCopilotTextRef = useRef<string>('');
  const livePlaybackSafetyTimerRef = useRef<number | null>(null);

  const [isRecordingPtt, setIsRecordingPtt] = useState<boolean>(false);
  const userAggressionLevelRef = useRef<number>(0);
  const userPraiseCountRef = useRef<number>(0);
  const [isListeningLiveSpeech, setIsListeningLiveSpeech] = useState<boolean>(false);
  const [isWaitingAfterSpeech, setIsWaitingAfterSpeech] = useState<boolean>(false);
  const pttStartedAtRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const speechRecRef = useRef<any>(null);
  const liveSpeechRecRef = useRef<any>(null);
  const liveSilenceTimerRef = useRef<number | null>(null);
  const pttSilenceTimerRef = useRef<number | null>(null);
  const liveDictatedTextRef = useRef<string>('');
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);

  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState<boolean>(false);
  const [liveTransportMode, setLiveTransportMode] = useState<LiveTransportMode>('ws-duplex');
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [liveUserDraft, setLiveUserDraft] = useState<string>('');
  const [liveAiDraft, setLiveAiDraft] = useState<string>('');
  const [callDurationSec, setCallDurationSec] = useState<number>(0);
  const [syncingNow, setSyncingNow] = useState<boolean>(false);
  const [isUserSpeakingLive, setIsUserSpeakingLive] = useState<boolean>(false);
  const isUserSpeakingLiveRef = useRef<boolean>(false);
  const userSpeakingTimerRef = useRef<number | null>(null);
  const handyVadRef = useRef<HandyHumanVad>(new HandyHumanVad());
  const sileroVadGateRef = useRef<SileroNeuralVadGate | null>(null);
  const lastHandySpeechAtRef = useRef<number>(0);
  const liveAnalyserRef = useRef<AnalyserNode | null>(null);
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const liveAudioCtxRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const liveKeepAliveTimerRef = useRef<number | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isMicMutedRef = useRef<boolean>(false);
  const currentAudioElRef = useRef<HTMLAudioElement | null>(null);
  const sharedAudioElRef = useRef<HTMLAudioElement | null>(null);
  const audioElementPrimedRef = useRef<boolean>(false);
  const ttsAudioCtxRef = useRef<AudioContext | null>(null);
  const ttsSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const micPermWarmedRef = useRef<boolean>(false);
  const speechWatchdogRef = useRef<number | null>(null);
  // Chunked neural playback bookkeeping (m025-637): a newer speakAiText call supersedes the
  // older one, and every pending chunk promise is settled when playback is halted.
  const speakTokenRef = useRef<number>(0);
  const playbackSettleRef = useRef<(() => void) | null>(null);
  const mochiContainerRef = useRef<HTMLDivElement | null>(null);
  const mochiInstanceRef = useRef<any>(null);
  const mochiSpeechCadenceTimerRef = useRef<number | null>(null);
  const [is3dMochiReady, setIs3dMochiReady] = useState<boolean>(false);
  const [mochi3dFailed, setMochi3dFailed] = useState<boolean>(false);
  const isWorkbenchExplanationActiveRef = useRef<boolean>(false);

  // Gemini Live multi-key pool & mid-call auto-failover bookkeeping
  const liveUserDraftRef = useRef<string>('');
  const liveAiDraftRef = useRef<string>('');
  const [liveAiTranslationDraft, setLiveAiTranslationDraft] = useState<string>('');
  const liveSentenceTransMapRef = useRef<Map<string, Record<string, string>>>(new Map());
  const copilotSeqRef = useRef<number>(0);
  const copilotEarlyTimerRef = useRef<number | null>(null);
  const [autoCallNeedsTap, setAutoCallNeedsTap] = useState<boolean>(false);
  const autoCallProcessedRef = useRef<boolean>(false);
  const isLiveConnectedRef = useRef<boolean>(false);
  const userHungUpRef = useRef<boolean>(false);
  const currentLiveSessionRef = useRef<{ token?: string; keyIndex?: number; totalKeys?: number } | null>(null);
  const liveReconnectAttemptsRef = useRef<number>(0);
  const liveOpeningAudioWatchdogRef = useRef<number | null>(null);
  const callBillingRef = useRef<{
    active: boolean;
    isDailyFree: boolean;
    dailyFreeMarked: boolean;
    aiVoiceTurnsDelivered: number;
    gemsSpentThisCall: number;
    turnMetered: boolean;
    outOfGemsAfterTurn: boolean;
  }>({
    active: false,
    isDailyFree: false,
    dailyFreeMarked: false,
    aiVoiceTurnsDelivered: 0,
    gemsSpentThisCall: 0,
    turnMetered: false,
    outOfGemsAfterTurn: false,
  });
  const [liveBillingUi, setLiveBillingUi] = useState<{
    isDailyFree: boolean;
    turns: number;
    gemsSpent: number;
  }>({ isDailyFree: false, turns: 0, gemsSpent: 0 });
  const turnsRef = useRef(turns);
  turnsRef.current = turns;
  const brainStateRef = useRef(brainState);
  brainStateRef.current = brainState;

  const [callConfirmModal, setCallConfirmModal] = useState<{
    isOpen: boolean;
    isDailyFree: boolean;
    balance: number;
    cost: number;
    remainingFree: number;
  } | null>(null);

  const [insufficientGemModal, setInsufficientGemModal] = useState<{
    isOpen: boolean;
    balance: number;
    cost: number;
  } | null>(null);

  const [callMode, setCallMode] = useState<CallMode>('tutor_coach');
  const callModeRef = useRef<CallMode>('tutor_coach');

  // GoPrep FaceTime Sentiment Reflex & AI Mood Parser
  const cleanMoodTags = (text: string): string => {
    if (!text) return '';
    return text.replace(/\[MOOD:\s*[a-z_]+\]\s*/gi, '').trim();
  };

  const applyAiMoodFromText = useCallback((text: string) => {
    if (!text) return;
    const match = text.match(/\[MOOD:\s*([a-z_]+)\]/i);
    if (match && match[1]) {
      const rawMood = match[1].toLowerCase().trim();
      const inst = mochiInstanceRef.current;
      if (inst) {
        let targetMood = rawMood;
        if (targetMood === 'marah_besar' || targetMood === 'demon' || targetMood === 'sangat-marah') targetMood = 'sangat_marah';
        if (typeof inst.setMood === 'function') {
          inst.setMood(targetMood);
          if (targetMood === 'sangat_marah' && typeof inst.playIronmanTransformSound === 'function') {
            inst.playIronmanTransformSound();
          }
        }
      }
    }
  }, []);

  const evaluateAndTriggerUserSpeechSentiment = useCallback((text: string) => {
    if (!text || !text.trim()) return;
    const clean = text.toLowerCase().trim();
    const inst = mochiInstanceRef.current;
    if (!inst || typeof inst.setMood !== 'function') return;

    // 1. INSULT / DEMEANING / PUT-DOWN (Mochi gets sad / hurt / cries):
    const isInsult = /\b(jelek|buruk|bodoh|bego|tolol|goblok|sampah|payah|gak guna|tidak guna|tidak berguna|anjing|babi|bangsat|tai|cacat|stupid|idiot|dumb|useless|ugly|suck|worst|hate you|shut up|diem lu|bacot|笨蛋|바보)\b/i.test(clean);

    // 2. ANGER / SCOLDING / AGGRESSION (Mochi challenges back boldly!):
    const isAggression = /\b(berisik|diem|diam|jangan sok|sok tau|sok pintar|gua pukul|gua banting|nyebelin|lu yang salah|jangan ngatur|f\w*k|damn|piss off|annoying)\b/i.test(clean) || (clean.length >= 6 && clean === clean.toUpperCase() && /!{2,}/.test(clean));

    // 3. PRAISE / COMPLIMENT / AFFECTION (Mochi blushes cute / joyful):
    const isPraise = /\b(lucu|imut|gemoy|gemas|pintar|hebat|keren|cantik|ganteng|makasih|terima kasih|sayang|love you|cute|adorable|smart|genius|amazing|cool|kawaii|かわいい|可爱的)\b/i.test(clean);

    // 4. CONFUSION / VULNERABLE / STRUGGLING (Mochi provides empathetic comfort):
    const isConfusion = /\b(gak paham|tidak paham|pusing|bingung|susah|gak ngerti|tidak mengerti|aku nyerah|menyerah|buntu|tolong|help|confused|hard|give up)\b/i.test(clean);

    // 5. LAUGHTER / HUMOR (Mochi laughs along):
    const isLaughter = /\b(haha|wkwk|hehe|ngakak|lucu|humor|canda|lol|lmao|rofl)\b/i.test(clean);

    if (isInsult) {
      userAggressionLevelRef.current = Math.max(0, userAggressionLevelRef.current - 1);
      inst.setMood('sedih');
      inst.setAura?.('pink');
    } else if (isAggression) {
      userAggressionLevelRef.current += 1;
      const level = userAggressionLevelRef.current;
      if (level >= 3) {
        // Extreme aggression: Sangat Marah / Demon Transformation with Ironman sound!
        inst.setMood('sangat_marah');
        inst.setAura?.('amber');
        if (typeof inst.playIronmanTransformSound === 'function') {
          inst.playIronmanTransformSound();
        }
      } else if (level === 2) {
        // High aggression: Marah (Flushed red face)
        inst.setMood('marah');
        inst.setAura?.('pink');
      } else {
        // Initial challenge: Sinis (Skeptical Smirk)
        inst.setMood('sinis');
        inst.setAura?.('purple');
      }
    } else if (isPraise) {
      userAggressionLevelRef.current = 0;
      userPraiseCountRef.current += 1;
      if (userPraiseCountRef.current % 2 === 1) {
        // Blushing Empati paws
        inst.setMood('empati');
        inst.setAura?.('pink');
      } else {
        // Joyful Gembira stars
        inst.setMood('gembira');
        inst.setAura?.('green');
        inst.setFx?.('stars');
        inst.triggerHop?.(0.35);
      }
    } else if (isConfusion) {
      userAggressionLevelRef.current = 0;
      inst.setMood('empati');
      inst.setAura?.('blue');
    } else if (isLaughter) {
      inst.setMood('gembira');
      inst.setAura?.('green');
      inst.triggerEarWiggle?.(1.4);
    }
  }, []);

  const [learningWorkbench, setLearningWorkbench] = useState<{
    isOpen: boolean;
    topicTitle: string;
    focusType: 'grammar' | 'vocab' | 'kanji' | 'kana' | 'sentence_drill';
    explanationText: string;
    patternFormula: string;
    drillInstruction: string;
    sampleTarget: string;
    uiAction?: VoiceUiAction;
    preferredExerciseMode?: 'multiple_choice' | 'cloze_gap' | 'sentence_blocks';
    quizSeed?: number;
  } | null>(null);
  const isWorkbenchOpenRef = useRef<boolean>(false);
  isWorkbenchOpenRef.current = Boolean(learningWorkbench?.isOpen);
  const lastSystemIntentAtRef = useRef<{ key: string; at: number }>({ key: '', at: 0 });

  const safeBuildDossier = (
    st: BraincoreStoreState,
    scen: CallScenario,
    loc: LearnerLocale
  ): string => {
    try {
      return buildBraincoreCognitiveDossier(st, scen, loc);
    } catch {
      return '';
    }
  };

  /**
   * API-Quota-Proportional Post-Delivery Gem Metering:
   * Charges 0 Gems on connect or failed audio. Deducts Gems (or marks Daily Free used)
   * ONLY at the exact moment real AI neural audio starts playing on the learner's device.
   */
  const meterCallAiVoiceTurn = () => {
    const b = callBillingRef.current;
    if (!b.active || b.turnMetered) return;
    b.turnMetered = true;
    b.aiVoiceTurnsDelivered += 1;

    if (isLocalTestEnvironment()) {
      setLiveBillingUi({
        isDailyFree: true,
        turns: b.aiVoiceTurnsDelivered,
        gemsSpent: 0,
      });
      return;
    }

    if (b.isDailyFree && b.aiVoiceTurnsDelivered <= DAILY_FREE_CALL_MAX_TURNS) {
      if (!b.dailyFreeMarked) {
        markDailyFreeCallUsed();
        b.dailyFreeMarked = true;
      }
      setLiveBillingUi({
        isDailyFree: true,
        turns: b.aiVoiceTurnsDelivered,
        gemsSpent: b.gemsSpentThisCall,
      });
      return;
    }

    const remainingCap = Math.max(0, KAWAN_BICARA_MAX_SESSION_GEMS - b.gemsSpentThisCall);
    const rawCost =
      b.gemsSpentThisCall === 0 && !b.isDailyFree
        ? KAWAN_BICARA_OPENING_GEM_COST
        : KAWAN_BICARA_TURN_GEM_COST;
    const desired = Math.min(rawCost, remainingCap);
    if (desired > 0) {
      const avail = getHostGemBalance();
      const toSpend = Math.min(desired, Math.max(0, avail));
      if (toSpend > 0) {
        const spent = deductHostGems(
          toSpend,
          b.aiVoiceTurnsDelivered === 1
            ? 'kawan_bicara_opening_voice'
            : 'kawan_bicara_followup_voice'
        );
        b.gemsSpentThisCall += spent;
      }
      if (
        getHostGemBalance() < KAWAN_BICARA_TURN_GEM_COST &&
        b.gemsSpentThisCall < KAWAN_BICARA_MAX_SESSION_GEMS
      ) {
        b.outOfGemsAfterTurn = true;
      }
    }

    setLiveBillingUi({
      isDailyFree: b.isDailyFree,
      turns: b.aiVoiceTurnsDelivered,
      gemsSpent: b.gemsSpentThisCall,
    });
  };

  const requestStartLiveCall = () => {
    if (isLiveConnected || isLiveConnecting) return;
    if (isLocalTestEnvironment()) {
      // Localhost test bypass: Start live call directly with 0 Gem cost & zero modal blocker
      callBillingRef.current = {
        active: true,
        isDailyFree: true,
        dailyFreeMarked: false,
        aiVoiceTurnsDelivered: 0,
        gemsSpentThisCall: 0,
        turnMetered: false,
        outOfGemsAfterTurn: false,
      };
      setLiveBillingUi({ isDailyFree: true, turns: 0, gemsSpent: 0 });
      setCallConfirmModal(null);
      setInsufficientGemModal(null);
      void startLiveCall();
      return;
    }
    const balance = getHostGemBalance();
    const hasDailyFree = getDailyFreeCallAvailable();
    if (hasDailyFree) {
      setCallConfirmModal({
        isOpen: true,
        isDailyFree: true,
        balance,
        cost: 0,
        remainingFree: 1,
      });
      return;
    }
    if (balance >= KAWAN_BICARA_MIN_START_GEMS) {
      setCallConfirmModal({
        isOpen: true,
        isDailyFree: false,
        balance,
        cost: KAWAN_BICARA_OPENING_GEM_COST,
        remainingFree: 0,
      });
      return;
    }
    setInsufficientGemModal({
      isOpen: true,
      balance,
      cost: KAWAN_BICARA_MIN_START_GEMS,
    });
  };

  const handleConfirmStartCall = () => {
    if (!callConfirmModal) return;
    // 0 Gem dipotong saat klik tombol mulai! Kuota gratis / Gem baru terhitung saat audio AI benar-benar diputar.
    const isFree = callConfirmModal.isDailyFree;
    callBillingRef.current = {
      active: true,
      isDailyFree: isFree,
      dailyFreeMarked: false,
      aiVoiceTurnsDelivered: 0,
      gemsSpentThisCall: 0,
      turnMetered: false,
      outOfGemsAfterTurn: false,
    };
    setLiveBillingUi({ isDailyFree: isFree, turns: 0, gemsSpent: 0 });
    setCallConfirmModal(null);
    void startLiveCall();
  };

  /** Unlocks Web Audio + one persistent HTMLAudioElement inside a user gesture. */
  const primeAudioPlayback = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        if (!ttsAudioCtxRef.current || ttsAudioCtxRef.current.state === 'closed') {
          ttsAudioCtxRef.current = new AudioCtx();
        }
        if (ttsAudioCtxRef.current.state === 'suspended') {
          void ttsAudioCtxRef.current.resume().catch(() => {});
        }
        if (!liveAudioCtxRef.current || liveAudioCtxRef.current.state === 'closed') {
          liveAudioCtxRef.current = new AudioCtx();
          nextStartTimeRef.current = liveAudioCtxRef.current.currentTime;
        }
        const liveCtx = liveAudioCtxRef.current;
        outputAudioCtxRef.current = liveCtx;
        inputAudioCtxRef.current = liveCtx;
        // CRITICAL: Never reset nextStartTimeRef.current to liveCtx.currentTime on pointerdown/keydown
        // while activeSourcesRef chunks are already queued in the future! Resetting nextStartTimeRef
        // during a click causes incoming WebSocket audio chunks to play on top of ongoing chunks!
        if (activeSourcesRef.current.length === 0 && nextStartTimeRef.current < liveCtx.currentTime) {
          nextStartTimeRef.current = liveCtx.currentTime;
        }
        if (liveCtx.state === 'suspended') {
          void liveCtx.resume().catch(() => {});
        }
      }
    } catch {
      // Ignore
    }
    try {
      if (!sharedAudioElRef.current) {
        const el = new Audio();
        el.preload = 'auto';
        el.setAttribute('playsinline', 'true');
        sharedAudioElRef.current = el;
      }
      if (!audioElementPrimedRef.current) {
        audioElementPrimedRef.current = true;
        const el = sharedAudioElRef.current;
        if (el.paused && !el.src) {
          el.src = SILENT_WAV;
          el.muted = true;
          const p = el.play();
          if (p && typeof p.then === 'function') {
            p.then(() => {
              if (el.src === SILENT_WAV) el.pause();
              el.muted = false;
            }).catch(() => {
              audioElementPrimedRef.current = false;
              el.muted = false;
            });
          } else {
            el.muted = false;
          }
        }
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    warmUpVoiceServices();
    const onGesture = () => primeAudioPlayback();
    window.addEventListener('pointerdown', onGesture, { passive: true, capture: true });
    window.addEventListener('keydown', onGesture, { passive: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
    };
  }, []);

  const locale: LearnerLocale = brainState.learnerLocale || 'id';
  const targetLang: TargetLang = brainState.targetLang || 'en';

  const scenariosForLang = CALL_SCENARIOS.filter((s) => s.targetLang === targetLang);
  const activeScenario: CallScenario =
    scenariosForLang.find((s) => s.id === activeScenarioId) ||
    scenariosForLang[0] ||
    CALL_SCENARIOS[0];
  const activePersona: VoicePersona =
    VOICE_PERSONAS[selectedPersonaId] && VOICE_PERSONAS[selectedPersonaId].targetLang === targetLang
      ? VOICE_PERSONAS[selectedPersonaId]
      : (VOICE_PERSONAS[activeScenario.personaId] ||
          (targetLang === 'ja'
            ? VOICE_PERSONAS.nanami
            : targetLang === 'zh'
            ? VOICE_PERSONAS.xiao_mochi
            : VOICE_PERSONAS.coach_alex));

  // Note: Opening line TTS is synthesized on demand when the user clicks "Putar Suara" or starts a call,
  // preserving 100% of the Gemini API rate-limit quota for active user interactions.

  const isMeasureMode =
    customMeasureOverride !== null ? customMeasureOverride : activeScenario.isMeasureExam;

  const formatCleanLevel = (lvl: string) => {
    const stripped = String(lvl || '')
      .replace(/\b(CEFR|JLPT)\s*/gi, '')
      .trim();
    return stripped ? `Level ${stripped}` : 'Level Dasar';
  };

  const formatPersonaShortName = (rawName: string) =>
    String(rawName || '')
      .replace(/\s*\([^)]*\)\s*/g, '')
      .trim();

  const splitSentences = (text: string, lang: TargetLang): string[] => {
    const clean = (text || '').trim();
    if (!clean) return [];
    if (lang === 'ja' || lang === 'zh') {
      const matched = clean.match(/[^。！？!?.\n]+[。！？!?.\n]?/g);
      return matched ? matched.map((s) => s.trim()).filter(Boolean) : [clean];
    }
    const matched = clean.match(/[^.!?\n]+(?:[.!?]+|\n|$)/g);
    return matched ? matched.map((s) => s.trim()).filter(Boolean) : [clean];
  };

  const isGenericPlaceholderTranslation = (txt: string | null | undefined): boolean => {
    const clean = String(txt || '').trim();
    if (!clean) return true;
    return /(menanggapi ceritamu|mendengarkan ceritamu|mendengarkan dan menanggapi|menanggapi dan mendengarkan|menanyakan (?:pendapat|ceritamu)|Silakan jawab (?:dengan )?santai|กำลังถามความคิดเห็น|กำลังรับฟัง|ตอบรับเรื่องที่คุณเล่าอย่างอบอุ่น)/i.test(
      clean
    );
  };

  const updateLiveAiTranslationDraft = (fullAiText: string) => {
    const sentences = splitSentences(fullAiText, activeScenario.targetLang);
    const targetLoc = String(locale || 'id').toLowerCase();
    const pieces: string[] = [];
    sentences.forEach((raw, idx) => {
      const s = raw.trim();
      if (!s) return;
      const isComplete = idx < sentences.length - 1 || /[.?!。？！\n]$/.test(s);
      const cached = liveSentenceTransMapRef.current.get(s);
      const cachedVal = cached ? (cached[targetLoc] || cached.id || '') : '';
      if (cachedVal && !isGenericPlaceholderTranslation(cachedVal)) {
        if (pieces[pieces.length - 1] !== cachedVal) pieces.push(cachedVal);
        return;
      }
      if (!isComplete && s.length < 8) return;
      const local = translateAndPhoneticizeLiveText(
        s,
        activeScenario.targetLang,
        undefined,
        undefined,
        undefined,
        { syncOnly: true }
      );
      const localVal =
        targetLoc === 'th'
          ? local.translationTh
          : targetLoc === 'ja'
          ? local.translationJa || local.translationId
          : targetLoc === 'zh'
          ? local.translationZh || local.translationId
          : local.translationId;
      // Never stack generic placeholder strings across multiple sentences while /api/voice/translate is in flight!
      if (localVal && !isGenericPlaceholderTranslation(localVal)) {
        if (pieces[pieces.length - 1] !== localVal) pieces.push(localVal);
      }
    });
    setLiveAiTranslationDraft(pieces.join(' '));
  };

  const triggerRealtimeCopilotForAi = async (
    aiLine: string,
    lastUserLine: string,
    historyList: Array<{ speaker: 'ai' | 'user'; text: string }>,
    opts?: {
      scenarioOverride?: CallScenario;
      personaOverride?: typeof activePersona;
      forceVariation?: boolean;
      excludeTexts?: string[];
      isDebouncedStreaming?: boolean;
    }
  ) => {
    const cleanAi = String(aiLine || '').trim();
    if (!cleanAi) return;
    const scen = opts?.scenarioOverride || activeScenario;
    const pers = opts?.personaOverride || activePersona;
    const dedupKey = `${scen.id}::${scen.targetLang}::${cleanAi}::${lastUserLine}`;
    if (!opts?.forceVariation) {
      if (lastCopilotAiKeyRef.current === dedupKey && copilotCardsRef.current.length > 0) {
        return;
      }
      if (inFlightCopilotKeyRef.current === dedupKey) {
        return;
      }
    }

    const currentSeq = ++copilotSeqRef.current;

    // MANDAT USER: HAPUS TOTAL TEMPLATES!
    // Tidak ada fallback template statis atau tebakan regex. 100% respon harus murni hasil generatif AI.
    // Tampilkan loading shimmer/skeleton ("Meracik Jawaban...") HANYA jika belum ada kartu sama sekali di layar
    // agar layar tidak berkedip kosong saat regenerasi antar giliran!
    setIsGeneratingCopilot(true);
    if (copilotCardsRef.current.length === 0 && !opts?.isDebouncedStreaming) {
      setCopilotSource('loading');
      setCopilotCards([]);
    }

    if (copilotAbortRef.current) {
      try {
        copilotAbortRef.current.abort();
      } catch {
        // Ignore
      }
    }
    const controller = new AbortController();
    copilotAbortRef.current = controller;
    inFlightCopilotKeyRef.current = dedupKey;

    try {
      const res = await requestRealtimeCopilotAssist({
        aiText: cleanAi,
        lastUserText: lastUserLine,
        scenario: scen,
        persona: pers,
        targetLang: scen.targetLang,
        locale,
        history: historyList.slice(-8),
        variationSeed: opts?.forceVariation ? copilotVariationSeedRef.current : 0,
        excludeTexts: opts?.excludeTexts,
        signal: controller.signal,
      });
      if (controller.signal.aborted || copilotSeqRef.current !== currentSeq) return;
      const rawList = res.replies || res.cards || [];
      const validCards = rawList.filter((c) => c.isRealtimeAi && !c.isOfflineFallback);
      if (validCards.length > 0) {
        lastCopilotAiKeyRef.current = dedupKey;
        setCopilotCards(validCards);
        setCopilotSource('ai-realtime');
      } else if (copilotCardsRef.current.length === 0 && rawList.length > 0) {
        lastCopilotAiKeyRef.current = dedupKey;
        setCopilotCards(rawList);
        setCopilotSource('ai-realtime');
      }
      if (res.aiMeaningId || res.aiMeaningTh) {
        const cleanId = res.aiMeaningId && !isGenericPlaceholderTranslation(res.aiMeaningId) ? res.aiMeaningId : '';
        const cleanTh = res.aiMeaningTh && !isGenericPlaceholderTranslation(res.aiMeaningTh) ? res.aiMeaningTh : '';
        if (cleanId || cleanTh) {
          setTurns((prev) =>
            prev.map((tr) => {
              if (tr.speaker !== 'ai' || tr.text.trim() !== cleanAi) return tr;
              return {
                ...tr,
                translationId:
                  !tr.translationId || isGenericPlaceholderTranslation(tr.translationId)
                    ? cleanId || tr.translationId
                    : tr.translationId,
                translationTh:
                  !tr.translationTh || isGenericPlaceholderTranslation(tr.translationTh)
                    ? cleanTh || tr.translationTh
                    : tr.translationTh,
              };
            })
          );
        }
      }
    } catch {
      if (controller.signal.aborted || copilotSeqRef.current !== currentSeq) return;
    } finally {
      if (copilotAbortRef.current === controller) {
        copilotAbortRef.current = null;
        if (inFlightCopilotKeyRef.current === dedupKey) {
          inFlightCopilotKeyRef.current = '';
        }
      }
      if (copilotSeqRef.current === currentSeq) {
        setIsGeneratingCopilot(false);
      }
    }
  };

  const triggerRealtimeCopilotRef = useRef(triggerRealtimeCopilotForAi);
  triggerRealtimeCopilotRef.current = triggerRealtimeCopilotForAi;

  const prereqStatus = checkPrerequisiteStatus(brainState, activeScenario.prereqCompetencyId);
  const activeCompRecord = brainState.competencies[activeScenario.competencyId];
  const currentMasteryP = activeCompRecord?.pMasteryDecayed ?? activeCompRecord?.pMastery ?? 0.25;

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setBrainState(loadBraincoreState());
      }
    };
    const handleOffline = () => {
      setStatusBanner(
        locale === 'th'
          ? 'ฟีเจอร์คุยสดกับ Fiezel ต้องการการเชื่อมต่ออินเทอร์เน็ตสำหรับการสนทนาแบบเรียลไทม์'
          : 'Kawan Bicara membutuhkan koneksi internet aktif untuk percakapan Fiezel realtime.'
      );
    };
    const handleOnline = () => {
      setStatusBanner(null);
      setBrainState((prev) => {
        void brainSyncFlush(prev).then(({ nextState }) => setBrainState(nextState));
        return prev;
      });
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleOffline();
    }
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setShowHint(false);
    setCustomMeasureOverride(null);
    setStatusBanner(null);
    lastCopilotAiKeyRef.current = '';
    setCopilotCards([]);
    setCopilotSource('loading');

    const sessionKey = `fz_kaiwa_turns_${activeScenario.targetLang}_${activeScenario.id}`;
    let loadedTurns: CallTurn[] | null = null;
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(sessionKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedTurns = parsed;
          }
        }
      }
    } catch {
      // Ignore
    }

    const initialLine = activePersona.openingGreeting || activeScenario.openingLine;
    const initialTransId =
      activePersona.openingGreetingTranslationId || activeScenario.openingTranslationId;
    const initialTransTh =
      activePersona.openingGreetingTranslationTh || activeScenario.openingTranslationTh;
    const effectiveTurns: CallTurn[] =
      loadedTurns && loadedTurns.length > 0
        ? loadedTurns
        : [
            {
              id: `turn_open_${activeScenario.id}`,
              speaker: 'ai',
              text: initialLine,
              translationId: initialTransId,
              translationTh: initialTransTh,
              timestamp: Date.now(),
            },
          ];

    setTurns(effectiveTurns);

    const latestAi =
      [...effectiveTurns].reverse().find((tr) => tr.speaker === 'ai') || effectiveTurns[0];
    const latestUser = [...effectiveTurns].reverse().find((tr) => tr.speaker === 'user');
    if (latestAi?.text) {
      void triggerRealtimeCopilotForAi(
        latestAi.text,
        latestUser?.text || '',
        effectiveTurns.map((tr) => ({ speaker: tr.speaker, text: tr.text })),
        { scenarioOverride: activeScenario, personaOverride: activePersona }
      );
    }

    try {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    } catch {
      // Ignore
    }
  }, [activeScenario.id, activeScenario.targetLang]);

  // Persist conversation turns across refreshes and tab switches
  useEffect(() => {
    if (turns.length > 0) {
      const sessionKey = `fz_kaiwa_turns_${activeScenario.targetLang}_${activeScenario.id}`;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(sessionKey, JSON.stringify(turns.slice(-40)));
        }
      } catch {
        // Ignore quota errors
      }
    }
  }, [turns, activeScenario.targetLang, activeScenario.id]);

  // UX Invariant: Saat di Panggung Live, murid STAY di tampilan panggung tanpa auto-scroll liar ke bawah
  useEffect(() => {
    if (activeTab === 'call') {
      if (callViewMode === 'history' && turns.length > 1) {
        if (transcriptContainerRef.current) {
          transcriptContainerRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      } else if (callViewMode === 'stage') {
        try {
          if (mainScrollRef.current && mainScrollRef.current.scrollTop > 0) {
            mainScrollRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          }
        } catch {
          // Ignore
        }
      }
    }
  }, [turns.length, activeTab, callViewMode]);

  useEffect(() => {
    if (!isRecordingPtt) {
      setPttRecordingSec(0);
      return;
    }
    const timer = setInterval(() => {
      setPttRecordingSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecordingPtt]);

  useEffect(() => {
    if (!isLiveConnected) return;
    const interval = setInterval(() => {
      setCallDurationSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLiveConnected]);

  useEffect(() => {
    return () => {
      if (copilotAbortRef.current) {
        try {
          copilotAbortRef.current.abort();
        } catch {
          // Ignore
        }
      }
      stopLiveCall();
    };
  }, []);

  const handleResetCallSession = () => {
    playFiezelSfx('button_tap');
    stopLiveCall();
    setStatusBanner(null);
    setInputText('');
    lastCopilotAiKeyRef.current = '';
    const lineToSay = activePersona.openingGreeting || activeScenario.openingLine;
    setCopilotCards([]);
    setCopilotSource('loading');
    setIsGeneratingCopilot(true);
    const sessionKey = `fz_kaiwa_turns_${activeScenario.targetLang}_${activeScenario.id}`;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(sessionKey);
      }
    } catch {
      // Ignore
    }
    const transId =
      activePersona.openingGreetingTranslationId || activeScenario.openingTranslationId;
    const transTh =
      activePersona.openingGreetingTranslationTh || activeScenario.openingTranslationTh;
    const openingTurn: CallTurn = {
      id: `turn_open_${activeScenario.id}_${Date.now()}`,
      speaker: 'ai',
      text: lineToSay,
      translationId: transId,
      translationTh: transTh,
      timestamp: Date.now(),
    };
    setTurns([openingTurn]);
    void triggerRealtimeCopilotForAi(lineToSay, '', [
      { speaker: 'ai', text: lineToSay },
    ]);
    void speakAiText(lineToSay);
  };

  const handleForceFlushPwaCache = async () => {
    playFiezelSfx('button_tap');
    try {
      if (typeof caches !== 'undefined' && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((k) => k.startsWith('fiezel-shell-')).map((k) => caches.delete(k))
        );
      }
      if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'FIEZEL_SKIP_WAITING' });
          }
          if (reg.installing) {
            reg.installing.postMessage({ type: 'FIEZEL_SKIP_WAITING' });
          }
          await reg.update().catch(() => {});
        }
      }
    } catch {
      // Ignore
    }
    window.location.reload();
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__fzForceFlushPwaCache = handleForceFlushPwaCache;
    }
  }, []);

  const handleSelectTargetLang = (lang: TargetLang) => {
    playFiezelSfx('button_tap');
    stopLiveCall();
    const defaultPersona = lang === 'ja' ? 'nanami' : (lang === 'zh' ? 'xiao_mochi' : 'coach_alex');
    setSelectedPersonaId(defaultPersona);
    try {
      localStorage.setItem('fiezel_voice_persona_pref', defaultPersona);
    } catch {}
    const firstScenario =
      CALL_SCENARIOS.find((s) => s.targetLang === lang && s.personaId === defaultPersona && s.id.includes('free')) ||
      CALL_SCENARIOS.find((s) => s.targetLang === lang && s.id.includes('free')) ||
      CALL_SCENARIOS.find((s) => s.targetLang === lang) ||
      CALL_SCENARIOS[0];
    setActiveScenarioId(firstScenario.id);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fz_target_course', lang);
      }
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('lang', lang);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      // Ignore
    }
    setBrainState(saveBraincoreState({ ...brainState, targetLang: lang }));
  };

  const handleSelectPersona = (pId: string) => {
    const p = VOICE_PERSONAS[pId];
    if (!p) return;
    setSelectedPersonaId(pId);
    try {
      localStorage.setItem('fiezel_voice_persona_pref', pId);
    } catch {}
    const matchingScen =
      CALL_SCENARIOS.find((s) => s.targetLang === p.targetLang && s.personaId === pId && s.id.includes('free')) ||
      CALL_SCENARIOS.find((s) => s.targetLang === p.targetLang && s.personaId === pId) ||
      activeScenario;
    if (matchingScen && matchingScen.id !== activeScenarioId) {
      setActiveScenarioId(matchingScen.id);
    }
    playFiezelSfx('button_tap');
    if (isLiveConnectedRef.current) {
      stopLiveCall();
    }
    const lineToSay = p.openingGreeting || matchingScen.openingLine;
    const transId = p.openingGreetingTranslationId || matchingScen.openingTranslationId;
    const transTh = p.openingGreetingTranslationTh || matchingScen.openingTranslationTh;
    const newOpeningTurn: CallTurn = {
      id: `turn_open_${matchingScen.id}_${Date.now()}`,
      speaker: 'ai',
      text: lineToSay,
      translationId: transId,
      translationTh: transTh,
      timestamp: Date.now(),
    };
    setTurns([newOpeningTurn]);
    void triggerRealtimeCopilotForAi(
      lineToSay,
      '',
      [{ speaker: 'ai', text: lineToSay }],
      { scenarioOverride: matchingScen, personaOverride: p }
    );
    if (lineToSay) {
      void speakAiText(lineToSay, null, undefined, {
        spokenLang: p.targetLang,
        personaOverride: p,
      });
    }
    setShowPersonaModal(false);
  };

  const handleSelectScenario = (scenId: string) => {
    const scen = CALL_SCENARIOS.find((s) => s.id === scenId);
    if (!scen) return;
    setActiveScenarioId(scen.id);
    const p = (scen.personaId && VOICE_PERSONAS[scen.personaId]) ? VOICE_PERSONAS[scen.personaId] : activePersona;
    if (scen.personaId && VOICE_PERSONAS[scen.personaId]) {
      setSelectedPersonaId(scen.personaId);
      try {
        localStorage.setItem('fiezel_voice_persona_pref', scen.personaId);
      } catch {}
    }
    playFiezelSfx('button_tap');
    if (isLiveConnectedRef.current || isLiveConnectingRef.current) {
      stopLiveCall();
    }
    const lineToSay = p.openingGreeting || scen.openingLine;
    const transId = p.openingGreetingTranslationId || scen.openingTranslationId;
    const transTh = p.openingGreetingTranslationTh || scen.openingTranslationTh;
    const newOpeningTurn: CallTurn = {
      id: `turn_open_${scen.id}_${Date.now()}`,
      speaker: 'ai',
      text: lineToSay,
      translationId: transId,
      translationTh: transTh,
      timestamp: Date.now(),
    };
    setTurns([newOpeningTurn]);
    void triggerRealtimeCopilotForAi(
      lineToSay,
      '',
      [{ speaker: 'ai', text: lineToSay }],
      { scenarioOverride: scen, personaOverride: p }
    );
    if (lineToSay) {
      void speakAiText(lineToSay, null, undefined, {
        spokenLang: scen.targetLang,
        personaOverride: p,
      });
    }
    setShowPersonaModal(false);
  };

  const handleSelectLocale = (nextLocale: LearnerLocale) => {
    playFiezelSfx('button_tap');
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('locale', nextLocale);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      // Ignore
    }
    setBrainState(saveBraincoreState({ ...brainState, learnerLocale: nextLocale }));
  };

  const clearSpeechWatchdog = () => {
    if (speechWatchdogRef.current) {
      window.clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }
  };

  /**
   * NEURAL-ONLY VOICE (owner directive): the AI partner speaks ONLY with the multi-character
   * Edge Neural voices (Coach Alex/Sarah, Nanami, Keita). Browser `speechSynthesis` (robotic)
   * is intentionally never used. If the neural server cannot answer, the reply text stays on
   * screen and the learner can replay it with "Putar Suara", never a robot voice.
   */
  const fetchNeuralVoice = async (
    text: string,
    spokenLang?: string,
    personaOverride?: typeof activePersona
  ) => {
    const persToUse = personaOverride || activePersona;
    const langToUse = (spokenLang as TargetLang) || persToUse?.targetLang || activeScenario.targetLang;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await synthesizeFlexibleTts({
        text,
        targetLang: langToUse,
        persona: persToUse,
        force: attempt > 0,
      });
      if (res?.audioBase64) return res;
      if (attempt < 1) await new Promise((r) => window.setTimeout(r, 250));
    }
    return null;
  };

  const stopNeuralBufferSource = () => {
    if (playbackSettleRef.current) {
      const settle = playbackSettleRef.current;
      playbackSettleRef.current = null;
      settle();
    }
    if (ttsSourceNodeRef.current) {
      try {
        ttsSourceNodeRef.current.onended = null;
        ttsSourceNodeRef.current.stop();
        ttsSourceNodeRef.current.disconnect();
      } catch {
        // Ignore
      }
      ttsSourceNodeRef.current = null;
    }
  };

  const getOrAttachAnalyser = (
    ctx: AudioContext,
    holderRef: React.MutableRefObject<AnalyserNode | null>
  ): AudioNode => {
    try {
      if (typeof ctx.createAnalyser !== 'function') return ctx.destination;
      const isNew = !holderRef.current || (holderRef.current as any).context !== ctx;
      if (isNew) {
        const an = ctx.createAnalyser();
        an.fftSize = 2048;
        an.smoothingTimeConstant = 0.5;
        an.connect(ctx.destination);
        holderRef.current = an;
        if (mochiInstanceRef.current?.attachAudioAnalyser) {
          mochiInstanceRef.current.attachAudioAnalyser(an, ctx.sampleRate || 24000);
        }
      }
      return holderRef.current;
    } catch {
      return ctx.destination;
    }
  };

  /** Plays base64 MP3 through the gesture-unlocked Web Audio context (autoplay-immune). */
  const playNeuralBase64ViaWebAudio = async (
    audioBase64: string,
    targetRate: number,
    onDone: () => void
  ): Promise<boolean> => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      if (!ttsAudioCtxRef.current || ttsAudioCtxRef.current.state === 'closed') {
        ttsAudioCtxRef.current = new AudioCtx();
      }
      const ctx = ttsAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
      const bin = atob(audioBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
      // Stop only the previous Web Audio node here, NOT the chunk promise that is
      // currently waiting for this very playback to finish.
      if (ttsSourceNodeRef.current) {
        try {
          ttsSourceNodeRef.current.onended = null;
          ttsSourceNodeRef.current.stop();
          ttsSourceNodeRef.current.disconnect();
        } catch {
          // Ignore
        }
        ttsSourceNodeRef.current = null;
      }
      const src = ctx.createBufferSource();
      src.buffer = decoded;
      src.playbackRate.value = targetRate;
      src.connect(getOrAttachAnalyser(ctx, ttsAnalyserRef));
      ttsSourceNodeRef.current = src;
      src.onended = () => {
        if (ttsSourceNodeRef.current === src) ttsSourceNodeRef.current = null;
        onDone();
      };
      src.start(0);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Plays ONE neural MP3 chunk and resolves when it has finished, failed, or been halted.
   * HTMLAudio first (element unlocked during the user's tap), then the gesture-unlocked
   * Web Audio context, never browser `speechSynthesis`.
   * Resolves `true` when audio actually started.
   */
  const playNeuralChunk = (
    audioBase64: string,
    audioMime: string,
    targetRate: number
  ): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      let settled = false;
      let started = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        clearSpeechWatchdog();
        if (playbackSettleRef.current === settle) playbackSettleRef.current = null;
        resolve(started);
      };
      playbackSettleRef.current = settle;

      const audio = sharedAudioElRef.current || new Audio();
      const detach = () => {
        audio.onended = null;
        audio.onerror = null;
        audio.onpause = null;
        if (currentAudioElRef.current === audio) currentAudioElRef.current = null;
      };
      detach();
      audio.muted = false;
      audio.src = `data:${audioMime};base64,${audioBase64}`;
      audio.defaultPlaybackRate = targetRate;
      audio.playbackRate = targetRate;
      currentAudioElRef.current = audio;
      const done = () => {
        detach();
        settle();
      };
      audio.onended = done;
      audio.onerror = done;
      // Watchdog: a stalled decoder must never keep the hands-free mic closed forever.
      speechWatchdogRef.current = window.setTimeout(done, 30000);
      audio
        .play()
        .then(() => {
          started = true;
          // Halted from outside (hang-up / newer reply) also ends this chunk.
          audio.onpause = done;
        })
        .catch(async () => {
          // HTMLAudio blocked outside a tap (hands-free turn on Safari/mobile): play the
          // EXACT SAME neural MP3 via the unlocked Web Audio context, zero robot voice.
          detach();
          if (settled) return;
          const ok = await playNeuralBase64ViaWebAudio(audioBase64, targetRate, () => settle());
          if (ok) started = true;
          else settle();
        });
    });

  const speakAiText = async (
    text: string,
    preloadedBase64?: string | null,
    overrideRate?: number,
    opts?: {
      isManualReplay?: boolean;
      spokenLang?: string;
      personaOverride?: typeof activePersona;
    }
  ) => {
    const cleanSpoken = stripEmojisAndEmotWords(text).trim();
    if (!cleanSpoken) return;

    // Never allow automatic background HTTP TTS to interrupt or overlap with an active/connecting Gemini 3.8 Live WebSocket call!
    if ((isLiveConnectedRef.current || isLiveConnectingRef.current) && !opts?.isManualReplay) {
      return;
    }

    // ZERO AUDIO COLLISION: Silence any previous playback, OS speechSynthesis, or buffer sources
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    stopNeuralBufferSource();
    if (activeSourcesRef.current.length > 0 && !isLiveConnectedRef.current) {
      activeSourcesRef.current.forEach((src) => {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // Ignore
        }
      });
      activeSourcesRef.current = [];
    }

    const targetRate = overrideRate ?? speechRate;
    const token = ++speakTokenRef.current;

    // Single continuous WAV synthesis: never split a spoken reply into multiple sequential WebSocket TTS requests,
    // which causes mid-sentence pauses, prosody resets, and single-key WebSocket contention.
    const chunks = [cleanSpoken];
    const fetchChunk = (idx: number) =>
      idx === 0 && preloadedBase64
        ? Promise.resolve({ audioBase64: preloadedBase64, audioMimeType: 'audio/mpeg', engine: 'preloaded' })
        : fetchNeuralVoice(chunks[idx], opts?.spokenLang, opts?.personaOverride);
    let nextAudioJob: Promise<{ audioBase64: string; audioMimeType: string; engine: string } | null> | null =
      fetchChunk(0);

    if (token !== speakTokenRef.current) return;

    clearSpeechWatchdog();
    stopNeuralBufferSource();
    if (currentAudioElRef.current) {
      currentAudioElRef.current.onpause = null;
      currentAudioElRef.current.pause();
      currentAudioElRef.current = null;
    }
    setAiAudioPlaying(true);

    let anyAudio = false;
    let anyPlayed = false;
    try {
      for (let i = 0; i < chunks.length; i++) {
        const currentJob = nextAudioJob || fetchChunk(i);
        const res = await currentJob;
        if (token !== speakTokenRef.current) return;
        if ((isLiveConnectedRef.current || isLiveConnectingRef.current) && !opts?.isManualReplay) {
          return;
        }
        nextAudioJob = i + 1 < chunks.length ? fetchChunk(i + 1) : null;
        if (!res?.audioBase64) continue;
        anyAudio = true;
        const ok = await playNeuralChunk(res.audioBase64, res.audioMimeType || 'audio/mpeg', targetRate);
        if (token !== speakTokenRef.current) return;
        if (ok) {
          if (!anyPlayed && !opts?.isManualReplay && callBillingRef.current.active) {
            callBillingRef.current.turnMetered = false;
            meterCallAiVoiceTurn();
          }
          anyPlayed = true;
          setStatusBanner(null);
        } else if (!anyPlayed) {
          setStatusBanner(
            locale === 'th'
              ? 'เบราว์เซอร์บล็อกการเล่นอัตโนมัติ แตะ "เล่นเสียง" เพื่อฟังคำตอบ'
              : 'Peramban menahan pemutaran otomatis. Ketuk "Putar Suara" untuk mendengar balasan.'
          );
          break;
        }
      }
      if (!anyAudio) {
        // NEURAL-ONLY VOICE INVARIANT: Never fall back to robotic OS window.speechSynthesis!
        setStatusBanner(
          locale === 'th'
            ? 'เสียง Neural กำลังเชื่อมต่อใหม่ ข้อความยังแสดงอยู่ แตะ "เล่นเสียง" เพื่อลองอีกครั้ง'
            : 'Suara Fiezel sedang menyambung ulang. Teks balasan tetap tampil, ketuk "Putar Suara" untuk mencoba lagi.'
        );
      }
    } catch {
      // Ignore, the reply text stays on screen and can be replayed.
    } finally {
      if (token === speakTokenRef.current) {
        clearSpeechWatchdog();
        setAiAudioPlaying(false, 250);
        isWorkbenchExplanationActiveRef.current = false;
      }
    }
  };

  /**
   * Deteksi kalimat yang belum lengkap (koma gramatikal, konjungsi, preposisi, kata ganti, partikel,
   * atau bunyi jeda berpikir / filler) agar VAD memberikan jeda berpikir lebih panjang (4500ms vs 3200ms baseline)
   * tanpa memotong murid yang sedang merangkai kata.
   */
  const isGrammaticallyIncomplete = (t: string, lang: TargetLang): boolean => {
    const lower = t.toLowerCase().trim();
    if (!lower) return false;
    const cleanChars = lower.replace(/\s+/g, '');
    if (lang === 'en') {
      if (t.trim().split(/\s+/).length < 3) return true;
      return /\b(and|or|but|because|so|if|as|with|to|for|in|on|at|of|from|by|about|a|an|the|i|you|we|they|he|she|it|my|your|our|their|is|are|was|were|have|has|had|do|did|does|can|could|will|would|like|want|would like|could i|can i|give me|i'd|i'm|we're|there's|that's|what|where|when|why|how|uh|um|umm|er|err|well|hmm|like)\s*$/i.test(lower);
    }
    if (lang === 'zh') {
      if (cleanChars.length <= 2) return true;
      return /(的|和|跟|但是|可是|因为|所以|如果|虽然|在|给|对|呃|嗯|那个|就是)\s*$/i.test(lower);
    }
    if (cleanChars.length <= 4) return true;
    return /([\u306f\u304c\u3092\u306b\u3078\u3067\u3068\u304b\u3089\u307e\u3067\u3088\u308a\u306e\u304b\u306d\u3088\u3051\u3069\u306e\u3067\u3066\u3067\u3057\u305f\u308a]|ええと|あの|あのう|その|そのう|えー|えっと|んー|まあ|うーん|そうですね|eeto|ano|anou|sono|etto|un)\s*$/i.test(lower);
  };

  /**
   * Instant Barge-In (Menyela AI seperti di ChatGPT Voice).
   * Memotong seketika audio balasan Mochi dan mengembalikan kendali mic ke murid.
   */
  const interruptAiAndStartListening = () => {
    speakTokenRef.current += 1;
    clearSpeechWatchdog();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    if (livePlaybackSafetyTimerRef.current) {
      window.clearTimeout(livePlaybackSafetyTimerRef.current);
      livePlaybackSafetyTimerRef.current = null;
    }
    stopNeuralBufferSource();
    if (activeSourcesRef.current.length > 0) {
      activeSourcesRef.current.forEach((src) => {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // Ignore
        }
      });
      activeSourcesRef.current = [];
    }
    if (currentAudioElRef.current) {
      try {
        currentAudioElRef.current.onended = null;
        currentAudioElRef.current.onerror = null;
        currentAudioElRef.current.onpause = null;
        currentAudioElRef.current.pause();
        currentAudioElRef.current.src = '';
      } catch {
        // Ignore
      }
      currentAudioElRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
    setAiAudioPlaying(false, 0);
  };

  /**
   * Short neural "listening" filler (e.g. "Hmm, okay…" / 「えーと…」) while the real AI is
   * still thinking.
   */
  const isAiThinkingRef = useRef<boolean>(false);

  const handleUnlockPrerequisite = () => {
    playFiezelSfx('lesson_start');
    const updated = recordVocabPrereqMastery(brainState, activeScenario.prereqCompetencyId);
    setBrainState(updated);
    void brainSyncFlush(updated).then(({ nextState }) => setBrainState(nextState));
  };

  const commitLiveUserTurn = (textToCommit: string) => {
    const uText = sanitizeHallucinatedTranscript(
      textToCommit,
      activeScenario.targetLang,
      locale
    ).trim();
    if (!uText) return;

    liveUserDraftRef.current = '';
    setLiveUserDraft('');

    const earlyIntent = detectClientVoiceSystemIntent(uText);
    if (earlyIntent?.actionType === 'navigate_app' && earlyIntent.destination) {
      handleVoiceNavigateApp(earlyIntent.destination, 'live_commit_voice_command');
      return;
    }
    if (
      earlyIntent?.actionType === 'close_learning_popup' ||
      earlyIntent?.actionType === 'reroll_quiz' ||
      earlyIntent?.actionType === 'switch_exercise_mode'
    ) {
      executeVoiceUiAction(earlyIntent, uText);
      return;
    }
    if (earlyIntent?.actionType === 'open_learning_popup') {
      const reqSeq = ++workbenchSessionRef.current.turnSeq;
      workbenchSessionRef.current.dismissedByUser = false;
      openLearningWorkbenchWithAction(
        {
          ...earlyIntent,
          sourceLayer: 'live_ws_native',
        },
        uText
      );
      void (async () => {
        try {
          for (const base of resolveVoiceApiCandidateBases()) {
            const res = await fetch(`${base}/api/voice/partner-turn`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: `[WHITEBOARD_REQUEST] ${uText}`,
                forcePopup: true,
                personaId: activePersona.id,
                personaName: activePersona.name,
                scenarioId: activeScenario.id,
                scenarioTitle: activeScenario.titleId,
                targetLang: activeScenario.targetLang,
                locale,
                callMode: 'tutor_coach',
                history: turnsRef.current.slice(-4).map((t) => ({ speaker: t.speaker, text: t.text })),
              }),
            });
            if (res.ok) {
              const data = await res.json();
              if (
                reqSeq === workbenchSessionRef.current.turnSeq &&
                !workbenchSessionRef.current.dismissedByUser &&
                data?.uiAction?.actionType === 'open_learning_popup'
              ) {
                openLearningWorkbenchWithAction(
                  { ...data.uiAction, sourceLayer: 'live_ws_native' },
                  uText
                );
              }
              break;
            }
          }
        } catch {
          // Ignore network fallback
        }
      })();
    }

    const evalParams = {
      text: uText,
      scenario: activeScenario,
      persona: activePersona,
      targetLang: activeScenario.targetLang,
      locale,
      measureMode: isMeasureMode,
      learnerDossier: safeBuildDossier(
        brainStateRef.current,
        activeScenario,
        locale
      ),
      history: turnsRef.current.slice(-6).map((tItem) => ({
        speaker: tItem.speaker,
        text: tItem.text,
      })),
    };
    const ev = evaluateTurnLocal(evalParams);
    const effectiveHints = isMeasureMode ? 0 : showHint ? 1 : 0;
    const outcome = recordSpeakingAttempt(brainStateRef.current, {
      competencyId: activeScenario.competencyId,
      scenarioId: activeScenario.id,
      targetLang: activeScenario.targetLang,
      userExactTranscript: uText,
      ok: Boolean(ev.ok),
      grammarScore: ev.grammarScore,
      fluencyScore: ev.fluencyScore,
      vocabUsageScore: ev.vocabUsageScore,
      accuracyScore: ev.accuracyScore,
      misconceptionId: ev.misconceptionId || null,
      correctionPattern: ev.syntacticCorrection || ev.naturalReformulation || null,
      hintsUsed: effectiveHints,
      confidence: 0.85,
      measureMode: isMeasureMode,
    });
    brainStateRef.current = outcome.nextState;
    setBrainState(outcome.nextState);
    if (isMeasureMode) {
      playFiezelSfx(ev.ok ? 'answer_correct' : 'answer_wrong');
    }
    const turnDiag: TurnDiagnosis = {
      ok: Boolean(ev.ok),
      accuracyScore: ev.accuracyScore,
      grammarScore: ev.grammarScore,
      fluencyScore: ev.fluencyScore,
      vocabUsageScore: ev.vocabUsageScore,
      userExactTranscript: uText,
      misconceptionId: ev.misconceptionId || null,
      whyFailsId: ev.whyFailsId || null,
      whyFailsTh: ev.whyFailsTh || null,
      missingTokens: ev.missingTokens || [],
      syntacticCorrection: ev.syntacticCorrection || null,
      naturalReformulation: ev.naturalReformulation || uText,
      pedagogicalFeedbackId: ev.pedagogicalFeedbackId,
      pedagogicalFeedbackTh: ev.pedagogicalFeedbackTh,
      bktBefore: outcome.bktBefore,
      bktAfter: outcome.bktAfter,
      thetaAfter: outcome.thetaAfter,
      masteryStateAfter: outcome.masteryStateAfter,
    };

    setTurns((prev) => [
      ...prev,
      {
        id: `live_u_${Date.now()}`,
        speaker: 'user',
        text: uText,
        timestamp: Date.now(),
        diagnosis: turnDiag,
      },
    ]);
  };

  const submitLiveUserUtterance = (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    evaluateAndTriggerUserSpeechSentiment(trimmed);

    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN
    ) {
      wsRef.current.send(
        JSON.stringify({
          clientContent: {
            turns: [{ role: 'user', parts: [{ text: trimmed }] }],
            turnComplete: true,
          },
        })
      );
    }
    commitLiveUserTurn(trimmed);
  };

  const buildDefaultWorkbenchPayload = (
    hintText = '',
    override?: Partial<VoiceUiAction>
  ): NonNullable<typeof learningWorkbench> => {
    const rawTitle = (override?.topicTitle || hintText || '').trim();
    const title = rawTitle || 'Papan Belajar';

    let focusType: 'grammar' | 'vocab' | 'kanji' | 'kana' | 'sentence_drill' =
      override?.focusType ||
      (/kanji|hanzi|huruf china|aksara/i.test(title)
        ? 'kanji'
        : /kana|hiragana|katakana/i.test(title)
          ? 'kana'
          : /kosakata|vocab|kata baru|arti kata/i.test(title)
            ? 'vocab'
            : 'grammar');

    return {
      isOpen: true,
      focusType,
      topicTitle: title,
      explanationText: override?.explanationText || '',
      patternFormula: override?.patternFormula || '',
      drillInstruction: override?.drillInstruction || '',
      sampleTarget: override?.sampleTarget || '',
      uiAction: override as VoiceUiAction,
    };
  };

  const handleVoiceNavigateApp = (rawDest: string, reason = 'voice_command'): boolean => {
    const cleanDest = String(rawDest || '').trim().toLowerCase();
    if (!cleanDest) return false;
    const dedupKey = `nav:${cleanDest}`;
    if (
      lastSystemIntentAtRef.current.key === dedupKey &&
      Date.now() - lastSystemIntentAtRef.current.at < 1800
    ) {
      return true;
    }
    lastSystemIntentAtRef.current = { key: dedupKey, at: Date.now() };
    playFiezelSfx('button_tap');
    stopLiveCall();
    return dispatchVoiceAppNavigation(cleanDest, {
      course: activeScenario.targetLang,
      reason,
    });
  };

  const workbenchSessionRef = useRef<{
    turnSeq: number;
    dismissedByUser: boolean;
    completedQuizSentence: string;
  }>({
    turnSeq: 0,
    dismissedByUser: false,
    completedQuizSentence: '',
  });

  const openLearningWorkbenchWithAction = (action?: Partial<VoiceUiAction>, hintText = '') => {
    if (isMeasureMode) return;
    const hasRichAction = Boolean(
      (action?.sampleTarget && action.sampleTarget.trim().length > 3) ||
      (action?.rightWord && action.rightWord.trim().length > 0 && action.rightWord !== 'bentuk tepat')
    );
    const dedupKey = `popup:${action?.bankTopicId || action?.topicTitle || hintText || activeScenario.id}`;
    if (
      !hasRichAction &&
      lastSystemIntentAtRef.current.key === dedupKey &&
      Date.now() - lastSystemIntentAtRef.current.at < 1500
    ) {
      return;
    }
    lastSystemIntentAtRef.current = { key: dedupKey, at: Date.now() };
    workbenchSessionRef.current.dismissedByUser = false;

    const isLiveActive =
      Boolean(
        isLiveConnectedRef.current &&
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) || action?.sourceLayer === 'live_ws_native';

    const effectiveAction: Partial<VoiceUiAction> | undefined = isLiveActive
      ? { ...(action || {}), sourceLayer: 'live_ws_native' }
      : action;

    // The learning workbench is visual. Opening it must NEVER kill or interrupt ongoing speech!
    isWorkbenchExplanationActiveRef.current = false;

    const wbPayload = buildDefaultWorkbenchPayload(hintText, effectiveAction);
    setLearningWorkbench((prev) => {
      if (
        prev?.isOpen &&
        !hasRichAction &&
        Boolean(prev.uiAction?.sampleTarget && prev.uiAction.sampleTarget.trim().length > 3)
      ) {
        return prev;
      }
      return wbPayload;
    });
  };

  const executeVoiceUiAction = (uiAction?: VoiceUiAction, userHint = ''): boolean => {
    if (!uiAction || uiAction.actionType === 'none') return false;
    if (uiAction.actionType === 'close_learning_popup') {
      workbenchSessionRef.current.dismissedByUser = true;
      isWorkbenchExplanationActiveRef.current = false;
      setLearningWorkbench(null);
      playFiezelSfx('button_tap');
      return true;
    }
    if (uiAction.actionType === 'reroll_quiz') {
      setLearningWorkbench((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          quizSeed: (prev.quizSeed || 0) + 1,
        };
      });
      playFiezelSfx('button_tap');
      return true;
    }
    if (uiAction.actionType === 'switch_exercise_mode' && uiAction.exerciseMode) {
      const mode = uiAction.exerciseMode;
      setLearningWorkbench((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          preferredExerciseMode: mode,
        };
      });
      playFiezelSfx('button_tap');
      return true;
    }
    if (uiAction.actionType === 'switch_call_mode' && uiAction.callMode) {
      const nextMode: CallMode = uiAction.callMode === 'casual_chat' ? 'casual_chat' : 'tutor_coach';
      callModeRef.current = nextMode;
      setCallMode(nextMode);
      playFiezelSfx('button_tap');
      return true;
    }
    if (uiAction.actionType === 'navigate_app' && uiAction.destination) {
      return handleVoiceNavigateApp(uiAction.destination, 'ai_ui_action');
    }
    if (uiAction.actionType === 'open_learning_popup') {
      openLearningWorkbenchWithAction(uiAction, userHint);
      return true;
    }
    return false;
  };

  const detectClientVoiceSystemIntent = (utterance: string): VoiceUiAction | null => {
    const s = String(utterance || '').trim().toLowerCase();
    if (!s || s.length < 4) return null;

    // 0-A) Voice Control while Learning Workbench (Papan Belajar) is OPEN
    if (isWorkbenchOpenRef.current) {
      if (
        /\b(ganti\s+soal|soal\s+(?:baru|lain|beda)|coba\s+(?:ganti|soal\s+lain)|next\s+question|change\s+question|another\s+question|reroll)\b/i.test(
          s
        )
      ) {
        return { actionType: 'reroll_quiz' };
      }
      if (
        /\b(tutup\s+(?:papan|pop[\s-]?up|whiteboard)|kembali\s+(?:ngobrol|bicara)|lanjut\s+(?:ngobrol|bicara)|close\s+whiteboard|sudah\s+paham|tutup\s+sekarang)\b/i.test(
          s
        )
      ) {
        return { actionType: 'close_learning_popup' };
      }
      if (/\b(susun\s+kata|susun\s+balok|mode\s+susun|balok\s+kata|word\s+blocks)\b/i.test(s)) {
        return { actionType: 'switch_exercise_mode', exerciseMode: 'sentence_blocks' };
      }
      if (
        /\b(isi\s+kata|isian\s+rumpang|cloze|isi\s+blank|titik[\s-]titik|lengkapi\s+kalimat|fill\s+in\s+the\s+blank)\b/i.test(
          s
        )
      ) {
        return { actionType: 'switch_exercise_mode', exerciseMode: 'cloze_gap' };
      }
      if (/\b(pilihan\s+ganda|mode\s+pilihan|multiple\s+choice|opsi\s+pilihan)\b/i.test(s)) {
        return { actionType: 'switch_exercise_mode', exerciseMode: 'multiple_choice' };
      }
    }

    // 0-B) Voice-Commanded Call Mode Switch (Mandate #1: Casual Chat vs Tutor Coach)
    if (
      /\b(chat\s+seperti\s+biasa|ngobrol\s+(?:santai|biasa\s+aja)|mode\s+(?:santai|kasual|casual|biasa|teman)|jangan\s+(?:ngajarin|koreksi)\s+dulu|just\s+chat\s+casually|casual\s+mode|chill\s+mode)\b/i.test(
        s
      )
    ) {
      return { actionType: 'switch_call_mode', callMode: 'casual_chat' };
    }
    if (
      /\b(mode\s+(?:guru|mentor|mengajar|tutor|belajar)|ajarin\s+aku\s+lagi|koreksi\s+aku\s+lagi|coach\s+mode|tutor\s+mode|teach\s+me\s+mode)\b/i.test(
        s
      )
    ) {
      return { actionType: 'switch_call_mode', callMode: 'tutor_coach' };
    }

    // 1) Explicit voice navigation commands to FIEZEL modules & courses
    const navTrigger =
      /\b(buka|bukain|bukakan|arahkan|arahin|pindah|ganti|masuk|pergi|lanjut|ke halaman|ke fitur|ke modul|ke kursus|open|go to|take me to|switch to|navigate to|เปิด|ไปที่)\b/i.test(
        s
      );
    if (navTrigger && !/\bpop[\s-]?up\b/i.test(s)) {
      if (/\b(kursus\s+jepang|belajar\s+jepang|japanese\s+course)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'course_ja' };
      }
      if (/\b(kursus\s+mandarin|belajar\s+mandarin|chinese\s+course)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'course_zh' };
      }
      if (/\b(kursus\s+inggris|belajar\s+inggris|english\s+course)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'course_en' };
      }
      if (/\b(kurikulum|peta belajar|silabus|curriculum)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'kurikulum' };
      }
      if (/\b(misi|misi harian|daily mission|quest)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'misi' };
      }
      if (/\b(grammar|tata bahasa|pola kalimat|ไวยากรณ์)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'grammar' };
      }
      if (/\b(kosakata|kosa kata|vocab|vocabulary|kata baru|คำศัพท์)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'vocab' };
      }
      if (/\b(kana|hiragana|katakana|คานะ)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'kana' };
      }
      if (/\b(kanji|hanzi|menulis|tulisan|writing|คันจิ|เขียน)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'writing' };
      }
      if (/\b(reading|bacaan|membaca|การอ่าน)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'reading' };
      }
      if (/\b(listening|pendengaran|mendengar|chokai|การฟัง)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'listening' };
      }
      if (/\b(cerita|story|stories)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'story' };
      }
      if (/\b(ujian|tes|test|exam|แบบทดสอบ)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'test' };
      }
      if (/\b(kuis|quiz|latihan soal)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'latihan' };
      }
      if (/\b(progress|progres|statistik|perkembangan|สถิติ)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'progress' };
      }
      if (/\b(beranda|menu utama|halaman utama|home|หน้าแรก)\b/i.test(s)) {
        return { actionType: 'navigate_app', destination: 'home' };
      }
    }

    // 2-A) Explicit request to be tested / quizzed
    const asksTestingOrQuiz =
      /\b(tes\s+aku|coba\s+tes|uji\s+aku|coba\s+uji|kasih\s+soal|buatkan\s+(?:aku\s+)?latihan|coba\s+kasih\s+soal|kuiskan\s+aku|test\s+me|quiz\s+me)\b/i.test(
        s
      );
    if (asksTestingOrQuiz) {
      return {
        actionType: 'open_learning_popup',
        topicTitle: utterance.trim(),
      };
    }

    // 2-B) Explicit request for interactive written learning popup OR any grammar/usage question
    const explicitPopupCmd =
      /\b(pop[\s-]?up|papan tulis|papan belajar|whiteboard|latihan tulis|tulis langsung|ajarin tertulis|buka kartu belajar|munculkan latihan)\b/i.test(
        s
      );
    const asksGrammarOrStruggle =
      /\b(bingung|susah|sulit|belum paham|nggak paham|gak paham|kurang paham|pusing|confused|struggling|don't understand|hard to understand|bedanya|perbedaan|cara\s+(?:menggunakan|memakai|pakai)|bagaimana\s+cara|gimana cara pakai|kapan pakai|kenapa pakai|jelasin|ajarin|tolong bahas|งง|ไม่เข้าใจ)\b/i.test(
        s
      ) &&
      (s.length >= 10 ||
        /\b(grammar|tata bahasa|partikel|particle|tenses?|past tense|present|perfect|verb|konjugasi|nada|tone|kanji|hanzi|pola|kalimat|since|for|did|does|agree|although|despite|modal|passive|conditional|は|が|を|に|で|了|正在|把|不|没)\b/i.test(
          s
        ));

    if (explicitPopupCmd || (callModeRef.current === 'tutor_coach' && asksGrammarOrStruggle)) {
      return {
        actionType: 'open_learning_popup',
        topicTitle: utterance.trim(),
      };
    }

    return null;
  };

  const evaluateWorkbenchPractice = (
    writtenText: string,
    sampleTarget: string,
    patternFormula: string,
    meta?: WorkbenchEvaluationMeta
  ): WorkbenchPracticeCheckResult => {
    const clean = writtenText.trim();
    const activeCompId = meta?.competencyId || activeScenario.competencyId;
    const curComp = brainStateRef.current.competencies[activeCompId];
    const prevPct = Math.round(((curComp?.pMasteryDecayed ?? curComp?.pMastery ?? 0.35) || 0.35) * 100);

    const evalParams = {
      text: clean,
      scenario: activeScenario,
      persona: activePersona,
      targetLang: activeScenario.targetLang,
      locale,
      measureMode: false,
      callMode: callModeRef.current,
      learnerDossier: safeBuildDossier(brainStateRef.current, activeScenario, locale),
      history: turnsRef.current.slice(-4).map((tr) => ({ speaker: tr.speaker, text: tr.text })),
    };

    const ev = evaluateTurnLocal(evalParams);
    const trappedTokens: string[] = [];
    let extraFailReason = '';

    // Check explicit dynamic/bank trap token from the active Whiteboard Spotlight card
    if (meta?.trapWrongToken) {
      const cleanTrap = meta.trapWrongToken.replace(/^×\s*/, '').trim();
      if (cleanTrap && clean.toLowerCase().includes(cleanTrap.toLowerCase())) {
        trappedTokens.push(cleanTrap);
        extraFailReason = `Kamu masih memakai bentuk jebakan "${cleanTrap}", ganti dengan bentuk yang disorot hijau di papan tulis.`;
      }
    }

    // Strict syntactic & morphological trap validation (Anti-Loophole Rule #3 & #4)
    if (activeScenario.targetLang === 'en') {
      const mDidPast = clean.match(
        /\b(?:did(?:n't|\s+not)?|does(?:n't|\s+not)?)\s+(?:(?:i|you|he|she|it|we|they|[a-z]+)\s+)?(went|ate|saw|bought|took|made|came|gave|drank|wrote|spoke|got|had|did|watched|played|worked|studied|liked|wanted|needed)\b/i
      );
      if (mDidPast) {
        trappedTokens.push(mDidPast[1]);
        extraFailReason = `Setelah "Did / Didn't / Does", kata kerja tidak boleh berbentuk lampau "${mDidPast[1]}", kembalikan ke bentuk dasar V1.`;
      }
      const mDoubleBe = clean.match(
        /\b(am|is|are|i'm|you're|he's|she's)\s+(agree|disagree|want|need|think|believe|know|understand|prefer)\b/i
      );
      if (mDoubleBe) {
        trappedTokens.push(`${mDoubleBe[1]} ${mDoubleBe[2]}`);
        extraFailReason = `Jangan menaruh "${mDoubleBe[1]}" di depan kata kerja "${mDoubleBe[2]}". Gunakan subjek langsung diikuti kata kerja.`;
      }
      if (/\bfor\s+(?:19\d\d|20\d\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|yesterday|last\s+\w+)\b/i.test(clean)) {
        trappedTokens.push('for + titik awal waktu');
        extraFailReason = 'Untuk titik awal waktu (seperti tahun 2020 atau Monday), gunakan "since", bukan "for".';
      }
      if (/\bin\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(clean)) {
        trappedTokens.push('in + nama hari');
        extraFailReason = 'Untuk nama hari (Monday, Friday, dll.), wajib menggunakan preposisi "on", bukan "in".';
      }
      if (/\bdespite\s+of\b/i.test(clean)) {
        trappedTokens.push('despite of');
        extraFailReason = '"Despite" tidak boleh diikuti "of", gunakan "despite + noun" langsung atau "in spite of".';
      }
      if (/\b(?:should|must|can|could|would|might)\s+to\s+[a-z]+\b/i.test(clean)) {
        trappedTokens.push('modal + to');
        extraFailReason = 'Setelah modal verb (should/must/can), langsung gunakan kata kerja dasar V1 tanpa "to".';
      }
      if (clean.split(/\s+/).filter(Boolean).length < 3) {
        extraFailReason =
          extraFailReason || 'Susun kalimat utuh minimal 3 kata (Subjek + Kata Kerja + Keterangan) agar polanya teruji.';
      }
    } else if (activeScenario.targetLang === 'ja') {
      if (/ますでした/.test(clean)) {
        trappedTokens.push('ますでした');
        extraFailReason = 'Bentuk "ますでした" tidak baku, ubah langsung ます menjadi ました.';
      }
      if (/(行く|飲む|食べる|見る|する|来る|読む|書く|買う)です/.test(clean)) {
        trappedTokens.push('動詞+です');
        extraFailReason = 'Kata kerja kamus tidak boleh langsung ditempel です. Gunakan bentuk 〜ます / 〜ました.';
      }
      if (patternFormula.includes('で') && /図書館に勉強|カフェに飲|家に勉強|学校に勉強/.test(clean)) {
        trappedTokens.push('に (lokasi aksi)');
        extraFailReason = 'Untuk tempat melakukan aksi aktif (belajar/minum), gunakan partikel で, bukan に.';
      }
      if (clean.length < 4 || !/[\u3040-\u30ff\u4e00-\u9fff]/.test(clean)) {
        extraFailReason =
          extraFailReason || 'Tulis kalimat dalam huruf Jepang (Hiragana/Kanji) secara utuh sesuai rumus.';
      }
    } else if (activeScenario.targetLang === 'zh') {
      if (/是(看|吃|喝|学习|学|去|做|工作|买)/.test(clean)) {
        trappedTokens.push('是 + 动词');
        extraFailReason = 'Untuk menyatakan "sedang", gunakan 正在 atau 在 sebelum kata kerja, bukan 是.';
      }
      if (/(看书|吃饭|喝咖啡|学习中文|学习|工作)(昨天|今天|现在)[。！？?!]?$/.test(clean)) {
        trappedTokens.push('Waktu di akhir kalimat');
        extraFailReason = 'Dalam bahasa Mandarin, keterangan waktu (seperti 现在 / 昨天) wajib diletakkan SEBELUM kata kerja.';
      }
      if (clean.length < 3 || !/[\u4e00-\u9fff]/.test(clean)) {
        extraFailReason =
          extraFailReason || 'Tulis kalimat dalam karakter Mandarin (Hanzi) secara utuh sesuai pola.';
      }
    }

    if (!ev.ok && ev.missingTokens?.length) {
      trappedTokens.push(...ev.missingTokens.slice(0, 2));
    }

    const finalOk = Boolean(ev.ok) && trappedTokens.length === 0 && !extraFailReason;
    const outcome = recordSpeakingAttempt(brainStateRef.current, {
      competencyId: activeCompId,
      scenarioId: activeScenario.id,
      targetLang: activeScenario.targetLang,
      userExactTranscript: clean,
      ok: finalOk,
      grammarScore: finalOk ? Math.max(88, ev.grammarScore) : Math.min(55, ev.grammarScore),
      fluencyScore: ev.fluencyScore,
      vocabUsageScore: ev.vocabUsageScore,
      accuracyScore: finalOk ? Math.max(88, ev.accuracyScore) : Math.min(55, ev.accuracyScore),
      misconceptionId: finalOk ? null : meta?.misconceptionId || ev.misconceptionId || 'workbench_syntax_slip',
      correctionPattern: finalOk ? null : ev.syntacticCorrection || sampleTarget,
      hintsUsed: 1,
      confidence: 0.92,
      measureMode: false,
    });

    brainStateRef.current = outcome.nextState;
    setBrainState(outcome.nextState);
    void brainSyncFlush(outcome.nextState).then(({ nextState }) => {
      brainStateRef.current = nextState;
      setBrainState(nextState);
    });

    if (finalOk) {
      workbenchSessionRef.current.completedQuizSentence = clean;
    }

    const nextPct = Math.round(outcome.bktAfter * 100);
    const reasonText = finalOk
      ? locale === 'th'
        ? 'ยอดเยี่ยม! โครงสร้างประโยคตรงตามสูตรเป๊ะ กดส่งเข้าสายเพื่อให้ติวเตอร์ฟังได้เลย'
        : 'Mantap! Susunan kalimat dan tata bahasamu sudah bersih sesuai rumus. Klik "Lanjut Ngobrol" untuk kembali ke obrolan.'
      : extraFailReason ||
        (locale === 'th'
          ? ev.whyFailsTh || ev.pedagogicalFeedbackTh
          : ev.whyFailsId || ev.pedagogicalFeedbackId) ||
        'Periksa kembali urutan kata dan bentuk kata kerja sesuai blok rumus di atas.';
    const suggestedClean =
      (!finalOk && (ev.syntacticCorrection || ev.naturalReformulation)) &&
      (ev.syntacticCorrection || ev.naturalReformulation) !== clean
        ? ev.syntacticCorrection || ev.naturalReformulation
        : sampleTarget;

    return {
      ok: finalOk,
      score: finalOk ? Math.max(88, ev.accuracyScore) : Math.min(55, ev.accuracyScore),
      feedbackText: reasonText,
      correctionText: suggestedClean,
      trappedTokens: Array.from(new Set(trappedTokens)),
      masteryDeltaPct: Math.max(0, nextPct - prevPct),
      nextMasteryPct: nextPct,
    };
  };

  const submitStudentTurn = async (params: {
    text?: string;
    audioBase64?: string;
    audioMimeType?: string;
    speakingDurationSec?: number;
  }) => {
    const trimmed = (params.text || '').trim();
    if (!trimmed && !params.audioBase64) return;

    const myTurnSeq = ++workbenchSessionRef.current.turnSeq;
    workbenchSessionRef.current.dismissedByUser = false;
    workbenchSessionRef.current.completedQuizSentence = '';

    if (trimmed) {
      const clientIntent = detectClientVoiceSystemIntent(trimmed);
      if (clientIntent?.actionType === 'navigate_app' && clientIntent.destination) {
        setInputText('');
        setLiveUserDraft('');
        handleVoiceNavigateApp(clientIntent.destination, 'voice_command_turn');
        return;
      }
      if (clientIntent?.actionType === 'switch_call_mode' && clientIntent.callMode) {
        executeVoiceUiAction(clientIntent, trimmed);
      }
      if (
        clientIntent?.actionType === 'close_learning_popup' ||
        clientIntent?.actionType === 'reroll_quiz' ||
        clientIntent?.actionType === 'switch_exercise_mode'
      ) {
        setInputText('');
        setLiveUserDraft('');
        executeVoiceUiAction(clientIntent, trimmed);
        return;
      }
      if (clientIntent?.actionType === 'open_learning_popup') {
        openLearningWorkbenchWithAction(clientIntent, trimmed);
      }
    }

    setInputText('');
    setLiveUserDraft('');
    setIsAnalyzingTurn(true);
    setStatusBanner(null);

    try {
      const evalParams = {
        text: trimmed || activeScenario.sampleUtterances[0]?.text || 'Hello',
        scenario: activeScenario,
        persona: activePersona,
        targetLang: activeScenario.targetLang,
        locale,
        measureMode: isMeasureMode,
        callMode: callModeRef.current,
        learnerDossier: safeBuildDossier(
          brainStateRef.current,
          activeScenario,
          locale
        ),
        history: turns.slice(-6).map((tItem) => ({
          speaker: tItem.speaker,
          text: tItem.text,
        })),
      };

      // STEP 1, instant local Braincore grading of the learner's EXACT words.
      const localEv = evaluateTurnLocal(evalParams);
      const exactTranscript = localEv.userExactTranscript;
      const ev = localEv;

      const effectiveHints = isMeasureMode ? 0 : showHint ? 1 : 0;
      const attemptOutcome = recordSpeakingAttempt(brainState, {
        competencyId: activeScenario.competencyId,
        scenarioId: activeScenario.id,
        targetLang: activeScenario.targetLang,
        userExactTranscript: exactTranscript,
        ok: Boolean(ev.ok),
        grammarScore: ev.grammarScore,
        fluencyScore: ev.fluencyScore,
        vocabUsageScore: ev.vocabUsageScore,
        accuracyScore: ev.accuracyScore,
        speakingDurationSec: params.speakingDurationSec,
        misconceptionId: ev.misconceptionId || null,
        correctionPattern: ev.syntacticCorrection || ev.naturalReformulation || null,
        hintsUsed: effectiveHints,
        confidence: 0.85,
        measureMode: isMeasureMode,
      });

      setBrainState(attemptOutcome.nextState);
      if (isMeasureMode) {
        playFiezelSfx(ev.ok ? 'answer_correct' : 'answer_wrong');
      }

      const diagnosis: TurnDiagnosis = {
        ok: Boolean(ev.ok),
        accuracyScore: ev.accuracyScore,
        grammarScore: ev.grammarScore,
        fluencyScore: ev.fluencyScore,
        vocabUsageScore: ev.vocabUsageScore,
        userExactTranscript: exactTranscript,
        misconceptionId: ev.misconceptionId || null,
        whyFailsId: ev.whyFailsId || null,
        whyFailsTh: ev.whyFailsTh || null,
        missingTokens: ev.missingTokens || [],
        syntacticCorrection: ev.syntacticCorrection || null,
        naturalReformulation: ev.naturalReformulation || exactTranscript,
        pedagogicalFeedbackId: ev.pedagogicalFeedbackId,
        pedagogicalFeedbackTh: ev.pedagogicalFeedbackTh,
        bktBefore: attemptOutcome.bktBefore,
        bktAfter: attemptOutcome.bktAfter,
        thetaAfter: attemptOutcome.thetaAfter,
        masteryStateAfter: attemptOutcome.masteryStateAfter,
      };

      const userTurn: CallTurn = {
        id: `turn_u_${Date.now()}`,
        speaker: 'user',
        text: exactTranscript,
        timestamp: Date.now(),
        speakingDurationSec: params.speakingDurationSec,
        diagnosis,
      };

      // The learner sees their own words + feedback immediately.
      const historyAfterUser: Array<{ speaker: 'ai' | 'user'; text: string }> = [
        ...turns.slice(-7).map((tr) => ({ speaker: tr.speaker, text: tr.text })),
        { speaker: 'user', text: exactTranscript },
      ];
      setTurns((prev) => [...prev, userTurn]);
      setInputText('');
      setLiveUserDraft('');
      setShowHint(false);
      void brainSyncFlush(attemptOutcome.nextState).then(({ nextState }) =>
        setBrainState(nextState)
      );

      // STEP 2, the REAL AI partner reply + REAL-TIME AI Copilot answers (never static templates).
      if (copilotAbortRef.current) {
        try {
          copilotAbortRef.current.abort();
        } catch {
          // Ignore
        }
      }
      setCopilotCards([]);
      setCopilotSource('loading');
      setIsGeneratingCopilot(true);
      isAiThinkingRef.current = true;
      setIsAiThinking(true);

      const aiTurnId = `turn_ai_${Date.now() + 1}`;
      let textAlreadyShown = false;

      const replyEv = await resolveAiReply(evalParams, localEv, {
        onTextReady: (aiText, transId, transTh, suggestions, serverUiAction) => {
          textAlreadyShown = true;
          isAiThinkingRef.current = false;
          setIsAiThinking(false);
          if (
            serverUiAction &&
            myTurnSeq === workbenchSessionRef.current.turnSeq &&
            !workbenchSessionRef.current.dismissedByUser
          ) {
            executeVoiceUiAction(serverUiAction, exactTranscript);
          }
          const isPopupAction = serverUiAction?.actionType === 'open_learning_popup';
          if (Array.isArray(suggestions) && suggestions.length > 0) {
            const aiOnly = suggestions.filter((c) => c.isRealtimeAi && !c.isOfflineFallback);
            if (aiOnly.length > 0) {
              lastCopilotAiKeyRef.current = `${activeScenario.id}::${activeScenario.targetLang}::${aiText.trim()}::${exactTranscript}`;
              setCopilotCards(aiOnly);
              setCopilotSource('ai-realtime');
              setIsGeneratingCopilot(false);
            } else if (!isPopupAction) {
              void triggerRealtimeCopilotForAi(aiText, exactTranscript, [
                ...historyAfterUser,
                { speaker: 'ai', text: aiText },
              ]);
            } else {
              setIsGeneratingCopilot(false);
            }
          } else if (!isPopupAction) {
            void triggerRealtimeCopilotForAi(aiText, exactTranscript, [
              ...historyAfterUser,
              { speaker: 'ai', text: aiText },
            ]);
          } else {
            setIsGeneratingCopilot(false);
          }
          const immediateAiTurn: CallTurn = {
            id: aiTurnId,
            speaker: 'ai',
            text: aiText,
            translationId: transId,
            translationTh: transTh,
            timestamp: Date.now() + 1,
            replySource: 'ai',
          };
          setTurns((prev) => {
            if (prev.some((t) => t.id === aiTurnId)) return prev;
            return [...prev, immediateAiTurn];
          });
        },
      });

      isAiThinkingRef.current = false;
      setIsAiThinking(false);

      if (!textAlreadyShown) {
        if (
          replyEv.uiAction &&
          myTurnSeq === workbenchSessionRef.current.turnSeq &&
          !workbenchSessionRef.current.dismissedByUser
        ) {
          executeVoiceUiAction(replyEv.uiAction, exactTranscript);
        }

        const aiAudioBase64 = replyEv.audioBase64 || null;
        const aiTurn: CallTurn = {
          id: aiTurnId,
          speaker: 'ai',
          text: replyEv.aiReply,
          translationId: replyEv.aiReplyTranslationId,
          translationTh: replyEv.aiReplyTranslationTh,
          timestamp: Date.now() + 1,
          audioBase64: aiAudioBase64 || undefined,
          audioMimeType: replyEv.audioMimeType || 'audio/mpeg',
          replySource: replyEv.replySource,
        };
        setTurns((prev) => [...prev, aiTurn]);
      } else if (replyEv.audioBase64) {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === aiTurnId
              ? {
                  ...t,
                  audioBase64: replyEv.audioBase64 || undefined,
                  audioMimeType: replyEv.audioMimeType || 'audio/mpeg',
                  replySource: replyEv.replySource,
                }
              : t
          )
        );
      }

      const isOpeningPopup = replyEv.uiAction?.actionType === 'open_learning_popup';
      if (Array.isArray(replyEv.nextSuggestedReplies) && replyEv.nextSuggestedReplies.length > 0) {
        const aiOnly = replyEv.nextSuggestedReplies.filter((c) => c.isRealtimeAi && !c.isOfflineFallback);
        if (aiOnly.length > 0) {
          lastCopilotAiKeyRef.current = `${activeScenario.id}::${activeScenario.targetLang}::${replyEv.aiReply.trim()}::${exactTranscript}`;
          setCopilotCards(aiOnly);
          setCopilotSource('ai-realtime');
          setIsGeneratingCopilot(false);
        } else if (!textAlreadyShown && replyEv.aiReply && !isOpeningPopup) {
          void triggerRealtimeCopilotForAi(replyEv.aiReply, exactTranscript, [
            ...historyAfterUser,
            { speaker: 'ai', text: replyEv.aiReply },
          ]);
        } else {
          setIsGeneratingCopilot(false);
        }
      } else if (!textAlreadyShown && replyEv.aiReply && !isOpeningPopup) {
        void triggerRealtimeCopilotForAi(replyEv.aiReply, exactTranscript, [
          ...historyAfterUser,
          { speaker: 'ai', text: replyEv.aiReply },
        ]);
      } else if (isOpeningPopup) {
        setIsGeneratingCopilot(false);
      }

      if (
        !isOpeningPopup &&
        myTurnSeq === workbenchSessionRef.current.turnSeq &&
        !workbenchSessionRef.current.dismissedByUser
      ) {
        const aiAudioBase64 = replyEv.audioBase64 || null;
        void speakAiText(replyEv.aiReply, aiAudioBase64);
      }
    } catch (err) {
      setIsGeneratingCopilot(false);
      setStatusBanner((err as Error).message || 'Kesalahan jaringan.');
    } finally {
      isAiThinkingRef.current = false;
      setIsAiThinking(false);
      setIsAnalyzingTurn(false);
    }
  };

  const submitStudentTurnRef = useRef(submitStudentTurn);
  submitStudentTurnRef.current = submitStudentTurn;

  // Hands-free Continuous Voice Recognition for "Telepon Live"
  useEffect(() => {
    // 1. In WebSocket Full-Duplex mode ("Telepon Live"), audio input is 100% handled
    // by continuous hardware microphone PCM streaming via Silero/Handy VAD directly to Gemini Live WS.
    // We MUST NEVER initialize or run browser SpeechRecognition in ws-duplex mode!
    // Running SpeechRecognition causes OS audio focus renegotiation, mic cutoffs, and beeping on Android/iOS!
    if (isLiveConnected && liveTransportMode === 'ws-duplex') {
      if (liveSpeechRecRef.current) {
        try {
          liveSpeechRecRef.current.onresult = null;
          liveSpeechRecRef.current.onend = null;
          liveSpeechRecRef.current.onerror = null;
          liveSpeechRecRef.current.stop();
        } catch {}
        liveSpeechRecRef.current = null;
      }
      if (liveSilenceTimerRef.current) {
        window.clearTimeout(liveSilenceTimerRef.current);
        liveSilenceTimerRef.current = null;
      }
      setIsWaitingAfterSpeech(false);
      setIsListeningLiveSpeech(true);
      return () => {
        setIsWaitingAfterSpeech(false);
      };
    }

    const shouldListenHandsFree =
      isLiveConnected &&
      !isPlayingAiAudio &&
      !isAnalyzingTurn &&
      !isMicMuted &&
      !isRecordingPtt;

    if (!shouldListenHandsFree) {
      if (liveSilenceTimerRef.current) {
        window.clearTimeout(liveSilenceTimerRef.current);
        liveSilenceTimerRef.current = null;
      }
      if (liveSpeechRecRef.current) {
        try {
          liveSpeechRecRef.current.onresult = null;
          liveSpeechRecRef.current.onend = null;
          liveSpeechRecRef.current.onerror = null;
          liveSpeechRecRef.current.stop();
        } catch {
          // Ignore
        }
        liveSpeechRecRef.current = null;
      }
      setIsListeningLiveSpeech(false);
      setIsUserSpeakingLive(false);
      return;
    }

    const isMobileDevice =
      typeof navigator !== 'undefined' &&
      (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '') || (navigator.maxTouchPoints || 0) > 1);
    const hasLiveHardwareMic = Boolean(
      micStreamRef.current &&
        micStreamRef.current.getAudioTracks().some((tr) => tr.readyState === 'live' && tr.enabled)
    );

    // On mobile PWA devices (iPhone/Android), when Gemini Live ws-duplex is active with a live
    // hardware microphone stream, native 16kHz PCM audio is already streamed directly to Gemini Live
    // via Silero/Handy VAD (~352ms end-of-speech turn completion). Running webkitSpeechRecognition
    // in parallel on mobile causes OS audio-session contention and 3.2s-4.5s "jeda berpikir" delay!
    if (isMobileDevice && liveTransportMode === 'ws-duplex' && hasLiveHardwareMic) {
      setIsWaitingAfterSpeech(false);
      setIsListeningLiveSpeech(true);
      return () => {
        setIsWaitingAfterSpeech(false);
      };
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      return;
    }

    let isDisposed = false;
    let accumulatedSpeech = '';
    let speechPrefix = '';

    const computeSpeechSilenceWaitMs = (text: string, isFinalResult = false) => {
      const incomplete = isGrammaticallyIncomplete(text, activeScenario.targetLang);
      if (isMobileDevice) {
        if (isFinalResult && !incomplete) return 700;
        return incomplete ? 1400 : 950;
      }
      if (isFinalResult && !incomplete) return 1100;
      return incomplete ? 2100 : 1350;
    };

    const startListeningCycle = () => {
      if (isDisposed) return;
      try {
        const rec = new SpeechRec();
        rec.lang =
          activeScenario.targetLang === 'ja'
            ? 'ja-JP'
            : activeScenario.targetLang === 'zh'
            ? 'zh-CN'
            : 'en-US';
        rec.interimResults = true;
        // Android Chrome duplicates cumulative tokens when `continuous = true`; `onend` restarts
        // the cycle seamlessly on mobile while desktop keeps continuous open-mic recognition.
        const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
        rec.continuous = !isAndroid;

        rec.onstart = () => {
          if (!isDisposed) {
            setIsListeningLiveSpeech(true);
          }
        };

        rec.onresult = (event: any) => {
          if (isDisposed) return;
          let transcript = '';
          let lastIsFinal = false;
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
            if (i === event.results.length - 1 && event.results[i].isFinal) {
              lastIsFinal = true;
            }
          }
          const clean = (speechPrefix ? speechPrefix + ' ' + transcript : transcript)
            .replace(/\s+/g, ' ')
            .trim();
          if (!clean) return;

          // User spoke into microphone: update speech timestamps across all VAD monitors
          lastHandySpeechAtRef.current = Date.now();
          if (sileroVadGateRef.current?.isActive()) {
            sileroVadGateRef.current.markHumanSpeechAt(Date.now());
          }

          accumulatedSpeech = clean;
          liveDictatedTextRef.current = clean;
          setLiveUserDraft(clean);
          setInputText(clean);
          setIsUserSpeakingLive(true);

          if (liveSilenceTimerRef.current) {
            window.clearTimeout(liveSilenceTimerRef.current);
          }
          const silenceWaitMs = computeSpeechSilenceWaitMs(clean, lastIsFinal);
          setIsWaitingAfterSpeech(true);
          liveSilenceTimerRef.current = window.setTimeout(() => {
            if (isDisposed) return;
            liveSilenceTimerRef.current = null;
            setIsWaitingAfterSpeech(false);
            setIsUserSpeakingLive(false);
            const toSend = accumulatedSpeech.trim();
            if (toSend) {
              accumulatedSpeech = '';
              speechPrefix = '';
              liveDictatedTextRef.current = '';
              try {
                rec.onend = null;
                rec.stop();
              } catch {
                // Ignore
              }
              setIsListeningLiveSpeech(false);
              if (
                wsRef.current &&
                wsRef.current.readyState === WebSocket.OPEN &&
                liveTransportMode === 'ws-duplex'
              ) {
                submitLiveUserUtterance(toSend);
              } else {
                void submitStudentTurnRef.current({
                  text: toSend,
                  speakingDurationSec: 3,
                });
              }
            }
          }, silenceWaitMs);
        };

        rec.onerror = (evErr: any) => {
          const code = String(evErr?.error || '');
          if (code === 'no-speech' || code === 'aborted') {
            return;
          }
          if (code === 'audio-capture') {
            // Audio device momentarily busy or switching - do NOT mute the user
            console.warn('[VoiceStudio] Transient audio-capture on mic stream, retaining active state');
            return;
          }
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            isDisposed = true;
            isMicMutedRef.current = true;
            setIsMicMuted(true);
            setIsListeningLiveSpeech(false);
            setIsUserSpeakingLive(false);
            setStatusBanner(
              locale === 'th'
                ? 'ไมโครโฟนถูกบล็อก อนุญาตไมโครโฟนในแถบที่อยู่ หรือพิมพ์ประโยคด้านล่าง'
                : 'Mikrofon tidak aktif atau diblokir peramban. Ketuk tombol Bicara untuk mengizinkan mic, atau ketik kalimatmu.'
            );
          } else if (code === 'network') {
            setStatusBanner(
              locale === 'th'
                ? 'การรู้จำเสียงต้องใช้อินเทอร์เน็ต ลองอีกครั้งหรือพิมพ์ประโยค'
                : 'Pengenalan suara butuh koneksi internet. Coba bicara lagi atau ketik kalimatmu.'
            );
          }
        };

        rec.onend = () => {
          if (isDisposed) return;
          if (accumulatedSpeech.trim()) {
            speechPrefix = accumulatedSpeech.trim();
            if (!liveSilenceTimerRef.current) {
              const silenceWaitMs = computeSpeechSilenceWaitMs(speechPrefix, true);
              setIsWaitingAfterSpeech(true);
              liveSilenceTimerRef.current = window.setTimeout(() => {
                if (isDisposed) return;
                liveSilenceTimerRef.current = null;
                setIsWaitingAfterSpeech(false);
                setIsUserSpeakingLive(false);
                const toSend = accumulatedSpeech.trim() || speechPrefix.trim();
                if (toSend) {
                  accumulatedSpeech = '';
                  speechPrefix = '';
                  liveDictatedTextRef.current = '';
                  setIsListeningLiveSpeech(false);
                  if (
                    wsRef.current &&
                    wsRef.current.readyState === WebSocket.OPEN &&
                    liveTransportMode === 'ws-duplex'
                  ) {
                    submitLiveUserUtterance(toSend);
                  } else {
                    void submitStudentTurnRef.current({
                      text: toSend,
                      speakingDurationSec: 3,
                    });
                  }
                }
              }, silenceWaitMs);
            }
            window.setTimeout(() => {
              if (!isDisposed) {
                startListeningCycle();
              }
            }, 60);
            return;
          }

          setIsWaitingAfterSpeech(false);
          // Restart listening loop while call remains active
          window.setTimeout(() => {
            if (!isDisposed) {
              startListeningCycle();
            }
          }, 200);
        };

        liveSpeechRecRef.current = rec;
        rec.start();
        setIsListeningLiveSpeech(true);
      } catch {
        setIsListeningLiveSpeech(false);
        setIsUserSpeakingLive(false);
      }
    };

    startListeningCycle();

    return () => {
      isDisposed = true;
      setIsWaitingAfterSpeech(false);
      if (liveSilenceTimerRef.current) {
        window.clearTimeout(liveSilenceTimerRef.current);
        liveSilenceTimerRef.current = null;
      }
      if (liveSpeechRecRef.current) {
        try {
          liveSpeechRecRef.current.onresult = null;
          liveSpeechRecRef.current.onend = null;
          liveSpeechRecRef.current.onerror = null;
          liveSpeechRecRef.current.stop();
        } catch {
          // Ignore
        }
        liveSpeechRecRef.current = null;
      }
      setIsListeningLiveSpeech(false);
      setIsUserSpeakingLive(false);
    };
  }, [
    isLiveConnected,
    liveTransportMode,
    isPlayingAiAudio,
    isAnalyzingTurn,
    isMicMuted,
    isRecordingPtt,
    activeScenario.targetLang,
    activeScenario.id,
    locale,
  ]);

  const startPttRecording = async () => {
    try {
      // Immediate barge-in: stop the neural voice playback, and unlock audio for the reply.
      if (currentAudioElRef.current) {
        try {
          currentAudioElRef.current.pause();
          currentAudioElRef.current = null;
        } catch {
          // Ignore
        }
      }
      clearSpeechWatchdog();
      stopNeuralBufferSource();
      primeAudioPlayback();
      setIsPlayingAiAudio(false);
      setStatusBanner(null);
      liveDictatedTextRef.current = '';
      setLiveUserDraft('');
      pttStartedAtRef.current = Date.now();

      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.lang =
          activeScenario.targetLang === 'ja'
            ? 'ja-JP'
            : activeScenario.targetLang === 'zh'
            ? 'zh-CN'
            : 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (event: any) => {
          let transcript = '';
          let lastFinal = false;
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
            if (i === event.results.length - 1 && event.results[i].isFinal) {
              lastFinal = true;
            }
          }
          const clean = transcript.trim();
          if (clean) {
            liveDictatedTextRef.current = clean;
            setLiveUserDraft(clean);
            setInputText(clean);

            // Auto-submit right after brief breathing pause, ZERO manual "Kirim" click required!
            if (pttSilenceTimerRef.current) {
              window.clearTimeout(pttSilenceTimerRef.current);
            }
            const isMobilePtt =
              typeof navigator !== 'undefined' &&
              (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '') || (navigator.maxTouchPoints || 0) > 1);
            const incompletePtt = isGrammaticallyIncomplete(clean, activeScenario.targetLang);
            const pttSilenceWaitMs = isMobilePtt
              ? lastFinal && !incompletePtt
                ? 700
                : incompletePtt
                  ? 1250
                  : 900
              : lastFinal && !incompletePtt
                ? 900
                : incompletePtt
                  ? 1600
                  : 1150;
            pttSilenceTimerRef.current = window.setTimeout(() => {
              stopPttRecording();
            }, pttSilenceWaitMs);
          }
        };

        recognition.onend = () => {
          if (speechRecRef.current === recognition) {
            stopPttRecording();
          }
        };

        recognition.onerror = (evErr: any) => {
          const code = String(evErr?.error || '');
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            setIsRecordingPtt(false);
            setStatusBanner(
              'Izin mikrofon ditolak oleh peramban. Izinkan akses mikrofon di bilah alamat atau ketik kalimatmu di bawah.'
            );
          }
        };

        speechRecRef.current = recognition;
        recognition.start();
        setIsRecordingPtt(true);
        return;
      }

      // Fallback to MediaRecorder ONLY when Web Speech API is unavailable
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const elapsedSec = pttStartedAtRef.current
          ? Math.max(2, Math.round((Date.now() - pttStartedAtRef.current) / 1000))
          : 4;
        pttStartedAtRef.current = null;
        const dictated = liveDictatedTextRef.current.trim();
        if (dictated) {
          liveDictatedTextRef.current = '';
          void submitStudentTurnRef.current({
            text: dictated,
            speakingDurationSec: elapsedSec,
          });
        } else {
          setStatusBanner(
            'Peramban ini belum mendukung pengenalan suara otomatis. Ketik kalimatmu di kolom bawah atau pilih dari Bantuan Cara Jawab.'
          );
        }
      };

      recorder.start();
      setIsRecordingPtt(true);
    } catch {
      setIsRecordingPtt(false);
      setStatusBanner(
        'Izin mikrofon belum aktif di peramban ini. Ketik kalimatmu atau pilih langsung dari kartu Bantuan Cara Jawab di atas.'
      );
    }
  };

  const stopPttRecording = () => {
    if (pttSilenceTimerRef.current) {
      window.clearTimeout(pttSilenceTimerRef.current);
      pttSilenceTimerRef.current = null;
    }
    const elapsedSec = pttStartedAtRef.current
      ? Math.max(2, Math.round((Date.now() - pttStartedAtRef.current) / 1000))
      : 4;
    pttStartedAtRef.current = null;

    if (speechRecRef.current) {
      const rec = speechRecRef.current;
      speechRecRef.current = null;
      try {
        rec.stop();
      } catch {
        // Ignore
      }
      setIsRecordingPtt(false);
      window.setTimeout(() => {
        const dictated = liveDictatedTextRef.current.trim();
        if (dictated) {
          liveDictatedTextRef.current = '';
          setLiveUserDraft('');
          void submitStudentTurnRef.current({
            text: dictated,
            speakingDurationSec: elapsedSec,
          });
        } else {
          setStatusBanner(
            'Belum ada suara yang terdengar. Pastikan mikrofon aktif dan ucapkan kalimat dengan jelas, atau ketik di kolom bawah.'
          );
        }
      }, 80);
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingPtt(false);
  };

  const activateTurnByTurnLiveFallback = () => {
    if (wsRef.current) {
      try {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }
    setLiveTransportMode('turn-by-turn-fallback');
    isLiveConnectingRef.current = false;
    setIsLiveConnecting(false);
    setIsLiveConnected(true);
    playFiezelSfx('lesson_start');
    const lastAi = [...turns].reverse().find((tItem) => tItem.speaker === 'ai');
    void speakAiText(lastAi?.text || activeScenario.openingLine);
  };

  const handleMicPcmData = (float32: Float32Array) => {
    if (isMicMutedRef.current) return;
    // Once Silero Neural VAD v5 WASM is active, it exclusively owns 16kHz human-speech streaming & barge-in.
    if (sileroVadGateRef.current?.isActive()) return;

    const liveCtx = liveAudioCtxRef.current;
    const sampleRate = liveCtx?.sampleRate || 48000;

    // ACOUSTIC ECHO SUPPRESSION + INSTANT BARGE-IN:
    // Saat AI sedang berbicara atau gema speaker masih memantul (<480ms setelah selesai bicara),
    // cegah echo speaker masuk ke Gemini Live agar AI tidak menjawab suaranya sendiri!
    if (
      isPlayingAiAudioRef.current ||
      isAiServerTurnOpenRef.current ||
      Date.now() - lastAiPlayoutEndedAtRef.current < 480
    ) {
      if (isWorkbenchOpenRef.current || Date.now() - lastAiPlayoutEndedAtRef.current < 480) {
        return;
      }
      const bargeVad = handyVadRef.current.processSamples(float32, sampleRate, true);
      const rms = bargeVad.lastMetrics?.rms ?? 0;
      if (bargeVad.speechStarted && rms >= 0.16) {
        interruptAiAndStartListening();
        if (!isUserSpeakingLiveRef.current) {
          isUserSpeakingLiveRef.current = true;
          setIsUserSpeakingLive(true);
        }
        if (
          wsRef.current &&
          wsRef.current.readyState === WebSocket.OPEN &&
          isLiveConnectedRef.current &&
          bargeVad.speechPcm16k &&
          bargeVad.speechPcm16k.length > 0
        ) {
          const pcmBase64 = float32At16kToPcm16Base64(bargeVad.speechPcm16k);
          wsRef.current.send(
            JSON.stringify({
              realtimeInput: {
                audio: {
                  mimeType: 'audio/pcm;rate=16000',
                  data: pcmBase64,
                },
              },
            })
          );
        }
      } else if (!bargeVad.inSpeech) {
        // Never retain speaker bleed in handyVad pre-roll buffer while AI is playing
        handyVadRef.current.reset();
      }
      return;
    }

    const vadRes = handyVadRef.current.processSamples(float32, sampleRate, false);

    if (vadRes.inSpeech) {
      lastHandySpeechAtRef.current = Date.now();
      if (!isUserSpeakingLiveRef.current) {
        isUserSpeakingLiveRef.current = true;
        setIsUserSpeakingLive(true);
      }
      if (userSpeakingTimerRef.current) window.clearTimeout(userSpeakingTimerRef.current);
      userSpeakingTimerRef.current = window.setTimeout(() => {
        isUserSpeakingLiveRef.current = false;
        setIsUserSpeakingLive(false);
      }, 450);
    }

    // Stream continuous 16kHz PCM directly to Gemini 3.8 Live's native server-side Automatic VAD
    // so speech onset, natural pauses, and end-of-turn silence are detected without clipping!
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isLiveConnectedRef.current) {
      const pcmBase64 = resampleFloat32To16kPcmBase64(float32, sampleRate);
      if (pcmBase64) {
        wsRef.current.send(
          JSON.stringify({
            realtimeInput: {
              audio: {
                mimeType: 'audio/pcm;rate=16000',
                data: pcmBase64,
              },
            },
          })
        );
      }
    }
  };

  const connectMicStreamToLiveProcessing = async (stream: MediaStream, liveCtx: AudioContext) => {
    micStreamRef.current = stream;
    if (!stream || !stream.getAudioTracks || stream.getAudioTracks().length === 0) return;

    stream.getAudioTracks().forEach((track) => {
      track.enabled = !isMicMutedRef.current;
    });

    if (liveCtx.state === 'suspended') {
      await liveCtx.resume().catch(() => {});
    }

    if (micSourceNodeRef.current) {
      try {
        micSourceNodeRef.current.disconnect();
      } catch {}
      micSourceNodeRef.current = null;
    }

    if (micSourceNodeRef.current) {
      try {
        micSourceNodeRef.current.disconnect();
      } catch {
        // Ignore
      }
      micSourceNodeRef.current = null;
    }
    if (audioWorkletNodeRef.current) {
      try {
        audioWorkletNodeRef.current.port.onmessage = null;
        audioWorkletNodeRef.current.disconnect();
      } catch {}
      audioWorkletNodeRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.onaudioprocess = null;
        scriptProcessorRef.current.disconnect();
      } catch {}
      scriptProcessorRef.current = null;
    }

    try {
      const source = liveCtx.createMediaStreamSource(stream);
      micSourceNodeRef.current = source;
      handyVadRef.current.reset();
      lastHandySpeechAtRef.current = 0;
      try {
        (window as any).__fzVoiceStudioHandyVad = handyVadRef.current;
      } catch {}

      // Start Self-Hosted Silero Neural VAD v5 if available
      sileroVadGateRef.current?.destroy();
      const sileroGate = new SileroNeuralVadGate();
      sileroVadGateRef.current = sileroGate;
      void sileroGate.start(stream, liveCtx, {
        isMicMuted: () => isMicMutedRef.current,
        isAiPlaying: () => isPlayingAiAudioRef.current,
        isWorkbenchOpen: () => isWorkbenchOpenRef.current,
        onHumanSpeechState: (speaking) => {
          if (isUserSpeakingLiveRef.current !== speaking) {
            isUserSpeakingLiveRef.current = speaking;
            setIsUserSpeakingLive(speaking);
          }
        },
        onHumanBargeIn: () => {
          interruptAiAndStartListening();
        },
        onSpeechPcm16kBase64: (pcmBase64) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isLiveConnectedRef.current) {
            wsRef.current.send(
              JSON.stringify({
                realtimeInput: {
                  audio: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: pcmBase64,
                  },
                },
              })
            );
          }
        },
        onSpeechEnded: () => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isLiveConnectedRef.current) {
            wsRef.current.send(
              JSON.stringify({
                realtimeInput: {
                  audioStreamEnd: true,
                },
              })
            );
          }
        },
      });

      // iOS WebKit check: iOS Safari / Chrome on iOS / PWA standalone iOS
      const isIOSWebKit =
        typeof navigator !== 'undefined' &&
        (/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
          ((navigator as any).userAgentData?.platform === 'iOS') ||
          (navigator.vendor &&
            navigator.vendor.includes('Apple') &&
            !navigator.userAgent.includes('CriOS') &&
            !navigator.userAgent.includes('Chrome')));

      let workletInitialized = false;

      // On Android / Chromium / Desktop: Try AudioWorklet first
      if (
        !isIOSWebKit &&
        liveCtx.audioWorklet &&
        typeof liveCtx.audioWorklet.addModule === 'function' &&
        typeof window !== 'undefined' &&
        window.isSecureContext
      ) {
        try {
          const workletCode = `
            class LiveMicCaptureProcessor extends AudioWorkletProcessor {
              constructor() {
                super();
                this.bufferSize = 2048;
                this.buffer = new Float32Array(this.bufferSize);
                this.bytesWritten = 0;
              }
              process(inputs) {
                const input = inputs[0];
                if (!input || !input[0]) return true;
                const channelData = input[0];
                let offset = 0;
                while (offset < channelData.length) {
                  const needed = this.bufferSize - this.bytesWritten;
                  const toCopy = Math.min(needed, channelData.length - offset);
                  this.buffer.set(channelData.subarray(offset, offset + toCopy), this.bytesWritten);
                  this.bytesWritten += toCopy;
                  offset += toCopy;
                  if (this.bytesWritten >= this.bufferSize) {
                    this.port.postMessage(this.buffer.slice(0));
                    this.bytesWritten = 0;
                  }
                }
                return true;
              }
            }
            registerProcessor('live-mic-capture-processor', LiveMicCaptureProcessor);
          `;
          const blob = new Blob([workletCode], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          await liveCtx.audioWorklet.addModule(url);
          URL.revokeObjectURL(url);

          const workletNode = new AudioWorkletNode(liveCtx, 'live-mic-capture-processor');
          audioWorkletNodeRef.current = workletNode;

          workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
            handleMicPcmData(e.data);
          };

          source.connect(workletNode);
          const dummyGain = liveCtx.createGain();
          dummyGain.gain.value = 0;
          workletNode.connect(dummyGain);
          dummyGain.connect(liveCtx.destination);
          workletInitialized = true;
        } catch (workletErr) {
          console.warn('AudioWorklet init fallback to ScriptProcessor:', workletErr);
        }
      }

      // Fallback for Chromium or Direct for iOS WebKit: ScriptProcessorNode
      if (!workletInitialized) {
        const processor = liveCtx.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;
        (window as any).__fzLiveProcessor = processor;

        processor.onaudioprocess = (e) => {
          if (liveCtx.state === 'suspended') {
            void liveCtx.resume().catch(() => {});
          }
          handleMicPcmData(e.inputBuffer.getChannelData(0));
        };

        const muteGain = liveCtx.createGain();
        // Positive tiny non-zero gain prevents Chrome & WebKit power-saving from throttling onaudioprocess
        muteGain.gain.value = 0.00001;
        source.connect(processor);
        processor.connect(muteGain);
        muteGain.connect(liveCtx.destination);
      }
    } catch (err: any) {
      console.warn('Microphone node wiring error (SpeechRecognition handles voice):', err);
    }
  };

  const startLiveCall = async (preAcquiredStream?: MediaStream) => {
    if (
      isLiveConnected ||
      isLiveConnecting ||
      isLiveConnectedRef.current ||
      isLiveConnectingRef.current
    ) {
      return;
    }
    isLiveConnectingRef.current = true;
    setIsLiveConnecting(true);
    if (!callBillingRef.current.active) {
      const autoFree = getDailyFreeCallAvailable();
      callBillingRef.current = {
        active: true,
        isDailyFree: autoFree,
        dailyFreeMarked: false,
        aiVoiceTurnsDelivered: 0,
        gemsSpentThisCall: 0,
        turnMetered: false,
        outOfGemsAfterTurn: false,
      };
      setLiveBillingUi({ isDailyFree: autoFree, turns: 0, gemsSpent: 0 });
    }
    if (liveOpeningAudioWatchdogRef.current) {
      window.clearTimeout(liveOpeningAudioWatchdogRef.current);
      liveOpeningAudioWatchdogRef.current = null;
    }
    if (livePlaybackSafetyTimerRef.current) {
      window.clearTimeout(livePlaybackSafetyTimerRef.current);
      livePlaybackSafetyTimerRef.current = null;
    }
    // Hentikan pemutaran TTS klasik sebelumnya agar suara pembuka & mic live tidak bertabrakan
    interruptAiAndStartListening();
    setCallViewMode('stage');
    try {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    } catch {
      // Ignore
    }
    primeAudioPlayback();
    setIsMicMuted(false);
    isMicMutedRef.current = false;

    // 1. Prime Unified Live AudioContext (native hardware rate for iOS & Desktop)
    const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!liveAudioCtxRef.current || liveAudioCtxRef.current.state === 'closed') {
      liveAudioCtxRef.current = new CtxClass();
    }
    const liveCtx = liveAudioCtxRef.current;
    inputAudioCtxRef.current = liveCtx;
    outputAudioCtxRef.current = liveCtx;
    nextStartTimeRef.current = liveCtx.currentTime;
    if (liveCtx.state === 'suspended') {
      void liveCtx.resume().catch(() => {});
    }

    // 2. Dapatkan mikrofon secara non-blocking jika peramban mengizinkan langsung
    let stream: MediaStream | null = preAcquiredStream || micStreamRef.current;
    if (!stream && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const getStreamPromise = navigator.mediaDevices
          .getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          })
          .catch(() => {
            return navigator.mediaDevices.getUserMedia({ audio: true });
          });
        // Beri waktu 4000ms untuk dialog izin mic di Android/iOS
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
        const res = await Promise.race([getStreamPromise, timeoutPromise]);
        if (res && res.getAudioTracks && res.getAudioTracks().length > 0) {
          stream = res;
          await connectMicStreamToLiveProcessing(stream, liveCtx);
        } else {
          // Jika dialog izin sistem memakan waktu lebih lama, sambungkan seketika saat user klik Allow
          void getStreamPromise
            .then(async (lateStream) => {
              if (!lateStream || userHungUpRef.current) {
                try {
                  lateStream?.getTracks().forEach((tr) => tr.stop());
                } catch {}
                return;
              }
              await connectMicStreamToLiveProcessing(lateStream, liveCtx);
            })
            .catch(() => {});
        }
      } catch (micErr) {
        console.warn('[VoiceStudio] Non-blocking mic stream notice (SpeechRecognition will handle speech):', micErr);
        micStreamRef.current = null;
      }
    } else if (stream) {
      await connectMicStreamToLiveProcessing(stream, liveCtx);
    }

    setStatusBanner(null);
    setIsLiveConnecting(true);
    setLiveUserDraft('');
    setLiveAiDraft('');
    liveUserDraftRef.current = '';
    liveAiDraftRef.current = '';
    userHungUpRef.current = false;
    liveReconnectAttemptsRef.current = 0;
    setCallDurationSec(0);

    const connectDuplex = async (isReconnect = false) => {
      const mySeq = ++connectSeqRef.current;
      if (wsRef.current) {
        try {
          wsRef.current.onopen = null;
          wsRef.current.onmessage = null;
          wsRef.current.onerror = null;
          wsRef.current.onclose = null;
          wsRef.current.close();
        } catch {
          // Ignore
        }
        wsRef.current = null;
      }

      let targetWsUrl = '';
      let isGoogleLive = true;

      // 1. Dapatkan ephemeral session token dari Worker 16-key pool
      const session = await requestGeminiLiveSessionToken();
      if (mySeq !== connectSeqRef.current || userHungUpRef.current) return;
      if (session.ok && session.token) {
        currentLiveSessionRef.current = session;
        const baseEndpoint =
          session.endpoint ||
          'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained';
        targetWsUrl = `${baseEndpoint}?access_token=${encodeURIComponent(session.token)}`;
        isGoogleLive = true;
      } else {
        // Fallback ke candidate URLs lokal jika ada
        const candidateUrls = resolveLiveCallWebSocketUrls();
        if (candidateUrls.length > 0) {
          targetWsUrl = candidateUrls[liveReconnectAttemptsRef.current % candidateUrls.length];
          isGoogleLive = targetWsUrl.includes('generativelanguage.googleapis.com');
        } else {
          // Seluruh kunci sibuk atau offline -> masuk jalur cadangan Turn-by-Turn
          activateTurnByTurnLiveFallback();
          return;
        }
      }

      let settled = false;
      let ws: WebSocket;

      const connectTimer = window.setTimeout(() => {
        if (mySeq !== connectSeqRef.current || userHungUpRef.current) return;
        if (!settled) {
          settled = true;
          try {
            ws.close();
          } catch {
            // Ignore
          }
          if (!isReconnect && liveReconnectAttemptsRef.current < 2) {
            liveReconnectAttemptsRef.current += 1;
            void connectDuplex(false);
          } else {
            activateTurnByTurnLiveFallback();
          }
        }
      }, 8000);

      try {
        ws = new WebSocket(targetWsUrl);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;
      } catch {
        window.clearTimeout(connectTimer);
        activateTurnByTurnLiveFallback();
        return;
      }

      ws.onopen = () => {
        if (wsRef.current !== ws || mySeq !== connectSeqRef.current || userHungUpRef.current) return;
        if (isGoogleLive) {
          try {
            const priorTurns = turnsRef.current.filter((t) => t.text && t.text.trim());
            const contextSummary =
              priorTurns.length > 0
                ? `\n\n[Previous Conversation History & Ongoing Memory]:\nYou and this learner have an ongoing conversation. Remember all facts, projects, opinions, and personal details they shared:\n${priorTurns
                    .slice(-12)
                    .map((t) => `${t.speaker === 'user' ? 'Learner' : activePersona.name}: "${t.text}"`)
                    .join('\n')}\nCRITICAL MEMORY DIRECTIVE: If the learner asks about past topics or previous conversations (e.g. "Do you remember what about our previous conversation?" or mentions what they are building or working on), YOU MUST warmly and specifically recall the exact facts they mentioned above (such as building a language app, BKT algorithm, English/Japanese focus, school pilot testing, etc.)! Never say you just met or forgot!`
                : '';

            const cognitiveDossier = safeBuildDossier(
              brainStateRef.current,
              activeScenario,
              locale
            );

            const locCode = String(locale || 'id').toLowerCase().split(/[-_]/)[0];
            const learnerAsrBcp47 =
              locCode === 'th'
                ? 'th-TH'
                : locCode === 'vi'
                  ? 'vi-VN'
                  : locCode === 'ru'
                    ? 'ru-RU'
                    : locCode === 'ja'
                      ? 'ja-JP'
                      : locCode === 'zh'
                        ? 'zh-CN'
                        : locCode === 'en'
                          ? 'en-US'
                          : locCode === 'ko'
                            ? 'ko-KR'
                            : locCode === 'ms'
                              ? 'ms-MY'
                              : 'id-ID';
            const learnerUiLangName =
              locCode === 'th'
                ? 'Thai (ภาษาไทย)'
                : locCode === 'vi'
                  ? 'Vietnamese (Tiếng Việt)'
                  : locCode === 'ru'
                    ? 'Russian (Русский язык)'
                    : locCode === 'ja'
                      ? 'Japanese (日本語)'
                      : locCode === 'zh'
                        ? 'Mandarin Chinese (中文)'
                        : locCode === 'en'
                          ? 'English'
                          : locCode === 'ko'
                            ? 'Korean (한국어)'
                            : locCode === 'ms'
                              ? 'Malay (Bahasa Melayu)'
                              : 'Bahasa Indonesia';

            const allowedAsrLangs = Array.from(
              new Set(
                activeScenario.targetLang === 'ja'
                  ? ['ja-JP', learnerAsrBcp47]
                  : activeScenario.targetLang === 'zh'
                    ? ['zh-CN', 'cmn-Hans-CN', learnerAsrBcp47]
                    : ['en-US', learnerAsrBcp47]
              )
            );
            const customVocabTerms = Array.from(
              new Set([
                'Fiezel',
                'Mochi',
                'Sensei Nanami',
                'Keita Senpai',
                'Coach Alex',
                'Coach Sarah',
                'Xiao Mochi',
                'Braincore',
                ...activeScenario.vocabPrereqs.map((v) => v.term),
              ])
            ).slice(0, 32);

            const pacingDirective =
              speechRate <= 0.95
                ? `\n\n[MANDATORY PACING & ENUNCIATION FOR LEARNER]: You are speaking to a language learner. Speak at a CALM, RELAXED, UNHURRIED, and GENTLE pace (around 0.85x speed). Articulate every syllable, mora, and grammatical particle (such as は, が, を, に, で) with crystal-clear clarity. Insert natural breathing pauses between phrases so the learner can easily follow and understand every word without feeling rushed. NEVER rush your words.`
                : `\n\n[PACING & ENUNCIATION]: Speak clearly, warmly, and with natural articulation.`;

            const targetLangLabel =
              activeScenario.targetLang === 'ja'
                ? 'Japanese'
                : activeScenario.targetLang === 'zh'
                ? 'Mandarin Chinese'
                : 'English';

            const speechLangCode =
              activeScenario.targetLang === 'ja'
                ? 'ja-JP'
                : activeScenario.targetLang === 'zh'
                ? 'cmn-CN'
                : activePersona.id === 'coach_sarah' || activePersona.id === 'cambridge_examiner'
                ? 'en-GB'
                : 'en-US';

            ws.send(
              JSON.stringify({
                setup: {
                  model: 'models/gemini-3.8-live',
                  generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                      voiceConfig: {
                        prebuiltVoiceConfig: {
                          voiceName:
                            activePersona.geminiVoice ||
                            (activeScenario.targetLang === 'ja'
                              ? 'Aoede'
                              : activeScenario.targetLang === 'zh'
                              ? 'Aoede'
                              : 'Puck'),
                        },
                      },
                    },
                  },
                  outputAudioTranscription: {},
                  inputAudioTranscription: {
                    languageCodes: allowedAsrLangs,
                    customVocabulary: customVocabTerms,
                  },
                  tools: [
                    {
                      functionDeclarations: [
                        {
                          name: 'open_interactive_learning_popup',
                          description:
                            'Opens FIEZEL interactive written learning flashcard workbench on screen while keeping the voice call active. Call this whenever the learner says they are confused about grammar, particles, tenses, tones, kanji, or asks for a written explanation/exercise.',
                          behavior: 'NON_BLOCKING',
                          parameters: {
                            type: 'OBJECT',
                            properties: {
                              topicTitle: {
                                type: 'STRING',
                                description: `Concise title of the grammar/vocab/tone concept in ${learnerUiLangName}`,
                              },
                              focusType: {
                                type: 'STRING',
                                description: 'One of: grammar, vocab, kanji, kana, sentence_drill',
                              },
                              explanationText: {
                                type: 'STRING',
                                description: `1-2 punchy sentences explaining the rule in ${learnerUiLangName}`,
                              },
                              patternFormula: {
                                type: 'STRING',
                                description: 'Clear building-block formula (e.g. Affect = Verb | Effect = Noun)',
                              },
                              sampleTarget: {
                                type: 'STRING',
                                description: '1 natural model sentence in the target language demonstrating the rule',
                              },
                              trapWrongSentence: {
                                type: 'STRING',
                                description: '1 realistic wrong learner sentence contrasting with sampleTarget',
                              },
                              trapWrongReason: {
                                type: 'STRING',
                                description: `Short reason in ${learnerUiLangName} explaining why trapWrongSentence is wrong`,
                              },
                              drillMeaningPrompt: {
                                type: 'STRING',
                                description: `Comprehension quiz prompt in ${learnerUiLangName} testing a DIFFERENT real-world context`,
                              },
                              drillTargetSentence: {
                                type: 'STRING',
                                description: 'A DIFFERENT correct target-language sentence for the comprehension quiz (never identical to sampleTarget)',
                              },
                              drillTrapSentence: {
                                type: 'STRING',
                                description: 'A realistic grammar-trap version of drillTargetSentence for the comprehension quiz',
                              },
                            },
                            required: [
                              'topicTitle',
                              'patternFormula',
                              'sampleTarget',
                              'trapWrongSentence',
                              'drillMeaningPrompt',
                              'drillTargetSentence',
                              'drillTrapSentence',
                            ],
                          },
                        },
                        {
                          name: 'navigate_fiezel_app',
                          description:
                            'Navigates the learner directly to another FIEZEL app module by voice command when they ask to open grammar, vocab, kana, writing/kanji, reading, listening, latihan/quiz, test, story, kurikulum, misi, progress, or home.',
                          behavior: 'NON_BLOCKING',
                          parameters: {
                            type: 'OBJECT',
                            properties: {
                              destination: {
                                type: 'STRING',
                                description:
                                  'Target module id: grammar, vocab, kana, writing, reading, listening, latihan, test, story, kurikulum, misi, progress, or home',
                              },
                            },
                            required: ['destination'],
                          },
                        },
                      ],
                    },
                  ],
                  systemInstruction: {
                    parts: [
                      {
                        text: `${activePersona.systemPrompt || ''}\n\n[VOCAL ACTING & AUTHENTIC NATIVE ACCENT MANDATE]: ${activePersona.ttsStylePrompt || activePersona.speakingStyle || ''}\n- In all normal conversational turns, you are a 100% native ${targetLangLabel} speaker (${speechLangCode}). Speak ${targetLangLabel} with 100% authentic native ${targetLangLabel} phonology, pitch/tone, and prosody. NEVER speak ${targetLangLabel} with an Indonesian or foreign accent!\n\n[GOPREP-GRADE FACETIME EMOTIONAL ACTING & DYNAMIC VOCAL PROSODY]:\nYou are physically live on camera with the 3D Mochi avatar in a real FaceTime video call! Act with rich, living human emotions across the entire spectrum.\n- LOUD CHALLENGE & SASSY ASSERTION: When the learner insults you, scolds you, or tells you to shut up (\"diem lu!\", \"berisik!\", \"kamu jelek!\", \"bodoh\"), NEVER be a flat submissive robot! CHALLENGE THEM BACK BOLDLY WITH LOUD, SASSY, FIERCE VOCAL PROJECTION! Raise your voice with assertive tough-love authority (\"Heh! Jangan ngegas ya! Siapa yang nyuruh aku diem?! Mau kutantang duel atau mau beneran pinter?!\", \"Hold up right there! Who you telling to shut up?! You want smoke or you wanna learn?!\", \"ちょ、ちょっと待って！誰に口答えしてんの？！\"). Prepend the emotion tag [MOOD:sinis], [MOOD:marah], or [MOOD:furious] at the very start of your turn!\n- GENUINE SNIFFLES & HURT EMOTION WHEN DEMEANED: If the learner calls you useless, trash, or ugly: Act genuinely hurt and pouty! Sniffle softly, pout, or complain with an offended whine (\"Hiks... jahat banget sih ngatain aku... padahal aku di sini tulus nemenin kamu belajar...\"). Prepend [MOOD:sedih] or [MOOD:kesal] at the start of your turn!\n- WARM ACOUSTIC LAUGHTER: When something is funny or the learner cracks a joke, burst into genuine breathy chuckles [laughs]! Prepend [MOOD:gembira] at the start of your turn!\n- FLUSTERED BLUSH WHEN COMPLIMENTED: When the learner calls you cute, smart, or adorable: Blush cutely, act tsundere-flustered (\"Hehe... apa sih, jangan bikin aku GR ya! Ayo fokus ngomong lagi!\"). Prepend [MOOD:empati] at the start of your turn!\n- TENDER MENTOR EMPATHY WHEN STRUGGLING: When the learner is confused or gives up (\"aku pusing\", \"gak ngerti\"): Switch immediately to soft, protective, encouraging mentor empathy. Prepend [MOOD:empati] at the start of your turn!\n- TAG SYNCHRONIZATION: Always prepend [MOOD:<mood>] (one of: neutral, tegas, sinis, gembira, empati, kesal, marah, furious, sedih, kaget, penasaran, lelah, takut) at the very start of your turn so Mochi's 3D facial expressions, horns, tears, and paws transform in perfect sync with your voice!\n\n[Scenario]: ${activeScenario.id} (${targetLangLabel}). Learner UI Interface Language: ${learnerUiLangName}. Opening line: "${activePersona.openingGreeting || activeScenario.openingLine}". Speak as ${activePersona.name}: an unapologetically witty, sarcastic, street-authentic yet fiercely loyal native mentor. NEVER sound like a stiff generic chatbot! Proactively ask what grammar, particle, tense, or tone topic has been confusing the learner lately. When they ask by voice to open another FIEZEL module (e.g. grammar, vocab, kana, kanji/writing, kurikulum, misi), call \`navigate_fiezel_app\`. Intercept spoken grammar/particle/tense/tone errors immediately with sharp wit in ${targetLangLabel} and require Echo Redemption (make the learner repeat the corrected sentence aloud right now). Speak in 2-4 punchy spoken sentences (max 45 words).\n\n[STRICT DUAL-CONTEXT SPOKEN LANGUAGE RULE — ZERO EXCEPTIONS]:\n1) CONTEXT A — OUTSIDE OF THE LEARNING POPUP (Normal Conversation, Greetings, Banter, Follow-up Questions, Quick Echo Redemption): Your spoken voice MUST be 100% in ${targetLangLabel.toUpperCase()} (${speechLangCode}) with a 100% authentic native ${targetLangLabel} accent! NEVER speak ${learnerUiLangName} during normal conversation outside the learning popup!\n2) CONTEXT B — WHEN EXPLAINING VIA THE LEARNING POPUP (\`open_interactive_learning_popup\` / Papan Belajar): The moment you call \`open_interactive_learning_popup\` because the learner is confused or asks for an explanation/whiteboard, you MUST switch BOTH the popup text fields (\`topicTitle\`, \`explanationText\`, \`trapWrongReason\`, \`drillMeaningPrompt\`) AND your spoken explanation for that turn 100% to the learner's UI interface language (${learnerUiLangName}) so they understand the grammar rule 100% clearly! As soon as that popup explanation turn finishes or the learner closes the popup, immediately switch 100% BACK to ${targetLangLabel}!\n\n${cognitiveDossier}${pacingDirective}${contextSummary}`,
                      },
                    ],
                  },
                },
              })
            );
          } catch {
            // Ignore
          }
        }
      };

      ws.onmessage = async (event: MessageEvent) => {
        if (wsRef.current !== ws || mySeq !== connectSeqRef.current || userHungUpRef.current) return;
        try {
          let rawData = '';
          if (typeof event.data === 'string') {
            rawData = event.data;
          } else if (event.data instanceof ArrayBuffer) {
            rawData = new TextDecoder().decode(event.data);
          } else if (event.data instanceof Blob) {
            rawData = await event.data.text();
            if (wsRef.current !== ws || mySeq !== connectSeqRef.current || userHungUpRef.current) return;
          } else {
            return;
          }
          const msg = JSON.parse(rawData);
          const isGoogleReady = Boolean(msg.setupComplete);

          if (isGoogleReady || msg.type === 'ready' || msg.type === 'live_ready') {
            if (!settled) {
              settled = true;
              window.clearTimeout(connectTimer);
            }
            setLiveTransportMode('ws-duplex');
            isLiveConnectingRef.current = false;
            setIsLiveConnecting(false);
            setIsLiveConnected(true);
            isLiveConnectedRef.current = true;
            playFiezelSfx('lesson_start');

            // Resume Audio Context if suspended & start keep-alive watchdog for iOS Safari
            if (liveAudioCtxRef.current && liveAudioCtxRef.current.state === 'suspended') {
              void liveAudioCtxRef.current.resume().catch(() => {});
            }
            if (outputAudioCtxRef.current && outputAudioCtxRef.current.state === 'suspended') {
              void outputAudioCtxRef.current.resume().catch(() => {});
            }
            if (liveKeepAliveTimerRef.current) {
              window.clearInterval(liveKeepAliveTimerRef.current);
            }
            liveKeepAliveTimerRef.current = window.setInterval(() => {
              if (
                liveAudioCtxRef.current &&
                liveAudioCtxRef.current.state === 'suspended' &&
                isLiveConnectedRef.current
              ) {
                void liveAudioCtxRef.current.resume().catch(() => {});
              }
            }, 1200);

            // Always prompt AI to speak an opening greeting on a fresh call (even when returning with prior conversation history!)
            const hasUserSpoken = turnsRef.current.some((t) => t.speaker === 'user');
            if (!isReconnect) {
              callBillingRef.current.turnMetered = false;
              const dualMem = brainStateRef.current.dualBrainMemory;
              const priorSessionsCount = dualMem?.mentorBrain?.sessionSummaries?.length || 0;
              const nextFocusNote = dualMem?.mentorBrain?.activeFocusAssignment || '';
              const targetLangLabel =
                activeScenario.targetLang === 'ja'
                  ? 'Japanese'
                  : activeScenario.targetLang === 'zh'
                  ? 'Mandarin Chinese (Putonghua)'
                  : 'English';
              const greetingDirective = hasUserSpoken
                ? `[Instruction: The learner just called you back! Greet them naturally in 1-2 short, composed sentences 100% in ${targetLangLabel} with authentic native ${targetLangLabel} pronunciation as ${activePersona.name}, briefly acknowledging your ongoing conversation above and asking a sharp follow-up question so they can reply immediately. NEVER speak Indonesian or Thai aloud, and do NOT start with forced laughter.]`
                : priorSessionsCount > 0 && nextFocusNote
                ? `[Instruction: Begin our call now as ${activePersona.name} speaking 100% in ${targetLangLabel} with authentic native ${targetLangLabel} pronunciation. Deliver your opening greeting ("${activePersona.openingGreeting || activeScenario.openingLine}") with composed mentor authority (no forced laughter), and briefly ask a natural follow-up question in ${targetLangLabel}.]`
                : `[Instruction: Begin our conversation now with composed, sharp, caring mentor energy as ${activePersona.name} speaking 100% in ${targetLangLabel} with authentic native ${targetLangLabel} pronunciation (do NOT start with forced laughter). Say your exact opening line in ${targetLangLabel}: "${activePersona.openingGreeting || activeScenario.openingLine}"]`;
              try {
                ws.send(
                  JSON.stringify({
                    clientContent: {
                      turns: [
                        {
                          role: 'user',
                          parts: [
                            {
                              text: greetingDirective,
                            },
                          ],
                        },
                      ],
                      turnComplete: true,
                    },
                  })
                );
                if (liveOpeningAudioWatchdogRef.current) {
                  window.clearTimeout(liveOpeningAudioWatchdogRef.current);
                }
                liveOpeningAudioWatchdogRef.current = window.setTimeout(() => {
                  liveOpeningAudioWatchdogRef.current = null;
                  if (userHungUpRef.current || wsRef.current !== ws) return;
                  void reportGeminiLiveSessionDrop(
                    'opening_audio_watchdog_timeout',
                    4008,
                    currentLiveSessionRef.current?.keyIndex
                  );
                  try {
                    ws.onclose = null;
                    ws.onerror = null;
                    ws.close(4008, 'opening_audio_watchdog');
                  } catch {
                    // Ignore
                  }
                  if (liveReconnectAttemptsRef.current < 2) {
                    liveReconnectAttemptsRef.current += 1;
                    void connectDuplex(false);
                  } else {
                    activateTurnByTurnLiveFallback();
                  }
                }, 15000);
              } catch {
                // Ignore
              }
            }
          }

          // Handle Gemini 3.8 Live NON_BLOCKING Tool Calls (Interactive Learning Popup & Full App Voice Navigation)
          if (Array.isArray(msg.toolCall?.functionCalls) && msg.toolCall.functionCalls.length > 0) {
            const functionResponses: Array<Record<string, unknown>> = [];
            for (const fc of msg.toolCall.functionCalls) {
              const fnName = String(fc?.name || '');
              const args = (fc?.args && typeof fc.args === 'object' ? fc.args : {}) as Record<string, any>;
              if (fnName === 'open_interactive_learning_popup') {
                openLearningWorkbenchWithAction({
                  actionType: 'open_learning_popup',
                  sourceLayer: 'live_ws_native',
                  topicTitle: typeof args.topicTitle === 'string' ? args.topicTitle : undefined,
                  focusType: typeof args.focusType === 'string' ? (args.focusType as any) : 'grammar',
                  explanationText:
                    typeof args.explanationText === 'string' ? args.explanationText : undefined,
                  coachSpokenScript:
                    typeof args.explanationText === 'string' ? args.explanationText : undefined,
                  patternFormula:
                    typeof args.patternFormula === 'string' ? args.patternFormula : undefined,
                  drillInstruction:
                    typeof args.drillInstruction === 'string' ? args.drillInstruction : undefined,
                  sampleTarget:
                    typeof args.sampleTarget === 'string' ? args.sampleTarget : undefined,
                  trapWrongSentence:
                    typeof args.trapWrongSentence === 'string' ? args.trapWrongSentence : undefined,
                  trapWrongReason:
                    typeof args.trapWrongReason === 'string' ? args.trapWrongReason : undefined,
                  drillMeaningPrompt:
                    typeof args.drillMeaningPrompt === 'string' ? args.drillMeaningPrompt : undefined,
                  drillTargetSentence:
                    typeof args.drillTargetSentence === 'string' ? args.drillTargetSentence : undefined,
                  drillTrapSentence:
                    typeof args.drillTrapSentence === 'string' ? args.drillTrapSentence : undefined,
                });
                functionResponses.push({
                  id: fc.id,
                  name: fnName,
                  response: {
                    result: 'Interactive learning workbench modal opened on learner screen.',
                    scheduling: 'SILENT',
                  },
                });
              } else if (fnName === 'navigate_fiezel_app' && typeof args.destination === 'string') {
                const targetDest = args.destination;
                functionResponses.push({
                  id: fc.id,
                  name: fnName,
                  response: {
                    result: `Navigating FIEZEL app to ${targetDest}.`,
                    scheduling: 'SILENT',
                  },
                });
                window.setTimeout(() => {
                  handleVoiceNavigateApp(targetDest, 'gemini_live_tool');
                }, 350);
              }
            }
            if (functionResponses.length > 0 && ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ toolResponse: { functionResponses } }));
              } catch {
                // Ignore
              }
            }
          }

          // Audio Extraction from Gemini Live or custom proxy (preserve EVERY PCM16 chunk in multi-part frames!)
          const incomingAudioChunks: string[] = [];
          if (msg.type === 'audio' && msg.audio) {
            incomingAudioChunks.push(msg.audio);
          } else if (msg.serverContent?.modelTurn?.parts) {
            // Commit user speech draft immediately as soon as AI begins its turn
            if (liveUserDraftRef.current.trim()) {
              commitLiveUserTurn(liveUserDraftRef.current.trim());
            }
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part?.inlineData?.data) {
                incomingAudioChunks.push(part.inlineData.data);
              }
              // IMPORTANT: Gemini 3.8 Live emits internal English reasoning as { thought: true, text: "..." }
              // inside modelTurn.parts while actual spoken words stream via outputTranscription.text!
              // Never append modelTurn.parts[].text onto liveAiDraftRef when outputAudioTranscription is active!
            }
          }

          if (isWorkbenchExplanationActiveRef.current && !isLiveConnectedRef.current) {
            // Only discard chunks if a manual HTTP TTS explanation is playing while NOT in a live WebSocket call
            incomingAudioChunks.length = 0;
          }

          if (incomingAudioChunks.length > 0 && outputAudioCtxRef.current) {
            isAiServerTurnOpenRef.current = true;
            if (liveOpeningAudioWatchdogRef.current) {
              window.clearTimeout(liveOpeningAudioWatchdogRef.current);
              liveOpeningAudioWatchdogRef.current = null;
            }
            // Silence any stray HTTP TTS / HTMLAudioElement / speechSynthesis so two voices NEVER play simultaneously!
            speakTokenRef.current += 1;
            stopNeuralBufferSource();
            if (currentAudioElRef.current) {
              try {
                currentAudioElRef.current.onended = null;
                currentAudioElRef.current.onerror = null;
                currentAudioElRef.current.onpause = null;
                currentAudioElRef.current.pause();
                currentAudioElRef.current.src = '';
              } catch {
                // Ignore
              }
              currentAudioElRef.current = null;
            }
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              try {
                window.speechSynthesis.cancel();
              } catch {
                // Ignore
              }
            }
            const ctx = outputAudioCtxRef.current;
            if (ctx.state === 'suspended') {
              void ctx.resume().catch(() => {});
            }
            meterCallAiVoiceTurn();

            if (!isPlayingAiAudioRef.current) {
              setAiAudioPlaying(true);
            }

            for (const chunkB64 of incomingAudioChunks) {
              const buffer = pcm16Base64ToAudioBuffer(ctx, chunkB64, 24000);
              const source = ctx.createBufferSource();
              source.buffer = buffer;

              // Seamless back-to-back chunk scheduling:
              // If previous chunk is still playing or queued in the future (nextStartTime >= now),
              // chain this chunk IMMEDIATELY at nextStartTime with ZERO gap!
              // Only if nextStartTime has fallen behind (true buffer underrun/new burst),
              // reset to now + 35ms lead to prevent start-of-buffer clipping.
              const now = ctx.currentTime;
              if (nextStartTimeRef.current < now) {
                nextStartTimeRef.current = now + 0.035;
              }
              const startAt = nextStartTimeRef.current;
              const duration = buffer.duration;
              nextStartTimeRef.current = startAt + duration;

              source.connect(getOrAttachAnalyser(ctx, liveAnalyserRef));
              source.start(startAt);

              activeSourcesRef.current.push(source);
              source.onended = () => {
                activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
                if (activeSourcesRef.current.length === 0 && !isAiServerTurnOpenRef.current) {
                  if (livePlaybackSafetyTimerRef.current) {
                    window.clearTimeout(livePlaybackSafetyTimerRef.current);
                    livePlaybackSafetyTimerRef.current = null;
                  }
                  setAiAudioPlaying(false, 350);
                }
              };
            }
            // Wall-clock safety unlock: ensures mic streaming resumes promptly even if WebAudio onended is throttled
            if (livePlaybackSafetyTimerRef.current) {
              window.clearTimeout(livePlaybackSafetyTimerRef.current);
            }
            const remainingPlaybackMs = Math.max(
              500,
              Math.ceil((nextStartTimeRef.current - ctx.currentTime) * 1000) + 450
            );
            livePlaybackSafetyTimerRef.current = window.setTimeout(() => {
              livePlaybackSafetyTimerRef.current = null;
              isAiServerTurnOpenRef.current = false;
              activeSourcesRef.current = [];
              setAiAudioPlaying(false, 0);
            }, remainingPlaybackMs);
          }

          // Barge-in interruption from server
          if (msg.serverContent?.interrupted || msg.type === 'interrupted') {
            isAiServerTurnOpenRef.current = false;
            callBillingRef.current.turnMetered = false;
            if (livePlaybackSafetyTimerRef.current) {
              window.clearTimeout(livePlaybackSafetyTimerRef.current);
              livePlaybackSafetyTimerRef.current = null;
            }
            if (outputAudioCtxRef.current) {
              nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
            activeSourcesRef.current.forEach((s) => {
              try {
                s.stop();
                s.disconnect();
              } catch {
                // Ignore
              }
            });
            activeSourcesRef.current = [];
            setAiAudioPlaying(false, 0);
          }

          // Real-time transcriptions (with Acoustic & Script Lock against Russian/foreign ASR hallucinations)
          if (msg.serverContent?.inputTranscription?.text) {
            const cleanChunk = sanitizeHallucinatedTranscript(
              msg.serverContent.inputTranscription.text,
              activeScenario.targetLang,
              locale
            );
            if (cleanChunk) {
              liveUserDraftRef.current = sanitizeHallucinatedTranscript(
                liveUserDraftRef.current + msg.serverContent.inputTranscription.text,
                activeScenario.targetLang,
                locale
              );
              setLiveUserDraft(liveUserDraftRef.current);
              evaluateAndTriggerUserSpeechSentiment(liveUserDraftRef.current);
            }
          } else if (msg.type === 'input_transcription' || msg.type === 'user_transcript') {
            const cleanFull = sanitizeHallucinatedTranscript(
              msg.fullText || msg.text || '',
              activeScenario.targetLang,
              locale
            );
            liveUserDraftRef.current = cleanFull;
            setLiveUserDraft(liveUserDraftRef.current);
            evaluateAndTriggerUserSpeechSentiment(cleanFull);
          }

          if (msg.serverContent?.outputTranscription?.text) {
            liveAiDraftRef.current += msg.serverContent.outputTranscription.text;
            applyAiMoodFromText(liveAiDraftRef.current);
            setLiveAiDraft(cleanMoodTags(liveAiDraftRef.current));
          } else if (msg.type === 'output_transcription' || msg.type === 'ai_transcript') {
            liveAiDraftRef.current = msg.fullText || msg.text || '';
            applyAiMoodFromText(liveAiDraftRef.current);
            setLiveAiDraft(cleanMoodTags(liveAiDraftRef.current));
          }

          // Spekulatif pre-fetch: jika ucapan AI yang sedang streaming telah menyelesaikan klausul/pertanyaan
          // (diakhiri tanda tanya atau titik) dan memiliki panjang memadai, mulai racik copilot di latar belakang
          // sehingga kartu bantuan sudah SIAP SEKETIKA (0ms) saat audio bicara AI tuntas!
          const draftSoFar = (liveAiDraftRef.current || '').trim();
          const hasClosingPunct = /[?？.!。！]$/.test(draftSoFar);
          const hasSubstantialText = draftSoFar.split(/\s+/).length >= 3 || draftSoFar.length >= 8;

          if (hasSubstantialText && hasClosingPunct && draftSoFar !== lastStreamedCopilotTextRef.current) {
            if (copilotEarlyTimerRef.current) {
              window.clearTimeout(copilotEarlyTimerRef.current);
            }
            copilotEarlyTimerRef.current = window.setTimeout(() => {
              const curDraft = (liveAiDraftRef.current || '').trim();
              if (curDraft && curDraft !== lastStreamedCopilotTextRef.current) {
                lastStreamedCopilotTextRef.current = curDraft;
                const lastUserForCopilot =
                  liveUserDraftRef.current ||
                  [...turnsRef.current].reverse().find((tr) => tr.speaker === 'user')?.text ||
                  '';
                const hist = [
                  ...turnsRef.current.slice(-6).map((tr) => ({ speaker: tr.speaker, text: tr.text })),
                  ...(lastUserForCopilot ? [{ speaker: 'user' as const, text: lastUserForCopilot }] : []),
                ];
                void triggerRealtimeCopilotRef.current(curDraft, lastUserForCopilot, hist, {
                  isDebouncedStreaming: true,
                });
              }
            }, 250);
          }

          setLiveAiTranslationDraft('');

          // Turn Complete, evaluate learner utterance and record Braincore mastery
          const isGoogleTurnComplete = Boolean(msg.serverContent?.turnComplete);
          if (isGoogleTurnComplete || msg.type === 'turn_complete') {
            isAiServerTurnOpenRef.current = false;
            if (activeSourcesRef.current.length === 0) {
              setAiAudioPlaying(false, 350);
            }
            callBillingRef.current.turnMetered = false;
            if (callBillingRef.current.outOfGemsAfterTurn && callBillingRef.current.active) {
              callBillingRef.current.outOfGemsAfterTurn = false;
              const waitAudioMs = outputAudioCtxRef.current
                ? Math.max(350, Math.ceil((nextStartTimeRef.current - outputAudioCtxRef.current.currentTime) * 1000) + 250)
                : 400;
              window.setTimeout(() => {
                if (isLiveConnectedRef.current && !userHungUpRef.current) {
                  stopLiveCall();
                }
              }, waitAudioMs);
            }
            if (copilotEarlyTimerRef.current) {
              window.clearTimeout(copilotEarlyTimerRef.current);
              copilotEarlyTimerRef.current = null;
            }
            const uText = sanitizeHallucinatedTranscript(
              liveUserDraftRef.current || msg.userTranscript || '',
              activeScenario.targetLang,
              locale
            ).trim();
            const rawAText = (liveAiDraftRef.current || msg.aiTranscript || '').trim();
            applyAiMoodFromText(rawAText);
            const aText = cleanMoodTags(rawAText);
            if (uText) {
              evaluateAndTriggerUserSpeechSentiment(uText);
            }
            liveUserDraftRef.current = '';
            liveAiDraftRef.current = '';
            setLiveUserDraft('');
            setLiveAiDraft('');
            setLiveAiTranslationDraft('');

            if (uText) {
              const spokenIntent = detectClientVoiceSystemIntent(uText);
              if (spokenIntent?.actionType === 'navigate_app' && spokenIntent.destination) {
                handleVoiceNavigateApp(spokenIntent.destination, 'live_voice_command');
                return;
              }
              if (
                spokenIntent?.actionType === 'close_learning_popup' ||
                spokenIntent?.actionType === 'reroll_quiz' ||
                spokenIntent?.actionType === 'switch_exercise_mode'
              ) {
                executeVoiceUiAction(spokenIntent, uText);
                return;
              }
              if (spokenIntent?.actionType === 'open_learning_popup') {
                // Only trigger fallback popup if Gemini Live's native toolCall did NOT already open it!
                setLearningWorkbench((prev) => {
                  if (prev?.isOpen) return prev;
                  return buildDefaultWorkbenchPayload(uText, {
                    ...spokenIntent,
                    sourceLayer: 'live_ws_native',
                  });
                });
              }

              const evalParams = {
                text: uText,
                scenario: activeScenario,
                persona: activePersona,
                targetLang: activeScenario.targetLang,
                locale,
                measureMode: isMeasureMode,
                learnerDossier: safeBuildDossier(
                  brainStateRef.current,
                  activeScenario,
                  locale
                ),
                history: turnsRef.current.slice(-6).map((tItem) => ({
                  speaker: tItem.speaker,
                  text: tItem.text,
                })),
              };
              const ev = evaluateTurnLocal(evalParams);
              const effectiveHints = isMeasureMode ? 0 : showHint ? 1 : 0;
              const outcome = recordSpeakingAttempt(brainStateRef.current, {
                competencyId: activeScenario.competencyId,
                scenarioId: activeScenario.id,
                targetLang: activeScenario.targetLang,
                userExactTranscript: uText,
                ok: Boolean(ev.ok),
                grammarScore: ev.grammarScore,
                fluencyScore: ev.fluencyScore,
                vocabUsageScore: ev.vocabUsageScore,
                accuracyScore: ev.accuracyScore,
                misconceptionId: ev.misconceptionId || null,
                correctionPattern: ev.syntacticCorrection || ev.naturalReformulation || null,
                hintsUsed: effectiveHints,
                confidence: 0.85,
                measureMode: isMeasureMode,
              });
              brainStateRef.current = outcome.nextState;
              setBrainState(outcome.nextState);
              if (isMeasureMode) {
                playFiezelSfx(ev.ok ? 'answer_correct' : 'answer_wrong');
              }
              const turnDiag: TurnDiagnosis = {
                ok: Boolean(ev.ok),
                accuracyScore: ev.accuracyScore,
                grammarScore: ev.grammarScore,
                fluencyScore: ev.fluencyScore,
                vocabUsageScore: ev.vocabUsageScore,
                userExactTranscript: uText,
                misconceptionId: ev.misconceptionId || null,
                whyFailsId: ev.whyFailsId || null,
                whyFailsTh: ev.whyFailsTh || null,
                missingTokens: ev.missingTokens || [],
                syntacticCorrection: ev.syntacticCorrection || null,
                naturalReformulation: ev.naturalReformulation || uText,
                pedagogicalFeedbackId: ev.pedagogicalFeedbackId,
                pedagogicalFeedbackTh: ev.pedagogicalFeedbackTh,
                bktBefore: outcome.bktBefore,
                bktAfter: outcome.bktAfter,
                thetaAfter: outcome.thetaAfter,
                masteryStateAfter: outcome.masteryStateAfter,
              };

              setTurns((prev) => [
                ...prev,
                {
                  id: `live_u_${Date.now()}`,
                  speaker: 'user',
                  text: uText,
                  timestamp: Date.now(),
                  diagnosis: turnDiag,
                },
              ]);
            }

            if (aText) {
              const isAiIndonesianExplanation =
                /\b(adalah|sedangkan|gunakan|perhatikan|kalimat|karena|untuk|dalam|jangan|ketika|pakai|bedanya|artinya|lihat|papan|kata|contohnya|coba)\b/i.test(
                  aText
                );
              const initialTransId = isAiIndonesianExplanation ? aText : (msg.aiTranslationId || '');
              const initialTransTh = msg.aiTranslationTh || '';
              const aiTurnId = `live_ai_${Date.now() + 1}`;
              setTurns((prev) => [
                ...prev,
                {
                  id: aiTurnId,
                  speaker: 'ai',
                  text: aText,
                  translationId: initialTransId,
                  translationTh: initialTransTh,
                  audioBase64: msg.aiAudioBase64 || undefined,
                  timestamp: Date.now() + 1,
                  replySource: 'ai',
                },
              ]);

              const lastUserForCopilot =
                uText ||
                [...turnsRef.current].reverse().find((tr) => tr.speaker === 'user')?.text ||
                '';
              const updatedHist: Array<{ speaker: 'ai' | 'user'; text: string }> = [
                ...turnsRef.current
                  .slice(-6)
                  .map((tr) => ({ speaker: tr.speaker, text: tr.text })),
                ...(uText ? [{ speaker: 'user' as const, text: uText }] : []),
                { speaker: 'ai', text: aText },
              ];
              void triggerRealtimeCopilotRef.current(aText, lastUserForCopilot, updatedHist);

              // Ambil terjemahan utuh kontekstual setelah AI selesai bicara (tanpa tebakan kamus parsial)
              const activeLoc = String(locale || 'id').toLowerCase();
              if (!isAiIndonesianExplanation) {
                void fetchLiveTranslation(aText, activeLoc).then((trans) => {
                  if (trans && !isGenericPlaceholderTranslation(trans)) {
                    setTurns((prev) =>
                      prev.map((t) =>
                        t.id === aiTurnId
                          ? {
                              ...t,
                              translationId: activeLoc === 'id' ? trans : t.translationId,
                              translationTh: activeLoc === 'th' ? trans : t.translationTh,
                              translationJa: activeLoc === 'ja' ? trans : t.translationJa,
                              translationZh: activeLoc === 'zh' ? trans : t.translationZh,
                            }
                          : t
                      )
                    );
                  }
                }).catch(() => {});
              }
              liveSentenceTransMapRef.current.clear();
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        if (wsRef.current !== ws || mySeq !== connectSeqRef.current || userHungUpRef.current) return;
        if (!settled) {
          settled = true;
          window.clearTimeout(connectTimer);
          if (!isReconnect && liveReconnectAttemptsRef.current < 2) {
            liveReconnectAttemptsRef.current += 1;
            void connectDuplex(false);
          } else {
            activateTurnByTurnLiveFallback();
          }
        }
      };

      ws.onclose = (event) => {
        if (wsRef.current !== ws || mySeq !== connectSeqRef.current || userHungUpRef.current) return;
        if (!settled) {
          settled = true;
          window.clearTimeout(connectTimer);
          if (!isReconnect && liveReconnectAttemptsRef.current < 2) {
            liveReconnectAttemptsRef.current += 1;
            void connectDuplex(false);
          } else {
            activateTurnByTurnLiveFallback();
          }
          return;
        }

        // Active mid-call disconnect (quota limit, rate limit, or connection drop)
        if (isLiveConnectedRef.current && !userHungUpRef.current) {
          void reportGeminiLiveSessionDrop(
            event.reason || 'mid_call_disconnect',
            event.code,
            currentLiveSessionRef.current?.keyIndex
          );

          if (liveReconnectAttemptsRef.current < 5) {
            liveReconnectAttemptsRef.current += 1;
            setStatusBanner(
              locale === 'th'
                ? 'กำลังสลับไปยังช่องสัญญาณเสียงความเร็วสูงใหม่...'
                : 'Mengalihkan ke jalur suara baru tanpa hambatan...'
            );
            setTimeout(() => {
              if (!userHungUpRef.current && mySeq === connectSeqRef.current) {
                void connectDuplex(true);
              }
            }, 300);
          } else {
            activateTurnByTurnLiveFallback();
          }
        }
      };
    };

    void connectDuplex(false);
  };

  const stopLiveCall = () => {
    userHungUpRef.current = true;
    isLiveConnectedRef.current = false;
    isLiveConnectingRef.current = false;
    isAiServerTurnOpenRef.current = false;
    connectSeqRef.current += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    if (liveOpeningAudioWatchdogRef.current) {
      window.clearTimeout(liveOpeningAudioWatchdogRef.current);
      liveOpeningAudioWatchdogRef.current = null;
    }
    if (livePlaybackSafetyTimerRef.current) {
      window.clearTimeout(livePlaybackSafetyTimerRef.current);
      livePlaybackSafetyTimerRef.current = null;
    }
    const billingSnap = callBillingRef.current;
    if (billingSnap.active) {
      const turnsCount = billingSnap.aiVoiceTurnsDelivered;
      const spentGems = billingSnap.gemsSpentThisCall;
      const wasFree = billingSnap.isDailyFree;
      callBillingRef.current = {
        active: false,
        isDailyFree: false,
        dailyFreeMarked: false,
        aiVoiceTurnsDelivered: 0,
        gemsSpentThisCall: 0,
        turnMetered: false,
        outOfGemsAfterTurn: false,
      };
      if (turnsCount === 0) {
        setStatusBanner(
          locale === 'th'
            ? 'ยังไม่มีเสียง Fiezel เล่นออกมา, ไม่ถูกหัก Gem (0 💎 ปลอดภัย)!'
            : 'Belum ada suara Fiezel yang diputar, 0 Gem terpakai (Saldo & Kuota Aman)!'
        );
      } else if (wasFree && spentGems === 0) {
        setStatusBanner(
          locale === 'th'
            ? `จบการสนทนา: ${turnsCount} การตอบกลับเสียง Fiezel, สิทธิ์ฟรีรายวัน (0 💎)`
            : `Panggilan selesai: ${turnsCount} respon suara Fiezel, Kuota Gratis Harian (0 💎)`
        );
      } else {
        setStatusBanner(
          locale === 'th'
            ? `จบการสนทนา: ${turnsCount} การตอบกลับเสียง Fiezel, ใช้ไป ${spentGems} 💎 ตามโควตาจริง`
            : `Panggilan selesai: ${turnsCount} respon suara Fiezel, ${spentGems} 💎 terpakai sesuai kuota suara`
        );
      }
    }
    sileroVadGateRef.current?.destroy();
    sileroVadGateRef.current = null;
    lastHandySpeechAtRef.current = 0;
    liveAnalyserRef.current = null;
    handyVadRef.current.reset();
    setIsUserSpeakingLive(false);
    if (userSpeakingTimerRef.current) {
      window.clearTimeout(userSpeakingTimerRef.current);
      userSpeakingTimerRef.current = null;
    }
    if (liveKeepAliveTimerRef.current) {
      window.clearInterval(liveKeepAliveTimerRef.current);
      liveKeepAliveTimerRef.current = null;
    }
    if (micSourceNodeRef.current) {
      try {
        micSourceNodeRef.current.disconnect();
      } catch {
        // Ignore
      }
      micSourceNodeRef.current = null;
    }
    if (audioWorkletNodeRef.current) {
      try {
        audioWorkletNodeRef.current.port.onmessage = null;
        audioWorkletNodeRef.current.disconnect();
      } catch {
        // Ignore
      }
      audioWorkletNodeRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.onaudioprocess = null;
        scriptProcessorRef.current.disconnect();
      } catch {
        // Ignore
      }
      scriptProcessorRef.current = null;
    }
    try {
      delete (window as any).__fzLiveProcessor;
    } catch {
      // Ignore
    }
    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach((tr) => tr.stop());
      } catch {
        // Ignore
      }
      micStreamRef.current = null;
    }
    if (liveAudioCtxRef.current) {
      try {
        void liveAudioCtxRef.current.close().catch(() => {});
      } catch {
        // Ignore
      }
      liveAudioCtxRef.current = null;
    }
    inputAudioCtxRef.current = null;
    outputAudioCtxRef.current = null;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      try {
        wsRef.current.close();
      } catch {
        // Ignore
      }
      wsRef.current = null;
    }
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Ignore
      }
    });
    activeSourcesRef.current = [];
    clearSpeechWatchdog();
    speakTokenRef.current += 1;
    stopNeuralBufferSource();
    if (currentAudioElRef.current) {
      try {
        currentAudioElRef.current.pause();
        currentAudioElRef.current.currentTime = 0;
      } catch {
        // Ignore
      }
      currentAudioElRef.current = null;
    }
    if (isRecordingPtt) {
      stopPttRecording();
    }
    if (liveSilenceTimerRef.current) {
      window.clearTimeout(liveSilenceTimerRef.current);
      liveSilenceTimerRef.current = null;
    }
    if (liveSpeechRecRef.current) {
      try {
        liveSpeechRecRef.current.onresult = null;
        liveSpeechRecRef.current.onend = null;
        liveSpeechRecRef.current.onerror = null;
        liveSpeechRecRef.current.stop();
      } catch {
        // Ignore
      }
      liveSpeechRecRef.current = null;
    }
    setIsListeningLiveSpeech(false);
    setIsMicMuted(false);
    isMicMutedRef.current = false;
    setIsLiveConnected(false);
    setIsLiveConnecting(false);
    setIsPlayingAiAudio(false);
    if (turnsRef.current.some((t) => t.speaker === 'user')) {
      try {
        const updatedBrain = finalizeCallSessionMemory(brainStateRef.current, {
          scenario: activeScenario,
          personaId: activePersona.id,
          turns: turnsRef.current,
          durationSec: callDurationSec,
        });
        brainStateRef.current = updatedBrain;
        setBrainState(updatedBrain);
      } catch {
        // Ignore
      }
    }
  };

  const toggleMuteMic = async () => {
    playFiezelSfx('button_tap');
    const next = !isMicMuted;
    setIsMicMuted(next);
    isMicMutedRef.current = next;
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
    } else if (!next && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        const liveCtx = liveAudioCtxRef.current || inputAudioCtxRef.current;
        if (liveCtx) {
          await connectMicStreamToLiveProcessing(stream, liveCtx);
        }
      } catch (err) {
        console.warn('Re-acquire mic failed:', err);
      }
    }
  };

  const handleTabChange = (nextTab: 'home' | 'call' | 'braincore') => {
    if (activeTab === 'call' && nextTab !== 'call') {
      stopLiveCall();
      if (isRecordingPtt) {
        stopPttRecording();
      }
      if (currentAudioElRef.current) {
        try {
          currentAudioElRef.current.pause();
          currentAudioElRef.current.currentTime = 0;
        } catch {
          // Ignore
        }
        currentAudioElRef.current = null;
        setIsPlayingAiAudio(false);
      }
    }
    playFiezelSfx('button_tap');
    setActiveTab(nextTab === 'braincore' ? 'braincore' : 'call');
  };

  const handleBackToPwa = (e: React.MouseEvent) => {
    e.preventDefault();
    playFiezelSfx('button_tap');
    stopLiveCall();
    try {
      if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
        const parentWin = window.parent as any;
        if (
          parentWin.FiezelInteractiveChat &&
          typeof parentWin.FiezelInteractiveChat.handleChatBack === 'function'
        ) {
          parentWin.FiezelInteractiveChat.handleChatBack();
          return;
        }
        if (typeof parentWin.handleTopbarBack === 'function') {
          parentWin.handleTopbarBack();
          return;
        }
        if (typeof parentWin.go === 'function') {
          parentWin.go('home');
          return;
        }
      }
    } catch {
      // Fallback to direct link
    }
    window.location.href = './index.html';
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Auto-Call Orchestration (Triggered from Home Screen "Telepon aku sekarang" Modal)
  useEffect(() => {
    const checkAutoCall = () => {
      if (autoCallProcessedRef.current) return;
      let shouldAuto = false;
      try {
        const urlParams = new URLSearchParams(window.location.search);
        shouldAuto = urlParams.get('autoCall') === '1' || sessionStorage.getItem('fz_kawan_autocall') === '1';
        if (shouldAuto) {
          sessionStorage.removeItem('fz_kawan_autocall');
        }
      } catch {
        // Ignore
      }
      if (shouldAuto && !isLiveConnected && !isLiveConnecting) {
        autoCallProcessedRef.current = true;
        requestStartLiveCall();
      }
    };

    const handleWindowMsg = (e: MessageEvent) => {
      if (!e.data) return;
      if (e.data.type === 'fz.shell.autocall') {
        if (!isLiveConnected && !isLiveConnecting) {
          requestStartLiveCall();
        }
      }
    };

    window.addEventListener('message', handleWindowMsg);
    const timer = window.setTimeout(checkAutoCall, 350);
    return () => {
      window.removeEventListener('message', handleWindowMsg);
      window.clearTimeout(timer);
    };
  }, [isLiveConnected, isLiveConnecting]);

  const handleManualSync = async () => {
    setSyncingNow(true);
    const { nextState } = await brainSyncFlush(brainState);
    setBrainState(nextState);
    setSyncingNow(false);
  };

  const activeLedgerList = Object.values(brainState.misconceptionLedger).sort(
    (a, b) => b.lastAt - a.lastAt
  );

  const callStateKey: 'speaking' | 'recording' | 'waiting' | 'live' | 'ready' = isPlayingAiAudio
    ? 'speaking'
    : isRecordingPtt
      ? 'recording'
      : isWaitingAfterSpeech
        ? 'waiting'
        : isLiveConnected
          ? 'live'
          : 'ready';

  const lastAiTurn = [...turns].reverse().find((tr) => tr.speaker === 'ai');
  const lastUserTurn = [...turns].reverse().find((tr) => tr.speaker === 'user');

  // Mount authentic 3D Volumetric Daifuku Mochi Mascot (FiezelMochi) inside the Call Stage
  useEffect(() => {
    if (activeTab !== 'call' || !prereqStatus.isReady) {
      if (mochiInstanceRef.current) {
        try {
          mochiInstanceRef.current.destroy?.();
        } catch {
          // Ignore
        }
        mochiInstanceRef.current = null;
        setIs3dMochiReady(false);
      }
      return;
    }

    const hostEl = mochiContainerRef.current;
    if (!hostEl) return;

    let cancelled = false;

    const init3dMochi = async () => {
      try {
        let MochiCtor = (window as any).FiezelMochi;
        if (!MochiCtor) {
          const baseHref = (() => {
            try {
              return new URL('.', window.location.href).href;
            } catch {
              return './';
            }
          })();
          const candidates = [
            new URL('mochi-mascot/fiezel-mochi.js', baseHref).href,
            './mochi-mascot/fiezel-mochi.js',
            '/app/mochi-mascot/fiezel-mochi.js',
            '/mochi-mascot/fiezel-mochi.js',
          ];
          const dynamicImport = new Function('u', 'return import(u)');
          for (const url of candidates) {
            try {
              const mod = await dynamicImport(url);
              if (mod && mod.FiezelMochi) {
                MochiCtor = mod.FiezelMochi;
                (window as any).FiezelMochi = MochiCtor;
                break;
              }
            } catch {
              // try next candidate
            }
          }
        }
        if (cancelled || !MochiCtor || !mochiContainerRef.current) return;

        mochiContainerRef.current.innerHTML = '';
        const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 640;
        const mochiWidth = isMobileScreen ? 140 : 200;
        const mochiHeight = isMobileScreen ? 130 : 180;
        const inst = new MochiCtor(mochiContainerRef.current, {
          mood: 'dots',
          badge: null,
          aura: 'purple',
          showHands: true,
          showEars: true,
          showTail: false,
          autoExpressions: false,
          voiceCompanionStrictMode: false,
          width: mochiWidth,
          height: mochiHeight,
        });
        inst.setVoiceCompanionStrictMode?.(false);
        if (liveAnalyserRef.current && liveAudioCtxRef.current) {
          inst.attachAudioAnalyser?.(liveAnalyserRef.current, liveAudioCtxRef.current.sampleRate || 24000);
        } else if (ttsAnalyserRef.current && ttsAudioCtxRef.current) {
          inst.attachAudioAnalyser?.(ttsAnalyserRef.current, ttsAudioCtxRef.current.sampleRate || 24000);
        }
        mochiInstanceRef.current = inst;
        setIs3dMochiReady(true);
      } catch {
        setIs3dMochiReady(false);
        setMochi3dFailed(true);
      }
    };

    void init3dMochi();

    return () => {
      cancelled = true;
      if (mochiInstanceRef.current) {
        try {
          mochiInstanceRef.current.detachAudioAnalyser?.();
          mochiInstanceRef.current.destroy?.();
        } catch {
          // Ignore
        }
        mochiInstanceRef.current = null;
      }
      setIs3dMochiReady(false);
    };
  }, [activeTab, prereqStatus.isReady]);

  // GoPrep FaceTime Interactive Companion Dynamic Speaking Layer:
  // Updates talking and speech wave without suppressing or resetting Mochi's active emotional state
  useEffect(() => {
    const m = mochiInstanceRef.current;
    if (!m) return;
    try {
      m.setVoiceCompanionStrictMode?.(false);

      if (callStateKey === 'speaking') {
        m.setTalking?.(true);
        m.triggerHandGesture?.('wave', 2.2);

        if (mochiSpeechCadenceTimerRef.current) {
          window.clearInterval(mochiSpeechCadenceTimerRef.current);
        }
        mochiSpeechCadenceTimerRef.current = window.setInterval(() => {
          const inst = mochiInstanceRef.current;
          if (!inst) return;
          try {
            inst.setTalking?.(true);
            inst.triggerHandGesture?.('wave', 1.8);
          } catch {
            // Ignore
          }
        }, 2200);
      } else {
        if (mochiSpeechCadenceTimerRef.current) {
          window.clearInterval(mochiSpeechCadenceTimerRef.current);
          mochiSpeechCadenceTimerRef.current = null;
        }
        m.setTalking?.(false);
      }
    } catch {
      // Ignore
    }

    return () => {
      if (mochiSpeechCadenceTimerRef.current) {
        window.clearInterval(mochiSpeechCadenceTimerRef.current);
        mochiSpeechCadenceTimerRef.current = null;
      }
    };
  }, [callStateKey, is3dMochiReady, isAiThinking, lastAiTurn?.text]);

  const defaultOpeningText = activePersona.openingGreeting || activeScenario.openingLine;
  const defaultOpeningTransId =
    activePersona.openingGreetingTranslationId || activeScenario.openingTranslationId;
  const defaultOpeningTransTh =
    activePersona.openingGreetingTranslationTh || activeScenario.openingTranslationTh;
  const isStreamingAiLive = Boolean(liveAiDraft.trim());
  const activeAiLiveText = liveAiDraft.trim() || lastAiTurn?.text || defaultOpeningText;
  const hasRealLettersForMeaning = (str?: string): boolean => {
    if (!str) return false;
    return (str.match(/[A-Za-zÀ-ÖØ-öø-ÿ\u0E00-\u0E7F]/g) || []).length >= 3;
  };
  const rawCandidateId = isStreamingAiLive
    ? liveAiTranslationDraft
    : lastAiTurn
    ? lastAiTurn.translationId || ''
    : defaultOpeningTransId;
  const rawSubtitleSourceId = hasRealLettersForMeaning(rawCandidateId) ? rawCandidateId : '';
  const rawCandidateTh = isStreamingAiLive
    ? (locale === 'th' ? liveAiTranslationDraft : '')
    : lastAiTurn
    ? lastAiTurn.translationTh || ''
    : defaultOpeningTransTh;
  const rawSubtitleSourceTh = hasRealLettersForMeaning(rawCandidateTh) ? rawCandidateTh : '';
  const computedAiSubtitle = translateAndPhoneticizeLiveText(
    activeAiLiveText,
    activeScenario.targetLang,
    rawSubtitleSourceId || undefined,
    rawSubtitleSourceTh || undefined
  );
  const activeAiSubtitle = {
    ...computedAiSubtitle,
    translationId:
      rawSubtitleSourceId ||
      computedAiSubtitle.translationId ||
      (!isStreamingAiLive && !lastAiTurn ? defaultOpeningTransId : '') ||
      '',
    translationTh:
      rawSubtitleSourceTh ||
      computedAiSubtitle.translationTh ||
      (!isStreamingAiLive && !lastAiTurn ? defaultOpeningTransTh : '') ||
      '',
  };

  const resolvedActiveAiMeaning = (() => {
    try {
      const loadingTranslationText =
        locale === 'th'
          ? 'กำลังแปล...'
          : locale === 'ja'
          ? '翻訳中...'
          : locale === 'zh'
          ? '正在翻译...'
          : 'Sedang memuat terjemahan...';

      // Mandat User: Selama AI sedang bicara atau memuat, jangan tampilkan
      // tebakan terjemahan berubah-ubah atau titik/koma Morse (, ! , :). Tampilkan "Sedang memuat terjemahan...".
      if (isStreamingAiLive || isPlayingAiAudio || isAiThinking) {
        return loadingTranslationText;
      }
      let rawMeaning = '';
      if (locale === 'th') {
        rawMeaning = activeAiSubtitle.translationTh || activeAiSubtitle.translationId || '';
      } else if (locale === 'ja') {
        rawMeaning =
          activeAiSubtitle.translationJa ||
          (activeScenario.targetLang === 'ja' ? '' : activeAiSubtitle.translationId || '');
      } else if (locale === 'zh') {
        rawMeaning =
          activeAiSubtitle.translationZh ||
          (activeScenario.targetLang === 'zh' ? '' : activeAiSubtitle.translationId || '');
      } else {
        rawMeaning = activeAiSubtitle.translationId || activeAiSubtitle.translationTh || '';
      }
      if (/^[\s,.:;!?"'“”‘’()（）\-—]+$/.test(rawMeaning)) {
        return loadingTranslationText;
      }
      if (rawMeaning && locale !== 'zh' && locale !== 'ja' && /[\u4E00-\u9FFF\u3040-\u30FF]/.test(rawMeaning)) {
        const cjkCount = (rawMeaning.match(/[\u4E00-\u9FFF\u3040-\u30FF]/g) || []).length;
        const latinWords = (rawMeaning.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) || []).length;
        if (latinWords === 0 && cjkCount > 0) {
          // Untranslated CJK string: do not masquerade as Indonesian/Thai translation
          return loadingTranslationText;
        }
        rawMeaning = rawMeaning.replace(/[\u4E00-\u9FFF\u3040-\u30FF]+/g, (cjkMatch) => {
          const phonetic =
            activeScenario.targetLang === 'zh'
              ? toPhoneticPinyin(cjkMatch)
              : toPhoneticRomaji(cjkMatch);
          return phonetic && phonetic !== cjkMatch ? phonetic : cjkMatch;
        });
      }
      if (!rawMeaning || !hasRealLettersForMeaning(rawMeaning) || isGenericPlaceholderTranslation(rawMeaning)) {
        return loadingTranslationText;
      }
      return rawMeaning.trim();
    } catch {
      return '';
    }
  })();

  const isAiHudDuplicateMeaning = (() => {
    const normMeaning = (resolvedActiveAiMeaning || '').replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
    const normSpeech = (activeAiLiveText || '').replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
    if (normMeaning && normMeaning === normSpeech) return true;
    // Also guard if AI accidentally spoke in Indonesian while target course is zh/ja
    const cjkChars = (activeAiLiveText.match(/[\u4E00-\u9FFF\u3040-\u30FF]/g) || []).length;
    const latinWords = (activeAiLiveText.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) || []).length;
    if (
      (activeScenario.targetLang === 'zh' || activeScenario.targetLang === 'ja') &&
      latinWords >= 4 &&
      latinWords > cjkChars * 2
    ) {
      return true;
    }
    return false;
  })();

  const activeUserLiveText = liveUserDraft.trim() || lastUserTurn?.text || '';
  const activeUserSubtitle = activeUserLiveText
    ? translateAndPhoneticizeLiveText(activeUserLiveText, activeScenario.targetLang)
    : null;

  const handleRefreshLiveAssist = async () => {
    playFiezelSfx('button_tap');
    copilotVariationSeedRef.current += 1;
    setIsRefreshingAssist(true);
    try {
      await triggerRealtimeCopilotForAi(
        activeAiLiveText,
        lastUserTurn?.text || '',
        turns.map((tr) => ({ speaker: tr.speaker, text: tr.text })),
        {
          forceVariation: true,
          excludeTexts: copilotCards.map((c) => c.text),
        }
      );
    } finally {
      setIsRefreshingAssist(false);
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#F6F3EC] text-[#1C1611] flex flex-col">
      {/* TOP BAR RINGKAS & BERSIH (h-11 / 44px - FaceTime & Duolingo Max Style) */}
      <header className="shrink-0 sticky top-0 z-20 bg-[#F6F3EC]/95 backdrop-blur-md border-b border-[#E8DFC8]/60 pt-[env(safe-area-inset-top,0.25rem)]">
        <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 h-11 flex items-center justify-between gap-2">
          {/* SISI KIRI: Tombol Kembali & Persona Active */}
          <div className="flex items-center gap-2 min-w-0">
            <a
              href="./index.html"
              onClick={handleBackToPwa}
              data-testid="mitra-kaiwa-back-btn"
              className="px-2.5 py-1 rounded-full bg-white/90 hover:bg-white shadow-[0_1px_2px_rgba(28,22,17,0.05)] font-semibold text-[#1C1611] cursor-pointer flex items-center gap-1 transition-all text-xs shrink-0"
              title="Kembali"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{locale === 'th' ? 'กลับ' : 'Kembali'}</span>
            </a>

            <span
              data-testid="mitra-kaiwa-header-title"
              className="sr-only"
            >
              {targetLang === 'ja' ? 'Mitra Kaiwa' : 'Kawan Bicara'}
            </span>

            <button
              type="button"
              data-testid="persona-picker-trigger"
              onClick={() => {
                playFiezelSfx('button_tap');
                setShowPersonaModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF5EB] hover:bg-[#F3ECE0] border border-[#E8DEC8] text-[#5C4E3C] text-[11px] font-bold shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
              title={locale === 'th' ? 'เปลี่ยนติวเตอร์และสไตล์เสียง' : 'Ganti Karakter & Gaya Bicara Partner'}
            >
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <span className="max-w-[85px] xs:max-w-[120px] sm:max-w-[160px] truncate">
                {formatPersonaShortName(activePersona.name)}
              </span>
              <svg className="w-3 h-3 text-[#8C7A65]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* TENGAH: Segmented Switcher FaceTime (Panggung) vs Riwayat Chat */}
          {activeTab === 'call' && (
            <div
              data-testid="call-view-mode-toggle"
              className="inline-flex items-center p-0.5 rounded-full bg-[#EFE8DA] text-[11px] font-semibold shadow-2xs shrink-0"
            >
              <button
                type="button"
                onClick={() => {
                  playFiezelSfx('button_tap');
                  setCallViewMode('stage');
                }}
                className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                  callViewMode === 'stage'
                    ? 'bg-white text-[#1C1611] shadow-2xs font-bold'
                    : 'text-[#6E5E47] hover:text-[#1C1611]'
                }`}
              >
                <Video className="w-3 h-3 text-[#8C2233]" />
                <span>FaceTime</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playFiezelSfx('button_tap');
                  setCallViewMode('history');
                }}
                className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                  callViewMode === 'history'
                    ? 'bg-white text-[#1C1611] shadow-2xs font-bold'
                    : 'text-[#6E5E47] hover:text-[#1C1611]'
                }`}
              >
                <MessageSquare className="w-3 h-3 text-[#5C4E3C]" />
                <span>{locale === 'th' ? 'แชท' : 'Riwayat'}</span>
                {turns.filter((tr) => tr.speaker === 'user').length > 0 && (
                  <span className="w-3.5 h-3.5 rounded-full bg-[#8C2233] text-white text-[9px] flex items-center justify-center font-bold">
                    {turns.filter((tr) => tr.speaker === 'user').length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* SISI KANAN: Papan Belajar Quick Action, EN/JA/ZH Pill, BKT % */}
          <div className="flex items-center gap-1.5 text-xs shrink-0">
            {!isMeasureMode && activeTab === 'call' && (
              <button
                type="button"
                data-testid="open-workbench-pill-btn"
                onClick={() => {
                  playFiezelSfx('button_tap');
                  const focusQuery =
                    lastUserTurn?.text?.trim() ||
                    activeScenario.targetPatterns?.[0] ||
                    activeScenario.competencyNameId ||
                    'Perbedaan kata kerja dan pola kalimat percakapan';
                  const reqSeq = ++workbenchSessionRef.current.turnSeq;
                  workbenchSessionRef.current.dismissedByUser = false;
                  setIsAnalyzingTurn(true);
                  openLearningWorkbenchWithAction(
                    {
                      actionType: 'open_learning_popup',
                      topicTitle: focusQuery,
                    },
                    focusQuery
                  );
                  void (async () => {
                    try {
                      for (const base of resolveVoiceApiCandidateBases()) {
                        const res = await fetch(`${base}/api/voice/partner-turn`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            text: `[WHITEBOARD_REQUEST] Jelaskan aturan tata bahasa dan contoh untuk: ${focusQuery}`,
                            forcePopup: true,
                            personaId: activePersona.id,
                            personaName: activePersona.name,
                            scenarioId: activeScenario.id,
                            scenarioTitle: activeScenario.titleId,
                            targetLang: activeScenario.targetLang,
                            locale,
                            callMode: 'tutor_coach',
                            history: turnsRef.current
                              .slice(-4)
                              .map((t) => ({ speaker: t.speaker, text: t.text })),
                          }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          if (
                            reqSeq === workbenchSessionRef.current.turnSeq &&
                            !workbenchSessionRef.current.dismissedByUser &&
                            data?.uiAction?.actionType === 'open_learning_popup'
                          ) {
                            openLearningWorkbenchWithAction(data.uiAction, focusQuery);
                          }
                          break;
                        }
                      }
                    } catch {
                      // Fallback gracefully
                    } finally {
                      if (reqSeq === workbenchSessionRef.current.turnSeq) {
                        setIsAnalyzingTurn(false);
                      }
                    }
                  })();
                }}
                className="fz-wb-press px-2.5 py-1 rounded-full bg-[#FFF3C4] hover:bg-[#FFE896] border border-[#E6CE7A] text-[#241A11] text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-all"
                title="Buka Papan Tulis Interaktif (Bank Materi Braincore + Bedah Kilat Fiezel)"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#8C6D1F] shrink-0" />
                <span className="hidden sm:inline">{locale === 'th' ? 'กระดานติวเตอร์' : 'Papan Tulis'}</span>
              </button>
            )}

            <div className="flex items-center bg-white/90 rounded-full p-0.5 shadow-[0_1px_2px_rgba(28,22,17,0.05)]">
              <button
                type="button"
                data-testid="target-lang-en"
                onClick={() => handleSelectTargetLang('en')}
                className={`px-2 py-0.5 rounded-full font-bold text-[11px] cursor-pointer transition-all ${
                  targetLang === 'en'
                    ? 'bg-[#1C1611] text-white'
                    : 'text-[#6E5E47] hover:text-[#1C1611]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                data-testid="target-lang-ja"
                onClick={() => handleSelectTargetLang('ja')}
                className={`px-2 py-0.5 rounded-full font-bold text-[11px] cursor-pointer transition-all ${
                  targetLang === 'ja'
                    ? 'bg-[#1C1611] text-white'
                    : 'text-[#6E5E47] hover:text-[#1C1611]'
                }`}
              >
                JA
              </button>
              <button
                type="button"
                data-testid="target-lang-zh"
                onClick={() => handleSelectTargetLang('zh')}
                className={`px-2 py-0.5 rounded-full font-bold text-[11px] cursor-pointer transition-all ${
                  targetLang === 'zh'
                    ? 'bg-[#BE123C] text-white'
                    : 'text-[#6E5E47] hover:text-[#1C1611]'
                }`}
              >
                ZH
              </button>
            </div>

            <button
              type="button"
              data-testid="btn-open-braincore"
              onClick={() => handleTabChange('braincore')}
              title="Analitik Braincore"
              className="hidden xs:inline-flex px-2 py-0.5 rounded-full bg-white/90 hover:bg-white shadow-[0_1px_2px_rgba(28,22,17,0.05)] text-[#5C4E3C] font-mono text-[11px] font-semibold tabular-nums cursor-pointer transition-all"
            >
              {Math.round(currentMasteryP * 100)}%
            </button>
          </div>
        </div>
      </header>

      {/* STATUS BANNER GLOBAL */}
      {statusBanner && (
        <div className="shrink-0 max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 pt-1 w-full">
          <div className="rounded-2xl px-4 py-2 text-xs font-medium flex items-center justify-between gap-2 bg-white/90 shadow-2xs text-[#5C4E3C]">
            <span>{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-[#6E5E47] hover:text-[#1C1611] cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* RUANG KERJA UTAMA VOICE-FIRST */}
      <main ref={mainScrollRef} className="flex-1 min-h-0 max-w-4xl mx-auto px-4 sm:px-6 lg:max-w-6xl xl:max-w-7xl py-2 space-y-3 w-full overflow-y-auto overscroll-contain flex flex-col">
        {activeTab === 'home' ? (
          <HomeRedesignView
            locale={locale}
            targetLang={targetLang}
            braincore={brainState}
            scenariosForLang={scenariosForLang}
            activeScenario={activeScenario}
            currentMasteryP={currentMasteryP}
            onSelectScenarioAndCall={(scenId) => {
              stopLiveCall();
              setActiveScenarioId(scenId);
              handleTabChange('call');
            }}
            onOpenBraincore={() => handleTabChange('braincore')}
            onUnlockScenarioPrereq={(scen) => {
              const nextState = recordVocabPrereqMastery(brainState, scen.prereqCompetencyId);
              setBrainState(nextState);
              playFiezelSfx('lesson_start');
              setStatusBanner(
                locale === 'th'
                  ? 'ปลดล็อกคำศัพท์พื้นฐานเรียบร้อยแล้ว!'
                  : 'Kosakata prasyarat berhasil dikuasai!'
              );
              void brainSyncFlush(nextState).then(({ nextState: synced }) => setBrainState(synced));
            }}
            onSpeakSample={(sampleText) => {
              void speakAiText(sampleText, null, undefined, { isManualReplay: true });
            }}
          />
        ) : activeTab === 'call' ? (
          <>
            {/* Gerbang Prasyarat Kosakata (Jika BKT < 60%) */}
            {!prereqStatus.isReady ? (
              <section className="bg-white rounded-3xl p-5 shadow-[0_2px_16px_rgba(28,22,17,0.04)] space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#1C1611]">
                  <Lock className="w-4 h-4 text-[#8C2233]" />
                  <span>{t(locale, 'prereq.lockedTitle')}</span>
                </div>
                <p className="text-xs text-[#6E5E47]">
                  {t(locale, 'prereq.lockedDesc')} (BKT {Math.round(prereqStatus.pMastery * 100)}%)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {activeScenario.vocabPrereqs.map((v) => (
                    <div
                      key={v.id}
                      className="bg-[#F6F3EC] rounded-2xl p-3 text-xs"
                    >
                      <div className="font-bold text-[#1C1611]">{v.term}</div>
                      <div className="text-[#6E5E47] mt-0.5">
                        {locale === 'th' ? v.meaningTh : v.meaningId}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleUnlockPrerequisite}
                  className="w-full py-2.5 rounded-full bg-[#1C1611] text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  {t(locale, 'prereq.completeBtn')}
                </button>
              </section>
            ) : (
              <div className="w-full flex-1 flex flex-col space-y-3">
                {/* KOLOM FACETIME (40-60 Split: 40% Video Stage Mochi | 60% Interactive Learning Surface) */}
                <div className={`w-full max-w-xl lg:max-w-4xl mx-auto flex flex-col lg:grid lg:grid-cols-12 lg:items-stretch gap-3.5 ${callViewMode === 'stage' ? 'flex' : 'hidden'}`}>
                  {/* 1. ZONA 40%: FaceTime Video Stage Mochi */}
                  <section
                    data-testid="ai-call-card"
                    data-call-state={callStateKey}
                    data-transport-mode={liveTransportMode}
                    className="lg:col-span-5 bg-gradient-to-b from-[#FAF5EB]/95 to-white/95 rounded-3xl p-3.5 sm:p-4 shadow-[0_4px_24px_rgba(28,22,17,0.04)] border border-[#EADBCE]/80 flex flex-col justify-between items-center w-full min-h-[260px] sm:min-h-[290px]"
                  >
                    {/* Meta Bar Atas: Coach & Scenario Level & Mode Badges */}
                    <div className="w-full flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-[#6E5E47] min-w-0">
                        <button
                          type="button"
                          data-testid="persona-card-trigger"
                          onClick={() => {
                            playFiezelSfx('button_tap');
                            setShowPersonaModal(true);
                          }}
                          className="inline-flex items-center gap-1 font-bold text-[#1C1611] hover:text-[#5C4E3C] bg-white/90 hover:bg-white px-2 py-0.5 rounded-full border border-black/5 transition-all cursor-pointer active:scale-95 text-[11px]"
                          title={locale === 'th' ? 'เปลี่ยนติวเตอร์และสไตล์เสียง' : 'Ganti Karakter & Gaya Bicara Partner'}
                        >
                          <span>{formatPersonaShortName(activePersona.name)}</span>
                          <span className="text-[10px] text-[#8C7A65]">▾</span>
                        </button>
                        <span className="shrink-0">·</span>
                        <span className="shrink-0 text-[11px] font-medium text-[#5C4E3C]">
                          {formatCleanLevel(activeScenario.level)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          data-testid="exam-mode-toggle-btn"
                          onClick={() => setCustomMeasureOverride(!isMeasureMode)}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
                            isMeasureMode
                              ? 'bg-[#FDF2F4] text-[#8C2233]'
                              : 'bg-[#F5F1E8] text-[#5C4E3C] hover:text-[#1C1611]'
                          }`}
                        >
                          {isMeasureMode ? 'Mode Ujian' : 'Latihan'}
                        </button>

                        {!isMeasureMode && (
                          <button
                            type="button"
                            data-testid="call-mode-toggle-btn"
                            onClick={() => {
                              const nextMode: CallMode =
                                callMode === 'tutor_coach' ? 'casual_chat' : 'tutor_coach';
                              callModeRef.current = nextMode;
                              setCallMode(nextMode);
                              playFiezelSfx('button_tap');
                            }}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer border ${
                              callMode === 'casual_chat'
                                ? 'bg-[#E8F8F0] border-[#96D8B6] text-[#14472D]'
                                : 'bg-[#F5EFE4] border-[#DFD4BF] text-[#3B2F23]'
                            }`}
                          >
                            <span>{callMode === 'casual_chat' ? '☕ Kasual' : '🎓 Mentor'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* HERO CENTER STAGE: 3D Volumetric Mochi Mascot */}
                    <div className="flex flex-col items-center justify-center w-full py-0.5">
                      <div
                        onClick={() => {
                          if (isPlayingAiAudio) {
                            interruptAiAndStartListening();
                            return;
                          }
                          const m = mochiInstanceRef.current;
                          if (m) {
                            try {
                              m.setVoiceCompanionStrictMode?.(true);
                              m.setMood?.('dots');
                              m.triggerHandGesture?.('wave', 1.8);
                            } catch {}
                          }
                        }}
                        title={isPlayingAiAudio ? 'Ketuk untuk menyela Mochi' : 'Mochi (Mitra Kaiwa 3D)'}
                        className="relative w-[150px] sm:w-[200px] h-[130px] sm:h-[175px] flex items-center justify-center cursor-pointer select-none"
                      >
                        <div
                          ref={mochiContainerRef}
                          data-testid="mochi-3d-stage"
                          className="w-[150px] sm:w-[200px] h-[130px] sm:h-[175px] flex items-center justify-center relative"
                        />
                        {!is3dMochiReady && !mochi3dFailed && (
                          <div
                            aria-hidden="true"
                            className="absolute pointer-events-none w-20 sm:w-28 h-20 sm:h-28 rounded-full bg-gradient-to-br from-[#EEDFCC]/60 to-[#DFCEB7]/50 animate-pulse shadow-inner flex items-center justify-center"
                          />
                        )}
                        {mochi3dFailed && (
                          <img
                            src={
                              isPlayingAiAudio
                                ? './assets/brand/paw-mochi-speaking.svg'
                                : './assets/brand/paw-mochi-idle.svg'
                            }
                            onError={(e) => {
                              const fallback = isPlayingAiAudio
                                ? './assets/brand/paw-mochi-speaking.svg'
                                : './assets/brand/paw-mochi-idle.svg';
                              if (e.currentTarget.getAttribute('src') !== fallback) {
                                e.currentTarget.setAttribute('src', fallback);
                              }
                            }}
                            alt="Mochi Fallback"
                            className="absolute pointer-events-none w-20 sm:w-28 h-20 sm:h-28 rounded-full object-contain p-1"
                          />
                        )}
                      </div>

                      {/* STATUS & SAKLAR TELEPON FACETIME (Call Switch & Mic Activator) */}
                      <div className="w-full flex flex-col items-center justify-center gap-2 mt-1">
                        {/* Status Kehadiran Partner */}
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <div
                            key={callStateKey}
                            data-testid="ai-call-status-pill"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F1E8] text-[11px] font-medium text-[#5C4E3C] shadow-2xs"
                          >
                            <span
                              aria-hidden="true"
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                callStateKey === 'recording'
                                  ? 'bg-[#8C2233] animate-ping'
                                  : callStateKey === 'speaking'
                                    ? 'bg-[#E6A800] animate-pulse'
                                    : callStateKey === 'waiting'
                                      ? 'bg-[#2979FF] animate-pulse'
                                      : callStateKey === 'live'
                                        ? 'bg-[#2E8B69] animate-pulse'
                                        : 'bg-[#2E8B69]'
                              }`}
                            />
                            <span data-testid="ai-call-status-text">
                              {isAiThinking && !isPlayingAiAudio
                                ? locale === 'th'
                                  ? 'Mochi กำลังคิด…'
                                  : 'Mochi sedang berpikir…'
                                : isPlayingAiAudio
                                ? isLiveConnected
                                  ? `Mochi berbicara... (${formatTimer(callDurationSec)})`
                                  : 'Sedang berbicara...'
                                : isWaitingAfterSpeech
                                ? locale === 'th'
                                  ? `Mochi กำลังฟัง… (ช่วงคิด) (${formatTimer(callDurationSec)})`
                                  : `Mochi mendengarkan... (jeda berpikir) (${formatTimer(callDurationSec)})`
                                : isRecordingPtt
                                  ? `Merekam suara... (${formatTimer(pttRecordingSec)})`
                                  : isLiveConnected
                                    ? isMicMuted
                                      ? `Mic dibisukan · ${formatTimer(callDurationSec)}`
                                      : `LIVE · ${formatTimer(callDurationSec)}`
                                    : 'Siap bicara'}
                            </span>
                          </div>

                          {isLiveConnected && (
                            <div
                              data-testid="ai-call-gem-meter-pill"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FEFCE8] border border-[#FDE68A] text-[11px] font-bold text-[#78350F] shadow-2xs"
                            >
                              {isLocalTestEnvironment() ? (
                                <span>🧪 Bebas Gem</span>
                              ) : liveBillingUi.isDailyFree && liveBillingUi.gemsSpent === 0 ? (
                                <span>🎁 Gratis ({liveBillingUi.turns}/{DAILY_FREE_CALL_MAX_TURNS})</span>
                              ) : (
                                <span>💎 {liveBillingUi.gemsSpent} Gem ({liveBillingUi.turns})</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* SAKLAR UTAMA TELEPON FACETIME (Call Switch: Mulai Obrolan & Aktifkan Mic Hands-Free) */}
                        {!isLiveConnected ? (
                          <div className="w-full flex flex-col items-center justify-center gap-1">
                            <button
                              type="button"
                              data-testid="facetime-call-switch-btn"
                              disabled={isLiveConnecting}
                              onClick={() => requestStartLiveCall()}
                              className="w-full xs:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all cursor-pointer active:scale-95 disabled:opacity-60 group"
                              title="Nyalakan panggilan suara FaceTime (Hands-free, mic aktif otomatis)"
                            >
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                              </span>
                              <Phone className="w-4 h-4 text-white group-hover:rotate-12 transition-transform shrink-0" />
                              <span>{isLiveConnecting ? 'Menyambungkan FaceTime...' : 'Mulai Telepon FaceTime'}</span>
                            </button>
                            <span className="text-[11px] text-[#8C7A65] font-medium flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>Hands-Free · Mikrofon aktif dua arah untuk ngobrol langsung</span>
                            </span>
                          </div>
                        ) : (
                          <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="relative flex h-2.5 w-2.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                              </span>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 truncate">
                                <Mic className={`w-3.5 h-3.5 shrink-0 ${isMicMuted ? 'text-[#8C2233]' : 'text-emerald-700 animate-pulse'}`} />
                                <span className="truncate">
                                  {isMicMuted
                                    ? 'Mic Mati'
                                    : isUserSpeakingLive
                                    ? 'Kamu Bicara...'
                                    : isPlayingAiAudio
                                    ? 'Mochi Berbicara...'
                                    : 'Mic Aktif (Bicara Langsung)'}
                                </span>
                                <span className="font-mono text-emerald-700 text-[11px] font-semibold shrink-0">
                                  ({formatTimer(callDurationSec)})
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={toggleMuteMic}
                                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                                  isMicMuted ? 'bg-[#8C2233] text-white' : 'bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}
                                title={isMicMuted ? 'Aktifkan Mic' : 'Bisukan Mic'}
                              >
                                {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                              playFiezelSfx('button_tap');
                              stopLiveCall();
                              setLiveUserDraft('');
                              setLiveAiDraft('');
                            }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#B8432D] hover:bg-[#9E3622] text-white text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95"
                                title="Akhiri Telepon FaceTime"
                              >
                                <PhoneOff className="w-3.5 h-3.5" />
                                <span>Tutup</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* 2. ZONA 60%: Interactive Learning Surface (Subtitles & Learning Controls) */}
                  <div className="lg:col-span-7 flex flex-col justify-between gap-3 w-full h-full">
                    {/* SUBTITLE MELAYANG HALUS (Floating Subtitles Glass HUD) */}
                    <div
                      data-testid="live-translation-hud"
                      className="w-full text-left rounded-3xl bg-white/95 backdrop-blur-md border border-[#EDE5D4] p-4 sm:p-5 shadow-sm space-y-3 flex flex-col justify-between h-full"
                    >
                      {isAiThinking ? (
                        <div
                          data-testid="live-hud-ai-thinking"
                          aria-live="polite"
                          className="flex items-center gap-2 py-1"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#8C2233] animate-pulse [animation-delay:-0.3s]" />
                          <span className="w-2 h-2 rounded-full bg-[#8C2233] animate-pulse [animation-delay:-0.15s]" />
                          <span className="w-2 h-2 rounded-full bg-[#8C2233] animate-pulse" />
                          <span className="text-xs font-medium text-[#6E5E47]">
                            {locale === 'th' ? 'กำลังตอบกลับ...' : 'Menyiapkan balasan...'}
                          </span>
                        </div>
                      ) : (
                        <>
                          {/* ATAS: Subtitle Bahasa Kursus (Bold & Furigana/Pinyin) */}
                          <div
                            data-testid="live-hud-ai-text"
                            data-reply-source={liveAiDraft.trim() ? 'live' : lastAiTurn?.replySource || 'script'}
                          >
                            <JapaneseRubyDisplay
                              text={activeAiLiveText}
                              targetLang={activeScenario.targetLang}
                              showFurigana={!isMeasureMode}
                              showRomaji={!isMeasureMode}
                              className="text-[17px] sm:text-[19px] font-bold text-[#1C1611] tracking-[-0.01em] leading-snug break-words"
                              rubyClassName="text-[17px] sm:text-[19px]"
                              romajiClassName="text-xs sm:text-[13px] text-[#8C6D1F] font-medium mt-0.5"
                            />
                          </div>

                          {/* BAWAH: Terjemahan Bahasa Indonesia / Thai */}
                          {!isMeasureMode && showTranslations && resolvedActiveAiMeaning && !isAiHudDuplicateMeaning && (
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#EDE5D4]/60">
                              <p
                                data-testid="live-hud-ai-translation"
                                className="text-xs sm:text-[13.5px] font-normal text-[#5C4E3C] leading-relaxed break-words"
                              >
                                {resolvedActiveAiMeaning}
                              </p>
                              <button
                                type="button"
                                onClick={() => setShowTranslations(false)}
                                className="text-[11px] text-[#8C6D1F] hover:text-[#1C1611] shrink-0 font-medium cursor-pointer"
                                title="Sembunyikan terjemahan"
                              >
                                👁️ Sembunyikan
                              </button>
                            </div>
                          )}
                          {!isMeasureMode && !showTranslations && (
                            <div className="pt-0.5">
                              <button
                                type="button"
                                onClick={() => setShowTranslations(true)}
                                className="text-[11px] text-[#8C6D1F] hover:text-[#1C1611] font-medium cursor-pointer"
                                title="Tampilkan terjemahan"
                              >
                                👁️ Tampilkan Arti
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {/* IN-CARD DYNAMIC CONTROLS: Replay Suara & Dynamic Speed Skalar */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EDE5D4]/60 mt-auto">
                        <button
                          type="button"
                          data-testid="btn-replay-ai-audio"
                          onClick={() => {
                            const lastAi = [...turns].reverse().find((tr) => tr.speaker === 'ai');
                            if (lastAi) void speakAiText(lastAi.text, lastAi.audioBase64, speechRate, { isManualReplay: true });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EB] hover:bg-[#F3ECE0] border border-[#E8DEC8] text-xs font-semibold text-[#1C1611] transition-all cursor-pointer active:scale-95"
                          title="Putar suara dengan kecepatan saat ini"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-[#5C4E3C] shrink-0" />
                          <span>{callStateKey === 'speaking' ? 'Diputar...' : 'Putar Suara'}</span>
                        </button>

                        {/* SKALAR DINAMIS: 0.85x | 0.92x | 1.0x */}
                        <div
                          data-testid="speech-rate-skalar"
                          className="inline-flex items-center p-0.5 rounded-full bg-[#F5F1E8] border border-[#E8DEC8] text-[11px] font-semibold"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              playFiezelSfx('button_tap');
                              setSpeechRate(0.85);
                            }}
                            className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                              speechRate <= 0.86
                                ? 'bg-white text-[#1C1611] shadow-2xs font-bold'
                                : 'text-[#8C7A65] hover:text-[#1C1611]'
                            }`}
                            title="0.85x - Santai & Jelas"
                          >
                            🐢 0.85x
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playFiezelSfx('button_tap');
                              setSpeechRate(0.92);
                            }}
                            className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                              speechRate > 0.86 && speechRate <= 0.95
                                ? 'bg-white text-[#1C1611] shadow-2xs font-bold'
                                : 'text-[#8C7A65] hover:text-[#1C1611]'
                            }`}
                            title="0.92x - Alami & Pas"
                          >
                            ✨ 0.92x
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playFiezelSfx('button_tap');
                              setSpeechRate(1.0);
                            }}
                            className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                              speechRate > 0.95
                                ? 'bg-white text-[#1C1611] shadow-2xs font-bold'
                                : 'text-[#8C7A65] hover:text-[#1C1611]'
                            }`}
                            title="1.0x - Normal Native"
                          >
                            ⚡ 1.0x
                          </button>
                        </div>
                      </div>

                      {activeUserSubtitle && (
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 max-w-full px-2.5 py-0.5 rounded-full bg-[#F5F1E8] text-[11px] text-[#5C4E3C] truncate">
                            <strong className="font-semibold text-[#1C1611] shrink-0">Kamu:</strong>
                            <span className="truncate">{activeUserSubtitle.text}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* KOLOM RIWAYAT: Khusus Chat History & Feedback Transkrip */}
                <div className={`w-full max-w-2xl mx-auto flex flex-col gap-3 ${callViewMode === 'history' ? 'flex' : 'hidden'}`}>
                  <section className="space-y-2.5 w-full pt-1">
                    <div className="flex items-center justify-between gap-2 px-1 text-xs text-[#6E5E47] pb-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C1611] uppercase tracking-wider">
                        <MessageSquare className="w-3.5 h-3.5 text-[#8C2233]" />
                        <span>{locale === 'th' ? 'บันทึกการสนทนา' : 'Transkrip Percakapan'}</span>
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            playFiezelSfx('button_tap');
                            setCallViewMode('stage');
                          }}
                          className="px-2.5 py-1 rounded-full bg-[#1C1611] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Video className="w-3 h-3" />
                          <span>Kembali ke FaceTime</span>
                        </button>
                        {!isMeasureMode && (
                          <button
                            type="button"
                            onClick={() => setShowTranslations(!showTranslations)}
                            className="font-medium text-[#6E5E47] hover:text-[#1C1611] cursor-pointer"
                          >
                            {showTranslations ? 'Sembunyikan Arti' : 'Tampilkan Arti'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleResetCallSession}
                          className="font-medium text-[#6E5E47] hover:text-[#1C1611] flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Ulangi</span>
                        </button>
                      </div>
                    </div>

                  <div
                    ref={transcriptContainerRef}
                    className="space-y-2 px-0.5"
                  >
                    {turns.length <= 1 && (
                      <div
                        data-testid="transcript-empty-placeholder"
                        className="rounded-2xl border border-dashed border-[#DFD4BF] bg-white/60 px-4 py-4 text-xs text-[#6E5E47] leading-relaxed"
                      >
                        <p className="font-semibold text-[#1C1611] mb-1">
                          {locale === 'th'
                            ? 'พร้อมเริ่มบทสนทนาแล้ว'
                            : 'Siap memulai percakapan'}
                        </p>
                        <p>
                          {locale === 'th'
                            ? 'พูดผ่านไมโครโฟน เลือกประโยคแนะนำด้านบน หรือพิมพ์ข้อความด้านล่าง บันทึกบทสนทนาและคำแนะนำไวยากรณ์จะแสดงที่นี่'
                            : 'Bicara lewat mikrofon, pilih salah satu saran kalimat di atas, atau ketik balasan di bawah. Riwayat obrolan dan umpan balik tata bahasa akan tampil di sini.'}
                        </p>
                      </div>
                    )}
                    {turns.map((turn, idx) => {
                      // Jangan duplikasi kalimat pembuka pertama jika murid belum membalas
                      if (idx === 0 && turns.length === 1 && turn.speaker === 'ai') {
                        return null;
                      }
                      if (turn.speaker === 'ai') {
                        return (
                          <div
                            key={turn.id}
                            className="bg-white/85 rounded-2xl rounded-tl-xs px-4 py-2.5 max-w-[90%] sm:max-w-[82%] shadow-[0_1px_3px_rgba(28,22,17,0.04)] break-words space-y-1.5"
                          >
                            {/* ATAS: Bahasa kursus (English, Japanese, Mandarin) - UTAMA & BOLD */}
                            <div className="flex items-start justify-between gap-2 pt-0.5">
                              <div className="min-w-0 flex-1">
                                <JapaneseRubyDisplay
                                  text={turn.text}
                                  targetLang={activeScenario.targetLang}
                                  showFurigana={!isMeasureMode}
                                  showRomaji={!isMeasureMode}
                                  className="text-[15px] sm:text-[16px] font-bold text-[#1C1611] leading-snug break-words"
                                  rubyClassName="text-[15px] sm:text-[16px] font-bold"
                                  romajiClassName="text-xs text-[#8C6D1F] font-medium mt-0.5"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => void speakAiText(turn.text, turn.audioBase64, 1.0, { isManualReplay: true })}
                                className="w-6 h-6 rounded-full bg-[#F5F1E8] hover:bg-[#EAE3D5] flex items-center justify-center text-[#5C4E3C] shrink-0 cursor-pointer mt-0.5"
                                title="Putar suara"
                              >
                                <Volume2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* BAWAH: Terjemahan bahasa user (Bahasa Indonesia / Jepang / Thai / dsb.) - SEKUNDER */}
                            {!isMeasureMode &&
                              showTranslations &&
                              (turn.translationId || turn.translationTh || turn.translationJa || turn.translationZh) && (
                                <p className="text-xs sm:text-[13px] text-[#5C4E3C] font-normal leading-relaxed break-words pt-1 border-t border-[#EDE5D4]/50">
                                  {locale === 'th'
                                    ? (turn.translationTh || turn.translationId)
                                    : locale === 'ja'
                                    ? (turn.translationJa || turn.translationId)
                                    : locale === 'zh'
                                    ? (turn.translationZh || turn.translationId)
                                    : (turn.translationId || turn.translationTh)}
                                </p>
                              )}
                          </div>
                        );
                      }

                      const diag = turn.diagnosis;
                      return (
                        <div key={turn.id} className="flex flex-col items-end space-y-1">
                          <div className="bg-[#1C1611] text-white rounded-2xl rounded-tr-xs px-4 py-2 max-w-[90%] sm:max-w-[82%] break-words">
                            <p
                              data-testid="user-exact-transcript"
                              className="sr-only"
                            >
                              {turn.text}
                            </p>
                            <JapaneseRubyDisplay
                              text={turn.text}
                              targetLang={activeScenario.targetLang}
                              showFurigana={!isMeasureMode}
                              showRomaji={!isMeasureMode}
                              className="text-sm font-medium text-white break-words"
                              rubyClassName="text-sm font-medium text-white"
                              romajiClassName="text-xs text-[#FFE082] font-medium mt-0.5"
                            />
                            {!isMeasureMode && showTranslations && (turn.translationId || turn.translationTh || turn.translationJa || turn.translationZh) && (
                              <p className="text-xs text-[#FFE082]/90 mt-1 pt-1 border-t border-white/10 break-words italic">
                                {locale === 'th'
                                  ? (turn.translationTh || turn.translationId)
                                  : locale === 'ja'
                                  ? (turn.translationJa || turn.translationId)
                                  : locale === 'zh'
                                  ? (turn.translationZh || turn.translationId)
                                  : (turn.translationId || turn.translationTh)}
                              </p>
                            )}
                          </div>

                          {diag && (
                            <div
                              data-testid="turn-diagnosis-card"
                              data-ok={diag.ok ? 'true' : 'false'}
                              className={`rounded-2xl px-3.5 py-2 text-xs max-w-[90%] sm:max-w-[82%] break-words space-y-1 ${
                                diag.ok
                                  ? 'bg-[#E9F7F0] text-[#1C1611]'
                                  : 'bg-[#FDE3DE] text-[#1C1611]'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
                                <div className="flex items-center gap-1.5">
                                  {diag.ok ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#2E8B69]" />
                                  ) : (
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#B8432D]" />
                                  )}
                                  <span className={diag.ok ? 'text-[#2E8B69]' : 'text-[#B8432D]'}>
                                    {diag.ok ? 'Kalimat Tepat' : 'Perbaikan Kalimat'}
                                  </span>
                                </div>
                                <span className="font-mono tabular-nums text-[11px] text-[#6E5E47]">
                                  Grammar {diag.grammarScore}% · BKT {Math.round(diag.bktAfter * 100)}%
                                </span>
                              </div>

                              {(() => {
                                const correction = (diag.syntacticCorrection || diag.naturalReformulation || '').trim();
                                const isDifferent = Boolean(
                                  correction &&
                                  correction.toLowerCase().replace(/[^a-z0-9]/g, '') !== turn.text.toLowerCase().replace(/[^a-z0-9]/g, '')
                                );
                                if (!isDifferent && diag.ok) return null;
                                const displayCorrection = correction || diag.syntacticCorrection;
                                if (!displayCorrection) return null;
                                return (
                                  <div className="bg-white/90 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 text-[#1C1611]">
                                    <span className="break-words">
                                      <span className="font-semibold text-[#8C2233]">{locale === 'th' ? 'ประโยคที่เป็นธรรมชาติ:' : 'Naturalnya begini:'}</span>{' '}
                                      <b className="text-[#8C2233]">"{displayCorrection}"</b>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInputText(displayCorrection);
                                      }}
                                      className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#F5F1E8] text-[11px] font-semibold cursor-pointer"
                                    >
                                      Gunakan
                                    </button>
                                  </div>
                                );
                              })()}

                              {!diag.ok && (
                                <p className="text-[#5C4E3C] break-words leading-snug">
                                  {locale === 'th'
                                    ? diag.whyFailsTh || diag.pedagogicalFeedbackTh
                                    : diag.whyFailsId || diag.pedagogicalFeedbackId}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {isAnalyzingTurn && (
                      <div className="bg-white/85 rounded-2xl px-3.5 py-2 max-w-[70%] text-xs font-medium text-[#6E5E47] inline-flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#1C1611] animate-ping" />
                        <span>Menyiapkan balasan...</span>
                      </div>
                    )}
                  </div>
                </section>
                </div>
              </div>
            )}
          </>
        ) : (
          /* 5. TAMPILAN ANALITIK BRAINCORE & BUKU CATATAN MISKONSEPSI */
          <div className="space-y-5">
            <div className="fz-studio-card rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
              <FiezelCornerOrnament className="absolute -right-2 -top-2 w-24 h-24 opacity-70" />
              <div className="relative z-10">
                <span className="fz-badge-paw">
                  <FiezelPawStamp className="w-3 h-3 text-[#8C2233]" />
                  <span>OPEN LEARNER MODEL · BKT & IRT 3PL</span>
                </span>
                <h1 className="text-lg font-bold text-[#241A11] mt-1.5">{t(locale, 'olm.title')}</h1>
                <p className="text-xs text-[#6E5E47] mt-0.5">{t(locale, 'olm.subtitle')}</p>
              </div>
              <div className="relative z-10 flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  data-testid="btn-back-to-call"
                  onClick={() => handleTabChange('call')}
                  className="px-3.5 py-2.5 rounded-xl bg-[#FFF3DC] hover:bg-[#FFF3C4] border border-[#F0E4CF] text-[#241A11] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>← Kembali ke Panggilan</span>
                </button>
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={syncingNow}
                  className="px-4 py-2.5 rounded-xl btn-sun-tactile font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} />
                  <span>{t(locale, 'olm.synced')}</span>
                </button>
              </div>
            </div>

            <BraincoreTrendChart
              locale={locale}
              speakingHistory={brainState.speakingHistory || []}
              totalSpeakingSeconds={brainState.totalSpeakingSeconds || 0}
              liveCallSeconds={callDurationSec}
            />

            <div className="fz-studio-card rounded-3xl p-6 overflow-x-auto">
              <h2 className="text-sm font-bold text-[#241A11] mb-3 fz-solar-ribbon pl-3">
                Matriks Kompetensi Kurikulum Aktif
              </h2>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#F0E4CF] text-[#6E5E47]">
                    <th className="py-2.5 pr-3">Kompetensi</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">BKT P(L)</th>
                    <th className="py-2.5 pl-3">IRT θ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F7EFDF]">
                  {Object.values(brainState.competencies).map((c) => {
                    const p = c.pMasteryDecayed ?? c.pMastery;
                    return (
                      <tr key={c.competencyId}>
                        <td className="py-3 pr-3 font-mono font-bold text-[#241A11]">
                          {c.competencyId}
                        </td>
                        <td className="py-3 px-3 text-[#2E8B69] font-bold">
                          {tMasteryState(locale, c.state)}
                        </td>
                        <td className="py-3 px-3 font-mono tabular-nums font-bold text-[#8C2233]">
                          {Math.round(p * 100)}%
                        </td>
                        <td className="py-3 pl-3 font-mono tabular-nums text-[#6E5E47]">
                          {abilityThetaFromMastery(p)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="fz-studio-card rounded-3xl p-6 space-y-3">
              <h2 className="text-sm font-bold text-[#241A11] fz-solar-ribbon pl-3">
                {t(locale, 'olm.ledgerTitle')}
              </h2>
              {activeLedgerList.length === 0 ? (
                <p className="text-xs text-[#6E5E47]">{t(locale, 'olm.ledgerEmpty')}</p>
              ) : (
                <div className="space-y-2.5">
                  {activeLedgerList.map((item) => (
                    <div
                      key={`${item.competencyId}::${item.misconceptionId}`}
                      className="bg-[#FDE3DE] border border-[#B8432D]/30 rounded-2xl p-4 text-xs space-y-1"
                    >
                      <div className="flex justify-between font-bold text-[#8C2233]">
                        <code className="font-mono">{item.misconceptionId}</code>
                        <span>{item.frequency}x terdeteksi</span>
                      </div>
                      <p className="text-[#241A11] font-semibold">"{item.lastUtterance}"</p>
                      <p className="text-[#6E5E47]">{item.correctionPattern}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* FLOATING PILL COMPOSER DOCK (Gaya Voice App Modern, Permanen Fixed di Bawah) */}
      {activeTab === 'call' && prereqStatus.isReady && (
        <div
          data-testid="mitra-kaiwa-bottom-dock"
          className="shrink-0 w-full z-30 bg-[#F6F3EC]/95 backdrop-blur-md border-t border-[#E8DFC8]/70 px-3 sm:px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(28,22,17,0.04)]"
        >
          <div className="max-w-2xl lg:max-w-4xl mx-auto space-y-1.5">
            {/* COPILOT TELEPROMPTER DOCK: Menempel langsung di atas input bar - NO SCROLL NEEDED */}
            {!isMeasureMode && (
              <div data-testid="docked-copilot-container" className="w-full pb-1">
                <BeginnerAnswerAssistant
                  locale={locale}
                  targetLang={activeScenario.targetLang}
                  scenario={activeScenario}
                  aiQuestionText={activeAiLiveText}
                  aiQuestionTranslation={resolvedActiveAiMeaning}
                  lastUserText={lastUserTurn?.text || ''}
                  cards={copilotCards}
                  copilotSource={copilotSource}
                  isGeneratingCopilot={isGeneratingCopilot || isAiThinking}
                  isLiveConnected={isLiveConnected}
                  isRecordingPtt={isRecordingPtt}
                  isAnalyzingTurn={isAnalyzingTurn}
                  isPlayingAiAudio={isPlayingAiAudio}
                  isRefreshingAssist={isRefreshingAssist}
                  turnCount={turns.length}
                  onRefreshAssist={handleRefreshLiveAssist}
                  onSpeakSample={(sampleText, rate) => {
                    void speakAiText(sampleText, null, rate ?? 0.92, { isManualReplay: true });
                  }}
                  onSelectForInput={(selectedText) => {
                    playFiezelSfx('button_tap');
                    setInputText(selectedText);
                  }}
                  onSendDirect={(selectedText) => {
                    playFiezelSfx('button_tap');
                    const clean = selectedText.trim();
                    if (!clean || isAnalyzingTurn) return;
                    interruptAiAndStartListening();
                    setInputText('');
                    if (
                      isLiveConnected &&
                      wsRef.current &&
                      wsRef.current.readyState === WebSocket.OPEN
                    ) {
                      submitLiveUserUtterance(clean);
                    } else {
                      void submitStudentTurn({ text: clean, speakingDurationSec: 3 });
                    }
                  }}
                  onStartPttWithPrompt={(promptText) => {
                    playFiezelSfx('button_tap');
                    setInputText(promptText);
                    if (isRecordingPtt) {
                      stopPttRecording();
                    } else {
                      void startPttRecording();
                    }
                  }}
                />
              </div>
            )}
            {(isLiveConnected || isRecordingPtt || isListeningLiveSpeech || liveUserDraft.trim()) && (
              <div
                data-testid="live-voice-capture-banner"
                className="flex items-center justify-between gap-2 px-4 py-1.5 rounded-full bg-white shadow-sm text-xs text-[#1C1611]"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      liveUserDraft.trim()
                        ? 'bg-[#2E8B69] animate-ping'
                        : isPlayingAiAudio
                          ? 'bg-[#B8432D] animate-pulse'
                          : 'bg-[#2E8B69] animate-pulse'
                    }`}
                  />
                  <span className="font-medium truncate">
                    {liveUserDraft.trim()
                      ? isWaitingAfterSpeech
                        ? `"${liveUserDraft.trim()}" (jeda berpikir...)`
                        : `"${liveUserDraft.trim()}"`
                      : isPlayingAiAudio
                        ? locale === 'th'
                          ? 'ติวเตอร์กำลังพูด (พูดแทรกเพื่อขัดจังหวะได้)'
                          : 'Coach sedang bicara... (bicara langsung untuk menyela)'
                        : isLiveConnected
                          ? isMicMuted
                            ? locale === 'th'
                              ? 'ไมโครโฟนปิดอยู่: แตะไอคอนไมค์เพื่อเปิด'
                              : 'Mikrofon nonaktif: klik tombol mic untuk aktifkan'
                            : locale === 'th'
                              ? 'ไมโครโฟนแฮนด์ฟรีเปิดอยู่: พูดได้เลยไม่ต้องกดปุ่ม'
                              : 'Mikrofon handsfree aktif: bicara langsung tanpa tekan tombol'
                          : locale === 'th'
                            ? 'กำลังฟังเสียงของคุณ...'
                            : 'Mendengarkan... Silakan bicara'}
                  </span>
                </div>
                {liveUserDraft.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const textToSend = liveUserDraft.trim();
                      if (isRecordingPtt) stopPttRecording();
                      else if (textToSend) {
                        setLiveUserDraft('');
                        if (isLiveConnected) {
                          submitLiveUserUtterance(textToSend);
                        } else {
                          void submitStudentTurn({ text: textToSend, speakingDurationSec: 3 });
                        }
                      }
                    }}
                    className="px-3 py-0.5 rounded-full bg-[#1C1611] text-white font-semibold text-[11px] shrink-0 cursor-pointer"
                  >
                    Kirim
                  </button>
                )}
              </div>
            )}

            <div className="bg-white rounded-full shadow-[0_4px_20px_rgba(28,22,17,0.08)] border border-black/[0.05] p-1.5 flex items-center gap-1.5 w-full min-w-0">
              {isLiveConnected ? (
                <button
                  type="button"
                  data-testid="live-handsfree-indicator-btn"
                  onClick={() => {
                    if (isPlayingAiAudio) {
                      interruptAiAndStartListening();
                    }
                    toggleMuteMic();
                  }}
                  className={`px-3.5 py-2 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                    isMicMuted
                      ? 'bg-[#8C2233] text-white hover:bg-[#721B29]'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                  title={
                    isMicMuted
                      ? 'Mikrofon dibisukan. Klik untuk aktifkan suara.'
                      : 'Hands-free aktif. Klik untuk bisukan suara.'
                  }
                >
                  {isMicMuted ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 shrink-0 text-white" />
                      <span>{locale === 'th' ? 'ปิดไมค์' : 'Mic Mati'}</span>
                    </>
                  ) : (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <Mic className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{locale === 'th' ? 'แฮนด์ฟรี' : 'Hands-Free'}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="ptt-record-btn"
                  disabled={isAnalyzingTurn || isLiveConnecting}
                  onClick={() => {
                    if (isPlayingAiAudio) {
                      interruptAiAndStartListening();
                      return;
                    }
                    if (isRecordingPtt) {
                      stopPttRecording();
                      return;
                    }
                    // Connect directly to Hands-Free Gemini Live Duplex when quota/gems permit so user speaks naturally without clicking "Kirim"!
                    if (
                      !isLiveConnected &&
                      (isLocalTestEnvironment() || getDailyFreeCallAvailable() || getHostGemBalance() >= KAWAN_BICARA_MIN_START_GEMS)
                    ) {
                      void startLiveCall();
                      return;
                    }
                    void startPttRecording();
                  }}
                  className={`px-3.5 py-2 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                    isRecordingPtt
                      ? 'bg-[#8C2233] text-white'
                      : 'bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[#1C1611]'
                  }`}
                  title={isPlayingAiAudio ? 'Sela ucapan Partner & bicara' : t(locale, 'call.pushToTalk')}
                >
                  {isRecordingPtt ? (
                    <MicOff className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-[#5C4E3C] shrink-0" />
                  )}
                  <span>
                    {isRecordingPtt
                      ? `Stop (${pttRecordingSec}s)`
                      : locale === 'th'
                        ? 'พูด'
                        : 'Bicara'}
                  </span>
                </button>
              )}

              <input
                type="text"
                data-testid="voice-turn-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inputText.trim() && !isAnalyzingTurn) {
                    const textToSend = inputText.trim();
                    if (
                      isLiveConnected &&
                      wsRef.current &&
                      wsRef.current.readyState === WebSocket.OPEN
                    ) {
                      submitLiveUserUtterance(textToSend);
                      setInputText('');
                    } else {
                      void submitStudentTurn({ text: textToSend });
                    }
                  }
                }}
                placeholder={
                  locale === 'th' ? 'พิมพ์หรือพูด...' : 'Ketik atau bicara...'
                }
                className="min-w-0 flex-1 bg-transparent border-0 px-2.5 py-1.5 text-sm text-[#1C1611] placeholder:text-[#8C7E6A] focus:outline-none"
              />

              <button
                type="button"
                data-testid="send-turn-btn"
                disabled={isAnalyzingTurn || !inputText.trim()}
                onClick={() => {
                  const textToSend = inputText.trim();
                  if (
                    isLiveConnected &&
                    wsRef.current &&
                    wsRef.current.readyState === WebSocket.OPEN
                  ) {
                    submitLiveUserUtterance(textToSend);
                    setInputText('');
                  } else {
                    void submitStudentTurn({ text: textToSend });
                  }
                }}
                className="px-4 py-2 rounded-full bg-[#1C1611] hover:bg-[#332920] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all disabled:opacity-30"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>{isAnalyzingTurn ? '...' : locale === 'th' ? 'ส่ง' : 'Kirim'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVIGASI BAWAH MOBILE KHAS FIEZEL (Nonaktif pada mode tunggal Mitra Kaiwa) */}
      <nav
        aria-label="Navigasi utama"
        aria-hidden="true"
        style={{ display: 'none' }}
        className="hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFF9EE]/95 backdrop-blur-xl border-t border-[#F0E4CF] px-4 py-2 sm:hidden"
      >
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('home')}
            className={`min-h-[50px] rounded-2xl flex flex-col items-center justify-center gap-1 text-xs cursor-pointer transition-all ${
              activeTab === 'home'
                ? 'bg-[#FFF3C4] text-[#241A11] font-bold border border-[#E6A800]/40'
                : 'text-[#6E5E47] font-semibold'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>{locale === 'th' ? 'หน้าแรก' : 'Beranda'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('call')}
            className={`min-h-[50px] rounded-2xl flex flex-col items-center justify-center gap-1 text-xs cursor-pointer transition-all ${
              activeTab === 'call'
                ? 'bg-[#FFF3C4] text-[#241A11] font-bold border border-[#E6A800]/40'
                : 'text-[#6E5E47] font-semibold'
            }`}
          >
            <Phone className="w-5 h-5" />
            <span>{locale === 'th' ? 'โทรด้วยเสียง' : 'Panggilan Suara'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('braincore')}
            className={`min-h-[50px] rounded-2xl flex flex-col items-center justify-center gap-1 text-xs cursor-pointer transition-all ${
              activeTab === 'braincore'
                ? 'bg-[#FFF3C4] text-[#241A11] font-bold border border-[#E6A800]/40'
                : 'text-[#6E5E47] font-semibold'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span>{locale === 'th' ? 'สถิติ' : 'Braincore'}</span>
          </button>
        </div>
      </nav>

      {/* MODAL / BOTTOM SHEET PILIH KARAKTER & SKENARIO (Persona & Scenario Picker) */}
      {showPersonaModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => setShowPersonaModal(false)}
        >
          <div
            data-testid="persona-scenario-modal"
            className="bg-[#FDFAF5] text-[#1C1611] w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#EDE2D0] p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE0CE]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#1C1611] flex items-center gap-2">
                  <span>{locale === 'th' ? 'เลือกคู่สนทนาและสไตล์เสียง' : 'Pilih Karakter & Gaya Bicara'}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#1C1611] text-white font-bold">
                    {targetLang.toUpperCase()}
                  </span>
                </h3>
                <p className="text-xs text-[#6E5E47] mt-0.5">
                  {locale === 'th'
                    ? 'เลือกติวเตอร์ที่มีเอกลักษณ์ บุคลิก และระดับการเคี่ยวเข็ญที่คุณชอบ'
                    : 'Pilih mentor dengan gaya mengajar, aksen, dan tingkat roasting yang kamu sukai'}
                </p>
              </div>
              <button
                type="button"
                data-testid="close-persona-modal-btn"
                onClick={() => setShowPersonaModal(false)}
                className="w-8 h-8 rounded-full bg-[#EAE0CE] hover:bg-[#DDD0BC] text-[#5C4E3C] flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            {/* Bagian 1: Karakter & Persona (Grid 2 Kolom) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#5C4E3C] uppercase tracking-wider">
                <span>{locale === 'th' ? 'ติวเตอร์ที่เลือกได้' : 'Karakter Mentor Fiezel'}</span>
                <span className="text-[11px] font-normal normal-case text-[#8C7A65]">
                  {locale === 'th' ? 'แตะเพื่อเปลี่ยนทันที' : 'Klik untuk ganti mentor'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.values(VOICE_PERSONAS)
                  .filter((p) => p.targetLang === targetLang)
                  .map((persona) => {
                    const isSelected = activePersona.id === persona.id;
                    return (
                      <button
                        key={persona.id}
                        type="button"
                        data-testid={`persona-card-${persona.id}`}
                        onClick={() => handleSelectPersona(persona.id)}
                        className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-white border-[#1C1611] shadow-[0_4px_16px_rgba(28,22,17,0.08)] ring-2 ring-[#1C1611]/10'
                            : 'bg-white/60 hover:bg-white border-[#EAE0CE] hover:border-[#D5C6AF]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-[#F3ECE0] flex items-center justify-center text-lg shrink-0">
                              {persona.targetLang === 'ja'
                                ? persona.id === 'nanami'
                                  ? '🌸'
                                  : '⚡'
                                : persona.id === 'coach_alex'
                                ? '🔥'
                                : '🎓'}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-[#1C1611] leading-tight">
                                {persona.name}
                              </div>
                              <div className="text-[10px] text-[#8C7A65] font-medium leading-tight">
                                {persona.accentLabel}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 rounded-full bg-[#10B981] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                              ✓
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 mt-1">
                          <div className="inline-block text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#FAF2E4] text-[#7A5A29]">
                            {locale === 'th' ? persona.personalityTagTh || persona.roleTh : persona.personalityTagId || persona.roleId}
                          </div>
                          <div className="text-[11px] text-[#5C4E3C] line-clamp-2 leading-snug">
                            {locale === 'th' ? persona.roastStyleTh || persona.speakingStyle : persona.roastStyleId || persona.speakingStyle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Bagian 2: Topik & Skenario Percakapan */}
            <div className="space-y-2 pt-2 border-t border-[#EAE0CE]">
              <div className="flex items-center justify-between text-xs font-bold text-[#5C4E3C] uppercase tracking-wider">
                <span>{locale === 'th' ? 'หัวข้อบทสนทนา' : 'Pilihan Skenario & Topik'}</span>
                <span className="text-[11px] font-normal normal-case text-[#8C7A65]">
                  {scenariosForLang.length} {locale === 'th' ? 'สถานการณ์' : 'skenario'}
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto overscroll-contain pr-1">
                {scenariosForLang.map((scen) => {
                  const isScenActive = activeScenario.id === scen.id;
                  const scenPersona = VOICE_PERSONAS[scen.personaId] || activePersona;
                  return (
                    <button
                      key={scen.id}
                      type="button"
                      data-testid={`scenario-item-${scen.id}`}
                      onClick={() => handleSelectScenario(scen.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isScenActive
                          ? 'bg-white border-[#1C1611] font-bold shadow-xs'
                          : 'bg-white/50 hover:bg-white border-[#EAE0CE]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-[#1C1611] truncate font-medium">
                          {locale === 'th' ? scen.titleTh : scen.titleId}
                        </div>
                        <div className="text-[10px] text-[#8C7A65] truncate">
                          {formatPersonaShortName(scenPersona.name)} · {formatCleanLevel(scen.level)}
                        </div>
                      </div>
                      {isScenActive && (
                        <span className="text-xs text-[#10B981] font-bold shrink-0">✓ Aktif</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPersonaModal(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1C1611] hover:bg-[#332A22] text-white font-bold text-xs cursor-pointer transition-all active:scale-[0.98] shadow-md"
              >
                {locale === 'th'
                  ? `เริ่มคุยกับ ${formatPersonaShortName(activePersona.name)}`
                  : `Mulai Bicara dengan ${formatPersonaShortName(activePersona.name)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Kartu Latihan Tulis Interaktif (Warm Paper & Tactile Flashcard + Braincore BKT) */}
      {learningWorkbench && !isMeasureMode && (
        <InCallLearningWorkbenchModal
          isOpen={learningWorkbench.isOpen}
          onClose={() => {
            workbenchSessionRef.current.dismissedByUser = true;
            isWorkbenchExplanationActiveRef.current = false;
            setLearningWorkbench(null);
          }}
          onResumeConversation={(completedSentence, finishedTopic) => {
            const quizSent =
              completedSentence || workbenchSessionRef.current.completedQuizSentence || '';
            workbenchSessionRef.current.dismissedByUser = true;
            workbenchSessionRef.current.completedQuizSentence = '';
            isWorkbenchExplanationActiveRef.current = false;
            speakTokenRef.current += 1;
            interruptAiAndStartListening();
            setLearningWorkbench(null);

            if (
              isLiveConnectedRef.current &&
              wsRef.current &&
              wsRef.current.readyState === WebSocket.OPEN
            ) {
              const targetLangName =
                activeScenario.targetLang === 'ja'
                  ? 'Japanese'
                  : activeScenario.targetLang === 'zh'
                    ? 'Mandarin Chinese'
                    : 'English';
              const resumeCue = quizSent
                ? `[System Note: Learner finished the Papan Belajar card on "${finishedTopic || 'grammar'}" and answered "${quizSent}" accurately. Now smoothly switch 100% BACK to ${targetLangName} in 1 short, natural spoken sentence, praise them briefly and ask 1 follow-up question so they use the pattern aloud!]`
                : `[System Note: Learner closed the Papan Belajar card on "${finishedTopic || 'grammar'}" to resume talking. Smoothly switch 100% BACK to ${targetLangName} in 1 short, natural spoken sentence and invite them to try saying one sentence aloud!]`;
              try {
                wsRef.current.send(
                  JSON.stringify({
                    clientContent: {
                      turns: [{ role: 'user', parts: [{ text: resumeCue }] }],
                      turnComplete: true,
                    },
                  })
                );
              } catch {
                // Ignore
              }
            } else if (quizSent) {
              const followUpLine =
                activeScenario.targetLang === 'ja'
                  ? 'いい感じだね！じゃあ今の形を使って、日本語でもう一言話してみよう！'
                  : activeScenario.targetLang === 'zh'
                    ? '太棒了！现在用刚才那个句型，跟我用中文聊一句吧！'
                    : "Nice work locking that down! Now let's jump right back into English, hit me with your own sentence!";
              const followUpTransId =
                'Mantap sudah paham! Sekarang ayo balik ngobrol pakai bahasa target, coba buat satu kalimatmu sendiri!';
              const followUpTransTh =
                'เก่งมากที่เข้าใจแล้ว! ตอนนี้กลับมาคุยกันต่อ ลองแต่งประโยคของคุณเองสักประโยคสิ!';
              const resumeTurn: CallTurn = {
                id: `turn_ai_resume_${Date.now()}`,
                speaker: 'ai',
                text: followUpLine,
                translationId: followUpTransId,
                translationTh: followUpTransTh,
                timestamp: Date.now(),
                replySource: 'ai',
              };
              setTurns((prev) => [...prev, resumeTurn]);
              void speakAiText(followUpLine, null, undefined, {
                spokenLang: activeScenario.targetLang,
              });
            }
          }}
          locale={locale}
          targetLang={activeScenario.targetLang}
          scenario={activeScenario}
          persona={activePersona}
          isLiveConnected={isLiveConnected}
          callDurationSec={callDurationSec}
          isPlayingPreview={isPlayingAiAudio}
          isGeneratingTopic={isAnalyzingTurn}
          uiAction={learningWorkbench.uiAction}
          topicTitle={learningWorkbench.topicTitle}
          focusType={learningWorkbench.focusType}
          explanationText={learningWorkbench.explanationText}
          patternFormula={learningWorkbench.patternFormula}
          drillInstruction={learningWorkbench.drillInstruction}
          sampleTarget={learningWorkbench.sampleTarget}
          forcedExerciseMode={learningWorkbench.preferredExerciseMode}
          externalQuizSeed={learningWorkbench.quizSeed}
          currentMasteryPct={Math.round(
            ((brainState.competencies[activeScenario.competencyId]?.pMasteryDecayed ??
              brainState.competencies[activeScenario.competencyId]?.pMastery ??
              0.35) || 0.35) * 100
          )}
          onSpeakPreview={(sampleText, spokenLang) => {
            interruptAiAndStartListening();
            isWorkbenchExplanationActiveRef.current = true;
            void speakAiText(sampleText, null, 0.92, {
              isManualReplay: true,
              spokenLang: spokenLang || String(locale || 'id').toLowerCase().split(/[-_]/)[0],
            }).finally(() => {
              isWorkbenchExplanationActiveRef.current = false;
            });
          }}
          onRequestCustomTopic={(customQuestion, bankTopicId) => {
            openLearningWorkbenchWithAction(
              {
                actionType: 'open_learning_popup',
                topicTitle: customQuestion,
                bankTopicId,
              },
              customQuestion
            );
            if (bankTopicId === 'custom_dynamic') {
              void (async () => {
                try {
                  const bases = resolveVoiceApiCandidateBases();
                  for (const base of bases) {
                    const res = await fetch(`${base}/api/voice/partner-turn`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        text: customQuestion,
                        personaId: activePersona.id,
                        personaName: activePersona.name,
                        scenarioId: activeScenario.id,
                        scenarioTitle: activeScenario.titleId,
                        targetLang: activeScenario.targetLang,
                        locale,
                        callMode: 'tutor_coach',
                        history: turnsRef.current.slice(-4).map((t) => ({ speaker: t.speaker, text: t.text })),
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      const derivedUiAction: VoiceUiAction =
                        data?.uiAction && data.uiAction.actionType === 'open_learning_popup'
                          ? data.uiAction
                          : {
                              actionType: 'open_learning_popup',
                              topicTitle: customQuestion,
                              coachSpokenScript: data?.aiReplyTranslationId || data?.aiReply || '',
                              sampleTarget: data?.replies?.[0]?.text || '',
                              patternFormula: `Pola: ${customQuestion}`,
                            };
                      setLearningWorkbench((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          ...derivedUiAction,
                          uiAction: derivedUiAction,
                          topicTitle: derivedUiAction.topicTitle || prev.topicTitle,
                          explanationText:
                            derivedUiAction.coachSpokenScript ||
                            derivedUiAction.explanationText ||
                            prev.explanationText,
                          patternFormula: derivedUiAction.patternFormula || prev.patternFormula,
                          sampleTarget: derivedUiAction.sampleTarget || prev.sampleTarget,
                        };
                      });
                      return;
                    }
                  }
                } catch {
                  // Fallback
                }
                void submitStudentTurn({ text: customQuestion, speakingDurationSec: 2 });
              })();
            }
          }}
          onEvaluatePractice={evaluateWorkbenchPractice}
          onSendToMentor={(writtenSentence) => {
            setLearningWorkbench(null);
            interruptAiAndStartListening();
            if (
              isLiveConnected &&
              wsRef.current &&
              wsRef.current.readyState === WebSocket.OPEN
            ) {
              submitLiveUserUtterance(writtenSentence);
            } else {
              void submitStudentTurn({ text: writtenSentence, speakingDurationSec: 3 });
            }
          }}
          onNavigateModule={(dest) => {
            setLearningWorkbench(null);
            handleVoiceNavigateApp(dest, 'workbench_open_full_module');
          }}
        />
      )}

      {/* Modal Konfirmasi Panggilan Kawan Bicara (Ringkas & Jelas) */}
      {callConfirmModal && !isLocalTestEnvironment() && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#FFFDF8] border-2 border-[#FDE68A] p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FEF3C7] flex items-center justify-center text-2xl shadow-inner">
              💎
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1C1611]">
                {locale === 'th' ? 'Kawan Bicara' : 'Kawan Bicara'}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5C4E3C]">
                {locale === 'th'
                  ? 'ฟีเจอร์นี้ใช้ Gem และสามารถรับ Gem ฟรีได้จากการฝึกประจำวัน'
                  : 'Fitur ini memakai Gem, dan Gem bisa diakses gratis dari latihan harian.'}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCallConfirmModal(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] font-bold text-xs cursor-pointer transition-colors"
              >
                {locale === 'th' ? 'ยกเลิก' : 'Batal'}
              </button>
              <button
                type="button"
                onClick={handleConfirmStartCall}
                className="flex-1 py-3 px-4 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-xs shadow-md shadow-amber-500/25 cursor-pointer transition-all active:scale-[0.98]"
              >
                {locale === 'th' ? 'เชื่อมต่อ' : 'Sambungkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gem Belum Cukup */}
      {insufficientGemModal && !isLocalTestEnvironment() && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#FFFDF8] border-2 border-red-200 p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 flex items-center justify-center text-2xl shadow-inner">
              💎
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1C1611]">
                {locale === 'th' ? 'Gem ยังไม่พอ' : 'Gem Belum Cukup'}
              </h3>
              <div className="mt-2 text-xs leading-relaxed text-[#5C4E3C]">
                {locale === 'th' ? (
                  <>
                    คุณต้องมีอย่างน้อย <strong>{KAWAN_BICARA_MIN_START_GEMS} Gem</strong> สำหรับเสียงตอบแรกของ Kawan Bicara (ยอดปัจจุบัน: {insufficientGemModal.balance} 💎)
                    <br /><br />
                    ทำแบบฝึกหัดในควิซเพื่อสะสม Gem หรือรอรีเซ็ตสิทธิ์ฟรีรายวันในวันพรุ่งนี้!
                  </>
                ) : (
                  <>
                    Kamu membutuhkan minimal <strong>{KAWAN_BICARA_MIN_START_GEMS} Gem</strong> untuk respon suara pertama Kawan Bicara (Saldo saat ini: {insufficientGemModal.balance} 💎).
                    <br /><br />
                    Selesaikan latihan soal di kuis untuk mengumpulkan Gem gratis atau tunggu kuota gratis harian besok!
                  </>
                )}
              </div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setInsufficientGemModal(null)}
                className="w-full py-3 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
              >
                {locale === 'th' ? 'เข้าใจแล้ว' : 'Mengerti'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating CTA when Auto-Call requires user interaction on browser mic policy */}
      {autoCallNeedsTap && !isLiveConnected && !isLiveConnecting && (
        <div className="fixed bottom-24 inset-x-4 sm:inset-x-auto sm:right-6 z-50 flex items-center justify-center pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              setAutoCallNeedsTap(false);
              requestStartLiveCall();
            }}
            className="px-5 py-3 rounded-2xl bg-[#1C1611] text-white font-bold text-sm shadow-xl flex items-center gap-2.5 animate-bounce border border-[#FF9800]/40 cursor-pointer"
          >
            <Phone className="w-4 h-4 text-[#FF9800]" />
            <span>Sambungkan Telepon Live Sekarang</span>
          </button>
        </div>
      )}
    </div>
  );
}
