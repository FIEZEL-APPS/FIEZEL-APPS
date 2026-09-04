# Suara di gelombang m025-246 — status & handoff

Dokumen ini kontrak serah-terima untuk perubahan yang menyentuh `features/neural-voice/`
pada gelombang m025-246 (penyederhanaan pengalaman). Siapa pun yang melanjutkan cukup
membaca berkas ini dan menjalankan satu gerbang.

**Otoritas: OWNER.** Dua keputusan di bawah dibuat OWNER pada 4 Sep 2026 dan MEMBALIK
keputusan yang dibuat sehari sebelumnya di brief yang sama. Jangan membaliknya lagi tanpa
OWNER — keduanya sudah dibalik sekali, dan kode + gerbangnya sekarang menegakkan versi
terakhir.

## Status

| Hal | Status |
|---|---|
| Unduhan paket suara latar (152 MB) | **TIDAK DISENTUH** — kembali seperti m025-236 |
| TTS peramban (`speechSynthesis`) | **MATI TOTAL** — dilarang gerbang |
| Penolakan Kokoro di perangkat RAM kecil | **BARU** — aktif |
| Tangga suara L1→L2→L3→L5 | tidak diubah satu keputusan pun |

## 1. Unduhan paket suara: jangan disentuh

OWNER: *"unduhan suaranya biarkan diunduh secara diam-diam di background, jangan kamu
sentuh."*

Baris brief 3 Sep berbunyi "gerbang paket suara 119 MB — pindah ke Pengaturan". Itu dibaca
terlalu jauh: unduhan LATAR (m025-236, menyala di boot pertama untuk semua murid tanpa
bertanya) sempat diubah jadi opt-in dengan sakelar di Pengaturan. Yang diminta hanya
GERBANG-nya — layar yang menahan murid sampai ia mengunduh — dan gerbang itu memang sudah
tidak ada sejak m025-96.

`armOfflineVoiceAutoload()` sekarang berjalan **tanpa melihat bendera atau preferensi apa
pun**. `voicePackOptIn` / `voicePackAsked` dicabut dari `defaultPreferences` dan sanitizer.

**Dijaga:** `ux-flags-test.js` T6b — MERAH kalau ada yang memagari unduhan latar itu lagi
dengan bendera atau opt-in.

Ongkos datanya (152 MB) tetap ongkos nyata dan tetap diterima OWNER secara sadar; catatan
kuotanya ada di kepala `features/neural-voice/fiezel-voice-offline-autoload.js`.

## 2. TTS peramban: mati total

OWNER: *"aku ga mau lagi ada tts browser, tts browser harus mati total."*

Brief 3 Sep meminta "suara peramban" sebagai salah satu jalan keluar saat audio soal dengar
gagal, dan jalur itu sempat dipasang sebagai tombol di dua mesin (`app.js` dan
`features/speaking-listening/fiezel-speaking-listening-addon.js`). Dicabut seluruhnya.

Alasan teknis yang membuat pencabutan ini benar, bukan sekadar menurut: penyebab
"dua suara sekaligus" yang mencabut L4 di m025-232 belum berubah satu pun —
`speechSynthesis` punya antrean **global** milik peramban yang tidak ikut berhenti saat
pemutar kita berhenti.

**Dijaga:** `audio-locale-guard-test.js` — SETIAP sebutan `speechSynthesis` /
`SpeechSynthesisUtterance` di zona audio (`features/neural-voice`, `features/audio`,
`features/audio-assets`, `workers/api/tts`) MAUPUN di `app.js` memerahkan gerbang. Komentar
yang menjelaskan pencabutannya tetap boleh menyebut namanya — yang dilarang KODE.

Kalau seluruh tangga suara gagal, jawabannya tetap **L5: DIAM, teks tetap terbaca**. Di
layar soal dengar murid punya dua jalan keluar yang tidak butuh suara sama sekali: coba
lagi, dan lewati tanpa penalti (dan "tanpa penalti" benar di aritmetikanya — soal yang
dilewati keluar dari penyebut akurasi lewat `cfg.__noAudioSkips`).

## 3. Kokoro ditolak di perangkat RAM kecil

OWNER (edge case wajib): *"Android low-end: Kokoro WASM bisa mematikan tab — sintesis tidak
boleh memblokir."*

Mesin UTAMA (supertonic/sherpa) menjalankan seluruh model di dalam Worker khusus, jadi
thread utama tidak pernah memegang panggilan WASM panjang — itu alasan struktural kenapa ia
tidak mematikan tab. Cabang Kokoro adalah jalur LAMA yang hanya terpakai kalau adapter
sherpa tidak ada, dan ia mengompilasi serta menjalankan WASM di jalur yang bisa membuat
proses konten dihentikan OS.

`fiezel-neural-voice-bootstrap.js` sekarang **menolak** cabang itu bila
`navigator.deviceMemory ≤ 2` atau `navigator.hardwareConcurrency ≤ 2`. Ambangnya
konservatif dan hanya membaca sinyal yang MEMANG ADA: nilai yang tidak diketahui TIDAK
dihitung sebagai kelas bawah, karena menolak mesin suara karena satu API yang absen akan
membisukan perangkat yang sebenarnya sanggup.

Menolak bukan berarti murid kehilangan suara: L1 (aset R2/ElevenLabs) dan L2 (mesin Puter)
berada DI ATAS lapisan ini, jadi selama ada jaringan suara tetap berbunyi seperti biasa.

## Gerbang

```
node audio-locale-guard-test.js     # TTS peramban mati total, audio locale-independent
node ux-flags-test.js               # T6b: unduhan latar tidak berpagar
node neural-cache-isolation-test.js # cache suara tidak tercampur antar akun
```

## Langkah berikutnya (roadmap)

Tidak ada pekerjaan suara yang tertunda dari gelombang ini. Yang perlu diketahui sesi
berikutnya:

1. **Kalau ada laporan "suara mati di HP tertentu"** — periksa dulu apakah perangkatnya
   kena ambang penolakan Kokoro di atas. Kalau ya, itu perilaku yang disengaja; yang perlu
   diperbaiki adalah kenapa L1/L2 tidak menolongnya (jaringan? akun Puter?), bukan ambangnya.
2. **Jangan menambahkan lapisan suara di bawah L3.** Aturan itu ditulis di kepala
   `features/neural-voice/fiezel-voice-say.js` dan sekarang punya dua keputusan OWNER di
   belakangnya.
3. **Ambang RAM kecil belum diukur di perangkat sungguhan.** Angka 2 GB / 2 core dipilih
   konservatif dari sinyal yang tersedia, bukan dari pengukuran lapangan. Kalau nanti ada
   telemetri perangkat, angka itu layak ditinjau ulang — turunkan hanya dengan bukti.
