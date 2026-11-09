# FIEZEL Handoff Dossier — Build m025-786

**Otoritas: OWNER & Mandat Mutlak #0.**
**Topik:** Pemulihan Suara Pembuka Mochi Seketika (Zero Screen-Touch), Pengaktifan Mikrofon Pengguna 2-Tahap Same-Realm (100% Paritas Mochi SOS), Restorasi Pop-up Pembaruan Terlihat (`#updateBanner`), dan Pembersihan Tumpukan Cache Cangkang Lama (`fiezel-shell-*`).

---

## 1. Ringkasan Temuan Audit & Akar Masalah

Laporan pemicu dari user/owner:
> *"Mikrofonnya tetap tidak aktif dan Mochinya tidak langsung berbicara seperti sebelumnya, malah harus sentuh dulu layar atau sentuh Mochinya atau sentuh apa saja baru suara Mochinya hidup. Malah ini lebih parah daripada sebelumnya dan mikrofon user tidak pernah muncul dan kemudian update pembaruan pop-up sebelumnya tidak muncul melainkan langsung terupdate otomatis. Cangkang lamanya menumpuk."*

### Akar Masalah 1: Suara Pembuka Mochi Tergantung Sentuhan Layar & Mikrofon Tidak Muncul
- Pada rilis `m025-785`, penghubung `window.__fzSharedLiveAudioCtx` dan `window.__fzSharedMicStream` di `openKawanBicaraCallModal()` sempat dilepas dan dipindahkan sepenuhnya ke dalam `call.html`.
- Karena `call.html` dimuat di dalam `<iframe>` (`#fzMitraKaiwaStudioFrame`) setelah penundaan 160ms, peramban mobile (WebKit iOS & Chromium Android) menganggap dokumen di dalam iframe **belum memiliki user activation** (`navigator.userActivation.hasBeenActive === false`).
- Akibatnya:
  1. `new AudioContext()` di dalam iframe berstatus `"suspended"` dan peramban memblokir audio sampai pengguna menyentuh layar / menyentuh Mochi di dalam iframe.
  2. Panggilan `getUserMedia()` di dalam iframe ditolak atau menggantung tanpa ada interaksi pengguna di dalam iframe tersebut.
- Sebaliknya, fitur **Mochi SOS** (`features/mascot/fiezel-mochi-voice-sos.js`) berfungsi normal karena menggunakan aktivasi 2-tahap langsung pada `window` induk: Tahap 1 membuka modal dan pre-warm `AudioContext` + `getUserMedia`, Tahap 2 saat tombol konfirmasi diklik langsung mengaktifkan mixer suara dan mengalirkan PCM.

### Akar Masalah 2: Pop-up Pembaruan Hilang / Auto-Update Diam-diam & Cangkang Lama Menumpuk
- Pada `features/ui/fiezel-boot-tail.js`, fungsi `maybeAutoPromoteUnderCurtain` dan `isCurtainActive` memicu `FIEZEL_SKIP_WAITING` secara otomatis di balik tirai splash, sehingga `#updateBanner` ("Versi baru tersedia · Perbarui sekarang") tidak pernah muncul di mata pengguna dan halaman melakukan reload otomatis secara mengejutkan.
- Logika pembersihan cache cangkang `sweepStaleShellCaches()` di `fiezel-boot-tail.js` dan `purgeStaleCaches()` di `fiezel-update-prompt.js` membiarkan beberapa cangkang lama bertahan di Cache Storage jika nama cangkang tidak cocok persis dengan penanda tertentu, menyebabkan tumpukan cangkang lama (`fiezel-shell-*`).

---

## 2. Solusi & Perubahan yang Diterapkan (Build m025-786)

