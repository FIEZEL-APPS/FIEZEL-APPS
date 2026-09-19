/**
 * Klien API bersama untuk Curriculum/Question/Assessment/Learning Engine.
 *
 * ALAMATNYA DARI KONFIGURASI, BUKAN SAME-ORIGIN. Berkas ini dulu memanggil
 * fetch('/api' + path) — "cari backend di domain yang sama". Asumsi itu benar di
 * lingkungan tempat berkas ini lahir (ingress mengarahkan /api ke FastAPI port 8001) dan
 * SALAH di produksi FIEZEL: fiezel.my.id adalah hosting statis, dan owner memeriksanya
 * sendiri pada 7 September 2026 — /api/health menjawab 404, jadi seluruh konsol mati.
 *
 * Backend FIEZEL yang sudah hidup tidak pernah memakai asumsi itu: fiezel-core-worker
 * dipanggil lewat CORE_CONFIG.workerUrl, alamat absolut dari konfigurasi. Berkas ini
 * kini mengikuti pola yang sama, karena pola itu yang terbukti bekerja di produksi ini.
 *
 * Alamat kosong = backend belum dipasang. Panggilan ditolak SEBELUM menyentuh jaringan,
 * dengan kalimat yang menyebut sebabnya - bukan menembak halaman statis lalu memunculkan
 * galat penguraian JSON yang tidak memberi tahu siapa pun apa yang sebenarnya salah.
 */
