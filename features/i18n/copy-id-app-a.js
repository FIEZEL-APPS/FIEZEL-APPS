/**
 * FIEZEL · features/i18n/copy-id-app-a.js — COPY-MAP INDONESIA, segmen app.js baris 1–2000
 *
 * MENGAPA: audit multilingual v2 (AI-02 F01) — app.js tidak punya lapisan string; berkas
 * ini memindahkan literal Indonesia segmen A (login, push, grammar, level, policy,
 * reading, quiz, vocab, progress, home, common) ke copy-map sesuai plan W1-APPJS-A,
 * supaya copy-th-app-a.js bisa 1:1. Nilai DISALIN BYTE-PER-BYTE dari app.js — gerbang
 * tests/id-golden-snapshot-test.js membekukan himpunan literal (PINDAH boleh, BERUBAH tidak).
 * Kunci ber-slug netral: lexer gerbang menghitung kunci berpenanda Indonesia sebagai
 * "tambahan liar" (laporan W1-INFRA). Placeholder BERNAMA {nama} (konvensi brief);
 * nama placeholder juga wajib lolos lexer (mis. {stem}, bukan {soal}).
 *
 * CATATAN NILAI-GANDA (AI-11/AI-07): level.exam-abandoned-weakskill dan progress.jendela-*
 * adalah nilai state/kontrak Core Worker — nilainya TETAP di app.js; kunci di sini dipakai
 * render-map di titik render (app.js:4524, app.js:7373 — segmen agent lain, lihat handoff).
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    // app.js:16 — FALLBACK_LEARNER_NAME (top-level const)
    'common.sapaan-netral': 'Sobat',
    // app.js:1096 — saveFlushWrite() showToast
    'common.toast-penyimpanan-penuh': 'Penyimpanan perangkat penuh - progresmu tidak ikut tersimpan. Kosongkan ruang, lalu lanjutkan.',
    // app.js:577 — grammarExercise v0 correctWhy
    'grammar.alasan-benar-kausal': `pas di sini — {alasan}`,
    // app.js:577 — grammarExercise v0 correctWhy fallback
    'grammar.alasan-benar-pola': `pas banget sama pola {judulLesson}.`,
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-agreement': 'belum cocok dengan jumlah subjek, jadi subject dan verb tidak selaras.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-artikel': 'tidak cocok dengan apakah benda itu masih umum atau sudah jelas bagi pembaca.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-auxiliary': 'memakai auxiliary yang tidak sama dengan tense atau struktur kalimat utama.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-benar': 'pas di sini: bentuk sama maknanya cocok sama kalimatnya.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-comparative': 'belum memakai bentuk perbandingan yang sesuai dengan jumlah hal yang dibandingkan.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-gerund': 'memakai bentuk -ing dengan makna yang berbeda dari konteks kalimat.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-infinitive': 'memakai bentuk infinitive yang tidak cocok dengan kata kerja atau maksud kalimat.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-izin': 'menyatakan izin, sedangkan maksud kalimat bukan memberi izin.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-kebiasaan': 'akan memberi kesan kebiasaan atau fakta umum, padahal konteks kalimat meminta makna lain.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-kewajiban': 'belum menyampaikan tingkat kewajiban yang diminta kalimat.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-larangan': 'berarti larangan, bukan kesimpulan atau kemungkinan.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-pasif': 'belum membentuk kalimat pasif yang tepat atau menambahkan pelaku yang tidak diperlukan.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-superlative': 'memakai bentuk superlative, padahal cakupan perbandingannya tidak meminta bentuk itu.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-umum': 'belum cocok dengan waktu, fungsi, atau susunan yang dibutuhkan kalimat.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-urutan-kata': 'menempatkan kata dalam urutan yang tidak sesuai dengan pola kalimat ini.',
    // app.js:465 — grammarOptionReason()
    'grammar.alasan-opsi-waktu-lampau': 'tidak cocok karena kalimat sudah menunjuk waktu lampau yang jelas dan selesai.',
    // app.js:581 — grammarExercise v1 (joinQuoteReason tail)
    'grammar.alasan-versi-pas': 'yang bentuk sama maknanya pas.',
    // app.js:504 — grammarAlternativeMeta() + grammarExercise v2 (fallback distraktor)
    'grammar.distraktor-generik-1': 'Aturan ini tidak bergantung pada makna kalimat.',
    // app.js:504 — grammarAlternativeMeta() + grammarExercise v2 (fallback distraktor)
    'grammar.distraktor-generik-2': 'Semua bentuk dapat dipakai tanpa melihat konteks.',
    // app.js:504 — grammarAlternativeMeta() + grammarExercise v2 (fallback distraktor)
    'grammar.distraktor-generik-3': 'Urutan kata dan penanda waktu tidak memengaruhi jawaban.',
    // app.js:599 — grammarExercise v2 expl
    'grammar.expl-justify-distraktor': `Ini nunjukin kenapa pilihan {opsiDikutip} meleset, bukan kenapa {kunciDikutip} bener.`,
    // app.js:851 — lessonLockMessage()
    'grammar.lesson-terkunci': `Selesaikan dulu {daftarLesson} sampai mastery {ambang}%.`,
    // app.js:630 — grammarExercise v8 correctWhy
    'grammar.mode-avoid-benar': 'Strategi ini ngecek makna dan bentuk di titik yang paling sering nyesatin.',
    // app.js:636 — grammarExercise v18-20 OPSI benar (joinQuoteReason head)
    'grammar.mode-contrast-opsi-benar-head': `{kunciDikutip} pas di sini;`,
    // app.js:636 — grammarExercise v18-20 OPSI distraktor
    'grammar.mode-contrast-opsi-bolak-balik': `Dua-duanya bisa dipakai bolak-balik tanpa ngubah makna.`,
    // app.js:636 — grammarExercise v18-20 OPSI distraktor
    'grammar.mode-contrast-opsi-none': `Dua-duanya salah karena lesson ini nggak nguji pilihan itu.`,
    // app.js:650 — grammarExercise v22 correctWhy
    'grammar.mode-cue-benar': 'Petunjuk ini yang nentuin bentuk jawabannya pas atau nggak.',
    // app.js:644 — grammarExercise v21 correctWhy
    'grammar.mode-family-benar': `Fokus {judulLesson} masuk keluarga {labelKeluarga}.`,
    // app.js:612 — grammarExercise v2 correctWhy
    'grammar.mode-justify-benar': 'Alasan ini nyambungin jawabannya sama konteks kalimat dan aturannya.',
    // app.js:634 — grammarExercise v12-14 OPSI
    'grammar.mode-label-opsi-benar': 'jawaban benar, nggak ada kesalahan mikir.',
    // app.js:653 — grammarExercise v24 correctWhy
    'grammar.mode-mastery-benar': 'Rencana ini gabungin cara nyegah salah sama pengingat khusus lesson ini.',
    // app.js:623 — grammarExercise v7 correctWhy
    'grammar.mode-memory-benar': 'Pengingat ini langsung nyambungin petunjuk soal sama pola yang bener.',
    // app.js:622 — grammarExercise v6 correctWhy
    'grammar.mode-misconception-benar': 'Nah, ini kesalahan mikir utama yang dibidik lesson ini — bukan sekadar salah eja.',
    // app.js:622 — grammarExercise v6 stem
    'grammar.mode-misconception-stem': `Kesalahan mikir apa yang mau dicegah sama lesson {judulLesson}?`,
    // app.js:618 — grammarExercise v4 correctWhy
    'grammar.mode-objective-benar': 'Tujuan ini pas nunjukin kemampuan yang lagi diuji di sini.',
    // app.js:619 — grammarExercise v5 correctWhy
    'grammar.mode-reasoning-benar': 'Urutan ini bawa kamu dari petunjuk kalimat ke bentuk yang bener.',
    // app.js:635 — grammarExercise v15-17 (joinQuoteReason head)
    'grammar.mode-repair-benar-head': `Perbaikannya {kunciDikutip};`,
    // app.js:635 — grammarExercise v15-17 (joinQuoteReason tail)
    'grammar.mode-repair-benar-tail': 'bentuk itu yang cocok sama kalimat aslinya.',
    // app.js:617 — grammarExercise v3 correctWhy
    'grammar.mode-rule-benar': 'Aturan ini pas jelasin bentuk yang diuji, tanpa keluar dari lesson ini.',
    // app.js:652 — grammarExercise v23 correctWhy
    'grammar.mode-teach-benar': 'Ringkasan itu nyatuin tujuan lesson sama aturan yang bener.',
    // app.js:581 — grammarExercise v1 (joinQuoteReason head)
    'grammar.versi-pakai': `Versi pakai {opsiDikutip}`,
    // app.js:1436 — dailyBrief() weak fallback
    'home.brief-belum-pola': 'Belum ada pola',
    // app.js:1436 — dailyBrief() goal
    'home.brief-goal-adaptif': '12 soal adaptif',
    // app.js:1436 — dailyBrief() goal
    'home.brief-goal-tes-awal': 'Mulai tes awal',
    // app.js:1007 — levelExamCooldownLabel()
    'level.cooldown-jam': `{jam} jam lagi`,
    // app.js:1007 — levelExamCooldownLabel()
    'level.cooldown-sejam': 'kurang dari sejam lagi',
    // app.js:122 — LEVEL_GUARD_COPY.demotionBody
    'level.demosi-isi': 'Sepuluh jawaban meleset di level ini \u2014 bukan karena kamu nggak mampu, tapi karena fondasinya belum kebentuk penuh, dan maksa lanjut cuma bikin capek. Makanya PAW ajak kamu balik ke A1 dulu, nguatin dasarnya bareng-bareng; fitur level atas dikunci sementara biar fokusmu nggak pecah. Kalau kamu merasa udah siap lebih cepat, jalannya ada: lulus Ujian Skip Level, dan pintunya kebuka lagi.',
    // app.js:121 — LEVEL_GUARD_COPY.demotionTitle
    'level.demosi-judul': 'Kita mundur selangkah dulu, ya',
    // app.js:123 — LEVEL_GUARD_COPY.demotionStart
    'level.demosi-mulai-a1': 'Mulai dari A1',
    // app.js:809 — levelDescriptor() A1
    'level.deskripsi-a1': 'Pemula · fondasi kalimat sederhana',
    // app.js:809 — levelDescriptor() A2
    'level.deskripsi-a2': 'Dasar · kosakata dan teks keseharian',
    // app.js:809 — levelDescriptor() B1
    'level.deskripsi-b1': 'Menengah · memahami teks umum secara mandiri',
    // app.js:809 — levelDescriptor() B2
    'level.deskripsi-b2': 'Menengah atas · ide yang lebih kompleks',
    // app.js:809 — levelDescriptor() C1
    'level.deskripsi-c1': 'Mahir · akademik dan profesional',
    // app.js:809 — levelDescriptor() C2
    'level.deskripsi-c2': 'Penguasaan · nuansa dan struktur lanjut',
    // app.js:809 — levelDescriptor() fallback
    'level.deskripsi-fallback': 'Level belajar aktif',
    // app.js:116 — LEVEL_GUARD_COPY.entryChip
    'level.entry-chip': 'Belum terverifikasi',
    // app.js:117 — LEVEL_GUARD_COPY.entryExam
    'level.entry-ikuti-ujian': 'Ikuti ujian',
    // app.js:118 — LEVEL_GUARD_COPY.entryLater
    'level.entry-nanti-aja': 'Nanti aja',
    // app.js:916 — levelEntryChoiceCopy() line
    'level.entry-pilih-isi': `Buat buka {level}, lulusin dulu {judulUjian} {ujian} \u2014 satu ujian, satu anak tangga.`,
    // app.js:124 — LEVEL_GUARD_COPY.lockedFeature
    'level.fitur-terkunci': 'Fitur ini dikunci sementara kamu nguatin fondasi di A1. Selesaikan materinya pelan-pelan, atau buka lebih cepat lewat Ujian Skip Level.',
    // app.js:119 — LEVEL_GUARD_COPY.warn5
    'level.peringatan-5': 'Udah 5 yang meleset, dan itu nggak apa-apa \u2014 salah itu bagian dari belajar. Coba pelan-pelan: baca soalnya dua kali, atau pakai petunjuk kalau butuh. PAW nungguin, nggak ke mana-mana.',
    // app.js:120 — LEVEL_GUARD_COPY.warn8
    'level.peringatan-8': 'Level ini kayaknya masih lumayan berat buat sekarang, dan itu wajar banget. Saran PAW: mampir sebentar ke materi dasarnya, biar pas balik ke sini rasanya lebih enteng. Kalau meleset 2 kali lagi, kita turun bareng dulu buat nguatin fondasi, ya.',
    // app.js:115 — LEVEL_GUARD_COPY.probationBody
    'level.probation-isi': 'Lulusin Ujian Skip Level dulu, PAW temenin dari A1.',
    // app.js:114 — LEVEL_GUARD_COPY.probationTitle
    'level.probation-judul': 'Level ini belum terverifikasi',
    // app.js:808 — activeLevelLabel()
    'level.sufiks-pilihanmu': ' · pilihanmu',
    // app.js:130 — LEVEL_GUARD_COPY.examBadge
    'level.ujian-badge': 'Terverifikasi (ujian)',
    // G15-03 wave2 (F22): dua badge sumber-bukti baru untuk LEVEL_GUARD_COPY (two-tier)
    'level.badge-placement-awal': 'Level awal (placement)',
    'level.badge-titik-mulai': 'Titik mulai',
    // app.js:126 — LEVEL_GUARD_COPY.examDesc
    'level.ujian-deskripsi': 'Ujian singkat berisi soal campuran \u2014 grammar, kosakata, dan bacaan \u2014 dari level yang mau kamu lompati. Jawab benar minimal 80% tanpa petunjuk, dengan tiap seksi di atas garis tebakan, dan materi level itu terverifikasi buat kamu. Catatan jujur: speaking dan listening belum ikut diuji di sini \u2014 tetap kamu asah lewat latihan.',
    // app.js:1185 — nilai state/kontrak TETAP di sumber; render-map di titik render (lihat handoff)
    'level.ujian-ditinggalkan': 'ujian ditinggalkan sebelum selesai',
    // app.js:129 — LEVEL_GUARD_COPY.examFail
    'level.ujian-gagal': 'Belum lulus kali ini, dan itu nggak apa-apa \u2014 ujiannya memang dibikin jujur, bukan dibikin gampang. Istirahat dulu, kuatin bagian yang tadi terasa berat, dan kamu boleh coba lagi besok.',
    // app.js:125 — LEVEL_GUARD_COPY.examTitle
    'level.ujian-judul': 'Ujian Skip Level',
    // app.js:128 — LEVEL_GUARD_COPY.examPass
    'level.ujian-lulus': 'Lulus! Level ini sekarang terverifikasi buat kamu \u2014 PAW sampai lompat-lompat. Grammar, kosakata, dan bacaanmu di level ini terbukti kuat; semua fitur di level ini kebuka. Speaking dan listening belum ikut diuji \u2014 itu medan seru berikutnya, lanjut!',
    // app.js:127 — LEVEL_GUARD_COPY.examStart
    'level.ujian-mulai': 'Mulai ujian',
    // app.js:160 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-01-headline': 'Oii {name}, target kuliah luar negeri lu keren. Tapi hari ini udah belajar belum? 👀',
    // app.js:160 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-01-lead': 'Beasiswa sama kampus IT impian nggak kebangun dari niat doang. Gas 10–15 menit dulu, kecil tapi nyata.',
    // app.js:161 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-02-headline': 'Bro, mau kuliah IT di luar negeri? English itu bukan side quest 😭',
    // app.js:161 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-02-lead': 'IELTS/TOEFL bakal jadi salah satu pintunya. Mumpung masih kelas 1, cicil skill-nya biar kelas 2 nggak panik.',
    // app.js:162 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-03-headline': '{name}, masa 5 soal kalah sama scroll FYP? 💀',
    // app.js:162 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-03-lead': 'Nggak usah sok produktif satu jam. Lima jawaban yang bener-bener dipahami dulu, habis itu baru lanjut hidup.',
    // app.js:163 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-04-headline': 'Plot twist: {name} kelas 2 bakal berterima kasih sama {name} hari ini.',
    // app.js:163 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-04-lead': 'Kalau fondasinya dibangun sekarang, nanti persiapan IELTS/TOEFL tinggal naik level—bukan mulai dari nol.',
    // app.js:164 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-05-headline': 'Woy, beasiswa luar negeri nggak tiba-tiba jatuh dari langit 😭',
    // app.js:164 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-05-lead': 'Yang bisa lu kontrol sekarang simpel: hadir, latihan, ngerti salahnya, ulang lagi besok.',
    // app.js:165 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-06-headline': 'Mager valid. Skip belajar tiap hari? Nah itu yang bahaya.',
    // app.js:165 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-06-lead': 'Kalau energi lagi tipis, kecilin targetnya. Satu review atau lima soal tetap dihitung sebagai progress.',
    // app.js:166 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-07-headline': 'Lu pengin masuk IT di luar negeri kan? Yaudah, buktiin dikit hari ini.',
    // app.js:166 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-07-lead': 'English bakal kepake buat kuliah, dokumentasi, diskusi, internship, sampai interview. Jadi ini investasi, bukan tugas random.',
    // app.js:167 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-08-headline': 'Oii {name}, jangan cuma punya “main character dream”, punya main character routine juga 😭',
    // app.js:167 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-08-lead': 'Target gede butuh rutinitas kecil yang konsisten. Hari ini cukup selesaikan satu sesi FIEZEL.',
    // app.js:168 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-09-headline': 'Reminder santai: masa depan lu nggak butuh versi sempurna, butuh versi yang konsisten.',
    // app.js:168 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-09-lead': 'Nggak harus jago hari ini. Yang penting skill lu bergerak satu langkah dibanding kemarin.',
    // app.js:169 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-10-headline': 'IELTS kelas 2 kedengerannya masih jauh? Itu jebakannya, bro.',
    // app.js:169 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-10-lead': 'Waktu kelas 1 ini justru enak buat bangun vocab, grammar, reading, dan kebiasaan tanpa dikejar deadline.',
    // app.js:170 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-11-headline': '{name}, “nanti aja” kalau dikumpulin bisa jadi satu semester 😭',
    // app.js:170 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-11-lead': 'Buka satu sesi sekarang. Biar nanti yang numpuk skill, bukan alasan.',
    // app.js:171 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-12-headline': 'Hari ini lu nggak perlu jadi Einstein. Cukup jangan jadi ghost di FIEZEL 👻',
    // app.js:171 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-12-lead': 'Tinggalin minimal satu bukti belajar: soal selesai, vocab direview, atau reading dituntaskan.',
    // app.js:172 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-13-headline': 'Bro, salah jawab tuh bukan malu. Itu data gratis.',
    // app.js:172 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-13-lead': 'Yang penting jangan cuma lihat jawabannya. Cari kenapa lu salah, karena di situ FIEZEL bisa bikin latihan berikutnya makin tepat.',
    // app.js:173 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-14-headline': 'Mau beasiswa? Skill lu harus punya receipt, bukan cuma wishlist.',
    // app.js:173 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-14-lead': 'Progress yang tercatat hari ini jauh lebih berguna daripada janji “besok belajar serius”.',
    // app.js:174 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-15-headline': 'Oii, otak juga butuh maintenance. Laptop aja di-update 😭',
    // app.js:174 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-15-lead': 'Review materi yang udah mulai lupa. Sedikit pengulangan sekarang bikin lu nggak perlu belajar ulang dari nol.',
    // app.js:175 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-16-headline': '{name}, kalau lagi males banget: deal, cuma 5 soal.',
    // app.js:175 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-16-lead': 'Kalau setelah lima soal masih capek, berhenti. Tapi jangan biarin hari ini benar-benar kosong.',
    // app.js:176 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-17-headline': 'English lu nggak harus langsung keren. Yang penting grafiknya naik.',
    // app.js:176 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-17-lead': 'FIEZEL lebih peduli pola jangka panjang daripada satu sesi yang kelihatan hebat.',
    // app.js:177 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-18-headline': 'Kuliah IT luar negeri = keren. Baca dokumentasi tanpa translate tiap 2 baris = lebih keren.',
    // app.js:177 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-18-lead': 'Vocabulary dan reading yang lu bangun sekarang bakal kepake jauh setelah ujian selesai.',
    // app.js:178 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-19-headline': 'Bro, jangan nunggu mood belajar datang naik ojol.',
    // app.js:178 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-19-lead': 'Mulai dulu 10 menit. Biasanya otak baru ikut fokus setelah badan udah mulai.',
    // app.js:179 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-20-headline': 'Hari ini mau jadi “gue nanti belajar” atau “gue tadi udah belajar”? 👀',
    // app.js:179 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-20-lead': 'Pilih yang kedua. Satu sesi kecil cukup buat ngejaga ritme.',
    // app.js:180 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-21-headline': '{name}, kelas 2 itu bakal datang tanpa nanya lu siap apa nggak 😭',
    // app.js:180 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-21-lead': 'Makanya kita nyicil sekarang, biar IELTS/TOEFL nanti terasa kayak level berikutnya, bukan boss fight dadakan.',
    // app.js:181 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-22-headline': 'Kalau target lu luar negeri, jangan bikin English cuma pelajaran sekolah.',
    // app.js:181 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-22-lead': 'Bikin dia jadi skill sehari-hari: baca, ngerti pola, recall kata, dan berani salah.',
    // app.js:182 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-23-headline': 'Woy, streak lu sayang kalau dibiarin mati gara-gara “nanti”.',
    // app.js:182 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-23-lead': 'Buka FIEZEL, selesaikan target minimum, terus bebas lanjut aktivitas lain.',
    // app.js:183 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-24-headline': 'Lu nggak perlu belajar lama. Lu perlu belajar cukup sering.',
    // app.js:183 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-24-lead': '15 menit konsisten bisa lebih ngaruh daripada maraton dua jam terus hilang seminggu.',
    // app.js:184 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-25-headline': '{name}, beasiswa suka bukti. Otak juga suka pengulangan.',
    // app.js:184 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-25-lead': 'Jadi hari ini kita kasih dua-duanya: progress tercatat dan materi yang makin nempel.',
    // app.js:185 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-26-headline': 'No pressure, tapi ya… mimpi besar tetap perlu kerja kecil tiap hari 😭',
    // app.js:185 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-26-lead': 'Pilih satu fokus yang paling lemah dan beresin sedikit. Besok kita lanjut lagi.',
    // app.js:186 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-27-headline': 'Bro, jangan takut sama bagian yang jelek di learning map.',
    // app.js:186 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-27-lead': 'Itu bukan rapor kegagalan. Itu GPS yang nunjukin jalan tercepat buat naik level.',
    // app.js:187 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-28-headline': 'Grammar bikin pusing? Santai, kita cari polanya—bukan ngafalin kitab.',
    // app.js:187 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-28-lead': 'Perhatikan clue waktu, fungsi kalimat, dan alasan opsi lain salah. Pelan-pelan bakal kebaca otomatis.',
    // app.js:188 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-29-headline': 'Reading jangan pake feeling doang, bestie 😭 cari buktinya.',
    // app.js:188 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-29-lead': 'Biasain nunjuk kalimat atau clue yang mendukung jawaban. Itu skill yang bakal kepake banget di tes nanti.',
    // app.js:189 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-30-headline': 'Oii {name}, 10 menit sekarang bisa nyelametin 2 jam panik nanti.',
    // app.js:189 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-30-lead': 'Cicil review yang jatuh tempo sebelum materinya benar-benar kabur dari ingatan.',
    // app.js:190 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-31-headline': 'Target lu bukan “kelihatan rajin”. Target lu beneran jago.',
    // app.js:190 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-31-lead': 'Jadi nggak usah ngejar jumlah doang. Pahami beberapa soal dengan serius, terus lanjut.',
    // app.js:191 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-32-headline': 'Masuk FIEZEL doang belum dihitung belajar ya, bro 😭',
    // app.js:191 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-32-lead': 'Tinggalin minimal lima jawaban bermakna biar kunjungan hari ini benar-benar jadi progress.',
    // app.js:192 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-33-headline': 'Future {name} lagi nunggu kiriman skill dari lu hari ini 📦',
    // app.js:192 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-33-lead': 'Kirim sedikit aja: beberapa vocab, satu grammar lesson, atau satu reading. Yang penting paketnya jalan.',
    // app.js:193 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-34-headline': 'Lu punya target luar negeri. FIEZEL punya satu pertanyaan: hari ini ngapain buat mendekat?',
    // app.js:193 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-34-lead': 'Nggak perlu jawaban dramatis. Satu sesi fokus udah cukup.',
    // app.js:194 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-35-headline': 'Oii {name}, santai boleh. Hilang dari latihan jangan kelamaan 😭',
    // app.js:194 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-35-lead': 'Consistency > intensity. Balik lagi sebelum jedanya berubah jadi kebiasaan.',
    // app.js:195 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-36-headline': 'Satu hari kosong nggak bikin gagal. Tapi balik lagi hari ini bikin beda.',
    // app.js:195 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-36-lead': 'Nggak ada ceramah. Langsung pilih fokus, kerjain sedikit, selesai.',
    // app.js:196 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-37-headline': 'Pagi, {name}. Otak lagi paling murah dipakai jam segini.',
    // app.js:196 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-37-lead': 'Sebelum notif rame dan hari jadi berisik, ambil satu sesi. Yang pagi biasanya yang beneran kelar.',
    // app.js:197 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-38-headline': 'Udah malam, tapi satu sesi kecil masih muat kok.',
    // app.js:197 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-38-lead': 'Nggak usah yang berat. Review vocab sepuluh menit tetap ngunci apa yang tadi lu pelajari.',
    // app.js:198 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-39-headline': 'Akhir pekan bukan alasan berhenti, tapi juga bukan alasan maksa.',
    // app.js:198 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-39-lead': 'Turunin targetnya jadi setengah. Yang penting rantainya nggak putus, bukan hari ini lu jadi rajin banget.',
    // app.js:199 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-40-headline': 'Senin lagi. Nggak usah drama, buka satu sesi aja.',
    // app.js:199 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-40-lead': 'Minggu yang rapi biasanya dimulai dari hari pertama yang nggak di-skip. Lima soal cukup buat mulai.',
    // app.js:200 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-41-headline': 'Tanggal makin jalan, semester nggak nunggu siapa-siapa.',
    // app.js:200 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-41-lead': 'Kelas 1 semester 1 itu waktu paling longgar yang bakal lu punya. Dipakai sekarang, bukan nanti.',
    // app.js:201 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-42-headline': 'Kemarin bolos? Yaudah. Yang bego itu bolos dua kali berturut-turut.',
    // app.js:201 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-42-lead': 'Nggak ada hukuman di sini. Buka satu sesi, rantainya nyambung lagi, kita lanjut kayak nggak terjadi apa-apa.',
    // app.js:202 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-43-headline': 'Streak lu lagi jalan. Sayang banget kalau putus gara-gara mager sepuluh menit.',
    // app.js:202 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-43-lead': 'Yang bikin skill naik bukan hari terbaik lu, tapi hari-hari biasa yang tetap lu isi.',
    // app.js:203 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-44-headline': 'Balik lagi setelah lama ngilang? Selamat datang, nggak ada yang nyatet.',
    // app.js:203 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-44-lead': 'Mulai dari yang gampang biar percaya diri lu balik dulu. Level susahnya nyusul.',
    // app.js:204 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-45-headline': 'Vocab itu bahan bakar. Tanpa itu grammar lu cuma rangka kosong.',
    // app.js:204 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-45-lead': 'Sepuluh kata yang bener-bener nempel lebih berguna dari seratus kata yang cuma lewat.',
    // app.js:205 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-46-headline': 'Grammar bukan buat dihafal, tapi buat bikin lu didengerin.',
    // app.js:205 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-46-lead': 'Kalimat yang rapi bikin orang fokus ke isi omongan lu, bukan ke cara lu ngomongnya.',
    // app.js:206 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-47-headline': 'Listening lu bakal diuji di kelas beneran, bukan cuma di soal.',
    // app.js:206 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-47-lead': 'Dosen luar ngomong cepat dan nggak ngulang. Latih kupingnya dari sekarang, bukan pas udah di sana.',
    // app.js:207 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-48-headline': 'Speaking itu skill fisik. Mulut lu butuh latihan, bukan cuma otak lu.',
    // app.js:207 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-48-lead': 'Ngomong sendiri di kamar juga kehitung. Yang penting suara lu keluar, bukan cuma dibaca dalam hati.',
    // app.js:208 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-49-headline': 'Reading cepat itu yang nyelametin lu pas kuliah nanti.',
    // app.js:208 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-49-lead': 'Bacaan kuliah IT numpuk dan nggak ada terjemahannya. Latih sekarang mumpung soalnya masih pendek.',
    // app.js:209 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-50-headline': 'Salah itu data, bukan aib.',
    // app.js:209 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-50-lead': 'Setiap jawaban salah ngasih tahu FIEZEL persis lu lemah di mana. Itu justru yang bikin latihan lu jadi tepat sasaran.',
    // app.js:210 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-51-headline': 'Nggak usah nunggu paham semua baru mulai. Nggak bakal kejadian.',
    // app.js:210 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-51-lead': 'Paham itu datang setelah latihan, bukan sebelum. Mulai aja dulu dari yang lu bisa.',
    // app.js:211 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-52-headline': 'Bandingin sama {name} kemarin, bukan sama orang di TikTok.',
    // app.js:211 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-52-lead': 'Mereka nggak nunjukin proses yang gagal. Lu punya angka lu sendiri di Peta belajar, itu yang jujur.',
    // app.js:212 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-53-headline': 'Perfeksionis itu mager yang pakai alasan bagus.',
    // app.js:212 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-53-lead': 'Sesi berantakan yang selesai selalu menang lawan sesi sempurna yang nggak pernah dimulai.',
    // app.js:213 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-54-headline': 'Jangan nunggu semangat datang. Semangat itu munculnya belakangan.',
    // app.js:213 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-54-lead': 'Biasanya mood baik baru muncul setelah lima soal pertama. Jadi lewatin dulu bagian nggak enaknya.',
    // app.js:214 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-55-headline': 'Progress sering nggak kerasa dari dalam.',
    // app.js:214 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-55-lead': 'Makanya ada Peta belajar. Percaya sama grafiknya, bukan sama perasaan lu hari ini.',
    // app.js:215 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-56-headline': 'Review itu jauh lebih murah daripada belajar ulang dari nol.',
    // app.js:215 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-56-lead': 'Sepuluh menit sekarang nyelametin satu jam nanti. Itu bunga majemuk versi belajar.',
    // app.js:216 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-57-headline': 'Ngerti kenapa salah lebih mahal nilainya daripada jawaban bener yang cuma nebak.',
    // app.js:216 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-57-lead': 'Baca penjelasannya sebentar. Yang lu bangun itu pemahaman, bukan skor.',
    // app.js:217 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-58-headline': 'English di IT itu bahasa kerjanya, bukan mata pelajarannya.',
    // app.js:217 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-58-lead': 'Dokumentasi, error message, diskusi tim, semua Inggris. Lu lagi latihan buat kerja, bukan buat rapor.',
    // app.js:218 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-59-headline': 'Nanti ada sesi wawancara beasiswa yang nggak bisa lu jawab pakai Google Translate.',
    // app.js:218 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-59-lead': 'Yang nolong lu di situ cuma jam latihan yang udah lu kumpulin diam-diam dari sekarang.',
    // app.js:219 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-60-headline': '{name} kelas 2 lagi nonton lu dari masa depan.',
    // app.js:219 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-60-lead': 'Dia nggak minta lu jadi jenius. Dia cuma minta lu jangan nunda setahun penuh.',
    // app.js:220 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-61-headline': 'Rapor bagus itu bonus. Yang lu kejar skill yang kepakai.',
    // app.js:220 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-61-lead': 'Beda tipis, tapi arahnya jauh. Yang satu berhenti di kertas, yang satu ikut lu sampai luar negeri.',
    // app.js:221 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-62-headline': 'Target gede itu cuma tumpukan hari kecil yang nggak di-skip.',
    // app.js:221 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-62-lead': 'Nggak ada satu hari heroik yang bikin lu lolos. Yang ada tiga ratus hari biasa.',
    // app.js:222 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-63-headline': 'Jadi orang yang tetap muncul walaupun lagi nggak semangat. Itu aja.',
    // app.js:222 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-63-lead': 'Bukan soal jago hari ini. Soal jadi orang yang bisa diandelin sama diri sendiri.',
    // app.js:223 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-64-headline': 'Hari lu berat? Boleh pelan. Tapi jangan nol.',
    // app.js:223 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-64-lead': 'Satu review doang tetap dihitung. FIEZEL nggak nuntut lu jadi mesin.',
    // app.js:224 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-65-headline': 'Nggak ada yang lagi ngawasin lu. Justru itu ujiannya.',
    // app.js:224 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-65-lead': 'Yang lu bangun sekarang bukan cuma English, tapi kebiasaan ngerjain sesuatu tanpa disuruh.',
    // app.js:225 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-66-headline': 'Sepuluh menit. Habis itu lu bebas ngapain aja.',
    // app.js:225 — LOGIN_MESSAGES[] (top-level const)
    'login.pesan-66-lead': 'Serius, cuma itu. Buka satu sesi, tuntasin, terus lanjut hidup tanpa rasa bersalah.',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.balance-cta': 'Mulai rencana Core',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.balance-judul': 'Naik level dengan ritme aman',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.balance-ringkas': 'Belajarmu sudah stabil. Latihan berikutnya dibagi rata: yang masih lemah, yang perlu diulang, dan yang belum pernah dicoba.',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.diagnostic-cta': 'Cari tahu level kamu',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.diagnostic-judul': 'Bangun bukti dulu, bro',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.diagnostic-ringkas': 'FIEZEL masih mengenali kamu. Coba dulu vocab, grammar, dan reading biar latihanmu bisa dipaskan.',
    // app.js:1516 — deriveAdaptivePolicy() steps
    'policy.langkah-balance': 'Utamakan {fokus}, lalu selingi materi lain biar nggak monoton.',
    // app.js:1516 — deriveAdaptivePolicy() steps
    'policy.langkah-boleh-baru': 'Boleh diselingi sedikit materi baru.',
    // app.js:1516 — deriveAdaptivePolicy() steps
    'policy.langkah-diagnostic': 'Kumpulkan bukti vocabulary, grammar, dan reading secara seimbang.',
    // app.js:1516 — deriveAdaptivePolicy() steps
    'policy.langkah-fokus': `Fokus utama: {fokus}.`,
    // app.js:1516 — deriveAdaptivePolicy() steps
    'policy.langkah-keyakinan': 'Dulu rasa yakinmu dan hasilnya sering berjauhan, jadi soalnya dipilih lebih hati-hati.',
    // app.js:1516 — deriveAdaptivePolicy() steps
    'policy.langkah-recovery': 'Sesi pendek dulu supaya selesai tanpa bikin beban terasa gede.',
    // app.js:1516 — deriveAdaptivePolicy() steps
    'policy.langkah-tahan-baru': 'Materi baru ditahan dulu sampai bagian ini lebih mantap.',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.recovery-cta': 'Mulai comeback',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.recovery-judul': 'Comeback pendek dulu',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.recovery-ringkas': 'Belakangan ini agak berat, ya. Sesinya sengaja dibikin lebih pendek biar gampang diselesaikan.',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.repair-cta': 'Perbaiki skill ini',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.repair-judul': 'Benerin titik bocor dulu',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.repair-ringkas': 'Ada satu hal yang salahnya berulang. Sesi berikutnya fokus ke situ dulu sebelum lanjut jauh.',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.review-cta': 'Mulai Smart Review',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.review-judul': 'Review dulu sebelum nambah',
    // app.js:1515 — deriveAdaptivePolicy() labels
    'policy.review-ringkas': 'Ada materi yang mulai kamu lupakan. Materi baru ditahan dulu, yang lama diulang biar nempel.',
    // app.js:1454 — nilai state/kontrak TETAP di sumber; render-map di titik render (lihat handoff)
    'progress.jendela-belum-terbaca': 'belum terbaca',
    // app.js:1445 — nilai state/kontrak TETAP di sumber; render-map di titik render (lihat handoff)
    'progress.jendela-larut': 'larut',
    // app.js:1445 — nilai state/kontrak TETAP di sumber; render-map di titik render (lihat handoff)
    'progress.jendela-malam': 'malam',
    // app.js:1445 — nilai state/kontrak TETAP di sumber; render-map di titik render (lihat handoff)
    'progress.jendela-pagi': 'pagi',
    // app.js:1445 — nilai state/kontrak TETAP di sumber; render-map di titik render (lihat handoff)
    'progress.jendela-siang': 'siang',
    // app.js:1445 — nilai state/kontrak TETAP di sumber; render-map di titik render (lihat handoff)
    'progress.jendela-sore': 'sore',
    // app.js:234 — REMINDER_TITLES.daily_goal
    'push.judul-daily-goal-1': 'FIEZEL · 5 soal dulu gas',
    // app.js:234 — REMINDER_TITLES.daily_goal
    'push.judul-daily-goal-2': 'FIEZEL · Target belum kelar 👀',
    // app.js:234 — REMINDER_TITLES.daily_goal
    'push.judul-daily-goal-3': 'FIEZEL · Sedikit lagi, bro',
    // app.js:235 — REMINDER_TITLES.due_review
    'push.judul-due-review-1': 'FIEZEL · Otak minta refresh',
    // app.js:235 — REMINDER_TITLES.due_review
    'push.judul-due-review-2': 'FIEZEL · Review dulu, bro',
    // app.js:235 — REMINDER_TITLES.due_review
    'push.judul-due-review-3': 'FIEZEL · Jangan kasih lupa menang 😭',
    // app.js:230 — REMINDER_TITLES.inactivity_1
    'push.judul-inactivity-1-1': 'FIEZEL · Bro, kemarin kosong 👀',
    // app.js:230 — REMINDER_TITLES.inactivity_1
    'push.judul-inactivity-1-2': 'FIEZEL · Balik tipis dulu',
    // app.js:230 — REMINDER_TITLES.inactivity_1
    'push.judul-inactivity-1-3': 'FIEZEL · Ritme jangan putus',
    // app.js:231 — REMINDER_TITLES.inactivity_2
    'push.judul-inactivity-2-1': 'FIEZEL · Dua hari nih 😭',
    // app.js:231 — REMINDER_TITLES.inactivity_2
    'push.judul-inactivity-2-2': 'FIEZEL · Comeback sekarang',
    // app.js:231 — REMINDER_TITLES.inactivity_2
    'push.judul-inactivity-2-3': 'FIEZEL · Jangan jadi pola',
    // app.js:232 — REMINDER_TITLES.inactivity_3
    'push.judul-inactivity-3-1': 'FIEZEL · Woy, 3 hari 😭',
    // app.js:232 — REMINDER_TITLES.inactivity_3
    'push.judul-inactivity-3-2': 'FIEZEL · Comeback time',
    // app.js:232 — REMINDER_TITLES.inactivity_3
    'push.judul-inactivity-3-3': 'FIEZEL · Ritme lu kangen',
    // app.js:233 — REMINDER_TITLES.inactivity_7
    'push.judul-inactivity-7-1': 'FIEZEL · Bro… seminggu 💀',
    // app.js:233 — REMINDER_TITLES.inactivity_7
    'push.judul-inactivity-7-2': 'FIEZEL · Reset ritme dulu',
    // app.js:233 — REMINDER_TITLES.inactivity_7
    'push.judul-inactivity-7-3': 'FIEZEL · Balik pelan-pelan',
    // app.js:236 — REMINDER_TITLES.positive
    'push.judul-positive-1': 'FIEZEL · W, bro 🔥',
    // app.js:236 — REMINDER_TITLES.positive
    'push.judul-positive-2': 'FIEZEL · Ritme lu bagus',
    // app.js:236 — REMINDER_TITLES.positive
    'push.judul-positive-3': 'FIEZEL · Keep it going',
    // app.js:228 — REMINDER_TITLES.starter
    'push.judul-starter-1': 'FIEZEL · Oii {name} 👀',
    // app.js:228 — REMINDER_TITLES.starter
    'push.judul-starter-2': 'FIEZEL · Gas dikit, bro',
    // app.js:228 — REMINDER_TITLES.starter
    'push.judul-starter-3': 'FIEZEL · Jangan ghosting 😭',
    // app.js:229 — REMINDER_TITLES.struggling
    'push.judul-struggling-1': 'FIEZEL · Nyangkut di situ ya?',
    // app.js:229 — REMINDER_TITLES.struggling
    'push.judul-struggling-2': 'FIEZEL · Break dulu, terus balik',
    // app.js:229 — REMINDER_TITLES.struggling
    'push.judul-struggling-3': 'FIEZEL · Kita ulang pelan-pelan',
    // app.js:271 — REMINDER_MESSAGES.daily_goal
    'push.pesan-daily-goal-1': 'Oii, target minimum hari ini belum beres. Sedikit lagi, bro—5 jawaban bermakna.',
    // app.js:272 — REMINDER_MESSAGES.daily_goal
    'push.pesan-daily-goal-2': 'Hari mau tutup 👀 jangan biarin progress lu ikut tutup. Gas beberapa soal lagi.',
    // app.js:273 — REMINDER_MESSAGES.daily_goal
    'push.pesan-daily-goal-3': 'Bro, tinggal dikit buat jaga ritme. Beresin dulu sebelum lanjut rebahan.',
    // app.js:274 — REMINDER_MESSAGES.daily_goal
    'push.pesan-daily-goal-4': 'No pressure, tapi streak lu sayang 😭 kelarin target kecil hari ini.',
    // app.js:277 — REMINDER_MESSAGES.due_review
    'push.pesan-due-review-1': 'Otak lu mulai nge-blur beberapa materi 😭 Review bentar sebelum lupa menang.',
    // app.js:278 — REMINDER_MESSAGES.due_review
    'push.pesan-due-review-2': 'Bro, ada materi minta refresh. Ulang sedikit sekarang biar nggak belajar dari nol nanti.',
    // app.js:279 — REMINDER_MESSAGES.due_review
    'push.pesan-due-review-3': 'Review due nih 👀 Anggap aja maintenance biar skill lu nggak downgrade.',
    // app.js:280 — REMINDER_MESSAGES.due_review
    'push.pesan-due-review-4': 'Ada materi dengan risiko lupa tinggi. Beresin review dulu sebelum nambah yang baru.',
    // app.js:251 — REMINDER_MESSAGES.inactivity_1
    'push.pesan-inactivity-1-1': 'Bro, kemarin kosong. Santai, tapi jangan dua hari jadi tiga 😭 Lima soal buat nyambung ritme lagi.',
    // app.js:252 — REMINDER_MESSAGES.inactivity_1
    'push.pesan-inactivity-1-2': 'Oii {name}, satu hari skip nggak masalah. Yang penting hari ini comeback tipis dulu.',
    // app.js:253 — REMINDER_MESSAGES.inactivity_1
    'push.pesan-inactivity-1-3': 'Kemarin lewat tanpa latihan 👀 Sekarang bayar pakai 10 menit fokus, deal?',
    // app.js:256 — REMINDER_MESSAGES.inactivity_2
    'push.pesan-inactivity-2-1': 'Dua hari nggak belajar nih 😭 Jangan kasih jedanya naik level. Balik satu sesi sekarang.',
    // app.js:257 — REMINDER_MESSAGES.inactivity_2
    'push.pesan-inactivity-2-2': 'Bro, 2 hari kosong mulai kelihatan kayak pola. Putus polanya pakai 5 soal aja.',
    // app.js:258 — REMINDER_MESSAGES.inactivity_2
    'push.pesan-inactivity-2-3': 'Target luar negeri masih sama kan? Yaudah, comeback hari ini biar jalurnya nggak makin jauh.',
    // app.js:261 — REMINDER_MESSAGES.inactivity_3
    'push.pesan-inactivity-3-1': 'Woy {name}, 3 hari ngilang 😭 Comeback pakai 5 soal aja, nggak usah drama.',
    // app.js:262 — REMINDER_MESSAGES.inactivity_3
    'push.pesan-inactivity-3-2': 'Bro, tiga hari cukup buat ritme turun. Balik satu sesi dulu biar break nggak berubah jadi kebiasaan.',
    // app.js:263 — REMINDER_MESSAGES.inactivity_3
    'push.pesan-inactivity-3-3': 'Future {name} nelpon 📞 katanya jangan bikin dia mulai IELTS dari nol pas kelas 2.',
    // app.js:266 — REMINDER_MESSAGES.inactivity_7
    'push.pesan-inactivity-7-1': 'Bro… udah seminggu 💀 Nggak usah balas dendam belajar 2 jam. Mulai ulang dari 5 soal hari ini.',
    // app.js:267 — REMINDER_MESSAGES.inactivity_7
    'push.pesan-inactivity-7-2': 'Seminggu kosong bukan akhir dunia, tapi ini waktunya reset ritme. Satu sesi kecil dulu.',
    // app.js:268 — REMINDER_MESSAGES.inactivity_7
    'push.pesan-inactivity-7-3': 'Oii {name}, kita nggak ngejar rasa bersalah. Kita ngejar comeback. 10 menit sekarang, gas.',
    // app.js:283 — REMINDER_MESSAGES.positive
    'push.pesan-positive-1': 'W, bro 🔥 Target hari ini beres dan ritme lu jalan. Nggak perlu nambah lama—jaga konsistensinya.',
    // app.js:284 — REMINDER_MESSAGES.positive
    'push.pesan-positive-2': 'Nice. Lu udah punya bukti belajar hari ini. Besok tinggal ulang pola yang sama.',
    // app.js:285 — REMINDER_MESSAGES.positive
    'push.pesan-positive-3': 'Ritme bagus 👀 Ini yang bakal bikin kelas 2 lebih ringan: bukan maraton, tapi konsisten.',
    // app.js:245 — REMINDER_MESSAGES.starter
    'push.pesan-starter-1': 'Oii {name}, hari ini masih kosong 👀 Lima soal dulu, habis itu bebas.',
    // app.js:246 — REMINDER_MESSAGES.starter
    'push.pesan-starter-2': 'Bro, FIEZEL belum dapet receipt belajar hari ini. Gas satu sesi pendek.',
    // app.js:247 — REMINDER_MESSAGES.starter
    'push.pesan-starter-3': '{name}, masuk bentar aja. Future lu butuh kiriman skill hari ini 📦',
    // app.js:248 — REMINDER_MESSAGES.starter
    'push.pesan-starter-4': 'Mau kuliah IT di luar kan? English-nya dicicil dulu, bro 😭',
    // app.js:240 — REMINDER_MESSAGES.struggling
    'push.pesan-struggling-1': 'Salah beberapa kali berturut-turut itu tanda materinya belum nempel. Ulang topiknya pelan-pelan, jangan dikebut.',
    // app.js:241 — REMINDER_MESSAGES.struggling
    'push.pesan-struggling-2': '{name}, berhenti nebak. Balik ke penjelasan dulu, baru lanjut soal.',
    // app.js:242 — REMINDER_MESSAGES.struggling
    'push.pesan-struggling-3': 'Pola salahnya keliatan di satu skill. Kita bedah topik itu dulu, jangan lanjut ngebut.',
    // app.js:1918 — makeClozeQuestion() explain.avoid
    'quiz.cloze-avoid': 'Tulis bentuk lengkapnya, jangan hanya kata dasarnya.',
    // app.js:1918 — makeClozeQuestion() explain.memory
    'quiz.cloze-memory': 'Baca petunjuk waktunya dulu, baru bentuk katanya.',
    // app.js:1914 — makeClozeQuestion() question
    'quiz.cloze-stem': `Lengkapi kalimatnya (ketik jawabanmu): {kalimat}`,
    // app.js:1918 — makeClozeQuestion() explain.why
    'quiz.cloze-why': `Kalimatnya menuntut bentuk "{isian}".`,
    // app.js:1300 — openConfidencePop() aria-label
    'quiz.keyakinan-aria': 'Tadi seberapa yakin',
    // app.js:1324 — confidencePopAnswered, label tersimpan
    'quiz.keyakinan-kecatat': `{label} — kecatat`,
    // app.js:1325 — tombol lanjut popup keyakinan
    'quiz.keyakinan-lihat-pembahasan': 'Lihat pembahasan',
    // app.js:1323
    'quiz.keyakinan-skala-1': 'Masih ragu',
    // app.js:1323
    'quiz.keyakinan-skala-2': 'Lumayan yakin',
    // app.js:1323
    'quiz.keyakinan-skala-3': 'Yakin sekali',
    // app.js:691 — readingFocusLabel() peta action
    'reading.fokus-action': 'tindakan',
    // app.js:691 — readingFocusLabel() peta cause_effect
    'reading.fokus-cause-effect': 'sebab dan akibat',
    // app.js:691 — readingFocusLabel() peta comparison
    'reading.fokus-comparison': 'perbandingan',
    // app.js:691 — readingFocusLabel() peta conclusion
    'reading.fokus-conclusion': 'kesimpulan',
    // app.js:691 — readingFocusLabel() peta detail
    'reading.fokus-detail': 'detail langsung',
    // app.js:691 — readingFocusLabel() peta detail2
    'reading.fokus-detail2': 'detail pendukung',
    // app.js:691 — readingFocusLabel() peta evidence
    'reading.fokus-evidence': 'bukti pendukung',
    // app.js:691 — readingFocusLabel() fallback
    'reading.fokus-fallback': 'detail bacaan',
    // app.js:691 — readingFocusLabel() peta how
    'reading.fokus-how': 'cara atau proses',
    // app.js:691 — readingFocusLabel() peta inference
    'reading.fokus-inference': 'kesimpulan dari petunjuk',
    // app.js:691 — readingFocusLabel() peta likely
    'reading.fokus-likely': 'kemungkinan berikutnya',
    // app.js:691 — readingFocusLabel() peta location
    'reading.fokus-location': 'tempat',
    // app.js:691 — readingFocusLabel() peta main_idea
    'reading.fokus-main-idea': 'gagasan utama',
    // app.js:691 — readingFocusLabel() peta paraphrase
    'reading.fokus-paraphrase': 'parafrasa',
    // app.js:691 — readingFocusLabel() peta people
    'reading.fokus-people': 'orang yang terlibat',
    // app.js:691 — readingFocusLabel() peta process
    'reading.fokus-process': 'proses',
    // app.js:691 — readingFocusLabel() peta purpose
    'reading.fokus-purpose': 'tujuan penulis',
    // app.js:691 — readingFocusLabel() peta quantity
    'reading.fokus-quantity': 'jumlah',
    // app.js:691 — readingFocusLabel() peta record
    'reading.fokus-record': 'informasi yang dicatat',
    // app.js:691 — readingFocusLabel() peta reference
    'reading.fokus-reference': 'rujukan kata',
    // app.js:691 — readingFocusLabel() peta relationship
    'reading.fokus-relationship': 'hubungan antargagasan',
    // app.js:691 — readingFocusLabel() peta sequence
    'reading.fokus-sequence': 'urutan kejadian',
    // app.js:691 — readingFocusLabel() peta time
    'reading.fokus-time': 'waktu',
    // app.js:691 — readingFocusLabel() peta tone
    'reading.fokus-tone': 'nada penulis',
    // app.js:691 — readingFocusLabel() peta true_false_not_stated
    'reading.fokus-true-false-not-stated': 'benar / salah / tidak disebutkan',
    // app.js:691 — readingFocusLabel() peta vocabulary
    'reading.fokus-vocabulary': 'arti kata dalam konteks',
    // app.js:691 — readingFocusLabel() peta vocabulary_context
    'reading.fokus-vocabulary-context': 'arti ungkapan dalam konteks',
    // app.js:691 — readingFocusLabel() peta why
    'reading.fokus-why': 'alasan',
    // app.js:655 — PART_OF_SPEECH_ID.adjective
    'vocab.jenis-kata-adjective': 'kata sifat',
    // app.js:655 — PART_OF_SPEECH_ID.adverb
    'vocab.jenis-kata-adverb': 'kata keterangan',
    // app.js:655 — PART_OF_SPEECH_ID.article
    'vocab.jenis-kata-article': 'kata sandang',
    // app.js:655 — PART_OF_SPEECH_ID.conjunction
    'vocab.jenis-kata-conjunction': 'kata penghubung',
    // app.js:655 — PART_OF_SPEECH_ID.determiner
    'vocab.jenis-kata-determiner': 'kata penentu',
    // app.js:656 — indonesianPartOfSpeech() fallback
    'vocab.jenis-kata-fallback': 'jenis kata',
    // app.js:655 — PART_OF_SPEECH_ID.interjection
    'vocab.jenis-kata-interjection': 'kata seru',
    // app.js:655 — PART_OF_SPEECH_ID.noun
    'vocab.jenis-kata-noun': 'kata benda',
    // app.js:655 — PART_OF_SPEECH_ID.number
    'vocab.jenis-kata-number': 'kata bilangan',
    // app.js:655 — PART_OF_SPEECH_ID.prefix
    'vocab.jenis-kata-prefix': 'awalan',
    // app.js:655 — PART_OF_SPEECH_ID.preposition
    'vocab.jenis-kata-preposition': 'kata depan',
    // app.js:655 — PART_OF_SPEECH_ID.pronoun
    'vocab.jenis-kata-pronoun': 'kata ganti',
    // app.js:655 — PART_OF_SPEECH_ID.verb
    'vocab.jenis-kata-verb': 'kata kerja',

    // ---------- W2-REGEN: entri tunda gelombang regen baseline ----------
    // app.js:323 — GRAMMAR_FAMILY_RULES.advanced_grammar
    'grammar.aturan-keluarga-advanced-grammar': 'Baca makna kalimat secara utuh sebelum melihat bentuknya. Pada pola tingkat lanjut, penekanan, urutan kejadian, dan hubungan antarklausa sama pentingnya dengan rumus.',
    // app.js:316 — GRAMMAR_FAMILY_RULES.articles_determiners
    'grammar.aturan-keluarga-articles-determiners': 'Perhatikan apakah benda yang dibicarakan masih umum, sudah jelas, dapat dihitung, tunggal, atau jamak. Dari situ baru tentukan a, an, the, atau penentu lain.',
    // app.js:322 — GRAMMAR_FAMILY_RULES.comparison
    'grammar.aturan-keluarga-comparison': 'Pastikan jumlah hal yang dibandingkan. Comparative dipakai untuk dua hal, sedangkan superlative dipakai untuk memilih satu dari kelompok yang lebih besar.',
    // app.js:313 — GRAMMAR_FAMILY_RULES.conditionals
    'grammar.aturan-keluarga-conditionals': 'Kalimat pengandaian punya pasangan bentuk yang berbeda. Tentukan dulu apakah situasinya fakta, masih mungkin terjadi, hanya bayangan, atau sudah terlambat diubah.',
    // app.js:324 — GRAMMAR_FAMILY_RULES.core_grammar
    'grammar.aturan-keluarga-core-grammar': 'Mulai dari subjek, kata kerja utama, dan waktu kejadian. Setelah itu, cocokkan bentuk yang membuat makna kalimat lengkap dan wajar.',
    // app.js:326 — GRAMMAR_FAMILY_RULES.emphasis_inversion
    'grammar.aturan-keluarga-emphasis-inversion': 'Inversi mengubah urutan biasa untuk memberi penekanan. Perhatikan kata pemicu di awal kalimat dan auxiliary yang harus mengikuti.',
    // app.js:320 — GRAMMAR_FAMILY_RULES.error_correction
    'grammar.aturan-keluarga-error-correction': 'Cari inti subjek dan kata kerjanya lebih dulu, lalu periksa tense, agreement, artikel, dan susunan kata. Ubah hanya bagian yang memang salah.',
    // app.js:318 — GRAMMAR_FAMILY_RULES.gerunds_infinitives
    'grammar.aturan-keluarga-gerunds-infinitives': 'Sebagian kata kerja diikuti bentuk -ing, sebagian lain diikuti to ditambah kata kerja dasar. Ada juga yang menerima keduanya tetapi maknanya berubah.',
    // app.js:325 — GRAMMAR_FAMILY_RULES.linking_devices
    'grammar.aturan-keluarga-linking-devices': 'Kata penghubung harus sesuai dengan hubungan antargagasan, misalnya tambahan, perlawanan, sebab, akibat, atau urutan.',
    // app.js:312 — GRAMMAR_FAMILY_RULES.modals
    'grammar.aturan-keluarga-modals': 'Kata seperti must, can, may, should, dan might membawa maksud yang berbeda, misalnya kewajiban, izin, saran, atau kemungkinan. Pilih yang paling cocok dengan maksud seluruh kalimat.',
    // app.js:314 — GRAMMAR_FAMILY_RULES.passive
    'grammar.aturan-keluarga-passive': 'Dalam kalimat pasif, perhatian diarahkan ke tindakan atau hasilnya. Pola dasarnya adalah be ditambah past participle, lalu pelaku hanya disebut jika memang penting.',
    // app.js:317 — GRAMMAR_FAMILY_RULES.prepositions
    'grammar.aturan-keluarga-prepositions': 'Kata depan dipilih dari hubungan makna, bukan terjemahan kata per kata. Lihat apakah kalimat membicarakan waktu, tempat, arah, cara, atau hubungan tertentu.',
    // app.js:319 — GRAMMAR_FAMILY_RULES.question_negation
    'grammar.aturan-keluarga-question-negation': 'Cek auxiliary, tense, subjek, dan apakah kalimatnya positif atau negatif. Empat hal ini menentukan susunan pertanyaan atau tag yang tepat.',
    // app.js:321 — GRAMMAR_FAMILY_RULES.relative_clauses
    'grammar.aturan-keluarga-relative-clauses': 'Tentukan apakah klausa relatif dibutuhkan untuk mengenali orang atau benda yang dimaksud, atau hanya memberi informasi tambahan. Koma biasanya menjadi petunjuk penting.',
    // app.js:315 — GRAMMAR_FAMILY_RULES.reported_speech
    'grammar.aturan-keluarga-reported-speech': 'Saat ucapan dipindahkan menjadi kalimat tidak langsung, sudut pandang, urutan kata, penunjuk waktu, dan tense kadang perlu bergeser agar tetap masuk akal.',
    // app.js:311 — GRAMMAR_FAMILY_RULES.tense_aspect
    'grammar.aturan-keluarga-tense-aspect': 'Fokusnya ada pada kapan sebuah tindakan terjadi dan apakah tindakannya rutin, sedang berlangsung, sudah selesai, atau terjadi lebih dulu. Cari petunjuk waktunya sebelum memilih bentuk kata kerja.',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.advanced_grammar
    'grammar.keluarga-advanced-grammar': 'pola grammar tingkat lanjut',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.articles_determiners
    'grammar.keluarga-articles-determiners': 'artikel dan penentu kata benda',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.comparison
    'grammar.keluarga-comparison': 'perbandingan',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.conditionals
    'grammar.keluarga-conditionals': 'kalimat pengandaian',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.core_grammar
    'grammar.keluarga-core-grammar': 'pola grammar dasar',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.emphasis_inversion
    'grammar.keluarga-emphasis-inversion': 'penekanan dan inversi',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.error_correction
    'grammar.keluarga-error-correction': 'mencari dan memperbaiki kesalahan',
    // app.js:372 — grammarFamilyLabel() fallback
    'grammar.keluarga-fallback': 'pola grammar',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.gerunds_infinitives
    'grammar.keluarga-gerunds-infinitives': 'gerund dan infinitive',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.linking_devices
    'grammar.keluarga-linking-devices': 'kata penghubung',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.modals
    'grammar.keluarga-modals': 'kata kerja bantu',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.nouns
    'grammar.keluarga-nouns': 'kata benda',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.passive
    'grammar.keluarga-passive': 'kalimat pasif',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.possession
    'grammar.keluarga-possession': 'kepemilikan',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.prepositions
    'grammar.keluarga-prepositions': 'kata depan',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.pronouns_determiners
    'grammar.keluarga-pronouns-determiners': 'kata ganti dan penentu',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.quantifiers
    'grammar.keluarga-quantifiers': 'kata penunjuk jumlah',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.question_formation
    'grammar.keluarga-question-formation': 'menyusun pertanyaan',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.question_negation
    'grammar.keluarga-question-negation': 'pertanyaan dan bentuk negatif',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.relative_clauses
    'grammar.keluarga-relative-clauses': 'klausa relatif',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.reported_speech
    'grammar.keluarga-reported-speech': 'kalimat tidak langsung',
    // app.js:309 — GRAMMAR_FAMILY_LABELS.tense_aspect
    'grammar.keluarga-tense-aspect': 'waktu dan keadaan tindakan',
    // app.js:630 — grammarExercise v8 stem
    'grammar.mode-avoid-stem': `Strategi mana yang paling bantu biar kesalahan di lesson {judulLesson} nggak keulang?`,
    // app.js:581 — grammarExercise v1 stem
    'grammar.mode-complete-stem': `Pilih versi lengkap yang pas sama pola {judulLesson}:\n{stem}`,
    // app.js:636 — grammarExercise v18-20 correctWhy
    'grammar.mode-contrast-benar': `Perbandingan yang bener nunjukin {kunciDikutip} jawabannya, terus nunjuk di mana {opsiDikutip} melesetnya.`,
    // app.js:636 — grammarExercise v18-20 expl
    'grammar.mode-contrast-expl-kebalik': `Kebalik: justru {kunciDikutip} yang jaga maksud kalimatnya, {opsiDikutip} yang meleset.`,
    // app.js:636 — grammarExercise v18-20 expl
    'grammar.mode-contrast-expl-keliru': `Keliru: lesson ini memang nguji perbandingan itu, dan {kunciDikutip} jawaban yang bener.`,
    // app.js:636 — grammarExercise v18-20 expl
    'grammar.mode-contrast-expl-sepadan': `Dua-duanya nggak sepadan; cuma {kunciDikutip} yang cocok sama kalimat ini.`,
    // app.js:636 — grammarExercise v18-20 OPSI distraktor
    'grammar.mode-contrast-opsi-kebalik': `{opsiDikutip} pas, dan {kunciDikutip} malah ngubah maksud kalimatnya.`,
    // app.js:636 — grammarExercise v18-20 stem (contrast_distractor)
    'grammar.mode-contrast-stem': `Perbandingan mana yang pas antara {kunciDikutip} dan {opsiDikutip}?\n{stem}`,
    // app.js:650 — grammarExercise v22 stem (locate_decision_cue)
    'grammar.mode-cue-stem': `Petunjuk pertama apa yang harus kamu temuin sebelum nimbang pilihan di contoh ini?\n{stem}`,
    // app.js:633 — grammarExercise v9-11 expl
    'grammar.mode-diagnose-expl-kunci': `Ini alasan kenapa {kunciDikutip} bener; padahal soal nanya kenapa {opsiDikutip} meleset.`,
    // app.js:633 — grammarExercise v9-11 expl lain
    'grammar.mode-diagnose-expl-lain': `Ini penjelasan buat pilihan {opsiLainDikutip}, bukan buat {opsiDikutip}.`,
    // app.js:633 — grammarExercise v9-11 stem (diagnose_distractor)
    'grammar.mode-diagnose-stem': `Temanmu milih {opsiDikutip}. Alasan mana yang paling pas jelasin kenapa pilihan itu meleset?\n{stem}`,
    // app.js:644 — grammarExercise v21 expl
    'grammar.mode-family-expl': `Label {labelDikutip} itu keluarga grammar lain. Contoh ini lagi nguji pola keluarga {labelKeluargaDikutip}.`,
    // app.js:644 — grammarExercise v21 stem (classify_family)
    'grammar.mode-family-stem': `Contoh ini terutama termasuk keluarga grammar yang mana?\n{stem}`,
    // app.js:612 — grammarExercise v2 stem
    'grammar.mode-justify-stem': `Kenapa {kunciDikutip} jadi jawaban paling pas di contoh ini?\n{stem}`,
    // app.js:634 — grammarExercise v12-14 correctWhy
    'grammar.mode-label-benar': `Label itu pas sama pola salah di balik pilihan {opsiDikutip}.`,
    // app.js:634 — grammarExercise v12-14 expl
    'grammar.mode-label-expl-keliru': `{opsiDikutip} memang keliru, jadi label “jawaban benar, nggak ada kesalahan mikir” jelas nggak berlaku buatnya.`,
    // app.js:634 — grammarExercise v12-14 expl lain
    'grammar.mode-label-expl-lain': `Label ini nunjukin kesalahan mikir di balik pilihan {opsiLainDikutip}, bukan {opsiDikutip}.`,
    // app.js:634 — grammarExercise v12-14 stem (label_misconception)
    'grammar.mode-label-stem': `Label kesalahan mana yang paling pas buat pilihan {opsiDikutip}?\n{stem}`,
    // app.js:653 — grammarExercise v24 stem (mastery_check)
    'grammar.mode-mastery-stem': `Rencana cek mandiri mana yang paling pas sebelum kamu nuntasin lesson {judulLesson}?`,
    // app.js:623 — grammarExercise v7 stem
    'grammar.mode-memory-stem': `Pengingat singkat mana yang paling nyambung sama contoh ini?\n{stem}`,
    // app.js:618 — grammarExercise v4 stem
    'grammar.mode-objective-stem': `Tujuan belajar mana yang paling nyambung sama soal ini?\n{stem}`,
    // app.js:619 — grammarExercise v5 stem
    'grammar.mode-reasoning-stem': `Urutan mikir mana yang paling aman sebelum kamu jawab?\n{stem}`,
    // app.js:635 — grammarExercise v15-17 stem (repair_distractor)
    'grammar.mode-repair-stem': `Jawaban {opsiDikutip} belum pas. Pilih perbaikan yang tetap jaga maksud kalimatnya:\n{stem}`,
    // app.js:617 — grammarExercise v3 stem
    'grammar.mode-rule-stem': `Aturan mana yang paling pas jelasin jawaban di contoh ini?\n{stem}`,
    // app.js:652 — grammarExercise v23 stem (teach_back)
    'grammar.mode-teach-stem': `Ringkasan ajar mana yang paling pas buat jelasin lesson {judulLesson} ke temanmu?`,
    // app.js:374 — grammarClue()
    'grammar.petunjuk-clue': `Petunjuk pentingnya adalah “{petunjuk}”.`,
    // app.js:374 — grammarClue() fallback
    'grammar.petunjuk-umum': 'Petunjuknya ada pada hubungan makna, subjek, dan bentuk kata kerja dalam satu kalimat penuh.',
    // app.js:336 — GRAMMAR_PROMPTS[]
    'grammar.prompt-baca-penuh': `Baca satu kalimat penuh sebelum menjawab. Pilihan mana yang paling cocok?\n{stem}`,
    // app.js:332 — GRAMMAR_PROMPTS[]
    'grammar.prompt-cek-nama': `{name} sedang mengecek grammar kalimat ini. Bagian kosongnya sebaiknya diisi dengan apa?\n{stem}`,
    // app.js:330 — GRAMMAR_PROMPTS[]
    'grammar.prompt-lengkapi': `Lengkapi kalimat berikut dengan bentuk yang paling tepat:\n{stem}`,
    // app.js:331 — GRAMMAR_PROMPTS[]
    'grammar.prompt-makna': `Perhatikan makna kalimatnya, lalu pilih jawaban yang paling pas:\n{stem}`,
    // app.js:333 — GRAMMAR_PROMPTS[]
    'grammar.prompt-natural': `Pilih bentuk yang membuat kalimat berikut terdengar benar dan natural:\n{stem}`,
    // app.js:334 — GRAMMAR_PROMPTS[]
    'grammar.prompt-petunjuk': `Cari petunjuk waktu, subjek, atau maksud kalimat, lalu lengkapi bagian kosong:\n{stem}`,
    // app.js:335 — GRAMMAR_PROMPTS[]
    'grammar.prompt-pola': `Manakah pilihan yang mengikuti pola grammar dengan tepat?\n{stem}`,
    // app.js:551 — completeGrammarStem() fallback
    'grammar.stem-answer-fallback': `{stem} — jawaban: {opsi}`,
    // app.js:915 — levelEntryChoiceCopy() title
    'level.entry-pilih-judul': `Mau belajar di {level}? Sedikit lagi.`,
    // app.js:917 — levelEntryChoiceCopy() deferToast
    'level.entry-tunda-toast': `Oke, kita mulai dari {levelAwal} dulu. {level} nungguin kamu abis lulus ujian {ujian}.`,
    // app.js:1516 — deriveAdaptivePolicy() steps
    'policy.langkah-review': 'Mulai dari yang paling rawan lupa ({persenReview}% sesi).',
    // app.js:1516 — deriveAdaptivePolicy() steps
    'policy.langkah-target': 'Sesi ini {jumlahSoal} soal.',
    // app.js:1918 — makeClozeQuestion() explain.rule
    'quiz.cloze-rule': `Jawaban yang tepat: "{isian}".`,
    // app.js:1302 — openConfidencePop() vonis benar
    'quiz.vonis-benar': 'Benar, mantap!',
    // app.js:1302 — openConfidencePop() vonis salah
    'quiz.vonis-salah': 'Belum tepat, nggak apa-apa.'
  });
}());
