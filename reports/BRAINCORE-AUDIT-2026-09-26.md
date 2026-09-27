# Audit Braincore FIEZEL — 2026-09-26

**Basis:** `main` @ `cdeb159` (build `m025-374`) · **Cakupan:** `features/brain/` (31 modul),
`features/learner-flow/fiezel-decision-trace.js`, kabel Braincore di `app.js`,
`backend/braincore.py`, lapis bukti/telemetri (`features/telemetry/fiezel-braincore-evidence.js`).
**Bukti yang bisa diulang:** `node tools/dev/braincore-audit-2026-09-26-probe.js`.

Aturan tulis sama seperti laporan Braincore sebelumnya: setiap klaim membawa angka atau baris
kode yang bisa dibantah; yang belum terbukti ditulis sebagai belum terbukti.

---

## 1. Vonis singkat

Matematika inti Braincore **sehat dan teruji**: 38 gerbang Braincore hijau, 31 modul lolos
gerbang kemurnian, konstanta 3PL cocok dengan komentarnya, lapis privasi (cohort CSPRNG,
fail-closed) benar. Masalahnya ada di **kabel otonomi**, bukan di rumus:

1. **Penyetel parameter yang benar-benar menyetir murid adalah yang TIDAK berpagar.**
   `FiezelDecisionTrace.evaluateOutcome()` menaikkan `difficulty.targetSuccess` hidup dari 0.80
   ke batas 0.90 dalam median **16–31 jawaban** untuk murid berakurasi 60–85% (200 run per
   profil). Tidak ada stat-gate, tidak ada halt, tidak ada ledger berantai, ikut berjalan saat
   ujian penempatan, dan tidak dipisah per akun/bahasa target.
2. **Penyetel yang berpagar (m025-374, `FiezelSelfTune`) tidak pernah bisa bergerak**, dan
   penilaian hasil sesi (`evaluatePolicyOutcome`) terkunci di `mixed` sejak sesi kedua per
   sasaran — karena lengan kandidatnya satu sesi (≤16 soal) sementara stat-gate menuntut ≥25.

Dengan kata lain: jalur "otonom yang aman" mati, jalur "otonom tanpa pagar" hidup.

---

## 2. Ringkasan temuan

| ID | Tingkat | Area | Temuan | Status |
|----|---------|------|--------|--------|
| A1 | **Tinggi** | learner-flow | Penyetel kedua tanpa pagar menaikkan `targetSuccess` hidup ke 0.90 | **Diperbaiki** (owner: matikan) — §7 |
| A2 | **Tinggi** | app.js / stat-gate | Verdict kebijakan selalu `hold` → outcome sesi terkunci `mixed`, `FiezelSelfTune` tidak pernah apply/rollback | **Diperbaiki** (owner: kumpulkan lintas sesi + panel Home) — §7 |
| A3 | Sedang | app.js self-tune | Override self-tune tidak dibaca runtime; rollback menghapus override alih-alih memulihkan `from` (ledger ≠ nilai efektif) | **Diperbaiki** (owner: ganti ukuran dulu) — §7 |
| B1 | Sedang | app.js + i18n | Kartu "akar masalah" menyebut prasyarat dua kali, gejalanya hilang | **Diperbaiki** + gerbang baru |
| B2 | Sedang | reset progres | Kunci decision trace & parameter hidup selamat dari "Reset progres" | **Diperbaiki** + gerbang R5 |
| B3 | Sedang | backend | Status `TRANSFERRED` lengket selamanya (dan `RETAINED` sampai salah berikutnya) walau posterior jatuh | **Diperbaiki** + unit test |
| B4 | Sedang | backend | Hint melunakkan hukuman jawaban SALAH (arah terbalik) | **Diperbaiki** + unit test |
| B5 | Sedang | core-brain | Perbaikan T6 `reviewPriority` tidak efektif; gerbangnya lolos karena fixture 5 item | **Diperbaiki** (owner) — §7 |
| B6 | Sedang | BKT klien + backend | Peluruhan (decay) BKT tidak pernah dipakai runtime; `update()` mulai dari L yang belum diluruhkan | **Diperbaiki** (owner) — §7 |
| B7 | Rendah | backend | Catatan GAP guru: "X% murid belum mastery" padahal X = 100 − rerata posterior | Rekomendasi |
| B8 | Rendah | CI | `backend/unit_test.py` (54 cek) tidak dijalankan CI | Rekomendasi |
| C1–C6 | Rendah | dokumen / paritas | Klaim "kriptografis", paritas BKT/retrievability, state global modul, kerja ganda | Catatan |

