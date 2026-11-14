import {
  BRAINCORE_PARAMS,
  bktUpdate,
  bridgeAttemptToHostPwa,
  createBlankCompetency,
  deriveMasteryState,
  loadBraincoreState,
  saveBraincoreState,
} from './braincore.ts';

export const SSW_MASTER_STORAGE_KEY = 'fz_ssw_master_state_v1';
export const SSW_PASS_SCORE_PCT = 65;
export const SSW_STATE_UPDATED_EVENT = 'fiezel:ssw-state-updated';
export const SSW_FOCUS_PAGE_EVENT = 'fiezel:ssw-focus-page';
export const SSW_FOCUS_STEP_EVENT = 'fiezel:ssw-focus-step';
export const SSW_KNOWLEDGE_HYDRATED_EVENT = 'fiezel:ssw-knowledge-hydrated';

export interface SswRoadmapStage {
  stage: number;
  id: string;
  title: string;
  pdfPages: string;
  otaffRef: string;
  goal: string;
  whyFirst?: string;
  recommendedDailyPattern?: string;
}

export interface SswGoldenNumber {
  label: string;
  value: string;
  pdfPage: number;
}

export interface SswTrapSecret {
  id: string;
  title: string;
  detail: string;
  source: string;
  pdfPage: number;
}

export interface SswMathFormula {
  id: string;
  name: string;
  formula: string;
  rule: string;
  pdfPage: number;
}

export interface SswPdfPage {
  page: number;
  unit: string;
  title: string;
  otaffRef: string;
  focusCompass: string;
  summary: string;
}

export interface SswKotobaItem {
  id: string;
  rubyMarkup: string;
  jp: string;
  reading: string;
  romaji: string;
  meaningId: string;
  category: string;
  pdfPage: number;
}

export interface SswQuizItem {
  id: string;
  n: number;
  tag: string;
  tryoutPdfPage: number;
  discussionPdfPage: number;
  questionRuby: string;
  questionJp: string;
  questionReading: string;
  questionId: string;
  optionsJp: string[];
  optionsRuby?: string[];
  optionsReading?: string[];
  optionsId: string[];
  correctLetter: 'A' | 'B' | 'C' | 'D' | string;
  correctIndex: number;
  explanationId: string;
  optionRationalesId?: string[];
}

export interface SswVideoChunk {
  videoId: string;
  channel: string;
  isWakaiPapa?: boolean;
  title: string;
  url: string;
  topicCategory: string;
  pdfPagesSuggested: number[];
  keyPoints: string[];
  excerpt: string;
}

export interface SswTranscriptChunk {
  chunkId: string;
  videoId: string;
  channel: string;
  isWakaiPapa: boolean;
  title: string;
  url: string;
  topicCategory: string;
  pdfPagesSuggested: number[];
  chunkIndex: number;
  text: string;
}

export interface SswSenseiMasterKb {
  meta: {
    title: string;
    totalPdfPages: number;
    totalKotoba: number;
    totalQuizQuestions: number;
    totalVideos?: number;
    totalChunks?: number;
    passingScorePct: number;
    examFormat: string;
    sources: string[];
  };
  roadmapStages: SswRoadmapStage[];
  goldenNumbers: SswGoldenNumber[];
  wakaiPapaTrapsAndSecrets: SswTrapSecret[];
  mathFormulas: SswMathFormula[];
  pages: SswPdfPage[];
  kotoba: SswKotobaItem[];
  quizzes: SswQuizItem[];
  wakaiPapaVideos: SswVideoChunk[];
  wakaiPapaTranscriptChunks?: SswTranscriptChunk[];
}

/**
 * Lightweight Core Manifest (~12 KB in client bundle) so voice-studio.js stays fast
 * while still supporting instant greeting, 8-stage roadmap, 13 golden numbers,
 * 11 Wakai Papa core traps, and 5 math formulas before async hydration finishes.
 */
export const SSW_CORE_MANIFEST: SswSenseiMasterKb = {
  meta: {
    title: 'SSW SENSEI Master Knowledge Base - Pengolahan Makanan (Ver 5.1 Apr 2026)',
    totalPdfPages: 91,
    totalKotoba: 266,
    totalQuizQuestions: 58,
    totalVideos: 86,
    passingScorePct: 65,
    examFormat:
      'CBT Prometric: 40 soal / 70 menit (30 teori + 10 praktik gambar & 2 soal kalkulator wajib). Syarat lulus minimal 65% (~26 soal benar).',
    sources: [
      'Buku Resmi OTAFF Edisi 4 Bahasa Indonesia (79 halaman)',
      'Buku Resmi OTAFF Versi 5.1 April 2026 Bahasa Jepang (86 halaman, termasuk 142 Indeks Resmi)',
      'Panduan Presisi Step-by-Step SSW Pengolahan Makanan 2026 (91 halaman, Hal. 1-91)',
      '42+ Video Wakai Papa + 5 Shorts Ver 5.1 + 39 Kreator YouTube SSW Indonesia (86 transkrip terindeks)',
    ],
  },
  roadmapStages: [
    {
      stage: 1,
      id: 'unit0_decoder',
      title: 'Unit 0: Peta Bobot CBT & Dekoder Kalimat Pemula Nol',
      pdfPages: 'Hal. 1-6',
      otaffRef: 'Panduan Presisi Hal. 1-6',
      goal: 'Mengenal format Prometric, 8 Angka Emas, 9 partikel inti, pembeda soal Benar (正しい) vs Salah (間違っている / 不適切), kata tanya, dan batas angka (以上/以下/未満).',
      whyFirst:
        'Jangan langsung hafal modul tebal sebelum mengerti ujung kalimat soal agar tidak terbalik memilih opsi Benar vs Salah!',
      recommendedDailyPattern:
        'Selesaikan Hal. 1-6 lebih dulu (1-2 hari), lalu pakai metode Peta Jepang: cicil 20 mnt pagi + 20 mnt siang + 20 mnt malam.',
    },
    {
      stage: 2,
      id: 'bab1_fondasi',
      title: 'Bab 1: Fondasi Kemampuan SSW & 13 Sektor Industri',
      pdfPages: 'Hal. 7-8',
      otaffRef: 'OTAFF ID & JP Hal. 1-4',
      goal: 'Paham 2 pilar utama (Keamanan Pangan & Keselamatan Kerja), makna Eisei (menjaga nyawa), dan 13 sektor industri makanan vs minuman (38,4 Triliun Yen).',
    },
    {
      stage: 3,
      id: 'unit6_kotoba_fondasi',
      title: 'Unit 6A: Hafalan Kotoba Fondasi Bab 1-2 (Set 1-9)',
      pdfPages: 'Hal. 46-54',
      otaffRef: 'Indeks OTAFF Ver 5.1 Hal. 70-79',
      goal: 'Kuasai istilah inti Bahaya, Bakteri, 5S, Zonasi, Seragam, Penyimpanan, dan HACCP sebelum membedah detail aturan agar cepat paham bacaan modul Jepang.',
    },
    {
      stage: 4,
      id: 'bab2_bahaya_mikroba',
      title: 'Bab 2.1-2.2: 3 Faktor Bahaya, Alergen Ver 5.1 & 8 Bakteri/Virus',
      pdfPages: 'Hal. 9-17',
      otaffRef: 'OTAFF ID & JP Ver 5.1 Hal. 5-14',
      goal: 'Kuasai 3 bahaya (Fisik, Kimia, Biologi), 9 Wajib Label Alergen 2026 (kurumi + cashew nut) vs 20 Anjuran (pistachio), Histamin & Solanin, 5 Bakteri Biasa + 3 Endospora (tahan 100C!), 3 Prinsip Cegah, Norovirus (4 prinsip, 85-90C 90 dtk, 1.000 ppm), dan Anisakis (-20C 24 jam).',
    },
    {
      stage: 5,
      id: 'bab2_sanitasi_haccp',
      title: 'Bab 2.3-2.4: 5S, Zonasi, Cuci Tangan, Penyimpanan, Detektor & HACCP',
      pdfPages: 'Hal. 18-31',
      otaffRef: 'OTAFF Hal. 15-41',
      goal: 'Higiene umum, 5S pabrik, 3 zona (Kotor, Semi-Bersih, Bersih), urutan pakai seragam A-E, 5 langkah cuci tangan, 18 suhu penyimpanan, thawing, buka kemasan, metal detector vs X-Ray, dan 7 prinsip HACCP (CCP, CL, Penyimpangan Itsudatsu).',
    },
    {
      stage: 6,
      id: 'bab3_u4_u5_k3_math',
      title: 'Bab 3, Unit 4 & 5: K3, 15 Rambu, Label Jepang & 5 Rumus Kalkulator CBT',
      pdfPages: 'Hal. 32-45',
      otaffRef: 'OTAFF Hal. 42-69 & Wakai Papa Math',
      goal: 'Peringkat kecelakaan kerja (31.3% Tentou, 19.2% Hasamare, 10.8% Kire-kosure), 10 APD, LOTO, Fail-Safe vs Foolproof, Heinrich 1:29:300, 11 kasus Hiyari-Hatto, 15 Rambu, baca label Tahun Reiwa, dan kuasai 2 soal hitungan wajib CBT.',
    },
    {
      stage: 7,
      id: 'unit6_kotoba_lanjutan',
      title: 'Unit 6B: Kotoba K3, Kata Kerja Produksi & Mesin (Set 10-18)',
      pdfPages: 'Hal. 55-63',
      otaffRef: '266 Kotoba & 142 Indeks OTAFF',
      goal: 'Tuntaskan seluruh 266 Kotoba kata kerja lini, alat mesin, bahan baku, bumbu, dan kata penentu soal.',
    },
    {
      stage: 8,
      id: 'unit7_u8_tryout',
      title: 'Unit 7-8: Tryout 50 Soal CBT & Audit Pembahasan Lengkap',
      pdfPages: 'Hal. 64-91',
      otaffRef: 'Prometric Mock 50 Soal + Wakai Papa Traps',
      goal: 'Kerjakan 50 soal lengkap (30 teori + visual + kalkulator + Ver 5.1) dengan target lulus >= 65% (mantap >= 80%) dan audit alasan tiap opsi salah.',
    },
  ],
  goldenNumbers: [
    {
      label: 'Kelulusan Ujian CBT Prometric',
      value: 'Minimal 65% dari 40 soal (waktu 70 menit; 30 teori + 10 praktik gambar & 2 soal hitungan)',
      pdfPage: 1,
    },
    {
      label: 'Alergen Resmi OTAFF Ver 5.1 (Apr 2026)',
      value: '9 Wajib Label (termasuk Kurumi & Cashew Nut) + 20 Anjuran Label (Pistachio masuk, Matsutake dihapus)',
      pdfPage: 10,
    },
    {
      label: 'Zona Suhu Bahaya Bakteri (Kiken Ondotai)',
      value: '10C sampai 60C (puncak perkembangbiakan tercepat 30C sampai 40C)',
      pdfPage: 16,
    },
    {
      label: 'Sterilisasi Panas Inti Makanan (Umum)',
      value: '75C selama >= 1 menit (bagian paling tengah/tebal)',
      pdfPage: 16,
    },
    {
      label: 'Sterilisasi Norovirus (Kerang/Makanan)',
      value: '85C sampai 90C selama >= 90 detik (alkohol TIDAK mempan!)',
      pdfPage: 17,
    },
    {
      label: 'Bakteri Endospora (Cereus, Welch, Botulinum)',
      value: 'Kebal rebusan 100C! Retort/sterilisasi perlu 120C 4 menit',
      pdfPage: 15,
    },
    {
      label: 'Anisakis (Parasit Ikan Laut)',
      value: 'Mati beku -20C minimal 24 jam atau masak >= 70C / 60C 1 menit',
      pdfPage: 17,
    },
    {
      label: 'Konsentrasi Klorin (Jiaensosan Natrium)',
      value: '100 ppm (10 menit sayur) | 200 ppm (5 menit sayur / lap Norovirus) | 1.000 ppm (muntahan/kotoran)',
      pdfPage: 17,
    },
    {
      label: 'Air Shower & Cuci Tangan',
      value: 'Air shower minimal 20 detik | Cuci tangan: sabun sela jari-kuku 30 detik + bilas air mengalir 20 detik',
      pdfPage: 21,
    },
    {
      label: 'Suhu Penyimpanan OTAFF',
      value:
        'Kulkas chiller <= 10C (ikan/daging mentah <= 5C, telur cair <= 8C, daging/ikan kupas 4C), Freezer <= -15C (rekomendasi -18C, isi max 80-90%; kulkas isi <= 70%)',
      pdfPage: 26,
    },
    {
      label: 'Peringkat Kecelakaan Kerja Bab 3',
      value: '#1 Tentou (terpeleset/jatuh) 31,3% | #2 Hasamare/Makikomare (terjepit mesin) 19,2% | #3 Kire-kosure (terpotong) 10,8%',
      pdfPage: 32,
    },
    {
      label: 'Hukum Piramida Heinrich',
      value: '1 cedera berat : 29 cedera ringan : 300 kejadian nyaris celaka (Hiyari-Hatto)',
      pdfPage: 36,
    },
    {
      label: 'Helm K3 & Tahun Kalender Jepang',
      value: 'Helm wajib saat bekerja di ketinggian >= 2 meter | Tahun Masehi = Tahun Reiwa + 2018 (Reiwa 8 = 2026)',
      pdfPage: 33,
    },
  ],
  wakaiPapaTrapsAndSecrets: [
    {
      id: 'trap_yukkuri',
      title: "Kata 'yukkuri' (pelan-pelan) pada pembekuan/pencairan = JAWABAN SALAH",
      detail:
        "Jika soal minta cari cara yang salah (machigatteiru), opsi berisi 'yukkuri reitou' (dibekukan pelan) atau makanan hangat dibiarkan dingin pelan di suhu ruang pasti salah karena memicu bakteri di suhu 10-60C.",
      source: 'Wakai Papa (8sSRkIMSu4k) & Dhilla Sensei (zUhLutldTkQ)',
      pdfPage: 27,
    },
    {
      id: 'trap_100_nol',
      title: "Klaim 'Membuat bahaya / benda asing menjadi NOL (0%)' = JAWABAN SALAH",
      detail:
        "Dalam prinsip sanitasi & K3 (Heinrich/Hiyari-Hatto), kalimat benar memakai kata 'herasu / teigen suru' (mengurangi/menekan), BUKAN janji mustahil 100% nol.",
      source: 'OTAFF Tryout #7, #25 & Wakai Papa',
      pdfPage: 77,
    },
    {
      id: 'trap_hokang_sampuru',
      title: "Ketemu 'Hokang Sampuru' -> Langsung ingat kata kunci 'KUREMU' (Komplain)",
      detail:
        'Penyimpanan sampel produk jadi (seihin sanpuru) tujuannya untuk menyelidiki penyebab saat ada klaim/komplain (kureemu) atau keracunan dari konsumen.',
      source: 'Wakai Papa (9JhNuTbJKAk)',
      pdfPage: 29,
    },
    {
      id: 'trap_seiton_basho',
      title: "Ketemu 'Seiton' (整頓) -> Langsung ingat 'Oki basho' (tempat penyimpanan tetap)",
      detail:
        'Seiri = buang/pilah yang tidak perlu; Seiton = tata alat/bahan di tempat yang ditentukan (oki basho) agar cepat diambil; Seisou = menyapu/mencuci kotoran; Seiketsu = menjaga keadaan bersih tetap terjaga; Shitsuke = membiasakan patuh.',
      source: 'Wakai Papa (sA8IA2EgLE4, 9JhNuTbJKAk)',
      pdfPage: 18,
    },
    {
      id: 'trap_yoiki_mix',
      title: 'Larangan Mencampur Bahan Pembersih -> Pasti Klorin (Ensokei) + Asam (Sansei)',
      detail:
        'Mencampur pemutih klorin dengan deterjen asam menghasilkan GAS KLORIN BERACUN. Tidak dicampur dengan alkali/chusei!',
      source: 'Wakai Papa (8sSRkIMSu4k) & OTAFF #47',
      pdfPage: 35,
    },
    {
      id: 'trap_detector',
      title: 'Detektor Logam (Kinzoku Tanchiki) vs X-Ray',
      detail:
        'Detektor logam hanya mendeteksi LOGAM (Fe/SUS) - TIDAK bisa mendeteksi batu, kaca, atau plastik! X-Ray bisa deteksi batu, kaca, tulang, logam, tapi lemah pada plastik tipis, rambut, atau serangga.',
      source: 'Wakai Papa (9JhNuTbJKAk) & Dhilla Sensei (aXlqc2yVXRQ)',
      pdfPage: 29,
    },
    {
      id: 'trap_spaghetti',
      title: 'Jebakan Produk Olahan Alergen (Spaghetti / Udon / Roti)',
      detail:
        "Soal sering menyebut spaghetti/mie/kue tanpa menulis kata 'komugi'. Wajib telusuri bahan dasarnya: spaghetti/roti = komugi (gandum, 9 Wajib Label!).",
      source: 'Wakai Papa (8sSRkIMSu4k)',
      pdfPage: 10,
    },
    {
      id: 'trap_endospora_cereus',
      title: 'Bakteri Pembentuk Spora (Gahou) & Tahan Tanpa Oksigen',
      detail:
        '3 Bakteri Gahou (kebal rebusan 100C): Bacillus cereus (nasi/mie suhu ruang, bisa hidup dengan maupun tanpa oksigen!), Clostridium perfringens/Welch (kari/sup panci besar, anaerob), Clostridium botulinum (kemasan vakum tanpa oksigen, sangat mematikan).',
      source: 'Wakai Papa (RafxZrUhbDo) & Hal. 15',
      pdfPage: 15,
    },
    {
      id: 'trap_rounding_math',
      title: 'Soal Hitungan Roti/Ikan/Oven: Pembulatan Desimal WAJIB KE ATAS!',
      detail:
        'Contoh Wakai Papa: 250 potong / 3 per sisi ikan = 83,33 -> wajib pilih 84 (kalau 83 kurang 1 potong!); 1.000 roti / 144 per batch oven = 6,94 -> wajib pilih 7 kali oven!',
      source: 'Wakai Papa (_qvijIYA_Uo)',
      pdfPage: 45,
    },
    {
      id: 'trap_kaifuu_pinhole',
      title: 'Ver 5.1 Penekanan Baru: Kaifuu (Jumlah Potongan) & Pinhole/More (Kebocoran)',
      detail:
        'Saat buka kantong: jumlah kantong = jumlah potongan ujung yang dipotong (jangan gunting 2x!). Saat cairkan pakai air mengalir: cek kemasan jangan ada lubang/bocor (ana/more) atau karantina semua produk sejak cek normal terakhir bila test piece detektor logam gagal.',
      source: 'OTAFF Ver 5.1 & Peta Jepang (Jnppc14PRbQ)',
      pdfPage: 27,
    },
    {
      id: 'trap_study_method',
      title: 'Strategi Belajar 1 Bulan Lulus dari Kreator YouTube SSW',
      detail:
        'Peta Jepang & Rizqy Maulana: Hafalkan Kotoba inti dulu baru baca modul, cicil 20 menit pagi + 20 menit siang + 20 menit malam (1 jam/hari terpecah anti stres), ulangi tryout sampai konsisten di atas 80%.',
      source: 'Peta Jepang (ZKGXDkjXynE) & Rizqy Maulana (wNpEENWWoSA)',
      pdfPage: 46,
    },
  ],
  mathFormulas: [
    {
      id: 'rumus_pengenceran',
      name: 'Rumus 1: Pengenceran Klorin (Kishaku)',
      formula: 'C1 * V1 = C2 * V2  ->  V1 = (C2 * V2) / C1; Air = V2 - V1',
      rule: '1% = 10.000 ppm (jadi 10% = 100.000 ppm, 6% = 60.000 ppm); 1 L = 1.000 mL.',
      pdfPage: 44,
    },
    {
      id: 'rumus_rendemen',
      name: 'Rumus 2: Rendemen (Budomari) & Loss-ritsu',
      formula: 'Budomari (%) = (Berat Siap Pakai / Berat Kotor Awal) * 100%; Loss (%) = 100% - Budomari (%)',
      rule: 'Jika diketahui Berat Siap Pakai = Berat Awal * Budomari%. Jika cari Berat Awal yang harus dibeli = Target Bersih / (Budomari% / 100).',
      pdfPage: 44,
    },
    {
      id: 'rumus_skala_resep',
      name: 'Rumus 3: Skala Resep (Haigou) & Konversi Satuan',
      formula: 'Total Hasil = (Total Resep / Bahan Kunci Resep) * Bahan Kunci Aktual',
      rule: 'Samakan dulu semua satuan kg -> gram (1 kg = 1.000 g), lalu kalikan silang seperti trik Wakai Papa.',
      pdfPage: 45,
    },
    {
      id: 'rumus_lini_oven',
      name: 'Rumus 4: Waktu Lini, Kadouritsu & Kapasitas Oven',
      formula: 'Output Nyata = Speed * Waktu * Kadouritsu; Batch = Ceil(Target / Kapasitas per Batch)',
      rule: 'Selalu bulatkan KE ATAS jika sisa produksi/panggangan tidak muat (mis. 83,33 -> 84; 6,94 -> 7).',
      pdfPage: 45,
    },
    {
      id: 'rumus_bakteri_2n',
      name: 'Rumus 5: Pertumbuhan Bakteri (Nibunretsu 2^n)',
      formula: 'N_akhir = N_awal * 2^(Total Menit / Waktu Membelah)',
      rule: 'Contoh: awal 100 bakteri, membelah tiap 20 menit selama 2 jam (120 menit) -> 120/20 = 6 generasi -> 100 * 2^6 = 6.400 sel!',
      pdfPage: 45,
    },
  ],
  pages: [],
  kotoba: [],
  quizzes: [],
  wakaiPapaVideos: [],
  wakaiPapaTranscriptChunks: [],
};

