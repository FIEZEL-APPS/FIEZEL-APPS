/**
 * FIEZEL — features/curriculum/fiezel-curriculum-inbox.js
 * KOTAK MASUK KURIKULUM: kuis yang guru terbitkan akhirnya sampai ke KelasKu.
 * ==========================================================================
 *
 * MASALAH YANG DITUTUP DI SINI (m025-349, temuan X4).
 *
 * Guru membuka Kurikulum & Kompetensi, menyusun blueprint, menekan "🚀 Terbitkan Kuis
 * untuk Murid" — dan kuisnya mendarat di backend kurikulum, tempat tidak ada satu pun
 * layar murid yang melihatnya. Murid membuka KelasKu, tab Tugas kosong, dan menyimpulkan
 * gurunya belum mengirim apa-apa.
 *
 * Sebabnya struktural, bukan bug: ada DUA jalur tugas yang tidak pernah bertemu.
 *   - Jalur KelasKu: guru -> D1 -> `fiezel-learner-assignments-v1`. Penulisnya di seluruh
 *     repo hanya `fiezel-teacher-store.js` dan `fiezel-tutor-action-center.js`.
 *   - Jalur kurikulum: guru -> MongoDB `assessments` -> hanya terlihat di misi.html.
 *
 * ==========================================================================
 * KENAPA MODUL INI TIDAK MENULIS KE `fiezel-learner-assignments-v1`
 * ==========================================================================
 * Itu cara yang paling cepat terlihat benar dan paling cepat rusak. Tugas di kunci itu
 * membawa `itemIds` yang menunjuk bank soal LOKAL, dan runner KelasKu menyelesaikannya
 * lewat `FiezelReviewBank.byId()`. Asesmen kurikulum tidak punya butir lokal: soalnya
 * hidup di server, dipilih adaptif per murid saat sesi berjalan, lengkap dengan petunjuk
 * bertingkat dan diagnosis miskonsepsi. Menyalinnya menjadi tugas lokal berarti membuat
 * kartu yang, begitu diketuk, membuka runner yang tidak menemukan satu soal pun.
 *
 * Jadi yang dibawa modul ini adalah KABARNYA, bukan isinya: kuis itu muncul di tempat
 * murid benar-benar melihat (tab Tugas KelasKu), lalu menyerahkannya ke mesin yang memang
 * bisa menjalankannya (misi.html). Satu kabar, satu pintu, nol soal yang dikarang.
 *
 * ==========================================================================
 * GAGAL DENGAN DIAM
 * ==========================================================================
 * Backend kurikulum adalah layanan terpisah yang bisa mati, belum dipasang, atau menolak
 * tiket. Tidak satu pun dari itu boleh merusak tab Tugas — yang isinya tugas dari jalur
 * KelasKu dan tidak ada hubungannya. Setiap kegagalan di sini berakhir sebagai daftar
 * kosong, dan daftar kosong berarti bagian ini tidak dicetak sama sekali.
 */
