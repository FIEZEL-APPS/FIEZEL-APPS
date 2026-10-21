# FIEZEL-M025576 — Layar masuk langsung sesudah splash, tanpa "menu utama 5–7 detik" (`m025-576`)

**Status:** siap review OWNER. Keputusan merge dan rilis tetap di tangan OWNER/MASTER.
Tidak ada teks baru yang dilihat murid, jadi i18n id/th tidak tersentuh.

## 1. Laporan OWNER

> *"SAAT PERTAMA KALI USER MENGINSTAL PWA DI DEVICE MASING MASING, SETELAH SPLASH BUKAN LANGSUNG
> MUNCUL ONBOARDING, MALAH DI ALIHKAN KE MUNU UTAMA SEKITAR 5-7 DETIK"*
>
> *"SEMACAM MENU UTAMA TAPI SELURUH LAYARNYA WARNA CREAM DAN BOTTOM BARNYA MUNCUL ... SETELAH
> ITU BERKEDIP DAN MUNCUL AUTH LOGIN, ANDROID"*

## 2. Reproduksi

Chromium dengan profil Android (412×915, UA Pixel 7), CPU diperlambat 4×, jaringan 25 Mbps
dengan latensi 60 ms, dan API `api.fiezel.my.id` tiruan berjeda.

| Keadaan perangkat | Sebelum | Sesudah |
|---|---|---|
| Benar-benar baru (tanpa penanda) | splash → layar masuk | sama |
| Penanda lokal "sudah masuk" tersisa (kunjungan di browser, akun/Google diingat), server berkata **belum masuk** | splash → **topbar + tab bawah di latar krem**, lalu perkenalan atau Hari ini + kartu pengingat → **4–9 detik kemudian** layar masuk | splash → **layar masuk** |
| Penanda lokal + server berkata **sudah masuk** | splash → Hari ini, lalu `/api/auth/session` ditanya ulang | splash → Hari ini, **tanpa** pertanyaan ulang |
| Server sangat lambat (9 detik) | Hari ini → layar masuk sesudah pertanyaan **kedua** (sekitar detik ke-22) | Hari ini → layar masuk begitu jawaban **pertama** tiba (sekitar detik ke-13) |

## 3. Akar masalah

1. **Server ditanya terlambat.** `authGateNeeded()` meloloskan penanda lokal, jadi aplikasi
   dibuka. Baru `verifyAuthSession()` 1,5 detik kemudian bertanya ke server, dan layar masuk
   menunggu jawabannya.
2. **Cangkang terlihat sebelum layar apa pun.** Topbar dan tab bawah adalah markup statis
   `index.html`, jadi keduanya tampil begitu splash terangkat walau belum ada layar yang
   digambar. Inilah "menu utama berwarna krem dengan bottom bar".

## 4. Perubahan

- **`app.js`:**
  - `primeBootAuthVerdict()` dipanggil di awal `bootFiezel()`, sejajar dengan unduhan konten.
    Ia hanya bertanya ke server bila ada penanda lokal, perangkat online, dan bukan demo guru.
  - `proceed()` di `startWelcomeExperience()` memakai jawabannya sesudah `authGateNeeded()`
    dan sebelum perkenalan:
    - **belum masuk** → penanda dicabut, layar masuk dipasang;
    - **masih di jalan** → ditunggu paling lama `BOOT_AUTH_WAIT_MS` (1,5 detik), sekali saja.
  - `followUpAuthCheck()`:
    - jawaban yang terlambat dipakai begitu tiba, tanpa pertanyaan kedua;
    - jawaban "sudah masuk" tidak ditanyakan ulang;
    - jawaban tidak pasti tetap dicek ulang lewat `verifyAuthSession()`.
  - `showAuthGate()` menandai jawaban boot sudah terpakai, jadi murid yang baru masuk tidak
    dihadang jawaban basi.
  - Aturan pencabutan tetap aturan `verifyAuthSession()`: hanya `signedIn:false` yang tegas.
    Offline, galat, atau server lama tetap meloloskan murid.
  - `render()` memasang `html.fz-app-open` sebelum layar pertama digambar.
- **`fiezel-tactile-clay.css` §16:** topbar dan tab bawah tersembunyi (`visibility:hidden`)
  sampai ada `html.fz-app-open`. `#app` sengaja tidak diselubungi, karena layar galat boot ada
  di sana.
- Gerbang baru `tests/boot-auth-verdict-test.js` (5 invarian, termasuk uji perilaku di env
  tiruan, dengan bukti negatif) terdaftar di `quality.yml`.

## 5. Langkah berikutnya

- Uji fisik OWNER di Android: hapus aplikasi, buka situs di Chrome, instal, lalu buka.
- Di luar laporan ini, tercatat dari reproduksi jaringan sangat lambat (6 Mbps, latensi
  150 ms): pengaman boot 15 detik di `index.html` menutup splash dan memasang kartu "FIEZEL
  belum siap" walau aplikasi masih memuat. Akibatnya murid melihat splash → kartu → splash →
  layar masuk. Pengaman itu bisa diperpanjang begitu `app.js` berjalan; perlu keputusan OWNER
  karena menyentuh jalur pemulihan boot.
