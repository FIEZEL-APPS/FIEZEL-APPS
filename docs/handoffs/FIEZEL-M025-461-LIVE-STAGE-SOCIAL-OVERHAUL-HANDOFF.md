# FIEZEL HANDOFF DOSSIER: OVERHAUL PANGGUNG SUARA LIVE & KEHADIRAN SOSIAL IN-APP
**Nomor Build**: `m025-461`  
**Tanggal**: 04 Oktober 2026  
**Status Kualitas**: 100% HIJAU (Semua Gerbang Mutu & Probe Lulus)  
**Tipe Rilis**: `feat(stage): live voice studio and in-app social presence overhaul`  

---

## 1. Ringkasan Eksekutif & Temuan Audit

Sesi ini menyelesaikan keluhan kritis pengguna terkait Panggung Suara Live (WebRTC Audio Stage & Social Presence) yang dinilai buruk ("terlihat seperti web murahan / link phishing", tidak bisa invite teman langsung dari aplikasi, harus melalui WhatsApp dan tautan WA sering gagal dibuka di in-app browser).

Melalui orkestrasi 5 subagent spesialis:
1. **Backend Signaling and Protocol Architect**: Merombak rute `/api/stage/*` pada Worker untuk multi-role (Host, Speaker, Audience), antrean angkat tangan (`/hand/raise`, `/hand/decide`, `/speaker/demote`), antrean undangan in-app (`/invite`, `/invites`), dan pelacakan panggung aktif (`/active`).
2. **WebRTC Transport & Audio Routing Specialist**: Merombak `WebRtcStageClient` agar penonton (*audience*) masuk tanpa prompt izin mikrofon awal (nol friksi), mendukung negosiasi ulang P2P saat promosi peran, metering energi audio lokal & remote untuk denyut gelombang neon, dan jembatan undangan langsung.
3. **Stage UI/UX & Visual Master**: Mendesain ulang antarmuka studio suara standar **TikTok Live / Clubhouse / Discord Stage** di `panggung-suara.css` dan `app.js`: bilah atas sinematik dengan chip kode ruang monospace, lencana penonton aktif, panggung utama dengan multi-tier acoustic ripple, tray penonton interaktif, timer radial, dan peluncur reaksi emoji mengambang (*floating live ticker*).
4. **In-App Social Presence & Call Alert Engineer**: Menghubungkan daftar teman (`socialTemanMarkup`) dengan endpoint kehadiran panggung aktif (`/api/stage/active`), menampilkan badge `🔴 LIVE (FZ-XXXX)` dan tombol `[Nonton Live]` langsung di dalam aplikasi tanpa membuka link luar WhatsApp. Menambahkan sistem *Floating Incoming Call Banner* di layar teman yang diajak.
5. **QA & Empirical Auditor**: Membangun dan mengeksekusi Playwright probe multi-konteks (`tools/dev/live-stage-social-probe.js`) yang menguji 5 skenario empiris secara headless Chromium, membuktikan 100% kelulusan tanpa tautan eksternal.

---

## 2. Bukti Empiris Uji Probe Playwright (`tools/dev/live-stage-social-probe.js`)

Pengujian empiris dijalankan menggunakan 2 sesi peramban simultan (Host: Rian Pratama, Listener: Dimas Kurnia).

