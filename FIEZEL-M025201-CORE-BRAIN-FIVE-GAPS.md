# m025-201 · Core Brain: lima celah ditutup + satu lubang gerbang

**Status: SUDAH DI MAIN.** Isinya ter-push sebagai bagian dari commit `13a9375`
(`origin/main`, 30 Agu 2026) — lihat §6 "Catatan proses" untuk kenapa berkas ini ada
terpisah dan bukan menjadi deskripsi PR seperti seharusnya.

Dokumen ini adalah deskripsi perubahan yang tidak pernah punya PR. Ia ditulis supaya
riwayat repo menyebutkan apa yang benar-benar berubah, bukan hanya judul commit yang
memuatnya.

---

## 1. Apa yang diperbaiki

Audit Core Brain di `main` menemukan 21 modul otak dengan 28 gerbang hijau — dan lima
celah yang semuanya masih terbuka, plus satu lubang gerbang yang belum jadi bug. Kelimanya
punya satu bentuk yang sama: **sinyal atau penalaran yang sudah ada, sudah dibayar, dan
tidak pernah sampai ke keputusan.**

### Celah 1 — Otak tidak bernalar di sisi server

`fiezel-core-worker.js` tidak punya penalaran sendiri. Kalau ringkasan Core Brain dari
perangkat murid tidak sampai — app.js lama masih dilayani service worker, modul otak gagal
dimuat, bukti klien belum melewati ambang keyakinan, atau murid baru pindah perangkat —
kebijakan jatuh **penuh** ke lapisan v1: rata-rata dan ambang tetap. Artinya ada keadaan
nyata di mana menyalakan Core Worker membuat murid dapat kebijakan **lebih tumpul**
daripada kalau ia offline, dan tidak satu gerbang pun bisa melihatnya.

**Perbaikan.** `serverBrainMirror()` + `refinePolicyWithServerMirror()`, dipakai HANYA saat
ringkasan otak tidak ada atau di bawah ambang keyakinan (`brainDigestUsable()`).

Batas yang dijaga, dan alasannya:

- Ia **tidak** berpura-pura menjadi Core Brain. Estimasi kemampuan IRT butuh riwayat
  jawaban per soal, dan itu memang tidak pernah dikirim ke server — batas privasi yang
  dijaga `observability-privacy-test.js` dan tidak dilonggarkan satu byte pun di sini.
- Ia **tidak** mengarang `targetDifficulty` / `difficultyBand` / `reviewShare`. v1 sudah
  menghitung ketiganya dari masukan yang sama; menghitungnya lagi = menghitung ganda.
- Yang ia kerjakan adalah satu penalaran yang memang bisa dilakukan server dan tidak
  dilakukan v1: membaca **`todayAttempts`** — sinyal yang, persis seperti `highRiskCount`,
  selama ini dikirim murid dan tidak pernah dibaca satu baris pun. Murid yang sudah
  menjawab 30 soal hari ini dengan tempo normal dan nol sesi ditinggalkan lolos **seluruh**
  ambang v1 dan tetap diberi sesi 12 soal.
- Kode rasionalnya berprefiks `server_`, **bukan** `brain_`. Mengaku `brain_` berarti
  mengklaim penalaran yang tidak terjadi — dan pelatih AI akan menjelaskan kepada murid
  sesuatu yang tidak pernah dihitung.
- Ia hanya boleh **memperkecil** sesi, tidak pernah memperbesar. Cermin yang boleh
  memperbesar adalah cermin yang bisa membuat murid lelah atas nama tebakan.
- `confidence` dibatasi 0.6: ia melihat ringkasan, bukan riwayat, dan tidak boleh terdengar
  seyakin Core Brain yang memegang datanya sendiri.

### Celah 2 — Pelatih AI menjelaskan rencana yang bukan rencana murid

`/api/policy/next` memakai kebijakan yang sudah lewat lapisan otak; `/api/coach/context`
memanggil `deriveAdaptivePolicy` **mentah**. Padahal system prompt pelatih itu sendiri
memerintahkan bahwa kebijakan deterministik yang berwenang dan tugas pelatih hanya
menjelaskannya. Pelatih menjelaskan dengan setia sesuatu yang salah: target, ukuran sesi,
dan kesulitan yang ia bacakan berasal dari lapisan yang sudah ditimpa sebelum sampai ke
perangkat murid.

