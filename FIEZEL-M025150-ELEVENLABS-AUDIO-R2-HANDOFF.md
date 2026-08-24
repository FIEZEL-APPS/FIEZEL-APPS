# FIEZEL m025-150 — Audio ElevenLabs cache-first di atas Cloudflare R2

**Status:** pipeline hidup, 127 aset terproduksi, jatah 2026-08 habis. Bukti fisik oleh OWNER
masih terutang; syaratnya dilepas sebagai WAIVER, bukan bukti.

**Otoritas:** OWNER memutuskan arsitekturnya (mandat V2, penyimpanan Tier A di R2, bukan
Puter). MASTER/OWNER yang memegang wewenang rilis; berkas ini tidak memberi wewenang apa pun.

---

## Keadaan per m025-152

| | |
|---|---|
| Worker | `https://fiezel-audio.fitrajft.workers.dev`, hanya-baca, `writable: false` |
| Bucket R2 | `fiezel-audio` |
| Manifest | v7, **127 aset**, 8,54 MB |
| Listening A1 | 77 dari 78 skrip unik |
| Kosakata | 25 kata + 25 kalimat |
| Jatah 2026-08 | **habis** — 9.482 dari 9.650 karakter |
| Suara | `KuNebS8MGzRaopODTydg` ("Fizell") |

### Tiga jebakan yang sudah ditemukan dan ditutup

Ketiganya sama bentuknya: **aplikasi tampak sehat, aset tampak siap, dan tidak ada satu pun
galat** — tetapi tidak ada suara yang keluar. Ketiganya hanya ketahuan dengan menjalankan
FIEZEL yang sungguhan, bukan dari tes.

1. **Urutan resolver.** `resolve()` menghitung identitas sebelum memuat manifest, padahal
   profil suara ada di dalam manifest. Ia menyerah dengan `no_voice_profile`, dan karena
   menyerah, manifest tidak pernah dimuat — buntu permanen.
2. **Mode pengambilan.** Lapisan cache persisten memakai `no-cors`; respons opaque memberi
   blob 0 byte, jadi object URL selalu kosong. `resolve()` tetap `READY`, `play()` menjawab
   `false`, seluruh katalog jatuh diam-diam ke mesin lama. Diukur: `no-cors` 0 byte, `cors`
   10.075 byte untuk berkas yang sama.
3. **Voice ID yang bergeser.** Mengganti token ElevenLabs ikut mengganti voice ID, dan voice
   ID masuk ke `audioKey`. Dry-run melaporkan `sudah siap: 0` padahal 127 aset ada di R2.
   Satu jalan `--apply` akan memproduksi ulang semuanya dan menelantarkan yang lama.
   Dijaga sekarang oleh `compareVoiceWithManifest()`, yang berjalan lokal tanpa API.

**Pelajaran untuk siapa pun yang melanjutkan:** gate yang membaca kode tidak menangkap satu
pun dari ketiganya. Yang menangkap adalah menjalankan `resolve()` dan `play()` di aplikasi
yang benar-benar disajikan, lalu membaca metriknya.

---

## Rotasi token: alur tetap, bukan kejadian luar biasa

Jatah ElevenLabs habis tiap bulan dan OWNER membuat akun baru — token baru, **voice ID baru**.
Sejak m025-153 ini tidak lagi merusak apa pun.

**Yang perlu dilakukan saat OWNER bilang "sudah create token dan voice ID baru":**

1. OWNER sendiri memperbarui secret `ELEVENLABS_API_KEY` (kunci API tidak pernah lewat chat).
2. Pasang voice ID-nya:
   `gh secret set ELEVENLABS_VOICE_ID --body '<id>'`
   Gunakan `--body`, **jangan pipe** — pipe PowerShell menambahkan baris baru di ujung, dan
   itu pernah merusak `CLOUDFLARE_ACCOUNT_ID` selama satu jam penuh.
3. Jalankan produksi. Tidak ada langkah lain, tidak ada flag khusus.

**Kenapa tidak ada yang perlu diutak-atik:** `audio/manifest.json` menyimpan `voiceProfiles` —
setiap suara yang pernah dipakai, yang terkini di urutan pertama. Resolver mencoba semuanya,
jadi aset yang dibayar bulan-bulan lalu tetap terputar berdampingan dengan yang baru.
Generator melewati teks yang sudah bersuara di profil **mana pun**, jadi pergantian token
tidak pernah membeli ulang yang sudah dimiliki.

OWNER memang menghendaki variasi suara antar-angkatan konten; itu keputusan produk, bukan
efek samping yang perlu dirapikan.

**Suara yang sudah dipakai:**

| Voice ID | Catatan |
|---|---|
| `KuNebS8MGzRaopODTydg` | akun 1, 127 aset — 77 listening A1 + 50 kosakata |
| `hZClfFgpVdl548zhrwyC` | akun 2, mulai dipakai m025-153 |

---

## Apa yang berubah

