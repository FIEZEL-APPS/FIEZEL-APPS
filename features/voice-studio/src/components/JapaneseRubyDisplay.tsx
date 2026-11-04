import React from 'react';
import { renderFuriganaHtml, toPhoneticRomaji, stripEmojisAndEmotWords } from '../lib/japanesePhonetics';
import { renderMandarinRubyHtml, toPhoneticPinyin, containsHanzi } from '../lib/mandarinPhonetics';

export interface JapaneseRubyDisplayProps {
  text: string;
  targetLang?: 'en' | 'ja' | 'zh';
  showRomaji?: boolean;
  showFurigana?: boolean;
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

  // 1. MANDARIN CHINESE (targetLang === 'zh' OR explicitly contains Hanzi without Japanese Kana)
  const isMandarin =
    targetLang === 'zh' ||
    (containsHanzi(clean) && !/[\u3040-\u30FF]/.test(clean) && targetLang !== 'ja');

  if (isMandarin) {
    const rubyHtml = renderMandarinRubyHtml(clean, { hideRuby: !allowFurigana });
    const pinyin = allowRomaji ? toPhoneticPinyin(clean) : '';

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
          className={`fz-zh-ruby-text leading-[2.2] pt-1 break-words block ${rubyClassName}`}
          dangerouslySetInnerHTML={{ __html: rubyHtml }}
        />

        {/* 2. Baris Pinyin Fonetik Bersih Tanpa Hanzi */}
        {allowRomaji && pinyin && (
          <span
            lang="zh-Latn"
            data-testid="mandarin-pinyin-text"
            className={`fz-zh-pinyin-text block text-[11px] sm:text-xs text-[#BE123C] font-semibold tracking-wide break-words leading-tight ${romajiClassName}`}
          >
            {pinyin}
          </span>
        )}
      </Component>
    );
  }

  // 2. JAPANESE (targetLang === 'ja' OR contains Kana/Kanji)
  const isJapanese =
    targetLang === 'ja' || /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/.test(clean);

  if (isJapanese) {
    const furiganaHtml = renderFuriganaHtml(clean, { hideFurigana: !allowFurigana });
    const romaji = allowRomaji ? toPhoneticRomaji(clean) : '';

    return (
      <Component
        className={`fz-ja-display-wrap ${
          as === 'span' ? 'inline-block align-middle' : 'space-y-1'
        } ${className}`}
      >
        {/* 1. Baris Teks Utama Jepang dengan Furigana Ruby di atas Kanji */}
        <span
          lang="ja"
          data-testid="japanese-ruby-text"
          className={`fz-ja-ruby-text leading-[2.2] pt-1 break-words block ${rubyClassName}`}
          dangerouslySetInnerHTML={{ __html: furiganaHtml }}
        />

        {/* 2. Baris Romaji Fonetik Eksak Bersih Tanpa Kanji/Kana */}
        {allowRomaji && romaji && (
          <span
            lang="ja-Latn"
            data-testid="japanese-romaji-text"
            className={`fz-ja-romaji-text block text-[11px] sm:text-xs text-[#8C6D1F] font-medium tracking-wide break-words leading-tight ${romajiClassName}`}
          >
            {romaji}
          </span>
        )}
      </Component>
    );
  }

  // 3. ENGLISH / LATIN (plain text)
  return <span className={className}>{clean}</span>;
};

export const CjkRubyDisplay = JapaneseRubyDisplay;
