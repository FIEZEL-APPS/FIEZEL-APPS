# T-031 — Tabrakan nama global `FiezelAnalytics` (analytics murid mati & senyap)

Cabang: `work/t31name` · tanpa push · tanpa bump versi build · nol sentuhan pada
`style.css`, `sw.js`, `core-config.js`, `features/neural-voice/`, `coordination/`, `workers/`.

## 1. Apa yang rusak (ringkas, sudah terbukti sebelum sesi ini)

`features/ui/fiezel-ab-testing.js` memasang objek A/B testing sebagai `window.FiezelAnalytics`,
nama yang dimiliki modul analytics privasi-maksimal `features/analytics/fiezel-analytics-client.js`.
Karena berkas A/B dimuat `<script defer>` dari `index.html:428`, nama itu SELALU sudah terisi
sebelum pemuat analytics di `app.js` berjalan di idle. Pemuat lama berbunyi
`if(self.FiezelAnalytics)return resolve(self.FiezelAnalytics)` — ia mempercayai nama, menerima
objek A/B (nol `createClient`), gagal cek bentuk SESUDAHNYA, mencatat `module_shape`, lalu
MENYERAH. Modul analytics asli tidak pernah diunduh. Terukur di produksi:
`stats()` = `{loaded:false,started:true,lastError:'module_shape',gateOpen:true}`, nol permintaan
ke `/api/usage`, nol galat merah di konsol.

Arah sebaliknya sama berbahaya: `features/ui/fiezel-ui-manager.js:54` memanggil
`window.FiezelAnalytics.track(payload)`. Kalau suatu hari modul analytics yang menang balapan,
muatan eksperimen UI (berisi `url`, `timestamp`, dan teks bebas apa pun yang dikirim pemanggil)
akan masuk ke pipa yang diatur kontrak privasi-maksimal. Catatan tambahan yang ikut ditemukan:
kelas `FiezelABAnalytics` **tidak pernah punya** metode `track()`, jadi baris itu juga adalah
TypeError yang menunggu dipakai.

## 2. Nama baru dan SEMUA pemakai yang diperbarui

Nama baru: **`window.FiezelABAnalytics`** (sama dengan nama kelasnya, tidak ambigu).
Pemakai dicari dengan `grep -rn FiezelAnalytics` di seluruh repo, bukan dari daftar tangan:

| Berkas | Perubahan |
|---|---|
| `features/ui/fiezel-ab-testing.js` | `window.FiezelAnalytics = new FiezelABAnalytics()` → `window.FiezelABAnalytics`; listener `beforeunload` ikut; baris `module.exports` ikut; ditambah metode `track(payload)` yang meneruskan ke `logEvent()` (menutup metode hantu di §1); komentar kepala menjelaskan kepemilikan nama. |
| `features/ui/fiezel-ui-manager.js` | `logABEvent()` memakai `window.FiezelABAnalytics` dan **memeriksa bentuk** (`typeof ab.track === 'function'`) sebelum memakainya; fallback `console.debug` tetap. |
| `app.js` (blok `A1-ANALYTICS-EMITTER`) | pengerasan pemuat, lihat §3. |
| `index.html` | komentar di atas tag `<script defer>` A/B: berkas itu memiliki `FiezelABAnalytics` dan dilarang menyentuh `FiezelAnalytics`, plus alasan urutan muat. |
| `IMPLEMENTATION_GUIDE.md` | 12 contoh kode yang memanggil API A/B lewat `FiezelAnalytics` diperbarui ke `FiezelABAnalytics` (dokumen basi adalah cara cacat ini kembali lewat penyunting berikutnya). |
| `.github/workflows/quality.yml` | pendaftaran gerbang baru. |

**Data murid.** Kunci penyimpanan `fiezel_ab_events` **TIDAK** berganti nama. Pergantian nama
global tidak menyentuh penyimpanan, jadi event A/B yang sudah ada di perangkat murid tetap
terbaca, tetap dihitung `maybeFlushEvents()`, dan tetap ikut di-flush. Tidak ada satu baris yang
dibuang diam-diam. Kunci varian `fiezel_ab_variant` (milik `fiezel-ui-manager.js`) juga tidak
disentuh, jadi murid tidak berpindah kelompok eksperimen. Assert khusus menjaga keduanya
(`(N6)`, `(T3)`), dan mutasi M10 membuktikan assert itu bisa merah.

## 3. Bagaimana pemuat sekarang menolak mempercayai objek asing

Tiga perubahan struktural di `app.js`, bukan tambalan pada satu nama:

1. **Bentuk diperiksa SEBELUM dipakai.** `anIsModule(o)` menuntut `typeof o.createClient === 'function'`
   di titik pengambilan, bukan sesudah `resolve()`.
