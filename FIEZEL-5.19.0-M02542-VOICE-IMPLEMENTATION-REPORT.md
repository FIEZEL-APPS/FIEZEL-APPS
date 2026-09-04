# m025-42 — Suara tutor baru: Supertonic 3 bilingual + persona Gen Z

**Status:** terimplementasi penuh di branch `claude/indonesian-voice-natural-27xc9w`.
**Belum di-deploy dan belum dirilis** — menunggu perintah owner. Semua yang perlu untuk
deploy sudah ada di repo; yang tersisa hanya menekan tombolnya (§7) setelah gerbang §6.

Riset yang mendasari: issue #74 (pemilihan engine) dan #75 (persona + gaya bahasa).

---

## 1. Keputusan owner yang diimplementasikan

| Keputusan | Implementasi |
|---|---|
| Pakai `R2-sid5_GENZ-max_S4_pujian` untuk pujian | persona `hype`: sid 5, speed 1.18, pitch 1.05 |
| Pakai `R2-sid2_GENZ-energetic_S2_ajar` untuk penjelasan | persona `ajar`: sid 2, speed 1.12, pitch 1.03 |
| Dua suara, dua pilihan saja | tepat dua persona; pemilihan otomatis per baris, bisa dipaksa lewat `intent` |
| Naskah santai, gaya Gen Z | lapisan `fiezel-genz-script.js` menulis ulang teks **saat diucapkan** |
| Indonesia + Inggris satu engine | satu bundle Supertonic 3 melayani `id` dan `en` |
| Lisensi bebas asal tidak bayar | MIT (kode) + OpenRAIL-M (bobot), gratis, 100% on-device |

## 2. Yang berubah di kode

**Modul baru**
- `features/neural-voice/fiezel-voice-persona.js` — dua persona + aturan pemilihannya + plafon terukur.
- `features/neural-voice/fiezel-genz-script.js` — kamus baku→santai, aturan intensitas (`sangat mudah` → `gampang banget`), dan dua perbaikan pengucapan hasil riset.
- `features/neural-voice/fiezel-supertonic-voice.js` — engine bilingual (satu worker per bahasa, berbagi satu bundle).
- `vendor/supertonic-3/` — runtime WASM + 11 aset model.
- `tools/build-supertonic-wasm.sh` — build ulang bundle dari sumber, reproducible.
- `neural-voice-m02542-persona-test.js` — 22 pemeriksaan regresi.

**Diubah**
- `fiezel-sherpa-vits-adapter.js` — opsi baru `generationLang`, `personas`/`usePersona`, `padBetweenPhrases`, `naturalSpeed`, `generationSteps`. **Jalur Piper lama tidak berubah perilakunya** (diuji eksplisit).
- `fiezel-prosody.js` — penanda Gen Z masuk profil `id`; `contour()` menerima baseline persona dengan batas keras sendiri.
- `fiezel-indonesian-voice.js` — jadi shim tipis di atas engine bilingual; API dan id suara `id_natural` tidak berubah.
- `fiezel-neural-voice-bootstrap.js` — engine Inggris pindah ke bundle baru.
- `app.js` — teks UI diperbaiki (dulu menjanjikan unduhan terpisah yang sudah tidak ada).
- `index.html`, `sw.js`, penanda rilis `SW_REV`/`DIAG_BUILD` → `m025-42`.
- Tiga test kontrak lama diarahkan ke engine aktif; `m02532` ditulis ulang ke kontrak baru.

## 3. Bukti terukur (bukan klaim)

**Kenapa engine lama datar** — model Indonesia lama `id_ID-news_tts-medium` adalah korpus
**pembaca berita**, satu speaker, 22 kHz, tanpa input pitch. Terukur: rentang intonasi
4.9–8.8 semitone, jeda terpanjang tidak pernah melebihi 0.27 detik.

**Engine baru** — rentang intonasi 10.0–12.6 semitone, jeda napas nyata 0.5–0.7 detik,
44.1 kHz, 10 suara. Kejelasan (round-trip ASR) setara: 0.19–0.21 vs 0.23.

**Naskah Gen Z menaikkan ekspresi tanpa menyentuh setelan apa pun** — sid5 naik dari 13.3
ke 14.7–15.2 semitone hanya karena kalimatnya ditulis santai.

**Kalibrasi denoising step** (baru, ditemukan saat implementasi — ini yang menyelamatkan
performa):

| steps | RTF | ASR word error | rentang pitch |
|---|---|---|---|
| 1 | 0.094 | **1.000** | — (rusak) |
| 2 | 0.148 | 0.545 | — (rusak) |
| 3 | 0.198 | 0.273 | — (rusak) |
| **4 (dipakai)** | **0.250** | **0.000** | **18.3 st** |
| 5 (default engine) | 0.331 | 0.000 | 14.1 st |
| 6 | 0.364 | 0.000 | 12.6 st |
| 8 | 0.486 | 0.000 | 8.7 st |

