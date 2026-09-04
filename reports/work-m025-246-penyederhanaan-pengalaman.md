# m025-246 — Penyederhanaan pengalaman

Brief owner (3 Sep 2026) dibagi tiga: **HAPUS/SEMBUNYIKAN**, **PERBAIKI**, **TAMBAH**, plus
daftar **Edge Case Wajib**. Dokumen ini mencatat apa yang dikerjakan per baris brief, apa
yang **tidak** dikerjakan dan alasannya, serta biaya yang diterima secara sadar.

---

## 1. Bendera, bukan penghapusan

Berkas baru `fiezel-ux-flags.js` (di-precache `sw.js`, dimuat sebelum `app.js`).

| Bendera | Nilai | Baris brief |
|---|---|---|
| `scenePhases` | `false` | 4 fase suasana day/dawn/dusk/night |
| `skillExams` | `false` | Ujian per skill |
| `skillsLabDestination` | `false` | Skills Lab sebagai tujuan terpisah |
| `personalJourneyTab` | `false` | Personal Journey + dashboard skill |
| `voicePackGate` | `false` | Gerbang paket suara 119 MB |
| `tutorRole` | `false` | Peran tutor (Fase 4, kondisional) |
| `todayHome` | `true` | Home "Hari ini" |
| `fourTabNav` | `true` | Navigasi maks 4 tab |
| `leanIntro` | `true` | Perkenalan ≤3 layar |
| `placementLite` | `true` | Placement-lite 8–12 soal |
| `sessionSummary` | `true` | Ringkasan akhir sesi |
| `funnelTelemetry` | `true` | Instrumentasi funnel |

**Kenapa bendera, bukan `git rm`.** Lima permukaan yang disembunyikan punya mesin yang sudah
terbukti benar dan dijaga puluhan gerbang (ujian per skill sendiri dijaga
`speaking-exam-test.js`, `listening-exam-test.js`, `reading-exam-test.js`). Menghapus kodenya
berarti membuang mesin yang benar demi keputusan tampilan yang bisa dibalik minggu depan,
sekaligus memerahkan gerbang yang tidak ada hubungannya dengan keluhan owner. Yang dimatikan
adalah **pintunya**; mesinnya tetap hidup dan tetap diuji.

`app.js` memegang salinan nilai bawaan (`UX_FALLBACK_FLAGS`) karena ~40 gerbang
menjalankannya di konteks `vm` yang tidak memuat berkas benderanya. Duplikasi itu **berpagar**:
`ux-flags-test.js` T3 membandingkan kedua daftar kunci demi kunci.

---

## 2. HAPUS/SEMBUNYIKAN — apa yang berubah

**Empat fase suasana → satu panggung.** `getScenePalette()` dan `getCelestialState()` mengunci
palet dan fase ke satu nilai yang sama persis dengan aturan `.scene-day` di `style.css`, jadi
kaskade CSS dan gaya inline tidak pernah menyebut dua warna berbeda. Halo di sekeliling
matahari ikut dibekukan — halo yang bergerak di atas langit yang diam terbaca sebagai kedip.
Interpolasi 9 perhentian tetap utuh dan tetap diuji; ia hanya tidak lagi dipanggil.

**Ujian per skill.** Blok "Latihan berformat ujian" di layar Reading dan dua kartu ujian di
sesi bicara & dengar disembunyikan. Bank soal (`reading-exam-v1.json`,
`speaking-exam-v1.json`, `listening-exam-v1.json`) dan mesin penilaiannya tidak disentuh.

**Skills Lab sebagai tujuan terpisah.** Tab-nya hilang; kartunya hidup di dalam tab Latihan
dengan nama baru. Porsi hariannya dilebur: `todayPlanBlocks()` menaruh blok dengar/bicara di
kartu Hari ini, jadi murid yang hanya mengikuti sesi harian tetap mendapatkannya tanpa pergi
ke mana pun. Rute `skills` tetap sah — tur listening dan riwayat back-nav memakainya.

