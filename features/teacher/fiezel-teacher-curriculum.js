/**
 * FIEZEL Ruang Guru — Kurikulum Bahasa Inggris SMP (Fase D) & SMA (Fase E/F).
 * Berbasis Kurikulum Merdeka (BSKAP 032/H/KR/2024 & English for Nusantara),
 * dilengkapi referensi silang K13 Revisi dan UTBK SNBT.
 *
 * Murni data + utilitas tanpa dependensi DOM, offline-first, UMD.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelCurriculum = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PHASES = [
    {
      id: 'fase_d',
      name: 'Fase D (SMP / MTs)',
      grades: [7, 8, 9],
      cefr: 'A1+ – A2 (Threshold B1)',
      desc: 'Penguasaan dasar hingga menengah: deskripsi diri & lingkungan, resep, narasi fabel, pengalaman lampau, dan laporan faktual sederhana.'
    },
    {
      id: 'fase_e',
      name: 'Fase E (SMA / SMK Kelas 10)',
      grades: [10],
      cefr: 'B1 (Independent User)',
      desc: 'Transisi kemahiran mandiri: teks deskriptif wisata bersejarah, narasi legenda nusantara, biografi tokoh, report sains, dan eksposisi analitis isu remaja.'
    },
    {
      id: 'fase_f',
      name: 'Fase F (SMA / SMK Kelas 11 & 12)',
      grades: [11, 12],
      cefr: 'B1+ – B2 (Vantage)',
      desc: 'Kemahiran analitis lanjut: eksposisi akademis, eksplanasi fenomena, wacana dialektika (diskusi dua arah), news item, surat lamaran kerja & CV, serta kesiapan UTBK SNBT.'
    }
  ];

  var UNITS = [
    // -------------------------------------------------------------------------------------
    // FASE D — KELAS 7
    // -------------------------------------------------------------------------------------
    {
      id: 'd_g7_descriptive_me',
      phaseId: 'fase_d',
      grade: 7,
      semester: 1,
      genre: 'Descriptive Text',
      title: 'Descriptive Text — About Me, Friends & Daily Life',
      targetCefr: 'A1+',
      socialFunction: 'Mendeskripsikan identitas diri, hobi, ciri fisik, dan sifat positif teman sebaya.',
      genericStructure: ['Identification (mengenalkan subjek)', 'Description (merinci ciri fisik, hobi, dan kepribadian)'],
      languageFeatures: ['Pronouns (Subject & Possessive)', 'To Be: am, is, are', 'Simple Present Tense', 'Adverbs of Frequency'],
      teachingBrief: {
        summary: 'Unit pembuka esensial kelas 7. Siswa berlatih mendeskripsikan diri dan teman dengan Simple Present Tense dan kata sifat (adjectives).',
        hook5Minutes: 'Ajak siswa bermain "Guess Who": bacakan 3 kalimat ciri seorang teman di kelas (contoh: "He is tall. He wears glasses. He loves playing badminton.") dan minta kelas menebak siapa orangnya.',
        boardFormula: 'Subject + am/is/are + Adjective | Subject + Verb 1 (s/es) + Object',
        commonMisconceptions: [
          {
            trap: 'Penghilangan to be (Zero Copula)',
            pattern: 'My brother tall.',
            fix: 'Kalimat bahasa Inggris tanpa kata kerja aksi WAJIB memakai to be: "My brother IS tall."'
          },
          {
            trap: 'S-V Agreement orang ketiga tunggal',
            pattern: 'She like playing guitar.',
            fix: 'Untuk subjek He/She/It atau nama tunggal, tambahkan -s/-es pada kata kerja: "She LIKE-S..."'
          }
        ],
        differentiation: {
          struggling: 'Beri daftar kosakata kata sifat fisik (tall, short, curly hair) dan kalimat rumpang bertemplate.',
          advanced: 'Tantang siswa menulis profil teman 5 kalimat menggunakan konjungsi "although" atau "and also".'
        },
        keyVocabulary: [
          { word: 'cheerful', meaning: 'ceria / periang' },
          { word: 'straight hair', meaning: 'rambut lurus' },
          { word: 'sibling', meaning: 'saudara kandung' },
          { word: 'hobby', meaning: 'kegemaran / hobi' }
        ]
      },
      items: [
        {
          id: 'cur_d7_dm_01',
          prompt: 'My sister is very cheerful. She always ___ when she meets new people.',
          options: ['smiles', 'smile', 'smiling', 'smiled'],
          answer: 0,
          marker: 'always + She',
          why: {
            1: 'Subjek orang ketiga tunggal (She) dalam Simple Present membutuhkan akhiran -s.',
            2: 'Bentuk -ing membutuhkan to be (is smiling).',
            3: 'Konteks kebiasaan (always) membutuhkan present tense, bukan bentuk lampau (smiled).'
          },
          note: 'Simple Present Tense untuk kebiasaan: subjek tunggal (He/She/It) + Verb 1 dengan akhiran -s/-es.'
        },
        {
          id: 'cur_d7_dm_02',
          prompt: 'Dimas and Arya ___ active members of the school scout club.',
          options: ['are', 'is', 'am', 'be'],
          answer: 0,
          marker: 'Dimas and Arya (jamak)',
          why: {
            1: '"is" hanya untuk subjek tunggal (He/She/It).',
            2: '"am" khusus untuk subjek "I".',
            3: '"be" adalah bentuk dasar, bukan bentuk to be terkonjugasi.'
          },
          note: 'Dua orang (Dimas and Arya) membentuk subjek jamak (They), sehingga to be yang tepat adalah "are".'
        },
        {
          id: 'cur_d7_dm_03',
          prompt: 'Rina: "Is this your jacket, Tomi?"\nTomi: "No, it is not mine. It belongs to Galang, so it is ___ jacket."',
          options: ['his', 'her', 'their', 'my'],
          answer: 0,
          marker: 'Galang (laki-laki tunggal)',
          why: {
            1: '"her" adalah possessive untuk perempuan.',
            2: '"their" untuk kepemilikan orang banyak (jamak).',
            3: '"my" bertentangan dengan jawaban Tomi "it is not mine".'
          },
          note: 'Possessive adjective untuk laki-laki tunggal (Galang/He) adalah "his".'
        }
      ]
    },

    {
      id: 'd_g7_procedure_culinary',
      phaseId: 'fase_d',
      grade: 7,
      semester: 1,
      genre: 'Procedure Text',
      title: 'Procedure Text — Indonesian Recipes & Cooking Steps',
      targetCefr: 'A1+',
      socialFunction: 'Menjelaskan langkah-langkah membuat makanan atau minuman khas secara berurutan dan terstruktur.',
      genericStructure: ['Goal (Tujuan/Judul Resep)', 'Materials/Ingredients (Alat & Bahan)', 'Steps/Methods (Tahapan aksi)'],
      languageFeatures: ['Imperative Sentences (Cut, Stir, Boil)', 'Action Verbs', 'Sequencing Connectives (First, Next, Finally)', 'Adverbials of Measure'],
      teachingBrief: {
        summary: 'Siswa mempelajari teks prosedur kuliner nusantara. Fokus tata bahasa adalah kalimat perintah (imperatives) dan konjungsi urutan.',
        hook5Minutes: 'Tunjukkan gambar Pisang Goreng hangat atau Es Teh Manis. Tanyakan: "Apa kata kerja pertama yang kita lakukan? Slice, fry, or mix?"',
        boardFormula: 'Verb 1 (Perintah) + Object | First, ... → Then, ... → Finally, ...',
        commonMisconceptions: [
          {
            trap: 'Menambahkan Subjek pada Kalimat Perintah',
            pattern: 'You cut the banana.',
            fix: 'Dalam teks prosedur instruksi dimulai langsung dengan kata kerja bentuk 1 (Imperative): "Cut the banana."'
          },
          {
            trap: 'Salah menempatkan sequencing adverbs',
            pattern: 'Finally cut, first eat.',
            fix: 'Ajarkan urutan baku: First → Second → Then / Next → After that → Finally.'
          }
        ],
        differentiation: {
          struggling: 'Fokus pada mencocokkan kata kerja aksi dapur (stir, fry, pour) dengan gambarnya.',
          advanced: 'Minta siswa menyusun resep minuman sehat buatan sendiri dengan takaran presisi.'
        },
        keyVocabulary: [
          { word: 'ingredients', meaning: 'bahan-bahan' },
          { word: 'stir', meaning: 'mengaduk' },
          { word: 'pour', meaning: 'menuangkan' },
          { word: 'pinch of salt', meaning: 'sejumput garam' }
        ]
      },
      items: [
        {
          id: 'cur_d7_pc_01',
          prompt: '___ the hot water into the cup and stir the tea leaves gently.',
          options: ['Pour', 'Poured', 'Pouring', 'Pours'],
          answer: 0,
          marker: 'Imperative sentence awal langkah',
          why: {
            1: 'Bentuk lampau tidak dipakai untuk kalimat instruksi saat ini.',
            2: 'Bentuk -ing bukan kata kerja perintah imperatif.',
            3: 'Bentuk -s tidak dipakai untuk kalimat perintah.'
          },
          note: 'Kalimat instruksi prosedur diawali kata kerja bentuk pertama (Bare Infinitive / Imperative): "Pour".'
        },
        {
          id: 'cur_d7_pc_02',
          prompt: 'First, wash the mangoes. Second, peel the skin. ___, cut the fruit into small cubes.',
          options: ['Then', 'Before', 'Yesterday', 'Never'],
          answer: 0,
          marker: 'Urutan langkah ketiga',
          why: {
            1: '"Before" adalah preposisi waktu mundur, bukan penghubung tahapan berikutnya.',
            2: '"Yesterday" adalah penanda waktu lampau recount.',
            3: '"Never" adalah adverbia frekuensi negatif.'
          },
          note: 'Kata penghubung urutan langkah yang tepat setelah "Second" adalah "Then" atau "After that".'
        }
      ]
    },

    // -------------------------------------------------------------------------------------
    // FASE D — KELAS 8
    // -------------------------------------------------------------------------------------
    {
      id: 'd_g8_recount_independence',
      phaseId: 'fase_d',
      grade: 8,
      semester: 1,
      genre: 'Recount Text',
      title: 'Recount Text — Independence Day & School Memories',
      targetCefr: 'A2',
      socialFunction: 'Menceritakan kembali peristiwa masa lalu (seperti perayaan 17 Agustus atau liburan) secara runut kronologis.',
      genericStructure: ['Orientation (latar waktu, tempat, tokoh)', 'Events (rentetan kejadian kronologis)', 'Re-orientation (kesan/refleksi akhir)'],
      languageFeatures: ['Simple Past Tense (regular -ed & irregular verbs)', 'Time Connectives (A few minutes later, After that)', 'Action Verbs in Past'],
      teachingBrief: {
        summary: 'Genre recount melatih siswa bercerita kronologis. Materi bertema perayaan 17 Agustus sangat dekat dengan budaya siswa Indonesia.',
        hook5Minutes: 'Tanyakan: "Siapa yang tahun ini ikut lomba Panjat Pinang, Balap Karung, atau Makan Kerupuk? What did you feel?" Tulis Verb 1 vs Verb 2 di papan: win → won, run → ran, fall → fell.',
        boardFormula: 'Subject + Verb 2 (Past Simple) | Time Connectives: At first... Suddenly... Finally...',
        commonMisconceptions: [
          {
            trap: 'Double Past Marking',
            pattern: 'Did you *joined* the sack race?',
            fix: 'Setelah kata kerja bantu "did", kata kerja kembali ke bentuk dasar: "Did you JOIN...?"'
          },
          {
            trap: 'Menambahkan -ed pada irregular verbs',
            pattern: 'We *winned* the game.',
            fix: 'Banyak kata kerja tidak beraturan: win → won, go → went, fall → fell.'
          }
        ],
        differentiation: {
          struggling: 'Gunakan tabel komparasi Verb 1 - Verb 2 untuk kata kerja sehari-hari.',
          advanced: 'Tantang siswa menulis pengalaman lucu saat lomba 17-an dengan 3 kalimat majemuk.'
        },
        keyVocabulary: [
          { word: 'sack race', meaning: 'lomba balap karung' },
          { word: 'spectator', meaning: 'penonton' },
          { word: 'slippery', meaning: 'licin' },
          { word: 'cheered', meaning: 'bersorak menyemangati' }
        ]
      },
      items: [
        {
          id: 'cur_d8_rc_01',
          prompt: 'Last month, my school held a flag ceremony and everyone ___ traditional Indonesian costumes.',
          options: ['wore', 'wear', 'wears', 'wearing'],
          answer: 0,
          marker: 'Last month',
          why: {
            1: '"wear" adalah bentuk present (V1).',
            2: '"wears" adalah present tunggal.',
            3: '"wearing" membutuhkan to be lampau was/were.'
          },
          note: 'Penanda waktu lampau "Last month" menuntut kata kerja Simple Past (irregular: wear → wore).'
        },
        {
          id: 'cur_d8_rc_02',
          prompt: 'At first, the pole was too slippery, but Budi didn\'t ___ up until he reached the top.',
          options: ['give', 'gave', 'given', 'giving'],
          answer: 0,
          marker: "didn't",
          why: {
            1: '"gave" menandai lampau dua kali setelah did.',
            2: '"given" adalah V3 (past participle).',
            3: '"giving" adalah continuous form.'
          },
          note: 'Setelah bentuk negatif lampau "didn\'t", kata kerja kembali ke bentuk dasar V1: "give".'
        }
      ]
    },

    {
      id: 'd_g8_narrative_fables',
      phaseId: 'fase_d',
      grade: 8,
      semester: 1,
      genre: 'Narrative Text',
      title: 'Narrative Text — Fables, Moral Values & Empathy',
      targetCefr: 'A2',
      socialFunction: 'Menghibur pembaca dan menyampaikan pesan moral/nilai budi pekerti melalui cerita fabel atau persahabatan.',
      genericStructure: ['Orientation (pengenalan tokoh & latar)', 'Complication (masalah/krisis muncul)', 'Resolution (penyelesaian krisis)', 'Coda (pesan moral tersirat)'],
      languageFeatures: ['Simple Past Tense', 'Past Continuous Tense (latar suasana)', 'Direct Speech Quotes', 'Adverbs of Time (Once upon a time)'],
      teachingBrief: {
        summary: 'Narrative text melatih kemampuan literasi naratif dan pemahaman pesan moral. Fokus membaca adalah menemukan ide pokok dan inferensi pesan.',
        hook5Minutes: 'Ceritakan sepenggal kisah Si Kancil dan Buaya atau The Ant and the Grasshopper. Tanyakan: "What happened when the problem reached its peak?" (Complication).',
        boardFormula: 'Orientation → Complication → Resolution → Coda (Moral Value)',
        commonMisconceptions: [
          {
            trap: 'Menyamakan resolusi dengan pesan moral',
            pattern: 'Mengira resolusi adalah nasihat cerita.',
            fix: 'Resolusi adalah cara masalah diselesaikan; pesan moral (Coda) adalah pelajaran hidup bagi pembaca.'
          }
        ],
        differentiation: {
          struggling: 'Gunakan bagan alur cerita (Story Mountain) 3 kotak: Awal, Masalah, Selesai.',
          advanced: 'Minta siswa menulis ulang akhir cerita fabel dengan akhir alternatif (alternate resolution).'
        },
        keyVocabulary: [
          { word: 'cunning', meaning: 'cerdik / licik' },
          { word: 'ridicule', meaning: 'mengejek / mencemooh' },
          { word: 'gratitude', meaning: 'rasa terima kasih' },
          { word: 'vanished', meaning: 'lenyap / menghilang' }
        ]
      },
      items: [
        {
          id: 'cur_d8_nar_01',
          prompt: 'While the little mouse ___ through the tall grass, a huge shadow suddenly appeared.',
          options: ['was running', 'runs', 'is running', 'ran'],
          answer: 0,
          marker: 'While + aksi yang sedang berlangsung lampau',
          why: {
            1: '"runs" adalah present simple untuk kebiasaan.',
            2: '"is running" adalah present continuous (sekarang).',
            3: '"ran" menyatakan aksi singkat selesai, bukan kegiatan berdurasi yang terinterupsi "While".'
          },
          note: 'Past Continuous (was running) dipakai bersama "While" untuk menyatakan latar aksi yang sedang berjalan ketika aksi lain tiba-tiba terjadi (appeared).'
        },
        {
          id: 'cur_d8_nar_02',
          prompt: 'The moral lesson of the story teaches us that we should not ___ people solely by their physical appearance.',
          options: ['judge', 'judged', 'judging', 'judges'],
          answer: 0,
          marker: 'should not + bare infinitive',
          why: {
            1: 'Modal auxiliary "should" tidak diikuti bentuk lampau (-ed).',
            2: 'Bukan bentuk gerund (-ing).',
            3: 'Bukan bentuk orang ketiga tunggal (-s).'
          },
          note: 'Modal verbs (should, must, can) selalu diikuti kata kerja bentuk dasar tanpa imbuhan: "judge".'
        }
      ]
    },

    // -------------------------------------------------------------------------------------
    // FASE D — KELAS 9
    // -------------------------------------------------------------------------------------
    {
      id: 'd_g9_report_fauna',
      phaseId: 'fase_d',
      grade: 9,
      semester: 1,
      genre: 'Information Report',
      title: 'Report Text — Indonesian Wildlife & Biodiversity',
      targetCefr: 'A2+',
      socialFunction: 'Menyampaikan informasi ilmiah faktual hasil observasi tentang satwa endemik Indonesia (Bekantan, Orangutan, Komodo).',
      genericStructure: ['General Classification (pengelompokan umum)', 'Description (ciri fisik, habitat, makanan, perilaku, konservasi)'],
      languageFeatures: ['Simple Present Tense (General Truths)', 'Passive Voice Dasar (is/are + V3)', 'Technical Noun Phrases', 'Relational Verbs'],
      teachingBrief: {
        summary: 'Report text berbeda dengan descriptive text: report membahas satwa/benda secara umum (Orangutans in general), bukan hewan peliharaan spesifik.',
        hook5Minutes: 'Tampilkan gambar Bekantan berhidung panjang. Tanyakan: "Is it a descriptive text of my pet or an informational report about a species?"',
        boardFormula: 'General Classification (What is it?) → Parts, Habitats, Diets, Behaviors | Passive: is/are + Verb 3',
        commonMisconceptions: [
          {
            trap: 'Tertukar antara Report dan Descriptive',
            pattern: 'Menulis "My favorite cat Bruno" sebagai report.',
            fix: 'Descriptive membahas satu objek khusus (my cat); Report membahas seluruh kelas/spesies (felines / cats).'
          },
          {
            trap: 'Kesalahan Passive Voice dasar',
            pattern: 'Bekantans are find in Borneo.',
            fix: 'Kalimat pasif bahasa Inggris wajib menggunakan Past Participle (V3): "are FOUND".'
          }
        ],
        differentiation: {
          struggling: 'Berikan lembar kerja fakta satwa (Fact Sheet) dengan kolom kategori: Habitat, Food, Threats.',
          advanced: 'Tugaskan analisis ancaman deforestasi terhadap habitat Orangutan dalam 1 paragraf ilmiah pendek.'
        },
        keyVocabulary: [
          { word: 'endangered', meaning: 'terancam punah' },
          { word: 'habitat loss', meaning: 'kehilangan habitat' },
          { word: 'canopy', meaning: 'kanopi pohon' },
          { word: 'herbivore', meaning: 'hewan pemakan tumbuhan' }
        ]
      },
      items: [
        {
          id: 'cur_d9_rp_01',
          prompt: 'Bekantans ___ as endangered primates by international conservation groups.',
          options: ['are classified', 'classify', 'is classified', 'classified'],
          answer: 0,
          marker: 'Bekantans (jamak) + passive voice',
          why: {
            1: '"classify" adalah kalimat aktif (Bekantan yang mengklasifikasikan).',
            2: '"is classified" salah keselarasan subjek karena Bekantans adalah jamak.',
            3: '"classified" tanpa to be bermakna aktif lampau.'
          },
          note: 'Subjek jamak (Bekantans) + to be "are" + V3 "classified" membentuk passive voice: "are classified".'
        },
        {
          id: 'cur_d9_rp_02',
          prompt: 'Orangutans spend most of their lives in trees, where they ___ nests out of twigs and leaves every night.',
          options: ['build', 'built', 'building', 'builds'],
          answer: 0,
          marker: 'General truth + Orangutans (jamak)',
          why: {
            1: '"built" adalah bentuk lampau, padahal ini fakta ilmiah umum yang terus terjadi.',
            2: '"building" butuh to be.',
            3: '"builds" untuk subjek tunggal.'
          },
          note: 'Fakta ilmiah umum (general truth) tentang spesies jamak (they) memakai Simple Present Verb 1 dasar: "build".'
        }
      ]
    },

    // -------------------------------------------------------------------------------------
    // FASE E — KELAS 10 (SMA)
    // -------------------------------------------------------------------------------------
    {
      id: 'e_g10_analytical_youth',
      phaseId: 'fase_e',
      grade: 10,
      semester: 2,
      genre: 'Analytical Exposition',
      title: 'Analytical Exposition — Digital Habits & Youth Wellbeing',
      targetCefr: 'B1',
      socialFunction: 'Meyakinkan pembaca bahwa suatu isu (misalnya durasi layar gadget bagi remaja) penting diperhatikan melalui argumen logis.',
      genericStructure: ['Thesis (pernyataan posisi penulis)', 'Arguments (rangkaian argumen + bukti/elaborasi)', 'Reiteration (penegasan kembali tesis)'],
      languageFeatures: ['Simple Present Tense', 'Mental Verbs (believe, realize)', 'Internal Conjunctions (Furthermore, In addition)', 'Casual Causal Connectors (Therefore, Consequently)'],
      teachingBrief: {
        summary: 'Pengantar teks argumentatif untuk SMA. Siswa belajar membedakan fakta vs opini dan menyusun argumen yang didukung elaborasi.',
        hook5Minutes: 'Tulis di papan: "Should high school students limit screen time to 2 hours a day?" Minta siswa mengangkat tangan Pro vs Contra.',
        boardFormula: 'Thesis (I believe...) → Argument 1 (Firstly, ...) → Argument 2 (Furthermore, ...) → Reiteration (Thus, ...)',
        commonMisconceptions: [
          {
            trap: 'Argumen tanpa elaborasi (Claim without Evidence)',
            pattern: 'Hanya menulis "Gadget is bad because it is bad."',
            fix: 'Setiap argumen harus punya penjelasan logis atau dampak nyata: "It disrupts sleep cycles due to blue light."'
          },
          {
            trap: 'Tertukar Reiteration vs Recommendation',
            pattern: 'Menulis "Therefore government must ban all phones" di teks analitis.',
            fix: 'Analytical exposition berujung pada Reiteration (penegasan kesimpulan); rekomendasi tindakan adalah ranah Hortatory.'
          }
        ],
        differentiation: {
          struggling: 'Sediakan graphic organizer 3 kotak: Thesis, Reason, Conclusion.',
          advanced: 'Tantang siswa menulis kalimat konsesif ("Although smartphones offer benefits, excessive screen time...")'
        },
        keyVocabulary: [
          { word: 'detrimental', meaning: 'merugikan / berdampak buruk' },
          { word: 'wellbeing', meaning: 'kesejahteraan / kesehatan mental' },
          { word: 'furthermore', meaning: 'lagipula / terlebih lagi' },
          { word: 'consequently', meaning: 'sebagai akibatnya' }
        ]
      },
      items: [
        {
          id: 'cur_e10_ae_01',
          prompt: 'Excessive use of smartphones late at night can disrupt sleep quality; ___, it reduces students\' concentration at school.',
          options: ['consequently', 'however', 'nevertheless', 'although'],
          answer: 0,
          marker: 'Hubungan sebab-akibat (disrupt sleep -> reduces concentration)',
          why: {
            1: '"however" menyatakan pertentangan kontras.',
            2: '"nevertheless" menyatakan kontras konsesif.',
            3: '"although" membutuhkan klausa subordinat.'
          },
          note: '"Consequently" (oleh karena itu/akibatnya) adalah konjungsi sebab-akibat yang tepat untuk menghubungkan premis dengan dampaknya.'
        },
        {
          id: 'cur_e10_ae_02',
          prompt: 'Many psychologists argue that digital detox weekends ___ students regain emotional balance.',
          options: ['help', 'helps', 'helping', 'has helped'],
          answer: 0,
          marker: 'digital detox weekends (subjek jamak)',
          why: {
            1: '"helps" salah karena subjeknya jamak (weekends).',
            2: '"helping" membutuhkan kata kerja bantu.',
            3: '"has helped" memakai singular auxiliary has untuk subjek jamak.'
          },
          note: 'Frasa subjek "digital detox weekends" adalah jamak, sehingga kata kerja yang sesuai adalah "help".'
        }
      ]
    },

    // -------------------------------------------------------------------------------------
    // FASE F — KELAS 11 (SMA)
    // -------------------------------------------------------------------------------------
    {
      id: 'f_g11_explanation_phenomena',
      phaseId: 'fase_f',
      grade: 11,
      semester: 2,
      genre: 'Explanation Text',
      title: 'Explanation Text — How & Why Scientific Phenomena Occur',
      targetCefr: 'B1+',
      socialFunction: 'Menerangkan proses terjadinya suatu fenomena alam, ilmiah, atau sosial secara kausal dan sekuensial (misal: terjadinya tsunami, pemanasan global).',
      genericStructure: ['General Statement (menentukan fenomena yang dijelaskan)', 'Sequenced Explanation (rangkaian tahapan sebab-akibat)', 'Concluding Remark (opsional: dampak/ringkasan)'],
      languageFeatures: ['Passive Voice intensif', 'Cause-and-Effect Connectors (Due to, As a result, Leads to)', 'Action Verbs in scientific process', 'Simple Present Tense'],
      teachingBrief: {
        summary: 'Explanation text menguji pemahaman proses ilmiah. Siswa SMA kelas 11 dilatih membaca wacana kausal berbasis sains dan menggunakan passive voice tingkat lanjut.',
        hook5Minutes: 'Tanyakan: "Why does an earthquake beneath the seabed cause a tsunami?" Buat bagan alur 3 langkah di papan: Disruption → Displacement of water → Giant waves.',
        boardFormula: 'General Statement → Process 1 (Due to...) → Process 2 (Is triggered by...) → Final Stage (Results in...)',
        commonMisconceptions: [
          {
            trap: 'Tertukar antara Procedure dan Explanation',
            pattern: 'Mengira cara membuat layang-layang adalah explanation text.',
            fix: 'Procedure berfokus pada "bagaimana manusia melakukan sesuatu" (langkah imperatif); Explanation menjelaskan "mengapa/bagaimana fenomena alam terjadi sendiri" (proses saintifik kausal).'
          }
        ],
        differentiation: {
          struggling: 'Bantu siswa memetakan alur menggunakan diagram sebab-akibat (Fishbone diagram).',
          advanced: 'Tugaskan siswa mengubah kalimat aktif proses biologis menjadi kalimat pasif ilmiah.'
        },
        keyVocabulary: [
          { word: 'tectonic plates', meaning: 'lempeng tektonik' },
          { word: 'displacement', meaning: 'pergeseran / pemindahan' },
          { word: 'subsequent', meaning: 'yang berikutnya / sesudahnya' },
          { word: 'precipitate', meaning: 'mengendap / memicu' }
        ]
      },
      items: [
        {
          id: 'cur_f11_ex_01',
          prompt: 'When an underwater earthquake occurs, massive amounts of seawater are displaced, ___ generates high-velocity waves across the ocean.',
          options: ['which', 'whose', 'where', 'whom'],
          answer: 0,
          marker: 'Non-defining relative clause mengacu pada seluruh klausa sebelumnya',
          why: {
            1: '"whose" merujuk pada kepemilikan.',
            2: '"where" merujuk pada tempat fisik.',
            3: '"whom" merujuk pada objek orang formal.'
          },
          note: 'Relative pronoun "which" digunakan untuk merujuk kembali pada keseluruhan klausa peristiwa sebelumnya ("are displaced, which generates...").'
        },
        {
          id: 'cur_f11_ex_02',
          prompt: 'Rising sea surface temperatures are believed ___ more intense tropical storms over the past decade.',
          options: ['to have fueled', 'fueling', 'fuel', 'to be fueling'],
          answer: 0,
          marker: 'Personal reporting passive + kejadian kurun waktu lampau',
          why: {
            1: 'Konstruksi pasif reporting membutuhkan to-infinitive (to have + V3), bukan bare participle.',
            2: '"fuel" tanpa to tidak gramatikal setelah are believed.',
            3: '"to be fueling" menyatakan progresif kini, padahal konteks menunjuk akumulasi dekade lalu.'
          },
          note: 'Pola reporting passive dengan rentang waktu lampau (over the past decade) menggunakan Perfect Infinitive: "are believed to have fueled".'
        }
      ]
    },

    // -------------------------------------------------------------------------------------
    // FASE F — KELAS 12 (SMA / UTBK READINESS)
    // -------------------------------------------------------------------------------------
    {
      id: 'f_g12_discussion_dialectics',
      phaseId: 'fase_f',
      grade: 12,
      semester: 1,
      genre: 'Discussion Text',
      title: 'Discussion Text — Two-Sided Dialectics & Critical Reasoning',
      targetCefr: 'B2',
      socialFunction: 'Mengkaji isu dilematis atau kontroversial dari dua sudut pandang berbeda (Pro & Kontra) secara berimbang sebelum menarik kesimpulan objektif.',
      genericStructure: ['Issue (pernyataan isu & latar belakang kontroversi)', 'Arguments For (argumen pro didukung bukti)', 'Arguments Against (argumen kontra didukung sanggahan)', 'Conclusion / Recommendation (sintesis berimbang)'],
      languageFeatures: ['Contrastive Connectors (On the contrary, Conversely, While, Whereas)', 'Complex Sentences & Modal Hedging (Proponents assert that... whereas critics argue...)', 'Abstract Nouns'],
      teachingBrief: {
        summary: 'Teks paling berbobot untuk melatih penalaran kritis kelas 12 dan persiapan literasi UTBK SNBT. Siswa menimbang dua sisi argumen tanpa bias berlebih.',
        hook5Minutes: 'Ajukan topik kontemporer: "Artificial Intelligence in Education: Tool for Empowerment or Threat to Critical Thinking?" Minta 2 siswa merangkum poin terkuat masing-masing kubu.',
        boardFormula: 'Issue → Pro (Evidence A, B) → Contra (Evidence X, Y) → Balanced Synthesis',
        commonMisconceptions: [
          {
            trap: 'Sikap berat sebelah (One-Sided Bias)',
            pattern: 'Hanya menulis 1 kalimat kontra yang lemah.',
            fix: 'Discussion text yang berkualitas memberikan bobot porsi dan elaborasi argumen yang seimbang pada kedua sisi sebelum menyimpulkan.'
          },
          {
            trap: 'Salah menafsirkan Author\'s Stance di soal UTBK',
            pattern: 'Mengira penulis sepenuhnya pro hanya karena membaca paragraf 2.',
            fix: 'Ingatkan siswa bahwa sikap penulis di Discussion text biasanya objektif, berimbang (*neutral / judicious / impartial*), kecuali ditegaskan di paragraf akhir.'
          }
        ],
        differentiation: {
          struggling: 'Gunakan tabel dua kolom Pro vs Contra sebelum mulai membaca teks panjang.',
          advanced: 'Tantang siswa menemukan kelemahan logika (*logical fallacies*) pada argumen kontra.'
        },
        keyVocabulary: [
          { word: 'proponents', meaning: 'pendukung / penganjur' },
          { word: 'opponents', meaning: 'penentang / kubu kontra' },
          { word: 'conversely', meaning: 'sebaliknya' },
          { word: 'indispensable', meaning: 'sangat diperlukan / tak tergantikan' }
        ]
      },
      items: [
        {
          id: 'cur_f12_disc_01',
          prompt: 'Proponents claim nuclear energy provides a clean baseload alternative; ___, skeptics maintain the long-term waste disposal remains unresolved.',
          options: ['whereas', 'furthermore', 'similarly', 'therefore'],
          answer: 0,
          marker: 'Dua kubu berlawanan (Proponents claim ... vs skeptics maintain ...)',
          why: {
            1: '"furthermore" menambahkan poin searah.',
            2: '"similarly" menyatakan kesamaan.',
            3: '"therefore" menyatakan akibat logis.'
          },
          note: '"Whereas" (sedangkan/sebaliknya) adalah konjungsi kontras sempurna untuk mempertentangkan dua kubu dalam satu wacana dialektika.'
        },
        {
          id: 'cur_f12_disc_02',
          prompt: 'Had the government ___ the public transit infrastructure earlier, metropolitan congestion would not be as severe today.',
          options: ['expanded', 'expands', 'expand', 'has expanded'],
          answer: 0,
          marker: 'Inverted Third Conditional (Had + Subject + V3)',
          why: {
            1: '"expands" adalah present form.',
            2: '"expand" adalah bare infinitive.',
            3: '"has expanded" bukan struktur inversi pengandaian Had.'
          },
          note: 'Pola Inverted Conditional Type 3 (pengganti "If the government had expanded"): Had + Subject + Past Participle (expanded).'
        }
      ]
    },

    {
      id: 'f_g12_career_app_letter_cv',
      phaseId: 'fase_f',
      grade: 12,
      semester: 2,
      genre: 'Formal Application Letter & CV',
      title: 'Professional Communication — Application Letter & Modern CV',
      targetCefr: 'B1+ – B2',
      socialFunction: 'Menyusun surat lamaran kerja resmi dan CV berbahasa Inggris untuk kesiapan magang, kuliah luar negeri, atau dunia kerja profesional.',
      genericStructure: ['Sender Information & Date', 'Recipient Address', 'Salutation', 'Opening (posisi yang dilamar)', 'Body Paragraphs (kualifikasi & bukti STAR)', 'Closing & Complimentary Close'],
      languageFeatures: ['Formal Business English Register', 'Action Verbs (spearheaded, coordinated, resolved)', 'Present Perfect for accomplishments', 'Polite Modality (Would be grateful, Look forward to)'],
      teachingBrief: {
        summary: 'Materi praktis krusial untuk lulusan SMA/SMK. Siswa menyusun berkas lamaran profesional dengan etika korespondensi formal.',
        hook5Minutes: 'Tampilkan contoh dua surat lamaran: satu memakai bahasa gaul santai, satu memakai register formal bisnis. Tanyakan: "Which applicant would you invite for an interview?"',
        boardFormula: 'Dear Mr./Ms. [Name] → State Position → Qualifications (STAR method) → Interview Availability → Sincerely, [Your Name]',
        commonMisconceptions: [
          {
            trap: 'Register bahasa terlalu santai',
            pattern: 'Menulis "Hey, I really need this job."',
            fix: 'Gunakan register formal: "I am writing to express my strong interest in the Graphic Designer position..."'
          },
          {
            trap: 'Format penutup tidak selaras dengan salam pembuka',
            pattern: 'Membuka dengan "Dear Sir/Madam" tapi menutup dengan "Best regards".',
            fix: 'Standar formal: Dear Mr. X → "Yours sincerely"; Dear Sir/Madam → "Yours faithfully".'
          }
        ],
        differentiation: {
          struggling: 'Sediakan template surat lamaran 4 paragraf dengan kolom isian terstruktur.',
          advanced: 'Tugaskan pembuatan CV ATS-friendly dengan bullet points pencapaian terukur (*measurable metrics*).'
        },
        keyVocabulary: [
          { word: 'qualifications', meaning: 'kualifikasi / kompetensi' },
          { word: 'enclose', meaning: 'melampirkan' },
          { word: 'prospective', meaning: 'calon / potensial' },
          { word: 'spearhead', meaning: 'memelopori / memimpin' }
        ]
      },
      items: [
        {
          id: 'cur_f12_job_01',
          prompt: 'I am writing to express my enthusiasm for the Junior Data Analyst position ___ on your company\'s career portal last Monday.',
          options: ['advertised', 'advertising', 'advertise', 'was advertised'],
          answer: 0,
          marker: 'Reduced passive relative clause (which was advertised)',
          why: {
            1: '"advertising" menyatakan aktif (posisi itu yang mengiklankan).',
            2: '"advertise" adalah bentuk dasar yang tidak gramatikal sebagai modifier.',
            3: '"was advertised" membutuhkan relative pronoun (which was advertised).'
          },
          note: 'Reduced passive participle: "the position [which was] advertised" diringkas menjadi "the position ADVERTISED".'
        },
        {
          id: 'cur_f12_job_02',
          prompt: 'I look forward to ___ from you regarding the opportunity for an interview.',
          options: ['hearing', 'hear', 'heard', 'be heard'],
          answer: 0,
          marker: 'look forward to + Gerund (-ing)',
          why: {
            1: '"to" di sini adalah preposisi, bukan to-infinitive; kata kerja wajib memakai gerund (-ing).',
            2: 'Bukan bentuk lampau.',
            3: 'Bukan bentuk pasif.'
          },
          note: 'Frasa idiomatis formal "look forward to" selalu diikuti Gerund (Verb-ing): "look forward to HEARING".'
        }
      ]
    }
  ];

  // Lookup peta cepat
  var UNIT_MAP = {};
  UNITS.forEach(function (u) { UNIT_MAP[u.id] = u; });

  var ITEM_MAP = {};
  UNITS.forEach(function (u) {
    (u.items || []).forEach(function (it) {
      it.unitId = u.id;
      it.phaseId = u.phaseId;
      it.grade = u.grade;
      it.genre = u.genre;
      ITEM_MAP[it.id] = it;
    });
  });

  return {
    getPhases: function () {
      return PHASES.slice();
    },
    getPhase: function (id) {
      return PHASES.filter(function (p) { return p.id === id; })[0] || null;
    },
    getUnits: function (filter) {
      filter = filter || {};
      return UNITS.filter(function (u) {
        if (filter.phaseId && u.phaseId !== filter.phaseId) return false;
        if (filter.grade && u.grade !== Number(filter.grade)) return false;
        if (filter.semester && u.semester !== Number(filter.semester)) return false;
        if (filter.genre && u.genre !== filter.genre) return false;
        return true;
      });
    },
    getUnit: function (id) {
      return UNIT_MAP[id] || null;
    },
    getItem: function (id) {
      return ITEM_MAP[id] || null;
    },
    pickItems: function (unitId, count, opts) {
      opts = opts || {};
      var u = UNIT_MAP[unitId];
      if (!u || !u.items || !u.items.length) return [];
      var pool = u.items.slice();
      if (Array.isArray(opts.avoid) && opts.avoid.length) {
        pool = pool.filter(function (it) { return opts.avoid.indexOf(it.id) === -1; });
        if (!pool.length) pool = u.items.slice();
      }
      var seed = typeof opts.seed === 'number' ? opts.seed : 42;
      for (var i = pool.length - 1; i > 0; i--) {
        seed = (seed * 9301 + 49297) % 233280;
        var j = Math.floor((seed / 233280) * (i + 1));
        var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      }
      return pool.slice(0, count || pool.length);
    },
    allUnits: function () {
      return UNITS.slice();
    }
  };
});
