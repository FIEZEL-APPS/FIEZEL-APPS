/**
 * FIEZEL gate — gestur dan tombol "kembali" (m025-84).
 *
 * OWNER: "tidak ada sistem swipe back, misalnya dari menu terus menuju ke fitur audiobook,
 * ketika ingin kembali dan swipe back, itu tidak berfungsi."
 *
 * Penyebabnya bisa dilihat langsung di sumber: sebelum rilis ini tidak ada satu pun
 * history.pushState di seluruh aplikasi. go() hanya mengubah state.view lalu render ulang,
 * jadi FIEZEL hidup di SATU entri riwayat - gestur kembali tidak punya tujuan, dan pada PWA
 * terpasang tombol kembali sistem justru menutup aplikasi.
 *
 * Gate ini menahan hal-hal yang membuat perbaikan seperti ini gampang berbalik jadi bug
 * yang lebih parah daripada bug awalnya:
 *
 *   - satu popstate = satu entri = satu tindakan (bukan dua layar sekaligus, bukan nol);
 *   - jalur kembali TIDAK PERNAH mendorong entri baru, karena gelung back->push->back akan
 *     mengurung murid di dalam aplikasi;
 *   - lapisan (modal, pembaca perpustakaan) ditutup lebih dulu, baru view berpindah;
 *   - gerbang notifikasi dan gerbang akun Puter tidak bisa diterobos dengan tombol kembali;
 *   - tekanan kembali tidak pernah mendaratkan murid di view yang tidak dikenal;
 *   - gestur tepi kiri TIDAK MEMBAJAK tarikan yang dimulai di dalam sesuatu yang memang
 *     bisa digulung mendatar - di carousel atau blok kode, tarikan mendatar sudah punya
 *     arti sendiri.
 */
