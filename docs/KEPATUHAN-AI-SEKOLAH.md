# Kepatuhan pemakaian AI di sekolah (R8)

Wewenang: OWNER, 5 Oktober 2026 (rencana induk `docs/STRATEGI-SEKOLAH-INDONESIA-2026.md`, R8).
Acuan: SKB tujuh menteri tentang pemanfaatan AI dan teknologi digital di dunia pendidikan
(tautan di bagian Sumber dokumen strategi). Dokumen ini tidak menafsirkan pasal; ia mencatat
empat prinsip yang dipakai sekolah untuk menilai sebuah aplikasi, dan bagaimana FIEZEL
memenuhinya. Gerbang: `tests/kepatuhan-ai-sekolah-test.js`.

## 1. AI tidak dipakai untuk mengerjakan tugas yang dinilai

| Keadaan | Perilaku | Di mana |
|---|---|---|
| Ujian (penempatan, naik level, ujian membaca/menyimak/berbicara/menulis, ujian dari guru) | Semua pintu AI tertutup | `FiezelExamLock` (sudah ada sejak m025-269) |
| **Tugas latihan dari guru** (baru) | AI juga tertutup selama runner tugas terbuka, karena hasilnya masuk rekap, Rapor KKTP, dan analisis butir | `startRunner` di `features/class-hub/fiezel-class-hub.js` |
| Misi yang dipilih sendiri murid | AI tetap boleh membantu (bukan tugas guru) | sama |
| Penjagaan terpusat (baru) | Penjelasan soal, kamus kata, tutor suara, dan Tanya Pustaka dulu memanggil model TANPA melewati gerbang pintu. Kini `askFiezelAIResult` sendiri menolak selama kunci berdiri; yang lolos hanya AI yang **menilai** karya murid (`writing_feedback`) dan rekap sesi | `AI_TASKS_SAAT_DINILAI` di `app.js` |

Kabar untuk murid menyebut keadaannya dengan jujur: "selama kamu mengerjakan tugas dari guru"
untuk tugas, "selama sesi ujian" untuk ujian (`examLockNotice`).

## 2. Jawaban AI diberi label

| Permukaan | Label |
|---|---|
| Tanya FIEZEL | "Dibuat oleh AI — bisa keliru…" + keterangan data (`ask.disclosure`) |
| Pembimbing PAW | Label yang sama di bawah jawaban yang datang dari AI |
| Tanya di Pustaka | Label yang sama di bawah jawaban yang datang dari AI |
| Penjelasan soal & kata | Modal bertanda "FIEZEL AI" |
| Umpan balik tulisan | Keterangan `tulis.disclosure` |

Jawaban **terdegradasi** (disusun dari materi saat AI tidak tersedia) dan jawaban mesin lokal
**tidak** diberi label AI — label yang salah sama menyesatkannya dengan label yang hilang.

## 3. Guru tetap penentu nilai

- Deskripsi Rapor KKTP disusun dari templat dan bukti jawaban, **bukan** dari AI, dan selalu bisa
  disunting guru sebelum disalin ke e-Rapor (`features/teacher/fiezel-rapor-kktp.js`).
- Analisis butir, nilai kertas, dan rekap adalah hitungan biasa; tidak ada model di jalurnya.

## 4. Data murid

- Latihan bicara privat (R7) tidak merekam suara dan tidak menyimpan transkrip.
- Tanya FIEZEL mengingatkan murid untuk tidak memasukkan data pribadi.
- Laporan ke guru hanya membawa nama depan, akurasi per keterampilan, dan bukti per soal.

## Belum

- Tutor suara (`features/tutor-classroom/fiezel-tutor-voice-chat.js`) mengucapkan jawabannya;
  label tertulis untuk jawaban yang diucapkan belum ada.
- Sekolah mungkin meminta pernyataan tertulis (surat) — dokumen ini bahannya, bukan suratnya.
