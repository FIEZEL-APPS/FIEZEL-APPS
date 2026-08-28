/**
 * FIEZEL · features/i18n/copy-id-app-c.js — COPY-MAP INDONESIA, segmen app.js baris 4001–6000
 *
 * MENGAPA: audit multilingual v2 (AI-02 F01, AI-14 F01/F03) — app.js tidak punya lapisan
 * string; berkas ini memindahkan naskah murid segmen C (masukan, nav, level/ujian, home,
 * ritual, journey, diagnostik, kesiapan, backup, health, akun/suara, classroom, skills,
 * writing, prasasti, adaptif, vocab, flashcards, ulangan) ke copy-map sesuai plan
 * W1-APPJS-C, supaya copy-th-app-c.js bisa 1:1. Nilai DISALIN BYTE-PER-BYTE dari app.js —
 * gerbang id-golden-snapshot-test.js membekukan himpunan literal (PINDAH boleh, BERUBAH
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
    'skills.gagal-muat': 'Skills Lab belum dapat dimuat.',
    // app.js:5420 — SKILL_PAGE_COPY.listening.lead (getter lazy; title Inggris tetap di kode)
    'skills.lead-listening': 'Dengar dulu, baru jawab. Kalau belum nangkep, ulang - itu bagian dari latihannya.',
    // app.js:5421 — SKILL_PAGE_COPY.speaking.lead (getter lazy)
    'skills.lead-speaking': 'Ngomong aja dulu. Rekamannya tidak pernah dikirim ke mana pun, cuma dinilai di perangkatmu.',
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
    'vocab.quiz-kosong': 'Vocabulary {level} belum tersedia.'
  });
}());