Memutar audio kini normalnya berarti mengambil berkas yang sudah disetujui. Produksi suara
baru adalah kekecualian yang terjadi **di luar aplikasi**, di GitHub Actions, di belakang
persetujuan manusia.

| Lapisan | Berkas | Peran |
|---|---|---|
| Identitas | `features/audio-assets/fiezel-audio-key.js` | `audioKey` deterministik, SHA-256 sinkron yang identik di browser dan runner |
| Indeks | `features/audio-assets/fiezel-audio-manifest.js` | Satu-satunya sumber jawaban "aset ini boleh diputar" |
| Resolver | `features/audio-assets/fiezel-audio-resolver.js` | Pintu tunggal; tidak punya jalur apa pun menuju ElevenLabs |
| Seam | `features/neural-voice/fiezel-voice-say.js` | Menanyakan aset lebih dulu, mesin runtime hanya untuk yang belum ada |
| Pengantar | `workers/fiezel-audio-worker.js` | Cloudflare Worker hanya-baca di atas binding R2 |
| Produksi | `tools/audio-batch-generate.mjs` | Satu-satunya tempat kredit bisa terpakai |

## Keputusan yang perlu diingat

**`FIEZEL_AUDIO_CONFIG.voiceId` sengaja kosong.** Selama kosong, resolver menjawab setiap
permintaan dengan `ABSENT` dan FIEZEL berbunyi persis seperti sebelum rilis ini. Itu yang
membuat perubahan ini nol-regresi sampai batch pertama berjalan — bukan konfigurasi yang
lupa diisi. Setelah batch pertama, manifest membawa profil suara yang sebenarnya.

**`contentType` tidak ikut dihitung ke `audioKey`.** Ia label penataan, bukan sesuatu yang
terdengar. Memasukkannya mewajibkan setiap pemanggil menebak label yang sama persis dengan
generator — dan tombol pengucapan flashcard sudah membuktikan betapa mudah tebakan itu
meleset.

**Manifest audio tidak boleh cache-first di service worker.** Batch aset mendarat di antara
rilis, sedangkan `SHELL_CACHE` hanya berganti saat `SW_REV` naik. Kalau manifest ikut aturan
shell, setiap kalimat yang baru dibayar terbaca `ABSENT` sampai ada rilis yang tak
berhubungan. Lihat cabang network-first di `sw.js`.

**Phase E belum dikerjakan.** Tumpukan neural lama (`kokoro`/`sherpa`/VITS) masih utuh.
Membuangnya sebelum ada satu pun MP3 berarti aplikasi diam total, dan aturan OWNER melarang
jatuh ke browser TTS.

## Anggaran

Sisa kredit OWNER per 2026-08-24: **9.650 karakter** (paket gratis). `audio/manifest.json`
membatasi **2.000 karakter per run**, jadi satu perintah yang salah tidak bisa menghabiskan
lebih dari seperlima sisa jatah. Naikkan angka itu hanya kalau paket berbayar aktif.

## Bukti mesin

`audio-asset-pipeline-test.js` — 39/39 PASS. Ia menjalankan resolver yang asli di atas
manifest dan fetch tiruan, bukan mencocokkan teks: pertanyaan "berapa kali ElevenLabs
terpanggil kalau seratus orang menekan putar" terletak pada urutan janji yang saling
menunggu, dan itu hanya terlihat saat dijalankan.

Termasuk gate untuk: 100 pemutaran = 1 aset; 100 cache-miss serentak = 0 produksi; pengguna
baru tanpa cache memakai ulang berkas yang sama; produksi sukses tetapi penyimpanan gagal
tidak pernah disajikan; luring tidak pernah mengaku memproduksi; dan tidak ada kunci
ElevenLabs maupun token GitHub di berkas mana pun yang disajikan ke browser.

## Langkah berikutnya

1. **OWNER**: token Cloudflare butuh scope `Workers Scripts:Edit` + `Workers R2
   Storage:Edit` + `Account Settings:Read`. Token R2 ber-scope "Object Read & Write" akan
   ditolak 403 oleh endpoint REST yang dipakai generator.
2. **OWNER**: daftarkan subdomain `workers.dev` sekali di dashboard, kalau belum ada.
3. Jalankan workflow **FIEZEL Audio Worker Deploy** — membuat bucket, deploy Worker, menulis
   `assetBaseUrl` ke manifest. Nol kredit.
4. Jalankan **FIEZEL Audio Assets** dengan `apply` kosong (dry-run), baca rencananya, baru
   ulangi dengan `apply=APPLY`.
5. **Bukti fisik**: OWNER membuka FIEZEL di perangkat, menekan tombol pengucapan sebuah kata
   yang ada di batch, dan mendengar suara ElevenLabs. Setelah itu PR boleh keluar dari draft
   dengan penanda `FIEZEL_PHYSICAL_ACCEPTANCE`.
6. **Setelah aset terkumpul**: Phase E — cabut jalur neural lama, di PR terpisah.