---

## 3. Temuan tinggi

### A1 — Penyetel kedua tanpa pagar menyetir pemilihan soal

**Di mana.** `features/learner-flow/fiezel-decision-trace.js:316` (`evaluateOutcome`), blok
"BOUNDED SELF-TUNING ENGINE" (`:377` dst.). Dipanggil setiap jawaban dari `app.js:11940`
(pilihan ganda) dan `app.js:12091` (cloze). Nilai yang ditulisnya (`fiezel-live-params-v1`)
dibaca `affectTargetSuccess()` (`app.js:4037`), yang menjadi `targetSuccess` untuk
`FiezelTutorBrain.selectNext` dan kebijakan listening adaptif.

**Mekanika yang terukur.**
- "3 keberhasilan berturut-turut" sebenarnya **kumulatif**: hasil `neutral` (jawaban salah pada
  aksi `continue_practice`) tidak me-reset `consecutivePositives`.
- Salah pertama → aksi `scaffold_hint` → percobaan ulang (satu opsi sudah dimatikan) benar →
  dihitung **positive**. Jadi jawaban salah pun ikut mendorong kenaikan.
- Arahnya hanya naik (+0.02); rollback hanya satu langkah terakhir, lalu `activeChange=null`.
- Tidak ada stat-gate, cooldown sesi, halt, maupun `FiezelParamLedger`; `adaptationHistory`
  tidak masuk hash rantai dan tumbuh tanpa batas.
- Tidak ada penjaga `MEASURE` — jawaban tes penempatan/ujian level ikut menyetel.
- Kunci tidak memakai `sideStateKey()`: satu nilai untuk semua akun & bahasa target di perangkat
  yang sama; `getCanonicalState()` membaca kunci BKT/ledger miskonsepsi **datar**, padahal
  app.js menyimpannya berakun — bagi murid yang login, `isMasteryMilestone` membaca data yang
  salah/kosong.

**Angka** (`tools/dev/...-probe.js` P1; 200 run × 100 jawaban; model belum ikut memudahkan soal,
jadi angka ini *konservatif*):

| Akurasi percobaan pertama | Run yang mentok 0.90 | Median jawaban ke- | Rerata targetSuccess jawaban 51–100 |
|---|---|---|---|
| 0.85 | 100% | 16 | 0.898 |
| 0.80 | 100% | 19 | 0.897 |
| 0.70 | 100% | 23 | 0.894 |
| 0.60 | 100% | 31 | 0.891 |
| 0.45 | 90% | 56 | 0.875 |

**Kenapa ini penting.** Core Brain sendiri menamai p=0.90 sebagai lantai "latihan pemulihan"
(`challengeWindow`), dan temuan censoring Wave F1 justru menyebut murid ditahan terlalu lama di
zona nyaman. Penyetel ini mendorong ke arah yang sama, permanen. Ia juga melanggar tiga aturan
tertulis `docs/BRAINCORE-AUTONOMY-RULES.md`: "Bypassing statistical safeguards" (dilarang),
invarian 5 (rollback ke *baseline*), invarian 6 (ledger tamper-evident untuk setiap perubahan
parameter). `docs/BRAINCORE-CAPABILITY-MATRIX.md` #17 menyebutnya `PROVEN & ACTIVE` dengan
"3 kali benar berturut-turut" dan "langkah ±0.02" — keduanya tidak sesuai kode.

**Yang sudah diperbaiki di PR ini:** hanya bagian reset (B2).
**Rekomendasi (keputusan owner):**
1. *Minimum aman, satu baris:* hentikan penulisan parameter di `evaluateOutcome` (trace dan
   evaluasi outcome tetap berjalan), sehingga `affectTargetSuccess` kembali ke 0.80 bawaan.
2. *Lalu:* bila penyetelan hidup memang diinginkan, jalurnya lewat `FiezelSelfTune` +
   `FiezelParamLedger` (pagar resmi L4) — bukan jalur kedua.
