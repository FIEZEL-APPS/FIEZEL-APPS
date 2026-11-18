import { KAKIJUN_CORE_VECTORS, type RawKakijunChar, type RawKakijunStroke } from './kakijunCoreVectors';

export interface KakijunStrokeItem extends RawKakijunStroke {}

export interface KakijunCharEntry {
  char: string;
  type: 'kanji' | 'hiragana' | 'katakana' | 'hanzi';
  reading: string;
  meaningId: string;
  strokeCount: number;
  strokes: KakijunStrokeItem[];
  mnemonicId: string;
  compounds?: Array<{ word: string; reading: string; meaning: string }>;
}

const EXTRA_CHARS: Record<string, RawKakijunChar> = {
  山: {
    char: '山',
    romaji: 'san / yama | shān',
    script: 'kanji',
    meaning: 'Gunung',
    strokeCount: 3,
    strokes: [
      {
        order: 1,
        d: 'M52.49,15.5c1.38,1.38,2.26,3.5,2.26,5.75c0,0.75-0.22,58.3-0.25,60.75',
        start: [52.49, 15.5],
        numPos: [44, 15],
        hint: 'Goresan tengah tegak lurus turun dulu (↓)',
      },
      {
        order: 2,
        d: 'M21.49,47.25c1.14,1.14,1.64,2.86,1.38,4.63c-0.75,5.12-2.62,21.5-3.87,30.12c-0.46,3.16,0.52,4.4,3.88,3.62c12.5-2.88,43.25-6,63.38-6.62',
        start: [21.49, 47.25],
        numPos: [13, 47],
        hint: 'Goresan kiri turun lalu belok datar ke kanan (└)',
      },
      {
        order: 3,
        d: 'M89.24,42.5c1.07,1.07,1.62,2.87,1.25,5.13C89,56.75,87.5,69.5,85.62,86.12',
        start: [89.24, 42.5],
        numPos: [80, 40],
        hint: 'Dinding kanan tegak turun mengunci dasar (↓)',
      },
    ],
  },
  川: {
    char: '川',
    romaji: 'sen / kawa | chuān',
    script: 'kanji',
    meaning: 'Sungai',
    strokeCount: 3,
    strokes: [
      {
        order: 1,
        d: 'M27.72,25.68c0.95,1.2,1.17,2.87,1.18,4.62c0.22,22.45-2.65,45.2-15.15,59.45',
        start: [27.72, 25.68],
        numPos: [19, 25],
        hint: 'Aliran kiri turun lalu melengkung ke kiri (↙)',
      },
      {
        order: 2,
        d: 'M53.75,24.13c0.94,0.94,1.41,2.37,1.41,3.9c0,0.58-0.01,27.06-0.08,39.72c-0.02,3.1-0.04,5.37-0.06,6.25',
        start: [53.75, 24.13],
        numPos: [45, 24],
        hint: 'Aliran tengah tegak lurus ke bawah (↓)',
      },
      {
        order: 3,
        d: 'M81.56,16.13c1.09,1.09,1.76,2.62,1.76,4.25c0,0.82-0.02,52.08-0.11,68.87c-0.01,2.68-0.03,4.59-0.04,5.38',
        start: [81.56, 16.13],
        numPos: [73, 17],
        hint: 'Aliran kanan tegak paling panjang (↓)',
      },
    ],
  },
  心: {
    char: '心',
    romaji: 'shin / kokoro | xīn',
    script: 'kanji',
    meaning: 'Hati / Perasaan',
    strokeCount: 4,
    strokes: [
      {
        order: 1,
        d: 'M16.88,53.25c0.38,4.5-3.75,14.5-6.75,18',
        start: [16.88, 53.25],
        numPos: [10, 50],
        hint: 'Titik kiri miring turun ke kiri (↙)',
      },
      {
        order: 2,
        d: 'M31.75,38.75c11.25,25,22.75,45.25,47.5,45.25c8.75,0,11.25-3.75,2.75-13',
        start: [31.75, 38.75],
        numPos: [25, 37],
        hint: 'Lengkung dasar mangkuk lalu kait naik ke atas',
      },
      {
        order: 3,
        d: 'M51.75,24.75c2.25,5.5,7.25,13.5,8.75,6.25',
        start: [51.75, 24.75],
        numPos: [45, 24],
        hint: 'Titik tengah di atas lengkungan (丶)',
      },
      {
        order: 4,
        d: 'M83.25,38.25c4,3,8.5,8.5,11,13',
        start: [83.25, 38.25],
        numPos: [77, 36],
        hint: 'Titik kanan penutup di luar mangkuk (丶)',
      },
    ],
  },
  安: {
    char: '安',
    romaji: 'an / yasui | ān (Aman)',
    script: 'kanji',
    meaning: 'Aman / Murah / Tenang (SSW Anzen 安全)',
    strokeCount: 6,
    strokes: [
      {
        order: 1,
        d: 'M53.15,12.25c1.12,1.12,1.68,2.5,1.68,4.08c0,3.17-0.07,6.42-0.07,9.79',
        start: [53.15, 12.25],
        numPos: [45, 13],
        hint: 'Titik puncak atap (Ukanmuri) di tengah atas (↓)',
      },
      {
        order: 2,
        d: 'M24.99,26.62c0,3.75-2.61,14.5-3.74,17.13',
        start: [24.99, 26.62],
        numPos: [17, 27],
        hint: 'Garis miring sisi kiri atap',
      },
      {
        order: 3,
        d: 'M26.5,29.38c13.38-1.62,40.75-4.38,56.5-4.88c10.75-0.34,3.12,6.62-0.88,9.88',
        start: [26.5, 29.38],
        numPos: [30, 23],
        hint: 'Garis datar atap ke kanan lalu kait turun (┐)',
      },
      {
        order: 4,
        d: 'M50.02,38.88c0.48,1.37,0.34,3.04-0.25,4.69C46.5,52.62,42,61.62,36,70.2c-1.73,2.47-0.68,3.68,1.15,3.88c9.85,1.05,21.6,4.05,31.35,10.05c4.64,2.86,8.25,6.25,10.25,9.38',
        start: [50.02, 38.88],
        numPos: [41, 41],
        hint: 'Goresan melengkung kiri lalu lipat ke kanan bawah (く)',
      },
      {
        order: 5,
        d: 'M69.62,49.88c0.38,1.38,0.19,3.5-0.25,4.96C65.75,66.75,55.5,84.12,28,92.75',
        start: [69.62, 49.88],
        numPos: [62, 48],
        hint: 'Sapuan kanan menyilang melengkung ke kiri (↙)',
      },
      {
        order: 6,
        d: 'M14.75,59.75c2.25,0.75,5.12,0.8,8.5,0.5c19.12-1.75,44.75-4.5,63.38-5c3.5-0.09,6.88,0.25,9.62,0.88',
        start: [14.75, 59.75],
        numPos: [9, 58],
        hint: 'Garis datar panjang memotong tengah dari kiri ke kanan (→)',
      },
    ],
  },
  好: {
    char: '好',
    romaji: 'hǎo (Baik) | kou / suki',
    script: 'hanzi',
    meaning: 'Baik / Suka (女 perempuan + 子 anak)',
    strokeCount: 6,
    strokes: [
      {
        order: 1,
        d: 'M30.5,20.5c0.4,1.25,0.3,2.85-0.2,4.35c-2.8,8.4-6.9,18.2-11.8,26.8c-1.3,2.3-0.4,3.5,1.3,3.9c7.8,1.8,15.5,6.8,22.2,14.5',
        start: [30.5, 20.5],
        numPos: [22, 20],
        hint: 'Radikal perempuan (女) goresan 1: siku ke kiri lalu ke kanan bawah (く)',
      },
      {
        order: 2,
        d: 'M43.5,38.5c0.3,1.25,0.1,3.2-0.3,4.5c-3.2,10.5-11.2,27.5-26.2,37',
        start: [43.5, 38.5],
        numPos: [36, 37],
        hint: 'Radikal perempuan goresan 2: sapuan miring turun ke kiri bawah (↙)',
      },
      {
        order: 3,
        d: 'M12,47.5c1.8,0.5,4.2,0.4,6.4,0.1c9.6-1.3,21.5-3.4,30-4.2',
        start: [12, 47.5],
        numPos: [6, 46],
        hint: 'Radikal perempuan goresan 3: garis datar naik tipis kiri ke kanan (→)',
      },
      {
        order: 4,
        d: 'M54.5,22.5c2,0.6,4.5,0.5,6.5,0.1c5.8-1.1,16.5-3.4,21-4.1c2.5-0.4,3.5,1.3,1.2,3.4c-3.8,3.4-9.5,8.2-14.2,12.1',
        start: [54.5, 22.5],
        numPos: [50, 18],
        hint: 'Radikal anak (子) goresan 1: datar ke kanan lalu turun miring (乛)',
      },
      {
        order: 5,
        d: 'M68.5,35.5c5.8,8.5,7.8,25.5,3.5,46.5c-1.8,8.8-6.5,6-11.5,1.8',
        start: [68.5, 35.5],
        numPos: [61, 37],
        hint: 'Batang melengkung ke bawah dengan kait naik (亅)',
      },
      {
        order: 6,
        d: 'M48.5,51.5c2.2,0.6,4.6,0.5,7.2,0.2c12-1.4,24.8-2.9,36.8-3.3c2.5-0.1,4.8,0.2,7,0.8',
        start: [48.5, 51.5],
        numPos: [45, 47],
        hint: 'Garis datar panjang menembus tengah子 dari kiri ke kanan (→)',
      },
    ],
  },
};

