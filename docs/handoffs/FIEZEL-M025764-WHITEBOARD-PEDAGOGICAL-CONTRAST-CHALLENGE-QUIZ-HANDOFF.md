# FIEZEL Rilis Dossier: m025-764 — Whiteboard Pedagogical Contrast & Challenging Comprehension Quiz

**Tanggal Rilis**: 5 November 2026
**Build Target**: `m025-764`
**Branch Ref**: `feat/voice-mentor-hood-m025-764`
**Komponen Inti**: `features/voice-studio`, `workers/api/voice/route-voice-live.js`, `call.html`

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan
1. **Eliminasi Total Kata "AI" (Banned Word Violation)**:
   - Pengguna menginstruksikan secara tegas bahwa tidak ada kata "AI" di dalam kamus aplikasi FIEZEL.
   - Seluruh teks status buffering dan antarmuka disterilkan menjadi "FIEZEL", "Coach Alex", atau "Mitra Belajar" (`"Fiezel sedang meracik materi..."`).
2. **Penghapusan Tanda Dash / Strip (`-`, `—`, `–`)**:
   - Dihilangkan seluruh tanda dash pada istilah pola (`Verb-ing` → `Verb ing`) dan pembatas kalimat yang merupakan pola *AI slop*.
3. **Papan Sorot 2 Baris Kontras Bersih (Pedagogical Contrast Card)**:
   - Mengeliminasi teks ambigu dan membingungkan (*"Gunakan ... -> salah ... dalam kalimat yang tepat"*).
   - Menggantinya dengan layout komparasi 2 baris tegas:
     - `✕ SALAH`: Latar merah lembut dengan teks tercoret merah tebal (`I am study English right now.`).
     - `✓ BENAR`: Latar hijau zamrud dengan teks hijau tebal (`I am studying English right now.`).
4. **Pemulihan Suara Mentor & Proteksi Bisu (Voice Speech Failsafe)**:
   - Penjelasan Coach Alex otomatis dibacakan saat modal dibuka (`onSpeakPreview`) dan dilengkapi tombol `[🔊 Ulangi Suara]`.
   - Ditambahkan lapisan cadangan (*failover*) ke `window.speechSynthesis` di `App.tsx` jika endpoint remote TTS mengembalikan status 503/429 kuota habis.
5. **Soal Uji Pemahaman Lebih Menantang & Mengecoh (Comprehension Challenge Quiz)**:
   - Kuis pemahaman tidak boleh menduplikasi kalimat contoh pada penjelasan.
   - Kuis menguji pemahaman aturan tata bahasa yang sama pada konteks kalimat baru yang lebih panjang dengan pengecoh realistis (*exam-grade distractor*):
     - `The engineers are currently testing the new security system.` (Benar)
     - `The engineers are currently test the new security system.` (Pengecoh)
   - Dilengkapi terjemahan dan umpan balik lengkap untuk Bahasa Indonesia (`locale=id`) dan Bahasa Thai (`locale=th`).
6. **Anti-Lockout Voice Navigation**:
   - Disediakan tombol aksi `[🎙️ Lanjut Ngobrol dengan Coach Alex]` dan `[Tutup ✕]` untuk memastikan murid tidak terkunci di layar modal dan dapat langsung melanjutkan percakapan.

---

## 2. Bukti Pengujian Empiris Nyata (Playwright Headless)
Skrip probe Playwright: `scratch/probe-whiteboard-pedagogy-and-audio.mjs`
```
[probe] 1. Navigating to call.html (ID locale)...
[probe] Formula Pill: "Subject + [is/am/are] + Verb ing"
[probe] Explanation ✕ SALAH: "✕ SALAH I am study English right now."
[probe] Explanation ✓ BENAR: "✓ BENAR I am studying English right now."
[probe] Coach voice replay button visible: true
[probe] Quiz Prompt: "Tes Kepahaman: Manakah kalimat yang BENAR saat teknisi sedang menguji sistem baru saat ini?"
[probe] Option A: "The engineers are currently testing the new security system."
[probe] Option B: "The engineers are currently test the new security system."
[probe] ✓ CERTIFIED: Quiz presents a completely distinct challenge sentence from the explanation!
[probe] ✓ CERTIFIED: Deeper distractor challenge sentence verified!
[probe] Captured audio events count: 1
[probe] Saved screenshot to whiteboard-verbing-fixed.png
[probe] ✓ Anti-lockout talk button dismissed whiteboard cleanly!

[probe] 2. Testing Thai Locale (locale=th)...
[probe] Thai Quiz Prompt: "ทดสอบความเข้าใจ: ประโยคใดถูกต้องเมื่อทีมงานกำลังทดสอบระบบใหม่อยู่ในขณะนี้?"
[probe] Thai Option A: "The engineers are currently testing the new security system."
[probe] Thai Option B: "The engineers are currently test the new security system."
[probe] ✓ CERTIFIED: Thai Quiz presents a distinct, challenging test sentence!
[probe] Saved Thai screenshot to whiteboard-thai-fixed.png
[probe] ALL CHALLENGING COMPREHENSION QUIZ TESTS PASSED 100%! ✓
```

---

## 3. Berkas yang Dimodifikasi & Ditambahkan
1. `features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx`:
   - Implementasi deriver pedagogis minimalis, papan sorot 2 baris `✕ SALAH` vs `✓ BENAR`, tombol ulangi suara, kuis uji pemahaman menantang, dan eliminasi kata "AI" serta tanda dash.
2. `features/voice-studio/src/types/voiceCall.ts`:
   - Penambahan properti `drillTrapSentence` pada antarmuka `VoiceUiAction`.
3. `workers/api/voice/route-voice-live.js`:
   - Dukungan `drillTargetSentence` dan `drillTrapSentence` terpisah dari `sampleTarget` dan `trapWrongSentence`.
   - Pembersihan prompt JSON schema untuk menghasilkan soal latihan yang mandiri.
4. `features/voice-studio/src/App.tsx`:
   - Failover `window.speechSynthesis` pada `speakAiText` jika neural audio tidak tersedia.
   - Deteksi intent verbal untuk pertanyaan penggunaan tata bahasa.
5. `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css`:
   - Kompilasi build rilis Vite 6.
6. `id-golden-baseline.json`:
   - Sinkronisasi baseline emas teks Bahasa Indonesia.
7. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `call.html`, `kurikulum.html`, `misi.html`:
   - Penyelarasan hexa-sync nomor build ke `m025-764`.

---

## 4. Status Kelulusan Gerbang Mutu (Quality Gates)
* `node tests/id-golden-snapshot-test.js` → **PASS** (13 berkas terkunci identik, baseline utuh)
* `node tests/th-ui-leak-test.js` → **PASS** (4704 kunci id memiliki padanan th)
* `node tests/curriculum-cache-version-test.js` → **PASS** (33 penegasan, 3 halaman, build m025-764)
* `node tests/gate-registry-test.js` → **PASS** (10 pass, 0 fail)
* `tools/fiezel-guardians.mjs a10` → **PASS_WITH_RISK_REPORT** (0 error, 0 warning)
