# FIEZEL — Audit kontras universal + swipe-back (handoff m025-85)

**Tanggal:** 2026-08-21 · **Build saat audit:** m025-84 · **Rilis kontras berikutnya:** m025-85 · **Cabang:** `claude/splash-white-flash-sfx-y3hx7e`

Dokumen ini adalah **temuan lengkap**, bukan ringkasan. Ditulis supaya pekerjaan bisa
dilanjutkan dari nol oleh siapa pun tanpa mengulang investigasinya.

---

## 0. Yang dilaporkan OWNER

1. > "coba kamu masuk ke menu os nya, banyak tulisan yang ga terbaca karena warna tulisan
   > dan background sama. aku rasa itu bug lain, aku ingin kamu scan keseluruhan aplikasi
   > universally"

2. > "dan tidak ada sistem swipe back, misalnya dari menu terus menuju ke fitur audiobook,
   > ketika ingin kembali dan swipe back, itu tidak berfungsi"

**Status:** SELESAI. #1 diperbaiki dan dirilis pada **m025-87** (PR #131). #2 diperbaiki dan
dirilis pada m025-84 (PR #128). Dokumen ini dipertahankan sebagai catatan akar masalah dan
sebagai daftar hal yang SENGAJA ditinggalkan - lihat bagian 7.

---

## 1. Akar masalah #1 — teks tidak terbaca

Bukan satu bug. **Tiga sistem warna yang saling bertabrakan**, dan mode gelap kalah di dua
di antaranya.

| Lapisan | Dikendalikan oleh | Lokasi |
|---|---|---|
| `--text --muted --panel --line --accent …` | **tema** (`data-theme`) | `style.css:468-538` |
| `--glass-* --ambient-* --chrome-bg --launcher-*` | **waktu hari** (`body.scene-*`) | `style.css:95-100`, dipasang `app.js:481` |
| latar halaman, topbar, kartu menu | **tidak ada — permanen terang** | `features/tutor-classroom/tutor-v3.css` |

### 1.1 AKAR A — setiap tombol non-primary tidak terbaca di mode gelap

`style.css:102-106`

```css
button{
  font:inherit;
  color:var(--text);      /* mode gelap: #fdf4f6  (hampir putih) */
  border:1px solid var(--line);
  background:#fff;        /* DIPAKU PUTIH, tidak pernah ikut tema */
}
```

Tidak pernah ditimpa untuk tombol non-primary (hanya `button.primary` di `:823` dan
`.primary` di `:174`/`:576` yang mengganti warna). Hasilnya di mode gelap: **teks
`#fdf4f6` di atas `#fff` = kontras 1,08:1.** Ikon Lucide di dalamnya memakai
`currentColor`, jadi ikonnya ikut hilang.

**Ini bug utama yang dilaporkan OWNER.** 85 dari 123 tombol di aplikasi kena, termasuk
seluruh tombol di modal Pengaturan ("Batal", "Tutup", "Lihat data", "Tes suara", "Siapkan
suara Indonesia", "Buat berkas backup", "Pilih berkas backup").

Terukur langsung dari piksel yang tercat:

```
1.08:1  #fdf4f6 on #ffffff  button#reportPreview            «Lihat data»
1.08:1  #fdf4f6 on #ffffff  button#testNeuralVoice          «Tes suara»
1.08:1  #fdf4f6 on #ffffff  button#backupExport             «Buat berkas backup»
1.08:1  #fdf4f6 on #ffffff  div.toolbar > button            «Review Due (0)»
1.08:1  #fdf4f6 on #ffffff  div.card > button               «Buka flashcards»
1.08:1  #fdf4f6 on #ffffff  div.lesson-card-foot > button   «Buka lesson»
1.08:1  #fdf4f6 on #ffffff  header.tutor-head > button      «Subjects»
```

**Perbaikan:** `background:var(--panel)` (terang `#fffdfc`, gelap `#1e1418`) — atau token
permukaan baru. Terang praktis tidak berubah; gelap langsung benar.

### 1.2 AKAR B — kelas `fiezel-ui-v6` dipasang ke SELURUH aplikasi

`features/tutor-classroom/fiezel-tutor-v3.js:863` memanggil `installBrowser()` tanpa syarat
saat skrip dimuat, dan `:443` melakukan:

```js
root.document.documentElement.classList.add('fiezel-ui-v6');
```

Berkasnya adalah `<script>` biasa di `index.html:207`, jadi **setiap aturan
`html.fiezel-ui-v6` di `tutor-v3.css` berlaku di semua layar, bukan hanya Classroom.**
Termasuk:

- `tutor-v3.css:3` — `html.fiezel-ui-v6 body{background:…,var(--ui-bg)}` dengan
  `--ui-bg:#f3f6fb`. Ini **menimpa permanen** `style.css:552 body{background:var(--sky-bottom)}`.
  Badan halaman putih di mode gelap, selalu.
- `tutor-v3.css:4` — `html.fiezel-ui-v6 .global-sky{opacity:.58}` menurunkan satu-satunya
  permukaan gelap yang tersisa jadi 58% di atas badan putih itu.

Ditambah `app.js:478` yang menulis `--sky-top/--sky-bottom/--scene-light` sebagai
**inline style di `documentElement`**, yang mengalahkan semua stylesheet.

**Latar komposit terukur** (langit .58 di atas `#f3f6fb`):

```
12:00 siang -> #F9F6F8    (kartu kaca -> #FDFDFD)
00:00 malam -> #80747D    (kartu kaca -> #322229)
```

Di mode gelap pada jam pakai normal (05:00–19:00), halaman jadi `#F9F6F8` sementara
`--text` adalah `#fdf4f6`. **Itu persis "warna tulisan dan background sama".**

### 1.3 AKAR C — 15 dari 32 token gelap adalah kode mati

> **Koreksi (m025-87).** Bagian di bawah menyebut token scene menang karena "lebih spesifik
> untuk segala isi `<body>`". Itu keliru dan perlu diluruskan supaya orang berikutnya tidak
> salah memperbaikinya: selektornya `.scene-day`/`.scene-dawn`, dan keduanya menang **bukan
> karena spesifisitas melainkan karena PEWARISAN** - mereka duduk di `<body>` sementara
> palet gelap duduk di `<html>`, jadi segala isi body mewarisi nilai body.
> `:root[data-theme="dark"]` justru lebih spesifik dan tetap kalah. Perbaikannya tetap sama
> (kembaran bertema untuk `.scene-*`), hanya alasannya yang berbeda.

Token gelap ini dideklarasikan tapi **tidak pernah berlaku**, karena dibayangi
`body.scene-*` (`style.css:95-100`) atau inline style `app.js:478`:

```
dibayangi body.scene-*  : --ambient-text --ambient-muted --chrome-bg
                          --launcher-start --launcher-end
                          --glass-thin --glass-regular --glass-thick
                          --glass-edge --glass-text --glass-muted --glass-line
dibayangi app.js:478    : --sky-top --sky-bottom --scene-light
```

`body.scene-day` mendefinisikan `--glass-*` dengan nilai TERANG
(`rgba(255,255,255,.74)`, `--glass-text:#1b1418`). Karena `body` lebih spesifik untuk
segala isi `<body>` daripada `:root`, nilai terang itu menang di mode gelap.

**Perbaikan:** blok `body.scene-*` harus sadar tema — tambahkan
`:root[data-theme="dark"] body.scene-day{…}` dst. dengan material gelap.

---

## 2. Inventaris lengkap — permukaan yang dipaku terang

### 2.1 `style.css` — wajib diperbaiki

| Baris | Selector | Deklarasi | Akibat di mode gelap |
|---|---|---|---|
| 106 | `button` | `background:#fff` | **1,08:1** — 85 tombol |
| 169 | `.status-pill` | `background:rgba(255,255,255,.7);border:1px solid #f3dfe3` | teks tema di atas putih |
| 212 | `.option` | `background:#fdfafa` | pilihan jawaban kuis |
| 217 | `.option:hover` | `background:#fff;border-color:#e7cdd2` | idem |
| 222 | (blok contoh) | `background:#fafbfd` | |
| 251 | `.flashcard`-dsb | `background:rgba(255,255,255,.96)` | |
| 264 | | `background:rgba(255,255,255,.86)` | |
| 289 | `.flash-face` | `background:#fdfefe` | isi flashcard |
| 314 | `.level-card` | `background:#fff` | + `:316 p{color:var(--muted)}` |
| 328 | (panel dialog) | `background:rgba(255,255,255,.98)` | |
| 338 | `.notification-status` | `background:#f5f3ec;color:var(--muted)!important` | **2,06:1** |
| 434 | `.passage` | `background:#f9fbfd` | seluruh teks bacaan |
| 438 | `.confidence-box` | `background:#fff` | |
| 447 | `.diag-grid>div` | `background:#fdfafa` | |
| 569 | `.icon-button` | `background:rgba(255,254,250,.78);color:var(--text)` | **1,06:1** — tombol Pengaturan di topbar; ikonnya `currentColor` jadi ikut hilang |
| 575 | `.card` | `background:rgba(255,254,250,.93)` | |
| 614 | `.mission-panel` | `background:rgba(255,254,250,.9)` | |
| 619 | `.home-stats` | `background:rgba(255,254,250,.9);color:var(--text)` | **1,05:1 malam** |
| 630 | `.voice-setup-card`, `.neural-voice-choice select` | `rgba(255,254,250,.93)`, `background:#fff` | |
| 631 | `.privacy-strip` | `background:rgba(255,254,250,.9)` | |
| 640 | `.report-settings` | `background:#f6f4ed` | **1,90:1** untuk semua `.muted` di dalamnya |
| 647 | `.report-preview` | `background:#f7f5ef` | |
| 659 | `.bottomnav` | `background:rgba(255,254,250,.88)` | |
| 662 | `.feedback` | `background:rgba(255,254,250,.96)` | |
| 668 | `.lesson-example` | `background:#f8f6ef` | |
| 669 | `.practice-contract` | `background:rgba(255,254,250,.9)` | |
| 882 | `.journey-mission,.journey-today,.journey-goal` | `background:rgba(255,254,250,.9)` | |
| 893 | `.journey-skills` | `background:rgba(255,254,250,.9)` | |

### 2.2 `features/tutor-classroom/tutor-v3.css` — berlaku SE-APLIKASI (lihat 1.2)

| Baris | Selector | Deklarasi |
|---|---|---|
| 2 | `html.fiezel-ui-v6` | seluruh blok `--ui-*` hanya punya nilai terang |
| 3 | `html.fiezel-ui-v6 body` | `var(--ui-bg)` = `#f3f6fb` |
| 4 | `html.fiezel-ui-v6 .global-sky` | `opacity:.58` |
| 6 | `html.fiezel-ui-v6 .topbar` | `background:rgba(250,252,255,.80)`, `border:rgba(255,255,255,.68)` |
| 12 | `html.fiezel-ui-v6 .hero` | `linear-gradient(145deg,#fff,#f5f8ff,#edf4ff)` |
| 14 | `html.fiezel-ui-v6 .launch-card` | `background:rgba(255,255,255,.88)` — **6 kartu menu Home, 1,07:1 saat senja/malam** |
| 57 | `.scene-dusk/.scene-night .topbar` | `background:rgba(247,249,253,.82)` |
| 58 | desktop `.bottomnav` | `background:rgba(255,255,255,.90)` |
| 29,30,33,37,39,46,47,48,51,53,55,56 | `.tutor-*` (Classroom) | `#fff`, `#fbfcff`, `#faf9ff`, `#f4f7fc`, `#f7f9fc`, `rgba(255,255,255,.82/.86/.91)` |

### 2.3 Token yang hilang dari palet gelap

- `--shadow-sm/md/lg` — hanya ada versi terang (`rgba(40,20,26,.05)` dst). Kosmetik.
- `--glass-text`, `--glass-muted`, `--glass-line` — **tidak ada di blok `:root` mana pun**,
  hanya di `body.scene-*`. `index.html` memaku `class="scene-day"` jadi ini laten, bukan
  aktif. Tetap harus diberi nilai bawaan.

### 2.4 Tidak ada drift antar blok gelap

`@media (prefers-color-scheme:dark) :root:not([data-theme="light"])` (`style.css:510-521`)
dan `:root[data-theme="dark"]` (`:523-538`) **identik byte-per-byte**, 32 token masing-masing.
Catatan: blok media query praktis mati — `features/ui/fiezel-dark-mode.js:25` selalu
memasang `data-theme` saat OS gelap, jadi selektor atribut selalu menang.

### 2.5 Warna terang yang SAH — jangan "diperbaiki"

- `.primary`, `.auth-primary`, `.quiz-next` → `color:#fff` di atas `var(--black)`/`var(--accent)`.
  `--black` sengaja dipetakan ke `#8C2233` di mode gelap justru supaya tetap 7,3:1 dengan putih.
- `.toast{background:var(--black);color:#fff}` — pil gelap permanen.
- `.launcher-shell` dan seluruh anaknya (`#f8f8fb`, `#c8cad8`, `#e8a3ad`, `.ghost-dark`,
  `.launcher-actions .luxe`) — shell-nya gradien marun gelap permanen.
- `.notification-gate`, `.voice-bundle-sheet`, `.daily-lock`, `.library-*-sheet` — scrim.
- Seluruh lapisan `--fz-*` (splash + onboarding, `style.css:920-1180`) — sengaja bukan skema
  aplikasi, terdokumentasi di `style.css:911-918`.
- `.launch-icon` dan `.result-icon` — pasangan tint+tinta yang konsisten sendiri.
- `.global-celestial.sun/.moon` — ilustrasi matahari/bulan.
- `features/neural-voice/fiezel-diag-panel.js` — panel debug, bukan UI produk.
- `ecohero-quest/` — sub-aplikasi terpisah, tidak dirujuk `index.html`/`app.js`/`sw.js`.

---

## 3. Rencana perbaikan yang disarankan

Urutan ini disengaja: langkah 1 sendirian sudah menghilangkan gejala terparah.

1. **Token permukaan.** Tambahkan ke `:root` v6 (`style.css:468`), dengan nilai terang
   PERSIS seperti literal sekarang supaya mode terang tidak berubah:
   ```css
   --surface-rgb:255,254,250;   /* dipakai rgba(var(--surface-rgb),.9) dst */
   --surface-solid:#ffffff;
   --surface-tint:#fdfafa;
   --surface-warm:#f6f4ed;
   --surface-cool:#f9fbfd;
   ```
   dan versi gelapnya di KEDUA blok gelap:
   ```css
   --surface-rgb:32,21,26; --surface-solid:#201519; --surface-tint:#261b21;
   --surface-warm:#241b1c; --surface-cool:#1a1c24;
   --shadow-sm:0 8px 24px rgba(0,0,0,.35);
   --shadow-md:0 20px 50px rgba(0,0,0,.45);
   --shadow-lg:0 34px 90px rgba(0,0,0,.60);
   ```
   Lalu ganti seluruh literal di tabel 2.1 dengan token itu. **`button{background:#fff}`
   → `var(--surface-solid)` adalah satu baris yang memperbaiki 85 tombol.**

2. **`--ui-*` sadar tema.** Tambahkan di `tutor-v3.css` setelah baris 2:
   ```css
   :root[data-theme="dark"].fiezel-ui-v6{
     --ui-bg:#150c11;--ui-surface:rgba(32,21,26,.90);--ui-surface-strong:#20151a;
     --ui-line:rgba(255,232,236,.13);--ui-edge:rgba(255,232,236,.14);
     --ui-text:#fdf4f6;--ui-muted:#c3aeb5;--ui-accent:#8fb2ff;--ui-accent-soft:#1e2942;
     --ui-shadow:0 18px 55px rgba(0,0,0,.45)}
   ```
   (plus kembarannya di `@media (prefers-color-scheme:dark)`), dan ganti literal terang di
   baris 6, 12, 14, 57, 58 serta `.tutor-*` dengan token itu.

3. **`body.scene-*` sadar tema.** Tambahkan `:root[data-theme="dark"] body.scene-day{…}`
   (dan `.scene-dawn`) dengan material gelap, supaya 12 token kaca/ambient di 1.3 berhenti
   jadi kode mati. Nilai `.scene-night` yang sudah ada bisa dipakai apa adanya sebagai dasar.

4. **Turunkan `--muted` di mode gelap.** Setelah permukaan jadi gelap, `--muted:#c3aeb5`
   sudah benar. Jangan diubah sebelum langkah 1-3 selesai, atau mode terang ikut rusak.

5. **Tes regresi.** Tambahkan `contrast-test.js`: baca `style.css` + `tutor-v3.css`,
   resolusikan custom property untuk KEDUA tema tanpa browser, lalu untuk daftar pasangan
   (selector, warna teks, warna latar) hitung rasio WCAG dan tolak apa pun di bawah 4,5:1.
   Deterministik, tanpa dependensi, aman untuk CI. Daftarkan di `.github/workflows/quality.yml`.

6. **Ritual penanda rilis** — `FIEZEL_PAGE_BUILD`, `DIAG_BUILD`, `SW_REV` dinaikkan bersama.

---

## 4. Perkakas audit yang dipakai (bisa dipakai ulang)

Scanner kontras berbasis **sampling piksel nyata**, bukan tebakan dari CSS. Tebakan dari
CSS gagal justru di kasus terpenting aplikasi ini — latar gradien, kaca buram, dan lapisan
tembus pandang bertumpuk, di mana warna nyata di belakang sebuah huruf tidak ada di
deklarasi mana pun.

Cara kerjanya: potret viewport → gambar ke `<canvas>` di dalam halaman → untuk setiap
elemen berteks ambil kotak glif sebenarnya lewat `Range.getClientRects()` → kuantisasi
warna piksel → warna terbanyak = latar, warna terjauh darinya = tinta → hitung rasio WCAG.

Tiga hal yang WAJIB dimatikan dulu, ketiganya membuat pengukuran mengukur benda yang salah
(ketiganya sudah ditemukan dan ditangani):

1. **Transisi CSS** — memotret di tengah transisi membaca warna antara.
   Suntikkan `*{transition:none!important;animation:none!important}`.
2. **Lapisan yang menutupi** — cek `document.elementFromPoint()` di tengah kotak glif;
   kalau yang kena bukan elemen itu, lewati.
3. **Elemen yang sengaja diredupkan** (di belakang modal, di balik gerbang) — hitung
   opacity efektif berantai, lewati bila < 0,6. Gerbang `#voiceBundleSheet` memasang
   dirinya LAGI setiap ganti layar, jadi perlu `MutationObserver` untuk menahannya.

Berkasnya ada di scratchpad sesi ini (`pixel-audit.cjs`, `scan.cjs`). **Belum dipindahkan
ke repo** — kalau mau dipertahankan, taruh di `tools/` dan jangan daftarkan di CI (butuh
Playwright); pakai `contrast-test.js` statis (langkah 5) sebagai gerbang CI.

---

## 5. Bug #2 — swipe-back (dirilis bersama m025-84)

**Akar masalah:** `app.js:739-741`. `function go(v)` hanya mengubah `state.view` lalu
render ulang. Tidak pernah ada `history.pushState`, jadi riwayat browser cuma punya satu
entri: gestur swipe-back / tombol Back Android tidak melakukan apa-apa, atau malah keluar
dari PWA. Layar yang lebih dalam dari sebuah view — pembaca audiobook
(`features/library/fiezel-library-ui.js`), modal (`openModal`/`closeModal`), layar kuis —
punya masalah yang sama.

**Sedang dikerjakan** oleh subagent di git worktree terpisah, dengan spesifikasi:
modul `features/ui/fiezel-back-nav.js` (gaya UMD sama seperti `fiezel-splash.js`),
integrasi History API dengan tumpukan lapisan sendiri (modal ditutup dulu, baru pindah
view), plus gestur geser-dari-tepi sebagai cadangan untuk iOS standalone (Safari tidak
menyediakan swipe-back di mode standalone) — dengan syarat batal kalau gestur dimulai di
dalam elemen yang bisa digulir horizontal, dan tidak boleh membuat murid lolos dari
gerbang notifikasi/akun.

**Pembaruan:** sudah selesai dan digabung ke PR #128, berangkat sebagai bagian dari rilis
`m025-84` yang sama - bukan rilis terpisah, karena gate A7/A11 menuntut penanda naik tepat +1
dari `main`. Nomor `m025-85` disediakan untuk perbaikan kontras di dokumen ini.

---

## 6. Yang SUDAH selesai dan sudah di-push

PR #128 (`m025-84`) — dua bug boot yang dilaporkan sebelumnya:
- layar putih ~3 detik sebelum splash → splash dipindah ke frame pertama;
- SFX splash yang bocor ke menu → tidak ada lagi penjadwalan ke AudioContext `suspended`.

Suite lokal 89/89 lulus, ditambah regresi `splash-first-paint-test.js` (21 pemeriksaan).


---

## 7. Hasil akhir dan yang sengaja ditinggalkan (m025-87)

Diperbaiki: 12 token permukaan baru dengan nilai terang identik dengan literal yang
digantikannya, kembaran gelapnya di kedua blok gelap, `--ui-*` mendapat palet gelap, dan
`.scene-day`/`.scene-dawn` mendapat kembaran bertema. Tombol non-primary naik dari **1,08:1
ke 16,44:1**.

Satu hal yang tidak ada di rencana enam langkah dan baru terlihat setelah diukur:
`app.js:478` menulis `--sky-top`/`--sky-bottom` sebagai **inline style** di
`documentElement`, digerakkan jam dan tidak pernah sadar tema. Inline style tidak bisa
dikalahkan dari stylesheet, tetapi opacity lapisannya bisa - `.global-sky` karena itu
diredam khusus di tema gelap.

Gerbang barunya `contrast-test.js`: 46 pasang x 3 keadaan = 138 rasio WCAG, tanpa browser,
latar dibaca dari deklarasi yang menang di berkas. Diuji-mutasi terhadap ketiga akar.

**Sengaja ditinggalkan, dan ini penting untuk pekerjaan berikutnya:**

1. **`--ui-muted` 4,38:1 di mode TERANG** pada tint dingin Classroom (sebelumnya 4,36:1).
   Memperbaikinya berarti menggelapkan token mode terang, yang dilarang syarat "mode terang
   tidak boleh berubah". `.tutor-summary-grid span` dikecualikan dari daftar pasangan
   dengan komentar yang menyebut alasannya.
2. **Mode terang di malam hari belum dimodelkan.** Saat senja/malam token kaca membalik
   jadi gelap sementara `--text`/`--muted` tetap versi terang. Yang paling keras:
   `tutor-v3.css` memaksa topbar terang di senja/malam sementara `.brand-button` memakai
   `--ambient-text` yang `#fdf4f6` setelah matahari terbenam - **wordmark FIEZEL sekitar
   1,03:1 di mode terang setelah pukul 16:00.** Setiap perbaikan di sana mengubah tampilan
   mode terang, jadi ia pantas jadi keputusan desain tersendiri, bukan diselipkan.
