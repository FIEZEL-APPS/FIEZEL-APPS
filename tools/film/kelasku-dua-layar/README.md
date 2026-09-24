# FIEZEL · "Satu Kelas, Dua Layar" — film 3D KelasKu & Dasbor Guru

Film promosi **72 detik**, **1080×1920 (9:16)**, **30 fps**, dirender dari kode
(three.js → Chrome → FFmpeg). Tanpa caption: penjelasan sepenuhnya lewat **VO**, sedangkan
teks di layar hanya yang memang tercetak di panel produk (kalimat asli dari aplikasi), lalu
splash resmi FIEZEL dan lockup **KelasKu untuk Guru** + tombol **Buka Demo Guru**.

Paket ini adalah **file mentah**: kamu yang merender di komputermu. Musik & SFX sudah jadi.
VO dibuat dengan **Gemini TTS** memakai API key-mu sendiri lewat `vo-gemini-kelasku.mjs`.

Naskah lengkap, storyboard, dan alasan setiap shot ada di **NASKAH-STORYBOARD.md**.
Semua waktu (VO, ketukan, musik, SFX) ada di **CUE-SHEET.md**.

---

## 1. Yang perlu dipasang (sekali saja)

| Alat | Untuk | Cara pasang (Windows) |
|---|---|---|
| **Node.js 18+** (disarankan 20/22) | render, VO | https://nodejs.org → versi LTS |
| **Google Chrome** | mesin 3D (WebGL, pakai GPU) | biasanya sudah ada |
| **FFmpeg** | video & mix audio | `winget install Gyan.FFmpeg` lalu buka ulang terminal |
| Python 3.10+ *(opsional)* | hanya bila ingin membangun ulang musik/SFX | https://python.org, lalu `pip install numpy scipy soundfile pyloudnorm` |

Lalu, di folder ini:

```
npm install
```

Ini memasang three.js 0.169, playwright-core, font Plus Jakarta Sans, dan sampel piano
Salamander (dipakai hanya bila membangun ulang musik).

> **Dari repo (bukan dari ZIP)?** Stem audio tidak ikut di-commit karena besar. Bangun sekali:
> `cd audio && python score.py && python sfx.py && python mix.py` (±1 menit). Paket ZIP inti sudah
> menyertakan `audio/stems/bed.flac` dan `audio/mix-tanpa-vo.flac` (cukup untuk VO & render).
> Stem terpisah `music.flac` + `sfx.flac` (untuk remix sendiri) ada di ZIP kedua
> **…-2-stem-musik-sfx.zip** — ekstrak ke folder yang sama.

---

## 2. Langkah cepat

### Windows — cara paling mudah
Klik dua kali **`RENDER-WINDOWS.bat`**. Skrip itu memeriksa Node & FFmpeg, menjalankan
`npm install`, meminta **GEMINI API KEY**, membuat VO, lalu merender film.

### Manual (Windows / Mac / Linux)

```
:: 1) VO (Gemini TTS) — Windows cmd
set GEMINI_API_KEY=isi_api_key_kamu
node vo-gemini-kelasku.mjs

:: 2) Render video (GPU) — otomatis digabung dengan audio di akhir
node render.mjs
```

Mac/Linux: ganti `set` dengan `export GEMINI_API_KEY=...`.

**Hasil akhir:** `out/FIEZEL-KelasKu-Satu-Kelas-Dua-Layar.mp4`
(H.264 High 4.2, CRF 17, BT.709, AAC 320 kbps 48 kHz, faststart, tepat 72,0 dtk).

Urutan boleh dibalik: render dulu, VO belakangan. Setelah keduanya ada, jalankan
`node finish.mjs` untuk menggabungkan ulang.

Tanpa VO? `node render.mjs` saja → `out/FIEZEL-KelasKu-Satu-Kelas-Dua-Layar-musik-saja.mp4`
memakai `audio/mix-tanpa-vo.flac` (−14 LUFS).

---

## 3. Render — detail

- Render berjalan **per potongan 150 frame** (15 potongan, 2160 frame). Tiap potongan diberi
  penanda `.done` di `out/chunks/`. Kalau terputus (listrik, tutup laptop), **jalankan
  perintah yang sama lagi** — ia melanjutkan dari potongan yang belum selesai.
