# m025-244 — Ajakan pasang ke Home Screen sesudah undangan diterima

Follow-up kecil dari m025-243 (`FIEZEL-M025243-UNDANGAN-TEMAN-DEEP-LINK-HANDOFF.md`). OWNER
menguji jalur undangan yang dirilis di sana dan melaporkan tautan WhatsApp "tetap dialihkan ke
browser" — bukan langsung masuk PWA yang sudah terpasang, dengan Mobile Legends dijadikan
pembanding pengalaman yang diinginkan.

Kewenangan menyalakan lane sosial tetap di **OWNER**, tidak berubah dari m025-243/240 — rilis
ini murni menambah satu tombol/instruksi di layar yang sudah ada, di belakang flag yang sama.

---

## 1. Masalah: batas platform, bukan bug

Tidak ada cara di web memaksa tautan WhatsApp membuka PWA terpasang alih-alih peramban — sudah
didokumentasikan panjang di `features/social/fiezel-invite-link.js`. Jalan sesungguhnya ke
pengalaman "persis Mobile Legend" adalah aplikasi native asli (TWA di Play Store, atau app
di App Store), yang butuh akun developer berbayar dan proses submit terpisah dari OWNER.

OWNER diberi tiga pilihan (tetap PWA, native Android, native Android+iOS) dan memilih **tetap
PWA** — jalur gratis, tanpa app store. Rilis ini adalah penyempurnaan terbaik yang bisa
dikerjakan di jalur itu.

Efek samping dari perbincangan ini: saran sebelumnya ("tutup tab, buka icon terpisah") ternyata
berlebihan — menerima undangan LANGSUNG di tab peramban yang terbuka sudah cukup, karena
identitas (cookie `fz_id`) memang nyambung ke aplikasi terpasang juga. Rilis ini tidak
mengubah fakta itu; ia menambah satu langkah OPSIONAL sesudahnya.

---

## 2. Perbaikan

Momen paling wajar mengajak murid memasang aplikasi adalah **sesudah** undangan diterima di
tab peramban — bukan sebelumnya (mengganggu alur penerimaan), bukan di Home biasa (tanpa
konteks).

Ditambahkan di `app.js`:

- **Tangkap `beforeinstallprompt`** (satu-satunya API Chrome/Android untuk memicu install
  terprogram) sedini boot, `preventDefault()` supaya banner bawaan Chrome tidak dobel dengan
  ajakan kita sendiri, simpan event-nya untuk dipicu belakangan.
- **Di layar sukses "Kalian sekarang teman belajar"** (`socialInviteRedeem`): kalau sedang di
  tab peramban (`!isStandaloneApp()`, memakai ulang `FiezelBackNav.standalone()` — bukan
  deteksi baru), tombol **"Pasang ke Home Screen"** memicu prompt native itu.
- **Safari/iOS tidak punya API ini sama sekali** — Apple belum pernah mengekspos
  `beforeinstallprompt`. Cabang terpisah (`isIosPlatform()`) menampilkan instruksi manual
  ("Ketuk Bagikan → Tambah ke Layar Utama"), bukan tombol yang berpura-pura bisa dipicu
  terprogram di platform yang tidak menyediakannya.
- Nudge menghilang sendiri sesudah dijawab (`appinstalled` membersihkan state) atau kalau
  aplikasi memang sudah berjalan standalone.

---

