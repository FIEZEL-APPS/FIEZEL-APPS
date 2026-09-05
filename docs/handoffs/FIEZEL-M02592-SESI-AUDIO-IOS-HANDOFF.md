# FIEZEL — sesi audio iOS (handoff m025-92)

**Status:** selesai pada m025-92. **Cabang:** `m025-92-sesi-audio-ios` · **PR:** #138
**Penerimaan fisik:** WAIVED_BY_OWNER, dipilih OWNER di sesi kerja m025-93.

---

## 1. Kenapa dokumen ini ada

Berkas ini menyentuh `features/neural-voice/fiezel-diag-panel.js` — hanya penanda
`DIAG_BUILD`, tetapi gerbang A13 tidak bisa membedakan penanda dari perubahan neural
sungguhan. Jawabannya bukan mengakalinya, melainkan menulis catatan yang memang dibutuhkan:
ada satu aturan baru di sini yang tidak terlihat dari membaca satu berkas saja.

## 2. Aturan barunya

**FIEZEL mengklaim kategori sesi audio `playback`, dan klaim itu harus terjadi SEBELUM
`AudioContext` pertama dibuat.**

iOS 16.4+ (termasuk iOS 26) memberi halaman kendali atas kategori sesi audionya lewat
`navigator.audioSession`. Bawaannya untuk Web Audio adalah **ambient**, dan kategori itu
membawa dua sifat yang keliru untuk produk ini:

1. ikut dibungkam **saklar senyap fisik**, dan
2. **mengalah** kalau aplikasi lain sedang memutar audio.

FIEZEL bukan audio latar. Suara neural adalah materi belajarnya, umpan balik jawaban bagian
dari penilaian, dan sapaan merek adalah identitasnya.

`claimAudioSession(env)` dipanggil di baris pertama `ensureContext()`. Sekali saja, dan
kegagalannya ditelan — peramban tanpa API ini tidak boleh membuat seluruh SFX gagal.

## 3. Yang HARUS dipahami sebelum menyentuhnya lagi

**Ini bukan perbaikan untuk keluhan "tidak ada bunyi".** Akar keluhan itu sudah ditutup #135:
tiga dari enam suara tidak punya pemanggil. OWNER juga sudah memastikan saklar senyap
perangkatnya MATI saat melaporkannya — jadi kategori sesi bukan penyebabnya, dan menuliskan
sebaliknya di sini akan menyesatkan orang berikutnya.

Yang diperbaiki di sini adalah kategori yang memang salah sejak awal, dan yang menggigit pada
keadaan yang belum pernah diuji: saklar senyap menyala, atau ada audio aplikasi lain berjalan.

## 4. Titik buta yang tersisa, ditulis eksplisit

Saklar senyap iOS **tidak dapat dideteksi dari web sama sekali**. Itu sudah ditulis apa adanya
di `diagnostics()` sejak #133 dan tidak berubah.

Yang BISA dibaca adalah kategori sesinya, dan m025-92 menambahkannya ke panel Diagnostics
sebagai `sesiAudio`. Kalau di perangkat ia terbaca `ambient` padahal sudah diklaim, artinya
peramban menolak klaimnya — dan itu keterangan yang jauh lebih berguna daripada satu putaran
menebak lagi. Satu putaran penuh sudah pernah terbuang persis karena tidak ada pembacaan di
perangkat.

## 5. Berkas yang relevan

| Berkas | Peran |
|---|---|
| `features/audio/fiezel-ui-sfx.js` | `claimAudioSession()`, dan `sesiAudio` di `diagnostics()` |
| `tests/splash-choreography-test.js` | gerbang: klaim ada, nilainya `playback`, terjadi sebelum konteks dibuat, terbaca dari Diagnostics |

## 6. Yang sengaja TIDAK dilakukan

Gerbang "tidak ada suara mati" yang disiapkan bersama perubahan ini ternyata **sudah ada**
dari #135 (`AKAR KELUHAN: setiap bunyi yang dirancang benar-benar dipanggil dari antarmuka`)
dan setara persis. Punya sendiri dibuang alih-alih ditumpuk. Gerbang yang sudah ada itu
diuji-mutasi lebih dulu untuk memastikan ia memang menggigit: menghapus satu
`uiSfx('celebrate')` membuatnya merah.
