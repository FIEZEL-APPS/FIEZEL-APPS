# E6 — Dashboard owner FIEZEL (`workers/owner/`)

Branch: `exec/dash` · worktree `wt-dash` · **tidak di-push**, **tidak menaikkan invarian build**
(`SW_REV` / `DIAG_BUILD` / `FIEZEL_PAGE_BUILD` tidak tersentuh, tidak ada berkas repo PWA yang diubah).

Otoritas: `EXEC-BRIEF-CF.md` → **KONTRAK ANALYTICS PRIVASI-MAKSIMAL**.
Desain: `reports/cf-b5-analytics.md` §5 · `reports/cf-a10-cost.md` + `cf-a10-cost-model.json` ·
`reports/cf-a7-security.md` §3.6 · harness uji: `reports/cf-b7-testing-strategy.md` §2.

---

## 1. Yang dibangun

| Berkas | Isi |
|---|---|
| `workers/owner/wrangler.toml` | Worker terpisah `fiezel-owner`, route `owner.fiezel.my.id` (custom domain), binding D1 `ANALYTICS` + AE `AE`. Hanya **nama** binding/Secret, nol nilai rahasia, nol `[vars]`. |
| `workers/owner/index.js` | Gate owner + sesi HMAC + 10 panel HTML yang dirender Worker + model biaya. 717 baris, nol dependency. |
| `workers/owner/queries.js` | Seluruh SQL agregat (`SELECT` saja) + self-guard yang melempar bila ada kata tulis. |
| `workers/owner/README.md` | Cara deploy, Secret yang dipasang owner, cara login, dan **13 batas kejujuran metrik**. |
| `tests/owner-dashboard-test.js` | Gerbang wajib (node murni, stub D1). Terdaftar di `.github/workflows/quality.yml`. |

## 2. Keputusan arsitektur: hostname terpisah, bukan `/owner` di worker api

Dipilih **`owner.fiezel.my.id` pada Worker `fiezel-owner`**. Alasan, urut kekuatan:

1. **Radius ledakan** — binding D1 analytics tidak pernah hadir di isolate yang melayani murid.
2. **Kadens deploy** — `main` auto-deploy tiap 5 menit; mengubah label panel tidak boleh menyentuh
   Worker yang sedang dipakai murid.
3. **Cloudflare Access berlaku per hostname** — MFA bisa ditumpuk di depan seluruh dashboard tanpa
   kode auth baru dan tanpa risiko aturan Access salah mencocokkan path lalu memblokir murid.
4. **Gerbang bisa diassert habis** — invarian "semua rute Worker ini adalah rute owner" berlaku juga
   untuk rute yang belum ada (default deny). Pada worker api invariannya melemah jadi "semua rute
   berprefiks `/owner`", yang bisa bocor lewat prefiks baru.

Biaya: satu Worker + satu record DNS. **Nol rupiah di plan GRATIS** (100k req/hari dipakai
belasan request owner per hari; sesi stateless → nol tulis KV/D1).

## 3. Kenapa HTML dirender Worker, bukan berkas di repo

`sw.js` mem-precache daftar ASSETS ke perangkat murid, dan setiap perubahan berkas repo memaksa
naiknya tiga invarian build (yang hanya boleh dinaikkan MASTER). Berkas `owner.html` di repo berarti:
(a) HTML dashboard owner ikut terunduh dan tersimpan permanen di **setiap perangkat murid**,
(b) tiap perbaikan label memicu bump build + reload seluruh basis pengguna. Karena itu HTML lahir
sebagai string di Worker. Alasan ini ditulis sebagai komentar di `index.js`, dan gerbang menolak
munculnya `owner.html` di repo maupun aset owner di daftar precache `sw.js`.

## 4. Gate owner

- **Secret, bukan password di repo.** `OWNER_TOKEN_HASH` = sha256 **hex** dari token owner
  (hash, bukan token). `OWNER_SESSION_KEY` = kunci HMAC sesi.
- **Fail-closed.** Bila salah satu Secret belum dipasang, **semua** rute 403 termasuk `/login`.
  Ini sekaligus bentuk "fitur baru default OFF".
