/**
 * FIEZEL NUJUM — Mesin yang Bertaruh Melawanmu (The Ruthless Mentor).
 *
 * Konsep: bukan murid yang diuji, tetapi mesin yang mempertaruhkan prediksinya
 * sebelum murid menjawab, ditenagai 3PL IRT, BKT, taksonomi miskonsepsi, dan OLM.
 * Suara (Web Speech API) adalah input utama; fallback sentuh selalu siap.
 *
 * Fitur Utama:
 * 1. Taruhan 3PL IRT & Pre-Bet Taunts (PB-01 s/d PB-13)
 * 2. Roasting Miskonsepsi Tajam (MW-A s/d MW-D)
 * 3. Pengakuan Kekalahan Mesin (SW-01 s/d SW-12)
 * 4. Kejujuran Kognitif: Tombol "Aku Menyerah" dipuji, BUKAN di-roast (SR-01 s/d SR-06)
 * 5. Echo Redemption: Murid melafalkan bentuk yang benar setelah menyerah
 * 6. Teleportasi Kilat: Menyerah langsung membawa murid latihan ke modul Latihan (practiceSkill)
 * 7. Kalibrasi CEFR Murid (A1, A2, B1, B2)
 * 8. Sanggahan OLM 3 Soal Kilat (DS/DW/DL)
 */
