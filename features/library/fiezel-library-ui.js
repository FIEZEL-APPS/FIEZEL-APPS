/**
 * m025-44 Library screen: shelf, reader, audiobook, instant translation, Ask Fiezel.
 *
 * The reader renders one <button> per sentence rather than a block of text. That single
 * decision is what makes the rest work:
 *
 *   - tapping a sentence is a normal button press, so the translation appears instantly
 *     and no text-selection UI is involved (selection is disabled app-wide anyway);
 *   - the audiobook can highlight exactly what it is reading, because the narrator and
 *     the DOM share one sentence index;
 *   - "Tanya Fiezel" always has a precise subject: the sentence the learner tapped.
 *
 * Narration is the neural English voice already shipped with the app. There is no audio
 * file to license, ship or cache, and it keeps working offline once the voice bundle is
 * downloaded - which is now mandatory at install.
 */
(function (root) {
  'use strict';
  if (!root || !root.document || root.__fiezelLibraryUiInstalled) return;
  root.__fiezelLibraryUiInstalled = true;

  var doc = root.document;
  var PROGRESS_KEY = 'fiezel-library-progress-v1';
  // m025-84: pembaca buku persis layar yang disebut owner - "dari menu terus menuju ke fitur
  // audiobook, ketika ingin kembali dan swipe back, itu tidak berfungsi". Ia bukan view
  // tersendiri di app.js (state.view tetap 'library'), jadi tanpa entri riwayatnya sendiri ia
  // tidak akan pernah terlihat oleh gestur kembali. Nama lapisan ini yang dipegang riwayat.
  var READER_LAYER = 'library-reader';
  var pack = null;
  var packPromise = null;
  var session = null;
  var narrating = false;
  var narrationToken = 0;
  /* =========================== V6 audiobook: TEKS UTUH ==============================
     Sampai V6 narasi mengirim SATU KALIMAT per say() lalu menunggu bunyinya habis. Itu
     yang mematikan seluruh mesin gapless di bawahnya: chunks.length === 1 membuat `joined`
     false, penjadwalan berkelanjutan dan pemangkasan senyap tidak menyala
     (reports/voice-v3-chunk.md §1-§3, reports/voice-v2-player.md §1), dan setiap titik
     membayar satu batas generasi penuh (~4,5 detik, reports/voice-v1-audit.md §1).

     Sekarang narasi mengirim BLOK: kalimat-kalimat berurutan di dalam SATU bab, digabung
     sampai anggaran karakter, satu say() untuk seluruh blok. Pemecahan sesungguhnya
     dikerjakan lapisan bawah lewat planUtterance (180-260 char per potongan), yang memang
     kontrak V3.

     900 char: kira-kira 4-5 potongan anggaran. Cukup panjang untuk membuat pipelining
     bermakna, cukup pendek supaya jeda dan pindah kalimat manual tetap terasa responsif.

     TAPI blok besar TIDAK boleh dipakai untuk blok PERTAMA, dan ini bukan tebakan - ia
     terukur di reports/voice-v6-data/caller-measurements.json: mengirim teks 248 char
     sebagai potongan pertama membuat suara pertama datang 12.395 ms setelah murid menekan
     putar, sementara satu kalimat 60 char datang 3.407 ms. Tidak ada satu pun jeda
     antar-kalimat yang layak dibayar dengan 12 detik dead air di awal.

     Karena itu anggarannya TUMBUH, dan angka pertumbuhannya diturunkan dari pengukuran,
     bukan dari selera. Mesin berjalan pada RTF ~0,865 dan ~15,4 char/detik
     (reports/voice-v6-data/): menghangatkan potongan pertama blok berikutnya memakan
     ~0,056 detik/char, sedangkan blok yang sedang berbunyi memberi ~0,065 detik/char
     penutup. Jadi blok N menutupi generasi potongan pembuka blok N+1 selama

         panjang(potongan pembuka N+1) <= 1,15 x panjang(blok N)

     Tangga tetap yang terlalu berani membuktikan pentingnya batas itu: dengan 80 -> 200
     char, batas pertama diukur 7.351 ms - karena blok 60 char hanya memberi 3,2 detik
     penutup untuk generasi 9,7 detik. Tangga di bawah karena itu proporsional terhadap blok
     SEBELUMNYA, dan langsung melompat ke ukuran penuh begitu blok terakhir >= 224 char,
     yaitu titik di mana potongan mana pun (dibatasi 260 char oleh planUtterance) sudah
     tertutup.

     Konsekuensi yang harus dikatakan terang: untuk beberapa kalimat pertama sebuah buku,
     narasi V6 berperilaku seperti V5 - satu blok satu kalimat, jeda ~1,1 detik - dan baru
     menyatu mendekati 0,22 detik ketika bloknya sudah tumbuh. Itu memang harga yang dipilih:
     suara pertama 3,4 detik lebih penting daripada batas kalimat kedua.

     SOROTAN TETAP PER KALIMAT. Ia tidak dibuang - ia digerakkan penanda batas dari
     planUtterance, lihat scheduleBlockHighlight(). */
  var BLOCK_MAX_CHARS = 900;
  var LEAD_BLOCK_CHARS = 80;
  /* 1,15 = 0,065/0,056 dari pengukuran di atas. 224 = 260/1,15, yaitu panjang blok terkecil
     yang sudah menutupi potongan terpanjang yang mungkin. */
  var RAMP_COVER_FACTOR = 1.15;
  var RAMP_SETTLED_CHARS = 224;
  function nextBlockBudget(previousChars) {
    var prev = Math.max(0, Number(previousChars) || 0);
    if (prev >= RAMP_SETTLED_CHARS) return BLOCK_MAX_CHARS;
    return Math.max(LEAD_BLOCK_CHARS, Math.round(prev * RAMP_COVER_FACTOR));
  }
  /* Laju bicara terukur, bukan angka karangan: 384 karakter teks uji menghasilkan 24,90 s
     audio bersih pada speed 1 (reports/voice-v5-data/, dipakai juga di
     reports/voice-v1-audit.md) = 15,4 char/detik. Ia dipakai HANYA untuk menjadwalkan
     sorotan, tidak pernah untuk menjadwalkan suara. */
  var NARRATION_CHARS_PER_SECOND = 15.4;
  /* Jeda prosodi milik pemutar (PROSODY_GAP di fiezel-web-audio-player.js /
     fiezel-prosody.js). Disalin sebagai detik supaya sorotan ikut memperhitungkan seam yang
     memang disengaja, bukan menganggap bicara berjalan tanpa henti. */
  var BOUNDARY_GAP_S = { none: 0, comma: 0.09, clause: 0.09, sentence: 0.22, paragraph: 0.45 };
  var highlightTimers = [];

  function mount() { return doc.getElementById('app'); }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function readProgress() {
    try { return JSON.parse(root.localStorage.getItem(PROGRESS_KEY) || 'null'); } catch (_) { return null; }
  }
  function saveProgress() {
    if (!session) return;
    try { root.localStorage.setItem(PROGRESS_KEY, JSON.stringify(session.exportProgress())); } catch (_) {}
  }

  async function ensurePack() {
    if (pack) return pack;
    if (packPromise) return packPromise;
    packPromise = (async function () {
      var response = await root.fetch('./features/library/library-books-v1.json', { credentials: 'same-origin' });
      if (!response || !response.ok) throw new Error('library_pack_unavailable');
      var loaded = await response.json();
      if (!root.FiezelLibrary) throw new Error('library_runtime_missing');
      var loadedSession = root.FiezelLibrary.createSession(loaded, readProgress());
      pack = loaded;
      session = loadedSession;
      return pack;
    })();
    try { return await packPromise; }
    finally { packPromise = null; }
  }

  // ---- narration ----------------------------------------------------------------

  function narrationOptions() {
    return { speed: currentRate() };
  }

  // ---- kecepatan narasi ----------------------------------------------------------
  //
  // m028 fase4: kecepatan bicara sudah punya satu sumber kebenaran di app.js
  // (state.preferences.neuralRate, dibaca selectedNeuralRate, ditulis
  // setNeuralRatePreference). Yang belum ada adalah pintunya DI SINI - murid yang sedang
  // mendengarkan buku harus keluar ke Pengaturan hanya untuk memperlambat satu kalimat,
  // dan pada saat ia kembali narasinya sudah lewat.
  //
  // Tombol ini TIDAK menyimpan angkanya sendiri. Ia membaca dan menulis preferensi yang
  // sama seperti slider Settings, jadi keduanya tidak bisa berselisih; peristiwa
  // 'fiezel-neural-rate' yang disiarkan setNeuralRatePreference membuat labelnya ikut
  // berubah walau yang digeser adalah slider di Settings.
  //
  // narrationOptions() dibaca ulang tiap kalimat, jadi perubahan terasa di kalimat
  // berikutnya tanpa memutus narasi yang sedang berjalan.
  var SPEED_STEPS = [0.75, 1, 1.25];

  function currentRate() {
    try {
      if (typeof root.selectedNeuralRate === 'function') return Number(root.selectedNeuralRate()) || 1;
    } catch (_) {}
    return 1;
  }

  function speedLabel(rate) {
    var text = Number(rate) === 1 ? '1x' : String(Number(rate)) + 'x';
    return text;
  }

  function nextSpeed(rate) {
    var current = Number(rate) || 1;
    // Preset terdekat dulu, supaya nilai dari slider (misal 1.05) tetap masuk siklus
    // di tempat yang masuk akal, bukan melompat ke awal.
    var nearest = 0;
    for (var i = 1; i < SPEED_STEPS.length; i++) {
      if (Math.abs(SPEED_STEPS[i] - current) < Math.abs(SPEED_STEPS[nearest] - current)) nearest = i;
    }
    if (Math.abs(SPEED_STEPS[nearest] - current) > 0.001) return SPEED_STEPS[nearest];
    return SPEED_STEPS[(nearest + 1) % SPEED_STEPS.length];
  }

  function renderSpeedButton() {
    var button = doc.getElementById('librarySpeed');
    if (!button) return;
    var rate = currentRate();
    button.textContent = speedLabel(rate);
    button.setAttribute('aria-label', 'Kecepatan suara ' + speedLabel(rate) + ', ketuk untuk mengganti');
    button.dataset.rate = String(rate);
  }

  function cycleSpeed() {
    var wanted = nextSpeed(currentRate());
    if (typeof root.setNeuralRatePreference === 'function') {
      try { root.setNeuralRatePreference(wanted); } catch (_) {}
    }
    renderSpeedButton();
    setStatus('Kecepatan suara ' + speedLabel(currentRate()) + '. Berlaku dari kalimat berikutnya.');
  }

  // Slider Settings memakai fungsi tulis yang sama, jadi satu pendengar cukup untuk
  // menjaga label dok tetap sejajar tanpa polling.
  try { doc.addEventListener('fiezel-neural-rate', renderSpeedButton); } catch (_) {}

  /**
   * m025-100: narasi buku ikut pintu bicara bersama.
   *
   * Sebelumnya jalur ini memanggil FiezelVoiceRuntime langsung, dan itu terlewat saat
   * m025-95 mengalihkan Library - yang dialihkan hanya tombol tanya, karena narasi
   * memakai fungsi yang berbeda. Akibatnya menekan "Dengar" masih menuntut unduhan
   * model, tepat seperti yang OWNER laporkan.
   *
   * Buku di library-books-v1.json sudah berpasangan {en, id} per kalimat, jadi subtitle
   * Indonesianya diambil langsung dari sana. Ini penting bukan sekadar rapi: satu buku
   * berisi ratusan kalimat, dan menerjemahkannya satu per satu akan menghabiskan jatah
   * 40 permintaan AI per jam sebelum bab pertama selesai.
   */
  function speak(sentence) {
    var say = root.FiezelVoiceSay;
    if (!say || typeof say.say !== 'function') return Promise.reject(new Error('voice_door_missing'));
    if (typeof sentence === 'string') return say.say(sentence, narrationOptions());
    return say.say({ en: sentence && sentence.en, id: sentence && sentence.id }, narrationOptions());
  }

  /**
   * V6: satu blok narasi = kalimat berurutan DI DALAM SATU BAB sampai anggaran karakter.
   *
   * Batas bab tidak pernah dilewati: judul bab adalah pindah konteks, dan menggabungkannya
   * ke dalam satu ucapan akan membuat bab berikutnya berbunyi sebelum kepalanya terlihat.
   * Terjemahan Indonesia ikut digabung dari pasangan {en,id} yang SUDAH ada di
   * library-books-v1.json - jadi pita subtitle tetap tidak perlu memanggil penerjemah dan
   * jatah permintaan AI tetap utuh.
   */
  function blockAt(startIndex, budget) {
    if (!session) return null;
    var list = session.sentences();
    var first = list[Math.max(0, Number(startIndex) || 0)];
    if (!first) return null;
    var cap = Math.min(BLOCK_MAX_CHARS, Number(budget) || BLOCK_MAX_CHARS);
    var picked = [first];
    var chars = String(first.en || '').length;
    for (var i = first.index + 1; i < list.length; i++) {
      var s = list[i];
      if (!s || s.chapterIndex !== first.chapterIndex) break;
      var len = String(s.en || '').length;
      if (chars + 1 + len > cap) break;
      picked.push(s);
      chars += 1 + len;
    }
    return {
      sentences: picked,
      from: picked[0].index,
      to: picked[picked.length - 1].index,
      text: picked.map(function (s) { return String(s.en || '').trim(); }).join(' '),
      translation: picked.map(function (s) { return String(s.id || '').trim(); }).filter(Boolean).join(' ')
    };
  }

  /** Rencana potongan bertanda batas untuk TEKS UTUH satu blok. Murni; tidak memutar apa pun. */
  function planBlock(text) {
    var prosody = root.FiezelProsody;
    if (!prosody || typeof prosody.planUtterance !== 'function') return null;
    try { return prosody.planUtterance(text); } catch (_) { return null; }
  }

  function clearHighlightTimers() {
    while (highlightTimers.length) {
      try { root.clearTimeout(highlightTimers.pop()); } catch (_) {}
    }
  }

  /**
   * V6: sorotan per kalimat TANPA satu panggilan suara per kalimat.
   *
   * Kalimat pertama disorot langsung; sisanya dijadwalkan dari posisi karakternya di dalam
   * teks blok dibagi laju bicara terukur, DITAMBAH jeda prosodi setiap seam potongan yang
   * sudah dilewati - dan seam itu adalah penanda batas dari planUtterance (chunk.boundary).
   *
   * BATAS KEJUJURAN, ditulis di sini supaya tidak ada yang menjualnya lebih tinggi: ini
   * ESTIMASI, bukan pengukuran. Pintu suara bersama tidak memberi pemanggil kait kemajuan
   * per potongan, jadi sorotan bisa bergeser bila laju model berbeda dari 15,4 char/detik.
   * Yang tidak boleh terjadi - dan tidak terjadi - adalah sorotan berjalan sesudah murid
   * menekan jeda: setiap timer memeriksa token narasi lebih dulu dan stopNarration()
   * membatalkan semuanya.
   */
  function scheduleBlockHighlight(block, plan, token) {
    clearHighlightTimers();
    if (!block || !block.sentences || !block.sentences.length) return 0;
    highlight(block.from, true);
    var rate = Number(currentRate()) || 1;
    var cps = NARRATION_CHARS_PER_SECOND * rate;
    var seams = [];
    if (plan && plan.chunks) {
      var at = 0;
      plan.chunks.forEach(function (chunk) {
        at += Number(chunk.chars || String(chunk.text || '').length);
        seams.push({ at: at, boundary: chunk.boundary });
      });
    }
    var offset = String(block.sentences[0].en || '').trim().length + 1;
    var scheduled = 0;
    for (var i = 1; i < block.sentences.length; i++) {
      var gap = 0;
      for (var s = 0; s < seams.length; s++) if (seams[s].at <= offset) gap += BOUNDARY_GAP_S[seams[s].boundary] || 0;
      var delay = Math.max(0, (offset / cps + gap) * 1000);
      highlightTimers.push(root.setTimeout((function (index) {
        return function () {
          if (!narrating || token !== narrationToken) return;
          highlight(index, true);
        };
      }(block.sentences[i].index)), delay));
      scheduled++;
      offset += String(block.sentences[i].en || '').trim().length + 1;
    }
    return scheduled;
  }

  /**
   * m025-47: prefetch is intentionally deferred by one task. The public runtime has
   * readiness/audibility wrappers around the core service; issuing N+1 in the same JS
   * turn as speak(N) allowed N+1 to reserve the single-flight engine before N reached it.
   * That is the exact queue inversion behind the 10-15 second sentence gap.
   */
  function warmNext(token, index, budget) {
    setTimeout(function () {
      if (!narrating || token !== narrationToken || !session) return;
      var say = root.FiezelVoiceSay;
      if (!say || typeof say.prefetch !== 'function') return;
      // V6: yang dihangatkan adalah BLOK berikutnya, bukan kalimat berikutnya. Bentuknya
      // harus sama persis dengan yang nanti dikirim ke say(), kalau tidak kunci dedup/cache
      // di pintu suara tidak akan cocok dan pekerjaannya terbuang.
      var upcoming = blockAt(index == null ? session.snapshot().sentenceIndex + 1 : index, budget);
      if (!upcoming || !upcoming.text) return;
      try { say.prefetch(upcoming.text, narrationOptions()); } catch (_) {}
    }, 0);
  }

  function stopNarration() {
    narrationToken++;
    narrating = false;
    clearHighlightTimers();
    if (session) session.pause();
    try { root.FiezelVoiceSay && root.FiezelVoiceSay.stop && root.FiezelVoiceSay.stop(); } catch (_) {}
    updatePlayButton();
  }

  /**
   * V6: membacakan BLOK per blok, bukan kalimat per kalimat.
   *
   * Yang berubah cuma satu hal, tapi hal itu menentukan semuanya: `speak()` menerima teks
   * utuh satu blok, jadi planUtterance di bawahnya punya bahan untuk memotong di batas
   * alami, pemutar menyambung potongan tanpa senyap, dan hanya batas antar-BLOK yang
   * membayar generasi - dan batas itu pun sudah dihangatkan lebih dulu oleh warmNext().
   *
   * Yang TIDAK berubah: setiap langkah tetap memeriksa tokennya, jadi menekan jeda atau
   * meninggalkan layar menghentikan buku, bukan membiarkan blok yang sudah diantre berbunyi
   * belakangan. Sorotan per kalimat juga tidak berubah dari sisi murid.
   */
  async function narrate() {
    var token = ++narrationToken;
    narrating = true;
    session.play();
    updatePlayButton();
    // Anggaran dihitung dari blok SEBELUMNYA, bukan dari posisi di buku: yang mahal adalah
    // blok PERTAMA sesudah murid menekan putar, dan itu terjadi juga ketika ia melompat ke
    // tengah buku lalu memutar lagi.
    var budget = LEAD_BLOCK_CHARS;
    while (narrating && token === narrationToken) {
      var snap = session.snapshot();
      var block = blockAt(snap.sentenceIndex, budget);
      if (!block || !block.text) break;
      var plan = planBlock(block.text);
      scheduleBlockHighlight(block, plan, token);
      var speaking = speak({ en: block.text, id: block.translation });
      // Anggaran yang dioper ke warmNext HARUS anggaran yang nanti benar-benar dipakai,
      // kalau tidak teks yang dihangatkan berbeda dari teks yang dikirim dan kunci dedup
      // di pintu suara tidak cocok.
      var upcomingBudget = nextBlockBudget(block.text.length);
      warmNext(token, block.to + 1, upcomingBudget);
      budget = upcomingBudget;
      try {
        await speaking;
      } catch (error) {
        clearHighlightTimers();
        narrating = false;
        session.pause();
        setStatus('Suara tidak bisa dimuat. Periksa koneksi lalu tekan putar lagi.');
        updatePlayButton();
        return;
      }
      clearHighlightTimers();
      if (!narrating || token !== narrationToken) return;
      // Blok selesai berarti kalimat terakhirnya sudah dibacakan: sorotan dan kursor
      // dipindahkan ke sana sebelum menghitung blok berikutnya, supaya progres yang
      // disimpan tidak pernah lebih maju daripada yang benar-benar terdengar.
      var total = session.sentences().length;
      if (block.to >= total - 1) {
        session.goTo(total - 1);
        saveProgress();
        highlight(total - 1, true);
        narrating = false;
        setStatus('Selesai. Buku ini sudah dibacakan sampai habis.');
        updatePlayButton();
        return;
      }
      session.goTo(block.to + 1);
      saveProgress();
      renderProgress();
    }
  }

  // ---- rendering ------------------------------------------------------------------

  function shelfMarkup() {
    var cards = session.books().map(function (b) {
      var progress = session.progressFor(b.id);
      var accent = esc((b.cover && b.cover.accent) || '#8C2233');
      return '<button type="button" class="library-card" data-book="' + esc(b.id) + '" style="--book-accent:' + accent + '">' +
        '<span class="library-cover">' + esc((b.cover && b.cover.emoji) || '📖') + '</span>' +
        '<span class="library-meta"><b>' + esc(b.title) + '</b>' +
        '<small>' + esc(b.level) + ' · ' + esc(b.minutes) + ' menit · ' + esc(b.sentences) + ' kalimat</small>' +
        '<em>' + esc(b.about.id) + '</em>' +
        (b.original ? '' : '<span class="library-badge">Ringkasan FIEZEL</span>') +
        (progress.percent ? '<span class="library-progress"><span style="width:' + progress.percent + '%"></span></span>' : '') +
        '</span></button>';
    }).join('');
    return '<section class="fade library-page"><div class="section-head"><div>' +
      '<span class="section-kicker">FIEZEL LIBRARY</span><h1>Perpustakaan</h1>' +
      '<p>Dongeng dan novel pendek dengan audiobook dan terjemahan sekali ketuk. Ketuk kalimat mana pun untuk melihat artinya.</p>' +
      '</div></div><div class="library-grid">' + cards + '</div></section>';
  }

  function readerMarkup() {
    var snap = session.snapshot();
    var summary = session.books().filter(function (b) { return b.id === snap.bookId; })[0] || {};
    var chapters = {};
    var body = session.sentences().map(function (s) {
      var head = '';
      if (chapters[s.chapterIndex] !== true) {
        chapters[s.chapterIndex] = true;
        head = '<h2 class="library-chapter">' + esc(s.chapterTitle) + '</h2>';
      }
      return head + '<button type="button" class="library-sentence" data-sentence="' + s.index + '"' +
        (s.index === snap.sentenceIndex ? ' data-active="1"' : '') + '>' + esc(s.en) + '</button>';
    }).join('');
    return '<section class="fade library-page library-reader">' +
      '<div class="library-reader-head"><button type="button" class="library-back" data-shelf="1">← Rak buku</button>' +
      '<div><span class="section-kicker">' + esc(summary.level || '') + ' · ' + esc(snap.chapterTitle || '') + '</span>' +
      '<h1>' + esc(snap.title || '') + '</h1></div></div>' +
      (summary.original ? '' : '<p class="library-note">' + esc(summary.source) + '</p>') +
      '<div class="library-text" id="libraryText">' + body + '</div>' +
      '<div class="library-dock">' +
      '<div class="library-progress-line"><span id="libraryBar" style="width:' + snap.percent + '%"></span></div>' +
      '<div class="library-dock-line">' +
      '<button type="button" class="library-speed" id="librarySpeed" aria-label="Kecepatan suara ' + esc(speedLabel(currentRate())) + ', ketuk untuk mengganti" data-rate="' + esc(currentRate()) + '">' + esc(speedLabel(currentRate())) + '</button>' +
      '<p class="library-status" id="libraryStatus">Ketuk kalimat untuk arti, atau putar audiobook.</p>' +
      '</div>' +
      '<div class="library-controls">' +
      '<button type="button" id="libraryPrev" data-step="-1" aria-label="Kalimat sebelumnya"><i data-lucide="chevron-left"></i></button>' +
      '<button type="button" class="primary" id="libraryPlay"><i data-lucide="play"></i> Audiobook</button>' +
      '<button type="button" id="libraryNext" data-step="1" aria-label="Kalimat berikutnya"><i data-lucide="chevron-right"></i></button>' +
      '<button type="button" id="libraryAsk"><i data-lucide="message-circle-question"></i> Tanya Fiezel</button>' +
      '</div></div></section>';
  }

  function renderShelf() {
    stopNarration();
    closeTranslation();
    session.close();
    var node = mount();
    if (!node) return;
    node.innerHTML = shelfMarkup();
    node.querySelectorAll('[data-book]').forEach(function (button) {
      button.addEventListener('click', function () { openBook(button.dataset.book); });
    });
    icons();
  }

  function renderReader() {
    var node = mount();
    if (!node) return;
    node.innerHTML = readerMarkup();
    node.querySelectorAll('[data-sentence]').forEach(function (button) {
      button.addEventListener('click', function () { onSentence(Number(button.dataset.sentence)); });
    });
    node.querySelectorAll('[data-shelf]').forEach(function (button) {
      button.addEventListener('click', backToShelf);
    });
    node.querySelectorAll('[data-step]').forEach(function (button) {
      button.addEventListener('click', function () { step(Number(button.dataset.step)); });
    });
    var play = doc.getElementById('libraryPlay');
    if (play) play.addEventListener('click', togglePlay);
    var ask = doc.getElementById('libraryAsk');
    if (ask) ask.addEventListener('click', openAsk);
    var speed = doc.getElementById('librarySpeed');
    if (speed) speed.addEventListener('click', cycleSpeed);
    renderSpeedButton();
    icons();
  }

  function icons() {
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (_) {}
  }

  function setStatus(text) {
    var node = doc.getElementById('libraryStatus');
    if (node) node.textContent = text;
  }

  function renderProgress() {
    var snap = session.snapshot();
    var bar = doc.getElementById('libraryBar');
    if (bar && bar.style) bar.style.width = snap.percent + '%';
    highlight(snap.sentenceIndex, true);
  }

  // m025-47: only touch the old active line and the new one. The previous implementation
  // scanned every sentence button on every narration tick and then started a smooth-scroll
  // animation. Long books paid that DOM cost hundreds of times while the audio worker was
  // also busy. A direct numeric selector makes the work O(1) and auto-scroll does not keep
  // an animation alive between consecutive sentences.
  function highlight(index, scroll) {
    var wanted = Number(index);
    var active = doc.querySelector('[data-sentence][data-active="1"]');
    if (active && Number(active.dataset.sentence) !== wanted) active.removeAttribute('data-active');
    var node = doc.querySelector('[data-sentence="' + wanted + '"]');
    if (!node) return;
    node.setAttribute('data-active', '1');
    if (scroll && node.scrollIntoView) {
      try { node.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (_) {}
    }
  }

  function updatePlayButton() {
    var button = doc.getElementById('libraryPlay');
    if (!button) return;
    button.innerHTML = narrating
      ? '<i data-lucide="pause"></i> Jeda'
      : '<i data-lucide="play"></i> Audiobook';
    icons();
  }

  // ---- interaction ----------------------------------------------------------------

  /**
   * Dipanggil oleh riwayat saat tekanan kembali sampai di lapisan pembaca. Menutup saja -
   * TIDAK menyentuh riwayat lagi, karena entrinya sudah diambil oleh jalur itu. False berarti
   * pembacanya memang sudah tidak di layar, sehingga tekanan kembali tidak terbuang di sini.
   */
  function closeReaderLayer() {
    if (!doc.querySelector('.library-reader')) return false;
    renderShelf();
    return true;
  }

  /** Tombol "← Rak buku": tutup seketika, lalu buang entri riwayatnya supaya tetap sejajar. */
  function backToShelf() {
    var nav = root.FiezelBackNav;
    if (nav && typeof nav.dismiss === 'function') { try { nav.dismiss(READER_LAYER); } catch (_) {} }
    renderShelf();
  }

  function openBook(bookId) {
    try { session.open(bookId); } catch (_) { return; }
    renderReader();
    var nav = root.FiezelBackNav;
    if (nav && typeof nav.pushLayer === 'function') {
      try { nav.pushLayer({ id: READER_LAYER, close: closeReaderLayer }); } catch (_) {}
    }
    var progress = session.progressFor(bookId);
    if (progress.percent) setStatus('Lanjut dari kalimat ' + (session.snapshot().sentenceIndex + 1) + '.');
    // m026-03: tur kontekstual pembaca, sekali saja per murid. Modul ini tidak tahu apa pun
    // tentang bendera tur, state, atau save() - ia hanya memberi tahu host bahwa pembaca baru
    // tergambar, dan host yang memutuskan. Gagalnya diam: tur adalah lapisan paling boleh
    // gagal di aplikasi ini, dan buku harus tetap terbuka kalau ia tidak ada.
    try { if (typeof root.notifyFeatureTour === 'function') root.notifyFeatureTour('library'); } catch (_) {}
  }

  /** Tap a sentence: translate instantly, and make it the narration position too. */
  function onSentence(index) {
    session.goTo(index);
    var picked = session.select(index);
    saveProgress();
    highlight(index, false);
    showTranslation(picked);
    renderProgress();
  }

  function closeTranslation() {
    var existing = doc.getElementById('libraryTranslation');
    if (existing && existing.remove) existing.remove();
  }

  /**
   * m025-45 OWNER: the translation must float in the middle of the screen, not sit in a
   * strip next to the play button. It is a light overlay rather than a modal: the book
   * stays visible behind it, and tapping anywhere outside dismisses it.
   */
  function showTranslation(picked) {
    closeTranslation();
    if (!picked) return;
    var layer = doc.createElement('div');
    layer.id = 'libraryTranslation';
    layer.className = 'library-translation-layer';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-label', 'Terjemahan kalimat');
    layer.innerHTML = '<div class="library-translation-card">' +
      '<span class="library-translation-mark">TERJEMAHAN</span>' +
      '<p class="library-translation-en">' + esc(picked.en) + '</p>' +
      '<p class="library-translation-id">' + esc(picked.id) + '</p>' +
      '<div class="library-translation-actions">' +
      '<button type="button" id="librarySpeakOne"><i data-lucide="volume-2"></i> Dengar</button>' +
      '<button type="button" id="libraryAskOne"><i data-lucide="message-circle-question"></i> Tanya Fiezel</button>' +
      '<button type="button" id="libraryCloseOne" aria-label="Tutup terjemahan"><i data-lucide="x"></i></button>' +
      '</div></div>';
    doc.body.appendChild(layer);
    layer.addEventListener('click', function (event) {
      if (event.target === layer) closeTranslation();
    });
    var listen = doc.getElementById('librarySpeakOne');
    if (listen) listen.addEventListener('click', function () { stopNarration(); speak(picked).catch(function () {}); });
    var ask = doc.getElementById('libraryAskOne');
    if (ask) ask.addEventListener('click', openAsk);
    var close = doc.getElementById('libraryCloseOne');
    if (close) close.addEventListener('click', closeTranslation);
    icons();
  }

  function step(direction) {
    stopNarration();
    if (direction > 0) session.next(); else session.previous();
    saveProgress();
    renderProgress();
  }

  function togglePlay() {
    closeTranslation();
    if (narrating) { stopNarration(); setStatus('Dijeda.'); return; }
    setStatus('Membacakan…');
    narrate();
  }

  // ---- Ask Fiezel about this book -------------------------------------------------

  function askContext() {
    var snap = session.snapshot();
    var picked = snap.selected || session.current();
    return {
      lesson: {
        topic: snap.title || 'bacaan ini',
        level: 'A2',
        board: { title: snap.title || '', formula: picked ? picked.en : '', examples: picked ? [picked.en] : [] }
      },
      beat: picked ? { en: picked.en, idText: picked.id } : null
    };
  }

  function openAsk() {
    stopNarration();
    var picked = session.snapshot().selected || session.current();
    var existing = doc.getElementById('libraryAskSheet');
    if (existing && existing.remove) existing.remove();
    var sheet = doc.createElement('div');
    sheet.id = 'libraryAskSheet';
    sheet.className = 'library-ask-sheet';
    sheet.innerHTML = '<form class="library-ask-panel"><span class="library-ask-mark">TANYA FIEZEL</span>' +
      '<h2>Tanya tentang bacaan ini</h2>' +
      (picked ? '<p class="library-ask-quote">“' + esc(picked.en) + '”</p>' : '') +
      '<textarea name="question" rows="3" maxlength="240" placeholder="Contoh: kenapa pakai kata was di sini?" required></textarea>' +
      '<div class="library-ask-actions"><button type="button" data-cancel>Tutup</button>' +
      '<button type="submit" class="primary">Tanya</button></div>' +
      '<p class="library-ask-answer" id="libraryAskAnswer"></p></form>';
    doc.body.appendChild(sheet);
    sheet.querySelector('[data-cancel]').addEventListener('click', function () { sheet.remove(); });
    sheet.querySelector('form').addEventListener('submit', function (event) {
      event.preventDefault();
      var field = sheet.querySelector('textarea');
      var question = String((field && field.value) || '').trim();
      if (!question) return;
      answerQuestion(question);
    });
    var area = sheet.querySelector('textarea');
    if (area && area.focus) area.focus();
    icons();
  }


  /**
   * m025-100: teks model ditulis dalam Markdown. Sampai rilis ini ia dipasang lewat
   * textContent, jadi murid membaca "**tebal**" apa adanya - bug Bab 2 brief redesign, dan
   * di sini justru pada permukaan AI yang paling sering dibaca.
   *
   * Beralih ke innerHTML membuka permukaan injeksi, jadi syaratnya keras: HANYA lewat
   * renderMarkdown() milik app.js, yang meng-esc setiap baris SEBELUM mengubah penanda
   * menjadi tag. Kalau penerjemah itu tidak ada - app.js gagal dimuat, atau modul ini
   * dipakai di luar aplikasi - kita kembali ke textContent, bukan menulis teks mentah ke
   * innerHTML. Lebih baik terlihat jelek daripada tidak aman.
   */
  function paintModelText(node, text) {
    if (!node) return false;
    var md = root && root.renderMarkdown;
    if (typeof md === 'function') {
      try { node.innerHTML = md(text); return true; } catch (_) {}
    }
    node.textContent = String(text || '');
    return false;
  }

  function showAskAnswer(text) {
    paintModelText(doc.getElementById('libraryAskAnswer'), text);
  }

  /**
   * Same contract as the Classroom talk button: the Core AI model first, the local
   * engine when it is unreachable, and the reply is spoken, never silently printed.
   */
  function answerQuestion(question) {
    showAskAnswer('Fiezel sedang menjawab…');
    var dialog = root.FiezelTutorDialog;
    var context = askContext();
    var ai = (typeof root.askFiezelAI === 'function' && dialog)
      ? Promise.resolve().then(function () { return root.askFiezelAI(dialog.aiPrompt(question, context)); }).catch(function () { return null; })
      : Promise.resolve(null);
    ai.then(function (text) {
      var answer = String(text || '').trim();
      if (!answer && dialog) answer = dialog.respond(question, context, memory()).id;
      if (!answer) answer = 'Fiezel belum bisa menjawab pertanyaan itu sekarang.';
      showAskAnswer(answer);
      return speakAnswer(answer);
    }).catch(function () { showAskAnswer('Fiezel belum bisa menjawab pertanyaan itu sekarang.'); });
  }

  var askMemory = null;
  function memory() {
    if (!askMemory && root.FiezelTutorDialog) askMemory = root.FiezelTutorDialog.createMemory();
    return askMemory || { lastVariant: {}, turns: 0 };
  }

  /**
   * m025-95: jawaban Library dibacakan dalam INGGRIS dengan subtitle Indonesia.
   * Teksnya tidak punya pasangan terjemahan, jadi penerjemah yang menyediakannya.
   */
  function speakAnswer(text) {
    var say = root.FiezelVoiceSay;
    if (!say || typeof say.say !== 'function') return Promise.resolve(false);
    return say.say(String(text || ''));
  }


  // ---- entry point -----------------------------------------------------------------

  async function library() {
    var node = mount();
    if (!node) return;
    node.innerHTML = '<section class="fade library-page"><div class="card">Memuat perpustakaan…</div></section>';
    try {
      await ensurePack();
      renderShelf();
    } catch (error) {
      node.innerHTML = '<section class="fade library-page"><div class="card"><b>Perpustakaan belum bisa dimuat.</b>' +
        '<p class="muted">' + esc((error && error.message) || error) + '</p></div></section>';
    }
  }

  // Load the small authored book index while the launcher is idle. It remains a normal
  // fetch backed by the service-worker cache; this only moves JSON parse/session setup
  // away from the user's navigation tap. A single shared promise prevents duplicate work.
  function schedulePackWarm() {
    var run = function () { ensurePack().catch(function () {}); };
    try {
      if (typeof root.requestIdleCallback === 'function') {
        root.requestIdleCallback(run, { timeout: 1800 });
      } else {
        setTimeout(run, 900);
      }
    } catch (_) { setTimeout(run, 900); }
  }

  root.library = library;
  // Leaving the screen must silence the narrator; nothing is worse than a book that keeps
  // reading over the next screen.
  if (root.MutationObserver) {
    var app = mount();
    if (app) {
      new root.MutationObserver(function () {
        if (narrating && !doc.querySelector('.library-reader')) stopNarration();
      }).observe(app, { childList: true, subtree: true });
    }
  }

  root.FiezelLibraryUi = Object.freeze({
    schema: 'fiezel-library-ui-v1',
    open: library,
    stop: stopNarration,
    isNarrating: function () { return narrating; }
  });
  schedulePackWarm();
}(typeof globalThis !== 'undefined' ? globalThis : this));