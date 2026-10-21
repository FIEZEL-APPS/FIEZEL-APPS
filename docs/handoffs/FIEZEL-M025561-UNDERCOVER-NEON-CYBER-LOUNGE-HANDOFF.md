# FIEZEL HANDOFF · m025-563 — UNDERCOVER "NEON CYBER-AGENCY LOUNGE"

- **Build yang terbit**: `m025-563` — PR #583, squash `9a94bd5`. Nomor `m025-561` dan `m025-562` lebih dulu diklaim rilis proctor (#584, #586) saat PR ini terbuka, jadi arbiter dinaikkan dua kali sebelum merge; nama berkas handoff ini tetap memakai nomor awalnya. (arbiter `node tools/bump-build.mjs` → `--check`: **Selaras**, 6 titik: `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`)
- **Branch**: `claude/bold-wright-2o64cl` → Pull Request ke `main` (tidak ada push langsung ke `main`)
- **Lingkup**: perombakan total `undercover.html` menjadi game deduksi pesta 6 babak bertema Cyber-Noir, dengan jembatan bukti belajar sungguhan ke Braincore.

---

## 1. Temuan pada versi sebelumnya (alasan perombakan, bukan selera)

Versi WePlay (m025-538) terlihat hidup di layar pengembang, tetapi lima hal di bawahnya rusak:

| # | Temuan | Akibat bagi murid |
|---|---|---|
| 1 | Gaya dimuat dari CDN Tailwind (`gstatic…/tailwindcss.min.js`) dan Google Fonts, padahal halaman ini diprecache service worker | Begitu luring, permainan tampil **tanpa gaya sama sekali** |
| 2 | Semua teks ditulis langsung dalam bahasa Indonesia di HTML/JS | Murid Thai melihat layar berbahasa campur — melanggar aturan dua bahasa di `CLAUDE.md` |
| 3 | Kartu telemetri hasil berisi angka tetap: `+42 XP`, `94% Akurat`, `BKT +0.18` | Data palsu; tidak ada satu pun bukti yang benar-benar sampai ke Braincore |
| 4 | Kartu masuk di `app.js` dan PAW ARENA mengklaim `2–5P ONLINE` | Klaim keliru: permainannya melawan bot, luring |
| 5 | `tests/probe-undercover-redesign.mjs` menunjuk selektor versi m025-536 yang sudah tidak ada | Bukti probe di handoff lama tidak bisa diulang |

Semua lima ditutup di rilis ini.

## 2. Arsitektur

```
undercover.html                         markup + CSS lokal (tanpa CDN), CSP script-src 'self'
features/undercover/
  fiezel-undercover-data.js             8 pasangan kata, chip petunjuk, 6 bot, 6 barang meja
  fiezel-undercover-engine.js           aturan main MURNI & ber-seed (bisa diputar ulang, diuji di Node)
  fiezel-undercover-ui.js               6 babak, animasi, synthesizer Web Audio, antrean bukti
features/i18n/copy-id-undercover.js     330 kunci Indonesia
features/i18n/copy-th-undercover.js     kembaran Thai (dimuat dinamis hanya untuk locale th)
app.js · undercoverEvidenceDrain()      SATU-SATUNYA penulis bukti ke updateMastery() + bktRecord()
```

- **Luring**: fon Plus Jakarta Sans & Noto Sans Thai Looped diambil dari `assets/fonts/` (bobot 800 = berkas 700 + `font-synthesis:none` → tidak ada faux-bold). Keempat skrip baru masuk precache `sw.js`; `copy-th-undercover.js` masuk `locale-assets-th.json` (contentRev 7 → 8).
- **Locale**: halaman satelit tidak bisa membaca state berakun, jadi `app.js` menulis `fiezel-ui-locale-hint` saat boot dan saat locale berganti. Urutan: `?lang=` → petunjuk app → `navigator.language`.
- **100dvh**: layout flex; kursi meja dihitung dari ukuran meja sesungguhnya (elips, `ResizeObserver`), tinggi konsol tetap sehingga meja tidak melompat tiap giliran.

## 3. Alur 6 babak

