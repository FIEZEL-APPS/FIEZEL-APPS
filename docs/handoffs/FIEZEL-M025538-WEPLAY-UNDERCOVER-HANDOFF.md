# FIEZEL HANDOFF DOSSIER: WEPLAY PARTY UNDERCOVER GAMEPLAY DUPLICATION (m025-538)

- **Tanggal & Waktu**: 2026-10-10 03:15 WIB
- **Nomor Build**: `m025-538`
- **Branch**: `feat/weplay-party-undercover-m025-538`
- **Tujuan**: Duplikasi dan adaptasi penuh gameplay pesta ikonik WePlay (*Who is the Spy / 谁是卧底*) ke dalam modul `undercover.html` di FIEZEL.

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan analisis gameplay game party WePlay (*Who is the Spy*), versi sebelumnya dari `undercover.html` terasa kaku layaknya papan interogasi statis dengan sedikit interaksi antar pemain. Murid menginginkan pengalaman pesta yang hidup, seru, dan dinamis ala WePlay dengan elemen-elemen khas:
1. **Kursi Mic Meja Bundar (Round Table Mic Seats)**:
   - 4–6 kursi pemain berbentuk melingkar (#1 sampai #4/#6) lengkap dengan avatar, nomor kursi, dan indikator suara.
   - Efek riak gelombang suara aktif (`mic-speaking-ring`: animasi keyframe gelombang ganda cyan/amber) saat giliran bicara berlangsung.
2. **Balon Percakapan Langsung (Direct Speech Bubbles)**:
   - Balon dialog dengan ekor panah mengarah ke bawah (`speech-bubble`) langsung muncul di atas kursi avatar pembicara, bukan di kotak teks terpisah.
3. **Pembukaan Kartu Rahasia 3D (3D Card Flip Opening)**:
   - Sentuhan awal 3D flip card (`flip-card-inner.is-flipped`) untuk mengungkap peran ("WARGA" / "PENYUSUP" / "SI POLOS") dan kata rahasia sebelum memasuki meja.
   - Kata rahasia dapat diintip kembali sewaktu-waktu melalui tombol header atas.
4. **Interaksi Meja & Pelemparan Hadiah (Table Banter & Gifting Tray)**:
   - Mengetuk avatar bot/pemain lain memunculkan tray interaksi cepat: 🥚 Telur Busuk, 🍅 Tomat, 🌹 Mawar, 🔍 Tuduh (*Sus*), ☕ Kopi.
   - Partikel mengapung (`animate-float-gift`) disertai audio synthesizer Web Audio API (`splat`, `sparkle`, `whoosh`).
5. **Meja Diskusi Bebas & Seruan Cepat (Free Debate & Quick Shouts)**:
   - Setelah ronde petunjuk, fase debat memungkinkan reaksi cepat: 🚨 Tuduh Anomali, 🛡️ Bela Diri, 🔍 Uji Alibi, 😂 Santai Dulu.
6. **Pemungutan Suara Tiket Meja (Round Table Ticket Voting)**:
   - Tombol `[VOTE]` interaktif di tiap kursi tertuduh, dengan lencana tally suara real-time (`🗳️ X Suara`).
7. **Synthesizer Web Audio API Murni (Zero-Asset Arcade Sound)**:
   - Bebas dependensi berkas suara eksternal, beroperasi 100% offline di Service Worker PWA murid (tap chime, speech chirp, splat, sparkle, vote tap, victory fanfare).
8. **Invarian 100dvh Zero-Scroll Mobile**:
   - Seluruh elemen antarmuka pas dan presisi pada viewport mobile `390 x 844 px` tanpa scrollbar body/html.

---

## 2. Bukti Pengujian Empiris (Playwright Headless Probe)

- **Skrip Probe**: `tests/probe-weplay-undercover.mjs`
- **Perangkat Target**: iPhone 14 (`390 x 844 px`, DPR 2, sentuhan aktif)
- **Hasil Eksekusi**:
  - Invarian 100dvh Zero-Scroll: PASS (844px exact).
  - 3D Flip Card Reveal Modal: PASS (`is-flipped` true).
  - Turn Passing & Clue Synthesis: PASS.
  - Speech Bubble Pop with downward arrow: PASS.
  - Interactive Table Gifting: PASS (tray open, projectile float).
  - Debate Room & Quick Shouts: PASS.
  - Ticket Voting & Real-time Tallies: PASS.
  - Showdown & Result Telemetry: PASS (+42 XP, BKT +0.18).
  - Console Errors: 0.

---

## 3. Daftar Berkas yang Disentuh & Perubahan

1. `undercover.html`:
   - Penulisan ulang antarmuka menjadi WePlay Party Room dengan palet ungu neon, kursi mic bundar, 3D card opening, tray lempar hadiah, seruan debat, dan voting tiket.
2. `tests/probe-weplay-undercover.mjs`:
   - Skrip audit otomatis Playwright untuk memvalidasi alur lengkap dan menangkap bukti tangkapan layar.
3. `coordination/BUILD-VERSION.json`:
   - Peningkatan versi ke `m025-538`.
4. `sw.js`:
   - Sinkronisasi `SW_REV = 'm025-538'`.
5. `core-config.js`:
   - Sinkronisasi `self.FIEZEL_PAGE_BUILD = 'm025-538'`.
6. `features/neural-voice/fiezel-diag-panel.js`:
   - Sinkronisasi `var DIAG_BUILD = 'm025-538'`.
7. `kurikulum.html` & `misi.html`:
   - Sinkronisasi query param cache buster `?v=m025-538`.

---

## 4. Status Kelulusan Gerbang Mutu Lokal

- **ID Golden Snapshot Test**: `HIJAU: baseline emas Indonesia utuh` (0 fail).
- **TH UI Leak Test**: `PASS` (3993 kunci id punya padanan th).
- **Curriculum Cache Version Test**: `OK curriculum-cache-version: 26 penegasan, 2 halaman, build m025-538`.
- **Gate Registry Test**: `FIEZEL gate registry: PASS (10 pass, 0 fail)`.
- **Hexa-Sync Arbiter**: `Selaras` untuk 6 titik wajib.
- **Utang Teknis**: Nol. Seluruh perilaku zero-scroll dan audio Web Audio diverifikasi empiris.
