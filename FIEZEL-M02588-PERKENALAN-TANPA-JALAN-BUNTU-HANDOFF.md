# FIEZEL — perkenalan tanpa jalan buntu (handoff m025-88)

**Status:** selesai dan dirilis pada m025-88. Melanjutkan daftar "langkah berikutnya" di
`FIEZEL-M02586-KOREOGRAFI-DAN-IDENTITAS-BUNYI-HANDOFF.md` bagian 8 nomor 2.
**Cabang:** `m025-88-intro-flow-no-dead-ends`

---

## 1. Aturan barunya, dan kenapa ia layak jadi aturan

**Tidak ada gerbang yang boleh berdiri di depan `render()`.**

Sampai m025-87, satu-satunya `render()` pada jalur boot berada di dalam
`unlockAppAfterNotification()`, dan seluruh isi fungsi itu duduk di balik satu baris:

```js
if(notificationsRequired()&&notificationPermission()!=='granted'){lockAppForNotifications();return false}
```

Akibatnya bukan "pengingat tidak aktif" melainkan "aplikasinya tidak pernah dicat". Yang
tampil adalah `.notification-locked` (yang menyembunyikan `.app` dan `.bottomnav`) di atas
halaman kosong, dengan tulisan **"FIEZEL tetap terkunci"**. Dan karena izin notifikasi yang
sudah ditolak **tidak bisa diminta ulang dari dalam halaman** - peramban tidak akan bertanya
lagi - keadaan itu tidak punya jalan keluar sama sekali dari dalam aplikasi.

Diukur langsung di peramban pada `main` @ m025-87:

```
Notification.permission   "denied"
document.body.className   "scene-night notification-locked"
#app.innerHTML.length     0
teks gerbang              "Notifikasi adalah syarat masuk FIEZEL…"
status                    "Izin notifikasi ditolak. FIEZEL tetap terkunci."
```

Splash tidak pernah tampil, perkenalan tidak pernah tampil, menu tidak pernah ada.

## 2. Tiga jalan buntu yang diperbaiki

### A. Tombol "Lewati" di perkenalan meninggalkan murid di cangkang kosong

`features/onboarding/fiezel-onboarding.js` — penyerahan kendali ditulis terpisah di setiap
jalan keluar, dan satu jalan keluar melewatkannya:

```js
if (skipAll) skipAll.addEventListener('click', function () { finish('skip'); });
```

`finish()` mencatat selesai dan membuang lapisannya, tanpa memanggil callback apa pun. Jadi
`afterOnboardingExit()` tidak pernah berjalan, `startNotificationGate()` tidak pernah
berjalan, dan `render()` - yang ada di ujung rantai itu - juga tidak. Diverifikasi dengan
memanggil modulnya langsung di peramban: `onFinish` **tidak pernah** terpanggil.

Sekarang `finish()` sendiri yang memberi tahu pemanggil, jadi tidak ada jalan keluar yang
bisa lupa. `'placement'` menuju `onPlacement`; selain itu menuju `onFinish`.

### B. "Lewati" di langkah terakhir adalah tombol mati

`goStep()` menjepit ke 5, dan tombol lewati-langkah memanggil `goStep(step + 1)`. Di langkah
5 itu berarti `goStep(6)` → dijepit kembali ke 5 → mengecat ulang layar yang sama. Tombolnya
mati persis di tempat ia paling terbaca sebagai jalan keluar: di sebelah "Mulai Belajar".
Diverifikasi: `stepIndex()` tetap 5 setelah ditekan, `onFinish` tidak terpanggil.

### C. Tombol login Puter bisa mati permanen

`setAuthGateState('pending')` mematikan tombolnya, dan tidak ada apa pun yang menyalakannya
kembali kalau `puter.auth.signIn()` tidak pernah selesai (jendela login diblokir peramban,
SDK menggantung). Sekarang ada tenggat 45 detik, dan tenggat itu ditangkap seperti kegagalan
login lain - tombolnya hidup lagi. `'focus'` juga ikut didengarkan: login desktop terjadi di
jendela lain, dan menutupnya tidak pernah mengubah `visibilityState` tab ini.

## 3. Gerbang notifikasi menjadi undangan

