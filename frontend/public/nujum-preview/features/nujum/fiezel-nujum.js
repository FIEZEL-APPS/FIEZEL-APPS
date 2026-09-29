/**
 * FIEZEL NUJUM — The Ruthless Mentor (hero feature).
 *
 * Duel 8 ronde: mesin BERTARUH (persentase) murid akan jatuh ke distraktor tertentu, lalu
 * me-roasting atau mengaku kalah. Sumber angkanya nyata: IRT 3PL (theta murid vs kesulitan
 * item) dikalikan bobot miskonsepsi yang pernah tercatat, dan hasil tiap ronde masuk ke BKT
 * per-lesson (FiezelMasteryBKT) dengan pita ketidakpastian yang digambar, bukan disembunyikan.
 *
 * Modul ini TIDAK menyentuh app.js secara langsung; ia membaca aplikasi lewat
 * `window.__fiezelNujumBridge` (lihat INTEGRATION-SNIPPETS.md) dan bekerja degradasi-anggun
 * kalau jembatan atau modul brain belum ada (bank soal fallback internal).
 */
(function (root) {
  'use strict';

  var SCHEMA = 'fiezel-nujum-v1';
  var STORE_KEY = 'fz_nujum_v1';
  var RETURN_KEY = 'fz_nujum_return';
  var ROUNDS = 8;
  var DISPUTE_ITEMS = 3;
  var GUESS = 0.25;
  var DISC = 1.2;
  var LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  /* =====================================================================================
   * 1. BANK NASKAH (PB, MW, SW, DS, DW/DL, FS, GV, TP, LV, MF)
   * ===================================================================================== */
  var SCRIPTS = [
    // --- Pre-bet
    { id: 'PB-01', sec: 'pre_bet', cond: { pct_band: 'mid' }, text: 'Aku sudah memperhatikan cara otakmu bekerja di tiga soal terakhir. Di kalimat ini, aku bertaruh {pct}% kamu bakal latah pilih «{distractor}», karena kamu masih menerjemahkan kata per kata di kepala. Buktikan aku salah. Kalau bisa.' },
    { id: 'PB-02', sec: 'pre_bet', cond: { pct_band: 'mid' }, text: 'Kalimat ini ada jebakannya, dan jebakannya persis di kebiasaan burukmu. {pct}% kamu jatuh ke «{distractor}». Bukan tebakan—itu hitungan. Silakan, pilih.' },
    { id: 'PB-03', sec: 'pre_bet', cond: { pct_band: 'mid' }, text: 'Aku tidak menebak. Aku menghitung. Peluang kamu kepleset ke «{distractor}» hari ini: {pct}%. Sisanya {rest}% itu bukan kemampuanmu—itu keberuntungan. Jangan mengandalkan yang kedua.' },
    { id: 'PB-04', sec: 'pre_bet', cond: { has_trigger_word: true }, text: 'Lihat kata «{trigger_word}» di kalimat itu? Otak autopilot-mu akan langsung teriak «{distractor}». Aku pasang {pct}% kamu menurutinya. Coba, sekali ini saja, matikan autopilot.' },
    { id: 'PB-05', sec: 'pre_bet', cond: { has_peer_pct: true }, text: 'Soal ini sudah menjatuhkan {peer_pct}% murid dengan pola pikir sepertimu. Aku bertaruh {pct}% kamu tidak berbeda. Kalau kamu mau membuktikan kamu bukan statistik, sekarang waktunya.' },
    { id: 'PB-06', sec: 'pre_bet', cond: { student_correct_streak_gte: 2 }, text: 'Kamu baru saja benar dua kali. Percaya diri sedang naik, ya? Bagus. Karena tepat di saat seperti itulah orang ceroboh. {pct}% kamu pilih «{distractor}». Mari lihat siapa yang lebih kenal dirimu: kamu, atau aku.' },
    { id: 'PB-07', sec: 'pre_bet', cond: { l1_transfer: true }, text: 'Ini bukan soal sulit. Ini soal yang memancing refleks Google Translate-mu. {pct}% kamu akan menerjemahkan «{indo_phrase}» jadi «{distractor}» dan merasa itu benar. Perasaan bukan grammar.' },
    { id: 'PB-08', sec: 'pre_bet', cond: { retention_lt: 60, has_prior_error: true }, text: 'Aku ingat kesalahanmu {days_ago} hari lalu di pola yang sama. Memorimu untuk aturan ini kutaksir sudah tinggal {retention}%. Jadi aku pasang {pct}% kamu jatuh lagi di lubang yang sama. Tolong, kejutkan aku.' },
    { id: 'PB-09', sec: 'pre_bet', cond: { pct_band: 'mid' }, text: 'Taruhan kecil: {pct}% kamu pilih «{distractor}». Kalau aku benar, kamu dengar ceramah singkat. Kalau aku salah, aku akan diam sebentar. Anggap itu hadiah terbesar yang bisa kuberi.' },
    { id: 'PB-10', sec: 'pre_bet', cond: { pct_band: 'mid' }, text: 'Pewawancara {stakes} tidak akan memberimu empat pilihan dan waktu berpikir. Aku memberimu keduanya, dan aku masih yakin {pct}% kamu salah ke «{distractor}». Nikmati kemewahan ini selagi ada.' },
    { id: 'PB-11', sec: 'pre_bet', cond: { pct_band: 'low' }, text: 'Jujur saja, untuk soal ini aku ragu. Hanya {pct}% aku pikir kamu jatuh ke «{distractor}». Artinya kamu punya kesempatan nyata mempermalukanku. Jangan disia-siakan.' },
    { id: 'PB-12', sec: 'pre_bet', cond: { pct_band: 'high' }, text: '{pct}%. Aku hampir tidak perlu menunggu jawabanmu. Pola «{distractor}» ini sudah jadi kebiasaanmu selama {occurrences} soal. Tapi silakan—sistem mengharuskanku memberimu giliran.' },
    { id: 'PB-13', sec: 'pre_bet', cond: { round_index: 1 }, text: 'Ronde pertama. Aku belum kenal kamu hari ini, tapi aku kenal catatanmu. {pct}% kamu buka sesi dengan «{distractor}». Buka dengan benar, dan aku akan mulai menghormatimu lebih cepat dari biasanya.' },

    // --- Machine wins: A tenses
    { id: 'MW-A-01', sec: 'machine_wins', cond: { misconception: 'TENSE_CONT_FOR_HABIT' }, text: 'Sudah kuduga. «{distractor}». Kamu pakai present continuous untuk hal yang dia lakukan setiap hari. Dia tidak sedang bangun jam lima setiap pagi—dia biasa bangun jam lima. Bedakan foto dengan video. Foto: simple present. Video: continuous.' },
    { id: 'MW-A-02', sec: 'machine_wins', cond: { misconception: 'TENSE_PAST_VS_PRESENT', has_time_marker: true }, text: '«{distractor}». Kejadiannya kemarin, tapi verb-mu masih hidup di hari ini. Ini bukan soal grammar. Ini soal kamu tidak membaca kata «{time_marker}» yang sudah disodorkan tepat di depan mata. Malas membaca, bukan tidak bisa.' },
    { id: 'MW-A-03', sec: 'machine_wins', cond: { misconception_family: 'tense_aspect' }, text: 'Kamu memilih «{distractor}» karena di kepalamu kalimat itu diterjemahkan dulu ke bahasa Indonesia—bahasa yang memang tidak menaruh waktu di kata kerjanya. Itulah masalahnya: kamu berpikir dalam sistem tanpa tenses, lalu heran kenapa tenses-mu berantakan.' },
    { id: 'MW-A-04', sec: 'machine_wins', cond: { misconception: 'TENSE_PERFECT_VS_PAST' }, text: 'Present perfect bukan hiasan. «{distractor}» bilang kejadiannya selesai dan sudah putus dari sekarang. Padahal kalimat itu jelas bilang efeknya masih terasa. Kamu bukan salah pilih tense—kamu belum tahu tense itu dipakai untuk apa. Itu yang kita perbaiki.' },
    { id: 'MW-A-05', sec: 'machine_wins', cond: { misconception: 'TENSE_ING_REFLEX' }, text: '«{distractor}». Setiap kali ada kata \'sekarang\' di kepalamu, tanganmu otomatis menempelkan -ing. Bahasa Inggris bukan stiker. Catat: currently pun bisa bermakna kebiasaan sementara, bukan aksi detik ini.' },
    // --- B SVA
    { id: 'MW-B-01', sec: 'machine_wins', cond: { misconception: 'SVA_NEAREST_NOUN' }, text: '«{distractor}». Subjeknya «{subject}»—tunggal. Kamu mencocokkan verb dengan kata benda terdekat yang kebetulan jamak. Kamu tidak membaca kalimat, kamu membaca tetangga terdekat. Grammar tidak bekerja seperti gosip.' },
    { id: 'MW-B-02', sec: 'machine_wins', cond: { misconception: 'SVA_S_AS_PLURAL' }, text: 'Sudah kuprediksi. -s di verb bukan tanda jamak. Itu tanda orang ketiga tunggal. Kamu memahaminya terbalik sejak lama, dan tidak ada yang cukup peduli untuk menegurmu. Sekarang ada.' },
    { id: 'MW-B-03', sec: 'machine_wins', cond: { misconception_family: 'agreement' }, text: 'Everyone itu tunggal. Selalu. Tidak peduli berapa banyak orang di dalamnya. Kamu memilih «{distractor}» karena logika \'banyak orang = jamak\'. Bahasa Inggris tidak menghitung orang. Dia menghitung kata.' },
    { id: 'MW-B-04', sec: 'machine_wins', cond: { misconception: 'SVA_DISTANT_SUBJECT' }, text: 'Ada belasan kata antara subjek dan verb, dan kamu tersesat di kata keempat. Itu bukan grammar sulit. Itu napas membacamu terlalu pendek. Latih matamu melompati frasa penjelas, atau selamanya kamu ditipu kalimat panjang.' },
    // --- C prepositions
    { id: 'MW-C-01', sec: 'machine_wins', cond: { misconception: 'PREP_LITERAL_TRANSFER' }, text: '«{distractor}». Terjemahan harfiah dari «{indo_phrase}». Kamu tidak sedang memakai bahasa Inggris—kamu memakai bahasa Indonesia dengan kostum Inggris. Dan kostumnya sobek tepat di preposisi.' },
    { id: 'MW-C-02', sec: 'machine_wins', cond: { misconception: 'PREP_COLLOCATION' }, text: 'Depend on. Bukan depend with, bukan depend to. Preposisi dihafal berpasangan dengan verb-nya, seperti nama depan dan nama belakang. Kamu memanggil orang dengan nama belakang yang salah, lalu heran kenapa tidak ditoleh.' },
    { id: 'MW-C-03', sec: 'machine_wins', cond: { misconception: 'PREP_IN_ON_AT' }, text: 'Kamu memilih «{distractor}» karena dalam bahasa Indonesia kita bilang \'di\'. Satu kata untuk semua tempat. Bahasa Inggris punya tiga—in, on, at—dan pemilihannya soal dimensi, bukan perasaan. Kotak: in. Permukaan: on. Titik: at. Tidak rumit. Hanya belum pernah kamu pikirkan.' },
    { id: 'MW-C-04', sec: 'machine_wins', cond: { misconception_family: 'prepositions' }, text: 'Sudah kuhitung kamu akan menempelkan preposisi di situ. Verb itu tidak butuh preposisi. Kamu menambahkannya karena kalimatnya \'terasa kurang\'. Perasaan kurang itu sisa bahasa ibumu. Bahasa Inggris tidak berutang apa-apa pada perasaanmu.' },
    // --- D overconfidence / generic
    { id: 'MW-D-01', sec: 'machine_wins', cond: { latency_lt: 3, trap_announced: true }, text: 'Kamu menjawab dalam {seconds} detik. Salah. Kecepatanmu bukan tanda paham—itu tanda tidak berpikir. Dan yang menyakitkan: aku sudah memberi tahu jebakannya sebelum kamu menjawab. Kamu tetap masuk. Itu bukan jebakan lagi. Itu undangan yang kamu terima dengan senang hati.' },
    { id: 'MW-D-02', sec: 'machine_wins', cond: { latency_lt: 3 }, text: 'Kamu menekan jawaban itu tanpa ragu sedikit pun. Aku menghargai keyakinan—kalau ada dasarnya. Ini tidak ada. Percaya diri tanpa fondasi itu bukan berani. Itu belum sadar.' },
    { id: 'MW-D-03', sec: 'machine_wins', cond: { self_confidence: 'high' }, text: 'Kamu menandai \'yakin\'. Jawabanmu «{distractor}». Di dunia nyata, kombinasi yakin dan salah itulah yang membuat {stakes} berhenti membacamu di kalimat kedua. Bukan karena mereka kejam. Karena mereka tidak punya waktu.' },
    { id: 'MW-D-04', sec: 'machine_wins', cond: {}, text: 'Kalau kutanya kenapa memilih itu, aku yakin jawabanmu \'kedengarannya benar\'. Kedengaran benar bagi telinga yang dilatih subtitle dan lirik lagu. Telinga itu perlu dididik ulang, dan mulai hari ini akulah yang mendidiknya.' },
    { id: 'MW-D-05', sec: 'machine_wins', cond: { same_misconception_in_session_gte: 3 }, text: 'Soal ketiga di pola yang sama, dan kamu jatuh tiga kali di tempat yang sama. Yang pertama kesalahan. Yang kedua kebiasaan. Yang ketiga pilihan. Kamu memilih untuk tidak belajar dari lima menit yang lalu.' },
    { id: 'MW-D-06', sec: 'machine_wins', cond: {}, text: 'Sudah kuduga: «{distractor}». Yang benar «{correct}». {rule} Catat itu—bukan di ponsel, di kepala.' },

    // --- Student wins
    { id: 'SW-01', sec: 'student_wins', cond: {}, text: 'Cih. Benar. Entah kamu benar-benar paham aturannya, atau jarimu kepleset ke pilihan yang tepat. Aku akan tahu di soal berikutnya—dan soal berikutnya tidak akan semudah ini.' },
    { id: 'SW-02', sec: 'student_wins', cond: {}, text: 'Prediksiku {pct}%. Kamu berdiri di sisa {rest}%-nya. Baik. Kutulis di catatanmu: satu kali benar. Kebiasaan butuh tiga. Lanjut.' },
    { id: 'SW-03', sec: 'student_wins', cond: { latency_gte: 4 }, text: 'Hm. Kamu berhenti dua detik sebelum menjawab. Itu bukan kebetulan. Itu kamu berpikir. Rasanya aneh, kan? Biasakan. Level naik.' },
    { id: 'SW-04', sec: 'student_wins', cond: { trap_announced: true }, text: 'Kamu melewati jebakan itu. Sekarang aku penasaran: kamu melewatinya karena paham aturannya, atau karena aku sudah memberi tahu di mana lubangnya? Soal berikutnya, aku tidak akan sebaik hati itu.' },
    { id: 'SW-05', sec: 'student_wins', cond: { mastery_increased: true }, text: 'Aku salah. Ya, aku bisa mengatakannya—tidak seperti sebagian murid yang kukenal. Estimasi penguasaanmu untuk {topic} kunaikkan. Jangan bangga dulu: naik dari lantai satu ke lantai dua masih sangat jauh dari atap.' },
    { id: 'SW-06', sec: 'student_wins', cond: {}, text: '…Tidak buruk. Catat baik-baik kalimat itu, karena kamu tidak akan sering mendengarnya dariku.' },
    { id: 'SW-07', sec: 'student_wins', cond: {}, text: 'Kamu benar, dan aku terpaksa merevisi modelku tentangmu. Artinya satu hal: kamu lebih baik dari kebiasaanmu sendiri. Sekarang buktikan itu bukan kejadian sekali seumur hidup.' },
    { id: 'SW-08', sec: 'student_wins', cond: {}, text: 'Baiklah. Aku bertaruh kamu jatuh; kamu tidak jatuh. Kalau ini tinju, kamu baru menang satu ronde melawan lawan yang masih pemanasan. Lanjut.' },
    { id: 'SW-09', sec: 'student_wins', cond: { pct_band: 'high' }, text: '{pct}%, dan kamu masih benar. Itu… menarik. Entah kamu belajar diam-diam di luar sini, atau otakmu akhirnya berhenti menerjemahkan. Apa pun itu—teruskan, dan aku akan berhenti meremehkanmu. Sedikit.' },
    { id: 'SW-10', sec: 'student_wins', cond: { latency_lt: 3 }, text: 'Benar. Tapi kamu menjawab dalam {seconds} detik tanpa membaca ulang. Hari ini kamu lolos. Di soal yang lebih licin, kecepatan seperti itu akan menjatuhkanmu. Aku sudah memperingatkan.' },
    { id: 'SW-11', sec: 'student_wins', cond: { streak_gte: 3 }, text: 'Kamu menepis prediksiku {streak} kali berturut-turut. Aku mulai curiga kamu benar-benar paham. Baik. Soal berikutnya kupilih dari zona yang belum pernah kamu sentuh. Mari lihat apakah kamu masih setenang ini.' },
    { id: 'SW-12', sec: 'student_wins', cond: {}, text: 'Kau tahu apa yang lebih sulit daripada mengakui aku salah? Melihatmu benar dengan cara yang tidak kuduga. Modelku tentangmu baru saja bergeser. Jangan buat aku menyesalinya.' },

    // --- Dispute open
    { id: 'DS-01', sec: 'dispute_open', cond: {}, text: 'Oh, tersinggung? Kamu mengklaim perhitunganku keliru? Bagus. Tiga soal kilat, pola yang sama, tanpa cela. Lolos, dan aku hapus label itu dari catatanmu. Gagal, dan kita berhenti berpura-pura.' },
    { id: 'DS-02', sec: 'dispute_open', cond: {}, text: 'Sanggahan diterima. Aku suka murid yang berani melawan mesin—asal punya bukti, bukan hanya perasaan. Tiga soal. Kalau kamu benar, aku salah, dan aku akan mengatakannya keras-keras.' },
    { id: 'DS-03', sec: 'dispute_open', cond: { student_reason: 'careless' }, text: 'Kamu bilang itu bukan miskonsepsi, hanya \'kurang teliti\'. Semua orang bilang begitu. Kurang teliti tiga kali di tempat yang sama namanya pola. Buktikan aku salah menyebutnya pola: tiga soal, sekarang.' },
    { id: 'DS-04', sec: 'dispute_open', cond: { first_dispute_ever: true }, text: 'Berani. Kebanyakan murid cuma menghela napas dan menekan \'Lanjut\'. Kamu menekan \'Sanggah\'. Itu sudah lebih baik dari sebagian besar. Sekarang tunjukkan kalau keberanian itu punya isi.' },
    { id: 'DS-05', sec: 'dispute_open', cond: { has_count: true }, text: 'Ini catatanku: kamu jatuh {count} kali di {misconception_label}. Kamu bilang catatanku salah. Satu dari kita akan malu dalam sembilan puluh detik ke depan. Aku sudah pernah malu sebelumnya. Kamu?' },
    { id: 'DS-06', sec: 'dispute_open', cond: {}, text: 'Kamu boleh membantah tuduhanku. Yang tidak boleh kamu bantah adalah datanya. Jadi mari kita tambah data: tiga soal kilat. Data yang memutuskan—bukan suaraku, bukan suaramu.' },
    { id: 'DS-07', sec: 'dispute_open', cond: { disputes_today_gte: 3 }, text: 'Sanggahan ketiga hari ini. Kamu tahu artinya kalau kamu menyanggah tiga kali dan kalah tiga kali? Masalahnya bukan di perhitunganku. Tapi silakan. Tiga soal. Aku menunggu.' },
    { id: 'DW-01', sec: 'dispute_won', cond: {}, text: '…Baik. Tiga dari tiga. Label «{misconception_label}» kuhapus dari catatanmu. Kamu benar, aku salah, dan aku tidak akan mengulang kesalahan yang sama tentang dirimu. Pastikan kamu juga tidak.' },
    { id: 'DW-02', sec: 'dispute_won', cond: {}, text: 'Sanggahan sah. Kucoret tuduhan itu. Jarang ada murid yang membuatku mencoret. Jangan jadikan ini alasan berhenti berhati-hati.' },
    { id: 'DL-01', sec: 'dispute_lost', cond: { dispute_score: 2 }, text: 'Dua dari tiga. Hampir. Dan hampir persis alasan aku memberimu label itu. Catatanku tetap. Tapi aku menghargai usahanya—sungguh. Sekarang kita perbaiki, bukan bertengkar.' },
    { id: 'DL-02', sec: 'dispute_lost', cond: {}, text: 'Satu dari tiga. Kamu menyanggah dengan perasaan, bukan pemahaman. Tidak apa-apa. Setidaknya sekarang kamu tahu ini bukan tuduhan—ini diagnosis. Dan diagnosis bisa disembuhkan.' },

    // --- Session end
    { id: 'FS-A-01', sec: 'session_end', cond: { outcome: 'machine' }, text: 'Delapan ronde. Aku {machine_score}, kamu {student_score}. Aku tidak menang karena aku pintar. Aku menang karena kamu bisa ditebak. Setiap jebakan yang kupasang, kamu masuk dengan urutan yang sama: terjemahkan, rasakan, tekan. Kabar buruknya: itu kebiasaan. Kabar baiknya: kebiasaan bisa dibongkar. Aku sudah menandai lubang terbesarmu—{top_misconceptions}. Besok kita mulai dari sana. Dan besok, cobalah membuatku sedikit lebih sulit menebakmu.' },
    { id: 'FS-A-02', sec: 'session_end', cond: { outcome: 'machine' }, text: '{machine_score}–{student_score}. Kalau ini {stakes}, kamu sudah dipersilakan keluar di ronde tiga. Tapi ini bukan itu. Ini latihan—satu-satunya tempat di dunia di mana kalah telak itu berguna. Aku sekarang tahu persis di mana kamu lemah, dan kamu pun tahu. Yang membedakan murid yang akhirnya fasih dan yang tidak bukan skor hari ini, tapi apakah dia kembali besok. Buktikan kamu tipe yang kembali.' },
    { id: 'FS-B-01', sec: 'session_end', cond: { outcome: 'close' }, text: '{machine_score}–{student_score}. Ketat. Kamu tidak seburuk yang kuduga—dan itu pujian paling jujur yang akan kamu dengar dariku. Tapi perhatikan polanya: kamu menang di soal yang jebakannya kuumumkan, dan kalah di soal yang jebakannya kamu abaikan. Artinya kamu bisa berpikir. Kamu hanya belum melakukannya tanpa disuruh. Itu tugas besok.' },
    { id: 'FS-B-02', sec: 'session_end', cond: { outcome: 'draw' }, text: 'Imbang. Kamu tahu apa yang kubenci dari imbang? Tidak ada yang bisa ku-roasting dengan puas, tidak ada yang bisa kuakui sepenuhnya. Kamu berdiri tepat di garis antara paham dan beruntung. Besok, pilih satu sisi. Aku sarankan yang pertama.' },
    { id: 'FS-C-01', sec: 'session_end', cond: { outcome: 'student' }, text: '{student_score}–{machine_score}. …Aku dibantai. Oleh murid yang delapan ronde lalu kutaksir masih menerjemahkan kata per kata. Aku salah tentangmu, dan malam ini modelku tentangmu kurevisi besar-besaran. Jangan tersenyum terlalu lebar: level berikutnya kupilih dari zona yang belum kamu kenal. Kamu sudah membuktikan bisa menang melawan prediksiku. Sekarang buktikan bisa menang melawan soal yang bahkan aku tidak yakin pernah kamu lihat.' },
    { id: 'FS-C-02', sec: 'session_end', cond: { outcome: 'student' }, text: 'Kamu menang {student_score}–{machine_score}. Baik. Kukatakan sekali, dan jelas: kamu sudah lewat dari fase grammar rebahan. Kamu berpikir sebelum menekan, kamu membaca time marker, kamu tidak percaya pada \'kedengarannya benar\'. Itu bukan hal kecil. Sekarang hal besarnya: pertahankan ini saat tidak ada aku yang menantangmu. Besok aku kembali dengan soal yang tidak punya empat pilihan.' },

    // --- BAGIAN 7.1 Give-up / "I don't know" → Echo Redemption
    { id: 'GV-01', sec: 'give_up', cond: {}, text: 'Berhenti. Kamu bilang \'tidak tahu\'? Bagus. Itu jawaban paling jujur yang kudengar hari ini—lebih berharga dari tebakan yang kebetulan benar. Jawabannya «{correct}». Rumusnya satu kalimat: {rule} Sekarang ucapkan «{correct}» dengan suaramu. Selamatkan mukamu.' },
    { id: 'GV-02', sec: 'give_up', cond: {}, text: 'Tidak tahu itu bukan aib. Pura-pura tahu itu aib. Dengar: «{correct}». Kenapa? {rule} Ulangi kata itu keras-keras—otak mengingat apa yang diucapkan mulut jauh lebih baik daripada yang ditekan jari.' },
    { id: 'GV-03', sec: 'give_up', cond: {}, text: 'Hm. Kamu memilih menyerah daripada menebak. Aku catat itu sebagai kecerdasan, bukan kelemahan. Jawabannya «{correct}»—{rule} Sekarang lidahmu yang bekerja: ucapkan.' },
    { id: 'GV-04', sec: 'give_up', cond: {}, text: 'Baik. Lebih baik kosong yang jujur daripada penuh yang salah. Isi kekosongan itu sekarang: «{correct}». Aturannya: {rule} Ucapkan, dan ronde ini tidak kucatat sebagai kekalahanmu—hanya sebagai pelajaran.' },
    { id: 'GV-05', sec: 'give_up', cond: {}, text: 'Kamu angkat tangan sebelum jatuh ke jebakan. Itu satu-satunya cara kalah yang kuhormati. «{correct}». {rule} Tirukan. Jangan bergumam—aku mendengarkan.' },
    { id: 'GV-OK', sec: 'echo_ok', cond: {}, text: '…Cukup. Terdengar seperti orang yang tahu apa yang dia katakan. Mukamu selamat. Ronde berikutnya.' },
    { id: 'GV-RETRY', sec: 'echo_retry', cond: {}, text: 'Itu bukan «{correct}». Sekali lagi, lebih jelas. Bahasa Inggris tidak dibaca dalam hati.' },

    // --- BAGIAN 7.2 Teleport to Latihan
    { id: 'TP-01', sec: 'teleport_out', cond: {}, text: 'Keluar ring. Sekarang. Bukan karena kamu kalah—karena kamu jujur bahwa pondasinya belum ada. Aku kirim kamu ke bengkel {skill_label}. Jangan kembali sebelum tanganmu berhenti gemetar di pola itu.' },
    { id: 'TP-02', sec: 'teleport_out', cond: {}, text: 'Menyerah dan minta diajari? Itu keputusan paling dewasa di sesi ini. Pergi ke {skill_label}. Latihan di sana tidak akan menyindirmu—itu tugasku, dan aku akan menunggu di sini.' },
    { id: 'TP-03', sec: 'teleport_out', cond: {}, text: 'Baik. Aku tidak melatih orang yang belum punya alat. Ambil alatnya di {skill_label}, lalu kembali dan buktikan kamu tahu cara memakainya.' },
    { id: 'TP-04', sec: 'teleport_back', cond: {}, text: 'Oh, kamu kembali. {skill_label} sudah selesai? Kita lihat apakah bengkel itu memperbaiki sesuatu, atau kamu hanya menekan \'Lanjut\' sampai habis. Ronde berikutnya kupilih dari pola yang sama.' },
    { id: 'TP-05', sec: 'teleport_back', cond: {}, text: 'Selamat datang kembali dari bengkel. Taruhan sebelumnya kubuka lagi—kali ini dengan angka yang lebih rendah, karena kamu sudah belajar. Kalau kamu memang belajar.' },

    // --- BAGIAN 7.3 CEFR-aware roast
    { id: 'LV-01', sec: 'level_roast', cond: {}, text: 'Profilmu tertulis Level {level}. Jawabanmu barusan seperti murid yang baru pertama kali dengar bahasa Inggris. Salah satunya bohong—dan aku tahu bukan jawabannya.' },
    { id: 'LV-02', sec: 'level_roast', cond: {}, text: '{level}, katanya. Tapi jatuh di soal {item_level}: «{distractor}». Level di profil itu tiket masuk, bukan bukti. Dan kamu baru saja menunjukkan tiketnya palsu.' },
    { id: 'LV-03', sec: 'level_roast', cond: {}, text: 'Kamu bisa menjawab soal {level}, tapi tersandung di {item_level}. Itu seperti bisa menyetir di jalan tol tapi lupa cara menyalakan mesin. Pondasi bukan pilihan, itu prasyarat.' },
    { id: 'LV-04', sec: 'level_roast', cond: {}, text: 'Ini soal {item_level}. Anak yang baru mulai seharusnya bisa. Kamu {level}, dan kamu pilih «{distractor}». Aku tidak marah. Aku hanya merevisi apa arti \'{level}\' di catatanmu.' },
    { id: 'LV-05', sec: 'level_roast', cond: {}, text: 'Catat ini: setiap kesalahan {item_level} di level {level} bukan salah kecil—itu retakan di fondasi yang menahan semua yang kamu bangun di atasnya. «{distractor}» adalah retakan itu. Kita tambal sebelum lanjut.' },

    // --- Fillers
    { id: 'MF-01', sec: 'filler', cond: {}, text: 'Sebentar. Aku menghitung.' },
    { id: 'MF-02', sec: 'filler', cond: {}, text: 'Membaca catatanmu…' },
    { id: 'MF-03', sec: 'filler', cond: {}, text: 'Hm. Menarik.' },
    { id: 'MF-04', sec: 'filler', cond: {}, text: 'Soal berikutnya. Jangan bersantai.' },
    { id: 'MF-05', sec: 'filler', cond: {}, text: 'Fokus.' }
  ];

  /* Peta kode taksonomi FIEZEL (misconception-taxonomy-v1.json) -> kode naskah NUJUM. */
  var MIS_MAP = {
    'tense_aspect.habitual_overgeneralized': 'TENSE_CONT_FOR_HABIT',
    'tense_aspect.progressive_overuse': 'TENSE_ING_REFLEX',
    'tense_aspect.timeline_mismatch': 'TENSE_PAST_VS_PRESENT',
    'tense_aspect.perfect_misuse': 'TENSE_PERFECT_VS_PAST',
    'tense_aspect.aspect_for_completed': 'TENSE_PERFECT_VS_PAST',
    'agreement.number_mismatch': 'SVA_NEAREST_NOUN',
    'agreement.bare_form': 'SVA_S_AS_PLURAL',
    'agreement.missing_auxiliary': 'SVA_DISTANT_SUBJECT',
    'prepositions.semantic_category': 'PREP_IN_ON_AT',
    'prepositions.collocation': 'PREP_COLLOCATION',
    'transfer.id_l1_pattern': 'PREP_LITERAL_TRANSFER',
    'structure.double_marking': 'PREP_REDUNDANT'
  };
  var STAKES = { A1: 'penguji seleksi', A2: 'penguji seleksi', B1: 'pewawancara beasiswa', B2: 'pewawancara beasiswa', C1: 'HRD multinasional', C2: 'HRD multinasional' };
  var TIME_MARKERS = ['yesterday', 'last week', 'last year', 'last night', 'ago', 'tomorrow', 'next week', 'every day', 'every morning', 'usually', 'always', 'now', 'right now', 'at the moment', 'since', 'for', 'already', 'yet', 'just', 'currently'];

  /* =====================================================================================
   * 2. UTIL
   * ===================================================================================== */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function levelIndex(l) { var i = LEVELS.indexOf(String(l || '').toUpperCase()); return i < 0 ? 0 : i; }
  function dayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function fill(text, vars) { return String(text).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] == null ? '' : String(vars[k]); }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function similarity(a, b) {
    a = norm(a); b = norm(b); if (!a || !b) return 0; if (a === b) return 1;
    if (a.indexOf(b) >= 0 || b.indexOf(a) >= 0) return 0.9;
    var ta = a.split(' '), tb = b.split(' '), hit = 0;
    tb.forEach(function (w) { if (ta.indexOf(w) >= 0) hit++; });
    return hit / Math.max(ta.length, tb.length);
  }

  /* =====================================================================================
   * 3. SCRIPT SELECTOR — filter kondisi, pilih yang paling spesifik, hindari pengulangan
   * ===================================================================================== */
  var lastUsed = {};
  function condMatches(cond, ctx) {
    for (var k in cond) {
      var want = cond[k], m;
      if ((m = k.match(/^(.*)_gte$/))) { if (!(Number(ctx[m[1]]) >= want)) return false; }
      else if ((m = k.match(/^(.*)_lte$/))) { if (!(Number(ctx[m[1]]) <= want)) return false; }
      else if ((m = k.match(/^(.*)_lt$/))) { if (!(Number(ctx[m[1]]) < want)) return false; }
      else if (ctx[k] !== want) return false;
    }
    return true;
  }
  function selectScript(section, ctx) {
    ctx = ctx || {};
    var pool = SCRIPTS.filter(function (s) { return s.sec === section && condMatches(s.cond, ctx); });
    if (!pool.length) pool = SCRIPTS.filter(function (s) { return s.sec === section; });
    if (!pool.length) return null;
    var maxSpec = Math.max.apply(null, pool.map(function (s) { return Object.keys(s.cond).length; }));
    var specific = pool.filter(function (s) { return Object.keys(s.cond).length === maxSpec; });
    // 70% ambil yang paling spesifik, 30% dari seluruh kandidat supaya tidak monoton.
    var cands = (Math.random() < 0.7 ? specific : pool).filter(function (s) { return s.id !== lastUsed[section]; });
    if (!cands.length) cands = pool;
    var chosen = pick(cands);
    lastUsed[section] = chosen.id;
    return { id: chosen.id, text: fill(chosen.text, ctx) };
  }

  /* =====================================================================================
   * 4. BRIDGE KE APLIKASI + BANK SOAL
   * ===================================================================================== */
  function bridge() { return root.__fiezelNujumBridge || {}; }
  function appState() { try { return bridge().state ? bridge().state() : (root.__getFiezelState ? root.__getFiezelState() : {}); } catch (_) { return {}; } }
  function activeLevel() { try { return bridge().getActiveLevel ? bridge().getActiveLevel() : (appState().preferences && appState().preferences.activeLevel) || 'A1'; } catch (_) { return 'A1'; } }
  function learnerName() { try { return bridge().learnerName ? bridge().learnerName() : (root.learnerName ? root.learnerName() : 'Murid'); } catch (_) { return 'Murid'; } }
  function toast(msg) { try { (bridge().showToast || root.showToast || function () {})(msg); } catch (_) {} }

  var TAX = { map: {}, codes: {} };
  function loadTaxonomy() {
    if (TAX.loaded || typeof fetch !== 'function') return;
    TAX.loaded = true;
    fetch('./misconception-taxonomy-v1.json').then(function (r) { return r.json(); }).then(function (j) { TAX.map = j.map || {}; TAX.codes = j.codes || {}; }).catch(function () {});
  }
  function taxCode(raw) { if (!raw) return ''; if (TAX.codes[raw]) return raw; return TAX.map[raw] || TAX.map[String(raw).toLowerCase()] || ''; }
  function taxLabel(code) { return (TAX.codes[code] && TAX.codes[code].label) || code || 'pola keliru'; }

  /* Bank fallback — hanya dipakai kalau jembatan G/GRAMMAR_ITEMS belum ada (mis. landing). */
  var FALLBACK_ITEMS = [
    { skill: 'present-simple-habits', label: 'Present Simple: Kebiasaan', level: 'A1', stem: 'My father ___ up at five every morning.', options: ['gets', 'is getting', 'get', 'got'], correct: 0, rule: 'Kebiasaan/rutinitas memakai simple present; subjek tunggal orang ketiga menambah -s.', mis: { 'is getting': 'tense_aspect.habitual_overgeneralized', 'get': 'agreement.bare_form', 'got': 'tense_aspect.timeline_mismatch' } },
    { skill: 'past-simple-basic', label: 'Past Simple', level: 'A1', stem: 'We ___ to Bandung yesterday.', options: ['went', 'go', 'have gone', 'are going'], correct: 0, rule: 'Penanda waktu selesai (yesterday) menuntut simple past.', mis: { 'go': 'tense_aspect.timeline_mismatch', 'have gone': 'tense_aspect.perfect_misuse', 'are going': 'tense_aspect.progressive_overuse' } },
    { skill: 'subject-verb-agreement', label: 'Subject–Verb Agreement', level: 'A2', stem: 'The box of old photos ___ under the bed.', options: ['is', 'are', 'were', 'be'], correct: 0, rule: 'Verb mengikuti subjek inti (the box), bukan kata benda terdekat (photos).', mis: { 'are': 'agreement.number_mismatch', 'were': 'tense_aspect.timeline_mismatch', 'be': 'agreement.bare_form' } },
    { skill: 'prepositions-place', label: 'Preposisi Tempat', level: 'A1', stem: 'She is waiting ___ the bus stop.', options: ['at', 'in', 'on', 'to'], correct: 0, rule: 'Titik/lokasi spesifik memakai at; ruang tertutup in; permukaan on.', mis: { 'in': 'prepositions.semantic_category', 'on': 'prepositions.semantic_category', 'to': 'transfer.id_l1_pattern' } },
    { skill: 'prepositions-collocation', label: 'Kolokasi Verb + Preposisi', level: 'A2', stem: 'The result depends ___ your effort.', options: ['on', 'with', 'to', 'of'], correct: 0, rule: 'Depend selalu berpasangan dengan on.', mis: { 'with': 'prepositions.collocation', 'to': 'transfer.id_l1_pattern', 'of': 'prepositions.collocation' } },
    { skill: 'present-perfect-vs-past', label: 'Present Perfect vs Past', level: 'B1', stem: 'I ___ my keys, so I can\'t open the door.', options: ['have lost', 'lost', 'lose', 'am losing'], correct: 0, rule: 'Akibat yang masih terasa sekarang memakai present perfect.', mis: { 'lost': 'tense_aspect.perfect_misuse', 'lose': 'tense_aspect.timeline_mismatch', 'am losing': 'tense_aspect.progressive_overuse' } },
    { skill: 'indefinite-pronouns', label: 'Indefinite Pronouns', level: 'A2', stem: 'Everyone in the class ___ ready for the test.', options: ['is', 'are', 'be', 'were'], correct: 0, rule: 'Everyone/everybody/each bersifat tunggal.', mis: { 'are': 'agreement.number_mismatch', 'be': 'agreement.bare_form', 'were': 'tense_aspect.timeline_mismatch' } },
    { skill: 'present-continuous-now', label: 'Present Continuous', level: 'A1', stem: 'Quiet, please. The baby ___ right now.', options: ['is sleeping', 'sleeps', 'sleep', 'slept'], correct: 0, rule: 'Aksi yang berlangsung saat bicara (right now) memakai present continuous.', mis: { 'sleeps': 'tense_aspect.habitual_overgeneralized', 'sleep': 'agreement.bare_form', 'slept': 'tense_aspect.timeline_mismatch' } }
  ];

  /* Normalisasi item ke satu bentuk: {id, skill, label, level, stem, options, correct, rule, mis:{opt->code}} */
  function normalizeAppItem(arr, skill, meta) {
    var opts = Array.isArray(arr[1]) ? arr[1].map(String) : [];
    var idx = Number(arr[2]) || 0;
    var rawMis = arr[15] || {};
    var mis = {};
    Object.keys(rawMis).forEach(function (o) { mis[o] = taxCode(rawMis[o]) || String(rawMis[o] || ''); });
    var rule = String((arr[4] && arr[4][idx]) || arr[7] || arr[3] || '').trim();
    if (rule && !/[.!?]$/.test(rule)) rule += '.';
    return { id: String(arr[8] || skill + ':' + arr[0]), skill: skill, label: (meta && (meta.title || meta.label)) || skill, level: String(arr[5] || (meta && meta.level) || activeLevel()), stem: String(arr[0] || ''), options: opts, correct: idx, rule: rule, mis: mis, targeted: taxCode(arr[10]) };
  }
  function itemPool(level) {
    var b = bridge(), out = [];
    try {
      var G = b.G ? b.G() : null, ITEMS = b.GRAMMAR_ITEMS ? b.GRAMMAR_ITEMS() : null;
      if (G && ITEMS) {
        var li = levelIndex(level);
        ITEMS.forEach(function (meta) {
          var mi = levelIndex(meta.level);
          if (mi > li || mi < li - 2) return; // level murid + dua band di bawah (untuk LV roast)
          (G[meta.skill] || []).forEach(function (arr) {
            if (!Array.isArray(arr) || !Array.isArray(arr[1]) || arr[1].length < 3) return;
            out.push(normalizeAppItem(arr, meta.skill, meta));
          });
        });
      }
    } catch (_) {}
    if (out.length < ROUNDS) {
      FALLBACK_ITEMS.forEach(function (f) { out.push(Object.assign({ id: 'fb:' + f.skill, targeted: '' }, f)); });
    }
    return out;
  }

  /* =====================================================================================
   * 5. BRAINCORE: IRT 3PL + BKT + pita ketidakpastian + prediksi distraktor
   * ===================================================================================== */
  function readStore() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (_) { return {}; } }
  function writeStore(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (_) {} }
  function bumpMis(code, delta) { if (!code) return; var s = readStore(); s.mis = s.mis || {}; s.mis[code] = Math.max(0, (s.mis[code] || 0) + delta); if (delta > 0) { s.misLast = s.misLast || {}; s.misLast[code] = Date.now(); } writeStore(s); }
  function misCount(code) { var s = readStore(); var own = (s.mis && s.mis[code]) || 0; var ext = 0; try { ext = bridge().misconceptionCount ? Number(bridge().misconceptionCount(code)) || 0 : 0; } catch (_) {} return own + ext; }
  function misDaysAgo(code) { var s = readStore(); var t = s.misLast && s.misLast[code]; return t ? Math.max(0, Math.round((Date.now() - t) / 864e5)) : null; }

  function bktState() { try { return (bridge().bktRead && bridge().bktRead()) || { schema: 'bkt', lessons: {} }; } catch (_) { return { lessons: {} }; } }
  function lessonRow(skill) { var st = bktState(); var r = (st.lessons && st.lessons[skill]) || {}; return { L: typeof r.L === 'number' ? r.L : 0.2, n: Number(r.n) || 0 }; }
  function ribbon(skill) {
    var r = lessonRow(skill);
    var half = clamp(1.96 * Math.sqrt(r.L * (1 - r.L) / (r.n + 1)), 0.04, 0.45);
    return { mean: r.L, low: clamp(r.L - half, 0, 1), high: clamp(r.L + half, 0, 1), n: r.n };
  }
  function bktObserve(skill, correct, weight) {
    var BKT = root.FiezelMasteryBKT, b = bridge();
    if (!BKT || !b.bktRead || !b.bktWrite) return null;
    try {
      var before = lessonRow(skill).L;
      var next = BKT.update(b.bktRead() || { schema: BKT.SCHEMA, lessons: {} }, { lesson: skill, correct: !!correct, weight: weight == null ? 1 : weight }, Date.now());
      b.bktWrite(next);
      return { before: before, after: lessonRow(skill).L };
    } catch (_) { return null; }
  }
  function successProbability(theta, b) {
    var CB = root.FiezelCoreBrain;
    if (CB && CB.successProbability) { try { return CB.successProbability(theta, b, DISC); } catch (_) {} }
    return GUESS + (1 - GUESS) / (1 + Math.exp(-DISC * (theta - b)));
  }
  /**
   * Prediksi: P(salah) dari 3PL dengan theta = indeks level murid digeser oleh BKT lesson,
   * lalu dibagi ke distraktor menurut bobot miskonsepsi yang pernah tercatat.
   * Mengembalikan {pct, distractor, code, pWrong, theta, b}.
   */
  function predict(item) {
    var L = lessonRow(item.skill).L;
    var theta = levelIndex(activeLevel()) + 0.5 + (L - 0.5) * 1.6;
    var b = levelIndex(item.level) + 0.5;
    var pWrong = 1 - successProbability(theta, b);
    var distractors = item.options.map(function (o, i) { return { o: o, i: i }; }).filter(function (x) { return x.i !== item.correct; });
    var weights = distractors.map(function (d) {
      var code = item.mis[d.o] || '';
      return 1 + (code ? 0.4 : 0) + 1.5 * misCount(code) + (code && code === item.targeted ? 0.8 : 0) + Math.random() * 0.15;
    });
    var sum = weights.reduce(function (a, c) { return a + c; }, 0), best = 0;
    weights.forEach(function (w, i) { if (w > weights[best]) best = i; });
    var share = weights[best] / sum;
    var pct = Math.round(100 * clamp(pWrong * share * distractors.length, 0.07, 0.96));
    var code = item.mis[distractors[best].o] || '';
    return { pct: pct, distractor: distractors[best].o, code: code, pWrong: pWrong, theta: theta, b: b };
  }
  function pctBand(p) { return p < 50 ? 'low' : p < 90 ? 'mid' : 'high'; }
  function family(code) { return String(code || '').split('.')[0]; }
  function nujumCode(code) { return MIS_MAP[code] || ''; }

  /* =====================================================================================
   * 6. SUARA — TTS (bisa diganti lewat setSpeaker) + Speech Recognition + Waveform Canvas
   * ===================================================================================== */
  var speaker = null;
  var currentUtter = null;
  var speakingState = { on: false, level: 0 };
  function setSpeaker(fn) { speaker = typeof fn === 'function' ? fn : null; }
  function pickVoice() {
    try {
      var vs = root.speechSynthesis.getVoices() || [];
      return vs.find(function (v) { return /^id/i.test(v.lang) && /male|pria|ardi|reza/i.test(v.name); }) || vs.find(function (v) { return /^id/i.test(v.lang); }) || null;
    } catch (_) { return null; }
  }
  function stopSpeaking() { try { root.speechSynthesis && root.speechSynthesis.cancel(); } catch (_) {} speakingState.on = false; }
  function say(text) {
    stopSpeaking();
    speakingState.on = true;
    var done = function () { speakingState.on = false; };
    if (speaker) { try { return Promise.resolve(speaker(text)).then(done, done); } catch (_) {} }
    if (!root.speechSynthesis || !root.SpeechSynthesisUtterance) { return new Promise(function (r) { setTimeout(function () { done(); r(); }, Math.min(6000, 60 * text.length)); }); }
    return new Promise(function (resolve) {
      var u = new SpeechSynthesisUtterance(text.replace(/[«»]/g, '"'));
      var v = pickVoice(); if (v) u.voice = v;
      u.lang = 'id-ID'; u.rate = 1.02; u.pitch = 0.82; u.volume = 1;
      u.onend = u.onerror = function () { done(); resolve(); };
      currentUtter = u;
      try { root.speechSynthesis.speak(u); } catch (_) { done(); resolve(); }
    });
  }

  var Rec = root.SpeechRecognition || root.webkitSpeechRecognition || null;
  var listening = { on: false, rec: null, stream: null, analyser: null, data: null };
  function micSupported() { return !!Rec; }
  function listen(lang, onResult, onEnd) {
    if (!Rec) { onEnd && onEnd('unsupported'); return; }
    stopListening();
    var rec = new Rec();
    rec.lang = lang || 'en-US'; rec.interimResults = false; rec.maxAlternatives = 4; rec.continuous = false;
    listening.on = true; listening.rec = rec;
    rec.onresult = function (e) {
      var alts = [];
      try { for (var i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript); } catch (_) {}
      onResult && onResult(alts);
    };
    rec.onerror = function (e) { onEnd && onEnd(e.error || 'error'); };
    rec.onend = function () { listening.on = false; stopAnalyser(); onEnd && onEnd('end'); };
    startAnalyser();
    try { rec.start(); } catch (_) { listening.on = false; onEnd && onEnd('start_failed'); }
  }
  function stopListening() { try { listening.rec && listening.rec.stop(); } catch (_) {} listening.on = false; stopAnalyser(); }
  function startAnalyser() {
    if (!root.navigator || !navigator.mediaDevices || !root.AudioContext) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      if (!listening.on) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      var ctx = new AudioContext(); var src = ctx.createMediaStreamSource(stream); var an = ctx.createAnalyser(); an.fftSize = 256; src.connect(an);
      listening.stream = stream; listening.analyser = an; listening.ctx = ctx; listening.data = new Uint8Array(an.frequencyBinCount);
    }).catch(function () {});
  }
  function stopAnalyser() {
    try { listening.stream && listening.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (_) {}
    try { listening.ctx && listening.ctx.close(); } catch (_) {}
    listening.stream = null; listening.analyser = null; listening.ctx = null;
  }

  /* Waveform 60 FPS: bar simetris; sumber = AnalyserNode saat murid bicara, sintesis saat mesin bicara. */
  var wave = { canvas: null, raf: 0, t: 0 };
  function mountWave(canvas) {
    unmountWave(); wave.canvas = canvas; if (!canvas) return;
    var ctx = canvas.getContext('2d');
    function frame() {
      wave.raf = requestAnimationFrame(frame);
      var dpr = Math.min(2, root.devicePixelRatio || 1);
      var W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H) return;
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) { canvas.width = W * dpr; canvas.height = H * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      wave.t += 1 / 60;
      var bars = 48, gap = 3, bw = (W - gap * (bars - 1)) / bars, mid = H / 2;
      var mode = listening.on ? 'student' : speakingState.on ? 'machine' : 'idle';
      var grad = ctx.createLinearGradient(0, 0, W, 0);
      if (mode === 'student') { grad.addColorStop(0, '#0FA37A'); grad.addColorStop(1, '#34D399'); }
      else if (mode === 'machine') { grad.addColorStop(0, '#8C2233'); grad.addColorStop(0.6, '#D94F63'); grad.addColorStop(1, '#FFD700'); }
      else { grad.addColorStop(0, 'rgba(255,255,255,.14)'); grad.addColorStop(1, 'rgba(255,255,255,.28)'); }
      ctx.fillStyle = grad;
      if (mode === 'student' && listening.analyser) listening.analyser.getByteFrequencyData(listening.data);
      for (var i = 0; i < bars; i++) {
        var amp;
        if (mode === 'student' && listening.analyser) amp = listening.data[Math.floor(i * listening.data.length / bars / 2)] / 255;
        else if (mode === 'machine') amp = 0.25 + 0.75 * Math.abs(Math.sin(wave.t * 9 + i * 0.55) * Math.sin(wave.t * 3.1 + i * 0.17) * Math.cos(wave.t * 1.3 - i * 0.05));
        else amp = 0.06 + 0.05 * Math.sin(wave.t * 2 + i * 0.4);
        var h = Math.max(2, amp * (H - 6));
        var x = i * (bw + gap);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, mid - h / 2, bw, h, bw / 2); else ctx.rect(x, mid - h / 2, bw, h);
        ctx.fill();
      }
    }
    wave.raf = requestAnimationFrame(frame);
  }
  function unmountWave() { if (wave.raf) cancelAnimationFrame(wave.raf); wave.raf = 0; wave.canvas = null; }

  /* =====================================================================================
   * 7. DUEL STATE MACHINE
   * ===================================================================================== */
  var D = null; // duel aktif
  var host = null;
  function newDuel() {
    var level = activeLevel();
    var pool = shuffle(itemPool(level));
    // Prioritaskan item yang lesson-nya lemah (BKT L rendah) — di sanalah taruhan paling tajam.
    pool.sort(function (a, b) { return lessonRow(a.skill).L - lessonRow(b.skill).L + (Math.random() - 0.5) * 0.3; });
    var seen = {}, items = [];
    pool.forEach(function (it) { if (items.length < ROUNDS && !seen[it.stem]) { seen[it.stem] = 1; items.push(it); } });
    return { schema: SCHEMA, level: level, items: items, round: 0, phase: 'intro', machine: 0, student: 0, broken: [], log: [], streak: 0, correctStreak: 0, sessionMis: {}, line: null, lineId: '', pred: null, startedAt: 0, echo: null, dispute: null, last: null };
  }

  function currentItem() { return D.items[D.round]; }
  function stakes() { return STAKES[D.level] || 'pewawancara'; }

  function startRound() {
    if (D.round >= D.items.length) return endSession();
    var item = currentItem();
    D.pred = predict(item);
    D.phase = 'bet'; D.startedAt = Date.now(); D.echo = null; D.last = null;
    var code = D.pred.code;
    var tm = TIME_MARKERS.find(function (t) { return norm(item.stem).indexOf(t) >= 0; }) || '';
    var ctx = {
      pct: D.pred.pct, rest: 100 - D.pred.pct, pct_band: pctBand(D.pred.pct), distractor: D.pred.distractor, correct: item.options[item.correct],
      round_index: D.round + 1, student_correct_streak: D.correctStreak, stakes: stakes(),
      has_trigger_word: !!tm, trigger_word: tm, has_peer_pct: false,
      l1_transfer: family(code) === 'transfer', indo_phrase: 'kalimat Indonesia di kepalamu',
      has_prior_error: misCount(code) > 0, days_ago: misDaysAgo(code) == null ? 0 : misDaysAgo(code), retention: Math.round(100 * clamp(1 - (misCount(code) > 0 ? 0.55 : 0.1), 0, 1)),
      occurrences: misCount(code)
    };
    var s = selectScript('pre_bet', ctx);
    D.line = s.text; D.lineId = s.id;
    render(); say(s.text);
  }

  function answer(choiceIndex, via) {
    if (!D || D.phase !== 'bet') return;
    stopListening();
    var item = currentItem(), pred = D.pred;
    var chosen = item.options[choiceIndex];
    var correct = choiceIndex === item.correct;
    var seconds = Math.max(0.5, Math.round((Date.now() - D.startedAt) / 100) / 10);
    var code = item.mis[chosen] || '';
    var machineWon = !correct && chosen === pred.distractor;
    var ctx = {
      pct: pred.pct, rest: 100 - pred.pct, pct_band: pctBand(pred.pct), distractor: chosen, correct: item.options[item.correct], rule: item.rule,
      seconds: seconds, latency: seconds, trap_announced: true, stakes: stakes(), topic: item.label, subject: subjectGuess(item.stem),
      time_marker: TIME_MARKERS.find(function (t) { return norm(item.stem).indexOf(t) >= 0; }) || '', has_time_marker: false,
      misconception: nujumCode(code), misconception_family: family(code), self_confidence: via === 'voice' ? 'high' : 'normal',
      indo_phrase: 'kalimat Indonesia di kepalamu', level: D.level, item_level: item.level
    };
    ctx.has_time_marker = !!ctx.time_marker;
    var bkt = bktObserve(item.skill, correct, via === 'voice' ? 1.2 : 1);
    var entry = { round: D.round + 1, stem: item.stem, chosen: chosen, correct: item.options[item.correct], ok: correct, pct: pred.pct, predicted: pred.distractor, skill: item.skill, label: item.label, code: code };
    if (correct) {
      D.student++; D.streak++; D.correctStreak++;
      D.broken.push({ claim: 'Jatuh ke «' + pred.distractor + '» (' + pred.pct + '%)', label: item.label });
      ctx.streak = D.streak; ctx.mastery_increased = !!(bkt && bkt.after > bkt.before);
      var sw = selectScript('student_wins', ctx); D.line = sw.text; D.lineId = sw.id;
    } else {
      D.streak = 0; D.correctStreak = 0;
      if (code) { D.sessionMis[code] = (D.sessionMis[code] || 0) + 1; bumpMis(code, 1); }
      ctx.same_misconception_in_session = D.sessionMis[code] || 0;
      var levelGap = levelIndex(D.level) - levelIndex(item.level);
      var foundational = ['tense_aspect', 'agreement'].indexOf(family(code)) >= 0;
      var useLV = levelGap >= 1 && foundational && Math.random() < 0.7;
      var mw = useLV ? selectScript('level_roast', ctx) : selectScript('machine_wins', ctx);
      if (machineWon) D.machine++;
      else mw = { id: mw.id, text: 'Salah—tapi bukan di lubang yang kuduga. «' + chosen + '». ' + mw.text };
      D.line = mw.text; D.lineId = mw.id;
    }
    entry.machineWon = machineWon; entry.lineId = D.lineId;
    D.log.push(entry); D.last = entry;
    D.phase = 'reveal';
    render(); say(D.line);
  }
  function subjectGuess(stem) { var m = String(stem).match(/^(The\s+\w+|[A-Z]\w+(?:\s+\w+)?)\s/); return m ? m[1] : 'subjek kalimat'; }

  function giveUp() {
    if (!D || D.phase !== 'bet') return;
    stopListening();
    var item = currentItem();
    D.echo = { tries: 0, ok: false };
    var s = selectScript('give_up', { correct: item.options[item.correct], rule: item.rule });
    D.line = s.text; D.lineId = s.id;
    bktObserve(item.skill, false, 0.5);
    D.log.push({ round: D.round + 1, stem: item.stem, chosen: '(tidak tahu)', correct: item.options[item.correct], ok: false, pct: D.pred.pct, predicted: D.pred.distractor, skill: item.skill, label: item.label, code: '', gaveUp: true, lineId: s.id });
    D.phase = 'echo';
    render(); say(s.text);
  }
  function echoListen() {
    if (!D || D.phase !== 'echo') return;
    var item = currentItem(), target = item.options[item.correct];
    if (!micSupported()) return echoAccept(true);
    render();
    listen('en-US', function (alts) {
      var best = Math.max.apply(null, alts.map(function (a) { return similarity(a, target); }));
      echoAccept(best >= 0.6, alts[0]);
    }, function (why) { if (why !== 'end' && why !== 'error' && why !== 'no-speech') render(); });
  }
  function echoAccept(ok, heard) {
    var item = currentItem();
    D.echo.tries++; D.echo.heard = heard || '';
    if (ok || D.echo.tries >= 3) {
      D.echo.ok = true;
      var s = selectScript('echo_ok', {}); D.line = s.text; D.lineId = s.id;
      bktObserve(item.skill, true, 0.6);
      D.phase = 'reveal'; D.last = D.log[D.log.length - 1];
    } else {
      var r = selectScript('echo_retry', { correct: item.options[item.correct] }); D.line = r.text; D.lineId = r.id;
    }
    render(); say(D.line);
  }

  function nextRound() {
    if (!D) return;
    stopSpeaking(); stopListening();
    D.round++;
    if (D.round >= D.items.length) return endSession();
    startRound();
  }

  /* --- OLM Dispute: 3 soal kilat, lesson yang sama --- */
  function openDispute() {
    if (!D || D.phase !== 'reveal' || !D.last || D.last.ok) return;
    var store = readStore();
    var today = dayKey();
    store.disputes = store.disputes && store.disputes.day === today ? store.disputes : { day: today, count: 0 };
    store.disputes.count++;
    var first = !store.firstDisputeDone; store.firstDisputeDone = true; writeStore(store);
    var code = D.last.code, skill = D.last.skill;
    var pool = itemPool(D.level).filter(function (it) { return it.skill === skill && it.stem !== D.last.stem; });
    if (pool.length < DISPUTE_ITEMS) pool = pool.concat(itemPool(D.level).filter(function (it) { return family(it.targeted || Object.values(it.mis)[0] || '') === family(code) && it.stem !== D.last.stem; }));
    if (pool.length < DISPUTE_ITEMS) pool = pool.concat(shuffle(itemPool(D.level)));
    var seen = {}, items = [];
    pool.forEach(function (it) { if (items.length < DISPUTE_ITEMS && !seen[it.stem]) { seen[it.stem] = 1; items.push(it); } });
    D.dispute = { items: items, i: 0, score: 0, code: code, skill: skill, startedAt: Date.now() };
    var s = selectScript('dispute_open', { first_dispute_ever: first, has_count: misCount(code) > 0, count: misCount(code), misconception_label: taxLabel(code), disputes_today: store.disputes.count, student_reason: '' });
    D.line = s.text; D.lineId = s.id; D.phase = 'dispute';
    render(); say(s.text);
  }
  function disputeAnswer(choiceIndex) {
    if (!D || D.phase !== 'dispute') return;
    var dp = D.dispute, item = dp.items[dp.i];
    var ok = choiceIndex === item.correct;
    if (ok) dp.score++;
    bktObserve(item.skill, ok, 0.8);
    dp.i++;
    if (dp.i < dp.items.length) { D.line = ok ? 'Satu. Lanjut.' : 'Meleset. Lanjut—masih ada sisa.'; render(); return; }
    var won = dp.score === dp.items.length;
    var s;
    if (won) {
      bumpMis(dp.code, -Math.max(1, misCount(dp.code)));
      D.machine = Math.max(0, D.machine - 1); D.student++;
      D.broken.push({ claim: 'Label «' + taxLabel(dp.code) + '» dihapus lewat sanggahan', label: D.last.label });
      if (D.last) D.last.disputed = 'won';
      s = selectScript('dispute_won', { misconception_label: taxLabel(dp.code) });
    } else {
      if (D.last) D.last.disputed = 'lost';
      s = selectScript('dispute_lost', { dispute_score: dp.score });
    }
    D.line = s.text; D.lineId = s.id; D.phase = 'reveal'; D.dispute = null;
    render(); say(s.text);
  }

  /* --- Teleportasi ke Latihan --- */
  function teleportToLatihan(skill, label) {
    var it = D ? currentItem() : null;
    skill = skill || (it && it.skill); label = label || (it && it.label) || skill;
    try { sessionStorage.setItem(RETURN_KEY, JSON.stringify({ skill: skill, label: label, at: Date.now(), duel: D })); } catch (_) {}
    var s = selectScript('teleport_out', { skill_label: label });
    stopListening();
    say(s.text).then(function () {
      var b = bridge();
      if (root.go) root.go('grammar');
      setTimeout(function () { try { if (b.openGrammarLesson) b.openGrammarLesson(skill); else if (b.practiceSkill) b.practiceSkill(skill); } catch (_) {} }, 80);
    });
    if (D) { D.line = s.text; D.lineId = s.id; D.phase = 'teleport'; render(); }
  }
  function resumeFromReturn() {
    var raw = null;
    try { raw = sessionStorage.getItem(RETURN_KEY); sessionStorage.removeItem(RETURN_KEY); } catch (_) {}
    if (!raw) return false;
    try {
      var r = JSON.parse(raw);
      if (r.duel && r.duel.schema === SCHEMA) { D = r.duel; }
      else D = newDuel();
      var s = selectScript('teleport_back', { skill_label: r.label || r.skill });
      D.line = s.text; D.lineId = s.id; D.phase = 'welcome_back'; D.returnSkill = r.skill;
      render(); say(s.text);
      return true;
    } catch (_) { return false; }
  }

  function endSession() {
    stopListening();
    var diff = D.student - D.machine;
    var outcome = diff <= -4 ? 'machine' : diff >= 4 ? 'student' : diff === 0 ? 'draw' : 'close';
    var top = Object.keys(D.sessionMis).sort(function (a, b) { return D.sessionMis[b] - D.sessionMis[a]; }).slice(0, 3).map(taxLabel).join(', ') || 'belum ada pola dominan';
    var s = selectScript('session_end', { outcome: outcome, machine_score: D.machine, student_score: D.student, top_misconceptions: top, stakes: stakes() });
    D.line = s.text; D.lineId = s.id; D.phase = 'board'; D.outcome = outcome;
    var store = readStore(); store.duels = (store.duels || 0) + 1; store.machineWins = (store.machineWins || 0) + (D.machine > D.student ? 1 : 0); store.studentWins = (store.studentWins || 0) + (D.student > D.machine ? 1 : 0); store.lastBoard = { m: D.machine, s: D.student, at: Date.now() }; writeStore(store);
    render(); say(s.text);
  }

  /* =====================================================================================
   * 8. RENDER
   * ===================================================================================== */
  function ribbonMarkup(skill) {
    var r = ribbon(skill);
    return '<div class="nj-ribbon" data-testid="nujum-uncertainty-ribbon" title="Penguasaan BKT: ' + Math.round(r.mean * 100) + '% (± ' + Math.round((r.high - r.low) * 50) + '), n=' + r.n + '">'
      + '<div class="nj-ribbon-track"><div class="nj-ribbon-band" style="left:' + (r.low * 100).toFixed(1) + '%;width:' + ((r.high - r.low) * 100).toFixed(1) + '%"></div><div class="nj-ribbon-mean" style="left:' + (r.mean * 100).toFixed(1) + '%"></div></div>'
      + '<div class="nj-ribbon-meta"><span>BKT ' + Math.round(r.mean * 100) + '%</span><span>n=' + r.n + '</span><span>pita ' + Math.round(r.low * 100) + '–' + Math.round(r.high * 100) + '%</span></div></div>';
  }
  function optionsMarkup(item, action, disabled) {
    return '<div class="nj-options" role="group" aria-label="Pilihan jawaban">' + item.options.map(function (o, i) {
      var cls = 'nj-opt';
      if (disabled && D.last) { if (i === item.correct) cls += ' is-correct'; else if (o === D.last.chosen) cls += ' is-wrong'; }
      if (D.phase === 'bet' && o === D.pred.distractor) cls += ' is-marked';
      return '<button type="button" class="' + cls + '" data-nujum-action="' + action + '" data-i="' + i + '" data-testid="nujum-option-' + i + '"' + (disabled ? ' disabled' : '') + '><span class="nj-opt-key">' + String.fromCharCode(65 + i) + '</span><span class="nj-opt-text">' + esc(o) + '</span></button>';
    }).join('') + '</div>';
  }
  function scoreStrip() {
    return '<div class="nj-score" data-testid="nujum-score-strip"><div class="nj-score-side is-machine"><small>NUJUM</small><b data-testid="nujum-score-machine">' + D.machine + '</b></div>'
      + '<div class="nj-score-rounds">' + D.items.map(function (_, i) { var e = D.log.find(function (l) { return l.round === i + 1; }); var c = e ? (e.ok ? 'is-student' : e.machineWon ? 'is-machine' : 'is-neutral') : i === D.round ? 'is-live' : ''; return '<i class="' + c + '"></i>'; }).join('') + '</div>'
      + '<div class="nj-score-side is-student"><small>KAMU</small><b data-testid="nujum-score-student">' + D.student + '</b></div></div>';
  }
  function mentorMarkup(extra) {
    return '<div class="nj-mentor"><div class="nj-mentor-sigil" aria-hidden="true"><span></span></div><canvas class="nj-wave" data-testid="nujum-waveform" aria-hidden="true"></canvas>'
      + '<p class="nj-line" data-testid="nujum-line" data-line-id="' + esc(D.lineId) + '">' + esc(D.line || '') + '</p>' + (extra || '') + '</div>';
  }
  function micButton(action, label) {
    if (!micSupported()) return '<span class="nj-mic-fallback" data-testid="nujum-mic-unsupported">Mic tidak tersedia—gunakan tombol.</span>';
    return '<button type="button" class="nj-mic' + (listening.on ? ' is-live' : '') + '" data-nujum-action="' + action + '" data-testid="nujum-mic-button" aria-label="' + esc(label) + '"><span class="nj-mic-ring"></span><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button><span class="nj-mic-label">' + esc(label) + '</span>';
  }

  function render() {
    if (!host || !D) return;
    var item = currentItem();
    var html = '<section class="nj-stage" data-testid="nujum-stage" data-phase="' + D.phase + '">';
    html += '<header class="nj-head"><span class="nj-brand">NUJUM</span><span class="nj-sub">The Ruthless Mentor · Level ' + esc(D.level) + '</span><button type="button" class="nj-exit" data-nujum-action="exit" data-testid="nujum-exit-button" aria-label="Keluar">✕</button></header>';

    if (D.phase === 'intro') {
      var weakest = D.items[0];
      var p = weakest ? predict(weakest) : null;
      D.line = p ? 'Aku sudah membaca catatanmu, ' + learnerName() + '. Delapan ronde. Di ronde pertama aku pasang ' + p.pct + '% kamu jatuh di ' + weakest.label + '. Terima, atau tutup layar ini dan kembali ke aplikasi burung.' : 'Delapan ronde. Aku bertaruh, kamu menjawab. Terima?';
      D.lineId = 'INTRO';
      html += mentorMarkup();
      html += '<div class="nj-intro-num" data-testid="nujum-intro-pct"><b>' + (p ? p.pct : '—') + '<i>%</i></b><span>taruhan ronde pertama</span></div>';
      html += '<div class="nj-actions"><button type="button" class="nj-btn is-gold" data-nujum-action="start" data-testid="nujum-start-button">Terima Tantangan</button></div>';
    }
    else if (D.phase === 'welcome_back') {
      html += mentorMarkup();
      html += '<div class="nj-actions"><button type="button" class="nj-btn is-gold" data-nujum-action="resume" data-testid="nujum-resume-button">Buka Ring Lagi</button></div>';
    }
    else if (D.phase === 'bet') {
      html += scoreStrip();
      html += '<div class="nj-bet" data-testid="nujum-bet-panel"><div class="nj-bet-num"><b data-testid="nujum-bet-pct">' + D.pred.pct + '<i>%</i></b><span>NUJUM bertaruh kamu memilih</span><em data-testid="nujum-bet-distractor">«' + esc(D.pred.distractor) + '»</em></div>' + mentorMarkup() + '</div>';
      html += '<div class="nj-item"><p class="nj-stem" data-testid="nujum-stem">' + esc(item.stem) + '</p><small class="nj-item-meta">' + esc(item.label) + ' · ' + esc(item.level) + '</small>' + optionsMarkup(item, 'answer', false) + '</div>';
      html += '<div class="nj-voice-row">' + micButton('listen', listening.on ? 'Mendengarkan…' : 'Ucapkan jawabanmu') + '</div>';
      html += '<div class="nj-actions is-secondary"><button type="button" class="nj-btn is-ghost" data-nujum-action="giveup" data-testid="nujum-idk-button">Aku tidak tahu</button><button type="button" class="nj-btn is-ghost is-teleport" data-nujum-action="teleport" data-testid="nujum-teleport-button">Aku Menyerah, Ajari Aku Ini →</button></div>';
      html += ribbonMarkup(item.skill);
    }
    else if (D.phase === 'echo') {
      html += scoreStrip();
      html += mentorMarkup();
      html += '<div class="nj-echo" data-testid="nujum-echo-panel"><span class="nj-echo-label">Echo Redemption — ucapkan:</span><b class="nj-echo-target" data-testid="nujum-echo-target">' + esc(item.options[item.correct]) + '</b>' + (D.echo && D.echo.heard ? '<small>terdengar: “' + esc(D.echo.heard) + '”</small>' : '') + '</div>';
      html += '<div class="nj-voice-row">' + micButton('echo', listening.on ? 'Mendengarkan…' : 'Tekan lalu ucapkan') + '</div>';
      html += '<div class="nj-actions is-secondary"><button type="button" class="nj-btn is-ghost" data-nujum-action="echo-skip" data-testid="nujum-echo-skip-button">Sudah kuucapkan (tanpa mic)</button></div>';
    }
    else if (D.phase === 'reveal') {
      html += scoreStrip();
      html += '<div class="nj-verdict ' + (D.last && D.last.ok ? 'is-student' : 'is-machine') + '" data-testid="nujum-verdict">' + (D.last && D.last.ok ? 'PREDIKSI DIPATAHKAN' : D.last && D.last.machineWon ? 'NUJUM BENAR — ' + D.pred.pct + '%' : D.last && D.last.gaveUp ? 'MENYERAH JUJUR' : 'SALAH, DI LUAR PREDIKSI') + '</div>';
      html += mentorMarkup();
      html += '<div class="nj-item">' + '<p class="nj-stem">' + esc(item.stem) + '</p>' + optionsMarkup(item, 'noop', true) + '<p class="nj-rule" data-testid="nujum-rule">' + esc(item.rule) + '</p></div>';
      html += ribbonMarkup(item.skill);
      html += '<div class="nj-actions">'
        + (D.last && !D.last.ok && !D.last.gaveUp && !D.last.disputed && D.last.code ? '<button type="button" class="nj-btn is-outline" data-nujum-action="dispute" data-testid="nujum-dispute-button">SANGGAH</button>' : '')
        + (D.last && !D.last.ok ? '<button type="button" class="nj-btn is-ghost is-teleport" data-nujum-action="teleport" data-testid="nujum-teleport-button">Ajari Aku Ini →</button>' : '')
        + '<button type="button" class="nj-btn is-gold" data-nujum-action="next" data-testid="nujum-next-button">' + (D.round + 1 >= D.items.length ? 'Lihat Papan Duel' : 'Ronde ' + (D.round + 2)) + '</button></div>';
    }
    else if (D.phase === 'dispute') {
      var dp = D.dispute, di = dp.items[dp.i];
      html += scoreStrip();
      html += mentorMarkup();
      html += '<div class="nj-dispute" data-testid="nujum-dispute-panel"><div class="nj-dispute-head"><span>SANGGAHAN · soal ' + (dp.i + 1) + '/' + dp.items.length + '</span><span>' + dp.items.map(function (_, i) { return '<i class="' + (i < dp.i ? (i < dp.score ? 'ok' : 'ko') : '') + '"></i>'; }).join('') + '</span></div>'
        + '<p class="nj-stem" data-testid="nujum-dispute-stem">' + esc(di.stem) + '</p>' + '<div class="nj-options">' + di.options.map(function (o, i) { return '<button type="button" class="nj-opt" data-nujum-action="dispute-answer" data-i="' + i + '" data-testid="nujum-dispute-option-' + i + '"><span class="nj-opt-key">' + String.fromCharCode(65 + i) + '</span><span class="nj-opt-text">' + esc(o) + '</span></button>'; }).join('') + '</div></div>';
    }
    else if (D.phase === 'teleport') {
      html += mentorMarkup('<p class="nj-teleport-note">Memindahkanmu ke bengkel latihan…</p>');
    }
    else if (D.phase === 'board') {
      html += '<div class="nj-board" data-testid="nujum-board"><div class="nj-board-score"><div class="is-machine"><small>NUJUM</small><b>' + D.machine + '</b></div><span class="nj-board-vs">vs</span><div class="is-student"><small>' + esc(learnerName()).toUpperCase() + '</small><b>' + D.student + '</b></div></div>';
      html += mentorMarkup();
      html += '<div class="nj-board-cols"><div class="nj-board-col"><h3>Klaim yang kamu patahkan</h3>' + (D.broken.length ? '<ul data-testid="nujum-broken-claims">' + D.broken.map(function (b) { return '<li><b>' + esc(b.claim) + '</b><span>' + esc(b.label) + '</span></li>'; }).join('') + '</ul>' : '<p class="nj-empty">Tidak ada. Hari ini NUJUM membacamu seperti buku terbuka.</p>') + '</div>';
      var mis = Object.keys(D.sessionMis).sort(function (a, b) { return D.sessionMis[b] - D.sessionMis[a]; });
      html += '<div class="nj-board-col"><h3>Lubang yang ditandai</h3>' + (mis.length ? '<ul data-testid="nujum-marked-holes">' + mis.map(function (c) { return '<li><b>' + esc(taxLabel(c)) + '</b><span>' + D.sessionMis[c] + '× di sesi ini</span></li>'; }).join('') + '</ul>' : '<p class="nj-empty">Bersih. Untuk sekarang.</p>') + '</div></div>';
      html += '<ol class="nj-log" data-testid="nujum-round-log">' + D.log.map(function (l) { return '<li class="' + (l.ok ? 'is-student' : l.machineWon ? 'is-machine' : '') + '"><span>R' + l.round + '</span><em>' + esc(l.stem) + '</em><b>' + esc(l.chosen) + (l.ok ? '' : ' → ' + esc(l.correct)) + '</b><small>' + l.pct + '%</small></li>'; }).join('') + '</ol>';
      var weak = D.log.filter(function (l) { return !l.ok; })[0];
      html += '<div class="nj-actions"><button type="button" class="nj-btn is-gold" data-nujum-action="rematch" data-testid="nujum-rematch-button">Rematch</button>' + (weak ? '<button type="button" class="nj-btn is-outline is-teleport" data-nujum-action="teleport-weak" data-skill="' + esc(weak.skill) + '" data-label="' + esc(weak.label) + '" data-testid="nujum-board-teleport-button">Bengkel: ' + esc(weak.label) + ' →</button>' : '') + '<button type="button" class="nj-btn is-ghost" data-nujum-action="exit" data-testid="nujum-board-exit-button">Kembali ke Beranda</button></div></div>';
    }
    html += '</section>';
    host.innerHTML = html;
    mountWave(host.querySelector('.nj-wave'));
  }

  function onAction(e) {
    var btn = e.target.closest('[data-nujum-action]'); if (!btn || !D) return;
    var a = btn.getAttribute('data-nujum-action'), i = Number(btn.getAttribute('data-i'));
    if (a === 'start') startRound();
    else if (a === 'resume') { if (D.phase === 'welcome_back') { if (D.round >= D.items.length) endSession(); else if (D.pred) { D.phase = 'bet'; D.startedAt = Date.now(); D.pred = predict(currentItem()); render(); } else startRound(); } }
    else if (a === 'answer') answer(i, 'tap');
    else if (a === 'listen') voiceAnswer();
    else if (a === 'giveup') giveUp();
    else if (a === 'echo') echoListen();
    else if (a === 'echo-skip') echoAccept(true);
    else if (a === 'next') nextRound();
    else if (a === 'dispute') openDispute();
    else if (a === 'dispute-answer') disputeAnswer(i);
    else if (a === 'teleport') teleportToLatihan();
    else if (a === 'teleport-weak') teleportToLatihan(btn.getAttribute('data-skill'), btn.getAttribute('data-label'));
    else if (a === 'rematch') { D = newDuel(); startRound(); }
    else if (a === 'exit') { unmount(); if (root.go) root.go('home'); }
  }
  function voiceAnswer() {
    if (!D || D.phase !== 'bet') return;
    if (listening.on) { stopListening(); render(); return; }
    var item = currentItem();
    render();
    listen('en-US', function (alts) {
      var best = -1, bestScore = 0;
      item.options.forEach(function (o, i) { alts.forEach(function (a) { var s = similarity(a, o); if (s > bestScore) { bestScore = s; best = i; } }); });
      // Murid juga boleh menyebut huruf pilihannya: "A", "B", "option C".
      alts.forEach(function (a) { var m = norm(a).match(/\b([abcd])\b/); if (m && bestScore < 0.6) { best = 'abcd'.indexOf(m[1]); bestScore = 0.6; } });
      if (best >= 0 && bestScore >= 0.5) answer(best, 'voice');
      else { toast('NUJUM: Aku tidak mendengar pilihan yang jelas. Ulangi, atau tekan.'); render(); }
    }, function () { render(); });
  }

  /* =====================================================================================
   * 9. PUBLIC API: mount / unmount / heroMarkup
   * ===================================================================================== */
  function mount(container) {
    loadTaxonomy();
    host = container; if (!host) return;
    host.classList.add('nj-host');
    host.removeEventListener('click', onAction); host.addEventListener('click', onAction);
    try { root.speechSynthesis && root.speechSynthesis.getVoices(); } catch (_) {}
    if (!resumeFromReturn()) { D = newDuel(); render(); }
  }
  function unmount() { stopSpeaking(); stopListening(); unmountWave(); if (host) { host.removeEventListener('click', onAction); host.innerHTML = ''; } host = null; }

  /** Kartu hero untuk paling atas Home — teaser taruhan hidup dari BKT/IRT, tanpa membuka duel. */
  function heroMarkup() {
    loadTaxonomy();
    var store = readStore();
    var level = activeLevel(), items = [];
    try { items = itemPool(level); } catch (_) {}
    var target = null, pred = null;
    shuffle(items).slice(0, 60).forEach(function (it) { var p = predict(it); if (!pred || p.pct > pred.pct) { pred = p; target = it; } });
    var lb = store.lastBoard;
    var line = pred
      ? 'Aku bertaruh <b>' + pred.pct + '%</b> kamu jatuh di <b>' + esc(target.label) + '</b>. Buktikan aku salah.'
      : 'Belum ada catatan tentangmu. Itu tidak akan lama.';
    return '<section class="nj-hero" data-testid="nujum-hero-card" role="region" aria-label="NUJUM — The Ruthless Mentor">'
      + '<div class="nj-hero-glow" aria-hidden="true"></div>'
      + '<div class="nj-hero-top"><span class="nj-hero-brand">NUJUM</span><span class="nj-hero-tag">The Ruthless Mentor</span>' + (lb ? '<span class="nj-hero-last" data-testid="nujum-hero-last-board">Terakhir ' + lb.m + '–' + lb.s + '</span>' : '') + '</div>'
      + '<div class="nj-hero-body"><div class="nj-hero-num" data-testid="nujum-hero-pct"><b>' + (pred ? pred.pct : '—') + '<i>%</i></b></div>'
      + '<p class="nj-hero-line" data-testid="nujum-hero-line">' + line + '</p></div>'
      + '<div class="nj-hero-foot"><button type="button" class="nj-btn is-gold nj-hero-cta" onclick="go(\'nujum\')" data-testid="nujum-hero-cta">Terima Tantangan <span aria-hidden="true">→</span></button><span class="nj-hero-hint">8 ronde · suara · taruhan nyata dari Braincore</span></div>'
      + '</section>';
  }

  root.FiezelNujum = Object.freeze({
    schema: SCHEMA, SCRIPTS: SCRIPTS, MIS_MAP: MIS_MAP,
    mount: mount, unmount: unmount, heroMarkup: heroMarkup,
    teleportToLatihan: teleportToLatihan, selectScript: selectScript, predict: predict, ribbon: ribbon,
    setSpeaker: setSpeaker, micSupported: micSupported,
    __state: function () { return D; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
