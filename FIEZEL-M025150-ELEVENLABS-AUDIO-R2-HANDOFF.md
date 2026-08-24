# FIEZEL m025-150 — Audio ElevenLabs cache-first di atas Cloudflare R2

**Status:** implementasi selesai, bukti fisik BELUM ada. PR #204 sengaja ditahan sebagai
draft sampai OWNER benar-benar mendengar audionya di perangkat.

**Otoritas:** OWNER memutuskan arsitekturnya (mandat V2, penyimpanan Tier A di R2, bukan
Puter). MASTER/OWNER yang memegang wewenang rilis; berkas ini tidak memberi wewenang apa pun.

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
