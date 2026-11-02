import React, { useState, useEffect, useRef } from 'react';
import { TargetLang, LearnerLocale } from '../types/voiceCall';

export interface HarvestedVocabItem {
  id: string;
  term: string;
  reading?: string;
  meaningId: string;
  meaningTh: string;
  contextSentence: string;
  timestamp: number;
}

interface FiezelInCallVocabCaptureProps {
  activeAiText: string;
  activeAiTranslation: string;
  userText?: string;
  targetLang: TargetLang;
  locale: LearnerLocale;
  isCallActive: boolean;
  onSaveToFsrs?: (item: HarvestedVocabItem) => void;
}

// Common conversational query patterns for word meaning
const MEANING_QUERY_REGEX = /(?:apa artinya|artinya apa|maksudnya apa|apa itu|arti dari|what does .* mean|meaning of)/i;

export const FiezelInCallVocabCapture: React.FC<FiezelInCallVocabCaptureProps> = ({
  activeAiText,
  activeAiTranslation,
  userText = '',
  targetLang,
  locale,
  isCallActive,
  onSaveToFsrs,
}) => {
  const [capturedItem, setCapturedItem] = useState<HarvestedVocabItem | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<number | null>(null);
  const seenTermsRef = useRef<Set<string>>(new Set());

  // Deteksi trigger penangkapan kata secara realtime
  useEffect(() => {
    if (!isCallActive) {
      setIsVisible(false);
      return;
    }

    // 1. Trigger via Pertanyaan Murid: "Apa artinya ...?"
    if (userText && MEANING_QUERY_REGEX.test(userText)) {
      // Ambil kata kunci dari konteks AI terakhir
      if (activeAiText && activeAiText.trim().length > 0) {
        const words = activeAiText.trim().split(/[\s、。！？,.!?]+/);
        const candidate = words.find(w => w.length >= 2 && !seenTermsRef.current.has(w)) || words[0];
        if (candidate) {
          triggerCapture(candidate, activeAiTranslation || 'Kosakata percakapan aktif');
          return;
        }
      }
    }

    // 2. Trigger Otomatis: Kosakata Kunci Percakapan Baru dari AI
    if (activeAiText && activeAiText.length >= 4) {
      // Ekstraksi segmen kata bermakna (untuk Jepang: Kanji compound; untuk Inggris: kata >= 6 huruf)
      let extracted: string | null = null;
      if (targetLang === 'ja') {
        const kanjiMatch = activeAiText.match(/[\u4e00-\u9faf]{2,}/);
        if (kanjiMatch && !seenTermsRef.current.has(kanjiMatch[0])) {
          extracted = kanjiMatch[0];
        }
      } else {
        const enWords = activeAiText.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, ''));
        const longWord = enWords.find(w => w.length >= 6 && !seenTermsRef.current.has(w.toLowerCase()));
        if (longWord) {
          extracted = longWord;
        }
      }

      if (extracted) {
        triggerCapture(extracted, activeAiTranslation || 'Kosakata dari percakapan');
      }
    }
  }, [activeAiText, activeAiTranslation, userText, isCallActive, targetLang]);

  const triggerCapture = (term: string, meaning: string) => {
    seenTermsRef.current.add(term.toLowerCase());
    const item: HarvestedVocabItem = {
      id: `fsrs-cap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      term,
      meaningId: meaning,
      meaningTh: meaning,
      contextSentence: activeAiText,
      timestamp: Date.now()
    };

    setCapturedItem(item);
    setIsSaved(false);
    setIsVisible(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, 6000);
  };

  const handleSave = () => {
    if (!capturedItem || isSaved) return;

    setIsSaved(true);

    // 1. Simpan ke antrean Braincore FSRS Spaced Repetition di localStorage
    try {
      const KEY = 'fz_fsrs_harvested_queue';
      const existing = JSON.parse(localStorage.getItem(KEY) || '[]');
      existing.push(capturedItem);
      localStorage.setItem(KEY, JSON.stringify(existing));
    } catch (_) {}

    // 2. Dispatch custom event untuk listener FSRS global
    try {
      window.dispatchEvent(new CustomEvent('fz:vocab-harvested', { detail: capturedItem }));
    } catch (_) {}

    // 3. Callback parent jika ada
    if (onSaveToFsrs) {
      onSaveToFsrs(capturedItem);
    }

    // Auto dismiss setelah disimpan
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, 1500);
  };

  if (!isVisible || !capturedItem) return null;

  return (
    <aside
      className="fz-in-call-capture"
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: '16px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: 'rgba(27, 20, 24, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '14px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
        color: '#ffffff'
      }}
    >
      <div className="fz-capture-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '70%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#00E5FF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Braincore Harvest
          </span>
        </div>
        <span className="fz-capture-word" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>
          {capturedItem.term}
        </span>
        <span className="fz-capture-meaning" style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.72)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {locale === 'th' ? capturedItem.meaningTh : capturedItem.meaningId}
        </span>
      </div>

      <button
        type="button"
        className="fz-capture-save-btn"
        onClick={handleSave}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          background: isSaved ? '#10B981' : 'linear-gradient(135deg, #0284c7, #2563eb)',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.82rem',
          borderRadius: '20px',
          border: 'none',
          cursor: isSaved ? 'default' : 'pointer',
          boxShadow: isSaved ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(37, 99, 235, 0.3)',
          transition: 'all 160ms ease',
          shrink: 0
        }}
      >
        {isSaved ? '✓ Tersimpan' : '+ Simpan ke Kartu'}
      </button>
    </aside>
  );
};
