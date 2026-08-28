# FIEZEL · M025-187 — HANDOFF THAI: LUBANG CAKUPAN DI LUAR COPY-MAP

**Status:** temuan audit + prompt kerja untuk AI dev Thai.
**Bukti mesin:** `TH-COVERAGE-GAP-INVENTORY.json` (594 literal, 38 berkas).
**Perubahan runtime dalam handoff ini:** NOL. Ini dokumen kerja, bukan patch.

---

## 1. Ringkas temuan

`th-coverage-test.js` HIJAU 103/103. Itu benar dan tidak berbohong — tapi ia hanya
mengukur **paritas antar copy-map** (`copy-th-*` vs `copy-id-*`), naskah brain,
grammar-explanations, dan vocabulary. Ia **tidak bisa melihat kalimat Indonesia yang
tidak pernah masuk copy-map sama sekali**. Di situlah seluruh keluhan owner berada:
kata motivasi, tombol panel, pembahasan, dan sebagian pengaturan tetap Indonesia
untuk murid `th` karena string-nya literal di titik pakai, bukan kunci `t()`.

Audit ulang seluruh 104 skrip yang dimuat `index.html`, dibandingkan terhadap 1.758
nilai kanon `id` yang benar-benar terdaftar lewat `registerCopy('id', …)`:

**594 literal berbahasa Indonesia di 38 berkas terkirim tidak punya kunci i18n.**

### Modul dengan NOL jahitan i18n (murid th melihat 100% Indonesia di sini)

| Berkas | Literal | Permukaan yang bocor |
|---|---:|---|
| `grammar-labels-id.js` | 130 | **Pembahasan/label grammar** — judul & deskripsi 153 template ("Kebiasaan atau sedang berlangsung: present simple…"). Nama berkas sendiri sudah menyatakan `-id`; tidak ada `grammar-labels-th.js`. |
| `features/quota/quota-copy.js` | 51 | **Notice kuota suara/AI/terjemahan** yang dirender `app.js:3112` (`FiezelQuotaCopy`). Ada `copy-th-quota.js`, tapi ia hanya menutup blok `aiErrorMessage` di app.js — badan `quota-copy.js` sendiri tidak ikut. |
| `features/neural-voice/fiezel-diag-panel.js` | 25 | Tombol & status panel diagnostik ("(player tidak tersedia)", "(kill switch CF belum dimuat)"). |
| `features/neural-voice/fiezel-cf-voice-notice.js` | 20 | **Notice suara habis** — duplikat naskah kuota, jalur render kedua, juga tanpa i18n. |
| `features/brain/fiezel-step-tutor.js` | 16 | **Pembahasan bertahap** ("coba kenali dulu — … yang mana di kalimat ini?"). |
| `features/brain/fiezel-srl-coach.js` | 16 | **Kata motivasi/refleksi kalibrasi** ("Kamu yakin X tapi benar Y. Taksiranmu lebih tinggi…"). |
| `features/prasasti/fiezel-prasasti-core.js` | 13 | **Nama & syarat prasasti/pencapaian** ("Jaga runtun 7 hari", "Seratus Hari"). |
| `features/brain/fiezel-olm.js` | 12 | Narasi model belajar terbuka ("Pola ini akan diuji ulang pada latihan berikutnya."). |
| `features/brain/fiezel-tutor-brain.js` | 10 | **Pembahasan miskonsepsi** ("Langkah 3 - jadi bentuk yang dipakai: …"). |
| `features/brand/fiezel-choreography.js` | 8 | Naskah koreografi splash (kandidat a11y/alt-text). |
| `features/audio/fiezel-ui-sfx.js` | 8 | Pesan status audio yang bisa naik ke UI. |
| `features/neural-voice/fiezel-voice-offline-autoload.js` | 6 | Status unduh suara offline. |
| `features/neural-voice/fiezel-prosody.js` | 5 | Label prosodi. |
| `features/speaking-listening/gems-core.js` | 3 | **Saldo Gem** ("1 gem per sesi · saldo kamu: …"). |
| `features/search/fiezel-search.js` | 2 | Label kategori pencarian ("kata bantu", "perbaiki kalimat"). |
| sisanya (`content-canary`, `fiezel-continuity`, `fiezel-voice-*`, `fiezel-paw-slot`, `listening/speaking-adaptive`, `neural-voice-config`) | 1–2 masing-masing | pesan tepi/log. |

