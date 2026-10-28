# Antigravity Workspace Guidelines for FIEZEL-APPS

## 1. Git Protection Rule & Non-Bypassable PR Policy (ATURAN MUTLAK PERTAMA)
- **WAJIB PULL REQUEST (PR)**: Setiap perbaikan bug, penambahan fitur, atau pembaruan yang akan digabungkan ke branch `main` **WAJIB membuat Pull Request (PR)**. DILARANG KERAS push atau merge langsung ke `main` tanpa melalui PR.
- **NEVER COMMIT OR PUSH REDESIGN**: Dilarang melakukan `git commit` maupun `git push` untuk seluruh aset mockup, prototipe eksperimen, dan kode redesign tanpa perintah tertulis eksplisit dari pengguna. Seluruh hasil kerja awal wajib diverifikasi di lingkungan lokal/preview.
- **MULTI-AGENT CONCURRENCY**: Wajib mematuhi Bagian 12 untuk mencegah tabrakan deploy dan saling timpa nomor build saat beberapa agent aktif bekerja bersamaan.

## 2. Numeric Definition of Done & Anti-Stub Verification (Zero-Potemkin Invariant)
Setiap agent yang mengklaim penyelesaian fitur, kuis, latihan, atau konten pembelajaran:
1. **DILARANG "Potemkin Villages" & Stub Implementations**:
   - DILARANG KERAS membuat data tiruan/stub 1 contoh kerdil (misal: 1 cerita berisi 2 kalimat, 1 tombol bohongan, atau mock data statis) lalu mengklaim fitur selesai.
   - DILARANG "Mock-Passing Illusion": Mengklaim fitur selesai karena unit test Node.js lulus di memori, padahal rantai pemanggilan UI di browser sebenarnya tidak pernah mengeksekusi kode tersebut di layar murid.
   - Fitur pembelajaran baru WAJIB mematuhi **Rule of Three**: minimal 3 entri kurasi lengkap dengan $\ge 4$ adegan/level terstruktur untuk membuktikan sistem bekerja secara modular dan scalable.
2. **Format Laporan Wajib (Quantitative Reporting Table)**:
   - DILARANG menggunakan klaim manipulatif seperti *"mewah"*, *"sempurna"*, atau *"sudah lengkap 100%"* tanpa menyertakan tabel verifikasi kuantitatif:
     `| Item/Fitur | Spesifikasi Target | Aktual Terealisasi | Status |`
3. **Aset Fisik Nyata (Real Asset Invariant)**:
   - Seluruh gambar adegan, audio, atau ikon yang direferensikan dalam kode WAJIB berupa berkas fisik di disk dengan ukuran $>0$ bita (atau SVG inline valid $\ge 150$ bita). DILARANG menggunakan metadata prompt atau URL placeholder palsu.
4. **Gerbang Otomatis Content Integrity**:
   - Setiap rilis konten WAJIB lulus `node tests/content-integrity-gate.js` (memvalidasi volume konten, multi-adegan, kuis miskonsepsi, dan aset fisik).

## 3. Anti-Island Integration & Monolith Bridge Invariant
1. **Haram Menghuni Pulau Terisolasi (Anti-Island Invariant)**:
   - DILARANG KERAS membangun file atau prototype di `features/`, `mockups/`, atau backend tanpa menghubungkannya langsung ke pintu masuk utama murid (`index.html` dan `app.js`).
   - Setiap berkas fitur di `features/**/*.js` WAJIB terdaftar via `<script defer>` di `index.html` dan dapat diakses langsung oleh murid dari antarmuka aktif.
2. **Koneksi Backend Terbimbing & Graceful Offline Fallback**:
   - API luar (`fz-api.js`) wajib memiliki penanganan kegagalan otomatis ke bank data lokal saat offline/lambat tanpa membekukan antarmuka murid.

## 4. Braincore Engine Authority & Zero-Dumbing Invariant
1. **Jantung Pedagogis Braincore**:
   - FIEZEL BUKAN aplikasi kuis statis. Semua interaksi belajar WAJIB mengalirkan telemetri nyata ke Braincore Engine (`features/brain/`): BKT (Bayesian Knowledge Tracing), IRT 3PL, OLM, FSRS Decay, dan Misconception Ledger (`updateMastery()`, `bktRecord()`).
   - Dilarang membuat widget terisolasi dengan boolean statis (`vocabReady = true`) tanpa kalibrasi BKT.
