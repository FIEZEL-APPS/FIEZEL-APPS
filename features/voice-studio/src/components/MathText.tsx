import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathSegment {
  kind: 'text' | 'math';
  raw: string;
  latex?: string;
  displayMode?: boolean;
}

const DELIM_RE =
  /(\$\$[^$\n]{1,220}\$\$|\\\[[^\]]{1,220}\\\]|\\\([^)]{1,180}\\\)|\$(?!\s)(?!\d+(?:[.,]\d+)?(?:\s|$))[^$\n]{1,120}(?<!\s)\$)/g;

const INLINE_STEM_RE =
  /(\\frac\{[^{}]+\}\{[^{}]+\}|\\sqrt\{[^{}]+\}|\b(?:[A-Za-zπ]|c\^2|a\^2|b\^2|x\^2|y\^2|r\^2)[A-Za-z0-9²³^()]*\s*(?:[+\-*/·×]\s*[A-Za-z0-9π²³^().]+)*\s*=\s*[A-Za-z0-9π²³^().]+(?:\s*[+\-*/·×]\s*[A-Za-z0-9π²³^().]+)*|(?:\b2\s*(?:\*|×|·)?\s*|(?=\bpi|π|\\pi))(?:\bpi|π|\\pi)\s*(?:\*|×|·)?\s*r(?:\^2|²|³)?(?![A-Za-z0-9_])|\b[A-Za-z0-9)]\^(?:\{[^{}]+\}|-?[0-9]+|[a-zA-Z])\b|\b\d+(?:\.\d+)?(?:\s*(?:\*|×|·)\s*(?:\d+(?:\.\d+)?|\bpi|π|[a-zA-Z](?:\^2|²)?))+(?![A-Za-z0-9_])|\b(?:H_?2O|CO_?2|O_?2|N_?2|H_?2SO_?4|NaCl)\b)/g;

function normalizeAsciiToLatex(expr: string): string {
  const trimmed = expr.trim();
  if (/^(?:H_?2O|H2O)$/i.test(trimmed)) return '\\mathrm{H_2O}';
  if (/^(?:CO_?2|CO2)$/i.test(trimmed)) return '\\mathrm{CO_2}';
  if (/^(?:O_?2|O2)$/i.test(trimmed)) return '\\mathrm{O_2}';
  if (/^(?:N_?2|N2)$/i.test(trimmed)) return '\\mathrm{N_2}';
  if (/^(?:H_?2SO_?4|H2SO4)$/i.test(trimmed)) return '\\mathrm{H_2SO_4}';
  return trimmed
    .replace(/\\{2,}(pi|frac|sqrt|times|cdot|alpha|beta|theta|sum|int)\b/g, '\\$1')
    .replace(/π/g, '\\pi ')
    .replace(/(?<!\\)\bpi\b/g, '\\pi ')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/×/g, ' \\times ')
    .replace(/\*/g, ' \\cdot ')
    .replace(/·/g, ' \\cdot ');
}

function isSafeInlineStemMatch(match: string): boolean {
  const t = match.trim();
  if (!t) return false;
  // Never catch English/Indonesian prose with digits unless it has true math operators/exponents/chemistry
  if (/=/.test(t)) {
    const hasMathCue = /[\^²³*·×π/]|\bpi\b|\b[a-zA-Z]\b\s*[+\-*/·×]\s*\b[a-zA-Z0-9]\b/.test(t);
    if (!hasMathCue) return false;
  }
  return true;
}

export function splitMathSegments(text: string): MathSegment[] {
  if (!text) return [];
  const out: MathSegment[] = [];
  let cursor = 0;

  const pushPlainWithAutoMath = (plain: string) => {
    if (!plain) return;
    INLINE_STEM_RE.lastIndex = 0;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = INLINE_STEM_RE.exec(plain)) !== null) {
      const matched = m[0];
      if (!isSafeInlineStemMatch(matched)) continue;
      if (m.index > last) {
        out.push({ kind: 'text', raw: plain.slice(last, m.index) });
      }
      out.push({
        kind: 'math',
        raw: matched,
        latex: normalizeAsciiToLatex(matched),
        displayMode: false,
      });
      last = m.index + matched.length;
    }
    if (last < plain.length) {
      out.push({ kind: 'text', raw: plain.slice(last) });
    }
  };

  DELIM_RE.lastIndex = 0;
  let dm: RegExpExecArray | null;
  while ((dm = DELIM_RE.exec(text)) !== null) {
    if (dm.index > cursor) {
      pushPlainWithAutoMath(text.slice(cursor, dm.index));
    }
    const token = dm[0];
    let inner = token;
    let displayMode = false;
    if (token.startsWith('$$') && token.endsWith('$$')) {
      inner = token.slice(2, -2);
      displayMode = true;
    } else if (token.startsWith('\\[') && token.endsWith('\\]')) {
      inner = token.slice(2, -2);
      displayMode = true;
    } else if (token.startsWith('\\(') && token.endsWith('\\)')) {
      inner = token.slice(2, -2);
    } else if (token.startsWith('$') && token.endsWith('$')) {
      inner = token.slice(1, -1);
    }
    out.push({
      kind: 'math',
      raw: token,
      latex: normalizeAsciiToLatex(inner),
      displayMode,
    });
    cursor = dm.index + token.length;
  }
  if (cursor < text.length) {
    pushPlainWithAutoMath(text.slice(cursor));
  }
  return out;
}

export function renderKatexSafe(latex: string, displayMode = false): string | null {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'html',
      strict: false,
    });
  } catch {
    return null;
  }
}

export const MathText: React.FC<{
  text?: string;
  terms?: string[];
  active?: boolean;
  emphasize?: boolean;
  className?: string;
  renderPlainSegment?: (segment: string, keyPrefix: string) => React.ReactNode;
}> = ({ text = '', terms = [], active = true, emphasize = false, className, renderPlainSegment }) => {
  if (!text) return null;
  const segments = splitMathSegments(text);
  const lowerTerms = new Set((terms || []).map((t) => String(t || '').trim().toLowerCase()).filter(Boolean));

  if (segments.every((s) => s.kind === 'text')) {
    return <>{renderPlainSegment ? renderPlainSegment(text, 'plain-0') : <span className={className}>{text}</span>}</>;
  }

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.kind === 'text') {
          return renderPlainSegment ? (
            <React.Fragment key={`t-${idx}`}>{renderPlainSegment(seg.raw, `seg-${idx}`)}</React.Fragment>
          ) : (
            <React.Fragment key={`t-${idx}`}>{seg.raw}</React.Fragment>
          );
        }
        const html = seg.latex ? renderKatexSafe(seg.latex, Boolean(seg.displayMode)) : null;
        if (!html) {
          return <React.Fragment key={`f-${idx}`}>{seg.raw}</React.Fragment>;
        }
        const isHighlighted =
          active &&
          (lowerTerms.has(seg.raw.trim().toLowerCase()) ||
            Array.from(lowerTerms).some((term) => term.length >= 3 && seg.raw.toLowerCase().includes(term)));
        return (
          <span
            key={`m-${idx}`}
            data-testid="wb-katex-math"
            className={`fz-katex-inline inline align-baseline mx-0.5 ${
              isHighlighted
                ? `fz-keyword-highlight rounded px-1 ${emphasize ? 'fz-keyword-highlight-active' : ''}`
                : ''
            }`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
};