Yang berubah, dan hanya ini:

| Dulu | Sekarang |
|---|---|
| `lockAppForNotifications()` memasang `.notification-locked` | fungsinya hilang; kelasnya hilang dari `style.css` |
| `render()` di balik izin | `openApp()` berjalan lebih dulu, tanpa syarat |
| panel `aria-modal`, tanpa tombol tutup | undangan biasa + **"Nanti saja"** (`dismissWelcome()`) |
| izin ditolak → dinding "tetap terkunci" | panel tidak ditampilkan sama sekali - peramban tidak akan bertanya lagi, jadi menagihnya tidak jujur; jalurnya lewat Pengaturan |
| `Notification` tidak ada (tab Safari iOS) → dinding dengan tombol mati | aplikasi terbuka biasa |
| baris Pengaturan: kotak centang mati bertuliskan "wajib" | melaporkan keadaan sebenarnya, dan bisa menyalakan izin kalau peramban masih mau ditanya |

`dismissWelcome()` sebelumnya diekspor ke `window` tapi **tidak dipanggil dari mana pun** -
memang tidak boleh ada tombol yang menutup gerbang. Sekarang ia jalan keluar undangan, dan
penolakannya diingat 3 hari (`fiezel-notif-invite-v1`) supaya tidak menagih tiap peluncuran.

`FIEZEL_REQUIRE_NOTIFICATIONS` **tidak diubah nilainya**. Yang berubah artinya: dari "kunci
sampai izin turun" menjadi "cukup penting untuk ditawarkan" - lihat `notificationsWanted()`.
Membalik benderanya saja TIDAK menghasilkan undangan, melainkan menghapus tawarannya.

## 4. Berkas yang relevan

| Berkas | Peran |
|---|---|
| `app.js` | `openApp()`, `startNotificationGate()`, `inviteNotifications()`, `acceptNotifications()`, `dismissWelcome()`, `notificationStatusLabel()`, tenggat login Puter |
| `features/onboarding/fiezel-onboarding.js` | `finish()` sebagai satu-satunya jalan keluar; `LAST_STEP` |
| `index.html` | undangan tanpa `aria-modal`, tombol "Nanti saja" |
| `style.css` | aturan pengunci dihapus; gaya tombol jalan keluar |
| `onboarding-test.js` | tiga gate baru untuk jalan keluar + kontrak undangan |
| `notification-reminder-test.js` | pemeriksaan penguncian DIBALIK |
| `experience-integration-test.js` | dari "gerbang wajib" menjadi "ada terima DAN ada tolak" |

## 5. Sengaja ditinggalkan

1. **Gerbang akun Puter tetap wajib.** Yang diperbaiki hanya menggantungnya (bagian 2C).
   Menjadikannya bisa dilewati membalik keputusan m025-79 dan itu keputusan produk
   tersendiri, bukan perbaikan bug - pantas ditanyakan lebih dulu, bukan diselipkan di sini.
2. **Perkenalan masih tidak bisa diputar ulang.** `resetProgress()` hanya menghapus
   `fiezel-v4-state`; `fiezel-onboarding-v1` selamat, dan tidak ada baris Pengaturan untuk
   mengulang. Murid yang tidak sengaja menekan "Lewati" tidak bisa melihatnya lagi.
3. **Tiga lapisan masih bertumpuk saat berpindah gerbang** (perkenalan keluar 260 ms
   sementara panel berikutnya sudah dibuka; gerbang notifikasi menutup ~520 ms setelah
   gerbang akun dibuka). Tidak mengurung siapa pun, tetapi terbaca kasar.
4. **Perkenalan tidak memakai koreografi bersama dan tidak berbunyi sama sekali.** Perpindahan
   antarlangkah adalah `innerHTML` polos tanpa transisi, sementara `fiezel-ui-sfx.js` sudah
   punya suara `tap`/`toggle`/`celebrate` yang **tidak pernah dipanggil dari mana pun**.
5. **Palet perkenalan tidak pernah mengikuti mode gelap** (`--fz-bg:#efe3d3` dst hanya
   dideklarasikan sekali). Pemasangan malam hari berjalan: splash gelap → perkenalan krem →
   aplikasi gelap.
