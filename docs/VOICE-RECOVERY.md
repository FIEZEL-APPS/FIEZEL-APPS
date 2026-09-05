# Pemulihan suara lokal

Panduan mengembalikan mesin suara **di perangkat** kalau suatu saat jalur server tidak
lagi cocok. Ditulis supaya keputusan m025-100 bisa dibatalkan tanpa menebak-nebak apa
yang dulu ada di sana.

## Apa yang dihapus, dan kenapa

`vendor/kokoro-js`, `vendor/kokoro-model`, dan `vendor/supertonic-3` — total **265 MB** —
dihapus pada m025-100. Sebelumnya, pada m025-95, `vendor/sherpa-vits` dan
`vendor/sherpa-vits-id` (197 MB) sudah lebih dulu dihapus; keduanya memang sudah pensiun
sejak m025-42 dan tidak dirujuk apa pun.

Alasannya bukan karena modelnya buruk, melainkan karena dua masalah yang melekat pada
inferensi di perangkat dan tidak bisa ditambal dari sisi kode:

1. **Pengguna wajib mengunduh ratusan megabita sebelum aplikasi bisa bicara.** Sheet
   unduhan tanpa tombol "nanti" adalah titik tempat pengguna berhenti di onboarding.
2. **Keluarannya pecah di akhir kalimat dan di sambungan antar potongan.** Ini ditambal
   berlapis selama belasan milestone — worklet, fade, penjadwalan seam, prefetch — dan
   tiap lapis menambal gejala lapis sebelumnya. Bug-nya bergeser, tidak pernah selesai.

Probe di `tools/puter-tts-probe.html` dan `tools/puter-tts-prosody-probe.html` dijalankan
OWNER pada perangkatnya sendiri dan mencatat: cracking **hilang** begitu render pindah ke
server, dan dari enam konfigurasi hanya engine `generative` dengan teks apa adanya yang
dinilai bagus.

## Cara mengembalikannya

Riwayat git menyimpan semuanya. Tidak ada yang perlu diunduh ulang dari pihak ketiga.

```bash
# 1. Ambil kembali berkas modelnya dari commit sebelum penghapusan.
#    Nomor commit tepatnya ada di VENDOR-VOICE-INVENTORY.json -> retiredAtCommit.
git checkout <retiredAtCommit>~1 -- vendor/kokoro-js vendor/kokoro-model vendor/supertonic-3

# 2. Kembalikan pula lapisan kodenya. Semua ada di PR yang sama.
git log --oneline --all -- features/neural-voice/fiezel-neural-voice-bootstrap.js
```

Verifikasi hasilnya terhadap `VENDOR-VOICE-INVENTORY.json`: berkas itu mencatat jumlah
berkas, total bita, dan dua belas berkas terbesar tiap bundel. Kalau angkanya cocok,
yang kembali persis yang dulu ada.

`NEURAL-VOICE-SOURCE-LOCK.json` menyimpan asal-usul yang lebih dalam — versi dependensi,
sha256 model, dan versi emcc — dan sengaja **tidak** ikut dihapus justru untuk keperluan
ini.

## Yang perlu disambung ulang

Mengembalikan berkas saja tidak cukup; jalur pemanggilnya sudah dialihkan. Yang menunjuk
ke pintu bicara bersama (`FiezelVoiceSay`) dan perlu diarahkan ulang ke
`FiezelVoiceRuntime`:

| Berkas | Yang dialihkan |
|---|---|
| `app.js` | `AudioService`, `classroomSpeak`, Skills Lab, tombol tes suara |
| `features/library/fiezel-library-ui.js` | narasi audiobook dan tombol tanya |
| `features/tutor-classroom/fiezel-tutor-v3.js` | `speak(pair)` |
| `features/tutor-classroom/fiezel-tutor-voice-chat.js` | jawaban tutor |
| `features/speaking-listening/fiezel-speaking-listening-addon.js` | `play()` |

Gerbang unduhan (`fiezel-voice-bundle-gate.js`) dan penjaga runtime
(`fiezel-m0281-runtime-guard.js`) juga sudah dihapus dan perlu diambil kembali kalau
unduhan wajib mau dihidupkan lagi.

## Sebelum memutuskan mengembalikannya

Dua hal yang sebaiknya dicek dulu, karena keduanya lebih murah daripada membawa kembali
265 MB:

- **Kalau masalahnya jaringan**, ingat bahwa audio yang sudah dirender **disimpan
  permanen** di perangkat (`fiezel-puter-voice-v1` di Cache Storage). Kalimat yang pernah
  diputar tidak pernah diminta ulang, jadi materi yang sering diulang sudah berperilaku
  seperti offline.
- **Kalau masalahnya kualitas**, engine dan suaranya adalah satu baris konstanta di
  `features/neural-voice/fiezel-puter-voice.js`. Mencoba konfigurasi lain jauh lebih
  murah daripada mengembalikan seluruh mesin lokal.

## Yang sengaja tetap ada

`speechSynthesis` bawaan perangkat masih dipakai sebagai cadangan terakhir di
`AudioService`. Suaranya kalah jauh, tetapi bacaan yang dibuka saat sinyal hilang akan
diam sepenuhnya tanpa itu — dan diam total lebih buruk daripada suara seadanya.
