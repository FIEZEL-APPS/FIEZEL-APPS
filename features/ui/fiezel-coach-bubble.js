/**
 * FIEZEL m025-115 - pembimbing yang hadir di segala arah, bukan panel laporan.
 *
 * Brief redesign OWNER, bagian 7 (prioritas tinggi):
 *
 *   "FIEZEL harus terasa seperti guru pembimbing yang hadir di segala arah navigasi user -
 *    bukan satu panel yang hanya muncul di Home dan harus dibaca sebagai teks laporan.
 *    Wujud yang disarankan: elemen mengambang (floating bubble/avatar) yang persisten dan
 *    bisa diakses dari halaman mana pun. Interaksinya harus terasa adaptif & percakapan
 *    (menyapa sesuai konteks halaman yang sedang dibuka, memberi dorongan singkat, bukan
 *    paragraf analisis panjang). Kontennya (evidence, estimated level, diagnosis) boleh
 *    tetap ada sebagai data di baliknya - tapi cara penyampaiannya yang diubah."
 *
 * Tiga keputusan yang menentukan berkas ini:
 *
 * 1. Gelembungnya HIDUP TERPISAH dari layar. Ia dipasang sekali ke <body> dan tidak pernah
 *    ikut dicat ulang saat halaman berganti - itulah bedanya "hadir di segala arah" dengan
 *    "ada di setiap halaman". Yang berubah saat navigasi hanya konteksnya.
 *
 * 2. Ia tetap berguna saat AI tidak bisa dihubungi. Sapaan dan dorongan singkat disusun
 *    LOKAL dari data yang sudah ada di perangkat (level, streak, ritme hari ini, halaman
 *    yang sedang dibuka). AI dipakai hanya ketika murid benar-benar bertanya. Pembimbing
 *    yang diam begitu sinyal hilang bukan pembimbing.
 *
 * 3. Yang disapa selalu SATU kalimat. Panjangnya dibatasi di sini, bukan diserahkan pada
 *    kemurahan hati model - karena persis paragraf panjang itulah yang dikeluhkan owner.
 */