3. Apa pun pilihannya: lewati saat `MEASURE`, pakai `sideStateKey()` untuk kedua kuncinya dan
   untuk bacaan BKT/ledger di `getCanonicalState`.

### A2 — Verdict kebijakan selalu `hold`; outcome sesi terkunci `mixed`

**Di mana.** `evaluatePolicyOutcome` (`app.js:2975`) membandingkan *kandidat = baris sasaran
sesi ini* dengan *kontrol = akumulasi outcome sebelumnya* (`policyControlArm`, `app.js:2960`).
`FiezelStatGate` punya lantai `minNPerArm: 25` (`features/brain/fiezel-stat-gate.js:60`),
sementara ukuran sesi adaptif (satu-satunya yang membawa `policyId`) dijepit 5–16. Kandidat
**tidak pernah** mencapai 25 → verdict selalu
`hold/brain3_stat_hold_underpowered` (probe P2: bahkan 16/16 vs 150/200 dan 3/16 vs 150/200
sama-sama `hold`).

**Akibat.** Kode lalu menulis `hold → status 'mixed', recommendation 'adjust'`. Begitu ada
satu outcome terdahulu pada sasaran yang sama:
- sesi kuat (probe: skor 93, 5/6 benar, selesai 100%) → `mixed`, bukan `positive`;
- sesi buruk (skor < 45) → `mixed`, bukan `negative/reduce_load`;
- jalur `recent_policy_outcome_positive` / `_negative` di `deriveAdaptivePolicy` praktis mati
  sesudah sesi pertama tiap sasaran — kegagalan yang komentar di atas fungsi itu sendiri sebut
  "nyata dan buruk" untuk kasus tanpa riwayat;
- `FiezelSelfTune.propose()` hanya bergerak pada `promote`/`reject` → jalur L4 resmi m025-374
  tidak pernah apply maupun rollback.

`tests/policy-outcome-test.js` tidak melihat ini karena harness-nya tidak memuat
`fiezel-stat-gate.js`/`fiezel-policy-verdict.js` (verdict selalu `null` di sana).

**Rekomendasi (keputusan owner), dua pilihan:**
- (a) `hold` **tidak** menimpa status deskriptif — sejalan dengan kalimat prinsip di komentar
  yang sama ("verdict MENIMPA-nya HANYA saat ia punya cukup bukti untuk berpendapat"); atau
- (b) lengan kandidat diakumulasi lintas sesi di bawah kebijakan/parameter yang sama, sehingga
  n ≥ 25 bisa tercapai.
Keduanya perlu `policy-outcome-test` memuat modul verdict supaya jalurnya teruji.

### A3 — Override self-tune tidak dibaca runtime; rollback tidak memulihkan nilai

- `st.configOverrides` hanya dibaca kembali oleh `selfTuneAfterOutcome` sendiri
  (`app.js:3011`); runtime `targetSuccess` datang dari `FiezelDecisionTrace.readParams()` (A1).
  Jadi walau A2 dibereskan, apply self-tune tidak mengubah apa pun bagi murid.
- Rollback menjalankan `delete cur[...]` (`app.js:3042`) — nilai kembali ke **bawaan**, bukan ke
  `change.to` (= `from` perubahan yang dibatalkan). Setelah dua apply bertumpuk
  (0.80→0.82→0.84) lalu rollback, ledger mencatat 0.82 tetapi nilai efektif 0.80.
  `FiezelParamLedger.effective()` dan konfigurasi hidup tidak lagi sepakat.

Rekomendasi: bereskan bersama A1/A2 — satu sumber parameter hidup, dan rollback menulis
`change.to` alih-alih menghapus.

---

## 4. Temuan sedang/rendah

### B1 — Kartu akar masalah menyebut prasyarat dua kali (DIPERBAIKI)
`app.js` (kartu "Cara FIEZEL menilai") memanggil
`t('progress.kesulitan-kemungkinan-besar-berasal-jadi', {skillName: gejala, skillName: akar})`.
Properti kembar → yang pertama hilang; murid membaca "kesulitan di X kemungkinan besar berasal
dari X". Placeholder diganti `{symptomSkill}`/`{rootSkill}` di id **dan** th; gerbang baru
`tests/i18n-param-collision-test.js` memindai seluruh pemanggilan `t()` (151 berkas) — hanya satu
kasus ini yang ada, dan gerbangnya terbukti merah pada kode lama.

