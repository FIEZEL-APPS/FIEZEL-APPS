/**
 * FIEZEL Review Bank — bank soal review bersama untuk alur learner (diagnostic → lesson)
 * dan Tutor Action Center ("Buat sesi review"). Murni data + fungsi tanpa DOM, deterministik,
 * dan tersedia offline.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelReviewBank = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* m025-265 · sapuan kebocoran Thai: naskah di berkas ini dulu literal Indonesia,
     jadi murid yang memilih th tetap membacanya dalam bahasa Indonesia. t() fail-soft:
     kalau copy-map belum termuat, fallback id-lah yang tampil. */
  function t(k, fb) {
    /* FiezelI18n.t() mengembalikan KUNCINYA saat kalimatnya belum termuat. Mengembalikan
       itu apa adanya berarti guru membaca 'guru.tab-jurnal' di layarnya, padahal kalimat
       cadangannya sudah tertulis di pemanggil. Cadangan dipakai untuk DUA keadaan:
       FiezelI18n tidak ada, dan kuncinya tidak terpecahkan. */
    var s;
    try { var I = (typeof self !== 'undefined' ? self : this).FiezelI18n; s = I && I.t ? I.t(k) : undefined; } catch (_) {}
    return (s === undefined || s === k) ? (fb == null ? k : fb) : s;
  }

  var AREAS = { grammar: 'Grammar', vocabulary: 'Vocabulary', reading: 'Reading', listening: 'Listening', speaking: 'Speaking' };

  var SKILLS = {
    past_tense: { id: 'past_tense', label: 'Past tense (verb 2)', short: 'Past tense', area: 'grammar', pattern: 'Subject + verb 2', objective: 'Membedakan bentuk dasar dan bentuk lampau saat ada penanda waktu (yesterday, last week, ago).', lesson: 'Mini lesson: Past Simple', minutesPer: 0.8 },
    past_questions: { id: 'past_questions', label: 'Questions in the past (did + verb 1)', short: 'Past questions', area: 'grammar', pattern: 'Did + subject + verb 1', objective: 'Membentuk pertanyaan lampau dengan did + verb 1 dan membedakannya dari was/were.', lesson: 'Mini lesson: Past Questions', minutesPer: 1 },
    vocab_a2: { id: 'vocab_a2', label: 'Vocabulary A2', short: 'Vocabulary A2', area: 'vocabulary', pattern: 'Makna kata dari petunjuk konteks', objective: 'Memilih kata A2 yang tepat dari petunjuk konteks kalimat.', lesson: 'Review: Vocabulary A2 dalam konteks', minutesPer: 0.6 },
    listening_detail: { id: 'listening_detail', label: 'Listening: detail dialog pendek', short: 'Listening detail', area: 'listening', pattern: 'Tangkap kata kunci tepat setelah pertanyaan', objective: 'Menangkap detail spesifik (waktu, jumlah, tempat) dari dialog pendek.', lesson: 'Sesi listening pendek', minutesPer: 1 },
    reading_inference: { id: 'reading_inference', label: 'Reading inference', short: 'Reading inference', area: 'reading', pattern: 'Petunjuk teks → kesimpulan', objective: 'Menyimpulkan makna yang tidak tertulis langsung dari petunjuk teks.', lesson: 'Review: Reading inference', minutesPer: 1.2 },
    /* R3 Jalur Membaca TKA (docs/STRATEGI-SEKOLAH-INDONESIA-2026.md): tiga level kognitif kisi-kisi
       TKA Bahasa Inggris. SENGAJA tidak masuk SKILL_ORDER — SKILL_ORDER menentukan tes diagnostik
       dan rencana harian semua murid; TKA punya urutan sendiri (TKA_ORDER) dan pintunya sendiri. */
    tka_tekstual: { id: 'tka_tekstual', label: 'Membaca TKA: pemahaman tekstual', short: 'TKA tekstual', area: 'reading', pattern: 'Cari kalimat di teks yang memuat jawabannya', objective: 'Menemukan informasi yang tertulis langsung dalam teks bahasa Inggris.', lesson: 'Latihan Membaca TKA: tekstual', minutesPer: 1.3 },
    tka_inferensial: { id: 'tka_inferensial', label: 'Membaca TKA: pemahaman inferensial', short: 'TKA inferensial', area: 'reading', pattern: 'Petunjuk teks → ide pokok, tujuan penulis, kesimpulan', objective: 'Menyimpulkan ide pokok, tujuan penulis, dan informasi tersirat dari teks bahasa Inggris.', lesson: 'Latihan Membaca TKA: inferensial', minutesPer: 1.4 },
    tka_evaluatif: { id: 'tka_evaluatif', label: 'Membaca TKA: evaluasi fakta dan opini', short: 'TKA evaluatif', area: 'reading', pattern: 'Fakta bisa dibuktikan; opini memuat penilaian (best, I think, should)', objective: 'Membedakan fakta dan opini dalam teks bahasa Inggris.', lesson: 'Latihan Membaca TKA: fakta dan opini', minutesPer: 1.3 }
  };
  var SKILL_ORDER = ['past_tense', 'past_questions', 'vocab_a2', 'listening_detail', 'reading_inference'];
  var TKA_ORDER = ['tka_tekstual', 'tka_inferensial', 'tka_evaluatif'];

  var V1 = 'adalah bentuk dasar (verb 1) — cocok untuk present, bukan untuk kalimat lampau.';
  var V3 = 'adalah verb 3 (past participle); bentuk ini butuh have/has/had di depannya.';
  var ING = 'adalah bentuk -ing (continuous); ia butuh was/were di depannya dan tidak berdiri sendiri.';
  var S3 = 'adalah bentuk present dengan -s (orang ketiga tunggal), bukan bentuk lampau.';
  var AFTER_DID = 'Setelah “did”, kata kerja kembali ke bentuk dasar (verb 1) — “did” sudah membawa makna lampau, jadi lampau tidak ditandai dua kali.';

  function g(id, prompt, options, answer, marker, why, note) {
    return { id: id, skill: 'past_tense', prompt: prompt, options: options, answer: answer, marker: marker, why: why, note: note || 'Penanda waktu “' + marker + '” meminta bentuk lampau (verb 2).' };
  }
  function q(id, prompt, options, answer, marker, why, note) {
    return { id: id, skill: 'past_questions', prompt: prompt, options: options, answer: answer, marker: marker, why: why, note: note || 'Pertanyaan lampau: did + subject + verb 1.' };
  }
  function v(id, prompt, options, answer, clue, why, note) {
    return { id: id, skill: 'vocab_a2', prompt: prompt, options: options, answer: answer, marker: clue, why: why, note: note || 'Petunjuk konteksnya: “' + clue + '”.' };
  }
  function l(id, dialogue, prompt, options, answer, clue, why, note) {
    return { id: id, skill: 'listening_detail', context: dialogue, contextKind: 'dialogue', prompt: prompt, options: options, answer: answer, marker: clue, why: why, note: note || 'Kata kuncinya: “' + clue + '”.' };
  }
  function r(id, passage, prompt, options, answer, clue, why, note) {
    return { id: id, skill: 'reading_inference', context: passage, contextKind: 'passage', prompt: prompt, options: options, answer: answer, marker: clue, why: why, note: note || 'Kesimpulannya datang dari petunjuk “' + clue + '”, bukan dari kalimat yang tertulis langsung.' };
  }

  var ITEMS = [
    g('pt1', 'Yesterday I ___ to the market.', ['go', 'went', 'gone', 'going'], 1, 'yesterday', { 0: '“go” ' + V1, 2: '“gone” ' + V3, 3: '“going” ' + ING }),
    g('pt2', 'Last night we ___ a movie together.', ['watch', 'watched', 'watching', 'watches'], 1, 'last night', { 0: '“watch” ' + V1, 2: '“watching” ' + ING, 3: '“watches” ' + S3 }),
    g('pt3', 'She ___ her homework two hours ago.', ['finish', 'finished', 'finishes', 'finishing'], 1, 'two hours ago', { 0: '“finish” ' + V1, 2: '“finishes” ' + S3, 3: '“finishing” ' + ING }),
    g('pt4', 'They ___ in Bandung in 2019.', ['live', 'lived', 'living', 'lives'], 1, 'in 2019', { 0: '“live” ' + V1, 2: '“living” ' + ING, 3: '“lives” ' + S3 }),
    g('pt5', 'He ___ breakfast this morning before school.', ['eat', 'ate', 'eaten', 'eats'], 1, 'this morning', { 0: '“eat” ' + V1, 2: '“eaten” ' + V3, 3: '“eats” ' + S3 }),
    g('pt6', 'My father ___ me a book last week.', ['buy', 'bought', 'buys', 'buying'], 1, 'last week', { 0: '“buy” ' + V1, 2: '“buys” ' + S3, 3: '“buying” ' + ING }),
    g('pt7', 'We ___ very tired after the trip yesterday.', ['are', 'were', 'was', 'be'], 1, 'yesterday', { 0: '“are” adalah bentuk present dari to be.', 2: '“was” dipakai untuk I/he/she/it; subjek “we” butuh “were”.', 3: '“be” adalah bentuk dasar; ia tidak bisa jadi kata kerja utama di kalimat ini.' }, 'To be lampau: subjek jamak (we/they/you) + were.'),
    g('pt8', 'I ___ my keys yesterday, so I couldn\u2019t open the door.', ['lose', 'lost', 'losing', 'loses'], 1, 'yesterday', { 0: '“lose” ' + V1, 2: '“losing” ' + ING, 3: '“loses” ' + S3 }),
    g('pt9', 'The students ___ quiet during the exam last Monday.', ['are', 'were', 'was', 'is'], 1, 'last Monday', { 0: '“are” adalah bentuk present dari to be.', 2: '“was” untuk subjek tunggal; “the students” jamak, jadi “were”.', 3: '“is” adalah bentuk present tunggal.' }, 'To be lampau: subjek jamak + were.'),
    g('pt10', 'She ___ to me on the phone an hour ago.', ['speak', 'spoke', 'spoken', 'speaks'], 1, 'an hour ago', { 0: '“speak” ' + V1, 2: '“spoken” ' + V3, 3: '“speaks” ' + S3 }),

    q('pq1', '___ you go to school yesterday?', ['Do', 'Did', 'Were', 'Does'], 1, 'yesterday', { 0: '“Do” membentuk pertanyaan present; penanda “yesterday” meminta bentuk lampau “Did”.', 2: '“Were” dipakai untuk to be, bukan untuk kata kerja aksi seperti “go”.', 3: '“Does” adalah present untuk orang ketiga tunggal.' }),
    q('pq2', 'Did she ___ the test last week?', ['pass', 'passed', 'passes', 'passing'], 0, 'did', { 1: '“passed” menandai lampau dua kali. ' + AFTER_DID, 2: '“passes” ' + S3, 3: '“passing” ' + ING }),
    q('pq3', 'Where ___ they live before moving here?', ['do', 'did', 'were', 'was'], 1, 'before moving here', { 0: '“do” membentuk pertanyaan present; konteks “before moving here” menunjuk masa lampau.', 2: '“were” untuk to be; “live” adalah kata kerja aksi, jadi perlu “did”.', 3: '“was” untuk to be tunggal, bukan untuk kata kerja aksi.' }),
    q('pq4', 'Did you ___ the email this morning?', ['send', 'sent', 'sends', 'sending'], 0, 'did', { 1: '“sent” menandai lampau dua kali. ' + AFTER_DID, 2: '“sends” ' + S3, 3: '“sending” ' + ING }),
    q('pq5', '___ he at home last night?', ['Did', 'Was', 'Were', 'Is'], 1, 'at home', { 0: 'Tidak ada kata kerja aksi di kalimat ini — hanya to be (“at home”). Pertanyaan to be tidak memakai “did”.', 2: '“Were” untuk you/we/they; subjek “he” butuh “Was”.', 3: '“Is” adalah present; “last night” meminta lampau.' }, 'Pertanyaan dengan to be: Was/Were + subject — tanpa did.'),
    q('pq6', 'What time ___ the meeting start yesterday?', ['did', 'does', 'was', 'do'], 0, 'yesterday', { 1: '“does” adalah present.', 2: '“was” untuk to be; “start” adalah kata kerja aksi, jadi perlu “did”.', 3: '“do” adalah present.' }),
    q('pq7', 'Did your friends ___ the concert?', ['enjoy', 'enjoyed', 'enjoys', 'enjoying'], 0, 'did', { 1: '“enjoyed” menandai lampau dua kali. ' + AFTER_DID, 2: '“enjoys” ' + S3, 3: '“enjoying” ' + ING }),
    q('pq8', 'Why ___ you late this morning?', ['did', 'were', 'was', 'do'], 1, 'late', { 0: 'Tidak ada kata kerja aksi — “late” adalah kata sifat, jadi kalimat ini memakai to be (were), bukan did.', 2: '“was” untuk I/he/she/it; subjek “you” butuh “were”.', 3: '“do” adalah present.' }, 'Pertanyaan dengan to be: Were + you + kata sifat.'),

    v('vc1', 'I need to ___ my bike because the tire is flat.', ['fix', 'cook', 'borrow', 'wear'], 0, 'the tire is flat', { 1: '“cook” berarti memasak — tidak cocok dengan sepeda yang bannya kempes.', 2: '“borrow” berarti meminjam; masalahnya bukan tidak punya sepeda, tapi sepedanya rusak.', 3: '“wear” berarti memakai (pakaian).' }),
    v('vc2', 'The library is ___ on Sundays, so we can\u2019t go there.', ['open', 'closed', 'cheap', 'late'], 1, 'we can\u2019t go there', { 0: '“open” bertentangan dengan “we can’t go there”.', 2: '“cheap” (murah) tidak menjelaskan kenapa tidak bisa pergi.', 3: '“late” (terlambat) tidak menggambarkan keadaan perpustakaan.' }),
    v('vc3', 'She was ___ because she missed the bus.', ['happy', 'upset', 'hungry', 'tall'], 1, 'missed the bus', { 0: '“happy” bertentangan dengan kejadian ketinggalan bus.', 2: '“hungry” (lapar) tidak berhubungan dengan ketinggalan bus.', 3: '“tall” (tinggi) adalah ciri fisik, bukan perasaan.' }),
    v('vc4', 'Please ___ the light when you leave the room.', ['turn on', 'turn off', 'pick up', 'put on'], 1, 'when you leave', { 0: '“turn on” berarti menyalakan — saat meninggalkan ruangan, lampu justru dimatikan.', 2: '“pick up” berarti mengambil/menjemput.', 3: '“put on” berarti memakai (pakaian).' }),
    v('vc5', 'We ___ a table at the restaurant for 7 p.m.', ['cooked', 'booked', 'cleaned', 'sold'], 1, 'a table … for 7 p.m.', { 0: '“cooked” berarti memasak; kita tidak memasak meja.', 2: '“cleaned” berarti membersihkan — bukan yang dilakukan tamu restoran untuk jam 7.', 3: '“sold” berarti menjual.' }),
    v('vc6', 'The shop gives a 20% ___ on shoes today.', ['discount', 'receipt', 'ticket', 'change'], 0, '20%', { 1: '“receipt” adalah struk bukti pembayaran.', 2: '“ticket” adalah tiket/karcis.', 3: '“change” adalah uang kembalian.' }),
    v('vc7', 'My neighbour is very ___; she always helps everyone.', ['lazy', 'rude', 'kind', 'noisy'], 2, 'always helps everyone', { 0: '“lazy” (malas) bertentangan dengan “always helps everyone”.', 1: '“rude” (kasar) bertentangan dengan sikap suka menolong.', 3: '“noisy” (berisik) tidak berhubungan dengan menolong.' }),
    v('vc8', 'I can\u2019t hear you — the music is too ___.', ['quiet', 'loud', 'soft', 'slow'], 1, 'I can\u2019t hear you', { 0: '“quiet” (pelan) tidak membuat orang sulit mendengar.', 2: '“soft” (lembut/pelan) juga tidak menghalangi pendengaran.', 3: '“slow” (lambat) tidak berhubungan dengan kerasnya suara.' }),

    l('ld1', 'A: What time does the train leave?\nB: It leaves at 7:45, but we should be at the station by 7:30.', 'What time should they be at the station?', ['7:45', '7:30', '7:15', '8:00'], 1, 'be at the station by', { 0: '7:45 adalah waktu kereta BERANGKAT — pertanyaannya tentang kapan harus tiba di stasiun.', 2: '7:15 tidak disebut dalam dialog.', 3: '8:00 tidak disebut dalam dialog.' }),
    l('ld2', 'A: Do you want tea or coffee?\nB: Coffee, please — with milk but no sugar.', 'How does B want the coffee?', ['With milk and sugar', 'With milk, no sugar', 'Black, no milk', 'With sugar, no milk'], 1, 'with milk but no sugar', { 0: 'Kata “but no sugar” membatalkan gula — perhatikan kata pembalik “but”.', 2: 'B jelas meminta susu (“with milk”).', 3: 'Terbalik: yang diminta susu, yang ditolak gula.' }),
    l('ld3', 'A: Is the museum open tomorrow?\nB: Yes, from nine to five, but it\u2019s closed on Mondays.', 'When is the museum closed?', ['Tomorrow', 'On Mondays', 'At five', 'At nine'], 1, 'closed on Mondays', { 0: 'B menjawab “Yes” — besok museum buka.', 2: 'Jam lima adalah jam TUTUP harian, bukan hari libur; pertanyaannya soal kapan museum tidak buka.', 3: 'Jam sembilan adalah jam buka.' }),
    l('ld4', 'A: How much is the ticket?\nB: It\u2019s twelve dollars for adults and eight for students.', 'How much does a student pay?', ['12 dollars', '8 dollars', '20 dollars', '4 dollars'], 1, 'eight for students', { 0: '12 dolar adalah harga untuk “adults”.', 2: '20 dolar adalah jumlah keduanya — tidak diminta.', 3: '4 dolar adalah selisihnya, bukan harga tiket.' }),
    l('ld5', 'A: Where did you put my bag?\nB: I left it on the chair next to the window, not on the table.', 'Where is the bag?', ['On the table', 'On the chair', 'By the door', 'In the car'], 1, 'on the chair … not on the table', { 0: 'B justru menegaskan “not on the table” — tangkap kata negatif “not”.', 2: 'Pintu tidak disebut.', 3: 'Mobil tidak disebut.' }),
    l('ld6', 'A: Can we meet on Tuesday?\nB: Tuesday is difficult. Wednesday afternoon works better for me.', 'When will they probably meet?', ['Tuesday morning', 'Wednesday afternoon', 'Tuesday afternoon', 'Wednesday morning'], 1, 'Wednesday afternoon works better', { 0: 'B berkata Selasa “difficult” (sulit).', 2: 'Selasa ditolak — hari apa pun waktunya.', 3: 'Harinya benar, tapi B menyebut “afternoon”, bukan pagi.' }),

    r('ri1', 'Maya looked at the dark sky and took her umbrella before leaving the house.', 'What does Maya probably expect?', ['It will rain.', 'It will be sunny.', 'She will be late.', 'The shop is closed.'], 0, 'dark sky + umbrella', { 1: 'Langit gelap dan payung bukan tanda cuaca cerah.', 2: 'Tidak ada petunjuk tentang waktu atau keterlambatan.', 3: 'Toko tidak disebut sama sekali.' }),
    r('ri2', 'Tom checked his watch three times and kept looking at the door of the caf\u00e9.', 'How does Tom probably feel?', ['Relaxed', 'Waiting for someone and a little anxious', 'Hungry', 'Sleepy'], 1, 'checked his watch three times', { 0: 'Orang yang santai tidak melihat jam tiga kali sambil menatap pintu.', 2: 'Tidak ada petunjuk tentang makanan.', 3: 'Tidak ada petunjuk tentang kantuk.' }),
    r('ri3', 'The classroom was silent. Everyone was writing quickly, and the teacher was watching the clock.', 'What is most likely happening?', ['A party', 'An exam', 'A holiday', 'Lunch break'], 1, 'silent + writing quickly + watching the clock', { 0: 'Pesta tidak sunyi.', 2: 'Saat libur kelas kosong, tidak ada yang menulis.', 3: 'Saat istirahat makan tidak ada yang menulis cepat sambil diawasi jam.' }),
    r('ri4', 'Sari put on her coat, scarf and gloves before going outside.', 'What can we infer about the weather?', ['It is hot.', 'It is cold.', 'It is rainy.', 'It is windy.'], 1, 'coat, scarf and gloves', { 0: 'Mantel, syal, dan sarung tangan bukan pakaian untuk cuaca panas.', 2: 'Tidak ada petunjuk hujan (payung/jas hujan).', 3: 'Angin tidak disebut; ketiga benda itu khas untuk dingin.' }),
    r('ri5', 'Nobody answered when Budi knocked, and the lights were off.', 'What can we infer?', ['People are at home.', 'Nobody is home.', 'It is morning.', 'Budi is late.'], 1, 'nobody answered + lights off', { 0: 'Tidak ada yang menjawab dan lampu mati — tanda rumah kosong.', 2: 'Lampu mati bisa saja malam; waktu tidak bisa disimpulkan.', 3: 'Tidak ada petunjuk tentang janji atau jam.' })
  ];

  /* R3: 16 bacaan × 3 level = 48 soal TKA. Urutan pilihan sudah diacak berbiji saat ditulis
     sehingga kunci tersebar rata di A–D (12 tiap huruf); `why` mengikuti urutan itu. */
  var TKA_ITEMS = [
    {
    "id": "tka-t01",
    "skill": "tka_tekstual",
    "context": "NOTICE\nThe school library will be closed on Friday, 10 October, because the staff will attend a training. Students who want to return books may put them in the box next to the main office. The library will open again on Monday at 7 a.m. During the exam week, it will stay open until 4 p.m. We believe a quiet library is the best place to prepare for exams.",
    "contextKind": "passage",
    "prompt": "When will the library open again?",
    "options": [
    "On Monday at 4 p.m.",
    "On Friday at 7 a.m.",
    "Only during the exam week",
    "On Monday at 7 a.m."
    ],
    "answer": 3,
    "marker": "open again on Monday at 7 a.m.",
    "why": {
    "1": "Hari Jumat justru perpustakaan tutup.",
    "0": "Pukul 4 sore adalah jam tutup saat minggu ujian.",
    "2": "Teks tidak menyebut hanya buka saat minggu ujian."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “open again on Monday at 7 a.m.”."
    },
    {
    "id": "tka-i01",
    "skill": "tka_inferensial",
    "context": "NOTICE\nThe school library will be closed on Friday, 10 October, because the staff will attend a training. Students who want to return books may put them in the box next to the main office. The library will open again on Monday at 7 a.m. During the exam week, it will stay open until 4 p.m. We believe a quiet library is the best place to prepare for exams.",
    "contextKind": "passage",
    "prompt": "What is the main purpose of the notice?",
    "options": [
    "To explain the rules of the exam",
    "To inform students about a change in the library schedule",
    "To invite students to a training",
    "To sell new books to students"
    ],
    "answer": 1,
    "marker": "will be closed ... will open again",
    "why": {
    "2": "Yang ikut pelatihan adalah staf, bukan murid.",
    "3": "Tidak ada penjualan buku.",
    "0": "Ujian hanya disebut sekilas."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “will be closed ... will open again”."
    },
    {
    "id": "tka-e01",
    "skill": "tka_evaluatif",
    "context": "NOTICE\nThe school library will be closed on Friday, 10 October, because the staff will attend a training. Students who want to return books may put them in the box next to the main office. The library will open again on Monday at 7 a.m. During the exam week, it will stay open until 4 p.m. We believe a quiet library is the best place to prepare for exams.",
    "contextKind": "passage",
    "prompt": "Which sentence is an OPINION?",
    "options": [
    "The library will be closed on Friday.",
    "During the exam week, it will stay open until 4 p.m.",
    "We believe a quiet library is the best place to prepare for exams.",
    "Students may put books in the box next to the main office."
    ],
    "answer": 2,
    "marker": "We believe ... the best",
    "why": {
    "0": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "3": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "1": "Ini fakta yang bisa dicek, bukan pendapat penulis."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “We believe ... the best”."
    },
    {
    "id": "tka-t02",
    "skill": "tka_tekstual",
    "context": "Hi Rafi,\nI have big news! My family is moving to Bandung next month because my father got a new job there. Our new house is near a big park, so I can go jogging every morning. I will start at a new school in November. I am a little nervous, but I think Bandung is the most beautiful city in Indonesia. Please visit us during the holiday!\nDina",
    "contextKind": "passage",
    "prompt": "Why is Dina's family moving to Bandung?",
    "options": [
    "Dina wants to go jogging in a park.",
    "Dina will start at a new school.",
    "Rafi lives in Bandung.",
    "Her father got a new job there."
    ],
    "answer": 3,
    "marker": "because my father got a new job",
    "why": {
    "0": "Jogging adalah akibat rumah baru, bukan alasan pindah.",
    "1": "Sekolah baru adalah akibat pindah.",
    "2": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “because my father got a new job”."
    },
    {
    "id": "tka-i02",
    "skill": "tka_inferensial",
    "context": "Hi Rafi,\nI have big news! My family is moving to Bandung next month because my father got a new job there. Our new house is near a big park, so I can go jogging every morning. I will start at a new school in November. I am a little nervous, but I think Bandung is the most beautiful city in Indonesia. Please visit us during the holiday!\nDina",
    "contextKind": "passage",
    "prompt": "What can we infer about Dina?",
    "options": [
    "She does not want to move at all.",
    "She is a little worried but still looks forward to living in Bandung.",
    "She already knows her new classmates.",
    "She has visited Rafi many times."
    ],
    "answer": 1,
    "marker": "a little nervous, but ...",
    "why": {
    "0": "Ia gugup, tetapi memuji Bandung dan mengundang Rafi.",
    "3": "Pernyataan ini tidak ada di teks.",
    "2": "Ia baru akan mulai sekolah di November."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “a little nervous, but ...”."
    },
    {
    "id": "tka-e02",
    "skill": "tka_evaluatif",
    "context": "Hi Rafi,\nI have big news! My family is moving to Bandung next month because my father got a new job there. Our new house is near a big park, so I can go jogging every morning. I will start at a new school in November. I am a little nervous, but I think Bandung is the most beautiful city in Indonesia. Please visit us during the holiday!\nDina",
    "contextKind": "passage",
    "prompt": "Which sentence is an OPINION?",
    "options": [
    "Bandung is the most beautiful city in Indonesia.",
    "I will start at a new school in November.",
    "Our new house is near a big park.",
    "My family is moving to Bandung next month."
    ],
    "answer": 0,
    "marker": "I think ... the most beautiful",
    "why": {
    "3": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "2": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "1": "Ini fakta yang bisa dicek, bukan pendapat penulis."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “I think ... the most beautiful”."
    },
    {
    "id": "tka-t03",
    "skill": "tka_tekstual",
    "context": "Last month, the student council counted the plastic waste from the school canteen. They found about 300 plastic cups every day. Since then, the canteen has sold drinks in glasses, and students bring their own bottles. Now the canteen produces fewer than 50 plastic cups a day. Many students say the new rule is the smartest change the school has ever made.",
    "contextKind": "passage",
    "prompt": "How many plastic cups did the canteen produce every day before the new rule?",
    "options": [
    "Fewer than 50",
    "About 150",
    "About 300",
    "More than 500"
    ],
    "answer": 2,
    "marker": "about 300 plastic cups every day",
    "why": {
    "0": "Itu jumlah SESUDAH aturan baru.",
    "1": "Pernyataan ini tidak ada di teks.",
    "3": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “about 300 plastic cups every day”."
    },
    {
    "id": "tka-i03",
    "skill": "tka_inferensial",
    "context": "Last month, the student council counted the plastic waste from the school canteen. They found about 300 plastic cups every day. Since then, the canteen has sold drinks in glasses, and students bring their own bottles. Now the canteen produces fewer than 50 plastic cups a day. Many students say the new rule is the smartest change the school has ever made.",
    "contextKind": "passage",
    "prompt": "What is the main idea of the text?",
    "options": [
    "A new canteen rule reduced plastic waste at school.",
    "The student council sells bottles at school.",
    "Students do not like drinking from glasses.",
    "The canteen stopped selling drinks."
    ],
    "answer": 0,
    "marker": "300 → fewer than 50",
    "why": {
    "1": "Pernyataan ini tidak ada di teks.",
    "2": "Teks justru menyebut murid memuji aturannya.",
    "3": "Kantin tetap menjual minuman, dengan gelas."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “300 → fewer than 50”."
    },
    {
    "id": "tka-e03",
    "skill": "tka_evaluatif",
    "context": "Last month, the student council counted the plastic waste from the school canteen. They found about 300 plastic cups every day. Since then, the canteen has sold drinks in glasses, and students bring their own bottles. Now the canteen produces fewer than 50 plastic cups a day. Many students say the new rule is the smartest change the school has ever made.",
    "contextKind": "passage",
    "prompt": "Which sentence is an OPINION?",
    "options": [
    "The canteen has sold drinks in glasses.",
    "The student council counted the plastic waste.",
    "The new rule is the smartest change the school has ever made.",
    "The canteen produces fewer than 50 plastic cups a day."
    ],
    "answer": 2,
    "marker": "the smartest change",
    "why": {
    "1": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "0": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "3": "Ini fakta yang bisa dicek, bukan pendapat penulis."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “the smartest change”."
    },
    {
    "id": "tka-t04",
    "skill": "tka_tekstual",
    "context": "How to make sweet iced tea\nFirst, boil 500 ml of water. Then, put two tea bags into the hot water and wait for five minutes. Next, take out the tea bags and add three spoons of sugar. Stir until the sugar melts. Finally, pour the tea into a glass full of ice. Iced tea tastes best on a hot afternoon.",
    "contextKind": "passage",
    "prompt": "What should you do right after taking out the tea bags?",
    "options": [
    "Pour the tea into a glass of ice",
    "Wait for five minutes",
    "Add three spoons of sugar",
    "Boil the water"
    ],
    "answer": 2,
    "marker": "take out the tea bags and add three spoons of sugar",
    "why": {
    "3": "Merebus air adalah langkah pertama.",
    "0": "Itu langkah terakhir.",
    "1": "Menunggu lima menit terjadi sebelum kantong teh diangkat."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “take out the tea bags and add three spoons of sugar”."
    },
    {
    "id": "tka-i04",
    "skill": "tka_inferensial",
    "context": "How to make sweet iced tea\nFirst, boil 500 ml of water. Then, put two tea bags into the hot water and wait for five minutes. Next, take out the tea bags and add three spoons of sugar. Stir until the sugar melts. Finally, pour the tea into a glass full of ice. Iced tea tastes best on a hot afternoon.",
    "contextKind": "passage",
    "prompt": "The text is written to ...",
    "options": [
    "show readers the steps to make iced tea",
    "describe a famous tea shop",
    "tell a story about a hot afternoon",
    "compare tea and coffee"
    ],
    "answer": 0,
    "marker": "First ... Then ... Next ... Finally",
    "why": {
    "2": "Ini teks prosedur, bukan cerita.",
    "1": "Pernyataan ini tidak ada di teks.",
    "3": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “First ... Then ... Next ... Finally”."
    },
    {
    "id": "tka-e04",
    "skill": "tka_evaluatif",
    "context": "How to make sweet iced tea\nFirst, boil 500 ml of water. Then, put two tea bags into the hot water and wait for five minutes. Next, take out the tea bags and add three spoons of sugar. Stir until the sugar melts. Finally, pour the tea into a glass full of ice. Iced tea tastes best on a hot afternoon.",
    "contextKind": "passage",
    "prompt": "Which sentence is an OPINION?",
    "options": [
    "Iced tea tastes best on a hot afternoon.",
    "Put two tea bags into the hot water.",
    "Stir until the sugar melts.",
    "Boil 500 ml of water."
    ],
    "answer": 0,
    "marker": "tastes best",
    "why": {
    "3": "Ini perintah langkah, bukan pendapat.",
    "1": "Ini perintah langkah, bukan pendapat.",
    "2": "Ini perintah langkah, bukan pendapat."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “tastes best”."
    },
    {
    "id": "tka-t05",
    "skill": "tka_tekstual",
    "context": "The Komodo dragon is the largest lizard in the world. It lives on a few islands in East Nusa Tenggara, including Komodo and Rinca. An adult can grow up to three metres long. Komodo dragons can run fast for short distances and have a very good sense of smell. Many tourists say that seeing one in the wild is an unforgettable experience.",
    "contextKind": "passage",
    "prompt": "Where do Komodo dragons live?",
    "options": [
    "In the forests of Sumatra",
    "On a few islands in East Nusa Tenggara",
    "Only in zoos",
    "On every island in Indonesia"
    ],
    "answer": 1,
    "marker": "lives on a few islands in East Nusa Tenggara",
    "why": {
    "3": "Teks menyebut hanya beberapa pulau.",
    "2": "Pernyataan ini tidak ada di teks.",
    "0": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “lives on a few islands in East Nusa Tenggara”."
    },
    {
    "id": "tka-i05",
    "skill": "tka_inferensial",
    "context": "The Komodo dragon is the largest lizard in the world. It lives on a few islands in East Nusa Tenggara, including Komodo and Rinca. An adult can grow up to three metres long. Komodo dragons can run fast for short distances and have a very good sense of smell. Many tourists say that seeing one in the wild is an unforgettable experience.",
    "contextKind": "passage",
    "prompt": "What is the text mainly about?",
    "options": [
    "The food of lizards",
    "The features of the Komodo dragon",
    "Why tourists like East Nusa Tenggara",
    "How to travel to Komodo Island"
    ],
    "answer": 1,
    "marker": "largest ... three metres ... sense of smell",
    "why": {
    "3": "Pernyataan ini tidak ada di teks.",
    "2": "Turis hanya disebut di kalimat terakhir.",
    "0": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “largest ... three metres ... sense of smell”."
    },
    {
    "id": "tka-e05",
    "skill": "tka_evaluatif",
    "context": "The Komodo dragon is the largest lizard in the world. It lives on a few islands in East Nusa Tenggara, including Komodo and Rinca. An adult can grow up to three metres long. Komodo dragons can run fast for short distances and have a very good sense of smell. Many tourists say that seeing one in the wild is an unforgettable experience.",
    "contextKind": "passage",
    "prompt": "Which sentence is an OPINION?",
    "options": [
    "It lives on Komodo and Rinca.",
    "The Komodo dragon is the largest lizard in the world.",
    "Seeing one in the wild is an unforgettable experience.",
    "An adult can grow up to three metres long."
    ],
    "answer": 2,
    "marker": "unforgettable experience",
    "why": {
    "1": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "3": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "0": "Ini fakta yang bisa dicek, bukan pendapat penulis."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “unforgettable experience”."
    },
    {
    "id": "tka-t06",
    "skill": "tka_tekstual",
    "context": "On Saturday, Andi took the bus to the market. When he wanted to pay for some fruit, he could not find his wallet. He walked back to the bus stop, feeling worried. A bus driver was waiting there with the wallet in his hand. The driver had found it under a seat. Andi thanked him and offered him some money, but the driver refused. Andi thinks honest people are the real heroes of the city.",
    "contextKind": "passage",
    "prompt": "Where did the driver find the wallet?",
    "options": [
    "Under a seat",
    "In the fruit shop",
    "At the bus stop",
    "At the market"
    ],
    "answer": 0,
    "marker": "found it under a seat",
    "why": {
    "3": "Andi baru sadar dompetnya hilang di pasar.",
    "2": "Halte adalah tempat sopir menunggu.",
    "1": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “found it under a seat”."
    },
    {
    "id": "tka-i06",
    "skill": "tka_inferensial",
    "context": "On Saturday, Andi took the bus to the market. When he wanted to pay for some fruit, he could not find his wallet. He walked back to the bus stop, feeling worried. A bus driver was waiting there with the wallet in his hand. The driver had found it under a seat. Andi thanked him and offered him some money, but the driver refused. Andi thinks honest people are the real heroes of the city.",
    "contextKind": "passage",
    "prompt": "What does the story mainly tell us?",
    "options": [
    "Andi gave the driver a lot of money.",
    "An honest driver returned Andi's lost wallet.",
    "Andi likes buying fruit.",
    "Buses in the city are always late."
    ],
    "answer": 1,
    "marker": "waiting there with the wallet ... refused",
    "why": {
    "2": "Itu detail kecil, bukan isi utama.",
    "3": "Pernyataan ini tidak ada di teks.",
    "0": "Sopir justru menolak uangnya."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “waiting there with the wallet ... refused”."
    },
    {
    "id": "tka-e06",
    "skill": "tka_evaluatif",
    "context": "On Saturday, Andi took the bus to the market. When he wanted to pay for some fruit, he could not find his wallet. He walked back to the bus stop, feeling worried. A bus driver was waiting there with the wallet in his hand. The driver had found it under a seat. Andi thanked him and offered him some money, but the driver refused. Andi thinks honest people are the real heroes of the city.",
    "contextKind": "passage",
    "prompt": "Which sentence is an OPINION?",
    "options": [
    "Andi took the bus to the market.",
    "Honest people are the real heroes of the city.",
    "He could not find his wallet.",
    "The driver refused the money."
    ],
    "answer": 1,
    "marker": "Andi thinks ... real heroes",
    "why": {
    "0": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "2": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "3": "Ini fakta yang bisa dicek, bukan pendapat penulis."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “Andi thinks ... real heroes”."
    },
    {
    "id": "tka-t07",
    "skill": "tka_tekstual",
    "context": "ENGLISH SPEECH COMPETITION\nTopic: My Dream for Indonesia\nDate: 25 October 2026\nPlace: School hall\nParticipants: students of grades 7 to 9\nEach speech must be 3 to 5 minutes long. Register with Mrs. Lestari before 18 October. The winner will receive a trophy and books. Joining a competition like this is a great way to build confidence.",
    "contextKind": "passage",
    "prompt": "When should students register?",
    "options": [
    "On 25 October",
    "Any day in November",
    "Before 18 October",
    "After the competition"
    ],
    "answer": 2,
    "marker": "Register ... before 18 October",
    "why": {
    "0": "25 Oktober adalah hari lomba.",
    "3": "Pendaftaran harus sebelum lomba.",
    "1": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “Register ... before 18 October”."
    },
    {
    "id": "tka-i07",
    "skill": "tka_inferensial",
    "context": "ENGLISH SPEECH COMPETITION\nTopic: My Dream for Indonesia\nDate: 25 October 2026\nPlace: School hall\nParticipants: students of grades 7 to 9\nEach speech must be 3 to 5 minutes long. Register with Mrs. Lestari before 18 October. The winner will receive a trophy and books. Joining a competition like this is a great way to build confidence.",
    "contextKind": "passage",
    "prompt": "What can we infer about a student in grade 10?",
    "options": [
    "He will get a trophy automatically.",
    "He must speak for more than 5 minutes.",
    "He cannot join this competition.",
    "He can join if he registers early."
    ],
    "answer": 2,
    "marker": "Participants: students of grades 7 to 9",
    "why": {
    "3": "Peserta dibatasi kelas 7 sampai 9.",
    "1": "Durasi 3–5 menit berlaku untuk semua.",
    "0": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “Participants: students of grades 7 to 9”."
    },
    {
    "id": "tka-e07",
    "skill": "tka_evaluatif",
    "context": "ENGLISH SPEECH COMPETITION\nTopic: My Dream for Indonesia\nDate: 25 October 2026\nPlace: School hall\nParticipants: students of grades 7 to 9\nEach speech must be 3 to 5 minutes long. Register with Mrs. Lestari before 18 October. The winner will receive a trophy and books. Joining a competition like this is a great way to build confidence.",
    "contextKind": "passage",
    "prompt": "Which sentence is an OPINION?",
    "options": [
    "The competition is held in the school hall.",
    "Each speech must be 3 to 5 minutes long.",
    "The winner will receive a trophy and books.",
    "Joining a competition like this is a great way to build confidence."
    ],
    "answer": 3,
    "marker": "a great way",
    "why": {
    "0": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "1": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "2": "Ini fakta yang bisa dicek, bukan pendapat penulis."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “a great way”."
    },
    {
    "id": "tka-t08",
    "skill": "tka_tekstual",
    "context": "Teenagers need eight to ten hours of sleep every night. However, a survey at our school showed that most students sleep only six hours because they use their phones late at night. Lack of sleep can make it hard to concentrate in class. In my view, good sleep is more important than finishing one more video.",
    "contextKind": "passage",
    "prompt": "According to the survey, how long do most students sleep?",
    "options": [
    "Six hours",
    "Four hours",
    "Ten hours",
    "Eight hours"
    ],
    "answer": 0,
    "marker": "most students sleep only six hours",
    "why": {
    "1": "Pernyataan ini tidak ada di teks.",
    "3": "Delapan sampai sepuluh jam adalah kebutuhan, bukan kenyataan.",
    "2": "Delapan sampai sepuluh jam adalah kebutuhan, bukan kenyataan."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “most students sleep only six hours”."
    },
    {
    "id": "tka-i08",
    "skill": "tka_inferensial",
    "context": "Teenagers need eight to ten hours of sleep every night. However, a survey at our school showed that most students sleep only six hours because they use their phones late at night. Lack of sleep can make it hard to concentrate in class. In my view, good sleep is more important than finishing one more video.",
    "contextKind": "passage",
    "prompt": "What is the writer's purpose?",
    "options": [
    "To describe a school survey company",
    "To tell a funny story",
    "To persuade students to get enough sleep",
    "To sell a new phone"
    ],
    "answer": 2,
    "marker": "In my view, good sleep is more important",
    "why": {
    "3": "Pernyataan ini tidak ada di teks.",
    "0": "Survei hanya bukti pendukung.",
    "1": "Ini bukan teks cerita."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “In my view, good sleep is more important”."
    },
    {
    "id": "tka-e08",
    "skill": "tka_evaluatif",
    "context": "Teenagers need eight to ten hours of sleep every night. However, a survey at our school showed that most students sleep only six hours because they use their phones late at night. Lack of sleep can make it hard to concentrate in class. In my view, good sleep is more important than finishing one more video.",
    "contextKind": "passage",
    "prompt": "Which sentence is an OPINION?",
    "options": [
    "A survey at our school showed that most students sleep only six hours.",
    "Good sleep is more important than finishing one more video.",
    "Teenagers need eight to ten hours of sleep.",
    "Students use their phones late at night."
    ],
    "answer": 1,
    "marker": "In my view",
    "why": {
    "0": "Ini hasil survei, bisa dicek.",
    "3": "Ini temuan survei, bisa dicek.",
    "2": "Ini fakta kesehatan yang bisa dicek."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “In my view”."
    },
    {
    "id": "tka-t09",
    "skill": "tka_tekstual",
    "context": "Dear Mr. Hadi,\nI am sorry I cannot come to school today. I have a high fever and the doctor told me to rest for two days. Could you please tell me about the homework for English class? I will ask Sinta to bring my assignment to you tomorrow. Thank you for your understanding.\nRegards,\nBayu",
    "contextKind": "passage",
    "prompt": "How long does Bayu have to rest?",
    "options": [
    "Two days",
    "One day",
    "Until the holiday",
    "One week"
    ],
    "answer": 0,
    "marker": "rest for two days",
    "why": {
    "1": "Pernyataan ini tidak ada di teks.",
    "3": "Pernyataan ini tidak ada di teks.",
    "2": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “rest for two days”."
    },
    {
    "id": "tka-i09",
    "skill": "tka_inferensial",
    "context": "Dear Mr. Hadi,\nI am sorry I cannot come to school today. I have a high fever and the doctor told me to rest for two days. Could you please tell me about the homework for English class? I will ask Sinta to bring my assignment to you tomorrow. Thank you for your understanding.\nRegards,\nBayu",
    "contextKind": "passage",
    "prompt": "Why did Bayu write the message?",
    "options": [
    "To say he is absent and ask about homework",
    "To ask Sinta to visit him",
    "To complain about the English homework",
    "To invite Mr. Hadi to his house"
    ],
    "answer": 0,
    "marker": "cannot come ... tell me about the homework",
    "why": {
    "3": "Pernyataan ini tidak ada di teks.",
    "2": "Ia bertanya, bukan mengeluh.",
    "1": "Sinta disebut hanya untuk mengantar tugas."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “cannot come ... tell me about the homework”."
    },
    {
    "id": "tka-e09",
    "skill": "tka_evaluatif",
    "context": "Dear Mr. Hadi,\nI am sorry I cannot come to school today. I have a high fever and the doctor told me to rest for two days. Could you please tell me about the homework for English class? I will ask Sinta to bring my assignment to you tomorrow. Thank you for your understanding.\nRegards,\nBayu",
    "contextKind": "passage",
    "prompt": "Which statement is a FACT according to the text?",
    "options": [
    "Mr. Hadi is the kindest teacher in the school.",
    "The doctor told Bayu to rest for two days.",
    "Sinta is the best student in the class.",
    "English homework is always too difficult."
    ],
    "answer": 1,
    "marker": "the doctor told me to rest",
    "why": {
    "0": "Ini pendapat, dan tidak ada di teks.",
    "3": "Ini pendapat, dan tidak ada di teks.",
    "2": "Ini pendapat, dan tidak ada di teks."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “the doctor told me to rest”."
    },
    {
    "id": "tka-t10",
    "skill": "tka_tekstual",
    "context": "Heavy rain fell for six hours on Tuesday night in Sukamaju Village. The river overflowed and water entered about 120 houses. No one was injured, but many families had to stay at the village hall. Volunteers from the local school brought food and blankets. The village head said the river must be cleaned before the next rainy season.",
    "contextKind": "passage",
    "prompt": "How many houses did the water enter?",
    "options": [
    "About 120",
    "About 1,200",
    "About 12",
    "About 6"
    ],
    "answer": 0,
    "marker": "water entered about 120 houses",
    "why": {
    "3": "Enam adalah lamanya hujan dalam jam.",
    "2": "Pernyataan ini tidak ada di teks.",
    "1": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “water entered about 120 houses”."
    },
    {
    "id": "tka-i10",
    "skill": "tka_inferensial",
    "context": "Heavy rain fell for six hours on Tuesday night in Sukamaju Village. The river overflowed and water entered about 120 houses. No one was injured, but many families had to stay at the village hall. Volunteers from the local school brought food and blankets. The village head said the river must be cleaned before the next rainy season.",
    "contextKind": "passage",
    "prompt": "Why did many families stay at the village hall?",
    "options": [
    "The village head was sick.",
    "There was a party there.",
    "Their houses were not safe to stay in.",
    "The volunteers asked them to cook."
    ],
    "answer": 2,
    "marker": "water entered ... had to stay at the village hall",
    "why": {
    "1": "Pernyataan ini tidak ada di teks.",
    "3": "Pernyataan ini tidak ada di teks.",
    "0": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “water entered ... had to stay at the village hall”."
    },
    {
    "id": "tka-e10",
    "skill": "tka_evaluatif",
    "context": "Heavy rain fell for six hours on Tuesday night in Sukamaju Village. The river overflowed and water entered about 120 houses. No one was injured, but many families had to stay at the village hall. Volunteers from the local school brought food and blankets. The village head said the river must be cleaned before the next rainy season.",
    "contextKind": "passage",
    "prompt": "Which statement is a FACT according to the text?",
    "options": [
    "Volunteers brought food and blankets.",
    "Sukamaju is the most beautiful village.",
    "Rain is the worst thing in the world.",
    "The volunteers were the bravest people in the village."
    ],
    "answer": 0,
    "marker": "brought food and blankets",
    "why": {
    "3": "Ini pendapat yang tidak ada di teks.",
    "1": "Ini pendapat yang tidak ada di teks.",
    "2": "Ini pendapat yang tidak ada di teks."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “brought food and blankets”."
    },
    {
    "id": "tka-t11",
    "skill": "tka_tekstual",
    "context": "LEARN ENGLISH THE FUN WAY!\nBright Course opens new classes for junior high school students. Classes are on Tuesday and Thursday, 3-5 p.m. Small groups: maximum 10 students. Free trial class this Saturday! Our teachers are the friendliest teachers in town. Call 0812-0000-1234 to register.",
    "contextKind": "passage",
    "prompt": "When is the free trial class?",
    "options": [
    "On Thursday",
    "Every day at 3 p.m.",
    "On Tuesday",
    "This Saturday"
    ],
    "answer": 3,
    "marker": "Free trial class this Saturday",
    "why": {
    "2": "Selasa adalah jadwal kelas biasa.",
    "0": "Kamis adalah jadwal kelas biasa.",
    "1": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “Free trial class this Saturday”."
    },
    {
    "id": "tka-i11",
    "skill": "tka_inferensial",
    "context": "LEARN ENGLISH THE FUN WAY!\nBright Course opens new classes for junior high school students. Classes are on Tuesday and Thursday, 3-5 p.m. Small groups: maximum 10 students. Free trial class this Saturday! Our teachers are the friendliest teachers in town. Call 0812-0000-1234 to register.",
    "contextKind": "passage",
    "prompt": "Why does the course probably limit each group to 10 students?",
    "options": [
    "So that each student gets more attention",
    "Because the classroom has no chairs",
    "So that the class is cheaper",
    "Because only 10 students called"
    ],
    "answer": 0,
    "marker": "Small groups: maximum 10 students",
    "why": {
    "1": "Pernyataan ini tidak ada di teks.",
    "3": "Pernyataan ini tidak ada di teks.",
    "2": "Teks tidak menyebut harga."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “Small groups: maximum 10 students”."
    },
    {
    "id": "tka-e11",
    "skill": "tka_evaluatif",
    "context": "LEARN ENGLISH THE FUN WAY!\nBright Course opens new classes for junior high school students. Classes are on Tuesday and Thursday, 3-5 p.m. Small groups: maximum 10 students. Free trial class this Saturday! Our teachers are the friendliest teachers in town. Call 0812-0000-1234 to register.",
    "contextKind": "passage",
    "prompt": "Which sentence is an OPINION?",
    "options": [
    "Groups have a maximum of 10 students.",
    "Our teachers are the friendliest teachers in town.",
    "Classes are on Tuesday and Thursday.",
    "Call 0812-0000-1234 to register."
    ],
    "answer": 1,
    "marker": "the friendliest",
    "why": {
    "2": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "0": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "3": "Ini ajakan/informasi kontak, bukan pendapat."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “the friendliest”."
    },
    {
    "id": "tka-t12",
    "skill": "tka_tekstual",
    "context": "B.J. Habibie was born in Parepare, South Sulawesi, in 1936. He studied aircraft engineering in Germany and worked there for many years. He later returned to Indonesia and led the development of the national aircraft industry. In 1998, he became the third President of Indonesia. Many people think he was the most brilliant engineer Indonesia has ever had.",
    "contextKind": "passage",
    "prompt": "Where did Habibie study aircraft engineering?",
    "options": [
    "In Parepare",
    "In Japan",
    "In Jakarta",
    "In Germany"
    ],
    "answer": 3,
    "marker": "studied aircraft engineering in Germany",
    "why": {
    "0": "Parepare adalah tempat lahirnya.",
    "2": "Pernyataan ini tidak ada di teks.",
    "1": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “studied aircraft engineering in Germany”."
    },
    {
    "id": "tka-i12",
    "skill": "tka_inferensial",
    "context": "B.J. Habibie was born in Parepare, South Sulawesi, in 1936. He studied aircraft engineering in Germany and worked there for many years. He later returned to Indonesia and led the development of the national aircraft industry. In 1998, he became the third President of Indonesia. Many people think he was the most brilliant engineer Indonesia has ever had.",
    "contextKind": "passage",
    "prompt": "What is the text mainly about?",
    "options": [
    "The history of Parepare",
    "Habibie's life and achievements",
    "The election in 1998",
    "How airplanes fly"
    ],
    "answer": 1,
    "marker": "born ... studied ... became President",
    "why": {
    "3": "Pernyataan ini tidak ada di teks.",
    "0": "Parepare hanya disebut sebagai tempat lahir.",
    "2": "Tahun 1998 hanya satu bagian kisahnya."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “born ... studied ... became President”."
    },
    {
    "id": "tka-e12",
    "skill": "tka_evaluatif",
    "context": "B.J. Habibie was born in Parepare, South Sulawesi, in 1936. He studied aircraft engineering in Germany and worked there for many years. He later returned to Indonesia and led the development of the national aircraft industry. In 1998, he became the third President of Indonesia. Many people think he was the most brilliant engineer Indonesia has ever had.",
    "contextKind": "passage",
    "prompt": "Which sentence is an OPINION?",
    "options": [
    "He became the third President of Indonesia.",
    "He worked in Germany for many years.",
    "Habibie was born in 1936.",
    "He was the most brilliant engineer Indonesia has ever had."
    ],
    "answer": 3,
    "marker": "Many people think ... the most brilliant",
    "why": {
    "2": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "0": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "1": "Ini fakta yang bisa dicek, bukan pendapat penulis."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “Many people think ... the most brilliant”."
    },
    {
    "id": "tka-t13",
    "skill": "tka_tekstual",
    "context": "I just finished reading Laskar Pelangi by Andrea Hirata. The novel tells the story of ten poor children who study at a small school in Belitung. Their teachers, Bu Mus and Pak Harfan, never give up on them. The book was first published in 2005 and was later made into a film. In my opinion, every Indonesian teenager should read it.",
    "contextKind": "passage",
    "prompt": "Where do the children in the novel study?",
    "options": [
    "At a university",
    "At a big school in Jakarta",
    "At home with their parents",
    "At a small school in Belitung"
    ],
    "answer": 3,
    "marker": "a small school in Belitung",
    "why": {
    "1": "Pernyataan ini tidak ada di teks.",
    "2": "Pernyataan ini tidak ada di teks.",
    "0": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “a small school in Belitung”."
    },
    {
    "id": "tka-i13",
    "skill": "tka_inferensial",
    "context": "I just finished reading Laskar Pelangi by Andrea Hirata. The novel tells the story of ten poor children who study at a small school in Belitung. Their teachers, Bu Mus and Pak Harfan, never give up on them. The book was first published in 2005 and was later made into a film. In my opinion, every Indonesian teenager should read it.",
    "contextKind": "passage",
    "prompt": "What can we infer about Bu Mus and Pak Harfan?",
    "options": [
    "They wrote the novel.",
    "They want to close the school.",
    "They are strict and unkind.",
    "They care deeply about their students."
    ],
    "answer": 3,
    "marker": "never give up on them",
    "why": {
    "2": "Tidak menyerah pada murid menunjukkan kepedulian.",
    "1": "Pernyataan ini tidak ada di teks.",
    "0": "Penulisnya Andrea Hirata."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “never give up on them”."
    },
    {
    "id": "tka-e13",
    "skill": "tka_evaluatif",
    "context": "I just finished reading Laskar Pelangi by Andrea Hirata. The novel tells the story of ten poor children who study at a small school in Belitung. Their teachers, Bu Mus and Pak Harfan, never give up on them. The book was first published in 2005 and was later made into a film. In my opinion, every Indonesian teenager should read it.",
    "contextKind": "passage",
    "prompt": "Which sentence is an OPINION?",
    "options": [
    "The book was made into a film.",
    "Every Indonesian teenager should read it.",
    "The novel was written by Andrea Hirata.",
    "The book was first published in 2005."
    ],
    "answer": 1,
    "marker": "In my opinion",
    "why": {
    "2": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "3": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "0": "Ini fakta yang bisa dicek, bukan pendapat penulis."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “In my opinion”."
    },
    {
    "id": "tka-t14",
    "skill": "tka_tekstual",
    "context": "Why do we see lightning before we hear thunder? Light travels much faster than sound. Light moves about 300,000 kilometres per second, while sound moves only about 343 metres per second in air. So, when lightning strikes far away, its light reaches our eyes almost immediately, but the sound takes a few seconds. Watching a storm from a safe place is a fascinating experience.",
    "contextKind": "passage",
    "prompt": "How fast does sound move in air?",
    "options": [
    "About 300,000 kilometres per second",
    "Faster than light",
    "About 34 kilometres per hour",
    "About 343 metres per second"
    ],
    "answer": 3,
    "marker": "sound moves only about 343 metres per second",
    "why": {
    "0": "Itu kecepatan cahaya.",
    "2": "Pernyataan ini tidak ada di teks.",
    "1": "Teks menyatakan cahaya jauh lebih cepat."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “sound moves only about 343 metres per second”."
    },
    {
    "id": "tka-i14",
    "skill": "tka_inferensial",
    "context": "Why do we see lightning before we hear thunder? Light travels much faster than sound. Light moves about 300,000 kilometres per second, while sound moves only about 343 metres per second in air. So, when lightning strikes far away, its light reaches our eyes almost immediately, but the sound takes a few seconds. Watching a storm from a safe place is a fascinating experience.",
    "contextKind": "passage",
    "prompt": "You hear thunder three seconds after you see lightning. About how far away was the lightning?",
    "options": [
    "About 10 kilometres",
    "About 100 metres",
    "About 300,000 kilometres",
    "About 1 kilometre"
    ],
    "answer": 3,
    "marker": "343 metres per second × 3",
    "why": {
    "1": "Terlalu dekat: 3 detik × 343 m ≈ 1.000 m.",
    "0": "Terlalu jauh: 3 detik × 343 m ≈ 1.000 m.",
    "2": "Itu jarak tempuh cahaya per detik."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “343 metres per second × 3”."
    },
    {
    "id": "tka-e14",
    "skill": "tka_evaluatif",
    "context": "Why do we see lightning before we hear thunder? Light travels much faster than sound. Light moves about 300,000 kilometres per second, while sound moves only about 343 metres per second in air. So, when lightning strikes far away, its light reaches our eyes almost immediately, but the sound takes a few seconds. Watching a storm from a safe place is a fascinating experience.",
    "contextKind": "passage",
    "prompt": "Which sentence is an OPINION?",
    "options": [
    "Watching a storm from a safe place is a fascinating experience.",
    "The sound takes a few seconds.",
    "Light travels much faster than sound.",
    "The light reaches our eyes almost immediately."
    ],
    "answer": 0,
    "marker": "a fascinating experience",
    "why": {
    "2": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "3": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "1": "Ini fakta yang bisa dicek, bukan pendapat penulis."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “a fascinating experience”."
    },
    {
    "id": "tka-t15",
    "skill": "tka_tekstual",
    "context": "Breakfast gives your body energy after a long night without food. Students who eat breakfast usually find it easier to concentrate in the morning. A healthy breakfast can be simple: rice with eggs, bread with peanut butter, or a banana and a glass of milk. Skipping breakfast may make you feel tired and hungry before lunch. Personally, I think nasi uduk is the most delicious breakfast.",
    "contextKind": "passage",
    "prompt": "Which healthy breakfast is mentioned in the text?",
    "options": [
    "Fried noodles and soda",
    "Cake and coffee",
    "A banana and a glass of milk",
    "Instant noodles"
    ],
    "answer": 2,
    "marker": "a banana and a glass of milk",
    "why": {
    "0": "Pernyataan ini tidak ada di teks.",
    "1": "Pernyataan ini tidak ada di teks.",
    "3": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “a banana and a glass of milk”."
    },
    {
    "id": "tka-i15",
    "skill": "tka_inferensial",
    "context": "Breakfast gives your body energy after a long night without food. Students who eat breakfast usually find it easier to concentrate in the morning. A healthy breakfast can be simple: rice with eggs, bread with peanut butter, or a banana and a glass of milk. Skipping breakfast may make you feel tired and hungry before lunch. Personally, I think nasi uduk is the most delicious breakfast.",
    "contextKind": "passage",
    "prompt": "What is the text mainly about?",
    "options": [
    "How to buy peanut butter",
    "The best time to eat lunch",
    "Why breakfast is important and what to eat",
    "How to cook nasi uduk"
    ],
    "answer": 2,
    "marker": "energy ... concentrate ... healthy breakfast",
    "why": {
    "3": "Nasi uduk hanya disebut di akhir sebagai pendapat.",
    "1": "Pernyataan ini tidak ada di teks.",
    "0": "Pernyataan ini tidak ada di teks."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “energy ... concentrate ... healthy breakfast”."
    },
    {
    "id": "tka-e15",
    "skill": "tka_evaluatif",
    "context": "Breakfast gives your body energy after a long night without food. Students who eat breakfast usually find it easier to concentrate in the morning. A healthy breakfast can be simple: rice with eggs, bread with peanut butter, or a banana and a glass of milk. Skipping breakfast may make you feel tired and hungry before lunch. Personally, I think nasi uduk is the most delicious breakfast.",
    "contextKind": "passage",
    "prompt": "Which sentence is an OPINION?",
    "options": [
    "Skipping breakfast may make you feel tired.",
    "A healthy breakfast can be rice with eggs.",
    "Breakfast gives your body energy.",
    "Nasi uduk is the most delicious breakfast."
    ],
    "answer": 3,
    "marker": "Personally, I think",
    "why": {
    "2": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "0": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "1": "Ini fakta yang bisa dicek, bukan pendapat penulis."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “Personally, I think”."
    },
    {
    "id": "tka-t16",
    "skill": "tka_tekstual",
    "context": "Last Thursday, our class visited Borobudur Temple in Magelang. We left school at 6 a.m. and arrived at 9 a.m. A guide explained that the temple was built in the 9th century and has more than 500 Buddha statues. We climbed to the top and took many photos. On the way home, everybody agreed it was the best school trip ever.",
    "contextKind": "passage",
    "prompt": "When was Borobudur built, according to the guide?",
    "options": [
    "In the 19th century",
    "In the 9th century",
    "Last Thursday",
    "In the 6th century"
    ],
    "answer": 1,
    "marker": "built in the 9th century",
    "why": {
    "3": "Angka 6 adalah jam berangkat.",
    "0": "Pernyataan ini tidak ada di teks.",
    "2": "Kamis lalu adalah hari kunjungan."
    },
    "note": "Jawabannya tertulis langsung di teks: cari kalimat “built in the 9th century”."
    },
    {
    "id": "tka-i16",
    "skill": "tka_inferensial",
    "context": "Last Thursday, our class visited Borobudur Temple in Magelang. We left school at 6 a.m. and arrived at 9 a.m. A guide explained that the temple was built in the 9th century and has more than 500 Buddha statues. We climbed to the top and took many photos. On the way home, everybody agreed it was the best school trip ever.",
    "contextKind": "passage",
    "prompt": "How long did the trip from school to the temple take?",
    "options": [
    "About six hours",
    "About nine hours",
    "About one hour",
    "About three hours"
    ],
    "answer": 3,
    "marker": "left at 6 a.m. and arrived at 9 a.m.",
    "why": {
    "2": "Hitung: pukul 6 sampai pukul 9.",
    "0": "Hitung: pukul 6 sampai pukul 9.",
    "1": "Pukul 9 adalah jam tiba, bukan lama perjalanan."
    },
    "note": "Jawaban ini tidak tertulis kata per kata; ia disimpulkan dari petunjuk “left at 6 a.m. and arrived at 9 a.m.”."
    },
    {
    "id": "tka-e16",
    "skill": "tka_evaluatif",
    "context": "Last Thursday, our class visited Borobudur Temple in Magelang. We left school at 6 a.m. and arrived at 9 a.m. A guide explained that the temple was built in the 9th century and has more than 500 Buddha statues. We climbed to the top and took many photos. On the way home, everybody agreed it was the best school trip ever.",
    "contextKind": "passage",
    "prompt": "Which sentence is an OPINION?",
    "options": [
    "They took many photos.",
    "The class visited Borobudur Temple.",
    "It was the best school trip ever.",
    "The temple has more than 500 Buddha statues."
    ],
    "answer": 2,
    "marker": "the best school trip ever",
    "why": {
    "1": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "3": "Ini fakta yang bisa dicek, bukan pendapat penulis.",
    "0": "Ini fakta yang bisa dicek, bukan pendapat penulis."
    },
    "note": "Fakta bisa dibuktikan; opini memuat penilaian seperti “best”, “I think”, atau “should”. Petunjuknya: “the best school trip ever”."
    }
    ];
  ITEMS = ITEMS.concat(TKA_ITEMS);

  var BY_ID = {};
  ITEMS.forEach(function (it) { BY_ID[it.id] = it; });

  function itemsFor(skill) { return ITEMS.filter(function (it) { return it.skill === skill; }); }
  // Rekonstruksi soal statis, hasil-generate ('gpt:'/'gpq:'), dan hasil-acak ('base~oXXXX').
  function byId(id) {
    id = String(id || '');
    var vi = id.indexOf('~o');
    if (vi > -1) {
      var base = byId(id.slice(0, vi)), order = id.slice(vi + 2).split('').map(Number);
      return base ? applyOrder(base, order, id) : null;
    }
    if (BY_ID[id]) return BY_ID[id];
    var m = id.match(/^g(pt|pq):(\d+):(\d+):(\d+)$/);
    if (m) return (m[1] === 'pq' ? pastQItem : pastTenseItem)(+m[2], +m[3], +m[4]);
    var f = id.match(/^g(vc|ld|ri):(\d+)$/);
    if (f) return (f[1] === 'vc' ? vfItem : f[1] === 'ld' ? ldItem : riItem)(+f[2]);
    var p = id.match(/^gpi:(\d+):(\d+):(\d+):(\d+)$/);
    if (p) return picItem(+p[1], +p[2], +p[3], +p[4]);
    return null;
  }

  function seededShuffle(list, seed) {
    var arr = list.slice(), s = (Number(seed) || 1) >>> 0;
    for (var i = arr.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      var j = s % (i + 1), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function pick(skill, n, seed) {
    return seededShuffle(itemsFor(skill), seed || 7).slice(0, Math.max(0, n | 0));
  }

  // ---- Mesin variasi + anti-pengulangan -------------------------------------------------
  // Agar murid tidak bosan: soal yang sudah diuji dihindari, dan bila stok pola habis, soal
  // grammar dibuat baru dari template (subjek × kata kerja × penanda waktu). Untuk bank
  // terbatas (vocab/listening/reading) urutan pilihan diacak ulang supaya terasa segar.

  var GEN_VERBS = [
    { b: 'go', p: 'went', s: 'goes', ing: 'going', obj: 'to the market' },
    { b: 'watch', p: 'watched', s: 'watches', ing: 'watching', obj: 'a movie' },
    { b: 'finish', p: 'finished', s: 'finishes', ing: 'finishing', obj: 'the homework' },
    { b: 'play', p: 'played', s: 'plays', ing: 'playing', obj: 'football' },
    { b: 'visit', p: 'visited', s: 'visits', ing: 'visiting', obj: 'their grandmother' },
    { b: 'clean', p: 'cleaned', s: 'cleans', ing: 'cleaning', obj: 'the kitchen' },
    { b: 'call', p: 'called', s: 'calls', ing: 'calling', obj: 'a friend' },
    { b: 'study', p: 'studied', s: 'studies', ing: 'studying', obj: 'English' },
    { b: 'cook', p: 'cooked', s: 'cooks', ing: 'cooking', obj: 'dinner' },
    { b: 'eat', p: 'ate', s: 'eats', ing: 'eating', obj: 'breakfast' },
    { b: 'buy', p: 'bought', s: 'buys', ing: 'buying', obj: 'a new phone' },
    { b: 'see', p: 'saw', s: 'sees', ing: 'seeing', obj: 'an old friend' },
    { b: 'write', p: 'wrote', s: 'writes', ing: 'writing', obj: 'a letter' },
    { b: 'take', p: 'took', s: 'takes', ing: 'taking', obj: 'the bus' },
    { b: 'give', p: 'gave', s: 'gives', ing: 'giving', obj: 'a present' },
    { b: 'meet', p: 'met', s: 'meets', ing: 'meeting', obj: 'her cousin' },
    { b: 'lose', p: 'lost', s: 'loses', ing: 'losing', obj: 'his keys' },
    { b: 'find', p: 'found', s: 'finds', ing: 'finding', obj: 'the answer' },
    { b: 'travel', p: 'travelled', s: 'travels', ing: 'travelling', obj: 'to Bali' },
    { b: 'speak', p: 'spoke', s: 'speaks', ing: 'speaking', obj: 'to the teacher' }
  ];
  var GEN_SUBJ = [
    { s: 'I', low: 'I' }, { s: 'We', low: 'we' }, { s: 'They', low: 'they' }, { s: 'She', low: 'she' },
    { s: 'He', low: 'he' }, { s: 'My father', low: 'my father' }, { s: 'The students', low: 'the students' }, { s: 'My friends', low: 'my friends' }
  ];
  var GEN_TIME = ['yesterday', 'last week', 'last night', 'two days ago', 'last month', 'this morning'];

  function pastTenseItem(vi, si, ti) {
    var v = GEN_VERBS[vi % GEN_VERBS.length], su = GEN_SUBJ[si % GEN_SUBJ.length], tm = GEN_TIME[ti % GEN_TIME.length];
    return {
      id: 'gpt:' + (vi % GEN_VERBS.length) + ':' + (si % GEN_SUBJ.length) + ':' + (ti % GEN_TIME.length), skill: 'past_tense',
      prompt: su.s + ' ___ ' + v.obj + ' ' + tm + '.', options: [v.b, v.p, v.s, v.ing], answer: 1, marker: tm,
      why: { 0: '“' + v.b + '” ' + V1, 2: '“' + v.s + '” ' + S3, 3: '“' + v.ing + '” ' + ING },
      note: 'Penanda waktu “' + tm + '” meminta bentuk lampau (verb 2).'
    };
  }
  function pastQItem(vi, si, ti) {
    var v = GEN_VERBS[vi % GEN_VERBS.length], su = GEN_SUBJ[si % GEN_SUBJ.length], tm = GEN_TIME[ti % GEN_TIME.length];
    return {
      id: 'gpq:' + (vi % GEN_VERBS.length) + ':' + (si % GEN_SUBJ.length) + ':' + (ti % GEN_TIME.length), skill: 'past_questions',
      prompt: 'Did ' + su.low + ' ___ ' + v.obj + ' ' + tm + '?', options: [v.b, v.p, v.s, v.ing], answer: 0, marker: 'did',
      why: { 1: '“' + v.p + '” menandai lampau dua kali. ' + AFTER_DID, 2: '“' + v.s + '” ' + S3, 3: '“' + v.ing + '” ' + ING },
      note: 'Pertanyaan lampau: did + subject + verb 1.'
    };
  }
  // Template data untuk vocab/listening/reading (tak-terbatas seperti grammar: dipilih per
  // seed lalu urutan pilihan diacak variant()). Bentuk: [prompt/dialog/passage, jawaban,
  // [3 distraktor], kata kunci, [3 alasan distraktor]].
  var VF = [
    ['She was very ___ after she won the prize.', 'happy', ['sad', 'angry', 'tired'], 'won the prize', ['“sad” (sedih) bertentangan dengan menang.', '“angry” (marah) bertentangan dengan menang.', '“tired” (lelah) tidak dijelaskan konteks.']],
    ['I need an ___ because it is raining.', 'umbrella', ['apple', 'onion', 'engine'], 'it is raining', ['“apple” tidak melindungi dari hujan.', '“onion” tidak berhubungan.', '“engine” tidak berhubungan.']],
    ['The soup is too ___; I added more water.', 'salty', ['sweet', 'empty', 'quiet'], 'added more water', ['“sweet” tidak diperbaiki dengan air.', '“empty” bukan sifat rasa.', '“quiet” bukan sifat rasa.']],
    ['He is ___ because he did not sleep last night.', 'sleepy', ['excited', 'hungry', 'proud'], 'did not sleep', ['“excited” tidak cocok dengan kurang tidur.', '“hungry” soal lapar, bukan tidur.', '“proud” tidak berhubungan.']],
    ['Please ___ the door; it is cold outside.', 'close', ['open', 'break', 'paint'], 'it is cold outside', ['“open” justru menambah dingin.', '“break” berarti merusak.', '“paint” berarti mengecat.']],
    ['We arrived ___ so we missed the first bus.', 'late', ['early', 'quickly', 'safely'], 'missed the first bus', ['“early” bertentangan dengan ketinggalan bus.', '“quickly” tidak menjelaskan sebab.', '“safely” tidak menjelaskan sebab.']],
    ['This box is very ___; I cannot lift it.', 'heavy', ['light', 'cheap', 'clean'], 'cannot lift it', ['“light” bertentangan dengan tak terangkat.', '“cheap” soal harga.', '“clean” soal kebersihan.']],
    ['She ___ money every month to buy a laptop.', 'saves', ['spends', 'loses', 'throws'], 'to buy a laptop', ['“spends” justru menghabiskan.', '“loses” berarti kehilangan.', '“throws” berarti membuang.']],
    ['The museum is ___ on Mondays, so come on Tuesday.', 'closed', ['open', 'free', 'busy'], 'come on Tuesday', ['“open” bertentangan dengan datang hari lain.', '“free” soal biaya.', '“busy” tidak menjelaskan.']],
    ['My grandmother is very ___; she helps everyone.', 'kind', ['rude', 'lazy', 'noisy'], 'helps everyone', ['“rude” bertentangan dengan menolong.', '“lazy” bertentangan dengan menolong.', '“noisy” tidak berhubungan.']],
    ['Turn ___ the lights when you leave the room.', 'off', ['on', 'up', 'in'], 'when you leave', ['“on” justru menyalakan.', '“up” tidak dipakai untuk lampu di sini.', '“in” tidak cocok.']],
    ['The test was ___, so most students passed.', 'easy', ['difficult', 'expensive', 'loud'], 'most students passed', ['“difficult” bertentangan dengan banyak lulus.', '“expensive” soal harga.', '“loud” soal suara.']],
    ['I am ___; can we stop for lunch?', 'hungry', ['full', 'sleepy', 'angry'], 'stop for lunch', ['“full” bertentangan dengan minta makan.', '“sleepy” soal kantuk.', '“angry” soal marah.']],
    ['He speaks English ___; everyone understands him.', 'clearly', ['badly', 'slowly', 'rarely'], 'everyone understands', ['“badly” bertentangan dengan mudah dimengerti.', '“slowly” belum tentu jelas.', '“rarely” soal frekuensi.']],
    ['We ___ a table before going to the restaurant.', 'booked', ['cooked', 'cleaned', 'sold'], 'before going to the restaurant', ['“cooked” bukan yang dilakukan tamu.', '“cleaned” tidak cocok.', '“sold” berarti menjual.']],
    ['The road is ___, so drive carefully.', 'wet', ['dry', 'wide', 'new'], 'drive carefully', ['“dry” tidak menuntut hati-hati.', '“wide” soal lebar.', '“new” soal usia jalan.']]
  ];
  var LF = [
    ['A: What time is the meeting?\nB: At three, but please come at ten to three.', 'When should they arrive?', '2:50', ['3:00', '3:10', '2:30'], 'ten to three', ['3:00 adalah jam mulai, bukan jam datang.', '3:10 tidak disebut.', '2:30 tidak disebut.']],
    ['A: Would you like tea or juice?\nB: Juice, please, but without ice.', 'What does B want?', 'Juice without ice', ['Tea with ice', 'Juice with ice', 'Tea without ice'], 'without ice', ['B memilih jus, bukan teh.', 'B menolak es.', 'B memilih jus.']],
    ['A: How many people are coming?\nB: Ten adults and five children.', 'How many children are coming?', 'Five', ['Ten', 'Fifteen', 'Two'], 'five children', ['Sepuluh adalah jumlah dewasa.', 'Lima belas adalah total.', 'Dua tidak disebut.']],
    ['A: Where did you leave the umbrella?\nB: By the door, not in the car.', 'Where is the umbrella?', 'By the door', ['In the car', 'On the chair', 'At school'], 'not in the car', ['B menegaskan bukan di mobil.', 'Kursi tidak disebut.', 'Sekolah tidak disebut.']],
    ['A: Is the shop open now?\nB: Yes, until nine, but closed tomorrow.', 'When is the shop closed?', 'Tomorrow', ['Now', 'At nine tonight', 'On weekends'], 'closed tomorrow', ['Sekarang buka.', 'Jam sembilan tutup harian, bukan hari libur.', 'Akhir pekan tidak disebut.']],
    ['A: Shall we meet Monday?\nB: Monday is hard. Thursday is better for me.', 'When will they likely meet?', 'Thursday', ['Monday', 'Tuesday', 'Friday'], 'Thursday is better', ['B bilang Senin sulit.', 'Selasa tidak disebut.', 'Jumat tidak disebut.']],
    ['A: How much is the notebook?\nB: Three dollars each, or five for two.', 'How much for two notebooks?', 'Five dollars', ['Three dollars', 'Six dollars', 'Ten dollars'], 'five for two', ['Tiga dolar untuk satu.', 'Enam adalah 3×2 tanpa diskon.', 'Sepuluh tidak disebut.']],
    ['A: Did the train arrive?\nB: Not yet. It is twenty minutes late.', 'What happened to the train?', 'It is late', ['It arrived early', 'It was cancelled', 'It is on time'], 'twenty minutes late', ['Justru terlambat, bukan lebih awal.', 'Tidak dibatalkan.', 'Tidak tepat waktu.']],
    ['A: Which bag is yours?\nB: The small black one, not the big brown one.', 'Which bag is B\u2019s?', 'Small black', ['Big brown', 'Small brown', 'Big black'], 'small black one', ['B menolak yang cokelat besar.', 'Warna salah.', 'Ukuran salah.']],
    ['A: What is the homework?\nB: Read page ten, and answer only question two.', 'Which question must be answered?', 'Question two', ['Question ten', 'All questions', 'No questions'], 'only question two', ['Sepuluh adalah nomor halaman.', 'Hanya satu soal.', 'Ada satu soal yang dikerjakan.']]
  ];
  var RF = [
    ['Rudi packed sunscreen, a hat, and his swimming shorts.', 'Where is Rudi probably going?', 'To the beach', ['To school', 'To a meeting', 'To bed'], 'sunscreen, hat, swimming shorts', ['Sekolah tidak butuh baju renang.', 'Rapat tidak butuh baju renang.', 'Tidur tidak butuh itu.']],
    ['The streets were empty and all the shops had their lights off.', 'What can we infer?', 'It is very late at night', ['It is a busy morning', 'It is a holiday sale', 'It is raining hard'], 'empty + lights off', ['Pagi sibuk tidak sepi.', 'Obral membuat toko menyala.', 'Hujan tidak dijelaskan.']],
    ['Dina kept yawning and rubbing her eyes during the film.', 'How does Dina feel?', 'Sleepy', ['Excited', 'Angry', 'Hungry'], 'yawning + rubbing her eyes', ['Antusias tidak menguap terus.', 'Marah tidak dijelaskan.', 'Lapar tidak dijelaskan.']],
    ['Everyone clapped and the singer smiled and bowed.', 'What just happened?', 'A performance ended', ['A test started', 'A fight began', 'A meal was served'], 'clapped + bowed', ['Ujian tidak bertepuk tangan.', 'Tidak ada tanda pertengkaran.', 'Tidak ada makanan.']],
    ['Andi checked the map twice and asked a stranger for directions.', 'What can we infer about Andi?', 'He is lost', ['He is a tour guide', 'He is very tired', 'He is late for work'], 'checked map + asked directions', ['Pemandu tidak perlu bertanya arah.', 'Lelah tidak dijelaskan.', 'Terlambat tidak dijelaskan.']],
    ['The plants were brown and the soil was dry and cracked.', 'What can we infer?', 'They have not been watered', ['It rained a lot', 'It is winter', 'They are plastic'], 'brown + dry cracked soil', ['Hujan banyak membuat tanah basah.', 'Musim dingin tidak dijelaskan.', 'Tidak ada tanda plastik.']],
    ['Sari put on a thick coat, gloves, and a woollen hat.', 'What is the weather like?', 'Very cold', ['Very hot', 'Rainy', 'Windy only'], 'coat, gloves, woollen hat', ['Panas tidak butuh mantel tebal.', 'Tidak ada payung/jas hujan.', 'Ketiganya khas dingin, bukan hanya angin.']],
    ['The baby stopped crying as soon as her mother held her.', 'Why did the baby stop crying?', 'She felt safe with her mother', ['She was hungry', 'The room was dark', 'She saw a toy'], 'as soon as her mother held her', ['Lapar tidak dijelaskan sebagai sebab berhenti.', 'Kegelapan tidak disebut.', 'Mainan tidak disebut.']],
    ['Tono studied all week and smiled when he saw his grade.', 'What can we infer about the grade?', 'It was good', ['It was bad', 'It was missing', 'It was late'], 'studied all week + smiled', ['Senyum tidak cocok dengan nilai buruk.', 'Nilai tidak hilang.', 'Tidak ada soal keterlambatan.']],
    ['The waiter brought menus and filled the glasses with water.', 'Where are they?', 'At a restaurant', ['At a library', 'At a hospital', 'At a bus stop'], 'waiter + menus', ['Perpustakaan tidak ada pelayan/menu.', 'Rumah sakit tidak begitu.', 'Halte bus tidak begitu.']]
  ];
  function vfItem(i) { var f = VF[i % VF.length]; return { id: 'gvc:' + (i % VF.length), skill: 'vocab_a2', prompt: f[0], options: [f[1]].concat(f[2]), answer: 0, marker: f[3], why: { 1: f[4][0], 2: f[4][1], 3: f[4][2] }, note: 'Petunjuk konteksnya: “' + f[3] + '”.' }; }
  function ldItem(i) { var f = LF[i % LF.length]; return { id: 'gld:' + (i % LF.length), skill: 'listening_detail', context: f[0], contextKind: 'dialogue', prompt: f[1], options: [f[2]].concat(f[3]), answer: 0, marker: f[4], why: { 1: f[5][0], 2: f[5][1], 3: f[5][2] }, note: 'Kata kuncinya: “' + f[4] + '”.' }; }
  function riItem(i) { var f = RF[i % RF.length]; return { id: 'gri:' + (i % RF.length), skill: 'reading_inference', context: f[0], contextKind: 'passage', prompt: f[1], options: [f[2]].concat(f[3]), answer: 0, marker: f[4], why: { 1: f[5][0], 2: f[5][1], 3: f[5][2] }, note: 'Kesimpulannya datang dari petunjuk “' + f[4] + '”, bukan kalimat yang tertulis langsung.' }; }

  // Soal bergambar: pictogram SVG garis (24×24, offline, tanpa aset eksternal). [kata, arti, svg]
  var S = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
  var PIC = [
    ['apple', 'apel', '<path d="M12 7c-3-2-7 0-7 5 0 4 2.5 8 5 8 1 0 1.5-.5 2-.5s1 .5 2 .5c2.5 0 5-4 5-8 0-5-4-7-7-5z"/><path d="M12 7V4"/><path d="M12 5c1.5-2 3.5-2 4.5-1.5C15.5 5 13.5 5.5 12 5z"/>'],
    ['umbrella', 'payung', '<path d="M3 12a9 9 0 0 1 18 0H3z"/><path d="M12 12v7a2 2 0 0 0 4 0"/><path d="M12 3v1"/>'],
    ['bus', 'bus', '<rect x="4" y="4" width="16" height="14" rx="2"/><path d="M4 11h16"/><path d="M8 4v7M16 4v7"/><circle cx="8" cy="19" r="1.5"/><circle cx="16" cy="19" r="1.5"/>'],
    ['key', 'kunci', '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9"/><path d="M17 6l2 2M15 8l2 2"/>'],
    ['book', 'buku', '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/><path d="M9 7h6"/>'],
    ['cup', 'cangkir', '<path d="M5 9h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 11h1a2.5 2.5 0 0 1 0 5h-1"/><path d="M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3"/>'],
    ['chair', 'kursi', '<path d="M7 3h10v9H7z"/><path d="M5 12h14v4H5z"/><path d="M6 16v5M18 16v5"/>'],
    ['clock', 'jam', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
    ['sun', 'matahari', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'],
    ['cloud', 'awan', '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9z"/>'],
    ['bicycle', 'sepeda', '<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M6 16l4-8h4l4 8"/><path d="M10 8h-2M14 8l-3 8"/>'],
    ['house', 'rumah', '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'],
    ['phone', 'telepon', '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'],
    ['fish', 'ikan', '<path d="M3 12s4-6 10-6 8 6 8 6-2 6-8 6-10-6-10-6z"/><path d="M3 12l-1-4M3 12l-1 4"/><circle cx="16" cy="11" r="1"/>'],
    ['tree', 'pohon', '<path d="M12 3l6 8h-3l4 5H5l4-5H6z"/><path d="M12 16v5"/>'],
    ['star', 'bintang', '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'],
    ['car', 'mobil', '<path d="M4 15l2-6h12l2 6"/><rect x="3" y="15" width="18" height="4" rx="1"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/><path d="M8 9V7h8v2"/>'],
    ['bed', 'tempat tidur', '<path d="M3 18V8"/><path d="M3 12h18v6"/><path d="M5 12V9h6v3"/><path d="M3 18h18"/>'],
    ['glasses', 'kacamata', '<circle cx="7" cy="14" r="3.5"/><circle cx="17" cy="14" r="3.5"/><path d="M10.5 14h3"/><path d="M3.5 14L5 8M20.5 14L19 8"/>'],
    ['bag', 'tas', '<path d="M5 9h14l-1 12H6z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/>']
  ];
  function picItem(w, d1, d2, d3) {
    var n = PIC.length; w %= n; d1 %= n; d2 %= n; d3 %= n;
    var pick3 = [d1, d2, d3], seen = { }; seen[w] = true;
    var ds = [];
    pick3.forEach(function (d) { var k = d; while (seen[k]) k = (k + 1) % n; seen[k] = true; ds.push(k); });
    var why = {};
    ds.forEach(function (k, i) { why[i + 1] = '“' + PIC[k][0] + '” berarti ' + PIC[k][1] + ' — bukan benda di gambar.'; });
    return { id: 'gpi:' + w + ':' + ds.join(':'), skill: 'vocab_a2', contextKind: 'picture', picture: PIC[w][2], pictureAlt: PIC[w][1], prompt: 'Kata Inggris apa yang cocok untuk gambar ini?', options: [PIC[w][0]].concat(ds.map(function (k) { return PIC[k][0]; })), answer: 0, marker: PIC[w][1], why: why, note: 'Gambar menunjukkan ' + PIC[w][1] + '.' };
  }
  // Soal kanonik dari seed (jawaban di posisi tetap); generated() mengacak urutannya.
  function canonicalFor(skill, seed) {
    var s = (Number(seed) || 1) >>> 0;
    if (skill === 'vocab_a2') {
      // Selang-seling: soal kalimat dan soal bergambar agar latihan kosakata terasa hidup.
      if (s % 2 === 1) return picItem(Math.floor(s / 2), Math.floor(s / 3) + 1, Math.floor(s / 5) + 2, Math.floor(s / 11) + 3);
      return vfItem(Math.floor(s / 2) % VF.length);
    }
    if (skill === 'listening_detail') return ldItem(s % LF.length);
    if (skill === 'reading_inference') return riItem(s % RF.length);
    if (TKA_ORDER.indexOf(skill) !== -1) { var pool = itemsFor(skill); return pool[s % pool.length]; }
    var vi = s % GEN_VERBS.length, si = (Math.floor(s / 7)) % GEN_SUBJ.length, ti = (Math.floor(s / 53)) % GEN_TIME.length;
    return skill === 'past_questions' ? pastQItem(vi, si, ti) : pastTenseItem(vi, si, ti);
  }
  function generated(skill, seed) { return variant(canonicalFor(skill, seed), seed); }
  function baseId(id) { var i = String(id).indexOf('~o'); return i > -1 ? String(id).slice(0, i) : String(id); }

  /** Klon soal dengan urutan pilihan diacak; id meng-encode urutan agar bisa direkonstruksi. */
  function variant(item, seed) {
    var order = seededShuffle(item.options.map(function (_, i) { return i; }), seed || 3);
    return applyOrder(item, order, item.id + '~o' + order.join(''));
  }
  function applyOrder(item, order, id) {
    var opts = order.map(function (i) { return item.options[i]; });
    var why = {};
    if (item.why) order.forEach(function (old, ni) { if (item.why[old] != null) why[ni] = item.why[old]; });
    return Object.assign({}, item, { id: id, options: opts, answer: order.indexOf(item.answer), why: why });
  }

  /**
   * Ambil n soal SEGAR untuk sebuah skill: hindari id yang sudah pernah diuji (opts.avoid);
   * bila stok grammar habis, buat soal baru dari template; bila bank terbatas habis, acak
   * ulang pilihan soal lama supaya tidak terasa sama.
   */
  function pickFresh(skill, n, opts) {
    opts = opts || {}; n = Math.max(0, n | 0);
    var avoid = {}; (opts.avoid || []).forEach(function (id) { avoid[id] = true; });
    var seed = Number(opts.seed) || 7;
    var pool = itemsFor(skill);
    // Vocabulary: campurkan beberapa soal bergambar ke pool awal agar latihan kosakata hidup sejak soal pertama.
    if (skill === 'vocab_a2') for (var k = 0; k < 4; k++) pool = pool.concat([picItem(seed * 3 + k * 5, seed + k + 1, seed + k * 2 + 2, seed + k * 3 + 3)]);
    var out = seededShuffle(pool.filter(function (it) { return !avoid[it.id]; }), seed).slice(0, n);
    var have = {}, usedBase = {};
    out.forEach(function (it) { have[it.id] = true; usedBase[baseId(it.id)] = true; });
    // Stok statis habis → buat soal baru dari template (semua skill), hindari frame/pola yang
    // sudah dipakai di batch ini dan id yang sudah pernah diuji.
    var guard = 0;
    while (out.length < n && guard < 600) {
      var g = generated(skill, seed + guard * 101 + 13); guard++;
      var b = baseId(g.id);
      if (!avoid[g.id] && !avoid[b] && !have[g.id] && !usedBase[b]) { out.push(g); have[g.id] = true; usedBase[b] = true; }
    }
    if (out.length < n) {
      var base = seededShuffle(itemsFor(skill), seed + 1), j = 0;
      while (out.length < n && base.length) { out.push(variant(base[j % base.length], seed + out.length + 1)); j++; if (j > base.length * 4) break; }
    }
    return out;
  }

  /** Lima soal diagnostic: satu per skill, hindari yang sudah diuji, urutan skill tetap. */
  function diagnosticSet(opts) {
    if (typeof opts === 'number') opts = { seed: opts };
    opts = opts || {};
    var avoid = opts.avoid || [], seed = Number(opts.seed) || 11;
    return SKILL_ORDER.map(function (skill, i) { return pickFresh(skill, 1, { avoid: avoid, seed: seed + i * 17 })[0]; });
  }

  function optionText(item, index) {
    return index == null || index < 0 ? '' : String(item.options[index] == null ? '' : item.options[index]);
  }

  /** Umpan balik yang menjelaskan POLA bahasanya — bukan sekadar "salah". */
  function explain(item, chosen) {
    var correct = chosen === item.answer;
    var picked = optionText(item, chosen), right = optionText(item, item.answer);
    var sk = (item && item.skill && SKILLS[item.skill]) || null;
    var pattern = sk && sk.pattern ? sk.pattern : '';
    if (correct) {
      return { correct: true, text: 'Tepat. “' + right + '” — ' + (item.note || '') + (pattern ? ' Pola: ' + pattern + '.' : '') };
    }
    var reason = (item.why && item.why[chosen]) || (item.distractorWhy && item.distractorWhy[chosen]) || '';
    var body;
    if (item.skill === 'past_tense' || item.skill === 'past_questions') {
      body = 'Dalam kalimat ini diperlukan “' + right + '” karena ' + (item.marker === 'did' ? 'sudah ada “did” di depannya.' : 'terdapat penanda “' + item.marker + '”.');
    } else if (item.skill === 'vocab_a2') {
      body = item.contextKind === 'picture' ? 'Gambar menunjukkan ' + item.marker + ', jadi kata yang tepat adalah “' + right + '”.' : 'Petunjuk konteksnya “' + item.marker + '” menunjuk ke “' + right + '”.';
    } else if (item.skill === 'listening_detail') {
      body = 'Jawabannya “' + right + '” — dengarkan kata kunci “' + item.marker + '”.';
    } else if (TKA_ORDER.indexOf(item.skill) !== -1) {
      body = 'Jawaban yang didukung teks adalah “' + right + '”. Petunjuknya: “' + item.marker + '”.';
    } else if (item.marker) {
      body = 'Kesimpulan yang paling didukung teks adalah “' + right + '” lewat petunjuk “' + item.marker + '”.';
    } else {
      body = t('review.kunci-jawaban-tepat', 'Jawaban yang tepat: ') + '“' + right + '”.' + (item.note ? ' ' + item.note : '');
    }
    var patternTail = pattern ? t('review.coba-pola', ' Coba lagi dengan pola: {pola}.').replace('{pola}', pattern) : '';
    return {
      correct: false,
      text: t('review.belum-tepat-pilih', 'Belum tepat. Kamu memilih “{pilihan}”. ').replace('{pilihan}', picked) + (reason ? reason + ' ' : '') + body + (patternTail ? ' ' + patternTail : '')
    };
  }

  /**
   * Sesi review otomatis untuk tutor/learner: 5–10 soal, tujuan pembelajaran, estimasi durasi,
   * urutan latihan, dan penjelasan pasca-sesi. Tutor tidak menyusun soal dari nol.
   */
  function buildSession(opts) {
    var o = opts || {};
    var skills = (Array.isArray(o.skills) ? o.skills : []).filter(function (s) { return SKILLS[s]; });
    if (!skills.length) skills = ['past_tense'];
    var total = Math.min(10, Math.max(5, Number(o.count) || (skills.length >= 3 ? 10 : skills.length * 5)));
    var seed = Number(o.seed) || 21;
    var per = Math.ceil(total / skills.length), items = [], avoid = (o.avoid || []).slice();
    skills.forEach(function (skill, i) {
      var got = pickFresh(skill, per, { avoid: avoid, seed: seed + i });
      got.forEach(function (it) { avoid.push(it.id); });
      items = items.concat(got);
    });
    items = items.slice(0, total);
    var minutes = Math.max(3, Math.round(items.reduce(function (m, it) { return m + SKILLS[it.skill].minutesPer; }, 0) + 2));
    var order = skills.map(function (skill, i) {
      var count = items.filter(function (it) { return it.skill === skill; }).length;
      return { step: i + 1, skill: skill, title: SKILLS[skill].lesson, count: count, minutes: Math.max(1, Math.round(count * SKILLS[skill].minutesPer)) };
    });
    return {
      id: 'rs-' + seed + '-' + skills.join('-'),
      title: skills.length === 1 ? SKILLS[skills[0]].lesson : 'Sesi review: ' + skills.map(function (s) { return SKILLS[s].short; }).join(' + '),
      skills: skills,
      objectives: skills.map(function (s) { return { skill: s, text: SKILLS[s].objective }; }),
      itemIds: items.map(function (it) { return it.id; }),
      minutes: minutes,
      order: order,
      afterSession: skills.map(function (s) { return { skill: s, text: afterSessionNote(s) }; })
    };
  }

  function afterSessionNote(skill) {
    var map = {
      past_tense: 'Kesalahan paling umum: memakai verb 1 padahal ada penanda waktu lampau. Rekomendasi: satu putaran ulang 5 soal besok, lalu pindah ke Past Questions.',
      past_questions: 'Kesalahan paling umum: menandai lampau dua kali (did + verb 2) dan memakai did untuk kalimat to be. Rekomendasi: bandingkan berpasangan "Did you go" vs "Were you late".',
      vocab_a2: 'Kesalahan paling umum: memilih kata yang bertentangan dengan petunjuk konteks. Rekomendasi: garis bawahi kata kunci sebelum memilih.',
      listening_detail: 'Kesalahan paling umum: menangkap angka/tempat pertama yang terdengar, bukan yang ditanya. Rekomendasi: putar ulang sekali dengan transcript setelah percobaan pertama.',
      reading_inference: 'Kesalahan paling umum: memilih jawaban yang tertulis literal, bukan yang disimpulkan. Rekomendasi: tanya "petunjuk mana yang mendukung?" sebelum menjawab.'
    };
    return map[skill] || '';
  }

  /*
   * Markup gambar soal — SATU sumber untuk semua yang menampilkan soal dari bank ini.
   *
   * Soal `contextKind: 'picture'` menaruh pertanyaannya SEPENUHNYA pada gambar ("Kata
   * Inggris apa yang cocok untuk gambar ini?"). Tanpa gambarnya, soal itu bukan sekadar
   * kurang cantik — ia MUSTAHIL dijawab, dan murid hanya bisa menebak.
   *
   * Bank ini punya tiga penampil: latihan mandiri (fiezel-learner-flow.js), duel
   * (fiezel-duel.js), dan runner kelas (features/class-hub/). Selama markupnya disalin ke
   * masing-masing, penampil KEEMPAT akan lahir tanpa gambar juga — persis yang terjadi pada
   * runner kelas, yang mencetak item.context tetapi tidak pernah menyebut item.picture sama
   * sekali, sehingga setiap soal gambar dalam tugas guru sampai ke murid sebagai pertanyaan
   * tanpa gambar. Siapa pun yang menampilkan soal bank ini memanggil fungsi ini, bukan
   * menyalin tag <svg>-nya.
   */
  function pictureHtml(item, cls) {
    if (!item || item.contextKind !== 'picture' || !item.picture) return '';
    var alt = String(item.pictureAlt == null ? '' : item.pictureAlt)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return '<div class="' + (cls || 'lf-picture') + '" role="img" aria-label="Gambar: ' + alt +
      '" data-testid="bank-picture"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      item.picture + '</svg></div>';
  }

  return {
    pictureHtml: pictureHtml,
    AREAS: AREAS, SKILLS: SKILLS, SKILL_ORDER: SKILL_ORDER, TKA_ORDER: TKA_ORDER, ITEMS: ITEMS,
    itemsFor: itemsFor, byId: byId, pick: pick, pickFresh: pickFresh, variant: variant, generated: generated, picItem: picItem, PIC: PIC,
    diagnosticSet: diagnosticSet, explain: explain, buildSession: buildSession, afterSessionNote: afterSessionNote
  };
});
