# m025-148 — Listening exam berhenti menampilkan subtitle skrip saat diputar

m025-147 membangun sesi reading penuh, namun ternyata memicu **isu fatal** di listening exam:
subtitle terjemahan Indonesia ditampilkan saat audio putar, membuat siswa bisa baca jawaban
sambil mendengar.

Ini melanggar prinsip dasar listening exam: siswa harus mengandalkan **pendengaran**, bukan
membaca. Rilis ini menutup keluaran subtitle di listening saja.

**Status: SELESAI di branch, menunggu penerimaan fisik OWNER.**

---

## 1. Masalah yang diperbaiki

**Subtitle bocor ke listening exam.** Sistem `FiezelVoiceSay.say()` selalu memanggil
`prepareSubtitle()` untuk menampilkan terjemahan Indonesia sambil audio berbunyi. Itu wajar
untuk:
- Tutor Classroom (berbicara + terjemahan)
- Library (membaca + terjemahan)

**Tapi fatal untuk listening exam:**
- IELTS dan TOEFL tidak pernah memberikan subtitle
- Subtitle = siswa membaca jawaban, bukan mendengar
- Listening kehilangan validitas sebagai latihan

## 2. Solusi

Tambah tombol `suppressSubtitles: true` ke voice service:

- **FiezelVoiceSay** — cek option; kalau `suppressSubtitles: true`, skip `prepareSubtitle()`
- **Listening items** — pass `suppressSubtitles: true` saat memutar audio
- **Listening exam** — pass `suppressSubtitles: true` saat memutar audio
- **TTS bridge** (skillsLab) — teruskan option dari addon ke voice service

Classroom dan Library tetap menampilkan subtitle Indonesia seperti biasa.

## 3. Bukti

- `listening-exam-test.js`: **28/28 PASS** — 6 exam set, 43 soal.
- `speaking-exam-test.js`: **26/26 PASS** — 11 item, 7 format.
- Subtitle mati hanya untuk listening/listening_exam domain.
- Classroom + Library + tutor tetap menampilkan subtitle.
- Versi naik bersama ke `m025-148`.

## 4. Sisa

- Listening masih satu sesi per ujian. Siswa perlu beberapa sesi untuk berlatih cukup.
- Belum ada mode sesi penuh bertimer. Bacaan cukup sekarang, timer adalah langkah berikutnya.
- Speaking sebelas set, daftar reading sudah panjang.
