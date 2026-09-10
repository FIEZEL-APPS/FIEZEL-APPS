# m025-240 — Pintu masuk Online & Teman di Home

Rilis ini **tidak menambah fitur**. Lapisan sosial (SLOT 7: profil online, teman, papan) sudah
selesai sejak lama — frontend, modul jaringan, rute Worker, dan gerbangnya. Yang rilis ini
kerjakan hanya satu hal: **membuatnya bisa ditemukan**.

Kewenangan menyalakan tetap di **OWNER**. Lihat bagian 4 — ada satu langkah yang tidak bisa
dikerjakan PR mana pun. Penegakan koordinasi mengikuti prosedur **MASTER** di
`MASTER-BROADCAST.md`.

---

## 1. Masalahnya: fitur selesai yang tidak punya pintu

Sebelum rilis ini, satu-satunya jalan murid mencapai Online & Teman adalah:

> Pengaturan → lipatan "Online" → "Profil Online"

Tiga ketukan, di dalam modal pengaturan, di bawah lipatan yang tertutup secara bawaan
(`settingsFold(..., false)`). Untuk fitur yang seluruh gunanya adalah **mengajak teman**, itu
sama dengan tidak ada.

Yang sudah ada dan tidak disentuh rilis ini:

| Bagian | Berkas | Keadaan |
|---|---|---|
| Modul jaringan + outbox | `features/social/fiezel-social.js` | 365 baris, selesai |
| Layar `online` (tab profil/teman/papan) | `app.js` `onlineView()` | selesai |
| Kartu ringkas di Peta Belajar | `app.js` `socialSummaryCardMarkup()` | selesai |
| Rute Worker | `workers/api/route-social.js` | selesai, bergerbang |

---

## 2. Perbaikan — kartu di Home, memakai mesin yang sudah ada

Ditambahkan `socialHomeMarkup()` / `socialHomeBody()` di `app.js`, dipasang di `home()` tepat
sesudah `learnerFlowHomeMarkup()`.

**Nol mesin async baru.** Kartu ini menumpang cache dan penyegar yang sudah dipakai kartu Peta
Belajar (`socialSummaryCache` + `refreshSocialSummaryCard`). Yang ditambahkan ke
`socialSummaryPaint()` hanya satu cabang: kalau slot Home ada dan view masih `home`, cat ulang
juga. Jadi ada **satu** sumber kebenaran status sosial di klien, bukan dua yang bisa berbeda.

### Kenapa Home, bukan slot nav keenam

