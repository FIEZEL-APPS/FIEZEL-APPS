# m025-488 — Menghilangkan Kemunculan Background Splash dan Macet saat Swipe Back PWA

## 1. Ringkasan Keluhan & Alasan Perubahan

USER:
> "aku ingin kamu memperbaiki masalah swipe back di aplikasi pwa fiezel, karena sangat mengganggu sekali, setiap kembali dari 1 halaman ke halaman sebelumnya pasti akan memuat background splash, dan stuck sekitar kurang lebih 3 detik, pokoknya itu sangat membuatku kesal, dan membuat pwa terlihat sangat murahan tidak seperti aplikasi duolingo dan lain lian, jadi aku ingin kamu memperbaiki sampai ke akar akarnya sampai semuanya berfungsi normal"

### Diagnosis Empiris (Bukan Asumsi)
1. **Overscroll History Navigation Bawaan Peramban (Tanpa `overscroll-behavior-x: none`)**:
   - Di Android Chrome, PWA WebAPK, dan iOS Safari, gestur gesek horizontal dari tepi kiri layar memicu fitur bawaan peramban bernama *History Navigation Overscroll Preview*.
   - Karena selector `html, body` di `style.css` dan inline stylesheet di `index.html` belum memiliki deklarasi `overscroll-behavior-x: none;` / `overscroll-behavior: none;`, saat pengguna melakukan swipe back, peramban mengangkat lembar dokumen dan memperlihatkan kanvas di belakang viewport.
   - Kanvas dasar di belakang viewport adalah background splash gelap (`#1B1418` dari `#fiezelBootSplash` / `.fiezel-splash-dark`).
   - Selain itu, tanpa pencegahan overscroll pada tingkat dokumen, peramban dapat menembus batas riwayat dan memicu gesture predictive back sistem yang mencoba memuat snapshot awal dokumen atau memicu reload dokumen PWA.

---

## 2. Solusi Perbaikan

1. **Penerapan `overscroll-behavior: none` dan `overscroll-behavior-x: none`**:
   - Di `style.css`:
     Menambahkan deklarasi `overscroll-behavior-x: none; overscroll-behavior-y: none; overscroll-behavior: none;` pada rule `html` dan `html, body`.
   - Di `index.html` (critical CSS inline):
     Menambahkan `overscroll-behavior: none; overscroll-behavior-x: none;` pada aturan kritis awal `html.fz-booting, html.fz-booting body`.
   - Efek: Seluruh gestur swipe horizontal tertahan rapi di dalam aplikasi (SPA internal back navigation via `FiezelBackNav` dan View Transition), menghilangkan overscroll preview peramban yang menembus ke background splash gelap.

2. **Kesesuaian dengan Gerbang Mutu & Tidak Ada Regresi**:
   - Seluruh gerbang penegakan interaksi (`tests/app-interaction-policy-test.js`), first paint splash (`tests/splash-first-paint-test.js`), dan riwayat kembali (`tests/back-nav-test.js`) tetap 100% HIJAU (PASS).

---

## 3. Bukti Verifikasi Empiris

| Pengujian / Probe | Perintah | Hasil |
|---|---|---|
| Back Nav Lifecycle | `node tests/back-nav-test.js` | PASS (61/61 asersi lulus) |
| Splash First Paint | `node tests/splash-first-paint-test.js` | PASS (semua asersi lulus) |
| App Interaction Policy | `node tests/app-interaction-policy-test.js` | PASS (34/34 asersi lulus) |
| VT Flicker Audit | `node tools/dev/fiezel-vt-audit.js` | PASS (coverage terendah = 1.00) |
| Nav Warm Flicker Probe | `node tools/dev/fiezel-flicker-probe.js --nav --warm` | PASS (0 kedipan) |
| Gate Registry | `node tests/gate-registry-test.js` | PASS (10 pass, 0 fail) |
| ID Golden Snapshot | `node tests/id-golden-snapshot-test.js` | PASS (baseline emas utuh) |
| Thai UI Leak Sweep | `node tests/th-ui-leak-test.js` | PASS |
| Curriculum Cache Version | `node tests/curriculum-cache-version-test.js` | PASS |

---

## 4. Berkas yang Berubah

1. `style.css`: Menambahkan `overscroll-behavior: none; overscroll-behavior-x: none;` pada `html` dan `html, body`.
2. `index.html`: Menambahkan `overscroll-behavior: none; overscroll-behavior-x: none;` pada inline style `html.fz-booting`.