- **Perbandingan waktu-konstan.** `ctEq()` (akumulasi XOR, panjang dinormalkan) dipakai untuk
  digest token maupun tanda tangan cookie. Tidak ada `===` yang menyentuh nilai rahasia — dipindai
  gerbang, baris per baris.
- **Sesi pendek, stateless.** Cookie `fz_owner` = base64url(payload) + `.` + HMAC-SHA256,
  TTL **30 menit**, `HttpOnly; Secure; SameSite=Strict; Path=/`, diperbarui saat dashboard dibuka.
  Nol tulis KV/D1 (aman untuk batas gratis 1.000 tulis KV/hari).
- **Default deny.** Rute tak dikenal 403, bukan 404-lalu-lolos. `?admin=true`, header
  `X-Owner`/`X-Forwarded-Owner`, dan body `{userId, role:'owner'}` **tidak pernah** mengubah keputusan.
- **Respons gagal-gate steril**: nol kunci metrik, dan **D1 tidak disentuh sama sekali** sebelum
  gate lulus (diassert: log query stub harus kosong).
- **Rem login** 8 percobaan / 10 menit per isolate (jujur: per-isolate, bukan global — pertahanan
  sebenarnya token acak 32 byte + Cloudflare Access).
- **Jejak audit** akses owner ditulis ke AE (`owner_access`), tanpa IP dan tanpa identitas.

**Beda yang disengaja dari cf-b5 §5.1:** dokumen itu menyarankan **404** untuk non-owner; di sini
semua rute **403** seragam karena brief (bab 32 #20) memintanya dan itu yang diassert. Kerahasiaan
tidak hilang: hostname terpisah + `noindex`.

## 5. Panel

USER GROWTH · ACTIVE USERS (DAU/WAU/MAU) · RETENTION (D1/D7/D30, "observed") · LEARNING ACTIVITY ·
AI USAGE · TTS USAGE (termasuk **cache hit rate**) · INFRASTRUCTURE · COST ESTIMATION ·
QUOTA EXHAUSTION · DATA QUALITY.

Kejujuran yang **tercetak di UI**, bukan disembunyikan di dokumen: label "ESTIMASI PERANGKAT" pada
setiap panel pengguna, "dua perangkat = dua hitungan", "menghapus data browser = perangkat baru",
peringatan estimasi perangkat khusus di panel retensi, "belum cukup data" menggantikan persentase
bila cohort < 30, dan sparkline yang **putus** di hari `collection_ok = 0` (tidak diinterpolasi).

Visual: palet FIEZEL (cream `#FFF8ED`, ink `#2B2118`, kuning `#FFD23F`), satu kolom dulu lalu grid
di ≥640px, CSS inline, **nol script**, **nol CDN**, **nol framework**, CSP ketat, `noindex`.

## 6. Model biaya (cf-a10)

```
tts_usd   = char_dirender / 1e6 × tarif_provider      # hanya cache MISS
llm_usd   = tok_in / 1e6 × 0,045 + tok_out / 1e6 × 0,384
total_usd = tts_usd + llm_usd + infra_usd − min(kredit_gratis, belanja_workers_ai)
```

Asumsi dicetak **di kartu** (provider, tarif, `chars_per_audio_min = 1005`, tarif LLM, rumus,
penagihan hanya cache-miss) supaya tidak ada angka ajaib. Kalibrasi yang dijaga gerbang:
1.000 pengguna, aura-1, cache 70% → **US$162,01/bulan, US$0,162/pengguna**
(TTS 157,30 + LLM 3,01 + langganan 5,00 − kredit 3,30). Pembagi nol → `null`, bukan `Infinity`/`NaN`.
Token proksi (char ÷ 4) ditandai eksplisit di UI bila penyedia tak memberi objek usage.

## 7. Gerbang `tests/owner-dashboard-test.js`

Node murni, nol dependency. Worker ESM dimuat lewat `data:text/javascript;base64,...`
(pola cf-b7 §2); impor `'./queries.js'` ditulis ulang jadi data: URL sendiri karena impor relatif
tidak resolvable di dalam data: URL. `tools/cf-test-stubs.js` belum ada di worktree ini, jadi stub
D1 di-inline: **hanya query yang terdaftar dijawab, query tak dikenal MELEMPAR**, sehingga SQL baru
tidak bisa lolos diam-diam.

Yang diassert (bab 32):
- **(a) #20** — 11 rute × 7 varian kredensial buruk (tanpa cookie, cookie kosong/sampah/ter-tamper/
  kedaluwarsa/berkunci-lain, header palsu) semuanya 403; `?admin=true` + header + body juga 403;
  tanpa Secret semua 403; token salah tidak menerbitkan cookie; token benar → 303 + cookie
  HttpOnly/Secure/SameSite=Strict dengan `Max-Age ≤ 3600`.
