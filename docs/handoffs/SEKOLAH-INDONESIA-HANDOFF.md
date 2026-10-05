# Fitur Sekolah Indonesia 2026 — handoff

Wewenang: OWNER, 5 Oktober 2026. Rencana induk: `docs/STRATEGI-SEKOLAH-INDONESIA-2026.md`
(delapan rekomendasi R1–R8). Keputusan owner: **fitur ini dibangun dalam bahasa Indonesia
saja**. Naskahnya di `features/i18n/copy-id-sekolah.js`; utang th tercatat bertanggal di
`UTANG_TANPA_TH` (`tests/th-coverage-test.js`, domain `sekolah`).

## R1 — Kelas Tanpa HP (m025-478)

Masalah: HP murid dibatasi di sekolah (Jabar 2025, DKI dan SE Kemendikdasmen 2026), padahal
FIEZEL hanya bisa dipakai lewat HP murid.

| Bagian | Berkas |
|---|---|
| Inti murni: soal tugas, varian A/B, lembar cetak, nilai kertas, pemanasan | `features/teacher/fiezel-kelas-tanpa-hp.js` (`FiezelKelasTanpaHP`) |
| Tombol "Cetak lembar soal" + "Nilai kertas" di kartu tugas; modal & form nilai kertas; tombol "Mulai pemanasan 5 menit" di Mode Papan; layar pemanasan | `features/teacher/fiezel-teacher-shell.js` (`warmup`, `paperScoresModal`, `case 'print-sheet'`, `warm-*`) |
| Gaya | `features/teacher/teacher-shell.css` (blok `R1 Kelas Tanpa HP`) |
| Gerbang | `tests/kelas-tanpa-hp-test.js` |

Kontrak:
1. **Varian B berbiji dari id tugas.** Cetak ulang besok = lembar yang sama dengan hari ini;
   jangan ganti biji dengan `Date.now()`.
2. **Semua teks soal lewat `esc()`.** Soal tulisan guru adalah input bebas dan lembar dibuka
   di jendela baru milik origin yang sama.
3. **Nilai kertas tidak menimpa hasil aplikasi.** Hasil dari aplikasi membawa bukti per soal
   (`w[]`) yang dibutuhkan pemanasan dan BrainCore; satu angka dari kertas lebih miskin.
   Hasil kertas ditandai `src:'kertas'` dan boleh dikoreksi.
4. **Pemanasan tanpa nama murid** dan daftarnya dibekukan saat dibuka (`ui.warm`).

## R2 — Rapor KKTP (m025-478)

Masalah: rekap memakai "KKM 75" yang sudah tidak dipakai Kurikulum Merdeka, dan guru menulis
deskripsi capaian rapor satu per satu.

| Bagian | Berkas |
|---|---|
| Inti murni: KKTP kelas, tingkat per TP, nilai akhir, deskripsi, CSV e-Rapor | `features/teacher/fiezel-rapor-kktp.js` (`FiezelRaporKKTP`) |
| KKTP menggantikan 0.75/“KKM 75” di rekap, CSV, cetak rekap, kartu remedial; tombol & modal "Rapor KKTP" | `features/teacher/fiezel-teacher-shell.js` (`kktpKelas`, `raporKktpModal`, form `rapor-kktp`) |
| Gerbang | `tests/rapor-kktp-test.js` |

Kontrak:
1. **KKTP milik kelas** (`c.kktp`, 50–95%, bawaan 75%). Tidak ada angka ambang tertanam lagi.
2. **TP dengan < 5 jawaban tidak diberi tingkat** ("Belum cukup data"). Rapor dokumen resmi.
3. **Deskripsi memakai rumusan tujuan dari bank** (`SKILLS[k].objective`), tidak pernah kode
   keterampilan.
4. **Suntingan guru disimpan** di `c.raporEdits` dan menang atas deskripsi otomatis di CSV.
   Mengubah KKTP menyusun ulang deskripsi (suntingan lama dibuang karena tingkatnya berubah).

## R3 — Jalur Membaca TKA (m025-478)

