# Rencana pertumbuhan D1 — angka, batas resmi, dan kapan owner harus khawatir

Semua batas di bawah **diverifikasi dari dokumentasi Cloudflare**, bukan diingat:

| Batas plan GRATIS | Nilai | Sumber |
|---|---|---|
| Baris **ditulis** per hari | **100.000** (seluruh akun, reset 00:00 UTC = **07:00 WIB**) | [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) |
| Baris **dibaca** per hari | **5.000.000** (seluruh akun) | [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) |
| Ukuran maksimum satu database | **500 MB** | [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) |
| Penyimpanan maksimum per akun | **5 GB** | [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) |
| Jumlah database per akun | **10** (repo ini memakai 2) | [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) |
| Kueri per pemanggilan Worker | **50** | [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) |
| Time Travel (pemulihan titik-waktu) | **7 hari** (Paid: 30 hari) | [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) |
| Harga sesudah upgrade (Workers Paid) | baris ditulis: 50 juta/bulan termasuk, lalu **US$1,00/juta**; baris dibaca: 25 miliar/bulan termasuk, lalu **US$0,001/juta**; penyimpanan: 5 GB termasuk, lalu **US$0,75/GB-bulan** | [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) |

Dua fakta yang mengubah cara menghitung:

1. **Indeks menambah baris tertulis.** "Indexes add an additional written row
   when writes include the indexed column… Writing to columns referenced in an
   index adds at least one (1) additional row written"
   ([D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)). Itulah
   sebabnya `0004_indexes.sql` **menggabungkan** indeks alih-alih menambah.
