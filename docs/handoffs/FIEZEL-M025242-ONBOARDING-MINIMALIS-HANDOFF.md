# m025-242 — Panel perkenalan minimalis (tanpa gulir)

Dokumen serah-terima untuk PR #329 (branch `claude/onboarding-panel-simplify-ur2eka`).
Rilis ini meringkas seluruh panel perkenalan supaya muat satu layar tanpa gulir, lalu
menaikkan nomor build ke **m025-242** lewat `tools/bump-build.mjs`.

Kewenangan rilis tetap di **OWNER**. Penegakan koordinasi mengikuti prosedur **MASTER**
di `MASTER-BROADCAST.md`.

---

## 1. Kenapa dokumen ini ada

`A13 Handoff Keeper` memblokir PR ini dengan `handoff_files_changed=0`. Gerbang menandai
perubahan sebagai **major** karena `features/neural-voice/fiezel-diag-panel.js` tersentuh —
di rilis ini isinya **hanya** `DIAG_BUILD`, karena `tools/bump-build.mjs` menulis keempat
penanda build sekaligus. Nol baris logika neural-voice berubah.

Tuntutannya tetap tepat: rilis ini mengubah pintu masuk pertama aplikasi, jadi ia perlu
jejak yang bisa dibaca sesi berikutnya. Preseden sama: `FIEZEL-M025241-PILIHAN-PERAN-KODE-KELAS-HANDOFF.md` §1.

---

## 2. Yang mendarat

Permintaan OWNER: panel perkenalan terlalu panjang ke bawah, harus lebih minimalis.

### 2.1 Langkah nama
- Paragraf "Aku pakai namamu buat nyapa kamu tiap hari…" dilepas dari layar.
- Seluruh kalimat privasi panjang ("Nama ini disimpan di HP kamu dan di akun FIEZEL…")
  dilepas. **Janjinya tidak berubah** — nama tetap ikut ke Core Brain akun murid supaya
  pengingat push bisa menyapa namanya, dan keterangan itu tetap ada di Pengaturan,
  tempat nama bisa diganti. Yang hilang cuma tembok teks di layar pertama.
- Pilihan peran Murid/Guru + kolom kode kelas dari m025-241 **dipertahankan utuh**.

### 2.2 Sapaan maskot
`.fiezel-stage-art` berubah dari kolom ke **baris**: maskot mengecil
(`clamp(78px,23vw,104px)`, sebelumnya `clamp(120px,34vw,148px)`) dan kalimat
"Senang ketemu kamu!…" jadi gelembung kecil di samping kepalanya (12,5px, maks 190px,
ekor gelembung pindah ke sudut kiri-bawah). Ini yang mengembalikan paling banyak ruang
vertikal di SEMUA langkah sekaligus, bukan hanya langkah nama.

### 2.3 Langkah tujuan + level
- Kartu tujuan jadi grid dua kolom dan hanya membawa labelnya; deskripsi per kartu dilepas
  dari markup (data `goalOptions()` tidak disentuh).
- Penjelasan level diringkas jadi judul "Apa level bahasa kamu?" + satu baris
  "Perkiraan aja, bukan hasil tes." Kalimat itu **wajib**: `tests/onboarding-test.js` menuntut
  kata "perkiraan" dan penyangkalan "bukan hasil tes" di langkah ini.

### 2.4 Tes penempatan & pengingat
- Placement: satu catatan singkat, tetap menyebut **25 soal** (dituntut gerbang).
- Pengingat: judul + satu baris; kata **"otomatis"** dipertahankan karena gerbang menuntut
  layar ini jujur bahwa waktunya dipilih ALRS, bukan jadwal manual.

### 2.5 Baseline emas
`id-golden-baseline.json` ditulis ulang dengan `--write-baseline` di commit yang sama —
perubahan literal Indonesia di sini **disengaja**.

---

## 3. Status

| Hal | Status |
| --- | --- |
| Suite lokal (daftar `quality.yml`) | HIJAU |
| `quality` di CI untuk head sebelum merge main | HIJAU |
| Konflik dengan `main` (m025-241) | SUDAH diselesaikan lewat merge commit |
| Build m025-242 di sw.js / core-config.js / diag-panel / BUILD-VERSION.json | selaras |
| Keputusan rilis | **milik OWNER** |

Yang **belum** terbukti: belum ada verifikasi visual di perangkat sungguhan. Klaim
"tanpa gulir" berasal dari aritmetika tinggi elemen, bukan dari screenshot ponsel.

---

## 4. Langkah berikutnya (next)

1. OWNER melihat perkenalan di ponsel sungguhan (390x844 dan layar pendek ~700px) dan
   memastikan enam langkah benar-benar tidak menuntut gulir.
2. Kalau kartu peran + kartu tujuan masih terasa padat di layar terkecil, yang dipangkas
   berikutnya adalah `min-height` kartu peran, bukan teksnya lagi.
3. Roadmap perkenalan selebihnya tidak berubah; tidak ada utang teknis baru dari rilis ini.
