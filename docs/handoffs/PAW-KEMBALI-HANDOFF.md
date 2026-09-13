# PAW KEMBALI — maskot lama menggantikan Nusa & Mira (m025-304)

## Permintaan OWNER

> "aku ingin maskot lama paw itu muncul lagi, gantikan seluruh maskot sekarang"

## Yang dikerjakan

Pembalikan (`git revert -m 1`) atas merge #401 ("PAW pensiun: Nusa & Mira
menggantikannya di seluruh aplikasi"). Bukan penulisan ulang: rig PAW dipulihkan
persis seperti bentuknya sebelum dipensiunkan, beserta seluruh gerbang yang dulu
menjaganya. Itu pilihan yang disengaja — rig PAW adalah sistem yang sudah matang
(checksum ekspor, geometri telapak, palet tertutup, kosakata event), dan menulis
ulang dari ingatan akan kehilangan jaminan-jaminan itu.

### Kembali hidup

- `features/mascot/fiezel-mascot.js` (1347 baris, rig SVG inline + corong global
  `self.FiezelPaw`), `fiezel-motion.css` (618 baris), `fiezel-paw-outfit.js`
  (lapisan outfit kontekstual G5′).
- 100 pose koleksi `assets/brand/mascot/collection/paw-001..100` (SVG + PNG),
  `paw_100_manifest.json`, `assets/brand/mascot-checksums.json`.
- Aset merek PAW di `assets/brand/`, `assets/mascot-poses/`, dan `website/assets/`.
- Seluruh `design/paw-redesign/` (spesifikasi, sistem 07–20, laporan SFX).

### Pensiun

- `features/mascot/fiezel-character.js`, `fiezel-character-art.js`,
  `fiezel-character.css` — rig Nusa & Mira.
- `tests/character-art-gate-test.js`, `tools/gen-character-art-table.mjs`,
  `tools/sample-muzzle.py`, `tools/synth-monkey-sfx.py`,
  `assets/characters/muzzle.json`.
- `docs/handoffs/NUSA-MIRA-KARAKTER-HANDOFF.md`.

### Gerbang yang kembali ke `quality.yml`

`e5-checksum-gate-test.js`, `mascot-reduced-motion-test.js`,
`keyframe-rotation-gate-test.js` kembali, dan `paw-mascot-test.js`,
`pawprint-geometry-gate-test.js`, `palette-gate-test.js`,
`event-vocabulary-gate-test.js` kembali ke kontrak penuhnya (sebelumnya #401
memangkas empat gerbang terakhir jadi versi "lambang + splash saja").
`character-art-gate-test.js` keluar bersama rig yang dijaganya.

## Empat konflik, dan sisi mana yang menang

Revert tidak bersih karena tiga commit sesudah #401 menyentuh berkas yang sama.
Di keempat konflik, sisi **HEAD yang dipertahankan** — pembalikan ini hanya
mencabut maskot, tidak boleh menyeret kembali pekerjaan sesudahnya:

| Berkas | Konflik | Putusan |
|---|---|---|
| `coordination/BUILD-VERSION.json` | m025-303 vs m025-299 | HEAD, lalu naik ke m025-304 |
| `core-config.js` | `FIEZEL_PAGE_BUILD` | HEAD, lalu m025-304 |
| `features/neural-voice/fiezel-diag-panel.js` | `DIAG_BUILD` | HEAD, lalu m025-304 |
| `sw.js` | `SW_REV` | HEAD, lalu `m025-304-paw-kembali-20260913` |
| `id-golden-baseline.json` | `generatedAt` | HEAD (isi hash sudah auto-merge) |

Nomor build lewat `node tools/bump-build.mjs`, bukan diketik tangan — keempat
titik naik bersama dan `--check` hijau.

### Satu resolusi yang butuh pembacaan, bukan pemilihan sisi

`features/mascot/fiezel-character.css` adalah konflik **modify/delete**: #401
menambahkannya, lalu #404 ("Lembut") menyuntiknya dengan 89 baris — resep
"potong ke kepala" untuk cap kecil `.has-mascot`, yang hilang saat rig diganti
dan membuat maskot merender bertubuh penuh di dalam lingkaran 42px.

Berkas itu **dihapus**, dan 89 baris tersebut TIDAK diangkut. Alasannya bukan
kelalaian: resep aslinya memang hidup di `fiezel-motion.css`, dan berkas itu
kembali utuh bersama rig PAW. Dua cacat yang diperbaiki #404 keduanya tidak
berlaku lagi:

1. *Tidak ada pemotongan* — `fiezel-motion.css` memulihkan resep 178%/-8% untuk
   `.fz-coach-bubble`, `.fz-coach-avatar`, dan `.coach-strip-face`.
