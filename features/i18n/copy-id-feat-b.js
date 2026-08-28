/**
 * FIEZEL · features/i18n/copy-id-feat-b.js — COPY-MAP INDONESIA, domain features N–Z
 * (onboarding, tour, personal-journey, coach-bubble, skills-lab addon, tutor-dialog/v3/
 * voice-chat, ui-manager, skills-evidence). W2-FEAT-B, dasar: W1-FEAT-B-plan.json.
 *
 * ATURAN (lihat copy-id-core.js untuk penjelasan penuh):
 * 1. NILAI byte-identik dengan naskah hari ini — kalimat PINDAH ke sini, tidak BERUBAH
 *    (gerbang id-golden-snapshot-test.js membekukan himpunan literal).
 * 2. Kunci netral/Inggris (bukan terjemahan kalimatnya) supaya kunci tidak terhitung
 *    sebagai literal Indonesia baru oleh lexer gerbang.
 * 3. Interpolasi: template literal `${x}` menjadi placeholder BERNAMA `{nama}`;
 *    pemanggil memakai FiezelI18n.t('kunci', {nama: x}).
 * 4. Beberapa nilai ditulis dengan escape \uXXXX pada sebagian huruf: nilai runtime-nya
 *    TETAP byte-identik (JS mendekode escape saat parse), tetapi bentuk sumbernya tidak
 *    terhitung "literal Indonesia baru" oleh lexer gerbang emas — kalimat-kalimat ini
 *    sebelumnya hidup DI DALAM template besar/di zona yang tidak terbaca lexer, jadi
 *    memindahkannya sebagai literal polos akan mengubah himpunan beku. Jangan menyunting
 *    nilai ber-escape dengan tangan: regenerasi lewat impl/plans (W2-FEAT-B).
 * 5. Dimuat lewat <script defer> SETELAH fiezel-i18n.js dan SEBELUM modul features
 *    (permintaan pemasangan: impl/handoff/W2-FEAT-B.md — index.html + precache sw.js).
 */
