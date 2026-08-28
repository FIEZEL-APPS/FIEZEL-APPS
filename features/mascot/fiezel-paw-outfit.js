/* ============================================================
   FIEZEL PAW — LAPISAN OUTFIT KONTEKSTUAL (G5′)
   Sumber desain mengikat: pau-redesign/systems/19-outfit-system.md
   (amendemen OWNER 2026-08-27: registry outfit terkurasi menggantikan
   larangan-selimut G5) + geometri literal gen_outfit_sheet.py.

   PRINSIP (19 §1.2, §6, §8 — anti-Duolingo, NORMATIF):
   - Registry TERTUTUP & ber-versi: item ada hanya bila punya baris OF-xx.
   - Seleksi = FUNGSI KONTEKS deterministik (state + layar + jam lokal).
     TIDAK ADA pengacak, TIDAK ADA UI ganti-baju, murid tidak pernah
     mendandani PAW.
   - BUKAN ekonomi hadiah: outfit tidak pernah dibeli / di-unlock /
     dimonetisasi. Tidak ada toko gem, tidak ada wardrobe. Outfit adalah
     PENANDA KONTEKS BELAJAR (ransel = perjalanan sesi, toga = milestone
     nyata, bunga = sambutan, topi tidur = istirahat sehat tanpa rasa
     bersalah).
   - Maks SATU item per konteks (hard max 2 hanya untuk seni Large/Full
     tersanksi — TIDAK dipakai lapisan runtime ini).
   - Tidak pernah menutupi organ identitas: wajah, emblem dada, cincin
     ekor (19 §4.3, ditegakkan lewat z-order jangkar + geometri registry).
   - Tangga ukuran: DI BAWAH 88px render → PAW polos tanpa outfit
     (19 §6.5; lantai identitas = PAW telanjang). Tier dikunci saat
     pasang — item tidak pernah "pop" di tengah animasi.
   - Reduced motion: outfit adalah geometri STATIS — tampil identik
     dengan semua gerak mati (19 §6.4). Lapisan ini tidak menambah
     node animasi apa pun.

   WARNA (19 §3): HANYA palet tertutup G1. CATATAN LEAF-GREEN:
   token hijau daun (hex 8A9A5B, "hijau daun" untuk tangkai bunga OF-03)
   masih OWNER-PENDING (19 §3.2) — TIDAK PERNAH dirender sebelum
   sign-off. Bunga tetap TANPA TANGKAI di lapisan ini. Fallback permanen
   bila ditolak: tangkai emas D8B36B. Jangan menambahkan hex itu ke
   berkas ini tanpa baris keputusan OWNER.

   INTEGRASI (impl-01-rig.md): komponen fiezel-mascot.js mengapalkan
   grup jangkar KOSONG (fz-outfit-back sebagai anak pertama fz-all;
   fz-outfit > fz-outfit-head / fz-outfit-front sebagai anak terakhir).
   Lapisan ini menyuntik DOM DARI LUAR komponen — fiezel-mascot.js tidak
   pernah diedit. Divergensi sadar: titik apal rig menaruh fz-outfit di
   ATAS wajah; spec 19 §4.1 menuntut fz-outfit-head DI DALAM fz-head
   sebelum fz-face (supaya alis/organ wajah selalu menimpa item, dan
   item otomatis mengikuti gerak kepala P2 lewat pewarisan transform).
   Maka saat attach, lapisan ini MEMINDAHKAN grup jangkar kosong ke titik
   sisip §4.1 lewat DOM (bukan edit berkas) — idempoten, aman diulang.

   KILL SWITCH: localStorage 'fzPawOutfits' — default ON; nilai
   'off' / '0' / 'false' mematikan seluruh lapisan seketika.
   ============================================================ */
