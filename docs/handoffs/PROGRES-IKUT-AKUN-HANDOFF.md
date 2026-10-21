# Progres ikut akun — Sprint 1 Lapis 0 (m025-464)

Wewenang: OWNER, 4 Oktober 2026. Keputusan owner: **sinkron progres menyala otomatis
setelah izin orang tua/wali tercatat**; murid/ortu tetap bisa mematikan dan menghapus.

## Masalah

Strategi "kebutuhan pokok" bertumpu pada nilai yang menumpuk di akun murid. Kenyataannya,
sebelum build ini:

1. Progres hanya ada di ponsel. `brainSyncFlush` baru tersambung pagi ini (audit F2), tetapi
   `preferences.brainSync` bawaan `false` dan **tidak ada satu pun tombol** yang menyalakannya.
2. `brainSyncPull/Rebuild/ApplyRebuild` sudah ditulis tetapi **tidak punya pemanggil**.
3. `/api/brain/*` lewat `coreWorkerExec` jatuh ke jalur Puter lama, yang tidak membawa cookie akun.
4. Server menyimpan JSON apa pun dan menelan galat tulis lalu tetap menjawab `success:true`.
5. Lembar privasi sekolah menjanjikan "riwayat belajar tidak pernah sampai ke server" dan
   "tidak ada akun", padahal laporan tugas KelasKu sudah mengirim `w[]` (soal salah + pilihan
   jawaban) dan login Google menyimpan email.

## Yang dikerjakan

| Bagian | Berkas |
|---|---|
| Server menyaring dengan allowlist yang kembar dengan klien, menulis lewat `batch`, jujur saat gagal (503), melaporkan `recorded/accepted/rejected` | `workers/api/route-legacy.js` (`projectBrainAttempt`, `BRAIN_ATTEMPT_FIELDS`) |
| Rute hapus `POST /api/brain/attempts/delete` (hanya baris milik `sub` cookie) | `workers/api/route-legacy.js`, `workers/api/schema.js` |
| Transport `/api/brain/attempts*` langsung ke Worker CF dengan cookie akun (bukan jalur Puter, yang tidak membawa cookie). Peta rollout `CF_ENDPOINT_ROUTES` sengaja TIDAK disentuh | `app.js` `progressSyncFetch` |
| Syarat sinkron: izin tercatat (atau `brainSync:true` manual), tidak dimatikan, sesi akun murid | `app.js` `brainSyncEnabled`, `progressSyncConsented`, `progressSyncSignedIn` |
| Pagar akun lain di HP yang sama (antrean dicap pemilik) | `progressSyncOwner`, `progressSyncOwnerOk` |
| Status jujur: waktu "tersimpan" hanya dari jawaban server yang ok | `progressSyncStatus`, `progressSyncStatusText` |
| Tawaran pulihkan di HP baru (pratinjau dulu, tidak diam-diam) | `progressSyncRestoreOffer` (dipanggil saat app dibuka & sesudah izin) |
| Kartu Pengaturan → Data: izin (wali / 18+), matikan/nyalakan, hapus dari server (dua ketuk) | `progressSyncSettingsMarkup` |
| Naskah dwibahasa `sinkron.*` | `features/i18n/copy-{id,th}-google.js` |
| Lembar privasi + formulir izin dibuat jujur | `docs/pilot/LEMBAR-PRIVASI-SEKOLAH.md`, `docs/pilot/IZIN-ORANG-TUA.md` |
| Panduan wawancara guru | `docs/pilot/WAWANCARA-GURU.md` |
| Gerbang | `tests/progress-sync-test.js` |

## Peta: apa yang ikut akun, apa yang belum

| Data | Ikut akun? | Catatan |
|---|---|---|
| Catatan latihan (kode soal, benar/salah, waktu, kesulitan, kode miskonsepsi) | **Ya** | Allowlist `fiezel-attempt-record-v1`; server menolak field lain |
| Penguasaan per materi (BKT) | **Ya, dihitung ulang** | Diputar ulang dari catatan latihan saat dipulihkan |
| Ledger miskonsepsi | **Ya, dihitung ulang** | Sama |
| Kelas, tugas guru, teman | Ya (sudah sebelumnya) | Lewat `sub` akun di tabel kelas/sosial |
| Streak, hari belajar, gems, Prasasti, sertifikat | **Belum** | Utang Sprint 1b — butuh ringkasan profil kecil berallowlist |
| Jadwal ulang kosakata/grammar/reading (`state.vocab/grammar/reading`), level & penempatan | **Belum** | Utang Sprint 1b; sementara murid bisa memakai backup berkas terenkripsi |
| Kalimat soal, jawaban tertulis, transkrip, audio | **Tidak akan** | Dilarang allowlist, dijanjikan di lembar privasi |

Batas lain yang jujur: `GET /api/brain/attempts` mengembalikan **1.000 catatan terbaru**.
Murid dengan riwayat lebih panjang mendapatkan penguasaan yang dihitung dari 1.000 itu saja.

## Kontrak yang wajib dijaga

1. **Tidak ada sinkron tanpa izin.** Tanpa `progressSyncConsent` (atau `brainSync:true`
   eksplisit) tidak ada permintaan jaringan. `brainSync:false` selalu menang.
2. **Lencana hijau hanya dari server.** `lastPushedAt`/`lastCheckedAt` hanya ditulis sesudah
   `r.ok`. Jangan menulisnya secara optimistis.
3. **Allowlist kembar.** `BRAIN_ATTEMPT_FIELDS` (server) = `ALLOWED` (klien). Menambah field
   berarti mengubah keduanya **dan** lembar privasi sekolah.
4. **Pulihkan selalu lewat pratinjau.** `brainSyncApplyRebuild` hanya dipanggil dari tombol.
5. **Satu HP, satu pemilik antrean.** Akun lain yang masuk tidak mengirim/menggabung riwayat
   pemilik sebelumnya.

## Belum dikerjakan (Sprint 1b)

- Streak/gems/Prasasti/jadwal ulang/level ikut akun (lihat peta).
- Formulir izin digital (sekarang: kertas + pernyataan di aplikasi).
- Rute hapus untuk data `tc_class_report` milik murid (sekarang lewat permintaan sekolah).