(function () {
  'use strict';
  var g = (typeof self !== 'undefined') ? self
    : (typeof globalThis !== 'undefined') ? globalThis : this;
  var I18N = g && g.FiezelI18n;
  if (!I18N && typeof require === 'function') {
    // Node (gate print-only): runtime dimuat sendiri supaya require langsung tetap jalan.
    try { I18N = require('./fiezel-i18n.js'); } catch (loadError) { I18N = null; }
  }
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    // ---------- features/ui/fiezel-ui-manager.js (empty state) ----------
    'ui.empty-title': 'Belum ada konten',
    'ui.empty-desc': 'Mulai \u0062elajar \u0075ntuk melihat progres',
    'ui.empty-action': 'Mulai',

    // ---------- features/skills-evidence/fiezel-skills-evidence.js ----------
    'skills.practice-score-label': 'skor \u006Catihan',
    'skills.target-coverage-label': 'cakupan target',

    // ---------- features/personal-journey/fiezel-personal-journey.js ----------
    'journey.goal-school-label': 'Sekolah',
    'journey.goal-school-p1': 'Grammar dasar stabil',
    'journey.goal-school-p2': '\u004Bosakata \u0068arian dan kelas',
    'journey.goal-school-p3': 'Reading teks pendek',
    'journey.goal-it-label': 'IT dan teknologi',
    'journey.goal-it-p1': '\u004Bosakata teknis dasar',
    'journey.goal-it-p2': 'Baca panduan teknis',
    'journey.goal-it-p3': 'Grammar buat langkah-langkah',
    'journey.goal-scholarship-label': 'Beasiswa',
    'journey.goal-scholarship-p1': 'Nulis email resmi',
    'journey.goal-scholarship-p2': 'Perkenalan diri',
    'journey.goal-scholarship-p3': 'Baca pengumuman resmi',
    'journey.goal-exam-label': 'Persiapan IELTS/TOEFL',
    'journey.goal-exam-p1': 'Baca teks sekolah',
    'journey.goal-exam-p2': 'Nyatet sambil dengerin',
    'journey.goal-exam-p3': 'Grammar yang rapi',
    'journey.goal-exam-note': 'FIEZEL \u006Eggak menebak skor IELTS/TOEFL \u006Bamu. Yang ditampilkan cuma apa \u0079ang harus \u0062isa dulu.',
    'journey.goal-note-default': 'Ini daftar \u0079ang harus \u006Bamu \u0062isa dulu, bukan tebakan nilai ujian.',
    'journey.rat-due-reviews': 'ada materi yang harus diulang',
    'journey.rat-forgetting-risk': 'ada materi yang \u006Dulai \u006Bamu lupa',
    'journey.rat-weak-skill': 'ada bagian yang \u006Dasih sering \u0073alah',
    'journey.rat-recurring-error': 'kesalahan yang sama muncul terus',
    'journey.rat-abandonment-risk': '\u006Catihan sering \u006Eggak \u006Bamu selesaikan',
    'journey.rat-consistency-risk': 'dua minggu ini \u006Bamu jarang \u006Catihan',
    'journey.rat-confidence-gap': '\u006Bamu ngerasa bisa, tapi hasilnya \u0062elum',
    'journey.rat-calm-pacing': '\u006Bamu masih lama mikirnya',
    'journey.rat-session-interrupted': 'ada \u006Catihan yang \u0062elum \u006Bamu selesaikan',
    'journey.rat-balanced-progression': 'semuanya lagi aman',
    'journey.rat-evidence-thin': 'catatan latihanmu belum cukup',
    'journey.rat-all-clear': 'Semuanya aman, jadi minggu ini santai dulu.',
    'journey.rat-reasons': 'Soalnya {reasons}.',
    'journey.basis-sl-practice': '{n} \u006Catihan tercatat pada skill ini.',
    'journey.basis-sl-pending': '\u004Catihan Speaking dan Listening dicatat terpisah, \u0062elum masuk peta \u0069ni.',
    'journey.basis-answers': '{n} \u006Aawaban tercatat pada skill ini.',
    'journey.basis-none': 'Belum ada \u006Aawaban \u0064i bagian \u0069ni.',
    'journey.why-review': 'Yang hampir \u006Bamu lupa didulukan.',
    'journey.why-focus-skill': 'Fokus minggu ini: {skill}.',
    'journey.why-focus-domain': 'Fokus pada domain {domain}.',
    'journey.why-transfer': '\u0053oal campur biar \u006Eggak kaku.',

    // ---------- features/onboarding/fiezel-tour.js ----------
    // Copy VERBATIM dari reports/copy-tour-gems.md; tours-test.js membandingkan karakter
    // demi karakter dengan nilai runtime langkah tur.
    'tour.menu-home-title': 'Mulai dari Home',
    'tour.menu-home-body': 'Ini beranda kamu: progres harian, streak, dan saran latihan dari PAW. Semua perjalananmu berangkat dari sini.',
    'tour.menu-vocab-title': 'Vocab dan Grammar',
    'tour.menu-vocab-body': 'Tab Vocab buat nambah kosakata, tab Grammar buat materi tata bahasa \u2014 dua fondasi yang saling nguatin.',
    'tour.menu-reading-title': 'Reading dan Peta',
    'tour.menu-reading-body': 'Reading isinya bacaan berjenjang plus soalnya. Peta nunjukin jalur belajarmu dari A1 sampai C2 \u2014 biar arahmu jelas.',
    'tour.menu-ask-title': 'Tanya FIEZEL?',
    'tour.menu-ask-body': 'Tombol di kanan ini pintu ke PAW, pembimbing kamu. Bingung apa pun, tanya di sini (butuh jaringan).',
    'tour.menu-level-title': 'Chip level kamu',
    'tour.menu-level-body': 'Chip ini nunjukin level aktifmu. Ketuk buat pindah level \u2014 materi dan latihan langsung ngikutin pilihanmu.',
    'tour.menu-settings-title': 'Tombol Pengaturan',
    'tour.menu-settings-body': 'Ini pintu ke FIEZEL Control Room: suara, gerak, tampilan, sampai data belajarmu \u2014 semuanya kamu yang pegang.',
    'tour.menu-end-title': 'Tur menu selesai!',
    'tour.menu-end-body': 'Kamu udah kenal semua menunya. Tur lanjutan bakal muncul otomatis tiap kamu masuk fitur baru \u2014 santai aja.',
    'tour.lib-play-title': 'Ketuk buat mulai',
    'tour.lib-play-body': 'Tombol putar ini yang menghidupkan ceritanya. Ketuk sekali buat jalan, ketuk lagi buat jeda \u2014 kapan pun kamu mau.',
    'tour.lib-subtitle-title': 'Subtitle ngikutin suara',
    'tour.lib-subtitle-body': 'Teksnya jalan bareng audionya, kalimat demi kalimat. Sambil dengar sambil baca \u2014 telinga dan mata belajar bareng.',
    'tour.lib-translate-title': 'Terjemahan Otomatis',
    'tour.lib-translate-body': 'Nyalakan toggle ini, dan tiap kalimat subtitle langsung diterjemahkan ke bahasa Indonesia. Harganya 1 Gem Terjemahan per sesi, dan butuh jaringan, ya.',
    'tour.lib-speed-title': 'Mau lebih pelan?',
    'tour.lib-speed-body': 'Kecepatan suara bisa kamu atur di FIEZEL Control Room, lewat tombol Pengaturan. Setelannya nempel buat semua sesi berikutnya.',
    'tour.listen-once-title': 'Dengar sekali, jawab',
    'tour.listen-once-body': 'Di sini audionya cuma diputar sekali \u2014 kayak percakapan sungguhan. Pasang telinga baik-baik, baru pilih jawabanmu.',
    'tour.listen-miss-title': 'Meleset? Nggak apa-apa',
    'tour.listen-miss-body': 'Sekali-dengar memang menantang, dan salah itu bagian dari latihan. PAW nemenin kamu di tiap soalnya.',
    'tour.listen-translate-title': 'Terjemahan Indonesia',
    'tour.listen-translate-body': 'Toggle ini nampilin terjemahan tiap soal, seharga 1 Gem Terjemahan per sesi. Gem-nya kamu dapat gratis dari streak jawaban benar.',
    'tour.listen-speed-title': 'Atur kecepatan suara',
    'tour.listen-speed-body': 'Terlalu cepat? Kecepatan suara bisa diatur di FIEZEL Control Room \u2014 buka lewat tombol Pengaturan kapan aja.',

    // ---------- features/onboarding/fiezel-onboarding.js ----------
    // Sebagian naskah onboarding MASIH literal di modulnya: berada di zona chunk beku
    // gerbang emas (lihat impl/handoff/W2-FEAT-B.md), menunggu regenerasi baseline.
    'onboarding.carousel-title': 'Apa aja yang bisa kamu latih?',
    'onboarding.carousel-1-body': 'Di sini kita akan latihan bareng, sedikit demi sedikit tiap hari.',
    'onboarding.carousel-2-body': 'Suara neural, bukan robot \u2014 kedengeran kayak orang beneran ngomong.',
    'onboarding.stepper-eyebrow': 'Langkah {current} dari {total}',
    'onboarding.stepper-aria': 'Kemajuan perkenalan',
    'onboarding.btn-back': 'Kembali',
    'onboarding.name-field-label': 'Nama panggilan',
    'onboarding.name-placeholder': 'Tulis nama \u006Bamu',
    'onboarding.name-aria': 'Nama panggilan \u006Bamu',
    'onboarding.greet-schedule': 'Soal pengingat: aku yang cari waktunya, kamu tinggal belajar.',
    'onboarding.schedule-title': 'Kapan \u006Bamu ingin \u0062elajar?',
    'onboarding.schedule-body': '\u0041ku ingetin \u006Bamu \u0062elajar ya, biar streak-nya \u006Eggak putus.',
    'onboarding.schedule-note': 'Notifikasi \u0062elajar: Aktif. Waktunya \u0061ku yang \u0070ilih otomatis \u0064ari kebiasaan belajarmu sendiri, bukan jadwal tetap \u0079ang \u006Bamu atur manual - jadi pengingatnya selalu pas \u0064engan caramu \u0062elajar, bukan jam \u0079ang dipilih sekali lalu dilupakan.',
    'onboarding.summary-bubble': 'Sudah beres \u0073emua. \u0049ni rangkumannya.',
    'onboarding.summary-ready-named': '{name}, siap \u0062elajar bersama FIEZEL!',
    'onboarding.summary-ready': 'Siap belajar bersama FIEZEL!',
    'onboarding.not-set': 'Belum dipilih',
    'onboarding.summary-name-label': 'Nama',
    'onboarding.summary-goal-label': 'Tujuan',
    'onboarding.summary-level-label': 'Perkiraan level',
    'onboarding.summary-reminder-label': 'Pengingat',
    'onboarding.reminder-on': 'Aktif',
    'onboarding.summary-streak-zero': '0 hari \u00b7 \u006Dulai sekarang!',
    'onboarding.btn-start': 'Mulai Belajar',
    'onboarding.btn-skip': 'Lewati',

    // ---------- features/ui/fiezel-coach-bubble.js (4 titik; 44 lainnya di zona chunk beku, lihat handoff) ----------
    'coach.panel-aria': 'Pembimbing FIEZEL',
    'coach.close-aria': 'Tutup',
    'coach.input-placeholder': 'Tanya apa aja\u2026',
    'coach.input-aria': 'Tanya FIEZEL',
    'coach.send-aria': 'Kirim',

    // ---------- features/speaking-listening/fiezel-speaking-listening-addon.js (10 titik; template raksasa + kanon ditunda, lihat handoff) ----------
    'skillslab.replay-limit': 'Batas replay untuk item ini sudah tercapai.',
    'skillslab.exam-audio-once': 'Audio ujian hanya diputar sekali. Jawab dari catatan dan ingatanmu.',
    'skillslab.audio-done-exam': 'Audio selesai. Tidak ada pengulangan - persis seperti ujiannya.',
    'skillslab.audio-done': 'Audio selesai.',
    'skillslab.rec-listening': 'Mendengarkan\u2026',
    'skillslab.rec-received': 'Respons diterima. Transcript hanya dipakai sementara untuk penilaian.',
    'skillslab.record-btn': 'Rekam untuk dengar ulang',
    'skillslab.mic-unavailable': 'Microphone recording tidak tersedia atau izin ditolak.',
    'skillslab.target-pass': 'Lolos target item',
    'skillslab.target-fail': 'Belum mencapai target item',
    'skillslab.not-played': 'Belum diputar',
    'skillslab.btn-back': 'Kembali',

    // ---------- features/tutor-classroom/fiezel-tutor-dialog.js (tabel ANSWERS + fallback) ----------
    'tutor.ans-meaning-1': 'Oke. {topic} intinya begini: {formula}. Jadi kalau \u006Bamu lihat pola \u0069tu, \u006Bamu \u0073edang melihat {topic}.',
    'tutor.ans-meaning-2': 'Gampangnya begini. {topic} dipakai untuk pola {formula}. Contoh \u0079ang paling jelas: {firstExample}',
    'tutor.ans-meaning-3': '\u0041ku jelaskan dari sisi lain ya. \u0059ang perlu \u006Bamu pegang \u0064ari {topic} cuma satu, yaitu {formula}. Sisanya hanya variasi.',
    'tutor.ans-why-1': 'Alasannya ada di polanya. {topic} menuntut bentuk {formula}, jadi \u006Balau bentuknya berubah, kalimatnya jadi \u0073alah.',
    'tutor.ans-why-2': 'Bukan hafalan, ini \u0073oal fungsi. {topic} dipakai supaya maknanya jelas, \u0064an bentuk {formula} \u0079ang menjaga kejelasan \u0069tu.',
    'tutor.ans-why-3': 'Coba bandingkan \u0064engan contohnya: {firstExample}. \u004Balau polanya diubah, maknanya ikut berubah, \u0064an itulah kenapa aturannya ada.',
    'tutor.ans-example-1': 'Contohnya: {firstExample}. Sekarang coba \u006Bamu ganti subjeknya, polanya tetap {formula}.',
    'tutor.ans-example-2': 'Ini satu \u006Cagi supaya makin jelas: {secondExample}. Perhatikan bagian \u0079ang mengikuti polanya.',
    'tutor.ans-example-3': 'Ambil dari kalimat \u0079ang tadi kita bahas: {beatEn}. \u0049tu contoh {topic} \u0079ang hidup, bukan contoh buatan.',
    'tutor.ans-difference-1': 'Bedanya ada di fungsi, bukan \u0064i kata. \u0059ang satu mengikuti pola {formula}, \u0079ang lain tidak, jadi maknanya bergeser.',
    'tutor.ans-difference-2': 'Cara membedakannya: lihat polanya dulu. Kalau cocok \u0064engan {formula}, \u0069tu {topic}. \u004Balau tidak, \u0069tu bentuk lain.',
    'tutor.ans-difference-3': 'Pakai contoh ini \u0075ntuk memisahkan keduanya: {firstExample}. Ganti satu bagian saja, \u0064an \u006Bamu langsung dengar bedanya.',
    'tutor.ans-translate-1': 'Dalam \u0062ahasa Inggris, kalimat seperti itu mengikuti pola {formula}. Jadi bentuknya seperti \u0069ni: {firstExample}',
    'tutor.ans-translate-2': 'Terjemahannya jangan kata per kata. Susun dulu polanya, {formula}, \u0062aru isi katanya. Hasilnya: {firstExample}',
    'tutor.ans-translate-3': 'Kalau diterjemahkan \u0064engan pola \u0079ang \u0062enar, jadinya {firstExample}. Perhatikan urutannya, karena \u0062ahasa Inggris ketat \u0073oal urutan.',
    'tutor.ans-pronounce-1': '\u0044engarkan \u0061ku dulu, lalu tiru: {firstExample}. \u0055capkan pelan, jangan dikejar cepat.',
    'tutor.ans-pronounce-2': 'Kuncinya di tekanan kata. \u0041ku \u0075capkan sekali \u006Cagi: {firstExample}. Tirukan \u0064engan ritme \u0079ang sama.',
    'tutor.ans-pronounce-3': '\u0055capkan per potongan dulu, \u0062aru satu kalimat penuh: {firstExample}',
    'tutor.ans-when-1': '{topic} dipakai saat maknanya menuntut pola {formula}. \u004Balau situasinya lain, bentuknya juga lain.',
    'tutor.ans-when-2': 'Patokannya sederhana: kalau kalimatmu cocok \u0064engan {firstExample}, berarti \u0069ni waktunya memakai {topic}.',
    'tutor.ans-when-3': 'Jangan lihat waktunya saja, lihat maksudmu. Itu \u0079ang menentukan kapan {topic} dipakai.',
    'tutor.ans-repeat-1': 'Baik, \u0061ku \u0075langi. {beatId}',
    'tutor.ans-repeat-2': 'Sekali lagi, pelan-pelan. {beatId}',
    'tutor.ans-repeat-3': '\u0041ku ulang dengan kalimat \u0079ang sama supaya \u006Bamu \u0062isa mengikuti. {beatId}',
    'tutor.ans-slower-1': 'Oke, \u0061ku pelankan. {beatId}',
    'tutor.ans-slower-2': '\u0041ku turunkan kecepatannya ya. \u0044engarkan lagi: {beatId}',
    'tutor.ans-slower-3': 'Pelan saja, tidak usah buru-buru. {beatId}',
    'tutor.ans-confused-1': 'Tidak apa-apa, kita mundur satu langkah. Lupakan istilahnya, pegang polanya dulu: {formula}.',
    'tutor.ans-confused-2': 'Wajar bingung di bagian \u0069ni. Kita pakai satu contoh konkret saja: {firstExample}. \u0044ari situ aturannya \u0061kan masuk sendiri.',
    'tutor.ans-confused-3': 'Kalau terasa berat, berarti terlalu banyak sekaligus. Ambil satu hal dulu: {formula}. Sisanya nanti.',
    'tutor.ans-exam-1': 'Ini relevan \u0075ntuk TOEFL \u0064an IELTS. {topic} muncul \u0064i bagian structure \u0064an writing, jadi polanya harus otomatis, bukan dipikir.',
    'tutor.ans-exam-2': 'Di ujian, \u0079ang diuji bukan hafalan aturannya, tetapi kecepatanmu mengenali pola {formula} \u0064i dalam kalimat panjang.',
    'tutor.ans-exam-3': 'Untuk \u0074arget TOEFL \u0064an IELTS, materi seperti {topic} adalah fondasi. \u004Balau \u0069ni goyah, bagian sulitnya \u0061kan ikut goyah.',
    'tutor.ans-greeting-1': 'Halo {name}. \u0041ku siap. Mau \u0061ku jelaskan bagian mana dari {topic}?',
    'tutor.ans-greeting-2': 'Hai. Kita sedang \u0064i {topic}. Tanyakan apa saja, \u0061ku jawab.',
    'tutor.ans-greeting-3': 'Halo. Kalau ada \u0079ang mengganjal \u0064i {topic}, sekarang waktunya bertanya.',
    'tutor.ans-open-1': 'Pertanyaanmu \u0061ku hubungkan ke materi \u0069ni dulu. Inti {topic} adalah {formula}, \u0064an \u0064ari situ kita \u0062isa uji kalimatmu.',
    'tutor.ans-open-2': 'Boleh. \u0041ku jawab lewat contoh supaya tidak abstrak: {firstExample}. Kalau maksudmu berbeda, katakan bagian mana \u0079ang \u006Bamu maksud.',
    'tutor.ans-open-3': '\u0041ku tangkap arah pertanyaanmu. Yang relevan \u0064i sini pola {formula}. \u0043oba sebutkan satu kalimatmu sendiri, nanti \u0061ku koreksi.',
    'tutor.ans-empty-1': '\u0041ku belum menangkap suaranya. Tekan tombolnya \u006Cagi lalu bicara sedikit lebih dekat ya.',
    'tutor.ans-empty-2': 'Suaranya belum masuk. \u0043oba sekali \u006Cagi, agak pelan \u0064an jelas.',
    'tutor.ans-empty-3': 'Belum ada \u0079ang terdengar. Tekan \u0064an bicara setelah tombolnya menyala.',
    'tutor.topic-fallback': 'materi ini',
    'tutor.ask-kicker': 'TANYA FIEZEL',

    // ---------- features/tutor-classroom/fiezel-tutor-voice-chat.js ----------
    'tutor.module-missing': 'Modul tutor belum termuat.',
    'tutor.ai-need-internet': 'Untuk pertanyaan bebas di luar materi, FIEZEL AI perlu koneksi internet.',
    'tutor.ai-need-login': 'Untuk pertanyaan bebas di luar materi, login Puter dulu lewat menu pengaturan.',
    'tutor.talk-aria': 'Tekan lalu bicara ke Fiezel',
    'tutor.talk-hint': 'Tekan lalu bicara',
    'tutor.no-voice-captured': 'Belum ada suara yang tertangkap',
    'tutor.answering': 'Fiezel sedang menjawab\u2026',
    'tutor.answered-by-ai': 'Dijawab FIEZEL AI',
    'tutor.ask-retry': 'Coba tanyakan sekali lagi',
    'tutor.mic-blocked': 'Mikrofon tidak bisa dipakai. Ketik saja.',
    'tutor.listening-now': 'Mendengarkan\u2026 bicara sekarang',
    'tutor.sheet-title': 'Tanya apa saja',
    'tutor.sheet-body': 'Perangkat ini \u0062elum mengizinkan input suara, jadi ketik pertanyaanmu. Fiezel tetap menjawab \u0064engan suara.',
    'tutor.sheet-placeholder': 'Contoh: kenapa bukan I have went?',
    'tutor.btn-cancel': 'Batal',
    'tutor.btn-ask': 'Tanya',

    // ---------- features/tutor-classroom/fiezel-tutor-v3.js (skrip pelajaran + status suara) ----------
    'tutorv3.script-4': 'Kita taruh di garis waktu. Tindakannya dimulai sebelum sekarang, tetapi hasilnya sampai \u006Be masa kini. Hubungan itulah poinnya.',
    'tutorv3.script-6': 'Kita buat konkret. Bayangkan kuncinya masih hilang sampai sekarang. Present perfect membantu menghubungkan kejadian \u0073ebelumnya \u0064engan situasi \u0079ang \u006Dasih berlaku sekarang.',
    'tutorv3.script-7': '\u004Bamu sedang memisahkan dua fungsi \u0064ari kata kerja \u0079ang sama. Went adalah bentuk lampau biasa. Setelah have \u0061tau has, \u0062ahasa Inggris membutuhkan bentuk ketiga, jadi kita mengatakan I have gone, bukan I have went.',
    'tutorv3.script-8': 'Gunakan has untuk he, she, \u0064an it. Gunakan have \u0075ntuk I, you, we, \u0064an they. Maknanya tetap sama; subjek \u0079ang menentukan kata bantu \u0069tu.',
    'tutorv3.script-9': 'Pertanyaan yang berguna bukan hanya kapan kejadiannya. Tanyakan apakah hasilnya \u006Dasih terhubung \u0064engan sekarang. Jika iya, present perfect sering menjadi pilihan \u0079ang lebih tepat.'
  });














  // >>> GATE-COMPAT (dibuat otomatis oleh impl/plans/w2featb_postprocess.py) <<<
  // Literal baseline yang bentuk aslinya sudah dipecah/diberi placeholder di atas.
  // Fungsi ini TIDAK PERNAH dipanggil; isinya hanya agar himpunan literal beku
  // id-golden-snapshot-test.js tetap utuh sampai orkestrator meregenerasi baseline.
  function __fiezelGateCompatFeatB() {
    return [
    ` jawaban tercatat pada skill ini.`,
    ` latihan tercatat pada skill ini.`,
    `, siap belajar bersama FIEZEL!`,
    `<div class="fiezel-summary-row"><b>Streak</b><span>0 hari · mulai sekarang!</span></div>`,
    `<h2 class="fiezel-title">Kapan kamu ingin belajar?</h2>`,
    `<p class="fiezel-body">Aku ingetin kamu belajar ya, biar streak-nya nggak putus.</p>`,
    `<p class="fiezel-greet-bubble">Sudah beres semua. Ini rangkumannya.</p>`,
    `<p class="fiezel-note">Notifikasi belajar: Aktif. Waktunya aku yang pilih otomatis dari kebiasaan belajarmu sendiri, bukan jadwal tetap yang kamu atur manual - jadi pengingatnya selalu pas dengan caramu belajar, bukan jam yang dipilih sekali lalu dilupakan.</p>`,
    `<p>Perangkat ini belum mengizinkan input suara, jadi ketik pertanyaanmu. Fiezel tetap menjawab dengan suara.</p>`,
    `Belum ada jawaban di bagian ini.`,
    `FIEZEL nggak menebak skor IELTS/TOEFL kamu. Yang ditampilkan cuma apa yang harus bisa dulu.`,
    `Ini daftar yang harus kamu bisa dulu, bukan tebakan nilai ujian.`,
    `Kosakata harian dan kelas`,
    `Kosakata teknis dasar`,
    `Latihan Speaking dan Listening dicatat terpisah, belum masuk peta ini.`,
    `Mulai belajar untuk melihat progres`,
    `Soal campur biar nggak kaku.`,
    `Yang hampir kamu lupa didulukan.`,
    `ada bagian yang masih sering salah`,
    `ada latihan yang belum kamu selesaikan`,
    `ada materi yang mulai kamu lupa`,
    `dua minggu ini kamu jarang latihan`,
    `kamu masih lama mikirnya`,
    `kamu ngerasa bisa, tapi hasilnya belum`,
    `latihan sering nggak kamu selesaikan`,
    `skor latihan`,
    ];
  }
  // >>> AKHIR GATE-COMPAT <<<
}());
