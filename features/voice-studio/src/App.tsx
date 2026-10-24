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
  ShieldCheck,
  SlidersHorizontal,
  ArrowLeft,
  X,
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
  getBeginnerReplyCards,
  translateAndPhoneticizeLiveText,
} from './lib/liveCallHelper';
import { JapaneseRubyDisplay } from './components/JapaneseRubyDisplay';
import { stripEmojisAndEmotWords, toPhoneticRomaji } from './lib/japanesePhonetics';
import {
  evaluateTurnLocal,
  evaluateUtteranceClientSide,
  float32ToPcm16Base64,
  resampleAndConvertToPcm16Base64,
  LiveTransportMode,
  pcm16Base64ToAudioBuffer,
  reportGeminiLiveSessionDrop,
  requestGeminiLiveSessionToken,
  resolveAiReply,
  resolveLiveCallWebSocketUrls,
  splitIntoSpeechChunks,
  synthesizeFlexibleTts,
  warmUpVoiceServices,
} from './lib/liveTransport';

// 44-byte silent WAV used to "unlock" one persistent <audio> element inside a user tap.
// iOS Safari / Android WebView only allow later programmatic play() on an element that
// was started during a gesture; replies arrive seconds after the tap (hands-free STT).
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

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
  const [activeScenarioId, setActiveScenarioId] = useState<string>(() => {
    const initialLang = loadBraincoreState().targetLang || 'en';
    const freeScenario = CALL_SCENARIOS.find((s) => s.targetLang === initialLang && s.id.includes('free'));
    if (freeScenario) return freeScenario.id;
    const firstForLang = CALL_SCENARIOS.find((s) => s.targetLang === initialLang);
    return firstForLang ? firstForLang.id : 'scen_en_free_talk';
  });
  const [customMeasureOverride, setCustomMeasureOverride] = useState<boolean | null>(null);

  const [turns, setTurns] = useState<CallTurn[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isAnalyzingTurn, setIsAnalyzingTurn] = useState<boolean>(false);
  // m025-637: true while the REAL AI partner is generating its reply (Mochi "thinking").
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isPlayingAiAudio, setIsPlayingAiAudio] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState<1.0 | 0.8>(1.0);
  const [showTranslations, setShowTranslations] = useState<boolean>(true);
  const [pttRecordingSec, setPttRecordingSec] = useState<number>(0);
  const [nextSuggestedReplies, setNextSuggestedReplies] = useState<
    Array<{
      text: string;
      hintId: string;
      hintTh: string;
      pronunciation?: string;
      tier?: 'easy' | 'mission' | 'rescue';
      badgeId?: string;
      badgeTh?: string;
    }>
  >([]);
  const [isRefreshingAssist, setIsRefreshingAssist] = useState<boolean>(false);

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

  const wsRef = useRef<WebSocket | null>(null);
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
  const [is3dMochiReady, setIs3dMochiReady] = useState<boolean>(false);

  // Gemini Live multi-key pool & mid-call auto-failover bookkeeping
  const liveUserDraftRef = useRef<string>('');
  const liveAiDraftRef = useRef<string>('');
  const isLiveConnectedRef = useRef<boolean>(false);
  const userHungUpRef = useRef<boolean>(false);
  const currentLiveSessionRef = useRef<{ token?: string; keyIndex?: number; totalKeys?: number } | null>(null);
  const liveReconnectAttemptsRef = useRef<number>(0);
  const turnsRef = useRef(turns);
  turnsRef.current = turns;
  const brainStateRef = useRef(brainState);
  brainStateRef.current = brainState;

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
        if (!outputAudioCtxRef.current || outputAudioCtxRef.current.state === 'closed') {
          outputAudioCtxRef.current = new AudioCtx({ sampleRate: 24000 });
          nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
        }
        if (outputAudioCtxRef.current.state === 'suspended') {
          void outputAudioCtxRef.current.resume().catch(() => {});
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
  const activePersona =
    VOICE_PERSONAS[activeScenario.personaId] || VOICE_PERSONAS.coach_alex;

  // Pre-render the scenario's opening line so the call starts speaking with zero lag
  // without sending concurrent TTS requests that queue on Render's single worker.
  useEffect(() => {
    if (!activeScenario.openingLine) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        await synthesizeFlexibleTts({
          text: activeScenario.openingLine,
          targetLang: activeScenario.targetLang,
          persona: activePersona,
        });
      })();
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [activeScenario.id]);

  const isMeasureMode =
    customMeasureOverride !== null ? customMeasureOverride : activeScenario.isMeasureExam;

  const prereqStatus = checkPrerequisiteStatus(brainState, activeScenario.prereqCompetencyId);
  const activeCompRecord = brainState.competencies[activeScenario.competencyId];
  const currentMasteryP = activeCompRecord?.pMasteryDecayed ?? activeCompRecord?.pMastery ?? 0.25;

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setBrainState(loadBraincoreState());
      }
    };
    const handleOnline = () => {
      setBrainState((prev) => {
        void brainSyncFlush(prev).then(({ nextState }) => setBrainState(nextState));
        return prev;
      });
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    setShowHint(false);
    setCustomMeasureOverride(null);
    setStatusBanner(null);
    setNextSuggestedReplies([]);
    setTurns([
      {
        id: `turn_open_${activeScenario.id}`,
        speaker: 'ai',
        text: activeScenario.openingLine,
        translationId: activeScenario.openingTranslationId,
        translationTh: activeScenario.openingTranslationTh,
        timestamp: Date.now(),
      },
    ]);
    try {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    } catch {
      // Ignore
    }
  }, [activeScenario.id]);

  useEffect(() => {
    if (activeTab === 'call' && turns.length > 1) {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({
          top: mainScrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [turns.length, isAnalyzingTurn, activeTab]);

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
      stopLiveCall();
    };
  }, []);

  const handleResetCallSession = () => {
    playFiezelSfx('button_tap');
    stopLiveCall();
    setStatusBanner(null);
    setInputText('');
    setNextSuggestedReplies([]);
    setTurns([
      {
        id: `turn_open_${activeScenario.id}_${Date.now()}`,
        speaker: 'ai',
        text: activeScenario.openingLine,
        translationId: activeScenario.openingTranslationId,
        translationTh: activeScenario.openingTranslationTh,
        timestamp: Date.now(),
      },
    ]);
    void speakAiText(activeScenario.openingLine);
  };

  const handleSelectTargetLang = (lang: TargetLang) => {
    playFiezelSfx('button_tap');
    stopLiveCall();
    const firstScenario =
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
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await synthesizeFlexibleTts({
        text,
        targetLang: activeScenario.targetLang,
        persona: activePersona,
        force: attempt > 0,
      });
      if (res?.audioBase64) return res;
      if (attempt < 2) await new Promise((r) => window.setTimeout(r, 350 * (attempt + 1)));
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
      src.connect(ctx.destination);
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
    overrideRate?: number
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
    setIsPlayingAiAudio(true);

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
        setIsPlayingAiAudio(false);
      }
    }
  };

  /**
   * Deteksi kalimat yang belum lengkap (koma gramatikal, konjungsi, preposisi, kata ganti, partikel)
   * agar VAD memberikan jeda berpikir lebih panjang (3000ms vs 2000ms baseline) tanpa memotong murid.
   */
  const isGrammaticallyIncomplete = (t: string, lang: TargetLang): boolean => {
    const lower = t.toLowerCase().trim();
    if (!lower) return false;
    if (lang === 'en') {
      return /\b(and|or|but|because|so|if|as|with|to|for|in|on|at|of|from|by|about|a|an|the|i|you|we|they|he|she|it|my|your|our|their|is|are|was|were|have|has|had|do|did|does|can|could|will|would|like|want|would like|could i|can i|give me|i'd|i'm|we're|there's|that's|what|where|when|why|how)\s*$/i.test(lower);
    }
    return /[\u306f\u304c\u3092\u306b\u3078\u3067\u3068\u304b\u3089\u307e\u3067\u3088\u308a\u306e\u304b\u306d\u3088\u3051\u3069\u306e\u3067\u3066\u3067]\s*$/.test(lower);
  };

  /**
   * Instant Barge-In (Menyela AI seperti di ChatGPT Voice).
   * Memotong seketika audio balasan Mochi dan mengembalikan kendali mic ke murid.
   */
  const interruptAiAndStartListening = () => {
    speakTokenRef.current += 1;
    clearSpeechWatchdog();
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
    setIsPlayingAiAudio(false);
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
      setTurns((prev) => [...prev, userTurn]);
      setInputText('');
      setLiveUserDraft('');
      setShowHint(false);
      void brainSyncFlush(attemptOutcome.nextState).then(({ nextState }) =>
        setBrainState(nextState)
      );

      // STEP 2 — the REAL AI partner reply (never a silent template swap).
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
            setNextSuggestedReplies(suggestions);
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
        setNextSuggestedReplies(replyEv.nextSuggestedReplies);
      } else if (!textAlreadyShown) {
        setNextSuggestedReplies([]);
      }

      const aiAudioBase64 = replyEv.audioBase64 || null;
      void speakAiText(replyEv.aiReply, aiAudioBase64);
    } catch (err) {
      setStatusBanner((err as Error).message || 'Kesalahan jaringan.');
    } finally {
      isAiThinkingRef.current = false;
      setIsAiThinking(false);
      setIsAnalyzingTurn(false);
    }
  };

  const submitStudentTurnRef = useRef(submitStudentTurn);
  submitStudentTurnRef.current = submitStudentTurn;

  // Hands-free Continuous Voice Recognition for "Telepon Live" (turn-by-turn-fallback)
  useEffect(() => {
    const shouldListenHandsFree =
      isLiveConnected &&
      liveTransportMode === 'turn-by-turn-fallback' &&
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
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setStatusBanner(
        locale === 'th'
          ? 'เบราว์เซอร์นี้ไม่รองรับการรู้จำเสียง ใช้ Chrome หรือพิมพ์ประโยคด้านล่าง'
          : 'Peramban ini belum mendukung pengenalan suara. Pakai Chrome, atau ketik kalimatmu di kolom bawah — AI tetap menjawab dengan suara.'
      );
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

            if (liveSilenceTimerRef.current) {
              window.clearTimeout(liveSilenceTimerRef.current);
            }
            const silenceWaitMs = isGrammaticallyIncomplete(clean, activeScenario.targetLang) ? 2400 : 1800;
            setIsWaitingAfterSpeech(true);
            liveSilenceTimerRef.current = window.setTimeout(() => {
              if (isDisposed) return;
              liveSilenceTimerRef.current = null;
              setIsWaitingAfterSpeech(false);
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
                void submitStudentTurnRef.current({
                  text: toSend,
                  speakingDurationSec: 3,
                });
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
            setStatusBanner(
              locale === 'th'
                ? 'ไมโครโฟนถูกบล็อก อนุญาตไมโครโฟนในแถบที่อยู่ หรือพิมพ์ประโยคด้านล่าง'
                : 'Mikrofon diblokir peramban. Izinkan mikrofon di bilah alamat, lalu nyalakan lagi mic — atau ketik kalimatmu di bawah.'
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
          // Anti-Cutoff: If the silence patience timer is still ticking, the user paused to think or breathe.
          // Chrome often closes interim recognition prematurely. DO NOT force-submit partial speech!
          // Save what was heard into speechPrefix and restart recognition seamlessly so the next words append.
          if (liveSilenceTimerRef.current) {
            if (accumulatedSpeech) {
              speechPrefix = accumulatedSpeech;
            }
            window.setTimeout(() => {
              if (!isDisposed && liveSilenceTimerRef.current) {
                startListeningCycle();
              }
            }, 60);
            return;
          }
          setIsWaitingAfterSpeech(false);
          const pending = accumulatedSpeech.trim();
          if (pending) {
            accumulatedSpeech = '';
            speechPrefix = '';
            liveDictatedTextRef.current = '';
            setIsListeningLiveSpeech(false);
            void submitStudentTurnRef.current({
              text: pending,
              speakingDurationSec: 3,
            });
            return;
          }
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
    };
  }, [
    isLiveConnected,
    liveTransportMode,
    isPlayingAiAudio,
    isAnalyzingTurn,
    isMicMuted,
    isRecordingPtt,
    activeScenario.targetLang,
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
            const pttSilenceWaitMs = isGrammaticallyIncomplete(clean, activeScenario.targetLang) ? 2400 : 1800;
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

  const startLiveCall = async () => {
    if (isLiveConnected || isLiveConnecting) return;
    primeAudioPlayback();

    // 1. Prime Output AudioContext (24kHz for Gemini Live) directly in user gesture
    try {
      const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!outputAudioCtxRef.current || outputAudioCtxRef.current.state === 'closed') {
        const outputCtx = new CtxClass({ sampleRate: 24000 });
        outputAudioCtxRef.current = outputCtx;
        nextStartTimeRef.current = outputCtx.currentTime;
      }
      if (outputAudioCtxRef.current && outputAudioCtxRef.current.state === 'suspended') {
        void outputAudioCtxRef.current.resume().catch(() => {});
      }
    } catch {
      // AudioContext fallback
    }

    // 2. Prime Microphone input stream directly in user gesture
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        micStreamRef.current = stream;

        const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!inputAudioCtxRef.current || inputAudioCtxRef.current.state === 'closed') {
          inputAudioCtxRef.current = new CtxClass();
        }
        const inputCtx = inputAudioCtxRef.current;
        if (inputCtx.state === 'suspended') {
          void inputCtx.resume().catch(() => {});
        }

        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (isMicMutedRef.current) return;
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && isLiveConnectedRef.current) {
            const pcmBase64 = resampleAndConvertToPcm16Base64(
              e.inputBuffer.getChannelData(0),
              inputCtx.sampleRate || 48000,
              16000
            );
            wsRef.current.send(
              JSON.stringify({
                realtimeInput: {
                  mediaChunks: [
                    {
                      mimeType: 'audio/pcm;rate=16000',
                      data: pcmBase64,
                    },
                  ],
                },
              })
            );
          }
        };

        const muteGain = inputCtx.createGain();
        muteGain.gain.value = 0;
        source.connect(processor);
        processor.connect(muteGain);
        muteGain.connect(inputCtx.destination);
      } catch (err) {
        console.warn('Microphone permission or stream error:', err);
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
          targetWsUrl = candidateUrls[0];
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
            const contextSummary =
              turnsRef.current.length > 0
                ? `\nRecent conversation turns so far:\n${turnsRef.current
                    .slice(-4)
                    .map((t) => `${t.speaker === 'user' ? 'Learner' : activePersona.name}: "${t.text}"`)
                    .join('\n')}`
                : '';

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
                  systemInstruction: {
                    parts: [
                      {
                        text: `${activePersona.systemPrompt || ''}\n\n[Scenario]: ${activeScenario.titleId} (${activeScenario.targetLang === 'ja' ? 'Japanese' : 'English'}). ${activeScenario.descriptionId}. Opening situation: "${activeScenario.openingLine}". Speak naturally, warmly, and concisely (1-2 sentences per turn) as ${activePersona.name}. Keep in character.${contextSummary}`,
                      },
                    ],
                  },
                  inputAudioTranscription: {},
                  outputAudioTranscription: {},
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

            // Resume Audio Contexts if suspended
            if (outputAudioCtxRef.current && outputAudioCtxRef.current.state === 'suspended') {
              void outputAudioCtxRef.current.resume().catch(() => {});
            }
            if (inputAudioCtxRef.current && inputAudioCtxRef.current.state === 'suspended') {
              void inputAudioCtxRef.current.resume().catch(() => {});
            }

            // If brand new call, prompt AI to speak opening greeting immediately in Gemini Live voice
            const hasUserSpoken = turnsRef.current.some((t) => t.speaker === 'user');
            if (!isReconnect && !hasUserSpoken && isGoogleLive) {
              try {
                ws.send(
                  JSON.stringify({
                    clientContent: {
                      turns: [
                        {
                          role: 'user',
                          parts: [
                            {
                              text: `[Instruction: Please begin our conversation now by greeting me warmly as ${activePersona.name} in scenario "${activeScenario.titleId}". Say your opening line: "${activeScenario.openingLine}"]`,
                            },
                          ],
                        },
                      ],
                      turnComplete: true,
                    },
                  })
                );
              } catch {
                // Ignore
              }
            }
          }

          // Audio Extraction from Gemini Live or custom proxy
          let incomingAudioBase64: string | null = null;
          if (msg.type === 'audio' && msg.audio) {
            incomingAudioBase64 = msg.audio;
          } else if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part?.inlineData?.data) {
                incomingAudioBase64 = part.inlineData.data;
              }
              if (part?.text) {
                liveAiDraftRef.current += part.text;
                setLiveAiDraft(liveAiDraftRef.current);
              }
            }
          }

          if (incomingAudioBase64 && outputAudioCtxRef.current) {
            const ctx = outputAudioCtxRef.current;
            const buffer = pcm16Base64ToAudioBuffer(ctx, incomingAudioBase64, 24000);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);

            const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current);
            source.start(startAt);
            nextStartTimeRef.current = startAt + buffer.duration;
            activeSourcesRef.current.push(source);
            setIsPlayingAiAudio(true);
            source.onended = () => {
              activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
              if (activeSourcesRef.current.length === 0) {
                setIsPlayingAiAudio(false);
              }
            };
          }

          // Barge-in interruption from server
          if (msg.serverContent?.interrupted || msg.type === 'interrupted') {
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
            setIsPlayingAiAudio(false);
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

          // Turn Complete — evaluate learner utterance and record Braincore mastery
          const isGoogleTurnComplete = Boolean(msg.serverContent?.turnComplete);
          if (isGoogleTurnComplete || msg.type === 'turn_complete') {
            const uText = (liveUserDraftRef.current || msg.userTranscript || '').trim();
            const aText = (liveAiDraftRef.current || msg.aiTranscript || '').trim();
            liveUserDraftRef.current = '';
            liveAiDraftRef.current = '';
            setLiveUserDraft('');
            setLiveAiDraft('');

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
              const autoTrans = translateAndPhoneticizeLiveText(
                aText,
                activeScenario.targetLang,
                msg.aiTranslationId,
                msg.aiTranslationTh
              );
              setTurns((prev) => [
                ...prev,
                {
                  id: `live_ai_${Date.now() + 1}`,
                  speaker: 'ai',
                  text: aText,
                  translationId: autoTrans.translationId,
                  translationTh: autoTrans.translationTh,
                  audioBase64: msg.aiAudioBase64 || undefined,
                  timestamp: Date.now() + 1,
                },
              ]);
              const suggestions = getBeginnerReplyCards(
                activeScenario,
                activeScenario.targetLang,
                aText
              );
              setNextSuggestedReplies(suggestions);
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
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((tr) => tr.stop());
      micStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      void inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      void outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
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
    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // Ignore
      }
      micStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {
        // Ignore
      }
      scriptProcessorRef.current = null;
    }
    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      try {
        void inputAudioCtxRef.current.close().catch(() => {});
      } catch {
        // Ignore
      }
      inputAudioCtxRef.current = null;
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

  const toggleMuteMic = () => {
    playFiezelSfx('button_tap');
    const next = !isMicMuted;
    setIsMicMuted(next);
    isMicMutedRef.current = next;
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
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
        const inst = new MochiCtor(mochiContainerRef.current, {
          mood: 'dots',
          badge: 'chat_purple',
          aura: 'purple',
          showHands: true,
          showEars: true,
          showTail: false,
          width: 156,
          height: 148,
        });
        mochiInstanceRef.current = inst;
        setIs3dMochiReady(true);
        inst.triggerEarWiggle?.(1.3);
      } catch {
        setIs3dMochiReady(false);
      }
    };

    void init3dMochi();

    return () => {
      cancelled = true;
      if (mochiInstanceRef.current) {
        try {
          mochiInstanceRef.current.destroy?.();
        } catch {
          // Ignore
        }
        mochiInstanceRef.current = null;
      }
      setIs3dMochiReady(false);
    };
  }, [activeTab, prereqStatus.isReady]);

  // Synchronize 3D Mochi Mascot expressions, aura & gestures with live call state
  useEffect(() => {
    const m = mochiInstanceRef.current;
    if (!m) return;
    try {
      if (isAiThinking && callStateKey !== 'speaking') {
        // m025-637: visible "listening / thinking" while the real AI composes its reply.
        m.setMood?.('dots');
        m.setBadge?.('chat_blue');
        m.setAura?.('blue');
        m.retractHands?.();
        m.triggerEarWiggle?.(1.1);
      } else if (callStateKey === 'speaking') {
        m.setMood?.('happy');
        m.setBadge?.('chat_purple');
        m.setAura?.('purple');
        m.triggerHop?.(0.26);
        m.triggerHandGesture?.('wave', 1.4);
        m.triggerEarWiggle?.(1.3);
      } else if (callStateKey === 'recording') {
        m.setMood?.('dots');
        m.setBadge?.('chat_purple');
        m.setAura?.('purple');
        m.triggerEarWiggle?.(1.2);
      } else if (callStateKey === 'waiting') {
        m.setMood?.('dots');
        m.setBadge?.('chat_blue');
        m.setAura?.('blue');
        m.triggerEarWiggle?.(1.1);
        m.retractHands?.();
      } else if (callStateKey === 'live') {
        m.setMood?.('dots');
        m.setBadge?.('chat_purple');
        m.setAura?.('purple');
        m.retractHands?.();
      } else {
        m.setMood?.('dots');
        m.setBadge?.('chat_purple');
        m.setAura?.('purple');
        m.setFx?.(null);
        m.retractHands?.();
      }
    } catch {
      // Ignore
    }
  }, [callStateKey, is3dMochiReady, isAiThinking]);

  const activeAiLiveText = liveAiDraft.trim() || lastAiTurn?.text || activeScenario.openingLine;
  const activeAiSubtitle = translateAndPhoneticizeLiveText(
    activeAiLiveText,
    activeScenario.targetLang,
    liveAiDraft.trim() ? undefined : lastAiTurn?.translationId || activeScenario.openingTranslationId,
    liveAiDraft.trim() ? undefined : lastAiTurn?.translationTh || activeScenario.openingTranslationTh
  );

  const activeUserLiveText = liveUserDraft.trim() || lastUserTurn?.text || '';
  const activeUserSubtitle = activeUserLiveText
    ? translateAndPhoneticizeLiveText(activeUserLiveText, activeScenario.targetLang)
    : null;

  const beginnerReplyCards = getBeginnerReplyCards(
    activeScenario.id,
    activeScenario.targetLang,
    nextSuggestedReplies,
    activeAiLiveText,
    lastUserTurn?.text || '',
    turns.map((tr) => ({ speaker: tr.speaker, text: tr.text }))
  );

  const handleRefreshLiveAssist = async () => {
    setIsRefreshingAssist(true);
    let updatedFromServer = false;
    try {
      const res = await fetch('/api/voice-call/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiQuestionText: activeAiLiveText,
          lastUserText: lastUserTurn?.text || '',
          scenarioId: activeScenario.id,
          targetLang: activeScenario.targetLang,
          conversationHistory: turns.slice(-6).map((tr) => ({
            speaker: tr.speaker,
            text: tr.text,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.suggestions) && data.suggestions.length > 0) {
          setNextSuggestedReplies(data.suggestions);
          updatedFromServer = true;
        }
      }
    } catch {
      // Uses deterministic contextual synthesizer fallback automatically
    } finally {
      if (!updatedFromServer) {
        const localFresh = getBeginnerReplyCards(
          activeScenario.id,
          activeScenario.targetLang,
          undefined,
          activeAiLiveText,
          lastUserTurn?.text || '',
          turns.map((tr) => ({ speaker: tr.speaker, text: tr.text }))
        );
        if (localFresh.length > 1) {
          const rotated = [...localFresh.slice(1), localFresh[0]].map((c, idx) => ({
            ...c,
            id: `${c.id}_r${Date.now()}_${idx}`,
          }));
          setNextSuggestedReplies(rotated);
        }
      }
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
                className="font-bold text-sm text-[#1C1611] truncate"
              >
                {targetLang === 'ja'
                  ? (locale === 'th' ? 'คู่สนทนาไควะ · สนทนาอิสระ' : 'Mitra Kaiwa · Free Talk')
                  : (locale === 'th' ? 'คู่สนทนา AI · สนทนาอิสระ' : 'Kawan Bicara · Free Talk')}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#EAE3D5] text-[#5C4E3C] font-semibold shrink-0 hidden sm:inline-block">
                {activePersona.name}
              </span>
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
              void speakAiText(sampleText);
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
                {/* 1. PANGGUNG UTAMA PANGGILAN SUARA (Terpusat, Lapang, Tanpa Kotak Dalam Kotak) */}
                <section
                  data-testid="ai-call-card"
                  data-call-state={callStateKey}
                  data-transport-mode={liveTransportMode}
                  className="bg-gradient-to-b from-[#FAF5EB] to-white rounded-3xl px-5 py-5 sm:px-8 sm:py-6 shadow-[0_4px_24px_rgba(28,22,17,0.04)] border border-black/[0.04] flex flex-col items-center text-center space-y-3.5 w-full"
                >
                  {/* Baris Meta Atas: Identitas Partner Satu Baris & Pill Mode */}
                  <div className="w-full flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-[#6E5E47] min-w-0">
                      <span className="font-bold text-[#1C1611] truncate">{activePersona.name}</span>
                      <span className="shrink-0">·</span>
                      <span className="shrink-0">{activeScenario.level}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCustomMeasureOverride(!isMeasureMode)}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer shrink-0 ${
                        isMeasureMode
                          ? 'bg-[#FDF2F4] text-[#8C2233]'
                          : 'bg-[#F5F1E8] text-[#5C4E3C] hover:text-[#1C1611]'
                      }`}
                    >
                      {isMeasureMode
                        ? locale === 'th'
                          ? 'โหมดสอบ'
                          : 'Mode Ujian'
                        : locale === 'th'
                          ? 'โหมดฝึกซ้อม'
                          : 'Mode Latihan'}
                    </button>
                  </div>

                  {/* Mascot 3D Mochi Terpusat + Pill Status Panggilan */}
                  <div className="flex flex-col items-center space-y-1.5">
                    <div
                      onClick={() => {
                        if (isPlayingAiAudio) {
                          interruptAiAndStartListening();
                          return;
                        }
                        const m = mochiInstanceRef.current;
                        if (m) {
                          try {
                            m.triggerHop?.(0.28);
                            m.triggerHandGesture?.('wave', 1.2);
                            m.triggerEarWiggle?.(1.3);
                          } catch {}
                        }
                      }}
                      title={isPlayingAiAudio ? 'Ketuk untuk menyela Mochi' : 'Mochi'}
                      className="relative w-[156px] h-[148px] flex items-center justify-center cursor-pointer select-none"
                    >
                      <div
                        ref={mochiContainerRef}
                        data-testid="mochi-3d-stage"
                        className="w-[156px] h-[148px] flex items-center justify-center"
                      />
                      <img
                        src={
                            isPlayingAiAudio
                              ? '/assets/brand/paw-mochi-speaking.svg'
                              : '/assets/brand/paw-mochi-idle.svg'
                          }
                        onError={(e) => {
                          const fallback = isPlayingAiAudio
                            ? './assets/brand/paw-mochi-speaking.svg'
                            : './assets/brand/paw-mochi-idle.svg';
                          if (e.currentTarget.getAttribute('src') !== fallback) {
                            e.currentTarget.setAttribute('src', fallback);
                          }
                        }}
                        alt="Mochi"
                        style={{ display: is3dMochiReady ? 'none' : 'block' }}
                        className="w-16 h-16 rounded-full object-contain p-1.5 bg-white shadow-2xs"
                      />
                    </div>

                    <div
                      key={callStateKey}
                      data-testid="ai-call-status-pill"
                      className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#F5F1E8] text-[11px] font-medium text-[#5C4E3C]"
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
                            ? `Mochi รอคุณพูดให้จบ… (${formatTimer(callDurationSec)})`
                            : `Mochi menunggu kamu selesai bicara… (${formatTimer(callDurationSec)})`
                          : isRecordingPtt
                            ? `Merekam suara... (${formatTimer(pttRecordingSec)})`
                            : isLiveConnected
                              ? isMicMuted
                                ? `Mic dibisukan · ${formatTimer(callDurationSec)}`
                                : `LIVE · ${formatTimer(callDurationSec)}`
                              : 'Siap bicara'}
                      </span>
                    </div>
                  </div>

                  {/* Subtitle Spotlight Terbuka (Tanpa Kotak Dalam Kotak) */}
                  <div
                    data-testid="live-translation-hud"
                    className="max-w-xl mx-auto space-y-1.5 px-1"
                  >
                    {isAiThinking ? (
                      <div
                        data-testid="live-hud-ai-thinking"
                        aria-live="polite"
                        className="flex items-center justify-center gap-1.5 py-1.5"
                      >
                        <span className="sr-only">
                          {locale === 'th' ? 'Mochi กำลังคิดคำตอบ' : 'Mochi sedang menyiapkan jawaban'}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-[#3296FF] animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 rounded-full bg-[#3296FF] animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 rounded-full bg-[#3296FF] animate-bounce" />
                      </div>
                    ) : (
                      <>
                        <div
                          data-testid="live-hud-ai-text"
                          data-reply-source={liveAiDraft.trim() ? 'live' : lastAiTurn?.replySource || 'script'}
                          className="space-y-1"
                        >
                          <JapaneseRubyDisplay
                            text={activeAiLiveText}
                            targetLang={activeScenario.targetLang}
                            showRomaji={!isMeasureMode}
                            className="text-base sm:text-lg font-semibold text-[#1C1611] leading-snug tracking-[-0.01em] break-words"
                            rubyClassName="text-base sm:text-lg"
                            romajiClassName="text-xs sm:text-sm text-[#8C6D1F] font-medium mt-0.5"
                          />
                        </div>

                        {!isMeasureMode && showTranslations && (
                          <p
                            data-testid="live-hud-ai-translation"
                            className="text-xs sm:text-sm text-[#6E5E47] leading-relaxed break-words"
                          >
                            {locale === 'th'
                              ? activeAiSubtitle.translationTh
                              : activeAiSubtitle.translationId}
                          </p>
                        )}

                        {!liveAiDraft.trim() && lastAiTurn?.replySource === 'offline-template' && (
                          <span
                            data-testid="live-hud-offline-label"
                            className="inline-block px-2.5 py-0.5 rounded-full bg-[#FFF4E0] text-[10px] font-semibold text-[#8A5A00]"
                          >
                            {locale === 'th'
                              ? 'โหมดออฟไลน์ · ประโยคฝึก ไม่ใช่ AI'
                              : 'Mode offline · kalimat latihan, bukan AI'}
                          </span>
                        )}
                      </>
                    )}

                    {activeUserSubtitle && (
                      <div className="pt-1">
                        <span className="inline-block px-3 py-1 rounded-full bg-[#F5F1E8] text-xs text-[#5C4E3C]">
                          <strong className="font-semibold text-[#1C1611] mr-1">Kamu:</strong>
                          <JapaneseRubyDisplay
                            as="span"
                            text={activeUserSubtitle.text}
                            targetLang={activeScenario.targetLang}
                            showRomaji={true}
                            className="inline"
                            rubyClassName="text-xs font-medium text-[#1C1611]"
                            romajiClassName="text-[10px] text-[#8C6D1F]"
                          />
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Kontrol Panggilan Pill Terpusat */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSpeechRate(speechRate === 1.0 ? 0.8 : 1.0)}
                      className="px-3 py-2 rounded-full bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[#5C4E3C] text-xs font-mono font-semibold cursor-pointer transition-colors"
                      title="Kecepatan bicara (1.0x / 0.8x)"
                    >
                      {speechRate === 1.0 ? '1.0x' : '0.8x'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const lastAi = [...turns].reverse().find((tr) => tr.speaker === 'ai');
                        if (lastAi) void speakAiText(lastAi.text, lastAi.audioBase64);
                      }}
                      className="px-3.5 py-2 rounded-full bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[#1C1611] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#5C4E3C] shrink-0" />
                      <span>{callStateKey === 'speaking' ? 'Diputar...' : 'Putar Suara'}</span>
                    </button>

                    {!isLiveConnected ? (
                      <button
                        type="button"
                        disabled={isLiveConnecting}
                        onClick={startLiveCall}
                        className="px-5 py-2 rounded-full bg-[#1C1611] hover:bg-[#332920] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs disabled:opacity-60"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{isLiveConnecting ? 'Menyambungkan...' : 'Telepon Live'}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={toggleMuteMic}
                          className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                            isMicMuted
                              ? 'bg-[#B8432D] text-white'
                              : 'bg-[#F5F1E8] hover:bg-[#EAE3D5] text-[#1C1611]'
                          }`}
                          aria-label="Mute Mic"
                        >
                          {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                            onClick={() => {
                              playFiezelSfx('button_tap');
                              stopLiveCall();
                              setLiveUserDraft('');
                              setLiveAiDraft('');
                            }}
                          className="px-4 py-2 rounded-full bg-[#B8432D] hover:bg-[#9E3622] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <PhoneOff className="w-3.5 h-3.5" />
                          <span>Akhiri</span>
                        </button>
                      </>
                    )}
                  </div>
                </section>

                {/* 2. ALUR PERCAKAPAN RINGKAS (Hanya Tampil Bersih Tanpa Kotak Luar Berat) */}
                <section className="space-y-2.5 w-full pt-1">
                  <div className="flex items-center justify-between gap-2 px-1 text-xs text-[#6E5E47]">
                    <span className="font-semibold text-[#5C4E3C]">
                      {locale === 'th' ? 'บทสนทนา' : 'Percakapan'} ({turns.filter((tr) => tr.speaker === 'user').length})
                    </span>

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
                                  showRomaji={!isMeasureMode}
                                  className="text-sm font-medium text-[#1C1611] break-words leading-snug"
                                  rubyClassName="text-sm font-medium"
                                  romajiClassName="text-xs text-[#8C6D1F] font-medium mt-0.5"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => void speakAiText(turn.text, turn.audioBase64, 1.0)}
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
                              showRomaji={true}
                              className="text-sm font-medium text-white break-words"
                              rubyClassName="text-sm font-medium text-white"
                              romajiClassName="text-xs text-[#FFE082] font-medium mt-0.5"
                            />
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

                              {!diag.ok && diag.syntacticCorrection && (
                                <div className="bg-white/90 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 text-[#1C1611]">
                                  <span className="break-words">
                                    Saran: <b className="text-[#8C2233]">"{diag.syntacticCorrection}"</b>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInputText(diag.syntacticCorrection || '');
                                    }}
                                    className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#F5F1E8] text-[11px] font-semibold cursor-pointer"
                                  >
                                    Gunakan
                                  </button>
                                </div>
                              )}

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
            {(isRecordingPtt || isListeningLiveSpeech || liveUserDraft.trim()) && (
              <div
                data-testid="live-voice-capture-banner"
                className="flex items-center justify-between gap-2 px-4 py-1.5 rounded-full bg-white shadow-sm text-xs text-[#1C1611]"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="w-2 h-2 rounded-full bg-[#2E8B69] animate-ping shrink-0" />
                  <span className="font-medium truncate">
                    {liveUserDraft.trim()
                      ? `"${liveUserDraft.trim()}"`
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
                        void submitStudentTurn({ text: textToSend, speakingDurationSec: 3 });
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
                    if (
                      isLiveConnected &&
                      wsRef.current &&
                      wsRef.current.readyState === WebSocket.OPEN
                    ) {
                      const textToSend = inputText.trim();
                      wsRef.current.send(
                        JSON.stringify({
                          clientContent: {
                            turns: [{ role: 'user', parts: [{ text: textToSend }] }],
                            turnComplete: true,
                          },
                        })
                      );
                      setInputText('');
                    } else {
                      void submitStudentTurn({ text: inputText });
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
                  if (
                    isLiveConnected &&
                    wsRef.current &&
                    wsRef.current.readyState === WebSocket.OPEN
                  ) {
                    const textToSend = inputText.trim();
                    wsRef.current.send(
                      JSON.stringify({
                        clientContent: {
                          turns: [{ role: 'user', parts: [{ text: textToSend }] }],
                          turnComplete: true,
                        },
                      })
                    );
                    setInputText('');
                  } else {
                    void submitStudentTurn({ text: inputText });
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
    </div>
  );
}