## 3. Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `app.js` | penangkap `beforeinstallprompt`/`appinstalled`, `socialInstallNudgeMarkup()`, `socialPromptInstall()`, dipasang di layar sukses `socialInviteRedeem` |
| `style.css` | `.social-install-nudge` — garis pemisah tipis, nol warna baru |
| `features/i18n/copy-id-feat-c.js`, `copy-th-feat-c.js` | empat kunci `social.install-*` |
| `social-invite-link-test.js` | +9 assert (68/68) — lihat bagian 4 |
| `id-golden-baseline.json` | +1 literal baru — lihat bagian 5 |
| `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `coordination/BUILD-VERSION.json` | m025-243 → **m025-244** lewat `node tools/bump-build.mjs` |

`features/neural-voice/fiezel-diag-panel.js` tersentuh **hanya** oleh `DIAG_BUILD` — nol
logika neural-voice berubah, persis pola yang sama di m025-240/243. Itulah yang membuat A13
Handoff Keeper menuntut dokumen ini.

---

## 4. Gerbang

```
node social-invite-link-test.js        68/68 assert PASS (naik dari 59)
node social-frontend-test.js           PASS
node social-api-contract-test.js       PASS
node social-schema-contract-test.js    PASS
node social-notify-test.js             PASS
node boot-order-test.js                PASS
node global-name-collision-test.js     PASS
node install-health-test.js            PASS
node pwa-release-coherence-test.js     PASS
node coordination-guard-test.js        PASS
node deploy-site-gate-test.js          PASS
node gate-registry-test.js             PASS
node contrast-test.js                  PASS
node a11y-test.js                      PASS
node locale-enum-test.js               PASS
node th-coverage-test.js               143/143 PASS
node id-golden-snapshot-test.js        HIJAU (sesudah regenerasi bagian 5)
node tools/bump-build.mjs --check      Selaras.
```

Sembilan assert baru di `social-invite-link-test.js` mengunci: banner bawaan Chrome ditahan
(bukan menumpuk dua banner), `deferredInstallPrompt` dibersihkan sesudah terpasang, nudge
HANYA muncul di tab peramban (bukan aplikasi terpasang), Android dan iOS punya cabang naskah
terpisah, markup-nya benar-benar dipanggil di layar sukses (bukan cuma didefinisikan), dan
`socialPromptInstall` memicu prompt native yang sama — bukan dialog buatan sendiri.

Nol gerbang dinonaktifkan, di-skip, atau dihapus.

---

## 5. Naskah Indonesia — 1 literal baru terkunci gerbang, 3 lolos di bawah ambang

Empat kunci `social.install-*` ditambahkan; hanya SATU (`social.install-ios-body`, mengandung
kata "ketuk" yang masuk daftar penanda kuat gerbang) yang lolos heuristik klasifikasi Indonesia
`id-golden-snapshot-test.js`. Tiga lainnya (label tombol pendek, badan pesan, toast selesai)
tidak memenuhi ambang ≥2 kata penanda umum gerbang itu — bukan bug, ambang itu memang dirancang
presisi di atas recall (lihat komentar di kepala `id-golden-snapshot-test.js`). Paritas id/th
penuh untuk keempatnya tetap terjaga lewat `th-coverage-test.js` yang terpisah.

```
TAMBAH (1) · HILANG (0)
```

---

## 6. Status rilis — menunggu OWNER

**Status: kode selesai dan bergerbang hijau; lane sosial masih mengikuti flag `cfSocialEnabled`
yang sama seperti m025-243 — tidak ada flag baru di rilis ini.**

Yang belum terbukti:

1. **`beforeinstallprompt` di perangkat sungguhan.** Chrome punya syarat engagement heuristic
   sendiri sebelum event ini menyala — di percobaan nyata tombol "Pasang ke Home Screen"
   mungkin tidak selalu muncul pada kunjungan pertama. Cabang iOS (instruksi manual) selalu
   muncul tanpa syarat itu.
2. Jalur ujung-ke-ujung dua perangkat, sama seperti m025-243/240, masih menunggu OWNER.

## 7. Langkah berikutnya

- Kalau OWNER nanti memutuskan mengejar jalur native (TWA Android / app iOS) untuk deep link
  yang benar-benar setara Mobile Legend, itu paket kerja terpisah — lihat opsi yang sempat
  ditawarkan di percakapan m025-244 (TWA + Play Console, atau ditambah Apple Developer Program
  untuk iOS). Nudge di rilis ini tetap berguna sebagai jalur fallback PWA murni, tidak perlu
  dibuang kalau jalur native itu diambil nanti.
