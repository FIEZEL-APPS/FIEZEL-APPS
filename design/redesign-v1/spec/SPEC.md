# FIEZEL REBRAND — SPEC.md (developer-ready)

Sumber kebenaran: `redesign/DIRECTION.md` (kontrak brand "Warm Paper, Bright Mind") + `redesign/audit/AUDIT.md` (temuan) + kode aktual `fiezel-apps/style.css` (2741 baris), `app.js` (4213 baris), `index.html`, `features/` (20 subdir), `sw.js`.

Semua jumlah kemunculan di bawah dihitung dengan grep `var(--token…)` nyata pada **style.css + app.js + index.html + sw.js + seluruh features/** (JS & CSS), per 26 Agu 2026, commit `a06c9dc` di branch `main`.

---

## 0. Fakta struktur kode yang WAJIB dipahami sebelum menyentuh token

1. **Ada DUA blok `:root` di style.css.** Blok 1 (baris 6, "Design System v5 / palet pastel m025-115") mendefinisikan palet pastel lengkap (`--cream`, `--yellow`, `--coral`, dst) *plus* netral (`--bg`, `--panel`, `--text`, radius 26/18/13). Blok 2 (baris 594, "v6") **menimpa** netral-netral itu (`--bg`, `--panel`, `--text`, `--muted`, radius 22/16/12, shadow set kedua) dan menambah keluarga `--surface-*`, `--glass-text/muted/line`, `--wordmark-*`, `--fz-*`. Untuk token yang didefinisikan dua kali, **blok 2 yang menang**. Perubahan token harus diterapkan di **kedua blok** (atau blok 1 dibersihkan dari duplikat) — jangan hanya blok atas (kesalahan ini sudah pernah terjadi, lihat komentar baris 590–593).
2. **Empat stylesheet dimuat** (index.html baris 77–85): `style.css` → `features/speaking-listening/speaking-listening-addon.css` → `features/tutor-classroom/tutor-v3.css` → `features/mascot/fiezel-motion.css` (sengaja terakhir). `tutor-v3.css` punya blok token sendiri `html.fiezel-ui-v6{--ui-*}` (baris 2) yang meng-hardcode palet pastel — ikut dimigrasi.
3. **Test memarse CSS secara statis dari file**, bukan dari browser: `contrast-test.js` membaca `style.css` + `tutor-v3.css` langsung (`SOURCE = {style, tutor}`); `pastel-field-contrast-test.js` **memaku literal palet** (`BRIEF_PALETTE: --cream #FFF8ED, --ink #2B2118, --yellow #FFD23F, --coral #EE5D4A, --gold #C9A24B`) dan mem-blacklist palet lama (`SUPERSEDED`). Konsekuensi arsitektural: **file `tokens.css` terpisah TIDAK akan terlihat oleh test-test ini.** Keputusan spec: nilai token diedit **in-place di `:root` style.css** (kedua blok), dan kunci literal di test **dipindahkan ke nilai baru pada commit yang sama** — preseden resminya ada di komentar style.css baris ±640: *"kuncinya dipindahkan ke nilai baru di contrast-test, bukan dibuang."* (Alternatif: buat `tokens.css` + tambahkan ia ke `SOURCE` test — boleh, tapi lebih banyak titik sentuh; lihat MIGRATION.md Fase 1.)
4. **Font**: `assets/fonts/` saat ini hanya berisi `InstrumentSerif-400.woff2` + `PlusJakartaSans-400/500/600/700.woff2`. **FZ Fredoka belum ada di repo app** — file `Fredoka-var.woff2` tersedia di `redesign/screens/a/assets/fonts/` dan harus disalin ke `fiezel-apps/assets/fonts/` (self-host wajib; `onboarding-test.js` menggagalkan Google Fonts CDN).
5. **DESIGN-SYSTEM.md sudah basi terhadap kode**: §1 masih mendokumentasikan palet maroon `#8C2233` dan mode gelap, padahal `:root` aktual sudah pastel dan mode gelap dihapus sejak m025-134 (dicatat sendiri di contrast-test.js). Dokumen itu tetap benar soal *aturan* (token-only, dua font, lucide subset, reduced-motion, urutan gate) — aturan-aturan itu **dibawa serta** ke sistem baru.

---

## 1. Pemetaan token LAMA → BARU (satu per satu, dengan jumlah pemakaian)

Format kolom: `token lama` | nilai lama | jumlah `var()` (sebaran) | token baru | nilai baru | tindakan.

### 1a. Permukaan (surface)

| Lama | Nilai | Pakai | Baru | Nilai | Tindakan |
|---|---|---|---|---|---|
| `--cream` | #FFF8ED | **2** (style:1 — `.fz-coach-dot` border b.2120; features:1) | `--bg` | #FFF9EE | Ganti pemakaian ke `--bg`; sediakan alias `--cream:var(--bg)` selama transisi, hapus di Fase 3. |
| `--cream-deep` | #FFF0DC | **0** | — | — | Hapus (mati). |
| `--bg` | #FFF8ED | **3** | `--bg` | #FFF9EE | Nilai digeser (blok 1 & 2). |
| `--panel` | #FFFFFF | **37** (style:29, features:8) | `--panel` | #FFFFFF | Tetap. |
| `--panel-soft` | #FFF0DC | **29** (style:25, features:4) | `--panel-soft` | #FFF3DC | Nilai digeser. |
| `--line` | #F2E6D3 | **68** (style:58, features:10) | `--line` | #F0E4CF | Nilai digeser. |
| `--line-soft` | #F8F0E4 | **3** | `--line-soft` | #F7EFDF | Nilai digeser. |
| `--surface-rgb` | 255,253,248 | **6** | tetap | 255,249,238 (= #FFF9EE) | Selaraskan dengan `--bg` baru (dipakai `rgba(var(--surface-rgb),α)` di card/bottomnav). |
| `--surface-pure-rgb` | 255,255,255 | **8** | tetap | tetap | Tetap. |
| `--bg-rgb` | 255,249,240 | **2** | tetap | 255,249,238 | Selaraskan. |
| `--surface-solid/tint/warm/cool` | #ffffff/#fffbf4/#fdf4e6/#f7f7f1 | **7/4/4/2** | tetap | geser tipis ke keluarga #FFF9EE bila perlu | Boleh tetap di Fase 1 (delta kecil, non-teks). |
| `--surface-edge` | #f2e2cb | **23** | tetap | #F0E4CF (= `--line`) | Satukan dengan `--line` — mengurangi 1 keluarga garis. |
| `--surface-mute` | #f0e8dc | **2** (a.l. `.quiz-next:disabled` b.347) | tetap | tetap | Permukaan disabled; teksnya yang diganti (lihat §3.4). |
| `--surface-edge-strong` | #e8d3b2 | **2** | tetap | tetap | Tetap. |
| `--sky-top`/`--sky-bottom` | #FFE9B8/#FFF8ED | **1/5** (index.html:1) | tetap | dasar `--bg` #FFF9EE; puncak keluarga `--sun-soft` | Sistem langit-per-jam di app.js baris 85–93 (array hex hardcoded) ikut dikalibrasi di Fase 3. |
| `--scene-light` | rgba(255,224,126,.42) | **2** | tetap | turunan `--sun` alpha | Fase 3. |
| `--chrome-bg` | rgba(255,249,240,.82) | **3** | tetap | rgba(255,249,238,.82) | Selaraskan dengan `--bg`. |
| `--launcher-start/end` | #FFF1D2/#FFD23F | **2/2** | tetap | #FFF3C4 (`--sun-soft`)/#FFC700 (`--sun`) | Gradien launcher ikut kanon Solar. |

### 1b. Tinta (ink)

| Lama | Nilai | Pakai | Baru | Nilai | Tindakan |
|---|---|---|---|---|---|
| `--ink` | #2B2118 | **59** (style:58, features:1) | `--text` | #241A11 | `--ink` jadi alias `--ink:var(--text)` di Fase 1 (59 pemakaian aman tanpa edit massal); migrasi nama bertahap di Fase 2–3. |
| `--text` | #2B2118 | **45** (style:39, features:6) | `--text` | #241A11 | Nilai digeser. |
| `--black` | #2B2118 | **3** | alias | `var(--text)` | Jadikan alias; jangan tambah pemakaian baru. |
| `--muted` | #6F5F48 | **70** (style:67, features:3) | `--muted` | #6E5E47 | Nilai digeser (5,8:1 → tetap lulus AA). |
| `--muted-soft` | #8B7A60 | **9** | `--muted-soft` | #857350 | Nilai digeser + **aturan pemakaian baru: hanya teks ≥14px** (nilai lama 3,94:1 gagal teks normal — audit §3a). Ganti pemakaian <14px ke `--muted`. |
| `--ink-soft` | #4E4130 | **2** | tetap | tetap | Tetap. |
| `--ink-danger` | #A63A24 | **1** | `--bad` | #B8432D | Merge ke semantic. |
| `--ambient-text/muted` | #2B2118/#6F5F48 | **5/5** | tetap | #241A11/#6E5E47 | Ikut geser (di-override kelas `scene-*`). |
| `--glass-text/muted/line` | #2B2118/#6F5F48/rgba | **16/11/17** | tetap | #241A11/#6E5E47/tetap | Ikut geser. |

### 1c. Energi brand (kuning → Solar)

| Lama | Nilai | Pakai | Baru | Nilai | Tindakan |
|---|---|---|---|---|---|
| `--yellow` | #FFD23F | **18** (style:16, features:2) | `--sun` | **#FFC700** | Kanonisasi kuning brand (audit §2 menandai dualisme #FFD23F vs #FFC700). Alias `--yellow:var(--sun)` di Fase 1; rename pemakaian di Fase 2. Kontras ink #241A11 di #FFC700 ≈ 10,9:1 — CTA tetap lulus. |
| `--yellow-deep` | #E0B22A | **14** | `--sun-deep` | #E6A800 | idem (shadow chunky 4px tombol, focus ring baru). |
| `--yellow-soft` | #FFF1C9 | **5** | `--sun-soft` | #FFF3C4 | idem (nav aktif, tile, bubble coach). |
| *(baru)* | — | — | `--sun-press` | #CC9600 | State tekan CTA. |
| *(baru)* | — | — | `--sun-grad` | linear-gradient(180deg,#FFDE59,#FFA500) | CTA hero / momen energi. |
| `--gold` | #C9A24B | **5** | **demosi** | — | Per pemakaian: b.364 & b.1781(×2) focus ring → `--sun-deep` (aturan focus §3.7); b.721 `.launcher-greeting` (teks di shell gelap) → `--sun`; b.745 `.coach-body strong` (di kartu gelap) → `--sun`. `--gold` sebagai TEKS di cream dilarang (2,27:1). Token tetap ada untuk splash/ikon brand di bidang gelap. |

### 1d. Coral — DEMOSI (pengganti per pemakaian, 17 titik `var()` + 4 hex mentah)

Coral tidak lagi jadi permukaan tombol/aksi (DIRECTION: "coral/mint/lilac TIDAK lagi jadi permukaan tombol/aksi"). Boleh hidup terbatas sebagai stiker/ilustrasi dengan tinta ink.

**`--coral` #EE5D4A — 6 pemakaian:**

| Lokasi | Peran sekarang | Pengganti |
|---|---|---|
| style.css:279 `.toast{background:var(--coral)}` | bg toast (lalu di-override navy #101628 b.806 → **bug kontras terparah**) | Toast baru: `background:var(--core)` #1B1418, `color:var(--on-core)` #FDFAF3; **hapus** override `.toast{background:#101628}` b.806. |
| style.css:357 `.quiz-listen-btn` bg (tombol "Dengarkan" grammar) | permukaan aksi coral | `background:var(--text)` (ink) + `color:#FDFAF3`, ATAU `background:var(--sun)`+ink. Rekomendasi: **ink surface** (aksi sekunder, tidak bersaing dengan CTA kuning). Hover #F7B0A3 (b.361, hex mentah) → `--core-soft`-setara terang: `#3A2C20`. |
| style.css:1986 `.primary.is-coral` bg | varian CTA coral | Remap ke varian **ink CTA**: bg `--text`, teks #FDFAF3, shadow `0 4px 0 #000`-keluarga; atau hapus kelas & fallback ke `.primary` sun. Cari pemanggil `is-coral` di app.js sebelum hapus. |
| style.css:2120 `.fz-coach-dot` bg (badge notif maskot) | dot coral + border `--cream` | bg `--bad` #B8432D + teks #FFF; border `var(--bg)`. |
| style.css:2207 `.streak-badge` border | border coral | `--sun-deep` #E6A800. |
| style.css:2209 `--fz-i-fill:var(--coral)` (ikon api streak) | fill ilustrasi | #FFA500 (ujung `--sun-grad`) — streak = energi matahari, bukan merah. |

**`--coral-deep` #C9432F — 6 pemakaian:** b.359/363/366 (shadow chunky `.quiz-listen-btn`) → mengikuti permukaan baru tombol (ink → shadow `rgba(0,0,0,.35)` flat / `--sun-deep` bila varian sun); b.1986/1988 (shadow `.primary.is-coral`) → ikut remap kelas; b.2535 `.hero-stat.is-streak svg` → `--sun-deep`.

**`--coral-soft` #FDE3DE — 5 pemakaian:** b.536 tombol confidence-1 → `--bad-soft` #FDE3DE (hex sama, **rename semantik**: "kurang yakin" memang semantik negatif); b.2093 `.grammar-launch .launch-icon` tile → boleh tetap sebagai **stiker modul** (ilustrasi, ikon ink) — rename token stiker `--sticker-coral:#FDE3DE`; b.2155 `.fz-coach-msg.is-user` bubble → `--sun-soft` #FFF3C4; b.2207 `.streak-badge` bg → `--sun-soft`; b.2534 `.hero-stat.is-streak` bg → `--sun-soft`.

**Hex coral mentah:** `#EE5D4A` app.js:3141 (array warna confetti `['#FFD23F','#EE5D4A','#A8DCC4','#C9BCE4','#C9A24B']`) → ganti array jadi keluarga baru `['#FFC700','#FFA500','#FFDE59','#2E8B69','#B8432D']` (confetti = perayaan, boleh warna-warni tapi dari palet baru); `#C9432F` juga hidup sebagai `--wordmark-accent-hi` (index.html SVG wordmark) → **pertahankan** (identitas wordmark F + dua balok terracotta; dijaga `topbar-logo-contrast-test.js` terhadap bg — verifikasi ulang terhadap #FFF9EE).

### 1e. Pastel lain — demosi ke stiker

| Lama | Nilai | Pakai | Tindakan |
|---|---|---|---|
| `--mint` | #A8DCC4 | **0** `var()`; 1 hex di app.js:3141 (confetti) + 1 di style | Hapus token; confetti diganti (lihat 1d). |
| `--mint-soft` | #E9F7F0 | **1** (b.2094 `.reading-launch .launch-icon`) | Sama dengan `--good-soft` (hex identik) → pakai `--good-soft` / `--sticker-mint`. |
| `--teal-pastel` | #9FD5CE | **0** | Hapus. |
| `--lilac` | #C9BCE4 | **0** `var()`; hex di app.js:3141 | Hapus token; confetti diganti. |
| `--lilac-soft` | #F1EDF9 | **1** (b.2095 `.skills-launch .launch-icon`) | Boleh tetap sebagai stiker modul (`--sticker-lilac`), ikon tetap ink. |

### 1f. Aksen terracotta (teks aksi merah)

| Lama | Nilai | Pakai | Tindakan |
|---|---|---|---|
| `--accent` | #C2402C | **51** `var()` + **36 hex mentah** (style:31, features:5, a.l. tutor-v3.css & fsl fallback) | **PERTAHANKAN** di Fase 1–2 (4,9:1 lulus AA, audit PRESERVE). DIRECTION tidak menyediakan pengganti teks-aksi; terracotta = tinta aksen wordmark. Fase 3: audit ulang pemakaian <18px, arahkan ke `--accent-strong`. Hex mentah 36 titik dinormalisasi ke `var(--accent)` bertahap. |
| `--accent-strong` | #A33422 | **25** | Tetap (6,5:1). |
| `--accent-soft` | #FDE3DE | **12** | Tetap (hex = `--bad-soft`; satukan literal). |
| `--accent-on-glass` | var(--accent-strong) | **8** | Tetap. |
| `--wordmark-ink-hi/lo`, `--wordmark-accent-hi/lo` | #2B2118/#4A382A/#C9432F/#A33422 | **2/1/1/1** (index.html SVG) | ink-hi/lo geser ke #241A11/#4A382A; accent tetap. Wajib lolos `topbar-logo-contrast-test.js` di atas #FFF9EE. |

### 1g. Semantic

| Lama | Nilai | Pakai | Baru | Nilai |
|---|---|---|---|---|
| `--green` | #2E8B69 | **11** | `--good` (alias `--green`) | #2E8B69 (tetap). Aturan: sebagai teks <18px pakai varian gelap #1F6B4E (audit: 3,97:1 hanya lolos large). |
| `--green-soft` | #E9F7F0 | **5** | `--good-soft` | #E9F7F0 (tetap). |
| `--red` | #C9503A | **10** | `--bad` (alias `--red`) | **#B8432D** (naik dari 4,24:1 gagal → ≥4,5:1 di cream). |
| `--red-soft` | #FDE3DE | **6** | `--bad-soft` | #FDE3DE (tetap). |
| *(baru)* | — | — | `--info` / `--info-soft` | #8C6D1F / #FFF3C4 — pengganti peran "toast navy" untuk info non-blocking (DIRECTION). |

### 1h. Intelligence (BARU — panel AI "Bright Mind")

Tidak ada padanan lama. Ditambahkan di Fase 1, dipakai Fase 3:

```css
--core:#1B1418; --core-soft:#2A2126; --core-line:#3A3038;
--on-core:#FDFAF3; --on-core-muted:rgba(253,250,243,.68);
```

Pemakai: toast (Fase 2), panel BrainCore/analyzing/diagnosis/adaptive path (Fase 3), splash (sudah gelap — jembatani dengan `--core`). HEMAT: panel/kartu momen AI saja, bukan layar penuh. Catatan: `manifest.json background_color:#120C0F` disamakan ke `--core` #1B1418 di Fase 3 (mengubah manifest = perilaku install PWA; cek `install-health-test.js` & `pwa-release-coherence-test.js`).

### 1i. Bentuk, bayangan, gerak

| Lama | Nilai (blok1 / blok2-menang) | Pakai | Baru |
|---|---|---|---|
| `--radius-lg` | 26px / **22px** | **3** | **24px** |
| `--radius-md` | 18px / **16px** | **9** (features:6) | **16px** (tetap) |
| `--radius-sm` | 13px / **12px** | **0** `var()` (nilai 12–13 banyak di-hardcode) | **12px**; Fase 2: tarik hardcode 13/15/17/20/22px ke token (audit: 8 varian radius) |
| `--shadow-sm` | 2 set bersaing | **5** | `0 2px 10px rgba(36,26,17,.06)` |
| `--shadow-md` | idem | **2** | `0 10px 30px rgba(36,26,17,.09)` |
| `--shadow-lg` | idem | **2** | `0 24px 60px rgba(36,26,17,.15)` — satukan, hapus set kembar di blok 1 |
| `--ease` | cubic-bezier(.22,.8,.28,1) | **55** | tetap |
| `--ease-spring` | cubic-bezier(.34,1.4,.4,1) | **16** | tetap |
| `--dur-s/m/l` | .18/.32/.5s | **12/9/4** | tetap (DIRECTION: 160–420ms; `--dur-l` hanya overlay) |
| `--glass-thin/regular/thick/solid/edge/blur(-heavy)` | rgba(255,253,248,…) | **1/0/10/5/4/0/2** | basis putih-hangat digeser ke rgb(255,249,238); `--glass-regular` & `--glass-blur` mati → hapus |

### 1j. Tipografi (token font)

| Lama | Nilai | Pakai | Baru |
|---|---|---|---|
| `--fz-display` | 'FZ Instrument Serif' | **7** (`.section-head h1`, `.welcome-panel h2`, `.modal-panel h2`, `.fiezel-title`) | **'FZ Fredoka'** (variable, 500–700). Instrument Serif dihapus perannya (REPLACE) kecuali kutipan testimonial — buat `--fz-quote:'FZ Instrument Serif'` bila dipakai. **Prasyarat: salin `Fredoka-var.woff2` ke `assets/fonts/` + `@font-face` self-host** (onboarding-test.js melarang CDN). |
| `--fz-heading` | 'FZ Plus Jakarta Sans' | **6** (h1–h4, `.brand`, `.welcome-mark`, `.modal-mark`) | Tetap Jakarta — judul kartu/UI = Jakarta 700 (DIRECTION). |
| `--fz-body` | 'FZ Plus Jakarta Sans' | **16** | Tetap. |

**Skala tipe (mobile) — token baru** `--fs-display:28px; --fs-h1:22px; --fs-h2:18px; --fs-body:15px; --fs-label:13px; --fs-micro:12px`. **LANTAI 12px.** Pelanggar yang terpetakan (semua → 12px/.75rem kecuali disebut):

| Lokasi | Sekarang | Baru |
|---|---|---|
| `.ask-button .ask-label` (style:1772, "Tanya FIEZEL?") | **7px** | 12px, weight 700, tracking .08em |
| `.nav` (b.306) / mobile (b.851) | .65rem / **.59rem** (9,4px) | 12px kedua breakpoint |
| `.section-kicker` (b.643) | .63rem | 12px tracking .16em |
| `.eyebrow` (b.195) | .66rem | 12px |
| `.brand-edition` (b.632) | .66rem | 12px |
| `.coach-head small` (b.737) | .6rem | 12px |
| `.home-stats small` (b.759) | .62rem | 12px |
| `.launcher-meta`/`.lesson-example>span`/dst (.63–.66rem) | <12px | 12px |
| `.fz-coach-dot` (b.2122) | .55rem | angka badge min 10px **hanya jika non-esensial**; lebih baik 12px & dock membesar (§3.8) |

**Weight**: dipakai 400/500/600/620/650/700/750/760/800/850/900 — file font hanya 400/500/600/700. Kunci ke **400/500/600/700** (+Fredoka 500–700); ganti 620→600, 650→600 atau 700, 750/760/800/850/900→700. Angka data: Jakarta 700 + `font-variant-numeric:tabular-nums`.

---

## 2. Blok `:root` target (hasil akhir Fase 1, ditulis in-place menggantikan nilai lama)

```css
:root{
  /* surface */
  --bg:#FFF9EE; --panel:#FFFFFF; --panel-soft:#FFF3DC; --line:#F0E4CF; --line-soft:#F7EFDF;
  /* ink */
  --text:#241A11; --muted:#6E5E47; --muted-soft:#857350; /* muted-soft HANYA ≥14px */
  /* brand energy */
  --sun:#FFC700; --sun-deep:#E6A800; --sun-press:#CC9600; --sun-soft:#FFF3C4;
  --sun-grad:linear-gradient(180deg,#FFDE59,#FFA500);
  /* intelligence */
  --core:#1B1418; --core-soft:#2A2126; --core-line:#3A3038;
  --on-core:#FDFAF3; --on-core-muted:rgba(253,250,243,.68);
  /* semantic */
  --good:#2E8B69; --good-soft:#E9F7F0; --bad:#B8432D; --bad-soft:#FDE3DE;
  --info:#8C6D1F; --info-soft:#FFF3C4;
  /* aksen terracotta (dipertahankan) */
  --accent:#C2402C; --accent-strong:#A33422; --accent-soft:#FDE3DE;
  /* shape/depth/motion */
  --radius-lg:24px; --radius-md:16px; --radius-sm:12px;
  --shadow-sm:0 2px 10px rgba(36,26,17,.06); --shadow-md:0 10px 30px rgba(36,26,17,.09);
  --shadow-lg:0 24px 60px rgba(36,26,17,.15);
  --ease:cubic-bezier(.22,.8,.28,1); --ease-spring:cubic-bezier(.34,1.4,.4,1);
  --dur-s:.18s; --dur-m:.32s; --dur-l:.5s;
  /* ALIAS KOMPATIBILITAS — hapus bertahap Fase 2–3, JANGAN dipakai di kode baru */
  --cream:var(--bg); --ink:var(--text); --black:var(--text);
  --yellow:var(--sun); --yellow-deep:var(--sun-deep); --yellow-soft:var(--sun-soft);
  --green:var(--good); --green-soft:var(--good-soft); --red:var(--bad); --red-soft:var(--bad-soft);
  /* stiker modul (ilustrasi saja, teks selalu ink) */
  --sticker-coral:#FDE3DE; --sticker-mint:#E9F7F0; --sticker-lilac:#F1EDF9;
}
```

Alias membuat 59× `--ink`, 18× `--yellow`, dst tetap resolve tanpa edit massal → risiko Fase 1 rendah. Coral **sengaja tidak diberi alias** (`--coral` dkk dihapus dari `:root`) — 17 pemakaiannya diganti eksplisit di Fase 2 sesuai tabel 1d; sampai Fase 2, fallback `var(--coral,var(--panel))` di `.quiz-listen-btn` (b.357) sudah menyelamatkan render. **Kecuali**: b.279 `.toast`, b.536, b.1986, b.2093, b.2120, b.2155, b.2207, b.2209, b.2534–2535 memakai `var(--coral*)` TANPA fallback → titik-titik itu wajib diganti **di commit Fase 1 yang sama** dengan penghapusan token (atau tunda penghapusan token coral ke Fase 2 — opsi yang direkomendasikan MIGRATION.md).

---

## 3. Spesifikasi komponen inti

Semua nilai = token; dilarang hex mentah (aturan DESIGN-SYSTEM.md dipertahankan). Target sentuh ≥44px universal.

### 3.1 Tombol
- **Primer (sun)** `.primary`, `.quiz-next`, `.auth-primary`: bg `--sun`, teks `--text`, border 0, tinggi **52px**, radius **18px** (pill konteks; bukan token — bentuk), font Jakarta **17px/700**, tracking −.01em; shadow chunky `0 4px 0 var(--sun-deep), var(--shadow-sm)`; hover bg `--sun-deep`; active translateY(3px) + shadow `0 1px 0 var(--sun-deep)`; press-color `--sun-press` untuk state tekan lama.
- **Primer (ink)** — CTA alternatif & aksi audio: bg `--text`, teks `#FDFAF3` (`--on-core`), spec ukuran sama. Dipakai `.quiz-listen-btn`, `.fsl-primary` ("Dengarkan"/"Nilai jawaban"): padding 11px 18px, min-height 44px, radius `--radius-md` 16px, ikon lucide 20. Kontras ≥13:1 (perbaikan wajib audit #1: 1,92/1,45 → lulus).
- **Sekunder**: bg `--panel`, border 1px `--line`, teks `--text`, tinggi 48px, radius 16px.
- **Text-button** (`.text-button`, "Lihat detail"): teks `--accent-strong`, min-height 44px (hit-area via padding), 13px/700.
- **Disabled** (perbaikan wajib #4): JANGAN opacity global (.42 di b.147). Resep: bg `--panel-soft`, teks `--muted` #6E5E47 (≥4,5:1 di #FFF3DC), border `--line`, ikon `lock` lucide 16 bila terkunci, `cursor:not-allowed`. `.quiz-next:disabled` (b.347: `--surface-mute`+`--muted-soft` = 3,42:1) diganti resep ini.

### 3.2 Toast (REPLACE — bug terparah)
`.toast` (b.277) — bg `--core` #1B1418, teks `--on-core` #FDFAF3 (≈15:1), radius 999px, padding 13px 20px, font 13px/700, bottom 96px, shadow `--shadow-md`; varian sukses: ikon `--good` di chip `--good-soft`. **Hapus `.toast{background:#101628}` b.806.** Info-inline non-toast pakai `--info` di `--info-soft`. Toast tidak boleh menutup kontrol (z-index di bawah confidence-pop, auto-dismiss ≤4s). Fitur `features/mascot/micro-ui.css` `.fz-toast` disamakan.

### 3.3 Bottom nav
`.bottomnav` (b.299): bg `rgba(var(--surface-pure-rgb),.86)` + blur (tetap), radius 22px→`--radius-lg` 24px, 5 tab grid. `.nav`: label **12px/600** (naik dari .65rem & .59rem mobile b.851), warna `--muted` (bukan `--muted-soft` — 3,94:1 gagal), ikon 20px stroke 1.75, min-height 54px. `.nav.active`: teks `--text`, tile `--sun-soft`, `--fz-i-fill:var(--sun)`, dot indikator `--sun-deep`.

### 3.4 Answer choice / option
`.option` (b.248): bg `--panel`, border 1px `--line`, radius `--radius-md` 16px (dari hardcode 15px), padding 15px 16px, teks 16px/600 `--text`, min-height 53px. Hover: border `--surface-edge-strong`. `.correct`: border `--good`, bg `--good-soft` + ikon check. `.wrong`: border `--bad`, bg `--bad-soft` + ikon cross. **Disabled saat review**: teks TETAP `--text` ≥4,5:1, hanya `pointer-events:none` + check/cross (audit REFINE: jangan turunkan ke 2,3:1).

### 3.5 Feedback card & confidence pop
`.feedback` (b.257): panel `--panel`, border `--line`, radius 18px→`--radius-lg`, aksen kiri inset 4px `--good`/`--bad`; judul 18px/700 warna `--good`/`--bad`; explain 15px/1.6 `--text`; `.memory-tip` bg `--sun-soft` + ikon; `.ai-btn` = tombol sekunder + ikon sparkles. Tutor-turn lama → collapse accordion; CTA "Lanjut" sticky (audit REFINE). Confidence pop: sheet `--panel` radius-atas 24px; tombol 1/2/3 = `--bad-soft` / `--sun-soft` / `--sun` (teks selalu ink), tinggi 52px; "Baca penjelasan dulu" = text-button 13px `--accent-strong`.

### 3.6 Topbar & kartu
Topbar: bg `--chrome-bg` (basis #FFF9EE), wordmark SVG token `--wordmark-*` (jaga `topbar-logo-contrast-test.js`); `.icon-button` 42px visual + hit-area 44px; `.ask-button` label **12px**. Launch-card: bg `--panel`, border `--line`, radius 20px→`--radius-lg` 24px, padding 24px, judul Jakarta 15px/700, meta 13px `--muted`, tile ikon = stiker (`--sun-soft`/stiker pastel) dengan ikon ink. Kartu AI/BrainCore (Fase 3): bg `--core`, teks `--on-core`, garis neural `--sun` alpha, radius 24px — panel saja, bukan layar penuh.

### 3.7 Focus & motion
Focus-visible **konsisten satu resep**: `outline:2px solid var(--sun-deep); outline-offset:2px` — mengganti 7 aturan `:focus-visible` yang kini campur (`--gold` b.364/1781, rgba merah). Motion: pakai token `--ease/--ease-spring/--dur-*`, durasi 160–420ms, hormati `prefers-reduced-motion` (blok global sudah ada — pertahankan).

### 3.8 Aturan maskot dock (REFINE perilaku, PRESERVE identitas)
Kode sekarang: `.fz-coach-bubble` fixed `right:16px; bottom:calc(104px + safe-area)`, **58×58px**, bg `--yellow` border 2px `--ink` (b.2104–2113); `.fz-coach-peek` bubble di `right:84px`, max-width 230px, auto-dismiss tanpa tombol tutup (by design). Audit §3c: maskot menutupi feedback, kartu buku, tombol "Nilai jawaban", dst.

Aturan baru (DIRECTION §maskot):
1. **Slot dock kanan-bawah 88px** (area 88×88 di atas bottom nav, `right:16px; bottom:calc(104px+safe-area)`) — maskot TIDAK PERNAH keluar slot menutupi konten interaktif/feedback; alternatif **inline slot kartu** (mis. di header kartu feedback) saat konteks butuh maskot dekat konten.
2. **Auto-hide/geser**: bila elemen interaktif (button/input/feedback aktif) beririsan dengan slot (deteksi `getBoundingClientRect` di `features/mascot/fiezel-mascot.js`), maskot menyusut ke 44px atau `hidden` sementara. Layar dengan CTA kanan-bawah (listening "Nilai jawaban") = maskot pindah inline.
3. **Reaksi kontekstual state nyata**: `correct / encouraging / hinting / listening / celebrating / thinking` — dipetakan ke scene `data-fz-scene` yang sudah ada di fiezel-motion.css (home/vocab/grammar/reading); jangan animasi acak.
4. **Bubble coach maks 2 baris**, 12–13px, auto-dismiss ≤5s, `pointer-events:none` pada bubble agar tak menghalangi tap target; dot badge `--bad` + teks putih.
5. Reduced-motion: semua animasi paw idle mati (blok sudah ada — pertahankan).
6. Aset: `assets/brand/paw-mascot-full.svg` + `features/mascot/fiezel-mascot.js`; `paw-mascot-test.js` wajib tetap hijau.

### 3.9 Label internal & copy
Perbaikan wajib #5: key internal tidak bocor — `indonesianPartOfSpeech()` sudah ada di app.js (b.3178, 3241); pastikan SEMUA jalur judul quiz vocab memakainya (audit menemukan "VOCABULARY PARTOFSPEECH · 2" di f08b — cari template yang menampilkan `type` mentah di app.js ±3235 dan map `partOfSpeech→'Jenis kata'`, dst). Copy konsisten: satu bentuk "Belum tepat, tidak apa-apa." (audit §3e).

---

## 4. Matriks kontras kunci (nilai baru, dihitung terhadap #FFF9EE / permukaan tercantum)

| Pasangan | Rasio | Status |
|---|---|---|
| `--text` #241A11 di `--bg` #FFF9EE | ≈15,9:1 | AA/AAA |
| `--text` di `--sun` #FFC700 | ≈10,9:1 | AA/AAA |
| `--muted` #6E5E47 di `--bg` | ≈5,9:1 | AA |
| `--muted-soft` #857350 di `--bg` | ≈4,5:1 | AA hanya ≥14px (aturan) |
| `--on-core` #FDFAF3 di `--core` #1B1418 | ≈15:1 | AA/AAA (toast/panel AI) |
| #FDFAF3 di `--text` #241A11 (tombol ink) | ≈15,9:1 | AA/AAA |
| `--bad` #B8432D di `--bg` | ≈5,4:1 | AA (naik dari 4,24) |
| `--good` #2E8B69 di `--bg` | ≈3,9:1 | large-text only → teks kecil pakai #1F6B4E |
| `--info` #8C6D1F di `--info-soft` #FFF3C4 | ≈4,6:1 | AA |
| `--muted` #6E5E47 di `--panel-soft` #FFF3DC (disabled) | ≈5,5:1 | AA (naik dari 3,42) |
| `--sun` vs `--bg` (bidang) | ≈1,35:1 | non-teks — wajib border/ink outline (sudah pola chunky) |

Finalisasi angka presisi = tanggung jawab pembaruan `contrast-test.js`/`pastel-field-contrast-test.js` (test menghitung sendiri dari CSS — angka di atas panduan desain).
