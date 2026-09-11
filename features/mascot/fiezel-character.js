/* ============================================================
   FIEZEL — komponen karakter <fiezel-mascot> (NUSA & MIRA)
   ============================================================

   PENGGANTI features/mascot/fiezel-mascot.js. Yang berganti HANYA cara
   menggambar; kontrak ke aplikasi dipertahankan utuh, dan itu disengaja.

   KENAPA PINTUNYA TIDAK IKUT BERGANTI. Aplikasi memanggil maskot dari ~340
   tempat, dan panggilan itu menyatakan MAKSUD ("bereaksi atas jawaban benar"),
   bukan seni ("gambar kucing kuning"). Menulis ulang 340 titik panggil untuk
   mengganti gambar adalah risiko besar tanpa satu pun perubahan yang dilihat
   murid. Jadi `self.FiezelPaw`, elemen <fiezel-mascot>, kosakata react(), 19
   state, tangga prioritas, dan durasi transien tetap sama persis. Nama
   `FiezelPaw` bertahan sebagai PINTU, bukan sebagai karakter — `FiezelCharacter`
   adalah nama barunya dan keduanya menunjuk objek yang sama.

   APA YANG BERUBAH DI DALAM:
     dulu  — satu rig SVG inline; ekspresi/pose dibuat dengan memutar telinga,
             lengan, kelopak, dan ekor pada pivotnya.
     kini  — seni gambar Nusa/Mira/team (WebP). "Pose" berarti menukar berkas.

   TIGA HAL YANG TIDAK BOLEH HILANG DALAM PERPINDAHAN INI, dan bagaimana
   ketiganya dipertahankan tanpa rig vektor:

     1. KEDIP. Karakter yang diam berpuluh detik terbaca sebagai stiker, bukan
        makhluk. Sebagian pose punya frame kedip tersendiri (mata tertutup);
        komponen menukar ke frame itu ~110 ms lalu kembali. State yang hidup
        lama dijamin punya frame itu oleh gerbang, bukan oleh harapan.

     2. VISEME / gerak mulut saat bicara. face-rig.json memberi kotak MULUT
        ternormalisasi per pose. Lapisan mulut ditumpuk tepat di kotak itu dan
        bentuknya ditukar mengikuti jembatan suara neural. Jadi lip-sync tetap
        hidup meski senirupanya bukan vektor lagi.

     3. KURANGI-GERAK. Di sini justru lebih kuat daripada rig lama: setiap state
        SUDAH berupa bingkai statis, jadi tidak ada animasi yang perlu diredam.
        Yang dimatikan hanya kedip dan transisi silang.

   AKSESIBILITAS: elemen ini hiasan. Ia selalu aria-hidden dan gambarnya ber-alt
   kosong — informasi tidak pernah disampaikan lewat karakter saja.
   ============================================================ */