1. **Briefing Room** — mode *Agen Rahasia* / *Si Polos (Cipher Amnesia)*, formasi 4 kursi (Quick Match) / 6 kursi (Party Brawl), kartu dossier `#01–#06` berstatus SIAP, tombol tambah bot berkepribadian (Rian si Agresif, Alya si Pengamat, Dimas si Pengecoh, Nadia si Santai, Kevin si Analis, Sari si Drama — kepribadian benar-benar menggerakkan mesin: selera risiko petunjuk, derau penilaian, kemampuan menggertak, barang favorit). Hologram meja pratinjau menyala per kursi yang terisi. Matchmaking mengisi kursi kosong dengan animasi pindai.
2. **Biometric Reveal** — sensor sidik jari harus **ditahan** (garis laser + cincin progres; Enter/Spasi untuk keyboard), kartu dossier berputar 3D (`perspective:1000px`, `rotateY(180deg)`) menampilkan peran + kata + arti dalam bahasa murid. Tombol **Intip** di bar atas selalu tersedia selama permainan.
3. **Interrogation** — spotlight berputar mulus ke pembicara, cincin mic ganda + equalizer, timer detak 15 detik. **Clue Synthesizer**: dua dimensi (Sifat/Fungsi · Ciri/Fisik), tiap dimensi 5 chip bilingual — 3 benar tentang katamu (risiko bocor rendah/sedang/total) dan 2 yang **keliru makna**. Bot berbicara lewat balon pop-spring berekor ke kepalanya; log petunjuk ronde tampil di konsol bersama kartu misi + tips deduksi.
4. **Free Debate** (25 detik) — seruan cepat bertarget (`Petunjuk #02 terlalu umum!`, `Aku warga tulen 100%!`, `Kenapa #03 berkeringat?`, `Coba jelaskan ulang alibimu!`), bot saling menuduh/membela diri; ketuk kursi mana pun → tray lempar 🍅 🥚 🔒 🔍 ☕ 🌹 dengan lintasan parabola berputar, cipratan, getar kursi, dan geseran meter SUS.
5. **The Tribunal** — lampu meredup, detak jantung sub-bass, `VOTE TERTUDUH` di tiap kursi, tiket jatuh dan tally real-time, sorot merah *Busted*, palu sidang, stempel **ELIMINASI / EXILED**, peran asli terbuka. Meter **Sus-O-Meter** dan ekspresi (😎 Santai · 😅 Gelisah · 😠 Menuduh · 😱 Tertangkap basah) dihitung dari keyakinan tiap bot + tekanan sosial meja.
6. **Sudden Death & Debrief** — penyusup/Si Polos yang tertangkap punya 8 detik di kisi intel; tebakan benar = menang mutlak. Debrief: banner *AGENT VICTORY* / *UNDERCOVER INFILTRATION*, identitas meja, **komparasi semantik** (mis. BICYCLE vs MOTORCYCLE + nuansanya), **rekap petunjukmu** (cocok / tidak cocok + contoh yang benar), dan telemetri Braincore.

Bila belum ada pemenang, ronde berlanjut (aturan klasik: warga menang bila semua penyusup terbongkar; penyusup menang bila jumlahnya menyamai warga atau tebakannya tepat).

## 4. Braincore — apa yang DICATAT dan apa yang TIDAK

Halaman permainan tidak pernah menulis state otak. Ia mengantrikan baris bukti di `localStorage['fiezel-undercover-evidence-v1']` begitu bukti lahir; `app.js` mencatatnya saat FIEZEL dibuka/ditampilkan kembali lewat jalur yang sama dengan kuis kosakata:

| Bukti | Syarat | Dicatat sebagai | kappa |
|---|---|---|---|
| `clue` — dua chip yang dipilih murid sama-sama cocok dengan kata rahasianya | kata ada di `vocabulary-master.json`; bukan giliran habis waktu; bukan Si Polos | `updateMastery('vocab', <id bank>, ok, ms, null, at)` + `bktRecord({lessonSkill:'vocab_<kata>'}, ok, 0.5)` | 0,5 (tebakan buta masih lolos 36%) |
| `guess` — tebakan sudden death atas kata warga | kata warga ada di bank; murid benar-benar memilih | sama | 0,6 (empat pilihan) |

**Tidak dicatat**: voting (deduksi sosial, bukan bukti makna kata — tetap ditampilkan sebagai statistik), giliran habis waktu, kata di luar bank (MOTORCYCLE, TEA, AIRPLANE, HELICOPTER — debrief menyebutnya terang-terangan). Penjaga di `app.js`: hanya kursus Inggris (antrean menunggu bila murid sedang di kursus Jepang), `vocabId` wajib ada di bank **dan** cocok dengan katanya, `ok` wajib boolean, waktu tidak boleh dari masa depan. Tanda terima (penguasaan sebelum → sesudah, BKT L) ditulis balik ke `fiezel-undercover-receipt-v1` dan ditampilkan lobi.