**Personal Journey + dashboard skill.** Tab "Kesiapan & skill" dilipat ke Ringkasan; kartu
"Rencana kamu" keluar dari layar Progres. Rencananya sendiri tetap dihitung
`buildPersonalJourney()` dan sekarang terbaca sebagai isi sesi di kartu Hari ini — tempat
murid benar-benar akan mengerjakannya. Tiga tab yang tersisa **tidak** dilipat jadi satu
gulungan: m025-85 sudah pernah punya layar itu (17 kartu tanpa struktur) dan tab inilah
perbaikannya.

**Gerbang paket suara.** Yang mati adalah **gerbangnya** — layar yang menahan murid sampai ia
mengunduh. Itu saja.

Gelombang ini sempat melangkah lebih jauh: unduhan latar 152 MB (m025-236, menyala di boot
pertama untuk semua murid tanpa bertanya) diubah jadi opt-in dengan sakelar di Pengaturan.
**OWNER membatalkannya pada hari yang sama**: "unduhan suaranya biarkan diunduh secara
diam-diam di background, jangan kamu sentuh." Perubahan itu direvert seluruhnya —
`armOfflineVoiceAutoload()` kembali berjalan tanpa melihat bendera atau preferensi apa pun,
dan `voicePackOptIn`/`voicePackAsked` dihapus dari `defaultPreferences` dan sanitizer.

Bendera `voicePackGate` tetap didaftarkan (bukan dihapus) sebagai tempat tertulis keputusan
itu, dan `ux-flags-test.js` T6b menjaga agar unduhannya tidak berpagar lagi.

---

## 3. PERBAIKI

**Alur masuk.** Splash hanya di peluncuran dingin (`isColdLaunch()`, penanda `sessionStorage`
— hidup selama sesi peramban, hilang saat aplikasi benar-benar ditutup). Perkenalan dipotong
dari enam langkah ke tiga: nama+peran → tujuan+level → penempatan. Karosel (dua slide iklan
fitur, nol masukan murid), jadwal (pengingat sudah punya undangannya sendiri di ujung alur),
dan ringkasan (mengulang apa yang baru diketik) dipotong — markup dan penanganannya tetap
utuh dan kembali seluruhnya kalau `leanIntro` dimatikan.

Pemilih bahasa **tidak** dihitung sebagai salah satu dari tiga layar: ia sudah dideklarasikan
sebagai gerbang pra-langkah sejak dibuat, hanya muncul untuk perangkat yang bahasanya belum
ditentukan, dan satu ketukan. Menghapusnya membuat murid Thai membaca perkenalan dalam bahasa
Indonesia.

**Navigasi.** Empat tab: Hari ini · Latihan · Progres · Pengaturan. Vocab/Grammar/Reading
pindah ke dalam view `latihan`; `VALID_VIEWS` **tidak** dikurangi, jadi tautan lama, tombol
dalam layar, dan riwayat back-nav tidak ada yang patah. Tombol gigi di topbar tetap ada dan
itu bukan pintu kembar yang terlewat: selama pelajaran, tab bar disembunyikan seluruhnya
(`body.daily-locked .bottomnav`), jadi gigi topbar satu-satunya pintu ke Pengaturan di dalam
sesi — dan tiga tur menunjuk tepat ke sana.

**Copy.** `Core Brain` → "Layanan FIEZEL"/"FIEZEL" (12 kunci id + 12 kunci th).
`Skills Lab` → "Latihan bicara & dengar" (judul layar, kicker addon, pesan gagal muat).
Nama internal di **komentar** dibiarkan — komentar tidak pernah sampai ke layar murid, dan
melarangnya akan memaksa penghapusan catatan sejarah.

**Skor speaking.** Baris lama berbunyi "Skor 62% hanya mengukur target concept coverage; bukan
pronunciation." Kalimat itu benar dan tetap tidak menolong: yang pertama dibaca murid tetap
sebuah persen, dan persen di layar bicara akan dibaca sebagai nilai pengucapan berapa kali pun
kalimat di sebelahnya menyangkalnya. Sekarang: label "Cakupan kata" + hitungan yang
benar-benar diukur mesinnya ("3 dari 5 kata terdengar") + satu kalimat penjelasan.
`result.score` tetap disimpan dan tetap memberi makan bukti adaptif.

