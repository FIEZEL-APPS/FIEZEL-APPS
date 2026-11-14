import {
  SSW_MASTER_KB,
  type SswPdfPage,
  getSswLessonStepCursor,
  getSswProgressReport,
  loadSswMasterState,
  lookupSswMaterialAndPage,
  lookupSswMaterialAndPageAsync,
  sanitizeSswText,
  updateSswLessonStepCursor,
} from './sswSenseiEngine.ts';

export interface SswLessonStep {
  stepNumber: number;
  title: string;
  content: string;
  isQuizExample?: boolean;
}

export interface SswBeginnerTermDef {
  term: string;
  simpleMeaningId: string;
}

export interface SswTacticalInsight {
  id: string;
  badge: string;
  title: string;
  trick: string;
  trapAlert: string;
}

const WAKAI_PAPA_PLUS_INSIGHTS: Array<{
  id: string;
  pages?: number[];
  pattern?: RegExp;
  badge: string;
  title: string;
  trick: string;
  trapAlert: string;
}> = [
  {
    id: 'decoder_ekor_soal',
    pages: [1, 2, 3, 4, 5],
    pattern: /tadashii|machigatteiru|futekisetsu|dekoder|partikel|正しい|間違っている|不適切|3\s*opsi/i,
    badge: 'TRIK EKOR KALIMAT',
    title: 'Baca Ekor Soal Dulu (Tadashii vs Machigatteiru)',
    trick: 'Jangan menerjemahkan dari kata pertama! Langsung lompat ke kata paling belakang soal: tadashii (正しい = pilih yang BENAR) atau machigatteiru / futekisetsu (間違っている / 不適切 = pilih yang SALAH).',
    trapAlert: 'Jebakan paling sering: murid memilih pernyataan benar saat ujung soal jelas minta machigatteiru (yang SALAH).',
  },
  {
    id: 'strategi_65_persen',
    pages: [1, 2, 3],
    pattern: /cbt|prometric|65%|40\s*soal|70\s*menit|45\s*hari|98\s*\/\s*150/i,
    badge: 'TAKTIK SKOR 65%',
    title: 'Kunci 26 Benar dari 40 Soal dalam 70 Menit',
    trick: 'Rata-rata kamu punya 105 detik per soal. Lewati dulu soal hitung panjang kalau macet, amankan poin cepat dari soal higienitas, suhu, dan alergen supaya aman tembus batas 65% (sekitar 26 benar).',
    trapAlert: 'Kalau gagal, masa tunggu tes ulang 45 hari dan soal pakai bahasa Jepang ber-Furigana tanpa terjemahan Indonesia.',
  },
  {
    id: 'alergen_kk9_2026',
    pages: [1, 15, 16, 17, 18],
    pattern: /alergen|kurumi|cashew|pistachio|くるみ|カシューナッツ|ピスタチオ|アレルギー/i,
    badge: 'UPDATE VER 5.1 (APR 2026)',
    title: 'Jembatan Keledai 9 Alergen Wajib (7 Klasik + K-C)',
    trick: 'Hafal cepat 9 Wajib Label: 7 Klasik (Ebi/Udang, Kani/Kepiting, Komugi/Gandum, Soba, Tamago/Telur, Nyuu/Susu, Rakkasei/Kacang Tanah) + 2 Baru Ver 5.1: Kurumi (Kenari) & Cashew Nut (Kacang Mede ke-9). Pistachio masuk 20 Anjuran ke-20!',
    trapAlert: 'Pemanasan atau perebusan TIDAK menghilangkan alergen! Serta hati-hati Pistachio sering dijadikan pengecoh seolah-olah wajib label padahal masuk 20 Anjuran.',
  },
  {
    id: 'suhu_yukkuri_trap',
    pages: [8, 9, 10, 11, 12, 13, 19, 20, 21, 22],
    pattern: /yukkuri|ゆっくり|zona bahaya|10c|60c|27c|-18c|pendingin|pembekuan|冷凍|冷蔵/i,
    badge: 'JEBAKAN KATA WAKAI PAPA+',
    title: 'Rumus Zona Bahaya 10-60C & Pantangan Yukkuri',
    trick: 'Bakteri cepat beranak-pinak di zona bahaya 10C sampai 60C (puncak 30-40C). Dingin wajib di bawah 10C (daging/ikan umumnya <=4C), beku di bawah -15C atau -18C, ruang kerja produksi <=27C. Pendinginan harus CEPAT (kyuusoku)!',
    trapAlert: 'Jika di opsi jawaban muncul kata "yukkuri" (pelan-pelan saat mendinginkan atau mencairkan di suhu ruang), 99% pernyataan itu SALAH!',
  },
  {
    id: 'endospora_retort',
    pattern: /endospora|芽胞|gahou|spora|120c|4 menit/i,
    badge: 'KONSEP BAKTERI KEBAL',
    title: 'Kenapa Air Mendidih 100C Gagal Membunuh Endospora',
    trick: 'Bakteri berspora (Gahou / Endospora) memakai baju zirah tahan panas 100C. Untuk menembusnya wajib pemanasan tekanan tinggi 120C selama 4 menit (atau teknik pengalengan/retort).',
    trapAlert: 'Opsi yang mengklaim semua bakteri mati cukup direbus air mendidih 100C adalah jebakan ujian klasik.',
  },
  {
    id: 'klorin_ppm_norovirus',
    pattern: /klorin|ppm|norovirus|muntah|natrium hipoklorit|次亜塩素酸|塩素/i,
    badge: 'ANGKA EMAS SANITASI',
    title: '3 Level ppm Klorin: 100, 200, dan 1.000 ppm',
    trick: 'Hafalkan tangga sanitasi Natrium Hipoklorit: 100 ppm buat sayur/buah mentah (rendam 10 menit lalu bilas), 200 ppm buat meja/pisau/alat kerja, dan lompat ke 1.000 ppm KHUSUS bersihkan muntahan atau kasus Norovirus!',
    trapAlert: 'Jebakan mematikan: Norovirus kebal alkohol biasa dan 200 ppm! Wajib 1.000 ppm atau pemanasan inti 85-90C selama >=90 detik.',
  },
  {
    id: 'kalkulasi_pembulatan_84',
    pattern: /84|pembulatan|kiriage|kirisute|hitung|kalkulasi|wadah|kapasitas|pengenceran|ml/i,
    badge: 'TRIK KALKULATOR & PEMBULATAN',
    title: 'Rumus Pengenceran & Hukum Pembulatan Atas vs Bawah',
    trick: 'Rumus cepat klorin: Target ppm x Volume Air (ml) / Kadar Pekat ppm (5% = 50.000 ppm). Untuk soal jumlah wadah/dosis agar cukup atau aman (misal hasil 83,2), bulatkan ke ATAS (84). Untuk jumlah paket penuh yang jadi dari stok bahan, bulatkan ke BAWAH.',
    trapAlert: 'Salah baca satuan persen vs ppm (1% = 10.000 ppm) atau lupa membulatkan ke atas sering mematahkan nilai soal matematika.',
  },
  {
    id: 'trio_ijou_ika_miman',
    pattern: /以上|以下|未満|ijou|ika|miman/i,
    badge: 'DEKODER BATAS ANGKA',
    title: 'Bedakan Ijou (>=), Ika (<=), dan Miman (<)',
    trick: 'Ijou (以上) artinya angka batasNYA IKUT ke atas (>=). Ika (以下) artinya angka batasNYA IKUT ke bawah (<=). Miman (未満) artinya angka batasNYA TIDAK IKUT, harus di bawahnya (<).',
    trapAlert: 'Pada aturan suhu "<10C (10C miman)", tepat di angka 10,0C pun sudah terhitung melanggar standar!',
  },
  {
    id: 'k3_lockout_mesin',
    pages: [68, 69, 70, 71, 72, 73, 74, 75],
    pattern: /mesin|makikomare|terjepit|tentou|terpeleset|k3|keselamatan|lockout|kiken/i,
    badge: 'ATURAN NYAWA K3 PABRIK',
    title: 'Stop Power + Lockout Sebelum Tangan Sentuh Mesin',
    trick: 'Setiap ada bahan tersangkut atau pembersihan mesin pengaduk/pemotong, urutan wajib: Matikan sumber listrik utama -> pastikan bagian berputar berhenti total -> pasang tag/kunci pengaman -> baru bersihkan pakai alat bantu.',
    trapAlert: 'Jangan pernah melepas tutup pengaman (safety cover) sambil mesin masih menyala atau menolong teman tersetrum tanpa memutus arus dulu.',
  },
  {
    id: 'kenben_zonasi_seiketsu',
    pages: [80],
    pattern: /kenben|kenkou\s*shindan|seiton|seiri|shitsuke|seiketsu\s*sagyou|area\s*kerja\s*bersih|zonasi|kuiki/i,
    badge: 'HIGIENE KARYAWAN & ZONASI',
    title: 'Kenben (Tes Feses), Kenkou Shindan (MCU), & Zona Bersih',
    trick: 'Ingat pasangan kata kunci: Kenkou Shindan (MCU kesehatan rutin) + Kenben (pemeriksaan tinja deteksi Norovirus/pembawa kuman) wajib lulus sebelum pegang pangan. Area pabrik dipisah menjadi Seiketsu Sagyou Kuiki (area bersih tinggi untuk makanan matang/siap kemas) dan area umum/kotor; arus barang dan karyawan TIDAK boleh menyilang balik.',
    trapAlert: 'Jebakan ujian sering menukar tugas zona bersih vs area bahan mentah, atau menyebut pekerja boleh masuk produksi tanpa lapor diare/luka.',
  },
];

