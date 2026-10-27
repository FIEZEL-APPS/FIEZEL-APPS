// tools/dev/build-kanjivg-master-bank.mjs
// Generates official MEXT-compliant Japanese stroke order data using KanjiVG (CC BY-SA 3.0 Ulrich Apel).

import fs from 'fs';
import path from 'path';

const HIRAGANA_DEF = [
  { char: 'あ', romaji: 'a' }, { char: 'い', romaji: 'i' }, { char: 'う', romaji: 'u' }, { char: 'え', romaji: 'e' }, { char: 'お', romaji: 'o' },
  { char: 'か', romaji: 'ka' }, { char: 'き', romaji: 'ki' }, { char: 'く', romaji: 'ku' }, { char: 'け', romaji: 'ke' }, { char: 'こ', romaji: 'ko' },
  { char: 'さ', romaji: 'sa' }, { char: 'し', romaji: 'shi' }, { char: 'す', romaji: 'su' }, { char: 'せ', romaji: 'se' }, { char: 'そ', romaji: 'so' },
  { char: 'た', romaji: 'ta' }, { char: 'ち', romaji: 'chi' }, { char: 'つ', romaji: 'tsu' }, { char: 'て', romaji: 'te' }, { char: 'と', romaji: 'to' },
  { char: 'な', romaji: 'na' }, { char: 'に', romaji: 'ni' }, { char: 'ぬ', romaji: 'nu' }, { char: 'ね', romaji: 'ne' }, { char: 'の', romaji: 'no' },
  { char: 'は', romaji: 'ha' }, { char: 'ひ', romaji: 'hi' }, { char: 'ふ', romaji: 'fu' }, { char: 'へ', romaji: 'he' }, { char: 'ほ', romaji: 'ho' },
  { char: 'ま', romaji: 'ma' }, { char: 'み', romaji: 'mi' }, { char: 'む', romaji: 'mu' }, { char: 'め', romaji: 'me' }, { char: 'も', romaji: 'mo' },
  { char: 'や', romaji: 'ya' }, { char: 'ゆ', romaji: 'yu' }, { char: 'よ', romaji: 'yo' },
  { char: 'ら', romaji: 'ra' }, { char: 'り', romaji: 'ri' }, { char: 'る', romaji: 'ru' }, { char: 'れ', romaji: 're' }, { char: 'ろ', romaji: 'ro' },
  { char: 'わ', romaji: 'wa' }, { char: 'を', romaji: 'wo' }, { char: 'ん', romaji: 'n' }
];

const KATAKANA_DEF = [
  { char: 'ア', romaji: 'a' }, { char: 'イ', romaji: 'i' }, { char: 'ウ', romaji: 'u' }, { char: 'エ', romaji: 'e' }, { char: 'オ', romaji: 'o' },
  { char: 'カ', romaji: 'ka' }, { char: 'キ', romaji: 'ki' }, { char: 'ク', romaji: 'ku' }, { char: 'ケ', romaji: 'ke' }, { char: 'コ', romaji: 'ko' },
  { char: 'サ', romaji: 'sa' }, { char: 'シ', romaji: 'shi' }, { char: 'ス', romaji: 'su' }, { char: 'セ', romaji: 'se' }, { char: 'ソ', romaji: 'so' },
  { char: 'タ', romaji: 'ta' }, { char: 'チ', romaji: 'chi' }, { char: 'ツ', romaji: 'tsu' }, { char: 'テ', romaji: 'te' }, { char: 'ト', romaji: 'to' },
  { char: 'ナ', romaji: 'na' }, { char: 'ニ', romaji: 'ni' }, { char: 'ヌ', romaji: 'nu' }, { char: 'ネ', romaji: 'ne' }, { char: 'ノ', romaji: 'no' },
  { char: 'ハ', romaji: 'ha' }, { char: 'ヒ', romaji: 'hi' }, { char: 'フ', romaji: 'fu' }, { char: 'ヘ', romaji: 'he' }, { char: 'ホ', romaji: 'ho' },
  { char: 'マ', romaji: 'ma' }, { char: 'ミ', romaji: 'mi' }, { char: 'ム', romaji: 'mu' }, { char: 'メ', romaji: 'me' }, { char: 'モ', romaji: 'mo' },
  { char: 'ヤ', romaji: 'ya' }, { char: 'ユ', romaji: 'yu' }, { char: 'ヨ', romaji: 'yo' },
  { char: 'ラ', romaji: 'ra' }, { char: 'リ', romaji: 'ri' }, { char: 'ル', romaji: 'ru' }, { char: 'レ', romaji: 're' }, { char: 'ロ', romaji: 'ro' },
  { char: 'ワ', romaji: 'wa' }, { char: 'ヲ', romaji: 'wo' }, { char: 'ン', romaji: 'n' }
];