### B2 — Reset progres tidak menghapus kunci decision trace (DIPERBAIKI)
`fiezel-decision-trace-v2` dan `fiezel-live-params-v1` ditulis modulnya sendiri, jadi gerbang
reset R2 (yang membaca `localStorage.setItem` di app.js) buta terhadapnya. Murid yang mereset
mewarisi `targetSuccess` hasil setelan sebelumnya. Keduanya kini dikonstantakan di app.js,
dihapus saat reset, dan R5 mengunci literalnya ke konstanta modul (terbukti merah bila modul
ganti nama kunci). **Belum** ditangani: pemisahan per akun/bahasa (bagian dari A1).

### B3 — `TRANSFERRED`/`RETAINED` lengket di backend (DIPERBAIKI)
`derive_state` memeriksa `transferred_at`/`retained_at` sebelum syarat mastery, dan
`transferred_at` tidak pernah dihapus. Probe: 5 benar + satu soal transfer lalu 10 salah →
posterior 0.206, status tetap `TRANSFERRED` ("Bisa diterapkan di situasi baru") — murid masuk
kelompok pengayaan dan rekomendasi guru. Kini kedua status mensyaratkan mastery yang masih
berlaku; stempel waktunya tetap disimpan sebagai riwayat. Catatan: baris DB yang sudah lengket
baru dihitung ulang pada jawaban berikutnya di kompetensi itu (tidak ada migrasi massal).

### B4 — Hint melunakkan hukuman jawaban salah di backend (DIPERBAIKI)
`bkt_update` menaikkan `slip` untuk setiap hint, termasuk saat jawaban salah — sehingga salah
walau dibantu terbaca sebagai kelalaian. p=0.5: salah tanpa hint → 0.271, salah dengan 2 hint →
0.381, 3 hint → 0.425. Kenaikan slip kini hanya untuk jawaban benar (niat komentar aslinya).

### B5 — Perbaikan T6 `reviewPriority` tidak efektif
Faktor penyelamatan `1 + 1.5·(1−r)` maksimal ×2.5, sedangkan ekor Gauss (σ=0.22) turun ke
~e⁻¹¹. Probe P3: r=0.10 skor 0.0004, r=0.03 skor 0.0001 — di bawah materi yang baru dilihat
(r=0.99, skor 0.32). Gerbang `core-brain-v3-upgrade-test` lolos hanya karena fixture-nya punya
dua item sehat saja ("3 teratas" dari 5). Dampak hari ini terbatas: app memakai hitungan
`atRisk/relearn`, bukan urutan `memory.top`, untuk keputusan. Rekomendasi: suku penyelamatan
aditif (mis. `gauss + k·(1−r)` untuk r<0.35) dan fixture dengan ≥3 item sehat.

### B6 — Peluruhan BKT tidak pernah dipakai runtime
`FiezelMasteryBKT.calculateDecay` teruji, tetapi `masteryGate`/`mastery` dipanggil tanpa `nowMs`
di app.js dan `update()` memulai langkah dari L tersimpan yang belum diluruhkan. Bila decay
kelak disambungkan apa adanya, satu jawaban SALAH setelah jeda 90 hari akan menaikkan mastery
yang tampil dari ~0.30 ke ~0.94 (L lama 0.99 dipakai sebagai titik awal, `lastAt` diperbarui).
Backend sama: `p_mastery_decayed` dihitung, tidak dipakai keputusan, dan ikut tersimpan ke DB
lewat `$set: st`. Rekomendasi: putuskan dulu apakah unlock boleh meluruh (kemungkinan tidak),
tetapi `update()` sebaiknya meluruhkan sebelum melangkah.

### B7 — Catatan GAP guru salah makna (backend)
`coverage_matrix` menulis "{100 − mastery_pct}% murid belum mencapai mastery", padahal
`mastery_pct` adalah rerata posterior, bukan persentase murid. Kelas yang semua muridnya di p=0.55
terbaca "45% murid belum mastery" padahal 100%. Rekomendasi: hitung murid, bukan rerata.

### B8 — Unit test backend tidak di CI
`backend/unit_test.py` (kini 54 cek, termasuk perbaikan B3/B4) hanya jalan manual; butuh
`pip install -r backend/requirements.txt`. Rekomendasi: satu langkah CI Python.