### A. 2-Stage Same-Realm Audio & Mic Bridge (100% Paritas Mochi SOS)
1. **`app.js` (lines 12526–12770)**:
   - Dibuat `ensureSharedKawanAudioCtx()`, `wireSharedKawanMicBridge(stream)`, `stopSharedKawanMicBridge()`, dan `warmKawanAudioAndMic()`.
   - **Tahap 1 (`openKawanBicaraCallModal`)**: Begitu kartu Kawan Bicara diketuk di Beranda, `warmKawanAudioAndMic()` langsung dipanggil untuk menginisialisasi `__fzSharedLiveAudioCtx` (`state === 'running'`) dan memulai `getUserMedia()` di realm induk.
   - **Tahap 2 (`#fzKawanModalPhone.onclick`)**: Saat tombol telepon hijau diketuk pengguna (real user gesture):
     - `warmKawanAudioAndMic()` memastikan stream live.
     - `playKawanRingtone()` diputar langsung pada `__fzSharedLiveAudioCtx` untuk mengunci hardware audio mixer ke mode `'running'`.
     - `closeKawanBicaraCallModal(true)` mempertahankan media stream (`keepSharedMedia = true`) sebelum beralih ke `go('chat')`.
   - Jika pengguna membatalkan panggilan (`closeKawanBicaraCallModal(false)` via tombol tutup, "Nanti dulu", scrim tap, atau Escape), `stopSharedKawanMicBridge()` mematikan audio track secara bersih.

2. **`features/voice-studio/src/App.tsx` & Rebuilt `features/voice-studio/dist/voice-studio.js`**:
   - `primeAudioPlayback()` dan `startLiveCall()` mengadopsi `parentWin.__fzEnsureSharedLiveAudioCtx()` / `parentWin.__fzSharedLiveAudioCtx` yang sudah berstatus `'running'` dari ketukan di `index.html`.
   - `connectMicStreamToLiveProcessing()` mengadopsi `parentWin.__fzSharedMicStream` dan menyambungkan PCM bridge same-realm (`parentWin.__fzWireSharedMicBridge(stream)` + callback `parentWin.__fzSharedMicPcmCallback`).
   - Node `MediaStreamAudioSourceNode` dan `ScriptProcessorNode(2048, 1, 1)` berjalan 100% di realm induk `window.parent`, mengirim sampel Float32Array 2048 langsung ke `handleMicPcmData` di `call.html` tanpa konflik cross-realm.
   - Pengecekan `checkAutoCall` dipercepat dari 350ms ke 40ms, dan timer perlindungan sapaan pembuka `awaitingOpeningTurnRef` diselaraskan ke 2200ms tanpa mematikan respons AI.

### B. Restorasi Pop-up Pembaruan Terlihat & Pembersihan Cangkang Lama
1. **`features/ui/fiezel-boot-tail.js`**:
   - Menghapus pemanggilan `isCurtainActive`, `maybeAutoPromoteUnderCurtain`, dan silent `FIEZEL_SKIP_WAITING`. Pembaruan HANYA dipicu secara sadar oleh pengguna melalui tombol "Perbarui sekarang" pada `#updateBanner`.
   - Memperketat `sweepStaleShellCaches()`: seluruh cangkang `fiezel-shell-*` lama dihapus secara agresif hingga hanya menyisakan cangkang aktif saat ini (dan maksimal 1 cangkang rilis baru jika ada worker yang sedang menginstal).
2. **`features/ui/fiezel-update-prompt.js`**:
   - Memperketat `purgeStaleCaches()` untuk menghapus seluruh cangkang lama di luar target rilis baru.
3. **`sw.js`**:
   - Menjaga invarian bahwa `install` dan `activate` DILARANG memanggil `skipWaiting()` otomatis; `skipWaiting()` hanya dieksekusi bila ada pesan eksplisit `FIEZEL_SKIP_WAITING` dari tombol murid di `#updateBanner`.

---

## 3. Bukti Pengujian Empiris & Gerbang Mutu