4 langkah **lebih cepat sekaligus lebih ekspresif** dari default. Di bawah 4 adalah jurang,
bukan tombol — jangan pernah diturunkan untuk mengejar kecepatan.

**Verifikasi bundle yang benar-benar dikirim** — file `.wasm`/`.js` yang ada di
`vendor/supertonic-3/` dimuat di luar browser, tujuh file model ditulis ke MEMFS persis
seperti yang dilakukan worker, lalu tiga kalimat disintesis: 10 speaker terbaca, 44.1 kHz,
audio finite, dua bahasa jalan.

## 4. Kendala nyata yang harus diputuskan sebelum deploy

**4.1 Kecepatan.** Di WASM (kontainer x86, satu thread, CPU berbagi) RTF stabil di
**0.97–0.99** dengan 4 langkah (default 5 langkah: 1.16–1.19). Ini **di sekitar realtime** —
artinya satu kalimat 4 detik butuh ~4 detik untuk dibuat. Engine Piper yang diganti terukur
0.347 di Safari 26 arm64. **Ini risiko utama dan hanya bisa dijawab dengan pengukuran di
iPhone.** Kalau ternyata terlalu lambat, tiga langkah lanjutannya, berurutan dari yang paling
murah: (a) putar frasa pertama sambil frasa berikutnya dibuat (arsitektur sudah
prefetch antar-chunk, belum antar-frasa), (b) cache audio per baris tutor, (c) turunkan ke
model yang lebih kecil. Saya sengaja **tidak** mengubah pipeline audio sekarang karena
risikonya tinggi menjelang rilis.

**4.2 Ukuran.** Bundle baru 158.9 MB menggantikan dua bundle 204.7 MB → **hemat 45.8 MB**.
File terbesar 78.4 MB, jadi semuanya di bawah batas 100 MB per file. Ini sebabnya model
tidak dipaketkan jadi satu `.data` 145 MB (lihat `tools/build-supertonic-wasm.sh`).

**4.3 Naskah lama.** Materi di `classroom-lessons-v1.json` masih berbahasa baku. Lapisan
`fiezel-genz-script.js` mengubahnya **saat diucapkan**, jadi tidak ada migrasi konten yang
tertunda — tapi subtitle tertulis tetap baku. Kalau owner mau teks di layar ikut santai,
itu pekerjaan konten terpisah.

**4.4 Bundle lama masih di repo.** `vendor/sherpa-vits/` dan `vendor/sherpa-vits-id/`
sengaja belum dihapus sebagai jalur rollback. Hapus setelah gerbang device lolos.

**4.5 Test yang sudah merah sebelum pekerjaan ini.**
`neural-voice-m02520-webgpu-acceleration-test.js` gagal juga di commit sebelum perubahan
saya (diverifikasi dengan stash). Terkait jalur Kokoro/WebGPU yang sudah pensiun, di luar
cakupan m025-42, dan saya tidak menyentuhnya.

## 5. Hasil test

Seluruh 65 suite dijalankan: **64 lulus**, 1 gagal — yaitu m02520 di §4.5 yang memang sudah
merah sebelumnya. Termasuk yang lulus: suite persona baru (22 pemeriksaan), kontrak bilingual,
prosodi, single-flight, audibility, timeout, cache integrity, PWA coherence, tutor regression.

## 6. Gerbang sebelum rilis (belum ada yang boleh dilewati diam-diam)

- [ ] **G1 telinga owner** — dengar tiga sampel dari bundle final; nyatakan lebih natural.
- [ ] **G3 kecepatan device** — RTF di iPhone standalone; putuskan lanjut atau ambil §4.1.
- [ ] **G4 stabilitas device** — 20 generasi beruntun tanpa content-process kill.
- [ ] **G5 offline** — reload kedua tanpa jaringan tetap bersuara.
- [ ] **G6 tanpa regresi** — Classroom, Listening, Speaking normal.
- [ ] **G11 anti-bosan** — 8 varian sapaan + 8 varian pujian sudah ada di kode; cek terasa bervariasi.

G7 (lisensi) **lulus**: gratis, MIT + OpenRAIL-M, tercatat di `THIRD-PARTY-LICENSES.md`.

## 7. Cara deploy saat owner memberi perintah

1. `git checkout claude/indonesian-voice-natural-27xc9w` (sudah ter-push).
2. Merge ke `main` lewat PR — belum saya buatkan; bilang saja kalau mau.
3. GitHub Pages menyajikan `vendor/supertonic-3/` apa adanya; tidak ada langkah build saat deploy.
4. `SW_REV` sudah dinaikkan ke `m025-42-...`, jadi shell lama tergantikan; aset neural tidak ikut ter-evict karena `isNeuralAsset` sudah mengenali path baru.
5. Setelah live: buka Skills Lab → "Siapkan suara offline" (sekali, ±159 MB) → uji Classroom.

Rollback: kembalikan `basePath` di `fiezel-neural-voice-bootstrap.js` ke `vendor/sherpa-vits/`
dan `fiezel-indonesian-voice.js` ke commit sebelumnya; kedua bundle lama masih ada di repo.