// Live shared KB cache object (mutated cleanly on async hydration so every caller immediately sees full data)
export const SSW_MASTER_KB: SswSenseiMasterKb = {
  meta: { ...SSW_CORE_MANIFEST.meta },
  roadmapStages: [...SSW_CORE_MANIFEST.roadmapStages],
  goldenNumbers: [...SSW_CORE_MANIFEST.goldenNumbers],
  wakaiPapaTrapsAndSecrets: [...SSW_CORE_MANIFEST.wakaiPapaTrapsAndSecrets],
  mathFormulas: [...SSW_CORE_MANIFEST.mathFormulas],
  pages: [],
  kotoba: [],
  quizzes: [],
  wakaiPapaVideos: [],
  wakaiPapaTranscriptChunks: [],
};

export type SswLearnerLevel = 'zero_beginner' | 'basic_hiragana' | 'n5_n4' | 'repeat_retaker';

export interface SswQuizHistoryItem {
  quizId: string;
  tag: string;
  ok: boolean;
  userAnswer: string;
  selectedIndex: number;
  correctLetter: string;
  correctIndex: number;
  tryoutPdfPage: number;
  discussionPdfPage: number;
  timestamp: number;
}

export interface SswLessonStepCursor {
  page: number;
  stepIndex: number;
  completedStepsByPage: Record<string, number[]>;
}

export interface SswMasterState {
  version: 1;
  learnerLevel: SswLearnerLevel;
  activeStageId: string;
  completedStageIds: string[];
  pdfPagesRead: number[];
  kotobaMasteredIds: string[];
  weakTopics: string[];
  quizHistory: SswQuizHistoryItem[];
  readinessScorePct: number;
  activeQuizId: string | null;
  lastFocusPage: number;
  lessonStepCursor?: SswLessonStepCursor;
  lastUpdated: number;
}

export interface SswDrawnQuestionPayload {
  quizId: string;
  n: number;
  mode: string;
  tag: string;
  tryoutPdfPage: number;
  discussionPdfPage: number;
  questionJp: string;
  questionRuby: string;
  questionReading: string;
  questionId: string;
  options: Array<{
    letter: string;
    index: number;
    jp: string;
    ruby: string;
    reading: string;
    id: string;
  }>;
  isKotobaDrill?: boolean;
  loading?: boolean;
}

export interface SswGradeQuizResult {
  found: boolean;
  ok: boolean;
  quizId: string;
  tag: string;
  userAnswer: string;
  selectedIndex: number;
  selectedLetter: string;
  selectedRationaleId?: string;
  correctIndex: number;
  correctLetter: string;
  correctAnswerJp: string;
  correctAnswerId: string;
  correctRationaleId?: string;
  explanationId: string;
  tryoutPdfPage: number;
  discussionPdfPage: number;
  readinessScorePct: number;
  passingThresholdPct: number;
  passedExamBenchmark: boolean;
  totalAttempted: number;
  totalPassed: number;
  state: SswMasterState;
}

let inMemorySswStore: string | null = null;
const ephemeralKotobaQuizBank = new Map<string, SswQuizItem>();
let _isFullKbHydrated = false;
let _isCorpusHydrated = false;
let _hydrationPromise: Promise<boolean> | null = null;

/**
 * Decode common HTML entities and strip em-dash (\u2014) / en-dash (\u2013) cleanly from all generated strings.
 */
export function sanitizeSswText(input: unknown): string {
  const raw = String(input ?? '');
  if (!raw) return '';
  return raw
    .replace(/&deg;/gi, '°')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&check;|&#10003;|&#10004;/gi, 'v')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const cp = parseInt(hex, 16);
      return Number.isFinite(cp) && cp > 0 && cp < 0x10ffff ? String.fromCodePoint(cp) : '';
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const cp = parseInt(dec, 10);
      return Number.isFinite(cp) && cp > 0 && cp < 0x10ffff ? String.fromCodePoint(cp) : '';
    })
    .replace(/\s*[\u2014\u2013]+\s*/g, ' - ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const PREGRADE_SPOILER_RE =
  /\s+-\s+(?!\d+(?:[,.]\d+)?\s*(?:°C|C|%|ppm|jam|menit|detik|kg|g|mL|L|cm|mm|triliun|miliar|juta)\b).*$/i;

export function cleanPregradeOptionId(input: unknown): string {
  return sanitizeSswText(input).replace(PREGRADE_SPOILER_RE, '').trim();
}

function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Converts KB `{漢字|ふりがな}` syntax into semantic `<ruby class="fz-ja-ruby">` markup.
 */
export function renderSswRubyHtml(rubyText: string, hideFurigana = false): string {
  const clean = sanitizeSswText(rubyText || '');
  if (!clean) return '';
  const pattern = /\{([^{}|]+)\|([^{}]+)\}/g;
  let out = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(clean)) !== null) {
    if (match.index > lastIndex) {
      out += escapeHtml(clean.slice(lastIndex, match.index));
    }
    const base = escapeHtml(match[1]);
    const reading = escapeHtml(match[2]);
    if (hideFurigana) {
      out += base;
    } else {
      out += `<ruby class="fz-ja-ruby">${base}<rt class="fz-ja-rt">${reading}</rt></ruby>`;
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < clean.length) {
    out += escapeHtml(clean.slice(lastIndex));
  }
  return out;
}

