# Audit ketahanan data offline → online (lokal → Cloudflare) — 2026-10-04

**Basis:** branch `claude/inspiring-franklin-xml8hz` @ `cce82e55` (build `m025-442`; jalur simpan &
sinkron identik dengan `main` @ `1dff4b6d`). **Pertanyaan owner:** murid menyelesaikan dua sesi
latihan saat internet putus, lalu tersambung lagi — apakah skor, gem, dan riwayat BrainCore
tersimpan utuh, tanpa hilang atau tertimpa?

**Bukti yang bisa diulang:** `node tools/dev/offline-sync-audit-2026-10-04-probe.js` — `index.html`
sungguhan di Chromium. Berkas app disajikan `page.route`; Worker Cloudflare
(`https://api.fiezel.my.id`) ditiru di route yang sama: saat "offline" setiap request ke sana
digagalkan (`internetdisconnected`) **dan** `context.setOffline(true)` membuat `navigator.onLine`
serta event `online`/`offline` nyata; saat online, setiap POST dicatat lalu dijawab 200. Sesi
dijawab benar sampai layar hasil (soal pilihan ganda, susun kata, dan video-grammar).

---

## 1. Peta penyimpanan

| Data | Disimpan di | Ke Cloudflare lewat |
|------|-------------|---------------------|
| Riwayat jawaban, skor sesi, level, mastery, jadwal ulangan, **gem** (`state.gems`) | SATU blob JSON di `localStorage` per akun (`saveFlushWrite`, `app.js:1760`) | — (gem tidak punya endpoint sama sekali) |
| BKT per lesson | `localStorage` (kunci sisi) | — |
| Bukti BrainCore teragregasi (Lane C) | IndexedDB `fiezel-braincore-evidence-v1` | `POST /api/braincore/evidence` |
| Bukti BrainCore per murid (Lane D) | IndexedDB `fiezel-braincore-learner-evidence-v1` | `POST /api/braincore/learner-evidence` |
| Ringkasan aktivitas (untuk pengingat push) | dihitung dari state | `POST /api/activity` |
| Hasil kebijakan sesi adaptif | `state.policyOutcomeMeta.queue` (maks 10) | `POST /api/policy/outcome` |
| Riwayat percobaan BrainCore (proyeksi) | riwayat state = antrean | `POST /api/brain/attempts` — **lihat F2** |

---

## 2. Vonis singkat

**Offline sendiri aman; yang berbahaya adalah dua tab dan satu jalur sinkron yang tidak pernah
jalan.**

- Dua sesi offline (20 jawaban benar, 2 sesi, **6 gem**, mastery 3 lesson, BKT 3 lesson, satu
  event di tiap antrean IndexedDB) **tersimpan utuh** dan **identik sesudah halaman dimuat ulang**
  (O1, O2). Saat tersambung lagi, kedua antrean IndexedDB bukti BrainCore **terkirim sendiri**
  tanpa sesi baru dan kosong sesudahnya; data lokal tidak berkurang (O3, O5).
- **Dua tab saling menimpa**: tab A menyelesaikan sesi (5 jawaban, 2 gem), tab B yang dibuka
  lebih dulu menyimpan satu perubahan kecil — dan seluruh kemajuan tab A **hilang** (O6).
- **Riwayat percobaan BrainCore tidak pernah dikirim**: `brainSyncFlush()` didefinisikan tetapi
  tidak dipanggil di mana pun (O4: 0 request ke `/api/brain/attempts`).

---

## 3. Ringkasan temuan

| ID | Tingkat | Temuan | Bukti |
|----|---------|--------|-------|
| F1 | **Tinggi** | Dua tab/jendela menimpa blob state satu sama lain (tanpa cek revisi, tanpa event `storage`): riwayat, sesi, dan gem hilang | O6 |
| F2 | **Tinggi** | `brainSyncFlush()` / `brainSyncPull()` tidak pernah dipanggil — sinkron riwayat percobaan ke `/api/brain/attempts` mati total | O4, kode |
| F3 | Sedang | Antrean sinkron itu, bila dihidupkan, macet sesudah ±350 baris riwayat: daftar "terkirim" dipotong 300 id dan pemindaian mulai dari baris tertua | kode |
| F4 | Sedang | Ringkasan aktivitas tidak dikirim ulang saat tersambung — server (pengingat push) tetap mengira murid tidak belajar sampai sesi online berikutnya | O3 |
| F5 | Rendah | Antrean hasil kebijakan tidak di-flush saat `online`, hanya saat hasil berikutnya lahir; plafon 10 membuang yang tertua | kode |
| — | Bersih | Data lokal (riwayat, skor, gem, mastery, BKT) utuh lintas offline + muat ulang; antrean IndexedDB bertahan dan terkirim saat `online` | O1, O2, O3, O5 |

