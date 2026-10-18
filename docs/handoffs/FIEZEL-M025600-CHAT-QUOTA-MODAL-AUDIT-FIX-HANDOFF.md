# FIEZEL HANDOFF DOSSIER: Modal Limit Kuota AI Harian, Sanitasi Delimiter & Perbaikan Skenario Interview (m025-600)

## 1. Ringkasan Eksekutif & Temuan Audit
Audit 50-turn interaktif FIEZEL AI dan pengujian batasan kuota menemukan tiga area yang perlu disempurnakan:
1. **Kebocoran Delimiter Internal (`---END OF DATA---` / `---DATA---`)**:
   - Token internal data guard pembatas payload LLM bocor ke catatan eksplanasi gramatika/terjemahan karena pola regex pembatas sebelumnya `/-{2,}\s*(?:END\s+)?DATA\s*-{2,}/i` tidak menangkap kata `OF` pada `---END OF DATA---`.
   - **Solusi**: Diperluas menjadi `/-{2,}\s*(?:END\s+(?:OF\s+)?)?DATA\s*-{2,}/i` pada `workers/api/ai/ai-tasks.js`, pembersihan di `parseConversationTags`, serta sanitasi defensif dua lapis di `parseTaggedReply` dan `requestReply` pada `features/interactive-chat/fiezel-interactive-chat.js`.
2. **Skenario Interview Mengalami Safety Trigger pada Llama-3.1-8B**:
   - Peran `"a friendly interviewer at a simple school or part-time job interview"` memicu trigger keselamatan penolakan data pribadi murid pada prompt tertentu.
   - **Solusi**: Disempurnakan menjadi `"a friendly senior student or club leader doing a practice interview; ask simple, friendly questions about school activities, hobbies, skills, and goals"` plus dialog fallback deterministik offline di `features/interactive-chat/fiezel-interactive-chat.js`.
3. **Pemberitahuan Pop-up Modal Saat Limit Kuota AI Murid Habis**:
   - Permintaan pengguna: *"LIMIT HARIAN AI KAMU SUDAH HABIS, AKAN AKTIF KEMBALI PADA BLA BLA"* dengan kata-kata direvisi menjadi lebih memotivasi, hangat, dan tanpa tuduhan (*no-blame*).
   - **Revisi Copy**:
     - **Badge**: `FIEZEL AI · JATAH HARIAN` (TH: `FIEZEL AI · สิทธิ์ประจำวัน`)
     - **Judul**: `Limit Harian AI Sudah Terpakai Penuh` (TH: `การสนทนา AI วันนี้ใช้ครบจำนวนแล้ว`)
     - **Deskripsi**: `Latihanmu hebat hari ini! Jatah pesan AI gratis kamu sudah terpakai penuh untuk hari ini. AI partner belajarmu sedang istirahat sejenak dan akan aktif kembali {waktuReset}.` (TH: `วันนี้คุณฝึกฝนได้ยอดเยี่ยมมาก! จำนวนข้อความ AI ฟรีประจำวันของคุณถูกใช้งานครบแล้ว คู่หู AI กำลังพักผ่อนและจะกลับมาพร้อมใช้งานอีกครั้งใน {waktuReset}`)
     - **Kotak Solusi Belajar**: `💡 Belajarmu tetap bisa lanjut! Latihan Soal, Kosakata Flashcard, Tata Bahasa, dan Pustaka tetap bisa kamu akses tanpa batas.` (TH: `💡 การเรียนรู้ไม่สะดุด! คุณยังสามารถฝึกฝนต่อได้ไม่จำกัดผ่านแบบฝึกหัด คำศัพท์ แฟลชการ์ด และบทเรียนไวยากรณ์`)
     - **Tombol Konfirmasi**: `Siap, Lanjut Belajar!` (TH: `เข้าใจแล้ว ลุยต่อเลย!`)
     - **Tautan Feed**: Tombol `Lihat Detail` pada catatan sumber obrolan untuk membuka kembali modal kapan saja.

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright Probe)
Skrip probe Playwright peramban headless dijalankan langsung via `tools/dev/probe-chat-quota-modal.mjs` di viewport mobile (412x915px).

