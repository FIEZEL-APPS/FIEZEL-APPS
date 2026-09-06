/**
 * FIEZEL · features/i18n/copy-id-pawarena.js — COPY-MAP INDONESIA, naskah PAW ARENA (m025-276).
 *
 * Pasangan copy-th-pawarena.js (kunci & {placeholder} sama persis). "PAW ARENA" adalah nama
 * merek yang dikunci owner — TIDAK diterjemahkan, sama di id & th (tugas §3). Kalimat di
 * sekelilingnya tetap dwibahasa. Dipanggil lewat FiezelI18n.t('pawarena.*').
 *
 * tests/th-coverage-test.js menemukan domain 'pawarena' sendiri dari pasangan berkas ini
 * dan menuntut kembarannya lengkap — jadi setiap kunci di bawah WAJIB ada di copy-th.
 */
(function () {
  'use strict';
  var I18N = (typeof self !== 'undefined' ? self : this).FiezelI18n;
  if (!I18N) return; // urutan script salah — fiezel-i18n.js wajib dimuat lebih dulu

  I18N.registerCopy('id', {
    // --- cangkang arena ---
    'pawarena.title': 'PAW ARENA',
    'pawarena.subtitle': 'Ruang main FIEZEL — belajar sambil bertanding.',
    'pawarena.pick-game': 'Pilih permainan',
    'pawarena.solo-vs-bot': 'Main sendiri lawan bot',
    'pawarena.with-friend': 'Main berdua lewat kode',
    'pawarena.friend': 'Teman',
    'pawarena.back': 'Kembali',
    'pawarena.help': 'Petunjuk',
    'pawarena.close': 'Tutup',
    'pawarena.start': 'Mulai',
    'pawarena.skip': 'Lewati',
    'pawarena.round': 'Ronde {n}',
    'pawarena.bot.vs': 'Lawan: {name}',
    'pawarena.turn.you': 'Giliranmu',
    'pawarena.turn.bot': 'Giliran {name}',
    'pawarena.result.win': 'Kamu menang!',
    'pawarena.result.lose': '{name} menang kali ini — tantang balik!',
    'pawarena.result.tie': 'Seri!',
    'pawarena.save-artifact': 'Simpan cerita',
    'pawarena.story-done': 'Cerita kalian selesai — ini artefaknya.',

    // --- STORY CHAIN ---
    'pawarena.game.story.name': 'Rantai Cerita',
    'pawarena.game.story.tag': 'Bangun cerita bergiliran',
    'pawarena.game.story.rule-goal': 'Bangun satu cerita bersama — tiap kalimat harus kamu "beli" dengan menjawab satu tantangan.',
    'pawarena.game.story.rule-step1': 'Jawab satu tantangan bahasa Inggris untuk membuka giliranmu.',
    'pawarena.game.story.rule-step2': 'Pilih satu kalimat lanjutan dari kartu yang ditawarkan.',
    'pawarena.game.story.rule-step3': 'Cerita tumbuh sampai ronde selesai — lalu simpan sebagai artefak.',

    // --- SINYAL ---
    'pawarena.game.signal.name': 'Sinyal',
    'pawarena.game.signal.tag': 'Beri petunjuk, tebak katanya',
    'pawarena.game.signal.rule-goal': 'Tuntun lawanmu ke kata rahasia hanya lewat petunjuk bahasa Inggris — tanpa menyebut katanya.',
    'pawarena.game.signal.rule-step1': 'Kamu dapat satu kata rahasia; pilih 2–3 kartu petunjuk yang ditawarkan.',
    'pawarena.game.signal.rule-step2': 'Lawan membaca jejakmu lalu menebak kata dari empat pilihan.',
    'pawarena.game.signal.rule-step3': 'Bergantian jadi pemberi petunjuk dan penebak sampai ronde habis.',

    // --- TARUHAN ---
    'pawarena.game.stakes.name': 'Taruhan',
    'pawarena.game.stakes.tag': 'Bertaruh pada keyakinanmu',
    'pawarena.game.stakes.rule-goal': 'Menang dengan menjawab benar — tapi seberapa besar kemenanganmu, kamu yang pertaruhkan.',
    'pawarena.game.stakes.rule-step1': 'Sebelum menjawab, pasang taruhan: kecil, sedang, atau besar.',
    'pawarena.game.stakes.rule-step2': 'Jawab benar = menang pot; salah = pot hangus.',
    'pawarena.game.stakes.rule-step3': 'Lawan ikut bertaruh — kadang nekat lalu bangkrut. Kumpulkan poin terbanyak.'
  });
}());
