#!/usr/bin/env node
/**
 * social-invite-link-test.js — GERBANG JEMBATAN UNDANGAN & KOTAK MASUK SOSIAL.
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * Dua modul yang dijaga di sini memegang satu-satunya jalan undangan teman sampai
 * ke murid. Kalau salah satu cabangnya diam-diam patah, yang terlihat BUKAN galat —
 * yang terlihat adalah undangan yang tidak pernah muncul, atau lembar undangan yang
 * lahir berulang-ulang untuk kode yang sudah mati. Dua-duanya kerusakan yang senyap,
 * dan dua-duanya persis penyakit yang rilis ini datang untuk menyembuhkan.
 *
 * Yang dikunci:
 *   1. `extract()` menemukan kode di URL rapi, di hash, DAN di tengah kalimat WhatsApp
 *      utuh — jalan masuk share_target berdiri di atas kemampuan itu.
 *   2. Pemindaian kalimat bebas TIDAK melahirkan kode palsu dari kata biasa. Alfabet
 *      cetak tanpa 0/1/I/L/O/U adalah alasan teknis mengapa ini aman; kalau alfabetnya
 *      berubah, gerbang ini yang merah lebih dulu.
 *   3. Antrean undangan hangus sendiri (TTL 7 hari = TTL server) dan TIDAK PERNAH
 *      mengantre ulang kode yang sudah dijawab.
 *   4. `cleanUrl()` membuang `invite` TETAPI TIDAK PERNAH membuang `duel` — alur Duel
 *      Belajar membaca `?duel=` dari location setiap kali ia menggambar.
 *   5. Selisih potret teman: potret PERTAMA menghasilkan NOL kabar (murid baru tidak
 *      disambut dua puluh notifikasi), teman baru = satu kabar, sorakan naik = satu
 *      kabar, dan milestone TIDAK pernah mengangkat notifikasi sistem.
 *   6. Kedua modul memasang nama global sendiri dan ikut precache service worker.
 *
 * Node murni, nol dependency, nol jaringan. Modul dijalankan di atas `vm` dengan
 * localStorage tiruan — pola yang sama dengan gerbang copy-map i18n.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.env.FIEZEL_ROOT || __dirname;
const results = [];
let failures = 0;
function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) failures += 1;
}

/** localStorage tiruan: cukup memenuhi getItem/setItem/removeItem yang dipakai modul. */
function fakeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
    setItem: (k, v) => { map.set(String(k), String(v)); },
    removeItem: (k) => { map.delete(String(k)); },
    _map: map
  };
}

/** Jalankan satu modul mandiri di sandbox dan kembalikan global yang dipasangnya. */
function loadModule(relPath, extras) {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const sandbox = Object.assign({
    localStorage: fakeStorage(),
    URL,
    URLSearchParams,
    Date,
    JSON,
    Math,
    Object
  }, extras || {});
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: relPath });
  return sandbox;
}

/* ================================================================ 1. ekstraksi kode == */

const boxA = loadModule('features/social/fiezel-invite-link.js');
const L = boxA.FiezelInviteLink;

assert(L && typeof L.extract === 'function', 'fiezel-invite-link.js memasang FiezelInviteLink');

assert(L.extract('https://fiezel.my.id/app/?invite=K3JQ7W2A').code === 'K3JQ7W2A',
  'kode ditemukan di URL undangan biasa');
assert(L.extract('https://fiezel.my.id/app/#invite=K3JQ7W2A').code === 'K3JQ7W2A',
  'kode ditemukan di hash — sebagian klien chat memindahkan query ke fragment');
assert(L.extract('yuk gabung https://fiezel.my.id/app/?invite=K3JQ7W2A ya!').code === 'K3JQ7W2A',
  'kode ditemukan saat URL berada DI TENGAH kalimat (jalur share_target)');
assert(L.extract('kodeku K3JQ7W2A, tukar ya').code === 'K3JQ7W2A',
  'kode telanjang di tengah kalimat ditemukan — inilah yang membuat share sheet berguna');
