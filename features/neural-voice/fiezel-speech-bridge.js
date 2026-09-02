/**
 * ============================================================
 * FIEZEL — jembatan bicara → maskot PAW (FASE 11)
 * ============================================================
 *
 * Sumber mengikat: pau-redesign/systems/14-voice-sfx.md §1–2 (strategi viseme
 * 3 tingkat), 17-open-issue-rulings.md R-2a (format kabel 'fiezel-speech'),
 * code-plan.md Fase 11.
 *
 * POSISI BERKAS INI DI ARSITEKTUR. Fasad suara (fiezel-voice-say.js) hanya
 * MELAPOR lewat CustomEvent 'fiezel-speech' — ia tidak tahu maskot itu ada.
 * Komponen maskot punya state 'speaking' dan pintu viseme setViseme() — ia
 * tidak tahu suara itu ada. Berkas ini satu-satunya yang tahu keduanya:
 * menerjemahkan fase kabel menjadi kosakata react() ('speak-start'/'speak-end')
 * dan menjalankan MESIN MULUT (siklus beat sp1/sp2/open dengan gerbang macet).
 * Salah satunya absen → jembatan diam tanpa suara galat; suara & subtitle
 * jalan terus (14 §0: suara tidak pernah bergantung pada wajah).
 *
 * DUA TINGKAT KEBENARAN WAKTU (14 §1.3; dulu tiga — lihat catatan m025-231):
 *   L1/L2  'progress' ~4 Hz  → siklus flap DIGERBANG jam audio (macet 900ms /
 *                              dua callback maju <60ms → mulut tutup, buka lagi
 *                              saat callback maju berikutnya).
 *   L3     'start'+durasi    → siklus taksiran; tutup paksa min(est×1.5, 20s);
 *                              resolusi janji fasad SELALU menang.
 *   L5     'silent'          → mulut TIDAK PERNAH dianimasikan.
 * Arah gagal yang dipilih spec: mulut BERHENTI LEBIH AWAL, tidak pernah
 * mengepak di atas keheningan.
 *
 * m025-231 (keputusan OWNER): lapisan L4 speechSynthesis peramban DIHAPUS dari
 * seluruh aplikasi, jadi tidak ada satu pun pengirim `layer:4` yang tersisa di
 * kabel 'fiezel-speech'. Karena itu SELURUH mesin L4 di berkas ini ikut dibuang —
 * mode 'l4', irama kalemnya (140–200ms, bobot open 5%), dan pagar 45 detik untuk
 * giliran tanpa jam audio. Mode yang tidak bisa dimasuki lagi bukan "cadangan
 * murah": ia kode mati yang cepat atau lambat dihidupkan kembali oleh tebakan.
 * Akibatnya fase 'start' kini SELALU berarti L3, satu cabang tanpa syarat.
 * Tangga suara hari ini: L1 ElevenLabs/R2 → C1 Cloudflare → L2 Puter → L3 neural
 * di perangkat → L5 teks senyap. Di bawah L3 tidak ada bunyi sama sekali, dan
 * jembatan ini memang tidak punya apa pun untuk dianimasikan di sana.
 *
 * SATU OTAK WAKTU. Koreografi batas kalimat TIDAK menghitung ulang indeks cue:
 * jembatan mengamati DOM #fiezelSubtitle (yang ditulis band subtitle dari
 * cueIndexAt-nya sendiri) lewat MutationObserver. suppressSubtitles → tidak ada
 * mutasi → jatuh ke jeda taksiran periodik.
 *
 * TIGA GERBANG GERAK (14 §5). Semua dorongan state lewat pembungkus
 * pawReact()/pawSetState() app.js (gerbang 1: prefers-reduced-motion, gerbang 2:
 * preferensi murid). Mesin mulut/saccade milik jembatan memeriksa gerbang yang
 * sama tiap frame lewat motionAllowed(); gerbang 3 (body.reduce-motion) tetap
 * dibaca langsung untuk halaman tanpa app.js. Reduced motion = wajah kalem
 * statis selama audio berbunyi; subtitle tetap kanal utama. TIDAK ADA mode
 * "mulut gerak pelan".
 *
 * 'fiezel-neural-voice-degraded' (audibility-fix) MEMATIKAN mulut seketika dan
 * menolak masuk kembali sampai giliran ditutup fasad. 'fiezel-neural-voice-
 * progress' adalah progres UNDUHAN MODEL — bukan sinyal bicara, tidak didengar
 * di sini sama sekali.
 * ============================================================
 */
