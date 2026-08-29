/**
 * FIEZEL · features/i18n/copy-id-app-d.js — COPY-MAP INDONESIA, segmen app.js baris 6001–8141
 *
 * MENGAPA: audit multilingual v2 (AI-02 F01, AI-03 F01-F08) — app.js tidak punya lapisan
 * string; berkas ini memindahkan naskah murid segmen D (quiz vocab/cloze, grammar hub +
 * alasan opsi, reading + placement, quizLoop, finishQuiz, progress + panel Brain/OLM/BKT,
 * pengaturan, AI task copy) ke copy-map sesuai plan W1-APPJS-D, supaya copy-th-app-d.js
 * bisa 1:1. Nilai DISALIN BYTE-PER-BYTE dari app.js — gerbang id-golden-snapshot-test.js
 * membekukan himpunan literal (PINDAH boleh, BERUBAH tidak). Kunci ber-slug netral: lexer
 * gerbang menghitung kunci berpenanda Indonesia sebagai "tambahan liar" (laporan W1-INFRA).
 * Placeholder BERNAMA {nama}; token {waktuReset} pada ai.quota.* dipertahankan — konsumsi
 * aiQuotaCopyText() mengisi jam reset di titik render, bukan di copy-map (AI-03-F10).
 *
 * CATATAN: naskah blok notice (aiErrorMessage) TIDAK di sini — ia di copy-id-quota.js
 * (kontrak quota-notice-a11y-test.js union K3, handoff W2-TEST-A §3). Payload/prompt AI
 * (aiTaskInputFor/aiTaskRequestBody, prompt tutor) TIDAK diekstraksi — kontrak server
 * protocol 1.7 (R6) dan mandat Wave 3.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    // app.js:7885 — askPuterAI
    'ai.ai-core-merespons': 'AI core merespons {status}',
    // app.js:7881 — askPuterAI
    'ai.konfigurasi-ai-fiezel-tidak-valid': 'Konfigurasi AI FIEZEL tidak valid.',
    // app.js:7886 — askPuterAI
    'ai.permintaan-ai-melewati-batas-waktu': 'Permintaan AI melewati batas waktu.',
    // app.js:7719 — AI_TASK_COPY
    'ai.quota.ai-tutor-istirahat-dulu': 'AI Tutor istirahat dulu',
    // app.js:6071 — grammar
    'grammar.buka-lesson': 'Buka lesson',
    // app.js:6071 — grammar
    'grammar.fokus': '{prerequisites} · Fokus: {family}.',
    // app.js:6215 — makeGrammarQuestion
    'grammar.fokus-khusus': '{rule} Fokus khusus: {focus}.',
    // app.js:6082 — renderGrammarLesson
    'grammar.lesson-fondasi-pertama': 'Ini lesson fondasi pertama.',
    // app.js:6081 — openGrammarLesson
    'grammar.lesson-hanya-tersedia-pada-level': 'Lesson ini hanya tersedia pada level {level}.',
    // app.js:6071 — grammar
    'grammar.lewati-materi-2': 'Lewati materi',
    // app.js:6071 — grammar
    'grammar.mastery': 'Mastery {mastery}%',
    // app.js:6082 — renderGrammarLesson
    'grammar.prasyarat-2': 'Prasyarat: {join}',
    // app.js:6071 — grammar
    'grammar.terkunci-2': 'Terkunci',
    // app.js:6069 — grammar
    'grammar.ujian-skip-level': 'Ujian Skip Level. {level}',
    // app.js:6075 — grammar
    'grammar.ujian-skip-level-level': 'Ujian Skip Level level {level}. {ujian}',
    // app.js:6510 — makeListeningQuestion
    'placement.jawabannya-adalah-pokok-dibicarakan-sepanjang': 'Jawabannya adalah pokok yang dibicarakan sepanjang rekaman, bukan satu detail yang kebetulan terdengar.',
    // app.js:6510 — makeListeningQuestion
    'placement.jawabannya-disebut-langsung-dalam-rekaman': 'Jawabannya disebut langsung di dalam rekaman; bagian lain hanya terdengar mirip.',
    // app.js:6579 — startLevelPractice
    'placement.materi-level-belum-tersedia': 'Materi level {level} belum tersedia.',
    // app.js:6513 — makeListeningQuestion
    'placement.situasinya': 'Situasinya: {skenario}.',
    // app.js:6347 — placement
    'placement.tes-kemampuan-dasar': 'Tes Kemampuan Dasar',
    // app.js:7214 — bktShadowMarkup
    'progress.akar-masalah-bkt': 'Akar masalah (BKT):',
    // app.js:7242 — olmPanelMarkup
    'progress.aktif-teratasi': '{activeCount} aktif · {resolvedCount} teratasi',
    // app.js:7304 — coreBrainPanelMarkup
    'progress.analisis': 'Analisis',
    // app.js:7215 — bktShadowMarkup
    'progress.bayangan-tanpa-otoritas-unlock': '(bayangan - tanpa otoritas unlock)',
    // app.js:7276 — affectSuggestionMarkup
    'progress.cuaca-sesi-terakhir': 'Cuaca sesi terakhir',
    // app.js:7291 — coreBrainPanelMarkup
    'progress.div-jam-paling-produktif-br': '<div><b>Jam paling produktif</b><br>{id} · {akurasi}% akurasi</div>',
    // app.js:7304 — coreBrainPanelMarkup
    'progress.kesiapan-skills': 'Kesiapan & Skills',
    // app.js:7334 — nextSessionPanelMarkup
    'progress.lihat-alasannya': 'Lihat alasannya',
    // app.js:7284 — coreBrainPanelMarkup
    'progress.masih-segar': 'Masih segar',
    // app.js:7215 — bktShadowMarkup
    'progress.mastery-bkt': 'Mastery BKT',
    // app.js:7283 — coreBrainPanelMarkup
    'progress.mendatar': 'Mendatar',
    // app.js:7284 — coreBrainPanelMarkup
    'progress.mulai-lelah': 'Mulai lelah',
    // app.js:7333 — nextSessionPanelMarkup
    'progress.mulai-sesi': 'Mulai sesi',
    // app.js:7330 — nextSessionPanelMarkup
    'progress.next-session-dipilih-paw': 'NEXT SESSION \u00b7 DIPILIH PAW',
    // app.js:7214 — bktShadowMarkup
    'progress.penguasaan-keyakinan': '{skillName} · penguasaan {L}% · keyakinan {confidence}%',
    // app.js:7241 — olmPanelMarkup
    'progress.penguasaan-terkuat': 'Penguasaan terkuat:',
    // app.js:7348 — progress
    'progress.perkiraan-level': 'Perkiraan level:',
    // app.js:7385 — progress
    'progress.reset-progres': 'Reset progres',
    // app.js:7304 — coreBrainPanelMarkup
    'progress.ringkasan': 'Ringkasan',
    // app.js:7283 — coreBrainPanelMarkup
    'progress.sedang-naik': 'Sedang naik',
    // app.js:7283 — coreBrainPanelMarkup
    'progress.sedang-turun': 'Sedang turun',
    // app.js:7259 — confusionInsightMarkup
    'progress.sering-dijawab-memakai-aturan': 'sering dijawab memakai aturan',
    // app.js:7275 — affectSuggestionMarkup
    'progress.sesi-diperpendek-diisi-review-ringan': 'sesi diperpendek dan diisi review ringan',
    // app.js:7240 — olmPanelMarkup
    'progress.sistem-yakini-tentangmu': 'Yang sistem yakini tentangmu',
    // app.js:7284 — coreBrainPanelMarkup
    'progress.sudah-lelah': 'Sudah lelah',
    // app.js:7275 — affectSuggestionMarkup
    'progress.tantangan-dinaikkan-supaya-sesi-tidak': 'tantangan dinaikkan supaya sesi tidak membosankan',
    // app.js:7273 — affectSuggestionMarkup
    'progress.terlihat-bosan': 'Terlihat bosan',
    // app.js:7273 — affectSuggestionMarkup
    'progress.terlihat-frustrasi': 'Terlihat frustrasi',
    // app.js:7273 — affectSuggestionMarkup
    'progress.terlihat-lelah': 'Terlihat lelah',
    // app.js:6020 — makeVocabQuestion
    'quiz-vocab.bentuk': ' (bentuk dari “{word}”)',
    // app.js:6019 — makeVocabQuestion
    'quiz-vocab.dalam-kalimat-arti-paling-pas': 'Dalam kalimat “{sample}”, arti “{word}” yang paling pas apa?',
    // app.js:6020 — makeVocabQuestion
    'quiz-vocab.dalam-kalimat-kata-berperan-sebagai': 'Dalam kalimat “{sample}”, kata “{bentuk}”{asal} berperan sebagai jenis kata apa?',
    // app.js:6802 — quizLoop
    'quiz.bandingkan-pilihan-lain': 'Bandingkan pilihan lain',
    // app.js:7084 — finishQuiz
    'quiz.hasil-sesi': 'Hasil sesi ini:',
    // app.js:7128 — finishQuiz
    'quiz.ikuti-hasil-tes': 'Ikuti hasil tes ({placementLevelName})',
    // app.js:6712 — quizLoop
    'quiz.teks-bacaan': 'TEKS BACAAN',
    // app.js:6274 — makeReadingQuestion
    'reading.apa-menyebabkan-perubahan-tersebut': 'Apa yang menyebabkan perubahan tersebut?',
    // app.js:6274 — makeReadingQuestion
    'reading.apa-tujuan-utama-penulis-membuat': 'Apa tujuan utama penulis membuat bacaan ini?',
    // app.js:6328 — makeExamReadingQuestion
    'reading.bacaan-4': 'Bacaan',
    // app.js:6274 — makeReadingQuestion
    'reading.bagaimana-istilah-dipakai-dalam-konteks': 'Bagaimana istilah itu dipakai dalam konteks bacaan?',
    // app.js:6274 — makeReadingQuestion
    'reading.bagaimana-urutan-kejadian-dalam-bacaan': 'Bagaimana urutan kejadian di dalam bacaan?',
    // app.js:6337 — readingExamTypeLabel
    'reading.fakta-tertulis': 'Fakta yang tertulis',
    // app.js:6337 — readingExamTypeLabel
    'reading.fakta-tidak-tertulis-except': 'Fakta yang TIDAK tertulis (EXCEPT)',
    // app.js:6274 — makeReadingQuestion
    'reading.gagasan-utama-mana-paling-mewakili': 'Gagasan utama mana yang paling mewakili isi bacaan?',
    // app.js:6337 — readingExamTypeLabel
    'reading.mencocokkan-informasi-paragraf': 'Mencocokkan informasi ke paragraf',
    // app.js:6274 — makeReadingQuestion
    'reading.mengapa-teks-kemungkinan-besar-ditulis': 'Mengapa teks ini kemungkinan besar ditulis?',
    // app.js:6337 — readingExamTypeLabel
    'reading.menyederhanakan-kalimat': 'Menyederhanakan kalimat',
    // app.js:6337 — readingExamTypeLabel
    'reading.menyisipkan-kalimat': 'Menyisipkan kalimat',
    // app.js:6337 — readingExamTypeLabel
    'reading.pemahaman-bacaan': 'Pemahaman bacaan',
    // app.js:6337 — readingExamTypeLabel
    'reading.pilihan-ganda': 'Pilihan ganda',
    // app.js:6274 — makeReadingQuestion
    'reading.sebenarnya-bacaan-paling-banyak-membahas': 'Sebenarnya, bacaan ini paling banyak membahas apa?',
    // app.js:6337 — readingExamTypeLabel
    'reading.simpulan': 'Simpulan',
    // app.js:6337 — readingExamTypeLabel
    'reading.tujuan-penulis': 'Tujuan penulis',
    // app.js:7482 — clearAppCache
    'settings.cache-dibersihkan-progres-belajarmu-tetap': '{jumlah} cache dibersihkan. Progres belajarmu tetap aman.{catatan}',
    // app.js:7433 — openSettings
    'settings.data-amp-penyimpanan': 'Data &amp; Penyimpanan',
    // app.js:7486 — clearAppCache
    'settings.gagal-membersihkan-cache': 'Gagal membersihkan cache: {error}',
    // app.js:7432 — openSettings
    'settings.suara-amp-notifikasi': 'Suara &amp; Notifikasi',
    // app.js:8141 — installBackNav
    'ui.gagal-memuat-fiezel-jalankan-melalui': 'Gagal memuat FIEZEL: {message}. Jalankan melalui server lokal/GitHub Pages, bukan file://.',

    // ---------- W2-REGEN: entri tunda gelombang regen baseline ----------
    // app.js:7882 — askPuterAI
    'ai.ai-belum-siap-login-puter': 'AI belum siap. Login Puter dan koneksi internet diperlukan.',
    // app.js:8031 — askCoachAI
    'ai.ai-coach-core-merespons': 'AI Coach Core merespons {status}',
    // app.js:7887 — askPuterAI
    'ai.ai-core-tidak-mengembalikan-answer': 'AI Core tidak mengembalikan jawaban teks.',
    // app.js:7883 — askPuterAI
    'ai.core-brain-fiezel-belum-diaktifkan': 'Core Brain FIEZEL belum diaktifkan pada deployment ini. Fitur belajar tetap bisa dipakai, tetapi AI menunggu Core Worker tersambung.',
    // app.js:8031 — askCoachAI
    'ai.core-brain-pending-dikonfigurasi-for': 'Core Brain belum dikonfigurasi untuk Context Coach',
    // app.js:8020 — renderCoachResult
    'ai.dibuat-ringkasan-latihanmu-bukan-isi': 'Ini dibuat dari ringkasan latihanmu, bukan dari isi jawabanmu.',
    // app.js:7927 — openAILoading
    'ai.fiezel-sedang-menyiapkan-penjelasan-lebih': 'FIEZEL sedang menyiapkan penjelasan yang lebih mudah dipahami.',
    // app.js:7966 — renderAIResult
    'ai.konteks-item-or-materi-you': 'Konteks soal atau materi yang kamu buka diproses oleh Core AI untuk membuat penjelasan. Jangan masukkan data pribadi.',
    // app.js:7927 — openAILoading
    'ai.memuat-penjelasan-ai': 'Memuat penjelasan AI',
    // app.js:8021 — askCoachAI
    'ai.menganalisis-skill-name': 'Menganalisis skill {name}',
    // app.js:8032 — explainWithAI
    'ai.penjelasan-ai': 'Penjelasan AI',
    // app.js:8020 — renderCoachResult
    'ai.peta-study': 'Peta belajar',
    // app.js:7727 — AI_TASK_COPY
    'ai.quota-ai-tutor-now-no-can': 'AI Tutor sedang nggak bisa dihubungi',
    // app.js:7721 — AI_TASK_COPY
    'ai.quota-all-materi-practice-penjelasan-bawaan': 'Semua materi, latihan, penjelasan bawaan, dan progresmu jalan seperti biasa — nggak ada yang ikut terkunci. Limitnya diperbarui {waktuReset}.',
    // app.js:7728 — AI_TASK_COPY
    'ai.quota-bukan-limit-you-layanannya-now': 'Ini bukan limit kamu — layanannya yang sedang bermasalah di sisi kami. Fiezel tetap bisa digunakan untuk belajar: latihan, penjelasan bawaan, level, dan progresmu semua jalan seperti biasa.',
    // app.js:7732 — AI_TASK_COPY
    'ai.quota-kami-try-sambungkan-again-otomatis': 'Kami coba sambungkan lagi otomatis sebentar lagi, jadi kamu nggak perlu menekan apa pun.',
    // app.js:7720 — AI_TASK_COPY
    'ai.quota-limit-ai-gratis-you-day': 'Limit AI gratis kamu hari ini sudah habis. Fiezel tetap bisa digunakan untuk belajar. AI Tutor akan tersedia lagi setelah limit diperbarui.',
    // app.js:7749 — AI_TASK_COPY
    'ai.quota-me-pending-can-membaca-sisa': 'Aku belum bisa membaca sisa jatahmu, jadi jatahmu kemungkinan besar masih utuh. Coba lagi sebentar lagi, ya.',
    // app.js:7754 — AI_TASK_COPY
    'ai.quota-mode-hemat-answer-fiezel-bukan': 'Mode hemat — jawaban ini dari FIEZEL, bukan AI.',
    // app.js:7748 — AI_TASK_COPY
    'ai.quota-sisa-jatahmu-pending-can-me': 'Sisa jatahmu belum bisa aku baca',
    // app.js:7733 — AI_TASK_COPY
    'ai.quota-try-again-setelah-beberapa-when': 'Coba lagi setelah beberapa saat.',
    // app.js:7738 — AI_TASK_COPY
    'ai.quota-you-now-no-terhubung-internet': 'Kamu sedang nggak terhubung internet',
    // app.js:7739 — AI_TASK_COPY
    'ai.quota-you-now-no-terhubung-internet-2': 'Kamu sedang nggak terhubung internet. Materi, latihan, dan progresmu tetap jalan penuh — itu memang dirancang begitu. Terjemahan dan suara neural nyala lagi begitu jaringannya kembali.',
    // app.js:8008 — renderAIError
    'ai.try-again': 'Coba lagi',
    // app.js:6082 — renderGrammarLesson
    'grammar.all-item-tetap-menguji-konsep': 'Semua soal tetap menguji konsep lesson ini melalui penerapan, diagnosis distraktor, perbandingan, penjelasan aturan, dan cek penguasaan.',
    // app.js:6082 — renderGrammarLesson
    'grammar.answer-pas': 'Jawaban yang pas:',
    // app.js:6122 — openLessonSkipGate
    'grammar.belum-lulus-progresmu-aman-gerbangnya': 'Belum lulus? Progresmu aman — gerbangnya membuka lagi setelah 24 jam, materinya tetap menunggumu di jalur',
    // app.js:6187 — grammarCorrectOptionReason
    'grammar.bener-diminta-pola-kalimat': 'bener — ini yang diminta pola {focus} di kalimat ini.',
    // app.js:6164 — GRAMMAR_META_KEY_ENDORSE
    'grammar.bener-emang-alasan-dipakai-lesson': 'bener — ini emang alasan yang dipakai lesson ini.',
    // app.js:6175 — GRAMMAR_META_KEY_ENDORSE
    'grammar.bener-emang-alasan-gagal-dibidik': 'bener — ini emang alasan gagal yang dibidik lesson ini.',
    // app.js:6165 — GRAMMAR_META_KEY_ENDORSE
    'grammar.bener-emang-aturan-dipakai-lesson': 'bener — ini emang aturan yang dipakai lesson ini.',
    // app.js:6184 — GRAMMAR_META_KEY_ENDORSE
    'grammar.bener-emang-keluarga-pola-dipakai': 'bener — ini emang keluarga pola yang dipakai lesson ini.',
    // app.js:6168 — GRAMMAR_META_KEY_ENDORSE
    'grammar.bener-emang-kesalahan-mikir-dibidik': 'bener — ini emang kesalahan mikir yang dibidik lesson ini.',
    // app.js:6178 — GRAMMAR_META_KEY_ENDORSE
    'grammar.bener-emang-label-kesalahan-dipakai': 'bener — ini emang label kesalahan yang dipakai lesson ini.',
    // app.js:6169 — GRAMMAR_META_KEY_ENDORSE
    'grammar.bener-emang-pengingat-dipakai-lesson': 'bener — ini emang pengingat yang dipakai lesson ini.',
    // app.js:6181 — GRAMMAR_META_KEY_ENDORSE
    'grammar.bener-emang-perbandingan-dipakai-lesson': 'bener — ini emang perbandingan yang dipakai lesson ini.',
    // app.js:6171 — GRAMMAR_META_KEY_ENDORSE
    'grammar.bener-emang-petunjuk-pertama-dipakai': 'bener — ini emang petunjuk pertama yang dipakai lesson ini.',
    // app.js:6173 — GRAMMAR_META_KEY_ENDORSE
    'grammar.bener-emang-rencana-cek-dipakai': 'bener — ini emang rencana cek yang dipakai lesson ini.',
    // app.js:6172 — GRAMMAR_META_KEY_ENDORSE
    'grammar.bener-emang-ringkasan-ajar-dipakai': 'bener — ini emang ringkasan ajar yang dipakai lesson ini.',
    // app.js:6170 — GRAMMAR_META_KEY_ENDORSE
    'grammar.bener-emang-strategi-dipakai-lesson': 'bener — ini emang strategi yang dipakai lesson ini.',
    // app.js:6166 — GRAMMAR_META_KEY_ENDORSE
    'grammar.bener-emang-tujuan-dibidik-lesson': 'bener — ini emang tujuan yang dibidik lesson ini.',
    // app.js:6167 — GRAMMAR_META_KEY_ENDORSE
    'grammar.bener-emang-urutan-mikir-dipakai': 'bener — ini emang urutan mikir yang dipakai lesson ini.',
    // app.js:6082 — renderGrammarLesson
    'grammar.contoh': 'Contoh',
    // app.js:6147 — grammarBorrowedOptionReason
    'grammar.cuma-pernyataan-umum-no-menjelasin': 'cuma pernyataan umum yang nggak menjelasin pola lesson ini.',
    // app.js:6055 — grammar
    'grammar.dikuasai-mastery': 'Dikuasai, mastery {mastery}%.',
    // app.js:6122 — openLessonSkipGate
    'grammar.fiezel-lewati-materi': 'FIEZEL LEWATI MATERI',
    // app.js:6041 — grammar
    'grammar.fondasi-awal': 'Fondasi awal',
    // app.js:6119 — openLessonSkipGate
    'grammar.gerbang-materi-can-dicoba-again': 'Gerbang materi ini bisa dicoba lagi {level}.',
    // app.js:6215 — makeGrammarQuestion
    'grammar.inget-fokus-ya-cek-kenapa': 'Inget fokus {focus}, ya. Cek kenapa tiap jebakan beda dari jawaban benar.',
    // app.js:6122 — openLessonSkipGate
    'grammar.item-materi-diacak-templat-lessonnya': '{jumlahSoalGerbang} soal dari materi ini, diacak dari templat lessonnya',
    // app.js:6076 — grammar
    'grammar.item-pilihan-boleh-bervariasi-tetapi': 'Soal pilihan boleh bervariasi, tetapi urutan lesson mengikuti kurikulum dan prasyarat.',
    // app.js:6076 — grammar
    'grammar.jalur': 'Jalur {level}',
    // app.js:6082 — renderGrammarLesson
    'grammar.jangan-buru-buru-menghafal-rumus': 'Jangan buru-buru menghafal rumus. Temukan dulu petunjuk waktu, maksud kalimat, dan hubungan antarbagian.',
    // app.js:6151 — grammarBorrowedOptionReason
    'grammar.kedengeran-masuk-akal-tapi-no': 'kedengeran masuk akal, tapi nggak menjelasin pola yang lagi diuji di lesson ini.',
    // app.js:6146 — grammarBorrowedOptionReason
    'grammar.keluarga-grammar-lain-bukan-keluarga': 'itu keluarga grammar lain, bukan keluarga pola yang lagi diuji lesson ini.',
    // app.js:6082 — renderGrammarLesson
    'grammar.kembali-grammar-hub': 'Kembali ke Grammar Hub',
    // app.js:6060 — grammar
    'grammar.lesson': 'Lesson {index}: {title}. {statusText}',
    // app.js:6081 — openGrammarLesson
    'grammar.lesson-belum-memiliki-materi': 'Lesson ini belum memiliki materi.',
    // app.js:6091 — practiceSkill
    'grammar.lesson-new-memiliki-item-valid': 'Lesson ini baru memiliki {jumlahSoal} soal valid.',
    // app.js:6076 — grammar
    'grammar.lesson-terurut-for-level-start': '{jumlahLesson} lesson terurut untuk level {level}. Mulai dari urutan pertama agar prasyaratnya tidak terlewat.',
    // app.js:6122 — openLessonSkipGate
    'grammar.lewati': 'Lewati “{title}”?',
    // app.js:6064 — grammar
    'grammar.lewati-materi': 'Lewati materi',
    // app.js:6064 — grammar
    'grammar.lewati-materi-lewat-gerbang-bukti': 'Lewati materi {title} lewat gerbang bukti {jumlahSoalGerbang} soal',
    // app.js:6117 — openLessonSkipGate
    'grammar.materi-done-finish-tidak-ada': 'Materi ini sudah selesai — tidak ada yang perlu dilewati.',
    // app.js:6121 — openLessonSkipGate
    'grammar.materi-new-memiliki-item-valid': 'Materi ini baru memiliki {jumlahSoal} soal valid — gerbangnya belum bisa dibuka.',
    // app.js:6131 — startLessonSkipGate
    'grammar.materi-new-memiliki-item-valid-2': 'Materi ini baru memiliki {jumlahSoal} soal valid.',
    // app.js:6082 — renderGrammarLesson
    'grammar.mode-practice-terfokus': '{jumlahSoal} mode latihan terfokus',
    // app.js:6122 — openLessonSkipGate
    'grammar.mulai-gerbang-bukti': 'Mulai gerbang bukti',
    // app.js:6122 — openLessonSkipGate
    'grammar.nanti-dulu': 'Nanti dulu',
    // app.js:6072 — grammar
    'grammar.ol-class-lesson-path-aria': '<ol class="lesson-path" aria-label="Jalur lesson level {level}">{pathSteps}{examStep}</ol>',
    // app.js:6215 — makeGrammarQuestion
    'grammar.pahami-dulu-maksud-kalimatnya-baru': 'Pahami dulu maksud kalimatnya. Baru cek petunjuk dari lesson, terus pilih bentuknya.',
    // app.js:6082 — renderGrammarLesson
    'grammar.pahami-dulu-urutan': 'PAHAMI DULU · URUTAN {sequence}',
    // app.js:6091 — practiceSkill
    'grammar.pilih-lesson-terlebih-dahulu': 'Pilih lesson {level} terlebih dahulu.',
    // app.js:6041 — grammar
    'grammar.prasyarat': 'Prasyarat: {join}',
    // app.js:6122 — openLessonSkipGate
    'grammar.right-minimal-materi-ditandai-finish': 'Benar minimal {LESSON_SKIP_GATE_PASS} → materi ditandai selesai, lesson berikutnya terbuka',
    // app.js:6150 — grammarBorrowedOptionReason
    'grammar.sebenarnya-bener-tapi-ngejelasin-kalimat': 'sebenarnya bener, tapi itu ngejelasin kalimat di lesson {skillName}, bukan kalimat di kartu ini.',
    // app.js:6055 — grammar
    'grammar.selesai-mastery': 'Selesai, mastery {mastery}%.',
    // app.js:6082 — renderGrammarLesson
    'grammar.start-item': 'Mulai {jumlahSoal} soal',
    // app.js:6122 — openLessonSkipGate
    'grammar.sudah-menguasai-materi-tempat-lain': 'Sudah menguasai materi ini dari tempat lain? Buktikan dulu — tidak ada lompatan gratis, sama seperti Ujian Skip Level.',
    // app.js:6122 — openLessonSkipGate
    'grammar.tanpa-petunjuk-keluar-tengah-jalan': 'Tanpa petunjuk · keluar di tengah jalan = percobaannya terpakai',
    // app.js:6055 — grammar
    'grammar.terbuka-mastery': 'Terbuka, mastery {mastery}%.',
    // app.js:6055 — grammar
    'grammar.terkunci': 'Terkunci. {alasanKunci}',
    // app.js:6215 — makeGrammarQuestion
    'grammar.tiap-pilihan-salah-bawa-jebakan': 'Tiap pilihan salah bawa jebakan mikirnya sendiri. Cek alasannya satu-satu, jangan asal pilih yang keliatan akrab.',
    // app.js:6082 — renderGrammarLesson
    'grammar.urutan-mode-practice': '{level} · urutan {sequence} · {fondasi} · {jumlahSoal} mode latihan',
    // app.js:6513 — makeListeningQuestion
    'placement.bayangkan-situasinya-dulu-new-choose': 'Bayangkan situasinya dulu, baru pilih jawabannya.',
    // app.js:6347 — placement
    'placement.isinya-listening-grammar-vocabulary-tanpa': 'Isinya listening, grammar, dan vocabulary - tanpa teks bacaan. Soalnya diambil dari bentuk yang paling dasar di tiap level A1 sampai C2, dan urutannya diacak setiap kali kamu masuk. Setelah selesai, FIEZEL menyimpan perkiraan levelmu sebagai dasar latihan adaptif berikutnya.',
    // app.js:6347 — placement
    'placement.item-for-memetakan-kemampuan-sampai': '25 soal untuk memetakan kemampuan dari A1 sampai C2.',
    // app.js:6347 — placement
    'placement.item-sekitar-sepuluh-menit': '25 soal, sekitar sepuluh menit.',
    // app.js:6347 — placement
    'placement.masuk-practice-level': 'Masuk ke latihan level {l}',
    // app.js:6347 — placement
    'placement.pemetaan-level': 'PEMETAAN LEVEL',
    // app.js:6514 — makeListeningQuestion
    'placement.pilihan-lain-memakai-kata-kata': 'Pilihan lain memakai kata-kata yang memang terdengar di rekaman, tetapi tidak menjawab pertanyaannya.',
    // app.js:6512 — makeListeningQuestion
    'placement.putar-sekali-penuh-sebelum-melihat': 'Putar sekali penuh sebelum melihat pilihan. Menebak dari satu kata yang tertangkap adalah cara paling cepat salah.',
    // app.js:6347 — placement
    'placement.start-item': 'Mulai 25 soal',
    // app.js:6567 — startPlacement
    'placement.tes-level-bisa-diulang': 'Tes level bisa diulang {level}.',
    // app.js:6569 — startPlacement
    'placement.tes-pending-can-dijalankan': 'Tes belum bisa dijalankan: {error}',
    // app.js:6511 — makeListeningQuestion
    'placement.untuk-pertanyaan-detail-tahan-dulu': 'Untuk pertanyaan detail, tahan dulu jawaban yang terdengar familier; cocokkan dengan apa yang benar-benar diucapkan.',
    // app.js:6511 — makeListeningQuestion
    'placement.untuk-pertanyaan-pokok-pembicaraan-tanyakan': 'Untuk pertanyaan pokok pembicaraan, tanyakan: kalau rekaman ini diringkas satu kalimat, kalimatnya apa?',
    // app.js:6574 — startPlacement
    'placement.validator-hanya-menemukan-item-unik': 'Validator hanya menemukan {length} soal unik; tes belum aman dijalankan.',
    // app.js:7276 — affectSuggestionMarkup
    'progress.afek-dinilai-per-sesi-hanya': 'Afek dinilai per sesi dan hanya di memori perangkat - cuaca sesi, bukan penilaian tentang dirimu.',
    // app.js:7289 — coreBrainPanelMarkup
    'progress.akar-masalah': 'Akar masalah:',
    // app.js:7348 — progress
    'progress.answer': '{akurasi} · {attempts} jawaban',
    // app.js:7273 — affectSuggestionMarkup
    'progress.answer-terlalu-cepat-for-jadi': 'Jawaban terlalu cepat untuk jadi bukti',
    // app.js:7295 — coreBrainPanelMarkup
    'progress.arah-study': 'Arah belajar',
    // app.js:7296 — coreBrainPanelMarkup
    'progress.beban-dalam-sesi': 'Beban dalam sesi',
    // app.js:7357 — progress
    'progress.belum-ada-materi-perlu-diulang': 'Belum ada materi yang perlu diulang sekarang.',
    // app.js:7366 — progress
    'progress.belum-ada-pasangan-kata-terlihat': 'Belum ada pasangan kata yang terlihat sering tertukar dari riwayat jawaban.',
    // app.js:7362 — progress
    'progress.belum-ada-pola-kesalahan-berulang': 'Belum ada pola kesalahan yang berulang.',
    // app.js:7372 — progress
    'progress.belum-ada-sesi-adaptive-punya': 'Belum ada sesi adaptive yang punya outcome terukur.',
    // app.js:7365 — progress
    'progress.bukti-pending-cukup-for-menemukan': 'Bukti belum cukup untuk menemukan pola salah yang berulang.',
    // app.js:7344 — progress
    'progress.class-muted-bukti-study-pending': '<p class="muted">Bukti belajar belum cukup untuk membuat linimasa.</p>',
    // app.js:7213 — bktShadowMarkup
    'progress.class-muted-frontier-belum-terbaca': '<p class="muted">Frontier belum terbaca - butuh prasyarat yang lolos gerbang dan prediksi di jendela 55-90%.</p>',
    // app.js:7260 — confusionInsightMarkup
    'progress.dihitung-answer-wrong-memilih-opsi': 'Dihitung dari jawaban salah yang memilih opsi pinjaman lesson lain - substitusi terarah, bukan salah acak. Latihan pada pasangan ini yang paling cepat membongkar kebingungannya.',
    // app.js:7357 — progress
    'progress.dikuasai-risiko-lupa': '{mastery}% dikuasai · risiko lupa {x}%',
    // app.js:7348 — progress
    'progress.fiezel-belum-punya-cukup-bukti': 'FIEZEL belum punya cukup bukti untuk membuat laporan diagnostik. Mulai tes diagnostik terlebih dahulu.',
    // app.js:7371 — progress
    'progress.fokus': 'Fokus',
    // app.js:7298 — coreBrainPanelMarkup
    'progress.frag': '{relearn} dari {total}',
    // app.js:7373 — progress
    'progress.hari-aktif': '{consistency14d}% · {activeDays14} hari aktif',
    // app.js:7275 — affectSuggestionMarkup
    'progress.item-diringankan-dulu-supaya-you': 'soal diringankan dulu supaya kamu dapat bukti bahwa kamu bisa',
    // app.js:7371 — progress
    'progress.item-menit-2': '{sessionSize} soal · ±{estimatedMinutes} menit',
    // app.js:7366 — progress
    'progress.jaringan-kekeliruan-vocab': 'Jaringan Kekeliruan Kosakata',
    // app.js:7260 — confusionInsightMarkup
    'progress.kebingungan-antar-lesson': 'Kebingungan antar-lesson',
    // app.js:7302 — coreBrainPanelMarkup
    'progress.kesulitan-dipilih-model-kemampuan-peluang': 'Kesulitan dipilih dari model kemampuan (peluang benar ~80% adalah titik belajar paling efisien), jadwal ulang dari model paruh-waktu ingatan, dan fokus dari graf prasyarat skill. Semua dihitung di perangkat ini; yang dikirim ke Core hanya ringkasan keputusannya.',
    // app.js:7289 — coreBrainPanelMarkup
    'progress.kesulitan-kemungkinan-besar-berasal-jadi': 'kesulitan di {skillName} kemungkinan besar berasal dari {skillName}, jadi itu yang dilatih lebih dulu.',
    // app.js:7373 — progress
    'progress.konsistensi-hari': 'Konsistensi 14 hari',
    // app.js:7362 — progress
    'progress.lab-kesalahan': 'Lab Kesalahan',
    // app.js:7281 — coreBrainPanelMarkup
    'progress.lapisan-penalaran-belum-termuat-perangkat': 'Lapisan penalaran belum termuat di perangkat ini. Kebijakan adaptif tetap berjalan dengan mesin deterministik di bawahnya.',
    // app.js:7358 — progress
    'progress.laporan-diagnostik': 'Laporan Diagnostik',
    // app.js:7359 — progress
    'progress.lencana-bukti-study-redup-menunjukkan': 'Lencana bukti belajar — yang redup menunjukkan cara mendapatkannya.',
    // app.js:7215 — bktShadowMarkup
    'progress.lesson-terlacak-fiezel-mastery-bkt': "{tracked} lesson terlacak di 'fiezel-mastery-bkt-v1'. Panel ini hanya membaca; keputusan buka-kunci masih di mesin lama.",
    // app.js:7380 — progress
    'progress.lihat-bagian-sudah-kuat-pola': 'Lihat bagian yang sudah kuat, pola kesalahan yang berulang, dan fokus latihan berikutnya.',
    // app.js:7342 — progress
    'progress.materi-done-punya-bukti-study': '{length} materi {active} sudah punya bukti belajar',
    // app.js:7298 — coreBrainPanelMarkup
    'progress.materi-rawan-lupa': 'Materi rawan lupa',
    // app.js:7232 — olmPanelMarkup
    'progress.menurutku-salah': 'Menurutku ini salah',
    'progress.belum-cukup-data': 'belum cukup data',
    // app.js:7373 — progress
    'progress.model-memakai-agregat-perilaku-hasil': 'Model ini memakai agregat perilaku dan hasil belajar. Raw answer history tidak dikirim ke Core Brain.',
    // app.js:7372 — progress
    'progress.outcome-menjadi-evidence-policy-upcoming': 'Outcome ini menjadi evidence policy berikutnya. Raw jawaban tidak dikirim ke Core.',
    // app.js:7343 — progress
    'progress.peta-kemampuanmu-bukan-rapor-rendah': 'Ini peta kemampuanmu, bukan rapor. Yang rendah cuma berarti belum banyak dilatih.',
    // app.js:7367 — progress
    'progress.peta-skill-reading': 'Peta Skill Reading',
    // app.js:7356 — progress
    'progress.peta-study': 'Peta Belajar',
    // app.js:7380 — progress
    'progress.peta-study-lab': 'Peta Belajar & Lab',
    // app.js:7362 — progress
    'progress.pilihan-paling-sering-muncul-kali': 'Pilihan yang paling sering muncul: “{common}” ({count} kali)',
    // app.js:7365 — progress
    'progress.pola-kesalahan': 'Pola Kesalahan',
    // app.js:7371 — progress
    'progress.policy-bersifat-deterministik-dapat-diaudit': 'Policy bersifat deterministik dan dapat diaudit. AI Coach hanya menjelaskan plan; tidak boleh menimpa keputusan policy.',
    // app.js:7275 — affectSuggestionMarkup
    'progress.practice-dialihkan-bentuk-tidak-can': 'latihan dialihkan ke bentuk yang tidak bisa dijawab dengan menebak',
    // app.js:7372 — progress
    'progress.rekomendasi': 'Rekomendasi',
    // app.js:7245 — olmPanelMarkup
    'progress.ringkasan-dibaca-model-sama-memilih': 'Ringkasan ini dibaca dari model yang sama yang memilih soalmu - bukan penilaian tambahan.',
    // app.js:7362 — progress
    'progress.salah': '{errors} salah · {rate}%',
    // app.js:7286 — coreBrainPanelMarkup
    'progress.sampai-saat-kebijakan-adaptif-deterministik': 'Sampai saat itu, kebijakan adaptif deterministik yang memilih soalmu - persis seperti sebelumnya, tidak ada yang hilang.',
    // app.js:7364 — progress
    'progress.selisih-menunjukkan-jarak-antara-rasa': 'Selisih menunjukkan jarak antara rasa yakin dan hasil nyata. Semakin kecil, semakin akurat kamu menilai kemampuanmu sendiri.',
    // app.js:7373 — progress
    'progress.sesi': '{abandonmentRate}% dari {sessions30d} sesi',
    // app.js:7286 — coreBrainPanelMarkup
    'progress.still-mengumpulkan-bukti-answer-terbaca': 'Masih mengumpulkan bukti. {evidence} jawaban terbaca; lapisan ini baru ikut memutuskan setelah polanya cukup jelas.',
    // app.js:7371 — progress
    'progress.target': '{difficultyBand} · target {targetDifficulty}',
    // app.js:7372 — progress
    'progress.target-hit': 'Target hit',
    // app.js:7297 — coreBrainPanelMarkup
    'progress.tingkat-peluang-benar': 'tingkat {targetDifficulty} · peluang benar {predictedSuccess}%',
    // app.js:7337 — progress
    'progress.vocab': 'Kosakata',
    // app.js:7373 — progress
    'progress.waktu-study-dominan': 'Waktu belajar dominan',
    // app.js:6022 — makeVocabQuestion
    'quiz-vocab.arti-lang-indonesia-paling-dekat': 'Arti Bahasa Indonesia yang paling dekat dengan “{word}” apa?',
    // app.js:6025 — makeVocabQuestion
    'quiz-vocab.baca-seluruh-kalimat-lalu-bayangkan': 'Baca seluruh kalimat, lalu bayangkan situasinya sebelum memilih arti “{word}”.',
    // app.js:6023 — makeVocabQuestion
    'quiz-vocab.berfungsi-sebagai-jenis-kata-dilihat': '“{word}” berfungsi sebagai {jenisKata}. Jenis kata dilihat dari tugasnya di dalam kalimat, bukan hanya dari bentuk katanya.',
    // app.js:6025 — makeVocabQuestion
    'quiz-vocab.ingat-pasangan-singkat-berarti': 'Ingat pasangan singkat ini: {word} berarti {arti}.',
    // app.js:6024 — makeVocabQuestion
    'quiz-vocab.jangan-menebak-satu-kata-saja': 'Jangan menebak dari satu kata saja. Baca konteks lengkap supaya arti yang dipilih tetap masuk akal.',
    // app.js:6023 — makeVocabQuestion
    'quiz-vocab.kalimat-paling-pas-dimaknai-coba': 'Di kalimat itu, “{word}” paling pas dimaknai “{arti}”. Coba lihat tindakan atau situasi di sekeliling katanya.',
    // app.js:6024 — makeVocabQuestion
    'quiz-vocab.kata-bersinonim-punya-makna-inti': 'Kata yang bersinonim punya makna inti yang berdekatan, tetapi belum tentu bisa saling menggantikan di setiap kalimat.',
    // app.js:6021 — makeVocabQuestion
    'quiz-vocab.kata-mana-maknanya-paling-dekat': 'Kata mana yang maknanya paling dekat dengan “{word}”?',
    // app.js:6024 — makeVocabQuestion
    'quiz-vocab.lihat-fungsi-kata-dalam-kalimat': 'Lihat fungsi kata di dalam kalimat: apakah ia menamai sesuatu, menyatakan tindakan, menerangkan, atau menghubungkan bagian kalimat.',
    // app.js:6023 — makeVocabQuestion
    'quiz-vocab.paling-dekat-maknanya-dengan-keduanya': '“{sinonim}” paling dekat maknanya dengan “{word}”. Keduanya bisa terasa mirip, walaupun nuansa pemakaiannya dapat berbeda.',
    // app.js:6025 — makeVocabQuestion
    'quiz-vocab.pilihan-lain-memang-terlihat-mirip': 'Pilihan lain memang terlihat mirip atau berada di level yang sama, tetapi maknanya tidak cocok dengan kata target dalam konteks soal ini.',
    // app.js:6656 — quizLoop
    'quiz.ajar-ulang': 'AJAR ULANG',
    // app.js:6802 — quizLoop
    'quiz.answer-paling-tepat-adalah': '. Jawaban yang paling tepat adalah',
    // app.js:7129 — finishQuiz
    'quiz.answer-right-pada-percobaan-pertama': '{skor} dari {total} jawaban benar pada percobaan pertama.',
    // app.js:6975 — quizLoop
    'quiz.bentuk-tepat': 'Bentuk yang tepat: "{clozeAnswer}".',
    // app.js:6656 — quizLoop
    'quiz.bikin-tadi-keliru': 'Yang bikin tadi keliru: {s}.',
    // app.js:7073 — finishQuiz
    'quiz.bukti-diterima-right-ditandai-finish': 'Bukti diterima: {skor}/{total} benar. “{title}” ditandai selesai — lesson berikutnya terbuka.',
    // app.js:7127 — finishQuiz
    'quiz.bukti-each-band-right-ditanyakan': 'Bukti per band (benar / ditanyakan pada percobaan pertama):',
    // app.js:7084 — finishQuiz
    'quiz.class-muted-progres-sudah-masuk': '<p class="muted">Progres sudah masuk ke profil skill dan latihan adaptif berikutnya.</p>',
    // app.js:7079 — finishQuiz
    'quiz.class-tutor-report-data-lucide': '<p class="tutor-report"><i data-lucide="graduation-cap"></i> {headline}</p>',
    // app.js:6780 — quizLoop
    'quiz.div-class-tutor-turn-actions': '<div class="tutor-turn-actions"><button id="tutorStuck" class="tutor-stuck">Aku masih belum paham</button></div>',
    // app.js:6987 — quizLoop
    'quiz.hampir-persis-me-hitung-right': 'Hampir persis - aku hitung benar, cek lagi ejaannya: {answer}.',
    // app.js:7153 — finishQuiz
    'quiz.hasil-tes-level': 'Hasil tes: level {placementLevelName}.',
    // app.js:6802 — quizLoop
    'quiz.intinya': 'Intinya:',
    // app.js:6802 — quizLoop
    'quiz.jawabanmu': 'Jawabanmu',
    // app.js:6802 — quizLoop
    'quiz.jelaskan-dengan-cara-lebih-sederhana': 'Jelaskan dengan cara yang lebih sederhana',
    // app.js:7127 — finishQuiz
    'quiz.karena-you-memilihnya-sendiri-hasil': 'karena kamu memilihnya sendiri. Hasil tes ini menunjukkan',
    // app.js:6990 — quizLoop
    'quiz.kata-dasarnya-right-bentuknya-pending': 'Kata dasarnya benar, bentuknya belum. Yang tepat: {answer}.',
    // app.js:7129 — finishQuiz
    'quiz.kembali-home': 'Kembali ke Home',
    // app.js:6724 — quizLoop
    'quiz.ketik-jawabanmu-dalam-lang-inggris': 'Ketik jawabanmu dalam bahasa Inggris',
    // app.js:6724 — quizLoop
    'quiz.ketik-jawabanmu-sini': 'Ketik jawabanmu di sini',
    // app.js:7127 — finishQuiz
    'quiz.level-aktifmu-sekarang': 'Level aktifmu sekarang',
    // app.js:7127 — finishQuiz
    'quiz.level-belajarmu-diikutkan-hasil-tes': 'Level belajarmu diikutkan ke hasil tes ini, menggantikan perkiraan yang kamu pilih di awal. Kamu tetap bisa menggantinya sendiri kapan saja dari panel level.',
    // app.js:7127 — finishQuiz
    'quiz.level-naik-satu-band-hanya': 'Level naik satu band hanya kalau band itu lulus, mulai dari A1. Menebak tidak cukup.',
    // app.js:7127 — finishQuiz
    'quiz.level-you': 'LEVEL KAMU',
    // app.js:6742 — quizLoop
    'quiz.memutar': 'Memutar…',
    // app.js:7073 — finishQuiz
    'quiz.new-right-gerbang-butuh-minimal': 'Baru {skor}/{total} benar — gerbang ini butuh minimal {LESSON_SKIP_GATE_PASS}. Progresmu aman, dan gerbangnya bisa dicoba lagi setelah 24 jam — materinya tetap menunggumu di jalur.',
    // app.js:6712 — quizLoop
    'quiz.next': 'Lanjut',
    // app.js:6835 — quizLoop
    'quiz.next-me-still-kuat': 'Lanjut, aku masih kuat',
    // app.js:7129 — finishQuiz
    'quiz.next-practice-upcoming': 'Lanjut latihan berikutnya',
    // app.js:6656 — quizLoop
    'quiz.oke-me-siap-try-again': 'Oke, aku siap coba lagi',
    // app.js:6620 — quizLoop
    'quiz.pending-ada-item-tes-valid': 'Belum ada soal tes yang valid.',
    // app.js:6621 — quizLoop
    'quiz.pending-ada-item-valid-for': 'Belum ada soal yang valid untuk latihan ini.',
    // app.js:6724 — quizLoop
    'quiz.periksa': 'Periksa',
    // app.js:6712 — quizLoop
    'quiz.pilihan-terbuka-setelah-rekaman-diputar': 'Pilihan terbuka setelah rekaman diputar.',
    // app.js:7153 — finishQuiz
    'quiz.progres-tersimpan-for-rekomendasi-upcoming': 'Progres tersimpan untuk rekomendasi berikutnya.',
    // app.js:6757 — quizLoop
    'quiz.putar-ulang-bila-perlu': 'Putar ulang bila perlu.',
    // app.js:7153 — finishQuiz
    'quiz.sesi-bagus-catatanmu-diperbarui': 'Sesi bagus. Catatanmu diperbarui.',
    // app.js:7084 — finishQuiz
    'quiz.skor': '· skor {skor}/100. {berikutnya}',
    // app.js:6759 — quizLoop
    'quiz.suara-tidak-berbunyi-pilihan-tetap': 'Suara tidak berbunyi ({error}). Pilihan tetap dibuka.',
    // app.js:6757 — quizLoop
    'quiz.suaranya-belum-berbunyi-perangkat-pilihan': 'Suaranya belum berbunyi di perangkat ini. Pilihan tetap aku buka supaya kamu tidak terjebak, dan kamu boleh menekan Dengarkan lagi.',
    // app.js:6835 — quizLoop
    'quiz.sudahi-sesi': 'Sudahi sesi ini',
    // app.js:6991 — quizLoop
    'quiz.tepat-strong-strong': 'Yang tepat: <strong>{clozeAnswer}</strong>.',
    // app.js:6993 — quizLoop
    'quiz.you-menulis': 'Kamu menulis',
    // app.js:6975 — quizLoop
    'quiz.you-menulis-kata-dasarnya-done': 'kamu menulis "{typed}" - kata dasarnya sudah benar, bentuknya yang belum',
    // app.js:6274 — makeReadingQuestion
    'reading.akibat-apa-muncul-kondisi-dijelaskan': 'Akibat apa yang muncul dari kondisi yang dijelaskan?',
    // app.js:6274 — makeReadingQuestion
    'reading.alasan-apa-diberikan-untuk-keputusan': 'Alasan apa yang diberikan untuk keputusan tersebut?',
    // app.js:6308 — makeReadingQuestion
    'reading.answer-aman-harus-punya-bukti': 'Jawaban yang aman harus punya bukti yang benar-benar ada di bacaan.',
    // app.js:6281 — makeReadingQuestion
    'reading.apa-arti-dalam-bacaan': 'Apa arti “{m}” di dalam bacaan ini?',
    // app.js:6274 — makeReadingQuestion
    'reading.apa-arti-ungkapan-tersebut-dalam': 'Apa arti ungkapan tersebut di dalam bacaan ini?',
    // app.js:6274 — makeReadingQuestion
    'reading.apa-paling-mungkin-terjadi-jika': 'Apa yang paling mungkin terjadi jika kondisinya terus berlanjut?',
    // app.js:6274 — makeReadingQuestion
    'reading.arti-kata-atau-frasa-tersebut': 'Arti kata atau frasa tersebut yang paling pas dalam konteks ini apa?',
    // app.js:6309 — makeReadingQuestion
    'reading.baca-pertanyaannya-dulu-cari-bagian': 'Baca pertanyaannya dulu, cari bagian teks yang relevan, lalu cocokkan setiap pilihan dengan bukti. Jangan memilih hanya karena katanya terlihat sama.',
    // app.js:6229 — reading
    'reading.bacaan': '{length} bacaan',
    // app.js:6301 — makeReadingQuestion
    'reading.bacaan-2': 'bacaan ini',
    // app.js:6304 — makeReadingQuestion
    'reading.bacaan-3': 'Bacaan',
    // app.js:6229 — reading
    'reading.bacaan-acak': 'Bacaan acak {level}',
    // app.js:6229 — reading
    'reading.bacaan-item-for-level': '{length} bacaan · {total} soal untuk level {level}.',
    // app.js:6229 — reading
    'reading.bacaan-level-lain-tersimpan-tetapi': 'Bacaan level lain tersimpan, tetapi tidak dicampur ke jalur ini.',
    // app.js:6274 — makeReadingQuestion
    'reading.bagaimana-hubungan-antara-dua-gagasan': 'Bagaimana hubungan antara dua gagasan atau tahap tersebut?',
    // app.js:6274 — makeReadingQuestion
    'reading.bagaimana-prosesnya-berubah-setelah-bukti': 'Bagaimana prosesnya berubah setelah bukti dikumpulkan?',
    // app.js:6308 — makeReadingQuestion
    'reading.bagian-paling-mendukung-answer-adalah': 'Bagian yang paling mendukung jawaban ini adalah: “{evidence}”',
    // app.js:6232 — startReadingAdaptive
    'reading.belum-ada-area-reading-perlu': 'Belum ada area reading {level} yang perlu diadaptasikan.',
    // app.js:6229 — reading
    'reading.belum-ada-set-berformat-ujian': 'Belum ada set berformat ujian untuk level {level}. Yang sudah tersedia: {join}. Bacaan ujian panjangnya 700 kata ke atas, jadi set ini disusun mulai dari level menengah atas.',
    // app.js:6274 — makeReadingQuestion
    'reading.berapa-jumlah-disebutkan-dalam-bacaan': 'Berapa jumlah yang disebutkan di dalam bacaan?',
    // app.js:6302 — makeReadingQuestion
    'reading.berdasarkan': 'Berdasarkan “{title}”, {stem}',
    // app.js:6229 — reading
    'reading.buka-bacaan': 'Buka bacaan',
    // app.js:6274 — makeReadingQuestion
    'reading.bukti-apa-dalam-bacaan-mendukung': 'Bukti apa di dalam bacaan yang mendukung penafsiran tersebut?',
    // app.js:6334 — makeExamReadingQuestion
    'reading.bukti-dulu-answer-belakangan': 'Bukti dulu, jawaban belakangan.',
    // app.js:6274 — makeReadingQuestion
    'reading.cara-apa-digunakan-oleh-kelompok': 'Cara apa yang digunakan oleh kelompok tersebut?',
    // app.js:6309 — makeReadingQuestion
    'reading.cara-cepat-cari-bukti-dulu': 'Cara cepat: cari bukti dulu, baru pilih jawaban.',
    // app.js:6333 — makeExamReadingQuestion
    'reading.cari-dulu-bagian-teks-membahas': 'Cari dulu bagian teks yang membahas pernyataannya, baru nilai pilihannya. Jangan memilih karena katanya mirip.',
    // app.js:6274 — makeReadingQuestion
    'reading.detail-mana-benar-benar-didukung': 'Detail mana yang benar-benar didukung oleh bacaan?',
    // app.js:6274 — makeReadingQuestion
    'reading.detail-mana-menjadi-bukti-paling': 'Detail mana yang menjadi bukti paling kuat untuk kesimpulan itu?',
    // app.js:6274 — makeReadingQuestion
    'reading.detail-pendukung-mana-menguatkan-gagasan': 'Detail pendukung mana yang menguatkan gagasan utama?',
    // app.js:6274 — makeReadingQuestion
    'reading.fakta-tambahan-mana-relevan-dengan': 'Fakta tambahan mana yang relevan dengan argumen bacaan?',
    // app.js:6309 — makeReadingQuestion
    'reading.fokus-item-adalah-cari-bagian': 'Fokus soal ini adalah {focus}. Cari bagian teks yang langsung menjawab fokus tersebut.',
    // app.js:6274 — makeReadingQuestion
    'reading.gagasan-prior-mana-dirujuk-oleh': 'Gagasan sebelumnya mana yang dirujuk oleh kata tersebut?',
    // app.js:6274 — makeReadingQuestion
    'reading.hasil-upcoming-mana-paling-masuk': 'Hasil berikutnya mana yang paling masuk akal?',
    // app.js:6274 — makeReadingQuestion
    'reading.hubungan-apa-antara-peristiwa-peristiwa': 'Hubungan apa antara peristiwa-peristiwa yang dijelaskan?',
    // app.js:6274 — makeReadingQuestion
    'reading.informasi-apa-dicatat': 'Informasi apa yang dicatat?',
    // app.js:6343 — startReadingExam
    'reading.item-for-set-pending-lengkap': 'Soal untuk set ini belum lengkap.',
    // app.js:6274 — makeReadingQuestion
    'reading.kalimat-mana-punya-makna-sama': 'Kalimat mana yang punya makna sama dengan pernyataan penting itu?',
    // app.js:6274 — makeReadingQuestion
    'reading.kapan-peristiwa-dimaksud-terjadi': 'Kapan peristiwa yang dimaksud terjadi?',
    // app.js:6281 — makeReadingQuestion
    'reading.kata-bacaan-mengarah-apa': 'Kata “{m}” di bacaan mengarah ke apa?',
    // app.js:6229 — reading
    'reading.kata-item-menit': '{label} · {wordCount} kata · {jumlahSoal} soal · {minutesPerPassage} menit',
    // app.js:6274 — makeReadingQuestion
    'reading.kata-rujukan-mengarah-apa': 'Kata rujukan itu mengarah ke apa?',
    // app.js:6274 — makeReadingQuestion
    'reading.kesimpulan-apa-paling-aman-diambil': 'Kesimpulan apa yang paling aman diambil dari bukti yang tersedia?',
    // app.js:6274 — makeReadingQuestion
    'reading.kesimpulan-apa-paling-masuk-akal': 'Kesimpulan apa yang paling masuk akal dari petunjuk di bacaan?',
    // app.js:6274 — makeReadingQuestion
    'reading.kesimpulan-mana-mengikuti-bukti-dalam': 'Kesimpulan mana yang mengikuti bukti di dalam teks?',
    // app.js:6274 — makeReadingQuestion
    'reading.kesimpulan-mana-paling-kuat-didukung': 'Kesimpulan mana yang paling kuat didukung oleh bacaan?',
    // app.js:6274 — makeReadingQuestion
    'reading.klaim-mana-didukung-teks-bukan': 'Klaim mana yang didukung teks, bukan hanya dugaan?',
    // app.js:6274 — makeReadingQuestion
    'reading.makna-mana-cocok-dengan-pemakaian': 'Makna mana yang cocok dengan pemakaian ungkapan itu?',
    // app.js:6274 — makeReadingQuestion
    'reading.mana-kegiatan-tersebut-berlangsung': 'Di mana kegiatan tersebut berlangsung?',
    // app.js:6274 — makeReadingQuestion
    'reading.mengapa-tokoh-dalam-bacaan-mengambil': 'Mengapa tokoh di dalam bacaan mengambil pilihan itu?',
    // app.js:6229 — reading
    'reading.mulai-set': 'Mulai set ini',
    // app.js:6274 — makeReadingQuestion
    'reading.nada-mana-paling-cocok-dengan': 'Nada mana yang paling cocok dengan bacaan ini?',
    // app.js:6274 — makeReadingQuestion
    'reading.perbandingan-apa-dibuat-dalam-bacaan': 'Perbandingan apa yang dibuat di dalam bacaan?',
    // app.js:6274 — makeReadingQuestion
    'reading.perbedaan-mana-benar-benar-didukung': 'Perbedaan mana yang benar-benar didukung oleh teks?',
    // app.js:6274 — makeReadingQuestion
    'reading.peristiwa-atau-langkah-mana-terjadi': 'Peristiwa atau langkah mana yang terjadi lebih dulu?',
    // app.js:6274 — makeReadingQuestion
    'reading.pernyataan-mana-benar-menurut-bacaan': 'Pernyataan mana yang benar menurut bacaan?',
    // app.js:6274 — makeReadingQuestion
    'reading.pernyataan-mana-disebutkan-dengan-jelas': 'Pernyataan mana yang disebutkan dengan jelas di dalam teks?',
    // app.js:6285 — makeReadingQuestion
    'reading.pernyataan-right-wrong-or-tidak': 'pernyataan ini benar, salah, atau tidak disebutkan? “{trim}”',
    // app.js:6291 — makeReadingQuestion
    'reading.pertanyaan-aslinya': '{stem} Pertanyaan aslinya: “{originalText}”',
    // app.js:6310 — makeReadingQuestion
    'reading.pilihan-lain-tidak-punya-dukungan': 'Pilihan lain tidak punya dukungan yang cukup, terlalu luas, atau hanya mengulang kata dari pertanyaan tanpa benar-benar menjawabnya.',
    // app.js:6274 — makeReadingQuestion
    'reading.pilihan-mana-menyampaikan-ulang-gagasan': 'Pilihan mana yang menyampaikan ulang gagasan utama tanpa mengubah maknanya?',
    // app.js:6229 — reading
    'reading.practice-berformat-ujian': 'Latihan berformat ujian',
    // app.js:6274 — makeReadingQuestion
    'reading.proses-apa-dijelaskan-dalam-bacaan': 'Proses apa yang dijelaskan di dalam bacaan?',
    // app.js:6230 — openReadingLevel
    'reading.reading-belum-tersedia': 'Reading {active} belum tersedia.',
    // app.js:6230 — openReadingLevel
    'reading.reading-dikunci-level': 'Reading dikunci ke level {active}.',
    // app.js:6232 — startReadingAdaptive
    'reading.reading-terbuka-setelah-tes-awal': 'Reading terbuka setelah tes awal selesai.',
    // app.js:6229 — reading
    'reading.ruang-reading': 'Ruang Reading',
    // app.js:6341 — startReadingExam
    'reading.set-disusun-untuk-level': 'Set ini disusun untuk level {level}.',
    // app.js:6340 — startReadingExam
    'reading.set-practice-pending-tersedia': 'Set latihan ini belum tersedia.',
    // app.js:6229 — reading
    'reading.set-untuk': '{length} set untuk {level}',
    // app.js:6274 — makeReadingQuestion
    'reading.siapa-terlibat-langsung-dalam-peristiwa': 'Siapa yang terlibat langsung dalam peristiwa itu?',
    // app.js:6274 — makeReadingQuestion
    'reading.sikap-apa-terasa-cara-penulis': 'Sikap apa yang terasa dari cara penulis menyampaikan gagasan?',
    // app.js:6308 — makeReadingQuestion
    'reading.teks-tidak-menyebut-hal-kalimat': 'Teks tidak menyebut hal ini. Kalimat terdekat cuma membahas: “{evidence}” — itu bukan bukti untuk klaim tadi.',
    // app.js:6229 — reading
    'reading.terbuka-setelah-tes-awal-selesai': 'Terbuka setelah tes awal selesai',
    // app.js:6274 — makeReadingQuestion
    'reading.tindakan-apa-disebutkan-dengan-jelas': 'Tindakan apa yang disebutkan dengan jelas?',
    // app.js:6337 — readingExamTypeLabel
    'reading.vocab-dalam-konteks': 'Kosakata dalam konteks',
    // app.js:7498 — reminderSettingHint
    'settings.aktif-goal-daily-jadwal-pengulangan': 'Aktif — target harian dan jadwal pengulangan akan diingatkan',
    // app.js:7548 — audioDiagnosticsText
    'settings.aktif-kalau-tetap-sunyi-periksa': 'Aktif. Kalau tetap sunyi, periksa saklar senyap di sisi iPhone dan volume dering/media.',
    // app.js:7423 — openSettings
    'settings.akun-puter': 'Akun Puter',
    // app.js:7429 — openSettings
    'settings.all-can-diatur-dikelompokkan-each': 'Semua yang bisa diatur, dikelompokkan per topik. Ketuk kelompoknya untuk membuka.',
    // app.js:7455 — confirmClearAppCache
    'settings.aplikasi-akan-memuat-ulang-sebentar': 'Aplikasi akan memuat ulang sebentar setelah cache dibersihkan. Progres belajar, level, dan pengaturanmu aman — nggak ada yang terhapus.',
    // app.js:7549 — audioDiagnosticsText
    'settings.belum-dibuat': 'belum dibuat',
    // app.js:7427 — openSettings
    'settings.bersihkan-cache-amp-muat-ulang': 'Bersihkan cache &amp; muat ulang',
    // app.js:7495 — reminderSettingHint
    'settings.browser-belum-mendukung-notifikasi-web': 'Browser ini belum mendukung notifikasi web',
    // app.js:7507 — toggleStudyReminders
    'settings.browser-belum-mendukung-notifikasi-web-2': 'Browser ini belum mendukung notifikasi web.',
    // app.js:7468 — clearAppCache
    'settings.browser-tidak-menyediakan-penyimpanan-cache': 'Browser ini tidak menyediakan penyimpanan cache',
    // app.js:7424 — openSettings
    'settings.bunyi-naik-when-right-bunyi': 'Bunyi naik saat benar dan bunyi lembut saat perlu mencoba lagi',
    // app.js:7527 — saveSettings
    'settings.creator-hub-aktif-mengirim-laporan': 'Creator Hub aktif. Mengirim laporan awal.',
    // app.js:7487 — clearAppCache
    'settings.data-lucide-refresh-ccw-ya': '<i data-lucide="refresh-ccw"></i> Ya, bersihkan',
    // app.js:7529 — saveSettings
    'settings.gunakan-lang-indonesia-jernih-terasa': 'Gunakan Bahasa Indonesia yang jernih dan terasa seperti mentor sedang menjelaskan langsung kepada siswa. Pakai kalimat pendek. Hindari gaya buku teks, definisi panjang, dan istilah grammar yang tidak dijelaskan. Jika perlu menyebut istilah Inggris, langsung terangkan artinya dengan kata sederhana. Beri satu contoh yang dekat dengan kehidupan sehari-hari. Jangan memakai Markdown, judul formal, atau daftar berpoin.',
    // app.js:7521 — saveSettings
    'settings.gunakan-url-https-dengan-domain': 'Gunakan URL HTTPS dengan domain .puter.work',
    // app.js:7428 — openSettings
    'settings.https-nama-worker-puter-work': 'https://nama-worker.puter.work',
    // app.js:7550 — audioDiagnosticsText
    'settings.izin-audio-belum-terbuka-status': 'Izin audio belum terbuka (status: suspended). Ketuk sekali lagi di layar ini.',
    // app.js:7510 — toggleStudyReminders
    'settings.izin-notifikasi-belum-diberikan-fiezel': 'Izin notifikasi belum diberikan. FIEZEL tetap bisa dipakai.',
    // app.js:7496 — reminderSettingHint
    'settings.izin-notifikasi-ditolak-browser-ubah': 'Izin notifikasi ditolak di browser — ubah lewat ikon gembok, lalu nyalakan di sini',
    // app.js:7428 — openSettings
    'settings.kirim-masukan': 'Kirim masukan',
    // app.js:7434 — openSettings
    'settings.lanjutan': 'Lanjutan',
    // app.js:7428 — openSettings
    'settings.lihat-data': 'Lihat data',
    // app.js:7428 — openSettings
    'settings.masukan-untuk-pengembang': 'Masukan untuk pengembang',
    // app.js:7428 — openSettings
    'settings.materi-pending-ada-or-apa': 'Materi yang belum ada atau apa pun yang mengganggu. Terkirim tanpa data belajarmu.',
    // app.js:7498 — reminderSettingHint
    'settings.mati-izin-sudah-ada-pengingatnya': 'Mati — izin sudah ada, pengingatnya sedang dimatikan',
    // app.js:7497 — reminderSettingHint
    'settings.mati-nyalakan-for-diingatkan-when': 'Mati — nyalakan untuk diingatkan saat target harian atau jadwal pengulangan menunggu',
    // app.js:7466 — clearAppCache
    'settings.membersihkan': 'Membersihkan…',
    // app.js:7427 — openSettings
    'settings.menghapus-berkas-aplikasi-lama-menumpuk': 'Menghapus berkas aplikasi lama yang menumpuk lalu memuat ulang — progres belajarmu nggak ikut terhapus.',
    // app.js:7424 — openSettings
    'settings.menjalankan-ulang-tur-menu-awal': 'Menjalankan ulang tur menu dari awal. Tur fitur (Audiobook dan Listening) juga bakal muncul lagi pas kamu masuk fiturnya.',
    // app.js:7549 — audioDiagnosticsText
    'settings.menunggu-sentuhan-pertama-ios-baru': 'Menunggu sentuhan pertama — iOS baru mengizinkan bunyi setelah kamu menyentuh layar.',
    // app.js:7545 — audioDiagnosticsText
    'settings.modul-bunyi-belum-dimuat': 'Modul bunyi belum dimuat.',
    // app.js:7526 — saveSettings
    'settings.nama-dibiarkan-seperti-prior': 'Nama dibiarkan seperti sebelumnya.',
    // app.js:7423 — openSettings
    'settings.nama-you': 'Nama kamu',
    // app.js:7428 — openSettings
    'settings.otomatis-setelah-sesi-selesai-hanya': 'Otomatis setelah sesi selesai. Hanya data agregat.',
    // app.js:7428 — openSettings
    'settings.pasang-creator-hub-satu-klik': 'Pasang Creator Hub satu klik',
    // app.js:7480 — clearAppCache
    'settings.pembaruan-service-worker-pending-can': ' Pembaruan service worker belum bisa diperiksa sekarang.',
    // app.js:7424 — openSettings
    'settings.pengingat-study': 'Pengingat belajar',
    // app.js:7512 — toggleStudyReminders
    'settings.pengingat-study-aktif': 'Pengingat belajar aktif.',
    // app.js:7505 — toggleStudyReminders
    'settings.pengingat-study-dimatikan': 'Pengingat belajar dimatikan.',
    // app.js:7546 — audioDiagnosticsText
    'settings.peramban-tidak-mendukung-web-audio': 'Peramban ini tidak mendukung Web Audio, jadi SFX tidak bisa berbunyi.',
    // app.js:7527 — saveSettings
    'settings.prefs-pengalaman-tersimpan': 'Pengaturan pengalaman tersimpan',
    // app.js:7430 — openSettings
    'settings.profil-amp-level': 'Profil &amp; Level',
    // app.js:8041 — resetProgress
    'settings.progres-akun-berhasil-direset': 'Progres akun ini berhasil direset',
    // app.js:7424 — openSettings
    'settings.redo-kenalan-cepat': 'Ulangi kenalan cepat',
    // app.js:8034 — resetProgress
    'settings.reset-progres': 'Reset progres?',
    // app.js:7547 — audioDiagnosticsText
    'settings.sakelar-suara-answer-atas-now': 'Sakelar "Suara jawaban" di atas sedang mati — nyalakan untuk mendengar SFX.',
    // app.js:7416 — gemsSettingsRowMarkup
    'settings.saldo-you': 'Saldo kamu: {balance}',
    // app.js:7428 — openSettings
    'settings.saya-menyetujui-pengiriman-ringkasan-study': 'Saya, {nama}, menyetujui pengiriman ringkasan belajar agregat ke creator dan dapat menonaktifkannya kapan saja.',
    // app.js:8034 — resetProgress
    'settings.semua-level-penguasaan-materi-riwayat': 'Semua level, penguasaan materi, dan riwayat latihan akan dihapus permanen untuk akun ini.',
    // app.js:7479 — clearAppCache
    'settings.service-worker-belum-terdaftar-perangkat': ' Service worker belum terdaftar di perangkat ini, jadi hanya cache yang dibersihkan.',
    // app.js:7435 — openSettings
    'settings.simpan-prefs': 'Simpan pengaturan',
    // app.js:7424 — openSettings
    'settings.status-bunyi-perangkat': 'Status bunyi di perangkat ini',
    // app.js:7431 — openSettings
    'settings.study': 'Belajar',
    // app.js:7424 — openSettings
    'settings.suara-answer': 'Suara jawaban',
    // app.js:7424 — openSettings
    'settings.transisi-halaman-kartu-popup-feedback': 'Transisi halaman, kartu, popup, dan feedback jawaban',
    // app.js:7455 — confirmClearAppCache
    'settings.you-now-offline-sekarang-tampilan': 'Kamu sedang offline sekarang. Tampilan baru bisa diunduh ulang setelah perangkat tersambung internet, jadi sebaiknya tunggu sampai online.',
    // app.js:7481 — clearAppCache
    'settings.you-now-offline-tampilan-new': ' Kamu sedang offline: tampilan baru akan lengkap setelah tersambung internet.'
  });
}());
