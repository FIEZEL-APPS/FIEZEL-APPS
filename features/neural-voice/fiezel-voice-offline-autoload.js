/**
 * m025-121 pengunduh suara cadangan yang tidak pernah menampakkan diri.
 *
 * APA YANG DIMINTA OWNER. Saat murid sudah login akun Puter dan memakai suara neural
 * Puter, lalu jatahnya habis, ia harus TETAP bisa mendengar suara neural - tanpa upgrade
 * Puter, tanpa sadar pernah mengunduh apa pun. Unduhannya mulai sendiri di latar begitu
 * sistem mendeteksi login pertama, dan tidak boleh ada satu pun pemberitahuan.
 *
 * SATU BAGIAN PERMINTAAN YANG TIDAK BISA DIPENUHI, dan lebih baik ditulis di sini
 * daripada dijanjikan diam-diam: unduhan TIDAK bisa terus berjalan setelah FIEZEL ditutup
 * penuh. Satu-satunya API web yang bisa melakukannya adalah Background Fetch, dan
 * WebKit/iOS tidak memilikinya - murid FIEZEL memakai iPhone dengan PWA dari Safari. Yang
 * bisa dilakukan, dan yang dilakukan berkas ini, adalah membuat penutupan aplikasi TIDAK
 * PERNAH memakan biaya: kemajuan disimpan per POTONGAN 20 MB, bukan per berkas, sehingga
 * sesi berikutnya melanjutkan dari potongan terakhir dan tidak pernah mengulang dari nol.
 * Tanpa itu, satu aset 78 MB yang putus di menit terakhir berarti 78 MB terbuang.
 *
 * KENAPA POTONGAN, BUKAN SATU fetch PANJANG. warmAssets() di bootstrap mengunduh tiap
 * aset dalam satu tarikan. Itu benar untuk tombol "Simpan untuk offline" yang ditekan
 * murid sambil menunggu. Untuk unduhan latar di jaringan ponsel, satu tarikan 78 MB
 * hampir pasti putus, dan setiap putus mengulang dari awal. Range request memecah
 * masalah itu pada sumbernya.
 *
 * KENAPA DIAM-DIAM ITU AMAN DI SINI. Keberatan m025-100 terhadap mesin lokal adalah murid
 * DIPAKSA menunggu unduhan sebelum aplikasi bisa bicara. Di sini tidak ada yang menunggu:
 * Puter tetap suara utama sejak detik pertama, dan berkas ini hanya menyiapkan cadangan
 * yang baru terdengar pada hari jatah Puter habis.
 */
