/**
 * FIEZEL KelasKu untuk Guru — cangkang UI khusus guru (terpisah total dari cangkang murid).
 * Dipasang oleh app.js lewat tutorCenterView() untuk akun guru terverifikasi.
 * Semua data via FiezelTeacherStore (lokal di perangkat guru).
 */
(function (root) {
  'use strict';

  /* m025-265 · sapuan kebocoran Thai: naskah modul ini dulu literal Indonesia, jadi murid
     yang memilih th tetap membacanya dalam bahasa Indonesia. t() fail-soft: kalau copy-map
     belum termuat, fallback id yang tampil — bukan kunci mentah. */
  /* Bendera dibaca lewat FiezelUX kalau ada; kalau tidak ada, jawabannya MATI. Sama
     seperti uxOn() di app.js: nama tak dikenal -> false, jadi salah ketik menyembunyikan
     permukaan (aman), bukan menyalakannya diam-diam. */
  function uxOn(flag) {
    try {
      var api = (typeof self !== 'undefined' ? self : this).FiezelUX;
      return !!(api && typeof api.on === 'function' && api.on(flag) === true);
    } catch (_) { return false; }
  }

  /* Pintu konsol kurikulum diturunkan dari ALAMAT BACKENDNYA, bukan dari bendera yang
     bisa disetel tangan. Alamat kosong = backend belum dipasang = pintu tertutup, apa pun
     isi benderanya. Bendera tetap dihormati sebagai sakelar mati tambahan: keduanya harus
     setuju untuk membuka. Kegagalan di mana pun di rantai ini menutup pintu. */
  function konsolKurikulumSiap() {
    try {
      var root = (typeof self !== 'undefined' ? self : this);
      var c = root.FIEZEL_CURRICULUM_CONFIG || {};
      var alamat = String(c.curriculumApiUrl || '').trim();
      if (!alamat) return false;
      return uxOn('curriculumConsole');
    } catch (_) { return false; }
  }

  function t(k, fb) {
    /* FiezelI18n.t() mengembalikan KUNCINYA saat kalimatnya belum termuat. Mengembalikan
       itu apa adanya berarti guru membaca 'guru.tab-jurnal' di layarnya, padahal kalimat
       cadangannya sudah tertulis di pemanggil. Cadangan dipakai untuk DUA keadaan:
       FiezelI18n tidak ada, dan kuncinya tidak terpecahkan. */
    var s;
    try { var I = (typeof self !== 'undefined' ? self : this).FiezelI18n; s = I && I.t ? I.t(k) : undefined; } catch (_) {}
    return (s === undefined || s === k) ? (fb == null ? k : fb) : s;
  }
  if (!root) return;
  var S = function () { return root.FiezelTeacherStore; };
  var el = null, env = {}, st = null, ui = { modal: null, drawer: null, filter: '', insightSkill: 'past_tense', attDate: null, pick: {}, syncing: false, curriculumSubject: 'MAT', curriculumGrade: 'ALL', curriculumTree: null, curriculumLoading: false, curriculumError: null, curriculumSeeded: null, seeding: false }, syncTimer = null, chipTimer = null, visListener = null;
  /*
   * DUA detak, bukan satu. m025-261 menyatukan keduanya pada 3 detik dan itu merusak dua hal
   * sekaligus; m025-262 memisahkannya lagi.
   *
   * 1. CHIP_TICK_MS - hanya mengecat ulang label chipnya. Yang owner minta adalah chip yang
   *    selalu berbunyi "Tersinkron baru saja"; label itu dihitung dari selisih MENIT terhadap
   *    lastPullAt (lihat syncLabel di store), jadi menjaganya tetap segar TIDAK butuh jaringan
   *    sama sekali. Menyeret permintaan jaringan ke 3 detik demi label yang berubah tiap menit
   *    adalah harga yang dibayar untuk sesuatu yang bisa gratis.
   *
   * 2. SYNC_EVERY_MS - ronde jaringan yang sesungguhnya. Server memasang lantainya sendiri di
   *    LIMITS.TEACHER_MIN_INTERVAL_MS = 3000 ms (workers/api/teacher/class-sync-core.js) dan
   *    menolak dengan 429 apa pun yang lebih rapat. Klien m025-261 memakai persis 3000 ms -
   *    tepat DI lantai itu, jadi jitter sekecil apa pun membuat sebagian ronde ditolak, chip
   *    berkedip merah, dan syncFailStreak menanjak tanpa sebab nyata. Jarak amannya bukan
   *    selera: ia harus berada di atas lantai server, dengan marjin.
   */
  var CHIP_TICK_MS = 1000;
  var SYNC_EVERY_MS = 10000;
  var syncFailStreak = 0;
  var pendingRender = false;
  var NAV = [['hub', t('guru.nav-ruang-kelas', 'Ruang Kelas'), 'school'], ['briefing', t('guru.nav-ringkasan', 'Ringkasan Hari Ini'), 'sunrise'], ['classes', t('guru.tab-kelas-siswa', 'Kelas & Siswa'), 'users'], ['assignments', t('guru.tab-tugas-ujian', 'Tugas & Ujian'), 'clipboard-list'], ['insights', 'Analitik', 'activity'], ['comms', 'Komunikasi', 'megaphone'], ['journal', t('guru.tab-jurnal', 'Jurnal Guru'), 'notebook-pen']];
  var TITLE = { hub: t('guru.judul-ruang-kelas', 'Ruang Kelas — guru, murid, dan hasil belajar dalam satu layar'), briefing: t('guru.judul-ringkasan', 'Ringkasan hari ini'), classes: t('guru.tab-kelas-siswa', 'Kelas & Siswa'), assignments: t('guru.tab-tugas-ujian', 'Tugas & Ujian'), insights: t('guru.judul-analitik', 'Analitik — siapa yang perlu dibantu'), comms: 'Komunikasi', journal: t('guru.tab-jurnal', 'Jurnal Guru'), settings: t('guru.tab-profil', 'Profil Guru'), curriculum: t('guru.nav-kurikulum', 'Kurikulum & Materi') };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]; }); }
  function pct(v) { return S().pct(v); }
  function icon(n) { var I = root.FiezelTeacherIcons; return I && I.has(n) ? I.svg(n) : '<i data-lucide="' + n + '" aria-hidden="true"></i>'; }
  function toast(t) { if (env.toast) env.toast(t); }
  function copy(text, msg) { try { navigator.clipboard.writeText(text).then(function () { toast(msg || 'Tersalin.'); }, function () { toast('Tidak bisa menyalin otomatis.'); }); } catch (_) { toast('Tidak bisa menyalin otomatis.'); } }
  function saveMinutes(n) { st.savedMinutes = (st.savedMinutes || 0) + n; }
  function persist() { S().save(st); }
  /* Lembar akun hidup di app.js dan sudah dipasang di window. Ruang Guru memanggilnya
     lewat satu pintu ini supaya tidak ada dua salinan alur masuk. */
  function openAccount(mode) {
    try {
      if (typeof root.openFiezelAuthModal === 'function') {
        root.openFiezelAuthModal(mode || 'login');
        return true;
      }
      if (typeof root.openAccountSheet === 'function') {
        root.openAccountSheet(mode || 'login');
        return true;
      }
    } catch (_) {}
    toast('Lembar akun belum siap — muat ulang aplikasi lalu coba lagi.');
    return false;
  }
  function accountRole() { try { return (root.FiezelAccount && root.FiezelAccount.role && root.FiezelAccount.role()) || ''; } catch (_) { return ''; } }
  function accountHandle() { try { var a = root.FiezelAccount && root.FiezelAccount.state && root.FiezelAccount.state(); return a && a.handle ? a.handle : ''; } catch (_) { return ''; } }
  function cls() { return st.classes.filter(function (c) { return c.id === st.activeClassId; })[0] || null; }
  function student(id) { var c = cls(); return c ? c.students.filter(function (s) { return s.id === id; })[0] : null; }
  function initials(n) { return String(n || '?').trim().slice(0, 2).toUpperCase(); }
  function hue(n) { var h = 0; for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360; return h; }
  function avatar(s, size) { return '<span class="tg-avatar' + (size ? ' is-' + size : '') + '" style="--h:' + hue(s.name) + '">' + esc(initials(s.name)) + '</span>'; }
  function riskPill(r) { return '<span class="tg-pill is-' + r.level + '" title="' + esc(r.reasons.join(', ')) + '">' + (r.level === 'risiko' ? 'Berisiko' : r.level === 'pantau' ? 'Pantau' : 'Aman') + '</span>'; }
  function bar(v, cls) { return '<span class="tg-bar' + (cls ? ' ' + cls : '') + '"><i style="width:' + (v == null ? 0 : Math.round(v * 100)) + '%"></i></span>'; }
  function cell(v) { var t = v == null ? 'none' : v >= 0.75 ? 'hi' : v >= 0.5 ? 'mid' : 'lo'; return '<td class="tg-heat is-' + t + '">' + pct(v) + '</td>'; }

  var MAPEL_LIST = [
    { id: 'MAT', name: 'Matematika', grade: 'SD / SMP / SMA' },
    { id: 'IND', name: 'Bahasa Indonesia', grade: 'SD / SMP / SMA' },
    { id: 'ENG', name: 'Bahasa Inggris', grade: 'SD / SMP / SMA' },
    { id: 'IPA', name: 'Ilmu Pengetahuan Alam (IPA)', grade: 'SD / SMP' },
    { id: 'IPS', name: 'Ilmu Pengetahuan Sosial (IPS)', grade: 'SD / SMP' },
    { id: 'INF', name: 'Informatika', grade: 'SMP / SMA' },
    { id: 'PPK', name: 'Pendidikan Pancasila', grade: 'SD / SMP / SMA' },
    { id: 'AGM', name: 'Pendidikan Agama & Budi Pekerti', grade: 'SD / SMP / SMA' },
    { id: 'FIS', name: 'Fisika', grade: 'SMA' },
    { id: 'KIM', name: 'Kimia', grade: 'SMA' },
    { id: 'BIO', name: 'Biologi', grade: 'SMA' },
    { id: 'EKO', name: 'Ekonomi', grade: 'SMA' },
    { id: 'GEO', name: 'Geografi', grade: 'SMA' },
    { id: 'SOS', name: 'Sosiologi', grade: 'SMA' },
    { id: 'SEJ', name: 'Sejarah', grade: 'SMA' },
    { id: 'PJK', name: 'PJOK', grade: 'SD / SMP / SMA' },
    { id: 'SNB', name: 'Seni Budaya & Prakarya', grade: 'SD / SMP / SMA' }
  ];

  function mapelName(id) {
    for (var i = 0; i < MAPEL_LIST.length; i++) {
      if (MAPEL_LIST[i].id === id) return MAPEL_LIST[i].name;
    }
    return '';
  }

  var MAPEL_CATALOG = {
    MAT: {
      name: 'Matematika',
      grade: 'SD / SMP / SMA',
      competencies: [
        { code: 'KOMP-MAT-D-7-BIL-01', name: t('mapel_mat_c1_name', 'Operasi Hitung Bilangan Bulat & Pecahan'), materi: t('mapel_mat_c1_mat', 'Penjumlahan, pengurangan, perkalian, pembagian bilangan rasional dan estimasi') },
        { code: 'KOMP-MAT-D-8-ALJ-01', name: t('mapel_mat_c2_name', 'Aljabar & Persamaan Linier Dua Variabel'), materi: t('mapel_mat_c2_mat', 'Menyelesaikan SPLDV dengan metode substitusi dan eliminasi kontekstual') },
        { code: 'KOMP-MAT-D-8-GEO-01', name: t('mapel_mat_c3_name', 'Geometri & Teorema Pythagoras'), materi: t('mapel_mat_c3_mat', 'Membuktikan dan menghitung panjang sisi segitiga siku-siku serta tripel Pythagoras') },
        { code: 'KOMP-MAT-D-9-STA-01', name: t('mapel_mat_c4_name', 'Statistika & Peluang Empiris'), materi: t('mapel_mat_c4_mat', 'Menghitung pemusatan data rata-rata, median, modus, dan frekuensi relatif') }
      ],
      teachingBrief: {
        summary: t('mapel_mat_tb_sum', 'Penguasaan konsep bilangan rasional, pemodelan aljabar, dan logika spasial geometri.'),
        hook5Minutes: t('mapel_mat_tb_hook', 'Tunjukkan struk belanja minimarket atau tebak tanggal lahir dengan manipulasi aljabar sederhana.'),
        boardFormula: t('mapel_mat_tb_board', 'x = (-b ± √(b² - 4ac)) / (2a) · Urutan operasi: Kabataku (Kali Bagi Tambah Kurang)'),
        commonMisconceptions: [
          { trap: t('mapel_mat_mc1_trap', 'Aturan tanda negatif'), pattern: t('mapel_mat_mc1_pat', 'Siswa mengira -a - b sama dengan -(a - b)'), fix: t('mapel_mat_mc1_fix', 'Gunakan garis bilangan atau analogi utang-piutang: utang 3 lalu utang 2 = utang 5 (-3 - 2 = -5)') }
        ]
      }
    },
    IND: {
      name: 'Bahasa Indonesia',
      grade: 'SD / SMP / SMA',
      competencies: [
        { code: 'KOMP-IND-D-7-TEK-01', name: t('mapel_ind_c1_name', 'Teks Deskripsi & Ide Pokok Paragraf'), materi: t('mapel_ind_c1_mat', 'Menemukan gagasan utama dan mencirikan teks deskriptif objektif') },
        { code: 'KOMP-IND-D-8-EKS-01', name: t('mapel_ind_c2_name', 'Teks Eksplanasi Fenomena Alam & Sosial'), materi: t('mapel_ind_c2_mat', 'Menganalisis hubungan kausalitas sebab-akibat dan konjungsi kronologis') },
        { code: 'KOMP-IND-E-10-ARG-01', name: t('mapel_ind_c3_name', 'Teks Argumentasi & Membedakan Fakta vs Opini'), materi: t('mapel_ind_c3_mat', 'Berpikir kritis memilah bukti empiris faktual terhadap klaim opini subjektif') }
      ],
      teachingBrief: {
        summary: t('mapel_ind_tb_sum', 'Kemampuan literasi membaca kritis, penalaran logika argumen, dan sintesis wacana.'),
        hook5Minutes: t('mapel_ind_tb_hook', 'Tampilkan satu judul berita sensasional: minta murid memisahkan mana fakta dan mana opini penulis.'),
        boardFormula: t('mapel_ind_tb_board', 'Ide Pokok = Kalimat Utama; Fakta = Data empiris terverifikasi; Opini = Pandangan / kata sifat subjektif'),
        commonMisconceptions: [
          { trap: t('mapel_ind_mc1_trap', 'Tertukar fakta dan opini'), pattern: t('mapel_ind_mc1_pat', 'Siswa menganggap pernyataan tokoh penting otomatis selalu fakta'), fix: t('mapel_ind_mc1_fix', 'Uji dengan pertanyaan verifikasi: dapatkah dibuktikan dengan data terukur atau hanya penilaian?') }
        ]
      }
    },
    ENG: {
      name: 'Bahasa Inggris',
      grade: 'SD / SMP / SMA',
      competencies: [
        { code: 'KOMP-ENG-D-7-DSC-01', name: t('mapel_eng_c1_name', 'Descriptive Text & Everyday Adjectives'), materi: t('mapel_eng_c1_mat', 'Describing people, objects, animals, and daily environment using Simple Present') },
        { code: 'KOMP-ENG-D-8-RCT-01', name: t('mapel_eng_c2_name', 'Recount Text & Simple Past Tense'), materi: t('mapel_eng_c2_mat', 'Retelling personal past events with regular and irregular verbs and time connectors') },
        { code: 'KOMP-ENG-E-10-EXP-01', name: t('mapel_eng_c3_name', 'Analytical Exposition & Opinion Stance'), materi: t('mapel_eng_c3_mat', 'Formulating arguments, thesis statement, and reiteration for critical reasoning') }
      ],
      teachingBrief: {
        summary: t('mapel_eng_tb_sum', 'Pengembangan kompetensi komunikatif lintas genre teks: deskripsi, recount, dan eksposisi analitis.'),
        hook5Minutes: t('mapel_eng_tb_hook', 'Flash 3 foto situasi misterius di proyektor: minta siswa menduga apa yang terjadi kemarin menggunakan Simple Past.'),
        boardFormula: t('mapel_eng_tb_board', 'Recount: Orientation ➔ Events ➔ Re-orientation; Simple Past: S + V2 / did not + V1'),
        commonMisconceptions: [
          { trap: t('mapel_eng_mc1_trap', 'Double past tense'), pattern: t('mapel_eng_mc1_pat', 'Siswa menulis did you went? atau he did not saw'), fix: t('mapel_eng_mc1_fix', 'Auxiliary did sudah menyerap bentuk lampau; kata kerja utama kembali ke bare infinitive (did you go?)') }
        ]
      }
    },
    IPA: {
      name: 'Ilmu Pengetahuan Alam (IPA)',
      grade: 'SD / SMP',
      competencies: [
        { code: 'KOMP-IPA-D-7-MET-01', name: t('mapel_ipa_c1_name', 'Besaran, Satuan & Metode Ilmiah'), materi: t('mapel_ipa_c1_mat', 'Pengukuran besaran pokok dan turunan, konversi satuan SI, dan keselamatan laboratorium') },
        { code: 'KOMP-IPA-D-8-SEL-01', name: t('mapel_ipa_c2_name', 'Sel, Jaringan & Sistem Organ Manusia'), materi: t('mapel_ipa_c2_mat', 'Struktur sel hewan dan tumbuhan, mikroskop, serta organ respirasi dan ekskresi') },
        { code: 'KOMP-IPA-D-9-LIS-01', name: t('mapel_ipa_c3_name', 'Listrik Dinamis, Hambatan & Kemagnetan'), materi: t('mapel_ipa_c3_mat', 'Hukum Ohm (V = I·R), rangkaian seri-paralel, dan induksi elektromagnetik') }
      ],
      teachingBrief: {
        summary: t('mapel_ipa_tb_sum', 'Penyelidikan ilmiah empiris fenomena alam, organisasi materi kehidupan, dan konversi energi.'),
        hook5Minutes: t('mapel_ipa_tb_hook', 'Tunjukkan balon yang digosokkan ke kain wol lalu menempel di dinding atau mengangkat potongan kertas.'),
        boardFormula: t('mapel_ipa_tb_board', 'V = I · R; Besaran Pokok SI: Panjang (m), Massa (kg), Waktu (s), Suhu (K), Arus (A)'),
        commonMisconceptions: [
          { trap: t('mapel_ipa_mc1_trap', 'Massa tertukar dengan berat'), pattern: t('mapel_ipa_mc1_pat', 'Siswa mengira massa dan berat adalah besaran yang persis sama'), fix: t('mapel_ipa_mc1_fix', 'Massa (kg) adalah jumlah materi konstan di mana pun; berat (N) adalah gaya gravitasi yang berubah menurut lokasi') }
        ]
      }
    },
    IPS: {
      name: 'Ilmu Pengetahuan Sosial (IPS)',
      grade: 'SD / SMP',
      competencies: [
        { code: 'KOMP-IPS-D-7-RNG-01', name: t('mapel_ips_c1_name', 'Interaksi Antarruang & Letak Geografis'), materi: t('mapel_ips_c1_mat', 'Peta Indonesia, letak astronomis-geologis, dan potensi sumber daya alam maritim') },
        { code: 'KOMP-IPS-D-8-SOS-01', name: t('mapel_ips_c2_name', 'Interaksi Sosial, Diferensiasi & Integrasi'), materi: t('mapel_ips_c2_mat', 'Bentuk interaksi asosiatif dan disosiatif, lembaga sosial, serta pluralitas budaya nusantara') },
        { code: 'KOMP-IPS-D-9-GLB-01', name: t('mapel_ips_c3_name', 'Globalisasi & Perkembangan Ekonomi Digital'), materi: t('mapel_ips_c3_mat', 'Dampak perubahan sosial budaya, perdagangan internasional, dan ekonomi kreatif') }
      ],
      teachingBrief: {
        summary: t('mapel_ips_tb_sum', 'Kajian keterhubungan spasial, pranata sosial kemasyarakatan, dan dinamika perekonomian masyarakat.'),
        hook5Minutes: t('mapel_ips_tb_hook', 'Minta murid memeriksa label asal baju atau sepatu yang mereka kenakan untuk membuktikan perdagangan antarwilayah.'),
        boardFormula: t('mapel_ips_tb_board', 'Kebutuhan Tak Terbatas + Sumber Daya Terbatas = Kelangkaan (Scarcity) ➔ Menuntut Skala Prioritas'),
        commonMisconceptions: [
          { trap: t('mapel_ips_mc1_trap', 'Konsep kelangkaan ekonomi'), pattern: t('mapel_ips_mc1_pat', 'Mengira langka berarti barangnya hampir punah di muka bumi'), fix: t('mapel_ips_mc1_fix', 'Langka dalam ekonomi berarti jumlah yang diinginkan melampaui jumlah yang tersedia cuma-cuma tanpa pengorbanan') }
        ]
      }
    },
    INF: {
      name: 'Informatika',
      grade: 'SMP / SMA',
      competencies: [
        { code: 'KOMP-INF-D-7-BK-01', name: t('mapel_inf_c1_name', 'Berpikir Komputasional & 4 Pilar Problem Solving'), materi: t('mapel_inf_c1_mat', 'Dekomposisi, pengenalan pola, abstraksi, dan perancangan algoritma langkah terurut') },
        { code: 'KOMP-INF-D-8-JKI-01', name: t('mapel_inf_c2_name', 'Jaringan Komputer, Topologi & Keamanan Internet'), materi: t('mapel_inf_c2_mat', 'Perbedaan LAN vs WAN, protokol data, enkripsi sederhana, dan etika privasi siber') },
        { code: 'KOMP-INF-E-10-AP-01', name: t('mapel_inf_c3_name', 'Algoritma Pemrograman: Percabangan & Perulangan'), materi: t('mapel_inf_c3_mat', 'Penerapan variabel, percabangan if-else, dan loop for/while untuk pemecahan masalah') }
      ],
      teachingBrief: {
        summary: t('mapel_inf_tb_sum', 'Fondasi berpikir komputasional logis, struktur data, dan rekayasa perangkat lunak dasar.'),
        hook5Minutes: t('mapel_inf_tb_hook', 'Tantang murid memberikan instruksi membuat teh manis ke guru yang berperan sebagai robot yang harfiah.'),
        boardFormula: t('mapel_inf_tb_board', 'Input ➔ Proses (Kondisi/Branch + Loop) ➔ Output; 4 Pilar: Dekomposisi, Pola, Abstraksi, Algoritma'),
        commonMisconceptions: [
          { trap: t('mapel_inf_mc1_trap', 'Sintaks disamakan dengan algoritma'), pattern: t('mapel_inf_mc1_pat', 'Siswa mengira menghafal kode bahasa pemrograman lebih penting daripada logika masalah'), fix: t('mapel_inf_mc1_fix', 'Rancang pseudocode dan diagram alir (flowchart) di kertas sebelum menulis satu baris sintaks apa pun') }
        ]
      }
    },
    PPK: {
      name: 'Pendidikan Pancasila',
      grade: 'SD / SMP / SMA',
      competencies: [
        { code: 'KOMP-PPK-D-7-PAN-01', name: t('mapel_ppk_c1_name', 'Penerapan Nilai Pancasila dalam Keseharian'), materi: t('mapel_ppk_c1_mat', 'Pengamalan sila-sila Pancasila di lingkungan keluarga, sekolah, dan masyarakat luas') },
        { code: 'KOMP-PPK-D-8-UUD-01', name: t('mapel_ppk_c2_name', 'Konstitusi & Hierarki Peraturan Perundang-undangan'), materi: t('mapel_ppk_c2_mat', 'UUD NRI Tahun 1945 sebagai hukum dasar tertinggi dan tata urutan norma perundangan') },
        { code: 'KOMP-PPK-E-10-NKRI-01', name: t('mapel_ppk_c3_name', 'Bhinneka Tunggal Ika & Penegakan Hak Warga Negara'), materi: t('mapel_ppk_c3_mat', 'Kesadaran bela negara, toleransi keberagaman ras/agama, dan jaminan HAM konstitusional') }
      ],
      teachingBrief: {
        summary: t('mapel_ppk_tb_sum', 'Penghayatan ideologi Pancasila, ketaatan konstitusional, dan kebajikan kewargaan bernegara.'),
        hook5Minutes: t('mapel_ppk_tb_hook', 'Diskusikan kasus nyata tentang musyawarah mufakat di pemilihan ketua kelas saat ada perbedaan suara yang ketat.'),
        boardFormula: t('mapel_ppk_tb_board', 'Hierarki Hukum: UUD 1945 ➔ Ketetapan MPR ➔ UU / Perppu ➔ Peraturan Pemerintah ➔ Perpres ➔ Perda'),
        commonMisconceptions: [
          { trap: t('mapel_ppk_mc1_trap', 'Hak tanpa kewajiban'), pattern: t('mapel_ppk_mc1_pat', 'Siswa hanya menuntut pemenuhan hak tanpa menyadari kewajiban warga negara'), fix: t('mapel_ppk_mc1_fix', 'Hak asasi seorang warga negara dibatasi secara konstitusional oleh hak asasi orang lain di sekitarnya') }
        ]
      }
    },
    AGM: {
      name: 'Pendidikan Agama & Budi Pekerti',
      grade: 'SD / SMP / SMA',
      competencies: [
        { code: 'KOMP-AGM-D-7-AKL-01', name: t('mapel_agm_c1_name', 'Budi Pekerti Mulia & Kejujuran Diri'), materi: t('mapel_agm_c1_mat', 'Menerapkan integritas, amanah, dan rasa hormat kepada orang tua serta pendidik') },
        { code: 'KOMP-AGM-D-8-KIT-01', name: t('mapel_agm_c2_name', 'Pemahaman Kitab Suci & Nilai Kasih Sayang'), materi: t('mapel_agm_c2_mat', 'Memaknai pesan suci dalam tindakan welas asih dan kepedulian sosial kaum rentan') },
        { code: 'KOMP-AGM-E-10-TOL-01', name: t('mapel_agm_c3_name', 'Moderasi Beragama & Kerukunan Sesama'), materi: t('mapel_agm_c3_mat', 'Menjaga persaudaraan lintas iman, menolak ekstremisme, dan merawat kedamaian bangsa') }
      ],
      teachingBrief: {
        summary: t('mapel_agm_tb_sum', 'Pembentukan karakter spiritual luhur, keteladanan moral, dan moderasi beragama inklusif.'),
        hook5Minutes: t('mapel_agm_tb_hook', 'Dilema moral: kamu menemukan dompet berisi sejumlah uang dan obat darurat resep dokter tanpa identitas lain.'),
        boardFormula: t('mapel_agm_tb_board', 'Integritas Spiritual = Selarasnya niat hati, ucapan lisan, dan amal perbuatan nyata dalam kebaikan'),
        commonMisconceptions: [
          { trap: t('mapel_agm_mc1_trap', 'Ritual terpisah dari budi pekerti'), pattern: t('mapel_agm_mc1_pat', 'Mengira kesalehan hanya diukur dari ritual ibadah tanpa memedulikan akhlak sesama'), fix: t('mapel_agm_mc1_fix', 'Budi pekerti luhur terhadap sesama dan lingkungan adalah tolok ukur utama kematangan spiritual') }
        ]
      }
    },
    FIS: {
      name: 'Fisika',
      grade: 'SMA',
      competencies: [
        { code: 'KOMP-FIS-E-10-KIN-01', name: t('mapel_fis_c1_name', 'Kinematika Gerak Lurus Beraturan & Berubah'), materi: t('mapel_fis_c1_mat', 'Analisis grafik v-t, s-t, kecepatan sesaat, dan percepatan tetap pada lintasan linier') },
        { code: 'KOMP-FIS-F-11-DIN-01', name: t('mapel_fis_c2_name', 'Dinamika Gerak & Hukum Newton tentang Gaya'), materi: t('mapel_fis_c2_mat', 'Diagram gaya bebas, gaya gesek statis-kinetis, aksi-reaksi, dan hukum kelembaman') },
        { code: 'KOMP-FIS-F-12-ELE-01', name: t('mapel_fis_c3_name', 'Medan Listrik, Potensial & Kapasitansi'), materi: t('mapel_fis_c3_mat', 'Hukum Coulomb, kuat medan elektrostatik, energi potensial listrik, dan rangkaian kapasitor') }
      ],
      teachingBrief: {
        summary: t('mapel_fis_tb_sum', 'Model matematis perilaku materi, mekanika gerak alam semesta, dan interaksi gelombang-energi.'),
        hook5Minutes: t('mapel_fis_tb_hook', 'Jatuhkan selembar kertas datar vs kertas yang diremas menjadi bola padat untuk mengamati efek hambatan udara.'),
        boardFormula: t('mapel_fis_tb_board', 'vt = v0 + at · s = v0·t + ½at² · vt² = v0² + 2as · ΣF = m · a'),
        commonMisconceptions: [
          { trap: t('mapel_fis_mc1_trap', 'Gaya menopang gerak (Aristotelian)'), pattern: t('mapel_fis_mc1_pat', 'Siswa mengira benda membutuhkan dorongan gaya terus-menerus agar tetap bergerak maju'), fix: t('mapel_fis_mc1_fix', 'Hukum Newton I: Jika resultan gaya nol, benda bergerak akan terus bergerak dengan kecepatan tetap') }
        ]
      }
    },
    KIM: {
      name: 'Kimia',
      grade: 'SMA',
      competencies: [
        { code: 'KOMP-KIM-E-10-STR-01', name: t('mapel_kim_c1_name', 'Struktur Atom & Sistem Periodik Unsur'), materi: t('mapel_kim_c1_mat', 'Konfigurasi elektron mekanika kuantum, nomor massa, isotop, dan jari-jari periodik atom') },
        { code: 'KOMP-KIM-F-11-STO-01', name: t('mapel_kim_c2_name', 'Stoikiometri & Konsep Mol Reaksi Kimia'), materi: t('mapel_kim_c2_mat', 'Penyetaraan reaksi, pereaksi pembatas, persen hasil, dan molaritas larutan') },
        { code: 'KOMP-KIM-F-12-ASB-01', name: t('mapel_kim_c3_name', 'Keseimbangan Larutan Asam-Basa & pH Titrasi'), materi: t('mapel_kim_c3_mat', 'Teori Bronsted-Lowry, derajat disosiasi, larutan penyangga (buffer), dan titik ekivalen') }
      ],
      teachingBrief: {
        summary: t('mapel_kim_tb_sum', 'Kajian komposisi zat submikroskopis, transformasi reaksi materi, dan kesetimbangan energetika.'),
        hook5Minutes: t('mapel_kim_tb_hook', 'Reaksikan cuka dapur dengan soda kue di botol: gas CO2 yang dihasilkan akan meniup balon sendiri.'),
        boardFormula: t('mapel_kim_tb_board', 'Mol (n) = massa / Mr · STP: V = n × 22,4 L · pH = -log[H+] · Buffer: [H+] = Ka × (mol asam / mol basa konjugasi)'),
        commonMisconceptions: [
          { trap: t('mapel_kim_mc1_trap', 'Mengubah angka indeks senyawa'), pattern: t('mapel_kim_mc1_pat', 'Siswa mengubah angka subskrip senyawa untuk menyetarakan jumlah atom reaksi'), fix: t('mapel_kim_mc1_fix', 'Indeks adalah identitas permanen zat kimia; hanya angka koefisien di depan molekul yang boleh disetel') }
        ]
      }
    },
    BIO: {
      name: 'Biologi',
      grade: 'SMA',
      competencies: [
        { code: 'KOMP-BIO-E-10-EKO-01', name: t('mapel_bio_c1_name', 'Keanekaragaman Hayati & Keseimbangan Ekosistem'), materi: t('mapel_bio_c1_mat', 'Jaring makanan, aliran energi piramida trofik, dan konservasi biodiversitas tropis') },
        { code: 'KOMP-BIO-F-11-FIS-01', name: t('mapel_bio_c2_name', 'Fisiologi Tumbuhan & Sistem Peredaran Darah'), materi: t('mapel_bio_c2_mat', 'Reaksi terang-gelap fotosintesis, transpirasi xilem-floem, dan hemostasis kardiovaskular') },
        { code: 'KOMP-BIO-F-12-GEN-01', name: t('mapel_bio_c3_name', 'Genetika Mendel, Sintesis Protein & Mutasi DNA'), materi: t('mapel_bio_c3_mat', 'Transkripsi mRNA, translasi kodon asam amino, serta persilangan monohibrid dan dihibrid') }
      ],
      teachingBrief: {
        summary: t('mapel_bio_tb_sum', 'Sistem kehidupan hierarkis dari transkripsi genetika hingga keseimbangan ekologis biosfer.'),
        hook5Minutes: t('mapel_bio_tb_hook', 'Mengapa daun tampak hijau tua di atas tetapi lebih pucat di sisi bawah? Diskusikan letak kloroplas palisade.'),
        boardFormula: t('mapel_bio_tb_board', 'Fotosintesis: 6CO2 + 6H2O + Cahaya ➔ C6H12O6 + 6O2 · Monohibrid Mendel F2: Rasio Genotipe 1:2:1, Fenotipe 3:1'),
        commonMisconceptions: [
          { trap: t('mapel_bio_mc1_trap', 'Tumbuhan tidak berespirasi'), pattern: t('mapel_bio_mc1_pat', 'Siswa mengira tumbuhan hanya melakukan fotosintesis dan tidak bernapas mengambil oksigen'), fix: t('mapel_bio_mc1_fix', 'Tumbuhan berespirasi seluler terus-menerus selama 24 jam (siang dan malam) untuk menghasilkan ATP di mitokondria') }
        ]
      }
    },
    EKO: {
      name: 'Ekonomi',
      grade: 'SMA',
      competencies: [
        { code: 'KOMP-EKO-E-10-PAS-01', name: t('mapel_eko_c1_name', 'Keseimbangan Pasar: Kurva Permintaan & Penawaran'), materi: t('mapel_eko_c1_mat', 'Hukum permintaan-penawaran, elastisitas harga, dan penentuan titik ekuilibrium pasar') },
        { code: 'KOMP-EKO-F-11-MON-01', name: t('mapel_eko_c2_name', 'Kebijakan Moneter, Fiskal & Pengendalian Inflasi'), materi: t('mapel_eko_c2_mat', 'Operasi pasar terbuka Bank Indonesia, suku bunga acuan, APBN belanja negara, dan daya beli') },
        { code: 'KOMP-EKO-F-12-AKU-01', name: t('mapel_eko_c3_name', 'Persamaan Dasar Akuntansi & Laporan Keuangan'), materi: t('mapel_eko_c3_mat', 'Pencatatan debit-kredit transaksi, neraca saldo, jurnal penyesuaian, dan laba rugi') }
      ],
      teachingBrief: {
        summary: t('mapel_eko_tb_sum', 'Alokasi sumber daya langka, stabilitas makroekonomi, dan akuntabilitas pelaporan keuangan.'),
        hook5Minutes: t('mapel_eko_tb_hook', 'Diskusikan mengapa harga payung atau mantel hujan melonjak tinggi saat badai deras melanda terminal bus.'),
        boardFormula: t('mapel_eko_tb_board', 'Qd = Qs (Titik Ekuilibrium) · Persamaan Akuntansi: Aset = Liabilitas (Kewajiban) + Ekuitas (Modal)'),
        commonMisconceptions: [
          { trap: t('mapel_eko_mc1_trap', 'Pergerakan kurva vs pergeseran kurva'), pattern: t('mapel_eko_mc1_pat', 'Menyamakan perubahan harga barang itu sendiri dengan perubahan faktor selera/pendapatan konsumen'), fix: t('mapel_eko_mc1_fix', 'Perubahan harga barang menggeser titik di sepanjang kurva; faktor pendapatan/tren menggeser posisi seluruh kurva') }
        ]
      }
    },
    GEO: {
      name: 'Geografi',
      grade: 'SMA',
      competencies: [
        { code: 'KOMP-GEO-E-10-PIG-01', name: t('mapel_geo_c1_name', 'Prinsip & Konsep Dasar Geografi Spasial'), materi: t('mapel_geo_c1_mat', '4 prinsip geografi, 10 konsep esensial geosfer, dan pendekatan spasial keruangan') },
        { code: 'KOMP-GEO-F-11-LIT-01', name: t('mapel_geo_c2_name', 'Dinamika Litosfer & Mitigasi Gempa Vulkanik'), materi: t('mapel_geo_c2_mat', 'Pergerakan lempeng tektonik, siklus batuan, erosi pelapukan, dan jalur cincin api (Ring of Fire)') },
        { code: 'KOMP-GEO-F-12-SIG-01', name: t('mapel_geo_c3_name', 'Penginderaan Jauh & Sistem Informasi Geografis'), materi: t('mapel_geo_c3_mat', 'Interpretasi citra satelit rona-tekstur, tumpang susun (overlay) peta tematik peruntukan lahan') }
      ],
      teachingBrief: {
        summary: t('mapel_geo_tb_sum', 'Analisis fenomena geosfer multidimensi, keterkaitan ruang-lingkungan, dan ketahanan mitigasi bencana.'),
        hook5Minutes: t('mapel_geo_tb_hook', 'Tampilkan citra satelit kota asal siswa di proyektor: amati mengapa permukiman terpusat di sepanjang bantaran sungai.'),
        boardFormula: t('mapel_geo_tb_board', 'Skala Peta = Jarak pada Peta / Jarak Sebenarnya di Lapangan · 4 Prinsip: Distribusi, Interelasi, Deskripsi, Korologi'),
        commonMisconceptions: [
          { trap: t('mapel_geo_mc1_trap', 'Skala peta besar vs kecil'), pattern: t('mapel_geo_mc1_pat', 'Siswa mengira penyebut angka 1:1.000.000 adalah skala peta besar karena nominal angkanya besar'), fix: t('mapel_geo_mc1_fix', '1/1.000.000 adalah pecahan kecil (kurang mendalam); sebaliknya 1/5.000 adalah pecahan besar (tampak rinci)') }
        ]
      }
    },
    SOS: {
      name: 'Sosiologi',
      grade: 'SMA',
      competencies: [
        { code: 'KOMP-SOS-E-10-IND-01', name: t('mapel_sos_c1_name', 'Sosialisasi, Identitas Diri & Interaksi Kelompok'), materi: t('mapel_sos_c1_mat', 'Tahapan sosialisasi kepribadian, agen keluarga-sekolah-media, dan konformitas norma') },
        { code: 'KOMP-SOS-F-11-KON-01', name: t('mapel_sos_c2_name', 'Konflik Sosial, Kekerasan & Resolusi Damai'), materi: t('mapel_sos_c2_mat', 'Sebab terjadinya friksi sosial, mediasi pihak ketiga, konsiliasi, dan transformasi damai') },
        { code: 'KOMP-SOS-F-12-KET-01', name: t('mapel_sos_c3_name', 'Ketimpangan Sosial Komunitas & Transformasi Digital'), materi: t('mapel_sos_c3_mat', 'Stratifikasi kelas sosial, marginalisasi budaya lokal, dan kearifan masyarakat hadapi modernitas') }
      ],
      teachingBrief: {
        summary: t('mapel_sos_tb_sum', 'Pemahaman sosiologis interaksi relasional, diferensiasi struktural, dan penyelesaian konflik beradab.'),
        hook5Minutes: t('mapel_sos_tb_hook', 'Diskusikan tren gaya hidup viral di media sosial dan bagaimana tekanan teman sebaya (peer pressure) memengaruhinya.'),
        boardFormula: t('mapel_sos_tb_board', 'Resolusi Sengketa: Mediasi (Pihak Ke-3 Netral Fasilitator) vs Arbitrasi (Pihak Ke-3 Pengambil Keputusan Mengikat)'),
        commonMisconceptions: [
          { trap: t('mapel_sos_mc1_trap', 'Konflik dianggap selalu merusak'), pattern: t('mapel_sos_mc1_pat', 'Menganggap setiap konflik sosial selalu destruktif dan wajib disingkirkan tanpa dikelola'), fix: t('mapel_sos_mc1_fix', 'Konflik sosial terkelola justru dapat memperjelas batas norma yang kabur dan mendorong reformasi konstruktif') }
        ]
      }
    },
    SEJ: {
      name: 'Sejarah',
      grade: 'SMA',
      competencies: [
        { code: 'KOMP-SEJ-E-10-MET-01', name: t('mapel_sej_c1_name', 'Metode Penelitian Sejarah & Kritik Sumber'), materi: t('mapel_sej_c1_mat', 'Heuristik jejak primer-sekunder, verifikasi autentisitas arsip, dan sintesis historiografi') },
        { code: 'KOMP-SEJ-F-11-PER-01', name: t('mapel_sej_c2_name', 'Pergerakan Nasional & Proklamasi Kemerdekaan'), materi: t('mapel_sej_c2_mat', 'Lahirnya Budi Utomo, Sumpah Pemuda 1928, BPUPK-PPKI, dan peristiwa Rengasdengklok 1945') },
        { code: 'KOMP-SEJ-F-12-DIN-01', name: t('mapel_sej_c3_name', 'Dinamika Demokrasi Parlementer & Terpimpin'), materi: t('mapel_sej_c3_mat', 'Pergantian kabinet, Konferensi Asia Afrika 1955, Dekrit Presiden 5 Juli 1959, dan politik mercusuar') }
      ],
      teachingBrief: {
        summary: t('mapel_sej_tb_sum', 'Penalaran historis sebab-akibat lintas waktu, apresiasi perjuangan bangsa, dan kritik sumber primer.'),
        hook5Minutes: t('mapel_sej_tb_hook', 'Tunjukkan foto teks proklamasi yang diketik Sayuti Melik: tanyakan bagaimana sejarawan memverifikasi keasliannya.'),
        boardFormula: t('mapel_sej_tb_board', 'Tahap Metode Sejarah: Heuristik (Pencarian) ➔ Verifikasi (Kritik) ➔ Interpretasi (Penafsiran) ➔ Historiografi (Penulisan)'),
        commonMisconceptions: [
          { trap: t('mapel_sej_mc1_trap', 'Sejarah sebatas hafalan tahun'), pattern: t('mapel_sej_mc1_pat', 'Siswa berfokus menghafal tanggal tanpa memahami dialektika sebab-akibat peristiwa masa lalu'), fix: t('mapel_sej_mc1_fix', 'Fokuskan pembelajaran pada: faktor apa yang memicu peristiwa tersebut dan relevansinya bagi kehidupan masa kini') }
        ]
      }
    },
    PJK: {
      name: 'PJOK',
      grade: 'SD / SMP / SMA',
      competencies: [
        { code: 'KOMP-PJK-D-7-PER-01', name: t('mapel_pjk_c1_name', 'Keterampilan Gerak Spesifik Permainan Bola'), materi: t('mapel_pjk_c1_mat', 'Teknik passing, dribbling bola basket/voli, serta koordinasi gerak lokomotor dan manipulatif') },
        { code: 'KOMP-PJK-D-8-KEB-01', name: t('mapel_pjk_c2_name', 'Latihan Kebugaran Jasmani & Daya Tahan Tubuh'), materi: t('mapel_pjk_c2_mat', 'Latihan interval aerobik, kekuatan otot push-up/sit-up, kelenturan sendi, dan indeks masa tubuh') },
        { code: 'KOMP-PJK-E-10-POL-01', name: t('mapel_pjk_c3_name', 'Pola Hidup Sehat, Gizi Seimbang & P3K Dasar'), materi: t('mapel_pjk_c3_mat', 'Piramida gizi seimbang, bahaya narkoba/rokok, serta penanganan cedera sprain metode RICE') }
      ],
      teachingBrief: {
        summary: t('mapel_pjk_tb_sum', 'Pembiasaan gerak aktif sportif, pemeliharaan kapasitas fisik, dan kebiasaan hidup sehat bugar.'),
        hook5Minutes: t('mapel_pjk_tb_hook', 'Ajak semua siswa menghitung denyut nadi istirahat di pergelangan tangan mereka selama 15 detik sebelum berdiri.'),
        boardFormula: t('mapel_pjk_tb_board', 'Denyut Nadi Maksimal (DNM) = 220 - Usia · Zona Latihan Kardio: 60% – 80% DNM · Cedera RICE: Rest, Ice, Compression, Elevation'),
        commonMisconceptions: [
          { trap: t('mapel_pjk_mc1_trap', 'Rasa nyeri berlebih tanda berhasil'), pattern: t('mapel_pjk_mc1_pat', 'Mengira latihan kebugaran baru dinilai bagus jika otot mengalami nyeri luar biasa keesokan harinya'), fix: t('mapel_pjk_mc1_fix', 'Kemajuan kebugaran diukur dari adaptasi daya tahan dan pemulihan denyut nadi yang cepat, bukan cedera otot berlebihan') }
        ]
      }
    },
    SNB: {
      name: 'Seni Budaya & Prakarya',
      grade: 'SD / SMP / SMA',
      competencies: [
        { code: 'KOMP-SNB-D-7-RUP-01', name: t('mapel_snb_c1_name', 'Unsur, Prinsip & Komposisi Seni Rupa Visual'), materi: t('mapel_snb_c1_mat', 'Eksplorasi garis, bidang, gradasi warna lingkaran primer-sekunder, serta perspektif benda') },
        { code: 'KOMP-SNB-D-8-MUS-01', name: t('mapel_snb_c2_name', 'Apresiasi Musik Tradisional & Harmoni Melodi'), materi: t('mapel_snb_c2_mat', 'Tangga nada pentatonis nusantara, alat musik gamelan/angklung, dan teknik vokal unisono') },
        { code: 'KOMP-SNB-E-10-KRA-01', name: t('mapel_snb_c3_name', 'Kriya Nusantara & Eksplorasi Desain Produk'), materi: t('mapel_snb_c3_mat', 'Rancang bangun kerajinan ramah lingkungan, motif batik nusantara, dan kemasan produk bernilai jual') }
      ],
      teachingBrief: {
        summary: t('mapel_snb_tb_sum', 'Kepekaan estetis ragam budaya nusantara, kreativitas visual orisinal, dan apresiasi karya seni.'),
        hook5Minutes: t('mapel_snb_tb_hook', 'Putar cuplikan nada ritmis instrumen gamelan bali vs jawa: minta murid mendengarkan perbedaan tempo dan suasananya.'),
        boardFormula: t('mapel_snb_tb_board', 'Unsur Rupa: Titik ➔ Garis ➔ Bidang ➔ Bentuk ➔ Warna ➔ Tekstur ➔ Gelap-Terang ➔ Ruang'),
        commonMisconceptions: [
          { trap: t('mapel_snb_mc1_trap', 'Bakat seni mutlak alami'), pattern: t('mapel_snb_mc1_pat', 'Siswa merasa minder dan tidak bisa membuat karya seni karena tidak terlahir dengan bakat bawaan'), fix: t('mapel_snb_mc1_fix', 'Seni visual dan musik adalah keterampilan motorik dan bahasa ekspresi yang dapat dipelajari dengan teknik bertahap') }
        ]
      }
    }
  };

  /* ---------------------------------------------------------------------------
   * BANK SOAL FASE D (MAT / IPA / ENG / IND / IPS) — isinya JSON, bukan literal di sini.
   *
   * Kelima mapel inti punya bank berjenjang di content/mapel/: satu berkas Indonesia
   * plus sidecar Thai dengan kunci yang sama persis. Naskah yang DILIHAT MURID lahir
   * di sana, bukan di sini. Itu syarat dua-bahasa CLAUDE.md, dan juga satu-satunya
   * cara gerbang bahasa bisa melihat naskahnya sama sekali — literal di dalam .js
   * tidak pernah terbaca oleh satu pun sensus bahasa yang dimiliki repo ini.
   *
   * Pemuatannya punya dua jalur, dan KEDUANYA gagal lunak:
   *   - Node (gerbang, perkakas): fs sinkron, deterministik, tanpa jaringan.
   *   - Peramban: fetch sekali saat mount; hasilnya disimpan, lalu render diminta
   *     ulang. Selama bank belum mendarat jawabannya adalah bank tidak ada, dan itu
   *     berarti perilaku lama (templates di bawah) — bukan lemparan, bukan layar
   *     kosong.
   * Satu kompetensi di bank = satu BAB Buku Siswa Kemendikbudristek, dengan nama bab
   * dan sub-bab persis seperti Daftar Isi bukunya. Guru mencari "Bab 3", bukan "TEK".
   *
   * 12 mapel lain tidak punya bank JSON; bagi mereka jalur ini selalu menjawab null
   * dan tidak satu pun perilakunya berubah.
   */
  var MAPEL_BANK_SUBJECTS = ['MAT', 'IPA', 'ENG', 'IND', 'IPS'];
  var mapelBankCache = {};
  var mapelBankFetching = {};

  function mapelBankFile(subjectId) { return 'mapel-' + String(subjectId).toLowerCase() + '-d.json'; }

  /* Katalog kompetensi ikut bank begitu bank mendarat: satu sumber kebenaran, jadi
     dropdown guru tidak bisa menawarkan kompetensi yang banknya tidak punya soalnya
     — dan nama kompetensi yang sampai ke murid lewat judul tugas ikut punya kembaran
     Thai, karena ia lahir di bank, bukan di sini. */
  function adoptBankCompetencies(subjectId, bank) {
    try {
      var cat = MAPEL_CATALOG[subjectId];
      if (!cat || !bank || !Array.isArray(bank.competencies) || !bank.competencies.length) return;
      cat.competencies = bank.competencies.map(function (c) {
        return { code: c.code, name: c.name, materi: c.materi, grade: c.grade, cpRef: c.cpRef };
      });
    } catch (_) {}
  }

  function mapelBank(subjectId) {
    if (Object.prototype.hasOwnProperty.call(mapelBankCache, subjectId)) return mapelBankCache[subjectId];
    if (MAPEL_BANK_SUBJECTS.indexOf(subjectId) < 0) { mapelBankCache[subjectId] = null; return null; }
    var diNode = (typeof require === 'function' && typeof __dirname === 'string');
    if (diNode) {
      try {
        var full = require('path').join(__dirname, '..', '..', 'content', 'mapel', mapelBankFile(subjectId));
        var bank = JSON.parse(require('fs').readFileSync(full, 'utf8'));
        mapelBankCache[subjectId] = bank;
        adoptBankCompetencies(subjectId, bank);
        return bank;
      } catch (_) {
        /* Di Node, berkas yang tidak terbaca berarti bank memang tidak ada. Jangan lanjut ke
           fetch: alamat relatif tidak punya arti tanpa halaman, dan satu-satunya hasilnya
           adalah lemparan yang harus ditangkap lagi. */
        mapelBankCache[subjectId] = null;
        return null;
      }
    }
    if (!mapelBankFetching[subjectId] && typeof fetch === 'function') {
      mapelBankFetching[subjectId] = true;
      try {
        fetch('content/mapel/' + mapelBankFile(subjectId), { credentials: 'same-origin' })
          .then(function (r) { return r && r.ok ? r.json() : null; })
          .then(function (bank) {
            mapelBankCache[subjectId] = bank || null;
            if (bank) { adoptBankCompetencies(subjectId, bank); try { render(); } catch (_) {} }
          })
          .catch(function () { mapelBankCache[subjectId] = null; });
      } catch (_) { mapelBankCache[subjectId] = null; }
    }
    mapelBankCache[subjectId] = null;
    return null;
  }

  /* Kolam soal disaring berjenjang: mapel -> kelas -> kompetensi. Kode kompetensi
     sudah memuat kelasnya (KOMP-MAT-D-9-STA-01), jadi cocok-persis pada kode berarti
     kelas ikut tersaring: dua kompetensi berbeda tidak pernah berbagi satu soal pun.

     Yang paling penting ada di cabang `exact`. Kalau kompetensinya cocok tetapi
     isinya lebih sedikit daripada yang diminta, sisanya dibiarkan KOSONG. Menambalnya
     dari kolam mapel akan mengirim bab yang salah ke murid tanpa guru pernah tahu —
     3 soal yang jujur lebih berguna daripada 8 soal yang separuhnya salah bab. */
  function mapelPool(subjectId, compCode) {
    var bank = mapelBank(subjectId);
    if (!bank || !Array.isArray(bank.competencies)) return null;
    var code = String(compCode == null ? '' : compCode);
    for (var i = 0; i < bank.competencies.length; i++) {
      if (bank.competencies[i].code === code) {
        return { items: bank.competencies[i].items || [], exact: true };
      }
    }
    /* Kode yang tidak dikenal — kosong, salah bentuk, atau milik fase lain — bukan
       saringan, melainkan ketiadaan saringan. Kolamnya seluruh mapel, seperti dulu. */
    var all = [];
    for (var j = 0; j < bank.competencies.length; j++) {
      var list = bank.competencies[j].items || [];
      for (var k = 0; k < list.length; k++) all.push(list[k]);
    }
    return { items: all, exact: false };
  }

  /* Acak posisi opsi jawaban agar kunci tidak selalu di index 0.
     Menerima objek soal { options[], answer, why?, distractorWhy? } dan mengembalikan
     salinan dengan urutan options teracak serta answer, why & distractorWhy yang sudah
     dipetakan ulang ke posisi barunya. */
  function shuffleOptions(q, seed) {
    var opts = q.options.slice();
    var correctText = opts[q.answer];
    var n = opts.length;
    var s = seed || 1;
    function rng() { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s >>> 16) / 32768; }
    for (var i = n - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
    }
    var newAnswer = opts.indexOf(correctText);
    var newWhy = {};
    if (q.why) {
      var oldExpl = q.why[q.answer] || q.why[String(q.answer)] || '';
      if (oldExpl) newWhy[newAnswer] = oldExpl;
    }
    /* Peta miskonsepsi ikut berpindah. Kalau tidak, penjelasan pengecoh menempel pada
       posisi yang isinya sudah berganti — diagnosis yang menunjuk jawaban yang salah
       lebih buruk daripada tidak ada diagnosis sama sekali. */
    var newDistractorWhy = null;
    if (q.distractorWhy) {
      newDistractorWhy = {};
      for (var oi = 0; oi < q.options.length; oi++) {
        if (oi === q.answer) continue;
        var expl = q.distractorWhy[oi] || q.distractorWhy[String(oi)];
        if (expl == null) continue;
        var moved = opts.indexOf(q.options[oi]);
        if (moved >= 0) newDistractorWhy[moved] = expl;
      }
    }
    return { options: opts, answer: newAnswer, why: newWhy, distractorWhy: newDistractorWhy };
  }

  var MAPEL_TEMPLATES = {
  MAT: [
    {
      prompt: 'Hasil dari operasi hitung campuran -15 + (-8) \u00d7 3 - (-20) adalah…',
      options: ['-19', '-29', '-59', '29'],
      answer: 0,
      why: { 0: 'Kerjakan perkalian terlebih dahulu: (-8) \u00d7 3 = -24. Kemudian -15 + (-24) - (-20) = -39 + 20 = -19.' }
    },
    {
      prompt: 'Sebuah resep membutuhkan perbandingan tepung dan gula 5 : 2. Jika digunakan 250 gram tepung, berapakah gram gula yang dibutuhkan?',
      options: ['100 gram', '125 gram', '50 gram', '150 gram'],
      answer: 0,
      why: { 0: 'Gula = (2/5) \u00d7 250 gram = 100 gram.' }
    },
    {
      prompt: 'Penyelesaian dari persamaan linear 3x - 7 = 2x + 5 adalah…',
      options: ['x = 12', 'x = -2', 'x = 2', 'x = -12'],
      answer: 0,
      why: { 0: 'Pindahkan suku sejenis: 3x - 2x = 5 + 7 sehingga x = 12.' }
    },
    {
      prompt: 'Sebuah segitiga memiliki panjang alas 14 cm dan tinggi 8 cm. Luas segitiga tersebut adalah…',
      options: ['56 cm²', '112 cm²', '22 cm²', '48 cm²'],
      answer: 0,
      why: { 0: 'Luas segitiga = ½ \u00d7 alas \u00d7 tinggi = ½ \u00d7 14 \u00d7 8 = 56 cm².' }
    },
    {
      prompt: 'Data nilai ulangan matematika: 7, 8, 6, 8, 9, 8, 7. Modus dari data tersebut adalah…',
      options: ['8', '7', '7.5', '6'],
      answer: 0,
      why: { 0: 'Nilai 8 muncul paling banyak yaitu sebanyak 3 kali.' }
    },
    {
      prompt: 'Keliling sebuah lingkaran yang memiliki diameter 28 cm (menggunakan π = 22/7) adalah…',
      options: ['88 cm', '44 cm', '176 cm', '616 cm'],
      answer: 0,
      why: { 0: 'Keliling lingkaran = π \u00d7 d = (22/7) \u00d7 28 cm = 88 cm.' }
    },
    {
      prompt: 'Hasil penyederhanaan dari operasi perpangkatan (2³ \u00d7 2⁴) : 2² adalah…',
      options: ['2⁵ (32)', '2⁶ (64)', '2⁴ (16)', '2⁷ (128)'],
      answer: 0,
      why: { 0: 'Gunakan sifat eksponen: 2^(3+4-2) = 2⁵ = 32.' }
    },
    {
      prompt: 'Sebuah dadu bermata 6 dilempar satu kali. Peluang munculnya mata dadu bilangan prima ganjil adalah…',
      options: ['1/3', '1/2', '1/6', '2/3'],
      answer: 0,
      why: { 0: 'Bilangan prima ganjil pada dadu adalah {3, 5} berjumlah 2 dari 6 ruang sampel, sehingga peluangnya 2/6 = 1/3.' }
    },
    {
      prompt: 'Diketahui rumus fungsi f(x) = 4x - 5. Nilai dari f(3) adalah…',
      options: ['7', '12', '2', '-7'],
      answer: 0,
      why: { 0: 'Substitusi nilai x = 3 ke dalam fungsi: f(3) = 4(3) - 5 = 12 - 5 = 7.' }
    },
    {
      prompt: 'Sebuah balok memiliki ukuran panjang 10 cm, lebar 6 cm, dan tinggi 4 cm. Volume bangun tersebut adalah…',
      options: ['240 cm³', '120 cm³', '200 cm³', '480 cm³'],
      answer: 0,
      why: { 0: 'Volume balok dihitung dengan rumus panjang \u00d7 lebar \u00d7 tinggi = 10 \u00d7 6 \u00d7 4 = 240 cm³.' }
    },
    {
      prompt: 'Himpunan penyelesaian dari pertidaksamaan 2x - 4 < 10 dengan x bilangan bulat positif adalah…',
      options: ['{1, 2, 3, 4, 5, 6}', '{1, 2, 3, 4, 5, 6, 7}', '{0, 1, 2, 3, 4, 5, 6}', '{7, 8, 9, …}'],
      answer: 0,
      why: { 0: '2x < 14 menghasilkan x < 7. Bilangan bulat positif yang memenuhi adalah 1 sampai 6.' }
    },
    {
      prompt: 'Bentuk sederhana dari pecahan aljabar (6x²y) / (2xy) adalah…',
      options: ['3x', '3y', '3xy', '4x'],
      answer: 0,
      why: { 0: 'Bagilah koefisien dan variabel sejenis: (6/2) \u00d7 (x²/x) \u00d7 (y/y) = 3x.' }
    },
    {
      prompt: 'Panjang sisi miring (hipotenusa) segitiga siku-siku yang memiliki sisi siku-siku 9 cm dan 12 cm adalah…',
      options: ['15 cm', '21 cm', '144 cm', '13 cm'],
      answer: 0,
      why: { 0: 'Gunakan teorema Pythagoras: c = √(9² + 12²) = √(81 + 144) = √225 = 15 cm.' }
    },
    {
      prompt: 'Gradien (kemiringan) dari garis lurus dengan persamaan y = 5x - 8 adalah…',
      options: ['5', '-8', '-5', '8'],
      answer: 0,
      why: { 0: 'Pada persamaan garis y = mx + c, gradien m adalah koefisien dari x, yaitu 5.' }
    },
    {
      prompt: 'Rata-rata hitung (mean) dari lima data: 12, 15, 18, 20, dan 25 adalah…',
      options: ['18', '17.5', '19', '20'],
      answer: 0,
      why: { 0: 'Jumlahkan seluruh data lalu bagi dengan banyak data: (12 + 15 + 18 + 20 + 25) / 5 = 90 / 5 = 18.' }
    }
  ],
  IPA: [
    {
      prompt: 'Bagian sel yang berfungsi sebagai pusat kendali seluruh aktivitas sel adalah…',
      options: ['Nukleus (inti sel)', 'Mitokondria', 'Ribosom', 'Sitoplasma'],
      answer: 0,
      why: { 0: 'Nukleus mengandung materi genetik yang mengendalikan proses metabolisme dan pembelahan sel.' }
    },
    {
      prompt: 'Peristiwa perpindahan kalor yang terjadi tanpa memerlukan zat perantara (medium) disebut…',
      options: ['Radiasi', 'Konduksi', 'Konveksi', 'Evaporasi'],
      answer: 0,
      why: { 0: 'Radiasi adalah pancaran gelombang elektromagnetik seperti sinar matahari ke bumi.' }
    },
    {
      prompt: 'Perubahan zat yang TIDAK menghasilkan zat baru dan dapat kembali ke wujud semula disebut…',
      options: ['Perubahan fisika', 'Perubahan kimia', 'Pembusukan', 'Fermentasi'],
      answer: 0,
      why: { 0: 'Perubahan fisika hanya mengubah wujud atau bentuk (seperti es mencair) tanpa mengubah sifat kimia zat.' }
    },
    {
      prompt: 'Dalam rantai makanan di sawah: Padi ➔ Belalang ➔ Katak ➔ Ular ➔ Elang. Organisme yang bertindak sebagai konsumen tingkat II adalah…',
      options: ['Katak', 'Belalang', 'Padi', 'Ular'],
      answer: 0,
      why: { 0: 'Padi (produsen), Belalang (konsumen I), Katak (konsumen II), Ular (konsumen III).' }
    },
    {
      prompt: 'Sebuah benda bermassa 2 kg ditarik dengan gaya 10 N di lantai licin. Percepatan yang dialami benda adalah…',
      options: ['5 m/s²', '20 m/s²', '0.2 m/s²', '12 m/s²'],
      answer: 0,
      why: { 0: 'Berdasarkan Hukum II Newton: a = F / m = 10 N / 2 kg = 5 m/s².' }
    },
    {
      prompt: 'Peristiwa pengikisan daratan pantai akibat hantaman energi gelombang air laut secara kontinu disebut…',
      options: ['Abrasi pantai', 'Erosi angin (deflasi)', 'Sedimentasi delta', 'Korosi batuan'],
      answer: 0,
      why: { 0: 'Abrasi adalah proses pengikisan pantai oleh tenaga gelombang laut dan arus pasang surut.' }
    },
    {
      prompt: 'Organ pada sistem ekskresi manusia yang berfungsi menyaring zat sisa metabolisme dari darah untuk membentuk urin adalah…',
      options: ['Ginjal (ren)', 'Hati (hepar)', 'Paru-paru (pulmo)', 'Pankreas'],
      answer: 0,
      why: { 0: 'Nefron di dalam ginjal menyaring darah melalui proses filtrasi, reabsorpsi, dan augmentasi menghasilkan urin.' }
    },
    {
      prompt: 'Bentuk interaksi simbiotik antara lebah madu dan bunga tanaman berbunga tergolong simbiosis…',
      options: ['Mutualisme', 'Komensalisme', 'Parasitisme', 'Predasi'],
      answer: 0,
      why: { 0: 'Lebah memperoleh nektar madu sedangkan bunga terbantu dalam proses penyerbukan serbuk sari.' }
    },
    {
      prompt: 'Enzim pencernaan di lambung yang berfungsi memecah protein menjadi pepton adalah…',
      options: ['Pepsin', 'Ptialin (amilase)', 'Lipase', 'Tripsin'],
      answer: 0,
      why: { 0: 'Lambung menghasilkan pepsinogen yang diaktifkan oleh asam klorida (HCl) menjadi pepsin untuk memecah protein.' }
    },
    {
      prompt: 'Planet dalam tata surya kita yang berukuran paling besar dan memiliki bintik merah raksasa adalah…',
      options: ['Jupiter', 'Saturnus', 'Neptunus', 'Uranus'],
      answer: 0,
      why: { 0: 'Jupiter adalah planet gas raksasa terbesar dengan diameter lebih dari 140.000 km.' }
    },
    {
      prompt: 'Sifat bayangan yang dibentuk oleh cermin datar pada jarak benda tertentu adalah…',
      options: ['Maya, tegak, dan sama besar', 'Nyata, terbalik, dan diperbesar', 'Maya, terbalik, dan diperkecil', 'Nyata, tegak, dan sama besar'],
      answer: 0,
      why: { 0: 'Cermin datar selalu membentuk bayangan maya di belakang cermin yang tegak dan berukuran identik.' }
    },
    {
      prompt: 'Proses pembentukan embun pada daun di pagi hari merupakan contoh peristiwa perubahan wujud…',
      options: ['Mengembun (kondensasi gas menjadi cair)', 'Menyublim', 'Membeku', 'Menguap'],
      answer: 0,
      why: { 0: 'Uap air di udara mengalami pendinginan pada malam hari sehingga mengembun menjadi butiran air.' }
    },
    {
      prompt: 'Zat hijau daun yang menangkap energi cahaya matahari dalam fotosintesis dinamakan…',
      options: ['Klorofil', 'Karotenoid', 'Antosianin', 'Hemoglobin'],
      answer: 0,
      why: { 0: 'Klorofil menyerap spektrum cahaya biru dan merah untuk memicu reaksi kimia fotosintesis.' }
    },
    {
      prompt: 'Alat perkembangbiakan generatif pada tumbuhan berbiji tertutup (Angiospermae) adalah…',
      options: ['Bunga', 'Akar tunjang', 'Batang berkambium', 'Daun penumpu'],
      answer: 0,
      why: { 0: 'Bunga memiliki putik sebagai sel kelamin betina dan benang sari sebagai sel kelamin jantan.' }
    },
    {
      prompt: 'Pemisahan campuran air dan pasir dapat dilakukan secara sederhana menggunakan metode…',
      options: ['Penyaringan (filtrasi)', 'Kromatografi', 'Sublimasi', 'Distilasi'],
      answer: 0,
      why: { 0: 'Filtrasi memisahkan padatan pasir yang tidak larut dari cairan air berdasarkan ukuran partikel.' }
    }
  ],
  IND: [
    {
      prompt: 'Ciri utama teks deskripsi yang membedakannya dari teks lain adalah…',
      options: ['Menggambarkan objek secara terperinci dengan melibatkan pancaindra', 'Menceritakan urutan peristiwa berdasarkan konflik tokoh', 'Menjelaskan langkah kerja atau petunjuk praktis', 'Menyampaikan pendapat disertai argumen logis'],
      answer: 0,
      why: { 0: 'Teks deskripsi bertujuan membuat pembaca seolah melihat, mendengar, atau merasakan sendiri objek yang digambarkan.' }
    },
    {
      prompt: 'Ide pokok suatu paragraf dapat ditemukan dengan cara…',
      options: ['Menemukan kalimat utama yang memuat inti permasalahan paragraf', 'Membaca hanya kalimat terakhir pada setiap paragraf', 'Menghitung kata yang paling banyak diulang', 'Mencatat seluruh kalimat penjelas'],
      answer: 0,
      why: { 0: 'Ide pokok adalah gagasan inti yang biasanya tertuang dalam kalimat utama paragraf.' }
    },
    {
      prompt: 'Penulisan kata depan "di" yang tepat terdapat pada kalimat…',
      options: ['Siswa berkumpul di halaman sekolah sejak pagi.', 'Buku itu dibaca oleh siswa diperpustakaan.', 'Surat itu ditandatangani diruang kepala sekolah.', 'Mereka berdiskusi dimobil saat perjalanan.'],
      answer: 0,
      why: { 0: 'Kata depan "di" yang menunjukkan tempat ditulis terpisah: "di halaman".' }
    },
    {
      prompt: 'Unsur intrinsik cerita yang menjadi penentu watak atau karakter tokoh cerita adalah…',
      options: ['Penokohan (karakterisasi)', 'Alur (plot)', 'Latar (setting)', 'Amanat'],
      answer: 0,
      why: { 0: 'Penokohan adalah cara pengarang menggambarkan dan mengembangkan karakter tokoh dalam cerita.' }
    },
    {
      prompt: 'Konjungsi yang menyatakan hubungan urutan waktu dalam teks prosedur adalah…',
      options: ['Lalu, kemudian, setelah itu', 'Karena, sebab, oleh karena itu', 'Tetapi, melainkan, sedangkan', 'Jika, apabila, jikalau'],
      answer: 0,
      why: { 0: 'Konjungsi kronologis seperti lalu, kemudian, setelah itu menghubungkan tahapan prosedur secara teratur.' }
    },
    {
      prompt: 'Antonim (lawan kata) yang paling tepat untuk kata "abstrak" adalah…',
      options: ['Konkret (nyata berwujud)', 'Imajinatif', 'Teoretis', 'Kompleks'],
      answer: 0,
      why: { 0: 'Abstrak berarti tidak berwujud nyata; kebalikannya adalah konkret yang dapat diindra secara nyata.' }
    },
    {
      prompt: 'Majas yang mengumpamakan benda mati seolah-olah bernyawa dan berperilaku seperti manusia ("Pena menari-nari di atas kertas") adalah majas…',
      options: ['Personifikasi', 'Metafora', 'Hiperbola', 'Litotes'],
      answer: 0,
      why: { 0: 'Personifikasi melekatkan sifat-sifat insani atau perilaku manusiawi pada benda mati atau konsep abstrak.' }
    },
    {
      prompt: 'Struktur teks eksposisi yang memuat simpulan dan penegasan kembali posisi atau tesis penulis disebut…',
      options: ['Penegasan ulang (reiterasi)', 'Tesis awal', 'Rangkaian argumen pendukung', 'Orientasi naratif'],
      answer: 0,
      why: { 0: 'Penegasan ulang merangkum intisari argumen dan mempertegas sudut pandang penulis di akhir teks eksposisi.' }
    },
    {
      prompt: 'Kata yang berkedudukan sebagai sinonim dari kata "eksklusif" adalah…',
      options: ['Khusus (istimewa)', 'Universal', 'Terbuka luas', 'Seragam'],
      answer: 0,
      why: { 0: 'Eksklusif bermakna khusus, terpisah dari yang lain, atau diperuntukkan bagi kalangan terbatas.' }
    },
    {
      prompt: 'Kalimat yang predikatnya memerlukan objek penderita diistilahkan sebagai kalimat…',
      options: ['Transitif', 'Intransitif', 'Pasif semu', 'Nominal'],
      answer: 0,
      why: { 0: 'Verba transitif menuntut kehadiran nomina objek agar makna kalimat menjadi utuh.' }
    },
    {
      prompt: 'Bagian awal pada teks narasi yang mengenalkan tokoh, latar waktu, dan latar tempat disebut…',
      options: ['Orientasi cerita', 'Komplikasi puncak', 'Resolusi akhir', 'Koda pengingat'],
      answer: 0,
      why: { 0: 'Orientasi memberikan konteks awal cerita perihal siapa, di mana, dan kapan peristiwa bermula.' }
    },
    {
      prompt: 'Ungkapan atau peribahasa "Bagai air di daun talas" memiliki makna kiasan…',
      options: ['Pribadi yang tidak berpendirian tetap dan mudah goyah', 'Seseorang yang sangat hemat mengelola harta', 'Hubungan persahabatan yang kokoh', 'Kondisi lingkungan yang sangat tenang'],
      answer: 0,
      why: { 0: 'Air di daun talas selalu bergulir dan tidak menetap, mengibaratkan pendirian yang plin-plan.' }
    },
    {
      prompt: 'Tanda baca yang tepat digunakan untuk memisahkan unsur-unsur dalam perincian atau pembilangan adalah…',
      options: ['Tanda koma (,)', 'Tanda titik dua (:)', 'Tanda hubung (-)', 'Tanda titik koma (;)'],
      answer: 0,
      why: { 0: 'Tanda koma memisahkan butir-butir enumerasi di dalam suatu klausa.' }
    },
    {
      prompt: 'Kalimat yang susunannya efektif dan memenuhi kaidah tata bahasa baku adalah…',
      options: ['Semua siswa hadir tepat waktu di aula pertunjukan.', 'Bagi para hadirin dimohon berdiri dari kursi.', 'Siswa-siswa berkumpul bersama-sama di lapangan.', 'Untuk mempersingkat waktu, acara segera dimulai.'],
      answer: 0,
      why: { 0: 'Kalimat efektif menghindari pleonasme dan preposisi yang merusak fungsi subjek.' }
    },
    {
      prompt: 'Langkah pertama yang esensial dalam menyusun teks ulasan atau resensi buku adalah…',
      options: ['Membaca dan memahami isi karya secara menyeluruh', 'Menulis kritik tajam terhadap kekurangan penulis', 'Menentukan harga jual buku di pasaran', 'Merancang tata letak sampul buku'],
      answer: 0,
      why: { 0: 'Pemahaman komprehensif atas isi karya merupakan prasyarat mutlak sebelum memberi penilaian objektif.' }
    }
  ],
  ENG: [
    {
      prompt: 'Choose the grammatically correct sentence in the Simple Past Tense:',
      options: ['She visited the botanical garden yesterday.', 'She visit the botanical garden yesterday.', 'She is visiting the botanical garden yesterday.', 'She has visited the garden yesterday already.'],
      answer: 0,
      why: { 0: 'Simple past tense uses past verb form (visited) together with past time signal (yesterday).' }
    },
    {
      prompt: '"The train ___ before we reached the platform." The most appropriate past perfect verb is:',
      options: ['had departed', 'have departed', 'is departing', 'will depart'],
      answer: 0,
      why: { 0: 'Past perfect (had + V3) indicates an event completed prior to another past event.' }
    },
    {
      prompt: 'The contextual synonym for the adjective "vast" is…',
      options: ['Immense and wide', 'Extremely tiny', 'Rapidly moving', 'Narrow and tight'],
      answer: 0,
      why: { 0: '"Vast" describes an immense, expansive area or extent.' }
    },
    {
      prompt: 'Identify the sentence with an accurate type 2 conditional structure:',
      options: ['If I had a telescope, I would observe the lunar craters.', 'If I have a telescope, I would observe the craters.', 'If I had a telescope, I will observe the craters.', 'If I have a telescope, I observe the craters.'],
      answer: 0,
      why: { 0: 'Type 2 conditional uses: If + past simple, would + bare infinitive for hypothetical present.' }
    },
    {
      prompt: 'The communicative purpose of an explanatory text is to…',
      options: ['Explain the processes involved in the formation of natural phenomena', 'Persuade the audience on a debate proposition', 'Entertain readers with folklore fables', 'Provide step-by-step cooking instructions'],
      answer: 0,
      why: { 0: 'Explanation texts account for how or why natural or sociocultural phenomena occur.' }
    },
    {
      prompt: '"The students are studying biology in the laboratory right now." The tense used in this sentence is…',
      options: ['Present Continuous Tense', 'Simple Present Tense', 'Past Continuous Tense', 'Present Perfect Tense'],
      answer: 0,
      why: { 0: 'The pattern Subject + to be (are) + V-ing indicates an action happening at the moment of speaking.' }
    },
    {
      prompt: 'Choose the sentence with an accurate passive voice structure:',
      options: ['The research paper was written by the scholar.', 'The research paper wrote by the scholar.', 'The research paper was write by the scholar.', 'The scholar was written the research paper.'],
      answer: 0,
      why: { 0: 'Passive voice in past simple uses: Subject + was/were + Past Participle (written) + by agent.' }
    },
    {
      prompt: 'The antonym of the adjective "mandatory" is…',
      options: ['Optional', 'Obligatory', 'Compulsory', 'Strict'],
      answer: 0,
      why: { 0: 'Mandatory means required or obligatory; its opposite is optional (discretionary).' }
    },
    {
      prompt: 'Which sentence correctly demonstrates the use of a comparative adjective?',
      options: ['Titanium is denser than aluminum.', 'Titanium is more denser than aluminum.', 'Titanium is most dense than aluminum.', 'Titanium is as denser than aluminum.'],
      answer: 0,
      why: { 0: 'One-syllable adjectives form comparatives by adding -er (denser), not double comparatives.' }
    },
    {
      prompt: 'The main communicative purpose of a procedure text (e.g., recipe or manual) is to…',
      options: ['Describe how something is achieved through a sequence of steps', 'Entertain listeners with a dramatic myth', 'Argue against an economic proposition', 'Narrate personal biographical milestones'],
      answer: 0,
      why: { 0: 'Procedure texts instruct readers on how to accomplish a goal sequentially.' }
    },
    {
      prompt: '"Neither the captain nor the sailors ___ aware of the coral reef." The grammatically correct verb is:',
      options: ['were', 'was', 'is', 'has been'],
      answer: 0,
      why: { 0: 'With "neither... nor...", the verb agrees with the closer subject: "sailors" is plural, so "were" is used.' }
    },
    {
      prompt: 'Identify the sentence that uses a relative pronoun appropriately:',
      options: ['The scientist who discovered the vaccine was awarded a medal.', 'The scientist which discovered the vaccine was awarded a medal.', 'The scientist whose discovered the vaccine was awarded a medal.', 'The scientist whom discovered the vaccine was awarded a medal.'],
      answer: 0,
      why: { 0: '"Who" refers to people as the subject of the relative clause.' }
    },
    {
      prompt: 'In an analytical exposition text, the opening paragraph where the author introduces the topic and point of view is called the…',
      options: ['Thesis statement', 'Reiteration paragraph', 'Complication arc', 'Resolution step'],
      answer: 0,
      why: { 0: 'The thesis introduces the central topic and clearly states the writer position.' }
    },
    {
      prompt: '"If it rains tomorrow, we ___ the outdoor excursion." Complete the first conditional clause:',
      options: ['will postpone', 'postponed', 'would postpone', 'had postponed'],
      answer: 0,
      why: { 0: 'First conditional structure: If + present simple, will + bare infinitive for realistic future scenarios.' }
    },
    {
      prompt: 'What is the idiom "once in a blue moon" commonly used to describe?',
      options: ['An event that happens very rarely', 'A phenomenon occurring every evening', 'A scenario that is guaranteed to succeed', 'A chaotic and disorderly environment'],
      answer: 0,
      why: { 0: 'The phrase "once in a blue moon" refers metaphorically to very rare occurrences.' }
    }
  ],
  IPS: [
    {
      prompt: 'Faktor pendorong utama berlangsungnya aktivitas perniagaan lintas negara (ekspor-impor) adalah…',
      options: ['Disparitas ketersediaan komoditas dan kapabilitas teknologi antarbangsa', 'Keseragaman jenis tanaman bumi', 'Kesamaan bahasa pertuturan internasional', 'Ketidakhadiran pembatas perbatasan wilayah'],
      answer: 0,
      why: { 0: 'Perbedaan keunggulan komparatif alam dan teknologi mendorong pertukaran barang antarbangsa.' }
    },
    {
      prompt: 'Organisasi kerja sama regional kawasan Asia Tenggara (ASEAN) diproklamasikan melalui…',
      options: ['Deklarasi Bangkok 1967', 'Perjanjian Westphalia', 'Konferensi Meja Bundar', 'Perjanjian Linggajati'],
      answer: 0,
      why: { 0: 'Lima perwakilan negara menandatangani Deklarasi Bangkok pada 8 Agustus 1967.' }
    },
    {
      prompt: 'Sikap bijak dalam menyongsong arus keterbukaan globalisasi budaya adalah…',
      options: ['Menyaring budaya luar berlandaskan nilai kearifan lokal bangsa', 'Menolak seluruh kemajuan peradaban teknologi', 'Menghilangkan kesenian tradisional nusantara', 'Mengikuti seluruh tren tanpa pertimbangan adab'],
      answer: 0,
      why: { 0: 'Selektivitas berbasis nilai kearifan lokal memperkuat identitas budaya di era keterbukaan.' }
    },
    {
      prompt: 'Lembaga perbankan pembangunan multilateral yang menyokong pendanaan proyek negara berkembang adalah…',
      options: ['Bank Dunia (World Bank)', 'Palang Merah Internasional', 'Badan Meteorologi Global', 'Organisasi Buruh Sedunia'],
      answer: 0,
      why: { 0: 'World Bank mengalokasikan kredit investasi pembangunan infrastruktur dan pengentasan kemiskinan.' }
    },
    {
      prompt: 'Bentuk kontribusi aktif diplomasi perdamaian Indonesia di bawah mandat PBB diwujudkan melalui…',
      options: ['Penugasan Kontingen Pasukan Garuda ke wilayah konflik', 'Pemutusan hubungan konsuler antarnegara', 'Pemberian sanksi boikot sepihak', 'Penghentian bantuan kemanusiaan'],
      answer: 0,
      why: { 0: 'Kontingen Garuda aktif menjaga stabilitas wilayah pascakonflik di bawah panji perdamaian PBB.' }
    },
    {
      prompt: 'Garis khayal yang memisahkan fauna tipe Asiatis dengan fauna tipe peralihan di kepulauan Nusantara adalah…',
      options: ['Garis Wallace', 'Garis Weber', 'Garis Lydekker', 'Garis Khatulistiwa'],
      answer: 0,
      why: { 0: 'Garis Wallace membentang di antara Selat Makassar dan Selat Lombok membatasi fauna barat dan peralihan.' }
    },
    {
      prompt: 'Bentuk interaksi sosial asosiatif yang berupa kerja bersama antara individu atau kelompok untuk mencapai tujuan bersama adalah…',
      options: ['Kerja sama (kooperasi)', 'Persaingan (kompetisi)', 'Kontravensi', 'Pertentangan (konflik)'],
      answer: 0,
      why: { 0: 'Kerja sama adalah proses asosiatif di mana pihak-pihak berpadu tenaga menggapai sasaran bersama.' }
    },
    {
      prompt: 'Peninggalan candi megah bercorak Buddha terbesar di Nusantara yang dibangun pada era Wangsa Syailendra adalah…',
      options: ['Candi Borobudur', 'Candi Prambanan', 'Candi Mendut', 'Candi Penataran'],
      answer: 0,
      why: { 0: 'Borobudur dibangun sekitar abad ke-8 hingga ke-9 Masehi sebagai monumen suci Buddha Mahayana.' }
    },
    {
      prompt: 'Kondisi di mana kebutuhan manusia tidak terbatas sementara sumber daya pemuasnya berjumlah terbatas diistilahkan sebagai…',
      options: ['Kelangkaan (scarcity)', 'Kemakmuran mutlak', 'Kelebihan pasokan', 'Inflasi produksi'],
      answer: 0,
      why: { 0: 'Kelangkaan adalah problem inti ekonomi yang melahirkan keharusan menentukan pilihan prioritas.' }
    },
    {
      prompt: 'Organisasi pergerakan nasional pertama di Hindia Belanda yang didirikan pada tanggal 20 Mei 1908 adalah…',
      options: ['Budi Utomo', 'Sarekat Islam', 'Indische Partij', 'Perhimpunan Indonesia'],
      answer: 0,
      why: { 0: 'Budi Utomo diprakarsai oleh dr. Wahidin Soedirohoesodo dan didirikan oleh para pemuda STOVIA.' }
    },
    {
      prompt: 'Lembaga sosial yang memiliki fungsi utama mentransmisikan pengetahuan, keterampilan hidup, dan pembentukan karakter terstruktur adalah…',
      options: ['Lembaga pendidikan sekolah', 'Lembaga peradilan adat', 'Lembaga moneter perbankan', 'Lembaga pertahanan militer'],
      answer: 0,
      why: { 0: 'Pendidikan formal mengemban fungsi manifest sosialisasi nilai, ilmu, dan keahlian profesi.' }
    },
    {
      prompt: 'Jenis angin muson yang berembus dari benua Australia menuju benua Asia serta memicu musim kemarau di Indonesia adalah…',
      options: ['Angin Muson Timur (Tenggara)', 'Angin Muson Barat', 'Angin Fohn pegunungan', 'Angin Pasat Timur Laut'],
      answer: 0,
      why: { 0: 'Muson Timur bersifat kering karena melintasi gurun luas Australia sebelum tiba di kepulauan Indonesia.' }
    },
    {
      prompt: 'Pelaku ekonomi yang berperan sebagai penyedia faktor produksi (tanah, tenaga, modal) dan sekaligus konsumen barang adalah…',
      options: ['Rumah Tangga Konsumen (RTK)', 'Rumah Tangga Produsen (RTP)', 'Pemerintah pengatur', 'Masyarakat luar negeri'],
      answer: 0,
      why: { 0: 'RTK memiliki faktor produksi yang disewakan/dijual kepada produsen untuk memperoleh imbalan belanja.' }
    },
    {
      prompt: 'Prasasti tertua peninggalan Kerajaan Kutai di Kalimantan Timur yang dipahatkan pada tiang batu bernama…',
      options: ['Prasasti Yupa', 'Prasasti Ciaruteun', 'Prasasti Tugu', 'Prasasti Kedukan Bukit'],
      answer: 0,
      why: { 0: 'Tujuh prasasti Yupa bertarikh abad ke-5 Masehi ditulis dengan aksara Pallawa berbahasa Sanskerta.' }
    },
    {
      prompt: 'Peristiwa pergeseran nilai-nilai tradisional menuju pola kehidupan berbasis efisiensi, rasionalitas, dan teknologi dinamakan…',
      options: ['Modernisasi sosial', 'Etnosentrisme', 'Asimilasi paksa', 'Tradisionalisme'],
      answer: 0,
      why: { 0: 'Modernisasi mentransformasikan struktur sosial dan cara berpikir masyarakat ke arah yang lebih rasional.' }
    }
  ],
  INF: [
    {
      prompt: 'Unit representasi data digital biner terkecil berharga 0 atau 1 pada komputasi dinamakan…',
      options: ['Bit', 'Byte', 'Kilobyte', 'Hertz'],
      answer: 0,
      why: { 0: 'Bit (binary digit) merepresentasikan kondisi biner atomik pada elektronika digital.' }
    },
    {
      prompt: 'Rangkaian instruksi terstruktur, terurut logis, dan terbatas untuk memecahkan suatu persoalan disebut…',
      options: ['Algoritma komputasi', 'Bahasa perakitan semata', 'Komponen sirkuit keras', 'Protokol jaringan kabel'],
      answer: 0,
      why: { 0: 'Algoritma adalah rancangan langkah sistematis penyelesaian problem secara komputasional.' }
    },
    {
      prompt: 'Konstruksi logika pemilihan alur kendali program berdasar parameter pengujian dinamakan…',
      options: ['Percabangan kondisional (branching)', 'Pengulangan tanpa henti (loop)', 'Penugasan nilai (assignment)', 'Deklarasi pustaka modul'],
      answer: 0,
      why: { 0: 'Percabangan (if-else) mengarahkan cabang eksekusi kode sesuai terpenuhinya syarat.' }
    },
    {
      prompt: 'Rekayasa sosial bermodus pesan umpan tiruan guna memancing data rahasia korban disebut…',
      options: ['Phishing rekayasa siber', 'Denial of service', 'Enkripsi simetris', 'Kompilasi biner'],
      answer: 0,
      why: { 0: 'Phishing mengecoh pengguna melalui identitas palsu agar menyerahkan kredensial akun.' }
    },
    {
      prompt: 'Empat pilar berpikir komputasional mencakup dekomposisi, abstraksi, pengenalan pola, serta…',
      options: ['Perancangan algoritma terarah', 'Pemasangan sirkuit fisik', 'Penyambungan koneksi kabel', 'Pembelian lisensi sistem'],
      answer: 0,
      why: { 0: 'Dekomposisi, pola, abstraksi, dan algoritma membentuk empat pilar fondasi computational thinking.' }
    },
    {
      prompt: 'Topologi jaringan komputer di mana seluruh simpul tersambung secara terpusat pada satu perangkat konsentrator (switch/hub) adalah…',
      options: ['Topologi Star (Bintang)', 'Topologi Bus linier', 'Topologi Ring cincin', 'Topologi Mesh jala'],
      answer: 0,
      why: { 0: 'Topologi star menghubungkan setiap terminal secara langsung ke node pusat pengendali.' }
    },
    {
      prompt: 'Struktur data linier yang menerapkan prinsip LIFO (Last In, First Out) dalam penataan elemennya adalah…',
      options: ['Stack (Tumpukan)', 'Queue (Antrean)', 'Binary Tree', 'Grafik berarah'],
      answer: 0,
      why: { 0: 'Pada stack, elemen yang terakhir dimasukkan adalah elemen pertama yang akan dikeluarkan.' }
    },
    {
      prompt: 'Perangkat keras komputer yang berfungsi sebagai otak pemroses komputasi utama untuk mengeksekusi instruksi program dinamakan…',
      options: ['Central Processing Unit (CPU)', 'Hard Disk Drive', 'Power Supply Unit', 'Monitor grafis'],
      answer: 0,
      why: { 0: 'CPU melaksanakan operasi aritmetika, logika, pengendalian, dan masukan/keluaran data sistem.' }
    },
    {
      prompt: 'Protokol komunikasi standar yang menyandikan (mengenkripsi) lalu lintas data antara peramban web dan server situs adalah…',
      options: ['HTTPS', 'HTTP polos', 'FTP biasa', 'Telnet'],
      answer: 0,
      why: { 0: 'HTTPS menggunakan lapisan enkripsi TLS/SSL untuk mengamankan integritas dan kerahasiaan transmisi web.' }
    },
    {
      prompt: 'Tipe data dasar dalam pemrograman yang hanya dapat bernilai benar (True) atau salah (False) dinamakan…',
      options: ['Boolean', 'Integer bulat', 'String teks', 'Float desimal'],
      answer: 0,
      why: { 0: 'Tipe Boolean dinamai menurut matematikawan George Boole, merepresentasikan dua kondisi kebenaran biner.' }
    },
    {
      prompt: 'Langkah berpikir komputasional yang memecah suatu persoalan rumit menjadi sub-persoalan yang lebih kecil dan tertata disebut…',
      options: ['Dekomposisi masalah', 'Abstraksi selektif', 'Pengenalan pola umum', 'Generalisasi algoritma'],
      answer: 0,
      why: { 0: 'Dekomposisi mengurai tantangan kompleks agar dapat dianalisis dan diselesaikan bagian demi bagian.' }
    },
    {
      prompt: 'Jenis memori komputer berkecepatan tinggi yang bersifat volatil (hilang saat daya listrik padam) adalah…',
      options: ['Random Access Memory (RAM)', 'Read Only Memory (ROM)', 'Solid State Drive (SSD)', 'Flash drive USB'],
      answer: 0,
      why: { 0: 'RAM menyimpan instruksi kerja dan data aktif prosesor sementara perangkat dialiri daya listrik.' }
    },
    {
      prompt: 'Simbol bangun datar pada diagram alir (flowchart) yang melambangkan pengambilan keputusan atau percabangan kondisi adalah…',
      options: ['Belah ketupat (diamond)', 'Persegi panjang datar', 'Oval terminator', 'Jajar genjang miring'],
      answer: 0,
      why: { 0: 'Bentuk belah ketupat memuat ekspresi evaluasi ya/tidak untuk mencabangkan arah diagram alir.' }
    },
    {
      prompt: 'Perangkat lunak jahat (malware) yang menyandera akses data korban dengan enkripsi lalu menuntut uang tebusan disebut…',
      options: ['Ransomware', 'Adware promosi', 'Spyware pasif', 'Keylogger tombol'],
      answer: 0,
      why: { 0: 'Ransomware mengunci berkas dokumen pengguna hingga tebusan digital disetorkan kepada peretas.' }
    },
    {
      prompt: 'Pemberian nomor alamat unik berbasis numerik pada setiap perangkat yang terhubung ke jaringan internet diistilahkan sebagai…',
      options: ['Internet Protocol Address (IP Address)', 'Media Access Control (MAC)', 'Domain Name System (DNS)', 'Uniform Resource Locator (URL)'],
      answer: 0,
      why: { 0: 'Alamat IP mengidentifikasi perangkat secara spesifik untuk perutean paket informasi di jaringan global.' }
    }
  ],
  PPK: [
    {
      prompt: 'Pancasila sebagai dasar falsafah negara menempatkan Ketuhanan Yang Maha Esa pada sila ke…',
      options: ['Pertama', 'Kedua', 'Ketiga', 'Kelima'],
      answer: 0,
      why: { 0: 'Sila ke-1 menegaskan landasan moral ketuhanan bagi tatanan kenegaraan Indonesia.' }
    },
    {
      prompt: 'Jaminan pemenuhan hak konstitusional warga negara atas pengajaran tercantum dalam UUD 1945 pada…',
      options: ['Pasal 31 ayat 1', 'Pasal 27 ayat 2', 'Pasal 33 ayat 3', 'Pasal 36'],
      answer: 0,
      why: { 0: 'Pasal 31 ayat 1 menyatakan setiap warga negara berhak mendapat pendidikan.' }
    },
    {
      prompt: 'Institusi audit negara yang independen dalam memeriksa pengelolaan keuangan kas negara adalah…',
      options: ['Badan Pemeriksa Keuangan (BPK)', 'Mahkamah Konstitusi', 'Dewan Perwakilan Daerah', 'Komisi Yudisial'],
      answer: 0,
      why: { 0: 'BPK bertugas memeriksa pengelolaan dan tanggung jawab seputar keuangan negara.' }
    },
    {
      prompt: 'Karakter persatuan serta kegotongroyongan dalam kemajemukan bangsa mencerminkan penghayatan sila ke…',
      options: ['Ketiga (Persatuan Indonesia)', 'Pertama', 'Kedua', 'Keempat'],
      answer: 0,
      why: { 0: 'Sila ketiga menekankan integrasi nasional dan persatuan bangsa di atas perbedaan.' }
    },
    {
      prompt: 'Kaidah pergaulan masyarakat yang memiliki sanksi pemaksa nyata berupa hukuman kurungan atau denda adalah…',
      options: ['Norma hukum positif', 'Norma kesopanan', 'Norma kesusilaan internal', 'Kebiasaan informal'],
      answer: 0,
      why: { 0: 'Norma hukum ditegakkan oleh aparatur berwenang dengan sanksi tegas mengikat.' }
    },
    {
      prompt: 'Semboyan "Bhinneka Tunggal Ika" yang menjadi pilar persatuan bangsa dipetik dari karya sastra Kitab Sutasoma karangan…',
      options: ['Empu Tantular', 'Empu Prapanca', 'Empu Sedah', 'Empu Panuluh'],
      answer: 0,
      why: { 0: 'Kutipan pupuh 139 bait 5 Kitab Sutasoma dari zaman Majapahit menegaskan persatuan di tengah keberagaman.' }
    },
    {
      prompt: 'Lembaga tinggi negara yang berwenang menguji undang-undang terhadap Undang-Undang Dasar 1945 (judicial review) adalah…',
      options: ['Mahkamah Konstitusi (MK)', 'Mahkamah Agung (MA)', 'Komisi Yudisial (KY)', 'Kejaksaan Agung'],
      answer: 0,
      why: { 0: 'Mahkamah Konstitusi bertugas menegakkan supremasi konstitusi melalui pengujian materiel undang-undang.' }
    },
    {
      prompt: 'Pengamalan nilai keadilan sosial bagi seluruh rakyat Indonesia tercermin melalui sikap…',
      options: ['Menjaga keseimbangan hak sesama serta menghargai karya cipta orang lain', 'Mengutamakan kepentingan golongan pribadi di atas publik', 'Menutup ruang partisipasi musyawarah kelompok', 'Memaksakan kehendak opini dalam forum bersama'],
      answer: 0,
      why: { 0: 'Sila kelima menekankan pemerataan kebajikan sosial, apresiasi hak, dan penghapusan kesewenang-wenangan.' }
    },
    {
      prompt: 'Hierarki tata urutan peraturan perundang-undangan tertinggi di Negara Kesatuan Republik Indonesia adalah…',
      options: ['Undang-Undang Dasar Negara Republik Indonesia Tahun 1945', 'Ketetapan MPR', 'Peraturan Pemerintah Pengganti Undang-Undang', 'Peraturan Daerah Provinsi'],
      answer: 0,
      why: { 0: 'Berdasarkan UU No. 12 Tahun 2011, UUD 1945 merupakan hukum dasar tertulis tertinggi di Indonesia.' }
    },
    {
      prompt: 'Asas kewarganegaraan yang menentukan status kebangsaan seseorang berdasarkan pertalian darah keturunan orang tuanya dinamakan…',
      options: ['Ius Sanguinis', 'Ius Soli', 'Bipatride otomatis', 'Apatride terbuka'],
      answer: 0,
      why: { 0: 'Ius sanguinis (hak darah) menetapkan kewarganegaraan berpatokan pada garis asal keturunan orang tua.' }
    },
    {
      prompt: 'Bentuk partisipasi aktif warga negara dalam upaya pertahanan dan keamanan lingkungan permukiman adalah…',
      options: ['Melaksanakan ronda malam siskamling secara bergiliran', 'Menyerahkan pengamanan lingkungan hanya ke aparat', 'Menolak mengenali tetangga di sekitar tempat tinggal', 'Mendirikan barikade jalan sepihak tanpa izin'],
      answer: 0,
      why: { 0: 'Siskamling adalah wujud nyata bela negara lingkungan sipil yang memperkokoh ketenteraman bersama.' }
    },
    {
      prompt: 'Sistem perwakilan legislatif di Indonesia yang beranggotakan wakil daerah provinsi nonpartai politik adalah…',
      options: ['Dewan Perwakilan Daerah (DPD)', 'Dewan Perwakilan Rakyat (DPR)', 'Dewan Pertimbangan Presiden', 'Majelis Permusyawaratan Rakyat'],
      answer: 0,
      why: { 0: 'DPD memperjuangkan aspirasi dan kepentingan daerah otonom pada tingkat perumusan kebijakan pusat.' }
    },
    {
      prompt: 'Sikap mengutamakan kepentingan bangsa di atas kepentingan pribadi dengan rela berkorban demi kedaulatan tanah air disebut…',
      options: ['Patriotisme sejati', 'Etnosentrisme sempit', 'Chauvinisme ekstrem', 'Individualisme murni'],
      answer: 0,
      why: { 0: 'Patriotisme adalah jiwa kerelaan berkorban secara tulus demi kejayaan dan kehormatan bangsa.' }
    },
    {
      prompt: 'Kewajiban asasi setiap warga negara yang termaktub secara eksplisit dalam Pasal 27 ayat 3 UUD 1945 berkaitan dengan…',
      options: ['Ikut serta dalam upaya pembelaan negara', 'Membayar retribusi parkir daerah', 'Menempuh studi ke perguruan tinggi', 'Memiliki tabungan perbankan nasional'],
      answer: 0,
      why: { 0: 'Pasal 27 ayat 3 menetapkan hak dan kewajiban setiap warga negara ikut serta membela negara.' }
    },
    {
      prompt: 'Lembaga mandiri yang berwenang mengusulkan pengangkatan hakim agung dan menegakkan martabat hakim di Indonesia adalah…',
      options: ['Komisi Yudisial (KY)', 'Komisi Pemberantasan Korupsi (KPK)', 'Ombudsman Republik Indonesia', 'Lembaga Perlindungan Saksi'],
      answer: 0,
      why: { 0: 'Komisi Yudisial menjaga kehormatan, integritas etika, dan perilaku peradilan para hakim di Indonesia.' }
    }
  ],
  AGM: [
    {
      prompt: 'Pondasi rukun iman dalam doktrin Islam beranggotakan keyakinan sebanyak…',
      options: ['6 rukun keimanan', '5 rukun kewajiban', '10 rukun ketaatan', '4 rukun amalan'],
      answer: 0,
      why: { 0: 'Rukun Iman ada enam: kepada Allah, malaikat, kitab-kitab, rasul, hari kiamat, qada dan qadar.' }
    },
    {
      prompt: 'Sikap moderasi beragama dalam bingkai kebinekaan diwujudkan dengan…',
      options: ['Menghormati peribadatan sesama tanpa mencampuradukkan akidah', 'Memaksakan keyakinan pribadi kepada pihak lain', 'Menutup dialog antarwarga beriman', 'Mengabaikan nilai-nilai kebaikan universal'],
      answer: 0,
      why: { 0: 'Toleransi autentik menjunjung tinggi penghormatan timbal-balik tanpa kompromi teologis.' }
    },
    {
      prompt: 'Sifat amanah, shiddiq, fathanah, dan tabligh merupakan teladan kepribadian yang tergolong…',
      options: ['Akhlak mulia (mahmudah)', 'Sikap tercela (madzmumah)', 'Tradisi seremonial semata', 'Hukum mubah kasual'],
      answer: 0,
      why: { 0: 'Empat sifat kenabian tersebut merepresentasikan puncak integritas etika dan akhlak mulia.' }
    },
    {
      prompt: 'Kitab Zabur menurut keyakinan samawi diwahyukan kepada nabi utusan…',
      options: ['Nabi Daud a.s.', 'Nabi Musa a.s.', 'Nabi Isa a.s.', 'Nabi Ibrahim a.s.'],
      answer: 0,
      why: { 0: 'Zabur diwahyukan kepada Nabi Daud, Taurat kepada Musa, dan Injil kepada Isa.' }
    },
    {
      prompt: 'Dimensi spiritual puasa mengajarkan kepekaan sosial berupa…',
      options: ['Asah empati terhadap kaum papa serta latihan pengendalian hawa nafsu', 'Kebiasaan mengonsumsi makanan berlebihan saat petang', 'Menghentikan seluruh aktivitas produktivitas harian', 'Menghindari interaksi dengan lingkungan sekitar'],
      answer: 0,
      why: { 0: 'Rasa lapar membangkitkan solidaritas kemanusiaan dan kemandirian pengendalian diri.' }
    },
    {
      prompt: 'Perilaku terpuji yang mencerminkan sikap rendah hati serta tidak memamerkan kelebihan diri diistilahkan sebagai…',
      options: ['Tawaduk (rendah hati)', 'Takabur (sombong)', 'Riya pamer', 'Hasad dengki'],
      answer: 0,
      why: { 0: 'Tawaduk adalah sifat mulia di mana seseorang menyadari kelemahan diri di hadapan Sang Pencipta dan sesama.' }
    },
    {
      prompt: 'Dalam ajaran agama Islam, zakat fitrah wajib ditunaikan oleh setiap muslim menjelang tibanya…',
      options: ['Hari Raya Idul Fitri', 'Hari Raya Idul Adha', 'Peringatan Isra Mikraj', 'Tahun Baru Hijriah'],
      answer: 0,
      why: { 0: 'Zakat fitrah membersihkan jiwa orang yang berpuasa dan ditunaikan sebelum salat Idul Fitri.' }
    },
    {
      prompt: 'Hukum perbuatan dalam fikih di mana pelakunya memperoleh pahala bila mengerjakan dan tidak berdosa bila meninggalkan adalah…',
      options: ['Sunah (mustahab)', 'Wajib mutlak', 'Makruh', 'Haram qath’i'],
      answer: 0,
      why: { 0: 'Sunah adalah perbuatan yang dianjurkan pengerjaannya oleh syariat tanpa konsekuensi sanksi jika terlewat.' }
    },
    {
      prompt: 'Nilai kasih sayang tanpa membedakan latar belakang sesama manusia merupakan pesan luhur dalam doktrin ajaran…',
      options: ['Seluruh agama samawi dan tradisi kebajikan universal', 'Kelompok eksklusif tertutup semata', 'Aliran sekuler ekstrem', 'Doktrin individualisme material'],
      answer: 0,
      why: { 0: 'Prinsip belas kasih, kemanusiaan, dan kedamaian merupakan inti ajaran etika seluruh agama beradab.' }
    },
    {
      prompt: 'Sikap berserah diri secara tulus kepada ketentuan Tuhan setelah berikhtiar secara optimal dinamakan…',
      options: ['Tawakal', 'Pasrah tanpa usaha', 'Pesimisme fatalistik', 'Takabur diri'],
      answer: 0,
      why: { 0: 'Tawakal adalah menyandarkan hasil akhir ikhtiar kepada kehendak ilahi dengan hati yang tenang lapang.' }
    },
    {
      prompt: 'Kitab suci yang diturunkan kepada Nabi Musa a.s. sebagai petunjuk bagi kaumnya adalah…',
      options: ['Kitab Taurat', 'Kitab Injil', 'Kitab Al-Qur’an', 'Kitab Weda'],
      answer: 0,
      why: { 0: 'Taurat diwahyukan kepada Nabi Musa di Bukit Tursina memuat sepuluh perintah suci.' }
    },
    {
      prompt: 'Konsep moderasi beragama menempatkan pemeluk agama untuk menolak dua kutub ekstrem, yaitu…',
      options: ['Ekstremisme radikal di satu sisi dan liberalisme permisif di sisi lain', 'Ketaatan ibadah dan sedekah sosial', 'Kesalehan personal dan keteladanan budi pekerti', 'Studi kitab suci dan dialog antarwarga'],
      answer: 0,
      why: { 0: 'Moderasi (wasathiyah) mengambil jalan tengah yang adil dan berimbang di antara kekakuan dan kelalaian.' }
    },
    {
      prompt: 'Tindakan meminta ampun dan menyesali kesalahan masa lalu dengan tekad tidak mengulanginya lagi diistilahkan sebagai…',
      options: ['Tobat nasuha', 'Kafarat duniawi', 'Nazar bersyarat', 'Istisqa doa'],
      answer: 0,
      why: { 0: 'Tobat yang tulus (nasuha) mensyaratkan penyesalan mendalam, penghentian dosa, dan perbaikan perbuatan.' }
    },
    {
      prompt: 'Menghormati orang tua dan pendidik serta bertutur kata santun kepada mereka merupakan wujud nyata dari pengamalan…',
      options: ['Birrul walidain dan adab penuntut ilmu', 'Kewajiban seremonial kasual', 'Formalitas tata tertib sekolah', 'Tradisi simbolis tanpa makna'],
      answer: 0,
      why: { 0: 'Berbakti kepada orang tua dan memuliakan guru menempati derajat utama dalam tatanan moral beragama.' }
    },
    {
      prompt: 'Pemberian sedekah atau derma secara sukarela kepada mereka yang membutuhkan dengan niat tulus dinamakan…',
      options: ['Infaq dan sedekah jariyah', 'Riba komersial', 'Pajak bumi negara', 'Gharar transaksi'],
      answer: 0,
      why: { 0: 'Sedekah merupakan amalan filantropi sukarela yang mendatangkan kemaslahatan sosial berkelanjutan.' }
    }
  ],
  FIS: [
    {
      prompt: 'Sebuah mobil melaju dengan kecepatan tetap 72 km/jam. Jarak tempuh dalam waktu 15 menit adalah…',
      options: ['18 km', '10.8 km', '4.8 km', '36 km'],
      answer: 0,
      why: { 0: '72 km/jam = 72 \u00d7 (15/60) = 72 \u00d7 0.25 = 18 km.' }
    },
    {
      prompt: 'Energi kinetik suatu benda bermassa 4 kg yang melaju dengan kelajuan 3 m/s adalah…',
      options: ['18 J', '12 J', '36 J', '6 J'],
      answer: 0,
      why: { 0: 'Ek = ½ mv² = ½ \u00d7 4 \u00d7 9 = 18 Joule.' }
    },
    {
      prompt: 'Kawat penghantar dialiri arus listrik 2 A selama 5 menit. Muatan listrik yang mengalir adalah…',
      options: ['600 C', '10 C', '150 C', '2.5 C'],
      answer: 0,
      why: { 0: 'Q = I \u00d7 t = 2 A \u00d7 300 s = 600 Coulomb.' }
    },
    {
      prompt: 'Gelombang bunyi tidak dapat merambat melalui media…',
      options: ['Kondisi hampa udara (vakum)', 'Air laut', 'Batang besi', 'Udara bebas'],
      answer: 0,
      why: { 0: 'Bunyi memerlukan partikel medium untuk merambat; di ruang hampa tidak ada materi perantara.' }
    },
    {
      prompt: 'Lensa cembung (konveks) digunakan untuk membantu penderita kelainan mata…',
      options: ['Hipermetropi (rabun dekat)', 'Miopi (rabun jauh)', 'Astigmatisme (silinder)', 'Presbiopi total'],
      answer: 0,
      why: { 0: 'Hipermetropi dikoreksi dengan lensa cembung yang mengumpulkan berkas cahaya tepat di retina.' }
    },
    {
      prompt: 'Besarnya tekanan hidrostatis pada kedalaman tertentu di dalam zat cair dipengaruhi secara langsung oleh…',
      options: ['Massa jenis cairan, percepatan gravitasi, dan kedalaman posisi', 'Bentuk wadah penampung dan luas permukaan cairan', 'Suhu wadah penampung semata', 'Kelajuan aliran fluida di permukaan'],
      answer: 0,
      why: { 0: 'Tekanan hidrostatis dirumuskan P = ρ \u00d7 g \u00d7 h, bergantung pada massa jenis zat cair, gravitasi, dan kedalaman.' }
    },
    {
      prompt: 'Suatu alat elektronik menyerap daya 110 Watt saat dihubungkan ke sumber tegangan 220 Volt. Kuat arus listrik yang mengalir adalah…',
      options: ['0.5 Ampere', '2 Ampere', '24.2 Ampere', '0.2 Ampere'],
      answer: 0,
      why: { 0: 'Berdasarkan rumus daya listrik P = V \u00d7 I, maka I = P / V = 110 W / 220 V = 0.5 A.' }
    },
    {
      prompt: 'Prinsip fisika yang menyatakan bahwa gaya apung ke atas pada benda tercelup sama dengan berat fluida yang dipindahkan adalah…',
      options: ['Hukum Archimedes', 'Hukum Pascal', 'Hukum Boyle', 'Hukum Hooke'],
      answer: 0,
      why: { 0: 'Hukum Archimedes mendasari prinsip terapung, melayang, dan tenggelamnya benda dalam zat cair.' }
    },
    {
      prompt: 'Sebuah benda dijatuhkan bebas tanpa kecepatan awal dari ketinggian 20 meter (g = 10 m/s²). Waktu yang dibutuhkan hingga menyentuh tanah adalah…',
      options: ['2 detik', '4 detik', '1 detik', '10 detik'],
      answer: 0,
      why: { 0: 'Gunakan rumus gerak jatuh bebas: t = √(2h / g) = √(40 / 10) = √4 = 2 detik.' }
    },
    {
      prompt: 'Hukum fisika yang menyatakan bahwa gaya aksi dan reaksi antara dua benda memiliki besar sama tetapi berlawanan arah adalah…',
      options: ['Hukum III Newton', 'Hukum I Newton', 'Hukum II Newton', 'Hukum Gravitasi Universal'],
      answer: 0,
      why: { 0: 'F_aksi = -F_reaksi. Pasangan gaya terjadi pada dua benda berlainan dengan arah berlawanan.' }
    },
    {
      prompt: 'Panjang gelombang sebuah gelombang yang merambat dengan kelajuan 340 m/s dan frekuensi 170 Hz adalah…',
      options: ['2 meter', '0.5 meter', '510 meter', '57.800 meter'],
      answer: 0,
      why: { 0: 'Panjang gelombang λ = v / f = 340 m/s / 170 Hz = 2 meter.' }
    },
    {
      prompt: 'Besarnya energi potensial gravitasi suatu benda seberat 5 kg yang berada pada ketinggian 6 meter (g = 10 m/s²) adalah…',
      options: ['300 Joule', '30 Joule', '150 Joule', '60 Joule'],
      answer: 0,
      why: { 0: 'Ep = m \u00d7 g \u00d7 h = 5 kg \u00d7 10 m/s² \u00d7 6 m = 300 Joule.' }
    },
    {
      prompt: 'Dua buah muatan listrik sejenis yang saling didekatkan akan mengalami interaksi gaya…',
      options: ['Tolak-menolak sebanding kuadrat terbalik jarak', 'Tarik-menarik kuat', 'Tetap tanpa interaksi gaya', 'Menempel menyatu secara permanen'],
      answer: 0,
      why: { 0: 'Hukum Coulomb: muatan sejenis tolak-menolak sedangkan muatan tak sejenis tarik-menarik.' }
    },
    {
      prompt: 'Hambatan pengganti dari tiga resistor identik masing-masing bernilai 6 Ohm yang dirangkai secara seri adalah…',
      options: ['18 Ohm', '2 Ohm', '12 Ohm', '0.5 Ohm'],
      answer: 0,
      why: { 0: 'Rangkaian seri menjumlahkan nilai hambatan: R_total = 6 + 6 + 6 = 18 Ohm.' }
    },
    {
      prompt: 'Peristiwa pembelokan arah rambat berkas cahaya saat melintasi batas dua medium dengan kerapatan optik berbeda dinamakan…',
      options: ['Pembiasan (refraksi) gelombang', 'Pemantulan baur (difusi)', 'Polarisasi linier', 'Dispersi prisma'],
      answer: 0,
      why: { 0: 'Refraksi terjadi karena perubahan kecepatan rambat cahaya saat memasuki medium berkerapatan optik beda.' }
    }
  ],
  KIM: [
    {
      prompt: 'Atom karbon memiliki nomor atom 6. Jumlah elektron pada kulit terluar atom karbon adalah…',
      options: ['4', '2', '6', '8'],
      answer: 0,
      why: { 0: 'Konfigurasi elektron C: 2, 4. Kulit valensi memiliki 4 elektron.' }
    },
    {
      prompt: 'Larutan dengan nilai pH = 3 tergolong larutan…',
      options: ['Asam kuat', 'Basa kuat', 'Netral', 'Basa lemah'],
      answer: 0,
      why: { 0: 'Nilai pH < 7 menunjukkan sifat asam; pH 3 tergolong asam kuat.' }
    },
    {
      prompt: 'Reaksi antara logam natrium (Na) dengan air (H₂O) menghasilkan…',
      options: ['NaOH dan gas H₂', 'Na₂O dan gas O₂', 'NaCl dan gas H₂', 'NaOH dan gas O₂'],
      answer: 0,
      why: { 0: '2Na + 2H₂O → 2NaOH + H₂. Reaksi menghasilkan natrium hidroksida dan gas hidrogen.' }
    },
    {
      prompt: 'Ikatan kimia yang terbentuk akibat penggunaan bersama pasangan elektron dinamakan…',
      options: ['Ikatan kovalen', 'Ikatan ion', 'Ikatan logam', 'Ikatan hidrogen'],
      answer: 0,
      why: { 0: 'Ikatan kovalen terjadi ketika dua atom saling berbagi pasangan elektron valensi.' }
    },
    {
      prompt: 'Unsur-unsur yang terletak dalam satu golongan pada tabel periodik memiliki kesamaan pada…',
      options: ['Jumlah elektron valensi', 'Jumlah kulit atom', 'Massa atom relatif', 'Jumlah neutron inti'],
      answer: 0,
      why: { 0: 'Unsur segolongan memiliki jumlah elektron valensi sama sehingga sifat kimianya serupa.' }
    },
    {
      prompt: 'Rumus molekul kimia yang menyatakan senyawa asam sulfat secara tepat adalah…',
      options: ['H₂SO₄', 'HCl', 'HNO₃', 'H₃PO₄'],
      answer: 0,
      why: { 0: 'Asam sulfat tersusun atas dua kation hidrogen (H⁺) dan satu anion sulfat (SO₄²⁻) membentuk H₂SO₄.' }
    },
    {
      prompt: 'Metode pemisahan komponen minyak bumi berdasarkan perbedaan titik didih fraksi-fraksinya dinamakan…',
      options: ['Distilasi bertingkat (fraksionasi)', 'Kromatografi kertas', 'Kristalisasi penguapan', 'Filtrasi saringan halus'],
      answer: 0,
      why: { 0: 'Distilasi fraksionasi memisahkan hidrokarbon minyak mentah pada rentang suhu didih yang berbeda di menara distilasi.' }
    },
    {
      prompt: 'Partikel dasar penyusun atom yang bermuatan listrik negatif dan bergerak mengitari inti atom adalah…',
      options: ['Elektron', 'Proton', 'Neutron', 'Positron'],
      answer: 0,
      why: { 0: 'Elektron mengorbit inti atom pada tingkat-tingkat energi kulit atom dengan muatan negatif (-1).' }
    },
    {
      prompt: 'Jumlah partikel dalam satu mol suatu zat menurut bilangan Avogadro adalah…',
      options: ['6.02 \u00d7 10²³ partikel', '3.01 \u00d7 10²³ partikel', '1.20 \u00d7 10²⁴ partikel', '6.02 \u00d7 10²² partikel'],
      answer: 0,
      why: { 0: 'Tetapan Avogadro bernilai 6.022 \u00d7 10²³ partikel per mol zat.' }
    },
    {
      prompt: 'Zat yang mempercepat laju suatu reaksi kimia tanpa mengalami perubahan kimia permanen pada akhir reaksi disebut…',
      options: ['Katalisator (katalis)', 'Inhibitor reaksi', 'Indikator asam-basa', 'Presipitat endapan'],
      answer: 0,
      why: { 0: 'Katalis menurunkan energi aktivasi reaksi sehingga laju reaksi meningkat tanpa ikut terkonsumsi.' }
    },
    {
      prompt: 'Reaksi pembakaran hidrokarbon sempurna dari gas metana (CH₄) di udara terbuka akan menghasilkan…',
      options: ['Karbon dioksida (CO₂) dan uap air (H₂O)', 'Karbon monoksida (CO) dan jelaga', 'Gas hidrogen murni dan karbon', 'Gas klorin dan asam metanoat'],
      answer: 0,
      why: { 0: 'Reaksi: CH₄ + 2O₂ → CO₂ + 2H₂O melepaskan energi kalor secara eksotermik.' }
    },
    {
      prompt: 'Larutan penyangga (buffer) memiliki sifat khas yang sangat penting dalam sistem biologi karena mampu…',
      options: ['Mempertahankan derajat keasaman (pH) saat penambahan sedikit asam atau basa', 'Menaikkan titik didih pelarut secara drastis', 'Mengendapkan seluruh kation logam berat', 'Mengubah larutan asam pekat menjadi netral seketika'],
      answer: 0,
      why: { 0: 'Buffer meminimalkan fluktuasi pH melalui kesetimbangan asam lemah dan basa konjugasinya.' }
    },
    {
      prompt: 'Unsur gas mulia (Golongan VIIIA) sangat stabil dan sukar bereaksi dengan zat lain karena memiliki…',
      options: ['Konfigurasi elektron valensi penuh (oktet atau duplet)', 'Energi ionisasi yang sangat rendah', 'Afinitas elektron bernilai sangat positif', 'Jari-jari atom yang teramat besar'],
      answer: 0,
      why: { 0: 'Konfigurasi 8 elektron valensi (atau 2 pada Helium) memberikan kestabilan kimiawi maksimal.' }
    },
    {
      prompt: 'Peristiwa pelepasan elektron oleh suatu atom atau ion dalam reaksi redoks diklasifikasikan sebagai…',
      options: ['Reaksi oksidasi', 'Reaksi reduksi', 'Reaksi hidrolisis', 'Reaksi netralisasi'],
      answer: 0,
      why: { 0: 'Oksidasi didefinisikan sebagai peristiwa pelepasan elektron yang disertai kenaikan bilangan oksidasi.' }
    },
    {
      prompt: 'Massa molekul relatif (Mr) dari senyawa air (H₂O) jika diketahui Ar H = 1 dan Ar O = 16 adalah…',
      options: ['18 g/mol', '17 g/mol', '34 g/mol', '16 g/mol'],
      answer: 0,
      why: { 0: 'Mr H₂O = (2 \u00d7 Ar H) + (1 \u00d7 Ar O) = (2 \u00d7 1) + 16 = 18 g/mol.' }
    }
  ],
  BIO: [
    {
      prompt: 'Proses fotosintesis pada tumbuhan berklorofil berlangsung di dalam organel…',
      options: ['Kloroplas', 'Mitokondria', 'Ribosom', 'Lisosom'],
      answer: 0,
      why: { 0: 'Kloroplas mengandung klorofil penangkap foton cahaya untuk sintesis glukosa.' }
    },
    {
      prompt: 'Hasil akhir hidrolisis protein pada saluran usus halus berupa…',
      options: ['Asam amino', 'Glukosa', 'Asam lemak dan gliserol', 'Maltosa'],
      answer: 0,
      why: { 0: 'Protein dipecah oleh protease hingga menjadi molekul asam amino siap serap.' }
    },
    {
      prompt: 'Penyakit defisiensi imun AIDS disebabkan oleh infeksi virus yang merusak sistem…',
      options: ['Kekebalan tubuh (imun)', 'Pencernaan makanan', 'Pernapasan internal', 'Saraf pusat'],
      answer: 0,
      why: { 0: 'HIV menginfeksi limfosit T helper sehingga daya tahan tubuh inang melemah drastis.' }
    },
    {
      prompt: 'Persilangan monohibrid dominan penuh antara genotipe Aa dengan sesamanya menghasilkan perbandingan fenotipe…',
      options: ['3 dominan : 1 resesif', '1 dominan : 1 resesif', '2 dominan : 2 resesif', '4 dominan : 0 resesif'],
      answer: 0,
      why: { 0: 'Kombinasi Aa \u00d7 Aa menghasilkan AA, 2Aa, aa sehingga rasio fenotipe 3:1.' }
    },
    {
      prompt: 'Kawasan hutan mangrove di garis pantai berperan penting untuk…',
      options: ['Menahan abrasi gelombang dan habitat biota pesisir', 'Meningkatkan emisi karbon bebas', 'Memicu erosi tanah alluvial', 'Menekan keanekaragaman hayati'],
      answer: 0,
      why: { 0: 'Jaringan akar mangrove memecah energi ombak serta menjadi tempat pemijahan ikan.' }
    },
    {
      prompt: 'Pembuluh darah utama yang mengalirkan darah kaya oksigen dari bilik kiri jantung menuju seluruh jaringan tubuh adalah…',
      options: ['Aorta', 'Vena kava superior', 'Arteri pulmonalis', 'Vena pulmonalis'],
      answer: 0,
      why: { 0: 'Aorta adalah arteri terbesar yang menerima darah bertekanan tinggi dari ventrikel kiri untuk didistribusikan ke seluruh tubuh.' }
    },
    {
      prompt: 'Fase pembelahan mitosis di mana benang spindel menata dan menarik kromosom berjejer tepat di bidang ekuator sel adalah…',
      options: ['Metafase', 'Profase', 'Anafase', 'Telofase'],
      answer: 0,
      why: { 0: 'Pada metafase, kromosom terkondensasi maksimal dan berjejer teratur di lempeng metafase (bidang pembelahan).' }
    },
    {
      prompt: 'Bagian saluran pencernaan manusia tempat terjadinya penyerapan (absorpsi) sari-sari makanan ke dalam peredaran darah adalah…',
      options: ['Usus halus (ileum)', 'Lambung (ventrikulus)', 'Usus besar (kolon)', 'Kerongkongan (esofagus)'],
      answer: 0,
      why: { 0: 'Vili dan mikrovili pada dinding usus halus memperluas bidang penyerapan nutrisi makanan ke kapiler darah.' }
    },
    {
      prompt: 'Organel bermembran ganda yang dijuluki "the powerhouse of cell" karena menghasilkan energi ATP adalah…',
      options: ['Mitokondria', 'Badan Golgi', 'Retikulum endoplasma halus', 'Peroksisom'],
      answer: 0,
      why: { 0: 'Mitokondria melangsungkan fosforilasi oksidatif dan siklus Krebs untuk sintesis ATP.' }
    },
    {
      prompt: 'Jaringan pengangkut pada tumbuhan yang berfungsi menyalurkan hasil fotosintesis dari daun ke seluruh tubuh adalah…',
      options: ['Floem (pembuluh tapis)', 'Xilem (pembuluh kayu)', 'Kambium gabus', 'Epidermis pelindung'],
      answer: 0,
      why: { 0: 'Floem mentranslokasikan sukrosa dan nutrisi organik lain dari organ produsen ke organ konsumen.' }
    },
    {
      prompt: 'Hormon yang disekresikan oleh sel beta pankreas untuk menurunkan konsentrasi glukosa dalam darah adalah…',
      options: ['Insulin', 'Glukagon', 'Adrenalin', 'Tiroksin'],
      answer: 0,
      why: { 0: 'Insulin memfasilitasi penyerapan glukosa darah ke dalam sel otot dan hati untuk diubah menjadi glikogen.' }
    },
    {
      prompt: 'Interaksi antara ikan badut (clownfish) dan anemon laut yang saling memberikan keuntungan tergolong…',
      options: ['Simbiosis mutualisme', 'Simbiosis parasitisme', 'Simbiosis komensalisme', 'Simbiosis amensalisme'],
      answer: 0,
      why: { 0: 'Ikan badut terlindungi oleh tentakel anemon sementara anemon memperoleh sisa makanan dan dibersihkan dari parasit.' }
    },
    {
      prompt: 'Basa nitrogen pirimidin yang hanya ditemukan pada molekul RNA dan menggantikan timin adalah…',
      options: ['Urasil', 'Sitosin', 'Guanin', 'Adenin'],
      answer: 0,
      why: { 0: 'Pada untai tunggal RNA, urasil berpasangan komplementer dengan adenin menggantikan peran timin DNA.' }
    },
    {
      prompt: 'Unit fungsional dan struktural terkecil pada ginjal manusia yang menyaring darah dinamakan…',
      options: ['Nefron', 'Neuron sensorik', 'Alveolus kapiler', 'Lobulus hepatik'],
      answer: 0,
      why: { 0: 'Tiap ginjal tersusun atas sekitar satu juta nefron yang terdiri dari glomerulus dan tubulus renalis.' }
    },
    {
      prompt: 'Proses pembentukan sperma (gamet jantan) di dalam tubulus seminiferus testis dinamakan…',
      options: ['Spermatogenesis', 'Oogenesis sel telur', 'Fertilisasi internal', 'Metamorfosis sempurna'],
      answer: 0,
      why: { 0: 'Spermatogenesis menghasilkan spermatozoa fungsional melalui tahapan mitosis dan meiosis.' }
    }
  ],
  EKO: [
    {
      prompt: 'Pengorbanan atas pilihan terbaik lain yang harus dilepaskan saat mengambil keputusan ekonomi disebut…',
      options: ['Opportunity cost (biaya peluang)', 'Sunk cost', 'Biaya marginal', 'Biaya eksplisit'],
      answer: 0,
      why: { 0: 'Biaya peluang adalah nilai alternatif terbaik berikutnya yang dikorbankan.' }
    },
    {
      prompt: 'Berdasarkan hukum permintaan, apabila harga suatu komoditas mengalami kenaikan maka kuantitas yang diminta akan…',
      options: ['Mengalami penurunan (ceteris paribus)', 'Mengalami kenaikan pesat', 'Tetap tanpa fluktuasi', 'Tak terhingga jumlahnya'],
      answer: 0,
      why: { 0: 'Hukum permintaan berbanding terbalik: harga naik menyebabkan jumlah permintaan turun.' }
    },
    {
      prompt: 'Kenaikan tingkat harga umum barang secara terus-menerus akibat kenaikan biaya input produksi dinamakan…',
      options: ['Cost-push inflation', 'Demand-pull inflation', 'Deflasi musiman', 'Depresiasi modal'],
      answer: 0,
      why: { 0: 'Cost-push timbul ketika ongkos faktor produksi (upah/bahan mentah) melambung.' }
    },
    {
      prompt: 'Otoritas moneter yang memiliki hak tunggal mencetak dan mengedarkan mata uang rupiah adalah…',
      options: ['Bank Indonesia (BI)', 'Otoritas Jasa Keuangan (OJK)', 'Kementerian Keuangan RI', 'Lembaga Penjamin Simpanan'],
      answer: 0,
      why: { 0: 'Bank sentral (BI) memegang hak oktroi peredaran mata uang negara.' }
    },
    {
      prompt: 'Karakteristik mendasar dari struktur pasar persaingan sempurna adalah…',
      options: ['Jumlah penjual-pembeli melimpah dengan komoditas homogen', 'Hanya ada satu produsen tunggal pengendali pasar', 'Terdapat diferensiasi produk yang tajam', 'Rintangan masuk pasar sangat tinggi'],
      answer: 0,
      why: { 0: 'Pasar sempurna ditandai penjual banyak, produk serupa, dan kebebasan keluar-masuk.' }
    },
    {
      prompt: 'Pajak yang beban pembayarannya tidak dapat dialihkan kepada pihak lain (seperti Pajak Penghasilan / PPh) tergolong sebagai…',
      options: ['Pajak langsung', 'Pajak tidak langsung (PPN)', 'Pajak bea cukai', 'Retribusi daerah'],
      answer: 0,
      why: { 0: 'Pajak langsung dikenakan secara periodik kepada wajib pajak dan surat ketetapannya tidak dapat dilimpahkan ke pihak lain.' }
    },
    {
      prompt: 'Suatu kondisi perekonomian di mana nilai ekspor barang dan jasa suatu negara melampaui total nilai impornya disebut…',
      options: ['Neraca perdagangan surplus (aktif)', 'Neraca perdagangan defisit (pasif)', 'Stagflasi ekonomi', 'Devaluasi mata uang'],
      answer: 0,
      why: { 0: 'Surplus perdagangan terjadi saat penerimaan devisa dari ekspor lebih besar daripada devisa yang keluar untuk impor.' }
    },
    {
      prompt: 'Faktor produksi turunan yang mencakup kemampuan seseorang mengorganisasi, memimpin, dan menanggung risiko usaha dinamakan…',
      options: ['Kewirausahaan (entrepreneurship)', 'Tenaga kerja terdidik', 'Modal fisik barang', 'Sumber daya alam'],
      answer: 0,
      why: { 0: 'Kewirausahaan adalah keahlian manajerial memadukan faktor alam, tenaga kerja, dan modal secara produktif.' }
    },
    {
      prompt: 'Keseimbangan pasar (ekuilibrium) tercapai ketika…',
      options: ['Jumlah barang yang diminta konsumen sama dengan jumlah barang yang ditawarkan produsen', 'Pemerintah menetapkan batas pagu harga atas tertinggi', 'Seluruh produsen sepakat menurunkan nilai produksi komoditas', 'Laju inflasi nasional menyentuh angka nol persen'],
      answer: 0,
      why: { 0: 'Titik ekuilibrium (Qd = Qs) menentukan harga pasar stabil di mana tidak terjadi surplus maupun defisit barang.' }
    },
    {
      prompt: 'Instrumen kebijakan moneter Bank Sentral berupa pembelian atau penjualan surat berharga negara dinamakan…',
      options: ['Operasi pasar terbuka (open market operations)', 'Kebijakan diskonto suku bunga', 'Pemberlakuan cadangan kas minimum', 'Pemberian kredit selektif kreditur'],
      answer: 0,
      why: { 0: 'Bank Indonesia memperketat atau melonggarkan likuiditas uang beredar melalui jual-beli sertifikat berharga.' }
    },
    {
      prompt: 'Sistem ekonomi di mana seluruh alokasi sumber daya dan keputusan produksi diatur secara terpusat oleh komando pemerintah adalah…',
      options: ['Sistem ekonomi komando (sosialis terpusat)', 'Sistem ekonomi pasar bebas liberal', 'Sistem ekonomi tradisional subsisten', 'Sistem ekonomi barter kuno'],
      answer: 0,
      why: { 0: 'Dalam ekonomi terpimpin komando, negara memegang kendali kepemilikan alat produksi dan rencana distribusi.' }
    },
    {
      prompt: 'Suatu pasar yang hanya dikuasai oleh segelintir perusahaan produsen besar (seperti industri semen atau telekomunikasi) disebut pasar…',
      options: ['Oligopoli', 'Monopoli murni tunggal', 'Monopsoni pembeli', 'Persaingan monopolistik'],
      answer: 0,
      why: { 0: 'Pasar oligopoli dicirikan oleh sedikit pemain dominan yang keputusannya saling memengaruhi penetapan harga.' }
    },
    {
      prompt: 'Konsep yang menyatakan total nilai moneter dari seluruh barang dan jasa akhir yang dihasilkan suatu negara dalam periode setahun adalah…',
      options: ['Produk Domestik Bruto (PDB / GDP)', 'Pendapatan Per Kapita rata-rata', 'Neraca Pembayaran Internasional', 'Indeks Harga Konsumen (IHK)'],
      answer: 0,
      why: { 0: 'PDB mengukur output ekonomi bruto yang diproduksi di dalam batas teritorial suatu negara dalam satu tahun.' }
    },
    {
      prompt: 'Elastisitas permintaan yang bernilai lebih dari satu (Ed > 1) menunjukkan bahwa permintaan barang bersifat…',
      options: ['Elastis terhadap fluktuasi harga', 'Inelastis sempurna tanpa respons', 'Inelastis uniter proporsional', 'Inelastis moderat semata'],
      answer: 0,
      why: { 0: 'Ed > 1 berarti persentase perubahan kuantitas permintaan lebih besar daripada persentase perubahan harga.' }
    },
    {
      prompt: 'Lembaga pengawas independen yang mengawasi seluruh aktivitas di sektor jasa perbankan, pasar modal, dan asuransi di Indonesia adalah…',
      options: ['Otoritas Jasa Keuangan (OJK)', 'Kementerian Koordinator Perekonomian', 'Lembaga Penjamin Simpanan (LPS)', 'Badan Pusat Statistik (BPS)'],
      answer: 0,
      why: { 0: 'OJK dibentuk berlandaskan UU No. 21 Tahun 2011 untuk menyelenggarakan sistem pengawasan sektor jasa keuangan.' }
    }
  ],
  GEO: [
    {
      prompt: 'Lapisan atmosfer terendah tempat berlangsungnya dinamika cuaca seperti hujan dan angin adalah…',
      options: ['Troposfer', 'Stratosfer', 'Mesosfer', 'Termosfer'],
      answer: 0,
      why: { 0: 'Troposfer (0-12 km) menampung mayoritas massa udara dan uap air atmosfer bumi.' }
    },
    {
      prompt: 'Proses pembentukan permukaan bumi yang dipicu oleh tenaga dari dalam kerak bumi disebut tenaga…',
      options: ['Endogen', 'Eksogen', 'Pelapukan batuan', 'Sedimentasi fluviatil'],
      answer: 0,
      why: { 0: 'Tenaga endogen bersumber dari dinamika internal bumi mencakup tektonisme dan vulkanisme.' }
    },
    {
      prompt: 'Secara geografis perairan, posisi kepulauan Indonesia diapit oleh dua samudra luas, yaitu…',
      options: ['Samudra Hindia dan Samudra Pasifik', 'Samudra Atlantik dan Samudra Hindia', 'Samudra Arktik dan Samudra Pasifik', 'Samudra Atlantik dan Samudra Pasifik'],
      answer: 0,
      why: { 0: 'Indonesia berada di antara Samudra Hindia di selatan/barat dan Samudra Pasifik di timur.' }
    },
    {
      prompt: 'Karakteristik tanah vulkanik (andosol) yang menjadikannya sangat produktif bagi bercocok tanam adalah…',
      options: ['Kandungan mineral hara tinggi dari abu letusan gunung berapi', 'Tingginya kadar garam anorganik', 'Tersusun atas lempung kedap air', 'Kadar keasaman (pH) ekstrem'],
      answer: 0,
      why: { 0: 'Lapukan abu vulkanik kaya unsur hara fosfor, kalium, dan kalsium yang menyuburkan tanaman.' }
    },
    {
      prompt: 'Lingkaran khayal khatulistiwa (garis ekuator) membagi bola bumi menjadi dua belahan pada garis lintang…',
      options: ['0 derajat', '23.5 derajat LU', '90 derajat LS', '180 derajat bujur'],
      answer: 0,
      why: { 0: 'Garis ekuator berposisi tepat pada lintang nol derajat.' }
    },
    {
      prompt: 'Peristiwa keluarnya magma pijar dari interior perut bumi ke permukaan dinamakan fenomena…',
      options: ['Vulkanisme (erupsi gunung berapi)', 'Tektonisme lempeng patahan', 'Seisme gelombang gempa', 'Pelapukan batuan mekanis'],
      answer: 0,
      why: { 0: 'Vulkanisme mencakup intrusi magma ke litosfer dan ekstrusi lava menembus kepundan gunung berapi.' }
    },
    {
      prompt: 'Prinsip dasar geografi yang memaparkan persebaran gejala geosfer di muka bumi secara tidak merata adalah prinsip…',
      options: ['Distribusi (persebaran spasial)', 'Interelasi sebab-akibat', 'Deskripsi naratif', 'Korologi terpadu'],
      answer: 0,
      why: { 0: 'Prinsip distribusi menelaah fenomena alam dan manusia yang tersebar bervariasi di berbagai kawasan muka bumi.' }
    },
    {
      prompt: 'Siklus hidrologi di mana air laut menguap, terbawa angin ke daratan, mengalami kondensasi menjadi hujan di pegunungan, lalu mengalir kembali ke laut disebut…',
      options: ['Siklus hidrologi sedang', 'Siklus hidrologi pendek pantai', 'Siklus hidrologi panjang bersalju', 'Siklus transpirasi mikro'],
      answer: 0,
      why: { 0: 'Siklus sedang melibatkan adveksi awan ke wilayah daratan sebelum presipitasi air hujan terjadi.' }
    },
    {
      prompt: 'Bentuk muka bumi hasil proses pengendapan material sedimen di muara aliran sungai yang bertemu laut tenang dinamakan…',
      options: ['Delta sungai pesisir', 'Meander kelokan', 'Danau tapal kuda (oxbow lake)', 'Peneplain dataran tua'],
      answer: 0,
      why: { 0: 'Delta terbentuk saat arus sungai melambat di pertemuan muara laut sehingga sedimen mengendap berlipat.' }
    },
    {
      prompt: 'Lapisan litosfer kerak benua tersusun dominan atas senyawa batuan silisium dan aluminium yang dikenal dengan istilah lapisan…',
      options: ['Lapisan Sial (Silisium-Aluminium)', 'Lapisan Sima (Silisium-Magnesium)', 'Inti bumi dalam (Nife)', 'Astenosfer semi-cair'],
      answer: 0,
      why: { 0: 'Lapisan granitis kerak benua berkepadatan rendah didominasi mineral silika dan aluminium.' }
    },
    {
      prompt: 'Tipe iklim menurut Wladimir Köppen yang ditandai hutan hujan tropis basah dengan curah hujan tinggi sepanjang tahun dikodekan dengan huruf…',
      options: ['Af (Iklim hutan hujan tropis)', 'Aw (Iklim sabana tropis)', 'Cs (Iklim subtropis kering)', 'ET (Iklim tundra kutub)'],
      answer: 0,
      why: { 0: 'Kode Af mewakili zona tropis basah di mana tidak ada bulan kering berkepanjangan (curah > 60 mm per bulan).' }
    },
    {
      prompt: 'Sistem Informasi Geografis (SIG) memanfaatkan perangkat lunak spasial guna mengolah data geografis berformat raster dan…',
      options: ['Vektor (titik, garis, poligon)', 'Analog sketsa pensil', 'Koleksi audio gelombang', 'Transkrip teks wawancara'],
      answer: 0,
      why: { 0: 'Data vektor merepresentasikan kenampakan bumi ke dalam geometri titik (point), garis (polyline), dan poligon.' }
    },
    {
      prompt: 'Fenomena anomali suhu perairan Samudra Pasifik timur yang memicu musim kemarau berkepanjangan dan kekeringan di Indonesia disebut…',
      options: ['El Niño', 'La Niña basah', 'Dipole Mode positif murni', 'Monsun barat kuat'],
      answer: 0,
      why: { 0: 'El Niño memindahkan kolam air hangat ke Pasifik timur sehingga mengurangi pembentukan awan hujan di Indonesia.' }
    },
    {
      prompt: 'Peta yang menggambarkan relief tinggi-rendahnya permukaan bumi menggunakan garis-garis kontur ketinggian dinamakan peta…',
      options: ['Topografi', 'Korografi wilayah', 'Tematik persebaran penduduk', 'Kadaster bidang tanah'],
      answer: 0,
      why: { 0: 'Garis kontur topografi menghubungkan titik-titik lokasi di muka bumi yang memiliki elevasi ketinggian identik.' }
    },
    {
      prompt: 'Zona laut berdasarkan kedalamannya yang berada pada rentang kedalaman 0 hingga 200 meter dan kaya akan keanekaragaman ikan adalah zona…',
      options: ['Neritik (landas kontinen)', 'Litoral pasang-surut', 'Batial lereng benua', 'Abisal palung laut dalam'],
      answer: 0,
      why: { 0: 'Zona neritik masih terjangkau sinar matahari penuh sehingga fitoplankton berkembang biak subur menyokong ikan.' }
    }
  ],
  SOS: [
    {
      prompt: 'Percampuran dua kebudayaan atau lebih yang menghasilkan kultur baru tanpa menghilangkan jati diri budaya asli disebut…',
      options: ['Akulturasi kebudayaan', 'Asimilasi mutlak', 'Segregasi sosial', 'Ajudikasi norma'],
      answer: 0,
      why: { 0: 'Akulturasi memadukan kebudayaan berbeda dengan tetap mempertahankan unsur lama.' }
    },
    {
      prompt: 'Menurut tipologi Max Weber, tindakan sosial yang berorientasi pada pencapaian target secara logis dan terukur disebut…',
      options: ['Rasionalitas instrumental', 'Tindakan afektif emosional', 'Tindakan tradisionalis', 'Rasionalitas nilai'],
      answer: 0,
      why: { 0: 'Tindakan instrumental menimbang sarana dan tujuan secara rasional terhitung.' }
    },
    {
      prompt: 'Sistem pelapisan sosial tertutup yang tidak memungkinkan mobilitas vertikal antarstrata dapat dijumpai pada…',
      options: ['Sistem kasta tradisional', 'Masyarakat meritokratis modern', 'Struktur kelas industri', 'Komunitas birokrasi'],
      answer: 0,
      why: { 0: 'Sistem kasta menentukan status berdasarkan garis keturunan biologis tertutup.' }
    },
    {
      prompt: 'Fungsi primer sosialisasi pertama dan penanaman afeksi bagi seorang individu diemban oleh institusi…',
      options: ['Lembaga keluarga', 'Lembaga peradilan', 'Lembaga perbankan', 'Lembaga legislatif'],
      answer: 0,
      why: { 0: 'Keluarga merupakan wahana sosialisasi primer yang meletakkan fondasi kepribadian anak.' }
    },
    {
      prompt: 'Perilaku warga yang menyimpang dari kaidah kepatutan serta dilakukan bersama-sama oleh suatu kelompok digolongkan sebagai…',
      options: ['Penyimpangan kolektif', 'Penyimpangan individual', 'Penyimpangan situasional primer', 'Konformitas absolut'],
      answer: 0,
      why: { 0: 'Penyimpangan kelompok dilakukan secara kolektif dengan subkultur menyimpang bersama.' }
    },
    {
      prompt: 'Proses peleburan dua kebudayaan atau lebih yang menghasilkan kebudayaan baru dengan memudarnya ciri khas budaya asal disebut…',
      options: ['Asimilasi budaya', 'Akulturasi adaptif', 'Enkulturasi dini', 'Difusi unsur seni'],
      answer: 0,
      why: { 0: 'Asimilasi melenyapkan sekat perbedaan budaya asli menuju pembentukan identitas kultural seragam baru.' }
    },
    {
      prompt: 'Penyelesaian konflik sosial dengan melibatkan pihak ketiga netral yang hanya bertindak sebagai fasilitator tanpa hak memutus dinamakan…',
      options: ['Mediasi musyawarah', 'Arbitrase putusan mengikat', 'Ajudikasi meja hijau peradilan', 'Koersi tekanan fisik'],
      answer: 0,
      why: { 0: 'Mediator mendampingi proses dialog pihak bersengketa tanpa menetapkan vonis putusan hukum.' }
    },
    {
      prompt: 'Perbedaan kedudukan sosial individu dalam masyarakat yang bersifat hierarkis dan bertingkat (berlapis) diistilahkan sebagai…',
      options: ['Stratifikasi sosial', 'Diferensiasi sosial horizontal', 'Konsolidasi kelompok', 'Interseksi silang etnis'],
      answer: 0,
      why: { 0: 'Stratifikasi mengurutkan lapisan masyarakat secara vertikal berdasarkan kriteria kekayaan, kuasa, atau gelar.' }
    },
    {
      prompt: 'Norma sosial yang memiliki daya pengikat paling kuat dan disertai sanksi adat resmi turun-temurun dinamakan…',
      options: ['Custom (adat istiadat)', 'Usage (tata cara)', 'Folkways (kebiasaan)', 'Mores (tata kelakuan)'],
      answer: 0,
      why: { 0: 'Custom memiliki sanksi adat ketat yang ditegakkan secara turun-temurun oleh masyarakat pemangku adat.' }
    },
    {
      prompt: 'Kelompok sosial primer yang ditandai oleh pergaulan akrab, intim, dan kerja sama tatap muka mendalam (menurut Charles H. Cooley) adalah…',
      options: ['Keluarga inti dan sahabat dekat', 'Asosiasi serikat buruh industri', 'Perusahaan korporasi multinasional', 'Partai politik elektoral'],
      answer: 0,
      why: { 0: 'Primary group memiliki ikatan emosional hangat dan interaksi intim yang mendalam antaranggota.' }
    },
    {
      prompt: 'Sikap mengagungkan kebudayaan kelompok sendiri secara berlebihan serta memandang rendah budaya masyarakat lain disebut…',
      options: ['Etnosentrisme', 'Relativisme budaya inklusif', 'Pluralisme sosial', 'Multikulturalisme luas'],
      answer: 0,
      why: { 0: 'Etnosentrisme menilai kebiasaan etnis luar hanya berpatokan pada standar subyektif etnis pribadi.' }
    },
    {
      prompt: 'Perpindahan status sosial seorang individu dari posisi rendah ke kedudukan sosial yang lebih terhormat dinamakan…',
      options: ['Mobilitas sosial vertikal naik (social climbing)', 'Mobilitas sosial horizontal stabil', 'Mobilitas sosial vertikal turun', 'Mobilitas antargenerasi negatif'],
      answer: 0,
      why: { 0: 'Social climbing mencerminkan peningkatan derajat kelas profesi atau reputasi seseorang di struktur masyarakat.' }
    },
    {
      prompt: 'Teori sosiologi yang memandang masyarakat bagaikan suatu organisme biologis dengan organ-organ fungsional yang saling melengkapi adalah…',
      options: ['Teori Fungsionalisme Struktural', 'Teori Konflik Dialektis', 'Teori Interaksionisme Simbolik', 'Teori Pilihan Rasional'],
      answer: 0,
      why: { 0: 'Fungsionalisme menekankan integrasi, harmoni, dan stabilitas pranata sosial.' }
    },
    {
      prompt: 'Kondisi di mana tatanan norma masyarakat mengalami kekaburan atau kehancuran pegangan moral akibat perubahan sosial cepat dinamakan…',
      options: ['Anomi (normlessness)', 'Alienasi psikologis', 'Hedonisme konsumtif', 'Stagnasi budaya adat'],
      answer: 0,
      why: { 0: 'Istilah anomie diperkenalkan oleh Emile Durkheim untuk menggambarkan situasi tanpa panduan norma penuntun hidup.' }
    },
    {
      prompt: 'Lembaga sosial tertua yang bertanggung jawab memberikan legitimasi pengesahan perkawinan dan transmisi garis keturunan adalah…',
      options: ['Lembaga perkawinan keluarga', 'Lembaga perniagaan pasar', 'Lembaga kepolisian sipil', 'Lembaga federasi serikat'],
      answer: 0,
      why: { 0: 'Pranata perkawinan melegalkan hubungan ikatan biologis pria-wanita dan keberlanjutan regenerasi sosial.' }
    }
  ],
  SEJ: [
    {
      prompt: 'Kedatuan Sriwijaya yang berkembang di Sumatra termasyhur sebagai kekuatan maritim dan sentra studi keagamaan pada kurun abad ke…',
      options: ['7 hingga 13 Masehi', '2 hingga 4 Masehi', '15 hingga 17 Masehi', '19 hingga 20 Masehi'],
      answer: 0,
      why: { 0: 'Sriwijaya menguasai jalur Selat Malaka sejak abad ke-7 hingga surut sekitar abad ke-13.' }
    },
    {
      prompt: 'Dwi-Tunggal yang membacakan naskah Proklamasi Kemerdekaan Indonesia pada 17 Agustus 1945 adalah…',
      options: ['Ir. Soekarno dan Drs. Mohammad Hatta', 'Sutan Sjahrir dan Amir Sjarifuddin', 'Ki Hajar Dewantara dan Raden Saleh', 'Tan Malaka dan Chaerul Saleh'],
      answer: 0,
      why: { 0: 'Bung Karno dan Bung Hatta memproklamasikan kemerdekaan atas nama bangsa Indonesia.' }
    },
    {
      prompt: 'Konsekuensi diplomatik Perjanjian Renville (1948) yang merugikan kedaulatan wilayah Republik Indonesia adalah…',
      options: ['Pemberlakuan garis Van Mook yang memangkas wilayah kekuasaan RI', 'Penghapusan seluruh pasukan tentara nasional', 'Kewajiban melunasi biaya perang pihak sekutu', 'Pemberian kemerdekaan langsung tanpa syarat'],
      answer: 0,
      why: { 0: 'Garis demarkasi Van Mook mengisolasi wilayah RI menjadi kantong sempit di Jawa dan Sumatra.' }
    },
    {
      prompt: 'Peristiwa bersejarah penjemputan tokoh bangsa ke Rengasdengklok oleh kelompok pemuda berlangsung pada tanggal…',
      options: ['16 Agustus 1945', '17 Agustus 1945', '18 Agustus 1945', '15 Agustus 1945'],
      answer: 0,
      why: { 0: 'Tanggal 16 Agustus 1945 dini hari pemuda mengamankan Dwitunggal guna menjauhkan pengaruh luar.' }
    },
    {
      prompt: 'Kebijakan tanam paksa (cultuurstelsel) di Hindia Belanda pada masa kolonial diprakarsai oleh…',
      options: ['Johannes van den Bosch', 'Herman Willem Daendels', 'Thomas Stamford Raffles', 'Jan Pieterszoon Coen'],
      answer: 0,
      why: { 0: 'Gubernur Jenderal Van den Bosch memberlakukan tanam paksa pada tahun 1830.' }
    },
    {
      prompt: 'Tahapan awal dalam metode penelitian sejarah yang berupa kegiatan menghimpun dan menelusuri jejak sumber sejarah disebut…',
      options: ['Heuristik', 'Verifikasi kritik sumber', 'Interpretasi penafsiran', 'Historiografi penulisan'],
      answer: 0,
      why: { 0: 'Heuristik adalah langkah melacak arsip, dokumen, artefak, dan saksi sejarah di perpustakaan atau lapangan.' }
    },
    {
      prompt: 'Sumpah Pemuda yang mengikrarkan satu tanah air, satu bangsa, dan satu bahasa persatuan diikrarkan pada tanggal…',
      options: ['28 Oktober 1928', '20 Mei 1908', '17 Agustus 1945', '10 November 1945'],
      answer: 0,
      why: { 0: 'Kongres Pemuda II di Batavia melahirkan konsensus kebangsaan persatuan pemuda Nusantara.' }
    },
    {
      prompt: 'Pemerintahan Republik Indonesia pernah memindahkan ibu kota negara dari Jakarta ke Yogyakarta pada era revolusi tahun…',
      options: ['1946', '1948', '1950', '1945'],
      answer: 0,
      why: { 0: 'Pada 4 Januari 1946, ibu kota RI hijrah ke Yogyakarta demi keselamatan kepemimpinan nasional dari agresi NICA.' }
    },
    {
      prompt: 'Peristiwa pertempuran heroik di Surabaya melawan tentara sekutu yang kemudian diperingati sebagai Hari Pahlawan berlangsung tanggal…',
      options: ['10 November 1945', '1 Maret 1949', '5 Oktober 1945', '19 Desember 1948'],
      answer: 0,
      why: { 0: 'Arek-arek Surabaya dipimpin Bung Tomo mempertahankan kedaulatan kota dari gempuran ultimatum pasukan Inggris.' }
    },
    {
      prompt: 'Konferensi Asia Afrika (KAA) yang melahirkan Dasasila Bandung diselenggarakan di Gedung Merdeka Bandung pada tahun…',
      options: ['1955', '1950', '1961', '1949'],
      answer: 0,
      why: { 0: 'KAA berlangsung 18-24 April 1955 dihadiri 29 negara kawasan memelopori Gerakan Non-Blok dunia.' }
    },
    {
      prompt: 'Kerajaan bercorak Islam pertama di kepulauan Nusantara yang berada di pesisir utara Aceh adalah Kesultanan…',
      options: ['Samudera Pasai', 'Demak Bintoro', 'Banten Girang', 'Malaka Pesisir'],
      answer: 0,
      why: { 0: 'Samudera Pasai berkembang pesat sejak abad ke-13 Masehi dengan raja pertamanya Sultan Malik al-Saleh.' }
    },
    {
      prompt: 'Sumpah Palapa yang bertekad menyatukan wilayah Nusantara di bawah panji Majapahit diucapkan oleh Mahapatih…',
      options: ['Gajah Mada', 'Kebo Iwa', 'Arya Damar', 'Ranggalawe'],
      answer: 0,
      why: { 0: 'Patih Gajah Mada mengucapkan Sumpah Palapa saat dilantik menjadi Amangkubhumi Majapahit pada 1336 M.' }
    },
    {
      prompt: 'Pemilihan Umum (Pemilu) demokratis pertama berskala nasional di Indonesia berhasil diselenggarakan pada masa kabinet…',
      options: ['Kabinet Burhanuddin Harahap (1955)', 'Kabinet Wilopo', 'Kabinet Natsir', 'Kabinet Ali Sastroamidjojo I'],
      answer: 0,
      why: { 0: 'Pemilu 1955 memilih anggota DPR dan Konstituante berlangsung tertib di bawah kepemimpinan Perdana Menteri Burhanuddin.' }
    },
    {
      prompt: 'Dokumen historis naskah Proklamasi Kemerdekaan Indonesia diketik rapi dengan mesin tik oleh tokoh pemuda bernama…',
      options: ['Sayuti Melik', 'Sukarni Kartodiwirjo', 'B.M. Diah', 'Wikana pejuang'],
      answer: 0,
      why: { 0: 'Sayuti Melik mengetik naskah proklamasi setelah konsep tulisan tangan Bung Karno disepakati bersama.' }
    },
    {
      prompt: 'Dekrit Presiden 5 Juli 1959 dikeluarkan oleh Presiden Soekarno untuk mengatasi kemacetan politik dengan keputusan utama…',
      options: ['Memberlakukan kembali UUD 1945 dan membubarkan Konstituante', 'Membubarkan Kabinet Dwikora', 'Membentuk Front Nasional sepihak', 'Menetapkan manifesto politik baru'],
      answer: 0,
      why: { 0: 'Dekrit 5 Juli mengembalikan konstitusi UUD 1945 menggantikan UUDS 1950 untuk menstabilkan tatanan kenegaraan.' }
    }
  ],
  PJK: [
    {
      prompt: 'Pukulan mula sebagai tanda dimulainya reli permainan bola voli disebut teknik…',
      options: ['Servis (service) garis batas', 'Smes menukik tajam', 'Membendung (blocking)', 'Umpan lambung (set-up)'],
      answer: 0,
      why: { 0: 'Servis dilakukan dari petak belakang garis lapangan untuk membuka rangkaian reli permainan.' }
    },
    {
      prompt: 'Metode pembinaan fisik yang paling efektif guna mengoptimalkan kapasitas aerobik jantung-paru adalah…',
      options: ['Lari kontinu berjarak menengah (jogging)', 'Aktivitas beban berkali-kali tanpa jeda', 'Gerakan kelenturan statis tunggal', 'Gerak ketangkasan reaksi jari'],
      answer: 0,
      why: { 0: 'Aktivitas lari aerobik berdurasi melatih efisiensi serapan oksigen dan daya tahan kardiorespirasi.' }
    },
    {
      prompt: 'Benda berbentuk silinder yang diestafetkan antaranggota pelari beregu dinamakan…',
      options: ['Tongkat estafet (baton)', 'Peluru tolak lempar', 'Cakram putar', 'Lembing serat'],
      answer: 0,
      why: { 0: 'Tongkat baton berpindah tangan di zona pergantian antaranggota tim lari bersambung.' }
    },
    {
      prompt: 'Aktivitas pengondisian pemanasan (warm-up) sebelum berolahraga esensial untuk…',
      options: ['Menaikkan suhu jaringan otot dan meminimalkan cedera', 'Menurunkan curah peredaran darah', 'Membuat persendian kaku', 'Menghabiskan tenaga secara instan'],
      answer: 0,
      why: { 0: 'Pemanasan mempersiapkan elastisitas serat otot dan viskositas sendi menghadapi beban gerak.' }
    },
    {
      prompt: 'Penerapan pola hidup aktif dan bugar mencakup keselarasan antara…',
      options: ['Gerak jasmani teratur, asupan nutrisi proporsional, serta istirahat pemulihan', 'Olahraga intensitas berat tanpa kecukupan rehidrasi', 'Pola makan instan disertai minim gerak fisik', 'Waktu tidur seharian tanpa aktivitas tubuh'],
      answer: 0,
      why: { 0: 'Kebugaran holistik bertumpu pada sinergi aktivitas kinetik, gizi seimbang, dan istirahat cukup.' }
    },
    {
      prompt: 'Teknik dasar menggiring bola dalam permainan bola basket dengan memantul-mantulkan bola ke lantai diistilahkan sebagai…',
      options: ['Dribbling', 'Chest pass dada', 'Pivot tumpuan', 'Lay-up shoot'],
      answer: 0,
      why: { 0: 'Dribbling memantulkan bola secara berkesinambungan dengan satu tangan sambil bergerak melangkah.' }
    },
    {
      prompt: 'Bentuk penanganan pertolongan pertama pada cedera pergelangan terkilir (sprain) menggunakan metode RICE, huruf "I" melambangkan…',
      options: ['Ice (kompres es batu dingin)', 'Incline (menaikkan beban)', 'Intensity (menaikkan laju gerak)', 'Inaction (membiarkan cedera)'],
      answer: 0,
      why: { 0: 'RICE singkatan dari Rest, Ice, Compression, Elevation guna meredakan inflamasi pembengkakan jaringan.' }
    },
    {
      prompt: 'Induk organisasi cabang olahraga sepak bola di wilayah Negara Kesatuan Republik Indonesia adalah…',
      options: ['PSSI', 'PBVSI', 'Perbasi', 'PASI'],
      answer: 0,
      why: { 0: 'Persatuan Sepakbola Seluruh Indonesia (PSSI) didirikan di Yogyakarta pada 19 April 1930.' }
    },
    {
      prompt: 'Nomor lari jarak pendek (sprint) dalam cabang olahraga atletik menggunakan jenis awalan berupa start…',
      options: ['Start jongkok (crouch start)', 'Start berdiri tegak', 'Start melayang sambung', 'Start duduk rileks'],
      answer: 0,
      why: { 0: 'Start jongkok memanfaatkan balok tumpuan (starting block) untuk menghasilkan tolakan akselerasi maksimal.' }
    },
    {
      prompt: 'Gaya renang yang gerakannya meniru kayuhan kaki katak membuka-menutup dengan lengan mendorong air secara bersamaan adalah…',
      options: ['Gaya dada (breaststroke)', 'Gaya punggung terbalik', 'Gaya kupu-kupu lumba', 'Gaya bebas cepat'],
      answer: 0,
      why: { 0: 'Gaya dada mengandalkan dorongan serempak kedua kaki menendang melingkar menyerupai renang katak.' }
    },
    {
      prompt: 'Aktivitas push-up secara bertahap dan teratur bermanfaat utama untuk melatih kekuatan serta daya tahan otot…',
      options: ['Dada, bahu, dan trisep lengan', 'Betis dan jari kaki', 'Pinggang bawah semata', 'Leher bagian belakang'],
      answer: 0,
      why: { 0: 'Push-up membebani otot pektoralis mayor dada, deltoid anterior, serta trisep secara efektif.' }
    },
    {
      prompt: 'Ukuran tinggi net putra pada pertandingan resmi bola voli internasional yang ditetapkan oleh FIVB adalah…',
      options: ['2.43 meter', '2.24 meter', '2.15 meter', '2.50 meter'],
      answer: 0,
      why: { 0: 'Tinggi net voli putra adalah 2.43 meter, sedangkan net voli putri adalah 2.24 meter.' }
    },
    {
      prompt: 'Gerakan melangkahkan kaki dan mengoper bola kepada kawan seregu dalam sepak bola menggunakan punggung kaki dinamakan teknik…',
      options: ['Passing (umpan operan)', 'Heading sundulan kepala', 'Throw-in lemparan dalam', 'Tackling sapuan bola'],
      answer: 0,
      why: { 0: 'Passing akurat menjadi fondasi utama penguasaan bola dan taktik kerja sama tim di lapangan.' }
    },
    {
      prompt: 'Kemampuan sendi dan otot tubuh untuk bergerak menempuh ruang gerak sendi seluas-luasnya tanpa menimbulkan cedera disebut…',
      options: ['Kelenturan (fleksibilitas)', 'Kelincahan (agility)', 'Kecepatan sprint', 'Kekuatan dorong maksimal'],
      answer: 0,
      why: { 0: 'Fleksibilitas memungkinkan pergerakan sendi elastis optimal mengurangi risiko kekakuan otot.' }
    },
    {
      prompt: 'Zat adiktif stimulan yang terkandung di dalam daun tembakau rokok serta memicu ketergantungan adalah…',
      options: ['Nikotin', 'Kafein murni', 'Metanol pelarut', 'Glukosa buatan'],
      answer: 0,
      why: { 0: 'Nikotin merangsang pelepasan dopamin di otak yang menimbulkan adiksi fisik serta merusak pembuluh darah.' }
    }
  ],
  SNB: [
    {
      prompt: 'Kualitas rabaan pada permukaan suatu karya seni (kasar, halus, berbutir) diistilahkan sebagai…',
      options: ['Tekstur permukaan', 'Gradasi warna', 'Perspektif ruang', 'Proporsi anatomi'],
      answer: 0,
      why: { 0: 'Tekstur mendeskripsikan sifat permukaan suatu wujud benda yang dapat diindra visual atau taktil.' }
    },
    {
      prompt: 'Koreografi Tari Saman yang mengutamakan keselarasan gerak tepuk dan dada berakar dari tradisi…',
      options: ['Masyarakat Gayo, Aceh', 'Sunda, Jawa Barat', 'Minahasa, Sulawesi Utara', 'Dayak Kenyah, Kalimantan'],
      answer: 0,
      why: { 0: 'Tari Saman diciptakan oleh Syekh Saman dan dilestarikan oleh masyarakat Gayo, Aceh.' }
    },
    {
      prompt: 'Instrumen ensambel tradisional Nusantara yang didominasi bilahan dan pencon perunggu berpukul adalah…',
      options: ['Ansambel Gamelan', 'Instrumen Angklung', 'Petikan Sasando', 'Tiupan Saluang'],
      answer: 0,
      why: { 0: 'Gamelan menghimpun saron, bonang, kendang, dan gong bermaterial logam perunggu/besi.' }
    },
    {
      prompt: 'Metode pembentukan benda keramik menggunakan bantuan meja putar berputar disebut teknik…',
      options: ['Teknik putar (throwing method)', 'Teknik pilin melingkar (coiling)', 'Teknik lempengan datar (slab)', 'Teknik cetak tuang beku'],
      answer: 0,
      why: { 0: 'Meja putar memungkinkan pembentukan lempung secara sentris simetris menjadi wadah guci/vas.' }
    },
    {
      prompt: 'Wujud karya seni rupa tiga dimensi yang memiliki dimensi panjang, lebar, dan volume kedalaman adalah…',
      options: ['Karya seni patung dan instalasi', 'Lukisan kanvas cat minyak', 'Karya etsa grafis cetak datar', 'Sketsa pena dua dimensi'],
      answer: 0,
      why: { 0: 'Patung menempati ruang nyata tiga dimensi dan dapat dinikmati dari berbagai sudut pandang.' }
    },
    {
      prompt: 'Tiga warna pokok (primer) yang tidak dapat dihasilkan dari percampuran corak warna lain adalah…',
      options: ['Merah, kuning, dan biru', 'Hijau, oranye, dan ungu', 'Cokelat, abu-abu, dan hitam', 'Putih, nila, dan jingga'],
      answer: 0,
      why: { 0: 'Merah, kuning, dan biru merupakan warna dasar yang memadukan seluruh spektrum warna sekunder.' }
    },
    {
      prompt: 'Alat musik gesek tradisional berdawai dua dari wilayah etnis Jawa dan Sunda dinamakan…',
      options: ['Rebab gesek', 'Kecapi petik', 'Gambus senar', 'Siter bambu'],
      answer: 0,
      why: { 0: 'Rebab dimainkan dengan busur gesek penjalin benang mengiringi gending orkestrasi gamelan.' }
    },
    {
      prompt: 'Karya seni batik yang proses pewarnaannya memanfaatkan perintang lilin malam panas dinamakan karya seni…',
      options: ['Kriya tekstil batik lilin', 'Seni grafis sablon cetak', 'Anyaman rotan alami', 'Lukisan akrilik palet'],
      answer: 0,
      why: { 0: 'Batik tradisional Nusantara memanfaatkan canting dan cairan malam sebagai perintang serapan warna kain.' }
    },
    {
      prompt: 'Prinsip penataan seni rupa yang memberikan kesan kesatuan utuh dan harmonis antarunsur visual disebut prinsip…',
      options: ['Kesatuan (unity)', 'Kontras tajam', 'Irama berulang', 'Keseimbangan asimetris'],
      answer: 0,
      why: { 0: 'Unity memadukan garis, warna, dan komposisi agar tidak berdiri sendiri melainkan padu harmonis.' }
    },
    {
      prompt: 'Alat musik tiup tradisional khas Minangkabau yang terbuat dari ruas bambu tipis dinamakan…',
      options: ['Saluang', 'Kolintang kayu', 'Sasando pulau', 'Tifa tabung'],
      answer: 0,
      why: { 0: 'Saluang ditiup secara diagonal dengan teknik pernapasan melingkar terus-menerus.' }
    },
    {
      prompt: 'Teknik melukis dengan sapuan kuas encer dan transparan pada media kertas menggunakan cat air dinamakan teknik…',
      options: ['Akuarel', 'Plakat tebal pekat', 'Pointilis totol titik', 'Kolase tempelan bahan'],
      answer: 0,
      why: { 0: 'Akuarel memanfaatkan pigmen cat air dengan sapuan transparan tembus pandang.' }
    },
    {
      prompt: 'Lagu daerah "Gundhul-Gundhul Pacul" yang sarat pitutur kepemimpinan berasal dari tradisi masyarakat…',
      options: ['Jawa Tengah', 'Sumatera Barat', 'Kalimantan Selatan', 'Nusa Tenggara Timur'],
      answer: 0,
      why: { 0: 'Gundhul Pacul diciptakan oleh Sunan Kalijaga sebagai nasihat moral bagi para pemimpin bangsa.' }
    },
    {
      prompt: 'Karya seni rupa yang dibuat dengan menempelkan potongan-potongan kertas, kain, atau kaca berpola di atas bidang datar dinamakan…',
      options: ['Mosaik dan kolase', 'Sketsa karikatur', 'Pahat relief monumen', 'Cetakan etsa logam'],
      answer: 0,
      why: { 0: 'Mosaik merekatkan kepingan bahan keras beraneka rupa membentuk citra figuratif atau abstrak.' }
    },
    {
      prompt: 'Tangga nada tradisional Nusantara yang hanya tersusun atas lima nada pokok dinamakan tangga nada…',
      options: ['Pentatonis (slendro dan pelog)', 'Diatonis mayor ceria', 'Kromatis полуton', 'Diatonis minor sendu'],
      answer: 0,
      why: { 0: 'Sistem pentatonis melandasi laras gamelan Jawa, Bali, Sunda, serta orkestrasi tradisi Asia.' }
    },
    {
      prompt: 'Fungsi karya seni rupa terapan (applied art) yang membedakannya dari seni murni (fine art) adalah…',
      options: ['Mengutamakan fungsi praktis kegunaan dalam kehidupan sehari-hari', 'Hanya dinikmati keindahan estetisnya semata', 'Dibuat tanpa pertimbangan bahan material', 'Dipamerkan di galeri tertutup semata'],
      answer: 0,
      why: { 0: 'Seni terapan memadukan keindahan bentuk estetis dengan fungsi guna praktis pakai bagi pengguna.' }
    }
  ]
  };

  function getMapelQuestionsForCompetency(subjectId, compCode) {
    var pool = mapelPool(subjectId, compCode);
    if (pool && pool.items && pool.items.length) {
      return { items: pool.items, exact: pool.exact, isBank: true };
    }
    var list = (MAPEL_TEMPLATES[subjectId] && MAPEL_TEMPLATES[subjectId].length) ? MAPEL_TEMPLATES[subjectId] : (MAPEL_TEMPLATES.MAT || []);
    return { items: list, exact: false, isBank: false };
  }

  function synthesizeMapelQuestions(subjectId, compCode, compTitle, count) {
    var num = Math.max(2, Math.min(20, Number(count) || 5));
    var mName = mapelName(subjectId) || subjectId;
    var topic = compTitle || (t('guru.materi', 'Materi') + ' ' + mName);
    var items = [];
    /* Bank Fase D kalau ada; kalau tidak, kolam literal template kurikulum bawaan */
    var qData = getMapelQuestionsForCompetency(subjectId, compCode);
    var baseList = qData.items;
    if (!baseList.length) return items;
    /* Kolam kompetensi dipotong jujur ketika permintaan melampaui isinya */
    var take = qData.exact ? Math.min(num, baseList.length) : num;
    /* Rotasi hanya pada kolam kompetensi */
    var start = qData.exact ? Math.floor(Date.now() / 1000) % baseList.length : 0;
    for (var i = 0; i < take; i++) {
      var src = baseList[(start + i) % baseList.length];
      var itemObj = {
        id: 'q-' + subjectId.toLowerCase() + '-' + (i + 1) + '-' + Math.random().toString(36).slice(2, 6),
        prompt: src.prompt,
        options: src.options.slice(),
        answer: src.answer,
        skill: (compCode || subjectId || 'mat').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 32),
        context: topic,
        why: Object.assign({}, src.why)
      };
      if (src.distractorWhy) itemObj.distractorWhy = Object.assign({}, src.distractorWhy);
      /* Acak posisi opsi jawaban agar kunci tidak selalu di index 0 */
      var shuffled = shuffleOptions(itemObj, (Date.now() % 997) + i * 31 + subjectId.charCodeAt(0));
      itemObj.options = shuffled.options;
      itemObj.answer = shuffled.answer;
      itemObj.why = shuffled.why;
      if (shuffled.distractorWhy) itemObj.distractorWhy = shuffled.distractorWhy;
      items.push(itemObj);
    }
    return items;
  }

  function kelaskuBase() {
    try {
      var c = root.FIEZEL_CF_CONFIG || {};
      if (c.enabled === false) return '';
      return String(c.base || '').trim().replace(/\/$/, '');
    } catch (_) { return ''; }
  }

  function apiWorker(path, opts) {
    opts = opts || {};
    var base = kelaskuBase();
    if (!base) return Promise.reject(new Error(t('guru.err-koneksi-worker', 'Koneksi Worker belum siap.')));
    var m = opts.method || (opts.body ? 'POST' : 'GET');
    var headers = { 'Accept': 'application/json' };
    if (opts.body && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    return fetch(base + path, {
      method: m,
      credentials: 'include',
      headers: headers,
      body: opts.body ? (opts.body instanceof FormData ? opts.body : JSON.stringify(opts.body)) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) {
          var msg = (data && (data.error || data.message)) || ('Gagal (' + r.status + ')');
          var err = new Error(msg);
          err.status = r.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }


  function isFzEngineValid(eng) {
    return !!(
      eng &&
      typeof eng === 'object' &&
      eng.curriculum &&
      typeof eng.curriculum.tree === 'function' &&
      eng.seed &&
      typeof eng.seed.mapel === 'function' &&
      typeof eng.seed.mapelStatus === 'function'
    );
  }

  function ensureFzEngine() {
    if (isFzEngineValid(root.FZEngine)) return Promise.resolve(root.FZEngine);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      var ver = root.FIEZEL_PAGE_BUILD || ('v' + Date.now());
      s.src = './features/curriculum/fz-api.js?v=' + encodeURIComponent(ver);
      s.onload = function () {
        if (isFzEngineValid(root.FZEngine)) {
          resolve(root.FZEngine);
        } else {
          reject(new Error(t('guru.err-fz-api-stale', 'Modul kurikulum di peramban belum mutakhir. Silakan muat ulang halaman.')));
        }
      };
      s.onerror = function () {
        reject(new Error(t('guru.err-muat-fz-api', 'Gagal memuat modul mesin kurikulum.')));
      };
      document.head.appendChild(s);
    });
  }

  function loadCurriculumTree(subjectId) {
    ui.curriculumLoading = true;
    ui.curriculumError = null;
    render();
    ensureFzEngine().then(function (FZE) {
      if (!isFzEngineValid(FZE)) {
        throw new Error(t('guru.err-fz-api-stale', 'Modul kurikulum di peramban belum mutakhir. Silakan muat ulang halaman.'));
      }
      var sId = subjectId || ui.curriculumSubject || 'MAT';
      var p = FZE.token() ? Promise.resolve() : FZE.login.kelasku().catch(function () {});
      return p.then(function () {
        return Promise.all([
          FZE.curriculum.tree(sId),
          FZE.seed.mapelStatus().catch(function () { return null; })
        ]);
      });
    }).then(function (results) {
      ui.curriculumTree = results[0] || [];
      ui.curriculumSeeded = results[1];
      ui.curriculumLoading = false;
      render();
    }).catch(function (err) {
      ui.curriculumLoading = false;
      ui.curriculumError = (err && err.message) || t('guru.err-muat-kurikulum', 'Gagal memuat kurikulum');
      render();
    });
  }

  function runSeedMapel() {
    ui.seeding = true;
    render();
    ensureFzEngine().then(function (FZE) {
      if (!isFzEngineValid(FZE)) {
        throw new Error(t('guru.err-fz-api-stale', 'Modul kurikulum di peramban belum mutakhir. Silakan muat ulang halaman.'));
      }
      var p = FZE.token() ? Promise.resolve() : FZE.login.kelasku();
      return p.then(function () {
        return FZE.seed.mapel();
      });
    }).then(function (res) {
      ui.seeding = false;
      toast(t('guru.semai-mapel-sukses', 'Berhasil menyemai 17 mata pelajaran ke MongoDB!'));
      loadCurriculumTree(ui.curriculumSubject);
    }).catch(function (err) {
      ui.seeding = false;
      toast(t('guru.err-seeding', 'Gagal seeding: ') + ((err && err.message) || err));
      render();
    });
  }

  function runSeedEnglish() {
    ui.seeding = true;
    render();
    ensureFzEngine().then(function (FZE) {
      if (!isFzEngineValid(FZE)) {
        throw new Error(t('guru.err-fz-api-stale', 'Modul kurikulum di peramban belum mutakhir. Silakan muat ulang halaman.'));
      }
      var p = FZE.token() ? Promise.resolve() : FZE.login.kelasku();
      return p.then(function () {
        return FZE.seed.english();
      });
    }).then(function (res) {
      ui.seeding = false;
      toast(t('guru.semai-english-sukses', 'Berhasil menyemai Bahasa Inggris ke MongoDB!'));
      loadCurriculumTree(ui.curriculumSubject);
    }).catch(function (err) {
      ui.seeding = false;
      toast(t('guru.err-seeding', 'Gagal seeding: ') + ((err && err.message) || err));
      render();
    });
  }

  function runSeedSoal() {
    ui.seeding = true;
    render();
    ensureFzEngine().then(function (FZE) {
      if (!isFzEngineValid(FZE)) {
        throw new Error(t('guru.err-fz-api-stale', 'Modul kurikulum di peramban belum mutakhir. Silakan muat ulang halaman.'));
      }
      var p = FZE.token() ? Promise.resolve() : FZE.login.kelasku();
      return p.then(function () {
        return FZE.seed.soal();
      });
    }).then(function (res) {
      ui.seeding = false;
      toast(t('guru.semai-soal-sukses', 'Berhasil menyemai Bank Soal ke MongoDB!'));
      loadCurriculumTree(ui.curriculumSubject);
    }).catch(function (err) {
      ui.seeding = false;
      toast(t('guru.err-seeding', 'Gagal seeding: ') + ((err && err.message) || err));
      render();
    });
  }


  /*
   * DEMO GURU — DINYALAKAN ?teacher=preview, DI HOST MANA PUN TERMASUK PRODUKSI.
   *
   * Sebelumnya baris pertama fungsi ini menolak `fiezel.my.id` mentah-mentah, karena
   * pratinjau lahir sebagai alat pengembangan. Lalu landing page memasang tombol
   * "Buka Demo Guru" yang menunjuk ke sini — dan tombol itu tidak melakukan apa-apa:
   * pengunjung yang ingin melihat papan guru justru mendarat di perkenalan murid.
   * Calon pengguna yang datang untuk melihat produknya malah disuruh mendaftar dulu.
   *
   * Yang dibuka demo ini HANYA cangkang antarmuka. Tiga batas menjaganya, dan
   * ketiganya ditegakkan di tempat lain, bukan oleh sopan santun:
   *   1. `fiezel-teacher-store.js` mengalihkan seluruh baca/tulis ke sessionStorage
   *      berkunci sendiri — data guru sungguhan tidak tersentuh, dan demo lenyap
   *      saat tab ditutup;
   *   2. `syncAvailable()` di store itu menuntut peran akun 'teacher' yang sah, jadi
   *      demo tidak pernah menyentuh satu pun rute server;
   *   3. penanda `fz_teacher_mode` di localStorage TIDAK pernah ditulis, jadi mode ini
   *      tidak bertahan melewati sesi dan tidak menaikkan peran siapa pun.
   *
   * Guru yang benar-benar sudah masuk tidak boleh terseret ke sini: kalau akunnya
   * berperan guru, demo dimatikan supaya papan aslinya yang tampil.
   */
  function previewAllowed() {
    try {
      if (isTeacherRole()) return false;
      if (new URL(location.href).searchParams.get('teacher') === 'preview') sessionStorage.setItem('fz-teacher-preview', '1');
      return sessionStorage.getItem('fz-teacher-preview') === '1';
    } catch (_) { return false; }
  }
  /** Keluar dari demo: penandanya dibuang, lalu halaman kembali ke sisi murid. */
  function exitPreview() {
    try { sessionStorage.removeItem('fz-teacher-preview'); } catch (_) {}
    try { sessionStorage.removeItem('fiezel-teacher-v1-preview'); } catch (_) {}
    try {
      if (typeof location !== 'undefined' && typeof history !== 'undefined' && history.replaceState) {
        var u = new URL(location.href);
        if (u.searchParams.has('teacher')) {
          u.searchParams.delete('teacher');
          var clean = u.pathname + (u.search ? u.search : '') + (u.hash ? u.hash : '');
          history.replaceState(null, (typeof document !== 'undefined' && document.title) || '', clean);
        }
      }
    } catch (_) {}
    try { S().setPreview(false); } catch (_) {}
  }

  // ---- sinkron server ---------------------------------------------------------------------
  function pageHidden() { try { return root.document && root.document.visibilityState === 'hidden'; } catch (_) { return false; } }
  /*
   * KENAPA KEPUTUSAN TIAP DETAK DIPISAH JADI FUNGSI MURNI
   * -----------------------------------------------------
   * Versi sebelumnya menaruh keputusan itu di dalam startAutoSync, dan satu barisnya —
   * `if (S().syncAvailable() !== 'ok') return;` SEBELUM timer dipasang — mematikan seluruh
   * detak untuk sisa sesi. Itu bukan kasus langka: FiezelAccount memulihkan sesinya secara
   * asinkron, jadi pada saat Ruang Guru dipasang, peran akun sering BELUM terbaca. Guru lalu
   * melihat papan yang hanya bergerak kalau tombol Sinkron ditekan tangan — persis laporan
   * dari kelas — dan tidak ada apa pun yang menghidupkannya kembali setelah akunnya siap.
   *
   * Sekarang detaknya SELALU dipasang, dan tiap detak menanyakan rencananya ke fungsi di
   * bawah. Fungsi ini murni (tanpa DOM, tanpa jaringan, tanpa jam internal) supaya setiap
   * cabangnya bisa diuji di Node — termasuk cabang "akun belum siap", yang dulu tidak punya
   * gerbang sama sekali dan karena itu bisa rusak tanpa satu pun tes memerah.
   *
   * 'sync'  jalankan ronde jaringan sekarang.
   * 'wait'  akun/koneksi belum siap: JANGAN menyentuh jaringan, tapi detaknya tetap hidup —
   *         begitu akun guru mendarat, ronde berikutnya langsung jalan tanpa campur tangan.
   * 'skip'  ronde ini dilewati (layar tak dipandang, ronde sebelumnya masih jalan, atau
   *         rem menanjak sesudah gagal beruntun).
   * 'reset' ronde sebelumnya menggantung melewati batas wajar: lepaskan kuncinya lalu ulangi.
   *         Tanpa cabang ini, satu permintaan yang tidak pernah selesai mengunci ui.syncing
   *         selamanya dan mematikan detak dengan cara yang sama diamnya seperti bug di atas.
   * 'idle'  cangkang tidak terpasang.
   */
  /* Aturannya sendiri hidup di features/notify/fiezel-sync-plan.js — modul murni yang dipakai
     BERSAMA dengan detak murid, supaya dua papan tidak bisa lagi punya dua pengertian berbeda
     tentang kapan boleh menyentuh jaringan. Salinan di bawah hanya jaring pengaman kalau
     berkasnya belum termuat (urutan skrip berubah, cache separuh): lebih baik detak yang
     sedikit lebih sederhana daripada papan guru yang mati lagi. */
  var previewOn = false;
  var syncingSince = 0;
  function autoSyncPlan(o) {
    var P = root.FiezelSyncPlan;
    var arg = { mounted: o.mounted, syncing: o.syncing, syncingSince: o.syncingSince, hidden: o.hidden, ready: o.avail === 'ok', failStreak: o.failStreak, tickIndex: o.tickIndex, now: o.now };
    if (P && typeof P.plan === 'function') return P.plan(arg);
    if (!arg.mounted) return 'idle';
    if (arg.syncing) return (Number(arg.now) - Number(arg.syncingSince || 0)) > 45000 ? 'reset' : 'skip';
    if (arg.hidden) return 'skip';
    if (!arg.ready) return 'wait';
    return 'sync';
  }
  function startAutoSync() {
    stopAutoSync();
    syncFailStreak = 0;
    if (S().syncAvailable() === 'ok') syncAll(true);
    syncTimer = setInterval(function () {
      var plan = autoSyncPlan({
        mounted: !!el, hidden: pageHidden(), syncing: ui.syncing, avail: S().syncAvailable(),
        failStreak: syncFailStreak, tickIndex: (Date.now() / SYNC_EVERY_MS | 0),
        now: Date.now(), syncingSince: syncingSince
      });
      if (plan === 'reset') { ui.syncing = false; syncingSince = 0; }
      if (plan === 'sync' || plan === 'reset') syncAll(true);
      else if (plan === 'wait') paintSyncChip();     // guru tetap melihat status akunnya, tanpa jaringan
    }, SYNC_EVERY_MS);
    /* Detak chip: murni lokal, tanpa jaringan. Ia juga yang menyusulkan render yang tertunda
       karena guru sedang mengetik - begitu kolomnya dilepas, cat ulangnya menyusul sendiri. */
    chipTimer = setInterval(function () {
      if (!el || pageHidden()) return;
      if (pendingRender && !busy()) { render(); return; }
      paintSyncChip();
    }, CHIP_TICK_MS);
    /* Kembali terlihat = satu ronde SEGERA, tidak menunggu tick berikutnya. */
    try {
      if (!visListener) {
        visListener = function () { if (!pageHidden() && el && !ui.syncing) syncAll(true); };
        root.document.addEventListener('visibilitychange', visListener);
      }
    } catch (_) {}
  }
  function stopAutoSync() {
    if (syncTimer) clearInterval(syncTimer);
    if (chipTimer) clearInterval(chipTimer);
    syncTimer = null; chipTimer = null; pendingRender = false;
    try { if (visListener) { root.document.removeEventListener('visibilitychange', visListener); visListener = null; } } catch (_) {}
  }
  /** Sinkron semua kelas: klaim kode yang belum diklaim, tarik laporan murid, ingest. */
  function syncAll(quiet) {
    var T = S(), avail = T.syncAvailable();
    if (avail !== 'ok') {
      /* Dulu di sini hanya ada toast yang MENGULANG kalimat yang sudah tertulis di tombolnya
         sendiri ("Masuk akun guru untuk sinkron"), lalu berhenti. Tombol yang menyebut obatnya
         tetapi tidak menyediakan jalannya terbaca sebagai tombol mati. Sekarang ia membuka
         lembar akunnya: 'login' kalau belum ada akun, 'teacher' kalau akunnya ada tetapi
         perannya belum guru - yang memang butuh kode aktivasi, bukan sekadar masuk. */
      if (!quiet) {
        if (avail === 'no_account') openAccount('login');
        else if (avail === 'not_teacher') openAccount('teacher');
        else toast(T.syncLabel(cls()).text);
      }
      return Promise.resolve();
    }
    if (ui.syncing || !st.classes.length) return Promise.resolve();
    ui.syncing = true; syncingSince = Date.now();
    paintSyncChip();
    var total = { ingested: 0, graded: 0, names: [], failed: 0, events: [] };
    return st.classes.reduce(function (p, c) { return p.then(function () { return T.syncClass(c).then(function (r) { if (r.ok) { total.ingested += r.ingested; total.graded += r.graded; total.names = total.names.concat(r.names || []); total.events = total.events.concat(r.events || []); } else total.failed++; }); }); }, Promise.resolve())
      .then(function () {
        ui.syncing = false; syncingSince = 0; st.lastSyncAt = Date.now();
        syncFailStreak = total.failed ? syncFailStreak + 1 : 0;
        if (total.ingested) saveMinutes(total.ingested * 4 + total.graded * 5);
        total.events.forEach(function (e) { T.notify(st, e); });
        persist();
        /* Render penuh hanya bila ronde ini benar-benar membawa sesuatu. Ronde kosong -
           yang mayoritas pada jeda 3 detik - cukup menyegarkan chipnya. */
        var berubah = total.ingested || total.graded || total.events.length;
        if (!quiet && busy()) { syncRender(); } else if (!quiet) render(); else if (berubah) syncRender(); else paintSyncChip();
        if (total.events.length) { var top = total.events.filter(function (e) { return e.kind === 'focus_exit'; })[0] || total.events.filter(function (e) { return e.kind === 'join_request'; })[0] || total.events.filter(function (e) { return e.kind === 'assignment_done'; })[0] || total.events[0]; toast(T.inboxText(top) + (total.events.length > 1 ? ' · +' + (total.events.length - 1) + ' kabar lain' : '')); }
        else if (total.ingested) toast(total.ingested + ' laporan murid masuk' + (total.graded ? ' · ' + total.graded + ' tugas dinilai otomatis' : '') + '.');
        else if (!quiet) toast(total.failed ? 'Sinkron gagal untuk ' + total.failed + ' kelas.' : 'Tersinkron — belum ada laporan baru.');
      })
      /* Satu galat yang lolos dari rantai di atas (cat ulang, penyimpanan penuh, kabar yang
         bentuknya asing) dulu meninggalkan ui.syncing = true, dan sejak itu SETIAP detak
         berikutnya melihat "ronde sebelumnya masih jalan" lalu pulang. Papan guru berhenti
         hidup tanpa satu pun pesan. Kuncinya dilepas di sini, bukan diandaikan tidak pernah
         tersangkut. */
      .catch(function () { ui.syncing = false; syncingSince = 0; try { paintSyncChip(); } catch (_) {} });
  }
  /*
   * Apakah guru sedang MEMEGANG cangkang ini?
   *
   * Cat ulang penuh mengganti el.innerHTML, jadi ia membuang simpul yang sedang dipegang guru:
   * teks yang sedang diketik hilang di tengah kalimat, dropdown yang terbuka tertutup, pilihan
   * murid pada tugas baru ter-reset. Itulah kenapa "tugas baru tidak pernah sampai": bukan
   * kiriman yang gagal, melainkan formulirnya yang dikosongkan sebelum guru sempat menekan
   * kirim. Selama salah satu dari ini benar, cat ulang yang dipicu SINKRON harus menunggu.
   */
  function busy() {
    try {
      if (ui.modal || ui.drawer || ui.inbox) return true;
      var a = root.document.activeElement;
      if (!a || !el || !el.contains(a)) return false;
      if (a.isContentEditable) return true;
      return /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName || '');
    } catch (_) { return false; }
  }
  /*
   * Cat ulang yang dipicu sinkron - satu-satunya yang boleh ditunda. Cat ulang yang dipicu
   * KETUKAN guru tetap memanggil render() langsung: di sana penundaan justru terbaca sebagai
   * tombol yang tidak bereaksi. Yang tertunda disusulkan oleh detak chip begitu busy() reda.
   */
  function syncRender() {
    if (busy()) { pendingRender = true; paintSyncChip(); return false; }
    render();
    return true;
  }
  /*
   * Mengecat ulang HANYA chip sinkron, bukan seluruh cangkang.
   *
   * Ini pagar yang membuat ronde 3 detik aman. syncAll() dulu memanggil render() dua kali
   * per ronde - sekali saat mulai, sekali saat selesai. Pada 45 detik itu tidak terasa; pada
   * 3 detik ia mencabut fokus dari kolom yang sedang diketik guru, menutup dropdown yang
   * sedang dibuka, dan melompatkan posisi gulir - setiap tiga detik. Ronde yang TIDAK membawa
   * data baru karena itu hanya menyegarkan label chip di tempat.
   */
  function paintSyncChip() {
    try {
      if (!el) return false;
      var node = el.querySelector('[data-tg="sync"]');
      var c = cls();
      if (!node || !c) return false;
      var tmp = root.document.createElement('div');
      tmp.innerHTML = syncChip(c);
      var fresh = tmp.firstElementChild;
      if (!fresh) return false;
      node.replaceWith(fresh);
      return true;
    } catch (_) { return false; }
  }
  function syncChip(c) {
    var L = S().syncLabel(c);
    return '<button type="button" class="tg-chip tg-sync is-' + (ui.syncing ? 'busy' : L.state) + '" data-tg="sync" title="Sinkron laporan murid dari server" data-testid="tg-sync">' + icon(ui.syncing ? 'refresh-cw' : L.state === 'ok' ? 'cloud-check' : L.state === 'err' ? 'cloud-alert' : 'cloud') + '<span>' + esc(ui.syncing ? 'Menyinkron…' : L.text) + '</span></button>';
  }

  function isTeacherRole() {
    try {
      var acc = (root.FiezelAccount && root.FiezelAccount.state && root.FiezelAccount.state()) || null;
      if (acc && acc.role === 'teacher') return true;
      if (root.FiezelAccount && root.FiezelAccount.isTeacher && root.FiezelAccount.isTeacher()) return true;
      if (root.localStorage && root.localStorage.getItem('fz_teacher_mode') === '1') return true;
      if (root.state && root.state.preferences && root.state.preferences.role === 'guru') return true;
      if (!previewOn && st && st.teacher && st.teacher.name && st.teacher.name.trim() !== '' && st.teacher.name !== 'Bu Sari') return true;
      return false;
    } catch (_) { return false; }
  }

  function ensureTeacherClass() {
    if (previewOn) return null;
    var acc = (root.FiezelAccount && root.FiezelAccount.state && root.FiezelAccount.state()) || null;
    var isTeacher = isTeacherRole() || (acc && acc.role === 'teacher') || (st && st.teacher && st.teacher.name && st.teacher.name.trim() !== '' && st.teacher.name !== 'Bu Sari');
    if (!isTeacher) return null;

    if (!Array.isArray(st.classes)) st.classes = [];

    var sId = (acc && acc.subjectId) || ui.curriculumSubject || ui.assignSubject || 'MAT';
    var gId = (acc && acc.gradeId) || 'SMP';
    var inst = (acc && acc.institution) || (st.teacher && st.teacher.school) || '';
    var mapelNames = (S() && S().MAPEL_NAMES) || {};
    var code = (acc && acc.classCode && acc.classCode !== 'FZ-MERDEKA1') ? S().normalizeClassCode(acc.classCode) : '';
    if (code === 'FZ-MERDEKA1' || (code && !/^FZ-[A-HJ-NP-Z2-9]{6}$/.test(code))) code = '';

    if (!code) {
      try {
        var m = (typeof document !== 'undefined' && document.cookie) ? document.cookie.match(/(?:^|;\s*)fz_cls=([^;]+)/) : null;
        if (m && m[1]) {
          var cand = S().normalizeClassCode(decodeURIComponent(m[1]));
          if (cand && cand !== 'FZ-MERDEKA1' && /^FZ-[A-HJ-NP-Z2-9]{6}$/.test(cand)) code = cand;
        }
      } catch (_) {}
    }
    if (!code) {
      code = S().makeClassCode();
    }

    var modified = false;

    // Bersihkan kelas yang tersimpan dengan kode FZ-MERDEKA1 atau kode bukan 6-char
    st.classes.forEach(function (c) {
      if (c.code === 'FZ-MERDEKA1' || (c.code && !/^FZ-[A-HJ-NP-Z2-9]{6}$/.test(c.code))) {
        c.code = code || S().makeClassCode();
        if (c.sync) c.sync.claimed = false;
        modified = true;
      }
    });

    // Sinkronkan data guru jika akun membawa profil baru
    if (acc) {
      if (acc.teacherName && (!st.teacher || st.teacher.name !== acc.teacherName)) {
        if (!st.teacher) st.teacher = { name: '', school: '' };
        st.teacher.name = acc.teacherName;
        modified = true;
      }
      if (acc.institution && (!st.teacher || st.teacher.school !== acc.institution)) {
        if (!st.teacher) st.teacher = { name: '', school: '' };
        st.teacher.school = acc.institution;
        modified = true;
      }
    }

    // SELALU SINKRONKAN MAPEL PADA SEMUA KELAS GURU INI JIKA ADA SUBJECTID RESMI
    if (acc && acc.subjectId && st.classes.length) {
      var officialSub = acc.subjectId;
      var officialSubName = mapelNames[officialSub] || officialSub;
      st.classes.forEach(function (c) {
        var prefix = inst ? inst + ' — ' : (st.teacher && st.teacher.school ? st.teacher.school + ' — ' : '');
        if (c.subject !== officialSub || (c.name && c.name.indexOf('Matematika') !== -1 && officialSub !== 'MAT')) {
          c.subject = officialSub;
          c.name = prefix + officialSubName;
          modified = true;
        }
      });
      if (ui.curriculumSubject !== officialSub) {
        ui.curriculumSubject = officialSub;
      }
      if (ui.assignSubject !== officialSub) {
        ui.assignSubject = officialSub;
      }
    }

    var existing = st.classes.filter(function (c) {
      return S().normalizeClassCode(c.code) === code;
    })[0];

    if (existing) {
      st.activeClassId = existing.id;
      st.onboarded = true;
      if (!st.view || st.view === 'briefing') st.view = 'hub';
      if (modified) persist();
      return existing;
    }

    // Jika kelas tunggal sebelumnya belum punya murid dan merupakan kelas otomatis
    if (st.classes.length === 1 && (!st.classes[0].students || !st.classes[0].students.length) && code) {
      st.classes[0].code = code;
      st.classes[0].subject = sId;
      var pfx = inst ? inst + ' — ' : (st.teacher && st.teacher.school ? st.teacher.school + ' — ' : '');
      st.classes[0].name = pfx + subName;
      st.activeClassId = st.classes[0].id;
      st.onboarded = true;
      if (!st.view || st.view === 'briefing') st.view = 'hub';
      persist();
      return st.classes[0];
    }

    // Jika guru belum punya kelas sama sekali, buat kelas otomatis
    if (!st.classes.length) {
      if (st.deletedClassCodes && st.deletedClassCodes[code]) {
        delete st.deletedClassCodes[code];
      }
      var clsTitle = (inst ? inst + ' — ' : '') + subName;
      var newCls = S().newClass(clsTitle, gId, sId);
      newCls.code = code;
      st.classes.unshift(newCls);
      st.activeClassId = newCls.id;
      st.onboarded = true;
      st.view = 'hub';
      ui.curriculumSubject = sId;
      ui.assignSubject = sId;
      persist();
      return newCls;
    }

    if (modified) persist();
    return null;
  }

  // ---- mount ------------------------------------------------------------------------------
  function mount(target, options) {
    el = target; env = options || {};
    /* Bank Fase D dipanggil sedini mungkin dan TIDAK ditunggu: guru butuh beberapa
       ketukan untuk sampai ke pembuat tugas, dan dalam rentang itu banknya sudah
       mendarat. Kalau belum, pratinjau pertama memakai kolam lama lalu mengecat ulang
       sendiri begitu bank tiba — tidak ada yang menunggu layar kosong. */
    try { for (var bi = 0; bi < MAPEL_BANK_SUBJECTS.length; bi++) mapelBank(MAPEL_BANK_SUBJECTS[bi]); } catch (_) {}
    /* Urutannya penting: penyimpanan dialihkan SEBELUM load(), kalau tidak papan demo
       terisi dari data guru asli dan tulisan pertamanya mendarat di sana juga. */
    previewOn = previewAllowed();
    try { S().setPreview(previewOn); } catch (_) {}
    st = S().load();
    /* Demo yang kosong bukan demo. Pengunjung yang menekan "Buka Demo Guru" datang untuk
       melihat papan yang HIDUP — 18 murid, dua tugas, kehadiran, jurnal — bukan layar
       "buat kelas pertamamu" yang justru menyembunyikan seluruh produknya. Disemai hanya
       sekali per sesi, dan hanya ke penyimpanan pratinjau. */
    if (previewOn && !st.classes.length) {
      try {
        var demo = S().seedDemo();
        st.classes.push(demo); st.activeClassId = demo.id; st.onboarded = true;
        st.teacher = { name: 'Bu Sari', school: 'SMP Nusantara 1' };
        st.view = 'briefing';
        S().save(st);
      } catch (_) { /* bank soal belum termuat: papan tetap terbuka, sekadar kosong */ }
    }
    st.classes = (st.classes || []).map(S().normalizeClass);
    try {
      ensureTeacherClass();
    } catch (_) {}
    if (!cls() && st.classes.length) st.activeClassId = st.classes[0].id;
    if (!st.classes.length && !st.onboarded) { st.view = 'briefing'; }
    // Kelas (class-hub) = landing default Ruang Guru: guru, murid, tugas, hasil, Braincore satu tempat.
    if (st.classes.length && (!st.view || st.view === 'briefing') && !st.hubSeen && root.FiezelClassHub) { st.view = 'hub'; st.hubSeen = true; }
    if (st.view === 'hub' && !root.FiezelClassHub) st.view = 'briefing';
    document.body.classList.add('fz-teacher-mode');
    el.addEventListener('click', onClick); el.addEventListener('submit', onSubmit); el.addEventListener('change', onChange); el.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    render();
    startAutoSync();
    // Sinkron daftar kelas dari server di latar belakang jika tersedia
    try {
      if (S() && typeof S().syncClassList === 'function' && !previewOn) {
        S().syncClassList(st).then(function (res) {
          if (res && res.ok && res.added > 0) {
            render();
          }
        }).catch(function () {});
      }
    } catch (_) {}
  }
  function unmount() { stopAutoSync(); document.body.classList.remove('fz-teacher-mode'); document.removeEventListener('keydown', onKey); if (el) { el.removeEventListener('click', onClick); el.removeEventListener('submit', onSubmit); el.removeEventListener('change', onChange); el.removeEventListener('input', onInput); } el = null; ui.modal = null; ui.drawer = null; lastPaintKey = null; }
  function onKey(e) { if (e.key === 'Escape' && (ui.modal || ui.drawer || ui.inbox)) { ui.modal = null; ui.drawer = null; ui.inbox = false; render(); } }
  function performTeacherLogout() {
    persist();
    try { localStorage.removeItem('fz_teacher_mode'); } catch(_) {}
    try { sessionStorage.removeItem('fz-teacher-preview'); } catch(_) {}
    try { sessionStorage.removeItem('fiezel-teacher-v1-preview'); } catch(_) {}
    exitPreview();
    previewOn = false;
    if (root.state && root.state.preferences) {
      root.state.preferences.role = 'murid';
      root.state.view = 'home';
      try { root.save?.(); } catch(_) {}
    }
    unmount();

    var doLogout = (root.FiezelAccount && root.FiezelAccount.logout)
      ? root.FiezelAccount.logout()
      : Promise.resolve();

    return doLogout.finally(function () {
      try { localStorage.removeItem('fz_teacher_mode'); } catch(_) {}
      if (root.state && root.state.preferences) {
        root.state.preferences.role = 'murid';
        root.state.view = 'home';
        try { root.save?.(); } catch(_) {}
      }
      if (typeof root.go === 'function') {
        root.go('home');
      } else if (typeof root.render === 'function') {
        root.render();
      }
      setTimeout(function () {
        try {
          if (typeof root.openFiezelAuthModal === 'function') {
            root.openFiezelAuthModal('teacher');
          } else if (typeof root.openAccountSheet === 'function') {
            root.openAccountSheet('teacher');
          }
        } catch (_) {}
      }, 150);
    });
  }
  function exit(opts) {
    if (isTeacherRole()) {
      performTeacherLogout();
      return;
    }
    unmount();
    if (env.exit) {
      env.exit(opts);
    } else if (opts && opts.target === 'landing') {
      try { location.href = '../#hero'; } catch (_) {}
    } else {
      if (typeof root.go === 'function') root.go('home');
      else if (typeof root.render === 'function') root.render();
    }
  }

  /*
   * Kunci "layar mana yang sedang dicat". Animasi masuk (.tg-rise) hanya boleh berjalan saat
   * layarnya BERGANTI. m025-261 memutarnya ulang pada setiap cat ulang sinkron: kartu jatuh
   * kembali ke posisi awalnya - turun dan bergeser - lalu merangkak ke tempatnya, berulang
   * setiap ronde. Yang guru lihat sebagai "kartu glitch berpindah-pindah" adalah animasi masuk
   * yang di-restart, bukan tata letak yang bergerak.
   */
  var lastPaintKey = null;
  function captureActive(container) {
    try {
      var act = root.document ? root.document.activeElement : null;
      if (act && container && container.contains(act) && /^(INPUT|TEXTAREA)$/i.test(act.tagName || '')) {
        return { name: act.getAttribute('name'), testId: act.getAttribute('data-testid'), s: act.selectionStart, e: act.selectionEnd };
      }
    } catch (_) {}
    return null;
  }
  function restoreActive(container, saved) {
    if (!saved || (!saved.testId && !saved.name) || !container) return;
    try {
      var sel = saved.testId ? '[data-testid="' + saved.testId + '"]' : '[name="' + saved.name + '"]';
      var r = container.querySelector(sel);
      if (r) { r.focus(); if (r.setSelectionRange && saved.s != null) r.setSelectionRange(saved.s, saved.e); }
    } catch (_) {}
  }
  function render() {
    if (!el) return;
    pendingRender = false;
    if (!previewOn && isTeacherRole()) {
      try {
        var fresh = S().load();
        if (fresh && Array.isArray(fresh.classes) && fresh.classes.length) {
          st.classes = fresh.classes;
          if (fresh.activeClassId) st.activeClassId = fresh.activeClassId;
          if (fresh.teacher && fresh.teacher.name) st.teacher = fresh.teacher;
        }
      } catch (_) {}
      try { ensureTeacherClass(); } catch (_) {}
    }
    var c = cls(), saved = captureActive(el);
    var key = (st.view || 'briefing') + '|' + (st.activeClassId || '') + '|' + (ui.modal ? ui.modal.kind : '') + '|' + (ui.drawer || '');
    var repaint = key === lastPaintKey;
    lastPaintKey = key;
    el.innerHTML = '<div class="tg' + (repaint ? ' is-repaint' : '') + (previewOn ? ' is-demo' : '') + (ui.modal && ui.modal.kind === 'board' ? ' tg-board-open' : '') + '" data-testid="teacher-shell">' + demoBanner() + sidebar(c) + '<div class="tg-main">' + topbar(c) + '<div class="tg-content">' + (st.classes.length || st.view === 'curriculum' || st.view === 'settings' ? (views[st.view] ? views[st.view](c) : views.briefing(c)) : welcome()) + '</div></div>' + mobileNav() + drawer(c) + modal(c) + '</div>';
    var hubEl = el.querySelector('#tgClassHub');
    if (hubEl && root.FiezelClassHub) root.FiezelClassHub.mountTeacher(hubEl, { st: function () { return st; }, cls: cls, persist: persist, toast: toast, rerender: render });
    restoreActive(el, saved);
    if (env.afterRender) try { env.afterRender(); } catch (_) {}
    /* Autofokus hanya saat layarnya benar-benar berganti. Pada cat ulang ia akan merebut kursor
       dari tempat guru meletakkannya. */
    if (!repaint) { var f = el.querySelector('[data-autofocus]'); if (f) try { f.focus(); } catch (_) {} }
  }

  /*
   * PITA DEMO — KEJUJURAN YANG TERLIHAT, BUKAN CATATAN KECIL DI KAKI HALAMAN.
   *
   * Papan ini terisi 18 murid dengan nama, nilai, dan catatan wali kelas. Tanpa pita ini
   * seorang guru bisa memakainya setengah jam sebelum sadar tidak satu pun angkanya nyata —
   * dan yang lebih buruk, mengira kelasnya sudah terdaftar. Jadi statusnya dinyatakan di
   * baris paling atas, bukan disembunyikan, lengkap dengan dua jalan keluar: kembali ke
   * sisi murid, atau naik ke akun guru sungguhan.
   */
  function demoBanner() {
    if (!previewOn) return '';
    return '<div class="tg-demo-bar" role="status" data-testid="tg-demo-bar">' +
      '<span class="tg-demo-tag">DEMO</span>' +
      '<span class="tg-demo-text">' + esc(t('guru.demo-pita', 'Kamu sedang melihat DEMO — kelas, murid, dan angkanya contoh.')) + '</span>' +
      '<span class="tg-demo-acts">' +
        '<button type="button" class="tg-demo-btn is-primary" data-tg="demo-activate" data-testid="tg-demo-activate">' + esc(t('guru.demo-cta', 'Punya kode undangan? Aktifkan akun guru')) + '</button>' +
        '<button type="button" class="tg-demo-btn" data-tg="demo-exit" data-testid="tg-demo-exit">' + esc(t('guru.demo-keluar', 'Keluar dari demo')) + '</button>' +
      '</span></div>';
  }

  // ---- kerangka ---------------------------------------------------------------------------
  function sidebar(c) {
    var teacherVerified = isTeacherRole();
    var exitLabel = teacherVerified ? 'Keluar akun guru' : 'Ke mode murid';
    var exitAction = teacherVerified ? 'logout' : 'exit';
    return '<aside class="tg-side"><div class="tg-brand"><span class="tg-brand-mark">K</span><div class="kelasku-brand"><span class="kelasku-main">KelasKu</span> <span class="kelasku-tag">' + esc(t('guru.merek-tag', 'untuk Guru')) + '</span></div></div>' +
      '<button type="button" class="tg-teacher" data-tg="view" data-view="settings" data-testid="tg-profile">' + icon('user-round') + '<div><b>' + esc(st.teacher.name || accountHandle() || 'Guru FIEZEL') + '</b><small>' + esc(st.teacher.school || 'Atur profil →') + '</small></div></button>' +
      (st.classes.length ? '<label class="tg-class-switch">' + t('guru.kelas-aktif', 'Kelas aktif') + '<select data-tg-select="class" data-testid="tg-class-select">' + st.classes.map(function (k) { return '<option value="' + k.id + '"' + (c && k.id === c.id ? ' selected' : '') + '>' + esc(k.name) + '</option>'; }).join('') + '</select></label>' : '') +
      '<nav class="tg-nav">' + NAV.map(function (n) { return '<button type="button" class="tg-nav-item' + (st.view === n[0] ? ' is-active' : '') + '" data-tg="view" data-view="' + n[0] + '" data-testid="tg-nav-' + n[0] + '">' + icon(n[2]) + '<span>' + n[1] + '</span></button>'; }).join('') + '</nav>' +
      /* Pintu konsol kurikulum HANYA dibuka kalau benderanya menyala. Backend yang
         melayaninya (/api/...) belum berjalan di produksi — diperiksa owner 7 Sep 2026,
         404. Nama bendera yang salah ketik jatuh ke false, jadi kegagalannya menyembunyikan
         pintu, bukan membukanya. Lihat alasan lengkap di fiezel-ux-flags.js. */
      (konsolKurikulumSiap()
        ? '<button type="button" class="tg-nav-item' + (st.view === 'curriculum' ? ' is-active' : '') + '" data-tg="view" data-view="curriculum" data-testid="tg-nav-curriculum">' + icon('library') + '<span>' + esc(t('guru.nav-kurikulum', 'Kurikulum & Materi')) + '</span></button>'
        : '') +
      '<div class="tg-side-foot"><div class="tg-saved" title="Perkiraan waktu administrasi yang FIEZEL kerjakan untukmu">' + icon('hourglass') + '<div><small>' + esc(t('guru.waktu-hemat', 'Waktu administrasi yang dihemat')) + '</small><b>' + Math.round(st.savedMinutes || 0) + ' menit</b></div></div>' +
      '<button type="button" class="tg-exit" data-tg="' + exitAction + '" data-testid="tg-exit">' + icon('log-out') + ' ' + exitLabel + '</button></div></aside>';
  }
  function topbar(c) {
    var d = new Date();
    return '<header class="tg-top"><div><p class="tg-kicker">' + esc(d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })) + '</p><h1>' + esc(st.classes.length ? (TITLE[st.view] || t('guru.merek-penuh', 'KelasKu untuk Guru')) : t('guru.merek-penuh', 'KelasKu untuk Guru')) + '</h1></div>' +
      '<div class="tg-top-actions">' + (c ? syncChip(c) + '<button type="button" class="tg-chip tg-code" data-tg="copy" data-text="' + esc(c.code) + '" title="Salin kode kelas" data-testid="tg-class-code">' + icon('hash') + '<span>' + esc(c.code) + '</span></button>' : '') + bell() + (c ? '<button type="button" class="tg-btn is-ghost" data-tg="modal" data-kind="board" data-testid="tg-open-board">' + icon('presentation') + '<span>Mode papan</span></button><button type="button" class="tg-btn is-primary" data-tg="modal" data-kind="assign" data-testid="tg-quick-assign">' + icon('plus') + '<span>' + t('guru.tugas-baru', 'Tugas baru') + '</span></button>' : '') + '</div></header>' + inboxPanel();
  }
  function bell() {
    var n = S().inboxUnread(st);
    return '<button type="button" class="tg-icon-btn tg-bell' + (n ? ' has-new' : '') + (ui.inbox ? ' is-open' : '') + '" data-tg="inbox" aria-label="Notifikasi guru" title="Notifikasi" data-testid="tg-bell">' + icon('bell') + (n ? '<span class="tg-bell-badge" data-testid="tg-bell-badge">' + (n > 9 ? '9+' : n) + '</span>' : '') + '</button>';
  }
  function inboxPanel() {
    if (!ui.inbox) return '';
    var T = S(), list = (st.inbox || []).slice(0, 30);
    return '<div class="tg-inbox-scrim" data-tg="close"></div><section class="tg-inbox" role="dialog" aria-label="Notifikasi" data-testid="tg-inbox"><div class="tg-inbox-head"><h3>' + t('umum.notifikasi', 'Notifikasi') + '</h3>' + (list.length ? '<button type="button" class="tg-link" data-tg="inbox-clear">Bersihkan</button>' : '') + '</div>' +
      (list.length ? '<ul class="tg-inbox-list">' + list.map(function (e) {
        var ic = e.kind === 'assignment_done' ? 'clipboard-check' : e.kind === 'student_joined' || e.kind === 'join_request' ? 'user-plus' : e.kind === 'focus_exit' ? 'eye-off' : 'inbox';
        var warn = e.kind === 'focus_exit' ? ' is-warn' : '';
        return '<li><button type="button" class="tg-inbox-item' + warn + (e.read ? '' : ' is-unread') + '" data-tg="inbox-open" data-id="' + esc(e.id) + '" data-testid="tg-inbox-' + esc(e.id) + '">' + icon(ic) + '<div><b>' + esc(T.inboxText(e)) + '</b><small>' + esc(T.fmtDate(e.at)) + ' · ' + esc(new Date(e.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })) + '</small></div></button></li>';
      }).join('') + '</ul>' : '<p class="tg-empty">' + t('guru.belum-ada-kabar', 'Belum ada kabar. Saat murid selesai mengerjakan tugas yang kamu kirim, hasilnya muncul di sini otomatis.') + '</p>') + '</section>';
  }
  function mobileNav() {
    return '<nav class="tg-mnav">' + NAV.map(function (n) {
      return '<button type="button" class="' + (st.view === n[0] ? 'is-active' : '') + '" data-tg="view" data-view="' + n[0] + '">' + icon(n[2]) + '<span>' + n[1].split(' ')[0] + '</span></button>';
    }).join('') +
    (konsolKurikulumSiap()
      ? '<button type="button" class="' + (st.view === 'curriculum' ? 'is-active' : '') + '" data-tg="view" data-view="curriculum">' + icon('library') + '<span>' + esc(t('guru.nav-kurikulum-singkat', 'Kurikulum')) + '</span></button>'
      : '') +
    '</nav>';
  }

  function welcome() {
    return '<section class="tg-welcome" data-testid="tg-welcome"><p class="tg-kicker">Selamat datang</p><h2>' + t('guru.ruang-kerja-desc', 'Ruang kerja yang membaca kelasmu, lalu memberi tahu') + ' <em>siapa yang perlu disapa hari ini</em>.</h2>' +
      '<p class="tg-lead">FIEZEL KelasKu untuk Guru mengubah data latihan murid menjadi tindakan: deteksi dini siswa tertinggal, kartu sapa personal 1 ketuk, laporan orang tua otomatis, kelompok belajar yang dipasangkan sendiri, dan tugas yang menilai dirinya sendiri.</p>' +
      '<div class="tg-welcome-actions"><button type="button" class="tg-btn is-primary is-lg" data-tg="modal" data-kind="new-class" data-testid="tg-welcome-new-class">' + icon('plus') + ' ' + t('guru.buat-kelas-pertama', 'Buat kelas pertama') + '</button><button type="button" class="tg-btn is-ghost is-lg" data-tg="seed-demo" data-testid="tg-welcome-demo">' + icon('sparkles') + ' Coba dengan kelas contoh (18 siswa)</button></div>' +
      '<ul class="tg-welcome-list"><li>' + icon('shield-check') + ' Data tetap di perangkatmu — tanpa jawaban mentah murid.</li><li>' + icon('timer') + ' Rata-rata guru menghemat 40+ menit/minggu untuk laporan & pesan.</li><li>' + icon('wifi-off') + ' Bekerja offline, cocok untuk sekolah dengan sinyal terbatas.</li></ul></section>';
  }

  // ---- BRIEFING -----------------------------------------------------------------------------
  function briefing(c) {
    var T = S(), stt = T.classStats(c), greet = T.needsGreeting(c), ag = T.agenda(c), mis = T.misconceptions(c);
    var kpi = [['Siswa aktif 7 hari', stt.active7 + '<small>/' + stt.total + '</small>', 'users', stt.total ? stt.active7 / stt.total : 0], ['Rata-rata akurasi', pct(stt.avgAcc), 'target', stt.avgAcc || 0], [t('guru.kpi-perlu-dibantu', 'Perlu dibantu'), (stt.atRisk + stt.watch) + '<small> siswa</small>', 'alert-triangle', stt.total ? (stt.atRisk + stt.watch) / stt.total : 0], [t('guru.tugas-berjalan', 'Tugas berjalan'), stt.openAssignments + '<small> tugas</small>', 'clipboard-list', null]];
    return '<div class="tg-grid tg-grid-kpi">' + kpi.map(function (k, i) { return '<div class="tg-kpi tg-rise" style="--d:' + i * 60 + 'ms" data-testid="tg-kpi-' + i + '">' + icon(k[2]) + '<small>' + k[0] + '</small><b>' + k[1] + '</b>' + (k[3] != null ? bar(k[3], i === 2 ? 'is-warn' : '') : '') + '</div>'; }).join('') + '</div>' +
      '<div class="tg-grid tg-grid-2">' +
      '<section class="tg-card tg-rise" style="--d:200ms" data-testid="tg-greet-list"><div class="tg-card-head"><div><p class="tg-kicker">Deteksi dini</p><h3>Siapa yang perlu disapa hari ini</h3></div><span class="tg-count">' + greet.length + '</span></div>' +
      (greet.length ? '<ul class="tg-list">' + greet.slice(0, 6).map(function (x) { return '<li class="tg-row" data-testid="tg-greet-' + x.s.id + '">' + avatar(x.s) + '<div class="tg-row-body"><b>' + esc(x.s.name) + ' ' + riskPill(x.r) + '</b><small>' + esc(x.r.reasons.join(' · ') || 'perlu dipantau') + '</small><em>' + esc(x.r.action) + '</em></div><div class="tg-row-actions"><button type="button" class="tg-btn is-small is-primary" data-tg="modal" data-kind="greet" data-id="' + x.s.id + '" data-testid="tg-greet-btn-' + x.s.id + '">' + icon('message-circle-heart') + ' Kartu sapa</button><button type="button" class="tg-btn is-small is-ghost" data-tg="drawer" data-id="' + x.s.id + '">Detail</button></div></li>'; }).join('') + '</ul>' : '<p class="tg-empty">Semua siswa dalam kondisi aman. Nikmati kopimu ☕</p>') + '</section>' +
      '<div class="tg-stack">' +
      '<section class="tg-card tg-rise" style="--d:260ms"><div class="tg-card-head"><div><p class="tg-kicker">Agenda</p><h3>Tenggat & tugas</h3></div></div>' + (ag.length ? '<ul class="tg-agenda">' + ag.slice(0, 5).map(function (a) { return '<li class="is-' + a.kind + '"><span class="tg-dot"></span><div><b>' + esc(a.a.title) + '</b><small>' + (a.a.deadline ? 'Tenggat ' + esc(a.a.deadline) : 'Tanpa tenggat') + ' · ' + a.pending + ' belum selesai' + (a.kind === 'lewat' ? ' · <strong>lewat</strong>' : '') + '</small></div></li>'; }).join('') + '</ul>' : '<p class="tg-empty">Tidak ada tenggat aktif.</p>') + '</section>' +
      '<section class="tg-card tg-card-ink tg-rise" style="--d:320ms" data-testid="tg-misconception"><p class="tg-kicker">Miskonsepsi kelas</p>' + (mis.length ? '<h3>' + esc(mis[0].label) + ' <span>' + pct(mis[0].acc) + '</span></h3><p>' + esc(mis[0].pattern) + '. ' + mis[0].low + ' siswa di bawah 50%.</p><p class="tg-plan">' + icon('lightbulb') + ' ' + esc(mis[0].lesson) + '</p><div class="tg-actions"><button type="button" class="tg-btn is-light is-small" data-tg="modal" data-kind="assign" data-skill="' + mis[0].skill + '">' + t('guru.buat-latihan', 'Buat latihan') + ' ' + esc(mis[0].label) + '</button><button type="button" class="tg-btn is-ghost-light is-small" data-tg="view" data-view="insights" data-skill="' + mis[0].skill + '">Lihat kelompok belajar</button></div>' : '<p>' + t('guru.belum-data-latihan', 'Belum ada data latihan murid.') + '</p>') + '</section>' +
      '</div></div>' +
      '<section class="tg-quick tg-rise" style="--d:380ms"><p class="tg-kicker">Aksi cepat</p><div class="tg-quick-row">' + [['attendance', 'check-square', 'Absensi hari ini'], ['add-students', 'user-plus', t('guru.tambah-siswa', 'Tambah siswa')], ['announce', 'megaphone', 'Pengumuman'], ['weekly-report', 'file-text', 'Laporan mingguan'], ['import-code', 'clipboard-paste', 'Tempel kode hasil murid']].map(function (q) { return '<button type="button" class="tg-quick-btn" data-tg="modal" data-kind="' + q[0] + '" data-testid="tg-quick-' + q[0] + '">' + icon(q[1]) + '<span>' + q[2] + '</span></button>'; }).join('') + '</div></section>';
  }

  // ---- KELAS & SISWA -------------------------------------------------------------------------
  function classes(c) {
    var T = S(), q = ui.filter.toLowerCase(), list = c.students.filter(function (s) { return !q || s.name.toLowerCase().indexOf(q) !== -1; }).map(function (s) { return { s: s, r: T.risk(c, s) }; }).sort(function (a, b) { return b.r.score - a.r.score; });
    var mapelNames = (T && T.MAPEL_NAMES) || {};
    return '<div class="tg-toolbar"><div class="tg-tabs">' + st.classes.map(function (k) { return '<button type="button" class="tg-tab' + (k.id === c.id ? ' is-active' : '') + '" data-tg="pick-class" data-id="' + k.id + '">' + esc(k.name) + '<small>' + k.students.length + '</small></button>'; }).join('') + '<button type="button" class="tg-tab is-add" data-tg="modal" data-kind="new-class" data-testid="tg-new-class">' + t('guru.kelas-tambah-btn', '+ Kelas') + '</button></div>' +
      '<div class="tg-toolbar-actions"><label class="tg-search">' + icon('search') + '<input type="search" placeholder="' + t('guru.cari-siswa', 'Cari siswa…') + '" value="' + esc(ui.filter) + '" data-tg-input="filter" data-testid="tg-student-search"></label><button type="button" class="tg-btn is-ghost" data-tg="modal" data-kind="attendance" data-testid="tg-attendance">' + icon('check-square') + '<span>Absensi</span></button><button type="button" class="tg-btn is-ghost" data-tg="export-csv" data-testid="tg-export-csv">' + icon('download') + '<span>CSV</span></button><button type="button" class="tg-btn is-primary" data-tg="modal" data-kind="add-students" data-testid="tg-add-students">' + icon('user-plus') + '<span>' + t('guru.tambah-siswa', 'Tambah siswa') + '</span></button></div></div>' +
      '<section class="tg-card tg-class-meta"><div><p class="tg-kicker">' + esc(mapelNames[c.subject] || c.subject || 'English') + ' · Level ' + esc(c.level) + (c.demo ? ' · <span class="tg-demo">data contoh</span>' : '') + '</p><h3>' + esc(c.name) + '</h3>' +
      (c.latestAnnouncement && c.latestAnnouncement.text ? '<p class="tg-latest-ann" style="margin:4px 0 8px;font-size:13px;color:var(--tg-text)">📢 <b>Pengumuman:</b> ' + esc(c.latestAnnouncement.text) + ' <small class="tg-muted">(' + esc(c.latestAnnouncement.teacher || 'Wali kelas') + (c.latestAnnouncement.at ? ' · ' + T.fmtDate(c.latestAnnouncement.at) : '') + ')</small></p>' : '') +
      '<small>Kode kelas <b class="tg-mono">' + esc(c.code) + '</b> — murid mengetiknya saat onboarding; setiap selesai sesi, hasilnya dikirim ke server dan masuk ke sini otomatis. ' + (c.sync && c.sync.claimed ? '<span class="tg-ok">Kode terdaftar di server.</span>' : S().syncAvailable() === 'ok' ? '<span class="tg-muted">Kode belum terdaftar — tekan Sinkron.</span>' : '<span class="tg-muted">Tanpa akun guru, tempel kode hasil murid secara manual.</span>') + '</small></div><div class="tg-actions"><button type="button" class="tg-btn is-ghost is-small" data-tg="modal" data-kind="edit-class">' + icon('pencil') + ' ' + t('umum.ubah', 'Ubah') + '</button><button type="button" class="tg-btn is-danger is-small" data-tg="delete-class" data-testid="tg-delete-class">' + icon('trash-2') + ' ' + t('guru.hapus-kelas', 'Hapus kelas') + '</button></div></section>' +
      (list.length ? '<div class="tg-table-wrap"><table class="tg-table" data-testid="tg-student-table"><thead><tr><th>Siswa</th><th>' + t('umum.status', 'Status') + '</th><th>Akurasi</th><th>Terakhir aktif</th><th>Kehadiran</th><th>' + t('umum.tugas', 'Tugas') + '</th><th></th></tr></thead><tbody>' +
        list.map(function (x) { var s = x.s, d = T.daysSince(s.lastActiveAt), att = T.attendanceRate(s, 10); return '<tr data-tg="drawer" data-id="' + s.id + '" data-testid="tg-student-row-' + s.id + '"><td><div class="tg-who">' + avatar(s) + '<div><b>' + esc(s.name) + '</b><small>' + (s.parentPhone ? icon('phone') + ' ortu tersimpan' : '<span class="tg-muted">belum ada kontak ortu</span>') + '</small></div></div></td><td>' + riskPill(x.r) + '</td><td><div class="tg-acc">' + bar(T.overallAcc(s)) + '<span>' + pct(T.overallAcc(s)) + '</span></div></td><td>' + (d == null ? '<span class="tg-muted">—</span>' : d === 0 ? 'Hari ini' : d + ' hari lalu') + '</td><td>' + (att == null ? '—' : Math.round(att * 100) + '%') + '</td><td>' + (x.r.pending ? x.r.pending + ' belum' + (x.r.late ? ' <strong class="tg-late">' + x.r.late + ' lewat</strong>' : '') : '<span class="tg-ok">beres</span>') + '</td><td class="tg-row-end">' + icon('chevron-right') + '</td></tr>'; }).join('') + '</tbody></table></div>' :
        '<section class="tg-card tg-center"><h3>' + t('guru.belum-ada-siswa', 'Belum ada siswa di kelas ini') + '</h3><p class="tg-muted">' + t('guru.tambah-nama-siswa', 'Tambah nama siswa (bisa tempel dari daftar absen), atau bagikan kode kelas') + ' <b>' + esc(c.code) + '</b> supaya hasil latihan murid masuk sendiri.</p><button type="button" class="tg-btn is-primary" data-tg="modal" data-kind="add-students">' + icon('user-plus') + ' ' + t('guru.tambah-siswa', 'Tambah siswa') + '</button></section>');
  }

  // ---- TUGAS & UJIAN -------------------------------------------------------------------------
  function assignments(c) {
    var T = S(), td = T.today(), list = (c.assignments || []).slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    return '<div class="tg-toolbar"><p class="tg-lead-sm">' + t('guru.tugas-menilai-diri', 'Tugas yang menilai dirinya sendiri: kirim ke murid, tugasnya') + ' <b>langsung masuk notifikasi</b> di aplikasi mereka; setelah selesai, hasilnya kembali ke sini otomatis — tidak ada koreksi manual.</p><div class="tg-toolbar-actions"><button type="button" class="tg-btn is-ghost" data-tg="modal" data-kind="import-code" data-testid="tg-grade-code">' + icon('clipboard-paste') + '<span>Tempel kode hasil</span></button><button type="button" class="tg-btn is-primary" data-tg="modal" data-kind="assign" data-testid="tg-new-assign">' + icon('plus') + '<span>' + t('guru.buat-tugas-ujian', 'Buat tugas / ujian') + '</span></button></div></div>' +
      (list.length ? '<div class="tg-grid tg-grid-cards">' + list.map(function (a) {
        var tgt = c.students.filter(function (s) { return T.targeted(a, s); }), done = tgt.filter(function (s) { return a.done && a.done[s.id]; }), accs = done.map(function (s) { return a.done[s.id].acc; }).filter(function (v) { return v != null; }), avg = accs.length ? accs.reduce(function (x, y) { return x + y; }, 0) / accs.length : null;
        var late = a.deadline && a.deadline < td && done.length < tgt.length;
        var asgCode = T.assignmentCode(c, a);
        var waMsgCard = '📢 *TUGAS FIEZEL: ' + a.title + '*\n' +
          'Dari: ' + (st.teacher.name || 'Guru') + ' · ' + t('umum.kelas', 'Kelas') + ': ' + c.name + ' (' + c.code + ')\n' +
          '📝 ' + a.itemIds.length + ' ' + t('umum.soal', 'Soal') + ' · ' + a.minutes + ' min' + (a.deadline ? ' · Tenggat: ' + a.deadline : '') + '\n\n' +
          'Buka FIEZEL → KelasKu / Today Plan → tempel kode tugas ini:\n' + asgCode;
        return '<article class="tg-card tg-assign' + (a.mode === 'ujian' ? ' is-exam' : '') + '" data-testid="tg-assign-' + a.id + '"><div class="tg-card-head"><div><p class="tg-kicker">' + (a.mode === 'ujian' ? icon('shield') + ' Ujian · ' + a.timer + ' mnt · acak' : icon('pencil-ruler') + ' Latihan · ' + a.minutes + ' mnt') + '</p><h3>' + esc(a.title) + '</h3></div><button type="button" class="tg-icon-btn" data-tg="delete-assign" data-id="' + a.id + '" aria-label="Hapus tugas">' + icon('trash-2') + '</button></div>' +
          '<p class="tg-muted">' + a.skills.map(function (k) { return mapelName(k) || T.SKILL_LABEL[k] || k; }).join(' + ') + ' · ' + a.itemIds.length + ' soal · ' + (a.targets ? tgt.length + ' siswa terpilih' : 'seluruh kelas') + '</p>' +
          '<div class="tg-progress"><div class="tg-progress-head"><span>' + done.length + '/' + tgt.length + ' selesai' + (avg != null ? ' · rata-rata ' + pct(avg) : '') + '</span><span class="' + (late ? 'tg-late' : '') + '">' + (a.deadline ? 'Tenggat ' + esc(a.deadline) + (late ? ' (lewat)' : '') : 'Tanpa tenggat') + '</span></div>' + bar(tgt.length ? done.length / tgt.length : 0, avg != null && avg < 0.5 ? 'is-warn' : '') + '</div>' +
          '<div class="tg-actions"><button type="button" class="tg-btn is-small is-primary" data-tg="send-assign" data-id="' + a.id + '" data-testid="tg-send-all-' + a.id + '"' + (ui.sending === a.id ? ' disabled' : '') + '>' + icon('send') + (a.targets ? (a.sent && a.sent.all ? ' ' + t('guru.kirim-ulang-ke', 'Kirim ulang ke') + ' ' : ' ' + t('guru.kirim-ke', 'Kirim ke') + ' ') + tgt.length + ' murid terpilih' : (a.sent && a.sent.all ? ' ' + t('guru.kirim-ulang-semua', 'Kirim ulang ke semua') : ' ' + t('guru.kirim-semua-murid', 'Kirim ke semua murid'))) + '</button><a class="tg-btn is-small is-wa-ghost" target="_blank" rel="noopener" href="' + T.waLink('', waMsgCard) + '" data-testid="tg-card-wa-' + a.id + '">' + icon('message-circle') + ' ' + esc(t('guru.bagikan-wa-singkat', 'WhatsApp')) + '</a><button type="button" class="tg-btn is-small is-ghost" data-tg="copy" data-text="' + esc(asgCode) + '" data-testid="tg-card-copy-' + a.id + '">' + icon('copy') + ' ' + esc(t('guru.salin-kode-singkat', 'Salin Kode')) + '</button><button type="button" class="tg-btn is-small is-ghost" data-tg="modal" data-kind="share-assign" data-id="' + a.id + '" data-testid="tg-share-assign-' + a.id + '">' + icon('users') + ' ' + t('guru.pilih-murid-kode', 'Pilih murid / kode') + '</button><button type="button" class="tg-btn is-small is-ghost" data-tg="modal" data-kind="assign-detail" data-id="' + a.id + '">' + icon('list-checks') + ' Siapa yang belum</button></div>' + (a.sent && a.sent.all ? '<p class="tg-muted tg-sent-note">' + icon('check') + ' Terkirim ke semua murid ' + esc(T.fmtDate(a.sent.all)) + '</p>' : '') + '</article>';
      }).join('') + '</div>' : '<section class="tg-card tg-center"><h3>' + t('guru.belum-ada-tugas', 'Belum ada tugas') + '</h3><p class="tg-muted">Buat tugas dari bank soal FIEZEL: pilih skill, jumlah soal, tenggat. Mode ujian mengacak urutan dan memberi timer.</p></section>');
  }

  // ---- ANALITIK -------------------------------------------------------------------------------
  function insights(c) {
    var T = S(), heat = T.heatmap(c), map = T.classSkillMap(c), mis = T.misconceptions(c);
    var activeList = T.activeSkills ? T.activeSkills(c) : T.SKILL_ORDER;
    if (!ui.insightSkill || activeList.indexOf(ui.insightSkill) === -1) ui.insightSkill = activeList[0] || 'past_tense';
    var groups = T.studyGroups(c, ui.insightSkill);
    if (!c.students.length) return '<section class="tg-card tg-center"><h3>' + t('guru.belum-data-analisis', 'Belum ada data untuk dianalisis') + '</h3><p class="tg-muted">' + t('guru.tambah-siswa-dulu', 'Tambah siswa atau tempel kode hasil latihan murid dulu.') + '</p></section>';
    return '<div class="tg-grid tg-grid-skill">' + map.map(function (m, i) { return '<button type="button" class="tg-skill' + (ui.insightSkill === m.skill ? ' is-active' : '') + ' tg-rise" style="--d:' + i * 40 + 'ms" data-tg="insight-skill" data-skill="' + m.skill + '" data-testid="tg-skill-' + m.skill + '"><small>' + esc(m.label) + '</small><b>' + pct(m.acc) + '</b>' + bar(m.acc, m.acc != null && m.acc < 0.5 ? 'is-warn' : '') + '<em>' + (m.low ? m.low + ' siswa <50%' : m.acc == null ? 'belum ada data' : 'merata') + '</em></button>'; }).join('') + '</div>' +
      '<section class="tg-card" data-testid="tg-heatmap"><div class="tg-card-head"><div><p class="tg-kicker">Peta panas</p><h3>Siswa × skill — sekali lihat, tahu siapa butuh apa</h3></div><small class="tg-legend"><span class="is-hi">≥75%</span><span class="is-mid">50–74%</span><span class="is-lo">&lt;50%</span></small></div>' +
      '<div class="tg-table-wrap"><table class="tg-table tg-heat-table"><thead><tr><th>Siswa</th>' + activeList.map(function (k) { var lbl = T.SKILL_LABEL[k] || (k.indexOf('KOMP-') === 0 ? k.replace(/^KOMP-/, '') : k); return '<th>' + esc(lbl) + '</th>'; }).join('') + '<th>Risiko</th></tr></thead><tbody>' + heat.map(function (h) { return '<tr data-tg="drawer" data-id="' + h.s.id + '"><td><div class="tg-who">' + avatar(h.s) + '<b>' + esc(h.s.name) + '</b></div></td>' + h.cells.map(function (x) { return cell(x.acc); }).join('') + '<td>' + riskPill(h.risk) + '</td></tr>'; }).join('') + '</tbody></table></div></section>' +
      '<div class="tg-grid tg-grid-2">' +
      '<section class="tg-card" data-testid="tg-groups"><div class="tg-card-head"><div><p class="tg-kicker">Kelompok belajar otomatis</p><h3>' + esc(T.SKILL_LABEL[ui.insightSkill] || ui.insightSkill || '') + ' — tiap kelompok punya mentor</h3></div><button type="button" class="tg-btn is-small is-ghost" data-tg="copy-groups">' + icon('copy') + ' Salin</button></div><p class="tg-muted">Siswa yang kuat dipasangkan dengan yang lemah (peer tutoring). Menjelaskan ke teman adalah latihan terbaik untuk si mentor sendiri.</p>' +
      (groups.length ? '<div class="tg-groups">' + groups.map(function (g) { return '<div class="tg-group"><b>Kelompok ' + g.no + '</b>' + g.members.map(function (m, i) { return '<div class="tg-group-row' + (i === 0 ? ' is-mentor' : '') + '">' + avatar(m.s, 'sm') + '<span>' + esc(m.s.name) + '</span><small>' + pct(m.acc) + (i === 0 ? ' · mentor' : '') + '</small></div>'; }).join('') + '</div>'; }).join('') + '</div>' : '<p class="tg-empty">' + t('guru.belum-data-skill', 'Belum ada data skill ini.') + '</p>') + '</section>' +
      '<section class="tg-card tg-card-ink"><p class="tg-kicker">Tiga miskonsepsi teratas</p>' + (mis.length ? '<ol class="tg-mis">' + mis.map(function (m) { return '<li><b>' + esc(m.label) + ' <span>' + pct(m.acc) + '</span></b><small>' + esc(m.pattern) + '</small><em>' + esc(m.objective) + '</em></li>'; }).join('') + '</ol><button type="button" class="tg-btn is-light is-small" data-tg="modal" data-kind="assign" data-skill="' + mis[0].skill + '">' + icon('plus') + ' ' + t('guru.buat-remedial', 'Buat sesi remedial') + ' ' + esc(mis[0].label) + '</button>' : '<p>' + t('umum.belum-ada-data', 'Belum ada data.') + '</p>') + '</section></div>';
  }

  // ---- KOMUNIKASI ---------------------------------------------------------------------------------
  function comms(c) {
    var T = S(), ann = (c.announcements || []).slice().reverse(), greet = T.needsGreeting(c), withPhone = c.students.filter(function (s) { return s.parentPhone; });
    return '<div class="tg-grid tg-grid-2">' +
      '<div class="tg-stack"><section class="tg-card" data-testid="tg-announce"><div class="tg-card-head"><div><p class="tg-kicker">Pengumuman kelas</p><h3>Satu pesan, semua kanal</h3></div></div><form data-tg-form="announce" class="tg-form"><textarea name="text" rows="3" required placeholder="Contoh: Besok kuis Past Tense 10 soal, 15 menit. Bawa catatan penanda waktu!" data-testid="tg-announce-text"></textarea><div class="tg-actions"><button type="submit" class="tg-btn is-primary is-small" data-testid="tg-announce-submit">' + icon('megaphone') + ' ' + t('guru.simpan-salin', 'Simpan & salin') + '</button><button type="submit" class="tg-btn is-ghost is-small" name="wa" value="1">' + icon('message-circle') + ' ' + t('guru.kirim-whatsapp', 'Kirim via WhatsApp') + '</button></div></form>' +
      (ann.length ? '<ul class="tg-feed">' + ann.slice(0, 5).map(function (a) { return '<li><small>' + esc(T.fmtDate(a.at)) + '</small><p>' + esc(a.text) + '</p><button type="button" class="tg-link" data-tg="copy" data-text="' + esc(a.text) + '">Salin ulang</button></li>'; }).join('') + '</ul>' : '') + '</section>' +
      '<section class="tg-card" data-testid="tg-parent-section"><div class="tg-card-head"><div><p class="tg-kicker">Laporan orang tua</p><h3>Rapor naratif otomatis</h3></div><span class="tg-count">' + c.students.length + '</span></div><p class="tg-muted">Bahasa hangat, berisi angka nyata, plus satu saran 5 menit yang bisa orang tua lakukan di rumah. ' + withPhone.length + ' siswa punya nomor ortu (kirim langsung via WhatsApp).</p>' +
      '<div class="tg-chips">' + c.students.map(function (s) { return '<button type="button" class="tg-chip' + (s.parentPhone ? ' has-phone' : '') + '" data-tg="modal" data-kind="parent" data-id="' + s.id + '" data-testid="tg-parent-' + s.id + '">' + esc(s.name) + (s.parentPhone ? ' ' + icon('phone') : '') + '</button>'; }).join('') + '</div>' +
      '<div class="tg-actions"><button type="button" class="tg-btn is-ghost is-small" data-tg="modal" data-kind="weekly-report">' + icon('file-text') + ' Laporan kelas mingguan</button><button type="button" class="tg-btn is-ghost is-small" data-tg="copy-all-parents">' + icon('copy') + ' Salin semua laporan</button></div></section></div>' +
      '<section class="tg-card" data-testid="tg-greet-cards"><div class="tg-card-head"><div><p class="tg-kicker">Kartu sapa</p><h3>Pesan personal 1 ketuk</h3></div><span class="tg-count">' + greet.length + '</span></div><p class="tg-muted">Masalah klasik: guru tahu siapa yang mulai menjauh, tapi tak sempat menulis 30 pesan berbeda. FIEZEL menyusun pesan dari data tiap anak — kamu tinggal baca sekali dan kirim.</p>' +
      (greet.length ? '<ul class="tg-list">' + greet.map(function (x) { return '<li class="tg-row">' + avatar(x.s) + '<div class="tg-row-body"><b>' + esc(x.s.name) + ' ' + riskPill(x.r) + '</b><small>' + esc(T.greetingCard(c, x.s, st.teacher)) + '</small></div><div class="tg-row-actions"><button type="button" class="tg-btn is-small is-primary" data-tg="modal" data-kind="greet" data-id="' + x.s.id + '">' + icon('send') + ' ' + t('umum.kirim', 'Kirim') + '</button></div></li>'; }).join('') + '</ul>' : '<p class="tg-empty">Semua siswa aman — kirimkan apresiasi lewat pengumuman.</p>') + '</section></div>';
  }

  // ---- JURNAL ------------------------------------------------------------------------------------
  function journal(c) {
    var T = S(), list = (c.journal || []).slice().reverse();
    return '<div class="tg-grid tg-grid-2"><section class="tg-card" data-testid="tg-journal-form"><div class="tg-card-head"><div><p class="tg-kicker">Refleksi 60 detik</p><h3>Apa yang berhasil hari ini?</h3></div></div><p class="tg-muted">Guru hebat mencatat metode yang ampuh — tapi jarang ada tempatnya. Catatan di sini menempel ke siswa yang kamu tandai, dan muncul lagi saat kamu membuka profil mereka.</p>' +
      '<form data-tg-form="journal" class="tg-form"><textarea name="text" rows="4" required placeholder="Contoh: Metode timeline di papan ampuh untuk yesterday/ago. Fikri masih tertukar verb 1/2." data-testid="tg-journal-text"></textarea><label class="tg-label">Tandai siswa (opsional)</label><div class="tg-chips tg-chips-select">' + c.students.map(function (s) { return '<label class="tg-chip is-check"><input type="checkbox" name="tags" value="' + s.id + '"><span>' + esc(s.name) + '</span></label>'; }).join('') + '</div><div class="tg-actions"><button type="submit" class="tg-btn is-primary is-small" data-testid="tg-journal-submit">' + icon('notebook-pen') + ' ' + t('guru.simpan-refleksi', 'Simpan refleksi') + '</button></div></form></section>' +
      '<section class="tg-card"><div class="tg-card-head"><div><p class="tg-kicker">' + t('umum.riwayat', 'Riwayat') + '</p><h3>Jurnal ' + esc(c.name) + '</h3></div><span class="tg-count">' + list.length + '</span></div>' + (list.length ? '<ul class="tg-feed">' + list.map(function (j) { return '<li><small>' + esc(T.fmtDate(j.at)) + (j.tags && j.tags.length ? ' · ' + j.tags.map(function (id) { var s = student(id); return s ? esc(s.name) : ''; }).filter(Boolean).join(', ') : '') + '</small><p>' + esc(j.text) + '</p></li>'; }).join('') + '</ul>' : '<p class="tg-empty">' + t('guru.belum-ada-catatan', 'Belum ada catatan.') + '</p>') + '</section></div>';
  }
  /* Kartu AKUN. Sebelum ini halaman ini hanya memuat profil LOKAL (nama & sekolah untuk
     tanda tangan laporan), jadi guru tidak punya satu pun tempat untuk melihat ia masuk
     sebagai siapa, apakah perannya sudah guru, atau untuk masuk/keluar akun - padahal
     tepat tiga hal itu yang menentukan tombol Sinkron hidup atau mati. */
  function accountCard() {
    var role = accountRole(), handle = accountHandle();
    var masuk = !!role, guru = role === 'teacher';
    var status = !masuk
      ? '<p class="tg-muted">' + t('guru.belum-masuk-akun', 'Belum masuk akun. Sinkron laporan murid dan pengiriman tugas butuh akun guru.') + '</p>'
      : '<p class="tg-muted">' + t('guru.masuk-sebagai', 'Masuk sebagai') + ' <b>' + esc(handle || '—') + '</b> · peran <b>' + esc(guru ? 'guru' : role) + '</b>.'
        + (guru ? ' Sinkron aktif.' : ' Peran ini belum guru, jadi Sinkron masih mati — aktivasi dengan kode undangan guru.') + '</p>';
    var actions = !masuk
      ? '<button type="button" class="tg-btn is-primary is-small" data-tg="account" data-mode="login" data-testid="tg-account-login">' + icon('log-out') + ' ' + t('guru.masuk-akun', 'Masuk akun') + '</button>'
        + '<button type="button" class="tg-btn is-ghost is-small" data-tg="account" data-mode="teacher" data-testid="tg-account-teacher">' + icon('user-round') + ' Punya kode guru</button>'
      : (guru
        ? '<button type="button" class="tg-btn is-danger is-small" data-tg="logout" data-testid="tg-account-logout">' + icon('log-out') + ' Keluar akun</button>'
        : '<button type="button" class="tg-btn is-primary is-small" data-tg="account" data-mode="teacher" data-testid="tg-account-teacher">' + icon('user-round') + ' ' + t('guru.aktivasi-guru', 'Aktivasi guru') + '</button>'
          + '<button type="button" class="tg-btn is-danger is-small" data-tg="logout" data-testid="tg-account-logout">' + icon('log-out') + ' Keluar akun</button>');
    return '<section class="tg-card tg-narrow" data-testid="tg-account"><p class="tg-kicker">Akun</p><h3>' + (guru ? 'Akun guru aktif' : 'Akun') + '</h3>'
      + status + '<div class="tg-actions">' + actions + '</div></section>';
  }

  function curriculumView(c) {
    var sId = ui.curriculumSubject || 'MAT';
    var statusText = ui.curriculumSeeded
      ? (t('guru.status-tersedia', 'Tersedia') + ' ' + (ui.curriculumSeeded.mapel_count || 17) + ' ' + t('guru.mapel-di-mongo', 'mapel di MongoDB') + ' (' + (ui.curriculumSeeded.kompetensi_count || 0) + ' ' + t('guru.kompetensi', 'kompetensi') + ')')
      : t('guru.status-periksa', 'Belum disemai / klik tombol Seed untuk inisialisasi');

    var toolbar = '<div class="tg-curriculum-toolbar">' +
      '<div class="tg-curriculum-actions">' +
        '<label class="tg-label-inline">' + t('guru.pilih-mapel', 'Pilih Mata Pelajaran') + ': ' +
          '<select class="tg-select" data-tg-select="curriculum-subject" data-testid="tg-curriculum-subject-select">' +
            MAPEL_LIST.map(function (m) {
              return '<option value="' + m.id + '"' + (m.id === sId ? ' selected' : '') + '>' + esc(m.id + ' — ' + m.name + ' (' + m.grade + ')') + '</option>';
            }).join('') +
          '</select>' +
        '</label>' +
        '<button type="button" class="tg-btn is-ghost is-small" data-tg="seed-mapel" data-testid="tg-seed-mapel"' + (ui.seeding ? ' disabled' : '') + '>' + icon('database') + ' <span>' + (ui.seeding ? t('guru.sedang-menyemai', 'Sedang menyemai…') : t('guru.semai-mapel', 'Seed 17 Mapel')) + '</span></button>' +
        '<button type="button" class="tg-btn is-ghost is-small" data-tg="seed-english" data-testid="tg-seed-english"' + (ui.seeding ? ' disabled' : '') + '>' + icon('library') + ' <span>' + t('guru.semai-english', 'Seed Bahasa Inggris') + '</span></button>' +
        '<button type="button" class="tg-btn is-ghost is-small" data-tg="seed-soal" data-testid="tg-seed-soal"' + (ui.seeding ? ' disabled' : '') + '>' + icon('clipboard-list') + ' <span>' + t('guru.semai-soal', 'Seed Bank Soal') + '</span></button>' +
      '</div>' +
      '<div class="tg-seed-badge">' + icon('activity') + ' <span>' + esc(statusText) + '</span></div>' +
    '</div>';

    if (ui.curriculumLoading) {
      return '<div class="tg-curriculum-wrap">' + toolbar + '<div class="tg-card tg-center"><p class="tg-muted">' + icon('hourglass') + ' ' + t('guru.memuat-kurikulum', 'Memuat pohon kurikulum dari FastAPI & MongoDB…') + '</p></div></div>';
    }

    if (ui.curriculumError) {
      return '<div class="tg-curriculum-wrap">' + toolbar + '<div class="tg-card tg-center tg-card-warn"><h3>' + t('guru.gagal-muat-kurikulum', 'Kurikulum belum terhubung') + '</h3><p class="tg-muted">' + esc(ui.curriculumError) + '</p><div class="tg-actions"><button type="button" class="tg-btn is-primary is-small" data-tg="seed-mapel">' + icon('database') + ' ' + t('guru.coba-seed-mongo', 'Inisialisasi & Seed MongoDB') + '</button><button type="button" class="tg-btn is-ghost is-small" data-tg="refresh-curriculum">' + icon('rotate-cw') + ' ' + t('umum.coba-lagi', 'Coba lagi') + '</button></div></div></div>';
    }

    var tree = ui.curriculumTree || [];
    if (!tree.length) {
      return '<div class="tg-curriculum-wrap">' + toolbar + '<div class="tg-card tg-center"><h3>' + t('guru.kurikulum-kosong', 'Bank kurikulum mapel ini belum memiliki data di MongoDB') + '</h3><p class="tg-muted">' + t('guru.silakan-tekan-seed', 'Tekan tombol "Seed 17 Mapel" di atas untuk mengisi database FastAPI & MongoDB secara otomatis.') + '</p><button type="button" class="tg-btn is-primary" data-tg="seed-mapel">' + icon('database') + ' ' + t('guru.semai-sekarang', 'Seed 17 Mapel Sekarang') + '</button></div></div>';
    }

    function renderNode(node) {
      var nType = node.type || 'node';
      var nTitle = esc(node.name || node.title || node.code || '');
      var nCode = esc(node.code || '');
      var nDesc = esc(node.description || node.materi || '');
      var bloom = node.bloom_level ? ('<span class="tg-bloom-badge">' + esc(node.bloom_level) + '</span>') : '';
      var children = node.children || [];

      if (nType === 'competency') {
        return '<div class="tg-comp-row" data-testid="tg-comp-' + nCode + '">' +
          '<div class="tg-comp-info">' +
            '<div class="tg-comp-head"><span class="tg-comp-code">' + nCode + '</span>' + bloom + '<b>' + nTitle + '</b></div>' +
            (nDesc ? '<p class="tg-comp-desc">' + nDesc + '</p>' : '') +
          '</div>' +
          '<div class="tg-comp-actions">' +
            '<button type="button" class="tg-btn is-primary is-small" data-tg="create-assign-from-comp" data-code="' + nCode + '" data-title="' + nTitle + '" data-desc="' + nDesc + '" data-mode="latihan" data-testid="tg-assign-comp-' + nCode + '">' +
              icon('plus') + ' ' + t('guru.buat-tugas-dari-kompetensi', '+ Buat Tugas') +
            '</button>' +
            '<button type="button" class="tg-btn is-ghost is-small" data-tg="create-assign-from-comp" data-code="' + nCode + '" data-title="' + nTitle + '" data-desc="' + nDesc + '" data-mode="ujian" data-testid="tg-exam-comp-' + nCode + '">' +
              icon('shield') + ' ' + t('guru.buat-ujian-dari-kompetensi', '+ Buat Ujian') +
            '</button>' +
          '</div>' +
        '</div>';
      }

      if (nType === 'tp') {
        return '<div class="tg-tp-item">' +
          '<div class="tg-tp-head"><b>' + icon('target') + ' ' + nTitle + '</b><small>' + nCode + '</small></div>' +
          (children.length ? ('<div class="tg-tp-children">' + children.map(renderNode).join('') + '</div>') : '') +
        '</div>';
      }

      return '<div class="tg-curriculum-card">' +
        '<div class="tg-curriculum-card-head"><h4>' + icon('bookmark') + ' ' + nTitle + '</h4><small>' + nCode + '</small></div>' +
        (children.length ? ('<div class="tg-curriculum-card-body">' + children.map(renderNode).join('') + '</div>') : '') +
      '</div>';
    }

    return '<div class="tg-curriculum-wrap">' + toolbar + '<div class="tg-curriculum-tree">' + tree.map(renderNode).join('') + '</div></div>';
  }

  function settings() {
    return accountCard() +
      '<section class="tg-card tg-narrow" data-testid="tg-settings"><p class="tg-kicker">Profil guru</p><h3>' + t('guru.nama-sekolah-ttd', 'Nama & sekolah dipakai di tanda tangan laporan') + '</h3><form data-tg-form="teacher" class="tg-form"><label class="tg-label">' + t('guru.nama-panggilan', 'Nama panggilan') + '<input name="name" value="' + esc(st.teacher.name) + '" placeholder="Bu Rina / Pak Dimas" maxlength="40" data-testid="tg-teacher-name"></label><label class="tg-label">Sekolah / lembaga<input name="school" value="' + esc(st.teacher.school) + '" placeholder="SMA Negeri 3 Bandung" maxlength="60" data-testid="tg-teacher-school"></label><div class="tg-actions"><button type="submit" class="tg-btn is-primary is-small" data-testid="tg-teacher-save">' + t('umum.simpan', 'Simpan') + '</button></div></form>' +
      '<hr class="tg-hr"><p class="tg-kicker">Data</p><p class="tg-muted">' + t('guru.data-lokal-warn', 'Semua data KelasKu untuk Guru tersimpan di perangkat ini. Ekspor cadangan sebelum ganti perangkat.') + '</p><div class="tg-actions"><button type="button" class="tg-btn is-ghost is-small" data-tg="export-json">' + icon('download') + ' Ekspor cadangan</button><label class="tg-btn is-ghost is-small">' + icon('upload') + ' Pulihkan cadangan<input type="file" accept="application/json" hidden data-tg-file="import-json"></label><button type="button" class="tg-btn is-ghost is-small" data-tg="clear-all-classes" data-testid="tg-clear-classes">' + icon('trash-2') + ' Bersihkan semua kelas</button><button type="button" class="tg-btn is-danger is-small" data-tg="reset-all" data-testid="tg-reset">' + icon('trash-2') + ' ' + t('guru.hapus-semua-data', 'Hapus semua data guru') + '</button></div></section>';
  }
  var views = { hub: function () { return '<div id="tgClassHub" class="tg-hub-host"></div>'; }, briefing: briefing, classes: classes, assignments: assignments, insights: insights, comms: comms, journal: journal, settings: settings, curriculum: curriculumView };

  // ---- DRAWER siswa -------------------------------------------------------------------------------
  /* Pendeteksi keluar layar: yang ditampilkan di sini adalah UJIAN yang benar-benar punya
     catatan. Murid tanpa catatan tidak memunculkan bagian apa pun — laci ini dibuka guru
     untuk menolong satu murid, dan menambahkan baris "0 kali keluar layar" pada setiap laci
     akan mengubah alat bantu menjadi rapor kecurigaan. */
  function focusPanel(c, s) {
    var T = S(), rows = (c.assignments || []).map(function (a) { var f = T.focusOf ? T.focusOf(a, s) : null; return f && f.n ? { a: a, f: f } : null; }).filter(Boolean);
    if (!rows.length) return '';
    return '<h4>Keluar layar saat mengerjakan</h4><ul class="tg-mini-list" data-testid="tg-focus-list">' + rows.map(function (r) {
      return '<li><span class="tg-focus is-' + T.focusLevel(r.f) + '">' + icon('eye-off') + ' ' + esc(T.focusLabel(r.f)) + '</span> ' + esc(r.a.title) + '</li>';
    }).join('') + '</ul><p class="tg-muted tg-small">Terdeteksi berpindah dari layar FIEZEL saat sesi berjalan. Tanyakan dulu ke muridnya — bisa saja ia dipanggil atau sinyalnya putus.</p>';
  }
  function drawer(c) {
    if (!ui.drawer || !c) return '';
    var T = S(), s = student(ui.drawer); if (!s) return '';
    var r = T.risk(c, s), pend = T.pendingAssignments(c, s), att = T.recentAttendance(s, 7).reverse(), notes = (s.notes || []).slice().reverse(), jr = (c.journal || []).filter(function (j) { return (j.tags || []).indexOf(s.id) !== -1; }).reverse();
    return '<div class="tg-scrim" data-tg="close"></div><aside class="tg-drawer" role="dialog" aria-label="Detail siswa" data-testid="tg-drawer">' +
      '<div class="tg-drawer-head">' + avatar(s, 'lg') + '<div><h3>' + esc(s.name) + '</h3><p class="tg-muted">' + riskPill(r) + ' · ' + (r.inactiveDays == null ? 'belum aktif' : r.inactiveDays === 0 ? 'aktif hari ini' : r.inactiveDays + ' hari tidak belajar') + '</p></div><button type="button" class="tg-icon-btn" data-tg="close" aria-label="' + t('umum.tutup', 'Tutup') + '">' + icon('x') + '</button></div>' +
      '<div class="tg-drawer-body">' +
      '<div class="tg-action-box"><p class="tg-kicker">Tindakan yang disarankan</p><p>' + esc(r.action) + '</p><div class="tg-actions"><button type="button" class="tg-btn is-primary is-small" data-tg="modal" data-kind="greet" data-id="' + s.id + '">' + icon('message-circle-heart') + ' Kartu sapa</button><button type="button" class="tg-btn is-ghost is-small" data-tg="modal" data-kind="parent" data-id="' + s.id + '">' + icon('file-text') + ' Laporan ortu</button><button type="button" class="tg-btn is-ghost is-small" data-tg="modal" data-kind="assign" data-target="' + s.id + '"' + (r.weak ? ' data-skill="' + r.weak.skill + '"' : '') + '>' + icon('plus') + ' ' + t('guru.tugas-khusus', 'Tugas khusus') + '</button></div></div>' +
      '<h4>Skill</h4><div class="tg-skill-rows">' + (T.activeSkills ? T.activeSkills(c, s) : T.SKILL_ORDER).map(function (k) { var v = T.skillAcc(s, k); var lbl = T.SKILL_LABEL[k] || (k.indexOf('KOMP-') === 0 ? k.replace(/^KOMP-/, '') : k); return '<div class="tg-skill-row"><span>' + esc(lbl) + '</span>' + bar(v, v != null && v < 0.5 ? 'is-warn' : '') + '<b>' + pct(v) + '</b></div>'; }).join('') + '</div>' +
      '<h4>Kehadiran 7 hari</h4><div class="tg-att-strip">' + att.map(function (a) { return '<span class="is-' + (a.v || 'none') + '" title="' + a.date + '">' + (a.v || '·') + '</span>'; }).join('') + '</div>' +
      focusPanel(c, s) +
      '<h4>' + t('umum.tugas', 'Tugas') + '</h4>' + (pend.length ? '<ul class="tg-mini-list">' + pend.map(function (p) { return '<li>' + esc(p.a.title) + (p.late ? ' <strong class="tg-late">lewat</strong>' : '') + ' <button type="button" class="tg-link" data-tg="mark-done" data-id="' + p.a.id + '" data-sid="' + s.id + '">tandai selesai</button></li>'; }).join('') + '</ul>' : '<p class="tg-muted">Semua tugas selesai.</p>') +
      '<h4>Kontak orang tua</h4><form data-tg-form="phone" data-id="' + s.id + '" class="tg-inline"><input name="phone" inputmode="tel" value="' + esc(s.parentPhone) + '" placeholder="08xx / 62xx" data-testid="tg-phone-input"><button type="submit" class="tg-btn is-small is-ghost" data-testid="tg-phone-save">' + t('umum.simpan', 'Simpan') + '</button></form>' +
      '<h4>Catatan guru</h4><form data-tg-form="note" data-id="' + s.id + '" class="tg-inline"><input name="text" required placeholder="Catatan singkat…" data-testid="tg-note-input"><button type="submit" class="tg-btn is-small is-ghost" data-testid="tg-note-save">' + t('umum.tambah', 'Tambah') + '</button></form>' +
      (notes.length || jr.length ? '<ul class="tg-feed is-compact">' + notes.map(function (n) { return '<li><small>' + esc(T.fmtDate(n.at)) + '</small><p>' + esc(n.text) + '</p></li>'; }).join('') + jr.map(function (j) { return '<li class="is-journal"><small>' + esc(T.fmtDate(j.at)) + ' · jurnal</small><p>' + esc(j.text) + '</p></li>'; }).join('') + '</ul>' : '') +
      '<div class="tg-actions tg-drawer-foot"><button type="button" class="tg-btn is-danger is-small" data-tg="delete-student" data-id="' + s.id + '">' + icon('user-minus') + ' ' + t('guru.hapus-dari-kelas', 'Hapus dari kelas') + '</button></div></div></aside>';
  }

  // ---- MODAL --------------------------------------------------------------------------------------
  function modal(c) {
    if (!ui.modal) return '';
    var m = ui.modal, T = S(), body = '', title = '', wide = false;
    if (m.kind === 'new-class' || m.kind === 'edit-class') {
      var e = m.kind === 'edit-class' ? c : null; title = e ? t('guru.ubah-kelas', 'Ubah kelas') : t('guru.kelas-baru', 'Kelas baru');
      body = '<form data-tg-form="' + m.kind + '" class="tg-form"><label class="tg-label">' + t('guru.nama-kelas', 'Nama kelas') + '<input name="name" required maxlength="60" value="' + esc(e ? e.name : '') + '" placeholder="English A2 — Kelas 10A" data-autofocus data-testid="tg-class-name"></label><div class="tg-form-row"><label class="tg-label">Level<select name="level" data-testid="tg-class-level">' + ['A1', 'A2', 'B1', 'B2', 'C1'].map(function (l) { return '<option' + ((e ? e.level : 'A2') === l ? ' selected' : '') + '>' + l + '</option>'; }).join('') + '</select></label><label class="tg-label">Mata pelajaran<input name="subject" value="' + esc(e ? e.subject : 'English') + '" maxlength="40"></label></div><label class="tg-label">Kode kelas (mis. FZ-QVQDHM)<input name="code" value="' + esc(e ? e.code : '') + '" placeholder="FZ-XXXXXX (otomatis atau gunakan kode sekolah)" maxlength="16"></label><div class="tg-actions"><button type="submit" class="tg-btn is-primary" data-testid="tg-class-submit">' + (e ? t('umum.simpan', 'Simpan') : t('guru.buat-kelas', 'Buat kelas')) + '</button>' + (e ? '' : '<button type="button" class="tg-btn is-ghost" data-tg="seed-demo">Atau muat kelas contoh</button>') + '</div></form>';
    } else if (m.kind === 'add-students') {
      title = t('guru.tambah-siswa', 'Tambah siswa');
      body = '<form data-tg-form="add-students" class="tg-form"><label class="tg-label">' + t('guru.nama-siswa-baris', 'Nama siswa — satu per baris, atau tempel daftar absen') + '<textarea name="names" rows="6" required placeholder="1. Rina Kartika\n2. Dimas Prasetyo\nSari, Bagas, Nadia" data-autofocus data-testid="tg-add-names"></textarea></label><p class="tg-muted">Nomor urut dan nama belakang dibuang otomatis — FIEZEL hanya menyimpan nama depan.</p><div class="tg-actions"><button type="submit" class="tg-btn is-primary" data-testid="tg-add-submit">Tambahkan</button><button type="button" class="tg-btn is-ghost" data-tg="modal" data-kind="import-code">Punya kode hasil murid?</button></div></form>';
    } else if (m.kind === 'import-code') {
      title = 'Tempel kode hasil murid';
      body = '<form data-tg-form="import-code" class="tg-form"><p class="tg-muted">' + t('guru.murid-menyalin', 'Murid menyalin') + ' <b>Kode hasil untuk tutor</b> dari Today Plan-nya (Peta → ringkasan). Kode hanya berisi nama depan + akurasi per skill. Tugas yang cocok otomatis dinilai selesai.</p><textarea name="code" rows="4" required placeholder="Tempel kode di sini…" data-autofocus data-testid="tg-import-code"></textarea>' + (m.error ? '<p class="tg-error">' + esc(m.error) + '</p>' : '') + '<div class="tg-actions"><button type="submit" class="tg-btn is-primary" data-testid="tg-import-submit">Masukkan ke ' + esc(c.name) + '</button></div></form>';
    } else if (m.kind === 'assign') {
      title = t('guru.buat-tugas-ujian', 'Buat tugas / ujian'); wide = true;
      var C = root.FiezelCurriculum;
      var mapelAvailable = 0;
      var tab = ui.assignTab || (m.tab || 'mapel');
      var curPhase = ui.curriculumPhase || (c && c.level === 'A1' ? 'fase_d' : c && (c.level === 'B1' || c.level === 'B2') ? 'fase_f' : 'fase_d');
      var phases = C ? C.getPhases() : [];
      var units = C ? C.getUnits({ phaseId: curPhase }) : [];
      var selUnitId = ui.curriculumUnitId || (units[0] ? units[0].id : null);
      var curUnit = C && selUnitId ? C.getUnit(selUnitId) : (units[0] || null);
      var skills = T.SKILL_ORDER.filter(function (k) { return k !== 'speaking'; }), pre = m.skill || 'past_tense', tgt = m.target ? [m.target] : [];

      var tabHeader = '<div class="tg-assign-tabs">' +
        '<button type="button" class="tg-tab-btn' + (tab === 'mapel' ? ' is-active' : '') + '" data-tg="assign-tab" data-tab="mapel">' + icon('library') + ' 🏛️ ' + esc(t('guru.tab-kurikulum-nasional', 'Kurikulum Nasional (17 Mapel)')) + '</button>' +
        '<button type="button" class="tg-tab-btn' + (tab === 'curriculum' ? ' is-active' : '') + '" data-tg="assign-tab" data-tab="curriculum">' + icon('notebook-pen') + ' 📘 ' + esc(t('guru.tab-kurikulum-inggris', 'Bahasa Inggris (Kurmer)')) + '</button>' +
        '<button type="button" class="tg-tab-btn' + (tab === 'skills' ? ' is-active' : '') + '" data-tg="assign-tab" data-tab="skills">' + icon('sparkles') + ' ⚡ ' + esc(t('guru.tab-bank-cepat', 'Latihan cepat per skill (A2)')) + '</button>' +
        '</div>';

      var tabContent = '';
      if (tab === 'mapel') {
        var curSId = m.subjectId || ui.assignSubject || ui.curriculumSubject || 'MAT';
        var mCode = m.compCode || ui.assignCompCode || '';
        var mTitle = m.compTitle || ui.assignCompTitle || '';
        var catItem = MAPEL_CATALOG[curSId] || MAPEL_CATALOG['MAT'];

        var comps = [];
        if (ui.curriculumTree && ui.curriculumTree.length) {
          (function walkTree(arr) {
            if (!Array.isArray(arr)) return;
            for (var i = 0; i < arr.length; i++) {
              var nd = arr[i];
              if (nd.type === 'competency') {
                var cGrade = nd.grade;
                if (!cGrade && nd.code) {
                  var gm = nd.code.match(/-(\d+)-/);
                  if (gm) cGrade = parseInt(gm[1], 10);
                }
                comps.push({
                  code: nd.code || nd.id,
                  name: nd.name || nd.title || '',
                  materi: nd.description || nd.materi || '',
                  grade: cGrade || 7,
                  cpRef: nd.cpRef || ''
                });
              }
              if (nd.children) walkTree(nd.children);
            }
          })(ui.curriculumTree);
        }
        if (!comps.length && catItem && catItem.competencies) {
          comps = catItem.competencies.map(function (c) {
            var cGrade = c.grade;
            if (!cGrade && c.code) {
              var gm = c.code.match(/-(\d+)-/);
              if (gm) cGrade = parseInt(gm[1], 10);
            }
            return {
              code: c.code,
              name: c.name,
              materi: c.materi || '',
              grade: cGrade || 7,
              cpRef: c.cpRef || ''
            };
          });
        }

        /* Hitung nomor Bab (babNum) berurutan per jenjang kelas agar persis buku siswa */
        var gradeBabCounts = {};
        for (var cIdx = 0; cIdx < comps.length; cIdx++) {
          var cg = comps[cIdx].grade || 7;
          if (!gradeBabCounts[cg]) gradeBabCounts[cg] = 0;
          gradeBabCounts[cg]++;
          comps[cIdx].babNum = gradeBabCounts[cg];
        }

        var curGradeFilter = ui.assignGradeFilter || 'all';
        var availableGrades = [];
        for (var gi = 0; gi < comps.length; gi++) {
          var gr = comps[gi].grade || 7;
          if (availableGrades.indexOf(gr) === -1) availableGrades.push(gr);
        }
        availableGrades.sort(function (a, b) { return a - b; });

        var displayedComps = comps;
        if (curGradeFilter !== 'all') {
          var targetGrade = parseInt(curGradeFilter, 10);
          displayedComps = comps.filter(function (c) { return c.grade === targetGrade; });
          if (!displayedComps.length) displayedComps = comps;
        }

        if (!mCode && displayedComps.length) {
          mCode = displayedComps[0].code;
          mTitle = displayedComps[0].name;
        }

        var curCompObj = null;
        for (var ci = 0; ci < comps.length; ci++) {
          if (comps[ci].code === mCode || comps[ci].name === mTitle) {
            curCompObj = comps[ci];
            break;
          }
        }
        if (!curCompObj && displayedComps.length) {
          curCompObj = displayedComps[0];
          mCode = curCompObj.code;
          mTitle = curCompObj.name;
        }
        var curMateri = (curCompObj && curCompObj.materi) || '';
        var curGrade = curCompObj ? (curCompObj.grade || 7) : 7;
        var curBabNum = curCompObj ? (curCompObj.babNum || 1) : 1;

        var qData = getMapelQuestionsForCompetency(curSId, mCode);
        var allQItems = qData.items || [];
        var totalAvailable = allQItems.length;
        mapelAvailable = totalAvailable;

        var subjectSelect = '<label class="tg-label">' + t('guru.pilih-mapel-tugas', 'Pilih Mata Pelajaran (17 Mapel)') +
          '<select name="subject_id" data-tg-select="assign-subject" class="tg-select-unit" data-testid="tg-assign-subject-select">' +
            MAPEL_LIST.map(function (mItem) {
              return '<option value="' + mItem.id + '"' + (mItem.id === curSId ? ' selected' : '') + '>' + esc(mItem.id + ' — ' + mItem.name + ' (' + mItem.grade + ')') + '</option>';
            }).join('') +
          '</select></label>';

        var chapterCardsHtml = '';
        if (displayedComps.length) {
          chapterCardsHtml = '<div class="tg-chapter-cards-grid">' +
            displayedComps.map(function (cItem) {
              var isSel = (cItem.code === mCode || cItem.name === mTitle);
              var qCount = (getMapelQuestionsForCompetency(curSId, cItem.code).items || []).length;
              return '<button type="button" class="tg-chapter-card' + (isSel ? ' is-active' : '') + '" data-tg="select-bab" data-code="' + esc(cItem.code) + '" data-title="' + esc(cItem.name) + '" data-testid="tg-assign-bab-card-' + cItem.babNum + '">' +
                '<div class="tg-chap-top">' +
                  '<span class="tg-chap-pill">📖 ' + esc(t('guru.bab-label', 'Bab')) + ' ' + cItem.babNum + '</span>' +
                  '<span class="tg-chap-grade">' + esc(t('guru.kelas-label', 'Kelas')) + ' ' + cItem.grade + '</span>' +
                '</div>' +
                '<h5 class="tg-chap-title">' + esc(cItem.name) + '</h5>' +
                '<div class="tg-chap-meta">' +
                  '<span class="tg-chap-count">📚 ' + qCount + ' ' + esc(t('guru.soal-count', 'soal')) + '</span>' +
                  (isSel ? '<span class="tg-chap-selected-pill">✓ ' + esc(t('guru.terpilih', 'Aktif')) + '</span>' : '') +
                '</div>' +
              '</button>';
            }).join('') +
          '</div>';
        }

        var gradeFilterHtml = '';
        if (availableGrades.length > 1) {
          gradeFilterHtml = '<div class="tg-grade-filter-row">' +
            '<span class="tg-filter-label">' + esc(t('guru.jenjang-kelas-label', '🎯 Jenjang Kelas:')) + '</span>' +
            '<button type="button" class="tg-grade-pill' + (curGradeFilter === 'all' ? ' is-active' : '') + '" data-tg="filter-grade" data-grade="all">' + esc(t('guru.semua-kelas', 'Semua Kelas')) + '</button>' +
            availableGrades.map(function (gr) {
              return '<button type="button" class="tg-grade-pill' + (curGradeFilter === String(gr) ? ' is-active' : '') + '" data-tg="filter-grade" data-grade="' + gr + '">' + esc(t('guru.kelas-label', 'Kelas')) + ' ' + gr + '</button>';
            }).join('') +
          '</div>';
        }

        var compSelectHtml = '';
        if (comps.length) {
          var groupedByGrade = {};
          comps.forEach(function (c) {
            var gKey = c.grade || 7;
            if (!groupedByGrade[gKey]) groupedByGrade[gKey] = [];
            groupedByGrade[gKey].push(c);
          });

          var optGroupsHtml = Object.keys(groupedByGrade).sort(function (a, b) { return Number(a) - Number(b); }).map(function (gKey) {
            var groupItems = groupedByGrade[gKey];
            var opts = groupItems.map(function (cItem) {
              var isSel = (cItem.code === mCode || cItem.name === mTitle);
              var qCount = (getMapelQuestionsForCompetency(curSId, cItem.code).items || []).length;
              var label = '📖 ' + t('guru.bab-label', 'Bab') + ' ' + cItem.babNum + ': ' + cItem.name + ' (' + qCount + ' ' + t('guru.soal-count', 'soal') + ')';
              return '<option value="' + esc(cItem.code) + '" data-title="' + esc(cItem.name) + '" data-materi="' + esc(cItem.materi || '') + '"' + (isSel ? ' selected' : '') + '>' +
                esc(label) +
              '</option>';
            }).join('');
            return '<optgroup label="📚 ' + esc(t('guru.kelas-label', 'Kelas')) + ' ' + gKey + ' SMP / Fase D">' + opts + '</optgroup>';
          }).join('');

          compSelectHtml = '<div class="tg-bab-section">' +
            '<div class="tg-bab-header-row">' +
              '<label class="tg-label">📖 <b>' + esc(t('guru.pilih-bab-buku-ajar', 'Pilih Bab Buku Ajar (Kurikulum Merdeka)')) + '</b></label>' +
              gradeFilterHtml +
            '</div>' +
            chapterCardsHtml +
            '<select name="comp_select" data-tg-select="assign-comp-select" class="tg-select-unit tg-bab-select" data-testid="tg-assign-comp-select">' +
              optGroupsHtml +
            '</select>' +
          '</div>';
        }

        var compInputs = '<input type="hidden" name="comp_code" value="' + esc(mCode) + '" data-testid="tg-assign-comp-code">' +
          '<input type="hidden" name="comp_title" value="' + esc(mTitle) + '" data-testid="tg-assign-comp-title">';

        var subTopicsHtml = '';
        if (curMateri) {
          var rawSubs = curMateri.split(/,|;/).map(function (s) {
            return s.trim().replace(/^(dan|serta)\s+/i, '');
          }).filter(Boolean);

          if (rawSubs.length) {
            subTopicsHtml = '<div class="tg-subbab-box">' +
              '<div class="tg-subbab-head">🎯 <b>' + esc(t('guru.subbab-topik-bab', 'Sub-bab & Indikator Materi di Bab Ini:')) + '</b></div>' +
              '<div class="tg-subbab-list">' +
                rawSubs.map(function (st, sIdx) {
                  return '<div class="tg-subbab-item">' +
                    '<span class="tg-subbab-badge">📌 ' + esc(t('guru.subbab-label', 'Sub-bab')) + ' ' + curBabNum + '.' + (sIdx + 1) + '</span>' +
                    '<span class="tg-subbab-title">' + esc(st) + '</span>' +
                  '</div>';
                }).join('') +
              '</div>' +
            '</div>';
          }
        }

        var topicSummaryCard = '<div class="tg-topic-summary-card">' +
          '<div class="tg-topic-badge-row">' +
            '<span class="tg-badge is-subject">' + esc(catItem ? catItem.name : curSId) + '</span>' +
            '<span class="tg-badge is-grade">' + esc(t('guru.kelas-label', 'Kelas')) + ' ' + curGrade + '</span>' +
            '<span class="tg-badge is-bab">📖 ' + esc(t('guru.bab-label', 'Bab')) + ' ' + curBabNum + '</span>' +
            '<span class="tg-badge is-count">📚 ' + totalAvailable + ' ' + esc(t('guru.soal-tersedia-bab', 'Soal Siap Pakai di Bab Ini')) + '</span>' +
          '</div>' +
          '<h4 class="tg-topic-title">📖 ' + esc(t('guru.bab-label', 'Bab')) + ' ' + curBabNum + ': ' + esc(mTitle || (catItem ? catItem.name : curSId)) + '</h4>' +
          subTopicsHtml +
        '</div>';

        var briefCard = '';
        if (catItem && catItem.teachingBrief) {
          var tb = catItem.teachingBrief;
          briefCard = '<details class="tg-brief-accordion" data-testid="tg-mapel-brief">' +
            '<summary class="tg-brief-summary-toggle">' +
              '<span>💡 <b>' + esc(t('guru.panduan-mengajar-buka', 'Panduan Mengajar Guru & Miskonsepsi Siswa')) + '</b> <small class="tg-muted">(' + esc(t('guru.klik-buka-panduan', 'Apersepsi 5 Menit, Rumus & Trap Miskonsepsi')) + ')</small></span>' +
              '<span class="tg-accordion-arrow">▼</span>' +
            '</summary>' +
            '<div class="tg-brief-card">' +
              '<div class="tg-brief-head"><span class="tg-badge">💡 ' + esc(t('guru.panduan-mengajar', 'Panduan mengajar')) + '</span><h4>' + esc(catItem.name + (mTitle ? ' — ' + mTitle : '')) + '</h4><span class="tg-cefr-pill">' + esc(catItem.grade) + '</span></div>' +
              '<p class="tg-brief-summary">' + esc(tb.summary) + '</p>' +
              '<div class="tg-brief-grid">' +
                '<div class="tg-brief-col"><b>' + esc(t('guru.apersepsi-5-menit', '🎤 Apersepsi 5 Menit (Hook Kelas):')) + '</b><p>' + esc(tb.hook5Minutes) + '</p></div>' +
                '<div class="tg-brief-col"><b>' + esc(t('guru.papan-tulis-rumus', '📋 Rumus / Konsep Papan Tulis:')) + '</b><code>' + esc(tb.boardFormula) + '</code></div>' +
              '</div>' +
              (tb.commonMisconceptions && tb.commonMisconceptions.length ? '<div class="tg-brief-miscons"><b>' + esc(t('guru.top-miskonsepsi', '⚠️ Top Miskonsepsi Siswa:')) + '</b><ul>' + tb.commonMisconceptions.map(function (mc) { return '<li><b>' + esc(mc.trap) + ':</b> ' + esc(mc.pattern) + ' ➔ <em>' + esc(mc.fix) + '</em></li>'; }).join('') + '</ul></div>' : '') +
            '</div></details>';
        }

        var qCardsHtml = allQItems.map(function (qItem, qIdx) {
          var diff = qItem.difficulty || 'sedang';
          var diffLabel = diff === 'dasar' ? t('guru.diff-dasar', '🟢 Dasar') : (diff === 'tinggi' ? t('guru.diff-tinggi', '🔴 Tantangan') : t('guru.diff-sedang', '🟡 Sedang'));
          var optsHtml = (qItem.options || []).map(function (optText, oIdx) {
            var isAns = (oIdx === qItem.answer);
            var letter = String.fromCharCode(65 + oIdx);
            return '<div class="tg-q-opt' + (isAns ? ' is-correct' : '') + '">' +
              '<span class="tg-opt-letter">' + letter + '.</span>' +
              '<span class="tg-opt-text">' + esc(optText) + '</span>' +
              (isAns ? '<span class="tg-correct-pill">✓ ' + esc(t('guru.kunci', 'Kunci')) + '</span>' : '') +
            '</div>';
          }).join('');

          var whyKey = qItem.answer;
          var mainWhy = (qItem.why && (qItem.why[whyKey] || qItem.why[String(whyKey)])) || '';
          var trapHtml = '';
          if (qItem.distractorWhy) {
            var traps = [];
            for (var dKey in qItem.distractorWhy) {
              if (qItem.distractorWhy.hasOwnProperty(dKey) && Number(dKey) !== whyKey) {
                var dLetter = String.fromCharCode(65 + Number(dKey));
                traps.push('<div><span class="tg-trap-note">⚠️ ' + esc(t('guru.jebakan-opsi', 'Miskonsepsi Opsi')) + ' ' + dLetter + ':</span> ' + esc(qItem.distractorWhy[dKey]) + '</div>');
              }
            }
            if (traps.length) trapHtml = traps.join('');
          }

          var explanationHtml = (mainWhy || trapHtml) ? (
            '<details class="tg-q-explanation">' +
              '<summary class="tg-q-exp-toggle">💡 ' + esc(t('guru.lihat-pembahasan', 'Lihat Pembahasan & Catatan Guru')) + '</summary>' +
              '<div class="tg-q-exp-body">' +
                (mainWhy ? '<p><b>' + esc(t('guru.kunci-konsep', 'Konsep Jawaban:')) + '</b> ' + esc(mainWhy) + '</p>' : '') +
                trapHtml +
              '</div>' +
            '</details>'
          ) : '';

          return '<div class="tg-qcard">' +
            '<div class="tg-qcard-top">' +
              '<label class="tg-qcard-label">' +
                '<input type="checkbox" name="selected_q_idx" value="' + qIdx + '" class="tg-q-checkbox" data-tg-check="q-select" checked>' +
                '<span class="tg-q-num">#' + (qIdx + 1) + '</span>' +
              '</label>' +
              '<span class="tg-diff-badge is-' + esc(diff) + '">' + esc(diffLabel) + '</span>' +
            '</div>' +
            '<div class="tg-qcard-prompt">' + esc(qItem.prompt) + '</div>' +
            '<div class="tg-qcard-options">' + optsHtml + '</div>' +
            explanationHtml +
          '</div>';
        }).join('');

        var previewCard = '<div class="tg-qbank-section" data-testid="tg-mapel-preview">' +
          '<div class="tg-qbank-header">' +
            '<div class="tg-qbank-title-group">' +
              '<h5>📚 ' + esc(t('guru.daftar-soal-bab', 'Bank Soal di Bab Ini')) + ' <span class="tg-count-pill" data-tg-q-count-label>' + totalAvailable + ' ' + esc(t('guru.soal-tersedia', 'Soal Siap Pakai')) + '</span></h5>' +
              '<p class="tg-muted tg-small">' + esc(t('guru.sub-daftar-soal', 'Guru dapat melihat butir soal, kunci jawaban (hijau), pembahasan, dan memilih soal yang ingin diterbitkan.')) + '</p>' +
            '</div>' +
            '<div class="tg-qbank-quick-btns">' +
              '<button type="button" class="tg-q-quick-btn" data-tg="quick-count" data-count="5">⚡ ' + esc(t('guru.pilih-5-soal', 'Pilih 5 Soal (Latihan)')) + '</button>' +
              '<button type="button" class="tg-q-quick-btn" data-tg="quick-count" data-count="10">📝 ' + esc(t('guru.pilih-10-soal', 'Pilih 10 Soal (Ulangan)')) + '</button>' +
              '<button type="button" class="tg-q-quick-btn" data-tg="quick-count" data-count="' + totalAvailable + '">💯 ' + esc(t('guru.pilih-semua-soal', 'Pilih Semua')) + ' (' + totalAvailable + ')</button>' +
            '</div>' +
          '</div>' +
          '<div class="tg-qbank-list">' + qCardsHtml + '</div>' +
        '</div>';

        tabContent = '<input type="hidden" name="assign_source" value="mapel">' +
          subjectSelect + compSelectHtml + compInputs + topicSummaryCard + briefCard + previewCard;
      } else if (tab === 'curriculum' && C) {
        var phasePills = '<div class="tg-phase-pills">' + phases.map(function (p) {
          return '<button type="button" class="tg-chip' + (curPhase === p.id ? ' is-active' : '') + '" data-tg="assign-phase" data-phase="' + p.id + '"><b>' + esc(p.name) + '</b><small>' + esc(p.cefr) + '</small></button>';
        }).join('') + '</div>';

        var unitSelect = '<label class="tg-label">' + t('guru.pilih-bab-kurikulum', 'Pilih Bab / Genre Materi Kurikulum Merdeka') + '<select name="unit_id" data-tg-select="unit" class="tg-select-unit">' + units.map(function (u) {
          return '<option value="' + u.id + '"' + (curUnit && curUnit.id === u.id ? ' selected' : '') + '>' + esc(t('guru.opsi-bab', 'Kelas {kelas} (Sem {sem}) · {genre} — {judul}')
            .replace('{kelas}', u.grade).replace('{sem}', u.semester).replace('{genre}', u.genre).replace('{judul}', u.title)) + '</option>';
        }).join('') + '</select></label>';

        var subs = curUnit ? C.getSubChapters(curUnit.id) : [];
        var curSub = ui.curriculumSub || '';
        if (curSub && subs.every(function (sc) { return sc.id !== curSub; })) curSub = '';
        var subSelect = subs.length
          ? '<label class="tg-label">' + t('guru.pilih-subbab', 'Fokus sub-bab (opsional)') +
            '<select name="sub_id" data-tg-select="sub" class="tg-select-unit" data-testid="tg-assign-sub">' +
            '<option value="">' + esc(t('guru.subbab-semua', 'Seluruh bab — semua sub-bab')) + '</option>' +
            subs.map(function (sc) {
              var n = C.pickItems(curUnit.id, 99, { subChapter: sc.id }).length;
              return '<option value="' + sc.id + '"' + (curSub === sc.id ? ' selected' : '') + '>' + esc(sc.no + ' · ' + sc.title) + ' (' + n + ' soal)</option>';
            }).join('') + '</select></label>'
          : '';
        var fitur = curUnit ? C.getFeatures(curUnit.id, curSub) : [];
        var featureBox = fitur.length > 1
          ? '<label class="tg-label">' + t('guru.pilih-fitur', 'Materi yang diujikan — kosongkan berarti semua') + '</label>' +
            '<div class="tg-chips tg-chips-select" data-testid="tg-assign-features">' + fitur.map(function (f) {
              var n = C.pickItems(curUnit.id, 99, { subChapter: curSub, features: [f] }).length;
              return '<label class="tg-chip is-check"><input type="checkbox" name="features" value="' + esc(f) + '"><span>' + esc(f) + ' <b>(' + n + ')</b></span></label>';
            }).join('') + '</div>'
          : '';
        var tersedia = curUnit ? C.pickItems(curUnit.id, 99, { subChapter: curSub }).length : 0;

        var briefCard = '';
        if (curUnit && curUnit.teachingBrief) {
          var tb = curUnit.teachingBrief;
          briefCard = '<div class="tg-brief-card">' +
            '<div class="tg-brief-head"><span class="tg-badge">💡 ' + esc(t('guru.panduan-mengajar', 'Panduan mengajar')) + '</span><h4>' + esc(curUnit.title) + '</h4><span class="tg-cefr-pill">' + esc(curUnit.targetCefr) + '</span></div>' +
            '<p class="tg-brief-summary">' + esc(tb.summary) + '</p>' +
            '<div class="tg-brief-grid">' +
              '<div class="tg-brief-col"><b>' + t('guru.apersepsi-5-menit', '🎤 Apersepsi 5 Menit (Hook Kelas):') + '</b><p>' + esc(tb.hook5Minutes) + '</p></div>' +
              '<div class="tg-brief-col"><b>📋 Rumus Papan Tulis:</b><code>' + esc(tb.boardFormula) + '</code></div>' +
            '</div>' +
            (tb.commonMisconceptions && tb.commonMisconceptions.length ? '<div class="tg-brief-miscons"><b>⚠️ Top Miskonsepsi Siswa:</b><ul>' + tb.commonMisconceptions.map(function (mc) { return '<li><b>' + esc(mc.trap) + ':</b> ' + esc(mc.pattern) + ' ➔ <em>' + esc(mc.fix) + '</em></li>'; }).join('') + '</ul></div>' : '') +
            (tb.keyVocabulary && tb.keyVocabulary.length ? '<div class="tg-brief-vocab"><b>📖 Kosakata Kunci:</b><div class="tg-vocab-chips">' + tb.keyVocabulary.map(function (v) { return '<span class="tg-vocab-chip">' + esc(v.word) + ' <em>(' + esc(v.meaning) + ')</em></span>'; }).join('') + '</div></div>' : '') +
            '</div>';
        }

        tabContent = '<input type="hidden" name="assign_source" value="curriculum">' +
          phasePills + unitSelect + subSelect + featureBox + briefCard;
      } else {
        tabContent = '<input type="hidden" name="assign_source" value="bank">' +
          '<label class="tg-label">Skill (pilih 1–3)</label><div class="tg-chips tg-chips-select">' + skills.map(function (k) { return '<label class="tg-chip is-check"><input type="checkbox" name="skills" value="' + k + '"' + (k === pre ? ' checked' : '') + ' data-testid="tg-assign-skill-' + k + '"><span>' + esc(T.SKILL_LABEL[k]) + '</span></label>'; }).join('') + '</div>';
      }

      var defaultTitle = '';
      if (tab === 'mapel') {
        var sIdTitle = m.subjectId || ui.assignSubject || ui.curriculumSubject || 'MAT';
        var mObjTitle = MAPEL_LIST.filter(function (x) { return x.id === sIdTitle; })[0] || MAPEL_LIST[0];
        var cT = m.compTitle || ui.assignCompTitle || '';
        defaultTitle = mObjTitle.name + (cT ? ' · ' + cT : '');
      } else if (tab === 'curriculum' && curUnit) {
        defaultTitle = curUnit.title;
      }

      var countOptions = (tab === 'curriculum' && curUnit)
        ? [2, 3, 5, 8, 10, 15].filter(function (n) { return n <= tersedia; }).concat(tersedia && [2, 3, 5, 8, 10, 15].every(function (n) { return n !== tersedia; }) ? [tersedia] : []).sort(function (a, b) { return a - b; })
        : (tab === 'mapel' && mapelAvailable)
          ? [2, 3, 5, 8, 10, 12, 15].filter(function (n) { return n <= mapelAvailable; }).concat(mapelAvailable && [2, 3, 5, 8, 10, 12, 15].every(function (n) { return n !== mapelAvailable; }) ? [mapelAvailable] : []).sort(function (a, b) { return a - b; })
          : [2, 3, 5, 8, 10, 15, 20];

      var curAssignMode = m.mode || ui.assignMode || 'latihan';

      var stepGuide = '<div class="tg-steps-guide" data-testid="tg-steps-guide">' +
        '<div class="tg-step-pill is-active"><span>1</span> <b>' + esc(t('guru.langkah-1-materi', '1. Pilih Materi')) + '</b></div>' +
        '<div class="tg-step-pill"><span>2</span> <b>' + esc(t('guru.langkah-2-mode', '2. Atur Mode & Waktu')) + '</b></div>' +
        '<div class="tg-step-pill"><span>3</span> <b>' + esc(t('guru.langkah-3-terbitkan', '3. Terbitkan untuk Murid')) + '</b></div>' +
      '</div>';

      body = '<form data-tg-form="assign" class="tg-form">' + stepGuide + tabHeader + tabContent +
        '<label class="tg-label">' + t('guru.judul-tugas-bab', 'Judul Tugas / Bab') + '<input name="title" maxlength="80" value="' + esc(defaultTitle) + '" placeholder="' + esc(t('guru.judul-otomatis', 'Kosongkan untuk judul otomatis')) + '" data-testid="tg-assign-title"></label>' +
        '<div class="tg-form-row"><label class="tg-label">' + t('guru.jumlah-soal', 'Jumlah soal') + (tab === 'mapel' && mapelAvailable ? (' <small class="tg-muted">(' + esc(t('guru.tersedia-label', 'tersedia')) + ' ' + mapelAvailable + ' ' + esc(t('guru.soal-di-bab-ini', 'soal di bab ini')) + ')</small>') : (tab === 'curriculum' && curUnit ? ' <small class="tg-muted">(tersedia ' + tersedia + ')</small>' : '')) + '<select name="count">' + countOptions.map(function (n) { return '<option' + (n === (tab === 'mapel' && mapelAvailable ? Math.min(mapelAvailable, 5) : tab === 'curriculum' && curUnit ? Math.min(tersedia, 8) : 5) ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label><label class="tg-label">' + t('guru.tenggat-label', 'Tenggat') + '<input type="date" name="deadline" value="' + T.today(Date.now() + 2 * T.DAY) + '" data-testid="tg-assign-deadline"></label></div>' +
        '<label class="tg-label">' + esc(t('guru.langkah-2-mode', '2. Atur Mode & Waktu')) + '</label><div class="tg-mode"><label class="tg-mode-opt"><input type="radio" name="mode" value="latihan"' + (curAssignMode !== 'ujian' ? ' checked' : '') + '><div><b>🟢 ' + esc(t('guru.mode-latihan-title', 'Mode Latihan Mandiri')) + '</b><small>' + esc(t('guru.mode-latihan-sub', 'Kunci & pembahasan langsung terbuka setelah murid menjawab tiap soal. Cocok untuk PR & belajar mandiri.')) + '</small></div></label><label class="tg-mode-opt"><input type="radio" name="mode" value="ujian"' + (curAssignMode === 'ujian' ? ' checked' : '') + ' data-testid="tg-assign-mode-exam"><div><b>🛡️ ' + esc(t('guru.mode-ujian-title', 'Mode Ujian / Kuis Terjadwal')) + '</b><small>' + esc(t('guru.mode-ujian-sub', 'Ada timer hitung mundur, urutan soal diacak otomatis (anti-contek), nilai terekam otomatis ke rekap guru.')) + '</small></div></label></div>' +
        '<div class="tg-form-row"><label class="tg-label">' + t('guru.durasi-timer-ujian', 'Durasi Timer (khusus Ujian)') + '<select name="timer"><option value="10">10 Menit</option><option value="15" selected>15 Menit</option><option value="20">20 Menit</option><option value="30">30 Menit</option><option value="45">45 Menit</option><option value="60">60 Menit</option></select></label></div>' +
        '<label class="tg-label">Untuk siapa</label><div class="tg-chips tg-chips-select tg-chips-scroll"><label class="tg-chip is-check"><input type="radio" name="scope" value="all"' + (tgt.length ? '' : ' checked') + '><span>Seluruh kelas</span></label>' + c.students.map(function (s) { return '<label class="tg-chip is-check"><input type="checkbox" name="targets" value="' + s.id + '"' + (tgt.indexOf(s.id) !== -1 ? ' checked' : '') + '><span>' + esc(s.name) + '</span></label>'; }).join('') + '</div>' +
        (tab === 'mapel'
          ? '<div class="tg-actions"><button type="submit" class="tg-btn is-primary" data-testid="tg-assign-submit">' + icon('sparkles') + ' ' + t('guru.terbitkan-tugas-mapel', 'Terbitkan Tugas / Ujian Mapel') + '</button></div></form>'
          : tab === 'curriculum'
            ? '<div class="tg-actions"><button type="submit" class="tg-btn is-primary" data-testid="tg-assign-submit">' + icon('sparkles') + ' ' + t('guru.terbitkan-tugas-kurikulum', 'Terbitkan Tugas Kurikulum') + '</button></div></form>'
            : '<div class="tg-actions"><button type="submit" class="tg-btn is-primary" data-testid="tg-assign-submit">' + icon('sparkles') + ' Susun dari bank soal</button></div></form>');
    } else if (m.kind === 'share-assign' || m.kind === 'assign-detail') {
      var a = (c.assignments || []).filter(function (x) { return x.id === m.id; })[0]; if (!a) return '';
      var tg = c.students.filter(function (s) { return T.targeted(a, s); }), notDone = tg.filter(function (s) { return !(a.done && a.done[s.id]); }), code = T.assignmentCode(c, a);
      var teacherName = (st.teacher && st.teacher.name) || 'gurumu';
      var modeLabel = a.mode === 'ujian' ? t('guru.mode-ujian-title', 'Mode Ujian / Kuis Terjadwal') + ' (' + a.timer + ' min)' : t('guru.mode-latihan-title', 'Mode Latihan Mandiri');
      var waMsg = '📢 *TUGAS FIEZEL: ' + a.title + '*\n' +
        'Dari: ' + teacherName + ' · ' + t('umum.kelas', 'Kelas') + ': ' + c.name + ' (' + c.code + ')\n' +
        '📝 ' + a.itemIds.length + ' ' + t('umum.soal', 'Soal') + ' · ' + a.minutes + ' min' + (a.deadline ? ' · Tenggat: ' + a.deadline : '') + ' · Mode: ' + modeLabel + '\n\n' +
        '📱 *Cara Mengerjakan di Aplikasi FIEZEL:*\n' +
        '1. Buka aplikasi FIEZEL\n' +
        '2. Buka bagian "KelasKu" atau "Today Plan"\n' +
        '3. Ketuk "Punya kode tugas dari guru?"\n' +
        '4. Tempel kode tugas di bawah ini:\n\n' +
        code + '\n\n' +
        '✨ Nilai dan progres latihanmu akan otomatis terekam ke sistem guru setelah selesai. Semangat belajar! 💪';
      title = m.kind === 'share-assign' ? t('guru.kirim-tugas-murid', 'Kirim tugas ke murid') : t('guru.status-titik', 'Status:') + ' ' + a.title;
      var canSend = T.syncAvailable() === 'ok', busy = ui.sending === a.id;
      body = (m.kind === 'share-assign' ? '<div class="tg-send-box" data-testid="tg-send-box">' +
          '<div class="tg-delivery-cards">' +
            '<div class="tg-delivery-card is-wa" data-testid="tg-delivery-wa">' +
              '<div class="tg-delivery-head"><h4>' + icon('message-circle') + ' ' + esc(t('guru.opsi-wa-title', 'Bagikan ke WhatsApp Kelas (1-Klik)')) + '</h4><span class="tg-badge" style="background:#16A34A">Paling Praktis</span></div>' +
              '<p class="tg-muted">' + esc(t('guru.opsi-wa-desc', 'Format pesan rapi berisi nama tugas, jumlah soal, dan panduan 4 langkah cara murid membukanya di FIEZEL.')) + '</p>' +
              '<div class="tg-actions" style="margin-top:10px">' +
                '<a class="tg-btn tg-btn-wa" target="_blank" rel="noopener" href="' + T.waLink('', waMsg) + '" data-testid="tg-wa-direct-btn">' + icon('message-circle') + ' ' + esc(t('guru.opsi-wa-title', 'Bagikan ke WhatsApp Kelas (1-Klik)')) + '</a>' +
                '<button type="button" class="tg-btn is-wa-ghost" data-tg="copy" data-text="' + esc(waMsg) + '" data-testid="tg-copy-wa-btn">' + icon('message-square') + ' ' + esc(t('guru.salin-pesan-wa', 'Salin Pesan WhatsApp')) + '</button>' +
              '</div>' +
              '<div class="tg-code-box">' +
                '<label class="tg-label" style="margin-top:10px"><b>' + esc(t('guru.kode-tugas-label', 'Kode Tugas (Bisa Dicatat di Papan Tulis)')) + ':</b></label>' +
                '<textarea class="tg-code" readonly rows="2" data-testid="tg-assign-code">' + esc(code) + '</textarea>' +
                '<div><button type="button" class="tg-btn is-ghost is-small" data-tg="copy" data-text="' + esc(code) + '" data-testid="tg-copy-assign-code">' + icon('copy') + ' ' + esc(t('guru.salin-kode-tugas', 'Salin Kode Tugas')) + '</button></div>' +
              '</div>' +
            '</div>' +
            '<div class="tg-delivery-card is-server" data-testid="tg-delivery-server">' +
              '<div class="tg-delivery-head"><h4>' + icon('send') + ' ' + esc(t('guru.opsi-server-title', 'Kirim Langsung ke Notifikasi Aplikasi')) + '</h4>' + (canSend ? '<span class="tg-ok">' + icon('check') + ' Terhubung Server</span>' : '<span class="tg-muted">' + t('guru.perlu-akun-guru', 'Perlu Akun Guru') + '</span>') + '</div>' +
              '<p class="tg-muted">' + (canSend ? 'Murid yang memakai kode kelas <b class="tg-mono">' + esc(c.code) + '</b> menerima tugas ini di lonceng notifikasi mereka. Sekali ketuk, sesinya langsung terbuka; hasilnya kembali ke sini otomatis.' : t('guru.masuk-untuk-kirim', 'Masuk dengan akun guru dan online untuk mengirim langsung. Sementara itu pakai kode di bawah.')) + '</p>' +
              '<div class="tg-actions" style="margin-top:10px">' +
                (canSend
                  ? '<button type="button" class="tg-btn is-primary" data-tg="send-assign" data-id="' + a.id + '" data-testid="tg-send-all"' + (busy ? ' disabled' : '') + '>' + icon('send') + (busy ? ' Mengirim…' : a.targets ? ' Kirim ke ' + tg.length + ' murid terpilih' : ' ' + t('guru.kirim-semua-murid', 'Kirim ke semua murid')) + '</button>' + (a.sent && a.sent.all ? '<span class="tg-ok">' + icon('check') + ' terkirim ' + esc(T.fmtDate(a.sent.all)) + '</span>' : '')
                  : '<button type="button" class="tg-btn is-ghost" data-tg="modal" data-kind="account-teacher">' + icon('user-check') + ' ' + esc(t('guru.masuk-akun-guru-cta', 'Masuk / Aktivasi Akun Guru')) + '</button>') +
              '</div>' +
            '</div>' +
          '</div></div><hr class="tg-hr">' : '') +
        '<div class="tg-card-head"><h4>' + notDone.length + ' belum selesai · ' + (tg.length - notDone.length) + ' selesai</h4></div><ul class="tg-mini-list tg-send-list">' + tg.map(function (s) { var d = a.done && a.done[s.id], sent = T.sentTo(a, s); return '<li class="' + (d ? 'is-done' : '') + '">' + avatar(s, 'sm') + ' <span class="tg-grow">' + esc(s.name) + (sent && !d ? ' <small class="tg-muted">· terkirim</small>' : '') + '</span>' + (d ? ' <span class="tg-ok">' + pct(d.acc) + '</span>' : (canSend ? '<button type="button" class="tg-btn is-small ' + (sent ? 'is-ghost' : 'is-primary') + '" data-tg="send-assign" data-id="' + a.id + '" data-sid="' + s.id + '" data-testid="tg-send-one-' + s.id + '"' + (busy ? ' disabled' : '') + '>' + icon('send') + (sent ? ' Kirim ulang' : ' Kirim') + '</button>' : '') + ' <button type="button" class="tg-link" data-tg="mark-done" data-id="' + a.id + '" data-sid="' + s.id + '">tandai selesai</button>') + '</li>'; }).join('') + '</ul>' + (notDone.length ? '<div class="tg-actions"><button type="button" class="tg-btn is-ghost is-small" data-tg="copy" data-text="' + esc('Pengingat: tugas *' + a.title + '* belum selesai untuk: ' + notDone.map(function (s) { return s.name; }).join(', ') + (a.deadline ? '. Tenggat ' + a.deadline : '') + '. Semangat! 💪') + '">' + icon('bell') + ' Salin pengingat untuk yang belum</button></div>' : '');
    } else if (m.kind === 'greet' || m.kind === 'parent') {
      var s2 = student(m.id); if (!s2) return '';
      var text = m.kind === 'greet' ? T.greetingCard(c, s2, st.teacher) : T.parentReport(c, s2, st.teacher);
      title = m.kind === 'greet' ? 'Kartu sapa untuk ' + s2.name : 'Laporan untuk orang tua ' + s2.name;
      body = '<p class="tg-muted">' + (m.kind === 'greet' ? 'Disusun dari data ' + s2.name + t('guru.ubah-seperlunya', '. Ubah seperlunya agar terdengar seperti kamu.') : 'Angka diambil langsung dari data. Tanda tangan memakai profil gurumu.') + '</p><textarea class="tg-code is-text" rows="' + (m.kind === 'greet' ? 5 : 12) + '" data-tg-input="draft" data-testid="tg-draft">' + esc(m.draft != null ? m.draft : text) + '</textarea>' +
        '<div class="tg-actions"><button type="button" class="tg-btn is-primary" data-tg="copy-draft" data-testid="tg-copy-draft">' + icon('copy') + ' Salin</button><a class="tg-btn is-ghost" target="_blank" rel="noopener" data-tg="wa-draft" href="' + T.waLink(m.kind === 'parent' ? s2.parentPhone : '', m.draft != null ? m.draft : text) + '" data-testid="tg-wa-draft">' + icon('message-circle') + ' WhatsApp' + (m.kind === 'parent' && s2.parentPhone ? ' ortu' : '') + '</a><button type="button" class="tg-btn is-ghost" data-tg="mark-sent" data-id="' + s2.id + '" data-kind="' + m.kind + '">' + icon('check') + ' Tandai terkirim</button></div>';
    } else if (m.kind === 'weekly-report') {
      title = 'Laporan kelas mingguan';
      body = '<textarea class="tg-code is-text" rows="14" readonly data-testid="tg-weekly-text">' + esc(T.weeklyClassReport(c, st.teacher)) + '</textarea><div class="tg-actions"><button type="button" class="tg-btn is-primary" data-tg="copy" data-text="' + esc(T.weeklyClassReport(c, st.teacher)) + '" data-testid="tg-copy-weekly">' + icon('copy') + ' Salin</button><button type="button" class="tg-btn is-ghost" data-tg="print-weekly">' + icon('printer') + ' Cetak / PDF</button></div>';
    } else if (m.kind === 'announce') {
      title = 'Pengumuman kelas';
      body = '<form data-tg-form="announce" class="tg-form"><textarea name="text" rows="4" required placeholder="Tulis pengumuman…" data-autofocus data-testid="tg-announce-modal-text"></textarea><div class="tg-actions"><button type="submit" class="tg-btn is-primary">' + icon('megaphone') + ' ' + t('guru.simpan-salin', 'Simpan & salin') + '</button><button type="submit" class="tg-btn is-ghost" name="wa" value="1">' + icon('message-circle') + ' WhatsApp</button></div></form>';
    } else if (m.kind === 'attendance') {
      title = 'Absensi cepat'; wide = true; var date = ui.attDate || T.today();
      body = '<div class="tg-att-head"><label class="tg-label">Tanggal<input type="date" value="' + date + '" data-tg-input="att-date" data-testid="tg-att-date"></label><div class="tg-actions"><button type="button" class="tg-btn is-ghost is-small" data-tg="att-all" data-v="H" data-testid="tg-att-all">' + icon('check-check') + ' Semua hadir</button></div></div>' +
        '<ul class="tg-att-list" data-testid="tg-att-list">' + c.students.map(function (s) { var v = (s.attendance || {})[date] || ''; return '<li>' + avatar(s, 'sm') + '<span>' + esc(s.name) + '</span><div class="tg-seg">' + ['H', 'I', 'S', 'A'].map(function (k) { return '<button type="button" class="tg-seg-btn is-' + k + (v === k ? ' is-on' : '') + '" data-tg="att" data-id="' + s.id + '" data-v="' + k + '" title="' + T.ATT[k] + '" data-testid="tg-att-' + s.id + '-' + k + '">' + k + '</button>'; }).join('') + '</div></li>'; }).join('') + '</ul><p class="tg-muted">H hadir · I izin · S sakit · A alpa. Dua alpa dalam seminggu menaikkan skor risiko siswa.</p>';
    } else if (m.kind === 'board') {
      return board(c);
    }
    return '<div class="tg-scrim" data-tg="close"></div><div class="tg-modal' + (wide ? ' is-wide' : '') + '" role="dialog" aria-modal="true" data-testid="tg-modal"><div class="tg-modal-head"><h3>' + esc(title) + '</h3><button type="button" class="tg-icon-btn" data-tg="close" aria-label="Tutup" data-testid="tg-modal-close">' + icon('x') + '</button></div><div class="tg-modal-body">' + body + '</div></div>';
  }
  /** Mode papan: tampilan proyektor tanpa nama — kelas melihat kemajuan bersama, bukan peringkat individu. */
  function board(c) {
    var T = S(), stt = T.classStats(c), map = T.classSkillMap(c), mis = T.misconceptions(c), ag = T.agenda(c);
    return '<div class="tg-board" data-testid="tg-board"><button type="button" class="tg-board-close" data-tg="close" aria-label="' + t('guru.tutup-mode-papan', 'Tutup mode papan') + '">' + icon('x') + ' Tutup</button><p class="tg-board-kicker">' + esc(c.name) + ' · ' + esc(new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })) + '</p><h2>Kemajuan kita minggu ini</h2>' +
      '<div class="tg-board-kpi"><div><b>' + stt.active7 + '<small>/' + stt.total + '</small></b><span>teman yang belajar minggu ini</span></div><div><b>' + pct(stt.avgAcc) + '</b><span>akurasi kelas</span></div><div><b>' + (ag.length ? ag[0].a.deadline || '—' : '—') + '</b><span>' + (ag.length ? 'tenggat: ' + esc(ag[0].a.title) : 'tidak ada tenggat') + '</span></div></div>' +
      '<div class="tg-board-skills">' + map.filter(function (m) { return m.acc != null; }).map(function (m) { return '<div><span>' + esc(m.label) + '</span>' + bar(m.acc, m.acc < 0.5 ? 'is-warn' : '') + '<b>' + pct(m.acc) + '</b></div>'; }).join('') + '</div>' +
      (mis.length ? '<p class="tg-board-focus">' + icon('target') + ' Fokus hari ini: <b>' + esc(mis[0].label) + '</b> — ' + esc(mis[0].pattern) + '</p>' : '') + '</div>';
  }

  // ---- events -----------------------------------------------------------------------------------------
  function closest(e) { return e.target.closest ? e.target.closest('[data-tg]') : null; }
  function onClick(e) {
    var btn = closest(e); if (!btn) return;
    var act = btn.getAttribute('data-tg'), id = btn.getAttribute('data-id'), c = cls(), T = S();
    if (btn.tagName === 'A' && act === 'wa-draft') { return; }
    switch (act) {
      case 'view':
        st.view = btn.getAttribute('data-view');
        if (btn.getAttribute('data-skill')) ui.insightSkill = btn.getAttribute('data-skill');
        ui.modal = null; ui.drawer = null; ui.filter = '';
        if (st.view === 'curriculum' && !ui.curriculumTree && !ui.curriculumLoading) {
          loadCurriculumTree(ui.curriculumSubject || 'MAT');
        }
        if (st.view === 'owner_tokens' && !ui.ownerInvites && !ui.ownerLoading) {
          loadOwnerTeachers();
        }
        break;
      case 'account': openAccount(btn.getAttribute('data-mode') || 'login'); return;
      case 'exit':
        if (previewOn || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('fz-teacher-preview') === '1')) {
          exitPreview(); previewOn = false; exit({ target: 'student' });
        } else {
          persist(); exit();
        }
        return;
      /* Keluar demo TIDAK memanggil persist(): yang tersimpan hanya penyimpanan pratinjau,
         dan yang diinginkan justru membuangnya. */
      case 'demo-exit': exitPreview(); previewOn = false; exit({ target: 'landing' }); return;
      case 'demo-activate': openAccount('teacher'); return;
      case 'logout':
        performTeacherLogout();
        return;
      case 'sync': syncAll(false); return;
      case 'inbox': ui.inbox = !ui.inbox; if (ui.inbox) { T.inboxMarkAllRead(st); } break;
      case 'inbox-clear': st.inbox = []; ui.inbox = false; break;
      case 'inbox-open': {
        var ev = (st.inbox || []).filter(function (x) { return x.id === id; })[0]; ui.inbox = false;
        if (ev) { ev.read = true; if (ev.clsId && st.classes.some(function (k) { return k.id === ev.clsId; })) st.activeClassId = ev.clsId; if (ev.kind === 'join_request') { st.view = 'hub'; ui.modal = null; ui.drawer = null; }
        else if (ev.kind === 'assignment_done' && ev.aid) { st.view = 'assignments'; ui.modal = { kind: 'assign-detail', id: ev.aid }; ui.drawer = null; } else if (ev.sid) { st.view = 'classes'; ui.drawer = ev.sid; ui.modal = null; } }
        break;
      }
      case 'send-assign': {
        if (!c) return;
        var asg = (c.assignments || []).filter(function (x) { return x.id === id; })[0]; if (!asg) return;
        if (T.syncAvailable() !== 'ok') {
          ui.modal = { kind: 'share-assign', id: asg.id };
          toast(T.syncLabel(c).text);
          render();
          return;
        }
        var sid = btn.getAttribute('data-sid'), targets = sid ? [sid] : (asg.targets && asg.targets.length ? asg.targets : null);
        ui.sending = asg.id; render();
        T.sendAssignment(c, asg, targets).then(function (r) {
          ui.sending = null;
          if (r.ok) { saveMinutes(sid ? 1 : 5); toast(sid ? t('guru.toast-kirim-satu', 'Tugas dikirim ke {nama} — muncul di notifikasinya.').replace('{nama}', (student(sid) || {}).name) : t('guru.toast-kirim-banyak', 'Tugas dikirim ke {jumlah} murid — muncul di notifikasi mereka.').replace('{jumlah}', r.count)); }
          else toast(r.error === 'class_code_taken' ? 'Kode kelas dipakai guru lain — ubah kode kelas dulu.' : r.error === 'not_found' ? t('guru.kelas-belum-sinkron', 'Kelas belum terdaftar di server — tekan Sinkron lalu coba lagi.') : t('guru.toast-gagal-kirim', 'Gagal mengirim ({sebab}). Coba lagi.').replace('{sebab}', r.error || 'unknown'));
          persist(); render();
        });
        return;
      }
      case 'modal': ui.modal = { kind: btn.getAttribute('data-kind'), id: id, skill: btn.getAttribute('data-skill'), target: btn.getAttribute('data-target') }; break;
      case 'drawer': ui.drawer = id; ui.modal = null; break;
      case 'close': ui.modal = null; ui.drawer = null; ui.inbox = false; break;
      case 'pick-class': st.activeClassId = id; break;
      case 'insight-skill': ui.insightSkill = btn.getAttribute('data-skill'); break;
      case 'copy': copy(btn.getAttribute('data-text'), 'Tersalin.'); return;
      case 'copy-draft': { var ta = el.querySelector('[data-tg-input="draft"]'); copy(ta ? ta.value : '', 'Pesan tersalin.'); saveMinutes(ui.modal && ui.modal.kind === 'parent' ? 8 : 3); persist(); return; }
      case 'mark-sent': { var s = student(id); if (s) { s.notes.push({ at: Date.now(), text: (btn.getAttribute('data-kind') === 'parent' ? 'Laporan orang tua dikirim.' : 'Kartu sapa dikirim.') }); saveMinutes(btn.getAttribute('data-kind') === 'parent' ? 8 : 3); } ui.modal = null; toast('Dicatat di riwayat ' + (s ? s.name : '') + '.'); break; }
      case 'delete-class': {
        if (!c || !confirm('Hapus kelas "' + c.name + '" beserta ' + c.students.length + ' siswa? Tidak bisa dibatalkan.')) return;
        var delCode = c.code ? S().normalizeClassCode(c.code) : '';
        if (delCode) {
          st.deletedClassCodes = st.deletedClassCodes || {};
          st.deletedClassCodes[delCode] = true;
          try {
            var A = S().account ? S().account() : root.FiezelAccount;
            if (A && typeof A.api === 'function') {
              A.api('/api/teacher/class/delete', { code: delCode }).catch(function () {});
            }
          } catch (_) {}
        }
        st.classes = st.classes.filter(function (k) { return k.id !== c.id; });
        st.activeClassId = st.classes.length ? st.classes[0].id : null;
        toast('Kelas "' + c.name + '" berhasil dihapus.');
        break;
      }
      case 'clear-all-classes': {
        if (!confirm('Bersihkan dan hapus SEMUA kelas di KelasKu?')) return;
        st.classes.forEach(function (k) {
          if (k.code) {
            var dc = S().normalizeClassCode(k.code);
            st.deletedClassCodes = st.deletedClassCodes || {};
            st.deletedClassCodes[dc] = true;
            try {
              var A = S().account ? S().account() : root.FiezelAccount;
              if (A && typeof A.api === 'function') {
                A.api('/api/teacher/class/delete', { code: dc }).catch(function () {});
              }
            } catch (_) {}
          }
        });
        st.classes = [];
        st.activeClassId = null;
        toast('Semua kelas berhasil dibersihkan.');
        break;
      }
      case 'delete-student': if (!c) return; c.students = c.students.filter(function (s) { return s.id !== id; }); ui.drawer = null; toast('Siswa dihapus dari kelas.'); break;
      case 'delete-assign': if (!c || !confirm(t('guru.konfirm-hapus-tugas', 'Hapus tugas ini?'))) return; c.assignments = c.assignments.filter(function (a) { return a.id !== id; }); break;
      case 'mark-done': { var a = c.assignments.filter(function (x) { return x.id === id; })[0], sid = btn.getAttribute('data-sid'); if (a) { a.done = a.done || {}; a.done[sid] = { at: Date.now(), acc: T.skillAcc(student(sid) || {}, a.skills[0]) }; } saveMinutes(1); break; }
      case 'att': { var s3 = student(id), date = ui.attDate || T.today(); if (s3) { var v = btn.getAttribute('data-v'); s3.attendance[date] = s3.attendance[date] === v ? undefined : v; if (!s3.attendance[date]) delete s3.attendance[date]; if (v === 'H' && (!s3.lastActiveAt || T.today(s3.lastActiveAt) < date)) { /* kehadiran ≠ belajar mandiri; jangan ubah lastActiveAt */ } } saveMinutes(0.2); break; }
      case 'att-all': { var dt = ui.attDate || T.today(); c.students.forEach(function (s) { s.attendance[dt] = 'H'; }); saveMinutes(3); toast('Semua ditandai hadir. Ubah yang tidak hadir saja.'); break; }
      case 'export-csv': download(c.name.replace(/\W+/g, '-') + '-siswa.csv', T.csvStudents(c), 'text/csv'); saveMinutes(10); toast('CSV diunduh.'); break;
      case 'export-json': download('fiezel-kelasku-guru-cadangan.json', JSON.stringify(st), 'application/json'); return;
      case 'reset-all': if (!confirm(t('guru.konfirm-hapus-semua', 'Hapus SEMUA data KelasKu untuk Guru di perangkat ini?'))) return; st = T.defaults(); break;
      case 'copy-groups': { var g = T.studyGroups(c, ui.insightSkill); copy('Kelompok belajar ' + T.SKILL_LABEL[ui.insightSkill] + ' — ' + c.name + '\n' + g.map(function (x) { return 'Kelompok ' + x.no + ' (mentor: ' + x.mentor.s.name + '): ' + x.members.map(function (m) { return m.s.name; }).join(', '); }).join('\n'), t('guru.kelompok-tersalin', 'Daftar kelompok tersalin.')); saveMinutes(15); persist(); return; }
      case 'copy-all-parents': copy(c.students.map(function (s) { return '=== ' + s.name + ' ===\n' + T.parentReport(c, s, st.teacher); }).join('\n\n'), c.students.length + ' laporan tersalin.'); saveMinutes(c.students.length * 6); persist(); return;
      case 'print-weekly': { var w = window.open('', '_blank'); if (w) { w.document.write('<pre style="font:15px/1.5 Georgia,serif;white-space:pre-wrap;max-width:720px;margin:40px auto">' + esc(T.weeklyClassReport(c, st.teacher)) + '</pre>'); w.document.close(); w.print(); } saveMinutes(20); persist(); return; }
      case 'create-assign-from-comp': {
        var cSubject = ui.curriculumSubject || 'MAT';
        var code = btn.getAttribute('data-code') || '';
        var cTit = btn.getAttribute('data-title') || '';
        var cMode = btn.getAttribute('data-mode') || 'latihan';
        ui.assignTab = 'mapel';
        ui.assignSubject = cSubject;
        ui.assignCompCode = code;
        ui.assignCompTitle = cTit;
        ui.assignMode = cMode;
        ui.modal = {
          kind: 'assign',
          tab: 'mapel',
          subjectId: cSubject,
          compCode: code,
          compTitle: cTit,
          mode: cMode
        };
        break;
      }
      case 'seed-mapel': runSeedMapel(); return;
      case 'seed-english': runSeedEnglish(); return;
      case 'seed-soal': runSeedSoal(); return;
      case 'refresh-curriculum': loadCurriculumTree(ui.curriculumSubject || 'MAT'); return;
      case 'assign-tab': { ui.assignTab = btn.getAttribute('data-tab'); persist(); render(); return; }
      case 'assign-phase': { ui.curriculumPhase = btn.getAttribute('data-phase'); ui.curriculumUnitId = null; persist(); render(); return; }
      case 'assign-unit': { ui.curriculumUnitId = btn.getAttribute('data-unit'); persist(); render(); return; }
      case 'select-bab': {
        var bCode = btn.getAttribute('data-code');
        var bTitle = btn.getAttribute('data-title') || '';
        ui.assignCompCode = bCode;
        ui.assignCompTitle = bTitle;
        if (ui.modal && ui.modal.kind === 'assign') {
          ui.modal.compCode = bCode;
          ui.modal.compTitle = bTitle;
        }
        persist(); render(); return;
      }
      case 'filter-grade': {
        var fGrade = btn.getAttribute('data-grade') || 'all';
        ui.assignGradeFilter = fGrade;
        persist(); render(); return;
      }
      case 'quick-count': {
        var countReq = parseInt(btn.getAttribute('data-count'), 10) || 5;
        var modalForm = el.querySelector('[data-tg-form="assign"]');
        if (modalForm) {
          var checkboxes = modalForm.querySelectorAll('[data-tg-check="q-select"]');
          var checkedCount = 0;
          checkboxes.forEach(function (cb, idx) {
            cb.checked = (idx < countReq);
            if (cb.checked) checkedCount++;
          });
          var countSel = modalForm.querySelector('[name="count"]');
          if (countSel) {
            var optFound = false;
            for (var oi = 0; oi < countSel.options.length; oi++) {
              if (parseInt(countSel.options[oi].value, 10) === checkedCount) {
                countSel.selectedIndex = oi;
                optFound = true;
                break;
              }
            }
            if (!optFound && checkedCount > 0) {
              var newOpt = document.createElement('option');
              newOpt.value = checkedCount;
              newOpt.textContent = checkedCount;
              newOpt.selected = true;
              countSel.appendChild(newOpt);
            }
          }
          var countLbl = modalForm.querySelector('[data-tg-q-count-label]');
          if (countLbl) {
            countLbl.textContent = checkedCount + ' ' + t('guru.soal-dipilih-pill', 'Soal Dipilih');
          }
        }
        return;
      }
      default: return;
    }
    persist(); render();
  }
  function onSubmit(e) {
    var form = e.target.closest ? e.target.closest('[data-tg-form]') : null; if (!form) return;
    e.preventDefault();
    var kind = form.getAttribute('data-tg-form'), fd = new FormData(form), c = cls(), T = S(), viaWa = e.submitter && e.submitter.name === 'wa';
    if (kind === 'new-class') {
      var k = T.newClass(fd.get('name'), fd.get('level'), fd.get('subject'));
      var customCode = T.normalizeClassCode(fd.get('code'));
      if (customCode) k.code = customCode;
      st.classes.push(k); st.activeClassId = k.id; st.onboarded = true; ui.modal = null; st.view = 'classes';
      toast('Kelas ' + k.name + ' dibuat. Kode: ' + k.code);
      if (S().syncAvailable() === 'ok') setTimeout(function () { syncAll(true); }, 400);
    }
    else if (kind === 'edit-class' && c) {
      c.name = String(fd.get('name')).slice(0, 60);
      c.level = fd.get('level');
      c.subject = fd.get('subject');
      var editCode = T.normalizeClassCode(fd.get('code'));
      if (editCode && editCode !== c.code) { c.code = editCode; if (c.sync) c.sync.claimed = false; }
      else if (c.sync) c.sync.claimed = false;
      ui.modal = null;
    }
    else if (kind === 'add-students' && c) { var names = T.parseNames(fd.get('names')), added = 0; names.forEach(function (n) { var fn = T.firstName(n); if (!c.students.some(function (s) { return s.name.toLowerCase() === fn.toLowerCase(); })) { c.students.push(T.newStudent(fn)); added++; } }); ui.modal = null; st.view = 'classes'; saveMinutes(added * 0.5); toast(added + ' siswa ditambahkan.'); }
    else if (kind === 'import-code' && c) { var p = T.parseLearnerCode(fd.get('code')); if (!p) { ui.modal = { kind: 'import-code', error: 'Kode tidak dikenali. Pastikan menyalin utuh "Kode hasil untuk tutor" dari murid.' }; render(); return; } var res = T.ingest(c, p); ui.modal = null; ui.drawer = res.student.id; saveMinutes(4 + res.graded.length * 5); toast('Hasil ' + res.student.name + ' masuk' + (res.graded.length ? ' · ' + res.graded.length + ' tugas dinilai otomatis' : '') + '.'); }
    else if (kind === 'assign' && c) {
      var srcType = fd.get('assign_source') || 'mapel';
      var count = Number(fd.get('count')) || 5;
      var mode = fd.get('mode') || 'latihan';
      var timer = mode === 'ujian' ? (Number(fd.get('timer')) || 15) : 0;
      var deadline = fd.get('deadline');
      var targets = fd.get('scope') === 'all' ? null : fd.getAll('targets');
      var customItems = [];
      var skills = [];
      var title = '';
      var kurikulumOnly = false;
      var sourceMeta = null;

      if (srcType === 'mapel') {
        var sId = fd.get('subject_id') || 'MAT';
        var cCode = fd.get('comp_code') || '';
        var cTitle = fd.get('comp_title') || '';
        var mObj = MAPEL_LIST.filter(function (x) { return x.id === sId; })[0] || { name: sId };
        title = fd.get('title') || (mObj.name + (cTitle ? ' · ' + cTitle : ' · ' + t('umum.tugas', 'Tugas') + ' ' + sId));
        skills = [sId];
        kurikulumOnly = true;

        var selQIndices = fd.getAll('selected_q_idx');
        var qData = getMapelQuestionsForCompetency(sId, cCode);
        var baseList = qData.items;

        if (selQIndices && selQIndices.length > 0 && baseList && baseList.length > 0) {
          customItems = [];
          for (var si = 0; si < selQIndices.length; si++) {
            var sIdx = parseInt(selQIndices[si], 10);
            var src = baseList[sIdx];
            if (src) {
              var itemObj = {
                id: (src.id || ('q-' + sId.toLowerCase() + '-' + (sIdx + 1))) + '-' + Math.random().toString(36).slice(2, 6),
                prompt: src.prompt,
                options: src.options.slice(),
                answer: src.answer,
                skill: (cCode || sId || 'mat').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 32),
                context: title,
                why: Object.assign({}, src.why)
              };
              if (src.distractorWhy) itemObj.distractorWhy = Object.assign({}, src.distractorWhy);
              var shuffled = shuffleOptions(itemObj, (Date.now() % 997) + si * 31 + sId.charCodeAt(0));
              itemObj.options = shuffled.options;
              itemObj.answer = shuffled.answer;
              itemObj.why = shuffled.why;
              if (shuffled.distractorWhy) itemObj.distractorWhy = shuffled.distractorWhy;
              customItems.push(itemObj);
            }
          }
          count = customItems.length;
        } else {
          customItems = synthesizeMapelQuestions(sId, cCode, cTitle, count);
        }

        sourceMeta = {
          subjectId: sId,
          subjectName: mObj.name,
          compCode: cCode,
          compTitle: cTitle
        };
      } else if (srcType === 'curriculum') {
        var unitId = fd.get('unit_id');
        var C = root.FiezelCurriculum;
        var unit = (C && unitId) ? C.getUnit(unitId) : null;
        if (unit) {
          var fitur = fd.getAll('features');
          customItems = C.pickItems(unitId, count, { avoid: c.sentItemIds || [], features: fitur, subChapter: fd.get('sub_id') || '' });
          skills = [unit.genre];
          kurikulumOnly = true;
          title = fd.get('title') || unit.title;
          sourceMeta = { unitId: unit.id, genre: unit.genre, grade: unit.grade, phaseId: unit.phaseId };
        }
      } else {
        skills = fd.getAll('skills').slice(0, 3);
        title = fd.get('title') || '';
      }

      if (!skills.length && !customItems.length) {
        toast(t('guru.pilih-satu-skill', 'Pilih minimal satu skill atau bab kurikulum.'));
        return;
      }

      var a = T.buildAssignment({
        title: title,
        skills: skills,
        items: customItems,
        count: count,
        deadline: deadline,
        mode: mode,
        timer: timer,
        targets: targets,
        teacher: (st && st.teacher && st.teacher.name) || 'Guru',
        avoid: c.sentItemIds,
        curriculumOnly: kurikulumOnly,
        source: sourceMeta
      });
      c.assignments.push(a);
      c.sentItemIds = (c.sentItemIds || []).concat(a.itemIds).slice(-120);
      st.view = 'assignments';
      ui.modal = { kind: 'share-assign', id: a.id };
      ui.drawer = null;
      saveMinutes(25);
      if (srcType === 'mapel') {
        var sName = (sourceMeta && sourceMeta.subjectName) || 'Mapel';
        toast(t('guru.tugas-mapel-tersusun', 'Tugas Kurikulum Nasional tersusun:') + ' ' + a.itemIds.length + ' soal ' + sName + '.');
      } else if (srcType === 'curriculum') {
        toast(t('guru.tugas-tersusun', 'Tugas tersusun:') + ' ' + a.itemIds.length + ' soal kurikulum.');
      } else {
        toast(t('guru.tugas-tersusun', 'Tugas tersusun:') + ' ' + a.itemIds.length + ' soal dari bank FIEZEL.');
      }
    }
    else if (kind === 'announce' && c) {
      var text = String(fd.get('text')).trim();
      c.announcements.push({ id: T.uid('an'), at: Date.now(), text: text });
      c.latestAnnouncement = { text: text, at: Date.now(), teacher: (st.teacher && st.teacher.name) || 'Wali kelas' };
      form.reset();
      ui.modal = null;
      saveMinutes(2);
      if (viaWa) window.open(T.waLink('', '📣 ' + c.name + '\n' + text), '_blank');
      else copy(text, 'Pengumuman disimpan & tersalin.');
    }
    else if (kind === 'journal' && c) { c.journal.push({ id: T.uid('jr'), at: Date.now(), text: String(fd.get('text')).trim(), tags: fd.getAll('tags') }); form.reset(); toast('Refleksi tersimpan.'); }
    else if (kind === 'teacher') { st.teacher = { name: String(fd.get('name')).trim().slice(0, 40), school: String(fd.get('school')).trim().slice(0, 60) }; toast('Profil tersimpan.'); }
    else if (kind === 'phone') { var s = student(form.getAttribute('data-id')); if (s) { s.parentPhone = String(fd.get('phone')).replace(/[^\d+]/g, ''); toast('Kontak tersimpan.'); } }
    else if (kind === 'note') { var s2 = student(form.getAttribute('data-id')); if (s2) s2.notes.push({ at: Date.now(), text: String(fd.get('text')).trim() }); }
    persist(); render();
  }
  function onChange(e) {
    var sel = e.target;
    if (sel.getAttribute('data-tg-check') === 'q-select') {
      var modalForm = el.querySelector('[data-tg-form="assign"]');
      if (modalForm) {
        var cbs = modalForm.querySelectorAll('[data-tg-check="q-select"]');
        var cnt = 0;
        cbs.forEach(function (cb) { if (cb.checked) cnt++; });
        var countSelect = modalForm.querySelector('[name="count"]');
        if (countSelect) {
          var found = false;
          for (var ci = 0; ci < countSelect.options.length; ci++) {
            if (parseInt(countSelect.options[ci].value, 10) === cnt) {
              countSelect.selectedIndex = ci;
              found = true;
              break;
            }
          }
          if (!found && cnt > 0) {
            var nOpt = document.createElement('option');
            nOpt.value = cnt;
            nOpt.textContent = cnt;
            nOpt.selected = true;
            countSelect.appendChild(nOpt);
          }
        }
        var cLbl = modalForm.querySelector('[data-tg-q-count-label]');
        if (cLbl) {
          cLbl.textContent = cnt + ' ' + t('guru.soal-dipilih-pill', 'Soal Dipilih');
        }
      }
      return;
    }
    if (sel.getAttribute('data-tg-select') === 'class') { st.activeClassId = sel.value; ui.drawer = null; persist(); render(); }
    if (sel.getAttribute('data-tg-select') === 'curriculum-subject') {
      ui.curriculumSubject = sel.value;
      loadCurriculumTree(sel.value);
    }
    if (sel.getAttribute('data-tg-select') === 'assign-subject') {
      ui.assignSubject = sel.value;
      ui.assignCompCode = '';
      ui.assignCompTitle = '';
      ui.assignGradeFilter = 'all';
      if (ui.modal && ui.modal.kind === 'assign') {
        ui.modal.subjectId = sel.value;
        ui.modal.compCode = '';
        ui.modal.compTitle = '';
      }
      if (ui.curriculumSubject !== sel.value) {
        ui.curriculumSubject = sel.value;
        loadCurriculumTree(sel.value);
      }
      persist(); render();
    }
    if (sel.getAttribute('data-tg-select') === 'assign-comp-select') {
      var opt = sel.options[sel.selectedIndex];
      var optCode = sel.value;
      var optTitle = opt ? (opt.getAttribute('data-title') || '') : '';
      ui.assignCompCode = optCode;
      ui.assignCompTitle = optTitle;
      if (ui.modal && ui.modal.kind === 'assign') {
        ui.modal.compCode = optCode;
        ui.modal.compTitle = optTitle;
      }
      persist(); render();
    }
    /* Ganti bab = sub-bab lama tidak berlaku lagi. Membiarkannya membuat guru mengira
       sedang memilih "1.2 Simple Present" padahal bab yang dipilih sudah berbeda. */
    if (sel.getAttribute('data-tg-select') === 'unit') { ui.curriculumUnitId = sel.value; ui.curriculumSub = ''; persist(); render(); }
    if (sel.getAttribute('data-tg-select') === 'sub') { ui.curriculumSub = sel.value; persist(); render(); }
    if (sel.getAttribute('data-tg-input') === 'att-date') { ui.attDate = sel.value; render(); }
    if (sel.getAttribute('data-tg-file') === 'import-json') { var f = sel.files && sel.files[0]; if (!f) return; f.text().then(function (txt) { try { var raw = JSON.parse(txt); if (raw.schema !== S().KEY) throw 0; st = Object.assign(S().defaults(), raw); st.classes = st.classes.map(S().normalizeClass); persist(); toast('Cadangan dipulihkan.'); render(); } catch (_) { toast('Berkas cadangan tidak valid.'); } }); }
  }
  function onInput(e) {
    var t = e.target, k = t.getAttribute('data-tg-input');
    if (k === 'filter') { ui.filter = t.value; var tb = el.querySelector('.tg-table-wrap, .tg-center'); if (tb) { var tmp = document.createElement('div'); tmp.innerHTML = classes(cls()); var nt = tmp.querySelector('.tg-table-wrap, .tg-center'); if (nt) tb.replaceWith(nt); if (env.afterRender) env.afterRender(); } }
    if (k === 'draft' && ui.modal) { ui.modal.draft = t.value; var wa = el.querySelector('[data-tg="wa-draft"]'); if (wa) { var s = student(ui.modal.id); wa.href = S().waLink(ui.modal.kind === 'parent' && s ? s.parentPhone : '', t.value); } }
  }
  function download(name, text, type) { try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); } catch (_) { copy(text, 'Unduhan tidak didukung — isi tersalin.'); } }

  root.FiezelTeacherShell = { mount: mount, unmount: unmount, render: render, previewAllowed: previewAllowed, exitPreview: exitPreview, _state: function () { return st; }, _autoSyncPlan: autoSyncPlan, _syncTicks: function () { return { every: SYNC_EVERY_MS, chip: CHIP_TICK_MS, stuck: (root.FiezelSyncPlan && root.FiezelSyncPlan.STUCK_MS) || 45000 }; }, _armed: function () { return !!syncTimer && !!chipTimer; }, _synthesizeMapelQuestions: synthesizeMapelQuestions, _MAPEL_LIST: MAPEL_LIST, _MAPEL_CATALOG: MAPEL_CATALOG };
})(typeof window !== 'undefined' ? window : null);
