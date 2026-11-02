# FIEZEL m025-741 Handoff Dossier: Mochi SOS Micro Switch, 10-Gem Wire Confirmation Modal & Reactive Visualizer

**Build Version**: `m025-741`
**Target Release**: Production (`https://fiezel.my.id/app/`)
**Date**: 2026-11-02
**Scope**: `fix(voice): mochi sos micro switch, 10-gem wire confirmation modal & reactive visualizer (m025-741)`

---

## 1. Ringkasan Audit & Alasan Perubahan Sesuai Arahan Pengguna

1. **Redesain Saklar Mikro "Bantuan mochi" (Ultra Compact)**:
   - Sesuai arahan pengguna: *"seharusnya nama saklarnya adalah Bantuan mochi, dan on atau of nya berada dalam kotak hitam saklar itu... kartu saklar bantuan mochinya super sangat besar, kecilkannnnnnnnnnnnnnnn segera"*.
   - Label saklar dikunci menjadi `"Bantuan mochi"`.
   - Teks status `"ON"` atau `"OFF"` berada persis **di dalam kotak hitam saklar** (`#18181B`).
   - Ukuran saklar dirampingkan menjadi mikro (dimensi switch 30px × 16px, total container 97px × 18px), mengeliminasi kontainer putih besar yang menutupi soal kuis.

2. **Sistem Wire Modal Konfirmasi 10 Gem yang Jujur & Terhubung**:
   - Modal popup **HANYA muncul saat saklar ditekan dari posisi OFF**, bukan saat mengetuk avatar Mochi.
   - Desain modal kartu travertine persis referensi pengguna (`media_1793543800938_a70c7b74.png`):
     * Travertine cream card (`#FFFDF7`, border `#FDE047`, radius 24px)
     * Avatar Mochi ber-headphone biru 🎧 di dalam kotak kuning hangat (`#FEF3C7`)
     * Judul `"Bantuan Suara Mochi SOS"` & simbol 💎
     * Deskripsi dinamis menampilkan saldo Gem pengguna saat ini: *"Mochi akan membedah soal ini langsung dengan suara AI Gemini Live. Biaya: 10 Gem (Saldo kamu: {balance} 💎). Bonus Cashback: Jika jawabanmu benar di soal ini, kamu dapat cashback +5 Gem!"*
     * Tombol clay `"Batal"` & `"Gunakan 10 Gem & Mulai"`.

3. **Wire Pemotongan Saldo & Update Topbar Real-Time**:
   - Saat mengklik `"Gunakan 10 Gem & Mulai"`:
     * Saldo Gem langsung terpotong 10 di memori dan state aplikasi (`state.gems.balance -= 10`, ledger tercatat).
     * Counter saldo Gem di topbar (`#quizTopbarGemCount`, `.gem-count`) **seketika langsung berkurang** di depan mata murid secara reaktif tanpa reload.
     * Saklar langsung beralih ke `ON`.

4. **Zero-Delay Voice Greeting (<200ms)**:
   - WebSocket pre-connect (`openHotSocket()`) dipicu di background segera setelah modal terbuka (saat user membaca modal).
   - Sinkronisasi resume `AudioContext` dilakukan langsung di dalam gesture klik konfirmasi user.
   - Sapaan suara Mochi langsung meluncur instan saat tombol diklik tanpa ada jeda 1 detik pun.

5. **Audio Visualizer Reaktif & Berganti Warna**:
   - Visualizer gelombang suara (`#fzMochiVoiceUnder`) di bawah kaki Mochi menyala saat sesi Mochi aktif.
   - **Hijau Emerald (`#10B981`)**: Menyala saat Mochi / AI sedang berbicara.
   - **Merah Coral Glowing (`#FF3045`)**: Otomatis berganti warna saat pengguna berbicara ke mikrofon.

6. **Pembersihan Kode / CSS Menumpuk di Atas**:
   - Menghapus elemen fixed banner galat lama `#fzMochiConnBanner` (`border: 1.5px solid #EF4444`) yang sebelumnya tersangkut di atas kartu soal.
   - Penanganan error dialihkan ke notifikasi `showToast` non-intrusif.

7. **Multilingual Purity**:
   - Terdaftar lengkap di kamus dwibahasa `COPY_ID` & `COPY_TH` (0 kebocoran di tes snapshot emas `id-golden-snapshot-test` & `th-ui-leak-test`).

---

## 2. Bukti Pengujian Empiris (Playwright Headless Probe)

Skrip probe resmi: [`tools/dev/verify-mochi-switch-modal-gem-flow.mjs`](file:///c:/Users/hp/fiezel-apps/tools/dev/verify-mochi-switch-modal-gem-flow.mjs)
- **Stage 1 (Initial OFF)**: Saklar render di pojok kanan atas kartu soal, label `"Bantuan mochi"`, status teks di kotak hitam `"OFF"`, ukuran mikro 97px × 18px.
- **Stage 2 (Modal Open)**: Klik saklar OFF $\rightarrow$ Modal popup travertine muncul dengan avatar Mochi headphone 🎧, saldo dinamis 50 💎, tombol *Batal* & *Gunakan 10 Gem & Mulai*.
- **Stage 3 (Confirmation & Wire Gem)**: Klik *Gunakan 10 Gem & Mulai* $\rightarrow$ Modal tertutup, saldo di topbar langsung berkurang menjadi 40 💎, saklar berubah ke `"ON"`, visualizer gelombang suara muncul, panggilan suara aktif.
- **Stage 4 (Reactive Visualizer Speaking)**: Simulasi user speaking $\rightarrow$ Visualizer berganti ke kelas `.is-user-speaking` berwarna merah coral glowing (`#FF3045`).
- **Stage 5 (Toggle OFF Cleanly)**: Klik saklar kembali $\rightarrow$ Berpindah ke `"OFF"` secara bersih, visualizer tertutup, panggilan diakhiri dengan aman.

---

## 3. Berkas-Berkas yang Disentuh

1. `features/mascot/fiezel-mochi-voice-sos.js`:
   - Redesain `_syncCardToggleUi` dan `mountCardToggle` (label `"Bantuan mochi"`, status `"ON"`/`"OFF"` dalam kotak hitam).
   - Implementasi `showConfirmationModal` (travertine card, avatar headphone, saldo dinamis, hot socket pre-connect, instant topbar gem update, zero-delay greeting).
   - Eliminasi banner `#fzMochiConnBanner`, digantikan dengan `showToast`.
   - Kamus terjemahan `COPY_ID` & `COPY_TH` untuk kunci `mochi-sos.modal-confirm-*`.
2. `id-golden-baseline.json`:
   - Pendaftaran kunci modal konfirmasi baru pada baseline emas.
3. `reports/th-ui-leak-report.json`:
   - Sinkronisasi kamus dwibahasa TH/ID.
4. `coordination/BUILD-VERSION.json`:
   - Kenaikan build ke `m025-741`.
5. `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`:
   - Sinkronisasi Hexa/Octa-Sync ke `m025-741`.

---

## 4. Status Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js` $\rightarrow$ **PASS**
- `node tests/th-ui-leak-test.js` $\rightarrow$ **PASS**
- `node tests/curriculum-cache-version-test.js` $\rightarrow$ **PASS** (33 penegasan)
- `node tests/gate-registry-test.js` $\rightarrow$ **PASS** (10 pass, 0 fail)
- `node tools/bump-build.mjs --check` $\rightarrow$ **PASS** (Selaras)
