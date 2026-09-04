# Core Brain v2 — Bukti Adaptivitas

**Build:** m025-148 · **Tanggal:** 2026-08-24 · **Status:** terverifikasi di runtime browser

Dokumen ini menjawab satu pertanyaan: **apakah Core Brain benar-benar mengubah keputusan
mengikuti murid, atau hanya menghitung angka yang tidak dipakai?**

Jawabannya: mengubah. Buktinya di bawah, dan sengaja ditulis sebagai angka yang bisa
dibantah, bukan sebagai klaim.

---

## 1. Verifikasi runtime (browser, bukan Node)

Ini pemeriksaan yang paling menentukan, karena modul yang lulus tes di Node tetap bisa
tidak tersambung sama sekali di aplikasi.

```
brainLoaded ............ true
schema ................. fiezel-core-brain-v2
curriculumGraphSize .... 139 lesson
build .................. m025-148
```

Titik sambungnya nyata di `app.js`:

| Lokasi | Peran |
|---|---|
| [app.js:700](app.js:700) | `coreBrainAvailable()` — pagar keberadaan modul |
| [app.js:775](app.js:775) | `analyze()` dipanggil dari snapshot belajar |
| [app.js:957](app.js:957) | `applyCoreBrain()` membungkus kebijakan v1 |
| [app.js:963](app.js:963) | `buildAdaptivePolicy()` — jalur yang benar-benar dipakai sesi |
| [app.js:998](app.js:998) | graf kurikulum 139 lesson disuntikkan saat boot |

Artinya v2 **melapisi** v1, tidak menggantikannya: kalau modul gagal dimuat, `applyCoreBrain`
mengembalikan kebijakan v1 apa adanya dan aplikasi tetap berjalan.

---

## 2. Momentum benar-benar mengubah keputusan

Tiga murid dengan **kemampuan nyaris identik** (2.57 – 2.66), dibedakan hanya oleh ARAH
belajarnya. Kalau momentum hanya hiasan laporan, ketiganya akan mendapat kesulitan yang sama.

| Riwayat | slope | r² | Ability | Kesulitan | Kode alasan |
|---|---|---|---|---|---|
| Membaik | +0.105 | 0.96 | 2.639 | **D3** | `brain_trend_improving` |
| Mandek | 0.000 | 0.00 | 2.661 | **D2** | `brain_trend_plateau` |
| Memburuk | −0.105 | 0.96 | 2.566 | **D1** | `brain_trend_declining` |

Ability berselisih < 0.1, tetapi kesulitannya berselisih **dua tingkat penuh**. Inilah yang
tidak bisa dilakukan kebijakan berbasis rata-rata: bagi rata-rata, ketiga murid ini sama.

---

## 3. Pagar keyakinan benar-benar memagari

| Bukti | confidence | `brain.applied` | Yang terjadi |
|---|---|---|---|
| 0 jawaban | 0.00 | **false** | v2 diam, kebijakan v1 dipakai utuh |
| 60 jawaban | 1.00 | **true** | v2 mengambil alih kesulitan & ukuran sesi |

Di bawah ambang 0.25, v2 hanya menempelkan ringkasannya untuk layar diagnostik dan tidak
mengubah satu pun keputusan. Model yang percaya diri di atas tiga jawaban lebih berbahaya
daripada tidak ada model.

---

## 4. Kelelahan memperpendek sesi

Riwayat yang sama, hanya ditambah 16 jawaban terakhir yang **lebih lambat (2.5s → 7s) DAN
lebih sering salah**:

```
tanpa sinyal lelah ..... size 12   fatigue: fresh
dengan sinyal lelah .... size  6   fatigue: fatigued
                                   codes: ...|brain_cognitive_load
```

Sesi terpotong separuh, dan alasannya terbaca. Syarat dua sinyal itu disengaja: melambat
saja bisa berarti murid sedang berpikir lebih dalam.

---

## 5. Simulasi 35 hari — tiga kurva belajar

`adaptivity-simulation.js` menjalankan tiga murid dari titik awal yang sama (ability 1.5),
7 sesi/minggu selama 5 minggu.

| Murid | Kurva | Ability akhir | Level | Akurasi | Kesulitan akhir |
|---|---|---|---|---|---|
| Cepat | 1.3× | 5.56 (+4.06) | C2 | 95% | D5–D6 |
| Normal | 1.0× | 2.92 (+1.42) | B1 | 84% | D2–D3 |
| Lambat | 0.7× | 1.26 (−0.24) | A1 | 67% | D1 |

Yang penting bukan angka akhirnya (itu ditentukan oleh kurva yang aku tetapkan), melainkan
bahwa **jalur soalnya berbeda**: murid cepat dinaikkan bertahap D1→D6, murid lambat ditahan
di D1 dan tidak pernah dipaksa naik. Predicted success ketiganya tetap di pita 70–85%.

---

## 6. Catatan jujur tentang metode

Percobaan pertama dengan deret sintetis **keliru**: pola `i%10 < ambang` menghasilkan gigi
gergaji, dan momentum membacanya `plateau` untuk ketiga kasus. Itu cacat pola ujiku, bukan
cacat kodenya — terbukti setelah diulang dengan deret monoton bersih (tabel §2). Dicatat di
sini supaya tidak ada yang mengulangi kesalahan yang sama dan menyimpulkan ada bug.

---

## 7. Batas yang masih berdiri

> **Pembaruan Wave D (2026-08-28):** tabel asli di bawah (ditulis pada build m025-148,
> 2026-08-24) **BASI** dan dipertahankan hanya sebagai konteks sejarah — angka yang berlaku
> ada di §7.1. Diverifikasi ulang penuh oleh audit D2
> (`/home/user/workspace/d-findings/D2-content-contamination.md`).

