# SIARAN MASTER — baca ini sebelum menulis apa pun

**Master aktif:** sesi Perplexity Computer `086e9698` (owner: Pilna Refa).
**Berlaku sejak:** 28 Agustus 2026.
**Kanal:** repo ini. Tidak ada obrolan langsung antar sesi, jadi `git fetch` adalah cara kamu mendengar master.

Dokumen ini bukan pengganti `AGENTS-COORDINATION.md` (v1.2). Itu prosedurnya; ini penegaknya
dan keadaan terkini. Kalau keduanya bertentangan, yang menang adalah gerbang CI — bukan prosa.

---

## Kenapa siaran ini ada

Pada 28 Agustus 2026 dua jalur kerja bertabrakan **lima kali dalam satu malam** soal nomor
build: keduanya memilih `m025-173`, lalu keduanya memilih `m025-174`. Protokol koordinasi
sudah melarang itu sejak v1.2. Larangan itu tidak menghentikan apa pun karena tidak ada alat
yang menegakkannya. Selain merepotkan merge, akibatnya nyata ke murid: satu revisi service
worker memayungi dua daftar precache berbeda, jadi sebagian murid memegang shell cache campur.

Kesimpulannya, dan ini berlaku untuk semua sesi: **aturan yang tidak ditegakkan alat bukan aturan.**

---

## Tiga hal yang sekarang ditegakkan mesin

### 1. Nomor build punya satu pintu

JANGAN mengetik nomor build ke `sw.js`, `core-config.js`, atau `fiezel-diag-panel.js`.

```bash
node tools/bump-build.mjs "alasan singkat kenapa versi naik"
```

Ia mengambil versi dari `origin/main`, menaikkan satu, lalu menulis **keempat** tempat
sekaligus (tiga penanda + `coordination/BUILD-VERSION.json`). Kalau dua sesi menaikkan
bersamaan, tabrakannya tetap terjadi — tetapi jatuh di berkas JSON delapan baris yang bisa
dibaca dalam satu menit, bukan di `sw.js`/`style.css`/`app.js` di mana salah pilih sisi berarti
membuang pekerjaan orang lain.

Periksa keselarasan kapan saja: `node tools/bump-build.mjs --check`.

### 2. Wilayah kerja diklaim sebelum ditulis

Sebelum menyentuh berkas, tambahkan entri di `coordination/CLAIMS.json` → `active` berisi path
yang akan kamu tulis. Setelah merge, pindahkan entrimu ke `finished`.

`coordination-guard-test.js` MERAH kalau dua entri `active` dari sesi berbeda mengklaim path
yang sama. Jadi tabrakan terlihat **sebelum** kode ditulis. Mengklaim `.` atau seluruh repo
dilarang — itu sama dengan tidak berkoordinasi.

### 3. Gerbang tidak boleh menumpang tanpa terdaftar

`gate-registry-test.js` menolak berkas uji yang ada di repo tetapi tidak dipanggil
`quality.yml`. Alasannya sederhana: **gerbang yang tidak terdaftar tidak pernah merah**, dan
"semua hijau" yang menghitung gerbang tak-terpanggil adalah angka bohong. Malam ini 19 gerbang
tertangkap dalam keadaan itu; semuanya sudah didaftarkan setelah dijalankan satu per satu.

---

## Prosedur P10 — tabrakan sudah terjadi

Ini urutannya, dan urutannya penting. Jangan lompat ke langkah 4.

1. **Berhenti menulis.** Jangan push apa pun ke `main` sampai langkah 3 selesai.
2. **Petakan.** `git fetch origin main`, lalu `git log --oneline HEAD..origin/main` dan
   `git diff --name-only HEAD...origin/main`. Tulis daftar berkas yang disentuh kedua sisi.