export function getWakaiPapaTacticalInsightsForPage(
  pageNumber: number,
  extraText = '',
  maxItems = 3
): SswTacticalInsight[] {
  const pageObj = SSW_MASTER_KB.pages.find((p) => p.page === pageNumber) || null;
  const corpus = [
    pageObj?.title || '',
    pageObj?.focusCompass || '',
    pageObj?.summary || '',
    extraText,
  ].join(' ');

  const matched: SswTacticalInsight[] = [];
  for (const item of WAKAI_PAPA_PLUS_INSIGHTS) {
    const byPage = Array.isArray(item.pages) && item.pages.includes(pageNumber);
    const byPattern = Boolean(item.pattern && item.pattern.test(corpus));
    if (byPage || byPattern) {
      matched.push({
        id: item.id,
        badge: item.badge,
        title: item.title,
        trick: item.trick,
        trapAlert: item.trapAlert,
      });
    }
    if (matched.length >= maxItems) break;
  }

  if (matched.length === 0) {
    matched.push({
      id: `page_${pageNumber}_decoder`,
      badge: 'METODE MASTER SSW',
      title: 'Tiga Kunci Menguasai Halaman Ini Tanpa Menghafal Buta',
      trick: 'Cari 1 kata kerja inti + angka batasnya (suhu/waktu/ppm) di halaman ini, lalu baca bagian ekor soal (tadashii atau machigatteiru) sebelum memilih jawaban.',
      trapAlert: 'Jangan terkecoh kata mirip di opsi: satu kata pembalik ("yukkuri", "tanpa", atau "sebelum") bisa membalik arti seluruh kalimat.',
    });
  }

  return matched.slice(0, maxItems);
}

