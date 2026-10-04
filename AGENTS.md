# Antigravity Workspace Guidelines for FIEZEL-APPS

## Motion & Video Animation Guidelines (Remotion & Three.js 3D Master)

Whenever the user requests animation, motion graphics, commercial 3D film, or video generation:
1. **Mandatory Master Skill**: Always activate and strictly follow the skill `hollywood-film-choreography`.
2. **Strict User Prohibitions**:
   - ZERO occurrences of forbidden claims: `"100% Gratis"`, `"Latihan Bisa Offline"`, `"CEFR"`, `"JLPT"`.
   - ZERO mascots or characters: NEVER use `"PAW"` or cartoon avatars.
   - ZERO leftover scrap floor text or black voids.
   - ZERO faux bold fonts (strictly weight `800`, never `900` on Plus Jakarta Sans).
   - ZERO cropped text: Always enforce Title & Action Safe Zone margins ($\ge 64\text{px}$ horizontal, $\ge 120\text{px}$ vertical).
3. **Mandatory 5-Act Gemini Choreography**:
   - Act I: Clean logo opening -> damped spring split ($\omega=15, \zeta=0.44$, 25% overshoot) -> 4 UI pills -> Z-axis push-through micro-tunneling.
   - Act II: 3-tier iridescent glow (`#00E5FF` -> `#2979FF` -> `#FFD700`) + 360° trim sweep -> 3D golden curved telemetry ribbon landing at $t=14.5\text{s}$ with shockwave ring.
   - Act III: Dark Eclipse Flip to `#1B1418` (>16:1 contrast) -> coral warning strobe (`#FF3045`) on tab switch -> Hollywood rack focus -> freehand glowing Circle-to-Search gesture around Rian Pratama.
   - Act IV: 25° Dutch Angle macro framing on score 88 -> emerald breathing pulse on WhatsApp CTA -> 3D haptic card fold at $t=43.5\text{s}$.
   - Act V: Singularity implosion at $t=51.5\text{s}$ -> equalizer bar burst on "I" -> two-tone wordmark + "KelasKu untuk Guru" centered at $X=540.0\text{px}$ over daylight travertine quad `bgDay` (`#FDFAF3`).
4. **Mandatory Audio Engineering (EBU R128)**:
   - Voiceover TTS spelled phonetically `"Fizel"` (female educator tone).
   - Zero speech collision: atempo compression (1.10x–1.15x) ensuring $\ge 140\text{ms}$ breathing pockets.
   - Dynamic sidechain ducking: $-8.0\text{ dB}$ bed drop during speech ($150\text{ms}$ attack, $400\text{ms}$ release).
   - Integrated Loudness $-14.0 \pm 0.5\text{ LUFS}$, True Peak $\le -1.5\text{ dBTP}$.
5. **Mandatory Frame-by-Frame Visual Inspection**:
   - NEVER declare video ready based on unit tests alone. Always extract milestone stills via `ffmpeg` ($t=1.0, 2.5, 4.0, 14.5, 22.0, 27.0, 43.5, 58.0\text{s}$) and visually inspect with `view_file` to certify zero cropping, zero slop, and cinematic camera depth.

## Mandatory Protocol: Multi-Character Audio Pipeline for Listening (Chokai) Bank
Whenever creating, regenerating, or updating listening exercises or audio banks:
1. **ZERO Monotone Audio**: DILARANG KERAS merender naskah dialog percakapan dengan satu suara tunggal.
2. **Three Mandatory Personas**:
   - **Instruktor Ujian**: Suara pria dewasa tegas dan berwibawa (`ja-JP-KeitaNeural` pitch `-18Hz`, rate `-4%` atau Gemini `Charon`/`Fenrir`). Membacakan pembuka situasi dan pertanyaan penutup.
   - **Mahasiswa Laki-laki**: Suara pemuda natural (`ja-JP-KeitaNeural` pitch `+4Hz`, rate `+3%` atau Gemini `Puck`).
   - **Mahasiswi Perempuan**: Suara mahasiswi natural dan cerdas (`ja-JP-NanamiNeural` pitch `+3Hz`, rate `+1%` atau Gemini `Aoede`/`Kore`).
3. **Sequential 4-Stage Composition**:
   - Babak 1: Instruksi/Situasi oleh Instruktor (+500ms jeda nafas).
   - Babak 2: Dialog percakapan bergantian antar karakter (+350ms-450ms jeda respon antar giliran).
   - Babak 3: Pertanyaan oleh Instruktor (+1000ms jeda refleksi).
   - Babak 4: Thinking pocket (1.5-2.0 detik buffer jeda hening di akhir).
4. **Execution & CI**: Selalu jalankan pipeline otomatis melalui `tools/chokai-audio-pipeline/` dan pastikan gerbang validasi terpenuhi sebelum rilis.

