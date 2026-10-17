# FIEZEL Handoff: Ngobrol AI jadi teman ngobrol + saklar koreksi (m025-595)

## 1. Permintaan owner

> "yang aku inginkan adalah fiezel ai ini bisa menjadi seperti LLM khusus bahasa, dimana saat user
> mengobrol, fiezel akan membalas selayaknya teman di kehidupan nyata, tapi ketika ada kalimat yang
> salah, fiezel akan mengoreksinya, tapi itu jika user menghidupkan fitur koreksi, jika tidak maka
> percakapan akan berjalan dengan lancar dan mulus tanpa ada feed back"

Keputusan owner sesudah audit (`reports/audit-ngobrol-ai-2026-10-17.md`):

1. Saklar koreksi **mati** secara bawaan. Kalau sistem mendeteksi murid sering salah tata bahasa,
   muncul **popup ajakan** menyalakan koreksi.
2. *(belum dijawab: apakah kesalahan tetap dicatat diam-diam saat koreksi mati. Perilaku lama
   dipertahankan: telemetri Braincore tetap mencatat.)*
3. Boleh model lebih murah dengan jatah chat sendiri (±60 pesan/jam), **asal tidak ada jawaban
   anomali yang membuat murid salah belajar**.

## 2. Akar masalah (dari audit)

- Di produksi (jalur CF `ai:'on'`) pesan chat dikirim sebagai `tutor_turn`. Jalur CF tidak
  mengirim prompt, jadi persona teman hilang. Akibatnya AI membalas seperti guru yang menjelaskan,
  dalam bahasa murid. Untuk murid Thai, balasan malah ditolak gerbang aksara Thai.
- AI tidak menerima riwayat percakapan.
- Kotak koreksi merah selalu tampil dan tidak bisa dimatikan. Detektornya salah tuduh
  ("Let it go", 「ラーメンが食べたい」) dan melewatkan kesalahan nyata ("I goes", "She dont").
- Kuota `ai` 25/hari dipakai bersama tutor. Saat kuota habis, chat diam-diam beralih ke naskah.

## 3. Yang berubah

### Backend (Worker)
- `workers/api/ai/ai-tasks.js`: dua task baru.
  - `conversation_turn` (koreksi mati). Model `standard`. Prompt tidak meminta koreksi; hanya
    satu baris `CHECK: OK|MISTAKE` yang diam (untuk popup ajakan, tidak pernah ditampilkan).
  - `conversation_correct` (koreksi hidup). Model `reasoning` (task KEBENARAN). Kalau diturunkan
    ke model yang belum `pedagogicallyTrusted`, balasan tetap sampai tetapi **koreksi dibuang**.
  - Input: `message`, `course` (en/ja), `level`, `scenarioId` (enum; peran per skenario dirakit
    di Worker, bukan teks dari klien), `history` (≤8 giliran `u:`/`a:`).
  - `shapeConversationOutput()` adalah gerbang anti-anomali. Balasan wajib berbahasa target
    (Inggris tanpa kata-kata Indonesia; Jepang tanpa romaji), maksimal 3 kalimat (dipotong di batas
    kalimat), tanpa gema rangka prompt, dan tidak membeo pesan murid. Arti wajib berbahasa murid.
    Koreksi wajib berbeda dari kalimat murid tetapi tidak boleh menulis ulang lebih dari 50%, dan
    alasannya wajib berbahasa murid. Kalau balasan gagal, Worker mengirim fallback deterministik
    (`degraded`). Kalau yang gagal hanya arti atau koreksi, bagian itu saja yang dibuang.
- `workers/api/ai/route-ai.js`: task yang punya `shapeOutput` diperiksa oleh pemeriksanya sendiri;
  amplop sukses membawa `turn: {reply, translation, correction, correctionChecked, mistakeSignal}`.
- Kuota: bucket baru **`aiChat`** (120/hari ≈ 2 jam ngobrol aktif), terpisah dari `ai` (tutor).
  `quota-config.js`, `quota-core.js`, `quota-store-d1.js`, `route-quota.js`, `route-wiring.js`
  (`bucketFor`), naskah `quota.aiChat.exhausted` (id + th).

