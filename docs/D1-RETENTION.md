# Retensi & pembersihan D1 (`fiezel-core`, `fiezel-stats`)

Status: **kebijakan disetujui di dokumen ini, pelaksanaannya BELUM SEMUA
TERPASANG.** Lihat kolom "Sudah jalan?" — tiga baris di antaranya `TIDAK`, dan
selama masih `TIDAK`, tabel yang bersangkutan tumbuh selamanya. Itu bukan gaya
bahasa hati-hati; itu keadaan repo pada commit ini.

Angka byte/baris di dokumen ini **terukur**, bukan taksiran:
`analysis/a6-d1-index-plans.py` memasukkan 20.000 baris sintetis ke skema yang
persis sama dengan migrasi, lalu `VACUUM` dan mengukur berkas. Hasilnya ada di
`analysis/a6-d1-index-plans.json`.

---

## 0. Dua aturan yang tidak boleh dilanggar oleh pembersih apa pun

1. **DILARANG menyentuh dua database dalam satu kueri.** Tidak ada `ATTACH`,
   tidak ada satu pernyataan pun yang menyebut tabel kuota dan tabel analytics
   sekaligus. Pembersih menulis ke `CORE_DB` dan ke `ANALYTICS_DB` sebagai dua
   pernyataan terpisah ke dua binding terpisah. Kontrak privasi
   (`EXEC-BRIEF-CF.md`, `workers/api/migrations/MIGRATIONS.md`) ditegakkan oleh
   pemisahan fisik; satu `ATTACH` menghapus jaminan itu.
2. **DILARANG `DELETE` tanpa `WHERE` DAN tanpa batas jumlah baris.** D1
   mendokumentasikan bahwa "data migrations such as a large `UPDATE` or `DELETE`
   affecting millions of rows must be run in batches" dan satu kueri yang
   mengubah ratusan ribu baris akan melampaui batas eksekusi
   ([Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/)).
   Karena itu semua pernyataan di bawah memakai pola subkueri ber-`LIMIT`.

### Kenapa bukan `DELETE … LIMIT n` langsung

`DELETE FROM t WHERE … LIMIT n` hanya sah kalau SQLite dikompilasi dengan
`SQLITE_ENABLE_UPDATE_DELETE_LIMIT`, dan itu **bukan jaminan yang boleh
diandalkan** di D1. Pola yang dipakai di sini bekerja di setiap build SQLite:

```sql
-- tabel ber-rowid
DELETE FROM t WHERE rowid IN (SELECT rowid FROM t WHERE <syarat> LIMIT 500);
-- tabel WITHOUT ROWID (anon_issue, dau_dedup)
DELETE FROM t WHERE (k1, k2) IN (SELECT k1, k2 FROM t WHERE <syarat> LIMIT 1000);
```

Setiap pola di atas sudah diverifikasi memakai indeks (bukan pemindaian tabel)
lewat `EXPLAIN QUERY PLAN` — bukti per kueri ada di
`analysis/a6-d1-index-plans.json`.

---

## 1. Tabel retensi