Bottom nav lima slot (Home / Vocab / Grammar / Reading / Peta) adalah hasil penataan yang
disengaja, terakhir disentuh m029 FOCUS (#326). Slot keenam memampatkan label di 390px dan
menaikkan lapisan sosial ke rak yang sama dengan empat tujuan belajar inti — padahal ia
sekunder dan opsional. Kartu Home memberi keterlihatan tanpa membayar keduanya, dan memakai
bahasa tata letak yang sudah dikenal (`.launch-card`, pola persis kartu Learner Flow).

### Kenapa kartunya MENGHILANG saat flag mati

Ini beda perilaku yang disengaja terhadap kartu Peta Belajar, dan alasannya bukan kosmetik:

- **Peta Belajar** boleh menjelaskan keadaan ("Fitur online belum aktif") — murid ke sana untuk
  memeriksa sesuatu, jadi jawaban jujur berguna.
- **Home dilewati setiap hari.** Pintu yang selalu buntu di Home melatih murid mengabaikan
  Home. Jadi di Home: tidak ada jawaban = tidak ada pintu.

Fail-closed, sama seperti seluruh lane ini: `socialSummaryCache` kosong (belum ada jawaban),
`off` (flag server mati), atau `offline` → `socialHomeBody()` mengembalikan string kosong.
Kartu hanya muncul untuk `profile` (sudah punya handle) dan `cta` (jalur hidup, belum punya
profil).

---

## 3. Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `app.js` | `socialHomeMarkup()` + `socialHomeBody()`; `socialSummaryPaint()` ikut mengecat slot Home; satu baris `${socialHomeMarkup()}` di `home()` |
| `style.css` | `.social-home-launcher` — satu kartu mengisi barisnya sendiri (grid launcher bawaan empat kolom), lebih pendek karena ini pintu sekunder |
| `features/i18n/copy-id-feat-c.js`, `copy-th-feat-c.js` | tiga kunci `social.home-*` |
| `id-golden-baseline.json` | satu literal berubah — lihat bagian 5 |
| `docs/SOCIAL-FLAG-RUNBOOK.md` | baru — cara OWNER menyalakan/mematikan lane ini |
| `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `coordination/BUILD-VERSION.json` | m025-239 → **m025-240** lewat `node tools/bump-build.mjs` |

`features/neural-voice/fiezel-diag-panel.js` tersentuh **hanya** oleh `DIAG_BUILD`, karena
arbiter menulis keempat tempat sekaligus. Nol logika neural-voice berubah — tetapi sentuhan
itulah yang membuat A13 Handoff Keeper menuntut dokumen ini.

---

## 4. Yang TIDAK bisa dikerjakan rilis ini

**Kartu ini tidak akan pernah muncul sampai OWNER menyalakan flag di Cloudflare.**

Gerbangnya tiga sakelar AND. Sakelar pertama, `FEATURE_SOCIAL = "on"`, **sudah** terpasang di
`workers/api/wrangler.toml` (baris 70). Dua sisanya hidup di KV `cfg:flags` dan tidak ada di
repo ini:

- `enabled.social === true` — kill switch server
- `flags.cfSocialEnabled === true` — flag yang dilaporkan ke klien lewat `GET /api/config`

Langkah persisnya, beserta cara memverifikasi dan mematikannya lagi, ada di
**`docs/SOCIAL-FLAG-RUNBOOK.md`**. Dokumen itu sengaja menyuruh membaca-sunting-tulis dengan
`jq`, bukan menimpa `cfg:flags`: kunci itu satu objek yang juga memuat flag AI, identitas, dan
kuota.

Sampai flag itu hidup, rilis ini **tidak mengubah apa pun yang dilihat murid** — kartunya tidak
digambar. Itu membuat rilis ini aman didaratkan lebih dulu dan dinyalakan belakangan, di
jendela yang OWNER awasi.

---

## 5. Naskah Indonesia — satu literal, disengaja

`tests/id-golden-snapshot-test.js` merah sekali, lalu baseline ditulis ulang **setelah** selisihnya
diperiksa satu per satu. Selisih sesungguhnya persis satu baris:

```
+${socialHomeMarkup()}
```

Jumlah literal Indonesia **tidak berubah** (2286 → 2286): satu literal `home()` digantikan
versinya sendiri yang bertambah satu baris. Nol naskah murid yang lain bergeser. Tiga kunci
`social.home-*` yang baru hidup di berkas i18n, bukan di literal yang dipagari baseline.

Baseline TIDAK diregenerasi untuk menghijaukan gerbang — ia diregenerasi karena perubahannya
sudah dibuktikan disengaja, dan bukti itu ada di paragraf ini.

---

## 6. Gerbang

```
node tests/coordination-guard-test.js        24/24 assert PASS
node tests/install-health-test.js            PASS
node tests/pwa-release-coherence-test.js     PASS
node tests/id-golden-snapshot-test.js        HIJAU
node validator.js                      PASS
node tests/social-schema-contract-test.js    PASS
node tools/bump-build.mjs --check      Selaras.
```

Nol gerbang dinonaktifkan, di-skip, atau dihapus.

---

## 7. Status rilis — menunggu OWNER

**Status: kode selesai dan bergerbang hijau; lane-nya masih MATI sampai OWNER menyalakan flag.**

Yang **belum** terbukti, dan tidak boleh ditulis dari sisi yang mengerjakan patch:

1. **Jalur teman ujung-ke-ujung belum pernah dicoba dua perangkat sungguhan.** Sepanjang yang
   bisa dibaca dari repo, belum pernah — undang → tukar kode → papan terisi.
2. Kartu Home belum pernah dilihat dengan flag **hidup**, karena flag-nya memang belum pernah
   hidup. Yang terbukti lokal hanya cabang matinya: kartu tidak digambar.

**Yang dibutuhkan dari OWNER:**

1. Jalankan `docs/SOCIAL-FLAG-RUNBOOK.md` bagian 3, di jendela yang diawasi.
2. Periksa kartu muncul di Home, dan **hilang lagi** setelah flag dimatikan (bagian 5 runbook).
3. Coba jalur teman dengan dua perangkat.

## 8. Langkah berikutnya

- **Belum ada gerbang yang mengunci perilaku fail-closed kartu Home.** `socialHomeBody()`
  mengembalikan string kosong untuk `off`/`offline`/cache-kosong, dan itu pantas dikunci uji —
  satu cabang yang lupa akan memasang pintu buntu permanen di Home. Ini yang paling layak
  dikerjakan lebih dulu sesudah rilis ini diterima.
- Sesudah flag hidup dan jalur teman terbukti, pertimbangkan apakah kartu Home perlu keadaan
  "ada undangan menunggu" — sekarang ia hanya membedakan sudah/belum punya profil.
