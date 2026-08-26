# `fiezel-owner` — dashboard owner FIEZEL

Worker terpisah yang menyajikan dashboard owner di **`https://owner.fiezel.my.id`**.
Nol berkas di repo PWA, nol byte di bundle murid, nol dampak pada invarian rilis
(`SW_REV` / `DIAG_BUILD` / `FIEZEL_PAGE_BUILD`).

Sumber desain: `reports/cf-b5-analytics.md` §5 (panel + gate owner) · `reports/cf-a10-cost.md`
(+ `cf-a10-cost-model.json`, rumus biaya) · `reports/cf-a7-security.md` §3.6 (pola owner gate) ·
otoritas privasi: **`EXEC-BRIEF-CF.md` → KONTRAK ANALYTICS PRIVASI-MAKSIMAL**.

---

## 1. Kenapa Worker sendiri, bukan `/owner` di worker api

Dipilih: **hostname `owner.fiezel.my.id` pada Worker `fiezel-owner`.**

1. **Radius ledakan.** Binding D1 analytics tidak pernah ada di isolate yang melayani murid.
   Kalau dashboard hidup di worker api, satu bug router di jalur belajar bertetangga dengan kode
   yang boleh membaca angka bisnis.
2. **Kadens deploy.** `main` auto-deploy ke produksi tiap 5 menit. Mengubah label panel tidak
   boleh menyentuh Worker yang sedang dipakai murid.
3. **Lapis kedua gratis.** Cloudflare Access dipasang **per hostname** → MFA bisa ditaruh di depan
   seluruh dashboard tanpa satu baris kode auth baru dan tanpa risiko aturan Access salah
   mencocokkan path lalu memblokir murid.
4. **Gerbang yang bisa diassert habis.** "Semua rute Worker ini adalah rute owner" bisa diuji
   sampai ke rute yang belum ada (default deny). Pada worker api invariannya melemah menjadi
   "semua rute berprefiks `/owner`", yang bisa bocor lewat prefiks baru.

Harganya, jujur: satu Worker lagi + satu record DNS (`custom_domain = true` mengurusnya).
Keduanya **nol biaya di plan GRATIS**.

Yang **tidak** berubah dari cf-b5 §5.1: HTML tetap **dirender Worker**, bukan berkas di repo —
karena `sw.js` mem-precache daftar ASSETS-nya ke perangkat murid, dan setiap perubahan berkas
repo memaksa naiknya tiga invarian build.

