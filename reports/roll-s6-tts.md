# S6 — TTS klien: Cloudflare sebagai lapisan suara BARU

Cabang `roll/s6tts`. Tidak ada bump versi build (`FIEZEL_PAGE_BUILD` tetap `m025-172`,
`SW_REV` tidak disentuh). Tidak dipush.

## 1. Yang dikerjakan

Satu lapisan suara baru disisipkan ke tangga yang sudah terbukti, dan hanya bisa hidup lewat
satu flag. Berkas:

| Berkas | Status | Isi |
| --- | --- | --- |
| `features/neural-voice/fiezel-cf-tts-transport.js` | BARU | seluruh pengetahuan CF: mode flag, badan permintaan ber-allowlist, cache Cache API klien, penolakan URL jembatan, memo 429, metrik |
| `features/neural-voice/fiezel-cf-voice-notice.js` | BARU | peta `copyKey → naskah`, dua varian per keadaan (ada suara / tidak ada suara sama sekali) |
| `features/neural-voice/fiezel-voice-say.js` | DIUBAH | dua titik sisip (`cfCachedFirst`, `afterAssets`) + satu di prefetch (`prefetchAfterAssets`) |
| `tts-transport-switch-test.js` | BARU | gerbang node murni, 31 assert |
| `index.html`, `sw.js` | DIUBAH | dua modul baru masuk grup malas `voice` dan daftar precache `ASSETS` |
| `.github/workflows/quality.yml` | DIUBAH | gerbang baru didaftarkan sesudah `voice-callsite-prefetch-test.js` |

**Tidak disentuh sama sekali:** `fiezel-web-audio-player.js`, `fiezel-prosody.js`,
`fiezel-neural-voice.js`. Gerbang memeriksanya dua kali: lapisan CF tidak menyebut satu pun
global mereka, dan `git diff HEAD` untuk ketiga berkas itu harus kosong.

## 2. Tangga

Flag `FIEZEL_CF_CONFIG.endpoints.tts` = **'on'** (dan `enabled:true` + `base` terisi):

```
C0  cache Cache API klien        -> alamat R2 yang pernah berhasil, nol jaringan
L1  manifest aset R2 (existing)  -> tidak diubah
C1  POST /api/tts/render         -> BARU
L2  Puter                        -> tidak diubah
L3  neural lokal (hanya prepared)-> tidak diubah, pagar 152 MB utuh
L4  speechSynthesis              -> tidak diubah
L5  teks saja                    -> tidak diubah
```

Flag **'off'** (keadaan hari ini, dan bawaan di `core-config.js`): `cfEnabled()` false,
`afterAssets()` meneruskan langsung ke `speakWithEngine()`, `prefetchAfterAssets()` meneruskan
langsung ke `prefetchWithEngine()`. Nol permintaan jaringan tambahan, nol Cache API dibuka,
nol perubahan perilaku. Itu butir (a) gerbang.

Posisi C1 sesudah L1 dan sebelum L2 disengaja: aset yang sudah dibayar tetap gratis dan tidak
pernah memicu render, sedangkan kredit pihak ketiga (Puter) baru dipakai sesudah jalur milik
sendiri gagal.

**'shadow' diperlakukan sebagai 'off' di jalur suara.** Mode shadow di `app.js` mengirim
salinan lalu MEMBUANG hasilnya. Untuk JSON kecil itu murah; untuk render TTS itu berarti
membayar produksi audio yang tidak pernah didengar siapa pun. Nilai flag asing juga jatuh ke
'off' — flag yang tidak dikenali harus berarti aman.

## 3. Empat aturan keras dan cara menegakkannya

**Kunci cache dihitung ulang di server.** Klien mengirim `{text, locale, contentType,
voiceId}` (+ `settings` ber-allowlist `bitRate`/`container`/`sampleRate`) dan tidak pernah
`audioKey`/`key`/`cacheKey`/`objectName`/`hash`. Badan dibangun dari NOL di `renderBody()`,
bukan disalin lalu dibersihkan — pola salin-lalu-`delete` selalu bocor pada field berikutnya.
`bodyIsClean()` menolak badan yang menyeleweng alih-alih memperbaikinya diam-diam. Server
menjawab 400 `key_mismatch` untuk kunci yang tidak cocok (`route-tts.js`), jadi mengirim kunci
bukan sekadar tidak sopan, ia langsung gagal.

