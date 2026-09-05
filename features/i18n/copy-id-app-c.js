/**
 * FIEZEL · features/i18n/copy-id-app-c.js — COPY-MAP INDONESIA, segmen app.js baris 4001–6000
 *
 * MENGAPA: audit multilingual v2 (AI-02 F01, AI-14 F01/F03) — app.js tidak punya lapisan
 * string; berkas ini memindahkan naskah murid segmen C (masukan, nav, level/ujian, home,
 * ritual, journey, diagnostik, kesiapan, backup, health, akun/suara, classroom, skills,
 * writing, prasasti, adaptif, vocab, flashcards, ulangan) ke copy-map sesuai plan
 * W1-APPJS-C, supaya copy-th-app-c.js bisa 1:1. Nilai DISALIN BYTE-PER-BYTE dari app.js —
 * gerbang tests/id-golden-snapshot-test.js membekukan himpunan literal (PINDAH boleh, BERUBAH
 * tidak). Kunci ber-slug netral: lexer gerbang menghitung kunci berpenanda Indonesia
 * sebagai "tambahan liar" (laporan W1-INFRA). Placeholder BERNAMA {nama}, nama placeholder
 * juga wajib lolos lexer (mis. {items}, bukan {soal}).
 *
 * CATATAN: konstanta objek (JOURNEY_BLOCK_LABELS, UNMEASURABLE_LABELS,
 * READINESS_STATUS_LABELS, HEALTH_SEVERITY_LABELS, SKILL_PAGE_COPY) kini getter lazy —
 * t() dibaca saat akses render, bukan saat boot (AI-14-F03), identifier tetap di app.js
 * (kontrak W2-TEST-A). Nilai state `ujian ditinggalkan sebelum selesai` TETAP di app.js;
 * render-map memakai level.ujian-ditinggalkan milik copy-id-app-a.js (handoff W2-APP-A).
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    // app.js:5155 — puterAccountLabel: belum
    'akun.belum-tersambung': 'Belum tersambung',
    // app.js:5221 — accountSettingsMarkup: catatan tanpa akun
    'akun.catatan-tanpa': 'Belajar tetap jalan penuh tanpa akun. Masuk hanya menambahkan tutor AI, suara neural, dan sinkron progres antar perangkat.',
    // app.js:5220 — accountSettingsMarkup: catatan tersambung
    'akun.catatan-tersambung': 'Ganti akun akan keluar dulu, lalu membuka login Puter - tanpa itu Puter langsung memakai sesi lama dan akunnya tidak pernah benar-benar berganti.',
    // app.js:5171 — signOutPuterAccount: Error
    'akun.err-layanan': 'Layanan akun Puter belum bisa dihubungi.',
    // app.js:5217 — accountSettingsMarkup: tombol ganti
    'akun.ganti': 'Ganti akun',
    // app.js:5217 — accountSettingsMarkup: tombol keluar
    'akun.keluar': 'Keluar',
    // app.js:5218 — accountSettingsMarkup: tombol masuk
    'akun.masuk': 'Masuk ke akun Puter',
    // app.js:5155 — puterAccountLabel: tersambung
    'akun.tersambung': 'Akun tersambung',
    // app.js:5188 — runPuterSwitchAccount: toast
    'akun.toast-ganti': 'Akun diganti. FIEZEL dimuat ulang.',
    // app.js:5177 — runPuterSignOut: toast
    'akun.toast-keluar': 'Keluar dari akun. FIEZEL dimuat ulang.',
    // app.js:4960 — confirmRestore: dibatalkan
    'backup.batal-tak-sah': 'pemulihan dibatalkan: berkas tidak sah.',
    // app.js:4914 — continuitySettingsMarkup: tombol buat
    'backup.buat': 'Buat berkas backup',
    // app.js:4950 — runBackupImport: tombol gabung
    'backup.gabung': 'Gabungkan sekarang',
    // app.js:4955 — runBackupImport: gagal baca
    'backup.gagal-baca': 'berkas tidak bisa dibaca ({galat}).',
    // app.js:4932 — runBackupExport: gagal
    'backup.gagal-buat': 'gagal membuat backup ({galat}).',
    // app.js:4914 — continuitySettingsMarkup: tombol pilih
    'backup.pilih': 'Pilih berkas backup',
    // app.js:4919 — setBackupState: prefix status
    'backup.prefix-status': 'Status: ',
    // app.js:4948 — runBackupImport: pratinjau backup
    'backup.pv-backup': 'Hanya di backup',
    // app.js:4946 — runBackupImport: pratinjau bentrok
    'backup.pv-bentrok': 'Materi bentrok',
    // app.js:4943 — runBackupImport: pratinjau Dibuat
    'backup.pv-dibuat': 'Dibuat',
    // app.js:4945 — runBackupImport: pratinjau sudah ada
    'backup.pv-sudah-ada': 'Sudah ada',
    // app.js:4923 — runBackupExport: sandi pendek
    'backup.sandi-pendek': 'kata sandi minimal 8 karakter.',
    // app.js:4955 — runBackupImport: sandi salah
    'backup.sandi-salah': 'kata sandi salah atau berkas rusak.',
    // app.js:4916 — continuitySettingsMarkup: status awal
    'backup.status-awal': 'Status: belum ada berkas dipilih.',
    // app.js:4952 — runBackupImport: status terbaca
    'backup.terbaca': 'berkas terbaca. Periksa ringkasan sebelum menggabungkan.',
    // app.js:4964 — confirmRestore: toast
    'backup.toast-gabung': 'Progres digabungkan.',
    // app.js:4849 — unifiedSkillsMarkup: cakupan tak terukur
    'diag.belum-dapat-diukur': 'Belum dapat diukur',
    // app.js:4850 — unifiedSkillsMarkup: latency
    'diag.belum-terbaca': 'Belum terbaca',
    // app.js:4858 — unifiedSkillsMarkup: belum terukur
    'diag.belum-terukur': 'Belum terukur',
    // app.js:4848 — unifiedSkillsMarkup: cakupan terukur
    'diag.cakupan-detail': '{persen}% ({dicoba} dari {tersedia} materi)',
    // app.js:4855 — unifiedSkillsMarkup: cakupan target
    'diag.cakupan-target': 'Cakupan target',
    // app.js:4850 — unifiedSkillsMarkup: satuan latency
    'diag.detik-median': ' detik median',
    // app.js:4857 — unifiedSkillsMarkup: kecepatan respons
    'diag.kecepatan-respons': 'Kecepatan respons',
    // app.js:4854 — unifiedSkillsMarkup: kelengkapan
    'diag.kelengkapan': 'Kelengkapan',
    // app.js:4841 — UNMEASURABLE_LABELS.targetCoverage (getter lazy)
    'diag.label-cakupan': 'cakupan target',
    // app.js:4841 — UNMEASURABLE_LABELS.replayCount (getter lazy)
    'diag.label-replay': 'jumlah pengulangan audio',
    // app.js:4858 — unifiedSkillsMarkup: pengulangan audio
    'diag.pengulangan-audio': 'Pengulangan audio',
    // app.js:4854 — unifiedSkillsMarkup: % selesai
    'diag.persen-selesai': '% selesai',
    // app.js:4858 — unifiedSkillsMarkup: nilai replay
    'diag.replay-nilai': '{total}x total · rata-rata {rata}x',
    // app.js:5900 — flashcards: chip kelas kata
    'flash.kelas-kata': 'Kelas kata · ',
    // app.js:5910 — flashcards: toast ditandai
    'flash.toast-dikuasai': 'Ditandai dikuasai',
    // app.js:5909 — flashcards: toast progres
    'flash.toast-progres': 'Progres tersimpan',
    // app.js:4617 — skillHubMarkup: judul seksi
    'home.judul-skill': 'Empat skill inti tes',
    // app.js:4649 — homeStatStripMarkup: keping gem
    'home.keping-gem': 'Gem',
    // app.js:4646 — homeStatStripMarkup: keping level
    'home.keping-level': 'Level',
    // app.js:4650 — homeStatStripMarkup: keping review
    'home.keping-review': 'Review',
    // app.js:4600 — skillHubModel: catatan kartu Listening
    'home.skill-listening': 'Dengar lalu jawab',
    // app.js:4602 — skillHubModel: catatan kartu Reading
    'home.skill-reading': '{jumlah} bacaan {level}',
    // app.js:4601 — skillHubModel: catatan kartu Speaking
    'home.skill-speaking': 'Ngomong, direkam lokal',
    // app.js:4603 — skillHubModel: catatan kartu Writing
    'home.skill-writing': '{done}/{goal} tulisan minggu ini',
    // app.js:4780 — journeySkillRowMarkup: status belum diukur
    'journey.belum-diukur': 'Belum diukur',
    // app.js:4779 — journeySkillRowMarkup: status R3
    'journey.belum-terhubung': 'Belum terhubung',
    // app.js:4773 — JOURNEY_BLOCK_LABELS.transfer (getter lazy)
    'journey.blok-campur': 'soal campur',
    // app.js:4773 — JOURNEY_BLOCK_LABELS.focus (getter lazy)
    'journey.blok-fokus': 'soal fokus',
    // app.js:4773 — JOURNEY_BLOCK_LABELS.review (getter lazy)
    'journey.blok-ulang': 'soal ulang',
    // app.js:4786 — journeySkillRowMarkup: cakupan
    'journey.cakupan': 'cakupan {persen}%',
    // app.js:5351 — classroomBase: gagal muat pack
    'kelas.gagal-muat': 'Classroom belum dapat dimuat.',
    // app.js:5334 — classroom(): layar memuat
    'kelas.memuat': 'Memuat Classroom…',
    // app.js:5352 — classroomBase: runtime hilang
    'kelas.runtime-hilang': 'Classroom runtime tidak tersedia.',
    // app.js:5326 — classroomSpeak: catatan suara gagal
    'kelas.suara-belum-siap': 'Suara belum siap: {galat}. Subtitle tetap jalan.',
    // app.js:4311 — openLevelPanel: hitungan salah di badge
    'level.badge-salah': ' · salah {miss}/{batas}',
    // app.js:4311 — openLevelPanel: badge kartu terkunci
    'level.badge-terkunci': 'Terkunci · lewat ujian',
    // app.js:4453 — buildLevelExamQuestions: Error tampil via toast
    'level.err-ujian-asing': 'Level ujian tidak dikenal.',
    // app.js:4546 — activeLevelTrustMarkup: tombol lihat level
    'level.lihat-level': 'Lihat level',
    // app.js:4319 — openLevelPanel: tombol pakai hasil tes
    'level.pakai-hasil-tes': 'Gunakan hasil tes ({level})',
    // app.js:4549 — activeLevelTrustMarkup: hitungan probation
    'level.probation-hitung': 'Level {level} · salah {miss}/{batas} · terverifikasi sampai {verif}',
    // app.js:4525 — openActiveLevelExamPanel: paragraf rantai
    'level.rantai-ujian': 'Ujiannya berantai: level terverifikasimu sekarang <b>{verif}</b>, jadi yang boleh diuji adalah <b>{berikut}</b>. Satu ujian, satu anak tangga.',
    // app.js:4524 — openActiveLevelExamPanel: riwayat percobaan
    'level.riwayat-percobaan': 'Percobaan terakhir: {skor}/{total} ({akurasi}%)',
    // app.js:4319 — openLevelPanel: tombol selesai
    'level.selesai': 'Selesai',
    // app.js:4319 — openLevelPanel: sumber level (manual)
    'level.sumber-manual': 'aktif pilihanmu: <b>{aktif}</b>. Hasil placement tersimpan sebagai {placement}. Level terverifikasi: <b>{verif}</b>.',
    // app.js:4544 — activeLevelTrustMarkup: status tangga
    'level.tangga-kebuka': 'Ujian kebuka',
    // app.js:4544 — activeLevelTrustMarkup: status tangga
    'level.tangga-menunggu': 'Menunggu',
    // app.js:4490 — startLevelExam: toast bukan urutan
    'level.toast-berantai': 'Ujiannya berantai: yang kebuka sekarang {level}.',
    // app.js:4297 — usePlacementLevel: toast
    'level.toast-ikut-tes': 'Mengikuti level hasil tes: {level}',
    // app.js:4491 — startLevelExam: toast fallback
    'level.toast-tak-bisa': 'Level ujian belum bisa dibuka.',
    // app.js:4296 — setActiveLevel: toast level terkunci
    'level.toast-terkunci': 'Level {level} kebuka lewat Ujian Skip Level {ujian}.',
    // app.js:4526 — openActiveLevelExamPanel: tombol buka dulu
    'level.tombol-buka-dulu': 'Buka ujian {level} dulu',
    // app.js:4021 — sendFeedback: toast gagal
    'masukan.gagal': 'Gagal mengirim. Coba lagi nanti.',
    // app.js:4020 — sendFeedback: toast sukses
    'masukan.terkirim': 'Terkirim. Terima kasih!',
    // app.js:4016 — sendFeedback: toast validasi pesan kosong
    'masukan.tulis-dulu': 'Tulis dulu pesannya.',
    // app.js:4195 — go(): toast view tidak dikenal (AI-14-F01)
    'nav.halaman-tak-tersedia': 'Halaman tujuan tidak tersedia.',
    'nav.tekan-lagi-untuk-keluar': 'Tekan kembali sekali lagi untuk keluar dari FIEZEL.',
    // app.js:5755 — showPrasastiMoment: aria-label
    'prasasti.aria-baru': 'Prasasti baru terukir',
    // app.js:5788 — aria-label badge prasasti belum terukir
    'prasasti.aria-belum': 'belum terukir. {hint}',
    // app.js:5788 — aria-label badge prasasti terukir
    'prasasti.aria-terukir': 'terukir {kapan}',
    // app.js:5786 — prasastiGalleryMarkup: gagal muat
    'prasasti.gagal-muat': 'Galeri prasasti belum dapat dimuat.',
    // app.js:4734 — maybeShowDailyRitual: aria-label dialog
    'ritual.aria-rencana': 'Rencana hari ini',
    // app.js:4735 — ritual: sapaan
    'ritual.halo': 'Halo, {nama}.',
    // app.js:4735 — ritual: kosong sebelum placement
    'ritual.kosong-belum-tes': 'Mulai dari tes penempatan biar rencananya pas untukmu.',
    // app.js:4735 — ritual: kosong sesudah placement
    'ritual.kosong-placement': 'Rencana harimu menyesuaikan begitu kamu mulai berlatih.',
    // app.js:4735 — ritual: tombol mulai
    'ritual.mulai': 'Mulai',
    // app.js:4970 — HEALTH_SEVERITY_LABELS.ok (getter lazy; identifier tetap, kontrak W2-TEST-A)
    'sehat.aman': 'Aman',
    // app.js:4995 — installHealthReportMarkup: fallback
    'sehat.belum-tersedia': 'Pemeriksaan instalasi belum tersedia.',
    // app.js:4970 — HEALTH_SEVERITY_LABELS.info (getter lazy)
    'sehat.catatan': 'Catatan',
    // app.js:4970 — HEALTH_SEVERITY_LABELS.blocker (getter lazy)
    'sehat.harus-ditangani': 'Harus ditangani',
    // app.js:4970 — HEALTH_SEVERITY_LABELS.warn (getter lazy)
    'sehat.perlu-perhatian': 'Perlu perhatian',
    // app.js:4997 — installHealthReportMarkup: status blocker
    'sehat.status-blocker': 'Ada yang harus ditangani',
    // app.js:4997 — installHealthReportMarkup: status degraded
    'sehat.status-degraded': 'Ada yang perlu diperhatikan',
    // app.js:4997 — installHealthReportMarkup: status sehat
    'sehat.status-sehat': 'Instalasi sehat',
    // app.js:4878 — academicReadinessMarkup: baris jalur
    'siap.baris-jalur': '{jumlah} bacaan · {topik}',
    // app.js:4865 — READINESS_STATUS_LABELS.not_met (getter lazy)
    'siap.belum-terpenuhi': 'Belum terpenuhi',
    // app.js:4868 — academicReadinessMarkup: fallback modul
    'siap.belum-tersedia': 'Peta kesiapan akademik belum tersedia.',
    // app.js:4865 — READINESS_STATUS_LABELS.unknown (getter lazy)
    'siap.belum-terukur': 'Belum terukur',
    // app.js:4883 — academicReadinessMarkup: h4 beasiswa
    'siap.h-beasiswa': 'Lab komunikasi beasiswa',
    // app.js:4880 — academicReadinessMarkup: h4 fondasi
    'siap.h-fondasi': 'Prasyarat fondasi akademik',
    // app.js:4878 — academicReadinessMarkup: menunggu konten
    'siap.menunggu-konten': 'Menunggu konten',
    // app.js:4865 — READINESS_STATUS_LABELS.met (getter lazy; identifier tetap, kontrak W2-TEST-A)
    'siap.terpenuhi': 'Sudah terpenuhi',
    // app.js:5460 — skillsLab: kartu gagal
    'skills.gagal-muat': 'Latihan bicara & dengar belum dapat dimuat.',
    // app.js:5420 — SKILL_PAGE_COPY.listening.lead (getter lazy; title Inggris tetap di kode)
    'skills.lead-listening': 'Dengar dulu, baru jawab. Kalau belum nangkep, ulang - itu bagian dari latihannya.',
    // app.js:5421 — SKILL_PAGE_COPY.speaking.lead (getter lazy)
    'skills.lead-speaking': 'Ngomong aja dulu. Rekaman latihanmu cuma tersimpan di perangkatmu; tapi fitur pengenal ucapan bawaan browser bisa memproses suaramu di server pembuat browser-nya. Yang FIEZEL simpan cuma teks transkrip dan skornya.',
    // app.js:5460 — skillsLab: Error runtime
    'skills.runtime-hilang': 'Speaking + Listening runtime tidak tersedia',
    // app.js:5237 — testNeuralVoice: toast belum
    'suara.belum-berbunyi': 'Suara belum berbunyi.',
    // app.js:5234 — neuralVoiceStatusMarkup: baris cadangan
    'suara.cadangan': 'Cadangan suara sudah tersimpan di perangkat ini. Kalau suatu saat jatah suara online habis, pelajaran tetap bersuara.',
    // app.js:5234 — neuralVoiceStatusMarkup: label kecepatan
    'suara.kecepatan-bicara': 'Kecepatan bicara',
    // app.js:5125 — neuralRateLabel: lebih cepat
    'suara.lebih-cepat': '{nilai}x · lebih cepat',
    // app.js:5125 — neuralRateLabel: lebih pelan
    'suara.lebih-pelan': '{nilai}x · lebih pelan',
    // app.js:5230 — neuralVoiceStatusMarkup: label menyiapkan
    'suara.menyiapkan': 'Menyiapkan suara…',
    // app.js:5125 — neuralRateLabel: natural
    'suara.natural': '{nilai}x · natural',
    // app.js:5114 — setNeuralVoicePreference: fallback label
    'suara.otomatis': 'Otomatis',
    // app.js:5230 — neuralVoiceStatusMarkup: label siap
    'suara.siap': 'Suara siap, tanpa unduhan',
    // app.js:5234 — neuralVoiceStatusMarkup: status error
    'suara.status-error': 'Status: {galat}',
    // app.js:5237 — testNeuralVoice: hint gagal bunyi
    'suara.tak-berbunyi': 'Suara tidak berbunyi. Periksa koneksi lalu coba lagi.',
    // app.js:5237 — testNeuralVoice: toast terdengar
    'suara.terdengar': 'Suara terdengar.',
    // app.js:5234 — neuralVoiceStatusMarkup: tombol tes
    'suara.tes': 'Tes suara',
    // app.js:5237 — testNeuralVoice: toast error
    'suara.tes-gagal': 'Tes suara gagal. Buka Diagnostics untuk detail.',
    // app.js:5237 — testNeuralVoice: hint error
    'suara.tes-gagal-detail': 'Tes suara gagal: {galat}.',
    // app.js:5237 — testNeuralVoice: hint selesai
    'suara.tes-selesai': 'Tes selesai. Subtitle Indonesia muncul di bawah saat pelajaran berjalan.',
    // app.js:5114 — setNeuralVoicePreference: toast
    'suara.toast-voice': 'Voice neural: {label}',
    // app.js:5523 — writing(): aria-label kotak
    'tulis.aria-kotak': 'Kotak menulis',
    // app.js:5639 — writingFormChecklist: kata diulang
    'tulis.cek-diulang': 'Kata yang diulang: {daftar}.',
    // app.js:5640 — writingFormChecklist: tidak menumpuk
    'tulis.cek-tak-menumpuk': 'Tidak ada kata isi yang menumpuk berlebihan.',
    // app.js:5522 — writing(): fokus latihan
    'tulis.fokus': 'Yang dilatih: {fokus}',
    // app.js:5526 — writing(): tombol ganti topik
    'tulis.ganti-topik': 'Ganti topik',
    // app.js:5529 — writing(): judul rubrik
    'tulis.judul-rubrik': 'Yang dinilai',
    // app.js:5529 — writing(): keterangan rubrik
    'tulis.ket-rubrik': 'Lima kriteria, masing-masing 0-4. Empat yang pertama mengikuti keluarga kriteria IELTS Writing.',
    // app.js:5545 — requestWritingFeedback: kartu menunggu
    'tulis.menunggu': 'FIEZEL lagi baca tulisanmu…',
    // app.js:5519 — writing(): meta ujian
    'tulis.meta-ujian': 'Minimal {kata} kata · {menit} menit',
    // app.js:5524 — writing(): target kata
    'tulis.min-kata': 'Minimal {kata} kata',
    // app.js:5525 — writing(): tombol minta masukan
    'tulis.minta-masukan': 'Minta masukan FIEZEL',
    // app.js:5532 — writing(): counter kata
    'tulis.n-kata': '{jumlah} kata',
    // app.js:5524 — writing(): hitungan awal
    'tulis.nol-kata': '0 kata',
    // app.js:5545 — requestWritingFeedback: sebentar
    'tulis.sebentar': 'Sebentar ya.',
    // app.js:5524 — writing(): target kata (latihan)
    'tulis.target-kata': 'Target sekitar {kata} kata',
    // app.js:5575 — requestWritingFeedback: timeout
    'tulis.timeout': 'Koneksi AI tidak menjawab dalam 25 detik.',
    // app.js:5543 — requestWritingFeedback: toast <15 kata
    'tulis.toast-min15': 'Tulis minimal 15 kata dulu, biar ada yang bisa dibaca FIEZEL.',
    // app.js:5590 — requestWritingFeedback: toast offline
    'tulis.toast-offline': 'Tulisan tercatat. Masukan AI menyusul kalau koneksi balik.',
    // app.js:5585 — requestWritingFeedback: toast sukses
    'tulis.toast-tercatat': 'Tulisan tercatat. Mantap.',
    // app.js:5924 — reviewVocab: eyebrow
    'ulangan.eyebrow': 'ULANGAN · {level}',
    // app.js:5924 — reviewVocab: judul topline
    'ulangan.topline': 'Ulangan {idx}/{total}',
    // app.js:5365 — renderClassroom: tombol kembali
    'umum.kembali': 'Kembali',
    // app.js:5808 — vocab(): tombol flashcards
    'vocab.buka-flashcards': 'Buka flashcards',
    // app.js:5935 — startVocabQuiz: toast kosong
    'vocab.quiz-kosong': 'Vocabulary {level} belum tersedia.',

    // ---------- W2-REGEN: entri tunda gelombang regen baseline ----------
    // app.js:5791 — startAdaptive: toast belum tes
    'adaptif.toast-belum-tes': 'Latihan terbuka setelah tes awal selesai.',
    // app.js:5802 — startAdaptive: toast mulai
    'adaptif.toast-mulai': '{judul} · {jumlah} soal',
    // app.js:5791 — startAdaptive: toast pool kurang
    'adaptif.toast-pool-kurang': 'Profil adaptif belum memiliki area yang cukup terukur. Lanjutkan latihan level terlebih dahulu.',
    // app.js:5222 — accountSettingsMarkup: judul kartu
    'akun.judul': 'Akun Puter',
    // app.js:5222 — accountSettingsMarkup: keterangan kartu
    'akun.keterangan': 'Progres belajar, streak, dan tutor AI tersimpan di akun ini.',
    // app.js:5222 — accountSettingsMarkup: sub belum
    'akun.sub-belum': 'Belum ada akun tersambung',
    // app.js:5222 — accountSettingsMarkup: sub tersambung
    'akun.sub-tersambung': 'Tersambung di perangkat ini',
    // app.js:4949 — runBackupImport: catatan gabung
    'backup.catatan-gabung': 'Progres di perangkat ini tidak dibuang. Materi yang ada di kedua sisi diambil yang paling maju.',
    // app.js:4931 — runBackupExport: sukses
    'backup.dibuat': 'berkas {nama} dibuat. Simpan di tempat yang kamu percaya.',
    // app.js:4911 — continuitySettingsMarkup: judul
    'backup.judul': 'Backup dan pemulihan',
    // app.js:4911 — continuitySettingsMarkup: keterangan
    'backup.keterangan': 'Berkas terenkripsi yang kamu simpan sendiri. FIEZEL tidak mengirimnya ke mana pun.',
    // app.js:4912 — continuitySettingsMarkup: label sandi
    'backup.label-sandi': 'Kata sandi backup (minimal 8 karakter)',
    // app.js:4913 — continuitySettingsMarkup: peringatan sandi
    'backup.peringatan-sandi': 'Kalau kata sandi ini hilang, backup tidak bisa dibuka lagi. FIEZEL tidak menyimpan salinannya.',
    // app.js:4912 — continuitySettingsMarkup: placeholder sandi
    'backup.placeholder-sandi': 'Kata sandi untuk membuka berkas ini',
    // app.js:4944 — runBackupImport: pratinjau baru
    'backup.pv-baru': 'Jawaban baru',
    // app.js:4947 — runBackupImport: pratinjau lokal
    'backup.pv-lokal': 'Hanya di perangkat ini',
    // app.js:4963 — confirmRestore: selesai
    'backup.selesai': 'selesai. Riwayat {sebelum} menjadi {sesudah} jawaban.',
    // app.js:4844 — unifiedSkillsMarkup: fallback
    'diag.belum-tersambung': 'Bukti Speaking dan Listening belum tersambung ke peta ini.',
    // app.js:4846 — unifiedSkillsMarkup: baris kosong
    'diag.no-practice': 'Belum ada latihan tercatat',
    // app.js:4861 — unifiedSkillsMarkup: paragraf penutup
    'diag.penutup': 'Skor latihan dan cakupan target adalah dua hal berbeda: yang satu seberapa baik hasilnya, yang lain seberapa banyak materinya sudah disentuh. FIEZEL tidak menilai pengucapan, dan tidak menyimpan rekaman suara atau transkrip.',
    // app.js:4856 — unifiedSkillsMarkup: latihan tercatat
    'diag.practice-logged': 'Latihan tercatat',
    // app.js:4853 — unifiedSkillsMarkup: header skor
    'diag.practice-score': ' · skor latihan',
    // app.js:5900 — flashcards: eyebrow arti
    'flash.arti': 'ARTI',
    // app.js:5900 — flashcards: tombol dengar kalimat
    'flash.dengar-kalimat': 'Dengar kalimat',
    // app.js:5900 — flashcards: tombol dengar kata
    'flash.dengar-kata': 'Dengar kata',
    // app.js:5900 — flashcards: petunjuk geser
    'flash.geser': 'Geser ke kiri atau kanan untuk berpindah kartu',
    // app.js:5894 — flashcards: toast kosong
    'flash.kosong': 'Belum ada vocabulary {level} yang siap dipelajari.',
    // app.js:5900 — flashcards: fonetik fallback
    'flash.pelafalan-kosong': 'Pelafalan belum tersedia',
    // app.js:5900 — baris status kartu flashcard
    'flash.status': 'Status: {status}',
    // app.js:5900 — status kartu: sedang dipelajari
    'flash.status-learning': 'Sedang dipelajari',
    // app.js:5900 — status kartu: dikuasai
    'flash.status-mastered': 'Dikuasai',
    // app.js:5900 — status kartu: baru
    'flash.status-new': 'Baru',
    // app.js:5900 — flashcards: tombol masih belajar
    'flash.still-learning': 'Masih belajar',
    // app.js:5900 — flashcards: tombol dikuasai
    'flash.sudah-dikuasai': 'Sudah dikuasai',
    // app.js:5900 — flashcards: tombol tanya AI
    'flash.tanya-ai': 'Tanya AI',
    // app.js:5900 — flashcards: petunjuk flip belakang
    'flash.tap-back': 'Ketuk untuk kembali ke kata',
    // app.js:5900 — flashcards: petunjuk flip depan
    'flash.tap-meaning': 'Ketuk untuk melihat arti',
    // app.js:5892 — flashcards: toast level terkunci
    'flash.terkunci': 'Flashcards dikunci ke level {level}.',
    // app.js:4677 — home: sapaan belum kenal
    'home.belum-kenal': 'Aku belum kenal kamu. Coba tes singkat dulu, ya.',
    // app.js:4679 — home: CTA placement
    'home.cari-level': 'Cari tahu level kamu',
    // app.js:4702 — home: kartu classroom terkunci
    'home.classroom-tutup': 'Classroom belum dibuka — coming soon',
    // app.js:4692 — home: kartu grammar
    'home.kartu-grammar': '{jumlah} lesson · {level}',
    // app.js:4699 — home: kartu perpustakaan
    'home.kartu-perpus': '9 buku · audiobook',
    // app.js:4693 — home: kartu reading
    'home.kartu-reading': '{jumlah} bacaan · {level}',
    // app.js:4703 — home: kartu skills
    'home.kartu-skills': '72 latihan · A1–C2',
    // app.js:4691 — home: kartu vocab
    'home.kartu-vocab': '{jumlah} kata · {level}',
    // app.js:4676 — home: label strip coach fallback
    'home.kata-fiezel': 'Kata FIEZEL',
    // app.js:4647 — homeStatStripMarkup: keping runtun
    'home.keping-streak': 'Runtun',
    // app.js:4648 — homeStatStripMarkup: keping harian
    'home.keping-today': 'Hari ini',
    // app.js:4658 — home: tombol konteks level
    'home.konteks-level': '{level} · semua materi · ganti',
    // app.js:4680 — home: tombol detail
    'home.lihat-detail': 'Lihat detail',
    // app.js:4689 — home: tautan peta
    'home.lihat-peta': 'Lihat peta belajar',
    // app.js:4658 — home: meta baris atas
    'home.meta-tanggal': 'FIEZEL PERSONAL · {tanggal}',
    // app.js:4679 — home: CTA utama
    'home.mulai-sesi': 'Mulai sesi ini',
    // app.js:4689 — home: judul seksi fokus
    'home.pilih-fokus': 'Pilih fokus hari ini',
    // app.js:4677 — ringkasan sesi rekomendasi coach
    'home.ringkas-sesi': '{skill} · {items} soal · ±{menit} menit',
    // app.js:4702 — home: tag segera
    'home.segera': 'SEGERA',
    // app.js:4676 — home: label strip coach
    'home.sesi-next': 'Sesi berikutnya · dipilih Paw',
    // app.js:4614 — skillHubMarkup: fallback belum diukur
    'home.skill-belum-diukur': 'Belum diukur · mulai di sini',
    // app.js:4813 — journeyMarkup: estimasi hari
    'journey.estimasi': '{items} soal, kira-kira {menit} menit',
    // app.js:4826 — home-fold: ringkasan peta
    'journey.fold-peta': 'Peta belajar',
    // app.js:4830 — home-fold: ringkasan target
    'journey.fold-target': 'Target kamu · {label}',
    // app.js:4799 — journeyMarkup: judul seksi
    'journey.judul': 'Rencana kamu',
    // app.js:4802 — journeyMarkup: label minggu
    'journey.minggu-ini': 'MINGGU INI',
    // app.js:4814 — pesan recovery rencana harian
    'journey.recovery': 'Sengaja pendek hari ini biar kamu selesai{ekor}.',
    // app.js:4814 — ekor recovery bila ada hari libur
    'journey.recovery-away': ', soalnya {days} hari kamu libur',
    // app.js:4815 — journeyMarkup: CTA
    'journey.start-today': 'Mulai hari ini',
    // app.js:4804 — journeyMarkup: target misi
    'journey.target-misi': '{days} hari · {items} soal',
    // app.js:4811 — journeyMarkup: target belum
    'journey.target-pending': 'Lima jawaban bermakna menjaga progres tetap terukur.',
    // app.js:4811 — journeyMarkup: target tercapai
    'journey.target-tercapai': 'Target bermakna hari ini tercapai.',
    // app.js:4760 — setGoalProfile: toast
    'journey.toast-tujuan': 'Tujuan belajar: {label}',
    // app.js:4808 — journeyMarkup: label hari
    'journey.today': 'HARI INI',
    // app.js:5371 — renderClassroom: penunjuk bagian
    'kelas.bagian': 'Bagian {idx} dari {total}',
    // app.js:5382 — renderClassroom: judul halaman
    'kelas.judul': 'Belajar dengan suara Inggris + subtitle Indonesia',
    // app.js:5370 — tombol lanjut segmen classroom
    'kelas.next': 'Lanjut',
    // app.js:5377 — renderClassroom: penunjuk soal
    'kelas.q-index': 'Soal {idx} dari {total}',
    // app.js:5377 — renderClassroom: remediasi
    'kelas.remediasi': ' · coba lagi setelah penjelasan',
    // app.js:5370 — renderClassroom: tombol ulangi suara
    'kelas.replay-audio': 'Ulangi suara',
    // app.js:5379 — renderClassroom: skor
    'kelas.skor': 'Skor {persen}%',
    // app.js:5379 — renderClassroom: rincian skor
    'kelas.skor-rinci': '{right} benar dari {total} soal.',
    // app.js:5370 — tombol mulai latihan classroom
    'kelas.start-practice': 'Mulai latihan',
    // app.js:5382 — renderClassroom: sub judul
    'kelas.sub-judul': 'Pilih materi dulu, lalu Fiezel menerangkan di level {level}.',
    // app.js:5364 — renderClassroom: topik kosong
    'kelas.topik-kosong': 'Topik untuk kategori ini belum tersedia.',
    // app.js:5380 — renderClassroom: tombol topik lain
    'kelas.topik-lain': 'Pilih topik lain',
    // app.js:4318 — kalimat penutup CTA ujian
    'level.all-proven': 'Semua level sudah kamu buktikan lewat ujian grammar, kosakata, dan bacaan. Speaking dan listening belum ikut diuji \u2014 tetap asah lewat latihan.',
    // app.js:4292 — levelControlMarkup: aria-label tombol
    'level.aria-ganti': 'Ganti level belajar',
    // app.js:4318 — CTA saat semua level terverifikasi (badge=examBadge)
    'level.badge-c2': '{badge} sampai C2',
    // app.js:4415 — levelGuardWarn: tombol lanjut
    'level.continue-practice': 'Lanjut latihan',
    // app.js:4318 — openLevelPanel: rincian CTA ujian
    'level.cta-rincian': '{jumlah} soal · grammar {grammar}, kosakata {vocab}, bacaan {bacaan} · lulus {lulus}% + lantai per seksi',
    // app.js:4444 — openDemotionModal: paragraf kunci
    'level.demosi-terkunci': 'Level {from} dan semua level di atas {verif} terkunci sampai kamu lulus {judul}.',
    // app.js:4481 — buildLevelExamQuestions: Error bank kurang
    'level.err-bank-kurang': 'Bank ujian {level}/{tipe} baru punya {ada} dari {butuh} soal.',
    // app.js:4527 — openActiveLevelExamPanel: fakta 2
    'level.fakta-acak': 'Soal diacak dari bank level {level} setiap percobaan',
    // app.js:4527 — openActiveLevelExamPanel: fakta 4
    'level.fakta-jeda': 'Kalau belum lulus, jeda 24 jam untuk level ini — progres dan streak tetap utuh',
    // app.js:4527 — openActiveLevelExamPanel: fakta 1
    'level.fakta-komposisi': '{jumlah} soal: grammar {grammar}, kosakata {vocab}, bacaan {bacaan}',
    // app.js:4527 — openActiveLevelExamPanel: fakta 3
    'level.fakta-lulus': 'Lulus mulai {lulus}% · tanpa petunjuk, tanpa percobaan kedua',
    // app.js:4518 — levelExamSettle: pesan gagal
    'level.gagal-skor': ' Skor kamu {skor}/{total} ({akurasi}%), lulusnya mulai {lulus}% dengan tiap seksi di atas garis tebakan.',
    // G15-16 wave2 (F22): lantai per seksi Ujian Skip Level — pesan gagal-karena-lantai + fragmen rinciannya
    'level.gagal-lantai': ' Skor totalmu {skor}/{total} ({akurasi}%) sebenarnya sudah sampai, tapi ujian ini juga minta tiap seksi berdiri di atas garis tebakan \u2014 yang masih kurang: {rincian}. Kuatkan bagian itu dulu; besok ujiannya kebuka lagi, dan progresmu aman.',
    'level.gagal-kurang': ' Yang masih kurang: {rincian}.',
    'level.lantai-butuh': '{label} {ok}/{n} (butuh minimal {lantai})',
    'level.seksi-grammar': 'grammar',
    'level.seksi-kosakata': 'kosakata',
    'level.seksi-bacaan': 'bacaan',
    // app.js:4292 — levelControlMarkup: sub-label
    'level.ganti': 'Ganti',
    // app.js:4319 — openLevelPanel: judul modal
    'level.judul-panel': 'Pilih level belajar',
    // app.js:4415 — levelGuardWarn: judul modal
    'level.judul-warn': 'Level {level} · salah {miss}/{batas}',
    // app.js:4292 — levelControlMarkup: label tombol
    'level.label-tombol': 'Level belajar',
    // app.js:4514 — levelExamSettle: pesan lulus (sambungan)
    'level.pass-next': ' Ujian {level} sudah kebuka kalau mau lanjut.',
    // app.js:4319 — openLevelPanel: paragraf modal
    'level.penjelasan-panel': 'Semua materi, latihan, tutor AI, dan rekomendasi akan mengikuti level yang kamu pilih.',
    // app.js:4319 — openLevelPanel: sumber level (placement)
    'level.sumber-placement': 'Saat ini mengikuti hasil placement: <b>{placement}</b>. Level terverifikasi: <b>{verif}</b>.',
    // G15-12d/e wave2 (F22): suffix kondisional saat verified bersumber placement (two-tier)
    'level.sumber-verif-awal': ' (level awal dari placement \u2014 kokohkan lewat Ujian Skip Level)',
    // app.js:4296 — setActiveLevel: toast sukses
    'level.toast-aktif': 'Level belajar aktif: {level}',
    // app.js:4522 — toast semua level terverifikasi
    'level.toast-c2': '{badge} sampai C2 — tidak ada level yang perlu diuji lagi.',
    // app.js:4489 — startLevelExam: toast cooldown
    'level.toast-cooldown': '{judul} {level} bisa diulang {jeda}.',
    // app.js:4428 — levelGuardDemote: toast ditahan saat kuis
    'level.toast-demosi': 'Kita mundur ke {level} dulu — semua progresmu tetap tersimpan.',
    // app.js:4496 — startLevelExam: toast mulai ujian
    'level.toast-mulai-ujian': '{judul} {level} · {jumlah} soal tanpa petunjuk',
    // app.js:4414 — levelGuardWarn: toast peringatan
    'level.toast-warn': 'Salah {miss} dari {batas} di {level}. PAW menemani.',
    // app.js:4318 — openLevelPanel: tombol cooldown
    'level.tombol-cooldown': 'Bisa diulang {jeda}',
    // app.js:4024 — openFeedback: tombol batal
    'masukan.batal': 'Batal',
    // app.js:4024 — openFeedback: judul modal
    'masukan.judul': 'Kirim masukan',
    // app.js:4024 — openFeedback: tombol kirim
    'masukan.kirim': 'Kirim',
    // app.js:4024 — openFeedback: label textarea
    'masukan.label-pesan': 'Pesan',
    // app.js:4024 — openFeedback: paragraf modal
    'masukan.penjelasan': 'Materi yang belum ada, soal yang keliru, atau apa pun yang mengganggu. Tidak ada data belajarmu yang ikut terkirim.',
    // app.js:4024 — openFeedback: placeholder textarea
    'masukan.placeholder': 'Contoh: belum ada materi tentang passive voice bentuk lampau.',
    // app.js:5756 — showPrasastiMoment: catatan
    'prasasti.catatan': 'Terukir dari bukti belajarmu. Lihat semuanya di Peta Belajar.',
    // app.js:5789 — prasastiGalleryMarkup: catatan galeri
    'prasasti.catatan-galeri': 'Prasasti hanya terukir dari hal yang benar-benar kamu kerjakan — tidak dijual, tidak bisa dipalsukan.',
    // app.js:5756 — showPrasastiMoment: tombol simpan
    'prasasti.simpan': 'Simpan di galeri',
    // app.js:4735 — ritual: baris runtun
    'ritual.streak': 'Runtun {days} hari — jaga nyalanya.',
    // app.js:4998 — installHealthReportMarkup: catatan privasi
    'sehat.catatan-privasi': 'Pemeriksaan ini hanya melihat keadaan pemasangan aplikasi. Tidak ada riwayat jawaban atau isi belajar yang dibaca.',
    // app.js:5003 — refreshInstallHealth: gagal
    'sehat.gagal': 'Pemeriksaan instalasi tidak bisa diselesaikan di perangkat ini.',
    // app.js:4885 — academicReadinessMarkup: fallback error
    'siap.gagal-tampil': 'Peta kesiapan akademik belum bisa ditampilkan.',
    // app.js:4882 — academicReadinessMarkup: h4 reading
    'siap.h-reading': 'Jalur reading akademik',
    // app.js:4884 — academicReadinessMarkup: h4 kosakata
    'siap.h-vocab': 'Jalur kosakata IT dan kampus',
    // app.js:4882 — academicReadinessMarkup: keterangan jalur
    'siap.ket-jalur': '{jumlah} bacaan bertema sains, lingkungan, dan teknologi dari bank yang sudah ada.',
    // app.js — skillsLab: nama tombol bundar "?" di pojok kanan atas halaman skill.
    // Dipakai sebagai aria-label DAN title, jadi ia harus berdiri sendiri tanpa konteks
    // visual: pembaca layar hanya mendengar kalimat ini, bukan melihat tanda tanyanya.
    'skills.bantuan': 'Tentang latihan ini',
    // app.js:5460 — skillsLab: badge
    'skills.badge': 'SKILL INTI TES',
    // app.js:5460 — skillsLab: catatan level
    'skills.catatan-level': 'Level aktif: <b>{level}</b> · atur dari tombol Level belajar',
    // app.js:5460 — skillsLab: lead hub
    'skills.lead-hub': 'Speaking dan Listening dengan evidence terisolasi dan privasi ketat. Suara berjalan langsung tanpa unduhan, jadi tidak ada setup di sini.',
    // app.js:5460 — skillsLab: memuat bank
    'skills.memuat': 'Memuat bank latihan…',
    // app.js:5234 — neuralVoiceStatusMarkup: keterangan subtitle
    'suara.ket-subtitle': 'Setiap kalimat Inggris dibacakan dan diberi subtitle Indonesia di bawahnya. Tidak ada yang perlu diunduh.',
    // app.js:5518 — writing(): badge topik
    'tulis.badge-topik': 'TOPIK {level} · {done}/{goal} minggu ini',
    // app.js:5632 — writingFormChecklist: di bawah batas ujian
    'tulis.cek-bawah-batas': '{kata} kata, di bawah batas {label} ({min}). Di ujian aslinya ini kena penalti sebelum isinya dinilai.',
    // app.js:5651 — writingLocalReview: judul kartu offline
    'tulis.cek-judul': 'Cek bentuk FIEZEL (offline)',
    // app.js:5651 — writingLocalReview: keterangan offline
    'tulis.cek-keterangan': 'Ini pemeriksaan BENTUK terhadap kriteria rubrik, bukan penilaian bahasa dan bukan skor. Dua kriteria terakhir memang tidak bisa dihitung tanpa membaca - itu bagian AI.',
    // app.js:5642 — writingFormChecklist: klausa kompleks
    'tulis.cek-klausa': 'Terhitung {klausa} penanda klausa kompleks dan kalimat terpanjang {terpanjang} kata. Ketepatannya hanya bisa dinilai dengan membaca - itu bagian AI.',
    // app.js:5633 — writingFormChecklist: kurang dari target
    'tulis.cek-kurang': '{kata} kata, masih {kurang} kata di bawah target {goal}.',
    // app.js:5644 — writingFormChecklist: nada/ejaan
    'tulis.cek-nada': 'Nada dan ejaan tidak bisa dihitung dari bentuk. Minta masukan AI untuk bagian ini.',
    // app.js:5637 — writingFormChecklist: paragraf kurang
    'tulis.cek-paragraf-kurang': 'Baru {jumlah} paragraf. Esai ujian biasanya butuh pembuka, isi yang terbagi, dan penutup.',
    // app.js:5636 — writingFormChecklist: paragraf cukup
    'tulis.cek-paragraf-ok': '{jumlah} paragraf - strukturnya sudah terbaca.',
    // app.js:5634 — writingFormChecklist: target terpenuhi
    'tulis.cek-penuh': '{kata} kata, target {goal} terpenuhi.',
    // app.js:5651 — writingLocalReview: tersimpan minggu ini
    'tulis.cek-tersimpan': 'Tersimpan sebagai latihan minggu ini ({done}/{goal}).',
    // app.js:5577 — requestWritingFeedback: disclosure
    'tulis.disclosure': 'Tulisan dan konteks tugas yang kamu kirim diproses oleh Core AI. Jangan masukkan data pribadi.',
    // app.js:5588 — requestWritingFeedback: kartu gagal AI
    'tulis.gagal-ai': 'Masukan AI belum bisa diambil.',
    // app.js:5513 — writing(): halaman kosong
    'tulis.kosong': 'Belum ada topik writing untuk level {level}.',
    // app.js:5515 — writing(): badge + lead
    'tulis.lead': 'Tulis dulu apa adanya. Rapihnya urusan nanti - yang penting jadi.',
    // app.js:5920 — reviewVocab: toast kosong
    'ulangan.kosong': 'Belum ada review yang jatuh tempo.',
    // app.js:4527 — openActiveLevelExamPanel: tombol nanti
    'umum.nanti-dulu': 'Nanti dulu',
    // app.js:5808 — vocab(): catatan ganti level
    'vocab.ganti-level': 'Ganti level dari tombol di atas.',
    // app.js:5808 — vocab(): keterangan mastered
    'vocab.ket-mastered': '{jumlah} mastered · bank level lain tetap tersimpan, tetapi tidak ditampilkan.',
    // app.js:5808 — vocab(): kosong
    'vocab.kosong': 'Belum tersedia untuk level ini.',
    // app.js:5808 — vocab(): hitungan kata
    'vocab.n-kata': '{jumlah} kata',
    // app.js:5808 — vocab(): tombol review
    'vocab.review-due': ' Review Due ({jumlah})</button>',
    // app.js:5808 — vocab(): subjudul shell
    'vocab.subjudul': '{jumlah} kata level {level}. Semua latihan mengikuti level belajar aktif.',
    // app.js:5808 — vocab(): tombol uji
    'vocab.uji': ' Uji Vocabulary {level}</button>'
  });
}());