| Tabel | Database | Retensi | Dijalankan oleh | Sudah jalan? |
|---|---|---|---|---|
| `quota_reservation` | `fiezel-core` | detik (TTL 30 s), sisa dipanen tiap 5 menit | cron `*/5 * * * *` → `sweepExpiredReservations()` | **YA** |
| `quota_daily` | `fiezel-core` | **90 hari** (`day < hari_ini_WIB − 89`) | cron `5 17 * * *` (00:05 WIB) | **TIDAK** |
| `session` | `fiezel-core` | kedaluwarsa + 1 hari; dicabut + 7 hari | cron `5 17 * * *` (00:05 WIB) | **TIDAK** |
| `anon_issue` | `fiezel-core` | **2 hari** (`day < hari_ini_WIB − 1`) | cron `5 17 * * *` (00:05 WIB) | **TIDAK** |
| `identity.issue_ip_hmac` | `fiezel-core` | **≤ 24 jam** (di-NULL-kan, baris TIDAK dihapus) | cron `5 17 * * *` (00:05 WIB) | **TIDAK** |
| `dau_dedup` | `fiezel-stats` | **0 hari** setelah rollup | cron `5 17 * * *` → `purgeDauDedup()` | **YA** (lihat catatan 5) |
| `metrics_daily` | `fiezel-stats` | permanen | — | tidak perlu |
| `usage_daily` | `fiezel-stats` | permanen (opsional 400 hari) | `purgeUsageOlderThan()` bila dipakai | tidak dipanggil |
| `retention_daily` | `fiezel-stats` | permanen | `purgeRetentionOlderThan()` bila dipakai | tidak dipanggil |
| `identity` (barisnya) | `fiezel-core` | **TIDAK PERNAH dihapus** | — | lihat catatan 6 |
| `learner_evidence` | `fiezel-core` | **180 hari** (`day < hari_ini − 180`) | `runLearnerEvidencePurge()` — cron `5 17 * * *` | **YA** (lihat §2.7) |
| `learner_evidence_state` | `fiezel-core` | **180 hari** (`last_day < hari_ini − 180`) | `runLearnerEvidencePurge()` — cron `5 17 * * *` | **YA** (lihat §2.7) |
| `learner_evidence_consent` | `fiezel-core` | selama akun ada; dicabut = baris bukti DIHAPUS seketika | `revokeConsent()` di jalur permintaan | **YA** |
| `learner_name` | `fiezel-core` | **180 hari** tanpa penulisan (`name_day < hari_ini − 180`) | `runLearnerEvidencePurge()` — cron `5 17 * * *` | **YA** (lihat §2.8) |

**Tidak ada trigger cron baru yang dibutuhkan.** Kedua ekspresi cron di
`workers/api/wrangler.toml` sudah ada (`*/5 * * * *` dan `5 17 * * *`).
Pekerjaan retensi harian menempel pada trigger 00:05 WIB yang sudah dipakai
rollup analytics, dijalankan **sesudah** rollup selesai, dan memakai
binding `CORE_DB` **langsung** — bukan `analyticsEnv` (lihat aturan 0.1).

---

## 2. Pernyataan `DELETE` / `UPDATE` yang aman (siap tempel)

Semua `:param` adalah nilai yang dihitung server; jangan pernah dari klien.
`hari_ini_WIB` = `dayKeyForQuota(now)` di `workers/api/quota/quota-core.js`.

### 2.1 `quota_daily` — 90 hari

```sql
-- :cutoff_day = 'YYYY-MM-DD' = hari_ini_WIB dikurangi 89 hari.
-- WAJIB '<' DAN BUKAN '<=': menghapus baris HARI INI berarti MENGEMBALIKAN
-- kuota murid (ai_used ikut hilang) — itu lubang penegakan kuota, bukan retensi.
DELETE FROM quota_daily
 WHERE rowid IN (SELECT rowid FROM quota_daily WHERE day < :cutoff_day LIMIT 500);
```

Ulangi sampai `meta.changes` = 0, **maksimum 20 batch per eksekusi cron**
(10.000 baris/hari; pada 5.000 pengguna aktif, satu hari kedaluwarsa = 5.000
baris, jadi 20 batch sudah lebih dari cukup dan sisanya diselesaikan besok).

Kenapa 90 hari dan bukan 2 hari: penegakan kuota hanya butuh **hari ini**
(`dayKeyForQuota`), jadi secara fungsional retensi bisa 2 hari. Yang menahan di
90 hari adalah kolom audit kejujuran tagihan (`committed`, `denied`,
`rolled_back`, `reaped`): itu satu-satunya bukti kalau murid mengeluh "kuota
saya hilang padahal AI-nya gagal". 90 hari = satu triwulan, dan biayanya
terukur: 191,7 B × 5.000 × 90 = **86,3 MB** dari 500 MB batas database gratis.

### 2.2 `session` — kedaluwarsa + 1 hari, dicabut + 7 hari

```sql
-- :cutoff_expired = now_ms - 86_400_000   (kedaluwarsa lebih dari sehari lalu)
DELETE FROM session
 WHERE rowid IN (SELECT rowid FROM session WHERE expires_at < :cutoff_expired LIMIT 500);

-- :cutoff_revoked = now_ms - 7*86_400_000  ("lupakan perangkat ini")
DELETE FROM session
 WHERE rowid IN (SELECT rowid FROM session
                  WHERE revoked_at IS NOT NULL AND revoked_at < :cutoff_revoked LIMIT 500);
```

