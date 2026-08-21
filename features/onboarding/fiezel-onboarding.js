/**
 * FIEZEL — onboarding enam langkah (Step 1-6 pada sheet `FIEZEL_Design_Handoff_Detail.pdf`).
 *
 * Salinan teks di sini diambil apa adanya dari sheet. Yang TIDAK diambil apa adanya adalah
 * janji yang tidak dipegang produk, dan bedanya ditulis terbuka:
 *
 * - Sheet menulis "Tes penempatan singkat". Tes penempatan FIEZEL berisi 150 soal, dan itu
 *   tidak singkat. Judulnya tetap seperti desain, tetapi jumlah soal yang sebenarnya
 *   disebutkan di kartunya. Menyebut 150 soal "singkat" adalah kebohongan kecil yang akan
 *   ditagih murid pada soal ke-30.
 * - Langkah 5 tidak memasang pemilih jam. FIEZEL belum punya jadwal yang diatur pengguna:
 *   pengingatnya dipilih mesin ALRS dari bukti belajar, dan target harian dihitung dari
 *   bukti juga. Memasang pemilih jam yang tidak tersambung ke apa pun hanya akan menjadi
 *   tombol palsu. Yang ditampilkan adalah apa yang benar-benar terjadi.
 *
 * Tiga batas yang dijaga, sama seperti splash dan dengan alasan yang sama:
 *
 * 1. TIDAK PERNAH MENGURUNG. Setiap langkah punya "Lewati dulu", dan melewati berarti
 *    selesai - onboarding tidak akan kembali menghadang. Notifikasi wajib di produk ini dan
 *    gerbangnya ada di bawah lapisan ini; apa pun yang bisa tertinggal di layar adalah bug.
 * 2. SEKALI SAJA, bukan sekali sehari. Sapaan yang terus datang berubah jadi penghalang.
 * 3. TIDAK MENYENTUH KEADAAN APLIKASI SENDIRI. Modul ini hanya memanggil balik
 *    (`onGoal`, `onPlacement`, `onFinish`) yang diberikan pemanggil, sehingga bisa diuji
 *    tanpa aplikasi dan tidak bisa diam-diam merusak state belajar.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelOnboarding = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STORAGE_KEY = 'fiezel-onboarding-v1';

  // Nilai `goal` di sini adalah profil tujuan yang BENAR-BENAR dikenal modul perjalanan
  // belajar. IELTS dan TOEFL sama-sama memetakan ke `exam_foundation` karena prasyarat
  // kemampuannya memang satu; yang membedakan keduanya adalah `track`, dan track itu dipakai
  // untuk label yang dilihat murid. FIEZEL tidak pernah memprediksi skor keduanya.
  var TRACKS = Object.freeze({
    ielts: { id: 'ielts', label: 'IELTS', goal: 'exam_foundation', icon: 'bar-chart-3' },
    toefl: { id: 'toefl', label: 'TOEFL', goal: 'exam_foundation', icon: 'headphones' }
  });

  var STEPS = Object.freeze([
    Object.freeze({
      index: 1, pose: 'hero', poseWidth: 180,
      title: 'Selamat datang di FIEZEL!',
      body: 'Hai! Aku temanmu belajar di FIEZEL. Yuk, siap-siap!',
      action: 'next', cta: 'Lanjut'
    }),
    Object.freeze({
      index: 2, pose: 'belajar', poseWidth: 170,
      title: 'Belajar jadi lebih seru',
      body: 'Latihan kosakata, grammar, reading, dan listening semua ada di sini!',
      action: 'next', cta: 'Lanjut'
    }),
    Object.freeze({
      index: 3, pose: 'mengintip', poseWidth: 120,
      title: 'Pilih tujuan belajarmu',
      body: 'Mau kejar target IELTS atau TOEFL dulu nih?',
      action: 'track', secondary: 'Nanti saja',
      // Catatan yang tidak boleh hilang dari layar ini: roadmap melarang prediksi skor.
      note: 'FIEZEL tidak memprediksi skor. Yang ditampilkan hanya prasyarat kemampuan.'
    }),
    Object.freeze({
      index: 4, pose: 'menulis', poseWidth: 170,
      title: 'Tes penempatan singkat',
      body: 'Kerjakan santai aja, ini bukan ujian — cuma buat aku kenal kemampuanmu.',
      action: 'placement', cta: 'Mulai tes penempatan', secondary: 'Nanti saja',
      // Angka yang sebenarnya, bukan kesan yang enak didengar.
      note: 'Isinya 150 soal dan bisa kamu hentikan kapan saja.'
    }),
    Object.freeze({
      index: 5, pose: 'jadwal', poseWidth: 150,
      title: 'Atur jadwal & pengingat',
      body: 'Aku ingetin kamu belajar ya, biar streak-nya nggak putus.',
      action: 'next', cta: 'Siap',
      note: 'Pengingat sudah aktif. Waktunya aku pilih dari kebiasaan belajarmu, bukan dari jam tetap.'
    }),
    Object.freeze({
      index: 6, pose: 'siap', poseWidth: 170,
      title: 'Semua siap!',
      body: 'Yuk mulai langkah pertamamu. Kamu bisa!',
      action: 'finish', cta: 'Mulai Belajar'
    })
  ]);

  var SKIP_LABEL = 'Lewati dulu';

  function normalizeTrack(value) {
    var key = String(value || '').toLowerCase();
    return Object.prototype.hasOwnProperty.call(TRACKS, key) ? TRACKS[key] : null;
  }

  function readRecord(env) {
    try {
      var store = env && env.localStorage;
      if (!store || typeof store.getItem !== 'function') return null;
      var raw = JSON.parse(String(store.getItem(STORAGE_KEY) || 'null'));
      return raw && typeof raw === 'object' ? raw : null;
    } catch (_) { return null; }
  }

  /** Sudah pernah selesai ATAU pernah dilewati. Keduanya berarti jangan menghadang lagi. */
  function completed(env) {
    var record = readRecord(env);
    return !!(record && record.done === true);
  }

  function markCompleted(env, detail) {
    try {
      var store = env && env.localStorage;
      if (!store || typeof store.setItem !== 'function') return;
      store.setItem(STORAGE_KEY, JSON.stringify({
        done: true,
        at: Number(detail && detail.at) || 0,
        via: String((detail && detail.via) || 'finish'),
        track: String((detail && detail.track) || '')
      }));
    } catch (_) { /* penyimpanan penuh tidak boleh mengurung murid di onboarding */ }
  }

  function prefersReducedMotion(env) {
    try {
      return !!(env && env.matchMedia && env.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) { return false; }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function dotsMarkup(active) {
    var out = '';
    for (var i = 0; i < STEPS.length; i++) {
      out += '<span class="fiezel-ob-dot' + (i === active ? ' is-active' : '') + '"></span>';
    }
    return '<div class="fiezel-ob-dots" aria-hidden="true">' + out + '</div>';
  }

  /**
   * Tombol satu langkah.
   *
   * `data-ob-advance` SELALU berarti "maju satu langkah", dan `data-ob-primary` berarti
   * "kerjakan aksi langkah ini". Pemisahan itu bukan gaya penulisan: tanpa tombol maju
   * tersendiri, murid yang belum mau mengerjakan tes penempatan atau belum punya target ujian
   * tidak akan pernah sampai ke langkah 5 dan 6 - satu-satunya jalannya adalah keluar.
   */
  function actionsMarkup(step) {
    var out = '';
    if (step.action === 'track') {
      out += '<div class="fiezel-ob-tracks">'
        + '<button type="button" class="fiezel-ob-track is-primary" data-ob-track="ielts">' + escapeHtml(TRACKS.ielts.label) + '</button>'
        + '<button type="button" class="fiezel-ob-track" data-ob-track="toefl">' + escapeHtml(TRACKS.toefl.label) + '</button>'
        + '</div>';
    } else if (step.action === 'next') {
      out += '<button type="button" class="fiezel-ob-cta" data-ob-advance>' + escapeHtml(step.cta) + '</button>';
    } else {
      out += '<button type="button" class="fiezel-ob-cta" data-ob-primary>' + escapeHtml(step.cta) + '</button>';
    }
    if (step.secondary) {
      out += '<button type="button" class="fiezel-ob-secondary" data-ob-advance>' + escapeHtml(step.secondary) + '</button>';
    }
    return out;
  }

  /** Markup satu langkah. Murni: tidak menyentuh DOM, sehingga gate bisa memeriksanya utuh. */
  function stepMarkup(env, index) {
    var step = STEPS[Math.min(Math.max(0, Number(index) || 0), STEPS.length - 1)];
    var mascot = env && env.FiezelMascot;
    var art = mascot && typeof mascot.markup === 'function'
      ? mascot.markup({ pose: step.pose, width: step.poseWidth, decorative: true })
      : '';
    return '<div class="fiezel-ob-card" data-ob-step="' + step.index + '">'
      + '<span class="fiezel-ob-badge">' + step.index + '</span>'
      + '<h2 class="fiezel-ob-title">' + escapeHtml(step.title) + '</h2>'
      + '<p class="fiezel-ob-body">' + escapeHtml(step.body) + '</p>'
      + '<div class="fiezel-ob-art fiezel-ob-art-' + step.pose + '">' + art + '</div>'
      + actionsMarkup(step)
      + (step.note ? '<p class="fiezel-ob-note">' + escapeHtml(step.note) + '</p>' : '')
      + dotsMarkup(step.index - 1)
      + '<button type="button" class="fiezel-ob-skip" data-ob-skip>' + escapeHtml(SKIP_LABEL) + '</button>'
      + '</div>';
  }

  /**
   * Menampilkan onboarding. Mengembalikan `{shown, reason}` supaya pemanggil dan gate tahu
   * apa yang terjadi, bukan menebaknya dari efek samping.
   *
   * @param {object} env global tempat DOM dan modul maskot berada
   * @param {{now?:number, force?:boolean, onGoal?:Function, onPlacement?:Function, onFinish?:Function}} options
   */
  function show(env, options) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var opts = options || {};
    var now = Number(opts.now) || 0;
    var doc = target.document;
    if (!doc || typeof doc.createElement !== 'function') return { shown: false, reason: 'no_document' };
    if (!target.FiezelMascot) return { shown: false, reason: 'mascot_unavailable' };
    if (opts.force !== true && completed(target)) return { shown: false, reason: 'completed' };

    var host = doc.createElement('div');
    host.className = 'fiezel-ob';
    if (prefersReducedMotion(target)) host.className += ' fiezel-ob-still';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-label', 'Perkenalan FIEZEL');

    var index = 0;
    var chosenTrack = '';
    var closed = false;

    function paint() {
      host.innerHTML = stepMarkup(target, index);
      bind();
    }

    function finish(via) {
      if (closed) return;
      closed = true;
      markCompleted(target, { at: now, via: via, track: chosenTrack });
      try { host.classList.add('is-leaving'); } catch (_) {}
      if (typeof target.setTimeout === 'function') target.setTimeout(remove, 260);
      else remove();
    }

    function remove() {
      try { if (host.parentNode) host.parentNode.removeChild(host); } catch (_) {}
    }

    function advance() {
      if (index >= STEPS.length - 1) {
        finish('finish');
        if (typeof opts.onFinish === 'function') { try { opts.onFinish({ track: chosenTrack }); } catch (_) {} }
        return;
      }
      index += 1;
      paint();
    }

    function chooseTrack(value) {
      var track = normalizeTrack(value);
      if (!track) return;
      chosenTrack = track.id;
      if (typeof opts.onGoal === 'function') {
        try { opts.onGoal({ track: track.id, label: track.label, goal: track.goal }); } catch (_) {}
      }
      advance();
    }

    function startPlacement() {
      // Tes penempatan mengambil alih seluruh layar. Onboarding harus SELESAI dulu, bukan
      // menunggu di belakangnya - lapisan yang tertinggal di atas kuis adalah jebakan.
      finish('placement');
      if (typeof opts.onPlacement === 'function') { try { opts.onPlacement({ track: chosenTrack }); } catch (_) {} }
    }

    function bind() {
      try {
        var advanceBtn = host.querySelector ? host.querySelector('[data-ob-advance]') : null;
        if (advanceBtn) advanceBtn.addEventListener('click', advance);
        var primary = host.querySelector ? host.querySelector('[data-ob-primary]') : null;
        if (primary) {
          primary.addEventListener('click', STEPS[index].action === 'placement' ? startPlacement : advance);
        }
        var skip = host.querySelector ? host.querySelector('[data-ob-skip]') : null;
        if (skip) skip.addEventListener('click', function () { finish('skip'); });
        var tracks = host.querySelectorAll ? host.querySelectorAll('[data-ob-track]') : [];
        for (var i = 0; i < tracks.length; i++) {
          (function (button) {
            button.addEventListener('click', function () {
              chooseTrack(button.getAttribute ? button.getAttribute('data-ob-track') : '');
            });
          })(tracks[i]);
        }
      } catch (_) { /* tanpa listener, tombol lewati di markup tetap ada untuk pemuatan ulang */ }
    }

    paint();
    try { doc.body.appendChild(host); } catch (_) { return { shown: false, reason: 'append_failed' }; }

    return {
      shown: true,
      element: host,
      close: function () { finish('close'); },
      stepIndex: function () { return index; }
    };
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    STEPS: STEPS,
    TRACKS: TRACKS,
    SKIP_LABEL: SKIP_LABEL,
    normalizeTrack: normalizeTrack,
    completed: completed,
    stepMarkup: stepMarkup,
    show: show
  };
});
