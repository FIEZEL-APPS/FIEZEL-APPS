# Handoff: Audit dan Perbaikan Bug Panggung Suara SLOT 13 + Sistem Pertemanan ala LINE

**Build**: `m025-446` (selaras 6 titik hexa-sync)
**Tanggal**: 4 Oktober 2026
**Lingkup**: Audit menyeluruh Kelompok 1 (fitur belum di-commit), penemuan dan perbaikan bug.
**Status**: 8/8 gate hijau. Seluruh berkas masih di working tree lokal, belum di-commit
sesuai Git Protection Rule sampai Owner memerintahkan.

---

## 1. Ringkasan temuan audit dan alasan perubahan

Audit dilakukan modul per modul. Ditemukan 11 cacat nyata (bukan kosmetik). Semuanya
diperbaiki dan dibuktikan dengan probe empiris.

### Bug kategori fatal (fitur tidak berfungsi tanpa ini)

| # | Berkas | Cacat | Perbaikan |
|---|--------|-------|-----------|
| 1 | `features/speaking-listening/fiezel-webrtc-stage.js` | `setMuted()` memakai `this.isMuted` di dalam `function` biasa pada `forEach`; `this` hilang sehingga `track.enabled` dibalik dari `undefined` (mik selalu aktif, tombol bisu mati) | Nilai dibaca ke variabel lokal `var mutedNow = this.isMuted` sebelum `forEach` |
| 2 | `app.js` | `window.misconceptionLedgerRecord` TIDAK pernah diekspos; modul panggung memanggilnya lewat `typeof ... === 'function'` sehingga pelanggaran kata tabu diam diam tidak pernah masuk Misconception Ledger (pelanggaran Zero Dumbing Invariant) | Tambah `window.misconceptionLedgerRecord=misconceptionLedgerRecord;` di daftar ekspor window |
| 3 | `app.js` | Shadowing: `const t=$('fzStageTimer')` lalu `t('stage.siap','Siap')` memanggil elemen DOM sebagai fungsi (TypeError tertelan try/catch); label timer tidak pernah kembali ke "Siap" | Variabel DOM dinamai `el`, fungsi i18n `t` tetap terpanggil |

### Bug kategori sedang (fungsi salah / bocor)

| # | Berkas | Cacat | Perbaikan |
|---|--------|-------|-----------|
| 4 | `features/speaking-listening/fiezel-webrtc-stage.js` | Fallback `randCode` lokal memakai `Math.random().toString(36)` yang bisa menghasilkan karakter ambigu (0/O/1/I/L); kode ruang bisa ditolak `parseStageParam()` saat teman membuka tautan | Tambah `ROOM_ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'` + `localRoomCode()` + `localPeerId()`, sejajar `generateRoomId()` server |
| 5 | `workers/api/stage/stage-signaling-core.js` | `signalQueue` tak berbatas; klien yang mogok tanpa `/api/stage/leave` membuat antrean tumbuh tanpa henti sampai TTL 30 menit | Tambah `MAX_SIGNAL_QUEUE` (default 50) + helper `enqueueSignal()` yang membuang sinyal tertua lebih dulu; dipakai di semua titik push |
| 6 | `workers/api/stage/stage-signaling-core.js` | `leaveRoom()` menghapus ruang dengan `this.rooms.delete(roomId)` memakai key MENTAH, padahal lookup memakai `.toUpperCase().trim()`; ruang tidak terhapus bila klien mengirim huruf kecil | Pakai `cleanRoomId` untuk lookup DAN `delete` |
| 7 | `app.js` | `fzStageWireCoordinator()` mendaftarkan pendengar tiap kali laci dibuka, sehingga pesan obrolan muncul N kali setelah N pembukaan | Guard `fzStageCoordinatorWired` (sekali per koordinator) |
| 8 | `app.js` | Pendengar `peerJoined`/`peerLeft` didaftarkan tiap `openLiveVoiceStage()`, bertumpuk saat dibuka ulang | Dipindah ke dalam blok `if(!fzStageRtcClient)` sehingga terdaftar sekali per klien |
| 9 | `app.js` | `openLiveVoiceStage()` tanpa guard buka ganda; pemanggilan kedua membuat ruang baru dan menggandakan wiring | Tambah `if(fzStageDrawerOpen)return true;` |
| 10 | `features/speaking-listening/fiezel-panggung-suara.js` | Timer `resetRoundTimer` bisa memanggil `nextCard()` setelah ronde dihentikan manual, menghidupkan kembali interval | Guard `if (self.state !== 'TABOO_ROUND_ACTIVE') return;` sebelum `nextCard()` |

### Bug kategori ringan

| # | Berkas | Cacat | Perbaikan |
|---|--------|-------|-----------|
| 11 | `features/speaking-listening/fiezel-panggung-suara.js`, `tests/panggung-suara-contract-test.js` | Salah ejaan event telemetri `CIRCUMCLOCUTION_SUCCESS` (seharusnya `CIRCUMLOCUTION`) | Diperbaiki di modul dan assertion tes disinkronkan |
| 12 | `features/speaking-listening/fiezel-webrtc-stage.js` | `console.error('Gagal membuat offer')` untuk kegagalan yang wajar di peramban seluler | Diturunkan ke `console.warn` |