assert(L.extract('K3JQ7W2A').kind === L.KIND_FRIEND, 'kode telanjang dikenali sebagai undangan teman');

// Anti-positif-palsu: alfabet cetak TANPA 0/1/I/L/O/U adalah alasan teknisnya.
assert(L.extract('Selamat belajar semuanya hari ini') === null,
  'kalimat Indonesia biasa TIDAK melahirkan kode palsu');
assert(L.extract('BELAJARLAH') === null,
  'kata 10 huruf tidak dipotong menjadi kode 8 karakter');
assert(L.extract('HALOOOOO1') === null,
  'token dengan huruf di luar alfabet cetak (O, 1) ditolak saat memindai kalimat');
assert(L.extract('') === null && L.extract(null) === null, 'masukan kosong/null aman');

assert(L.extract('https://fiezel.my.id/app/?duel=eyJ2IjoxfQ').kind === L.KIND_DUEL,
  'tautan duel dikenali sebagai duel, bukan undangan teman');

// Normalisasi: murid menempel apa adanya.
assert(L.normalizeCode(' k3jq-7w2a ') === 'K3JQ7W2A', 'spasi, tanda hubung, huruf kecil dirapikan');
assert(L.isServerShaped('K3JQ7W2A') === true, 'bentuk kode server diterima');
assert(L.isServerShaped('K3JQ7W2') === false, 'kode 7 karakter ditolak');
assert(L.isMintShaped('K3JQ7W2A') === true && L.isMintShaped('KOJQ7W2A') === false,
  'alfabet cetak menolak huruf O yang tidak pernah dicetak server');

/* ================================================================ 2. antrean undangan */

const boxB = loadModule('features/social/fiezel-invite-link.js');
const L2 = boxB.FiezelInviteLink;
const T0 = 1800000000000;

assert(L2.pending(T0) === null, 'antrean kosong saat awal');
L2.setPending({ kind: 'friend', code: 'K3JQ7W2A', source: 'param' }, T0);
assert(L2.pending(T0).code === 'K3JQ7W2A', 'undangan tersimpan dan terbaca kembali');
assert(L2.pending(T0 + 6 * 86400000) !== null, 'undangan 6 hari masih hidup (TTL server 7 hari)');
assert(L2.pending(T0 + 8 * 86400000) === null,
  'undangan lewat 7 hari hangus sendiri — kode itu sudah pasti ditolak server');

const boxC = loadModule('features/social/fiezel-invite-link.js');
const L3 = boxC.FiezelInviteLink;
L3.setPending({ kind: 'friend', code: 'K3JQ7W2A' }, T0);
L3.markHandled('K3JQ7W2A', T0);
assert(L3.pending(T0) === null, 'kode yang sudah dijawab langsung keluar dari antrean');
assert(L3.isHandled('K3JQ7W2A') === true, 'kode yang sudah dijawab diingat');
assert(L3.setPending({ kind: 'friend', code: 'K3JQ7W2A' }, T0) === null,
  'kode yang sudah dijawab TIDAK BISA diantrekan lagi — ini yang mencegah lembar berulang tiap boot');
assert(L3.setPending({ kind: 'friend', code: 'M7XQ2B9D' }, T0) !== null,
  'kode lain tetap boleh masuk antrean');

/* ================================================================ 3. pembersih alamat */

function cleanWith(href) {
  const box = loadModule('features/social/fiezel-invite-link.js', {
    location: { href, pathname: '/app/', origin: 'https://fiezel.my.id' }
  });
  let written = null;
  box.FiezelInviteLink.cleanUrl((a, b, url) => { written = url; });
  return written;
}
const cleaned = cleanWith('https://fiezel.my.id/app/?invite=K3JQ7W2A');
assert(cleaned !== null && !/invite=/.test(cleaned),
  'cleanUrl membuang ?invite= — muat ulang tidak memunculkan lembar yang sama dua kali');