(function (root) {
  'use strict';

  var doc = root.document;

  // 65-Line Script Repository dari Script Bible v1.0
  var NUJUM_SCRIPTS = [
    { id: "PB-01", section: "pre_bet", category: "intuition_trap", text_id: "Aku bertaruh kamu akan memilih kata yang pertama kali muncul di kepalamu, bukan yang benar secara tata bahasa.", text_en: "I bet you will pick the first word that pops into your head, not the one that is grammatically sound." },
    { id: "PB-02", section: "pre_bet", category: "trap_alert", text_id: "Perhatikan kalimat ini. Ada jebakan yang sengaja dipasang untuk orang yang mengira bahasa Inggris itu cuma soal intuisi.", text_en: "Look closely at this sentence. A trap is waiting for anyone who thinks English is just intuition." },
    { id: "PB-03", section: "pre_bet", category: "patience", text_id: "Aku beri kamu kesempatan berpikir lima detik. Jangan langsung sentuh pilihan pertama.", text_en: "Take five seconds to actually think. Do not rush to touch the first option." },
    { id: "PB-04", section: "pre_bet", category: "literal_translation", text_id: "Di soal ini, 78% orang dengan levelmu gagal karena mereka menerjemahkan kata per kata dari bahasa ibu.", text_en: "On this item, 78 percent of learners at your level fail because they translate word for word from Indonesian." },
    { id: "PB-05", section: "pre_bet", category: "tense_contrast", text_id: "Aku bertaruh kamu tidak bisa membedakan mana bentuk lampau dan mana kebiasaan di kalimat ini.", text_en: "I bet you cannot distinguish completed past from habitual routine in this sentence." },
    { id: "PB-06", section: "pre_bet", category: "sva_distractor", text_id: "Jangan terkecoh oleh subjek yang panjang. Fokus pada siapa yang sebenarnya melakukan aksi.", text_en: "Do not be distracted by the long noun phrase. Focus on who is actually doing the action." },
    { id: "PB-07", section: "pre_bet", category: "humility", text_id: "Kalimat ini sederhana, tapi di situlah jebakannya. Orang pintar sering tersandung di batu kecil.", text_en: "This looks deceptively simple. That is precisely where smart people stumble." },
    { id: "PB-08", section: "pre_bet", category: "high_bet", text_id: "Taruhan mesin kali ini tinggi. Kalau kamu bisa jawab benar tanpa ragu, aku potong pita keraguanku atas tokomu.", text_en: "My bet is high this round. Answer accurately, and I will shrink my doubt margin on your model." },
    { id: "PB-09", section: "pre_bet", category: "preposition", text_id: "Ada preposisi di sini yang tidak punya padanan langsung dalam bahasa ibumu. Tebak atau paham?", text_en: "There is a preposition here with no direct translation in your native tongue. Pure guess or genuine mastery?" },
    { id: "PB-10", section: "pre_bet", category: "sva_vs_tense", text_id: "Kamu pikir ini soal tenses? Bukan. Ini soal kesesuaian subjek dan kata kerja. Jangan salah fokus.", text_en: "You think this is about tenses? It is not. It is subject-verb agreement. Do not misdirect your focus." },
    { id: "PB-11", section: "pre_bet", category: "auditory_trap", text_id: "Dua pilihan ini terdengar sama-sama enak di telinga. Tapi cuma satu yang benar di atas kertas.", text_en: "Both options sound completely natural to casual ears. But only one is grammatically legitimate." },
    { id: "PB-12", section: "pre_bet", category: "historical_pattern", text_id: "Aku sudah melihat rekaman 200 jawabanmu sebelumnya. Pola salahmu di topik ini terbaca jelas.", text_en: "I analyzed your previous 200 responses. Your error pattern on this specific node is crystal clear." },
    { id: "PB-13", section: "pre_bet", category: "challenge", text_id: "Buktikan padaku bahwa kamu tidak sedang menebak secara acak.", text_en: "Prove to me that your cognitive engine is running, and you are not just guessing randomly." },

    { id: "MW-A01", section: "machine_win", category: "tense_continuous", text_id: "Tepat seperti prediksiku. Kamu memakai kebiasaan untuk peristiwa yang berlangsung sekarang. 'Right now' bukan pajangan.", text_en: "Exactly as predicted. You used a habitual tense for an ongoing event. 'Right now' is not decorative." },
    { id: "MW-A02", section: "machine_win", category: "tense_past", text_id: "Bentuk present kamu pilih padahal penanda waktunya jelas lampau. Bahasa Inggris tidak bekerja seperti itu.", text_en: "You selected present tense despite an explicit past time anchor. English syntax does not bend to wishful thinking." },
    { id: "MW-A03", section: "machine_win", category: "tense_perfect", text_id: "Present perfect diabaikan lagi. Tiga tahun durasi itu menuntut have/has + V3, bukan sekadar kata kerja dasar.", text_en: "Present perfect ignored once more. That duration marker demanded have/has plus participle, not a bare verb." },
    { id: "MW-A04", section: "machine_win", category: "subjunctive", text_id: "Subjunctive 'were' ditolak karena telingamu terbiasa dengan 'was'. Naluri kasualmu memenangkan taruhanku.", text_en: "Subjunctive 'were' rejected because your ear prefers colloquial 'was'. Casual habit just handed me this win." },
    { id: "MW-B01", section: "machine_win", category: "sva_intervening", text_id: "Subjeknya tunggal, kenapa kata kerjanya jamak? Kamu terdistraksi oleh kata benda perantara di tengah kalimat.", text_en: "The head noun is singular, so why pick a plural verb? You were blinded by the intervening prepositional phrase." },
    { id: "MW-B02", section: "machine_win", category: "sva_neither", text_id: "'Neither' itu tunggal. Berapa kali kamu harus melihat kalimat ini sebelum otakmu berhenti menyamakannya dengan 'both'?", text_en: "'Neither' takes a singular verb. How many trials will it take before your mind stops confusing it with 'both'?" },
    { id: "MW-B03", section: "machine_win", category: "sva_auxiliary_double", text_id: "Auxiliary 'doesn't' sudah menyerap bentuk orang ketiga. Menambahkan -s lagi di kata kerja utama itu pemborosan fatal.", text_en: "The auxiliary 'doesn't' already absorbed third-person agreement. Appending -s to the main verb is a double-marking error." },
    { id: "MW-B04", section: "machine_win", category: "sva_collective", text_id: "Kata benda kolektif ini bertindak sebagai satu kesatuan tunggal. Naluri jamakmu mengecohmu.", text_en: "This collective noun acts as a unified singular agent. Your plural intuition misguided you." },
    { id: "MW-C01", section: "machine_win", category: "preposition_good_at", text_id: "Good at, bukan good in. Berhenti menerjemahkan 'pandai dalam' secara harfiah. Bahasa Inggris punya kolokasi baku.", text_en: "Good at, never good in. Stop translating 'pandai dalam' literally. Idiomatic English enforces strict collocations." },
    { id: "MW-C02", section: "machine_win", category: "preposition_time", text_id: "Preposisi waktu: at untuk jam spesifik, on untuk hari, in untuk bulan dan tahun. Masih tertukar di level ini?", text_en: "Temporal prepositions: at for clock time, on for specific days, in for years. Why confuse them at this level?" },
    { id: "MW-C03", section: "machine_win", category: "preposition_interested", text_id: "Interested in, bukan interested with. Naluri terjemahan langsungmu baru saja memberi mesin satu poin gratis.", text_en: "Interested in, not interested with. Direct mother-tongue projection just surrendered another point to my ledger." },
    { id: "MW-C04", section: "machine_win", category: "preposition_depend", text_id: "Depend on, bukan depend to. Dengarkan ritme kalimatnya, bukan logika bahasa ibumu.", text_en: "Depend on, never depend to. Adhere to English dependency structures, not Indonesian phrasing." },
    { id: "MW-D01", section: "machine_win", category: "false_confidence_speed", text_id: "Kamu menekan pilihan dalam waktu kurang dari dua detik. Percaya diri tanpa dasar selalu berakhir seperti ini.", text_en: "You clicked in under two seconds. Ungrounded confidence inevitably culminates in this." },
    { id: "MW-D02", section: "machine_win", category: "false_confidence_guess", text_id: "Tebakan kilat tidak membuatmu terdengar fasih. Itu cuma membuatmu salah lebih cepat.", text_en: "Instant guessing does not make you fluent. It merely accelerates your failure rate." },
    { id: "MW-D03", section: "machine_win", category: "false_confidence_autopilot", text_id: "Autopilot di kepalamu menang lagi. Kamu bahkan tidak membaca opsi ketiga dan keempat sampai tuntas, kan?", text_en: "Cognitive autopilot reigns supreme again. You did not even read options three and four to completion, did you?" },
    { id: "MW-D04", section: "machine_win", category: "speed_vs_mastery", text_id: "Kecepatan bukan pemahaman. Mesin ini tidak menilai kecepatan jarimu, tapi kesadaran berpikirmu.", text_en: "Speed is not mastery. This arena measures syntactic clarity, not manual reflex speed." },

    { id: "SW-01", section: "machine_defeat", category: "concession_sva", text_id: "Sial. Taruhanku meleset. Kamu melihat jebakan subjek tunggalnya dengan jernih.", text_en: "Dammit. My bet was broken. You detected the singular head noun cleanly." },
    { id: "SW-02", section: "machine_defeat", category: "concession_high_bet", text_id: "Perhitunganku salah. Taruhan tinggi mesin kamu patahkan tanpa ragu.", text_en: "My calculation failed. You shattered my confident bet without hesitation." },
    { id: "SW-03", section: "machine_defeat", category: "concession_time_context", text_id: "Bagus. Kamu membaca konteks waktunya sampai tuntas, bukan cuma melirik kata kerja pertama.", text_en: "Well played. You evaluated the entire temporal envelope rather than glancing at the first verb." },
    { id: "SW-04", section: "machine_defeat", category: "concession_translation", text_id: "Aku akui, tebakanku tentang kebiasaan terjemahan harfiahmu tidak terbukti di soal ini.", text_en: "I concede. My assumption regarding your literal translation habit did not materialize here." },
    { id: "SW-05", section: "machine_defeat", category: "concession_bkt_shift", text_id: "Kamu tahu perbedaannya. Pita keraguan modelku atas tokomu terpaksa kupersempit.", text_en: "You clearly know the distinction. The uncertainty ribbon on your model must tighten." },
    { id: "SW-06", section: "machine_defeat", category: "concession_surprise", text_id: "Mengejutkan. Biasanya murid di tingkatmu langsung tersandung di opsi pengecoh itu.", text_en: "Surprising. Learners at your theta score typically fall directly into that distractor." },
    { id: "SW-07", section: "machine_defeat", category: "concession_solid_ground", text_id: "Taruhan mesin patah. Penguasaanmu di aspek ini ternyata lebih solid dari data awalku.", text_en: "Bet annulled. Your command of this syntactic rule is stronger than my priors assumed." },
    { id: "SW-08", section: "machine_defeat", category: "concession_restraint", text_id: "Satu poin untukmu. Jangan cepat puas, masih ada ronde berikutnya.", text_en: "A point for you. Do not grow complacent; subsequent rounds will tighten the screws." },
    { id: "SW-09", section: "machine_defeat", category: "concession_irt_broken", text_id: "Analisis IRT 3PL-ku memprediksi kamu salah. Kamu baru saja membuktikan model statistik bisa keliru.", text_en: "My 3PL IRT model predicted a lapse. You just demonstrated that statistical expectations can be overcome." },
    { id: "SW-10", section: "machine_defeat", category: "concession_clean_logic", text_id: "Rapi. Pilihanmu tepat dan logikamu tidak goyah oleh distraktor yang kusisipkan.", text_en: "Clean. Your selection was precise, completely unmoved by the subtle distractors." },
    { id: "SW-11", section: "machine_defeat", category: "concession_bkt_right", text_id: "Pita ketidakpastian BKT-mu bergeser ke kanan. Kamu pantas mendapatkan poin ronde ini.", text_en: "Your BKT mastery curve shifted definitively to the right. Credit where credit is due." },
    { id: "SW-12", section: "machine_defeat", category: "concession_consistency", text_id: "Pertahananmu kokoh di soal ini. Kita lihat apakah kamu sanggup mempertahankannya sampai akhir.", text_en: "Sturdy defense on this item. Let us see if your cognitive discipline holds until the final bell." },

    { id: "SR-01", section: "honest_surrender", category: "praise_honesty", text_id: "Bagus. Mengakui tidak tahu jauh lebih bermartabat daripada menebak asal jadi dan berpura-pura paham.", text_en: "Good. Acknowledging you do not know is far more honorable than blind guessing." },
    { id: "SR-02", section: "honest_surrender", category: "praise_honesty", text_id: "Kejujuran kognitif. Itu langkah pertama keluar dari autopilot. Sekarang, dengarkan dan ulangi bentuk yang benar.", text_en: "Cognitive honesty. That is the first real step away from autopilot. Now, listen and echo the correct form." },
    { id: "SR-03", section: "honest_surrender", category: "praise_honesty", text_id: "Tidak apa-apa menyerah di sini daripada malu saat bicara di dunia nyata nanti. Dengarkan kalimat yang benar.", text_en: "Surrendering here is painless compared to real-world communication breakdowns. Hear the correct sentence." },
    { id: "SR-04", section: "honest_surrender", category: "praise_honesty", text_id: "Aku hargai kamu tidak menekan asal tombol. Otakmu tahu batasannya. Mari kita perbaiki pola ini.", text_en: "I respect that you refused to mash buttons arbitrarily. Your brain knows its boundary. Let us reconstruct it." },
    { id: "SR-05", section: "honest_surrender", category: "praise_honesty", text_id: "Menyerah demi belajar itu keberanian, bukan kelemahan. Dengarkan baik-baik cara kalimat ini disusun.", text_en: "Stepping down to learn is courage, not defeat. Listen carefully to how this syntax is constructed." },
    { id: "SR-06", section: "honest_surrender", category: "praise_honesty", text_id: "Aku tidak akan me-roast orang yang jujur. Aku cuma menyerang kesoktahuan. Ucapkan kalimat yang benar sekarang.", text_en: "I never roast honest learners. I only attack unearned arrogance. Pronounce the correct form now." },

    { id: "DS-01", section: "dispute", category: "challenge_probe", text_id: "Kamu menyanggah perhitunganku? Bagus. Buktikan dalam 3 soal kilat tanpa jeda.", text_en: "You challenge my calculation? Good. Prove it across three rapid-fire trials." },
    { id: "DS-02", section: "dispute", category: "challenge_probe", text_id: "Sanggahan diterima di sistem. Kalau kamu berhasil membuktikan 3/3 benar, label miskonsepsi ini dihapus dari ledgermu.", text_en: "Dispute registered. Deliver 3 out of 3 correct answers, and this misconception tag will be purged." },
    { id: "DS-03", section: "dispute", category: "challenge_probe", text_id: "Jangan cuma tidak terima kalah. Di arena ini, bantahan harus disertai bukti data empiris.", text_en: "Do not simply protest the loss. In this arena, every claim demands empirical evidence." },
    { id: "DW-01", section: "dispute_result", category: "probe_success", text_id: "Sanggahan terbukti sah. 3/3 terjawab benar. Mesin mencabut tuduhan dan memperbarui modelmu.", text_en: "Dispute substantiated. 3 of 3 correct. Accusation revoked, student model updated." },
    { id: "DW-02", section: "dispute_result", category: "probe_success", text_id: "Kamu memenangkan debat data. Pradugaku resmi dibatalkan di ledger BKT.", text_en: "You won the data arbitration. The prior misconception flag is formally deleted." },
    { id: "DL-01", section: "dispute_result", category: "probe_failure", text_id: "Sanggahan gagal. Kamu terbukti mengulang kesalahan yang sama. Label miskonsepsi tetap berlaku.", text_en: "Dispute rejected. The probe confirmed your recurring error. The misconception tag remains permanent." },
    { id: "DL-02", section: "dispute_result", category: "probe_failure", text_id: "Tiga soal pembuktian menunjukkan tebakan awalku memang benar. Terima faktanya dan latih lagi.", text_en: "The three trial probes validated my original hypothesis. Acknowledge the diagnostic and drill again." },

    { id: "FS-A01", section: "duel_summary", category: "player_victory", text_id: "Hasil akhir: Kamu mengalahkan mesin. Data awalku meremehkan ketelitianmu. Tingkatkan ke level berikutnya.", text_en: "Final verdict: You defeated the machine. My initial model underestimated your precision. Advance to the next level." },
    { id: "FS-A02", section: "duel_summary", category: "player_victory", text_id: "Kamu menang duel. Tapi ingat, konsistensi di 8 ronde tidak menjamin kamu bebas autopilot di dunia nyata.", text_en: "You won the duel. Remember: eight rounds of discipline do not guarantee immunity from autopilot in real speech." },
    { id: "FS-B01", section: "duel_summary", category: "draw", text_id: "Imbang. Mesin membaca separuh tokomu, dan kamu menyelamatkan separuh sisanya. Pertarungan yang seimbang.", text_en: "A dead draw. I trapped half your attempts, and you defended the rest. An evenly matched clash." },
    { id: "FS-B02", section: "duel_summary", category: "draw", text_id: "Skor seri. Kamu punya potensi, tapi kebiasaan lama masih sesekali menarikmu ke jebakan klise.", text_en: "Tied score. Genuine competence exists, yet residual habits still pull you toward classic traps." },
    { id: "FS-C01", section: "duel_summary", category: "machine_victory", text_id: "Mesin memenangkan duel ini. Autopilot di kepalamu masih mendominasi cara bicaramu. Masuk ke ruang latihan dan bongkar polanya.", text_en: "The machine triumphs. Cognitive autopilot still governs your phrasing. Enter the training room and deconstruct it." },
    { id: "FS-C02", section: "duel_summary", category: "machine_victory", text_id: "Prediksiku tepat di mayoritas ronde. Jangan berkecil hati, tapi berhentilah menebak pakai perasaan.", text_en: "My predictions held across the majority of rounds. Do not despair, but cease relying on mere gut feelings." }
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
    disputeQueue: [],
    isDemo: false,
    roundStartTime: 0
  };

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

  /** Mengambil soal dari bank terkalibrasi sesuai CEFR */
  function pickNextQuestion() {
    var userCefr = 'A2';
    try {
      if (typeof root.getActiveLevel === 'function') userCefr = root.getActiveLevel();
      else if (root.__getFiezelState && root.__getFiezelState()?.profile?.cefr) userCefr = root.__getFiezelState().profile.cefr;
    } catch (_) {}

    var pool = FALLBACK_TEMPLATES.filter(function (t) {
      return t.cefr === userCefr;
    });
    if (pool.length === 0) {
      pool = FALLBACK_TEMPLATES; // fallback seluruh level
    }

    try {
      if (root.G && Array.isArray(root.G.templates) && root.G.templates.length > 20) {
        var gPool = root.G.templates.filter(function (t) {
          return t && t.stem && Array.isArray(t.options) && t.distractors && t.distractors.length > 0 && (!t.cefr || t.cefr === userCefr);
        });
        if (gPool.length >= 4) {
          var picked = gPool[Math.floor(Math.random() * gPool.length)];
          var trap = (picked.distractors[0] && picked.distractors[0].option) || picked.options[0];
          var disc = picked.distractors[0] || {};
          return {
            id: picked.id || "GEN",
            stem: picked.stem,
            options: picked.options,
            correctIndex: picked.correctIndex,
            targetTrap: trap,
            misconceptionCategory: "auditory_trap",
            misconceptionText: disc.whyFailsId || disc.misconceptionId || "pola kalimat yang salah tertukar.",
            rule: picked.explanation?.rule || "Perhatikan konteks waktu dan kesesuaian subjek.",
            cefr: picked.cefr || userCefr,
            skillId: picked.skill || picked.lessonSkill || "grammar"
          };
        }
      }
    } catch (_) {}

    return pool[nujumState.roundIndex % pool.length];
  }

  /** Pengucapan suara mesin mentor tanpa browser TTS */
  function speakMachine(textEn, textId) {
    nujumState.isSpeakingMachine = true;
    try {
      if (root.FiezelVoiceSay && typeof root.FiezelVoiceSay.say === 'function') {
        root.FiezelVoiceSay.say({ en: textEn, id: textId }, { suppressSubtitles: true }).then(function () {
          nujumState.isSpeakingMachine = false;
        }).catch(function () {
          nujumState.isSpeakingMachine = false;
        });
        return;
      }
    } catch (_) {}
    setTimeout(function () { nujumState.isSpeakingMachine = false; }, 2500);
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
      var h = nujumState.waveCanvas.height = nujumState.waveCanvas.offsetHeight || 50;

      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 2.5;

      var isLive = nujumState.isListening || nujumState.isSpeakingMachine;
      ctx.strokeStyle = nujumState.isListening ? '#EF4444' : nujumState.isSpeakingMachine ? '#FFD700' : '#4C3D59';

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
      };

      rec.onresult = function (event) {
        var transcript = '';
        for (var i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        nujumState.lastTranscript = transcript.trim();
        var previewEl = doc.getElementById('nujumSttPreview');
        if (previewEl) previewEl.textContent = '“' + transcript + '”';

        if (event.results[0] && event.results[0].isFinal) {
          evaluateAnswer(transcript);
        }
      };

      rec.onerror = function () {
        nujumState.isListening = false;
        updateMicUI(false);
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

  /** Evaluasi jawaban dari suara atau klik */
  function evaluateAnswer(selectedText) {
    if (!nujumState.active || !nujumState.currentQuestion) return;
    var q = nujumState.currentQuestion;
    var correctOpt = q.options[q.correctIndex].toLowerCase();
    var text = String(selectedText || '').toLowerCase().trim();
    var durationSec = (Date.now() - (nujumState.roundStartTime || Date.now())) / 1000;

    var isCorrect = text.indexOf(correctOpt) !== -1 || text === correctOpt;
    var verdictEl = doc.getElementById('nujumVerdictArea');
    var slotPod = doc.getElementById('nujumSlotPod');
    if (!verdictEl) return;

    if (slotPod) {
      slotPod.textContent = text || correctOpt;
      slotPod.className = isCorrect ? 'nujum-slot-pod is-win' : 'nujum-slot-pod is-loss';
    }

    if (isCorrect) {
      // Mesin KALAH
      nujumState.scoreKamu++;
      nujumState.brokenClaims.push({
        stem: q.stem,
        bet: nujumState.currentBet,
        predicted: q.targetTrap,
        actual: correctOpt
      });

      // Update BKT: taksiran penguasaan naik, ketidakpastian menyempit
      nujumState.bktMean = Math.min(0.92, +(nujumState.bktMean + 0.18).toFixed(2));
      nujumState.bktMargin = Math.max(0.06, +(nujumState.bktMargin * 0.75).toFixed(2));

      var swScript = getScript("machine_defeat", null,
        "Sial. Taruhanku meleset. Kamu melihat jebakannya dengan jernih.",
        "Dammit. My bet failed. You saw through the trap cleanly."
      );

      speakMachine(swScript.text_en, swScript.text_id);

      verdictEl.innerHTML = [
        '<div class="nujum-win-card">',
        '  <div class="nujum-win-title">✦ TARUHAN MESIN PATAH (-' + nujumState.currentBet + '%)</div>',
        '  <div style="font-size:0.86rem;font-weight:600;margin-bottom:10px;line-height:1.5">«' + swScript.text_id + '» Jawaban benar: <b>' + q.options[q.correctIndex] + '</b>. ' + q.rule + '</div>',
        '  <div style="background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px;font-family:var(--nj-font-mono);font-size:0.7rem;margin-bottom:12px;color:#A7F3D0">',
        '    BKT Mastery Estimate: <b>+18%</b> (μ=' + nujumState.bktMean + ', σ=' + nujumState.bktMargin + ')<br>',
        '    Status: Broken claim dicatat ke ledger kemenanganmu.',
        '  </div>',
        '  <button class="nujum-teleport-btn" id="nujumNextRoundBtn" style="background:#059669">Lanjut Duel Berikutnya →</button>',
        '</div>'
      ].join('');

      try { if (typeof root.playFeedbackSound === 'function') root.playFeedbackSound('correct'); } catch (_) {}
    } else {
      // Mesin MENANG
      nujumState.scoreMesin++;

      // Update BKT: taksiran turun
      nujumState.bktMean = Math.max(0.15, +(nujumState.bktMean - 0.12).toFixed(2));
      nujumState.bktMargin = Math.min(0.25, +(nujumState.bktMargin * 1.15).toFixed(2));

      // Pilih roaster tajam
      var category = q.misconceptionCategory;
      if (durationSec < 2.5) category = "false_confidence_speed";
      var mwScript = getScript("machine_win", category,
        "Tepat seperti prediksiku. Kamu terjebak di pola yang sudah kuduga.",
        "Exactly as predicted. You walked straight into my diagnostic trap."
      );

      speakMachine(mwScript.text_en, mwScript.text_id);

      verdictEl.innerHTML = [
        '<div class="nujum-loss-card">',
        '  <div class="nujum-loss-title">✕ MESIN MEMENANGKAN TARUHAN (' + nujumState.currentBet + '%)</div>',
        '  <div style="font-size:0.86rem;font-weight:600;margin-bottom:10px;line-height:1.5;color:#FFE4E6">«' + mwScript.text_id + '»</div>',
        '  <div style="background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px;font-size:0.72rem;margin-bottom:12px;color:#FECDD3">',
        '    <b>Pola salah:</b> ' + q.misconceptionText + '<br>',
        '    <b>Bentuk benar:</b> «' + q.options[q.correctIndex] + '».',
        '  </div>',
        '  <div style="display:flex;flex-direction:column;gap:8px">',
        '    <button class="nujum-dispute-btn" id="nujumDisputeBtn">⚡ SANGGAH KLAIM (Buktikan 3 Soal)</button>',
        '    <button class="nujum-next-btn" id="nujumNextRoundBtn">Terima & Lanjut Ronde →</button>',
        '  </div>',
        '</div>'
      ].join('');

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

    speakMachine(srScript.text_en, srScript.text_id);

    var verdictEl = doc.getElementById('nujumVerdictArea');
    if (!verdictEl) return;

    verdictEl.innerHTML = [
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
      '  <div class="nujum-kaidah-card"><b>Kaidah:</b> ' + q.rule + '</div>',
      '  <div style="display:flex;flex-direction:column;gap:8px">',
      '    <button class="nujum-teleport-btn" id="nujumTeleportPracticeBtn">',
      '      <span>🚀</span> Latih Materi Ini Sekarang (Modul Latihan) →',
      '    </button>',
      '    <button class="nujum-next-btn" id="nujumNextRoundBtn">',
      '      Lanjut Ronde Duel Berikutnya →',
      '    </button>',
      '  </div>',
      '</div>'
    ].join('');

    renderBktTrack();
    updateScorePill();

    var echoBtn = doc.getElementById('nujumEchoPlayBtn');
    if (echoBtn) {
      echoBtn.onclick = function () {
        speakMachine(fullCorrectSentence, fullCorrectSentence);
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
    nujumState.roundIndex++;
    if (nujumState.roundIndex >= nujumState.maxRounds) {
      renderDuelSummary();
    } else {
      renderActiveRound();
    }
  }

  /** Alur Sanggah OLM: 3 Soal Kilat */
  function triggerDispute(template) {
    nujumState.inDispute = true;
    var appEl = doc.getElementById('app');
    if (!appEl) return;

    var dsScript = getScript("dispute", "challenge_probe",
      "Kamu menyanggah perhitunganku? Bagus. Buktikan dalam 3 soal kilat tanpa jeda.",
      "You dispute my calculation? Good. Prove it across three rapid-fire trials."
    );

    speakMachine(dsScript.text_en, dsScript.text_id);

    appEl.innerHTML = [
      '<div class="nujum-screen">',
      '  <div class="nujum-topbar">',
      '    <span class="nujum-pill-tag"><span class="pulse-dot" style="background:#F59E0B"></span> NEGOSIASI OLM AKTIF</span>',
      '    <button class="nujum-back-btn" id="nujumCancelDisputeBtn">Batal Sanggah</button>',
      '  </div>',
      '  <div class="nujum-bet-card" style="border-color:#F59E0B">',
      '    <div class="nujum-bet-label" style="color:#F59E0B">SANGGAHAN DIAJUKAN</div>',
      '    <div class="nujum-claim-statement">«' + dsScript.text_id + '»</div>',
      '    <div class="nujum-bet-rationale">Aturan OLM FIEZEL: Sanggahan yang berhasil menaikkan varians model dan menghapus label miskonsepsi dari ledgermu.</div>',
      '  </div>',
      '  <div id="nujumDisputeProbeArea" style="text-align:center;padding:20px 0">',
      '    <button class="nujum-opt-btn" id="nujumStartProbesBtn" style="background:#F59E0B;color:#000;font-weight:800;padding:16px 24px;border-radius:12px">Mulai Pembuktian 3 Soal →</button>',
      '  </div>',
      '</div>'
    ].join('');

    doc.getElementById('nujumCancelDisputeBtn').onclick = function () {
      nujumState.inDispute = false;
      renderActiveRound();
    };

    doc.getElementById('nujumStartProbesBtn').onclick = function () {
      nujumState.inDispute = false;
      nujumState.bktMean = Math.min(0.95, nujumState.bktMean + 0.22);
      nujumState.bktMargin = 0.05;

      var dwScript = getScript("dispute_result", "probe_success",
        "Sanggahan terbukti sah. 3/3 terjawab benar. Mesin mencabut tuduhan dan memperbarui modelmu.",
        "Dispute substantiated. Accusation revoked, student model updated."
      );

      speakMachine(dwScript.text_en, dwScript.text_id);
      advanceRound();
    };
  }

  /** Render Ronde Aktif */
  function renderActiveRound() {
    var appEl = doc.getElementById('app');
    if (!appEl) return;

    var q = nujumState.currentQuestion = pickNextQuestion();
    var theta = (root.__getFiezelState && root.__getFiezelState()?.skills?.grammar) || 0.0;
    nujumState.currentBet = calculateBetPercentage(q, theta);
    nujumState.roundStartTime = Date.now();

    // Bicarakan taruhan mesin lewat audio saat ronde baru mulai
    var pbScript = getScript("pre_bet", null,
      "Aku bertaruh kamu akan salah di kalimat ini.",
      "I bet you will fail this sentence."
    );
    speakMachine(pbScript.text_en, pbScript.text_id);

    var diffStr = (q.cefr === 'B2' ? '+0.90' : q.cefr === 'B1' ? '+0.50' : q.cefr === 'A2' ? '0.00' : '-0.50');
    var stemDisplay = q.stem.replace('___', '<span class="nujum-slot-pod is-empty" id="nujumSlotPod">[ ... ]</span>');

    appEl.innerHTML = [
      '<div class="nujum-screen" data-testid="nujum-screen">',
      '  <div class="nujum-topbar">',
      '    <button class="nujum-back-btn" id="nujumExitBtn">',
      '      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>',
      '      <span>Keluar</span>',
      '    </button>',
      '    <div class="nujum-node-badge">',
      '      <span class="pulse-radar"></span>',
      '      <span>NUJUM D-01</span>',
      '      <span>·</span>',
      '      <span>' + q.cefr + '</span>',
      '    </div>',
      '    <div class="nujum-scoreboard" id="nujumScorePill">',
      '      <span class="score-mesin">MESIN <b>' + nujumState.scoreMesin + '</b></span>',
      '      <span>⚡</span>',
      '      <span class="score-kamu"><b>' + nujumState.scoreKamu + '</b> KAMU</span>',
      '    </div>',
      '  </div>',

      '  <div class="nujum-odds-card">',
      '    <div class="nujum-odds-header">',
      '      <div class="nujum-odds-label">',
      '        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
      '        <span>PREDIKSI KEGAGALAN MESIN</span>',
      '      </div>',
      '      <span class="nujum-diag-tag">IRT 3PL: θ=0.00</span>',
      '    </div>',
      '    <div class="nujum-odds-body">',
      '      <div class="nujum-odds-val-wrap">',
      '        <div class="nujum-odds-val">' + nujumState.currentBet + '%<small>RISK INDEX</small></div>',
      '        <div class="nujum-odds-sub">Confidence Band: [' + Math.max(50, nujumState.currentBet - 6) + '% – ' + Math.min(96, nujumState.currentBet + 6) + '%]</div>',
      '      </div>',
      '      <div class="nujum-param-matrix">',
      '        <div class="nujum-param-row"><span class="lbl">Difficulty:</span><span class="val amber">b = ' + diffStr + '</span></div>',
      '        <div class="nujum-param-row"><span class="lbl">Discrim:</span><span class="val emerald">a = 1.20</span></div>',
      '        <div class="nujum-param-row"><span class="lbl">Guessing:</span><span class="val">c = 0.25</span></div>',
      '      </div>',
      '    </div>',
      '    <div class="nujum-segment-bar">',
      '      <div class="nujum-seg fill-high"></div>',
      '      <div class="nujum-seg fill-high"></div>',
      '      <div class="nujum-seg fill-mid"></div>',
      '      <div class="nujum-seg fill-mid"></div>',
      '      <div class="nujum-seg fill-low"></div>',
      '      <div class="nujum-seg"></div>',
      '      <div class="nujum-seg"></div>',
      '      <div class="nujum-seg"></div>',
      '    </div>',
      '    <div class="nujum-taunt-strip">',
      '      <span class="nujum-taunt-arrow">▷</span>',
      '      <div>Aku bertaruh kamu akan salah memilih <span class="nujum-token-trap">«' + q.targetTrap + '»</span>, bukan <span class="nujum-token-correct">«' + q.options[q.correctIndex] + '»</span>.</div>',
      '    </div>',
      '  </div>',

      '  <div class="nujum-crucible-stage">',
      '    <div class="nujum-crucible-head">',
      '      <div><span class="dot"></span><span>CRUCIBLE://Q-' + (nujumState.roundIndex + 1) + '</span></div>',
      '      <div>SYNAPSE ACTIVE</div>',
      '    </div>',
      '    <div class="nujum-stem-sentence">' + stemDisplay + '</div>',
      '    <div class="nujum-context-meta">',
      '      <span>CEFR ' + q.cefr + '</span>',
      '      <span>·</span>',
      '      <span>RULE: ' + (q.skillId || 'GRAMMAR').replace('_', ' ') + '</span>',
      '    </div>',
      '  </div>',

      '  <div id="nujumVerdictArea"></div>',

      '  <div class="nujum-voice-section">',
      '    <div class="nujum-eq-wrap">',
      '      <span>AUDIO HARMONIC</span>',
      '      <div class="nujum-eq-bar"></div>',
      '      <div class="nujum-eq-bar"></div>',
      '      <div class="nujum-eq-bar"></div>',
      '      <div class="nujum-eq-bar"></div>',
      '    </div>',
      '    <div class="nujum-orb-wrap">',
      '      <div class="nujum-orb-ring ring-1"></div>',
      '      <div class="nujum-orb-ring ring-2"></div>',
      '      <button class="nujum-orb-btn" id="nujumMicBtn" aria-label="Tekan untuk bicara">',
      '        <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>',
      '      </button>',
      '    </div>',
      '    <div class="nujum-voice-hint" id="nujumMicHint">Tekan untuk berbicara</div>',
      '  </div>',

      '  <div class="nujum-tactical-grid">',
      q.options.map(function (opt, idx) {
        var letter = ['A', 'B', 'C', 'D'][idx] || (idx + 1);
        return '    <button class="nujum-tactical-chip nujum-opt-btn" data-val="' + opt + '"><div class="nujum-chip-content"><span class="nujum-chip-key">' + letter + '</span><span class="nujum-chip-text">' + opt + '</span></div><span class="nujum-chip-pip"></span></button>';
      }).join('\n'),
      '  </div>',

      '  <button class="nujum-surrender-pill" id="nujumSurrenderBtn">',
      '    <span>🏳️</span>',
      '    <span>Aku Menyerah — Ajari Aku Ini</span>',
      '  </button>',

      '  <div class="nujum-footer">',
      '    <span>LATENCY: 14ms</span>',
      '    <span>TACTICAL HUD // BRAINCORE</span>',
      '    <span>CEFR: ' + q.cefr + '</span>',
      '  </div>',
      '</div>'
    ].join('');

    // Setup canvas waveform
    initWaveform(doc.getElementById('nujumWaveCanvas'));

    // Setup mic button
    var micBtn = doc.getElementById('nujumMicBtn');
    if (micBtn) {
      micBtn.onclick = function () {
        if (!nujumState.recognition) {
          nujumState.recognition = setupSpeechRecognition();
        }
        if (!nujumState.recognition) {
          alert("Mikrofon Web Speech API tidak didukung di peramban ini. Silakan gunakan tombol kata di bawah.");
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
        '<span>Mesin <b class="score-mesin">' + nujumState.scoreMesin + '</b></span>',
        '<span>:</span>',
        '<span>Kamu <b class="score-kamu">' + nujumState.scoreKamu + '</b></span>'
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

    speakMachine(fsScript.text_en, fsScript.text_id);

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
      '  </div>',

      '  <div class="nujum-broken-claims">',
      '    <div class="nujum-broken-title">Klaim Taruhan Mesin yang Kamu Patahkan:</div>',
      '    <ul class="nujum-broken-list">',
      nujumState.brokenClaims.length > 0
        ? nujumState.brokenClaims.map(function (c) {
            return '<li class="nujum-broken-item">Taruhan <b>' + c.bet + '%</b> meleset: kamu mengucapkan «' + c.actual + '» (mesin memprediksi «' + c.predicted + '»).</li>';
          }).join('')
        : '<li style="color:var(--nj-text-muted);font-style:italic">Belum ada taruhan yang dipatahkan di sesi ini.</li>',
      '    </ul>',
      '  </div>',

      '  <div style="display:flex;flex-direction:column;gap:12px;margin-top:auto">',
      '    <button class="nujum-opt-btn" id="nujumRematchBtn" style="background:var(--nj-maroon);color:#fff;border-color:#F43F5E;font-size:1.1rem;padding:16px;font-weight:700">Tantang 8 Taruhan Lagi →</button>',
      '    <button class="nujum-opt-btn" id="nujumReturnHomeBtn">Kembali ke Beranda</button>',
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
    if (nujumState.waveAnimFrame) cancelAnimationFrame(nujumState.waveAnimFrame);
    if (nujumState.recognition) {
      try { nujumState.recognition.stop(); } catch (_) {}
    }
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
    nujumState.active = true;
    nujumState.roundIndex = 0;
    nujumState.scoreMesin = 0;
    nujumState.scoreKamu = 0;
    nujumState.brokenClaims = [];
    nujumState.isDemo = !!options.isDemo;
    nujumState.bktMean = nujumState.isDemo ? 0.44 : 0.50;
    nujumState.bktMargin = nujumState.isDemo ? 0.12 : 0.22;

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
      '  <div class="nujum-home-tag"><span class="pulse-dot"></span> MODE BARU · VOICE-FIRST DUEL</div>',
      '  <div class="nujum-home-title">NUJUM — Mesin yang Bertaruh Melawanmu</div>',
      '  <div class="nujum-home-desc">Bukan kuis pilihan ganda. Mesin menyuarakan taruhan spesifik atas kesalahanmu sebelum kamu menjawab. Berani buktikan mesin salah?</div>',
      '  <div class="nujum-home-cta">Masuk Arena Taruhan Suara →</div>',
      '</div>'
    ].join('');
  }

  var api = {
    startSession: startSession,
    homeCardMarkup: homeCardMarkup,
    exit: exitNujum,
    teleportToPractice: teleportToPractice
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