Konsekuensi yang harus diketahui: `rotated_from` dipakai untuk mendeteksi replay
sid lama. Sesudah barisnya dihapus, sid lama yang diputar ulang tidak lagi
terdeteksi sebagai **replay**, ia terdeteksi sebagai **tidak dikenal** → tidak
ada sesi → gagal tertutup (murid diminta identitas baru). Arah gagalnya benar,
tapi jejak forensiknya hilang sesudah satu hari. Menahan sesi kedaluwarsa lebih
lama demi forensik = menyimpan arsip perangkat per murid; kontrak privasi
menang, forensik kalah. Itu keputusan yang diambil di sini, bukan kelalaian.

### 2.3 `anon_issue` — 2 hari

```sql
-- :cutoff_day = hari_ini_WIB dikurangi 1 hari
DELETE FROM anon_issue
 WHERE (day, ip_hmac) IN (SELECT day, ip_hmac FROM anon_issue WHERE day < :cutoff_day LIMIT 1000);
```

Rem penerbitan identitas anonim hanya melihat **hari ini** (kunci `day` +
`ip_hmac`), dan salt-nya dirotasi harian sehingga baris hari lampau bahkan tidak
bisa dibandingkan dengan hari ini. Menyimpannya = arsip IP ter-HMAC per hari,
yang dilarang semangat bab 29. Satu hari cadangan disimpan hanya untuk
menyelamatkan analisis penyalahgunaan yang sedang berjalan melewati tengah malam.

### 2.4 `identity.issue_ip_hmac` — ≤ 24 jam, TANPA menghapus baris

```sql
-- :cutoff_ms = now_ms - 86_400_000
UPDATE identity SET issue_ip_hmac = NULL
 WHERE rowid IN (SELECT rowid FROM identity
                  WHERE issue_ip_hmac IS NOT NULL AND created_at < :cutoff_ms LIMIT 500);
```

Ini satu-satunya kueri retensi yang **memindai tabel** (`SCAN identity`), dan itu
disengaja: menambah indeks demi pembersih sekali sehari berarti satu baris
tertulis tambahan **setiap penerbitan identitas** di jalur panas. Pada 5.000
identitas, pemindaian ini membaca 5.000 baris satu kali sehari — 0,1% dari kuota
baca gratis 5 juta baris/hari. Indeksnya baru layak kalau tabel `identity`
melewati ~200.000 baris; sampai itu terjadi, JANGAN menambahkannya.

DDL `0001_identity.sql` **sudah menjanjikan** kolom ini di-NULL-kan dalam 24 jam.
Selama kueri di atas belum dipasang di cron, janji itu **tidak dipenuhi**.
Ini P0 privasi, bukan pekerjaan rumah opsional.

### 2.5 `dau_dedup` — nol hari, tapi harus tuntas

Rollup sudah memanggil `purgeDauDedup(db, day)` yang menjalankan
`DELETE FROM dau_dedup WHERE day = ?1` — **satu pernyataan tanpa `LIMIT`**. Pada
5.000 token itu aman; pada ratusan ribu token itu melampaui batas eksekusi D1 dan
purge GAGAL — dan purge yang gagal mengubah tabel ini menjadi arsip perangkat
harian, persis yang dilarang kontrak. Versi ber-batas yang harus menggantikannya
begitu DAU melewati ~50.000:

```sql
-- :day = hari yang sudah di-rollup
DELETE FROM dau_dedup
 WHERE (day, token) IN (SELECT day, token FROM dau_dedup WHERE day <= :day LIMIT 1000);
```

Ulangi sampai 0 baris. **Tabrakan dengan kontrak privasi, dinyatakan terbuka:**
pembersihan ber-batch bisa berhenti separuh jalan kalau eksekusi cron kehabisan
waktu, sehingga token sebagian masih ada beberapa jam. Yang menutupnya adalah
`purgeDauDedupOlderThan()` (`day <= ?`) sebagai jaring pengaman di eksekusi cron
berikutnya. Batas jujurnya: token bertahan **jam**, bukan hari — dan tetap tidak
bisa dihubungkan antar hari, karena pepper dua putaran lalu sudah hilang permanen.

### 2.6 Tabel agregat analytics — permanen

