# FIEZEL Audio Lane — Conditioning Transient Repair Handoff

Tanggal: 2026-08-20 WIB
Lane: audio (neural voice), dipegang MASTER
Release: `DIAG_BUILD=m025-67`, `SW_REV=m025-67-conditioning-transient-repair-20260820-1`
Base: `main@55faff0`
Status: **perbaikan pertama di lane ini yang berdiri di atas bukti perangkat, bukan hipotesis.**

## BUKTI YANG MEMBUKA SEMUANYA

Uji fisik OWNER pada m025-67 pendahulunya (m025-66), keempat arm, perangkat dan teks sama:

| Arm | Hasil |
|---|---|
| Normal | pecah berat, jeda berat |
| CONDITIONED | pecah berat, jeda berat |
| **RAW** | **pecah SEDANG, jeda sedang** |
| WAV REF | tidak berbunyi sama sekali; aplikasi menyuruh unduh ulang suara |

RAW berarti `conditionSamples()` dimatikan. Jadi **mematikan conditioning membuat suaranya lebih baik.** Itu perbedaan terukur pertama yang pernah didapat dari perangkat setelah m025-45, m025-48, dan m025-51 semuanya gagal tanpa membedakan apa pun.

## MEKANISMENYA, DIBUKTIKAN DI UNIT TEST

`findImpulses()` menandai sampel yang lompatannya ≥ 0,25 dan lebih dari 6× rata-rata lompatan di sekitarnya, lalu `conditionSamples()` menimpanya dengan rata-rata dua tetangganya.

Pada sinyal ucapan biasa — nada dasar 120 Hz + harmonik, dengan enam letupan konsonan wajar:

- keenam letupan ditandai sebagai "impuls";
- keenamnya ditimpa, satu sampel bergeser sampai **0,60**;
- puncaknya turun dari **0,45 ke 0,30**.

Itu bukan membersihkan derau. Itu memenggal serangan konsonan (t, k, p) dan menyisipkan diskontinuitas baru — persis di batas kata dan kalimat, tempat OWNER berulang kali melaporkan bunyi retak dan "suara seperti terpotong".

## YANG DIUBAH

`conditionSamples()` tidak lagi mengubah bentuk gelombang ucapan. Yang tetap dijalankan hanya yang benar-benar aman:

- NaN dan Infinity dinolkan;
- offset DC yang benar-benar bertahan sepanjang sinyal dibuang;
- headroom dijaga bila puncak melewati 0,97.

`findImpulses()` DIPERTAHANKAN sebagai alat ukur untuk telemetri A/B. Mengukur boleh; mengubah gelombang berdasarkan pengukuran itu tidak.

### Satu gate lama sengaja dibalik, bukan dilemahkan

`neural-voice-m02548-clarity-test.js` dulu menegaskan "an isolated impulse is interpolated away — one sample IS a click". Asumsi itu dibantah bukti perangkat. Kasusnya dibalik menjadi "an isolated spike is preserved — a consonant attack is not a click", dengan alasannya ditulis di tempatnya. Ini pembalikan yang disengaja dan tercatat, bukan test yang dilonggarkan supaya hijau.

## PERBAIKAN KEDUA: PEMBANDING WAV YANG TIDAK BERBUNYI

Arm WAV REF gagal total di perangkat dan aplikasi malah menyuruh mengunduh ulang suara yang sudah ada. Dua sebab, keduanya diperbaiki:

1. **iOS menolak `play()` pada elemen media yang dibuat di luar gesture pengguna.** Elemen pembanding dibuat beberapa detik setelah tombol ditekan — setelah generate selesai — jadi selalu ditolak. Sekarang tombol "PCM: WAV REF" membuka kunci satu elemen di dalam gesture itu sendiri (memutar WAV diam sangat pendek), lalu elemen yang sama dipakai ulang.
2. **Kegagalan pembanding dulu dilempar sebagai error**, dan runtime suara menyimpulkan asetnya belum siap — itulah asal perintah "unduh ulang". Sekarang pembanding yang gagal jatuh balik ke jalur normal dan mencatat alasannya di Diagnostics.

