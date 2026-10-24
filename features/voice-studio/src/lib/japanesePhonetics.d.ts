export interface RubyToken {
  text: string;
  ruby?: string;
  isKanji: boolean;
}

export interface JapaneseAnalysisResult {
  raw: string;
  furiganaHtml: string;
  romaji: string;
}

export declare function katakanaToHiragana(text: string): string;
export declare function stripEmojisAndEmotWords(text: string): string;
export declare function tokenizeJapaneseToRuby(rawText: string): RubyToken[];
export declare function renderFuriganaHtml(rawText: string): string;
export declare function kanaStringToRomaji(kanaStr: string): string;
export declare function toPhoneticRomaji(text: string): string;
export declare function analyzeJapaneseText(text: string): JapaneseAnalysisResult;
