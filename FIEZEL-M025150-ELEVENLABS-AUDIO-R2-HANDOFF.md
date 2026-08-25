# FIEZEL — Audio ElevenLabs di atas Cloudflare R2

**Untuk agen berikutnya.** Berkas ini ditulis supaya kamu tidak perlu menemukan ulang apa pun
di bawah ini. Baca bagian *Jebakan* sebelum menyentuh kode — empat kegagalan terparah di jalur
ini semuanya **tidak menampakkan galat apa pun**, dan tidak satu pun tertangkap oleh tes yang
membaca kode.

**Status:** hidup dan berproduksi. 541 aset, 51,4 MB di R2.
**Otoritas:** OWNER memutuskan arsitektur dan konten. Berkas ini tidak memberi wewenang rilis.

---

## 1. Apa yang dibangun

Mandat OWNER (`FIEZEL_ElevenLabs_Audio_Architecture_Mandate_V2.pdf`): memutar audio harus
normalnya berarti mengambil berkas yang sudah disetujui. **Produksi suara baru adalah
kekecualian yang terjadi di luar aplikasi.** Menekan tombol putar tidak pernah menghabiskan
kredit — bukan karena disiplin, melainkan karena kode sisi klien memang tidak punya cara
melakukannya.

```
Aplikasi → resolver → audioKey → manifest → URL R2 → putar
                                     ↓ tidak ada
                                  ABSENT (mesin lama bicara)

Produksi: GitHub Actions → ElevenLabs → validasi → R2 → manifest → commit
```

## 2. Berkas dan perannya

| Berkas | Peran |
|---|---|
| `features/audio-assets/fiezel-audio-key.js` | `audioKey` deterministik. SHA-256 ditulis sendiri, sinkron, identik di browser dan runner. |
| `features/audio-assets/fiezel-audio-manifest.js` | Indeks resmi. Satu-satunya sumber jawaban "boleh diputar". |
| `features/audio-assets/fiezel-audio-resolver.js` | Pintu tunggal + pemutar + cache persisten. |
| `features/neural-voice/fiezel-voice-say.js` | Seam yang dipakai seluruh aplikasi. Aset didahulukan, mesin lama menyusul. |
| `workers/fiezel-audio-worker.js` | Cloudflare Worker hanya-baca di atas binding R2. |
| `tools/audio-batch-generate.mjs` | **Satu-satunya tempat kredit bisa terpakai.** |
| `audio/manifest.json` | Indeks + profil suara + anggaran. Biner TIDAK di sini. |
| `audio-asset-pipeline-test.js` | 52 gate. Menjalankan modul asli, bukan mencocokkan teks. |

Workflow: `audio-deploy-worker.yml` (deploy Worker + bucket) dan `audio-generate.yml`
(produksi). Keduanya `workflow_dispatch` saja — ketiadaan pemicu otomatis **adalah** bentuk
persetujuan manusia yang diminta mandat.

## 3. Keadaan sekarang

Manifest **v42**, `assetBaseUrl` `https://fiezel-audio.fitrajft.workers.dev`.

| Jenis | Siap | Sisa |
|---|---|---|
| audiobook (`book`) | **219** | 0 — tuntas |
| listening | 857 butir / 273 aset | 174 skrip (B1 ke atas) |
| kosakata (`word` + `sentence`) | 50 | 3.480 |
| reading (`passage`) | 0 | 300 |

Tujuh profil suara terdaftar; enam punya aset. Katalog memang bersuara macam-macam — OWNER
menghendakinya.

## 4. Prosedur: OWNER bilang "sudah create token dan voice ID baru"

Ini **rutin**, terjadi tiap bulan saat jatah gratis habis. Langsung kerjakan, tanpa bertanya.

1. OWNER memperbarui `ELEVENLABS_API_KEY` sendiri. **Jangan pernah menerima kunci API lewat
   chat.** Kunci yang sah diawali `sk_`; ID kunci bukan kunci (pernah tertukar, satu ronde
   terbuang).
2. Voice ID bukan rahasia — minta lewat chat, lalu:
   `gh secret set ELEVENLABS_VOICE_ID --body '<id>'`
   **Pakai `--body`, jangan pipe.** Pipe PowerShell menambahkan baris baru; itu merusak
   `CLOUDFLARE_ACCOUNT_ID` dan menghabiskan satu jam untuk didiagnosis.
3. Suara harus **premade**, bukan dari Voice Library. Akun gratis ditolak `402
   paid_plan_required` untuk suara library.
