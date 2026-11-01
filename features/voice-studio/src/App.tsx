import React, { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import {
  BraincoreStoreState,
  CallScenario,
  CallTurn,
  LearnerLocale,
  TargetLang,
  TurnDiagnosis,
} from './types/voiceCall';
import {
  abilityThetaFromMastery,
  brainSyncFlush,
  checkPrerequisiteStatus,
  loadBraincoreState,
  recordSpeakingAttempt,
  recordVocabPrereqMastery,
  saveBraincoreState,
  STORAGE_KEY,
} from './lib/braincore';
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
import { stripEmojisAndEmotWords } from './lib/japanesePhonetics';
import {
  evaluateTurnLocal,
  type LiveTransportMode,
  pcm16Base64ToAudioBuffer,
  reportGeminiLiveSessionDrop,
  requestGeminiLiveSessionToken,
  requestRealtimeCopilotAssist,
  resolveAiReply,
  resolveLiveCallWebSocketUrls,
  splitIntoSpeechChunks,
  synthesizeFlexibleTts,
  warmUpVoiceServices,
} from './lib/liveTransport';
import { HandyHumanVad, float32At16kToPcm16Base64 } from './lib/handyVad';
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
const MAX_CALL_DURATION_SEC = 300; // 5-minute maximum session duration
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

function getHostGemBalance(): number {
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

function deductHostGems(amount: number, reason = 'kawan_bicara_ai_voice_turn'): number {
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
    try {
      const saved = localStorage.getItem('fiezel_voice_persona_pref');
      if (saved && VOICE_PERSONAS[saved]) return saved;
    } catch {}
    const initialLang = loadBraincoreState().targetLang || 'en';
    return initialLang === 'ja' ? 'nanami' : 'coach_alex';
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
        setIsPlayingAiAudio(false);
      }, tailDelayMs);
    } else {
      isPlayingAiAudioRef.current = false;
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
  const lastCopilotAiKeyRef = useRef<string>('');
  const copilotVariationSeedRef = useRef<number>(0);
  const copilotCardsRef = useRef<BeginnerReplyCard[]>([]);
  copilotCardsRef.current = copilotCards;
  const liveEarlyCopilotTriggeredRef = useRef<boolean>(false);

  const [isRecordingPtt, setIsRecordingPtt] = useState<boolean>(false);
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

  // Gemini Live multi-key pool & mid-call auto-failover bookkeeping
  const liveUserDraftRef = useRef<string>('');
  const liveAiDraftRef = useRef<string>('');
  const [liveAiTranslationDraft, setLiveAiTranslationDraft] = useState<string>('');
  const liveSentenceTransMapRef = useRef<Map<string, { id: string; th: string }>>(new Map());
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
        }
        const liveCtx = liveAudioCtxRef.current;
        outputAudioCtxRef.current = liveCtx;
        inputAudioCtxRef.current = liveCtx;
        nextStartTimeRef.current = liveCtx.currentTime;
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
      : (VOICE_PERSONAS[activeScenario.personaId] || (targetLang === 'ja' ? VOICE_PERSONAS.nanami : VOICE_PERSONAS.coach_alex));

  // Pre-render the scenario's opening line so the call starts speaking with zero lag
  // without sending concurrent TTS requests that queue on Render's single worker.
  useEffect(() => {
    const lineToPreRender = activePersona.openingGreeting || activeScenario.openingLine;
    if (!lineToPreRender) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        await synthesizeFlexibleTts({
          text: lineToPreRender,
          targetLang: activeScenario.targetLang,
          persona: activePersona,
        });
      })();
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [activeScenario.id, activePersona.id]);

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

  const splitSentences = (text: string, lang: 'en' | 'ja'): string[] => {
    const clean = (text || '').trim();
    if (!clean) return [];
    if (lang === 'ja') {
      const matched = clean.match(/[^。！？\n]+[。！？\n]?/g);
      return matched ? matched.map((s) => s.trim()).filter(Boolean) : [clean];
    }
    const matched = clean.match(/[^.!?\n]+(?:[.!?]+|\n|$)/g);
    return matched ? matched.map((s) => s.trim()).filter(Boolean) : [clean];
  };

  const updateLiveAiTranslationDraft = (fullAiText: string) => {
    const sentences = splitSentences(fullAiText, activeScenario.targetLang);
    const targetLoc = locale === 'th' ? 'th' : 'id';
    const combined = sentences
      .map((raw) => {
        const s = raw.trim();
        const cached = liveSentenceTransMapRef.current.get(s);
        if (cached && (targetLoc === 'th' ? cached.th : cached.id)) {
          return targetLoc === 'th' ? cached.th : cached.id;
        }
        const local = translateAndPhoneticizeLiveText(s, activeScenario.targetLang);
        return targetLoc === 'th' ? local.translationTh : local.translationId;
      })
      .filter(Boolean)
      .join(' ');
    setLiveAiTranslationDraft(combined);
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
    if (
      !opts?.forceVariation &&
      lastCopilotAiKeyRef.current === dedupKey &&
      copilotCardsRef.current.length > 0
    ) {
      return;
    }

    const currentSeq = ++copilotSeqRef.current;

    // Do NOT abort an in-flight request if the AI text is a streaming debounce of the same utterance
    if (!opts?.isDebouncedStreaming && copilotAbortRef.current) {
      try {
        copilotAbortRef.current.abort();
      } catch {
        // Ignore
      }
    }
    const controller = new AbortController();
    copilotAbortRef.current = controller;

    if (!opts?.forceVariation && copilotCardsRef.current.length === 0) {
      setIsGeneratingCopilot(true);
      setCopilotSource('loading');
    }

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
      const validCards = (res.replies || res.cards || []);
      if (validCards.length > 0) {
        lastCopilotAiKeyRef.current = dedupKey;
        setCopilotCards(validCards);
        setCopilotSource('ai-realtime');
      }
    } catch {
      if (controller.signal.aborted || copilotSeqRef.current !== currentSeq) return;
    } finally {
      if (copilotAbortRef.current === controller) {
        copilotAbortRef.current = null;
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
          ? 'ฟีเจอร์คุยสดกับ Fiezel ต้องการการเชื่อมต่ออินเทอร์เน็ตสำหรับการสนทนา AI แบบเรียลไทม์'
          : 'Kawan Bicara membutuhkan koneksi internet aktif untuk percakapan AI realtime.'
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
    const initialTransId = activePersona.openingGreetingTransId || activeScenario.openingTranslationId;
    const initialTransTh = activePersona.openingGreetingTransTh || activeScenario.openingTranslationTh;
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
      setCallDurationSec((s) => {
        const next = s + 1;
        if (next >= MAX_CALL_DURATION_SEC) {
          stopLiveCall();
          setStatusBanner({
            type: 'info',
            message:
              locale === 'th'
                ? 'เซสชันการโทร 5 นาทีสิ้นสุดลงแล้ว! พักสักครู่หรือเริ่มเซสชันใหม่ได้เสมอ'
                : 'Sesi latihan percakapan 5 menit telah selesai! Istirahat sejenak atau mulai sesi baru.',
          });
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLiveConnected, locale]);

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
    setCopilotCards([]);
    setCopilotSource('loading');
    const sessionKey = `fz_kaiwa_turns_${activeScenario.targetLang}_${activeScenario.id}`;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(sessionKey);
      }
    } catch {
      // Ignore
    }
    const lineToSay = activePersona.openingGreeting || activeScenario.openingLine;
    const transId = activePersona.openingGreetingTransId || activeScenario.openingTranslationId;
    const transTh = activePersona.openingGreetingTransTh || activeScenario.openingTranslationTh;
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
    const defaultPersona = lang === 'ja' ? 'nanami' : 'coach_alex';
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
    const transId = p.openingGreetingTransId || matchingScen.openingTranslationId;
    const transTh = p.openingGreetingTransTh || matchingScen.openingTranslationTh;
    const newOpeningTurn: CallTurn = {
      id: `turn_open_${matchingScen.id}_${Date.now()}`,
      speaker: 'ai',
      text: lineToSay,
      translationId: transId,
      translationTh: transTh,
      timestamp: Date.now(),
    };
    setTurns([newOpeningTurn]);
    void triggerRealtimeCopilotForAi(lineToSay, '', [
      { speaker: 'ai', text: lineToSay },
    ]);
    if (lineToSay) {
      void speakAiText(lineToSay);
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
    if (isLiveConnectedRef.current) {
      stopLiveCall();
    }
    const lineToSay = p.openingGreeting || scen.openingLine;
    const transId = p.openingGreetingTransId || scen.openingTranslationId;
    const transTh = p.openingGreetingTransTh || scen.openingTranslationTh;
    const newOpeningTurn: CallTurn = {
      id: `turn_open_${scen.id}_${Date.now()}`,
      speaker: 'ai',
      text: lineToSay,
      translationId: transId,
      translationTh: transTh,
      timestamp: Date.now(),
    };
    setTurns([newOpeningTurn]);
    void triggerRealtimeCopilotForAi(lineToSay, '', [
      { speaker: 'ai', text: lineToSay },
    ]);
    if (lineToSay) {
      void speakAiText(lineToSay);
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
   * screen and the learner can replay it with "Putar Suara" — never a robot voice.
   */
  const fetchNeuralVoice = async (text: string) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await synthesizeFlexibleTts({
        text,
        targetLang: activeScenario.targetLang,
        persona: activePersona,
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
      if (!holderRef.current || (holderRef.current as any).context !== ctx) {
        const an = ctx.createAnalyser();
        an.fftSize = 2048;
        an.smoothingTimeConstant = 0.5;
        an.connect(ctx.destination);
        holderRef.current = an;
      }
      if (mochiInstanceRef.current?.attachAudioAnalyser) {
        mochiInstanceRef.current.attachAudioAnalyser(holderRef.current, ctx.sampleRate || 24000);
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
      // Stop only the previous Web Audio node here — NOT the chunk promise that is
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
   * Web Audio context — never browser `speechSynthesis`.
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
          // EXACT SAME neural MP3 via the unlocked Web Audio context — zero robot voice.
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
    opts?: { isManualReplay?: boolean }
  ) => {
    const cleanSpoken = stripEmojisAndEmotWords(text).trim();
    if (!cleanSpoken) return;
    const targetRate = overrideRate ?? speechRate;
    const token = ++speakTokenRef.current;

    // m025-637 pipelined playback: fetch chunk 0 immediately; start fetching chunk i+1 ONLY
    // after chunk i has arrived (while chunk i is playing on the speaker) so two TTS requests
    // never compete on Render's single worker.
    const chunks = preloadedBase64
      ? [cleanSpoken]
      : splitIntoSpeechChunks(cleanSpoken, activeScenario.targetLang);
    if (!chunks.length) chunks.push(cleanSpoken);
    const fetchChunk = (idx: number) =>
      idx === 0 && preloadedBase64
        ? Promise.resolve({ audioBase64: preloadedBase64, audioMimeType: 'audio/mpeg', engine: 'preloaded' })
        : fetchNeuralVoice(chunks[idx]);
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
        // Start fetching chunk i+1 NOW while chunk i plays on the speaker
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
        setStatusBanner(
          locale === 'th'
            ? 'เสียง Neural กำลังเชื่อมต่อใหม่ ข้อความยังแสดงอยู่ แตะ "เล่นเสียง" เพื่อลองอีกครั้ง'
            : 'Suara neural sedang menyambung ulang. Teks balasan tetap tampil — ketuk "Putar Suara" untuk mencoba lagi.'
        );
      }
    } catch {
      // Ignore — the reply text stays on screen and can be replayed.
    } finally {
      if (token === speakTokenRef.current) {
        clearSpeechWatchdog();
        setAiAudioPlaying(false, 250);
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
      if (cleanChars.split(/\s+/).length < 3) return true;
      return /\b(and|or|but|because|so|if|as|with|to|for|in|on|at|of|from|by|about|a|an|the|i|you|we|they|he|she|it|my|your|our|their|is|are|was|were|have|has|had|do|did|does|can|could|will|would|like|want|would like|could i|can i|give me|i'd|i'm|we're|there's|that's|what|where|when|why|how|uh|um|umm|er|err|well|hmm|like)\s*$/i.test(lower);
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
    const uText = textToCommit.trim();
    if (!uText) return;

    liveUserDraftRef.current = '';
    setLiveUserDraft('');

    const evalParams = {
      text: uText,
      scenario: activeScenario,
      persona: activePersona,
      targetLang: activeScenario.targetLang,
      locale,
      measureMode: isMeasureMode,
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

  const submitStudentTurn = async (params: {
    text?: string;
    audioBase64?: string;
    audioMimeType?: string;
    speakingDurationSec?: number;
  }) => {
    const trimmed = (params.text || '').trim();
    if (!trimmed && !params.audioBase64) return;

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
        history: turns.slice(-6).map((tItem) => ({
          speaker: tItem.speaker,
          text: tItem.text,
        })),
      };

      // STEP 1 — instant local Braincore grading of the learner's EXACT words.
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
      // In live voice calls, keep conversation natural and human-like — do NOT interrupt
      // conversational flow with loud arcade quiz chime/buzzer SFX unless in formal exam measureMode.
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

      // STEP 2 — the REAL AI partner reply + REAL-TIME AI Copilot answers (never static templates).
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
        onTextReady: (aiText, transId, transTh, suggestions) => {
          textAlreadyShown = true;
          isAiThinkingRef.current = false;
          setIsAiThinking(false);
          if (Array.isArray(suggestions) && suggestions.length > 0) {
            const aiOnly = suggestions.filter((c) => c.isRealtimeAi && !c.isOfflineFallback);
            if (aiOnly.length > 0) {
              lastCopilotAiKeyRef.current = `${activeScenario.id}::${activeScenario.targetLang}::${aiText.trim()}::${exactTranscript}`;
              setCopilotCards(aiOnly);
              setCopilotSource('ai-realtime');
              setIsGeneratingCopilot(false);
            } else {
              void triggerRealtimeCopilotForAi(aiText, exactTranscript, [
                ...historyAfterUser,
                { speaker: 'ai', text: aiText },
              ]);
            }
          } else {
            void triggerRealtimeCopilotForAi(aiText, exactTranscript, [
              ...historyAfterUser,
              { speaker: 'ai', text: aiText },
            ]);
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

      if (Array.isArray(replyEv.nextSuggestedReplies) && replyEv.nextSuggestedReplies.length > 0) {
        const aiOnly = replyEv.nextSuggestedReplies.filter((c) => c.isRealtimeAi && !c.isOfflineFallback);
        if (aiOnly.length > 0) {
          lastCopilotAiKeyRef.current = `${activeScenario.id}::${activeScenario.targetLang}::${replyEv.aiReply.trim()}::${exactTranscript}`;
          setCopilotCards(aiOnly);
          setCopilotSource('ai-realtime');
          setIsGeneratingCopilot(false);
        } else if (!textAlreadyShown && replyEv.aiReply) {
          void triggerRealtimeCopilotForAi(replyEv.aiReply, exactTranscript, [
            ...historyAfterUser,
            { speaker: 'ai', text: replyEv.aiReply },
          ]);
        }
      } else if (!textAlreadyShown && replyEv.aiReply) {
        void triggerRealtimeCopilotForAi(replyEv.aiReply, exactTranscript, [
          ...historyAfterUser,
          { speaker: 'ai', text: replyEv.aiReply },
        ]);
      }

      const aiAudioBase64 = replyEv.audioBase64 || null;
      void speakAiText(replyEv.aiReply, aiAudioBase64);
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

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      return;
    }

    let isDisposed = false;
    let accumulatedSpeech = '';
    let speechPrefix = '';

    const startListeningCycle = () => {
      if (isDisposed) return;
      try {
        const rec = new SpeechRec();
        rec.lang = activeScenario.targetLang === 'ja' ? 'ja-JP' : 'en-US';
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
          // Neural Human-Voice VAD Cross-Check:
          // Reject street traffic, passing motorcycles, horns, fans, wind, or ambient noise
          // that causes browser SpeechRecognition to hallucinate phantom syllables and freeze Fiezel.
          const hasLiveMicTrack = Boolean(
            micStreamRef.current &&
              micStreamRef.current.getAudioTracks().some((tr) => tr.readyState === 'live' && tr.enabled)
          );
          if (sileroVadGateRef.current?.isActive()) {
            if (Date.now() - sileroVadGateRef.current.getLastHumanSpeechAt() > 2800) {
              return;
            }
          } else if (hasLiveMicTrack) {
            if (Date.now() - lastHandySpeechAtRef.current > 2800) {
              return;
            }
          }
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          const clean = (speechPrefix ? speechPrefix + ' ' + transcript : transcript)
            .replace(/\s+/g, ' ')
            .trim();
          if (clean) {
            accumulatedSpeech = clean;
            liveDictatedTextRef.current = clean;
            setLiveUserDraft(clean);
            setInputText(clean);
            setIsUserSpeakingLive(true);

            if (liveSilenceTimerRef.current) {
              window.clearTimeout(liveSilenceTimerRef.current);
            }
            // Pacing patience: 3200ms baseline, 4500ms if grammatically incomplete or thinking filler
            const silenceWaitMs = isGrammaticallyIncomplete(clean, activeScenario.targetLang) ? 4500 : 3200;
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
          }
        };

        rec.onerror = (evErr: any) => {
          const code = String(evErr?.error || '');
          if (code === 'no-speech' || code === 'aborted') {
            return;
          }
          // Transient 'no-speech' / 'aborted' are normal in a continuous call. Fatal codes used
          // to be swallowed, so the loop restarted forever and the AI never heard anything.
          if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
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
          // Anti-Premature Cutoff: If the learner has spoken something, NEVER force-submit on browser onend!
          // Chrome often terminates recognition prematurely after 700-1000ms pause.
          // We preserve accumulated speech into speechPrefix, keep/start the patient silence timer,
          // and seamlessly restart recognition cycle so the learner can finish their thought undisturbed!
          if (accumulatedSpeech.trim()) {
            speechPrefix = accumulatedSpeech.trim();
            if (!liveSilenceTimerRef.current) {
              const silenceWaitMs = isGrammaticallyIncomplete(speechPrefix, activeScenario.targetLang) ? 4500 : 3200;
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
        recognition.lang = activeScenario.targetLang === 'ja' ? 'ja-JP' : 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          const clean = transcript.trim();
          if (clean) {
            liveDictatedTextRef.current = clean;
            setLiveUserDraft(clean);
            setInputText(clean);

            // Auto-submit after patient silence once user has spoken a phrase (or tap stop to send immediately)
            if (pttSilenceTimerRef.current) {
              window.clearTimeout(pttSilenceTimerRef.current);
            }
            const pttSilenceWaitMs = isGrammaticallyIncomplete(clean, activeScenario.targetLang) ? 4800 : 3500;
            pttSilenceTimerRef.current = window.setTimeout(() => {
              stopPttRecording();
            }, pttSilenceWaitMs);
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
    setIsLiveConnecting(false);
    setIsLiveConnected(true);
    playFiezelSfx('lesson_start');
    const lastAi = [...turns].reverse().find((tItem) => tItem.speaker === 'ai');
    void speakAiText(lastAi?.text || activeScenario.openingLine);
  };

  const startLiveCall = async (preAcquiredStream?: MediaStream) => {
    if (isLiveConnected || isLiveConnecting) return;
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
    setCallViewMode('stage');
    try {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    } catch {
      // Ignore
    }
    primeAudioPlayback();

    // 1. Dapatkan mikrofon secara non-blocking jika peramban mengizinkan langsung
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
        // Timeout 1200ms mencegah lock/hang pada iOS PWA standalone WebKit
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
        const res = await Promise.race([getStreamPromise, timeoutPromise]);
        if (res && res.getAudioTracks && res.getAudioTracks().length > 0) {
          stream = res;
          micStreamRef.current = stream;
        } else {
          // If first-time permission dialog took >1200ms, attach neural VAD as soon as user clicks Allow
          void getStreamPromise
            .then((lateStream) => {
              if (!lateStream || userHungUpRef.current) {
                try {
                  lateStream?.getTracks().forEach((tr) => tr.stop());
                } catch {}
                return;
              }
              micStreamRef.current = lateStream;
              const activeCtx = liveAudioCtxRef.current;
              if (activeCtx && !sileroVadGateRef.current) {
                const lateGate = new SileroNeuralVadGate();
                sileroVadGateRef.current = lateGate;
                void lateGate.start(lateStream, activeCtx, {
                  isMicMuted: () => isMicMutedRef.current,
                  isAiPlaying: () => isPlayingAiAudioRef.current,
                  onHumanSpeechState: (speaking) => setIsUserSpeakingLive(speaking),
                  onHumanBargeIn: () => interruptAiAndStartListening(),
                  onSpeechPcm16kBase64: (pcmBase64) => {
                    if (wsRef.current?.readyState === WebSocket.OPEN && isLiveConnectedRef.current) {
                      wsRef.current.send(
                        JSON.stringify({
                          realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: pcmBase64 } },
                        })
                      );
                    }
                  },
                  onSpeechEnded: () => {
                    if (wsRef.current?.readyState === WebSocket.OPEN && isLiveConnectedRef.current) {
                      wsRef.current.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
                    }
                  },
                });
              }
            })
            .catch(() => {});
        }
      } catch (micErr) {
        console.warn('[VoiceStudio] Non-blocking mic stream notice (SpeechRecognition will handle speech):', micErr);
        micStreamRef.current = null;
      }
    }

    // 2. Prime Unified Live AudioContext (native hardware rate for iOS & Desktop)
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

    // 3. Sambungkan MediaStreamSource HANYA JIKA stream aktif tersedia
    if (stream && stream.getAudioTracks().some((tr) => tr.readyState === 'live' && tr.enabled)) {
      try {
        if (liveCtx.state === 'suspended') {
          await liveCtx.resume().catch(() => {});
        }

        const source = liveCtx.createMediaStreamSource(stream);
        let workletInitialized = false;
        handyVadRef.current.reset();
        lastHandySpeechAtRef.current = 0;
        try {
          (window as any).__fzVoiceStudioHandyVad = handyVadRef.current;
        } catch {
          // Ignore
        }

        // Start Self-Hosted Silero Neural VAD v5 (ONNX Runtime Web WASM + 14-frame pre-roll)
        sileroVadGateRef.current?.destroy();
        const sileroGate = new SileroNeuralVadGate();
        sileroVadGateRef.current = sileroGate;
        void sileroGate.start(stream, liveCtx, {
          isMicMuted: () => isMicMutedRef.current,
          isAiPlaying: () => isPlayingAiAudioRef.current,
          onHumanSpeechState: (speaking) => {
            setIsUserSpeakingLive(speaking);
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

        const handleMicPcmData = (float32: Float32Array) => {
          if (isMicMutedRef.current) return;
          // Once Silero Neural VAD v5 WASM is active, it exclusively owns 16kHz human-speech streaming & barge-in.
          // HandyHumanVad acts solely as zero-latency DSP fallback during ~120ms WASM boot or non-WASM environments.
          if (sileroVadGateRef.current?.isActive()) return;

          // ACOUSTIC ECHO & ANTI-COLLISION SUPPRESSION:
          // Saat AI sedang aktif bicara melalui speaker perangkat:
          if (isPlayingAiAudioRef.current) {
            return;
          }

          const vadRes = handyVadRef.current.processSamples(
            float32,
            liveCtx.sampleRate || 48000,
            false
          );

          if (vadRes.inSpeech) {
            lastHandySpeechAtRef.current = Date.now();
            setIsUserSpeakingLive(true);
            if (userSpeakingTimerRef.current) window.clearTimeout(userSpeakingTimerRef.current);
            userSpeakingTimerRef.current = window.setTimeout(() => {
              setIsUserSpeakingLive(false);
            }, 450);
          }

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isLiveConnectedRef.current) {
            if (vadRes.speechPcm16k && vadRes.speechPcm16k.length > 0) {
              const pcmBase64 = float32At16kToPcm16Base64(vadRes.speechPcm16k);
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
            if (vadRes.speechEnded) {
              wsRef.current.send(
                JSON.stringify({
                  realtimeInput: {
                    audioStreamEnd: true,
                  },
                })
              );
            }
          }
        };

        // Try AudioWorklet first (Modern iOS Safari 14.5+ and Chromium)
        if (
          liveCtx.audioWorklet &&
          typeof liveCtx.audioWorklet.addModule === 'function' &&
          (typeof window !== 'undefined' && window.isSecureContext)
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

        if (!workletInitialized) {
          // Fallback: ScriptProcessorNode
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
          muteGain.gain.value = 0.00001; // Positive non-zero gain prevents Chrome power-saving from throttling onaudioprocess
          source.connect(processor);
          processor.connect(muteGain);
          muteGain.connect(liveCtx.destination);
        }
      } catch (err: any) {
        console.warn('Microphone node wiring error (SpeechRecognition handles voice):', err);
      }
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
      let targetWsUrl = '';
      let isGoogleLive = true;

      // 1. Dapatkan ephemeral session token dari Worker 16-key pool
      const session = await requestGeminiLiveSessionToken();
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
        wsRef.current = ws;
      } catch {
        window.clearTimeout(connectTimer);
        activateTurnByTurnLiveFallback();
        return;
      }

      ws.onopen = () => {
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

            const pacingDirective =
              speechRate <= 0.95
                ? `\n\n[MANDATORY PACING & ENUNCIATION FOR LEARNER]: You are speaking to a language learner. Speak at a CALM, RELAXED, UNHURRIED, and GENTLE pace (around 0.85x speed). Articulate every syllable, mora, and grammatical particle (such as は, が, を, に, で) with crystal-clear clarity. Insert natural breathing pauses between phrases so the learner can easily follow and understand every word without feeling rushed. NEVER rush your words.`
                : `\n\n[PACING & ENUNCIATION]: Speak clearly, warmly, and with natural articulation.`;

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
                            (activeScenario.targetLang === 'ja' ? 'Aoede' : 'Puck'),
                        },
                      },
                    },
                  },
                  outputAudioTranscription: {},
                  inputAudioTranscription: {},
                  systemInstruction: {
                    parts: [
                      {
                        text: `${activePersona.systemPrompt || ''}\n\n[Scenario]: ${activeScenario.titleId} (${activeScenario.targetLang === 'ja' ? 'Japanese' : 'English'}). ${activeScenario.descriptionId || activeScenario.situationId || ''}. Opening situation: "${activePersona.openingGreeting || activeScenario.openingLine}". Speak with your signature sassy tough-love personality (roasting stiffness playfully, dropping colloquial phrasing, no robotic formality, leading every turn with a sassy reaction) as ${activePersona.name}. Keep in character.${pacingDirective}${contextSummary}`,
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
        try {
          let rawData = '';
          if (typeof event.data === 'string') {
            rawData = event.data;
          } else if (event.data instanceof Blob) {
            rawData = await event.data.text();
          } else if (event.data instanceof ArrayBuffer) {
            rawData = new TextDecoder().decode(event.data);
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
            if (!isReconnect && isGoogleLive) {
              callBillingRef.current.turnMetered = false;
              const greetingDirective = hasUserSpoken
                ? `[Instruction: The learner just called you back! Greet them warmly in 1-2 short, natural sentences with your signature witty personality as ${activePersona.name} in "${activeScenario.titleId}", briefly acknowledging your ongoing conversation above and asking a fun follow-up question so they can reply immediately.]`
                : `[Instruction: Please begin our conversation now with your signature sassy, witty greeting as ${activePersona.name} in scenario "${activeScenario.titleId}". Say your opening line: "${activePersona.openingGreeting || activeScenario.openingLine}"]`;
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
                }, 7500);
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
              if (part?.text) {
                liveAiDraftRef.current += part.text;
                setLiveAiDraft(liveAiDraftRef.current);
              }
            }
          }

          if (incomingAudioChunks.length > 0 && outputAudioCtxRef.current) {
            if (liveOpeningAudioWatchdogRef.current) {
              window.clearTimeout(liveOpeningAudioWatchdogRef.current);
              liveOpeningAudioWatchdogRef.current = null;
            }
            const ctx = outputAudioCtxRef.current;
            if (ctx.state === 'suspended') {
              void ctx.resume().catch(() => {});
            }
            meterCallAiVoiceTurn();

            for (const chunkB64 of incomingAudioChunks) {
              const buffer = pcm16Base64ToAudioBuffer(ctx, chunkB64, 24000);
              const source = ctx.createBufferSource();
              source.buffer = buffer;

              // Jitter buffer lead: bila antrean kosong atau tertinggal, beri lead safety 80ms
              // agar audio mengalir mulus tanpa gap atau distorsi.
              const now = ctx.currentTime;
              if (nextStartTimeRef.current < now + 0.02) {
                nextStartTimeRef.current = now + 0.08;
              }
              const startAt = nextStartTimeRef.current;
              const duration = buffer.duration;
              nextStartTimeRef.current = startAt + duration;

              source.connect(getOrAttachAnalyser(ctx, liveAnalyserRef));
              source.start(startAt);

              activeSourcesRef.current.push(source);
              setAiAudioPlaying(true);
              source.onended = () => {
                activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
                if (activeSourcesRef.current.length === 0) {
                  setAiAudioPlaying(false, 300);
                }
              };
            }
          }

          // Barge-in interruption from server
          if (msg.serverContent?.interrupted || msg.type === 'interrupted') {
            callBillingRef.current.turnMetered = false;
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

          // Real-time transcriptions
          if (msg.serverContent?.inputTranscription?.text) {
            liveUserDraftRef.current += msg.serverContent.inputTranscription.text;
            setLiveUserDraft(liveUserDraftRef.current);
          } else if (msg.type === 'input_transcription' || msg.type === 'user_transcript') {
            liveUserDraftRef.current = msg.fullText || msg.text || '';
            setLiveUserDraft(liveUserDraftRef.current);
          }

          if (msg.serverContent?.outputTranscription?.text) {
            liveAiDraftRef.current += msg.serverContent.outputTranscription.text;
            setLiveAiDraft(liveAiDraftRef.current);
          } else if (msg.type === 'output_transcription' || msg.type === 'ai_transcript') {
            liveAiDraftRef.current = msg.fullText || msg.text || '';
            setLiveAiDraft(liveAiDraftRef.current);
          }

          // Sentence-Level Streaming Translation Pipeline
          const currentAiStreaming = liveAiDraftRef.current;
          if (currentAiStreaming) {
            const rawSentences = splitSentences(currentAiStreaming, activeScenario.targetLang);
            const targetLoc = locale === 'th' ? 'th' : 'id';
            rawSentences.forEach((rawSent, idx) => {
              const s = rawSent.trim();
              if (!s) return;
              const isCompleted = idx < rawSentences.length - 1 || /[.?!。？！\n]$/.test(s);
              if (isCompleted && !liveSentenceTransMapRef.current.has(s)) {
                liveSentenceTransMapRef.current.set(s, { id: '', th: '' });
                void fetchLiveTranslation(s, targetLoc).then((translated) => {
                  if (translated) {
                    const existing = liveSentenceTransMapRef.current.get(s) || { id: '', th: '' };
                    if (targetLoc === 'th') existing.th = translated;
                    else existing.id = translated;
                    liveSentenceTransMapRef.current.set(s, existing);
                    updateLiveAiTranslationDraft(liveAiDraftRef.current);
                  }
                }).catch(() => {});
              }
            });
            updateLiveAiTranslationDraft(currentAiStreaming);
          }

          // Real-Time Streaming Copilot Trigger with 320ms Debounce
          const streamingAiDraft = liveAiDraftRef.current.trim();
          const minStreamChars = activeScenario.targetLang === 'ja' ? 6 : 14;
          if (
            streamingAiDraft.length >= minStreamChars &&
            !liveEarlyCopilotTriggeredRef.current &&
            /[。？！.?!]\s*$/.test(streamingAiDraft)
          ) {
            liveEarlyCopilotTriggeredRef.current = true;
            if (copilotEarlyTimerRef.current) {
              window.clearTimeout(copilotEarlyTimerRef.current);
            }
            copilotEarlyTimerRef.current = window.setTimeout(() => {
              const latestUserSpoken =
                liveUserDraftRef.current.trim() ||
                [...turnsRef.current].reverse().find((tr) => tr.speaker === 'user')?.text ||
                '';
              const liveHist: Array<{ speaker: 'ai' | 'user'; text: string }> = [
                ...turnsRef.current
                  .slice(-7)
                  .map((tr) => ({ speaker: tr.speaker, text: tr.text })),
                { speaker: 'ai', text: streamingAiDraft },
              ];
              void triggerRealtimeCopilotRef.current(streamingAiDraft, latestUserSpoken, liveHist, {
                isDebouncedStreaming: true,
              });
            }, 320);
          }

          // Turn Complete — evaluate learner utterance and record Braincore mastery
          const isGoogleTurnComplete = Boolean(msg.serverContent?.turnComplete);
          if (isGoogleTurnComplete || msg.type === 'turn_complete') {
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
            liveEarlyCopilotTriggeredRef.current = false;
            const uText = (liveUserDraftRef.current || msg.userTranscript || '').trim();
            const aText = (liveAiDraftRef.current || msg.aiTranscript || '').trim();
            liveUserDraftRef.current = '';
            liveAiDraftRef.current = '';
            setLiveUserDraft('');
            setLiveAiDraft('');
            setLiveAiTranslationDraft('');

            if (uText) {
              const evalParams = {
                text: uText,
                scenario: activeScenario,
                persona: activePersona,
                targetLang: activeScenario.targetLang,
                locale,
                measureMode: isMeasureMode,
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
              // Compose turn translation instantly from completed sentence translations
              const sentences = splitSentences(aText, activeScenario.targetLang);
              const composedId = sentences
                .map((s) => liveSentenceTransMapRef.current.get(s.trim())?.id || '')
                .filter(Boolean)
                .join(' ');
              const composedTh = sentences
                .map((s) => liveSentenceTransMapRef.current.get(s.trim())?.th || '')
                .filter(Boolean)
                .join(' ');

              const autoTrans = translateAndPhoneticizeLiveText(
                aText,
                activeScenario.targetLang,
                composedId || msg.aiTranslationId,
                composedTh || msg.aiTranslationTh
              );
              const aiTurnId = `live_ai_${Date.now() + 1}`;
              setTurns((prev) => [
                ...prev,
                {
                  id: aiTurnId,
                  speaker: 'ai',
                  text: aText,
                  translationId: composedId || autoTrans.translationId,
                  translationTh: composedTh || autoTrans.translationTh,
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

              // If sentences did not cover full paragraph translation, backfill with GTX
              if (!composedId || (locale === 'th' && !composedTh)) {
                void Promise.all([
                  composedId ? Promise.resolve(composedId) : fetchLiveTranslation(aText, 'id'),
                  composedTh ? Promise.resolve(composedTh) : fetchLiveTranslation(aText, 'th'),
                ]).then(([idTrans, thTrans]) => {
                  if (idTrans || thTrans) {
                    setTurns((prev) =>
                      prev.map((t) =>
                        t.id === aiTurnId
                          ? {
                              ...t,
                              translationId: idTrans || t.translationId,
                              translationTh: thTrans || t.translationTh,
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
              if (!userHungUpRef.current) {
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
    if (liveOpeningAudioWatchdogRef.current) {
      window.clearTimeout(liveOpeningAudioWatchdogRef.current);
      liveOpeningAudioWatchdogRef.current = null;
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
            ? 'ยังไม่มีเสียง AI เล่นออกมา — ไม่ถูกหัก Gem (0 💎 ปลอดภัย)!'
            : 'Belum ada suara AI yang diputar — 0 Gem terpakai (Saldo & Kuota Aman)!'
        );
      } else if (wasFree && spentGems === 0) {
        setStatusBanner(
          locale === 'th'
            ? `จบการสนทนา: ${turnsCount} การตอบกลับเสียง AI · สิทธิ์ฟรีรายวัน (0 💎)`
            : `Panggilan selesai: ${turnsCount} respon suara AI · Kuota Gratis Harian (0 💎)`
        );
      } else {
        setStatusBanner(
          locale === 'th'
            ? `จบการสนทนา: ${turnsCount} การตอบกลับเสียง AI · ใช้ไป ${spentGems} 💎 ตามโควตาจริง`
            : `Panggilan selesai: ${turnsCount} respon suara AI · ${spentGems} 💎 terpakai sesuai kuota suara`
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
        micStreamRef.current = stream;
        const liveCtx = liveAudioCtxRef.current || inputAudioCtxRef.current;
        if (liveCtx) {
          if (liveCtx.state === 'suspended') void liveCtx.resume().catch(() => {});
          const source = liveCtx.createMediaStreamSource(stream);
          if (audioWorkletNodeRef.current) {
            source.connect(audioWorkletNodeRef.current);
          } else if (scriptProcessorRef.current) {
            source.connect(scriptProcessorRef.current);
          }
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
          voiceCompanionStrictMode: true,
          width: mochiWidth,
          height: mochiHeight,
        });
        inst.setVoiceCompanionStrictMode?.(true);
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

  // Strict 2-Motion Open-Eyes Rule for Kawan Bicara 3D Mochi:
  // Motion #1: Idle (open eyes 'dots' + hands retracted)
  // Motion #2: Greeting / Speaking (open eyes 'dots' + gentle hand wave + real-time wawa-lipsync mouth)
  useEffect(() => {
    const m = mochiInstanceRef.current;
    if (!m) return;
    try {
      m.setVoiceCompanionStrictMode?.(true);
      m.setMood?.('dots');
      m.setBadge?.(null);
      m.setFx?.(null);
      m.setAura?.('purple');

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
            inst.setVoiceCompanionStrictMode?.(true);
            inst.setMood?.('dots');
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
        m.retractHands?.();
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
  }, [callStateKey, is3dMochiReady, isAiThinking, liveAiDraft, lastAiTurn?.text]);

  const activeAiLiveText = liveAiDraft.trim() || lastAiTurn?.text || activeScenario.openingLine;
  const activeAiSubtitle = translateAndPhoneticizeLiveText(
    activeAiLiveText,
    activeScenario.targetLang,
    liveAiDraft.trim()
      ? (locale === 'id' && liveAiTranslationDraft ? liveAiTranslationDraft : (liveAiTranslationDraft || undefined))
      : lastAiTurn?.translationId || activeScenario.openingTranslationId,
    liveAiDraft.trim()
      ? (locale === 'th' && liveAiTranslationDraft ? liveAiTranslationDraft : undefined)
      : lastAiTurn?.translationTh || activeScenario.openingTranslationTh
  );

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
      {/* TOP BAR BERSIH SATU BARIS (Tanpa Kotak Berlapis) */}
      <header className="shrink-0 sticky top-0 z-20 bg-[#F6F3EC]/95 backdrop-blur-md border-b border-[#E8DFC8]/60">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <a
              href="./index.html"
              onClick={handleBackToPwa}
              data-testid="mitra-kaiwa-back-btn"
              className="px-3 py-1.5 rounded-full bg-white/90 hover:bg-white shadow-[0_1px_2px_rgba(28,22,17,0.05)] font-semibold text-[#1C1611] cursor-pointer flex items-center gap-1.5 transition-all text-xs shrink-0"
              title="Kembali"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{locale === 'th' ? 'กลับ' : 'Kembali'}</span>
            </a>

            {/* Room Title & Persona Name - No dropdown/topic picker */}
            <div className="flex items-center gap-2 min-w-0">
              <span
                data-testid="mitra-kaiwa-header-title"
                className="font-bold text-sm text-[#1C1611] whitespace-nowrap"
              >
                {targetLang === 'ja' ? (
                  locale === 'th' ? (
                    <>
                      <span>คู่สนทนาไควะ</span>
                      <span className="hidden sm:inline"> · สนทนาอิสระ</span>
                    </>
                  ) : (
                    <>
                      <span>Mitra Kaiwa</span>
                      <span className="hidden sm:inline"> · Free Talk</span>
                    </>
                  )
                ) : locale === 'th' ? (
                  <>
                    <span>คู่สนทนา AI</span>
                    <span className="hidden sm:inline"> · สนทนาอิสระ</span>
                  </>
                ) : (
                  <>
                    <span>Kawan Bicara</span>
                    <span className="hidden sm:inline"> · Free Talk</span>
                  </>
                )}
              </span>
              <button
                type="button"
                data-testid="persona-picker-trigger"
                onClick={() => {
                  playFiezelSfx('button_tap');
                  setShowPersonaModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF5EB] hover:bg-[#F3ECE0] border border-[#E8DEC8] text-[#5C4E3C] text-[11px] font-bold shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
                title={locale === 'th' ? 'เปลี่ยนติวเตอร์และสไตล์ AI' : 'Ganti Karakter & Gaya Bicara AI'}
              >
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                <span className="max-w-[120px] sm:max-w-[160px] truncate">
                  {formatPersonaShortName(activePersona.name)}
                </span>
                <svg className="w-3 h-3 text-[#8C7A65]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Navigasi Segmented (Nonaktif pada mode tunggal Mitra Kaiwa) */}
            <nav
              aria-hidden="true"
              style={{ display: 'none' }}
              className="hidden items-center gap-1 bg-[#FFF3DC] border border-[#F0E4CF] p-1 rounded-2xl"
            >
              <button
                type="button"
                onClick={() => handleTabChange('home')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold"
              >
                {locale === 'th' ? 'หน้าแรก' : 'Beranda'}
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('call')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold"
              >
                <span>{locale === 'th' ? 'โทรกับ AI' : 'Panggilan AI'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('braincore')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold"
              >
                Braincore ({Math.round(currentMasteryP * 100)}%)
              </button>
            </nav>
          </div>

          {/* Kontrol Kanan Ringkas: EN/JA Pill, BKT %, API Key */}
          <div className="flex items-center gap-1.5 text-xs shrink-0">
            <div className="flex items-center bg-white/90 rounded-full p-0.5 shadow-[0_1px_2px_rgba(28,22,17,0.05)]">
              <button
                type="button"
                data-testid="target-lang-en"
                onClick={() => handleSelectTargetLang('en')}
                className={`px-2.5 py-1 rounded-full font-bold text-[11px] cursor-pointer transition-all ${
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
                className={`px-2.5 py-1 rounded-full font-bold text-[11px] cursor-pointer transition-all ${
                  targetLang === 'ja'
                    ? 'bg-[#1C1611] text-white'
                    : 'text-[#6E5E47] hover:text-[#1C1611]'
                }`}
              >
                JA
              </button>
            </div>

            <button
              type="button"
              data-testid="btn-open-braincore"
              onClick={() => handleTabChange('braincore')}
              title="Analitik Braincore"
              className="px-2.5 py-1 rounded-full bg-white/90 hover:bg-white shadow-[0_1px_2px_rgba(28,22,17,0.05)] text-[#5C4E3C] font-mono text-[11px] font-semibold tabular-nums cursor-pointer transition-all"
            >
              {Math.round(currentMasteryP * 100)}%
            </button>

            <a
              href="/api/download-patch"
              download="fiezel-ai-voice-call.patch"
              data-testid="download-patch-btn"
              aria-hidden="true"
              style={{ display: 'none' }}
              className="hidden"
            >
              Patch
            </a>
          </div>
        </div>
      </header>

      {/* STATUS BANNER GLOBAL */}
      {statusBanner && (
        <div className="shrink-0 max-w-4xl mx-auto px-4 pt-1 w-full">
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
      <main ref={mainScrollRef} className="flex-1 min-h-0 max-w-4xl mx-auto px-3 sm:px-4 py-2 space-y-3 w-full overflow-y-auto overscroll-contain flex flex-col">
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
              <>
                {/* 1. ZONA PARTNER AI (Ringkas, Fokus Kontak Mata, Komunikasi Dua Arah) */}
                <section
                  data-testid="ai-call-card"
                  data-call-state={callStateKey}
                  data-transport-mode={liveTransportMode}
                  className={`bg-gradient-to-b from-[#FAF5EB] to-white rounded-3xl px-4 py-3 sm:px-6 sm:py-4 shadow-[0_4px_24px_rgba(28,22,17,0.04)] border border-black/[0.04] space-y-2.5 w-full ${
                    callViewMode === 'history' ? 'hidden' : 'flex flex-col'
                  }`}
                >
                  {/* Baris Meta Atas: Identitas Partner Bersih & Pill Mode Switcher */}
                  <div className="w-full flex items-center justify-between gap-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-[#6E5E47] min-w-0">
                      <button
                        type="button"
                        data-testid="persona-card-trigger"
                        onClick={() => {
                          playFiezelSfx('button_tap');
                          setShowPersonaModal(true);
                        }}
                        className="inline-flex items-center gap-1 font-bold text-[#1C1611] hover:text-[#5C4E3C] bg-white/90 hover:bg-white px-2 py-0.5 rounded-full border border-black/5 transition-all cursor-pointer active:scale-95"
                        title={locale === 'th' ? 'เปลี่ยนติวเตอร์และสไตล์ AI' : 'Ganti Karakter & Gaya Bicara AI'}
                      >
                        <span className="sm:hidden">
                          {formatPersonaShortName(activePersona.name).replace(/^(Sensei|Coach)\s+/i, '')}
                        </span>
                        <span className="hidden sm:inline">
                          {formatPersonaShortName(activePersona.name)}
                        </span>
                        <span className="text-[10px] text-[#8C7A65]">▾</span>
                      </button>
                      <span className="shrink-0">·</span>
                      <span className="shrink-0 text-[11px] font-medium whitespace-nowrap">
                        <span className="sm:hidden">
                          {String(activeScenario.level || '').replace(/\b(CEFR|JLPT)\s*/gi, '').trim() || 'Dasar'}
                        </span>
                        <span className="hidden sm:inline">
                          {formatCleanLevel(activeScenario.level)}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Segmented Switcher: Live (Panggung) vs Riwayat Chat */}
                      <div
                        data-testid="call-view-mode-toggle"
                        className="inline-flex items-center p-0.5 rounded-full bg-[#EFE8DA] text-[11px] font-semibold shadow-2xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            playFiezelSfx('button_tap');
                            setCallViewMode('stage');
                          }}
                          className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                            callViewMode === 'stage'
                              ? 'bg-white text-[#1C1611] shadow-2xs font-bold'
                              : 'text-[#6E5E47] hover:text-[#1C1611]'
                          }`}
                        >
                          {locale === 'th' ? 'โหมดสด' : 'Live'}
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
                          <span>{locale === 'th' ? 'แชท' : 'Riwayat'}</span>
                          {turns.filter((tr) => tr.speaker === 'user').length > 0 && (
                            <span className="w-3.5 h-3.5 rounded-full bg-[#8C2233] text-white text-[9px] flex items-center justify-center font-bold">
                              {turns.filter((tr) => tr.speaker === 'user').length}
                            </span>
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        data-testid="exam-mode-toggle-btn"
                        onClick={() => setCustomMeasureOverride(!isMeasureMode)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                          isMeasureMode
                            ? 'bg-[#FDF2F4] text-[#8C2233]'
                            : 'bg-[#F5F1E8] text-[#5C4E3C] hover:text-[#1C1611]'
                        }`}
                      >
                        {isMeasureMode ? (
                          locale === 'th' ? (
                            'โหมดสอบ'
                          ) : (
                            <>
                              <span className="hidden sm:inline">Mode </span>
                              <span>Ujian</span>
                            </>
                          )
                        ) : locale === 'th' ? (
                          'โหมดฝึกซ้อม'
                        ) : (
                          <>
                            <span className="hidden sm:inline">Mode </span>
                            <span>Latihan</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Baris Kehadiran Partner + Kontrol Suara Ringkas */}
                  <div className="w-full flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
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
                        className="relative w-[140px] sm:w-[200px] h-[130px] sm:h-[180px] flex items-center justify-center cursor-pointer select-none shrink-0"
                      >
                        <div
                          ref={mochiContainerRef}
                          data-testid="mochi-3d-stage"
                          className="w-[140px] sm:w-[200px] h-[130px] sm:h-[180px] flex items-center justify-center relative"
                        />
                        {!is3dMochiReady && !mochi3dFailed && (
                          <div
                            aria-hidden="true"
                            className="absolute pointer-events-none w-20 sm:w-28 h-20 sm:h-28 rounded-full bg-gradient-to-br from-[#EEDFCC]/60 to-[#DFCEB7]/50 animate-pulse shadow-inner flex items-center justify-center"
                          >
                            <span className="text-[10px] font-semibold text-[#8C7A65] tracking-wider uppercase">Mochi</span>
                          </div>
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

                      <div
                        key={callStateKey}
                        data-testid="ai-call-status-pill"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F1E8] text-[11px] font-medium text-[#5C4E3C]"
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
                          title={
                            locale === 'th'
                              ? 'ระบบคิด Gem ตามจำนวนเสียง AI ที่ตอบกลับจริง (เชื่อมต่อ 0 Gem)'
                              : 'Meteran kuota suara AI real-time (Menyambung = 0 Gem)'
                          }
                        >
                          {liveBillingUi.isDailyFree && liveBillingUi.gemsSpent === 0 ? (
                            <span>
                              {locale === 'th'
                                ? `🎁 ฟรี · ${liveBillingUi.turns}/${DAILY_FREE_CALL_MAX_TURNS} ตอบ`
                                : `🎁 Gratis · ${liveBillingUi.turns}/${DAILY_FREE_CALL_MAX_TURNS} respon`}
                            </span>
                          ) : (
                            <span>
                              {locale === 'th'
                                ? `💎 ${liveBillingUi.gemsSpent} Gem · ${liveBillingUi.turns} ตอบ`
                                : `💎 ${liveBillingUi.gemsSpent} Gem · ${liveBillingUi.turns} respon`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Kontrol Panggilan Pill Ringkas */}
                    <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSpeechRate((prev) => (prev <= 0.86 ? 0.92 : prev <= 0.93 ? 1.0 : 0.85));
                        }}
                        className="px-2.5 py-1.5 rounded-full bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[#5C4E3C] text-xs font-mono font-semibold cursor-pointer transition-colors"
                        title="Kecepatan bicara AI (0.85x Santai / 0.92x Sedang / 1.0x Normal)"
                      >
                        {speechRate <= 0.86 ? '0.85x' : speechRate <= 0.93 ? '0.92x' : '1.0x'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const lastAi = [...turns].reverse().find((tr) => tr.speaker === 'ai');
                          if (lastAi) void speakAiText(lastAi.text, lastAi.audioBase64, undefined, { isManualReplay: true });
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[#1C1611] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#5C4E3C] shrink-0" />
                        <span>{callStateKey === 'speaking' ? 'Diputar...' : 'Putar Suara'}</span>
                      </button>

                      {!isLiveConnected ? (
                        <button
                          type="button"
                          disabled={isLiveConnecting}
                          onClick={() => requestStartLiveCall()}
                          className="px-4 py-1.5 rounded-full bg-[#1C1611] hover:bg-[#332920] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs disabled:opacity-60"
                          title="Mulai panggilan suara dua arah hands-free (bebas bicara langsung)"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{isLiveConnecting ? 'Menyambungkan...' : 'Telepon Live'}</span>
                        </button>
                      ) : (
                        <>
                          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FDFAF3] border border-[#EAE3D5] text-xs shadow-2xs">
                            {isUserSpeakingLive ? (
                              <>
                                <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-ping" />
                                <span className="font-bold text-[#2E7D32]">Mendengarkan...</span>
                              </>
                            ) : (
                              <>
                                <span className="w-2 h-2 rounded-full bg-[#E06738] animate-pulse" />
                                <span className="text-[#6E5E47]">Mic Aktif</span>
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={toggleMuteMic}
                            className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                              isMicMuted
                                ? 'bg-[#B8432D] text-white'
                                : 'bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[#1C1611]'
                            }`}
                            aria-label="Mute Mic"
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
                            className="px-3.5 py-1.5 rounded-full bg-[#B8432D] hover:bg-[#9E3622] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <PhoneOff className="w-3.5 h-3.5" />
                            <span>Akhiri</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Ucapan Partner AI Fokus Kontak Mata */}
                  <div
                    data-testid="live-translation-hud"
                    className="w-full text-left pt-2 border-t border-[#EDE5D4]/80 space-y-1"
                  >
                    {isAiThinking ? (
                      <div
                        data-testid="live-hud-ai-thinking"
                        aria-live="polite"
                        className="flex items-center gap-2 py-1"
                      >
                        <span className="sr-only">
                          {locale === 'th' ? 'Mochi กำลังคิดคำตอบ' : 'Mochi sedang menyiapkan jawaban'}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-[#8C2233] animate-pulse [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 rounded-full bg-[#8C2233] animate-pulse [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 rounded-full bg-[#8C2233] animate-pulse" />
                        <span className="text-xs font-medium text-[#6E5E47]">
                          {locale === 'th' ? 'กำลังตอบกลับ...' : 'Menyiapkan balasan...'}
                        </span>
                      </div>
                    ) : (
                      <>
                        <div
                          data-testid="live-hud-ai-text"
                          data-reply-source={liveAiDraft.trim() ? 'live' : lastAiTurn?.replySource || 'script'}
                        >
                          <JapaneseRubyDisplay
                            text={activeAiLiveText}
                            targetLang={activeScenario.targetLang}
                            showFurigana={!isMeasureMode}
                            showRomaji={!isMeasureMode}
                            className="text-[15px] sm:text-[17px] font-semibold text-[#1C1611] leading-snug tracking-[-0.01em] break-words"
                            rubyClassName="text-[15px] sm:text-[17px]"
                            romajiClassName="text-xs sm:text-[13px] text-[#8C6D1F] font-medium mt-0.5"
                          />
                        </div>

                        {!isMeasureMode && showTranslations && (
                          <p
                            data-testid="live-hud-ai-translation"
                            className="text-xs sm:text-[13px] text-[#6E5E47] leading-snug break-words"
                          >
                            {locale === 'th'
                              ? activeAiSubtitle.translationTh
                              : activeAiSubtitle.translationId}
                          </p>
                        )}
                      </>
                    )}

                    {activeUserSubtitle && (
                      <div className="pt-0.5">
                        <span className="inline-flex items-center gap-1 max-w-full px-2.5 py-0.5 rounded-full bg-[#F5F1E8] text-[11px] text-[#5C4E3C] truncate">
                          <strong className="font-semibold text-[#1C1611] shrink-0">Kamu:</strong>
                          <span className="truncate">{activeUserSubtitle.text}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                {/* 1.5 ZONA COPILOT JAWABAN AI REALTIME (Muncul Otomatis Saat Partner Bicara, Tersembunyi di Mode Ujian) */}
                {!isMeasureMode && (
                  <div className={`w-full ${callViewMode === 'stage' ? 'block' : 'hidden'}`}>
                    <BeginnerAnswerAssistant
                      locale={locale}
                      targetLang={activeScenario.targetLang}
                      scenario={activeScenario}
                      aiQuestionText={activeAiLiveText}
                      aiQuestionTranslation={
                        locale === 'th'
                          ? activeAiSubtitle.translationTh
                          : activeAiSubtitle.translationId
                      }
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

                {/* 2. ALUR PERCAKAPAN RINGKAS (Tampil di Mode Riwayat atau saat Murid Ingin Membaca Transkrip) */}
                <section className={`space-y-2.5 w-full pt-1 ${callViewMode === 'history' ? 'block' : 'hidden'}`}>
                  <div className="flex items-center justify-between gap-2 px-1 text-xs text-[#6E5E47] pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        playFiezelSfx('button_tap');
                        setCallViewMode('stage');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C1611] text-white font-semibold text-xs cursor-pointer hover:bg-[#332920] transition-colors shadow-2xs"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{locale === 'th' ? 'กลับไปที่หน้าจอสด' : 'Kembali ke Panggung Live'}</span>
                    </button>

                    <div className="flex items-center gap-3 shrink-0">
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
                    {turns.map((turn, idx) => {
                      // Jangan duplikasi kalimat pembuka pertama jika murid belum membalas
                      if (idx === 0 && turns.length === 1 && turn.speaker === 'ai') {
                        return null;
                      }
                      if (turn.speaker === 'ai') {
                        return (
                          <div
                            key={turn.id}
                            className="bg-white/85 rounded-2xl rounded-tl-xs px-4 py-2.5 max-w-[90%] sm:max-w-[82%] shadow-[0_1px_3px_rgba(28,22,17,0.04)] break-words space-y-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <JapaneseRubyDisplay
                                  text={turn.text}
                                  targetLang={activeScenario.targetLang}
                                  showFurigana={!isMeasureMode}
                                  showRomaji={!isMeasureMode}
                                  className="text-sm font-medium text-[#1C1611] break-words leading-snug"
                                  rubyClassName="text-sm font-medium"
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
                            {!isMeasureMode &&
                              showTranslations &&
                              (turn.translationId || turn.translationTh) && (
                                <p className="text-xs text-[#6E5E47] break-words">
                                  {locale === 'th' ? turn.translationTh : turn.translationId}
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
                            {!isMeasureMode && showTranslations && (turn.translationId || turn.translationTh) && (
                              <p className="text-xs text-[#FFE082]/90 mt-1 pt-1 border-t border-white/10 break-words italic">
                                {locale === 'th' ? turn.translationTh : turn.translationId}
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
              </>
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

      {/* FLOATING PILL COMPOSER DOCK (Gaya Voice App Modern — Permanen Fixed di Bawah) */}
      {activeTab === 'call' && prereqStatus.isReady && (
        <div
          data-testid="mitra-kaiwa-bottom-dock"
          className="shrink-0 w-full z-30 bg-[#F6F3EC]/95 backdrop-blur-md border-t border-[#E8DFC8]/70 px-3 sm:px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(28,22,17,0.04)]"
        >
          <div className="max-w-2xl mx-auto space-y-1.5">
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
                          ? 'AI กำลังพูด (พูดแทรกเพื่อขัดจังหวะได้)'
                          : 'AI sedang bicara... (bicara langsung untuk menyela)'
                        : isLiveConnected
                          ? isMicMuted
                            ? locale === 'th'
                              ? 'ไมโครโฟนปิดอยู่ — แตะไอคอนไมค์เพื่อเปิด'
                              : 'Mikrofon nonaktif — Klik tombol mic untuk aktifkan'
                            : locale === 'th'
                              ? 'ไมโครโฟนแฮนด์ฟรีเปิดอยู่ — พูดได้เลยไม่ต้องกดปุ่ม'
                              : 'Mikrofon handsfree aktif — Bicara langsung tanpa tekan tombol'
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
                  disabled={isAnalyzingTurn}
                  onClick={() => {
                    if (isPlayingAiAudio) {
                      interruptAiAndStartListening();
                      return;
                    }
                    if (isRecordingPtt) {
                      stopPttRecording();
                    } else {
                      void startPttRecording();
                    }
                  }}
                  className={`px-3.5 py-2 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                    isRecordingPtt
                      ? 'bg-[#8C2233] text-white'
                      : 'bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[#1C1611]'
                  }`}
                  title={isPlayingAiAudio ? 'Sela AI & bicara' : t(locale, 'call.pushToTalk')}
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
            <span>{locale === 'th' ? 'โทรกับ AI' : 'Panggilan AI'}</span>
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
                  <span>{locale === 'th' ? 'เลือกคู่สนทนาและสไตล์ AI' : 'Pilih Karakter & Gaya Bicara AI'}</span>
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
                <span>{locale === 'th' ? 'ติวเตอร์ที่เลือกได้' : 'Karakter Mentor AI'}</span>
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

      {/* Modal Konfirmasi Panggilan Kawan Bicara (API-Quota Metered Gem Transparency) */}
      {callConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#FFFDF8] border-2 border-[#FDE68A] p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FEF3C7] flex items-center justify-center text-2xl shadow-inner">
              {callConfirmModal.isDailyFree ? '✨' : '💎'}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1C1611]">
                {callConfirmModal.isDailyFree
                  ? locale === 'th'
                    ? 'โทรคุยสดกับ Kawan Bicara (ฟรี)'
                    : 'Panggilan Kawan Bicara (Kuota Gratis)'
                  : locale === 'th'
                    ? 'โทรคุยสดกับ Kawan Bicara (คิดตามเสียงจริง)'
                    : 'Kawan Bicara (Sesuai Kuota Suara AI)'}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5C4E3C]">
                {callConfirmModal.isDailyFree ? (
                  locale === 'th' ? (
                    <>
                      🎉 <strong>สิทธิ์โทรฟรีรายวันพร้อมใช้งาน!</strong> (สูงสุด {DAILY_FREE_CALL_MAX_TURNS} การตอบกลับเสียง AI ฟรี · สิทธิ์จะถูกนับเมื่อเสียง AI ดังขึ้นจริงเท่านั้น)
                    </>
                  ) : (
                    <>
                      🎉 <strong>1 Sesi Harian Gratis Tersedia!</strong> Gratis hingga <strong>{DAILY_FREE_CALL_MAX_TURNS} respon suara AI</strong> (kuota hanya terpakai saat suara AI benar-benar keluar).
                    </>
                  )
                ) : locale === 'th' ? (
                  <>
                    ไม่หัก Gem ล่วงหน้า! คิดตามจำนวนเสียงตอบกลับ AI จริง (ยอดของคุณ: <strong>{callConfirmModal.balance} 💎</strong>)
                  </>
                ) : (
                  <>
                    Tanpa potong di awal! Gem dihitung proporsional sesuai respon suara AI yang berhasil diputar (Saldo: <strong>{callConfirmModal.balance} 💎</strong>).
                  </>
                )}
              </p>

              <div className="mt-3 rounded-2xl bg-[#FEFCE8] border border-[#FDE68A] px-3.5 py-2.5 text-left text-[11.5px] leading-relaxed text-[#3F3222] space-y-1">
                {callConfirmModal.isDailyFree ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>{locale === 'th' ? 'เชื่อมต่อ / เสียงไม่ติด' : 'Menyambung / Gagal Suara'}</span>
                      <strong className="text-emerald-700">0 💎</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{locale === 'th' ? `เสียง AI ตอบกลับ 1–${DAILY_FREE_CALL_MAX_TURNS} ครั้งแรก` : `Respon Suara AI 1–${DAILY_FREE_CALL_MAX_TURNS}`}</span>
                      <strong className="text-emerald-700">{locale === 'th' ? 'ฟรี (0 💎)' : 'Gratis (0 💎)'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#6E5E47]">
                      <span>{locale === 'th' ? 'ตอบกลับถัดไป (ถ้าคุยต่อ)' : 'Lanjut Ngobrol Berikutnya'}</span>
                      <span>+{KAWAN_BICARA_TURN_GEM_COST} 💎 / {locale === 'th' ? 'ตอบ' : 'respon'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span>{locale === 'th' ? 'เชื่อมต่อ / เสียงไม่ติด' : 'Menyambung (Anti-Hangus)'}</span>
                      <strong className="text-emerald-700">0 💎</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{locale === 'th' ? 'ทักทาย & เสียงตอบแรก' : 'Sapaan & Respon Suara Awal'}</span>
                      <strong>{KAWAN_BICARA_OPENING_GEM_COST} 💎</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{locale === 'th' ? 'เสียงตอบกลับถัดไป' : 'Balasan Suara Berikutnya'}</span>
                      <strong>+{KAWAN_BICARA_TURN_GEM_COST} 💎 / {locale === 'th' ? 'ตอบ' : 'respon'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#6E5E47] pt-0.5 border-t border-[#FDE68A]/70">
                      <span>{locale === 'th' ? 'เพดานสูงสุดต่อสาย (5 นาที)' : 'Batas Maks. Sesi (5 menit)'}</span>
                      <span>{locale === 'th' ? `สูงสุด ${KAWAN_BICARA_MAX_SESSION_GEMS} 💎` : `Maks. ${KAWAN_BICARA_MAX_SESSION_GEMS} 💎`}</span>
                    </div>
                  </>
                )}
              </div>
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
                {callConfirmModal.isDailyFree
                  ? (locale === 'th' ? 'เริ่มโทรฟรี (0 💎)' : 'Mulai Gratis (0 💎)')
                  : (locale === 'th' ? 'เชื่อมต่อ (เริ่ม 0 💎)' : 'Sambungkan (Mulai 0 💎)')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gem Belum Cukup */}
      {insufficientGemModal && (
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
