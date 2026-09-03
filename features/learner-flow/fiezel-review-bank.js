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

  var AREAS = { grammar: 'Grammar', vocabulary: 'Vocabulary', reading: 'Reading', listening: 'Listening', speaking: 'Speaking' };

  var SKILLS = {
    past_tense: { id: 'past_tense', label: 'Past tense (verb 2)', short: 'Past tense', area: 'grammar', pattern: 'Subject + verb 2', objective: 'Membedakan bentuk dasar dan bentuk lampau saat ada penanda waktu (yesterday, last week, ago).', lesson: 'Mini lesson: Past Simple', minutesPer: 0.8 },
    past_questions: { id: 'past_questions', label: 'Questions in the past (did + verb 1)', short: 'Past questions', area: 'grammar', pattern: 'Did + subject + verb 1', objective: 'Membentuk pertanyaan lampau dengan did + verb 1 dan membedakannya dari was/were.', lesson: 'Mini lesson: Past Questions', minutesPer: 1 },
    vocab_a2: { id: 'vocab_a2', label: 'Vocabulary A2', short: 'Vocabulary A2', area: 'vocabulary', pattern: 'Makna kata dari petunjuk konteks', objective: 'Memilih kata A2 yang tepat dari petunjuk konteks kalimat.', lesson: 'Review: Vocabulary A2 dalam konteks', minutesPer: 0.6 },
    listening_detail: { id: 'listening_detail', label: 'Listening: detail dialog pendek', short: 'Listening detail', area: 'listening', pattern: 'Tangkap kata kunci tepat setelah pertanyaan', objective: 'Menangkap detail spesifik (waktu, jumlah, tempat) dari dialog pendek.', lesson: 'Sesi listening pendek', minutesPer: 1 },
    reading_inference: { id: 'reading_inference', label: 'Reading inference', short: 'Reading inference', area: 'reading', pattern: 'Petunjuk teks → kesimpulan', objective: 'Menyimpulkan makna yang tidak tertulis langsung dari petunjuk teks.', lesson: 'Review: Reading inference', minutesPer: 1.2 }
  };
  var SKILL_ORDER = ['past_tense', 'past_questions', 'vocab_a2', 'listening_detail', 'reading_inference'];

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

  var BY_ID = {};
  ITEMS.forEach(function (it) { BY_ID[it.id] = it; });

  function itemsFor(skill) { return ITEMS.filter(function (it) { return it.skill === skill; }); }
  function byId(id) { return BY_ID[id] || null; }

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

  /** Lima soal diagnostic: satu per skill, urutan tetap supaya hasil antar-murid sebanding. */
  function diagnosticSet(seed) {
    return SKILL_ORDER.map(function (skill) { return pick(skill, 1, seed || 11)[0]; });
  }

  function optionText(item, index) {
    return index == null || index < 0 ? '' : String(item.options[index] == null ? '' : item.options[index]);
  }

  /** Umpan balik yang menjelaskan POLA bahasanya — bukan sekadar "salah". */
  function explain(item, chosen) {
    var correct = chosen === item.answer;
    var picked = optionText(item, chosen), right = optionText(item, item.answer);
    if (correct) {
      return { correct: true, text: 'Tepat. “' + right + '” — ' + item.note + ' Pola: ' + SKILLS[item.skill].pattern + '.' };
    }
    var reason = (item.why && item.why[chosen]) || '';
    var body;
    if (item.skill === 'past_tense' || item.skill === 'past_questions') {
      body = 'Dalam kalimat ini diperlukan “' + right + '” karena ' + (item.marker === 'did' ? 'sudah ada “did” di depannya.' : 'terdapat penanda “' + item.marker + '”.');
    } else if (item.skill === 'vocab_a2') {
      body = 'Petunjuk konteksnya “' + item.marker + '” menunjuk ke “' + right + '”.';
    } else if (item.skill === 'listening_detail') {
      body = 'Jawabannya “' + right + '” — dengarkan kata kunci “' + item.marker + '”.';
    } else {
      body = 'Kesimpulan yang paling didukung teks adalah “' + right + '” lewat petunjuk “' + item.marker + '”.';
    }
    return {
      correct: false,
      text: 'Belum tepat. Kamu memilih “' + picked + '”. ' + (reason ? reason + ' ' : '') + body + ' Coba lagi dengan pola: ' + SKILLS[item.skill].pattern + '.'
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
    var per = Math.ceil(total / skills.length), items = [];
    skills.forEach(function (skill, i) { items = items.concat(pick(skill, per, seed + i)); });
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

  return {
    AREAS: AREAS, SKILLS: SKILLS, SKILL_ORDER: SKILL_ORDER, ITEMS: ITEMS,
    itemsFor: itemsFor, byId: byId, pick: pick, diagnosticSet: diagnosticSet, explain: explain, buildSession: buildSession, afterSessionNote: afterSessionNote
  };
});
