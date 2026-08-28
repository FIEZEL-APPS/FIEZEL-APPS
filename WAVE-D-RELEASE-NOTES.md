# Wave D — Catatan Rilis untuk Owner

**Branch:** `audit-wave-d` (basis HEAD `f3d8659` = tip `origin/main` saat audit) ·
**Tanggal:** 2026-08-28 · **Status:** perbaikan dieksekusi paralel oleh 10 fixer;
**gate final dijalankan pada integrasi, bukan saat dokumen ini ditulis.**

Aturan dokumen ini sama dengan [ADAPTIVITY-READINESS-REPORT.md](ADAPTIVITY-READINESS-REPORT.md):
klaim harus bisa dibantah dengan angka atau file sumber, dan yang belum terbukti ditulis
sebagai belum terbukti. Sumber utama: 10 laporan audit di
`/home/user/workspace/d-findings/D1…D10` (masing-masing READ-ONLY, repo tidak tersentuh
saat audit).

---

## 1. Apa yang berubah, dan kenapa

Sepuluh auditor menyisir repo (gate, konten, keamanan, performa, a11y, wiring, PWA,
deploy, grammar, koordinasi antar-sesi), lalu sepuluh fixer dengan **kepemilikan file
eksklusif** (tidak ada dua fixer menyentuh file yang sama) mengeksekusi perbaikannya.
Ringkasan per area — detail dan daftar id lengkap ada di file sumber tiap baris:

| Area | Yang berubah | Kenapa (temuan) | Sumber |
|---|---|---|---|
| Grammar (D11) | 4 item fatal diperbaiki: TA-006, GI-002, b4_003, b4_018 (distraktor yang ikut benar / opsi cacat format); metadata & register `whyFailsId`; cloze bank diregenerasi | Jawaban ambigu = murid benar dinilai salah — cacat paling merusak di domain yang paling dipercaya | `d-findings/D9-grammar-quality.md` |
| Reading (D12) | 4 evidence ber-elipsis `reading-exam-v1.json` diganti kutipan utuh; perbaikan kerangka item A1/A2 secara konservatif | Evidence tidak verbatim melanggar kontrak grounding; opsi EN A1/A2 terkonsentrasi di titik keputusan murid | `d-findings/D2-content-contamination.md` §4–5 |
| Listening (D13) | Stem pertanyaan A1/A2 diterjemahkan ke Indonesia + field penjelasan Indonesia pasca-jawab (backward-compatible); audio/skrip target tetap Inggris | Temuan terbesar wave D: MCQ listening efektif **100% berbahasa Inggris** (bukan 842/1.407 seperti laporan lama) — murid A1 salah karena tidak paham PERTANYAANNYA, dan bukti tercemar itu masuk model dengan κ=0,45 | `d-findings/D2-content-contamination.md` §2.3, §6 |
| app.js (D14) | Cache `Intl.DateTimeFormat`, koales 3×`save()`→1 per jawaban, bug `classroomBaseRenderer`, guard listener menumpuk, wiring `topConfusions`+saran afek, fokus pindah saat ganti layar, prompt SRL jadi popup | P0 performa D4 + bug D6 + kegagalan a11y D5 (fokus keyboard jatuh ke body di SETIAP soal) | `d-findings/D4-performance.md`, `D6-dead-code-wiring.md`, `D5-a11y-ux.md` |
| style.css (D15) | Cincin fokus kontras ≥3:1 di kartu terang, tap target ≥44 px, hormati `prefers-reduced-motion` OS, styling input cloze & step-tutor | Tap target 27–39 px dan fokus 1,56:1 gagal WCAG | `d-findings/D5-a11y-ux.md` |
| Shell PWA (D16) | `fiezel-search.js` masuk precache, pembersihan cache generasi lama di `activate` (cache model neural TIDAK disentuh), pinch-zoom dibuka, live region dipersempit, CSP mode longgar (bila gate lulus) | Modul search membeku lintas rilis di cache runtime; cache yatim bocor kuota ±152 MB per bump; zoom terkunci gagal WCAG 1.4.4 | `d-findings/D7-pwa-offline.md` T-1/T-5, `D5-a11y-ux.md` T1, `D3-security-privacy.md` HIGH-1 |
| Workers (D17) | Rate limit `/api/auth/anon`, edge guard fail-open → fail-closed, hardening `/api/feedback` — kontrak respons klien tidak berubah | 3 temuan HIGH/MED keamanan; 0 CRITICAL, nol secret hardcode | `d-findings/D3-security-privacy.md` HIGH-2/HIGH-3/MED-2 |
| Dokumen (D18) | §7 readiness report dikoreksi (angka basi dicoret, hitung ulang 2026-08-28 ditambahkan), §10 Wave D di BRAINCORE-V3-REPORT.md, file ini | Laporan yang angka intinya salah lebih berbahaya daripada tidak ada laporan | `d-findings/D2-content-contamination.md` §8 |
| CI (D19) | `adaptivity-simulation-v3.js` (satu-satunya gate yatim) masuk `quality.yml` secara additive; workflow `nightwatch.yml` baru: suite gate tiap malam 01:00 WIB + lapor via GitHub issue (izin read+issues saja, tanpa push) | Gate yang tidak pernah dipanggil CI = bukti yang tidak pernah diperiksa | `d-findings/D1-gate-sweep.md`, `D10-collision-map.md` |
| Gate rilis (D20) | Needle basi `release-audit.py` → pemeriksaan yang menerima kedua bentuk guard sah; assert proximity `paw-mascot-test.js` → struktural; blind spot registry ditutup; `tools/release-check.js` baru (satu perintah semua gate) | 3 gate merah D1 semuanya dari SATU akar: audit rapuh terhadap refactor, bukan hilangnya integritas — guard `validateQuestion` justru makin ketat | `d-findings/D1-gate-sweep.md` |

