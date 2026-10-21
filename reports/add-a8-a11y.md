# A8 · Naskah murid + aksesibilitas pemberitahuan (kuota, suara, jembatan)

Cabang `add/a8a11y`. Tanpa bump versi build, tanpa push.
Gerbang baru: `tests/quota-notice-a11y-test.js` (node murni, memindai sumber), terdaftar di
`.github/workflows/quality.yml`.

---

## 0 · Dua hal yang harus dikatakan lebih dulu, karena briefnya menganggapnya ada

**`reports/cf-b8-ux-quota.md` TIDAK ADA di repo ini.** Bukan "belum saya baca" — dicari di
seluruh cabang (`git ls-tree -r` untuk `main`, `add/a1pre`…`add/a10audit`, `roll/s1cfg`…
`roll/s10rate`) dan tidak ditemukan. Yang ada dan relevan: `reports/exec-e3-quota.md`
(kontrak jatah) dan `reports/exec-e5-ai-tts.md` (rute AI/TTS). Jadi "naskah UX kuota, 9
permukaan" tidak pernah saya baca, karena tidak ada yang bisa dibaca. Saya tidak mengarang
isinya.

**`features/neural-voice/fiezel-cf-voice-notice.js` juga tidak ada di cabang ini.** Ia hidup
di `roll/s6tts` saja. Saya membacanya lewat `git show roll/s6tts:...` sebagai referensi nada
dan struktur (ia memang punya pasangan varian bersuara/tanpa suara), tetapi tidak
memindahkannya ke cabang ini — itu merge orang lain, bukan pekerjaan A8.