### Hasil Eksekusi Probe:
```json
{
  "modalTriggered": true,
  "modalCardFound": true,
  "titleText": "Limit Harian AI Sudah Terpakai Penuh",
  "descText": "Latihanmu hebat hari ini! Jatah pesan AI gratis kamu sudah terpakai penuh untuk hari ini. AI partner belajarmu sedang istirahat sejenak dan akan aktif kembali 2 jam lagi (pukul 10.26 WIB).",
  "helpText": "💡 Belajarmu tetap bisa lanjut! Latihan Soal, Kosakata Flashcard, Tata Bahasa, dan Pustaka tetap bisa kamu akses tanpa batas.",
  "btnText": "Siap, Lanjut Belajar!",
  "resetLabelText": "2 jam lagi (pukul 10.26 WIB)",
  "dismissWorks": true,
  "sourceNoteDetailWorks": true,
  "delimiterSanitized": true,
  "interviewFallbackWorks": true
}
```
**Status Probe**: `[PASS] Empirical Playwright Probe PASSED with 100% assertions fulfilled!`

---

## 3. Daftar Berkas yang Disentuh
1. `workers/api/ai/ai-tasks.js`:
   - Memperluas regex `SCAFFOLD_ECHO_PATTERNS` untuk mencocokkan `---END OF DATA---`.
   - Menghapus delimiter pada `parseConversationTags`.
   - Mengubah peran skenario `interview` menjadi latihan santai bersama senior sekolah / ketua klub.
2. `features/i18n/copy-id-quota.js`:
   - Menambahkan 6 kunci lokalisasi ID untuk modal limit AI harian.
3. `features/i18n/copy-th-quota.js`:
   - Menambahkan 6 kunci lokalisasi TH dengan kepatuhan kanon (menghindari jargon mesin `โควตา`).
4. `features/interactive-chat/fiezel-interactive-chat.js`:
   - Menambahkan `state.quotaModalOpen` dan `state.quotaResetTime`.
   - Menambahkan `formatQuotaResetLabel`, `showQuotaExhaustedModal`, `dismissQuotaExhaustedModal`, `quotaModalHtml`.
   - Menambahkan tombol `#fzcBtnQuotaInfo` di `sourceNoteHtml`.
   - Memicu modal saat `r.source === 'quota'` di `deliverAssistantReply`.
   - Mencegah mode telepon saat kuota habis dan membuka modal edukatif.
   - Membersihkan delimiter token pada teks balasan dan catatan koreksi.
   - Mengekspor helper quota dan `updateUI` pada objek `api`.
5. `features/interactive-chat/interactive-chat.css`:
   - Menambahkan styling Tactile Clay untuk overlay, card, icon-wrap, badge amber, title, description, help box, dan tombol konfirmasi dengan target sentuh $\ge 48\text{px}$.
6. `id-golden-baseline.json`:
   - Diperbarui dengan teks modal Indonesia resmi via `--write-baseline`.
7. `tools/bump-build.mjs`, `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`:
   - PWA build dinaikkan ke `m025-600` dengan verifikasi Hexa-Sync `Selaras`.
8. `tools/dev/probe-chat-quota-modal.mjs`:
   - Skrip pengujian Playwright komprehensif.

---

## 4. Status Kelulusan Gerbang Mutu Lokal (Quality Gates)
- `tests/id-golden-snapshot-test.js`: PASS (HIJAU: baseline emas Indonesia utuh)
- `tests/th-ui-leak-test.js`: PASS (4389 kunci id, semuanya punya padanan th, 0 bocor)
- `tests/quota-notice-a11y-test.js`: PASS (16 pemeriksaan, 0 gagal)
- `tests/ai-conversation-task-test.js`: PASS (48/48 LULUS)
- `tests/gate-registry-test.js`: PASS (10 pass, 0 fail)
- `tests/curriculum-cache-version-test.js`: PASS (26 penegasan, 2 halaman, build m025-600)
- `tools/bump-build.mjs --check`: PASS (Hexa-Sync Selaras)
- `tools/dev/probe-chat-quota-modal.mjs`: PASS (100% assertions fulfilled)