`metrics_daily`, `usage_daily`, `retention_daily` **tidak** dibersihkan. Tidak
ada individu di dalamnya, dan biayanya kecil: pada 5.000 pengguna aktif, seluruh
`fiezel-stats` bertambah **± 1,8 MB per tahun** (metrics 458 kB + usage 983 kB +
retention 139 kB + puncak harian dau_dedup 242 kB). 500 MB tercapai dalam ratusan
tahun. Menghapusnya justru merugikan: agregat historis tidak bisa direkonstruksi
dari perangkat murid mana pun.

`purgeUsageOlderThan()` dan `purgeRetentionOlderThan()` tetap ada di
`analytics-store-d1.js` sebagai alat kalau suatu hari `bucket` meledak (mis.
enum bocor jadi teks bebas). Keduanya **tidak dipanggil** hari ini, dan itu
keputusan, bukan kelupaan.

### 2.7 `learner_evidence` / `learner_evidence_state` — 180 hari

Lane bukti belajar **per-murid** (SLOT 9, `evidence/route-learner-evidence.js`)
adalah satu-satunya tempat di FIEZEL yang menyimpan dimensi belajar terikat
`identity.sub`. Karena itu retensinya adalah keputusan yang ditulis, bukan
default yang lahir diam-diam:

- **180 hari**, bukan 14 hari seperti lane agregat. Alasan 14 hari di lane
  agregat adalah `cohort` yang tidak dipurge berubah menjadi identitas seumur
  hidup dengan nama lain; di lane ini identitasnya memang sudah ada sejak awal,
  jadi argumen itu tidak berlaku. **m025-235: gerbang persetujuan dihapus**
  (keputusan OWNER — aplikasi kelas, guru memberitahu muridnya sebelum memasang),
  sehingga retensi 180 hari ini menjadi satu-satunya batas otomatis yang tersisa.
  Justru karena itu ia tidak boleh dinaikkan diam-diam.
- **180 hari, bukan selamanya.** Dua semester sekolah cukup untuk melihat
  perkembangan satu tahun ajaran, dan tetap punya ujung. Angkanya hidup di
  `LEARNER_EVIDENCE_LIMITS.RETENTION_DAYS`
  (`workers/api/evidence/learner-evidence-core.js`); menaikkannya berarti
  mengubah baris itu **dan** tabel di §1 **dan** bagian ini — bukan menambah
  data diam-diam.

Dua jalur penghapusan, dan keduanya harus ada:

1. **Retensi berkala** — SUDAH TERPASANG: `runLearnerEvidencePurge()` di
   `workers/api/route-wiring.js`, dijalankan `runScheduled()` pada trigger 00:05
   WIB yang sudah ada, memakai binding `CORE_DB` langsung (aturan 0.1). Ia berdiri
   di luar `withCronRun` rollup analytics: kegagalan purge tidak boleh menandai
   rollup gagal, dan sebaliknya. Batas kejujuran yang sama dengan `runEvidencePurge`
   berlaku — hasilnya hanya muncul di nilai balik `runScheduled`, jadi purge yang
   gagal TIDAK terlihat di `/api/owner/cron-status`.
2. **Penghapusan atas permintaan** — `POST /api/braincore/learner-evidence/consent`
   dengan `{"granted":false}` menjalankan `revokeConsent()`, yang **menghapus**
   baris bukti murid itu, bukan sekadar menandainya. Sejak m025-235 (gerbang
   persetujuan dihapus) rute ini bukan lagi pencabutan izin melainkan tombol
   hapus, dan ia **sekali jalan**: tulisan berikutnya dari murid yang sama
   diterima lagi. Di klien ia dipapar sebagai `window.forgetLearnerEvidence()`,
   tanpa UI — dijalankan owner dari konsol di perangkat murid yang bersangkutan.

```sql
-- Retensi 180 hari. Pola rowid+LIMIT yang sama dengan §2.1: D1 tidak mendukung
-- `DELETE … LIMIT`, dan satu DELETE tak terbatas di tabel yang tumbuh adalah
-- cara termudah melewati batas waktu pernyataan. Ulangi sampai changes = 0.
DELETE FROM learner_evidence WHERE rowid IN (
  SELECT rowid FROM learner_evidence WHERE day < :batas LIMIT 500);
DELETE FROM learner_evidence_state WHERE rowid IN (
  SELECT rowid FROM learner_evidence_state WHERE last_day < :batas LIMIT 500);
```