4. Jalankan produksi. Tidak ada flag khusus, tidak ada yang perlu diutak-atik.

```
gh workflow run audio-generate.yml --ref main -f content=listening -f limit=400 -f apply=APPLY
```

Ulangi sampai berhenti dengan pesan kuota. Skrip pembantu ada di scratchpad sesi, tetapi
perintah di atas sudah cukup.

**Kenapa aman:** manifest menyimpan `voiceProfiles` — setiap suara yang pernah dipakai,
terkini di urutan pertama. Resolver mencoba semuanya, jadi aset bulan-bulan lalu tetap
terputar. Generator melewati teks yang sudah bersuara di profil **mana pun**, jadi pergantian
token tidak pernah membeli ulang yang sudah dimiliki.

## 5. Jebakan — baca ini

Empat kegagalan, semuanya berbentuk sama: **aplikasi tampak sehat, aset tampak siap, tidak ada
galat, dan tidak ada suara.** Semua lolos dari 39 gate yang ada saat itu.

1. **Urutan resolver.** `resolve()` menghitung identitas sebelum memuat manifest, padahal
   profil suara ada *di dalam* manifest. Ia menyerah dengan `no_voice_profile`, dan karena
   menyerah, manifest tidak pernah dimuat. Buntu permanen.
2. **`mode: 'no-cors'`.** Respons opaque → `.blob()` memberi **0 byte** → object URL null →
   `play()` false. Terukur: no-cors 0 byte, cors 10.075 byte untuk berkas yang sama. Worker
   menyajikan `access-control-allow-origin: *`, jadi CORS memang jalur yang benar.
3. **206 untuk semua permintaan.** R2 mengisi `object.range` bahkan pada pengambilan penuh.
   Cache API **menolak menyimpan 206**, jadi seluruh cache klien mati diam-diam.
4. **Voice ID yang bergeser.** Ikut dihitung ke `audioKey`; ganti token, seluruh katalog
   berhenti ditemukan. Dijawab `voiceProfiles` (bagian 4).

**Cara memeriksa yang benar-benar bekerja:** buka aplikasi yang sudah ter-deploy, jalankan
`resolve()` lalu `play()` dari modul asli, dan baca `status().metrics`. Yang menjawab jujur:
`plays`, `playFailures`, `persistentCacheStores`, `clientGenerations`.

Hati-hati saat menguji berturut-turut: `stop()` menyelesaikan elemen sebelumnya sebagai
kegagalan, sehingga terlihat seperti bug "putaran pertama gagal" yang sebenarnya tidak ada.
Muat ulang halaman di antara pengukuran.

## 6. Keputusan rancangan, beserta alasannya

**`contentType` TIDAK ikut dihitung ke `audioKey`.** Ia label penataan, bukan sesuatu yang
terdengar. Memasukkannya mewajibkan setiap pemanggil menebak label yang sama persis dengan
generator — dan tombol pengucapan flashcard sudah membuktikan betapa mudah tebakan itu
meleset: ia mengirim `sentence` untuk sebuah kata, lalu tidak menemukan MP3 yang sudah dibayar.

**Yang ikut dihitung:** teks kanonik, locale, voiceId, modelId, dan setelan suara. Normalisasi
membuang spasi ganda, zero-width, nbsp, dan menyeragamkan NFC — tetapi **mempertahankan huruf
besar dan tanda baca**, karena ketiganya mengubah intonasi.

**Dry-run adalah bawaan.** Produksi butuh `--apply`, dan workflow butuh input `apply=APPLY`.

**Anggaran 2.000 karakter per run** (`audio/manifest.json`). Bukan angka keramat: ia membatasi
kerusakan satu perintah yang salah pada jatah gratis 10.000.

**Konten diurutkan menurut level CEFR.** Anggaran selalu terpotong di tengah daftar, jadi yang
menentukan bukan berapa banyak melainkan **yang mana**. Level yang setengah bersuara lebih
buruk daripada level yang belum disentuh — murid bertemu butir yang diam di tengah latihan.

**Aset tidak pernah ditandai siap sebelum terbukti ada:** hasilkan → validasi MP3 → unggah ke
R2 → **ambil ulang dari R2** → baru catat di manifest. Balasan 200 dari ElevenLabs bukan bukti;
halaman galat HTML datang sebagai 200 juga.

**R2 diperiksa sebelum memanggil ElevenLabs.** Batch yang terputus setelah unggah berhasil
tetapi sebelum manifest tersimpan akan dipulihkan gratis — sudah terjadi sekali, 56 aset
kembali tanpa biaya.

