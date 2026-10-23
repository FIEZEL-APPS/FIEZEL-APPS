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
  Key,
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
import {
  evaluateTurnFlexible,
  float32ToPcm16Base64,
  LiveTransportMode,
  pcm16Base64ToAudioBuffer,
  resolveLiveCallWebSocketUrls,
  synthesizeFlexibleTts,
} from './lib/liveTransport';

export default function App() {
  const [brainState, setBrainState] = useState<BraincoreStoreState>(() => loadBraincoreState());
  const [activeTab, setActiveTab] = useState<'home' | 'call' | 'braincore'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab') || urlParams.get('view');
        if (tabParam === 'home' || tabParam === 'call' || tabParam === 'braincore') {
          return 'call';
        }
      }
    } catch {
      // Ignore
    }
    return 'call'; // Single unified Mitra Kaiwa / Kawan Bicara Call Room
  });
  const [activeScenarioId, setActiveScenarioId] = useState<string>(() => {
    const initialLang = loadBraincoreState().targetLang || 'en';
    const firstForLang = CALL_SCENARIOS.find((s) => s.targetLang === initialLang);
    return firstForLang ? firstForLang.id : 'scen_en_a1_hometown';
  });
  const [customMeasureOverride, setCustomMeasureOverride] = useState<boolean | null>(null);

  // Gemini Live API Direct Client Key state
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    try {
      return (typeof localStorage !== 'undefined' && localStorage.getItem('fz_gemini_api_key')) || '';
    } catch {
      return '';
    }
  });
  const [tempApiKey, setTempApiKey] = useState<string>(geminiApiKey);

  const [turns, setTurns] = useState<CallTurn[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isAnalyzingTurn, setIsAnalyzingTurn] = useState<boolean>(false);
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
  const pttStartedAtRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const speechRecRef = useRef<any>(null);
  const liveDictatedTextRef = useRef<string>('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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

  const locale: LearnerLocale = brainState.learnerLocale || 'id';
  const targetLang: TargetLang = brainState.targetLang || 'en';

  const scenariosForLang = CALL_SCENARIOS.filter((s) => s.targetLang === targetLang);
  const activeScenario: CallScenario =
    scenariosForLang.find((s) => s.id === activeScenarioId) ||
    scenariosForLang[0] ||
    CALL_SCENARIOS[0];
  const activePersona =
    VOICE_PERSONAS[activeScenario.personaId] || VOICE_PERSONAS.coach_alex;

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
  }, [activeScenario.id]);

  useEffect(() => {
    if (activeTab === 'call') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    const firstScenario = CALL_SCENARIOS.find((s) => s.targetLang === lang) || CALL_SCENARIOS[0];
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

  const speakAiText = async (
    text: string,
    preloadedBase64?: string | null,
    overrideRate?: number
  ) => {
    if (!text.trim()) return;
    const targetRate = overrideRate ?? speechRate;
    try {
      if (currentAudioElRef.current) {
        currentAudioElRef.current.pause();
        currentAudioElRef.current = null;
      }
      setIsPlayingAiAudio(true);

      let audioBase64 = preloadedBase64 || null;
      let audioMime = 'audio/wav';

      if (!audioBase64) {
        const flexTts = await synthesizeFlexibleTts({
          text,
          targetLang: activeScenario.targetLang,
          persona: activePersona,
        });
        if (flexTts?.audioBase64) {
          audioBase64 = flexTts.audioBase64;
          audioMime = flexTts.audioMimeType || 'audio/mpeg';
        } else {
          try {
            const res = await fetch('/api/tts/speak', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text,
                voiceName: activePersona.geminiVoice,
                speakingStyle: activePersona.speakingStyle,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              audioBase64 = data.audioBase64 || null;
            }
          } catch {
            // Fall through to browser speechSynthesis
          }
        }
      }

      if (audioBase64) {
        const audio = new Audio(`data:${audioMime};base64,${audioBase64}`);
        audio.playbackRate = targetRate;
        currentAudioElRef.current = audio;
        audio.onended = () => setIsPlayingAiAudio(false);
        audio.onerror = () => setIsPlayingAiAudio(false);
        await audio.play();
        return;
      }

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = activeScenario.targetLang === 'ja' ? 'ja-JP' : 'en-US';
        utter.rate = targetRate * 0.98;
        utter.onend = () => setIsPlayingAiAudio(false);
        utter.onerror = () => setIsPlayingAiAudio(false);
        window.speechSynthesis.speak(utter);
      } else {
        setIsPlayingAiAudio(false);
      }
    } catch {
      setIsPlayingAiAudio(false);
    }
  };

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
      let exactTranscript = trimmed;
      let ev: any = null;
      let aiAudioBase64: string | null = null;
      let aiAudioMimeType = 'audio/wav';

      try {
        const res = await fetch('/api/voice-call/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userTranscript: trimmed,
            audioBase64: params.audioBase64,
            audioMimeType: params.audioMimeType,
            scenarioId: activeScenario.id,
            targetLang: activeScenario.targetLang,
            scenarioTitle: activeScenario.titleId,
            missionGoals: activeScenario.missionGoalsId,
            targetPatterns: activeScenario.targetPatterns,
            personaName: activePersona.name,
            geminiVoice: activePersona.geminiVoice,
            speakingStyle: activePersona.speakingStyle,
            systemPrompt: activePersona.systemPrompt,
            conversationHistory: turns.slice(-6).map((tItem) => ({
              speaker: tItem.speaker,
              text: tItem.text,
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.ok && data?.evaluation) {
            exactTranscript = data.userExactTranscript || trimmed;
            ev = data.evaluation;
            aiAudioBase64 = data.aiAudioBase64 || null;
            aiAudioMimeType = data.aiAudioMimeType || 'audio/wav';
            if (Array.isArray(data.nextSuggestedReplies) && data.nextSuggestedReplies.length > 0) {
              setNextSuggestedReplies(data.nextSuggestedReplies);
            } else {
              setNextSuggestedReplies([]);
            }
          }
        }
      } catch {
        // Static cPanel / Cloudflare Worker fallback
      }

      if (!ev) {
        const fallbackEv = await evaluateTurnFlexible({
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
        });
        exactTranscript = fallbackEv.userExactTranscript;
        ev = fallbackEv;
        aiAudioBase64 = fallbackEv.audioBase64 || null;
        aiAudioMimeType = fallbackEv.audioMimeType || 'audio/mpeg';
        if (
          Array.isArray(fallbackEv.nextSuggestedReplies) &&
          fallbackEv.nextSuggestedReplies.length > 0
        ) {
          setNextSuggestedReplies(fallbackEv.nextSuggestedReplies);
        } else {
          setNextSuggestedReplies([]);
        }
      }

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
      playFiezelSfx(ev.ok ? 'answer_correct' : 'answer_wrong');

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

      const aiTurn: CallTurn = {
        id: `turn_ai_${Date.now() + 1}`,
        speaker: 'ai',
        text: ev.aiReply,
        translationId: ev.aiReplyTranslationId,
        translationTh: ev.aiReplyTranslationTh,
        timestamp: Date.now() + 1,
        audioBase64: aiAudioBase64 || undefined,
        audioMimeType: aiAudioMimeType,
      };

      setTurns((prev) => [...prev, userTurn, aiTurn]);
      setInputText('');
      setShowHint(false);

      void speakAiText(ev.aiReply, aiAudioBase64);
      void brainSyncFlush(attemptOutcome.nextState).then(({ nextState }) =>
        setBrainState(nextState)
      );
    } catch (err) {
      setStatusBanner((err as Error).message || 'Kesalahan jaringan.');
    } finally {
      setIsAnalyzingTurn(false);
    }
  };

  const startPttRecording = async () => {
    try {
      // Immediate barge-in: cancel any playing AI audio or speech synthesis
      if (currentAudioElRef.current) {
        try {
          currentAudioElRef.current.pause();
          currentAudioElRef.current = null;
        } catch {
          // Ignore
        }
      }
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }
      setIsPlayingAiAudio(false);

      setStatusBanner(null);
      liveDictatedTextRef.current = '';

      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const recognition = new SpeechRec();
          recognition.lang = activeScenario.targetLang === 'ja' ? 'ja-JP' : 'en-US';
          recognition.interimResults = true;
          recognition.continuous = true;
          recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            if (transcript.trim()) {
              liveDictatedTextRef.current = transcript.trim();
              setInputText(transcript.trim());
            }
          };
          recognition.start();
          speechRecRef.current = recognition;
        } catch {
          // Ignore browser speech recognition error
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];
      pttStartedAtRef.current = Date.now();
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
          : 5;
        pttStartedAtRef.current = null;
        const dictated = liveDictatedTextRef.current.trim();
        const blob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = String(reader.result || '');
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
          if (base64 || dictated) {
            void submitStudentTurn({
              text: dictated || undefined,
              audioBase64: base64 || undefined,
              audioMimeType: blob.type || 'audio/webm',
              speakingDurationSec: elapsedSec,
            });
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setIsRecordingPtt(true);
    } catch {
      setStatusBanner(
        'Izin mikrofon belum aktif di peramban ini. Ketik kalimatmu atau pilih langsung dari kartu Bantuan Cara Jawab di atas.'
      );
    }
  };

  const stopPttRecording = () => {
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // Ignore
      }
      speechRecRef.current = null;
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
    setStatusBanner(null);
    setIsLiveConnecting(true);
    setLiveUserDraft('');
    setLiveAiDraft('');
    setCallDurationSec(0);

    const params = new URLSearchParams({
      voice: activePersona.geminiVoice,
      personaName: activePersona.name,
      scenarioTitle: activeScenario.titleId,
      targetLang: activeScenario.targetLang,
      scenarioId: activeScenario.id,
      model: 'gemini-3.8-live',
    });

    const candidateWsUrls = resolveLiveCallWebSocketUrls().map(
      (base) => `${base}${base.includes('?') ? '&' : '?'}${params.toString()}`
    );

    const tryConnectWsCandidate = (index: number) => {
      if (index >= candidateWsUrls.length) {
        activateTurnByTurnLiveFallback();
        return;
      }

      const targetUrl = candidateWsUrls[index];
      const isGoogleLive = targetUrl.includes('generativelanguage.googleapis.com');
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
          tryConnectWsCandidate(index + 1);
        }
      }, 3500);

      try {
        ws = new WebSocket(targetUrl);
        wsRef.current = ws;
      } catch {
        window.clearTimeout(connectTimer);
        tryConnectWsCandidate(index + 1);
        return;
      }

      ws.onopen = () => {
        if (isGoogleLive) {
          try {
            ws.send(
              JSON.stringify({
                setup: {
                  model: 'models/gemini-2.0-flash-exp',
                  generationConfig: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                      voiceConfig: {
                        prebuiltVoiceConfig: {
                          voiceName: activePersona.geminiVoice || 'Puck',
                        },
                      },
                    },
                  },
                  systemInstruction: {
                    parts: [
                      {
                        text:
                          activePersona.systemPrompt ||
                          `You are ${activePersona.name}, speaking partner for scenario "${activeScenario.titleId}".`,
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

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const isGoogleReady = Boolean(msg.setupComplete);
          if (isGoogleReady || msg.type === 'ready' || msg.type === 'live_ready') {
            if (!settled) {
              settled = true;
              window.clearTimeout(connectTimer);
            }
            setLiveTransportMode('ws-duplex');
            setIsLiveConnecting(false);
            setIsLiveConnected(true);
            playFiezelSfx('lesson_start');

            if (!outputAudioCtxRef.current) {
              const outputCtx = new AudioContext({ sampleRate: 24000 });
              outputAudioCtxRef.current = outputCtx;
              nextStartTimeRef.current = outputCtx.currentTime;
            }
            if (outputAudioCtxRef.current.state === 'suspended') {
              void outputAudioCtxRef.current.resume().catch(() => {});
            }
            void navigator.mediaDevices
              ?.getUserMedia({ audio: true })
              .then((stream) => {
                micStreamRef.current = stream;
                const inputCtx = new AudioContext({ sampleRate: 16000 });
                inputAudioCtxRef.current = inputCtx;
                if (inputCtx.state === 'suspended') {
                  void inputCtx.resume().catch(() => {});
                }
                const source = inputCtx.createMediaStreamSource(stream);
                const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                scriptProcessorRef.current = processor;

                processor.onaudioprocess = (e) => {
                  if (isMicMutedRef.current) return;
                  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    const pcmBase64 = float32ToPcm16Base64(e.inputBuffer.getChannelData(0));
                    if (isGoogleLive) {
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
                    } else {
                      wsRef.current.send(JSON.stringify({ audio: pcmBase64 }));
                    }
                  }
                };
                const muteGain = inputCtx.createGain();
                muteGain.gain.value = 0;
                source.connect(processor);
                processor.connect(muteGain);
                muteGain.connect(inputCtx.destination);
              })
              .catch(() => {
                // Mic optional
              });
          }

          // Direct Google Gemini Live or Proxy Audio Chunk extraction
          let incomingAudioBase64: string | null = null;
          if (msg.type === 'audio' && msg.audio) {
            incomingAudioBase64 = msg.audio;
          } else if (msg.serverContent?.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part?.inlineData?.data) {
                incomingAudioBase64 = part.inlineData.data;
              }
              if (part?.text) {
                setLiveAiDraft((prev) => (prev ? `${prev} ${part.text}` : part.text));
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

          // Barge-in interruption from Gemini Live server
          if (msg.serverContent?.interrupted) {
            if (outputAudioCtxRef.current) {
              nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
            activeSourcesRef.current.forEach((s) => {
              try {
                s.stop();
              } catch {
                // Ignore
              }
            });
            activeSourcesRef.current = [];
            setIsPlayingAiAudio(false);
          } else if (msg.type === 'input_transcription' || msg.type === 'user_transcript') {
            setLiveUserDraft(msg.fullText || msg.text || '');
          } else if (msg.type === 'output_transcription' || msg.type === 'ai_transcript') {
            setLiveAiDraft(msg.fullText || msg.text || '');
          } else if (msg.type === 'turn_complete') {
            const uText = (msg.userTranscript || '').trim();
            const aText = (msg.aiTranscript || '').trim();

            if (uText) {
              const diagRaw = msg.diagnosis;
              let turnDiag: TurnDiagnosis | undefined;
              if (diagRaw) {
                const outcome = recordSpeakingAttempt(brainState, {
                  competencyId: activeScenario.competencyId,
                  scenarioId: activeScenario.id,
                  targetLang: activeScenario.targetLang,
                  userExactTranscript: uText,
                  ok: Boolean(diagRaw.ok),
                  grammarScore: diagRaw.grammarScore,
                  fluencyScore: diagRaw.fluencyScore,
                  vocabUsageScore: diagRaw.vocabUsageScore,
                  accuracyScore: diagRaw.accuracyScore,
                  misconceptionId: diagRaw.misconceptionId || null,
                  correctionPattern:
                    diagRaw.syntacticCorrection || diagRaw.naturalReformulation || null,
                  hintsUsed: 0,
                  confidence: 0.85,
                  measureMode: isMeasureMode,
                });
                setBrainState(outcome.nextState);
                turnDiag = {
                  ok: Boolean(diagRaw.ok),
                  accuracyScore: diagRaw.accuracyScore,
                  grammarScore: diagRaw.grammarScore,
                  fluencyScore: diagRaw.fluencyScore,
                  vocabUsageScore: diagRaw.vocabUsageScore,
                  userExactTranscript: uText,
                  misconceptionId: diagRaw.misconceptionId || null,
                  whyFailsId: diagRaw.whyFailsId || null,
                  whyFailsTh: diagRaw.whyFailsTh || null,
                  missingTokens: diagRaw.missingTokens || [],
                  syntacticCorrection: diagRaw.syntacticCorrection || null,
                  naturalReformulation: diagRaw.naturalReformulation || uText,
                  pedagogicalFeedbackId: diagRaw.pedagogicalFeedbackId,
                  pedagogicalFeedbackTh: diagRaw.pedagogicalFeedbackTh,
                  bktBefore: outcome.bktBefore,
                  bktAfter: outcome.bktAfter,
                  thetaAfter: outcome.thetaAfter,
                  masteryStateAfter: outcome.masteryStateAfter,
                };
              }
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
              if (Array.isArray(msg.nextSuggestedReplies) && msg.nextSuggestedReplies.length > 0) {
                setNextSuggestedReplies(msg.nextSuggestedReplies);
              } else {
                setNextSuggestedReplies([]);
              }
              if (msg.aiAudioBase64) {
                void speakAiText(aText, msg.aiAudioBase64);
              }
            }
            setLiveUserDraft('');
            setLiveAiDraft('');
          } else if (msg.type === 'interrupted') {
            activeSourcesRef.current.forEach((src) => {
              try {
                src.stop();
              } catch {
                // Ignore
              }
            });
            activeSourcesRef.current = [];
            if (outputAudioCtxRef.current) {
              nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
            setIsPlayingAiAudio(false);
          } else if (msg.type === 'error' || msg.type === 'live_error') {
            if (!settled) {
              settled = true;
              window.clearTimeout(connectTimer);
              tryConnectWsCandidate(index + 1);
            } else {
              activateTurnByTurnLiveFallback();
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
          tryConnectWsCandidate(index + 1);
        }
      };

      ws.onclose = () => {
        if (!settled) {
          settled = true;
          window.clearTimeout(connectTimer);
          tryConnectWsCandidate(index + 1);
        }
      };
    };

    tryConnectWsCandidate(0);
  };

  const stopLiveCall = () => {
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
    setActiveTab('call');
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

  const callStateKey: 'speaking' | 'recording' | 'live' | 'ready' = isPlayingAiAudio
    ? 'speaking'
    : isRecordingPtt
      ? 'recording'
      : isLiveConnected
        ? 'live'
        : 'ready';

  const lastAiTurn = [...turns].reverse().find((tr) => tr.speaker === 'ai');
  const lastUserTurn = [...turns].reverse().find((tr) => tr.speaker === 'user');

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
        }
      }
    } catch {
      // Uses deterministic contextual synthesizer fallback automatically
    } finally {
      setIsRefreshingAssist(false);
    }
  };

  return (
    <div className="min-h-screen text-[#241A11] flex flex-col">
      {/* HEADER KACA HANGAT KHAS FIEZEL (Warm Paper + Solar Gold + Maroon) */}
      <header className="sticky top-0 z-30 bg-[#FFF9EE]/92 backdrop-blur-xl border-b border-[#F0E4CF]">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Tombol Kembali ke PWA Utama */}
            <a
              href="./index.html"
              onClick={handleBackToPwa}
              data-testid="mitra-kaiwa-back-btn"
              className="px-2.5 py-1.5 rounded-xl bg-white border border-[#F0E4CF] font-bold text-[#8C2233] hover:border-[#8C2233] cursor-pointer shadow-2xs flex items-center gap-1.5 transition-all text-xs shrink-0"
              title="Kembali ke Beranda PWA FIEZEL"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{locale === 'th' ? 'กลับ' : 'Kembali'}</span>
            </a>

            {/* Identitas Mitra Kaiwa / Kawan Bicara */}
            <div className="flex items-center gap-2 shrink-0">
              <FiezelBrandCrest className="w-8 h-8 rounded-xl shadow-xs shrink-0" />
              <div>
                <div className="font-display font-bold text-sm text-[#241A11] leading-none tracking-tight flex items-center gap-1">
                  <span data-testid="mitra-kaiwa-header-title">
                    {targetLang === 'ja'
                      ? locale === 'th'
                        ? 'คู่สนทนาไควะ'
                        : 'Mitra Kaiwa'
                      : locale === 'th'
                        ? 'คู่สนทนา AI'
                        : 'Kawan Bicara'}
                  </span>
                  <FiezelPawStamp className="w-3 h-3 text-[#8C2233]" />
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-[#8C6D1F] mt-0.5">
                  {targetLang === 'ja'
                    ? '会話パートナー · Studio Suara AI'
                    : 'Speaking Partner · Studio Suara AI'}
                </div>
              </div>
            </div>

            {/* Navigasi Segmented Khas FIEZEL (Nonaktif pada mode tunggal Mitra Kaiwa) */}
            <nav
              aria-hidden="true"
              style={{ display: 'none' }}
              className="hidden items-center gap-1 bg-[#FFF3DC] border border-[#F0E4CF] p-1 rounded-2xl"
            >
              <button
                type="button"
                onClick={() => handleTabChange('home')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'home'
                    ? 'bg-[#FFC700] text-[#241A11] shadow-2xs'
                    : 'text-[#6E5E47] hover:text-[#241A11]'
                }`}
              >
                {locale === 'th' ? 'หน้าแรก' : 'Beranda'}
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('call')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'call'
                    ? 'bg-[#FFC700] text-[#241A11] shadow-2xs'
                    : 'text-[#6E5E47] hover:text-[#241A11]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isLiveConnected ? 'bg-[#2E8B69] animate-ping' : 'bg-[#8C2233]'
                  }`}
                />
                <span>{locale === 'th' ? 'โทรกับ AI' : 'Panggilan AI'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('braincore')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'braincore'
                    ? 'bg-[#FFC700] text-[#241A11] shadow-2xs'
                    : 'text-[#6E5E47] hover:text-[#241A11]'
                }`}
              >
                Braincore ({Math.round(currentMasteryP * 100)}%)
              </button>
            </nav>
          </div>

          {/* Kontrol Kunci Live, Kursus (EN/JA), Bahasa (ID/TH) & Unduh Patch */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setTempApiKey(geminiApiKey);
                setIsApiKeyModalOpen(true);
              }}
              className={`px-2.5 py-1.5 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs ${
                geminiApiKey
                  ? 'bg-[#EBF7F0] border border-[#2E8B69] text-[#2E8B69]'
                  : 'bg-white border border-[#F0E4CF] text-[#6E5E47] hover:border-[#FFC700]'
              }`}
              title="Atur Google Gemini Multimodal Live API Key pribadi"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{geminiApiKey ? 'Gemini Live' : 'Kunci Live'}</span>
            </button>

            <div className="flex items-center bg-[#FFF3DC] border border-[#F0E4CF] rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => handleSelectTargetLang('en')}
                className={`px-2 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                  targetLang === 'en'
                    ? 'bg-[#8C2233] text-[#FFFBF3] shadow-2xs'
                    : 'text-[#6E5E47] hover:text-[#241A11]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleSelectTargetLang('ja')}
                className={`px-2 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                  targetLang === 'ja'
                    ? 'bg-[#8C2233] text-[#FFFBF3] shadow-2xs'
                    : 'text-[#6E5E47] hover:text-[#241A11]'
                }`}
              >
                JA
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSelectLocale(locale === 'id' ? 'th' : 'id')}
              className="px-2 py-1.5 rounded-xl bg-white border border-[#F0E4CF] font-bold text-[#241A11] hover:border-[#FFC700] cursor-pointer shadow-2xs"
              title="Ganti Bahasa Antarmuka (ID / TH)"
            >
              {locale.toUpperCase()}
            </button>

            <a
              href="/api/download-patch"
              download="fiezel-ai-voice-call.patch"
              data-testid="download-patch-btn"
              aria-hidden="true"
              style={{ display: 'none' }}
              className="hidden px-2.5 py-1.5 rounded-xl btn-sun-tactile font-bold items-center gap-1.5 cursor-pointer"
              title="Unduh kode fitur Voice Studio sebagai Git Patch (.patch)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Patch</span>
            </a>
          </div>
        </div>
      </header>

      {/* MODAL PENGATURAN GOOGLE GEMINI MULTIMODAL LIVE KEY */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FFFDF9] border border-[#F0E4CF] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#8C2233] font-bold">
                <Key className="w-5 h-5" />
                <h3 className="font-display text-lg text-[#241A11]">Google AI Studio Gemini Live</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                className="p-1 rounded-xl text-[#6E5E47] hover:bg-[#F5EAD4] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#6E5E47] leading-relaxed">
              Gunakan Gemini API Key pribadi Anda untuk mengaktifkan koneksi audio dua arah real-time berlatensi ultra-rendah (<code className="bg-[#F5EAD4] px-1 py-0.5 rounded text-[#8C2233]">gemini-2.0-flash-exp</code>) langsung ke Google AI Studio Live WebSocket (<code className="bg-[#F5EAD4] px-1 py-0.5 rounded text-[#241A11]">wss://generativelanguage.googleapis.com</code>) tanpa server perantara.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#241A11] block">
                Gemini API Key (Tersimpan aman di peramban lokal Anda):
              </label>
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5C2A5] bg-white text-xs font-mono focus:outline-none focus:border-[#FFC700] focus:ring-2 focus:ring-[#FFC700]/30"
              />
              <div className="flex items-center justify-between text-[11px] text-[#8C6D1F]">
                <span>Kunci hanya disimpan di <code className="font-mono">localStorage</code> perangkat ini.</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8C2233] font-bold hover:underline"
                >
                  Dapatkan Kunci Gratis ↗
                </a>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {geminiApiKey && (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem('fz_gemini_api_key');
                    } catch {}
                    setGeminiApiKey('');
                    setTempApiKey('');
                    setIsApiKeyModalOpen(false);
                    setStatusBanner('Gemini Live API Key berhasil dihapus.');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8C2233] hover:bg-[#FCE8EB] cursor-pointer"
                >
                  Hapus Kunci
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const cleanKey = tempApiKey.trim();
                  try {
                    if (cleanKey) {
                      localStorage.setItem('fz_gemini_api_key', cleanKey);
                    } else {
                      localStorage.removeItem('fz_gemini_api_key');
                    }
                  } catch {}
                  setGeminiApiKey(cleanKey);
                  setIsApiKeyModalOpen(false);
                  setStatusBanner(
                    cleanKey
                      ? 'Gemini Live API Key aktif! Percakapan suara kini tersambung langsung ke Google AI Studio Live WebSocket.'
                      : 'Gemini Live API Key dinonaktifkan.'
                  );
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold btn-sun-tactile cursor-pointer"
              >
                Simpan & Gunakan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS BANNER GLOBAL */}
      {statusBanner && (
        <div className="max-w-4xl mx-auto px-4 pt-3 w-full">
          <div className="rounded-2xl p-3 text-xs font-bold flex items-center justify-between gap-3 bg-[#FFF3DC] border border-[#F0E4CF] text-[#8C6D1F] shadow-2xs animate-fade-in">
            <span>{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-[#6E5E47] hover:text-[#241A11] cursor-pointer p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* RUANG KERJA UTAMA FIEZEL VOICE STUDIO */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-5 pb-10 space-y-5">
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
                  : 'Kosakata prasyarat berhasil dikuasai dan dicatat ke Braincore!'
              );
              void brainSyncFlush(nextState).then(({ nextState: synced }) => setBrainState(synced));
            }}
            onSpeakSample={(sampleText) => {
              void speakAiText(sampleText);
            }}
          />
        ) : activeTab === 'call' ? (
          <>
            {/* 1. PITA SKENARIO & MODE LATIHAN KHAS FIEZEL */}
            <div className="fz-studio-card rounded-2xl p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-[#FFF3C4] border border-[#E6A800]/40 flex items-center justify-center text-[#8C2233] shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C6D1F]">
                    {locale === 'th' ? 'สถานการณ์ปัจจุบัน' : 'SKENARIO PERCAKAPAN AKTIF'}
                  </div>
                  <select
                    aria-label="Pilih skenario panggilan suara"
                    value={activeScenario.id}
                    onChange={(e) => {
                      stopLiveCall();
                      setActiveScenarioId(e.target.value);
                    }}
                    className="w-full bg-transparent text-sm font-bold text-[#241A11] focus:outline-none cursor-pointer truncate"
                  >
                    {scenariosForLang.map((scen) => (
                      <option key={scen.id} value={scen.id}>
                        {scen.level} · {locale === 'th' ? scen.titleTh : scen.titleId}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F0E4CF] shrink-0">
                <div className="fz-badge-paw font-mono tabular-nums">
                  <FiezelPawStamp className="w-3.5 h-3.5 text-[#8C2233]" />
                  <span>BKT {Math.round(currentMasteryP * 100)}%</span>
                </div>

                <button
                  type="button"
                  onClick={() => setCustomMeasureOverride(!isMeasureMode)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isMeasureMode
                      ? 'bg-[#FDF2F4] border-[#8C2233]/30 text-[#8C2233]'
                      : 'bg-[#FFF3DC] border-[#F0E4CF] text-[#241A11] hover:bg-[#FFF3C4]'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#8C2233]" />
                  <span>
                    {isMeasureMode
                      ? locale === 'th'
                        ? 'โหมดสอบ (ปิดตัวช่วย)'
                        : 'Mode Ujian (Murni)'
                      : locale === 'th'
                        ? 'โหมดฝึกซ้อม (มีตัวช่วย)'
                        : 'Mode Latihan (Ada Bantuan)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Gerbang Prasyarat Kosakata (Jika BKT < 60%) */}
            {!prereqStatus.isReady ? (
              <section className="fz-studio-card rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2.5 text-base font-bold text-[#241A11]">
                  <Lock className="w-5 h-5 text-[#8C2233]" />
                  <span>{t(locale, 'prereq.lockedTitle')}</span>
                </div>
                <p className="text-xs sm:text-sm text-[#6E5E47]">
                  {t(locale, 'prereq.lockedDesc')} (BKT {Math.round(prereqStatus.pMastery * 100)}%)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {activeScenario.vocabPrereqs.map((v) => (
                    <div
                      key={v.id}
                      className="bg-[#FFF9EE] border border-[#F0E4CF] rounded-2xl p-3.5 text-xs"
                    >
                      <div className="font-bold text-[#241A11] text-sm">{v.term}</div>
                      <div className="text-[#6E5E47] mt-0.5">
                        {locale === 'th' ? v.meaningTh : v.meaningId}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleUnlockPrerequisite}
                  className="w-full py-3.5 rounded-2xl btn-sun-tactile font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  {t(locale, 'prereq.completeBtn')}
                </button>
              </section>
            ) : (
              <>
                {/* 2. KARTU PANGGILAN SUARA AI PAW (dengan Ornamen Neural Emas & Transisi Fading/Scaling) */}
                <section
                  data-testid="ai-call-card"
                  data-call-state={callStateKey}
                  data-transport-mode={liveTransportMode}
                  className={`relative rounded-3xl p-5 sm:p-6 space-y-5 w-full overflow-hidden border-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
                    callStateKey === 'recording'
                      ? 'bg-gradient-to-br from-[#FDF2F4] via-white to-[#FFF9EE] border-[#8C2233] scale-[1.012] opacity-100 shadow-[0_20px_50px_-12px_rgba(140,34,51,0.22)] ring-2 ring-[#F0A0AC]'
                      : callStateKey === 'speaking'
                        ? 'bg-gradient-to-br from-[#FFF3C4] via-white to-[#FFF9EE] border-[#FFC700] scale-[1.012] opacity-100 shadow-[0_20px_50px_-12px_rgba(230,168,0,0.26)] ring-2 ring-[#FFC700]/60'
                        : callStateKey === 'live'
                          ? 'bg-gradient-to-br from-[#E9F7F0] via-white to-[#FFF9EE] border-[#2E8B69] scale-[1.012] opacity-100 shadow-[0_20px_50px_-12px_rgba(46,139,105,0.22)] ring-2 ring-[#2E8B69]/40'
                          : 'fz-studio-card border-[#F0E4CF] scale-100 opacity-95 ring-0'
                  }`}
                >
                  {/* Ornamen Konstelasi Neural Emas & Filigree Sudut Khas FIEZEL */}
                  <FiezelNeuralConstellation
                    className="absolute inset-x-0 top-0 h-32"
                    strokeColor="#E6A800"
                    opacity={0.32}
                  />
                  <FiezelCornerOrnament className="absolute -right-2 -top-2 w-28 h-28 opacity-85" />

                  {/* Baris Atas: Avatar PAW + Status + Tombol Kontrol Panggilan */}
                  <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto min-w-0">
                      {/* Avatar PAW si Kucing Geometris dengan Cincin Aura Fading/Scaling */}
                      <div className="relative shrink-0">
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute -inset-1.5 rounded-3xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            callStateKey === 'recording'
                              ? 'bg-[#F0A0AC]/50 border-2 border-[#8C2233] opacity-100 scale-105 fz-aura-pulse'
                              : callStateKey === 'speaking'
                                ? 'bg-[#FFC700]/45 border-2 border-[#E6A800] opacity-100 scale-105 fz-aura-pulse'
                                : callStateKey === 'live'
                                  ? 'bg-[#2E8B69]/30 border-2 border-[#2E8B69] opacity-100 scale-105 fz-aura-pulse'
                                  : 'opacity-0 scale-90'
                          }`}
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
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = fallback;
                          }}
                          alt="PAW"
                          className={`relative z-10 w-16 h-16 sm:w-18 sm:h-18 shrink-0 rounded-2xl object-contain p-1.5 border-2 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                            callStateKey === 'recording'
                              ? 'bg-[#FFF9EE] border-[#8C2233] scale-105 shadow-md'
                              : callStateKey === 'speaking'
                                ? 'bg-[#FFF3C4] border-[#FFC700] scale-105 shadow-md'
                                : callStateKey === 'live'
                                  ? 'bg-[#E9F7F0] border-[#2E8B69] scale-105 shadow-md'
                                  : 'bg-[#FFF9EE] border-[#F0E4CF] scale-100 shadow-xs'
                          }`}
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <FiezelPawStamp className="w-3.5 h-3.5 text-[#8C2233]" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C2233]">
                            {activePersona.accentLabel} · {activeScenario.level}
                          </span>
                        </div>
                        <h1 className="font-display text-xl sm:text-2xl font-bold text-[#241A11] leading-none flex items-center gap-1.5">
                          <span>PAW</span>
                          <FiezelSparkleOrnament className="w-5 h-5" />
                        </h1>

                        {/* Kapsul Status Animasi Fading & Scaling */}
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          <div
                            key={callStateKey}
                            data-testid="ai-call-status-pill"
                            className={`fz-status-transition inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono tabular-nums transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                              callStateKey === 'recording'
                                ? 'bg-[#FDF2F4] border-[#8C2233] text-[#8C2233] scale-[1.03] opacity-100'
                                : callStateKey === 'speaking'
                                  ? 'bg-[#FFF3C4] border-[#E6A800] text-[#241A11] scale-[1.03] opacity-100'
                                  : callStateKey === 'live'
                                    ? 'bg-[#E9F7F0] border-[#2E8B69] text-[#2E8B69] scale-[1.03] opacity-100'
                                    : 'bg-[#FFF3DC] border-[#F0E4CF] text-[#6E5E47] scale-100 opacity-90'
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`w-2 h-2 rounded-full shrink-0 transition-all duration-500 ${
                                callStateKey === 'recording'
                                  ? 'bg-[#8C2233] scale-125 animate-ping'
                                  : callStateKey === 'speaking'
                                    ? 'bg-[#E6A800] scale-125 animate-pulse'
                                    : callStateKey === 'live'
                                      ? 'bg-[#2E8B69] scale-125 animate-pulse'
                                      : 'bg-[#2E8B69] scale-95'
                              }`}
                            />
                            <span
                              data-testid="ai-call-status-text"
                              className={`transition-all duration-300 ${
                                callStateKey === 'ready' ? 'font-semibold' : 'font-bold'
                              }`}
                            >
                              {isPlayingAiAudio
                                ? isLiveConnected
                                  ? `PAW berbicara... (${formatTimer(callDurationSec)})`
                                  : 'Sedang berbicara...'
                                : isRecordingPtt
                                  ? `Merekam suara... (${formatTimer(pttRecordingSec)})`
                                  : isLiveConnected
                                    ? `LIVE · ${formatTimer(callDurationSec)}`
                                    : 'Siap bicara'}
                            </span>

                            {/* Waveform Suara Reaktif 4-Bar */}
                            <span
                              aria-hidden="true"
                              className={`inline-flex items-end gap-0.5 h-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                isPlayingAiAudio || isRecordingPtt || isLiveConnected
                                  ? 'opacity-100 scale-100 w-3.5 ml-0.5'
                                  : 'opacity-0 scale-75 w-0 overflow-hidden'
                              }`}
                            >
                              <i
                                className={`w-0.5 h-2 rounded-full fz-wave-bar-1 ${
                                  callStateKey === 'recording' ? 'bg-[#8C2233]' : 'bg-[#E6A800]'
                                }`}
                              />
                              <i
                                className={`w-0.5 h-3 rounded-full fz-wave-bar-2 ${
                                  callStateKey === 'recording' ? 'bg-[#8C2233]' : 'bg-[#E6A800]'
                                }`}
                              />
                              <i
                                className={`w-0.5 h-1.5 rounded-full fz-wave-bar-3 ${
                                  callStateKey === 'recording' ? 'bg-[#8C2233]' : 'bg-[#E6A800]'
                                }`}
                              />
                              <i
                                className={`w-0.5 h-2.5 rounded-full fz-wave-bar-4 ${
                                  callStateKey === 'recording' ? 'bg-[#8C2233]' : 'bg-[#E6A800]'
                                }`}
                              />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tombol Aksi Panggilan Khas FIEZEL */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-stretch sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setSpeechRate(speechRate === 1.0 ? 0.8 : 1.0)}
                        className="px-3 py-2.5 rounded-xl bg-[#FFF3DC] hover:bg-[#FFF3C4] border border-[#F0E4CF] text-[#241A11] text-xs font-mono font-bold cursor-pointer transition-all"
                        title="Ubah kecepatan bicara PAW (1.0x Normal / 0.8x Lambat)"
                      >
                        {speechRate === 1.0 ? '1.0x Normal' : '0.8x Lambat'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const lastAi = [...turns].reverse().find((tr) => tr.speaker === 'ai');
                          if (lastAi) void speakAiText(lastAi.text, lastAi.audioBase64);
                        }}
                        className={`flex-1 sm:flex-initial justify-center px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all duration-300 ${
                          callStateKey === 'speaking'
                            ? 'bg-[#FFF3C4] text-[#241A11] border-2 border-[#FFC700] scale-105'
                            : 'bg-[#FFF3DC] hover:bg-[#FFF3C4] border border-[#F0E4CF] text-[#241A11] scale-100'
                        }`}
                      >
                        <Volume2 className="w-4 h-4 text-[#8C2233]" />
                        <span>
                          {callStateKey === 'speaking' ? 'Sedang Diputar...' : 'Putar Suara'}
                        </span>
                      </button>

                      {!isLiveConnected ? (
                        <button
                          type="button"
                          disabled={isLiveConnecting}
                          onClick={startLiveCall}
                          className="flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl btn-maroon-tactile font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#FFC700]" />
                          <span>
                            {isLiveConnecting ? 'Menyambungkan...' : 'Telepon Live'}
                          </span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={toggleMuteMic}
                            className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                              isMicMuted
                                ? 'bg-[#B8432D] text-white'
                                : 'bg-[#FFF3DC] border border-[#F0E4CF] text-[#241A11]'
                            }`}
                            aria-label="Mute Mic"
                          >
                            {isMicMuted ? (
                              <MicOff className="w-4 h-4" />
                            ) : (
                              <Mic className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playFiezelSfx('button_tap');
                              stopLiveCall();
                              setLiveUserDraft('');
                              setLiveAiDraft('');
                            }}
                            className="px-4 py-2.5 rounded-xl bg-[#B8432D] hover:bg-[#9E3622] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                          >
                            <PhoneOff className="w-3.5 h-3.5" />
                            <span>Akhiri</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* SPOTLIGHT PERTANYAAN PAW & TERJEMAHAN REALTIME (dengan Pita Kiri Solar Gold .fz-solar-ribbon) */}
                  {!isMeasureMode && showTranslations && (
                    <div
                      data-testid="live-translation-hud"
                      className="relative z-10 bg-[#FFF9EE] border border-[#F0E4CF] fz-solar-ribbon rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-2 font-bold text-[#8C2233] uppercase tracking-wider text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-[#2E8B69] animate-pulse" />
                          <span>
                            {locale === 'th'
                              ? 'คำถามจาก PAW และคำแปลเรียลไทม์'
                              : 'Pertanyaan PAW & Terjemahan Realtime'}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => void speakAiText(activeAiLiveText, undefined, 0.8)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF3C4] hover:bg-[#FFC700]/60 border border-[#E6A800]/30 text-[#241A11] font-bold text-xs cursor-pointer transition-colors"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-[#8C2233]" />
                          <span>Dengar Pelan (0.8x)</span>
                        </button>
                      </div>

                      {/* Kalimat Pertanyaan AI */}
                      <p
                        data-testid="live-hud-ai-text"
                        className="text-base sm:text-lg font-bold text-[#241A11] leading-snug tracking-tight break-words"
                      >
                        AI: "{activeAiLiveText}"
                      </p>

                      {/* Kotak Terjemahan Langsung */}
                      <div
                        data-testid="live-hud-ai-translation"
                        className="bg-[#E9F7F0] border border-[#2E8B69]/30 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#241A11] flex items-start gap-2 break-words"
                      >
                        <span className="font-bold text-[#2E8B69] shrink-0">
                          {locale === 'th' ? 'คำแปล:' : '🇮🇩 Terjemahan:'}
                        </span>
                        <span className="font-semibold">
                          "{locale === 'th'
                            ? activeAiSubtitle.translationTh
                            : activeAiSubtitle.translationId}"
                        </span>
                      </div>

                      {activeUserSubtitle && (
                        <div className="pt-2 border-t border-[#F0E4CF] flex flex-wrap items-center justify-between gap-1 text-xs text-[#6E5E47]">
                          <span>
                            🎙️ <b className="text-[#241A11]">Jawabanmu:</b> "{activeUserSubtitle.text}"
                          </span>
                          <span className="text-[#8C6D1F] font-semibold">
                            ({locale === 'th' ? activeUserSubtitle.translationTh : activeUserSubtitle.translationId})
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* 3. BANTUAN CARA JAWAB PEMULA REALTIME */}
                {!isMeasureMode && (
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
                    lastUserText={lastUserTurn?.text}
                    cards={beginnerReplyCards}
                    isLiveConnected={isLiveConnected}
                    isRecordingPtt={isRecordingPtt}
                    isAnalyzingTurn={isAnalyzingTurn}
                    isPlayingAiAudio={isPlayingAiAudio}
                    isRefreshingAssist={isRefreshingAssist}
                    turnCount={turns.filter((tr) => tr.speaker === 'ai').length}
                    onRefreshAssist={() => {
                      void handleRefreshLiveAssist();
                    }}
                    onSpeakSample={(sampleText, rate = 1.0) => {
                      void speakAiText(sampleText, undefined, rate);
                    }}
                    onSelectForInput={(selectedText) => {
                      setInputText(selectedText);
                    }}
                    onStartPttWithPrompt={(selectedText) => {
                      setInputText(selectedText);
                      if (!isRecordingPtt && !isLiveConnected) {
                        void startPttRecording();
                      }
                    }}
                    onSendDirect={(selectedText) => {
                      if (
                        isLiveConnected &&
                        wsRef.current &&
                        wsRef.current.readyState === WebSocket.OPEN
                      ) {
                        wsRef.current.send(JSON.stringify({ text: selectedText.trim() }));
                        setInputText('');
                      } else {
                        void submitStudentTurn({ text: selectedText });
                      }
                    }}
                  />
                )}

                {/* 4. DOCK SUARA & RIWAYAT PERCAKAPAN KHAS FIEZEL */}
                <section className="fz-studio-card rounded-3xl p-4 sm:p-6 space-y-4 w-full overflow-hidden">
                  {/* Baris Input Suara & Ketik Taktil */}
                  <div className="bg-[#FFF9EE] border-1.5 border-[#F0E4CF] rounded-2xl p-2 sm:p-2.5 flex items-center gap-2 w-full min-w-0">
                    <button
                      type="button"
                      disabled={isAnalyzingTurn}
                      onClick={isRecordingPtt ? stopPttRecording : startPttRecording}
                      className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-all ${
                        isRecordingPtt
                          ? 'btn-maroon-tactile animate-pulse'
                          : 'bg-[#FFF3DC] hover:bg-[#FFF3C4] text-[#241A11] border border-[#F0E4CF]'
                      }`}
                      title={t(locale, 'call.pushToTalk')}
                    >
                      {isRecordingPtt ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4 text-[#8C2233]" />
                      )}
                      <span>
                        {isRecordingPtt
                          ? `Stop (${pttRecordingSec}s)`
                          : locale === 'th'
                            ? 'พูดตอบ'
                            : 'Rekam Suara'}
                      </span>
                    </button>

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
                            wsRef.current.send(JSON.stringify({ text: inputText.trim() }));
                            setInputText('');
                          } else {
                            void submitStudentTurn({ text: inputText });
                          }
                        }
                      }}
                      placeholder={t(locale, 'call.placeholder')}
                      className="min-w-0 flex-1 bg-transparent px-2 sm:px-3 py-2 text-sm font-medium text-[#241A11] placeholder:text-[#857350] focus:outline-none"
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
                          wsRef.current.send(JSON.stringify({ text: inputText.trim() }));
                          setInputText('');
                        } else {
                          void submitStudentTurn({ text: inputText });
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl btn-sun-tactile font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{isAnalyzingTurn ? '...' : 'Kirim'}</span>
                    </button>
                  </div>

                  {/* Header Transkrip Percakapan */}
                  <div className="flex items-center justify-between pt-1 pb-2 border-b border-[#F0E4CF] text-xs text-[#6E5E47]">
                    <div className="flex items-center gap-2 font-medium">
                      <FiezelPawStamp className="w-3.5 h-3.5 text-[#8C2233]" />
                      <span className="font-bold text-[#241A11]">
                        {locale === 'th'
                          ? 'บันทึกการสนทนาและผลวิเคราะห์'
                          : 'Riwayat Percakapan & Evaluasi Braincore'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-[#8C2233] font-bold">
                        {turns.filter((tr) => tr.speaker === 'user').length} giliran
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {!isMeasureMode && (
                        <button
                          type="button"
                          onClick={() => setShowTranslations(!showTranslations)}
                          className="font-bold text-[#6E5E47] hover:text-[#241A11] cursor-pointer"
                        >
                          {showTranslations ? 'Sembunyikan Arti' : 'Tampilkan Arti'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleResetCallSession}
                        className="font-bold text-[#8C2233] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Ulangi</span>
                      </button>
                    </div>
                  </div>

                  {/* Daftar Balon Percakapan & Kartu Diagnosis Pedagogis */}
                  <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                    {turns.map((turn) => {
                      if (turn.speaker === 'ai') {
                        return (
                          <div
                            key={turn.id}
                            className="bg-[#FFF9EE] border border-[#F0E4CF] fz-solar-ribbon rounded-2xl p-4 max-w-[92%] sm:max-w-[86%] break-words space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs text-[#6E5E47]">
                              <span className="font-bold text-[#8C2233] flex items-center gap-1.5">
                                <FiezelPawStamp className="w-3 h-3" />
                                <span>PAW (AI)</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => void speakAiText(turn.text, turn.audioBase64, 1.0)}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-[#F0E4CF] hover:border-[#FFC700] text-[11px] font-bold text-[#241A11] cursor-pointer"
                                >
                                  🔊 Putar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void speakAiText(turn.text, turn.audioBase64, 0.78)}
                                  className="px-2 py-1 rounded-lg bg-white border border-[#F0E4CF] hover:border-[#FFC700] text-[11px] font-mono font-bold text-[#6E5E47] cursor-pointer"
                                >
                                  0.8x
                                </button>
                              </div>
                            </div>
                            <p className="text-sm sm:text-[15px] font-semibold text-[#241A11] break-words leading-relaxed">
                              {turn.text}
                            </p>
                            {!isMeasureMode &&
                              showTranslations &&
                              (turn.translationId || turn.translationTh) && (
                                <p className="text-xs text-[#2E8B69] pt-1.5 border-t border-[#F0E4CF] break-words font-semibold">
                                  🇮🇩 {locale === 'th' ? turn.translationTh : turn.translationId}
                                </p>
                              )}
                          </div>
                        );
                      }

                      const diag = turn.diagnosis;
                      return (
                        <div key={turn.id} className="flex flex-col items-end space-y-2">
                          <div className="btn-maroon-tactile rounded-2xl rounded-tr-sm px-4 py-3 max-w-[92%] sm:max-w-[86%] break-words">
                            <p
                              data-testid="user-exact-transcript"
                              className="text-sm sm:text-[15px] font-semibold break-words"
                            >
                              {turn.text}
                            </p>
                          </div>

                          {diag && (
                            <div
                              data-testid="turn-diagnosis-card"
                              data-ok={diag.ok ? 'true' : 'false'}
                              className={`rounded-2xl p-3.5 text-xs max-w-[92%] sm:max-w-[86%] break-words border space-y-2 shadow-2xs ${
                                diag.ok
                                  ? 'bg-[#E9F7F0] border-[#2E8B69]/35 text-[#241A11]'
                                  : 'bg-[#FDE3DE] border-[#B8432D]/35 text-[#241A11]'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                                <div className="flex items-center gap-1.5">
                                  {diag.ok ? (
                                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2E8B69]" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#B8432D]" />
                                  )}
                                  <span className={diag.ok ? 'text-[#2E8B69]' : 'text-[#B8432D]'}>
                                    {diag.ok ? 'Struktur Kalimat Tepat' : 'Catatan Perbaikan Kalimat'}
                                  </span>
                                </div>
                                <span className="font-mono tabular-nums text-[11px] bg-white/90 px-2 py-0.5 rounded-md border border-[#F0E4CF]">
                                  Grammar {diag.grammarScore}% · Fluency {diag.fluencyScore}% · BKT{' '}
                                  {Math.round(diag.bktAfter * 100)}%
                                </span>
                              </div>

                              {!diag.ok && diag.syntacticCorrection && (
                                <div className="bg-white rounded-xl p-2.5 flex items-center justify-between gap-2 text-[#241A11] border border-[#F0E4CF] fz-solar-ribbon">
                                  <span className="font-semibold break-words">
                                    Saran tepat:{' '}
                                    <b className="text-[#8C2233]">"{diag.syntacticCorrection}"</b>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInputText(diag.syntacticCorrection || '');
                                    }}
                                    className="shrink-0 px-3 py-1.5 rounded-lg btn-sun-tactile text-[11px] font-bold cursor-pointer"
                                  >
                                    Coba Ulang
                                  </button>
                                </div>
                              )}

                              <p className="text-[#241A11] break-words leading-relaxed">
                                {locale === 'th'
                                  ? diag.whyFailsTh || diag.pedagogicalFeedbackTh
                                  : diag.whyFailsId || diag.pedagogicalFeedbackId}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {isAnalyzingTurn && (
                      <div className="bg-[#FFF3C4] border border-[#FFC700] rounded-2xl px-4 py-3 max-w-[80%] text-xs font-bold text-[#241A11] flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-[#8C2233] animate-ping" />
                        <span>PAW sedang mengevaluasi jawabanmu & menyiapkan balasan...</span>
                      </div>
                    )}

                    <div ref={chatEndRef} />
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
              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncingNow}
                className="relative z-10 px-4 py-2.5 rounded-xl btn-sun-tactile font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} />
                <span>{t(locale, 'olm.synced')}</span>
              </button>
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
