# Menyalakan lane bukti belajar PER-MURID (SLOT 9)

Panduan langkah demi langkah untuk Owner — dijalankan dari laptop sendiri, bukan
dari chat. Setiap perintah diketik di **Terminal** (Windows: PowerShell; Mac:
Terminal.app), satu baris, tekan Enter, tunggu selesai sebelum baris berikutnya.

Ini adik dari `reports/EVIDENCE_ACTIVATION.md` (lane agregat, sudah menyala).
Perbedaan pentingnya: lane ini menyimpan bukti yang **terikat identitas murid**,
jadi tidak ada satu pun langkah di sini yang boleh dikerjakan "sekalian saja".

**Urutannya wajib dari atas ke bawah.** Alasannya ditulis di §6 dan bukan
formalitas: rilis aplikasi yang mendarat sebelum langkah 1–2 akan memunculkan
sakelar persetujuan di HP murid sementara server menolak mencatatnya — murid
melihat sakelarnya menyala padahal persetujuannya tidak pernah tersimpan.

---

## 0. Persiapan (sekali saja)

```
node -v
```
Harus mencetak `v20` atau lebih baru. Kalau tidak dikenali, pasang dari
https://nodejs.org (tombol LTS), tutup-buka Terminal, ulangi.

**Klon ke folder BARU `PRODING/FIEZEL-APPS`**, bukan ke folder lama yang mungkin
sudah berisi perubahan setengah jadi. Folder baru = titik awal yang bersih, dan
kalau ada yang kacau tinggal hapus foldernya tanpa kehilangan apa pun.

**Windows (PowerShell):**
```
mkdir $HOME\PRODING
cd $HOME\PRODING
git clone https://github.com/FIEZEL-APPS/FIEZEL-APPS.git
cd FIEZEL-APPS
```

**Mac / Linux (Terminal):**
```
mkdir -p ~/PRODING
cd ~/PRODING
git clone https://github.com/FIEZEL-APPS/FIEZEL-APPS.git
cd FIEZEL-APPS
```

Hasilnya: `PRODING/FIEZEL-APPS`. Kalau mau di tempat lain (misalnya `D:\PRODING`),
ganti dua baris pertama saja — sisa panduan ini tidak berubah.

Kalau `mkdir` mengeluh foldernya sudah ada, itu bukan masalah: lanjut `cd` saja.
Kalau `git clone` mengeluh `FIEZEL-APPS` sudah ada di dalam `PRODING`, berarti
klonnya pernah dibuat — `cd FIEZEL-APPS` lalu `git pull` sudah cukup.

Bukti Anda berada di folder yang benar sebelum lanjut:
```
git remote -v
```
Harus menyebut `FIEZEL-APPS/FIEZEL-APPS`.

```
npx wrangler@3 login
```
Browser terbuka → klik **Allow** → kembali ke Terminal. Harus muncul
"Successfully logged in". **Kalau langkah ini gagal, berhenti di sini** — semua
langkah berikutnya butuh ini.

Pastikan Anda di akun yang benar:
```
npx wrangler@3 whoami
```

---

## 1. Terapkan dua migrasi ke `fiezel-core`

Database `fiezel-core` **sudah ada** (di sanalah `identity` dan `social_profile`
tinggal), jadi tidak ada `d1 create` di sini. Yang ditambahkan hanya tabel baru.

**JANGAN jalankan dari folder `workers/api`.** `workers/api/wrangler.toml` di repo
ini adalah **template**: `database_id`-nya sengaja berisi teks
`<isi setelah: wrangler d1 create fiezel-core>`, dan CI yang mengisinya dengan UUID
asli saat deploy. Kalau perintah dijalankan dari folder itu, wrangler membaca
placeholder itu sebagai id database dan gagal:

```
X [ERROR] ... Invalid property: databaseId => Invalid uuid [code: 7400]
```

Itu bukan tanda token/akun bermasalah — itu tanda perintahnya membaca berkas
template. Jalankan dari **akar repo** dan sebut database-nya dengan **UUID asli**:

**1a. Ambil UUID `fiezel-core`** (dari akar repo, folder `FIEZEL-APPS`):
```
npx wrangler@3 d1 list
```
Catat nilai `uuid` pada baris `fiezel-core` — 36 karakter, bentuknya
`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.

**1b. Jalankan kedua migrasi** (ganti `UUID_FIEZEL_CORE` dengan nilai tadi):
```
npx wrangler@3 d1 execute UUID_FIEZEL_CORE --remote --file=workers/api/migrations/0009_learner_evidence.sql
npx wrangler@3 d1 execute UUID_FIEZEL_CORE --remote --file=workers/api/migrations/0010_learner_name.sql
```

`--remote` **wajib** ada di kedua baris. Tanpa itu wrangler menulis ke salinan
lokal di laptop Anda, semuanya terlihat sukses, dan produksi tidak berubah sama
sekali.

Kedua migrasi memakai `CREATE TABLE IF NOT EXISTS`, jadi menjalankannya dua kali
tidak merusak apa pun — termasuk kalau percobaan pertama gagal di tengah.

## 2. Buktikan tabelnya benar-benar ada

Masih dari akar repo, dengan UUID yang sama:
```
npx wrangler@3 d1 execute UUID_FIEZEL_CORE --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'learner%' ORDER BY name"
```

Harus muncul **empat** baris:

| Tabel | Isinya |
|---|---|
| `learner_evidence` | satu baris per event bukti/keputusan |
| `learner_evidence_consent` | persetujuan murid + versi naskahnya |
| `learner_evidence_state` | ringkasan + penghitung, satu baris per murid |
| `learner_name` | nama perkenalan murid, terikat `sub` |

Kurang dari empat = migrasi belum lengkap. Ulangi §1 dan baca pesan errornya,
jangan lanjut.

---

## 3. Tulis dua flag di KV `cfg:flags`

**BACA DULU, BARU TULIS.** `kv key put` **mengganti seluruh isi** kunci itu —
kalau Anda menulis objek yang cuma berisi dua flag baru, semua flag lain
(`cfApiEnabled`, `cfAiEnabled`, sosial, dst.) ikut hilang dan fitur yang sedang
hidup akan mati mendadak.

**3a-i. Ambil ID namespace KV.** `--binding=CFG` TIDAK bisa dipakai di sini —
alasannya sama seperti §1: `id` KV di `workers/api/wrangler.toml` juga masih
placeholder. Jadi pakai ID-nya langsung. Dari akar repo:
```
npx wrangler@3 kv namespace list
```
Cari baris yang `title`-nya memuat **CFG** (mis. `fiezel-api-CFG`), catat `id`-nya
— 32 karakter hex. Kalau ada dua yang mirip dan salah satunya bertuliskan
`staging` atau `preview`, ambil yang **bukan** itu.

**3a-ii. Ambil nilai yang sekarang** (ganti `ID_CFG` dengan id tadi):
```
npx wrangler@3 kv key get --namespace-id=ID_CFG "cfg:flags" --text
```
Salin seluruh keluarannya ke editor teks (Notepad/TextEdit).

**3b. Tambahkan dua kunci ke salinan itu**, tanpa menghapus apa pun:

- di dalam blok `"flags"`: `"cfLearnerEvidenceEnabled": true`
- di dalam blok `"enabled"`: `"learnerEvidence": true`

Hasilnya kira-kira begini (**pakai nilai Anda sendiri**, bukan contoh ini —
kunci lain di akun Anda mungkin berbeda):

```json
{"flags":{"cfApiEnabled":true,"cfAiEnabled":true,"cfTtsEnabled":false,"cfQuotaEnabled":true,"cfAnalyticsEnabled":true,"cfIdentityEnabled":true,"cfSocialEnabled":true,"cfLearnerEvidenceEnabled":true},"enabled":{"ai":true,"tts":false,"coach":false,"analytics":true,"social":true,"learnerEvidence":true}}
```

**3c. Tulis balik utuh:**
```
npx wrangler@3 kv key put --namespace-id=ID_CFG "cfg:flags" 'TEMPEL_JSON_UTUH_DI_SINI'
```
**Perhatikan: perintah `kv` TIDAK memakai `--remote`** (beda dengan `d1 execute`).
Di wrangler v3, KV jarak jauh adalah bawaannya; `--local` justru yang harus
ditambahkan kalau mau menyentuh salinan lokal. Menambahkan `--remote` di sini
menghasilkan `Unknown argument: remote`.

Di PowerShell, JSON-nya dibungkus **kutip tunggal**; kalau ada kutip tunggal di
dalam JSON-nya (harusnya tidak ada), simpan ke berkas lalu pakai `--path`.

**3d. Buktikan berubah** (bukan sekadar "perintah sukses"). KV di
`route-config.js` punya `cacheTtl` 60 detik, jadi tunggu dulu:
```
sleep 65
curl -s https://api.fiezel.my.id/api/config | tr ',' '\n' | grep -i learnerEvidence
```
Harus mencetak `"cfLearnerEvidenceEnabled":true` (boolean, tanpa kutip di
nilainya). Kalau masih `false` sesudah 60 detik: tulisan Anda tidak sampai —
periksa akun (`whoami`) dan `--remote`.

---

## 4. Merge PR aktivasi (sakelar server + klien)

PR **[#312](https://github.com/FIEZEL-APPS/FIEZEL-APPS/pull/312)** berisi dua
sakelar terakhir dan bump build m025-232:

- `workers/api/wrangler.toml`: `FEATURE_LEARNER_EVIDENCE = "on"`
- `features/telemetry/fiezel-telemetry-config.js`: `identityEvidence.mode = 'on'`

Ia sengaja **draft**. Ubah ke *Ready for review* lalu merge — **hanya sesudah
§1–§3 benar-benar selesai dan terbukti** (§2 mencetak empat tabel, §3d mencetak
`true`).

Kenapa lewat PR dan bukan dashboard Cloudflare: `deploy-api-worker.yml` menimpa
ulang `vars` dari repo setiap deploy, jadi perubahan manual di dashboard akan
hilang pada deploy berikutnya.

## 5. Deploy Worker api

Sesudah merge, jalankan workflow:
https://github.com/FIEZEL-APPS/FIEZEL-APPS/actions/workflows/deploy-api-worker.yml
→ tombol **Run workflow** (hanya login `FIEZEL-APPS` yang bisa).

Bukti sudah kena: buka `owner.fiezel.my.id`, panel **"🧑‍🎓 Murid per orang
(Braincore)"** harus berbunyi *"BELUM ADA MURID yang mengirim bukti per-murid
pada periode ini"* — bukan *"belum dikonfigurasi"*, bukan *"pengukuran tidak
tersedia"*. Arti ketiganya ada di tabel §7.

## 6. Rilis aplikasi (m025-232)

Jalankan `deploy-site.yml` dari halaman Actions yang sama.

**Kenapa langkah ini paling akhir.** Rilis inilah yang memunculkan sakelar
persetujuan di **Pengaturan → Bukti belajar per murid** di HP murid. Kalau ia
mendarat sebelum §1–§3:

- server menjawab **403 fail-closed** untuk setiap kiriman — tidak ada data
  bocor, tidak ada pelajaran terganggu, nol baris ditulis;
- **tetapi** murid yang menyalakan sakelarnya melihat sakelar itu menyala di
  perangkatnya sementara server menolak mencatat persetujuannya.

Persetujuan yang tampak diterima padahal tidak adalah janji yang tidak ditepati.
Itu sebabnya urutannya mengikat.

## 7. Murid menyalakan persetujuannya sendiri

Sakelar server **bukan** persetujuan. Selama murid belum menyalakan
**Pengaturan → Bukti belajar per murid**, kiriman dijawab 403
`consent_required` dan **nol baris** ditulis untuk murid itu.

Kadens kirim maksimal sekali sehari per perangkat: angka pertama muncul dalam
hitungan jam, bukan menit.

---

## 8. Membaca panel dashboard

| Tampilan panel "Murid per orang" | Artinya | Langkah yang kurang |
|---|---|---|
| belum dikonfigurasi | secret owner (`EVIDENCE_API_BASE`/`EVIDENCE_API_TOKEN`) belum ada di Worker owner | §5 `reports/EVIDENCE_ACTIVATION.md` |
| pengukuran tidak tersedia | pembacaan D1 gagal — tabel belum ada / migrasi belum jalan | §1–§2 di sini |
| BELUM ADA MURID … pada periode ini | semua hidup, belum ada kiriman masuk | §6–§7, atau tunggu |
| daftar murid + ringkasan | beres | — |

Kalau kiriman murid selalu ditolak (403) padahal panel sudah hidup, penyebabnya
salah satu dari empat, dan urutan pemeriksaannya begini:

1. `curl -s https://api.fiezel.my.id/api/config | grep -i learnerEvidence` →
   `false`? berarti §3 belum kena.