- Tiap frame digambar **6–8 sub-sampel** (motion blur rana 180°, anti-alias, depth of field
  lensa tipis). Di GPU desktop biasanya 0,3–1,5 dtk/frame (±15–50 menit total). Di laptop
  tanpa GPU (SwiftShader) sekitar 5–10 dtk/frame (±3–6 jam).

Variabel lingkungan (semua opsional):

| Variabel | Arti |
|---|---|
| `FZ_QUALITY=2` | sub-sampel ×2 → blur & bokeh lebih halus (dua kali lebih lama). Disarankan bila GPU kuat. |
| `FZ_SAMPLES=12` | paksa jumlah sub-sampel per frame |
| `FZ_DRAFT=1` | pratinjau cepat 1 sub-sampel ke `out/DRAFT-…mp4` (cek timing & VO) |
| `FZ_FROM=0` `FZ_TO=299` | render sebagian frame |
| `FZ_GPU=0` | paksa SwiftShader (bila GPU bermasalah) |
| `FZ_HEADED=1` | tampilkan jendela Chrome (kadang perlu di Windows agar GPU aktif) |
| `CHROME_PATH=...` | pakai Chrome tertentu, mis. `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| `FFMPEG=...` | path ffmpeg bila tidak ada di PATH |

Contoh (Windows cmd): `set FZ_QUALITY=2 && node render.mjs`

**Pratinjau satu frame di browser:** `node serve.mjs`, lalu buka
`http://127.0.0.1:8931/web/index.html?t=30&n=6` (t = detik, n = sub-sampel).

**Still untuk cek:** `node stills.mjs out/stills 6 1.6 28.35 59.2 67.8`

---

## 4. VO — `vo-gemini-kelasku.mjs`

24 baris, bahasa Indonesia sehari-hari, satu berkas per baris. Lihat naskahnya:

```
node vo-gemini-kelasku.mjs --list
```

Yang dilakukan skrip, per baris:
1. Membuat audio dengan Gemini TTS — default **`gemini-3.8-flash-tts`** (model TTS terbaru Google,
   rilis 23 Sep 2026), suara **Gacrux** (hangat & matang). Arahan gaya tiap baris dikirim di
   `speech_metadata.style`. Bila model itu belum aktif untuk API key-mu, skrip **mundur otomatis**
   ke `gemini-3.8-flash-lite-tts` → `gemini-3.1-flash-tts-preview` → `gemini-2.5-flash-preview-tts`
   (format permintaan lama) dan mencetak model yang dipakai. Audio WAV (3.8) maupun PCM mentah
   (model lama) ditangani otomatis.
2. Memangkas hening depan/belakang, HPF 80 Hz, kompresi lembut, **−16 LUFS**.
3. Meletakkan baris **tepat** di detik `at`-nya (lihat CUE-SHEET). Bila kepanjangan untuk
   jendelanya, dipercepat halus (maks **1,15×**); bila masih lebih, baris berikutnya digeser
   sedikit (maks +0,35 dtk). Semua penyesuaian dicetak di layar.
4. Mix: musik+SFX (`audio/stems/bed.flac`) otomatis **turun di bawah suara** (sidechain),
   lalu master **−14 LUFS**, true peak ≤ **−1,5 dBTP**. Hening 62,05–62,40 tetap nol.

Opsi:

| Perintah | Arti |
|---|---|
| `--voice Charon` | ganti suara. Alternatif hangat: `Achird`, `Vindemiatrix`, `Sulafat`, `Charon`, `Schedar` |
| `--only 03,11` | buat ulang baris tertentu saja (baris lain dipakai ulang) |
| `--mix-only` | tidak memanggil API; hanya menempatkan & mix ulang |
| `--mock` | uji seluruh alur tanpa API (VO tiruan berbunyi nada) |
| `--delay 20` | jeda antar-permintaan (detik). Naikkan bila kena batas kuota (429). |
| `--model gemini-3.8-flash-lite-tts` | model TTS lain (lebih hemat); model lama juga bisa, mis. `gemini-2.5-pro-preview-tts` |

**Pelafalan.** Kolom `say` di `web/film.js` (array `VO`) berisi ejaan khusus untuk TTS, mis.
`fiezel titik my titik id` dan `Brein-kor`. Bila pengucapan "FIEZEL", "KelasKu", atau
"Braincore" terdengar aneh, ubah `say`, jalankan `node events.mjs`, lalu
`node vo-gemini-kelasku.mjs --only <nomor>`.

