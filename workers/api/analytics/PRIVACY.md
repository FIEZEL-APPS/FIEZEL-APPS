# Data yang FIEZEL Kumpulkan (dan yang Tidak)

Dokumen ini bisa dipakai apa adanya untuk menjawab murid, orang tua, atau sekolah.
Isinya bukan janji pemasaran — setiap baris di sini dijaga oleh gerbang otomatis
(`tests/analytics-privacy-test.js`, `tests/analytics-aggregate-test.js`,
`tests/analytics-server-only-test.js`) yang gagal kalau kodenya menyimpang.

Acuan: `PROMT-BARU.txt` bab 29 dan keputusan owner di `EXEC-BRIEF-CF.md`
bagian "KONTRAK ANALYTICS PRIVASI-MAKSIMAL".

---

## 1. Prinsipnya satu kalimat

**FIEZEL menghitung berapa banyak orang yang belajar, tanpa mengenali siapa pun.**

Tidak ada akun yang bisa ditelusuri dari data analytics. Tidak ada tabel berisi
"apa yang dilakukan murid X". Yang ada hanya penghitung: hari ini ada 312
perangkat aktif, 1.204 pertanyaan dijawab, 87 permintaan AI. Titik.

---

## 2. Bagaimana FIEZEL bisa menghitung orang tanpa mengenali orang

1. Saat aplikasi pertama kali dibuka, perangkat membuat **installId** — angka
   acak (UUID). **installId tidak pernah dikirim ke server. Sekali pun.** Ia
   hanya ada di dalam browser murid.
2. Setiap hari, perangkat mengambil satu "pepper" hari itu dari server, lalu
   menghitung sendiri:
   `visitor_token = HMAC-SHA256(pepper_hari_ini, installId)` dipotong 128 bit.
3. Yang dikirim ke server **hanya token 32 karakter** itu. Server menghitung
   token unik per hari → itulah angka pengguna aktif harian (DAU). Token dicatat
   dari perangkat yang **membuka aplikasi** (`app_open`) maupun yang mencapai
   ambang aktif (`day_active`); keduanya di-dedup, jadi satu perangkat tetap
   satu hitungan.
4. Setiap 24 jam pepper diganti, dan **pepper lama dihapus permanen**.
5. Pepper hari itu **dibuat saat pertama kali dibutuhkan** kalau belum ada
   (mis. hari pertama basis data hidup), memakai penulisan idempoten di D1
   sehingga dua permintaan bersamaan tidak mungkin menghasilkan dua pepper
   berbeda. Pembuatan pertama ini **bukan rotasi**: ia tidak menyentuh
   `previous` dan tidak menggeser irama rotasi harian.

Akibatnya: token hari Senin dan token hari Selasa dari perangkat yang sama
terlihat sebagai dua nilai acak yang tidak berhubungan. Server tidak bisa
menyambungkannya — bukan karena kami berjanji tidak melakukannya, tetapi karena
kuncinya sudah tidak ada lagi.

### Kenapa token tidak bisa dibalik ke installId

- HMAC-SHA256 adalah fungsi satu arah, dan hasilnya masih dipotong separuh
  (128 bit dibuang). Tidak ada jalan matematis dari token kembali ke masukannya.
- Menebak juga tidak bisa: installId adalah UUID acak (122 bit). Tidak ada
  daftar untuk dicoba satu per satu.
- Dan yang paling menentukan: **server tidak pernah memiliki installId**, jadi
  server bahkan tidak bisa mencocokkan tebakan dengan aslinya.

---

## 3. Daftar lengkap yang dikumpulkan

Semua field di bawah adalah pilihan tertutup (enum), angka, atau benar/salah.
**Tidak ada satu pun field teks bebas**, karena teks bebas adalah pintu masuk
nama, email, dan isi jawaban.

### 3.1 Dikirim oleh perangkat murid

| Event | Field | Contoh isi |
|---|---|---|
| `app_open` | `visitor_token`, `has_identity`, `platform`, `app_version` | `a3f1…` (32 hex), `true`, `android`, `5.23.0` |
| `day_active` | `visitor_token`, `attempts_bucket`, `platform` | `a3f1…`, `10-29`, `desktop` |
| `session_started` | `mode`, `level` | `adaptive`, `B1` |
| `session_ended` | `mode`, `level`, `completed`, `answered`, `duration_bucket` | `lesson`, `A2`, `true`, `12`, `2-10m` |
| `lesson_started` | `domain`, `level` | `grammar`, `B1` |
| `lesson_completed` | `domain`, `level` | `reading`, `A2` |
| `question_answered` | `domain`, `level`, `ok` | `vocabulary`, `A1`, `false` |
| `retention_ping` | `cohort_day`, `day_index` | `2026-08-01`, `7` |