Masalah: Bahasa Inggris di TKA SMA diuji lewat membaca (tekstual, inferensial, evaluatif),
sedangkan bank ujian membaca FIEZEL hanya 8 bacaan.

| Bagian | Berkas |
|---|---|
| 3 keterampilan (`tka_tekstual`, `tka_inferensial`, `tka_evaluatif`) + 16 bacaan × 3 = 48 soal, kunci tersebar rata 12/12/12/12 | `features/learner-flow/fiezel-review-bank.js` (`TKA_ORDER`, `TKA_ITEMS`) |
| Kartu "Latihan Membaca TKA" + peta kesiapan jujur (tanpa prediksi nilai) + sesi 6 soal | `features/learner-flow/fiezel-learner-flow.js` (`tkaMarkup`, `startTka`, `case 'start-tka'`) |
| Guru bisa menugaskan keterampilan TKA | `fiezel-teacher-store.js` (`TKA_SKILLS`), modal tugas di shell, `bankSkills()` di class hub |
| Gerbang | `tests/tka-membaca-test.js` |

Kontrak:
1. **TKA di luar `SKILL_ORDER`.** `SKILL_ORDER` menggerakkan tes diagnostik (5 soal), rencana
   harian, risiko, dan laporan murid ke guru. Memasukkan TKA ke sana mengubah semuanya untuk
   seluruh murid.
2. **Kunci tidak boleh menumpuk di satu huruf.** Soal baru ditulis lalu diacak berbiji;
   `tests/tka-membaca-test.js` T4 menjaga sebarannya.
3. **Peta kesiapan bukan prediksi.** Status hanya muncul setelah 6 soal per level; tidak ada
   angka peluang lulus.

## R4 — Tugas berbeda per murid (m025-478)

Masalah: contekan PR di grup WA berbentuk "1B 2C 3A", juga jawaban hasil AI yang disalin.

| Bagian | Berkas |
|---|---|
| Urutan soal (non-ujian) dan urutan pilihan (soal bank) per murid, berbiji dari id tugas + nama murid | `features/class-hub/fiezel-class-hub.js` (`variantSeed`, `optionPerm`, `optionButtons`, `startRunner`) |
| Gerbang (menjalankan fungsi asli lewat vm) | `tests/tugas-varian-test.js` |

Kontrak:
1. **Yang diacak hanya tampilan.** `data-i` tetap indeks pilihan asli, jadi `w[]`, miskonsepsi
   per pengecoh, pemanasan R1, dan rapor R2 tidak berubah.
2. **Stabil per murid.** Murid yang membuka ulang tugasnya melihat urutan yang sama.
3. **Soal tulisan guru tidak diacak pilihannya** ("A dan B benar" bergantung pada urutan).
   Guru bisa mematikan pengacakan per tugas dengan `variant:false`.
4. Ini **mempersulit**, bukan mustahilkan, contek: murid masih bisa menyalin teks jawaban.

## R5 — Kalibrasi soal lintas murid: Analisis Butir Soal (m025-478)

Temuan: kalibrasi kesulitan lintas murid tingkat aplikasi **sudah ada dan menyala**
(`FiezelItemPool`, `ITEM_POOL_ENABLED = "on"`, mode klien `'on'`, job harian
`braincore-item-pool.yml`) — tetapi hanya untuk soal grammar aplikasi utama, dan guru tidak
pernah melihat hasilnya. R5 karena itu tidak membangun mesin kedua; ia memberi guru kalibrasi
tingkat KELAS yang memang diwajibkan: analisis butir soal.

| Bagian | Berkas |
|---|---|
| Inti murni: tingkat kesukaran p, daya beda D (27% atas vs bawah), fungsi pengecoh, rekomendasi, CSV | `features/teacher/fiezel-analisis-butir.js` (`FiezelAnalisisButir`) |
| Tombol "Analisis butir" di kartu tugas, modal tabel, unduh CSV | `features/teacher/fiezel-teacher-shell.js` (`analisisButirModal`, `case 'butir-csv'`) |
| Gerbang | `tests/analisis-butir-test.js` |

