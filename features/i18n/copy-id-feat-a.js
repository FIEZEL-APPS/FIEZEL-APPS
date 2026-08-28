/**
 * FIEZEL · features/i18n/copy-id-feat-a.js — COPY-MAP INDONESIA, domain features A–M
 * (splash, daily-target, install-health, academic-readiness, diagnostics, brain A–M).
 * W2-FEAT-A, dasar: impl/plans/W1-FEAT-A-plan.json.
 *
 * ATURAN (penjelasan penuh: copy-id-core.js):
 * 1. NILAI byte-identik dengan naskah hari ini — kalimat PINDAH ke sini, tidak BERUBAH
 *    (gerbang id-golden-snapshot-test.js membekukan himpunan literal, AI-02 F01).
 * 2. Kunci netral/Inggris supaya tidak terhitung literal Indonesia baru oleh lexer gerbang.
 * 3. Interpolasi: potongan sumber direkat dengan placeholder BERNAMA '{nama}';
 *    pemanggil memakai t('kunci', {nama: x}) — potongan aslinya tetap byte-identik.
 * 4. Kunci brain-*.∗ TIDAK dibaca modul brain (brain tetap murni, AI-08 F01):
 *    app/presenter merakit tabel naskah th dari kunci-kunci ini lalu MENITIPKANNYA
 *    lewat parameter injeksi opsional (explain(x, naskah), summarize(state, naskah), dst.).
 * 5. Dimuat lewat <script defer> SETELAH fiezel-i18n.js dan SEBELUM modul features
 *    (permintaan pemasangan: impl/handoff/W2-FEAT-A.md — index.html + precache sw.js).
 */
