# Brain Evolution — Keputusan Pemotongan Tertulis

**Basis:** FIEZEL 5.19.0 · branch `brain-learning-infra-v1` · **Tanggal:** 2026-08-28
**Otoritas:** sintesis empat model council (`../model-council-synthesis.md`) atas master prompt
"Brain Learning Architecture v1.0", diverifikasi terhadap repo. Keputusan promosi/pembatalan
final tetap milik MASTER per `MASTER-ONLY-GOVERNANCE.md` — dokumen ini adalah rekomendasi
advisory yang tertulis supaya tidak ada yang "menemukan ulang" ide yang sudah dibunuh dengan
matematika.

Ini keputusan, bukan kelalaian. Setiap butir membawa alasan yang bisa dibantah dengan angka,
dan status ledger mengikuti taksonomi §23 master prompt:
`research / candidate / approved / rejected`.

---

## 1. A/B testing populasi antar-murid — DIBATALKAN

**Status ledger: `rejected`** (bulat 4/4 model).

Matematikanya tidak bisa ditawar:

- Mendeteksi efek Cohen's *d* = 0,2 pada α=0,05 / power 0,80 butuh **~392 murid per lengan**
  ([pedoman power Wharton](https://wbl.wharton.upenn.edu/wp-content/uploads/2021/11/Guidelines-for-Stat-Power-Sample-Size-190122.pdf));
  efek ed-tech rata-rata hanya 0,125 SD
  ([World Bank, Can EdTech Close Learning Gaps?](https://thedocs.worldbank.org/en/doc/2fba81cd6cd60d2f54532fc7062395fb-0050062026/original/Can-EdTech-Close-Learning-Gaps.pdf)),
  yang butuh 1.000+ per lengan.
- Kapasitas aplikasi di-hard-cap **250 pengguna**: `MAX_USERS = "250"`
  (`workers/api/wrangler.toml:58`, cermin `fiezel-core-worker.js:5`), dengan aktif realistis
  jauh lebih kecil.
- Menambah soal per murid tidak menolong: attempt ter-cluster dalam murid, sehingga attempt
  efektif per murid ber-asimtot di **~1/ICC** — pada ρ=0,1 seorang murid menyumbang ~10 attempt
  efektif entah dia menjawab 100 atau 1.000 soal. 40 murid dibelah 20/20 dengan 300 attempt
  masing-masing = ~200 attempt efektif per lengan, versus 2.629 yang dibutuhkan untuk efek 3 pp
  (analisis clustering Opus, `../model-council-claude_opus_5_0.md` §3.3). Hanya penambahan
  *murid* yang membeli power, dan plafonnya 250.

Bukti pendukung dari repo sendiri: ambang promosi 8-attempt-per-lengan yang sudah terpasang
(`content-promotion.js:10–11`) terbukti coin-flip lewat Monte Carlo 200.000 trial — kandidat
identik lolos 53,9%, kandidat 15 pp lebih buruk lolos 27,5% (Opus §3.2). Infrastruktur A/B
apa pun yang dibangun di skala ini mereproduksi kegagalan yang sama dengan biaya lebih besar.

**Pengganti yang sah pada N≈1–250** (status: `research`, belum ada yang dikontrak):
evaluasi interleaved N-of-1 within-subject pada aliran item dengan assignment FNV deterministik
per item (usulan Fable, `../model-council-claude_fable_5.md` Fase D); simulasi paired multi-seed
dengan bootstrap CI sebagai sumber bukti primer (Opus Fase B); inferensi sekuensial
anytime-valid bila suatu saat ada data hidup (Opus §3.3). Sol menambah gate tertulis: bila
< ~1.000 unit independen yang memenuhi syarat per lengan, jangan bangun infrastruktur A/B sama
sekali (`../model-council-gpt_5_6_sol.md` Fase 5).

## 2. Pattern mining sisi server — DIBATALKAN

**Status ledger: `rejected`.**

- **Tidak ada populasi untuk di-mining.** Pada N≈1–10 aktif, "populasi" dan "murid" adalah objek
  yang sama; `fiezel-meta-learning.js` sudah mengimplementasikan versi jujurnya secara lokal
  (insight weak_skill bila akurasi <70% pada ≥8 attempt) tanpa latensi, biaya, dan permukaan
  privasi tambahan (Fable §2.2).
- **Platform menolaknya secara fisik**: Cloudflare Workers free plan membatasi 10 ms CPU per
  invokasi dan 50 subrequest ([limit Workers](https://developers.cloudflare.com/workers/platform/limits/))
  — mining berat di server tidak muat, komputasi berat harus offline oleh manusia yang mereview
  (Sonnet §3.4).
- **Governance melarangnya**: promosi otomatis terpicu ambang secara struktural haram di bawah
  `MASTER-ONLY-GOVERNANCE.md` — semua agent AI advisory-only (temuan unik Sonnet §2.1).

## 3. Registry model Brain sebagai layanan — DIGANTI: repo-as-registry

**Status ledger: `rejected` (sebagai layanan) → `approved` (substitusi repo-as-registry).**

Registry yang diminta §14/§27 spec sudah ada, namanya git. Registry de-facto FIEZEL adalah:
riwayat commit + tag rilis (m025-173) + ritual triple-bump `SW_REV`/`DIAG_BUILD`/`FIEZEL_PAGE_BUILD`
yang ditegakkan `tests/install-health-test.js` dan `tests/pwa-release-coherence-test.js` + amplop bukti
Ed25519 saat build (`content-evidence-origin.js`). Mengubah parameter = PR + gate + merge MASTER
+ bump SW_REV. Server yang bisa menegosiasikan `brainVersion` adalah permukaan serangan baru
yang filosofi §15 spec sendiri melarangnya (Fable §2.2 butir 3).

Prasyarat yang disetujui untuk menjadikan ini nyata (status: `candidate`, dikontrak ke wave
implementasi): satu **manifest bundle Brain** di dalam repo yang memetakan empat identitas versi
yang hari ini terfragmentasi (schema `fiezel-core-brain-v2`, `FIEZEL_PAGE_BUILD='m025-173'` di
`core-config.js:19`, `DIAG_BUILD`, `SW_REV`) plus peta otoritas (`memory: active`,
`bktUnlock: shadow`) — usulan Sol Fase 0. "Brain v3" hari ini bukan unit yang bisa
diidentifikasi; manifest membuatnya bisa.

## 4. Metrik longitudinal §12 — DIRELOKASI on-device

**Status ledger: `approved` (relokasi); varian "Lane B studyId" berstatus `research`.**

Bukti pemaksanya kriptografis, bukan preferensi: `visitor_token = HMAC-SHA256(pepper_harian,
installId)` dengan pepper dirotasi 24 jam dan pepper N-2 **dihapus permanen**
(`workers/api/analytics/analytics-core.js:10–20,104`) — token hari-1 dan hari-2 tidak bisa
di-link oleh siapa pun termasuk operator, karena materi kuncinya sudah tidak ada. Server bahkan
hanya bisa melaporkan WAU/MAU sebagai rentang [max, sum] (`workers/api/analytics/PRIVACY.md`).
Retensi tertunda, kurva lupa, transfer, dan learning gain adalah kuantitas longitudinal by
definition — maka semuanya dihitung **di perangkat**, tempat riwayat lengkap memang sudah hidup
di 29+ kunci localStorage (audit §3.6), dan hanya digest bucket ter-supresi-k yang boleh naik.
Pola ini sudah terbukti di produksi: `retention_daily` bekerja persis begini — klien melakukan
pembukuan longitudinal dan melaporkan nilai turunan (`analytics-core.js:178`).

Jalur eskalasi yang dicatat tapi TIDAK dibangun sekarang: "Lane B" Sol — lane riset pseudonim
ber-consent terpisah dengan `studyId` acak yang dirotasi per 90 hari
(`../model-council-gpt_5_6_sol.md` §5.1). Status `research`; hanya boleh naik status bila satu
eksperimen terpreregistrasi lolos gate power §1 di atas, dan bila postur legalnya beres
([BRAIN-DATA-PRIVACY.md](BRAIN-DATA-PRIVACY.md) §5–6).

## 5. Parameter BKT — DIBEKUKAN sampai N > 1.000

**Status ledger: `approved` (freeze eksplisit).**

Parameter terpasang `Object.freeze({L0:0.2, T:0.15, slip:0.1, guess:0.25})`
(`features/brain/fiezel-mastery-bkt.js:70`) berada di dalam batas non-degenerasi literatur —
P(G)<0,5 dan P(S)<0,5 teoretis, G<0,3 / S<0,1 praktik Corbett & Anderson
([analisis degenerasi Baker dkk.](https://learninganalytics.upenn.edu/ryanbaker/BCA2008W.pdf)).
Refit dari telemetri lokal ditolak karena presisi parameter berskala 1/√n: **~1.000+ murid per
satu digit signifikan** ([Sao Pedro dkk., BKT at 20](https://ceur-ws.org/Vol-1183/bkt20y_paper01.pdf))
— pada 250 murid maksimum, hasil fit adalah noise dengan kepercayaan diri. Prinsip umumnya
(Opus §6): **setiap parameter yang bisa diambil dari literatur ber-N-besar adalah parameter yang
tidak pernah butuh power statistik lokal** — mis. penjadwalan FSRS yang mengalahkan SM-2 untuk
99,6% pengguna pada [benchmark terbuka 727 juta review](https://expertium.github.io/Benchmark.html),
dan targetSuccess 0,80–0,85 yang didukung
[Wilson dkk., Nature Communications](https://www.nature.com/articles/s41467-019-12552-4).
Tugas Brain adalah menerapkan learning science yang sudah settled, bukan menemukannya ulang
dari 40 pengguna.

## 6. Differential privacy — DITOLAK

**Status ledger: `rejected`.**

Pada N≈40 aktif harian, ε yang memberi proteksi nyata menghapus sinyal yang mau diukur — noise
DP berbesaran independen dari ukuran data, sehingga distorsi relatifnya terbesar justru pada
dataset kecil ([panduan DP arXiv](https://arxiv.org/html/2509.03294v3);
[NIST SP 800-226](https://csrc.nist.gov/pubs/sp/800/226/final) mensyaratkan δ jauh di bawah 1/n
dan evaluasi eksplisit atas jaminan yang diklaim). Desain rotating-pepper sudah memberi
*unlinkability* — jaminan yang lebih kuat untuk konteks ini; DP di atasnya adalah teater dengan
biaya utilitas (Opus §1.3). Digantikan oleh: supresi sel kecil k=20 + koarsening dimensi
([BRAIN-DATA-PRIVACY.md](BRAIN-DATA-PRIVACY.md) §4). Boleh dibuka kembali (status naik ke
`research`) hanya bila suatu saat ada rilis statistik agregat berulang ke pihak eksternal yang
menciptakan risiko differencing nyata.

## 7. Konformansi xAPI / Caliper — DITOLAK

**Status ledger: `rejected` (deviasi didokumentasikan, bukan diabaikan).**

Kedua standar dibangun di sekitar identitas aktor persisten: statement xAPI mewajibkan `actor`
dengan identifier unik plus timestamp presisi dan field respons bebas
([spesifikasi data xAPI](https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md);
[perbandingan 1EdTech xAPI–Caliper](https://www.imsglobal.org/initial-xapicaliper-comparison)).
Aktor persisten adalah persis benda yang arsitektur FIEZEL hapus dengan sengaja — adopsi berarti
regresi privasi, bukan interoperabilitas. Kosakata Caliper boleh dikonsultasikan untuk penamaan;
permukaan payload dan LRS-nya tidak diimpor (Sol §5.4). Deviasi ini dicatat penuh di
[BRAIN-DATA-PRIVACY.md](BRAIN-DATA-PRIVACY.md) §5 supaya reviewer masa depan tidak
"memperbaikinya".

## 8. Paket Brain executable dari server — DILARANG PERMANEN

**Status ledger: `rejected` — permanen, tidak ada jalur naik status.**

- **Platformnya sendiri tidak bisa menepati janji §25 spec**: web terbuka tidak punya primitif
  code-signing untuk PWA live-hosted — registrasi service worker masih tanpa SRI
  ([w3c/ServiceWorker#1680](https://github.com/w3c/ServiceWorker/issues/1680)); web app
  bertanda-tangan sungguhan hanya ada sebagai Isolated Web Apps khusus Chromium yang berarti
  meninggalkan distribusi GitHub Pages (Fable §3.3). Trust root nyata = TLS + proses rilis.
- **Tanda tangan mengautentikasi payload berbahaya, tidak membuatnya aman** (Sol §4.4): kompromi
  kunci pada payload kode = eksekusi kode arbitrer di PWA; pada payload angka ter-clamp = paling
  buruk pedagogi menurun. Mode gagal kedua yang dipilih.
- **Repo sudah menegakkan ini by omission**: tidak ada rute `/api/content/qa/apply` atau
  `/publish`; adopsi hanya saat rilis.

Yang tetap diizinkan: dokumen **parameter numerik** deklaratif dengan schema tertutup, rentang
keras di sisi klien, versi monotonik, expiry, dan fallback last-known-good — awalnya dibundel
statis bersama shell; kanal remote via `GET /api/config` (KV, `no-store`, TTL 60 dtk,
fail-to-OFF — aset yang sudah lulus `tests/cf-shadow-mode-test.js` 36 cek) menyusul HANYA bila ada
kebutuhan operasional terbukti. Tanda tangan detached Ed25519 (desain Opus Fase C) berstatus
`research`: tiga dari empat model menilai beban siklus-hidup kunci belum terjustifikasi sampai
ada adversary bernama DAN delivery parameter remote benar-benar diaktifkan.

---

## 9. Ledger status — rekap satu tabel

| # | Item | Keputusan | Status ledger |
|---|---|---|---|
| 1 | A/B populasi antar-murid | Dibatalkan; pengganti within-subject/simulasi | `rejected` |
| 1b | Evaluasi interleaved N-of-1 + simulator multi-seed ber-CI | Jalur pengganti, belum dikontrak | `research` |
| 2 | Pattern mining sisi server | Dibatalkan; meta-learning lokal sudah ada | `rejected` |
| 3 | Registry service | Diganti repo-as-registry | `rejected` (service) / `approved` (substitusi) |
| 3b | Manifest bundle Brain in-repo + peta otoritas | Prasyarat identitas versi | `candidate` |
| 4 | Metrik longitudinal §12 di server | Direlokasi on-device, upload digest bucket saja | `approved` |
| 4b | Lane B `studyId` pseudonim ber-consent (Sol) | Jalur eskalasi terdokumentasi, tidak dibangun | `research` |
| 5 | Refit parameter BKT dari telemetri | Dibekukan sampai N > 1.000 murid | `approved` (freeze) |
| 6 | Differential privacy | Ditolak; supresi k=20 sebagai gantinya | `rejected` |
| 7 | Konformansi xAPI/Caliper | Ditolak; deviasi didokumentasikan | `rejected` |
| 8 | Paket Brain executable dari server | Dilarang permanen; parameter numerik saja | `rejected` (permanen) |
| 8b | Tanda tangan Ed25519 atas dokumen parameter | Ditunda sampai adversary bernama + kanal remote aktif | `research` |
| 9 | Karantina `features/ui/fiezel-ab-testing.js` | Kode mati yang menyaru infrastruktur (audit §4.2) | `candidate` |
| 10 | Ambang 8-attempt di `content-promotion.js` | Direlabel "ambang keselamatan runtime"; tidak pernah bukti belajar | `candidate` |
| 11 | Temuan pengerasan simulator (adendum 2026-08-29, §10) | Bukti untuk MASTER; gate TIDAK boleh dilonggarkan supaya hijau | `research` |
| 12 | Wiring wave 4: 9 modul infra ke shell + saklar telemetri `'off'` (§11) | Menunggu merge PR #226; emitter `app.js` + lane server kini SUDAH di tree (sinkronisasi 2026-08-29) — tetap nol efek runtime karena mode klien `'off'`, `LEARNING_ENABLED="off"`, dan worker belum deploy | `candidate` |

Tidak ada satu pun butir `rejected` di tabel ini yang boleh dibuka kembali tanpa bukti baru yang
membatalkan angka-angka di §1–8 — dan untuk butir 8, tidak ada bukti yang bisa membatalkannya.

---

## ADENDUM 2026-08-29 (wave 4) — dua entri ledger baru

## 10. Temuan pengerasan simulator — status `research`, menunggu keputusan MASTER

**Status ledger: `research`.** Bukan proposal perubahan kode; ini temuan empiris yang menunggu
keputusan MASTER atas klaim kalibrasi fase 3 sebelum jalur mana pun dikontrak.

Setelah simulator dikeraskan sesuai jalur pengganti butir #1b (50 seed berpasangan × 9 profil
+3 profil bank, deteksi censoring, ambang praktis per metrik, CI bootstrap 95% via
`FiezelStatGate.pairedBootstrap`), empat klaim yang tadinya PASS pada 1 seed tidak bertahan
(`node adaptivity-simulation-v3.js` → exit 1, dieksekusi ulang 2026-08-29):

1. **Kalibrasi item C6 fase 3 belum membuktikan nilai praktisnya**: perbaikan itemBiasRMSE
   single-seed 0.2694→0.2622 (delta 0.0072) di bawah ambang praktis 0.02; di 50 seed meanDiff
   −0.0028 dengan CI [−0.0120, +0.0064] melintasi nol — inconclusive, bukan terbukti.
2. **Censoring parah dan sekarang terlihat**: varian bank tak pernah mencapai mastery pada
   43/50 seed (rate tersensor 95,3%); v1→v2 rate 55,6%→89,8%, CI selisih [0.298, 0.387] —
   trade-off "akurasi di target vs kecepatan mastery" yang dulu tersamar jadi angka rata-rata.
3. **Klaim residual "menurunkan osilasi" adalah keberuntungan seed**: antar-seed meanDiff
   +0.167, CI [+0.054, +0.275] — residual justru sedikit menambah osilasi; falseDecline-nya
   tetap menang telak (−0.0415, CI [−0.0463, −0.0371]).
4. Yang tetap terbukti kuat untuk v2: accuracyGap, retention, brier — CI bersih melewati
   ambang praktis.

Aturan yang mengikat sampai MASTER memutus: verdict FAIL ini TIDAK boleh "diperbaiki" dengan
melonggarkan ambang praktis atau mengecilkan seed; opsi yang sah adalah menerima trade-off
secara tertulis, merevisi kebijakan yang disimulasikan, atau merevisi ambang DENGAN argumen
pedagogis tertulis — tiga-tiganya keputusan MASTER, bukan keputusan wave.

## 11. Wiring wave 4 — status `candidate`, menunggu merge

**Status ledger: `candidate` (menunggu merge PR #226).**

Yang di-wire: 5 modul infra brain (stat-gate, manifest, config, learning-metrics,
metrics-digest — memenuhi prasyarat butir #3b) + 4 modul lane telemetri (config, events,
queue, transport) masuk shell — script tag `index.html:344–348,354–357`, precache `sw.js:78–79`,
triple-bump build ke m025-186 (`core-config.js:19`, `sw.js:35`, `fiezel-diag-panel.js:18`).
Saklar telemetri lahir BEKU pada `mode:'off'` + `endpoint:''`
(`features/telemetry/fiezel-telemetry-config.js:25–28`) dan hanya bisa berubah lewat release
train — konsisten dengan larangan permanen butir #8 (server tidak boleh bisa menyalakan
pengumpulan data di klien).

Batas kejujuran entri ini (diperbarui saat sinkronisasi 2026-08-29): wiring = modul TERANGKUT,
bukan modul BEKERJA — tetapi dua celah yang dulu dicatat "belum ada di tree" kini sudah
mendarat di branch yang sama: pemanggil di `app.js` ADA (emitter `learningTelemetryEmitAnswer`,
`app.js:1311`, dipanggil dari cabang grammar `record()` di `app.js:1395`; gate
`tests/app-telemetry-wiring-test.js` PASS) dan lane ingest server `/api/learning/events` + flag
`LEARNING_ENABLED="off"` ADA (`workers/api/route-wiring.js:74,549`,
`workers/api/wrangler.toml:99`; gate `tests/learning-lane-test.js` 44/44 PASS). Nol efek runtime
tetap benar — bukan karena kodenya absen, melainkan karena mode klien `'off'`, flag server
`"off"`, dan worker belum pernah deploy. Urutan aktivasi lengkap, termasuk kriteria consent
sebelum mode `'on'`, ada di [BRAIN-ACTIVATION-RUNBOOK.md](BRAIN-ACTIVATION-RUNBOOK.md).
Naik status ke `approved` hanya lewat merge + verifikasi Pages deploy + install-health di
perangkat (runbook Langkah 1–2) — status entri ini tetap `candidate` menunggu merge.
