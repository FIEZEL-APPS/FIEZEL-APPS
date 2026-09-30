/**
 * FIEZEL NUJUM — Mesin yang Bertaruh Melawanmu (The Ruthless Mentor).
 *
 * Konsep: bukan murid yang diuji, tetapi mesin yang mempertaruhkan prediksinya
 * sebelum murid menjawab, ditenagai 3PL IRT, BKT, taksonomi miskonsepsi, dan OLM.
 * Suara (Web Speech API) adalah input utama; fallback sentuh selalu siap.
 *
 * Fitur Utama & Peningkatan:
 * 1. Taruhan 3PL IRT & Pre-Bet Taunts (PB-01 s/d PB-13)
 * 2. Taruhan Dua Arah: Pemain bisa "Tantang Balik (Double Down)" untuk 2x poin & multiplier
 * 3. Bank Soal Dinamis: Terhubung langsung ke 500+ template grammar-templates.json FIEZEL (anti-repetisi)
 * 4. Waveform Canvas 60 FPS aktif terhubung ke status mic dan suara mesin mentor
 * 5. Transkrip Live STT & Pita Ketidakpastian BKT (μ ± σ) interaktif
 * 6. Sanggahan OLM Riil (3-Strike Rapid Fire Dispute dengan timer 10s per soal)
 * 7. Protokol Kejujuran Kognitif: Surrender Sanctum + Interactive Echo Redemption audio & mic
 * 8. Teleportasi Kilat ke modul Latihan (practiceSkill)
 * 9. Kalibrasi CEFR Murid (A1, A2, B1, B2)
 * 10. Rekor Taruhan Tertinggi Terpatahkan & Integrasi Hadiah FIEZEL Gems
 */