const PEDAGOGICAL_DETAILS: Record<
  string,
  {
    reading: string;
    meaning: string;
    mnemonic: string;
    strokeHints?: string[];
    compounds?: Array<{ word: string; reading: string; meaning: string }>;
  }
> = {
  一: {
    reading: 'ichi / hito-tsu | yī',
    meaning: 'Angka 1 (Satu)',
    mnemonic: 'Satu batang garis datar yang tegas dari kiri ke kanan.',
    strokeHints: ['Satu garis datar tegas dari kiri ke kanan (→), sedikit miring naik 2 derajat lalu tekan akhir.'],
    compounds: [
      { word: '一つ', reading: 'ひとつ (hitotsu)', meaning: '1 buah' },
      { word: '一月', reading: 'いちがつ (ichigatsu)', meaning: 'Bulan Januari' },
      { word: '一番', reading: 'いちばん (ichiban)', meaning: 'Nomor satu / paling' },
    ],
  },
  二: {
    reading: 'ni / futa-tsu | èr',
    meaning: 'Angka 2 (Dua)',
    mnemonic: 'Dua garis paralel: atas lebih pendek, bawah lebih panjang.',
    strokeHints: [
      'Goresan 1: Garis datar lebih pendek di bagian atas (→).',
      'Goresan 2: Garis datar lebih panjang dan kokoh di bagian bawah (→).',
    ],
    compounds: [
      { word: '二つ', reading: 'ふたつ (futatsu)', meaning: '2 buah' },
      { word: '二月', reading: 'にがつ (nigatsu)', meaning: 'Bulan Februari' },
      { word: '二人', reading: 'ふたり (futari)', meaning: '2 orang' },
    ],
  },
  三: {
    reading: 'san / mit-tsu | sān',
    meaning: 'Angka 3 (Tiga)',
    mnemonic: 'Tiga garis datar: sedang di atas, pendek di tengah, panjang menopang di bawah.',
    strokeHints: [
      'Goresan 1: Garis datar sedang di atas (→).',
      'Goresan 2: Garis datar paling pendek di tengah (→).',
      'Goresan 3: Garis datar paling panjang sebagai dasar di bawah (→).',
    ],
    compounds: [
      { word: '三つ', reading: 'みっつ (mittsu)', meaning: '3 buah' },
      { word: '三月', reading: 'さんがつ (sangatsu)', meaning: 'Bulan Maret' },
    ],
  },
  四: {
    reading: 'yon / shi / yot-tsu | sì',
    meaning: 'Angka 4 (Empat · 5 Goresan)',
    mnemonic: 'Kotak bingkai luar dulu, dua kaki di dalam, lalu garis dasar menutup!',
    strokeHints: [
      'Goresan 1: Dinding kiri turun agak miring ke bawah (↓).',
      'Goresan 2: Atap datar ke kanan lalu lipat turun membentuk dinding kanan (┐).',
      'Goresan 3: Kaki kecil di dalam melengkung ke kiri bawah (↙).',
      'Goresan 4: Kaki kanan di dalam turun lalu belok mendatar (└).',
      'Goresan 5: Tutup bingkai dengan garis datar di paling bawah (→).',
    ],
    compounds: [
      { word: '四つ', reading: 'よっつ (yottsu)', meaning: '4 buah' },
      { word: '四月', reading: 'しがつ (shigatsu)', meaning: 'Bulan April' },
    ],
  },
  五: {
    reading: 'go / itsu-tsu | wǔ',
    meaning: 'Angka 5 (Lima · 4 Goresan Resmi)',
    mnemonic: 'Catatan penting: Kanji angka 5 (五) ditulis dalam 4 GORESAN: atap datar (1), tiang miring (2), bahu siku kanan-turun (3), dan lantai penutup lebar (4)!',
    strokeHints: [
      'Goresan 1: Garis datar bagian atas dari kiri ke kanan (→).',
      'Goresan 2: Tiang tengah miring sedikit turun dari atas ke kiri bawah (↓/↙).',
      'Goresan 3: Garis tengah melintang ke kanan lalu melipat turun ke bawah (┐).',
      'Goresan 4: Garis dasar paling panjang menutup kokoh di bawah dari kiri ke kanan (→).',
    ],
    compounds: [
      { word: '五つ', reading: 'いつつ (itsutsu)', meaning: '5 buah' },
      { word: '五月', reading: 'ごがつ (gogatsu)', meaning: 'Bulan Mei' },
      { word: '五百円', reading: 'ごひゃくえん (gohyaku-en)', meaning: '500 Yen' },
    ],
  },
  水: {
    reading: 'sui / mizu | shuǐ',
    meaning: 'Air (4 Goresan)',
    mnemonic: 'Aliran sungai di tengah berkait, diiringi riak ombak kiri dan kanan!',
    strokeHints: [
      'Goresan 1: Garis tengah tegak lurus turun lalu kait kecil ke kiri atas (亅).',
      'Goresan 2: Sisi kiri naik ke kanan lalu turun tajam membentuk siku (フ).',
      'Goresan 3: Sapuan pendek dari kanan atas mendekati batang tengah (↙).',
      'Goresan 4: Tarik memanjang dari tengah ke kanan bawah menyerupai aliran (↘).',
    ],
    compounds: [
      { word: '水曜日', reading: 'すいようび (suiyoubi)', meaning: 'Hari Rabu' },
      { word: 'お水', reading: 'おみず (omizu)', meaning: 'Air minum' },
      { word: '水道', reading: 'すいどう (suidou)', meaning: 'Keran / saluran air' },
    ],
  },
  車: {
    reading: 'sha / kuruma | chē',
    meaning: 'Mobil / Kendaraan (7 Goresan)',
    mnemonic: 'Tampak atas kereta roda: atap atas, kabin 日 di tengah, lantai bawah, lalu poros roda menembus lurus di akhir!',
    strokeHints: [
      'Goresan 1: Garis datar atas (→).',
      'Goresan 2: Dinding kiri kotak tengah turun (↓).',
      'Goresan 3: Atap kotak lalu lipat kanan turun (┐).',
      'Goresan 4: Garis horizontal di dalam kotak (→).',
      'Goresan 5: Garis datar penutup bawah kotak tengah (→).',
      'Goresan 6: Garis datar panjang sumbu roda bawah (→).',
      'Goresan 7: Poros panjang vertikal menembus dari puncak sampai dasar (↓).',
    ],
    compounds: [
      { word: '電車', reading: 'でんしゃ (densha)', meaning: 'Kereta listrik' },
      { word: '自動車', reading: 'じどうしゃ (jidousha)', meaning: 'Mobil' },
      { word: '自転車', reading: 'じてんしゃ (jitensha)', meaning: 'Sepeda' },
    ],
  },
  人: {
    reading: 'jin / nin / hito | rén',
    meaning: 'Orang / Manusia (2 Goresan)',
    mnemonic: 'Dua garis saling bersandar seperti manusia yang berjalan bersama.',
    strokeHints: [
      'Goresan 1: Sapuan melengkung panjang dari puncak atas turun ke kiri bawah (↙).',
      'Goresan 2: Menempel di tengah batang pertama, lalu meluncur ke kanan bawah (↘).',
    ],
    compounds: [
      { word: '日本人', reading: 'にほんじん (nihonjin)', meaning: 'Orang Jepang' },
      { word: '外国人', reading: 'がいこくじん (gaikokujin)', meaning: 'Orang asing' },
    ],
  },
  大: {
    reading: 'dai / ookii | dà',
    meaning: 'Besar (3 Goresan)',
    mnemonic: 'Orang (人) yang merentangkan kedua tangannya selebar mungkin.',
    strokeHints: [
      'Goresan 1: Rentangan tangan horizontal kiri ke kanan (→).',
      'Goresan 2: Kepala dan kaki kiri melengkung turun ke kiri bawah (↙).',
      'Goresan 3: Kaki kanan melebar kokoh ke kanan bawah (↘).',
    ],
    compounds: [
      { word: '大学', reading: 'だいがく (daigaku)', meaning: 'Universitas' },
      { word: '大丈夫', reading: 'だいじょうぶ (daijoubu)', meaning: 'Tidak apa-apa / aman' },
    ],
  },
  百: {
    reading: 'hyaku | bǎi',
    meaning: 'Seratus (100 · 6 Goresan)',
    mnemonic: 'Angka satu (一) di atas kotak putih (白) = 100!',
    compounds: [
      { word: '百円', reading: 'ひゃくえん (hyaku-en)', meaning: '100 Yen' },
      { word: '三百', reading: 'さんびゃく (sanbyaku)', meaning: '300' },
    ],
  },
  円: {
    reading: 'en / marui | yuán',
    meaning: 'Yen (Mata Uang) / Bulat (4 Goresan)',
    mnemonic: 'Bingkai luar kiri (↓), lengkungan kanan berkait (┐), tiang tengah, dan sabuk penutup.',
    compounds: [
      { word: '千円', reading: 'せんえん (sen-en)', meaning: '1.000 Yen' },
      { word: '万円', reading: 'まんえん (man-en)', meaning: '10.000 Yen' },
    ],
  },
  あ: {
    reading: 'a (Hiragana)',
    meaning: 'Vokal Hiragana A (3 Goresan)',
    mnemonic: 'Palang atas (1), tiang melengkung miring (2), lalu lingkaran ekor besar ala huruf "a" (3)!',
    strokeHints: [
      'Goresan 1: Garis datar pendek agak melengkung naik di atas (→).',
      'Goresan 2: Tiang melengkung turun memotong garis pertama ke bawah.',
      'Goresan 3: Masuk miring ke kiri bawah lalu putar melingkar lebar ke kanan bawah.',
    ],
    compounds: [
      { word: 'あさ', reading: 'asa', meaning: 'Pagi hari' },
      { word: 'ありがとう', reading: 'arigatou', meaning: 'Terima kasih' },
    ],
  },
  カ: {
    reading: 'ka (Katakana)',
    meaning: 'Silabel Katakana KA (2 Goresan)',
    mnemonic: 'Bentuk sudut tajam seperti kata カ (chikara/tenaga): bahu & kait dulu (1), baru belah miring ke kiri (2).',
    strokeHints: [
      'Goresan 1: Tarik datar ke kanan lalu turun tajam dengan kait (フ berkait).',
      'Goresan 2: Tarik memotong miring melengkung ke kiri bawah (↙).',
    ],
    compounds: [
      { word: 'カメラ', reading: 'kamera', meaning: 'Kamera' },
      { word: 'カード', reading: 'kaado', meaning: 'Kartu' },
    ],
  },
};

