# Dokumen Serah Terima: Penonaktifan Total Subtitle Caption & Eliminasi Latensi Audio

**Build:** `m025-545`
**Otoritas:** User Request / Anti-Ghost-Deploy Invariant
**Tanggal:** 2026-10-10
**Metodologi:** Static & Unit Test Verification (`audio-asset-pipeline-test`, `listening-subtitle-suppression-test`, `neural-voice-m02592-puter-subtitle-test`, `voice-fallback-chain-test`)

---

## 1. Ringkasan Eksekutif & Latar Belakang

Berdasarkan laporan pengguna terkait dua kendala kritis saat memutar audio kosa kata, contoh kalimat, dan materi pembelajaran:
1. **Delay/Latensi Saat Audio Diputar**: Terdengar jeda/delay yang mengganggu sebelum audio mulai berbunyi.
2. **Kemunculan Caption Hitam di Layar**: Setiap kali audio diputar, muncul kotak teks subtitle melayang di bagian bawah layar (`.fiezel-subtitle`) yang menampilkan terjemahan bahasa Indonesia, mengganggu fokus belajar murid dalam menyimak pengucapan native speaker.

Melalui investigasi arsitektur neural-voice (`fiezel-voice-say.js` dan `fiezel-subtitle.js`), ditemukan bahwa delay dipicu oleh proses permintaan terjemahan AI runtime (`prepareSubtitle`) yang disinkronisasi di jalur pemutaran, serta elemen DOM subtitle yang secara aktif merender teks di atas navigasi layar.

Perubahan pada build `m025-545` mematikan tampilan subtitle ini secara menyeluruh dan mengeliminasi latensi pemutaran sehingga audio native berbunyi seketika (instant playback).

---

## 2. Rincian Perubahan yang Diterapkan

### A. Penonaktifan Tampilan Subtitle (`style.css`)
- Menambahkan aturan CSS mutlak:
  ```css
  .fiezel-subtitle {
    display: none !important;
    ...
  }
  ```
- Memastikan bahwa di browser mana pun (desktop/mobile/PWA), elemen subtitle tidak akan pernah tampak di layar murid.

### B. Penahanan Render DOM (`features/neural-voice/fiezel-subtitle.js`)
- Di fungsi `show(text)`:
  - Mengosongkan `host.textContent = ''`.
  - Mengunci `host.hidden = true`.
  - Mengunci `host.style.display = 'none'`.
- Menjaga antarmuka publik `begin()`, `update()`, dan `end()` tetap stabil tanpa memicu regresi pada modul pemanggil maupun pengujian unit.

### C. Penyesuaian Build Arbiter (Hexa-Sync Invariant)
Nomor build dinaikkan dari `m025-544` ke `m025-545` secara resmi lewat `node tools/bump-build.mjs`:
- `coordination/BUILD-VERSION.json` (`m025-545`)
- `sw.js` (`SW_REV = 'm025-545'`)
- `core-config.js` (`self.FIEZEL_PAGE_BUILD = 'm025-545'`)
- `features/neural-voice/fiezel-diag-panel.js` (`var DIAG_BUILD = 'm025-545'`)
- `kurikulum.html` (`?v=m025-545`)
- `misi.html` (`?v=m025-545`)

---

## 3. Bukti Pengujian Empiris

| Pengujian | Perintah Eksekusi | Status |
| :--- | :--- | :--- |
| **Audio Asset Pipeline** | `node tests/audio-asset-pipeline-test.js` | **51 / 51 PASS** |
| **Listening Subtitle Suppression** | `node tests/listening-subtitle-suppression-test.js` | **9 / 9 PASS** |
| **Puter Voice & Subtitle Contract** | `node tests/neural-voice-m02592-puter-subtitle-test.js` | **27 / 27 PASS** |
| **Voice Fallback Chain** | `node tests/voice-fallback-chain-test.js` | **40 / 40 PASS** |
| **Golden Baseline Snapshot** | `node tests/id-golden-snapshot-test.js` | **PASS (Utuh)** |
| **Thai UI Leak Guard** | `node tests/th-ui-leak-test.js` | **PASS (3999 Kunci Identik)** |
| **Hexa-Sync Check** | `node tools/bump-build.mjs --check` | **PASS (Selaras)** |

---

## 4. Berkas yang Disentuh

1. `style.css` (penambahan `display: none !important` pada `.fiezel-subtitle`)
2. `features/neural-voice/fiezel-subtitle.js` (penguncian tampilan DOM `host.style.display = 'none'`)
3. `sw.js` (versi cache shell `m025-545`)
4. `core-config.js` (versi build halaman `m025-545`)
5. `features/neural-voice/fiezel-diag-panel.js` (DIAG_BUILD `m025-545`)
6. `kurikulum.html` (cache-buster `m025-545`)
7. `misi.html` (cache-buster `m025-545`)
8. `coordination/BUILD-VERSION.json` (versi koordinasi `m025-545`)
9. `docs/handoffs/FIEZEL-M025545-DISABLE-AUDIO-SUBTITLES-HANDOFF.md` (dokumen serah terima ini)
