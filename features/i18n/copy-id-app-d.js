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
    'ui.gagal-memuat-fiezel-jalankan-melalui': 'Gagal memuat FIEZEL: {message}. Jalankan melalui server lokal/GitHub Pages, bukan file://.'
  });
}());