Supaya jatuh-balik itu tidak menyesatkan penguji, panel **memperingatkan secara eksplisit** bila pembanding tidak bisa dibuka: arm WAV REF yang diam-diam berjalan sebagai Normal akan menghasilkan kesimpulan yang salah.

## YANG BELUM TERJAWAB

**Jeda antar kalimat masih berat di m025-66**, padahal m025-66 sudah membawa perbaikan prefetch starvation. Jadi prefetch bukan satu-satunya penyebab dead air, atau perbaikannya belum menjangkau jalur yang dipakai audiobook. Ini lead berikutnya, dan sudah ada datanya di #87 (jeda ≈ durasi generate kalimat berikutnya; 21 ms antar chunk di dalam satu `speak()`).

**Pecah masih ada di RAW.** Conditioning memperburuk, tetapi bukan satu-satunya sumber. Karena itu pembanding WAV REF tetap penting: itu satu-satunya cara memisahkan model dari jalur pemutaran.

## UJI BERIKUTNYA UNTUK OWNER

Pada m025-67, urutan sama, catat `DIAG_BUILD` dari Diagnostics:

1. **Normal** — sekarang tanpa pemotong transien. Bandingkan dengan "pecah berat" di m025-66.
2. **WAV REF** — tekan tombolnya, baca pesan di panel: bila tertulis "Pemutar pembanding siap", arm ini sah. Bila tertulis PERINGATAN, laporkan apa adanya dan jangan pakai hasilnya.
3. **RAW** dan **CONDITIONED** — sekarang keduanya seharusnya jauh lebih mirip, karena bedanya tinggal NaN/DC/headroom. Kalau masih berbeda jauh, berarti masih ada transformasi lain yang belum ketahuan.

Laporkan juga jeda antar kalimat secara terpisah dari pecah/bersih.


---

# LANJUTAN m025-68 — Arm PLAIN BUFFER, dan koreksi atas m025-67

Release: `DIAG_BUILD=m025-68`, `SW_REV=m025-68-plain-buffer-arm-20260820-1`

## KOREKSI ATAS ALASAN m025-67

Empat dump Diagnostics dari uji m025-66 membantah sebagian alasan saya sendiri:

- `impulses: 0` pada SETIAP rekaman A/B di perangkat;
- `conditionSamples()` hanya mengubah PCM pada **1 dari 19** rekaman.

Jadi perbedaan yang OWNER dengar antara RAW dan CONDITIONED **bukan** akibat conditioning. Mekanisme yang saya buktikan di unit test nyata, tetapi tidak pernah aktif pada PCM perangkat ini. m025-67 tetap dipertahankan karena membuang transformasi yang memang bisa merusak ucapan dan tidak menghilangkan satu pun perlindungan yang penting — tetapi ia **bukan obatnya**, dan tidak boleh dicatat sebagai perbaikan crackle.

## TEMUAN TERUKUR DARI DUMP m025-66

1. **PCM model melewati batas penuh**: puncak 1.0783 (15 sampel clipped) dan 1.2227 (28 sampel clipped). Di mode RAW, PCM itu masuk WebAudio tanpa penahan dan terpotong keras.
2. **Dead air punya ukuran**: jeda `playback_done` → `playback_start` median **13,0 detik**, maksimum 32,4 detik, tetapi **0–1 ms** ketika prefetch berhasil. Durasi generate 6,1 / 27,7 / 49,9 detik. Jadi jeda itu adalah waktu generate telanjang, dan prefetch tidak mungkin mengejar karena satu potongan butuh lebih lama dibuat daripada potongan sebelumnya diputar. Ini mengarah ke M028.2 yang menaikkan cap potongan Apple 32 → 128 karakter.
3. **Dicoret dengan bukti**: tidak ada resampling (44100 = 44100), tidak ada NaN/Infinity, dan event loop tidak terblokir (`expectedDelayMs: 250` vs `observedDelayMs: 251` — meleset 1 ms, telemetri rutin).

## KENAPA ARM BARU DIBUTUHKAN

Dump `Wav ref 67` menunjukkan perbaikan gesture belum cukup: `referencePrimed: false` dan **13 dari 13** percobaan ditolak `NotAllowedError`. Sisi baiknya terbukti: **tidak ada lagi `voice_service_error`, tidak ada circuit breaker, tidak ada perintah unduh ulang** — jatuh-balik bekerja seperti dirancang.