function mergeEntry(raw: RawKakijunChar): KakijunCharEntry {
  const rich = PEDAGOGICAL_DETAILS[raw.char];
  return {
    char: raw.char,
    type: raw.script,
    reading: rich?.reading || raw.romaji || raw.char,
    meaningId: rich?.meaning || raw.meaning || `Karakter "${raw.char}"`,
    strokeCount: raw.strokeCount,
    strokes: raw.strokes.map((st, idx) => ({
      ...st,
      hint: rich?.strokeHints?.[idx] || st.hint,
    })),
    mnemonicId:
      rich?.mnemonic ||
      `Ditulis bertahap dalam ${raw.strokeCount} goresan berurutan dari kiri ke kanan, atas ke bawah.`,
    compounds: rich?.compounds,
  };
}

const PINYIN_TONE_RE = /[āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜü]/i;

const ZH_READING_OVERRIDE: Record<string, string> = {
  '一': 'yī',
  '二': 'èr',
  '三': 'sān',
  '四': 'sì',
  '五': 'wǔ',
  '水': 'shuǐ',
  '山': 'shān',
  '川': 'chuān',
  '心': 'xīn',
  '安': 'ān',
  '好': 'hǎo',
  '車': 'chē',
  '车': 'chē',
  '人': 'rén',
  '大': 'dà',
  '百': 'bǎi',
  '円': 'yuán',
  '元': 'yuán',
};

const ZH_COMPOUNDS_OVERRIDE: Record<string, Array<{ word: string; reading: string; meaning: string }>> = {
  '一': [
    { word: '一个', reading: 'yí gè', meaning: '1 buah' },
    { word: '一月', reading: 'yī yuè', meaning: 'Bulan Januari' },
    { word: '第一', reading: 'dì yī', meaning: 'Nomor satu / pertama' },
  ],
  '二': [
    { word: '二十', reading: 'èr shí', meaning: 'Dua puluh (20)' },
    { word: '二月', reading: 'èr yuè', meaning: 'Bulan Februari' },
    { word: '第二', reading: 'dì èr', meaning: 'Kedua' },
  ],
  '三': [
    { word: '三个', reading: 'sān gè', meaning: '3 buah' },
    { word: '星期三', reading: 'xīngqīsān', meaning: 'Hari Rabu' },
  ],
  '四': [
    { word: '四个', reading: 'sì gè', meaning: '4 buah' },
    { word: '十四', reading: 'shísì', meaning: 'Empat belas (14)' },
  ],
  '五': [
    { word: '五个', reading: 'wǔ gè', meaning: '5 buah' },
    { word: '五月', reading: 'wǔ yuè', meaning: 'Bulan Mei' },
    { word: '星期五', reading: 'xīngqīwǔ', meaning: 'Hari Jumat' },
  ],
  '水': [
    { word: '喝水', reading: 'hē shuǐ', meaning: 'Minum air' },
    { word: '水果', reading: 'shuǐguǒ', meaning: 'Buah-buahan' },
    { word: '开水', reading: 'kāishuǐ', meaning: 'Air matang' },
  ],
  '山': [
    { word: '爬山', reading: 'páshān', meaning: 'Mendaki gunung' },
    { word: '火山', reading: 'huǒshān', meaning: 'Gunung berapi' },
  ],
  '心': [
    { word: '开心', reading: 'kāixīn', meaning: 'Senang / gembira' },
    { word: '小心', reading: 'xiǎoxīn', meaning: 'Berhati-hati' },
  ],
  '安': [
    { word: '安全', reading: 'ānquán', meaning: 'Aman / keselamatan' },
    { word: '晚安', reading: "wǎn'ān", meaning: 'Selamat malam' },
  ],
  '好': [
    { word: '你好', reading: 'nǐ hǎo', meaning: 'Halo' },
    { word: '好吃', reading: 'hǎochī', meaning: 'Enak / lezat' },
    { word: '很好', reading: 'hěn hǎo', meaning: 'Sangat baik' },
  ],
  '車': [
    { word: '汽車', reading: 'qìchē', meaning: 'Mobil' },
    { word: '火車', reading: 'huǒchē', meaning: 'Kereta api' },
  ],
  '车': [
    { word: '汽车', reading: 'qìchē', meaning: 'Mobil' },
    { word: '火车', reading: 'huǒchē', meaning: 'Kereta api' },
  ],
  '人': [
    { word: '中国人', reading: 'Zhōngguórén', meaning: 'Orang Tiongkok' },
    { word: '大人', reading: 'dàrén', meaning: 'Orang dewasa' },
  ],
  '大': [
    { word: '大家', reading: 'dàjiā', meaning: 'Semua orang' },
    { word: '大学', reading: 'dàxué', meaning: 'Universitas' },
  ],
  '百': [
    { word: '一百', reading: 'yì bǎi', meaning: 'Seratus (100)' },
    { word: '两百', reading: 'liǎng bǎi', meaning: 'Dua ratus (200)' },
  ],
  '円': [
    { word: '元', reading: 'yuán', meaning: 'Satuan mata uang Yuan' },
  ],
  '元': [
    { word: '十元', reading: 'shí yuán', meaning: '10 Yuan' },
  ],
};