`engineId` dan `engineVersion` juga TIDAK dikirim. Versi mesin adalah bagian identitas kunci
(`tts-key.js`), dan klien yang boleh memilihnya bisa memaksa produksi ulang seluruh katalog.

**`speed` tidak pernah masuk badan permintaan.** Kecepatan diterapkan di pemutaran
(`playUrl(url, {speed})` → `playbackRate`). `FORBIDDEN_FIELDS` mencerminkan `PLAYBACK_ONLY` di
`tts-key.js` dan mencakup `speed, rate, playbackRate, pitch, volume, gain`, termasuk yang
diselipkan di dalam `settings`. Ini bug bayar-ulang cf-a5 yang sudah ditutup di server (satu
kalimat dibayar tiga kali untuk tiga langkah kecepatan); larangan ditegakkan di dua sisi karena
satu sisi tidak cukup untuk mencegahnya terlihat "tidak berlaku" pada log.

**Cache hit benar-benar gratis.** URL objek R2 diputar langsung dari `AUDIO_PUBLIC_BASE`
(`wrangler.toml` = `https://audio.fiezel.my.id`), bukan lewat jembatan PHP origin
(`deploy/edge/api-index.php`). `playableUrl()` menolak: bukan absolut https, satu asal dengan
aplikasi, path memuat `/api/` atau `.php`, atau berada di luar basis audio yang diketahui.
URL yang ditolak berarti tangga TURUN, bukan memutar sesuatu yang meragukan.

Urutan pembacaan basis audio: `FIEZEL_CF_CONFIG.audioBase` → nilai dari `/api/config` lewat
`setConfig()` → `FiezelAudioManifest.status().assetBaseUrl` (konstanta manifest yang HARI INI
sudah dipakai resolver). Catatan jujur: `GET /api/config` versi sekarang
(`workers/api/route-config.js`, protokol 1.7) TIDAK mengirim basis audio sama sekali, jadi
sampai field itu ditambahkan, jalur nyata adalah flag atau manifest. `setConfig()` sudah siap
menerimanya tanpa perubahan klien lain.

**429 terasa jujur.** Kuota habis → `descend()`: turun ke L2/L3/L4 dulu, lalu naskah dipilih
SESUDAH tahu hasilnya. `spoken:true` → "Aku pakai suara perangkat dulu…". `spoken:false` →
varian jujur yang menyebut audionya belum bisa dibunyikan, teksnya tetap bisa dibaca, dan
jatahnya kembali (label jam dibaca dari `resetAt` server, bukan dihitung dari jam perangkat).
Memutuskan naskah sebelum tahu hasilnya adalah cara termudah menampilkan "pakai suara
perangkat" kepada murid yang sedang tidak mendengar apa pun.

Pemberitahuan tidak menyentuh state pelajaran: `locksItem:false`, `countsReplay:false`,
`severity:'advisory'`, tidak menonaktifkan tombol, tidak menulis progres. Itu bug m025-170 yang
baru diperbaiki di addon listening, dan gerbang memeriksanya pada objek yang benar-benar
dipancarkan.

Memo 429 mematikan seluruh jalur CF untuk sisa sesi (pola yang sama dengan
`creditStatus().outOfCredit` milik Puter). Tanpa itu setiap kalimat berikutnya membayar satu
permintaan sia-sia dan murid menunggu timeout sebelum mendengar suara cadangan.

## 4. Prefetch

`prefetchWithCloudflare()` disisipkan di antara prefetch aset dan Puter, memakai C0 lebih dulu.
Tidak ada `prepare()`, `ensureReady()`, atau `prewarm()` — jalur CF adalah panggilan HTTP, jadi
ia tidak bisa memicu unduhan model 152 MB. Prefetch juga tidak pernah memunculkan
pemberitahuan: murid tidak menekan apa pun untuk memicunya. `PREFETCH_MAX_INFLIGHT=2` dan
dedup `prefetchKey()` tidak diubah.