| Skenario Pengujian | Hasil | Rincian & Verifikasi Empiris |
| :--- | :---: | :--- |
| **Skenario A: Host Membuka Panggung** | **PASS** | Host membuat room format `FZ-XXXX` (bebas ambigu `0/O/1/I`), mic unmuted default, kartu Sarang Tabu aktif dengan $\ge 3$ kata terlarang. Bukti visual: [`reports/evidence-live-stage-host.png`](file:///c:/Users/hp/fiezel-apps/reports/evidence-live-stage-host.png) |
| **Skenario B: Teman Melihat Status LIVE In-App** | **PASS** | Teman melihat lencana `🔴 LIVE (FZ-XXXX)` di baris @rian_pratama pada tab Teman, disertai tombol `[🎧 Dengarkan Siaran]` tanpa menyentuh link WhatsApp. Bukti visual: [`reports/evidence-live-stage-friend-presence.png`](file:///c:/Users/hp/fiezel-apps/reports/evidence-live-stage-friend-presence.png) |
| **Skenario C: Listener Masuk Bebas Hambatan** | **PASS** | Masuk sebagai `role: 'audience'`, mic mati secara default (`🔇`), `getUserMedia` terpanggil **0 kali** (nol izin mic awal), audio Host terdengar. Bukti visual: [`reports/evidence-live-stage-listener.png`](file:///c:/Users/hp/fiezel-apps/reports/evidence-live-stage-listener.png) |
| **Skenario D: Angkat Tangan & Promosi Peran** | **PASS** | Listener menekan `[✋ Minta Naik Panggung]` -> Host menerima notifikasi -> Host menyetujui -> Listener dipromosikan jadi Speaker dan mikrofon diaktifkan (`🎙️`). Bukti visual: [`reports/evidence-live-stage-speaker-promoted.png`](file:///c:/Users/hp/fiezel-apps/reports/evidence-live-stage-speaker-promoted.png) |
| **Skenario E: Audit Anti-Phishing / Bebas WhatsApp** | **PASS** | 0 tautan / aksi ke `wa.me`, `api.whatsapp.com`, atau domain luar mencurigakan. Seluruh aliran bergabung berjalan kanonik di dalam PWA. Bukti visual: [`reports/evidence-live-stage-phishing-audit.png`](file:///c:/Users/hp/fiezel-apps/reports/evidence-live-stage-phishing-audit.png) |

Total Assertion Probe: **18 / 18 PASS (100% Hijau)**.

---

## 3. Daftar Berkas yang Disentuh & Perubahan

1. **`workers/api/stage/stage-signaling-core.js`**:
   - Menambahkan pelacakan `handsRaised` Map pada ruang siaran.
   - Menambahkan metode `raiseHand()`, `decideHand()`, `demoteSpeaker()`.
   - Menambahkan `activeStages` map dengan TTL keaktifan dan metode `getActiveStages()`.
   - Menambahkan antrean undangan panggung in-app `sendStageInvite()` dan `getStageInvites()`.
2. **`workers/api/stage/route-stage.js`**:
   - Menambahkan skema payload: `SCHEMA_HAND_RAISE`, `SCHEMA_HAND_DECIDE`, `SCHEMA_SPEAKER_DEMOTE`, `SCHEMA_STAGE_INVITE`.
   - Menambahkan rute handler: `/hand/raise`, `/hand/decide`, `/speaker/demote`, `/invite`, `/invites`, `/active`.
   - Menambahkan pencatatan `hostHandle` pada pembuatan ruang.
3. **`workers/api/schema.js`**:
   - Mendaftarkan batas byte ketat (`BYTE_LIMITS`) untuk keenam endpoint baru.
4. **`features/speaking-listening/fiezel-webrtc-stage.js`**:
   - Mendukung peran `audience` (tanpa mic di awal) dan renegotiation mulus saat promosi peran.
   - Audio energy metering lokal & remote (`startLocalAudioMeter`, `createAudioMeter`) memancarkan event `audioLevel`.
   - Metode baru: `requestToSpeak()`, `decideHand()`, `demoteSpeaker()`, `sendStageInvite()`, `getStageInvites()`, `getActiveStages()`.
5. **`features/speaking-listening/panggung-suara.css`**:
   - Menambahkan token visual studio TikTok Live / Discord Stage: `.fz-stage-room-chip`, `.fz-stage-viewer-pill`, `.fz-stage-role-pill`, `.fz-stage-acoustic-ripple`, `.fz-stage-audience-tray`, `.fz-stage-audience-grid`, `.fz-stage-audience-item`, `.fz-stage-btn-request-speak`, `.fz-stage-btn-ajak`, `.fz-stage-btn-hands`, `.fz-stage-float-reaction`, sheet `.fz-stage-picker-*`, dan banner `.fz-stage-call-banner`.
   - Purity token terjaga (0 penggunaan `--primary`, `--surface`, `--secondary`).
6. **`features/social/fiezel-social.js`**:
   - Mendaftarkan rute `stageActive`, `stageInvite`, dan `stageInvites` ke `API_PATHS` dan `FiezelSocial.api`.
7. **`app.js`**:
   - Menghubungkan state panggung: `fzStageHandRequested`, `fzStageHandsList`, `fzStagePeers`, `fzStageAudienceCount`.
   - Merombak `fzStageDrawerShell()` dengan pemisahan peran visual Host vs Speaker vs Audience.
   - Menambahkan interaksi: `fzStageRequestToSpeak()`, `fzStageOpenHandsModal()`, `fzStageDecideHand()`, `fzStageOpenFriendPicker()`, `fzStageSendDirectInvite()`, `fzStageCopyRoomCode()`, `fzStageReact()`.
   - Menghubungkan banner panggilan masuk `showStageIncomingCallBanner()` dan polling `pollStageInvites()`.
   - Menghubungkan badge `🔴 LIVE` dan tombol `[Nonton Live]` di `socialTemanMarkup()`.
8. **`tools/stage-server.js`**:
   - Mengalihkan referensi ke `workers/api/stage/stage-signaling-core.js` dan menambahkan seluruh endpoint baru untuk pengujian server lokal mandiri.
9. **`tools/dev/live-stage-social-probe.js`**:
   - Skrip probe otomatis multi-konteks Playwright Chromium.
10. **`id-golden-baseline.json` & Berkas Versi Build (`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`)**:
    - Snapshot baseline emas diperbarui via `--write-baseline`.
    - Nomor build dinaikkan ke `m025-459` via arbiter resmi `tools/bump-build.mjs`.

---

## 4. Status Kelulusan Gerbang Mutu Lokal (Hexa-Sync & Contract Gates)

Semua 8 gerbang mutu lokal dijalankan dan lulus 100%:

```
[PASS] tests/panggung-suara-contract-test.js  (32 / 32 PASS)
[PASS] tests/stage-signaling-contract-test.js (33 / 33 PASS)
[PASS] tests/friend-system-contract-test.js   (44 / 44 PASS)
[PASS] tests/friend-qr-contract-test.js       (21 / 21 PASS)
[PASS] tests/id-golden-snapshot-test.js       (HIJAU: baseline emas utuh)
[PASS] tests/th-ui-leak-test.js               (PASS: 0 kebocoran naskah)
[PASS] tests/curriculum-cache-version-test.js (PASS: 26 penegasan, build m025-459)
[PASS] tests/gate-registry-test.js            (PASS: 10 pass, 0 fail)
[PASS] Hexa-Sync Arbiter                      (Selaras di 6 titik wajib)
```

---

## 5. Kepatuhan Aturan Git Protection

Sesuai aturan `Git Protection Rule`:
> Seluruh aset, berkas, mockup, dan kode redesign ini berada di lingkungan lokal/preview dan **TIDAK** di-commit maupun di-push ke remote git tanpa instruksi tertulis baru dari pengguna.