### Modul yang SUDAH ber-i18n tapi masih bocor sebagian

| Berkas | i18n calls | Literal tersisa | Contoh yang bocor |
|---|---:|---:|---|
| `app.js` | 677 | 170 (≈49 jelas learner-facing) | `L1395` "Keluar sekarang dihitung gagal dan ujiannya terkunci 24 jam. Tetap keluar?" · `L5003/L5129` "Selesaikan ritme hari ini" · `L6429` "Merasa sudah bisa? Buktikan kapan saja" · `L7180/L7404` "Belum tepat, tidak apa-apa." · `L7547` "Tes level selesai" · `L7874` **Pengaturan getaran** "Perangkat ini mendukung getaran" · `L8610` "Kamu lagi offline. Sambungkan internet dulu, ya" |
| `features/speaking-listening/fiezel-speaking-listening-addon.js` | 19 | 22 | `L710` tombol "Mulai bicara" · `L696` "Benar"/"Salah" · `L489` placeholder "Ketik yang kamu dengar" · `L648` "Catatanmu (tidak disimpan)" |
| `features/tutor-classroom/fiezel-tutor-dialog.js` | 46 | 14 | `L282–L292` **system prompt tutor** ("Kamu adalah FIEZEL, asisten belajar berbahasa Indonesia…") — tutor akan menjawab murid th dalam bahasa Indonesia. `L44–L54` kata kunci intent ("belum paham", "sekali lagi") tidak akan pernah cocok dengan input Thai. |
| `features/ui/fiezel-coach-bubble.js` | 27 | 14 | **Kata motivasi Pau** ("Dikit tapi jadi, lebih baik daripada panjang tapi ga selesai.", "Ini peta kemampuanmu — bukan rapor.") · `L209` aria-label "Buka pembimbing FIEZEL" · `L365` prompt AI tips · `L406` "lagi mikir…" |
| `features/library/fiezel-library-ui.js` | 2 | 7 | aria-label navigasi bacaan, "Tanya tentang bacaan ini", placeholder contoh pertanyaan. |
| `features/tutor-classroom/fiezel-tutor-v3.js` | 9 | 9 | naskah tutor sisa. |
| `features/onboarding/*`, `fiezel-mascot.js`, `fiezel-splash.js`, `fiezel-module-selftests.js` | tinggi | 1–4 | sisa tepi. |

### Dua kelas bug yang lebih dalam dari sekadar terjemahan

1. **Prompt AI berbahasa Indonesia dikirim untuk murid th.** `fiezel-tutor-dialog.js:282–292`
   dan `fiezel-coach-bubble.js:365` mengunci persona ke "berbahasa Indonesia". Walaupun
   seluruh UI diterjemahkan, jawaban tutor tetap Indonesia. Ini bukan copy-map — ini
   percabangan prompt per-locale.
2. **Pencocokan intent berbasis kata Indonesia.** `fiezel-tutor-dialog.js:44–54`
   (`'belum paham'`, `'ulang lagi'`, `'apa itu'`) tidak akan pernah cocok dengan
   ketikan Thai; murid th kehilangan seluruh jalur pintasan dialog secara diam-diam.

---

## 1b. P0 — MURID TH TIDAK BISA MASUK TES PENEMPATAN SAMA SEKALI

**Gejala owner:** murid th menekan Tes Level (25 soal), muncul toast
`Placement blueprint shortfall C1/vocab: 0/1`. Tes tidak pernah mulai. Ini BUKAN masalah
terjemahan — ini logika yang rusak untuk aksara non-Latin, dan ia lebih gawat dari 594
literal di atas karena memblokir seluruh permukaan asesmen.

### Akar masalah — satu baris

`app.js:309`