Kontrak:
1. **Hanya hasil aplikasi** (punya `w[]`) yang dihitung; nilai kertas dilaporkan sebagai dilewati.
2. **Daya beda butuh ≥ 10 murid**; di bawahnya "Belum cukup murid", bukan angka.
3. D negatif = **periksa kunci jawaban** (kelompok bawah lebih sering benar daripada atas).

Belum: perluasan `FiezelItemPool` ke soal bank KelasKu/latihan murid/TKA (butuh prediksi saat
penyajian di runner KelasKu dan learner-flow — pekerjaan BrainCore tersendiri).

## R6 — Paket tugas offline (m025-478)

Temuan: tugas dari guru SUDAH tersimpan di HP setelah ditarik dan bisa dikerjakan tanpa sinyal.
Yang bocor ada di arah balik: satu laporan membawa paling banyak 8 tugas (`ASSIGN_MAX`) dan
server MENIMPA laporan lama. Murid yang menyelesaikan 12 tugas tanpa sinyal kehilangan 4 hasil
paling lama — gurunya tidak pernah menerimanya, dan murid mengira sudah mengumpulkan.

| Bagian | Berkas |
|---|---|
| Kotak keluar hasil yang belum dikonfirmasi server (`assignOutbox`, maks. 60), dikirim 8 per laporan, paling lama dulu, jeda 16 detik | `features/learner-flow/fiezel-learner-flow.js` (`outboxAdd`, `assignForReport`, `pushToClass`) |
| Status untuk murid: "N tugas tersimpan di HP" + "N hasil menunggu sinyal" | `offlineMarkup` + `.lf-offline` di `learner-flow.css` |
| Server menggabungkan tugas laporan baru dengan yang tersimpan (maks. 40) | `workers/api/teacher/class-sync-core.js` (`mergeAssign`), `workers/api/route-class-sync.js` |
| Gerbang | `tests/paket-offline-test.js` |

Kontrak:
1. **Yang dilepas dari kotak keluar hanya yang persis terkirim** (id + `at` sama). Hasil yang
   dikerjakan ulang sesudah laporan berangkat tetap menunggu.
2. **Jeda antarkiriman ≥ lantai server** (`LEARNER_MIN_INTERVAL_MS` 15 dtk); gerbang O3 menjaganya.
3. **Server: hasil selesai (`t > 0`) tidak dikalahkan status "sedang dikerjakan"**; sesama jenis
   yang lebih baru menang.

## R7 — Latihan bicara privat (m025-478)

Masalah: murid SMP takut salah dan malu berbicara bahasa Inggris di depan teman. Latihan bicara
yang ada (`speaking-bank-v1.json`, 36 butir A1–C2) memakai ambang lulus — tepat untuk ujian,
tetapi bagi murid yang malu, "belum lulus" adalah alasan untuk berhenti mencoba.

| Bagian | Berkas |
|---|---|
| Bank 25 topik A1–A2 × 6 latihan = 150 (tirukan → ganti kata → jawab sendiri), umpan balik "sudah terdengar / coba lagi", kemajuan lokal, layar | `features/speaking-listening/fiezel-bicara-privat.js` (`FiezelBicaraPrivat`) |
| Tab "Bicara privat" + kartu ajakan "Malu bicara bahasa Inggris?" di rencana | `features/learner-flow/fiezel-learner-flow.js` (`render`, `planView`) |
| Gaya | `features/learner-flow/learner-flow.css` (blok R7) |
| Gerbang | `tests/bicara-privat-test.js` |

Kontrak:
1. **Tanpa angka.** `cocokkan()` tidak mengembalikan skor, persen, atau lulus; layar tidak
   menampilkan persen. Murid sendiri yang menandai "sudah lancar".
2. **Tanpa rekaman dan tanpa kiriman.** Tidak ada `MediaRecorder`, `fetch`, atau `reportToClass`
   di modul; transkrip pengenal suara hanya hidup di layar. Yang disimpan hanya peta `lancar`
   di `localStorage` (`fiezel-bicara-privat-v1`). Guru tidak melihat apa pun dari sini.
3. **Jalan tanpa pengenal suara dan tanpa internet** (dengar contoh → ucapkan → nilai sendiri).
4. **Bank lama tidak disentuh.** `speaking-bank-v1.json` dikunci jumlahnya dan dibangun ulang
   oleh `tools/dev/rebuild-speaking-listening-data.js`; bank privat sengaja terpisah.