## Mandatory Protocol: Braincore Engine Authority & Zero-Dumbing Invariant
Setiap agent yang memodifikasi, membuat fitur kuis, evaluasi jawaban, scaffolding pembelajaran, mini-game, atau logika penilaian di FIEZEL:
1. **DILARANG KERAS MENGABAIKAN BRAINCORE (Haram Dumb-Down Logic)**:
   - FIEZEL BUKAN aplikasi kuis statis. Jantung pedagogis FIEZEL adalah **Braincore Engine** (`features/brain/`): BKT (Bayesian Knowledge Tracing), IRT 3PL, OLM (Open Learner Model), FSRS Decay, dan Misconception Ledger.
   - DILARANG KERAS membuat modul/widget terisolasi yang hanya mengandalkan flag boolean statis (seperti `vocabReady = true` atau mock index asal tebak) tanpa terhubung ke pipeline Braincore.
   - Setiap interaksi belajar (baik di kuis reguler, mini-game, maupun cloze/susun kata) WAJIB mengalirkan telemetri nyata ke `updateMastery()`, `bktRecord()`, dan model kemampuan murid.
2. **Zero-Loss Input & Anti-Ghost Answer (Pantangan Memalsukan/Mengarang Jawaban Murid)**:
   - DILARANG KERAS membuang teks/token yang disusun atau diketik murid di layar.
   - DILARANG KERAS memanggil handler `answer()` dengan index pura-pura/fiktif (`q.answerIndex === 0 ? 1 : 0`) yang mengarang kalimat salah yang tidak pernah dipilih murid.
   - Layar umpan balik (*feedback modal*) WAJIB menampilkan secara jujur dan akurat apa yang benar-benar disusun/diketik murid (`q.__userTokenAnswer` / `typed`).
3. **Penyelarasan Pedagogis Total (Haram Memuji Jawaban Salah)**:
   - Jika jawaban murid salah (`ok === false`), DILARANG KERAS menampilkan pujian atau kalimat statis seperti *"Intinya: Susunan kalimat sudah tepat!"*.
   - Umpan balik salah WAJIB menunjuk secara presisi alasan kesalahannya:
     a) Pengecoh bentuk/morfologi yang dipilih (tarik `whyFailsId` / `misconceptionId` dari data distractor template).
     b) Kata yang belum lengkap (sebutkan kata yang masih tertinggal).
     c) Kesalahan urutan sintaksis (tunjukkan pola kalimat yang benar).
4. **Validasi Sintaksis Ketat (Haram Loophole Asal Jumlah Kata)**:
   - DILARANG KERAS meluluskan latihan susun kata/puzzle hanya karena panjang token sama (`|| placedTokens.length >= targetTokens.length`). Evaluasi WAJIB berbasis kecocokan gramatika kalimat target.
5. **Smart Prerequisite Bypass (Haram Menyandera Murid Mahir)**:
    - Gerbang prasyarat (seperti hafalan kosa kata sebelum grammar) WAJIB berkonsultasi ke Braincore BKT/OLM.
    - Jika murid sudah menguasai kosakata prasyarat ($P(L_t) \ge 0.60$ atau `status.isReady`), sistem WAJIB otomatis membuka materi grammar tanpa memaksakan mini-game berulang kali.
6. **Invarian Mode Ujian Bebas Bocoran (Anti-Leak Exam Purity)**:
    - Dalam mode ukur (`cfg.measureMode`, tes penempatan / placement test, atau ujian kenaikan level):
      * DILARANG KERAS memunculkan tombol petunjuk (*hint*), kartu bantuan, popover bocoran, atau tombol intip arti kata.
      * Evaluasi WAJIB murni mengukur kemampuan tanpa bantuan scaffold apapun agar kalibrasi IRT 3PL objektif.
7. **Ketahanan Status Multi-Tab & Sinkronisasi Tanpa Hilang (Zero-Loss State)**:
    - Penyimpanan status di `localStorage` wajib aman dari tab lama yang menimpa tab baru saat murid membuka beberapa jendela peramban.
    - Pipa pengiriman `brainSyncFlush()` dan antrean Braincore attempts wajib dipanggil dan mengalir saat kembali online tanpa batas antrean buntu.

## Mandatory Protocol: Probe-Driven Empirical Audit (Standar Pengujian Empiris Nyata)
Setiap agent yang melakukan audit bug, meninjau penalaran kuis, atau mengevaluasi alur data di FIEZEL:
1. **Dilarang Audit Asumsi Teoretis**: DILARANG KERAS menyimpulkan bug atau kelayakan sistem hanya dari membaca potongan teks kode tanpa bukti eksekusi nyata.
2. **Wajib Probe Headless Playwright**: Setiap temuan WAJIB dibuktikan melalui skrip probe peramban Chromium Playwright (`tools/dev/*probe.js` atau `tests/*probe.js`) yang melakukan klik tombol layaknya murid sungguhan dan membaca `state.history`, `localStorage`, serta basis data IndexedDB secara langsung.
3. **Validasi Dua Arah**: Jalankan probe pembanding sebelum perbaikan dan sesudah perbaikan untuk memastikan solusi terbukti menyelesaikan masalah tanpa regresi.