(function (global) {
  'use strict';

  var doc = global.document;
  if (!doc) return;

  var MAX_PEEK = 96;      /* satu kalimat; sisanya dipotong pada batas kata */
  var PEEK_MS = 7000;     /* sapaan mengambang menghilang sendiri */
  var LOG_LIMIT = 40;
  var ASK_TIMEOUT = 12000; /* lewat ini, jawaban lokal yang menjawab */

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function oneLine(text) {
    var clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= MAX_PEEK) return clean;
    var cut = clean.slice(0, MAX_PEEK);
    var space = cut.lastIndexOf(' ');
    return (space > 40 ? cut.slice(0, space) : cut).replace(/[.,;:]$/, '') + '…';
  }

  function icon(name) {
    var lib = global.FiezelIcons;
    return lib && lib.markup ? lib.markup(name) : '';
  }

  /* ------------------------------------------------------------------ *
   * Sapaan lokal. Satu kalimat, gaya bahasa FIEZEL dipertahankan apa adanya
   * (brief bagian 2: "Tone of voice TIDAK berubah").
   * ------------------------------------------------------------------ */
  var PAGE_LINES = {
    home: ['Mau mulai dari mana hari ini?', 'Gue udah siapin rencana hari ini, tinggal jalan.'],
    vocab: ['Kata baru itu kayak koin — dikumpulin dikit-dikit.', 'Review dulu yang hampir lupa, baru tambah baru.'],
    grammar: ['Salah di grammar itu wajar, yang penting ngerti kenapanya.', 'Satu pola dulu, jangan borong semua.'],
    reading: ['Baca pelan-pelan, ga usah kejar cepet.', 'Ketuk kalimat yang bikin bingung, gue jelasin.'],
    listening: ['Dengerin dua kali sebelum lihat teksnya, ya.', 'Ga nangkep? Wajar. Ulang sekali lagi.'],
    speaking: ['Ngomong aja dulu, salah itu bagian dari latihan.', 'Ga ada yang dengerin selain kamu dan gue.'],
    writing: ['Tulis dulu apa adanya, rapihnya belakangan.', 'Dikit tapi jadi, lebih baik daripada panjang tapi ga selesai.'],
    skills: ['Speaking sama Listening paling cepat naik kalau rutin.', 'Lima menit di sini udah kehitung, kok.'],
    library: ['Cerita pendek dulu aja, biar ga kebanyakan mikir.', 'Ketuk kalimatnya kalau mau lihat artinya.'],
    classroom: ['Materi ini ada subtitle Indonesianya, tenang.', 'Pilih topik yang paling bikin penasaran.'],
    progress: ['Ini peta kemampuanmu — bukan rapor.', 'Yang merah bukan aib, itu yang bakal kita kerjain.'],
    test: ['Jawab apa adanya, ini buat ngukur, bukan buat nilai.', 'Ga usah tegang, ga ada yang lihat.']
  };

  function localGreeting(ctx) {
    var c = ctx || {};
    if (c.streak && c.streak >= 3) return 'Runtun ' + c.streak + ' hari. Jangan putus hari ini ya.';
    if (c.dueReviews) return c.dueReviews + ' materi nunggu review — itu yang paling cepat naikin skor.';
    var lines = PAGE_LINES[c.view] || PAGE_LINES.home;
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function localAnswer(ctx, question) {
    var c = ctx || {};
    var q = String(question || '').toLowerCase();
    if (/level|kemampuan|skor|nilai/.test(q)) {
      return 'Level estimasi kamu sekarang ' + (c.level || 'A1') + '. Itu dari bukti latihan yang udah masuk, bukan tebakan — makin sering latihan, makin akurat.';
    }
    if (/mulai|belajar apa|hari ini|rencana/.test(q)) {
      return 'Hari ini paling enak mulai dari ' + (c.focusLabel || 'latihan singkat') + '. Sepuluh soal aja, ga usah lama.';
    }
    if (/streak|runtun/.test(q)) {
      return 'Runtun kamu ' + (c.streak || 0) + ' hari. Lima jawaban bermakna udah cukup buat jaga hari ini.';
    }
    return 'Gue lagi ga bisa nyambung ke otak AI-nya (butuh login Puter + internet). Tapi latihannya jalan terus kok — mau gue temenin mulai dari mana?';
  }

  /* ------------------------------------------------------------------ *
   * Pemasangan
   * ------------------------------------------------------------------ */
  function install(options) {
    var opts = options || {};
    if (global.__fiezelCoachBubble) return global.__fiezelCoachBubble;

    var context = {};
    var log = [];
    var peekTimer = null;
    var busy = false;

    var bubble = doc.createElement('button');
    bubble.type = 'button';
    bubble.className = 'fz-coach-bubble';
    bubble.setAttribute('aria-label', 'Buka pembimbing FIEZEL');
    bubble.innerHTML = '<span class="fz-coach-pulse" aria-hidden="true"></span>' +
      '<span class="fz-i fz-coach-face" aria-hidden="true">' + icon('coach') + '</span>';

    var peek = doc.createElement('div');
    peek.className = 'fz-coach-peek';
    peek.hidden = true;
    peek.setAttribute('role', 'status');

    var sheet = doc.createElement('div');
    sheet.className = 'fz-coach-sheet';
    sheet.hidden = true;
    sheet.innerHTML =
      '<div class="fz-coach-panel" role="dialog" aria-modal="true" aria-label="Pembimbing FIEZEL">' +
        '<div class="fz-coach-head">' +
          '<span class="fz-coach-avatar"><span class="fz-i fz-coach-face" aria-hidden="true">' + icon('coach') + '</span></span>' +
          '<span><b>FIEZEL</b><small class="fz-coach-status">pembimbing kamu</small></span>' +
          '<button type="button" class="fz-coach-close" aria-label="Tutup">✕</button>' +
        '</div>' +
        '<div class="fz-coach-log" aria-live="polite"></div>' +
        '<div class="fz-coach-chips"></div>' +
        '<form class="fz-coach-form">' +
          '<textarea rows="1" placeholder="Tanya apa aja…" aria-label="Tanya FIEZEL"></textarea>' +
          '<button type="submit" class="fz-coach-send" aria-label="Kirim">→</button>' +
        '</form>' +
      '</div>';

    doc.body.appendChild(peek);
    doc.body.appendChild(bubble);
    doc.body.appendChild(sheet);

    var logHost = sheet.querySelector('.fz-coach-log');
    var chipHost = sheet.querySelector('.fz-coach-chips');
    var form = sheet.querySelector('.fz-coach-form');
    var input = sheet.querySelector('textarea');
    var statusEl = sheet.querySelector('.fz-coach-status');

    function paintLog() {
      logHost.innerHTML = log.map(function (entry) {
        return '<div class="fz-coach-msg is-' + (entry.who === 'user' ? 'user' : 'coach') + '">' +
          entry.html + '</div>';
      }).join('');
      logHost.scrollTop = logHost.scrollHeight;
    }

    function push(who, text, isHtml) {
      log.push({ who: who, html: isHtml ? text : '<p>' + esc(text) + '</p>' });
      if (log.length > LOG_LIMIT) log = log.slice(-LOG_LIMIT);
      paintLog();
    }

    function chips() {
      var view = context.view || 'home';
      var list = [
        { label: 'Aku harus mulai dari mana?', q: 'Aku harus mulai belajar dari mana hari ini?' },
        { label: 'Level aku sekarang?', q: 'Level kemampuan aku sekarang di mana?' }
      ];
      if (view === 'grammar') list.unshift({ label: 'Kenapa aku salah terus di sini?', q: 'Kenapa aku sering salah di grammar? Jelaskan singkat.' });
      if (view === 'vocab') list.unshift({ label: 'Cara inget kata baru?', q: 'Gimana cara cepat inget kosakata baru?' });
      if (view === 'writing') list.unshift({ label: 'Cek tulisanku dong', q: 'Tolong cek tulisan bahasa Inggrisku dan kasih satu perbaikan paling penting.' });
      if (view === 'speaking' || view === 'listening' || view === 'skills') {
        list.unshift({ label: 'Tips biar cepat lancar?', q: 'Kasih satu tips singkat biar speaking dan listening cepat lancar.' });
      }
      chipHost.innerHTML = list.slice(0, 3).map(function (c) {
        return '<button type="button" class="fz-coach-chip" data-q="' + esc(c.q) + '">' + esc(c.label) + '</button>';
      }).join('');
    }

    function showPeek(text) {
      if (sheet.hidden === false) return;
      peek.textContent = oneLine(text);
      peek.hidden = false;
      clearTimeout(peekTimer);
      peekTimer = setTimeout(function () { peek.hidden = true; }, PEEK_MS);
    }

    function open() {
      peek.hidden = true;
      sheet.hidden = false;
      doc.body.classList.add('fz-coach-open');
      if (!log.length) push('coach', localGreeting(context));
      chips();
      setTimeout(function () { input.focus(); }, 60);
    }

    function close() {
      sheet.hidden = true;
      doc.body.classList.remove('fz-coach-open');
    }

    async function ask(question) {
      var text = String(question || '').trim();
      if (!text || busy) return;
      busy = true;
      push('user', text);
      input.value = '';
      statusEl.textContent = 'lagi mikir…';
      try {
        // Pembimbing tidak boleh membuat murid menunggu lama. Jalur AI aplikasi punya
        // batas waktunya sendiri yang panjang (wajar untuk penjelasan panjang di modal);
        // di percakapan, menunggu setengah menit sama saja dengan tidak dijawab. Lewat
        // 12 detik, jawaban lokal yang diberikan - dan itu tetap jawaban.
        var answer = typeof opts.ask === 'function'
          ? await Promise.race([
              opts.ask(text, context),
              new Promise(function (resolve) { setTimeout(function () { resolve(null); }, ASK_TIMEOUT); })
            ])
          : null;
        push('coach', answer && String(answer).trim() ? String(answer) : localAnswer(context, text));
      } catch (error) {
        push('coach', localAnswer(context, text));
      } finally {
        statusEl.textContent = 'pembimbing kamu';
        busy = false;
      }
    }

    bubble.addEventListener('click', function () { sheet.hidden ? open() : close(); });
    peek.addEventListener('click', open);
    sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });
    sheet.querySelector('.fz-coach-close').addEventListener('click', close);
    chipHost.addEventListener('click', function (e) {
      var chip = e.target.closest && e.target.closest('.fz-coach-chip');
      if (chip) ask(chip.getAttribute('data-q'));
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input.value); }
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) close(); });

    var api = {
      open: open,
      close: close,
      ask: ask,
      element: bubble,
      /** Dipanggil app.js tiap kali layar berganti. Sapaannya hanya muncul kalau
       *  halamannya memang berganti - menyapa ulang di halaman yang sama itu berisik. */
      update: function (next) {
        var previousView = context.view;
        context = Object.assign({}, context, next || {});
        if (context.view && context.view !== previousView) {
          chips();
          if (!sheet.hidden) return;
          showPeek(localGreeting(context));
        }
      },
      say: function (text) { showPeek(text); },
      context: function () { return Object.assign({}, context); }
    };

    global.__fiezelCoachBubble = api;
    return api;
  }

  global.FiezelCoachBubble = { install: install, oneLine: oneLine, localGreeting: localGreeting, localAnswer: localAnswer };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.FiezelCoachBubble;
})(typeof self !== 'undefined' ? self : this);