---

## 4. Yang terukur

**O1 — dua sesi offline.** Sebelum: riwayat 0, gem 0. Sesudah: riwayat **20** (20 benar), sesi
**2**, gem **6** (3 entri buku gem), mastery 3 lesson = 100, BKT 3 lesson, antrean IndexedDB
Lane C = 1 dan Lane D = 1. Empat request ke Worker digagalkan selama itu tanpa satu pun galat
yang terlihat murid.

**O2 — muat ulang.** Riwayat, benar, sesi, gem, antrean: **identik**.

**O3 — tersambung lagi, tanpa sesi baru (6 detik).** Terkirim: `/api/braincore/evidence`,
`/api/braincore/learner-evidence` (masing-masing didahului `/api/auth/anon`), dan
`/api/social/rank/evidence` — dipicu listener `online` (`app.js:17453`). **Tidak** terkirim:
`/api/activity` dan `/api/brain/attempts`.

**O4 — satu sesi baru saat online.** Terkirim `/api/activity` dengan `totalAnswered: 40` —
ringkasan kumulatif, jadi jawaban offline ikut terhitung (tidak hilang, hanya terlambat).
`/api/brain/attempts`: **0**.

**O5 — lokal sesudah sinkron.** Riwayat 40, sesi 3, gem 10, antrean IndexedDB kosong (terkirim).
Tidak ada yang berkurang; tidak ada data server yang menimpa lokal.

**O6 — dua tab.** Tab A: riwayat 0→5, gem 0→2, sesi selesai. Tab B (dibuka sebelum A belajar)
memanggil satu `save()`. Dibuka ulang: riwayat **0**, sesi **0**, gem **0**. `saveFlushWrite`
menulis seluruh blob dari memori tab itu; `stateRevision` dinaikkan tetapi tidak pernah
dibandingkan, dan `app.js` tidak punya listener `storage` untuk state (satu-satunya ada di
`features/notify/fiezel-inbox.js`). Di HP ini terjadi saat PWA terpasang dan tab browser sama-sama
terbuka, atau dua tab sekolah di komputer lab.

**F2 — dari kode.** `brainSyncFlush` (`app.js:4095`), `brainSyncPull`, `brainSyncRebuild`,
`brainSyncApplyRebuild` tidak punya pemanggil di `app.js` maupun `features/**`. Prasyaratnya juga
opt-in (`state.preferences.brainSync===true` + akun + Worker).

**F3 — dari kode.** `brainSyncPending` memindai `state.history` (maks 1.000 baris) dari yang
TERTUA dan melewati id di `sent`; `brainSyncFlush` menyimpan `sent` dipotong `.slice(-300)`. Begitu
riwayat > ±350 baris, id yang terkirim tujuh batch lalu jatuh dari `sent`, baris tua itu dianggap
belum terkirim lagi, dan setiap flush (50 baris) mengirim ulang baris tua — baris terbaru tidak
pernah tercapai. Server idempoten per `attemptId`, jadi tidak ada duplikat; yang hilang adalah
bukti baru.

**F4/F5 — dari kode.** `syncRemoteLearningActivity` (`app.js:6979`) hanya dipicu
`queueRemoteActivitySync()` di akhir sesi; listener `online` tidak memanggilnya.
`flushPolicyOutcomeQueue` (`app.js:3127`) hanya dipanggil dari `queuePolicyOutcomeSync`
(hasil BARU); antrean `.slice(-10)`. Hasil kebijakan hanya lahir di sesi adaptif (`policyId`),
jadi probe sesi kilat tidak menyentuhnya.

---

## 5. Rekomendasi

1. **F1** — sebelum menulis, baca `stateRevision` yang tersimpan; bila lebih baru dari milik tab
   ini, gabungkan (riwayat per `attemptId`, gem per entri buku, sesi per id) atau muat ulang
   dulu; tambahkan listener `storage` yang memuat ulang state saat tab lain menulis. Minimal:
   kunci satu-tab (`BroadcastChannel`/Web Locks) dengan pesan "FIEZEL terbuka di tab lain".
2. **F2/F3** — putuskan: hidupkan sinkron (panggil `brainSyncFlush` di akhir sesi dan di `online`,
   pindai dari yang TERBARU atau simpan penanda waktu terakhir terkirim, bukan daftar id yang
   dipotong) atau hapus kodenya supaya tidak ada yang mengira riwayat BrainCore sudah di server.
3. **F4/F5** — listener `online` juga memanggil `queueRemoteActivitySync()` dan
   `flushPolicyOutcomeQueue()`.
4. **Gem** hanya hidup di perangkat. Bukan bug offline, tetapi berarti gem hilang bila perangkat
   hilang/dibersihkan — perlu keputusan produk.