(function (root) {
  'use strict';

  var SCHEMA = 'fiezel-voice-offline-autoload-v1';
  var STATE_KEY = 'fiezel-voice-offline-autoload-v1';
  // 20 MB atas permintaan OWNER (m025-122); sebelumnya 4 MB.
  //
  // Yang ditukar di sini perlu ditulis, karena keduanya nyata. Potongan besar berarti
  // seluruh 152 MB selesai dalam SATU sesi belajar yang wajar alih-alih beberapa - itu
  // yang diminta. Harganya: satu potongan yang putus membuang sampai 20 MB, bukan 4 MB,
  // karena potongan yang belum utuh tidak pernah disimpan.
  //
  // Yang TIDAK berubah adalah jaminan intinya: kemajuan tetap disimpan per potongan, jadi
  // aplikasi yang ditutup di tengah unduhan tetap melanjutkan dari potongan terakhir dan
  // tidak pernah mengulang dari nol. Aset terbesar (78 MB) kini 4 potongan, bukan 20.
  var CHUNK_BYTES = 20 * 1024 * 1024;
  // Jeda antar potongan. Unduhan ini TIDAK PERNAH boleh terasa: ia berbagi jaringan dan
  // CPU dengan pelajaran yang sedang berjalan, dan pelajaran selalu menang. m025-122:
  // dinaikkan bersama ukuran potongan - satu tarikan 20 MB memakai pita jauh lebih lama
  // daripada 4 MB, jadi jeda yang sama akan berarti unduhan ini menguasai jaringan dalam
  // porsi yang jauh lebih besar daripada sebelumnya.
  var IDLE_GAP_MS = 3000;
  var RETRY_GAP_MS = 15000;
  var MAX_CONSECUTIVE_FAILURES = 4;

  var running = false;
  var stopped = false;

  function log(entry) {
    try {
      var sink = root.FiezelVoiceDiagnostics;
      var record = { t: Date.now(), src: SCHEMA };
      for (var k in entry) if (Object.prototype.hasOwnProperty.call(entry, k)) record[k] = entry[k];
      if (sink && typeof sink.record === 'function') { sink.record(record, root); return; }
      var key = 'fiezel-neural-voice-diagnostics-v1';
      var list = JSON.parse(root.localStorage.getItem(key) || '[]');
      list.push(record);
      root.localStorage.setItem(key, JSON.stringify(list.slice(-200)));
    } catch (_) {}
  }

  function readState() {
    try {
      var value = JSON.parse(root.localStorage.getItem(STATE_KEY) || 'null');
      if (value && value.schema === SCHEMA) return value;
    } catch (_) {}
    return { schema: SCHEMA, signedInAt: 0, done: false, doneAt: 0, bytesDone: 0, failures: 0 };
  }

  function writeState(patch) {
    var value = readState();
    for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) value[k] = patch[k];
    try { root.localStorage.setItem(STATE_KEY, JSON.stringify(value)); } catch (_) {}
    return value;
  }

  function runtime() { return root.FiezelVoiceRuntime || null; }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /** Potongan disimpan sebagai entri cache tersendiri, dengan URL yang tidak akan pernah
   *  bertabrakan dengan aset jadinya. */
  function partUrl(assetUrl, index) {
    return assetUrl + (assetUrl.indexOf('?') < 0 ? '?' : '&') + 'fzpart=' + index;
  }

  function chunkCount(bytes) { return Math.max(1, Math.ceil(bytes / CHUNK_BYTES)); }

  /**
   * Alasan-alasan untuk TIDAK mengunduh sekarang. Semuanya diam - tidak satu pun boleh
   * berubah menjadi pesan di layar.
   */
  function blockedReason() {
    if (stopped) return 'stopped';
    if (!root.caches || !root.fetch) return 'no_cache_storage';
    if (root.isSecureContext === false) return 'insecure_context';
    if (root.navigator && root.navigator.onLine === false) return 'offline';
    // Hemat kuota data murid. Kalau ia menyalakan Mode Hemat Data, unduhan 152 MB adalah
    // hal terakhir yang ia inginkan berjalan tanpa diminta.
    try {
      var c = root.navigator && root.navigator.connection;
      if (c && c.saveData === true) return 'save_data';
      if (c && typeof c.effectiveType === 'string' && /(^|-)2g$/.test(c.effectiveType)) return 'slow_network';
    } catch (_) {}
    return '';
  }

  async function assembled(cache, item, url) {
    var total = chunkCount(item.bytes);
    var buffers = [];
    for (var i = 0; i < total; i++) {
      var res = await cache.match(partUrl(url, i));
      if (!res) return false;
      buffers.push(await res.arrayBuffer());
    }
    var size = buffers.reduce(function (sum, b) { return sum + b.byteLength; }, 0);
    if (size !== item.bytes) return false;
    var merged = new Uint8Array(size), at = 0;
    for (var j = 0; j < buffers.length; j++) { merged.set(new Uint8Array(buffers[j]), at); at += buffers[j].byteLength; }
    await cache.put(url, new Response(merged, {
      headers: {
        'Content-Type': contentTypeFor(item.path),
        'Content-Length': String(size)
      }
    }));
    for (var d = 0; d < total; d++) { try { await cache.delete(partUrl(url, d)); } catch (_) {} }
    return true;
  }

  /**
   * Content-Type harus cocok dengan yang diharapkan verifikasi bootstrap; aset .wasm dan
   * .js yang tersimpan dengan MIME salah akan ditolak di sana, dan penolakannya terjadi
   * jauh kemudian - saat murid butuh suaranya.
   */
  function contentTypeFor(path) {
    if (/\.wasm$/i.test(path)) return 'application/wasm';
    if (/\.m?js$/i.test(path)) return 'text/javascript';
    if (/\.json$/i.test(path)) return 'application/json';
    return 'application/octet-stream';
  }

  async function fetchChunk(cache, url, index, item) {
    var start = index * CHUNK_BYTES;
    var end = Math.min(item.bytes, start + CHUNK_BYTES) - 1;
    var res = await root.fetch(url, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { Range: 'bytes=' + start + '-' + end }
    });
    // 206 adalah jalur yang diharapkan. 200 berarti server mengabaikan Range dan
    // mengirim seluruh berkas; itu masih benar, tetapi hanya berguna bila ini memang
    // satu-satunya potongan - kalau tidak, menyimpannya sebagai potongan akan merusak
    // perakitan. Lebih baik ditolak daripada menghasilkan aset yang rusak diam-diam.
    if (res.status === 200 && chunkCount(item.bytes) > 1) throw new Error('range_unsupported');
    if (res.status !== 206 && res.status !== 200) throw new Error('chunk_http_' + res.status);
    var buffer = await res.arrayBuffer();
    var want = end - start + 1;
    if (buffer.byteLength !== want) throw new Error('chunk_size_mismatch');
    await cache.put(partUrl(url, index), new Response(buffer, {
      headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(buffer.byteLength) }
    }));
  }

  async function pump() {
    if (running) return;
    var rt = runtime();
    if (!rt || typeof rt.assets !== 'function') return;
    var state = readState();
    if (state.done || !state.signedInAt) return;
    var reason = blockedReason();
    if (reason) { log({ phase: 'autoload_hold', reason: reason }); return; }

    running = true;
    try {
      var cache = await root.caches.open(rt.cacheName);
      var items = rt.assets();
      var failures = 0;

      for (var a = 0; a < items.length; a++) {
        var item = items[a];
        var url = rt.assetUrl(item.path);

        // Sudah utuh dari sesi sebelumnya - atau dari tombol "Simpan untuk offline" yang
        // pernah ditekan murid. Keduanya sama sahnya; tidak ada yang diunduh dua kali.
        var existing = await cache.match(url);
        if (existing) continue;

        var total = chunkCount(item.bytes);
        for (var i = 0; i < total; i++) {
          if (stopped) { running = false; return; }
          var hold = blockedReason();
          if (hold) { log({ phase: 'autoload_hold', reason: hold, asset: item.path, chunk: i }); running = false; return; }
          if (await cache.match(partUrl(url, i))) continue;
          try {
            await fetchChunk(cache, url, i, item);
            failures = 0;
            writeState({ bytesDone: readState().bytesDone + Math.min(CHUNK_BYTES, item.bytes - i * CHUNK_BYTES) });
          } catch (error) {
            failures++;
            log({ phase: 'autoload_chunk_error', asset: item.path, chunk: i, error: String((error && error.message) || error).slice(0, 120) });
            if (failures >= MAX_CONSECUTIVE_FAILURES) {
              // Menyerah untuk sesi INI saja, bukan selamanya. Tidak ada yang diberitahu:
              // murid tidak pernah tahu unduhan ini ada, jadi kegagalannya juga bukan
              // kabar untuknya.
              writeState({ failures: readState().failures + 1 });
              running = false;
              return;
            }
            await delay(RETRY_GAP_MS);
            i--;
            continue;
          }
          await delay(IDLE_GAP_MS);
        }
        if (!(await assembled(cache, item, url))) {
          log({ phase: 'autoload_assemble_failed', asset: item.path });
          running = false;
          return;
        }
        log({ phase: 'autoload_asset_done', asset: item.path });
      }

      // Perakitan selesai untuk semua aset. prepare() sekarang tidak mengunduh apa pun -
      // ia hanya memverifikasi dan menyalakan mesinnya, jadi statusnya menjadi 'siap'
      // lewat jalur yang sama persis dengan tombol manual.
      try { await rt.prepare({}); } catch (error) {
        log({ phase: 'autoload_prepare_failed', error: String((error && error.message) || error).slice(0, 160) });
      }
      writeState({ done: true, doneAt: Date.now() });
      log({ phase: 'autoload_done' });
    } catch (error) {
      log({ phase: 'autoload_error', error: String((error && error.message) || error).slice(0, 160) });
    } finally {
      running = false;
    }
  }

  /**
   * Dipanggil begitu sistem melihat murid sudah login Puter. Aman dipanggil berkali-kali:
   * hanya panggilan PERTAMA yang menyalakan jam, sisanya melanjutkan.
   */
  function noteSignedIn() {
    var state = readState();
    if (state.done) return false;
    if (!state.signedInAt) { writeState({ signedInAt: Date.now() }); log({ phase: 'autoload_armed' }); }
    schedule();
    return true;
  }

  var timer = null;
  function schedule() {
    if (timer || stopped) return;
    // Menunggu sebentar setelah boot. Detik-detik pertama milik pelajaran yang sedang
    // dibuka murid, bukan milik unduhan yang tidak ia minta.
    timer = setTimeout(function () { timer = null; pump(); }, 8000);
  }

  function status() {
    var state = readState();
    var rt = runtime();
    return Object.freeze({
      schema: SCHEMA,
      armed: !!state.signedInAt,
      done: !!state.done,
      running: running,
      bytesDone: Number(state.bytesDone || 0),
      totalBytes: rt ? Number(rt.totalBytes || 0) : 0,
      blocked: blockedReason()
    });
  }

  /** Ukuran potongan ke-index milik satu aset. Potongan terakhir hampir selalu lebih
   *  pendek, dan menghitungnya sebagai potongan penuh akan melaporkan persentase yang
   *  lebih besar daripada yang benar-benar tersimpan. */
  function chunkSize(item, index) {
    var start = index * CHUNK_BYTES;
    return Math.max(0, Math.min(item.bytes, start + CHUNK_BYTES) - start);
  }

  /**
   * Kemajuan sesungguhnya, dihitung dari ISI CACHE - bukan dari penghitung di localStorage.
   *
   * Ini bukan kerumitan yang tidak perlu. bytesDone di state hanya bertambah dan tidak
   * pernah tahu apa-apa tentang cache yang dibersihkan browser, aset yang sudah ada dari
   * tombol lama, atau perakitan yang gagal. Angka yang bertambah terus sementara cache
   * kosong adalah persis jenis laporan yang membuat orang percaya sesuatu sudah selesai
   * padahal belum - dan yang ditanyakan OWNER di sini justru "sudah berapa persen".
   */
  async function progress() {
    var rt = runtime();
    var total = rt ? Number(rt.totalBytes || 0) : 0;
    var out = { schema: SCHEMA, percent: 0, doneBytes: 0, totalBytes: total, assetsDone: 0, assetCount: 0, state: 'belum mulai' };
    var state = readState();
    if (!rt || typeof rt.assets !== 'function') { out.state = 'mesin suara belum dimuat'; return Object.freeze(out); }
    var items = rt.assets();
    out.assetCount = items.length;
    if (!root.caches) { out.state = 'perangkat ini tidak punya Cache Storage'; return Object.freeze(out); }

    var cache;
    try { cache = await root.caches.open(rt.cacheName); }
    catch (_) { out.state = 'cache tidak bisa dibuka'; return Object.freeze(out); }

    var done = 0, whole = 0;
    for (var a = 0; a < items.length; a++) {
      var item = items[a];
      var url = rt.assetUrl(item.path);
      if (await cache.match(url)) { done += item.bytes; whole++; continue; }
      var parts = chunkCount(item.bytes);
      for (var i = 0; i < parts; i++) {
        if (await cache.match(partUrl(url, i))) done += chunkSize(item, i);
      }
    }
    out.doneBytes = done;
    out.assetsDone = whole;
    out.percent = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;
    out.state = state.done ? 'selesai'
      : running ? 'sedang mengunduh'
      : blockedReason() ? ('ditahan: ' + blockedReason())
      : state.signedInAt ? 'menunggu giliran'
      : 'belum mulai (belum ada login terdeteksi)';
    return Object.freeze(out);
  }

  function stop() { stopped = true; return true; }
  function resume() { stopped = false; schedule(); return true; }

  // Kembali online adalah satu-satunya isyarat yang layak membangunkannya sendiri.
  try {
    root.addEventListener('online', function () { schedule(); });
  } catch (_) {}

  root.FiezelVoiceOfflineAutoload = Object.freeze({
    SCHEMA: SCHEMA,
    CHUNK_BYTES: CHUNK_BYTES,
    noteSignedIn: noteSignedIn,
    status: status,
    progress: progress,
    stop: stop,
    resume: resume,
    pump: pump
  });
}(typeof globalThis !== 'undefined' ? globalThis : this));