Tetapi pembanding yang tidak pernah berbunyi tidak menjawab apa pun. Karena itu m025-68 menambah **`plainbuffer`**: PCM yang sama, lewat `AudioBufferSourceNode` polos langsung ke destination — tanpa AudioWorklet, tanpa fade, tanpa penjadwalan seam. AudioContext-nya sudah terbuka oleh alur normal aplikasi, jadi arm ini tidak punya masalah gesture sama sekali.

Selain itu, pembuka kunci elemen media kini dipasang pada **sentuhan apa pun** di halaman, bukan hanya tombol mode — sebab mode bertahan 24 jam sementara tombolnya bisa saja ditekan di sesi atau build lain. Panel juga menyatakan apakah pemutar pembanding SIAP atau BELUM.

## CARA MEMBACA HASIL m025-68

| Normal | PLAIN BUFFER | Kesimpulan |
|---|---|---|
| pecah | **bersih** | cacat ada di worklet, fade, atau penjadwalan seam — ketiganya yang dilewati arm ini |
| pecah | pecah | ketiganya tidak bersalah; tersisa PCM itu sendiri atau output perangkat |

Kalau WAV REF akhirnya berbunyi (panel menulis SIAP), ia tetap pembanding terkuat karena keluar dari Web Audio sepenuhnya.

---

# LANJUTAN m025-69 — Nada uji, dan penyempitan tersangka setelah m025-68

Release: `DIAG_BUILD=m025-69`, `SW_REV=m025-69-tone-reference-arm-20260820-1`

## HASIL UJI m025-68 (OWNER, perangkat nyata)

Teks pendek, arm Normal vs PLAIN BUFFER: **hasilnya sama persis** — "sedikit pecah", jeda 8 detik pada keduanya. Arm-nya terbukti benar-benar berjalan: 2 rekaman `playbackPath: plain_buffer` dengan `bypassed: worklet,fade,seam_scheduling`.

Teks panjang: **Normal justru LEBIH BERSIH** daripada PLAIN BUFFER, dan jedanya hanya di awal bacaan.

## APA YANG DICORET, DAN APA YANG JUSTRU TERBUKTI BERGUNA

Dicoret sebagai penyebab crackle, karena melewatinya tidak mengubah apa pun:

- AudioWorklet
- fade masuk/keluar
- penjadwalan seam

Dari telemetri yang sama, juga dicoret: sambungan antar potongan (`chunkCount: 1` — satu permintaan satu potongan), `trimmed: false`, resampling (44100 = 44100), dan clipping (0 sampel pada rekaman itu, puncak 0,535 dan 0,301).

**Terbukti berguna, dan tidak boleh dibuang:** penjadwalan seam. Pada teks panjang, membuangnya membuat suara lebih buruk — persis yang OWNER dengar. Arm PLAIN BUFFER sengaja membuangnya; degradasi itu hasil yang diharapkan, bukan cacat baru.

**Jeda sudah jauh membaik:** dari median 13 detik di m025-66 menjadi sebagian besar 0–1 ms, dengan sisa jeda hanya di awal bacaan (waktu generate potongan pertama, ~6 detik). Perbaikan prefetch m025-66 bekerja.

## TERSANGKA YANG TERSISA: DUA

1. PCM yang dihasilkan model.
2. Tahap keluaran audio perangkat/PWA.

`toneref` memisahkan keduanya. Ia memutar sinyal yang dibuat FIEZEL sendiri — nada 150 Hz dengan harmonik dan amplop suku kata, puncak 0,50, deterministik — lewat jalur buffer polos yang sama. Model tidak dilibatkan sama sekali.

| Nada uji | Kesimpulan |
|---|---|
| terdengar **pecah** | keluaran perangkat/PWA yang bermasalah; model dan kode kita tidak bersalah |
| terdengar **bersih** | jalur keluaran sehat, jadi cacatnya ada pada PCM yang dihasilkan model |

Gate mengunci nada ini deterministik, tidak pernah mendekati clipping, dan benar-benar tidak berasal dari PCM model (diuji dengan memberi PCM model yang diam total).