## 2. Bukti

- **Baseline pra-perbaikan:** sweep 168 gate (165 PASS / 3 FAIL satu akar) dengan log
  mentah di `/home/user/workspace/d1-results/`; hitung ulang kontaminasi konten
  machine-readable di `/home/user/workspace/d2-BANK-SOAL-AUDIT-today.json` dan
  `d2-recount-results.json` (daftar id per temuan).
- **Klaim per perbaikan:** setiap fixer melaporkan butir-per-butir ke orchestrator dan
  wajib menjalankan gate miliknya sampai PASS sebelum menyerahkan.
- **Bukti final:** karena perbaikan berjalan paralel, satu-satunya bukti yang sah untuk
  keseluruhan adalah **run gate pada hasil integrasi** — minimal
  `node tools/release-check.js` (baru, D20), `python3 release-audit.py`, dan
  `node regression-test.js`. Dokumen ini sengaja TIDAK mengklaim hasil PASS/FAIL apa pun
  pasca-perbaikan.

## 3. Risiko sisa (jujur, per bobot)

1. **Integrasi belum digate.** Sepuluh fixer bekerja paralel pada file berbeda; tabrakan
   file dihindari lewat kepemilikan eksklusif, tapi tabrakan PERILAKU (mis. assert D20
   terhadap `app.js` akhir milik D14) baru terbukti aman saat suite penuh dijalankan.
2. **Terjemahan setengah jalan memperburuk bukti** — peringatan eksplisit D2: item yang
   stemnya sudah Indonesia tapi opsinya masih Inggris pindah ke kelas diskon-kecil
   (κ=0,8), padahal kegagalan membaca opsi sama fatalnya. Listening B1–C2 (880 soal) belum
   disentuh wave D; keputusan desainnya (terjemahkan vs biarkan EN sebagai desain mulai
   B2) belum diambil — jangan dibiarkan setengah-setengah
   (`d-findings/D2-content-contamination.md` §5–6).
3. **Jendela campuran versi PWA masih ada** (D7 T-2/T-3): index.html network-first +
   subresource cache-first + tanpa `skipWaiting` — pengguna PWA terpasang bisa berhari-hari
   memegang shell lama. Wave D menutup T-1/T-5, TIDAK mengubah alur update; itu keputusan
   desain yang butuh owner.
4. **CSP bisa jadi ditunda** — D16 diinstruksikan membatalkan CSP bila ada gate yang gagal
   dan mencatatnya di `d-findings/D16-deferred.md`. Periksa file itu sebelum menganggap
   HIGH-1 tertutup.