## 7. Aturan konten: hak cipta

Perpustakaan (`features/library/library-books-v1.json`) berisi sembilan buku. Delapan adalah
retelling FIEZEL dan sudah diproduksi. **`the_little_prince` dikecualikan dari registry.**

Field `source`-nya mengaku retelling FIEZEL, tetapi isinya terjemahan Katherine Woods 1943
kata per kata — 1.484 kalimat, 93.018 karakter, enam puluh kali lipat entri lain, lengkap
dengan halaman judul penerjemahnya. Terjemahan itu masih berhak cipta.

Tiga entri lain (Charlotte's Web, The Giving Tree, Matilda) menunjukkan pola yang benar: label
tegas bahwa teks asli tidak direproduksi, lalu retelling pendek.

Gate `audio-asset-pipeline-test.js` **menjalankan registry** dan membandingkan jumlah kalimat
yang dipancarkan (219) dengan jumlah kalimat delapan buku. Gate lain membandingkan ukuran entri
itu dengan retelling terbesar — jadi **begitu teksnya benar-benar diganti retelling, gate itu
sendiri yang menyala** dan memberi tahu bahwa pengecualiannya boleh dicabut. OWNER memutuskan
belum menulis retelling-nya (2026-08-24).

## 8. Lingkungan: hal yang akan menggigit

**Jangan menyunting berkas repo lewat `Get-Content -Raw` + `Set-Content`.** PowerShell
mendekode sebagai CP1252 dan merusak seluruh teks Indonesia beserta `— · … ↑`. Pakai Edit/Write,
atau `[Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($p))` +
`[IO.File]::WriteAllBytes($p, [Text.UTF8Encoding]::new($false).GetBytes($s))`.
Setelah menyunting, pindai dengan `Â|â€|â†|Ã[-¿]`.

Pernah terjadi: dua panah di `fiezel-diag-panel.js` rusak, `diag-search-test.js` mencari tombol
lewat kecocokan teks persis, gagal — dan karena langkah CI berjalan dengan `bash -e`, satu
kegagalan itu membuat **tiga gate berbeda** merah dari sebab yang tak terlihat.

**`gh`:** kosongkan `GH_TOKEN` lebih dulu (`if (Test-Path Env:GH_TOKEN) { Remove-Item
Env:GH_TOKEN }`). Token ambient adalah PAT tanpa izin; auth keyring yang berfungsi.

**Gate A12** menolak setiap PR yang menyentuh berkas audio/voice kecuali badan PR memuat baris
`<!-- FIEZEL_PHYSICAL_ACCEPTANCE: WAIVED_BY_OWNER -->` atau PR berstatus draft. **Gate A13**
menuntut berkas `*HANDOFF.md` ikut berubah untuk setiap perubahan di `features/neural-voice/`.

**Penanda build** (`core-config.js`, `fiezel-diag-panel.js`, `sw.js`) wajib naik tepat +1
bersama-sama untuk setiap perubahan pada berkas yang ikut di-precache shell — termasuk
`fiezel-audio-*.js`. Tanpa itu perangkat yang sudah terpasang terus memakai salinan lama.

**Gate yang memindai teks sumber akan menghukum komentar yang menjelaskan hal yang dilarang.**
Sudah terjadi dua kali. Buang komentar sebelum memindai, atau lebih baik: periksa perilaku,
bukan teks.

## 9. Berikutnya

Urutan yang disarankan, termurah dan paling terpakai lebih dulu:

1. **Kosakata — kata saja** (1.740 item, ~13.500 karakter). ~7,7 karakter per item, unit
   pedagogis termurah di repo; murid menekan tombol pengucapan flashcard terus-menerus.
2. **Listening B1 ke atas** (174 skrip). A1 dan A2 sudah tuntas.
3. **Kalimat contoh kosakata** (~74.000 karakter).
4. **Reading** (300 bacaan, ~117.000 karakter) — paling mahal, paling tidak bergantung audio.

Yang belum ada dan mungkin berguna: pembacaan sisa kuota di awal/akhir tiap batch
([PR #215](https://github.com/FIEZEL-APPS/FIEZEL-APPS/pull/215), belum ditinjau), dan
pembuangan tumpukan neural lama (Phase E mandat) — yang terakhir hanya masuk akal setelah
cakupan audio jauh lebih luas, karena aturan OWNER melarang jatuh ke browser TTS.