const keptDuel = cleanWith('https://fiezel.my.id/app/?invite=K3JQ7W2A&duel=abc123xyz');
assert(keptDuel !== null && /duel=abc123xyz/.test(keptDuel),
  'cleanUrl TIDAK PERNAH membuang ?duel= — alur Duel Belajar membacanya dari location tiap render');
assert(cleanWith('https://fiezel.my.id/app/') === null,
  'alamat tanpa jejak undangan tidak ditulis ulang sama sekali');

/* ================================================================ 4. kotak masuk sosial */

const boxN = loadModule('features/social/fiezel-social-notify.js');
const N = boxN.FiezelSocialNotify;
assert(N && typeof N.diff === 'function', 'fiezel-social-notify.js memasang FiezelSocialNotify');

const respons1 = { friends: [{ handle: 'rani_hebat' }], cheersToday: [] };
const respons2 = {
  friends: [{ handle: 'rani_hebat' }, { handle: 'budi_kuat' }],
  cheersToday: [{ handle: 'rani_hebat', cnt: 2 }]
};
const snap1 = N.snapshotOf(respons1, T0);
const snap2 = N.snapshotOf(respons2, T0 + 1000);

assert(N.diff(null, snap1).length === 0,
  'potret PERTAMA menghasilkan NOL kabar — murid baru tidak disambut notifikasi teman lama');
const kabar = N.diff(snap1, snap2);
assert(kabar.some((e) => e.kind === 'friend_accepted' && e.handle === 'budi_kuat'),
  'teman baru = kabar "undanganmu diterima" — sinyal yang sebelumnya HILANG sama sekali');
assert(kabar.some((e) => e.kind === 'cheer_received' && e.handle === 'rani_hebat' && e.count === 2),
  'sorakan yang bertambah dilaporkan beserta selisihnya, bukan totalnya');
assert(N.diff(snap2, snap2).length === 0, 'potret yang sama dua kali = nol kabar (tanpa gema)');

// Sorakan yang TURUN (reset harian server) tidak boleh melahirkan kabar negatif.
const snapTurun = N.snapshotOf({ friends: respons2.friends, cheersToday: [] }, T0 + 2000);
assert(N.diff(snap2, snapTurun).length === 0,
  'reset sorakan harian tidak melahirkan kabar — selisih hanya dihitung saat NAIK');

// Milestone: dilaporkan ke kotak masuk, TIDAK PERNAH mengangkat notifikasi sistem.
const snapMs1 = N.snapshotOf({ friends: [{ handle: 'rani_hebat', milestones: [{ kind: 'srs_review' }] }] }, T0);
const snapMs2 = N.snapshotOf({ friends: [{ handle: 'rani_hebat', milestones: [{ kind: 'exam_passed' }] }] }, T0 + 1);
const kabarMs = N.diff(snapMs1, snapMs2);
assert(kabarMs.length === 1 && kabarMs[0].kind === 'friend_milestone', 'milestone teman masuk kotak masuk');
assert(N.notifiable(kabarMs).length === 0,
  'milestone teman TIDAK mengangkat notifikasi sistem — cermin PUSHABLE_KINDS server (§26)');
assert(N.notifiable([{ kind: 'friend_accepted', handle: 'x' }]).length === 1,
  'undangan diterima BOLEH mengangkat notifikasi sistem');
assert(N.notifiable([
  { kind: 'cheer_received', handle: 'a' }, { kind: 'cheer_received', handle: 'b' },
  { kind: 'cheer_received', handle: 'c' }, { kind: 'cheer_received', handle: 'd' }
]).length === N.NOTIFY_BURST_MAX,
  'ledakan kabar dibatasi — sepuluh sorakan sekaligus adalah satu kabar, bukan sepuluh notifikasi');