**Listening gagal audio.** **Dua** jalan keluar di **kedua** mesin soal dengar (kuis harian dan
sesi bicara & dengar — satu perbaikan di salah satunya meninggalkan separuh murid dengan layar
buntu yang lama): coba lagi, dan lewati. "Tanpa penalti" dibuat benar di aritmetikanya, bukan
hanya di kalimatnya: soal yang dilewati dikeluarkan dari **penyebut** akurasi
(`cfg.__noAudioSkips`).

Opsi ketiga — "suara peramban" — sempat dipasang atas baris brief 3 Sep, lalu **dicabut atas
perintah OWNER 4 Sep**: "aku ga mau lagi ada tts browser, tts browser harus mati total."
Seluruh jalurnya dihapus dari `app.js` dan dari addon, naskahnya dicabut dari copy-map, dan
`audio-locale-guard-test.js` dikembalikan ke larangan total m025-232 (setiap sebutan
`speechSynthesis` di zona audio maupun `app.js` memerahkan gerbang).

**Prompt "Versi baru".** Ditunda selama `FiezelStage.lessonMode()` aktif, dilepas
`FiezelUpdatePrompt.flush()` di layar hasil. Ditunda, bukan dibuang: permintaannya diparkir,
dan kalau `flush()` tidak pernah dipanggil, pengecekan berkala berikutnya tetap memanggil
`show()` — kegagalan terburuknya kartu yang datang terlambat, bukan kartu yang hilang.

**Tipografi.** Tiga keluarga → dua. `@font-face 'FZ Fredoka'` dicabut, preload dicabut dari
`index.html`, `Fredoka-var.woff2` dicabut dari precache `sw.js`, dan **berkasnya sendiri
dihapus** dari `assets/fonts/`. Penghapusan berkas itu bukan kerapian: `splash-choreography-test.js`
menjaga kontrak "tidak boleh ada font yatim" — berkas yang tergeletak di `assets/fonts` tanpa
satu pun aturan CSS merujuknya adalah persis alasan Fredoka dulu dilepas di m028 fase 1, karena
ia ikut ter-precache dan dibayar setiap murid tanpa pernah tergambar. Mencabut rujukannya tapi
meninggalkan berkasnya akan menciptakan ulang bug yang sama.

Cabang `else` gerbang itu — yang selama ini tidak pernah dijalankan siapa pun — berbunyi
`!/Fredoka/.test(css)`, artinya ia ikut memerahkan **komentar** yang menerangkan pencabutannya.
Larangannya dipersempit ke KODE (komentar CSS dilucuti dulu), ditambah satu asersi baru yang
menjaga bahaya yang sebenarnya: tidak boleh ada `url()` menunjuk berkas yang sudah tidak ada.
Pola yang sama dipakai `audio-locale-guard-test.js` — yang dilarang pemakaiannya, bukan
penyebutan namanya di catatan sejarah.

Token `--fz-display-round` **dipertahankan** (menunjuk Jakarta 700) alih-alih dicari-ganti di
~40 titik pakai: satu nilai yang berubah lebih mudah diaudit daripada empat puluh selektor.
`Noto Sans Thai Looped` tetap di-self-host dan sengaja tidak dihitung sebagai wajah ketiga — ia
dukungan **aksara**, bukan keluarga dalam sistem tipografi.

**Tema Malam.** Ini pembalikan m025-134 ("hapus mode gelap"). Yang rusak pada percobaan
pertama bisa disebut persis: puluhan permukaan memaku warnanya sendiri (`#fff`, `#f6f4ed`)
sementara teks memakai `var(--text)`, jadi gelap berarti 1,08:1. Sejak m025-85 permukaan itu
sudah pindah ke token, jadi penyebabnya sudah tidak ada. Palet malam **seluruhnya** turun dari
keluarga `--core*` yang sudah hidup dan sudah diuji sebagai panggung gelap splash dan toast;
yang ditambahkan hanya tinta terang untuk peran semantik yang versi terangnya pekat (`--info`
`#7A5F1B` di atas `#1B1418` hanya 2,4:1).

Tiga keadaan: `data-theme="light"` / `data-theme="dark"` / atribut tidak ada (perangkat yang
memutuskan). `<html>` **tidak lagi** memaku `data-theme="light"` — nilai statis itu menang atas
`@media` selamanya, jadi Tema Malam tidak akan pernah menyala untuk siapa pun.
`updateCelestialClock()` memasang `--sky-*` sebagai gaya **inline** yang menang atas aturan
tema mana pun, jadi ia dibuat sadar-tema dan dipasangi pengait `matchMedia` untuk perangkat
yang berganti skema saat aplikasi terbuka.