```js
const value = key.toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
```

`norm()` membuang SEMUA karakter di luar `[a-z0-9 ]`. Untuk teks Thai hasilnya
**string kosong**. `norm()` dipakai 62 kali di `app.js` dan berdiri tepat di jalur asesmen:

- `validateQuestion` (`app.js:772`): `if(opts.some(x=>!x) || new Set(opts).size!==opts.length)`
  → **`duplicate/empty options`**. Empat pilihan arti Thai semuanya ter-normalisasi jadi `''`
  → satu kosong dan empat duplikat sekaligus. Setiap soal vocab th ditolak.
- `sigQ()` (`app.js:313`): tanda tangan soal ikut kosong → dedupe `seen` menganggap semua
  soal vocab th sebagai soal yang sama.
- `makeVocabQuestion` (`app.js:6297–6315`): `uniqueByNorm`, `ownMeaningKey`, `glossesOf`,
  `sharesGloss` — seluruh pemilihan pengecoh bekerja di atas string kosong.
- `buildPlacement` (`app.js:6915`): kandidat habis tanpa satu pun lolos →
  `throw new Error('Placement blueprint shortfall …')` → `startPlacement` menangkapnya dan
  hanya menampilkan toast. Murid tidak punya jalan masuk.

### Kenapa yang dilaporkan C1, bukan A1

Diverifikasi terhadap data nyata (`vocabulary-master.json` + `vocabulary-th.json`, 1.765 entri
dengan padanan Thai LENGKAP 100% — datanya tidak salah):

| Level | Kandidat | Gloss th yang `norm()`-nya tidak kosong | Gloss unik | Butuh |
|---|---:|---:|---:|---:|
| A1 | 217 | 4 | 4 | 3 |
| A2 | 310 | 2 | 2 | 2 |
| B1 | 519 | 2 | 2 | 2 |
| B2 | 576 | 5 | 4 | 2 |
| **C1** | **42** | **0** | **0** | **1** |
| **C2** | **101** | **0** | **0** | **1** |

Hanya **13 dari 1.765** gloss Thai yang selamat, dan semata karena kebetulan memuat pecahan
Latin di dalam kurungan — mis. `are = เป็น; อยู่; คือ (รูปของ 'to be' สำหรับ 'you/we/they')`
→ `norm()` → `"to be you we they"`. Itu sisa sampah, bukan arti. Band A1–B2 lolos secara
kebetulan lewat serpihan ini; C1 dan C2 tidak punya satu pun, jadi **C1 adalah titik henti
keras pertama**. Artinya: angka `0/1` di pesan galat itu bukan kekurangan data, melainkan
`norm()` yang menghapus seluruh bank.

### Radius ledakan di luar placement

- Seluruh sesi vocab th (latihan harian, review, adaptif) memakai `makeVocabQuestion` +
  `validateQuestion` yang sama.
- `contentIntegrityGate` → `contentLanguageFrame` (`app.js:735`) menghitung kata id vs en di
  atas `norm()`; teks Thai selalu `'neutral'`, jadi gerbang belahan bahasa **buta total** untuk
  th — persis gerbang yang seharusnya menangkap kolase tiga bahasa.
- `features/search/fiezel-search.js:82` memakai pola `[^a-z0-9'/\s-]` yang sama → indeks
  pencarian th ikut kosong.

### Yang WAJIB dikerjakan (masuk prompt sebagai W5-0, sebelum gelombang lain)

1. Jadikan `norm()` sadar-Unicode. Pertahankan lipatan huruf besar/kecil dan pembuangan tanda
   baca, tapi **simpan huruf Thai**: pakai kelas properti Unicode (`\p{L}\p{N}` dengan flag
   `u`) alih-alih daftar putih `a-z0-9`. Verifikasi memo `NORM_MEMO` tetap benar.
2. Buktikan `norm()` untuk teks Indonesia menghasilkan keluaran **byte-identik** dengan hari
   ini — ia menyentuh dedupe, pemilihan pengecoh, dan gerbang integritas; perubahan diam-diam
   di jalur id akan menggeser soal murid Indonesia. Ini syarat lulus, bukan catatan kaki.
