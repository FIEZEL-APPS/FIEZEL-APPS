# FIEZEL — bunyi yang benar-benar sampai ke telinga (handoff m025-90)

**Status:** selesai pada m025-90. **Cabang:** `m025-90-sfx-yang-terdengar`
**Laporan OWNER:** "sfx nya tetap tidak ada bunyi" — disampaikan SETELAH m025-88 melepas
gerbang kurangi-gerak, jadi keluhannya bukan pengulangan, melainkan sisa yang belum tersentuh.

---

## 1. Kenapa m025-88 belum menyelesaikannya

m025-88 benar: `prefers-reduced-motion` memang membisukan seluruh SFX, dan itu memang harus
dilepas. Tapi memperbaiki mesin tidak menambah satu pun pemanggilnya. Setelah m025-88, di
`main` yang memanggil bunyi hanya tiga tempat di seluruh aplikasi:

```
uiSfx('nav')    x2   go()
uiSfx('open')   x1   openModal()
uiSfx('close')  x1   closeModalNow()
```

Dihitung langsung di peramban pada layar Home build `m025-89`: **43 kontrol yang bisa
disentuh, 27 di antaranya tidak mengeluarkan bunyi apa pun.** Kartu tujuan, tombol AI,
"Nanti saja", tombol perkenalan, pilihan jawaban - semuanya diam. Dan tiga dari enam suara
yang sudah disintesis sejak m025-86 - `tap`, `toggle`, `celebrate` - **tidak pernah dipanggil
dari satu baris pun di seluruh repo.** Suara yang ditulis dengan hati-hati, lalu tidak pernah
diberi jalan ke telinga.

Jadi yang dialami OWNER konsisten: bunyi hanya muncul kalau yang ditekan kebetulan salah satu
dari lima tab navigasi bawah.

## 2. Aturan barunya

**Kontrol tidak perlu didaftarkan satu per satu untuk berbunyi.**

`FiezelUiSfx.install(env)` memasang SATU pendengar `pointerdown` pada fase capture di
`document`. `voiceForTarget()` memilih suaranya dari elemen yang disentuh:

| Yang disentuh | Suara |
|---|---|
| `<button>`, `<a>`, `[role=button]` biasa | `tap` |
| `input[type=checkbox|radio]`, chip level, kartu tujuan, tab Peta | `toggle` |
| apa pun ber-`data-sfx="nama"` | suara itu |
| kontrol yang `onclick`-nya memanggil `go(` / `openSettings(`, atau berkelas `nav` | **dilewati** |
| bidang biasa (div, teks) | tidak berbunyi |

Baris terakhir yang dilewati itu penting: jalur-jalur itu sudah membunyikan suaranya sendiri,
dan suaranya lebih kaya - `nav` dua nada, `open` naik, `close` turun. Ketukan satu nada di
sana akan MENGGANTIKANNYA, bukan menambah.

Konsekuensinya: layar yang ditulis besok ikut berbunyi tanpa ada yang perlu ingat
memasangnya. Itulah alasan pendekatan ini dipilih daripada menempelkan `uiSfx()` ke seratus
tempat - cara itu sudah dicoba dan sudah meleset.

## 3. Satu sentuhan, satu bunyi

`MIN_GAP_MS = 110`. Tanpa itu, tombol yang memicu dua jalur sekaligus berbunyi dua kali dan
terdengar seperti kesalahan. Jeda ini juga yang dipakai sebagai bukti terukur bahwa
pendengarnya benar-benar berbunyi - lihat bagian 5.

## 4. Sesi audio iOS

`navigator.audioSession.type = 'playback'`, diklaim SEBELUM `AudioContext` pertama dibuat.

Bawaan Web Audio di iOS 16.4+ adalah sesi **ambient**: ikut dibungkam saklar senyap fisik dan
mengalah pada audio aplikasi lain. Aplikasi yang seluruh isinya bunyi - suara neural, umpan
balik jawaban, sapaan merek - bukan audio latar. OWNER melaporkan saklar senyapnya MATI, jadi
ini bukan akar keluhan kali ini; ia dipasang karena kategorinya memang salah, dan karena titik
buta itu sudah membuang satu putaran penuh sebelumnya.

## 5. Diverifikasi di peramban, bukan hanya dibaca

- 38 kontrol di Home: **23 mendapat `tap`**, 15 dilewati karena sudah bersuara sendiri.
  Sebelumnya hanya 5 tab navigasi yang berbunyi.
- `pointerdown` pada tombol biasa → panggilan `play()` berikutnya **tertahan** oleh jendela
  110 ms. Itu bukti pendengarnya benar-benar membunyikan sesuatu, bukan sekadar terpasang.
- `pointerdown` pada tab navigasi → panggilan berikutnya **tidak** tertahan. Bukti bahwa
  kontrol itu benar-benar dilewati dan `nav` dua nadanya tetap utuh.

## 6. Yang TIDAK diperbaiki di sini, dan alasannya

**Sapaan merek di splash tetap tidak berbunyi pada peluncuran biasa, dan itu memang batas
peramban - bukan bug yang tersisa.**

`playMotif()` dipanggil saat splash tampil, ketika dokumen belum pernah disentuh. Setiap
peramban modern menolak audio di sana. Kode sekarang MENYIAGAKAN motifnya sampai sentuhan
pertama atau sampai tenggatnya lewat - dan pada peluncuran normal tenggatnya lewat lebih dulu,
lalu `cancelPending()` di penutupan splash membuangnya.

Menyiarkannya di sentuhan pertama setelah splash **sudah pernah dicoba dan ditolak OWNER**:
itu persis keluhan m025-84, "sfx sounds muncul belakangan saat user menekan tombol apapun di
menu". Jadi jalan itu tertutup.

Yang tersisa dan berbunyi hari ini: **mengetuk splash memainkan motifnya** - sentuhan itu
membuka audio lewat `bindUnlock()` fase capture, `firePending()` menyusul, dan splash menutup
sesudahnya. Kalau sapaan pembuka harus terdengar pada setiap peluncuran tanpa disentuh, itu
butuh keputusan desain tersendiri (mis. splash yang meminta satu ketukan), bukan perbaikan
kode - dan itu pantas ditanyakan, bukan diputuskan diam-diam.

## 7. Berkas yang relevan

| Berkas | Peran |
|---|---|
| `features/audio/fiezel-ui-sfx.js` | `install()`, `voiceForTarget()`, jeda antarbunyi, sesi audio iOS |
| `app.js` | `installUiSfx()` saat boot; `uiSfx('celebrate')` di akhir sesi |
| `splash-choreography-test.js` | lima gate baru, termasuk "tidak ada suara mati" |
