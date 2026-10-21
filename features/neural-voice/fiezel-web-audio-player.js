(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FiezelWebAudioPlayer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FADE_OUT_S = 0.018;
  const FADE_IN_S = 0.006;
  const NATURAL_END_FADE_S = 0.008;
  const FADE_OUT_MS = Math.ceil(FADE_OUT_S * 1000) + 8;
  const PREFERRED_SAMPLE_RATE = 44100;
  const LATENCY_HINT = 'playback';
  const PCM_DIAGNOSTIC_PARAM = 'fiezelPcmMode';
  // m025-64: `wavref` menambah pembanding yang selama ini hilang. `raw` dan `conditioned`
  // sama-sama melewati WebAudio, jadi ketika keduanya terdengar pecah, keduanya tidak bisa
  // memisahkan model dari jalur pemutaran. `wavref` memutar PCM yang persis sama lewat
  // elemen <audio> biasa, melewati AudioContext, worklet, penjadwalan, dan fade sepenuhnya.
  // Bersih di sini + pecah di mode normal = cacatnya ada di jalur pemutaran FIEZEL.
  // Pecah di keduanya = cacatnya bukan di penjadwalan kita.
  // m025-68: `plainbuffer` adalah arm yang lahir dari bukti, bukan dari dugaan.
  //
  // Telemetri m025-67 menunjukkan iOS menolak elemen media dengan NotAllowedError pada
  // ke-13 percobaan, jadi arm `wavref` tidak bisa diandalkan di perangkat itu. Yang masih
  // bisa dipakai adalah AudioContext yang SUDAH terbuka kuncinya oleh alur normal aplikasi.
  //
  // `plainbuffer` memutar PCM yang sama lewat AudioBufferSourceNode polos langsung ke
  // destination: tanpa AudioWorklet, tanpa fade masuk/keluar, tanpa penjadwalan seam, tanpa
  // epoch. Itu tepat memisahkan tiga tersangka utama yang tersisa dari PCM-nya sendiri.
  // m025-69: `toneref` memutar sinyal yang DIBUAT FIEZEL SENDIRI, bukan keluaran model.
  //
  // Bukti m025-68 sudah mencoret jalur pemutaran kita: arm PLAIN BUFFER melewati worklet,
  // fade, dan penjadwalan seam, dan OWNER mendengar hasil yang sama persis dengan mode normal.
  // Telemetri juga mencatat chunkCount 1 (tidak ada sambungan antar potongan), trimmed false,
  // 44100 = 44100 (tidak ada resampling), dan tanpa clipping pada rekaman itu.
  //
  // Yang tersisa hanya dua: PCM dari modelnya, atau tahap keluaran perangkat. Nada buatan ini
  // memisahkan keduanya, karena ia tidak pernah menyentuh model:
  //   terdengar pecah  -> masalahnya di keluaran perangkat/PWA, bukan di model dan bukan di kita
  //   terdengar bersih -> jalur keluarannya sehat, jadi cacatnya ada pada PCM yang dihasilkan model
  const PCM_DIAGNOSTIC_MODES = Object.freeze(['raw', 'conditioned', 'wavref', 'plainbuffer', 'toneref']);
  // Parameter URL tidak bisa dipakai di perangkat yang punya cacatnya. FIEZEL mewajibkan
  // notifikasi, dan iOS hanya memberi Notification API ke aplikasi layar-utama, sehingga tab
  // Safari - satu-satunya tempat parameter bisa diketik - berhenti di gerbang notifikasi.
  // Karena itu mode juga bisa disimpan, dan itulah yang membuat A/B ini bisa dijalankan.
  const PCM_DIAGNOSTIC_STORAGE_KEY = 'fiezel-pcm-mode-v1';
  // Mode diagnostik tidak boleh hidup lebih lama daripada pengujian yang membutuhkannya.
  const PCM_DIAGNOSTIC_TTL_MS = 24 * 60 * 60 * 1000;
  const PCM_WORKLET_MODULE_URL = './features/neural-voice/fiezel-pcm-renderer-worklet.js';

  const PEAK_CEILING = 0.97;
  const DC_LIMIT = 0.003;
  const DC_BLOCKS = 8;
  const IMPULSE_MIN_JUMP = 0.25;
  const IMPULSE_RATIO = 6;
  const IMPULSE_WINDOW = 20;
  const SILENCE_FLOOR = 0.0025;
  const TRIM_KEEP_S = 0.012;

  // =========================================================================================
  // m025-73 PEMUTAR BERPIPA (pipelined player)
  // =========================================================================================
  //
  // MASALAH YANG DIPERBAIKI. Sampai m025-72 sintesis dan pemutaran berjalan BERURUTAN pada
  // batas kalimat: potongan N+1 baru masuk mesin setelah potongan N selesai berbunyi, jadi
  // SELURUH waktu generate terdengar sebagai keheningan. Di perangkat OWNER satu potongan
  // pendek memakan sekitar 0,6-1,5 detik pada 4 langkah denoising, dan itulah "delay di setiap
  // titik" yang dilaporkan - bukan cacat model, bukan cacat prosodi.
  //
  // BENTUK PERBAIKANNYA ADA DI SINI, DI LAPISAN PEMUTAR, karena hanya pemutar yang memegang
  // dua hal yang dibutuhkan sekaligus: garis waktu AudioContext (satu-satunya jam yang benar)
  // dan buffer PCM yang sudah jadi. Dua aturannya:
  //   1. generate N+1 dimulai SEGERA setelah N dijadwalkan, bukan setelah N selesai berbunyi;
  //   2. penjadwalan memakai KURSOR garis waktu (`start(when)`), bukan event `ended`.
  // Menunggu `ended` lalu memulai potongan berikutnya selalu menyisakan celah sebesar satu
  // giliran event-loop + latensi keluaran perangkat, dan di iOS itu bisa puluhan milidetik
  // bahkan ketika PCM-nya sudah siap sejak tadi.

  // Berapa potongan yang boleh digenerasi di depan. 2 sudah cukup untuk menutup satu waktu
  // generate penuh dengan satu potongan yang sedang berbunyi; lebih dalam dari itu hanya
  // menumpuk PCM di RAM ponsel tanpa menutup celah tambahan.
  const PIPELINE_LOOKAHEAD_CHUNKS = 2;
  // Batas keras jumlah potongan yang tertahan (terjadwal + siap) sebelum pipa menahan diri.
  // Satu potongan kalimat ~2 detik pada 44,1 kHz mono = ~350 KB Float32; 3 potongan ~1 MB,
  // aman untuk ponsel kelas bawah.
  const PIPELINE_MAX_QUEUED_CHUNKS = 3;
  // Jarak aman minimal antara "sekarang" dan `start(when)` untuk potongan pertama. Menjadwalkan
  // tepat di `currentTime` berarti bersaing dengan render quantum yang sedang berjalan dan
  // menghasilkan potongan awal yang terpotong.
  const SCHEDULE_LEAD_S = 0.03;
  // Ambang menyambung ANTAR PANGGILAN `play()`. Audit V1 (reports/voice-v1-audit.md) menemukan
  // pemanggil produksi mengirim SATU kalimat per panggilan, sehingga `chunks.length === 1` dan
  // pemutar selalu menerima `continuous:false, trim:false`. Akibatnya seluruh mesin gapless
  // yang sudah ada mati di produksi: jeda terdengar 4.422 ms per titik, 733 ms di antaranya
  // keheningan PCM yang tidak pernah dipangkas. Karena itu kontinuitas TIDAK LAGI ditentukan
  // oleh flag pemanggil, melainkan oleh kenyataan garis waktu: kalau kursor masih di depan
  // `currentTime` lebih dari ambang ini, ada bunyi yang sedang berjalan dan potongan baru
  // disambung ke ujungnya. Ambang kecil (10 ms) supaya sisa kursor yang praktis sudah habis
  // tidak dianggap bisa disambung.
  const CROSS_CALL_JOIN_MIN_LEAD_S = 0.01;

  /**
   * JEDA PROSODI YANG DISENGAJA. Tujuan pekerjaan ini BUKAN menghapus semua jeda - jeda adalah
   * bagian dari bahasa, dan murid pemula justru butuh ruang bernapas untuk mencerna. Yang
   * dihapus adalah jeda TIDAK SENGAJA (waktu generate + keheningan sisa di ujung PCM). Sesudah
   * itu jeda dipasang kembali di sini, dengan nilai yang diketahui dan bisa disetel.
   *
   * Nilai awal (detik), dikalibrasi ke ritme bicara guru pada kecepatan 1,0:
   *   clause     0,09  koma/titik dua - hanya penanda frasa, lebih panjang terdengar tersendat
   *   sentence   0,22  titik/tanya/seru - batas gagasan; di bawah 0,15 dua kalimat menempel
   *   paragraph  0,45  pindah paragraf - batas topik, tempat murid boleh mengejar makna
   *   none       0     lanjutan di tengah kalimat: WAJIB nol, ini seam yang harus mulus
   */
  const PROSODY_GAP_DEFAULT_S = Object.freeze({ none: 0, clause: 0.09, sentence: 0.22, paragraph: 0.45 });
  const PROSODY_BOUNDARIES = Object.freeze(['none', 'clause', 'sentence', 'paragraph']);
  // Ambang untuk MENERJEMAHKAN petunjuk jeda dari lapisan atas (ms) menjadi KELAS batas.
  // Ambang ini mengklasifikasikan petunjuk; panjang jedanya sendiri tetap datang dari
  // PROSODY_GAP_DEFAULT_S di atas, supaya hanya ada SATU tempat untuk menyetel ritme.
  const PROSODY_HINT_SENTENCE_MS = 220;
  const PROSODY_HINT_PARAGRAPH_MS = 420;

  /** Gabungan konstanta bawaan dengan override pemanggil; nilai non-angka diabaikan. */
  function resolveProsodyGaps(overrides) {
    const out = {};
    PROSODY_BOUNDARIES.forEach((key) => {
      const candidate = Number(overrides && overrides[key]);
      out[key] = Number.isFinite(candidate) && candidate >= 0 ? candidate : PROSODY_GAP_DEFAULT_S[key];
    });
    return Object.freeze(out);
  }

  /** Kelas batas dari teks yang BARU SAJA diucapkan (potongan sebelumnya). */
  function boundaryFromText(text) {
    const value = String(text == null ? '' : text);
    if (!value.trim()) return 'none';
    if (/\n\s*\n\s*$/.test(value)) return 'paragraph';
    const tail = value.replace(/[\s"'”’)\]]+$/, '');
    if (/[.!?…]$/.test(tail)) return 'sentence';
    if (/[,;:—-]$/.test(tail)) return 'clause';
    return 'none';
  }

  /** Kelas batas dari petunjuk milidetik lapisan atas. Lihat catatan ambang di atas. */
  function boundaryFromGapMs(gapMs) {
    const value = Number(gapMs);
    if (!Number.isFinite(value) || value <= 0) return 'none';
    if (value >= PROSODY_HINT_PARAGRAPH_MS) return 'paragraph';
    if (value >= PROSODY_HINT_SENTENCE_MS) return 'sentence';
    return 'clause';
  }

  function pickSamples(rawAudio) {
    if (!rawAudio) return null;
    if (rawAudio.audio instanceof Float32Array) return rawAudio.audio;
    if (rawAudio.data instanceof Float32Array) return rawAudio.data;
    if (rawAudio.audio && ArrayBuffer.isView(rawAudio.audio)) return Float32Array.from(rawAudio.audio);
    if (rawAudio.data && ArrayBuffer.isView(rawAudio.data)) return Float32Array.from(rawAudio.data);
    return null;
  }

  function pickSampleRate(rawAudio) {
    const n = Number(rawAudio && (rawAudio.sampling_rate || rawAudio.sample_rate || rawAudio.sampleRate));
    return Number.isFinite(n) && n >= 8000 && n <= 192000 ? n : 24000;
  }

  /** Mode tersimpan, diabaikan bila kedaluwarsa atau isinya tidak dikenal. */
  function readStoredPcmMode(env, now) {
    try {
      const store = env && env.localStorage;
      if (!store || typeof store.getItem !== 'function') return '';
      const raw = JSON.parse(store.getItem(PCM_DIAGNOSTIC_STORAGE_KEY) || 'null');
      if (!raw || !PCM_DIAGNOSTIC_MODES.includes(String(raw.mode || '').toLowerCase())) return '';
      const at = Number(raw.at) || 0;
      const clock = Number(now) || Date.now();
      if (!at || clock - at > PCM_DIAGNOSTIC_TTL_MS) return '';
      return String(raw.mode).toLowerCase();
    } catch (_) { return ''; }
  }

  /** Menulis atau menghapus mode. Nilai yang bukan mode dikenal berarti kembali ke produksi. */
  function setPcmDiagnosticMode(mode, env, now) {
    const target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    const value = String(mode || '').toLowerCase();
    try {
      const store = target.localStorage;
      if (!store || typeof store.setItem !== 'function') return '';
      if (!PCM_DIAGNOSTIC_MODES.includes(value)) {
        if (typeof store.removeItem === 'function') store.removeItem(PCM_DIAGNOSTIC_STORAGE_KEY);
        else store.setItem(PCM_DIAGNOSTIC_STORAGE_KEY, 'null');
        return '';
      }
      store.setItem(PCM_DIAGNOSTIC_STORAGE_KEY, JSON.stringify({ mode: value, at: Number(now) || Date.now() }));
      return value;
    } catch (_) { return ''; }
  }

  /**
   * Urutan penentuan: opsi eksplisit mengalahkan URL, URL mengalahkan mode tersimpan. Dengan
   * begitu pemanggilan langsung dan tab Safari berparameter tetap berperilaku seperti dulu.
   */
  function pcmDiagnosticMode(env, settings, now) {
    const explicit = settings && String(settings.pcmDiagnosticMode || '').toLowerCase();
    if (PCM_DIAGNOSTIC_MODES.includes(explicit)) return explicit;
    try {
      // Tanpa URL yang membawa mode, penentuan JATUH KE mode tersimpan - bukan berhenti di
      // sini. Sebelumnya baris ini keluar lebih awal, sehingga mode tersimpan tidak pernah
      // terbaca dan saklar di dalam aplikasi tidak berpengaruh sama sekali.
      const search = env && env.location && typeof env.location.search === 'string' ? env.location.search : '';
      const Params = env && (env.URLSearchParams || (typeof URLSearchParams !== 'undefined' ? URLSearchParams : null));
      if (search && Params) {
        const value = String(new Params(search).get(PCM_DIAGNOSTIC_PARAM) || '').toLowerCase();
        if (PCM_DIAGNOSTIC_MODES.includes(value)) return value;
      }
    } catch (_) {}
    return readStoredPcmMode(env, now);
  }

  /**
   * Membungkus PCM menjadi WAV 16-bit. Dipakai HANYA oleh mode wavref; jalur produksi tidak
   * pernah menyentuh fungsi ini.
   */
  // WAV diam sangat pendek, dipakai untuk "membuka kunci" elemen media di dalam gesture
  // pengguna. iOS hanya mengizinkan play() pada elemen yang pernah diputar saat gesture;
  // elemen yang baru dibuat beberapa detik kemudian - setelah generate selesai - akan ditolak.
  var SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YQAAAAA=';

  /**
   * Menyiapkan elemen pembanding DI DALAM gesture pengguna, lalu menyimpannya untuk dipakai
   * ulang. Tanpa ini, mode wavref tidak akan pernah berbunyi di iOS - dan itulah yang terjadi
   * pada uji fisik m025-66: pembandingnya bisu, lalu aplikasi mengira asetnya belum siap.
   */
  function primeReferenceElement(env) {
    const target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    const AudioCtor = target.Audio || (typeof Audio !== 'undefined' ? Audio : null);
    if (!AudioCtor) return Promise.resolve(false);
    let element = target.__fiezelWavRefElement;
    try {
      if (!element) {
        element = new AudioCtor();
        element.preload = 'auto';
        target.__fiezelWavRefElement = element;
      }
      element.src = SILENT_WAV;
      const started = element.play();
      const settle = started && typeof started.then === 'function' ? started : Promise.resolve();
      return settle.then(function () {
        try { element.pause(); } catch (_) {}
        target.__fiezelWavRefPrimed = true;
        return true;
      }, function () {
        target.__fiezelWavRefPrimed = false;
        return false;
      });
    } catch (_) {
      target.__fiezelWavRefPrimed = false;
      return Promise.resolve(false);
    }
  }

  /**
   * Memasang pembuka-kunci sekali-pakai pada gesture APA PUN di halaman.
   *
   * Bukti m025-67: elemen media ditolak 13 dari 13 kali dengan NotAllowedError, dan
   * `referencePrimed` tercatat false - membuka kunci hanya lewat tombol mode ternyata rapuh,
   * karena mode bertahan 24 jam sementara tombolnya mungkin ditekan di sesi atau build lain.
   * Sentuhan pertama pada apa pun sesudah aplikasi terbuka jauh lebih andal.
   */
  function armReferenceUnlock(env) {
    const target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    if (target.__fiezelWavRefUnlockArmed) return false;
    const doc = target.document;
    if (!doc || typeof doc.addEventListener !== 'function') return false;
    target.__fiezelWavRefUnlockArmed = true;
    const once = function () {
      try { primeReferenceElement(target); } catch (_) {}
      try {
        doc.removeEventListener('touchend', once, true);
        doc.removeEventListener('click', once, true);
      } catch (_) {}
    };
    try {
      doc.addEventListener('touchend', once, true);
      doc.addEventListener('click', once, true);
    } catch (_) { return false; }
    return true;
  }

  /**
   * Sinyal referensi deterministik, panjang tetap, tanpa model sama sekali.
   *
   * Bentuknya sengaja menyerupai ucapan pada pita frekuensi yang sama - nada dasar 150 Hz
   * dengan beberapa harmonik dan amplop suku kata - supaya kalau ada cacat pada keluaran
   * perangkat, cacat itu terdengar dengan cara yang sama seperti pada suara asli. Level
   * dijaga di 0,5 supaya tidak pernah mendekati clipping.
   */
  function buildReferenceTone(sampleRate, seconds) {
    const rate = Math.max(8000, Math.min(192000, Math.round(Number(sampleRate) || PREFERRED_SAMPLE_RATE)));
    const total = Math.max(1, Math.round(rate * (Number(seconds) || 3)));
    const out = new Float32Array(total);
    for (let i = 0; i < total; i += 1) {
      const t = i / rate;
      // m025-70: amplop suku kata 3 Hz DIHAPUS. Pada uji m025-69 OWNER mendengarnya sebagai
      // "beep beep beep", dan denyut itu menyulitkan tugas sebenarnya: menilai ada tidaknya
      // bunyi retak. Nada rata membuat retakan sekecil apa pun langsung terdengar, karena
      // tidak ada perubahan level yang bisa menyamarkannya.
      //
      // Yang tersisa hanya pelembut di ujung: naik 50 ms di awal dan turun 50 ms di akhir,
      // supaya awal dan akhirnya sendiri tidak menimbulkan klik yang bisa disalahartikan
      // sebagai cacat.
      const edge = Math.min(0.05, (total / rate) / 4);
      const fadeIn = Math.min(1, t / edge);
      const fadeOut = Math.min(1, (total / rate - t) / edge);
      const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
      const voiced = Math.sin(2 * Math.PI * 150 * t)
        + 0.5 * Math.sin(2 * Math.PI * 300 * t)
        + 0.25 * Math.sin(2 * Math.PI * 600 * t)
        + 0.12 * Math.sin(2 * Math.PI * 1200 * t);
      // Pembagi ini dikalibrasi ke puncak nyata ~0,5, bukan ke jumlah koefisien harmonik:
      // harmonik tidak pernah memuncak bersamaan, jadi memakai 1,87 membuat nadanya terlalu
      // pelan untuk dinilai telinga.
      out[i] = 0.5 * envelope * (voiced / 1.25);
    }
    return out;
  }

  // m025-71: jumlah langkah denoising sebagai mode diagnostik.
  //
  // Setelah m025-70, jalur keluaran perangkat terbukti sehat - nada rata buatan sendiri
  // terdengar mulus sekali di perangkat OWNER. Semua lapisan pemutar kita juga sudah dicoret
  // satu per satu. Yang tersisa adalah PCM yang dihasilkan model, dan model ini int8 penuh
  // dengan vocoder int8 serta hanya 4 langkah denoising.
  //
  // Menaikkan langkah adalah tuas paling murah yang tersedia: tidak menambah aset, tidak
  // mengubah kontrak, dan bisa dikembalikan seketika. Nilainya disimpan supaya bisa dipilih
  // dari dalam aplikasi terpasang, sama seperti mode PCM.
  var DENOISE_STEPS_KEY = 'fiezel-denoise-steps-v1';
  var DENOISE_STEPS_ALLOWED = Object.freeze([4, 8, 16]);
  var DENOISE_STEPS_TTL_MS = 24 * 60 * 60 * 1000;

  // Default produksi, satu tempat untuk KEDUA pintu masuk. Satu model melayani dua bahasa,
  // jadi selisih langkah di antara keduanya akan langsung terdengar sebagai dua suara berbeda.
  var DENOISE_STEPS_DEFAULT = 4;

  /** Langkah yang benar-benar dipakai: override diagnostik bila ada, kalau tidak default produksi. */
  function effectiveDenoiseSteps(env, now) {
    var override = denoiseSteps(env, now);
    return override > 0 ? override : DENOISE_STEPS_DEFAULT;
  }

  function denoiseSteps(env, now) {
    try {
      var store = env && env.localStorage;
      if (!store || typeof store.getItem !== 'function') return 0;
      var raw = JSON.parse(store.getItem(DENOISE_STEPS_KEY) || 'null');
      var steps = raw && Number(raw.steps);
      if (!DENOISE_STEPS_ALLOWED.includes(steps)) return 0;
      var at = Number(raw.at) || 0;
      var clock = Number(now) || Date.now();
      if (!at || clock - at > DENOISE_STEPS_TTL_MS) return 0;
      return steps;
    } catch (_) { return 0; }
  }

  /**
   * Anggaran waktu generate yang ikut naik bersama langkah denoising.
   *
   * Bukti m025-71 dari perangkat OWNER: pada 16 langkah, suaranya GAGAL dimuat. Sebabnya
   * aritmetika sederhana - anggaran standalone 30 detik, sementara 4 langkah saja sudah
   * memakan sekitar 6 detik untuk potongan pendek dan jauh lebih lama untuk potongan panjang.
   * Empat kali lipat langkah menembus anggaran itu, lalu permintaannya dibatalkan.
   *
   * Jadi anggaran diskalakan sebanding, dan hanya ketika override diagnostik aktif. Produksi
   * pada 4 langkah tetap memakai anggaran yang sama persis seperti hari ini.
   */
  function denoiseTimeoutMs(baseMs, env, now) {
    var base = Number(baseMs) > 0 ? Number(baseMs) : 0;
    if (!base) return base;
    var steps = denoiseSteps(env, now);
    if (!steps || steps <= DENOISE_STEPS_DEFAULT) return base;
    var scaled = Math.round(base * (steps / DENOISE_STEPS_DEFAULT));
    // Batas atas supaya satu potongan tidak pernah menggantung perangkat tanpa akhir.
    return Math.min(scaled, 240000);
  }

  function setDenoiseSteps(steps, env, now) {
    var target = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    var value = Number(steps);
    try {
      var store = target.localStorage;
      if (!store || typeof store.setItem !== 'function') return 0;
      if (!DENOISE_STEPS_ALLOWED.includes(value)) {
        if (typeof store.removeItem === 'function') store.removeItem(DENOISE_STEPS_KEY);
        else store.setItem(DENOISE_STEPS_KEY, 'null');
        return 0;
      }
      store.setItem(DENOISE_STEPS_KEY, JSON.stringify({ steps: value, at: Number(now) || Date.now() }));
      return value;
    } catch (_) { return 0; }
  }

  function encodeWav(samples, sampleRate) {
    const rate = Math.max(8000, Math.min(192000, Math.round(Number(sampleRate) || 24000)));
    const frames = samples.length;
    const buffer = new ArrayBuffer(44 + frames * 2);
    const view = new DataView(buffer);
    const ascii = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
    ascii(0, 'RIFF'); view.setUint32(4, 36 + frames * 2, true); ascii(8, 'WAVE');
    ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    ascii(36, 'data'); view.setUint32(40, frames * 2, true);
    for (let i = 0; i < frames; i++) {
      const clamped = Math.max(-1, Math.min(1, Number(samples[i]) || 0));
      view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
    }
    return buffer;
  }

  function analyzeSamples(samples) {
    if (!samples || !samples.length) {
      return Object.freeze({ samples: 0, finite: 0, nonFinite: 0, clipped: 0, peak: 0, rms: 0, mean: 0, impulses: 0 });
    }
    let finite = 0;
    let nonFinite = 0;
    let clipped = 0;
    let peak = 0;
    let sum = 0;
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i += 1) {
      const value = Number(samples[i]);
      if (!Number.isFinite(value)) { nonFinite += 1; continue; }
      finite += 1;
      sum += value;
      sumSquares += value * value;
      const magnitude = Math.abs(value);
      if (magnitude > peak) peak = magnitude;
      if (magnitude > 1) clipped += 1;
    }
    const mean = finite ? sum / finite : 0;
    const rms = finite ? Math.sqrt(sumSquares / finite) : 0;
    return Object.freeze({
      samples: samples.length,
      finite,
      nonFinite,
      clipped,
      peak,
      rms,
      mean,
      impulses: nonFinite ? null : findImpulses(samples).length
    });
  }

  function guardClipping(samples) {
    let peak = 0;
    let hasNonFinite = false;
    for (let i = 0; i < samples.length; i += 1) {
      const sample = Number(samples[i]);
      if (!Number.isFinite(sample)) { hasNonFinite = true; continue; }
      peak = Math.max(peak, Math.abs(sample));
    }
    if (!hasNonFinite && !(peak > 1)) return samples;
    const scale = peak > 1 ? 0.98 / peak : 1;
    const out = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i += 1) {
      const sample = Number(samples[i]);
      out[i] = Number.isFinite(sample) ? sample * scale : 0;
    }
    return out;
  }

  function conditionSamples(samples) {
    if (!samples || !samples.length) return samples;
    const length = samples.length;
    let sum = 0;
    let peak = 0;
    let hasNonFinite = false;
    for (let i = 0; i < length; i += 1) {
      const value = Number(samples[i]);
      if (!Number.isFinite(value)) { hasNonFinite = true; continue; }
      sum += value;
      peak = Math.max(peak, Math.abs(value));
    }
    const offset = hasNonFinite ? 0 : sum / length;
    const needsOffset = !hasNonFinite && Math.abs(offset) > DC_LIMIT && isSustainedOffset(samples, offset);
    const needsHeadroom = peak > PEAK_CEILING;
    if (!hasNonFinite && !needsOffset && !needsHeadroom) return samples;

    const out = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
      const value = Number(samples[i]);
      out[i] = Number.isFinite(value) ? value - (needsOffset ? offset : 0) : 0;
    }
    // m025-67: perbaikan impuls DIHAPUS, atas bukti perangkat dan bukti unit.
    //
    // Bukti perangkat (OWNER, m025-66): RAW - yaitu conditioning dimatikan - terdengar
    // "pecah sedang", sedangkan CONDITIONED terdengar "pecah berat". Conditioning MEMPERBURUK.
    //
    // Bukti mekanisme (lihat gate): pada sinyal ucapan biasa dengan enam transien plosif
    // normal, findImpulses() menandai keenamnya lalu menimpa sampelnya dengan rata-rata
    // tetangga - menggeser satu sampel sampai 0,60 dan menurunkan puncak dari 0,45 ke 0,30.
    // Itu memenggal letupan konsonan (t, k, p) dan justru menyisipkan diskontinuitas baru,
    // persis pada batas kata dan kalimat tempat OWNER mendengar bunyi retak.
    //
    // Yang tersisa di sini semuanya aman dan tidak menyentuh bentuk gelombang ucapan:
    // NaN/Infinity dinolkan, offset DC yang benar-benar bertahan dibuang, dan headroom
    // dijaga bila puncaknya melewati batas.
    let repairedPeak = 0;
    for (let i = 0; i < length; i += 1) repairedPeak = Math.max(repairedPeak, Math.abs(out[i]));
    if (repairedPeak > PEAK_CEILING) {
      const scale = PEAK_CEILING / repairedPeak;
      for (let i = 0; i < length; i += 1) out[i] *= scale;
    }
    return out;
  }

  function isSustainedOffset(samples, offset) {
    const size = Math.floor(samples.length / DC_BLOCKS);
    if (size < 8) return false;
    const sign = offset < 0 ? -1 : 1;
    for (let block = 0; block < DC_BLOCKS; block += 1) {
      let sum = 0;
      const start = block * size;
      for (let i = start; i < start + size; i += 1) sum += samples[i];
      const mean = sum / size;
      if (mean * sign <= DC_LIMIT) return false;
    }
    return true;
  }

  function deviation(samples, i) {
    return Math.abs(samples[i] - (samples[i - 1] + samples[i + 1]) / 2);
  }

  function findImpulses(samples) {
    const found = [];
    const last = samples.length - 2;
    for (let i = 1; i <= last; i += 1) {
      const magnitude = deviation(samples, i);
      if (magnitude < IMPULSE_MIN_JUMP) continue;
      if (i > 1 && deviation(samples, i - 1) > magnitude) continue;
      if (i < last && deviation(samples, i + 1) > magnitude) continue;
      const from = Math.max(1, i - IMPULSE_WINDOW);
      const to = Math.min(last, i + IMPULSE_WINDOW);
      let sum = 0;
      let count = 0;
      for (let k = from; k <= to; k += 1) {
        if (k >= i - 1 && k <= i + 1) continue;
        sum += deviation(samples, k);
        count += 1;
      }
      if (count && magnitude > IMPULSE_RATIO * (sum / count)) found.push(i);
    }
    return found;
  }

  function trimSilence(samples, sampleRate) {
    if (!samples || !samples.length) return samples;
    const rate = Number(sampleRate) > 0 ? Number(sampleRate) : PREFERRED_SAMPLE_RATE;
    const keep = Math.max(1, Math.round(rate * TRIM_KEEP_S));
    let start = 0;
    let end = samples.length - 1;
    while (start < end && Math.abs(samples[start]) < SILENCE_FLOOR) start += 1;
    while (end > start && Math.abs(samples[end]) < SILENCE_FLOOR) end -= 1;
    start = Math.max(0, start - keep);
    end = Math.min(samples.length - 1, end + keep);
    if (start === 0 && end === samples.length - 1) return samples;
    if (end <= start) return samples;
    return samples.subarray(start, end + 1);
  }

  function createPlayer(env, playerOptions) {
    env = env || (typeof globalThis !== 'undefined' ? globalThis : {});
    const settings = playerOptions || {};
    const preferredRate = Number(settings.sampleRate) > 0 ? Number(settings.sampleRate) : PREFERRED_SAMPLE_RATE;
    const AudioContextCtor = env.AudioContext || env.webkitAudioContext;
    const diagnosticMode = pcmDiagnosticMode(env, settings);
    const appleStandalone = Boolean(env && env.navigator && env.navigator.standalone === true);
    const WorkletNodeCtor = env.AudioWorkletNode || (typeof AudioWorkletNode !== 'undefined' ? AudioWorkletNode : null);
    let source = null;
    let sourceGain = null;
    let queued = [];
    let activePlaybackEpoch = 0;
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // --- keadaan pipa berkelanjutan -------------------------------------------------------
    // Kursor garis waktu AudioContext (detik). Ini SATU-SATUNYA sumber "kapan potongan
    // berikutnya mulai"; tidak ada satu pun jalur di bawah yang menunggu event `ended` untuk
    // memulai potongan berikutnya.
    let pipelineCursor = 0;
    // Dinaikkan oleh stop()/cancel(). Pipa yang sedang berjalan membandingkan nilainya sebelum
    // menjadwalkan potongan berikutnya, jadi potongan yang generate-nya selesai SESUDAH murid
    // pindah layar tidak pernah sampai ke destination - itu sumber "suara hantu".
    let pipelineGeneration = 0;
    let pipelineScheduledCount = 0;
    // Berapa kali PCM datang terlambat (kursor sudah lewat): satu-satunya celah yang tersisa
    // secara sah, dan angka yang harus dipantau kalau mesin lebih lambat dari realtime.
    let pipelineUnderruns = 0;
    const prosodyGaps = resolveProsodyGaps(settings.prosodyGaps);
    const pipelineLookahead = Math.max(1, Math.min(
      PIPELINE_MAX_QUEUED_CHUNKS,
      Math.floor(Number(settings.lookaheadChunks) > 0 ? Number(settings.lookaheadChunks) : PIPELINE_LOOKAHEAD_CHUNKS)
    ));

    function playbackEpoch() {
      if (!appleStandalone) return 0;
      return Math.max(0, Math.floor(Number(env.__fiezelPcmPlaybackEpoch) || 0));
    }

    function reservePlaybackEpoch(continuous) {
      if (!appleStandalone) return 0;
      if (continuous && activePlaybackEpoch > 0) return activePlaybackEpoch;
      const epoch = playbackEpoch() + 1;
      env.__fiezelPcmPlaybackEpoch = epoch;
      activePlaybackEpoch = epoch;
      return epoch;
    }

    function advancePlaybackEpoch() {
      if (!appleStandalone) { activePlaybackEpoch = 0; return 0; }
      const epoch = Math.max(playbackEpoch(), activePlaybackEpoch) + 1;
      env.__fiezelPcmPlaybackEpoch = epoch;
      activePlaybackEpoch = 0;
      return epoch;
    }

    function sink() {
      const module = env.FiezelVoiceDiagnostics;
      return module && typeof module.begin === 'function' ? module : null;
    }

    function recordDiagnostic(entry) {
      const trace = env.FiezelVoiceDiagnostics;
      if (!trace || typeof trace.record !== 'function') return false;
      try {
        return trace.record(Object.assign({
          t: Date.now(),
          v: String(env.FIEZEL_VERSION || '5.19.0'),
          phase: 'pcm_ab_playback',
          diagnosticMode
        }, entry || {}), env);
      } catch (_) { return false; }
    }

    function constructContext() {
      try { return new AudioContextCtor({ latencyHint: LATENCY_HINT, sampleRate: preferredRate }); } catch (_) {}
      try { return new AudioContextCtor({ latencyHint: LATENCY_HINT }); } catch (_) {}
      return new AudioContextCtor();
    }

    function ensureContext() {
      if (!AudioContextCtor) return null;
      if (!env.__fiezelWebAudioContext) env.__fiezelWebAudioContext = constructContext();
      return env.__fiezelWebAudioContext;
    }

    async function resumeContext() {
      const current = ensureContext();
      if (current && current.state === 'suspended' && typeof current.resume === 'function') {
        try { await Promise.race([current.resume(), delay(2500)]); } catch (_) {}
      }
      return current;
    }

    function contextTime(ctx) {
      return ctx && typeof ctx.currentTime === 'number' ? ctx.currentTime : 0;
    }

    function makeGain(ctx) {
      if (!ctx || typeof ctx.createGain !== 'function') return null;
      try { return ctx.createGain(); } catch (_) { return null; }
    }

    function rampGain(node, ctx, from, to, seconds, at) {
      if (!node || !node.gain) return false;
      const param = node.gain;
      const now = typeof at === 'number' ? at : contextTime(ctx);
      try {
        if (typeof param.setValueAtTime === 'function' && typeof param.linearRampToValueAtTime === 'function') {
          if (typeof param.cancelScheduledValues === 'function') param.cancelScheduledValues(now);
          param.setValueAtTime(from, now);
          param.linearRampToValueAtTime(to, now + seconds);
          return true;
        }
      } catch (_) {}
      try { param.value = to; } catch (_) {}
      return false;
    }

    function scheduleNaturalEndFade(node, ctx, durationSeconds, startAt) {
      if (!node || !node.gain || !(durationSeconds > FADE_IN_S + NATURAL_END_FADE_S)) return false;
      const param = node.gain;
      const begin = typeof startAt === 'number' ? startAt : contextTime(ctx);
      const endAt = begin + durationSeconds;
      const fadeAt = endAt - NATURAL_END_FADE_S;
      try {
        if (typeof param.setValueAtTime === 'function' && typeof param.linearRampToValueAtTime === 'function') {
          param.setValueAtTime(1, fadeAt);
          param.linearRampToValueAtTime(0, endAt);
          return true;
        }
      } catch (_) {}
      return false;
    }

    function fadeAndStop(node, gain, ctx) {
      if (!node) return;
      const value = gain && gain.gain && typeof gain.gain.value === 'number' ? gain.gain.value : 1;
      const ramped = rampGain(gain, ctx, value, 0, FADE_OUT_S);
      if (!ramped) { try { node.stop(); } catch (_) {} return; }
      setTimeout(() => { try { node.stop(); } catch (_) {} }, FADE_OUT_MS);
    }

    function finishLegacyEntry(entry) {
      if (!entry || entry.settled) return;
      entry.settled = true;
      queued = queued.filter((item) => item !== entry);
      if (source === entry.node) { source = null; sourceGain = null; }
      entry.release();
      entry.resolve();
    }

    function failWorkletRuntime(runtime, reason) {
      if (!runtime || runtime.failed) return;
      runtime.failed = true;
      const pending = Array.from(runtime.pending.values());
      runtime.pending.clear();
      pending.forEach((entry) => {
        try { entry.finish(true); } catch (_) {}
      });
      try { if (runtime.node && typeof runtime.node.disconnect === 'function') runtime.node.disconnect(); } catch (_) {}
      if (env.__fiezelPcmWorkletRuntime === runtime) env.__fiezelPcmWorkletRuntime = null;
      env.__fiezelPcmWorkletFailedContext = runtime.context;
      if (diagnosticMode) recordDiagnostic({ playbackPath: 'legacy', workletFallback: String(reason || 'processor_error') });
    }

    async function preparePcmWorklet(ctx) {
      if (!appleStandalone || !ctx || !ctx.audioWorklet || typeof ctx.audioWorklet.addModule !== 'function' || !WorkletNodeCtor) return null;
      if (env.__fiezelPcmWorkletFailedContext === ctx) return null;
      const existing = env.__fiezelPcmWorkletRuntime;
      if (existing && existing.context === ctx && existing.node && !existing.failed) return existing;
      const preparing = env.__fiezelPcmWorkletPreparing;
      if (preparing && preparing.context === ctx && preparing.promise) return preparing.promise;

      let promise;
      promise = (async () => {
        await ctx.audioWorklet.addModule(PCM_WORKLET_MODULE_URL);
        const node = new WorkletNodeCtor(ctx, 'fiezel-pcm-renderer', {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          channelCount: 1
        });
        const runtime = { context: ctx, node, pending: new Map(), failed: false };
        node.port.onmessage = (event) => {
          const message = event && event.data || {};
          const id = String(message.id || '');
          const entry = runtime.pending.get(id);
          if (!entry) return;
          if (message.type === 'done') entry.finish(message.cancelled === true);
          else if (message.type === 'error') entry.finish(true);
        };
        try { node.onprocessorerror = () => failWorkletRuntime(runtime, 'processor_error'); } catch (_) {}
        node.connect(ctx.destination);
        env.__fiezelPcmWorkletRuntime = runtime;
        return runtime;
      })().catch(() => {
        env.__fiezelPcmWorkletFailedContext = ctx;
        return null;
      }).finally(() => {
        const active = env.__fiezelPcmWorkletPreparing;
        if (active && active.promise === promise) env.__fiezelPcmWorkletPreparing = null;
      });
      env.__fiezelPcmWorkletPreparing = { context: ctx, promise };
      return promise;
    }

    function stopAll(ctx, epoch) {
      const pending = queued.slice();
      const workletRuntimes = new Set();
      queued = [];
      pending.forEach((entry) => {
        if (entry.settled) return;
        if (entry.kind === 'worklet') {
          workletRuntimes.add(entry.runtime);
          entry.finish(true);
          return;
        }
        entry.settled = true;
        fadeAndStop(entry.node, entry.gain, ctx);
        entry.release();
        entry.resolve();
      });
      const sharedRuntime = env.__fiezelPcmWorkletRuntime;
      if (sharedRuntime && (!ctx || sharedRuntime.context === ctx)) workletRuntimes.add(sharedRuntime);
      workletRuntimes.forEach((runtime) => {
        try {
          runtime.node.port.postMessage({
            type: 'clear',
            epoch: Math.max(playbackEpoch(), Math.floor(Number(epoch) || 0)),
            fadeOutFrames: Math.max(1, Math.round(FADE_OUT_S * Number(ctx && ctx.sampleRate || PREFERRED_SAMPLE_RATE)))
          });
        } catch (_) {}
      });
      source = null;
      sourceGain = null;
    }

    /**
     * Apakah masih ada bunyi terjadwal yang bisa disambung? Dipakai supaya antrean menyambung
     * LINTAS PANGGILAN `play()`/`enqueue()`, bukan hanya di dalam satu panggilan. Konteks dibaca
     * dari penyimpanan bersama (`env.__fiezelWebAudioContext`) supaya keputusan ini bisa diambil
     * sebelum `resumeContext()` dan tanpa pernah membuat AudioContext baru.
     */
    function timelineJoinable() {
      const ctx = env.__fiezelWebAudioContext;
      if (!ctx || !pipelineCursor) return false;
      return pipelineCursor > contextTime(ctx) + CROSS_CALL_JOIN_MIN_LEAD_S;
    }

    function scheduledUntil(ctx) {
      let until = 0;
      queued.forEach((entry) => { if (!entry.settled && entry.endsAt > until) until = entry.endsAt; });
      return Math.max(until, contextTime(ctx));
    }

    function playViaWorklet(current, runtime, samples, sampleRate, startAt, gapSeconds, epoch) {
      const sequence = (Number(env.__fiezelPcmWorkletSequence) || 0) + 1;
      env.__fiezelPcmWorkletSequence = sequence;
      const id = 'm028-pcm-' + sequence.toString(36);
      const durationSeconds = samples.length / sampleRate;
      let resolveDone;
      const done = new Promise((resolve) => { resolveDone = resolve; });
      const trace = sink();
      let holding = false;
      let timer = null;
      const release = () => {
        if (!holding) return;
        holding = false;
        try { if (trace) trace.end(env); } catch (_) {}
      };
      const entry = {
        kind: 'worklet',
        id,
        epoch,
        runtime,
        node: runtime.node,
        gain: null,
        endsAt: startAt + durationSeconds,
        settled: false,
        release,
        resolve: () => resolveDone()
      };
      const finish = (cancelled) => {
        if (entry.settled) return;
        entry.settled = true;
        if (timer) clearTimeout(timer);
        queued = queued.filter((item) => item !== entry);
        runtime.pending.delete(id);
        release();
        resolveDone({ cancelled: cancelled === true });
      };
      entry.finish = finish;
      runtime.pending.set(id, entry);
      queued.push(entry);
      try { if (trace) { trace.begin(); holding = true; } } catch (_) {}

      const transferable = new Float32Array(samples);
      try {
        runtime.node.port.postMessage({
          type: 'enqueue',
          id,
          epoch,
          sampleRate,
          samples: transferable,
          gapFrames: Math.max(0, Math.round(gapSeconds * sampleRate)),
          fadeInFrames: Math.max(1, Math.round(FADE_IN_S * sampleRate)),
          fadeOutFrames: Math.max(1, Math.round(NATURAL_END_FADE_S * sampleRate))
        }, [transferable.buffer]);
      } catch (error) {
        finish(true);
        failWorkletRuntime(runtime, 'post_message_failed');
        throw error;
      }
      const waitMs = Math.max(1000, Math.round((startAt - contextTime(current) + durationSeconds) * 1000) + 2500);
      timer = setTimeout(() => finish(false), waitMs);
      return {
        done,
        startsAt: startAt,
        endsAt: entry.endsAt,
        diagnosticMode,
        stop() {
          if (entry.settled) return;
          const stopEpoch = advancePlaybackEpoch();
          try {
            runtime.node.port.postMessage({
              type: 'clear',
              epoch: stopEpoch,
              fadeOutFrames: Math.max(1, Math.round(FADE_OUT_S * sampleRate))
            });
          } catch (_) {}
          finish(true);
        }
      };
    }

    /**
     * Pembanding pemutaran: PCM yang sama, tanpa AudioContext, worklet, penjadwalan, atau fade.
     * Ini satu-satunya cara memisahkan "modelnya yang cacat" dari "pemutaran kita yang cacat"
     * di perangkat nyata, dan itulah pertanyaan yang tiga rilis terakhir tidak bisa jawab.
     */
    /**
     * Pembanding di dalam Web Audio, tetapi tanpa lapisan yang dicurigai: worklet, fade, dan
     * penjadwalan seam. Satu buffer, satu source, langsung ke destination, mulai sekarang.
     *
     * Kalau arm ini bersih sementara Normal pecah, cacatnya ada di lapisan yang dilewati -
     * dan daftar tersangkanya tinggal tiga. Kalau arm ini juga pecah, ketiganya tidak bersalah
     * dan yang tersisa adalah PCM atau output perangkat.
     */
    async function playViaPlainBuffer(samples, sampleRate, rawStats, renderedStats, opts) {
      const current = await resumeContext();
      if (!current || typeof current.createBufferSource !== 'function' || typeof current.createBuffer !== 'function') {
        recordDiagnostic({ playbackPath: 'plain_buffer', referenceFallback: 'audio_context_unavailable' });
        return null;
      }
      let node = null;
      try {
        const rate = Number(sampleRate) || PREFERRED_SAMPLE_RATE;
        const buffer = current.createBuffer(1, samples.length, rate);
        if (typeof buffer.copyToChannel === 'function') buffer.copyToChannel(samples, 0, 0);
        else buffer.getChannelData(0).set(samples);
        node = current.createBufferSource();
        node.buffer = buffer;
        node.connect(current.destination);
      } catch (error) {
        recordDiagnostic({
          playbackPath: 'plain_buffer',
          referenceFallback: String((error && error.name) || 'buffer_failed').slice(0, 40)
        });
        return null;
      }

      let settled = false;
      let resolveDone;
      const done = new Promise((resolve) => { resolveDone = resolve; });
      const finish = () => { if (settled) return; settled = true; resolveDone(); };
      node.onended = finish;
      const durationSeconds = samples.length / (Number(sampleRate) || PREFERRED_SAMPLE_RATE);
      recordDiagnostic({
        playbackPath: 'plain_buffer',
        sourceSampleRate: sampleRate,
        contextSampleRate: Number(current.sampleRate) || null,
        resamplingExpected: Number(current.sampleRate) > 0 && Number(current.sampleRate) !== sampleRate,
        trimmed: opts.trim === true,
        raw: rawStats,
        rendered: renderedStats,
        bypassed: 'worklet,fade,seam_scheduling',
        syntheticReference: diagnosticMode === 'toneref'
      });
      try { node.start(); } catch (error) {
        finish();
        recordDiagnostic({ playbackPath: 'plain_buffer', referenceFallback: 'start_failed' });
        return null;
      }
      setTimeout(finish, Math.max(1000, Math.round(durationSeconds * 1000) + 2500));
      return {
        done,
        startsAt: contextTime(current),
        endsAt: contextTime(current) + durationSeconds,
        diagnosticMode,
        stop() { try { node.stop(); } catch (_) {} finish(); }
      };
    }

    async function playViaMediaElement(samples, sampleRate, rawStats, renderedStats, opts) {
      const AudioCtor = env.Audio || (typeof Audio !== 'undefined' ? Audio : null);
      const BlobCtor = env.Blob || (typeof Blob !== 'undefined' ? Blob : null);
      const urls = env.URL || (typeof URL !== 'undefined' ? URL : null);
      if (!AudioCtor || !BlobCtor || !urls || typeof urls.createObjectURL !== 'function') {
        recordDiagnostic({ playbackPath: 'media_element', referenceFallback: 'media_element_unavailable' });
        return null;
      }
      const wav = encodeWav(samples, sampleRate);
      const url = urls.createObjectURL(new BlobCtor([wav], { type: 'audio/wav' }));
      // Pakai ulang elemen yang sudah dibuka kuncinya saat pengguna menekan tombol mode.
      const element = env.__fiezelWavRefElement || new AudioCtor();
      element.src = url;
      element.preload = 'auto';
      let settled = false;
      let resolveDone;
      const done = new Promise((resolve) => { resolveDone = resolve; });
      const cleanup = () => {
        if (settled) return;
        settled = true;
        try { if (typeof urls.revokeObjectURL === 'function') urls.revokeObjectURL(url); } catch (_) {}
        resolveDone();
      };
      element.onended = cleanup;
      element.onerror = cleanup;
      recordDiagnostic({
        playbackPath: 'media_element',
        sourceSampleRate: sampleRate,
        contextSampleRate: null,
        resamplingExpected: false,
        trimmed: opts.trim === true,
        raw: rawStats,
        rendered: renderedStats,
        wavBytes: wav.byteLength,
        referencePrimed: env.__fiezelWavRefPrimed === true
      });
      try {
        await element.play();
      } catch (error) {
        // iOS menolak play() pada elemen yang dibuat di luar jendela gesture pengguna.
        cleanup();
        recordDiagnostic({
          playbackPath: 'media_element',
          referenceFallback: String((error && error.name) || 'play_rejected').slice(0, 40)
        });
        return null;
      }
      return {
        done,
        startsAt: 0,
        endsAt: samples.length / (Number(sampleRate) || 24000),
        diagnosticMode,
        stop() {
          try { element.pause(); } catch (_) {}
          cleanup();
        }
      };
    }

    /**
     * Kelas batas untuk satu panggilan enqueue.
     *
     * Urutan: `boundary` eksplisit -> teks potongan SEBELUMNYA -> petunjuk `gapMs` dari lapisan
     * atas. `gapMs` TIDAK dipakai sebagai panjang jeda, hanya sebagai penanda kelas: kalau dua
     * lapisan sama-sama menambahkan jeda, murid mendengar keduanya berturut-turut dan hasilnya
     * justru lebih lambat dari sebelum diperbaiki.
     */
    function resolveBoundary(opts) {
      const explicit = String(opts && opts.boundary || '').toLowerCase();
      if (PROSODY_BOUNDARIES.includes(explicit)) return explicit;
      if (opts && typeof opts.previousText === 'string' && opts.previousText) return boundaryFromText(opts.previousText);
      if (opts && opts.gapMs != null) return boundaryFromGapMs(opts.gapMs);
      return 'none';
    }

    /**
     * Menjadwalkan satu potongan pada garis waktu yang berkelanjutan dan langsung kembali.
     *
     * Tiga hal yang membuatnya tidak berceleh:
     *   - `start(startAt)` dengan startAt = kursor + jeda prosodi, bukan `start()` "sekarang";
     *   - kursor maju sebesar durasi potongan, jadi potongan berikutnya sudah punya tempat
     *     bahkan sebelum potongan ini terdengar;
     *   - keheningan tak sengaja di kedua ujung PCM dipotong lebih dulu, sehingga satu-satunya
     *     keheningan yang tersisa di sambungan adalah jeda prosodi yang kita pilih sendiri.
     *
     * Tidak ada `onended` di jalur ini. Penyelesaian dicatat oleh timer pada waktu akhir yang
     * SUDAH diketahui saat penjadwalan; `ended` hanya dipakai kalau pemutaran perlu menunggu
     * bunyi selesai untuk memulai yang berikutnya - dan justru itu yang dihapus.
     */
    async function enqueue(rawAudio, options) {
      const opts = options || {};
      if (!AudioContextCtor) throw new Error('Web Audio API unavailable');
      let samples = pickSamples(rawAudio);
      if (!samples || !samples.length) throw new Error('Unsupported Kokoro audio payload');
      const sampleRate = pickSampleRate(rawAudio);
      // Trim default AKTIF di pipa: keheningan kepala/ekor dari model adalah jeda tidak
      // sengaja. Ambangnya SILENCE_FLOOR dengan TRIM_KEEP_S sampel yang tetap disisakan di
      // kedua ujung, supaya awal kata dan ekor konsonan tidak ikut terpotong.
      // Audit V1: pemanggil produksi mengirim SATU kalimat per panggilan dan menyertakan
      // `trim:false`; itulah sebabnya 733 ms keheningan per batas tetap berbunyi. Karena itu
      // `trim:false` tidak lagi mematikan pemangkasan - hanya `trim:'off'` yang eksplisit.
      const trimRequested = opts.trim !== 'off' && diagnosticMode !== 'raw';
      if (trimRequested) samples = trimSilence(samples, sampleRate);
      if (diagnosticMode !== 'raw') samples = conditionSamples(samples);
      if (!samples.length) throw new Error('Unsupported Kokoro audio payload');

      // Menyambung LINTAS PANGGILAN: potongan tunggal dari `speak()` berikutnya tetap masuk ke
      // garis waktu yang sama selama masih ada bunyi terjadwal. `interrupt:true` memaksa putus.
      const joined = opts.interrupt === true ? false : (opts.continuous === true || timelineJoinable());
      const generationAtEntry = pipelineGeneration;
      const epoch = reservePlaybackEpoch(joined);
      // SATU AudioContext untuk seumur halaman. resumeContext() memakai instance bersama di
      // env.__fiezelWebAudioContext dan hanya me-resume; tidak ada konstruksi per potongan,
      // karena iOS membatasi jumlah AudioContext dan menolak yang dibuat di luar gesture.
      const current = await resumeContext();
      if (!current) throw new Error('Web Audio API unavailable');
      if (pipelineGeneration !== generationAtEntry) throw new Error('TTS playback superseded');
      if (typeof current.createBuffer !== 'function' || typeof current.createBufferSource !== 'function') {
        throw new Error('Web Audio API unavailable');
      }

      // Ucapan baru menggantikan yang lama: bersihkan yang terjadwal lalu mulai kursor dari nol.
      if (!joined) { stopAll(current, epoch); pipelineCursor = 0; }

      const boundary = resolveBoundary(opts);
      const gapSeconds = joined ? (prosodyGaps[boundary] || 0) : 0;
      const now = contextTime(current);
      const floorAt = now + SCHEDULE_LEAD_S;
      let base = pipelineCursor;
      let underrun = false;
      if (!(base > floorAt)) {
        if (joined && pipelineCursor > 0) { underrun = true; pipelineUnderruns += 1; }
        base = floorAt;
      }
      const startAt = base + gapSeconds;
      const durationSeconds = samples.length / sampleRate;
      pipelineCursor = startAt + durationSeconds;

      const buffer = current.createBuffer(1, samples.length, sampleRate);
      if (typeof buffer.copyToChannel === 'function') buffer.copyToChannel(samples, 0);
      else buffer.getChannelData(0).set(samples);
      const localSource = current.createBufferSource();
      const localGain = makeGain(current);
      localSource.buffer = buffer;
      if (localGain) {
        localSource.connect(localGain);
        localGain.connect(current.destination);
        // Fade sangat pendek di kedua ujung potongan: menghilangkan klik sambungan tanpa
        // menambah keheningan yang bisa terdengar sebagai jeda.
        rampGain(localGain, current, 0, 1, FADE_IN_S, startAt);
        scheduleNaturalEndFade(localGain, current, durationSeconds, startAt);
      } else {
        localSource.connect(current.destination);
      }

      let resolveDone;
      const done = new Promise((resolve) => { resolveDone = resolve; });
      const trace = sink();
      let holding = false;
      let timer = null;
      const release = () => {
        if (!holding) return;
        holding = false;
        try { if (trace) trace.end(env); } catch (_) {}
      };
      const entry = {
        kind: 'pipeline',
        epoch,
        node: localSource,
        gain: localGain,
        boundary,
        gapSeconds,
        startsAt: startAt,
        endsAt: pipelineCursor,
        underrun,
        settled: false,
        done,
        release,
        // Dipanggil oleh stopAll(): potongan sudah ditandai settled di sana, jadi jalur ini
        // hanya perlu memastikan `done` TETAP selesai - kalau tidak, pemanggil yang menunggu
        // potongan terakhir akan menggantung setelah murid menekan berhenti.
        resolve: () => { if (timer) clearTimeout(timer); resolveDone({ cancelled: true }); }
      };
      const finish = (cancelled) => {
        if (entry.settled) return;
        entry.settled = true;
        if (timer) clearTimeout(timer);
        queued = queued.filter((item) => item !== entry);
        release();
        resolveDone({ cancelled: cancelled === true });
      };
      entry.finish = finish;
      queued.push(entry);
      pipelineScheduledCount += 1;
      try { if (trace) { trace.begin(); holding = true; } } catch (_) {}

      try {
        localSource.start(startAt);
      } catch (error) {
        finish(true);
        throw error;
      }
      timer = setTimeout(() => finish(false), Math.max(1, Math.round((entry.endsAt - now) * 1000)) + FADE_OUT_MS);
      return {
        done,
        startsAt: startAt,
        endsAt: entry.endsAt,
        boundary,
        gapSeconds,
        underrun,
        trimmed: trimRequested,
        joined,
        diagnosticMode,
        stop() {
          if (entry.settled) return;
          advancePlaybackEpoch();
          queued = queued.filter((item) => item !== entry);
          fadeAndStop(localSource, localGain, current);
          finish(true);
        }
      };
    }

    /**
     * Pemutaran BERPIPA untuk satu ucapan berpotongan-potongan.
     *
     * `generate(text, index)` adalah adapter mesin suara (dipanggil, tidak disentuh isinya).
     * Pipa memanggilnya untuk `pipelineLookahead` potongan di DEPAN potongan yang sedang
     * berbunyi, jadi waktu generate potongan N+1 dibayar oleh waktu bunyi potongan N - itulah
     * seluruh perbaikan yang diminta owner. Tidak ada `prepare()`, `ensureReady()`, atau apa pun
     * yang berhubungan dengan unduhan model di jalur ini: pipa hanya berbunyi dengan mesin yang
     * SUDAH siap.
     */
    async function playSequence(items, generate, options) {
      const opts = options || {};
      if (typeof generate !== 'function') throw new Error('playSequence requires a generate function');
      const list = (Array.isArray(items) ? items : []).map((item) => (
        item && typeof item === 'object' ? { text: String(item.text || ''), boundary: item.boundary } : { text: String(item || '') }
      )).filter((item) => item.text.length > 0);
      if (!list.length) return { chunks: 0, scheduled: [], cancelled: false };

      const myGeneration = pipelineGeneration;
      const cancelled = () => pipelineGeneration !== myGeneration;
      const inflight = [];
      let issued = 0;
      // Mengisi pipa. Dipanggil SEBELUM menunggu apa pun, supaya generate potongan berikutnya
      // sudah berjalan selagi potongan sekarang berbunyi.
      const fill = () => {
        while (inflight.length < pipelineLookahead && issued < list.length && !cancelled()) {
          const index = issued;
          issued += 1;
          inflight.push({
            index,
            promise: Promise.resolve()
              .then(() => generate(list[index].text, index))
              .then((value) => ({ ok: true, value }), (error) => ({ ok: false, error }))
          });
        }
      };
      fill();

      const scheduled = [];
      let last = null;
      while (inflight.length) {
        const head = inflight.shift();
        const outcome = await head.promise;
        if (cancelled()) return { chunks: list.length, scheduled, cancelled: true };
        if (!outcome.ok) throw outcome.error;
        const previous = head.index > 0 ? list[head.index - 1] : null;
        const playback = await enqueue(outcome.value, {
          continuous: head.index > 0,
          trim: opts.trim,
          boundary: previous ? previous.boundary : undefined,
          previousText: previous ? previous.text : '',
          signalGeneration: opts.signalGeneration
        });
        if (cancelled()) { try { playback.stop(); } catch (_) {} return { chunks: list.length, scheduled, cancelled: true }; }
        scheduled.push({ index: head.index, startsAt: playback.startsAt, endsAt: playback.endsAt, boundary: playback.boundary, gapSeconds: playback.gapSeconds, underrun: playback.underrun });
        last = playback;
        // Isi ulang pipa DI SINI - sebelum menunggu apa pun. Ini baris yang memindahkan waktu
        // generate ke belakang bunyi.
        fill();
        // Tekanan-balik memori, bukan tekanan-balik waktu: menunggu potongan TERTUA selesai
        // tidak pernah membuat celah, karena potongan yang sedang berbunyi dan yang berikutnya
        // sudah terjadwal di garis waktu.
        while (queued.filter((entry) => entry.kind === 'pipeline' && !entry.settled).length >= PIPELINE_MAX_QUEUED_CHUNKS) {
          const oldest = queued.find((entry) => entry.kind === 'pipeline' && !entry.settled);
          if (!oldest) break;
          if (oldest.done && typeof oldest.done.then === 'function') {
            await oldest.done;
          } else {
            await new Promise((resolve) => {
              const at = Math.max(1, Math.round((oldest.endsAt - contextTime(env.__fiezelWebAudioContext)) * 1000) + FADE_OUT_MS + 2);
              setTimeout(resolve, at);
            });
          }
          if (cancelled()) return { chunks: list.length, scheduled, cancelled: true };
        }
      }
      if (last && last.done && typeof last.done.then === 'function') await last.done;
      return { chunks: list.length, scheduled, cancelled: cancelled() };
    }

    function pipelineStats() {
      return Object.freeze({
        cursor: pipelineCursor,
        generation: pipelineGeneration,
        scheduledCount: pipelineScheduledCount,
        underruns: pipelineUnderruns,
        lookahead: pipelineLookahead,
        maxQueued: PIPELINE_MAX_QUEUED_CHUNKS,
        gaps: prosodyGaps,
        pending: queued.filter((entry) => entry.kind === 'pipeline' && !entry.settled).length
      });
    }

    async function play(rawAudio, options) {
      const opts = options || {};
      // Pembanding WAV memang harus bisa berjalan tanpa Web Audio sama sekali; kalau ia masih
      // menuntut AudioContext, ia bukan pembanding independen.
      if (!AudioContextCtor && diagnosticMode !== 'wavref') throw new Error('Web Audio API unavailable');
      // Kontinuitas dari KENYATAAN garis waktu, bukan dari flag pemanggil. Pemanggil hanya bisa
      // memaksa PUTUS (`interrupt:true`), yaitu kalau ucapan baru memang harus menggantikan
      // ucapan lama, bukan menyambungnya.
      const joined = opts.interrupt === true ? false : (opts.continuous === true || timelineJoinable());
      const epoch = reservePlaybackEpoch(joined);
      let samples = pickSamples(rawAudio);
      if (!samples || !samples.length) throw new Error('Unsupported Kokoro audio payload');
      const sampleRate = pickSampleRate(rawAudio);
      // Pangkas keheningan SELALU, termasuk untuk potongan tunggal. Audit V1 mengukur 331 ms
      // keheningan kepala + 361 ms ekor pada setiap potongan tunggal yang lolos tanpa dipangkas:
      // 733 ms, yaitu 16,6% dari jeda 4.422 ms yang dikeluhkan owner. `trim:false` dari pemanggil
      // lama TIDAK lagi mematikan pemangkasan; hanya mode diagnostik `raw` (yang memang harus
      // memutar PCM apa adanya) dan `trim:'off'` yang eksplisit.
      const trimRequested = opts.trim !== 'off' && diagnosticMode !== 'raw';
      if (trimRequested) samples = trimSilence(samples, sampleRate);
      const rawStats = diagnosticMode ? analyzeSamples(samples) : null;
      if (diagnosticMode !== 'raw') samples = conditionSamples(samples);
      const renderedStats = diagnosticMode ? analyzeSamples(samples) : null;
      if (!samples.length) throw new Error('Unsupported Kokoro audio payload');
      if (diagnosticMode === 'toneref') {
        // PCM model diganti sepenuhnya; yang diputar adalah sinyal buatan sendiri.
        const toneRate = Number(sampleRate) || PREFERRED_SAMPLE_RATE;
        const tone = buildReferenceTone(toneRate, 3);
        const toneStats = analyzeSamples(tone);
        const played = await playViaPlainBuffer(tone, toneRate, toneStats, toneStats, opts);
        if (played) return played;
      }
      if (diagnosticMode === 'plainbuffer') {
        const plain = await playViaPlainBuffer(samples, sampleRate, rawStats, renderedStats, opts);
        if (plain) return plain;
      }
      if (diagnosticMode === 'wavref') {
        // Kalau pembanding gagal dipakai (iOS memblokir play() di luar gesture, atau elemen
        // media tidak tersedia), JANGAN melempar. Melempar membuat runtime suara mengira
        // asetnya belum siap dan menyuruh pengguna mengunduh ulang suara yang sudah ada -
        // itu yang terjadi pada uji fisik m025-66. Jatuh balik ke jalur normal, dan catat
        // alasannya supaya arm yang gagal terlihat jelas di Diagnostics.
        const reference = await playViaMediaElement(samples, sampleRate, rawStats, renderedStats, opts);
        if (reference) return reference;
      }
      const current = await resumeContext();
      if (!current) throw new Error('Web Audio API unavailable');

      const contextRate = Number(current.sampleRate) || null;
      if (diagnosticMode) {
        recordDiagnostic({
          sourceSampleRate: sampleRate,
          contextSampleRate: contextRate,
          resamplingExpected: contextRate > 0 && contextRate !== sampleRate,
          trimmed: trimRequested,
          raw: rawStats,
          rendered: renderedStats
        });
      }

      let pcmWorklet = null;
      if (appleStandalone && contextRate === sampleRate) {
        pcmWorklet = await preparePcmWorklet(current);
      } else if (appleStandalone && diagnosticMode) {
        recordDiagnostic({
          playbackPath: 'legacy',
          workletFallback: contextRate && contextRate !== sampleRate ? 'sample_rate_mismatch' : 'worklet_unavailable',
          sourceSampleRate: sampleRate,
          contextSampleRate: contextRate
        });
      }

      const now = contextTime(current);
      // Panjang jeda SELALU dari tabel konstanta prosodi; petunjuk `gapMs`/`boundary`/teks dari
      // lapisan atas hanya menentukan KELASNYA. Kalau tidak, jeda pemanggil dan jeda pemutar
      // tertumpuk dan satu batas kalimat jadi dua kali lebih panjang dari yang dikalibrasi.
      const boundary = resolveBoundary(opts);
      const gapSeconds = joined ? Math.max(0, Number(prosodyGaps[boundary]) || 0) : 0;
      const durationSeconds = samples.length / sampleRate;
      let startAt = now;
      if (joined) {
        const base = Math.max(pipelineCursor, scheduledUntil(current));
        if (base <= now) { pipelineUnderruns += 1; startAt = now + SCHEDULE_LEAD_S + gapSeconds; }
        else startAt = base + gapSeconds;
      } else {
        stopAll(current, epoch);
        pipelineCursor = 0;
      }
      pipelineCursor = startAt + durationSeconds;
      pipelineScheduledCount += 1;

      if (pcmWorklet) {
        if (epoch < playbackEpoch()) throw new Error('TTS playback superseded');
        if (diagnosticMode) recordDiagnostic({ playbackPath: 'audio-worklet', sourceSampleRate: sampleRate, contextSampleRate: contextRate });
        return playViaWorklet(current, pcmWorklet, samples, sampleRate, startAt, joined ? gapSeconds : 0, epoch);
      }

      if (epoch < playbackEpoch()) throw new Error('TTS playback superseded');
      const buffer = current.createBuffer(1, samples.length, sampleRate);
      buffer.copyToChannel(samples, 0);
      const localSource = current.createBufferSource();
      const localGain = makeGain(current);
      source = localSource;
      sourceGain = localGain;
      localSource.buffer = buffer;
      if (localGain) {
        localSource.connect(localGain);
        localGain.connect(current.destination);
        rampGain(localGain, current, 0, 1, FADE_IN_S, joined ? startAt : undefined);
        scheduleNaturalEndFade(localGain, current, durationSeconds, joined ? startAt : undefined);
      } else {
        localSource.connect(current.destination);
      }

      let resolveDone;
      const done = new Promise((resolve) => { resolveDone = resolve; });
      const trace = sink();
      let holding = false;
      const release = () => {
        if (!holding) return;
        holding = false;
        try { if (trace) trace.end(env); } catch (_) {}
      };
      const entry = {
        kind: 'legacy',
        epoch,
        node: localSource,
        gain: localGain,
        endsAt: startAt + durationSeconds,
        settled: false,
        release,
        resolve: () => resolveDone()
      };
      const finish = () => finishLegacyEntry(entry);
      localSource.onended = finish;
      queued.push(entry);
      try { if (trace) { trace.begin(); holding = true; } } catch (_) {}
      try {
        // Penjadwalan pada garis waktu, bukan menunggu potongan sebelumnya selesai. `onended` di
        // jalur ini hanya membereskan node yang sudah habis; ia tidak memulai apa pun.
        if (startAt > now) localSource.start(startAt);
        else localSource.start();
      } catch (error) {
        finish();
        throw error;
      }
      const waitMs = Math.max(1000, Math.round((startAt - now + durationSeconds) * 1000) + 2500);
      setTimeout(finish, waitMs);
      return {
        done,
        startsAt: startAt,
        endsAt: entry.endsAt,
        boundary,
        gapSeconds,
        trimmed: trimRequested,
        joined,
        diagnosticMode,
        stop() {
          if (entry.settled) return;
          advancePlaybackEpoch();
          entry.settled = true;
          queued = queued.filter((item) => item !== entry);
          if (source === localSource) { source = null; sourceGain = null; }
          fadeAndStop(localSource, localGain, current);
          release();
          resolveDone();
        }
      };
    }

    function stop() {
      const ctx = env.__fiezelWebAudioContext;
      const epoch = advancePlaybackEpoch();
      // Membatalkan pipa: kursor dinolkan supaya penjadwalan berikutnya tidak menyambung ke
      // garis waktu yang sudah mati, dan generasi dinaikkan supaya potongan yang generate-nya
      // baru selesai SESUDAH ini tidak pernah dijadwalkan. Keduanya harus terjadi SEBELUM
      // stopAll, karena stopAll bisa memicu penyelesaian yang membangunkan pemanggil.
      pipelineCursor = 0;
      pipelineGeneration += 1;
      if (queued.length) { stopAll(ctx, epoch); return; }
      if (source) {
        fadeAndStop(source, sourceGain, ctx);
        source = null;
        sourceGain = null;
      }
      const runtime = env.__fiezelPcmWorkletRuntime;
      if (runtime && runtime.node && runtime.node.port) {
        try {
          runtime.node.port.postMessage({
            type: 'clear',
            epoch,
            fadeOutFrames: Math.max(1, Math.round(FADE_OUT_S * Number(ctx && ctx.sampleRate || PREFERRED_SAMPLE_RATE)))
          });
        } catch (_) {}
      }
    }

    function close() {
      stop();
      const current = env.__fiezelWebAudioContext;
      const runtime = env.__fiezelPcmWorkletRuntime;
      if (runtime && (!current || runtime.context === current)) {
        const pending = Array.from(runtime.pending.values());
        runtime.pending.clear();
        pending.forEach((entry) => {
          try { entry.finish(true); } catch (_) {}
        });
        try { if (runtime.node && typeof runtime.node.disconnect === 'function') runtime.node.disconnect(); } catch (_) {}
        env.__fiezelPcmWorkletRuntime = null;
        env.__fiezelPcmWorkletPreparing = null;
        env.__fiezelPcmWorkletFailedContext = null;
      }
      if (current) {
        try { if (typeof current.close === 'function') current.close(); } catch (_) {}
        env.__fiezelWebAudioContext = null;
      }
    }

    function warm() {
      if (!AudioContextCtor) return false;
      try {
        const current = ensureContext();
        if (current && current.state === 'suspended' && typeof current.resume === 'function') {
          try { current.resume().catch(() => {}); } catch (_) {}
        }
        if (appleStandalone) {
          try { preparePcmWorklet(current).catch(() => {}); } catch (_) {}
        }
        return true;
      } catch (_) { return false; }
    }

    // `cancel` adalah nama yang sama dengan yang dipakai lapisan UI ketika murid pindah layar;
    // menyediakan keduanya menghindari satu pemanggil yang lupa memanggil stop().
    return Object.freeze({ play, enqueue, playSequence, pipelineStats, stop, cancel: stop, warm, close });
  }

  return Object.freeze({
    createPlayer,
    resolveProsodyGaps,
    boundaryFromText,
    boundaryFromGapMs,
    PROSODY_GAP_DEFAULT_S,
    PROSODY_BOUNDARIES,
    PROSODY_HINT_SENTENCE_MS,
    PROSODY_HINT_PARAGRAPH_MS,
    PIPELINE_LOOKAHEAD_CHUNKS,
    PIPELINE_MAX_QUEUED_CHUNKS,
    SCHEDULE_LEAD_S,
    pickSamples,
    pickSampleRate,
    pcmDiagnosticMode,
    setPcmDiagnosticMode,
    primeReferenceElement,
    armReferenceUnlock,
    readStoredPcmMode,
    encodeWav,
    buildReferenceTone,
    denoiseSteps,
    effectiveDenoiseSteps,
    denoiseTimeoutMs,
    setDenoiseSteps,
    DENOISE_STEPS_DEFAULT,
    DENOISE_STEPS_ALLOWED,
    DENOISE_STEPS_KEY,
    analyzeSamples,
    guardClipping,
    conditionSamples,
    trimSilence,
    PCM_DIAGNOSTIC_PARAM,
    PCM_DIAGNOSTIC_MODES,
    PCM_DIAGNOSTIC_STORAGE_KEY,
    PCM_DIAGNOSTIC_TTL_MS,
    PREFERRED_SAMPLE_RATE,
    LATENCY_HINT,
    PEAK_CEILING,
    SILENCE_FLOOR
  });
});