**Perbaikan.** Satu jalan untuk semua rute: `resolvePolicyForRequest()`. Kedua rute
memanggilnya, keduanya menerima `body.brain`, dan gerbang `R1` di
`core-policy-parity-test.js` melarang rute **mana pun** memanggil `deriveAdaptivePolicy`
langsung — supaya celah ini tidak bisa lahir kembali dari rute baru yang belum ada hari
ini. Sisi klien ikut diperbaiki: `askCoachAI()` dulu mengirim `buildAdaptivePolicy()`
telanjang; sekarang `applyCoreBrain(buildAdaptivePolicy(...))` beserta `brain` digest-nya.

### Celah 3 — `highRiskCount` dikirim murid, tidak pernah dibaca

Sinyal ini hanya muncul di fungsi penjepit `boundedEvidence` lalu berhenti. Kebijakan cuma
melihat panjang antrean jatuh tempo, bukan berapa materi yang benar-benar rawan lupa.
Seratus materi due yang retensinya masih 0.95 bukan seratus alasan mengulang.

**Perbaikan.** `riskyReviews = min(dueReviews, highRiskCount)` menentukan porsi review pada
mode `review`: lantai `.35` (mode review tetap harus berarti review), langit-langit `.65`
(nilai lama — jadi kasus beban berat tidak berubah satu angka pun). Dua kode rasional baru
menyatakan keadaannya apa adanya: `memory_high_risk_load` dan `due_backlog_low_risk`.

**Kompatibilitas.** `boundedEvidence` sekarang menyimpan `null` (bukan 0) saat sinyalnya
tidak dikirim — idiom yang sudah dipakai `confidence.gap`. Klien lama yang tidak mengirim
`highRiskCount` melewati seluruh blok ini dan berperilaku persis seperti sebelum rilis ini.
Dijaga uji `S2`.

### Celah 4 — Alasan Core Brain terpotong sebelum sampai ke layar

Worker mengirim sampai 12 kode, klien memotong di 8. Pemotongan itu tidak netral: lapisan
v1 mengisi daftar lebih dulu dan lapisan otak menambah di **ekor**, jadi yang terbuang
selalu `brain_*` — tepat pada murid yang paling banyak masalahnya dan karena itu paling
butuh dijelaskan.

**Perbaikan, tiga lapis** — karena cacatnya ternyata lebih dalam daripada angka 8:

1. `capRationaleCodes()` memotong dengan **prioritas**, bukan posisi. Yang bertahan adalah
   kode yang tidak bisa direkonstruksi pembaca v1 sendirian (`brain_`, `server_`,
   `policy_trend_`, `recent_policy_outcome_`). Aturan yang sama persis dipakai di `app.js`,
   `fiezel-core-worker.js`, dan `features/brain/fiezel-core-brain.js`.
2. Sanitizer klien berhenti memotong di 8.
3. **Yang sebenarnya membunuhnya:** `RATIONALE_TEXT` di
   `features/personal-journey/fiezel-personal-journey.js` tidak punya **satu pun** entri
   untuk `brain_*`, `server_*`, `policy_trend_*`, atau `recent_policy_outcome_*`. Kode-kode
   itu dibuang sebagai "tidak dikenal" oleh `rationaleText()` biar pun mereka lolos semua
   pemotongan di hulu. Ditambahkan 21 padanan teks (id + th), dan pemilihan tiga alasan
   yang ditampilkan sekarang menjamin **satu alasan penalaran selalu ikut**, sisanya bukti
   konkret — supaya murid mendengar dua-duanya.

### Celah 5 — Sepuluh hasil kebijakan di KV dipakai untuk satu hal saja

Hanya label sesi terakhir yang dibaca. Pertanyaan yang paling ingin dijawab guru mana pun —
*cara mengajar ini benar-benar berhasil untuk murid ini, atau kita cuma beruntung sekali
dua kali?* — tidak pernah ditanyakan, padahal datanya sudah ada.

**Perbaikan.** `policyEffectiveness()` menilai seluruh riwayat yang relevan, dengan
kehati-hatian yang bisa dipertanggungjawabkan:

- sampel berskor < 4 tetap `unknown` — dua hasil bukan tren, itu kebetulan;
- yang dibandingkan **rerata skor paruh lama vs paruh baru**, bukan label terakhir, jadi
  satu sesi buruk di tengah runtun bagus tidak membalik kesimpulan;
- ambang ±8 poin; di bawah itu `flat` — perbedaan yang lebih kecil dari derau sesi-ke-sesi
  tidak boleh mengubah kebijakan;
