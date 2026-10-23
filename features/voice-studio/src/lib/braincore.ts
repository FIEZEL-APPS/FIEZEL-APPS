import {
  BraincoreStoreState,
  CompetencyRecord,
  MasteryStateName,
  MisconceptionLedgerEntry,
  SpeakingSessionMetric,
  TargetLang,
} from '../types/voiceCall';

/**
 * Canonical parameters from coordination/braincore-contract.json
 */
export const BRAINCORE_PARAMS = {
  P_INIT: 0.25,
  P_LEARN: 0.18,
  P_SLIP: 0.10,
  P_GUESS: 0.20,
  MASTERY_T: 0.80,
  DEVELOPING_T: 0.60,
  MIN_CORRECT_FOR_MASTERY: 3,
  RETENTION_DAYS: 3,
  DISCRIMINATION: 1.5,
  GUESS_FLOOR: 0.25,
  TARGET_SUCCESS: 0.80,
  HALF_LIFE_DAYS: 30.0,
} as const;

const STORAGE_KEY = 'fiezel-braincore-voice-v1';
const TAB_ID = `tab_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

/**
 * IRT 3PL Success Probability: P = c + (1 - c) / (1 + exp(-a * (theta - b)))
 */
export function successProbability(
  ability: number,
  difficulty: number,
  discrimination: number = BRAINCORE_PARAMS.DISCRIMINATION
): number {
  const a = Math.max(0.01, Number(discrimination || BRAINCORE_PARAMS.DISCRIMINATION));
  const diff = Number(ability || 0) - Number(difficulty || 0);
  const z = -a * diff;
  let latent: number;
  if (z > 40.0) {
    latent = 0.0;
  } else if (z < -40.0) {
    latent = 1.0;
  } else {
    latent = 1.0 / (1.0 + Math.exp(z));
  }
  return BRAINCORE_PARAMS.GUESS_FLOOR + (1.0 - BRAINCORE_PARAMS.GUESS_FLOOR) * latent;
}

/**
 * IRT 3PL Inverse: b = theta - logit((p - c) / (1 - c)) / a
 */
export function optimalDifficulty(
  ability: number,
  targetSuccess: number = BRAINCORE_PARAMS.TARGET_SUCCESS,
  discrimination: number = BRAINCORE_PARAMS.DISCRIMINATION
): number {
  const p = Math.max(BRAINCORE_PARAMS.GUESS_FLOOR + 0.05, Math.min(0.97, Number(targetSuccess)));
  const a = Math.max(0.01, Number(discrimination));
  const latent = Math.max(
    0.01,
    Math.min(0.99, (p - BRAINCORE_PARAMS.GUESS_FLOOR) / (1.0 - BRAINCORE_PARAMS.GUESS_FLOOR))
  );
  return Number((Number(ability || 0) - Math.log(latent / (1.0 - latent)) / a).toFixed(3));
}

/**
 * Canonical Theta mapping: 1.0 + 4.0 * clamp(p, 0, 1)
 */
export function abilityThetaFromMastery(pMastery: number): number {
  const clamped = Math.max(0.0, Math.min(1.0, Number(pMastery || BRAINCORE_PARAMS.P_INIT)));
  return Number((1.0 + 4.0 * clamped).toFixed(2));
}

/**
 * Exponential forgetting model BKT-FSRS: L(t) = L_0 + (L_last - L_0) * exp(-dt / tau)
 */
export function bktDecay(
  p: number | null | undefined,
  elapsedDays: number,
  halfLifeDays: number = BRAINCORE_PARAMS.HALF_LIFE_DAYS
): number {
  let pVal = Number(p ?? BRAINCORE_PARAMS.P_INIT);
  if (Number.isNaN(pVal) || !Number.isFinite(pVal)) {
    pVal = BRAINCORE_PARAMS.P_INIT;
  }
  const dt = Number(elapsedDays || 0);
  if (Number.isNaN(dt) || !Number.isFinite(dt) || dt <= 0 || pVal <= BRAINCORE_PARAMS.P_INIT) {
    return Number(pVal.toFixed(4));
  }
  const tau = Math.max(1.0, halfLifeDays) / Math.LN2;
  const decayRatio = Math.exp(-Math.min(50.0, dt / tau));
  const decayed = BRAINCORE_PARAMS.P_INIT + (pVal - BRAINCORE_PARAMS.P_INIT) * decayRatio;
  return Number(Math.max(0.01, Math.min(0.99, decayed)).toFixed(4));
}

/**
 * Classical BKT step (Bayes posterior + learning transition)
 */
export function bktStep(
  p: number,
  correct: boolean,
  slip: number = BRAINCORE_PARAMS.P_SLIP,
  guess: number = BRAINCORE_PARAMS.P_GUESS,
  learn: number = BRAINCORE_PARAMS.P_LEARN
): number {
  let pVal = Number(p ?? BRAINCORE_PARAMS.P_INIT);
  if (Number.isNaN(pVal) || !Number.isFinite(pVal)) {
    pVal = BRAINCORE_PARAMS.P_INIT;
  }
  pVal = Math.max(0.001, Math.min(0.999, pVal));
  const s = Math.max(0.01, Math.min(0.49, slip));
  const g = Math.max(0.01, Math.min(0.49, guess));
  const l = Math.max(0.0, Math.min(0.50, learn));

  const num = correct ? pVal * (1.0 - s) : pVal * s;
  const den = correct ? num + (1.0 - pVal) * g : num + (1.0 - pVal) * (1.0 - g);
  const post = den > 0 ? num / den : pVal;
  return post + (1.0 - post) * l;
}

/**
 * Behavioral BKT update (hints weaken positive evidence; low confidence increases guess; high confidence on error reduces slip)
 */
export function bktUpdate(
  p: number,
  correct: boolean,
  hints: number = 0,
  confidence: number = 0.8
): number {
  let slip: number = BRAINCORE_PARAMS.P_SLIP;
  let guess: number = BRAINCORE_PARAMS.P_GUESS;
  const h = Math.max(0, Math.floor(hints || 0));
  if (h > 0 && correct) {
    slip = Math.min(0.35, BRAINCORE_PARAMS.P_SLIP + 0.08 * h);
  }
  if (typeof confidence === 'number' && !Number.isNaN(confidence)) {
    if (correct && confidence <= 0.34) {
      guess = Math.min(0.45, guess + 0.15);
    }
    if (!correct && confidence >= 0.9) {
      slip = Math.max(0.04, slip - 0.05);
    }
  }
  return Number(
    Math.max(0.01, Math.min(0.99, bktStep(p, correct, slip, guess, BRAINCORE_PARAMS.P_LEARN))).toFixed(4)
  );
}

export function deriveMasteryState(rec: CompetencyRecord): MasteryStateName {
  if (rec.attempts === 0) {
    return rec.exposures === 0 ? 'NOT_EXPOSED' : 'EXPOSED';
  }
  const pVal = rec.pMasteryDecayed ?? rec.pMastery ?? BRAINCORE_PARAMS.P_INIT;
  const stillMastered =
    pVal >= BRAINCORE_PARAMS.MASTERY_T && rec.correct >= BRAINCORE_PARAMS.MIN_CORRECT_FOR_MASTERY;
  if (rec.transferredAt && stillMastered) return 'TRANSFERRED';
  if (rec.retainedAt && stillMastered) return 'RETAINED';
  if (stillMastered) return 'MASTERED';
  if (pVal >= BRAINCORE_PARAMS.DEVELOPING_T) return 'DEVELOPING';
  if (rec.attempts >= 2) return 'PRACTICING';
  return 'EXPOSED';
}

export function createBlankCompetency(
  competencyId: string,
  initialMastery: number = BRAINCORE_PARAMS.P_INIT,
  initialAttempts: number = 0,
  initialCorrect: number = 0
): CompetencyRecord {
  const rec: CompetencyRecord = {
    competencyId,
    pMastery: initialMastery,
    pMasteryDecayed: initialMastery,
    state: 'NOT_EXPOSED',
    exposures: initialAttempts > 0 ? initialAttempts : 1,
    attempts: initialAttempts,
    correct: initialCorrect,
    streak: initialCorrect,
    hintsUsed: 0,
    stabilityDays: initialMastery >= 0.8 ? 7.0 : 2.0,
    lastAt: initialAttempts > 0 ? Date.now() - 3600_000 : null,
    masteredAt: initialMastery >= 0.8 ? Date.now() - 86400_000 : null,
    retainedAt: null,
    transferredAt: null,
  };
  rec.state = deriveMasteryState(rec);
  return rec;
}

export function getDefaultSpeakingHistory(): SpeakingSessionMetric[] {
  const now = Date.now();
  return [
    {
      id: 'hist_1',
      turnLabel: 'Gilir #1',
      timestamp: now - 3600_000 * 6,
      scenarioId: 'scen_en_a2_cafe',
      competencyId: 'speak_en_a2_cafe',
      targetLang: 'en',
      ok: false,
      grammarScore: 52,
      fluencyScore: 64,
      vocabUsageScore: 68,
      accuracyScore: 56,
      bktMasteryPct: 38,
      speakingDurationSec: 18,
      userExactTranscript: 'I am want hot coffee and later meeting friend.',
    },
    {
      id: 'hist_2',
      turnLabel: 'Gilir #2',
      timestamp: now - 3600_000 * 5,
      scenarioId: 'scen_en_a2_past_trip',
      competencyId: 'speak_en_a2_past_trip',
      targetLang: 'en',
      ok: false,
      grammarScore: 44,
      fluencyScore: 70,
      vocabUsageScore: 65,
      accuracyScore: 48,
      bktMasteryPct: 42,
      speakingDurationSec: 22,
      userExactTranscript: 'Last weekend I goed to Bandung with my brother.',
    },
    {
      id: 'hist_3',
      turnLabel: 'Gilir #3',
      timestamp: now - 3600_000 * 4,
      scenarioId: 'scen_en_a2_cafe',
      competencyId: 'speak_en_a2_cafe',
      targetLang: 'en',
      ok: true,
      grammarScore: 86,
      fluencyScore: 82,
      vocabUsageScore: 88,
      accuracyScore: 85,
      bktMasteryPct: 54,
      speakingDurationSec: 25,
      userExactTranscript: "I'd like a cappuccino, please. After this, I am studying at the library.",
    },
    {
      id: 'hist_4',
      turnLabel: 'Gilir #4',
      timestamp: now - 3600_000 * 2,
      scenarioId: 'scen_en_a2_cafe',
      competencyId: 'speak_en_a2_cafe',
      targetLang: 'en',
      ok: true,
      grammarScore: 92,
      fluencyScore: 89,
      vocabUsageScore: 91,
      accuracyScore: 91,
      bktMasteryPct: 62,
      speakingDurationSec: 29,
      userExactTranscript:
        "I'd like an iced latte, please. After coffee, I am meeting my study group.",
    },
    {
      id: 'hist_5',
      turnLabel: 'Gilir #5',
      timestamp: now - 3600_000 * 1,
      scenarioId: 'scen_ja_n5_kissaten',
      competencyId: 'speak_ja_n5_kissaten',
      targetLang: 'ja',
      ok: true,
      grammarScore: 94,
      fluencyScore: 88,
      vocabUsageScore: 92,
      accuracyScore: 92,
      bktMasteryPct: 58,
      speakingDurationSec: 21,
      userExactTranscript: 'すみません、ホットコーヒーを一つとチーズケーキを一つください。',
    },
  ];
}

export function getInitialBraincoreState(): BraincoreStoreState {
  const defaultHistory = getDefaultSpeakingHistory();
  const initialTotalSeconds = defaultHistory.reduce((acc, item) => acc + item.speakingDurationSec, 0);
  return {
    version: 1,
    updatedAt: Date.now(),
    tabId: TAB_ID,
    learnerLocale: 'id',
    targetLang: 'en',
    competencies: {
      vocab_daily_a2: createBlankCompetency('vocab_daily_a2', 0.74, 5, 4),
      vocab_travel_a2: createBlankCompetency('vocab_travel_a2', 0.42, 2, 1),
      vocab_academic_b1: createBlankCompetency('vocab_academic_b1', 0.68, 4, 3),
      vocab_ja_cafe_n5: createBlankCompetency('vocab_ja_cafe_n5', 0.65, 4, 3),
      vocab_ja_campus_n4: createBlankCompetency('vocab_ja_campus_n4', 0.38, 2, 1),
      speak_en_a2_cafe: createBlankCompetency('speak_en_a2_cafe', 0.62, 4, 3),
      speak_en_a2_past_trip: createBlankCompetency('speak_en_a2_past_trip', 0.48, 3, 1),
      speak_en_b1_job_interview: createBlankCompetency('speak_en_b1_job_interview', 0.56, 3, 2),
      speak_en_b2_ielts_part3: createBlankCompetency('speak_en_b2_ielts_part3', 0.64, 4, 3),
      speak_ja_n5_kissaten: createBlankCompetency('speak_ja_n5_kissaten', 0.58, 3, 2),
      speak_ja_n4_senpai_advice: createBlankCompetency('speak_ja_n4_senpai_advice', 0.44, 2, 1),
    },
    misconceptionLedger: {
      'speak_en_a2_past_trip::past_tense_irregular_goed': {
        competencyId: 'speak_en_a2_past_trip',
        misconceptionId: 'past_tense_irregular_goed',
        frequency: 2,
        firstAt: Date.now() - 86400_000 * 2,
        lastAt: Date.now() - 3600_000 * 5,
        resolved: false,
        lastUtterance: 'Last weekend I goed to Bandung with my brother.',
        correctionPattern: 'Use irregular past "went" instead of regularizing "go" to "goed".',
      },
    },
    syncQueue: [],
    speakingHistory: defaultHistory,
    totalVoiceMinutes: Math.max(1, Math.round(initialTotalSeconds / 60)),
    totalSpeakingSeconds: initialTotalSeconds,
    completedCallSessions: 3,
  };
}

function readHostPwaPreferences(): { targetLang?: TargetLang; learnerLocale?: 'id' | 'th' } {
  try {
    let targetLang: TargetLang | undefined;
    let learnerLocale: 'id' | 'th' | undefined;
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const langParam = params.get('lang') || params.get('course');
      if (langParam === 'ja' || langParam === 'en') {
        targetLang = langParam;
      }
      const locParam = params.get('locale') || params.get('hl');
      if (locParam === 'th' || locParam === 'id') {
        learnerLocale = locParam;
      }
    }
    if (!targetLang) {
      const courseRaw = localStorage.getItem('fz_target_course');
      if (courseRaw === 'ja' || courseRaw === 'en') {
        targetLang = courseRaw;
      }
    }
    if (!learnerLocale) {
      const legacyRaw = localStorage.getItem('fiezel-v4-state');
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        if (legacy?.learnerLocale === 'th' || legacy?.locale === 'th') {
          learnerLocale = 'th';
        } else if (legacy?.learnerLocale === 'id' || legacy?.locale === 'id') {
          learnerLocale = 'id';
        }
      }
    }
    return { targetLang, learnerLocale };
  } catch {
    return {};
  }
}

/**
 * Non-destructively appends a voice speaking attempt to FIEZEL's IndexedDB learning queue
 * (`fiezel-learning-queue-v1` -> store `events`) and notifies parent PWA window / custom element.
 */
export function bridgeAttemptToHostPwa(eventPayload: Record<string, unknown>): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const coursePrefix =
        String(eventPayload.competencyId || '').includes('_ja_') ||
        String(eventPayload.scenarioId || '').includes('_ja_') ||
        localStorage.getItem('fz_target_course') === 'ja'
          ? 'ja'
          : 'en';
      const chatKey = 'fiezel-interactive-chat-v1';
      let chatSaved: any = null;
      try {
        chatSaved = JSON.parse(localStorage.getItem(chatKey) || 'null');
      } catch {
        chatSaved = null;
      }
      if (!chatSaved || typeof chatSaved !== 'object') {
        chatSaved = { correctionMode: true, scenarioHistories: {} };
      }
      if (!chatSaved.scenarioHistories || typeof chatSaved.scenarioHistories !== 'object') {
        chatSaved.scenarioHistories = {};
      }
      const histKey = `${coursePrefix}_studio`;
      if (!Array.isArray(chatSaved.scenarioHistories[histKey])) {
        chatSaved.scenarioHistories[histKey] = [];
      }
      chatSaved.scenarioHistories[histKey].push({
        id: String(eventPayload.id || `vs_${Date.now()}`),
        role: 'user',
        text: String(eventPayload.userTranscript || ''),
        ts: Date.now(),
      });
      localStorage.setItem(chatKey, JSON.stringify(chatSaved));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fiezel:voice-studio:attempt', { detail: eventPayload })
      );
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: 'FIEZEL_VOICE_STUDIO_ATTEMPT', payload: eventPayload },
          '*'
        );
      }
    }
    if (typeof indexedDB !== 'undefined') {
      const req = indexedDB.open('fiezel-learning-queue-v1', 1);
      req.onsuccess = () => {
        try {
          const db = req.result;
          if (db.objectStoreNames.contains('events')) {
            const tx = db.transaction('events', 'readwrite');
            tx.objectStore('events').put({
              id: eventPayload.id || `vs_${Date.now()}`,
              type: 'voice_studio_turn',
              ts: Date.now(),
              ...eventPayload,
            });
          }
          db.close();
        } catch {
          // Ignore if host schema differs
        }
      };
    }
  } catch {
    // Safe no-op in restricted iframe / private mode
  }
}

export function loadBraincoreState(): BraincoreStoreState {
  try {
    const hostPrefs = readHostPwaPreferences();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = getInitialBraincoreState();
      if (hostPrefs.targetLang) seed.targetLang = hostPrefs.targetLang;
      if (hostPrefs.learnerLocale) seed.learnerLocale = hostPrefs.learnerLocale;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as BraincoreStoreState;
    if (hostPrefs.targetLang) {
      parsed.targetLang = hostPrefs.targetLang;
    }
    if (hostPrefs.learnerLocale) {
      parsed.learnerLocale = hostPrefs.learnerLocale;
    }
    const now = Date.now();
    if (!Array.isArray(parsed.speakingHistory) || parsed.speakingHistory.length === 0) {
      parsed.speakingHistory = getDefaultSpeakingHistory();
    }
    if (typeof parsed.totalSpeakingSeconds !== 'number' || parsed.totalSpeakingSeconds <= 0) {
      parsed.totalSpeakingSeconds = parsed.speakingHistory.reduce(
        (acc, item) => acc + (item.speakingDurationSec || 15),
        0
      );
    }
    if (parsed.competencies) {
      for (const cid of Object.keys(parsed.competencies)) {
        const c = parsed.competencies[cid];
        if (c.lastAt) {
          const elapsedDays = Math.max(0, (now - c.lastAt) / 86400_000);
          c.pMasteryDecayed = bktDecay(c.pMastery, elapsedDays);
        } else {
          c.pMasteryDecayed = c.pMastery;
        }
        c.state = deriveMasteryState(c);
      }
    }
    return parsed;
  } catch {
    return getInitialBraincoreState();
  }
}

/**
 * Multi-tab safe Zero-Loss State persistence
 */
export function saveBraincoreState(nextState: BraincoreStoreState): BraincoreStoreState {
  try {
    const rawCurrent = localStorage.getItem(STORAGE_KEY);
    let merged = { ...nextState };
    if (rawCurrent) {
      const disk = JSON.parse(rawCurrent) as BraincoreStoreState;
      if (disk && disk.version > nextState.version) {
        const mergedComps: Record<string, CompetencyRecord> = {
          ...disk.competencies,
          ...nextState.competencies,
        };
        for (const cid of Object.keys(mergedComps)) {
          const a = disk.competencies?.[cid];
          const b = nextState.competencies?.[cid];
          if (a && b) {
            mergedComps[cid] = (a.lastAt || 0) > (b.lastAt || 0) ? a : b;
          }
        }
        const mergedLedger: Record<string, MisconceptionLedgerEntry> = {
          ...disk.misconceptionLedger,
          ...nextState.misconceptionLedger,
        };
        const queueIds = new Set<string>();
        const mergedQueue = [...(disk.syncQueue || []), ...(nextState.syncQueue || [])].filter(
          (item) => {
            if (queueIds.has(item.id)) return false;
            queueIds.add(item.id);
            return true;
          }
        );
        const histIds = new Set<string>();
        const mergedHistory = [
          ...(disk.speakingHistory || []),
          ...(nextState.speakingHistory || []),
        ].filter((item) => {
          if (histIds.has(item.id)) return false;
          histIds.add(item.id);
          return true;
        });

        merged = {
          ...nextState,
          version: Math.max(disk.version, nextState.version) + 1,
          updatedAt: Date.now(),
          tabId: TAB_ID,
          competencies: mergedComps,
          misconceptionLedger: mergedLedger,
          syncQueue: mergedQueue,
          speakingHistory: mergedHistory,
          totalSpeakingSeconds: Math.max(
            disk.totalSpeakingSeconds || 0,
            nextState.totalSpeakingSeconds || 0
          ),
          totalVoiceMinutes: Math.max(
            disk.totalVoiceMinutes || 0,
            nextState.totalVoiceMinutes || 0
          ),
          completedCallSessions: Math.max(
            disk.completedCallSessions || 0,
            nextState.completedCallSessions || 0
          ),
        };
      } else {
        merged = {
          ...nextState,
          version: (nextState.version || 1) + 1,
          updatedAt: Date.now(),
          tabId: TAB_ID,
        };
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return nextState;
  }
}

export function checkPrerequisiteStatus(
  state: BraincoreStoreState,
  prereqCompetencyId: string
): { isReady: boolean; pMastery: number; stateLabel: MasteryStateName } {
  const comp =
    state.competencies[prereqCompetencyId] ||
    createBlankCompetency(prereqCompetencyId, BRAINCORE_PARAMS.P_INIT);
  const p = comp.pMasteryDecayed ?? comp.pMastery ?? BRAINCORE_PARAMS.P_INIT;
  return {
    isReady: p >= BRAINCORE_PARAMS.DEVELOPING_T,
    pMastery: p,
    stateLabel: comp.state,
  };
}

export function recordVocabPrereqMastery(
  state: BraincoreStoreState,
  prereqCompetencyId: string
): BraincoreStoreState {
  const existing =
    state.competencies[prereqCompetencyId] ||
    createBlankCompetency(prereqCompetencyId, BRAINCORE_PARAMS.P_INIT);
  const p1 = bktUpdate(existing.pMasteryDecayed ?? existing.pMastery, true, 0, 0.9);
  const p2 = bktUpdate(p1, true, 0, 0.9);
  const updatedComp: CompetencyRecord = {
    ...existing,
    pMastery: p2,
    pMasteryDecayed: p2,
    exposures: existing.exposures + 1,
    attempts: existing.attempts + 2,
    correct: existing.correct + 2,
    streak: existing.streak + 2,
    lastAt: Date.now(),
  };
  updatedComp.state = deriveMasteryState(updatedComp);

  const nextState: BraincoreStoreState = {
    ...state,
    competencies: {
      ...state.competencies,
      [prereqCompetencyId]: updatedComp,
    },
  };
  return saveBraincoreState(nextState);
}

/**
 * Record a real speaking turn evaluation into Braincore BKT, Misconception Ledger, Speaking History, and Sync Queue.
 */
export function recordSpeakingAttempt(
  state: BraincoreStoreState,
  params: {
    competencyId: string;
    scenarioId: string;
    targetLang?: TargetLang;
    userExactTranscript: string;
    ok: boolean;
    grammarScore?: number;
    fluencyScore?: number;
    vocabUsageScore?: number;
    accuracyScore?: number;
    speakingDurationSec?: number;
    misconceptionId: string | null;
    correctionPattern: string | null;
    hintsUsed: number;
    confidence: number;
    measureMode: boolean;
    isTransfer?: boolean;
  }
): {
  nextState: BraincoreStoreState;
  bktBefore: number;
  bktAfter: number;
  thetaAfter: number;
  masteryStateAfter: MasteryStateName;
} {
  const now = Date.now();
  const existing =
    state.competencies[params.competencyId] ||
    createBlankCompetency(params.competencyId, BRAINCORE_PARAMS.P_INIT);

  const elapsedDays = existing.lastAt ? Math.max(0, (now - existing.lastAt) / 86400_000) : 0;
  const startP = bktDecay(existing.pMastery, elapsedDays);
  const nextP = bktUpdate(startP, params.ok, params.hintsUsed, params.confidence);

  const nextStreak = params.ok ? existing.streak + 1 : 0;
  const nextCorrect = params.ok ? existing.correct + 1 : existing.correct;
  const prevMastered = existing.masteredAt;

  const updatedComp: CompetencyRecord = {
    ...existing,
    pMastery: nextP,
    pMasteryDecayed: nextP,
    exposures: Math.max(1, existing.exposures + 1),
    attempts: existing.attempts + 1,
    correct: nextCorrect,
    streak: nextStreak,
    hintsUsed: existing.hintsUsed + (params.hintsUsed || 0),
    lastAt: now,
  };

  const candidateState = deriveMasteryState(updatedComp);
  if (candidateState === 'MASTERED' && !prevMastered) {
    updatedComp.masteredAt = now;
    updatedComp.stabilityDays = 3.0;
  } else if (prevMastered && params.ok) {
    if (
      (now - prevMastered) / 86400_000 >= BRAINCORE_PARAMS.RETENTION_DAYS &&
      !updatedComp.retainedAt
    ) {
      updatedComp.retainedAt = now;
    }
    updatedComp.stabilityDays = Number(
      Math.min(180.0, (updatedComp.stabilityDays || 3.0) * 1.9).toFixed(2)
    );
  } else if (prevMastered && !params.ok) {
    updatedComp.stabilityDays = Number(
      Math.max(1.0, (updatedComp.stabilityDays || 3.0) * 0.5).toFixed(2)
    );
    updatedComp.retainedAt = null;
  }

  if (params.isTransfer && params.ok && nextP >= BRAINCORE_PARAMS.MASTERY_T) {
    updatedComp.transferredAt = updatedComp.transferredAt || now;
  }
  updatedComp.state = deriveMasteryState(updatedComp);

  // Update Misconception Ledger
  const nextLedger = { ...state.misconceptionLedger };
  if (!params.ok && params.misconceptionId) {
    const key = `${params.competencyId}::${params.misconceptionId}`;
    const prevEntry = nextLedger[key];
    nextLedger[key] = {
      competencyId: params.competencyId,
      misconceptionId: params.misconceptionId,
      frequency: (prevEntry?.frequency || 0) + 1,
      firstAt: prevEntry?.firstAt || now,
      lastAt: now,
      resolved: false,
      lastUtterance: params.userExactTranscript,
      correctionPattern: params.correctionPattern || prevEntry?.correctionPattern || '',
    };
  } else if (params.ok && nextStreak >= 2) {
    for (const k of Object.keys(nextLedger)) {
      if (nextLedger[k].competencyId === params.competencyId && !nextLedger[k].resolved) {
        nextLedger[k] = {
          ...nextLedger[k],
          resolved: true,
          lastAt: now,
        };
      }
    }
  }

  const queueItem = {
    id: `att_${now}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now,
    competencyId: params.competencyId,
    scenarioId: params.scenarioId,
    userTranscript: params.userExactTranscript,
    ok: params.ok,
    pMasteryBefore: startP,
    pMasteryAfter: nextP,
    misconceptionId: params.misconceptionId,
    hintsUsed: params.hintsUsed,
    confidence: params.confidence,
    measureMode: params.measureMode,
  };

  // Estimate speaking duration from word/character length if not explicitly measured by mic timer
  const wordCount = Math.max(1, params.userExactTranscript.trim().split(/\s+/).length);
  const estimatedSec =
    params.speakingDurationSec && params.speakingDurationSec > 0
      ? Math.round(params.speakingDurationSec)
      : Math.max(6, Math.min(45, wordCount * 2));

  const prevHistory = Array.isArray(state.speakingHistory)
    ? state.speakingHistory
    : getDefaultSpeakingHistory();
  const nextTurnNumber = prevHistory.length + 1;

  const newMetric: SpeakingSessionMetric = {
    id: `turn_metric_${now}_${Math.random().toString(36).slice(2, 6)}`,
    turnLabel: `Gilir #${nextTurnNumber}`,
    timestamp: now,
    scenarioId: params.scenarioId,
    competencyId: params.competencyId,
    targetLang: params.targetLang || state.targetLang || 'en',
    ok: params.ok,
    grammarScore: params.grammarScore ?? (params.ok ? 94 : 45),
    fluencyScore: params.fluencyScore ?? (params.ok ? 91 : 65),
    vocabUsageScore: params.vocabUsageScore ?? (params.ok ? 93 : 62),
    accuracyScore: params.accuracyScore ?? (params.ok ? 93 : 48),
    bktMasteryPct: Math.round(nextP * 100),
    speakingDurationSec: estimatedSec,
    userExactTranscript: params.userExactTranscript,
  };

  const nextTotalSpeakingSeconds = (state.totalSpeakingSeconds || 0) + estimatedSec;

  const nextState = saveBraincoreState({
    ...state,
    competencies: {
      ...state.competencies,
      [params.competencyId]: updatedComp,
    },
    misconceptionLedger: nextLedger,
    syncQueue: [...state.syncQueue, queueItem],
    speakingHistory: [...prevHistory.slice(-19), newMetric],
    totalSpeakingSeconds: nextTotalSpeakingSeconds,
    totalVoiceMinutes: Math.max(1, Math.round(nextTotalSpeakingSeconds / 60)),
  });

  bridgeAttemptToHostPwa(queueItem);

  return {
    nextState,
    bktBefore: startP,
    bktAfter: nextP,
    thetaAfter: abilityThetaFromMastery(nextP),
    masteryStateAfter: updatedComp.state,
  };
}

export async function brainSyncFlush(
  state: BraincoreStoreState
): Promise<{ nextState: BraincoreStoreState; flushedCount: number }> {
  if (!state.syncQueue || state.syncQueue.length === 0) {
    return { nextState: state, flushedCount: 0 };
  }
  try {
    const res = await fetch('/api/braincore/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tabId: state.tabId,
        attempts: state.syncQueue,
      }),
    });
    if (!res.ok) {
      return { nextState: state, flushedCount: 0 };
    }
    const data = await res.json();
    const acceptedIds = new Set<string>(data.acceptedIds || []);
    const remaining = state.syncQueue.filter((item) => !acceptedIds.has(item.id));
    const updated = saveBraincoreState({
      ...state,
      syncQueue: remaining,
    });
    return { nextState: updated, flushedCount: acceptedIds.size };
  } catch {
    return { nextState: state, flushedCount: 0 };
  }
}

export { STORAGE_KEY };