(function (root) {
  'use strict';
  if (!root) return;

  var CACHE_KEY = 'fiezel-curriculum-inbox-v1';
  var SEGAR_MS = 5 * 60 * 1000;   /* Di bawah ini, jawaban tersimpan dipakai apa adanya. */
  var BASI_MS = 24 * 60 * 60 * 1000; /* Di atas ini, jawaban tersimpan tidak dipercaya lagi. */
  var sedangAmbil = null;

  function bacaCache() {
    try {
      var v = JSON.parse(localStorage.getItem(CACHE_KEY));
      return v && Array.isArray(v.missions) ? v : null;
    } catch (_) { return null; }
  }
  function tulisCache(v) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch (_) {}
  }

  /* Alamat backend kosong = fitur ini tidak ada. Sama persis dengan syarat yang membuka
     pintu konsol guru dan pintu misi adaptif; satu pagar, bukan tiga. */
  function siap() {
    try {
      var c = root.FIEZEL_CURRICULUM_CONFIG || {};
      return !!String(c.curriculumApiUrl || '').trim();
    } catch (_) { return false; }
  }

  function fzEngineSah(E) {
    return !!(E && typeof E.api === 'function' && E.login && typeof E.login.kelasku === 'function');
  }

  function pastikanFzEngine() {
    if (fzEngineSah(root.FZEngine)) return Promise.resolve(root.FZEngine);
    if (typeof document === 'undefined') return Promise.reject(new Error('no document'));
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      var ver = root.FIEZEL_PAGE_BUILD || ('v' + Date.now());
      s.src = './features/curriculum/fz-api.js?v=' + encodeURIComponent(ver);
      s.onload = function () {
        if (fzEngineSah(root.FZEngine)) resolve(root.FZEngine);
        else reject(new Error('FZEngine tidak lengkap'));
      };
      s.onerror = function () { reject(new Error('fz-api.js gagal dimuat')); };
      document.head.appendChild(s);
    });
  }

  function kodeKelas() {
    try { return String((JSON.parse(localStorage.getItem('fiezel-onboarding-v1')) || {}).classCode || ''); }
    catch (_) { return ''; }
  }

  /* Bentuk yang dipakai layar. Sengaja sempit: hanya yang benar-benar dicetak, supaya
     perubahan bentuk jawaban server tidak merembet ke markup. */
  function rapikan(m) {
    if (!m || !m.assessment_id) return null;
    var sesi = m.session || null;
    return {
      id: String(m.assessment_id),
      title: String(m.title || ''),
      typeLabel: m.type_label ? String(m.type_label) : '',
      type: m.type ? String(m.type) : '',
      goals: Array.isArray(m.goal) ? m.goal.filter(Boolean).map(String).slice(0, 3) : [],
      deadline: m.deadline || null,
      minutes: Number(m.minutes) || 0,
      questionCount: Number(m.question_count) || 0,
      /* `state` server: BELUM ADA sesi = belum disentuh; ada = sedang/selesai. */
      started: !!sesi,
      finished: !!(sesi && String(sesi.state || '').toUpperCase() === 'FINISHED'),
      answered: sesi ? (Number(sesi.answered) || 0) : 0
    };
  }

  /**
   * Kabar terbaru dari backend kurikulum, atau daftar kosong.
   * Tidak pernah menolak (reject): pemanggilnya adalah layar, dan layar tidak boleh
   * pecah karena layanan lain sedang mati.
   */
  function refresh() {
    if (!siap()) return Promise.resolve({ missions: [], dueReviews: 0, at: 0 });
    if (sedangAmbil) return sedangAmbil;
    sedangAmbil = pastikanFzEngine().then(function (E) {
      var masuk = E.token() ? Promise.resolve() : E.login.kelasku(kodeKelas() || undefined);
      return masuk.then(function () { return E.api('/learning/today'); });
    }).then(function (data) {
      var hasil = {
        missions: ((data && data.missions) || []).map(rapikan).filter(Boolean),
        dueReviews: ((data && data.due_reviews) || []).length,
        at: Date.now()
      };
      tulisCache(hasil);
      return hasil;
    }).catch(function () {
      /* Jawaban tersimpan masih berguna sampai batas basi: guru menerbitkan kuis jauh
         lebih jarang daripada murid membuka aplikasinya, jadi kabar kemarin hampir
         selalu masih benar hari ini. */
      var c = bacaCache();
      if (c && Date.now() - (c.at || 0) < BASI_MS) return c;
      return { missions: [], dueReviews: 0, at: 0 };
    }).then(function (hasil) {
      sedangAmbil = null;
      return hasil;
    });
    return sedangAmbil;
  }

  /** Jawaban seketika untuk render: cache kalau ada, kosong kalau belum pernah. */
  function snapshot() {
    if (!siap()) return { missions: [], dueReviews: 0, at: 0 };
    return bacaCache() || { missions: [], dueReviews: 0, at: 0 };
  }

  /** Perlu diambil ulang? Dipakai layar supaya tidak menembak server tiap kali dicat. */
  function perluRefresh() {
    if (!siap()) return false;
    var c = bacaCache();
    return !c || (Date.now() - (c.at || 0)) > SEGAR_MS;
  }

  root.FiezelCurriculumInbox = {
    CACHE_KEY: CACHE_KEY,
    siap: siap,
    refresh: refresh,
    snapshot: snapshot,
    perluRefresh: perluRefresh,
    _rapikan: rapikan
  };
})(typeof window !== 'undefined' ? window : null);
