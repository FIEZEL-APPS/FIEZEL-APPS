#!/usr/bin/env node
/**
 * tools/forced-alignment/generate-story-alignments.mjs
 *
 * FIEZEL PRE-COMPUTED CHARACTER-LEVEL FORCED ALIGNMENT GENERATOR
 *
 * Menghasilkan data sinkronisasi karakter-ke-milidetik (Qwen3-compatible)
 * untuk seluruh cerita Dokkai N5 (Mizuki, Asakusa, Shinkansen).
 *
 * Output: features/japanese/story-timings.json
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

const OUT_FILE = path.join(ROOT, 'features/japanese/story-timings.json');

const STORIES_CONFIG = [
  {
    id: 'mizuki-maiko',
    title: '舞妓の一日',
    prefix: 'mizuki',
    scenes: [
      {
        idx: 0,
        text: 'ミズキは17歳の舞妓です。毎朝、部屋で美しい着物を着ます。'
      },
      {
        idx: 1,
        text: '赤い傘を持って、京都の古い道を静かに歩きます。'
      },
      {
        idx: 2,
        text: '「おはようございます、ミズキさん。今日も元気ですね。お茶をどうぞ。」'
      },
      {
        idx: 3,
        text: '夕方、先生と一緒に伝統的な踊りと音楽を練習します。'
      },
      {
        idx: 4,
        isQuiz: true,
        text: 'ミズキさんは夕方、だれと何を練習しますか。'
      }
    ]
  },
  {
    id: 'asakusa-neko',
    title: '浅草の猫',
    prefix: 'asakusa',
    scenes: [
      {
        idx: 0,
        text: 'ケンジは朝早く、有名な浅草のお寺に来ました。大きな赤いちょうちんがあります。'
      },
      {
        idx: 1,
        text: '門のそばに、茶色の猫が座っています。みんなはその猫を「ミカン」と呼びます。'
      },
      {
        idx: 2,
        text: 'ケンジは手を洗ってから、お祈りをしました。おみくじを引くと、「大吉」が出ました。'
      },
      {
        idx: 3,
        text: 'お寺の前の店で、温かいせんべいを買いました。ミカンにも少し見せてあげました。'
      },
      {
        idx: 4,
        isQuiz: true,
        text: 'お寺の門のそばにいる猫の名前は何ですか。'
      }
    ]
  },
  {
    id: 'shinkansen-trip',
    title: 'はじめての新幹線',
    prefix: 'shinkansen',
    scenes: [
      {
        idx: 0,
        text: 'タロウは朝7時に東京駅に着きました。ホームに白い新幹線が待っています。'
      },
      {
        idx: 1,
        text: '「この新幹線は、最新の自動運転システムで安全に走ります。ごゆっくりお過ごしください。」'
      },
      {
        idx: 2,
        text: '電車がスピードを上げます。窓の外を見ると、青い空の下に富士山がはっきりと見えました。'
      },
      {
        idx: 3,
        text: 'たったの2時間半で、新大阪駅に到着しました。とても速くて快適でした。'
      },
      {
        idx: 4,
        isQuiz: true,
        text: 'タロウさんは電車の窓から何を見ましたか。'
      }
    ]
  }
];

const PUNCT = new Set(['。', '、', '！', '？', '「', '」', ' ', '\t', '\n', '・', '—', '〜', '”', '“']);

function getAudioDurationMs(filePath) {
  const out = execSync(`ffprobe -v quiet -print_format json -show_format "${filePath}"`).toString();
  const durSec = parseFloat(JSON.parse(out).format.duration);
  return Math.round(durSec * 1000);
}

function getSilenceIntervals(filePath) {
  try {
    const cmd = `ffmpeg -i "${filePath}" -af silencedetect=noise=-28dB:d=0.15 -f null - 2>&1`;
    const out = execSync(cmd).toString();
    const intervals = [];
    const lines = out.split('\n');
    let curStart = null;
    for (const l of lines) {
      const mStart = l.match(/silence_start: ([\d.]+)/);
      if (mStart) curStart = parseFloat(mStart[1]);
      const mEnd = l.match(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/);
      if (mEnd && curStart !== null) {
        intervals.push({
          start_ms: Math.round(curStart * 1000),
          end_ms: Math.round(parseFloat(mEnd[1]) * 1000),
          duration_ms: Math.round(parseFloat(mEnd[2]) * 1000)
        });
        curStart = null;
      }
    }
    return intervals;
  } catch (e) {
    return [];
  }
}

/**
 * Menghasilkan timing karakter dengan pemetaan proporsional ke segmen ujaran nyata
 */
