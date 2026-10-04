# FIEZEL m025-445 · SERAH TERIMA SISTEM PERTEMANAN ala LINE

**Build:** `m025-445` (naik dari `m025-444` milik WIP cockpit profil yang belum dirilis)
**Cakupan:** fitur sosial SLOT 7 (pertemanan) + jembatan ke SLOT 13 (Panggung Suara Live)
**Status lokal:** seluruh gerbang mutu HIJAU kecuali satu merah PRA. Tidak ada commit/push
(Git Protection Rule — menunggu perintah Owner).

---

## 1. Ringkasan & alasan perubahan

Permintaan Owner: bangun Sistem Pertemanan ala LINE di bagian Profil/Online — Kartu ID +
Kode QR/Barcode profil, deteksi tautan masuk `?friend=@handle`, kotak permintaan teman dengan
tombol Acc, dan tombol cepat "Ajak Main Suara" pada tiap teman.

Temuan saat audit kode: **fondasi API dan sebagian besar UI sudah berdiri** di
`features/social/fiezel-social.js` dan blok sosial `app.js` (tambah lewat ID, kotak permintaan
lewat modal, Terima/Tolak lewat `core.api.friendAccept/friendReject`, lencana di kartu Home).
Yang benar benar BARU dan lahir di rilis ini:

1. **Generator Kode QR SVG murni** (`features/social/fiezel-qr.js`) — tanpa pustaka pihak ketiga.
2. **Kartu ID pribadi + tombol Salin ID + Tampilkan Kode QR Saya** pada tab Profil.
3. **Deteksi tautan masuk `?friend=@handle`** + dialog konfirmasi ramah.
4. **Kotak Permintaan Pertemanan Masuk di DALAM tab Teman** (sebelumnya hanya modal dari Home)
   + **lencana angka pada tab Teman itu sendiri**.
5. **Tombol "Ajak Main Suara"** di tiap baris teman, menyambung ke Panggung Suara (SLOT 13).

### 1a. Mata uang teknis yang paling berisiko: Kode QR

Brief Owner melarang pustaka pihak ketiga yang berat. Repo ini menyimpan `qrcode.min.js` (±19 KB)
untuk halaman drop dan sentinel, tetapi menyeretnya ke shell murid berarti menambah ±20 KB pada
setiap unduhan hanya untuk satu modal. Karena itu `fiezel-qr.js` mengimplementasikan sendiri
standar ISO/IEC 18004: mode byte, level koreksi galat L/M/Q/H, versi 1 sampai 10 (cukup untuk
URL undangan paling panjang), dan mengeluarkan SATU string SVG.

**"Murni" TIDAK berarti "tidak terverifikasi".** `tests/friend-qr-contract-test.js` membandingkan
matriks modul `FiezelQr`, modul demi modul, dengan matriks `qrcode.min.js` yang sudah terbukti
benar di repo — untuk **seluruh 40 kombinasi versi 1..10 x level L/M/Q/H**. Selama pengembangan,
modul ini juga lolos uji putar balik (encode → raster → decode) memakai dekoder `jsQR` independen
di 34/34 kasus; dua kasus sisa adalah penolakan jujur untuk muatan yang melebihi versi 10.

---

## 2. Bukti pengujian

### 2a. Uji kontrak baru (didokumentasikan sebagai gerbang tetap)

| Gerbang | Hasil |
|---|---|
| `tests/friend-qr-contract-test.js` | LULUS 21/21 assert (40/40 matriks versi x level identik acuan) |
| `tests/friend-system-contract-test.js` | LULUS 44/44 assert (perkabelan + paritas kunci + bebas tanda hubung) |

### 2b. Gerbang mutu lokal (seluruhnya exit 0)

`panggung-suara-contract-test`, `stage-signaling-contract-test`, `cf-wiring-test`,
`id-golden-snapshot-test`, `curriculum-cache-version-test`, `gate-registry-test`,
`friend-qr-contract-test`, `friend-system-contract-test`, `th-ui-leak-test`, `th-coverage-test`
(249/249), `i18n-fallback-wrapper-test`, `i18n-param-collision-test`, `precache-covers-shell-test`,
`pwa-cache-test`, `cf-config-killswitch-test`, `config-consistency-test`, `css-keyframe-uniq-test`,
`social-frontend-test`, `social-invite-link-test`.

### 2c. Satu gerbang MERAH yang BUKAN milik rilis ini (utang pra-eksisting)

