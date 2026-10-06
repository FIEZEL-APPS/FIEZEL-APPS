# FIEZEL Handoff Dossier: m025-494 Native Touch Tactile & Haptic Polish

- **Build Version**: `m025-494`
- **Tanggal**: 2026-10-06
- **Cakupan**: Umpan Balik Taktil Natif, Haptic Micro-Tick, dan Polish Transisi Layar
- **Cabang Git**: `feat/m025-494-native-touch-haptic-polish`

---

## 1. Ringkasan Kebutuhan & Desain Solusi

Pengguna menanyakan pengalaman sentuhan pada aplikasi natif saat tombol atau panel ditekan (*"kamu atur aja yang paling cocok dan bagus tapi tidak over"*).

Di aplikasi web/PWA konvensional, tombol navigasi bawah seringkali terasa kaku dan datar seperti hyperlink desktop (tanpa umpan balik fisik). Melalui rilis ini, FIEZEL mengadopsi standar mikro-interaksi aplikasi natif premium (Apple Human Interface Guidelines & Google Material Design 3) secara halus, presisi, dan proporsional tanpa efek berlebihan (*no slop, no gimmicks*):

1. **Haptic Micro-Tick (Web Vibration API)**:
   - Pola getaran `haptic('tap')` dituning menjadi `10ms` (sebelumnya `18ms` terasa seperti getar panggilan masuk). 10ms menghasilkan sentakan taktil instan layaknya Apple Taptic Engine atau Google Pixel Clock Tick.
   - Dipicu otomatis pada pemanggilan eksplisit `go(v, opts)` (perpindahan tab panel).
   - Aman dan berpagar: menghormati `preferences.haptics` dan tidak mengganggu perangkat tanpa motor getar.

2. **Tactile Depress / Squish pada Bottom Nav Tabs (`:active`)**:
   - Selama jari menempel pada tab bawah, tab sedikit tertekan ke dalam (`transform: scale(0.93) translateY(1px)`) dengan transisi cepat `0.08s cubic-bezier(0.2, 0, 0, 1)`.
   - Begitu dilepas dan tab terpilih, ikon melakukan lompatan halus (*spring pop*) `fzNavPop` (0.32s).

3. **Steady Press Feedback untuk Tombol & Opsi Kuis**:
   - Menghapus anomali `@keyframes buttonPress` yang sebelumnya mengembalikan tombol ke ukuran normal di tengah-tengah tekanan jari (`mid-press snap-back`), digantikan dengan state `:active` sejati (`scale(0.975)`).
   - Opsi kuis (`.option`) kini merespons sentuhan dengan kompresi halus `scale(0.98)` sebelum memunculkan status benar/salah.

4. **Asymmetric Apple HIG Cross-Dissolve**:
   - Transisi View Transition diperbarui dengan kurva asimetris:
     - Outgoing view (`::view-transition-old(root)`): `0.14s cubic-bezier(0.4, 0, 1, 1)` (cepat memberi ruang).
     - Incoming view (`::view-transition-new(root)`): `0.18s cubic-bezier(0.16, 1, 0.3, 1)` (meluncur masuk dengan deselerasi mewah).

---

## 2. Bukti Pengujian Empiris (Playwright Headless Probes)

Dieksekusi via `tools/dev/probe-tactile-touch.mjs` dan `tools/dev/probe-flicker-empirical.mjs`:

1. **Haptic Trigger Verification**:
   - Panggilan `window.go("progress")` terbukti mencatat `navigator.vibrate(10)` (durasi tepat 10ms).
2. **Bottom Navigation Press Rule Verification**:
   - Aturan CSS `:active` terbukti aktif pada stylesheet browser:
     `{ transform: scale(0.93) translateY(1px) !important; transition: transform 0.08s cubic-bezier(0.2, 0, 0, 1) !important; }`
3. **Active Icon Spring Pop**:
   - Ikon tab aktif terbukti memicu `animationName: fzNavPop`.
4. **Zero-Flicker Invariant**:
   - `tools/dev/probe-flicker-empirical.mjs`: 73 sampel frame dengan **0 drop opacity di bawah 0.95**, mempertahankan integritas perbaikan m025-493.

---

## 3. Daftar Berkas yang Dimodifikasi

1. `app.js`: Tuning durasi `haptic('tap')` menjadi 10ms dan pengkabelan ke `go()`.
2. `style.css`: Aturan `:active` untuk bottomnav, icon pop, button press, option press, dan kurva asimetris View Transition.
3. `coordination/BUILD-VERSION.json`: Naik ke `m025-494`.
4. `sw.js`: Bump ke `m025-494`.
5. `core-config.js`: Bump ke `m025-494`.
6. `features/neural-voice/fiezel-diag-panel.js`: Bump ke `m025-494`.
7. `kurikulum.html`: Cache query bump ke `m025-494`.
8. `misi.html`: Cache query bump ke `m025-494`.
9. `tools/dev/probe-tactile-touch.mjs`: Skrip probe pengujian taktil.

---

## 4. Status Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js` ➜ **PASS**
- `node tests/th-ui-leak-test.js` ➜ **PASS**
- `node tests/curriculum-cache-version-test.js` ➜ **PASS**
- `node tests/gate-registry-test.js` ➜ **PASS**
- `node tools/bump-build.mjs --check` ➜ **Selaras**