export function cleanReadingForLang(
  rawReading: string | undefined,
  fallbackReading: string,
  targetLang?: 'ja' | 'zh' | 'en' | string,
  char?: string
): string {
  const source = (rawReading || fallbackReading || '').trim();
  if (!source) return fallbackReading || '';

  if (targetLang === 'zh') {
    if (char && ZH_READING_OVERRIDE[char]) {
      if (!rawReading || /\/|\|/.test(rawReading) || !PINYIN_TONE_RE.test(rawReading)) {
        return ZH_READING_OVERRIDE[char];
      }
    }
    const pipeParts = source.split('|').map((p) => p.trim()).filter(Boolean);
    const zhPipe = pipeParts.find((p) => PINYIN_TONE_RE.test(p));
    if (zhPipe) {
      return zhPipe.replace(/\([^)]*\)/g, '').trim();
    }
    const slashParts = source.split('/').map((p) => p.trim()).filter(Boolean);
    const zhSlash = slashParts.filter((p) => PINYIN_TONE_RE.test(p));
    if (zhSlash.length > 0) {
      return zhSlash.join(' / ');
    }
    if (char && ZH_READING_OVERRIDE[char]) return ZH_READING_OVERRIDE[char];
    return pipeParts.length > 1 ? pipeParts[pipeParts.length - 1] : source;
  }

  if (targetLang === 'ja') {
    const pipeParts = source.split('|').map((p) => p.trim()).filter(Boolean);
    const jaPipes = pipeParts.filter((p) => !PINYIN_TONE_RE.test(p));
    const joined = jaPipes.length > 0 ? jaPipes.join(' / ') : source;
    const slashParts = joined
      .split('/')
      .map((p) => p.trim())
      .filter((p) => Boolean(p) && !PINYIN_TONE_RE.test(p));
    if (slashParts.length > 0) {
      return slashParts.join(' / ');
    }
  }

  return source;
}

export function resolveKakijunEntryForLang(
  entry: KakijunCharEntry,
  targetLang?: 'ja' | 'zh' | 'en' | string
): KakijunCharEntry {
  const cleanReading = cleanReadingForLang(entry.reading, entry.reading, targetLang, entry.char);
  const resolvedType: KakijunCharEntry['type'] =
    targetLang === 'zh' && entry.type === 'kanji' ? 'hanzi' : entry.type;
  const resolvedCompounds =
    targetLang === 'zh' && ZH_COMPOUNDS_OVERRIDE[entry.char]
      ? ZH_COMPOUNDS_OVERRIDE[entry.char]
      : entry.compounds;
  return {
    ...entry,
    type: resolvedType,
    reading: cleanReading,
    compounds: resolvedCompounds,
  };
}

// Dual-authority CJK stroke banks:
// - ja: KanjiVG r20260714 (JIS/MEXT stroke order + kvg:type + curated StrokeNumbers numPos)
// - zh: MakeMeAHanzi (PRC Simplified/Traditional stroke order)
interface AuthoritativeStrokeSpec {
  d: string;
  kvgType?: string;
  numPos?: [number, number];
}

const DYNAMIC_JA_CACHE: Record<string, AuthoritativeStrokeSpec[]> = {};
const DYNAMIC_ZH_CACHE: Record<string, AuthoritativeStrokeSpec[]> = {};
const DYNAMIC_INFLIGHT = new Map<string, Promise<boolean>>();
let bundlePreloadPromise: Promise<void> | null = null;
const kanjiVgListeners = new Set<() => void>();

function normalizeCjkLang(targetLang?: string): 'ja' | 'zh' {
  return String(targetLang || 'ja').toLowerCase().startsWith('zh') ? 'zh' : 'ja';
}

function parseStrokeTupleList(rawArr: unknown): AuthoritativeStrokeSpec[] {
  if (!Array.isArray(rawArr)) return [];
  const out: AuthoritativeStrokeSpec[] = [];
  for (const item of rawArr) {
    if (typeof item === 'string' && item.trim().length > 2) {
      out.push({ d: item.trim() });
    } else if (Array.isArray(item) && typeof item[0] === 'string' && item[0].trim().length > 2) {
      const hasPos = typeof item[2] === 'number' && typeof item[3] === 'number';
      out.push({
        d: item[0].trim(),
        kvgType: typeof item[1] === 'string' && item[1].trim() ? item[1].trim() : undefined,
        numPos: hasPos ? [Number(item[2]), Number(item[3])] : undefined,
      });
    } else if (item && typeof item === 'object' && typeof (item as { d?: unknown }).d === 'string') {
      const obj = item as {
        d: string;
        kvgType?: string;
        type?: string;
        numPos?: [number, number];
      };
      out.push({
        d: obj.d.trim(),
        kvgType: (obj.kvgType || obj.type || '').trim() || undefined,
        numPos:
          Array.isArray(obj.numPos) && obj.numPos.length === 2
            ? [Number(obj.numPos[0]), Number(obj.numPos[1])]
            : undefined,
      });
    }
  }
  return out;
}

function notifyKanjiVgListeners(): void {
  kanjiVgListeners.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
}

export function subscribeKanjiVgUpdates(cb: () => void): () => void {
  kanjiVgListeners.add(cb);
  return () => {
    kanjiVgListeners.delete(cb);
  };
}

export function preloadKanjiVgBundle(): Promise<void> {
  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return Promise.resolve();
  }
  if (bundlePreloadPromise) return bundlePreloadPromise;
  const candidates = [
    './features/voice-studio/dist/assets/kanji-vg-strokes.json',
    '/features/voice-studio/dist/assets/kanji-vg-strokes.json',
    './assets/kanji-vg-strokes.json',
    '/assets/kanji-vg-strokes.json',
  ];
  bundlePreloadPromise = (async () => {
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) continue;
        const data = (await res.json()) as Record<string, unknown>;
        if (data && typeof data === 'object') {
          let added = 0;
          for (const [k, v] of Object.entries(data)) {
            if (!DYNAMIC_JA_CACHE[k]) {
              const parsed = parseStrokeTupleList(v);
              if (parsed.length > 0) {
                DYNAMIC_JA_CACHE[k] = parsed;
                added += 1;
              }
            }
          }
          if (added > 0) notifyKanjiVgListeners();
          break;
        }
      } catch {}
    }
  })();
  return bundlePreloadPromise;
}

if (typeof window !== 'undefined') {
  void preloadKanjiVgBundle();
}

interface SvgStrokeGeometry {
  start: [number, number];
  end: [number, number];
  mid: [number, number];
  p28: [number, number];
  p55: [number, number];
  p82: [number, number];
  initialTangent: [number, number];
  midTangent: [number, number];
  tailTangent: [number, number];
  finalTangent: [number, number];
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  points: Array<[number, number]>;
  totalLength: number;
}

function samplePointAtArcFraction(
  pts: Array<[number, number]>,
  cumLen: number[],
  totalLen: number,
  frac: number
): [number, number] {
  if (pts.length === 0) return [50, 50];
  if (totalLen <= 0 || frac <= 0) return pts[0];
  if (frac >= 1) return pts[pts.length - 1];
  const target = totalLen * frac;
  for (let i = 1; i < pts.length; i++) {
    if (cumLen[i] >= target) {
      const segLen = Math.max(1e-6, cumLen[i] - cumLen[i - 1]);
      const t = (target - cumLen[i - 1]) / segLen;
      return [
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t,
      ];
    }
  }
  return pts[pts.length - 1];
}

function normVec(ax: number, ay: number, bx: number, by: number): [number, number] {
  const vx = bx - ax;
  const vy = by - ay;
  const l = Math.hypot(vx, vy) || 1;
  return [vx / l, vy / l];
}