### C — Catatan dokumen & paritas (rendah)
- **C1.** "Cryptographic hash chain" (capability matrix #15, `verifyLedger`) memakai FNV-1a/fmix32
  tanpa kunci: mendeteksi korupsi tak sengaja, bukan pemalsuan (siapa pun bisa menghitung ulang
  hash). `rechain` setelah 500 entri membuat pemotongan tidak terdeteksi (sesuai desain).
  Sebutan yang jujur: "rantai integritas non-kriptografis".
- **C2.** Retrievability klien `2^(−t/h)` (paruh-waktu); backend `e^(−t/S)`; dokumen menulis
  `e^{−t/S}`. Satuan "stabilitas" berbeda faktor ln 2 antara klien dan backend.
- **C3.** Paritas BKT: klien L0 .20 / T .15 / guess .25 / gerbang .95; backend .25 / .18 / .20 /
  .80. Masih terbuka (Tugas 1 di `docs/BRAINCORE-AI-AUDIT-PROMPT.md`).
- **C4.** `fiezel-core-brain.js` menyatakan "tanpa state global", tetapi `setFamilyGraph` /
  `setCurriculumGraph` menyimpan graf di variabel modul; `studyWindows` bawaan memakai
  `new Date(at).getHours()` (bergantung zona waktu perangkat).
- **C5.** `analyze()` menghitung `momentum(attempts)` dan `fatigue(...)` dua kali.
- **C6.** `coverage_matrix`: `and s not in []` adalah kode mati.

---

## 5. Yang terverifikasi sehat

- 38 gerbang Braincore hijau (kemurnian 31 modul, evidence, learner-identity 178/178, policy
  verdict, N-of-1, param ledger, self-tune, core-brain v2/v3, BKT, ledger miskonsepsi,
  kalibrasi item, dst.). Unit backend 50/50 sebelum, 54/54 sesudah PR ini.
- 3PL a=1.5, c=0.25: P(θ=b)=0.625, satu tingkat di bawah 0.863, di atas 0.387 — cocok komentar.
- Cohort telemetri: `crypto.getRandomValues`, fail-closed (tanpa CSPRNG → tanpa cohort), epoch
  14 hari global (rotasi serentak, tidak membocorkan fase per perangkat).
- `FiezelStatGate` fail-safe `underpowered` bekerja sesuai desain — yang salah adalah desain
  lengan pemanggilnya (A2), bukan gerbangnya.
- Kalibrasi item: shrinkage ±0.6, n≥8, zona mati 0.3, pemusatan median — terpagar baik.
- `FiezelParamLedger.verify/rollbackTo/effective` benar secara terpisah.

---

## 6. Keputusan yang menunggu owner

1. **A1:** matikan penulisan parameter di `FiezelDecisionTrace.evaluateOutcome` sekarang? (disarankan)
2. **A2:** `hold` mempertahankan status deskriptif (a), atau lengan kandidat lintas sesi (b)?
3. **A3:** satu sumber parameter hidup — `FiezelSelfTune` + ledger — dan rollback yang memulihkan nilai.
4. **B6:** apakah mastery/unlock boleh meluruh?
5. **B8:** tambah langkah CI Python untuk `backend/unit_test.py`?

---

## 7. Keputusan owner 2026-09-26 dan yang sudah dikerjakan

**A1 — dimatikan.** `FiezelDecisionTrace.evaluateOutcome()` tidak lagi menulis parameter;
`readParams()` selalu mengembalikan bawaan (0.80) dan mengabaikan sisa setelan lama di perangkat
(banyak murid sudah tersimpan 0.90); `affectTargetSuccess()` memakai base tetap 0.80 — satu-satunya
geseran yang tersisa adalah afek sesi berjalan, dan tidak disimpan. Scenario K/K2
(`braincore-living-system-test`) dan Invariant 5/10 (`braincore-runtime-e2e-proof`) ditulis ulang:
Invariant 10 kini membuktikan bukti mengubah soal berikutnya lewat **kemampuan** (2.0 → ≈3.49,
target tetap 0.80, soal yang lebih menantang terpilih), bukan lewat target yang dimudahkan.

**A2 — bukti dikumpulkan lintas sesi.** Satu jendela per sasaran: kandidat = sesi-sesi yang masih
mengumpulkan + sesi ini; kontrol = semua outcome sasaran itu sebelum jendela. Di bawah 25 jawaban
sasaran (lantai `FiezelStatGate`) sesi berstatus `insufficient` / `collect_more_evidence`
("Belum cukup data" / "Perlu lebih banyak latihan dulu") dan kebijakan tetap bertindak atas
penilaian terakhir. Pada ≥ 25 jendela dinilai sekali lalu ditutup: verdict bila ada pembanding
yang cukup, status deskriptif bila belum. Gerbang baru `tests/policy-evidence-window-test.js`
(W1–W9) — satu-satunya gerbang yang memuat stat-gate + policy-verdict bersama app.js.

**Panel Home.** Selama jendela mengumpulkan, Home menampilkan "Hasil latihanmu belum bisa dinilai
— kerjakan N soal lagi di {materi}", bilah kemajuan `n/25`, dan tombol "Lanjut latihan"
(id + th). Panel hilang begitu penilaian keluar.

**Catatan untuk A3.** `sanitizePolicyOutcome` membuang field `verdict` dari riwayat, sehingga
`selfTuneAfterOutcome` selalu menerima `verdict=null` — alasan KETIGA `FiezelSelfTune` diam. Ini
sengaja dibiarkan: satu-satunya langkah self-tune adalah menaikkan `targetSuccess` (soal lebih
mudah) setiap verdict `promote` yang diukur dari akurasi — kelas cacat yang sama dengan A1.
Penyambungannya menunggu keputusan owner tentang ukuran yang tidak bisa "dimenangkan" dengan
memudahkan soal.

**B5 — urutan materi hampir lupa.** Kurva `reviewPriority` kini asimetris: r ≥ 0.75 tetap
Gauss (makin segar makin sia-sia), r < 0.75 turun landai `0.45 + 0.55·r/0.75`. Urutan hasilnya:
ambang lupa > rawan > runtuh (dangkal di atas dalam) > belum jatuh tempo > baru dilihat; ambang
lupa tetap unggul > 1.5×. Dua gerbang lama yang mengunci "materi hilang paling bawah" diubah
sesuai keputusan owner; gerbang B5 baru terbukti merah di rumus lama.

**B6 — model lupa BKT dipakai.** `update()` meluruhkan L ke `nowMs` sebelum melangkah (salah
setelah 90 hari: 0.30 → di bawah 0.5, bukan 0.94). Pembukaan lesson dijaga awet lewat
`gatePassedAt` / `gateEverPassed()` (baris lama yang sudah lolos dicap dari bukti lamanya);
`frontier` memakainya, `rootCause(..., nowMs)` melihat prasyarat yang terlupa. Backend
`apply_attempt` dan `next_best_item` membaca posterior yang sudah meluruh, dan
`p_mastery_decayed` tidak lagi tersimpan ke DB.

**A3 — penyetel resmi disambung, ukurannya diganti (owner: "ganti ukuran dulu").** app.js tidak
lagi memanggil `propose()` (akurasi sesi, satu arah). Jalurnya `FiezelSelfTune.experiment()`:
satu percobaan `difficulty.targetSuccess` ±0.02 pada satu waktu, LESSON dibagi ke lengan
kontrol/kandidat lewat `FiezelNof1.assign`, dan pemutusnya retensi tertunda (probe 3/7/21 hari)
pada lesson yang dikuasai sesudah percobaan dimulai, lewat `FiezelPolicyVerdict`. Percobaan
pertama mencoba lebih sulit; arah sulit diterima bila retensi tidak memburuk (non-inferioritas
5pp), arah mudah hanya bila retensi terbukti lebih baik (superioritas). Kandidat yang membuat
Brier probe naik > 0.05 ditolak; percobaan tanpa putusan 120 hari kadaluwarsa. Setiap mulai,
terima, tolak, dan kadaluwarsa tercatat di `FiezelParamLedger`; state disimpan per murid dan per
bahasa (`sideStateKey`). `affectTargetSuccess()` membaca nilai lesson sasaran dari sini.
Manifest 3.12.0 → 3.13.0 (`nof1` off → active). Gerbang baru `tests/self-tune-retention-test.js`
(M1–M9, A1–A5). Karena probe butuh hari-hari, putusan pertama realistisnya baru keluar setelah
beberapa minggu pemakaian — sebelum itu nilai berlaku tetap 0.80.