2. **Bentuk salah ⇒ LANJUT MEMUAT, bukan menyerah.** Objek asing di nama global tidak lagi bisa
   membatalkan pemuatan; `<script>` modul tetap disuntik, dan UMD modul (`root.FiezelAnalytics = api`)
   menimpa nama itu saat skripnya selesai.
3. **Nama khas milik pemuat.** Begitu modul terverifikasi bentuknya, ia dipatok di
   `self.__fiezelAnalyticsModule` (`AN_PINNED`) dan pemuatan berikutnya membaca patok itu LEBIH
   DULU. Efeknya: perebutan nama **di tengah sesi** (fitur baru, ekstensi, atau — penting —
   jendela cache campur saat rilis, di mana `fiezel-ab-testing.js` versi lama masih tersaji dari
   service worker bersama `app.js` versi baru) tidak lagi punya jalan masuk.

Sifat fire-and-forget tidak berubah: nol `await` di blok pemancar (dijaga assert), nol lemparan ke
pemanggil, dan setiap kegagalan tetap **senyap bagi murid**.

## 4. Kode galat baru dan artinya

`module_shape` yang dipakai untuk dua sebab berbeda adalah sebab kenapa cacat ini butuh dua sesi
peramban untuk dibedakan dari "modul rusak". Sekarang:

| Kode | Arti | Tindakan pemilik |
|---|---|---|
| `global_name_conflict` | Objek **asing** (nol penanda modul analytics) menempati `FiezelAnalytics`, dan tidak ada modul asli yang bisa dipakai. | Cari berkas yang menugaskan nama itu; gerbang nama global akan menyebut berkasnya. |
| `module_shape_invalid` | Objek di nama itu **memang** modul analytics (punya penanda seperti `SCHEMA_ID`/`STORAGE_KEYS`/`track`) tetapi `createClient` hilang/bukan fungsi. | Kontrak modul rusak — periksa rilis modul, bukan tabrakan nama. |
| `module_unavailable` | `<script>` modul gagal diunduh (404/offline/CSP). | Periksa deploy & precache, bukan kode. |
| `client_shape_invalid` | `createClient()` mengembalikan sesuatu tanpa `track()`. | Regresi di dalam modul. |

Kode lama (`emit_threw`, `emit_rejected`, `module_rejected`) tetap apa adanya.
Selain itu `stats()` sekarang melaporkan **`nameConflict: boolean`** — fakta "nama pernah direbut"
bertahan walau pemuatan akhirnya berhasil, sehingga tabrakan yang sudah dipulihkan tetap terlihat
alih-alih hilang bersama `lastError` yang dibersihkan saat sukses.

## 5. Gerbang

### Baru: `tests/global-name-collision-test.js` (terdaftar di `quality.yml`)
Menjaga KELAS cacatnya, bukan satu berkas. Ia memindai **sumber** setiap berkas `.js`/`.html`
yang dilacak git (`git ls-files`) dan mendeteksi **penugasan** nama global
(`window.X=`, `self.X=`, `globalThis.X=`, `root.X=`, `this.X=`, `window['X']=`, `var|let|const X=`,
`X=` telanjang), lalu menuntut **satu pemilik per nama**: `FiezelAnalytics` hanya boleh ditugaskan
`features/analytics/fiezel-analytics-client.js`, `FiezelABAnalytics` hanya oleh
`features/ui/fiezel-ab-testing.js`. Pengecualian berbasis **pola** (`*-test.js`/`*-audit.js`/
`*-selftest.js`, yang memang sengaja menyimulasikan tabrakan), bukan daftar nama berkas — daftar
tangan basi begitu berkas baru lahir. Assert lain: pemilik MEMANG menugaskan namanya (anti-vakum),
pemindai menangkap enam bentuk penugasan sintetis dan TIDAK menangkap pembacaan/perbandingan,
ui-manager memakai nama baru, kunci `fiezel_ab_events` utuh, pola lama "percayai global" hilang,
kode galat dibedakan, `stats().nameConflict` ada, dan nol `await` di blok pemancar. 22/22 PASS.

### Diperluas: `tests/analytics-client-test.js` (186 → 190 assert, semuanya PASS)
Bagian §T-031 **menjalankan** blok pemancar NYATA yang dipotong dari `app.js` (penanda
`A1-ANALYTICS-EMITTER-BEGIN/END`, tidak ditulis ulang) di dalam `vm`, dengan `<script>` yang
benar-benar mengeksekusi modul analytics nyata seperti di peramban:

* **(T1) simulasi tabrakan** — objek asing tanpa `createClient` dipasang ke nama global sebelum
  blok jalan. Dibuktikan: `<script>` tetap disuntik (1 elemen, 1 eksekusi), klien terbentuk
  (`loaded:true`), nama global akhirnya dipegang modul asli, event **benar-benar terkirim**
  (beacon/POST ≥ 1), `nameConflict:true` dengan `lastError:''`, dan modul dipatok di slot khas.