2. **Zero-Loss Input & Anti-Ghost Answer**:
   - DILARANG membuang token yang disusun/diketik murid atau memanggil `answer()` dengan jawaban fiktif yang tidak pernah dipilih murid. Layar evaluasi wajib jujur menampilkan apa yang disusun murid (`q.__userTokenAnswer`).
3. **Penyelarasan Pedagogis Total (Haram Memuji Jawaban Salah)**:
   - Jika jawaban salah (`ok === false`), DILARANG menampilkan pujian. Umpan balik salah WAJIB menunjuk alasan kesalahannya (`misconceptionId` & `failWhy`).
4. **Smart Prerequisite Bypass**:
   - Jika murid sudah menguasai materi/kata prasyarat ($P(L_t) \ge 0.60$ atau `status.isReady`), sistem otomatis membuka modul lanjutan tanpa menyandera murid di mini-game berulang kali.
5. **Invarian Mode Ujian Bebas Bocoran (Anti-Leak Exam Purity)**:
   - Pada mode ukur (`cfg.measureMode`, tes penempatan, ujian kenaikan): DILARANG menampilkan tombol petunjuk (*hint*), kartu bocoran, atau popover arti kata.
6. **Ketahanan Status Multi-Tab & Offline Timezone**:
   - Sinkronisasi `brainSyncFlush()` dan `brainSyncWrite()` wajib mengikat `timezone` klien dan counter `syncAttempts` dengan backoff bertingkat tanpa menghilangkan riwayat percobaan (Zero-Loss State).

## 5. Universal Multi-Device UI/UX & Anti-Blind-Coding Invariant
1. **Dilarang "Blind Coding" (Wajib Uji Visual 2 Mode)**:
   - DILARANG menyimpulkan tampilan rapi hanya dari unit test atau sintaks CSS.
   - Wajib diuji secara visual pada Mobile (`390 × 844 px`) dan Desktop (`1280 × 800 px` / `1440 × 900 px`).
2. **Anti-Void Desktop & Format Split-Screen**:
   - DILARANG mengunci kontainer pada lebar sempit mobile ($480\text{px}-520\text{px}$) di layar monitor desktop yang menyisakan $>50\%$ ruang kosong melompong.
   - Format Desktop dianjurkan format Dua Kolom / Split-Screen (Kolom kiri 40-45% panggung visual/panduan, Kolom kanan 55-60% kartu latihan/interaksi) atau kartu tunggal selebar $\ge 760\text{px}-960\text{px}$.
   - Bilah navigasi samping desktop ($\ge 768\text{px}$) wajib `position: fixed !important; z-index: 100 !important;` selebar 232px.
3. **Batas Rasio Foto & Anti-Cutoff Mobile (Zero-Scroll Thumb Zone)**:
   - Media non-interaktif (foto scene, ilustrasi hero) MAKSIMAL memakan $25-30\%$ tinggi viewport mobile ($\le 180\text{px}$).
   - Seluruh baris kalimat teks, furigana ruby, dan tombol navigasi aksi utama WAJIB 100% tampak di atas lipatan layar pertama (*above-the-fold*).
4. **Validasi Kontras Komputasi ($\ge 4.5:1$)**:
   - DILARANG menggunakan teks putih (`#FFFFFF`) pada wadah berlatar terang. Elemen daylight wajib menggunakan warna charcoal tegas (`#0F172A`).
5. **Keselarasan Selektor CSS & Body Tag**:
   - Pastikan rute di `app.js` mendaftarkan kelas body di `renderInner()` (misal: `fz-view-kana`, `fz-view-story`, `fz-stage-home`).

## 6. PWA Release Arbiter & Anti-Ghost-Deploy (Wajib Bump Build)
1. **Satu Pintu Resmi (Single Source of Truth)**:
   - SELALU gunakan arbiter resmi: `node tools/bump-build.mjs "<tipe(cakupan): deskripsi ringkas>"`
   - DILARANG menyunting manual versi di `sw.js`, `core-config.js`, atau `fiezel-diag-panel.js`.