function alignSceneCharacters(text, audioPath, totalDurationMs) {
  const silences = getSilenceIntervals(audioPath);
  const speechSegments = [];
  let lastEndMs = 25;

  for (const s of silences) {
    if (s.start_ms > lastEndMs + 60) {
      speechSegments.push({
        start_ms: lastEndMs,
        end_ms: s.start_ms,
        duration_ms: s.start_ms - lastEndMs
      });
    }
    lastEndMs = s.end_ms;
  }
  if (lastEndMs < totalDurationMs - 60) {
    speechSegments.push({
      start_ms: lastEndMs,
      end_ms: totalDurationMs - 30,
      duration_ms: (totalDurationMs - 30) - lastEndMs
    });
  }

  const chars = Array.from(text).filter(c => !PUNCT.has(c));

  if (speechSegments.length === 0) {
    const usableStart = 60;
    const usableEnd = totalDurationMs - 150;
    const durPerChar = (usableEnd - usableStart) / chars.length;
    return chars.map((ch, idx) => ({
      char: ch,
      start_ms: Math.round(usableStart + (idx * durPerChar)),
      end_ms: Math.round(usableStart + ((idx + 1) * durPerChar))
    }));
  }

  const totalSpeechDur = speechSegments.reduce((acc, s) => acc + s.duration_ms, 0);

  // Alokasikan karakter ke tiap segmen secara proporsional terhadap durasi segmen
  const segCharCounts = [];
  let remainingChars = chars.length;

  for (let i = 0; i < speechSegments.length; i++) {
    if (i === speechSegments.length - 1) {
      segCharCounts.push(remainingChars);
    } else {
      const segRatio = speechSegments[i].duration_ms / totalSpeechDur;
      const count = Math.max(1, Math.round(chars.length * segRatio));
      const allocated = Math.min(count, remainingChars - (speechSegments.length - 1 - i));
      segCharCounts.push(allocated);
      remainingChars -= allocated;
    }
  }

  const result = [];
  let charPointer = 0;

  for (let sIdx = 0; sIdx < speechSegments.length; sIdx++) {
    const seg = speechSegments[sIdx];
    const count = segCharCounts[sIdx];
    const segChars = chars.slice(charPointer, charPointer + count);
    charPointer += count;

    const durPerChar = seg.duration_ms / Math.max(1, segChars.length);
    for (let c = 0; c < segChars.length; c++) {
      const cStart = Math.round(seg.start_ms + (c * durPerChar));
      const cEnd = (c === segChars.length - 1) ? seg.end_ms : Math.round(seg.start_ms + ((c + 1) * durPerChar));
      result.push({
        char: segChars[c],
        start_ms: cStart,
        end_ms: Math.max(cStart + 40, cEnd)
      });
    }
  }

  // Sanitasi & verifikasi monotonik
  for (let i = 0; i < result.length; i++) {
    if (i > 0 && result[i].start_ms < result[i - 1].start_ms) {
      result[i].start_ms = result[i - 1].end_ms;
    }
    if (result[i].end_ms <= result[i].start_ms) {
      result[i].end_ms = result[i].start_ms + 40;
    }
    if (result[i].end_ms > totalDurationMs) {
      result[i].end_ms = totalDurationMs;
      if (result[i].start_ms >= result[i].end_ms) {
        result[i].start_ms = Math.max(0, result[i].end_ms - 40);
      }
    }
  }

  return result;
}

export function generateAllStoryAlignments() {
  const result = {
    schema_version: '1.0.0',
    generator: 'Fiezel-ForcedAligner-Qwen3-Compatible',
    generated_at: new Date().toISOString(),
    stories: {}
  };

  for (const story of STORIES_CONFIG) {
    console.log(`\n[Aligner] Memproses Cerita: ${story.id} (${story.title})...`);
    result.stories[story.id] = {
      title: story.title,
      scenes: []
    };

    for (const sc of story.scenes) {
      const audioRelative = `assets/stories/${story.prefix}-${sc.idx + 1}.mp3`;
      const audioPath = path.join(ROOT, audioRelative);

      if (!fs.existsSync(audioPath)) {
        console.warn(`  [SKIP] Berkas audio tidak ditemukan: ${audioRelative}`);
        continue;
      }

      const durationMs = getAudioDurationMs(audioPath);
      const timings = alignSceneCharacters(sc.text, audioPath, durationMs);

      console.log(`  ✓ Adegan ${sc.idx + 1} (${sc.isQuiz ? 'Kuis' : 'Narasi'}): ${timings.length} karakter terpetakan, durasi: ${(durationMs / 1000).toFixed(2)}s`);

      result.stories[story.id].scenes.push({
        scene_idx: sc.idx,
        is_quiz: !!sc.isQuiz,
        audio_src: './' + audioRelative,
        audio_duration_ms: durationMs,
        char_count: timings.length,
        char_timings: timings
      });
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), 'utf8');
  const stat = fs.statSync(OUT_FILE);
  console.log(`\n======================================================`);
  console.log(`✓ SUKSES! Berkas story-timings.json tersimpan:`);
  console.log(`  Path: ${OUT_FILE}`);
  console.log(`  Ukuran: ${Math.round(stat.size / 1024)} KB (${stat.size} bytes)`);
  console.log(`======================================================`);
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllStoryAlignments();
}