// Enum kind SAMA PERSIS dengan notify-core server: lane server nanti tinggal menggantikan
// sumbernya, tanpa satu pun penggantian nama atau naskah yang harus ditulis ulang.
const notifyCoreSrc = fs.readFileSync(path.join(ROOT, 'workers/api/social/notify-core.js'), 'utf8');
for (const kind of N.KINDS) {
  assert(notifyCoreSrc.includes("'" + kind + "'"),
    'enum klien "' + kind + '" ada juga di workers/api/social/notify-core.js');
}

const boxI = loadModule('features/social/fiezel-social-notify.js');
const NI = boxI.FiezelSocialNotify;
NI.push([{ kind: 'friend_accepted', handle: 'budi_kuat' }], T0);
assert(NI.unreadCount(T0) === 1, 'kabar baru terhitung belum terbaca (lencana Home)');
NI.markAllRead(T0);
assert(NI.unreadCount(T0) === 0, 'membuka Online menandai semua terbaca — lencana tidak menetap selamanya');
NI.push([{ kind: 'kabar_karangan', handle: 'x' }], T0);
assert(NI.inbox(T0).length === 1, 'jenis kabar di luar enum DIBUANG, tidak masuk kotak masuk');
assert(NI.prune([{ kind: 'friend_accepted', handle: 'x', at: T0 - 40 * 86400000 }], T0).length === 0,
  'kabar lewat retensi 30 hari dibuang');

/* ================================================================ 5. pemasangan modul */

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

for (const file of ['features/social/fiezel-invite-link.js', 'features/social/fiezel-social-notify.js']) {
  assert(html.includes('./' + file), file + ' dimuat index.html');
  assert(sw.includes("'./" + file + "'"), file + ' ikut precache service worker (peluncuran offline)');
}
assert(/<script defer src="\.\/features\/social\/fiezel-invite-link\.js"><\/script>[\s\S]{0,200}src="\.\/app\.js"|features\/social\/fiezel-invite-link\.js/.test(html),
  'jembatan undangan dideklarasikan sebelum app.js');
assert(html.indexOf('features/social/fiezel-invite-link.js') < html.indexOf('src="./app.js"'),
  'jembatan undangan dimuat SEBELUM app.js — lembar undangan dibuka dari alur boot');

assert(app.includes('socialInviteBoot()'), 'app.js memanggil socialInviteBoot()');
assert(app.includes('armSocialInviteSheet()'), 'app.js menjadwalkan lembar undangan sesudah alur sambutan');
assert(app.includes('socialNotifyPoll'), 'app.js memanggil jalur kabar teman');
assert(/self\.FiezelInviteLink/.test(app) && /self\.FiezelSocialNotify/.test(app),
  'app.js membaca kedua modul lewat self.* di belakang penjaga (pola fail-silent lane sosial)');

/* --- manifest: jalan masuk yang benar-benar bekerja di Android ------------------------- */
assert(manifest.share_target && manifest.share_target.method === 'GET',
  'manifest punya share_target — tekan-lama pesan WhatsApp → Bagikan → FIEZEL');
assert(manifest.share_target.params && manifest.share_target.params.text === 'text',
  'share_target menerima ?text= (pesan mentah tempat kode dipindai)');
assert(String(manifest.share_target.action || '').startsWith('./'),
  'action share_target relatif terhadap scope — benar di /app/ maupun mirror');
assert(manifest.id === './', 'manifest punya id stabil (mengubah start_url tidak melahirkan aplikasi kedua)');
assert(manifest.launch_handler && Array.isArray(manifest.launch_handler.client_mode)
  && manifest.launch_handler.client_mode[0] === 'focus-existing',
  'launch_handler memakai ulang jendela PWA yang sudah terbuka, bukan melahirkan jendela kedua');
assert(manifest.handle_links === 'preferred', 'handle_links=preferred: tautan dalam scope diutamakan ke aplikasi terpasang');

/* ================================================================ laporan ============= */

const passed = results.filter((r) => r.ok).length;
for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
console.log('social-invite-link-test: ' + passed + '/' + results.length + ' assert PASS');
if (failures) {
  console.error('social-invite-link-test GAGAL: ' + failures + ' assert merah');
  process.exit(1);
}