(function (root) {
  'use strict';
  if (!root || !root.document) return;
  if (root.FiezelSpeechBridge) return;

  var doc = root.document;
  var SCHEMA = 'fiezel-speech-bridge-v1';

  /* ---------- konstanta irama (14 §1.1–1.3) ---------- */
  var BEAT_MIN = 110, BEAT_MAX = 160;         // L1/L2/L3: beat ber-jitter (--fz-beat 140 ±20-an)
  var STALL_MS = 900;                         // tanpa callback 900ms → gerbang macet menutup mulut
  var STALL_DELTA_S = 0.06;                   // dua callback beruntun maju <60ms → macet (buffering)
  var OPEN_COOLDOWN_MS = 600;                 // 'open' tidak boleh dua kali dalam 600ms
  var SMALL_PX = 42;                          // di bawah ini siklus runtuh jadi soft↔open
  var L3_FORCE_MAX_MS = 20000;                // pagar mutlak mode taksiran
  var ACCENT_MS = 140;                        // beat aksen tanda baca ('?'→o, '!'→open)
  var EST_GAP_EVERY_MS = 3800;                // mode taksiran tanpa cue: jeda kalimat periodik
  var SACCADE_MIN_MS = 2500, SACCADE_MAX_MS = 4000; // micro-saccade pupil (14 §1.5)

  /* Jeda prosodi dibaca dari FiezelProsody (satu sumber angka); cadangan literal
     identik untuk halaman uji tanpa modul prosodi. */
  var GAP_FALLBACK = { clause: 200, sentence: 420, question: 480, exclamation: 420, trailing: 560, unpunctuated: 260 };
  function gaps() {
    try { var p = root.FiezelProsody; if (p && p.GAP_MS) return p.GAP_MS; } catch (_) {}
    return GAP_FALLBACK;
  }

  function perfNow() {
    try { if (root.performance && typeof root.performance.now === 'function') return root.performance.now(); } catch (_) {}
    return Date.now();
  }

  /* ---------- gerbang gerak ---------- */
  function motionAllowed() {
    // Gerbang 1+2 hidup di pembungkus app.js; kalau ia ada, dialah otoritasnya.
    try { if (typeof root.pawMotionAllowed === 'function') return !!root.pawMotionAllowed(); } catch (_) {}
    try { if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) return false; } catch (_) {}
    try { if (doc.body && doc.body.classList.contains('reduce-motion')) return false; } catch (_) {}
    return true;
  }

  /* ---------- pintu ke maskot ---------- */
  /* Lewat pembungkus app.js bila ada (mewarisi gerbang gerak + try/catch-nya);
     TIDAK jatuh ke corong langsung saat pembungkus menjawab false — false bisa
     berarti "murid mematikan animasi", dan melompatinya berarti membobol gerbang. */
  function react(evt) {
    if (typeof root.pawReact === 'function') { try { return !!root.pawReact(evt); } catch (_) { return false; } }
    if (!motionAllowed()) return false;
    try { return !!(root.FiezelPaw && typeof root.FiezelPaw.react === 'function' && root.FiezelPaw.react(evt)); } catch (_) { return false; }
  }
  function setViseme(shape) {
    if (!motionAllowed() && shape) return false; // reduced motion: tidak pernah memasang bentuk beat
    try { return !!(root.FiezelPaw && typeof root.FiezelPaw.setViseme === 'function' && root.FiezelPaw.setViseme(shape)); } catch (_) { return false; }
  }
  function pawHosts() {
    try { return Array.prototype.slice.call(doc.querySelectorAll('fiezel-mascot')); } catch (_) { return []; }
  }
  function isSmall() {
    // <42px: detail sp1/sp2 tidak terbaca — siklus runtuh jadi soft↔open (14 §1.1)
    var list = pawHosts();
    for (var i = 0; i < list.length; i++) {
      try { var w = list[i].clientWidth; if (w > 0) return w < SMALL_PX; } catch (_) {}
    }
    return false;
  }

  /* ---------- micro-saccade pupil (14 §1.5, kanal --px/--py impl-02) ---------- */
  var sacT = 0;
  function pupilsRest() {
    // posisi istirahat bicara: (0,−1)
    pawHosts().forEach(function (el) {
      try { el.style.setProperty('--px', '0px'); el.style.setProperty('--py', '-1px'); } catch (_) {}
    });
  }
  function pupilsClear() {
    pawHosts().forEach(function (el) {
      try { el.style.removeProperty('--px'); el.style.removeProperty('--py'); } catch (_) {}
    });
  }
  function saccadeTick() {
    sacT = root.setTimeout(function () {
      if (!turn) { sacT = 0; return; }
      if (motionAllowed()) {
        var px = (Math.random() * 4 - 2).toFixed(1) + 'px';
        var py = (-1 + (Math.random() * 4 - 2)).toFixed(1) + 'px';
        pawHosts().forEach(function (el) {
          try { el.style.setProperty('--px', px); el.style.setProperty('--py', py); } catch (_) {}
        });
      }
      saccadeTick();
    }, SACCADE_MIN_MS + Math.random() * (SACCADE_MAX_MS - SACCADE_MIN_MS));
  }
  function startSaccade() { if (!sacT) { pupilsRest(); saccadeTick(); } }
  function stopSaccade() { if (sacT) { root.clearTimeout(sacT); sacT = 0; } pupilsClear(); }

  /* ---------- pengamat cue subtitle (satu otak waktu) ---------- */
  var mo = null, lastCueText = '';
  function subtitleText() {
    try { var h = doc.getElementById('fiezelSubtitle'); return h ? String(h.textContent || '').replace(/\s+/g, ' ').trim() : ''; } catch (_) { return ''; }
  }
  function startSubtitleWatch() {
    if (mo) { lastCueText = subtitleText(); return; }
    var host = null;
    try { host = doc.getElementById('fiezelSubtitle'); } catch (_) { host = null; }
    if (!host || typeof root.MutationObserver !== 'function') return;
    lastCueText = subtitleText();
    mo = new root.MutationObserver(function () {
      var t = subtitleText();
      if (t === lastCueText) return;
      var prev = lastCueText;
      lastCueText = t;
      if (turn && t) cueAdvance(prev); // teks kosong = band berakhir; event 'end' fasad yang menutup
    });
    try { mo.observe(host, { childList: true, subtree: true, characterData: true }); } catch (_) { mo = null; }
  }
  function stopSubtitleWatch() {
    if (mo) { try { mo.disconnect(); } catch (_) {} mo = null; }
    lastCueText = '';
  }

  /* Cue maju = batas kalimat/klausa: aksen tanda baca dulu (bila ada), lalu mulut
     menutup ke bentuk istirahat untuk jeda prosodi GAP_MS (14 §1.2). Bentuk
     istirahat dalam giliran = 'soft' (CSS memetakannya ke fz-m-smile di rig lama —
     senyum identitas, tidak pernah garis datar). */
  function cueAdvance(prevText) {
    if (!turn || turn.stalled) return;
    var g = gaps();
    var tail = String(prevText || '').replace(/[\s"')\]]+$/, '').slice(-1);
    var ms = tail === '?' ? g.question
      : tail === '!' ? g.exclamation
      : tail === ',' || tail === ';' || tail === ':' ? g.clause
      : tail === '.' || tail === '…' ? g.sentence
      : g.unpunctuated;
    var now = perfNow();
    var accent = 0;
    if (tail === '?') { setViseme('o'); turn.lastShape = 'o'; accent = ACCENT_MS; }        // beat akhir fz-m-o (14 §1.2)
    else if (tail === '!') { setViseme('open'); turn.lastShape = 'open'; turn.lastOpenAt = now; accent = ACCENT_MS; } // beat akhir open
    turn.gapCloseAt = now + accent;      // sesudah aksen: tutup ke soft
    turn.gapUntil = now + accent + ms;   // beat berikutnya menunggu jeda prosodi
    turn.nextBeatAt = turn.gapUntil;
    turn.nextEstGapAt = now + accent + ms + EST_GAP_EVERY_MS;
    if (!accent) { setViseme('soft'); turn.lastShape = 'soft'; turn.gapCloseAt = 0; }
  }

  /* ---------- giliran bicara ---------- */
  var turn = null;          // state satu giliran; null = diam
  var degradedLatch = false; // sesudah 'degraded': tolak masuk kembali sampai fasad menutup giliran
  var latestGeneration = 0; // NV-08: completion/progress generasi lama tidak boleh memiliki turn baru
  var raf = 0;

  function schedule() {
    if (raf) return;
    if (typeof root.requestAnimationFrame === 'function') raf = root.requestAnimationFrame(tick);
    else raf = root.setTimeout(function () { tick(perfNow()); }, 16); // cadangan non-browser
  }

  function beginTurn(layer, mode, opt) {
    if (degradedLatch) return;              // 14 §1.6: sisa giliran terdegradasi tidak boleh bicara lagi
    if (turn) closeTurn(true);              // say() tumpang tindih = interupsi + mulai baru (14 §1.4)
    if (!motionAllowed()) return;           // wajah kalem statis; suara & subtitle jalan terus
    var now = perfNow();
    turn = {
      layer: layer,
      mode: mode,                           // 'clock' (L1/L2) | 'est' (L3) — tidak ada mode ketiga lagi (m025-231)
      startedAt: now,
      lastT: 0, lastAt: now,                // jam audio terakhir (mode clock)
      slowHits: 0, stalled: false,
      gapUntil: 0, gapCloseAt: 0,
      nextBeatAt: now,
      nextEstGapAt: mode === 'clock' ? 0 : now + EST_GAP_EVERY_MS,
      lastShape: '', lastOpenAt: 0,
      forceCloseAt: mode === 'est'
        ? now + Math.min(((opt && opt.duration > 0 ? Number(opt.duration) : 8) * 1500), L3_FORCE_MAX_MS)
        : 0,
      small: isSmall()
    };
    react('speak-start');                   // komponen: setState('speaking') + simpan state pra-bicara
    startSubtitleWatch();
    startSaccade();
    schedule();
  }

  /* Penutupan giliran. interrupt=true → snap (kelas viseme dilepas seketika, 14 §1.4);
     normal → sama secara mekanis (toggle display memang seketika), transisi CSS state
     yang menghaluskan sisanya. Selalu kembalikan mulut ke bentuk state via setViseme(null). */
  function closeTurn(interrupt) {
    if (!turn) return;
    turn = null;
    stopSubtitleWatch();
    stopSaccade();
    try { root.FiezelPaw && root.FiezelPaw.setViseme && root.FiezelPaw.setViseme(null); } catch (_) {} // bersih tanpa gerbang: mulut TUTUP justru saat reduced motion
    react('speak-end');                     // state kembali ke pra-bicara (listening/idle)
  }

  /* Umpan jam audio L1/L2. Mulut MULAI pada callback maju pertama, bukan pada say():
     itulah gerbang "tidak pernah mengepak di atas keheningan". */
  function feedClock(layer, t) {
    if (degradedLatch) return;
    if (!turn || turn.mode !== 'clock') {
      if (!(t > 0)) return;                 // belum ada audio yang benar-benar maju
      beginTurn(layer, 'clock');
      if (!turn) return;                    // gerbang gerak menolak — selesai
    }
    var now = perfNow();
    var delta = t - turn.lastT;
    if (delta < STALL_DELTA_S) {
      turn.slowHits++;
      if (turn.slowHits >= 2 && !turn.stalled) stallClose(); // dua callback beruntun nyaris diam = buffering
    } else {
      turn.slowHits = 0;
      if (turn.stalled) { turn.stalled = false; turn.nextBeatAt = now; } // audio maju lagi → mulut bangun
    }
    if (t > turn.lastT) turn.lastT = t;
    turn.lastAt = now;
  }

  function stallClose() {
    if (!turn) return;
    turn.stalled = true;
    setViseme('soft');                      // tutup ke senyum istirahat SEKETIKA (14 §1.1)
    turn.lastShape = 'soft';
  }

  /* Satu beat mulut: bobot 14 §1.1 (sp1 55 / sp2 30 / open 15), tidak pernah
     bentuk sama dua kali beruntun, 'open' ber-cooldown 600ms. Bobot alternatif
     yang dulu dipakai giliran L4 hilang bersama lapisannya (m025-231): satu
     lapisan bersuara yang tersisa di sisi taksiran = satu tabel bobot. */
  function pickShape(now) {
    if (turn.small) return turn.lastShape === 'open' ? 'soft' : 'open';
    var r = Math.random();
    var s = r < 0.55 ? 'sp1' : r < 0.85 ? 'sp2' : 'open';
    if (s === 'open' && now - turn.lastOpenAt < OPEN_COOLDOWN_MS) s = 'sp2';
    if (s === turn.lastShape) s = s === 'sp1' ? 'sp2' : 'sp1';
    return s;
  }
  function beat(now) {
    var s = pickShape(now);
    setViseme(s);
    turn.lastShape = s;
    if (s === 'open') turn.lastOpenAt = now;
    turn.nextBeatAt = now + BEAT_MIN + Math.random() * (BEAT_MAX - BEAT_MIN);
  }

  /* Loop rAF — akumulasi waktu, BUKAN setInterval (14 §1.1): tab di belakang
     otomatis melambat bersama rAF, dan beat tidak menumpuk. */
  function tick() {
    raf = 0;
    if (!turn) return;                      // giliran sudah ditutup — loop mati sendiri
    if (!motionAllowed()) { closeTurn(true); return; } // gerak dimatikan di tengah giliran
    var now = perfNow();

    // pagar tutup paksa (L3 est×1.5, maksimum 20s) — arah gagal: berhenti lebih awal
    if (turn.forceCloseAt && now >= turn.forceCloseAt) { closeTurn(false); return; }

    // gerbang macet mode jam: tidak ada callback 900ms → mulut tutup sampai jam maju lagi
    if (turn.mode === 'clock' && !turn.stalled && now - turn.lastAt > STALL_MS) stallClose();

    // penutupan aksen tanda baca (o/open ditahan ACCENT_MS lalu ke soft)
    if (turn.gapCloseAt && now >= turn.gapCloseAt) {
      setViseme('soft'); turn.lastShape = 'soft'; turn.gapCloseAt = 0;
    }

    // mode taksiran tanpa cue subtitle: jeda kalimat sintetis periodik
    if (turn.nextEstGapAt && now >= turn.nextEstGapAt) {
      setViseme('soft'); turn.lastShape = 'soft';
      turn.gapUntil = now + gaps().sentence;
      turn.nextBeatAt = turn.gapUntil;
      turn.nextEstGapAt = now + gaps().sentence + EST_GAP_EVERY_MS;
    }

    if (!turn.stalled && now >= turn.gapUntil && now >= turn.nextBeatAt) beat(now);
    schedule();
  }

  /* ---------- terjemahan kabel R-2a → kosakata react() ---------- */
  function acceptGeneration(d) {
    var generation = Number(d && d.generation) || 0;
    // Event lawas tanpa generation tetap diterima untuk kompatibilitas test/page lama.
    if (!generation) return true;
    if (generation < latestGeneration) return false;
    if (generation > latestGeneration) latestGeneration = generation;
    return true;
  }

  function onSpeech(ev) {
    var d = (ev && ev.detail) || {};
    if (!acceptGeneration(d)) return;        // NV-08: stale progress/end tidak boleh menyentuh turn baru
    switch (d.phase) {
      case 'progress':                      // L1/L2: jam audio adalah kebenaran
        feedClock(Number(d.layer) === 2 ? 2 : 1, Number(d.currentTime) || 0);
        break;
      case 'start':                         // L3: yang ada hanyalah durasi taksiran
        // m025-231: dulu baris ini bercabang ke giliran 'l4' saat d.layer === 4.
        // Lapisan peramban itu dihapus dan tidak ada lagi yang mengirim layer 4,
        // jadi cabangnya dibuang, bukan disisakan "untuk jaga-jaga": cabang mati
        // membuat pembaca berikutnya percaya masih ada lapisan di bawah L3.
        beginTurn(3, 'est', d);
        break;
      case 'end':                           // resolusi janji fasad: otoritas "giliran usai"
      case 'silent':                        // L5: kalau mulut sempat mulai (taksiran L3 kandas), tutup SEKARANG
        degradedLatch = false;
        closeTurn(false);
        break;
      case 'interrupt':                     // stop(): snap tutup
        degradedLatch = false;
        closeTurn(true);
        break;
      default:
        break;                              // fase asing dari versi fasad lebih baru: diabaikan tanpa suara
    }
  }

  try { doc.addEventListener('fiezel-speech', onSpeech); } catch (_) {}

  /* Suara terdegradasi (audibility-fix): mulut mati SEKETIKA dan tidak boleh
     hidup lagi untuk sisa giliran — apa pun yang masih dikirim lapisan bawah. */
  try {
    root.addEventListener('fiezel-neural-voice-degraded', function () {
      if (turn) closeTurn(true);
      degradedLatch = true;                 // dilepas oleh end/silent/interrupt fasad berikutnya
    });
  } catch (_) {}

  /* Permukaan kecil untuk Diagnostics/tes — bukan API pemanggil biasa:
     satu-satunya pintu bicara tetap FiezelVoiceSay.say(). */
  root.FiezelSpeechBridge = Object.freeze({
    SCHEMA: SCHEMA,
    speaking: function () { return !!turn; },
    degraded: function () { return !!degradedLatch; },
    motionAllowed: motionAllowed
  });
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this));