(function () {
  'use strict';
  if (typeof document === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get('fiezel-mascot')) return;

  var ART = (typeof self !== 'undefined' && self.FiezelCharacterArt) || null;

  /* 19 state — cermin persis daftar rig lama. Gerbang membandingkan daftar ini
     dengan peta seni dan dengan peta bingkai statis. */
  var STATES = ['idle', 'greeting', 'curious', 'thinking', 'listening', 'encouraging',
    'celebrating', 'confused', 'hinting', 'completion',
    'proud', 'sleepy', 'sad', 'love',
    'speaking', 'welcome-back', 'lesson-start', 'level-up', 'milestone'];

  /* Durasi transien — disalin apa adanya dari rig lama supaya ritme aplikasi
     tidak berubah sedikit pun saat seninya berganti. */
  var TRANSIENT = {
    greeting: 1600, encouraging: 1500, celebrating: 1900,
    confused: 1800, hinting: 1900, completion: 2600,
    proud: 2200, sad: 2400, love: 2000,
    'welcome-back': 2200, 'lesson-start': 1600,
    'level-up': 2800, milestone: 3400
  };

  /* Tangga prioritas interupsi — juga disalin apa adanya. */
  var PRIO = {
    milestone: 4, 'level-up': 4, completion: 4,
    celebrating: 3, proud: 3, 'welcome-back': 3,
    greeting: 2, confused: 2, encouraging: 2, 'lesson-start': 2,
    hinting: 2, sad: 2, love: 2,
    speaking: 1, listening: 1, thinking: 1,
    idle: 0, curious: 0, sleepy: 0
  };

  var NO_BLINK = ['listening', 'celebrating', 'completion', 'proud', 'love'];

  /* Kosakata react() — dijaga tests/event-vocabulary-gate-test.js. */
  var TARGET = {
    onboard: 'greeting', 'question-shown': 'curious',
    'hover-answer': 'curious', 'answer-picked': 'thinking',
    correct: 'celebrating', wrong: 'confused', hint: 'hinting',
    'listening-start': 'listening', 'listening-stop': 'idle',
    'lesson-complete': 'completion', 'streak-lost': 'sad',
    favorite: 'love', 'badge-earned': 'proud', 'idle-timeout': 'sleepy',
    wake: 'greeting', reward: 'celebrating', 'correct-streak': 'celebrating',
    'lesson-start': 'lesson-start', 'welcome-back': 'welcome-back',
    'level-up': 'level-up', milestone: 'milestone',
    'speak-start': 'speaking', 'speak-end': 'idle'
  };

  /* Bentuk mulut viseme. Lebar/tinggi relatif terhadap kotak mulut face-rig,
     jadi angka-angka ini tidak bergantung pada ukuran render. */
  /* Ukuran relatif terhadap KOTAK mulut face-rig. Kotak itu adalah kotak
     pembatas yang murah hati (bibir + sekitarnya), jadi angka di bawah sengaja
     kecil: mulut yang mengisi kotak penuh menutupi separuh moncong dan terbaca
     sebagai lubang, bukan mulut. Diukur dengan mata di Chromium, bukan dikarang. */
  var VISEME = {
    rest: { w: 0.34, h: 0.16, r: 0.5 },
    A:    { w: 0.42, h: 0.52, r: 0.45 },
    E:    { w: 0.52, h: 0.28, r: 0.4 },
    I:    { w: 0.56, h: 0.18, r: 0.35 },
    O:    { w: 0.34, h: 0.46, r: 0.5 },
    U:    { w: 0.26, h: 0.34, r: 0.5 },
    M:    { w: 0.38, h: 0.09, r: 0.5 }
  };

  function reducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (_) { return false; }
  }

  var BASE = (function () {
    /* Jalur aset relatif terhadap halaman, sama seperti sw.js mem-precache-nya. */
    try {
      var s = document.currentScript && document.currentScript.src;
      if (s) return s.replace(/features\/mascot\/[^/]*$/, '');
    } catch (_) { /* fallthrough */ }
    return './';
  })();

  var FiezelMascotEl = (function () {
    function El() { return Reflect.construct(HTMLElement, [], El); }
    El.prototype = Object.create(HTMLElement.prototype);
    El.prototype.constructor = El;
    Object.setPrototypeOf(El, HTMLElement);

    El.prototype.connectedCallback = function () {
      if (this._init) return;
      this._init = true;
      this._state = 'idle';
      this._stT = null;
      this._blinkT = null;
      this._stGen = 0;
      this._mem = {};
      this.setAttribute('aria-hidden', 'true');

      this._img = document.createElement('img');
      this._img.className = 'fz-art';
      this._img.alt = '';
      this._img.decoding = 'async';
      /* DUA lapisan, bukan satu, dan ini bukan hiasan struktur: kotak mulut dari
         face-rig memberi POSISI+UKURAN KOTAK, sedangkan viseme memberi UKURAN
         BENTUK di dalam kotak itu. Kalau keduanya ditaruh di elemen yang sama,
         keduanya memperebutkan width/height dan bentuk mulut berakhir diukur
         terhadap seluruh tubuh — mulut sebesar dada. Itu benar-benar terjadi pada
         versi pertama berkas ini, terlihat saat dirender di Chromium. */
      this._mouth = document.createElement('span');
      this._mouth.className = 'fz-viseme';
      this._mouth.hidden = true;
      /* Tiga lapis, dan lapis tengah inilah yang paling mudah dilupakan:
         seni karakter SUDAH punya mulut tergambar. Tanpa penutup sewarna moncong,
         mulut viseme hanya menumpuk di atasnya dan wajahnya punya dua mulut. */
      this._mouthCover = document.createElement('i');
      this._mouthCover.className = 'fz-viseme-cover';
      this._mouthShape = document.createElement('i');
      this._mouthShape.className = 'fz-viseme-shape';
      this._mouth.appendChild(this._mouthCover);
      this._mouth.appendChild(this._mouthShape);
      this.appendChild(this._img);
      this.appendChild(this._mouth);

      this._paint('idle');
      this._armBlink();
    };

    El.prototype.disconnectedCallback = function () { this._clear(); };

    El.prototype._clear = function () {
      clearTimeout(this._stT); this._stT = null;
      clearTimeout(this._blinkT); this._blinkT = null;
      this._stGen = (this._stGen || 0) + 1;
    };

    /** Menggambar satu state: tukar berkas, sesuaikan rasio, pasang kelas. */
    El.prototype._paint = function (name) {
      var a = ART && ART.forState(name);
      if (!a) return false;
      this._a = a;
      this._img.src = BASE + a.src;
      this._img.width = a.w;
      this._img.height = a.h;
      this._img.style.aspectRatio = a.w + ' / ' + a.h;
      for (var i = 0; i < STATES.length; i++) this.classList.remove('st-' + STATES[i]);
      this.classList.add('st-' + name);
      this.setAttribute('data-char', a.char);
      this.setAttribute('data-pose', a.pose);
      this._placeMouth();
      return true;
    };

    /** Menempatkan lapisan mulut pada kotak face-rig pose yang sedang tampil. */
    El.prototype._placeMouth = function () {
      var a = this._a;
      if (!a || !a.mouth) { this._mouth.hidden = true; return; }
      var m = a.mouth;
      this._mouth.style.left = (m[0] * 100) + '%';
      this._mouth.style.top = (m[1] * 100) + '%';
      this._mouth.style.width = (m[2] * 100) + '%';
      this._mouth.style.height = (m[3] * 100) + '%';
    };

    El.prototype._armBlink = function () {
      var self_ = this;
      clearTimeout(this._blinkT);
      if (reducedMotion()) return;
      var wait = 2600 + Math.random() * 3800;
      this._blinkT = setTimeout(function () { self_._blink(); }, wait);
    };

    El.prototype._blink = function () {
      var a = this._a, self_ = this;
      if (!a || !a.blink || NO_BLINK.indexOf(this._state) >= 0 || reducedMotion()) {
        this._armBlink();
        return;
      }
      var open = BASE + a.src;
      this._img.src = BASE + a.blink;
      setTimeout(function () {
        /* Pose bisa sudah berganti selama 110 ms itu — jangan timpa yang baru. */
        if (self_._a === a) self_._img.src = open;
        self_._armBlink();
      }, 110);
    };

    /* ---------- API publik (sama persis dengan rig lama) ---------- */

    Object.defineProperty(El.prototype, 'state', { get: function () { return this._state; } });

    El.prototype.setState = function (name, opts) {
      if (!this._init) return false;
      if (typeof name !== 'string' || STATES.indexOf(name) < 0) return false;
      opts = opts || {};
      clearTimeout(this._stT); this._stT = null;
      var gen = ++this._stGen;
      this._state = name;
      this._paint(name);

      var hold = opts.hold;
      if (hold == null) hold = TRANSIENT[name];
      if (typeof hold === 'number' && isFinite(hold) && hold > 0) {
        var then = (typeof opts.then === 'string' && STATES.indexOf(opts.then) >= 0) ? opts.then : 'idle';
        var self_ = this;
        this._stT = setTimeout(function () {
          if (self_._stGen !== gen) return;
          self_._stT = null;
          self_.setState(then, { hold: 0 });
        }, hold);
      }
      return true;
    };

    El.prototype.react = function (evt, d) {
      if (!this._init) return false;
      if (d == null || typeof d !== 'object') d = {};
      var tgt = TARGET[evt];
      if (!tgt) {
        /* Event tak dikenal BERTERIAK, tidak diam. Aturan ini diwarisi dari rig
           lama dan dijaga tests/event-vocabulary-gate-test.js: kalau sebuah
           pemanggil salah ketik nama event, karakternya berhenti bereaksi di satu
           tempat saja dan tidak ada yang tahu berbulan-bulan. Peringatan konsol
           adalah satu-satunya yang membedakan "fitur mati" dari "fitur senyap". */
        try { console.warn('[fiezel-mascot] event react() tak dikenal:', evt); } catch (_) { /* konsol tidak wajib ada */ }
        return false;
      }

      var curP = PRIO[this._state] || 0;
      var nxtP = PRIO[tgt] || 0;
      var holding = !!this._stT || this._state === 'speaking' || this._state === 'sleepy';

      if (holding && this._state === 'sleepy') {
        var wakes = evt === 'wake' || evt === 'welcome-back' || evt === 'onboard'
          || evt === 'lesson-start' || evt === 'question-shown' || evt === 'listening-start';
        if (!wakes) return true;                  // diserap, bukan galat
      } else if (holding && nxtP <= curP && this._state !== 'listening' && this._state !== 'idle') {
        return true;                              // prioritas lebih rendah diserap
      }
      return this.setState(tgt, d.hold != null ? { hold: d.hold } : undefined);
    };

    /** Bingkai statis per state — di sistem gambar, "ekspresi" = pose itu sendiri. */
    El.prototype.applyFace = function (name) { return this._paint(name) || this._paint(this._state); };
    El.prototype.applyPose = function (name) { return this._paint(name) || this._paint(this._state); };

    /** Arah pandang: seni gambar tidak bisa memutar bola mata, jadi ini menggeser
     *  karakter beberapa piksel ke arah sasaran. Jujur secara perilaku (ia
     *  MEMANG memberi tanggapan) tanpa berpura-pura punya rig vektor. */
    El.prototype.lookAt = function (target) {
      if (!this._init || reducedMotion()) return false;
      var x = 0;
      try {
        if (target && typeof target.getBoundingClientRect === 'function') {
          var r = target.getBoundingClientRect(), me = this.getBoundingClientRect();
          x = (r.left + r.width / 2) - (me.left + me.width / 2);
        } else if (target && typeof target.x === 'number') { x = target.x; }
      } catch (_) { return false; }
      var dx = Math.max(-6, Math.min(6, x / 60));
      this.style.setProperty('--fz-look-x', dx.toFixed(2) + 'px');
      return true;
    };

    El.prototype.setViseme = function (shape) {
      if (!this._init) return false;
      var a = this._a;
      if (!a || !a.mouth) return false;
      var v = VISEME[shape] || VISEME.rest;
      if (!a.muzzle) return false;          // pose tanpa warna moncong terukur: jangan tebak
      this._mouth.hidden = false;
      this._mouthCover.style.background = a.muzzle;
      /* Persen di sini relatif terhadap KOTAK mulut (elemen induk), bukan tubuh. */
      this._mouthShape.style.width = (v.w * 100) + '%';
      this._mouthShape.style.height = (v.h * 100) + '%';
      this._mouthShape.style.borderRadius = (v.r * 100) + '%';
      return true;
    };

    El.__states = STATES.slice();
    return El;
  })();

  customElements.define('fiezel-mascot', FiezelMascotEl);

  /* ---------- pintu tunggal ke aplikasi ---------- */
  (function (global) {
    if (!global || !global.document) return;

    function nodes() {
      try { return Array.prototype.slice.call(global.document.querySelectorAll('fiezel-mascot')); }
      catch (_) { return []; }
    }
    function each(method, a, b) {
      var hit = false;
      nodes().forEach(function (el) {
        try { if (typeof el[method] === 'function' && el[method](a, b) !== false) hit = true; }
        catch (_) { /* satu karakter bermasalah bukan alasan menjatuhkan pemanggil */ }
      });
      return hit;
    }
    function ctor() {
      try { return global.customElements && global.customElements.get('fiezel-mascot'); }
      catch (_) { return null; }
    }

    var door = {
      ready: function () { return !!ctor(); },
      count: function () { return nodes().length; },
      react: function (evt, detail) { return each('react', evt, detail); },
      setState: function (name, opts) { return each('setState', name, opts); },
      lookAt: function (target) { return each('lookAt', target); },
      applyFace: function (name) { return each('applyFace', name); },
      applyPose: function (name) { return each('applyPose', name); },
      setViseme: function (shape) { return each('setViseme', shape); },
      currentState: function () {
        var list = nodes();
        for (var i = 0; i < list.length; i++) {
          try { if (list[i] && typeof list[i].state === 'string') return list[i].state; } catch (_) { /* lewati */ }
        }
        return '';
      },
      /** Daftar state + peta seni, read-only. Pengganti __rig milik rig vektor. */
      get __art() { return (global.FiezelCharacterArt && global.FiezelCharacterArt.art) || null; },
      states: function () { return STATES.slice(); },
      faceMarkup: function (className, fallback) {
        var cls = String(className || '');
        return this.ready()
          ? '<fiezel-mascot class="' + cls + '" aria-hidden="true"></fiezel-mascot>'
          : String(fallback || '');
      }
    };

    /* FiezelCharacter adalah nama sebenarnya; FiezelPaw dipertahankan sebagai
       alias PINTU supaya ~340 titik panggil di app.js dan modul fitur tidak perlu
       disentuh dalam perpindahan seni. Keduanya objek yang SAMA, bukan salinan. */
    global.FiezelCharacter = door;
    global.FiezelPaw = door;
  })(typeof self !== 'undefined' ? self : window);
})();