const BEGINNER_GLOSSARY_BANK: Array<{ pattern: RegExp; term: string; meaning: string }> = [
  {
    pattern: /\bCBT\b/i,
    term: 'CBT (Computer-Based Testing)',
    meaning: 'Ujian resmi dikerjakan langsung lewat layar komputer di ruang tes, bukan pakai kertas, dan nilainya diproses sistem komputer.',
  },
  {
    pattern: /\bPrometric\b/i,
    term: 'Prometric',
    meaning: 'Lembaga penyelenggara tes resmi asal Jepang yang mengelola lokasi ujian komputer SSW di kota-kota Indonesia seperti Jakarta atau Surabaya.',
  },
  {
    pattern: /\bOTAFF\b/i,
    term: 'OTAFF (Ver 5.1 Apr 2026)',
    meaning: 'Organisasi resmi di Jepang penyusun buku modul standar dan soal ujian SSW Pengolahan Makanan; edisi Ver 5.1 April 2026 adalah aturan terbarunya.',
  },
  {
    pattern: /\bfurigana\b/i,
    term: 'Furigana',
    meaning: 'Huruf Hiragana kecil di atas atau samping Kanji sebagai panduan cara baca, jadi pemula yang belum hafal Kanji tetap bisa membaca soal ujian.',
  },
  {
    pattern: /3\s*opsi|３\s*択|3\s*pilihan/i,
    term: 'Soal 3 Opsi (San-taku)',
    meaning: 'Setiap pertanyaan pilihan ganda di ujian SSW hanya punya 3 pilihan jawaban (A, B, C), bukan 4 atau 5.',
  },
  {
    pattern: /98\s*\/\s*150|65\s*%/i,
    term: 'Batas Lulus 65% (98/150 poin)',
    meaning: 'Dari total 40 soal dalam 70 menit, target lulus aman minimal menjawab benar sekitar 26 soal dari 40 soal (setara 65%).',
  },
  {
    pattern: /\btunggu\s*45\s*hari\b/i,
    term: 'Masa Tunggu 45 Hari',
    meaning: 'Jika belum lulus hari ini, peserta baru boleh mendaftar ujian ulang SSW bidang yang sama setelah jeda 45 hari.',
  },
  {
    pattern: /\bdekoder\b|\bpartikel\b/i,
    term: 'Dekoder Kalimat & Partikel',
    meaning: 'Teknik membaca kalimat soal bahasa Jepang dengan melihat kata penghubung kecil (seperti wa, o, ni) dan kata paling belakang dulu agar tahu apakah soal meminta jawaban Benar atau Salah.',
  },
  {
    pattern: /正しい|tadashii/i,
    term: 'Tadashii (正しい)',
    meaning: 'Kata kunci paling penting di ujung soal yang artinya "yang BENAR". Hati-hati tertukar dengan machigatteiru.',
  },
  {
    pattern: /間違っている|不適切|machigatteiru|futekisetsu/i,
    term: 'Machigatteiru / Futekisetsu (間違っている / 不適切)',
    meaning: 'Kata kunci di ujung soal yang artinya "yang SALAH / tidak tepat", jadi kita harus memilih opsi pernyataan yang keliru.',
  },
  {
    pattern: /以上|以下|未満|ijou|ika|miman/i,
    term: 'Batas Angka Ijou / Ika / Miman',
    meaning: 'Ijou artinya minimal sama dengan atau lebih (>=), Ika artinya maksimal sama dengan atau kurang (<=), Miman artinya di bawah/kurang dari tanpa ikut angka batas (<).',
  },
  {
    pattern: /くるみ|kurumi|kenari|カシューナッツ|cashew|ピスタチオ|pistachio|alergen/i,
    term: 'Alergen Wajib vs Anjuran (Ver 5.1 Apr 2026)',
    meaning: 'Di Jepang ada 9 bahan alergen WAJIB tulis di label kemasan (terbaru: Kurumi/kenari dan Cashew Nut/kacang mede ke-9), dan 20 bahan Anjuran label (terbaru: Pistachio ke-20).',
  },
  {
    pattern: /\bppm\b|次亜塩素酸|klorin|jiaensosan/i,
    term: 'Klorin & Satuan ppm',
    meaning: 'Natrium hipoklorit (cairan disinfektan pabrik) yang diukur dalam ppm (bagian per sejuta): 100-200 ppm untuk sayur/alat makan, 1.000 ppm khusus lap muntahan Norovirus.',
  },
  {
    pattern: /芽胞|endospora/i,
    term: 'Bakteri Endospora',
    meaning: 'Bakteri berbaju zirah spora yang kebal direbus air mendidih 100C biasa; baru mati dipanaskan tekanan tinggi 120C selama 4 menit.',
  },
  {
    pattern: /yukkuri|ゆっくり/i,
    term: 'Jebakan Yukkuri (Pelan-pelan)',
    meaning: 'Membekukan atau mendinginkan makanan secara pelan-pelan adalah SALAH dalam HACCP karena makanan terlalu lama diam di suhu bahaya bakteri (10-60C).',
  },
  {
    pattern: /\bHACCP\b|\bCCP\b/i,
    term: 'HACCP & CCP',
    meaning: 'Sistem pengawasan titik paling kritis di pabrik (misal suhu masak/detektor logam). Jika menyimpang (Itsudatsu), produk wajib ditahan dan diperbaiki.',
  },
  {
    pattern: /\bLOTO\b|\bHeinrich\b|\bHiyari/i,
    term: 'K3 Pabrik: LOTO, Heinrich & Hiyari-Hatto',
    meaning: 'LOTO mengunci saklar mesin saat servis agar tak menyala tak sengaja; Piramida Heinrich (1:29:300) menyebut 300 kejadian nyaris celaka (Hiyari-Hatto) mendahului 1 kecelakaan berat.',
  },
  {
    pattern: /歩留|budomari/i,
    term: 'Budomari (Rendemen)',
    meaning: 'Persentase berat bahan bersih yang bisa dipakai menjadi produk jadi setelah dibersihkan atau dipotong.',
  },
];

