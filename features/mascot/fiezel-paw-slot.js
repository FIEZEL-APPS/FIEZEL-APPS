/* ============================================================================
   features/mascot/fiezel-paw-slot.js — [FASE 7] LAPISAN SLOT PAW PANEL
   Sumber desain: pau-redesign/systems/12-lesson-layer.md (mengikat) +
   implementation/code-plan.md Fase 7 (errata nama: resmi fz-paw-*, bukan fz-pau-*).

   Lapisan ini TIDAK menggambar PAW dan TIDAK menambah state. Ia hanya:
   1. memutuskan hadir/absen + anchor per permukaan & breakpoint SEBELUM cat
      (invarian C3 — nol CLS; slot tidak pernah disisipkan/dicabut di layar hidup);
   2. mengembalikan markup slot pemesan-ruang yang tembus-pointer (C1) berisi
      SATU <fiezel-mascot> kanonis (aturan E5 — tidak ada salinan rig kedua);
   3. mengawinkan tiga event pelajaran yang selama ini yatim (audit 03 Tugas D):
      question-shown / hover-answer / answer-picked — dipancarkan lewat corong
      `emit` yang DISUNTIK pemanggil (app.js meneruskan pawReact, jadi gerbang
      kurangi-gerak & preferensi animasinya tetap SATU pintu).

   Ukuran tier TIDAK ditulis inline di sini — ia milik CSS (style.css bagian
   [FASE 7]) lewat media query, supaya rotasi/resize di antara dua render tidak
   membuat JS dan CSS berselisih soal ruang yang sudah dipesan.
   2026-08-29 overhaul I14 (O3 §9 usulan skala): PENGECUALIAN terukur — plafon
   responsif. Bila tier CSS akan memakan >22% tinggi viewport (jendela pendek),
   slot menulis --fz-paw-size inline yang LEBIH KECIL (lantai 48px) saat render.
   Ini keputusan per-cat seperti anchor (decide() memang sudah membaca viewport);
   nilainya beku sepanjang hidup slot → nol CLS, dan dievaluasi ulang di cat
   berikutnya persis seperti anchor. Tier CSS tetap satu-satunya sumber ukuran
   NORMAL; inline hanya muncul untuk mengecilkan, tidak pernah membesarkan.
   ============================================================================ */