## R8 — Kapasitas dan kepatuhan AI (m025-478)

Dua dokumen keputusan: `docs/KAPASITAS-SEKOLAH.md` dan `docs/KEPATUHAN-AI-SEKOLAH.md`.

| Bagian | Berkas |
|---|---|
| Alat hitung kapasitas yang membaca ritme polling & plafon AI dari kode | `tools/kapasitas-sekolah.mjs` |
| Penjagaan AI terpusat: selama kunci ujian/tugas, hanya AI penilai yang lewat | `app.js` (`AI_TASKS_SAAT_DINILAI`, `aiTaskBlockedByLock`, baris pertama `askFiezelAIResult`) |
| Tugas LATIHAN dari guru ikut mengunci AI; kabar terkunci menyebut tugas vs ujian | `fiezel-class-hub.js` (`startRunner`), `app.js` (`examLockNotice`) |
| Label "Dibuat oleh AI" untuk jawaban yang benar-benar dari AI | `app.js` (Tanya FIEZEL, pembimbing), `fiezel-coach-bubble.js`, `fiezel-library-ui.js`, `.ai-label` di `learner-flow.css` |
| Gerbang | `tests/kepatuhan-ai-sekolah-test.js` |

Kontrak:
1. **Penjagaan di jalan ke model, bukan hanya di pintu.** Pintu baru yang memanggil
   `askFiezelAI*` otomatis ikut terkunci; menambah tugas ke `AI_TASKS_SAAT_DINILAI` hanya untuk
   AI yang MENILAI karya murid, tidak pernah untuk yang membantu menjawab.
2. **Label hanya untuk jawaban AI sungguhan.** Jawaban terdegradasi (`degraded:true`) dan
   jawaban mesin lokal tidak diberi label AI.
3. **Tabel di `KAPASITAS-SEKOLAH.md` = keluaran alat.** Mengubah ritme polling atau plafon
   neuron membuat gerbang C1 merah sampai tabelnya ditempel ulang.

Temuan untuk owner (belum dikerjakan, keputusan biaya/perilaku): paket gratis Cloudflare sudah
lewat pada 250 murid aktif 30 menit/hari; plafon neuron AI cukup untuk ±88 murid; polling
undangan Panggung Suara (tiap 12 dtk untuk semua murid) adalah ±⅓ permintaan.

Ikut diperbaiki: `tests/class-hub-test.js` tidak lagi bergantung pada urutan soal (sejak R4
urutannya berbiji dari id tugas yang lahir acak, jadi tes itu kadang merah).

## Gerbang Thai yang disesuaikan (keputusan owner, bertanggal)

- `tests/th-coverage-test.js`: `UTANG_TANPA_TH` + `['sekolah', { sejak: '2026-10-05' }]`.
- `tests/teacher-i18n-lazy-test.js` dan `tests/th-ui-leak-test.js`: kunci `sekolah.*` dikecualikan
  dari tuntutan th **hanya selama** entri utang di atas ada. Anggaran literal th-ui-leak naik
  untuk `fiezel-review-bank.js` (1→15, naskah soal TKA), `fiezel-teacher-shell.js` (7→8), `fiezel-rapor-kktp.js` (baru, 3: kepala kolom CSV e-Rapor), dan
  `fiezel-analisis-butir.js` (baru, 2: kepala kolom CSV).
- `tests/teacher-lazy-load-test.js`: bundel guru boleh memuat modul `features/teacher/` di antara
  kurikulum dan shell; urutan kurikulum-pertama/shell-terakhir tetap dijaga.

## Belum dikerjakan

Semua R1–R8 sudah punya wujud kode atau dokumen keputusan. Lanjutan: R6 belum punya "paket mingguan" dengan tanggal buka per tugas; guru masih mengirim tugas satu per satu. Bank TKA target ≥ 60 bacaan; sekarang 16. Pemetaan TP ke Capaian Pembelajaran Fase D resmi belum
ada: TP saat ini = keterampilan yang dilatih kelas.
