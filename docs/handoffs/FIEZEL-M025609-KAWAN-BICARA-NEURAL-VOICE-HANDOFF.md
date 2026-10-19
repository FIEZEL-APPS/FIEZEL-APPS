# DOKUMEN SERAH TERIMA RESMI (HANDOFF DOSSIER)
**ID Dokumen:** `FIEZEL-M025609-KAWAN-BICARA-NEURAL-VOICE-HANDOFF`
**Fitur:** Integrasi Multi-Character Neural Voice & Two-Way Voice Call Kawan Bicara (Mitra Kaiwa)
**Nomor Rilis Arbiter:** `m025-609` (Transparansi: m025-608 diklaim oleh PR #658 ElevenLabs CI, arbiter menaikkan ke m025-609 sesuai protokol anti-collision)
**Tanggal:** 19 Oktober 2026
**Status CI & Mutu:** 100% HIJAU (PASS)
**Branch Fitur:** `feat/kawan-bicara-neural-voice`

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Sebelum rilis ini, fitur **Kawan Bicara (Speaking Companion / Mitra Kaiwa)** pada FIEZEL mengandalkan tangga suara sintetis darurat (`FiezelVoiceSay` untuk bahasa Inggris dan `FiezelPuterVoice` untuk bahasa Jepang) yang belum terhubung ke mesin Neural TTS multi-karakter 24kHz. Beberapa keterbatasan kritis yang ditemukan meliputi:
1. **Ketiadaan Multi-Karakter Persona**:
   - Bahasa Inggris hanya memiliki satu profil suara tanpa pilihan coach (Alex vs Sarah).
   - Bahasa Jepang belum memiliki diferensiasi instruktur (Keita) dan mahasiswi (Nanami).
2. **Latensi Kalimat Awal (TTFB) & Stuttering**:
   - Kalimat pembuka pendek seperti *"Hello!"* atau *"Got it!"* sebelumnya digabungkan ke kalimat berikutnya karena ambang batas kaku (`MIN_CHUNK_CHARS = 14`), memaksa murid menunggu 500ms–1500ms sebelum suara pertama berbunyi.
   - Belum adanya prefetching asinkron di belakang layar untuk kalimat-kalimat berikutnya ($N+1$).
3. **Mekanisme Barge-In & Pembatalan Instan**:
   - Pada panggilan telepon dua arah (*Two-Way Voice Call*), saat murid menyela pembicaraan (*barge-in*), loop antrean audio tidak langsung terputus secara politis, memicu tabrakan suara (*speech collision*).
4. **Proteksi Anti-Leak Browser TTS (`speechSynthesis`)**:
   - Kepatuhan kanon m025-232 & m025-246 menuntut ZERO penggunaan `speechSynthesis` bawaan peramban dan penegakan *Fail-Quiet L5* (jika seluruh jaringan dan suara mati, balasan tetap terbaca di layar tanpa galat dan tanpa freeze).

---

## 2. Solusi Teknis & Arsitektur Sistemik

### A. Backend Neural TTS Engine (`server.js`)
- Mengimplementasikan endpoint resmi:
  - `GET /api/tts/personas`: Menyajikan katalog 6 karakter persona kanonikal (`guy`, `aria`, `keita`, `nanami`, `ardi`, `ava`).
  - `POST /api/tts/line`: Sintesis baris audio instan dengan validasi teks, sanitasi ruby/markdown, dan disk cache berbasis hash SHA-256 (`.cache/neural-tts/`).
  - `POST /api/tts/dialogue`: Sintesis multi-baris percakapan sekuensial.
- Hirarki sintesis multi-tier:
  1. *Microsoft Edge Neural TTS* (24kHz, format MP3).
  2. *Gemini TTS REST Fallback* (`gemini-2.5-flash-preview-tts` dengan rotasi API key).
  3. *Disk Cache Fallback & Zero-Frame Failover*.
- Sistem muteks asinkron (`synthesisMutex`) untuk deduplikasi request in-flight identik.

### B. Chat Voice Pipeline (`features/interactive-chat/fiezel-chat-voice.js`)
- Pintu masuk suara utama Kawan Bicara memprioritaskan endpoint `/api/tts/line`.
- Resolusi persona kanonikal:
  - English: `guy` (Coach Alex, `en-US-GuyNeural`) & `aria` (Coach Sarah, `en-US-AriaNeural`).
  - Japanese: `nanami` (Sensei Nanami, `ja-JP-NanamiNeural`) & `keita` (Sensei Keita, `ja-JP-KeitaNeural`).
- Low-latency sentence chunking:
  - Mengisolasi kalimat pembuka <250ms tanpa stuttering.
  - Prefetching asinkron non-blocking untuk kalimat $N+1$ menggunakan *in-memory cache* LRU (kapasitas 40 entri).
- Polite Barge-in & Interruption (`stop()`):
  - Inkrementasi token sesi (`token++`), pemutusan `activeAudio` (`pause()`, `currentTime = 0`, `muted = true`), pembatalan `AbortController` fetch in-flight, dan perambatan pembungkaman ke seluruh lapisan fallback.
- Tangga Suara Bertingkat & Fail-Quiet L5:
  - L1: Server Neural TTS (`/api/tts/line`)
  - L2: Fallback Adapter (`FiezelVoiceSay` / `FiezelPuterVoice`)
  - L5: Fail-Quiet (resolusi `false` secara tenang, nol freeze, teks tetap tampil utuh di layar).

### C. Voice Call Integration & Persona UI (`features/interactive-chat/fiezel-voice-call.js` & `fiezel-interactive-chat.js`)
- Dukungan opsi `persona` dinamis pada `FiezelVoiceCall.startCall({ persona: 'aria' })` dan metode runtime `setPersona(persona)`.
- Reaktivitas audio orb 3D (`#fzcVoiceOrb`) dengan pemetaan RMS audio dinamis (`scale` hingga 1.45x, `haloOpacity` 0.85).
- Sinkronisasi riwayat sesi panggilan suara dua arah ke dalam gelembung chat feed Kawan Bicara saat panggilan diakhiri.

---

## 3. Bukti Pengujian Empiris & Verifikasi Headless Playwright

Sesuai **Mandatory Protocol: Probe-Driven Empirical Audit**, seluruh integrasi dibuktikan melalui eksekusi nyata pada peramban Chromium Playwright headless (`tools/dev/probe-kawan-bicara-neural-voice.mjs`):

1. **Navigasi & Rendering Mobile**:
   - Viewport iPhone (390x844 DPR 2): Kawan Bicara terbuka (`state.view === 'chat'`), kontainer `.fzc-container` dan tombol panggilan telepon `#fzcBtnCall` siap.
   - Bukti screenshot: `tools/dev/probe-kawan-bicara-01-home.png`.
2. **Pemicuan Two-Way Voice Call Overlay**:
   - Klik `#fzcBtnCall` memicu overlay layar penuh `#fzcCallOverlay` (`.is-active`).
   - Partner aktif terkonfirmasi: *フィゼル先生* / *Coach Alex*.
   - Bukti screenshot: `tools/dev/probe-kawan-bicara-02-call-active.png`.
3. **Sampling Multi-Frame Denyut Dinamis Orb (Active Speech)**:
   - Sampling multi-frame denyut orb saat audio neural aktif membuktikan reaktivitas visual:
     - Frame 1: `scale(1.416)`, `audioLevel: 0.231`, `voiceLevel: 0.231`, `haloOpacity: 0.55`
     - Frame 2: `scale(1.450)`, `audioLevel: 0.771`, `voiceLevel: 0.771`, `haloOpacity: 0.85`
     - Frame 3: `scale(1.450)`, `audioLevel: 0.757`, `voiceLevel: 0.757`, `haloOpacity: 0.85`
     - Frame 4: `scale(1.450)`, `audioLevel: 0.669`, `voiceLevel: 0.669`, `haloOpacity: 0.85`
   - Bukti screenshot: `tools/dev/probe-kawan-bicara-03-orb-pulsing.png`.
4. **Pengujian Interupsi Polite Barge-In**:
   - Sentuhan pada orb saat AI berbicara seketika memotong pemutaran audio (`stopEventTriggered: true`).
   - `interruptedCount` bertambah dari 0 ke 1, dan status langsung kembali ke `listening` dengan label *"Menyimakmu..."*.
   - Bukti screenshot: `tools/dev/probe-kawan-bicara-04-barge-in.png`.
5. **Penghentian & Sinkronisasi Feed Chat**:
   - Klik `#fzcCallBtnEnd` menutup overlay secara bersih dan menyinkronkan seluruh riwayat turn dialog ke `#fzcFeed` (3 bubble).
   - Bukti screenshot: `tools/dev/probe-kawan-bicara-05-feed-synced.png`.
6. **Integritas Konsol**:
   - Total runtime console error: **0**
   - Total unhandled exceptions: **0**

---

## 4. Status Kelulusan Seluruh Gerbang Mutu Lokal

Seluruh suite gerbang mutu otomatis telah dijalankan dan lulus 100%:

| Gerbang Pengujian | Perintah Eksekusi | Hasil | Keterangan |
| :--- | :--- | :---: | :--- |
| **Golden Baseline Snapshot** | `node tests/id-golden-snapshot-test.js` | **PASS** | 13 berkas terkunci identik, baseline emas Indonesia utuh |
| **Thai UI Leak Guard** | `node tests/th-ui-leak-test.js` | **PASS** | 4389 kunci id memiliki padanan th, nol kebocoran naskah |
| **Curriculum Cache Version** | `node tests/curriculum-cache-version-test.js` | **PASS** | 26 penegasan pada build `m025-609` |
| **Gate Registry Integrity** | `node tests/gate-registry-test.js` | **PASS** | 10 pass, 0 fail (386 gerbang CI terverifikasi) |
| **Kawan Bicara Neural Voice** | `node tests/kawan-bicara-neural-voice-test.js` | **PASS** | 5 bagian uji komprehensif (Persona, Chunking, Barge-in, L5, Zero-TTS) |
| **Chat Voice Endpoint Routing** | `node tests/chat-voice-neural-endpoint-test.js` | **PASS** | 6/6 pengujian prioritas rute `/api/tts/line` |
| **Neural Server TTS Probe** | `node tools/dev/probe-neural-server-tts.js` | **PASS** | Verifikasi endpoint `/api/tts/personas`, `/line`, `/dialogue` |
| **Audio Latency & Barge-In** | `node tests/audio-latency-barge-in-test.js` | **PASS** | Ambang <250ms, prefetch non-blocking, muting instan |
| **Audio Security Anti-Leak** | `node tests/audio-locale-guard-test.js` | **PASS** | Zero browser TTS, recognition pinned di target language |
| **PWA Cache Shell Test** | `node tests/pwa-cache-test.js` | **PASS** | 34 aset shell terverifikasi, runtime cache stabil |
| **Precache Covers Shell** | `node tests/precache-covers-shell-test.js` | **PASS** | 5/5 penegasan dependensi shell tertutup precache |

---

## 5. Hexa-Sync Release Arbiter (Build `m025-609`)

Sesuai **Mandatory Protocol: PWA Release Arbiter & Anti-Ghost-Deploy**, nomor build dinaikkan secara resmi melalui `tools/bump-build.mjs`.

Eksekusi Arbiter:
```bash
node tools/bump-build.mjs "feat(chat): integrasi multi-character neural voice ke kawan bicara (m025-608)"
```

Verifikasi Hexa-Sync:
```bash
node tools/bump-build.mjs --check
```
Output:
```json
{
  "sumber": "m025-609",
  "terpasang": {
    "sw.js": "m025-609",
    "core-config.js": "m025-609",
    "features/neural-voice/fiezel-diag-panel.js": "m025-609"
  },
  "selaras": true
}
Selaras.
```

### Keselarasan 6 Titik Wajib:
1. `coordination/BUILD-VERSION.json` (`version`: `m025-609`) -> **Selaras**
2. `sw.js` (`SW_REV`: `m025-609`) -> **Selaras**
3. `core-config.js` (`self.FIEZEL_PAGE_BUILD`: `m025-609`) -> **Selaras**
4. `features/neural-voice/fiezel-diag-panel.js` (`var DIAG_BUILD`: `m025-609`) -> **Selaras**
5. `kurikulum.html` (`?v=m025-609`, 5 rujukan) -> **Selaras**
6. `misi.html` (`?v=m025-609`, 6 rujukan) -> **Selaras**

---

## 6. Daftar Berkas yang Disentuh

| Berkas | Aksi | Deskripsi |
| :--- | :--- | :--- |
| `server.js` | Dimodifikasi | Penambahan endpoint `/api/tts/personas`, `/api/tts/line`, dan `/api/tts/dialogue` dengan multi-tier fallback & SHA-256 cache |
| `features/interactive-chat/fiezel-chat-voice.js` | Dimodifikasi | Integrasi prioritas utama `/api/tts/line`, multi-persona resolver, low-latency chunking, prefetch LRU, dan pembatalan instan |
| `features/interactive-chat/fiezel-voice-call.js` | Dimodifikasi | Dukungan persona selection pada Two-Way Voice Call, binding ke `cv.speak()`, dan state management |
| `features/interactive-chat/fiezel-interactive-chat.js` | Dimodifikasi | Penyelarasan controller chat, voice call trigger dengan persona, dan sinkronisasi bubble |
| `features/neural-voice/fiezel-puter-voice.js` | Dimodifikasi | Penguatan proteksi token pembatalan barge-in pada fallback engine rekursif |
| `coordination/BUILD-VERSION.json` | Dimodifikasi | Kenaikan nomor build versi resmi ke `m025-609` |
| `sw.js` | Dimodifikasi | Pembaruan revisi service worker `SW_REV` ke `m025-609` |
| `core-config.js` | Dimodifikasi | Pembaruan penanda cangkang `FIEZEL_PAGE_BUILD` ke `m025-609` |
| `features/neural-voice/fiezel-diag-panel.js` | Dimodifikasi | Pembaruan penanda diagnostik `DIAG_BUILD` ke `m025-609` |
| `kurikulum.html` | Dimodifikasi | Cache busting query param `?v=m025-609` |
| `misi.html` | Dimodifikasi | Cache busting query param `?v=m025-609` |
| `id-golden-baseline.json` | Dimodifikasi | Pemeliharaan baseline emas identik |
| `reports/th-ui-leak-report.json` | Dimodifikasi | Laporan audit paritas dwibahasa bebas bocoran |
| `tests/kawan-bicara-neural-voice-test.js` | Dibuat | Unit test komprehensif 5 bagian untuk integrasi suara neural Kawan Bicara |
| `tests/chat-voice-neural-endpoint-test.js` | Dibuat | Pengujian integrasi routing endpoint dan fallback adapter |
| `tools/dev/probe-neural-server-tts.js` | Dibuat | Pengujian empiris loopback endpoint backend TTS dan multi-character persona |
| `tests/audio-latency-barge-in-test.js` | Dibuat | Pengujian latensi kalimat pembuka <250ms dan polite barge-in |
| `tests/pwa-offline-kawan-bicara-probe.js` | Dibuat | Skrip audit ketahanan luring dan fail-quiet L5 Kawan Bicara |
| `tools/dev/probe-kawan-bicara-neural-voice.mjs` | Dibuat | Skrip probe Playwright headless Chromium untuk pengujian empiris dua arah |
| `docs/handoffs/FIEZEL-M025608-KAWAN-BICARA-NEURAL-VOICE-HANDOFF.md` | Dibuat | Berkas serah terima resmi (dossier) rilis fitur ini |

---

## 7. Catatan Utang Teknis & Kepatuhan Git

1. **Utang Teknis**: **0 (Nol)**. Tidak ada regresi gerbang, nol celah kebocoran bahasa, nol sebutan browser TTS (`speechSynthesis`), dan precache PWA 100% konsisten.
2. **Kepatuhan Protokol PR**:
   - Seluruh perubahan berada di branch fitur `feat/kawan-bicara-neural-voice`.
   - Sesuai *Git Protection Rule*, branch ini siap diajukan ke `main` via Pull Request (PR) tanpa direct push.
