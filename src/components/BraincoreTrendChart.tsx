import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { LearnerLocale, SpeakingSessionMetric } from '../types/voiceCall';
import { t } from '../lib/i18n';
import { FiezelCornerOrnament, FiezelPawStamp } from './FiezelOrnaments';

interface BraincoreTrendChartProps {
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

export const BraincoreTrendChart: React.FC<BraincoreTrendChartProps> = ({
  locale,
  speakingHistory,
  totalSpeakingSeconds,
  liveCallSeconds = 0,
}) => {
  const metrics = useMemo(() => {
    const list = speakingHistory.length > 0 ? speakingHistory : [];
    if (list.length === 0) {
      return { avgFluency: 0, avgGrammar: 0, totalTurns: 0 };
    }
    const avgFluency = Math.round(
      list.reduce((acc, item) => acc + item.fluencyScore, 0) / list.length
    );
    const avgGrammar = Math.round(
      list.reduce((acc, item) => acc + item.grammarScore, 0) / list.length
    );
    return { avgFluency, avgGrammar, totalTurns: list.length };
  }, [speakingHistory]);

  const combinedSeconds = totalSpeakingSeconds + liveCallSeconds;

  return (
    <section
      data-testid="braincore-trend-chart"
      aria-label={t(locale, 'dash.title')}
      className="fz-studio-card rounded-3xl p-6 space-y-5 relative overflow-hidden"
    >
      <FiezelCornerOrnament className="absolute -right-2 -top-2 w-24 h-24 opacity-65" />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="fz-badge-paw">
            <FiezelPawStamp className="w-3 h-3 text-[#8C2233]" />
            <span>BRAINCORE TELEMETRY</span>
          </span>
          <h2 className="text-base font-bold text-[#241A11] mt-1.5">
            {locale === 'th'
              ? 'แนวโน้มความคล่องแคล่วและความแม่นยำไวยากรณ์'
              : 'Tren Kelancaran & Akurasi Tata Bahasa'}
          </h2>
          <p className="text-xs text-[#6E5E47] mt-0.5">
            {locale === 'th'
              ? `บันทึกจาก ${metrics.totalTurns} รอบการสนทนา`
              : `Berdasarkan ${metrics.totalTurns} giliran bicara terverifikasi`}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-[#6E5E47]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2E8B69]" aria-hidden="true" />
            <span>{t(locale, 'dash.legendGrammar')}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8C2233]" aria-hidden="true" />
            <span>{t(locale, 'dash.legendFluency')}</span>
          </span>
        </div>
      </div>

      {/* 3 Statistik dengan Garis Pembatas Halus Khas FIEZEL */}
      <div className="relative z-10 grid grid-cols-3 divide-x divide-[#F0E4CF] border-y border-[#F0E4CF] py-3.5">
        <div data-testid="braincore-stat-fluency" className="pr-4">
          <div className="text-xs text-[#6E5E47]">{t(locale, 'dash.statFluency')}</div>
          <div className="text-xl font-bold font-mono tabular-nums text-[#8C2233] mt-0.5">
            {metrics.avgFluency}%
          </div>
        </div>

        <div data-testid="braincore-stat-grammar" className="px-4">
          <div className="text-xs text-[#6E5E47]">{t(locale, 'dash.statGrammar')}</div>
          <div className="text-xl font-bold font-mono tabular-nums text-[#2E8B69] mt-0.5">
            {metrics.avgGrammar}%
          </div>
        </div>

        <div data-testid="braincore-stat-time" className="pl-4">
          <div className="text-xs text-[#6E5E47]">{t(locale, 'dash.statTime')}</div>
          <div className="text-xl font-bold font-mono tabular-nums text-[#241A11] mt-0.5">
            {formatSpeakingDuration(combinedSeconds, locale)}
          </div>
        </div>
      </div>

      <div data-testid="braincore-recharts-line-container" className="relative z-10 w-full h-56 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={speakingHistory} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0E4CF" vertical={false} />
            <XAxis
              dataKey="turnLabel"
              tick={{ fill: '#6E5E47', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: '#6E5E47', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFF9EE',
                border: '1.5px solid #F0E4CF',
                borderRadius: '14px',
                color: '#241A11',
                fontSize: '12px',
                padding: '10px 14px',
                boxShadow: '0 12px 28px rgba(36, 26, 17, 0.1)',
              }}
              itemStyle={{ color: '#241A11' }}
              labelStyle={{ color: '#8C2233', fontWeight: 700, marginBottom: '4px' }}
            />
            <Line
              type="monotone"
              dataKey="grammarScore"
              name={t(locale, 'dash.legendGrammar')}
              stroke="#2E8B69"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#2E8B69', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#2E8B69', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="fluencyScore"
              name={t(locale, 'dash.legendFluency')}
              stroke="#8C2233"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#8C2233', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#8C2233', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