```sql
-- "Hapus bukti belajar saya" (pencabutan persetujuan). Dijalankan otomatis oleh
-- revokeConsent(); disalin di sini supaya bisa dijalankan tangan bila perlu.
DELETE FROM learner_evidence WHERE rowid IN (
  SELECT rowid FROM learner_evidence WHERE sub = :sub LIMIT 500);
DELETE FROM learner_evidence_state WHERE rowid IN (
  SELECT rowid FROM learner_evidence_state WHERE sub = :sub LIMIT 1);
UPDATE learner_evidence_consent SET revoked_at = :now WHERE sub = :sub;
-- Nama TIDAK ikut terhapus oleh pencabutan persetujuan (lihat §2.8), jadi
-- permintaan "hapus data saya" yang sungguhan harus menyebutnya sendiri.
DELETE FROM learner_name WHERE rowid IN (
  SELECT rowid FROM learner_name WHERE sub = :sub LIMIT 1);
```

Baris `learner_evidence_consent` sengaja **tidak** ikut dihapus: catatan bahwa
seseorang pernah memberi lalu mencabut izin adalah satu-satunya hal yang
mencegah lane menulis lagi diam-diam, dan isinya hanyalah `sub` + dua stempel
waktu + versi teks persetujuan — nol dimensi belajar.

### 2.8 `learner_name` — 180 hari tanpa penulisan

Nama panggilan yang **wajib** diisi murid di langkah pertama perkenalan, disimpan
di server dan terikat `identity.sub` (keputusan OWNER 2 Sep 2026,
`0010_learner_name.sql`). Ia yang membuat Owner Dashboard bisa menyebut murid
dengan namanya alih-alih delapan hex `sub`-nya.

Retensinya **180 hari dihitung dari penulisan terakhir**, bukan dari pembuatan:
klien menyegarkan `name_day` maksimum **sekali sehari** (`LEARNER_NAME_SYNC_KEY`
di `app.js`), jadi

- murid yang masih memakai FIEZEL → namanya tidak pernah kedaluwarsa;
- murid yang berhenti memakai FIEZEL → namanya hilang sendiri 180 hari kemudian,
  tanpa ada yang perlu mengingat untuk menghapusnya.

Angkanya sengaja SAMA dengan retensi bukti per-murid: nama yang bertahan lebih
lama daripada buktinya adalah daftar nama tanpa guna, dan nama yang hilang lebih
cepat daripada buktinya adalah dashboard yang tiba-tiba berisi murid tanpa nama.

```sql
-- Retensi 180 hari. Pola rowid+LIMIT yang sama dengan §2.1.
DELETE FROM learner_name WHERE rowid IN (
  SELECT rowid FROM learner_name WHERE name_day < :batas LIMIT 500);
```

**Yang TIDAK dilakukan penghapusan bukti.** `revokeConsent()` menghapus bukti
belajar murid itu, **bukan** namanya — keduanya data yang berbeda dengan alasan
yang berbeda. Nama adalah identitas tampilan yang murid berikan sendiri di
perkenalan; bukti adalah keadaan belajarnya. Menggabungkan keduanya berarti
sekali hapus bukti, namanya ikut hilang, lalu klien mengirimnya lagi besok pagi
lewat penyegaran harian — data yang "dihapus" lalu hidup kembali adalah janji
penghapusan yang tidak ditepati. Penghapusan nama atas permintaan ada di §4.

---

## 3. Tabrakan dengan kebutuhan kuota — daftar lengkap

1. **`quota_daily` hari ini tidak boleh dihapus.** `DELETE … WHERE day <
   :cutoff` dengan `cutoff = hari_ini` akan mengembalikan kuota semua murid
   (`ai_used` → hilang → 20 permintaan baru). Setiap perubahan pada kueri 2.1
   wajib mempertahankan `<` dan `cutoff ≤ hari_ini − 1`.
