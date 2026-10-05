/**
 * FIEZEL · LATIHAN BICARA PRIVAT (R7, docs/STRATEGI-SEKOLAH-INDONESIA-2026.md).
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Riset kelas SMP di Indonesia berulang kali menemukan hal yang sama: murid TAKUT SALAH dan
 * MALU berbicara bahasa Inggris di depan teman. Latihan bicara FIEZEL yang sudah ada
 * (speaking-bank-v1.json, 36 butir A1–C2) memberi ambang lulus — bagus untuk ujian, tetapi
 * bagi murid yang malu, angka dan "belum lulus" justru alasan untuk tidak mencoba lagi.
 *
 * Modul ini adalah ruang latihan yang SENGAJA tanpa penonton:
 *   - Tidak ada skor, persen, lulus/gagal, peringkat, atau XP. Umpan balik hanya "kata yang
 *     sudah terdengar" dan "coba ucapkan lagi", lalu murid sendiri yang memutuskan "sudah lancar".
 *   - Tidak direkam. Pengenal suara peramban (bila ada) dipakai sekali untuk umpan balik di
 *     layar; teksnya tidak disimpan dan tidak dikirim ke mana pun — juga tidak ke guru.
 *   - Bertahap per topik: DENGAR & TIRUKAN → GANTI KATA → JAWAB SENDIRI. 25 topik A1–A2 ×
 *     6 latihan = 150 latihan, semuanya ada di berkas ini sehingga jalan tanpa internet.
 *   - Tanpa pengenal suara (atau tanpa sinyal: pengenal suara Chrome butuh internet) latihan
 *     TETAP jalan: dengar contoh, ucapkan, nilai sendiri.
 *
 * Yang disimpan hanya di HP murid (`fiezel-bicara-privat-v1`): latihan mana yang sudah
 * ditandai lancar. Bahasa Indonesia saja (keputusan owner 2026-10-05).
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelBicaraPrivat = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';

  var KEY = 'fiezel-bicara-privat-v1';

  function t(k, fb) {
    var s;
    try { var I = root && root.FiezelI18n; s = I && I.t ? I.t(k) : undefined; } catch (_) {}
    return (s === undefined || s === k) ? (fb == null ? k : fb) : s;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ------------------------------------------------------------------ bank latihan --- */
  /* Satu topik: [id, level, [tirukan x2], [[pola, [isian x3]] x2], [[pertanyaan, contoh jawaban, kerangka] x2]].
     Kalimat Inggris adalah KONTEN BELAJAR, bukan naskah UI. Judul topik ada di LABEL_TOPIK. */
  var TOPIK = [
    ['perkenalan', 'A1', ['Hello, my name is Dina.', 'Nice to meet you.'],
      [['I am from {x}.', ['Bandung', 'Makassar', 'Medan']], ['I am in grade {x}.', ['seven', 'eight', 'nine']]],
      [['What is your name?', 'My name is Raka.', 'My name is ...'], ['Where do you live?', 'I live in Surabaya.', 'I live in ...']]],
    ['keluarga', 'A1', ['This is my mother.', 'I have two brothers.'],
      [['My {x} is a teacher.', ['father', 'aunt', 'sister']], ['I have {x} sister.', ['one', 'an older', 'a younger']]],
      [['How many people are in your family?', 'There are five people in my family.', 'There are ... people in my family.'], ['What does your father do?', 'My father is a farmer.', 'My father is a ...']]],
    ['sekolah', 'A1', ['I go to school every morning.', 'My school is big and clean.'],
      [['My favorite subject is {x}.', ['English', 'math', 'science']], ['I go to school by {x}.', ['bike', 'motorbike', 'bus']]],
      [['What is your favorite subject?', 'My favorite subject is art.', 'My favorite subject is ...'], ['Who is your English teacher?', 'My English teacher is Mrs. Sari.', 'My English teacher is ...']]],
    ['kelas', 'A1', ['There is a whiteboard in my class.', 'This is my pencil case.'],
      [['Can I borrow your {x}?', ['eraser', 'ruler', 'pen']], ['There are {x} students in my class.', ['thirty', 'thirty-two', 'twenty-eight']]],
      [['What is on your desk?', 'There is a book and a pen on my desk.', 'There is a ... on my desk.'], ['How many students are in your class?', 'There are thirty students in my class.', 'There are ... students in my class.']]],
    ['rutinitas', 'A1', ['I wake up at five o\'clock.', 'I take a bath and eat breakfast.'],
      [['I usually {x} after school.', ['play football', 'help my mother', 'do my homework']], ['I go to bed at {x}.', ['nine', 'ten', 'half past nine']]],
      [['What time do you wake up?', 'I wake up at half past five.', 'I wake up at ...'], ['What do you do after school?', 'I usually read a book after school.', 'I usually ... after school.']]],
    ['makanan', 'A1', ['I like fried rice.', 'I drink a glass of water.'],
      [['I want some {x}, please.', ['noodles', 'tea', 'fruit']], ['My favorite food is {x}.', ['meatballs', 'chicken satay', 'fried tofu']]],
      [['What is your favorite food?', 'My favorite food is rendang.', 'My favorite food is ...'], ['What do you eat for breakfast?', 'I eat rice and eggs for breakfast.', 'I eat ... for breakfast.']]],
    ['kantin', 'A1', ['How much is this?', 'One iced tea, please.'],
      [['Can I have {x}, please?', ['a bottle of water', 'two fried bananas', 'a bowl of soup']], ['It is {x} rupiah.', ['five thousand', 'ten thousand', 'three thousand']]],
      [['What do you want to buy?', 'I want to buy a sandwich.', 'I want to buy ...'], ['How much is the juice?', 'The juice is eight thousand rupiah.', 'The juice is ... rupiah.']]],
    ['hobi', 'A1', ['I like playing badminton.', 'My hobby is drawing.'],
      [['I like {x} in my free time.', ['singing', 'reading comics', 'cooking']], ['I {x} every Sunday.', ['swim', 'ride my bike', 'play the guitar']]],
      [['What is your hobby?', 'My hobby is playing football.', 'My hobby is ...'], ['What do you do on Sunday?', 'I visit my grandmother on Sunday.', 'I ... on Sunday.']]],
    ['rumah', 'A1', ['My house is near the mosque.', 'There are three bedrooms in my house.'],
      [['The {x} is next to the kitchen.', ['bathroom', 'living room', 'garden']], ['My room is {x}.', ['small', 'tidy', 'blue']]],
      [['Where is your house?', 'My house is near the market.', 'My house is near the ...'], ['What is in your bedroom?', 'There is a bed and a desk in my bedroom.', 'There is a ... in my bedroom.']]],
    ['waktu', 'A1', ['Today is Monday.', 'It is seven o\'clock.'],
      [['We have English on {x}.', ['Tuesday', 'Wednesday', 'Friday']], ['It is {x} now.', ['half past eight', 'ten o\'clock', 'a quarter to twelve']]],
      [['What day is it today?', 'Today is Thursday.', 'Today is ...'], ['What time is it?', 'It is nine o\'clock.', 'It is ...']]],
    ['cuaca', 'A1', ['It is sunny today.', 'It is raining outside.'],
      [['It is very {x} today.', ['hot', 'windy', 'cloudy']], ['I need an umbrella because it is {x}.', ['raining', 'very sunny', 'going to rain']]],
      [['How is the weather today?', 'It is hot and sunny today.', 'It is ... today.'], ['Do you like rainy days?', 'Yes, I like rainy days because it is cool.', 'Yes, I like ... / No, I don\'t like ...']]],
    ['perasaan', 'A1', ['I am happy today.', 'I feel tired.'],
      [['I feel {x} because I have a test.', ['nervous', 'worried', 'excited']], ['She looks {x}.', ['sad', 'angry', 'sleepy']]],
      [['How are you today?', 'I am fine, thank you.', 'I am ...'], ['How do you feel before a test?', 'I feel a little nervous before a test.', 'I feel ... before a test.']]],
    ['izin', 'A1', ['Excuse me, may I come in?', 'Sorry, I am late.'],
      [['May I {x}?', ['go to the toilet', 'open the window', 'ask a question']], ['Could you help me {x}, please?', ['with this word', 'carry this box', 'find my book']]],
      [['What do you say when you are late?', 'I am sorry, I am late.', 'I am sorry, ...'], ['How do you ask to borrow a pen?', 'May I borrow your pen, please?', 'May I borrow ..., please?']]],
    ['arah', 'A2', ['Excuse me, where is the library?', 'Go straight and turn left.'],
      [['The bank is {x} the post office.', ['next to', 'opposite', 'behind']], ['Turn {x} at the traffic light.', ['right', 'left', 'around']]],
      [['How do you get to your school from home?', 'I walk along the main road and turn right at the market.', 'I go ... and turn ...'], ['Where is the nearest mosque?', 'It is next to the school, on the left.', 'It is next to ...']]],
    ['belanja', 'A2', ['I am looking for a school bag.', 'Can I pay with cash?'],
      [['Do you have this shirt in {x}?', ['a bigger size', 'blue', 'a smaller size']], ['I would like to buy {x}.', ['a kilo of rice', 'some vegetables', 'a pair of shoes']]],
      [['What did you buy last weekend?', 'I bought a new notebook last weekend.', 'I bought ... last weekend.'], ['Where do you usually go shopping?', 'I usually go shopping at the traditional market.', 'I usually go shopping at ...']]],
    ['transportasi', 'A2', ['It takes twenty minutes to get to school.', 'I usually take an angkot to school.'],
      [['It takes {x} to get there.', ['ten minutes', 'half an hour', 'about an hour']], ['I go to school {x}.', ['on foot', 'with my father', 'by online motorbike taxi']]],
      [['How long does it take to get to school?', 'It takes about fifteen minutes.', 'It takes about ...'], ['How do you go to school?', 'I go to school by bicycle.', 'I go to school by ...']]],
    ['kesehatan', 'A2', ['I have a headache.', 'You should drink more water.'],
      [['I have a {x}.', ['stomachache', 'fever', 'sore throat']], ['You should {x}.', ['take a rest', 'see a doctor', 'eat some fruit']]],
      [['What is the matter?', 'I have a cold and a cough.', 'I have a ...'], ['What should you do when you have a fever?', 'I should rest and drink a lot of water.', 'I should ...']]],
    ['liburan', 'A2', ['I went to the beach last holiday.', 'We stayed at my uncle\'s house.'],
      [['Last holiday I visited {x}.', ['my grandparents', 'Yogyakarta', 'a waterfall']], ['We {x} together.', ['went fishing', 'cooked dinner', 'played games']]],
      [['Where did you go last holiday?', 'I went to Bali with my family.', 'I went to ...'], ['What did you do there?', 'I swam in the sea and took many photos.', 'I ...']]],
    ['rencana', 'A2', ['I am going to visit my cousin.', 'We are going to clean the classroom.'],
      [['This weekend I am going to {x}.', ['study for the test', 'play futsal', 'help my parents']], ['Next month we are going to {x}.', ['have a school trip', 'celebrate my birthday', 'join a competition']]],
      [['What are you going to do this weekend?', 'I am going to play badminton with my friends.', 'I am going to ...'], ['What will you do after you graduate?', 'I will continue to senior high school.', 'I will ...']]],
    ['teman', 'A2', ['My best friend is kind and funny.', 'She has long black hair.'],
      [['He is {x} than me.', ['taller', 'older', 'faster']], ['My friend is very {x}.', ['friendly', 'smart', 'helpful']]],
      [['Who is your best friend?', 'My best friend is Putri.', 'My best friend is ...'], ['What does your best friend look like?', 'He is tall and he has short hair.', 'He/She is ... and has ...']]],
    ['olahraga', 'A2', ['I play football twice a week.', 'Our team won the match.'],
      [['I am good at {x}.', ['running', 'volleyball', 'table tennis']], ['We practice {x}.', ['every Friday afternoon', 'after school', 'on Saturday morning']]],
      [['What sport do you like?', 'I like basketball because it is exciting.', 'I like ... because ...'], ['How often do you exercise?', 'I exercise three times a week.', 'I exercise ... a week.']]],
    ['pesan', 'A2', ['Hello, can I speak to Rina, please?', 'Can you call me back later?'],
      [['Please tell her that {x}.', ['I will be late', 'the meeting is tomorrow', 'I have her book']], ['Can I leave a message for {x}?', ['your brother', 'Mr. Budi', 'the teacher']]],
      [['What do you say when you answer the phone?', 'Hello, this is Dimas speaking.', 'Hello, this is ... speaking.'], ['How do you ask someone to wait?', 'Please wait a moment.', 'Please ...']]],
    ['cita-cita', 'A2', ['I want to be a doctor.', 'I want to help sick people.'],
      [['I want to be a {x}.', ['pilot', 'teacher', 'programmer']], ['I need to study {x} for my dream.', ['harder', 'English', 'science']]],
      [['What do you want to be in the future?', 'I want to be an engineer.', 'I want to be ...'], ['Why do you want that job?', 'Because I like building things.', 'Because I ...']]],
    ['lingkungan', 'A2', ['Please throw the rubbish in the bin.', 'We should save water.'],
      [['We should not {x}.', ['waste food', 'burn plastic', 'cut the trees']], ['Let\'s {x} together.', ['plant trees', 'clean the river', 'recycle the bottles']]],
      [['How do you keep your classroom clean?', 'We sweep the floor and throw rubbish in the bin.', 'We ... every day.'], ['Why is plastic bad for the sea?', 'Because fish can eat it and die.', 'Because ...']]],
    ['presentasi', 'A2', ['Good morning, everyone.', 'Today I want to talk about my village.'],
      [['First, I will talk about {x}.', ['the history', 'the people', 'the food']], ['In conclusion, {x}.', ['I love my village', 'we must protect it', 'thank you for listening']]],
      [['How do you start a presentation?', 'Good morning, everyone. My name is Ayu and today I will talk about my hobby.', 'Good morning, everyone. Today I will talk about ...'], ['How do you end a presentation?', 'That is all from me. Thank you for listening.', 'That is all from me. Thank you ...']]]
  ];

  var LABEL_TOPIK = {
    'perkenalan': ['sekolah.bicara-topik-perkenalan', 'Perkenalan diri'],
    'keluarga': ['sekolah.bicara-topik-keluarga', 'Keluarga'],
    'sekolah': ['sekolah.bicara-topik-sekolah', 'Di sekolah'],
    'kelas': ['sekolah.bicara-topik-kelas', 'Benda di kelas'],
    'rutinitas': ['sekolah.bicara-topik-rutinitas', 'Kegiatan sehari-hari'],
    'makanan': ['sekolah.bicara-topik-makanan', 'Makanan dan minuman'],
    'kantin': ['sekolah.bicara-topik-kantin', 'Di kantin'],
    'hobi': ['sekolah.bicara-topik-hobi', 'Hobi'],
    'rumah': ['sekolah.bicara-topik-rumah', 'Rumahku'],
    'waktu': ['sekolah.bicara-topik-waktu', 'Hari dan jam'],
    'cuaca': ['sekolah.bicara-topik-cuaca', 'Cuaca'],
    'perasaan': ['sekolah.bicara-topik-perasaan', 'Perasaan'],
    'izin': ['sekolah.bicara-topik-izin', 'Minta izin dan minta tolong'],
    'arah': ['sekolah.bicara-topik-arah', 'Menanyakan arah'],
    'belanja': ['sekolah.bicara-topik-belanja', 'Berbelanja'],
    'transportasi': ['sekolah.bicara-topik-transportasi', 'Perjalanan ke sekolah'],
    'kesehatan': ['sekolah.bicara-topik-kesehatan', 'Saat sakit'],
    'liburan': ['sekolah.bicara-topik-liburan', 'Liburan kemarin'],
    'rencana': ['sekolah.bicara-topik-rencana', 'Rencana ke depan'],
    'teman': ['sekolah.bicara-topik-teman', 'Menggambarkan teman'],
    'olahraga': ['sekolah.bicara-topik-olahraga', 'Olahraga'],
    'pesan': ['sekolah.bicara-topik-pesan', 'Menelepon dan titip pesan'],
    'cita-cita': ['sekolah.bicara-topik-cita-cita', 'Cita-cita'],
    'lingkungan': ['sekolah.bicara-topik-lingkungan', 'Menjaga lingkungan'],
    'presentasi': ['sekolah.bicara-topik-presentasi', 'Presentasi singkat']
  };
  function judulTopik(id) { var l = LABEL_TOPIK[id]; return l ? t(l[0], l[1]) : id; }
  function labelTahap(k) {
    if (k === 'tirukan') return t('sekolah.bicara-tahap-tirukan', 'Dengar dan tirukan');
    if (k === 'ganti') return t('sekolah.bicara-tahap-ganti', 'Ganti kata');
    return t('sekolah.bicara-tahap-jawab', 'Jawab sendiri');
  }

  /* Kata yang tidak dijadikan "kata kunci" umpan balik: kata tugas terlalu pendek untuk dikenali
     pengenal suara dengan andal, dan murid tidak perlu dikejar karenanya. */
  var KATA_TUGAS = 'a an the is am are was were be to of in on at by for and or but my your his her its our their i you he she it we they this that these there do does did can could may please with from as so not no yes me him us them'.split(' ');
  function kataKunci(kalimat) {
    var seen = {};
    return normalisasi(kalimat).filter(function (w) {
      if (w.length < 3 || KATA_TUGAS.indexOf(w) !== -1 || seen[w]) return false;
      seen[w] = true; return true;
    });
  }
  function normalisasi(s) {
    return String(s || '').toLowerCase().replace(/\.\.\./g, ' ').replace(/[’']/g, '\'').replace(/[^a-z0-9'\s-]/g, ' ').split(/\s+/).map(function (w) { return w.replace(/^'+|'+$/g, ''); }).filter(Boolean);
  }

  var ITEMS = [];
  TOPIK.forEach(function (tp) {
    var id = tp[0], level = tp[1];
    tp[2].forEach(function (kal, i) { ITEMS.push({ id: id + '-t' + (i + 1), topik: id, level: level, tahap: 'tirukan', target: kal, contoh: kal }); });
    tp[3].forEach(function (g, i) { ITEMS.push({ id: id + '-g' + (i + 1), topik: id, level: level, tahap: 'ganti', pola: g[0], isian: g[1].slice(), contoh: g[0].replace('{x}', g[1][0]) }); });
    tp[4].forEach(function (j, i) { ITEMS.push({ id: id + '-j' + (i + 1), topik: id, level: level, tahap: 'jawab', tanya: j[0], contoh: j[1], kerangka: j[2] }); });
  });
  var BY_ID = {}; ITEMS.forEach(function (it) { BY_ID[it.id] = it; });
  function itemsTopik(id) { return ITEMS.filter(function (it) { return it.topik === id; }); }

  /**
   * Umpan balik TANPA skor: kata kunci mana yang sudah terdengar dan mana yang bisa dicoba lagi.
   * Sengaja tidak mengembalikan angka — pemanggil tidak punya apa pun untuk dijadikan nilai.
   *   - tirukan: kata kunci dari kalimat target
   *   - ganti:   kata kunci dari pola; isian mana pun yang terdengar dihitung (murid boleh memilih)
   *   - jawab:   kata kunci dari kerangka jawaban (jawaban murid bebas isinya)
   */
  function cocokkan(item, transkrip) {
    var dengar = normalisasi(transkrip), ada = {};
    dengar.forEach(function (w) { ada[w] = true; });
    var kunci;
    if (item.tahap === 'ganti') kunci = kataKunci(item.pola.replace('{x}', ' '));
    else if (item.tahap === 'jawab') kunci = kataKunci(item.kerangka);
    else kunci = kataKunci(item.target);
    var terdengar = kunci.filter(function (w) { return ada[w]; });
    var belum = kunci.filter(function (w) { return !ada[w]; });
    var isian = null;
    if (item.tahap === 'ganti') {
      isian = item.isian.filter(function (x) { var k = kataKunci(x); return k.length && k.every(function (w) { return ada[w]; }); })[0] || null;
    }
    return { terdengar: terdengar, belum: belum, isian: isian, isianBelum: item.tahap === 'ganti' && !isian, kosong: !dengar.length };
  }

  /* -------------------------------------------------------------- kemajuan lokal --- */
  function muat() {
    try { var p = JSON.parse((root.localStorage && root.localStorage.getItem(KEY)) || '{}'); if (p && typeof p === 'object' && p.lancar && typeof p.lancar === 'object') return p; } catch (_) {}
    return { lancar: {} };
  }
  function simpan(p) { try { root.localStorage && root.localStorage.setItem(KEY, JSON.stringify({ lancar: p.lancar || {} })); } catch (_) {} }
  function tandaiLancar(p, id) { if (BY_ID[id]) { p.lancar[id] = 1; simpan(p); } return p; }
  function ringkasTopik(p, id) {
    var list = itemsTopik(id), sudah = list.filter(function (it) { return p.lancar[it.id]; }).length;
    return { id: id, judul: judulTopik(id), level: (TOPIK.filter(function (x) { return x[0] === id; })[0] || [])[1], sudah: sudah, total: list.length, selesai: sudah === list.length };
  }
  /** Latihan berikutnya dalam topik: urut tahap (tirukan → ganti → jawab), lewati yang sudah lancar. */
  function berikutnya(p, id) { return itemsTopik(id).filter(function (it) { return !p.lancar[it.id]; })[0] || null; }
  /** Topik yang disarankan: topik pertama (urutan A1 → A2) yang belum selesai. */
  function topikSaran(p) {
    for (var i = 0; i < TOPIK.length; i++) if (!ringkasTopik(p, TOPIK[i][0]).selesai) return TOPIK[i][0];
    return null;
  }

  /* --------------------------------------------------------------------- tampilan --- */
  var host = null, env = {}, ui = { topik: null, item: null, umpan: null, mendengar: false, tampilContoh: false };
  function recognizer() { return root.SpeechRecognition || root.webkitSpeechRecognition || null; }

  function layarDaftar(p) {
    var saran = topikSaran(p);
    var kartu = TOPIK.map(function (tp) {
      var r = ringkasTopik(p, tp[0]);
      return '<li><button type="button" class="bp-topik' + (r.selesai ? ' is-done' : '') + (tp[0] === saran ? ' is-next' : '') + '" data-bp="topik" data-topik="' + esc(tp[0]) + '" data-testid="bp-topik-' + esc(tp[0]) + '">' +
        '<b>' + esc(r.judul) + '</b><small>' + esc(r.level) + ' · ' + esc(t('sekolah.bicara-lancar-dari', '{a} dari {b} lancar').replace('{a}', r.sudah).replace('{b}', r.total)) + '</small></button></li>';
    }).join('');
    return '<div class="bp" data-testid="bicara-privat">' +
      '<div class="lf-card bp-intro"><h2>' + esc(t('sekolah.bicara-judul', 'Latihan bicara privat')) + '</h2>' +
      '<p>' + esc(t('sekolah.bicara-janji', 'Di sini tidak ada nilai, tidak ada penonton, dan suaramu tidak direkam. Tidak ada yang dikirim ke guru. Salah itu bagian dari latihan.')) + '</p>' +
      '<p class="lf-muted">' + esc(t('sekolah.bicara-cara', 'Setiap topik punya tiga tahap: dengar dan tirukan, ganti kata, lalu jawab sendiri. Kamu sendiri yang memutuskan kapan sudah lancar.')) + '</p></div>' +
      '<ul class="bp-daftar">' + kartu + '</ul></div>';
  }

  function layarLatihan(p) {
    var it = ui.item, r = ringkasTopik(p, ui.topik);
    if (!it) {
      return '<div class="bp" data-testid="bicara-privat"><div class="lf-card bp-selesai"><h2>' + esc(r.judul) + '</h2><p>' + esc(t('sekolah.bicara-topik-selesai', 'Semua latihan di topik ini sudah kamu tandai lancar. Hebat — kamu sudah berani mencoba.')) + '</p>' +
        '<div class="lf-actions"><button type="button" class="lf-primary" data-bp="daftar" data-testid="bp-daftar">' + esc(t('sekolah.bicara-pilih-topik', 'Pilih topik lain')) + '</button>' +
        '<button type="button" class="lf-mini" data-bp="ulang-topik" data-testid="bp-ulang-topik">' + esc(t('sekolah.bicara-ulang-topik', 'Latih ulang topik ini')) + '</button></div></div></div>';
    }
    var soal = '';
    if (it.tahap === 'tirukan') soal = '<p class="bp-instruksi">' + esc(t('sekolah.bicara-ins-tirukan', 'Dengarkan, lalu ucapkan kalimat ini.')) + '</p><p class="bp-kalimat" lang="en">' + esc(it.target) + '</p>';
    else if (it.tahap === 'ganti') soal = '<p class="bp-instruksi">' + esc(t('sekolah.bicara-ins-ganti', 'Ucapkan kalimat ini dengan salah satu kata pilihan. Coba semuanya kalau mau.')) + '</p><p class="bp-kalimat" lang="en">' + esc(it.pola).replace('{x}', '<span class="bp-slot">____</span>') + '</p><p class="bp-isian" lang="en">' + it.isian.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</p>';
    else soal = '<p class="bp-instruksi">' + esc(t('sekolah.bicara-ins-jawab', 'Jawab pertanyaan ini dengan kalimatmu sendiri. Pakai kerangka bila perlu.')) + '</p><p class="bp-kalimat" lang="en">' + esc(it.tanya) + '</p><p class="bp-kerangka" lang="en">' + esc(it.kerangka) + '</p>' +
      (ui.tampilContoh ? '<p class="bp-contoh" lang="en" data-testid="bp-contoh">' + esc(t('sekolah.bicara-contoh', 'Contoh jawaban:')) + ' ' + esc(it.contoh) + '</p>' : '');
    var umpan = '';
    if (ui.mendengar) umpan = '<p class="bp-umpan" role="status">' + esc(t('sekolah.bicara-mendengar', 'Silakan bicara… Pau mendengarkan.')) + '</p>';
    else if (ui.umpan && ui.umpan.galat) umpan = '<p class="bp-umpan" role="status">' + esc(t('sekolah.bicara-tanpa-pengenal', 'Pengenal suara tidak tersedia sekarang (sering karena tanpa internet). Tidak apa-apa: ucapkan dengan suara jelas, dengarkan contohnya lagi, lalu nilai sendiri.')) + '</p>';
    else if (ui.umpan && ui.umpan.kosong) umpan = '<p class="bp-umpan" role="status">' + esc(t('sekolah.bicara-tak-terdengar', 'Pau belum mendengar suaramu. Coba dekatkan HP dan ucapkan lagi.')) + '</p>';
    else if (ui.umpan) {
      var u = ui.umpan;
      umpan = '<div class="bp-umpan" role="status" data-testid="bp-umpan">' +
        (u.terdengar.length ? '<p>' + esc(t('sekolah.bicara-terdengar', 'Sudah terdengar:')) + ' <span lang="en">' + u.terdengar.map(esc).join(', ') + '</span></p>' : '') +
        (u.isian ? '<p>' + esc(t('sekolah.bicara-isian-terdengar', 'Kata pilihanmu terdengar:')) + ' <span lang="en">' + esc(u.isian) + '</span></p>' : '') +
        (u.isianBelum ? '<p>' + esc(t('sekolah.bicara-isian-belum', 'Kata pilihan belum terdengar. Ucapkan salah satu:')) + ' <span lang="en">' + ui.item.isian.map(esc).join(' / ') + '</span></p>' : '') +
        (u.belum.length || u.isianBelum ? (u.belum.length ? '<p>' + esc(t('sekolah.bicara-coba-lagi', 'Coba ucapkan lagi dengan jelas:')) + ' <span lang="en">' + u.belum.map(esc).join(', ') + '</span></p>' : '') : '<p>' + esc(t('sekolah.bicara-semua-terdengar', 'Semua kata penting terdengar. Bagus!')) + '</p>') +
        '</div>';
    }
    return '<div class="bp" data-testid="bicara-privat"><div class="lf-card bp-latihan">' +
      '<p class="lf-kicker">' + esc(r.judul) + ' · ' + esc(labelTahap(it.tahap)) + ' · ' + esc(t('sekolah.bicara-lancar-dari', '{a} dari {b} lancar').replace('{a}', r.sudah).replace('{b}', r.total)) + '</p>' + soal +
      '<div class="lf-actions">' +
        '<button type="button" class="lf-mini" data-bp="dengar" data-testid="bp-dengar">' + esc(t('sekolah.bicara-dengar', 'Dengar contoh')) + '</button>' +
        (recognizer() ? '<button type="button" class="lf-mini" data-bp="bicara" data-testid="bp-bicara"' + (ui.mendengar ? ' disabled' : '') + '>' + esc(t('sekolah.bicara-mulai', 'Ucapkan sekarang')) + '</button>' : '') +
        (it.tahap === 'jawab' && !ui.tampilContoh ? '<button type="button" class="lf-mini" data-bp="contoh" data-testid="bp-lihat-contoh">' + esc(t('sekolah.bicara-lihat-contoh', 'Lihat contoh jawaban')) + '</button>' : '') +
      '</div>' + umpan +
      '<div class="lf-actions bp-putuskan">' +
        '<button type="button" class="lf-primary" data-bp="lancar" data-testid="bp-lancar">' + esc(t('sekolah.bicara-sudah-lancar', 'Sudah lancar, lanjut')) + '</button>' +
        '<button type="button" class="lf-mini" data-bp="lewati" data-testid="bp-lewati">' + esc(t('sekolah.bicara-nanti', 'Lewati dulu')) + '</button>' +
        '<button type="button" class="lf-mini" data-bp="daftar">' + esc(t('sekolah.bicara-pilih-topik', 'Pilih topik lain')) + '</button>' +
      '</div>' +
      (recognizer() ? '' : '<p class="lf-muted">' + esc(t('sekolah.bicara-mandiri', 'HP ini tidak punya pengenal suara. Latihan tetap jalan: dengarkan contoh, ucapkan, lalu nilai sendiri.')) + '</p>') +
      '</div></div>';
  }

  function render() {
    if (!host) return;
    var p = muat();
    host.innerHTML = ui.topik ? layarLatihan(p) : layarDaftar(p);
  }
  function bukaTopik(id, p) { ui.topik = id; ui.item = berikutnya(p || muat(), id); ui.umpan = null; ui.tampilContoh = false; }

  function dengar() {
    var it = ui.item, V = root.FiezelVoiceSay;
    if (!it || !V || typeof V.say !== 'function') return;
    try { V.say(it.contoh, { speed: 0.9 }); } catch (_) {}
  }
  function bicara() {
    var R = recognizer(), it = ui.item;
    if (!R || !it || ui.mendengar) return;
    var rec;
    try { rec = new R(); } catch (_) { ui.umpan = { galat: true }; render(); return; }
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 3;
    var selesai = false;
    rec.onresult = function (e) {
      selesai = true;
      /* Gabungan alternatif dipakai supaya ucapan yang benar tetapi "didengar" sedikit berbeda
         tetap diakui. Transkrip hanya hidup di variabel ini; tidak disimpan, tidak dikirim. */
      var teks = '';
      try { var hasil = e.results[0]; for (var i = 0; i < hasil.length; i++) teks += ' ' + hasil[i].transcript; } catch (_) {}
      ui.mendengar = false; ui.umpan = cocokkan(it, teks); render();
    };
    rec.onerror = function () { selesai = true; ui.mendengar = false; ui.umpan = { galat: true }; render(); };
    rec.onend = function () { if (!selesai) { ui.mendengar = false; ui.umpan = { kosong: true, terdengar: [], belum: [] }; render(); } };
    ui.mendengar = true; ui.umpan = null; render();
    try { rec.start(); } catch (_) { ui.mendengar = false; ui.umpan = { galat: true }; render(); }
  }

  function onClick(ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-bp]') : null;
    if (!btn || !host || !host.contains(btn)) return;
    var p = muat();
    switch (btn.getAttribute('data-bp')) {
      case 'topik': bukaTopik(btn.getAttribute('data-topik'), p); break;
      case 'daftar': ui.topik = null; ui.item = null; ui.umpan = null; break;
      case 'dengar': dengar(); return;
      case 'bicara': bicara(); return;
      case 'contoh': ui.tampilContoh = true; break;
      case 'lancar': if (ui.item) { tandaiLancar(p, ui.item.id); bukaTopik(ui.topik, p); } break;
      case 'lewati': {
        /* Lewati = ke latihan berikutnya yang belum lancar dalam topik ini, tanpa menandai apa pun. */
        var list = itemsTopik(ui.topik).filter(function (x) { return !p.lancar[x.id]; });
        var i = ui.item ? list.map(function (x) { return x.id; }).indexOf(ui.item.id) : -1;
        ui.item = list.length ? list[(i + 1) % list.length] : null; ui.umpan = null; ui.tampilContoh = false;
        break;
      }
      case 'ulang-topik': itemsTopik(ui.topik).forEach(function (x) { delete p.lancar[x.id]; }); simpan(p); bukaTopik(ui.topik, p); break;
      default: return;
    }
    render();
  }

  function mount(el, options) {
    if (host && host !== el) unmount();
    host = el; env = options || {};
    el.addEventListener('click', onClick);
    render();
  }
  function unmount() { if (host) host.removeEventListener('click', onClick); host = null; ui = { topik: null, item: null, umpan: null, mendengar: false, tampilContoh: false }; }

  return {
    KEY: KEY, TOPIK_IDS: TOPIK.map(function (x) { return x[0]; }), ITEMS: ITEMS, byId: function (id) { return BY_ID[id] || null; },
    judulTopik: judulTopik, kataKunci: kataKunci, cocokkan: cocokkan,
    muat: muat, tandaiLancar: tandaiLancar, ringkasTopik: ringkasTopik, berikutnya: berikutnya, topikSaran: topikSaran,
    mount: mount, unmount: unmount, render: render
  };
});