3. `contentLanguageFrame`: tambahkan pengenalan kerangka Thai supaya gerbang belahan bahasa
   hidup untuk th, bukan sekadar berhenti menolak.
4. Selaraskan `fiezel-search.js:82` dengan pola yang sama.
5. Gerbang baru `th-placement-test.js`: rakit `buildPlacement()` di bawah locale th dengan
   dataset asli dan tuntut 25 soal terbangun penuh, blueprint terpenuhi di **keenam** band.
   Merah bila ada band yang shortfall. Tanpa gerbang ini, tidak ada yang mencegahnya kembali.
6. Sapu jalur asesmen lain untuk asumsi aksara Latin yang sejenis: `speaking-listening`
   `normalizeText` (`:182`), `listening-quality.js:23`, `fiezel-prosody.js:183`. Tentukan mana
   yang memang HARUS Latin (penilaian ucapan bahasa Inggris — biarkan) dan mana yang menilai
   teks murid (perbaiki). Tulis keputusannya per berkas, jangan diseragamkan.

**Prioritas: W5-0 mendahului W5-A sampai W5-D.** Menerjemahkan tombol tidak ada gunanya
selama murid th tidak bisa masuk ke sesi asesmen mana pun.

---

## 2. PROMPT UNTUK AI DEV THAI

> Salin blok di bawah utuh sebagai instruksi kerja.