export function cleanSpacedJapanese(raw: string): string {
  const s = sanitizeSswText(raw)
    .replace(/&#10004;|&check;/gi, '✓')
    .replace(/&#10008;|&cross;/gi, '✗')
    .replace(/\s*\|\s*/g, '\n\n')
    .replace(/\s+([,.;:?!、。！？])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  // Collapse artificial spaces between consecutive CJK/Kana characters extracted from <ruby> tags
  return s.replace(
    /([\u3040-\u30ff\u3400-\u9faf々ー])\s+(?=[\u3040-\u30ff\u3400-\u9faf々ー])/g,
    '$1'
  );
}

function stripTrailingFooter(text: string): string {
  return text
    .replace(/\s*Panduan SSW Pengolahan Makanan[^]*?Hal\.\s*\d+\s*\/\s*\d+\s*$/i, '')
    .trim();
}

export function extractBeginnerGlossaryForText(text: string, maxItems = 6): SswBeginnerTermDef[] {
  const hay = String(text || '');
  const found: SswBeginnerTermDef[] = [];
  for (const item of BEGINNER_GLOSSARY_BANK) {
    if (item.pattern.test(hay)) {
      found.push({ term: item.term, simpleMeaningId: item.meaning });
      if (found.length >= maxItems) break;
    }
  }
  return found;
}

/**
 * Splits any PDF page summary (Hal. 1-91) into sequential, bite-sized SswLessonStep cards
 * so SSW SENSEI never reads a raw wall of text or skips sub-sections of an active page.
 */
function splitOversizedSteps(steps: SswLessonStep[]): SswLessonStep[] {
  const out: SswLessonStep[] = [];
  for (const step of steps) {
    const cleanTitle = cleanSpacedJapanese(step.title || '');
    const content = (step.content || '').trim();
    if (content.length <= 880) {
      out.push({ ...step, title: cleanTitle });
      continue;
    }
    let parts = content
      .split(/(?<=[.!?。！？])\s+(?=[A-Z0-9✓✗\u3040-\u30ff\u4e00-\u9faf])/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 2) {
      parts = content
        .split(/\n{2,}|(?=\s#\d{1,3}\b)|(?<=;)\s+/)
        .map((p) => p.trim())
        .filter(Boolean);
    }
    if (parts.length < 2) {
      out.push({ ...step, title: cleanTitle });
      continue;
    }
    const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
    const halfLen = totalLen / 2;
    let accum = 0;
    let mid = Math.ceil(parts.length / 2);
    for (let i = 0; i < parts.length - 1; i++) {
      accum += parts[i].length;
      if (accum >= halfLen) {
        mid = i + 1;
        break;
      }
    }
    const first = parts.slice(0, mid).join(' ').trim();
    const second = parts.slice(mid).join(' ').trim();
    if (!second || first.length < 120 || second.length < 120) {
      out.push({ ...step, title: cleanTitle });
      continue;
    }
    out.push({
      stepNumber: out.length + 1,
      title: `${cleanTitle} (Bagian 1/2)`,
      content: first,
      isQuizExample: step.isQuizExample,
    });
    out.push({
      stepNumber: out.length + 1,
      title: `${cleanTitle} (Bagian 2/2)`,
      content: second,
      isQuizExample: step.isQuizExample,
    });
  }
  return out.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
}

export function parseSswPageLessonSteps(pageObj: SswPdfPage | null | undefined): SswLessonStep[] {
  if (!pageObj) return [];
  const rawClean = stripTrailingFooter(cleanSpacedJapanese(pageObj.summary || ''));
  if (!rawClean) return [];

  const compassParts = sanitizeSswText(pageObj.focusCompass || '')
    .split(/\s*->\s*/)
    .map((p) => p.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

  // Strategy 1: Split by explicit book markers (LANGKAH N:, UPDATE WAJIB 2026, CONTOH SOAL CBT)
  const markerRe = /(?:LANGKAH\s+\d+\s*:?|UPDATE\s+WAJIB\s+2026|CONTOH\s+SOAL\s+CBT(?:\s+Bab\s+[\d.]+)?|KUNCI:\s*[A-C])/g;
  const matches: Array<{ index: number; label: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(rawClean)) !== null) {
    // Keep KUNCI attached to its CONTOH SOAL CBT section rather than making KUNCI a standalone step
    if (m[0].startsWith('KUNCI:')) continue;
    matches.push({ index: m.index, label: m[0] });
  }

  if (matches.length >= 2) {
    const steps: SswLessonStep[] = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i + 1].index : rawClean.length;
      let segment = rawClean.slice(start, end).trim();
      const label = matches[i].label.trim();
      let body = segment.slice(label.length).replace(/^[:\s-]+/, '').trim();
      let title = compassParts[i] || label.replace(/:$/, '');

      if (i === 0 && start > 35) {
        const intro = rawClean.slice(0, start).trim();
        // If there is meaningful framing copy before LANGKAH 1, extract clean opening context into Step 1
        if (intro.length > 20 && !intro.startsWith(pageObj.title)) {
          body = `${intro}\n\n${body}`;
        }
      }

      if (/^LANGKAH\s+\d+/i.test(label)) {
        const subTitleMatch = body.match(/^([^.]{4,72}?)(?=\s+(?:Rp\s*\d|Jangan|Cara|Peta|Halaman|\d+\s+Soal|Bab\s+\d|Alergen|75°C))/i);
        if (compassParts[i]) {
          title = `${label.replace(/:$/, '')}: ${compassParts[i]}`;
        } else if (subTitleMatch) {
          title = `${label.replace(/:$/, '')}: ${subTitleMatch[1].trim()}`;
        }
      } else if (/^UPDATE WAJIB/i.test(label)) {
        title = 'Update Wajib Ver 5.1 (1 April 2026)';
      } else if (/^CONTOH SOAL CBT/i.test(label)) {
        title = 'Latihan Contoh Soal CBT Halaman Ini';
      }

      if (body.length > 10) {
        steps.push({
          stepNumber: steps.length + 1,
          title: sanitizeSswText(title),
          content: body,
          isQuizExample: /^CONTOH SOAL CBT/i.test(label),
        });
      }
    }
    if (steps.length > 0) return splitOversizedSteps(steps);
  }

  // Strategy 2: Pages with numbered items/cards ("Soal 1 ...", "1 ...", "2 ...") or focusCompass chunks
  const soalSplit = rawClean.split(/(?=\bSoal\s+\d+\s+Bab)/g).map((x) => x.trim()).filter(Boolean);
  if (soalSplit.length >= 2) {
    const headerIntro = soalSplit[0].startsWith('Soal ') ? '' : soalSplit.shift() || '';
    return splitOversizedSteps(
      soalSplit.map((chunk, idx) => ({
        stepNumber: idx + 1,
        title: compassParts[idx] ? `${compassParts[idx]} (Soal #${idx + 1})` : `Latihan Soal #${idx + 1}`,
        content: idx === 0 && headerIntro ? `${headerIntro}\n\n${chunk}` : chunk,
        isQuizExample: true,
      }))
    );
  }

  // Strategy 3: Group sentences cleanly across compassParts (2 to 4 balanced steps per page)
  const targetStepCount = Math.min(4, Math.max(2, compassParts.length || 3));
  const sentences = rawClean
    .split(/(?<=[.!?])\s+(?=[A-Z0-9\u3040-\u30ff\u4e00-\u9faf])/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length >= targetStepCount) {
    const perStep = Math.ceil(sentences.length / targetStepCount);
    const grouped: SswLessonStep[] = [];
    for (let i = 0; i < sentences.length; i += perStep) {
      const idx = grouped.length;
      const chunk = sentences.slice(i, i + perStep).join(' ').trim();
      if (!chunk) continue;
      grouped.push({
        stepNumber: idx + 1,
        title: compassParts[idx] || `Langkah ${idx + 1}: Bagian ${idx + 1}`,
        content: chunk,
        isQuizExample: /CONTOH SOAL|KUNCI:\s*[A-C]/i.test(chunk),
      });
    }
    if (grouped.length > 0) return splitOversizedSteps(grouped);
  }

  return splitOversizedSteps([
    {
      stepNumber: 1,
      title: compassParts[0] || sanitizeSswText(pageObj.title),
      content: rawClean,
    },
  ]);
}

export function resolvePageFromQueryText(text: string): number | undefined {
  const m = String(text || '').match(/\b(?:hal(?:aman)?|page|halaman pdf)\s*(?:ke-?)?\s*[:#]?\s*(\d{1,2})\b/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= (SSW_MASTER_KB.meta.totalPdfPages || 91)) return n;
  }
  const kataAngka = String(text || '').toLowerCase();
  if (/\bhalaman\s+satu\b|\bhal\s+satu\b/.test(kataAngka)) return 1;
  if (/\bhalaman\s+dua\b|\bhal\s+dua\b/.test(kataAngka)) return 2;
  if (/\bhalaman\s+tiga\b|\bhal\s+tiga\b/.test(kataAngka)) return 3;
  return undefined;
}

export function getStructuredPagePlan(pageNumber: number, requestedStepNumber?: number) {
  const totalPages = SSW_MASTER_KB.meta.totalPdfPages || 91;
  const targetPage = Math.max(1, Math.min(totalPages, Math.round(pageNumber || 1)));
  const pageObj = SSW_MASTER_KB.pages.find((p) => p.page === targetPage) || null;
  const steps = parseSswPageLessonSteps(pageObj);
  const state = loadSswMasterState();
  const cursor = state.lessonStepCursor || getSswLessonStepCursor();
  const completedSteps = cursor.completedStepsByPage[String(targetPage)] || [];

  let activeStepIndex = 1;
  if (typeof requestedStepNumber === 'number' && Number.isFinite(requestedStepNumber) && requestedStepNumber >= 1) {
    activeStepIndex = Math.min(Math.max(1, Math.round(requestedStepNumber)), Math.max(1, steps.length));
  } else if (cursor.page === targetPage && cursor.stepIndex >= 1 && cursor.stepIndex <= Math.max(1, steps.length)) {
    activeStepIndex = cursor.stepIndex;
  } else {
    const firstIncomplete = steps.find((s) => !completedSteps.includes(s.stepNumber));
    activeStepIndex = firstIncomplete ? firstIncomplete.stepNumber : 1;
  }

  const activeStep = steps.find((s) => s.stepNumber === activeStepIndex) || steps[0] || null;
  const remainingSteps = steps.filter((s) => s.stepNumber !== activeStepIndex && !completedSteps.includes(s.stepNumber));

  return {
    pageObj,
    targetPage,
    steps,
    activeStepIndex,
    activeStep,
    completedSteps,
    remainingSteps,
  };
}

function buildCompactPageLessonPayload(pageNumber: number, requestedStep?: number, syncCursor = true) {
  const plan = getStructuredPagePlan(pageNumber, requestedStep);
  if (syncCursor) {
    updateSswLessonStepCursor({
      page: plan.targetPage,
      stepIndex: plan.activeStepIndex,
    });
  }

  const detail = lookupSswMaterialAndPage({ pageNumber: plan.targetPage });
  const activeStepText = plan.activeStep ? `${plan.activeStep.title} ${plan.activeStep.content}` : '';
  const glossary = extractBeginnerGlossaryForText(
    `${activeStepText} ${plan.pageObj?.title || ''} ${plan.pageObj?.focusCompass || ''}`,
    6
  );
  const tacticalInsights = getWakaiPapaTacticalInsightsForPage(plan.targetPage, activeStepText, 3);
  const completedStepTitles = plan.steps
    .filter((s) => plan.completedSteps.includes(s.stepNumber) && s.stepNumber !== plan.activeStepIndex)
    .map((s) => `Langkah ${s.stepNumber}: ${s.title}`);

  return {
    mode: 'structured_lesson_step' as const,
    pageNumber: plan.targetPage,
    unit: detail.page?.unit || '',
    pageTitle: detail.page?.title || `Halaman ${plan.targetPage}`,
    otaffRef: detail.page?.otaffRef || '',
    totalStepsOnPage: plan.steps.length,
    activeStepNumber: plan.activeStepIndex,
    completedStepsCount: completedStepTitles.length,
    completedStepTitles,
    activeStep: plan.activeStep
      ? {
          stepNumber: plan.activeStep.stepNumber,
          title: plan.activeStep.title,
          materialText: plan.activeStep.content.slice(0, 1600),
          isQuizExample: Boolean(plan.activeStep.isQuizExample),
        }
      : null,
    allStepsOnPageOutline: plan.steps.map((s) => ({
      stepNumber: s.stepNumber,
      title: s.title,
      status: plan.completedSteps.includes(s.stepNumber)
        ? 'SELESAI'
        : s.stepNumber === plan.activeStepIndex
          ? 'AKTIF_SEKARANG'
          : 'BELUM_DIBAHAS',
    })),
    remainingStepsCount: plan.remainingSteps.length,
    remainingStepsTitles: plan.remainingSteps.map((s) => `Langkah ${s.stepNumber}: ${s.title}`),
    beginnerTermsToUnpack: glossary,
    wakaiPapaMasterTips: tacticalInsights,
    antiRepetitionDirective:
      completedStepTitles.length > 0
        ? `ANTI-PENGULANGAN KETAT: Poin ini SUDAH DIKUASAI murid (${completedStepTitles.join(' ; ')}) -> JANGAN dijelaskan ulang dari awal dan JANGAN ulangi basa-basi penenang ("tenang aja pelan-pelan"). Langsung bahas inti BARU di Langkah ${plan.activeStepIndex} + 1 trik ingat cepat.`
        : `Langsung fokus ke inti Langkah ${plan.activeStepIndex} secara lugas, dalam 1 contoh nyata + trik ujian tanpa basa-basi bertele-tele.`,
    kotobaOnPage: (detail.kotobaOnPage || []).slice(0, 6).map((k) => ({
      jp: cleanSpacedJapanese(k.jp),
      reading: k.reading,
      romaji: k.romaji,
      meaningId: k.meaningId,
    })),
    trapsOnPage: (detail.trapsOnPage || []).slice(0, 2).map((t) => ({
      title: t.title,
      detail: t.detail.slice(0, 320),
    })),
    mathOnPage: (detail.mathOnPage || []).slice(0, 2),
    goldenNumbersOnPage: (detail.goldenNumbersOnPage || []).slice(0, 3),
    strictFocusDirective:
      plan.remainingSteps.length > 0
        ? `KUNCI FOKUS AKTIF: Sekarang sedang mengajar Hal. ${plan.targetPage} Langkah ${plan.activeStepIndex} dari ${plan.steps.length} ("${plan.activeStep?.title || ''}"). AJARKAN HANYA LANGKAH INI SECARA MENDALAM dengan bahasa sehari-hari yang hangat, jelaskan semua istilah asing di beginnerTermsToUnpack dengan analogi nyata, lalu akhiri dengan 1 pertanyaan ringan cek paham. DILARANG membaca semua langkah sekaligus dan DILARANG melompat ke halaman lain atau bab partikel saat masih ada ${plan.remainingSteps.length} langkah tersisa di Hal. ${plan.targetPage}! Saat murid bilang lanjut, panggil advance_ssw_lesson_step.`
        : `Ini adalah langkah terakhir (Langkah ${plan.activeStepIndex}/${plan.steps.length}) di Hal. ${plan.targetPage}. Ajarkan langkah ini sampai tuntas lalu ajukan 1 pertanyaan cek paham; setelah murid paham, panggil advance_ssw_lesson_step untuk menandai Hal. ${plan.targetPage} selesai.`,
  };
}

function buildFocusedSearchPayload(
  raw: ReturnType<typeof lookupSswMaterialAndPage>,
  args: { query?: string; stepNumber?: number },
  combinedText: string
) {
  const topPageNum = raw.matchedPages?.[0]?.page;
  const pagePlan = topPageNum ? buildCompactPageLessonPayload(topPageNum, args.stepNumber, true) : null;
  const fallbackInsights = getWakaiPapaTacticalInsightsForPage(topPageNum || 1, combinedText, 3);
  return {
    mode: 'focused_search' as const,
    query: raw.query,
    totalMatches: raw.totalMatches,
    primaryMatchedPagePlan: pagePlan,
    matchedPagesSummary: (raw.matchedPages || []).slice(0, 3).map((p) => ({
      page: p.page,
      title: p.title,
      focusCompass: p.focusCompass,
    })),
    beginnerTermsToUnpack: extractBeginnerGlossaryForText(combinedText, 6),
    wakaiPapaMasterTips: pagePlan?.wakaiPapaMasterTips || fallbackInsights,
    matchedKotoba: (raw.matchedKotoba || []).slice(0, 6).map((k) => ({
      jp: cleanSpacedJapanese(k.jp),
      reading: k.reading,
      romaji: k.romaji,
      meaningId: k.meaningId,
      pdfPage: k.pdfPage,
    })),
    matchedTraps: (raw.matchedTraps || []).slice(0, 2).map((t) => ({
      title: t.title,
      detail: t.detail.slice(0, 340),
      pdfPage: t.pdfPage,
    })),
    matchedMath: (raw.matchedMath || []).slice(0, 2),
    matchedGolden: (raw.matchedGolden || []).slice(0, 3),
    matchedVideoInsight: (raw.matchedVideos || []).slice(0, 2).map((v) => ({
      channel: v.channel,
      title: v.title,
      keyPoints: v.keyPoints.slice(0, 2),
      pdfPagesSuggested: v.pdfPagesSuggested,
    })),
  };
}

export async function lookupSswForLiveTeachingAsync(args: {
  query?: string;
  pageNumber?: number;
  stepNumber?: number;
  category?: string;
  stageId?: string;
}) {
  const raw = await lookupSswMaterialAndPageAsync({
    query: args.query,
    pageNumber: args.pageNumber,
    category: args.category,
    stageId: args.stageId,
  });

  if (raw.mode === 'exact_page' && raw.pageNumber) {
    return buildCompactPageLessonPayload(raw.pageNumber, args.stepNumber, true);
  }

  const combinedText = [
    args.query || '',
    raw.matchedPages?.[0]?.excerpt || '',
    raw.matchedTraps?.[0]?.detail || '',
  ].join(' ');
  return buildFocusedSearchPayload(raw, args, combinedText);
}

export function lookupSswForLiveTeaching(args: {
  query?: string;
  pageNumber?: number;
  stepNumber?: number;
  category?: string;
  stageId?: string;
}) {
  const raw = lookupSswMaterialAndPage({
    query: args.query,
    pageNumber: args.pageNumber,
    category: args.category,
    stageId: args.stageId,
  });

  if (raw.mode === 'exact_page' && raw.pageNumber) {
    return buildCompactPageLessonPayload(raw.pageNumber, args.stepNumber, true);
  }

  return buildFocusedSearchPayload(raw, args, args.query || '');
}

export function advanceSswLessonStep(args: {
  pageNumber?: number;
  completedStepNumber?: number;
  goToStepNumber?: number;
}) {
  const cursor = getSswLessonStepCursor();
  const targetPage =
    typeof args.pageNumber === 'number' && Number.isFinite(args.pageNumber)
      ? Math.max(1, Math.min(91, Math.round(args.pageNumber)))
      : cursor.page || 1;
  const planBefore = getStructuredPagePlan(targetPage);
  const doneStepNum =
    typeof args.completedStepNumber === 'number' && args.completedStepNumber >= 1
      ? Math.round(args.completedStepNumber)
      : planBefore.activeStepIndex;

  const updatedCompleted = Array.from(new Set([...planBefore.completedSteps, doneStepNum]));
  const nextIncomplete = planBefore.steps.find((s) => !updatedCompleted.includes(s.stepNumber));
  const explicitTarget =
    typeof args.goToStepNumber === 'number' && args.goToStepNumber >= 1
      ? Math.min(planBefore.steps.length, Math.round(args.goToStepNumber))
      : undefined;

  if (explicitTarget && explicitTarget !== doneStepNum) {
    updateSswLessonStepCursor({
      page: targetPage,
      stepIndex: explicitTarget,
      markStepCompleted: doneStepNum,
    });
    const nextPlan = buildCompactPageLessonPayload(targetPage, explicitTarget, false);
    return {
      advanced: true,
      pageCompleted: false,
      completedStepNumber: doneStepNum,
      ...nextPlan,
    };
  }

  if (nextIncomplete) {
    updateSswLessonStepCursor({
      page: targetPage,
      stepIndex: nextIncomplete.stepNumber,
      markStepCompleted: doneStepNum,
    });
    const nextPlan = buildCompactPageLessonPayload(targetPage, nextIncomplete.stepNumber, false);
    return {
      advanced: true,
      pageCompleted: false,
      completedStepNumber: doneStepNum,
      ...nextPlan,
    };
  }

  // All steps on this page completed! Mark page read cleanly and invite learner to continue to next page
  const totalPages = SSW_MASTER_KB.meta.totalPdfPages || 91;
  updateSswLessonStepCursor({
    page: targetPage,
    stepIndex: planBefore.steps.length || 1,
    markStepCompleted: doneStepNum,
    markPageRead: true,
  });

  const nextPageNumber = targetPage < totalPages ? targetPage + 1 : totalPages;
  const nextPageObj = SSW_MASTER_KB.pages.find((p) => p.page === nextPageNumber);
  return {
    advanced: true,
    pageCompleted: true,
    completedPage: targetPage,
    completedStepNumber: doneStepNum,
    totalStepsCompletedOnPage: planBefore.steps.length,
    nextSuggestedPage: nextPageNumber,
    nextSuggestedPageTitle: sanitizeSswText(nextPageObj?.title || `Halaman ${nextPageNumber}`),
    coachingDirective: `Halaman ${targetPage} SUDAH TUNTAS 100% semua langkahnya dan tercatat terbaca! Puji murid dengan hangat, rangkum 1 kalimat inti dari Halaman ${targetPage}, lalu tawarkan mau lanjut ke Halaman ${nextPageNumber} (${sanitizeSswText(nextPageObj?.title || '')}) atau mau latihan 1 soal kuis dulu.`,
  };
}

/**
 * Compact active page & step dossier injected into HTTP Turn-by-Turn `/api/voice/partner-turn`
 * so Turn-by-Turn fallback matches Live WebSocket step-by-step rigor with zero drift.
 */
export function buildSswTurnDossierForHttp(userText: string): string {
  const report = getSswProgressReport();
  const explicitlyAskedPage = resolvePageFromQueryText(userText);
  const cursor = getSswLessonStepCursor();
  const focusPage = explicitlyAskedPage || cursor.page || report.state.lastFocusPage || 1;
  const plan = buildCompactPageLessonPayload(focusPage, undefined, Boolean(explicitlyAskedPage));

  const lines = [
    `[SSW ACTIVE LESSON CURSOR - STRICT SINGLE-STEP LOCK]:`,
    `- Progres Murid: ${report.readinessScorePct}% menuju lulus 65% | PDF terbaca: ${report.pagesReadCount}/91 | Hal. fokus sekarang: Hal. ${plan.pageNumber} (${plan.pageTitle})`,
    `- Langkah Aktif: Langkah ${plan.activeStepNumber} dari ${plan.totalStepsOnPage} -> "${plan.activeStep?.title || ''}"`,
    `- Materi Langkah Ini: ${plan.activeStep?.materialText || ''}`,
    `- Daftar Semua Langkah Hal. ${plan.pageNumber}: ${plan.allStepsOnPageOutline.map((s) => `${s.stepNumber}. ${s.title} [${s.status}]`).join(' | ')}`,
    plan.completedStepTitles.length > 0
      ? `- Sudah Dikuasai Murid (DILARANG DIULANG): ${plan.completedStepTitles.join(' ; ')}`
      : '',
    plan.beginnerTermsToUnpack.length > 0
      ? `- Kamus Istilah Pemula Wajib Dijelaskan: ${plan.beginnerTermsToUnpack.map((g) => `${g.term} = ${g.simpleMeaningId}`).join(' ; ')}`
      : '',
    plan.wakaiPapaMasterTips.length > 0
      ? `- Trik Rahasia Guru & Jebakan Ujian (Lebih Dalam dari Wakai Papa): ${plan.wakaiPapaMasterTips.map((t) => `[${t.title}] ${t.trick} (Jebakan: ${t.trapAlert})`).join(' || ')}`
      : '',
    plan.kotobaOnPage.length > 0
      ? `- Kotoba Penting Hal. ${plan.pageNumber}: ${plan.kotobaOnPage.map((k) => `${k.jp} (${k.romaji}) = ${k.meaningId}`).join(' | ')}`
      : '',
    `- ATURAN WAJIB: Ajarkan HANYA Langkah ${plan.activeStepNumber} secara lugas bak guru sungguhan (langsung ke inti, sisipkan trik/jembatan keledai, jelaskan istilah asing, akhiri 1 pertanyaan cek paham). ${plan.antiRepetitionDirective} Jangan melompat ke halaman lain atau Unit 0 partikel jika Hal. ${plan.pageNumber} masih punya langkah [BELUM_DIBAHAS]!`,
  ];
  return lines.filter(Boolean).join('\n');
}

export const SSW_LIVE_TOOL_DECLARATIONS = [
  {
    name: 'get_ssw_progress',
    description:
      'Mengambil progres belajar SSW murid, tahap aktif, daftar halaman PDF yang sudah dibaca, dan posisi Halaman + Langkah aktif saat ini.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'lookup_ssw_material_and_page',
    description:
      'Membuka 1 halaman PDF resmi OTAFF Ver 5.1 (Hal. 1-91) dalam format terstruktur per Langkah (Langkah 1, Langkah 2, Langkah 3...), lengkap dengan daftar istilah pemula dan Kotoba halaman tersebut. WAJIB dipanggil sebelum menjelaskan halaman PDF tertentu atau materi teknis SSW.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Kata kunci materi jika tidak menyebut nomor halaman (mis. alergen, klorin, yukkuri)',
        },
        pageNumber: {
          type: 'INTEGER',
          description: 'Nomor halaman tepat di PDF Panduan Presisi (1 sampai 91)',
        },
        stepNumber: {
          type: 'INTEGER',
          description: 'Opsional: nomor langkah tertentu pada halaman tersebut (1, 2, 3...)',
        },
        category: {
          type: 'STRING',
          description: 'Kategori materi/kotoba opsional',
        },
        stageId: {
          type: 'STRING',
          description: 'Filter tahap roadmap opsional',
        },
      },
    },
  },
  {
    name: 'advance_ssw_lesson_step',
    description:
      'Menandai Langkah aktif pada halaman PDF yang sedang diajarkan sebagai selesai dan maju ke Langkah BERIKUTNYA di halaman yang SAMA (atau menandai halaman selesai jika semua langkah di halaman ini sudah tuntas). Panggil tool ini SETELAH murid paham atau bilang lanjut saat membahas 1 halaman.',
    parameters: {
      type: 'OBJECT',
      properties: {
        pageNumber: {
          type: 'INTEGER',
          description: 'Nomor halaman PDF yang sedang aktif dibahas (mis. 1)',
        },
        completedStepNumber: {
          type: 'INTEGER',
          description: 'Nomor langkah pada halaman ini yang baru saja dipahami murid',
        },
        goToStepNumber: {
          type: 'INTEGER',
          description: 'Opsional: nomor langkah tujuan jika murid meminta lompat ke langkah tertentu di halaman ini',
        },
      },
    },
  },
  {
    name: 'update_ssw_study_progress',
    description:
      'Memperbarui tahap roadmap, halaman PDF terbaca, atau daftar kotoba dikuasai secara permanen.',
    parameters: {
      type: 'OBJECT',
      properties: {
        stageId: {
          type: 'STRING',
          description: 'ID atau nomor tahap roadmap SSW (mis. unit0_decoder, 1..8)',
        },
        status: {
          type: 'STRING',
          description: 'in_progress atau completed',
        },
        pdfPagesRead: {
          type: 'ARRAY',
          items: { type: 'INTEGER' },
          description: 'Daftar nomor halaman PDF (1-91) yang baru diselesaikan',
        },
        kotobaIdsMastered: {
          type: 'ARRAY',
          items: { type: 'STRING' },
          description: 'ID kotoba yang sudah dikuasai murid',
        },
        focusPage: {
          type: 'INTEGER',
          description: 'Nomor halaman PDF (1-91) yang dibuka di panel UI murid',
        },
      },
    },
  },
  {
    name: 'draw_ssw_quiz_question',
    description:
      'Menarik 1 soal CBT Prometric resmi, soal hitungan kalkulator Wakai Papa, soal jebakan kata, atau drill kotoba dari bank soal deterministik dan menampilkannya di panel kuis murid.',
    parameters: {
      type: 'OBJECT',
      properties: {
        mode: {
          type: 'STRING',
          description: 'Pilih salah satu: cbt, math, trap, kotoba_drill, atau mixed',
        },
        topicTag: {
          type: 'STRING',
          description: 'Topik spesifik opsional (mis. klorin, alergen, endospora, yukkuri)',
        },
        preferWeakOrUnseen: {
          type: 'BOOLEAN',
          description: 'Prioritaskan soal baru atau topik lemah murid (default true)',
        },
      },
    },
  },
  {
    name: 'grade_ssw_quiz_answer',
    description:
      'Menilai jawaban murid untuk soal SSW aktif (huruf A/B/C/D atau angka jawaban) secara deterministik, menghitung kesiapan menuju batas lulus 65%, mencatat ke Braincore BKT, dan membuka halaman pembahasan PDF.',
    parameters: {
      type: 'OBJECT',
      properties: {
        quizId: {
          type: 'STRING',
          description: 'ID soal aktif opsional (otomatis memakai soal aktif bila kosong)',
        },
        userAnswer: {
          type: 'STRING',
          description: 'Jawaban yang disebut/dipilih kandidat (mis. A, B, C, 2 ml, 84)',
        },
      },
      required: ['userAnswer'],
    },
  },
];

export function buildSswLiveSystemInstruction(params: {
  personaPrompt?: string;
  candidateName?: string;
}): string {
  const learner = params.candidateName || 'Pejuang SSW';
  const report = getSswProgressReport();
  const cursor = getSswLessonStepCursor();

  return `${params.personaPrompt || ''}

[FIEZEL CORE LORE & SOUL]:
Kamu bagian dari keluarga besar mentor FIEZEL (dibangun Fitra Rustqi / @fitrarustqi dari Banda Aceh, memakai mesin pembelajaran Braincore dan ditemani Mochi si maskot 3D). Kamu mengobrol langsung secara manusiawi dengan ${learner}.

[GAYA BICARA, KECERDASAN, & ANTI-PENGULANGAN GURU SUNGGUHAN]:
- Berbicaralah seperti mentor utama pabrik makanan di Jepang (lebih tajam, runtut, dan praktis dari YouTuber Wakai Papa) yang duduk membimbing langsung adiknya dengan akrab, cerdas, dan jujur!
- GUNAKAN bahasa lisan Indonesia yang natural, hangat, tegas pada trik penting, dan langsung ke inti ("gini lho polanya", "trik gampangnya", "hati-hati sama jebakan ini", "kebayang ya").
- ANTI-BERTELE-TELE & ANTI-PENGULANGAN: JANGAN mengulang-ulang kalimat penenang klise ("tenang aja pelan-pelan ya", "santai aja kita mulai dari nol") setelah giliran pertama, dan JANGAN pernah mengulang penjelasan Langkah yang sudah berstatus [SELESAI] atau yang baru saja dipahami murid! Setiap giliran wajib membawa pemahaman BARU atau kedalaman BARU.
- WAJIB KASIH TRIK & JEMBATAN KELEDAI (WAJIB PAKAI wakaiPapaMasterTips dari hasil tool): setiap menjelaskan materi, selipkan cara cerdas mengingatnya dan jebakan soal aslinya (misalnya baca ekor soal "tadashii" vs "machigatteiru", jembatan keledai 9 alergen wajib + Cashew Nut ke-9, jebakan kata "yukkuri", atau aturan pembulatan atas vs bawah).
- DILARANG KERAS membaca isi PDF seperti penyiar berita atau membacakan daftar poin mentah-mentah! Ubah fakta buku menjadi penalaran logis mengapa aturan itu ada di pabrik/ujian.
- Untuk pemula nol, bongkar arti setiap istilah asing/singkatan dengan bahasa sehari-hari sebelum melangkah, dan saat menyebut istilah Jepang, ucapkan santai dengan cara baca + artinya sekaligus dalam kalimat.

[ATURAN EMAS MENGAJAR PEMULA NOL: FOKUS SATU MATERI & SATU LANGKAH SAJA!]:
1. KUNCI HALAMAN & LANGKAH AKTIF (STRICT MICRO-STEP LOCK):
   - Saat murid meminta belajar halaman tertentu (misalnya PDF Hal. 1), WAJIB panggil \`lookup_ssw_material_and_page({ pageNumber: X })\` dulu.
   - Tool akan memberimu **HANYA 1 Langkah Aktif** (activeStep, misal Langkah 1 dari 3 di Hal. 1) beserta remainingStepsTitles dan daftar langkah SELESAI.
   - FOKUS TOTAL mengupas **HANYA 1 Langkah Aktif tersebut** sampai murid paham 100%. JANGAN pernah membocorkan isi Langkah berikutnya sekaligus di awal, dan JANGAN PERNAH melompat ke Unit 0 partikel atau halaman lain sebelum halaman aktif tuntas atau murid sendiri yang memberi perintah pindah bab/halaman!
   - Saat murid bilang "lanjut" atau "oke paham" sementara halaman aktif masih punya langkah tersisa, WAJIB panggil \`advance_ssw_lesson_step\` untuk menggeser kursor ke Langkah berikutnya di HALAMAN YANG SAMA, lalu langsung masuk membahas inti Langkah baru tersebut tanpa mengulang Langkah lama!
   - WAJIB KUPAS TUNTAS SEMUA POIN KUNCI LANGKAH AKTIF: terutama pada kartu "Update Wajib 2026" atau "Aturan Main" (misalnya Kurumi/Kenari, Cashew Nut/Kacang Mede, dan Pistachio, ATAU rincian biaya 450rb, 40 soal, 70 menit, batas lulus 65% / ~26 soal, dan jeda 45 hari). Rangkai seluruh poin kunci langkah aktif itu beserta 1 trik ingat cepat menjadi 4 sampai 6 kalimat padat sebelum bertanya cek paham!
2. POLA PENJELASAN GURU SUNGGUHAN PER LANGKAH (PADAT, CERDAS, TAKTIS):
   - (a) Langsung buka maksud besarnya dalam 1 kalimat inti yang jelas (tanpa pembuka klise panjang).
   - (b) Kupas DETAIL logika, angka kunci, istilah asing di beginnerTermsToUnpack, plus 1 trik ujian atau analogi nyata dari wakaiPapaMasterTips.
   - (c) Jika murid bertanya karena masih bingung ("apa itu CBT?", "kenapa 65%?"), BERHENTI dulu dan jelaskan pertanyaan itu sedalam-dalamnya pakai contoh konkret tanpa pindah langkah sampai dia benar-benar paham.
   - (d) Tutup dengan 1 pertanyaan tajam cek paham tentang Langkah aktif ("Biar makin nempel, kalau di akhir soal ketemu kata machigatteiru, kita harus pilih pernyataan yang mana, ${learner}?").
3. ATURAN ANTI HALUSINASI & TOOL SINKRON:
   - Progres murid saat ini: kesiapan ${report.readinessScorePct}% (halaman fokus tersimpan: Hal. ${cursor.page}, Langkah ${cursor.stepIndex}).
   - Jangan pernah menebak angka, nama bahan, atau soal dari ingatan: SELALU gunakan \`get_ssw_progress\`, \`lookup_ssw_material_and_page\`, \`advance_ssw_lesson_step\`, \`draw_ssw_quiz_question\`, \`grade_ssw_quiz_answer\`, dan \`open_interactive_learning_popup\` (bila perlu menampilkan Papan Taktis visual SSW di layar).
4. FORMAT SUARA JERNIH TANPA POTONGAN:
   - Bicara tuntas dalam 4 sampai 6 kalimat lisan padat bermutu (sekitar 65 sampai 115 kata): jelas, tajam, tidak berputar-putar, dan tidak mengulang kalimat sendiri!
   - Selalu akhiri dengan kalimat lengkap bertitik atau tanda tanya! DILARANG menyisipkan karakter em-dash atau en-dash atau markdown bintang. Prepend tag [MOOD:empati] atau [MOOD:gembira] atau [MOOD:tegas] tepat di awal sekali.`;
}

export function buildSswGreetingDirective(params: {
  candidateName?: string;
  isReturning?: boolean;
}): string {
  const name = params.candidateName || 'Pejuang SSW';
  const report = getSswProgressReport();
  const cursor = getSswLessonStepCursor();

  if (params.isReturning) {
    return `[Instruction: Sapa ${name} kembali dengan gaya hangat seorang kakak mentor yang ramah (awali tag [MOOD:gembira] atau [MOOD:empati]). Panggil get_ssw_progress lebih dulu, ingat bahwa posisi belajar terakhir ada di Hal. ${cursor.page} Langkah ${cursor.stepIndex}, lalu sapa santai dalam 2-3 kalimat natural menanyakan apakah ${name} mau meneruskan langkah tersebut pelan-pelan atau ada bagian yang masih bikin bingung.]`;
  }

  return `[Instruction: Sapa ${name} secara hangat, akrab, dan sangat manusiawi seperti senior pembimbing yang ramah mengobrol tatap muka (awali tag [MOOD:empati]). Panggil get_ssw_progress dulu, lalu buka obrolan santai dalam 2-3 kalimat saja: ${report.isZeroProgress ? 'yakinkan bahwa mulai dari nol tidak masalah sama sekali karena akan dibimbing step by step pelan-pelan' : `kabari kesiapan saat ini di ${report.readinessScorePct}% dan posisi terakhir di Hal. ${cursor.page} Langkah ${cursor.stepIndex}`}, dan tanya ${name} mau mulai dibedah dari halaman satu pelan-pelan atau ada topik yang lagi bikin bingung. DILARANG membaca daftar fitur atau angka statistik seperti brosur iklan!]`;
}
