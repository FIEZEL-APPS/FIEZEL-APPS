# Pendaftaran murid SEKALI: satu identitas, lahir di onboarding

Otoritas: OWNER. Dokumen ini lahir dari satu laporan owner pada m025-261:

> "Aktivasi/autentifikasi murid ribet sekali — bukan sekali dua kali murid harus
> daftar, melainkan beberapa kali: onboarding, Puter, setting profil, terus di
> Online & Teman. Aku mau prosesnya sekali saja, hanya di onboarding. Untuk ID
> online, cukup gunakan yang dari daftar pertama kali. Hilangkan centang
> konfirmasi apa pun — kalau sudah mendaftar, wajib dan otomatis muncul di
> leaderboard dengan nama yang mereka pilih."

## Status

SELESAI di build `m025-262` (PR #354).

## Empat permukaan pendaftaran, dan ke mana perginya

| Permukaan (sebelum) | Tempat | Sesudah |
| --- | --- | --- |
| Nama murid (Step 1) | `features/onboarding/fiezel-onboarding.js` | **Satu-satunya pendaftaran.** Namanya menjadi ID online. |
| Gerbang akun Puter (`.auth-locked`) | `app.js` `armPuterAuthGate()` | Tidak dipasang otomatis lagi. Opsional lewat Pengaturan → Akun Puter. |
| "Masuk / Daftar" akun FIEZEL | Pengaturan (fold "Akun FIEZEL" + baris fold Online) | Hanya muncul untuk akun yang SUDAH ada; jalur aktivasi guru utuh. |
| Formulir handle + 2 centang persetujuan | Online & Teman, tab Profil | Satu tombol "Aktifkan sekarang" untuk murid lama. Nol formulir, nol centang. |

## Kontrak yang berlaku sekarang

1. **Satu tempat identitas lahir**: `registerStudentOnce()` di `app.js`. Ia
   menerbitkan identitas anonim (`ensureAnon` → cookie `fz_id`), memeriksa
   `profileMe()` LEBIH DULU (profil yang sudah ada selalu menang), lalu membuat
   profil dari kandidat handle pertama yang tersedia.
2. **ID online = nama pendaftaran pertama**: `socialHandleCandidates(name)` murni
   — nol jaringan, nol DOM, nol `Date.now()` — jadi nama yang sama selalu
   melahirkan handle pertama yang sama, dan setiap nama (kosong, satu huruf,
   angka, nama yang diblokir) tetap melahirkan minimal satu handle yang lolos
   `validateHandle()` milik `features/social/fiezel-social.js`.
3. **Persetujuan DITANAMKAN**: `profileCreate` selalu dikirim dengan
   `friendsVisible:true` dan `leagueOptIn:true`. Sudah mendaftar = otomatis
   tampil di papan dengan nama sendiri. Server tetap otoritasnya
   (`workers/api/route-social.js` tidak diubah — defaultnya yang aman tetap ada
   untuk pemanggil lain).
4. **Kegagalan tidak pernah menahan belajar**: offline, flag sosial mati, atau
   server diam membuat jalurnya DIAM. Pendaftaran dicoba lagi di boot berikutnya
   dan saat murid membuka Online & Teman.
5. **Idempoten**: panggilan yang tumpang tindih berbagi satu promise
   (`studentRegistrationPromise`).

## Yang sengaja TIDAK ikut dihapus

- **Mode privat papan** (Pengaturan → Online & Teman): jalan keluar SESUDAH
  terdaftar, bukan syarat mendaftar. `tests/social-frontend-test.js` menuntutnya
  ada, dan spec §4.3 menjanjikan efeknya seketika.
- **Persetujuan Creator Learning Report** (fold Lanjutan): satu-satunya centang
  tersisa yang benar-benar mengirim ringkasan belajar ke endpoint di luar
  perangkat. Menyalakannya diam-diam bukan yang diminta owner.

## Gerbang yang menahannya

`tests/student-single-registration-test.js` (terdaftar di `.github/workflows/quality.yml`)
menahan lima invarian di atas: R1 ID lahir dari nama onboarding dan selalu sah,
R2 persetujuan ditanamkan + nol kotak centang tersisa, R3 nol gerbang kedua,
R4 satu pintu untuk murid lama, R5 pendaftaran idempoten.

## Langkah berikutnya (roadmap)

1. Kalau owner mau ID online bisa DIGANTI sekali (ganti nama = ganti handle),
   itu perlu endpoint `profile/rename` di `workers/api/route-social.js`; hari ini
   handle terbit sekali dan tetap.
2. `socialHandleInput()` dan naskah `social.handle-*` masih ada di pohon meski
   formulirnya hilang — biarkan sampai keputusan (1) diambil, karena jalur ganti
   nama akan memakainya kembali.
3. Akun FIEZEL berkata sandi (`features/auth/fiezel-account.js`) kini murni jalur
   guru. Kalau kelak murid butuh sinkron antar-perangkat, ia harus menempel pada
   identitas yang sudah lahir di onboarding — bukan menjadi pendaftaran kelima.
