# A4 — Pemindai rahasia: `secret-scan-test.js`

Branch `add/a4secret`, worktree `/home/user/workspace/wt-a4secret`.
**Tidak ada bump versi build. Tidak ada push.** Semua gerbang verifikasi exit 0 (§7).

---

## 1. Kenapa gerbang ini ada

Repo publik terkait (`FIEZEL-APPS/api-`, berkas `api.md`) pernah memuat **lima API key
mentah**. Owner sudah menanganinya. Yang belum tertangani adalah **permukaan barunya**,
dan permukaan itu bertambah justru karena pekerjaan yang benar:

| Permukaan | Kenapa berbahaya |
|---|---|
| `deploy/edge/api-index.php` | Memuat placeholder `__EDGE_SECRET__` yang **diganti nilai sungguhan saat pemasangan** di origin ArenHost. Satu `scp` balik berkas hasil edit ke repo = secret jembatan edge (`X-Fiezel-Edge`) bocor permanen ke riwayat git. |
| `workers/api/wrangler.toml`, `workers/owner/wrangler.toml` | Memuat **daftar nama** secret (`wrangler secret put SESSION_HMAC_KEY_CURRENT`, `… EDGE_SHARED_SECRET`, dst). Nama tidak berbahaya; satu orang yang "melengkapi" daftar itu dengan nilainya membuatnya berbahaya. |
| 690 berkas teks terlacak lainnya | `edge-guard-test.js` hanya menjaga **satu** berkas. Kebocoran tidak memilih berkas yang sudah dijaga. |

Gerbang ini menjaga **seluruh** berkas yang dilacak git: node murni, nol dependency, nol
jaringan, satu-satunya berkas yang ditulisnya adalah `SECRET-SCAN-REPORT.json`.

## 2. Pola yang dideteksi

Dua kelas, dan pembedaannya bukan kosmetik — kelas KERAS tidak bisa dimatikan allowlist
(§3).

| id | Kelas | Pola | Kenapa |
|---|---|---|---|
| `openaiKey` | keras | `sk-…` (juga `sk-proj-`, `sk-ant-`) | Bentuk yang benar-benar pernah bocor di repo terkait. |
| `stripeKey` | keras | `pk_/sk_/rk_` + `live/test/prod` | `sk_live_` = memindahkan uang. |
| `githubToken` | keras | `ghp_/gho_/ghu_/ghs_/ghr_` | Auto-deploy dari `main` tiap 5 menit ⇒ token tulis = kendali produksi. |
| `cloudflareToken` | keras | `cfut_` | Worker + D1 + KV + R2 + DNS dalam satu token. |
| `googleApiKey` | keras | `AIza…` | Prefiks unik, tidak pernah muncul sebagai teks biasa. |
| `jwt` | keras | `eyJ….….…` tiga bagian | `eyJ` = `{"` ter-base64url; JWT ter-commit berlaku sampai kedaluwarsa. |
| `pemPrivateKey` | keras | blok `BEGIN … PRIVATE KEY` | Tidak ada alasan sah bagi aplikasi murid memuat kunci privat. |
| `bcryptHash` | keras | `$2a/2b/2x/2y$NN$…` (53 char) | Bisa diserang offline tanpa batas laju. |
| `base64urlToken` | heuristik | ≥32 char base64url berentropi tinggi | Bentuk nilai `EDGE_SHARED_SECRET`, `SESSION_HMAC_KEY_*`, `IDENTITY_PEPPER`, `CRON_TOKEN`. |
| `base64Blob` | heuristik | ≥40 char base64 standar (`+/` atau padding) | `openssl rand -base64 32` — cara yang dianjurkan `workers/owner/README.md`. |
| `assignedSecretLiteral` | heuristik | `password=`/`secret=`/`token=`/`api_key=` bernilai literal | Bentuk kebocoran paling umum: nilai ditempel ke tempat nama. |

## 3. Kesadaran konteks: angka nyata, bukan klaim

Pemindai naif akan **dimatikan orang dalam sehari**, dan gerbang yang dimatikan tidak
melindungi apa pun. Angka terukur pada repo ini:

| Aturan pemindaian | Kecocokan | Berkas terdampak |
|---|---|---|
| base64url naif ≥32 char (charset termasuk `+/`) | **9.000+** | **347** |
| + tolak heksa polos (digest sha256/git sha) | ~4.400 | 300+ |
| + wajib ada huruf kecil **dan** besar **dan** angka | ~40 | 20+ |
| + tolak nama berpemisah bersegmen pendek (`past_continuous_vs_past_simple_interrupted_action`) | 2 | 1 |
| + entropi ≥ 4,0 | **2** | **1** (fixture `edge-guard-test.js`) |

Penyaringnya **struktural**, bukan berbasis nama berkas — tidak satu pun berkas dimaafkan
karena namanya. Yang dikenali sebagai konteks sah:

- **Placeholder**: `__EDGE_SECRET__`, `<isi setelah: wrangler d1 create fiezel-core>`,
  `$(openssl rand -base64 32)`, `${VAR}`, `process.env.X`, `REPLACE/CHANGEME/…`.
- **Nama secret tanpa nilai**: `SCREAMING_SNAKE_CASE` tidak pernah menjadi bentuk nilai
  acak, jadi delapan baris `wrangler secret put …` di `wrangler.toml` tetap hijau —
  sementara **nilai** apa pun sesudah nama itu memerahkan gerbang (§4b).
- **Contoh yang ditandai oleh bentuknya**: urutan berjalan (`1234567890ABCDEFGHIJ`),
  karakter berulang, entropi < 3,0. Ini yang memaafkan fixture
  `fiezel-prompt-library-test.js:39` dan `fiezel-self-refine-test.js:64` —
  dua tes yang justru **mencegah** kebocoran. Menghukum keduanya = memaksa orang
  menghapus pertahanan.

### Allowlist beralasan — dan sengaja LEMAH

Aturan induknya: **allowlist hanya boleh mematikan detektor heuristik.** Delapan detektor
keras tetap berjalan di setiap berkas teks terlacak, termasuk yang ada di allowlist. Jadi
allowlist secara struktural **tidak bisa** memaafkan berkas yang benar-benar memuat pola
rahasia bernilai — dan itu **di-assert dengan menyuntikkan** token `ghp_` ke salinan
di-memori setiap berkas allowlist lalu memastikan detektor tetap menyala
(assert `allowlist TIDAK mematikan detektor keras`).

| Entri | Tipe | Alasan |
|---|---|---|
| 22 ekstensi biner (`.png`, `.woff2`, `.onnx`, `.wasm`, `.mp3`, …) | biner | Diff-nya tidak bisa di-review manusia ⇒ temuan tidak bisa ditindaklanjuti, dan entropi byte acak menyala di setiap berkas. **Sifat binernya dibuktikan** lewat byte NUL, bukan dipercaya dari ekstensi: berkas berekstensi biner yang ternyata teks tetap dipindai penuh, dan berkas biner **tanpa** ekstensi terdaftar memerahkan gerbang (anomali harus dilihat orang). 205 berkas dilewati. |
| `vendor/` | path, heuristik-off | Runtime TTS pihak ketiga (sherpa-onnx/supertonic). Glue WASM Emscripten adalah rimba simbol panjang (`_SherpaOnnxOfflineTtsNumSpeakers`) dan provenance-nya ribuan digest — tak satu pun ditulis proyek ini. Integritasnya dijaga terpisah (`SHA256SUMS.txt` + `neural-vendor-repro.yml`). |
| `audio/manifest.json` | path, heuristik-off | 1.170 alamat objek R2 `a/<sha256>.mp3` — digest konten publik, bukan kredensial. |
| 2 digest token di `edge-guard-test.js` | **per-nilai (sha256)** | Tiga fixture baris 425-427 yang disuntikkan ke salinan `api-index.php` **di memori** untuk membuktikan pemindai gerbang itu bisa merah. Diidentifikasi lewat **digest nilai**, bukan nama berkas: memaafkan fixture **tidak** memaafkan berkasnya. Nilai acak *kedua* di berkas yang sama tetap memerahkan gerbang. |

Setiap entri diperiksa **masih relevan**: path yang hilang dari repo dan digest yang sudah
tidak ada lagi dilaporkan sebagai **entri basi = FAIL**, supaya daftar ini tidak menjadi
fosil yang memaafkan hal yang tidak lagi dipahami siapa pun.

## 4. Pemeriksaan khusus repo ini

**(a) `deploy/edge/*.php`** — glob, bukan nama berkas tunggal. Setiap berkas PHP wajib
memuat `__EDGE_SECRET__`, `EDGE_SECRET` wajib masih berisi placeholder itu, dan seluruh
detektor dijalankan lagi khusus atasnya. Pemeriksaannya juga **dibuktikan bisa merah**
di dalam gerbang: placeholder diganti nilai acak pada salinan di memori, dan detektor
harus menyala.

> **Kejujuran cakupan:** paket kerja ini menyebut `deploy/edge/owner-index.php`, tetapi
> berkas itu **TIDAK ADA** di branch ini — yang ada hanya `api-index.php`. Worker owner
> (`workers/owner/`) hari ini dipanggil lewat `*.workers.dev` + `OWNER_SUBJECT`, tanpa
> jembatan PHP. Ini dicatat sebagai **catatan** di laporan JSON, bukan dijadikan PASS
> palsu ("berkas ada dan bersih") maupun FAIL palsu. Karena pemeriksaannya memakai glob
> `deploy/edge/*.php`, berkas itu ikut terjaga otomatis begitu dibuat — gerbang tidak
> perlu diubah.