`tests/i18n-kunci-hantu-test.js` MERAH pada **51 kunci `profile.*`** ("kunci dipanggil tapi tidak
pernah didaftarkan") yang seluruhnya berasal dari blok `tactileProfileCockpitMarkup` — redesign
tab Profil bergaya "tactile clay" yang **sudah ada di working tree sebelum pekerjaan pertemanan
ini** (build `m025-444` sudah diklaimnya). Nol kunci `social3.*` baru menyumbang temuan.

**Rekomendasi:** sebelum rilis bersama, daftarkan 51 kunci `profile.*` itu (dengan kembaran th)
ATAU kembalikan blok profil ke keadaan terakhir yang hijau. Itu pekerjaan Owner/WIP profil, di
luar cakupan brief pertemanan, dan sengaja TIDAK disentuh agar tidak mencampur dua rilis.

---

## 3. Berkas yang disentuh

### Baru
- `features/social/fiezel-qr.js` — encoder Kode QR SVG murni (matrix/svg/dataUrl/utf8).
- `features/i18n/copy-id-friend.js` — 33 kunci domain `social3.*` (Indonesia).
- `features/i18n/copy-th-friend.js` — kembaran Thai (draft AI, menunggu review penutur asli).
- `tests/friend-qr-contract-test.js` — kontrak QR (silang acuan + struktur + SVG).
- `tests/friend-system-contract-test.js` — kontrak perkabelan pertemanan + i18n.
- `docs/handoffs/FIEZEL-M025445-SISTEM-PERTEMANAN-LINE-HANDOFF.md` — berkas ini.

### Diubah
- `app.js`
  - Blok baru setelah `decideFriendRequest`: `socialQrCore`, `socialProfileUrl`,
    `socialCopyWithFallback`, `socialCopyId`, `openProfileQr`, `socialDownloadQr`,
    `socialShareProfile`, `socialFriendParam`, `friendLinkBoot`, `socialFriendLinkSheet`,
    `socialFriendFromLink`, `socialAjakVoice`, `updateTemanBadge`.
  - `onlineTabs`/tab Teman: `onlineTemanTabLabel` menambahkan lencana `#fz3TemanBadge`.
  - `renderOnlineTab`: menyegarkan angka permintaan + lencana sebelum menggambar tab.
  - `socialTemanMarkup`: mengambil `friendRequests()` sekali, menambahkan seksi
    "Permintaan Pertemanan Masuk" di dalam tab, dan tombol "Ajak Main Suara" per baris teman.
  - `tactileProfileCockpitMarkup` (tab Profil yang HIDUP): kartu ID pribadi + Salin ID +
    Tampilkan Kode QR Saya.
  - `socialSummaryPaint` dan `decideFriendRequest`: menjaga lencana tetap selaras.
  - `openApp`: memanggil `friendLinkBoot()` (guarded) setelah `socialInviteBoot()`.
  - Blok SLOT 13: `fzStageInviteTo(handle)` (undangan terarah + salin tautan) di-`window`.
- `index.html` — `<script>` `copy-id-friend.js` + `fiezel-qr.js`; komentar alasan.
- `sw.js` — `fiezel-qr.js` + `copy-id-friend.js` masuk `ASSETS` (precache).
- `features/i18n/fiezel-th-loader.js` — memuat `copy-th-friend.js` dinamis.
- `features/i18n/locale-assets-th.json` — mendaftar `copy-th-friend.js`.
- `fiezel-2.css` — gaya `.social-friend-acts`, `.social-voice-btn`, `.fz3-tab-badge`, `.fz3-qr`.
- `.github/workflows/quality.yml` — mendaftarkan kedua uji kontrak baru.
- `id-golden-baseline.json` — regenerasi sadar (4823 literal; menyerap kartu ID di tab Profil).
- Enam titik hexa-sync build: `sw.js`, `core-config.js`,
  `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`,
  `coordination/BUILD-VERSION.json` (via arbiter `tools/bump-build.mjs`).

---

## 4. Status sejati & utang teknis

- **Kode QR tersimpan sebagai SVG, bukan PNG.** Tombol "Unduh gambar" mengunduh `.svg`
  (dibuka/dicetak semua peramban modern). PNG bisa ditambahkan belakangan lewat canvas bila
  diminta; SVG sengaja dipilih karena tajam di segala ukuran dan nol ketergantungan.
- **"Barcode profil" dipenuhi sebagai Kode QR.** Brief menulis "Kode QR / Barcode Profil"
  (salah satu cukup); QR adalah bentuk yang benar benar dipindai kamera ponsel dan itulah
  yang dijadikan muatan tautan `?friend=@handle`.
- **`i18n-kunci-hantu` MERAH pra-eksisting** (51 kunci `profile.*`, lihat §2c).
- **Naskah Thai `copy-th-friend.js` adalah DRAFT AI**, wajib review penutur asli sebelum final.
- Seluruh berkas berada di working tree lokal; **belum di-commit/di-push** sesuai Git
  Protection Rule sampai Owner memerintahkan.