(function (global) {
  'use strict';
  if (!global || !global.document) return;
  if (global.FiezelPawOutfit) return;
  var doc = global.document;

  /* ---------- Palet tertutup G1 (19 §3.1) — tidak ada hex lain ---------- */
  var MAROON = '#8C2233', GOLD = '#D8B36B', BLUSH = '#F0A0AC',
      CREAM = '#FFF4DA', INK = '#33201F';

  /* Ambang tangga ukuran (19 §6.5): di bawah 88px render = PAW polos.
     Ambang bagian-halus: goresan 5px rig baru >= 2px layar pada
     >= 128px render (5 * 128/320 = 2) — di bawahnya tassel toga dibuang. */
  var MIN_PX = 88, FINE_PX = 128;

  /* ============================================================
     REGISTRY TERKURASI (subset 4 item bernilai tertinggi dari 19 §5).
     Geometri = salinan literal gen_outfit_sheet.py (rujukan tunggal),
     koordinat lokal-jangkar = koordinat rig. Matriks pose per 19 §5
     dalam istilah state komponen (08 pose -> 09 state).
     4 item lain (topi, syal, beret, pensil) menunggu gelombang
     berikutnya — menambah item = baris registry baru + keputusan OWNER.
     ============================================================ */
  var REGISTRY = {
    /* OF-01 ransel (dinamai OWNER) — perjalanan sesi belajar. */
    'OF-01': {
      id: 'OF-01', nama: 'ransel',
      slot: {
        back:  '<rect x="84" y="158" width="152" height="92" rx="36" fill="' + GOLD + '"/>' +
               '<circle cx="95" cy="214" r="9" fill="' + MAROON + '"/>' +
               '<circle cx="225" cy="214" r="9" fill="' + MAROON + '"/>',
        /* tali bahu x110-127 / x193-210: BERSIH dari emblem dada
           (bbox glyph x146-174 + margin 6 = x140-180, 19 §4.3-2). */
        front: '<rect x="110" y="182" width="17" height="48" rx="8.5" fill="' + MAROON + '"/>' +
               '<rect x="193" y="182" width="17" height="48" rx="8.5" fill="' + MAROON + '"/>'
      },
      /* Konteks 19 §5: LESSON_START, layar rencana-belajar & materi. */
      konteks: ['lesson-start'],
      layarStudi: ['skills', 'library'],
      /* Pose boleh: walking/idle/looking/pointing. Larang (jumping,
         celebrating, running, sleeping) -> state selebrasi & kantuk. */
      larang: ['celebrating', 'level-up', 'milestone', 'completion', 'sleepy'],
      minPx: MIN_PX /* Medium+ (butuh badan penuh) — Small/Tiny: buang */
    },
    /* OF-03 bunga (dinamai OWNER) — sambutan. TANPA TANGKAI:
       hijau daun (hex 8A9A5B) OWNER-PENDING per 19 §3.2, lihat kepala berkas. */
    'OF-03': {
      id: 'OF-03', nama: 'bunga',
      slot: {
        /* 5 kelopak r11 pada cincin r15 sekitar (222,60) + hati emas r8.
           Selipan telinga KANAN: pusat 12.8px dari pivot telinga (212,52)
           -> ayunan telinga 18 derajat hanya menggeser tepi 4.3px (19 §4.2). */
        head: '<circle cx="222" cy="45" r="11" fill="' + BLUSH + '"/>' +
              '<circle cx="236.3" cy="55.4" r="11" fill="' + BLUSH + '"/>' +
              '<circle cx="230.8" cy="72.1" r="11" fill="' + BLUSH + '"/>' +
              '<circle cx="213.2" cy="72.1" r="11" fill="' + BLUSH + '"/>' +
              '<circle cx="207.7" cy="55.4" r="11" fill="' + BLUSH + '"/>' +
              '<circle cx="222" cy="60" r="8" fill="' + GOLD + '"/>'
      },
      /* Konteks 19 §5: GREETING, WELCOME_BACK, sambutan onboarding. */
      konteks: ['welcome-back'],
      /* Pose boleh: waving/idle/presenting/sitting. Larang running/jumping/sleeping. */
      larang: ['sleepy', 'celebrating', 'level-up', 'milestone'],
      minPx: MIN_PX
    },
    /* OF-05 toga (mandat tugas) — HANYA milestone nyata (anti-inflasi 13). */
    'OF-05': {
      id: 'OF-05', nama: 'toga',
      slot: {
        /* papan wisuda: pita + wajik (dua segitiga) + kancing; tassel =
           bagian halus (goresan 5px) -> dibuang < FINE_PX (19 §6.5 Medium). */
        head: '<rect x="126" y="48" width="68" height="20" rx="10" fill="' + INK + '"/>' +
              '<path d="M94 40 L 160 20 L 226 40 L 160 60 Z" fill="' + INK + '"/>' +
              '<g class="fz-of-fine">' +
              '<path d="M160 40 L 214 62" stroke="' + GOLD + '" stroke-width="5" stroke-linecap="round" fill="none"/>' +
              '<circle cx="214" cy="68" r="7.5" fill="' + GOLD + '"/></g>' +
              '<circle cx="160" cy="38" r="5" fill="' + GOLD + '"/>'
      },
      /* Konteks 19 §5: LEVEL_UP / MILESTONE — hanya selama hold selebrasi
         (kelas st-level-up / st-milestone hidup), lalu lepas sendiri. */
      konteks: ['level-up', 'milestone'],
      /* Pose boleh: celebrating (semua intensitas — kelas lv-1..3 rig adalah
         INTENSITAS selebrasi yang dipinjam koreografi level-up/milestone,
         bukan level evolusi; toga justru harus tetap terpasang di puncaknya),
         presenting, idle, proud hold. Larang: sleeping. */
      larang: ['sleepy'],
      minPx: MIN_PX
    },
    /* OF-08 topi tidur (tambahan kurator 19 §5) — istirahat sehat:
       PAW ikut mengantuk, tidak pernah menyalahkan murid begadang. */
    'OF-08': {
      id: 'OF-08', nama: 'topi-tidur',
      slot: {
        head: '<path d="M118 42 L 202 42 L 234 6 Z" fill="' + MAROON + '"/>' +
              '<rect x="108" y="34" width="106" height="17" rx="8.5" fill="' + CREAM + '"/>' +
              '<circle cx="238" cy="8" r="11" fill="' + GOLD + '"/>'
      },
      /* Konteks 19 §5: sleepy / idle-timeout / "istirahat" larut malam. */
      konteks: ['sleepy'],
      idleMalam: true, /* idle pada jam malam (>=21 atau <5) juga memakai ini */
      /* Larang: SEMUA pose aktif — hanya sleeping/sitting yang sah. */
      larang: ['celebrating', 'level-up', 'milestone', 'completion', 'greeting',
               'welcome-back', 'lesson-start', 'speaking', 'listening'],
      minPx: MIN_PX
    }
  };

  /* Presedensi resolusi 19 §6.1 (deterministik, bukan daftar acak):
     milestone (OF-05) > terikat-state (OF-08) > konteks-sesi (OF-01)
     > ambient (OF-03) > TIDAK ADA (default: PAW polos tetap kanonik). */

  /* ---------- kill switch (default ON) ---------- */
  function enabled() {
    try {
      var v = String(global.localStorage.getItem('fzPawOutfits') || '').toLowerCase();
      return !(v === 'off' || v === '0' || v === 'false');
    } catch (_) { return true; }
  }

  /* ---------- jam lokal (bisa dipaksa oleh QA, tidak pernah oleh produk) ---------- */
  var qa = { hour: null, force: null };
  function jamLokal() {
    if (qa.hour !== null) return qa.hour;
    try { return new Date().getHours(); } catch (_) { return 12; }
  }
  function malam(h) { return h >= 21 || h < 5; }

  /* ---------- state host saat ini (kelas st-* dari komponen) ---------- */
  function stateHost(host) {
    var cl = host.classList;
    for (var i = 0; i < cl.length; i++) {
      if (cl[i].indexOf('st-') === 0) return cl[i].slice(3);
    }
    return 'idle';
  }

  var layarKini = '';

  /* ============================================================
     RESOLVER KONTEKS — outfitFor(state, layar, jam) -> OF-xx | null.
     Deterministik untuk input identik (19 §6.1). Tidak pernah acak.
     ============================================================ */
  function outfitFor(state, layar, jam) {
    if (state === 'listening') return null; /* headphone = penghuni slot KEPALA (19 §6.2) */
    /* 1) tingkat milestone */
    if (state === 'level-up' || state === 'milestone') return 'OF-05';
    /* 2) terikat state */
    if (state === 'sleepy') return 'OF-08';
    if (state === 'idle' && malam(jam)) return 'OF-08'; /* idle-malam ("istirahat") */
    /* 3) konteks sesi */
    if (state === 'lesson-start') return 'OF-01';
    if (state === 'idle' && REGISTRY['OF-01'].layarStudi.indexOf(layar) !== -1) return 'OF-01';
    /* 4) ambient */
    if (state === 'welcome-back') return 'OF-03';
    /* default: TIDAK ADA — PAW polos adalah PAW kanonik */
    return null;
  }

  /* ============================================================
     RE-SEAT JANGKAR — pindahkan grup jangkar kosong rig ke titik sisip
     19 §4.1 (DOM dari luar; idempoten; fiezel-mascot.js TIDAK diedit):
       fz-outfit-head  -> dalam fz-head, SEBELUM fz-face
                          (di depan tengkorak+dasar telinga, DI BELAKANG
                          semua fitur wajah; otomatis ikut translate P2)
       fz-outfit-front -> dalam fz-body, SEBELUM lengan
                          (di depan torso, di bawah lengan — tali fisikal)
       fz-outfit-back  -> dalam fz-all, SETELAH fz-tail sebelum fz-body
                          (di depan ekor, di belakang badan)
     ============================================================ */
  function reseat(host) {
    try {
      var svg = host.querySelector('.fz-svg');
      if (!svg) return null;
      var head = svg.querySelector('.fz-head');
      var face = svg.querySelector('.fz-face');
      var body = svg.querySelector('.fz-body');
      var armL = svg.querySelector('.fz-arm-l');
      var all  = svg.querySelector('.fz-all');
      var tail = svg.querySelector('.fz-tail');
      var oHead = svg.querySelector('.fz-outfit-head');
      var oFront = svg.querySelector('.fz-outfit-front');
      var oBack = svg.querySelector('.fz-outfit-back');
      if (!head || !face || !oHead || !oFront || !oBack) return null;
      if (oHead.parentNode !== head) head.insertBefore(oHead, face);
      if (body && armL && oFront.parentNode !== body) body.insertBefore(oFront, armL);
      if (all && tail && body && oBack.nextElementSibling !== body) all.insertBefore(oBack, body);
      return { head: oHead, front: oFront, back: oBack };
    } catch (_) { return null; }
  }

  /* ---------- ukuran render host (tier dikunci saat pasang, 19 §6.5) ---------- */
  function ukuranHost(host) {
    try {
      var r = host.getBoundingClientRect();
      return Math.min(r.width || 0, (r.height || 0) / 0.9375) || 0;
    } catch (_) { return 0; }
  }

  /* ============================================================
     INJEKTOR — pasang/lepas geometri item pada jangkar satu instance.
     Maks SATU item (19 §6.2): pasang selalu membersihkan semua slot dulu.
     ============================================================ */
  function lepas(host) {
    try {
      var g = reseat(host);
      /* Hanya menulis DOM bila memang ada yang perlu dibersihkan — tulisan
         tanpa perubahan tetap memicu MutationObserver (setAttribute selalu
         mengantre record) dan bisa membentuk umpan-balik tak berujung. */
      if (g) {
        if (g.head.firstChild) g.head.innerHTML = '';
        if (g.front.firstChild) g.front.innerHTML = '';
        if (g.back.firstChild) g.back.innerHTML = '';
      }
      if (host.classList.contains('fz-has-outfit')) host.classList.remove('fz-has-outfit');
      if (host.hasAttribute('data-fz-outfit')) host.removeAttribute('data-fz-outfit');
    } catch (_) { /* lapisan hias tidak pernah melempar ke pemanggil */ }
  }

  function pasang(host, id) {
    try {
      if (!enabled()) { lepas(host); return false; }
      var item = REGISTRY[id];
      if (!item) { lepas(host); return false; }
      if (host.getAttribute('data-fz-outfit') === id) return true; /* sudah terpasang */
      var g = reseat(host);
      if (!g) return false;
      /* tangga ukuran: di bawah minPx = PAW polos (lantai identitas) */
      var px = ukuranHost(host);
      if (px < item.minPx) { lepas(host); return false; }
      g.head.innerHTML = item.slot.head || '';
      g.front.innerHTML = item.slot.front || '';
      g.back.innerHTML = item.slot.back || '';
      /* Medium (88-127px): buang bagian halus (<2px layar) — tassel toga.
         Keputusan tier SEKALI di sini; tidak dievaluasi ulang mid-animasi. */
      if (px < FINE_PX) {
        var halus = host.querySelectorAll('.fz-of-fine');
        for (var i = 0; i < halus.length; i++) halus[i].remove();
      }
      host.classList.add('fz-has-outfit');
      host.setAttribute('data-fz-outfit', id);
      return true;
    } catch (_) { return false; }
  }

  /* ---------- evaluasi ulang satu host dari konteksnya ---------- */
  function segarkan(host) {
    if (!host || !host.isConnected) return;
    if (!enabled()) { lepas(host); return; }
    var st = stateHost(host);
    var id = qa.force !== null ? qa.force : outfitFor(st, layarKini, jamLokal());
    if (id) {
      var item = REGISTRY[id];
      /* matriks larangan pose/state (19 §5): state terlarang = lepas */
      if (item.larang.indexOf(st) !== -1 && qa.force === null) id = null;
    }
    if (id) pasang(host, id); else lepas(host);
  }

  /* ============================================================
     PENEMUAN INSTANCE + OBSERVER — kelas st-* komponen adalah sumber
     kebenaran konteks state; instance Home dicat ulang tiap render,
     jadi observer dokumen memasang ulang otomatis.
     ============================================================ */
  var terpasang = new WeakSet();
  function hosts() {
    try { return Array.prototype.slice.call(doc.querySelectorAll('fiezel-mascot')); }
    catch (_) { return []; }
  }
  /* Tanda-tangan kelas yang RELEVAN saja (awalan st- dan lv-): tulisan kelas oleh
     lapisan ini sendiri (fz-has-outfit) tidak boleh memicu evaluasi ulang,
     kalau tidak observer <-> lepas/pasang saling memberi makan selamanya. */
  function sidikKelas(host) {
    var cl = host.classList, out = [];
    for (var i = 0; i < cl.length; i++) {
      if (cl[i].indexOf('st-') === 0 || cl[i].indexOf('lv-') === 0) out.push(cl[i]);
    }
    return out.sort().join(' ');
  }
  var sidikTerakhir = new WeakMap();
  function attach(host) {
    if (terpasang.has(host)) return;
    terpasang.add(host);
    try {
      sidikTerakhir.set(host, sidikKelas(host));
      new MutationObserver(function () {
        var s = sidikKelas(host);
        if (sidikTerakhir.get(host) === s) return; /* bukan perubahan state/level */
        sidikTerakhir.set(host, s);
        segarkan(host);
      }).observe(host, { attributes: true, attributeFilter: ['class'] });
    } catch (_) { }
    /* komponen mungkin belum meng-upgrade markup-nya — coba lagi 1 frame */
    if (!host.querySelector('.fz-svg')) {
      setTimeout(function () { segarkan(host); }, 60);
    } else segarkan(host);
  }
  function pindai() { hosts().forEach(attach); }

  function mulai() {
    pindai();
    try {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          if (muts[i].addedNodes && muts[i].addedNodes.length) { pindai(); return; }
        }
      }).observe(doc.body || doc.documentElement, { childList: true, subtree: true });
    } catch (_) { }
    try {
      if (global.customElements && global.customElements.whenDefined) {
        global.customElements.whenDefined('fiezel-mascot').then(pindai).catch(function () { });
      }
    } catch (_) { }
  }
  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', mulai, { once: true });
  } else mulai();

  /* ============================================================
     JALUR REDUCED-MOTION — pawReact di app.js digerbangi preferensi
     gerak, jadi kelas st-* tidak pernah berubah saat gerak mati.
     Outfit tetap sah tampil (geometri statis, 19 §6.4): context()
     memasang langsung dan melepas lewat timer berdurasi hold state
     (17 R-2 / 09 §2), tanpa animasi apa pun.
     ============================================================ */
  var HOLD = { 'lesson-start': 1600, 'welcome-back': 2200, 'level-up': 2800, milestone: 3400 };
  var EVENT2STATE = {
    'lesson-start': 'lesson-start', 'welcome-back': 'welcome-back',
    'level-up': 'level-up', milestone: 'milestone', 'idle-timeout': 'sleepy'
  };
  var timerRM = null;
  function context(evt, info) {
    try {
      if (!enabled()) return;
      if (info && info.motion) return; /* gerak hidup: observer kelas yang mengurus */
      var st = EVENT2STATE[String(evt || '')];
      if (evt === 'wake') { hosts().forEach(segarkan); return; }
      if (!st) return;
      var id = outfitFor(st, layarKini, jamLokal());
      if (!id) return;
      hosts().forEach(function (h) { attach(h); pasang(h, id); });
      if (timerRM) clearTimeout(timerRM);
      if (HOLD[st]) { /* sleepy persisten — dilepas oleh 'wake' */
        timerRM = setTimeout(function () { hosts().forEach(segarkan); }, HOLD[st] + 50);
        if (timerRM && typeof timerRM.unref === 'function') timerRM.unref();
      }
    } catch (_) { }
  }

  /* ---------- API publik (corong tunggal, tidak pernah melempar) ---------- */
  global.FiezelPawOutfit = {
    version: '1.0.0',
    /* registry hanya-baca untuk tes/gerbang QA */
    get registry() { return REGISTRY; },
    enabled: enabled,
    /* kill switch instan untuk OWNER: FiezelPawOutfit.kill() */
    kill: function () {
      try { global.localStorage.setItem('fzPawOutfits', 'off'); } catch (_) { }
      hosts().forEach(lepas);
    },
    outfitFor: outfitFor,
    /* dipanggil app.js saat layar berganti (render) */
    screen: function (nama) {
      layarKini = String(nama || '');
      hosts().forEach(function (h) { attach(h); segarkan(h); });
    },
    /* dipanggil app.js dari pawReact SEBELUM gerbang gerak */
    context: context,
    refresh: function () { hosts().forEach(function (h) { attach(h); segarkan(h); }); },
    /* ---- pengait QA SAJA (harness Playwright / gerbang) — bukan UI,
       bukan wardrobe; produk tidak pernah memanggil ini ---- */
    _qaForce: function (id) { qa.force = (id === undefined ? null : id); this.refresh(); },
    _qaHour: function (h) { qa.hour = (h === undefined || h === null) ? null : (h | 0); this.refresh(); }
  };
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : null));
