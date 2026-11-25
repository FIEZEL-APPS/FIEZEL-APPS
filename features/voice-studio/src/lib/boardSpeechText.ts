/**
 * Satu sumber kebenaran (SSOT) untuk teks tampilan & teks tutur papan tulis.
 *
 * Modul ini sengaja TIDAK mengimpor `liveTransport` maupun `whiteboardDirector` agar keduanya
 * bisa memakainya tanpa siklus impor. Teks pembuka yang di-pre-warm saat SSE `opener` tiba
 * (App.tsx, liveTransport.ts) dan teks Chunk-0 yang diminta papan saat board lengkap tiba
 * (whiteboardDirector -> InCallLearningWorkbenchModal) kini dihitung dengan fungsi yang SAMA,
 * sehingga cache TTS selalu hit dan suara pembuka langsung bunyi tanpa sintesis ulang.
 */

export interface OpenerHeadingLike {
  id?: string;
  title?: string;
  text?: string;
  spokenNarration?: string;
}

export interface OpenerPacketLike {
  topicTitle?: string;
  patternFormula?: string;
  headingStep?: OpenerHeadingLike | null;
}

export function cleanBoardDisplayText(val: unknown): string {
  return String(val ?? '')
    .replace(/\s*[\u2014\u2013]\s*/g, ', ')
    .replace(/\(\s*\)|（\s*）|\[\s*\]|\{\s*\}/g, '')
    .replace(
      /(['"`]?\b(?:agree|know|believe|like|want|understand)\b['"`]?\s+(?:adalah|merupakan)\s+)(?:kata\s+kerja\s+aksi(?:\s*\([^)]*\))?|aksi\s+atau\s+(?:kata\s+kerja|tindakan)|aksi\b)/gi,
      '$1kata kerja utama (stative verb)'
    )
    .replace(
      /\b([Kk])ata\s+kerja\s+aksi(\s*\([^)]*\b(?:agree|know|believe|like|want|understand)\b[^)]*\))/g,
      '$1ata kerja utama$2'
    )
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/,\s*,+/g, ',')
    .replace(/([,:•])\s*$/g, (_m, ch) => (ch === ':' ? ':' : ''))
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Narasi tutur langkah `heading` (dipakai deriveStepSpokenNarration & pre-warm opener). */
export function deriveHeadingSpokenNarration(step: OpenerHeadingLike, topicTitle: string): string {
  const existing = cleanBoardDisplayText(step.spokenNarration || '')
    .replace(/(?:^|[.!?]\s*)Visualisasi\s+(?:Aksi|Lokasi|Konsep|Kalimat|Struktur|Pola)(?:\s+\w+){0,2}\.(?=\s|$)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const existingWords = existing.split(/\s+/).filter(Boolean).length;
  if (existingWords >= 6) {
    return /[.!?。！？]$/.test(existing) ? existing : `${existing}.`;
  }
  const subTxt = cleanBoardDisplayText(step.text || '');
  return `${cleanBoardDisplayText(step.title || topicTitle)}${subTxt ? `. ${subTxt}` : ''}.`
    .replace(/\.{2,}/g, '.')
    .trim();
}

function humanizeLatexForSpeech(str: string): string {
  if (!str || (!str.includes('$') && !str.includes('\\'))) return str;
  return str
    .replace(/\$\$/g, ' ')
    .replace(/\$([^$]+)\$/g, ' $1 ')
    .replace(/\\text\s*\{([^}]*)\}/g, ' $1 ')
    .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '$1 per $2')
    .replace(/\\sqrt\s*\{([^}]*)\}/g, 'akar $1')
    .replace(/\\(?:cdot|times)\b/g, ' kali ')
    .replace(/\\implies\b/g, ' menjadi ')
    .replace(/\\pi\b/g, ' pi ')
    .replace(/\^2\b/g, ' kuadrat')
    .replace(/\^3\b/g, ' pangkat tiga')
    .replace(/[{}]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Caption (ditampilkan) + teks tutur (dikirim ke TTS) untuk satu langkah papan. */
export function cleanStepCaptionAndSpokenText(rawNarration: string): { caption: string; spokenText: string } {
  const caption = humanizeLatexForSpeech(cleanBoardDisplayText(rawNarration || ''))
    .replace(
      /\b(?:perhatikan|dengar(?:kan)?|simak|catat)\s+baik[- ]?baik(?:\s+pembagian\s+tugasnya|\s+aturan\s+ini|\s+kawan|\s+ya)?[,!.:;\s]*/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
  const cleaned = caption
    .replace(/[•|]/g, ', ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/(?:,\s*){2,}/g, ', ')
    .replace(/^,\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  const spokenText = !cleaned ? '' : /[.!?。！？]$/.test(cleaned) ? cleaned : `${cleaned}.`;
  return { caption, spokenText };
}

/**
 * Teks tutur penuh Langkah 0 yang AKAN diucapkan papan untuk paket `opener` ini.
 * Pemanggil memotongnya dengan `splitTtsIntoSentenceChunks(text, 145)[0]` (persis seperti papan).
 */
export function openerSpokenText(opener?: OpenerPacketLike | null): string {
  if (!opener) return '';
  const h = opener.headingStep || {};
  const title = cleanBoardDisplayText(h.title || opener.topicTitle || '');
  const narration = deriveHeadingSpokenNarration(
    {
      title,
      text: cleanBoardDisplayText(h.text || ''),
      spokenNarration: h.spokenNarration || '',
    },
    title
  );
  if (!narration || narration === '.') return '';
  return cleanStepCaptionAndSpokenText(narration).spokenText;
}
