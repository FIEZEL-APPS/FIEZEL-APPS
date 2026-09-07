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
      subChapters: [
        { id: 'd_g7_descriptive_me_1_1', no: '1.1', title: "To Be & Pronouns", feature: "To Be & Pronouns" },
        { id: 'd_g7_descriptive_me_1_2', no: '1.2', title: "Simple Present Tense", feature: "Simple Present Tense" },
        { id: 'd_g7_descriptive_me_1_3', no: '1.3', title: "Adjectives & Adverbs of Frequency", feature: "Adjectives & Adverbs of Frequency" },
      ],
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
          subChapterId: 'd_g7_descriptive_me_1_2', feature: "Simple Present Tense",
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
          subChapterId: 'd_g7_descriptive_me_1_1', feature: "To Be & Pronouns",
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
          subChapterId: 'd_g7_descriptive_me_1_1', feature: "To Be & Pronouns",
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
      ,
        {
          id: "cur_d7_dm_04",
          subChapterId: "d_g7_descriptive_me_1_1", feature: "To Be & Pronouns",
          prompt: "I ___ a student of SMP Negeri 2 Malang, and my best friend Nabila ___ in the same class.",
          options: ["am … is", "is … am", "are … is", "am … are"],
          answer: 0,
          marker: "I + Nabila (tunggal)",
          why: {
            1: "\"is\" tidak pernah dipakai untuk subjek \"I\".",
            2: "\"are\" untuk subjek jamak atau you, bukan untuk \"I\".",
            3: "Nabila adalah satu orang, jadi memakai \"is\", bukan \"are\"."
          },
          note: "To be mengikuti subjeknya: I → am, He/She/It dan nama tunggal → is, You/We/They → are."
        },
        {
          id: "cur_d7_dm_05",
          subChapterId: "d_g7_descriptive_me_1_2", feature: "Simple Present Tense",
          prompt: "My father ___ to the office by motorcycle, but my mother and I ___ the city bus.",
          options: ["goes … take", "go … take", "goes … takes", "go … takes"],
          answer: 0,
          marker: "My father (tunggal) vs my mother and I (jamak)",
          why: {
            1: "Subjek tunggal \"My father\" wajib memakai go-es.",
            2: "\"my mother and I\" adalah subjek jamak (we), jadi kata kerjanya tanpa -s.",
            3: "Dua-duanya salah: yang pertama butuh -es, yang kedua tidak boleh -s."
          },
          note: "Akhiran -s/-es hanya untuk subjek orang ketiga TUNGGAL. Subjek gabungan dengan \"and\" selalu jamak."
        },
        {
          id: "cur_d7_dm_06",
          subChapterId: "d_g7_descriptive_me_1_2", feature: "Simple Present Tense",
          prompt: "Rina ___ like durian, but she loves rambutan and mangosteen.",
          options: ["doesn't", "don't", "not", "isn't"],
          answer: 0,
          marker: "Kalimat negatif + She",
          why: {
            1: "\"don't\" untuk I/you/we/they, bukan untuk She.",
            2: "Kalimat dengan kata kerja aksi tidak bisa dinegasikan dengan \"not\" saja.",
            3: "\"isn't\" adalah to be, tidak bisa berdiri bersama kata kerja aksi \"like\"."
          },
          note: "Negatif Simple Present memakai do/does + not + Verb 1. Untuk He/She/It: does not (doesn't), dan kata kerjanya kembali tanpa -s."
        },
        {
          id: "cur_d7_dm_07",
          subChapterId: "d_g7_descriptive_me_1_3", feature: "Adjectives & Adverbs of Frequency",
          prompt: "Bagas is a diligent student. He ___ late to class.",
          options: ["is never", "never is", "is not never", "never"],
          answer: 0,
          marker: "never + to be",
          why: {
            1: "Adverb of frequency diletakkan SESUDAH to be, bukan sebelumnya.",
            2: "\"never\" sudah bermakna negatif; menambah \"not\" membuat negatif ganda.",
            3: "Kalimat ini butuh to be karena \"late\" adalah kata sifat, bukan kata kerja."
          },
          note: "Urutannya: SESUDAH to be (He is always…), tetapi SEBELUM kata kerja biasa (He always comes…)."
        },
        {
          id: "cur_d7_dm_08",
          subChapterId: "d_g7_descriptive_me_1_3", feature: "Adjectives & Adverbs of Frequency",
          prompt: "My cousin has ___ eyes and a warm smile that makes everyone comfortable.",
          options: ["big brown", "brown big", "big and brown quite", "brown and big"],
          answer: 0,
          marker: "Urutan kata sifat: ukuran sebelum warna",
          why: {
            1: "Warna diletakkan paling dekat dengan kata bendanya, jadi \"brown\" harus di belakang.",
            2: "Susunannya kacau dan \"quite\" tidak berada di posisi yang benar.",
            3: "Dua kata sifat berbeda jenis tidak dihubungkan dengan \"and\" di depan kata benda."
          },
          note: "Urutan kata sifat dalam bahasa Inggris: opini → ukuran → usia → bentuk → warna → asal → bahan. Jadi \"big brown eyes\", bukan \"brown big eyes\"."
        },
        {
          id: "cur_d7_dm_09",
          subChapterId: "d_g7_descriptive_me_1_1", feature: "To Be & Pronouns",
          prompt: "That is Sinta and Maya over there. ___ bags are on the blue bench near the canteen.",
          options: ["Their", "They", "Theirs", "Them"],
          answer: 0,
          marker: "Sebelum kata benda \"bags\"",
          why: {
            1: "\"They\" adalah kata ganti subjek, tidak bisa berdiri sebelum kata benda.",
            2: "\"Theirs\" berdiri sendiri tanpa kata benda: \"The bags are theirs.\"",
            3: "\"Them\" adalah kata ganti objek, bukan penunjuk kepemilikan."
          },
          note: "Possessive adjective (my, your, his, her, its, our, their) SELALU diikuti kata benda. Possessive pronoun (mine, yours, his, hers, ours, theirs) berdiri sendiri."
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
      subChapters: [
        { id: 'd_g7_procedure_culinary_2_1', no: '2.1', title: "Imperative & Action Verbs", feature: "Imperative & Action Verbs" },
        { id: 'd_g7_procedure_culinary_2_2', no: '2.2', title: "Sequencing Connectives", feature: "Sequencing Connectives" },
        { id: 'd_g7_procedure_culinary_2_3', no: '2.3', title: "Adverbials of Measure", feature: "Adverbials of Measure" },
      ],
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
          subChapterId: 'd_g7_procedure_culinary_2_1', feature: "Imperative & Action Verbs",
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
          subChapterId: 'd_g7_procedure_culinary_2_2', feature: "Sequencing Connectives",
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
      ,
        {
          id: "cur_d7_pc_03",
          subChapterId: "d_g7_procedure_culinary_2_1", feature: "Imperative & Action Verbs",
          prompt: "___ the pan on medium heat before you add the shallots, or the garlic will burn.",
          options: ["Heat", "Heats", "Heating", "To heat"],
          answer: 0,
          marker: "Awal kalimat perintah",
          why: {
            1: "Kalimat perintah tidak pernah memakai akhiran -s.",
            2: "Bentuk -ing dipakai setelah to be, bukan sebagai perintah.",
            3: "\"To heat\" adalah infinitive, bukan bentuk perintah."
          },
          note: "Kalimat perintah (imperative) memakai Verb 1 telanjang tanpa subjek dan tanpa akhiran apa pun."
        },
        {
          id: "cur_d7_pc_04",
          subChapterId: "d_g7_procedure_culinary_2_1", feature: "Imperative & Action Verbs",
          prompt: "___ open the lid while the rice is still steaming.",
          options: ["Don't", "No", "Not", "Never to"],
          answer: 0,
          marker: "Larangan dalam resep",
          why: {
            1: "\"No\" tidak dipakai untuk melarang kata kerja.",
            2: "\"Not\" tidak bisa berdiri sendiri di depan kata kerja perintah.",
            3: "\"Never to\" bukan bentuk larangan yang benar."
          },
          note: "Larangan dalam teks prosedur: Do not / Don't + Verb 1. Contoh: \"Don't stir too fast.\""
        },
        {
          id: "cur_d7_pc_05",
          subChapterId: "d_g7_procedure_culinary_2_2", feature: "Sequencing Connectives",
          prompt: "Mix the flour and sugar. ___, pour the coconut milk slowly while stirring.",
          options: ["After that", "After", "Afterwards that", "Later that"],
          answer: 0,
          marker: "Penghubung antar langkah",
          why: {
            1: "\"After\" butuh klausa di belakangnya: \"After you mix the flour…\".",
            2: "\"Afterwards that\" bukan bentuk yang benar dalam bahasa Inggris.",
            3: "\"Later that\" tidak lengkap; harus diikuti kata benda waktu, misalnya \"later that day\"."
          },
          note: "Penghubung urutan yang berdiri sendiri di awal kalimat: First, Next, Then, After that, Finally."
        },
        {
          id: "cur_d7_pc_06",
          subChapterId: "d_g7_procedure_culinary_2_2", feature: "Sequencing Connectives",
          prompt: "___, serve the es cendol in a tall glass with shaved ice.",
          options: ["Finally", "At the end of", "In the final", "Lastly of"],
          answer: 0,
          marker: "Langkah penutup resep",
          why: {
            1: "\"At the end of\" harus diikuti kata benda: \"at the end of the process\".",
            2: "\"In the final\" tidak lengkap tanpa kata benda.",
            3: "\"Lastly of\" bukan bentuk yang benar."
          },
          note: "Langkah terakhir dalam teks prosedur biasanya ditandai Finally atau Lastly, lalu koma."
        },
        {
          id: "cur_d7_pc_07",
          subChapterId: "d_g7_procedure_culinary_2_3", feature: "Adverbials of Measure",
          prompt: "Add ___ of palm sugar and stir until it dissolves completely.",
          options: ["two tablespoons", "two tablespoon", "two tablespoones", "a two tablespoons"],
          answer: 0,
          marker: "Ukuran jamak",
          why: {
            1: "Angka dua menuntut bentuk jamak: tablespoons.",
            2: "Bentuk jamak yang benar adalah tablespoons, bukan tablespoones.",
            3: "Artikel \"a\" tidak bisa berdiri bersama angka \"two\"."
          },
          note: "Satuan takaran mengikuti aturan jamak biasa: one teaspoon, two teaspoons, three cups."
        },
        {
          id: "cur_d7_pc_08",
          subChapterId: "d_g7_procedure_culinary_2_3", feature: "Adverbials of Measure",
          prompt: "Steam the cassava cake for ___ until a toothpick comes out clean.",
          options: ["about 25 minutes", "about 25 minute", "in about 25 minutes long", "around 25 of minutes"],
          answer: 0,
          marker: "Keterangan durasi",
          why: {
            1: "25 menit adalah jamak, jadi \"minutes\".",
            2: "\"in … long\" berlebihan dan tidak lazim dalam resep.",
            3: "\"25 of minutes\" bukan bentuk yang benar."
          },
          note: "Durasi dalam resep memakai \"for + jumlah waktu\": for 10 minutes, for half an hour."
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
      subChapters: [
        { id: 'd_g8_recount_independence_1_1', no: '1.1', title: "Simple Past Tense", feature: "Simple Past Tense" },
        { id: 'd_g8_recount_independence_1_2', no: '1.2', title: "Irregular Verbs", feature: "Irregular Verbs" },
        { id: 'd_g8_recount_independence_1_3', no: '1.3', title: "Time Connectives", feature: "Time Connectives" },
      ],
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
          subChapterId: 'd_g8_recount_independence_1_1', feature: "Simple Past Tense",
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
          subChapterId: 'd_g8_recount_independence_1_2', feature: "Irregular Verbs",
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
      ,
        {
          id: "cur_d8_rc_03",
          subChapterId: "d_g8_recount_independence_1_1", feature: "Simple Past Tense",
          prompt: "Last Saturday our class ___ the classroom with red and white paper chains.",
          options: ["decorated", "decorate", "was decorate", "has decorated"],
          answer: 0,
          marker: "Last Saturday",
          why: {
            1: "Keterangan waktu lampau menuntut bentuk lampau, bukan Verb 1.",
            2: "\"was decorate\" mencampur to be dengan Verb 1; bentuk pasifnya seharusnya \"was decorated\".",
            3: "Present Perfect tidak dipakai bersama keterangan waktu lampau yang spesifik."
          },
          note: "Recount memakai Simple Past. Keterangan waktu lampau (last week, yesterday, in 2024) mengunci bentuk kata kerjanya."
        },
        {
          id: "cur_d8_rc_04",
          subChapterId: "d_g8_recount_independence_1_2", feature: "Irregular Verbs",
          prompt: "The headmaster ___ a short speech before the flag was raised.",
          options: ["gave", "gived", "given", "was gave"],
          answer: 0,
          marker: "Kata kerja tak beraturan",
          why: {
            1: "\"gived\" tidak ada; give termasuk kata kerja tak beraturan.",
            2: "\"given\" adalah Verb 3, dipakai untuk perfect atau pasif.",
            3: "\"was gave\" mencampur pasif dengan Verb 2."
          },
          note: "Kata kerja tak beraturan tidak menerima -ed: give-gave-given, take-took-taken, run-ran-run."
        },
        {
          id: "cur_d8_rc_05",
          subChapterId: "d_g8_recount_independence_1_2", feature: "Irregular Verbs",
          prompt: "We ___ so much fun that nobody wanted to go home when the event ended.",
          options: ["had", "haved", "have", "were had"],
          answer: 0,
          marker: "Bentuk lampau dari have",
          why: {
            1: "\"haved\" tidak ada dalam bahasa Inggris.",
            2: "\"have\" adalah bentuk sekarang, tidak cocok dengan \"ended\".",
            3: "\"were had\" bukan bentuk yang benar untuk makna ini."
          },
          note: "have-had-had. Perhatikan bahwa satu kalimat harus konsisten waktunya: \"had … ended\"."
        },
        {
          id: "cur_d8_rc_06",
          subChapterId: "d_g8_recount_independence_1_3", feature: "Time Connectives",
          prompt: "The sack race started at nine. ___, the tug-of-war began in the school field.",
          options: ["An hour later", "An hour late", "After an hour later", "In an hour later"],
          answer: 0,
          marker: "Penanda urutan waktu",
          why: {
            1: "\"late\" berarti terlambat, bukan kemudian.",
            2: "\"After … later\" berlebihan; pilih salah satu.",
            3: "\"In an hour later\" mencampur dua bentuk keterangan waktu."
          },
          note: "Penghubung waktu dalam recount: First, Then, After that, A few minutes later, Finally."
        },
        {
          id: "cur_d8_rc_07",
          subChapterId: "d_g8_recount_independence_1_3", feature: "Time Connectives",
          prompt: "___ we arrived at the field, the panitia had already prepared the flag pole.",
          options: ["By the time", "By time", "At the time when", "On the time"],
          answer: 0,
          marker: "Penghubung dua kejadian lampau",
          why: {
            1: "\"By time\" tidak lengkap; artikel \"the\" wajib ada.",
            2: "\"At the time when\" berlebihan dan tidak lazim.",
            3: "\"On the time\" bukan bentuk yang benar."
          },
          note: "\"By the time + klausa\" menandai satu kejadian sudah selesai sebelum kejadian lain terjadi."
        },
        {
          id: "cur_d8_rc_08",
          subChapterId: "d_g8_recount_independence_1_1", feature: "Simple Past Tense",
          prompt: "___ your class join the pole climbing competition last year?",
          options: ["Did", "Does", "Was", "Did not"],
          answer: 0,
          marker: "Kalimat tanya lampau",
          why: {
            1: "\"Does\" adalah bentuk sekarang, bertabrakan dengan \"last year\".",
            2: "\"Was\" adalah to be; kalimat ini punya kata kerja aksi \"join\".",
            3: "\"Did not\" membentuk pertanyaan negatif, bukan pertanyaan biasa."
          },
          note: "Pertanyaan Simple Past: Did + Subjek + Verb 1. Kata kerjanya kembali ke bentuk dasar karena \"did\" sudah menandai waktu lampau."
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
      subChapters: [
        { id: 'd_g8_narrative_fables_2_1', no: '2.1', title: "Past Continuous Tense", feature: "Past Continuous Tense" },
        { id: 'd_g8_narrative_fables_2_2', no: '2.2', title: "Modals & Moral Lesson", feature: "Modals & Moral Lesson" },
        { id: 'd_g8_narrative_fables_2_3', no: '2.3', title: "Direct Speech", feature: "Direct Speech" },
      ],
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
          subChapterId: 'd_g8_narrative_fables_2_1', feature: "Past Continuous Tense",
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
          subChapterId: 'd_g8_narrative_fables_2_2', feature: "Modals & Moral Lesson",
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
      ,
        {
          id: "cur_d8_nar_03",
          subChapterId: "d_g8_narrative_fables_2_1", feature: "Past Continuous Tense",
          prompt: "The farmer ___ in the rice field when he heard a strange cry from the bushes.",
          options: ["was working", "worked", "were working", "has worked"],
          answer: 0,
          marker: "Latar berlangsung + when + kejadian tiba-tiba",
          why: {
            1: "Simple Past tidak memberi kesan latar yang sedang berlangsung.",
            2: "\"were\" untuk subjek jamak; \"the farmer\" tunggal.",
            3: "Present Perfect tidak dipakai dalam narasi lampau."
          },
          note: "Pola narasi: Past Continuous untuk latar yang sedang berlangsung, dipotong Simple Past untuk kejadian tiba-tiba."
        },
        {
          id: "cur_d8_nar_04",
          subChapterId: "d_g8_narrative_fables_2_1", feature: "Past Continuous Tense",
          prompt: "While the deer ___ near the river, the crocodile quietly crept closer.",
          options: ["was drinking", "drank", "is drinking", "drink"],
          answer: 0,
          marker: "While + latar berlangsung",
          why: {
            1: "\"While\" hampir selalu berpasangan dengan Past Continuous dalam narasi.",
            2: "\"is drinking\" bentuk sekarang, bertabrakan dengan \"crept\".",
            3: "\"drink\" tidak menandai waktu lampau sama sekali."
          },
          note: "While + Past Continuous, when + Simple Past. Keduanya menyusun ketegangan dalam fabel."
        },
        {
          id: "cur_d8_nar_05",
          subChapterId: "d_g8_narrative_fables_2_2", feature: "Modals & Moral Lesson",
          prompt: "The fable reminds us that we ___ always help friends in need, even when we are busy.",
          options: ["should", "should to", "shall to", "are should"],
          answer: 0,
          marker: "Modal + Verb 1",
          why: {
            1: "Modal tidak pernah diikuti \"to\".",
            2: "\"shall to\" salah dua kali: modal tidak berpasangan dengan \"to\".",
            3: "Modal tidak berdiri bersama to be."
          },
          note: "Modal (should, must, can, may) selalu diikuti Verb 1 telanjang: should help, must go."
        },
        {
          id: "cur_d8_nar_06",
          subChapterId: "d_g8_narrative_fables_2_2", feature: "Modals & Moral Lesson",
          prompt: "The greedy monkey learned that he ___ have shared the bananas with his friends.",
          options: ["should", "must", "can", "would to"],
          answer: 0,
          marker: "Penyesalan atas kejadian lampau",
          why: {
            1: "\"must have\" berarti dugaan kuat, bukan penyesalan.",
            2: "\"can have\" tidak dipakai untuk penyesalan.",
            3: "\"would to\" bukan bentuk yang benar."
          },
          note: "\"Should have + Verb 3\" menyatakan penyesalan: seharusnya dilakukan, tetapi tidak dilakukan."
        },
        {
          id: "cur_d8_nar_07",
          subChapterId: "d_g8_narrative_fables_2_3", feature: "Direct Speech",
          prompt: "\"Please help me climb out of this well,\" ___ the little goat sadly.",
          options: ["said", "say", "says", "was said"],
          answer: 0,
          marker: "Kutipan langsung dalam narasi lampau",
          why: {
            1: "\"say\" tidak menandai waktu lampau.",
            2: "\"says\" bentuk sekarang, bertabrakan dengan cerita lampau.",
            3: "\"was said\" pasif; di sini pelakunya jelas (the little goat)."
          },
          note: "Kutipan langsung dalam fabel memakai kata kerja lampau: said, replied, shouted, whispered."
        },
        {
          id: "cur_d8_nar_08",
          subChapterId: "d_g8_narrative_fables_2_3", feature: "Direct Speech",
          prompt: "The old turtle said, ___ never judge someone by how slowly they walk.\"",
          options: ["\"We", "\"we", "We", "we"],
          answer: 0,
          marker: "Tanda kutip dan huruf besar",
          why: {
            1: "Kalimat dalam kutipan langsung dimulai dengan huruf besar.",
            2: "Tanda kutip pembuka wajib ada karena kutipan penutupnya sudah ada.",
            3: "Keduanya salah: tanpa tanda kutip dan tanpa huruf besar."
          },
          note: "Kutipan langsung: koma sebelum tanda kutip, huruf besar di awal kutipan, tanda baca akhir DI DALAM tanda kutip."
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
      subChapters: [
        { id: 'd_g9_report_fauna_1_1', no: '1.1', title: "Passive Voice Dasar", feature: "Passive Voice Dasar" },
        { id: 'd_g9_report_fauna_1_2', no: '1.2', title: "Simple Present untuk Fakta Umum", feature: "Simple Present untuk Fakta Umum" },
        { id: 'd_g9_report_fauna_1_3', no: '1.3', title: "Technical Noun Phrases", feature: "Technical Noun Phrases" },
      ],
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
          subChapterId: 'd_g9_report_fauna_1_1', feature: "Passive Voice Dasar",
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
          subChapterId: 'd_g9_report_fauna_1_2', feature: "Simple Present untuk Fakta Umum",
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
      ,
        {
          id: "cur_d9_rp_03",
          subChapterId: "d_g9_report_fauna_1_1", feature: "Passive Voice Dasar",
          prompt: "Komodo dragons ___ only on a few islands in East Nusa Tenggara.",
          options: ["are found", "are find", "is found", "finds"],
          answer: 0,
          marker: "Komodo dragons (jamak) + pasif",
          why: {
            1: "Pasif memakai Verb 3 (found), bukan Verb 1.",
            2: "\"is\" untuk subjek tunggal; \"dragons\" jamak.",
            3: "\"finds\" bentuk aktif, padahal komodo adalah yang ditemukan."
          },
          note: "Pasif Simple Present: am/is/are + Verb 3. Dipakai dalam teks report karena yang penting objeknya, bukan pelakunya."
        },
        {
          id: "cur_d9_rp_04",
          subChapterId: "d_g9_report_fauna_1_1", feature: "Passive Voice Dasar",
          prompt: "Rafflesia arnoldii ___ the largest individual flower in the world.",
          options: ["is considered", "is consider", "considers", "are considered"],
          answer: 0,
          marker: "Nama spesies tunggal + pasif",
          why: {
            1: "Pasif menuntut Verb 3: considered.",
            2: "Bentuk aktif tidak masuk akal; bunganya yang dianggap, bukan yang menganggap.",
            3: "Nama satu spesies diperlakukan tunggal, jadi \"is\"."
          },
          note: "Nama ilmiah satu spesies diperlakukan sebagai subjek tunggal."
        },
        {
          id: "cur_d9_rp_05",
          subChapterId: "d_g9_report_fauna_1_2", feature: "Simple Present untuk Fakta Umum",
          prompt: "The Javan rhino ___ mainly on leaves, twigs, and fallen fruit.",
          options: ["feeds", "feed", "is feeding", "fed"],
          answer: 0,
          marker: "Fakta umum + subjek tunggal",
          why: {
            1: "Subjek tunggal menuntut akhiran -s.",
            2: "Present Continuous menggambarkan saat ini saja, bukan fakta yang selalu benar.",
            3: "Bentuk lampau tidak dipakai untuk fakta umum."
          },
          note: "Teks report memakai Simple Present karena isinya fakta yang berlaku umum, bukan kejadian sekali."
        },
        {
          id: "cur_d9_rp_06",
          subChapterId: "d_g9_report_fauna_1_2", feature: "Simple Present untuk Fakta Umum",
          prompt: "Unlike other primates, tarsiers ___ their heads almost 180 degrees.",
          options: ["can turn", "can turns", "cans turn", "turning"],
          answer: 0,
          marker: "Modal + Verb 1",
          why: {
            1: "Modal tidak pernah diikuti kata kerja ber-akhiran -s.",
            2: "Modal tidak pernah menerima akhiran -s sendiri.",
            3: "Bentuk -ing tidak bisa berdiri sebagai kata kerja utama tanpa to be."
          },
          note: "Modal \"can\" menyatakan kemampuan alami makhluk hidup dan selalu diikuti Verb 1."
        },
        {
          id: "cur_d9_rp_07",
          subChapterId: "d_g9_report_fauna_1_3", feature: "Technical Noun Phrases",
          prompt: "The ___ of Kalimantan provide a habitat for thousands of endemic species.",
          options: ["dense tropical rainforests", "rainforests dense tropical", "tropical dense rainforest", "dense rainforests tropical"],
          answer: 0,
          marker: "Urutan frasa benda teknis",
          why: {
            1: "Kata sifat selalu mendahului kata bendanya dalam bahasa Inggris.",
            2: "\"rainforest\" tunggal bertabrakan dengan \"provide\" yang jamak.",
            3: "Kata sifat tidak boleh terpisah di belakang kata benda."
          },
          note: "Frasa benda teknis: (kata sifat) + (kata sifat) + kata benda inti. Contoh: \"large marine mammals\"."
        },
        {
          id: "cur_d9_rp_08",
          subChapterId: "d_g9_report_fauna_1_3", feature: "Technical Noun Phrases",
          prompt: "Sumatran tigers are apex predators, ___ means they sit at the top of the food chain.",
          options: ["which", "who", "that", "what"],
          answer: 0,
          marker: "Klausa penjelas setelah koma",
          why: {
            1: "\"who\" hanya untuk manusia.",
            2: "\"that\" tidak dipakai dalam klausa non-defining sesudah koma.",
            3: "\"what\" tidak berfungsi sebagai kata penghubung relatif di sini."
          },
          note: "Sesudah koma, klausa penjelas memakai \"which\" untuk merujuk benda atau seluruh gagasan sebelumnya."
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
      subChapters: [
        { id: 'e_g10_analytical_youth_4_1', no: '4.1', title: "Causal Connectors", feature: "Causal Connectors" },
        { id: 'e_g10_analytical_youth_4_2', no: '4.2', title: "Mental Verbs & Thesis", feature: "Mental Verbs & Thesis" },
        { id: 'e_g10_analytical_youth_4_3', no: '4.3', title: "Subject-Verb Agreement Lanjut", feature: "Subject-Verb Agreement Lanjut" },
      ],
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
          subChapterId: 'e_g10_analytical_youth_4_1', feature: "Causal Connectors",
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
          subChapterId: 'e_g10_analytical_youth_4_3', feature: "Subject-Verb Agreement Lanjut",
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
      ,
        {
          id: "cur_e10_ae_03",
          subChapterId: "e_g10_analytical_youth_4_1", feature: "Causal Connectors",
          prompt: "___ the rapid spread of misinformation, media literacy should be taught from junior high school.",
          options: ["Due to", "Due", "Because", "Therefore"],
          answer: 0,
          marker: "Diikuti frasa benda, bukan klausa",
          why: {
            1: "\"Due\" tidak bisa berdiri tanpa \"to\".",
            2: "\"Because\" harus diikuti klausa lengkap (subjek + kata kerja).",
            3: "\"Therefore\" menandai akibat, bukan sebab."
          },
          note: "Due to / Because of + FRASA BENDA. Because / Since + KLAUSA lengkap."
        },
        {
          id: "cur_e10_ae_04",
          subChapterId: "e_g10_analytical_youth_4_1", feature: "Causal Connectors",
          prompt: "Screen time before bed suppresses melatonin; ___, teenagers struggle to fall asleep.",
          options: ["consequently", "because", "although", "whereas"],
          answer: 0,
          marker: "Titik koma + akibat",
          why: {
            1: "\"because\" menandai sebab, padahal bagian kedua adalah akibatnya.",
            2: "\"although\" menandai pertentangan, bukan akibat.",
            3: "\"whereas\" membandingkan dua hal berbeda, bukan menyimpulkan akibat."
          },
          note: "Penghubung akibat: therefore, consequently, as a result, thus. Semuanya diikuti koma."
        },
        {
          id: "cur_e10_ae_05",
          subChapterId: "e_g10_analytical_youth_4_2", feature: "Mental Verbs & Thesis",
          prompt: "Educators ___ that structured screen-free hours improve classroom focus significantly.",
          options: ["believe", "believes", "are believe", "believing"],
          answer: 0,
          marker: "Educators (jamak)",
          why: {
            1: "Subjek jamak tidak memakai akhiran -s.",
            2: "\"are believe\" mencampur to be dengan Verb 1.",
            3: "Bentuk -ing tidak bisa jadi kata kerja utama tanpa to be."
          },
          note: "Mental verbs (believe, think, realize, assume) membawa pendapat penulis dalam eksposisi analitis."
        },
        {
          id: "cur_e10_ae_06",
          subChapterId: "e_g10_analytical_youth_4_2", feature: "Mental Verbs & Thesis",
          prompt: "This essay ___ that schools should provide counselling for digital addiction.",
          options: ["argues", "argue", "is argued", "arguing"],
          answer: 0,
          marker: "This essay (tunggal)",
          why: {
            1: "Subjek tunggal menuntut akhiran -s.",
            2: "Pasif membuat penulisnya hilang, padahal esai inilah yang berargumen.",
            3: "Bentuk -ing tidak bisa berdiri sendiri."
          },
          note: "Kalimat tesis eksposisi sering memakai: This essay argues / maintains / contends that…"
        },
        {
          id: "cur_e10_ae_07",
          subChapterId: "e_g10_analytical_youth_4_3", feature: "Subject-Verb Agreement Lanjut",
          prompt: "The number of students who report anxiety ___ risen sharply in the last five years.",
          options: ["has", "have", "are", "is"],
          answer: 0,
          marker: "The number of (tunggal)",
          why: {
            1: "\"The number of\" selalu diperlakukan TUNGGAL, meski diikuti kata benda jamak.",
            2: "\"are\" tidak berpasangan dengan \"risen\".",
            3: "\"is risen\" bukan bentuk yang benar; rise adalah kata kerja tak berobjek."
          },
          note: "\"The number of + jamak\" → tunggal (has). \"A number of + jamak\" → jamak (have). Perbedaan ini sering tertukar."
        },
        {
          id: "cur_e10_ae_08",
          subChapterId: "e_g10_analytical_youth_4_3", feature: "Subject-Verb Agreement Lanjut",
          prompt: "Neither the teachers nor the principal ___ willing to ignore the problem.",
          options: ["is", "are", "were", "have"],
          answer: 0,
          marker: "Neither … nor + subjek terdekat",
          why: {
            1: "Kata kerja mengikuti subjek TERDEKAT, yaitu \"the principal\" yang tunggal.",
            2: "\"were\" bentuk lampau, tidak cocok dengan konteks sekarang.",
            3: "\"have willing\" bukan bentuk yang benar."
          },
          note: "Pada \"either … or\" dan \"neither … nor\", kata kerja menyesuaikan subjek yang PALING DEKAT dengannya."
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
      subChapters: [
        { id: 'f_g11_explanation_phenomena_3_1', no: '3.1', title: "Passive Voice Intensif", feature: "Passive Voice Intensif" },
        { id: 'f_g11_explanation_phenomena_3_2', no: '3.2', title: "Cause-and-Effect Connectors", feature: "Cause-and-Effect Connectors" },
        { id: 'f_g11_explanation_phenomena_3_3', no: '3.3', title: "Relative Clause", feature: "Relative Clause" },
      ],
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
          subChapterId: 'f_g11_explanation_phenomena_3_3', feature: "Relative Clause",
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
          subChapterId: 'f_g11_explanation_phenomena_3_1', feature: "Passive Voice Intensif",
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
      ,
        {
          id: "cur_f11_ex_03",
          subChapterId: "f_g11_explanation_phenomena_3_1", feature: "Passive Voice Intensif",
          prompt: "Water vapour ___ into tiny droplets as it rises and cools in the atmosphere.",
          options: ["is condensed", "condenses it", "is condensing by", "condensed"],
          answer: 0,
          marker: "Proses ilmiah + pasif",
          why: {
            1: "\"condenses it\" menambah objek yang tidak ada.",
            2: "\"is condensing by\" mencampur bentuk berlangsung dengan pelaku yang tidak disebut.",
            3: "Bentuk lampau tidak dipakai untuk proses yang selalu terjadi."
          },
          note: "Teks eksplanasi memakai pasif Simple Present karena yang penting prosesnya, bukan siapa pelakunya."
        },
        {
          id: "cur_f11_ex_04",
          subChapterId: "f_g11_explanation_phenomena_3_1", feature: "Passive Voice Intensif",
          prompt: "Once the magma chamber is full, enormous pressure ___ beneath the volcanic crust.",
          options: ["builds up", "is built up by", "building up", "built"],
          answer: 0,
          marker: "Kata kerja tak berobjek dalam proses alam",
          why: {
            1: "Pasif salah di sini: \"build up\" tidak berobjek, jadi tidak bisa dipasifkan.",
            2: "Bentuk -ing tidak berdiri sendiri sebagai kata kerja utama.",
            3: "Bentuk lampau bertabrakan dengan \"is full\"."
          },
          note: "Tidak semua kalimat eksplanasi pasif. Kata kerja tak berobjek (rise, build up, occur, expand) tetap aktif."
        },
        {
          id: "cur_f11_ex_05",
          subChapterId: "f_g11_explanation_phenomena_3_2", feature: "Cause-and-Effect Connectors",
          prompt: "Deforestation removes root systems that hold the soil; ___, landslides occur more frequently.",
          options: ["as a result", "as result", "result in", "as a resulting"],
          answer: 0,
          marker: "Frasa penghubung akibat",
          why: {
            1: "\"as result\" kurang artikel \"a\".",
            2: "\"result in\" adalah kata kerja, bukan penghubung antar kalimat.",
            3: "\"as a resulting\" bukan bentuk yang benar."
          },
          note: "Frasa penghubung akibat: as a result, consequently, therefore. Ketiganya diikuti koma."
        },
        {
          id: "cur_f11_ex_06",
          subChapterId: "f_g11_explanation_phenomena_3_2", feature: "Cause-and-Effect Connectors",
          prompt: "The greenhouse effect traps infrared radiation, ___ leads to a gradual rise in global temperature.",
          options: ["which", "what", "it", "and it which"],
          answer: 0,
          marker: "Klausa relatif merujuk seluruh gagasan",
          why: {
            1: "\"what\" tidak berfungsi sebagai penghubung relatif.",
            2: "\"it\" akan membentuk dua kalimat yang disambung koma saja (comma splice).",
            3: "\"and it which\" berlebihan."
          },
          note: "\"…, which leads to…\" menghubungkan akibat ke SELURUH klausa sebelumnya — pola khas teks eksplanasi."
        },
        {
          id: "cur_f11_ex_07",
          subChapterId: "f_g11_explanation_phenomena_3_3", feature: "Relative Clause",
          prompt: "The layer ___ absorbs most ultraviolet radiation is called the ozone layer.",
          options: ["that", "what", "which is", "who"],
          answer: 0,
          marker: "Klausa defining tanpa koma",
          why: {
            1: "\"what\" bukan penghubung relatif.",
            2: "\"which is\" menambah to be yang membuat kalimat punya dua kata kerja utama.",
            3: "\"who\" hanya untuk manusia."
          },
          note: "Klausa defining (tanpa koma) memakai that/which untuk benda, dan menerangkan kata benda tepat sebelumnya."
        },
        {
          id: "cur_f11_ex_08",
          subChapterId: "f_g11_explanation_phenomena_3_3", feature: "Relative Clause",
          prompt: "Tectonic plates, ___ move only a few centimetres a year, shape entire mountain ranges.",
          options: ["which", "that", "they", "who"],
          answer: 0,
          marker: "Klausa non-defining di antara dua koma",
          why: {
            1: "\"that\" tidak pernah dipakai dalam klausa non-defining.",
            2: "\"they\" membuat kalimat kehilangan penghubung.",
            3: "\"who\" hanya untuk manusia."
          },
          note: "Di antara dua koma (non-defining), gunakan \"which\" untuk benda dan \"who\" untuk orang. \"That\" dilarang di posisi ini."
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
      subChapters: [
        { id: 'f_g12_discussion_dialectics_1_1', no: '1.1', title: "Contrastive Connectors", feature: "Contrastive Connectors" },
        { id: 'f_g12_discussion_dialectics_1_2', no: '1.2', title: "Conditional Sentences", feature: "Conditional Sentences" },
        { id: 'f_g12_discussion_dialectics_1_3', no: '1.3', title: "Modal Hedging", feature: "Modal Hedging" },
      ],
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
          subChapterId: 'f_g12_discussion_dialectics_1_1', feature: "Contrastive Connectors",
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
          subChapterId: 'f_g12_discussion_dialectics_1_2', feature: "Conditional Sentences",
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
      ,
        {
          id: "cur_f12_disc_03",
          subChapterId: "f_g12_discussion_dialectics_1_1", feature: "Contrastive Connectors",
          prompt: "Online learning widens access to education; ___, it deepens the gap for students without stable internet.",
          options: ["however", "moreover", "therefore", "for instance"],
          answer: 0,
          marker: "Titik koma + sisi berlawanan",
          why: {
            1: "\"moreover\" menambah gagasan searah, bukan melawan.",
            2: "\"therefore\" menandai akibat, bukan pertentangan.",
            3: "\"for instance\" memperkenalkan contoh, bukan sisi lain."
          },
          note: "Teks diskusi menyeimbangkan dua sisi. Penghubung pertentangan: however, nevertheless, on the other hand, conversely."
        },
        {
          id: "cur_f12_disc_04",
          subChapterId: "f_g12_discussion_dialectics_1_1", feature: "Contrastive Connectors",
          prompt: "___ supporters emphasise economic growth, opponents point to irreversible environmental damage.",
          options: ["While", "Despite", "In spite of", "However"],
          answer: 0,
          marker: "Diikuti klausa lengkap",
          why: {
            1: "\"Despite\" diikuti frasa benda, bukan klausa.",
            2: "\"In spite of\" juga menuntut frasa benda.",
            3: "\"However\" tidak menyambung dua klausa dalam satu kalimat tanpa titik koma."
          },
          note: "While / Whereas + KLAUSA. Despite / In spite of + FRASA BENDA. Tertukarnya keduanya adalah kesalahan paling sering di teks diskusi."
        },
        {
          id: "cur_f12_disc_05",
          subChapterId: "f_g12_discussion_dialectics_1_2", feature: "Conditional Sentences",
          prompt: "If the regulation ___ enforced consistently, the plastic waste problem would decrease within a decade.",
          options: ["were", "was", "is", "will be"],
          answer: 0,
          marker: "Conditional tipe 2 + would",
          why: {
            1: "Dalam conditional tipe 2 formal, \"were\" dipakai untuk semua subjek.",
            2: "\"is\" milik conditional tipe 1, yang berpasangan dengan \"will\".",
            3: "\"will be\" tidak pernah muncul di klausa if."
          },
          note: "Conditional tipe 2 (pengandaian): If + Past (were), … would + Verb 1. Menandai situasi yang belum terjadi."
        },
        {
          id: "cur_f12_disc_06",
          subChapterId: "f_g12_discussion_dialectics_1_2", feature: "Conditional Sentences",
          prompt: "If policymakers ___ to the scientific evidence earlier, the crisis would not have escalated.",
          options: ["had listened", "listened", "have listened", "would listen"],
          answer: 0,
          marker: "would not HAVE escalated",
          why: {
            1: "\"listened\" milik tipe 2, tidak berpasangan dengan \"would have\".",
            2: "Present Perfect tidak muncul di klausa if pengandaian lampau.",
            3: "\"would\" tidak pernah muncul di klausa if."
          },
          note: "Conditional tipe 3 (penyesalan atas masa lalu): If + had + Verb 3, … would have + Verb 3."
        },
        {
          id: "cur_f12_disc_07",
          subChapterId: "f_g12_discussion_dialectics_1_3", feature: "Modal Hedging",
          prompt: "The data ___ suggest that a full ban is the only viable solution, though further research is needed.",
          options: ["may", "must", "will definitely", "shall"],
          answer: 0,
          marker: "though further research is needed",
          why: {
            1: "\"must\" terlalu pasti untuk kesimpulan yang masih butuh riset.",
            2: "\"will definitely\" bertentangan dengan keraguan di klausa kedua.",
            3: "\"shall\" menandai janji atau kewajiban, bukan kemungkinan."
          },
          note: "Modal hedging (may, might, could, appear to, tend to) membuat klaim akademis jujur terhadap batas buktinya."
        },
        {
          id: "cur_f12_disc_08",
          subChapterId: "f_g12_discussion_dialectics_1_3", feature: "Modal Hedging",
          prompt: "Critics argue that the policy ___ have unintended consequences for small businesses.",
          options: ["could", "can to", "could to", "is could"],
          answer: 0,
          marker: "Modal + Verb 1",
          why: {
            1: "Modal tidak pernah diikuti \"to\".",
            2: "\"could to\" salah karena alasan yang sama.",
            3: "Modal tidak berdiri bersama to be."
          },
          note: "Semua modal (can, could, may, might, should, must) diikuti Verb 1 telanjang."
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
      subChapters: [
        { id: 'f_g12_career_app_letter_cv_3_1', no: '3.1', title: "Formal Register", feature: "Formal Register" },
        { id: 'f_g12_career_app_letter_cv_3_2', no: '3.2', title: "Gerund & Infinitive", feature: "Gerund & Infinitive" },
        { id: 'f_g12_career_app_letter_cv_3_3', no: '3.3', title: "Present Perfect for Accomplishments", feature: "Present Perfect for Accomplishments" },
      ],
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
          subChapterId: 'f_g12_career_app_letter_cv_3_1', feature: "Formal Register",
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
          subChapterId: 'f_g12_career_app_letter_cv_3_2', feature: "Gerund & Infinitive",
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
      ,
        {
          id: "cur_f12_job_03",
          subChapterId: "f_g12_career_app_letter_cv_3_1", feature: "Formal Register",
          prompt: "___ Sir or Madam, I am writing in response to your advertisement in Kompas.",
          options: ["Dear", "Dearest", "Hi", "To"],
          answer: 0,
          marker: "Salam pembuka surat resmi",
          why: {
            1: "\"Dearest\" terlalu akrab untuk surat lamaran.",
            2: "\"Hi\" tidak resmi.",
            3: "\"To Sir or Madam\" bukan bentuk salam yang lazim."
          },
          note: "Surat resmi tanpa nama penerima: \"Dear Sir or Madam,\". Kalau namanya diketahui: \"Dear Ms. Wulandari,\"."
        },
        {
          id: "cur_f12_job_04",
          subChapterId: "f_g12_career_app_letter_cv_3_1", feature: "Formal Register",
          prompt: "I would be grateful ___ you could consider my application for this position.",
          options: ["if", "that", "when", "for"],
          answer: 0,
          marker: "Permintaan sopan bersyarat",
          why: {
            1: "\"that\" tidak berpasangan dengan \"would be grateful\" dalam pola ini.",
            2: "\"when\" menandai waktu, bukan syarat sopan.",
            3: "\"for\" harus diikuti kata benda atau bentuk -ing."
          },
          note: "Pola sopan surat lamaran: \"I would be grateful if you could…\", \"I would appreciate it if…\"."
        },
        {
          id: "cur_f12_job_05",
          subChapterId: "f_g12_career_app_letter_cv_3_2", feature: "Gerund & Infinitive",
          prompt: "I am interested in ___ my analytical skills to support your marketing team.",
          options: ["applying", "apply", "to apply", "applied"],
          answer: 0,
          marker: "interested IN + gerund",
          why: {
            1: "Sesudah kata depan, kata kerja wajib berbentuk -ing.",
            2: "\"to apply\" tidak dipakai sesudah kata depan \"in\".",
            3: "Bentuk lampau tidak masuk akal di sini."
          },
          note: "Kata depan (in, of, for, at, about) SELALU diikuti gerund: interested in working, capable of leading."
        },
        {
          id: "cur_f12_job_06",
          subChapterId: "f_g12_career_app_letter_cv_3_2", feature: "Gerund & Infinitive",
          prompt: "I managed ___ the reporting time from three days to four hours.",
          options: ["to reduce", "reducing", "reduce", "reduced"],
          answer: 0,
          marker: "manage + to infinitive",
          why: {
            1: "\"manage\" berpasangan dengan to-infinitive, bukan gerund.",
            2: "Verb 1 telanjang tidak bisa mengikuti \"managed\".",
            3: "Bentuk lampau ganda tidak benar."
          },
          note: "Kata kerja yang menuntut to-infinitive: manage, decide, aim, hope, plan, offer, agree."
        },
        {
          id: "cur_f12_job_07",
          subChapterId: "f_g12_career_app_letter_cv_3_3", feature: "Present Perfect for Accomplishments",
          prompt: "Over the past two years, I ___ three cross-department projects from planning to launch.",
          options: ["have led", "led", "am leading", "had led"],
          answer: 0,
          marker: "Over the past two years (belum selesai)",
          why: {
            1: "Simple Past menutup kurun waktunya, padahal \"the past two years\" masih menyambung ke sekarang.",
            2: "Present Continuous menggambarkan saat ini saja.",
            3: "Past Perfect butuh titik acuan lampau lain."
          },
          note: "Present Perfect untuk pencapaian yang masih relevan sekarang: \"I have led…\", \"I have increased…\"."
        },
        {
          id: "cur_f12_job_08",
          subChapterId: "f_g12_career_app_letter_cv_3_3", feature: "Present Perfect for Accomplishments",
          prompt: "I ___ spearheaded the digital archive initiative since joining the company in 2024.",
          options: ["have", "has", "am", "was"],
          answer: 0,
          marker: "since + I",
          why: {
            1: "\"has\" untuk He/She/It, bukan untuk \"I\".",
            2: "\"am spearheaded\" bentuk pasif yang menghapus peran pelakunya.",
            3: "\"was\" bertabrakan dengan \"since\", yang menuntut Present Perfect."
          },
          note: "\"since + titik waktu\" hampir selalu berpasangan dengan Present Perfect: since 2024, since joining."
        }
      ]
    }
  ,
    {
      id: "d_g7_home_sweet_home",
      phaseId: "fase_d",
      grade: 7,
      semester: 2,
      genre: "Descriptive Text",
      title: "Home Sweet Home — Rumah, Ruang, dan Letak Benda",
      targetCefr: "A1+",
      socialFunction: "Menggambarkan denah rumah, isi tiap ruangan, dan letak benda kepada teman atau tamu.",
      genericStructure: ["Identification (menyebut rumah/ruangan yang dibahas)", "Description (merinci isi dan letak benda)"],
      languageFeatures: ["There is / There are", "Prepositions of Place", "Articles a / an / the", "Plural Nouns"],
      subChapters: [
        { id: "d_g7_home_sweet_home_3_1", no: "3.1", title: "There is / There are", feature: "There is / There are" },
        { id: "d_g7_home_sweet_home_3_2", no: "3.2", title: "Prepositions of Place", feature: "Prepositions of Place" },
        { id: "d_g7_home_sweet_home_3_3", no: "3.3", title: "Articles & Plural Nouns", feature: "Articles & Plural Nouns" },
      ],
      teachingBrief: {
        summary: "Bab lanjutan kelas 7 semester 2. Siswa berlatih menyebutkan keberadaan benda (there is/are) dan letaknya (in, on, under, between) untuk mendeskripsikan rumah sendiri.",
        hook5Minutes: "Minta tiga siswa menggambar denah kamarnya di papan dalam 60 detik, lalu kelas menebak isinya dengan bertanya \"Is there a ___ in your room?\".",
        boardFormula: "There is + kata benda tunggal | There are + kata benda jamak | Benda + to be + preposisi + tempat",
        commonMisconceptions: [
          { trap: "There is untuk benda jamak", pattern: "There is two chairs in the living room.", fix: "Benda jamak memakai \"There ARE two chairs...\". Lihat kata bendanya, bukan jaraknya." },
          { trap: "Preposisi tertukar", pattern: "The lamp is in the table.", fix: "Permukaan memakai ON: \"The lamp is ON the table.\" IN dipakai untuk sesuatu yang berada di dalam." },
        ],
        differentiation: { struggling: "Sediakan denah rumah bergambar dengan label kosong dan bank preposisi (in, on, under, next to, between).", advanced: "Minta siswa menulis 6 kalimat mendeskripsikan rumah impian memakai there is/are dan minimal empat preposisi berbeda." },
        keyVocabulary: [
          { word: "living room", meaning: "ruang tamu" },
          { word: "cupboard", meaning: "lemari" },
          { word: "between", meaning: "di antara" },
          { word: "next to", meaning: "di sebelah" },
        ]
      },
      items: [
        {
          id: "cur_d7_hsh_01",
          subChapterId: "d_g7_home_sweet_home_3_1", feature: "There is / There are",
          prompt: "___ four bedrooms and one small prayer room in my grandmother's house.",
          options: ["There are", "There is", "It are", "They is"],
          answer: 0,
          marker: "four bedrooms (jamak)",
          why: {
            1: "\"There is\" untuk benda tunggal; \"four bedrooms\" jamak.",
            2: "\"It are\" bukan bentuk yang benar.",
            3: "\"They is\" mencampur subjek jamak dengan to be tunggal."
          },
          note: "There is + tunggal, There are + jamak. Yang menentukan adalah kata benda tepat sesudahnya."
        },
        {
          id: "cur_d7_hsh_02",
          subChapterId: "d_g7_home_sweet_home_3_1", feature: "There is / There are",
          prompt: "___ any rice left in the kitchen? I am still hungry.",
          options: ["Is there", "Are there", "There is", "Is it there"],
          answer: 0,
          marker: "rice (tak terhitung)",
          why: {
            1: "\"rice\" tidak terhitung, jadi diperlakukan tunggal.",
            2: "Ini kalimat tanya, jadi to be harus di depan.",
            3: "\"Is it there\" menanyakan letak, bukan keberadaan."
          },
          note: "Kata benda tak terhitung (rice, water, sugar, money) selalu memakai \"there is\"."
        },
        {
          id: "cur_d7_hsh_03",
          subChapterId: "d_g7_home_sweet_home_3_1", feature: "There is / There are",
          prompt: "There ___ a big mango tree and two papaya trees in our backyard.",
          options: ["is", "are", "be", "have"],
          answer: 0,
          marker: "Benda pertama sesudah \"there\"",
          why: {
            1: "Meski ada dua benda, to be mengikuti yang PALING DEKAT: \"a big mango tree\" (tunggal).",
            2: "\"be\" tidak terkonjugasi.",
            3: "\"have\" tidak dipakai dalam pola there."
          },
          note: "Dalam daftar campuran, to be mengikuti kata benda yang paling dekat dengan \"there\"."
        },
        {
          id: "cur_d7_hsh_04",
          subChapterId: "d_g7_home_sweet_home_3_2", feature: "Prepositions of Place",
          prompt: "The remote control is ___ the sofa and the small table.",
          options: ["between", "among", "in", "under of"],
          answer: 0,
          marker: "Dua benda",
          why: {
            1: "\"among\" untuk tiga benda atau lebih.",
            2: "\"in\" berarti di dalam, bukan di antara.",
            3: "\"under of\" bukan bentuk yang benar."
          },
          note: "between = di antara DUA benda; among = di antara TIGA atau lebih."
        },
        {
          id: "cur_d7_hsh_05",
          subChapterId: "d_g7_home_sweet_home_3_2", feature: "Prepositions of Place",
          prompt: "My father hangs the family photo ___ the wall of the living room.",
          options: ["on", "in", "at", "into"],
          answer: 0,
          marker: "wall (permukaan)",
          why: {
            1: "\"in the wall\" berarti di dalam tembok.",
            2: "\"at\" menunjuk titik, bukan permukaan.",
            3: "\"into\" menandai gerakan masuk."
          },
          note: "ON untuk permukaan (wall, table, floor), IN untuk ruang tertutup (room, box), AT untuk titik (door, corner)."
        },
        {
          id: "cur_d7_hsh_06",
          subChapterId: "d_g7_home_sweet_home_3_3", feature: "Articles & Plural Nouns",
          prompt: "We keep ___ umbrella and two pairs of shoes near the front door.",
          options: ["an", "a", "the", "some"],
          answer: 0,
          marker: "umbrella (bunyi vokal)",
          why: {
            1: "\"a\" dipakai sebelum bunyi konsonan.",
            2: "\"the\" menunjuk benda yang sudah diketahui, padahal ini disebut pertama kali.",
            3: "\"some\" tidak berpasangan dengan benda tunggal terhitung."
          },
          note: "a/an ditentukan oleh BUNYI awal, bukan huruf: an umbrella, an hour, a university."
        },
        {
          id: "cur_d7_hsh_07",
          subChapterId: "d_g7_home_sweet_home_3_3", feature: "Articles & Plural Nouns",
          prompt: "There are three ___ and one wooden bench on our terrace.",
          options: ["benches", "bench", "benchs", "benchies"],
          answer: 0,
          marker: "three (jamak)",
          why: {
            1: "Angka tiga menuntut bentuk jamak.",
            2: "Kata berakhiran -ch menambah -es, bukan -s.",
            3: "\"benchies\" bukan bentuk jamak yang benar."
          },
          note: "Kata berakhiran -s, -ss, -sh, -ch, -x, -o menambah -es: benches, boxes, dishes, tomatoes."
        }
      ]
    },
    {
      id: "d_g8_notice_instruction",
      phaseId: "fase_d",
      grade: 8,
      semester: 2,
      genre: "Notice & Instruction",
      title: "Signs, Notices & School Rules — Larangan dan Imbauan",
      targetCefr: "A2",
      socialFunction: "Memahami dan menulis rambu, pengumuman singkat, serta aturan sekolah yang dibaca banyak orang.",
      genericStructure: ["Purpose (maksud rambu)", "Instruction / Prohibition (perintah atau larangan)"],
      languageFeatures: ["Modals: must, mustn't, should", "Imperative for Notices", "Comparative Degree", "Prohibition Expressions"],
      subChapters: [
        { id: "d_g8_notice_instruction_5_1", no: "5.1", title: "Modals of Obligation", feature: "Modals of Obligation" },
        { id: "d_g8_notice_instruction_5_2", no: "5.2", title: "Notice & Prohibition", feature: "Notice & Prohibition" },
        { id: "d_g8_notice_instruction_5_3", no: "5.3", title: "Comparative Degree", feature: "Comparative Degree" },
      ],
      teachingBrief: {
        summary: "Bab kelas 8 semester 2. Siswa membaca rambu di sekitar sekolah dan menulis aturan sendiri dengan modal must/mustn't/should, sekaligus mengenal tingkat perbandingan.",
        hook5Minutes: "Tunjukkan lima foto rambu di sekitar sekolah (dilarang parkir, harap tenang, buang sampah di sini) dan minta siswa menuliskan versi bahasa Inggrisnya di kertas kecil.",
        boardFormula: "Subject + must / mustn't + Verb 1 | Adjective + -er + than | more + Adjective panjang + than",
        commonMisconceptions: [
          { trap: "mustn't dikira \"tidak perlu\"", pattern: "You mustn't bring your bag = kamu tidak perlu membawa tas.", fix: "mustn't = DILARANG. \"Tidak perlu\" adalah \"don't have to\". Dua makna yang berlawanan." },
          { trap: "Perbandingan ganda", pattern: "This road is more safer than that one.", fix: "Pilih salah satu: \"safer than\" ATAU \"more safe than\" — tidak keduanya sekaligus." },
        ],
        differentiation: { struggling: "Beri kartu bergambar rambu dan tiga pilihan kalimat; siswa memasangkan, belum menulis sendiri.", advanced: "Minta siswa merancang tiga rambu baru untuk perpustakaan sekolah lengkap dengan alasannya dalam satu kalimat." },
        keyVocabulary: [
          { word: "litter", meaning: "membuang sampah sembarangan" },
          { word: "queue", meaning: "antre" },
          { word: "canteen", meaning: "kantin" },
          { word: "crowded", meaning: "ramai / padat" },
        ]
      },
      items: [
        {
          id: "cur_d8_ntc_01",
          subChapterId: "d_g8_notice_instruction_5_1", feature: "Modals of Obligation",
          prompt: "Students ___ wear their school uniform on Monday to Thursday.",
          options: ["must", "must to", "musts", "are must"],
          answer: 0,
          marker: "Kewajiban + Verb 1",
          why: {
            1: "Modal tidak pernah diikuti \"to\".",
            2: "Modal tidak menerima akhiran -s.",
            3: "Modal tidak berdiri bersama to be."
          },
          note: "must + Verb 1 menandai kewajiban yang datang dari aturan."
        },
        {
          id: "cur_d8_ntc_02",
          subChapterId: "d_g8_notice_instruction_5_1", feature: "Modals of Obligation",
          prompt: "You ___ run in the corridor; the floor is often wet after the rain.",
          options: ["mustn't", "must not to", "don't must", "not must"],
          answer: 0,
          marker: "Larangan",
          why: {
            1: "\"must not to\" menambah \"to\" yang tidak pernah ada sesudah modal.",
            2: "Modal tidak dinegasikan dengan \"do\".",
            3: "\"not must\" urutannya terbalik."
          },
          note: "Larangan: must not / mustn't + Verb 1. Berbeda dari \"don't have to\", yang berarti tidak wajib."
        },
        {
          id: "cur_d8_ntc_03",
          subChapterId: "d_g8_notice_instruction_5_1", feature: "Modals of Obligation",
          prompt: "We ___ bring our own water bottle, but the school provides a refill station anyway.",
          options: ["don't have to", "mustn't", "should not", "have to not"],
          answer: 0,
          marker: "but the school provides…",
          why: {
            1: "\"mustn't\" berarti dilarang, padahal membawa botol boleh saja.",
            2: "\"should not\" berarti sebaiknya jangan, juga terlalu keras.",
            3: "\"have to not\" bukan bentuk yang benar."
          },
          note: "don't have to = tidak wajib (boleh dilakukan, boleh tidak). mustn't = dilarang. Ini pasangan yang paling sering tertukar."
        },
        {
          id: "cur_d8_ntc_04",
          subChapterId: "d_g8_notice_instruction_5_2", feature: "Notice & Prohibition",
          prompt: "A sign at the library door reads: \"___ SILENT — EXAMINATION IN PROGRESS\".",
          options: ["KEEP", "KEEPING", "TO KEEP", "KEEPS"],
          answer: 0,
          marker: "Teks rambu",
          why: {
            1: "Bentuk -ing tidak dipakai sebagai perintah rambu.",
            2: "\"To keep\" adalah infinitive, bukan perintah.",
            3: "Perintah tidak menerima akhiran -s."
          },
          note: "Rambu memakai imperative singkat: KEEP SILENT, NO PARKING, PUSH, PULL, MIND THE STEP."
        },
        {
          id: "cur_d8_ntc_05",
          subChapterId: "d_g8_notice_instruction_5_2", feature: "Notice & Prohibition",
          prompt: "The notice near the canteen says \"___ LITTERING\". It means we should throw rubbish in the bin.",
          options: ["NO", "NOT", "DON'T TO", "NOT TO"],
          answer: 0,
          marker: "Rambu larangan + bentuk -ing",
          why: {
            1: "\"NOT LITTERING\" bukan bentuk rambu yang lazim.",
            2: "\"DON'T TO\" salah karena \"to\" tidak pernah mengikuti don't.",
            3: "\"NOT TO\" tidak berdiri sendiri sebagai rambu."
          },
          note: "Rambu larangan pendek: NO + bentuk -ing atau kata benda — NO SMOKING, NO PARKING, NO ENTRY."
        },
        {
          id: "cur_d8_ntc_06",
          subChapterId: "d_g8_notice_instruction_5_3", feature: "Comparative Degree",
          prompt: "The new canteen is ___ than the old one, so fewer students have to queue outside.",
          options: ["bigger", "more big", "biggest", "more bigger"],
          answer: 0,
          marker: "than",
          why: {
            1: "Kata sifat pendek memakai -er, bukan \"more\".",
            2: "\"biggest\" adalah tingkat tertinggi, tidak berpasangan dengan \"than\" di sini.",
            3: "\"more bigger\" adalah perbandingan ganda."
          },
          note: "Kata sifat satu suku kata: + -er (big→bigger). Tiga suku kata atau lebih: more + adjective (more comfortable)."
        },
        {
          id: "cur_d8_ntc_07",
          subChapterId: "d_g8_notice_instruction_5_3", feature: "Comparative Degree",
          prompt: "Taking the school bus is ___ than riding a motorcycle without a helmet.",
          options: ["much safer", "much more safer", "many safer", "very safer"],
          answer: 0,
          marker: "Penguat perbandingan",
          why: {
            1: "\"much more safer\" adalah perbandingan ganda.",
            2: "\"many\" untuk benda terhitung, bukan penguat kata sifat.",
            3: "\"very\" tidak dipakai untuk menguatkan bentuk perbandingan."
          },
          note: "Penguat bentuk perbandingan: much, far, a lot — \"much safer\", \"far cheaper\". Bukan \"very safer\"."
        }
      ]
    }
  ,
    {
      id: "d_g9_procedure_manual",
      phaseId: "fase_d",
      grade: 9,
      semester: 2,
      genre: "Procedure Text",
      title: "Manuals & How-To — Petunjuk Alat dan Tips Praktis",
      targetCefr: "A2+",
      socialFunction: "Menjelaskan cara memakai alat atau melakukan sesuatu secara berurutan agar pembaca berhasil menirunya.",
      genericStructure: ["Goal (tujuan)", "Materials / Tools (bahan atau alat)", "Steps (langkah berurutan)"],
      languageFeatures: ["Imperative & Sequence", "Passive Voice in Instructions", "Conditional Type 1", "Adverbs of Manner"],
      subChapters: [
        { id: "d_g9_procedure_manual_4_1", no: "4.1", title: "Imperative & Sequence", feature: "Imperative & Sequence" },
        { id: "d_g9_procedure_manual_4_2", no: "4.2", title: "Conditional Type 1", feature: "Conditional Type 1" },
        { id: "d_g9_procedure_manual_4_3", no: "4.3", title: "Adverbs of Manner", feature: "Adverbs of Manner" },
      ],
      teachingBrief: {
        summary: "Bab kelas 9 semester 2. Siswa menulis petunjuk pemakaian alat dan tips praktis, dengan langkah bersyarat (if…) dan keterangan cara.",
        hook5Minutes: "Beri satu benda sehari-hari (stapler, payung lipat, charger) ke tiap kelompok dan minta mereka menuliskan tiga langkah pemakaiannya dalam bahasa Inggris tanpa membuka kamus.",
        boardFormula: "Verb 1 + objek + (keterangan cara) | If + Simple Present, Simple Future / Imperative",
        commonMisconceptions: [
          { trap: "Conditional type 1 memakai will di klausa if", pattern: "If you will press the button, the light turns on.", fix: "Klausa if memakai Simple Present: \"If you PRESS the button, the light will turn on.\"" },
          { trap: "Kata sifat dipakai sebagai keterangan cara", pattern: "Turn the knob slow.", fix: "Keterangan cara memakai -ly: \"Turn the knob SLOWLY.\"" },
        ],
        differentiation: { struggling: "Beri langkah acak dalam kartu; siswa mengurutkannya dulu sebelum menulis ulang.", advanced: "Minta siswa menulis petunjuk untuk hal abstrak (cara belajar efektif sebelum ujian) dalam 6 langkah bersyarat." },
        keyVocabulary: [
          { word: "plug in", meaning: "mencolokkan" },
          { word: "tighten", meaning: "mengencangkan" },
          { word: "gently", meaning: "dengan lembut" },
          { word: "until", meaning: "sampai" },
        ]
      },
      items: [
        {
          id: "cur_d9_pm_01",
          subChapterId: "d_g9_procedure_manual_4_1", feature: "Imperative & Sequence",
          prompt: "___ the battery cover before you insert the new batteries.",
          options: ["Remove", "Removes", "Removing", "You remove"],
          answer: 0,
          marker: "Langkah pertama petunjuk",
          why: {
            1: "Perintah tidak menerima akhiran -s.",
            2: "Bentuk -ing bukan bentuk perintah.",
            3: "Petunjuk tidak menuliskan subjek \"you\"."
          },
          note: "Petunjuk alat memakai imperative: Remove, Insert, Press, Connect, Wait."
        },
        {
          id: "cur_d9_pm_02",
          subChapterId: "d_g9_procedure_manual_4_1", feature: "Imperative & Sequence",
          prompt: "Press and hold the power button ___ the screen lights up.",
          options: ["until", "during", "while for", "since"],
          answer: 0,
          marker: "Batas akhir tindakan",
          why: {
            1: "\"during\" diikuti kata benda, bukan klausa.",
            2: "\"while for\" bukan bentuk yang benar.",
            3: "\"since\" menandai titik mulai, bukan batas akhir."
          },
          note: "\"until + klausa\" menandai sampai kapan sebuah langkah dilakukan."
        },
        {
          id: "cur_d9_pm_03",
          subChapterId: "d_g9_procedure_manual_4_1", feature: "Imperative & Sequence",
          prompt: "The filter ___ every three months to keep the water clean.",
          options: ["should be replaced", "should replace", "should be replace", "should replaced"],
          answer: 0,
          marker: "Filter adalah yang diganti",
          why: {
            1: "Bentuk aktif membuat filter seolah menggantikan sesuatu.",
            2: "Pasif menuntut Verb 3: replaced.",
            3: "\"should replaced\" kehilangan \"be\"."
          },
          note: "Petunjuk resmi sering memakai pasif: should be replaced, must be cleaned, can be adjusted."
        },
        {
          id: "cur_d9_pm_04",
          subChapterId: "d_g9_procedure_manual_4_2", feature: "Conditional Type 1",
          prompt: "If the indicator light ___ red, unplug the device immediately.",
          options: ["turns", "will turn", "turned", "is turning"],
          answer: 0,
          marker: "Klausa if type 1",
          why: {
            1: "\"will\" tidak pernah muncul di klausa if pada type 1.",
            2: "Bentuk lampau milik conditional type 2.",
            3: "Present Continuous tidak lazim di klausa if petunjuk."
          },
          note: "Conditional type 1: If + Simple Present, (will + Verb 1) atau kalimat perintah."
        },
        {
          id: "cur_d9_pm_05",
          subChapterId: "d_g9_procedure_manual_4_2", feature: "Conditional Type 1",
          prompt: "If you tighten the screw too hard, the plastic frame ___.",
          options: ["will crack", "cracks will", "would crack", "will cracks"],
          answer: 0,
          marker: "Akibat pada type 1",
          why: {
            1: "Urutannya terbalik.",
            2: "\"would\" milik conditional type 2 (pengandaian).",
            3: "Sesudah \"will\", kata kerja tidak menerima -s."
          },
          note: "Akibat pada type 1 memakai will + Verb 1 karena kejadiannya masih mungkin terjadi."
        },
        {
          id: "cur_d9_pm_06",
          subChapterId: "d_g9_procedure_manual_4_3", feature: "Adverbs of Manner",
          prompt: "Wipe the lens ___ with a dry microfibre cloth to avoid scratches.",
          options: ["gently", "gentle", "more gentle", "gently ways"],
          answer: 0,
          marker: "Cara melakukan tindakan",
          why: {
            1: "\"gentle\" adalah kata sifat, bukan keterangan cara.",
            2: "\"more gentle\" bentuk perbandingan yang tidak diperlukan.",
            3: "\"gently ways\" bukan bentuk yang benar."
          },
          note: "Keterangan cara umumnya kata sifat + -ly: slowly, carefully, firmly. Perkecualian: fast, hard, well."
        },
        {
          id: "cur_d9_pm_07",
          subChapterId: "d_g9_procedure_manual_4_3", feature: "Adverbs of Manner",
          prompt: "Make sure the cable is connected ___ before switching the machine on.",
          options: ["properly", "proper", "properly way", "with proper"],
          answer: 0,
          marker: "Menerangkan kata kerja \"connected\"",
          why: {
            1: "\"proper\" adalah kata sifat; yang diterangkan di sini adalah cara.",
            2: "\"properly way\" berlebihan.",
            3: "\"with proper\" tidak lengkap tanpa kata benda."
          },
          note: "Keterangan cara diletakkan sesudah kata kerja atau di akhir klausa."
        }
      ]
    },
    {
      id: "e_g10_narrative_legend",
      phaseId: "fase_e",
      grade: 10,
      semester: 1,
      genre: "Narrative Text",
      title: "Legends of Nusantara — Malin Kundang, Sangkuriang & Danau Toba",
      targetCefr: "B1",
      socialFunction: "Menceritakan kembali legenda daerah beserta nilai moralnya untuk pembaca yang belum mengenalnya.",
      genericStructure: ["Orientation (latar & tokoh)", "Complication (masalah memuncak)", "Resolution (penyelesaian)", "Coda (pesan moral)"],
      languageFeatures: ["Simple Past & Past Perfect", "Past Continuous", "Reported Speech", "Adverbial Clauses of Time"],
      subChapters: [
        { id: "e_g10_narrative_legend_2_1", no: "2.1", title: "Simple Past & Past Perfect", feature: "Simple Past & Past Perfect" },
        { id: "e_g10_narrative_legend_2_2", no: "2.2", title: "Reported Speech", feature: "Reported Speech" },
        { id: "e_g10_narrative_legend_2_3", no: "2.3", title: "Adverbial Clauses of Time", feature: "Adverbial Clauses of Time" },
      ],
      teachingBrief: {
        summary: "Bab pembuka Fase E. Siswa menceritakan ulang legenda nusantara dengan urutan waktu yang jelas, termasuk kejadian yang mendahului kejadian lain (Past Perfect).",
        hook5Minutes: "Putar 40 detik pertama audio legenda daerah setempat, hentikan di tengah, lalu minta kelas menebak kelanjutannya dalam satu kalimat bahasa Inggris.",
        boardFormula: "Past Perfect (had + V3) untuk kejadian LEBIH DULU | Simple Past untuk kejadian berikutnya",
        commonMisconceptions: [
          { trap: "Past Perfect dipakai untuk semua kejadian lampau", pattern: "He had gone to the market and had bought fish and had come home.", fix: "Past Perfect hanya untuk kejadian yang mendahului kejadian lampau lain. Sisanya Simple Past." },
          { trap: "Reported speech tidak menggeser waktu", pattern: "She said, \"I am tired\" → She said she is tired.", fix: "Kalimat tidak langsung menggeser waktunya satu langkah ke belakang: \"She said she WAS tired.\"" },
        ],
        differentiation: { struggling: "Beri garis waktu kosong; siswa menempatkan kejadian cerita di atasnya sebelum menulis kalimat.", advanced: "Minta siswa menulis ulang satu bagian legenda dari sudut pandang tokoh antagonis, tetap dengan urutan waktu yang benar." },
        keyVocabulary: [
          { word: "curse", meaning: "kutukan" },
          { word: "greedy", meaning: "serakah" },
          { word: "ashamed", meaning: "malu" },
          { word: "vow", meaning: "bersumpah" },
        ]
      },
      items: [
        {
          id: "cur_e10_leg_01",
          subChapterId: "e_g10_narrative_legend_2_1", feature: "Simple Past & Past Perfect",
          prompt: "By the time Malin Kundang returned to the village, his mother ___ for many years.",
          options: ["had waited", "waited", "was waiting for", "has waited"],
          answer: 0,
          marker: "By the time + kejadian lebih dulu",
          why: {
            1: "Simple Past tidak menunjukkan bahwa penantian itu mendahului kepulangannya.",
            2: "\"was waiting for\" menuntut objek di belakangnya.",
            3: "Present Perfect tidak dipakai dalam narasi lampau."
          },
          note: "Past Perfect (had + V3) menandai kejadian yang SUDAH berlangsung sebelum kejadian lampau lain."
        },
        {
          id: "cur_e10_leg_02",
          subChapterId: "e_g10_narrative_legend_2_1", feature: "Simple Past & Past Perfect",
          prompt: "Sangkuriang did not realise that the woman he loved ___ his own mother.",
          options: ["was", "had been being", "is", "has been"],
          answer: 0,
          marker: "Keadaan pada saat itu",
          why: {
            1: "\"had been being\" bukan bentuk yang benar.",
            2: "Bentuk sekarang bertabrakan dengan \"did not realise\".",
            3: "Present Perfect tidak dipakai dalam narasi lampau."
          },
          note: "Dalam kalimat lampau, klausa anak ikut lampau. Ini disebut kesesuaian waktu (sequence of tenses)."
        },
        {
          id: "cur_e10_leg_03",
          subChapterId: "e_g10_narrative_legend_2_1", feature: "Simple Past & Past Perfect",
          prompt: "The fisherman ___ the promise he had made before he opened the forbidden box.",
          options: ["forgot", "had forgotten", "forgets", "was forgetting"],
          answer: 0,
          marker: "Dua kejadian: had made lebih dulu, forgot kemudian",
          why: {
            1: "Kejadian yang lebih dulu sudah ditandai \"had made\"; yang ini terjadi sesudahnya.",
            2: "Bentuk sekarang tidak cocok dalam narasi lampau.",
            3: "Past Continuous menandai proses, bukan satu tindakan tuntas."
          },
          note: "Dalam satu kalimat, cukup SATU kejadian yang memakai Past Perfect — yang paling awal."
        },
        {
          id: "cur_e10_leg_04",
          subChapterId: "e_g10_narrative_legend_2_2", feature: "Reported Speech",
          prompt: "His mother said that she ___ never forgive him for denying her.",
          options: ["would", "will", "shall", "is going to"],
          answer: 0,
          marker: "said that (waktu bergeser)",
          why: {
            1: "\"will\" tidak bergeser ke bentuk lampau.",
            2: "\"shall\" juga bentuk sekarang.",
            3: "\"is going to\" bentuk sekarang."
          },
          note: "Pergeseran dalam kalimat tidak langsung: will → would, can → could, am/is → was, have → had."
        },
        {
          id: "cur_e10_leg_05",
          subChapterId: "e_g10_narrative_legend_2_2", feature: "Reported Speech",
          prompt: "The old man asked the prince ___ he had taken the sacred kris.",
          options: ["whether", "that", "what", "if that"],
          answer: 0,
          marker: "Pertanyaan ya/tidak dalam bentuk tidak langsung",
          why: {
            1: "\"that\" dipakai untuk pernyataan, bukan pertanyaan.",
            2: "\"what\" menuntut objek yang hilang dalam kalimat.",
            3: "\"if that\" bukan bentuk yang benar."
          },
          note: "Pertanyaan ya/tidak dalam bentuk tidak langsung memakai \"if\" atau \"whether\", dan urutannya kembali seperti kalimat biasa."
        },
        {
          id: "cur_e10_leg_06",
          subChapterId: "e_g10_narrative_legend_2_3", feature: "Adverbial Clauses of Time",
          prompt: "___ the storm finally calmed, the villagers found the ship turned into a rock.",
          options: ["When", "While", "During", "Meanwhile"],
          answer: 0,
          marker: "Kejadian singkat lampau",
          why: {
            1: "\"While\" berpasangan dengan proses yang berlangsung, bukan kejadian tuntas.",
            2: "\"During\" diikuti kata benda, bukan klausa.",
            3: "\"Meanwhile\" berdiri sendiri, tidak menyambung dua klausa."
          },
          note: "When + kejadian singkat; While + kejadian berlangsung; During + frasa benda."
        },
        {
          id: "cur_e10_leg_07",
          subChapterId: "e_g10_narrative_legend_2_3", feature: "Adverbial Clauses of Time",
          prompt: "The lake kept rising ___ the whole valley disappeared beneath the water.",
          options: ["until", "since", "as soon as before", "by"],
          answer: 0,
          marker: "Batas akhir proses",
          why: {
            1: "\"since\" menandai titik mulai.",
            2: "\"as soon as before\" mencampur dua penghubung.",
            3: "\"by\" diikuti titik waktu, bukan klausa."
          },
          note: "until + klausa menandai sampai kapan sebuah keadaan berlangsung."
        }
      ]
    }
  ,
    {
      id: "f_g11_hortatory_opinion",
      phaseId: "fase_f",
      grade: 11,
      semester: 1,
      genre: "Hortatory Exposition",
      title: "Hortatory Exposition — Ajakan Bertindak atas Isu Publik",
      targetCefr: "B1+",
      socialFunction: "Meyakinkan pembaca bahwa sesuatu SEHARUSNYA dilakukan, bukan sekadar menjelaskan bahwa sesuatu itu benar.",
      genericStructure: ["Thesis (pernyataan pendirian)", "Arguments (alasan pendukung)", "Recommendation (ajakan bertindak)"],
      languageFeatures: ["Modals of Recommendation", "Passive for Objectivity", "Cohesive Devices", "Noun Clause"],
      subChapters: [
        { id: "f_g11_hortatory_opinion_1_1", no: "1.1", title: "Modals of Recommendation", feature: "Modals of Recommendation" },
        { id: "f_g11_hortatory_opinion_1_2", no: "1.2", title: "Cohesive Devices", feature: "Cohesive Devices" },
        { id: "f_g11_hortatory_opinion_1_3", no: "1.3", title: "Noun Clause", feature: "Noun Clause" },
      ],
      teachingBrief: {
        summary: "Bab pembuka kelas 11. Bedanya dengan eksposisi analitis ada di bagian akhir: hortatory menutup dengan REKOMENDASI tindakan, bukan sekadar penegasan ulang.",
        hook5Minutes: "Tulis satu isu sekolah di papan (sampah plastik di kantin). Minta separuh kelas menuliskan \"apa yang terjadi\" dan separuh lagi \"apa yang harus dilakukan\" — lalu tunjukkan bahwa kelompok kedua sedang menulis hortatory.",
        boardFormula: "Thesis: ... should be ... | Argument: Firstly, ... | Recommendation: Therefore, the school ought to ...",
        commonMisconceptions: [
          { trap: "Rekomendasi ditulis sebagai fakta", pattern: "The canteen bans plastic straws.", fix: "Hortatory menutup dengan ajakan: \"The canteen SHOULD ban plastic straws.\"" },
          { trap: "Noun clause memakai urutan pertanyaan", pattern: "We must consider what should we do next.", fix: "Noun clause memakai urutan kalimat biasa: \"...what we should do next.\"" },
        ],
        differentiation: { struggling: "Beri kerangka paragraf dengan penghubung sudah tercetak; siswa mengisi isinya saja.", advanced: "Minta siswa menulis hortatory 3 paragraf lengkap dengan satu data pendukung dan satu bantahan terhadap pihak yang tidak setuju." },
        keyVocabulary: [
          { word: "advocate", meaning: "menganjurkan" },
          { word: "urgent", meaning: "mendesak" },
          { word: "stakeholder", meaning: "pemangku kepentingan" },
          { word: "feasible", meaning: "dapat dilaksanakan" },
        ]
      },
      items: [
        {
          id: "cur_f11_hor_01",
          subChapterId: "f_g11_hortatory_opinion_1_1", feature: "Modals of Recommendation",
          prompt: "The government ___ allocate a larger budget for public libraries in remote districts.",
          options: ["ought to", "ought", "should to", "oughts to"],
          answer: 0,
          marker: "Rekomendasi formal",
          why: {
            1: "\"ought\" tidak pernah berdiri tanpa \"to\".",
            2: "\"should\" tidak pernah diikuti \"to\".",
            3: "Modal tidak menerima akhiran -s."
          },
          note: "\"ought to\" adalah satu-satunya modal yang berpasangan dengan \"to\". Yang lain (should, must, can) tidak."
        },
        {
          id: "cur_f11_hor_02",
          subChapterId: "f_g11_hortatory_opinion_1_1", feature: "Modals of Recommendation",
          prompt: "Schools ___ to integrate financial literacy into the curriculum as early as possible.",
          options: ["need", "needs", "should to", "must to"],
          answer: 0,
          marker: "need + to infinitive",
          why: {
            1: "Subjek jamak \"schools\" tidak memakai -s.",
            2: "\"should to\" salah; should tidak berpasangan dengan to.",
            3: "\"must to\" salah karena alasan yang sama."
          },
          note: "\"need\" di sini kata kerja biasa, jadi berpasangan dengan to-infinitive dan mengikuti jumlah subjeknya."
        },
        {
          id: "cur_f11_hor_03",
          subChapterId: "f_g11_hortatory_opinion_1_1", feature: "Modals of Recommendation",
          prompt: "It is high time the city ___ a proper waste separation system.",
          options: ["introduced", "introduces", "will introduce", "introduce"],
          answer: 0,
          marker: "It is high time + bentuk lampau",
          why: {
            1: "Pola ini menuntut bentuk lampau meski maknanya sekarang.",
            2: "Bentuk akan datang tidak dipakai dalam pola ini.",
            3: "Verb 1 telanjang tidak cocok setelah \"the city\"."
          },
          note: "\"It is (high) time + subjek + Verb 2\" menyatakan sesuatu yang sudah terlambat dilakukan."
        },
        {
          id: "cur_f11_hor_04",
          subChapterId: "f_g11_hortatory_opinion_1_2", feature: "Cohesive Devices",
          prompt: "___, teenagers spend nearly six hours a day online. Secondly, most of that time is unsupervised.",
          options: ["Firstly", "First of all of", "At first", "In the first"],
          answer: 0,
          marker: "Penanda argumen pertama",
          why: {
            1: "\"First of all of\" berlebihan.",
            2: "\"At first\" berarti \"mulanya\", menyiratkan perubahan kemudian.",
            3: "\"In the first\" tidak lengkap."
          },
          note: "Penanda urutan argumen: Firstly, Secondly, Furthermore, Finally. \"At first\" bukan salah satunya."
        },
        {
          id: "cur_f11_hor_05",
          subChapterId: "f_g11_hortatory_opinion_1_2", feature: "Cohesive Devices",
          prompt: "The policy is costly. ___, its long-term savings in healthcare far outweigh the initial expense.",
          options: ["Nevertheless", "Moreover", "Similarly", "As a result"],
          answer: 0,
          marker: "Mengakui kelemahan lalu membantah",
          why: {
            1: "\"Moreover\" menambah gagasan searah.",
            2: "\"Similarly\" menandai kesamaan.",
            3: "\"As a result\" menandai akibat, bukan bantahan."
          },
          note: "Nevertheless / Nonetheless / However mengakui satu sisi lalu menyeimbangkannya — ciri argumen yang matang."
        },
        {
          id: "cur_f11_hor_06",
          subChapterId: "f_g11_hortatory_opinion_1_3", feature: "Noun Clause",
          prompt: "Policymakers must understand ___ digital literacy matters more than device ownership.",
          options: ["why", "why does", "because of", "the reason why does"],
          answer: 0,
          marker: "Noun clause sesudah understand",
          why: {
            1: "Noun clause memakai urutan kalimat biasa, bukan urutan pertanyaan.",
            2: "\"because of\" diikuti frasa benda.",
            3: "Urutan pertanyaan tetap salah meski ditambah \"the reason\"."
          },
          note: "Noun clause: kata tanya + SUBJEK + kata kerja. Tidak ada pembalikan dan tidak ada do/does."
        },
        {
          id: "cur_f11_hor_07",
          subChapterId: "f_g11_hortatory_opinion_1_3", feature: "Noun Clause",
          prompt: "___ the regulation will be enforced consistently remains the biggest question.",
          options: ["Whether", "If", "That whether", "What"],
          answer: 0,
          marker: "Noun clause sebagai SUBJEK kalimat",
          why: {
            1: "\"If\" tidak dipakai untuk noun clause yang menjadi subjek.",
            2: "\"That whether\" mencampur dua penghubung.",
            3: "\"What\" akan meninggalkan lubang objek dalam klausanya."
          },
          note: "Sebagai subjek kalimat, gunakan \"Whether\", bukan \"if\". \"If\" hanya boleh di posisi objek."
        }
      ]
    },
    {
      id: "f_g12_news_caption",
      phaseId: "fase_f",
      grade: 12,
      semester: 1,
      genre: "News Item",
      title: "News Item & Caption — Berita Singkat dan Keterangan Foto",
      targetCefr: "B2",
      socialFunction: "Menyampaikan peristiwa penting secara ringkas dan akurat, serta memberi keterangan foto yang informatif.",
      genericStructure: ["Newsworthy Event (inti peristiwa)", "Background Events (latar kejadian)", "Source (kutipan narasumber)"],
      languageFeatures: ["Passive Voice in Headlines", "Reported Speech with Reporting Verbs", "Present Perfect for Recent News", "Ellipsis in Captions"],
      subChapters: [
        { id: "f_g12_news_caption_2_1", no: "2.1", title: "Passive Voice in News", feature: "Passive Voice in News" },
        { id: "f_g12_news_caption_2_2", no: "2.2", title: "Reporting Verbs", feature: "Reporting Verbs" },
        { id: "f_g12_news_caption_2_3", no: "2.3", title: "Present Perfect for Recent News", feature: "Present Perfect for Recent News" },
      ],
      teachingBrief: {
        summary: "Bab kelas 12 semester 1. Siswa membedakan bahasa berita (padat, pasif, berkutip) dari bahasa esai, dan menulis keterangan foto yang tidak mengulang isi gambarnya.",
        hook5Minutes: "Tampilkan satu foto peristiwa sekolah tanpa keterangan. Minta empat siswa menulis captionnya, lalu bandingkan: mana yang menambah informasi, mana yang hanya mengulang apa yang sudah terlihat.",
        boardFormula: "Headline: Objek + (to be dihilangkan) + V3 | Body: Subjek + was/were + V3 + by pelaku",
        commonMisconceptions: [
          { trap: "Kutipan narasumber tanpa pergeseran waktu", pattern: "The mayor said the bridge will reopen soon → …said the bridge will reopen.", fix: "Dalam berita tertulis, kutipan tidak langsung menggeser waktu: \"…said the bridge WOULD reopen.\"" },
          { trap: "Caption mengulang isi foto", pattern: "A photo of students standing in a line.", fix: "Caption yang baik menambah informasi: siapa, di mana, kapan, dan mengapa peristiwanya penting." },
        ],
        differentiation: { struggling: "Beri tiga judul berita dan tiga isi berita terpisah; siswa memasangkannya sambil menandai pola pasifnya.", advanced: "Minta siswa menulis satu berita 80 kata tentang kegiatan sekolah, lengkap dengan satu kutipan langsung dan satu tidak langsung." },
        keyVocabulary: [
          { word: "witness", meaning: "saksi" },
          { word: "allegedly", meaning: "diduga" },
          { word: "casualty", meaning: "korban" },
          { word: "spokesperson", meaning: "juru bicara" },
        ]
      },
      items: [
        {
          id: "cur_f12_news_01",
          subChapterId: "f_g12_news_caption_2_1", feature: "Passive Voice in News",
          prompt: "Headline: \"Historic Bridge ___ After Two Years of Restoration\".",
          options: ["Reopened", "Reopens It", "Is Reopen", "Reopening By"],
          answer: 0,
          marker: "Judul berita, to be dihilangkan",
          why: {
            1: "\"Reopens It\" menambah objek yang tidak ada.",
            2: "\"Is Reopen\" bukan bentuk yang benar; pasif menuntut Verb 3.",
            3: "\"Reopening By\" tidak lengkap."
          },
          note: "Judul berita menghilangkan to be dan artikel: \"Bridge Reopened\" berarti \"The bridge WAS reopened\"."
        },
        {
          id: "cur_f12_news_02",
          subChapterId: "f_g12_news_caption_2_1", feature: "Passive Voice in News",
          prompt: "Twelve families ___ to a temporary shelter after the flood hit the subdistrict.",
          options: ["were evacuated", "were evacuate", "evacuated by", "was evacuated"],
          answer: 0,
          marker: "Twelve families (jamak) + pasif lampau",
          why: {
            1: "Pasif menuntut Verb 3.",
            2: "\"evacuated by\" tanpa to be membuat kalimat kehilangan kata kerja utama.",
            3: "\"was\" untuk subjek tunggal."
          },
          note: "Berita memakai pasif ketika pelakunya tidak diketahui atau tidak sepenting korbannya."
        },
        {
          id: "cur_f12_news_03",
          subChapterId: "f_g12_news_caption_2_2", feature: "Reporting Verbs",
          prompt: "The spokesperson ___ that the repair would be completed before the school year begins.",
          options: ["confirmed", "confirmed about", "told", "said to"],
          answer: 0,
          marker: "Diikuti klausa \"that\"",
          why: {
            1: "\"confirmed about\" tidak lazim sebelum klausa that.",
            2: "\"told\" menuntut objek: told reporters that…",
            3: "\"said to\" menuntut objek orang di belakangnya."
          },
          note: "say + that (tanpa objek). tell + ORANG + that. Ini pasangan yang paling sering tertukar."
        },
        {
          id: "cur_f12_news_04",
          subChapterId: "f_g12_news_caption_2_2", feature: "Reporting Verbs",
          prompt: "Residents ___ the local authority to install better drainage before the rainy season.",
          options: ["urged", "urged that", "suggested", "said"],
          answer: 0,
          marker: "Diikuti objek + to infinitive",
          why: {
            1: "\"urged that\" berpasangan dengan klausa, bukan to-infinitive.",
            2: "\"suggested\" tidak berpasangan dengan objek + to-infinitive.",
            3: "\"said\" tidak pernah diikuti objek langsung dalam pola ini."
          },
          note: "urge / ask / advise / warn + ORANG + to + Verb 1. Suggest tidak mengikuti pola ini."
        },
        {
          id: "cur_f12_news_05",
          subChapterId: "f_g12_news_caption_2_3", feature: "Present Perfect for Recent News",
          prompt: "Authorities ___ just announced a new evacuation route for the coastal area.",
          options: ["have", "has", "are", "had"],
          answer: 0,
          marker: "Authorities (jamak) + just",
          why: {
            1: "\"has\" untuk subjek tunggal.",
            2: "\"are announced\" akan menjadi pasif, padahal pihak berwenanglah yang mengumumkan.",
            3: "Past Perfect butuh titik acuan lampau lain."
          },
          note: "Berita terkini memakai Present Perfect dengan just, recently, already — menandai peristiwa baru yang masih relevan."
        },
        {
          id: "cur_f12_news_06",
          subChapterId: "f_g12_news_caption_2_3", feature: "Present Perfect for Recent News",
          prompt: "The number of visitors ___ by 40 percent since the museum lowered its ticket price.",
          options: ["has risen", "have risen", "rose", "is rising"],
          answer: 0,
          marker: "The number of (tunggal) + since",
          why: {
            1: "\"The number of\" diperlakukan tunggal.",
            2: "Simple Past tidak berpasangan dengan \"since\".",
            3: "Present Continuous tidak menyatakan hasil kumulatif."
          },
          note: "\"since + titik waktu\" menuntut Present Perfect, dan \"the number of\" selalu tunggal."
        },
        {
          id: "cur_f12_news_07",
          subChapterId: "f_g12_news_caption_2_1", feature: "Passive Voice in News",
          prompt: "Caption: \"Volunteers distributing relief packages in Cilacap, ___ Tuesday morning.\"",
          options: ["on", "at", "in", "since"],
          answer: 0,
          marker: "Hari tertentu",
          why: {
            1: "\"at\" untuk jam.",
            2: "\"in\" untuk bulan, tahun, atau bagian hari.",
            3: "\"since\" menandai titik mulai, bukan waktu peristiwa."
          },
          note: "ON untuk hari dan tanggal, IN untuk bulan/tahun, AT untuk jam. Caption berita memakainya secara ketat."
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
    /** Sub-bab satu unit, atau [] kalau unit itu belum dipecah. */
    getSubChapters: function (unitId) {
      var u = UNIT_MAP[unitId];
      return u && Array.isArray(u.subChapters) ? u.subChapters.slice() : [];
    },
    /**
     * Fitur bahasa yang BENAR-BENAR punya soal di unit ini — diturunkan dari butirnya,
     * bukan dari daftar languageFeatures. Bedanya penting: languageFeatures adalah janji
     * kurikulum, sedangkan ini yang bisa betul-betul diujikan hari ini. Menawarkan janji
     * sebagai pilihan akan menghasilkan tugas kosong saat guru mencentangnya.
     */
    getFeatures: function (unitId, subId) {
      var u = UNIT_MAP[unitId];
      if (!u || !u.items) return [];
      var seen = {}, out = [];
      u.items.forEach(function (it) {
        if (subId && it.subChapterId !== subId) return;
        var f = it.feature;
        if (f && !seen[f]) { seen[f] = 1; out.push(f); }
      });
      return out;
    },
    /**
     * pickItems(unitId, count, { avoid, subChapter, features, seed })
     *
     * `subChapter` dan `features` MENYARING, bukan sekadar mengurutkan: guru yang memilih
     * "Bab 1.1 · Simple Present" harus menerima soal Simple Present saja. Kalau saringan
     * itu menghabiskan kolam, hasilnya sengaja DIKEMBALIKAN KOSONG dan bukan diisi ulang
     * dari seluruh unit — menambal diam-diam persis kesalahan yang membuat tugas kurikulum
     * tercemar soal bank umum sampai m025-290.
     */
    pickItems: function (unitId, count, opts) {
      opts = opts || {};
      var u = UNIT_MAP[unitId];
      if (!u || !u.items || !u.items.length) return [];
      var pool = u.items.slice();
      if (opts.subChapter) {
        pool = pool.filter(function (it) { return it.subChapterId === opts.subChapter; });
      }
      if (Array.isArray(opts.features) && opts.features.length) {
        pool = pool.filter(function (it) { return opts.features.indexOf(it.feature) !== -1; });
      }
      if (!pool.length) return [];
      if (Array.isArray(opts.avoid) && opts.avoid.length) {
        var fresh = pool.filter(function (it) { return opts.avoid.indexOf(it.id) === -1; });
        if (fresh.length) pool = fresh;   /* kolam habis: ulangi dari saringan yang SAMA */
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