---

## 4. TAMBAH

**Home "Hari ini".** Menggantikan sebelas blok (pita meta, empat keping statistik, baris trust,
sapaan, strip Coach dengan dua tombol, learner-flow, hub empat skill, blok sosial, judul seksi,
grid enam kartu) yang di antaranya sedikitnya lima membawa ajakan aksinya sendiri. Empat aturan
yang bisa diperiksa gerbang: satu tombol primer, isi sesi terlihat sebelum ditekan, runtun
sekunder (runtun nol tidak ditampilkan sama sekali), blok dengar/bicara ikut di dalam isi sesi.
Layar lama hidup di cabang `else` dan kembali utuh saat `todayHome` dimatikan.

**Ringkasan akhir sesi.** Dua blok yang menghadap ke depan: apa yang **bergerak** karena sesi
ini (selisih mastery ≥3 poin, maks 3 baris) dan apa yang **menunggu besok** (`nextReview` dalam
24 jam). Tidak ada metrik yang dikarang di layar ini — keduanya dibaca dari angka yang sudah
dicatat `updateMastery()` dan penjadwal ingatan.

**Placement-lite: 12 soal.** Angkanya bukan selera. Tangga band menuntut
`PLACEMENT_BAND_MIN_EVIDENCE = 2` bukti di dalam satu band sebelum band itu boleh dinaiki; enam
band × 2 = 12 — batas atas rentang yang diminta owner, dan satu-satunya angka di dalam rentang
itu yang membuat keenam band tetap bisa dicapai. Sepuluh soal akan menutup dua band secara
permanen untuk alasan aritmetika, bukan alasan kemampuan.

Tanpa listening, dan itu keputusan: soal dengar butuh jaringan dan mesin suara, dan
menaruhnya di jalur "soal pertama <60 detik" berarti mempertaruhkan janji itu pada bagian
aplikasi yang paling mungkin lambat.

**Ongkos yang diterima:** dua bukti per band berarti ambang 0,625 menuntut 2/2 benar untuk
naik, jadi satu keteledoran di band bawah menurunkan hasilnya satu tingkat. Tes ini memang
kurang presisi daripada yang 25 soal — itu arti kata "lite". Yang ditukar dengan presisi itu
adalah murid yang benar-benar **sampai** ke soal pertamanya; hasilnya bukan vonis (mesin
adaptif terus mengoreksi level dari sesi berikutnya, dan tes 25 soal tetap satu ketukan dari
layar penempatan). Yang digantikannya adalah keadaan lama: murid yang menyerah di soal ke-9
dari 25 dan memulai semuanya di A1.

Naskah layar penempatan dibuat mengikuti jumlah soal yang benar-benar disajikan — menjanjikan
25 lalu menyajikan 12 adalah kebohongan kecil di layar paling mahal.

**Instrumentasi funnel.** Dua event baru, didaftarkan di **kedua** sisi — klien
(`CLIENT_EVENT_SPEC`) dan Worker (`workers/api/analytics/analytics-core.js`, `origin:'client'`
dengan enum byte-identik). Tanpa entri sisi Worker, keduanya ditolak 400 dan instrumentasinya
tidak akan pernah menghasilkan satu baris pun — kegagalan yang hanya terlihat sebagai
"angkanya nol". Yang ditambahkan: `first_question`
(`elapsed_bucket` dengan tepi tepat di **60 detik**, plus `cold`) dan `question_skipped`
(`reason` enum tertutup — kolom teks bebas adalah tempat PII bocor). Dua yang lain sudah ada:
`session_ended` dan `retention_ping` (D1/D7). Opt-in **tidak** diulang sebagai gerbang ketiga:
`anGateOpen()` dan modul analytics sudah memegang dua gerbangnya, dan gerbang ketiga adalah
tempat kebijakan privasi mulai menyimpang dari dirinya sendiri. Addon melapor lewat kait
`onSkip`; ia tidak menembak analytics sendiri.