const KANJI_DEF = [
  { char: '一', romaji: 'ichi / hito', arti: 'Satu', artiTh: 'หนึ่ง' },
  { char: '二', romaji: 'ni / futa', arti: 'Dua', artiTh: 'สอง' },
  { char: '三', romaji: 'san / mi', arti: 'Tiga', artiTh: 'สาม' },
  { char: '四', romaji: 'shi / yon', arti: 'Empat', artiTh: 'สี่' },
  { char: '五', romaji: 'go / itsu', arti: 'Lima', artiTh: 'ห้า' },
  { char: '六', romaji: 'roku / mui', arti: 'Enam', artiTh: 'หก' },
  { char: '七', romaji: 'shichi / nana', arti: 'Tujuh', artiTh: 'เจ็ด' },
  { char: '八', romaji: 'hachi / ya', arti: 'Delapan', artiTh: 'แปด' },
  { char: '九', romaji: 'kyuu / ku', arti: 'Sembilan', artiTh: 'เก้า' },
  { char: '十', romaji: 'juu / too', arti: 'Sepuluh', artiTh: 'สิบ' },
  { char: '百', romaji: 'hyaku', arti: 'Ratus', artiTh: 'ร้อย' },
  { char: '千', romaji: 'sen', arti: 'Ribu', artiTh: 'พัน' },
  { char: '万', romaji: 'man', arti: 'Puluh ribu (10.000)', artiTh: 'หมื่น' },
  { char: '円', romaji: 'en / maru', arti: 'Yen / Lingkaran', artiTh: 'เยน / วงกลม' },
  { char: '日', romaji: 'nichi / hi', arti: 'Matahari / Hari', artiTh: 'วัน / พระอาทิตย์' },
  { char: '月', romaji: 'getsu / tsuki', arti: 'Bulan', artiTh: 'เดือน / พระจันทร์' },
  { char: '火', romaji: 'ka / hi', arti: 'Api', artiTh: 'ไฟ' },
  { char: '水', romaji: 'sui / mizu', arti: 'Air', artiTh: 'น้ำ' },
  { char: '木', romaji: 'moku / ki', arti: 'Pohon / Kayu', artiTh: 'ต้นไม้ / ไม้' },
  { char: '金', romaji: 'kin / kane', arti: 'Emas / Uang', artiTh: 'ทอง / เงิน' },
  { char: '土', romaji: 'do / tsuchi', arti: 'Tanah', artiTh: 'ดิน' },
  { char: '年', romaji: 'nen / toshi', arti: 'Tahun', artiTh: 'ปี' },
  { char: '時', romaji: 'ji / toki', arti: 'Waktu / Jam', artiTh: 'เวลา / นาฬิกา' },
  { char: '分', romaji: 'fun / bun / wa', arti: 'Menit / Membagi', artiTh: 'นาที / ส่วน' },
  { char: '人', romaji: 'jin / hito', arti: 'Orang', artiTh: 'คน' },
  { char: '男', romaji: 'dan / otoko', arti: 'Laki-laki', artiTh: 'ผู้ชาย' },
  { char: '女', romaji: 'jo / onna', arti: 'Perempuan', artiTh: 'ผู้หญิง' },
  { char: '子', romaji: 'shi / ko', arti: 'Anak', artiTh: 'เด็ก' },
  { char: '学', romaji: 'gaku / mana', arti: 'Studi / Sekolah', artiTh: 'เรียน / ศึกษา' },
  { char: '生', romaji: 'sei / i', arti: 'Hidup / Lahir', artiTh: 'มีชีวิต / เกิด' },
  { char: '先', romaji: 'sen / saki', arti: 'Lebih dulu / Ujung', artiTh: 'ก่อน / หน้า' },
  { char: '校', romaji: 'kou', arti: 'Sekolah', artiTh: 'โรงเรียน' },
  { char: '本', romaji: 'hon / moto', arti: 'Buku / Dasar', artiTh: 'หนังสือ / รากฐาน' },
  { char: '上', romaji: 'jou / ue', arti: 'Atas', artiTh: 'บน' },
  { char: '下', romaji: 'ka / shita', arti: 'Bawah', artiTh: 'ล่าง' },
  { char: '中', romaji: 'chuu / naka', arti: 'Tengah / Dalam', artiTh: 'กลาง / ใน' },
  { char: '大', romaji: 'dai / oo', arti: 'Besar', artiTh: 'ใหญ่' },
  { char: '小', romaji: 'shou / chii', arti: 'Kecil', artiTh: 'เล็ก' },
  { char: '白', romaji: 'haku / shiro', arti: 'Putih', artiTh: 'สีขาว' },
  { char: '国', romaji: 'koku / kuni', arti: 'Negara', artiTh: 'ประเทศ' },
  { char: '目', romaji: 'moku / me', arti: 'Mata', artiTh: 'ตา' },
  { char: '口', romaji: 'kou / kuchi', arti: 'Mulut / Pintu masuk', artiTh: 'ปาก / ทางเข้า' },
  { char: '手', romaji: 'shu / te', arti: 'Tangan', artiTh: 'มือ' },
  { char: '車', romaji: 'sha / kuruma', arti: 'Mobil / Kendaraan', artiTh: 'รถยนต์' }
];

