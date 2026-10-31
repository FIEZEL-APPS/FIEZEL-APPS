export interface RubyToken {
  text: string;
  ruby?: string;
  isKanji: boolean;
}

export interface FuriganaSegment {
  ruby: string;
  rt?: string;
}

export interface RenderFuriganaOptions {
  hideFurigana?: boolean;
  splitCompounds?: boolean;
  singleKanjiMap?: Record<string, unknown> | null;
}

export interface JapaneseAnalysisResult {
  raw: string;
  furiganaHtml: string;
  romaji: string;
}

export declare function katakanaToHiragana(text: string): string;
export declare function stripEmojisAndEmotWords(text: string): string;
export declare function solveFuriganaSegments(
  surface: string,
  rawReading: string,
  singleKanjiMap?: Record<string, unknown> | null
): FuriganaSegment[];
export declare function tokenizeJapaneseToRuby(rawText: string): RubyToken[];
export declare function renderFuriganaHtml(rawText: string, opts?: RenderFuriganaOptions): string;
export declare function kanaStringToRomaji(kanaStr: string): string;
export declare function toPhoneticRomaji(text: string): string;
export declare function analyzeJapaneseText(text: string): JapaneseAnalysisResult;