2. **Satu database D1 single-threaded:** "Each individual D1 database is
   inherently single-threaded, and processes queries one at a time"
   ([D1 limits](https://developers.cloudflare.com/d1/platform/limits/)). Kuota
   dan analytics dipisah ke dua database bukan hanya demi privasi — juga supaya
   rollup analytics tidak menyerialisasi jalur penegakan kuota.

---

## 1. Asumsi pemakaian (ubah di sini, bukan di kesimpulan)

| Asumsi | Nilai | Dari mana |
|---|---|---|
| Operasi berkuota per pengguna aktif per hari | **14** (8 AI + 6 TTS cache-MISS) | `AI_LIMIT_PER_DAY=20`, `TTS_CHARS_PER_DAY=6000` di `wrangler.toml`; cache-hit TTS **tidak** menyentuh D1 (R4 di `quota-store-d1.js`) |
| Sesi baru per pengguna per hari | 1 | cookie sliding 30 hari, tapi diambil terburuk |
| Event analytics per pengguna per hari | 25, terkumpul jadi ~5 metrik + ~8 bucket + 1 token DAU + 1 kohor | `analytics-core.js` (agregasi klien → satu batch) |
| Byte per baris | terukur, bukan taksiran | `analysis/a6-d1-index-plans.json` |

Byte per baris terukur (20.000 baris sintetis + `VACUUM`, termasuk indeks):

| Tabel | Sebelum 0004 | Sesudah 0004 |
|---|---:|---:|
| `quota_daily` | 154,2 B | **191,7 B** (indeks (day,user_id) lebih lebar) |
| `quota_reservation` | 275,3 B | **257,2 B** (3 indeks → 2) |
| `identity` | 323,0 B | sama |
| `session` | 195,0 B | sama |
| `anon_issue` | 50,8 B | sama |
| `dau_dedup` | 48,3 B | sama |
| `metrics_daily` | 62,7 B | sama |
| `usage_daily` | 44,9 B | sama |
| `retention_daily` | 38,1 B | sama |

---

## 2. Baris DITULIS per hari — batas yang mengikat lebih dulu

Per **satu** operasi berkuota (reserve → commit), sesudah `0004_indexes.sql`:

| Pernyataan | Baris tabel | Baris indeks | Total |
|---|---:|---:|---:|
| `UPDATE quota_daily` (gerbang reserve) | 1 | 0 (kolom indeks tidak berubah) | 1 |
| `INSERT quota_reservation` | 1 | 2 (`expires_at`, `(day,user_id)`) | 3 |
| `UPDATE quota_daily` (commit) | 1 | 0 | 1 |
| `DELETE quota_reservation` | 1 | 2 | 3 |
| | | | **8** (sebelum 0004: **10**) |

Sekali per pengguna per hari: baris `quota_daily` baru (2), `UPDATE identity
last_seen_day` (2, karena `ix_identity_seen` ikut ditulis), `INSERT session` (3),
`anon_issue` (1) = **8**.

```
fiezel-core  = 14 × 8 + 8            = 120 baris ditulis / pengguna aktif / hari
fiezel-stats = 10 (metrik) + 8 (bucket) + 1 (token DAU) + 2 (kohor) + 1 (purge)
                                     =  22
TOTAL                                = 142 baris ditulis / pengguna aktif / hari
```

| Pengguna aktif harian | Baris ditulis/hari | % batas gratis (100.000) | Keputusan |
|---:|---:|---:|---|
| 100 | 14.200 | **14%** | aman, tidak perlu apa-apa |
| 1.000 | 142.000 | **142%** | **SUDAH LEWAT** — D1 menolak kueri sampai reset |
| 5.000 | 710.000 | **710%** | wajib Workers Paid; 21,3 juta/bulan, masih di bawah 50 juta yang termasuk → biaya tambahan D1 **US$0** |

**Ambang persisnya: 100.000 ÷ 142 ≈ 704 pengguna aktif harian.**
Sebelum `0004_indexes.sql` angkanya 100.000 ÷ 170 ≈ **588**. Jadi migrasi indeks
itu membeli **± 116 pengguna** ruang kepala (+20%) tanpa mengubah satu baris kode.

---

## 3. Baris DIBACA per hari — batas kedua, jauh lebih longgar

```
per operasi berkuota           ≈ 6 baris  → 14 × 6 = 84 / pengguna / hari
reconcileHeld (cron 5 menit)   = 288 × jumlah pengguna hari itu   ← DOMINAN
sweep lease (cron 5 menit)     ≈ 600 / hari total
rollup harian                  ≈ 1 × jumlah pengguna
                               ≈ 372 baris dibaca / pengguna aktif / hari
```

| Pengguna aktif harian | Baris dibaca/hari | % batas gratis (5 juta) |
|---:|---:|---:|
| 100 | 37.800 | 0,8% |
| 1.000 | 372.600 | 7,5% |
| 5.000 | 1.860.000 | **37%** |

Ambang baca ≈ 5.000.000 ÷ 372 ≈ **13.400 pengguna aktif**. Jadi **batas TULIS
mengikat lebih dulu, ± 19× lebih cepat** daripada batas baca. Semua usaha
optimasi harus diarahkan ke tulis, bukan baca.

`reconcileHeld()` sendiri adalah 77% dari pembacaan pada 5.000 pengguna
(288 × 5.000 = 1,44 juta). `0004_indexes.sql` membuat pemindaiannya COVERING
sehingga tidak ada lagi pengambilan baris tabel per pengguna. Langkah berikutnya
(kalau perlu, **belum dilakukan**): jalankan rekonsiliasi hanya untuk pengguna
yang punya lease terbuka — daftarnya sudah ada di `quota_reservation` dan
ukurannya sekecil jumlah permintaan in-flight, bukan sebesar jumlah pengguna.
Itu perubahan kode di `quota-store-d1.js`, bukan perubahan skema.

---

## 4. Penyimpanan

Dengan retensi dari `docs/D1-RETENTION.md` (quota_daily 90 hari, session
kedaluwarsa+1 hari, anon_issue 2 hari):

| | 100 pengguna | 1.000 pengguna | 5.000 pengguna |
|---|---:|---:|---:|
| `quota_daily` (90 hari) | 1,7 MB | 17,3 MB | 86,3 MB |
| `session` (30 hari) | 0,6 MB | 5,9 MB | 29,3 MB |
| `identity` (kumulatif) | 0,03 MB | 0,3 MB | 1,6 MB |
| `anon_issue` (2 hari) | 0,01 MB | 0,1 MB | 0,5 MB |
| `quota_reservation` (in-flight) | ~0 | 0,1 MB | 0,5 MB |
| **`fiezel-core` total** | **± 2,4 MB** | **± 23,7 MB** | **± 118 MB** dari 500 MB (24%) |
| **`fiezel-stats` total** | < 1 MB/tahun | ± 1,3 MB/tahun | **± 1,8 MB/tahun** |

Tanpa retensi, pada 5.000 pengguna aktif `quota_daily` + `session` bertambah
**1,94 MB/hari** → batas **500 MB per database** tercapai dalam **± 8 bulan**,
dan sesudah itu D1 gratis menolak `INSERT` maupun pembuatan indeks sampai data
lama dibersihkan ([D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)).

---

## 5. KAPAN OWNER HARUS KHAWATIR (ambang tindakan)

| Pemicu | Angka | Yang harus dilakukan | Biaya |
|---|---|---|---|
| **Pemantauan belum ada** | sekarang | Baca "rows written" harian di dasbor D1 sekali seminggu. Tanpa angka ini, semua di bawah cuma teori. | 0 |
| Retensi belum terpasang | sekarang | Pasang pembersih 00:05 WIB (`docs/D1-RETENTION.md` §2). Tiga tabel tumbuh selamanya sampai itu jalan. | 0 |
| **300 pengguna aktif/hari** | 43% batas tulis | Mulai pantau harian, bukan mingguan. Putuskan langkah §3 (rekonsiliasi berbasis lease). | 0 |
| **420 pengguna aktif/hari** | 60% batas tulis | **Siapkan Workers Paid (US$5/bulan).** Jangan tunggu 100%: kalau batas tembus pukul 21:00 WIB, matinya sampai **07:00 WIB** (reset 00:00 UTC) — melewati seluruh jam belajar malam dan pagi. | US$5/bulan |
| **704 pengguna aktif/hari** | 100% batas tulis | Terlambat. D1 mengembalikan error, penegakan kuota mati, AI/TTS mati (gagal tertutup). | — |
| `fiezel-core` > **250 MB** | 50% batas database | Perpendek retensi `quota_daily` 90 → 30 hari (hemat ± 57 MB pada 5.000 pengguna) sebelum menaikkan plan. | 0 |
| Butuh atomisitas lease sungguhan | — | Durable Object; menuntut Workers Paid. Biaya DO sendiri ± US$0,08/bulan pada 5.000 pengguna (cf-a11 §2.2) — jadi yang dibayar praktis hanya US$5 langganan. | US$5/bulan |

Sesudah upgrade ke Workers Paid, pada 5.000 pengguna aktif: 21,3 juta baris
ditulis/bulan (batas termasuk 50 juta) dan ± 56 juta baris dibaca/bulan (batas
termasuk 25 miliar) → **tagihan D1 tambahan US$0**. Yang dibayar adalah US$5
langganan Workers, dan itu satu-satunya angka yang perlu disampaikan ke owner.

---

## 6. Yang TIDAK bisa dijanjikan dokumen ini

- Angka 14 operasi/pengguna/hari adalah **asumsi**, dan seluruh tabel di atas
  linear terhadapnya. Kalau ternyata murid memakai 20 AI penuh + 13 blok TTS,
  kalikan dengan 2,4× → ambang tulis jatuh ke ± 290 pengguna aktif. Angka
  sungguhan hanya bisa datang dari dasbor D1 sesudah produksi hidup.
- "Baris dibaca" yang ditagih Cloudflare mencakup baris indeks yang dipindai;
  estimasi 6 baris/operasi di §3 adalah perkiraan konservatif dari rencana kueri,
  bukan hasil pengukuran pada D1 sungguhan.
- Batas 100.000 tulis/hari berlaku **untuk seluruh akun**, bukan per database.
  Kalau owner menambahkan database D1 lain di akun yang sama (mis. proyek lain),
  jatah ini dibagi — dan bab ini akan salah tanpa peringatan.