Keluaran VO: `out/vo/raw/NN.wav` (asli), `out/vo/NN.wav` (diproses), `out/vo/timing.json`,
`out/vo-only.wav`, `out/mix-final.wav`.

---

## 5. Mengubah film

Semua gerak dihitung murni dari waktu `t` di **`web/film.js`**:
- `T` — semua titik waktu (dikunci ke 100 BPM: 1 ketuk = 0,6 dtk, 1 bar = 2,4 dtk)
- `VO` — naskah, detik mulai, gaya, ejaan
- `seg(...)` — jalur kamera per shot; `show(...)` — kapan & di mana panel tampil
- **`web/ui.js`** — isi panel (kalimat, warna, tata letak) yang meniru layar asli aplikasi
- **`web/world.js`** — aula, slate murid, monolit, benang cahaya, kapsul
- **`web/splash.js`** — splash resmi (memuat modul asli `brand/fiezel-splash-*.js`) + lockup

Setelah mengubah `T` atau `VO`:

```
node events.mjs                 :: tulis ulang audio/events.json
cd audio
python score.py                 :: musik
python sfx.py                   :: SFX
python mix.py                   :: latar + mix tanpa VO
cd ..
node vo-gemini-kelasku.mjs --mix-only
```

---

## 6. Aturan yang dijaga film ini

- **Tanpa caption / subtitle** (permintaan owner). Penjelasan hanya lewat VO.
- Teks di layar = kalimat asli aplikasi (`copy-id-*.js`, `teacher-shell`, `class-hub`).
  Panel dasbor bertanda **"Data contoh"**; panel Braincore bertanda **"VISUALISASI KONSEP"**.
- Tanpa maskot/PAW, wajah, emoji, confetti, XP, streak, bintang, ✗ merah, mockup ponsel.
- Tanpa kata GRATIS, pasang/instal/unduh, harga, promo, klaim offline, jaminan hasil, CEFR.
  Ajakan satu-satunya: **"Buka Demo Guru di fiezel.my.id"** — tombol yang memang ada di website.
- **Splash resmi tidak diubah**: modul `fiezel-splash-particles.js`,
  `fiezel-splash-equalizer.js`, `fiezel-choreography.js` dimuat apa adanya; palet terkunci
  (#1B1418, #F0C241/#FFD94F, #FFF4DA); tanpa cap PAW, tanpa tagline, tanpa glow.
  Lapisan merek digabung **sesudah** tone map supaya warnanya persis.
- Sonic logo resmi `splash_intro.ogg` hanya diberi gain, tidak diolah.
- Semua acak berseed (mulberry32 di JS, `default_rng(seed)` di Python). Tanpa `Math.random`.

---

## 7. Masalah umum

| Gejala | Solusi |
|---|---|
| `Chrome tidak ditemukan` / gagal meluncur | `set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe` |
| Frame hitam / sangat lambat di Windows | coba `set FZ_HEADED=1`; bila tetap, `set FZ_GPU=0` (lambat tapi pasti) |
| `FFmpeg tidak ditemukan` | `winget install Gyan.FFmpeg`, buka ulang terminal, atau `set FFMPEG=C:\path\ffmpeg.exe` |
| Gemini `429` (kuota) | skrip menunggu & mengulang otomatis; atau `--delay 25`, lalu jalankan lagi (baris yang sudah ada tidak dibuat ulang) |
| VO "MELEBIHI jendela" | pilih suara yang lebih cepat (`--voice Puck`), atau pendekkan kalimat di `VO` |
| Render terputus | jalankan `node render.mjs` lagi — lanjut otomatis |

---

## 8. Kredit & lisensi

- **Musik & SFX:** disintesis orisinal untuk film ini (`audio/*.py`), tanpa loop atau sampel pihak ketiga, kecuali:
- **Piano:** Salamander Grand Piano V3 — **Alexander Holm, CC BY 3.0** (paket npm `@audio-samples/piano-velocity*`). *Kredit ini wajib dicantumkan bila film dipublikasikan dengan deskripsi.*
- **VO:** Gemini TTS (Google), dibuat dengan API key owner.
- **Splash, sonic logo, ikon, wordmark:** milik FIEZEL (`features/brand/`, `assets/brand/`, `assets/audio/sfx/splash_intro.ogg`).
- **Font:** Plus Jakarta Sans (SIL OFL 1.1).
- **Pustaka:** three.js (MIT), Playwright (Apache-2.0).