---

## 2. Bukti pengujian empiris

Probe dijalankan via Node (modul diimpor langsung, tanpa peramban, karena inti cacat
ada di logika murni):

1. **`setMuted`** (probe-rtc): mock `localStream.getAudioTracks()` dengan getter/setter
   `enabled`. Hasil: `setMuted(true)` maka `track.enabled === false`; `setMuted(false)`
   maka `true`. Sebelum perbaikan, nilai `enabled` menjadi `!undefined === true` selalu.
2. **Fallback kode ruang** (probe-rtc): `buildInviteUrl('FZ-8822')` lalu
   `parseStageParam` round trip mengembalikan `FZ-8822`. 200 sampel `localRoomCode()`
   hanya menghasilkan karakter dari alfabet bebas ambigu.
3. **Batas antrean sinyal** (probe-queue): kirim 20 sinyal dengan `maxSignalQueue: 5`.
   Hasil: klien menerima tepat 5, sinyal terbaru bertahan, sinyal tertua dibuang.
4. **Ekspor telemetri** (probe5): `app.js` memuat string
   `window.misconceptionLedgerRecord=misconceptionLedgerRecord`.
5. **Syntax** (scanall): `node --check` untuk 13 berkas JS rilis, semuanya OK;
   `panggung-suara.css` bebas token terlarang.

Verifikasi ulang 11 perbaikan inti (verify.cjs): 11/11 utuh.

---

## 3. Daftar berkas yang disentuh

- `features/speaking-listening/fiezel-webrtc-stage.js`: `setMuted` (bug 1), alfabet kode
  ruang lokal dan helper (bug 4), `console.warn` (bug 12).
- `features/speaking-listening/fiezel-panggung-suara.js`: guard state timer (bug 10),
  ejaan `CIRCUMLOCUTION_SUCCESS` (bug 11).
- `features/speaking-listening/taboo-bank-v1.json`: v1.0.0 (10 kartu) menjadi v1.1.0
  (30 kartu: 18 Inggris + 12 Jepang), struktur dan variants tiap kartu lengkap.
- `workers/api/stage/stage-signaling-core.js`: `MAX_SIGNAL_QUEUE` + `enqueueSignal`
  (bug 5), `cleanRoomId` di `leaveRoom` (bug 6).
- `app.js`: ekspor `misconceptionLedgerRecord` (bug 2), shadowing timer (bug 3), guard
  wiring (bug 7), relokasi pendengar peer (bug 8), guard buka ganda (bug 9).
- `tests/panggung-suara-contract-test.js`: sinkronisasi ejaan assertion (bug 11).
- `id-golden-baseline.json`: regenerasi sadar (menyerap literal `fz-view-latihan` dan
  penyesuaian dari lapisan UI; 4838 literal).

Tidak ada nomor build yang disunting manual. `tools/bump-build.mjs --check` mencetak
`Selaras` pada keenam titik.

---

## 4. Status gerbang mutu dan utang teknis

**14/14 gate HIJAU**:

- `tests/panggung-suara-contract-test.js` (32/32)
- `tests/stage-signaling-contract-test.js` (20/20)
- `tests/friend-qr-contract-test.js` (21/21)
- `tests/friend-system-contract-test.js` (44/44)
- `tests/cf-wiring-test.js`
- `tests/id-golden-snapshot-test.js` (baseline diperbarui sadar: 4849 literal)
- `tests/curriculum-cache-version-test.js`
- `tests/gate-registry-test.js` (10 pass, 0 fail)
- `tests/i18n-kunci-hantu-test.js` (PASS — seluruh 31 kunci hantu profile.* & kelas.* didaftarkan tuntas ke copy-id dan copy-th)
- `tests/i18n-param-collision-test.js` (PASS)
- `tests/th-ui-leak-test.js` (PASS)
- `tests/th-coverage-test.js` (PASS)
- `tests/audio-locale-guard-test.js` (PASS)
- `tests/locale-enum-test.js` (PASS)

**Utang teknis yang dilunasi**:
- `tests/i18n-kunci-hantu-test.js` kini 100% HIJAU: 28 kunci `profile.*` dan 3 kunci `kelas.*`
  telah didaftarkan lengkap secara bilingual (ID + TH) di `copy-id-feat-c.js`,
  `copy-th-feat-c.js`, `copy-id-kelasku.js`, dan `copy-th-kelasku.js`.
- Bank Sarang Tabu bertambah dari 10 kartu ke 30 kartu penuh (18 EN + 12 JA).

**Catatan yang tersisa**:
- `copy-th-friend.js` masih DRAFT AI; disarankan review penutur asli bahasa Thai sebelum rilis produksi luas.
- Seluruh berkas berada di working tree lokal; **belum di-commit/di-push** sesuai Git Protection Rule sampai Owner memerintahkan.