**Batas yang tidak ditutupi:** render untuk kalimat yang BELUM ada di R2 bisa memakai kuota
untuk kalimat yang mungkin tidak pernah didengar. Tiga hal meredamnya, dan ketiganya bisa
diperiksa: C0 dibaca lebih dulu; cache hit di server tidak menyentuh kuota sama sekali
(`route-tts.js` menjawab di langkah 2, sebelum langkah kuota di 4), sehingga korpus pra-render
gratis; dan memo 429 mematikan jalur CF sesudah penolakan pertama. Kalau biaya spekulatif ini
kelak terukur terlalu mahal, yang dimatikan adalah cabang prefetch — bukan `render()`, bukan
tangga bicaranya.

Satu ketergantungan operasional yang harus disebut: `voiceId` bawaan klien adalah
`aura-asteria-en`, sama dengan `tools/prerender-tts.mjs`. Kalau nilai itu berbeda, kunci server
berbeda dan SELURUH korpus yang sudah dibayar dianggap belum ada — setiap kalimat akan
diproduksi ulang. Jangan mengubahnya tanpa mengubah pra-render.

## 5. Gerbang

`tts-transport-switch-test.js` — node murni, `vm`, sumber produksi asli dijalankan dengan
jaringan/Cache API/mesin suara tiruan. **31 pass, 0 fail.** Cakupan: (a) 'off' nol permintaan +
tangga utuh; (b) urutan 'on' dan posisi sisipan; (c) tidak ada kunci cache di badan; (d) tidak
ada `speed` di badan, dan `speed` tetap ada di pemutaran; (e) cache hit dari URL R2 langsung,
URL jembatan ditolak, C0 nol permintaan; (f) 429 turun, naskah jujur, tidak mengunci, satu
permintaan saja per sesi; (g) prefetch lewat CF tanpa `prepare()`/`ensureReady()`.

Didaftarkan di `.github/workflows/quality.yml`.

Verifikasi penuh, semuanya exit 0:

```
tts-transport-switch-test.js  voice-fallback-chain-test.js  voice-prefetch-neural-test.js
voice-pipeline-gap-test.js    voice-offline-fallback-test.js tts-key-test.js
speaking-listening-test.js    listening-exam-test.js         regression-test.js
install-health-test.js
```

Tambahan yang ikut diperiksa karena `index.html`/`sw.js` disentuh: `boot-order-test.js`,
`pwa-cache-test.js`, `gems-test.js`, `remote-push-test.js`, `content-integrity-audit.js`,
`voice-callsite-prefetch-test.js` — semuanya exit 0. Seluruh `*-REPORT.json` yang tersentuh
saat menjalankan tes sudah dipulihkan (`git checkout -- '*-REPORT.json'`); yang baru hanya
`TTS-TRANSPORT-SWITCH-REPORT.json`.

## 6. Sumber — dan yang TIDAK ada

Brief S6 menunjuk `reports/cf-b4-ai-tts.md` §2 dan `reports/cf-b8-ux-quota.md`. **Keduanya
tidak ada di cabang ini.** Tidak ada yang dikarang untuk menutupi itu; yang dipakai adalah
kontrak yang benar-benar bisa dibaca di repo:

- alur 5 langkah render, bentuk respons, POLITE message, breaker, mesin:
  `workers/api/tts/route-tts.js`, plus `reports/exec-e5-ai-tts.md`;
- aturan kunci v2, allowlist `settings`, pengecualian `speed`: `workers/api/tts/tts-key.js`;
- `AUDIO_PUBLIC_BASE` dan alasan cache hit tidak diproksi: `workers/api/wrangler.toml`;
- kontrak kuota dan `copyKey` (server kirim kode, klien punya kalimat):
  `workers/api/quota/route-quota.js`, `reports/exec-e3-quota.md`;
- nada naskah keadaan tanpa suara: `noteNoAudio()` di
  `features/speaking-listening/fiezel-speaking-listening-addon.js`;
- tangga prefetch, pagar 152 MB, dedup: `reports/voice-v5-prefetch.md`.

Naskah kuota karena itu **derivatif, bukan final**. Kalau `cf-b8` kelak mendarat dengan kalimat
resmi, yang berubah hanya peta `COPY` di `fiezel-cf-voice-notice.js` — bukan logika tangga,
bukan transport. `features/quota/quota-copy.js` yang disebut di beberapa komentar juga belum
ada; kalau modul itu dibuat, peta di sini yang harus dipindahkan ke sana, bukan digandakan.