(function (root) {
  'use strict';

  var doc = root.document;

  function t(k, fallback) {
    var s;
    try {
      var I = (typeof root !== 'undefined' && root && root.FiezelI18n) || (typeof self !== 'undefined' ? self.FiezelI18n : null);
      s = I && typeof I.t === 'function' ? I.t(k) : undefined;
    } catch (_) {}
    if (s === undefined || s === k) s = fallback == null ? k : fallback;
    return s;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Savage Roasting & Psychological Duel Script Repository v3.0 (Authentic Indonesian Savage Voice)
  var NUJUM_SCRIPTS = [
    // --- PRE-BET TAUNTS (Provokasi Tajam Sebelum Murid Menjawab) ---
    { id: "PB-01", section: "pre_bet", category: "intuition_trap", text_id: "Hehehe... Gue udah hafal pola malas mikir lu. Di soal ini, gue bertaruh 80% lu bakal kejebak di lubang yang sama persis!", text_en: "I logged your lazy habits. On this sentence, I bet 80% you will slip into the exact same trap." },
    { id: "PB-02", section: "pre_bet", category: "trap_alert", text_id: "Hahaha! Liat nih baik-baik. Ada jebakan manis buat yang mikir bahasa Inggris cukup modal nebak pake perasaan!", text_en: "Look closely. An obvious trap is set for anyone who assumes English grammar is mere intuition." },
    { id: "PB-03", section: "pre_bet", category: "patience", text_id: "Heh! Tahan dulu jarimu, jangan asal pencet! Otak autopilotmu pasti udah gatel pengen nebak tanpa baca kan?", text_en: "Do not touch the button before reading to the period. Your autopilot brain is itching to guess." },
    { id: "PB-04", section: "pre_bet", category: "literal_translation", text_id: "Pffft... Hahaha! Di soal ini, hampir semua orang gagal gara-gara nerjemahin kata per kata. Lu mau ikutan jadi korban juga?", text_en: "78% fail here because of literal Indonesian translation habits. Are you joining that casualty list?" },
    { id: "PB-05", section: "pre_bet", category: "tense_contrast", text_id: "Hehehe... Pasti lu mau langsung pilih kata pertama yang kepikiran di kepala kan? Cek dulu waktunya, jangan buru-buru!", text_en: "I bet you will pick the first word that crosses your mind without checking the temporal anchor." },
    { id: "PB-06", section: "pre_bet", category: "sva_distractor", text_id: "Hahaha! Keliatannya gampang banget ya? Hati-hati, biasanya yang ngerasa gampang langsung nyungsep di sini!", text_en: "This looks deceptively simple. That is the graveyard for learners who refuse to trace the true subject." },
    { id: "PB-07", section: "pre_bet", category: "high_bet", text_id: "Heh! Taruhan gue tinggi di ronde ini. Coba buktiin lu lebih pinter dari tebakan gue. Jangan bikin malu pake salah sepele!", text_en: "My bet is high this round. Prove your brain outperforms my prediction model. Do not bore me with elementary mistakes." },
    { id: "PB-08", section: "pre_bet", category: "auditory_trap", text_id: "Ck ck ck... Dua pilihan ini sama-sama enak di kuping lu. Tapi cuma satu yang bener tata bahasanya. Lu beneran paham apa cuma hoki?", text_en: "Both sound natural to colloquial ears. Only one is grammatically legitimate. Pure guess or genuine mastery?" },
    { id: "PB-09", section: "pre_bet", category: "challenge", text_id: "Hahaha! Gue udah tau jalan pintas yang lu pikirin. Lu bakal kepancing milih itu dalam 3 detik. Buktiin kalo gue salah!", text_en: "I already see the mental shortcut in your head. You will take the bait in 3 seconds. Prove me wrong." },

    // --- MACHINE WIN ROASTS (Roasting Menusuk dengan Tawa Sinis & Bahasa Alami) ---
    // 1. Kemalasan Subjek-Predikat (SVA)
    { id: "MW-SVA1", section: "machine_win", category: "sva_intervening", text_id: "Hahaha! Kebiasaan banget! Cuma ngeliat satu kata sebelum titik-titik, terus males nyari subjek aslinya siapa. Males baca kok dipelihara sih!", text_en: "Cheap autopilot! You only glanced at the adjacent noun, too lazy to trace the true subject. Why nurture laziness?" },
    { id: "MW-SVA2", section: "machine_win", category: "sva_neither", text_id: "Heh! Hahaha! Subjeknya kan cuma satu orang, kenapa kata kerjanya malah jamak? Ketipu sama kata-kata di tengah kalimat kan? Gampang banget dikecoh!", text_en: "The subject is singular; why a plural verb? You got blinded by an intervening phrase. Your focus is bought so easily." },
    { id: "MW-SVA3", section: "machine_win", category: "sva_auxiliary_double", text_id: "Pffft! Hahaha! Udah ada kata does not, ngapain kata kerjanya lu tambahin es lagi? Dobel-dobel begitu, boros amat aturan lu pake!", text_en: "Does not already absorbed the third-person marker! Adding another -s to the main verb is an embarrassing logical waste." },
    { id: "MW-SVA4", section: "machine_win", category: "sva_collective", text_id: "Hehehe... Mau berapa kali salah di pola yang sama? Bahasa Inggris tuh beda aturannya sama bahasa kita, jangan dipaksain sama dong!", text_en: "How many times must you encounter this before your brain stops projecting Indonesian syntax onto English?" },

    // 2. Kemalasan Tenses & Waktu
    { id: "MW-TNS1", section: "machine_win", category: "tense_past", text_id: "Hahaha! Udah jelas-jelas ada keterangan waktu lampau, jarimu malah mencet present tense. Lu hidup di masa sekarang apa terjebak masa lalu?", text_en: "The time marker is clearly in the past, yet your autopilot fingers clicked present tense. Denying reality or just intellectually lazy?" },
    { id: "MW-TNS2", section: "machine_win", category: "tense_continuous", text_id: "Pffft... Hahaha! Tuh kan bener! Kejadiannya lagi berlangsung sekarang, malah kamu jawab kebiasaan. Kata right now di situ bukan buat pajangan woy!", text_en: "Exactly as expected. You used a routine tense for an event happening right now. That time marker is not a decorative ornament!" },
    { id: "MW-TNS3", section: "machine_win", category: "tense_perfect", text_id: "Hahaha! Ada durasi waktunya di situ, kenapa present perfect-nya malah kamu lewatin? Nggak bakal maju bahasa Inggrismu kalau cuma modal kata kerja dasar terus!", text_en: "There is an explicit duration marker, and you bypassed present perfect? Your English will stagnate forever on bare verbs." },
    { id: "MW-TNS4", section: "machine_win", category: "subjunctive", text_id: "Heh! Hahaha! Kalau kalimat pengandaian tuh pakenya were, bukan was! Kebiasaan denger orang ngomong asal di medsos sih, tata bahasa bakunya kelupaan!", text_en: "You rejected subjunctive 'were' because your ear is addicted to colloquial slang in movies. Casual habit just handed me this victory." },

    // 3. Terjemahan Harfiah Bahasa Indonesia
    { id: "MW-TRN1", section: "machine_win", category: "literal_translation", text_id: "Hahaha! Stop nerjemahin kata per kata dari bahasa Indo di kepala lu! Bahasa Inggris punya tenses, jangan disamain sama bahasa kita yang santai!", text_en: "Stop translating word-for-word from Indonesian in your head! Indonesian has no verb inflections, which is why your brain is pampered." },
    { id: "MW-TRN2", section: "machine_win", category: "preposition_good_at", text_id: "Hehehe... Good at, bukan good in! Di bahasa Indo emang pandai dalam, tapi di bahasa Inggris pasangannya beda. Jangan main tebak pake perasaan!", text_en: "Good at, never good in! Stop forcing Indonesian idioms into foreign syntax. English operates on strict collocations." },
    { id: "MW-TRN3", section: "machine_win", category: "preposition_interested", text_id: "Pffft! Hahaha! Interested in, bukan interested with! Gara-gara mikir pake bahasa Indo tertarik dengan, poin lu langsung melayang ke kantong gue!", text_en: "Interested in, not interested with! Your mother-tongue projection just surrendered an effortless point to my ledger. Embarrassing." },
    { id: "MW-TRN4", section: "machine_win", category: "preposition_depend", text_id: "Hahaha! Depend on, bukan depend to! Kebiasaan pake Google Translate di kepala sih. Dengerin pasangannya yang bener dong!", text_en: "Depend on, never depend to! Stop your mental Google Translate. Adhere to actual English syntactic dependencies." },

    // 4. Tebak Kancing Kilat / False Confidence (< 1.8 detik)
    { id: "MW-SPD1", section: "machine_win", category: "false_confidence_speed", text_id: "Hahaha! Pffft! Gercep banget jawabnya, nebak kancing ya? Kalimatnya aja belum kelar lu baca. Sok cepet tapi salah kan jadinya, malu tuh!", text_en: "Answering in 0.8s is not genius; it is blind button-mashing panic! You did not even spell the sentence in your mind. Your luck ran out." },
    { id: "MW-SPD2", section: "machine_win", category: "false_confidence_guess", text_id: "Hehehe... Jari lu cepet banget, tapi otaknya ketinggalan di belakang. Di sini yang dinilai benernya, bukan cepet-cepetan bikin salah!", text_en: "Your finger speed cannot compensate for mental carelessness. In this arena, ungrounded speed only accelerates your humiliation." },
    { id: "MW-SPD3", section: "machine_win", category: "false_confidence_autopilot", text_id: "Hahaha! Pede banget mencetnya, kirain bener ya? Baca dulu sampe titik terakhir sebelum sok tau nebak jawaban!", text_en: "Baseless confidence always concludes as another loss on your ledger. Read to the final punctuation before acting like a know-it-all!" },

    // 5. Timeout (Waktu Habis / Bengong)
    { id: "MW-TO1", section: "machine_win", category: "freeze_timeout", text_id: "Hahaha! Malah bengong! Dikasih waktu mikir malah ngelamun natap layar. Otakmu lagi buffering apa gimana? Di dunia nyata lawan bicaramu udah kabur duluan!", text_en: "Frozen? You wasted eight seconds daydreaming at the glass. In the real world, your conversational partner walked away to order a fresh coffee!" },
    { id: "MW-TO2", section: "machine_win", category: "speed_vs_mastery", text_id: "Hahaha! Yah, keburu habis waktunya! Kebanyakan ragu begini tandanya emang belum paham polanya. Ditekan waktu dikit langsung panik kan?", text_en: "Time expired! Paralysis of hesitation proves you never drilled this pattern into instinct. Your cognition short-circuited under pressure." },

    // --- MACHINE DEFEAT (Saat Murid Menang - Mesin Mengakui Terpaksa) ---
    { id: "SW-01", section: "machine_defeat", category: "concession_sva", text_id: "Cih! Taruhan gue jebol! Ternyata lu beneran baca sampe tuntas, bukan asal tebak. Jangan girang dulu, ronde depan lu kena!", text_en: "Tch! My bet is broken. Turns out you evaluated the entire sentence rather than glancing at the first word. Do not get cocky; next round I finish you." },
    { id: "SW-02", section: "machine_defeat", category: "concession_high_bet", text_id: "Sialan! Tumben otak lu jalan beneran kali ini. Nggak ketipu jebakan kata perantara yang gue pasang. Boleh lah, satu poin buat lu.", text_en: "Dammit. Your logic was razor-sharp this turn. You ignored the intervening noun trap. Point awarded to you." },
    { id: "SW-03", section: "machine_defeat", category: "concession_time_context", text_id: "Grrr... Tebakan gue meleset! Tumben lu bisa mikir jernih dan ngebuktiin gue salah. Nikmatin dulu selagi bisa!", text_en: "My calculation failed. You forced your mind into clarity and shattered my prediction. Savor it while it lasts." },
    { id: "SW-04", section: "machine_defeat", category: "concession_translation", text_id: "Tch! Tumben banget. Biasanya orang selevel lu langsung nyaplok jebakan itu. Lumayan juga ketelitian lu di soal ini.", text_en: "Surprising. Learners at your theta score typically swallow that distractor whole. Your cognitive defense held surprisingly solid." },
    { id: "SW-05", section: "machine_defeat", category: "concession_bkt_shift", text_id: "Ambil tuh poinnya! Tapi inget ya, baru menang sekali belum tentu lu nggak bakal autopilot pas ngomong aslinya!", text_en: "Take the point. But remember: breaking one machine bet does not guarantee you are free from autopilot in real speech." },
    { id: "SW-06", section: "machine_defeat", category: "concession_surprise", text_id: "Argh! Taruhan 80% gue langsung lu ratain sama tanah! Oke gue akui, analisis lu tadi emang rapi.", text_en: "You leveled my 80% bet into the dirt. I concede: your breakdown of the syntactic subject was notably clean." },

    // --- HONEST SURRENDER (Pujian untuk Kejujuran Kognitif - Anti-Roast) ---
    { id: "SR-01", section: "honest_surrender", category: "praise_honesty", text_id: "Bagus! Mending jujur ngaku belum tau daripada sok tau nebak ngasal terus bikin malu. Pasang kupingmu baik-baik, dengerin nih bentuk yang bener!", text_en: "Good! At least you possess the moral fortitude to admit ignorance rather than recklessly guessing. Open your ears; absorb the phrasing now." },
    { id: "SR-02", section: "honest_surrender", category: "praise_honesty", text_id: "Nah, ini baru bener. Berani ngaku belum paham itu langkah pertama biar pinter. Sekarang tiruin dan hafalin bentuk yang benernya!", text_en: "Cognitive honesty. Acknowledging your boundaries is step one out of autopilot. Now, echo the correct form until fluent!" },
    { id: "SR-03", section: "honest_surrender", category: "praise_honesty", text_id: "Nyerah pas latihan jauh lebih terhormat daripada sok lancar pas ngomong di depan bule terus mati kutu. Dengerin susunannya sekarang!", text_en: "Surrendering in the training arena is far more dignified than fake fluency humiliated in real life. Hear how this syntax is constructed." },
    { id: "SR-04", section: "honest_surrender", category: "praise_honesty", text_id: "Gue nggak bakal ngeledek orang yang jujur. Yang gue sikat cuma yang sok pinter tapi kosong. Sekarang bersihin kelemahan lu di modul latihan!", text_en: "I never roast honest learners. I only execute unearned arrogance. Cleanse this gap in the practice module immediately." },

    // --- DISPUTE PROTOCOL (Sanggahan & Pembuktian Data) ---
    { id: "DS-01", section: "dispute", category: "challenge_probe", text_id: "Hahaha! Berani nyanggah tebakan gue? Bagus! Buktiin sekarang juga di 3 soal kilat tanpa bikin salah!", text_en: "You dare dispute my calculation? Excellent! Prove it across 3 rapid-fire trials without pausing for breath." },
    { id: "DS-02", section: "dispute", category: "challenge_probe", text_id: "Heh! Jangan cuma ngambek nggak terima kalah! Kalo mau protes, buktiin jawab 3 soal berturut-turut bener semua!", text_en: "Do not whine over defeat! In this crucible, disputes must be vindicated with 3 out of 3 empirical triumphs." },
    { id: "DW-01", section: "dispute_result", category: "probe_success", text_id: "Cih! Protes lu terbukti sah! Tiga-tiganya bener semua. Oke, tuduhan gue cabut dan lu emang teliti!", text_en: "Dispute substantiated! Three of three accurate. Accusation revoked, your precision acknowledged." },
    { id: "DL-01", section: "dispute_result", category: "probe_failure", text_id: "Hahaha! Tuh kan, protes lu ditolak mentah-mentah! Dikasih 3 soal pembuktian langsung ketauan lu emang belum paham. Latihan lagi sana!", text_en: "Dispute crushed! The trial probes confirmed my initial hypothesis. Face the empirical truth and drill again." },

    // --- FINAL SCOREBOARD (Vonis Duel Akhir) ---
    { id: "FS-A01", section: "duel_summary", category: "player_victory", text_id: "Vonis akhir: Lu berhasil ngalahin gue! Ternyata ketelitian lu lebih tajem dari perkiraan gue. Lanjut ke level berikutnya sekarang!", text_en: "Final verdict: You conquered the machine. My model underestimated your discipline. Advance to the next CEFR level now!" },
    { id: "FS-B01", section: "duel_summary", category: "draw", text_id: "Hasil imbang! Setengah kebiasaan jelek lu kebongkar sama gue, tapi lu berhasil nyelametin sisanya. Kita belum selesai ya!", text_en: "Dead draw. I captured half your bad habits, and you defended the rest. We are far from finished." },
    { id: "FS-C01", section: "duel_summary", category: "machine_victory", text_id: "Hahaha! Gue menang telak di duel ini! Otak autopilot sama kebiasaan nebak kancing masih nguasain kepala lu. Masuk ruang latihan dan beresin sekarang juga!", text_en: "The machine claims complete victory! Autopilot and blind guessing still rule your mind. Enter the training room and purge that habit now!" }
  ];

  function getScript(section, category, fallbackId, fallbackEn) {
    var pool = NUJUM_SCRIPTS.filter(function (s) {
      if (s.section !== section) return false;
      if (category && s.category !== category) return false;
      return true;
    });
    if (pool.length > 0) {
      return pool[Math.floor(Math.random() * pool.length)];
    }
    return { text_id: fallbackId, text_en: fallbackEn };
  }

  // Template Bank Terkalibrasi CEFR & Terhubung ke Skill Latihan
  var FALLBACK_TEMPLATES = [
    // Level A1
    {
      id: "NJ-A1-01",
      stem: "The train ___ at 8:00 AM every morning.",
      options: ["is leaving", "leaves", "has left", "leave"],
      correctIndex: 1,
      targetTrap: "is leaving",
      misconceptionCategory: "tense_continuous",
      misconceptionText: "present continuous dipakai buat jadwal rutin yang pasti.",
      rule: "Present simple digunakan untuk jadwal, kebiasaan rutin, dan fakta umum.",
      cefr: "A1",
      skillId: "present_simple"
    },
    {
      id: "NJ-A1-02",
      stem: "She ___ to the market on Sundays.",
      options: ["go", "goes", "is go", "going"],
      correctIndex: 1,
      targetTrap: "go",
      misconceptionCategory: "sva_intervening",
      misconceptionText: "subjek orang ketiga tunggal (she) lupa diberi akhiran -es.",
      rule: "Subjek he/she/it mewajibkan akhiran -s atau -es pada present simple.",
      cefr: "A1",
      skillId: "present_simple"
    },
    {
      id: "NJ-A1-03",
      stem: "They ___ not like cold weather.",
      options: ["does", "do", "is", "are"],
      correctIndex: 1,
      targetTrap: "does",
      misconceptionCategory: "sva_auxiliary_double",
      misconceptionText: "memakai 'does' untuk subjek jamak (they).",
      rule: "Subjek they/we/you/I menggunakan kata bantu 'do' / 'don't'.",
      cefr: "A1",
      skillId: "present_simple"
    },
    // Level A2
    {
      id: "NJ-A2-01",
      stem: "Look! The chef ___ a new dish right now.",
      options: ["prepares", "is preparing", "has prepared", "prepare"],
      correctIndex: 1,
      targetTrap: "prepares",
      misconceptionCategory: "tense_continuous",
      misconceptionText: "kebiasaan dipakai buat kejadian yang lagi berlangsung saat itu.",
      rule: "Present continuous (am/is/are + -ing) untuk peristiwa yang sedang berlangsung sekarang.",
      cefr: "A2",
      skillId: "present_continuous"
    },
    {
      id: "NJ-A2-02",
      stem: "Yesterday, she ___ to the library after school.",
      options: ["goes", "went", "has gone", "gone"],
      correctIndex: 1,
      targetTrap: "goes",
      misconceptionCategory: "tense_past",
      misconceptionText: "bentuk present dipakai pada kalimat lampau yang berpenanda 'yesterday'.",
      rule: "Past simple (V2: went) wajib dipakai ketika waktu lampau sudah selesai.",
      cefr: "A2",
      skillId: "past_simple"
    },
    {
      id: "NJ-A2-03",
      stem: "He doesn't ___ much coffee in the evening.",
      options: ["drinks", "drink", "drank", "drinking"],
      correctIndex: 1,
      targetTrap: "drinks",
      misconceptionCategory: "sva_auxiliary_double",
      misconceptionText: "menambahkan -s pada kata kerja utama padahal sudah ada kata bantu 'doesn't'.",
      rule: "Setelah auxiliary verb (doesn't / don't / didn't), kata kerja kembali ke bentuk dasar.",
      cefr: "A2",
      skillId: "present_simple"
    },
    {
      id: "NJ-A2-04",
      stem: "She is very good ___ playing acoustic guitar.",
      options: ["in", "at", "on", "with"],
      correctIndex: 1,
      targetTrap: "in",
      misconceptionCategory: "preposition_good_at",
      misconceptionText: "menerjemahkan 'pandai dalam' secara harfiah menjadi 'good in'.",
      rule: "Kolokasi baku bahasa Inggris adalah 'good at', bukan 'good in'.",
      cefr: "A2",
      skillId: "prepositions"
    },
    // Level B1
    {
      id: "NJ-B1-01",
      stem: "They ___ English for three years now.",
      options: ["learn", "are learning", "have learned", "learned"],
      correctIndex: 2,
      targetTrap: "are learning",
      misconceptionCategory: "tense_perfect",
      misconceptionText: "mengabaikan durasi 'for three years' yang menuntut present perfect.",
      rule: "Present perfect digunakan untuk tindakan yang dimulai di masa lalu dan berlanjut hingga sekarang.",
      cefr: "B1",
      skillId: "present_perfect"
    },
    {
      id: "NJ-B1-02",
      stem: "Neither of the two candidates ___ suitable for the role.",
      options: ["are", "is", "were", "being"],
      correctIndex: 1,
      targetTrap: "are",
      misconceptionCategory: "sva_neither",
      misconceptionText: "menyesuaikan kata kerja dengan 'candidates' (jamak), padahal subjeknya 'neither' (tunggal).",
      rule: "'Neither' mengambil kata kerja tunggal (singular verb 'is').",
      cefr: "B1",
      skillId: "subject_verb_agreement"
    },
    {
      id: "NJ-B1-03",
      stem: "If I ___ rich, I would buy a private island.",
      options: ["am", "was", "were", "will be"],
      correctIndex: 2,
      targetTrap: "was",
      misconceptionCategory: "subjunctive",
      misconceptionText: "memakai 'was' dalam klausa pengandaian formal (second conditional subjunctive).",
      rule: "Dalam conditional type 2 formal, bentuk subjunctive 'were' digunakan untuk semua subjek.",
      cefr: "B1",
      skillId: "conditionals"
    },
    // Level B2
    {
      id: "NJ-B2-01",
      stem: "Hardly had they arrived ___ the power went out.",
      options: ["when", "than", "then", "after"],
      correctIndex: 0,
      targetTrap: "than",
      misconceptionCategory: "auditory_trap",
      misconceptionText: "menyamakan inversi 'hardly... when' dengan 'no sooner... than'.",
      rule: "Korelasi inversi negatif: 'hardly/scarcely... when', sedangkan 'no sooner... than'.",
      cefr: "B2",
      skillId: "inversion"
    },
    {
      id: "NJ-B2-02",
      stem: "No sooner had the bell rung ___ the students left the hall.",
      options: ["than", "when", "that", "then"],
      correctIndex: 0,
      targetTrap: "when",
      misconceptionCategory: "auditory_trap",
      misconceptionText: "menyamakan inversi 'no sooner... than' dengan 'hardly... when'.",
      rule: "Pasangan inversi negatif adalah 'no sooner... than'.",
      cefr: "B2",
      skillId: "inversion"
    }
  ];

  // State runtime Nujum
  var nujumState = {
    active: false,
    roundIndex: 0,
    maxRounds: 8,
    scoreMesin: 0,
    scoreKamu: 0,
    currentQuestion: null,
    currentBet: 78,
    isDoubleDown: false,
    bktMean: 0.45,
    bktMargin: 0.18,
    brokenClaims: [],
    isListening: false,
    recognition: null,
    waveAnimFrame: null,
    waveCanvas: null,
    waveCtx: null,
    wavePhase: 0,
    isSpeakingMachine: false,
    lastTranscript: '',
    inDispute: false,
    disputeQuestions: [],
    disputeIndex: 0,
    disputeCorrectCount: 0,
    disputeTimerInterval: null,
    cachedTemplates: [],
    usedQuestionIds: [],
    isDemo: false,
    roundStartTime: 0,
    machineShield: 100,
    roundTimeLeft: 10.0,
    roundTimerInterval: null,
    timerPaused: false,
    tapGridExpanded: false
  };

  /** Preload bank template grammar lengkap (500+ butir) secara asinkron dari cache/service worker */
  function loadGrammarTemplatesAsync() {
    if (Array.isArray(nujumState.cachedTemplates) && nujumState.cachedTemplates.length > 0) {
      return Promise.resolve(nujumState.cachedTemplates);
    }
    try {
      if (typeof root.fetch === 'function') {
        return fetch('./grammar-templates.json')
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (data) {
            if (data && Array.isArray(data.templates) && data.templates.length > 0) {
              nujumState.cachedTemplates = data.templates;
            }
            return nujumState.cachedTemplates;
          })
          .catch(function () { return nujumState.cachedTemplates; });
      }
    } catch (_) {}
    return Promise.resolve(nujumState.cachedTemplates);
  }
  loadGrammarTemplatesAsync();

  /** Membaca parameter IRT 3PL untuk menghitung persentase taruhan */
  function calculateBetPercentage(template, theta) {
    if (nujumState.isDemo) {
      var demoBets = [78, 84, 72, 81, 76, 85, 79, 83];
      return demoBets[nujumState.roundIndex % demoBets.length];
    }
    var a = 1.2;
    var b = (template.cefr === 'B2' ? 0.9 : template.cefr === 'B1' ? 0.5 : template.cefr === 'A2' ? 0.0 : -0.5);
    var c = 0.25;
    var th = typeof theta === 'number' ? theta : 0.0;
    var pCorrect = c + (1.0 - c) / (1.0 + Math.exp(-a * (th - b)));
    var pMistake = Math.round((1.0 - pCorrect) * 100);
    return Math.max(58, Math.min(92, pMistake));
  }

  /** Mengambil soal dari bank terkalibrasi sesuai CEFR murid tanpa repetisi */
  function pickNextQuestion() {
    var userCefr = 'A2';
    try {
      if (typeof root.getActiveLevel === 'function') userCefr = root.getActiveLevel();
      else if (root.__getFiezelState && root.__getFiezelState()?.profile?.cefr) userCefr = root.__getFiezelState().profile.cefr;
    } catch (_) {}

    // Coba ambil dari 500+ templates asli FIEZEL
    var dynamicPool = [];
    if (Array.isArray(nujumState.cachedTemplates) && nujumState.cachedTemplates.length > 0) {
      dynamicPool = nujumState.cachedTemplates.filter(function (t) {
        return t && t.stem && t.stem.indexOf('___') !== -1 && Array.isArray(t.options) && t.options.length >= 2 && (!t.cefr || t.cefr === userCefr);
      });
      if (dynamicPool.length === 0) {
        dynamicPool = nujumState.cachedTemplates.filter(function (t) {
          return t && t.stem && t.stem.indexOf('___') !== -1 && Array.isArray(t.options) && t.options.length >= 2;
        });
      }
    }

    if (dynamicPool.length > 0) {
      var unused = dynamicPool.filter(function (t) {
        return nujumState.usedQuestionIds.indexOf(t.id) === -1;
      });
      if (unused.length === 0) {
        nujumState.usedQuestionIds = [];
        unused = dynamicPool;
      }
      var picked = unused[Math.floor(Math.random() * unused.length)];
      nujumState.usedQuestionIds.push(picked.id);

      var distObj = (picked.distractors && picked.distractors[0]) || {};
      var trap = distObj.option || picked.options[(picked.correctIndex + 1) % picked.options.length];
      var ruleText = (picked.explanation && (picked.explanation.ruleId || picked.explanation.rule)) || "Perhatikan konteks waktu dan kesesuaian subjek.";
      var miscText = distObj.whyFailsId || distObj.misconceptionId || distObj.whyFails || "kebiasaan malas berpikir atau salah mengartikan konteks.";

      return {
        id: picked.id || ("NJ-" + Math.random().toString(36).slice(2, 7)),
        stem: picked.stem,
        options: picked.options,
        correctIndex: picked.correctIndex,
        targetTrap: trap,
        misconceptionCategory: distObj.misconception || "auditory_trap",
        misconceptionText: miscText,
        rule: ruleText,
        cefr: picked.cefr || userCefr,
        skillId: picked.subskill || picked.family || "grammar"
      };
    }

    // Fallback terstruktur jika bank belum termuat — dengan shuffle acak + anti-repetisi
    var pool = FALLBACK_TEMPLATES.filter(function (t) {
      return t.cefr === userCefr;
    });
    if (pool.length === 0) {
      pool = FALLBACK_TEMPLATES;
    }
    var unusedFb = pool.filter(function (t) {
      return nujumState.usedQuestionIds.indexOf(t.id) === -1;
    });
    if (unusedFb.length === 0) {
      nujumState.usedQuestionIds = [];
      unusedFb = pool;
    }
    var pickedFb = unusedFb[Math.floor(Math.random() * unusedFb.length)];
    nujumState.usedQuestionIds.push(pickedFb.id);
    return pickedFb;
  }

  /** Audio Atmosphere Synthesizer (0ms Latency Web Audio API) */
  var NujumAudioAtmosphere = (function () {
    var ctx = null;
    function getCtx() {
      if (!ctx && (window.AudioContext || window.webkitAudioContext)) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (ctx && ctx.state === 'suspended') {
        try { ctx.resume(); } catch (_) {}
      }
      return ctx;
    }

    return {
      playTauntDrone: function () {
        // Pure voice audio takes precedence — zero oscillator noise
      },
      playHeartbeat: function () {
        var c = getCtx();
        if (!c) return;
        try {
          var osc = c.createOscillator();
          var gain = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(75, c.currentTime);
          osc.frequency.exponentialRampToValueAtTime(32, c.currentTime + 0.12);
          gain.gain.setValueAtTime(0.2, c.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.12);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start();
          osc.stop(c.currentTime + 0.14);
        } catch (_) {}
      },
      playShieldCrack: function () {
        // Pure voice audio takes precedence — zero oscillator noise
      },
      playGlitchSting: function () {
        // Pure voice audio takes precedence — zero oscillator noise
      }
    };
  })();

  var currentMachineAudio = null;

  /** Pengucapan suara mesin mentor — GEMINI VOICE (FENRIR) SARKAS DENGAN TAWA SINIS */
  function speakMachine(scriptOrTextEn, maybeTextId, maybeScriptId) {
    var scriptId = '';
    var speechText = '';

    if (typeof scriptOrTextEn === 'object' && scriptOrTextEn !== null) {
      scriptId = scriptOrTextEn.id || '';
      speechText = scriptOrTextEn.text_id || scriptOrTextEn.text_en || '';
    } else if (typeof maybeTextId === 'object' && maybeTextId !== null) {
      scriptId = maybeTextId.id || '';
      speechText = maybeTextId.text_id || maybeTextId.text_en || '';
    } else {
      speechText = maybeTextId || scriptOrTextEn || '';
      scriptId = maybeScriptId || '';
    }

    nujumState.isSpeakingMachine = true;
    var core = doc.getElementById('nujumAnimaCore');
    if (core) core.classList.add('is-speaking');

    // Hentikan audio sebelumnya bila sedang berbunyi
    if (currentMachineAudio) {
      try {
        currentMachineAudio.pause();
        currentMachineAudio.currentTime = 0;
      } catch (_) {}
      currentMachineAudio = null;
    }

    // 1. Putar klip suara Gemini Fenrir sarkas & tawa sinis (0ms latency)
    if (scriptId) {
      var audioPath = './features/nujum/audio/' + scriptId + '.mp3';
      var audio = new Audio(audioPath);
      currentMachineAudio = audio;

      audio.onplay = function () {
        nujumState.isSpeakingMachine = true;
        if (core) core.classList.add('is-speaking');
      };

      audio.onended = function () {
        nujumState.isSpeakingMachine = false;
        if (core) core.classList.remove('is-speaking');
        currentMachineAudio = null;
      };

      audio.onerror = function () {
        currentMachineAudio = null;
        fallbackSpeech(speechText, core);
      };

      var p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () {
          currentMachineAudio = null;
          fallbackSpeech(speechText, core);
        });
      }
      return;
    }

    fallbackSpeech(speechText, core);
  }

  function fallbackSpeech(text, core) {
    var dur = Math.min(6000, Math.max(2200, (text || '').length * 55));
    setTimeout(function () {
      nujumState.isSpeakingMachine = false;
      if (core) core.classList.remove('is-speaking');
    }, dur);
  }

  /** Inisialisasi Canvas Waveform 60 FPS */
  function initWaveform(canvas) {
    if (!canvas) return;
    nujumState.waveCanvas = canvas;
    nujumState.waveCtx = canvas.getContext('2d');

    function draw() {
      if (!nujumState.active || !nujumState.waveCanvas) return;
      var ctx = nujumState.waveCtx;
      var w = nujumState.waveCanvas.width = nujumState.waveCanvas.offsetWidth || 300;
      var h = nujumState.waveCanvas.height = nujumState.waveCanvas.offsetHeight || 42;

      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 2.5;

      var isLive = nujumState.isListening || nujumState.isSpeakingMachine;
      ctx.strokeStyle = nujumState.isListening ? '#EF4444' : nujumState.isSpeakingMachine ? '#FFD700' : '#5E1420';

      ctx.beginPath();
      var slices = 40;
      var sliceW = w / slices;
      var amp = isLive ? (h * 0.38) : (h * 0.08);

      for (var i = 0; i <= slices; i++) {
        var x = i * sliceW;
        var freq = isLive ? 0.35 : 0.12;
        var y = (h / 2) + Math.sin(i * freq + nujumState.wavePhase) * amp * Math.sin((i / slices) * Math.PI);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      nujumState.wavePhase += isLive ? 0.18 : 0.04;
      nujumState.waveAnimFrame = requestAnimationFrame(draw);
    }

    if (nujumState.waveAnimFrame) cancelAnimationFrame(nujumState.waveAnimFrame);
    draw();
  }

  /** Inisialisasi Web Speech API */
  function setupSpeechRecognition() {
    var Ctor = root.SpeechRecognition || root.webkitSpeechRecognition;
    if (!Ctor) return null;
    try {
      var rec = new Ctor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = function () {
        nujumState.isListening = true;
        updateMicUI(true);
        var previewEl = doc.getElementById('nujumSttPreview');
        if (previewEl) {
          previewEl.textContent = 'Mendengarkan suaramu...';
          previewEl.classList.add('is-active');
        }
      };

      rec.onresult = function (event) {
        var transcript = '';
        for (var i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        nujumState.lastTranscript = transcript.trim();
        var previewEl = doc.getElementById('nujumSttPreview');
        if (previewEl) {
          previewEl.textContent = '“' + transcript + '”';
          previewEl.classList.add('is-active');
        }

        if (event.results[0] && event.results[0].isFinal) {
          evaluateAnswer(transcript);
        }
      };

      rec.onerror = function (event) {
        nujumState.isListening = false;
        updateMicUI(false);
        var previewEl = doc.getElementById('nujumSttPreview');
        if (previewEl) {
          var errorType = (event && event.error) || 'unknown';
          var msg = 'Mikrofon error. Gunakan tombol sentuh.';
          if (errorType === 'not-allowed') msg = '⚠️ Izinkan mikrofon di pengaturan browser.';
          else if (errorType === 'no-speech') msg = '🔇 Tidak terdengar suara. Coba lebih keras.';
          else if (errorType === 'network') msg = '📡 Koneksi terputus. Gunakan tombol sentuh.';
          else if (errorType === 'aborted') msg = 'Mic dihentikan.';
          previewEl.textContent = msg;
          previewEl.classList.add('is-active');
        }
      };

      rec.onend = function () {
        nujumState.isListening = false;
        updateMicUI(false);
      };

      return rec;
    } catch (_) {
      return null;
    }
  }

  function updateMicUI(listening) {
    var btn = doc.getElementById('nujumMicBtn');
    if (btn) {
      btn.classList.toggle('is-listening', !!listening);
      btn.setAttribute('aria-pressed', listening ? 'true' : 'false');
    }
    var hint = doc.getElementById('nujumMicHint');
    if (hint) {
      hint.textContent = listening ? 'Mendengarkan suaramu... Ucapkan kata atau kalimat lengkap.' : 'Tekan untuk berbicara';
    }
  }

  /** Timer & Shield Helper Functions */
  function stopRoundTimer() {
    if (nujumState.roundTimerInterval) {
      clearInterval(nujumState.roundTimerInterval);
      nujumState.roundTimerInterval = null;
    }
  }

  /** Progressive difficulty: timer gets shorter in later rounds */
  function getRoundTimerDuration() {
    var ri = nujumState.roundIndex;
    if (nujumState.isDoubleDown) return Math.max(6.0, getRoundTimerDuration._base - 2.0);
    // Ronde 0-2: 12s, Ronde 3-4: 10s, Ronde 5-6: 8s, Ronde 7 (Final): 6s
    if (ri <= 2) return 12.0;
    if (ri <= 4) return 10.0;
    if (ri <= 6) return 8.0;
    return 6.0;  // Final round — ALL-IN pressure
  }
  // Store base for DD calc
  getRoundTimerDuration._base = 10.0;

  function startCrucibleTimer(totalSeconds) {
    stopRoundTimer();
    var duration = typeof totalSeconds === 'number' ? totalSeconds : getRoundTimerDuration();
    getRoundTimerDuration._base = duration;
    nujumState.roundTimeLeft = duration;

    var timerBar = doc.getElementById('nujumCrucibleTimerBar');
    var timerText = doc.getElementById('nujumCrucibleTimerText');
    var stageEl = doc.getElementById('nujumCrucibleStage');
    if (timerBar) {
      timerBar.style.width = '100%';
      timerBar.classList.remove('is-panic');
    }
    if (timerText) {
      timerText.textContent = duration.toFixed(1) + 's';
      timerText.classList.remove('is-panic');
    }
    if (stageEl) {
      stageEl.classList.remove('is-panic');
    }

    var tickIntervalMs = 100;
    nujumState.roundTimerInterval = setInterval(function () {
      if (!nujumState.active || nujumState.timerPaused) {
        if (!nujumState.active) stopRoundTimer();
        return;
      }
      nujumState.roundTimeLeft = Math.max(0, +(nujumState.roundTimeLeft - 0.1).toFixed(1));
      var pct = Math.max(0, (nujumState.roundTimeLeft / duration) * 100);

      var bar = doc.getElementById('nujumCrucibleTimerBar');
      var txt = doc.getElementById('nujumCrucibleTimerText');
      var stg = doc.getElementById('nujumCrucibleStage');

      if (bar) bar.style.width = pct + '%';
      if (txt) txt.textContent = nujumState.roundTimeLeft.toFixed(1) + 's';

      if (nujumState.roundTimeLeft <= 3.2) {
        if (bar) bar.classList.add('is-panic');
        if (txt) txt.classList.add('is-panic');
        if (stg) stg.classList.add('is-panic');
        var core = doc.getElementById('nujumAnimaCore');
        if (core) core.classList.add('is-hunting');
        if (Math.round(nujumState.roundTimeLeft * 10) % 10 === 0 && nujumState.roundTimeLeft > 0) {
          try { NujumAudioAtmosphere.playHeartbeat(); } catch (_) {}
        }
      }

      if (nujumState.roundTimeLeft <= 0) {
        stopRoundTimer();
        handleRoundTimeout(nujumState.currentQuestion);
      }
    }, tickIntervalMs);
  }

  /** Ready countdown overlay — timer starts only after user sees stem */
  function showReadyCountdown(callback) {
    var screenEl = doc.querySelector('.nujum-screen');
    if (!screenEl) { callback(); return; }
    var overlay = doc.createElement('div');
    overlay.className = 'nujum-ready-overlay';
    overlay.innerHTML = '<div class="nujum-ready-count">⚡</div><div class="nujum-ready-label">BERSIAP...</div>';
    screenEl.appendChild(overlay);

    setTimeout(function () {
      if (!overlay.parentNode) return;
      overlay.querySelector('.nujum-ready-count').textContent = '1';
      overlay.querySelector('.nujum-ready-label').textContent = 'MULAI!';
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        callback();
      }, 500);
    }, 800);
  }

  function updateShieldUI(shattered) {
    var fill = doc.getElementById('nujumShieldFill');
    var txt = doc.getElementById('nujumShieldText');
    if (fill) {
      fill.style.width = nujumState.machineShield + '%';
      fill.classList.toggle('is-critical', nujumState.machineShield <= 30);
    }
    if (txt) {
      txt.textContent = nujumState.machineShield + '%';
    }
    if (shattered) {
      var screenEl = doc.querySelector('.nujum-screen');
      if (screenEl) {
        screenEl.classList.remove('is-shattered');
        void screenEl.offsetWidth;
        screenEl.classList.add('is-shattered');
        setTimeout(function () {
          if (screenEl) screenEl.classList.remove('is-shattered');
        }, 500);
      }
    }
  }

  function showVerdict(html) {
    var actEl = doc.getElementById('nujumActionZone');
    if (actEl) actEl.style.display = 'none';
    var vEl = doc.getElementById('nujumVerdictArea');
    if (vEl) {
      vEl.style.display = 'block';
      vEl.innerHTML = html;
    }
  }

  function handleRoundTimeout(q) {
    if (!nujumState.active || !q) return;
    stopRoundTimer();

    var points = nujumState.isDoubleDown ? 2 : 1;
    nujumState.scoreMesin += points;

    var bktPenalty = nujumState.isDoubleDown ? 0.20 : 0.14;
    nujumState.bktMean = Math.max(0.10, +(nujumState.bktMean - bktPenalty).toFixed(2));
    nujumState.bktMargin = Math.min(0.30, +(nujumState.bktMargin * 1.25).toFixed(2));

    var slotPod = doc.getElementById('nujumSlotPod');
    if (slotPod) {
      slotPod.textContent = '[ WAKTU HABIS ]';
      slotPod.className = 'nujum-slot-pod is-loss';
    }

    var screenEl = doc.querySelector('.nujum-screen');
    if (screenEl) {
      screenEl.classList.remove('is-glitch');
      void screenEl.offsetWidth;
      screenEl.classList.add('is-glitch');
      setTimeout(function () {
        if (screenEl) screenEl.classList.remove('is-glitch');
      }, 500);
    }

    // glitch sting
    var core = doc.getElementById('nujumAnimaCore');
    if (core) {
      core.classList.remove('is-speaking', 'is-hunting');
      core.classList.add('is-roasting');
    }

    var toScript = getScript("machine_win", "freeze_timeout",
      "Waktu habis! Autopilot membekukan pikiranmu. Keraguan ini membuktikan kamu belum menguasai polanya secara refleks.",
      "Time expired! Cognitive freeze took over. Hesitation confirms your lack of reflex mastery."
    );
    speakMachine(toScript);

    var doubleLossBanner = nujumState.isDoubleDown
      ? '<div class="nujum-verdict-banner-loss">⚠️ DOUBLE DOWN GAGAL KARENA TIMEOUT (+2 POIN MESIN)</div>'
      : '';

    showVerdict([
      '<div class="nujum-loss-card is-timeout">',
      '  <div class="nujum-loss-title">⏱️ WAKTU HABIS (+' + points + ' POIN MESIN)</div>',
      doubleLossBanner,
      '  <div class="nujum-loss-quote">«' + toScript.text_id + '»</div>',
      '  <div class="nujum-loss-pattern">',
      '    <b>Bentuk benar:</b> «' + q.options[q.correctIndex] + '». ' + q.rule,
      '  </div>',
      '  <div style="display:flex;flex-direction:column;gap:6px">',
      '    <button class="nujum-dispute-btn" id="nujumDisputeBtn">' + t('nujum.dispute_claim', '⚡ SANGGAH KLAIM (Buktikan 3 Soal)') + '</button>',
      '    <button class="nujum-next-btn" id="nujumNextRoundBtn">' + t('nujum.accept_next', 'Terima & Lanjut Ronde →') + '</button>',
      '  </div>',
      '</div>'
    ].join(''));

    renderBktTrack();
    updateScorePill();
    updateShieldUI(false);

    try { if (typeof root.playFeedbackSound === 'function') root.playFeedbackSound('wrong'); } catch (_) {}

    var nextBtn = doc.getElementById('nujumNextRoundBtn');
    if (nextBtn) nextBtn.onclick = advanceRound;

    var disputeBtn = doc.getElementById('nujumDisputeBtn');
    if (disputeBtn) disputeBtn.onclick = function () { triggerDispute(q); };
  }

  /** Evaluasi jawaban dari suara atau sentuhan */
  function evaluateAnswer(selectedText) {
    if (!nujumState.active || !nujumState.currentQuestion) return;
    stopRoundTimer();
    var q = nujumState.currentQuestion;
    var correctOpt = q.options[q.correctIndex].toLowerCase().trim();
    var text = String(selectedText || '').toLowerCase().trim();
    var durationSec = (Date.now() - (nujumState.roundStartTime || Date.now())) / 1000;

    var isCorrect = false;
    if (text === correctOpt) {
      isCorrect = true;
    } else {
      try {
        var escapedOpt = correctOpt.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        var wordRegex = new RegExp('(?:^|\\s|,|\\.)' + escapedOpt + '(?:$|\\s|,|\\.)', 'i');
        isCorrect = wordRegex.test(text);
      } catch (_) {
        isCorrect = text === correctOpt;
      }
    }
    var verdictEl = doc.getElementById('nujumVerdictArea');
    var slotPod = doc.getElementById('nujumSlotPod');
    if (!verdictEl) return;

    if (slotPod) {
      slotPod.textContent = text || correctOpt;
      slotPod.className = isCorrect ? 'nujum-slot-pod is-win' : 'nujum-slot-pod is-loss';
    }

    var points = nujumState.isDoubleDown ? 2 : 1;

    if (isCorrect) {
      // Mesin KALAH
      nujumState.scoreKamu += points;
      nujumState.brokenClaims.push({
        stem: q.stem,
        bet: nujumState.currentBet,
        predicted: q.targetTrap,
        actual: correctOpt,
        points: points
      });

      // Update Neural Shield Mesin
      var damage = nujumState.isDoubleDown ? 25 : 15;
      nujumState.machineShield = Math.max(0, nujumState.machineShield - damage);
      updateShieldUI(true);

      // Update BKT: taksiran penguasaan naik, ketidakpastian menyempit
      var bktBonus = nujumState.isDoubleDown ? 0.26 : 0.18;
      nujumState.bktMean = Math.min(0.96, +(nujumState.bktMean + bktBonus).toFixed(2));
      nujumState.bktMargin = Math.max(0.04, +(nujumState.bktMargin * 0.70).toFixed(2));

      var swScript = getScript("machine_defeat", null,
        "Cih! Taruhanku patah. Ternyata kamu membaca kalimatnya sampai tuntas, bukan cuma melirik kata pertama. Jangan senang dulu, ronde berikutnya kuhabisi.",
        "Dammit. My bet was broken. You evaluated the entire sentence rather than glancing at the first word."
      );

      // shield cracked
      var core = doc.getElementById('nujumAnimaCore');
      if (core) {
        core.classList.remove('is-speaking', 'is-hunting');
        core.classList.add('is-cracked');
      }

      speakMachine(swScript);

      var doubleDownBanner = nujumState.isDoubleDown
        ? '<div style="background:#FEF3C7;color:#92400E;border:1px solid #D97706;padding:4px 8px;border-radius:6px;font-weight:800;font-size:0.75rem;margin-bottom:8px">🔥 DOUBLE DOWN BERHASIL (+2 POIN KAMU)</div>'
        : '';

      showVerdict([
        '<div class="nujum-win-card">',
        '  <div class="nujum-win-title">✦ TARUHAN MESIN PATAH (-' + nujumState.currentBet + '%)</div>',
        doubleDownBanner,
        '  <div style="font-size:0.86rem;font-weight:600;margin-bottom:8px;line-height:1.45">«' + swScript.text_id + '» Jawaban benar: <b>' + q.options[q.correctIndex] + '</b>. ' + q.rule + '</div>',
        '  <button class="nujum-teleport-btn" id="nujumNextRoundBtn" style="background:#059669;margin-top:6px">' + t('nujum.next_duel', 'Lanjut Duel Berikutnya →') + '</button>',
        '</div>'
      ].join(''));

      try { if (typeof root.playFeedbackSound === 'function') root.playFeedbackSound('correct'); } catch (_) {}
    } else {
      // Mesin MENANG
      nujumState.scoreMesin += points;
      updateShieldUI(false);

      var screenEl = doc.querySelector('.nujum-screen');
      if (screenEl) {
        screenEl.classList.remove('is-glitch');
        void screenEl.offsetWidth;
        screenEl.classList.add('is-glitch');
        setTimeout(function () { if (screenEl) screenEl.classList.remove('is-glitch'); }, 500);
      }

      // glitch sting
      var core = doc.getElementById('nujumAnimaCore');
      if (core) {
        core.classList.remove('is-speaking', 'is-hunting');
        core.classList.add('is-roasting');
      }

      // Update BKT: taksiran turun
      var bktPenalty = nujumState.isDoubleDown ? 0.18 : 0.12;
      nujumState.bktMean = Math.max(0.12, +(nujumState.bktMean - bktPenalty).toFixed(2));
      nujumState.bktMargin = Math.min(0.28, +(nujumState.bktMargin * 1.20).toFixed(2));

      // Pilih roaster tajam
      var category = q.misconceptionCategory;
      if (durationSec < 1.8) category = "false_confidence_speed";
      var mwScript = getScript("machine_win", category,
        "Autopilot murahan! Kamu cuma melirik satu kata pertama lalu malas membaca subjek aslinya sampai tuntas.",
        "Exactly as predicted. You walked straight into my diagnostic trap."
      );

      speakMachine(mwScript);

      var doubleLossBanner = nujumState.isDoubleDown
        ? '<div style="background:#FEE2E2;color:#991B1B;border:1px solid #DC2626;padding:4px 8px;border-radius:6px;font-weight:800;font-size:0.75rem;margin-bottom:8px">⚠️ DOUBLE DOWN GAGAL (+2 POIN MESIN)</div>'
        : '';

      showVerdict([
        '<div class="nujum-loss-card">',
        '  <div class="nujum-loss-title">✕ MESIN MENANG (' + nujumState.currentBet + '%)</div>',
        doubleLossBanner,
        '  <div class="nujum-loss-quote">«' + mwScript.text_id + '»</div>',
        '  <div style="background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:8px 10px;font-size:0.75rem;margin-bottom:10px;color:#FECDD3">',
        '    <b>Bentuk benar:</b> «' + q.options[q.correctIndex] + '». ' + q.rule,
        '  </div>',
        '  <div style="display:flex;flex-direction:column;gap:6px">',
        '    <button class="nujum-dispute-btn" id="nujumDisputeBtn">' + t('nujum.dispute_claim', '⚡ SANGGAH KLAIM (Buktikan 3 Soal)') + '</button>',
        '    <button class="nujum-next-btn" id="nujumNextRoundBtn">' + t('nujum.accept_next', 'Terima & Lanjut Ronde →') + '</button>',
        '  </div>',
        '</div>'
      ].join(''));

      try { if (typeof root.playFeedbackSound === 'function') root.playFeedbackSound('wrong'); } catch (_) {}
    }

    renderBktTrack();
    updateScorePill();

    var nextBtn = doc.getElementById('nujumNextRoundBtn');
    if (nextBtn) {
      nextBtn.onclick = function () {
        advanceRound();
      };
    }

    var disputeBtn = doc.getElementById('nujumDisputeBtn');
    if (disputeBtn) {
      disputeBtn.onclick = function () {
        triggerDispute(q);
      };
    }
  }

  /** Alur Honest Surrender ("Aku Menyerah / Belum Mengerti") */
  function handleSurrender(q) {
    if (!nujumState.active || !q) return;
    stopRoundTimer();

    nujumState.scoreMesin++;
    var fullCorrectSentence = q.stem.replace('___', q.options[q.correctIndex]);

    var slotPod = doc.getElementById('nujumSlotPod');
    if (slotPod) {
      slotPod.textContent = q.options[q.correctIndex];
      slotPod.className = 'nujum-slot-pod is-win';
    }

    var srScript = getScript("honest_surrender", "praise_honesty",
      "Bagus. Mengakui tidak tahu jauh lebih bermartabat daripada menebak asal jadi dan berpura-pura paham.",
      "Good. Acknowledging you do not know is far more honorable than blind guessing."
    );

    speakMachine(srScript);

    showVerdict([
      '<div class="nujum-surrender-sanctum">',
      '  <div class="nujum-surrender-sanctum-badge">✦ PROTOKOL KEJUJURAN KOGNITIF (TIDAK DI-ROAST)</div>',
      '  <div class="nujum-surrender-sanctum-quote">«' + srScript.text_id + '»</div>',
      '  <div class="nujum-echo-player-card">',
      '    <div class="nujum-echo-top"><span>ECHO REDEMPTION AUDIO</span><span>VOICE: NATIVE EDUCATOR</span></div>',
      '    <div class="nujum-echo-body">',
      '      <button class="nujum-echo-play-btn" id="nujumEchoPlayBtn" aria-label="Putar audio echo redemption">',
      '        <svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
      '      </button>',
      '      <div>',
      '        <div class="nujum-echo-sentence">«' + fullCorrectSentence + '»</div>',
      '        <div style="font-size:0.68rem;color:var(--nj-text-muted);font-family:var(--nj-font-mono);margin-top:2px">Dengarkan & ikuti bentuk yang benar</div>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div style="text-align:center;margin:4px 0">',
      '    <button class="nujum-echo-record-btn" id="nujumEchoMicBtn">',
      '      <span>🎙️</span>',
      '      <span>Ucapkan Bentuk yang Benar</span>',
      '    </button>',
      '    <div id="nujumEchoFeedback" style="margin-top:6px"></div>',
      '  </div>',
      '  <div class="nujum-kaidah-card"><b>Kaidah:</b> ' + q.rule + '</div>',
      '  <div style="display:flex;flex-direction:column;gap:6px">',
      '    <button class="nujum-teleport-btn" id="nujumTeleportPracticeBtn">',
      '      <span>🚀</span> ' + t('nujum.teleport_practice', 'Latih Materi Ini Sekarang (Modul Latihan) →'),
      '    </button>',
      '    <button class="nujum-next-btn" id="nujumNextRoundBtn">',
      '      ' + t('nujum.next_round', 'Lanjut Ronde Duel Berikutnya →'),
      '    </button>',
      '  </div>',
      '</div>'
    ].join(''));

    renderBktTrack();
    updateScorePill();

    var echoBtn = doc.getElementById('nujumEchoPlayBtn');
    if (echoBtn) {
      echoBtn.onclick = function () {
        speakMachine(fullCorrectSentence, fullCorrectSentence);
      };
    }

    var echoMicBtn = doc.getElementById('nujumEchoMicBtn');
    if (echoMicBtn) {
      echoMicBtn.onclick = function () {
        var Ctor = root.SpeechRecognition || root.webkitSpeechRecognition;
        if (!Ctor) {
          alert('Web Speech API tidak didukung di perangkat ini.');
          return;
        }
        var echoRec = new Ctor();
        echoRec.lang = 'en-US';
        echoMicBtn.classList.add('is-recording');
        echoRec.onresult = function (ev) {
          echoMicBtn.classList.remove('is-recording');
          var spoken = (ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript) || '';
          var targetWord = q.options[q.correctIndex].toLowerCase().trim();
          var feedbackEl = doc.getElementById('nujumEchoFeedback');
          if (feedbackEl) {
            var spokenLower = spoken.toLowerCase().trim();
            var echoMatch = false;
            if (spokenLower === targetWord) {
              echoMatch = true;
            } else {
              try {
                var esc = targetWord.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                echoMatch = new RegExp('(?:^|\\s|,|\\.)' + esc + '(?:$|\\s|,|\\.)', 'i').test(spokenLower);
              } catch (_) {}
            }
            if (echoMatch) {
              feedbackEl.innerHTML = '<span class="nujum-echo-feedback-badge">✦ Pelafalan Tepat! Kejujuran kognitifmu terbayar lunas.</span>';
              try { if (typeof root.playFeedbackSound === 'function') root.playFeedbackSound('correct'); } catch (_) {}
            } else {
              feedbackEl.innerHTML = '<span style="font-size:0.75rem;color:var(--nj-maroon);font-weight:700">Terdengar: “' + spoken + '”. Dengarkan lagi audio di atas.</span>';
            }
          }
        };
        echoRec.onerror = echoRec.onend = function () {
          echoMicBtn.classList.remove('is-recording');
        };
        try { echoRec.start(); } catch (_) { echoMicBtn.classList.remove('is-recording'); }
      };
    }

    // Setup tombol teleport
    var teleportBtn = doc.getElementById('nujumTeleportPracticeBtn');
    if (teleportBtn) {
      teleportBtn.onclick = function () {
        teleportToPractice(q.skillId);
      };
    }

    var nextBtn = doc.getElementById('nujumNextRoundBtn');
    if (nextBtn) {
      nextBtn.onclick = function () {
        advanceRound();
      };
    }
  }

  /** Teleportasi secepat kilat ke modul latihan materi tersebut */
  function teleportToPractice(skillId) {
    exitNujum();
    try {
      if (skillId && typeof root.practiceSkill === 'function') {
        root.practiceSkill(skillId);
        return;
      }
    } catch (_) {}
    if (typeof root.go === 'function') {
      root.go('latihan');
    }
  }

  /** Maju ke ronde berikutnya */
  function advanceRound() {
    stopRoundTimer();
    nujumState.roundIndex++;
    if (nujumState.roundIndex >= nujumState.maxRounds) {
      renderDuelSummary();
    } else {
      renderActiveRound();
    }
  }

  /** Alur Sanggah OLM: 3 Soal Kilat Riil (Bukan auto-win) */
  function triggerDispute(template) {
    stopRoundTimer();
    nujumState.inDispute = true;
    var appEl = doc.getElementById('app');
    if (!appEl) return;

    var dsScript = getScript("dispute", "challenge_probe",
      "Kamu menyanggah perhitunganku? Bagus. Buktikan dalam 3 soal kilat tanpa jeda.",
      "You dispute my calculation? Good. Prove it across three rapid-fire trials."
    );

    speakMachine(dsScript);

    // Ambil 3 soal probe pembuktian
    var probePool = [];
    if (Array.isArray(nujumState.cachedTemplates) && nujumState.cachedTemplates.length >= 3) {
      probePool = nujumState.cachedTemplates.filter(function (t) {
        return t && t.stem && Array.isArray(t.options) && t.options.length >= 2 && t.id !== template.id;
      });
    }
    if (probePool.length < 3) {
      probePool = FALLBACK_TEMPLATES.filter(function (t) { return t.id !== template.id; });
    }
    // Shuffle probe pool
    probePool.sort(function () { return 0.5 - Math.random(); });
    nujumState.disputeQuestions = probePool.slice(0, 3).map(function (p) {
      return {
        stem: p.stem,
        options: p.options,
        correctIndex: p.correctIndex,
        rule: (p.explanation && (p.explanation.ruleId || p.explanation.rule)) || p.rule || "Fokus pada struktur kalimat."
      };
    });
    nujumState.disputeIndex = 0;
    nujumState.disputeCorrectCount = 0;

    appEl.innerHTML = [
      '<div class="nujum-screen">',
      '  <div class="nujum-topbar">',
      '    <span class="nujum-pill-tag"><span class="pulse-dot" style="background:#F59E0B"></span> NEGOSIASI OLM AKTIF</span>',
      '    <button class="nujum-back-btn" id="nujumCancelDisputeBtn">' + t('nujum.cancel_dispute', 'Batal Sanggah') + '</button>',
      '  </div>',
      '  <div class="nujum-bet-card" style="border-color:#F59E0B">',
      '    <div class="nujum-bet-label" style="color:#F59E0B">SANGGAHAN DIAJUKAN</div>',
      '    <div class="nujum-claim-statement">«' + dsScript.text_id + '»</div>',
      '    <div class="nujum-bet-rationale">Aturan OLM FIEZEL: Sanggahan yang berhasil menaikkan varians model dan menghapus label miskonsepsi dari ledgermu.</div>',
      '  </div>',
      '  <div id="nujumDisputeProbeArea" style="text-align:center;padding:16px 0">',
      '    <button class="nujum-opt-btn" id="nujumStartProbesBtn" style="background:#F59E0B;color:#000;font-weight:800;padding:16px 24px;border-radius:12px">' + t('nujum.start_dispute', 'Mulai Pembuktian 3 Soal →') + '</button>',
      '  </div>',
      '</div>'
    ].join('');

    doc.getElementById('nujumCancelDisputeBtn').onclick = function () {
      nujumState.inDispute = false;
      if (nujumState.disputeTimerInterval) clearInterval(nujumState.disputeTimerInterval);
      renderActiveRound();
    };

    doc.getElementById('nujumStartProbesBtn').onclick = function () {
      runDisputeProbeStep();
    };
  }

  /** Menjalankan 1 soal pembuktian sanggah OLM */
  function runDisputeProbeStep() {
    var appEl = doc.getElementById('app');
    if (!appEl) return;

    if (nujumState.disputeIndex >= nujumState.disputeQuestions.length) {
      concludeDispute();
      return;
    }

    var probe = nujumState.disputeQuestions[nujumState.disputeIndex];
    var timeLeft = 10;

    var pipsHtml = [0, 1, 2].map(function (idx) {
      var cls = 'nujum-probe-pip';
      if (idx < nujumState.disputeIndex) {
        cls += ' is-correct'; // Soal lampau
      } else if (idx === nujumState.disputeIndex) {
        cls += ' is-current';
      }
      return '<div class="' + cls + '"></div>';
    }).join('');

    appEl.innerHTML = [
      '<div class="nujum-screen">',
      '  <div class="nujum-topbar">',
      '    <span class="nujum-pill-tag"><span class="pulse-dot" style="background:#F59E0B"></span> PROBE ' + (nujumState.disputeIndex + 1) + '/3</span>',
      '    <span class="nujum-diag-tag" id="nujumProbeTimerLabel">Waktu: 10s</span>',
      '  </div>',
      '  <div class="nujum-probe-wrap">',
      '    <div class="nujum-probe-header">',
      '      <span>PEMBUKTIAN KOGNITIF KILAT</span>',
      '      <div class="nujum-probe-pips">' + pipsHtml + '</div>',
      '    </div>',
      '    <div class="nujum-probe-timer-rail">',
      '      <div class="nujum-probe-timer-fill" id="nujumProbeTimerBar" style="width:100%"></div>',
      '    </div>',
      '    <div class="nujum-probe-stem">' + probe.stem.replace('___', '<span style="border-bottom:2px dashed var(--nj-maroon);padding:0 8px;font-family:var(--nj-font-mono)">...</span>') + '</div>',
      '  </div>',
      '  <div class="nujum-tactical-grid">',
      probe.options.map(function (opt) {
        return '    <button class="nujum-tactical-chip nujum-opt-btn" data-probe-val="' + escapeHtml(opt) + '"><div class="nujum-chip-content"><span class="nujum-chip-strike-icon">🎯</span><span class="nujum-chip-text">' + escapeHtml(opt) + '</span></div><span class="nujum-chip-pip"></span></button>';
      }).join('\n'),
      '  </div>',
      '  <div class="nujum-footer">',
      '    <span>DISPUTE TRIAL ACTIVE</span>',
      '    <span>TARGET: 3/3 BENAR</span>',
      '  </div>',
      '</div>'
    ].join('');

    if (nujumState.disputeTimerInterval) clearInterval(nujumState.disputeTimerInterval);

    nujumState.disputeTimerInterval = setInterval(function () {
      timeLeft--;
      var lbl = doc.getElementById('nujumProbeTimerLabel');
      var bar = doc.getElementById('nujumProbeTimerBar');
      if (lbl) lbl.textContent = 'Waktu: ' + timeLeft + 's';
      if (bar) bar.style.width = (timeLeft * 10) + '%';

      if (timeLeft <= 0) {
        clearInterval(nujumState.disputeTimerInterval);
        handleProbeAnswer(''); // Timeout = salah
      }
    }, 1000);

    var btns = doc.querySelectorAll('[data-probe-val]');
    btns.forEach(function (btn) {
      btn.onclick = function () {
        clearInterval(nujumState.disputeTimerInterval);
        var val = btn.getAttribute('data-probe-val');
        handleProbeAnswer(val);
      };
    });
  }

  function handleProbeAnswer(ans) {
    var probe = nujumState.disputeQuestions[nujumState.disputeIndex];
    var isCorrect = String(ans).toLowerCase().trim() === probe.options[probe.correctIndex].toLowerCase().trim();

    if (isCorrect) {
      nujumState.disputeCorrectCount++;
      try { if (typeof root.playFeedbackSound === 'function') root.playFeedbackSound('correct'); } catch (_) {}
    } else {
      try { if (typeof root.playFeedbackSound === 'function') root.playFeedbackSound('wrong'); } catch (_) {}
    }

    nujumState.disputeIndex++;
    setTimeout(function () {
      runDisputeProbeStep();
    }, 450);
  }

  function concludeDispute() {
    nujumState.inDispute = false;
    if (nujumState.disputeTimerInterval) clearInterval(nujumState.disputeTimerInterval);

    var appEl = doc.getElementById('app');
    if (!appEl) return;

    var passed = nujumState.disputeCorrectCount === 3;

    if (passed) {
      nujumState.scoreKamu++;
      nujumState.bktMean = Math.min(0.96, +(nujumState.bktMean + 0.22).toFixed(2));
      nujumState.bktMargin = 0.05;

      var dwScript = getScript("dispute_result", "probe_success",
        "Sanggahan terbukti sah. 3/3 terjawab benar. Mesin mencabut tuduhan dan memperbarui modelmu.",
        "Dispute substantiated. Accusation revoked, student model updated."
      );
      speakMachine(dwScript);

      appEl.innerHTML = [
        '<div class="nujum-screen">',
        '  <div class="nujum-topbar">',
        '    <span class="nujum-pill-tag" style="background:#10B981;color:#fff">✦ SANGGAHAN BERHASIL</span>',
        '  </div>',
        '  <div class="nujum-win-card" style="margin-top:20px">',
        '    <div class="nujum-win-title">3/3 SOAL TERJAWAB BENAR (+1 POIN)</div>',
        '    <div style="font-size:0.92rem;font-weight:700;line-height:1.5;margin:8px 0">«' + dwScript.text_id + '»</div>',
        '    <div style="background:#fff;border:1px solid #10B981;padding:10px;border-radius:10px;font-family:var(--nj-font-mono);font-size:0.75rem;color:#165646">',
        '      ' + t('nujum.dispute_status_revoked', 'Status: Label miskonsepsi DICABUT dari ledgermu.') + '<br>',
        '      BKT Mastery Estimate naik ke: <b>' + Math.round(nujumState.bktMean * 100) + '%</b>.',
        '    </div>',
        '    <button class="nujum-teleport-btn" id="nujumDisputeContinueBtn" style="background:#059669;margin-top:10px">Lanjut Duel Berikutnya →</button>',
        '  </div>',
        '</div>'
      ].join('');

      doc.getElementById('nujumDisputeContinueBtn').onclick = advanceRound;
    } else {
      var dlScript = getScript("dispute_result", "probe_failure",
        "Sanggahan gagal. Kamu terbukti mengulang kesalahan yang sama. Label miskonsepsi tetap berlaku.",
        "Dispute rejected. The probe confirmed your recurring error."
      );
      speakMachine(dlScript);

      appEl.innerHTML = [
        '<div class="nujum-screen">',
        '  <div class="nujum-topbar">',
        '    <span class="nujum-pill-tag" style="background:#F43F5E;color:#fff">✕ SANGGAHAN GAGAL</span>',
        '  </div>',
        '  <div class="nujum-loss-card" style="margin-top:20px">',
        '    <div class="nujum-loss-title">HANYA ' + nujumState.disputeCorrectCount + '/3 BENAR</div>',
        '    <div class="nujum-loss-quote">«' + dlScript.text_id + '»</div>',
        '    <div style="background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);padding:10px;border-radius:10px;font-size:0.75rem;color:#FECDD3">',
        '      ' + t('nujum.dispute_status_failed', 'Status: Tuduhan mesin tetap berlaku. Masuk ke ruang latihan dan latih polanya.') + '',
        '    </div>',
        '    <button class="nujum-next-btn" id="nujumDisputeContinueBtn" style="margin-top:10px">Terima & Lanjut Ronde →</button>',
        '  </div>',
        '</div>'
      ].join('');

      doc.getElementById('nujumDisputeContinueBtn').onclick = advanceRound;
    }
  }

  /** Render Ronde Aktif */
  function renderActiveRound() {
    var appEl = doc.getElementById('app');
    if (!appEl) return;
    stopRoundTimer();
    nujumState.timerPaused = false;
    nujumState.tapGridExpanded = false;

    var q = nujumState.currentQuestion = pickNextQuestion();
    var theta = (root.__getFiezelState && root.__getFiezelState()?.skills?.grammar) || 0.0;
    nujumState.currentBet = calculateBetPercentage(q, theta);
    nujumState.isDoubleDown = false;
    nujumState.roundStartTime = Date.now();

    // Bicarakan taruhan mesin lewat audio saat ronde baru mulai
    var pbScript = getScript("pre_bet", null,
      "Aku bertaruh kamu akan salah di kalimat ini.",
      "I bet you will fail this sentence."
    );
    speakMachine(pbScript);

    var diffStr = (q.cefr === 'B2' ? '+0.90' : q.cefr === 'B1' ? '+0.50' : q.cefr === 'A2' ? '0.00' : '-0.50');
    var trapMarkup = [
      '<span class="nujum-slot-pod is-trap-primed" id="nujumSlotPod">',
      '  <span class="nujum-trap-badge">JEBAKAN MESIN</span>',
      '  <span class="nujum-trap-val">«' + escapeHtml(q.targetTrap) + '»?</span>',
      '  <span class="nujum-trap-cta">⚡ Patahkan!</span>',
      '</span>'
    ].join('');
    var stemDisplay = q.stem.replace('___', trapMarkup);

    // Clean, natural slot in the sentence
    var slotMarkup = '<span class="nujum-slot-pod" id="nujumSlotPod">___</span>';
    var stemDisplay = q.stem.replace('___', slotMarkup);

    // Progressive timer display
    var timerDuration = getRoundTimerDuration();
    var roundLabel = (nujumState.roundIndex >= 7) ? 'FINAL' : 'Ronde ' + (nujumState.roundIndex + 1) + '/8';
    var roundPhase = (nujumState.roundIndex <= 2) ? 'STANDAR' : (nujumState.roundIndex <= 4) ? 'INTENSIF' : (nujumState.roundIndex <= 6) ? 'KRITIS' : '⚡ ALL-IN';

    // Shield break bonus banner
    var shieldBanner = '';
    if (nujumState.machineShield <= 0 && nujumState.scoreKamu > 0) {
      shieldBanner = '<div class="nujum-shield-destroyed-banner">🛡️ SHIELD MESIN HANCUR — RONDE BONUS AKTIF (+15s)</div>';
      timerDuration = 15.0;
    }

    appEl.innerHTML = [
      '<div class="nujum-screen" data-testid="nujum-screen">',
      '  <div class="nujum-topbar">',
      '    <button class="nujum-back-btn" id="nujumExitBtn">',
      '      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>',
      '      <span>Keluar</span>',
      '    </button>',
      '    <div class="nujum-round-pill">',
      '      <span>' + roundLabel + '</span>',
      '      <span class="nujum-phase-tag">' + roundPhase + '</span>',
      '    </div>',
      '    <div class="nujum-scoreboard" id="nujumScorePill">',
      '      <span class="score-mesin">MESIN <b>' + nujumState.scoreMesin + '</b> <small id="nujumShieldText">(' + nujumState.machineShield + '%)</small></span>',
      '      <span aria-hidden="true">⚡</span>',
      '      <span class="score-kamu"><b>' + nujumState.scoreKamu + '</b> KAMU</span>',
      '    </div>',
      '  </div>',

      '  <div class="nujum-crucible-timer-wrap">',
      '    <div class="nujum-crucible-timer-rail">',
      '      <div class="nujum-crucible-timer-fill" id="nujumCrucibleTimerBar" style="width:100%"></div>',
      '    </div>',
      '    <div class="nujum-crucible-timer-count" id="nujumCrucibleTimerText">' + timerDuration.toFixed(1) + 's</div>',
      '  </div>',

      shieldBanner,

      '  <div class="nujum-bet-banner">',
      '    <div class="nujum-bet-headline">',
      '      <div class="nujum-machine-presence">',
      '        <div class="nujum-anima-core" id="nujumAnimaCore" aria-label="Mata mesin mentor Nujum">',
      '          <div class="nujum-core-ring ring-outer"></div>',
      '          <div class="nujum-core-ring ring-middle"></div>',
      '          <div class="nujum-core-pupil" id="nujumCorePupil"></div>',
      '        </div>',
      '        <div class="nujum-bet-badge">',
      '          <span class="pulse-dot"></span>',
      '          <span>TARUHAN MESIN: <b id="nujumOddsNumber">' + nujumState.currentBet + '%</b></span>',
      '        </div>',
      '      </div>',
      '      <button class="nujum-double-down-btn" id="nujumDoubleDownBtn" type="button">',
      '        <span aria-hidden="true">🔥</span>',
      '        <span>Tantang Balik</span>',
      '        <span class="nujum-dd-tag">2x</span>',
      '      </button>',
      '    </div>',
      '    <div class="nujum-bet-taunt">',
      '      «' + escapeHtml(pbScript.text_id) + '»',
      '    </div>',
      '  </div>',

      '  <div class="nujum-crucible-card" id="nujumCrucibleStage">',
      '    <div class="nujum-stem-sentence">' + stemDisplay + '</div>',
      '    <div class="nujum-rule-hint">💡 RULE: ' + escapeHtml((q.skillId || 'GRAMMAR').replace(/_/g, ' ')) + '</div>',
      '  </div>',

      '  <div class="nujum-play-area" id="nujumPlayArea">',
      '    <div class="nujum-action-zone" id="nujumActionZone">',
      '      <div class="nujum-voice-hub">',
      '        <button class="nujum-orb-btn" id="nujumMicBtn" aria-label="Tekan untuk bicara — ucapkan jawaban">',
      '          <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>',
      '        </button>',
      '        <div class="nujum-voice-sub">',
      '          <span class="nujum-voice-hint" id="nujumMicHint">Ucapkan atau ketuk pilihanmu:</span>',
      '          <canvas id="nujumWaveCanvas" class="nujum-wave-canvas" width="180" height="20" style="height:20px;width:100%"></canvas>',
      '          <div class="nujum-stt-preview" id="nujumSttPreview"></div>',
      '        </div>',
      '      </div>',

      '      <div class="nujum-tactical-grid" id="nujumTacticalGrid">',
      q.options.map(function (opt) {
        return [
          '        <button class="nujum-tactical-chip nujum-opt-btn" data-val="' + escapeHtml(opt) + '">',
          '          <span>' + escapeHtml(opt) + '</span>',
          '        </button>'
        ].join('');
      }).join('\n'),
      '      </div>',

      '      <div class="nujum-surrender-wrap">',
      '        <button class="nujum-surrender-text-btn" id="nujumSurrenderBtn" type="button">',
      '          <span aria-hidden="true">🏳️</span>',
      '          <span>' + t('nujum.surrender_unclear', 'Belum paham?') + ' <b>' + t('nujum.surrender_learn', 'Menyerah & Pelajari') + '</b></span>',
      '        </button>',
      '      </div>',
      '    </div>',

      '    <div id="nujumVerdictArea" style="display:none"></div>',
      '  </div>',
      '</div>'
    ].join('');

    // Setup canvas waveform
    initWaveform(doc.getElementById('nujumWaveCanvas'));

    // Show "READY?" countdown before starting timer
    showReadyCountdown(function () {
      startCrucibleTimer(timerDuration);
    });

    // Setup Double Down button
    var ddBtn = doc.getElementById('nujumDoubleDownBtn');
    if (ddBtn) {
      ddBtn.onclick = function () {
        nujumState.isDoubleDown = !nujumState.isDoubleDown;
        ddBtn.classList.toggle('is-active', nujumState.isDoubleDown);
        var screenEl = doc.querySelector('.nujum-screen');
        if (screenEl) screenEl.classList.toggle('is-overdrive', nujumState.isDoubleDown);
        var labelSpan = ddBtn.querySelector('span:nth-child(2)');
        if (labelSpan) {
          labelSpan.textContent = nujumState.isDoubleDown ? 'Double Down Aktif (2x Taruhan)!' : 'Tantang Balik';
        }
        var oddsEl = doc.getElementById('nujumOddsNumber');
        if (oddsEl) {
          oddsEl.style.color = nujumState.isDoubleDown ? '#D97706' : 'var(--nj-crimson)';
        }
        // Pause timer for 1.5s to give decision breathing room
        nujumState.timerPaused = true;
        setTimeout(function () { nujumState.timerPaused = false; }, 1500);
        try { if (typeof root.playFeedbackSound === 'function') root.playFeedbackSound('click'); } catch (_) {}
      };
    }

    // Setup mic button
    var micBtn = doc.getElementById('nujumMicBtn');
    if (micBtn) {
      micBtn.onclick = function () {
        if (!nujumState.recognition) {
          nujumState.recognition = setupSpeechRecognition();
        }
        if (!nujumState.recognition) {
          alert(t('nujum.speech_unsupported', 'Mikrofon Web Speech API tidak didukung di peramban ini. Silakan gunakan tombol kata di bawah.'));
          return;
        }
        if (nujumState.isListening) {
          try { nujumState.recognition.stop(); } catch (_) {}
        } else {
          try { nujumState.recognition.start(); } catch (_) {}
        }
      };
    }

    // Setup tap fallback buttons
    var optBtns = doc.querySelectorAll('.nujum-opt-btn[data-val]');
    optBtns.forEach(function (btn) {
      btn.onclick = function () {
        var val = btn.getAttribute('data-val');
        evaluateAnswer(val);
      };
    });

    // Setup surrender button
    var surrenderBtn = doc.getElementById('nujumSurrenderBtn');
    if (surrenderBtn) {
      surrenderBtn.onclick = function () {
        handleSurrender(q);
      };
    }

    // Setup exit button
    var exitBtn = doc.getElementById('nujumExitBtn');
    if (exitBtn) {
      exitBtn.onclick = function () {
        exitNujum();
      };
    }

    renderBktTrack();
  }

  function renderBktTrack() {
    var ribbon = doc.getElementById('nujumBktRibbon');
    var dot = doc.getElementById('nujumBktDot');
    var label = doc.getElementById('nujumBktScoreLabel');
    if (!ribbon || !dot) return;

    var mean = nujumState.bktMean;
    var margin = nujumState.bktMargin;
    var left = Math.max(0, (mean - margin) * 100);
    var right = Math.min(100, (mean + margin) * 100);
    var width = Math.max(4, right - left);

    ribbon.style.left = left + '%';
    ribbon.style.width = width + '%';
    dot.style.left = (mean * 100) + '%';

    if (label) {
      label.textContent = Math.round(mean * 100) + '% (±' + Math.round(margin * 100) + '%)';
    }
  }

  function updateScorePill() {
    var pill = doc.getElementById('nujumScorePill');
    if (pill) {
      pill.innerHTML = [
        '<span class="score-mesin">MESIN <b>' + nujumState.scoreMesin + '</b></span>',
        '<span>⚡</span>',
        '<span class="score-kamu"><b>' + nujumState.scoreKamu + '</b> KAMU</span>'
      ].join('');
    }
  }

  /** Render Papan Duel Akhir Sesi */
  function renderDuelSummary() {
    var appEl = doc.getElementById('app');
    if (!appEl) return;

    var playerWon = nujumState.scoreKamu > nujumState.scoreMesin;
    var draw = nujumState.scoreKamu === nujumState.scoreMesin;

    var headline = playerWon ? "KAMU MENGALAHKAN MESIN" : draw ? "DUEL IMBANG" : "MESIN MEMBACA POLAMU";
    var color = playerWon ? "#10B981" : draw ? "#FFD700" : "#F43F5E";

    var fsCategory = playerWon ? "player_victory" : draw ? "draw" : "machine_victory";
    var fsScript = getScript("duel_summary", fsCategory,
      playerWon ? "Hasil akhir: Kamu mengalahkan mesin." : "Duel selesai. Mesin berhasil membaca pola pikirmu.",
      playerWon ? "Final verdict: You defeated the machine." : "Duel finished. I read your thought pattern."
    );

    speakMachine(fsScript);

    // Hitung rekor taruhan tertinggi yang berhasil dipatahkan
    var maxBrokenBet = 0;
    nujumState.brokenClaims.forEach(function (c) {
      if (c.bet > maxBrokenBet) maxBrokenBet = c.bet;
    });
    if (maxBrokenBet > 0) {
      try {
        var prevBest = Number(localStorage.getItem('fiezel_nujum_highest_shattered') || 0);
        if (maxBrokenBet > prevBest) {
          localStorage.setItem('fiezel_nujum_highest_shattered', String(maxBrokenBet));
        }
      } catch (_) {}
    }

    // Berikan reward Gems jika menang
    if (playerWon) {
      try {
        if (root.FiezelGems && typeof root.FiezelGems.award === 'function') {
          root.FiezelGems.award(25, 'nujum_victory');
        }
        if (typeof root.playFeedbackSound === 'function') root.playFeedbackSound('complete');
      } catch (_) {}
    }

    appEl.innerHTML = [
      '<div class="nujum-screen">',
      '  <div class="nujum-topbar">',
      '    <span class="nujum-pill-tag">HASIL DUEL 8 RONDE</span>',
      '    <button class="nujum-back-btn" id="nujumSummaryExitBtn">Ke Beranda</button>',
      '  </div>',
      '  <div class="nujum-duel-wrap">',
      '    <h1 style="color:' + color + ';font-size:1.6rem;font-weight:800;margin:0">' + headline + '</h1>',
      '    <div class="nujum-duel-score-big">',
      '      <span style="color:#10B981">' + nujumState.scoreKamu + '</span>',
      '      <span style="color:var(--nj-text-muted);font-size:3rem"> - </span>',
      '      <span style="color:#F43F5E">' + nujumState.scoreMesin + '</span>',
      '    </div>',
      '    <div style="font-size:0.9rem;color:var(--nj-text-muted)">' + fsScript.text_id + '</div>',
      (playerWon ? '    <div style="margin-top:8px"><span class="nujum-home-badge" style="background:#DDF3EA;color:#165646;border-color:#10B981">💎 REWARD +25 GEMS DITAMBAHKAN</span></div>' : ''),
      '  </div>',

      '  <div class="nujum-broken-claims">',
      '    <div class="nujum-broken-title">Klaim Taruhan Mesin yang Kamu Patahkan:</div>',
      '    <ul class="nujum-broken-list">',
      nujumState.brokenClaims.length > 0
        ? nujumState.brokenClaims.map(function (c) {
            return '<li class="nujum-broken-item">Taruhan <b>' + c.bet + '%</b> meleset: kamu mengucapkan «' + c.actual + '» (mesin memprediksi «' + c.predicted + '»).</li>';
          }).join('')
        : '<li style="color:var(--nj-text-muted);font-style:italic">' + t('nujum.empty_victories', 'Belum ada taruhan yang dipatahkan di sesi ini.') + '</li>',
      '    </ul>',
      '  </div>',

      '  <div style="display:flex;flex-direction:column;gap:12px;margin-top:auto">',
      '    <button class="nujum-opt-btn" id="nujumRematchBtn" style="background:var(--nj-maroon);color:#fff;border-color:#F43F5E;font-size:1.1rem;padding:16px;font-weight:700">Tantang 8 Taruhan Lagi →</button>',
      '    <button class="nujum-opt-btn" id="nujumReturnHomeBtn">' + t('nujum.return_home', 'Kembali ke Beranda') + '</button>',
      '  </div>',
      '</div>'
    ].join('');

    doc.getElementById('nujumRematchBtn').onclick = function () {
      startSession({ isDemo: nujumState.isDemo });
    };

    doc.getElementById('nujumReturnHomeBtn').onclick = exitNujum;
    doc.getElementById('nujumSummaryExitBtn').onclick = exitNujum;
  }

  function exitNujum() {
    nujumState.active = false;
    stopRoundTimer();
    if (nujumState.waveAnimFrame) cancelAnimationFrame(nujumState.waveAnimFrame);
    if (nujumState.recognition) {
      try { nujumState.recognition.stop(); } catch (_) {}
    }
    if (nujumState.disputeTimerInterval) clearInterval(nujumState.disputeTimerInterval);
    doc.body.classList.remove('fz-view-nujum');
    try {
      var nav = doc.querySelector('.bottomnav');
      if (nav) nav.style.removeProperty('display');
      var topbar = doc.querySelector('.topbar');
      if (topbar) topbar.style.removeProperty('display');
    } catch (_) {}
    if (typeof root.go === 'function') {
      root.go('home');
    }
  }

  /** Mulai sesi Nujum */
  function startSession(opts) {
    var options = opts || {};
    stopRoundTimer();
    nujumState.active = true;
    nujumState.roundIndex = 0;
    nujumState.scoreMesin = 0;
    nujumState.scoreKamu = 0;
    nujumState.machineShield = 100;
    nujumState.isDoubleDown = false;
    nujumState.timerPaused = false;
    nujumState.tapGridExpanded = false;
    nujumState.brokenClaims = [];
    nujumState.usedQuestionIds = [];
    nujumState.isDemo = !!options.isDemo;
    nujumState.bktMean = nujumState.isDemo ? 0.44 : 0.50;
    nujumState.bktMargin = nujumState.isDemo ? 0.12 : 0.22;

    doc.body.classList.remove('fz-auth-open');
    doc.body.classList.add('fz-view-nujum');
    try {
      var nav = doc.querySelector('.bottomnav');
      if (nav) nav.style.setProperty('display', 'none', 'important');
      var topbar = doc.querySelector('.topbar');
      if (topbar) topbar.style.setProperty('display', 'none', 'important');
    } catch (_) {}
    renderActiveRound();
  }

  /** Markup kartu untuk Home screen */
  function homeCardMarkup() {
    return [
      '<div class="nujum-home-card" onclick="go(\'nujum\')" data-testid="home-nujum-card">',
      '  <div class="nujum-home-card-header">',
      '    <span class="nujum-home-badge"><span class="pulse-dot"></span> MODE BARU · VOICE-FIRST DUEL</span>',
      '    <span class="nujum-home-risk-pill">TARUHAN TINGGI</span>',
      '  </div>',
      '  <div class="nujum-home-title">NUJUM — Mesin yang Bertaruh Melawanmu</div>',
      '  <div class="nujum-home-desc">Bukan kuis pilihan ganda. Mesin menyuarakan taruhan spesifik atas kesalahanmu sebelum kamu menjawab. Berani buktikan mesin salah?</div>',
      '  <button class="nujum-home-cta-btn">' + t('nujum.home_cta', 'Masuk Arena Taruhan Suara →') + '</button>',
      '</div>'
    ].join('');
  }

  var api = {
    startSession: startSession,
    homeCardMarkup: homeCardMarkup,
    exit: exitNujum,
    teleportToPractice: teleportToPractice,
    getCurrentAudio: function () { return currentMachineAudio; },
    getState: function () { return nujumState; },
    speakMachine: speakMachine
  };

  root.FiezelNujum = api;

  // Global view handler untuk app.js
  root.nujumView = function () {
    var isDemo = false;
    try {
      var params = new URLSearchParams(root.location.search);
      if (params.get('demo') === '1' || params.get('nujum') === 'demo') {
        isDemo = true;
      }
    } catch (_) {}
    startSession({ isDemo: isDemo });
  };

})(typeof globalThis !== 'undefined' ? globalThis : window);