2. *Bantalan tombol umum menghimpit FAB* — resep PAW memasang maskot
   `position:absolute` dengan `width:178%`. Persen pada elemen ter-absolut
   dihitung terhadap kotak **padding** wadah ter-posisi, jadi
   `body button{padding:13px 20px}` di `fiezel-2.css` tidak bisa lagi menyusutkan
   maskot jadi 15x30. Cacat kedua itu lahir dari rig Nusa/Mira yang memakai
   grid + `width:100%`; ia pergi bersama rignya.

## Yang SENGAJA tidak disentuh

- **`landing.html`** — MIRA di sana adalah maskot sisi GURU pada landing page
  website, lahir di commit rebranding `4406515`, bukan dari #401. PAW sudah
  hadir di halaman itu sebagai maskot sisi murid ("LOCKED LEGACY HERO ASSET").
  Mengganti MIRA butuh keputusan desain tersendiri — tunggu aba-aba OWNER.
- **`assets/characters/`** (39 MB, Nusa & Mira) — tidak lagi dipakai aplikasi,
  tetapi masih dikonsumsi pipeline video `remotion/src/Scene.jsx`, mock
  `design/redesign-v2/`, dan `character-preview.html`. Menghapusnya mematahkan
  ketiganya. Kalau OWNER mau direktori itu ikut pergi, ketiga konsumen harus
  dipindahkan dulu.
- **Splash** — sudah di luar perpindahan #401 atas permintaan OWNER, dan tetap
  di luar yang ini.

## Verifikasi

279 gerbang `quality.yml` dijalankan lokal.

---

## Ronde 2 — CI, merge main, dan dua temuan review

### A9 + A10: spasi ekor (diperbaiki, commit `1bb10a1`)

Keduanya merah karena satu sebab: `git diff --check $BASE_SHA...HEAD` di
`tools/fiezel-guardians.mjs:129` menolak spasi ekor pada baris yang DITAMBAHKAN.
Aset PAW lahir kembali lewat revert, jadi seluruh isinya terbaca sebagai baris
tambahan — padahal berkasnya sendiri tidak berubah sejak dulu. 105 berkas
dirapikan; nol tumpang tindih dengan berkas terkunci checksum, perubahan murni
spasi (diverifikasi dengan menciutkan seluruh runtun spasi), dan 14 SVG yang
gagal di-parse XML ketat sudah gagal SEBELUM commit itu.

### A14: bukan milik PR ini

`HttpError: 500` pada `GET /issues/408/comments` — outage GitHub API yang sama
yang membuat pembuatan PR gagal berulang kali saat itu. Nol baris diff tersentuh.

### A11: main bergerak, nomor build bertabrakan

`origin/main` maju ke `01c5a13` dan MENGAMBIL m025-304 untuk dirinya sendiri,
jadi m025-304 di cabang ini jadi tabrakan. A11 menuntut `headDiag == baseDiag+1`.
Diselesaikan dengan merge `origin/main` lalu `tools/bump-build.mjs` → **m025-305**.

### Satu cacat yang ditemukan SAAT menyelesaikan konflik merge

Konflik `sw.js` jatuh di baris pembuka `const ASSETS=[...]`. Kalau sisi HEAD
diambil bulat-bulat, EMPAT entri non-maskot ikut hidup kembali:
`fiezel-puter-ready.js`, `creator-report-setup.html`,
`creator-report-dashboard.html`, `fiezel-report-worker.js`.

Keempat berkas itu **sudah tidak ada di disk** — dihapus pada migrasi
Puter → Cloudflare (`73cd02a`), bukan oleh #401. Revert memulihkan daftar
precache pra-#401 apa adanya, jadi keempatnya kembali sebagai entri basi.
Akibatnya bukan kosmetik: `cache.addAll()` menolak SELURUH promise-nya kalau
satu URL saja 404 — service worker gagal install, dan seluruh lapisan luring
mati diam-diam.

Resolusinya karena itu bukan "pilih satu sisi": daftar diambil dari main, lalu
entri Nusa/Mira (3 modul rig + 19 aset `assets/characters/`) dibuang dan 3 modul
PAW dimasukkan. Hasil akhir diverifikasi terprogram: 231 entri, nol duplikat,
dan **setiap entri ada di disk**.

### Dua temuan review Gitar — keduanya diverifikasi benar, keduanya diperbaiki

1. `static get expressions()` dideklarasikan DUA KALI dengan badan identik
   (yang kedua membayangi yang pertama). Sisa salin-tempel dari rig lama; satu
   dibuang.
