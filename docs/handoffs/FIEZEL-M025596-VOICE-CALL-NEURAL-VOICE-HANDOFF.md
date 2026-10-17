# FIEZEL Handoff: Suara Ngobrol AI & Panggilan lewat Neural Voice resmi (m025-596)

## Permintaan owner
> Gunakan pipeline Neural Voice resmi FIEZEL (FiezelVoiceSay / Puter Voice / Cloudflare TTS) yang
> 100% gratis dan bersuara alami. Pastikan latensinya tetap cepat untuk percakapan telepon (balasan
> pendek + fitur barge-in interupsi yang sudah ada di fiezel-voice-call.js). Ingat kanon repo:
> DILARANG menggunakan Web Speech Synthesis browser (speechSynthesis).

## Akar masalah
`features/interactive-chat/` berada DI LUAR zona yang dijaga `tests/audio-locale-guard-test.js`.
Di sana `fiezel-voice-call.js` (`speakViaSynth`) dan `fiezel-interactive-chat.js`
(`speakViaWebSpeech`) menyimpan cadangan `speechSynthesis` sendiri, sehingga:
- kursus Jepang SELALU berbicara dengan suara peramban;
- kursus Inggris jatuh ke suara peramban begitu `FiezelVoiceSay` mengembalikan false.

## Yang berubah
- **Baru `features/interactive-chat/fiezel-chat-voice.js` (`FiezelChatVoice`)**, satu pintu suara untuk chat dan panggilan.
  - Inggris: `FiezelVoiceSay.say()`, yaitu tangga resmi lengkap: aset R2 → Cloudflare TTS → Puter → neural lokal.
  - Jepang: `FiezelPuterVoice.speak(lang:'ja-JP')`. Mesin `generative` dicoba dulu; kalau ditolak, `neural`, lalu mesin yang terbukti menjawab diingat untuk sisa sesi.
  - Latensi: balasan dipotong per kalimat. Kalimat pertama dirender sendirian, dan kalimat berikutnya dihangatkan (`prefetch`) selagi kalimat sekarang berbunyi. Potongan pendek (<14 karakter) digabung.
  - Barge-in: `stop()` menaikkan token dan membungkam semua lapisan. Loop kalimat berhenti seketika.
  - Kalau semua lapisan gagal, hasilnya DIAM (L5) dan teks tetap tampil. Tidak ada cadangan peramban.
- **`fiezel-voice-call.js`**
  - `selectVoice`, `speakViaSynth`, keep-alive, dan utterance dihapus.
  - `playSpeech` memakai `FiezelChatVoice`. Orb berdenyut selama audio neural berbunyi, karena pemutar neural tidak punya peristiwa batas kata.
  - Riwayat panggilan tetap dikirim ke AI.
- **`fiezel-interactive-chat.js`**
  - `selectVoice` dan `speakViaWebSpeech` dihapus.
  - Tombol Dengar memakai `FiezelChatVoice`. Kalau suaranya diam, muncul toast jujur `chat.suara.diam` (id+th), hanya saat murid sendiri menekan tombol.
- **`tests/audio-locale-guard-test.js`** sekarang ikut menjaga `features/interactive-chat`. `speechSynthesis` tidak bisa kembali lewat sana.
- **`tests/speech-synthesis-engine-test.js` DIHAPUS.** Tes itu mengunci perilaku yang dilarang owner. Gantinya `tests/chat-neural-voice-test.js`.
- **`tests/voice-call-two-way-test.js`**: balasan dan barge-in diuji lewat mock Puter Voice, dan `speechSynthesis` wajib tidak tersentuh.
- `index.html` + `sw.js` ASSETS memuat `fiezel-chat-voice.js` sebelum `fiezel-voice-call.js`.

## Catatan biaya
Inggris memakai urutan FiezelVoiceSay yang sudah ada. Render Cloudflare (Deepgram Aura) memakan
jatah neuron akun, dan Puter memakai kredit akun Puter murid. Kalau keduanya habis, suaranya diam
dan teks tetap tampil. Ini perilaku L5 yang sama dengan fitur lain.

## Utang
- `features/learner-flow/fiezel-learner-flow.js` masih memanggil `speechSynthesis` (di luar zona
  gerbang, di luar lingkup tugas ini).
