# Memasang backend FIEZEL permanen di cPanel (ArenHost)

Panduan ini memasang `backend/` (FastAPI + MongoDB) supaya konsol kurikulum berhenti
jadi pintu ke ruangan kosong. Ditulis untuk cPanel karena di situlah `fiezel.my.id`
sudah tinggal.

Semua perilaku yang disebut di sini **diukur**, bukan dikira — versi persis dari
`backend/requirements.txt`, Python 3.11.

---

## 0. Dua hal yang harus diterima sejak awal

**MongoDB tidak bisa dipasang di shared hosting cPanel.** Ia butuh proses daemon dan
port sendiri; paket shared tidak memberi keduanya. Databasenya karena itu **wajib**
di luar: MongoDB Atlas (tier gratis M0 cukup untuk memulai, dan ia terkelola —
backup dan update bukan urusanmu lagi).

**Paketmu harus mendukung "Setup Python App"** (Passenger). Cek di cPanel: cari ikon
*Setup Python App* di bagian SOFTWARE. Kalau tidak ada, paketnya tidak bisa menjalankan
FastAPI sama sekali, dan tidak ada trik yang mengubah itu — yang tersisa adalah pindah
ke paket yang mendukung, atau menaruh backend di tempat lain (Render/Railway/VPS)
sambil tetap memakai Atlas. Periksa ini **sebelum** mengerjakan langkah lain.

---

## 1. MongoDB Atlas

1. Buat akun di mongodb.com/atlas → **Create** cluster **M0 (Free)**, pilih region
   terdekat (Singapore untuk Indonesia).
2. **Database Access** → Add New Database User. Simpan sandinya; ia masuk ke
   `MONGO_URL`.
3. **Network Access** → Add IP Address. Isi IP server cPanel-mu (tanya ArenHost, atau
   lihat di cPanel → *Server Information* → Shared IP Address).
   Hindari `0.0.0.0/0` kecuali darurat — itu membuka databasemu ke seluruh internet
   dan satu-satunya yang menjaganya tinggal sandi.
4. **Connect → Drivers → Python** → salin connection string. Bentuknya:
   `mongodb+srv://pengguna:sandi@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

---

## 2. Unggah kode

Unggah **isi** direktori `backend/` ke `~/fiezel-api` di akunmu (File Manager atau
git clone kalau tersedia). Jangan taruh di `public_html` — Passenger tidak
memerlukannya di sana, dan apa pun di `public_html` bisa terunduh mentah oleh siapa
saja. `.env` yang berisi sandi ada di direktori ini.

---

## 3. Setup Python App

cPanel → **Setup Python App** → Create Application:

| Kolom | Isi |
|---|---|
| Python version | 3.11 (atau 3.10; jangan di bawah 3.9) |
| Application root | `fiezel-api` |
| Application URL | subdomain sendiri, mis. `api.fiezel.my.id` |
| Application startup file | `passenger_wsgi.py` |
| Application Entry point | `application` |

Dua kolom terakhir bukan pilihan bebas. Passenger mencari variabel bernama
`application` di berkas yang kamu sebut; salah satu saja meleset hasilnya **503 tanpa
petunjuk apa pun di log**.

Klik **Create**, lalu salin perintah aktivasi virtualenv yang ditampilkan cPanel
(bentuknya `source ~/virtualenv/fiezel-api/3.11/bin/activate && cd ~/fiezel-api`).

---

## 4. Pasang dependensi

Lewat cPanel → *Terminal* (atau SSH):

```bash
source ~/virtualenv/fiezel-api/3.11/bin/activate && cd ~/fiezel-api
pip install -r requirements.txt
```

`a2wsgi` ada di daftar itu dan **wajib**: Passenger berbicara WSGI sedangkan FastAPI
berbicara ASGI, dan `a2wsgi` yang menjembatani. Tanpa itu aplikasinya mati saat impor.

---

## 5. Isi `.env`

Salin `.env.example` jadi `.env` di `~/fiezel-api`, lalu isi:

```bash
cp .env.example .env
nano .env
```

Ketujuhnya **tidak sama daruratnya**. Lima yang pertama menghalangi pemasangan dan
diblokir `bootstrap.py`; dua yang terakhir hanya mematikan satu fitur dan cuma
diperingatkan — jadi kamu bisa memasang **hari ini** walau belum punya semuanya:

| Env | Kalau kosong |
|---|---|
| `MONGO_URL`, `DB_NAME` | server mati saat impor — dibaca di tingkat modul `db.py` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `bootstrap.py` tidak bisa membuat akun ownermu |
| `JWT_SECRET` | nol orang bisa login |
| `OWNER_MASTER_TOKEN` | hanya rute khusus owner yang menolak |
| `EMERGENT_AUTH_SESSION_URL` | hanya tombol "Masuk dengan Google" yang mati; login email+sandi tetap penuh |

Jadi kalau kamu belum punya alamat penukar sesi Google, **kosongkan saja dan lanjut**.

Bangkitkan dua rahasianya dengan:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

`JWT_SECRET` yang bocor berarti siapa pun bisa memalsukan sesi murid dan guru.

Untuk `CORS_ORIGINS`, isi asal aplikasimu: `https://fiezel.my.id`.
**Jangan** isi `*`. Alasannya diukur dan ditulis di komentar CORS
`backend/server.py`: pada starlette 0.37.2, `*` bersama kredensial membuat request
lintas-situs yang membawa cookie dijawab dengan **origin penuntutnya dipantulkan**,
sehingga situs mana pun bisa memanggil API ini dari browser murid yang sedang login
dan membaca jawabannya.