2. **Verifikasi Keselarasan 6 Titik (Hexa-Sync)**:
   - Jalankan `node tools/bump-build.mjs --check` dan pastikan 6 titik selaras (`BUILD-VERSION.json`, `sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`).
3. **Dokumentasi Handoff Wajib**:
   - Setiap rilis fitur/audit sistemik wajib menyertakan dokumen handoff di `docs/handoffs/FIEZEL-M025XXX-...-HANDOFF.md`.
4. **Anti-Deployment Theatre (Verifikasi Fisik Bita Server)**:
   - DILARANG percaya buta badge hijau CI. Periksa log: jika "Secret belum terpasang — NOL bita berpindah", itu SKIP bukan PASS.
   - Buktikan bita endpoint produksi: `curl.exe -s https://fiezel.my.id/app/coordination/BUILD-VERSION.json` cocok dengan versi commit terbaru.

## 7. Zero-Mock Cold-Boot Audit & First-Touch Serenity
1. **Probe Cold-Boot Murni (Zero-Storage)**:
   - Uji alur pengguna baru wajib menggunakan browser context murni (empty localStorage, tanpa manipulasi state paksa).
   - Gerbang kelulusan: `#app` tidak kosong, onboarding tampil nyata, zero 404 pada aset, bebas pembekuan auth guard.
2. **Zero-Modal Collision & First-Touch Serenity**:
   - DILARANG memunculkan >1 pop-up/modal bersamaan saat aplikasi dibuka pertama kali. Tunda izin notifikasi, login Google, dan banner update hingga pengguna menyelesaikan latihan selamat datang pertama.
3. **Duolingo-Parity Retention Standard**:
   - DILARANG "The Hostile Exam Ambush" (menjebak pemula ke 12-25 soal grammar kaku di menit pertama).
   - Terapkan Dual-Gate: Jalur Pemula langsung ke Quick-Win First Lesson (<45 detik), Jalur Menengah menjalankan tes adaptif ringkas 3-5 soal terkalibrasi IRT 3PL.

## 8. Fast-Track PWA Screenshot & Probe-Driven Audit
1. **Pengambilan Screenshot Kilat**:
   - Jalankan runner resmi Playwright:
     `node tools/dev/quick-screenshot.mjs --view=<home|kana|chat|vocab|grammar|story> --device=<mobile|desktop>`
   - Screenshot preview diambil seketika untuk evaluasi pengguna sebelum menjalankan proses CI PR.
2. **Probe-Driven Empirical Audit**:
   - Dilarang membuat kesimpulan dari asumsi teks kode tanpa probe Playwright Chromium (`tools/dev/*probe.js`).

## 9. Multi-Character Chokai Audio Pipeline
1. **Tiga persona suara wajib**: Instruktor Ujian (`ja-JP-KeitaNeural` -18Hz), Mahasiswa Laki-laki (`ja-JP-KeitaNeural` +4Hz), Mahasiswi Perempuan (`ja-JP-NanamiNeural` +3Hz).
2. **Urutan 4 babak**: Situasi/instruksi -> dialog bergantian kasual -> pertanyaan instruktur -> buffer jeda hening.

## 10. Motion, Video & Google Stitch Guidance
1. **Video & Motion**: Selalu rujuk dan aktifkan skill `hollywood-film-choreography` untuk standar broadcast EBU R128 (-14 LUFS), 5-Act Gemini kinetics, dan zero-slop frame inspection.
2. **Google Stitch**: Ekspor via `<>` Code view, transformasikan ke komponen modular bersih, dan integrasikan langsung ke kode produksi.