"XP" tidak ditampilkan: Braincore tidak punya sistem XP, jadi angka itu akan jadi karangan. Penggantinya **Skor agen** — skor permainan lokal yang dihitung dari kejadian pertandingan dan diberi label sebagai skor permainan.

## 5. Audio prosedural (nol berkas audio)

`sfxTap` (sine ramp), `sfxScan` (bandpass sweep), `sfxSpeech` (kicau retro tiga nada), `sfxThrow` (noise whoosh + sawtooth pitch drop), `sfxSplat`, `sfxClang` (borgol), `sfxHeartbeat` (sub-bass lub-dub), `sfxGavel` (dua ketukan palu), `sfxFanfare` (arpeggio triangle multi-osilator), plus `sfxSparkle`, `sfxSteam`, `sfxTick`, `sfxVote`, `sfxFail`. Toggle **SFX ON/OFF** di pojok kanan atas, tersimpan per perangkat; getar haptik ringan ikut mati bersama SFX.

## 6. Bukti empiris

### Probe Playwright — `node tests/probe-undercover-redesign.mjs`

iPhone 390×844, DPR 2, sentuh aktif, `?speed=6`. Hasil: **63/63 PASS**, 0 console error, 37 tangkapan layar + `reports/undercover-redesign/probe-report.json`.

- **A** (warga, BICYCLE vs MOTORCYCLE): lobi → modal cara main → matchmaking → scan ditahan sungguhan → kartu 3D (`matrix3d(-1…)`) → Intip → synthesizer → debat (seruan + tomat terbang + cipratan) → tribunal (tiket, stempel) → sudden death bot → debrief. Antrean berisi `clue:bicycle:true` (`vocab_00082`), nol baris untuk MOTORCYCLE.
- **B** (penyusup PENCIL): chip keliru → bukti `pencil:false`; murid tertangkap → kisi intel → tebakan PEN benar → bukti `guess:pen:true` (`a1_curated_0077`) → *UNDERCOVER INFILTRATION*.
- **C** (locale Thai): lobi, arti kata, arti chip ber-aksara Thai; `<html lang="th-TH">`.
- **D** (Party Brawl 6 kursi, Si Polos): 6 avatar tanpa tumpang tindih dan di dalam meja; Si Polos tanpa kata.
- **E** (index.html sungguhan): `app.js` menguras antrean → `state.vocab.vocab_00082` 1/1 benar, `a1_curated_0077` 0/1, baris cacat dibuang, BKT `vocab_bicycle` 0,20 → 0,36; lobi menampilkan "BICYCLE: penguasaan 0% → 20%".
- Invarian nol-scroll diukur di **22 titik** (setiap babak, tray, modal, kedua locale, kedua formasi): html/body ≤ viewport, layar aktif di dalam viewport, panel internal tanpa isi terpotong.

| Babak | Tangkapan |
|---|---|
| Lobi | [A01](../../reports/undercover-redesign/A01-lobby.jpg) · [D01 6 kursi](../../reports/undercover-redesign/D01-lobby-6p-white.jpg) · [C01 Thai](../../reports/undercover-redesign/C01-th-lobby.jpg) · [E01 laporan Braincore](../../reports/undercover-redesign/E01-lobby-braincore-receipt.jpg) |
| Dossier 3D | [A04](../../reports/undercover-redesign/A04-reveal-front.jpg) · [A05 scan](../../reports/undercover-redesign/A05-reveal-scanning.jpg) · [A06](../../reports/undercover-redesign/A06-reveal-back.jpg) · [A07 Intip](../../reports/undercover-redesign/A07-quick-peek.jpg) |
| Interogasi | [listen](../../reports/undercover-redesign/A-clue-listen.jpg) · [synthesizer](../../reports/undercover-redesign/A-clue-synth.jpg) · [Thai](../../reports/undercover-redesign/C03-th-synth.jpg) · [6 kursi](../../reports/undercover-redesign/D03-table-6p.jpg) |
| Debat | [tray](../../reports/undercover-redesign/A-debate-tray.jpg) · [lemparan](../../reports/undercover-redesign/A-debate-throw.jpg) · [banter](../../reports/undercover-redesign/A-debate-banter.jpg) |
| Tribunal | [redup](../../reports/undercover-redesign/A-tribunal-dim.jpg) · [tiket](../../reports/undercover-redesign/A-tribunal-tickets.jpg) · [busted](../../reports/undercover-redesign/A-busted-r1.jpg) |
| Sudden death | [bot](../../reports/undercover-redesign/A-showdown-bot.jpg) · [murid](../../reports/undercover-redesign/B-showdown-you.jpg) |
| Debrief | [warga menang](../../reports/undercover-redesign/A99-debrief.jpg) · [penyusup mencuri](../../reports/undercover-redesign/B99-debrief.jpg) |