export function stripSswRubyBraces(rubyText: string): string {
  return sanitizeSswText(String(rubyText || '').replace(/\{([^{}|]+)\|([^{}]+)\}/g, '$1'));
}

function normalizeVideoChunk(raw: Record<string, unknown>, idx: number): SswVideoChunk | null {
  if (!raw || typeof raw !== 'object') return null;
  const videoId = sanitizeSswText(raw.videoId || raw.video_id || raw.id || `vid_${idx + 1}`);
  const title = sanitizeSswText(raw.title || '');
  if (!videoId && !title) return null;
  const channel = sanitizeSswText(raw.channel || raw.creator || raw.author || 'Wakai Papa');
  const rawUrl = String(raw.url || '').trim();
  const url =
    rawUrl || (videoId && !videoId.startsWith('vid_') ? `https://www.youtube.com/watch?v=${videoId}` : '');
  const topicCategory = sanitizeSswText(raw.topicCategory || raw.category || raw.topic || 'Umum SSW');
  const rawPages = Array.isArray(raw.pdfPagesSuggested || raw.pdf_pages || raw.pages)
    ? ((raw.pdfPagesSuggested || raw.pdf_pages || raw.pages) as unknown[])
    : [];
  const pdfPagesSuggested = rawPages
    .map((p) => Number(p))
    .filter((p) => Number.isInteger(p) && p >= 1 && p <= 91);
  const rawPoints = Array.isArray(raw.keyPoints || raw.key_points || raw.points)
    ? ((raw.keyPoints || raw.key_points || raw.points) as unknown[])
    : [];
  const keyPoints = rawPoints.map((pt) => sanitizeSswText(pt)).filter(Boolean).slice(0, 6);
  const excerpt = sanitizeSswText(
    raw.excerpt || raw.summary || raw.transcriptExcerpt || raw.transcript || ''
  ).slice(0, 420);

  const isWakaiPapa =
    typeof raw.isWakaiPapa === 'boolean'
      ? raw.isWakaiPapa
      : channel.toLowerCase().includes('wakai');

  return {
    videoId,
    channel,
    isWakaiPapa,
    title: title || `Video SSW ${videoId}`,
    url,
    topicCategory,
    pdfPagesSuggested,
    keyPoints,
    excerpt,
  };
}

function normalizeTranscriptChunk(raw: Record<string, unknown>, idx: number): SswTranscriptChunk | null {
  if (!raw || typeof raw !== 'object') return null;
  const text = sanitizeSswText(raw.text || '');
  if (!text) return null;
  const videoId = sanitizeSswText(raw.videoId || raw.video_id || '');
  const chunkId = sanitizeSswText(raw.chunkId || raw.chunk_id || `${videoId || 'chk'}_${idx}`);
  const channel = sanitizeSswText(raw.channel || 'Wakai Papa');
  const title = sanitizeSswText(raw.title || `Video SSW ${videoId}`);
  const url =
    String(raw.url || '').trim() ||
    (videoId && !videoId.startsWith('vid_') ? `https://www.youtube.com/watch?v=${videoId}` : '');
  const topicCategory = sanitizeSswText(raw.topicCategory || raw.category || 'Umum SSW');
  const rawPages = Array.isArray(raw.pdfPagesSuggested || raw.pdf_pages)
    ? ((raw.pdfPagesSuggested || raw.pdf_pages) as unknown[])
    : [];
  const pdfPagesSuggested = rawPages
    .map((p) => Number(p))
    .filter((p) => Number.isInteger(p) && p >= 1 && p <= 91);
  return {
    chunkId,
    videoId,
    channel,
    isWakaiPapa:
      typeof raw.isWakaiPapa === 'boolean' ? raw.isWakaiPapa : channel.toLowerCase().includes('wakai'),
    title,
    url,
    topicCategory,
    pdfPagesSuggested,
    chunkIndex: Number.isFinite(Number(raw.chunkIndex)) ? Number(raw.chunkIndex) : idx,
    text,
  };
}

function normalizeTranscriptChunkList(rawCorpus: unknown): SswTranscriptChunk[] {
  const arr = Array.isArray(rawCorpus)
    ? rawCorpus
    : rawCorpus && typeof rawCorpus === 'object'
    ? (rawCorpus as { chunks?: unknown[]; transcriptChunks?: unknown[] }).chunks ||
      (rawCorpus as { transcriptChunks?: unknown[] }).transcriptChunks ||
      []
    : [];
  if (!Array.isArray(arr)) return [];
  const out: SswTranscriptChunk[] = [];
  for (let i = 0; i < arr.length; i++) {
    const ch = normalizeTranscriptChunk(arr[i] as Record<string, unknown>, i);
    if (ch) out.push(ch);
  }
  return out;
}

function normalizeVideoList(rawCorpus: unknown): SswVideoChunk[] {
  const arr = Array.isArray(rawCorpus)
    ? rawCorpus
    : rawCorpus && typeof rawCorpus === 'object'
    ? (rawCorpus as { videos?: unknown[]; corpus?: unknown[]; items?: unknown[]; wakaiPapaVideos?: unknown[] })
        .videos ||
      (rawCorpus as { corpus?: unknown[] }).corpus ||
      (rawCorpus as { items?: unknown[] }).items ||
      (rawCorpus as { wakaiPapaVideos?: unknown[] }).wakaiPapaVideos ||
      []
    : [];
  if (!Array.isArray(arr)) return [];
  const out: SswVideoChunk[] = [];
  for (let i = 0; i < arr.length; i++) {
    const item = normalizeVideoChunk(arr[i] as Record<string, unknown>, i);
    if (item) out.push(item);
  }
  return out;
}

export function hydrateSswFullKnowledge(kbRaw?: unknown, corpusRaw?: unknown): boolean {
  let changed = false;
  if (kbRaw && typeof kbRaw === 'object') {
    const k = kbRaw as Partial<SswSenseiMasterKb> & {
      kb?: Partial<SswSenseiMasterKb>;
      masterKb?: Partial<SswSenseiMasterKb>;
    };
    const src = k.pages ? k : k.kb?.pages ? k.kb : k.masterKb?.pages ? k.masterKb : k;

    if (src.meta && typeof src.meta === 'object') {
      SSW_MASTER_KB.meta = {
        ...SSW_CORE_MANIFEST.meta,
        ...src.meta,
      };
    }
    if (Array.isArray(src.roadmapStages) && src.roadmapStages.length > 0) {
      SSW_MASTER_KB.roadmapStages = src.roadmapStages;
    }
    if (Array.isArray(src.goldenNumbers) && src.goldenNumbers.length > 0) {
      SSW_MASTER_KB.goldenNumbers = src.goldenNumbers;
    }
    if (Array.isArray(src.wakaiPapaTrapsAndSecrets) && src.wakaiPapaTrapsAndSecrets.length > 0) {
      SSW_MASTER_KB.wakaiPapaTrapsAndSecrets = src.wakaiPapaTrapsAndSecrets;
    }
    if (Array.isArray(src.mathFormulas) && src.mathFormulas.length > 0) {
      SSW_MASTER_KB.mathFormulas = src.mathFormulas;
    }
    if (Array.isArray(src.pages) && src.pages.length > 0) {
      SSW_MASTER_KB.pages = src.pages;
      SSW_MASTER_KB.meta.totalPdfPages = src.meta?.totalPdfPages || src.pages.length;
      _isFullKbHydrated = true;
      changed = true;
    }
    if (Array.isArray(src.kotoba) && src.kotoba.length > 0) {
      SSW_MASTER_KB.kotoba = src.kotoba;
      SSW_MASTER_KB.meta.totalKotoba = src.meta?.totalKotoba || src.kotoba.length;
      changed = true;
    }
    if (Array.isArray(src.quizzes) && src.quizzes.length > 0) {
      SSW_MASTER_KB.quizzes = src.quizzes;
      SSW_MASTER_KB.meta.totalQuizQuestions = src.meta?.totalQuizQuestions || src.quizzes.length;
      changed = true;
    }
    if (Array.isArray((src as { wakaiPapaVideos?: unknown[] }).wakaiPapaVideos)) {
      const embeddedVideos = normalizeVideoList((src as { wakaiPapaVideos?: unknown[] }).wakaiPapaVideos);
      if (embeddedVideos.length > 0) {
        SSW_MASTER_KB.wakaiPapaVideos = embeddedVideos;
        SSW_MASTER_KB.meta.totalVideos = embeddedVideos.length;
        _isCorpusHydrated = true;
        changed = true;
      }
    }
  }

  if (corpusRaw) {
    const videos = normalizeVideoList(corpusRaw);
    if (videos.length > 0) {
      SSW_MASTER_KB.wakaiPapaVideos = videos;
      SSW_MASTER_KB.meta.totalVideos = videos.length;
      _isCorpusHydrated = true;
      changed = true;
    }
    const chunks = normalizeTranscriptChunkList(corpusRaw);
    if (chunks.length > 0) {
      SSW_MASTER_KB.wakaiPapaTranscriptChunks = chunks;
      SSW_MASTER_KB.meta.totalChunks = chunks.length;
      _isCorpusHydrated = true;
      changed = true;
    }
  }

  if (changed) {
    dispatchSswWindowEvent(SSW_KNOWLEDGE_HYDRATED_EVENT, getSswHydrationStatus());
  }
  return _isFullKbHydrated;
}

export function getSswHydrationStatus() {
  return {
    hydrated: _isFullKbHydrated,
    corpusHydrated: _isCorpusHydrated,
    pagesCount: SSW_MASTER_KB.pages.length,
    kotobaCount: SSW_MASTER_KB.kotoba.length,
    quizzesCount: SSW_MASTER_KB.quizzes.length,
    videosCount: SSW_MASTER_KB.wakaiPapaVideos.length,
    chunksCount: (SSW_MASTER_KB.wakaiPapaTranscriptChunks || []).length,
  };
}

function getCurriculumApiBaseUrl(): string {
  try {
    const win =
      typeof window !== 'undefined'
        ? (window as unknown as { FIEZEL_CURRICULUM_CONFIG?: { curriculumApiUrl?: string } })
        : null;
    const raw = String(win?.FIEZEL_CURRICULUM_CONFIG?.curriculumApiUrl || 'https://fiezel-apps.onrender.com').trim();
    return raw.replace(/\/+$/, '');
  } catch {
    return 'https://fiezel-apps.onrender.com';
  }
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<unknown | null> {
  if (typeof fetch !== 'function') return null;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-cache',
      signal: controller ? controller.signal : undefined,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Single-flight on-demand hydration:
 * 1) Priority 1: Backend FastAPI `/api/ssw/bundle` (8000ms budget for ~2 MB bundle download; fails fast on error)
 * 2) Priority 2: Instant static fallback `./content/ssw/ssw-sensei-master-kb.json` & `./content/ssw/ssw-wakai-papa-corpus.json`
 */
export async function ensureSswFullKnowledgeLoaded(forceRetry = false): Promise<boolean> {
  if (_isFullKbHydrated && _isCorpusHydrated && !forceRetry) {
    return true;
  }
  if (_hydrationPromise && !forceRetry) {
    return _hydrationPromise;
  }

  _hydrationPromise = (async () => {
    // Allow deterministic injection in headless unit tests without polluting the Vite client bundle
    const testLoader = (
      globalThis as unknown as {
        __FIEZEL_SSW_TEST_LOADER__?: () => Promise<{ kb?: unknown; corpus?: unknown } | null>;
      }
    ).__FIEZEL_SSW_TEST_LOADER__;
    if (typeof testLoader === 'function') {
      try {
        const res = await testLoader();
        if (res) {
          hydrateSswFullKnowledge(res.kb, res.corpus);
          if (_isFullKbHydrated) return true;
        }
      } catch {
        // continue to normal HTTP hydration
      }
    }

    // Priority 1: FastAPI backend bundle (mirrors Kurikulum SMP backend pattern)
    const apiBase = getCurriculumApiBaseUrl();
    if (apiBase && typeof window !== 'undefined') {
      const apiBundle = await fetchJsonWithTimeout(`${apiBase}/api/ssw/bundle?include_chunks=true`, 8000);
      if (apiBundle && typeof apiBundle === 'object') {
        const b = apiBundle as {
          kb?: unknown;
          masterKb?: unknown;
          corpus?: unknown;
          videos?: unknown;
          chunks?: unknown;
          pages?: unknown;
        };
        const corpusPayload = b.corpus || (b.videos || b.chunks ? { videos: b.videos, chunks: b.chunks } : undefined);
        hydrateSswFullKnowledge(b.kb || b.masterKb || (b.pages ? b : undefined), corpusPayload);
        if (_isFullKbHydrated && _isCorpusHydrated) {
          return true;
        }
      }
    }

    // Priority 2: Lazy static JSON files under ./content/ssw/ (uncached in sw.js for zero boot bloat)
    const [kbJson, corpusJson] = await Promise.all([
      _isFullKbHydrated ? Promise.resolve(null) : fetchJsonWithTimeout('./content/ssw/ssw-sensei-master-kb.json', 8000),
      _isCorpusHydrated ? Promise.resolve(null) : fetchJsonWithTimeout('./content/ssw/ssw-wakai-papa-corpus.json', 8000),
    ]);
    hydrateSswFullKnowledge(kbJson, corpusJson);
    return _isFullKbHydrated;
  })().finally(() => {
    _hydrationPromise = null;
  });

  return _hydrationPromise;
}