async function fetchSvg(code) {
  const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${code}.svg`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${code}: ${res.status}`);
  }
  return await res.text();
}

function parseSvg(xml) {
  const strokes = [];
  const pathRegex = /<path[^>]+id="([^"]+)"[^>]+d="([^"]+)"/g;
  let match;
  while ((match = pathRegex.exec(xml)) !== null) {
    const id = match[1];
    const d = match[2];
    strokes.push({ id, d });
  }

  const numMap = {};
  const textRegex = /<text[^>]+matrix\(1 0 0 1 ([0-9.]+) ([0-9.]+)\)[^>]*>([0-9]+)<\/text>/g;
  while ((match = textRegex.exec(xml)) !== null) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const num = parseInt(match[3], 10);
    numMap[num] = [x, y];
  }

  return strokes.map((s, idx) => {
    const order = idx + 1;
    // Extract start point from initial M x,y
    const mMatch = /M\s*([0-9.-]+)\s*,\s*([0-9.-]+)/i.exec(s.d);
    const startX = mMatch ? parseFloat(mMatch[1]) : 50;
    const startY = mMatch ? parseFloat(mMatch[2]) : 50;

    return {
      order,
      d: s.d,
      start: [startX, startY],
      numPos: numMap[order] || [startX - 4, startY - 4],
      hint: `Goresan ke-${order}`,
      hintTh: `เส้นขีดที่ ${order}`
    };
  });
}

async function main() {
  console.log('Building authentic KanjiVG Japanese stroke order data bank...');
  const result = {};

  const processList = async (list, script) => {
    for (const item of list) {
      const code = item.char.charCodeAt(0).toString(16).padStart(5, '0');
      try {
        const xml = await fetchSvg(code);
        const parsedStrokes = parseSvg(xml);
        result[item.char] = {
          char: item.char,
          romaji: item.romaji,
          script: script,
          meaning: item.arti || '',
          meaningTh: item.artiTh || '',
          strokeCount: parsedStrokes.length,
          strokes: parsedStrokes
        };
        process.stdout.write(`✓ ${item.char} `);
      } catch (err) {
        console.error(`\nError fetching ${item.char} (${code}):`, err.message);
      }
    }
    console.log(`\nFinished ${script} (${list.length})`);
  };

  await processList(HIRAGANA_DEF, 'hiragana');
  await processList(KATAKANA_DEF, 'katakana');
  await processList(KANJI_DEF, 'kanji');

  const charCount = Object.keys(result).length;
  console.log(`\nTotal characters parsed: ${charCount}`);

  // Build the output JavaScript file
  const fileHeader = `/* ==========================================================================
   FIEZEL KAKIJUN DATA (書き順 / Japanese Stroke Order Master Vector Bank)
   Authentic MEXT-standard vector paths for Hiragana, Katakana, and JLPT Kanji.
   Vector data derived from KanjiVG (http://kanjivg.tagaini.net)
   Copyright (C) 2009-2026 Ulrich Apel and contributors.
   Licensed under Creative Commons Attribution-Share Alike 3.0 (CC BY-SA 3.0).
   Coordinate System: SVG 109x109 viewBox standard.
   ========================================================================== */
(function(root) {
  'use strict';

  var STROKES = ${JSON.stringify(result, null, 2)};

  var FiezelKakijunData = {
    get: function(char) {
      return STROKES[char] || null;
    },
    has: function(char) {
      return Boolean(STROKES[char]);
    },
    listAll: function() {
      return Object.keys(STROKES);
    },
    filterByScript: function(script) {
      return Object.values(STROKES).filter(function(item) {
        return item.script === script;
      });
    },
    data: STROKES
  };

  root.FiezelKakijunData = FiezelKakijunData;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FiezelKakijunData;
  }
})(typeof self !== 'undefined' ? self : globalThis);
`;

  const outputPath = path.resolve('features/japanese/fiezel-kakijun-data.js');
  fs.writeFileSync(outputPath, fileHeader, 'utf8');
  console.log(`Successfully written to ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
