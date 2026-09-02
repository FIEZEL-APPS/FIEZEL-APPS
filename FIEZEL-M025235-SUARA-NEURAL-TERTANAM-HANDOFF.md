# FIEZEL M025-235 — Suara Neural Tertanam di Sistem Handoff

**Handoff version:** 1.0
**Target Build:** m025-235
**Fitur:** Unduhan model neural otomatis untuk semua murid + Background Fetch
**Status:** SELESAI di sisi kode — menunggu gerbang CI dan keputusan OWNER
**Otoritas:** OWNER (permintaan langsung, 2026-09-02). Keputusan rilis tetap pada OWNER.

---

## 1. Ringkasan Perubahan

**Permintaan OWNER:** suara neural FIEZEL harus tertanam di sistem — terunduh sendiri di
latar, untuk semua murid, dan tetap berjalan walaupun murid keluar dari aplikasi.

### Gerbang login Puter dicabut

`armOfflineVoiceAutoload()` di `app.js` kehilangan baris `if(!puterSignedIn())return false;`.

Alasannya bukan preferensi, melainkan konsekuensi m025-232. Versi m025-121 memasang login
Puter sebagai pemicu karena mesin neural saat itu hanya **cadangan** untuk hari jatah Puter
habis — di bawahnya masih ada TTS peramban yang menampung semua orang. Lapisan itu dihapus
total, jadi mesin neural kini **lapisan TERAKHIR yang bersuara**. Gerbang login berubah dari
masuk akal menjadi terbalik: ia menjamin suara bagi murid yang paling kecil kemungkinannya
membutuhkannya, dan menyisakan SENYAP bagi murid yang tidak pernah login.

### Dua mekanisme, satu perilaku

| Platform | "Lanjut walau aplikasi ditutup" |
|---|---|
| Chromium (Android, Chrome/Edge desktop) | **Ya.** Diserahkan ke Background Fetch; sistem operasi yang memegang unduhannya. `backgroundfetchsuccess` di `sw.js` memindahkan hasilnya ke cache runtime neural. |
| WebKit / iOS Safari | **Tidak — tidak ada API-nya.** Berlaku jalur potongan 20 MB: melanjutkan dari potongan terakhir begitu aplikasi dibuka lagi, tidak pernah mengulang dari nol. |

Serah terima **menghentikan** jalur potongan saat ia mengambil alih. Pendaftaran yang masih
hidup dari sesi sebelumnya dibiarkan, tidak didaftar ulang.

---

## 2. Poin Penting untuk Sesi Berikutnya

- **JANGAN memasang kembali gerbang login.** `voice-offline-fallback-test.js` kini menjaga
  arah sebaliknya dan akan merah kalau `puterSignedIn()` muncul lagi di
  `armOfflineVoiceAutoload()`. Uji itu dulu menuntut kebalikannya; jangan bingung membaca
  riwayatnya.
- **JANGAN mengganti nama field simpanan `signedInAt`** walau maknanya kini "kapan pengunduh
  dinyalakan", bukan "kapan login terdeteksi". Menggantinya membuat state murid yang sedang
  setengah jalan tidak terbaca, dan unduhan 152 MB-nya mengulang dari nol.
- **URL yang didaftarkan ke Background Fetch WAJIB URL aset polos.** `sw.js` memakai
  `record.request` sebagai kunci cache. URL ber-`?fzpart=` atau permintaan ber-header `Range`
  menghasilkan kunci yang tidak pernah dibaca lapisan neural — dan `cache.put` menolak
  respons 206. Jalur potongan dan jalur Background Fetch memakai bentuk URL yang berbeda
  secara sengaja.
- **Kontrak id `fiezel-neural-voice::<namaCache>` punya DUA ujung** (halaman merakit, service
  worker membongkar) dan kegagalannya SENYAP: unduhan selesai, hasilnya dibuang, murid cuma
  merasa suaranya tidak pernah siap. Dijaga uji "id Background Fetch: halaman dan service
  worker sepakat" — sudah di-mutation-test, merah saat polanya dirusak.
- **`navigator.connection.saveData` TIDAK ADA di Safari.** Penjaga kuota di `blockedReason()`
  benar-benar bekerja di Chromium, tetapi di iPhone nilainya selalu `undefined` dan tidak
  pernah menahan apa pun. Di iOS tidak ada rem kuota otomatis sama sekali. Jangan menulis di
  mana pun bahwa murid iPhone terlindungi dari unduhan di data seluler.
- **Chromium selalu menampilkan notifikasi kemajuan sistem** untuk background fetch, dan itu
  tidak bisa dimatikan aplikasi. Janji lama m025-121 "tidak boleh ada satu pun pemberitahuan"
  karena itu gugur sebagian — masih utuh di iOS, tidak di Chromium. Judul notifikasinya
  (`'Menyiapkan suara FIEZEL'`) adalah naskah murid sungguhan dan tunduk pada kanon naskah.
- **Ranjau gerbang bagi penyunting `sw.js` berikutnya**: `neural-cache-isolation-test.js`
  melarang literal `'./vendor/` muncul di mana pun di sumber `sw.js` — termasuk di komentar.
  `pwa-cache-test.js` dan `sw-nav-shell-first-test.js` menuntut `skipWaiting` tepat satu kali
  dan melarang `clients.claim(`.

---

## 3. Status Verifikasi

| Gerbang | Hasil |
|---|---|
| `voice-offline-fallback-test.js` | 16 lulus (dari 14), termasuk 4 gerbang Background Fetch baru |
| Kontrak id dua-ujung | Lulus, dan **mutation-tested**: merah saat pola `sw.js` dirusak |
| `pwa-cache-test`, `sw-corp-test`, `sw-nav-shell-first-test`, `install-health-test`, `brain-page-wiring-test` | Lulus, sama seperti sebelum perubahan |
| `neural-cache-isolation-test`, `audio-locale-guard-test`, `regression-test` | Lulus |
| Ritual build 4 tempat | `m025-235` |
| Suite penuh CI + `release-audit.py` | **Dijalankan sesudah dokumen ini ditulis — lihat PR untuk hasilnya** |

**BELUM diverifikasi, dan tidak bisa diverifikasi dari sini:**

1. **Perilaku di perangkat sungguhan.** Terutama: apakah unduhan benar-benar lanjut setelah
   aplikasi ditutup di Android, dan apakah notifikasi sistemnya terbaca wajar oleh murid.
2. **Ongkos data yang sesungguhnya.** ~152 MB kini terunduh untuk murid yang mungkin tidak
   pernah memerlukannya, tanpa rem otomatis di iPhone. OWNER menerima ini secara sadar
   sesudah diberi tahu. Kalau di lapangan terasa terlalu mahal, remnya (bertanya sekali di
   onboarding, atau menunda sampai Wi-Fi terdeteksi di Chromium) tinggal dipasang — jalur
   `blockedReason()` sudah menjadi tempat yang benar untuk itu.
