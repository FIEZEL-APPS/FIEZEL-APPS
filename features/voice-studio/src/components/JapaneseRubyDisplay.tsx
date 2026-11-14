import React from 'react';
import { renderFuriganaHtml, toPhoneticRomaji, stripEmojisAndEmotWords } from '../lib/japanesePhonetics';
import { renderMandarinRubyHtml, toPhoneticPinyin, containsHanzi } from '../lib/mandarinPhonetics';
import { resolveUnifiedPronunciation, looksAlreadyIndonesian } from '../lib/liveCallHelper';

export interface JapaneseRubyDisplayProps {
  text: string;
  targetLang?: 'en' | 'ja' | 'zh';
  showRomaji?: boolean;
  showFurigana?: boolean;
  phoneticText?: string;
  pronunciationTestId?: string;
  className?: string;
  rubyClassName?: string;
  romajiClassName?: string;
  as?: 'div' | 'span';
}

export const JapaneseRubyDisplay: React.FC<JapaneseRubyDisplayProps> = ({
  text,
  targetLang,
  showRomaji = true,
  showFurigana = true,
  phoneticText,
  pronunciationTestId,
  className = '',
  rubyClassName = '',
  romajiClassName = '',
  as = 'div',
}) => {
  const clean = stripEmojisAndEmotWords(text);
  if (!clean) return null;

  const examBodyLock =
    typeof document !== 'undefined' && Boolean(document.body?.classList?.contains('fz-exam-mode'));
  const allowFurigana = showFurigana && !examBodyLock;
  const allowRomaji = showRomaji && !examBodyLock;

  const Component = as;

  // Count CJK characters vs Latin words so a predominantly Indonesian/English sentence quoting 1-2 CJK characters
  // NEVER duplicates the entire Latin sentence as a fake Pinyin/Romaji line underneath!
  const hanziMatches = clean.match(/[\u3400-\u4DBF\u4E00-\u9FFF]/g) || [];
  const kanaMatches = clean.match(/[\u3040-\u30FF]/g) || [];
  const cjkCount = hanziMatches.length + kanaMatches.length;
  const latinWords = clean.match(/[A-Za-z]{3,}/g) || [];
  const isPredominantlyLatinSentence =
    latinWords.length >= 4 && latinWords.length > cjkCount * 2;

  const cjkSpans = (clean.match(/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]+/g) || []).join(' · ');
  const pinyinSource = isPredominantlyLatinSentence ? cjkSpans : clean;
  const romajiSource = isPredominantlyLatinSentence ? cjkSpans : clean;

  // 1. MANDARIN CHINESE (targetLang === 'zh' OR explicitly contains Hanzi without Japanese Kana)
  const isMandarin =
    (targetLang === 'zh' && containsHanzi(clean)) ||
    (containsHanzi(clean) && !/[\u3040-\u30FF]/.test(clean) && targetLang !== 'ja');

  if (isMandarin) {
    const rubyHtml = renderMandarinRubyHtml(clean, { hideRuby: !allowFurigana });
    const pinyin = allowRomaji && pinyinSource ? toPhoneticPinyin(pinyinSource) : '';

    return (
      <Component
        className={`fz-zh-display-wrap ${
          as === 'span' ? 'inline-block align-middle' : 'space-y-1'
        } ${className}`}
      >
        {/* 1. Baris Teks Utama Mandarin dengan Pinyin Ruby di atas Hanzi */}
        <span
          lang="zh-CN"
          data-testid="mandarin-ruby-text"
          className={`fz-zh-ruby-text leading-[2.6] pt-1.5 break-words block ${rubyClassName}`}
          dangerouslySetInnerHTML={{ __html: rubyHtml }}
        />

        {/* 2. Baris Pinyin Fonetik Bersih Tanpa Hanzi */}
        {allowRomaji && pinyin && (
          <span
            lang="zh-Latn"
            data-testid={pronunciationTestId || 'mandarin-pinyin-text'}
            className={`fz-zh-pinyin-text block text-[11px] sm:text-xs text-[#BE123C] font-semibold tracking-wide break-words leading-relaxed ${romajiClassName}`}
          >
            {pinyin}
          </span>
        )}
      </Component>
    );
  }

  // 2. JAPANESE (targetLang === 'ja' OR contains Kana/Kanji)
  const isJapanese =
    (targetLang === 'ja' && cjkCount > 0) ||
    /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/.test(clean);

  if (isJapanese) {
    const furiganaHtml = renderFuriganaHtml(clean, { hideFurigana: !allowFurigana });
    const romaji = allowRomaji && romajiSource ? toPhoneticRomaji(romajiSource) : '';

    return (
      <Component
        className={`fz-ja-display-wrap ${
          as === 'span' ? 'inline-block align-middle' : 'space-y-1.5'
        } ${className}`}
      >
        {/* 1. Baris Teks Utama Jepang dengan Furigana Ruby di atas Kanji */}
        <span
          lang="ja"
          data-testid="japanese-ruby-text"
          className={`fz-ja-ruby-text leading-[2.6] pt-1.5 break-words block ${rubyClassName}`}
          dangerouslySetInnerHTML={{ __html: furiganaHtml }}
        />

        {/* 2. Baris Romaji Fonetik Eksak Bersih Tanpa Kanji/Kana */}
        {allowRomaji && romaji && (
          <span
            lang="ja-Latn"
            data-testid={pronunciationTestId || 'japanese-romaji-text'}
            className={`fz-ja-romaji-text block text-[11px] sm:text-xs text-[#8C6D1F] font-medium tracking-wide break-words leading-relaxed ${romajiClassName}`}
          >
            {romaji}
          </span>
        )}
      </Component>
    );
  }

  // 3. ENGLISH / LATIN (unified phonetic Cara Baca when showRomaji is enabled)
  // Guard: never run English phonetics on Bahasa Indonesia prose (e.g. SSW Sensei bilingual dialogue).
  const isIndonesianProse = looksAlreadyIndonesian(clean);
  const safePhoneticProp =
    phoneticText && !looksAlreadyIndonesian(phoneticText) ? phoneticText : '';
  const phoneticEn =
    allowRomaji &&
    !isIndonesianProse &&
    (targetLang === 'en' || Boolean(safePhoneticProp)) &&
    /[A-Za-z]{2,}/.test(clean)
      ? resolveUnifiedPronunciation(clean, 'en', safePhoneticProp)
      : '';

  if (allowRomaji && phoneticEn) {
    return (
      <Component
        className={`fz-en-display-wrap ${
          as === 'span' ? 'inline-block align-middle' : 'space-y-1'
        } ${className}`}
      >
        <span lang="en" className={`break-words block ${rubyClassName}`}>
          {clean}
        </span>
        <span
          lang="id-Latn"
          data-testid={pronunciationTestId || 'english-phonetic-text'}
          className={`fz-en-phonetic-text block text-[11px] sm:text-xs text-[#6B5A48] font-medium tracking-wide break-words leading-relaxed ${romajiClassName}`}
        >
          {phoneticEn}
        </span>
      </Component>
    );
  }

  return <span className={className}>{clean}</span>;
};

export const CjkRubyDisplay = JapaneseRubyDisplay;