export function getDefaultSswMasterState(): SswMasterState {
  const firstStage = SSW_CORE_MANIFEST.roadmapStages[0]?.id || 'unit0_decoder';
  return {
    version: 1,
    learnerLevel: 'zero_beginner',
    activeStageId: firstStage,
    completedStageIds: [],
    pdfPagesRead: [],
    kotobaMasteredIds: [],
    weakTopics: [],
    quizHistory: [],
    readinessScorePct: 0,
    activeQuizId: null,
    lastFocusPage: 1,
    lessonStepCursor: {
      page: 1,
      stepIndex: 1,
      completedStepsByPage: {},
    },
    lastUpdated: Date.now(),
  };
}

export function computeReadinessScorePct(state: SswMasterState): number {
  const totalStages = Math.max(1, SSW_MASTER_KB.roadmapStages.length);
  const totalPages = Math.max(1, SSW_MASTER_KB.meta.totalPdfPages || 91);
  const totalKotoba = Math.max(1, SSW_MASTER_KB.meta.totalKotoba || 266);

  const completedStages = Array.isArray(state.completedStageIds) ? state.completedStageIds : [];
  const pagesRead = Array.isArray(state.pdfPagesRead) ? state.pdfPagesRead : [];
  const kotobaIds = Array.isArray(state.kotobaMasteredIds) ? state.kotobaMasteredIds : [];
  const history = Array.isArray(state.quizHistory) ? state.quizHistory : [];

  if (
    completedStages.length === 0 &&
    pagesRead.length === 0 &&
    kotobaIds.length === 0 &&
    history.length === 0
  ) {
    return 0;
  }

  const stageScore = (Math.min(completedStages.length, totalStages) / totalStages) * 35;
  const pageScore = (Math.min(pagesRead.length, totalPages) / totalPages) * 20;
  const kotobaScore = (Math.min(kotobaIds.length, totalKotoba) / totalKotoba) * 15;

  let quizScore = 0;
  if (history.length > 0) {
    const passedDistinct = new Set(history.filter((h) => h.ok).map((h) => h.quizId));
    const recent = history.slice(-15);
    const recentAcc = recent.filter((h) => h.ok).length / recent.length;
    const breadth = Math.min(1, passedDistinct.size / 12);
    quizScore = recentAcc * 20 + breadth * 10;
  }

  const rawScore = stageScore + pageScore + kotobaScore + quizScore;
  if (
    rawScore <= 0 &&
    completedStages.length === 0 &&
    pagesRead.length === 0 &&
    kotobaIds.length === 0 &&
    history.length === 0
  ) {
    return 0;
  }
  return Math.min(100, Math.max(1, Math.round(rawScore)));
}

function normalizeStateShape(raw: Partial<SswMasterState> | null | undefined): SswMasterState {
  const def = getDefaultSswMasterState();
  if (!raw || typeof raw !== 'object') return def;
  const validStageIds = new Set(SSW_MASTER_KB.roadmapStages.map((s) => s.id));
  const validKotobaIds = new Set(SSW_MASTER_KB.kotoba.map((k) => k.id));

  const completedStageIds = Array.from(
    new Set(
      (Array.isArray(raw.completedStageIds) ? raw.completedStageIds : []).filter((id) =>
        validStageIds.has(String(id))
      )
    )
  );
  const activeStageId =
    raw.activeStageId && validStageIds.has(String(raw.activeStageId))
      ? String(raw.activeStageId)
      : def.activeStageId;
  const totalPages = SSW_MASTER_KB.meta.totalPdfPages || 91;
  const pdfPagesRead = Array.from(
    new Set(
      (Array.isArray(raw.pdfPagesRead) ? raw.pdfPagesRead : [])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= totalPages)
    )
  ).sort((a, b) => a - b);
  // Before full kotoba catalog is hydrated, preserve valid-looking ids instead of stripping them
  const kotobaMasteredIds = Array.from(
    new Set(
      (Array.isArray(raw.kotobaMasteredIds) ? raw.kotobaMasteredIds : []).filter((id) =>
        validKotobaIds.size > 0 ? validKotobaIds.has(String(id)) : String(id).trim().length > 0
      )
    )
  );
  const weakTopics = Array.from(
    new Set((Array.isArray(raw.weakTopics) ? raw.weakTopics : []).map((t) => sanitizeSswText(t)).filter(Boolean))
  ).slice(0, 12);
  const quizHistory = (Array.isArray(raw.quizHistory) ? raw.quizHistory : []).slice(-100);
  const learnerLevel: SswLearnerLevel =
    raw.learnerLevel === 'basic_hiragana' ||
    raw.learnerLevel === 'n5_n4' ||
    raw.learnerLevel === 'repeat_retaker'
      ? raw.learnerLevel
      : 'zero_beginner';
  const lastFocusPage =
    Number.isInteger(Number(raw.lastFocusPage)) &&
    Number(raw.lastFocusPage) >= 1 &&
    Number(raw.lastFocusPage) <= totalPages
      ? Number(raw.lastFocusPage)
      : 1;

  const rawCursor = raw.lessonStepCursor && typeof raw.lessonStepCursor === 'object' ? raw.lessonStepCursor : null;
  const cursorPage =
    rawCursor && Number.isInteger(Number(rawCursor.page)) && Number(rawCursor.page) >= 1 && Number(rawCursor.page) <= totalPages
      ? Number(rawCursor.page)
      : lastFocusPage;
  const cursorStepIndex =
    rawCursor && Number.isInteger(Number(rawCursor.stepIndex)) && Number(rawCursor.stepIndex) >= 1
      ? Number(rawCursor.stepIndex)
      : 1;
  const rawCompletedMap =
    rawCursor && rawCursor.completedStepsByPage && typeof rawCursor.completedStepsByPage === 'object'
      ? rawCursor.completedStepsByPage
      : {};
  const completedStepsByPage: Record<string, number[]> = {};
  for (const [k, v] of Object.entries(rawCompletedMap)) {
    const pk = Number(k);
    if (Number.isInteger(pk) && pk >= 1 && pk <= totalPages && Array.isArray(v)) {
      const nums = Array.from(
        new Set(v.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 1 && x <= 12))
      ).sort((a, b) => a - b);
      if (nums.length > 0) completedStepsByPage[String(pk)] = nums;
    }
  }

  const normalized: SswMasterState = {
    version: 1,
    learnerLevel,
    activeStageId,
    completedStageIds,
    pdfPagesRead,
    kotobaMasteredIds,
    weakTopics,
    quizHistory,
    readinessScorePct: 0,
    activeQuizId: typeof raw.activeQuizId === 'string' && raw.activeQuizId ? raw.activeQuizId : null,
    lastFocusPage,
    lessonStepCursor: {
      page: cursorPage,
      stepIndex: cursorStepIndex,
      completedStepsByPage,
    },
    lastUpdated: typeof raw.lastUpdated === 'number' ? raw.lastUpdated : Date.now(),
  };
  normalized.readinessScorePct = computeReadinessScorePct(normalized);
  return normalized;
}

export function loadSswMasterState(): SswMasterState {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SSW_MASTER_STORAGE_KEY);
      if (!raw) return getDefaultSswMasterState();
      return normalizeStateShape(JSON.parse(raw));
    }
    if (inMemorySswStore) {
      return normalizeStateShape(JSON.parse(inMemorySswStore));
    }
  } catch {
    // fallback default
  }
  return getDefaultSswMasterState();
}

function dispatchSswWindowEvent(name: string, detail: unknown): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    // ignore
  }
}

export function saveSswMasterState(state: SswMasterState): SswMasterState {
  const next = normalizeStateShape({
    ...state,
    lastUpdated: Date.now(),
  });
  const serialized = JSON.stringify(next);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SSW_MASTER_STORAGE_KEY, serialized);
    } else {
      inMemorySswStore = serialized;
    }
  } catch {
    inMemorySswStore = serialized;
  }
  dispatchSswWindowEvent(SSW_STATE_UPDATED_EVENT, next);
  return next;
}

export function getSswLessonStepCursor(): SswLessonStepCursor {
  const state = loadSswMasterState();
  return (
    state.lessonStepCursor || {
      page: state.lastFocusPage || 1,
      stepIndex: 1,
      completedStepsByPage: {},
    }
  );
}

export function updateSswLessonStepCursor(params: {
  page: number;
  stepIndex?: number;
  markStepCompleted?: number;
  markPageRead?: boolean;
}): SswMasterState {
  const current = loadSswMasterState();
  const totalPages = SSW_MASTER_KB.meta.totalPdfPages || 91;
  const targetPage = Math.max(1, Math.min(totalPages, Math.round(params.page || current.lastFocusPage || 1)));
  const prevCursor = current.lessonStepCursor || {
    page: current.lastFocusPage || 1,
    stepIndex: 1,
    completedStepsByPage: {},
  };
  const nextCompletedByPage: Record<string, number[]> = { ...prevCursor.completedStepsByPage };
  if (typeof params.markStepCompleted === 'number' && Number.isInteger(params.markStepCompleted) && params.markStepCompleted >= 1) {
    const key = String(targetPage);
    nextCompletedByPage[key] = Array.from(
      new Set([...(nextCompletedByPage[key] || []), params.markStepCompleted])
    ).sort((a, b) => a - b);
  }
  const nextStepIndex =
    typeof params.stepIndex === 'number' && Number.isInteger(params.stepIndex) && params.stepIndex >= 1
      ? params.stepIndex
      : prevCursor.page === targetPage
        ? prevCursor.stepIndex
        : 1;
  const nextPagesRead = params.markPageRead
    ? Array.from(new Set([...current.pdfPagesRead, targetPage])).sort((a, b) => a - b)
    : current.pdfPagesRead;

  const saved = saveSswMasterState({
    ...current,
    pdfPagesRead: nextPagesRead,
    lastFocusPage: targetPage,
    lessonStepCursor: {
      page: targetPage,
      stepIndex: nextStepIndex,
      completedStepsByPage: nextCompletedByPage,
    },
  });
  dispatchSswWindowEvent(SSW_FOCUS_PAGE_EVENT, { page: targetPage });
  dispatchSswWindowEvent(SSW_FOCUS_STEP_EVENT, {
    page: targetPage,
    stepIndex: nextStepIndex,
    completedSteps: nextCompletedByPage[String(targetPage)] || [],
  });
  return saved;
}

export function resetSswMasterState(): SswMasterState {
  inMemorySswStore = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SSW_MASTER_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  const def = getDefaultSswMasterState();
  dispatchSswWindowEvent(SSW_STATE_UPDATED_EVENT, def);
  return def;
}

function syncSswEventToBraincore(params: {
  competencyId: string;
  ok: boolean;
  userExactText: string;
  misconceptionId?: string | null;
}): void {
  try {
    const bState = loadBraincoreState();
    const existing =
      bState.competencies[params.competencyId] ||
      createBlankCompetency(params.competencyId, BRAINCORE_PARAMS.P_INIT);
    const nextP = bktUpdate(
      existing.pMasteryDecayed ?? existing.pMastery,
      params.ok,
      0,
      0.88
    );
    const updated = {
      ...existing,
      pMastery: nextP,
      pMasteryDecayed: nextP,
      exposures: existing.exposures + 1,
      attempts: existing.attempts + 1,
      correct: existing.correct + (params.ok ? 1 : 0),
      streak: params.ok ? existing.streak + 1 : 0,
      lastAt: Date.now(),
    };
    updated.state = deriveMasteryState(updated);
    saveBraincoreState({
      ...bState,
      competencies: {
        ...bState.competencies,
        [params.competencyId]: updated,
      },
    });
    bridgeAttemptToHostPwa({
      type: 'ssw_sensei_attempt',
      competencyId: params.competencyId,
      targetLang: 'ja',
      ok: params.ok,
      userExactTranscript: sanitizeSswText(params.userExactText),
      misconceptionId: params.misconceptionId || null,
      timestamp: Date.now(),
    });
  } catch {
    // non-fatal in headless test environments
  }
}

