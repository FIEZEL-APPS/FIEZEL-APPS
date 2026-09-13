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
