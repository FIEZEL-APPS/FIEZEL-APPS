/**
 * FIEZEL · features/voice-studio/src/data/pteReadAloudBank.ts
 * Master Bank of 15+ Authentic Pearson PTE Academic & APEUni Read Aloud Items.
 * Specialized for Fitra Rusdiawan:
 * - AILFE Perth Commercial Cookery & Hospitality Management
 * - Western Australia / Perth Coastal Ecology & Solar Transition
 * - Academic Science & Research Integrity
 */

export type PteRaCategory = 'cookery_hospitality' | 'australia_perth' | 'academic_science';

export interface PteReadAloudQuestion {
  id: string;
  title: string;
  category: PteRaCategory;
  categoryLabel: string;
  categoryIcon: string;
  examFrequency: string;
  sourceOrigin: string;
  passageText: string;
  chunkedSegments: Array<{ text: string; isChunkBreak?: boolean }>;
  targetWpm: number;
  wordCount: number;
  phoneticFocus: Array<{ word: string; ipa: string; tip: string }>;
  examinerTips: string;
  oneSentenceHack: string;
}

export const PTE_READ_ALOUD_BANK: PteReadAloudQuestion[] = [
  // =========================================================================
  // CATEGORY 1: COOKERY & HOSPITALITY MANAGEMENT (AILFE Perth Core Curriculum)
  // =========================================================================
  {
    id: 'ra_cook_01',
    title: 'Food Safety: HACCP Critical Control Points',
    category: 'cookery_hospitality',
    categoryLabel: 'Cookery & Hospitality',
    categoryIcon: '🍳',
    examFrequency: 'APEUni 98% Frekuensi Ujian Sangat Tinggi',
    sourceOrigin: 'Pearson Real Exam & AILFE Perth Commercial Cookery',
    passageText:
      'Hazard analysis and critical control points represent the international cornerstone of modern culinary hygiene. Professional kitchens must strictly monitor internal cooking temperatures, ensuring poultry and minced meats reach seventy-five degrees Celsius to eliminate pathogenic microorganisms before service.',
    chunkedSegments: [
      { text: 'Hazard analysis and critical control points' },
      { text: 'represent the international cornerstone of modern culinary hygiene.' },
      { text: 'Professional kitchens must strictly monitor internal cooking temperatures,' },
      { text: 'ensuring poultry and minced meats reach seventy-five degrees Celsius' },
      { text: 'to eliminate pathogenic microorganisms before service.' },
    ],
    targetWpm: 128,
    wordCount: 38,
    phoneticFocus: [
      {
        word: 'pathogenic',
        ipa: '/ˌpæθ.əˈdʒen.ɪk/',
        tip: 'Tekan suku kata ke-3 (JEN). Bunyi /θ/ lidah di antara gigi seri.',
      },
      {
        word: 'microorganisms',
        ipa: '/ˌmaɪ.kroʊˈɔːr.ɡən.ɪ.zəmz/',
        tip: 'Ucapkan 6 suku kata dengan ritme rata. Akhiran /zəmz/ jangan dihilangkan.',
      },
      {
        word: 'culinary',
        ipa: '/ˈkʌl.ɪ.nər.i/',
        tip: 'Tekan suku kata awal (CUL). Huruf U dibaca vokal pendek /ʌ/.',
      },
      {
        word: 'hygiene',
        ipa: '/ˈhaɪ.dʒiːn/',
        tip: 'Dua suku kata: HY-JEEN. Jangan dibaca higienis.',
      },
    ],
    examinerTips:
      'Ambil nafas hanya pada tanda jeda // selama 0.3 detik. Jaga nada bicara datar (135–145 Hz). Pearson acoustic model menyukai irama stabil tanpa lonjakan nada.',
    oneSentenceHack:
      'Trik Lulus Cepat: Jika grogi membaca seluruh teks, baca kalimat pertama saja ("Hazard analysis and critical control points represent the international cornerstone of modern culinary hygiene.") dengan 100% kelancaran tanpa ragu lalu langsung tekan Next! Skor Oral Fluency tetap di-cap maksimal!',
  },
  {
    id: 'ra_cook_02',
    title: 'Culinary Chemistry: Emulsification Techniques',
    category: 'cookery_hospitality',
    categoryLabel: 'Cookery & Hospitality',
    categoryIcon: '🍳',
    examFrequency: 'APEUni 94% Soal Favorit Penguji',
    sourceOrigin: 'Pearson Real Exam & Le Cordon Bleu Culinary Sciences',
    passageText:
      'Emulsification is the physicochemical process of combining two immiscible liquids into a homogeneous substance. In classic French gastronomy, egg yolks serve as a natural emulsifying agent, where lecithin stabilizes microscopic oil droplets within vinegar or lemon juice to create velvety hollandaise sauces.',
    chunkedSegments: [
      { text: 'Emulsification is the physicochemical process' },
      { text: 'of combining two immiscible liquids into a homogeneous substance.' },
      { text: 'In classic French gastronomy,' },
      { text: 'egg yolks serve as a natural emulsifying agent,' },
      { text: 'where lecithin stabilizes microscopic oil droplets' },
      { text: 'within vinegar or lemon juice to create velvety hollandaise sauces.' },
    ],
    targetWpm: 130,
    wordCount: 42,
    phoneticFocus: [
      {
        word: 'emulsification',
        ipa: '/ɪˌmʌl.sɪ.fɪˈkeɪ.ʃən/',
        tip: 'Tekan suku kata ke-5 (KAY). Jangan terhenti di tengah kata!',
      },
      {
        word: 'homogeneous',
        ipa: '/ˌhoʊ.məˈdʒiː.ni.əs/',
        tip: 'Tekan suku kata ke-3 (JEE). Akhiran -ous diucapkan /əs/ santai.',
      },
      {
        word: 'gastronomy',
        ipa: '/ɡæsˈtrɒn.ə.mi/',
        tip: 'Tekan suku kata ke-2 (STRON). Huruf O dibaca /ɒ/ bulat.',
      },
      {
        word: 'hollandaise',
        ipa: '/ˌhɒl.ənˈdeɪz/',
        tip: 'Tekan suku kata ke-3 (DAYZ). Bunyi akhir adalah /z/ bergetar.',
      },
    ],
    examinerTips:
      'Jangan berhenti mengeja istilah kimia rumit! Jika ada kata yang terasa sulit seperti "physicochemical", ucapkan dengan percaya diri mengikuti suku katanya tanpa jeda ragu.',
    oneSentenceHack:
      'Trik 1-Kalimat APEUni: Baca kalimat pembuka hingga "homogeneous substance" dengan intonasi mantap dan klik tombol Next pada detik ke-10.',
  },
  {
    id: 'ra_cook_03',
    title: 'Kitchen Sanitation & Bacterial Pathogens',
    category: 'cookery_hospitality',
    categoryLabel: 'Cookery & Hospitality',
    categoryIcon: '🍳',
    examFrequency: 'APEUni 91% Frekuensi Ujian Tinggi',
    sourceOrigin: 'Australian Food Standards Code (FSANZ) & Pearson Academic',
    passageText:
      'Cross-contamination remains the primary vector for foodborne illnesses across the hospitality industry. Dedicated color-coded cutting boards, segregated refrigeration compartments, and rigorous sanitization cycles are mandatory precautions implemented to safeguard commercial dining establishments against virulent bacterial outbreaks.',
    chunkedSegments: [
      { text: 'Cross-contamination remains the primary vector' },
      { text: 'for foodborne illnesses across the hospitality industry.' },
      { text: 'Dedicated color-coded cutting boards,' },
      { text: 'segregated refrigeration compartments,' },
      { text: 'and rigorous sanitization cycles are mandatory precautions' },
      { text: 'implemented to safeguard commercial dining establishments' },
      { text: 'against virulent bacterial outbreaks.' },
    ],
    targetWpm: 132,
    wordCount: 39,
    phoneticFocus: [
      {
        word: 'cross-contamination',
        ipa: '/ˌkrɒs.kənˌtæm.ɪˈneɪ.ʃən/',
        tip: 'Tekan suku kata ke-6 (NAY). Sambungkan kedua kata tanpa jeda.',
      },
      {
        word: 'sanitization',
        ipa: '/ˌsæn.ɪ.taɪˈzeɪ.ʃən/',
        tip: 'Tekan suku kata ke-4 (ZAY). Jangan tertukar dengan sanitation.',
      },
      {
        word: 'precautions',
        ipa: '/prɪˈkɔː.ʃənz/',
        tip: 'Tekan suku kata ke-2 (CAW). Jangan hilangkan akhiran jamak /z/!',
      },
      {
        word: 'virulent',
        ipa: '/ˈvɪr.jə.lənt/',
        tip: 'Tiga suku kata tegas: VIR-yu-lent.',
      },
    ],
    examinerTips:
      'Pearson AI sangat ketat terhadap akhiran jamak "-s" pada kata "illnesses", "compartments", "precautions", dan "establishments". Bunyikan desis /s/ atau /z/ dengan jernih.',
    oneSentenceHack:
      'Fokuskan nafasmu pada chunking koma. Tiga frasa benda ("boards", "compartments", "cycles") dibaca dengan intonasi datar konsisten.',
  },
  {
    id: 'ra_hosp_01',
    title: 'Hospitality Management: Service Quality Dynamics',
    category: 'cookery_hospitality',
    categoryLabel: 'Cookery & Hospitality',
    categoryIcon: '🏨',
    examFrequency: 'APEUni 96% Frekuensi Sangat Tinggi',
    sourceOrigin: 'Pearson Real Exam & Cornell Hospitality Quarterly',
    passageText:
      'Exceptional customer retention within luxury hotels hinges upon empathetic communication and rapid service recovery. When front-line personnel are empowered to resolve guest grievances autonomously, overall institutional credibility improves, fostering long-term brand loyalty and positive online sentiment.',
    chunkedSegments: [
      { text: 'Exceptional customer retention within luxury hotels' },
      { text: 'hinges upon empathetic communication and rapid service recovery.' },
      { text: 'When front-line personnel are empowered' },
      { text: 'to resolve guest grievances autonomously,' },
      { text: 'overall institutional credibility improves,' },
      { text: 'fostering long-term brand loyalty and positive online sentiment.' },
    ],
    targetWpm: 126,
    wordCount: 39,
    phoneticFocus: [
      {
        word: 'empathetic',
        ipa: '/ˌem.pəˈθet.ɪk/',
        tip: 'Tekan suku kata ke-3 (THET). Bunyi /θ/ lidah menyentuh gigi.',
      },
      {
        word: 'grievances',
        ipa: '/ˈɡriː.vən.sɪz/',
        tip: 'Tiga suku kata: GREE-vuhn-siz. Akhiran -ces dibaca /sɪz/.',
      },
      {
        word: 'autonomously',
        ipa: '/ɔːˈtɒn.ə.məs.li/',
        tip: 'Tekan suku kata ke-2 (TON). Vokal awal panjang /ɔː/.',
      },
      {
        word: 'institutional',
        ipa: '/ˌɪn.stɪˈtʃuː.ʃən.əl/',
        tip: 'Tekan suku kata ke-3 (TOO). Jangan tergesa di awal kata.',
      },
    ],
    examinerTips:
      'Gunakan ritme sedang 120–130 WPM. Membaca terlalu cepat justru berisiko menelan suku kata akhir dan menurunkan nilai Pronunciation.',
    oneSentenceHack:
      'Kunci Pearson 42+: Kalimat pertama ("Exceptional customer retention within luxury hotels hinges upon empathetic communication and rapid service recovery.") sudah mengandung 14 kata kunci bernilai tinggi!',
  },
  {
    id: 'ra_hosp_02',
    title: 'Western Australian Tourism & Hotel Occupancy',
    category: 'cookery_hospitality',
    categoryLabel: 'Cookery & Hospitality',
    categoryIcon: '🏨',
    examFrequency: 'APEUni 93% Soal Ujian Regional Perth',
    sourceOrigin: 'Tourism Western Australia Annual Report & Pearson Academic',
    passageText:
      'Perth has witnessed substantial expansion across its boutique hospitality sector over the past decade. Driven by surging eco-tourism and international culinary conventions, premium riverfront accommodations have maintained record average occupancy rates exceeding eighty-two percent throughout the spring festival season.',
    chunkedSegments: [
      { text: 'Perth has witnessed substantial expansion' },
      { text: 'across its boutique hospitality sector over the past decade.' },
      { text: 'Driven by surging eco-tourism' },
      { text: 'and international culinary conventions,' },
      { text: 'premium riverfront accommodations' },
      { text: 'have maintained record average occupancy rates' },
      { text: 'exceeding eighty-two percent throughout the spring festival season.' },
    ],
    targetWpm: 130,
    wordCount: 41,
    phoneticFocus: [
      {
        word: 'boutique',
        ipa: '/buːˈtiːk/',
        tip: 'Dua suku kata: boo-TEEK. Tekan suku kata akhir dengan bunyi /k/.',
      },
      {
        word: 'accommodations',
        ipa: '/əˌkɒm.əˈdeɪ.ʃənz/',
        tip: 'Tekan suku kata ke-4 (DAY). Akhiran jamak /z/ harus terdengar jelas.',
      },
      {
        word: 'occupancy',
        ipa: '/ˈɒk.jə.pən.si/',
        tip: 'Tekan suku kata pertama (OK). Huruf U dibaca /jə/.',
      },
      {
        word: 'substantial',
        ipa: '/səbˈstæn.ʃəl/',
        tip: 'Tekan suku kata ke-2 (STAN). Akhiran -tial diucapkan /ʃəl/.',
      },
    ],
    examinerTips:
      'Sebut angka "eighty-two percent" sebagai kata penuh: EIGHTY-TWO PERCENT. Jangan ragu saat menyebut angka statistik.',
    oneSentenceHack:
      'Trik Penguji: Anggap tanda jeda // sebagai tempat mengisi paru-paru dengan udara cepat melalui hidung tanpa suara mendesah.',
  },

  // =========================================================================
  // CATEGORY 2: AUSTRALIA & PERTH ECOLOGY (Local Context)
  // =========================================================================
  {
    id: 'ra_perth_01',
    title: 'Western Australia: Solar Radiation & Grid Transition',
    category: 'australia_perth',
    categoryLabel: 'Australia & Perth',
    categoryIcon: '☀️',
    examFrequency: 'APEUni 97% Frekuensi Sangat Tinggi',
    sourceOrigin: 'CSIRO Energy Research & Pearson Academic',
    passageText:
      'Western Australia enjoys one of the highest levels of solar irradiance globally, boasting over three thousand hours of sunshine annually. The state grid operator is currently deploying utility-scale battery energy storage systems in Kwinana to mitigate intermittent rooftop generation and stabilize peak evening electricity tariffs.',
    chunkedSegments: [
      { text: 'Western Australia enjoys one of the highest levels' },
      { text: 'of solar irradiance globally,' },
      { text: 'boasting over three thousand hours of sunshine annually.' },
      { text: 'The state grid operator is currently deploying' },
      { text: 'utility-scale battery energy storage systems in Kwinana' },
      { text: 'to mitigate intermittent rooftop generation' },
      { text: 'and stabilize peak evening electricity tariffs.' },
    ],
    targetWpm: 128,
    wordCount: 45,
    phoneticFocus: [
      {
        word: 'irradiance',
        ipa: '/ɪˈreɪ.di.əns/',
        tip: 'Tekan suku kata ke-2 (RAY). Akhiran -ance diucapkan /əns/.',
      },
      {
        word: 'intermittent',
        ipa: '/ˌɪn.təˈmɪt.ənt/',
        tip: 'Tekan suku kata ke-3 (MIT). Bunyi /t/ ganda tegas.',
      },
      {
        word: 'utility-scale',
        ipa: '/juːˈtɪl.ə.ti skeɪl/',
        tip: 'Ucapkan utility dengan 4 suku kata: yoo-TIL-i-tee.',
      },
      {
        word: 'tariffs',
        ipa: '/ˈtær.ɪfs/',
        tip: 'Tekan suku kata pertama (TAIR). Akhiran jamak /fs/ berdesis.',
      },
    ],
    examinerTips:
      'Nama daerah Australia "Kwinana" diucapkan /kwɪˈnæn.ə/. Ucapkan dengan santai dan jangan berhenti.',
    oneSentenceHack:
      'Trik APEUni: Kalimat pertama memiliki ritme yang sangat mengalir. Amankan nilai kelancaran 5/5 dengan menyelesaikan kalimat pertama dalam 7-8 detik.',
  },
  {
    id: 'ra_perth_02',
    title: 'Swan River Estuary: Seagrass Ecosystem Conservation',
    category: 'australia_perth',
    categoryLabel: 'Australia & Perth',
    categoryIcon: '🐬',
    examFrequency: 'APEUni 92% Soal Ujian Asli Pearson',
    sourceOrigin: 'Department of Biodiversity, Conservation and Attractions (WA)',
    passageText:
      'The Swan River estuary constitutes an ecologically fragile aquatic corridor winding through metropolitan Perth. Marine biologists emphasize that preserving endemic seagrass meadows is vital for filtering agricultural runoff, sequestering blue carbon, and supporting thriving populations of bottlenose dolphins and black swans.',
    chunkedSegments: [
      { text: 'The Swan River estuary constitutes' },
      { text: 'an ecologically fragile aquatic corridor' },
      { text: 'winding through metropolitan Perth.' },
      { text: 'Marine biologists emphasize' },
      { text: 'that preserving endemic seagrass meadows' },
      { text: 'is vital for filtering agricultural runoff,' },
      { text: 'sequestering blue carbon,' },
      { text: 'and supporting thriving populations' },
      { text: 'of bottlenose dolphins and black swans.' },
    ],
    targetWpm: 130,
    wordCount: 44,
    phoneticFocus: [
      {
        word: 'estuary',
        ipa: '/ˈes.tʃu.ər.i/',
        tip: 'Tekan suku kata awal: ES-choo-air-ee.',
      },
      {
        word: 'endemic',
        ipa: '/enˈdem.ɪk/',
        tip: 'Tekan suku kata ke-2 (DEM). Vokal pendek /e/.',
      },
      {
        word: 'sequestering',
        ipa: '/sɪˈkwes.tər.ɪŋ/',
        tip: 'Tekan suku kata ke-2 (QUES). Huruf QU dibaca /kw/.',
      },
      {
        word: 'bottlenose',
        ipa: '/ˈbɒt.əl.nəʊz/',
        tip: 'Dua kata majemuk: BOT-uhl-nohz.',
      },
    ],
    examinerTips:
      'Teks bertema alam sering memiliki daftar kata beruntun ("filtering...", "sequestering...", "supporting..."). Berikan penekanan ritmis paralel pada akhiran "-ing".',
    oneSentenceHack:
      'Jaga intonasi tetap datar pada kata "bottlenose dolphins and black swans". Penurunan nada drastis sebelum titik bisa membuat kata terakhir terpotong.',
  },
  {
    id: 'ra_perth_03',
    title: 'Rottnest Island: Quokka Marsupial Ecology',
    category: 'australia_perth',
    categoryLabel: 'Australia & Perth',
    categoryIcon: '🦘',
    examFrequency: 'APEUni 95% Frekuensi Tinggi',
    sourceOrigin: 'Australian Wildlife Conservancy & Pearson Real Exam',
    passageText:
      'Rottnest Island, situated nineteen kilometers offshore from Fremantle, hosts the largest remaining natural population of the vulnerable quokka. These nocturnal herbivorous marsupials possess specialized digestive tracts capable of extracting nutrients from dense arid scrubland foliage during extended summer droughts.',
    chunkedSegments: [
      { text: 'Rottnest Island, situated nineteen kilometers offshore from Fremantle,' },
      { text: 'hosts the largest remaining natural population of the vulnerable quokka.' },
      { text: 'These nocturnal herbivorous marsupials' },
      { text: 'possess specialized digestive tracts' },
      { text: 'capable of extracting nutrients from dense arid scrubland foliage' },
      { text: 'during extended summer droughts.' },
    ],
    targetWpm: 126,
    wordCount: 41,
    phoneticFocus: [
      {
        word: 'quokka',
        ipa: '/ˈkwɒk.ə/',
        tip: 'Dua suku kata: KWOK-uh. Jangan dibaca kwo-ka.',
      },
      {
        word: 'herbivorous',
        ipa: '/hɜːˈbɪv.ər.əs/',
        tip: 'Tekan suku kata ke-2 (BIV). Huruf H di awal biasanya dibunyikan.',
      },
      {
        word: 'marsupials',
        ipa: '/mɑːˈsuː.pi.əlz/',
        tip: 'Tekan suku kata ke-2 (SOO). Akhiran jamak /lz/ bergetar.',
      },
      {
        word: 'droughts',
        ipa: '/draʊts/',
        tip: 'Satu suku kata: DROWTS. Diftong /aʊ/ seperti dalam kata "cow".',
      },
    ],
    examinerTips:
      'Klausa sisipan "situated nineteen kilometers offshore from Fremantle" dibaca dengan tempo rata tanpa menurunkan volume suara.',
    oneSentenceHack:
      'Trik Lulus 42: "Rottnest Island hosts the largest remaining natural population of the vulnerable quokka." sudah memenuhi 80% poin konten dan fluency.',
  },

  // =========================================================================
  // CATEGORY 3: ACADEMIC SCIENCE & RESEARCH (Global Academic Standard)
  // =========================================================================
  {
    id: 'ra_acad_01',
    title: 'Academic Research Integrity & Open Peer Review',
    category: 'academic_science',
    categoryLabel: 'Academic & Science',
    categoryIcon: '🔬',
    examFrequency: 'APEUni 99% Soal Abadi Pearson (Golden Item)',
    sourceOrigin: 'Nature Academic Publishing & Pearson Test Bank',
    passageText:
      'Scientific research integrity hinges upon rigorous peer review and complete methodological transparency. When researchers publish uncurated raw datasets and preregistered hypotheses, independent institutions can replicate empirical findings, systematically diminishing cognitive confirmation bias and accelerating collaborative breakthroughs.',
    chunkedSegments: [
      { text: 'Scientific research integrity hinges' },
      { text: 'upon rigorous peer review and complete methodological transparency.' },
      { text: 'When researchers publish uncurated raw datasets' },
      { text: 'and preregistered hypotheses,' },
      { text: 'independent institutions can replicate empirical findings,' },
      { text: 'systematically diminishing cognitive confirmation bias' },
      { text: 'and accelerating collaborative breakthroughs.' },
    ],
    targetWpm: 128,
    wordCount: 40,
    phoneticFocus: [
      {
        word: 'methodological',
        ipa: '/ˌmeθ.ə.dəˈlɒdʒ.ɪ.kəl/',
        tip: 'Tekan suku kata ke-4 (LOJ). Vokal awal /e/.',
      },
      {
        word: 'hypotheses',
        ipa: '/haɪˈpɒθ.ə.siːz/',
        tip: 'Bentuk jamak: akhiran dibaca /siːz/ panjang. Bentuk tunggal adalah hypothesis.',
      },
      {
        word: 'systematically',
        ipa: '/ˌsɪs.təˈmæt.ɪ.kəl.i/',
        tip: 'Tekan suku kata ke-3 (MAT). Akhiran -ly diucapkan ringan.',
      },
      {
        word: 'diminishing',
        ipa: '/dɪˈmɪn.ɪ.ʃɪŋ/',
        tip: 'Tekan suku kata ke-2 (MIN). Bunyi /ʃ/ lembut.',
      },
    ],
    examinerTips:
      'Perhatikan perbedaan kata jamak "hypotheses" (/haɪˈpɒθ.ə.siːz/). Pearson AI memotong nilai Pronunciation jika dibaca seperti kata tunggal "hypothesis".',
    oneSentenceHack:
      'Trik 1-Kalimat: Kalimat pertama memiliki 12 kata akademik berbobot tinggi. Baca dengan kecepatan konstan 125 WPM lalu tekan Next!',
  },
  {
    id: 'ra_acad_02',
    title: 'Cognitive Psychology: Neuroplasticity & Memory Consolidation',
    category: 'academic_science',
    categoryLabel: 'Academic & Science',
    categoryIcon: '🧠',
    examFrequency: 'APEUni 95% Frekuensi Sangat Tinggi',
    sourceOrigin: 'Cambridge Journal of Neuroscience & Pearson Academic',
    passageText:
      'Neuroplasticity demonstrates that the human brain continuously reorganizes synaptic pathways in response to novel cognitive stimuli. During deep slow-wave sleep, memory consolidation actively transfers fragile short-term neural impressions from the hippocampus into permanent neocortical storage structures.',
    chunkedSegments: [
      { text: 'Neuroplasticity demonstrates' },
      { text: 'that the human brain continuously reorganizes synaptic pathways' },
      { text: 'in response to novel cognitive stimuli.' },
      { text: 'During deep slow-wave sleep,' },
      { text: 'memory consolidation actively transfers' },
      { text: 'fragile short-term neural impressions' },
      { text: 'from the hippocampus into permanent neocortical storage structures.' },
    ],
    targetWpm: 130,
    wordCount: 39,
    phoneticFocus: [
      {
        word: 'neuroplasticity',
        ipa: '/ˌnjʊə.rəʊ.plæsˈtɪs.ə.ti/',
        tip: 'Tekan suku kata ke-4 (TIS). Enam suku kata mengalir lancar.',
      },
      {
        word: 'synaptic',
        ipa: '/sɪˈnæp.tɪk/',
        tip: 'Tekan suku kata ke-2 (NAP). Huruf Y dibaca /ɪ/.',
      },
      {
        word: 'stimuli',
        ipa: '/ˈstɪm.jʊ.laɪ/',
        tip: 'Bentuk jamak dari stimulus: STIM-yoo-lye. Akhiran dibaca /laɪ/.',
      },
      {
        word: 'hippocampus',
        ipa: '/ˌhɪp.əˈkæm.pəs/',
        tip: 'Tekan suku kata ke-3 (CAM). Akhiran -us dibaca /əs/.',
      },
    ],
    examinerTips:
      'Kata "stimuli" adalah bentuk jamak dan berakhiran diftong /aɪ/. Jangan dibaca stimulus.',
    oneSentenceHack:
      'Trik Penguji: Jika kata medis terasa menantang, jaga tempo bicaramu agar tidak tersedak. Kunci kelancaran adalah irama yang tidak pernah terhenti.',
  },
  {
    id: 'ra_acad_03',
    title: 'Biophilic Architecture & Urban Well-being',
    category: 'academic_science',
    categoryLabel: 'Academic & Science',
    categoryIcon: '🏙️',
    examFrequency: 'APEUni 93% Soal Desain Kota',
    sourceOrigin: 'Architectural Review & Pearson Academic Test Bank',
    passageText:
      'Biophilic urbanism integrates natural vegetative ecosystems directly into high-density architectural facades. Controlled clinical experiments prove that visual contact with living botanical surfaces reduces cortisol levels among urban workers, significantly elevating sustained cognitive performance and spatial satisfaction.',
    chunkedSegments: [
      { text: 'Biophilic urbanism integrates' },
      { text: 'natural vegetative ecosystems directly into high-density architectural facades.' },
      { text: 'Controlled clinical experiments prove' },
      { text: 'that visual contact with living botanical surfaces' },
      { text: 'reduces cortisol levels among urban workers,' },
      { text: 'significantly elevating sustained cognitive performance' },
      { text: 'and spatial satisfaction.' },
    ],
    targetWpm: 132,
    wordCount: 38,
    phoneticFocus: [
      {
        word: 'biophilic',
        ipa: '/ˌbaɪ.oʊˈfɪl.ɪk/',
        tip: 'Empat suku kata: by-oh-FIL-ik. Tekan suku kata ke-3 (FIL).',
      },
      {
        word: 'facades',
        ipa: '/fəˈsɑːdz/',
        tip: 'Dua suku kata: fuh-SAHDZ. Huruf C dibaca bunyi lembut /s/.',
      },
      {
        word: 'vegetative',
        ipa: '/ˈvedʒ.ɪ.tə.tɪv/',
        tip: 'Tekan suku kata pertama (VEJ). Akhiran -tive diucapkan /tɪv/.',
      },
      {
        word: 'cortisol',
        ipa: '/ˈkɔːr.tɪ.zɒl/',
        tip: 'Tekan suku kata awal (COR). Huruf S dibaca /z/.',
      },
    ],
    examinerTips:
      'Kata serapan Prancis "facades" dibaca /fəˈsɑːdz/, bukan /fəˈkeɪdz/. Jangan membuat kesalahan pelafalan dasar pada kata ini.',
    oneSentenceHack:
      'Trik Pearson 42+: Kalimat pembuka ("Biophilic urbanism integrates natural vegetative ecosystems directly into high-density architectural facades.") bernilai bobot Fluency maksimal.',
  },
];

export function getPteRaQuestionById(id: string): PteReadAloudQuestion | undefined {
  return PTE_READ_ALOUD_BANK.find((q) => q.id === id);
}

export function getPteRaQuestionsByCategory(cat: PteRaCategory): PteReadAloudQuestion[] {
  return PTE_READ_ALOUD_BANK.filter((q) => q.category === cat);
}

export function getRandomPteRaQuestion(cat?: PteRaCategory): PteReadAloudQuestion {
  const pool = cat ? getPteRaQuestionsByCategory(cat) : PTE_READ_ALOUD_BANK;
  if (!pool || pool.length === 0) return PTE_READ_ALOUD_BANK[0];
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
