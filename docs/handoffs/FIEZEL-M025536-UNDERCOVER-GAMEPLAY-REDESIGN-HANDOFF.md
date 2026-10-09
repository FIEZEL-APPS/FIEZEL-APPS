# DOSSIER SERAH TERIMA FIEZEL: M025-536 — REDESIGN TOTAL GAMEPLAY UNDERCOVER v2

## 1. Ringkasan Temuan & Latar Belakang Perubahan
- **Keluhan Pengguna**: "tidak jelas cara mainnya tidak ada petunjuk, siapa yang main duluan dan lain lain, goblok banget sistem gameplaynya, coba kamu lakukan riset duklu, dan redesign ulang gameplay nya... coba lakukan riset di game play di game game lain"
- **Akar Masalah Sistem Lama**:
  1. *Zero Onboarding*: Tidak ada panduan cara main di antarmuka lobby maupun game; murid langsung dilempar ke meja investigasi tanpa mengerti apa peran Warga vs Penyusup.
  2. *Ambiguitas Urutan Giliran*: Slot pemain manusia (`Kamu`) selalu terkunci di indeks 0 dan langsung disodori input tanpa indikator siapa yang bicara pertama, memotong alur menyimak petunjuk lawan.
  3. *Bahasa Inggris Mentah Tanpa Glosarium*: Pilihan dimensi petunjuk hanya menyajikan frasa Inggris teknis tanpa arti bahasa Indonesia, membingungkan murid yang sedang belajar.
  4. *Ketiadaan Panggung Debat*: Permainan langsung loncat dari pengiriman petunjuk ke voting tanpa fase saling lempar argumen atau tuduhan anomali.
  5. *Bug Perspektif Kemenangan*: Evaluasi hasil lama menganggap semua eliminasi sebagai kemenangan Warga, menyebabkan pemain Penyusup yang berhasil mengecoh bot tetap dinyatakan kalah (*Defeat*).

---

## 2. Arsitektur Gameplay FIEZEL Undercover v2 (Hasil Riset 5 Benchmark)
Mengadopsi keunggulan mekanik dari *Undercover* (Yanstar Studio), *Spyfall*, *Jackbox (Faking It)*, *Among Us*, dan *Codenames*:

1. **Panduan Resmi & Aturan Main Terintegrasi (`📖 Cara Main`)**:
   - Modal interaktif 3 kartu: *Peran & Kata Rahasia*, *Urutan Giliran Bergilir*, dan *Debat & Voting*.
   - Menyediakan contoh nyata: `AIRPLANE` vs `HELICOPTER`, serta aturan tebakan balik penyusup (*turnabout guess*).
2. **Timeline Urutan Giliran Nyata & Acak (*Sequential Turn Timeline*)**:
   - Timeline visual di bagian atas arena: `[1. Dimas] ➔ [2. Kamu] ➔ [3. Nadia] ➔ [4. Kevin]`.
   - Pemain aktif mendapat spotlight border emas menyala (`border-amber-400`).
   - Konsol pemain nonaktif (`opacity-30 pointer-events-none`) dengan teks tunggu saat giliran pemain lain berlangsung, memungkinkan murid membaca petunjuk sebelumnya terlebih dahulu.
3. **Sintesis Petunjuk Bilingual (English + Arti Indonesia + Tingkat Risiko)**:
   - Setiap kartu sifat & ciri dilengkapi terjemahan bahasa Indonesia (`Fixed Wings` -> `Sayap Lebar Tetap`, `Needs Runway` -> `Butuh Landasan Pacu`, dll).
   - Badge risiko kebocoran dinamis (*Risiko Bocor: Rendah / Aman / Tinggi*).
4. **Fase Meja Debat & Tuduhan Dinamis (*Dynamic Bot Banter & Player Actions*)**:
   - Bot saling melempar dialog kecurigaan otomatis di meja setelah petunjuk ronde selesai.
   - Pemain memiliki 3 aksi taktis: `🚨 Tuduh Anomali`, `🛡️ Bela Diri`, dan `🔍 Uji Alibi` yang memanipulasi Indeks Anomali lawan secara langsung.
5. **Sidang Eliminasi Transparan & Penilaian Objektif**:
   - Kartu voting merangkum petunjuk dan skor anomali seluruh kandidat.
   - Penyusup yang tertangkap mendapat babak Showdown 10 detik menebak kata Warga.
   - Evaluasi kemenangan sesuai peran asli pemain dan terintegrasi ke telemetri Braincore BKT.

---

## 3. Bukti Pengujian Empiris (Playwright Headless Probe)
Diverifikasi melalui `tests/probe-undercover-redesign.mjs` pada resolusi iPhone mobile (`390 x 844` px, scale 2x):
- Invarian Nol-Scroll (100dvh): Lolos (`winH: 844`, `bodyH: 844`, `fit: true`).
- Uji Modal Aturan: Lolos (muncul dan tertutup mulus tanpa overflow).
- Urutan Giliran 4 Pemain: Tereksekusi berurutan dengan jeda menyimak.
- Sintesis Bilingual & Kirim Petunjuk: Berhasil terekam di dossier meja.
- Fase Debat & Tuduhan: Berhasil mengeksekusi `Tuduh Anomali` dan menaikkan sus lawan ke 85%.
- Voting Sidang & Showdown: Berhasil mengeliminasi penyusup dan mengukur tebakan balik.
- Evaluasi Hasil: `Warga Sukses Mengeliminasi!` dengan telemetri BKT mastery `+0.18`.

---

## 4. Daftar Berkas yang Disentuh & Perubahan
1. `undercover.html`:
   - Modal aturan interaktif (`modal-rules`).
   - Timeline urutan giliran bergilir (`turn-timeline`).
   - Sintesis petunjuk bilingual dengan terjemahan Indonesia dan risiko bocor.
   - Fase debat meja terbuka (`console-phase-2`) dengan dialog dinamis.
   - Perbaikan evaluasi pemenang di `showResult()` sesuai peran pengguna.
2. `tests/probe-undercover-redesign.mjs`:
   - Skrip audit otomatis Playwright 10 tahap dari lobby hingga hasil akhir.
3. Berkas Hexa-Sync (Nomor Build `m025-536`):
   - `coordination/BUILD-VERSION.json` -> `m025-536`
   - `sw.js` -> `m025-536`
   - `core-config.js` -> `m025-536`
   - `features/neural-voice/fiezel-diag-panel.js` -> `m025-536`
   - `kurikulum.html` -> `?v=m025-536`
   - `misi.html` -> `?v=m025-536`
4. `docs/handoffs/FIEZEL-M025537-UNDERCOVER-GAMEPLAY-REDESIGN-HANDOFF.md`:
   - Dokumen serah terima resmi rilis build `m025-536`.