function extractSvgStrokeGeometry(d: string): SvgStrokeGeometry {
  const tokens = (d || '').match(/[MmLlHhVvCcSsQqTtZz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g) || [];
  const points: Array<[number, number]> = [];
  let cx = 0;
  let cy = 0;
  let startSubX = 0;
  let startSubY = 0;
  let idx = 0;
  let cmd = '';

  const isCmd = (t: string) => /^[MmLlHhVvCcSsQqTtZz]$/.test(t);
  const nextNum = (): number => {
    if (idx < tokens.length && !isCmd(tokens[idx])) {
      return Number(tokens[idx++]);
    }
    return 0;
  };
  const pushPt = (x: number, y: number) => {
    if (Number.isFinite(x) && Number.isFinite(y)) {
      points.push([x, y]);
      cx = x;
      cy = y;
    }
  };
  const sampleCubic = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    for (let s = 1; s <= 6; s++) {
      const t = s / 6;
      const mt = 1 - t;
      const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
      const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
      points.push([x, y]);
    }
    cx = x3;
    cy = y3;
  };
  const sampleQuad = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number) => {
    for (let s = 1; s <= 5; s++) {
      const t = s / 5;
      const mt = 1 - t;
      const x = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2;
      const y = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2;
      points.push([x, y]);
    }
    cx = x2;
    cy = y2;
  };

  let lastCp2: [number, number] | null = null;
  let lastQuadCp: [number, number] | null = null;

  while (idx < tokens.length) {
    if (isCmd(tokens[idx])) {
      cmd = tokens[idx++];
      if (cmd === 'Z' || cmd === 'z') {
        pushPt(startSubX, startSubY);
        lastCp2 = null;
        lastQuadCp = null;
        continue;
      }
    }
    if (!cmd) {
      idx++;
      continue;
    }
    if (cmd === 'M' || cmd === 'm') {
      const rx = nextNum();
      const ry = nextNum();
      const x = cmd === 'm' ? cx + rx : rx;
      const y = cmd === 'm' ? cy + ry : ry;
      startSubX = x;
      startSubY = y;
      pushPt(x, y);
      cmd = cmd === 'm' ? 'l' : 'L';
      lastCp2 = null;
      lastQuadCp = null;
    } else if (cmd === 'L' || cmd === 'l') {
      const rx = nextNum();
      const ry = nextNum();
      pushPt(cmd === 'l' ? cx + rx : rx, cmd === 'l' ? cy + ry : ry);
      lastCp2 = null;
      lastQuadCp = null;
    } else if (cmd === 'H' || cmd === 'h') {
      const rx = nextNum();
      pushPt(cmd === 'h' ? cx + rx : rx, cy);
      lastCp2 = null;
      lastQuadCp = null;
    } else if (cmd === 'V' || cmd === 'v') {
      const ry = nextNum();
      pushPt(cx, cmd === 'v' ? cy + ry : ry);
      lastCp2 = null;
      lastQuadCp = null;
    } else if (cmd === 'C' || cmd === 'c') {
      const rel = cmd === 'c';
      const x1 = rel ? cx + nextNum() : nextNum();
      const y1 = rel ? cy + nextNum() : nextNum();
      const x2 = rel ? cx + nextNum() : nextNum();
      const y2 = rel ? cy + nextNum() : nextNum();
      const x3 = rel ? cx + nextNum() : nextNum();
      const y3 = rel ? cy + nextNum() : nextNum();
      sampleCubic(cx, cy, x1, y1, x2, y2, x3, y3);
      lastCp2 = [x2, y2];
      lastQuadCp = null;
    } else if (cmd === 'S' || cmd === 's') {
      const rel = cmd === 's';
      const x1 = lastCp2 ? 2 * cx - lastCp2[0] : cx;
      const y1 = lastCp2 ? 2 * cy - lastCp2[1] : cy;
      const x2 = rel ? cx + nextNum() : nextNum();
      const y2 = rel ? cy + nextNum() : nextNum();
      const x3 = rel ? cx + nextNum() : nextNum();
      const y3 = rel ? cy + nextNum() : nextNum();
      sampleCubic(cx, cy, x1, y1, x2, y2, x3, y3);
      lastCp2 = [x2, y2];
      lastQuadCp = null;
    } else if (cmd === 'Q' || cmd === 'q') {
      const rel = cmd === 'q';
      const x1 = rel ? cx + nextNum() : nextNum();
      const y1 = rel ? cy + nextNum() : nextNum();
      const x2 = rel ? cx + nextNum() : nextNum();
      const y2 = rel ? cy + nextNum() : nextNum();
      sampleQuad(cx, cy, x1, y1, x2, y2);
      lastQuadCp = [x1, y1];
      lastCp2 = null;
    } else if (cmd === 'T' || cmd === 't') {
      const rel = cmd === 't';
      const x1 = lastQuadCp ? 2 * cx - lastQuadCp[0] : cx;
      const y1 = lastQuadCp ? 2 * cy - lastQuadCp[1] : cy;
      const x2 = rel ? cx + nextNum() : nextNum();
      const y2 = rel ? cy + nextNum() : nextNum();
      sampleQuad(cx, cy, x1, y1, x2, y2);
      lastQuadCp = [x1, y1];
      lastCp2 = null;
    } else {
      idx++;
    }
  }

  if (points.length === 0) {
    return {
      start: [30, 30],
      end: [70, 30],
      mid: [50, 30],
      p28: [41, 30],
      p55: [52, 30],
      p82: [63, 30],
      initialTangent: [1, 0],
      midTangent: [1, 0],
      tailTangent: [1, 0],
      finalTangent: [1, 0],
      bbox: { minX: 30, minY: 30, maxX: 70, maxY: 30 },
      points: [[30, 30], [70, 30]],
      totalLength: 40,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const cumLen: number[] = [0];
  let totalLength = 0;
  for (let i = 0; i < points.length; i++) {
    const [px, py] = points[i];
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
    if (i > 0) {
      totalLength += Math.hypot(px - points[i - 1][0], py - points[i - 1][1]);
      cumLen.push(totalLength);
    }
  }

  const start = points[0];
  const end = points[points.length - 1];
  const p28 = samplePointAtArcFraction(points, cumLen, totalLength, 0.28);
  const p55 = samplePointAtArcFraction(points, cumLen, totalLength, 0.55);
  const p82 = samplePointAtArcFraction(points, cumLen, totalLength, 0.82);

  return {
    start,
    end,
    mid: p55,
    p28,
    p55,
    p82,
    initialTangent: normVec(start[0], start[1], p28[0], p28[1]),
    midTangent: normVec(p28[0], p28[1], p82[0], p82[1]),
    tailTangent: normVec(p82[0], p82[1], end[0], end[1]),
    finalTangent: normVec(p55[0], p55[1], end[0], end[1]),
    bbox: { minX, minY, maxX, maxY },
    points,
    totalLength,
  };
}

const KVG_TYPE_HINTS: Record<string, string> = {
  '㇐': 'Garis mendatar dari kiri ke kanan (→)',
  '一': 'Garis mendatar dari kiri ke kanan (→)',
  '㇑': 'Garis tegak lurus turun ke bawah (↓)',
  '丨': 'Garis tegak lurus turun ke bawah (↓)',
  '㇒': 'Tarik miring melengkung ke kiri bawah (↙)',
  '丿': 'Tarik miring melengkung ke kiri bawah (↙)',
  '㇏': 'Tarik miring menekan ke kanan bawah (↘)',
  '㇔': 'Titik pendek tegas ke arah kanan bawah (丶)',
  '丶': 'Titik pendek tegas ke arah kanan bawah (丶)',
  '㇀': 'Tarik naik serong dari kiri bawah ke kanan atas (↗)',
  '㇕': 'Tarik mendatar ke kanan lalu belok tegak turun ke bawah (┐)',
  '㇕b': 'Tarik mendatar ke kanan lalu belok turun melengkung ke kiri (𠃌)',
  '㇕c': 'Tarik mendatar ke kanan lalu belok turun dengan sudut tajam (┐)',
  '㇖': 'Tarik mendatar ke kanan lalu kait balik ke kiri bawah (乛)',
  '㇚': 'Tarik tegak lurus turun lalu kait kecil ke kiri atas (亅)',
  '㇟': 'Tarik tegak turun lalu melengkung ke kanan dan kait naik ke atas (乚)',
  '㇙': 'Tarik tegak turun ke bawah lalu kait serong ke kanan atas (𠄌)',
  '㇗': 'Tarik tegak turun lalu belok mendatar ke kanan (└)',
  '㇜': 'Tarik serong ke kiri bawah lalu belok mendatar ke kanan (∠)',
  '㇛': 'Tarik serong ke kiri bawah lalu belok ke kanan bawah (く)',
  '㇉': 'Tarik turun, belok ke kanan, lalu belok turun dengan kait (ㄣ)',
  '㇈': 'Tarik mendatar ke kanan, belok turun, lalu melengkung keluar dengan kait',
  '㇊': 'Tarik mendatar ke kanan, turun ke kiri bawah, lalu kait kecil',
  '㇋': 'Tarik zig-zag kanan-bawah-kanan lalu melengkung turun (㇋)',
  '㇌': 'Tarik mendatar ke kanan lalu belok ganda melengkung turun dengan kait',
  '㇡': 'Tarik serong ganda dengan kait keluar di ujung (ㄋ)',
  '乙': 'Tarik lengkung turun-kanan-bawah lalu kait ke atas (乙)',
};

function computeSmartNumPos(geom: SvgStrokeGeometry): [number, number] {
  const [sx, sy] = geom.start;
  const [tx, ty] = geom.initialTangent;
  // Normal tegak lurus: pilih arah yang sedikit mengarah ke atas/kiri agar tidak menimpa badan goresan
  let nx = ty;
  let ny = -tx;
  if (ny > 0.35 || (Math.abs(ny) <= 0.35 && nx > 0.4)) {
    nx = -nx;
    ny = -ny;
  }
  const dist = 6.2;
  return [
    Math.max(5.5, Math.min(103.5, Math.round((sx + nx * dist) * 10) / 10)),
    Math.max(6.5, Math.min(102.5, Math.round((sy + ny * dist) * 10) / 10)),
  ];
}

function buildStrokeHintFromPath(
  d: string,
  order: number,
  _sx?: number,
  _sy?: number,
  kvgType?: string,
  geomPre?: SvgStrokeGeometry
): string {
  const cleanType = (kvgType || '').trim();
  if (cleanType) {
    if (KVG_TYPE_HINTS[cleanType]) {
      return `Goresan ${order}: ${KVG_TYPE_HINTS[cleanType]}`;
    }
    const baseType = cleanType.replace(/[a-z0-9]+$/i, '');
    if (KVG_TYPE_HINTS[baseType]) {
      return `Goresan ${order}: ${KVG_TYPE_HINTS[baseType]}`;
    }
  }

  const geom = geomPre || extractSvgStrokeGeometry(d);
  const dx = geom.end[0] - geom.start[0];
  const dy = geom.end[1] - geom.start[1];
  const [itx, ity] = geom.initialTangent;
  const [mtx, mty] = geom.midTangent;
  const [ttx, tty] = geom.tailTangent;
  const width = geom.bbox.maxX - geom.bbox.minX;
  const height = geom.bbox.maxY - geom.bbox.minY;

  if (geom.totalLength < 17) {
    return `Goresan ${order}: Titik pendek tegas (丶)`;
  }

  // Cek bentuk sudut & kait berbasis segmen panjang busur (untuk Hanzi MakeMeAHanzi tanpa kvg:type)
  const [dx1, dy1] = [geom.p28[0] - geom.start[0], geom.p28[1] - geom.start[1]];
  const [dx2, dy2] = [geom.p82[0] - geom.p28[0], geom.p82[1] - geom.p28[1]];
  const [dx3, dy3] = [geom.end[0] - geom.p82[0], geom.end[1] - geom.p82[1]];
  const hasRightStart = dx1 > 8 && Math.abs(dy1) < dx1 * 0.65 && itx > 0.65;
  const hasDownStart = dy1 > 8 && Math.abs(dx1) < dy1 * 0.65 && ity > 0.65;
  const hasLeftHookEnd = dx3 < -3.5 && dy3 <= 4 && ttx < -0.45;
  const hasUpHookEnd = dy3 < -3.5 && tty < -0.45;

  // 1) Mendatar ke kanan lalu belok turun (+ opsional kait kiri: ┐ atau 𠃌) — misal 为 stroke 3, 月, 用, 门
  if (hasRightStart && mty > 0.5 && height > 14 && width > 14) {
    if (hasLeftHookEnd) {
      return `Goresan ${order}: Tarik mendatar ke kanan lalu belok turun dan beri kait ke kiri (𠃌)`;
    }
    return `Goresan ${order}: Tarik mendatar ke kanan lalu belok tegak turun ke bawah (┐)`;
  }

  // 2) Turun lalu belok mendatar ke kanan (+ opsional kait naik: └ atau 乚) — misal 说 stroke 9, 心 stroke 2
  if ((hasDownStart || ity > 0.55) && mtx > 0.5 && Math.hypot(dx2, dy2) > 10 && width > 14) {
    if (hasUpHookEnd) {
      return `Goresan ${order}: Tarik turun lalu melengkung ke kanan dan beri kait naik ke atas (乚)`;
    }
    return `Goresan ${order}: Tarik tegak turun lalu belok mendatar ke kanan (└)`;
  }

  // 3) Turun vertikal lalu kait kecil ke kiri atas (亅) — misal 好 stroke 5, 水 stroke 1, 小 stroke 1
  if (ity > 0.65 && mty > 0.55 && height > 20 && width < height * 0.65 && hasLeftHookEnd) {
    return `Goresan ${order}: Tarik tegak lurus turun lalu beri kait kecil ke kiri atas (亅)`;
  }

  // 4) Turun ke kiri lalu belok ke kanan bawah (く) — misal 好 stroke 1, 女 stroke 1
  if (itx < -0.25 && ity > 0.4 && mtx > 0.45 && mty > 0.3 && dx2 > 8 && dy2 > 5) {
    return `Goresan ${order}: Tarik miring ke kiri bawah lalu belok ke kanan bawah (く)`;
  }

  if (dy < -8 && dx > 6 && Math.abs(dy) >= Math.abs(dx) * 0.3) {
    return `Goresan ${order}: Tarik naik serong dari kiri bawah ke kanan atas (↗)`;
  }
  if (Math.abs(dx) > Math.abs(dy) * 1.75) {
    return dx < 0
      ? `Goresan ${order}: Garis mendatar ke kiri (←)`
      : `Goresan ${order}: Garis mendatar dari kiri ke kanan (→)`;
  }
  if (Math.abs(dy) > Math.abs(dx) * 1.75) {
    return `Goresan ${order}: Garis tegak lurus turun ke bawah (↓)`;
  }
  if (/[cqs]/i.test(d) && Math.abs(dx) > 10 && Math.abs(dy) > 10) {
    return dx < 0
      ? `Goresan ${order}: Tarik miring melengkung ke kiri bawah (↙)`
      : `Goresan ${order}: Tarik miring ke kanan bawah (↘)`;
  }
  return dx < 0
    ? `Goresan ${order}: Goresan miring turun ke kiri (↙)`
    : `Goresan ${order}: Goresan miring turun ke kanan (↘)`;
}

function buildKakijunEntryFromSpecs(
  ch: string,
  specs: AuthoritativeStrokeSpec[],
  targetLang?: string,
  metaSeed?: KakijunCharEntry | null
): KakijunCharEntry {
  const normLang = normalizeCjkLang(targetLang);
  const strokes: KakijunStrokeItem[] = specs.map((spec, idx) => {
    const geom = extractSvgStrokeGeometry(spec.d);
    const numPos = spec.numPos
      ? [
          Math.max(4.5, Math.min(104.5, Math.round(spec.numPos[0] * 10) / 10)),
          Math.max(5.5, Math.min(103.5, Math.round(spec.numPos[1] * 10) / 10)),
        ] as [number, number]
      : computeSmartNumPos(geom);
    return {
      order: idx + 1,
      d: spec.d,
      start: [Math.round(geom.start[0] * 10) / 10, Math.round(geom.start[1] * 10) / 10],
      numPos,
      hint: buildStrokeHintFromPath(spec.d, idx + 1, geom.start[0], geom.start[1], spec.kvgType, geom),
    };
  });

  const baseType: KakijunCharEntry['type'] =
    metaSeed?.type && metaSeed.type !== 'kanji'
      ? metaSeed.type
      : normLang === 'zh'
        ? 'hanzi'
        : 'kanji';
  const authLabel = normLang === 'zh' ? 'standar Hanzi PRC' : 'KanjiVG resmi';

  return {
    char: ch,
    type: baseType,
    reading: metaSeed?.reading || ch,
    meaningId: metaSeed?.meaningId || `Karakter "${ch}"`,
    strokeCount: strokes.length,
    strokes,
    mnemonicId:
      metaSeed?.mnemonicId ||
      `Urutan ${authLabel} (${strokes.length} goresan) — ikuti titik nomor 1 sampai ${strokes.length} sesuai arah coretan.`,
    compounds: metaSeed?.compounds,
  };
}

export async function ensureKanjiStrokesLoaded(char?: string, targetLang?: string): Promise<boolean> {
  const ch = ((char || '').trim().match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/) || [])[0];
  if (!ch) return false;
  const normLang = normalizeCjkLang(targetLang);
  const inflightKey = `${normLang}::${ch}`;

  if (normLang === 'zh') {
    if (DYNAMIC_ZH_CACHE[ch]?.length) return true;
  } else {
    if (DYNAMIC_JA_CACHE[ch]?.length) return true;
    await preloadKanjiVgBundle();
    if (DYNAMIC_JA_CACHE[ch]?.length) return true;
    if (KAKIJUN_CORE_VECTORS[ch] || EXTRA_CHARS[ch]) return true;
  }

  const existingReq = DYNAMIC_INFLIGHT.get(inflightKey);
  if (existingReq) return existingReq;
  if (typeof window === 'undefined' || typeof fetch !== 'function') return false;

  const promise = (async () => {
    try {
      const res = await fetch(
        `/api/kanji/strokes?char=${encodeURIComponent(ch)}&lang=${encodeURIComponent(normLang)}`,
        { cache: 'force-cache' }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          ok?: boolean;
          rawEntries?: unknown;
          strokes?: unknown;
          paths?: unknown;
        };
        const specs =
          parseStrokeTupleList(json?.rawEntries).length > 0
            ? parseStrokeTupleList(json.rawEntries)
            : parseStrokeTupleList(json?.strokes).length > 0
              ? parseStrokeTupleList(json.strokes)
              : parseStrokeTupleList(json?.paths);
        if (json?.ok && specs.length > 0) {
          if (normLang === 'zh') {
            DYNAMIC_ZH_CACHE[ch] = specs;
          } else {
            DYNAMIC_JA_CACHE[ch] = specs;
          }
          notifyKanjiVgListeners();
          return true;
        }
      }
    } catch {}
    return false;
  })();

  DYNAMIC_INFLIGHT.set(inflightKey, promise);
  return promise;
}