export function getSswProgressReport() {
  const state = loadSswMasterState();
  const stages = SSW_MASTER_KB.roadmapStages;
  const completedSet = new Set(state.completedStageIds);
  const isZeroProgress =
    state.completedStageIds.length === 0 &&
    state.pdfPagesRead.length === 0 &&
    state.kotobaMasteredIds.length === 0 &&
    state.quizHistory.length === 0;

  let recommendedStage: SswRoadmapStage = stages[0];
  if (!isZeroProgress) {
    const activeStageObj = stages.find((s) => s.id === state.activeStageId);
    if (activeStageObj && !completedSet.has(activeStageObj.id)) {
      recommendedStage = activeStageObj;
    } else {
      recommendedStage = stages.find((s) => !completedSet.has(s.id)) || stages[stages.length - 1];
    }
  }

  const totalQuiz = state.quizHistory.length;
  const correctQuiz = state.quizHistory.filter((q) => q.ok).length;
  const quizAccuracyPct = totalQuiz > 0 ? Math.round((correctQuiz / totalQuiz) * 100) : 0;

  const allStagesStatus = stages.map((st) => ({
    stage: st.stage,
    id: st.id,
    title: sanitizeSswText(st.title),
    pdfPages: sanitizeSswText(st.pdfPages),
    otaffRef: sanitizeSswText(st.otaffRef),
    goal: sanitizeSswText(st.goal),
    status: completedSet.has(st.id)
      ? ('completed' as const)
      : state.activeStageId === st.id
        ? ('in_progress' as const)
        : ('pending' as const),
  }));

  return {
    state,
    isZeroProgress,
    passingThresholdPct: SSW_PASS_SCORE_PCT,
    readinessScorePct: state.readinessScorePct,
    passedExamBenchmark: state.readinessScorePct >= SSW_PASS_SCORE_PCT,
    totalPdfPages: SSW_MASTER_KB.meta.totalPdfPages || 91,
    pagesReadCount: state.pdfPagesRead.length,
    totalKotoba: SSW_MASTER_KB.meta.totalKotoba || 266,
    kotobaMasteredCount: state.kotobaMasteredIds.length,
    totalQuizAttempted: totalQuiz,
    totalQuizCorrect: correctQuiz,
    quizAccuracyPct,
    weakTopics: state.weakTopics,
    recommendedStage: {
      stage: recommendedStage.stage,
      id: recommendedStage.id,
      title: sanitizeSswText(recommendedStage.title),
      pdfPages: sanitizeSswText(recommendedStage.pdfPages),
      otaffRef: sanitizeSswText(recommendedStage.otaffRef),
      goal: sanitizeSswText(recommendedStage.goal),
      whyFirst: sanitizeSswText(recommendedStage.whyFirst || ''),
      recommendedDailyPattern: sanitizeSswText(recommendedStage.recommendedDailyPattern || ''),
    },
    allStagesStatus,
    summaryId: isZeroProgress
      ? `Progres SSW masih 0% (Pemula Nol). Mulai wajib dari Tahap 1: ${sanitizeSswText(recommendedStage.title)} (${recommendedStage.pdfPages}) sebelum menghafal bab tebal.`
      : `Kesiapan SSW saat ini ${state.readinessScorePct}% (target lulus ${SSW_PASS_SCORE_PCT}%). Tahap aktif: Tahap ${recommendedStage.stage} (${recommendedStage.pdfPages}). PDF terbaca ${state.pdfPagesRead.length}/91 hal, Kotoba ${state.kotobaMasteredIds.length}/266, Soal CBT ${correctQuiz}/${totalQuiz}.`,
  };
}

function resolveStageIdInput(rawStage?: string): SswRoadmapStage | null {
  if (!rawStage) return null;
  const clean = String(rawStage).trim().toLowerCase();
  const byId = SSW_MASTER_KB.roadmapStages.find((s) => s.id.toLowerCase() === clean);
  if (byId) return byId;
  const numMatch = clean.match(/(?:stage|tahap|step)?\s*(\d+)/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    const byNum = SSW_MASTER_KB.roadmapStages.find((s) => s.stage === n);
    if (byNum) return byNum;
  }
  return (
    SSW_MASTER_KB.roadmapStages.find((s) => s.title.toLowerCase().includes(clean)) || null
  );
}

export function updateSswStudyProgress(params: {
  stageId?: string;
  status?: 'in_progress' | 'completed';
  pdfPagesRead?: number[];
  kotobaIdsMastered?: string[];
  focusPage?: number;
  learnerLevel?: SswLearnerLevel;
}) {
  const current = loadSswMasterState();
  const nextCompleted = new Set(current.completedStageIds);
  let nextActiveStageId = current.activeStageId;
  const totalPages = SSW_MASTER_KB.meta.totalPdfPages || 91;

  const matchedStage = resolveStageIdInput(params.stageId);
  if (matchedStage) {
    if (params.status === 'completed') {
      nextCompleted.add(matchedStage.id);
      const nextStageObj =
        SSW_MASTER_KB.roadmapStages.find((s) => s.stage === matchedStage.stage + 1) || matchedStage;
      nextActiveStageId = nextStageObj.id;
    } else {
      nextActiveStageId = matchedStage.id;
    }
  }

  const nextPagesSet = new Set(current.pdfPagesRead);
  if (Array.isArray(params.pdfPagesRead)) {
    for (const p of params.pdfPagesRead) {
      const pn = Number(p);
      if (Number.isInteger(pn) && pn >= 1 && pn <= totalPages) {
        nextPagesSet.add(pn);
      }
    }
  }
  if (
    typeof params.focusPage === 'number' &&
    Number.isInteger(params.focusPage) &&
    params.focusPage >= 1 &&
    params.focusPage <= totalPages
  ) {
    nextPagesSet.add(params.focusPage);
  }

  const validKotobaSet = new Set(SSW_MASTER_KB.kotoba.map((k) => k.id));
  const nextKotobaSet = new Set(current.kotobaMasteredIds);
  if (Array.isArray(params.kotobaIdsMastered)) {
    for (const id of params.kotobaIdsMastered) {
      const sid = String(id).trim();
      if (sid && (validKotobaSet.size === 0 || validKotobaSet.has(sid))) {
        nextKotobaSet.add(sid);
      }
    }
  }

  const saved = saveSswMasterState({
    ...current,
    learnerLevel: params.learnerLevel || current.learnerLevel,
    activeStageId: nextActiveStageId,
    completedStageIds: Array.from(nextCompleted),
    pdfPagesRead: Array.from(nextPagesSet).sort((a, b) => a - b),
    kotobaMasteredIds: Array.from(nextKotobaSet),
    lastFocusPage:
      typeof params.focusPage === 'number' &&
      params.focusPage >= 1 &&
      params.focusPage <= totalPages
        ? params.focusPage
        : current.lastFocusPage,
  });

  if (matchedStage || (params.pdfPagesRead && params.pdfPagesRead.length > 0)) {
    syncSswEventToBraincore({
      competencyId: `ssw_${matchedStage?.id || saved.activeStageId}`,
      ok: true,
      userExactText: `study_progress:${matchedStage?.id || saved.activeStageId}:${params.status || 'in_progress'}`,
    });
  }

  if (saved.lastFocusPage) {
    dispatchSswWindowEvent(SSW_FOCUS_PAGE_EVENT, { page: saved.lastFocusPage });
  }

  return {
    updated: true,
    readinessScorePct: saved.readinessScorePct,
    passingThresholdPct: SSW_PASS_SCORE_PCT,
    activeStageId: saved.activeStageId,
    completedStageIds: saved.completedStageIds,
    pagesReadCount: saved.pdfPagesRead.length,
    kotobaMasteredCount: saved.kotobaMasteredIds.length,
    state: saved,
  };
}

function expandSearchSynonyms(rawQuery: string): string[] {
  const q = String(rawQuery || '').toLowerCase().trim();
  if (!q) return [];
  const terms = new Set(
    q
      .split(/[\s,./;:()!?]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2)
  );
  const synonymGroups: Array<[RegExp, string[]]> = [
    [/klorin|natrium|hipoklorit|pemutih|jiaensosan|kishaku/, ['klorin', '次亜塩素酸', 'ppm', 'kishaku', 'pengenceran', 'C1']],
    [/walnut|kenari|kurumi/, ['くるみ', 'kurumi', 'kenari', 'walnut', 'alergen']],
    [/cashew|mede|coklat dubai/, ['カシューナッツ', 'cashew', 'mede', 'kacang mede', 'alergen', 'ver 5.1']],
    [/pistachio|coklat dubai/, ['ピスタチオ', 'pistachio', '20 anjuran']],
    [/nguyen|vol\s*1|vol\s*2|sisi ikan|84|pembulatan/, ['nguyen', '84', 'pembulatan', 'ke atas', 'oven', 'ikan']],
    [/tiptap|simulasi cbt/, ['tiptap', 'tiptapjp', 'prometric', 'simulasi']],
    [/alergen|alergi|harus label|wajib label/, ['alergen', 'アレルゲン', '特定原材料', '9 bahan', '20']],
    [/yukkuri|pelan|beku pelan|cair pelan/, ['yukkuri', 'ゆっくり', 'reitou', 'pencairan', 'pembekuan', 'hal 27']],
    [/shoumi|shouhi|kadaluarsa|kigen|tanggal/, ['賞味期限', '消費期限', 'shoumi', 'shouhi', 'reiwa']],
    [/norovirus|muntah|tiram|alkohol/, ['ノロウイルス', 'norovirus', '85', '1.000 ppm', '1000']],
    [/anisakis|parasit|cacing|saba/, ['アニサキス', 'anisakis', '-20', 'ikan']],
    [/endospora|spora|cereus|welch|botulinum/, ['endospora', '芽胞', 'セレウス', 'ウェルシュ', 'ボツリヌス', '120']],
    [/budomari|rendemen|loss/, ['budomari', '歩留', 'rendemen', 'loss']],
    [/seiton|seiri|5s|5r|oki basho/, ['整頓', 'seiton', 'oki basho', '5s']],
    [/hokang|sampuru|kuremu|komplain/, ['保管サンプル', 'hokang', 'sampuru', 'kuremu', 'クレーム']],
    [/heinrich|hiyari|nyaris|300|29/, ['ハインリッヒ', 'heinrich', 'ヒヤリハット', 'hiyari']],
    [/detektor|logam|x-?ray|test piece/, ['金属探知機', 'x線', 'test piece', 'detektor']],
    [/kaifuu|buka kemasan|pinhole/, ['開封', 'kaifuu', '切り端', 'pinhole']],
    [/dekoder|pemula|partikel|ujung kalimat|tadashi|machigatte/, ['dekoder', 'partikel', '正しい', '間違って', 'unit 0']],
  ];
  for (const [rx, adds] of synonymGroups) {
    if (rx.test(q)) {
      for (const a of adds) terms.add(a.toLowerCase());
    }
  }
  return Array.from(terms);
}

