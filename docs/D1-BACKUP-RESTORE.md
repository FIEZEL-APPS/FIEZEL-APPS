# Backup & pemulihan D1 FIEZEL (`fiezel-core`, `fiezel-stats`)

Prosedur nyata, bukan niat. Semua perintah di bawah dijalankan dari
`workers/api/` di mesin owner (bukan dari dalam Worker: tidak ada `wrangler` di
runtime Worker).

---

## 0. YANG PALING PENTING, DI ATAS SEGALANYA

> ## PROGRES BELAJAR MURID **TIDAK ADA DI D1**.
> Sumber kebenaran progres murid adalah **`localStorage` di perangkat murid
> sendiri** (bab 1: server tidak boleh menjadi sumber kebenaran progres; bukti
> strukturalnya: bucket R2 `USERDATA` **tidak dipasang** di
> `workers/api/wrangler.toml`, dan tidak ada satu tabel pun di
> `workers/api/migrations/*.sql` yang menyimpan jawaban, level, riwayat, atau
> transkrip).
>
> **Kehilangan D1 = kehilangan identitas, kuota, dan statistik.
> BUKAN kehilangan progres.**

Konsekuensi nyata untuk murid kalau kedua database D1 hilang total:

| Yang terjadi | Dirasakan murid | Tingkat |
|---|---|---|
| Cookie `fz_id` menunjuk `sub` yang tidak ada lagi | Diperlakukan sebagai pengunjung baru; identitas anonim baru diterbitkan otomatis. Pelajaran, level, dan riwayatnya **tetap utuh** karena semuanya dari `localStorage`. | ringan |
| `quota_daily` hilang | Kuota harian **kembali penuh**. Murid tidak dirugikan; yang dirugikan owner (jatah Neuron/AI bisa dipakai dua kali di hari yang sama). | ringan (bagi murid) |
| `identity.legacy_ref_hmac` hilang | Murid yang pernah **klaim akun Puter** harus klaim ulang. Karena indeks unik `ux_identity_legacy` juga hilang, klaim ulang akan **MEMBUAT identitas baru**, bukan mengadopsi yang lama. Efek nyatanya nol untuk progres, tetapi entitlement/kelas (`class='auth'`) harus dibangun ulang. | sedang |
| `session` hilang | Semua perangkat "logout" (dianggap tidak punya sesi). Tidak ada data yang hilang. | ringan |
| `anon_issue` hilang | Rem penerbitan identitas anonim per hari reset. Risiko penyalahgunaan naik satu hari. | ringan |
| `metrics_daily`/`usage_daily`/`retention_daily` hilang | **Hilang permanen.** Agregat historis tidak bisa direkonstruksi dari perangkat mana pun — tidak ada satu pun murid yang menyimpan angka DAU. Ini satu-satunya kerugian yang benar-benar tak tergantikan. | **berat (bagi owner)** |
| `pepper_state` hilang | Pepper baru dibuat; token DAU hari itu jadi tidak konsisten → DAU satu hari bisa salah hitung. | ringan |

Kesimpulan operasionalnya: **backup `fiezel-stats` melindungi hal yang tidak bisa
dipulihkan dengan cara lain; backup `fiezel-core` melindungi kenyamanan dan
kejujuran tagihan.** Dan tidak satu pun dari keduanya melindungi progres murid —
yang melindungi progres murid adalah **fitur ekspor/backup di aplikasi** (lihat
`backup-ui-test.js`). Kalau murid membersihkan data situsnya, backup D1 tidak
menolong sedikit pun. Itu wajib disampaikan ke murid/wali apa adanya.

---

## 1. Dua lapis, dan kenapa lapis pertama tidak cukup