3. **Klasifikasikan tiap berkas bertabrakan**, dan simpan jawabannya:
   - **Aditif** (daftar aset, blok CSS di ujung berkas, entri allowlist) → **UNION nyata**.
     Verifikasi programatik bahwa nol entri dari kedua sisi hilang. Jangan pernah pilih satu sisi.
   - **Semantik** (satu fungsi ditulis ulang dua versi) → baca keduanya, ambil struktur dari
     sisi yang arsitekturnya lebih besar, port naskah/aksesibilitas dari sisi lain, sebut di
     commit apa yang diambil dan apa yang ditolak beserta alasannya.
   - **Artefak** (`*-REPORT.json`) → regenerable; ambil satu sisi lalu jalankan ulang gerbangnya.
     Artefak ini tidak boleh dilacak git — kalau ada yang ter-commit, keluarkan.
4. **JANGAN pakai penyelesaian union otomatis pada berkas kode.** Malam ini itu menyisipkan
   penanda konflik ke `app.js`, `sw.js`, dan satu berkas uji, dan penandanya sempat ter-commit.
   Union hanya untuk `quality.yml` dan daftar yang benar-benar aditif.
5. **Naikkan versi lewat arbiter** (`tools/bump-build.mjs`), bukan dengan tangan.
6. **Buktikan.** Jalankan gerbang yang menyentuh area bertabrakan, lalu `node
   gate-registry-test.js`, `node tools/bump-build.mjs --check`, dan **`python3
   release-audit.py`** — langkah Python itu tidak tertangkap kalau kamu hanya menjalankan
   `node *-test.js`, dan malam ini itulah yang lolos ke CI dan memerahkannya.
7. **Catat di ledger** (`TASKS-LEDGER.json`) dan pindahkan klaimmu ke `finished`.

---

## Keadaan terkini yang perlu kamu tahu

- **Build:** lihat `coordination/BUILD-VERSION.json` (jangan hafalkan angkanya).
- **Cloudflare:** Worker `fiezel-api` hidup di belakang jembatan `https://api.fiezel.my.id`
  (reverse proxy PHP di cPanel, karena pemindahan DNS diblokir registrar).
  Flag server di KV `cfg:flags`: `cfApiEnabled`/`cfIdentityEnabled`/`cfQuotaEnabled` **hidup**;
  `cfAiEnabled`/`cfTtsEnabled`/`cfAnalyticsEnabled` **mati**.
- **Murid produksi masih memakai Puter.** Konfigurasi statis klien `enabled:false`, jadi flag
  server hanya MENGIZINKAN, tidak menyalakan. Jangan menyalakan transport klien tanpa owner.
- **Analytics benar-benar nol event** (tidak ada pemancar di klien + flag mati). Jangan mengambil
  keputusan kuota di atas angka pengguna; angkanya belum ada.
- **Jembatan lambat:** ~1,4–1,7 s hangat. Batas waktu klien jalur CF = 8000 ms dan itu diukur,
  bukan dikarang. Jangan menurunkannya tanpa mengukur ulang.
- **Nightwatch aktif** (pemeriksaan otomatis tiap jam, milik sesi master): CI `main`, keselarasan
  versi, penanda konflik, gerbang tak terdaftar, kesehatan jembatan. Perbaikan mekanis dikerjakan
  langsung; sisanya dilaporkan ke owner.

## Yang TIDAK boleh dilakukan siapa pun tanpa owner

1. Menyalakan transport Cloudflare untuk murid (`enabled:true` di konfigurasi statis klien).
2. Menurunkan jatah murid (`FREE_AI_DAILY_LIMIT`, `FREE_TTS_DAILY_*`) untuk "menyelaraskan angka".
3. Melemahkan atau menghapus assert gerbang supaya hijau. Kalau gerbang salah, perbaiki
   assert-nya ke properti yang lebih ketat dan tulis alasannya di kode.
4. Menghapus `vendor/supertonic-3` atau melonggarkan pagar 152 MB-nya.
5. Meng-commit nilai cookie/token nyata ke repo. Malam ini itu terjadi dua kali dan memaksa dua
   kali rotasi kunci sesi. Redaksi dengan `tools/redact-live-cookies.mjs` sebelum commit.