(function (root) {
  'use strict';
  var TOKEN_KEY = 'fz-engine-token';

  /* Satu pembaca alamat untuk seluruh berkas. Slash di ekor dibuang supaya
     base() + '/auth/login' tidak pernah menghasilkan '//auth/login'. */
  function base() {
    try {
      var c = root.FIEZEL_CURRICULUM_CONFIG || {};
      return String(c.curriculumApiUrl || '').trim().replace(/\/$/, '');
    } catch (_) { return ''; }
  }

  function token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; } }
  function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (_) {} }

  function api(path, opts) {
    opts = opts || {};
    var headers = { 'Accept': 'application/json' };
    if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (token()) headers['Authorization'] = 'Bearer ' + token();
    var akar = base();
    if (!akar) {
      /* Gagal cepat dan jujur. Ini satu-satunya tempat yang tahu alamatnya kosong, jadi
         di sinilah kalimatnya harus lahir. */
      return Promise.reject(new Error(
        'Konsol kurikulum belum dikonfigurasi: alamat backend (curriculumApiUrl) masih kosong di core-config.js.'));
    }
    return fetch(akar + '/api' + path, {
      method: opts.method || (opts.body ? 'POST' : 'GET'),
      credentials: 'include',
      headers: headers,
      body: opts.body instanceof FormData ? opts.body : (opts.body ? JSON.stringify(opts.body) : undefined)
    }).then(function (r) {
      var ct = r.headers.get('content-type') || '';
      var p = ct.indexOf('json') !== -1 ? r.json() : r.text();
      return p.then(function (data) {
        if (!r.ok) {
          var detail = data && data.detail;
          var msg = typeof detail === 'string' ? detail
            : Array.isArray(detail) ? detail.map(function (e) { return e.msg || JSON.stringify(e); }).join(' ')
            : detail && detail.message ? detail.message : ('Gagal (' + r.status + ')');
          var err = new Error(msg); err.status = r.status; err.data = data; throw err;
        }
        return data;
      });
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m];
    });
  }

  function toast(text) {
    var el = document.createElement('div');
    el.className = 'toast'; el.setAttribute('data-testid', 'toast'); el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }

  function pct(v) { return v == null ? '—' : Math.round(v) + '%'; }

  /* ---------------------------------------------------------------- KelasKu

     SATU pintu, dua langkah, dan langkah pertamanya TIDAK menyentuh mesin
     kurikulum sama sekali:

       1. minta tiket ke Worker KelasKu (`credentials:'include'`, karena
          identitasnya hidup di cookie HttpOnly yang hanya peramban yang bisa
          mengirimkannya);
       2. serahkan tiket itu ke mesin kurikulum, yang menukarnya dengan sesinya
          sendiri.

     Kenapa dua langkah dan bukan satu: cookie KelasKu terikat domain
     .fiezel.my.id dan tidak akan pernah terkirim ke mesin kurikulum yang berdiri
     di domain lain. Yang menyeberang karena itu bukan cookie, melainkan
     pernyataan sekali-pakai berumur dua menit tentang siapa pemegangnya.

     Alamat Worker dibaca dari FIEZEL_CF_CONFIG — konfigurasi yang SAMA yang
     dipakai KelasKu sendiri (features/auth/fiezel-account.js). Menyalin alamatnya
     ke berkas ini akan melahirkan sumber kedua yang bisa menyimpang diam-diam. */

  /* Naskah pintu KelasKu lahir dua bahasa (copy-id-kelasku.js + copy-th-kelasku.js).
     FiezelI18n.t() mengembalikan KUNCINYA saat naskahnya belum termuat — dan halaman
     konsol memang tidak memuat lapisan i18n hari ini — jadi pembungkus ini mengembalikan
     kalimat cadangan Indonesia, bukan nama kunci. Guru tidak boleh membaca
     'kelasku.belum-masuk' di layarnya. */
  function t(kunci, cadangan) {
    var s;
    try { var I = root.FiezelI18n; s = I && I.t ? I.t(kunci) : undefined; } catch (_) {}
    return (s === undefined || s === kunci) ? cadangan : s;
  }

  function kelaskuBase() {
    try {
      var c = root.FIEZEL_CF_CONFIG || {};
      if (c.enabled === false) return '';
      return String(c.base || '').trim().replace(/\/$/, '');
    } catch (_) { return ''; }
  }

  function ambilTiket() {
    var akar = kelaskuBase();
    if (!akar) {
      return Promise.reject(new Error(t('kelasku.belum-tersambung',
        'Akun KelasKu belum tersambung di aplikasi ini.') +
        ' (FIEZEL_CF_CONFIG kosong atau dimatikan)'));
    }
    return fetch(akar + '/api/account/curriculum-ticket', {
      method: 'POST', credentials: 'include', mode: 'cors', cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }, body: '{}'
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (data) {
        if (r.status === 401) {
          throw new Error(t('kelasku.belum-masuk',
            'Kamu belum masuk KelasKu. Masuk dulu di aplikasi FIEZEL, lalu kembali ke sini.'));
        }
        if (r.status === 503) {
          throw new Error(t('kelasku.jembatan-mati',
            'Jembatan KelasKu belum dinyalakan di server.') + ' (CURRICULUM_TICKET_KEY)');
        }
        if (!r.ok || !data || !data.ticket) {
          throw new Error(t('kelasku.tiket-gagal', 'Gagal mengambil tiket KelasKu.'));
        }
        return { ticket: data.ticket, subjectId: data.subjectId || null, gradeId: data.gradeId || null };
      });
    });
  }

  function masukKelasKu(classCode) {
    return ambilTiket().then(function (ticketData) {
      var tStr = typeof ticketData === 'string' ? ticketData : (ticketData && ticketData.ticket);
      return api('/auth/kelasku', { body: { ticket: tStr, class_code: classCode || null } }).then(function (u) {
        if (ticketData && ticketData.subjectId && !u.subjectId && !u.subject_id) {
          u.subjectId = ticketData.subjectId;
        }
        if (ticketData && ticketData.gradeId && !u.gradeId && !u.grade_id) {
          u.gradeId = ticketData.gradeId;
        }
        setToken(u.access_token);
        return u;
      });
    });
  }

  root.FZEngine = {
    api: api, esc: esc, toast: toast, pct: pct, token: token, setToken: setToken,
    kelaskuBase: kelaskuBase,
    login: {
      /* Guru DAN murid memakai jalan yang sama. Bedanya hanya satu: murid boleh
         menyertakan kode kelas, dan peran keduanya datang dari D1 KelasKu —
         tidak ada tempat di klien yang bisa menaikkan peran seseorang. */
      kelasku: masukKelasKu,
      me: function () { return api('/auth/me'); },
      joinClass: function (code) { return api('/auth/join-class', { body: { class_code: code } }); },
      logout: function () { return api('/auth/logout', { method: 'POST', body: {} }).then(function () { setToken(''); }); }
    },

    /* PENYEMAI BANK KURIKULUM.
       Modul penyemai di sisi server (seed_english.py, di layanan FastAPI yang terpisah —
       jalurnya sengaja tidak dieja di sini: berkas ini DIKAPALKAN ke murid, dan gerbang
       deploy-site menolak sumber aplikasi yang menyebut direktori yang tidak ikut terbit,
       karena rujukan semacam itu berakhir sebagai 404 senyap di produksi)
       membangun Kurikulum Merdeka Bahasa Inggris utuh —
       Fase A–F, Kelas 1–12, 72 TP, 144 kompetensi — dan sudah punya endpoint sejak
       lama. Yang tidak pernah ada adalah PEMANGGILNYA: nol antarmuka di seluruh
       klien menyentuh /seed/english, jadi kurikulum lengkap itu duduk di kode tanpa
       pernah sampai ke MongoDB siapa pun. Owner melihat konsol berisi 11 kompetensi
       demo Matematika dan menyimpulkan bahwa mata pelajarannya belum lengkap — ia benar,
       dan sebabnya bukan isi yang kurang melainkan pintu yang tidak ada.

       `status` sengaja TANPA kredensial (backend pun tidak menuntutnya): ia hanya
       menghitung simpul, dan bisa dibuka langsung di peramban untuk memeriksa bank
       tanpa harus lolos pintu guru lebih dulu. */
    seed: {
      english: function () { return api('/seed/english', { body: {} }); },
      englishStatus: function () { return api('/seed/english/status'); },
      mapel: function () { return api('/seed/mapel', { body: {} }); },
      mapelStatus: function () { return api('/seed/mapel/status'); },
      soal: function () { return api('/seed/soal', { body: {} }); },
      soalStatus: function () { return api('/seed/soal/status'); }
    },
    curriculum: {
      tree: function (subjectId) { return api('/curriculum/tree' + (subjectId ? '?subject_id=' + encodeURIComponent(subjectId) : '')); },
      nodes: function (subjectId) { return api('/curriculum/nodes' + (subjectId ? '?subject_id=' + encodeURIComponent(subjectId) : '')); },
      competencies: function (subjectId) { return api('/curriculum/competencies' + (subjectId ? '?subject_id=' + encodeURIComponent(subjectId) : '')); }
    }
  };
})(window);
