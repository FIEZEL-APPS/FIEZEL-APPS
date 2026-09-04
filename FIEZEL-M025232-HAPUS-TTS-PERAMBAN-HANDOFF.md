# FIEZEL M025-232 — Hapus Total TTS Peramban (L4) Handoff

**Handoff version:** 1.0
**Target Build:** m025-232
**Fitur:** Penghapusan lapisan `speechSynthesis` peramban dari tangga suara
**Status:** SELESAI — quality gate hijau, A9/A10/A11 hijau, menunggu keputusan OWNER
**Otoritas:** OWNER (laporan langsung, 2026-09-02). Keputusan rilis tetap pada OWNER.

---

## 1. Ringkasan Perubahan

**Laporan OWNER:** pada sesi listening tes kemampuan terdengar **dua suara sekaligus** —
ElevenLabs dan suara bawaan peramban — padahal cadangan peramban seharusnya sudah lama dihapus.

**Akarnya bukan sekadar "L4 masih ada".** Di `app.js`, `play()` memperlombakan pintu suara
dengan timeout 9 detik lewat `Promise.race`, dan timeout itu resolve `false` — **nilai yang
sama** dengan "pintu suara tidak berbunyi". Satu paragraf bacaan atau satu skrip listening
wajar berbunyi lebih dari 9 detik, jadi stopwatch itu menang secara rutin **selagi audio
ElevenLabs masih berjalan**, lalu `false`-nya membangunkan cadangan peramban di atas audio
yang sedang berbunyi. Timeout kini resolve sentinel tersendiri.

Tangga suara sesudah perubahan:

```
C0 cache Cache API klien
L1 aset R2/ElevenLabs
C1 POST /api/tts/render
L2 mesin Puter
L3 mesin neural di perangkat   <- lapisan TERAKHIR yang bersuara
L5 teks tanpa suara
```

Empat implementasi browser-TTS yang saling independen dihapus: `fiezel-voice-say.js`,
`app.js`, `fiezel-neural-voice-bootstrap.js`, `fiezel-neural-voice-audibility-fix.js`, plus
pabrik `createBrowserFallback()` di `fiezel-neural-voice.js`.

**Anti-tabrakan suara.** `say()` kini memanggil `silenceLayers()` sesudah menaikkan
`turnGeneration`. Alasannya penting: menaikkan generation hanya membuat giliran lama INERT,
audionya TETAP berbunyi. Pemanggil yang lupa `stop()` dulu tertolong **tanpa sengaja** oleh
L4 — cabang bicaranya memanggil `synth.cancel()`, dan antrean `speechSynthesis` adalah
singleton peramban, jadi pembatalan itu ikut membungkam lapisan lain. Menghapus L4 ikut
menghapus tolong-menolong tak disengaja itu, jadi lubangnya ditutup eksplisit.

`voiceIsSpeaking()` membaca `FiezelSpeechBridge.speaking()`, bukan `speechSynthesis.speaking`
— **pelebaran, bukan tambalan**: probe lama hanya tahu lapisan paling bawah, jadi SFX maskot
boleh menimpa suara ElevenLabs yang sedang berbunyi.

**Naskah murid.** Dua belas kalimat di tiga peta naskah menjanjikan "suara perangkatmu" yang
sudah tidak ada isinya. Diganti menjadi "suara cadanganku" — jujur untuk L2 maupun L3, dan
tanpa nama mesin (kanon `quota-notice-a11y-test` (a) melarang murid membaca nama mesin).

---

## 2. Poin Penting untuk Sesi Berikutnya

- **JANGAN membangun ulang cadangan `speechSynthesis`.** Handoff M025-223 §2 masih menulis
  *"alihkan dengan tenang ke cadangan (Puter TTS -> browser SpeechSynthesis)"*. Kalimat itu
  **DICABUT** oleh handoff ini. Di bawah L3 tidak ada apa pun yang bersuara: jawabannya diam,
  teksnya tetap terbaca (L5). OWNER sudah meminta penghapusan ini **dua kali**.
- **Gerbangnya struktural, bukan sopan santun.** `audio-locale-guard-test.js` kini melarang
  `speechSynthesis`/`SpeechSynthesisUtterance` muncul di **kode** mana pun di zona audio dan
  `app.js` (komentar yang menjelaskan penghapusan tetap boleh). `release-audit.py` menuntut
  `browserSpeak` tidak ada di bootstrap. Detektor runtime `RUNTIME_BROWSER_TTS_WIRED` di
  `fiezel-diagnostic-register.js` dipertahankan sebagai jaring pengaman terakhir.
- **Stub `speechSynthesis` di sandbox tes adalah PERANGKAP yang disengaja.** Jangan
  dihapus. Tanpa stub, setiap assertion `synth === 0` lulus karena API-nya absen, bukan
  karena tangganya berpantang. Dengan stub terpasang, menambahkan kembali L4 membuat tiga
  gerbang merah.
- **`speak()` tidak boleh resolve truthy di jalur gagal.** Pemanggil membaca resolve truthy
  sebagai "audio sudah berbunyi" lalu melewati teks-tanpa-suara — murid mendapat bisu
  **tanpa** teks. Jalur gagal wajib reject (atau resolve `false`), tidak pernah `true`.
- **Adaptor Skills Lab memanggil `say()` LANGSUNG**, bukan lewat `AudioService.play()`.
  Itu jalur sesi listening. Setiap perubahan ownership giliran harus diuji dari sana, bukan
  hanya dari `audio.play()`.
- **Pagar 152 MB tidak disentuh.** `localEngine()` tetap mengembalikan null selama aset belum
  `prepared`; prefetch memakai `local.prefetch()`, bukan `local.speak()`.

---

## 3. Status Verifikasi

| Gerbang | Hasil |
|---|---|
| FIEZEL Quality Gate (CI) | success |
| `release-audit.py` | exit 0, fail 0 |
| A9 / A10 / A11 | success |
| Suite lokal (231 perintah CI) | 229 lulus; 2 sisanya artefak runner lokal (bendera `--selftest` dan env `FIEZEL_RELEASE_AUDIT_REPORT_FRESH=1` hilang), keduanya lulus saat dipanggil sebagaimana CI memanggilnya |
| `voice-fallback-chain-test.js` | 53 assertion, 0 gagal (sebelumnya 28, 5 merah) |
| `tts-transport-switch-test.js` | 35 assertion, 0 gagal (sebelumnya 27, 6 merah) |
| Ritual build 4 tempat | `build-number-uniqueness --strict`, `install-health`, `pwa-release-coherence`, `diag-panel` lulus |

**Belum diverifikasi:** perilaku di perangkat sungguhan. Gejala aslinya hanya terdengar di
perangkat, jadi **lanjutkan dengan satu sesi listening nyata** sebelum rilis: pastikan hanya
ada satu suara, dan saat jatah habis tidak ada suara sistem yang menyahut.
