# m025-180 — Core Brain juga bernalar di sisi server

Cabang `claude/core-brain-fiezel-check-vrakga`. Build dinaikkan `m025-179` → `m025-180`
(`core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `sw.js`). Tidak menyentuh
`features/neural-voice/*` selain penanda build, `features/library/`, `workers/`,
`coordination/`.

---

## 1. Apa yang SUDAH ADA, dan apa yang sebenarnya hilang

Pemeriksaan awal menemukan lapisan penalarannya **sehat**: 15 modul di `features/brain/`,
semuanya dimuat `index.html`, ikut precache `sw.js`, dipanggil `app.js`, dan 38 gerbang
terkait hijau. Yang hilang bukan model, bukan matematika, dan bukan gerbang.

Yang hilang adalah **jangkauan**. Seluruh kecerdasan v2/v3 hanya sampai ke Core Worker lewat
satu jalan: `body.brain`, ringkasan yang dihitung perangkat murid.

```
app.js ──coreBrainDigest()──► POST /api/policy/next ──► refinePolicyWithBrain()
                                     │
                          (kalau ringkasan tidak datang)
                                     ▼
                          deriveAdaptivePolicy() saja
                          = RATA-RATA + AMBANG TETAP
```

`deriveAdaptivePolicy()` adalah lapisan v1: akurasi rata-rata, jumlah salah, level ± 1 —
persis empat kelemahan yang komentar kepala `fiezel-core-brain.js` sebut sebagai alasan v2
dibangun. Kalau ringkasan klien tidak datang, `refinePolicyWithBrain()` tidak melakukan apa
pun dan murid menerima kebijakan v1 polos.

Ringkasan tidak datang pada keadaan yang benar-benar terjadi: service worker masih melayani
`app.js` lama sementara worker sudah baru, `FiezelCoreBrain` gagal dimuat, `analyze()`
melempar, atau bukti klien masih di bawah ambang keyakinan. Artinya ada keadaan di mana
**menyalakan Core Worker membuat murid mendapat kebijakan yang lebih tumpul daripada kalau
ia offline** — dan tidak ada satu pun gerbang yang bisa melihatnya.

### 1.1 Bukti yang hanya dimiliki server, dan dibuang sembilan per sepuluh

`OUTCOME_PREFIX` menyimpan sampai **sepuluh hasil kebijakan terakhir** dari SEMUA perangkat
murid, lengkap dengan akurasi yang dicapai versus akurasi yang ditargetkan kebijakan saat itu.
Klien hanya mengirim lima terakhir miliknya sendiri dan kehilangan seluruhnya begitu
penyimpanan lokal dibersihkan.

Sepuluh sesi bukti itu dipakai untuk **satu** hal: membaca label sesi TERAKHIR
(`negative` → perkecil, `mixed` → batasi). Sembilan sisanya dibuang. Pertanyaan yang paling
ingin dijawab guru mana pun — *apakah cara mengajar ini benar-benar berhasil untuk murid ini,
atau kita cuma sedang beruntung sekali dua kali* — tidak pernah ditanyakan, padahal datanya
sudah ada di KV.

### 1.2 Dua cacat yang ikut ketahuan

| # | Cacat | Bukti |
| --- | --- | --- |
| C1 | `/api/coach/context` menghitung kebijakannya sendiri **tanpa** `refinePolicyWithBrain()`. Pelatih AI menjelaskan rencana yang BUKAN rencana yang diterima murid — sambil diperintahkan prompt-nya sendiri: *"the deterministic policy is authoritative: explain it, never replace"*. Ia menjelaskan dengan setia sesuatu yang salah. | rute lama memanggil `deriveAdaptivePolicy(...)` langsung |
| C2 | `evidence.memory.highRiskCount` dikirim klien dan dijepit `boundedEvidence()` sejak `learner-evidence-v1`, tetapi **tidak ada satu pun keputusan yang membacanya**. Kebijakan hanya melihat jumlah jatuh tempo dan risiko tertinggi. Seratus materi "due" yang retensinya masih 0.95 bukan seratus alasan mengulang. | `grep highRiskCount` → hanya jepitannya |

---

## 2. Apa yang ditambahkan

### 2.1 Cermin matematika Core Brain di worker

`brainSuccessProbability` (3PL, c=0.25), `brainAbilityFromAccuracy`, `brainOptimalDifficulty`,
`brainChallengeWindow`, `brainDifficultyBand`, `brainTrend` — cermin dari
`features/brain/fiezel-core-brain.js`, bukan tafsir ulangnya.

Worker di-deploy sebagai SATU berkas ke Puter, tanpa bundler dan tanpa modul, jadi angkanya
memang ditulis dua kali. Batas itu nyata dan ditulis apa adanya di kepala bloknya, bukan
disembunyikan — dan konsekuensinya ditutup gerbang paritas (§3).

### 2.2 `abilityFromAccuracy()` — membaca kemampuan dari agregat

`estimateAbility()` butuh riwayat per jawaban, dan riwayat itu tidak pernah keluar dari
perangkat murid (batas privasi `observability-privacy-test.js`, **tidak** dilonggarkan rilis
ini). Yang sampai ke server hanyalah agregat. Kebalikan 3PL adalah satu-satunya cara jujur
membacanya:

```
θ = b + logit((p − c) / (1 − c)) / a
```

Ia hidup di modul klien — satu rumus, satu berkas, satu sumber kebenaran — dan worker
mencerminnya. Bulat-balik terbukti eksak: `abilityFromAccuracy(successProbability(2.4,3),3)`
= `2.4`.

### 2.3 `policyEffectiveness()` — apakah kebijakan ini benar-benar bekerja

Regresi kuadrat terkecil atas deret hasil kebijakan, dengan **basis residual** bila tersedia:
`(akurasi dicapai − akurasi ditargetkan)`. Kebijakan menyetel kesulitan agar akurasi menempel
di sekitar target, jadi akurasi mentah yang datar bisa berarti "mandek" ATAU "belajar pesat
sambil kesulitan terus dinaikkan" — dan keduanya terlihat sama persis. Selisih terhadap target
membedakannya. Alasan yang sama persis dipakai `momentum()` sisi klien untuk memilih residual
terhadap prediksi model.

Kebijakan yang menargetkan 80% lalu menghasilkan 80% tiga sesi berturut-turut BUKAN kemajuan;
yang menghasilkan 72 → 79 → 86 pada target yang sama, itu kemajuan.

Ambang arahnya dicermin dari klien, termasuk keasimetrisannya: naik cukup `+0.03`, turun harus
curam (`−0.06`) **dan** nyata (`r² ≥ 0.4`).

### 2.4 Titik buta r² yang ditemukan gerbangnya sendiri

Uji `P4 kemandekan` gagal saat pertama kali dijalankan, dan kegagalannya benar:

> r² mengukur berapa banyak **ragam** yang dijelaskan garis. Deret yang benar-benar datar
> tidak punya ragam sama sekali, jadi r²-nya 0 menurut definisi — dan rumus keyakinan yang
> mengalikan dengan r² menjadi paling TIDAK yakin persis ketika buktinya paling BERSIH.

Murid yang lima sesi berturut-turut mendarat tepat di target adalah kemandekan paling pasti
yang bisa diukur sistem ini, dan tanpa perbaikan ini ia justru satu-satunya kemandekan yang
tidak pernah bisa ditindaklanjuti. Fitur yang hanya menyala pada deret datar yang *berderau*
adalah fitur yang menyala terbalik.

Perbaikannya sempit dan bersyarat: bila sebaran seluruh deret ≤ `0.02` (2 poin akurasi untuk
seluruh riwayat — satu soal saja menggeser akurasi sesi 12 soal sekitar 8 poin, jadi ini
berarti "identik sampai pembulatan") **dan** titiknya ≥ 4, keyakinan datang dari jumlah titik
saja.

Jalur ini **sengaja tidak dibawa ke `momentum()` sisi klien**: rumus keyakinan di sana
dikalibrasi terhadap seed simulator adaptivitas (osilasi dan false-decline), dan mengubah
pengalinya berarti membatalkan kalibrasi itu tanpa menjalankan ulang simulatornya. Deret di
sini pun benda yang berbeda — satu titik = satu SESI, bukan satu blok lima jawaban.

### 2.5 `reconstructBrainDigest()` — ringkasan otak dari bukti yang sudah ada

Menyusun ringkasan berbentuk **identik** dengan ringkasan klien, dari agregat yang sudah
dikirim dan sudah dijepit. Akurasi gabungan ditimbang jumlah percobaan (200 soal berakurasi
45% tidak boleh kalah suara oleh 10 soal berakurasi 95%). Ukuran sesi, porsi review, dan tempo
mencermin `planSession()` angka per angka. Ambang kelelahan bukan angka baru: `20000 ms`,
`16000 ms`, `35%`, `25%` sudah dipakai `deriveAdaptivePolicy()` — cermin ini memberi nama pada
keadaan yang sudah dikenali kebijakan, bukan menambah keluarga angka kedua.

`highRiskCount` (C2) akhirnya dibaca: ia yang menentukan `atRiskReviews` dan porsi review.

### 2.6 `applyPolicyEffectiveness()` — dan label yang dihitung ulang

Koreksi terakhir, dengan ambang keyakinan yang dicermin dari `planSession()` termasuk
keasimetrisannya: turun boleh atas bukti lebih tipis (`0.4`) daripada naik (`0.5` memecah
kemandekan, `0.6` membuka materi baru). Salah menahan murid satu sesi jauh lebih murah
daripada salah mendorongnya.

Dua pagar yang ditegakkan gerbang:

1. **Tidak menghukum dua kali.** Kalau hasil sesi terakhir sudah menurunkan kesulitan, tren
   yang sama tidak menurunkannya lagi.
2. **Label pita dihitung ULANG sesudah kesulitan digeser.** Ini cacat yang saya perkenalkan
   sendiri di draf pertama dan tertangkap saat membaca bukti keluarannya: kebijakan bergeser
   ke kesulitan 4 sambil tetap berbunyi label lama. Batas yang sama sudah tertulis di
   `difficultyBand()` sisi klien — label yang tidak mengikuti keputusannya sendiri lebih buruk
   daripada tidak ada label.

Pemecah kemandekan hanya bekerja pada mode `balance`: saat murid sedang dipulihkan, menambal
kebocoran skill, atau mengejar review, menaikkan kesulitan berarti menambah beban tepat di
tempat yang sedang rapuh.

### 2.7 Satu jalan menuju kebijakan (menutup C1)

`resolveAdaptivePolicyServerSide()` dipakai **kedua** rute. `app.js` ikut mengirim `brain` ke
jalur pelatih — tanpa itu, dua rute yang seharusnya sepakat justru berangkat dari masukan
berbeda dan cacat C1 hanya berpindah rute, bukan tertutup. Kebijakan lokal tetap dikirim
seperti sebelumnya, tetapi worker **tidak** memercayainya: ia menghitung ulang.

---

## 3. Gerbang: `core-brain-server-parity-test.js` (45 uji)

Duplikasi tanpa gerbang paritas adalah dua sistem yang berpisah diam-diam — seseorang menyetel
`DISCRIMINATION` di modul klien enam bulan dari sekarang, semua gerbang klien tetap hijau, dan
sejak saat itu murid yang sama menerima dua kebijakan berbeda tergantung apakah ringkasannya
sempat terkirim. Kegagalan seperti itu tidak punya gejala.

| Blok | Yang dijaga |
| --- | --- |
| P1 | Tujuh konstanta worker == yang **diekspor** modul klien, dibaca dari sumbernya, bukan dari komentar |
| P2 | Enam fungsi menjawab angka identik atas matriks penuh — termasuk masukan rusak (`NaN`, `null`, di luar rentang), tempat dua implementasi paling sering berpisah |
| P3 | **Bisa merah**: satu konstanta worker diracun di memori, gerbang menuntut perbandingannya meledak |
| P4 | Tiga titik minimum, pilihan basis, ambang asimetris, dan jalur deret datar |
| P5 | Rekonstruksi: `null` saat tidak ada yang bisa dikatakan, bentuk identik kontrak, keyakinan dibatasi, `highRiskCount` dipakai, akar masalah tidak ditebak |
| P6 | Ringkasan klien yang yakin **tidak pernah** dikalahkan cermin |
| P7 | Regresi yang ditutup, pagar v1 tetap dipegang v1, tidak menghukum dua kali, label pita tidak basi |
| P8 | Pelatih menjelaskan kebijakan yang SAMA — dengan **dan** tanpa ringkasan klien — dan `app.js` benar-benar mengirimkannya |

Nol jaringan: worker dijalankan di dalam `vm` dengan KV di memori.

Catatan teknis yang layak diingat pemelihara berikutnya: objek yang lahir di dalam `vm`
mewarisi `Object.prototype` milik konteks itu, jadi `deepStrictEqual` menolaknya karena
**prototipe** meski setiap propertinya sama — dan kedua sisi tercetak identik di layar.
Perbandingan lintas sandbox di berkas ini menyalin properti sendiri lebih dulu.

---

## 4. Bukti sebelum/sesudah

Murid B1, 160 percobaan, akurasi domain 86–90%, 9 materi di ambang lupa, lima sesi terakhir
mendarat tepat di target 80%, **tanpa** ringkasan klien:

| | sebelum (v1 polos) | sesudah (cermin) |
| --- | --- | --- |
| mode | balance | balance |
| ukuran sesi | 10 | 10 |
| kesulitan | 4 | 4 |
| pita | `stretch` | `standard` |
| porsi review | **0.25** | **0.55** |
| alasan | `due_reviews, recent_policy_outcome_mixed` | `+ brain_optimal_challenge, brain_trend_plateau, brain_memory_at_risk, policy_effect_plateau, policy_effect_plateau_break` |

Sembilan materi yang benar-benar rawan lupa akhirnya menggerakkan porsi review dari 0.25 ke
0.55, dan lima sesi yang mandek terbaca sebagai kemandekan yang perlu dipecah — bukan sebagai
lima sesi "mixed" yang masing-masing dilupakan begitu sesi berikutnya datang.

---

## 5. Batas yang dijaga, dan yang TIDAK dikerjakan

1. **Nol data baru diminta dari murid.** Cermin membaca persis field yang sudah dikirim dan
   sudah dijepit. Nol jawaban mentah, nol riwayat per-soal.
2. **Cermin tidak pernah mengalahkan klien yang yakin.** Keyakinan cermin dibatasi di `0.85`
   supaya urutan itu berlaku secara aritmetika, bukan sekadar urutan `if`. Klien melihat
   setiap jawaban beserta usianya; cermin hanya melihat agregat sepanjang masa.
3. **Ringkasan server lewat jepitan yang sama** (`boundedBrainDigest()`) — tidak ada jalur
   kedua yang batasnya lebih longgar.
4. **Akar masalah tidak ditebak.** Graf prasyarat hidup di klien bersama bukti per-skill yang
   tidak pernah dikirim ke server, jadi `rootCauseSkill` cermin selalu kosong. Menebaknya dari
   daftar skill terlemah berarti mengganti gejala dengan gejala lain sambil terdengar seperti
   diagnosis.
5. **Kalibrasi simulator tidak disentuh.** Tidak ada ambang `momentum()` sisi klien yang
   diubah; `MOMENTUM_ACCURACY_SLOPE` hanya dipindahkan dari angka telanjang menjadi konstanta
   bernama, nilainya tetap `0.04`.
6. **Tidak dikerjakan:** menjalankan ulang `adaptivity-simulation-v3.js` terhadap jalur
   efektivitas kebijakan. Simulator itu memodelkan jawaban per soal, bukan hasil kebijakan per
   sesi, jadi ia tidak bisa menilai lapisan ini tanpa diperluas lebih dulu — dan memperluasnya
   adalah paket kerja sendiri, bukan sisipan. Yang dijamin rilis ini: lapisan efektivitas
   hanya menggeser kesulitan ±1 dalam batas 1..6, dan setiap pergeserannya punya gerbang.

---

## 6. Cara memverifikasi

```bash
node core-brain-server-parity-test.js     # 45 uji, termasuk bukti-bisa-merah
node core-worker-contract-test.js
node core-brain-test.js core-brain-v2-test.js core-brain-v3-upgrade-test.js
node gate-registry-test.js                # gerbang baru terdaftar di quality.yml
```