const assert = require('assert');
const fs = require('fs');
const backNav = require('./features/ui/fiezel-back-nav.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const html = fs.readFileSync('./index.html', 'utf8');
const app = fs.readFileSync('./app.js', 'utf8');
const sw = fs.readFileSync('./sw.js', 'utf8');
const libraryUi = fs.readFileSync('./features/library/fiezel-library-ui.js', 'utf8');
const moduleSource = fs.readFileSync('./features/ui/fiezel-back-nav.js', 'utf8');
// Komentar modul memang MENYEBUT go(), startViewTransition, dan uiSfx() - itu justru inti
// penjelasannya. Yang diperiksa adalah kodenya, jadi komentar dibuang lebih dulu.
const moduleCode = moduleSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * Tiruan aplikasi: satu view aktif, satu daftar view sah, satu riwayat yang mencatat semua
 * yang didorong dan ditelusuri. `autoPop` meniru browser sungguhan, yang membalas setiap
 * penelusuran riwayat dengan sebuah popstate.
 */
function makeApp(over) {
  const app = Object.assign({
    view: 'home',
    views: new Set(['home', 'vocab', 'library', 'progress']),
    applied: [],
    pushes: 0,
    traversals: [],
    locked: false,
    autoPop: false,
    now: 1000
  }, over || {});

  const history = {
    pushState() { app.pushes++; },
    go(n) { app.traversals.push(n); if (app.autoPop) app.ctrl.handlePop(); },
    back() { history.go(-1); }
  };
  // m025-237: `pushes` sekarang menghitung entri PENANDA, bukan entri per layar. Riwayat
  // sungguhan tidak lagi menyimpan kedalaman, jadi yang diuji adalah kedalamannya KONSTAN.

  app.history = history;
  app.ctrl = backNav.createStack({
    history: history,
    currentView: () => app.view,
    knownView: v => app.views.has(v),
    homeView: 'home',
    applyView: v => { app.applied.push(v); app.view = v; return true; },
    locked: () => app.locked,
    now: () => app.now
  });
  // Meniru go(): entri didorong lebih dulu, baru view berubah.
  app.navigate = v => { const pushed = app.ctrl.pushView(v); app.view = v; return pushed; };
  return app;
}

const plainNode = { scrollWidth: 0, clientWidth: 0, parentNode: null, style: {} };

// ---- riwayat ------------------------------------------------------------------------

test('navigasi maju mendorong tepat satu entri riwayat', () => {
  const a = makeApp();
  assert.strictEqual(a.navigate('library'), true);
  assert.strictEqual(a.ctrl.depth(), 1);
  assert.strictEqual(a.pushes, 1, 'satu navigasi, satu entri');
});

test('menekan tab yang sedang aktif tidak mendorong entri', () => {
  // Tanpa penjagaan ini, satu tekanan kembali akan terbuang tanpa perubahan apa pun.
  const a = makeApp();
  assert.strictEqual(a.ctrl.pushView('home'), false);
  assert.strictEqual(a.ctrl.depth(), 0);
  assert.strictEqual(a.pushes, 0);
});

test('popstate memulihkan view asal dan memasang ulang penanda, tanpa menelusuri riwayat', () => {
  // m025-237: jalur kembali SEKARANG mendorong entri, dan itu justru yang menahan murid di
  // dalam dokumen. Gelung "back memicu push memicu back" butuh DUA bahan - mendorong DAN
  // menelusuri; mendorong saja tidak bisa memicu popstate berikutnya. Yang dijaga di sini
  // adalah bahan keduanya: jalur kembali tidak boleh menelusuri riwayat sama sekali.
  const a = makeApp();
  a.navigate('library');
  const before = a.pushes;
  const result = a.ctrl.handlePop();
  assert.strictEqual(result.action, 'view');
  assert.strictEqual(result.view, 'home');
  assert.deepStrictEqual(a.applied, ['home']);
  assert.strictEqual(a.pushes, before + 1, 'penanda harus dipasang ulang, kalau tidak tekanan berikutnya keluar dokumen');
  assert.deepStrictEqual(a.traversals, [], 'menelusuri riwayat dari dalam popstate = gelung tak berujung');
  assert.strictEqual(a.ctrl.depth(), 0);
});

test('kedalaman riwayat KONSTAN berapa pun dalamnya layar', () => {
  // Inti perbaikan boot-loop m025-237. Sepuluh layar bersarang tetap SATU entri penanda,
  // jadi tumpukan tidak punya apa pun untuk didesinkronisasi dengan riwayat - dan batas
  // pushState Safari (100 panggilan / 30 detik) tidak pernah tersentuh oleh sesi belajar.
  const a = makeApp();
  a.navigate('library');
  assert.strictEqual(a.pushes, 1, 'entri penanda pertama');
  for (let i = 0; i < 10; i++) a.ctrl.pushLayer({ id: 'lapis-' + i, close: () => true });
  a.navigate('vocab');
  assert.strictEqual(a.ctrl.depth(), 12);
  assert.strictEqual(a.pushes, 1, 'kedalaman layar tidak boleh menambah kedalaman riwayat');
  assert.strictEqual(a.ctrl.holdsMarker(), true);
});

test('tekanan kembali tidak pernah melepas penanda selama masih ada layar', () => {
  // Kalau satu saja cabang lupa memasangnya ulang, tekanan kembali berikutnya mendarat di
  // entri dokumen dan tekanan sesudahnya meng-unload halaman: about:blank, lalu splash.
  const a = makeApp();
  a.navigate('library');
  a.navigate('vocab');
  a.ctrl.pushLayer({ id: 'modal', close: () => true });
  for (const expected of ['close', 'view', 'view']) {
    assert.strictEqual(a.ctrl.handlePop().action, expected);
    assert.strictEqual(a.ctrl.holdsMarker(), true, 'penanda lepas di tengah jalan = boot loop');
  }
  assert.strictEqual(a.ctrl.handlePop().action, 'exit');
  assert.strictEqual(a.ctrl.holdsMarker(), false, 'baru di sini murid memang boleh keluar');
});

test('gerbang wajib juga memasang ulang penanda, bukan hanya menahan view', () => {
  const a = makeApp({ locked: true });
  a.ctrl.handlePop();
  assert.strictEqual(a.ctrl.holdsMarker(), true);
  assert.deepStrictEqual(a.traversals, []);
});

test('kembali menuruni riwayat satu langkah tiap tekanan, bukan langsung ke akar', () => {
  const a = makeApp();
  a.navigate('library');
  a.navigate('vocab');
  a.navigate('progress');
  assert.strictEqual(a.ctrl.depth(), 3);
  assert.strictEqual(a.ctrl.handlePop().view, 'vocab');
  assert.strictEqual(a.ctrl.handlePop().view, 'library');
  assert.strictEqual(a.ctrl.handlePop().view, 'home');
  assert.deepStrictEqual(a.applied, ['vocab', 'library', 'home']);
});

test('tumpukan kosong berarti keluar aplikasi, bukan murid terkurung', () => {
  const a = makeApp();
  const result = a.ctrl.handlePop();
  assert.strictEqual(result.action, 'exit');
  assert.strictEqual(a.applied.length, 0);
  assert.strictEqual(a.pushes, 0, 'menahan popstate di akar akan mengurung murid di dalam PWA');
  assert.strictEqual(a.ctrl.holdsMarker(), false, 'penanda harus dilepas, kalau tidak PWA tidak bisa ditutup');
});

test('aplikasi diberi tahu saat tekanan berikutnya benar-benar akan keluar', () => {
  // Tanpa sepatah kata pun, jeda satu tekanan itu terbaca sebagai tombol kembali yang
  // rusak. app.js menyambungkannya ke showToast("Tekan kembali sekali lagi...").
  let hints = 0;
  const a = makeApp();
  a.ctrl = backNav.createStack({
    history: a.history, currentView: () => a.view, knownView: v => a.views.has(v),
    homeView: 'home', applyView: () => true, locked: () => false, onExit: () => { hints++; }
  });
  assert.strictEqual(a.ctrl.handlePop().action, 'exit');
  assert.strictEqual(hints, 1);
});

test('back() terprogram diam saja saat tidak ada tujuan', () => {
  // Gestur tepi di layar akar tidak boleh melempar murid ke halaman apa pun yang kebetulan
  // ada sebelum PWA dibuka.
  const a = makeApp();
  assert.strictEqual(a.ctrl.back(), false);
  assert.deepStrictEqual(a.traversals, []);
  a.navigate('library');
  assert.strictEqual(a.ctrl.back(), true);
  assert.deepStrictEqual(a.traversals, [-1]);
});

// ---- lapisan di atas view -----------------------------------------------------------

test('modal ditutup lebih dulu, view baru berpindah pada tekanan berikutnya', () => {
  const a = makeApp();
  a.navigate('library');
  let closed = 0;
  a.ctrl.pushLayer({ id: 'modal', close: () => { closed++; return true; } });
  assert.strictEqual(a.ctrl.depth(), 2);

  const first = a.ctrl.handlePop();
  assert.strictEqual(first.action, 'close');
  assert.strictEqual(first.id, 'modal');
  assert.strictEqual(closed, 1);
  assert.strictEqual(a.view, 'library', 'menutup modal tidak boleh sekaligus memindahkan view');
  assert.deepStrictEqual(a.applied, []);

  const second = a.ctrl.handlePop();
  assert.strictEqual(second.action, 'view');
  assert.strictEqual(second.view, 'home');
});

test('pembaca perpustakaan kembali ke rak buku, bukan keluar dari perpustakaan', () => {
  // Persis kasus yang dilaporkan owner: menu -> perpustakaan -> audiobook -> kembali.
  const a = makeApp();
  a.navigate('library');
  let shelf = 0;
  a.ctrl.pushLayer({ id: 'library-reader', close: () => { shelf++; return true; } });
  assert.strictEqual(a.ctrl.handlePop().id, 'library-reader');
  assert.strictEqual(shelf, 1);
  assert.strictEqual(a.view, 'library');
});

test('lapisan yang layarnya sudah ditinggalkan tidak memakan tekanan kembali', () => {
  // Pembaca ditinggalkan lewat navigasi bawah, bukan lewat tombol kembali: entrinya jadi
  // entri mati. m025-237: penelusurannya sekarang gelung biasa DI DALAM satu handler, jadi
  // satu tekanan kembali langsung mendarat di layar yang benar. Dulu tiap entri mati
  // membutuhkan satu history.back() lagi - satu tekanan, beberapa penelusuran asinkron.
  const a = makeApp({ autoPop: true });
  a.navigate('library');
  a.ctrl.pushLayer({ id: 'library-reader', close: () => false });
  a.navigate('home');

  assert.strictEqual(a.ctrl.handlePop().view, 'library');
  const dead = a.ctrl.handlePop();
  assert.strictEqual(dead.action, 'view', 'entri mati dilewati dalam tekanan yang sama');
  assert.strictEqual(dead.view, 'home');
  assert.deepStrictEqual(a.applied, ['library', 'home'], 'entri mati dilewati, bukan diam saja');
  assert.strictEqual(a.ctrl.depth(), 0);
  assert.deepStrictEqual(a.traversals, [], 'melewati entri mati tidak boleh menyentuh riwayat');
});

test('penerusan berantai tidak pernah menguras riwayat sampai keluar aplikasi', () => {
  const a = makeApp({ autoPop: true });
  a.navigate('library');
  for (let i = 0; i < 8; i++) a.ctrl.pushLayer({ id: 'mati-' + i, close: () => false });
  a.ctrl.handlePop();
  assert.ok(a.ctrl.depth() > 0, 'satu tekanan kembali tidak boleh mengosongkan seluruh tumpukan');
  assert.deepStrictEqual(a.applied, [], 'tidak ada view yang berpindah diam-diam');
});

test('dismiss() TIDAK BOLEH menyentuh History API sama sekali', () => {
  // m025-237, dan ini gerbang paling penting di berkas ini. Versi lama membuang entri
  // dengan history.go(-n) yang ASINKRON, sementara pemanggilnya hampir selalu melakukan
  // sesuatu yang SINKRON sesudahnya - closeModal() lalu go(), closeModal() lalu
  // enterStage(), leaveStage() lalu enterStage(). pushState sinkron itu memotong cabang
  // riwayat di depan penunjuk, penelusuran yang tertunda mendarat di entri yang bukan
  // hitungan tumpukan, dan sejak saat itu tumpukan lebih dalam daripada riwayat. Tekanan
  // kembali berikutnya jatuh KELUAR DARI DOKUMEN: about:blank, PWA diluncurkan ulang,
  // murid mendarat di splash. Itulah boot loop yang dilaporkan owner - diverifikasi di
  // Chromium sungguhan, jejaknya ada di kepala features/ui/fiezel-back-nav.js.
  const a = makeApp();
  a.navigate('library');
  a.ctrl.pushLayer({ id: 'modal', close: () => true });
  const before = a.pushes;
  assert.strictEqual(a.ctrl.dismiss('modal'), true);
  assert.strictEqual(a.ctrl.depth(), 1);
  assert.deepStrictEqual(a.traversals, [], 'penelusuran asinkron di sini = boot loop ke splash');
  assert.strictEqual(a.pushes, before, 'dan tidak ada entri baru yang didorong sebagai gantinya');
  // Tekanan kembali sesudahnya tetap mendarat di layar yang benar, sekali jalan.
  assert.strictEqual(a.ctrl.handlePop().view, 'home');
});

test('dismiss() ikut membuang lapisan yang menumpuk di atasnya', () => {
  const a = makeApp();
  a.ctrl.pushLayer({ id: 'modal', close: () => true });
  a.ctrl.pushLayer({ id: 'sheet', close: () => true });
  assert.strictEqual(a.ctrl.dismiss('modal'), true);
  assert.strictEqual(a.ctrl.depth(), 0);
  assert.deepStrictEqual(a.traversals, [], 'dua entri dibuang dari tumpukan, riwayat tidak disentuh');
});

test('tutup-lalu-langsung-buka: pola yang dulu menjatuhkan murid keluar dokumen', () => {
  // Urutan persis dari sesi Chromium: masuk Perpustakaan, masuk rak buku, tekan
  // "<- Rak buku" (dismiss), lalu LANGSUNG membuka pembaca. Yang dijaga: tidak ada satu pun
  // penelusuran riwayat di sepanjang urutan itu, dan kedalaman riwayat tidak berubah.
  const a = makeApp();
  a.navigate('library');
  a.ctrl.pushLayer({ id: 'shelf', close: () => true });
  const marker = a.pushes;
  a.ctrl.dismiss('shelf');
  a.ctrl.pushLayer({ id: 'reader', close: () => true });
  assert.deepStrictEqual(a.traversals, []);
  assert.strictEqual(a.pushes, marker, 'penanda sudah terpasang, tidak ada entri kedua');
  assert.strictEqual(a.ctrl.depth(), 2);
  assert.strictEqual(a.ctrl.handlePop().id, 'reader', 'kembali menutup pembaca, bukan keluar aplikasi');
  assert.strictEqual(a.ctrl.holdsMarker(), true);
});

test('dismiss() pada lapisan yang tidak ada tidak menyentuh riwayat', () => {
  const a = makeApp();
  a.navigate('library');
  assert.strictEqual(a.ctrl.dismiss('modal'), false);
  assert.deepStrictEqual(a.traversals, []);
  assert.strictEqual(a.ctrl.depth(), 1);
});

test('tidak ada lagi penelan popstate yang bisa menelan tekanan kembali yang sah', () => {
  // Penelan itu ada karena dismiss() dulu memicu popstate-nya sendiri. Sekarang dismiss()
  // tidak memicu apa pun, jadi setiap popstate yang tiba PASTI berasal dari murid dan harus
  // dijawab dengan sebuah tindakan - tidak ada lagi jalur 'skipped'.
  const a = makeApp();
  a.navigate('library');
  a.ctrl.pushLayer({ id: 'modal', close: () => true });
  a.ctrl.dismiss('modal');
  assert.strictEqual(a.ctrl.handlePop().action, 'view');
  assert.strictEqual(backNav.SKIP_WINDOW_MS, undefined, 'jendela penelan tidak boleh hidup kembali');
});

// ---- gerbang wajib dan layar kosong -------------------------------------------------

test('gerbang notifikasi / akun tidak bisa diterobos dengan tombol kembali', () => {
  const a = makeApp();
  a.navigate('library');
  a.locked = true;
  const before = a.pushes;
  const result = a.ctrl.handlePop();
  assert.strictEqual(result.action, 'blocked');
  assert.strictEqual(a.view, 'library', 'tidak ada view yang berubah di balik gerbang');
  assert.deepStrictEqual(a.applied, []);
  assert.strictEqual(a.ctrl.depth(), 1, 'entri tetap ada');
  assert.strictEqual(a.pushes, before + 1, 'entri didorong ulang supaya kedalaman riwayat tetap');
});

test('selama gerbang menutupi layar, tidak ada entri baru yang terekam', () => {
  const a = makeApp({ locked: true });
  assert.strictEqual(a.ctrl.pushView('library'), false);
  assert.strictEqual(a.ctrl.pushLayer({ id: 'modal', close: () => true }), false);
  assert.strictEqual(a.ctrl.depth(), 0);
});

test('view tujuan yang tidak dikenal jatuh ke beranda, bukan ke layar kosong', () => {
  const a = makeApp({ view: 'hantu' });
  a.navigate('library');
  const result = a.ctrl.handlePop();
  assert.strictEqual(result.view, 'home');
  assert.deepStrictEqual(a.applied, ['home']);
});

test('lapisan tanpa id ditolak, supaya tumpukan tidak pernah lepas dari riwayat', () => {
  const a = makeApp();
  assert.strictEqual(a.ctrl.pushLayer({ close: () => true }), false);
  assert.strictEqual(a.ctrl.pushLayer(null), false);
  assert.strictEqual(a.pushes, 0);
});

test('penutup lapisan yang melempar tidak mematikan tekanan kembali', () => {
  const a = makeApp({ autoPop: true });
  a.navigate('library');
  a.ctrl.pushLayer({ id: 'modal', close: () => { throw new Error('rusak'); } });
  const result = a.ctrl.handlePop();
  assert.ok(result.action === 'chained' || result.action === 'view');
  assert.deepStrictEqual(a.applied, ['home'], 'murid tetap sampai di layar sebelumnya');
});

// ---- gestur tepi kiri ----------------------------------------------------------------

test('tarikan mendatar dari tepi kiri memicu kembali', () => {
  const g = backNav.createEdgeSwipe();
  assert.strictEqual(g.start({ x: 8, y: 300, target: plainNode }), true);
  assert.strictEqual(g.move({ x: 40, y: 302 }), false, 'belum melewati ambang jarak');
  assert.strictEqual(g.move({ x: 8 + backNav.MIN_DISTANCE_PX, y: 304 }), true);
  assert.strictEqual(g.hasFired(), true);
});

/* m025-238 - OWNER: "ketika user melakukan swipe back, sekarang ada jeda sekitar 10 detik,
   itu sangat mengganggu, tapi kalau user berpindah halaman dengan menekan taskbar navigasi,
   itu lancar dan mulus".
   Perangkatnya iOS, dan bentuk jedanya "diam, lalu tiba-tiba pindah". Itu bukan lambat -
   itu tarikan yang DITELAN. Di iOS mode standalone gestur swipe-back Safari tidak ada, jadi
   yang dipakai adalah gestur tepi milik modul ini, dan ambangnya menuntut tarikan yang nyaris
   lurus dari 24px pertama layar. Tiga tarikan yang benar-benar dilakukan ibu jari gagal
   memenuhinya. Gerbang di bawah menahan ketiganya - semuanya terbukti MERAH pada ambang lama. */
function tarik(points) {
  const g = backNav.createEdgeSwipe();
  if (g.start(points[0]) !== true) return false;
  let fired = false;
  for (let i = 1; i < points.length; i++) if (g.move(points[i])) fired = true;
  return fired;
}
const titik = (x, y) => ({ x, y, target: plainNode });

test('busur ibu jari dari tepi kiri TETAP dibaca sebagai kembali', () => {
  // Ibu jari berputar pada pangkalnya: di awal tarikan ia sudah naik ~30px sementara dx baru
  // ~14px. Aturan lama (|dy| >= |dx|) menyerahkan gestur ke penggulung PADA GERAKAN PERTAMA,
  // dan penyerahannya permanen - sisa tarikan 200px ke kanan tidak berarti apa-apa. Dari sisi
  // murid gesturnya benar tetapi layarnya diam, dan ia menarik berulang kali sampai kebetulan
  // ada satu yang cukup lurus untuk lolos.
  assert.strictEqual(tarik([titik(6, 400), titik(20, 370), titik(90, 368), titik(206, 360)]), true,
    'tarikan melengkung adalah tarikan NORMAL, bukan gulir');
});

test('tarikan yang dimulai 26-30px dari tepi tetap dibaca sebagai kembali', () => {
  // Titik sentuh ibu jari di iPhone gampang mendarat 26-30px dari tepi walau murid merasa
  // menarik "dari pinggir". Pada 24px tarikan itu ditolak MENTAH di sentuhan pertama.
  assert.strictEqual(tarik([titik(26, 400), titik(120, 402), titik(240, 404)]), true);
  assert.strictEqual(tarik([titik(30, 400), titik(120, 402), titik(240, 404)]), true);
});

test('gulir vertikal sungguhan TETAP bukan gestur kembali', () => {
  // Pagar dua arah: melonggarkan busur tidak boleh membuat gulir halaman terbajak. Gulir
  // sungguhan punya dx nyaris nol - didominasi vertikal jauh di atas ambang 2,5x.
  assert.strictEqual(tarik([titik(6, 400), titik(20, 300), titik(30, 200)]), false);
  assert.ok(backNav.VERTICAL_DOMINANCE >= 2, 'ambang dominasi vertikal tidak boleh dilucuti');
});

test('jeda antar-gestur tidak boleh menelan tarikan kedua yang disengaja', () => {
  // 450ms lebih panjang daripada waktu murid menarik lagi ketika layar sebelumnya belum
  // selesai digambar, jadi tarikan yang DISENGAJA ikut tertelan. Perlindungan sesungguhnya
  // terhadap satu tarikan yang terbaca dua kali ada di createEdgeSwipe (sekali `fired`,
  // tracking mati sampai sentuhan berikutnya), bukan di jeda ini.
  assert.ok(backNav.GESTURE_COOLDOWN_MS <= 300,
    'jeda yang lebih panjang dari ini menelan tarikan yang disengaja');
});

test('gestur yang dimulai jauh dari tepi diabaikan', () => {
  const g = backNav.createEdgeSwipe();
  assert.strictEqual(g.start({ x: backNav.EDGE_PX + 1, y: 300, target: plainNode }), false);
  assert.strictEqual(g.move({ x: 400, y: 300 }), false);
});

test('gulir vertikal di dekat tepi kiri bukan gestur kembali', () => {
  const g = backNav.createEdgeSwipe();
  g.start({ x: 6, y: 400, target: plainNode });
  assert.strictEqual(g.move({ x: 20, y: 300 }), false);
  assert.strictEqual(g.isTracking(), false, 'gestur diserahkan seluruhnya ke penggulung halaman');
  assert.strictEqual(g.move({ x: 300, y: 300 }), false, 'tidak boleh dijemput lagi di tengah jalan');
});

test('tarikan miring yang tidak cukup mendatar ditolak', () => {
  const g = backNav.createEdgeSwipe();
  g.start({ x: 6, y: 400, target: plainNode });
  // dx 80, dy 100: sudah cukup jauh, tetapi rasionya masih di bawah ambang mendatar (1.2).
  assert.strictEqual(g.move({ x: 86, y: 500 }), false);
});

test('menarik ke kiri dari tepi kiri bukan kembali', () => {
  const g = backNav.createEdgeSwipe();
  g.start({ x: 20, y: 300, target: plainNode });
  assert.strictEqual(g.move({ x: 2, y: 300 }), false);
  assert.strictEqual(g.isTracking(), false);
});

test('gestur tidak dibajak dari dalam elemen yang bisa digulung mendatar', () => {
  // Carousel, blok kode, tabel lebar: di sana tarikan mendatar berarti "gulung isi ini".
  const carousel = { scrollWidth: 900, clientWidth: 320, style: { overflowX: 'auto' }, parentNode: null };
  const child = { scrollWidth: 0, clientWidth: 0, style: {}, parentNode: carousel };
  assert.strictEqual(backNav.scrollsHorizontally(child), true);
  const g = backNav.createEdgeSwipe();
  assert.strictEqual(g.start({ x: 4, y: 300, target: child }), false);
  assert.strictEqual(g.move({ x: 300, y: 300 }), false);
});

test('elemen lebar yang TIDAK bisa digulung tidak ikut memblokir gestur', () => {
  const wide = { scrollWidth: 900, clientWidth: 320, style: { overflowX: 'hidden' }, parentNode: null };
  const child = { scrollWidth: 0, clientWidth: 0, style: {}, parentNode: wide };
  assert.strictEqual(backNav.scrollsHorizontally(child), false);
  assert.strictEqual(backNav.createEdgeSwipe().start({ x: 4, y: 300, target: child }), true);
});

test('penelusuran ke atas berhenti, tidak berjalan sepanjang dokumen', () => {
  let node = { scrollWidth: 0, clientWidth: 0, style: {}, parentNode: null };
  for (let i = 0; i < 200; i++) node = { scrollWidth: 0, clientWidth: 0, style: {}, parentNode: node };
  assert.strictEqual(backNav.scrollsHorizontally(node), false);
});

test('gestur tepi terpasang lewat touch dan benar-benar memanggil kembali', () => {
  const listeners = {};
  const doc = {
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    emit(type, event) { (listeners[type] || []).forEach(fn => fn(event)); }
  };
  let hits = 0;
  assert.strictEqual(backNav.installEdgeSwipe({ document: doc }, () => { hits++; }), true);
  doc.emit('touchstart', { touches: [{ clientX: 6, clientY: 300 }], target: plainNode });
  doc.emit('touchmove', { touches: [{ clientX: 200, clientY: 306 }], target: plainNode });
  doc.emit('touchend', { changedTouches: [{ clientX: 200, clientY: 306 }], target: plainNode });
  assert.strictEqual(hits, 1);
  doc.emit('touchstart', { touches: [{ clientX: 200, clientY: 300 }], target: plainNode });
  doc.emit('touchmove', { touches: [{ clientX: 400, clientY: 300 }], target: plainNode });
  assert.strictEqual(hits, 1, 'sentuhan di tengah layar tidak memicu apa pun');
});

test('dua jari bukan gestur kembali', () => {
  const listeners = {};
  const doc = {
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    emit(type, event) { (listeners[type] || []).forEach(fn => fn(event)); }
  };
  let hits = 0;
  backNav.installEdgeSwipe({ document: doc }, () => { hits++; });
  doc.emit('touchstart', { touches: [{ clientX: 6, clientY: 300 }, { clientX: 200, clientY: 300 }], target: plainNode });
  doc.emit('touchmove', { touches: [{ clientX: 200, clientY: 300 }], target: plainNode });
  assert.strictEqual(hits, 0);
});

test('gestur tepi hanya dipasang pada aplikasi terpasang', () => {
  // Di dalam tab browser, gestur kembali milik browser masih ada; menambah gestur kedua di
  // atasnya hanya membuat keduanya saling mengganggu.
  assert.strictEqual(backNav.standalone({ navigator: { standalone: true } }), true);
  assert.strictEqual(backNav.standalone({ matchMedia: q => ({ matches: q.indexOf('standalone') !== -1 }) }), true);
  assert.strictEqual(backNav.standalone({ matchMedia: () => ({ matches: false }) }), false);
  assert.strictEqual(backNav.standalone({}), false);
  assert.strictEqual(backNav.standalone(null), false);
});

// ---- pemasangan di produk -------------------------------------------------------------

test('modul dimuat sebelum app.js, sejajar dengan runtime fitur lain', () => {
  const module = html.indexOf('./features/ui/fiezel-back-nav.js');
  assert.ok(module > -1, 'index.html harus memuat modul kembali');
  assert.ok(module < html.indexOf('./app.js'), 'app.js memanggil modul ini saat boot');
});

test('modul ikut di-precache service worker', () => {
  // Tanpa ini, gestur kembali mati justru saat perangkat sedang offline - keadaan yang
  // paling sering dipakai murid pada PWA terpasang.
  assert.ok(sw.includes("'./features/ui/fiezel-back-nav.js'"));
});

test('go() mendorong entri hanya pada navigasi maju', () => {
  assert.ok(/function go\(v,opts\)/.test(app), 'go() menerima penanda jalur riwayat');
  assert.ok(/if\(opts\?\.viaHistory!==true\)pushBackNavView\(v\)/.test(app),
    'jalur kembali tidak boleh mendorong entri kedua');
  assert.ok(/applyView:v=>go\(v,\{viaHistory:true\}\)/.test(app),
    'perpindahan view saat kembali harus lewat go(), bukan render langsung');
});

test('kembali memakai transisi dan aturan kurangi-gerak yang sama dengan maju', () => {
  const goLine = /function go\(v,opts\)\{[^\n]*/.exec(app)[0];
  assert.ok(goLine.includes("uiSfx('nav')"), 'satu bunyi navigasi, sama seperti maju');
  assert.ok(goLine.includes('document.startViewTransition'), 'transisi view tidak boleh dilewati');
  assert.ok(goLine.includes('prefersReducedMotion()'), 'kurangi-gerak tetap dihormati di jalur kembali');
  assert.ok(!/startViewTransition|uiSfx|playFeedbackSound|requestAnimationFrame/.test(moduleCode),
    'modul kembali tidak boleh menganimasikan atau membunyikan apa pun sendiri - itu sumber bunyi ganda');
});

test('modal terdaftar sebagai lapisan, dan penutupnya tidak menyentuh riwayat dua kali', () => {
  assert.ok(/pushLayer\?\.\(\{id:'modal',close:closeModalNow\}\)/.test(app));
  assert.ok(/function closeModalNow\(\)\{if\(!modalOpen\)return false/.test(app),
    'penutup mentah harus melaporkan saat tidak ada modal terbuka');
  assert.ok(/function closeModal\(\)\{try\{self\.FiezelBackNav\?\.dismiss\?\.\('modal'\)\}/.test(app),
    'penutupan oleh aplikasi sendiri harus membuang entri riwayatnya');
});

test('pembaca perpustakaan mendaftarkan lapisannya sendiri', () => {
  assert.ok(/var READER_LAYER = 'library-reader';/.test(libraryUi));
  assert.ok(/nav\.pushLayer\(\{ id: READER_LAYER, close: closeReaderLayer \}\)/.test(libraryUi));
  assert.ok(/function closeReaderLayer\(\)[\s\S]{0,160}return false;/.test(libraryUi),
    'penutup harus melaporkan saat pembacanya sudah tidak di layar');
  assert.ok(/button\.addEventListener\('click', backToShelf\)/.test(libraryUi),
    'tombol "Rak buku" harus membuang entri riwayatnya juga');
});

test('gerbang wajib disebut namanya pada pemasangan', () => {
  // Dulu baris ini menuntut kelas 'notification-locked'. Kelas itu tidak pernah dipasang
  // lagi sejak notifikasi berhenti menjadi syarat masuk (OWNER membalik m025-34), jadi
  // memeriksanya berarti memeriksa kunci yang tidak ada. Yang dijaga sekarang adalah
  // pertanyaan yang sebenarnya: selama panel undangan terbuka, tekanan kembali harus
  // menutupnya, bukan menavigasi di belakangnya - dan gerbang akun tetap seperti dulu.
  assert.ok(/getElementById\?\.\('welcome'\)/.test(app), 'panel undangan yang terbuka harus dihitung sebagai lapisan');
  assert.ok(/auth-locked/.test(app), 'gerbang akun Puter tetap dihitung sebagai lapisan');
  assert.ok(/locked:\(\)=>\{/.test(app), 'pemasangan harus menyerahkan pemeriksaan gerbang ke aplikasi');
  assert.ok(/knownView:v=>VALID_VIEWS\.has\(v\)/.test(app), 'tujuan kembali diverifikasi ke daftar view sah');
});

// ---- m025-117 -> m025-254: penyebab "stuck screen" yang dilaporkan OWNER --------------
//
// OWNER (m025-117): "swipe back masih cacat sistem, meski di perbaiki, misalnya sudah masuk
// kedalam folder, dan ingin kembali, ketika swipe back malah stuck screen".
//
// Diagnosisnya dijalankan di peramban sungguhan, dan penyebab utamanya BUKAN modul ini:
// features/daily-target/fiezel-daily-target.js membungkus window.go dengan
// `function (view) { ... return baseGo(view) }`. go() punya dua parameter - go(view, opts) -
// dan `opts.viaHistory === true` adalah SATU-SATUNYA hal yang menahan go() supaya tidak
// mendorong entri riwayat baru. Pembungkus yang menjatuhkan argumen kedua membuat setiap
// perpindahan MUNDUR mendorong entri MAJU, jadi riwayat berubah menjadi dua entri yang
// saling menunjuk dan murid berpindah-pindah di antara dua layar yang sama selamanya.
//
// m025-254: seluruh kunci target harian dihapus (OWNER: "annoying banget"), jadi berkas yang
// dulu dibaca gerbang di bawah tidak ada lagi. Gerbangnya TIDAK ikut dihapus, hanya berpindah
// sasaran: yang dijaga sekarang adalah ketiadaan KELAS bugnya di seluruh aplikasi - tidak ada
// pembungkus go() yang menjatuhkan argumen, dan tidak ada pemilik riwayat kedua.

test('tidak ada pembungkus go() yang menjatuhkan argumen keduanya', () => {
  // Pola terlarangnya spesifik: membungkus go lalu memanggil ulang dengan SATU argumen.
  // Yang sah adalah .apply(this, arguments) - meneruskan opts.viaHistory apa adanya.
  const wrappers = [...app.matchAll(/baseGo\s*\(([^)]*)\)/g)].map(m => m[1].trim());
  for (const argsPassed of wrappers) {
    assert.ok(/^this,\s*arguments$/.test(argsPassed),
      'pembungkus go() harus meneruskan seluruh argumen: gelung back->push->back lahir dari yang tidak');
  }
  assert.ok(!/__dailyTargetGuarded/.test(app), 'pembungkus penolak navigasi milik target harian sudah tidak ada');
});

test('hanya ADA SATU pemilik riwayat: tidak ada modul lain yang mendorong entrinya sendiri', () => {
  // Entri asing menggeser kesejajaran antara tumpukan modul ini dan riwayat sungguhan, dan
  // sejak itu satu tekanan kembali bisa memakan entri yang tidak diketahui siapa pun. Kunci
  // target harian dulu melakukannya; ia sudah dihapus seluruhnya (m025-254).
  assert.ok(!fs.existsSync('./features/daily-target/fiezel-daily-target.js'),
    'berkas kunci target harian harus benar-benar terhapus, bukan sekadar tidak dimuat');
  assert.ok(!/contains\?\.\('daily-locked'\)/.test(app),
    'hook locked tidak boleh menunggu kelas yang tidak ada modulnya lagi');
});

test('gerbang wajib menahan tekanan kembali bahkan saat belum ada navigasi apa pun', () => {
  // Urutan lama memeriksa tumpukan kosong LEBIH DULU, jadi gerbang yang menyala di layar
  // pertama bisa ditembus satu tekanan kembali - dan tekanan itu keluar dari aplikasi.
  const a = makeApp({ locked: true });
  const result = a.ctrl.handlePop();
  assert.strictEqual(result.action, 'blocked');
  assert.strictEqual(a.pushes, 1, 'entrinya harus didorong ulang, bukan dibiarkan lepas');
  assert.deepStrictEqual(a.applied, []);
});

test('tekanan kembali tidak pernah berakhir tanpa perubahan apa pun di layar', () => {
  // Lapisan yang ditutup lewat jalan lain meninggalkan satu entri mati di DASAR tumpukan.
  // Sampai m025-117 hasilnya 'noop': entri riwayat habis, layar diam. Dari sisi murid itu
  // tidak terbaca sebagai "tidak ada tujuan" melainkan sebagai aplikasi yang macet.
  const a = makeApp();
  a.view = 'library';
  a.ctrl.pushLayer({ id: 'modal', close: () => false });
  const result = a.ctrl.handlePop();
  assert.strictEqual(result.action, 'fallback');
  assert.deepStrictEqual(a.applied, ['home'], 'jalan buntu terakhir adalah beranda, bukan diam');
  assert.strictEqual(a.ctrl.depth(), 0);
});

test('di beranda dengan tumpukan habis, diam memang jawaban yang benar', () => {
  const a = makeApp();
  a.ctrl.pushLayer({ id: 'modal', close: () => false });
  const result = a.ctrl.handlePop();
  assert.strictEqual(result.action, 'noop');
  assert.deepStrictEqual(a.applied, [], 'melompat ke beranda dari beranda bukan perubahan, hanya kedipan');
});

test('gestur tepi hanya dipasang di platform yang memang tidak punya gestur kembali sendiri', () => {
  // iOS terpasang tidak punya - gestur swipe-back di sana milik chrome Safari, dan di PWA
  // chrome itu tidak ada. Android terpasang SUDAH punya, dan gestur sistemnya sudah
  // memanggil history.back(); memasang gestur kedua berarti satu tarikan jari = dua langkah.
  assert.strictEqual(backNav.needsEdgeSwipe({ navigator: { standalone: true } }), true);
  assert.strictEqual(backNav.needsEdgeSwipe({
    matchMedia: q => ({ matches: q.indexOf('standalone') !== -1 }),
    navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/126' }
  }), false, 'Android terpasang sudah punya gestur kembali sistem');
  assert.strictEqual(backNav.needsEdgeSwipe({ matchMedia: () => ({ matches: false }) }), false);
  assert.ok(/needsEdgeSwipe\(target\)/.test(moduleCode), 'pemasangan harus memakai pagar itu, bukan standalone() saja');
});

test('satu tarikan jari memicu paling banyak satu langkah mundur', () => {
  const listeners = {};
  const doc = {
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    emit(type, event) { (listeners[type] || []).forEach(fn => fn(event)); }
  };
  let hits = 0;
  backNav.installEdgeSwipe({ document: doc }, () => { hits++; });
  for (let i = 0; i < 3; i++) {
    doc.emit('touchstart', { touches: [{ clientX: 6, clientY: 300 }], target: plainNode });
    doc.emit('touchmove', { touches: [{ clientX: 300, clientY: 304 }], target: plainNode });
    doc.emit('touchend', { changedTouches: [{ clientX: 300, clientY: 304 }], target: plainNode });
  }
  assert.strictEqual(hits, 1, 'gestur yang terbaca dua kali tidak boleh melompati dua layar sekaligus');
});

// ---- m025-117: "folder" di dalam satu view --------------------------------------------
//
// Kategori Classroom, rak buku, kartu flashcard, lesson Grammar, dan layar kuis semuanya
// digambar DI DALAM satu view. Tanpa pendaftaran ini tekanan kembali dari dalam sebuah
// folder mengambil entri VIEW-nya dan melempar murid keluar dari seluruh bagian.

test('sub-layar mendaftar sebagai lapisan, memakai mekanisme yang sama dengan modal', () => {
  assert.ok(/function enterStage\(kind,spec\)/.test(app));
  assert.ok(/self\.FiezelBackNav\?\.pushLayer\?\.\(\{id:entry\.id,close:\(\)=>closeStage\(entry\)\}\)/.test(app),
    'stage tidak boleh punya riwayatnya sendiri - itu pemilik riwayat kedua lagi');
  for (const kind of ['vocab-flashcards', 'vocab-review', 'grammar-lesson', 'quiz', 'classroom-topic', 'classroom-lesson']) {
    assert.ok(app.includes("enterStage('" + kind + "'"), 'sub-layar belum terdaftar: ' + kind);
  }
});

test('stage menyimpan cara menggambar DIRINYA, bukan cara kembali ke induk', () => {
  // Model "cara kembali ke induk" memaksa setiap pemanggil tahu induknya, dan kuis - yang
  // bisa dimulai dari hub mana pun - tidak bisa tahu. Menutup satu stage cukup menggambar
  // apa pun yang KINI di puncak.
  assert.ok(/function drawTopScreen\(\)/.test(app));
  assert.ok(/runStageLeave\(stageStack\.splice\(i\)\.reverse\(\)\);\r?\n  drawTopScreen\(\);/.test(app));
});

test('perpindahan view membuang pembukuan stage BESERTA entri lapisannya', () => {
  // Sampai m025-237 dropStages() sengaja tidak menyentuh modul kembali, karena dismiss()
  // dulu memutar riwayat mundur dengan history.go() yang asinkron dan menjalankannya tepat
  // sebelum pushState entri view baru adalah cara tercepat membuat riwayat dan tumpukan
  // tidak sejajar. dismiss() sekarang murni bedah tumpukan, jadi alasan itu hilang - dan
  // yang tersisa hanyalah kerugiannya: keluar dari sesi lewat navigasi bawah meninggalkan
  // entri lapisan MATI yang harus dilewati satu per satu oleh tekanan kembali berikutnya.
  assert.ok(/uiSfx\('nav'\);dropStages\(\);if\(opts\?\.viaHistory!==true\)pushBackNavView\(v\)/.test(app));
  assert.ok(/function dropStages\(\)\{if\(!stageStack\.length\)return false;const first=stageStack\[0\];runStageLeave/.test(app));
  assert.ok(/function dropStages\(\)[^\n]*FiezelBackNav\?\.dismiss\?\.\(first\.id\)/.test(app),
    'entri lapisan yang layarnya sudah dibuang harus ikut dibuang');
});

test('dismiss() di app.js dan modulnya tidak boleh memutar riwayat mundur', () => {
  // Gerbang lintas-berkas untuk penyebab boot loop: tidak boleh ada history.go()/back() di
  // jalur "aplikasi menutup layarnya sendiri", di berkas mana pun yang memegang stage.
  assert.ok(!/history\.go\(-/.test(moduleCode), 'modul kembali tidak boleh menelusuri riwayat mundur lagi');
  const goBackCalls = moduleCode.match(/api\.back\(\)/g) || [];
  assert.strictEqual(goBackCalls.length, 1, 'satu-satunya penelusuran yang sah adalah back() untuk gestur tepi');
});

test('Classroom tutor ikut mendaftarkan foldernya, lewat pengait opsional', () => {
  const tutor = fs.readFileSync('./features/tutor-classroom/fiezel-tutor-v3.js', 'utf8');
  assert.ok(/root\.FiezelStage && root\.FiezelStage\.enter\(kind, restore\)/.test(tutor),
    'pengait opsional supaya berkas tutor tetap bisa dimuat dan diuji sendirian');
  assert.ok(/pushStage\('tutor-topic'/.test(tutor));
  assert.ok(/pushStage\('tutor-lesson'/.test(tutor));
  assert.ok(/popAllStages\(\)/.test(tutor), 'kembali ke akar Classroom harus membuang seluruh stage di dalamnya');
});

test('modul bisa dipakai di Node maupun di halaman', () => {
  assert.strictEqual(backNav.schema, 'fiezel-back-nav-v1');
  assert.strictEqual(typeof backNav.install, 'function');
  assert.strictEqual(globalThis.FiezelBackNav, backNav, 'modul harus menempel di globalThis untuk halaman');
});

test('install() tanpa dokumen tidak melempar', () => {
  assert.strictEqual(backNav.install({}, {}), null);
  assert.strictEqual(backNav.install(null, {}), null);
});

console.log('');
if (failures) { console.error('FIEZEL back navigation: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL back navigation: PASS');