export function lookupSswMaterialAndPage(params: {
  query?: string;
  pageNumber?: number;
  category?: string;
  stageId?: string;
}) {
  const query = sanitizeSswText(params.query || '');
  const totalPages = SSW_MASTER_KB.meta.totalPdfPages || 91;
  let targetPage =
    typeof params.pageNumber === 'number' && Number.isFinite(params.pageNumber)
      ? Math.round(params.pageNumber)
      : undefined;

  if (!targetPage && query) {
    const pageMatch = query.match(/\b(?:hal(?:aman)?|page|p\.?)\s*[:#]?\s*(\d{1,2})\b/i);
    if (pageMatch) {
      const n = parseInt(pageMatch[1], 10);
      if (n >= 1 && n <= totalPages) {
        targetPage = n;
      }
    }
  }

  if (targetPage && targetPage >= 1 && targetPage <= totalPages) {
    const pageObj = SSW_MASTER_KB.pages.find((p) => p.page === targetPage) || null;
    const pageKotoba = SSW_MASTER_KB.kotoba.filter((k) => k.pdfPage === targetPage);
    const pageTraps = SSW_MASTER_KB.wakaiPapaTrapsAndSecrets.filter((t) => t.pdfPage === targetPage);
    const pageMath = SSW_MASTER_KB.mathFormulas.filter((m) => m.pdfPage === targetPage);
    const pageGolden = SSW_MASTER_KB.goldenNumbers.filter((g) => g.pdfPage === targetPage);
    const videosOnPage = SSW_MASTER_KB.wakaiPapaVideos
      .filter((v) => v.pdfPagesSuggested.includes(targetPage))
      .slice(0, 6);
    const transcriptQuotesOnPage = (SSW_MASTER_KB.wakaiPapaTranscriptChunks || [])
      .filter((ch) => ch.pdfPagesSuggested.includes(targetPage))
      .sort((a, b) => (a.isWakaiPapa === b.isWakaiPapa ? a.chunkIndex - b.chunkIndex : a.isWakaiPapa ? -1 : 1))
      .slice(0, 4);
    const pageQuizzes = SSW_MASTER_KB.quizzes
      .filter((qz) => qz.tryoutPdfPage === targetPage || qz.discussionPdfPage === targetPage)
      .slice(0, 5)
      .map((qz) => ({
        id: qz.id,
        n: qz.n,
        tag: sanitizeSswText(qz.tag),
        questionJp: sanitizeSswText(qz.questionJp),
        questionId: sanitizeSswText(qz.questionId),
      }));

    dispatchSswWindowEvent(SSW_FOCUS_PAGE_EVENT, { page: targetPage });

    return {
      mode: 'exact_page' as const,
      hydrated: _isFullKbHydrated,
      pageNumber: targetPage,
      page: pageObj
        ? {
            page: pageObj.page,
            unit: sanitizeSswText(pageObj.unit),
            title: sanitizeSswText(pageObj.title),
            otaffRef: sanitizeSswText(pageObj.otaffRef),
            focusCompass: sanitizeSswText(pageObj.focusCompass),
            summary: sanitizeSswText(pageObj.summary),
          }
        : null,
      kotobaOnPage: pageKotoba.map((k) => ({
        id: k.id,
        jp: k.jp,
        rubyMarkup: k.rubyMarkup,
        reading: k.reading,
        romaji: k.romaji,
        meaningId: sanitizeSswText(k.meaningId),
        category: sanitizeSswText(k.category),
        pdfPage: k.pdfPage,
      })),
      trapsOnPage: pageTraps.map((t) => ({
        ...t,
        title: sanitizeSswText(t.title),
        detail: sanitizeSswText(t.detail),
      })),
      mathOnPage: pageMath.map((m) => ({
        ...m,
        name: sanitizeSswText(m.name),
        formula: sanitizeSswText(m.formula),
        rule: sanitizeSswText(m.rule),
      })),
      goldenNumbersOnPage: pageGolden.map((g) => ({
        ...g,
        label: sanitizeSswText(g.label),
        value: sanitizeSswText(g.value),
      })),
      videosOnPage,
      transcriptQuotesOnPage,
      relatedQuizzes: pageQuizzes,
    };
  }

  const terms = expandSearchSynonyms(query);
  const categoryLower = String(params.category || '').toLowerCase().trim();
  const stageObj = resolveStageIdInput(params.stageId);

  const scoreText = (haystack: string): number => {
    const lower = haystack.toLowerCase();
    let score = 0;
    if (query && lower.includes(query.toLowerCase())) score += 8;
    for (const t of terms) {
      if (lower.includes(t)) score += t.length >= 4 ? 3 : 1;
    }
    return score;
  };

  const matchedPages = SSW_MASTER_KB.pages
    .map((p) => {
      const hay = `${p.unit} ${p.title} ${p.otaffRef} ${p.focusCompass} ${p.summary}`;
      let s = scoreText(hay);
      if (categoryLower && hay.toLowerCase().includes(categoryLower)) s += 4;
      if (stageObj) {
        const range = stageObj.pdfPages.match(/(\d+)\s*-\s*(\d+)/);
        if (range) {
          const minP = parseInt(range[1], 10);
          const maxP = parseInt(range[2], 10);
          if (p.page >= minP && p.page <= maxP) s += 3;
        }
      }
      return { p, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.p.page - b.p.page)
    .slice(0, 5)
    .map(({ p }) => ({
      page: p.page,
      unit: sanitizeSswText(p.unit),
      title: sanitizeSswText(p.title),
      otaffRef: sanitizeSswText(p.otaffRef),
      focusCompass: sanitizeSswText(p.focusCompass),
      excerpt: sanitizeSswText(p.summary.slice(0, 520)),
    }));

  const matchedKotoba = SSW_MASTER_KB.kotoba
    .map((k) => {
      const hay = `${k.jp} ${k.reading} ${k.romaji} ${k.meaningId} ${k.category}`;
      let s = scoreText(hay);
      if (categoryLower && k.category.toLowerCase().includes(categoryLower)) s += 3;
      return { k, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.k.pdfPage - b.k.pdfPage)
    .slice(0, 8)
    .map(({ k }) => ({
      id: k.id,
      jp: k.jp,
      rubyMarkup: k.rubyMarkup,
      reading: k.reading,
      romaji: k.romaji,
      meaningId: sanitizeSswText(k.meaningId),
      category: sanitizeSswText(k.category),
      pdfPage: k.pdfPage,
    }));

  const matchedTraps = SSW_MASTER_KB.wakaiPapaTrapsAndSecrets.filter(
    (t) => scoreText(`${t.id} ${t.title} ${t.detail}`) > 0
  );
  const matchedMath = SSW_MASTER_KB.mathFormulas.filter(
    (m) => scoreText(`${m.id} ${m.name} ${m.formula} ${m.rule}`) > 0
  );
  const matchedGolden = SSW_MASTER_KB.goldenNumbers.filter(
    (g) => scoreText(`${g.label} ${g.value}`) > 0
  );
  const scoredChunks = (SSW_MASTER_KB.wakaiPapaTranscriptChunks || [])
    .map((ch) => {
      const hay = `${ch.channel} ${ch.title} ${ch.topicCategory} ${ch.text}`;
      let s = scoreText(hay);
      if (s > 0 && ch.isWakaiPapa) s += 2;
      if (categoryLower && ch.topicCategory.toLowerCase().includes(categoryLower)) s += 3;
      return { ch, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (a.ch.isWakaiPapa === b.ch.isWakaiPapa ? a.ch.chunkIndex - b.ch.chunkIndex : a.ch.isWakaiPapa ? -1 : 1));

  const perVideoChunkCount = new Map<string, number>();
  const matchedTranscriptQuotes: SswTranscriptChunk[] = [];
  for (const { ch } of scoredChunks) {
    const cnt = perVideoChunkCount.get(ch.videoId) || 0;
    if (cnt >= 2) continue;
    perVideoChunkCount.set(ch.videoId, cnt + 1);
    matchedTranscriptQuotes.push(ch);
    if (matchedTranscriptQuotes.length >= 6) break;
  }

  const chunkBoostByVideo = new Map<string, SswTranscriptChunk>();
  for (const ch of matchedTranscriptQuotes) {
    if (!chunkBoostByVideo.has(ch.videoId)) chunkBoostByVideo.set(ch.videoId, ch);
  }

  const matchedVideos = SSW_MASTER_KB.wakaiPapaVideos
    .map((v) => {
      const hay = `${v.channel} ${v.title} ${v.topicCategory} ${v.keyPoints.join(' ')} ${v.excerpt}`;
      const matchedQuote = chunkBoostByVideo.get(v.videoId);
      const baseScore = scoreText(hay);
      const quoteBonus = matchedQuote ? scoreText(matchedQuote.text) + (v.isWakaiPapa ? 2 : 0) : 0;
      const totalScore = baseScore + quoteBonus;
      const enhancedVideo: SswVideoChunk = matchedQuote
        ? {
            ...v,
            excerpt: matchedQuote.text.slice(0, 420),
          }
        : v;
      return { v: enhancedVideo, s: totalScore };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map(({ v }) => v);

  const primaryPage =
    matchedPages[0]?.page ||
    matchedTraps[0]?.pdfPage ||
    matchedMath[0]?.pdfPage ||
    matchedKotoba[0]?.pdfPage ||
    matchedTranscriptQuotes[0]?.pdfPagesSuggested[0] ||
    matchedVideos[0]?.pdfPagesSuggested[0];
  if (primaryPage) {
    dispatchSswWindowEvent(SSW_FOCUS_PAGE_EVENT, { page: primaryPage });
  }

  return {
    mode: 'search' as const,
    hydrated: _isFullKbHydrated,
    query,
    totalMatches:
      matchedPages.length +
      matchedKotoba.length +
      matchedTraps.length +
      matchedMath.length +
      matchedGolden.length +
      matchedVideos.length +
      matchedTranscriptQuotes.length,
    matchedPages,
    matchedKotoba,
    matchedTraps,
    matchedMath,
    matchedGolden,
    matchedVideos,
    matchedTranscriptQuotes,
  };
}

/**
 * Async full-knowledge lookup for Gemini Live tools & interactive search.
 * Ensures the 91-page PDF, 266 kotoba, 58+ quizzes, and 86 YouTube transcripts are loaded,
 * optionally consulting FastAPI backend `/api/ssw/search` for extra video transcript hits.
 */
export async function lookupSswMaterialAndPageAsync(params: {
  query?: string;
  pageNumber?: number;
  category?: string;
  stageId?: string;
}) {
  await ensureSswFullKnowledgeLoaded();
  const local = lookupSswMaterialAndPage(params);

  // If video corpus has not populated local cache yet and user ran a search query, probe backend `/api/ssw/search`
  if (
    local.mode === 'search' &&
    params.query &&
    SSW_MASTER_KB.wakaiPapaVideos.length === 0 &&
    typeof window !== 'undefined'
  ) {
    const apiBase = getCurriculumApiBaseUrl();
    const remote = await fetchJsonWithTimeout(
      `${apiBase}/api/ssw/search?q=${encodeURIComponent(params.query)}`,
      1500
    );
    if (remote && typeof remote === 'object') {
      const rVideos = normalizeVideoList(
        (remote as { matchedVideos?: unknown[]; videos?: unknown[]; results?: unknown[] }).matchedVideos ||
          (remote as { videos?: unknown[] }).videos ||
          (remote as { results?: unknown[] }).results
      );
      if (rVideos.length > 0) {
        return {
          ...local,
          matchedVideos: rVideos.slice(0, 5),
          totalMatches: local.totalMatches + rVideos.slice(0, 5).length,
        };
      }
    }
  }

  return local;
}

export const searchSswKnowledgeAsync = lookupSswMaterialAndPageAsync;

function toDrawnPayload(quiz: SswQuizItem, mode: string, isKotobaDrill = false): SswDrawnQuestionPayload {
  const letters = ['A', 'B', 'C', 'D'];
  return {
    quizId: quiz.id,
    n: quiz.n,
    mode,
    tag: sanitizeSswText(quiz.tag),
    tryoutPdfPage: quiz.tryoutPdfPage,
    discussionPdfPage: quiz.discussionPdfPage,
    questionJp: sanitizeSswText(quiz.questionJp),
    questionRuby: sanitizeSswText(quiz.questionRuby || quiz.questionJp),
    questionReading: sanitizeSswText(quiz.questionReading || ''),
    questionId: sanitizeSswText(quiz.questionId),
    options: quiz.optionsJp.map((jp, idx) => ({
      letter: letters[idx] || String(idx + 1),
      index: idx,
      jp: sanitizeSswText(jp),
      ruby: sanitizeSswText((quiz.optionsRuby && quiz.optionsRuby[idx]) || jp),
      reading: sanitizeSswText((quiz.optionsReading && quiz.optionsReading[idx]) || ''),
      id: cleanPregradeOptionId(quiz.optionsId[idx] || ''),
    })),
    isKotobaDrill,
  };
}

export function getSswQuizById(quizId: string): SswQuizItem | null {
  return (
    SSW_MASTER_KB.quizzes.find((q) => q.id === quizId) ||
    ephemeralKotobaQuizBank.get(quizId) ||
    null
  );
}

export function drawSswQuizQuestion(params?: {
  mode?: 'cbt' | 'math' | 'trap' | 'kotoba_drill' | 'mixed';
  topicTag?: string;
  preferWeakOrUnseen?: boolean;
  quizId?: string;
}): SswDrawnQuestionPayload {
  const state = loadSswMasterState();
  const mode = params?.mode || 'mixed';
  const preferWeak = params?.preferWeakOrUnseen !== false;

  if (params?.quizId) {
    const exact = getSswQuizById(params.quizId);
    if (exact) {
      saveSswMasterState({ ...state, activeQuizId: exact.id, lastFocusPage: exact.tryoutPdfPage });
      return toDrawnPayload(exact, mode, exact.id.startsWith('kotoba_drill_'));
    }
  }

  if (mode === 'kotoba_drill' && SSW_MASTER_KB.kotoba.length >= 3) {
    const masteredSet = new Set(state.kotobaMasteredIds);
    const topicLower = String(params?.topicTag || '').toLowerCase();
    let pool = SSW_MASTER_KB.kotoba.filter(
      (k) =>
        !topicLower ||
        k.category.toLowerCase().includes(topicLower) ||
        k.meaningId.toLowerCase().includes(topicLower)
    );
    if (pool.length < 3) pool = SSW_MASTER_KB.kotoba;
    const unmastered = pool.filter((k) => !masteredSet.has(k.id));
    const target = (unmastered.length > 0 ? unmastered : pool)[
      Math.floor(Math.random() * Math.max(1, unmastered.length > 0 ? unmastered.length : pool.length))
    ];
    const distractors = SSW_MASTER_KB.kotoba
      .filter((k) => k.id !== target.id && k.meaningId !== target.meaningId)
      .sort((a, b) => (a.category === target.category ? -1 : 1) - (b.category === target.category ? -1 : 1))
      .slice(0, 2);
    const allChoices = [target, ...distractors].sort((a, b) => a.id.localeCompare(b.id));
    const correctIndex = Math.max(0, allChoices.findIndex((c) => c.id === target.id));
    const drillId = `kotoba_drill_${target.id}`;
    const syntheticQuiz: SswQuizItem = {
      id: drillId,
      n: target.pdfPage,
      tag: `Kotoba Drill (${sanitizeSswText(target.category)})`,
      tryoutPdfPage: target.pdfPage,
      discussionPdfPage: target.pdfPage,
      questionRuby: target.rubyMarkup,
      questionJp: target.jp,
      questionReading: target.reading,
      questionId: `Apa arti istilah pabrik SSW "${target.jp}" (${target.romaji}) dari halaman ${target.pdfPage}?`,
      optionsJp: allChoices.map((c) => c.meaningId),
      optionsRuby: allChoices.map((c) => c.meaningId),
      optionsReading: allChoices.map((c) => c.romaji),
      optionsId: allChoices.map((c) => sanitizeSswText(c.meaningId)),
      correctLetter: ['A', 'B', 'C'][correctIndex] || 'A',
      correctIndex,
      explanationId: `${target.jp} (${target.reading} / ${target.romaji}) berarti "${sanitizeSswText(target.meaningId)}". Referensi Unit 6 Bank Kotoba Hal. ${target.pdfPage}.`,
    };
    ephemeralKotobaQuizBank.set(drillId, syntheticQuiz);
    saveSswMasterState({ ...state, activeQuizId: drillId, lastFocusPage: target.pdfPage });
    return toDrawnPayload(syntheticQuiz, 'kotoba_drill', true);
  }

  let candidates = [...SSW_MASTER_KB.quizzes];
  if (candidates.length === 0) {
    // Graceful placeholder before async hydration completes
    return {
      quizId: 'loading_kb',
      n: 0,
      mode,
      tag: 'Memuat Bank Soal OTAFF Ver 5.1...',
      tryoutPdfPage: 1,
      discussionPdfPage: 1,
      questionJp: '問題データを読み込んでいます...',
      questionRuby: '問題データを読み込んでいます...',
      questionReading: 'mondai deeta o yomikonde imasu...',
      questionId: 'Sedang mengambil 58+ bank soal & 266 kotoba dari modul SSW...',
      options: [],
      loading: true,
    };
  }

  if (mode === 'math') {
    candidates = candidates.filter(
      (q) =>
        q.id.includes('math') ||
        /hitungan|kishaku|budomari|nibunretsu|freezer|lini|klorin|roti|oven|fillet/i.test(q.tag)
    );
  } else if (mode === 'trap') {
    candidates = candidates.filter(
      (q) =>
        q.id.includes('trap') ||
        /jebakan|wakai papa|hokang|yukkuri|spaghetti|alergen 2026/i.test(q.tag)
    );
  } else if (mode === 'cbt') {
    candidates = candidates.filter((q) => q.id.startsWith('cbt_'));
  }

  if (params?.topicTag) {
    const tagLower = params.topicTag.toLowerCase();
    const byTag = candidates.filter(
      (q) =>
        q.tag.toLowerCase().includes(tagLower) ||
        q.questionId.toLowerCase().includes(tagLower) ||
        q.questionJp.toLowerCase().includes(tagLower)
    );
    if (byTag.length > 0) candidates = byTag;
  }

  if (candidates.length === 0) {
    candidates = [...SSW_MASTER_KB.quizzes];
  }

  if (preferWeak) {
    const passedSet = new Set(state.quizHistory.filter((h) => h.ok).map((h) => h.quizId));
    const unseen = candidates.filter((q) => !passedSet.has(q.id));
    const pool = unseen.length > 0 ? unseen : candidates;
    const weakMatches = pool.filter((q) =>
      state.weakTopics.some((w) => q.tag.toLowerCase().includes(w.toLowerCase()))
    );
    if (weakMatches.length > 0) {
      candidates = weakMatches;
    } else {
      candidates = pool;
    }
  }

  const avoidActive = candidates.filter((q) => q.id !== state.activeQuizId);
  const finalPool = avoidActive.length > 0 ? avoidActive : candidates;
  const chosen = finalPool[0];

  saveSswMasterState({
    ...state,
    activeQuizId: chosen.id,
    lastFocusPage: chosen.tryoutPdfPage,
  });

  return toDrawnPayload(chosen, mode, false);
}

export async function drawSswQuizQuestionAsync(params?: {
  mode?: 'cbt' | 'math' | 'trap' | 'kotoba_drill' | 'mixed';
  topicTag?: string;
  preferWeakOrUnseen?: boolean;
  quizId?: string;
}): Promise<SswDrawnQuestionPayload> {
  await ensureSswFullKnowledgeLoaded();
  return drawSswQuizQuestion(params);
}

function resolveUserAnswerOptionIndex(quiz: SswQuizItem, userAnswer: string): number {
  const raw = String(userAnswer || '').trim();
  if (!raw) return -1;
  const upper = raw.toUpperCase();
  const letters = ['A', 'B', 'C', 'D'];

  const standaloneLetter = upper.match(/^(?:OPSI|JAWABAN|PILIH(?:AN)?|HURUF)?\s*([ABCD])[.)\s]*$/);
  if (standaloneLetter) {
    const idx = letters.indexOf(standaloneLetter[1]);
    if (idx >= 0 && idx < quiz.optionsJp.length) return idx;
  }

  const phraseLetter = upper.match(/\b(?:OPSI|JAWABAN|PILIH|YANG)\s+([ABCD])\b/);
  if (phraseLetter) {
    const idx = letters.indexOf(phraseLetter[1]);
    if (idx >= 0 && idx < quiz.optionsJp.length) return idx;
  }

  const normalizedInput = raw.toLowerCase().replace(/[.,]+/g, '').trim();
  let bestMatchIdx = -1;
  let bestScore = 0;

  for (let i = 0; i < quiz.optionsJp.length; i++) {
    const optJp = String(quiz.optionsJp[i] || '').toLowerCase();
    const optId = String(quiz.optionsId[i] || '').toLowerCase();
    const combined = `${optJp} ${optId}`;
    const combinedNoComma = combined.replace(/,/g, '');

    if (
      normalizedInput === optJp.replace(/[.,]+/g, '').trim() ||
      normalizedInput === optId.replace(/[.,]+/g, '').trim()
    ) {
      return i;
    }

    const inputNums = raw.match(/\d[\d.,]*/g) || [];
    if (inputNums.length > 0) {
      const optNums: string[] = combinedNoComma.match(/\d+/g) || [];
      let numHits = 0;
      for (const n of inputNums) {
        const cleanN = n.replace(/[.,]/g, '');
        if (optNums.includes(cleanN)) numHits++;
      }
      if (numHits > bestScore && numHits === inputNums.length) {
        bestScore = numHits;
        bestMatchIdx = i;
      }
    }
  }
  if (bestMatchIdx >= 0) return bestMatchIdx;

  if (normalizedInput.length >= 3) {
    for (let i = 0; i < quiz.optionsId.length; i++) {
      const optId = String(quiz.optionsId[i] || '').toLowerCase();
      const optJp = String(quiz.optionsJp[i] || '').toLowerCase();
      if (optId.includes(normalizedInput) || optJp.includes(normalizedInput)) {
        return i;
      }
    }
  }

  if (/^[1234]$/.test(raw)) {
    const idx = parseInt(raw, 10) - 1;
    if (idx >= 0 && idx < quiz.optionsJp.length) return idx;
  }
  if (/\b(?:pertama|ke\s*1|satu)\b/i.test(raw)) return 0;
  if (/\b(?:kedua|ke\s*2|dua)\b/i.test(raw)) return 1;
  if (/\b(?:ketiga|ke\s*3|tiga)\b/i.test(raw)) return 2;

  return -1;
}

export function gradeSswQuizAnswer(params: {
  quizId?: string;
  userAnswer: string;
}): SswGradeQuizResult {
  const state = loadSswMasterState();
  const targetId = params.quizId || state.activeQuizId || SSW_MASTER_KB.quizzes[0]?.id || 'cbt_01';
  const quiz = getSswQuizById(targetId);

  if (!quiz) {
    return {
      found: false,
      ok: false,
      quizId: targetId,
      tag: 'unknown',
      userAnswer: sanitizeSswText(params.userAnswer),
      selectedIndex: -1,
      selectedLetter: '?',
      correctIndex: 0,
      correctLetter: 'A',
      correctAnswerJp: '',
      correctAnswerId: '',
      explanationId: `Soal dengan ID ${targetId} tidak ditemukan di bank soal SSW.`,
      tryoutPdfPage: 1,
      discussionPdfPage: 1,
      readinessScorePct: state.readinessScorePct,
      passingThresholdPct: SSW_PASS_SCORE_PCT,
      passedExamBenchmark: state.readinessScorePct >= SSW_PASS_SCORE_PCT,
      totalAttempted: state.quizHistory.length,
      totalPassed: state.quizHistory.filter((h) => h.ok).length,
      state,
    };
  }

  const selectedIndex = resolveUserAnswerOptionIndex(quiz, params.userAnswer);
  const letters = ['A', 'B', 'C', 'D'];
  const selectedLetter = selectedIndex >= 0 ? letters[selectedIndex] || '?' : '?';
  const ok = selectedIndex === quiz.correctIndex;

  const historyItem: SswQuizHistoryItem = {
    quizId: quiz.id,
    tag: sanitizeSswText(quiz.tag),
    ok,
    userAnswer: sanitizeSswText(params.userAnswer),
    selectedIndex,
    correctLetter: quiz.correctLetter,
    correctIndex: quiz.correctIndex,
    tryoutPdfPage: quiz.tryoutPdfPage,
    discussionPdfPage: quiz.discussionPdfPage,
    timestamp: Date.now(),
  };

  const nextWeak = new Set(state.weakTopics);
  if (!ok) {
    nextWeak.add(sanitizeSswText(quiz.tag));
  } else {
    nextWeak.delete(sanitizeSswText(quiz.tag));
  }

  const nextKotoba = new Set(state.kotobaMasteredIds);
  if (ok && quiz.id.startsWith('kotoba_drill_')) {
    nextKotoba.add(quiz.id.replace('kotoba_drill_', ''));
  }

  const totalPages = SSW_MASTER_KB.meta.totalPdfPages || 91;
  const nextPages = new Set(state.pdfPagesRead);
  if (quiz.tryoutPdfPage >= 1 && quiz.tryoutPdfPage <= totalPages) {
    nextPages.add(quiz.tryoutPdfPage);
  }
  if (quiz.discussionPdfPage >= 1 && quiz.discussionPdfPage <= totalPages) {
    nextPages.add(quiz.discussionPdfPage);
  }

  const saved = saveSswMasterState({
    ...state,
    quizHistory: [...state.quizHistory, historyItem],
    weakTopics: Array.from(nextWeak),
    kotobaMasteredIds: Array.from(nextKotoba),
    pdfPagesRead: Array.from(nextPages).sort((a, b) => a - b),
    activeQuizId: quiz.id,
    lastFocusPage: quiz.discussionPdfPage || quiz.tryoutPdfPage,
  });

  syncSswEventToBraincore({
    competencyId: `ssw_quiz_${quiz.id}`,
    ok,
    userExactText: sanitizeSswText(params.userAnswer),
    misconceptionId: ok ? null : `ssw_misconception_${quiz.id}`,
  });

  const totalAttempted = saved.quizHistory.length;
  const totalPassed = saved.quizHistory.filter((h) => h.ok).length;
  const rationales = Array.isArray(quiz.optionRationalesId) ? quiz.optionRationalesId : [];
  const selectedRationaleId =
    selectedIndex >= 0 && rationales[selectedIndex] ? sanitizeSswText(rationales[selectedIndex]) : '';
  const correctRationaleId =
    quiz.correctIndex >= 0 && rationales[quiz.correctIndex]
      ? sanitizeSswText(rationales[quiz.correctIndex])
      : '';

  return {
    found: true,
    ok,
    quizId: quiz.id,
    tag: sanitizeSswText(quiz.tag),
    userAnswer: sanitizeSswText(params.userAnswer),
    selectedIndex,
    selectedLetter,
    selectedRationaleId,
    correctIndex: quiz.correctIndex,
    correctLetter: quiz.correctLetter,
    correctAnswerJp: sanitizeSswText(quiz.optionsJp[quiz.correctIndex] || ''),
    correctAnswerId: cleanPregradeOptionId(quiz.optionsId[quiz.correctIndex] || ''),
    correctRationaleId,
    explanationId: sanitizeSswText(quiz.explanationId),
    tryoutPdfPage: quiz.tryoutPdfPage,
    discussionPdfPage: quiz.discussionPdfPage,
    readinessScorePct: saved.readinessScorePct,
    passingThresholdPct: SSW_PASS_SCORE_PCT,
    passedExamBenchmark: saved.readinessScorePct >= SSW_PASS_SCORE_PCT,
    totalAttempted,
    totalPassed,
    state: saved,
  };
}

export async function gradeSswQuizAnswerAsync(params: {
  quizId?: string;
  userAnswer: string;
}): Promise<SswGradeQuizResult> {
  await ensureSswFullKnowledgeLoaded();
  return gradeSswQuizAnswer(params);
}

export function buildSswCompactGroundedDossier(learnerName = 'Pejuang SSW'): string {
  const report = getSswProgressReport();
  const stagesText = SSW_MASTER_KB.roadmapStages
    .map(
      (s) =>
        `  * Tahap ${s.stage} [${s.id}] (${s.pdfPages} | ${s.otaffRef}): ${sanitizeSswText(s.title)} -> ${sanitizeSswText(s.goal)}`
    )
    .join('\n');

  const goldenText = SSW_MASTER_KB.goldenNumbers
    .map((g) => `  * [Hal. ${g.pdfPage}] ${sanitizeSswText(g.label)}: ${sanitizeSswText(g.value)}`)
    .join('\n');

  const trapsText = SSW_MASTER_KB.wakaiPapaTrapsAndSecrets
    .map((t) => `  * [Hal. ${t.pdfPage}] ${sanitizeSswText(t.title)}`)
    .join('\n');

  const mathText = SSW_MASTER_KB.mathFormulas
    .map((m) => `  * [Hal. ${m.pdfPage}] ${sanitizeSswText(m.name)}: ${sanitizeSswText(m.formula)} | Aturan: ${sanitizeSswText(m.rule)}`)
    .join('\n');

  return sanitizeSswText(`
[SSW SENSEI GROUNDED KNOWLEDGE DOSSIER - ZERO HALLUCINATION CONTRACT]:
Murid: ${learnerName}
Status Live (${SSW_MASTER_STORAGE_KEY}):
- Kesiapan Ujian Saat Ini: ${report.readinessScorePct}% (Batas Lulus Prometric: >= ${SSW_PASS_SCORE_PCT}%, 40 soal / 70 menit, 30 teori + 10 praktik gambar & 2 soal kalkulator)
- Kondisi Progres: ${report.isZeroProgress ? 'PEMULA NOL (0% progres -> WAJIB rekomendasikan mulai Tahap 1 Unit 0 Hal. 1-6 terlebih dahulu!)' : `Tahap Aktif: Tahap ${report.recommendedStage.stage} (${report.recommendedStage.pdfPages})`}
- Selesai Tahap: [${report.state.completedStageIds.join(', ') || 'belum ada'}] | PDF Terbaca: ${report.pagesReadCount}/91 hal | Kotoba: ${report.kotobaMasteredCount}/266 | Kuis: ${report.totalQuizCorrect}/${report.totalQuizAttempted} (${report.quizAccuracyPct}%)
- Topik Rawan: ${report.weakTopics.join(', ') || 'belum tercatat'}

[8 TAHAPAN ROADMAP RESMI (Hal. 1-91)]:
${stagesText}

[UPDATE KRITIS OTAFF VER 5.1 APRIL 2026]:
- 9 Alergen Wajib Label (Tokutei Genzairyou, Hal. 10): 1. Ebi (Udang), 2. Kani (Kepiting), 3. Kurumi (Kenari/Walnut), 4. Komugi (Gandum), 5. Soba (Gandum Kuda), 6. Tamago (Telur), 7. Nyuu (Susu), 8. Rakkasei (Kacang Tanah), 9. Kashuunattsu (Kacang Mede / Cashew Nut - BARU Apr 2026!).
- 20 Alergen Anjuran Label (Junzurumono, Hal. 11): Pistachio baru masuk #20, Macadamia menggantikan Matsutake!
- Penekanan Ver 5.1 lainnya: Kapang & Mikotoksin (buang seluruhnya jika berjamur, Hal. 17), Virus & Parasit termasuk Norovirus (85-90C >= 90 dtk, klorin 1.000 ppm muntahan, 200 ppm meja, alkohol tak mempan) & Anisakis ikan laut (-20C >= 24 jam / >= 70C, Hal. 17), Pembukaan Kantong Kaifuu hitung potongan ujung agar serpihan tak masuk (Hal. 27), dan Kebocoran kemasan pinhole/more (Hal. 27 & 81).

[13 ANGKA EMAS CBT PROMETRIC]:
${goldenText}

[11 JEBAKAN & TRIK WAKAI PAPA + KREATOR]:
${trapsText}

[5 RUMUS HITUNGAN KALKULATOR CBT]:
${mathText}

[ATURAN WAJIB PEMANGGILAN TOOL SINKRON]:
- Sebelum menjawab pertanyaan tentang progres belajar murid, PASTI panggil \`get_ssw_progress\`.
- Sebelum memberi tahu halaman PDF, definisi kotak materi, alergen, klorin, suhu, rambu, transkrip Wakai Papa, atau kotoba, panggil \`lookup_ssw_material_and_page\` agar nomor halaman PDF (Hal. 1-91), transkrip video, dan istilah JP akurat 100%.
- Saat murid ingin latihan soal/hitungan/jebakan, panggil \`draw_ssw_quiz_question\`. Jangan mengarang soal atau kunci jawaban sendiri.
- Saat murid menjawab soal aktif (A/B/C atau angka jawaban), panggil \`grade_ssw_quiz_answer\` agar dinilai deterministik dan tersimpan permanen.
- Jika murid selesai membaca unit/halaman tertentu, panggil \`update_ssw_study_progress\`.
`);
}

export function buildSswContextualReplyCards(
  aiText: string,
  lastUserText = '',
  variationSeed = 0
) {
  const cleanAi = String(aiText || '').toLowerCase();
  const isMathTopic = /klorin|ppm|rumus|hitung|budomari|oven|roti|fillet|kalkulator|liter|ml/.test(
    cleanAi + ' ' + lastUserText.toLowerCase()
  );
  const isQuizTopic = /opsi\s*a|opsi\s*b|pilih\s*a|pilih\s*b|pilihan|soal|tryout|jawabanmu/.test(cleanAi);
  const isRoadmapTopic = /tahap|mulai|pemula|unit 0|hal\.?\s*1|progres|bagusnya|roadmap/.test(cleanAi);

  if (isQuizTopic) {
    return [
      {
        id: `ssw_card_quiz_a_${variationSeed}`,
        tier: 'easy' as const,
        badgeId: 'Jawab Opsi A',
        badgeTh: 'เลือก A',
        tierLabelId: '1 · Jawab A',
        tierLabelTh: '1 · ตอบ A',
        text: 'Saya pilih opsi A ya Sensei, tolong nilai jawaban saya!',
        pronunciation: '',
        hintId: 'Memilih jawaban A untuk dinilai langsung dan catat poin kesiapan.',
        hintTh: 'เลือกข้อ A เพื่อตรวจคำตอบ',
        meaningId: 'Memilih jawaban A untuk dinilai langsung dan catat poin kesiapan.',
        meaningTh: 'เลือกข้อ A เพื่อตรวจคำตอบ',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
      {
        id: `ssw_card_quiz_b_${variationSeed}`,
        tier: 'mission' as const,
        badgeId: 'Jawab Opsi B',
        badgeTh: 'เลือก B',
        tierLabelId: '2 · Jawab B',
        tierLabelTh: '2 · ตอบ B',
        text: 'Kalau menurut saya jawabannya B, kenapa ya kalau salah atau benar?',
        pronunciation: '',
        hintId: 'Memilih jawaban B sekaligus minta bedah pembahasan opsi A/B/C.',
        hintTh: 'เลือกข้อ B พร้อมคำอธิบาย',
        meaningId: 'Memilih jawaban B sekaligus minta bedah pembahasan opsi A/B/C.',
        meaningTh: 'เลือกข้อ B พร้อมคำอธิบาย',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
      {
        id: `ssw_card_quiz_c_${variationSeed}`,
        tier: 'rescue' as const,
        badgeId: 'Jawab C + Rumus',
        badgeTh: 'เลือก C + อธิบาย',
        tierLabelId: '3 · Jawab C',
        tierLabelTh: '3 · ตอบ C',
        text: 'Jawabannya C bukan Sensei? Boleh bedah kata kuncinya dan halaman PDF-nya?',
        pronunciation: '',
        hintId: 'Memilih C dan minta rujukan halaman buku PDF.',
        hintTh: 'เลือกข้อ C และดูหน้า PDF',
        meaningId: 'Memilih C dan minta rujukan halaman buku PDF.',
        meaningTh: 'เลือกข้อ C และดูหน้า PDF',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
    ];
  }

  if (isMathTopic) {
    return [
      {
        id: `ssw_card_math_1_${variationSeed}`,
        tier: 'easy' as const,
        badgeId: 'Soal Klorin',
        badgeTh: 'โจทย์คลอรีน',
        tierLabelId: '1 · Klorin',
        tierLabelTh: '1 · คลอรีน',
        text: 'Sensei, jelaskan cara hitung rumus C1 kali V1 untuk klorin 200 ppm!',
        pronunciation: '',
        hintId: 'Minta bedah rumus pengenceran natrium hipoklorit (jiaensosan).',
        hintTh: 'ขอคำอธิบายสูตรผสมคลอรีน',
        meaningId: 'Minta bedah rumus pengenceran natrium hipoklorit (jiaensosan).',
        meaningTh: 'ขอคำอธิบายสูตรผสมคลอรีน',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
      {
        id: `ssw_card_math_2_${variationSeed}`,
        tier: 'mission' as const,
        badgeId: 'Budomari & Roti',
        badgeTh: 'สูตรคำนวณ',
        tierLabelId: '2 · Latih Soal',
        tierLabelTh: '2 · ฝึกโจทย์',
        text: 'Kasih saya 1 soal hitungan Wakai Papa tentang budomari atau kapasitas oven!',
        pronunciation: '',
        hintId: 'Minta latihan soal kalkulator CBT dengan aturan pembulatan ke atas.',
        hintTh: 'ขอฝึกโจทย์คำนวณจาก Wakai Papa',
        meaningId: 'Minta latihan soal kalkulator CBT dengan aturan pembulatan ke atas.',
        meaningTh: 'ขอฝึกโจทย์คำนวณจาก Wakai Papa',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
      {
        id: `ssw_card_math_3_${variationSeed}`,
        tier: 'rescue' as const,
        badgeId: 'Jawab 2 mL + 998 mL',
        badgeTh: 'ตอบ 2 mL',
        tierLabelId: '3 · Uji Jawab',
        tierLabelTh: '3 · ตอบ 2 mL',
        text: 'Kalau stok 10% bikin 1 liter 200 ppm, berarti 2 mL klorin plus 998 mL air ya Sensei?',
        pronunciation: '',
        hintId: 'Coba jawab hitungan pengenceran klorin 200 ppm.',
        hintTh: 'ตอบโจทย์คลอรีน 200 ppm',
        meaningId: 'Coba jawab hitungan pengenceran klorin 200 ppm.',
        meaningTh: 'ตอบโจทย์คลอรีน 200 ppm',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
    ];
  }

  if (isRoadmapTopic) {
    return [
      {
        id: `ssw_card_road_1_${variationSeed}`,
        tier: 'easy' as const,
        badgeId: 'Cek Tahap 1',
        badgeTh: 'เช็กบท 1',
        tierLabelId: '1 · Cek Progres',
        tierLabelTh: '1 · ดูความคืบหน้า',
        text: 'Sensei, progres saya masih nol, mulai dari halaman 1 sampai 6 dulu ya?',
        pronunciation: '',
        hintId: 'Konfirmasi roadmap pemula mulai dari Unit 0 Dekoder Bahasa (Hal. 1-6).',
        hintTh: 'เริ่มเรียนจาก Unit 0 หน้า 1-6',
        meaningId: 'Konfirmasi roadmap pemula mulai dari Unit 0 Dekoder Bahasa (Hal. 1-6).',
        meaningTh: 'เริ่มเรียนจาก Unit 0 หน้า 1-6',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
      {
        id: `ssw_card_road_2_${variationSeed}`,
        tier: 'mission' as const,
        badgeId: 'Tanya Alergen 2026',
        badgeTh: 'อัปเดต 2026',
        tierLabelId: '2 · Ver 5.1',
        tierLabelTh: '2 · Ver 5.1',
        text: 'Bahas update alergen OTAFF Ver 5.1 April 2026: Kurumi, Cashew Nut, dan Pistachio!',
        pronunciation: '',
        hintId: 'Minta rangkuman akurat 9 Wajib + 20 Anjuran terbaru 2026 (Hal. 10-11).',
        hintTh: 'สรุปสารก่อภูมิแพ้ Ver 5.1',
        meaningId: 'Minta rangkuman akurat 9 Wajib + 20 Anjuran terbaru 2026 (Hal. 10-11).',
        meaningTh: 'สรุปสารก่อภูมิแพ้ Ver 5.1',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
      {
        id: `ssw_card_road_3_${variationSeed}`,
        tier: 'rescue' as const,
        badgeId: 'Mulai Kuis CBT',
        badgeTh: 'เริ่มสอบ',
        tierLabelId: '3 · Kuis CBT',
        tierLabelTh: '3 · ควิซ CBT',
        text: 'Saya mau langsung tes 1 soal jebakan Wakai Papa, misalnya yukkuri atau hokang sampuru!',
        pronunciation: '',
        hintId: 'Minta Sensei mengeluarkan 1 soal jebakan asli dari buku.',
        hintTh: 'ขอลองทำโจทย์กับดัก Wakai Papa 1 ข้อ',
        meaningId: 'Minta Sensei mengeluarkan 1 soal jebakan asli dari buku.',
        meaningTh: 'ขอลองทำโจทย์กับดัก Wakai Papa 1 ข้อ',
        isRealtimeAi: false,
        isOfflineFallback: true,
      },
    ];
  }

  return [
    {
      id: `ssw_card_gen_1_${variationSeed}`,
      tier: 'easy' as const,
      badgeId: 'Mulai Pemula',
      badgeTh: 'เริ่มเรียน',
      tierLabelId: '1 · Progres',
      tierLabelTh: '1 · ลำดับเรียน',
      text: 'Sensei, aku pemula nol di SSW Pengolahan Makanan. Bagusnya mulai dari mana?',
      pronunciation: '',
      hintId: 'Minta cek progres & rute belajar terstruktur mulai Hal. 1-6.',
      hintTh: 'ถามจุดเริ่มต้นเรียน SSW สำหรับมือใหม่',
      meaningId: 'Minta cek progres & rute belajar terstruktur mulai Hal. 1-6.',
      meaningTh: 'ถามจุดเริ่มต้นเรียน SSW สำหรับมือใหม่',
      isRealtimeAi: false,
      isOfflineFallback: true,
    },
    {
      id: `ssw_card_gen_2_${variationSeed}`,
      tier: 'mission' as const,
      badgeId: 'Trik Yukkuri',
      badgeTh: 'เคล็ดลับ',
      tierLabelId: '2 · Jebakan',
      tierLabelTh: '2 · กับดัก',
      text: 'Jelaskan jebakan kata yukkuri dan cara baca tadashi vs machigatteiru di Hal. 27!',
      pronunciation: '',
      hintId: 'Tanya rahasia soal Benar/Salah & kata jebakan yukkuri dari Wakai Papa.',
      hintTh: 'ถามเรื่องคำกับดัก yukkuri ในข้อสอบ',
      meaningId: 'Tanya rahasia soal Benar/Salah & kata jebakan yukkuri dari Wakai Papa.',
      meaningTh: 'ถามเรื่องคำกับดัก yukkuri ในข้อสอบ',
      isRealtimeAi: false,
      isOfflineFallback: true,
    },
    {
      id: `ssw_card_gen_3_${variationSeed}`,
      tier: 'rescue' as const,
      badgeId: 'Tes Klorin / CBT',
      badgeTh: 'ทดสอบ',
      tierLabelId: '3 · Kuis CBT',
      tierLabelTh: '3 · ควิซ',
      text: 'Uji saya 1 soal hitungan klorin 200 ppm atau soal CBT Ver 5.1 dong Sensei!',
      pronunciation: '',
      hintId: 'Minta soal latihan langsung + penilaian kesiapan menuju >= 65%.',
      hintTh: 'ขอทดสอบโจทย์คำนวณคลอรีน 1 ข้อ',
      meaningId: 'Minta soal latihan langsung + penilaian kesiapan menuju >= 65%.',
      meaningTh: 'ขอทดสอบโจทย์คำนวณคลอรีน 1 ข้อ',
      isRealtimeAi: false,
      isOfflineFallback: true,
    },
  ];
}