## 11. AI Voice Studio Entrypoint Purity & True Mitra Kaiwa Invariant (Haram Menghapus Voice Studio)
1. **Pintu Masuk Resmi Kawan Bicara / Mitra Kaiwa Studio (`call.html`)**:
   - `call.html` adalah sub-aplikasi resmi FIEZEL (paket Vite/React terisolasi) yang menjadi tuan rumah AI Voice Call Studio, Gemini Live WebSockets (`wss://fiezel.my.id/api/live-call`), audio ducking, duplex interruption, dan maskot resmi 3D Volumetric Daifuku Mochi Three.js (`mochi-mascot/fiezel-mochi.js`).
   - Kawan Bicara (`state.view === 'chat'`) WAJIB me-mount `call.html` ke `#app` melalui `#fzMitraKaiwaStudioFrame` lengkap dengan sinkronisasi bahasa (`lang`), token nonce aman (`StudioBridge`), dan parameter build (`?v=m025-XXX`).
   - DILARANG KERAS merombak atau mengganti `call.html` dengan obrolan teks usang tahun 2026. Fitur Kawan Bicara adalah AI Voice Studio interaktif dua arah.
2. **Eliminasi Total Maskot PAW Kucing Kuning Lama**:
   - DILARANG KERAS memunculkan kembali gambar atau aset maskot kucing kuning PAW lama di layar mana pun (baik di Kawan Bicara, latihan kuis, onboarding, maupun home).
   - Seluruh avatar dan visualisasi maskot WAJIB menggunakan Mochi (3D WebGL Three.js companion atau render resmi Mochi).
3. **Haram Menyelubungi Fitur Native Lain di Balik Iframe Bohongan (Anti-Duplicate Wrappers)**:
   - Modul pembelajaran native (Kana, Kanji, Vocab, Grammar, Reading, Writing, Story) WAJIB me-render langsung ke `#app` via DOM native dan DILARANG dibungkus ke dalam iframe tiruan.

## 12. Multi-Agent Concurrency & Zero-Collision Deployment Protocol (Protokol Anti-Tabrakan Antar-Agent)
Di lingkungan di mana beberapa agent bekerja secara simultan di workspace dan repositori yang sama, setiap agent WAJIB mematuhi protokol anti-tabrakan berikut:

1. **Mandatory Isolated Git Worktree (Haram Bekerja Bersama di Root Directory)**:
   - DILARANG melakukan pengeditan berkas rilis langsung di root workspace `c:\Users\hp\fiezel-apps` jika ada agent lain yang sedang aktif bekerja atau ada perubahan tak berkomitmen milik pengguna.
   - Setiap agent WAJIB membuat worktree terisolasi di direktori saudara:
     ```bash
     git worktree add ../fiezel-<topik>-<agentShortId> -b feat/<topik>-m025-XXX origin/main
     ```
   - Seluruh siklus edit, unit test, build-bump, dan commit dijalankan 100% di dalam worktree tersebut, menjaga root workspace tetap steril.

2. **Pre-Bump Concurrency Probe (Pencegahan Tabrakan Nomor Build)**:
   - DILARANG berasumsi nomor build berikutnya hanya `origin/main + 1`.
   - Sebelum menjalankan `bump-build.mjs`, agent WAJIB memeriksa PR terbuka milik agent lain:
     ```bash
     gh pr list --repo FIEZEL-APPS/FIEZEL-APPS --state open --json number,title,headRefName
     ```
   - Jika ada PR terbuka yang mengklaim versi `m025-699`, maka agent yang baru WAJIB mengklaim versi di atasnya (`m025-700`). Tidak boleh ada dua PR aktif dengan nomor build yang sama.

3. **Sequential Merge Queue & Deploy Interlock (Antrian Tunggal Merge ke Main)**:
   - DILARANG menggabungkan (merge) PR ke `main` saat pipeline `FIEZEL Quality Gate` atau `FIEZEL Deploy Site` milik agent lain sedang berjalan di branch `main`.
   - Periksa alur kerja aktif sebelum merge:
     ```bash
     gh run list --repo FIEZEL-APPS/FIEZEL-APPS --branch main --limit 3
     ```
   - Jika ada run yang sedang `in_progress`, agent WAJIB menunggu hingga statusnya `completed` dan terbit di server produksi. Menggabungkan PR saat deploy sedang berjalan akan memicu *race condition* pada Service Worker cache (`sw.js`) dan berisiko menimpa berkas rilis dengan aset lama.