2. **`quota_reservation` tidak boleh dihapus lebih agresif daripada TTL.**
   Menghapus lease yang belum kedaluwarsa membuat `commitD1()` melaporkan
   `reservation_expired` → permintaan itu GRATIS. Arah salahnya disengaja
   (murid tidak ditagih untuk barang yang tidak jelas terkirim), tapi kalau
   retensi ikut menghapus lease hidup, penegakan kuota bocor sistematis.
   Karena itu retensi lease **hanya** lewat `sweepExpiredReservations()`, dan
   dokumen ini tidak menambah pernyataan `DELETE` untuk tabel itu.
3. **`session` vs kuota:** menghapus sesi tidak menyentuh kuota (kuota terikat
   `user_id`/`sub`, bukan `sid`). Murid yang sesinya dihapus akan mendapat sesi
   baru untuk `sub` yang sama — kuotanya TIDAK reset. Itu memang yang
   diinginkan.
4. **`identity` vs kuota:** menghapus baris `identity` akan memutus semua kuota
   dan klaim akun. Lihat catatan 6.
5. **Retensi analytics vs kuota:** tidak ada tabrakan yang mungkin, karena tidak
   ada kolom penghubung. Kalau suatu hari ada, retensi bukan lagi masalah
   terbesarnya.

---

## 4. Catatan 6 — kenapa `identity` tidak pernah dihapus

`session ON DELETE CASCADE` menggantung pada `identity(sub)`. Menghapus satu
baris `identity` = mencabut identitas murid: kuota hari itu hilang (dia dapat
kuota baru — kerugian owner), klaim akun Puter (`legacy_ref_hmac`) hilang
sehingga klaim berikutnya **MEMBUAT identitas baru** alih-alih mengadopsi yang
lama, dan `revoked_at` ("lupakan perangkat ini") kehilangan artinya karena `sub`
yang sama bisa diterbitkan ulang. Yang dibersihkan dari `identity` adalah
**kolom turunan** (`issue_ip_hmac`, dan `legacy_ref_hmac` saat Puter dicabut),
bukan barisnya.

Kalau suatu saat owner tetap perlu menghapus identitas (permintaan penghapusan
data), itu adalah operasi manual per-`sub`, tercatat, dan bukan pekerjaan cron:

```sql
-- Urutan ini WAJIB: anak dulu, induk terakhir. Bentuk `rowid IN (SELECT … LIMIT n)`
-- dipakai juga di sini walaupun satu orang hanya punya sedikit baris, karena
-- aturannya mutlak: TIDAK ADA `DELETE` di repo ini tanpa `WHERE` DAN `LIMIT`.
-- Aturan mutlak bisa digerbangi (`d1-schema-contract-test.js`); "biasanya kecil"
-- tidak bisa. Ulangi tiap pernyataan sampai `meta.changes` = 0.
DELETE FROM session WHERE rowid IN (
  SELECT rowid FROM session WHERE sub = :sub LIMIT 500);
DELETE FROM quota_daily WHERE rowid IN (
  SELECT rowid FROM quota_daily WHERE user_id = :sub LIMIT 500);
DELETE FROM quota_reservation WHERE rowid IN (
  SELECT rowid FROM quota_reservation WHERE user_id = :sub LIMIT 500);
DELETE FROM identity WHERE rowid IN (
  SELECT rowid FROM identity WHERE sub = :sub LIMIT 1);
```

Tidak ada satu pun baris di `fiezel-stats` yang perlu (atau bisa) dihapus untuk
permintaan itu — karena tidak ada baris per-orang di sana. Itulah untungnya
kontrak privasi: "hapus data saya" adalah empat pernyataan di satu database.

---

## 5. Kalau retensi tidak dipasang: angka pertumbuhannya

Pada 5.000 pengguna aktif harian, tanpa pembersih 00:05 WIB:

- `quota_daily` + `session` bertambah **± 1,94 MB/hari** (0,96 + 0,98).
- Batas **500 MB per database (plan gratis)** tercapai dalam **± 8 bulan**.
- Sesudah batas itu: D1 menolak `INSERT`, dan juga menolak pembuatan tabel/indeks
  sampai data lama dibersihkan
  ([Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)).
  Artinya pembersih yang tidak dipasang hari ini akan dipasang dalam keadaan
  darurat, ketika database sudah penuh dan murid sudah tidak bisa memakai AI.

Rincian batas dan ambang tindakan ada di `docs/D1-CAPACITY.md`.