export function getKakijunEntry(char?: string, targetLang?: string): KakijunCharEntry | null {
  const ch = (char || '').trim()[0];
  if (!ch) return null;
  const normLang = normalizeCjkLang(targetLang);
  const rawStatic = KAKIJUN_CORE_VECTORS[ch] || EXTRA_CHARS[ch];
  const staticEntry = rawStatic ? mergeEntry(rawStatic) : null;

  if (normLang === 'zh') {
    const zhSpecs = DYNAMIC_ZH_CACHE[ch];
    if (Array.isArray(zhSpecs) && zhSpecs.length > 0) {
      const seed = staticEntry ? resolveKakijunEntryForLang(staticEntry, 'zh') : null;
      return buildKakijunEntryFromSpecs(ch, zhSpecs, 'zh', seed);
    }
    if (staticEntry) {
      return resolveKakijunEntryForLang(staticEntry, 'zh');
    }
    const jaFallbackSpecs = DYNAMIC_JA_CACHE[ch];
    if (Array.isArray(jaFallbackSpecs) && jaFallbackSpecs.length > 0) {
      return buildKakijunEntryFromSpecs(ch, jaFallbackSpecs, 'zh', null);
    }
    return null;
  }

  const jaSpecs = DYNAMIC_JA_CACHE[ch];
  if (Array.isArray(jaSpecs) && jaSpecs.length > 0) {
    // Jika ada di staticEntry (Kana & 60 karakter inti dengan mnemonik), pertahankan metadata & mnemonik inti,
    // tetapi pakai stroke KanjiVG r20260714 + posisi nomor yang terkalibrasi bila bukan kana dasar.
    if (staticEntry && (staticEntry.type === 'hiragana' || staticEntry.type === 'katakana')) {
      return staticEntry;
    }
    return buildKakijunEntryFromSpecs(ch, jaSpecs, 'ja', staticEntry);
  }
  if (staticEntry) return staticEntry;

  return null;
}