| Hal | Jumlah (2026-08-24, basi) | Dampak |
|---|---|---|
| Soal listening masih Inggris | ~~842~~ → lihat §7.1 (nyatanya 100% MCQ) | Sedang — murid bingung pada pertanyaannya |
| Pilihan listening masih Inggris | ~~1.091~~ → lihat §7.1 (satuan keliru) | Sedang |
| Pilihan reading masih Inggris | ~~1.050~~ → lihat §7.1 (kini 1.024) | Sedang |
| Reading `evidence_mismatch` | ~~170~~ → **0 hari ini**, lihat §7.1 | Rendah — pra-ada, terdokumentasi |

### 7.1 Pembaruan Wave D — hitung ulang 2026-08-28 (audit D2)

**Metode hitung:** logika resmi `audit/bank-audit.js` dijalankan ulang pada 2026-08-28 di
branch `audit-wave-d` (salinan skrip di luar repo, repo tidak tersentuh), direplikasi
independen dengan Python (hasil identik), plus `content-qa-agent.js` dipanggil via
`auditContent()` (murni baca). Artefak mesin: `/home/user/workspace/d2-recount-results.json`
dan `/home/user/workspace/d2-BANK-SOAL-AUDIT-today.json` (daftar id lengkap per temuan).
Laporan penuh: `/home/user/workspace/d-findings/D2-content-contamination.md`.

| Hal | Angka lama (§7) | Angka 2026-08-28 | Catatan |
|---|---|---|---|
| Soal listening berbahasa Inggris | 842 | **1.200 dari 1.200 MCQ (100%)** | 842 tereproduksi persis, tapi itu batas bawah detektor: `looksEnglish()` menuntut ≥2 kata fungsi Inggris, sehingga 240 soal gist (`"What is X mainly talking about?"`, hanya 1 marker) lolos. Dengan detektor yang dikoreksi, seluruh MCQ listening berbahasa Inggris; satu-satunya yang Indonesia adalah instruksi dictation (207 item) |
| "Opsi" listening Inggris | 1.091 | **1.091 item** dengan ≥1 opsi EN (**2.772 string opsi**) | Angka tereproduksi persis; satuan di tabel lama menyesatkan — itu jumlah ITEM, bukan jumlah string opsi |
| Pilihan reading Inggris | 1.050 | **1.024 soal** dengan ≥1 opsi EN (3.011 string opsi) | Turun 26 sejak laporan lama karena bank berubah. Sebagian opsi EN adalah kutipan verbatim teks (materi target yang sah) — lihat pemilahan di laporan D2 |
| Reading `evidence_mismatch` | 170 | **0** | Nol menurut ketiga definisi kanonik: `content-qa-agent.auditContent()` (PASS, 0 blocker), logika `bank-audit.js`, dan replikasi independen. Angka 170 adalah blocker pra-ada (m025-125) yang sudah diperbaiki (`audit/repair-reading-bank.js`); butir ini SELESAI, bukan batas lagi — jangan lagi menerapkan diskon κ pada item yang sudah sehat |
| Listening tanpa penjelasan | (tidak tercatat) | **1.407 (semua item)** | Batas baru yang tidak ada di tabel lama: tidak satu pun item listening punya `explain` — murid salah tidak pernah tahu kenapa |

Angka 2026-08-28 di atas adalah potret **pagi hari sebelum perbaikan Wave D** — fixer
listening (D13) dan reading (D12) sedang mengeksekusi perbaikannya paralel dengan penulisan
pembaruan ini; angka pasca-perbaikan diverifikasi pada gate integrasi, bukan di sini.

**Konsekuensinya untuk adaptivitas:** model kesulitan hanya sebaik label kesulitan soalnya.
Selama sebagian soal masih berbahasa Inggris, sebagian "salah" yang terekam adalah salah
karena tidak paham pertanyaannya, bukan karena tidak paham materinya — dan itu masuk ke
estimasi kemampuan sebagai bukti yang menyesatkan.

**Karena itu:** grammar (100% Indonesia, ~~129~~ 139 template per audit D9 2026-08-28,
`/home/user/workspace/d-findings/D9-grammar-quality.md`) adalah domain yang paling layak
dipercaya sekarang. Listening dan reading masih perlu penyelesaian terjemahan.

---

## 8. Cara mengulang verifikasi ini

```bash
node core-brain-v2-test.js        # 31 gate keputusan
node core-worker-contract-test.js # kontrak protokol 1.7
node adaptivity-simulation.js     # tiga kurva belajar, 35 hari
```

Untuk probe runtime, jalankan server lokal lalu di konsol browser:

```js
window.__fiezelCoreBrainSnapshot()   // potret utuh murid saat ini
window.FiezelCoreBrain.curriculumGraphSize()
```

---

## 9. Langkah berikutnya, berurut manfaat

1. **Selesaikan terjemahan listening** (~~842 pertanyaan + 1.091 pilihan~~ — per hitung ulang
   2026-08-28 di §7.1: nyatanya 1.200/1.200 soal MCQ; sedang dikerjakan fixer Wave D untuk
   A1/A2 lebih dulu) — ini yang paling merusak kualitas bukti belajar.
2. ~~**Perbaiki 170 `evidence_mismatch` reading** — jawaban yang tidak ada di bacaan.~~
   **Selesai** — 0 mismatch per hitung ulang 2026-08-28 (lihat §7.1).
3. **Pakai sendiri 2 minggu di grammar saja**, lalu baca `__fiezelCoreBrainSnapshot()`:
   apakah ability naik, apakah momentum terbaca, apakah kesulitan bergerak.
4. Baru setelah itu bandingkan dengan v2 dimatikan, kalau memang ingin angka pembanding.