* **(T2) `lastError` membedakan sebab** — empat dunia berbeda menghasilkan empat kode berbeda
  (`global_name_conflict`, `module_shape_invalid`, `module_unavailable`, `client_shape_invalid`),
  plus assert bahwa `'module_shape'` lama sudah tidak dipakai blok.
* **(T3) sumber** — modul A/B nol penugasan nama lama, ui-manager memanggil nama baru, kunci
  penyimpanan utuh, gerbang nama global ada dan terdaftar.
* **(T4) slot patok** — nama global direbut **sesudah** modul termuat lalu cache instance direset:
  klien tetap terbentuk **tanpa unduhan tambahan** (`createElement` tetap 1).

Catatan teknis untuk penyunting berikutnya: menunggu di §T-031 memakai timer (`setTimeout(…,1)`),
bukan loop `setImmediate`. Loop `setImmediate` bisa selesai di bawah 1 ms dan membuat assert
hijau/merah bergantung kecepatan mesin — itu ditemukan di sesi ini (dua run beruntun memberi hasil
berbeda) dan sudah diperbaiki; tiga run beruntun sesudahnya identik.

### Bukti merah (mutasi terarah) — 15 mutasi, 15 merah, 0 lubang
`/home/user/workspace/_t31_redproof.py`, keluaran penuh di
`/home/user/workspace/t31-mutation-proof.txt`. Setiap mutasi diterapkan, gerbang dijalankan,
lalu dipulihkan; sesudah semuanya, kedua gerbang hijau kembali.

M1 modul A/B merebut kembali nama lama · M2 ui-manager kembali ke nama lama · M3 pemuat kembali
mempercayai global apa adanya · M4 bentuk salah ⇒ menyerah · M5 kode galat disatukan jadi
`module_shape` · M6 `global_name_conflict` disamakan dengan `module_shape_invalid` · M7 `stats()`
berhenti melaporkan `nameConflict` · M8 cek bentuk dilemahkan jadi `Boolean(o)` · M9 slot patok
dihapus · M10 kunci `fiezel_ab_events` diganti diam-diam · M11 `track()` A/B dihapus · M12 `await`
diselipkan ke blok pemancar · M13 pemindai dimatikan (anti-vakum) · M14 pendaftaran CI dihapus ·
M15 **berkas baru** (`features/ui/fiezel-rogue-probe.js`) merebut nama global.

**Lubang gerbang yang ditemukan dan ditutup di sesi ini.** Pada putaran pertama, **M9 tetap
HIJAU**: assert soal slot patok waktu itu hanya membaca sumber, jadi menghapus pembacaan patok
tidak memerahkan apa pun. Perbaikannya bukan menambah assert sumber lagi, melainkan menjadikannya
**perilaku**: `_resetForGate()` sekarang TIDAK mengosongkan slot patok (patok adalah identitas
modul yang sudah terverifikasi, bukan keadaan sesi), dan (T4) membuktikan bahwa sesudah nama
direbut di tengah sesi modul dipulihkan dari patok tanpa unduhan baru. M9 sekarang merah di
`(T4) nol unduhan tambahan` (`createElement` 1 → 2).

### Verifikasi (semua exit 0)
`tests/global-name-collision-test.js`, `tests/analytics-client-test.js`, `tests/cf-config-killswitch-test.js`,
`tests/analytics-privacy-test.js`, `tests/boot-order-test.js`, `tests/no-network-test.js`, `tests/secret-scan-test.js`,
`tests/gate-registry-test.js`, `tests/coordination-guard-test.js`, `tests/regression-test.js`,
`tests/install-health-test.js`.

## 6. Haruskah kegagalan pemuat analytics tetap SENYAP?

**Bagi murid: ya, mutlak, dan tidak diubah.** Murid tidak punya tindakan yang bisa diambil dari
kegagalan analytics, dan satu toast atau satu galat merah membeli nol pembelajaran dengan harga
gangguan. Semua jalur kegagalan tetap `resolve(null)`/boolean, nol lemparan, nol UI.

**Bagi pemilik: tidak.** Cacat ini hidup berhari-hari justru karena nol data terlihat sama seperti
nol pengguna. Tetapi ada asimetri yang harus dikatakan terang-terangan: **pipa yang mati tidak bisa
melaporkan kematiannya sendiri.** Beacon galat dari perangkat murid akan (a) menambah data yang
dikirim perangkat murid tanpa manfaat bagi murid, dan (b) tetap gagal tepat pada kasus yang paling
ingin kita lihat (jaringan mati, modul gagal diunduh). Karena itu **saya tidak mengusulkan telemetri
baru dari perangkat murid.** Tiga usulan berikut nol data tambahan dari perangkat murid:

