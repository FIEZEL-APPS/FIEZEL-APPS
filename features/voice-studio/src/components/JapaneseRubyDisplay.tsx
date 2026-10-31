import React from 'react';
import { renderFuriganaHtml, toPhoneticRomaji, stripEmojisAndEmotWords } from '../lib/japanesePhonetics';

interface JapaneseRubyDisplayProps {
  text: string;
  targetLang?: 'en' | 'ja';
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

  const isJapanese = targetLang === 'ja' || /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]/.test(clean);

  if (!isJapanese) {
    return <span className={className}>{clean}</span>;
  }

  const examBodyLock =
    typeof document !== 'undefined' && Boolean(document.body?.classList?.contains('fz-exam-mode'));
  const allowFurigana = showFurigana && !examBodyLock;
  const allowRomaji = showRomaji && !examBodyLock;

  const furiganaHtml = renderFuriganaHtml(clean, { hideFurigana: !allowFurigana });
  const romaji = allowRomaji ? toPhoneticRomaji(clean) : '';

  const Component = as;

  return (
    <Component className={`fz-ja-display-wrap ${as === 'span' ? 'inline-block align-middle' : 'space-y-0.5'} ${className}`}>
      {/* 1. Baris Teks Utama dengan Furigana Ruby di atas Kanji (otomatis tersembunyi di Mode Ujian) */}
      <span
        lang="ja"
        data-testid="japanese-ruby-text"
        className={`fz-ja-ruby-text leading-relaxed break-words block ${rubyClassName}`}
        dangerouslySetInnerHTML={{ __html: furiganaHtml }}
      />

      {/* 2. Baris Romaji Fonetik Eksak (partikel は = wa, を = o, へ = e) */}
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
};