**Beda yang disengaja dari cf-b5 §5.1:** dokumen itu menyarankan `/owner` mengembalikan **404**
untuk non-owner. Di sini **semua** rute mengembalikan **403** seragam, karena brief eksekusi
(bab 32 #20) meminta "semua rute 403 tanpa sesi valid" dan itu yang diassert gerbang. Kerahasiaan
keberadaan halaman tidak hilang karena ia berada di hostname terpisah dan `noindex`.

---

## 2. Cara deploy

```bash
cd FIEZEL-APPS/workers/owner

# 1) Buat database analytics sekali saja (kalau belum ada). Skema: reports/cf-b5-analytics.md §2.1
wrangler d1 create fiezel-analytics

# 2) Pasang Secret (lihat §3) — WAJIB sebelum deploy pertama, kalau tidak Worker fail-closed
wrangler secret put OWNER_TOKEN_HASH
wrangler secret put OWNER_SESSION_KEY

# 3) Deploy
wrangler deploy
```

`wrangler.toml` hanya memuat **nama** binding — nol nilai rahasia, nol `[vars]`.
Bila `OWNER_TOKEN_HASH` atau `OWNER_SESSION_KEY` belum dipasang, **setiap** rute (termasuk
halaman masuk) mengembalikan 403. Itu sekaligus bentuk "fitur baru default OFF": tanpa Secret,
dashboard mati total.

Disarankan (lapis kedua): Cloudflare Access → Application dengan hostname `owner.fiezel.my.id`,
policy satu surel owner + MFA. Gate aplikasi tetap wajib; Access tidak menggantikannya.

---

## 3. Secret yang dipasang owner

| Secret | Isi | Cara membuat |
|---|---|---|
| `OWNER_TOKEN_HASH` | **sha256 HEX dari token owner** — hash, bukan token | lihat perintah di bawah |
| `OWNER_SESSION_KEY` | kunci HMAC untuk menandatangani cookie sesi owner | `openssl rand -hex 32` |

```bash
# Terbitkan token acak 32 byte (SIMPAN di password manager — ini yang diketik saat login):
TOKEN="$(openssl rand -base64 32)"; echo "$TOKEN"

# Yang masuk ke Cloudflare hanyalah hash-nya:
printf '%s' "$TOKEN" | openssl dgst -sha256 -hex | awk '{print $2}'
# tempel hasilnya ke: wrangler secret put OWNER_TOKEN_HASH
```

Repo **tidak pernah** memuat token maupun hash-nya. Tidak ada password di kode, tidak ada
`?admin=true`, tidak ada URL rahasia, tidak ada flag entitlement di frontend.

Rotasi: jalankan ulang dua perintah di atas, `wrangler secret put OWNER_TOKEN_HASH`. Memutar
`OWNER_SESSION_KEY` sekaligus mematikan semua sesi yang masih berjalan.

---

## 4. Cara login

1. Buka `https://owner.fiezel.my.id/login`.
2. Tempel token owner (yang panjang, dari password manager). Yang dikirim dibandingkan sebagai
   **sha256** terhadap `OWNER_TOKEN_HASH`, dengan **perbandingan waktu-konstan**.
3. Berhasil → cookie sesi `fz_owner` (`HttpOnly; Secure; SameSite=Strict`) berumur **30 menit**,
   diperbarui otomatis setiap kali dashboard dibuka. Gagal → 403, tanpa cookie.
4. `/logout` mematikan cookie.

Rute yang ada: `/` (HTML dashboard, `?period=today|7d|30d|90d`), `/api/summary`, `/api/series`,
`/api/retention`, `/api/cost`, `/logout`. **Semuanya** 403 tanpa sesi owner yang sah; rute yang
tidak dikenal juga 403 (default deny), sehingga rute baru tidak bisa lupa dipagari.

---

## 5. Batas kejujuran metrik — baca ini sebelum mengambil keputusan apa pun

Kontrak analytics dirancang untuk **menghitung orang tanpa mengenali orang**. Harganya adalah
ketidakpastian yang harus diketahui owner, bukan dipoles:

1. **Semua angka pengguna adalah ESTIMASI PERANGKAT, bukan orang.**
   - Satu orang dengan HP + laptop = **dua** hitungan (over-count pengguna).
   - Dua orang memakai satu perangkat = **satu** hitungan (under-count, tidak terukur).
   - Menghapus data browser / mode privat / perangkat baru = **"pengguna baru" palsu** dan
     **retensi jatuh palsu**.
2. **DAU/WAU/MAU dibaca dari tabel agregat harian** yang dibekukan job rollup. Dashboard tidak
   punya jalan untuk membaca baris per-orang — dan itu diassert gerbang `owner-dashboard-test.js`.
   Konsekuensinya: tidak ada (dan tidak akan ada) daftar "top users", tidak ada drill-down
   per murid, tidak ada nama, surel, isi jawaban, atau percakapan AI di dashboard ini.
3. **"Aktif" = hari dengan ≥5 jawaban** (`MEANINGFUL_ATTEMPTS` di `app.js:73`), dengan batas hari
   **zona murid** (`studyDayKey()`, `app.js:1085`), bukan UTC. Definisi ini sengaja sama dengan
   cincin misi murid supaya dashboard tidak pernah membantah apa yang dilihat murid.
   Untuk murid ber-zona non-WIB, "DAU hari X" adalah gabungan hari-lokal, bukan irisan waktu tunggal.
4. **Retensi = "observed", bukan "kebenaran".** Cohort dibangun per perangkat. Belajar offline
   berhari-hari muncul sebagai "berhenti", padahal murid tetap belajar (FIEZEL local-first).
   Safari membatasi storage skrip 7 hari → cohort iOS bisa tampak berhenti di D7.
   Persentase **tidak dicetak** bila cohort < 30: presisi di atas cohort kecil adalah derau.
5. **Pengunjung (visitors) adalah BATAS BAWAH.** PWA yang dibuka dari precache `sw.js` tanpa
   jaringan tidak pernah terlihat server.
6. **Aktivitas belajar (sesi/pelajaran/jawaban) adalah *self-reported* klien.** Bisa kurang
   (offline) dan bisa lebih (klien dimodifikasi). Angka **biaya tidak pernah** memakai kanal ini —
   semua angka biaya lahir server-side di jalur AI/TTS/kuota.
7. **Biaya adalah ESTIMASI dengan asumsi yang tercetak di kartu**, bukan tagihan:
   `tts = char_dirender/1e6 × tarif` (hanya cache **miss**), `llm = tok_in/1e6 × 0,045 + tok_out/1e6 × 0,384`,
   `total = tts + llm + infra − kredit`. Tarif seed: aura-1 **15,0** USD/1M char,
   `chars_per_audio_min` **1005** (dikalibrasi dari 273 aset audio nyata).
   - Bila penyedia tidak memberi objek usage, token keluaran = **proksi char ÷ 4** → kartu menandai
     `token = proksi`.
   - Penyebut "perangkat aktif" adalah under-count, jadi **biaya per perangkat aktif adalah
     batas atas**, bukan angka pasti.
   - Bila TTS berjalan **on-device**, biaya TTS nyata **nol**; yang tidak terukur skema ini justru
     bandwidth unduhan model (±152 MB/perangkat).
   - Kalibrasi yang harus selalu lulus: 1.000 pengguna, aura-1, cache 70% → ≈US$162,01/bulan,
     ≈US$0,162/pengguna (`reports/cf-a10-cost-model.json`).
8. **Hari dengan `collection_ok = 0` digambar PUTUS**, tidak diinterpolasi. Grafik mulus di atas
   hari yang gagal dikumpulkan adalah kebohongan visual. Panel DATA QUALITY menampilkan tanggal
   mulai pengumpulan, jumlah hari rusak, dan event yang tiba >24 jam.
9. **Sebelum tanggal mulai pengumpulan, data tidak ada — bukan nol.** Tidak ada angka historis
   yang bisa dipulihkan ke belakang.
10. **"Read-only" pada D1 ditegakkan kode + gerbang, bukan oleh Cloudflare.** D1 belum punya
    binding read-only. Yang memaksanya: `queries.js` hanya memuat `SELECT` dan menolak dimuat bila
    ada kata tulis, plus `owner-dashboard-test.js` yang gagal bila pernyataan tulis muncul.
11. **Panel latensi p50/p95 dan cache/error 90 hari (Analytics Engine) belum dibangun.** Membaca AE
    butuh SQL API + token akun (binding AE hanya bisa **menulis**), dan retensi AE hanya 3 bulan.
    Binding AE di sini dipakai **hanya** untuk jejak audit akses owner (tanpa IP, tanpa identitas).
12. **Sesi owner stateless (HMAC).** Nol tulis KV/D1 → aman untuk plan GRATIS
    (batas 1.000 tulis KV/hari tidak tersentuh). Konsekuensinya: mencabut sesi sebelum kedaluwarsa
    hanya bisa dengan memutar `OWNER_SESSION_KEY`. Umur 30 menit dipilih agar jendela itu kecil.
13. **Rem percobaan login bersifat per-isolate (dalam memori)**, jadi ia menyulitkan penebakan
    cepat pada satu isolate, bukan akuntansi global. Pertahanan sebenarnya: token acak 32 byte +
    Cloudflare Access.

---

## 6. Gerbang

```bash
node owner-dashboard-test.js     # di akar FIEZEL-APPS
```

Terdaftar di `.github/workflows/quality.yml`. Yang diassert: semua rute 403 tanpa sesi owner
(termasuk `?admin=true`, header, body, cookie ter-tamper/kedaluwarsa/berkunci-lain), nol kolom
identitas per-orang di SQL, perbandingan rahasia waktu-konstan, DAU/WAU/MAU dari tabel agregat,
dan rumus biaya terkalibrasi ke `cf-a10`.