(function () {
  'use strict';
  var g = (typeof self !== 'undefined') ? self
    : (typeof globalThis !== 'undefined') ? globalThis : this;
  var I18N = g && g.FiezelI18n;
  if (!I18N && typeof require === 'function') {
    // Node (tes print-only me-require modul features langsung): muat runtime sendiri.
    try { I18N = require('./fiezel-i18n.js'); } catch (loadError) { I18N = null; }
  }
  if (!I18N || typeof I18N.registerCopy !== 'function') return;

  I18N.registerCopy('id', {
    // ---------- splash.* ----------
    'splash.welcome-aria': 'Selamat datang di FIEZEL',

    // ---------- daily.* ----------
    'daily.lock-mark': '<div class="daily-lock-mark">TARGET HARIAN FIEZEL · WAJIB</div>',
    'daily.lock-title': '<h2>Target hari ini belum selesai</h2>',
    'daily.lock-body': '<p>FIEZEL menilai kamu perlu <b>' + '{total}' + ' soal</b> hari ini. Sisa <b>' + '{remaining}' + '</b> lagi. Aplikasi terbuka penuh setelah target beres.</p>',
    'daily.lock-count': '<p class="daily-lock-count">' + '{done}' + ' / ' + '{total}' + ' soal</p>',
    'daily.lock-start-btn': '<button type="button" class="primary wide" id="dailyLockStart">Kerjakan sekarang</button>',
    'daily.lock-note': '<p class="daily-lock-note">Keluar dari aplikasi tidak menghapus target. Saat kembali, target ini masih menunggu.</p>',
    'daily.lock-aria': 'Target harian FIEZEL',
    'daily.done-toast': 'Target harian selesai. Aplikasi terbuka penuh.',
    'daily.finish-first-toast': 'Selesaikan target harian dulu.',

    // ---------- health.* ----------
    'health.build-unreadable-title': 'Penanda build tidak terbaca',
    'health.build-unreadable-detail': 'Salah satu dari Diagnostics build atau revisi service worker tidak mengikuti format m025-N.',
    'health.build-unreadable-remedy': 'Buka Diagnostics dan salin ringkasannya saat melapor.',
    'health.build-current-title': 'Build aktif dan shell cocok',
    'health.build-current-detail': 'Aplikasi berjalan pada m025-' + '{build}' + ', dan service worker memegang shell yang sama.',
    'health.shell-stale-title': 'Shell lama masih dipakai',
    'health.shell-stale-detail': 'Aplikasi memuat m025-' + '{page}' + ', tetapi service worker masih memegang shell m025-' + '{shell}' + '.',
    'health.shell-stale-remedy': 'Tutup FIEZEL sepenuhnya lalu buka lagi. Kalau masih sama, jalankan pembaruan dari Diagnostics.',
    'health.shell-ahead-title': 'Shell lebih baru dari halaman',
    'health.shell-ahead-detail': 'Service worker memegang m025-' + '{shell}' + ' sementara halaman ini masih m025-' + '{page}' + '.',
    'health.shell-ahead-remedy': 'Muat ulang halaman untuk memakai versi terbaru.',
    'health.sw-absent-title': 'Service worker tidak terdaftar',
    'health.sw-absent-detail': 'Mode offline dan pembaruan otomatis tidak aktif tanpa service worker.',
    'health.sw-absent-remedy': 'Pasang FIEZEL ke layar utama, lalu buka dari sana.',
    'health.sw-not-active-title': 'Service worker belum aktif',
    'health.sw-not-active-detail': 'Statusnya sekarang "' + '{state}' + '".',
    'health.sw-not-active-remedy': 'Tunggu beberapa detik lalu muat ulang.',
    'health.sw-uncontrolled-title': 'Halaman belum dikendalikan service worker',
    'health.sw-uncontrolled-detail': 'Ini normal pada pemuatan pertama setelah pemasangan.',
    'health.sw-uncontrolled-remedy': 'Muat ulang sekali untuk mengaktifkan mode offline.',
    'health.sw-active-title': 'Service worker aktif',
    'health.sw-active-detail': 'Mode offline dan pembaruan berjalan.',
    'health.update-waiting-title': 'Pembaruan siap tetapi tertahan',
    'health.update-waiting-detail': 'Versi baru sudah diunduh dan menunggu semua tab FIEZEL ditutup.',
    'health.update-waiting-remedy': 'Tutup FIEZEL sepenuhnya, lalu buka lagi.',
    'health.storage-free-label': '{mb}' + ' MB tersisa',
    'health.storage-critical-title': 'Ruang penyimpanan hampir habis',
    'health.storage-critical-remedy': 'Hapus aset suara dari Diagnostics atau kosongkan ruang di perangkat sebelum melanjutkan.',
    'health.storage-low-title': 'Ruang penyimpanan menipis',
    'health.storage-low-remedy': 'Aset suara berukuran besar bisa gagal tersimpan. Kosongkan sebagian ruang.',
    'health.storage-ok-title': 'Ruang penyimpanan cukup',
    'health.storage-unknown-title': 'Ruang penyimpanan tidak terbaca',
    'health.storage-unknown-detail': 'Perangkat ini tidak melaporkan kuota penyimpanan.',
    'health.shell-cache-buildup-title': 'Cache shell lama menumpuk',
    'health.shell-cache-buildup-detail': '{count}' + ' shell tersimpan sekaligus.',
    'health.shell-cache-buildup-remedy': 'Jalankan pembaruan dari Diagnostics supaya shell lama dibersihkan.',
    'health.shell-cache-ok-title': 'Cache shell rapi',
    'health.shell-cache-ok-detail': '{count}' + ' shell tersimpan.',
    'health.notifications-ok-title': 'Notifikasi aktif',
    'health.notifications-ok-detail': 'Pengingat belajar dapat berjalan.',
    'health.notifications-denied-title': 'Notifikasi ditolak',
    'health.notifications-denied-detail': 'FIEZEL mewajibkan notifikasi, dan izinnya sedang ditolak.',
    'health.notifications-denied-remedy': 'Aktifkan notifikasi untuk FIEZEL di pengaturan perangkat.',
    'health.notifications-pending-title': 'Notifikasi belum diizinkan',
    'health.notifications-pending-detail': 'Izin notifikasi masih "' + '{permission}' + '".',
    'health.notifications-pending-remedy': 'Izinkan notifikasi saat diminta.',

    // ---------- academic.* ----------
    'academic.task-formal-email-label': 'Email formal ke kampus atau penyelenggara beasiswa',
    'academic.task-formal-email-p1': 'struktur pembuka dan penutup',
    'academic.task-formal-email-p2': 'permintaan yang spesifik',
    'academic.task-formal-email-p3': 'nada sopan tanpa berlebihan',
    'academic.task-self-intro-label': 'Perkenalan diri singkat',
    'academic.task-self-intro-p1': 'latar belakang',
    'academic.task-self-intro-p2': 'alasan memilih bidang',
    'academic.task-self-intro-p3': 'rencana setelah studi',
    'academic.task-interview-label': 'Latihan wawancara',
    'academic.task-interview-p1': 'menjawab dengan contoh konkret',
    'academic.task-interview-p2': 'menjelaskan kelemahan tanpa merendahkan diri',
    'academic.task-interview-p3': 'bertanya balik',
    'academic.req-reading-label': 'Reading teks panjang dengan akurasi stabil',
    'academic.req-reading-basis': '{attempts}' + ' bacaan dijawab, akurasi ' + '{accuracy}' + '%',
    'academic.req-reading-thin': 'Belum cukup bukti reading (minimal 8 jawaban).',
    'academic.req-grammar-label': 'Akurasi grammar untuk tulisan formal',
    'academic.req-grammar-basis': '{attempts}' + ' soal grammar, akurasi ' + '{accuracy}' + '%',
    'academic.req-grammar-thin': 'Belum cukup bukti grammar (minimal 10 jawaban).',
    'academic.req-vocab-label': 'Kosakata akademik dasar',
    'academic.req-vocab-basis': '{mastered}' + ' dari ' + '{measured}' + ' materi kosakata dikuasai',
    'academic.req-vocab-thin': 'Belum cukup materi kosakata yang terukur (minimal 10).',
    'academic.spoken-basis': '{attempts}' + ' latihan tercatat, skor latihan ' + '{score}' + '%',
    'academic.spoken-thin': 'Belum cukup latihan tercatat (minimal ' + '{min}' + ').',
    'academic.req-listening-label': 'Listening untuk mencatat poin utama',
    'academic.req-speaking-label': 'Speaking response situasi akademik',
    'academic.no-prediction-note': 'FIEZEL menjelaskan prasyarat kemampuan dan bukti yang sudah ada. FIEZEL tidak memprediksi skor IELTS/TOEFL dan tidak menyatakan kamu siap atau belum siap ujian.',
    'academic.vocab-path-ready': 'Jalur kosakata bertema IT dan kehidupan kampus siap dipakai.',
    'academic.vocab-path-pending': 'Bank kosakata belum punya materi bertema IT atau kehidupan kampus. Jalur ini menunggu konten, dan FIEZEL tidak akan melabeli ulang kata umum supaya terlihat bertema.',

    // ---------- diag.* ----------
    'diag.vocab-unavailable': 'Data vocabulary tidak dapat dibaca.',
    'diag.vocab-empty': 'Bank vocabulary kosong.',
    'diag.vocab-below-target': 'Jumlah kata di bawah target ' + '{min}' + '.',
    'diag.vocab-empty-meaning': 'Entri tanpa arti: ' + '{pct}' + '%.',
    'diag.vocab-empty-phonetic': 'Entri tanpa fonetik: ' + '{pct}' + '%.',
    'diag.vocab-invalid-level': 'Entri dengan level di luar A1-C2.',
    'diag.vocab-duplicate': 'Kata duplikat terdeteksi.',
    'diag.reading-unavailable': 'Reading bank tidak dapat dibaca.',
    'diag.reading-empty': 'Reading bank kosong.',
    'diag.reading-below-target': 'Jumlah passage di bawah target ' + '{min}' + '.',
    'diag.reading-duplicate-pct': 'Passage duplikat: ' + '{pct}' + '%.',
    'diag.reading-duplicate-some': 'Beberapa passage duplikat.',
    'diag.reading-no-questions': 'Passage tanpa soal terkait.',
    'diag.grammar-unavailable': 'Grammar templates tidak dapat dibaca.',
    'diag.grammar-empty': 'Tidak ada template grammar.',
    'diag.grammar-below-target': 'Template di bawah target ' + '{min}' + '.',
    'diag.grammar-malformed-item': 'Template tanpa stem/opsi/jawaban valid.',
    'diag.grammar-thin-skill': 'Skill dengan item di bawah minimum: ' + '{list}',
    'diag.leveltest-unavailable': 'Jumlah soal level test tidak terbaca.',
    'diag.leveltest-count-mismatch': 'Soal level test ' + '{count}' + ', target ' + '{target}' + '.',
    'diag.bank-unavailable': 'Bank tidak dapat dibaca.',
    'diag.bank-empty': 'Bank kosong.',
    'diag.bank-below-target': 'Item di bawah target ' + '{min}' + '.',
    'diag.bank-missing-id': 'Item tanpa id.',
    'diag.bank-duplicate-id': 'Id duplikat.',
    'diag.voice-runtime-missing': 'Runtime neural voice tidak tersedia.',
    'diag.voice-not-downloaded': 'Aset suara belum diunduh.',
    'diag.voice-circuit-open': 'Circuit neural terkunci: ' + '{reason}',
    'diag.voice-asset-count': 'Jumlah aset ' + '{count}' + ', target ' + '{target}' + '.',
    'diag.voice-last-fallback': 'Fallback terakhir: ' + '{reason}',
    'diag.classroom-unavailable': 'Lesson pack Classroom tidak dapat dibaca.',
    'diag.classroom-empty': 'Tidak ada lesson.',
    'diag.classroom-missing-subtitle': 'Segmen tanpa teks Inggris/Indonesia.',
    'diag.classroom-bad-answer': 'Soal dengan answerIndex tidak valid.',
    'diag.classroom-duplicate-id': 'Lesson dengan id ganda.',
    'diag.classroom-invalid-level': 'Lesson dengan level di luar A1-C2.',
    'diag.classroom-thin-lesson': 'Lesson dengan segmen terlalu sedikit.',
    'diag.classroom-no-questions': 'Lesson tanpa soal latihan.',
    'diag.classroom-category-empty': 'Subject tanpa materi: ' + '{list}',
    'diag.classroom-category-thin': 'Subject dengan materi di bawah minimum: ' + '{list}',
    'diag.classroom-foundation-incomplete': 'Materi ' + '{level}' + ' baru ' + '{count}' + ', target ' + '{target}' + '.',
    'diag.prosody-unavailable': 'Modul prosody tidak dimuat; suara akan datar.',
    'diag.prosody-api-incomplete': 'Fungsi prosody hilang: ' + '{list}',
    'diag.prosody-id-not-shaped': 'Kalimat Indonesia tidak mendapat jeda klausa; suara akan terdengar datar.',
    'diag.prosody-contour-flat': 'Intonasi tidak bergerak antar frasa (spread ' + '{spread}' + ').',
    'diag.prosody-no-final-fall': 'Frasa penutup tidak turun; kalimat terdengar menggantung.',
    'diag.runtime-unavailable': 'Probe runtime tidak tersedia.',
    'diag.runtime-module-missing': 'Modul tidak termuat: ' + '{list}',
    'diag.runtime-browser-tts': 'Runtime memakai browser SpeechSynthesis; kontraknya neural-only.',
    'diag.runtime-frozen-proxy': 'Runtime beku dibungkus Proxy; setiap panggilan speak akan melempar TypeError.',
    'diag.runtime-view-missing': 'Destinasi navigasi hilang: ' + '{list}',
    'diag.storage-unavailable': 'Probe storage tidak tersedia.',
    'diag.storage-blocked': 'localStorage tidak dapat diakses.',
    'diag.storage-corrupt-json': 'State tersimpan tidak dapat dibaca: ' + '{list}',
    'diag.storage-near-quota': 'Pemakaian storage ' + '{used}' + '%, batas ' + '{max}' + '%.',
    'diag.ui-unavailable': 'Probe UI tidak tersedia.',
    'diag.ui-not-mounted': 'Container #app tidak ditemukan.',
    'diag.ui-empty-render': 'Layar aktif kosong: ' + '{view}' + '.',
    'diag.ui-destination-count': 'Destinasi utama ' + '{count}' + ', target ' + '{target}' + '.',
    'diag.ui-slow-render': 'Render terakhir ' + '{ms}' + 'ms, batas ' + '{max}' + 'ms.',
    'diag.chat-unavailable': 'Modul chat tidak terdeteksi.',
    'diag.chat-requires-key': 'Chat menuntut API key; kontraknya harus full-lokal.',
    'diag.chat-init-threw': 'Inisialisasi chat melempar error: ' + '{error}',
    'diag.adaptive-unavailable': 'State adaptive tidak terbaca.',
    'diag.adaptive-invalid-level': 'Level aktif di luar jangkauan A1-C2: ' + '{level}',
    'diag.adaptive-stuck': 'State machine adaptive terdeteksi macet.',
    'diag.no-selftest': 'Modul belum punya self-test.',
    'diag.selftest-threw': 'Self-test gagal dijalankan: ' + '{error}',
    'diag.data-load-failed': 'Gagal memuat ' + '{path}' + ' (' + '{error}' + ').',
    'diag.leveltest-not-exposed': 'Jumlah soal level test belum diekspos ke diagnostic.',
    'diag.chat-not-loaded': 'Modul chat belum dimuat.',
    'diag.cache-api-missing': 'CacheStorage tidak tersedia.',
    'diag.sw-uncontrolled-page': 'Halaman belum dikontrol service worker.',
    'diag.notification-not-granted': 'Pengingat dinyalakan murid tetapi izin browser belum granted: ' + '{permission}',

    // ---------- brain-listening.* ----------
    'brain-listening.brain3_listening_default': 'Belum ada bukti listening yang bisa dibaca, jadi kesulitan diset ke titik tengah yang aman: kecepatan natural, 2 replay, klip sedang.',
    'brain-listening.brain3_listening_baseline_low': 'Mastery masih rendah, jadi titik awal diambil dari kombinasi termudah: pelan, replay penuh, klip pendek.',
    'brain-listening.brain3_listening_baseline_mid': 'Mastery menengah, jadi titik awal di tengah tangga kesulitan.',
    'brain-listening.brain3_listening_baseline_high': 'Mastery sudah tinggi, jadi titik awal langsung menantang: cepat, replay terbatas, klip panjang.',
    'brain-listening.brain3_listening_insufficient_evidence': 'Bukti pada jendela terakhir terlalu tipis untuk dipercaya, jadi kesulitan ditahan dulu — kebijakan yang berayun karena satu jawaban lebih berbahaya daripada yang diam.',
    'brain-listening.brain3_listening_step_up_rate': 'Akurasi jauh di atas target, jadi kecepatan putar dinaikkan satu pita — hanya kecepatan, supaya kalau hasil berubah kita tahu tombol mana penyebabnya.',
    'brain-listening.brain3_listening_step_up_clip': 'Akurasi jauh di atas target dan kecepatan sudah maksimal, jadi giliran panjang klip yang dinaikkan satu tingkat.',
    'brain-listening.brain3_listening_step_up_replay': 'Akurasi jauh di atas target pada kecepatan dan klip maksimal, jadi jaring pengaman terakhir dikurangi: kuota replay turun satu.',
    'brain-listening.brain3_listening_step_down_replay': 'Akurasi di bawah target, jadi jaring pengaman dikembalikan dulu: kuota replay naik satu — tombol termurah, materi tidak berubah.',
    'brain-listening.brain3_listening_step_down_clip': 'Akurasi di bawah target dan replay sudah penuh, jadi klip dipendekkan satu tingkat.',
    'brain-listening.brain3_listening_step_down_rate': 'Akurasi di bawah target meski replay penuh dan klip pendek, jadi kecepatan diperlambat satu pita.',
    'brain-listening.brain3_listening_hold_in_band': 'Akurasi berada di dalam pita target (±0.1), jadi kesulitan dipertahankan — di sinilah belajar paling efisien.',
    'brain-listening.brain3_listening_hidden_load_replays': 'Akurasi memang tinggi, tetapi rata-rata replay >= 2 menandakan murid bekerja jauh lebih keras daripada yang terlihat — kenaikan ditahan sampai bebannya turun.',
    'brain-listening.brain3_listening_ceiling': 'Semua dimensi sudah di tingkat tersulit; tidak ada yang bisa dinaikkan lagi.',
    'brain-listening.brain3_listening_floor': 'Semua dimensi sudah di tingkat termudah; tidak ada yang bisa diturunkan lagi.',

    // ---------- brain-speaking.* ----------
    'brain-speaking.brain3_speaking_default': 'Belum ada bukti speaking yang bisa dibaca, jadi kesulitan diset ke titik tengah yang aman: prompt frasa dengan cue.',
    'brain-speaking.brain3_speaking_baseline_low': 'Mastery masih rendah, jadi titik awal diambil dari kombinasi termudah: satu kata, dengan model diucapkan dulu.',
    'brain-speaking.brain3_speaking_baseline_mid': 'Mastery menengah, jadi titik awal di tengah tangga: frasa dengan cue.',
    'brain-speaking.brain3_speaking_baseline_high': 'Mastery sudah tinggi, jadi titik awal langsung menantang: kalimat penuh tanpa bantuan.',
    'brain-speaking.brain3_speaking_insufficient_evidence': 'Bukti pada jendela terakhir terlalu tipis untuk dipercaya, jadi kesulitan ditahan dulu — kebijakan yang berayun karena satu percobaan lebih berbahaya daripada yang diam.',
    'brain-speaking.brain3_speaking_step_up_scaffold': 'Coverage stabil di atas target, jadi bantuan dilepas satu anak tangga — materi tidak berubah, supaya kita tahu murid yang bekerja, bukan scaffold-nya.',
    'brain-speaking.brain3_speaking_step_up_complexity': 'Coverage stabil di atas target dan murid sudah bicara tanpa bantuan, jadi kompleksitas prompt naik satu tingkat.',
    'brain-speaking.brain3_speaking_step_down_scaffold': 'Coverage di bawah target, jadi bantuan dikembalikan dulu satu anak tangga — tombol termurah, materinya tidak berubah.',
    'brain-speaking.brain3_speaking_step_down_complexity': 'Coverage di bawah target meski model sudah diucapkan lebih dulu, jadi kompleksitas prompt diturunkan satu tingkat.',
    'brain-speaking.brain3_speaking_hold_in_band': 'Coverage berada di dalam pita target (±0.1), jadi kesulitan dipertahankan — di sinilah latihan paling efisien.',
    'brain-speaking.brain3_speaking_noisy_evidence': 'Sebagian besar bukti terakhir mencurigakan (coverage tinggi dengan latency mustahil pendek) — kemungkinan recognizer salah baca, jadi kesulitan ditahan, bukan dinaikkan di atas bukti palsu.',
    'brain-speaking.brain3_speaking_hidden_effort': 'Coverage memang tinggi, tetapi latency sangat panjang menandakan murid bekerja jauh lebih keras daripada yang terlihat — kenaikan ditahan sampai produksinya lancar.',
    'brain-speaking.brain3_speaking_ceiling': 'Kedua dimensi sudah di tingkat tersulit; tidak ada yang bisa dinaikkan lagi.',
    'brain-speaking.brain3_speaking_floor': 'Kedua dimensi sudah di tingkat termudah; tidak ada yang bisa diturunkan lagi.',
    'brain-speaking.brain3_speaking_target_weak': 'Target latihan diambil dari lesson terlemah yang prasyaratnya sudah sehat — melatih produksi pada pondasi yang belum berdiri hanya melatih rasa gagal.',
    'brain-speaking.brain3_speaking_target_prereq_blocked': 'Semua lesson lemah prasyaratnya belum sehat, jadi tidak ada target khusus — perkuat dulu prasyaratnya lewat mode lain sebelum memaksakan produksi lisan.',
    'brain-speaking.brain3_speaking_target_none': 'Tidak ada lesson lemah yang terdata, jadi latihan speaking bebas tanpa target skill khusus.',
    'brain-speaking.brain3_speaking_evidence_strong': 'Coverage tinggi dengan latency yang wajar secara manusiawi — bukti produksi yang bisa dipakai, tetap dengan diskon speaking.',
    'brain-speaking.brain3_speaking_evidence_weak': 'Coverage rendah atau latency sangat panjang — murid berjuang atau recognizer hanya menangkap sebagian; bobot buktinya kecil.',
    'brain-speaking.brain3_speaking_evidence_noise': 'Coverage tinggi tetapi latency mustahil pendek untuk produksi manusia — hampir pasti recognizer salah baca; bukti ini nyaris tidak dihitung.',
    'brain-speaking.brain3_speaking_evidence_replay_discount': 'Murid memutar contoh berulang kali sebelum bicara — benar setelah banyak contoh bukan bukti kemampuan yang sama dengan benar sekali dengar; kappa dipotong lagi.',

    // ---------- brain-step.* ----------
    'brain-step.step-prefix': 'Langkah ' + '{n}' + ': ',
    'brain-step.ask-identify': 'coba kenali dulu — ' + '{obj}' + ' — yang mana di kalimat ini?',
    'brain-step.ask-select': 'dari petunjuk tadi, ' + '{obj}' + ' mana yang paling cocok?',
    'brain-step.ask-apply': 'sekarang terapkan — ' + '{obj}' + ' — jadi bentuk apa?',
    'brain-step.ask-compare': 'timbang dulu — ' + '{obj}' + ' — mana yang lebih sesuai?',
    'brain-step.ask-eliminate': 'singkirkan yang tidak mungkin — ' + '{obj}' + ' — pilihan mana yang gugur?',
    'brain-step.ask-check': 'periksa lagi — ' + '{obj}' + ' — sudah benar?',
    'brain-step.final-combine': 'Sekarang gabungkan langkah-langkah tadi' + '{quoted}' + ' — apa jawabanmu?',
    'brain-step.final-quoted-stem': ' \u2014 j\u0061di j\u0061waban so\u0061lnya: "' + '{stem}' + '"',
    'brain-step.final-direct': 'Jawab soalnya: "' + '{stem}' + '" — apa jawabanmu?',
    'brain-step.final-fallback': '\u0041pa jaw\u0061banmu \u0075ntuk so\u0061l ini?',

    // ---------- brain-tutor.* ----------
    'brain-tutor.concept-fallback': 'materi ini',
    'brain-tutor.compare-direct': 'Bandingkan langsung: jawabanmu "' + '{chosen}' + '" vs bentuk benar "' + '{right}' + '"',
    'brain-tutor.worked-step1': 'Langkah 1 - pegang aturannya: ' + '{rule}' + '.',
    'brain-tutor.worked-step2': 'Langkah 2 - terapkan ke kalimatnya: "' + '{sentence}' + '".',
    'brain-tutor.worked-step3': 'Langkah 3 - jadi bentuk yang dipakai: "' + '{answer}' + '".',
    'brain-tutor.worked-fallback': 'Inti ' + '{concept}' + ': ikuti bentuk yang diminta konteksnya.',
    'brain-tutor.timing-guess': 'Tadi cepat sekali jawabnya. Coba baca ulang kalimatnya pelan-pelan dulu ya - separuh soal ini dimenangkan di bacaannya, bukan di pilihannya.',
    'brain-tutor.why-fails': 'Ini yang bikin pilihan tadi gagal - ' + '{why}' + '.',
    'brain-tutor.not-yet': 'Belum tepat, dan itu wajar di bagian ini.',
    'brain-tutor.probe-rotated': '{rotated}' + '. Coba pikirkan lagi dari situ.',
    'brain-tutor.probe-default': 'Sebelum lihat pilihannya lagi - petunjuk waktu di kalimat itu yang mana?',
    'brain-tutor.hint-rotated': 'Cara lain melihatnya: ' + '{rotated}' + '. Sekarang coba lagi.',
    'brain-tutor.hint-cue': 'Pegangan singkatnya: ' + '{cue}' + '. Sekarang coba lagi.',
    'brain-tutor.hint-default': 'Petunjuknya ada di kata yang menunjukkan kapan kejadiannya. Coba lagi.',
    'brain-tutor.worked-intro': ' Aku kerjakan satu yang mirip dulu ya, biar kelihatan langkahnya.',
    'brain-tutor.reveal-intro': ' Oke, aku buka sekarang.',
    'brain-tutor.move-celebrate': 'Nah, itu dia. Yang tadi bikin kamu keliru, barusan kamu lewati. Pertahankan cara mikirnya.',
    'brain-tutor.move-consolidate': 'Benar. Tapi tadi kamu perlu waktu lumayan, jadi kita mantapkan dulu di sini sebentar sebelum naik.',
    'brain-tutor.move-stretch': 'Beruntun dan cepat. Ini sudah di bawah kemampuanmu sekarang - aku naikkan sedikit.',
    'brain-tutor.move-breathe': 'Kita berhenti di sini dulu. Jawabanmu mulai melambat dan mulai meleset bareng, dan itu tanda capek, bukan tanda kamu tidak bisa. Lanjut nanti hasilnya jauh lebih nempel.',
    'brain-tutor.move-wrapup': 'Soalnya habis. Kita tutup sesi ini.',
    'brain-tutor.headline-resolved': 'Sesi ini kamu benar-benar melewati ' + '{count}' + ' hal yang tadinya bikin keliru.',
    'brain-tutor.headline-persistent': 'Ada ' + '{count}' + ' pola yang masih mengganjal - itu yang kita kejar sesi berikutnya.',
    'brain-tutor.headline-empty': 'Belum ada jawaban di sesi ini.',
    'brain-tutor.headline-clean': 'Sesi bersih, tanpa pola salah yang berulang.',

    // ---------- brain-olm.* ----------
    'brain-olm.insufficient': 'belum cukup data',
    'brain-olm.remeasuring': 'sedang diukur ulang',
    'brain-olm.from-bkt': 'dari model BKT',
    'brain-olm.rough-estimate': 'estimasi kasar',
    'brain-olm.dispute-label': 'menurutku ini salah',
    'brain-olm.concept-fallback': 'konsep ini',
    'brain-olm.miscon-pair': 'Pada ' + '{concept}' + ', jawaban berulang kali memakai bentuk \u00ab' + '{wrong}' + '\u00bb padahal bentuk baku \u00ab' + '{right}' + '\u00bb. Pola ini akan diuji ulang pada latihan berikutnya.',
    'brain-olm.miscon-wrong-only': 'Pada ' + '{concept}' + ', pola jawaban berulang kali mengarah ke \u00ab' + '{wrong}' + '\u00bb. Pola ini akan diuji ulang pada latihan berikutnya.',
    'brain-olm.miscon-generic': 'Pada ' + '{concept}' + ', ada pola jawaban yang berulang dan perlu diuji ulang.',
    'brain-olm.resolved': 'Pola keliru pada ' + '{concept}' + ' sudah tidak muncul lagi \u2014 jawaban terakhir konsisten memakai bentuk baku.',
    'brain-olm.calib-over': 'Kamu memprediksi benar ' + '{pred}' + '% tapi aktual ' + '{actual}' + '%. Sebelum menjawab, coba sebutkan dulu alasan jawabanmu \u2014 kalau alasannya belum bisa ' + 'diucapkan, turunkan taksiran keyakinannya.',
    'brain-olm.calib-under': 'Kamu memprediksi benar ' + '{pred}' + '% tapi aktual ' + '{actual}' + '%. Jawaban-jawabanmu lebih akurat daripada taksiranmu \u2014 saat polanya sudah dikenali, ' + 'berani naikkan taksiran keyakinannya.',
    'brain-olm.calib-neutral': 'Taksiran keyakinan (' + '{pred}' + '%) dan hasil aktual (' + '{actual}' + '%) sudah sejalan. Pertahankan kebiasaan menaksir sebelum menjawab \u2014 kebiasaan itu yang ' + 'membuat kalibrasinya tetap tajam.',

    // ---------- brain-srl.* ----------
    'brain-srl.focus-named': 'Perkuat ' + '{focus}' + ' — di situ jawabanmu paling sering meleset belakangan ini',
    'brain-srl.focus-generic': 'Perkuat bagian yang jawabannya paling sering meleset belakangan ini',
    'brain-srl.goal-ask': 'Mau ke mana sesi ini' + '{size}' + '?',
    'brain-srl.goal-size': ' (' + '{n}' + ' soal)',
    'brain-srl.option-review': 'Ulang materi yang mendekati jadwal lupa, supaya tidak perlu dipelajari dari nol lagi',
    'brain-srl.option-free': 'Bebas — campuran materi, kamu yang pegang kemudi',
    'brain-srl.predict-ask': 'Seberapa yakin jawabanmu akan benar?',
    'brain-srl.group-fallback': 'materi sesi ini',
    'brain-srl.calib-over': 'Kamu yakin ' + '{conf}' + ' di ' + '{name}' + ' tapi benar ' + '{acc}' + '. Taksiranmu lebih tinggi dari hasilnya — sebelum memilih jawaban, sebutkan dulu ' + 'aturannya dalam satu kalimat; kalau kalimat itu tidak keluar, turunkan taksiranmu.',
    'brain-srl.calib-under': 'Kamu menaksir ' + '{conf}' + ' di ' + '{name}' + ' padahal benar ' + '{acc}' + '. Jawabanmu lebih tepat dari taksiranmu — saat pola soalnya sudah pernah kamu ' + 'kerjakan dengan benar, berani pasang taksiran yang lebih tinggi.',
    'brain-srl.calib-good': 'Taksiranmu di ' + '{name}' + ' (' + '{conf}' + ') cocok dengan hasilnya (' + '{acc}' + '). Cara menaksir seperti ini layak dipertahankan — lanjutkan menaksir sebelum melihat kunci.',
    'brain-srl.reflect-no-data': 'Sesi ini tidak ada taksiran keyakinan yang bisa dibandingkan dengan hasil.',
    'brain-srl.faded-note': ' Tiga sesi berturut-turut taksiranmu akurat, jadi pertanyaan ' + 'keyakinan akan berhenti muncul selama ' + '{n}' + ' sesi ke depan.',

    // ---------- W2-REGEN: entri tunda gelombang regen baseline ----------
    // features/library/fiezel-library-ui.js:253
    'pustaka.berlaku-from-kalimat-upcoming': '. Berlaku dari kalimat berikutnya.',
    // features/library/fiezel-library-ui.js:525
    'pustaka.dongeng-dan-novel-pendek': '<p>Dongeng dan novel pendek dengan audiobook dan terjemahan sekali ketuk. Ketuk kalimat mana pun untuk melihat artinya.</p>',
    // features/library/fiezel-library-ui.js:827
    'pustaka.fiezel-pending-can-menjawab': 'Fiezel belum bisa menjawab pertanyaan itu sekarang.',
    // features/library/fiezel-library-ui.js:498
    'pustaka.finish-buku-this-done': 'Selesai. Buku ini sudah dibacakan sampai habis.',
    // features/library/fiezel-library-ui.js:668
    'pustaka.next-from-kalimat': 'Lanjut dari kalimat ',
    // features/library/fiezel-library-ui.js:857
    'pustaka.perpustakaan-pending-can-dimuat': '<section class="fade library-page"><div class="card"><b>Perpustakaan belum bisa dimuat.</b>',
    // features/library/fiezel-library-ui.js:483
    'pustaka.suara-tidak-bisa-dimuat': 'Suara tidak bisa dimuat. Periksa koneksi lalu tekan putar lagi.',
    // features/library/fiezel-library-ui.js:243
    'pustaka.tap-for-mengganti': ', ketuk untuk mengganti',
    // features/library/fiezel-library-ui.js:551
    'pustaka.tap-for-mengganti-data': ', ketuk untuk mengganti" data-rate="',
    // features/library/fiezel-library-ui.js:552
    'pustaka.tap-kalimat-for-arti': '<p class="library-status" id="libraryStatus">Ketuk kalimat untuk arti, atau putar audiobook.</p>',
    // features/library/fiezel-library-ui.js:705
    'pustaka.translate': '<span class="library-translation-mark">TERJEMAHAN</span>',
    // features/library/fiezel-library-ui.js:703
    'pustaka.translate-kalimat': 'Terjemahan kalimat'
  });

  // Ekspor untuk rantai require Node: modul features me-require berkas ini dan langsung
  // memakai I18N.t() — di browser jalur ini tidak tersentuh (module tidak ada).
  if (typeof module === 'object' && module.exports) module.exports = I18N;
}());