## Mandatory Protocol: PWA Release Arbiter & Anti-Ghost-Deploy (Wajib Bump Build)
Setiap kali menyelesaikan fitur, perbaikan bug, konten kuis, atau pembaruan UI/UX di FIEZEL:
1. **ZERO Ghost Releases (Pantangan Rilis Hantu)**:
   - DILARANG KERAS menutup sesi atau menganggap pekerjaan selesai tanpa menaikkan nomor build melalui arbiter.
   - Tanpa menaikkan build, `SW_REV` di `sw.js` tidak berubah, Service Worker peramban murid TIDAK akan pernah memperbarui shell cache (`fiezel-shell-*`), dan notifikasi pembaruan ("Pembaruan Tersedia") TIDAK AKAN PERNAH muncul di perangkat murid.
2. **Satu Pintu Resmi (Single Source of Truth)**:
   - SELALU gunakan alat arbiter resmi:
     ```bash
     node tools/bump-build.mjs "<tipe(cakupan): deskripsi ringkas perubahan>"
     ```
   - DILARANG KERAS mengetik atau menyunting manual nomor build di `sw.js`, `core-config.js`, atau `features/neural-voice/fiezel-diag-panel.js`.
3. **Verifikasi Keselarasan 6 Titik (Hexa-Sync Invariant)**:
   - Selalu jalankan pemeriksaan sinkronisasi:
     ```bash
     node tools/bump-build.mjs --check
     ```
   - Pastikan output mencetak `Selaras` untuk 6 titik wajib:
     - `coordination/BUILD-VERSION.json` (`version`)
     - `sw.js` (`SW_REV`)
     - `core-config.js` (`self.FIEZEL_PAGE_BUILD`)
     - `features/neural-voice/fiezel-diag-panel.js` (`var DIAG_BUILD`)
     - `kurikulum.html` (`?v=m025-XXX`)
     - `misi.html` (`?v=m025-XXX`)
4. **Kewajiban Dokumentasi Serah Terima (Mandatory Handoff Dossier)**:
   - Setiap rilis fitur baru, perubahan sistemik, atau audit perbaikan besar WAJIB menyertakan berkas serah terima resmi di `docs/handoffs/FIEZEL-M025XXX-...-HANDOFF.md`.
   - Berkas handoff wajib mendokumentasikan:
     a) Ringkasan temuan audit dan alasan perubahan.
     b) Bukti pengujian empiris (skrip probe Playwright peramban headless).
     c) Daftar seluruh berkas yang disentuh dan perubahannya.
     d) Status kelulusan gerbang mutu lokal dan catatan utang teknis yang tersisa.
5. **Validasi Mutu & Pemantauan CI Sampai Tuntas**:
   - Jalankan uji lokal sebelum commit: `node tests/id-golden-snapshot-test.js`, `node tests/th-ui-leak-test.js`, `node tests/curriculum-cache-version-test.js`, `node tests/gate-registry-test.js`.
   - Stage HANYA berkas yang terkait rilis (patuhi *Git Protection Rule* untuk aset mockup/redesign).
   - Push ke `origin/main` dan pantau alur CI GitHub Actions (`gh run watch <run-id>` untuk *FIEZEL Quality Gate* dan *FIEZEL Deploy Site*) sampai 100% HIJAU.
   - Buktikan situs produksi (`https://fiezel.my.id/app/`) telah menyajikan build baru sebelum melapor ke user.

## Google Stitch Collaboration Rules
When the user brings a Google Stitch design:
1. **Always ask for the code export** (`<>` Code view) first — it's the most reliable handoff method.
2. **Convert HTML/Tailwind to React components** with proper hierarchy, props, and accessibility.
3. **Enhance with animations**: scroll-triggered reveals, micro-interactions, parallax effects.
4. **Organize exports** in `stitch-export/` directory, production code in `website/`.
5. **Be specific in prompts**: Use exact color codes, font weights, spacing values — never "make it beautiful".

## Vibe Coding Best Practices
1. **Image-First Workflow**: Design images FIRST, then animate. Image-to-video gives more control than text-to-video.
2. **Small Iterative Prompts**: Refine one section at a time, not the whole page.
3. **Error-Paste Debugging**: Paste error logs directly back for fixes instead of manual debugging.
4. **Design-First, Code-Second**: Always have a clear visual reference before writing code.

## Git Protection Rule
- **NEVER COMMIT OR PUSH REDESIGN**: Jangan pernah melakukan `git commit` maupun `git push` untuk seluruh aset, berkas, mockup, dan kode redesign ini ke repositori git tanpa perintah tertulis eksplisit dari pengguna. Seluruh hasil kerja tetap berada di lingkungan lokal/preview.