2. Sudah `true` tapi tetap 403? berarti `FEATURE_LEARNER_EVIDENCE` di Worker
   masih `"off"` — §4/§5 belum jalan.
3. Keduanya benar tapi tetap 403? berarti murid itu belum menyalakan
   persetujuannya — §7.
4. Keduanya benar, persetujuan menyala, tetap 403? tabel belum ada — ulangi §2.

Bentuk 403-nya sengaja sama untuk keempat sebab (tidak membocorkan keadaan
gerbang ke publik), jadi urutan eliminasi di atas memang cara memeriksanya.

---

## Yang sudah otomatis, tidak perlu dikerjakan manual

- **Purge retensi 180 hari** — cron `5 17 * * *` (00:05 WIB) sudah terpasang di
  Worker; `runLearnerEvidencePurge()` jalan tiap hari tanpa disuruh.
- **Rute owner** (`/api/owner/learners`, `/api/owner/learner-evidence`) — sudah
  terdaftar, memakai `OWNER_TOKEN_HASH` yang sama dengan panel agregat. **Nol
  secret baru.**
- **Binding D1** — `CORE_DB` sudah menempel di Worker sejak lane identitas;
  tidak ada `attach-live-bindings` yang perlu diulang.
- **Deploy berikutnya** — CI mengisi ID binding sendiri.

## Kalau mau membatalkan (rollback)

Balik ke keadaan mati tanpa menghapus data:

```
npx wrangler@3 kv key put --namespace-id=ID_CFG "cfg:flags" 'JSON_UTUH_DENGAN_KEDUA_FLAG_false'
```

Dalam ≤60 detik lane berhenti menerima kiriman (fail-closed). Data yang sudah
ada tetap tersimpan sampai purge 180 hari, dan setiap murid bisa menghapus
miliknya sendiri kapan saja dengan mematikan sakelar persetujuan —
**mencabut = menghapus**, bukan menandai.
