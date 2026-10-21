import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { LearnerLocale, SpeakingSessionMetric } from '../types/voiceCall';
import { t } from '../lib/i18n';

interface SpeakingProgressDashboardProps {
  locale: LearnerLocale;
  speakingHistory: SpeakingSessionMetric[];
  totalSpeakingSeconds: number;
  liveCallSeconds?: number;
}

function formatSpeakingDuration(totalSeconds: number, locale: LearnerLocale): string {
  const sec = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (locale === 'th') {
    return `${mins}น. ${String(remSec).padStart(2, '0')}ว.`;
  }
  return `${mins}m ${String(remSec).padStart(2, '0')}d`;
}

export const SpeakingProgressDashboard: React.FC<SpeakingProgressDashboardProps> = ({
  locale,
  speakingHistory,
  totalSpeakingSeconds,
  liveCallSeconds = 0,
}) => {
  const metrics = useMemo(() => {
    const list = speakingHistory.length > 0 ? speakingHistory : [];
    if (list.length === 0) {
      return { avgFluency: 0, avgGrammar: 0, correctTurns: 0, totalTurns: 0 };
    }
    const avgFluency = Math.round(
      list.reduce((acc, item) => acc + item.fluencyScore, 0) / list.length
    );
    const avgGrammar = Math.round(
      list.reduce((acc, item) => acc + item.grammarScore, 0) / list.length
    );
    const correctTurns = list.filter((item) => item.ok).length;
    return { avgFluency, avgGrammar, correctTurns, totalTurns: list.length };
  }, [speakingHistory]);

  const combinedSeconds = totalSpeakingSeconds + liveCallSeconds;

  return (
    <section
      data-testid="speaking-progress-dashboard"
      aria-label={t(locale, 'dash.title')}
      className="bg-white border border-[#F0E4CF] rounded-2xl p-5 space-y-4"
    >
      {/* Minimal Header + Inline Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-[#241A11]">
          {locale === 'th' ? 'สถิติการพูดในเซสชันนี้' : 'Ringkasan Progres Bicara'}
        </h2>
        <div className="flex items-center gap-3 text-xs text-[#6E5E47]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2E8B69]" aria-hidden="true" />
            Grammar
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#E6A800]" aria-hidden="true" />
            Fluency
          </span>
        </div>
      </div>

      {/* 3 Clean Unboxed Stats with Hairline Dividers */}
      <div className="grid grid-cols-3 divide-x divide-[#F0E4CF] border-y border-[#F0E4CF] py-3">
        <div data-testid="stat-fluency-card" className="pr-4">
          <div className="text-xs text-[#6E5E47]">{t(locale, 'dash.statFluency')}</div>
          <div
            data-testid="stat-fluency-value"
            className="text-lg font-bold font-mono tabular-nums text-[#241A11] mt-0.5"
          >
            {metrics.avgFluency}%
          </div>
        </div>

        <div data-testid="stat-grammar-card" className="px-4">
          <div className="text-xs text-[#6E5E47]">{t(locale, 'dash.statGrammar')}</div>
          <div
            data-testid="stat-grammar-value"
            className="text-lg font-bold font-mono tabular-nums text-[#2E8B69] mt-0.5"
          >
            {metrics.avgGrammar}%
          </div>
        </div>

        <div data-testid="stat-speaking-time-card" className="pl-4">
          <div className="text-xs text-[#6E5E47]">{t(locale, 'dash.statTime')}</div>
          <div
            data-testid="stat-speaking-time-value"
            className="text-lg font-bold font-mono tabular-nums text-[#241A11] mt-0.5"
          >
            {formatSpeakingDuration(combinedSeconds, locale)}
          </div>
        </div>
      </div>

      {/* Clean Minimal Recharts AreaChart */}
      <div data-testid="recharts-speaking-container" className="w-full h-40 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={speakingHistory} margin={{ top: 6, right: 6, left: -26, bottom: 0 }}>
            <defs>
              <linearGradient id="fzGrammarSimple" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2E8B69" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#2E8B69" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="fzFluencySimple" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FFC700" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#FFC700" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="turnLabel"
              tick={{ fill: '#6E5E47', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#6E5E47', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              ticks={[0, 50, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1B1418',
                border: 'none',
                borderRadius: '10px',
                color: '#FDFAF3',
                fontSize: '12px',
                padding: '8px 12px',
              }}
              itemStyle={{ color: '#FDFAF3' }}
              labelStyle={{ color: '#FFC700', fontWeight: 700 }}
            />
            <Area
              type="monotone"
              dataKey="grammarScore"
              name="Grammar (%)"
              stroke="#2E8B69"
              strokeWidth={2}
              fill="url(#fzGrammarSimple)"
            />
            <Area
              type="monotone"
              dataKey="fluencyScore"
              name="Fluency (%)"
              stroke="#E6A800"
              strokeWidth={2}
              fill="url(#fzFluencySimple)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