### A. Empirical Playwright Probe (`tests/kawan-mic-update-probe.mjs`)
Dijalankan secara nyata di peramban Chromium headless dengan viewport mobile Pixel 8 (390x844):
```
[Probe 1] Testing 2-Stage Kawan Bicara Modal -> Call Studio (Zero Touch Inside call.html)...
  Stage 1 (Modal Opened) State: {
    hasSharedCtx: true,
    ctxState: 'running',
    hasSharedMic: true,
    hasSharedProcessor: true
  }
  Stage 2 (Inside call.html with ZERO touch inside iframe): {
    parentCtxState: 'running',
    parentMicLive: true,
    hasPcmCallbackRegistered: true,
    wsStats: {
      setupSent: 1,
      greetingPromptSent: 1,
      openingAudioDelivered: 1,
      pcmFramesSent: 12,
      audioStreamEndSent: 0,
      aiReplyDelivered: 1
    }
  }
  ✓ [PASS] Mochi langsung bicara tanpa sentuh layar & mikrofon user langsung aktif mengalirkan PCM 16kHz!

[Probe 2] Testing Shell Cache Pile-Up Purge & Visible #updateBanner Popup (production SW path)...
  Production SW boot: {
    controlled: true,
    pageBuild: 'm025-786',
    shells: [ 'fiezel-shell-m025-786-unified-grammar-20261002' ]
  }
  Shell caches before sweep: [
    'fiezel-shell-m025-786-unified-grammar-20261002',
    'fiezel-shell-m025-780-old',
    'fiezel-shell-m025-781-old',
    'fiezel-shell-m025-782-old',
    'fiezel-shell-m025-784-old'
  ]
  Shell caches after boot sweep: [ 'fiezel-shell-m025-786-unified-grammar-20261002' ]
  Update Banner visible: true - Versi baru FIEZEL tersedia
  Page build still (no silent auto-update): m025-786
  ✓ [PASS] Cangkang lama bersih & Pop-up Pembaruan (#updateBanner) tampil, tanpa auto-update diam-diam!
```

### B. Status Kelulusan Seluruh Gerbang Lokal
- `node tests/voice-duplex-fullphone-contract-test.js` -> **13/13 LULUS**
- `node tests/update-prompt-test.js` -> **14/14 LULUS**
- `node tests/pwa-cache-test.js` -> **LULUS** (`pass: true`)
- `node tests/id-golden-snapshot-test.js` -> **LULUS** (`HIJAU: baseline emas Indonesia utuh`)
- `node tests/th-ui-leak-test.js` -> **LULUS** (`PASS`)
- `node tests/curriculum-cache-version-test.js` -> **LULUS** (`OK curriculum-cache-version: build m025-786`)
- `node tests/gate-registry-test.js` -> **LULUS** (`10 pass, 0 fail`)
- `node tools/bump-build.mjs --check` -> **Selaras** (Hexa-Sync: `sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`)
- `node tools/fiezel-guardians.mjs` (A9, A10, A11, A13) -> **PASS**

---

## 4. Daftar Berkas yang Disentuh

1. `app.js`: Implementasi bridge audio/mikrofon same-realm dua tahap untuk Kawan Bicara.
2. `features/voice-studio/src/App.tsx`: Adopsi bridge same-realm dari window induk dan registrasi PCM capture.
3. `features/voice-studio/dist/voice-studio.js`: Hasil kompilasi bundel produksi Voice Studio.
4. `features/ui/fiezel-boot-tail.js`: Penonaktifan auto-update diam-diam dan pembersihan cangkang lama.
5. `features/ui/fiezel-update-prompt.js`: Pengetatan pembersihan cangkang lama saat update prompt aktif.
6. `sw.js`: Kenaikan nomor build `m025-786`.
7. `core-config.js`: Kenaikan nomor build `m025-786`.
8. `features/neural-voice/fiezel-diag-panel.js`: Kenaikan nomor build `m025-786`.
9. `coordination/BUILD-VERSION.json`: Kenaikan nomor build `m025-786`.
10. `kurikulum.html`, `misi.html`, `call.html`, `index.html`: Penyelarasan versi build `m025-786`.
11. `tests/voice-duplex-fullphone-contract-test.js`: Penambahan kontrak pengujian 13/13.
12. `tests/update-prompt-test.js`: Penambahan uji pelarangan silent update & verifikasi pembersihan cangkang.
13. `tests/kawan-mic-update-probe.mjs`: *Probe* empiris Playwright headless end-to-end.
14. `id-golden-baseline.json`: Regenerasi baseline emas literal Indonesia pasca-build `dist/voice-studio.js`.
15. `docs/handoffs/FIEZEL-M025786-KAWAN-VOICE-MIC-AND-UPDATE-POPUP-HANDOFF.md`: Dokumen serah terima ini.