2. `_blinkLoop()` memanggil `matchMedia(...)` dan `document.body.classList`
   telanjang, padahal `_reducedMotion()` di berkas yang sama sudah membungkus
   keduanya dengan `typeof matchMedia === 'function'` + try/catch. Sekarang
   `_blinkLoop()` mendelegasikan ke helper itu — perilakunya identik saat
   keduanya tersedia, dan tidak lagi melempar saat tidak.

Keduanya menyentuh `fiezel-mascot.js` yang PUNYA kembar terkunci checksum, jadi
`tools/export-mascot.mjs` dijalankan sesudahnya. Hash **rig** tidak berubah
(`5fb6293402a4…`) karena kunci itu menghitung geometri rig, bukan logika JS —
hanya hash berkas kembarnya yang naik. `--check` PASS.

### Gerbang yang merah dan BUKAN milik PR ini

Dua belas gerbang backend/Cloudflare/AI merah. Diverifikasi dengan menjalankan
gerbang yang sama pada checkout `origin/main` BERSIH lewat `git worktree`:
merah yang persis sama. Diff cabang ini tidak menyentuh satu pun berkas backend,
AI, analytics, atau Puter — `core-config.js` hanya berubah nomor build, dan
`index.html` hanya bagian maskot.

### Gerbang masuk: satu permukaan Nusa & Mira yang TERLEWAT olehku

Temuan review Gitar, dan temuan ini benar. `index.html:360` — gambar utama
layar `#authGate`, yaitu layar masuk yang dilihat murid — menunjuk
`./assets/characters/team/svg/shoulder-wave.svg` dengan alt "Nusa & Mira".

Ini BUKAN kategori yang sama dengan dua permukaan yang sengaja kubiarkan:
`landing.html` adalah halaman pemasaran sisi guru di website, dan
`assets/characters/` adalah pipeline video. Gerbang masuk ada DI DALAM aplikasi,
dilihat murid, dan menonjol. Permintaan OWNER berbunyi "gantikan seluruh maskot
sekarang" — layar ini termasuk. Aku melewatkannya; daftar "sengaja tidak
disentuh" di atas karena itu tidak lengkap sampai commit ini.

Asalnya dari pekerjaan Google-auth yang sudah ter-merge di main, jadi ia masuk
ke cabang ini lewat merge, bukan lewat revert.

Menggantinya memperbaiki TIGA hal sekaligus, dan dua di antaranya tidak
dilaporkan siapa pun:

1. Maskotnya benar lagi — PAW, bukan karakter yang baru saja dipensiunkan.
2. `assets/characters/team/svg/shoulder-wave.svg` berukuran **293 KB**.
   `assets/brand/paw-mascot-full.svg` berukuran **5 KB**: 98% lebih kecil, di
   layar pertama yang dimuat murid yang belum masuk.
3. SVG lama itu **tidak pernah ada di daftar precache** — tidak di cabang ini,
   tidak juga di `origin/main` (diperiksa: nol kecocokan). Jadi gerbang masuk
   luring selama ini menampilkan gambar rusak. Penggantinya didaftarkan ke
   `ASSETS`, jadi sekarang benar-benar luring.

Aset penggantinya sengaja yang TERKUNCI CHECKSUM (`assets/brand/paw-mascot-full.svg`
ada di `mascot-checksums.json`), supaya ia tidak bisa melenceng diam-diam.

Hasil akhir `ASSETS`: 232 entri, nol duplikat, setiap entri ada di disk.
Nol rujukan `assets/characters` tersisa di seluruh cangkang aplikasi.

### Satu temuan yang SENGAJA tidak kuperbaiki

`index.html` menautkan `./features/ui/fiezel-marshmallow.css` yang tidak ada.
Gitar menyebutnya dibawa oleh merge ini; itu keliru, dan bedanya penting:

- `git log -S` → tag ditambahkan `73cd02a` (migrasi Puter → Cloudflare);
- `git log --all --diff-filter=A` → berkas itu **tidak pernah ada** di riwayat,
  di cabang mana pun;
- `git show origin/main:index.html` → tag yang sama ada di main baris 145 SEKARANG.

Jadi 404-nya sudah tayang dari main hari ini dan tidak lahir di sini. Ia tidak
bersinggungan dengan maskot, jadi menambalnya di PR maskot hanya mencampur diff.
Sudah dibalas di thread-nya dengan bukti + tambalan satu baris, menunggu putusan
OWNER: cabut tag-nya, ATAU tulis berkasnya lalu daftarkan ke `ASSETS`.

Catatan: `73cd02a` kini terbukti meninggalkan DUA jenis rujukan menggantung —
empat entri precache (sudah dibereskan di sini karena kena jalur PR ini) dan satu
tag stylesheet (menunggu OWNER).
