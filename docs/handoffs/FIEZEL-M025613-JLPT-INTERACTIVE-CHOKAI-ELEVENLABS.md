# FIEZEL m025-613: 5 Persona Vokal ElevenLabs & Tiga Fitur Interaktif Chōkai (聴解)

Wewenang: USER REQUEST. Status: **SELESAI & TERVERIFIKASI EMPIRIS**.
Build: `m025-613` (Hexa-Sync Selaras).

---

## 1. Ringkasan Pekerjaan & Latar Belakang

Sesuai arahan eksplisit pengguna, bank soal listening bahasa Jepang (Chōkai / 聴解) FIEZEL dinaikkan kelasnya secara menyeluruh:
1. **Audio Pipeline Multi-Persona ElevenLabs**:
   - 30 butir soal listening JLPT (N5 & N4 Mondai 1 s.d. 4) di-render ulang secara penuh menggunakan 5 Persona Vokal Resmi ElevenLabs untuk mencegah kebosanan suara monoton (*Zero Monotone Audio Mandate*).
   - Persona yang terpasang:
     - `INSTRUCTOR` (Ryu - `D3L9PtKnIVJXdgK444Ey`): Pembaca nomor soal, situasi awal, dan pertanyaan akhir dengan wibawa formal.
     - `MALE` (Sora - `4sirbXwrtRlmPV80MJkQ`): Mahasiswa/pemuda natural untuk dialog teman sebaya.
     - `FEMALE` (Aki - `ngvNHfiCrXLPAHcTrZK1`): Mahasiswi/pemudi cerdas natural untuk dialog teman sebaya.
     - `MALE_SENIOR` (Akio - `eRD4wLHoHH7P30TZIexm`): Tokoh pria dewasa/senior (tenchou/manajer toko, dokter, dosen).
     - `FEMALE_SENIOR` (Chieko - `xE6NbKmUvY3BhBzNAYsV`): Tokoh wanita senior (ibu/okaasan, pemilik kos/ryouchou).
2. **Implementasi 3 Fitur Interaktif Chōkai**:
   - **Furigana Tri-State Toggle (Bantuan Baca Kanji)**: Segmented switcher 3-mode (`ふりがな` ruby rt untuk pemula, `漢字` kanji asli tanpa furigana untuk puritas ujian JLPT, `Romaji` subtitle latin).
   - **Interactive Turn Seeking (Lompat Menit Percakapan)**: Murid dapat mengklik baris percakapan atau pill timestamp (`[ ▶ 00:03 ]`) pada Bottom Sheet Drawer untuk langsung melompat ke detik karakter tersebut berbicara, dilengkapi sinkronisasi highlight karakter aktif (`speaking-now`).
   - **Mode Ujian Resmi Berbatas Waktu (Timed Exam Simulator)**:
     * Audio dibatasi hanya dapat diputar 1 kali (`replayCount >= 1` terkunci).
     * Hitung mundur timer live per butir soal (45 detik untuk Mondai 1 & 2; 30 detik untuk Mondai 3 & 4) dengan animasi denyut peringatan saat $\le 10$ detik dan penyerahan otomatis ke ledger Braincore saat waktu habis.
     * **Anti-Leak Exam Purity**: Bottom sheet drawer dan tombol naskah dinonaktifkan/dikunci total selama mode ujian untuk mencegah kebocoran jawaban.

---

## 2. Bukti Pengujian Empiris (Playwright Headless Browser)

Pengujian dilakukan melalui probe browser Chromium tanpa asumsi teoretis (`tests/jlpt-interactive-features-probe.js`):
- **Modal Listening JLPT**: Terbuka mulus via `openListeningPanel()`.
- **Furigana Tri-State Toggle**:
  - Mode `ruby`: Memverifikasi kehadiran tag `<ruby>` dan `<rt>` pada teks soal kanji (`がくせい` di atas `学生`, `ほん` di atas `本`).
  - Mode `kanji`: Furigana tersembunyi, teks kanji bersih sesuai standar lembar soal JLPT JEES asli.
  - Mode `romaji`: Subtitle alfabet romaji muncul di bawah teks kanji.
- **Interactive Turn Seeking**:
  - Drawer terbuka, terdeteksi seluruh giliran dialog dengan pill timestamp.
  - Klik `#jlptTurn_1` berhasil melompatkan audio dan mengaktifkan kelas visual `.speaking-now`.
- **Mode Ujian Berbatas Waktu (Exam Mode)**:
  - Tombol `#jlptExamToggleBtn` mengaktifkan banner timer `#jlptExamTimerBanner` dengan hitung mundur aktif (`00:43`).
  - `#jlptSheetTriggerBtn` terkunci total (`disabled` dan berkelas `.locked`).
- **Bukti Visual Tangkapan Layar**:
  - Tersimpan di `reports/audit-listening-detail/04-jlpt-interactive-exam-probe.png`.

---

## 3. Daftar Berkas yang Disentuh

| Berkas | Perubahan |
|---|---|
| `features/speaking-listening/audio-jlpt/*.mp3` (30 berkas) | Seluruh audio Chōkai 30 soal di-render ulang dengan 5 persona vokal ElevenLabs |
| `features/speaking-listening/jlpt-listening-bank-v1.json` | Penambahan `turnTimestamps` per dialog dan `questionRomaji` |
| `features/speaking-listening/fiezel-jlpt-listening.js` | Mesin furigana ruby, turn seek handler, timer ujian, sinkronisasi audio |
| `features/speaking-listening/jlpt-listening.css` | Gaya UI segmented control, banner timer ujian berdenyut, turn seek pills |
| `index.html` | Struktur `.jlpt-controls-bar` dan `#jlptExamTimerBanner` di modal listening |
| `features/i18n/copy-id-bahasa.js` & `copy-th-bahasa.js` | 11 kunci i18n dwibahasa untuk kontrol furigana dan mode ujian |
| `id-golden-baseline.json` | Pembaruan snapshot baseline emas |
| `tools/chokai-audio-pipeline/multi-voice-engine.mjs` | Integrasi TTS ElevenLabs prioritas utama |
| `tools/chokai-audio-pipeline/speaker-router.mjs` | Penambahan persona `MALE_SENIOR` dan `FEMALE_SENIOR` |
| `tests/jlpt-interactive-features-probe.js` | Skrip probe empiris Playwright headless |
| `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `coordination/BUILD-VERSION.json` | Kenaikan versi build `m025-613` via arbiter |

---

## 4. Status Gerbang Mutu Lokal

- `node tests/th-ui-leak-test.js`: **PASS** (4.402 kunci id sepadan th, 0 kebocoran).
- `node tests/id-golden-snapshot-test.js`: **PASS** (Baseline emas utuh).
- `node tests/curriculum-cache-version-test.js`: **PASS** (26 penegasan selaras `m025-613`).
- `node tests/gate-registry-test.js`: **PASS** (10 pass, 0 fail).
- `node tests/chokai-multi-voice-protocol-test.js`: **PASS** (30 soal, 139 turns, 16 dialog multi-karakter).
- `node tests/jlpt-sheet-drawer-test.js`: **PASS**.
- `node tests/course-persistence-and-jlpt-mobile-test.js`: **PASS**.
- `node tests/jlpt-interactive-features-probe.js`: **PASS**.