5. **Struktural yang tidak disentuh wave D:** `app.js` 669 KB monolitik (gzip 224 KB),
   `reading-bank.json` 1,9 MB di precache, stem `q[0]` reading 1.438 item masih EN (tidak
   tampil ke murid — perbaikan lewat generator, P2), penjelasan listening untuk B1–C2.

## 4. Tindak lanjut yang DITUNDA (butuh keputusan/tangan owner)

| # | Item | Kenapa ditunda | Rujukan |
|---|---|---|---|
| 1 | **Deploy `fiezel-api` & `fiezel-owner`** — hardening D17 baru hidup setelah `wrangler deploy` manual; `database_id` D1 dan id KV di `workers/api/wrangler.toml` masih placeholder | Tidak ada jalur CI deploy untuk kedua worker ini (by design: "deploy manual oleh owner adalah gerbang terakhir"); instruksi siap-jalan ditulis D17 di `/home/user/workspace/d-findings/D17-deploy-instructions.md` | `d-findings/D8-cloudflare-deploy.md` §1–2 |
| 2 | **Deploy/konfigurasi Core Worker (Puter)** — bila hasil integrasi menyentuh `fiezel-core-worker.js` | Workflow `deploy-core-worker.yml`/`configure-core.yml` hanya `workflow_dispatch` dan digerbang aktor `FIEZEL-APPS` | `d-findings/D8-cloudflare-deploy.md` §2 |
| 3 | **Item D16-deferred** (kemungkinan terbesar: CSP) | Ditunda hanya bila gate gagal; daftar di `d-findings/D16-deferred.md` bila file itu ada | `d-findings/D3-security-privacy.md` HIGH-1 |
| 4 | **Item D12-deferred** (perbaikan reading yang berisiko mengubah skema/gate) | D12 diinstruksikan konservatif: catat alih-alih memaksa; daftar di `d-findings/D12-deferred.md` bila ada | `d-findings/D2-content-contamination.md` §5 |
| 5 | **Area terkunci T-026 — TIDAK disentuh wave D:** `features/neural-voice/**`, workflow `audio*`, `NEURAL-VOICE-SOURCE-LOCK.json` | Milik agent-5 (sesi lain, branch `agent/m026-raw-pcm-ab-diagnostic`); branch-nya diam 8 hari tapi per protokol ledger v1.2 hanya OWNER yang boleh mencabut kuncinya | `d-findings/D10-collision-map.md` §1 |
| 6 | **T-005/T-006/T-007 neural voice** (audibility device, diagnostics device, migrasi IndexedDB) | Blocked pada bukti dari perangkat owner; T-007 dilarang dikerjakan sebelum bukti T-006 masuk | `d-findings/D10-collision-map.md` §1 |
| 7 | **3 branch berbahaya + PR terbuka** (`neural-voice-coi-repair-20260814`, `ios-neural-voice-5.19.1`, `derive-adoption-target-version`; PR #6, keluarga #36/#33) — jangan di-merge tanpa membaca catatan ledger (index.html kehilangan ios-cache-fix.js + audibility-fix.js) | Keputusan merge/tutup milik owner; `sw.js` disentuh 8 PR terbuka | `d-findings/D10-collision-map.md` §1–2 |
| 8 | **Keputusan desain bahasa listening/reading B1–C2** (terjemahkan vs dokumentasikan EN sebagai desain) + penjelasan Indonesia untuk 1.200 item listening non-A1/A2 | Keputusan produk, bukan perbaikan mekanis; setengah-setengah memperburuk κ (risiko #2 di atas) | `d-findings/D2-content-contamination.md` §5 |
| 9 | **Bump `SW_REV`/versi build final** | Milik orchestrator saat integrasi, bukan fixer — supaya satu rilis = satu kenaikan | `d-findings/D7-pwa-offline.md` T-4 |

---

*Ditulis oleh D18 (kepemilikan: dokumen ini, ADAPTIVITY-READINESS-REPORT.md,
BRAINCORE-V3-REPORT.md) saat fixer lain masih bekerja. Yang bisa dijamin dari sini:
kesetiaan ringkasan pada 10 laporan audit sumber. Yang tidak bisa dijamin: bahwa setiap
perbaikan paralel memenuhi klaimnya — itu tugas gate integrasi.*