### ⚠️ Migrasi D1 WAJIB sebelum deploy Worker
```bash
cd workers/api
wrangler d1 execute fiezel-core --remote --file=migrations/0018_quota_ai_chat.sql
```
`reconcileHeld()` menulis `ai_chat_held` untuk setiap murid; Worker baru di atas database lama
membuat rekonsiliasi kuota gagal.
`.github/workflows/deploy-api-worker.yml` kini menerapkannya otomatis sebelum `wrangler deploy`
(idempoten; kalau skema tidak bisa diperiksa, deploy dibatalkan). `tools/d1-schema-check.mjs` dan `tests/d1-schema-contract-test.js`
sekarang mengenal `ALTER TABLE … ADD COLUMN`.

### Klien
- `app.js`: `AI_TASK_MAP` + `aiTaskInputFor` untuk dua task baru; `classifyAiTaskResponse` dan
  `askCloudflareAITask` meneruskan `turn`.
- `features/interactive-chat/fiezel-interactive-chat.js`:
  - Saklar **Koreksi** (mati bawaan) dan **Suara otomatis**, tersimpan di localStorage.
  - Koreksi mati: tidak ada kartu koreksi, tips, atau catatan tata bahasa sama sekali.
  - Koreksi hidup: kartu kuning lembut "Lebih tepat:" dengan bagian yang diperbaiki disorot, plus
    alasan singkat. Kalimat benar mendapat tanda "Kalimatmu sudah pas". Saat AI tidak memeriksa
    (offline), tips detektor lokal menjadi cadangan.
  - Popup ajakan: muncul kalau minimal 3 dari 5 giliran terakhir salah (dari detektor lokal atau
    `mistakeSignal`). Kalau ditolak, tidak muncul lagi selama 24 jam. Dialognya bisa ditutup
    dengan Escape dan fokus tetap berputar di dalam dialog.
  - Riwayat 8 giliran dikirim ke AI. Arti diambil dari AI, bukan placeholder. Chip saran basi
    tidak lagi ditempel ke balasan AI.
  - Penanda jujur "Mode hemat" / "Jatah ngobrol AI habis" saat balasan datang dari naskah.
    Sapaan fallback Puter ("Halo! Saya PAW…") tidak lagi tampil sebagai balasan teman.
  - Riwayat disimpan sekali per `kursus_skenario` (dulu dua salinan) dengan batas 200 pesan. Kunci
    lama dimigrasi saat dimuat.
  - Sinkron panggilan suara: duplikat dikenali dari cap waktu giliran, bukan teks. Dulu "yes" yang
    diucapkan dua kali hilang satu.
  - Detektor lokal: false positive (〜たい, 見える, "let/make/can … it go") dihapus; ditambah
    "I goes", "she don't", "have went".
- i18n: kunci baru `chat.koreksi.*`, `chat.ajakan.*`, `chat.sumber.*`, `chat.suara.saklar`, dan semua
  `chat_misc_*` (tips kesalahan, dulu berbahasa Inggris) terdaftar di `copy-id-student.js` +
  `copy-th-student.js`.

## 4. Gerbang
- Baru: `tests/ai-conversation-task-test.js`, `tests/interactive-chat-correction-test.js`
  (keduanya didaftarkan di `quality.yml`).
- Diperbarui: `tests/ai-task-contract-test.js` (tujuh task), `tests/interactive-chat-test.js`
  (kunci riwayat tunggal), `tests/d1-schema-contract-test.js` (ALTER ADD COLUMN),
  `id-golden-baseline.json` (literal Indonesia baru, disengaja).

## 5. Utang yang tersisa (belum dikerjakan di sini)
- ±340 kunci `chat_*` lama (skenario, saran, naskah offline) masih fallback Indonesia di modul,
  belum terdaftar id+th. Untuk murid Thai, bagian-bagian itu masih tampil dalam bahasa campur.
- Balasan offline (`generateOfflineReply`) masih berbasis kata kunci; sekarang ditandai jujur
  sebagai "Mode hemat", tetapi isinya belum nyambung dengan topik.
- Jatah akun Workers AI (10.000 neuron/hari) tetap pagar biaya global. `conversation_turn`
  memakai ±12,5 neuron per giliran, sedangkan `conversation_correct` ±60.
