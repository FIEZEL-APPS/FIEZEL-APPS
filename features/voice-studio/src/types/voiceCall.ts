export type LearnerLocale = 'id' | 'th' | 'ja' | 'en' | 'zh' | 'vi' | 'ru' | 'ko' | 'ms' | (string & {});
export type TargetLang = 'en' | 'ja' | 'zh';
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
  geminiVoice: 'Puck' | 'Kore' | 'Charon' | 'Fenrir' | 'Zephyr' | 'Aoede';
  edgeVoice: string;
  targetLang: TargetLang;
  levelRange: string;
  avatarUrl: string;
  accentLabel: string;
  speakingStyle: string;
  ttsStylePrompt?: string;
  systemPrompt: string;
  personalityTagId?: string;
  personalityTagTh?: string;
  openingGreeting?: string;
  openingGreetingTranslationId?: string;
  openingGreetingTranslationTh?: string;
  roastStyleId?: string;
  roastStyleTh?: string;
}

export type CallMode = 'tutor_coach' | 'casual_chat';

export interface VoiceUiAction {
  actionType:
    | 'none'
    | 'open_learning_popup'
    | 'close_learning_popup'
    | 'reroll_quiz'
    | 'switch_exercise_mode'
    | 'navigate_app'
    | 'switch_call_mode';
  destination?: string;
  callMode?: CallMode;
  exerciseMode?: 'multiple_choice' | 'cloze_gap' | 'sentence_blocks';
  course?: TargetLang;
  /** Layer 1 Fiezel Bank ID (e.g. 'en_since_for', 'en_did_does', 'ja_ni_de') or 'custom_dynamic' for Layer 2 AI */
  bankTopicId?: string;
  sourceLayer?: 'bank' | 'ai_dynamic' | 'live_ws_native';
  topicTitle?: string;
  focusType?: 'grammar' | 'vocab' | 'kanji_hanzi' | 'pronunciation' | 'kanji' | 'kana' | 'sentence_drill' | string;
  explanationText?: string;
  patternFormula?: string;
  drillInstruction?: string;
  sampleTarget?: string;
  /** Dynamic AI Whiteboard Spotlight fields, generated on the fly for ANY learner question */
  coachSpokenScript?: string;
  leadText?: string;
  triggerWord?: string;
  triggerTag?: string;
  wrongWord?: string;
  wrongTag?: string;
  rightWord?: string;
  rightTag?: string;
  tailText?: string;
  trapWrongSentence?: string;
  trapWrongToken?: string;
  trapWrongReason?: string;
  drillMeaningPrompt?: string;
  drillTargetSentence?: string;
  drillTrapSentence?: string;
  drillBlocks?: string[];
  drillDistractors?: string[];
  /** Contoh ke-2 (Analogi Lebih Simpel) saat user klik "Masih bingung, kasih contoh lain" */
  secondCoachScript?: string;
  secondLeadText?: string;
  secondTriggerWord?: string;
  secondTriggerTag?: string;
  secondWrongWord?: string;
  secondWrongTag?: string;
  secondRightWord?: string;
  secondRightTag?: string;
  secondTailText?: string;
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
  translationJa?: string;
  translationZh?: string;
  timestamp: number;
  audioBase64?: string;
  audioMimeType?: string;
  confidence?: number;
  hintsUsed?: number;
  speakingDurationSec?: number;
  diagnosis?: TurnDiagnosis;
  /** Provenance of an AI line: strictly online AI ('ai' via 16-key pool or 'ai-gemini-key' via learner key). */
  replySource?: 'ai' | 'ai-gemini-key';
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

export type LearnerCharacterArchetype =
  | 'hesitant_shy'
  | 'fast_careless'
  | 'stiff_textbook'
  | 'balanced_growing'
  | 'confident_natural';

export interface ChronicGrammarWeakness {
  misconceptionId: string;
  labelId: string;
  labelTh: string;
  hits: number;
  resolvedHits: number;
  lastBrokenUtterance: string;
  targetFixPattern: string;
  lastSeenAt: number;
  active: boolean;
}

export interface MentorSessionMemoryEntry {
  sessionId: string;
  timestamp: number;
  scenarioId: string;
  personaId: string;
  targetLang: TargetLang;
  turnCount: number;
  durationSec: number;
  mistakesCaught: string[];
  strengthsObserved: string[];
  topicsDiscussed: string[];
  mentorTakeaway: string;
}

export interface DualBrainMemoryState {
  userBrain: {
    learnerName: string;
    activeCourseLevel: string;
    characterArchetype: LearnerCharacterArchetype;
    characterNoteId: string;
    characterNoteTh: string;
    personalFacts: string[];
    verifiedStrengths: string[];
    chronicWeaknesses: Record<string, ChronicGrammarWeakness>;
    updatedAt: number;
  };
  mentorBrain: {
    totalMentoredTurns: number;
    activeFocusAssignment: string;
    lastRoastTheme: string;
    rapportNotes: string[];
    sessionSummaries: MentorSessionMemoryEntry[];
    updatedAt: number;
  };
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
  dualBrainMemory?: DualBrainMemoryState;
}
