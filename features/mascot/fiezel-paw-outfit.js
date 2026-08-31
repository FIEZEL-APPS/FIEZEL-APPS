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
     nyata, bunga = sambutan, pensil = tata bahasa, syal = membaca,
     topi = mengarang).
   - Maks SATU item per konteks; hard max 2 HANYA untuk kombo tersanksi
     19 §6.2 (OF-01+OF-03) dan HANYA di Large/Full >= 120px.
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
  /* Ambang kombo (19 §6.2 + tabel tangga §6.5): dua item hanya sah di
     Large/Full >= 120px. Di bawahnya kombo luruh jadi item pertamanya. */
  var COMBO_PX = 120;

  /* ============================================================
     REGISTRY TERKURASI dari 19 §5. Geometri = koordinat rig literal
     (rujukan tunggal gen_outfit_sheet.py / 19 §5), matriks pose per
     19 §5 dalam istilah state komponen (08 pose -> 09 state).
     Isi 2026-08-31: OF-01 ransel, OF-02 topi, OF-03 bunga, OF-04 syal,
     OF-05 toga, OF-07 pensil. OF-06 beret belum dipesan OWNER; OF-08
     topi tidur DICABUT (lihat baris keputusan di bawah).
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
      /* (layarStudi dicabut 2026-08-31: peta LAYAR di bawah yang memutuskan
         layar mana memakai ransel, jadi dua sumber kebenaran tidak dibiarkan
         hidup berdampingan.) */
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
    /* OF-08 topi tidur DIHAPUS SEPENUHNYA (OWNER 2026-08-31: "mascot pakai topi tidur
       hilangkan sepenuhnya dari aplikasi"). Ia bukan dinonaktifkan lewat bendera - barisnya
       dicabut dari registry, dan kedua cabang yang memanggilnya dicabut dari resolver, jadi
       tidak ada jalan tersisa yang bisa memunculkannya kembali.
       Sebab ia sering terlihat: resolver memasangnya untuk state 'sleepy' DAN untuk idle di
       jam malam (>=21 atau <5). Owner bermain pukul 01.50-02.17, jadi hampir setiap layar
       memakainya. Yang hilang bersamanya cuma isyarat "istirahat"; identitas PAW polos tetap
       kanonik dan itu memang default sistem ini. */

    /* OF-02 topi (dinamai OWNER) — geometri 19 §5 baris OF-02. */
    'OF-02': {
      id: 'OF-02', nama: 'topi',
      slot: {
        /* kubah = lingkaran (160,68) r56 dipotong y<=66 -> busur setengah;
           brim menghadap KANAN (x152-246) supaya siluetnya terbaca topi, bukan helm. */
        head: '<path d="M104 66 A56 56 0 0 1 216 66 Z" fill="' + MAROON + '"/>' +
              '<rect x="152" y="52" width="94" height="16" rx="8" fill="' + MAROON + '" transform="rotate(4 199 60)"/>' +
              '<circle cx="160" cy="16" r="6.5" fill="' + GOLD + '"/>'
      },
      konteks: ['writing'],
      /* 19 §5: dilarang sleeping dan listening (bentrok slot KEPALA dengan headphone). */
      larang: ['sleepy', 'listening', 'celebrating', 'level-up', 'milestone'],
      minPx: MIN_PX
    },
    /* OF-04 syal (tambahan kurator) — geometri 19 §5 baris OF-04, DIKURANGI
       juntainya. Baris keputusan (2026-08-31, diverifikasi render di 124px DAN
       156px): titik sisip §4.1 menaruh fz-outfit-front di dalam fz-body SEBELUM
       lengan, jadi lengan menimpa juntai. Di pose DUDUK yang dipakai aplikasi,
       lengan dan kaki menelan seluruh juntai dan yang tersisa cuma ujungnya
       yang mengintip di bawah telapak — terbaca sebagai NODA MERAH MUDA LEPAS,
       bukan syal. Lembar bukti 19 §5 digambar dalam pose berdiri, jadi di sana
       masalahnya tidak kelihatan.
       Yang dipertahankan adalah pita lehernya: itulah bagian yang mengatakan
       "syal", ia bersih di semua ukuran, dan ia tidak menyentuh satu pun organ
       identitas. Mengembalikan juntai butuh pose berdiri, bukan angka baru. */
    'OF-04': {
      id: 'OF-04', nama: 'syal',
      slot: {
        front: '<rect x="112" y="168" width="96" height="24" rx="12" fill="' + BLUSH + '"/>'
      },
      konteks: ['reading'],
      /* 19 §5: dilarang jumping/running/celebrating (juntai butuh fisika). */
      larang: ['celebrating', 'level-up', 'milestone', 'completion', 'sleepy'],
      minPx: MIN_PX
    },
    /* OF-07 pensil (tambahan kurator) — geometri 19 §5 baris OF-07. */
    'OF-07': {
      id: 'OF-07', nama: 'pensil',
      slot: {
        /* selipan telinga KIRI, grup berputar -28 derajat di (100,48):
           badan + penghapus + ujung kayu + grafit. */
        head: '<g transform="rotate(-28 100 48)">' +
              '<rect x="76" y="42" width="60" height="12" rx="5.5" fill="' + GOLD + '"/>' +
              '<rect x="64" y="42" width="12" height="12" rx="4" fill="' + BLUSH + '"/>' +
              '<path d="M130 42 L 146 48 L 130 54 Z" fill="' + CREAM + '"/>' +
              '<g class="fz-of-fine"><path d="M140 46 L 146 48 L 140 50 Z" fill="' + INK + '"/></g>' +
              '</g>'
      },
      konteks: ['grammar'],
      /* 19 §5: dilarang celebrating/jumping/running (benda terselip akan terbang). */
      larang: ['celebrating', 'level-up', 'milestone', 'completion', 'sleepy', 'listening'],
      minPx: MIN_PX
    }
  };

  /* ============================================================
     PETA LAYAR -> OUTFIT (OWNER 2026-08-31, kalimat aslinya:
     "SESI TEST KEMAMPUAN PAKAI MASCOT OF-01 RANSEL DAN OF-03 BUNGA,
      GRAMMAR OF-07 PENSIL, READING OF-04 SYAL, WRITING OF-02 TOPI,
      SISANYA SESUAIKAN SAJA, LISTENING SUDAH BENAR PAKAI HEADSET,
      JANGAN DIUBAH LAGI").

     Nama kunci = state.view di app.js (VALID_VIEWS), dikirim lewat
     FiezelPawOutfit.screen(state.view) tiap render.

     Empat baris pertama adalah instruksi harfiah OWNER. Sisanya
     "disesuaikan" dari makna item, bukan diacak:
       home      -> bunga  (sambutan; sama dengan state welcome-back)
       vocab     -> ransel (perjalanan satu dek kosakata)
       classroom -> topi   (masuk kelas)
       skills/library/progress -> ransel (perjalanan sesi, dan slot
                    KEPALA sengaja dibiarkan kosong di skills)

     TIDAK TERDAFTAR = tanpa outfit, dan itu disengaja:
       listening / speaking  headphone (fz-acc) adalah penghuni slot
                             KEPALA — 19 §6.2 melarang item kepala
                             kedua, dan OWNER menyuruh listening tidak
                             disentuh lagi.
       online / ask / search  bukan layar belajar.

     Presedensi resolusi 19 §6.1 (deterministik, bukan daftar acak):
     milestone (OF-05) > peta layar > konteks-sesi (OF-01) > ambient
     (OF-03) > TIDAK ADA (default: PAW polos tetap kanonik).
     ============================================================ */
  var LAYAR = {
    test:      ['OF-01', 'OF-03'], /* kombo tersanksi 19 §6.2 */
    grammar:   'OF-07',
    reading:   'OF-04',
    writing:   'OF-02',
    home:      'OF-03',
    vocab:     'OF-01',
    classroom: 'OF-02',
    skills:    'OF-01',
    library:   'OF-01',
    progress:  'OF-01'
  };

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
    /* 1) tingkat milestone — toga tetap menang atas apa pun (anti-inflasi 13) */
    if (state === 'level-up' || state === 'milestone') return 'OF-05';
    /* 2) peta layar OWNER — inilah yang membuat tiap sesi punya pakaian
       tetap, bukan pakaian yang berganti-ganti mengikuti jam atau mood. */
    if (LAYAR[layar]) return LAYAR[layar];
    /* 3) konteks sesi (hanya untuk layar yang tidak ada di peta) */
    if (state === 'lesson-start') return 'OF-01';
    /* 4) ambient */
    if (state === 'welcome-back') return 'OF-03';
    /* default: TIDAK ADA — PAW polos adalah PAW kanonik.
       Tidak ada lagi cabang jam-malam: dulu di sinilah OF-08 topi tidur
       dipasang untuk state 'sleepy' dan untuk idle pukul >=21 / <5, dan
       itulah sebabnya ia muncul hampir di tiap layar bagi OWNER yang
       belajar dini hari. Kedua cabang itu DICABUT, bukan dimatikan. */
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
     Maks SATU item, atau DUA bila kombo itu tersanksi (19 §6.2):
     pasang selalu membersihkan semua slot dulu.
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

  /* Normalisasi id -> daftar item yang BOLEH dipakai bersama.
     Aturan 19 §6.2 ditegakkan di sini, bukan dititipkan ke pemanggil:
       - dua item hanya sah di Large/Full (>= COMBO_PX);
       - dua item hanya sah bila slotnya tidak bertabrakan (dilarang dua
         penghuni slot KEPALA — headphone termasuk penghuni kepala, maka
         resolver sudah memulangkan null untuk state 'listening');
       - lebih dari dua: dipangkas, cap-nya keras.
     Kombo yang tidak lolos LURUH jadi item pertamanya, tidak dibuang —
     supaya layar Tes tetap berransel di ponsel kecil. */
  function daftarItem(id, px) {
    var ids = Array.isArray(id) ? id.slice(0, 2) : [id];
    var out = [], dipakai = {}, i, it;
    for (i = 0; i < ids.length; i++) {
      it = REGISTRY[ids[i]];
      if (!it) continue;
      if (px < it.minPx) continue;
      if (out.length) {
        if (px < COMBO_PX) break;                       /* kombo butuh Large/Full */
        if (bentrokSlot(dipakai, it)) continue;         /* slot sudah dihuni */
      }
      tandaiSlot(dipakai, it);
      out.push(it);
    }
    return out;
  }
  function bentrokSlot(dipakai, item) {
    return (item.slot.head && dipakai.head) || (item.slot.front && dipakai.front) ||
           (item.slot.back && dipakai.back);
  }
  function tandaiSlot(dipakai, item) {
    if (item.slot.head) dipakai.head = 1;
    if (item.slot.front) dipakai.front = 1;
    if (item.slot.back) dipakai.back = 1;
  }

  function pasang(host, id) {
    try {
      if (!enabled()) { lepas(host); return false; }
      /* tangga ukuran dihitung DULU: ia ikut menentukan berapa item yang sah */
      var px = ukuranHost(host);
      var pakai = daftarItem(id, px);
      if (!pakai.length) { lepas(host); return false; }
      var kunci = pakai.map(function (x) { return x.id; }).join('+');
      if (host.getAttribute('data-fz-outfit') === kunci) return true; /* sudah terpasang */
      var g = reseat(host);
      if (!g) return false;
      var slot = { head: '', front: '', back: '' };
      for (var k = 0; k < pakai.length; k++) {
        slot.head += pakai[k].slot.head || '';
        slot.front += pakai[k].slot.front || '';
        slot.back += pakai[k].slot.back || '';
      }
      g.head.innerHTML = slot.head;
      g.front.innerHTML = slot.front;
      g.back.innerHTML = slot.back;
      /* Medium (88-127px): buang bagian halus (<2px layar) — tassel toga.
         Keputusan tier SEKALI di sini; tidak dievaluasi ulang mid-animasi. */
      if (px < FINE_PX) {
        var halus = host.querySelectorAll('.fz-of-fine');
        for (var i = 0; i < halus.length; i++) halus[i].remove();
      }
      host.classList.add('fz-has-outfit');
      host.setAttribute('data-fz-outfit', kunci);
      return true;
    } catch (_) { return false; }
  }

  /* ---------- evaluasi ulang satu host dari konteksnya ---------- */
  function segarkan(host) {
    if (!host || !host.isConnected) return;
    if (!enabled()) { lepas(host); return; }
    var st = stateHost(host);
    var id = qa.force !== null ? qa.force : outfitFor(st, layarKini, jamLokal());
    /* matriks larangan pose/state (19 §5): saring PER ITEM, supaya kombo
       yang separuhnya terlarang menanggalkan bagian itu saja — bukan
       menelanjangi PAW seluruhnya. */
    if (id && qa.force === null) {
      var sah = (Array.isArray(id) ? id : [id]).filter(function (x) {
        var item = REGISTRY[x];
        return item && item.larang.indexOf(st) === -1;
      });
      id = sah.length === 0 ? null : sah.length === 1 ? sah[0] : sah;
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