```
PERAN
Kamu dev multilingual FIEZEL. Tugasmu: menutup 594 literal Indonesia yang belum
ber-i18n sehingga murid locale 'th' tidak lagi melihat kolase Indonesia–Thai–Inggris.
Baseline emas tetap 'id'. Murid Indonesia TIDAK BOLEH melihat perubahan satu byte pun.

SUMBER KEBENARAN (baca dulu, jangan menebak arsitektur)
- features/i18n/fiezel-i18n.js  → kontrak t(), registerCopy(), setLocale(), fallback
  locale → 'id' → kunci mentah; placeholder BERNAMA ({nama}), tanpa pluralization.
- features/i18n/fiezel-th-loader.js → daftar TH_SCRIPTS wajib sejalan 1:1 dengan
  features/i18n/locale-assets-th.json. Setiap copy-th baru WAJIB masuk kedua daftar.
- th-coverage-test.js → gerbang paritas kunci/placeholder/aksara Thai.
- TH-COVERAGE-GAP-INVENTORY.json → inventaris 594 literal (berkas, baris, teks).
- FIEZEL-M025187-THAI-COVERAGE-GAP-HANDOFF.md → dokumen ini.

HUKUM BESI (melanggar = tolak PR, ini bukan preferensi)
1. JANGAN PERNAH meneruskan locale UI ke opsi audio / voice-say / kunci cache audio.
   Kunci cache memuat locale; kebocoran meyatimkan 1.170 aset ElevenLabs + korpus
   Deepgram di R2 secara diam-diam. Gerbang: audio-locale-guard-test.js.
2. Nilai copy-map 'id' WAJIB byte-identik dengan kalimat yang hari ini ada di kode.
   Ekstraksi = pindah, bukan tulis ulang. Gerbang: id-golden-snapshot-test.js.
   Copy-map WAJIB tinggal di features/i18n/ (gerbang menghitung literal dari
   app.js + features/**).
3. registerCopy() MELEMPAR pada kunci ganda. Kunci tabrakan = bug ekstraksi, perbaiki,
   jangan ganti nama asal lolos.
4. Naskah kuota WAJIB tetap di korpus register yang dihitung
   quota-notice-a11y-test.js (daftar eksplisit copy-id-quota.js / copy-id-notice.js).
   Kalimat kuota yang pindah ke berkas lain KELUAR dari korpus dan gerbang kehilangan
   penjaganya — kalau memang perlu berkas baru, daftarkan berkas itu ke gerbangnya
   dalam PR yang sama.
5. Ritual versi: core-config.js FIEZEL_PAGE_BUILD, fiezel-diag-panel.js DIAG_BUILD,
   sw.js SW_REV — naik bersama, +1 dari m025-187 saat ini, per install-health-test.js
   dan pwa-release-coherence-test.js.
6. Naskah Thai adalah DRAFT AI sampai penutur asli me-review. Tandai status DRAFT di
   header setiap berkas th baru, seperti yang sudah dilakukan grammar-explanations-th.

GELOMBANG KERJA (satu PR per gelombang, tiap PR hijau penuh sebelum lanjut)
Urutan wajib: W5-0 lebih dulu. Menerjemahkan tombol tidak ada gunanya selama murid th
tidak bisa masuk ke sesi asesmen mana pun.

W5-0 · P0 PEMBLOKIR — murid th tidak bisa masuk tes penempatan (KERJAKAN DULUAN)
  Gejala: toast "Placement blueprint shortfall C1/vocab: 0/1"; tes 25 soal tidak pernah mulai.
  Akar: app.js:309 norm() membuang semua karakter di luar [a-z0-9 ], jadi SETIAP gloss Thai
  menjadi string kosong. validateQuestion (app.js:772) lalu menolak tiap soal vocab th dengan
  'duplicate/empty options', buildPlacement (app.js:6915) kehabisan kandidat dan melempar.
  Hanya 13 dari 1.765 gloss th yang selamat — semata karena memuat pecahan Latin di dalam
  kurungan; C1 dan C2 tidak punya satu pun, karena itu C1 titik henti keras pertama.
  Datanya TIDAK salah: vocabulary-th.json menutup 1.765/1.765 entri.
  Kerjakan:
   1. norm() sadar-Unicode (\p{L}\p{N} + flag u), huruf Thai dipertahankan; NORM_MEMO tetap benar.
   2. BUKTIKAN keluaran norm() untuk teks Indonesia byte-identik dengan sekarang — ia menyentuh
      dedupe sigQ, pemilihan pengecoh, dan contentIntegrityGate; pergeseran diam-diam di jalur
      id menggeser soal murid Indonesia. Ini syarat lulus.
   3. contentLanguageFrame (app.js:735) kenali kerangka Thai — sekarang teks th selalu
      'neutral', jadi gerbang belahan bahasa buta persis untuk locale yang paling butuh.
   4. features/search/fiezel-search.js:82 pakai pola yang sama; indeks pencarian th ikut kosong.
   5. Gerbang baru th-placement-test.js: buildPlacement() di locale th wajib merakit 25 soal
      penuh, blueprint terpenuhi di keenam band, merah bila ada shortfall.
   6. Sapu asumsi aksara Latin sejenis di jalur asesmen lain: speaking-listening normalizeText
      (:182), listening-quality.js:23, fiezel-prosody.js:183. Putuskan per berkas mana yang
      memang harus Latin (penilaian ucapan Inggris) dan mana yang menilai teks murid.

W5-A · Permukaan murid dengan NOL i18n — prioritas tertinggi, dampak terbesar
  1. grammar-labels-id.js (130) → ekstrak ke copy-id-grammar-labels.js +
     copy-th-grammar-labels.js. Pertahankan berkas lama sebagai pemanggil t() supaya
     seluruh call-site tidak berubah, ATAU ubah konsumennya — pilih satu, jangan dua
     jalur hidup bersamaan. Kunci mengikuti id template grammar (153), sehingga
     paritas bisa diuji terhadap grammar-templates.json seperti pola yang sudah ada.
  2. features/quota/quota-copy.js (51) + features/neural-voice/fiezel-cf-voice-notice.js
     (20). PERHATIKAN: keduanya menyimpan naskah kuota yang HAMPIR sama untuk dua jalur
     render. Satukan sumbernya lebih dulu, baru i18n-kan — menerjemahkan duplikat berarti
     dua naskah th yang akan menyimpang.
  3. features/prasasti/fiezel-prasasti-core.js (13) — nama + syarat prasasti.
  4. features/brain/: fiezel-step-tutor.js (16), fiezel-srl-coach.js (16),
     fiezel-olm.js (12), fiezel-tutor-brain.js (10). Ikuti pola yang SUDAH ada:
     naskah-th-brain.js + brainNaskahTh() — 6 modul brain lain sudah memakainya, dan
     th-coverage-test.js sudah menguji paritas kunci naskah vs tabel modul. Tambahkan
     4 domain ini ke tabel yang sama, jangan bikin mekanisme baru.
  5. features/speaking-listening/gems-core.js (3), features/search/fiezel-search.js (2).

W5-B · Sisa literal di modul yang sudah ber-i18n
  app.js (170 — dahulukan 49 yang jelas learner-facing: dialog konfirmasi keluar ujian,
  "Selesaikan ritme hari ini", umpan balik "Belum tepat, tidak apa-apa.", label hasil
  sesi, toggle getaran di Pengaturan, pesan offline), addon speaking-listening (22),
  tutor-dialog (14), coach-bubble (14), library-ui (7), tutor-v3 (9), onboarding/tour/
  mascot/splash (sisa 1–4). Termasuk aria-label dan placeholder — a11y ikut lokal.

W5-C · Dua bug yang lebih dalam dari terjemahan
  1. Prompt AI per-locale. fiezel-tutor-dialog.js:282–292 dan fiezel-coach-bubble.js:365
     mengunci persona "berbahasa Indonesia". Cabangkan per locale sehingga murid th
     mendapat jawaban Thai. Kurikulum tetap Inggris; yang berubah hanya bahasa penjelas.
  2. Intent matching. fiezel-tutor-dialog.js:44–54 mencocokkan kata Indonesia
     ('belum paham', 'ulang lagi', 'apa itu'). Pindahkan daftar frasa ke lapisan
     per-locale dan tambahkan padanan Thai; tanpa ini murid th kehilangan jalur pintas
     dialog tanpa pesan error apa pun.

W5-D · Gerbang supaya lubang ini tidak bisa terbuka lagi
  Tambah th-orphan-literal-test.js: muat seluruh copy-id-*, kumpulkan nilai kanon,
  pindai setiap skrip yang dirujuk index.html, MERAH bila ada literal berbahasa
  Indonesia yang tidak terdaftar sebagai nilai copy-map 'id'. Heuristik deteksi bahasa
  + allowlist eksplisit untuk log dev/pesan konsol; setiap entri allowlist wajib
  beralasan satu baris. Tanpa gerbang ini, W5-A sampai W5-C akan bocor lagi dalam
  beberapa rilis.

DEFINISI SELESAI PER PR
- th-coverage-test.js, id-golden-snapshot-test.js, audio-locale-guard-test.js,
  quota-notice-a11y-test.js, locale-enum-test.js, install-health-test.js,
  pwa-release-coherence-test.js: semuanya HIJAU.
- Seluruh daftar di .github/workflows/quality.yml dijalankan sampai hijau. Kegagalan
  lama yang tidak terkait (mis. hash-lock vendor/kokoro-js/kokoro.web.js) baru boleh
  diabaikan sesudah dibuktikan `git diff main -- <path>` kosong.
- Berkas copy-th baru terdaftar di fiezel-th-loader.js DAN locale-assets-th.json.
- Bukti smoke: murid 'id' NOL fetch aset th, window.FiezelThData tetap undefined.
- Laporan PR menyebut jumlah literal yang ditutup dan sisa yang belum, per berkas.
```

---

## 3. Cara mereproduksi angka di dokumen ini

`TH-COVERAGE-GAP-INVENTORY.json` dihasilkan dengan: memuat seluruh `copy-id-*.js`
dalam sandbox `vm` dengan `FiezelI18n.registerCopy` palsu (1.758 nilai kanon),
lalu memindai tiap skrip pada `<script src>` di `index.html`, mengambil literal string
≥6 karakter yang memuat penanda Indonesia, dan membuang yang nilainya sudah terdaftar
sebagai nilai copy-map `id`. Angka 594 adalah batas bawah: heuristik ini melewatkan
kalimat pendek dan kalimat tanpa kata penanda.
