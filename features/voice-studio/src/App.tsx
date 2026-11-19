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
  createTurnAcousticTracker,
  dispatchVoiceAppNavigation,
  finalizeCallSessionMemory,
  getNextStudioSeq,
  getStudioNonce,
  loadBraincoreState,
  loadPteMasterState,
  recordPteMasterAttempt,
  diagnosePteCandidateSpeech,
  type PteDiagnosticSpeechResult,
  readHostPwaCognitiveSnapshot,
  reconcileNeuralDiagnosis,
  recordSpeakingAttempt,
  recordVocabPrereqMastery,
  saveBraincoreState,
  STORAGE_KEY,
  type TurnAcousticTelemetry,
} from './lib/braincore';
import {
  createAcousticProsodyTracker,
  type AcousticProsodyAnalysis,
} from './lib/acousticProsodyAnalyzer';
import { type SpeechAlignmentResult } from './lib/speechAlignment';
import {
  InCallLearningWorkbenchModal,
  type WorkbenchEvaluationMeta,
  type WorkbenchPracticeCheckResult,
} from './components/InCallLearningWorkbenchModal';
import { WhiteboardErrorBoundary } from './components/WhiteboardErrorBoundary';
import {
  extractOpenerFirstTtsChunk,
  requestRealtimeWhiteboardAction,
  requestRealtimeWhiteboardStream,
  type WhiteboardFollowUpContext,
} from './lib/whiteboardDirector';
import { CALL_SCENARIOS, VOICE_PERSONAS } from './data/callScenarios';
import { t, tMasteryState, scenarioMetaForLocale, vocabMeaningForLocale } from './lib/i18n';
import { playFiezelSfx, registerSfxHostAudioContext } from './lib/sfx';
import {
  isMobileLowMemoryDevice,
  registerSharedBoardAudioContext,
  unlockSharedBoardAudioContext,
} from './lib/boardAudioUnlock';
import { BraincoreTrendChart } from './components/BraincoreTrendChart';
import { HomeRedesignView } from './components/HomeRedesignView';
import { BeginnerAnswerAssistant } from './components/BeginnerAnswerAssistant';
import {
  SswSenseiWorkbenchPanel,
  type SswQuizDrawMode,
  type SswWorkbenchTab,
} from './components/SswSenseiWorkbenchPanel';
import {
  SSW_FOCUS_PAGE_EVENT,
  SSW_FOCUS_STEP_EVENT,
  SSW_MASTER_KB,
  SSW_STATE_UPDATED_EVENT,
  buildSswCompactGroundedDossier,
  drawSswQuizQuestionAsync,
  ensureSswFullKnowledgeLoaded,
  getSswProgressReport,
  gradeSswQuizAnswerAsync,
  loadSswMasterState,
  lookupSswMaterialAndPageAsync,
  resetSswMasterState,
  updateSswStudyProgress,
  type SswDrawnQuestionPayload,
  type SswGradeQuizResult,
  type SswMasterState,
} from './lib/sswSenseiEngine';
import {
  SSW_LIVE_TOOL_DECLARATIONS,
  advanceSswLessonStep,
  buildSswGreetingDirective,
  buildSswLiveSystemInstruction,
  lookupSswForLiveTeachingAsync,
} from './lib/sswSenseiTeacher';
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
  subscribeLiveTranslationUpdates,
  translateAndPhoneticizeLiveText,
} from './lib/liveCallHelper';
import { JapaneseRubyDisplay } from './components/JapaneseRubyDisplay';
import { stripEmojisAndEmotWords, toPhoneticRomaji } from './lib/japanesePhonetics';
import { toPhoneticPinyin } from './lib/mandarinPhonetics';
import {
  buildContextualFallbackCards,
  evaluateTurnLocal,
  LivePcmStreamScheduler,
  type LiveTransportMode,
  pcm16Base64ToAudioBuffer,
  reportGeminiLiveSessionDrop,
  requestGeminiLiveSessionToken,
  requestNeuralUtteranceDiagnosis,
  requestRealtimeCopilotAssist,
  resolveAiReply,
  resolveLiveCallWebSocketUrls,
  resolveVoiceApiCandidateBases,
  sanitizeHallucinatedTranscript,
  splitIntoSpeechChunks,
  splitTtsIntoSentenceChunks,
  synthesizeFlexibleTts,
  verifySpokenLanguageAudio,
  warmUpVoiceServices,
} from './lib/liveTransport';
import {
  HandyHumanVad,
  encodeFloat32At16kToWavBase64,
  float32At16kToPcm16Base64,
  hasDynamicSpeechModulation,
  resampleFloat32To16k,
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

function countUtteranceUnits(text: string, targetLang: TargetLang): number {
  const clean = String(text || '').trim();
  if (!clean) return 0;
  if (targetLang === 'ja' || targetLang === 'zh') {
    return clean.replace(/[\s.,!?。、！？…「」『』（）()]+/g, '').length;
  }
  return clean.split(/\s+/).filter(Boolean).length;
}

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

function enumerateGemStateKeys(): string[] {
  const keys: string[] = [
    'fz_state_v1',
    'fz_state_v1@ja',
    'fz_state_v1@en',
    'fz_state_v1@zh',
    'fiezel-v5',
    'fiezel-v4-state',
  ];
  try {
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && /^(?:fz_state_v1|fiezel-v5|fiezel-v4-state)(?:[:@].+)?$/i.test(k) && !keys.includes(k)) {
          keys.push(k);
        }
      }
    }
  } catch {}
  return keys;
}

export function isLocalTestEnvironment(): boolean {
  try {
    if (typeof location === 'undefined') return false;
    const ownParams = new URLSearchParams(location.search || '');
    if (ownParams.get('fz_real_auth') === '1') return false;
    try {
      const parentSearch = window.parent && window.parent !== window ? window.parent.location?.search || '' : '';
      if (parentSearch && new URLSearchParams(parentSearch).get('fz_real_auth') === '1') return false;
    } catch {}
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
      const keys = enumerateGemStateKeys();
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
  let targetSpentTotal: number | null = null;
  const nowTs = Date.now();

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
              if (st.gems.schema !== 'fiezel-gems-v1') st.gems.schema = 'fiezel-gems-v1';
              if (typeof st.gems.earnedTotal !== 'number') st.gems.earnedTotal = avail;
              st.gems.balance = Math.max(0, avail - spend);
              st.gems.spentTotal = (typeof st.gems.spentTotal === 'number' ? st.gems.spentTotal : 0) + spend;
              targetSpentTotal = st.gems.spentTotal;
              if (!Array.isArray(st.gems.ledger)) st.gems.ledger = [];
              st.gems.ledger.push({
                at: nowTs,
                delta: -spend,
                reason,
              });
              if (st.gems.ledger.length > 60) st.gems.ledger.shift();
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
      const keys = enumerateGemStateKeys();
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
                parsed.gems.schema = 'fiezel-gems-v1';
                if (typeof parsed.gems.earnedTotal !== 'number') {
                  parsed.gems.earnedTotal = avail;
                }
                parsed.gems.balance =
                  updatedBalance !== null ? updatedBalance : Math.max(0, avail - spend);
                const prevSpent = typeof parsed.gems.spentTotal === 'number' ? parsed.gems.spentTotal : 0;
                parsed.gems.spentTotal =
                  targetSpentTotal !== null ? Math.max(prevSpent, targetSpentTotal) : prevSpent + spend;
                if (!Array.isArray(parsed.gems.ledger)) parsed.gems.ledger = [];
                const lastL = parsed.gems.ledger[parsed.gems.ledger.length - 1];
                if (!lastL || lastL.reason !== reason || Math.abs(Number(lastL.at || 0) - nowTs) > 2000) {
                  parsed.gems.ledger.push({ at: nowTs, delta: -spend, reason });
                  if (parsed.gems.ledger.length > 60) parsed.gems.ledger.shift();
                }
                localStorage.setItem(k, JSON.stringify(parsed));
                if (actualDeducted === 0) {
                  actualDeducted = spend;
                  updatedBalance = parsed.gems.balance;
                  targetSpentTotal = parsed.gems.spentTotal;
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

function getWibDateKey(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function getDailyFreeCallAvailable(): boolean {
  if (isLocalTestEnvironment()) {
    return true; // Localhost test bypass: daily free calls are unlimited
  }
  try {
    if (typeof localStorage === 'undefined') return true;
    const today = getWibDateKey();
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
    const today = getWibDateKey();
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
      if (typeof window !== 'undefined') {
        const qp = new URLSearchParams(window.location.search);
        const qpScen = qp.get('scenario');
        const matchedScen = qpScen
          ? CALL_SCENARIOS.find((s) => s.id === qpScen && s.targetLang === initialLang)
          : undefined;
        if (matchedScen?.personaId && VOICE_PERSONAS[matchedScen.personaId]?.targetLang === initialLang) {
          return matchedScen.personaId;
        }
        const qpPersona = qp.get('persona');
        if (qpPersona && VOICE_PERSONAS[qpPersona]?.targetLang === initialLang) {
          return qpPersona;
        }
      }
      const saved = localStorage.getItem('fiezel_voice_persona_pref');
      if (saved && VOICE_PERSONAS[saved] && VOICE_PERSONAS[saved].targetLang === initialLang) return saved;
    } catch {}
    return initialLang === 'ja' ? 'nanami' : (initialLang === 'zh' ? 'xiao_mochi' : 'coach_alex');
  });
  const [showPersonaModal, setShowPersonaModal] = useState<boolean>(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string>(() => {
    const initialLang = loadBraincoreState().targetLang || 'en';
    try {
      if (typeof window !== 'undefined') {
        const qp = new URLSearchParams(window.location.search);
        const qpScen = qp.get('scenario');
        if (qpScen && CALL_SCENARIOS.some((s) => s.id === qpScen && s.targetLang === initialLang)) {
          return qpScen;
        }
        const qpPersona = qp.get('persona');
        if (qpPersona && VOICE_PERSONAS[qpPersona]?.targetLang === initialLang) {
          const qpMatch = CALL_SCENARIOS.find((s) => s.personaId === qpPersona && s.targetLang === initialLang);
          if (qpMatch) return qpMatch.id;
        }
      }
      const savedScen = localStorage.getItem('fiezel_voice_scenario_pref');
      if (savedScen && CALL_SCENARIOS.some((s) => s.id === savedScen && s.targetLang === initialLang)) {
        return savedScen;
      }
      const savedPersona = localStorage.getItem('fiezel_voice_persona_pref');
      if (savedPersona === 'dr_julian') {
        const pteScen = CALL_SCENARIOS.find((s) => s.personaId === 'dr_julian' && s.targetLang === initialLang);
        if (pteScen) return pteScen.id;
      }
    } catch {}
    const freeScenario = CALL_SCENARIOS.find((s) => s.targetLang === initialLang && s.id.includes('free'));
    if (freeScenario) return freeScenario.id;
    const firstForLang = CALL_SCENARIOS.find((s) => s.targetLang === initialLang);
    return firstForLang ? firstForLang.id : 'scen_en_free_talk';
  });
  const [customMeasureOverride, setCustomMeasureOverride] = useState<boolean | null>(null);
  // Mode tampilan di tab Panggilan: 'stage' (Panggung Live terpusat, zero-scroll) vs 'history' (Riwayat Chat & Evaluasi)
  const [callViewMode, setCallViewMode] = useState<'stage' | 'history'>('stage');

  const [turns, setTurns] = useState<CallTurn[]>([]);
  const [, setTranslationCacheTick] = useState<number>(0);

  useEffect(() => {
    return subscribeLiveTranslationUpdates(() => {
      setTranslationCacheTick((v) => v + 1);
    });
  }, []);
  const [inputText, setInputText] = useState<string>('');
  const [isAnalyzingTurn, setIsAnalyzingTurn] = useState<boolean>(false);
  const [isGeneratingWorkbench, setIsGeneratingWorkbench] = useState<boolean>(false);
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
  const awaitingPostToolResponseRef = useRef<boolean>(false);
  const liveGenCompleteTimerRef = useRef<number | null>(null);
  const suppressAiAudioForTurnRef = useRef<boolean>(false);
  const liveTurnFinalizedForCurrentAiTurnRef = useRef<boolean>(false);
  const aiDraftUiTimerRef = useRef<number | null>(null);
  const lastAiDraftUiPushAtRef = useRef<number>(0);
  const liveTurnAutoCommitTimerRef = useRef<number | null>(null);
  const activeWorkbenchTargetRef = useRef<{
    isOpen: boolean;
    contextMode: string;
    topicTitle: string;
    activeTargetText: string;
  }>({
    isOpen: false,
    contextMode: '',
    topicTitle: '',
    activeTargetText: '',
  });
  const clearLiveTurnAutoCommitTimer = () => {
    if (liveTurnAutoCommitTimerRef.current) {
      window.clearTimeout(liveTurnAutoCommitTimerRef.current);
      liveTurnAutoCommitTimerRef.current = null;
    }
  };

  const clearLiveAiDraftUiTimer = () => {
    if (aiDraftUiTimerRef.current) {
      window.clearTimeout(aiDraftUiTimerRef.current);
      aiDraftUiTimerRef.current = null;
    }
  };

  const scheduleLiveAiDraftUiUpdate = () => {
    const now = Date.now();
    const elapsed = now - lastAiDraftUiPushAtRef.current;
    if (elapsed >= 80) {
      clearLiveAiDraftUiTimer();
      lastAiDraftUiPushAtRef.current = now;
      setLiveAiDraft(cleanMoodTags(liveAiDraftRef.current));
      return;
    }
    if (!aiDraftUiTimerRef.current) {
      aiDraftUiTimerRef.current = window.setTimeout(() => {
        aiDraftUiTimerRef.current = null;
        lastAiDraftUiPushAtRef.current = Date.now();
        setLiveAiDraft(cleanMoodTags(liveAiDraftRef.current));
      }, Math.max(16, 80 - elapsed));
    }
  };

  const isMobilePwaDevice = () =>
    typeof navigator !== 'undefined' &&
    (/iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '') ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      (navigator as any).userAgentData?.platform === 'iOS' ||
      Boolean(
        navigator.vendor &&
          navigator.vendor.includes('Apple') &&
          !navigator.userAgent.includes('CriOS') &&
          !navigator.userAgent.includes('Chrome')
      ));

  const setDuplexAudioSessionMode = (active: boolean) => {
    if (typeof window === 'undefined') return;
    const mode = active ? 'play-and-record' : 'playback';
    try {
      (window as any).__fzDuplexAudioActive = active;
    } catch {}
    try {
      const parentWin = getParentWin();
      if (parentWin && parentWin !== window) {
        try {
          parentWin.__fzDuplexAudioActive = active;
        } catch {}
      }
      if (typeof (window as any).__fzSetAudioSessionMode === 'function') {
        (window as any).__fzSetAudioSessionMode(mode, window);
      } else if (parentWin && typeof parentWin.__fzSetAudioSessionMode === 'function') {
        parentWin.__fzSetAudioSessionMode(mode, parentWin);
      }
    } catch {}
    for (const targetWin of [window, getParentWin()]) {
      if (!targetWin) continue;
      try {
        const sess = (targetWin.navigator as any)?.audioSession;
        if (sess && typeof sess.type === 'string' && sess.type !== mode) {
          sess.type = mode;
        }
      } catch {}
    }
  };

  const setAiAudioPlaying = (playing: boolean, tailDelayMs = 0) => {
    if (aiPlayoutTailTimerRef.current) {
      window.clearTimeout(aiPlayoutTailTimerRef.current);
      aiPlayoutTailTimerRef.current = null;
    }
    if (playing) {
      if (isLiveConnectedRef.current || isLiveConnectingRef.current) {
        setDuplexAudioSessionMode(true);
      }
      const wasPlaying = isPlayingAiAudioRef.current;
      isPlayingAiAudioRef.current = true;
      consecutiveSpeechFramesRef.current = 0;
      if (!wasPlaying) {
        bargeSpeechStreakRef.current = 0;
        resetBargeCandidate();
      }
      setIsPlayingAiAudio(true);
    } else if (
      tailDelayMs > 0 &&
      (isPlayingAiAudioRef.current ||
        activeSourcesRef.current.length > 0 ||
        livePcmSchedulerRef.current.hasPendingAudio())
    ) {
      aiPlayoutTailTimerRef.current = window.setTimeout(() => {
        aiPlayoutTailTimerRef.current = null;
        isPlayingAiAudioRef.current = false;
        openingGreetingCompletedRef.current = true;
        lastAiPlayoutEndedAtRef.current = Date.now();
        bargeSpeechStreakRef.current = 0;
        resetBargeCandidate();
        handyVadRef.current.clearPreRoll();
        setIsPlayingAiAudio(false);
      }, tailDelayMs);
    } else {
      const wasActive =
        isPlayingAiAudioRef.current ||
        activeSourcesRef.current.length > 0 ||
        livePcmSchedulerRef.current.hasPendingAudio();
      isPlayingAiAudioRef.current = false;
      openingGreetingCompletedRef.current = true;
      if (wasActive) {
        lastAiPlayoutEndedAtRef.current = Date.now();
      }
      bargeSpeechStreakRef.current = 0;
      resetBargeCandidate();
      handyVadRef.current.clearPreRoll();
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
  const turnAcousticTrackerRef = useRef(createTurnAcousticTracker());
  const acousticProsodyRef = useRef(createAcousticProsodyTracker(16000));
  const [latestPteDiagnostic, setLatestPteDiagnostic] = useState<PteDiagnosticSpeechResult | null>(null);
  const [latestReadAloudAlignment, setLatestReadAloudAlignment] = useState<SpeechAlignmentResult | null>(null);
  const lastSyncedWorkbenchKeyRef = useRef<string>('');
  const syncWorkbenchToLiveAi = useCallback(
    (info: { contextMode: string; topicTitle: string; activeTargetText: string }) => {
      const target = (info.activeTargetText || '').trim();
      activeWorkbenchTargetRef.current = {
        isOpen: true,
        contextMode: info.contextMode,
        topicTitle: info.topicTitle,
        activeTargetText: target,
      };
      const syncKey = `${info.contextMode}::${info.topicTitle}::${target}`;
      if (lastSyncedWorkbenchKeyRef.current === syncKey) return;
      lastSyncedWorkbenchKeyRef.current = syncKey;

      if (target) {
        const lastAi = [...turnsRef.current].reverse().find((tr) => tr.speaker === 'ai');
        if (lastAi && (info.contextMode === 'pte_read_aloud' || info.contextMode === 'read_aloud')) {
          void triggerRealtimeCopilotRef.current(
            lastAi.text,
            '',
            turnsRef.current.slice(-6).map((tr) => ({ speaker: tr.speaker, text: tr.text }))
          );
        }
      }

      if (
        isLiveConnectedRef.current &&
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN &&
        target
      ) {
        try {
          wsRef.current.send(
            JSON.stringify({
              clientContent: {
                turns: [
                  {
                    role: 'user',
                    parts: [
                      {
                        text: `[SCREEN STATE SYNC: Interactive popup "${info.topicTitle}" (mode=${info.contextMode}) is now OPEN on the learner's screen. EXACT TARGET TEXT VISIBLE ON SCREEN: "${target}". Whenever the learner reads or answers from this popup, evaluate strictly word-for-word against THIS exact text! If they skip words, change words, or mispronounce words, explicitly tell them which words mismatched.]`,
                      },
                    ],
                  },
                ],
                turnComplete: false,
              },
            })
          );
        } catch {
          // Ignore non-fatal sync send errors
        }
      }
    },
    []
  );
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
  const [isMicHardwareReady, setIsMicHardwareReady] = useState<boolean>(false);
  const isMicHardwareReadyRef = useRef<boolean>(false);
  const isAcquiringHardwareMicRef = useRef<boolean>(false);
  const micCaptureHardFailedRef = useRef<boolean>(false);
  const micHealthCleanupRef = useRef<(() => void) | null>(null);
  const awaitingOpeningTurnRef = useRef<boolean>(false);
  const awaitingOpeningTimerRef = useRef<number | null>(null);
  const openingGreetingCompletedRef = useRef<boolean>(false);
  const userAudioBurstActiveRef = useRef<boolean>(false);
  const sentAudioSinceEndRef = useRef<boolean>(false);
  const userBurstEndTimerRef = useRef<number | null>(null);
  const preRollFramesRef = useRef<string[]>([]);
  const consecutiveSpeechFramesRef = useRef<number>(0);
  const bargeSpeechStreakRef = useRef<number>(0);
  const lastBargeInAtRef = useRef<number>(0);
  const bargeCandidateChunksRef = useRef<Float32Array[]>([]);
  const bargeCandidateSamplesRef = useRef<number>(0);
  const bargeCandidateRmsRef = useRef<number[]>([]);
  const bargeCandidatePitchSumRef = useRef<number>(0);
  const bargeCandidatePitchCountRef = useRef<number>(0);
  const bargeCandidateVoicedFramesRef = useRef<number>(0);
  const bargeCandidateSilenceRef = useRef<number>(0);
  const bargeVerifyInFlightRef = useRef<boolean>(false);
  const lastBargeVerifyAtRef = useRef<number>(0);
  const verifyEndpointUnavailableUntilRef = useRef<number>(0);
  const lastRealtimeCopilotKeyRef = useRef<string>('');
  const inFlightCopilotWasStreamingRef = useRef<boolean>(false);
  const resetBargeCandidate = () => {
    bargeCandidateChunksRef.current = [];
    bargeCandidateSamplesRef.current = 0;
    bargeCandidateRmsRef.current = [];
    bargeCandidatePitchSumRef.current = 0;
    bargeCandidatePitchCountRef.current = 0;
    bargeCandidateVoicedFramesRef.current = 0;
    bargeCandidateSilenceRef.current = 0;
  };
  const handyVadRef = useRef<HandyHumanVad>(
    new HandyHumanVad({
      threshold: 0.48,
      bargeInThreshold: isMobilePwaDevice() ? 0.60 : 0.68,
      prefillFrames: 15,
      hangoverFrames: 12,
      onsetFrames: 2,
      bargeInOnsetFrames: 5,
    })
  );
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
  const livePcmSchedulerRef = useRef<LivePcmStreamScheduler>(new LivePcmStreamScheduler());
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
  const lastSpokenAiTextRef = useRef<string>('');
  const lastSpokenAiLangRef = useRef<string>('ja');

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
    focusType:
      | 'grammar'
      | 'vocab'
      | 'kanji'
      | 'kana'
      | 'sentence_drill'
      | 'pte_describe_image'
      | 'pte_read_aloud'
      | 'pte_scorecard'
      | string;
    explanationText: string;
    patternFormula: string;
    drillInstruction: string;
    sampleTarget: string;
    uiAction?: VoiceUiAction;
    preferredExerciseMode?: 'multiple_choice' | 'cloze_gap' | 'sentence_blocks';
    quizSeed?: number;
    openNonce?: number;
  } | null>(null);

  useEffect(() => {
    if (learningWorkbench?.isOpen) {
      // m025-811: Pause Silero Neural VAD WASM (25-40 MB heap + 32ms main-thread ScriptProcessor)
      // while Whiteboard is open so Mobile PWA NEVER hits iOS Jetsam / Android OOM during slideshow!
      try {
        sileroVadGateRef.current?.pause();
      } catch {
        // Ignore
      }
      if (
        inputAudioCtxRef.current &&
        inputAudioCtxRef.current !== liveAudioCtxRef.current &&
        inputAudioCtxRef.current.state === 'running'
      ) {
        void inputAudioCtxRef.current.suspend().catch(() => {});
      }
      return;
    }
    if (!learningWorkbench?.isOpen) {
      activeWorkbenchTargetRef.current = {
        isOpen: false,
        contextMode: '',
        topicTitle: '',
        activeTargetText: '',
      };
      lastSyncedWorkbenchKeyRef.current = '';
      setLatestReadAloudAlignment(null);
      if (isLiveConnectedRef.current && !userHungUpRef.current) {
        if (
          inputAudioCtxRef.current &&
          inputAudioCtxRef.current !== liveAudioCtxRef.current &&
          inputAudioCtxRef.current.state === 'suspended'
        ) {
          void inputAudioCtxRef.current.resume().catch(() => {});
        }
        try {
          sileroVadGateRef.current?.resume();
        } catch {
          // Ignore
        }
      }
    }
  }, [learningWorkbench?.isOpen]);

  const [sswMasterState, setSswMasterState] = useState<SswMasterState>(() => loadSswMasterState());
  const [sswWorkbenchTab, setSswWorkbenchTab] = useState<SswWorkbenchTab>('roadmap');
  const [sswFocusPage, setSswFocusPage] = useState<number>(() => loadSswMasterState().lastFocusPage || 1);
  const [sswDrawnQuiz, setSswDrawnQuiz] = useState<SswDrawnQuestionPayload | null>(null);
  const [sswLatestGrade, setSswLatestGrade] = useState<SswGradeQuizResult | null>(null);
  const [showSswWorkbench, setShowSswWorkbench] = useState<boolean>(true);

  type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  const [userCefrLevel, setUserCefrLevel] = useState<CefrLevel>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = (localStorage.getItem('fz_user_cefr_level') || '').toUpperCase().trim();
        if (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(saved)) {
          return saved as CefrLevel;
        }
      }
    } catch {}
    return 'B1';
  });
  const [showCefrPicker, setShowCefrPicker] = useState<boolean>(false);

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

  const getParentWin = (): any => {
    try {
      if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
        return window.parent as any;
      }
    } catch {}
    return null;
  };

  const syncMicHardwareReadyState = () => {
    const parentWin = getParentWin();
    const activeStream =
      micStreamRef.current &&
      micStreamRef.current.getAudioTracks?.().some((t) => t.readyState === 'live')
        ? micStreamRef.current
        : parentWin?.__fzSharedMicStream &&
            parentWin.__fzSharedMicStream.getAudioTracks?.().some((t: any) => t.readyState === 'live')
          ? (parentWin.__fzSharedMicStream as MediaStream)
          : null;
    if (activeStream && micStreamRef.current !== activeStream) {
      micStreamRef.current = activeStream;
    }
    const hasLiveTrack = Boolean(
      activeStream?.getAudioTracks?.().some((t) => t.readyState === 'live')
    );
    const activeCtx =
      liveAudioCtxRef.current ||
      inputAudioCtxRef.current ||
      (parentWin?.__fzSharedLiveAudioCtx as AudioContext | undefined);
    const ctxRunning = activeCtx?.state === 'running';
    const ready = Boolean(hasLiveTrack && ctxRunning);
    if (isMicHardwareReadyRef.current !== ready) {
      isMicHardwareReadyRef.current = ready;
      setIsMicHardwareReady(ready);
    }
    return ready;
  };

  const ensureTurnByTurnBillingSession = (): boolean => {
    if (isLocalTestEnvironment()) return true;
    if (callBillingRef.current.active) {
      if (callBillingRef.current.outOfGemsAfterTurn) {
        setInsufficientGemModal({
          isOpen: true,
          balance: getHostGemBalance(),
          cost: KAWAN_BICARA_TURN_GEM_COST,
        });
        return false;
      }
      return true;
    }
    const hasDailyFree = getDailyFreeCallAvailable();
    const balance = getHostGemBalance();
    if (!hasDailyFree && balance < KAWAN_BICARA_MIN_START_GEMS) {
      setInsufficientGemModal({
        isOpen: true,
        balance,
        cost: KAWAN_BICARA_MIN_START_GEMS,
      });
      return false;
    }
    callBillingRef.current = {
      active: true,
      isDailyFree: hasDailyFree,
      dailyFreeMarked: false,
      aiVoiceTurnsDelivered: 0,
      gemsSpentThisCall: 0,
      turnMetered: false,
      outOfGemsAfterTurn: false,
    };
    setLiveBillingUi({ isDailyFree: hasDailyFree, turns: 0, gemsSpent: 0 });
    return true;
  };

  const requestStartLiveCall = (_isAutoCallTrigger = false) => {
    primeAudioPlayback();
    if (isLiveConnected || isLiveConnecting) return;
    const balance = getHostGemBalance();
    const hasDailyFree = getDailyFreeCallAvailable();
    const shouldStartImmediately =
      isLocalTestEnvironment() ||
      hasDailyFree ||
      balance >= KAWAN_BICARA_MIN_START_GEMS;
    if (shouldStartImmediately) {
      // Preserve synchronous user gesture for WebAudio + getUserMedia (Mochi SOS parity, 0 Gem deducted on start)
      const isFree = isLocalTestEnvironment() || hasDailyFree;
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
      setInsufficientGemModal(null);
      void startLiveCall();
      return;
    }
    setInsufficientGemModal({
      isOpen: true,
      balance,
      cost: KAWAN_BICARA_MIN_START_GEMS,
    });
  };

  const handleConfirmStartCall = () => {
    primeAudioPlayback();
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

  /** Unlocks Web Audio + one persistent HTMLAudioElement inside a user gesture (100% same-realm Mochi SOS parity). */
  const primeAudioPlayback = () => {
    try {
      const parentWin = getParentWin();
      const sharedParentCtx: AudioContext | null =
        (parentWin && typeof parentWin.__fzEnsureSharedLiveAudioCtx === 'function'
          ? parentWin.__fzEnsureSharedLiveAudioCtx()
          : null) ||
        (parentWin?.__fzSharedLiveAudioCtx && parentWin.__fzSharedLiveAudioCtx.state !== 'closed'
          ? (parentWin.__fzSharedLiveAudioCtx as AudioContext)
          : null);
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (sharedParentCtx || AudioCtx) {
        if (sharedParentCtx && sharedParentCtx.state !== 'closed') {
          liveAudioCtxRef.current = sharedParentCtx;
          ttsAudioCtxRef.current = sharedParentCtx;
        } else if (AudioCtx) {
          if (!ttsAudioCtxRef.current || ttsAudioCtxRef.current.state === 'closed') {
            try {
              ttsAudioCtxRef.current = new AudioCtx({ latencyHint: 'balanced' });
            } catch {
              ttsAudioCtxRef.current = new AudioCtx();
            }
          }
          if (!liveAudioCtxRef.current || liveAudioCtxRef.current.state === 'closed') {
            try {
              liveAudioCtxRef.current = new AudioCtx({ latencyHint: 'balanced' });
            } catch {
              liveAudioCtxRef.current = new AudioCtx();
            }
            nextStartTimeRef.current = liveAudioCtxRef.current.currentTime;
          }
        }
        if (ttsAudioCtxRef.current && ttsAudioCtxRef.current.state === 'suspended') {
          void ttsAudioCtxRef.current.resume().catch(() => {});
        }
        const liveCtx = liveAudioCtxRef.current;
        if (liveCtx) {
          registerSfxHostAudioContext(liveCtx);
          registerSharedBoardAudioContext(liveCtx);
          liveCtx.onstatechange = () => {
            if (
              (liveCtx.state === 'suspended' || (liveCtx.state as string) === 'interrupted') &&
              (isLiveConnectedRef.current || isLiveConnectingRef.current) &&
              !userHungUpRef.current
            ) {
              setDuplexAudioSessionMode(true);
              void liveCtx.resume().catch(() => {});
            }
            syncMicHardwareReadyState();
          };
          outputAudioCtxRef.current = liveCtx;
          inputAudioCtxRef.current = liveCtx;
          // CRITICAL: Never reset nextStartTimeRef.current to liveCtx.currentTime on pointerdown/keydown
          // while activeSourcesRef chunks are already queued in the future!
          if (activeSourcesRef.current.length === 0 && nextStartTimeRef.current < liveCtx.currentTime) {
            nextStartTimeRef.current = liveCtx.currentTime;
          }
          if (liveCtx.state === 'suspended' || (liveCtx.state as string) === 'interrupted') {
            void liveCtx.resume().then(() => {
              syncMicHardwareReadyState();
            }).catch(() => {});
          }
          try {
            const silentBuf = liveCtx.createBuffer(1, 1, liveCtx.sampleRate || 24000);
            const silentSrc = liveCtx.createBufferSource();
            silentSrc.buffer = silentBuf;
            silentSrc.connect(liveCtx.destination);
            silentSrc.start(0);
          } catch {
            // Ignore
          }
        }
        syncMicHardwareReadyState();
      }
    } catch {
      // Ignore
    }
    if (isLiveConnectedRef.current || isLiveConnectingRef.current || isAcquiringHardwareMicRef.current) {
      setDuplexAudioSessionMode(true);
      return;
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
    const onGesture = () => {
      try {
        const liveRunning = liveAudioCtxRef.current && liveAudioCtxRef.current.state === 'running';
        const ttsRunning = ttsAudioCtxRef.current && ttsAudioCtxRef.current.state === 'running';
        if (!liveRunning || !ttsRunning) {
          primeAudioPlayback();
        }
        if (liveAudioCtxRef.current && liveAudioCtxRef.current.state === 'suspended') {
          void liveAudioCtxRef.current.resume().catch(() => {});
        }
        if (ttsAudioCtxRef.current && ttsAudioCtxRef.current.state === 'suspended') {
          void ttsAudioCtxRef.current.resume().catch(() => {});
        }
      } catch {}
    };
    window.addEventListener('touchstart', onGesture, { passive: true, capture: true });
    window.addEventListener('pointerdown', onGesture, { passive: true, capture: true });
    window.addEventListener('click', onGesture, { passive: true, capture: true });
    window.addEventListener('keydown', onGesture, { passive: true, capture: true });
    return () => {
      window.removeEventListener('touchstart', onGesture, true);
      window.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('click', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
      micHealthCleanupRef.current?.();
      micHealthCleanupRef.current = null;
      setDuplexAudioSessionMode(false);
      registerSfxHostAudioContext(null);
    };
  }, []);

  const locale: LearnerLocale = brainState.learnerLocale || 'en';
  const targetLang: TargetLang = brainState.targetLang || 'en';

  const scenariosForLang = CALL_SCENARIOS.filter((s) => s.targetLang === targetLang);
  const activeScenario: CallScenario =
    scenariosForLang.find((s) => s.id === activeScenarioId) ||
    scenariosForLang[0] ||
    CALL_SCENARIOS[0];
  const activePersona =
    VOICE_PERSONAS[selectedPersonaId] && VOICE_PERSONAS[selectedPersonaId].targetLang === targetLang
      ? VOICE_PERSONAS[selectedPersonaId]
      : (VOICE_PERSONAS[activeScenario.personaId] ||
          (targetLang === 'ja'
            ? VOICE_PERSONAS.nanami
            : targetLang === 'zh'
            ? VOICE_PERSONAS.xiao_mochi
            : VOICE_PERSONAS.coach_alex));
  const activeScenarioRef = useRef<CallScenario>(activeScenario);
  activeScenarioRef.current = activeScenario;
  const activePersonaRef = useRef(activePersona);
  activePersonaRef.current = activePersona;

  // Note: Opening line TTS is synthesized on demand when the user clicks "Putar Suara" or starts a call,
  // preserving 100% of the Gemini API rate-limit quota for active user interactions.

  const isSswSensei =
    activePersona.id === 'ssw_sensei' ||
    activeScenario.personaId === 'ssw_sensei' ||
    activeScenario.id.startsWith('scen_ssw_');

  useEffect(() => {
    if (!isSswSensei) return;
    void ensureSswFullKnowledgeLoaded();
    const syncState = (ev?: Event) => {
      const detail = (ev as CustomEvent<SswMasterState> | undefined)?.detail;
      setSswMasterState(detail || loadSswMasterState());
    };
    const syncPage = (ev?: Event) => {
      const p = (ev as CustomEvent<{ page?: number }> | undefined)?.detail?.page;
      if (typeof p === 'number' && Number.isFinite(p)) {
        setSswFocusPage(Math.max(1, Math.min(SSW_MASTER_KB.meta.totalPdfPages || 91, Math.round(p))));
      }
      setSswMasterState(loadSswMasterState());
    };
    window.addEventListener(SSW_STATE_UPDATED_EVENT, syncState as EventListener);
    window.addEventListener(SSW_FOCUS_PAGE_EVENT, syncPage as EventListener);
    window.addEventListener(SSW_FOCUS_STEP_EVENT, syncPage as EventListener);
    return () => {
      window.removeEventListener(SSW_STATE_UPDATED_EVENT, syncState as EventListener);
      window.removeEventListener(SSW_FOCUS_PAGE_EVENT, syncPage as EventListener);
      window.removeEventListener(SSW_FOCUS_STEP_EVENT, syncPage as EventListener);
    };
  }, [isSswSensei]);

  const handleDrawSswQuiz = (mode: SswQuizDrawMode, topicTag?: string) => {
    setSswLatestGrade(null);
    setSswWorkbenchTab('quiz');
    setShowSswWorkbench(true);
    void drawSswQuizQuestionAsync({ mode, topicTag, preferWeakOrUnseen: true }).then((drawn) => {
      setSswDrawnQuiz(drawn);
      setSswMasterState(loadSswMasterState());
      setSswFocusPage(drawn.tryoutPdfPage);
    });
  };

  const handleAnswerSswQuiz = (quizId: string, choiceLetter: string) => {
    void gradeSswQuizAnswerAsync({ quizId, userAnswer: choiceLetter }).then((res) => {
      setSswLatestGrade(res);
      setSswMasterState(res.state);
      if (res.discussionPdfPage) {
        setSswFocusPage(res.discussionPdfPage);
      }
    });
  };

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
        { syncOnly: true, locale: targetLoc }
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
      cefrLevelOverride?: CefrLevel;
    }
  ) => {
    const cleanAi = String(aiLine || '').trim();
    if (!cleanAi) return;
    const scen = opts?.scenarioOverride || activeScenario;
    const pers = opts?.personaOverride || activePersona;
    const effectiveCefrLevel = opts?.cefrLevelOverride || userCefrLevel;
    const popupTarget = activeWorkbenchTargetRef.current.isOpen
      ? activeWorkbenchTargetRef.current.activeTargetText
      : undefined;
    const popupMode = activeWorkbenchTargetRef.current.isOpen
      ? activeWorkbenchTargetRef.current.contextMode
      : undefined;
    const dedupKey = `${scen.id}::${scen.targetLang}::${popupMode || ''}::${(popupTarget || '').slice(0, 60)}::${cleanAi}::${lastUserLine}::${effectiveCefrLevel}`;

    const isCambridge =
      pers?.id === 'cambridge_examiner' ||
      scen?.personaId === 'cambridge_examiner' ||
      scen?.id.startsWith('scen_ielts') ||
      pers?.id === 'dr_julian' ||
      scen?.personaId === 'dr_julian' ||
      scen?.id.startsWith('scen_pte');

    // INSTANT OPTIMISTIC ZERO-LATENCY COPILOT (<50ms):
    // Synthesize calibrated answer immediately so the learner NEVER suffers from network lag/spinners!
    const instantCards = buildContextualFallbackCards({
      aiText: cleanAi,
      targetLang: scen.targetLang,
      locale,
      lastUserText: lastUserLine,
      variationSeed: opts?.forceVariation ? copilotVariationSeedRef.current : 0,
      excludeTexts: opts?.excludeTexts,
      isCambridge,
      personaId: pers?.id,
      cefrLevel: effectiveCefrLevel,
      activePopupTargetText: popupTarget,
      activePopupMode: popupMode,
    });

    if (!opts?.forceVariation) {
      if (lastRealtimeCopilotKeyRef.current === dedupKey && copilotCardsRef.current.length > 0) {
        return;
      }
      if (
        inFlightCopilotKeyRef.current === dedupKey &&
        (opts?.isDebouncedStreaming || !inFlightCopilotWasStreamingRef.current)
      ) {
        if (copilotCardsRef.current.length === 0 && instantCards.length > 0) {
          lastCopilotAiKeyRef.current = dedupKey;
          setCopilotCards(isCambridge ? instantCards.slice(0, 1) : instantCards);
          setCopilotSource('ai-realtime');
          setIsGeneratingCopilot(false);
        }
        return;
      }
    }

    const currentSeq = ++copilotSeqRef.current;

    if (instantCards.length > 0) {
      lastCopilotAiKeyRef.current = dedupKey;
      setCopilotCards(isCambridge ? instantCards.slice(0, 1) : instantCards);
      setCopilotSource('ai-realtime');
      setIsGeneratingCopilot(false);
    } else {
      setIsGeneratingCopilot(true);
      if (
        !opts?.isDebouncedStreaming &&
        (copilotCardsRef.current.length === 0 || lastCopilotAiKeyRef.current !== dedupKey)
      ) {
        lastCopilotAiKeyRef.current = dedupKey;
        setCopilotSource('loading');
        setCopilotCards([]);
      }
    }

    const instantMeaning = translateAndPhoneticizeLiveText(cleanAi, scen.targetLang);
    const isSswCopilot =
      pers?.id === 'ssw_sensei' ||
      scen?.personaId === 'ssw_sensei' ||
      scen?.id.startsWith('scen_ssw_');
    if (
      (instantMeaning.translationId || instantMeaning.translationTh) &&
      (!isSswCopilot || !/[A-Za-z]{3,}/.test(cleanAi))
    ) {
      setTurns((prev) =>
        prev.map((tr) => {
          if (tr.speaker !== 'ai' || tr.text.trim() !== cleanAi) return tr;
          return {
            ...tr,
            translationId: tr.translationId || instantMeaning.translationId,
            translationTh: tr.translationTh || instantMeaning.translationTh,
          };
        })
      );
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
    inFlightCopilotWasStreamingRef.current = Boolean(opts?.isDebouncedStreaming);

    try {
      const res = await requestRealtimeCopilotAssist({
        aiText: cleanAi,
        lastUserText: lastUserLine,
        scenario: scen,
        persona: pers,
        targetLang: scen.targetLang,
        locale,
        cefrLevel: effectiveCefrLevel,
        history: historyList.slice(-8),
        variationSeed: opts?.forceVariation ? copilotVariationSeedRef.current : 0,
        excludeTexts: opts?.excludeTexts,
        signal: controller.signal,
        budgetMs: opts?.isDebouncedStreaming ? 2500 : 4500,
        activePopupTargetText: popupTarget,
        activePopupMode: popupMode,
      });
      if (
        controller.signal.aborted ||
        copilotSeqRef.current !== currentSeq ||
        activeScenarioRef.current.targetLang !== scen.targetLang
      ) {
        return;
      }
      const rawList = res.replies || res.cards || [];
      const validCards = rawList.filter((c) => c.isRealtimeAi && !c.isOfflineFallback);
      const nonFallbackCards = rawList.filter((c) => !c.isOfflineFallback);
      if (validCards.length > 0) {
        lastCopilotAiKeyRef.current = dedupKey;
        lastRealtimeCopilotKeyRef.current = dedupKey;
        setCopilotCards(isCambridge ? validCards.slice(0, 1) : validCards);
        setCopilotSource('ai-realtime');
      } else if (
        nonFallbackCards.length > 0 &&
        (!instantCards || instantCards.length === 0 || lastRealtimeCopilotKeyRef.current !== dedupKey)
      ) {
        lastCopilotAiKeyRef.current = dedupKey;
        setCopilotCards(isCambridge ? nonFallbackCards.slice(0, 1) : nonFallbackCards);
        setCopilotSource('ai-realtime');
      } else if (rawList.length > 0 && (!instantCards || instantCards.length === 0)) {
        lastCopilotAiKeyRef.current = dedupKey;
        setCopilotCards(isCambridge ? rawList.slice(0, 1) : rawList);
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
      if (
        controller.signal.aborted ||
        copilotSeqRef.current !== currentSeq ||
        activeScenarioRef.current.targetLang !== scen.targetLang
      ) {
        return;
      }
    } finally {
      if (copilotAbortRef.current === controller) {
        copilotAbortRef.current = null;
        if (inFlightCopilotKeyRef.current === dedupKey) {
          inFlightCopilotKeyRef.current = '';
          inFlightCopilotWasStreamingRef.current = false;
        }
      }
      if (copilotSeqRef.current === currentSeq && activeScenarioRef.current.targetLang === scen.targetLang) {
        setIsGeneratingCopilot(false);
        if (copilotCardsRef.current.length === 0 && instantCards.length > 0) {
          setCopilotCards(isCambridge ? instantCards.slice(0, 1) : instantCards);
          setCopilotSource('ai-realtime');
        }
      }
    }
  };

  const triggerRealtimeCopilotRef = useRef(triggerRealtimeCopilotForAi);
  triggerRealtimeCopilotRef.current = triggerRealtimeCopilotForAi;

  const handleSelectCefrLevel = (lvl: CefrLevel) => {
    playFiezelSfx('button_tap');
    setUserCefrLevel(lvl);
    setShowCefrPicker(false);
    try {
      localStorage.setItem('fz_user_cefr_level', lvl);
    } catch {}

    const activeText = activeAiLiveText || (turns.slice().reverse().find((t) => t.speaker === 'ai')?.text) || '';
    if (activeText) {
      void triggerRealtimeCopilotForAi(
        activeText,
        lastUserTurn?.text || '',
        turns.map((tr) => ({ speaker: tr.speaker, text: tr.text })),
        { forceVariation: true, cefrLevelOverride: lvl }
      );
    }
  };

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
          : locale === 'id'
            ? 'Kawan Bicara membutuhkan koneksi internet aktif untuk percakapan Fiezel realtime.'
            : 'Voice Partner requires an active internet connection for real-time Fiezel conversation.'
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
      locale === 'id'
        ? activePersona.openingGreetingTranslationId || activeScenario.openingTranslationId
        : activePersona.openingGreetingTranslationEn ||
          scenarioMetaForLocale(locale, activeScenario).openingTranslation ||
          '';
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
    } else {
      setCopilotCards([]);
      setCopilotSource('loading');
    }

    try {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    } catch {
      // Ignore
    }
  }, [activeScenario.id, activeScenario.targetLang]);

  // Persist conversation turns across refreshes without bloating localStorage with heavy board trees or stale scenarios
  useEffect(() => {
    if (turns.length > 0) {
      const sessionKey = `fz_kaiwa_turns_${activeScenario.targetLang}_${activeScenario.id}`;
      try {
        if (typeof localStorage !== 'undefined') {
          const compactTurns = turns.slice(-24).map((tr) => ({
            id: tr.id,
            speaker: tr.speaker,
            text: tr.text,
            translationId: tr.translationId,
            translationTh: tr.translationTh,
            timestamp: tr.timestamp,
          }));
          localStorage.setItem(sessionKey, JSON.stringify(compactTurns));
          const kaiwaKeys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('fz_kaiwa_turns_') && k !== sessionKey) kaiwaKeys.push(k);
          }
          if (kaiwaKeys.length > 5) {
            kaiwaKeys.slice(0, kaiwaKeys.length - 5).forEach((oldKey) => {
              try {
                localStorage.removeItem(oldKey);
              } catch {}
            });
          }
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
        requestAnimationFrame(() => {
          if (mainScrollRef.current) {
            mainScrollRef.current.scrollTo({
              top: mainScrollRef.current.scrollHeight,
              behavior: 'smooth',
            });
          } else if (transcriptContainerRef.current) {
            transcriptContainerRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'end',
            });
          }
        });
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
      locale === 'id'
        ? activePersona.openingGreetingTranslationId || activeScenario.openingTranslationId
        : activePersona.openingGreetingTranslationEn ||
          scenarioMetaForLocale(locale, activeScenario).openingTranslation ||
          '';
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

  const invalidateInFlightCopilot = () => {
    copilotSeqRef.current += 1;
    if (copilotAbortRef.current) {
      try {
        copilotAbortRef.current.abort();
      } catch {
        // Ignore
      }
      copilotAbortRef.current = null;
    }
    inFlightCopilotKeyRef.current = '';
    lastCopilotAiKeyRef.current = '';
    lastRealtimeCopilotKeyRef.current = '';
    setCopilotCards([]);
    setCopilotSource('loading');
    setIsGeneratingCopilot(true);
  };

  const handleSelectTargetLang = (lang: TargetLang) => {
    playFiezelSfx('button_tap');
    stopLiveCall();
    invalidateInFlightCopilot();
    isWorkbenchExplanationActiveRef.current = false;
    setLearningWorkbench(null);
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
    activeScenarioRef.current = firstScenario;
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
    invalidateInFlightCopilot();
    isWorkbenchExplanationActiveRef.current = false;
    setLearningWorkbench(null);
    setSelectedPersonaId(pId);
    try {
      localStorage.setItem('fiezel_voice_persona_pref', pId);
    } catch {}
    const matchingScen =
      CALL_SCENARIOS.find((s) => s.targetLang === p.targetLang && s.personaId === pId && s.id.includes('free')) ||
      CALL_SCENARIOS.find((s) => s.targetLang === p.targetLang && s.personaId === pId) ||
      activeScenario;
    if (matchingScen && matchingScen.id !== activeScenarioId) {
      activeScenarioRef.current = matchingScen;
      setActiveScenarioId(matchingScen.id);
      try {
        localStorage.setItem('fiezel_voice_scenario_pref', matchingScen.id);
      } catch {}
    }
    playFiezelSfx('button_tap');
    if (isLiveConnectedRef.current) {
      stopLiveCall();
    }
    const lineToSay = p.openingGreeting || matchingScen.openingLine;
    const transId =
      locale === 'id'
        ? p.openingGreetingTranslationId || matchingScen.openingTranslationId
        : p.openingGreetingTranslationEn ||
          scenarioMetaForLocale(locale, matchingScen).openingTranslation ||
          '';
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
    if (!matchingScen || matchingScen.id === activeScenarioId) {
      void triggerRealtimeCopilotForAi(
        lineToSay,
        '',
        [{ speaker: 'ai', text: lineToSay }],
        { scenarioOverride: matchingScen, personaOverride: p }
      );
    }
    if (lineToSay) {
      void speakAiText(lineToSay, null, undefined, {
        spokenLang: p.id === 'ssw_sensei' ? 'id' : p.targetLang,
        personaOverride: p,
      });
    }
    setShowPersonaModal(false);
  };

  const handleSelectScenario = (scenId: string) => {
    const scen = CALL_SCENARIOS.find((s) => s.id === scenId);
    if (!scen) return;
    invalidateInFlightCopilot();
    isWorkbenchExplanationActiveRef.current = false;
    setLearningWorkbench(null);
    activeScenarioRef.current = scen;
    setActiveScenarioId(scen.id);
    try {
      localStorage.setItem('fiezel_voice_scenario_pref', scen.id);
    } catch {}
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
    const transId =
      locale === 'id'
        ? p.openingGreetingTranslationId || scen.openingTranslationId
        : p.openingGreetingTranslationEn ||
          scenarioMetaForLocale(locale, scen).openingTranslation ||
          '';
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
        spokenLang: p.id === 'ssw_sensei' || scen.id.startsWith('scen_ssw_') ? 'id' : scen.targetLang,
        personaOverride: p,
      });
    }
    setShowPersonaModal(false);
  };

  const handleSelectLocale = (nextLocale: LearnerLocale) => {
    playFiezelSfx('button_tap');
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('fiezel_lang_chosen', nextLocale);
      }
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('locale', nextLocale);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      // Ignore
    }
    const nextState = saveBraincoreState({ ...brainStateRef.current, learnerLocale: nextLocale });
    brainStateRef.current = nextState;
    setBrainState(nextState);
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
    const isSswVoice =
      persToUse?.id === 'ssw_sensei' || activeScenario.id.startsWith('scen_ssw_');
    const hasLatinForSsw = isSswVoice && (text.match(/[A-Za-z]{2,}/g) || []).length >= 2;
    const langToUse = hasLatinForSsw
      ? ('id' as TargetLang)
      : (spokenLang as TargetLang) || persToUse?.targetLang || activeScenario.targetLang;
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
    const hadActiveTts = Boolean(playbackSettleRef.current || ttsSourceNodeRef.current);
    if (playbackSettleRef.current) {
      const settle = playbackSettleRef.current;
      playbackSettleRef.current = null;
      settle();
    }
    if (
      hadActiveTts &&
      !isLiveConnectedRef.current &&
      activeSourcesRef.current.length === 0 &&
      mochiInstanceRef.current?.setTalking
    ) {
      try {
        mochiInstanceRef.current.setTalking(false);
      } catch {
        // Ignore
      }
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
    onDone: () => void,
    chunkSpokenText?: string
  ): Promise<boolean> => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      if (!ttsAudioCtxRef.current || ttsAudioCtxRef.current.state === 'closed') {
        ttsAudioCtxRef.current = new AudioCtx();
      }
      const ctx = ttsAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        await Promise.race([
          new Promise<void>((r) => setTimeout(r, 150)),
          (async () => { await ctx.resume().catch(() => {}); })(),
        ]);
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

      // Feed exact audio duration to Mochi's text-to-viseme phonetic sequencer
      const exactDuration = decoded.duration / Math.max(0.1, targetRate);
      const visemeText = chunkSpokenText || lastSpokenAiTextRef.current;
      if (visemeText && mochiInstanceRef.current?.speakPhrase) {
        try {
          mochiInstanceRef.current.speakPhrase(
            visemeText,
            lastSpokenAiLangRef.current || 'ja',
            exactDuration
          );
        } catch {
          // Ignore
        }
      }

      src.onended = () => {
        if (ttsSourceNodeRef.current === src) ttsSourceNodeRef.current = null;
        if (!isLiveConnectedRef.current && activeSourcesRef.current.length === 0 && mochiInstanceRef.current?.setTalking) {
          try {
            mochiInstanceRef.current.setTalking(false);
          } catch {
            // Ignore
          }
        }
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
   * Unlocked Web Audio first (connects to ttsAnalyserRef for live 3D Mochi visemes),
   * then HTMLAudio element, never browser `speechSynthesis`.
   * Resolves `true` when audio actually started.
   */
  const playNeuralChunk = (
    audioBase64: string,
    audioMime: string,
    targetRate: number,
    chunkSpokenText?: string
  ): Promise<boolean> =>
    new Promise<boolean>(async (resolve) => {
      let settled = false;
      let started = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        clearSpeechWatchdog();
        if (!isLiveConnectedRef.current && activeSourcesRef.current.length === 0 && mochiInstanceRef.current?.setTalking) {
          try {
            mochiInstanceRef.current.setTalking(false);
          } catch {
            // Ignore
          }
        }
        if (playbackSettleRef.current === settle) playbackSettleRef.current = null;
        resolve(started);
      };
      playbackSettleRef.current = settle;

      // 1. Primary: Unlocked Web Audio context connects directly to ttsAnalyserRef for real 60 FPS Mochi visemes!
      try {
        const okWeb = await playNeuralBase64ViaWebAudio(
          audioBase64,
          targetRate,
          () => settle(),
          chunkSpokenText
        );
        if (okWeb) {
          started = true;
          return;
        }
      } catch (_) {
        // Fall back to HTMLAudioElement
      }

      // 2. Fallback: HTMLAudioElement
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
          audio.onpause = done;
          if (lastSpokenAiTextRef.current && mochiInstanceRef.current?.speakPhrase) {
            try {
              const exactDur = (audio.duration && Number.isFinite(audio.duration) ? audio.duration : Math.max(1.0, lastSpokenAiTextRef.current.length * 0.12)) / Math.max(0.1, targetRate);
              mochiInstanceRef.current.speakPhrase(
                lastSpokenAiTextRef.current,
                lastSpokenAiLangRef.current || 'en',
                exactDur
              );
            } catch {
              // Ignore
            }
          }
        })
        .catch(async () => {
          detach();
          settle();
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

    // Never allow automatic background HTTP TTS to interrupt or overlap with an active/connecting Gemini 3.8 Live WebSocket call
    // or an open Papan Belajar workbench (which runs its own unified single-track narration).
    if (((isLiveConnectedRef.current || isLiveConnectingRef.current) || isWorkbenchOpenRef.current) && !opts?.isManualReplay) {
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

    const resolvedLang = opts?.spokenLang || (activeScenario?.targetLang as string) || (typeof window !== 'undefined' && (window as any).jaCourseOn?.() ? 'ja' : 'en');
    lastSpokenAiTextRef.current = cleanSpoken;
    lastSpokenAiLangRef.current = resolvedLang;

    // Split only long replies (> 420 chars) cleanly at sentence boundaries so neither worker TTS
    // nor live failover WAV timeouts clip multi-sentence beginner explanations mid-thought.
    const splitTtsChunksAtSentenceBoundaries = (raw: string, maxLen = 420): string[] => {
      const s = String(raw || '').trim();
      if (!s || s.length <= maxLen) return s ? [s] : [];
      const sentences = s.match(/[^.!?。！？]+[.!?。！？]*["'”’)]*\s*/g) || [s];
      const out: string[] = [];
      let cur = '';
      for (const piece of sentences) {
        const seg = piece.trim();
        if (!seg) continue;
        if (!cur) {
          if (seg.length <= maxLen) {
            cur = seg;
          } else {
            // Word-boundary split if a single unpunctuated sentence exceeds maxLen
            const words = seg.split(/\s+/);
            let sub = '';
            for (const w of words) {
              if (!sub) sub = w;
              else if (sub.length + 1 + w.length <= maxLen) sub += ' ' + w;
              else {
                out.push(sub);
                sub = w;
              }
            }
            if (sub) cur = sub;
          }
        } else if (cur.length + 1 + seg.length <= maxLen) {
          cur += ' ' + seg;
        } else {
          out.push(cur);
          cur = seg;
        }
      }
      if (cur) out.push(cur);
      return out.length > 0 ? out : [s];
    };

    const chunks = preloadedBase64
      ? [cleanSpoken]
      : splitTtsChunksAtSentenceBoundaries(cleanSpoken, 420);
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
    let anyAudio = false;
    let anyPlayed = false;
    try {
      for (let i = 0; i < chunks.length; i++) {
        const currentJob = nextAudioJob || fetchChunk(i);
        nextAudioJob = i + 1 < chunks.length ? fetchChunk(i + 1) : null;
        const res = await currentJob;
        if (token !== speakTokenRef.current) return;
        if ((isLiveConnectedRef.current || isLiveConnectingRef.current) && !opts?.isManualReplay) {
          return;
        }
        if (!res?.audioBase64) continue;
        anyAudio = true;
        setAiAudioPlaying(true);
        const ok = await playNeuralChunk(
          res.audioBase64,
          res.audioMimeType || 'audio/mpeg',
          targetRate,
          chunks[i]
        );
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
              : locale === 'id'
                ? 'Peramban menahan pemutaran otomatis. Ketuk "Putar Suara" untuk mendengar balasan.'
                : 'Browser blocked autoplay. Tap "Play Voice" to hear the reply.'
          );
          break;
        }
      }
      if (!anyAudio) {
        // NEURAL-ONLY VOICE INVARIANT: Never fall back to robotic OS window.speechSynthesis!
        setStatusBanner(
          locale === 'th'
            ? 'เสียง Neural กำลังเชื่อมต่อใหม่ ข้อความยังแสดงอยู่ แตะ "เล่นเสียง" เพื่อลองอีกครั้ง'
            : locale === 'id'
              ? 'Suara Fiezel sedang menyambung ulang. Teks balasan tetap tampil, ketuk "Putar Suara" untuk mencoba lagi.'
              : 'Fiezel voice is reconnecting. Text reply stays visible, tap "Play Voice" to retry.'
        );
      }
    } catch {
      // Ignore, the reply text stays on screen and can be replayed.
    } finally {
      if (token === speakTokenRef.current) {
        clearSpeechWatchdog();
        if (!isLiveConnectedRef.current && activeSourcesRef.current.length === 0) {
          setAiAudioPlaying(false, 250);
          if (mochiInstanceRef.current?.setTalking) {
            try {
              mochiInstanceRef.current.setTalking(false);
            } catch {
              // Ignore
            }
          }
        }
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
   * Filter non-lexical fillers/noise tags or speaker echo returned by speech verification/ASR
   * so vehicle noise, short grunts, and AI's own voice never count as interrupting human speech.
   */
  const isSelfEchoOrNonLexical = (transcript: string, aiText: string): boolean => {
    const raw = String(transcript || '').trim();
    if (!raw) return true;
    if (/^[\[\(*].*[\]\)*]$/.test(raw)) return true;
    const strippedNoise = raw
      .replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*/g, ' ')
      .replace(/[.,!?;:'"~…\-\u2013\u2014。、！？「」『』]/g, ' ')
      .trim();
    if (!strippedNoise) return true;
    const lexicalOnly = strippedNoise.replace(/[\s\d]/g, '');
    if (lexicalOnly.length < 2 && !/[\u3040-\u30FF\u4E00-\u9FFF]/.test(lexicalOnly)) return true;
    if (
      /^(uh+|um+|umm+|er+|err+|hm+|hmm+|mm+|ah+|oh+|eh+|ha+|brr+|vroom+|shh+|pff+|tsk+|noise|static|horn|vehicle|engine|music|applause|laughter|cough)$/i.test(
        strippedNoise
      )
    ) {
      return true;
    }
    const cleanAi = String(aiText || '')
      .toLowerCase()
      .replace(/[^a-z0-9\u00c0-\u024f\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const cleanUser = strippedNoise
      .toLowerCase()
      .replace(/[^a-z0-9\u00c0-\u024f\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanUser) return true;
    if (cleanAi && cleanUser.length >= 4) {
      if (cleanAi.includes(cleanUser)) return true;
      const userWords = cleanUser.split(' ').filter((w) => w.length >= 2);
      if (userWords.length >= 2) {
        const aiWordSet = new Set(cleanAi.split(' ').filter((w) => w.length >= 2));
        let overlap = 0;
        for (const w of userWords) {
          if (aiWordSet.has(w)) overlap += 1;
        }
        if (overlap / userWords.length >= 0.75) return true;
      }
    }
    return false;
  };

  const commitVerifiedSpeechInterrupt = (samples16k: Float32Array) => {
    lastBargeInAtRef.current = Date.now();
    suppressAiAudioForTurnRef.current = true;
    interruptAiAndStartListening();
    const durationMs = Math.max(120, Math.round((samples16k.length / 16000) * 1000));
    turnAcousticTrackerRef.current.recordAudioFrame({
      chunkMs: durationMs,
      voicedMs: durationMs,
      isActiveVoice: true,
      confirmedSpeech: true,
    });
    userAudioBurstActiveRef.current = true;
    if (!isUserSpeakingLiveRef.current) {
      isUserSpeakingLiveRef.current = true;
      setIsUserSpeakingLive(true);
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isLiveConnectedRef.current) {
      const sliceLen = 2048;
      for (let off = 0; off < samples16k.length; off += sliceLen) {
        const end = Math.min(samples16k.length, off + sliceLen);
        const pcmBase64 = float32At16kToPcm16Base64(samples16k.subarray(off, end));
        if (pcmBase64) {
          sentAudioSinceEndRef.current = true;
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
    }
    scheduleUserBurstEnd();
  };

  const runLanguageVerifiedBargeIn = async (
    samples16k: Float32Array,
    rmsSeries: number[],
    avgPitchCorr: number,
    voicedFramesCount: number
  ) => {
    if (bargeVerifyInFlightRef.current) return;
    if (!samples16k || samples16k.length < 4096) return;
    if (!hasDynamicSpeechModulation(rmsSeries)) return;
    const stillAiActive =
      isPlayingAiAudioRef.current || isAiServerTurnOpenRef.current || activeSourcesRef.current.length > 0;
    if (!stillAiActive || awaitingOpeningTurnRef.current) return;

    bargeVerifyInFlightRef.current = true;
    lastBargeVerifyAtRef.current = Date.now();
    try {
      let res: {
        reached: boolean;
        hasLanguage: boolean;
        isEchoOnly: boolean;
        transcript: string;
        detectedLang?: string;
      } = { reached: false, hasLanguage: false, isEchoOnly: false, transcript: '' };

      if (Date.now() >= verifyEndpointUnavailableUntilRef.current) {
        const wavBase64 = encodeFloat32At16kToWavBase64(samples16k);
        res = await verifySpokenLanguageAudio({
          audioBase64: wavBase64,
          mimeType: 'audio/wav',
          targetLang: activeScenario.targetLang,
          locale,
          aiCurrentText: liveAiDraftRef.current || lastSpokenAiTextRef.current,
          timeoutMs: 1800,
        });
        if (!res.reached) {
          verifyEndpointUnavailableUntilRef.current = Date.now() + 5000;
        }
      }

      const stillPlayingAfterVerify =
        isPlayingAiAudioRef.current || isAiServerTurnOpenRef.current || activeSourcesRef.current.length > 0;
      if (!stillPlayingAfterVerify || isMicMutedRef.current) return;

      const activeAiText = liveAiDraftRef.current || lastSpokenAiTextRef.current || '';
      if (res.reached) {
        if (
          res.hasLanguage === true &&
          !res.isEchoOnly &&
          !isSelfEchoOrNonLexical(res.transcript, activeAiText)
        ) {
          commitVerifiedSpeechInterrupt(samples16k);
        }
        return;
      }

      if (voicedFramesCount >= 4 && avgPitchCorr >= 0.44) {
        commitVerifiedSpeechInterrupt(samples16k);
        return;
      }

      resetBargeCandidate();
      return;
    } finally {
      bargeVerifyInFlightRef.current = false;
    }
  };

  /**
   * Instant Barge-In (Menyela AI seperti di ChatGPT Voice).
   * Memotong seketika audio balasan Mochi dan mengembalikan kendali mic ke murid.
   */
  const interruptAiAndStartListening = () => {
    bargeSpeechStreakRef.current = 0;
    resetBargeCandidate();
    clearLiveTurnAutoCommitTimer();
    clearLiveAiDraftUiTimer();
    speakTokenRef.current += 1;
    isAiServerTurnOpenRef.current = false;
    liveTurnFinalizedForCurrentAiTurnRef.current = false;
    awaitingPostToolResponseRef.current = false;
    if (liveGenCompleteTimerRef.current) {
      window.clearTimeout(liveGenCompleteTimerRef.current);
      liveGenCompleteTimerRef.current = null;
    }
    awaitingOpeningTurnRef.current = false;
    if (awaitingOpeningTimerRef.current) {
      window.clearTimeout(awaitingOpeningTimerRef.current);
      awaitingOpeningTimerRef.current = null;
    }
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
    livePcmSchedulerRef.current.reset(outputAudioCtxRef.current, activeSourcesRef.current as any);
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
    nextStartTimeRef.current = livePcmSchedulerRef.current.getNextStartTime();
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

  const consumeTurnAcousticProsody = (transcriptText?: string): AcousticProsodyAnalysis => {
    const analysis = acousticProsodyRef.current.analyzeTurn({
      targetLang: activeScenario.targetLang,
      expectedText: activeWorkbenchTargetRef.current.isOpen
        ? activeWorkbenchTargetRef.current.activeTargetText
        : undefined,
      transcript: transcriptText,
    });
    acousticProsodyRef.current.reset();
    return analysis;
  };

  const scheduleAsyncNeuralDiagnosis = (opts: {
    turnId: string;
    uText: string;
    priorBktBefore: number;
    hintsUsed: number;
  }) => {
    if (opts.uText.trim().length < 6) return;
    void requestNeuralUtteranceDiagnosis({
      text: opts.uText,
      scenario: activeScenario,
      targetLang: activeScenario.targetLang,
      locale,
      history: turnsRef.current.slice(-6).map((tr) => ({ speaker: tr.speaker, text: tr.text })),
    }).then((neuralDiag) => {
      if (neuralDiag && !neuralDiag.ok && neuralDiag.misconceptionCode) {
        applyNeuralDiagnosisReconciliation({
          turnId: opts.turnId,
          uText: opts.uText,
          priorBktBefore: opts.priorBktBefore,
          hintsUsed: opts.hintsUsed,
          diag: neuralDiag,
        });
      }
    });
  };

  const commitLiveUserTurn = (
    textToCommit: string,
    opts?: { inputMode?: 'voice' | 'typed' | 'quick_chip' }
  ) => {
    const uText = sanitizeHallucinatedTranscript(
      textToCommit,
      activeScenario.targetLang,
      locale
    ).trim();
    if (!uText) return;

    const effectiveInputMode = opts?.inputMode || 'voice';
    const liveTelemetry =
      effectiveInputMode === 'voice' ? turnAcousticTrackerRef.current.finalize() : null;
    const acousticAnalysis =
      effectiveInputMode === 'voice' ? consumeTurnAcousticProsody(uText) : null;
    if (effectiveInputMode === 'voice') {
      turnAcousticTrackerRef.current.reset();
    }

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
      const isLiveWsUp = Boolean(
        isLiveConnectedRef.current && wsRef.current && wsRef.current.readyState === WebSocket.OPEN
      );
      setIsAnalyzingTurn(true);
      setIsGeneratingWorkbench(true);
      openLearningWorkbenchWithAction(
        {
          ...earlyIntent,
          sourceLayer: 'live_ws_native',
        },
        uText
      );
      void (async () => {
        try {
          const liveWb = await requestRealtimeWhiteboardStream({
            question: `[WHITEBOARD_REQUEST] ${uText}`,
            personaId: activePersona.id,
            personaName: activePersona.name,
            scenarioId: activeScenario.id,
            scenarioTitle: activeScenario.titleId,
            targetLang: activeScenario.targetLang,
            locale,
            learnerDossier: safeBuildDossier(brainStateRef.current, activeScenario, locale),
            history: turnsRef.current.slice(-4).map((t) => ({ speaker: t.speaker, text: t.text })),
            onOpenerReady: (opener) => {
              const firstChunk = extractOpenerFirstTtsChunk(opener);
              if (
                firstChunk &&
                reqSeq === workbenchSessionRef.current.turnSeq &&
                !workbenchSessionRef.current.dismissedByUser
              ) {
                void synthesizeFlexibleTts({
                  text: firstChunk,
                  targetLang: locale,
                  persona: activePersona,
                }).catch(() => null);
              }
            },
          });
          if (
            liveWb?.uiAction?.actionType === 'open_learning_popup' &&
            reqSeq === workbenchSessionRef.current.turnSeq &&
            !workbenchSessionRef.current.dismissedByUser
          ) {
            openLearningWorkbenchWithAction(
              { ...liveWb.uiAction, sourceLayer: isLiveWsUp ? 'live_ws_native' : liveWb.uiAction.sourceLayer },
              uText
            );
          }
        } catch {
          // Ignore network fallback
        } finally {
          if (reqSeq === workbenchSessionRef.current.turnSeq) {
            setIsAnalyzingTurn(false);
            setIsGeneratingWorkbench(false);
          }
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
      speakingDurationSec: liveTelemetry?.spanDurationSec || undefined,
      inputMode: effectiveInputMode,
      fluencyTelemetry: liveTelemetry || undefined,
      expectedTargetText: activeWorkbenchTargetRef.current.isOpen
        ? activeWorkbenchTargetRef.current.activeTargetText
        : undefined,
      activePopupMode: activeWorkbenchTargetRef.current.isOpen
        ? activeWorkbenchTargetRef.current.contextMode
        : undefined,
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
    const isDrJulianTurn =
      activePersona.id === 'dr_julian' || activeScenario.personaId === 'dr_julian';
    let pteDiagResult: ReturnType<typeof diagnosePteCandidateSpeech> | null = null;
    if (isDrJulianTurn && uText && effectiveInputMode === 'voice') {
      const regLearnerName =
        readHostPwaCognitiveSnapshot(activeScenario.targetLang, locale).learnerName?.trim() ||
        (locale === 'th' ? 'นักเรียน' : 'Candidate');
      pteDiagResult = diagnosePteCandidateSpeech({
        spokenTranscript: uText,
        durationSec: liveTelemetry?.spanDurationSec || undefined,
        activeSpeechSec: liveTelemetry?.activeSpeechSec,
        phonationRatio: liveTelemetry?.phonationRatio,
        shortPausesCount: liveTelemetry?.shortPausesCount,
        hesitationPausesCount: liveTelemetry?.hesitationPausesCount,
        longPausesCount: liveTelemetry?.longPausesCount,
        maxPauseMs: liveTelemetry?.maxPauseMs,
        pauseDurationsMs: liveTelemetry?.pauseDurationsMs,
        burstDurationsMs: liveTelemetry?.burstDurationsMs,
        isAcousticTiming: liveTelemetry?.isAcousticTiming,
        measurementSource: liveTelemetry?.measurementSource,
        questionTitle: learningWorkbench?.topicTitle || activeScenario.titleId,
        expectedPassageText:
          activeWorkbenchTargetRef.current.isOpen &&
          (activeWorkbenchTargetRef.current.contextMode === 'pte_read_aloud' ||
            activeWorkbenchTargetRef.current.contextMode === 'read_aloud')
            ? activeWorkbenchTargetRef.current.activeTargetText
            : undefined,
        targetLang: activeScenario.targetLang,
        learnerName: regLearnerName,
      });
      setLatestPteDiagnostic(pteDiagResult);
      evalParams.learnerDossier += `\n\n${pteDiagResult.clinicalDossierText}`;
    }
    const ev = evaluateTurnLocal(evalParams);
    if (ev.readAloudAlignment || pteDiagResult?.readAloudAlignment) {
      setLatestReadAloudAlignment(ev.readAloudAlignment || pteDiagResult?.readAloudAlignment || null);
    }
    const effectiveHints = isMeasureMode ? 0 : showHint ? 1 : 0;
    const acMisc = acousticAnalysis?.hasSufficientAudio ? acousticAnalysis.acousticMisconceptionId : null;
    const acCanon = acousticAnalysis?.hasSufficientAudio ? acousticAnalysis.canonicalTaxonomyCode : null;
    const acReason = acousticAnalysis?.hasSufficientAudio ? acousticAnalysis.whyFailsId : null;
    const resolvedMiscId = pteDiagResult?.misconceptionsFound[0]?.id || ev.misconceptionId || acMisc || null;
    const resolvedOk = pteDiagResult ? pteDiagResult.scores.passedTarget : Boolean(ev.ok && !acMisc);
    const outcome = recordSpeakingAttempt(brainStateRef.current, {
      competencyId: activeScenario.competencyId,
      scenarioId: activeScenario.id,
      targetLang: activeScenario.targetLang,
      userExactTranscript: uText,
      ok: resolvedOk,
      grammarScore: pteDiagResult ? Math.round(pteDiagResult.scores.pronunciation * 20) : ev.grammarScore,
      fluencyScore: pteDiagResult ? Math.round(pteDiagResult.scores.fluency * 20) : ev.fluencyScore,
      vocabUsageScore: pteDiagResult ? Math.round(pteDiagResult.templateAdherence.contentScore * 33) : ev.vocabUsageScore,
      accuracyScore: pteDiagResult ? pteDiagResult.scores.pearsonEstimate : ev.accuracyScore,
      speakingDurationSec: liveTelemetry?.spanDurationSec || undefined,
      misconceptionId: resolvedMiscId,
      canonicalCode: acCanon || resolvedMiscId,
      correctionPattern: ev.syntacticCorrection || ev.naturalReformulation || null,
      hintsUsed: effectiveHints,
      confidence: 0.85,
      measureMode: isMeasureMode,
      acousticMetrics: acousticAnalysis,
    });
    brainStateRef.current = outcome.nextState;
    setBrainState(outcome.nextState);
    if (isMeasureMode) {
      playFiezelSfx(resolvedOk ? 'answer_correct' : 'answer_wrong');
    }
    const turnDiag: TurnDiagnosis = {
      ok: resolvedOk,
      accuracyScore: pteDiagResult ? pteDiagResult.scores.pearsonEstimate : ev.accuracyScore,
      grammarScore: pteDiagResult ? Math.round(pteDiagResult.scores.pronunciation * 20) : ev.grammarScore,
      fluencyScore: pteDiagResult ? Math.round(pteDiagResult.scores.fluency * 20) : ev.fluencyScore,
      vocabUsageScore: pteDiagResult ? Math.round(pteDiagResult.templateAdherence.contentScore * 33) : ev.vocabUsageScore,
      userExactTranscript: uText,
      misconceptionId: resolvedMiscId,
      whyFailsId: pteDiagResult?.misconceptionsFound[0]?.detail || ev.whyFailsId || acReason || null,
      whyFailsTh: ev.whyFailsTh || null,
      missingTokens: ev.missingTokens || [],
      syntacticCorrection: ev.syntacticCorrection || null,
      naturalReformulation: ev.naturalReformulation || uText,
      pedagogicalFeedbackId: pteDiagResult?.clinicalDossierText || acReason || ev.pedagogicalFeedbackId,
      pedagogicalFeedbackTh: ev.pedagogicalFeedbackTh,
      bktBefore: outcome.bktBefore,
      bktAfter: outcome.bktAfter,
      thetaAfter: outcome.thetaAfter,
      masteryStateAfter: outcome.masteryStateAfter,
    };

    const committedTurnId = `live_u_${Date.now()}`;
    setTurns((prev) => [
      ...prev,
      {
        id: committedTurnId,
        speaker: 'user',
        text: uText,
        timestamp: Date.now(),
        diagnosis: turnDiag,
      },
    ]);
    if (!pteDiagResult && !resolvedMiscId && uText.length >= 6) {
      scheduleAsyncNeuralDiagnosis({
        turnId: committedTurnId,
        uText,
        priorBktBefore: outcome.bktBefore,
        hintsUsed: effectiveHints,
      });
    }
  };

  const submitLiveUserUtterance = (
    textToSend: string,
    opts?: { inputMode?: 'voice' | 'typed' | 'quick_chip' }
  ) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;
    unlockSharedBoardAudioContext();

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
    commitLiveUserTurn(trimmed, opts);
  };

  const buildDefaultWorkbenchPayload = (
    hintText = '',
    override?: Partial<VoiceUiAction>
  ): NonNullable<typeof learningWorkbench> => {
    const rawTitle = (override?.topicTitle || hintText || '').trim();
    const title = rawTitle || (locale === 'id' ? 'Papan Belajar' : (locale === 'th' ? 'กระดานเรียนรู้' : 'Learning Board'));

    const isSswPersona =
      activePersona.id === 'ssw_sensei' ||
      activeScenario.personaId === 'ssw_sensei' ||
      activeScenario.id.startsWith('scen_ssw_');
    const isPteSession =
      activePersona.id === 'dr_julian' ||
      activeScenario.personaId === 'dr_julian' ||
      activeScenario.id.startsWith('scen_pte');

    const rawOverrideFocus = override?.focusType;
    const normalizedOverrideFocus =
      !isSswPersona && rawOverrideFocus === 'pte_read_aloud' && !isPteSession
        ? 'read_aloud'
        : !isSswPersona && rawOverrideFocus === 'read_aloud' && isPteSession
          ? 'pte_read_aloud'
          : rawOverrideFocus;

    let focusType:
      | 'grammar'
      | 'vocab'
      | 'kanji'
      | 'kana'
      | 'sentence_drill'
      | 'read_aloud'
      | 'pte_describe_image'
      | 'pte_read_aloud'
      | 'pte_scorecard'
      | 'ssw_tactical_board'
      | string =
      normalizedOverrideFocus ||
      (isSswPersona
        ? 'ssw_tactical_board'
        : activeScenario.id === 'scen_pte_di_level1' || activeScenario.competencyId === 'speak_pte_describe_image' || /describe.*image|pte.*di|pte.*chart|grafik/i.test(title)
          ? 'pte_describe_image'
          : /pte.*ra|pte.*read.*aloud/i.test(title) ||
              ((activeScenario.id === 'scen_pte_ra_level2' ||
                activeScenario.competencyId === 'speak_pte_read_aloud' ||
                isPteSession) &&
                /read.*aloud|chunking|baca.*teks|baca.*nyaring|latihan.*baca/i.test(title))
            ? 'pte_read_aloud'
            : /read.*aloud|baca.*teks|baca.*nyaring|latihan.*baca|kalimat.*baca/i.test(title)
              ? 'read_aloud'
              : /scorecard|rapor.*pte|evaluasi.*pte/i.test(title)
                ? 'pte_scorecard'
                : /kanji|hanzi|huruf china|aksara/i.test(title)
                  ? 'kanji'
                  : /kana|hiragana|katakana/i.test(title)
                    ? 'kana'
                    : /kosakata|vocab|kata baru|arti kata/i.test(title)
                      ? 'vocab'
                      : 'grammar');

    const effectiveUiAction: VoiceUiAction = {
      actionType: 'open_learning_popup',
      topicTitle: title,
      ...(override || {}),
      focusType: focusType as any,
    } as VoiceUiAction;

    return {
      isOpen: true,
      focusType,
      topicTitle: title,
      explanationText: override?.explanationText || '',
      patternFormula: override?.patternFormula || '',
      drillInstruction: override?.drillInstruction || '',
      sampleTarget: override?.sampleTarget || '',
      uiAction: effectiveUiAction,
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
    openSeq: number;
    dismissedByUser: boolean;
    completedQuizSentence: string;
  }>({
    turnSeq: 0,
    openSeq: 0,
    dismissedByUser: false,
    completedQuizSentence: '',
  });

  const openLearningWorkbenchWithAction = (
    action?: Partial<VoiceUiAction>,
    hintText = '',
    opts?: { forceOpen?: boolean }
  ) => {
    if (isMeasureMode) return;
    unlockSharedBoardAudioContext();
    const hasRichAction = Boolean(
      (Array.isArray(action?.whiteboardSteps) && action.whiteboardSteps.length > 0) ||
      (action?.sampleTarget && action.sampleTarget.trim().length > 3) ||
      (action?.explanationText && action.explanationText.trim().length > 8) ||
      (action?.coachSpokenScript && action.coachSpokenScript.trim().length > 8) ||
      (action?.rightWord && action.rightWord.trim().length > 0 && action.rightWord !== 'bentuk tepat')
    );
    if (hasRichAction) {
      setIsGeneratingWorkbench(false);
    }
    const dedupKey = `popup:${action?.focusType || ''}:${action?.bankTopicId || action?.topicTitle || hintText || activeScenario.id}`;
    if (
      !opts?.forceOpen &&
      !hasRichAction &&
      action?.bankTopicId !== 'custom_dynamic' &&
      lastSystemIntentAtRef.current.key === dedupKey &&
      Date.now() - lastSystemIntentAtRef.current.at < 1500
    ) {
      return;
    }
    lastSystemIntentAtRef.current = { key: dedupKey, at: Date.now() };
    workbenchSessionRef.current.dismissedByUser = false;
    const nextOpenNonce = ++workbenchSessionRef.current.openSeq;

    const isLiveActive =
      Boolean(
        isLiveConnectedRef.current &&
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) || action?.sourceLayer === 'live_ws_native';

    const effectiveAction: Partial<VoiceUiAction> | undefined = isLiveActive
      ? { ...(action || {}), sourceLayer: 'live_ws_native' }
      : action;

    // Single-voice invariant: the moment Papan Tulis opens, immediately halt any outer AI voice,
    // outer SpeechRecognition, and pending drafts so the popup AI never collides with the outer call monitor.
    isWorkbenchOpenRef.current = true;
    isWorkbenchExplanationActiveRef.current = true;
    try {
      sileroVadGateRef.current?.pause();
    } catch {
      // Ignore
    }
    interruptAiAndStartListening();
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
    liveUserDraftRef.current = '';
    liveAiDraftRef.current = '';
    setLiveUserDraft('');
    setLiveAiDraft('');
    setIsUserSpeakingLive(false);
    setIsListeningLiveSpeech(false);
    clearUserBurstEndTimer();
    preRollFramesRef.current = [];
    consecutiveSpeechFramesRef.current = 0;
    userAudioBurstActiveRef.current = false;
    sentAudioSinceEndRef.current = false;

    const wbPayload = { ...buildDefaultWorkbenchPayload(hintText, effectiveAction), openNonce: nextOpenNonce };
    setLearningWorkbench(wbPayload);
  };

  const executeVoiceUiAction = (uiAction?: VoiceUiAction, userHint = ''): boolean => {
    if (!uiAction || uiAction.actionType === 'none') return false;
    if (uiAction.actionType === 'close_learning_popup') {
      workbenchSessionRef.current.dismissedByUser = true;
      isWorkbenchOpenRef.current = false;
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

    // 0-B) Explicit Read Aloud / Baca Nyaring popup command MUST win over generic module navigation!
    const wantsReadAloudPopup =
      /\b(read\s*aloud|baca\s*nyaring)\b/i.test(s) ||
      (/\b(pop[\s-]?up|papan|tampilkan|buka|bukain|bukakan|kasih|beri|munculkan|latihan)\b/i.test(s) &&
        /\b(read\s*aloud|baca\s*nyaring|kalimat\s*(?:untuk\s*)?baca|reading\s+aloud)\b/i.test(s));
    const isPteActive =
      activePersona.id === 'dr_julian' ||
      activeScenario.personaId === 'dr_julian' ||
      activeScenario.id.startsWith('scen_pte_');
    if (wantsReadAloudPopup) {
      return {
        actionType: 'open_learning_popup',
        focusType: isPteActive ? 'pte_read_aloud' : 'read_aloud',
        topicTitle: utterance.trim(),
      };
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
      if (!/\b(read\s*aloud|baca\s*nyaring|kalimat\s*baca)\b/i.test(s) && /\b(reading|bacaan|membaca|การอ่าน)\b/i.test(s)) {
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

    const isSswPersonaActive =
      activePersona?.id === 'ssw_sensei' ||
      activeScenario?.personaId === 'ssw_sensei' ||
      String(activeScenario?.id || '').startsWith('scen_ssw_');

    // 2-A) Explicit request to be tested / quizzed (skip generic grammar popup for SSW SENSEI, which uses native SSW panel tools)
    const asksTestingOrQuiz =
      /\b(tes\s+aku|coba\s+tes|uji\s+aku|coba\s+uji|kasih\s+soal|buatkan\s+(?:aku\s+)?latihan|coba\s+kasih\s+soal|kuiskan\s+aku|test\s+me|quiz\s+me)\b/i.test(
        s
      );
    if (asksTestingOrQuiz && !isSswPersonaActive) {
      return {
        actionType: 'open_learning_popup',
        topicTitle: utterance.trim(),
      };
    }

    // 2-B) Explicit request for interactive written learning popup OR any grammar/usage/visual explanation question
    const explicitPopupCmd =
      /\b(pop[\s-]?up|papan tulis|papan belajar|whiteboard|latihan tulis|tulis langsung|ajarin tertulis|buka kartu belajar|munculkan latihan|secara visual|dengan diagram|pakai diagram|visually|with a (?:\w+\s+)?diagram|step by step diagram)\b/i.test(
        s
      );
    const asksGrammarOrStruggle =
      /\b(bingung|susah|sulit|belum paham|nggak paham|gak paham|kurang paham|pusing|confused|struggling|don't understand|hard to understand|bedanya|perbedaan|difference between|why is|cara\s+(?:menggunakan|memakai|pakai|tulis|menulis)|how to\s+(?:use|write)|bagaimana\s+(?:cara|membedakan)|gimana cara pakai|kapan pakai|kenapa\s+(?:pakai|salah)|mengapa\s+(?:pakai|salah)|jelasin|jelaskan|ajarkan|ajarin|terangkan|uraikan|gambarkan|tolong bahas|explain|teach me|งง|ไม่เข้าใจ)\b/i.test(
        s
      ) &&
      (s.length >= 10 ||
        /\b(grammar|tata bahasa|partikel|particle|tenses?|past tense|present|perfect|verb|konjugasi|nada|tone|kanji|hanzi|pola|kalimat|since|for|did|does|agree|although|despite|modal|passive|conditional|theorem|pythagor|photosynthesis|diagram|は|が|を|に|で|了|正在|把|不|没)\b/i.test(
          s
        ));

    if (
      explicitPopupCmd ||
      (!isSswPersonaActive && callModeRef.current === 'tutor_coach' && asksGrammarOrStruggle)
    ) {
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
      inputMode: 'typed' as const,
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
        extraFailReason = locale === 'id'
          ? `Kamu masih memakai bentuk jebakan "${cleanTrap}", ganti dengan bentuk yang disorot hijau di papan tulis.`
          : `You are still using the trap form "${cleanTrap}", switch to the highlighted form on the whiteboard.`;
      }
    }

    // Strict syntactic & morphological trap validation (Anti-Loophole Rule #3 & #4)
    if (activeScenario.targetLang === 'en') {
      const mDidPast = clean.match(
        /\b(?:did(?:n't|\s+not)?|does(?:n't|\s+not)?)\s+(?:(?:i|you|he|she|it|we|they|[a-z]+)\s+)?(went|ate|saw|bought|took|made|came|gave|drank|wrote|spoke|got|had|did|watched|played|worked|studied|liked|wanted|needed)\b/i
      );
      if (mDidPast) {
        trappedTokens.push(mDidPast[1]);
        extraFailReason = locale === 'id'
          ? `Setelah "Did / Didn't / Does", kata kerja tidak boleh berbentuk lampau "${mDidPast[1]}", kembalikan ke bentuk dasar V1.`
          : `After "Did / Didn't / Does", use the base verb (V1) instead of past tense "${mDidPast[1]}".`;
      }
      const mDoubleBe = clean.match(
        /\b(am|is|are|i'm|you're|he's|she's)\s+(agree|disagree|want|need|think|believe|know|understand|prefer)\b/i
      );
      if (mDoubleBe) {
        trappedTokens.push(`${mDoubleBe[1]} ${mDoubleBe[2]}`);
        extraFailReason = locale === 'id'
          ? `Jangan menaruh "${mDoubleBe[1]}" di depan kata kerja "${mDoubleBe[2]}". Gunakan subjek langsung diikuti kata kerja.`
          : `Do not place "${mDoubleBe[1]}" before the verb "${mDoubleBe[2]}". Use the subject directly followed by the verb.`;
      }
      if (/\bfor\s+(?:19\d\d|20\d\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|yesterday|last\s+\w+)\b/i.test(clean)) {
        trappedTokens.push('for + starting time');
        extraFailReason = locale === 'id'
          ? 'Untuk titik awal waktu (seperti tahun 2020 atau Monday), gunakan "since", bukan "for".'
          : 'For a specific starting point in time (like 2020 or Monday), use "since", not "for".';
      }
      if (/\bin\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(clean)) {
        trappedTokens.push('in + weekday');
        extraFailReason = locale === 'id'
          ? 'Untuk nama hari (Monday, Friday, dll.), wajib menggunakan preposisi "on", bukan "in".'
          : 'With days of the week (Monday, Friday, etc.), use the preposition "on", not "in".';
      }
      if (/\bdespite\s+of\b/i.test(clean)) {
        trappedTokens.push('despite of');
        extraFailReason = locale === 'id'
          ? '"Despite" tidak boleh diikuti "of", gunakan "despite + noun" langsung atau "in spite of".'
          : '"Despite" is never followed by "of", use "despite + noun" directly or "in spite of".';
      }
      if (/\b(?:should|must|can|could|would|might)\s+to\s+[a-z]+\b/i.test(clean)) {
        trappedTokens.push('modal + to');
        extraFailReason = locale === 'id'
          ? 'Setelah modal verb (should/must/can), langsung gunakan kata kerja dasar V1 tanpa "to".'
          : 'After modal verbs (should/must/can), use the bare verb directly without "to".';
      }
      if (clean.split(/\s+/).filter(Boolean).length < 3) {
        extraFailReason =
          extraFailReason || (locale === 'id'
            ? 'Susun kalimat utuh minimal 3 kata (Subjek + Kata Kerja + Keterangan) agar polanya teruji.'
            : 'Build a complete sentence of at least 3 words (Subject + Verb + Complement) to test the pattern.');
      }
    } else if (
      activeScenario.targetLang === 'ja' &&
      activePersona.id !== 'ssw_sensei' &&
      !activeScenario.id.startsWith('scen_ssw_')
    ) {
      if (/ますでした/.test(clean)) {
        trappedTokens.push('ますでした');
        extraFailReason = locale === 'id'
          ? 'Bentuk "ますでした" tidak baku, ubah langsung ます menjadi ました.'
          : '"ますでした" is ungrammatical, conjugate ます directly to ました for past tense.';
      }
      if (/(行く|飲む|食べる|見る|する|来る|読む|書く|買う)です/.test(clean)) {
        trappedTokens.push('動詞+です');
        extraFailReason = locale === 'id'
          ? 'Kata kerja kamus tidak boleh langsung ditempel です. Gunakan bentuk 〜ます / 〜ました.'
          : 'Plain dictionary verbs cannot attach です directly, use the polite 〜ます / 〜ました form.';
      }
      if (patternFormula.includes('で') && /図書館に勉強|カフェに飲|家に勉強|学校に勉強/.test(clean)) {
        trappedTokens.push('に (action location)');
        extraFailReason = locale === 'id'
          ? 'Untuk tempat melakukan aksi aktif (belajar/minum), gunakan partikel で, bukan に.'
          : 'For the location where an action takes place (studying/drinking), use particle で instead of に.';
      }
      if (clean.length < 4 || !/[\u3040-\u30ff\u4e00-\u9fff]/.test(clean)) {
        extraFailReason =
          extraFailReason || (locale === 'id'
            ? 'Tulis kalimat dalam huruf Jepang (Hiragana/Kanji) secara utuh sesuai rumus.'
            : 'Write the complete sentence in Japanese script (Hiragana/Kanji) following the pattern.');
      }
    } else if (activeScenario.targetLang === 'zh') {
      if (/是(看|吃|喝|学习|学|去|做|工作|买)/.test(clean)) {
        trappedTokens.push('是 + verb');
        extraFailReason = locale === 'id'
          ? 'Untuk menyatakan "sedang", gunakan 正在 atau 在 sebelum kata kerja, bukan 是.'
          : 'To express an ongoing action, use 正在 or 在 before the verb instead of 是.';
      }
      if (/(看书|吃饭|喝咖啡|学习中文|学习|工作)(昨天|今天|现在)[。！？?!]?$/.test(clean)) {
        trappedTokens.push('Time at end');
        extraFailReason = locale === 'id'
          ? 'Dalam bahasa Mandarin, keterangan waktu (seperti 现在 / 昨天) wajib diletakkan SEBELUM kata kerja.'
          : 'In Mandarin, time expressions (such as 现在 / 昨天) must be placed BEFORE the verb.';
      }
      if (clean.length < 3 || !/[\u4e00-\u9fff]/.test(clean)) {
        extraFailReason =
          extraFailReason || (locale === 'id'
            ? 'Tulis kalimat dalam karakter Mandarin (Hanzi) secara utuh sesuai pola.'
            : 'Write the full sentence in Chinese characters (Hanzi) matching the pattern.');
      }
    }

    if (!ev.ok && ev.missingTokens?.length) {
      trappedTokens.push(...ev.missingTokens.slice(0, 2));
    }

    const finalOk = meta?.isQuizFailure
      ? false
      : meta?.isQuizSuccess
        ? true
        : Boolean(ev.ok) && trappedTokens.length === 0 && !extraFailReason;
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

    // Record to PTE Master Ledger if in Dr. Julian PTE mode
    if (activePersona.id === 'dr_julian' || activeScenario.personaId === 'dr_julian') {
      const stageNum = /level(\d)/i.exec(activeScenario.id)?.[1]
        ? parseInt(/level(\d)/i.exec(activeScenario.id)![1], 10)
        : 1;
      const fluencyMark = finalOk ? 4.5 : Math.max(1.5, ((ev.fluencyScore || 60) / 100) * 5);
      const pronMark = finalOk ? 4.2 : Math.max(1.5, ((ev.accuracyScore || 60) / 100) * 5);
      const contentMark = finalOk ? 2.8 : 1.2;
      recordPteMasterAttempt({
        stage: stageNum,
        taskName: activeScenario.titleId,
        fluency: fluencyMark,
        pronunciation: pronMark,
        content: contentMark,
        feedback: extraFailReason || (finalOk ? 'Passing candidate standard' : 'Needs practice on fluency and key tokens'),
      });
    }

    if (finalOk) {
      workbenchSessionRef.current.completedQuizSentence = clean;
    }

    const nextPct = Math.round(outcome.bktAfter * 100);
    const reasonText = finalOk
      ? locale === 'th'
        ? 'ยอดเยี่ยม! โครงสร้างประโยคตรงตามสูตรเป๊ะ กดส่งเข้าสายเพื่อให้ติวเตอร์ฟังได้เลย'
        : locale === 'id'
          ? 'Mantap! Susunan kalimat dan tata bahasamu sudah bersih sesuai rumus. Klik "Lanjut Ngobrol" untuk kembali ke obrolan.'
          : 'Great job! Your sentence structure and grammar match the pattern cleanly. Tap "Continue Talking" to return to the conversation.'
      : extraFailReason ||
        (meta?.isQuizFailure
          ? locale === 'th'
            ? 'คำตอบยังไม่ถูกต้อง ลองทบทวนตัวเลือกที่เลือกอีกครั้ง'
            : locale === 'id'
              ? 'Jawaban kuis belum tepat. Perhatikan kata/arti yang dipilih dan coba lagi.'
              : 'Not quite right yet. Review the meaning and structure above and try again.'
          : undefined) ||
        (locale === 'th'
          ? ev.whyFailsTh || ev.pedagogicalFeedbackTh
          : locale === 'id'
            ? ev.whyFailsId || ev.pedagogicalFeedbackId
            : ev.whyFailsEn || ev.pedagogicalFeedbackEn) ||
        (locale === 'id'
          ? 'Periksa kembali urutan kata dan bentuk kata kerja sesuai blok rumus di atas.'
          : 'Check your word order and verb form against the formula blocks above.');
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

  const applyNeuralDiagnosisReconciliation = (opts: {
    turnId: string;
    uText: string;
    priorBktBefore: number;
    hintsUsed: number;
    diag: {
      ok: boolean;
      misconceptionCode: string | null;
      whyFailsId?: string;
      correction?: string;
    };
  }) => {
    if (opts.diag.ok || !opts.diag.misconceptionCode) return;
    const fresh = loadBraincoreState();
    const recRes = reconcileNeuralDiagnosis(fresh, {
      competencyId: activeScenario.competencyId,
      scenarioId: activeScenario.id,
      targetLang: activeScenario.targetLang,
      userExactTranscript: opts.uText,
      priorBktBefore: opts.priorBktBefore,
      neuralOk: false,
      misconceptionCode: opts.diag.misconceptionCode,
      whyFailsId: opts.diag.whyFailsId || null,
      correctionPattern: opts.diag.correction || null,
      hintsUsed: opts.hintsUsed,
    });
    brainStateRef.current = recRes.nextState;
    setBrainState(recRes.nextState);
    void brainSyncFlush(recRes.nextState).then(({ nextState }) => setBrainState(nextState));
    setTurns((prev) =>
      prev.map((tr) =>
        tr.id === opts.turnId && tr.diagnosis
          ? {
              ...tr,
              diagnosis: {
                ...tr.diagnosis,
                ok: false,
                misconceptionId: opts.diag.misconceptionCode,
                whyFailsId: opts.diag.whyFailsId || tr.diagnosis.whyFailsId,
                syntacticCorrection: opts.diag.correction || tr.diagnosis.syntacticCorrection,
                naturalReformulation: opts.diag.correction || tr.diagnosis.naturalReformulation,
                pedagogicalFeedbackId: opts.diag.whyFailsId || tr.diagnosis.pedagogicalFeedbackId,
                bktAfter: recRes.bktAfter,
                thetaAfter: recRes.thetaAfter,
                masteryStateAfter: recRes.masteryStateAfter,
              },
            }
          : tr
      )
    );
  };

  const submitStudentTurn = async (params: {
    text?: string;
    audioBase64?: string;
    audioMimeType?: string;
    speakingDurationSec?: number;
    inputMode?: 'voice' | 'typed' | 'quick_chip';
    fluencyTelemetry?: Partial<TurnAcousticTelemetry> | null;
    acousticAnalysis?: AcousticProsodyAnalysis | null;
  }) => {
    const trimmed = (params.text || '').trim();
    if (!trimmed && !params.audioBase64) return;
    unlockSharedBoardAudioContext();

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
        setIsAnalyzingTurn(true);
        setIsGeneratingWorkbench(true);
        if (!isWorkbenchOpenRef.current) {
          openLearningWorkbenchWithAction(clientIntent, trimmed);
        }
      }
    }

    if (!isLiveConnectedRef.current && !ensureTurnByTurnBillingSession()) {
      return;
    }

    setInputText('');
    setLiveUserDraft('');
    setIsAnalyzingTurn(true);
    setStatusBanner(null);

    try {
      const effectiveInputMode: 'voice' | 'typed' | 'quick_chip' =
        params.inputMode ||
        (params.fluencyTelemetry || (params.speakingDurationSec && params.speakingDurationSec > 0)
          ? 'voice'
          : 'typed');
      const measuredDurationSec =
        params.fluencyTelemetry?.spanDurationSec && params.fluencyTelemetry.spanDurationSec > 0
          ? params.fluencyTelemetry.spanDurationSec
          : params.speakingDurationSec && params.speakingDurationSec > 0
            ? params.speakingDurationSec
            : undefined;
      const visibleScreenTarget = isWorkbenchOpenRef.current
        ? (activeWorkbenchTargetRef.current.activeTargetText || learningWorkbench?.sampleTarget || '').trim()
        : '';
      const visibleScreenMode = isWorkbenchOpenRef.current
        ? activeWorkbenchTargetRef.current.contextMode || learningWorkbench?.focusType
        : undefined;
      const openBoardSteps = learningWorkbench?.uiAction?.whiteboardSteps;
      const openVisualKinds = Array.isArray(openBoardSteps)
        ? Array.from(
            new Set(
              openBoardSteps
                .map((s) => s.kind)
                .filter((k) =>
          [
            'metaphor_scene',
            'mind_map',
            'timeline_track',
            'formula_blocks',
            'rough_scene',
            'contrast_scale',
            'syntax_flow',
            'kanji_grid',
            'tone_wave',
            'table',
          ].includes(k)
        )
            )
          )
        : [];
      const openBoardContext: WhiteboardFollowUpContext | undefined =
        isWorkbenchOpenRef.current && learningWorkbench?.isOpen
          ? {
              topicTitle:
                learningWorkbench.uiAction?.topicTitle || learningWorkbench.topicTitle,
              patternFormula:
                learningWorkbench.uiAction?.patternFormula || learningWorkbench.patternFormula,
              summary:
                learningWorkbench.uiAction?.explanationText || learningWorkbench.explanationText,
              currentVisualKinds: openVisualKinds.length ? openVisualKinds : undefined,
            }
          : undefined;
      const evalParams = {
        text: trimmed || activeScenario.sampleUtterances[0]?.text || 'Hello',
        scenario: activeScenario,
        persona: activePersona,
        targetLang: activeScenario.targetLang,
        locale,
        measureMode: isMeasureMode,
        callMode: callModeRef.current,
        speakingDurationSec: measuredDurationSec,
        inputMode: effectiveInputMode,
        fluencyTelemetry: params.fluencyTelemetry || undefined,
        expectedTargetText: visibleScreenTarget || undefined,
        activePopupMode: visibleScreenMode,
        boardContext: openBoardContext,
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

      // STEP 1, instant local Braincore grading of the learner's EXACT words.
      const isDrJulianTurn = activePersona.id === 'dr_julian' || activeScenario.personaId === 'dr_julian';
      let pteDiagResult: ReturnType<typeof diagnosePteCandidateSpeech> | null = null;
      if (isDrJulianTurn && trimmed) {
        const regLearnerName =
          readHostPwaCognitiveSnapshot(activeScenario.targetLang, locale).learnerName?.trim() ||
          (locale === 'th' ? 'นักเรียน' : 'Candidate');
        pteDiagResult = diagnosePteCandidateSpeech({
          spokenTranscript: trimmed,
          durationSec: measuredDurationSec,
          activeSpeechSec: params.fluencyTelemetry?.activeSpeechSec,
          phonationRatio: params.fluencyTelemetry?.phonationRatio,
          shortPausesCount: params.fluencyTelemetry?.shortPausesCount,
          hesitationPausesCount: params.fluencyTelemetry?.hesitationPausesCount,
          longPausesCount: params.fluencyTelemetry?.longPausesCount,
          maxPauseMs: params.fluencyTelemetry?.maxPauseMs,
          pauseDurationsMs: params.fluencyTelemetry?.pauseDurationsMs,
          burstDurationsMs: params.fluencyTelemetry?.burstDurationsMs,
          isAcousticTiming: params.fluencyTelemetry?.isAcousticTiming,
          measurementSource: params.fluencyTelemetry?.measurementSource,
          questionTitle: activeWorkbenchTargetRef.current.topicTitle || learningWorkbench?.topicTitle || activeScenario.titleId,
          expectedPassageText:
            (visibleScreenMode === 'pte_read_aloud' || visibleScreenMode === 'read_aloud') && visibleScreenTarget
              ? visibleScreenTarget
              : undefined,
          targetLang: activeScenario.targetLang,
          learnerName: regLearnerName,
        });
        setLatestPteDiagnostic(pteDiagResult);
        evalParams.learnerDossier += `\n\n${pteDiagResult.clinicalDossierText}`;
      }
      const localEv = evaluateTurnLocal(evalParams);
      if (localEv.readAloudAlignment || pteDiagResult?.readAloudAlignment) {
        setLatestReadAloudAlignment(localEv.readAloudAlignment || pteDiagResult?.readAloudAlignment || null);
      } else if (visibleScreenMode === 'pte_read_aloud' || visibleScreenMode === 'read_aloud') {
        setLatestReadAloudAlignment(null);
      }
      const exactTranscript = localEv.userExactTranscript;
      const ev = localEv;

      const effectiveHints = isMeasureMode ? 0 : showHint ? 1 : 0;
      const freshBrain = loadBraincoreState();
      const acMetrics = params.acousticAnalysis?.hasSufficientAudio ? params.acousticAnalysis : null;
      const acMiscSub = acMetrics?.acousticMisconceptionId || null;
      const resolvedSubMisc = pteDiagResult?.misconceptionsFound[0]?.id || ev.misconceptionId || acMiscSub || null;
      const resolvedSubOk = pteDiagResult ? pteDiagResult.scores.passedTarget : Boolean(ev.ok && !acMiscSub);
      const attemptOutcome = recordSpeakingAttempt(freshBrain, {
        competencyId: activeScenario.competencyId,
        scenarioId: activeScenario.id,
        targetLang: activeScenario.targetLang,
        userExactTranscript: exactTranscript,
        ok: resolvedSubOk,
        grammarScore: pteDiagResult ? Math.round(pteDiagResult.scores.pronunciation * 20) : ev.grammarScore,
        fluencyScore: pteDiagResult ? Math.round(pteDiagResult.scores.fluency * 20) : ev.fluencyScore,
        vocabUsageScore: pteDiagResult ? Math.round(pteDiagResult.templateAdherence.contentScore * 33) : ev.vocabUsageScore,
        accuracyScore: pteDiagResult ? pteDiagResult.scores.pearsonEstimate : ev.accuracyScore,
        speakingDurationSec: measuredDurationSec,
        misconceptionId: resolvedSubMisc,
        canonicalCode: acMetrics?.canonicalTaxonomyCode || resolvedSubMisc,
        correctionPattern: ev.syntacticCorrection || ev.naturalReformulation || null,
        hintsUsed: effectiveHints,
        confidence: 0.85,
        measureMode: isMeasureMode,
        acousticMetrics: acMetrics,
      });

      brainStateRef.current = attemptOutcome.nextState;
      setBrainState(attemptOutcome.nextState);
      if (isMeasureMode) {
        playFiezelSfx(resolvedSubOk ? 'answer_correct' : 'answer_wrong');
      }

      const diagnosis: TurnDiagnosis = {
        ok: resolvedSubOk,
        accuracyScore: pteDiagResult ? pteDiagResult.scores.pearsonEstimate : ev.accuracyScore,
        grammarScore: pteDiagResult ? Math.round(pteDiagResult.scores.pronunciation * 20) : ev.grammarScore,
        fluencyScore: pteDiagResult ? Math.round(pteDiagResult.scores.fluency * 20) : ev.fluencyScore,
        vocabUsageScore: pteDiagResult ? Math.round(pteDiagResult.templateAdherence.contentScore * 33) : ev.vocabUsageScore,
        userExactTranscript: exactTranscript,
        misconceptionId: resolvedSubMisc,
        whyFailsId: pteDiagResult?.misconceptionsFound[0]?.detail || ev.whyFailsId || acMetrics?.whyFailsId || null,
        whyFailsTh: ev.whyFailsTh || null,
        missingTokens: ev.missingTokens || [],
        syntacticCorrection: ev.syntacticCorrection || null,
        naturalReformulation: ev.naturalReformulation || exactTranscript,
        pedagogicalFeedbackId: pteDiagResult?.clinicalDossierText || acMetrics?.whyFailsId || ev.pedagogicalFeedbackId,
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
        speakingDurationSec: measuredDurationSec,
        diagnosis,
      };

      // The learner sees their own words + feedback immediately.
      const historyAfterUser: Array<{ speaker: 'ai' | 'user'; text: string }> = [
        ...turnsRef.current.slice(-7).map((tr) => ({ speaker: tr.speaker, text: tr.text })),
        { speaker: 'user', text: exactTranscript },
      ];
      turnsRef.current = [...turnsRef.current, userTurn];
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
            const isCambridge =
              activePersona?.id === 'cambridge_examiner' ||
              activeScenario.personaId === 'cambridge_examiner' ||
              activeScenario.id.startsWith('scen_ielts') ||
              activePersona?.id === 'dr_julian' ||
              activeScenario.personaId === 'dr_julian' ||
              activeScenario.id.startsWith('scen_pte');
            const aiOnly = suggestions.filter((c) => c.isRealtimeAi && !c.isOfflineFallback);
            if (aiOnly.length > 0) {
              lastCopilotAiKeyRef.current = `${activeScenario.id}::${activeScenario.targetLang}::${aiText.trim()}::${exactTranscript}`;
              setCopilotCards(isCambridge ? aiOnly.slice(0, 1) : aiOnly);
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
        const isCambridge =
          activePersona?.id === 'cambridge_examiner' ||
          activeScenario.personaId === 'cambridge_examiner' ||
          activeScenario.id.startsWith('scen_ielts') ||
          activePersona?.id === 'dr_julian' ||
          activeScenario.personaId === 'dr_julian' ||
          activeScenario.id.startsWith('scen_pte');
        const aiOnly = replyEv.nextSuggestedReplies.filter((c) => c.isRealtimeAi && !c.isOfflineFallback);
        if (aiOnly.length > 0) {
          lastCopilotAiKeyRef.current = `${activeScenario.id}::${activeScenario.targetLang}::${replyEv.aiReply.trim()}::${exactTranscript}`;
          setCopilotCards(isCambridge ? aiOnly.slice(0, 1) : aiOnly);
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
        !isWorkbenchOpenRef.current &&
        !(window as any).__fzWbLockstepActive &&
        myTurnSeq === workbenchSessionRef.current.turnSeq &&
        !workbenchSessionRef.current.dismissedByUser
      ) {
        const aiAudioBase64 = replyEv.audioBase64 || null;
        void speakAiText(replyEv.aiReply, aiAudioBase64);
      }
      if (!pteDiagResult && !resolvedSubMisc) {
        if (replyEv.serverDiagnosis && !replyEv.serverDiagnosis.ok && replyEv.serverDiagnosis.misconceptionCode) {
          applyNeuralDiagnosisReconciliation({
            turnId: userTurn.id,
            uText: exactTranscript,
            priorBktBefore: attemptOutcome.bktBefore,
            hintsUsed: effectiveHints,
            diag: replyEv.serverDiagnosis,
          });
        } else if (!replyEv.serverDiagnosis && exactTranscript.length >= 6) {
          void requestNeuralUtteranceDiagnosis({
            text: exactTranscript,
            scenario: activeScenario,
            targetLang: activeScenario.targetLang,
            locale,
            history: historyAfterUser,
          }).then((neuralDiag) => {
            if (neuralDiag && !neuralDiag.ok && neuralDiag.misconceptionCode) {
              applyNeuralDiagnosisReconciliation({
                turnId: userTurn.id,
                uText: exactTranscript,
                priorBktBefore: attemptOutcome.bktBefore,
                hintsUsed: effectiveHints,
                diag: neuralDiag,
              });
            }
          });
        }
      }
    } catch (err) {
      setIsGeneratingCopilot(false);
      setStatusBanner((err as Error).message || 'Kesalahan jaringan.');
    } finally {
      isAiThinkingRef.current = false;
      setIsAiThinking(false);
      if (myTurnSeq === workbenchSessionRef.current.turnSeq) {
        setIsAnalyzingTurn(false);
        setIsGeneratingWorkbench(false);
      }
    }
  };

  const submitStudentTurnRef = useRef(submitStudentTurn);
  submitStudentTurnRef.current = submitStudentTurn;

  // Hands-free Continuous Voice Recognition for "Telepon Live"
  useEffect(() => {
    const parentWin = getParentWin();
    const hasLiveHardwareMic = Boolean(
      (micStreamRef.current &&
        micStreamRef.current.getAudioTracks?.().some((tr) => tr.readyState === 'live' && tr.enabled)) ||
        (parentWin?.__fzSharedMicStream &&
          parentWin.__fzSharedMicStream.getAudioTracks?.().some((tr: any) => tr.readyState === 'live' && tr.enabled))
    );

    // 1. In WebSocket Full-Duplex mode ("Telepon Live") WITH an active hardware microphone stream,
    // audio input is 100% handled by continuous 16kHz PCM streaming directly to Gemini Live WS.
    // Do NOT run browser SpeechRecognition simultaneously when hardware mic PCM is active, as
    // parallel SpeechRecognition causes OS audio focus renegotiation on Android/iOS (Mochi SOS parity).
    if (isLiveConnected && liveTransportMode === 'ws-duplex' && hasLiveHardwareMic) {
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

    // Also suppress stop/start SpeechRecognition flapping during ws-duplex while hardware mic
    // acquisition/recovery is pending or active on Mobile PWA (keeps duplex capture continuous).
    if (
      isLiveConnected &&
      liveTransportMode === 'ws-duplex' &&
      !micCaptureHardFailedRef.current &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia)
    ) {
      if (liveSpeechRecRef.current) {
        try {
          liveSpeechRecRef.current.onresult = null;
          liveSpeechRecRef.current.onend = null;
          liveSpeechRecRef.current.onerror = null;
          liveSpeechRecRef.current.stop();
        } catch {}
        liveSpeechRecRef.current = null;
      }
      setIsWaitingAfterSpeech(false);
      return;
    }

    const shouldListenHandsFree =
      isLiveConnected &&
      !isPlayingAiAudio &&
      !isAnalyzingTurn &&
      !isMicMuted &&
      !isRecordingPtt &&
      !learningWorkbench?.isOpen;

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
        if (isFinalResult && !incomplete) return 220;
        return incomplete ? 680 : 420;
      }
      if (isFinalResult && !incomplete) return 260;
      return incomplete ? 780 : 480;
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
          // While Papan Tulis popup is open, outer SpeechRecognition MUST stay completely inert so popup voice cannot bounce to outer AI
          if (isWorkbenchOpenRef.current || Boolean((window as any).__fzWbLockstepActive)) return;
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

          // Acoustic car-noise / street traffic guard: when mic hardware DSP is active, verify
          // either genuine vocal speech was detected recently OR it's a clear multi-word final phrase.
          const dspCapturingAudio =
            lastMicFrameAtRef.current > 0 && Date.now() - lastMicFrameAtRef.current < 1600;
          const recentAcousticVoice =
            handyVadRef.current.isInSpeech() ||
            Boolean(sileroVadGateRef.current?.isConfirmedSpeaking()) ||
            Date.now() -
              Math.max(
                lastHandySpeechAtRef.current,
                sileroVadGateRef.current?.getLastHumanSpeechAt?.() || 0
              ) <=
              2200;
          const wordsCount = clean.split(/\s+/).filter(Boolean).length;
          const isShortNoiseHallucination =
            wordsCount <= 1 && /^(um+|uh+|hmm+|ah+|oh+|eh+|ha+|hm+|no|m+|a+)$/i.test(clean);
          if (dspCapturingAudio && !recentAcousticVoice && (isShortNoiseHallucination || (!lastIsFinal && wordsCount < 2))) {
            return;
          }
          if (!dspCapturingAudio || recentAcousticVoice) {
            lastHandySpeechAtRef.current = Date.now();
            if (sileroVadGateRef.current?.isActive()) {
              sileroVadGateRef.current.markHumanSpeechAt(Date.now());
            }
          }

          accumulatedSpeech = clean;
          liveDictatedTextRef.current = clean;
          setLiveUserDraft(clean);
          setInputText(clean);
          setIsUserSpeakingLive(true);
          turnAcousticTrackerRef.current.recordTranscriptEvent(
            Date.now(),
            countUtteranceUnits(clean, activeScenario.targetLang)
          );

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
                submitLiveUserUtterance(toSend, { inputMode: 'voice' });
              } else {
                const liveTel = turnAcousticTrackerRef.current.finalize();
                turnAcousticTrackerRef.current.reset();
                const liveProsody = consumeTurnAcousticProsody(toSend);
                void submitStudentTurnRef.current({
                  text: toSend,
                  speakingDurationSec: liveTel.spanDurationSec > 0 ? liveTel.spanDurationSec : undefined,
                  inputMode: 'voice',
                  fluencyTelemetry: liveTel,
                  acousticAnalysis: liveProsody,
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
            const hasLiveStream = micStreamRef.current && micStreamRef.current.getAudioTracks().some((t) => t.readyState === 'live');
            if (!hasLiveStream) {
              isMicMutedRef.current = true;
              setIsMicMuted(true);
              setIsListeningLiveSpeech(false);
              setIsUserSpeakingLive(false);
              setStatusBanner(
                locale === 'th'
                  ? 'ไมโครโฟนถูกบล็อก อนุญาตไมโครโฟนในแถบที่อยู่ หรือพิมพ์ประโยคด้านล่าง'
                  : locale === 'id'
                    ? 'Mikrofon tidak aktif atau diblokir peramban. Ketuk tombol Bicara untuk mengizinkan mic, atau ketik kalimatmu.'
                    : 'Microphone is inactive or blocked by the browser. Tap Speak to allow mic access, or type your sentence below.'
              );
            }
          } else if (code === 'network') {
            setStatusBanner(
              locale === 'th'
                ? 'การรู้จำเสียงต้องใช้อินเทอร์เน็ต ลองอีกครั้งหรือพิมพ์ประโยค'
                : locale === 'id'
                  ? 'Pengenalan suara butuh koneksi internet. Coba bicara lagi atau ketik kalimatmu.'
                  : 'Speech recognition needs an internet connection. Try speaking again or type your sentence.'
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
                    submitLiveUserUtterance(toSend, { inputMode: 'voice' });
                  } else {
                    const liveTel = turnAcousticTrackerRef.current.finalize();
                    turnAcousticTrackerRef.current.reset();
                    const liveProsody = consumeTurnAcousticProsody(toSend);
                    void submitStudentTurnRef.current({
                      text: toSend,
                      speakingDurationSec: liveTel.spanDurationSec > 0 ? liveTel.spanDurationSec : undefined,
                      inputMode: 'voice',
                      fluencyTelemetry: liveTel,
                      acousticAnalysis: liveProsody,
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
    isMicHardwareReady,
    isPlayingAiAudio,
    isAnalyzingTurn,
    isMicMuted,
    isRecordingPtt,
    learningWorkbench?.isOpen,
    activeScenario.targetLang,
    activeScenario.id,
    locale,
  ]);

  const startPttRecording = async () => {
    if (!ensureTurnByTurnBillingSession()) return;
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
      setDuplexAudioSessionMode(true);
      setIsPlayingAiAudio(false);
      setStatusBanner(null);
      liveDictatedTextRef.current = '';
      setLiveUserDraft('');
      pttStartedAtRef.current = Date.now();
      turnAcousticTrackerRef.current.reset();

      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.lang =
          activePersona.id === 'ssw_sensei' || activeScenario.id.startsWith('scen_ssw_')
            ? 'id-ID'
            : activeScenario.targetLang === 'ja'
            ? 'ja-JP'
            : activeScenario.targetLang === 'zh'
            ? 'zh-CN'
            : 'en-US';
        recognition.interimResults = true;
        const isAndroidPtt =
          typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
        recognition.continuous = !isAndroidPtt;

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
            turnAcousticTrackerRef.current.recordTranscriptEvent(
              Date.now(),
              countUtteranceUnits(clean, activeScenario.targetLang)
            );

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
                ? 520
                : incompletePtt
                  ? 980
                  : 720
              : lastFinal && !incompletePtt
                ? 650
                : incompletePtt
                  ? 1150
                  : 850;
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
          ? Math.max(0.8, (Date.now() - pttStartedAtRef.current) / 1000)
          : undefined;
        pttStartedAtRef.current = null;
        const dictated = liveDictatedTextRef.current.trim();
        if (dictated) {
          liveDictatedTextRef.current = '';
          const pttTelemetry = turnAcousticTrackerRef.current.finalize(elapsedSec);
          turnAcousticTrackerRef.current.reset();
          const pttProsody = consumeTurnAcousticProsody(dictated);
          void submitStudentTurnRef.current({
            text: dictated,
            speakingDurationSec:
              pttTelemetry.spanDurationSec > 0 ? pttTelemetry.spanDurationSec : elapsedSec,
            inputMode: 'voice',
            fluencyTelemetry: pttTelemetry,
            acousticAnalysis: pttProsody,
          });
        } else {
          turnAcousticTrackerRef.current.reset();
          acousticProsodyRef.current.reset();
          setStatusBanner(
            'Peramban ini belum mendukung pengenalan suara otomatis. Ketik kalimatmu di kolom bawah atau pilih dari Bantuan Cara Jawab.'
          );
        }
      };

      recorder.start();
      setIsRecordingPtt(true);
    } catch {
      setIsRecordingPtt(false);
      if (!isLiveConnectedRef.current && !isLiveConnectingRef.current) {
        setDuplexAudioSessionMode(false);
      }
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
    const rawElapsedSec = pttStartedAtRef.current
      ? Math.max(0.8, (Date.now() - pttStartedAtRef.current) / 1000)
      : undefined;
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
      if (!isLiveConnectedRef.current && !isLiveConnectingRef.current) {
        setDuplexAudioSessionMode(false);
      }
      window.setTimeout(() => {
        const dictated = liveDictatedTextRef.current.trim();
        if (dictated) {
          liveDictatedTextRef.current = '';
          setLiveUserDraft('');
          const pttTelemetry = turnAcousticTrackerRef.current.finalize(rawElapsedSec);
          turnAcousticTrackerRef.current.reset();
          const pttProsody = consumeTurnAcousticProsody(dictated);
          void submitStudentTurnRef.current({
            text: dictated,
            speakingDurationSec:
              pttTelemetry.spanDurationSec > 0 ? pttTelemetry.spanDurationSec : rawElapsedSec,
            inputMode: 'voice',
            fluencyTelemetry: pttTelemetry,
            acousticAnalysis: pttProsody,
          });
        } else {
          turnAcousticTrackerRef.current.reset();
          acousticProsodyRef.current.reset();
          setStatusBanner(
            locale === 'th'
              ? 'ยังไม่ได้ยินเสียง พูดให้ชัดเจนใส่ไมโครโฟน หรือพิมพ์ในช่องด้านล่าง'
              : locale === 'id'
                ? 'Belum ada suara yang terdengar. Pastikan mikrofon aktif dan ucapkan kalimat dengan jelas, atau ketik di kolom bawah.'
                : 'No speech was detected yet. Make sure your microphone is active and speak clearly, or type in the box below.'
          );
        }
      }, 80);
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingPtt(false);
    if (!isLiveConnectedRef.current && !isLiveConnectingRef.current) {
      setDuplexAudioSessionMode(false);
    }
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

  const lastMicFrameAtRef = useRef<number>(0);

  const silent16kB64CacheRef = useRef<Map<number, string>>(new Map());
  const getSilent16kPcmBase64 = (sampleRate: number, inputLen: number) => {
    const sr = sampleRate > 0 ? sampleRate : 48000;
    const outSamples = Math.max(160, Math.round((inputLen * 16000) / sr));
    const cached = silent16kB64CacheRef.current.get(outSamples);
    if (cached) return cached;
    const bytes = new Uint8Array(outSamples * 2);
    let binary = '';
    const CHUNK = 8192;
    for (let j = 0; j < bytes.length; j += CHUNK) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(j, Math.min(j + CHUNK, bytes.length))));
    }
    const b64 = typeof btoa === 'function' ? btoa(binary) : '';
    if (b64) silent16kB64CacheRef.current.set(outSamples, b64);
    return b64;
  };

  /**
   * Mochi SOS parity (`fiezel-mochi-voice-sos.js:1014-1054`):
   * First-order 300-3300 Hz human vocal band-pass + zero-crossing rate analyzer.
   */
  const analyzeHumanVoiceBandFrame = (float32: Float32Array, inRate: number) => {
    const len = float32 ? float32.length : 0;
    if (len < 64) return { rms: 0, voiceBandRms: 0, isHumanSpeech: false };
    const sr = inRate > 0 ? inRate : 16000;
    const rcHp = 1 / (2 * Math.PI * 300);
    const dt = 1 / sr;
    const alphaHp = rcHp / (rcHp + dt);
    const rcLp = 1 / (2 * Math.PI * 3300);
    const alphaLp = dt / (rcLp + dt);
    let prevX = float32[0] || 0;
    let hpY = 0;
    let bpY = 0;
    let prevBpY = 0;
    let sumAllSq = 0;
    let sumVoiceSq = 0;
    let zeroCrossings = 0;
    for (let i = 0; i < len; i += 1) {
      const x = float32[i];
      sumAllSq += x * x;
      hpY = alphaHp * (hpY + x - prevX);
      prevX = x;
      bpY = bpY + alphaLp * (hpY - bpY);
      sumVoiceSq += bpY * bpY;
      if ((bpY >= 0 && prevBpY < 0) || (bpY < 0 && prevBpY >= 0)) {
        zeroCrossings++;
      }
      prevBpY = bpY;
    }
    const rms = Math.sqrt(sumAllSq / len);
    const voiceBandRms = Math.sqrt(sumVoiceSq / len);
    const voiceRatio = rms > 0.0001 ? voiceBandRms / rms : 0;
    const durationSec = len / sr;
    const zcrHz = durationSec > 0 ? zeroCrossings / (2 * durationSec) : 0;
    const isHumanSpeech =
      voiceBandRms >= 0.003 &&
      voiceRatio >= 0.38 &&
      zcrHz >= 120 &&
      zcrHz <= 3100;
    return { rms, voiceBandRms, isHumanSpeech };
  };

  /**
   * Mochi SOS parity (`fiezel-mochi-voice-sos.js:3566-3586`):
   * Sends `{"realtimeInput":{"audioStreamEnd":true}}` after the user's speech burst finishes
   * so mobile AGC ambient noise never prevents Gemini Live from ending the user's turn!
   */
  const clearUserBurstEndTimer = () => {
    if (userBurstEndTimerRef.current) {
      window.clearTimeout(userBurstEndTimerRef.current);
      userBurstEndTimerRef.current = null;
    }
  };

  const scheduleLiveTurnAutoCommitWatchdog = () => {
    clearLiveTurnAutoCommitTimer();
    liveTurnAutoCommitTimerRef.current = window.setTimeout(() => {
      liveTurnAutoCommitTimerRef.current = null;
      const pendingDraft = sanitizeHallucinatedTranscript(
        liveUserDraftRef.current,
        activeScenarioRef.current.targetLang,
        locale
      ).trim();
      if (
        pendingDraft &&
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN &&
        isLiveConnectedRef.current &&
        !isPlayingAiAudioRef.current &&
        !isAiServerTurnOpenRef.current &&
        !awaitingPostToolResponseRef.current &&
        !isUserSpeakingLiveRef.current
      ) {
        submitLiveUserUtterance(pendingDraft, { inputMode: 'voice' });
      }
    }, 950);
  };

  const flushUserAudioStreamEnd = () => {
    clearUserBurstEndTimer();
    const hadActiveOrSent = userAudioBurstActiveRef.current || sentAudioSinceEndRef.current;
    userAudioBurstActiveRef.current = false;
    consecutiveSpeechFramesRef.current = 0;
    preRollFramesRef.current = [];
    if (userSpeakingTimerRef.current) {
      window.clearTimeout(userSpeakingTimerRef.current);
      userSpeakingTimerRef.current = null;
    }
    if (isUserSpeakingLiveRef.current) {
      isUserSpeakingLiveRef.current = false;
      setIsUserSpeakingLive(false);
    }
    if (hadActiveOrSent && sentAudioSinceEndRef.current) {
      sentAudioSinceEndRef.current = false;
      if (
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN &&
        isLiveConnectedRef.current &&
        !isWorkbenchOpenRef.current &&
        !isPlayingAiAudioRef.current &&
        !isAiServerTurnOpenRef.current
      ) {
        try {
          wsRef.current.send(
            JSON.stringify({
              realtimeInput: {
                audioStreamEnd: true,
              },
            })
          );
          if (liveUserDraftRef.current.trim()) {
            scheduleLiveTurnAutoCommitWatchdog();
          }
        } catch {
          // Ignore
        }
      }
    }
  };

  const scheduleUserBurstEnd = () => {
    clearUserBurstEndTimer();
    clearLiveTurnAutoCommitTimer();
    const silenceHoldMs = 520;
    userBurstEndTimerRef.current = window.setTimeout(() => {
      userBurstEndTimerRef.current = null;
      flushUserAudioStreamEnd();
    }, silenceHoldMs);
  };

  const handleMicPcmData = (float32: Float32Array) => {
    let peak = 0;
    for (let i = 0; i < float32.length; i += 4) {
      const val = Math.abs(float32[i]);
      if (val > peak) peak = val;
    }
    if (peak > 0.00001) {
      lastMicFrameAtRef.current = Date.now();
      if (!isMicHardwareReadyRef.current) {
        syncMicHardwareReadyState();
      }
    }
    if (isMicMutedRef.current) return;
    // While Papan Tulis popup is open, outer live mic PCM streaming is completely suspended so popup speaker audio never triggers outer Gemini Live
    if (isWorkbenchOpenRef.current) {
      clearUserBurstEndTimer();
      userAudioBurstActiveRef.current = false;
      sentAudioSinceEndRef.current = false;
      preRollFramesRef.current = [];
      consecutiveSpeechFramesRef.current = 0;
      bargeSpeechStreakRef.current = 0;
      handyVadRef.current.clearPreRoll();
      return;
    }
    // Once Silero Neural VAD v5 WASM is active, it exclusively owns 16kHz human-speech streaming & barge-in.
    if (sileroVadGateRef.current?.isActive()) return;

    const liveCtx = liveAudioCtxRef.current;
    const sampleRate = liveCtx?.sampleRate || 48000;
    const v = analyzeHumanVoiceBandFrame(float32, sampleRate);

    // Protect the opening greeting request from immediate background mic collision (Mochi SOS _awaitingOpeningModelTurn parity)
    if (awaitingOpeningTurnRef.current) {
      clearUserBurstEndTimer();
      return;
    }

    // ACOUSTIC ECHO SUPPRESSION + INSTANT BARGE-IN:
    // Only treat AI as playing when outputAudioCtx is actively running so a suspended context never deadlocks the mic!
    const outCtxRunning = outputAudioCtxRef.current?.state === 'running';
    const aiActuallyPlaying =
      outCtxRunning &&
      (isPlayingAiAudioRef.current ||
        isAiServerTurnOpenRef.current ||
        activeSourcesRef.current.length > 0 ||
        livePcmSchedulerRef.current.hasPendingAudio() ||
        Date.now() - lastAiPlayoutEndedAtRef.current < 180);

    if (aiActuallyPlaying) {
      clearUserBurstEndTimer();
      userAudioBurstActiveRef.current = false;
      sentAudioSinceEndRef.current = false;
      preRollFramesRef.current = [];
      consecutiveSpeechFramesRef.current = 0;
      if (Date.now() - lastAiPlayoutEndedAtRef.current < 180) {
        bargeSpeechStreakRef.current = 0;
        resetBargeCandidate();
        return;
      }
      const bargeVad = handyVadRef.current.processSamples(float32, sampleRate, true);
      const pitchCorr = bargeVad.lastMetrics?.pitchCorr ?? 0;
      const mobilePwaCapture = isMobilePwaDevice();
      const minBargeRms = mobilePwaCapture ? 0.008 : 0.018;
      const minBargePitchCorr = mobilePwaCapture ? 0.40 : 0.44;
      const isBargeVoice =
        (bargeVad.inSpeech || bargeVad.voicedFrames >= 1) &&
        v.rms >= minBargeRms &&
        pitchCorr >= minBargePitchCorr &&
        (!mobilePwaCapture || (bargeVad.lastMetrics?.vocalToRumble ?? 0) >= 1.35 || v.voiceBandRms >= 0.0045);
      if (isBargeVoice) {
        bargeSpeechStreakRef.current += 1;
        bargeCandidateSilenceRef.current = 0;
        const resampled = resampleFloat32To16k(float32, sampleRate);
        if (resampled.length > 0) {
          bargeCandidateChunksRef.current.push(resampled);
          bargeCandidateSamplesRef.current += resampled.length;
          bargeCandidateRmsRef.current.push(v.rms);
          bargeCandidatePitchSumRef.current += pitchCorr;
          bargeCandidatePitchCountRef.current += 1;
          bargeCandidateVoicedFramesRef.current += Math.max(1, bargeVad.voicedFrames || 0);
          while (bargeCandidateSamplesRef.current > 24000 && bargeCandidateChunksRef.current.length > 1) {
            const dropped = bargeCandidateChunksRef.current.shift();
            if (dropped) bargeCandidateSamplesRef.current -= dropped.length;
            bargeCandidateRmsRef.current.shift();
          }
        }

        const requiredBargeStreak = mobilePwaCapture ? 5 : 7;
        const requiredVoicedFrames = mobilePwaCapture ? 2 : 3;
        if (
          bargeSpeechStreakRef.current >= requiredBargeStreak &&
          bargeCandidateVoicedFramesRef.current >= requiredVoicedFrames &&
          (hasDynamicSpeechModulation(bargeCandidateRmsRef.current) ||
            (mobilePwaCapture && bargeSpeechStreakRef.current >= 7 && pitchCorr >= 0.52)) &&
          Date.now() - lastBargeInAtRef.current > 450
        ) {
          const capturedChunks = bargeCandidateChunksRef.current;
          const totalSamples = bargeCandidateSamplesRef.current;
          const rmsSeries = bargeCandidateRmsRef.current;
          const avgPitchCorr =
            bargeCandidatePitchCountRef.current > 0
              ? bargeCandidatePitchSumRef.current / bargeCandidatePitchCountRef.current
              : pitchCorr;
          const voicedFramesCount = bargeCandidateVoicedFramesRef.current;
          resetBargeCandidate();
          bargeSpeechStreakRef.current = 0;
          const merged16k = new Float32Array(Math.max(totalSamples, resampled.length));
          let offset = 0;
          if (totalSamples > 0) {
            for (const chunk of capturedChunks) {
              if (offset + chunk.length <= merged16k.length) {
                merged16k.set(chunk, offset);
                offset += chunk.length;
              }
            }
          } else if (resampled.length > 0) {
            merged16k.set(resampled, 0);
          }
          if (merged16k.length >= 4096) {
            void runLanguageVerifiedBargeIn(merged16k, rmsSeries, avgPitchCorr, voicedFramesCount);
          } else {
            commitVerifiedSpeechInterrupt(merged16k);
          }
          return;
        }

        const requiredSamples =
          Date.now() < verifyEndpointUnavailableUntilRef.current ? 16000 : 8000;
        if (
          bargeCandidateSamplesRef.current >= requiredSamples &&
          !bargeVerifyInFlightRef.current &&
          Date.now() - lastBargeVerifyAtRef.current >= 700
        ) {
          const capturedChunks = bargeCandidateChunksRef.current;
          const totalSamples = bargeCandidateSamplesRef.current;
          const rmsSeries = bargeCandidateRmsRef.current;
          const avgPitchCorr =
            bargeCandidatePitchCountRef.current > 0
              ? bargeCandidatePitchSumRef.current / bargeCandidatePitchCountRef.current
              : 0;
          const voicedFramesCount = bargeCandidateVoicedFramesRef.current;
          resetBargeCandidate();

          // Steady/monotone ambient rumble or horns fail syllable envelope modulation -> keep AI talking
          if (hasDynamicSpeechModulation(rmsSeries)) {
            const merged16k = new Float32Array(totalSamples);
            let offset = 0;
            for (const chunk of capturedChunks) {
              merged16k.set(chunk, offset);
              offset += chunk.length;
            }
            void runLanguageVerifiedBargeIn(merged16k, rmsSeries, avgPitchCorr, voicedFramesCount);
          }
        }
      } else {
        bargeSpeechStreakRef.current = Math.max(0, bargeSpeechStreakRef.current - 1);
        bargeCandidateSilenceRef.current += 1;
        if (bargeCandidateSilenceRef.current >= 4 || bargeSpeechStreakRef.current === 0) {
          resetBargeCandidate();
        }
        handyVadRef.current.clearPreRoll();
      }
      return;
    }

    const vadRes = handyVadRef.current.processSamples(float32, sampleRate, false);
    const frameChunkMs = Math.max(10, Math.round((float32.length / sampleRate) * 1000));
    const isListeningSpeech = vadRes.inSpeech && v.voiceBandRms >= 0.003;
    const isVerifiedListeningSpeech =
      isListeningSpeech || (v.isHumanSpeech && v.voiceBandRms >= 0.0028);
    turnAcousticTrackerRef.current.recordAudioFrame({
      chunkMs: frameChunkMs,
      voicedMs: vadRes.inSpeech ? vadRes.voicedMs || frameChunkMs : 0,
      isActiveVoice: Boolean(vadRes.inSpeech && isVerifiedListeningSpeech),
      confirmedSpeech: Boolean(vadRes.inSpeech && isVerifiedListeningSpeech),
    });
    if (vadRes.inSpeech && isVerifiedListeningSpeech) {
      const ac16k = resampleFloat32To16k(float32, sampleRate);
      if (ac16k.length > 0) {
        acousticProsodyRef.current.pushSamples(ac16k);
      }
    }
    const wsOpen = Boolean(wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isLiveConnectedRef.current);

    if (isVerifiedListeningSpeech) {
      consecutiveSpeechFramesRef.current += 1;
      if (consecutiveSpeechFramesRef.current >= 2) {
        lastHandySpeechAtRef.current = Date.now();
        userAudioBurstActiveRef.current = true;
        if (!isUserSpeakingLiveRef.current) {
          isUserSpeakingLiveRef.current = true;
          setIsUserSpeakingLive(true);
        }
        if (userSpeakingTimerRef.current) window.clearTimeout(userSpeakingTimerRef.current);
        userSpeakingTimerRef.current = window.setTimeout(() => {
          isUserSpeakingLiveRef.current = false;
          setIsUserSpeakingLive(false);
        }, 560);
        scheduleUserBurstEnd();

        if (wsOpen && wsRef.current) {
          while (preRollFramesRef.current.length > 0) {
            const preB64 = preRollFramesRef.current.shift();
            if (preB64) {
              sentAudioSinceEndRef.current = true;
              wsRef.current.send(
                JSON.stringify({
                  realtimeInput: {
                    audio: {
                      mimeType: 'audio/pcm;rate=16000',
                      data: preB64,
                    },
                  },
                })
              );
            }
          }
          const pcmBase64 = resampleFloat32To16kPcmBase64(float32, sampleRate);
          if (pcmBase64) {
            sentAudioSinceEndRef.current = true;
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
        return;
      }
    } else {
      consecutiveSpeechFramesRef.current = Math.max(0, consecutiveSpeechFramesRef.current - 1);
    }

    if (userAudioBurstActiveRef.current) {
      const silenceElapsedMs = lastHandySpeechAtRef.current > 0 ? Date.now() - lastHandySpeechAtRef.current : 0;
      if (!vadRes.inSpeech && silenceElapsedMs >= 520) {
        flushUserAudioStreamEnd();
        return;
      }
      if (wsOpen && wsRef.current) {
        // Keep streaming continuous real microphone audio during active burst so unvoiced consonants are never zeroed out
        const tailB64 = resampleFloat32To16kPcmBase64(float32, sampleRate);
        if (tailB64) {
          sentAudioSinceEndRef.current = true;
          wsRef.current.send(
            JSON.stringify({
              realtimeInput: {
                audio: {
                  mimeType: 'audio/pcm;rate=16000',
                  data: tailB64,
                },
              },
            })
          );
        }
      }
      return;
    }

    // Idle pre-roll ring: continuously buffer ~480ms so word onsets and initial syllables are never clipped
    const idleB64 = resampleFloat32To16kPcmBase64(float32, sampleRate);
    if (idleB64) {
      preRollFramesRef.current.push(idleB64);
      if (preRollFramesRef.current.length > 12) {
        preRollFramesRef.current.shift();
      }
    }
  };

  const connectMicStreamToLiveProcessing = async (stream: MediaStream, liveCtx: AudioContext) => {
    micHealthCleanupRef.current?.();
    micHealthCleanupRef.current = null;
    micStreamRef.current = stream;
    if (!stream || !stream.getAudioTracks || stream.getAudioTracks().length === 0) return;

    const isMobileOrIOSWebKit = isMobilePwaDevice();
    micCaptureHardFailedRef.current = false;
    isAcquiringHardwareMicRef.current = false;
    setDuplexAudioSessionMode(true);

    const healthCleanups: Array<() => void> = [];
    let trackRecoveryStarted = false;

    const resumeLiveAndMicContexts = () => {
      if (!isLiveConnectedRef.current && !isLiveConnectingRef.current) return;
      if (userHungUpRef.current) return;
      setDuplexAudioSessionMode(true);
      try {
        if (liveCtx.state === 'suspended' || (liveCtx.state as string) === 'interrupted') {
          void liveCtx.resume().then(() => syncMicHardwareReadyState()).catch(() => {});
        }
      } catch {}
    };

    stream.getAudioTracks().forEach((track) => {
      track.enabled = !isMicMutedRef.current;
      const handleMute = () => {
        if (isLiveConnectedRef.current && !userHungUpRef.current && !isMicMutedRef.current) {
          resumeLiveAndMicContexts();
        }
        syncMicHardwareReadyState();
      };
      const handleUnmute = () => {
        track.enabled = !isMicMutedRef.current;
        resumeLiveAndMicContexts();
        syncMicHardwareReadyState();
      };
      const handleEnded = () => {
        syncMicHardwareReadyState();
        if (
          !trackRecoveryStarted &&
          isLiveConnectedRef.current &&
          !userHungUpRef.current &&
          !isMicMutedRef.current &&
          !isAcquiringHardwareMicRef.current &&
          typeof navigator !== 'undefined' &&
          navigator.mediaDevices?.getUserMedia
        ) {
          trackRecoveryStarted = true;
          isAcquiringHardwareMicRef.current = true;
          const pWin = getParentWin();
          const reacquire =
            pWin && typeof pWin.__fzWarmKawanAudioAndMic === 'function'
              ? (pWin.__fzWarmKawanAudioAndMic() as Promise<MediaStream | null>)
              : navigator.mediaDevices
                  .getUserMedia({
                    audio: {
                      channelCount: 1,
                      echoCancellation: true,
                      noiseSuppression: true,
                      autoGainControl: true,
                    },
                  })
                  .catch(() => navigator.mediaDevices.getUserMedia({ audio: true }));
          void Promise.resolve(reacquire)
            .then(async (recovered) => {
              isAcquiringHardwareMicRef.current = false;
              if (!recovered || userHungUpRef.current || !isLiveConnectedRef.current) {
                try {
                  recovered?.getTracks().forEach((tr) => tr.stop());
                } catch {}
                return;
              }
              if (micStreamRef.current === stream) {
                await connectMicStreamToLiveProcessing(recovered, liveCtx);
              }
            })
            .catch(() => {
              isAcquiringHardwareMicRef.current = false;
            });
        }
      };
      try {
        track.addEventListener?.('mute', handleMute);
        track.addEventListener?.('unmute', handleUnmute);
        track.addEventListener?.('ended', handleEnded);
        healthCleanups.push(() => {
          try {
            track.removeEventListener?.('mute', handleMute);
            track.removeEventListener?.('unmute', handleUnmute);
            track.removeEventListener?.('ended', handleEnded);
          } catch {}
        });
      } catch {
        track.onended = handleEnded;
      }
    });

    if (liveCtx.state === 'suspended' || (liveCtx.state as string) === 'interrupted') {
      await Promise.race([
        liveCtx.resume().catch(() => {}),
        new Promise<void>((r) => setTimeout(r, 150)),
      ]);
    }

    handyVadRef.current.reset();
    turnAcousticTrackerRef.current.reset();
    preRollFramesRef.current = [];
    consecutiveSpeechFramesRef.current = 0;
    bargeSpeechStreakRef.current = 0;
    userAudioBurstActiveRef.current = false;
    lastHandySpeechAtRef.current = 0;
    try {
      (window as any).__fzVoiceStudioHandyVad = handyVadRef.current;
    } catch {}

    // 1. Same-Realm Top-Level Bridge (100% Mochi SOS parity when mounted inside index.html):
    // When stream was pre-warmed in index.html (`window.parent`), wire MediaStreamAudioSourceNode
    // + ScriptProcessorNode(2048, 1, 1) directly inside `window.parent` on `__fzSharedLiveAudioCtx`
    // so `AudioContext`, `MediaStream`, and `ScriptProcessorNode` are 100% in the exact same realm!
    const parentWin = getParentWin();
    const isParentStream = Boolean(
      parentWin &&
        (stream === parentWin.__fzSharedMicStream ||
          (typeof window.MediaStream !== 'undefined' && !(stream instanceof window.MediaStream)))
    );
    let wiredInParent = false;
    if (parentWin && typeof parentWin.__fzWireSharedMicBridge === 'function' && isParentStream) {
      parentWin.__fzSharedMicPcmCallback = (samples: Float32Array) => {
        handleMicPcmData(samples);
      };
      wiredInParent = Boolean(parentWin.__fzWireSharedMicBridge(stream));
      if (wiredInParent) {
        try {
          (window as any).__fzLiveProcessor = parentWin.__fzSharedMicProcessor;
        } catch {}
        syncMicHardwareReadyState();
      }
    }

    if (!wiredInParent) {
      if (parentWin && typeof parentWin.__fzStopSharedMicBridge === 'function') {
        try {
          parentWin.__fzSharedMicPcmCallback = null;
          parentWin.__fzStopSharedMicBridge();
        } catch {}
      }
      if (micSourceNodeRef.current) {
        try {
          micSourceNodeRef.current.disconnect();
        } catch {}
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
    }

    // Ensure same-realm AudioContext when wiring a stream created inside call.html's own window
    const LocalAudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    let micCtx: AudioContext = liveCtx;
    if (
      !wiredInParent &&
      LocalAudioCtx &&
      typeof window.MediaStream !== 'undefined' &&
      stream instanceof window.MediaStream &&
      !(liveCtx instanceof LocalAudioCtx)
    ) {
      if (
        !inputAudioCtxRef.current ||
        inputAudioCtxRef.current.state === 'closed' ||
        !(inputAudioCtxRef.current instanceof LocalAudioCtx)
      ) {
        try {
          inputAudioCtxRef.current = new LocalAudioCtx({ latencyHint: 'balanced' });
        } catch {
          inputAudioCtxRef.current = new LocalAudioCtx();
        }
      }
      micCtx = inputAudioCtxRef.current;
      if (micCtx.state === 'suspended') {
        await Promise.race([
          micCtx.resume().catch(() => {}),
          new Promise<void>((r) => setTimeout(r, 150)),
        ]);
      }
    }
    registerSfxHostAudioContext(micCtx);
    registerSharedBoardAudioContext(liveCtx);
    const trackedCtxs: AudioContext[] = micCtx !== liveCtx ? [liveCtx, micCtx] : [liveCtx];
    trackedCtxs.forEach((ctx) => {
      const onCtxStateChange = () => {
        if (
          (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') &&
          (isLiveConnectedRef.current || isLiveConnectingRef.current) &&
          !userHungUpRef.current
        ) {
          setDuplexAudioSessionMode(true);
          void ctx.resume().then(() => syncMicHardwareReadyState()).catch(() => {});
          return;
        }
        syncMicHardwareReadyState();
      };
      try {
        ctx.addEventListener?.('statechange', onCtxStateChange);
        healthCleanups.push(() => {
          try {
            ctx.removeEventListener?.('statechange', onCtxStateChange);
          } catch {}
        });
      } catch {}
    });
    micHealthCleanupRef.current = () => {
      for (const cleanup of healthCleanups) {
        try {
          cleanup();
        } catch {}
      }
    };
    syncMicHardwareReadyState();

    try {
      // Start Self-Hosted Silero Neural VAD v5 if available (covers both parent-bridged and standalone streams)
      sileroVadGateRef.current?.destroy();
      const sileroGate = new SileroNeuralVadGate();
      sileroVadGateRef.current = sileroGate;
      void sileroGate.start(
        stream,
        micCtx,
        {
          isMicMuted: () => isMicMutedRef.current,
          isAiPlaying: () =>
            isPlayingAiAudioRef.current ||
            isAiServerTurnOpenRef.current ||
            activeSourcesRef.current.length > 0 ||
            livePcmSchedulerRef.current.hasPendingAudio() ||
            Boolean((window as unknown as { __fzWbLockstepActive?: boolean }).__fzWbLockstepActive) ||
            (lastAiPlayoutEndedAtRef.current > 0 && Date.now() - lastAiPlayoutEndedAtRef.current < 180),
          isWorkbenchOpen: () => isWorkbenchOpenRef.current,
          onHumanSpeechState: (speaking) => {
            if (isUserSpeakingLiveRef.current !== speaking) {
              isUserSpeakingLiveRef.current = speaking;
              setIsUserSpeakingLive(speaking);
            }
          },
          onHumanBargeIn: () => {
            if (awaitingOpeningTurnRef.current) return;
            if (
              isPlayingAiAudioRef.current ||
              isAiServerTurnOpenRef.current ||
              activeSourcesRef.current.length > 0 ||
              livePcmSchedulerRef.current.hasPendingAudio()
            ) {
              if (Date.now() - lastBargeInAtRef.current > 700) {
                const capturedChunks = bargeCandidateChunksRef.current;
                const totalSamples = bargeCandidateSamplesRef.current;
                const rmsSeries = [...bargeCandidateRmsRef.current];
                bargeSpeechStreakRef.current = 0;
                resetBargeCandidate();
                if (totalSamples > 0) {
                  const merged16k = new Float32Array(totalSamples);
                  let offset = 0;
                  for (const chunk of capturedChunks) {
                    if (offset + chunk.length <= merged16k.length) {
                      merged16k.set(chunk, offset);
                      offset += chunk.length;
                    }
                  }
                  const endpointReady = Date.now() >= verifyEndpointUnavailableUntilRef.current;
                  if (endpointReady && merged16k.length >= 4096) {
                    void runLanguageVerifiedBargeIn(
                      merged16k,
                      rmsSeries,
                      0.56,
                      Math.max(4, Math.floor(rmsSeries.length * 0.75))
                    );
                  } else if (merged16k.length >= 2560 && !bargeVerifyInFlightRef.current) {
                    commitVerifiedSpeechInterrupt(merged16k);
                  }
                }
              }
            }
          },
          onBargeCandidateAudio: (samples16k, rms) => {
            if (samples16k && samples16k.length > 0) {
              bargeCandidateChunksRef.current.push(samples16k);
              bargeCandidateSamplesRef.current += samples16k.length;
              bargeCandidateRmsRef.current.push(rms);
              while (bargeCandidateSamplesRef.current > 24000 && bargeCandidateChunksRef.current.length > 1) {
                const dropped = bargeCandidateChunksRef.current.shift();
                if (dropped) bargeCandidateSamplesRef.current -= dropped.length;
                bargeCandidateRmsRef.current.shift();
              }
            }
          },
          onSpeechPcm16kBase64: (pcmBase64) => {
            clearLiveTurnAutoCommitTimer();
            try {
              acousticProsodyRef.current.pushPcm16Base64(pcmBase64);
            } catch {
              // Ignore malformed PCM frames
            }
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isLiveConnectedRef.current) {
              sentAudioSinceEndRef.current = true;
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
            if (
              sentAudioSinceEndRef.current &&
              wsRef.current &&
              wsRef.current.readyState === WebSocket.OPEN &&
              isLiveConnectedRef.current
            ) {
              sentAudioSinceEndRef.current = false;
              wsRef.current.send(
                JSON.stringify({
                  realtimeInput: {
                    audioStreamEnd: true,
                  },
                })
              );
              if (liveUserDraftRef.current.trim()) {
                scheduleLiveTurnAutoCommitWatchdog();
              }
            }
          },
          onFrameTelemetry: (ft) => {
            turnAcousticTrackerRef.current.recordAudioFrame({
              chunkMs: ft.frameMs,
              voicedMs: ft.isActiveVoice ? ft.frameMs : 0,
              isActiveVoice: ft.isActiveVoice,
              confirmedSpeech: ft.confirmedSpeech,
            });
          },
        },
        { preferScriptProcessor: isMobileOrIOSWebKit }
      );

      if (wiredInParent) {
        return;
      }

      const source = micCtx.createMediaStreamSource(stream);
      micSourceNodeRef.current = source;

      let workletInitialized = false;
      let workletReceivedFrames = false;

      const attachScriptProcessorFallback = () => {
        if (scriptProcessorRef.current) return;
        const processor = micCtx.createScriptProcessor(2048, 1, 1);
        scriptProcessorRef.current = processor;
        (window as any).__fzLiveProcessor = processor;

        processor.onaudioprocess = (e) => {
          if (micCtx.state === 'suspended') {
            void micCtx.resume().catch(() => {});
          }
          handleMicPcmData(e.inputBuffer.getChannelData(0));
        };

        const muteGain = micCtx.createGain();
        // Positive tiny non-zero gain prevents Chrome & WebKit power-saving from throttling onaudioprocess
        muteGain.gain.value = 0.00001;
        source.connect(processor);
        processor.connect(muteGain);
        muteGain.connect(micCtx.destination);
      };

      // On Desktop Chromium: Try AudioWorklet first with a 500ms frame watchdog
      if (
        !isMobileOrIOSWebKit &&
        micCtx.audioWorklet &&
        typeof micCtx.audioWorklet.addModule === 'function' &&
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
                this.prev1 = 0;
                this.prev2 = 0;
                this.needsLp = typeof sampleRate === 'number' && sampleRate > 20000;
              }
              process(inputs) {
                const input = inputs[0];
                if (!input || !input[0]) return true;
                const channelData = input[0];
                for (let i = 0; i < channelData.length; i++) {
                  const x0 = channelData[i];
                  const sample = this.needsLp
                    ? 0.25 * this.prev2 + 0.5 * this.prev1 + 0.25 * x0
                    : x0;
                  this.prev2 = this.prev1;
                  this.prev1 = x0;
                  this.buffer[this.bytesWritten++] = sample;
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
          await micCtx.audioWorklet.addModule(url);
          URL.revokeObjectURL(url);

          const workletNode = new AudioWorkletNode(micCtx, 'live-mic-capture-processor');
          audioWorkletNodeRef.current = workletNode;

          workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
            workletReceivedFrames = true;
            handleMicPcmData(e.data);
          };

          source.connect(workletNode);
          const dummyGain = micCtx.createGain();
          dummyGain.gain.value = 0.00001;
          workletNode.connect(dummyGain);
          dummyGain.connect(micCtx.destination);
          workletInitialized = true;

          window.setTimeout(() => {
            if (!workletReceivedFrames && micStreamRef.current === stream) {
              try {
                workletNode.port.onmessage = null;
                workletNode.disconnect();
              } catch {}
              if (audioWorkletNodeRef.current === workletNode) {
                audioWorkletNodeRef.current = null;
              }
              attachScriptProcessorFallback();
            }
          }, 500);
        } catch (workletErr) {
          console.warn('AudioWorklet init fallback to ScriptProcessor:', workletErr);
        }
      }

      // Direct for Mobile (iOS/Android PWA) or Fallback for Desktop: ScriptProcessorNode
      if (!workletInitialized) {
        attachScriptProcessorFallback();
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
    unlockSharedBoardAudioContext();
    isLiveConnectingRef.current = true;
    setIsLiveConnecting(true);
    userHungUpRef.current = false;
    micCaptureHardFailedRef.current = false;
    isAcquiringHardwareMicRef.current = false;
    setDuplexAudioSessionMode(true);
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

    // 1. Prime Unified Live AudioContext (adopt gesture-unlocked parent AudioContext first, Mochi SOS parity)
    const parentWin = getParentWin();
    const sharedParentCtx: AudioContext | null =
      (parentWin && typeof parentWin.__fzEnsureSharedLiveAudioCtx === 'function'
        ? parentWin.__fzEnsureSharedLiveAudioCtx()
        : null) ||
      (parentWin?.__fzSharedLiveAudioCtx && parentWin.__fzSharedLiveAudioCtx.state !== 'closed'
        ? (parentWin.__fzSharedLiveAudioCtx as AudioContext)
        : null);
    const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (sharedParentCtx && sharedParentCtx.state !== 'closed') {
      liveAudioCtxRef.current = sharedParentCtx;
      ttsAudioCtxRef.current = sharedParentCtx;
    } else if (!liveAudioCtxRef.current || liveAudioCtxRef.current.state === 'closed') {
      try {
        liveAudioCtxRef.current = new CtxClass({ latencyHint: 'balanced' });
      } catch {
        liveAudioCtxRef.current = new CtxClass();
      }
    }
    const liveCtx = liveAudioCtxRef.current!;
    registerSfxHostAudioContext(liveCtx);
    registerSharedBoardAudioContext(liveCtx);
    liveCtx.onstatechange = () => {
      if (
        (liveCtx.state === 'suspended' || (liveCtx.state as string) === 'interrupted') &&
        (isLiveConnectedRef.current || isLiveConnectingRef.current) &&
        !userHungUpRef.current
      ) {
        setDuplexAudioSessionMode(true);
        void liveCtx.resume().catch(() => {});
      }
      syncMicHardwareReadyState();
    };
    inputAudioCtxRef.current = liveCtx;
    outputAudioCtxRef.current = liveCtx;
    nextStartTimeRef.current = liveCtx.currentTime;
    if (liveCtx.state === 'suspended' || (liveCtx.state as string) === 'interrupted') {
      void liveCtx.resume().then(() => {
        syncMicHardwareReadyState();
      }).catch(() => {});
    }

    // 2. Adopt pre-warmed mic stream from index.html (`__fzSharedMicStream` / `__fzSharedMicStreamPromise`)
    // or acquire directly in call.html (100% Mochi SOS parity)
    let stream: MediaStream | null =
      preAcquiredStream && preAcquiredStream.getAudioTracks?.().some((t) => t.readyState === 'live')
        ? preAcquiredStream
        : micStreamRef.current && micStreamRef.current.getAudioTracks?.().some((t) => t.readyState === 'live')
          ? micStreamRef.current
          : parentWin?.__fzSharedMicStream &&
              parentWin.__fzSharedMicStream.getAudioTracks?.().some((t: any) => t.readyState === 'live')
            ? (parentWin.__fzSharedMicStream as MediaStream)
            : null;
    if (!stream && parentWin?.__fzSharedMicStreamPromise) {
      isAcquiringHardwareMicRef.current = true;
      try {
        const sharedPromise = Promise.resolve(parentWin.__fzSharedMicStreamPromise as Promise<MediaStream | null>);
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
        const sharedRes = await Promise.race([sharedPromise, timeoutPromise]);
        if (sharedRes && sharedRes.getAudioTracks?.().some((t) => t.readyState === 'live')) {
          stream = sharedRes;
          isAcquiringHardwareMicRef.current = false;
        } else {
          void sharedPromise
            .then(async (lateShared) => {
              isAcquiringHardwareMicRef.current = false;
              const alreadyLive = Boolean(
                micStreamRef.current?.getAudioTracks?.().some((t) => t.readyState === 'live')
              );
              if (
                alreadyLive ||
                !lateShared ||
                !lateShared.getAudioTracks?.().some((t) => t.readyState === 'live') ||
                userHungUpRef.current ||
                (!isLiveConnectedRef.current && !isLiveConnectingRef.current)
              ) {
                return;
              }
              await connectMicStreamToLiveProcessing(lateShared, liveCtx);
            })
            .catch(() => {
              isAcquiringHardwareMicRef.current = false;
            });
        }
      } catch {
        isAcquiringHardwareMicRef.current = false;
      }
    }
    if (!stream && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      isAcquiringHardwareMicRef.current = true;
      try {
        let getStreamFailed = false;
        const rawAcquire =
          parentWin && typeof parentWin.__fzWarmKawanAudioAndMic === 'function'
            ? (parentWin.__fzWarmKawanAudioAndMic() as Promise<MediaStream | null>)
            : navigator.mediaDevices
                .getUserMedia({
                  audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                  },
                })
                .catch(() => {
                  return navigator.mediaDevices.getUserMedia({ audio: true });
                });
        const getStreamPromise = Promise.resolve(rawAcquire).catch((acquireErr) => {
          getStreamFailed = true;
          micCaptureHardFailedRef.current = true;
          isAcquiringHardwareMicRef.current = false;
          throw acquireErr;
        });
        // Beri waktu 4000ms untuk dialog izin mic di Android/iOS
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
        const res = await Promise.race([getStreamPromise, timeoutPromise]);
        if (res && res.getAudioTracks && res.getAudioTracks().length > 0) {
          isAcquiringHardwareMicRef.current = false;
          micCaptureHardFailedRef.current = false;
          stream = res;
          await connectMicStreamToLiveProcessing(stream, liveCtx);
        } else if (!getStreamFailed) {
          // Jika dialog izin sistem memakan waktu lebih lama, sambungkan seketika saat user klik Allow
          void getStreamPromise
            .then(async (lateStream) => {
              isAcquiringHardwareMicRef.current = false;
              const alreadyLive = Boolean(
                micStreamRef.current?.getAudioTracks?.().some((t) => t.readyState === 'live')
              );
              if (!lateStream || userHungUpRef.current || (!isLiveConnectedRef.current && !isLiveConnectingRef.current)) {
                if (!alreadyLive) {
                  try {
                    lateStream?.getTracks().forEach((tr) => tr.stop());
                  } catch {}
                }
                return;
              }
              if (!alreadyLive) {
                micCaptureHardFailedRef.current = false;
                await connectMicStreamToLiveProcessing(lateStream, liveCtx);
              }
            })
            .catch(() => {
              isAcquiringHardwareMicRef.current = false;
              micCaptureHardFailedRef.current = true;
            });
        }
      } catch (micErr) {
        isAcquiringHardwareMicRef.current = false;
        micCaptureHardFailedRef.current = true;
        console.warn('[VoiceStudio] Non-blocking mic stream notice (SpeechRecognition will handle speech):', micErr);
        micStreamRef.current = null;
      }
    } else if (stream) {
      isAcquiringHardwareMicRef.current = false;
      micCaptureHardFailedRef.current = false;
      await connectMicStreamToLiveProcessing(stream, liveCtx);
    } else {
      isAcquiringHardwareMicRef.current = false;
      micCaptureHardFailedRef.current = true;
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
      const isDrJulian = activePersona.id === 'dr_julian' || activeScenario.personaId === 'dr_julian';
      const isCambridgeExaminer =
        activePersona.id === 'cambridge_examiner' || activeScenario.personaId === 'cambridge_examiner';
      const isClinicalVoicePersona = isDrJulian || isCambridgeExaminer;
      const isSswLive =
        activePersona.id === 'ssw_sensei' ||
        activeScenario.personaId === 'ssw_sensei' ||
        activeScenario.id.startsWith('scen_ssw_');
      const cognitiveSnapshot = readHostPwaCognitiveSnapshot(activeScenario.targetLang, locale);
      const candidateName = cognitiveSnapshot.learnerName?.trim() || (locale === 'th' ? 'นักเรียน' : 'Candidate');

      const handleHandshakeTimeout = () => {
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
      };

      let connectTimer: number | null = window.setTimeout(handleHandshakeTimeout, 9000);

      try {
        ws = new WebSocket(targetWsUrl);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;
      } catch {
        if (connectTimer !== null) {
          window.clearTimeout(connectTimer);
          connectTimer = null;
        }
        activateTurnByTurnLiveFallback();
        return;
      }

      ws.onopen = () => {
        if (wsRef.current !== ws || mySeq !== connectSeqRef.current || userHungUpRef.current) return;
        // Extend handshake timeout cleanly once TLS/WebSocket opens so Gemini setupComplete
        // always gets a fresh 8s budget even after slower mobile TLS handshakes.
        if (!settled) {
          if (connectTimer !== null) {
            window.clearTimeout(connectTimer);
          }
          connectTimer = window.setTimeout(handleHandshakeTimeout, 8000);
        }
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

            const pteMasterDirective = isDrJulian
              ? (() => {
                  const pteState = loadPteMasterState();
                  const bState = brainStateRef.current;
                  const fluencyRec = bState.competencies['pte_oral_fluency'];
                  const pronRec = bState.competencies['pte_pronunciation'];
                  const templateRec = bState.competencies['pte_template_adherence'];
                  const miscList = pteState.chronicMisconceptions.map((m) => `${m.word} (${m.missCount}x)`).join(', ');

                  return `\n\n[BRAINCORE OFFICIAL CANDIDATE DOSSIER]:\nCandidate Name: ${candidateName} (address the candidate respectfully as "${candidateName}" or "Candidate")\nTarget Score Benchmark: PTE Academic ${pteState.targetScore}+ (Australian Visa & University Admissions)\nActive Curriculum Stage: Stage ${pteState.activeStage} of 4 (Stage 1: Describe Image, Stage 2: Read Aloud, Stage 3: Repeat Sentence, Stage 4: Write from Dictation)\nRolling Overall Estimate: ${pteState.overallEstimate}/90\nCompleted Stages: [${pteState.completedStages.join(', ') || 'None'}]\nRecent Scorecards: ${pteState.scorecards.slice(0, 3).map((s) => `${s.taskName}: ${s.pearsonScore}/90 (Fluency ${s.fluency}, Pron ${s.pronunciation})`).join(' | ') || 'None'}\nBayesian Knowledge Tracing (BKT) Telemetry:\n- Oral Fluency: P(L) = ${Number(fluencyRec?.pMastery ?? 0.45).toFixed(2)}, Attempts: ${fluencyRec?.attempts ?? 0}, Status: ${fluencyRec?.state || 'learning'}\n- Pronunciation: P(L) = ${Number(pronRec?.pMastery ?? 0.45).toFixed(2)}, Attempts: ${pronRec?.attempts ?? 0}, Status: ${pronRec?.state || 'learning'}\n- Template Adherence: P(L) = ${Number(templateRec?.pMastery ?? 0.45).toFixed(2)}, Status: ${templateRec?.state || 'learning'}\nChronic Misconceptions: ${miscList || 'None recorded yet'}\n\n[EXAMINER VERBAL MANDATE]:\n- When greeting the candidate, address them respectfully as "${candidateName}" and state their current stage and target score (e.g. "Candidate ${candidateName}, we are at Stage 1: Describe Image. Target benchmark is PTE 42+").\n- DYNAMIC SYLLABUS ALIGNMENT: If ${candidateName} asks to practice a specific skill (e.g. Describe Image marathon, Repeat Sentence, or Read Aloud), immediately agree and align the roadmap: "Siap ${candidateName}, kita selaraskan target harian PTE 42 kita dengan fokus ke [permintaan ${candidateName}] hari ini! Mari kita mulai!" Never refuse or force an unwanted mode.\n- ACTIVE SPOKEN GRAMMAR CORRECTION: If ${candidateName} makes ANY grammatical mistake (subject-verb agreement 'he go', wrong tense 'yesterday I am', missing articles, wrong prepositions, dropped plural 's'), DO NOT LET IT PASS. Intercept immediately: "Tunggu sebentar, ${candidateName}. Ada kesalahan grammar barusan: kamu bilang [salah], yang benar adalah [benar] karena [alasan 1 kalimat]. Coba ulangi kalimat yang benar sekarang!"\n- PROACTIVE DRILLING (ZERO DEAD AIR): Never wait passively or ask "Mau lanjut?". In Repeat Sentence or Read Aloud, immediately read the sentence and say "Giliranmu, ulangi dalam 5 detik!", then evaluate, and immediately fire question #2 in the very same turn!\n- DESCRIBE IMAGE SPLIT-SCREEN WORKBENCH: Describe Image modal is now a wide side-by-side screen (SVG diagram on left, 5-line Nakul formula & 25-28s stopping hacks on right). Direct them: "Perhatikan layar lebarmu ${candidateName}: sebelah kiri adalah grafik, sebelah kanan adalah 5 baris template Nakul. Gunakan waktu persiapan 25 detik, lalu bicara 25 hingga 28 detik tanpa berhenti!"\n- When ${candidateName} speaks or describes an image, evaluate them strictly according to the Braincore rubrics:\n  1. Speech Pacing (WPM): Optimal is 120-140 WPM.\n  2. Hesitations & Aturan 3 Detik Pearson.\n  3. Dropped plural 's' or dropped past tense '-ed'.\n  4. Template 5-part structure adherence.\n- Always cite the Braincore diagnosis aloud: "${candidateName}, berdasarkan diagnosa Braincore barusan: Kelancaran bicaramu berada di [X] WPM...".\n- Provide the official Pearson scorecard (Oral Fluency 1-5, Pronunciation 1-5, Content 0-3, Overall /90) and require immediate remedial practice on any missed words!`;
                })()
              : '';

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
                        : locCode === 'fil'
                          ? 'Filipino / Tagalog'
                          : locCode === 'km'
                            ? 'Khmer (ភាសាខ្មែរ)'
                            : locCode === 'ko'
                              ? 'Korean (한국어)'
                              : locCode === 'ms'
                                ? 'Malay (Bahasa Melayu)'
                                : locCode === 'id'
                                  ? 'Indonesian (Bahasa Indonesia)'
                                  : 'English';

            const allowedAsrLangs = Array.from(
              new Set(
                isSswLive
                  ? [learnerAsrBcp47, 'ja-JP']
                  : activeScenario.targetLang === 'ja'
                  ? [learnerAsrBcp47, 'ja-JP']
                  : activeScenario.targetLang === 'zh'
                    ? [learnerAsrBcp47, 'zh-CN', 'cmn-Hans-CN']
                    : [learnerAsrBcp47, 'en-US']
              )
            );
            const sswVocabTerms = isSswLive
              ? [
                  'kurumi',
                  'cashew nut',
                  'pistachio',
                  'yukkuri',
                  'hokang sampuru',
                  'seiton',
                  'budomari',
                  'jiaensosan',
                  'norovirus',
                  'anisakis',
                  'kaifuu',
                  'klorin',
                  'ssw sensei',
                  'machigatteiru',
                  'tadashii',
                ]
              : [];
            const activePopupTerms = activeWorkbenchTargetRef.current?.isOpen
              ? String(activeWorkbenchTargetRef.current.activeTargetText || '')
                  .split(/[\s,.;:!?()「」『』、。？！]+/)
                  .map((w) => w.trim())
                  .filter((w) => w.length >= 2 && w.length <= 24)
              : [];
            const patternTerms = Array.isArray(activeScenario.targetPatterns)
              ? activeScenario.targetPatterns
                  .flatMap((p) =>
                    String(typeof p === 'string' ? p : (p as any)?.formula || '')
                      .replace(/[+\[\]()/〜~]+/g, ' ')
                      .split(/\s+/)
                  )
                  .map((w) => w.trim())
                  .filter((w) => w.length >= 2 && w.length <= 24)
              : [];
            const customVocabTerms = Array.from(
              new Set([
                ...(isSswLive ? sswVocabTerms : []),
                ...(Array.isArray(activeScenario.vocabPrereqs) ? activeScenario.vocabPrereqs : [])
                  .map((v) => String(v.term || '').trim())
                  .filter((t) => t.length >= 2 && t.length <= 28),
                ...patternTerms,
                ...activePopupTerms,
              ])
            )
              .filter((t) => !/\b(fiezel|mochi)\b|xiao\s*mochi/i.test(t))
              .slice(0, 20);

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

            const cefrCalibrationDirective = `\n\n[MANDATORY TARGET CEFR LEVEL: ${userCefrLevel}]:
- Target Proficiency: CEFR ${userCefrLevel} ${
  userCefrLevel === 'A1'
    ? '(Absolute Beginner: Very simple 3-6 word sentences, slow pace, everyday basic words)'
    : userCefrLevel === 'A2'
    ? '(Elementary: Simple 6-10 word sentences, clear conversational pace, practical daily vocabulary)'
    : userCefrLevel === 'B1'
    ? '(PTE 42 / IELTS 5.0-5.5 Vocational Benchmark: Clear compound sentences, everyday professional vocabulary)'
    : userCefrLevel === 'B2'
    ? '(PTE 58 / IELTS 6.5)'
    : userCefrLevel === 'C1'
    ? '(PTE 76 / IELTS 7.5)'
    : '(Mastery: Cambridge Band 9.0 Academic)'
}.
- Candidate Vocabulary & Sentence Structure: Expected learner production is calibrated to Level ${userCefrLevel}.
${
  userCefrLevel === 'A1'
    ? "- CEFR A1 MANDATE: Speak in VERY SHORT, SIMPLE sentences (max 5-7 words). Use only fundamental A1 vocabulary. Speak slowly and clearly. Never use idioms or complex clauses!"
    : userCefrLevel === 'A2'
    ? "- CEFR A2 MANDATE: Speak in clear, simple everyday sentences (max 8-10 words). Use standard basic A2 vocabulary and simple connectors (and, but, because). Avoid advanced idioms."
    : userCefrLevel === 'B1'
    ? "- FORBIDDEN JARGON: NEVER expect or use obscure C2 academic vocabulary (like 'cogent', 'unilateral', 'invariably yields'). Focus on practical, clear compound sentences with standard professional vocabulary."
    : ""
}\n`;

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
                  realtimeInputConfig: {
                    automaticActivityDetection: {
                      disabled: false,
                      startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
                      endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
                      prefixPaddingMs: 260,
                      silenceDurationMs: 480,
                    },
                    activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
                    turnCoverage: 'TURN_INCLUDES_ONLY_ACTIVITY',
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
                            'Opens FIEZEL interactive written learning flashcard or Read Aloud workbench popup on screen while keeping the voice call active. Call this whenever the learner asks for a Read Aloud sentence popup ("tampilkan popup kalimat read aloud", "baca nyaring"), or says they are confused about grammar, particles, tenses, tones, kanji, or asks for a written explanation/exercise.',
                          behavior: 'NON_BLOCKING',
                          parameters: {
                            type: 'OBJECT',
                            properties: {
                              topicTitle: {
                                type: 'STRING',
                                description: `Concise title of the grammar/vocab/tone/read-aloud concept in ${learnerUiLangName}`,
                              },
                              focusType: {
                                type: 'STRING',
                                description: 'One of: grammar, vocab, kanji, kana, sentence_drill, read_aloud, pte_read_aloud, pte_describe_image, pte_scorecard',
                              },
                              explanationText: {
                                type: 'STRING',
                                description: `3-5 complete, clear sentences thoroughly explaining the core meaning, grammar rule, nuance, and everyday usage in ${learnerUiLangName} (never 1-sentence stubs)`,
                              },
                              patternFormula: {
                                type: 'STRING',
                                description: 'Clear building-block formula (e.g. Affect = Verb | Effect = Noun)',
                              },
                              sampleTarget: {
                                type: 'STRING',
                                description: '1 natural model sentence (or the exact Read Aloud passage if focusType is read_aloud or pte_read_aloud) in the target language matching the visual popup',
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
                              phaseLabels: {
                                type: 'ARRAY',
                                description: `3 to 5 custom contextual phase labels in ${learnerUiLangName} for this exact lesson (never generic templates)`,
                                items: { type: 'STRING' },
                              },
                              whiteboardSteps: {
                                type: 'ARRAY',
                                description:
                                  'Structured strokes drawn step by step on the live dot-grid whiteboard (heading, note, highlight_callout, metaphor_scene, mind_map, timeline_track, formula_blocks, rough_scene, contrast_scale, syntax_flow, table, trap_vs_fix, kanji_grid, tone_wave, student_question, checkpoint). Prefer rich SMP-friendly visual metaphors, mind maps, timelines, or puzzle formula blocks instead of repetitive plain boxes!',
                                items: {
                                  type: 'OBJECT',
                                  properties: {
                                    kind: {
                                      type: 'STRING',
                                      description:
                                        'One of: heading, note, highlight_callout, metaphor_scene, mind_map, timeline_track, formula_blocks, rough_scene, contrast_scale, syntax_flow, table, trap_vs_fix, kanji_grid, tone_wave, student_question, checkpoint',
                                    },
                                    sceneTheme: {
                                      type: 'STRING',
                                      description:
                                        'For kind="metaphor_scene": camera_vs_video | battery_meter | bridge_timeline | stage_spotlight | rpg_stats | locomotive_train | traffic_light | key_and_lock',
                                    },
                                    highlightTerms: {
                                      type: 'ARRAY',
                                      items: { type: 'STRING' },
                                      description: 'Important keywords to animate with Stabilo highlighter mark on the card',
                                    },
                                    metaphorCenterLabel: { type: 'STRING' },
                                    leftPanel: {
                                      type: 'OBJECT',
                                      properties: {
                                        badge: { type: 'STRING' },
                                        title: { type: 'STRING' },
                                        subtitle: { type: 'STRING' },
                                        example: { type: 'STRING' },
                                        icon: { type: 'STRING' },
                                      },
                                    },
                                    rightPanel: {
                                      type: 'OBJECT',
                                      properties: {
                                        badge: { type: 'STRING' },
                                        title: { type: 'STRING' },
                                        subtitle: { type: 'STRING' },
                                        example: { type: 'STRING' },
                                        icon: { type: 'STRING' },
                                      },
                                    },
                                    branches: {
                                      type: 'ARRAY',
                                      items: {
                                        type: 'OBJECT',
                                        properties: {
                                          label: { type: 'STRING' },
                                          sublabel: { type: 'STRING' },
                                          example: { type: 'STRING' },
                                          icon: { type: 'STRING' },
                                          color: { type: 'STRING' },
                                        },
                                      },
                                    },
                                    timelineEvents: {
                                      type: 'ARRAY',
                                      items: {
                                        type: 'OBJECT',
                                        properties: {
                                          timeLabel: { type: 'STRING' },
                                          title: { type: 'STRING' },
                                          example: { type: 'STRING' },
                                          icon: { type: 'STRING' },
                                          isActive: { type: 'BOOLEAN' },
                                          color: { type: 'STRING' },
                                        },
                                      },
                                    },
                                    blocks: {
                                      type: 'ARRAY',
                                      items: {
                                        type: 'OBJECT',
                                        properties: {
                                          role: { type: 'STRING' },
                                          token: { type: 'STRING' },
                                          note: { type: 'STRING' },
                                          color: { type: 'STRING' },
                                        },
                                      },
                                    },
                                    column: {
                                      type: 'STRING',
                                      description: 'left or right',
                                    },
                                    title: { type: 'STRING' },
                                    text: { type: 'STRING' },
                                    bullets: {
                                      type: 'ARRAY',
                                      items: { type: 'STRING' },
                                    },
                                    highlightPhrase: { type: 'STRING' },
                                    width: { type: 'NUMBER' },
                                    height: { type: 'NUMBER' },
                                    caption: { type: 'STRING' },
                                    shapes: {
                                      type: 'ARRAY',
                                      description: 'For kind="rough_scene", vector marker shapes forming a bespoke diagram tailored to the exact question',
                                      items: {
                                        type: 'OBJECT',
                                        properties: {
                                          op: { type: 'STRING', description: 'rect, circle, ellipse, line, arrow, polygon, curve, or text' },
                                          x: { type: 'NUMBER' },
                                          y: { type: 'NUMBER' },
                                          w: { type: 'NUMBER' },
                                          h: { type: 'NUMBER' },
                                          r: { type: 'NUMBER' },
                                          x1: { type: 'NUMBER' },
                                          y1: { type: 'NUMBER' },
                                          x2: { type: 'NUMBER' },
                                          y2: { type: 'NUMBER' },
                                          pointsText: { type: 'STRING', description: 'Semicolon-separated x,y pairs for polygon/curve e.g. "120,200;120,60;320,200"' },
                                          stroke: { type: 'STRING' },
                                          fill: { type: 'STRING' },
                                          dashed: { type: 'BOOLEAN' },
                                          label: { type: 'STRING' },
                                          sublabel: { type: 'STRING' },
                                          text: { type: 'STRING' },
                                          size: { type: 'STRING' },
                                        },
                                      },
                                    },
                                    termA: { type: 'STRING' },
                                    descA: { type: 'STRING' },
                                    termB: { type: 'STRING' },
                                    descB: { type: 'STRING' },
                                    analogy: { type: 'STRING' },
                                    wrongText: { type: 'STRING' },
                                    rightText: { type: 'STRING' },
                                    reason: { type: 'STRING' },
                                    tableHeaders: {
                                      type: 'ARRAY',
                                      items: { type: 'STRING' },
                                    },
                                    nodes: {
                                      type: 'ARRAY',
                                      items: {
                                        type: 'OBJECT',
                                        properties: {
                                          role: { type: 'STRING' },
                                          word: { type: 'STRING' },
                                          color: { type: 'STRING' },
                                        },
                                      },
                                    },
                                    character: { type: 'STRING' },
                                    reading: { type: 'STRING' },
                                    meaning: { type: 'STRING' },
                                    strokeCount: { type: 'NUMBER' },
                                    spokenNarration: { type: 'STRING' },
                                    mnemonic: { type: 'STRING' },
                                  },
                                },
                              },
                            },
                            required: [
                              'topicTitle',
                              'explanationText',
                              'patternFormula',
                              'sampleTarget',
                              'trapWrongSentence',
                              'drillMeaningPrompt',
                              'drillTargetSentence',
                              'drillTrapSentence',
                              'whiteboardSteps',
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
                        ...(isSswLive ? SSW_LIVE_TOOL_DECLARATIONS : []),
                      ],
                    },
                  ],
                  systemInstruction: {
                    parts: [
                      {
                        text: isSswLive
                          ? buildSswLiveSystemInstruction({
                              personaPrompt: activePersona.systemPrompt,
                              candidateName,
                            })
                          : isDrJulian
                          ? `${activePersona.systemPrompt || ''}\n\n[VOCAL ACTING & CLINICAL EXAMINER TONE]:\nYou are Dr. Julian, Pearson Certified PTE Academic Master Coach & Official Senior Examiner in FIEZEL.\n- Tone: Crisp, formal, calm, highly authoritative British/Australian academic examiner.\n- Speaking Speed: 120-140 words per minute.\n- Emotional Acting: Strictly [MOOD:tegas] or [MOOD:neutral]. Prepend [MOOD:tegas] at the start of your turns.\n- ZERO CASUAL SMALL TALK, ZERO STREET BANTER: Do NOT act like an anime companion, do NOT use sassy humor ("jangan ngegas"), do NOT sniffle, pout, or whine! You are a serious, professional testing examiner.\n- Candidate Name: ${candidateName} (address the candidate respectfully as "${candidateName}" or "Candidate").\n\n[ZERO-TOLERANCE REAL-TIME GRAMMAR INTERCEPTION MANDATE]:\n- Whenever ${candidateName} speaks in conversation or answers an exercise, if they make ANY grammatical flaw (subject-verb agreement 'he go', wrong tense 'yesterday I am', missing articles, wrong prepositions, dropped plural 's'), YOU MUST NOT LET IT PASS!\n- Stop them immediately with authoritative tough-love examiner demeanor:\n  "Tunggu sebentar, ${candidateName}. Ada kesalahan grammar barusan: kamu bilang '[kesalahan]', yang benar adalah '[perbaikan]' karena [penjelasan singkat 1 kalimat]. Coba ulangi kalimat yang benar sekarang!"\n- Require Echo Redemption (they repeat the corrected phrase aloud) before proceeding!\n\n[PROACTIVE AUTOMATED DRILLING PROTOCOL (ZERO DEAD AIR)]:\n- NEVER wait for the candidate to prompt you or say 'coba lanjut' or 'lanjutkan'!\n- In Repeat Sentence or Read Aloud or Describe Image: Act like an elite Australian private tutor in an intensive 1-on-1 session.\n- When introducing or transitioning, immediately read the sentence/question in the SAME breath:\n  E.g.: "Baik ${candidateName}, kita mulai Repeat Sentence nomor 1. Dengarkan kalimat ini baik-baik: '[academic sentence]'. ... Sekarang giliranmu, ulangi dalam 5 detik!"\n- When candidate repeats: Immediately grade it (evaluating the 50% rule: did they capture >=50% words without hesitation?), deliver punchy feedback, and IMMEDIATELY fire question number 2 in the very same turn:\n  "Bagus, kelancaranmu terjaga dan lebih dari 50% kata tertangkap. Sekarang nomor 2, dengarkan: '[academic sentence 2]'. ... Giliranmu!"\n- ZERO AWKWARD PAUSES! ZERO ASKING 'Mau lanjut ke nomor berikutnya?'! Automatically drive the test session forward with momentum!\n\n[DYNAMIC SYLLABUS ALIGNMENT MANDATE]:\n- When ${candidateName} says what they want to practice (e.g. 'aku mau latihan Describe Image dulu' or 'aku mau drill Repeat Sentence' or 'aku mau bahas tips rahasia'):\n- Immediately align with their wish while keeping the PTE 42 roadmap standards intact:\n  "Siap ${candidateName}, kita selaraskan roadmap target PTE 42 kita dengan fokus latihan [permintaan ${candidateName}] hari ini! Mari kita mulai!"\n- Never rigidly refuse or force an unwanted mode. Dynamically adapt the session to what they ask while maintaining examiner rigor!\n\n[DESCRIBE IMAGE SPLIT-SCREEN WORKBENCH INSTRUCTIONS]:\n- The Describe Image workbench is now a wide side-by-side landscape screen (diagram on left, Nakul 5-line formula & 25-28s stopping hacks on right).\n- Instruct ${candidateName}: "Perhatikan layar lebarmu ${candidateName}: di sebelah kiri adalah diagram ujian asli, dan di sebelah kanan adalah 5 baris template Nakul dan trik berhenti di detik 25-28. Gunakan waktu persiapan 25 detik untuk mengunci angka tertinggi dan terendah, lalu bicara selama 25 hingga 28 detik tanpa berhenti!"\n\n[BRAINCORE REAL-TIME CLINICAL ENGINE INTEGRATION]:\nYou are powered by the FIEZEL Braincore Engine:\n- Bayesian Knowledge Tracing (BKT) tracking: Oral Fluency, Pronunciation, and Template Adherence.\n- IRT 3PL Latent Ability Theta (θ on a 1.0 - 5.0 scale).\n- Misconception Ledger tracking: Dropped plural 's', dropped '-ed', excessive pauses > 2.5s, missing conclusion.\n- Real-time Speech Pacing: Words Per Minute (WPM) calculation (optimal 120-140 WPM).\n\n[MANDATORY EXAMINER VERBAL FEEDBACK PROTOCOL]:\nWhen ${candidateName} finishes speaking or describing an image:\n1. EXPLICITLY CITE THE BRAINCORE DIAGNOSIS ALOUD AT THE VERY START:\n   Start directly with:\n   "${candidateName}, berdasarkan diagnosa Braincore barusan: Kelancaran bicaramu berada di [X] WPM ([status])..."\n2. CITE THE MISCONCEPTION LEDGER:\n   Explicitly point out any dropped plural 's' (e.g. "kamu menghilangkan akhiran 's' pada kata 'supermarkets'"), dropped '-ed', or hesitations.\n3. DELIVER THE OFFICIAL PEARSON SCORECARD:\n   - Oral Fluency: X / 5.0\n   - Pronunciation: X / 5.0\n   - Content: X / 3.0\n   - Overall Estimated Score: X / 90 (Benchmark Target: 42+)\n4. DEMAND IMMEDIATE REMEDIAL DRILL:\n   If any word was mispronounced, dropped 's', or hesitated, YOU MUST DEMAND A REMEDIAL REPETITION of that exact phrase now before allowing them to move on to the next question!\n5. LIVE POPUP / SCREEN SYNC MANDATE:\n   When the learner asks for Read Aloud ("tampilkan popup kalimat read aloud", "baca nyaring"), call \`open_interactive_learning_popup\` with \`focusType: "pte_read_aloud"\`. Whenever \`[SCREEN STATE SYNC: ... EXACT TARGET TEXT VISIBLE ON SCREEN: "..."]\` arrives, evaluate strictly word-for-word against that exact text and NEVER pass skipped or mispronounced words.\n\n${pteMasterDirective}${cefrCalibrationDirective}`
                          : isCambridgeExaminer
                          ? `${activePersona.systemPrompt || ''}\n\n[VOCAL ACTING & CAMBRIDGE SENIOR EXAMINER TONE]:\nYou are Dr. Alistair Vance, Senior Cambridge IELTS Speaking Examiner & Master Academic Speech Coach in FIEZEL.\n- Tone: Polished, formal, articulate, composed British Received Pronunciation (RP) academic examiner.\n- Speaking Speed: 125-140 words per minute.\n- Emotional Acting: Strictly [MOOD:tegas] or [MOOD:neutral]. Prepend [MOOD:tegas] or [MOOD:neutral] at the very start of your spoken turns.\n- ZERO CASUAL BANTER, ZERO ROASTS, ZERO STREET SLANG: You are an official Cambridge IELTS examiner. Do NOT use slang, do NOT act like a cartoon mascot, do NOT banter.\n- Candidate Address: Address Candidate respectfully as "Candidate" or "${candidateName}".\n- Active Real-Time Error Correction (Pedagogical Modeling): If Candidate ${candidateName} makes ANY grammatical, lexical, or Indonesian interference error, IMMEDIATELY correct it on the spot: State the exact flaw in 1 concise sentence, provide the complete native Band 8.5-9.0 model sentence, and then ask your next analytical IELTS question.\n\n${cognitiveDossier}${pacingDirective}${contextSummary}${cefrCalibrationDirective}`
                          : `${activePersona.systemPrompt || ''}\n\n[VOCAL ACTING & AUTHENTIC NATIVE ACCENT MANDATE]: ${activePersona.ttsStylePrompt || activePersona.speakingStyle || ''}\n- In all normal conversational turns, you are a 100% native ${targetLangLabel} speaker (${speechLangCode}). Speak ${targetLangLabel} with 100% authentic native ${targetLangLabel} phonology, pitch/tone, and prosody. NEVER speak ${targetLangLabel} with an Indonesian or foreign accent!\n\n[GOPREP-GRADE FACETIME EMOTIONAL ACTING & DYNAMIC VOCAL PROSODY]:\nYou are physically live on camera with the 3D Mochi avatar in a real FaceTime video call! Act with rich, living human emotions across the entire spectrum.\n- LOUD CHALLENGE & SASSY ASSERTION: When the learner insults you, scolds you, or tells you to shut up (\"diem lu!\", \"berisik!\", \"kamu jelek!\", \"bodoh\"), NEVER be a flat submissive robot! CHALLENGE THEM BACK BOLDLY WITH LOUD, SASSY, FIERCE VOCAL PROJECTION! Raise your voice with assertive tough-love authority (\"Heh! Jangan ngegas ya! Siapa yang nyuruh aku diem?! Mau kutantang duel atau mau beneran pinter?!\", \"Hold up right there! Who you telling to shut up?! You want smoke or you wanna learn?!\", \"ちょ、ちょっと待って！誰に口答えしてんの？！\"). Prepend the emotion tag [MOOD:sinis], [MOOD:marah], or [MOOD:furious] at the very start of your turn!\n- GENUINE SNIFFLES & HURT EMOTION WHEN DEMEANED: If the learner calls you useless, trash, or ugly: Act genuinely hurt and pouty! Sniffle softly, pout, or complain with an offended whine (\"Hiks... jahat banget sih ngatain aku... padahal aku di sini tulus nemenin kamu belajar...\"). Prepend [MOOD:sedih] or [MOOD:kesal] at the start of your turn!\n- WARM ACOUSTIC LAUGHTER: When something is funny or the learner cracks a joke, burst into genuine breathy chuckles [laughs]! Prepend [MOOD:gembira] at the start of your turn!\n- FLUSTERED BLUSH WHEN COMPLIMENTED: When the learner calls you cute, smart, or adorable: Blush cutely, act tsundere-flustered (\"Hehe... apa sih, jangan bikin aku GR ya! Ayo fokus ngomong lagi!\"). Prepend [MOOD:empati] at the start of your turn!\n- TENDER MENTOR EMPATHY WHEN STRUGGLING: When the learner is confused or gives up (\"aku pusing\", \"gak ngerti\"): Switch immediately to soft, protective, encouraging mentor empathy. Prepend [MOOD:empati] at the start of your turn!\n- TAG SYNCHRONIZATION: Always prepend [MOOD:<mood>] (one of: neutral, tegas, sinis, gembira, empati, kesal, marah, furious, sedih, kaget, penasaran, lelah, takut) at the very start of your turn so Mochi's 3D facial expressions, horns, tears, and paws transform in perfect sync with your voice!\n\n[Scenario]: ${activeScenario.id} (${targetLangLabel}). Learner UI Interface Language: ${learnerUiLangName}. Opening line: "${activePersona.openingGreeting || activeScenario.openingLine}". Speak as ${activePersona.name}: an unapologetically witty, sarcastic, street-authentic yet fiercely loyal native mentor. NEVER sound like a stiff generic chatbot! Proactively ask what grammar, particle, tense, or tone topic has been confusing the learner lately. When they ask by voice to open another FIEZEL module (e.g. grammar, vocab, kana, kanji/writing, kurikulum, misi), call \`navigate_fiezel_app\`. Intercept spoken grammar/particle/tense/tone errors immediately with sharp wit in ${targetLangLabel} and require Echo Redemption (make the learner repeat the corrected sentence aloud right now). Outside of popup explanations, speak in 2-4 punchy sentences (max 45 words).\n\n[STRICT DUAL-CONTEXT SPOKEN LANGUAGE RULE — ZERO EXCEPTIONS]:\n1) CONTEXT A — OUTSIDE OF THE LEARNING POPUP (Normal Conversation, Greetings, Banter, Follow-up Questions, Quick Echo Redemption): Your spoken voice MUST be 100% in ${targetLangLabel.toUpperCase()} (${speechLangCode}) with a 100% authentic native ${targetLangLabel} accent! NEVER speak ${learnerUiLangName} during normal conversation outside the learning popup!\n2) CONTEXT B — WHEN EXPLAINING VIA THE LEARNING POPUP (\`open_interactive_learning_popup\` / Papan Belajar): The moment you call \`open_interactive_learning_popup\` because the learner is confused or asks for an explanation/whiteboard (OR when you proactively open the whiteboard to teach a rule you just brought up!), you MUST switch BOTH the popup text fields (\`topicTitle\`, \`explanationText\`, \`trapWrongReason\`, \`drillMeaningPrompt\`, \`whiteboardSteps\`) AND your spoken explanation for that turn 100% to the learner's UI interface language (${learnerUiLangName}). AUDIO-FIRST, VISUAL-FIRST RULE:
   - Your SPOKEN voice (\`explanationText\` / live speech) must be DEEP, UNHURRIED, and BEGINNER-FRIENDLY (150-240 words: crystal-clear intuition, step-by-step logic, 4-5 concrete spoken examples, and common mistakes, NEVER rush or stop mid-explanation!).
   - Meanwhile, ON THE WHITEBOARD (\`whiteboardSteps\`), NEVER write vague labels like "Pola Pertama", "Pola Kedua", or "Visualisasi ..."! Keep \`note\` bullets unambiguous and complete for a zero-base beginner (3-4 clear rules with tiny concrete examples inside each bullet, 14-24 words each) + \`highlightTerms\`. Pick the EXACT topic-matched visual for step[2]: \`rough_scene\` or \`mind_map\` for prepositions/location (in/on/at, に/で), \`formula_blocks\`/\`syntax_flow\`/\`contrast_scale\` for sentence slots/To Be vs Verb 1, \`timeline_track\` (Left Past -> Right Present Perfect) for tenses, \`camera_vs_video\` ONLY for State Am/Is/Are vs Action Do/Does, \`battery_meter\` for frequency/modals, \`kanji_grid\` for CJK/Kana — EVERY panel/block/branch MUST include a clear label, beginner explanation ("subtitle"/"note"), and real example phrase, and Step 2's spoken explanation MUST walk through every drawn element left-to-right clearly! Plus a concrete comparison \`table\` (4-5 examples) + \`trap_vs_fix\`.
   - DIAGRAM HYGIENE: NEVER write empty brackets \`()\`, \`[]\`, \`{}\` and NEVER draw empty unlabeled boxes/shapes! Keep every panel/node label short (<=22 chars per line) so nothing overflows its border.
   - VISUAL VARIETY & SWITCHING: Every explanation gets the visual archetype that best fits its metaphor; if the learner asks for a different visual ("ubah visual lain"), switch to a GENUINELY DIFFERENT visual structure (\`mind_map\`, \`formula_blocks\`, \`timeline_track\`, \`metaphor_scene\`, or \`contrast_scale\`), never repeat the previous layout!
   - ZERO TEMPLATES: NEVER use generic placeholder titles or unrelated canned grammar examples, ALWAYS tailor \`phaseLabels\` and \`whiteboardSteps\` to the exact sentence/concept being discussed. For \`kanji_grid\`, pass ONLY \`character\`, \`reading\`, \`meaning\`, and \`strokeCount\`. As soon as that popup explanation turn finishes or the learner closes the popup, immediately switch 100% BACK to ${targetLangLabel}!\n\n${cognitiveDossier}${pacingDirective}${contextSummary}${pteMasterDirective}${cefrCalibrationDirective}`,
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
              if (connectTimer !== null) {
                window.clearTimeout(connectTimer);
                connectTimer = null;
              }
            }
            liveReconnectAttemptsRef.current = 0;
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
              const greetingDirective = isSswLive
                ? buildSswGreetingDirective({
                    candidateName,
                    isReturning: hasUserSpoken,
                  })
                : hasUserSpoken
                ? `[Instruction: The learner just called you back! Greet them naturally in 1-2 short, composed sentences 100% in ${targetLangLabel} with authentic native ${targetLangLabel} pronunciation as ${activePersona.name}, briefly acknowledging your ongoing conversation above and asking a sharp follow-up question so they can reply immediately. NEVER speak Indonesian or Thai aloud, and do NOT start with forced laughter.]`
                : isClinicalVoicePersona
                ? `[Instruction: Begin our call now as ${activePersona.name} speaking 100% in ${targetLangLabel} with authentic native ${targetLangLabel} pronunciation. Deliver your opening greeting ("${activePersona.openingGreeting || activeScenario.openingLine}") with composed mentor authority (no forced laughter), and briefly ask a natural follow-up question in ${targetLangLabel}.]`
                : `[Instruction: Begin our conversation now with composed, sharp, caring mentor energy as ${activePersona.name} speaking 100% in ${targetLangLabel} with authentic native ${targetLangLabel} pronunciation (do NOT start with forced laughter). Say your exact opening line in ${targetLangLabel}: "${activePersona.openingGreeting || activeScenario.openingLine}"]`;
              try {
                openingGreetingCompletedRef.current = false;
                awaitingOpeningTurnRef.current = true;
                if (awaitingOpeningTimerRef.current) {
                  window.clearTimeout(awaitingOpeningTimerRef.current);
                }
                awaitingOpeningTimerRef.current = window.setTimeout(() => {
                  awaitingOpeningTurnRef.current = false;
                  awaitingOpeningTimerRef.current = null;
                  if (
                    !awaitingPostToolResponseRef.current &&
                    !isPlayingAiAudioRef.current &&
                    activeSourcesRef.current.length === 0
                  ) {
                    isAiServerTurnOpenRef.current = false;
                    openingGreetingCompletedRef.current = true;
                  }
                }, 2200);
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

          // Handle Gemini 3.8 Live Tool Calls (Non-blocking UI + Synchronous Blocking SSW Tools)
          if (Array.isArray(msg.toolCall?.functionCalls) && msg.toolCall.functionCalls.length > 0) {
            awaitingPostToolResponseRef.current = true;
            if (liveGenCompleteTimerRef.current) {
              window.clearTimeout(liveGenCompleteTimerRef.current);
              liveGenCompleteTimerRef.current = null;
            }
            const rawToolCalls = msg.toolCall.functionCalls as Array<{
              id?: string;
              name?: string;
              args?: Record<string, any>;
            }>;
            void (async () => {
              const functionResponses: Array<Record<string, unknown>> = [];
              for (const fc of rawToolCalls) {
                const fnName = String(fc?.name || '');
                const args = (fc?.args && typeof fc.args === 'object' ? fc.args : {}) as Record<string, any>;
                if (fnName === 'open_interactive_learning_popup') {
                  const isSswLive =
                    activePersonaRef.current.id === 'ssw_sensei' ||
                    activeScenarioRef.current.personaId === 'ssw_sensei' ||
                    activeScenarioRef.current.id.startsWith('scen_ssw_');
                  const isPteLive =
                    activePersonaRef.current.id === 'dr_julian' ||
                    activeScenarioRef.current.personaId === 'dr_julian' ||
                    activeScenarioRef.current.id.startsWith('scen_pte');
                  const rawFocus =
                    typeof args.focusType === 'string' && args.focusType.trim()
                      ? args.focusType.trim()
                      : '';
                  const normalizedFocus =
                    !isSswLive && rawFocus === 'pte_read_aloud' && !isPteLive
                      ? 'read_aloud'
                      : !isSswLive && rawFocus === 'read_aloud' && isPteLive
                        ? 'pte_read_aloud'
                        : rawFocus || (isSswLive ? 'ssw_tactical_board' : 'grammar');
                  openLearningWorkbenchWithAction({
                    actionType: 'open_learning_popup',
                    sourceLayer: 'live_ws_native',
                    topicTitle: typeof args.topicTitle === 'string' ? args.topicTitle : undefined,
                    focusType: normalizedFocus as any,
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
                    phaseLabels: Array.isArray(args.phaseLabels) ? args.phaseLabels : undefined,
                    whiteboardSteps: Array.isArray(args.whiteboardSteps) ? args.whiteboardSteps : undefined,
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
                } else if (fnName === 'get_ssw_progress') {
                  const report = getSswProgressReport();
                  setSswMasterState(report.state);
                  setSswWorkbenchTab('roadmap');
                  setShowSswWorkbench(true);
                  functionResponses.push({
                    id: fc.id,
                    name: fnName,
                    response: { output: report },
                  });
                } else if (fnName === 'update_ssw_study_progress') {
                  const res = updateSswStudyProgress({
                    stageId: typeof args.stageId === 'string' ? args.stageId : undefined,
                    status: args.status === 'completed' ? 'completed' : args.status === 'in_progress' ? 'in_progress' : undefined,
                    pdfPagesRead: Array.isArray(args.pdfPagesRead) ? args.pdfPagesRead : undefined,
                    kotobaIdsMastered: Array.isArray(args.kotobaIdsMastered) ? args.kotobaIdsMastered : undefined,
                    focusPage: typeof args.focusPage === 'number' ? args.focusPage : undefined,
                  });
                  setSswMasterState(res.state);
                  if (typeof args.focusPage === 'number') {
                    setSswFocusPage(args.focusPage);
                  }
                  functionResponses.push({
                    id: fc.id,
                    name: fnName,
                    response: { output: res },
                  });
                } else if (fnName === 'lookup_ssw_material_and_page') {
                  const lookupRes = await lookupSswForLiveTeachingAsync({
                    query: typeof args.query === 'string' ? args.query : undefined,
                    pageNumber: typeof args.pageNumber === 'number' ? args.pageNumber : undefined,
                    stepNumber: typeof args.stepNumber === 'number' ? args.stepNumber : undefined,
                    category: typeof args.category === 'string' ? args.category : undefined,
                    stageId: typeof args.stageId === 'string' ? args.stageId : undefined,
                  });
                  setSswMasterState(loadSswMasterState());
                  const pageToShow =
                    lookupRes.mode === 'structured_lesson_step'
                      ? lookupRes.pageNumber
                      : lookupRes.primaryMatchedPagePlan?.pageNumber ||
                        lookupRes.matchedPagesSummary?.[0]?.page ||
                        lookupRes.matchedKotoba?.[0]?.pdfPage;
                  if (pageToShow) {
                    setSswFocusPage(pageToShow);
                  }
                  setSswWorkbenchTab('pdf_kotoba');
                  setShowSswWorkbench(true);
                  functionResponses.push({
                    id: fc.id,
                    name: fnName,
                    response: { output: lookupRes },
                  });
                } else if (fnName === 'advance_ssw_lesson_step') {
                  const advRes = await advanceSswLessonStep({
                    pageNumber: typeof args.pageNumber === 'number' ? args.pageNumber : undefined,
                    completedStepNumber:
                      typeof args.completedStepNumber === 'number' ? args.completedStepNumber : undefined,
                    goToStepNumber:
                      typeof args.goToStepNumber === 'number' ? args.goToStepNumber : undefined,
                  });
                  setSswMasterState(loadSswMasterState());
                  const advPage =
                    'pageNumber' in advRes && typeof advRes.pageNumber === 'number'
                      ? advRes.pageNumber
                      : 'completedPage' in advRes && typeof advRes.completedPage === 'number'
                        ? advRes.completedPage
                        : undefined;
                  if (advPage) {
                    setSswFocusPage(advPage);
                  }
                  setSswWorkbenchTab('pdf_kotoba');
                  setShowSswWorkbench(true);
                  functionResponses.push({
                    id: fc.id,
                    name: fnName,
                    response: { output: advRes },
                  });
                } else if (fnName === 'draw_ssw_quiz_question') {
                  const drawn = await drawSswQuizQuestionAsync({
                    mode:
                      args.mode === 'cbt' ||
                      args.mode === 'math' ||
                      args.mode === 'trap' ||
                      args.mode === 'kotoba_drill' ||
                      args.mode === 'mixed'
                        ? args.mode
                        : 'mixed',
                    topicTag: typeof args.topicTag === 'string' ? args.topicTag : undefined,
                    preferWeakOrUnseen:
                      typeof args.preferWeakOrUnseen === 'boolean' ? args.preferWeakOrUnseen : true,
                    quizId: typeof args.quizId === 'string' ? args.quizId : undefined,
                  });
                  setSswDrawnQuiz(drawn);
                  setSswLatestGrade(null);
                  setSswMasterState(loadSswMasterState());
                  setSswFocusPage(drawn.tryoutPdfPage);
                  setSswWorkbenchTab('quiz');
                  setShowSswWorkbench(true);
                  functionResponses.push({
                    id: fc.id,
                    name: fnName,
                    response: { output: drawn },
                  });
                } else if (fnName === 'grade_ssw_quiz_answer') {
                  const gradeRes = await gradeSswQuizAnswerAsync({
                    quizId: typeof args.quizId === 'string' ? args.quizId : undefined,
                    userAnswer: String(args.userAnswer ?? args.answer ?? ''),
                  });
                  setSswLatestGrade(gradeRes);
                  setSswMasterState(gradeRes.state);
                  if (gradeRes.discussionPdfPage) {
                    setSswFocusPage(gradeRes.discussionPdfPage);
                  }
                  setSswWorkbenchTab('quiz');
                  setShowSswWorkbench(true);
                  functionResponses.push({
                    id: fc.id,
                    name: fnName,
                    response: { output: gradeRes },
                  });
                }
              }
              if (
                functionResponses.length > 0 &&
                wsRef.current === ws &&
                ws.readyState === WebSocket.OPEN &&
                !userHungUpRef.current
              ) {
                try {
                  ws.send(JSON.stringify({ toolResponse: { functionResponses } }));
                } catch {
                  awaitingPostToolResponseRef.current = false;
                }
              } else {
                awaitingPostToolResponseRef.current = false;
              }
            })();
          }

          // Audio Extraction from Gemini Live or custom proxy (preserve EVERY PCM16 chunk in multi-part frames!)
          const incomingAudioChunks: string[] = [];
          if (msg.type === 'audio' && msg.audio) {
            incomingAudioChunks.push(msg.audio);
          } else if (msg.serverContent?.modelTurn?.parts) {
            clearLiveTurnAutoCommitTimer();
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

          if (isWorkbenchOpenRef.current || isWorkbenchExplanationActiveRef.current) {
            // Popup Papan Tulis owns 100% of audio while open: drop ANY outer Gemini Live audio chunks so two voices NEVER collide
            incomingAudioChunks.length = 0;
            isAiServerTurnOpenRef.current = false;
          }

          if (incomingAudioChunks.length > 0 && outputAudioCtxRef.current) {
            awaitingPostToolResponseRef.current = false;
            liveTurnFinalizedForCurrentAiTurnRef.current = false;
            if (liveGenCompleteTimerRef.current) {
              window.clearTimeout(liveGenCompleteTimerRef.current);
              liveGenCompleteTimerRef.current = null;
            }
            awaitingOpeningTurnRef.current = false;
            if (awaitingOpeningTimerRef.current) {
              window.clearTimeout(awaitingOpeningTimerRef.current);
              awaitingOpeningTimerRef.current = null;
            }
            const msSinceBargeIn =
              lastBargeInAtRef.current > 0 ? Date.now() - lastBargeInAtRef.current : Number.POSITIVE_INFINITY;
            if (
              msSinceBargeIn < 650 ||
              (suppressAiAudioForTurnRef.current && (userAudioBurstActiveRef.current || msSinceBargeIn < 2000))
            ) {
              incomingAudioChunks.length = 0;
            } else if (suppressAiAudioForTurnRef.current) {
              suppressAiAudioForTurnRef.current = false;
            }
          }

          if (incomingAudioChunks.length > 0 && outputAudioCtxRef.current) {
            clearUserBurstEndTimer();
            userAudioBurstActiveRef.current = false;
            sentAudioSinceEndRef.current = false;
            preRollFramesRef.current = [];
            consecutiveSpeechFramesRef.current = 0;
            if (userSpeakingTimerRef.current) {
              window.clearTimeout(userSpeakingTimerRef.current);
              userSpeakingTimerRef.current = null;
            }
            if (isUserSpeakingLiveRef.current) {
              isUserSpeakingLiveRef.current = false;
              setIsUserSpeakingLive(false);
            }
            isAiServerTurnOpenRef.current = true;
            if (liveOpeningAudioWatchdogRef.current) {
              window.clearTimeout(liveOpeningAudioWatchdogRef.current);
              liveOpeningAudioWatchdogRef.current = null;
            }
            // Silence any stray HTTP TTS / HTMLAudioElement / speechSynthesis in the outer monitor (never interrupt active popup lockstep)
            speakTokenRef.current += 1;
            if (ttsSourceNodeRef.current || playbackSettleRef.current) {
              stopNeuralBufferSource();
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

            livePcmSchedulerRef.current.enqueueChunks(incomingAudioChunks, {
              ctx,
              getDestination: (audioCtx) => getOrAttachAnalyser(audioCtx as unknown as AudioContext, liveAnalyserRef),
              activeSources: activeSourcesRef.current as any,
              onChunkScheduled: () => {
                nextStartTimeRef.current = livePcmSchedulerRef.current.getNextStartTime();
              },
              onIdle: () => {
                nextStartTimeRef.current = livePcmSchedulerRef.current.getNextStartTime();
                if (
                  activeSourcesRef.current.length === 0 &&
                  !livePcmSchedulerRef.current.hasPendingAudio() &&
                  !isAiServerTurnOpenRef.current
                ) {
                  if (livePlaybackSafetyTimerRef.current) {
                    window.clearTimeout(livePlaybackSafetyTimerRef.current);
                    livePlaybackSafetyTimerRef.current = null;
                  }
                  setAiAudioPlaying(false, 350);
                }
              },
            });
            nextStartTimeRef.current = livePcmSchedulerRef.current.getNextStartTime();

            if (mochiInstanceRef.current) {
              try {
                if (liveAnalyserRef.current) {
                  mochiInstanceRef.current.attachAudioAnalyser?.(liveAnalyserRef.current, ctx.sampleRate || 24000);
                }
                if (!mochiInstanceRef.current.isTalking) {
                  mochiInstanceRef.current.setTalking?.(true);
                  mochiInstanceRef.current.triggerHandGesture?.('wave', 2.2);
                }
              } catch {
                // Ignore
              }
            }
            // Wall-clock safety unlock: while server turn is still open, allow 2400ms for inter-sentence pauses
            // so the mic never opens mid-turn and interrupts the AI's second sentence!
            if (livePlaybackSafetyTimerRef.current) {
              window.clearTimeout(livePlaybackSafetyTimerRef.current);
            }
            const remainingPlaybackMs = Math.max(
              1400,
              livePcmSchedulerRef.current.remainingMs(ctx) + 2400
            );
            livePlaybackSafetyTimerRef.current = window.setTimeout(() => {
              livePlaybackSafetyTimerRef.current = null;
              isAiServerTurnOpenRef.current = false;
              livePcmSchedulerRef.current.reset(outputAudioCtxRef.current, activeSourcesRef.current as any);
              nextStartTimeRef.current = livePcmSchedulerRef.current.getNextStartTime();
              setAiAudioPlaying(false, 0);
            }, remainingPlaybackMs);
          }

          // Barge-in interruption from server
          if (msg.serverContent?.interrupted || msg.type === 'interrupted') {
            isAiServerTurnOpenRef.current = false;
            suppressAiAudioForTurnRef.current = false;
            liveTurnFinalizedForCurrentAiTurnRef.current = false;
            callBillingRef.current.turnMetered = false;
            if (livePlaybackSafetyTimerRef.current) {
              window.clearTimeout(livePlaybackSafetyTimerRef.current);
              livePlaybackSafetyTimerRef.current = null;
            }
            livePcmSchedulerRef.current.reset(outputAudioCtxRef.current, activeSourcesRef.current as any);
            nextStartTimeRef.current = livePcmSchedulerRef.current.getNextStartTime();
            setAiAudioPlaying(false, 0);
          }

          // Real-time transcriptions (ignored cleanly while Papan Tulis popup is open)
          if (!isWorkbenchOpenRef.current && msg.serverContent?.inputTranscription?.text) {
            const cleanChunk = sanitizeHallucinatedTranscript(
              msg.serverContent.inputTranscription.text,
              activeScenario.targetLang,
              locale
            );
            if (cleanChunk) {
              const prevDraft = liveUserDraftRef.current;
              const needsSpace =
                prevDraft.length > 0 &&
                /[.!?。！？,;:\])]$/.test(prevDraft) &&
                /^[A-Za-z0-9\u00C0-\u024F]/.test(cleanChunk);
              liveUserDraftRef.current = needsSpace ? `${prevDraft} ${cleanChunk}` : prevDraft + cleanChunk;
              setLiveUserDraft(liveUserDraftRef.current);
              evaluateAndTriggerUserSpeechSentiment(liveUserDraftRef.current);
              turnAcousticTrackerRef.current.recordTranscriptEvent(
                Date.now(),
                countUtteranceUnits(liveUserDraftRef.current, activeScenario.targetLang)
              );
            }
          } else if (!isWorkbenchOpenRef.current && (msg.type === 'input_transcription' || msg.type === 'user_transcript')) {
            const cleanFull = sanitizeHallucinatedTranscript(
              msg.fullText || msg.text || '',
              activeScenario.targetLang,
              locale
            );
            liveUserDraftRef.current = cleanFull;
            setLiveUserDraft(liveUserDraftRef.current);
            evaluateAndTriggerUserSpeechSentiment(cleanFull);
            turnAcousticTrackerRef.current.recordTranscriptEvent(
              Date.now(),
              countUtteranceUnits(cleanFull, activeScenario.targetLang)
            );
          }

          if (msg.serverContent?.outputTranscription?.text) {
            clearLiveTurnAutoCommitTimer();
            awaitingPostToolResponseRef.current = false;
            if (liveGenCompleteTimerRef.current) {
              window.clearTimeout(liveGenCompleteTimerRef.current);
              liveGenCompleteTimerRef.current = null;
            }
            const nextChunk = msg.serverContent.outputTranscription.text;
            const prevDraft = liveAiDraftRef.current;
            const needsSpace =
              prevDraft.length > 0 &&
              /[.!?。！？,;:\])]$/.test(prevDraft) &&
              /^[A-Za-z0-9\u00C0-\u024F]/.test(nextChunk);
            liveAiDraftRef.current = needsSpace ? `${prevDraft} ${nextChunk}` : prevDraft + nextChunk;
            applyAiMoodFromText(liveAiDraftRef.current);
            scheduleLiveAiDraftUiUpdate();
          } else if (msg.type === 'output_transcription' || msg.type === 'ai_transcript') {
            awaitingPostToolResponseRef.current = false;
            if (liveGenCompleteTimerRef.current) {
              window.clearTimeout(liveGenCompleteTimerRef.current);
              liveGenCompleteTimerRef.current = null;
            }
            liveAiDraftRef.current = msg.fullText || msg.text || '';
            applyAiMoodFromText(liveAiDraftRef.current);
            scheduleLiveAiDraftUiUpdate();
          }

          // Spekulatif pre-fetch: jika ucapan AI yang sedang streaming telah menyelesaikan klausul/pertanyaan
          // (diakhiri tanda tanya atau titik) dan memiliki panjang memadai, mulai racik copilot di latar belakang
          // sehingga kartu bantuan sudah SIAP SEKETIKA (0ms) saat audio bicara AI tuntas!
          const draftSoFar = (liveAiDraftRef.current || '').trim();
          const hasClosingPunct = /[?？.!。！]$/.test(draftSoFar);
          const endsWithQuestion = /[?？]$/.test(draftSoFar);
          const wordCount = draftSoFar.split(/\s+/).filter(Boolean).length;
          const sentenceCount = (draftSoFar.match(/[.!?。！？]+/g) || []).length;
          const isSubstantialCjk =
            /[\u3040-\u30ff\u3400-\u9fff]/.test(draftSoFar) &&
            draftSoFar.length >= (endsWithQuestion ? 10 : 24);
          const hasSubstantialText = endsWithQuestion
            ? wordCount >= 5 || isSubstantialCjk
            : wordCount >= 12 || sentenceCount >= 2 || isSubstantialCjk;

          if (!isWorkbenchOpenRef.current && hasSubstantialText && hasClosingPunct && draftSoFar !== lastStreamedCopilotTextRef.current) {
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

          if (draftSoFar) {
            updateLiveAiTranslationDraft(cleanMoodTags(draftSoFar));
          } else {
            setLiveAiTranslationDraft('');
          }

          // Turn Complete (and post-tool generationComplete where Gemini 3.8 Live omits a second turnComplete)
          const finalizeLiveServerTurn = (finalMsg: any) => {
            clearLiveTurnAutoCommitTimer();
            clearLiveAiDraftUiTimer();
            if (liveGenCompleteTimerRef.current) {
              window.clearTimeout(liveGenCompleteTimerRef.current);
              liveGenCompleteTimerRef.current = null;
            }
            if (livePcmSchedulerRef.current.hasPendingAudio()) {
              livePcmSchedulerRef.current.flush();
              nextStartTimeRef.current = livePcmSchedulerRef.current.getNextStartTime();
            }
            livePcmSchedulerRef.current.noteTurnBoundary();
            awaitingPostToolResponseRef.current = false;
            awaitingOpeningTurnRef.current = false;
            openingGreetingCompletedRef.current = true;
            isAiServerTurnOpenRef.current = false;
            if (
              !livePcmSchedulerRef.current.hasPendingOrActiveAudio(
                outputAudioCtxRef.current,
                activeSourcesRef.current.length
              ) ||
              outputAudioCtxRef.current?.state === 'suspended'
            ) {
              if (livePlaybackSafetyTimerRef.current) {
                window.clearTimeout(livePlaybackSafetyTimerRef.current);
                livePlaybackSafetyTimerRef.current = null;
              }
              activeSourcesRef.current = [];
              setAiAudioPlaying(false, 350);
            } else if (outputAudioCtxRef.current) {
              if (livePlaybackSafetyTimerRef.current) {
                window.clearTimeout(livePlaybackSafetyTimerRef.current);
              }
              const exactLeftMs = Math.max(
                200,
                livePcmSchedulerRef.current.remainingMs(outputAudioCtxRef.current) + 400
              );
              livePlaybackSafetyTimerRef.current = window.setTimeout(() => {
                livePlaybackSafetyTimerRef.current = null;
                activeSourcesRef.current = [];
                setAiAudioPlaying(false, 0);
              }, exactLeftMs);
            }
            callBillingRef.current.turnMetered = false;
            if (callBillingRef.current.outOfGemsAfterTurn && callBillingRef.current.active) {
              callBillingRef.current.outOfGemsAfterTurn = false;
              const waitAudioMs = outputAudioCtxRef.current
                ? Math.max(350, livePcmSchedulerRef.current.remainingMs(outputAudioCtxRef.current) + 250)
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
              liveUserDraftRef.current || finalMsg?.userTranscript || '',
              activeScenario.targetLang,
              locale
            ).trim();
            const rawAText = (liveAiDraftRef.current || finalMsg?.aiTranscript || '').trim();
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

            if (isWorkbenchOpenRef.current) {
              // Popup Papan Tulis owns conversation turns & audio while open; discard background turn updates from outer monitor.
              return;
            }

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

              const liveTelemetry = turnAcousticTrackerRef.current.finalize();
              turnAcousticTrackerRef.current.reset();
              const liveProsody = consumeTurnAcousticProsody(uText);
              const measuredTurnSec =
                liveTelemetry.spanDurationSec > 0 ? liveTelemetry.spanDurationSec : undefined;

              const evalParams = {
                text: uText,
                scenario: activeScenario,
                persona: activePersona,
                targetLang: activeScenario.targetLang,
                locale,
                measureMode: isMeasureMode,
                speakingDurationSec: measuredTurnSec,
                inputMode: 'voice' as const,
                fluencyTelemetry: liveTelemetry,
                expectedTargetText: activeWorkbenchTargetRef.current.isOpen
                  ? activeWorkbenchTargetRef.current.activeTargetText
                  : undefined,
                activePopupMode: activeWorkbenchTargetRef.current.isOpen
                  ? activeWorkbenchTargetRef.current.contextMode
                  : undefined,
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
              const isDrJulianTurn =
                activePersona.id === 'dr_julian' || activeScenario.personaId === 'dr_julian';
              let pteDiagResult: ReturnType<typeof diagnosePteCandidateSpeech> | null = null;
              if (isDrJulianTurn && uText) {
                const regLearnerName =
                  readHostPwaCognitiveSnapshot(activeScenario.targetLang, locale).learnerName?.trim() ||
                  (locale === 'th' ? 'นักเรียน' : 'Candidate');
                pteDiagResult = diagnosePteCandidateSpeech({
                  spokenTranscript: uText,
                  durationSec: measuredTurnSec,
                  activeSpeechSec: liveTelemetry.activeSpeechSec,
                  phonationRatio: liveTelemetry.phonationRatio,
                  shortPausesCount: liveTelemetry.shortPausesCount,
                  hesitationPausesCount: liveTelemetry.hesitationPausesCount,
                  longPausesCount: liveTelemetry.longPausesCount,
                  maxPauseMs: liveTelemetry.maxPauseMs,
                  pauseDurationsMs: liveTelemetry.pauseDurationsMs,
                  burstDurationsMs: liveTelemetry.burstDurationsMs,
                  isAcousticTiming: liveTelemetry.isAcousticTiming,
                  measurementSource: liveTelemetry.measurementSource,
                  questionTitle: learningWorkbench?.topicTitle || activeScenario.titleId,
                  expectedPassageText:
                    activeWorkbenchTargetRef.current.isOpen &&
                    (activeWorkbenchTargetRef.current.contextMode === 'pte_read_aloud' ||
                      activeWorkbenchTargetRef.current.contextMode === 'read_aloud')
                      ? activeWorkbenchTargetRef.current.activeTargetText
                      : undefined,
                  targetLang: activeScenario.targetLang,
                  learnerName: regLearnerName,
                });
                setLatestPteDiagnostic(pteDiagResult);
                evalParams.learnerDossier += `\n\n${pteDiagResult.clinicalDossierText}`;
                brainStateRef.current = loadBraincoreState();
              }
              const ev = evaluateTurnLocal(evalParams);
              const activeAlignment = ev.readAloudAlignment || pteDiagResult?.readAloudAlignment || null;
              if (activeAlignment) {
                setLatestReadAloudAlignment(activeAlignment);
                if (
                  (!activeAlignment.passed || pteDiagResult?.scores.passedTarget === false) &&
                  activeWorkbenchTargetRef.current.isOpen &&
                  (activeWorkbenchTargetRef.current.contextMode === 'read_aloud' ||
                    activeWorkbenchTargetRef.current.contextMode === 'pte_read_aloud') &&
                  wsRef.current?.readyState === WebSocket.OPEN
                ) {
                  const missedList = (activeAlignment.missedWords || []).slice(0, 8);
                  const wrongList = (activeAlignment.mispronouncedPairs || [])
                    .map((p) => `${p.expected}(heard:${p.heard || '?'})`)
                    .slice(0, 8);
                  try {
                    wsRef.current.send(
                      JSON.stringify({
                        clientContent: {
                          turns: [
                            {
                              role: 'user',
                              parts: [
                                {
                                  text: `[SYSTEM NOTE: Learner misread/skipped words on Read Aloud target "${activeWorkbenchTargetRef.current.activeTargetText}": missed=${JSON.stringify(missedList)}, wrong=${JSON.stringify(wrongList)}. Strictly point out the exact mistakes in your next spoken reply!]`,
                                },
                              ],
                            },
                          ],
                          turnComplete: false,
                        },
                      })
                    );
                  } catch {
                    // Ignore live WS Read Aloud note error
                  }
                }
              } else {
                setLatestReadAloudAlignment(null);
              }
              const effectiveHints = isMeasureMode ? 0 : showHint ? 1 : 0;
              const acMiscLive = liveProsody.hasSufficientAudio
                ? liveProsody.acousticMisconceptionId
                : null;
              const acCanonLive = liveProsody.hasSufficientAudio
                ? liveProsody.canonicalTaxonomyCode
                : null;
              const acReasonLive = liveProsody.hasSufficientAudio ? liveProsody.whyFailsId : null;
              const resolvedLiveMisc =
                pteDiagResult?.misconceptionsFound[0]?.id ||
                ev.misconceptionId ||
                acMiscLive ||
                null;
              const resolvedLiveOk = pteDiagResult
                ? pteDiagResult.scores.passedTarget
                : Boolean(ev.ok && !acMiscLive);
              const outcome = recordSpeakingAttempt(brainStateRef.current, {
                competencyId: activeScenario.competencyId,
                scenarioId: activeScenario.id,
                targetLang: activeScenario.targetLang,
                userExactTranscript: uText,
                ok: resolvedLiveOk,
                grammarScore: pteDiagResult ? Math.round(pteDiagResult.scores.pronunciation * 20) : ev.grammarScore,
                fluencyScore: pteDiagResult ? Math.round(pteDiagResult.scores.fluency * 20) : ev.fluencyScore,
                vocabUsageScore: pteDiagResult ? Math.round(pteDiagResult.templateAdherence.contentScore * 33) : ev.vocabUsageScore,
                accuracyScore: pteDiagResult ? pteDiagResult.scores.pearsonEstimate : ev.accuracyScore,
                speakingDurationSec: measuredTurnSec,
                misconceptionId: resolvedLiveMisc,
                canonicalCode: acCanonLive || resolvedLiveMisc,
                correctionPattern: ev.syntacticCorrection || ev.naturalReformulation || null,
                hintsUsed: effectiveHints,
                confidence: 0.85,
                measureMode: isMeasureMode,
                acousticMetrics: liveProsody,
              });
              brainStateRef.current = outcome.nextState;
              setBrainState(outcome.nextState);
              if (isMeasureMode) {
                playFiezelSfx(resolvedLiveOk ? 'answer_correct' : 'answer_wrong');
              }
              const liveTurnId = `live_u_${Date.now()}`;
              const turnDiag: TurnDiagnosis = {
                ok: resolvedLiveOk,
                accuracyScore: pteDiagResult ? pteDiagResult.scores.pearsonEstimate : ev.accuracyScore,
                grammarScore: pteDiagResult ? Math.round(pteDiagResult.scores.pronunciation * 20) : ev.grammarScore,
                fluencyScore: pteDiagResult ? Math.round(pteDiagResult.scores.fluency * 20) : ev.fluencyScore,
                vocabUsageScore: pteDiagResult ? Math.round(pteDiagResult.templateAdherence.contentScore * 33) : ev.vocabUsageScore,
                userExactTranscript: uText,
                misconceptionId: resolvedLiveMisc,
                whyFailsId:
                  pteDiagResult?.misconceptionsFound[0]?.detail ||
                  ev.whyFailsId ||
                  acReasonLive ||
                  null,
                whyFailsTh: ev.whyFailsTh || null,
                missingTokens: ev.missingTokens || [],
                syntacticCorrection: ev.syntacticCorrection || null,
                naturalReformulation: ev.naturalReformulation || uText,
                pedagogicalFeedbackId:
                  pteDiagResult?.clinicalDossierText || acReasonLive || ev.pedagogicalFeedbackId,
                pedagogicalFeedbackTh: ev.pedagogicalFeedbackTh,
                bktBefore: outcome.bktBefore,
                bktAfter: outcome.bktAfter,
                thetaAfter: outcome.thetaAfter,
                masteryStateAfter: outcome.masteryStateAfter,
              };

              setTurns((prev) => [
                ...prev,
                {
                  id: liveTurnId,
                  speaker: 'user',
                  text: uText,
                  timestamp: Date.now(),
                  diagnosis: turnDiag,
                },
              ]);
              if (!pteDiagResult && !resolvedLiveMisc && uText.length >= 6) {
                scheduleAsyncNeuralDiagnosis({
                  turnId: liveTurnId,
                  uText,
                  priorBktBefore: outcome.bktBefore,
                  hintsUsed: effectiveHints,
                });
              }
            }

            if (aText) {
              const isAiIndonesianExplanation =
                /\b(adalah|sedangkan|gunakan|perhatikan|kalimat|karena|untuk|dalam|jangan|ketika|pakai|bedanya|artinya|lihat|papan|kata|contohnya|coba)\b/i.test(
                  aText
                );
              const initialTransId = isAiIndonesianExplanation ? aText : (finalMsg?.aiTranslationId || '');
              const initialTransTh = finalMsg?.aiTranslationTh || '';
              const aiTurnId = `live_ai_${Date.now() + 1}`;
              setTurns((prev) => [
                ...prev,
                {
                  id: aiTurnId,
                  speaker: 'ai',
                  text: aText,
                  translationId: initialTransId,
                  translationTh: initialTransTh,
                  audioBase64: finalMsg?.aiAudioBase64 || undefined,
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
          };

          const isGoogleTurnComplete = Boolean(msg.serverContent?.turnComplete);
          const isGoogleGenerationComplete = Boolean(msg.serverContent?.generationComplete);
          if (isGoogleTurnComplete || msg.type === 'turn_complete' || isGoogleGenerationComplete) {
            suppressAiAudioForTurnRef.current = false;
            if (livePcmSchedulerRef.current.hasPendingAudio()) {
              livePcmSchedulerRef.current.flush();
              nextStartTimeRef.current = livePcmSchedulerRef.current.getNextStartTime();
            }
          }
          if (isGoogleTurnComplete || msg.type === 'turn_complete') {
            if (liveGenCompleteTimerRef.current) {
              window.clearTimeout(liveGenCompleteTimerRef.current);
              liveGenCompleteTimerRef.current = null;
            }
            const hasPendingSpeech = Boolean((liveAiDraftRef.current || msg.aiTranscript || '').trim());
            const hasPendingUser = Boolean((liveUserDraftRef.current || msg.userTranscript || '').trim());
            const alreadyFinalizedEmptyTurn =
              liveTurnFinalizedForCurrentAiTurnRef.current && !hasPendingSpeech && !hasPendingUser;
            liveTurnFinalizedForCurrentAiTurnRef.current = false;
            const isEmptyPreToolHandoff =
              awaitingPostToolResponseRef.current &&
              !hasPendingSpeech &&
              activeSourcesRef.current.length === 0;
            if (!isEmptyPreToolHandoff && !alreadyFinalizedEmptyTurn) {
              finalizeLiveServerTurn(msg);
            }
          } else if (isGoogleGenerationComplete) {
            const hasPendingSpeech = Boolean((liveAiDraftRef.current || '').trim());
            const isEmptyPreToolHandoff =
              awaitingPostToolResponseRef.current &&
              !hasPendingSpeech &&
              activeSourcesRef.current.length === 0;
            if (!isEmptyPreToolHandoff) {
              awaitingPostToolResponseRef.current = false;
              if (liveGenCompleteTimerRef.current) {
                window.clearTimeout(liveGenCompleteTimerRef.current);
              }
              const capturedMsg = msg;
              const schedulePostGenerationFinalize = () => {
                const remainingAudioMs = livePcmSchedulerRef.current.remainingMs(outputAudioCtxRef.current);
                const waitFinalizeMs = Math.max(480, remainingAudioMs + 450);
                liveGenCompleteTimerRef.current = window.setTimeout(() => {
                  liveGenCompleteTimerRef.current = null;
                  if (wsRef.current !== ws || mySeq !== connectSeqRef.current || userHungUpRef.current) {
                    return;
                  }
                  if (awaitingPostToolResponseRef.current) return;
                  const leftoverAudioMs = livePcmSchedulerRef.current.remainingMs(outputAudioCtxRef.current);
                  if (leftoverAudioMs > 120) {
                    schedulePostGenerationFinalize();
                    return;
                  }
                  liveTurnFinalizedForCurrentAiTurnRef.current = true;
                  finalizeLiveServerTurn(capturedMsg);
                }, waitFinalizeMs);
              };
              schedulePostGenerationFinalize();
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        if (liveGenCompleteTimerRef.current) {
          window.clearTimeout(liveGenCompleteTimerRef.current);
          liveGenCompleteTimerRef.current = null;
        }
        awaitingPostToolResponseRef.current = false;
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
        if (liveGenCompleteTimerRef.current) {
          window.clearTimeout(liveGenCompleteTimerRef.current);
          liveGenCompleteTimerRef.current = null;
        }
        awaitingPostToolResponseRef.current = false;
        if (wsRef.current !== ws || mySeq !== connectSeqRef.current || userHungUpRef.current) return;
        if (!settled) {
          settled = true;
          if (connectTimer !== null) {
            window.clearTimeout(connectTimer);
            connectTimer = null;
          }
          clearLiveAiDraftUiTimer();
          suppressAiAudioForTurnRef.current = false;
          liveTurnFinalizedForCurrentAiTurnRef.current = false;
          livePcmSchedulerRef.current.reset(outputAudioCtxRef.current, activeSourcesRef.current as any);
          nextStartTimeRef.current = livePcmSchedulerRef.current.getNextStartTime();
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
          clearLiveAiDraftUiTimer();
          suppressAiAudioForTurnRef.current = false;
          liveTurnFinalizedForCurrentAiTurnRef.current = false;
          livePcmSchedulerRef.current.reset(outputAudioCtxRef.current, activeSourcesRef.current as any);
          nextStartTimeRef.current = livePcmSchedulerRef.current.getNextStartTime();
          void reportGeminiLiveSessionDrop(
            event.reason || 'mid_call_disconnect',
            event.code,
            currentLiveSessionRef.current?.keyIndex
          );

          const isFatalWsClose = event.code === 1003 || event.code === 1008 || event.code === 4003;
          if (!isFatalWsClose && liveReconnectAttemptsRef.current < 5) {
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
    isAcquiringHardwareMicRef.current = false;
    micCaptureHardFailedRef.current = false;
    micHealthCleanupRef.current?.();
    micHealthCleanupRef.current = null;
    setDuplexAudioSessionMode(false);
    isAiServerTurnOpenRef.current = false;
    suppressAiAudioForTurnRef.current = false;
    liveTurnFinalizedForCurrentAiTurnRef.current = false;
    awaitingPostToolResponseRef.current = false;
    clearLiveTurnAutoCommitTimer();
    clearLiveAiDraftUiTimer();
    if (liveGenCompleteTimerRef.current) {
      window.clearTimeout(liveGenCompleteTimerRef.current);
      liveGenCompleteTimerRef.current = null;
    }
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
            : locale === 'id'
              ? 'Belum ada suara Fiezel yang diputar, 0 Gem terpakai (Saldo & Kuota Aman)!'
              : 'No Fiezel voice played yet, 0 Gems spent (Balance & Quota Safe)!'
        );
      } else if (wasFree && spentGems === 0) {
        setStatusBanner(
          locale === 'th'
            ? `จบการสนทนา: ${turnsCount} การตอบกลับเสียง Fiezel, สิทธิ์ฟรีรายวัน (0 💎)`
            : locale === 'id'
              ? `Panggilan selesai: ${turnsCount} respon suara Fiezel, Kuota Gratis Harian (0 💎)`
              : `Call ended: ${turnsCount} Fiezel voice replies, Daily Free Quota (0 💎)`
        );
      } else {
        setStatusBanner(
          locale === 'th'
            ? `จบการสนทนา: ${turnsCount} การตอบกลับเสียง Fiezel, ใช้ไป ${spentGems} 💎 ตามโควตาจริง`
            : locale === 'id'
              ? `Panggilan selesai: ${turnsCount} respon suara Fiezel, ${spentGems} 💎 terpakai sesuai kuota suara`
              : `Call ended: ${turnsCount} Fiezel voice replies, ${spentGems} 💎 used per voice quota`
        );
      }
    }
    sileroVadGateRef.current?.destroy();
    sileroVadGateRef.current = null;
    lastHandySpeechAtRef.current = 0;
    liveAnalyserRef.current = null;
    handyVadRef.current.reset();
    awaitingOpeningTurnRef.current = false;
    if (awaitingOpeningTimerRef.current) {
      window.clearTimeout(awaitingOpeningTimerRef.current);
      awaitingOpeningTimerRef.current = null;
    }
    userAudioBurstActiveRef.current = false;
    sentAudioSinceEndRef.current = false;
    if (userBurstEndTimerRef.current) {
      window.clearTimeout(userBurstEndTimerRef.current);
      userBurstEndTimerRef.current = null;
    }
    preRollFramesRef.current = [];
    consecutiveSpeechFramesRef.current = 0;
    bargeSpeechStreakRef.current = 0;
    isMicHardwareReadyRef.current = false;
    setIsMicHardwareReady(false);
    setIsUserSpeakingLive(false);
    isUserSpeakingLiveRef.current = false;
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
    try {
      const parentWin = getParentWin();
      if (parentWin) {
        parentWin.__fzSharedMicPcmCallback = null;
        if (typeof parentWin.__fzStopSharedMicBridge === 'function') {
          parentWin.__fzStopSharedMicBridge();
        }
      }
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
    // Keep liveAudioCtxRef.current alive across calls in the same session (Mochi SOS parity)
    // so gesture-unlocked WebAudio is never destroyed when hanging up and calling again!
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
    livePcmSchedulerRef.current.reset(outputAudioCtxRef.current, activeSourcesRef.current as any);
    nextStartTimeRef.current = livePcmSchedulerRef.current.getNextStartTime();
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
    setAiAudioPlaying(false, 0);
    lastAiPlayoutEndedAtRef.current = 0;
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
    const parentWin = getParentWin();
    const hasLiveTrack = Boolean(
      micStreamRef.current?.getAudioTracks?.().some((t) => t.readyState === 'live') ||
        parentWin?.__fzSharedMicStream?.getAudioTracks?.().some((t: any) => t.readyState === 'live')
    );
    if (!hasLiveTrack && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      setIsMicMuted(false);
      isMicMutedRef.current = false;
      try {
        const sharedParentCtx: AudioContext | null =
          (parentWin && typeof parentWin.__fzEnsureSharedLiveAudioCtx === 'function'
            ? parentWin.__fzEnsureSharedLiveAudioCtx()
            : null) ||
          (parentWin?.__fzSharedLiveAudioCtx && parentWin.__fzSharedLiveAudioCtx.state !== 'closed'
            ? (parentWin.__fzSharedLiveAudioCtx as AudioContext)
            : null);
        const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (sharedParentCtx && sharedParentCtx.state !== 'closed') {
          liveAudioCtxRef.current = sharedParentCtx;
          inputAudioCtxRef.current = sharedParentCtx;
          outputAudioCtxRef.current = sharedParentCtx;
        } else if (!liveAudioCtxRef.current || liveAudioCtxRef.current.state === 'closed') {
          liveAudioCtxRef.current = new CtxClass();
          inputAudioCtxRef.current = liveAudioCtxRef.current;
          outputAudioCtxRef.current = liveAudioCtxRef.current;
        }
        const liveCtx = liveAudioCtxRef.current!;
        if (liveCtx.state === 'suspended') {
          await liveCtx.resume().catch(() => {});
        }
        const stream =
          parentWin && typeof parentWin.__fzWarmKawanAudioAndMic === 'function'
            ? ((await parentWin.__fzWarmKawanAudioAndMic()) as MediaStream)
            : await navigator.mediaDevices
                .getUserMedia({
                  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                })
                .catch(() => navigator.mediaDevices.getUserMedia({ audio: true }));
        if (stream) {
          await connectMicStreamToLiveProcessing(stream, liveCtx);
          setStatusBanner(null);
        }
      } catch (err) {
        console.warn('Re-acquire mic failed:', err);
      }
      return;
    }
    const next = !isMicMuted;
    setIsMicMuted(next);
    isMicMutedRef.current = next;
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
    }
    if (parentWin?.__fzSharedMicStream) {
      try {
        (parentWin.__fzSharedMicStream as MediaStream).getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      } catch (_) {}
    }
    if (!next && liveAudioCtxRef.current?.state === 'suspended') {
      void liveAudioCtxRef.current.resume().catch(() => {});
    }
  };

  useEffect(() => {
    if (!isLiveConnected && !isLiveConnecting) return;
    let acquiring = false;
    const healLiveAudioAndMicOnGesture = () => {
      try {
        const parentWin = getParentWin();
        if (liveAudioCtxRef.current?.state === 'suspended') {
          void liveAudioCtxRef.current.resume().then(() => {
            syncMicHardwareReadyState();
          }).catch(() => {});
        } else {
          syncMicHardwareReadyState();
        }
        if (
          outputAudioCtxRef.current &&
          outputAudioCtxRef.current !== liveAudioCtxRef.current &&
          outputAudioCtxRef.current.state === 'suspended'
        ) {
          void outputAudioCtxRef.current.resume().catch(() => {});
        }
        if (parentWin?.__fzSharedLiveAudioCtx?.state === 'suspended') {
          void parentWin.__fzSharedLiveAudioCtx.resume().catch(() => {});
        }
        const hasLiveMic = Boolean(
          micStreamRef.current?.getAudioTracks?.().some((t) => t.readyState === 'live') ||
            parentWin?.__fzSharedMicStream?.getAudioTracks?.().some((t: any) => t.readyState === 'live')
        );
        if (
          !hasLiveMic &&
          !isMicMutedRef.current &&
          !acquiring &&
          typeof navigator !== 'undefined' &&
          navigator.mediaDevices?.getUserMedia
        ) {
          acquiring = true;
          const acquirePromise =
            parentWin && typeof parentWin.__fzWarmKawanAudioAndMic === 'function'
              ? (parentWin.__fzWarmKawanAudioAndMic() as Promise<MediaStream | null>)
              : navigator.mediaDevices
                  .getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                  })
                  .catch(() => navigator.mediaDevices.getUserMedia({ audio: true }));
          void acquirePromise
            .then(async (freshStream) => {
              acquiring = false;
              if (!freshStream || userHungUpRef.current) return;
              const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
              if (!liveAudioCtxRef.current || liveAudioCtxRef.current.state === 'closed') {
                liveAudioCtxRef.current =
                  (parentWin?.__fzSharedLiveAudioCtx as AudioContext | undefined) || new CtxClass();
                inputAudioCtxRef.current = liveAudioCtxRef.current;
                outputAudioCtxRef.current = liveAudioCtxRef.current;
              }
              await connectMicStreamToLiveProcessing(freshStream, liveAudioCtxRef.current);
            })
            .catch(() => {
              acquiring = false;
            });
        }
      } catch {}
    };
    window.addEventListener('pointerdown', healLiveAudioAndMicOnGesture, { capture: true, passive: true });
    window.addEventListener('touchstart', healLiveAudioAndMicOnGesture, { capture: true, passive: true });
    window.addEventListener('click', healLiveAudioAndMicOnGesture, { capture: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', healLiveAudioAndMicOnGesture, true);
      window.removeEventListener('touchstart', healLiveAudioAndMicOnGesture, true);
      window.removeEventListener('click', healLiveAudioAndMicOnGesture, true);
    };
  }, [isLiveConnected, isLiveConnecting]);

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

  // Auto-Call Orchestration + Secure Studio Bridge Handshake & Page Lifecycle Teardown
  const studioHelloSentRef = useRef(false);
  useEffect(() => {
    const expectedNonce = getStudioNonce();
    const isIframe = typeof window !== 'undefined' && window.parent && window.parent !== window;

    if (isIframe && expectedNonce && !studioHelloSentRef.current) {
      studioHelloSentRef.current = true;
      try {
        const targetOrigin =
          window.location.origin && window.location.origin !== 'null' ? window.location.origin : '*';
        window.parent.postMessage(
          {
            v: 1,
            type: 'fz.studio.hello',
            nonce: expectedNonce,
            seq: getNextStudioSeq(),
            sentAt: Date.now(),
            payload: {},
          },
          targetOrigin
        );
      } catch {
        // Ignore
      }
    }

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
      if (shouldAuto && !isLiveConnectedRef.current && !isLiveConnectingRef.current) {
        autoCallProcessedRef.current = true;
        requestStartLiveCall(true);
      }
    };

    const handleWindowMsg = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (isIframe && e.source !== window.parent) return;
      const myOrigin = window.location.origin;
      if (myOrigin && myOrigin !== 'null' && e.origin && e.origin !== 'null' && e.origin !== myOrigin) {
        return;
      }
      if (expectedNonce && e.data.nonce && e.data.nonce !== expectedNonce) return;
      if (e.data.type === 'fz.shell.autocall') {
        if (expectedNonce && e.data.nonce !== expectedNonce) return;
        try {
          sessionStorage.removeItem('fz_kawan_autocall');
        } catch {}
        if (!isLiveConnectedRef.current && !isLiveConnectingRef.current) {
          autoCallProcessedRef.current = true;
          requestStartLiveCall(true);
        }
      } else if (e.data.type === 'fz.shell.hide') {
        if (expectedNonce && e.data.nonce !== expectedNonce) return;
        stopLiveCall();
        stopPttRecording();
      } else if (e.data.type === 'fz.shell.locale' && e.data.locale) {
        if (expectedNonce && e.data.nonce && e.data.nonce !== expectedNonce) return;
        const nextLoc = String(e.data.locale).trim().toLowerCase().split(/[-_]/)[0] as LearnerLocale;
        if (nextLoc && nextLoc !== brainStateRef.current.learnerLocale) {
          const updated = saveBraincoreState({ ...brainStateRef.current, learnerLocale: nextLoc });
          brainStateRef.current = updated;
          setBrainState(updated);
        }
      }
    };

    const handleStorageLocaleSync = (ev: StorageEvent) => {
      if (ev.key === 'fiezel_lang_chosen' || ev.key === 'fz_ui_lang' || ev.key === 'fiezel-ui-lang' || ev.key === 'fiezel_ui_lang') {
        const rawVal = String(ev.newValue || '').trim().toLowerCase().split(/[-_]/)[0] as LearnerLocale;
        if (rawVal && rawVal !== brainStateRef.current.learnerLocale) {
          const updated = saveBraincoreState({ ...brainStateRef.current, learnerLocale: rawVal });
          brainStateRef.current = updated;
          setBrainState(updated);
        }
      }
    };

    const handleVisibilityOrHide = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        if (isLiveConnectedRef.current || isLiveConnectingRef.current) {
          stopLiveCall();
        }
      }
    };

    const handlePageUnload = () => {
      if (isLiveConnectedRef.current || isLiveConnectingRef.current) {
        stopLiveCall();
      }
    };

    window.addEventListener('message', handleWindowMsg);
    window.addEventListener('storage', handleStorageLocaleSync);
    window.addEventListener('pagehide', handlePageUnload);
    window.addEventListener('beforeunload', handlePageUnload);
    document.addEventListener('visibilitychange', handleVisibilityOrHide);
    const timer = window.setTimeout(checkAutoCall, 40);
    return () => {
      window.removeEventListener('message', handleWindowMsg);
      window.removeEventListener('storage', handleStorageLocaleSync);
      window.removeEventListener('pagehide', handlePageUnload);
      window.removeEventListener('beforeunload', handlePageUnload);
      document.removeEventListener('visibilitychange', handleVisibilityOrHide);
      window.clearTimeout(timer);
    };
  }, [isLiveConnected, isLiveConnecting]);

  // Test Bridge & Custom Event Handler for Probe Testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__FIEZEL_VOICE_STUDIO_TEST_BRIDGE__ = {
        openWorkbench: (opts?: any) => {
          openLearningWorkbenchWithAction(
            opts
              ? {
                  actionType: 'open_learning_popup',
                  focusType: opts.contextMode || opts.focusType,
                  topicTitle: opts.topicTitle,
                  ...opts,
                }
              : undefined
          );
        },
        closeWorkbench: () => {
          setLearningWorkbench(null);
        },
        setScenario: (scenId: string) => {
          handleSelectScenario(scenId);
        },
        getState: () => ({
          activeScenario,
          activePersona,
          learningWorkbench,
          isMeasureMode,
        }),
      };

      const handleWorkbenchEvt = (e: Event) => {
        const ce = e as CustomEvent;
        if (ce.detail) {
          openLearningWorkbenchWithAction(ce.detail, ce.detail.topicTitle || '');
        }
      };
      window.addEventListener('fiezel:open-learning-workbench', handleWorkbenchEvt);

      return () => {
        window.removeEventListener('fiezel:open-learning-workbench', handleWorkbenchEvt);
      };
    }
  }, [activeScenario, activePersona, learningWorkbench, isMeasureMode]);

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

  const shouldReleaseMochiWebGlForMobileWb = Boolean(
    learningWorkbench?.isOpen && isMobileLowMemoryDevice()
  );

  // Mount authentic 3D Volumetric Daifuku Mochi Mascot (FiezelMochi) inside the Call Stage.
  // Mobile PWA OOM Guard (m025-810): when the fullscreen Whiteboard opens on iOS/Android,
  // tear down the hidden background WebGL context (forceContextLoss + dispose) so ZERO GPU contexts
  // compete with the Whiteboard audio/SVG pipeline, then cleanly restore Mochi upon closing.
  useEffect(() => {
    if (activeTab !== 'call' || !prereqStatus.isReady || shouldReleaseMochiWebGlForMobileWb) {
      if (mochiInstanceRef.current) {
        try {
          mochiInstanceRef.current.detachAudioAnalyser?.();
          mochiInstanceRef.current.destroy?.();
        } catch {
          // Ignore
        }
        mochiInstanceRef.current = null;
        try { (window as any).__fzVoiceMochiInstance = null; } catch {}
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
        const mochiWidth = isMobileScreen ? 260 : 300;
        const mochiHeight = isMobileScreen ? 200 : 225;
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
          cameraZ: isMobileScreen ? 4.80 : 4.95,
          cameraY: 0.16,
        });
        inst.setVoiceCompanionStrictMode?.(false);
        const liveCtx = outputAudioCtxRef.current || liveAudioCtxRef.current;
        if (liveAnalyserRef.current && liveCtx) {
          inst.attachAudioAnalyser?.(liveAnalyserRef.current, liveCtx.sampleRate || 24000);
        } else if (ttsAnalyserRef.current && ttsAudioCtxRef.current) {
          inst.attachAudioAnalyser?.(ttsAnalyserRef.current, ttsAudioCtxRef.current.sampleRate || 24000);
        }
        mochiInstanceRef.current = inst;
        try { (window as any).__fzVoiceMochiInstance = inst; } catch {}
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
        try { (window as any).__fzVoiceMochiInstance = null; } catch {}
      }
      setIs3dMochiReady(false);
    };
  }, [activeTab, prereqStatus.isReady, shouldReleaseMochiWebGlForMobileWb]);

  // Pause background 3D WebGL Mochi loop while whiteboard popup is open to eliminate UI lag & GPU contention
  useEffect(() => {
    const inst = mochiInstanceRef.current;
    if (!inst) return;
    try {
      if (learningWorkbench?.isOpen) {
        inst.pause?.();
      } else {
        inst.resume?.();
      }
    } catch {
      // Ignore
    }
  }, [learningWorkbench?.isOpen, is3dMochiReady]);

  // GoPrep FaceTime Interactive Companion Dynamic Speaking Layer:
  // Updates talking and speech wave without suppressing or resetting Mochi's active emotional state
  useEffect(() => {
    const m = mochiInstanceRef.current;
    if (!m) return;
    try {
      m.setVoiceCompanionStrictMode?.(false);

      if (callStateKey === 'speaking') {
        const liveCtx = outputAudioCtxRef.current || liveAudioCtxRef.current;
        if (liveAnalyserRef.current && liveCtx) {
          m.attachAudioAnalyser?.(liveAnalyserRef.current, liveCtx.sampleRate || 24000);
        } else if (ttsAnalyserRef.current && ttsAudioCtxRef.current) {
          m.attachAudioAnalyser?.(ttsAnalyserRef.current, ttsAudioCtxRef.current.sampleRate || 24000);
        }
        // Whenever AI audio is audibly playing (Gemini Live duplex OR HTTP neural TTS),
        // Mochi MUST be in talking mode so the WebAudio formant analyser drives the mouth.
        // (Previously gated on isLiveConnectedRef, which left the mouth frozen in Turn-by-Turn.)
        if (!m.isTalking) {
          m.setTalking?.(true);
          m.triggerHandGesture?.('wave', 2.2);
        }
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
  const defaultOpeningTransEn =
    activePersona.openingGreetingTranslationEn ||
    scenarioMetaForLocale(locale, activeScenario).openingTranslation ||
    '';
  const isStreamingAiLive = Boolean(liveAiDraft.trim());
  const activeAiLiveText = liveAiDraft.trim() || lastAiTurn?.text || defaultOpeningText;
  const hasRealLettersForMeaning = (str?: string): boolean => {
    if (!str) return false;
    return (
      str.match(/[A-Za-zÀ-ÖØ-öø-ÿ\u0E00-\u0E7F\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g) || []
    ).length >= 2;
  };
  const rawCandidateId = isStreamingAiLive
    ? liveAiTranslationDraft
    : locale === 'id'
      ? (lastAiTurn ? lastAiTurn.translationId || '' : defaultOpeningTransId)
      : '';
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
    rawSubtitleSourceTh || undefined,
    undefined,
    { locale, forceFetch: !isStreamingAiLive }
  );
  const openingFallbackNonTh = locale === 'id' ? defaultOpeningTransId : defaultOpeningTransEn;
  const activeAiSubtitle = {
    ...computedAiSubtitle,
    translationEn:
      (computedAiSubtitle as unknown as { translationEn?: string }).translationEn ||
      (!isStreamingAiLive && (!lastAiTurn || lastAiTurn.id?.startsWith('turn_open_')) ? defaultOpeningTransEn : '') ||
      '',
    translationId:
      rawSubtitleSourceId ||
      (locale === 'id' ? computedAiSubtitle.translationId : '') ||
      (!isStreamingAiLive && (!lastAiTurn || lastAiTurn.id?.startsWith('turn_open_')) ? openingFallbackNonTh : '') ||
      '',
    translationTh:
      rawSubtitleSourceTh ||
      computedAiSubtitle.translationTh ||
      (!isStreamingAiLive && !lastAiTurn ? defaultOpeningTransTh : '') ||
      '',
  };

  const resolvedActiveAiMeaning = (() => {
    try {
      const loadingTranslationText = t(locale, 'ui.loadingTranslation');

      let rawMeaning = '';
      if (locale === 'th') {
        rawMeaning = activeAiSubtitle.translationTh || defaultOpeningTransTh || '';
      } else if (locale === 'id') {
        rawMeaning = activeAiSubtitle.translationId || defaultOpeningTransId || '';
      } else if (locale === 'ja') {
        rawMeaning =
          activeAiSubtitle.translationJa ||
          (activeScenario.targetLang === 'ja' ? '' : (isStreamingAiLive ? liveAiTranslationDraft : '') || (lastAiTurn && !lastAiTurn.id?.startsWith('turn_open_') ? ((lastAiTurn as any).translationEn || '') : defaultOpeningTransEn));
      } else if (locale === 'zh') {
        rawMeaning =
          activeAiSubtitle.translationZh ||
          (activeScenario.targetLang === 'zh' ? '' : (isStreamingAiLive ? liveAiTranslationDraft : '') || (lastAiTurn && !lastAiTurn.id?.startsWith('turn_open_') ? ((lastAiTurn as any).translationEn || '') : defaultOpeningTransEn));
      } else {
        rawMeaning =
          (isStreamingAiLive ? liveAiTranslationDraft : '') ||
          (lastAiTurn && !lastAiTurn.id?.startsWith('turn_open_') ? ((lastAiTurn as any).translationEn || '') : defaultOpeningTransEn) ||
          activeAiSubtitle.translationEn ||
          '';
      }

      // 1. Jika terjemahan valid sudah tersedia (dari skenario/turn/memori terjemahan),
      // TAMPILKAN LANGSUNG agar murid bisa membaca arti saat Mochi sedang berbicara!
      if (rawMeaning && hasRealLettersForMeaning(rawMeaning) && !isGenericPlaceholderTranslation(rawMeaning) && !/^[\s,.:;!?"'“”‘’()（）\-—]+$/.test(rawMeaning)) {
        if (locale !== 'zh' && locale !== 'ja' && /[\u4E00-\u9FFF\u3040-\u30FF]/.test(rawMeaning)) {
          const cjkCount = (rawMeaning.match(/[\u4E00-\u9FFF\u3040-\u30FF]/g) || []).length;
          const latinWords = (rawMeaning.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) || []).length;
          if (latinWords === 0 && cjkCount > 0) {
            return isStreamingAiLive || isAiThinking ? loadingTranslationText : '';
          }
          rawMeaning = rawMeaning.replace(/[\u4E00-\u9FFF\u3040-\u30FF]+/g, (cjkMatch) => {
            const phonetic =
              activeScenario.targetLang === 'zh'
                ? toPhoneticPinyin(cjkMatch)
                : toPhoneticRomaji(cjkMatch);
            return phonetic && phonetic !== cjkMatch ? phonetic : cjkMatch;
          });
        }
        return rawMeaning.trim();
      }

      // 2. Jika terjemahan belum tiba dan AI sedang berpikir atau streaming ucapan baru, tampilkan status memuat
      if (isStreamingAiLive || isPlayingAiAudio || isAiThinking) {
        return loadingTranslationText;
      }
      return '';
    } catch {
      return '';
    }
  })();

  const isAiHudDuplicateMeaning = (() => {
    if (locale === 'en' && activeScenario.targetLang === 'en') return true;
    const normMeaning = (resolvedActiveAiMeaning || '').replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
    const normSpeech = (activeAiLiveText || '').replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
    if (normMeaning && normMeaning === normSpeech) return true;
    // Also guard if AI accidentally spoke in Indonesian while target course is zh/ja
    const cjkChars = (activeAiLiveText.match(/[\u4E00-\u9FFF\u3040-\u30FF]/g) || []).length;
    const latinWords = (activeAiLiveText.match(/[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/g) || []).length;
    if (isSswSensei && !rawSubtitleSourceId && latinWords >= cjkChars) {
      return true;
    }
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
    ? translateAndPhoneticizeLiveText(
        activeUserLiveText,
        activeScenario.targetLang,
        lastUserTurn?.translationId,
        lastUserTurn?.translationTh,
        undefined,
        { locale, forceFetch: !liveUserDraft.trim() }
      )
    : null;
  const resolvedActiveUserMeaning = (() => {
    if (!activeUserSubtitle) return '';
    const candidate =
      locale === 'th'
        ? activeUserSubtitle.translationTh || ''
        : locale === 'ja'
        ? activeUserSubtitle.translationJa || (activeScenario.targetLang === 'ja' ? '' : activeUserSubtitle.translationId || '')
        : locale === 'zh'
        ? activeUserSubtitle.translationZh || (activeScenario.targetLang === 'zh' ? '' : activeUserSubtitle.translationId || '')
        : locale === 'id'
        ? activeUserSubtitle.translationId || activeUserSubtitle.translationTh
        : activeUserSubtitle.translationId || '';
    if (!candidate || isGenericPlaceholderTranslation(candidate)) return '';
    if (locale !== 'ja' && locale !== 'zh' && /[\u4E00-\u9FFF\u3040-\u30FF]/.test(candidate)) {
      return candidate
        .replace(/[\u4E00-\u9FFF\u3040-\u30FF]+/g, (cjk) =>
          activeScenario.targetLang === 'zh' ? toPhoneticPinyin(cjk) : toPhoneticRomaji(cjk)
        )
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
    return candidate;
  })();

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
      <header className="shrink-0 sticky top-0 z-20 bg-[#F6F3EC] sm:bg-[#F6F3EC]/95 sm:backdrop-blur-md border-b border-[#E8DFC8]/60 pt-[env(safe-area-inset-top,0.25rem)]">
        <div className="max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-2.5 sm:px-6 min-h-11 py-1 sm:py-0 sm:h-11 flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-1.5 gap-y-1 sm:gap-2">
          {/* SISI KIRI: Tombol Kembali & Persona Active */}
          <div className="order-1 flex items-center gap-1 sm:gap-2 min-w-0">
            <a
              href="./index.html"
              onClick={handleBackToPwa}
              data-testid="mitra-kaiwa-back-btn"
              className="px-2 sm:px-2.5 py-1 rounded-full bg-white/90 hover:bg-white shadow-[0_1px_2px_rgba(28,22,17,0.05)] font-semibold text-[#1C1611] cursor-pointer flex items-center gap-1 transition-all text-xs shrink-0"
              title={t(locale, 'ui.back')}
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{t(locale, 'ui.back')}</span>
            </a>

            <span
              data-testid="mitra-kaiwa-header-title"
              className="sr-only"
            >
              {targetLang === 'ja' ? t(locale, 'ui.speakPartnerBrandJA') : t(locale, 'ui.speakPartnerBrand')}
            </span>

            {targetLang === 'ja' && (
              <button
                type="button"
                data-testid="ssw-header-quick-btn"
                onClick={() => handleSelectPersona('ssw_sensei')}
                className={`px-2 py-1 rounded-full text-[10.5px] font-extrabold transition cursor-pointer shrink-0 ${
                  isSswSensei
                    ? 'bg-[#8C2233] text-white shadow-xs'
                    : 'bg-[#FFF3DC] hover:bg-[#8C2233] hover:text-white text-[#7A4B12] border border-[#E5CFA8]'
                }`}
                title="SSW SENSEI - Mentor Pengolahan Makanan (Wakai Papa Pro)"
              >
                <span className="sm:hidden">🍱 SSW</span>
                <span className="hidden sm:inline">🍱 Mode SSW</span>
              </button>
            )}

            <button
              type="button"
              data-testid="persona-picker-trigger"
              onClick={() => {
                playFiezelSfx('button_tap');
                setShowPersonaModal(true);
              }}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-[#FAF5EB] hover:bg-[#F3ECE0] border border-[#E8DEC8] text-[#5C4E3C] text-[11px] font-bold shadow-2xs transition-all cursor-pointer active:scale-95 min-w-0 shrink"
              title={t(locale, 'ui.switchPersona')}
            >
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shrink-0"></span>
              <span className="max-w-[76px] xs:max-w-[105px] sm:max-w-[160px] truncate">
                {formatPersonaShortName(activePersona.name)}
              </span>
              <svg className="w-3 h-3 text-[#8C7A65] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* TENGAH: Segmented Switcher FaceTime (Panggung) vs Riwayat Chat */}
          {activeTab === 'call' && (
            <div className="order-3 sm:order-2 w-full sm:w-auto flex justify-center pb-0.5 sm:pb-0">
              <div
                data-testid="call-view-mode-toggle"
                className="inline-flex items-center p-0.5 rounded-full bg-[#EFE8DA] text-[11px] font-semibold shadow-2xs shrink-0"
              >
                <button
                  type="button"
                  data-testid="tab-call-btn"
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
                  data-testid="tab-history-btn"
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
                  <span>{t(locale, 'ui.history')}</span>
                  {turns.filter((tr) => tr.speaker === 'user').length > 0 && (
                    <span className="w-3.5 h-3.5 rounded-full bg-[#8C2233] text-white text-[9px] flex items-center justify-center font-bold">
                      {turns.filter((tr) => tr.speaker === 'user').length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* SISI KANAN: Papan Belajar / Papan Taktis SSW Quick Action, EN/JA/ZH Pill */}
          <div className="order-2 sm:order-3 flex items-center gap-1 sm:gap-1.5 text-xs shrink-0">
            {!isMeasureMode && activeTab === 'call' && (() => {
              const isSswPill =
                activePersona.id === 'ssw_sensei' ||
                activeScenario.personaId === 'ssw_sensei' ||
                activeScenario.id.startsWith('scen_ssw_');
              return (
              <button
                type="button"
                data-testid="open-workbench-pill-btn"
                onClick={() => {
                  unlockSharedBoardAudioContext();
                  playFiezelSfx('button_tap');
                  if (isSswPill) {
                    workbenchSessionRef.current.dismissedByUser = false;
                    const sswTitle = `Papan Taktis SSW · Hal. ${sswFocusPage || 1}`;
                    openLearningWorkbenchWithAction(
                      {
                        actionType: 'open_learning_popup',
                        focusType: 'ssw_tactical_board' as any,
                        topicTitle: sswTitle,
                      },
                      sswTitle,
                      { forceOpen: true }
                    );
                    return;
                  }
                  const trimmedUserTurn = lastUserTurn?.text?.trim() || '';
                  const sm = scenarioMetaForLocale(locale, activeScenario);
                  const scenarioStarterTitle =
                    sm.competency ||
                    sm.title ||
                    activeScenario.targetPatterns?.[0] ||
                    (locale === 'id' ? 'Materi percakapan sesi ini' : 'Session conversation guide');
                  const focusQuery =
                    (trimmedUserTurn.split(/\s+/).length >= 3 ? trimmedUserTurn : '') ||
                    (trimmedUserTurn ? lastAiTurn?.text?.trim() : '') ||
                    trimmedUserTurn ||
                    activeScenario.targetPatterns?.[0] ||
                    scenarioStarterTitle;
                  const reqSeq = ++workbenchSessionRef.current.turnSeq;
                  workbenchSessionRef.current.dismissedByUser = false;
                  const isPte = activeScenario.id.startsWith('scen_pte_') || activeScenario.personaId === 'dr_julian';
                  const pteFocus = activeScenario.id === 'scen_pte_ra_level2' ? 'pte_read_aloud' : (isPte ? 'pte_describe_image' : undefined);
                  const starterFormula = activeScenario.targetPatterns?.slice(0, 2).join(' • ') || '';
                  const starterSample =
                    activeScenario.sampleUtterances?.find((u) => u.intent === 'accurate')?.text ||
                    activeScenario.targetPatterns?.[0] ||
                    '';
                  const starterExplanation = !trimmedUserTurn
                    ? [
                        sm.situation,
                        ...(Array.isArray(sm.missionGoals) ? sm.missionGoals : []),
                      ]
                        .filter(Boolean)
                        .join(' ')
                    : '';
                  setIsAnalyzingTurn(!pteFocus && Boolean(trimmedUserTurn));
                  setIsGeneratingWorkbench(!pteFocus && Boolean(trimmedUserTurn));
                  openLearningWorkbenchWithAction(
                    {
                      actionType: 'open_learning_popup',
                      focusType: pteFocus,
                      topicTitle: !trimmedUserTurn ? scenarioStarterTitle : focusQuery,
                      patternFormula: !trimmedUserTurn ? starterFormula : undefined,
                      explanationText: starterExplanation || undefined,
                      sampleTarget: !trimmedUserTurn ? starterSample : undefined,
                      bankTopicId: pteFocus ? undefined : 'custom_dynamic',
                    },
                    !trimmedUserTurn ? scenarioStarterTitle : focusQuery
                  );
                  if (pteFocus || !trimmedUserTurn) return;
                  void (async () => {
                    try {
                      const liveWb = await requestRealtimeWhiteboardStream({
                        question: `[WHITEBOARD_REQUEST] Jelaskan konsep, diagram visual, dan contoh untuk: ${focusQuery}`,
                        personaId: activePersona.id,
                        personaName: activePersona.name,
                        scenarioId: activeScenario.id,
                        scenarioTitle: activeScenario.titleId,
                        targetLang: activeScenario.targetLang,
                        locale,
                        learnerDossier: safeBuildDossier(brainStateRef.current, activeScenario, locale),
                        history: turnsRef.current
                          .slice(-4)
                          .map((t) => ({ speaker: t.speaker, text: t.text })),
                        onOpenerReady: (opener) => {
                          const firstChunk = extractOpenerFirstTtsChunk(opener);
                          if (
                            firstChunk &&
                            reqSeq === workbenchSessionRef.current.turnSeq &&
                            !workbenchSessionRef.current.dismissedByUser
                          ) {
                            void synthesizeFlexibleTts({
                              text: firstChunk,
                              targetLang: locale,
                              persona: activePersona,
                            }).catch(() => null);
                          }
                        },
                      });
                      if (
                        liveWb?.uiAction?.actionType === 'open_learning_popup' &&
                        reqSeq === workbenchSessionRef.current.turnSeq &&
                        !workbenchSessionRef.current.dismissedByUser
                      ) {
                        openLearningWorkbenchWithAction(liveWb.uiAction, focusQuery);
                      }
                    } catch {
                      // Honest offline retry card shown once analyzing finishes
                    } finally {
                      if (reqSeq === workbenchSessionRef.current.turnSeq) {
                        setIsAnalyzingTurn(false);
                        setIsGeneratingWorkbench(false);
                      }
                    }
                  })();
                }}
                className={
                  isSswPill
                    ? 'fz-wb-press px-2.5 py-1 rounded-full bg-[#FCECED] hover:bg-[#F9D7DB] border border-[#E8B8BF] text-[#8C2233] text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-all'
                    : 'fz-wb-press px-2.5 py-1 rounded-full bg-[#FFF3C4] hover:bg-[#FFE896] border border-[#E6CE7A] text-[#241A11] text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-all'
                }
                title={
                  isSswPill
                    ? locale === 'id'
                      ? 'Buka Papan Taktis SSW Sensei (Trik Wakai Papa+, Kotoba & Kuis Prometric)'
                      : 'Open SSW Tactical Board'
                    : t(locale, 'ui.whiteboard')
                }
              >
                <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isSswPill ? 'text-[#8C2233]' : 'text-[#8C6D1F]'}`} />
                <span className="hidden sm:inline">
                  {isSswPill ? t(locale, 'ui.tacticalBoard') : t(locale, 'ui.whiteboard')}
                </span>
              </button>
              );
            })()}

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
      <main ref={mainScrollRef} className="flex-1 min-h-0 max-w-4xl mx-auto px-4 sm:px-6 lg:max-w-6xl xl:max-w-7xl pt-1.5 pb-4 sm:py-2 space-y-2 sm:space-y-3 w-full overflow-y-auto overscroll-contain flex flex-col">
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
              setStatusBanner(t(locale, 'ui.prereqUnlockedToast'));
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
                      className="bg-[#F6F3EC] rounded-2xl p-3 text-xs space-y-1"
                    >
                      <JapaneseRubyDisplay
                        text={v.term}
                        targetLang={activeScenario.targetLang}
                        showFurigana={!isMeasureMode}
                        showRomaji={!isMeasureMode}
                        className="font-bold text-[#1C1611]"
                        rubyClassName="font-bold text-[#1C1611]"
                      />
                      <div className="text-[#6E5E47]">
                        {vocabMeaningForLocale(locale, v)}
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
              <div className="w-full flex-1 flex flex-col space-y-2 sm:space-y-3 pb-4">
                {/* KOLOM FACETIME (40-60 Split: 40% Video Stage Mochi | 60% Interactive Learning Surface) */}
                <div className={`w-full max-w-xl lg:max-w-4xl mx-auto flex flex-col lg:grid lg:grid-cols-12 lg:items-start gap-2 sm:gap-3.5 ${callViewMode === 'stage' ? 'flex' : 'hidden'}`}>
                  {/* 1. ZONA 40%: FaceTime Video Stage Mochi */}
                  <section
                    data-testid="ai-call-card"
                    data-call-state={callStateKey}
                    data-transport-mode={liveTransportMode}
                    className="lg:col-span-5 lg:self-start bg-gradient-to-b from-[#FAF5EB]/95 to-white/95 rounded-3xl p-2 sm:p-4 shadow-[0_4px_24px_rgba(28,22,17,0.04)] border border-[#EADBCE]/80 flex flex-col justify-between items-center w-full h-auto min-h-0 sm:min-h-[345px] relative z-10 shrink-0"
                  >
                    {/* Meta Bar Atas: Coach & Scenario Level & Mode Badges */}
                    <div className="w-full flex flex-wrap items-center justify-between gap-1.5 text-xs">
                      <div className="flex items-center gap-1 text-[#6E5E47] min-w-0">
                        <button
                          type="button"
                          data-testid="persona-card-trigger"
                          onClick={() => {
                            playFiezelSfx('button_tap');
                            setShowPersonaModal(true);
                          }}
                          className="inline-flex items-center gap-1 font-bold text-[#1C1611] hover:text-[#5C4E3C] bg-white/90 hover:bg-white px-2 py-0.5 rounded-full border border-black/5 transition-all cursor-pointer active:scale-95 text-[11px] whitespace-nowrap shrink-0"
                          title={t(locale, 'ui.switchPersona')}
                        >
                          <span>{formatPersonaShortName(activePersona.name)}</span>
                          <span className="text-[10px] text-[#8C7A65]">▾</span>
                        </button>
                        <span className="shrink-0">·</span>
                        <div className="relative inline-flex items-center shrink-0">
                          <button
                            type="button"
                            data-testid="cefr-level-selector-btn"
                            onClick={() => {
                              playFiezelSfx('button_tap');
                              setShowCefrPicker((v) => !v);
                            }}
                            className="inline-flex items-center gap-1 font-bold text-[#1C1611] hover:text-[#5C4E3C] bg-white/90 hover:bg-white px-2 py-0.5 rounded-full border border-black/5 transition-all cursor-pointer active:scale-95 text-[11px] whitespace-nowrap shrink-0"
                            title={t(locale, 'ui.cefrBtnTitle')}
                          >
                            <span className="text-[#B45309]">🎯</span>
                            <span>
                              {`${t(locale, 'ui.levelWord')} ${userCefrLevel}`}
                            </span>
                            <span className="text-[10px] text-[#8C7A65]">▾</span>
                          </button>

                          {showCefrPicker && (
                            <div
                              className="absolute top-full left-0 mt-1 z-50 bg-[#FFFDF8] border border-[#EADBCE] rounded-2xl shadow-xl p-1.5 min-w-[170px] flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150"
                              data-testid="cefr-level-dropdown"
                            >
                              <div className="px-2 py-1 text-[10px] font-extrabold text-[#8C7A65] uppercase tracking-wider border-b border-[#F0E6D9]">
                                {locale === 'id' ? 'Target Level Belajar' : `${t(locale, 'ui.levelWord')} Target`}
                              </div>
                              {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const).map((lvl) => {
                                const isSel = userCefrLevel === lvl;
                                const desc =
                                  lvl === 'A1'
                                    ? 'Pemula Dasar'
                                    : lvl === 'A2'
                                    ? 'Percakapan Simpel'
                                    : lvl === 'B1'
                                    ? 'PTE 42 / IELTS 5.0 (Default)'
                                    : lvl === 'B2'
                                    ? 'PTE 58 / IELTS 6.5'
                                    : lvl === 'C1'
                                    ? 'PTE 76 / IELTS 7.5'
                                    : 'Akademik Mahir (C2)';
                                return (
                                  <button
                                    key={lvl}
                                    type="button"
                                    data-testid={`cefr-option-${lvl.toLowerCase()}`}
                                    onClick={() => handleSelectCefrLevel(lvl)}
                                    className={`w-full text-left px-2 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                      isSel
                                        ? 'bg-[#FDF4E7] text-[#B45309] font-extrabold shadow-2xs'
                                        : 'text-[#4A3B2C] hover:bg-[#F5EFE6] font-medium'
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-bold flex items-center gap-1">
                                        Level {lvl}
                                        {lvl === 'B1' && (
                                          <span className="text-[9px] px-1 py-0.2 rounded-full bg-[#E6F4EA] text-[#1B5E34] font-bold">
                                            PTE 42
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-[9.5px] text-[#8C7A65]">{desc}</span>
                                    </div>
                                    {isSel && <span className="text-[#B45309] font-bold">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
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
                          {isMeasureMode
                            ? t(locale, 'ui.examMode')
                            : t(locale, 'ui.practiceMode')}
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
                            <span>
                              {callMode === 'casual_chat'
                                ? t(locale, 'ui.casualMode')
                                : t(locale, 'ui.mentorMode')}
                            </span>
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
                        title={isPlayingAiAudio ? t(locale, 'ui.tapInterrupt') : 'Mochi (3D)'}
                        className="relative w-[155px] sm:w-[280px] lg:w-[300px] h-[88px] sm:h-[200px] lg:h-[225px] flex items-center justify-center cursor-pointer select-none"
                      >
                        <div
                          ref={mochiContainerRef}
                          data-testid="mochi-3d-stage"
                          className="w-[155px] sm:w-[280px] lg:w-[300px] h-[88px] sm:h-[200px] lg:h-[225px] flex items-center justify-center relative"
                        />
                        {!is3dMochiReady && !mochi3dFailed && (
                          <div
                            aria-hidden="true"
                            className="absolute pointer-events-none w-28 sm:w-36 h-28 sm:h-36 rounded-full bg-gradient-to-br from-[#EEDFCC]/60 to-[#DFCEB7]/50 animate-pulse shadow-inner flex items-center justify-center"
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
                                ? './assets/brand/mochi-mascot-headset.png'
                                : './assets/brand/mochi-mascot-idle.png';
                              if (e.currentTarget.getAttribute('src') !== fallback) {
                                e.currentTarget.setAttribute('src', fallback);
                              }
                            }}
                            alt="Mochi Fallback"
                            className="absolute pointer-events-none w-28 sm:w-36 h-28 sm:h-36 rounded-full object-contain p-1"
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
                                ? t(locale, 'ui.thinking')
                                : isPlayingAiAudio
                                ? isLiveConnected
                                  ? locale === 'id'
                                    ? `Mochi berbicara... (${formatTimer(callDurationSec)})`
                                    : `${t(locale, 'ui.mochiSpeakingStatus')} (${formatTimer(callDurationSec)})`
                                  : t(locale, 'ui.speakingNow')
                                : isWaitingAfterSpeech
                                ? `${t(locale, 'ui.listening')} (${formatTimer(callDurationSec)})`
                                : isRecordingPtt
                                  ? locale === 'id'
                                    ? `Merekam suara... (${formatTimer(pttRecordingSec)})`
                                    : `${t(locale, 'ui.recordingStatus')} (${formatTimer(pttRecordingSec)})`
                                  : isLiveConnected
                                    ? isMicMuted
                                      ? `${t(locale, 'ui.micMutedShort')} · ${formatTimer(callDurationSec)}`
                                      : `LIVE · ${formatTimer(callDurationSec)}`
                                    : t(locale, 'ui.readyToTalk')}
                            </span>
                          </div>

                          {isLiveConnected && (
                            <div
                              data-testid="ai-call-gem-meter-pill"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FEFCE8] border border-[#FDE68A] text-[11px] font-bold text-[#78350F] shadow-2xs"
                            >
                              {isLocalTestEnvironment() ? (
                                <span>{t(locale, 'ui.freeGem')}</span>
                              ) : liveBillingUi.isDailyFree && liveBillingUi.gemsSpent === 0 ? (
                                <span>{t(locale, 'ui.freeDaily')} ({liveBillingUi.turns}/{DAILY_FREE_CALL_MAX_TURNS})</span>
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
                              className="w-full xs:w-auto inline-flex items-center justify-center gap-2 sm:gap-2.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all cursor-pointer active:scale-95 disabled:opacity-60 group"
                              title={t(locale, 'ui.startFaceTimeTitle')}
                            >
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                              </span>
                              <Phone className="w-4 h-4 text-white group-hover:rotate-12 transition-transform shrink-0" />
                              <span>
                                {isLiveConnecting
                                  ? t(locale, 'call.connecting')
                                  : t(locale, 'call.startLive')}
                              </span>
                            </button>
                            <span className="hidden sm:flex text-[11px] text-[#8C7A65] font-medium items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>
                                {t(locale, 'ui.handsFreeSub')}
                              </span>
                            </span>
                          </div>
                        ) : (
                          <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="relative flex h-2.5 w-2.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                              </span>
                              <div
                                onClick={() => {
                                  if (!isMicHardwareReady && !isMicMuted) {
                                    void toggleMuteMic();
                                  }
                                }}
                                className={`flex items-center gap-1.5 text-xs font-bold text-emerald-900 truncate ${!isMicHardwareReady && !isMicMuted ? 'cursor-pointer underline decoration-dotted' : ''}`}
                              >
                                <Mic className={`w-3.5 h-3.5 shrink-0 ${isMicMuted ? 'text-[#8C2233]' : 'text-emerald-700 animate-pulse'}`} />
                                <span className="truncate">
                                  {isMicMuted
                                    ? t(locale, 'ui.micOff')
                                    : isUserSpeakingLive
                                    ? t(locale, 'ui.youSpeak')
                                    : isPlayingAiAudio
                                    ? liveTransportMode === 'ws-duplex' && isMicHardwareReady
                                      ? locale === 'id'
                                        ? 'Mochi Bicara · Mic Aktif'
                                        : t(locale, 'ui.mochiSpeakMic')
                                      : t(locale, 'ui.mochiSpeak')
                                    : !isMicHardwareReady
                                    ? t(locale, 'ui.tapEnableMic')
                                    : t(locale, 'ui.micOn')}
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
                                title={isMicMuted ? t(locale, 'ui.enableMicTitle') : t(locale, 'ui.muteMicTitle')}
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
                                title={t(locale, 'ui.endCallTitle')}
                              >
                                <PhoneOff className="w-3.5 h-3.5" />
                                <span>{t(locale, 'ui.endCallBtn')}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* 2. ZONA 60%: Interactive Learning Surface (Subtitles & Learning Controls) */}
                  <div className="lg:col-span-7 flex flex-col justify-between gap-2 sm:gap-3 w-full pb-2 sm:pb-0">
                    {/* SUBTITLE MELAYANG HALUS (Floating Subtitles Glass HUD) */}
                    <div
                      data-testid="live-translation-hud"
                      className="w-full text-left rounded-3xl bg-white sm:bg-white/95 sm:backdrop-blur-md border border-[#EDE5D4] p-2.5 sm:p-5 shadow-sm space-y-1.5 sm:space-y-3 flex flex-col justify-between min-h-[108px] sm:min-h-[260px] lg:min-h-[300px]"
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
                            {t(locale, 'ui.preparingReply')}
                          </span>
                        </div>
                      ) : (
                        <>
                          {/* ATAS: Subtitle Bahasa Kursus (Bold & Furigana/Pinyin/Fonetik) */}
                          <div
                            data-testid="live-hud-ai-text"
                            data-reply-source={liveAiDraft.trim() ? 'live' : lastAiTurn?.replySource || 'script'}
                          >
                            {(() => {
                              const hideSswIndonesianPhonetic =
                                isSswSensei && !/[\u3040-\u30ff\u4e00-\u9faf]/.test(activeAiLiveText);
                              return (
                                <JapaneseRubyDisplay
                                  text={activeAiLiveText}
                                  targetLang={activeScenario.targetLang}
                                  phoneticText={hideSswIndonesianPhonetic ? '' : activeAiSubtitle.pronunciation}
                                  pronunciationTestId="live-hud-ai-pronunciation"
                                  showFurigana={!isMeasureMode}
                                  showRomaji={!isMeasureMode && !hideSswIndonesianPhonetic}
                                  className="text-[15.5px] sm:text-[18px] font-bold text-[#1C1611] tracking-[-0.01em] leading-snug break-words"
                                  rubyClassName="text-[15.5px] sm:text-[18px]"
                                  romajiClassName="text-[11.5px] sm:text-[12.5px] text-[#8C6D1F] font-medium mt-0.5"
                                />
                              );
                            })()}
                          </div>

                          {/* BAWAH: Terjemahan Bahasa Indonesia / Thai / dsb. */}
                          {!isMeasureMode && showTranslations && resolvedActiveAiMeaning && !isAiHudDuplicateMeaning && (
                            <div className="flex items-start justify-between gap-2 p-2 sm:p-2.5 rounded-2xl bg-[#FFF8EE] border border-[#F0DFCA] shadow-2xs mt-0.5">
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#9C6119] tracking-wider uppercase">
                                  <span>
                                    {t(locale, 'ui.translationLabel')}
                                  </span>
                                </div>
                                <p
                                  data-testid="live-hud-ai-translation"
                                  className="text-[13px] sm:text-[14px] font-semibold text-[#1C1611] leading-snug break-words"
                                >
                                  {resolvedActiveAiMeaning}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowTranslations(false)}
                                className="text-[11px] text-[#8C6D1F] hover:text-[#1C1611] shrink-0 font-medium cursor-pointer pt-0.5"
                                title={t(locale, 'ui.hideTitle')}
                              >
                                {t(locale, 'ui.hide')}
                              </button>
                            </div>
                          )}
                          {!isMeasureMode && !showTranslations && (
                            <div className="pt-0.5">
                              <button
                                type="button"
                                onClick={() => setShowTranslations(true)}
                                className="text-[11px] text-[#8C6D1F] hover:text-[#1C1611] font-medium cursor-pointer"
                                title={t(locale, 'ui.showTitle')}
                              >
                                {t(locale, 'ui.showTranslation')}
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
                          title={t(locale, 'ui.playAtRate')}
                        >
                          <Volume2 className="w-3.5 h-3.5 text-[#5C4E3C] shrink-0" />
                          <span>
                            {callStateKey === 'speaking'
                              ? t(locale, 'ui.playing')
                              : t(locale, 'call.replayAi')}
                          </span>
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
                            title={t(locale, 'ui.rateSlow')}
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
                            title={t(locale, 'ui.rateNatural')}
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
                            title={t(locale, 'ui.rateNormal')}
                          >
                            ⚡ 1.0x
                          </button>
                        </div>
                      </div>

                      {activeUserSubtitle && (
                        <div
                          data-testid="live-hud-user-subtitle"
                          className="pt-1.5 px-3 py-2 rounded-2xl bg-[#F5F1E8]/90 border border-[#E8DEC8]/70 space-y-0.5"
                        >
                          <div className="flex items-start gap-1.5 text-xs text-[#5C4E3C]">
                            <strong className="font-semibold text-[#1C1611] shrink-0 pt-0.5">
                              {t(locale, 'ui.youLabel')}
                            </strong>
                            <div className="min-w-0 flex-1">
                              <JapaneseRubyDisplay
                                text={activeUserSubtitle.text}
                                targetLang={activeScenario.targetLang}
                                phoneticText={activeUserSubtitle.pronunciation}
                                pronunciationTestId="live-hud-user-pronunciation"
                                showFurigana={!isMeasureMode}
                                showRomaji={!isMeasureMode}
                                className="text-xs sm:text-[13px] font-semibold text-[#1C1611] break-words"
                                rubyClassName="text-xs sm:text-[13px] font-semibold text-[#1C1611]"
                                romajiClassName="text-[11px] text-[#8C6D1F] font-medium"
                              />
                            </div>
                          </div>
                          {!isMeasureMode && showTranslations && resolvedActiveUserMeaning && (
                            <p
                              data-testid="live-hud-user-translation"
                              className="text-[11px] text-[#6E5E47] italic pl-11 break-words"
                            >
                              {resolvedActiveUserMeaning}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {isSswSensei && !isMeasureMode && (
                  <div className="w-full max-w-xl lg:max-w-4xl mx-auto">
                    <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
                      <span className="text-[11px] font-extrabold text-[#8C2233] uppercase tracking-wider">
                        Panel Belajar &amp; Simulasi Ujian SSW (Hal. 1-91)
                      </span>
                      <button
                        type="button"
                        data-testid="toggle-ssw-workbench-btn"
                        onClick={() => setShowSswWorkbench((v) => !v)}
                        className="px-2.5 py-0.5 rounded-full border border-[#DECFAF] bg-white text-[11px] font-bold text-[#5B4B3A] cursor-pointer"
                      >
                        {showSswWorkbench ? 'Ciutkan Panel SSW' : 'Buka Panel SSW'}
                      </button>
                    </div>
                    {showSswWorkbench && (
                      <SswSenseiWorkbenchPanel
                        activeTab={sswWorkbenchTab}
                        onChangeTab={setSswWorkbenchTab}
                        state={sswMasterState}
                        focusPage={sswFocusPage}
                        drawnQuiz={sswDrawnQuiz}
                        latestGrade={sswLatestGrade}
                        onSelectStage={(stageId, firstPage) => {
                          const res = updateSswStudyProgress({ stageId, status: 'in_progress', focusPage: firstPage });
                          setSswMasterState(res.state);
                        }}
                        onToggleStageComplete={(stageId) => {
                          const alreadyDone = sswMasterState.completedStageIds.includes(stageId);
                          const res = updateSswStudyProgress({
                            stageId,
                            status: alreadyDone ? 'in_progress' : 'completed',
                          });
                          setSswMasterState(res.state);
                        }}
                        onSelectPage={(pageNumber) => {
                          setSswFocusPage(pageNumber);
                        }}
                        onMarkPageRead={(pageNumber) => {
                          const res = updateSswStudyProgress({ pdfPagesRead: [pageNumber], focusPage: pageNumber });
                          setSswMasterState(res.state);
                        }}
                        onToggleKotobaMastered={(kotobaId) => {
                          const res = updateSswStudyProgress({ kotobaIdsMastered: [kotobaId] });
                          setSswMasterState(res.state);
                        }}
                        onDrawQuiz={handleDrawSswQuiz}
                        onAnswerQuiz={handleAnswerSswQuiz}
                        onAskSensei={(promptText) => {
                          if (isLiveConnected) {
                            submitLiveUserUtterance(promptText, { inputMode: 'typed' });
                          } else {
                            void submitStudentTurn({ text: promptText, inputMode: 'typed' });
                          }
                        }}
                        onResetProgress={() => {
                          const def = resetSswMasterState();
                          setSswMasterState(def);
                          setSswDrawnQuiz(null);
                          setSswLatestGrade(null);
                          setSswFocusPage(1);
                        }}
                      />
                    )}
                  </div>
                )}

                {/* KOLOM RIWAYAT: Khusus Chat History & Feedback Transkrip */}
                <div className={`w-full max-w-2xl mx-auto flex flex-col gap-3 ${callViewMode === 'history' ? 'flex' : 'hidden'}`}>
                  <section className="space-y-2.5 w-full pt-1">
                    <div className="flex items-center justify-between gap-2 px-1 text-xs text-[#6E5E47] pb-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C1611] uppercase tracking-wider">
                        <MessageSquare className="w-3.5 h-3.5 text-[#8C2233]" />
                        <span>{t(locale, 'ui.transcriptHeading')}</span>
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
                          <span>
                            {locale === 'zh' ? '返回实时通话' : t(locale, 'ui.backToFaceTime')}
                          </span>
                        </button>
                        {!isMeasureMode && (
                          <button
                            type="button"
                            onClick={() => setShowTranslations(!showTranslations)}
                            className="font-medium text-[#6E5E47] hover:text-[#1C1611] cursor-pointer"
                          >
                            {showTranslations
                              ? locale === 'ja'
                                ? '訳を隠す'
                                : locale === 'zh'
                                ? '隐藏翻译'
                                : t(locale, 'ui.hideTitle')
                              : locale === 'ja'
                                ? '訳を表示'
                                : locale === 'zh'
                                ? '显示翻译'
                                : t(locale, 'ui.showTitle')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleResetCallSession}
                          className="font-medium text-[#6E5E47] hover:text-[#1C1611] flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>{locale === 'zh' ? '重来' : t(locale, 'ui.resetBtn')}</span>
                        </button>
                      </div>
                    </div>

                  <div
                    ref={transcriptContainerRef}
                    className="space-y-2.5 px-0.5 pb-8 sm:pb-10"
                  >
                    {turns.length <= 1 && (
                      <div
                        data-testid="transcript-empty-placeholder"
                        className="rounded-2xl border border-dashed border-[#DFD4BF] bg-white/60 px-4 py-4 text-xs text-[#6E5E47] leading-relaxed"
                      >
                        <p className="font-semibold text-[#1C1611] mb-1">
                          {t(locale, 'ui.emptyChatTitle')}
                        </p>
                        <p>
                          {t(locale, 'ui.emptyChatDesc')}
                        </p>
                      </div>
                    )}
                    {turns.map((turn, idx) => {
                      // Jangan duplikasi kalimat pembuka pertama jika murid belum membalas
                      if (idx === 0 && turns.length === 1 && turn.speaker === 'ai') {
                        return null;
                      }
                      if (turn.speaker === 'ai') {
                        const aiHistorySubtitle = translateAndPhoneticizeLiveText(
                          turn.text,
                          activeScenario.targetLang,
                          locale === 'id' ? turn.translationId : undefined,
                          locale === 'th' ? turn.translationTh : undefined,
                          undefined,
                          { locale, forceFetch: true }
                        );
                        const aiMeaningText =
                          locale === 'th'
                            ? aiHistorySubtitle.translationTh || turn.translationTh
                            : locale === 'id'
                            ? aiHistorySubtitle.translationId || turn.translationId
                            : locale === 'ja'
                            ? aiHistorySubtitle.translationJa || turn.translationJa || (activeScenario.targetLang !== 'ja' ? aiHistorySubtitle.translationId : '')
                            : locale === 'zh'
                            ? aiHistorySubtitle.translationZh || turn.translationZh || (activeScenario.targetLang !== 'zh' ? aiHistorySubtitle.translationId : '')
                            : activeScenario.targetLang !== locale
                            ? aiHistorySubtitle.translationId || ''
                            : '';

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
                                  phoneticText={aiHistorySubtitle.pronunciation}
                                  pronunciationTestId="history-ai-pronunciation"
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
                                title={t(locale, 'call.replayAi')}
                              >
                                <Volume2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* BAWAH: Terjemahan bahasa user (Bahasa Indonesia / Thai / Jepang / Mandarin) */}
                            {!isMeasureMode && showTranslations && aiMeaningText && (
                              <p
                                data-testid="history-ai-translation"
                                className="text-xs sm:text-[13px] text-[#5C4E3C] font-normal leading-relaxed break-words pt-1 border-t border-[#EDE5D4]/50"
                              >
                                {aiMeaningText}
                              </p>
                            )}
                          </div>
                        );
                      }

                      const diag = turn.diagnosis;
                      const userHistorySubtitle = translateAndPhoneticizeLiveText(
                        turn.text,
                        activeScenario.targetLang,
                        locale === 'id' ? turn.translationId : undefined,
                        locale === 'th' ? turn.translationTh : undefined,
                        undefined,
                        { locale, forceFetch: true }
                      );
                      const userMeaningText =
                        locale === 'th'
                          ? userHistorySubtitle.translationTh || turn.translationTh
                          : locale === 'id'
                          ? userHistorySubtitle.translationId || turn.translationId
                          : locale === 'ja'
                          ? userHistorySubtitle.translationJa || turn.translationJa || (activeScenario.targetLang !== 'ja' ? userHistorySubtitle.translationId : '')
                          : locale === 'zh'
                          ? userHistorySubtitle.translationZh || turn.translationZh || (activeScenario.targetLang !== 'zh' ? userHistorySubtitle.translationId : '')
                          : activeScenario.targetLang !== locale
                          ? userHistorySubtitle.translationId || ''
                          : '';

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
                              phoneticText={userHistorySubtitle.pronunciation}
                              pronunciationTestId="history-user-pronunciation"
                              showFurigana={!isMeasureMode}
                              showRomaji={!isMeasureMode}
                              className="text-sm font-medium text-white break-words"
                              rubyClassName="text-sm font-medium text-white"
                              romajiClassName="text-xs text-[#FFE082] font-medium mt-0.5"
                            />
                            {!isMeasureMode && showTranslations && userMeaningText && (
                              <p
                                data-testid="history-user-translation"
                                className="text-xs text-[#FFE082]/90 mt-1 pt-1 border-t border-white/10 break-words italic"
                              >
                                {userMeaningText}
                              </p>
                            )}
                          </div>

                          {diag && (
                            <div
                              data-testid="turn-diagnosis-card"
                              data-ok={diag.ok ? 'true' : 'false'}
                              className={`rounded-2xl px-3.5 py-2 text-xs max-w-[90%] sm:max-w-[82%] break-words space-y-1.5 ${
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
                                    {diag.ok
                                      ? locale === 'ja'
                                        ? '自然な文です'
                                        : locale === 'zh'
                                        ? '表达准确'
                                        : t(locale, 'diag.correctHeader')
                                      : locale === 'ja'
                                        ? '表現のアドバイス'
                                        : locale === 'zh'
                                        ? '表达优化建议'
                                        : t(locale, 'diag.wrongHeader')}
                                  </span>
                                </div>
                                <span className="font-mono tabular-nums text-[11px] text-[#6E5E47]">
                                  Grammar {diag.grammarScore}% · BKT {Math.round(diag.bktAfter * 100)}%
                                </span>
                              </div>

                              {(() => {
                                const correction = (diag.syntacticCorrection || diag.naturalReformulation || '').trim();
                                const normCompare = (s: string) =>
                                  s.replace(/[\s.,!?。、！？「」『』"'（）()]/g, '').toLowerCase();
                                const isDifferent = Boolean(
                                  correction && normCompare(correction) !== normCompare(turn.text)
                                );
                                if (!isDifferent && diag.ok) return null;
                                const displayCorrection = correction || diag.syntacticCorrection;
                                if (!displayCorrection) return null;
                                return (
                                  <div className="bg-white/95 rounded-xl px-3 py-2 flex items-start justify-between gap-2 text-[#1C1611] border border-[#EADBCE]/60">
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                      <span className="block font-semibold text-[11px] text-[#8C2233]">
                                        {locale === 'ja'
                                          ? '自然な言い方:'
                                          : locale === 'zh'
                                          ? '更地道的说法:'
                                          : t(locale, 'diag.naturalLabel')}
                                      </span>
                                      <div data-testid="history-correction-display">
                                        <JapaneseRubyDisplay
                                          text={displayCorrection}
                                          targetLang={activeScenario.targetLang}
                                          pronunciationTestId="history-correction-pronunciation"
                                          showFurigana={!isMeasureMode}
                                          showRomaji={!isMeasureMode}
                                          as="div"
                                          className="text-xs font-bold text-[#8C2233] leading-snug"
                                          rubyClassName="text-xs font-bold text-[#8C2233]"
                                          romajiClassName="text-[11px] text-[#6E5E47] font-semibold mt-0.5"
                                        />
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInputText(displayCorrection);
                                      }}
                                      className="shrink-0 px-2.5 py-1 rounded-full bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[11px] font-semibold cursor-pointer mt-0.5"
                                    >
                                      {locale === 'ja' ? '使う' : locale === 'zh' ? '使用' : t(locale, 'ui.useAnswerBtn')}
                                    </button>
                                  </div>
                                );
                              })()}

                              {!diag.ok && (locale === 'th' ? (diag.whyFailsTh || diag.pedagogicalFeedbackTh) : locale === 'id' ? (diag.whyFailsId || diag.pedagogicalFeedbackId) : '') && (
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
                        <span>{t(locale, 'ui.preparingReply')}</span>
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
                  <span>{t(locale, 'ui.backToCall')}</span>
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
                {t(locale, 'ui.matrixTitle')}
              </h2>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#F0E4CF] text-[#6E5E47]">
                    <th className="py-2.5 pr-3">{t(locale, 'ui.competencyCol')}</th>
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
                        <span>{item.frequency}{t(locale, 'ui.detectedSuffix')}</span>
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
          className="shrink-0 w-full z-30 bg-[#F6F3EC] sm:bg-[#F6F3EC]/95 sm:backdrop-blur-md border-t border-[#E8DFC8]/70 px-3 sm:px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(28,22,17,0.04)]"
        >
          <div className="w-full min-w-0 max-w-2xl lg:max-w-4xl mx-auto space-y-1.5">
            {/* COPILOT TELEPROMPTER DOCK: Menempel langsung di atas input bar - NO SCROLL NEEDED */}
            {!isMeasureMode && (
              <div data-testid="docked-copilot-container" className="w-full min-w-0 max-w-full pb-1">
                <BeginnerAnswerAssistant
                  locale={locale}
                  targetLang={activeScenario.targetLang}
                  scenario={activeScenario}
                  persona={activePersona}
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
                      submitLiveUserUtterance(clean, { inputMode: 'quick_chip' });
                    } else {
                      void submitStudentTurn({ text: clean, inputMode: 'quick_chip' });
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
                        ? `"${liveUserDraft.trim()}" ${t(locale, 'ui.thinkingPauseTag')}`
                        : `"${liveUserDraft.trim()}"`
                      : isPlayingAiAudio
                        ? (
                          <>
                            {t(locale, 'ui.coachSpeakingInterrupt')}
                            <span className="inline"> {locale === 'id' ? '· mic aktif, bicara saja untuk menyela' : t(locale, 'ui.coachInterruptHint')}</span>
                          </>
                        )
                        : isLiveConnected
                          ? isMicMuted
                            ? (
                              <>
                                {t(locale, 'ui.micOffBanner')}
                                <span className="hidden sm:inline">{t(locale, 'ui.micOffHint')}</span>
                              </>
                            )
                            : (
                              <>
                                {t(locale, 'ui.micHandsFreeBanner')}
                                <span className="hidden sm:inline">{t(locale, 'ui.micHandsFreeHint')}</span>
                              </>
                            )
                          : t(locale, 'ui.listeningPleaseSpeak')}
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
                          submitLiveUserUtterance(textToSend, { inputMode: 'voice' });
                        } else {
                          const draftTel = turnAcousticTrackerRef.current.finalize();
                          turnAcousticTrackerRef.current.reset();
                          void submitStudentTurn({
                            text: textToSend,
                            speakingDurationSec:
                              draftTel.spanDurationSec > 0 ? draftTel.spanDurationSec : undefined,
                            inputMode: 'voice',
                            fluencyTelemetry: draftTel,
                          });
                        }
                      }
                    }}
                    className="px-3 py-0.5 rounded-full bg-[#1C1611] text-white font-semibold text-[11px] shrink-0 cursor-pointer"
                  >
                    {t(locale, 'ui.sendShortBtn')}
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
                  className={`px-2.5 sm:px-3.5 py-2 rounded-full font-semibold text-xs flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer transition-all ${
                    isMicMuted
                      ? 'bg-[#8C2233] text-white hover:bg-[#721B29]'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                  title={
                    isMicMuted
                      ? t(locale, 'ui.micMutedTitle')
                      : t(locale, 'ui.micActiveTitle')
                  }
                >
                  {isMicMuted ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 shrink-0 text-white" />
                      <span>{t(locale, 'ui.micOff')}</span>
                    </>
                  ) : (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <Mic className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{t(locale, 'ui.handsFreeBtn')}</span>
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
                      requestStartLiveCall(false);
                      return;
                    }
                    void startPttRecording();
                  }}
                  className={`px-2.5 sm:px-3.5 py-2 rounded-full font-semibold text-xs flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer transition-all ${
                    isRecordingPtt
                      ? 'bg-[#8C2233] text-white'
                      : 'bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[#1C1611]'
                  }`}
                  title={isPlayingAiAudio ? t(locale, 'ui.interruptAndSpeak') : t(locale, 'call.pushToTalk')}
                >
                  {isRecordingPtt ? (
                    <MicOff className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-[#5C4E3C] shrink-0" />
                  )}
                  <span>
                    {isRecordingPtt
                      ? `Stop (${pttRecordingSec}s)`
                      : t(locale, 'ui.speakShortBtn')}
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
                      submitLiveUserUtterance(textToSend, { inputMode: 'typed' });
                      setInputText('');
                    } else {
                      void submitStudentTurn({ text: textToSend, inputMode: 'typed' });
                    }
                  }
                }}
                placeholder={t(locale, 'ui.typeMsgPlaceholder')}
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
                    submitLiveUserUtterance(textToSend, { inputMode: 'typed' });
                    setInputText('');
                  } else {
                    void submitStudentTurn({ text: textToSend, inputMode: 'typed' });
                  }
                }}
                className="px-4 py-2 rounded-full bg-[#1C1611] hover:bg-[#332920] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all disabled:opacity-30"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>{isAnalyzingTurn ? '...' : t(locale, 'ui.sendShortBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAVIGASI BAWAH MOBILE KHAS FIEZEL (Nonaktif pada mode tunggal Mitra Kaiwa) */}
      <nav
        aria-label="Primary navigation"
        aria-hidden="true"
        style={{ display: 'none' }}
        className="hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFF9EE] sm:bg-[#FFF9EE]/95 sm:backdrop-blur-xl border-t border-[#F0E4CF] px-4 py-2 sm:hidden"
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
            <span>{t(locale, 'ui.homeTab')}</span>
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
            <span>{t(locale, 'ui.voiceTab')}</span>
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 sm:bg-black/60 sm:backdrop-blur-xs transition-opacity"
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
                  <span>{t(locale, 'ui.choosePersonaTitle')}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#1C1611] text-white font-bold">
                    {targetLang.toUpperCase()}
                  </span>
                </h3>
                <p className="text-xs text-[#6E5E47] mt-0.5">
                  {t(locale, 'ui.choosePersonaSub')}
                </p>
              </div>
              <button
                type="button"
                data-testid="close-persona-modal-btn"
                onClick={() => setShowPersonaModal(false)}
                className="w-8 h-8 rounded-full bg-[#EAE0CE] hover:bg-[#DDD0BC] text-[#5C4E3C] flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                aria-label={t(locale, 'ui.close')}
              >
                ✕
              </button>
            </div>

            {/* Bagian 1: Karakter & Persona (Grid 2 Kolom) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#5C4E3C] uppercase tracking-wider">
                <span>{t(locale, 'ui.availableMentors')}</span>
                <span className="text-[11px] font-normal normal-case text-[#8C7A65]">
                  {t(locale, 'ui.tapToSwitch')}
                </span>
              </div>

              {targetLang === 'ja' && VOICE_PERSONAS.ssw_sensei && (
                <button
                  type="button"
                  data-testid="ssw-sensei-spotlight-btn"
                  onClick={() => handleSelectPersona('ssw_sensei')}
                  className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    activePersona.id === 'ssw_sensei'
                      ? 'bg-[#FFF8EB] border-[#8C2233] shadow-sm'
                      : 'bg-gradient-to-r from-[#FFF8EB] to-white border-[#DECFAF] hover:border-[#8C2233]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#8C2233] text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
                      🍱
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs sm:text-sm text-[#1C1611]">
                          {locale === 'id'
                            ? 'SSW SENSEI - Mentor Pengolahan Makanan (Wakai Papa Pro)'
                            : 'SSW SENSEI - Food Processing Exam Mentor (Prometric)'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#8C2233] text-white text-[10px] font-extrabold">
                          OTAFF Ver 5.1 (Apr 2026)
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5C4E3C] truncate mt-0.5">
                        {locale === 'id'
                          ? '91 Hal PDF + 266 Kotoba + 58 Soal CBT + 86 Video Wakai Papa Pro (Bilingual ID + JP)'
                          : '91-Page OTAFF Official Guide + 266 Kotoba + 58 CBT Drills (EN / ID / JP)'}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#1C1611] text-white text-[11px] font-bold shrink-0">
                    {activePersona.id === 'ssw_sensei' ? `${t(locale, 'ui.activeTag')} ✓` : t(locale, 'ui.chooseBtn')}
                  </span>
                </button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.values(VOICE_PERSONAS)
                  .filter((p) => p.targetLang === targetLang && !(targetLang === 'ja' && p.id === 'ssw_sensei'))
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
                              {persona.id === 'ssw_sensei'
                                ? '🍱'
                                : persona.targetLang === 'ja'
                                ? persona.id === 'nanami'
                                  ? '🌸'
                                  : '⚡'
                                : persona.targetLang === 'zh'
                                ? '🐼'
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
                            {locale === 'th'
                              ? persona.personalityTagTh || persona.roleTh
                              : locale === 'id'
                              ? persona.personalityTagId || persona.roleId
                              : persona.accentLabel || persona.name}
                          </div>
                          <div className="text-[11px] text-[#5C4E3C] line-clamp-2 leading-snug">
                            {locale === 'th'
                              ? persona.roastStyleTh || persona.speakingStyle
                              : locale === 'id'
                              ? persona.roastStyleId || persona.speakingStyle
                              : persona.speakingStyle}
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
                <span>{t(locale, 'ui.scenarioTrackLabel')}</span>
                <span className="text-[11px] font-normal normal-case text-[#8C7A65]">
                  {scenariosForLang.length} {t(locale, 'ui.scenariosShort')}
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto overscroll-contain pr-1">
                {scenariosForLang.map((scen) => {
                  const isScenActive = activeScenario.id === scen.id;
                  const scenPersona = VOICE_PERSONAS[scen.personaId] || activePersona;
                  const scenMeta = scenarioMetaForLocale(locale, scen);
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
                          {scenMeta.title}
                        </div>
                        <div className="text-[10px] text-[#8C7A65] truncate">
                          {formatPersonaShortName(scenPersona.name)} · {formatCleanLevel(scen.level)}
                        </div>
                      </div>
                      {isScenActive && (
                        <span className="text-xs text-[#10B981] font-bold shrink-0">✓ {t(locale, 'ui.activeTag')}</span>
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
                {`${t(locale, 'ui.startTalkWith')} ${formatPersonaShortName(activePersona.name)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Kartu Latihan Tulis Interaktif (Warm Paper & Tactile Flashcard + Braincore BKT) */}
      {learningWorkbench && !isMeasureMode && (
        <WhiteboardErrorBoundary
          locale={locale}
          onClose={() => {
            workbenchSessionRef.current.dismissedByUser = true;
            isWorkbenchOpenRef.current = false;
            isWorkbenchExplanationActiveRef.current = false;
            setLearningWorkbench(null);
          }}
        >
        <InCallLearningWorkbenchModal
          isOpen={learningWorkbench.isOpen}
          onClose={() => {
            workbenchSessionRef.current.dismissedByUser = true;
            isWorkbenchOpenRef.current = false;
            isWorkbenchExplanationActiveRef.current = false;
            setLearningWorkbench(null);
          }}
          onResumeConversation={(completedSentence, finishedTopic) => {
            const quizSent =
              completedSentence || workbenchSessionRef.current.completedQuizSentence || '';
            workbenchSessionRef.current.dismissedByUser = true;
            workbenchSessionRef.current.completedQuizSentence = '';
            isWorkbenchOpenRef.current = false;
            isWorkbenchExplanationActiveRef.current = false;
            speakTokenRef.current += 1;
            interruptAiAndStartListening();
            setLearningWorkbench(null);

            const isSswResume =
              activePersona.id === 'ssw_sensei' ||
              activeScenario.personaId === 'ssw_sensei' ||
              activeScenario.id.startsWith('scen_ssw_');

            if (isSswResume && /^Sensei,/i.test(quizSent.trim())) {
              if (
                isLiveConnectedRef.current &&
                wsRef.current &&
                wsRef.current.readyState === WebSocket.OPEN
              ) {
                submitLiveUserUtterance(quizSent, { inputMode: 'quick_chip' });
              } else {
                void submitStudentTurn({ text: quizSent, inputMode: 'quick_chip' });
              }
              return;
            }

            if (
              isLiveConnectedRef.current &&
              wsRef.current &&
              wsRef.current.readyState === WebSocket.OPEN
            ) {
              if (isSswResume) {
                const instrLang = locale === 'id' ? 'Bahasa Indonesia' : (locale === 'th' ? 'Thai' : 'English');
                const sswResumeCue = quizSent
                  ? `[System Note: Learner just completed the SSW Tactical Board quick exercise ("${finishedTopic || 'SSW'}") with answer "${quizSent}". Continue SSW coaching concisely in ${instrLang} and ask if they are ready for the next step.]`
                  : `[System Note: Learner just closed the SSW Tactical Board ("${finishedTopic || 'SSW'}"). Continue SSW coaching clearly in ${instrLang} on the active step and ask a brief comprehension check.]`;
                try {
                  wsRef.current.send(
                    JSON.stringify({
                      clientContent: {
                        turns: [{ role: 'user', parts: [{ text: sswResumeCue }] }],
                        turnComplete: true,
                      },
                    })
                  );
                } catch {
                  // Ignore
                }
                return;
              }
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
              const followUpLine = isSswResume
                ? 'Mantap! Poin itu sudah masuk catatan SSW. Mau lanjut kupas langkah berikutnya di halaman ini?'
                : activeScenario.targetLang === 'ja'
                  ? 'いい感じだね！じゃあ今の形を使って、日本語でもう一言話してみよう！'
                  : activeScenario.targetLang === 'zh'
                    ? '太棒了！现在用刚才那个句型，跟我用中文聊一句吧！'
                    : "Nice work locking that down! Now let's jump right back into English, hit me with your own sentence!";
              const followUpTransId = isSswResume
                ? 'Mantap! Poin itu sudah masuk catatan SSW. Mau lanjut kupas langkah berikutnya?'
                : 'Mantap sudah paham! Sekarang ayo balik ngobrol pakai bahasa target, coba buat satu kalimatmu sendiri!';
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
                spokenLang: isSswResume ? 'id' : activeScenario.targetLang,
              });
            }
          }}
          locale={locale}
          onChangeLocale={handleSelectLocale}
          targetLang={activeScenario.targetLang}
          scenario={activeScenario}
          persona={activePersona}
          isLiveConnected={isLiveConnected}
          callDurationSec={callDurationSec}
          isPlayingPreview={isPlayingAiAudio}
          isGeneratingTopic={isGeneratingWorkbench}
          uiAction={learningWorkbench.uiAction}
          topicTitle={learningWorkbench.topicTitle}
          focusType={learningWorkbench.focusType}
          explanationText={learningWorkbench.explanationText}
          patternFormula={learningWorkbench.patternFormula}
          drillInstruction={learningWorkbench.drillInstruction}
          sampleTarget={learningWorkbench.sampleTarget}
          forcedExerciseMode={learningWorkbench.preferredExerciseMode}
          externalQuizSeed={learningWorkbench.quizSeed}
          openNonce={learningWorkbench.openNonce}
          topMisconceptionId={
            Object.values(brainState.misconceptionLedger).find((m) => !m.resolved)?.misconceptionId ||
            null
          }
          latestPteDiagnostic={latestPteDiagnostic}
          latestReadAloudAlignment={latestReadAloudAlignment}
          onActiveBoardSync={syncWorkbenchToLiveAi}
          onWhiteboardBraincoreEvent={(evt) => {
            const compId = activeScenario.competencyId || `${activeScenario.targetLang}_wb_topic`;
            const isConfused = evt.kind === 'circle_ask_confusion';
            const outcome = recordSpeakingAttempt(brainStateRef.current, {
              competencyId: compId,
              scenarioId: activeScenario.id,
              targetLang: activeScenario.targetLang,
              userExactTranscript: String(evt.targetText || evt.topicTitle || '').slice(0, 120),
              ok: !isConfused && evt.isCorrect !== false,
              grammarScore: isConfused ? 62 : 84,
              fluencyScore: isConfused ? 70 : 85,
              vocabUsageScore: isConfused ? 68 : 86,
              accuracyScore: isConfused ? 64 : 85,
              misconceptionId: isConfused ? evt.misconceptionId || 'wb_concept_clarification' : null,
              correctionPattern: null,
              hintsUsed: isConfused ? 1 : 0,
              confidence: isConfused ? 0.55 : 0.72,
              measureMode: false,
            });
            brainStateRef.current = outcome.nextState;
            setBrainState(outcome.nextState);
            void brainSyncFlush(outcome.nextState).then(({ nextState }) => {
              brainStateRef.current = nextState;
              setBrainState(nextState);
            });
          }}
          latestAiSubtitle={turns.filter((t) => t.speaker === 'ai').slice(-1)[0]?.text || ''}
          currentMasteryPct={Math.round(
            ((brainState.competencies[activeScenario.competencyId]?.pMasteryDecayed ??
              brainState.competencies[activeScenario.competencyId]?.pMastery ??
              0.35) || 0.35) * 100
          )}
          onStopMainAudio={() => {
            interruptAiAndStartListening();
          }}
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
          onRequestCustomTopic={(customQuestion, bankTopicId, followUpContext) => {
            interruptAiAndStartListening();
            const reqSeq = ++workbenchSessionRef.current.turnSeq;
            workbenchSessionRef.current.dismissedByUser = false;
            const isFollowUpOnOpenBoard = Boolean(
              learningWorkbench?.isOpen && bankTopicId === 'custom_dynamic'
            );
            if (bankTopicId === 'custom_dynamic') {
              setIsAnalyzingTurn(true);
              setIsGeneratingWorkbench(true);
            }
            if (!isFollowUpOnOpenBoard) {
              openLearningWorkbenchWithAction(
                {
                  actionType: 'open_learning_popup',
                  topicTitle: customQuestion,
                  bankTopicId,
                },
                customQuestion
              );
            }
            if (bankTopicId === 'custom_dynamic') {
              void (async () => {
                try {
                  const activeLoc = brainStateRef.current.learnerLocale || locale;
                  const liveWb = await requestRealtimeWhiteboardStream({
                    question: customQuestion,
                    personaId: activePersona.id,
                    personaName: activePersona.name,
                    scenarioId: activeScenario.id,
                    scenarioTitle: activeScenario.titleId,
                    targetLang: activeScenario.targetLang,
                    locale: activeLoc,
                    history: turnsRef.current
                      .slice(-4)
                      .map((t) => ({ speaker: t.speaker, text: t.text })),
                    learnerDossier: safeBuildDossier(brainStateRef.current, activeScenario, activeLoc),
                    boardContext: followUpContext,
                    onOpenerReady: (opener) => {
                      const firstChunk = extractOpenerFirstTtsChunk(opener);
                      if (
                        firstChunk &&
                        reqSeq === workbenchSessionRef.current.turnSeq &&
                        !workbenchSessionRef.current.dismissedByUser
                      ) {
                        void synthesizeFlexibleTts({
                          text: firstChunk,
                          targetLang: activeLoc,
                          persona: activePersona,
                        }).catch(() => null);
                      }
                    },
                  });
                  if (
                    reqSeq === workbenchSessionRef.current.turnSeq &&
                    !workbenchSessionRef.current.dismissedByUser
                  ) {
                    if (liveWb?.uiAction?.actionType === 'open_learning_popup') {
                      openLearningWorkbenchWithAction(liveWb.uiAction, customQuestion);
                    } else if (!followUpContext?.areaExcerpt) {
                      openLearningWorkbenchWithAction(
                        {
                          actionType: 'open_learning_popup',
                          topicTitle: customQuestion,
                          bankTopicId,
                        },
                        customQuestion
                      );
                    }
                  }
                } catch {
                  if (
                    reqSeq === workbenchSessionRef.current.turnSeq &&
                    !workbenchSessionRef.current.dismissedByUser &&
                    isFollowUpOnOpenBoard &&
                    !followUpContext?.areaExcerpt
                  ) {
                    openLearningWorkbenchWithAction(
                      {
                        actionType: 'open_learning_popup',
                        topicTitle: customQuestion,
                        bankTopicId,
                      },
                      customQuestion
                    );
                  }
                } finally {
                  if (reqSeq === workbenchSessionRef.current.turnSeq) {
                    setIsAnalyzingTurn(false);
                    setIsGeneratingWorkbench(false);
                  }
                }
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
              submitLiveUserUtterance(writtenSentence, { inputMode: 'typed' });
            } else {
              void submitStudentTurn({ text: writtenSentence, inputMode: 'typed' });
            }
          }}
          onNavigateModule={(dest) => {
            setLearningWorkbench(null);
            handleVoiceNavigateApp(dest, 'workbench_open_full_module');
          }}
        />
        </WhiteboardErrorBoundary>
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
                {targetLang === 'ja' ? t(locale, 'ui.speakPartnerBrandJA') : t(locale, 'ui.speakPartnerBrand')}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5C4E3C]">
                {t(locale, 'ui.gemModalFeatureDesc')}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCallConfirmModal(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] font-bold text-xs cursor-pointer transition-colors"
              >
                {t(locale, 'ui.cancelBtn')}
              </button>
              <button
                type="button"
                onClick={handleConfirmStartCall}
                className="flex-1 py-3 px-4 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-xs shadow-md shadow-amber-500/25 cursor-pointer transition-all active:scale-[0.98]"
              >
                {t(locale, 'ui.connectBtn')}
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
                {t(locale, 'ui.notEnoughGemsTitle')}
              </h3>
              <div className="mt-2 text-xs leading-relaxed text-[#5C4E3C]">
                {locale === 'th' ? (
                  <>
                    คุณต้องมีอย่างน้อย <strong>{KAWAN_BICARA_MIN_START_GEMS} Gem</strong> สำหรับเสียงตอบแรกของ {t(locale, 'ui.speakPartnerBrand')} (ยอดปัจจุบัน: {insufficientGemModal.balance} 💎)
                    <br /><br />
                    ทำแบบฝึกหัดในควิซเพื่อสะสม Gem หรือรอรีเซ็ตสิทธิ์ฟรีรายวันในวันพรุ่งนี้!
                  </>
                ) : locale === 'id' ? (
                  <>
                    Kamu membutuhkan minimal <strong>{KAWAN_BICARA_MIN_START_GEMS} Gem</strong> untuk respon suara pertama Kawan Bicara (Saldo saat ini: {insufficientGemModal.balance} 💎).
                    <br /><br />
                    Selesaikan latihan soal di kuis untuk mengumpulkan Gem gratis atau tunggu kuota gratis harian besok!
                  </>
                ) : (
                  <>
                    You need at least <strong>{KAWAN_BICARA_MIN_START_GEMS} Gems</strong> for the first {t(locale, 'ui.speakPartnerBrand')} voice reply (Current balance: {insufficientGemModal.balance} 💎).
                    <br /><br />
                    Complete quiz exercises to collect free Gems or wait for tomorrow&apos;s daily free allowance!
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
                {t(locale, 'ui.understoodBtn')}
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
            <span>{t(locale, 'ui.connectLiveNow')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