**Lapis 1 — Time Travel (otomatis, bawaan D1).** D1 membuat bookmark sendiri:
"Time Travel automatically creates bookmarks on your behalf. You do not need to
manually trigger or remember to initiate a backup"
([Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)).
Retensi pada plan **gratis = 7 hari** (Paid: 30 hari), dan pemulihan dibatasi
"10 restores per 10 minutes, per database"
([D1 limits](https://developers.cloudflare.com/d1/platform/limits/)).

Yang **TIDAK** dilindungi Time Travel, dan ini alasan lapis 2 wajib ada:

- database yang **dihapus** (tidak ada database, tidak ada bookmark);
- akun Cloudflare yang hilang/ditangguhkan;
- kesalahan yang baru disadari **lebih dari 7 hari** kemudian — mis. cron retensi
  salah `cutoff` dan menghapus 90 hari `quota_daily` sedikit-sedikit setiap
  malam;
- kebutuhan memeriksa isi backup tanpa menyentuh produksi.

**Lapis 2 — ekspor `.sql` manual ke luar Cloudflare.** Ini yang dijadwalkan di
§2 dan dipakai di §4.

---

## 2. Cara mengekspor (perintah nyata) dan seberapa sering

Sintaks resmi `wrangler d1 export`: `[NAME]` wajib, `--output` wajib, ditambah
`--remote`/`--local`, `--table`, `--no-schema`, `--no-data`, `--skip-confirmation`
([Wrangler D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/)).

```bash
cd workers/api
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$HOME/fiezel-backup"          # BUKAN di dalam repo. Lihat §3.
mkdir -p "$DEST/core" "$DEST/stats"

# --- fiezel-core: identitas + kuota (HARIAN) ---------------------------------
wrangler d1 export fiezel-core  --remote --output "$DEST/core/core-$STAMP.sql"

# --- fiezel-stats: agregat analytics (MINGGUAN) ------------------------------
wrangler d1 export fiezel-stats --remote --output "$DEST/stats/stats-$STAMP.sql"

# --- snapshot SKEMA saja (murah, tiap kali sesudah menerapkan migrasi) ------
wrangler d1 export fiezel-core  --remote --no-data --output "$DEST/core/schema-core-$STAMP.sql"
wrangler d1 export fiezel-stats --remote --no-data --output "$DEST/stats/schema-stats-$STAMP.sql"

sha256sum "$DEST"/core/core-$STAMP.sql "$DEST"/stats/stats-$STAMP.sql \
  >> "$DEST/CHECKSUMS.txt"
```

**DUA BERKAS TERPISAH, SELALU.** Jangan pernah menyambung (`cat`) ekspor kedua
database menjadi satu `.sql`. Satu berkas berisi `quota_daily(user_id, …)` dan
`metrics_daily`/`dau_dedup` sekaligus adalah satu `wrangler d1 execute` dari
melahirkan database gabungan tempat JOIN yang dilarang kontrak privasi
(`EXEC-BRIEF-CF.md`, `workers/api/migrations/MIGRATIONS.md`) mendadak bisa ditulis.
Pemisahan direktori di atas bukan kerapian; itu bagian kontraknya.

### Jadwal

| Apa | Frekuensi | Jam | Alasan |
|---|---|---|---|
| `fiezel-core` (skema + data) | **harian** | 03:30 WIB | Berubah setiap request. Ekspor **memblokir permintaan lain ke database itu** ("a running export will block other database requests", [import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/)) — jadi jalankan di jam paling sepi, jangan pukul 20:00. |
| `fiezel-stats` (skema + data) | **mingguan** (Minggu) | 03:45 WIB | Hanya berubah sekali sehari (rollup 00:05 WIB). Kehilangan seminggu agregat = kehilangan seminggu grafik, bukan kehilangan uang atau progres. |
| Snapshot `--no-data` | **setiap kali sesudah menerapkan migrasi** | — | Bukti skema apa yang hidup di produksi pada tanggal itu; jadi masukan untuk `tools/d1-schema-check.mjs`. |
| Uji pemulihan (§5) | **sekali per kuartal** | — | Backup yang belum pernah dipulihkan bukan backup. |

Ekspor **tidak** dijalankan dari cron Worker: tidak ada `wrangler` di dalam
Worker. Kalau owner nanti mau otomatis, jalurnya REST API + Workflows ke R2
seperti disebut dokumen Time Travel — itu pekerjaan terpisah, dan sampai itu ada,
**§2 adalah tugas manual owner** dan harus dijadwalkan sebagai pengingat.

---

## 3. Di mana disimpan

- **Bukan di dalam repo Git.** Ekspor `fiezel-core` berisi `legacy_ref_hmac`,
  `issue_ip_hmac`, dan seluruh `sid` sesi aktif. Repo ini pernah punya insiden
  secret; satu `git add -A` yang menyapu berkas backup = kebocoran pengenal
  turunan seluruh pengguna.
- Lokasi utama: `~/fiezel-backup/` di mesin owner (disk terenkripsi).
- Salinan kedua **di luar Cloudflare dan di luar mesin utama** (cakram eksternal
  atau penyimpanan pribadi milik owner). Backup yang hanya ada di satu tempat
  hilang bersama tempat itu.
- Rotasi: simpan **14 ekspor harian core** + **8 ekspor mingguan stats** +
  seluruh snapshot `--no-data` (kecil). Yang lebih tua dihapus manual.
- `CHECKSUMS.txt` (sha256) diperbarui setiap ekspor. Tanpa checksum, berkas
  `.sql` terpotong akan terlihat baik-baik saja sampai hari pemulihan.

---

## 4. CARA MEMULIHKAN — urutan yang benar

Kalau salah urutan, akibat terburuknya bukan "gagal": akibat terburuknya adalah
Worker hidup separuh, murid menulis ke database yang setengah dipulihkan, dan
backup jadi lebih tua dari kekacauan yang baru dibuat.

### Langkah 0 — HENTIKAN penulisan lebih dulu

```bash
cd workers/api
# 1. Matikan fitur yang menulis D1 (vars di wrangler.toml -> deploy):
#    FEATURE_AI="off", FEATURE_TTS="off", ANALYTICS_ENABLED="off"
wrangler deploy
```

Cron `*/5` dan `5 17` tetap jalan, tetapi keduanya idempoten dan hanya menyentuh
lease/rollup. Kalau pemulihan diperkirakan lebih dari satu jam, hapus sementara
blok `[triggers] crons` lalu `wrangler deploy` — dan **catat** bahwa itu harus
dikembalikan (tanpa cron sweep, slot kuota yang tertahan bocor sampai tengah malam).

### Langkah 1 — pilih jalur pemulihan

- **Kerusakan < 7 hari, database masih ada** → pakai **Time Travel** (lebih cepat,
  tanpa kehilangan apa pun sejak backup terakhir):
  ```bash
  wrangler d1 time-travel info    fiezel-core --remote
  wrangler d1 time-travel restore fiezel-core --timestamp=2026-08-27T18:30:00Z
  ```
- **Database terhapus / akun hilang / kerusakan > 7 hari** → pakai ekspor `.sql`
  (Langkah 2 dan seterusnya).

### Langkah 2 — pulihkan `fiezel-core` LEBIH DULU

Urutan antar database bukan selera: `fiezel-core` adalah jalur murid (identitas →
sesi → kuota). Selama ia mati, murid tidak bisa memakai AI/TTS sama sekali.
`fiezel-stats` hanya memberi grafik ke owner dan **tidak** pernah menghalangi
murid, jadi ia terakhir.

```bash
cd workers/api

# 2a. Database baru, JANGAN menimpa yang lama sampai yang baru terbukti benar.
wrangler d1 create fiezel-core-restore

# 2b. Impor. Kalau muncul "cannot start a transaction within a transaction",
#     buang baris BEGIN TRANSACTION/COMMIT dari berkas ekspor; kalau muncul
#     "Statement too long", pecah INSERT besar.  (Dua caveat ini didokumentasikan
#     Cloudflare di halaman import/export.)
wrangler d1 execute fiezel-core-restore --remote --file="$DEST/core/core-20260827T203000Z.sql"
```

### Langkah 3 — BUKTIKAN skemanya cocok dengan repo (jangan percaya mata)

```bash
wrangler d1 execute fiezel-core-restore --remote --json \
  --command "SELECT type, name, tbl_name, sql FROM sqlite_master" \
  | node ../../tools/d1-schema-check.mjs --db core
# exit 0 = skema produksi identik dengan berkas migrasi di repo
```

Lalu kontrak privasi (kedua perintah HARUS mengembalikan nol baris):

```bash
wrangler d1 execute fiezel-core-restore --remote --command \
 "SELECT name FROM sqlite_master WHERE name IN ('metrics_daily','usage_daily','retention_daily','dau_dedup','pepper_state')"
wrangler d1 execute fiezel-stats --remote --command \
 "SELECT name FROM sqlite_master WHERE name IN ('quota_daily','quota_reservation','identity','session')"
```

Kalau salah satu mengembalikan baris, **berhenti**: berkas ekspor tertukar dan
kedua domain baru saja bercampur di satu database. Hapus database hasil impor
(`wrangler d1 delete fiezel-core-restore`) dan mulai lagi dari ekspor yang benar.

### Langkah 4 — sambungkan

```bash
# Tempel database_id baru ke blok [[d1_databases]] binding CORE_DB di wrangler.toml
wrangler deploy
curl -s https://api.fiezel.my.id/health | head -c 400     # protokol 1.7, edgeGuard
```

### Langkah 5 — bersihkan sisa keadaan lama (WAJIB, bukan opsional)

```bash
# Lease yatim dari sebelum insiden: TTL-nya sudah lewat, tapi held masih tinggi.
wrangler d1 execute fiezel-core-restore --remote --command \
 "DELETE FROM quota_reservation WHERE rowid IN (SELECT rowid FROM quota_reservation WHERE expires_at < unixepoch()*1000 LIMIT 500)"
# Ulangi sampai 0 baris. Sesudahnya, biarkan cron reconcileHeld() menurunkan
# ulang kolom *_held dari tabel lease (satu siklus 5 menit).
```

### Langkah 6 — `fiezel-stats` (SESUDAH core sehat)

```bash
wrangler d1 create fiezel-stats-restore
wrangler d1 execute fiezel-stats-restore --remote --file="$DEST/stats/stats-20260824T034500Z.sql"
wrangler d1 execute fiezel-stats-restore --remote --json \
  --command "SELECT type, name, tbl_name, sql FROM sqlite_master" \
  | node ../../tools/d1-schema-check.mjs --db stats

# WAJIB SEGERA: ekspor lama masih memuat token dedup harian. Membiarkannya =
# menghidupkan kembali token perangkat yang seharusnya sudah dihapus tiap malam,
# dan itu melanggar kontrak privasi lewat pintu belakang bernama "backup".
wrangler d1 execute fiezel-stats-restore --remote --command \
 "DELETE FROM dau_dedup WHERE (day, token) IN (SELECT day, token FROM dau_dedup WHERE day <= date('now','-1 day') LIMIT 1000)"
# Ulangi sampai 0 baris.
```

Catatan `pepper_state`: pepper lama ikut hidup kembali. Konsekuensinya DAU satu
hari bisa salah hitung; jangan mencoba "memperbaiki" dengan menyimpan pepper lama
di tempat lain — justru pepper yang hilang permanen itulah yang membuat token
antar hari tidak bisa disambungkan.

### Langkah 7 — nyalakan kembali

Kembalikan `FEATURE_AI`, `FEATURE_TTS`, `ANALYTICS_ENABLED`, dan blok
`[triggers] crons` ke nilai semula → `wrangler deploy`. Tulis satu baris di
`reports/` : tanggal, jalur pemulihan, berkas yang dipakai, jumlah baris yang
hilang antara backup dan insiden.

### Ringkasan urutan (hafalkan ini)

```
0 hentikan tulis → 1 pilih jalur → 2 core diimpor → 3 skema+privasi dibuktikan
→ 4 binding & deploy → 5 bersihkan lease → 6 stats diimpor + purge dau_dedup
→ 7 nyalakan fitur & cron
```

---

## 5. Uji pemulihan kuartalan (di atas kertas tidak cukup)

```bash
cd workers/api
wrangler d1 create fiezel-core-drill
wrangler d1 execute fiezel-core-drill --remote --file="$DEST/core/core-<terbaru>.sql"
wrangler d1 execute fiezel-core-drill --remote --json \
  --command "SELECT type, name, tbl_name, sql FROM sqlite_master" \
  | node ../../tools/d1-schema-check.mjs --db core --json
wrangler d1 execute fiezel-core-drill --remote --command \
  "SELECT COUNT(*) AS identitas FROM identity"
wrangler d1 delete fiezel-core-drill
```

Yang dibuktikan latihan ini: berkas ekspor bisa diimpor, skemanya cocok dengan
repo, dan jumlah identitasnya masuk akal. Kalau salah satunya gagal, itu ditemukan
pada hari latihan — bukan pada hari insiden.

Catatan batas ekspor yang harus diketahui sebelum percaya penuh: ekspor
**tidak mendukung tabel virtual** dan nilai numerik besar bisa kehilangan presisi
karena batas 52-bit angka JavaScript
([import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/)).
Skema FIEZEL tidak memakai tabel virtual, dan angka terbesar yang disimpan adalah
epoch milidetik (± 1,76 × 10¹²) — aman di bawah 2⁵³. Kalau nanti ada yang
menambahkan tabel FTS5 untuk pencarian, prosedur ini berhenti bekerja tanpa
peringatan, dan itu harus dicatat di migrasinya.
