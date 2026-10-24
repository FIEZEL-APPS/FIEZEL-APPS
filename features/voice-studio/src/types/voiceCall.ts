export type LearnerLocale = 'id' | 'th';
export type TargetLang = 'en' | 'ja';
export type MasteryStateName =
  | 'NOT_EXPOSED'
  | 'EXPOSED'
  | 'PRACTICING'
  | 'DEVELOPING'
  | 'MASTERED'
  | 'RETAINED'
  | 'TRANSFERRED';

export interface VoicePersona {
  id: string;
  name: string;
  roleId: string;
  roleTh: string;
  geminiVoice: 'Puck' | 'Kore' | 'Charon' | 'Fenrir' | 'Zephyr';
  edgeVoice: string;
  targetLang: TargetLang;
  levelRange: string;
  avatarUrl: string;
  accentLabel: string;
  speakingStyle: string;
  systemPrompt: string;
}

export interface VocabPrereqItem {
  id: string;
  term: string;
  reading?: string;
  meaningId: string;
  meaningTh: string;
  exampleSentence: string;
}

export interface CallScenario {
  id: string;
  titleId: string;
  titleTh: string;
  subtitleId: string;
  subtitleTh: string;
  targetLang: TargetLang;
  level: string;
  difficultyB: number; // IRT 3PL item difficulty (-1.0 .. +5.0)
  competencyId: string;
  competencyNameId: string;
  competencyNameTh: string;
  prereqCompetencyId?: string;
  personaId: string;
  isMeasureExam: boolean; // If true, Anti-Leak Exam Purity applies (zero hints/peek)
  situationId: string;
  situationTh: string;
  openingLine: string;
  openingTranslationId: string;
  openingTranslationTh: string;
  missionGoalsId: string[];
  missionGoalsTh: string[];
  targetPatterns: string[];
  vocabPrereqs: VocabPrereqItem[];
  sampleUtterances: {
    labelId: string;
    labelTh: string;
    text: string;
    intent: 'accurate' | 'misconception' | 'incomplete';
  }[];
}

export interface TurnDiagnosis {
  ok: boolean;
  accuracyScore: number; // 0..100
  grammarScore: number; // 0..100
  fluencyScore: number; // 0..100
  vocabUsageScore: number; // 0..100
  userExactTranscript: string; // Zero-Loss Input: exact student text
  misconceptionId: string | null;
  whyFailsId: string | null;
  whyFailsTh: string | null;
  missingTokens: string[];
  syntacticCorrection: string | null;
  naturalReformulation: string;
  pedagogicalFeedbackId: string;
  pedagogicalFeedbackTh: string;
  bktBefore: number;
  bktAfter: number;
  thetaAfter: number;
  masteryStateAfter: MasteryStateName;
}

export interface CallTurn {
  id: string;
  speaker: 'ai' | 'user';
  text: string;
  translationId?: string;
  translationTh?: string;
  timestamp: number;
  audioBase64?: string;
  audioMimeType?: string;
  confidence?: number;
  hintsUsed?: number;
  speakingDurationSec?: number;
  diagnosis?: TurnDiagnosis;
  /** m025-637: honest provenance of an AI line ('ai' | 'ai-gemini-key' | 'offline-template'). */
  replySource?: 'ai' | 'ai-gemini-key' | 'offline-template';
}

export interface SpeakingSessionMetric {
  id: string;
  turnLabel: string;
  timestamp: number;
  scenarioId: string;
  competencyId: string;
  targetLang: TargetLang;
  ok: boolean;
  grammarScore: number;
  fluencyScore: number;
  vocabUsageScore: number;
  accuracyScore: number;
  bktMasteryPct: number;
  speakingDurationSec: number;
  userExactTranscript: string;
}

export interface CompetencyRecord {
  competencyId: string;
  pMastery: number;
  pMasteryDecayed: number;
  state: MasteryStateName;
  exposures: number;
  attempts: number;
  correct: number;
  streak: number;
  hintsUsed: number;
  stabilityDays: number;
  lastAt: number | null;
  masteredAt: number | null;
  retainedAt: number | null;
  transferredAt: number | null;
}

export interface MisconceptionLedgerEntry {
  competencyId: string;
  misconceptionId: string;
  frequency: number;
  firstAt: number;
  lastAt: number;
  resolved: boolean;
  lastUtterance: string;
  correctionPattern: string;
}

export interface BrainSyncQueueItem {
  id: string;
  timestamp: number;
  competencyId: string;
  scenarioId: string;
  userTranscript: string;
  ok: boolean;
  pMasteryBefore: number;
  pMasteryAfter: number;
  misconceptionId: string | null;
  hintsUsed: number;
  confidence: number;
  measureMode: boolean;
}

export interface BraincoreStoreState {
  version: number;
  updatedAt: number;
  tabId: string;
  learnerLocale: LearnerLocale;
  targetLang: TargetLang;
  competencies: Record<string, CompetencyRecord>;
  misconceptionLedger: Record<string, MisconceptionLedgerEntry>;
  syncQueue: BrainSyncQueueItem[];
  speakingHistory: SpeakingSessionMetric[];
  totalVoiceMinutes: number;
  totalSpeakingSeconds: number;
  completedCallSessions: number;
}