- **(b)** pindai `queries.js`: nol `user_id|install_id|uuid|email|name`, nol tabel per-orang
  (`identity`, `daily_active`, `usage_daily`), nol pernyataan tulis, rentang tanggal wajib
  parameter terikat `?1/?2`.
- **(c)** `ctEq()` ada dan menjumlahkan selisih bit; nol operator kesetaraan atas identifier
  rahasia; kedua titik kritis memakai `ctEq`; nol nilai hash/token di repo.
- **(d) #24** kalibrasi cf-a10 (162,01 / 0,162), cache penuh → US$0, tarif proporsional
  (melotts 0,2 vs aura-1 15,0), pembagi nol → `null`, asumsi ikut keluar dari rumus.
- **(e) #22** DAU/WAU/MAU = nilai agregat fixture (123/456/789) dan SQL yang benar-benar dijalankan
  hanya menyentuh `metrics_daily`; nol `COUNT(DISTINCT ...)`; nol tabel per-orang.
- Plus: panel wajib lengkap, label kejujuran, palet, mobile-first, nol script/CDN, jejak audit
  tanpa IP, dan README memuat batas kejujuran.

**Uji mutasi (bukti gerbang bukan sekadar hijau kosong):** melumpuhkan `if (!session) return deny()`
→ 107 assert gagal · menambah query `SELECT user_id FROM daily_active` → 2 gagal · mengubah tarif
aura-1 15,0 → 12,0 → 1 gagal · mengganti `ctEq(...)` jadi `===` → 3 gagal.

## 8. Hasil eksekusi

Hijau semua: `tests/owner-dashboard-test.js`, `tests/regression-test.js`, `tests/install-health-test.js`,
`tests/ui-structure-test.js`, `tests/observability-privacy-test.js`, `tests/audio-asset-pipeline-test.js`,
`tests/pwa-cache-test.js`, `tests/sw-corp-test.js`, `tests/core-worker-contract-test.js`, `validator.js`.
Nol berkas `*-REPORT.json` berubah. Satu-satunya berkas repo lama yang diubah: `.github/workflows/quality.yml`
(+1 baris pendaftaran gerbang).

## 9. Utang yang diakui (jangan dipoles jadi "selesai")

1. **Panel latensi p50/p95 dan cache/error 90 hari belum ada.** Membaca Analytics Engine butuh SQL
   API + token akun; binding AE hanya bisa **menulis**. Butuh keputusan owner soal token akun.
2. **Read-only D1 ditegakkan kode + gerbang, bukan Cloudflare.** D1 belum punya binding read-only.
   Ini batas nyata, bukan klaim keamanan.
3. **Pencabutan sesi sebelum kedaluwarsa** hanya lewat rotasi `OWNER_SESSION_KEY` (konsekuensi sesi
   stateless yang dipilih agar nol tulis KV di plan gratis).
4. **Rem login per-isolate**, bukan akuntansi global.
5. **Skema D1 `fiezel-analytics` dan job rollup-nya bukan milik E6.** Dashboard ini mengasumsikan
   DDL cf-b5 §2.1 dan akan gagal keras (bukan menampilkan nol palsu) bila tabel belum ada. Panel
   DATA QUALITY yang memberi tahu owner kapan pengumpulan mulai dan hari mana yang rusak.
6. **Semua angka pengguna tetap estimasi perangkat.** Tidak ada, dan menurut kontrak privasi tidak
   akan ada, drill-down per murid dari dashboard ini.