**(b) `wrangler.toml`** — dua berkas, 8 nama secret terdaftar, **0 nilai**. Yang ditegakkan:
`wrangler secret put NAMA` harus berhenti pada nama (apa pun sesudahnya selain komentar =
FAIL), dan var apa pun yang namanya mengandung `SECRET|TOKEN|KEY|PEPPER|PASSWORD` tidak
boleh berisi literal berentropi tinggi. Jumlah nama juga di-assert ≥8: kalau dokumentasi
secret **hilang**, itu juga regresi.

**(c) Higiene git** —
`.gitignore` wajib memuat 10 pola: `.env`, `.env.*`, `push-secrets*.json`,
`push-secrets*.txt`, `fiezel-autonomy-config.json`, `CF-LIVE-REPORT.json`,
`CF-SHADOW-MODE-REPORT.json`, `RELEASE-AUDIT-GATE-REPORT.json`, `FINAL-AUDIT-REPORT.json`,
`*.bak`. Empat pertama membawa secret; empat berikutnya adalah **laporan yang isinya
bergantung lingkungan** (base URL Worker, hasil per-mesin) sehingga men-commit-nya
menghasilkan "hijau milik orang lain".
`*.orig` dan `*.rej` **ditambahkan** ke `.gitignore` pada paket kerja ini: keduanya adalah
salinan **utuh** versi lain sebuah berkas, jadi berkas yang placeholder-nya sudah
dibersihkan bisa tetap memuat nilai sungguhan di dalam salinan itu.
Tidak ada `*.bak/*.orig/*.rej/*.save/*.swp` terlacak (0), tidak ada `.env` terlacak (0);
`.env.example` sengaja **tidak** dilarang tetapi tetap dipindai isinya.

**(d) Gerbang memindai dirinya sendiri.** Semua fixture dibangun dengan penggabungan
string (`'sk' + '-' + …`) dan tiap potongan dijaga <32 karakter, sehingga tidak ada satu
pun literal di `secret-scan-test.js` yang cocok dengan detektornya sendiri. Kalau
seseorang menempel nilai sungguhan ke berkas itu, pemindaian-diri memerahkannya.

## 5. Daftar temuan pada keadaan repo sekarang

**0 temuan.** 690 berkas teks dipindai, 205 berkas biner dilewati (semuanya berekstensi
biner terdaftar), 46/46 assert PASS.

Tiga kecocokan **dimaafkan beralasan** dan tercatat terbuka di
`SECRET-SCAN-REPORT.json` → `dismissed` (bukan disembunyikan):

| Berkas | Baris | Detektor | Alasan |
|---|---|---|---|
| `edge-guard-test.js` | 425 | `base64urlToken` | fixture anti-vakum bentuk base64url — hanya masuk `String.replace` di memori |
| `edge-guard-test.js` | 427 | `base64urlToken` | fixture anti-vakum bentuk base64 ber-padding (satu nilai, dua detektor) |
| `edge-guard-test.js` | 427 | `base64Blob` | idem |

Tidak ada satu pun nilai rahasia sungguhan yang ditemukan di berkas terlacak — termasuk
di `deploy/edge/api-index.php` (placeholder utuh) dan di kedua `wrangler.toml`
(nama saja).

## 6. Bukti gerbang bisa MERAH (matriks)

Dijalankan pada **salinan di luar repo** (`/tmp/a4-redproof`, `git init` sendiri), satu
kasus sekaligus, salinan dihapus setelah tiap kasus. **Repo tidak disentuh** — dibuktikan
oleh `git status` bersih dan oleh gerbang yang tetap 46/46 PASS sesudahnya (§7).
Skrip: `/home/user/workspace/redproof-a4.sh`, keluaran mentah:
`/home/user/workspace/redproof-a4-output.txt`.

| # | Suntikan | Exit | Assert yang merah | Detektor yang menangkap |
|---|---|---|---|---|
| 0 | **kontrol** (tanpa suntikan) | **0** | — | — (0 temuan) |
| 1 | `ghp_Zq83…Kl3M` di `core-config.js` | **1** | 2 | `githubToken` + `base64urlToken` |
| 2 | JWT tiga bagian di `DEPLOYMENT-CHECKLIST.md` | **1** | 2 | `jwt` + `base64urlToken` |
| 3 | blok PEM di berkas baru `deploy/edge/owner-key.pem` | **1** | 2 | `pemPrivateKey` + `base64urlToken` |
| 4 | `__EDGE_SECRET__` diganti nilai acak di `api-index.php` | **1** | 2 | `base64urlToken` + pemeriksaan PHP §4a (placeholder hilang, `EDGE_SECRET` bukan placeholder) |
| 5 | `.env` + `api-index.php.orig` dipaksa terlacak | **1** | 3 | `base64urlToken` + assert `.env` terlacak + assert artefak `*.orig` terlacak |
| 6 | bentuk 1+2+3 sekaligus | **1** | 2 | ketiganya sekaligus, 6 temuan |

