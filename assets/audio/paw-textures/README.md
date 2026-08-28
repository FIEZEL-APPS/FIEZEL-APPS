# FIEZEL — Pustaka Tekstur Kucing (bahan mentah promo, permanen)

Keputusan OWNER 2026-08-28 (**OA-8**): tekstur kucing MENTAH dipakai langsung
untuk 4 SFX PAW ("pakai yang mentah aja, tapi polish sedikit aja"), dan
tekstur-tekstur ini ditetapkan sebagai **bahan mentah permanen OWNER untuk
konten promo** ke depan. Pustaka ini adalah sumber kanoniknya.

## Isi folder

```
paw-textures/
├── raw/        chirp.wav trill.wav purr.wav meow.wav  (+ .ogg)   ← MENTAH
├── polished/   chirp.wav trill.wav purr.wav meow.wav  (+ .ogg)   ← poles ringan
└── README.md
```

(Spektrogram bukti QA `raw_*.png` / `polished_*.png` sengaja TIDAK ikut ke repo —
ia artefak QA, bukan bahan promo; arsipnya tinggal di workspace desain
`pau-redesign/sfx/textures/spectrograms/`.)

- **raw/** — tekstur mentah utuh (full length), TANPA olahan apa pun.
  Satu-satunya penyesuaian: level puncak diseragamkan ke −3 dBFS supaya
  langsung enak dipakai (murni gain, bukan poles).
- **polished/** — tekstur yang sama melalui rantai poles OA-8 (persis rantai
  yang dipakai master SFX): high-pass lembut (buang lumpur/gemuruh), shelf
  tinggi lembut −2..−3 dB (jinakkan desis nafas sintetis), sentuhan ekor
  reverb, fade halus, normalisasi loudness (RMS −20 dBFS; purr −22 dBFS),
  puncak ≤ −1 dBFS. **Tanpa** morph spektral, **tanpa** geser forman,
  **tanpa** carve 1–3 kHz — karakter kucing tetap terdengar jelas.
- **.ogg** — versi web (ffmpeg `-q:a 4`) di samping tiap WAV, siap dipakai
  di halaman/preview promo.

## Empat tekstur & pemetaannya ke SFX PAW

| Tekstur | Karakter | Nada dasar | Durasi mentah | Dipakai oleh SFX |
|---|---|---|---|---|
| `chirp` | cicit cerah menanjak, vibrato ~38 Hz | A4 (440 Hz) | 0,50 s | `paw_greet` (dua chirp F4→A4 = not motif 1-2) — **SUARA KHAS FIEZEL (OA-9)** |
| `trill` | "brrr-up" bergulung, roll 24 Hz | ~C5 (sapuan di sekitar 523 Hz) | 0,70 s | `paw_appear` + `splash_paw_appear` |
| `purr` | dengkuran hangat rendah, AM ~26 Hz | F2 (87,3 Hz) | 2,40 s | `paw_encourage` |
| `meow` | meong enerjik, busur nada naik-turun | F4 (349 Hz, puncak ≈ C5) | 1,40 s | `paw_celebrate` (+ aksen shimmer sangat ringan) |

Semua nada dasar berada di kosakata pitch aplikasi (F2 F3 C4 F4 A4 C5 G5) —
tekstur promo otomatis selaras dengan motif "Ascent & Crown" dan seluruh
pustaka SFX.

## Panduan pakai untuk konten promo

- **Boleh:** potong/loop, atur gain, layer di bawah musik promo, tambah
  reverb/delay rasa ruang, pitch-shift ringan (±2 semitone) untuk variasi.
- **Mulai dari `polished/`** untuk hasil cepat; pakai `raw/` bila butuh
  kendali penuh atas EQ/ruang (raw = kanvas kosong).
- **Jaga karakter:** daya tarik tekstur ini justru chirp/trill/purr/meow-nya —
  jangan diproses sampai tak dikenali (itu desain lama §G yang sudah
  digantikan OA-8 untuk SFX PAW).
- **Loudness konten akhir** mengikuti kontrak SFX bila dipakai in-app
  (puncak ≤ −1 dBFS; pita RMS per kategori di `sfx/SFX-CONTRACT.md`).
- `paw_greet` adalah **suara khas FIEZEL** (OA-9) — chirp adalah tekstur
  "wajah merek"; utamakan chirp untuk stinger/branding promo.

## Provenance & determinisme (catatan jujur)

- Tekstur ini **disintesis prosedural** oleh `sfx/lib/fzsynth.py` — TIDAK ada
  rekaman kucing sungguhan di lingkungan produksi ini (chirp = sapuan FM +
  pewarnaan forman; purr = growl rendah ber-AM ~26 Hz; trill = chirp
  bervibrato 24 Hz; meow = busur nada + forman meluncur). Didokumentasikan
  jujur sesuai kontrak & brief §G.1.
- Generator: `sfx/generators/paw_gen.py` (mode default `raw-polished`),
  fungsi `build_texture_library()` — **deterministik** (seed tetap: chirp 901,
  trill 902, purr 903, meow 904). Menjalankan ulang
  `python3 sfx/generators/paw_gen.py` menghasilkan berkas byte-identik
  (WAV; OGG bergantung versi ffmpeg).
- Parameter lengkap + metrik tiap berkas: `sfx/qa/paw/paw_raw_polished_metrics.json`
  (bagian `textures`).
- Spektrogram tiap berkas ada di `spectrograms/` — sudah diperiksa visual:
  tanpa clipping, ekor bersih, karakter utuh.