`platform` sengaja hanya tiga nilai: `android`, `ios`, `desktop`. Bukan
User-Agent lengkap, karena User-Agent lengkap adalah sidik jari.

`attempts_bucket` dan `duration_bucket` adalah rentang, bukan angka presisi:
"10-29 latihan", bukan "17 latihan pada 20:43:11". Angka presisi waktu adalah
pola kehadiran seseorang, dan itu tidak dibutuhkan untuk mengelola produk.

### 3.2 Diterbitkan server sendiri (perangkat tidak bisa mengirim ini)

| Event | Field |
|---|---|
| `user_created` | `kind` (`anon_learner`/`authenticated`), `platform` |
| `ai_request` | `task`, `model`, `prompt_tokens_est` |
| `ai_success` | `task`, `model`, `out_tokens`, `latency_bucket` |
| `ai_failure` | `task`, `code` (`429`/`timeout`/`4xx`/`5xx`/`other`), `latency_bucket` |
| `tts_request` | `engine`, `chars_bucket` |
| `tts_success` | `engine`, `cache` (`hit`/`miss`), `chars_rendered`, `latency_bucket` |
| `tts_failure` | `engine`, `code` |
| `quota_exhausted` | `kind` (`ai`/`tts`/`translate`/`gem`) |
| `circuit_opened` | `module`, `reason`, `failures` |
| `circuit_recovered` | `module`, `open_duration_bucket` |

Kenapa ini harus dari server: semua event di atas berkaitan dengan **uang**
(biaya AI/TTS) dan **keamanan** (kuota, pemutus arus). Kalau perangkat yang jadi
sumbernya, satu skrip bisa mengarang ribuan pengguna baru atau menyembunyikan
kegagalan. Gerbang `tests/analytics-server-only-test.js` menolak event-event ini
kalau datang dari klien, dengan kode `400 server_only`.

### 3.3 Yang benar-benar disimpan di basis data

Hanya lima tabel, dan hanya satu yang menyentuh nilai per-perangkat:

| Tabel | Isi | Umur simpan |
|---|---|---|
| `metrics_daily(day, metric, value)` | penghitung harian (DAU, jumlah jawaban, panggilan AI, …) | permanen — tidak ada individu di dalamnya |
| `usage_daily(day, bucket, count)` | dimensi berenum (`lesson_domain:grammar`) | 90 hari |
| `retention_daily(cohort_day, day_index, count)` | jumlah perangkat yang masih kembali di hari ke-N | 400 hari |
| `dau_dedup(day, token)` | token harian, **hanya untuk menghitung DAU** | **dihapus tiap malam setelah rollup** |
| `pepper_state(rotated_at, current, previous)` | pepper hari ini + satu pepper sebelumnya | pepper dua putaran lalu hilang permanen |

**Tidak ada tabel per-orang untuk analytics. Nol.**

---

## 4. Yang TIDAK dikumpulkan

Daftar ini tegas, dan gerbang otomatis memindai seluruh skema serta kode untuk
memastikan tidak ada yang menyelinap masuk:

- **Nama murid.** Tidak dikirim, tidak disimpan, tidak ada kolomnya.
- **Email.** Sama.
- **UUID akun penyedia (Puter) mentah.** Tidak pernah masuk analytics.
- **IP mentah.** IP hanya dipakai sebagai kunci rem anti-banjir di memori,
  sudah dalam bentuk hash, dan **tidak pernah ditulis ke basis data**.
- **Teks soal, pilihan jawaban, jawaban yang dipilih, jawaban benar.** Yang
  disimpan hanya "benar" atau "salah", tanpa soalnya.
- **Transkrip suara** dari latihan speaking/listening.
- **Isi prompt maupun isi respons AI.** Yang dicatat hanya jumlah token dan
  latensi — angka tagihan, bukan isi percakapan.
- **Lokasi**, kota, negara, koordinat.
- **User-Agent lengkap**, resolusi layar, daftar font, daftar bahasa — semua
  bahan sidik jari perangkat.
- **`installId`.** Ini yang paling penting: yang keluar dari perangkat hanyalah
  turunan satu arahnya yang berganti setiap hari.

### Larangan yang mudah dilupakan: kuota dan analytics tidak boleh disambung