**Peran tutor.** Bendera `tutorRole:false` didaftarkan sebagai sakelar Fase 4. Tidak ada
perubahan perilaku di gelombang ini — brief menandainya "kondisional", dan lapisan login
guru/murid yang baru mendarat (#336, #338) tidak disentuh.

---

## 5. Edge Case Wajib

| Edge case | Yang dikerjakan |
|---|---|
| iOS Safari, storage hilang setelah 7 hari | Peringatan "Progres belum dicadangkan" di Pengaturan → Data, hanya di WebKit **dan** hanya kalau belum ada akun. Deteksi konservatif (iPhone/iPad/iPod + iPadOS yang menyamar sebagai Macintosh dengan `maxTouchPoints>1`). |
| Akun didorong setelah unduh model | `armAccountNudgeAfterModel()` — sekali, saat unduhan 152 MB selesai. Jamnya berhenti sendiri setelah satu jam; jam yang berdetak selamanya adalah baterai yang habis tanpa imbalan. |
| Offline saat gerbang akun | `OFFLINE_AUTH_ESCAPE_MS = 3000`, memanggil `skipPuterSignIn()` yang sudah ada — kunci dilepas **dan** kuis yang tertunda ikut jalan, satu perilaku bukan dua. |
| Autoplay | Tidak ada jalur yang memutar audio tanpa klik. Jatuh-balik suara peramban hanya berjalan dari tombolnya. |
| Android low-end (Kokoro WASM) | Mesin utama (supertonic/sherpa) sudah berjalan di Worker. Cabang Kokoro lama — yang menjalankan WASM di jalur yang bisa membuat proses konten dihentikan OS — kini **menolak** di perangkat `deviceMemory ≤ 2` atau `hardwareConcurrency ≤ 2`. Menolak bukan berarti kehilangan suara: L1 (aset R2) dan L2 (Puter) ada di atas lapisan itu. Kalau seluruh tangga gagal, jawabannya DIAM + teks (L5) — **bukan** suara peramban. |
| Kurangi-gerak: fallback statis maskot | `STATIC_FACE_FOR_STATE` memetakan **19** state ke 14 ekspresi statis; `setState()` memanggil `applyFace()` di bawah gerbang `_reducedMotion()`. Diverifikasi `mascot-reduced-motion-test.js`. |
| Kompatibilitas state lama | `VALID_VIEWS` tidak dikurangi; `sanitizeState` menerima preferensi baru dengan pola fail-closed yang sama dengan `brainSync`; `progressTabSafe()` menjaga tab tersimpan yang sudah tidak ada agar tidak mengecat layar kosong. |

**Suara peramban: MATI TOTAL.** L4 dicabut di m025-232 karena `speechSynthesis` punya antrean
**global** milik peramban yang tidak ikut berhenti saat pemutar kita berhenti — sumber "dua
suara sekaligus". Brief 3 Sep sempat memintanya kembali sebagai jalan keluar; **OWNER
membatalkannya 4 Sep**: "tts browser harus mati total." Tidak ada suara peramban di mana pun —
bukan lapisan, bukan tombol, bukan jalan keluar darurat. Ditegakkan
`audio-locale-guard-test.js`.

---

## 6. Gerbang

Empat gerbang baru, terdaftar di `.github/workflows/quality.yml`:

- `ux-flags-test.js` — nilai bawaan tiap bendera (dengan kalimat owner sebagai alasan), tidak
  ada bendera liar, salinan `app.js` tidak menyimpang, nama tak dikenal gagal ke `false`,
  berkasnya benar-benar dimuat sebelum `app.js` dan ikut precache, dan tiap bendera
  benar-benar **dibaca** kode yang dikirim.
- `ux-redesign-test.js` — dua belas blok (A–L) yang menahan satu janji brief masing-masing.
- `night-theme-test.js` — dua pintu aktivasi identik token demi token, `:not([data-theme="light"])`
  terpasang, palet turun dari `--core*`, `<html>` tidak memaku tema, kontras AA, tiga keadaan
  di pengelola tema.
- `mascot-reduced-motion-test.js` — setiap state punya bingkai statis, setiap bingkai menunjuk
  ekspresi yang ada, jalurnya benar-benar dipanggil `setState()` sebelum `_choreo`, dan
  gerbangnya membaca kedua sumber kurangi-gerak.

Gerbang yang **diperbarui** karena kontraknya memang berubah:
`ui-structure-test.js` (lima tab → empat, dan angkanya kini plafon yang diminta owner),
`a11y-test.js` (pola lama `class="nav"` melewatkan tab aktif — pola baru menangkap keduanya),
`classroom-test.js` (hitungan tab), `onboarding-test.js` (stub bendera + lima asersi alur
ringkas; ~35 asersi lama tetap menguji alur lengkap dengan bendera dimatikan),
`analytics-client-test.js` dan `analytics-server-only-test.js` (delapan event klien jadi
sepuluh, delapan belas event terdaftar jadi dua puluh — angkanya sengaja tetap dipaku tangan
supaya setiap event telemetri baru melewati review manusia).

`splash-choreography-test.js` — cabang `else` Fredoka dipersempit ke kode (lihat §3
Tipografi); asersi wajah-bulat/serif/precache lainnya tidak disentuh.

Baseline emas `id-golden-baseline.json` diregenerasi — perubahan naskah di gelombang ini
disengaja (nama internal, jumlah soal penempatan, kalimat baru di `copy-id-redesign.js`).

Dua jebakan di regenerasi itu, keduanya sempat memerahkan CI dan layak dicatat supaya
gelombang berikutnya tidak mengulanginya:

1. **Urutan gerbang.** `grammar-quality-audit.js` menulis ulang stempel tanggal di
   `grammar-templates.json`, dan baseline mengunci **hash** berkas itu. Regenerasi setelah
   gerbang itu berjalan akan mengunci hash yang termutasi — hijau di mesin lokal yang
   menjalankan tes berurutan abjad, merah di CI yang menjalankan id-golden (baris 244)
   **sebelum** mutatornya (baris 340). Regenerasi harus dari pohon kerja yang bersih.
2. **Pohon yang tertinggal.** Regenerasi dari checkout `main` yang sudah basi akan
   mengembalikan naskah agen lain yang sudah merge (di sini: aturan handle/kata sandi di
   `auth-form`). Baseline diregenerasi ulang dari pohon kerja cabang ini setelah
   `git fetch origin main`, jadi 2410 literalnya adalah gabungan naskah main terbaru +
   naskah gelombang ini, bukan salah satunya saja.

---

## 6b. Ronde kedua: menjalankan SELURUH suite dalam urutan CI

Gelombang ini sempat dinyatakan hijau atas dasar gerbang-gerbang yang RELEVAN saja.
Menjalankan keseluruhannya (256 gerbang) dalam urutan `quality.yml` menemukan sebelas merah.
Tiga di antaranya artefak harness (suite berjalan saat pohon kerja masih memuat penanda
konflik merge; hijau begitu diulang). Delapan sisanya nyata, dan pembagiannya penting:

**Milik gelombang ini (empat):**

1. **`voice-fallback-chain-test.js`** — naskah gagal-audio yang saya tulis ulang menghapus dua
   janji yang dijaga gerbang: "tidak dinilai" dan "tidak dikunci". Kalimatnya benar secara
   aritmetika (soal yang dilewati memang keluar dari penyebut) tetapi murid tidak membaca
   aritmetika; ia membaca kalimat. Dikembalikan: *"Soal yang dilewati karena audio gagal tidak
   dinilai, dan sesimu tidak dikunci."*
2. **`ui-render-audit-test.js` T3** — judul halaman 1,12:1 di Tema Malam pada `vocab` dan
   `reading`. Sebabnya bukan token: `--ambient-text`, `--sky-*`, dan palet malam semuanya
   BENAR. Kelas fase langit (`.scene-day` dst) dipasang di `<body>` dan MENDEFINISIKAN ULANG
   `--sky-*` di elemen itu, jadi ia menang atas nilai malam di `:root` maupun nilai inline
   sadar-tema dari `updateCelestialClock()` di `<html>`. Body tergambar `#FFF9EE` di bawah
   judul `#FDFAF3`. Diperbaiki dengan `--sky-*:inherit` di bawah kedua pintu tema gelap —
   bukan nilai gelap yang dipaku, supaya animasi fase tetap hidup kalau `scenePhases`
   dinyalakan lagi.
3. **`reset-side-state-test.js`** — `ACCOUNT_NUDGE_KEY` lolos reset tanpa keputusan. Dimasukkan
   ke daftar hapus, bukan dikecualikan: sesudah reset murid memang tidak punya akun lagi, jadi
   dorongan mencadangkan progres justru kembali berguna.
4. **`r2-ux-overhaul-smoke-test.js` + `experience-integration-test.js`** — dua asersi memaku
   BENTUK tata letak lama (kelas `coach-strip-go`, keberadaan kartu Classroom di Home,
   keberdampingan `nextSessionPanelMarkup()}${journeyMarkup()`, dan lima nama pertama
   `VALID_VIEWS` berikut urutannya). Semuanya dibalik ke janjinya: Home punya TEPAT satu tombol
   primer (lebih ketat dari pola lama — dua tombol kini merah), Classroom tidak bisa diketuk
   dari Home, `journeyMarkup()` ada di template Ringkasan, dan kelima rute wajib ada di
   `VALID_VIEWS` di mana pun letaknya.

5. **`braincore-learner-identity-test.js`** — akibat langsung dari perbaikan (3) di atas.
   Gerbang itu memaku dua penanda lane per-murid sebagai DUA ANGGOTA TERAKHIR daftar reset
   (`...ATTEMPT_KEY,LEARNER_NAME_SYNC_KEY]`), jadi menambahkan `ACCOUNT_NUDGE_KEY` sesudahnya
   memerahkannya tanpa satu janji pun yang dilanggar. Dibalik ke keanggotaan: kedua kunci wajib
   ada di dalam daftar `for(const k of [...])` milik `resetProgress()`, di posisi mana pun —
   dan daftarnya diurai dari fungsi itu, bukan dicocokkan sebagai teks bebas di app.js, supaya
   gerbangnya tidak bisa lulus karena nama yang kebetulan muncul di tempat lain.

**Milik `main`, bukan gelombang ini (empat).** Semuanya diverifikasi di worktree bersih
`origin/main` (e3afd0d8) lebih dulu, bukan disimpulkan:

| Gerbang | Sebab di `main` | Yang diporting ke sini |
|---|---|---|
| `id-golden-snapshot-test.js` | 95 literal Ruang Guru tanpa regenerasi baseline | baseline diregenerasi (memuat naskah kedua belah pihak) |
| `social-frontend-test.js` | `contains(` bukan `contains?.(` di `renderInner()` | `main` memperbaikinya sendiri (e3afd0d8) beberapa menit setelah cabang ini |
| `gate-registry-test.js` | `auth-account-test.js` ada di repo tapi tidak pernah didaftarkan | didaftarkan di `quality.yml` (gerbangnya hijau; yang hilang cuma barisnya) |
| `app-interaction-policy-test.js` | `.auth-field-label input:focus` — `:focus` telanjang | jadi `:focus-visible` (nol perubahan perilaku untuk kolom teks) |
| `secret-scan-test.js` | fixture `password: 'wrongpass123'` di `auth-account-test.js` | entri allowlist beralasan, nilainya TIDAK diobfuskasi |

Kenapa empat kegagalan `main` baru terlihat sekarang: CI `main` berhenti di
`id-golden-snapshot-test.js` (baris 244 `quality.yml`) dan tidak pernah sampai ke gerbang
sesudahnya. Begitu baseline diperbaiki di cabang ini, sisanya ikut terlihat satu per satu.
Semuanya diporting karena tanpa itu PR ini tidak bisa hijau; tiap perbaikan akan no-op begitu
`main` memperbaiki miliknya sendiri.

---

## 7. Yang TIDAK dikerjakan

- **Peran tutor Fase 4** — brief menandainya kondisional; hanya benderanya yang didaftarkan.
- **Padanan `th` untuk naskah baru** — `FiezelI18n.t()` jatuh ke `id` untuk kunci yang belum
  ada di `th` dan lubangnya tercatat di `coverageReport()`. Itu jalur yang memang disediakan
  untuk naskah baru; terjemahan Thai butuh review penutur asli dan bukan pekerjaan gelombang ini.
- **Melipat tiga tab Progres jadi satu gulungan** — lihat §2; itu mengulang keluhan m025-85
  yang sudah pernah diselesaikan.