Tiga bentuk yang diminta (kunci ber-prefiks, JWT, PEM) tertangkap semuanya; dua kasus
tambahan (4 dan 5) membuktikan pemeriksaan khusus repo dan higiene git juga hidup.
Di samping itu, gerbang membawa **anti-vakum internal**: 11 fixture positif (satu per
detektor) dan 10 fixture negatif (placeholder, nama secret, substitusi perintah, digest
sha256, path panjang, identifier CamelCase, token pendek) di-assert setiap kali gerbang
berjalan — jadi detektor yang mati atau pemindai yang membanjiri langsung terlihat, bukan
menunggu insiden.

## 7. Verifikasi

```
node secret-scan-test.js    exit=0   46/46 assert PASS, 690 berkas teks, 205 biner, 0 temuan, 3 dimaafkan
node regression-test.js     exit=0
node install-health-test.js exit=0   FIEZEL install health: PASS
node no-network-test.js     exit=0   PASS (35 assert, 128 gerbang dipindai — termasuk gerbang baru ini)
node edge-guard-test.js     exit=0   119/119 assert PASS
```

Gerbang terdaftar di `.github/workflows/quality.yml` tepat sesudah `node edge-guard-test.js`
(alasan urutan ada di komentar workflow), dan gerbang **meng-assert pendaftarannya
sendiri** — gerbang yang tidak dijalankan workflow apa pun adalah gerbang yang tidak ada
(temuan K13, dikutip di `reports/work-e9-edge.md`).

Durasi ± 2,3 detik untuk 895 berkas terlacak. Tidak ada bump versi build
(`VERSION.json`/`version.js` tidak disentuh). Tidak ada push.

## 8. Batas kejujuran pemindaian

1. **HANYA KEADAAN SEKARANG, BUKAN RIWAYAT.** Gerbang ini memindai isi berkas terlacak di
   working tree. Berkas yang hari ini bersih tetapi pernah memuat secret di commit
   sebelumnya **TIDAK terdeteksi**. Itu keputusan sadar: `git log -p --all` di repo ini
   berukuran ratusan MB dan menjalankannya pada setiap push mengubah gerbang detik menjadi
   gerbang menit. **Riwayat ada di luar lingkup paket kerja ini.**
2. **Perintah manual untuk owner** (jalankan lokal, bukan di CI):
   ```bash
   # kapan placeholder edge pernah berubah isinya
   git log -p --all -S '__EDGE_SECRET__' -- deploy/edge

   # pindai SEMUA commit untuk pola kunci (lambat; jalankan sekali, catat hasilnya)
   git rev-list --all | while read -r c; do
     git grep -nIE '(sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|cfut_|AIza[0-9A-Za-z_-]{30,}|eyJ[A-Za-z0-9_-]{10,}\.)' "$c" || true
   done

   # blob besar/aneh yang pernah ada tapi tidak terlacak lagi
   git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \
     | awk '$1=="blob" && $3>100000 {print}'
   ```
3. **Kalau riwayat memang memuat secret: ROTASI DULU.** `wrangler secret put` ulang untuk
   nama yang terdampak + suntik ulang nilai baru ke `deploy/edge/*.php` di origin. Baru
   setelah itu pertimbangkan penulisan-ulang riwayat (`git filter-repo`). Urutannya bukan
   selera: rotasi **menutup** kebocoran, penulisan-ulang riwayat hanya membersihkan jejak
   — dan setiap fork/clone yang sudah ada tetap memegang nilai lama.
4. **Pola tidak bisa menemukan yang tidak berbentuk.** Kata sandi pendek yang mirip kata
   biasa, ID numerik, dan nilai yang sengaja dipecah menjadi potongan-potongan tetap
   lolos. Gerbang ini menaikkan biaya kebocoran ceroboh; ia bukan bukti ketiadaan secret.
5. **Berkas biner dilewati** setelah dibuktikan biner (byte NUL). Secret yang ditanam di
   dalam `.png`/`.onnx` tidak terlihat.
6. **Berkas tak terlacak tidak dipindai** — ia tidak bisa bocor lewat `git push`. Yang
   menjaga terhadapnya adalah `.gitignore` (§4c).
7. **Entropi bukan bukti.** Ambang (4,0 base64url; 4,6 base64 standar; 22 simbol unik)
   dipilih dari pengukuran repo ini, bukan dari teori. Kalau suatu hari repo memuat data
   baru berbentuk acak yang sah, tempat yang benar untuk menanganinya adalah **allowlist
   beralasan per-nilai/per-path** di dalam gerbang — bukan menurunkan ambangnya.