Kuota AI/TTS **memang** per-murid — tanpa identitas, kuota tidak bisa ditegakkan.
Tabel kuota memakai `user_id`. Tabel analytics memakai token harian.
**Tidak ada kolom penghubung di antara keduanya**, keduanya hidup di database D1
yang berbeda, dan JOIN-nya bukan sekadar dilarang kebijakan — ia tidak bisa
ditulis. Peringatan ini tertulis besar di `migrations/0002_analytics.sql`, dan
gerbang privasi akan merah kalau ada yang menambahkan `user_id` ke tabel
analytics.

---

## 5. KEJUJURAN: angka DAU dan retention adalah estimasi PERANGKAT, bukan orang

Bagian ini tidak boleh dipoles. Owner harus tahu apa yang dibeli dengan privasi
maksimal:

1. **Satu orang dengan dua perangkat terhitung dua kali.** Murid yang belajar di
   HP pagi dan di laptop malam muncul sebagai dua "pengguna aktif". Kami tidak
   bisa menggabungkannya, karena menggabungkannya berarti mengenali orangnya.
2. **Menghapus data browser = perangkat baru.** installId ikut terhapus, jadi
   murid yang sama muncul sebagai pengguna baru. Ini juga terjadi saat pindah
   browser, memakai mode incognito, atau mengganti HP.
3. **WAU/MAU tidak bisa berupa satu angka pasti.** Karena token berganti setiap
   hari dan pepper lama dihapus, tidak ada cara men-dedup perangkat lintas hari.
   Yang dilaporkan adalah **rentang**:
   - `wau_lower` = DAU tertinggi dalam 7 hari (batas bawah yang pasti)
   - `wau_upper` = jumlah DAU 7 hari (batas atas; yang datang beberapa hari
     terhitung berkali-kali)
   Angka sebenarnya ada di antara keduanya. Dashboard **wajib** menampilkannya
   sebagai rentang. Menulis satu angka WAU seolah pasti adalah mengarang.
4. **Retention berbasis pengakuan perangkat.** Perangkat mengirim
   `retention_ping{cohort_day, day_index}` karena ia tahu sendiri kapan
   dipasang. Server hanya menaikkan penghitung. Ini akurat sebagai tren, tetapi
   ia mengukur perangkat yang kembali, bukan orang yang kembali.
5. **Beberapa event adalah laporan-sendiri (self-reported).** Sesi, pelajaran,
   dan jawaban dilaporkan perangkat karena server tidak melihatnya. Angkanya
   bisa lebih rendah kalau aplikasi ditutup sebelum data terkirim, atau saat
   perangkat lama offline. Dashboard menandainya `self-reported`.
6. **Perangkat yang aktif melewati batas rotasi bisa terhitung dua kali pada
   hari yang sama.** Rotasi pepper terjadi pukul 00:05 WIB (17:05 UTC),
   sedangkan tanggal (`day`) dihitung dalam UTC. Perangkat yang aktif sebelum
   dan sesudah 17:05 UTC menghasilkan dua token untuk `day` UTC yang sama, dan
   keduanya terhitung. Ini menaikkan DAU sedikit pada hari-hari sibuk. Ini
   keadaan yang ada sekarang, bukan yang diinginkan; memperbaikinya menuntut
   menyelaraskan batas hari dengan batas rotasi.
7. **Angka historis dimulai dari nol.** Sebelum fitur ini menyala, tidak ada
   event yang pernah dikumpulkan. Dashboard menampilkan tanggal mulai
   pengumpulan agar tidak terlihat seperti "penggunanya baru sedikit".

Ringkas: angka-angka ini **cukup baik untuk mengambil keputusan** (naik atau
turun, fitur mana yang dipakai, berapa biaya AI), dan **tidak cukup untuk
mengklaim jumlah orang secara pasti**. Itu pertukaran yang dipilih dengan sadar.

---

## 6. Kalau ada yang bertanya "boleh saya minta data saya dihapus?"

Jawaban jujurnya: **tidak ada data pribadi yang bisa dicari untuk dihapus,
karena tidak ada data pribadi yang disimpan.** Analytics FIEZEL tidak menyimpan
baris apa pun yang bisa dihubungkan ke seseorang. Token harian yang pernah
dikirim perangkat sudah dihapus pada rollup malam itu. Menghapus data browser
akan menghentikan sepenuhnya hubungan apa pun antara perangkat dan angka-angka
lama, karena installId hilang bersamanya.

Untuk data belajar (progres, level, riwayat latihan): itu tersimpan di perangkat
murid sendiri (local-first), dan menghapus data aplikasi menghapusnya.