4. **Mandatory Fast-Forward / Rebase Sebelum Merge**:
   - Jika ada agent lain yang berhasil merge ke `main` lebih dulu, PR milik agent yang tertinggal WAJIB di-rebase atau diselaraskan dengan commit terbaru `origin/main`:
     ```bash
     git fetch origin main && git rebase origin/main
     ```
   - Selaraskan kembali nomor build jika versi sebelumnya sudah terpakai oleh agent yang mendahului.

5. **Post-Release Teardown Hygiene**:
   - Setelah PR berhasil dimerge dan bita server terverifikasi via `curl.exe`, agent WAJIB membersihkan worktree lokalnya:
     ```bash
     git worktree remove ../fiezel-<topik>-<agentShortId>
     ```

6. **Pre-PR Rebase & Conflict-Free Invariant (Haram PR Berstatus CONFLICTING)**:
   - Sebelum membuka PR atau meminta merge, agent WAJIB melakukan:
     ```bash
     git fetch origin main && git rebase origin/main
     ```
   - Periksa status mergeable PR:
     ```bash
     gh pr view <nomor-pr> --json mergeable
     ```
   - DILARANG membiarkan PR berstatus `"CONFLICTING"`. Jika `main` telah diperbarui oleh PR lain, PR yang tertinggal WAJIB langsung di-rebase di atas commit `origin/main` terbaru.

## 13. Zero-Crash DOM Defensive Guard & Null-Dereference Invariant
1. **Defensive Guard pada Seluruh Handler DOM Global**:
   - Seluruh fungsi pengendali dialog/DOM global (`openModal()`, `closeModal()`, `setApp()`, `syncNavActivePill()`, dll.) WAJIB memeriksa keberadaan elemen target sebelum manipulasi:
     ```javascript
     const modal = $('modal');
     if (!modal) return;
     modal.classList.remove('hidden');
     ```
   - DILARANG KERAS memanggil `.classList.add/remove()`, `.setAttribute()`, atau `.focus()` langsung tanpa *null guard*.
   - Kegagalan dialog atau perubahan elemen DOM tidak boleh melempar `TypeError: Cannot read properties of null (reading 'classList')` yang dapat membekukan *event loop* antarmuka murid.

## 14. Route & View-Reachability Purity (Haram Dangling Views di `VALID_VIEWS`)
1. **Integritas Penyelarasan Rute**:
   - Setiap rute yang terdaftar di `VALID_VIEWS` (`app.js`) WAJIB memiliki fungsi tampilan yang valid dan aktif di `renderInner()`.
   - DILARANG menambahkan nama view ke `VALID_VIEWS` tanpa implementasi fungsi render aktif.
   - DILARANG meninggalkan alias view usang atau eksperimen mati yang tidak memiliki pintu masuk pengguna yang sah (mencegah kegagalan *view-reachability gate* di CI).

## 15. All-Point Query String & Cache Version Alignment (Octa-Sync Invariant)
1. **Penyelarasan Query Param Seluruh HTML**:
   - Selain 6 titik resmi Hexa-Sync, seluruh berkas HTML turunan (`call.html`, `features/voice-studio/call.html`, dll.) yang memuat berkas CSS atau JavaScript dengan query string `?v=m025-XXX` WAJIB diselaraskan dengan nomor build kanonikal.
   - Setiap rilis WAJIB lulus verifikasi:
     ```bash
     node tests/curriculum-cache-version-test.js
     ```
   - DILARANG menyisakan aset dengan parameter query versi lama yang dapat memicu serving aset basi dari cache service worker peramban murid.

## 16. State Initialization & Persistence Invariant (Zero-Undefined State)
1. **Inisialisasi Penuh Pasca Onboarding**:
   - Alur onboarding pengguna baru WAJIB menginisialisasi seluruh state inti secara utuh sebelum murid diarahkan ke layar Home:
     - `state.level = 1;`
     - `state.placementDone = true;`
     - `state.streak = 1;`
     - `state.gems = state.gems || { balance: 120 };`
   - Data state WAJIB diikat dan disimpan ke `localStorage` melalui `save()`.
   - DILARANG melepaskan murid ke layar Home dengan nilai `state.level === undefined` atau state parsial yang merusak render dashboard kurikulum dan menjebak murid ke dalam *infinite onboarding loop*.