- status `insufficient` tidak ikut dinilai (sesi yang terlalu pendek untuk menilai apa pun
  bukan bukti kebijakannya gagal) tetapi tetap dihitung di `sampled` supaya jumlahnya jujur;
- `confidence` berhenti di 0.9 — sepuluh sesi tetap sepuluh sesi, bukan kepastian.

Efeknya pada kebijakan sengaja kecil: tren menurun menahan materi baru dan menurunkan
kesulitan **satu** tingkat, dan tidak menurunkannya lagi kalau hasil terakhir sudah
menurunkannya. Tren naik tidak pernah menaikkan kesulitan sendiri — itu tetap hak runtun
positif yang sudah teruji. Jendela riwayat klien disamakan dengan Worker (5 → 10).

### Lubang gerbang — manifest vs halaman

`brain-manifest-test.js` mengadu manifest dengan isi direktori, tetapi **nol** gerbang
mengadunya dengan `index.html` / `sw.js`. Hari ini masih konsisten (1 dari 21 modul tidak
dimuat halaman — `fiezel-retention-probe.js` — dan otoritasnya memang `off`). Tapi
konsistensi hari ini bukan gerbang: modul berotoritas `active` yang lupa dimasukkan ke
halaman tidak akan dikatakan siapa pun, dan itu persis kelas cacat yang membunuh analytics
murid secara senyap di T-031.

**Perbaikan.** `brain-page-wiring-test.js`. Bukti-bisa-merahnya menaikkan modul `off` yang
hari ini memang tidak dimuat menjadi `active` — bentuk cacat masa depan yang gerbang ini
benar-benar tunggu.

---

## 2. Temuan sampingan: drift naskah yang belum pernah terlihat

Gerbang paritas baru langsung menemukan cacat yang sudah ada di `main` sebelum rilis ini:
CTA mode `diagnostic` berbeda antara dua sisi.

| | teks |
|---|---|
| `app.js` (kanon `policy.diagnostic-cta`) | "Cari tahu level kamu" |
| `fiezel-core-worker.js` (hardcoded, basi) | "Bangun profil kemampuan" |

Karena `sanitizeAdaptivePolicy` mengambil `cta` dari Worker saat tersedia, murid **online**
membaca tombol yang berbeda dari murid **offline**. Worker disamakan ke kanon naskah id.

---

## 3. Gerbang baru

| Gerbang | Yang dijaga |
|---|---|
| `core-policy-parity-test.js` (20 uji) | **P** paritas penuh `deriveAdaptivePolicy` app.js ↔ Worker atas 7 skenario, termasuk naskah · **R** nol rute memakai kebijakan mentah · **S** `highRiskCount` & `todayAttempts` benar-benar mengubah keluaran · **K** pemotong berprioritas seragam di 3 berkas, dan kodenya sampai ke layar · **T** tren atas 10 hasil, menolak sampel kecil · **M** cermin server menyala/padam pada waktu yang benar dan tidak pernah mengaku `brain_` |
| `brain-page-wiring-test.js` (9 uji) | Setiap modul `active`/`shadow` dimuat `index.html` **dan** ikut precache `sw.js`; nol skrip otak hantu di halaman/cache; halaman dan SW sepakat; modul `off` yang belum tersambung dilaporkan apa adanya |

Keduanya punya **bukti-bisa-merah**: setiap detektor dijalankan ulang terhadap salinan
sumber yang sengaja dirusak *di memori* (bukan di disk), dan gerbang menuntut detektornya
merah. Gerbang yang tidak pernah dibuktikan bisa merah adalah gerbang yang tidak diketahui
menguji apa pun. Nol jaringan, nol tulis berkas.

Keduanya terdaftar di `.github/workflows/quality.yml` (dituntut `gate-registry-test.js`).

---

## 4. Kenapa `deriveAdaptivePolicy` ditulis dua kali

Kebijakan belajar hidup di dua tempat: `app.js` (dipakai saat offline / Core Worker mati)
dan `fiezel-core-worker.js` (dipakai saat online). Itu **disengaja** — murid offline tetap
harus dapat rencana. Yang tidak disengaja adalah tidak adanya satu pun gerbang yang
membandingkan keduanya, sehingga setiap perbaikan yang mendarat di satu sisi lolos tanpa
terlihat. Kelima celah di atas lahir dari kelas itu. `core-policy-parity-test.js` sekarang
menutup kelasnya, bukan hanya kelima instansinya.

---

## 5. Batas yang TIDAK dilonggarkan