/**
 * Resolver cerdas bahasa Indonesia / Inggris / Romaji / Pinyin ke karakter Kanji/Hanzi/Kana asli.
 * Mengatasi pertanyaan seperti "ajarin cara tulis kanji 5", "kanji air", "huruf hiragana a", "hanzi orang".
 */
export function resolveKakijunRequestFromPrompt(
  prompt: string,
  targetLang?: 'ja' | 'zh' | 'en' | string
): KakijunCharEntry[] {
  const raw = (prompt || '').trim();
  const lower = raw.toLowerCase();
  const wantsChar =
    /kanji|hanzi|bihua|kakijun|kana|hiragana|katakana|cara\s*(?:tulis|nulis|menulis)|urutan\s*goresan|goresan|coretan|tulis\s*huruf|aksara|karakter/i.test(
      lower
    );

  const results: KakijunCharEntry[] = [];
  const pushUnique = (entry: KakijunCharEntry | null) => {
    if (!entry) return;
    if (!results.some((x) => x.char === entry.char)) {
      results.push(entry);
    }
  };

  // 1. Cek apakah prompt menyebut karakter Kanji/Hanzi/Kana eksplisit di dalam bank
  const chars = Array.from(raw);
  for (const ch of chars) {
    if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(ch)) {
      const hit = getKakijunEntry(ch, targetLang);
      if (hit && (wantsChar || chars.length <= 4)) {
        pushUnique(hit);
      } else if (!hit && (wantsChar || chars.length <= 4) && typeof window !== 'undefined') {
        void ensureKanjiStrokesLoaded(ch, targetLang);
      }
    }
  }

  // Jika bukan permintaan tulis/karakter dan belum ketemu karakter target, hentikan
  if (!wantsChar && results.length === 0) return [];

  // 2. Pencocokan makna / angka dalam Bahasa Indonesia / Inggris / Romaji / Pinyin
  const keywordMappings: Array<[RegExp, string]> = [
    [/\b(?:hiragana)\s*(?:huruf\s*)?a\b/i, 'あ'],
    [/\b(?:hiragana)\s*(?:huruf\s*)?i\b/i, 'い'],
    [/\b(?:hiragana)\s*(?:huruf\s*)?u\b/i, 'う'],
    [/\b(?:hiragana)\s*(?:huruf\s*)?e\b/i, 'え'],
    [/\b(?:hiragana)\s*(?:huruf\s*)?o\b/i, 'お'],
    [/\b(?:hiragana)\s*(?:huruf\s*)?ka\b/i, 'か'],
    [/\b(?:katakana)\s*(?:huruf\s*)?a\b/i, 'ア'],
    [/\b(?:katakana)\s*(?:huruf\s*)?ka\b/i, 'カ'],
    [/\b(?:katakana)\s*(?:huruf\s*)?ki\b/i, 'キ'],
    [/\b(?:10000|sepuluh ribu|man)\b/i, '万'],
    [/\b(?:1000|seribu|sen)\b/i, '千'],
    [/\b(?:100|seratus|hyaku|bai)\b/i, '百'],
    [/\b(?:10|sepuluh|juu|shi)\b/i, '十'],
    [/\b(?:9|sembilan|kyuu|jiu)\b/i, '九'],
    [/\b(?:8|delapan|hachi|ba)\b/i, '八'],
    [/\b(?:7|tujuh|nana|shichi|qi)\b/i, '七'],
    [/\b(?:6|enam|roku|liu)\b/i, '六'],
    [/\b(?:5|lima|go|itsutsu|wu)\b/i, '五'],
    [/\b(?:4|empat|yon|yottsu|si)\b/i, '四'],
    [/\b(?:3|tiga|san|mittsu)\b/i, '三'],
    [/\b(?:2|dua|ni|futatsu|er)\b/i, '二'],
    [/\b(?:1|satu|ichi|hitotsu|yi)\b/i, '一'],
    [/\b(?:yen|uang yen|en)\b/i, '円'],
    [/\b(?:air|mizu|sui|shui)\b/i, '水'],
    [/\b(?:api|hi|ka|huo)\b/i, '火'],
    [/\b(?:pohon|kayu|ki|moku|mu)\b/i, '木'],
    [/\b(?:emas|uang|logam|kane|kin|jin)\b/i, '金'],
    [/\b(?:tanah|tsuchi|do|tu)\b/i, '土'],
    [/\b(?:matahari|hari|nichi|ri)\b/i, '日'],
    [/\b(?:bulan|tsuki|getsu|yue)\b/i, '月'],
    [/\b(?:gunung|yama|san|shan)\b/i, '山'],
    [/\b(?:sungai|kawa|chuan)\b/i, '川'],
    [/\b(?:mobil|kendaraan|kuruma|sha|che)\b/i, '車'],
    [/\b(?:orang|manusia|hito|ren)\b/i, '人'],
    [/\b(?:pria|laki|otoko|nan)\b/i, '男'],
    [/\b(?:wanita|perempuan|onna|nv)\b/i, '女'],
    [/\b(?:anak|ko|kodomo|zi)\b/i, '子'],
    [/\b(?:belajar|gaku|manabu|xue)\b/i, '学'],
    [/\b(?:hidup|lahir|nama|sei|ikiru|sheng)\b/i, '生'],
    [/\b(?:sekolah|kou|gakkou|xiao)\b/i, '校'],
    [/\b(?:buku|hon|ben)\b/i, '本'],
    [/\b(?:negara|kuni|koku|guo)\b/i, '国'],
    [/\b(?:besar|ookii|dai|da)\b/i, '大'],
    [/\b(?:kecil|chiisai|shou|xiao)\b/i, '小'],
    [/\b(?:tengah|dalam|naka|chuu|zhong)\b/i, '中'],
    [/\b(?:atas|ue|jou|shang)\b/i, '上'],
    [/\b(?:bawah|shita|ka|xia)\b/i, '下'],
    [/\b(?:mata|me|moku|mu)\b/i, '目'],
    [/\b(?:mulut|kuchi|kou)\b/i, '口'],
    [/\b(?:tangan|te|shu|shou)\b/i, '手'],
    [/\b(?:hati|perasaan|kokoro|xin)\b/i, '心'],
    [/\b(?:aman|anzen|yasui|an)\b/i, '安'],
    [/\b(?:baik|suka|hao)\b/i, '好'],
  ];

  // Cek juga nama huruf hiragana/katakana yang tersisa (misal "hiragana ka", "katakana su")
  const kanaNameMatch = lower.match(/\b(hiragana|katakana)\s+(?:huruf\s+)?([a-z]{1,3})\b/);
  if (kanaNameMatch) {
    const script = kanaNameMatch[1];
    const romaji = kanaNameMatch[2];
    for (const entry of Object.values(KAKIJUN_CORE_VECTORS)) {
      if (entry.script === script && entry.romaji.toLowerCase() === romaji) {
        pushUnique(mergeEntry(entry));
      }
    }
  }

  for (const [rx, targetChar] of keywordMappings) {
    if (rx.test(lower)) {
      const hit = getKakijunEntry(targetChar, targetLang);
      if (hit) {
        // Jika kursus Mandarin dan hasilnya hanya ada di JA bank, tetap pakai stroke SVG-nya dan tandai hanzi
        if (targetLang === 'zh' && hit.type === 'kanji') {
          pushUnique({ ...hit, type: 'hanzi' });
        } else {
          pushUnique(hit);
        }
      }
    }
  }

  return results.slice(0, 2);
}