1. **Gerbang praolah rilis di peramban sungguhan (paling kuat, paling murah).** Tabrakan ini adalah
   fakta URUTAN MUAT — ia bisa direproduksi tanpa satu pun murid. Muat `index.html` yang
   sesungguhnya di peramban headless pada praolah deploy (harness E2E repo ini sudah ada), tunggu
   idle, lalu tuntut `self.FiezelAnalyticsEmitter.stats()` = `{loaded:true, lastError:'', nameConflict:false}`
   saat gerbang `usage` dibuka. Gerbang `vm` yang saya tambahkan menguji blok pemancar; yang ini
   menguji `<script defer>` + `requestIdleCallback` + service worker nyata — satu-satunya lapis
   yang bisa menangkap tabrakan yang datang dari urutan tag di `index.html`.
2. **Alarm KEHADIRAN NOL di sisi pemilik, bukan di sisi murid.** Server sudah menyimpan rollup
   harian. Buat dasbor pemilik memperlakukan "rilis hidup + `usage:'on'` + nol baris rollup ≥ 24 jam"
   sebagai **status merah**, bukan sebagai angka nol yang tenang. Nol byte tambahan dari perangkat
   mana pun; yang berubah cuma cara pemilik membaca kekosongan.
3. **Silang-periksa dengan permintaan yang SUDAH ada (kondisional).** Kalau endpoint lain hidup
   (mis. `/api/config`), server bisa membandingkan: ada permintaan config dari lapangan tetapi nol
   event usage ⇒ pipa klien rusak, bukan nol pengguna. Ini memakai permintaan yang sudah terjadi
   untuk alasan lain — nol data baru. Kalau tidak ada endpoint lain yang hidup, silang-periksa ini
   tidak tersedia dan usulan (1)+(2) yang menanggung beban.
4. **Diagnostik di perangkat PEMILIK.** `stats()` sudah terekspos di `self.FiezelAnalyticsEmitter`.
   Menyurfacekannya di panel diagnostik pemilik (yang sudah ada, dan hanya untuk pemilik) berarti
   pemilik bisa melihat `nameConflict`/`lastError` di perangkatnya sendiri tanpa satu pun murid
   melihat apa pun dan tanpa satu byte keluar dari perangkat murid. Batasnya jujur: ia hanya
   membuktikan perangkat pemilik.

Yang **tidak** saya usulkan: beacon galat dari perangkat murid, kanal telemetri kedua, dan
menaikkan kegagalan analytics ke UI murid dalam bentuk apa pun.

## 7. Apa yang BELUM bisa dibuktikan sampai berjalan di perangkat murid sungguhan

* **Urutan muat sungguhan.** Semua bukti T-031 berjalan di `vm` Node dengan `document` tiruan.
  Bahwa `<script defer>` A/B + `requestIdleCallback` + suntikan `<script async>` berperilaku persis
  begitu di Chrome/Safari Android/iOS lapangan belum diuji di sini (itu usulan §6.1).
* **Jendela cache campur saat rilis.** Rilis yang membawa perbaikan ini akan melewati periode di
  mana sebagian murid memegang `fiezel-ab-testing.js` LAMA (yang masih menugaskan `FiezelAnalytics`)
  bersama `app.js` BARU. Pemuat yang dikeraskan dirancang tepat untuk selamat di jendela itu
  (`nameConflict:true`, modul tetap termuat), dan itu terbukti di gerbang — tetapi belum terbukti
  dengan service worker sungguhan. Catatan rilis: sesi ini **tidak** menaikkan nomor build sesuai
  perintah, jadi yang merilis harus menaikkannya lewat arbiter `tools/bump-build.mjs`, jika tidak
  murid akan tetap disajikan shell lama.
* **Angka yang sesungguhnya sampai.** Bahwa DAU/retensi akhirnya muncul di sisi pemilik hanya bisa
  dibuktikan setelah `usage:'on'` berjalan di lapangan; gerbang membuktikan permintaan terbentuk dan
  diterima `processClientBatch`, bukan bahwa Worker produksi menuliskannya.
* **Event A/B lama milik murid.** Bahwa `fiezel_ab_events` yang sudah ada benar-benar terbaca dan
  ter-flush oleh instance bernama baru diuji lewat sumber dan bentuk, bukan lewat `localStorage`
  murid sungguhan.
* **Bahwa pemilik benar-benar melihat.** Usulan §6 adalah usulan; tidak satu pun sudah dipasang di
  sesi ini (semuanya menyentuh wilayah di luar T-031: harness E2E, dasbor pemilik, Worker).