- Nol data mentah baru dikirim ke server. `todayAttempts` dan `highRiskCount` sudah ada di
  payload `fiezel-learner-evidence-v1` sejak lama; yang berubah hanya bahwa keduanya
  akhirnya **dibaca**.
- `observability-privacy-test.js` dan `analytics-privacy-test.js` tidak disentuh.
- Batas payload CF `context_coach` (`maxPayloadBytes` 8.000 B) tidak diubah. Hanya
  `policy.maxBytes` yang dinaikkan 1.200 → 1.800 B, dan itu memperbaiki cacat yang sudah
  ada: kebijakan dengan 12 kode rasional saja sudah 1.213 B, jadi murid dengan bendera
  merah paling banyak justru murid yang permintaan pelatihnya ditolak `too_big:policy`.

---

## 6. Catatan proses — dibaca dulu sebelum menilai riwayat

Kerja ini **tidak** melewati branch + PR seperti seharusnya, dan penyebabnya ada di sisi
sesi ini:

1. **Klaim tidak didaftarkan.** `coordination/CLAIMS.json` mewajibkan setiap sesi menulis
   entri `active` berisi daftar path **sebelum** menyentuh berkas apa pun. Sesi ini tidak
   melakukannya. Akibatnya sesi lain (`perplexity-computer`, gelombang i18n Thai) tidak
   punya cara tahu bahwa `app.js`, `fiezel-core-worker.js`,
   `features/personal-journey/`, dan `features/i18n/copy-*-feat-b.js` sedang disentuh.
2. **Kerja tersapu ke commit orang lain.** Sesi itu menyertakan seluruh isi working tree ke
   commit `13a9375` dan mem-push-nya ke `origin/main`. Judul commit menyebut gelombang
   i18n; isinya juga seluruh perubahan Core Brain di dokumen ini.
3. **Nomor build diketik tangan.** `coordination/BUILD-VERSION.json` melarangnya dan
   menunjuk `tools/bump-build.mjs` sebagai satu-satunya pintu. Sesi ini menaikkan ketiga
   penanda secara manual ke `m025-201` — nomor yang ternyata sudah diklaim gelombang i18n.
   Ketiganya kebetulan tetap selaras (`coordination-guard-test.js` hijau), tetapi
   `SW_REV` kini berdeskripsi `m025-201-core-brain-five-gaps-20260830` sementara
   `BUILD-VERSION.json` menyebut alasan gelombang i18n. **Keduanya benar sebagian:
   m025-201 memuat dua gelombang.**
4. **`core-config.js` dan `sw.js` diklaim sesi lain** (`sesi-computer-086e9698/A6`) saat
   disentuh. Dilaporkan di sini apa adanya, bukan didiamkan.

**Riwayat `main` sengaja TIDAK ditulis ulang.** Commit `13a9375` sudah ter-push dan sesi
lain masih aktif di repo yang sama; menulis ulang riwayat yang sudah dibagikan adalah cara
tercepat membuat kerja orang lain korup. Yang bisa dibereskan tanpa merusak apa pun adalah
catatannya — dan itulah berkas ini beserta entri `finished` di `coordination/CLAIMS.json`.

**Keputusan yang tersisa untuk pemilik:** apakah `SW_REV` dan
`coordination/BUILD-VERSION.json` perlu diselaraskan agar sama-sama menyebut dua gelombang.
Tidak dikerjakan dari sini karena `coordination/` dan `sw.js` diklaim sesi lain, dan
mengubah nomor build yang sudah ter-push punya biaya cache yang nyata bagi murid.

---

## 7. Verifikasi

- Integritas pasca-tabrakan: `git diff origin/main` kosong, nol penanda konflik merge, dan
  23 suntingan yang dimaksud hadir **tepat sekali** masing-masing (nol hunk ganda/separuh).
- Gerbang yang tersentuh langsung, semuanya hijau: `core-worker-contract-test.js`,
  `adaptive-policy-test.js`, `policy-outcome-test.js`, `personal-journey-test.js`,
  `personal-journey-ui-test.js`, `core-brain-test.js`, `core-brain-v2-test.js`,
  `brain-manifest-test.js`, `install-health-test.js`, `pwa-release-coherence-test.js`,
  `coordination-guard-test.js`, `gate-registry-test.js`, `th-coverage-test.js`,
  `locale-enum-test.js`, `id-golden-snapshot-test.js`.
- Gerbang baru: `core-policy-parity-test.js` 20/20, `brain-page-wiring-test.js` 9/9.