/**
 * Jika user meminta karakter CJK langka yang belum ada di bundle lokal, HANYA izinkan strokePaths
 * dari otoritas server terverifikasi (`verifiedAuthority: true`, bersumber KanjiVG/MakeMeAHanzi).
 * DILARANG KERAS menerima path SVG atau jumlah goresan tebakan AI agar bebas 100% dari halusinasi.
 */
export function synthesizeFallbackStrokesForAnyChar(
  char: string,
  customPaths?: Array<{
    order?: number;
    d: string;
    start?: [number, number];
    numPos?: [number, number];
    hint?: string;
    kvgType?: string;
    type?: string;
    verifiedAuthority?: boolean;
  }>,
  _declaredStrokeCount?: number,
  targetLang?: 'ja' | 'zh' | 'en' | string
): KakijunCharEntry {
  const ch = (char || '字').trim()[0] || '字';
  const normLang = normalizeCjkLang(targetLang);

  // INVARIAN MUTLAK: Karakter terverifikasi di bank resmi (KanjiVG / MakeMeAHanzi) TIDAK PERNAH ditimpa.
  const existing = getKakijunEntry(ch, normLang);
  if (existing) {
    return existing;
  }

  // Picu unduhan asinkron dari KanjiVG JSON / endpoint resmi agar langsung ter-render ulang begitu siap
  if (typeof window !== 'undefined') {
    void ensureKanjiStrokesLoaded(ch, normLang);
  }

  // HANYA terima customPaths jika membawa cap otoritas terverifikasi dari backend / dataset resmi
  if (
    Array.isArray(customPaths) &&
    customPaths.length > 0 &&
    customPaths.every(
      (cp) => cp?.verifiedAuthority === true && typeof cp?.d === 'string' && cp.d.trim().length > 4
    )
  ) {
    const specs: AuthoritativeStrokeSpec[] = customPaths.map((cp) => ({
      d: cp.d.trim(),
      kvgType: (cp.kvgType || cp.type || '').trim() || undefined,
      numPos:
        Array.isArray(cp.numPos) && cp.numPos.length === 2
          ? [Number(cp.numPos[0]), Number(cp.numPos[1])]
          : undefined,
    }));
    if (normLang === 'zh') {
      DYNAMIC_ZH_CACHE[ch] = specs;
    } else {
      DYNAMIC_JA_CACHE[ch] = specs;
    }
    return buildKakijunEntryFromSpecs(ch, specs, normLang, null);
  }

  // JANGAN PERNAH menggambar goresan/angka tebakan AI sambil menunggu sinkronisasi KanjiVG/MakeMeAHanzi.
  return {
    char: ch,
    type: normLang === 'zh' ? 'hanzi' : 'kanji',
    reading: ch,
    meaningId: `Karakter "${ch}"`,
    strokeCount: 0,
    strokes: [],
    mnemonicId: `Memuat data urutan goresan resmi untuk karakter "${ch}"...`,
  };
}

/**
 * Merakit narasi lisan step-by-step untuk langkah kanji_grid sehingga suara tutor membacakan
 * setiap goresan secara berurutan dari coretan pertama hingga selesai.
 */
export function buildStrokeStepNarration(entry: KakijunCharEntry, targetLang?: 'ja' | 'zh' | 'en'): string {
  const resolved = resolveKakijunEntryForLang(entry, targetLang);
  const label =
    resolved.type === 'hiragana'
      ? 'Hiragana'
      : resolved.type === 'katakana'
        ? 'Katakana'
        : resolved.type === 'hanzi' || targetLang === 'zh'
          ? 'Hanzi'
          : 'Kanji';
  const cleanMeaning = resolved.meaningId
    .replace(/\s*\([^)]*Goresan[^)]*\)/gi, '')
    .replace(/\s*\(\d+\s*Goresan\)/gi, '')
    .replace(/[()]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const count = resolved.strokes.length || resolved.strokeCount || 1;
  if (resolved.strokes.length === 0) {
    return `Mari kita pelajari cara menulis ${label} ${resolved.char}${cleanMeaning ? ` yang berarti ${cleanMeaning}` : ''} secara bertahap dari atas ke bawah dan kiri ke kanan.`;
  }
  const stepsText = resolved.strokes
    .map((s) => `Goresan ${s.order}, ${s.hint.replace(/^Goresan\s*\d+\s*:\s*/i, '')}`)
    .join('. ');
  return `Ayo kita tulis ${label} ${resolved.char}${cleanMeaning ? ` (${cleanMeaning})` : ''} dalam ${count} goresan secara berurutan. ${stepsText}.`;
}