(function (global) {
  'use strict';
  if (!global || !global.document) return;

  /* Kelas anchor per 12-lesson §2a. Corner disiapkan untuk pemakai berikutnya,
     kuis memakai peek/above/side sesuai tabel keputusan §4. */
  var ANCHOR_CLASS = {
    above: 'fz-paw-above',
    peek: 'fz-paw-peek',
    side: 'fz-paw-side',
    cornerL: 'fz-paw-corner is-l',
    cornerR: 'fz-paw-corner is-r'
  };

  /* Varian enter dari fiezel-motion.css (Fase 3): peek naik dari balik tepi
     kartu (fzMEnterPeek — kotak slot memotong badan, jadi "muncul" gratis),
     above bangkit-menetap (fzMEnterRise), side masuk dari sisi kanan
     (fzMEnterSlideX via .fz-m-enter-slide-r). Exit tidak dipasang di sini:
     slot hidup sampai render berikutnya (C3 — kotak tidak pernah dicabut). */
  var ENTER_CLASS = {
    above: 'fz-m-enter-rise',
    peek: 'fz-m-enter-peek',
    side: 'fz-m-enter-slide-r'
  };

  function mascotReady() {
    try { return !!(global.FiezelPaw && typeof global.FiezelPaw.ready === 'function' && global.FiezelPaw.ready()); }
    catch (_) { return false; }
  }

  /* Keputusan anchor per permukaan+breakpoint (tabel §2d, garis potong repo
     640/860/980; landscape pendek = sumbu tegak langka, hanya peek).
     Permukaan yang TIDAK terdaftar mengembalikan null — flashcard, hub, layar
     error, dan toast memang ABSEN per tabel §4 ("PAW yang jarang adalah PAW
     yang kuat"); pemanggilnya sudah tidak memanggil plan() untuk itu. */
  /* 2026-08-29 I14: plafon ukuran responsif (lihat catatan header). Mengembalikan
     0 bila tier CSS sudah muat (tanpa inline), atau ukuran clamp >= 48. Peek tidak
     di-clamp: 56/48 sudah tangga terkecil dan kotaknya memotong badan. */
  function sizeClamp(anchor, w, h) {
    var tier = anchor === 'side' ? 148 : anchor === 'above' ? (w >= 980 ? 120 : w >= 860 ? 108 : 88) : 0;
    if (!tier || !h) return 0;
    var headroom = (anchor === 'above' && w >= 980) ? 32 : 20;
    var cap = Math.floor((h * 0.22 - headroom) / 0.9375);
    return cap >= tier ? 0 : Math.max(48, cap);
  }

  function decide(surface, opts) {
    var w = Math.max(0, global.innerWidth || 0);
    var h = Math.max(0, global.innerHeight || 0);
    var shortLandscape = w > h && h < 480;

    if (surface === 'empty-state') {
      /* Layar buntu (belum ada materi): A · 88 (120 desktop lewat CSS),
         pose menyemangati — penempatan baru bernilai tertinggi (audit 03 A.2). */
      if (shortLandscape) return null; /* §2d: tidak ada apa pun di atas panel */
      return { anchor: 'above', pose: 'encouraging', size: sizeClamp('above', w, h) };
    }
    if (surface === 'quiz-question') {
      /* 2026-08-29 I14 (O3 §7): jenis soal menghidupkan kosakata yang tepat —
         soal berbacaan memakai POSE 'reading' (buku terbuka; geometri statis dari
         pustaka pose, BUKAN state — poseKind memberi tahu wire() untuk applyPose,
         karena setState('reading') hanya akan console.warn lalu diam); soal
         listening memakai STATE 'listening' yang hanya berarti di jalur statis
         (bingkai beku "menyimak") — saat gerak hidup, state listening dinyalakan
         app.js pada momen audio BERBUNYI (listening-start/-stop), bukan saat cat. */
      var kind = (opts && opts.kind) || '';
      var pose = kind === 'reading' ? 'reading' : kind === 'listening' ? 'listening' : 'curious';
      var poseKind = kind === 'reading';
      /* Kartu soal kuis: above di ponsel & tablet, kolom samping desktop.
         2026-08-31 (OWNER: "mascotnya terlalu kecil, space di bawah masih terlalu
         kosong"): ponsel tegak DULU memakai 'peek' - hanya puncak kepala yang muncul
         dari balik tepi kartu, sengaja dipotong karena "cap paw adalah tanda, bukan
         karakter". Keputusan itu masuk akal ketika kartu soal memenuhi layar; ia tidak
         lagi masuk akal sekarang, karena di bawah kartu tersisa ~400px kosong dan yang
         mengisi layar justru ketiadaan. 'above' memakai markup yang sama dan tidak
         dipotong, jadi tokohnya utuh - dan ukurannya dinaikkan lewat CSS shell kuis.
         shortLandscape TETAP tanpa maskot sama sekali (§2d): di sana tinggi layar
         benar-benar langka dan tokoh setinggi apa pun akan memakan soal.
         wire() menargetkan '.fz-paw-slot fiezel-mascot' tanpa peduli anchor, jadi
         reaksi benar/salah tidak tersentuh perubahan ini. */
      var anchor = shortLandscape ? 'peek' : w < 980 ? 'above' : 'side';
      return { anchor: anchor, pose: pose, poseKind: poseKind, size: sizeClamp(anchor, w, h) };
    }
    return null;
  }

  /* Markup slot: kotak pemesan-ruang + satu maskot kanonis. Pose st-<pose>
     dicap di markup supaya pose benar sejak cat pertama (pola onboarding
     fiezel-onboarding.js) — connectedCallback menimpanya ke idle, maka wire()
     memulihkannya untuk jalur kurangi-gerak (lihat bawah). */
  function slotMarkup(plan, motion) {
    var enter = motion ? ' ' + (ENTER_CLASS[plan.anchor] || '') : '';
    /* st-<pose> hanya untuk STATE (kelas koreografi CSS); pose pustaka tidak punya
       kelas st-* — wire() memulihkannya lewat applyPose (I14). */
    var still = !motion && plan.pose && !plan.poseKind ? ' st-' + plan.pose : '';
    /* 2026-08-29 I14: gaya inline per-cat — plafon ukuran (lihat header) dan retune
       top kolom samping: top:96px CSS ditala terhadap topbar global yang kini
       DISEMBUNYIKAN body.fz-lesson-mode (impl/07 §8 butir 2) → 80px. */
    var styles = [];
    if (plan.size) styles.push('--fz-paw-size:' + plan.size + 'px');
    if (plan.anchor === 'side') styles.push('top:80px');
    return '<div class="fz-paw-slot ' + ANCHOR_CLASS[plan.anchor] +
      (motion ? '' : ' is-static') + '" data-fz-pose="' + plan.pose + '"' +
      (plan.poseKind ? ' data-fz-pose-kind="pose"' : '') +
      (styles.length ? ' style="' + styles.join(';') + '"' : '') +
      ' aria-hidden="true"><fiezel-mascot class="fz-paw-panel' + still + enter +
      '"></fiezel-mascot></div>';
  }

  /* [ADAPTASI] OA-7 §4 baris ENTRANCE: paw_appear menemani KELAHIRAN slot — entrance
     sungguhan, bukan tiap ganti soal. Kunci sekali-per-sesi = activeSession milik app
     (wire() dipanggil ulang tiap soal, tapi sesinya satu). Layar buntu tidak bersesi,
     jadi ia berbunyi per mount — jatah ≥8 dtk antar-bunyi milik manifest tetap menjaga.
     Permukaan kuis DITUNDA 650 ms supaya berurutan dengan lesson_start (0,66 dtk) yang
     dibunyikan app.js pada momen yang sama — dua kejadian berurutan, bukan bertumpuk
     (14 §3.1 aturan 5). Hanya saat motion hidup: pop tanpa animasi kelahiran adalah
     bunyi yatim (14 §3.1 aturan 3). */
  var lastEntranceKey = null;
  function entranceSound(ctx, motion) {
    if (!motion) return;
    var sfx = global.FiezelUiSfx;
    if (!sfx || typeof sfx.play !== 'function') return;
    var isQuiz = !!(ctx.options && typeof ctx.options.addEventListener === 'function');
    if (isQuiz) {
      var key = 'quiz:tanpa-sesi';
      try {
        var st = typeof global.__getFiezelState === 'function' ? global.__getFiezelState() : null;
        var ses = st && st.activeSession;
        if (ses && (ses.id || ses.startedAt)) key = 'quiz:' + (ses.id || ses.startedAt);
      } catch (_) { }
      if (key === lastEntranceKey) return;
      lastEntranceKey = key;
      global.setTimeout(function () {
        try { sfx.play('paw_appear', global); } catch (_) { }
      }, 650);
    } else {
      try { sfx.play('paw_appear', global); } catch (_) { }
    }
  }

  var FiezelPawSlot = {
    /**
     * plan(surface, opts) → rencana render atau null.
     * null berarti: slot TIDAK PERNAH ada pada cat ini (komponen belum siap,
     * atau permukaannya memang absen). Tanpa ikon cadangan pada skala panel —
     * cap paw adalah tanda, bukan karakter (12 §1; code-plan §7.3).
     * Rencana: { anchor, pose, shellClass, cardClass, above, peek, side } —
     * hanya SATU dari above/peek/side yang berisi markup; sisanya string kosong,
     * jadi template pemanggil bisa menaruh ketiganya tanpa cabang.
     */
    plan: function (surface, opts) {
      if (!mascotReady()) return null;
      var d = decide(surface, opts);
      if (!d) return null;
      var motion = !opts || opts.motion !== false;
      var html = slotMarkup(d, motion);
      return {
        anchor: d.anchor,
        pose: d.pose,
        /* kolom samping dipesan oleh grid pada shell (C3) */
        shellClass: d.anchor === 'side' ? ' has-paw-side' : '',
        /* ruang telinga peek dipesan lewat margin-top kartu (C3) */
        cardClass: d.anchor === 'peek' ? 'has-paw-peek' : '',
        above: d.anchor === 'above' ? html : '',
        peek: d.anchor === 'peek' ? html : '',
        side: d.anchor === 'side' ? html : ''
      };
    },

    /**
     * wire(ctx) — perilaku siklus soal + pose statis. Semua opsional:
     *   { stem, options, emit, isLocked, motion, root }
     * emit = pawReact milik app.js (gerbang kurangi-gerak SATU pintu);
     * isLocked = kunci teardown kuis (answer.locked) — tidak ada reaksi yang
     * boleh menyala saat kunci terpasang (12 §3b).
     */
    wire: function (ctx) {
      ctx = ctx || {};
      var root = ctx.root || global.document;
      var motion = ctx.motion !== false;
      var emit = typeof ctx.emit === 'function' ? ctx.emit : function () { return false; };
      var isLocked = typeof ctx.isLocked === 'function' ? ctx.isLocked : function () { return false; };

      /* Bunyi kelahiran slot — dievaluasi SEBELUM cabang kurangi-gerak di bawah,
         tapi entranceSound sendiri diam saat motion mati (lihat komentarnya). */
      entranceSound(ctx, motion);

      /* Kurangi-gerak: maskot slot dibekukan pada pose konteksnya. setState
         dipanggil pada INSTANCE slot saja (preseden onboarding :729) — corong
         global akan ikut mem-pose gelembung pembimbing, dan itu bukan haknya. */
      if (!motion) {
        try {
          var stills = root.querySelectorAll('.fz-paw-slot.is-static fiezel-mascot');
          for (var i = 0; i < stills.length; i++) {
            var el = stills[i];
            var par = el.parentElement;
            var pose = (par && par.getAttribute('data-fz-pose')) || 'idle';
            /* I14: pose pustaka (data-fz-pose-kind="pose") lewat applyPose —
               setState untuk nama pose hanya console.warn lalu diam. */
            if (par && par.getAttribute('data-fz-pose-kind') === 'pose' && typeof el.applyPose === 'function') el.applyPose(pose);
            else if (typeof el.setState === 'function') el.setState(pose, { hold: 0 });
          }
        } catch (_) { /* pose beku gagal = tetap idle, tidak pernah melempar */ }
        return;
      }

      /* 2026-08-29 I14: konteks pose (soal berbacaan → 'reading'). Pose dipasang
         pada instance slot dan question-shown TIDAK dipancarkan untuk cat ini:
         reaksi curious akan me-reset rig (_rigReset) dan menghapus pose beberapa
         ratus ms setelah tampil. Reaksi hover/answer berikutnya BOLEH menghapusnya
         — murid sudah bergerak dari membaca ke menjawab, itu busur yang benar. */
      var posed = false;
      try {
        var slots = root.querySelectorAll('.fz-paw-slot fiezel-mascot');
        for (var p = 0; p < slots.length; p++) {
          var pp = slots[p].parentElement;
          if (pp && pp.getAttribute('data-fz-pose-kind') === 'pose' && typeof slots[p].applyPose === 'function') {
            slots[p].applyPose(pp.getAttribute('data-fz-pose'));
            posed = true;
          }
        }
      } catch (_) { }

      /* Soal tampil → tatap batang soal (curious + lookAt, 12 §3a baris 1). */
      if (!posed && (ctx.stem || ctx.options)) {
        try { emit('question-shown', { target: ctx.stem || ctx.options }); } catch (_) { }
      }

      /* 2026-08-29 I14 (aturan "tidak pernah menutupi CTA"): satu pemeriksaan rAF
         pasca-cat — bila kotak maskot slot beririsan dengan CTA utama yang terlihat
         (#quizNext / .primary), maskotnya disembunyikan (visibility) TANPA mencabut
         kotak slot → nol CLS (C3) dan C1 tetap. Penegakan di planner, bukan hack
         per-layar. Praktisnya tak pernah menyala (peek/above di luar alur CTA, side
         di kolomnya sendiri) — ini jaring pengaman untuk viewport ekstrem. */
      try {
        global.requestAnimationFrame(function () {
          try {
            var ms = root.querySelectorAll('.fz-paw-slot fiezel-mascot');
            var ctas = root.querySelectorAll('#quizNext,button.primary');
            for (var a = 0; a < ms.length; a++) {
              var mr = ms[a].getBoundingClientRect();
              if (!mr.width || !mr.height) continue;
              for (var c = 0; c < ctas.length; c++) {
                var cr = ctas[c].getBoundingClientRect();
                if (!cr.width || !cr.height) continue;
                if (mr.left < cr.right && mr.right > cr.left && mr.top < cr.bottom && mr.bottom > cr.top) {
                  ms[a].style.visibility = 'hidden';
                  break;
                }
              }
            }
          } catch (_) { }
        });
      } catch (_) { }
      if (!ctx.options || typeof ctx.options.addEventListener !== 'function') {
        /* Panel tanpa siklus soal (empty-state): pose konteks dimainkan sekali
           secara transien pada instance slot saja, lalu kembali idle sendiri. */
        try {
          var solos = root.querySelectorAll('.fz-paw-slot fiezel-mascot');
          for (var j = 0; j < solos.length; j++) {
            var sEl = solos[j];
            var sPose = (sEl.parentElement && sEl.parentElement.getAttribute('data-fz-pose')) || '';
            if (sPose && typeof sEl.setState === 'function') sEl.setState(sPose, { hold: 2200 });
          }
        } catch (_) { }
        return;
      }

      var opts = ctx.options;
      var lastHover = 0;
      var lastBtn = null;
      /* Lirik jawaban di-hover: delegasi pointerover = pointerenter per tombol
         (pointerenter tidak menggelembung, jadi delegasinya lewat pointerover +
         closest). Throttle >=250ms + hanya tombol BERBEDA — sapuan pointer cepat
         tidak membuat PAW panik (prinsip clamped-calm, Direction C §4). */
      opts.addEventListener('pointerover', function (e) {
        var b = e.target && e.target.closest ? e.target.closest('.option') : null;
        if (!b || b.disabled || isLocked()) return;
        var now = Date.now();
        if (b === lastBtn && now - lastHover < 900) return;
        if (now - lastHover < 250) return;
        lastHover = now; lastBtn = b;
        emit('hover-answer', { target: b });
      });
      /* Paritas keyboard (a11y): fokus = lirikan yang sama, gerbang yang sama. */
      opts.addEventListener('focusin', function (e) {
        var b = e.target && e.target.closest ? e.target.closest('.option') : null;
        if (!b || b.disabled || isLocked()) return;
        var now = Date.now();
        if (b === lastBtn && now - lastHover < 900) return;
        lastHover = now; lastBtn = b;
        emit('hover-answer', { target: b });
      });
      /* Jawaban dipilih → mikir bareng murid (thinking 700ms). Fase capture:
         menyala SEBELUM onclick tombol mengunci & mengevaluasi, jadi cek kunci
         di sini masih membaca keadaan pra-jawab. */
      opts.addEventListener('click', function (e) {
        var b = e.target && e.target.closest ? e.target.closest('.option') : null;
        if (!b || b.disabled || isLocked()) return;
        emit('answer-picked', { target: b });
      }, true);
    }
  };

  global.FiezelPawSlot = FiezelPawSlot;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : null));
