# Handoff m025-236 — Bukti belajar per-murid TERSINKRON OTOMATIS (gerbang persetujuan dihapus)

**Kewenangan: OWNER.** Keputusan diambil 2 Sep 2026, beberapa jam sesudah lane per-murid
menyala di produksi (m025-234). Dokumen ini menggantikan §4 handoff m025-230 pada bagian
persetujuan; sisa handoff itu tetap berlaku.

## Status

**SELESAI DI KODE, MENUNGGU RILIS.** Semua sakelar server sudah hidup sejak m025-234
(migrasi 0009/0010 jalan, KV terisi, `FEATURE_LEARNER_EVIDENCE="on"`). Yang berubah di
rilis ini murni di sisi izin: lane tidak lagi menunggu murid menyalakan apa pun.

## 1. Keputusan, dan alasan yang diberikan Owner

Sampai m025-234 lane per-murid menuntut persetujuan tiap murid: sakelar di **Pengaturan →
Bukti belajar per murid**, bawaan mati, dan server menjawab **403 `consent_required`**
tanpa baris aktif di `learner_evidence_consent`.

Owner menghapus syarat itu, dengan alasan yang dicatat apa adanya karena ia yang membuat
keputusannya bisa dinilai orang lain: FIEZEL adalah aplikasi kelas; guru memberitahu seluruh
muridnya sebelum mereka memasang; bukti belajar ini adalah data guru; dan yang disimpan
hanya nama serta ringkasan belajar berbucket — bukan isi jawaban, bukan riwayat soal.

Konsekuensi yang disengaja: **murid tidak punya sakelar untuk menolak.** Dokumen ini tidak
menyebutnya "opt-out", tidak menyebutnya "persetujuan tersirat", dan tidak menaruh kalimat
penenang di naskah perkenalan yang seolah-olah menawarkan pilihan. Yang ada: pemberitahuan
guru di kelas, di luar aplikasi.

## 2. Yang berubah

| Berkas | Perubahan |
|---|---|
| `workers/api/evidence/route-learner-evidence.js` | `learnerGate()` tidak lagi memeriksa persetujuan; POST bukti hanya butuh identitas + tiga sakelar server |
| `app.js` | `identityEvidenceActive()` = mode saja; sakelar Pengaturan, `setLearnerEvidenceConsent()`, `identityEvidenceSyncConsent()`, dan preferensi `learnerEvidenceConsent` **dihapus**; ditambah `window.forgetLearnerEvidence()` |
| `features/i18n/copy-{id,th}-app-d.js` | lima naskah sakelar persetujuan dihapus (id + th, tetap sepadan) |
| `BRAIN-DATA-PRIVACY.md`, `docs/D1-RETENTION.md` | naskah privasi & retensi ditulis ulang mengikuti keadaan baru |
| `braincore-learner-identity-test.js` | assert persetujuan DIBALIK, bukan dihapus (§4) |
| build | m025-234 → **m025-236** lewat `tools/bump-build.mjs` |

## 3. Yang TIDAK ikut dilonggarkan

Menghapus satu pagar bukan alasan menghapus sisanya, dan ini yang membuat lane ini masih
bisa dipertanggungjawabkan sesudah keputusan di §1:

- **Identitas tetap dari server.** Perangkat tidak pernah mengirim `sub`; ia hanya membawa
  cookie `fz_id` (HttpOnly, HMAC) dan server menurunkan identitasnya sendiri. Body yang
  menitipkan `sub`/`userId`/`cohort` tetap ditolak **400 `foreign_field`**.
- **Yang keluar perangkat tetap bucket berenum tertutup** — mastery, tren, miskonsepsi,
  kalibrasi, keputusan Braincore. Bukan jawaban, bukan teks soal, bukan riwayat, bukan IP,
  bukan sidik perangkat.
- **Tiga sakelar server tetap sepakat-atau-tolak**, dan flag tak terbaca tetap = tolak.
  Owner masih bisa mematikan seluruh lane dalam ≤60 detik lewat KV.