Konsekuensinya: sumber kanon yang saya pakai adalah yang benar-benar ada di cabang ini —
peta `COPY_KEY` di `workers/api/quota/route-quota.js:36-50`, `GEMS_COPY` (kanon "nggak",
kanon anti-jualan, dijaga `tests/gems-test.js`), dan satu-satunya naskah kegagalan yang sudah
dipakai murid: `noteNoAudio()` di
`features/speaking-listening/fiezel-speaking-listening-addon.js:689-695` ("Suaranya sedang
bermasalah, bukan kamu." + item tidak dinilai + satu jalan terus). Kalau cf-b8 kelak
mendarat dengan kalimat berbeda, yang perlu berubah hanya peta di
`features/quota/quota-copy.js` — bukan sembilan tempat.

---

## 1 · TEMUAN PALING SERIUS: naskah yang bohong (§4 brief)

Ini pelanggaran terberat di daftar dan ia memang ada di cabang ini, bukan hipotesis.

`workers/api/quota/quota-config.js` dan modul jatah bisa mengembalikan
`reason: 'quota_unavailable'` — artinya **penghitung jatahnya sendiri gagal dibaca** (basis
datanya tidak menjawab). Sebelum commit ini, dua rute memperlakukannya persis sama dengan
"jatah habis":

- `workers/api/tts/route-tts.js` — penolakan jatah selalu dikirim sebagai
  `error: 'quota_exceeded'` dengan `POLITE.quota_exceeded` = "Jatah suara hari ini sudah
  habis."
- `workers/api/ai/route-ai.js` — sama: `error: 'quota_exceeded'`, "Jatah tanya-jawab hari ini
  sudah habis."

Jadi murid yang **belum memakai satu pun** jatahnya diberi tahu bahwa jatahnya sudah habis,
karena ada gangguan di sisi mesin. Dua hal yang membuatnya lebih buruk dari sekadar kalimat
kurang tepat:

1. Naskahnya menyuruh **menunggu sampai besok**, padahal keadaan ini biasanya pulih dalam
   hitungan detik (`retryAfter` yang dikirim 60 detik — jadi naskah dan angkanya sendiri
   sudah saling bertentangan di respons yang sama).
2. Murid tidak punya cara memeriksanya. Ia akan berhenti mencoba, dan ia akan menyimpulkan
   bahwa dirinya yang salah hitung.

**Perbaikannya.** Kedua rute sekarang memisahkan keadaannya:

| Keadaan sebenarnya | `error` | `copyKey` | Kalimat |
|---|---|---|---|
| jatah benar-benar habis | `quota_exceeded` | `quota.tts.exhausted` / `quota.ai.exhausted` | "Jatah suara hari ini sudah habis. Suara perangkatmu tetap bisa dipakai, dan jatahnya kembali sesudah tengah malam." |
| penghitung jatah gagal dibaca | `quota_unavailable` | `quota.unavailable` | "Aku belum bisa membaca sisa jatahmu, jadi jatahmu kemungkinan besar masih utuh. … coba lagi sebentar lagi, ya." |

Dijaga oleh pemeriksaan **(f2)** di gerbang baru: kalau seseorang menyatukan kembali dua
cabang itu, atau memakai kalimat "sudah habis" untuk `quota_unavailable`, gerbangnya merah.
Kejujuran ini juga ditegakkan di klien: `resolveKey()` di `features/quota/quota-copy.js`
mendahulukan fakta yang lebih kuat daripada `copyKey` kiriman server —
**lepas internet → penghitung rusak → sesi kedaluwarsa → `copyKey` server → cadangan** —
supaya "jaringan mati" tidak pernah muncul sebagai "jatah habis".

---

## 2 · Audit naskah: teks sekarang → masalah → perbaikan yang DITERAPKAN

Semua baris di bawah sudah diterapkan, bukan diusulkan. Kolom "sekarang" = sebelum commit
ini.

### 2.1 `app.js` — modal kredit AI (`maybePresentPuterCreditNotice()`)

| Teks sekarang | Masalah | Perbaikan yang diterapkan |
|---|---|---|
| "**Kredit AI Puter kamu habis**" | Nama mesin (`Puter`) — istilah terlarang. Murid tidak punya akun itu, tidak bisa berbuat apa pun dengan informasi itu, dan "kredit" memindahkan kerangka dari belajar ke tagihan. | "Jatah tanya-jawab hari ini sudah habis" (dari `quota.ai.exhausted`). |
| "aplikasi tetap bisa kamu pakai penuh **tanpa upgrade apa pun** … Kalau mau lanjut pakai fitur AI, **opsi upgrade ada di akun Puter kamu**" | Menjual. Menyebut jalan berbayar yang tidak ada dalam produk ini. | "Penjelasan dari materi tetap muncul, dan jatahnya kembali sesudah tengah malam." Tidak ada satu pun kata upgrade/langganan/harga. |
| `<a href="https://puter.com/settings/usage">Pelajari opsi upgrade</a>` | **Permukaan bayar.** `paymentEnabled=false` (`workers/api/quota/quota-config.js:90`) ditegakkan sebagai KETIADAAN elemen, bukan tombol nonaktif. | Tautannya **dihapus**. Panel jatah baru (`planPanelMarkup()`) memancarkan nol `<a>` dan nol `<button>`, dan **melempar** kalau `paymentEnabled===true` — menyalakan pembayaran harus lewat keputusan owner + naskah baru, bukan satu bendera yang berubah nilai. |
| "Yang terdampak cuma tutor AI dan suara **neural**" | Istilah teknis produk yang tidak berarti apa-apa bagi murid. | Dihapus; yang disebut adalah apa yang tetap bisa dipakai. |
| Modal ini juga tidak menyebut apa pun soal penilaian | Murid menebak apakah item yang sedang dikerjakan jadi salah. | Setiap pemberitahuan sekarang membawa satu baris tetap: "Item ini nggak dinilai dan nggak dikunci." |

### 2.2 `workers/api/tts/route-tts.js` — peta `POLITE`

| Teks sekarang | Masalah | Perbaikan |
|---|---|---|
| "Permintaan **tidak** dikenali." | "tidak" (kanon: "nggak"); juga terdengar seperti menyalahkan kiriman murid. | "Aku belum paham kirimanmu. Muat ulang halaman lalu coba lagi, ya." |
| "Teksnya **terlalu panjang**." | Tanpa jalan terus. | "Kalimatnya kepanjangan untuk sekali dibacakan." + varian tanpa suara yang menunjuk teks yang tetap bisa dibaca dan menyarankan memotongnya jadi dua. |
| "Jatah suara hari ini sudah habis. Suara perangkat tetap bisa dipakai." | Berjanji ada suara perangkat **padahal belum tentu ada**. Di perangkat tanpa suara Indonesia, murid diberi tahu ada suara, lalu tidak ada suara. | Dua varian: `spoken:true` (memang masih ada suara perangkat) dan `spoken:false` ("Perangkat ini belum punya suara cadangan … teksnya tetap bisa kamu baca"). |
| "layanan suara sedang istirahat" | Netral tetapi tanpa pembebasan; murid mengira ia salah tekan. | + "Ini bukan kesalahanmu." (mengikuti `noteNoAudio()`). |
| "Permintaan terlalu besar." | Bahasa mesin. | "Kirimanmu kebesaran untuk sekali kirim." |
| *(tidak ada)* | Keadaan penghitung rusak tidak punya kalimat sendiri. | `quota_unavailable` ditambahkan — lihat §1. |

### 2.3 `workers/api/ai/route-ai.js` — peta `POLITE`

Pola masalahnya sama: "tidak" bukan "nggak", nada laporan galat, dan tanpa jalan terus.
Semua nilai ditulis ulang ke kamu-POV dengan satu langkah lanjut yang nyata, ditambah
`quota_unavailable`. `tests/ai-task-contract-test.js:309-314` (panjang > 15 karakter, tanpa
`429|5xx|@cf/|token|account`, kunci `quota_exceeded`/`breaker_open`/`degraded` ada) tetap
hijau — tidak ada gerbang yang memaku kalimat persisnya, jadi naskahnya boleh membaik.

### 2.4 `app.js` — `aiErrorMessage()` dan `renderAIError()`

| Teks sekarang | Masalah | Perbaikan |
|---|---|---|
| Pesan galat mentah dari provider dicetak ke layar (di-escape) | Murid membaca istilah mesin yang tidak pernah dimaksudkan untuknya, dan kadang berisi nama layanan/kode status. | Galat mentah sekarang **hanya** masuk `console.debug`. Layar mendapat kalimat yang ditulis untuk murid. `tests/ai-integration-test.js` diperkuat: markup dari provider tidak boleh muncul mentah **maupun** ter-escape. |
| "Permintaan AI melewati **batas waktu**." | Bahasa mesin. | "Jawabannya nggak datang dalam waktu yang wajar." (`Error` internalnya boleh tetap teknis — ia tidak pernah dibaca murid.) |
| "Pastikan **Anda** sudah login" | "Anda" + "login". | "Pastikan kamu sudah masuk ke akunmu dan internetnya nyala." |
| Blok galat tanpa wilayah live | Pembaca layar tidak mengumumkan apa pun. | Dibungkus `role="status" aria-live="polite" aria-atomic="true"`. |

### 2.5 Rumah naskah yang baru

`features/quota/quota-copy.js` (baru, `FiezelQuotaCopy`, skema `fiezel-quota-copy-v1`).
`workers/api/quota/route-quota.js:19-21` **sudah** menyatakan bahwa naskah harus tinggal di
berkas ini ("Server mengirim FAKTA + `copyKey`, bukan kalimat", rekomendasi F7 cf-a12) —
berkasnya cuma belum pernah dibuat. Sekarang ada: 15 kunci, masing-masing
`{title, spoken, silent, urgency, surface}`, `build()` murni tanpa DOM/jam sistem sehingga
gerbang bisa memeriksa seluruh naskah tanpa peramban.

---

## 3 · Audit aksesibilitas

| Aturan | Keadaan sebelumnya | Yang diterapkan | Dijaga |
|---|---|---|---|
| Peran ARIA benar | Modal kredit tidak punya wilayah live sama sekali | `role="status"` untuk semua pemberitahuan informasi; `role="alert"` **hanya** untuk kunci di `URGENT_KEYS` — saat ini satu: `session.expired`. Modul tidak pernah menulis `role="alert"` harfiah; ia keluar dari daftar. | (d) |
| Fokus tidak dirampas | `openModal()` (`app.js:5420`) memang tidak memindahkan fokus — aman, tetapi tidak dijaga | Modul tidak memancarkan `autofocus`, `.focus()`, atau `tabindex` positif; `stealsFocus:false` ikut di objek pemberitahuan. Murid yang sedang mengisi jawaban tetap di kolomnya. | (d2) |
| Urutan baca benar | — | Markup selalu judul → penjelasan → penenteram → tombol tutup. Tombol tutup **paling akhir** supaya pembaca layar tidak menawarkan "Tutup" sebelum murid tahu apa yang ditutup. `aria-atomic="true"` supaya pesannya dibaca utuh, bukan sepotong. | (d2) |
| Kontras ≥ 4.5:1 | Warna panel diambil dari token, rasio tidak pernah dihitung | Warna dipatok eksplisit: `#241A11` di atas `#FFF3DC`. Gerbangnya **menghitung** rasio kontras WCAG dari heksa di `style.css` dan `COLORS`, bukan mempercayai nama token. | (d3) |
| Target sentuh ≥ 44px | Tombol modal memakai gaya umum | `.fz-notice-btn { min-height:44px; min-width:44px }` + `:focus-visible` yang terlihat. | (d3) |
| Tidak hilang sebelum terbaca | `showToast()` (`app.js:2521`) menyembunyikan diri setelah **2.600 ms** | Tidak ada pemberitahuan jatah/suara yang lewat jalur toast. `persistUntilDismissed:true`, `autoHideMs:0`, tidak ada animasi penyembunyian di CSS-nya. Murid yang membaca lambat, atau yang memakai pembaca layar, tetap kebagian. | (e) |
| Varian jujur "benar-benar tanpa suara" | Naskah lama menjanjikan suara perangkat tanpa memeriksa | Setiap kunci punya `silent` yang mengaku audionya tidak keluar, menunjuk teks yang tetap terbaca, dan menyebut kapan bisa dicoba lagi. | (f) |

### 3.1 Aturan yang mudah terlewat: senyap saat sesi listening berjalan (§3 brief)

Kalau pemberitahuan mengumumkan dirinya lewat pembaca layar **di tengah kalimat soal
listening**, ia merusak ujiannya: murid kehilangan potongan audio yang justru dinilai, dan
tidak ada cara mengulangnya tanpa mengubah kondisi tes. Ini bukan gangguan kecil, ini
membatalkan validitas item.

**Aturannya, sebagaimana diterapkan di `announcement()`:**

> Selama sesi listening berjalan, pemberitahuan **tetap muncul secara visual** tetapi
> **tidak mengumumkan diri**: `role=""`, `aria-live="off"`, `announce:false`,
> `deferUntilSessionEnd:true`, dan tetap tidak menyentuh fokus. Pengumumannya menunggu sesi
> berakhir. **Tanpa pengecualian — termasuk `session.expired`**, karena "hasilmu belum
> tercatat" pun tidak lebih berharga daripada tidak merusak satu bagian ujian; sesi itu
> berakhir dalam hitungan menit dan pesannya masih relevan sesudahnya.

Jalur penundaannya sudah ada dan dipakai ulang, bukan dikarang: pola m026-02
`onSessionEnd:()=>{try{maybePresentPuterCreditNotice()}` di `skillsLab()`, yang dipicu addon
lewat `notifySessionEnd('exit')` / `notifySessionEnd('complete')`. `presentQuotaNotice()`
juga **menolak merender** selama `puterListeningActive()`. Dijaga (g).

---

## 4 · Gerbang baru

`tests/quota-notice-a11y-test.js` — node murni, tanpa dependensi, memindai tiga korpus: modul
naskah, peta `POLITE` kedua rute, dan blok fungsi pemberitahuan di `app.js` (diambil dengan
penghitungan kurung, bukan regex baris, dan komentarnya dibuang supaya kutipan penjelasan
tidak disalahartikan sebagai kode).

| Kode | Yang diperiksa |
|---|---|
| (a) | Nol istilah teknis terlarang di seluruh naskah murid: quota, endpoint, server, worker, 429, Puter, Cloudflare, cache, token |
| (a2) | Galat provider mentah tidak pernah sampai ke layar |
| (b) | "nggak" dipakai; "tidak" dan "Anda" tidak dipakai di naskah yang diatur kanon |
| (b2) | Tanpa janji hasil, tanpa menyalahkan murid |
| (c) | Nol elemen `<a>`/`<button>` pembayaran di panel jatah, + `planPanelMarkup` melempar saat `paymentEnabled=true` |
| (d) | `role="alert"` hanya dari daftar `URGENT_KEYS`; `role="alert"` harfiah dilarang |
| (d2) | Fokus tidak dirampas; urutan baca judul→isi→catatan→tutup; `aria-atomic` |
| (d3) | Rasio kontras **dihitung** ≥ 4.5:1; `min-height`/`min-width` 44px ada di CSS |
| (e) | Tidak ada pemberitahuan jatah lewat `showToast`; `autoHideMs` 0; tanpa animasi penyembunyian |
| (f) | Setiap kunci punya varian jujur tanpa suara yang memberi jalan terus |
| (f2) | Temuan bohong §1 tertutup di kedua rute + urutan `resolveKey()` |
| (g) | Aturan senyap sesi listening ada di modul, di penjaga `app.js`, dan di kait akhir sesi addon |
| — | Modul terpasang di `index.html` dan ikut di-precache `sw.js` |

Hasil: **PASS — 13 pemeriksaan, 0 gagal**. Laporan mesin: `QUOTA-NOTICE-A11Y-REPORT.json`
(skema `fiezel-quota-notice-a11y-v1`).

**Gerbangnya sudah dibuktikan bisa merah**, bukan hanya hijau: satu kalimat naskah sengaja
diganti menjadi "Pelajarannya tidak berhenti karena cache server." → (a) dan (b) langsung
gagal; naskahnya lalu dipulihkan dan hijau lagi. Gerbang yang belum pernah merah bukan
gerbang.

Terdaftar di `.github/workflows/quality.yml` tepat sesudah tiga gerbang jatah
(`quota-core` / `quota-manipulation` / `quota-reset`), karena ia menguji sisi yang tidak
disentuh ketiganya: bukan angkanya, melainkan kalimat yang dibaca murid ketika angkanya
habis.

### 4.1 Dua gerbang lama yang assert-nya IKUT BERUBAH (dan alasannya)

Saya tidak melonggarkan keduanya; saya memindahkan assert-nya ke properti yang lebih kuat.

- **`tests/puter-popup-once-test.js`** dulu mewajibkan `app.js` memuat
  `/Kredit AI Puter kamu habis/` dan `/Pelajari opsi upgrade/`. Keduanya justru yang
  dilarang kanon (nama mesin; permukaan bayar). Assert-nya sekarang: pemberitahuannya
  memanggil `presentQuotaNotice({copyKey:'quota.ai.exhausted'…})`, tetap milik FIEZEL
  (bukan dialog SDK, tidak pernah `requestUpgrade`), tetap mengatakan aplikasinya jalan
  penuh tanpa bayar, dan **tautan berbayarnya harus hilang**. Yang dijaga aslinya —
  sekali per periode, hanya di akhir sesi — tidak disentuh.
- **`tests/ai-integration-test.js`** dulu mewajibkan pesan provider ter-escape muncul di layar
  (`&lt;img`). Sekarang pesan provider tidak dicetak sama sekali, jadi assert-nya menjadi
  lebih ketat: tidak ada markup provider dalam bentuk apa pun, judul tetap di-escape,
  naskah murid tetap ada. Assert `diblokir peramban` dan timeout mengikuti naskah barunya.

---

## 5 · Verifikasi

Semua dijalankan di `/home/user/workspace/wt-a8a11y`.

| Gerbang | Hasil |
|---|---|
| `tests/quota-notice-a11y-test.js` (baru) | exit 0 — PASS 13/0 |
| `tests/a11y-test.js` | exit 0 |
| `tests/ui-structure-test.js` | exit 0 |
| `tests/gems-test.js` | exit 0 (34 pemeriksaan) |
| `tests/speaking-listening-test.js` | exit 0 (45/0) |
| `tests/listening-exam-test.js` | exit 0 |
| `tests/regression-test.js` | exit 0 |
| `tests/install-health-test.js` | exit 0 |
| `validator.js` | exit 0 |

Tambahan, karena masukannya saya sentuh: `tests/ai-task-contract-test.js`, `tests/cf-api-contract-test.js`,
`tests/quota-core-test.js`, `tests/quota-manipulation-test.js`, `tests/puter-popup-once-test.js`,
`tests/ai-integration-test.js`, `tests/pwa-cache-test.js`, `tests/pwa-release-coherence-test.js`,
`tests/sw-corp-test.js`, `tests/contrast-test.js`, `tests/pastel-field-contrast-test.js`,
`tests/topbar-logo-contrast-test.js`, `tests/no-network-test.js`, `tests/http-smoke-test.js`,
`tests/boot-order-test.js`, `product-audit.js`, `tests/onboarding-test.js`, `tests/back-nav-test.js`,
`tests/settings-cache-test.js`, `tests/classroom-test.js`, `tests/breaker-test.js`, `tests/tts-key-test.js`,
`tests/ai-response-shape-test.js`, `tests/diag-panel-test.js`, `tests/lesson-experience-test.js`,
`tests/experience-integration-test.js`, `tests/tours-test.js` — semuanya exit 0.

Menambahkan `./features/quota/quota-copy.js` ke daftar precache `sw.js` **tidak** menuntut
bump versi: `tests/pwa-cache-test.js` dan `tests/pwa-release-coherence-test.js` hijau tanpa perubahan
versi build. Versi build tidak disentuh.

### 5.1 Bukti visual 390px — BELUM BISA DIAMBIL DI MESIN INI

Jujur, dan ini bukan alasan yang dikarang: mesin ini tidak punya peramban.
`npx playwright install chromium` menolak dengan *"Playwright does not support chromium on
ubuntu26.04-x64"*, tidak ada `chrome`/`chromium` di sistem, dan gerbang e2e repo sendiri
(`tests/e2e-level-grammar-test.js`) melaporkan `SKIPPED — tidak ada Chromium/Chrome yang bisa
dipakai di mesin ini`. Saya tidak akan menempelkan gambar yang tidak berasal dari render
sungguhan.

Yang disiapkan supaya buktinya bisa diambil dalam satu perintah di mesin yang punya
peramban:

- `reports/add-a8-shots/notice-harness.html` — memuat `style.css` dan
  `features/quota/quota-copy.js` **asli** (bukan salinan) lalu mencetak empat permukaan:
  jatah suara habis tanpa suara, lepas internet, penghitung jatah rusak, dan panel jatah.
- `reports/add-a8-shots/shoot.js` — viewport 390×844, `deviceScaleFactor:2`, memotret
  masing-masing panel **dan mengukur** tinggi/lebar tombol, `role`/`aria-live`/`aria-atomic`,
  urutan baca, `document.activeElement`, serta jumlah `<a>`/`<button>` di panel jatah. Jadi
  yang keluar bukan cuma gambar, tetapi angka yang bisa dibantah.

Yang **sudah** dibuktikan tanpa peramban: `reports/add-a8-shots/dump-notice-markup.js` →
`reports/add-a8-shots/a8-notice-markup.txt`, berisi markup persis untuk enam keadaan
(termasuk keadaan "saat sesi listening jalan", yang tercatat `role="" aria-live="off"
announce=false tunda=true`), plus panel jatah dengan hitungan `elemen <a>: 0`,
`elemen <btn>: 0`, dan `paymentEnabled=true → melempar`.

---

## 6 · Berkas

Baru: `features/quota/quota-copy.js`, `tests/quota-notice-a11y-test.js`,
`reports/add-a8-a11y.md`, `reports/add-a8-shots/{notice-harness.html, shoot.js,
dump-notice-markup.js, a8-notice-markup.txt}`, `QUOTA-NOTICE-A11Y-REPORT.json`.

Diubah: `workers/api/tts/route-tts.js`, `workers/api/ai/route-ai.js`, `app.js`,
`index.html`, `sw.js`, `style.css`, `.github/workflows/quality.yml`,
`tests/puter-popup-once-test.js`, `tests/ai-integration-test.js`, `NO-NETWORK-REPORT.json` +
`PUTER-POPUP-ONCE-REPORT.json` (dibuat ulang oleh gerbangnya).

## 7 · Yang masih terbuka

1. **cf-b8 belum ada.** Kalau dokumen itu mendarat dengan kalimat resmi yang berbeda, ganti
   peta di `features/quota/quota-copy.js`; gerbangnya akan memaksa kalimat baru itu tetap
   memenuhi kanon.
2. **`fiezel-cf-voice-notice.js` (roll/s6tts) belum digabung.** Saat digabung, ia harus
   mengambil naskahnya dari `FiezelQuotaCopy`, bukan menyimpan peta keduanya — dua peta
   naskah akan berbeda dalam dua bulan. Belum ada gerbang yang mencegah duplikasi itu; itu
   pekerjaan merge-nya.
3. **`showToast()` masih 2.600 ms untuk pesan lain.** A8 hanya melarangnya untuk
   jatah/suara. Pesan penting lain di aplikasi masih bisa hilang sebelum terbaca — layak
   diaudit terpisah.
4. **Screenshot 390px** menunggu mesin dengan peramban (§5.1).
