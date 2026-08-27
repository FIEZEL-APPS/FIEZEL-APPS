# W4 — Gate aktor untuk deploy Cloudflare

Cabang: `work/gate` · worktree `/home/user/workspace/wt-gate`
Sumber temuan: `reports/cf-a2-cf-existing.md` (§(d) + rekomendasi #2), `reports/cf-a7-security.md` (§2, §6).
Tidak ada bump versi. Tidak ada push.

---

## 1. Masalahnya, dalam satu paragraf

`reports/cf-a2-cf-existing.md` §(d) mencatat asimetri: setiap workflow yang menyentuh **Puter**
bergerbang `github.actor == 'FIEZEL-APPS'`, sedangkan workflow yang men-deploy Worker
**Cloudflare** tidak. Yang tanpa gate justru yang paling berbahaya — `audio-deploy-worker.yml`
memegang `CLOUDFLARE_API_TOKEN`, membuat/menulis bucket R2, **menimpa Worker produksi
`fiezel-audio`** yang menyajikan 1.170 aset, dan dengan `permissions: contents: write` ia
commit + push `assetBaseUrl` ke branch produksi. `reports/cf-a7-security.md` §6 menilai blast
radius token semacam ini **Tinggi**. Siapa pun yang bisa menekan `workflow_dispatch` di repo ini
bisa melakukan seluruh rangkaian itu.

## 2. Pola yang ditiru (bukan pola baru)

Brief menyebut `audio-generate.yml` sebagai pemilik pola penjaga aktor. **Itu tidak akurat, dan
saya tidak mengarang penggantinya** — `audio-generate.yml` justru salah satu dari dua berkas yang
TIDAK punya gate (`cf-a2` §(d) menandainya persis begitu: "Tidak ada gate aktor"). Pemilik pola
yang sebenarnya, dikutip apa adanya dari repo:

```
.github/workflows/deploy-core-worker.yml:17
    if: github.event_name == 'workflow_dispatch' && github.actor == 'FIEZEL-APPS'

.github/workflows/configure-core.yml:12
    if: github.event_name == 'workflow_dispatch' && github.actor == 'FIEZEL-APPS'

.github/workflows/audio-prerender-cf.yml:55
    if: github.actor == 'FIEZEL-APPS'

.github/workflows/push-reminders.yml:15
    if: (github.event_name == 'schedule' && vars.FIEZEL_REMOTE_PUSH_ENABLED == 'true') || (github.event_name == 'workflow_dispatch' && github.actor == 'FIEZEL-APPS')
```

Bentuk yang saya pakai adalah varian `deploy-core-worker.yml:17` — dengan pemeriksaan
`github.event_name` — bukan varian pendek `audio-prerender-cf.yml:55`. Alasannya: kedua berkas
yang saya ubah hari ini hanya punya `workflow_dispatch`, jadi kedua bentuk setara **sekarang**;
tapi kalau nanti seseorang menambahkan `push:` atau `schedule:`, bentuk panjang gagal tertutup
(job tidak jalan) sedangkan bentuk pendek bisa lolos, karena `github.actor` pada pemicu otomatis
bisa berupa aktor yang bukan owner. `deploy-core-worker.yml` sudah memilih bentuk panjang untuk
workflow deploy; saya mengikutinya, bukan menyimpanginya.

Login `FIEZEL-APPS` bukan pilihan saya: ia yang dipakai keempat berkas di atas, cocok dengan
subdomain produksi `fitrajft.workers.dev` (`audio/manifest.json:5`), dan diatur
`MASTER-ONLY-GOVERNANCE.md`.

## 3. Tabel workflow × punya-gate × keputusan

Kolom **terjaring** = memenuhi salah satu kriteria gerbang: mereferensikan `secrets.` di luar
komentar, ATAU memuat kata kunci `wrangler` / `deploy*` / `publish*` di luar komentar.
Data diambil dari keluaran `workflow-actor-gate-test.js` (`WORKFLOW-ACTOR-GATE-REPORT.json`).

| # | Workflow | secrets. | kata kunci deploy | terjaring | gate aktor SEBELUM | gate aktor SESUDAH | Keputusan |
|---|---|---|---|---|---|---|---|
| 1 | `audio-deploy-worker.yml` | ya (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) | ya (`wrangler deploy`) | ya | **tidak** | **ya (baris 40)** | **DIUBAH** — temuan inti cf-a2 rek. #2. Men-deploy Worker CF produksi + tulis bucket R2 + push ke branch produksi. |
| 2 | `audio-generate.yml` | ya (`ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) | tidak | ya | **tidak** | **ya (baris 61)** | **DIUBAH** — brief meminta workflow lain pemegang rahasia deploy ikut digerbang. `apply` kosong melindungi dari *kecelakaan*, bukan dari *niat*: `apply` diisi si penekan tombol. Ia juga push ke branch produksi. |
| 3 | `audio-prerender-cf.yml` | ya (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) | tidak | ya | ya (baris 55) | ya (tak berubah) | **TIDAK DIUBAH** — sudah bergerbang; catatan kepalanya (`:6-11`) sudah menuliskan aturannya: "Jangan mewarisi yang lebih lemah". |
| 4 | `configure-core.yml` | ya (`PUTER_AUTH_TOKEN`, `VAPID_PUBLIC_KEY`, `FIEZEL_REMINDER_CRON_TOKEN`) | tidak | ya | ya (baris 12) | ya (tak berubah) | **TIDAK DIUBAH** — sumber pola. |
| 5 | `deploy-core-worker.yml` | ya (`PUTER_AUTH_TOKEN`) | ya | ya | ya (baris 17) | ya (tak berubah) | **TIDAK DIUBAH** — sumber pola. |
| 6 | `push-reminders.yml` | ya (5 secret VAPID/cron) | tidak | ya | ya (baris 15) | ya (tak berubah) | **TIDAK DIUBAH** — gate majemuk `schedule`+`dispatch` yang sudah benar; menyeragamkannya ke bentuk pendek akan **melemahkannya**. |
| 7 | `a6-a7-verifiers.yml` | tidak | ya — hanya di dalam teks `echo` ("product deploy must increment Diagnostics") | ya | tidak | tidak | **ALLOWLIST, dengan alasan di dalam kode gerbang** — verifier PR baca-saja, nol secret, `pull_request` saja. Gate aktor justru **merusak** fungsinya: verifier PR harus jalan untuk PR siapa pun. |
| 8 | `a9-a14-autonomous-guardians.yml` | tidak | ya — hanya di dalam satu `echo` ("never grants merge/deploy authority") | ya | tidak | tidak | **ALLOWLIST, dengan alasan** — sama: reviewer PR deterministik, nol secret. |
| 9 | `a8-ci-failure-analyst.yml` | tidak | tidak | tidak | tidak | tidak | Tidak terjaring — tidak butuh gate. |
| 10 | `m025-5-candidate-build.yml` | tidak | tidak | tidak | tidak | tidak | Tidak terjaring. |
| 11 | `m02526-product-neural-safari.yml` | tidak | tidak | tidak | tidak | tidak | Tidak terjaring. |
| 12 | `m02547-neural-library-safari.yml` | tidak | tidak | tidak | tidak | tidak | Tidak terjaring. |
| 13 | `master-authority-guard.yml` | tidak | tidak | tidak | `github.actor` dipakai, **tapi sebagai `env: ACTOR`** (baris 23), bukan `if:` | tidak | Tidak terjaring, dan **sengaja tidak dihitung punya gate**. Membaca nama aktor untuk dilaporkan bukan otorisasi; gerbang menolak menghitungnya (lihat §4). |
| 14 | `neural-vendor-repro.yml` | tidak | tidak | tidak | tidak | tidak | Tidak terjaring. |
| 15 | `quality.yml` | tidak | tidak | tidak | tidak | tidak | Tidak terjaring (CI baca-saja). **DIUBAH** hanya untuk mendaftarkan gerbang baru. |

Rekapitulasi: 15 workflow · 8 terjaring · 6 bergerbang owner (naik dari 4) · 2 di-allowlist dengan
alasan · 7 tidak terjaring. **Nol** workflow terjaring-tanpa-gate-tanpa-alasan.

## 4. Gerbang baru: `workflow-actor-gate-test.js`

Node murni, nol dependency, nol jaringan, nol parser YAML pihak ketiga (repo tidak punya
`js-yaml`, dan gerbang tidak boleh menambah dependensi hanya untuk membaca 15 berkas). Ia
memindai **semua** `.github/workflows/*.yml` dan menulis `WORKFLOW-ACTOR-GATE-REPORT.json`
mengikuti pola pelaporan `cf-wiring-test.js`.

Menambahkan satu baris `if:` menutup celah **hari ini**. Yang tidak ditutup baris itu adalah
**besok** — workflow ke-16 yang men-deploy tanpa gate akan lolos review dengan mudah, karena tidak
ada yang mengeluh. Gerbang inilah yang mengeluh.

Tujuh kelas pemeriksaan:

| Kode | Yang dibuktikan |
|---|---|
| **A** | Setiap workflow terjaring punya penjaga aktor **atau** ada di `ALLOWLIST` dengan alasan. Pesan galatnya memuat baris `if:` yang harus ditambahkan, lengkap dengan rujukan `deploy-core-worker.yml:17`. |
| **B** | Gate membandingkan `github.actor` dengan login owner, bukan login lain yang kebetulan lewat. |
| **C** | Gate menutup **setiap** job, bukan sebagian. Workflow dua-job dengan satu job bergerbang = merah. |
| **D** | `ALLOWLIST` **tidak boleh** memaafkan berkas yang benar-benar mereferensikan `secrets.`, dan setiap alasan wajib benar-benar tertulis (≥80 karakter). |
| **E** | Tidak ada entri `ALLOWLIST` yang basi: berkas hilang = merah; berkas yang ternyata sudah punya gate atau sudah tidak terjaring = merah. Allowlist tidak boleh menua jadi tempat sampah. |
| **F** | Dua berkas isi temuan cf-a2 (`audio-deploy-worker.yml`, `audio-generate.yml`) diperiksa **dengan nama**, supaya kalau sapuan umum di atas suatu hari salah longgar, pemeriksaan bernama ini tetap merah. |
| **G** | `quality.yml` benar-benar memanggil gerbang ini. Gerbang yang tidak terdaftar tidak pernah merah. |

Dua keputusan desain yang sengaja **ketat**:

1. **`env: ACTOR: ${{ github.actor }}` bukan penjaga.** `master-authority-guard.yml:23` melakukan
   itu — hanya membaca nama aktor untuk dilaporkan. Menghitungnya sebagai gate akan membuat
   gerbang hijau justru pada berkas yang paling mudah disalahpahami.
2. **`if:` pada tingkat STEP bukan penjaga.** Step lain di job yang sama sudah berjalan (checkout,
   setup, dan step apa pun tanpa `if:`), dan gate yang bisa dilewati dengan menambah satu step
   bukan gate. Gerbang hanya menerima `if:` yang merupakan anak langsung sebuah job.

Baris komentar dibuang sebelum klasifikasi — `audio-generate.yml:54-62` dan laporan cf-a2 sendiri
**menyebut** nama secret di dalam komentar untuk menjelaskan risikonya, dan menjaring berkas
karena ia mendokumentasikan dirinya dengan baik adalah insentif yang salah arah. Komentar di ujung
baris sengaja **tidak** dibuang: memisahkan `#` komentar dari `#` di dalam string shell butuh
parser YAML+shell utuh, dan salah-potong di situ berarti `wrangler deploy` sungguhan bisa
terlewat. Terjaring-berlebih lalu dijelaskan di allowlist jauh lebih murah daripada terlewat.

### Catatan jujur: percobaan pertama gerbang ini salah

Versi pertama menghitung job dengan menyapu seluruh berkas mencari kunci berindentasi dua spasi.
`on: { push:, pull_request: }` dan `permissions:` juga berindentasi dua spasi, jadi pemeriksaan C
merah pada **keenam** berkas yang sebenarnya sudah benar. Diperbaiki dengan penelusuran blok
`jobs:` yang sesungguhnya (`walkJobs`), dan alasannya ditinggalkan sebagai komentar di dalam kode
supaya tidak diulang.

## 5. Bukti gerbang GAGAL saat seharusnya gagal

Tiga berkas/perubahan palsu sementara, dijalankan, lalu **dihapus semua**
(`git status` bersih dari berkas palsu — diverifikasi).

**(1) Workflow deploy baru tanpa gate → `exit 1`.** `zz-fake-rogue-deploy.yml`: memegang
`CLOUDFLARE_API_TOKEN`, menjalankan `npx wrangler@3 deploy`, dan sengaja diberi gate di tingkat
**step** untuk sekalian membuktikan gerbang menolak bentuk itu.

```
EXIT=1   pass=False   {pass: 32, fail: 1}   ungated: ['zz-fake-rogue-deploy.yml']
FAIL: A zz-fake-rogue-deploy.yml punya penjaga aktor atau ada di allowlist
   -> terjaring karena secrets: CLOUDFLARE_API_TOKEN + kata kunci deploy. Tambahkan
      `if: github.event_name == 'workflow_dispatch' && github.actor == 'FIEZEL-APPS'`
      pada tingkat job (pola deploy-core-worker.yml:17), atau daftarkan berkas ini di
      ALLOWLIST workflow-actor-gate-test.js dengan alasan.
```

**(2) Gate yang hanya menutup sebagian job → `exit 1`.** `zz-fake-partial.yml`, dua job, satu
bergerbang:

```
EXIT=1   pass=False   {pass: 34, fail: 1}
FAIL: C zz-fake-partial.yml menutup setiap job dengan gate (bukan sebagian)
   -> 2 job, 1 gate. Job tanpa gate di berkas pemegang kredensial adalah pintu belakang
      yang tampak tertutup.
```

**(3) Menyalahgunakan allowlist untuk memaafkan pemegang secrets → `exit 1`.** Entri palsu
`audio-deploy-worker.yml` disisipkan ke `ALLOWLIST`; dua pemeriksaan berbeda menangkapnya:

```
EXIT=1   pass=False   {pass: 34, fail: 2}
FAIL: D audio-deploy-worker.yml di-allowlist tanpa memegang secrets
   -> berkas ini mereferensikan CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN — allowlist
      bukan tempatnya; pasang gate.
FAIL: E entri allowlist audio-deploy-worker.yml masih diperlukan
   -> berkas ini sekarang SUDAH punya gate aktor; hapus entri allowlist-nya
```

## 6. Verifikasi pada kondisi repo setelah perbaikan

| Perintah | Hasil |
|---|---|
| `node workflow-actor-gate-test.js` | **exit 0** — 32 PASS / 0 FAIL, `ungated: []` |
| `node --check workflow-actor-gate-test.js` | OK |
| `python3 -c "import yaml,glob; [yaml.safe_load(open(f)) for f in glob.glob('.github/workflows/*.yml')]"` | **semua 15 workflow YAML sah** |
| `node regression-test.js` | **exit 0** — `FIEZEL regression checks: PASS` |
| `node install-health-test.js` | **exit 0** — `FIEZEL install health: PASS` |
| `node audio-asset-pipeline-test.js` | **exit 0** — dijalankan tambahan karena `:318-321` mengunci isi `audio-deploy-worker.yml` (uji `PUT`→405); masih hijau |
| Bump versi | **tidak dilakukan** — `VERSION.json` dan `version.js` tidak tersentuh |
| Push | **tidak dilakukan** — commit hanya di `work/gate` |

## 7. Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `.github/workflows/audio-deploy-worker.yml` | + gate aktor tingkat job (baris 40) + komentar alasan |
| `.github/workflows/audio-generate.yml` | + gate aktor tingkat job (baris 61) + komentar alasan |
| `.github/workflows/quality.yml` | + `node workflow-actor-gate-test.js` di akhir `Core validation` |
| `workflow-actor-gate-test.js` | **baru** — gerbang, 7 kelas pemeriksaan, allowlist beralasan |
| `WORKFLOW-ACTOR-GATE-REPORT.json` | **baru** — keluaran gerbang (pola sama dengan `CF-WIRING-REPORT.json`) |
| `reports/work-w4-gate.md` | **baru** — catatan ini |

## 8. Yang sengaja TIDAK dikerjakan

- **Tidak menyeragamkan `push-reminders.yml:15`** ke bentuk pendek. Gate majemuknya
  (`schedule` butuh `vars.FIEZEL_REMOTE_PUSH_ENABLED`, `dispatch` butuh owner) lebih kuat dari
  bentuk seragam; menyeragamkannya berarti melemahkannya.
- **Tidak menyentuh pemicu `audio-generate.yml`.** `cf-a2` "Yang TIDAK boleh diubah" menyatakan
  ketiadaan pemicu otomatis adalah satu-satunya bentuk persetujuan manusia untuk pemakaian kredit.
  Gate aktor adalah lapis **tambahan**, bukan pengganti gerbang `apply == 'APPLY'`.
- **Tidak memakai `environment:` protection rules** sebagai pengganti gate aktor. Itu setelan
  dashboard GitHub, tidak terlihat di repo, dan tidak bisa diverifikasi gerbang CI mana pun —
  persis kelas masalah yang sudah menyakiti repo ini di `.assetsignore:3-14` (Workers Builds).
  Rekomendasi untuk owner: pasang **keduanya**; hanya salah satu yang bisa dijaga dari dalam repo.
- **Tidak menyentuh isi `audio-deploy-worker.yml` selain gate.** Risiko #3 cf-a2 (regex `head -1`
  yang bisa menangkap URL preview) nyata tapi di luar lingkup W4.

## 9. Sisa risiko

1. **Gate aktor tidak menahan owner yang akunnya diambil alih.** Ia menutup *aktor lain*, bukan
   kompromi akun. Mitigasi yang benar adalah 2FA + `environment` approval, di luar repo.
2. **Kata kunci `deploy` sebagai proksi "menyentuh infrastruktur" bisa dilewati** oleh workflow
   yang memanggil skrip bernama netral (mis. `node tools/kirim.mjs`) tanpa menyebut `secrets.`.
   Kriteria `secrets.` adalah jaring yang lebih kuat, dan setiap jalur deploy nyata di repo ini
   membutuhkan kredensial — jadi celahnya sempit, tapi bukan nol.
3. **Fork/PR tidak memicu jalur ini** dan memang tidak seharusnya; `cf-a7` §2 sudah memverifikasi
   nol `pull_request_target` di repo, jadi PR fork tetap tidak mendapat secret.