---

## 6. Jalankan bootstrap — LANGKAH INI YANG PALING SERING TERLEWAT

```bash
python bootstrap.py
```

**Kenapa ini tidak boleh dilewati.** `server.py` mengerjakan tiga hal di
`@app.on_event("startup")`: membuat indeks unik, membuat akun owner, dan menyemai
kurikulum. Di bawah Passenger ketiganya **tidak pernah terjadi** — `a2wsgi`
menerjemahkan per-request dan tidak menjalankan protokol lifespan ASGI sama sekali.
Diukur:

```
status : 200 OK
body   : {"ok":true,"startup_sudah_jalan":false}
```

Perhatikan **200 OK**-nya. Itulah yang membuatnya berbahaya: API-nya tampak sehat
sementara `users.email` dan `attempts.idempotency_key` tidak punya indeks unik
(MongoDB lalu dengan patuh menerima email ganda dan jawaban ganda — tanpa galat,
hanya data yang pelan-pelan rusak), akun ownermu tidak pernah lahir, dan
databasenya kosong.

`bootstrap.py` **aman dijalankan berulang**. Jalankan lagi setiap kali menaikkan
versi yang menambah indeks. Ia juga cara sah memulihkan sandi owner yang lupa: ubah
`ADMIN_PASSWORD` di `.env`, jalankan ulang.

Keluarannya menyebut angka, bukan "selesai":

```
indeks    : terpasang
owner     : kamu@contoh.com (sandi diselaraskan dengan ADMIN_PASSWORD)
kurikulum : disemai (sebelumnya kosong)
SIAP. curriculum_nodes=731 questions=21
```

---

## 7. Restart dan buktikan

cPanel → Setup Python App → **Restart**. Lalu:

```
https://api.fiezel.my.id/api/health
```

Harus menjawab JSON dengan `curriculum_nodes` **bukan nol**, dan angkanya **sama**
dengan yang dicetak `bootstrap.py`. Nol berarti bootstrap belum jalan atau menunjuk
database lain — jangan lanjut sebelum angkanya cocok.

---

## 8. Sambungkan aplikasi ke backend

Isi alamatnya di `core-config.js` **pada pemasangan**, bukan di repo:

```js
self.FIEZEL_CURRICULUM_CONFIG=Object.freeze({
  curriculumApiUrl:'https://api.fiezel.my.id'
});
```

**Di repo nilainya wajib tetap kosong**, dan `tests/curriculum-config-wiring-test.js`
menegakkannya. Alasannya bukan gaya: salinan repo ini tidak boleh diam-diam mengirim
data murid ke server pemasang pertama. Jadi sunting berkas yang sudah terunggah di
`public_html/app/`, jangan commit alamatnya.

---

## Kalau macet

| Gejala | Sebab yang paling mungkin |
|---|---|
| 503, log kosong | startup file / entry point salah. Harus `passenger_wsgi.py` + `application` |
| `ModuleNotFoundError` | `pip install -r requirements.txt` dijalankan di luar virtualenv cPanel |
| Mati saat start, `KeyError` | ada env wajib yang kosong. Jalankan `python bootstrap.py` — ia menyebutkan nama yang hilang |
| `/api/health` hidup tapi `curriculum_nodes: 0` | `bootstrap.py` belum dijalankan (lihat langkah 6) |
| Login owner ditolak | sama — `seed_owner()` ada di dalam bootstrap |
| Timeout ke Atlas | IP server belum masuk Network Access Atlas |
| Konsol di aplikasi tetap mati | `curriculumApiUrl` belum diisi di `public_html/app/core-config.js` |
| Galat CORS di Console peramban | `CORS_ORIGINS` belum memuat asal aplikasimu persis (skema + host) |

---

## Yang dijaga gerbang

`tests/backend-env-contract-test.js` menjaga tiga hal ini tetap benar saat backend
tumbuh, dan ketiganya sudah dibuktikan MERAH sebelum dipercaya:

- setiap `os.environ["X"]` baru di `backend/*.py` **wajib** muncul di `.env.example`
  — daftarnya dipindai dari kode, bukan ditulis tangan, jadi env berikutnya terjaga
  sendiri tanpa ada daftar yang perlu disunting;
- `CORS_ORIGINS` tidak boleh kembali berbawaan `*`;
- `bootstrap.py` wajib tetap memanggil ketiga tugas startup — yang dilepas dari sana
  tidak akan pernah jalan di Passenger.