### Gerbang Node baru — `node tests/undercover-game-test.js` (terdaftar di `quality.yml`)

31/31 PASS: integritas dataset vs bank kosakata (kata null wajib memang di luar bank), setiap kunci yang dipakai halaman ada di id **dan** th, 600 pertandingan tersimulasi (2 mode × 2 formasi × 150 seed) sah/deterministik/berakhir, timeout & kata luar bank tidak pernah jadi bukti, `undercoverEvidenceDrain()` **dijalankan** di atas stub (jalur `updateMastery`/`bktRecord`, kappa, baris cacat, kursus Jepang), dan halaman bebas aset luar. Diuji mutasi: menghapus satu kunci Thai atau mengganti kappa → merah.

### Keseimbangan (simulasi 2.000 pertandingan per formasi, murid diwakili bot)

| Formasi | Warga menang | Penyusup mencuri lewat tebakan |
|---|---|---|
| Agen 4 kursi | 64% | 21% |
| Si Polos 4 kursi | 55% | 13% |
| Agen 6 kursi (2 penyusup) | 34% | 50% |
| Si Polos 6 kursi | 39% | 43% |

Formasi 6 kursi sengaja lebih keras untuk warga (dua penyusup = dua kesempatan menebak); peluang tebakan bot dijenuhkan di 4 poin intel supaya tidak mendekati pasti.

## 7. Berkas yang disentuh

- `undercover.html` — ditulis ulang total.
- `features/undercover/*` (baru), `features/i18n/copy-(id|th)-undercover.js` (baru).
- `app.js` — `undercoverEvidenceDrain()` + petunjuk locale + pemanggilan di `openApp()`/`pageshow`/`visibilitychange`; kartu masuk memakai `game.undercover-badge`/`game.undercover-desc`.
- `features/learner-flow/fiezel-paw-arena.js` — kartu Undercover memakai kunci yang sama.
- `features/i18n/copy-(id|th)-redesign.js` — dua kunci kartu masuk.
- `sw.js` (precache 4 skrip baru), `features/i18n/locale-assets-th.json` (copy-th-undercover, contentRev 8).
- `tests/undercover-game-test.js` (baru, terdaftar di `.github/workflows/quality.yml`), `tests/probe-undercover-redesign.mjs` (ditulis ulang), `tests/probe-weplay-undercover.mjs` (dihapus — menunjuk UI yang sudah tidak ada).
- `id-golden-baseline.json` — diregenerasi sadar: +naskah Undercover baru, −1 pseudo-literal yang bergeser karena sisipan kode di dekat `bktRecord()`; nol berkas terkunci berubah.
- `tests/reset-side-state-test.js` + `resetProgress()` di `app.js` — antrean bukti (`fiezel-undercover-evidence-v1`) dan tanda terima (`fiezel-undercover-receipt-v1`) ikut dihapus saat reset progres, supaya lobi tidak menampilkan penguasaan akun sebelum reset; `fiezel-ui-locale-hint` sengaja DIKECUALIKAN dengan alasan tertulis (preferensi bahasa UI, bukan progres belajar). Celah ini ditangkap CI pada commit pertama PR (gerbang R2: "tidak ada kunci localStorage yang lolos tanpa keputusan") dan ditutup di PR yang sama.
- Hexa-sync `m025-563`.

## 8. Utang dan catatan jujur

- **Terjemahan Thai** adalah draf AI (konvensi FiezelI18n) — perlu tinjauan penutur asli sebelum dianggap final.
- **JetBrains Mono** tidak ada di `assets/fonts/`; tumpukan fon memakai `ui-monospace`/Menlo/Consolas sebagai pengganti. Menambah berkas fon berarti menambah bobot precache — keputusan owner.
- **Pasangan "Doctor vs Detective"** dari brief tidak dimasukkan: DOCTOR tidak ada di bank kosakata, jadi pasangan itu tidak bisa menghasilkan bukti. AIRPLANE vs HELICOPTER tetap ada (diminta brief) dan debrief menyatakan terus terang bahwa katanya tidak dicatat.
- Bukti dari permainan tercatat ke akun yang aktif di perangkat saat FIEZEL berikutnya dibuka. Murid yang sudah login wajib (m025-367) mencatatnya setelah gerbang akun selesai.
- Probe adalah alat pra-rilis (butuh Chromium), bukan langkah CI; gerbang CI-nya `tests/undercover-game-test.js`.