- **Retensi tetap 180 hari**, purge tetap jalan di cron 00:05 WIB. Sesudah sakelar hilang,
  ia satu-satunya batas otomatis yang tersisa — jadi menaikkannya bukan lagi perubahan kecil.
- **Penghapusan atas permintaan tetap ada.** `POST /api/braincore/learner-evidence/consent`
  `{granted:false}` menghapus bukti murid itu; di klien ia dipapar sebagai
  `window.forgetLearnerEvidence()` tanpa UI. Ia **sekali jalan**: tulisan berikutnya dari
  murid yang sama diterima lagi.

## 4. Gerbang: assert dibalik, bukan dihapus

`braincore-learner-identity-test.js` — **178/178**. Empat assert berubah dengan sadar:

1. `(F) tanpa persetujuan -> 403 consent_required` → **`(F) tanpa persetujuan pun bukti
   TETAP tercatat`**. Perubahan sebesar "murid tidak lagi punya sakelar" harus terbaca di
   gerbang, bukan hanya di komentar.
2. `(F) sesudah dicabut, tulisan berikutnya ditolak 403` → **`sesudah dihapus, tulisan
   berikutnya DITERIMA lagi`** — supaya tidak ada yang menyangka `{granted:false}` mematikan
   lane untuk murid itu selamanya.
3. `(F) klien: lane aktif bila mode != off DAN murid menyetujui` → **`aktif dari MODE saja`**,
   ditemani assert kedua: **NOL sisa sakelar persetujuan di `app.js`**. Yang kedua itu yang
   menjaga supaya sakelarnya tidak kembali setengah (fungsi ada, panggilan hilang).
4. Ditambah **`jalur HAPUS bukti per murid tetap ada`** — pagar yang tersisa harus punya
   gerbangnya sendiri, kalau tidak ia hilang di refactor berikutnya tanpa satu pun tes merah.

`id-golden-baseline.json` di-regenerate: 2.142 → 2.131 literal. Selisihnya persis lima
naskah sakelar persetujuan + lima nama kuncinya + dua pseudo-literal komentar; nol teks
murid lain hilang.

Suite penuh `quality.yml` hijau kecuali `tools/fiezel-health-probe.mjs` (probe jaringan,
proxy sandbox menjawab 403) dan `analytics-client-test.js` (flaky, merah juga di `main`).

## 5. Langkah berikut (OWNER)

1. Merge PR ini.
2. Jalankan `deploy-api-worker.yml` (server berhenti menuntut persetujuan).
3. Jalankan `deploy-site.yml` (shell m025-236).
4. Murid yang **sudah** memasang PWA: tidak perlu melakukan apa pun. Begitu shell baru
   sampai (kartu pembaruan / buka-tutup aplikasi), perangkatnya mulai mengirim sendiri —
   maksimum sekali sehari per perangkat, jadi angka pertama muncul dalam hitungan jam.
5. Panel **owner.fiezel.my.id → Murid per orang** akan mulai terisi tanpa tindakan murid.

## 6. Utang terbuka

- **Naskah perkenalan tidak menyebut lane ini.** Ia menyebut nama ikut ke akun FIEZEL
  (m025-230) tetapi tidak menyebut bahwa progres belajarnya terbaca guru. Owner memilih
  memberitahukannya di kelas, di luar aplikasi. Kalau suatu saat FIEZEL dipakai di luar
  kelas yang gurunya memberi pemberitahuan itu, kalimat itu harus masuk ke aplikasi —
  dicatat di sini supaya keputusannya tidak hilang bersama sesi ini.
- `window.forgetLearnerEvidence()` tanpa UI: hanya bisa dijalankan dari konsol di perangkat
  murid yang bersangkutan. Jalur hapus dari sisi Owner Dashboard masih belum ada (utang yang
  sama dengan m025-230 §8).
