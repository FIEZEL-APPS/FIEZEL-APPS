# Audit Ngobrol AI (Latihan → Ngobrol AI / Kaiwa) — 2026-10-17

Lingkup: `features/interactive-chat/*` (UI + frontend), `app.js` `askFiezelAIResult` (transport),
`workers/api/ai/ai-tasks.js` + `workers/api/route-legacy.js` (backend).
Tolok ukur yang dipakai = keinginan owner:

> FIEZEL AI jadi "LLM khusus bahasa": membalas seperti **teman di kehidupan nyata**. Kalimat salah
> **dikoreksi hanya kalau fitur koreksi dinyalakan**; kalau dimatikan, percakapan mengalir mulus
> **tanpa feedback apa pun**.

Bukti visual: `reports/audit-ngobrol-ai-2026-10-17/` (Chromium 390×844, jaringan API diblokir →
jalur offline, sama dengan yang murid lihat saat AI gagal/kuota habis).

---

## Ringkasan (5 kalimat)

1. **Saklar koreksi belum ada sama sekali.** Setiap pesan murid dilewatkan ke detektor regex dan
   kotak merah "Tips/Mistake" selalu muncul; tidak ada cara mematikannya.
2. **Di produksi, chat tidak pernah sampai ke AI sebagai "teman".** Jalur Cloudflare (`ai:'on'`)
   membuang seluruh prompt persona; pesan murid dikirim sebagai `tutor_turn` "jawab pertanyaan
   belajar bahasa Inggris, maks 6 kalimat, beri contoh kalimat" — jadi balasannya gaya **guru
   menjelaskan**, dalam bahasa Indonesia/Thai, bukan teman ngobrol dalam bahasa target.
3. **AI tidak punya ingatan percakapan.** Hanya pesan terakhir yang dikirim; riwayat tidak pernah
   ikut, jadi "teman" lupa apa yang baru saja diceritakan.
4. **Detektor kesalahan tidak bisa dipercaya**: salah tuduh ("Let it go", 「ラーメンが食べたい」,
   「猫が見えます」 ditandai salah) dan melewatkan kesalahan nyata ("I goes", "She dont", "I have went").
5. **±340 kunci teks chat tidak terdaftar di i18n** — murid Thai melihat layar campur
   Indonesia/Inggris, melanggar aturan dua-bahasa repo.

---

## A. Backend

| # | Temuan | Bukti | Dampak |
|---|---|---|---|
| B1 | **Prompt persona dibuang di jalur CF.** `askFiezelAIResult` memilih jalur CF bila `AI_TASK_MAP[task]` ada; chat memanggil task `'question'` → dipetakan ke `tutor_turn`. Jalur CF *sengaja* tidak mengirim `prompt` (hanya `question/surface/level/lessonId`). | `app.js:18775`, `app.js:19012`, `app.js:18862-18879`, `core-config.js:180` (`ai:'on'`) | Persona "Fiezel-chan/Coach Alex", aturan 1-2 kalimat, interjeksi, pertanyaan pancingan — semuanya hilang di produksi. |
| B2 | **`tutor_turn` adalah tugas menjelaskan, bukan bercakap.** Prompt server: "jawab pertanyaan belajar bahasa Inggris … beri satu contoh kalimat Inggris beserta artinya", bahasa jawaban = locale murid (id/th). Untuk kursus Jepang pun instruksinya "bahasa Inggris". | `ai-tasks.js:903-914` | Murid menulis "I went to the beach!" → dapat penjelasan tata bahasa, bukan "Oh nice! Which beach?". |
| B3 | **Gerbang keluaran memusuhi percakapan.** Locale `th` mewajibkan rasio aksara Thai minimum → balasan berbahasa Inggris/Jepang (yang memang kita mau) gagal → fallback "Mode hemat — jawaban ini dari FIEZEL, bukan AI…". | `ai-tasks.js:524-527`, `ai-tasks.js:580-590` | Murid Thai praktis tidak pernah dapat balasan AI di chat. |
| B4 | **Tidak ada riwayat percakapan.** Skema `tutor_turn` tidak punya field `history`; klien juga hanya mengirim `trimmed`. | `ai-tasks.js:1019-1030`, `fiezel-interactive-chat.js:2078-2142` | Tidak ada kontinuitas — inti dari "teman" hilang. |
| B5 | **Kuota terlalu kecil untuk chat**: `tutor_turn` 20/jam, 8/menit, dan dibagi dengan Tanya/Coach/Classroom/Library. Model `reasoning` (70b) — mahal untuk obrolan pendek. | `ai-tasks.js:1034`, `ai-tasks.js:1044` | 20 pesan ≈ 10 menit ngobrol, lalu diam-diam jatuh ke balasan kalengan (lihat F4). |
| B6 | **Jalur Puter (`/api/ai/chat`) membalas 200 + "Halo! Saya PAW, asisten belajar FIEZEL."** saat model gagal, tanpa tanda `degraded`. Klien chat menampilkannya sebagai balasan teman. | `route-legacy.js:303-331`, `fiezel-interactive-chat.js:2144-2152` | Murid tiba-tiba disapa ulang di tengah obrolan. |
| B7 | **Prompt injection di jalur Puter**: teks murid dijahit langsung ke prompt (`'User input: "' + trimmed + '"'`) tanpa pembatas data. | `fiezel-interactive-chat.js:2094`, `:2104`, `:2119`, `:2127` | Kecil (hanya sesi murid sendiri), tapi tidak konsisten dengan pola `---DATA---` di Worker. |
| B8 | **Tidak ada keluaran terstruktur.** Balasan = satu string bebas. Klien lalu mengisi `translation` dengan placeholder dan `suggestions` dengan saran pembuka skenario. | `fiezel-interactive-chat.js:2146-2152` | Tombol "Arti" pada balasan AI hanya menampilkan "Jawaban langsung dari AI Partner FIEZEL."; chip saran tidak nyambung dengan topik. Bila model menuruti instruksi "berikan terjemahan", terjemahan Indonesia ikut tampil di gelembung **dan dibacakan TTS bersuara Jepang/Inggris**. |

## B. Frontend (logika klien)

| # | Temuan | Bukti |
|---|---|---|
| F1 | **Tidak ada state/saklar koreksi.** `checkMisconception` dipanggil tanpa syarat di `sendMessage`, `recordTurn`, `syncVoiceCallTurns`; `renderMarkup` selalu merender `msg.hint`. | `:2168`, `:2201`, `:2272`, `:2834-2838` |
| F2 | **Detektor regex: false positive.** Diuji langsung via `detectMisconception`: `"Let it go"` → `sva_present`; `"Make it go faster"` → `sva_present`; 「ラーメンが食べたい」, 「日本語が勉強したい」, 「猫が見えます」 → `particle_o_vs_ga` (padahal 〜たい/見える wajar memakai が). | `:798-871` |
| F3 | **Detektor regex: false negative & hanya 1 temuan.** `"I goes"`, `"She dont like it"`, `"I have went"` → `null`. `"Yesterday i go … he like it"` hanya melaporkan SVA (return pertama), "go→went" terlewat. Tidak ada kalimat perbaikan, hanya aturan umum. | `:798-871`, screenshot 02 |
| F4 | **Kegagalan AI disembunyikan.** Semua cabang gagal (kuota, offline, degraded, error) jatuh diam-diam ke `generateOfflineReply` — balasan kalengan berbasis kata kunci ("Haha I totally get that! Tell me more…" untuk cerita ke pantai). Murid tidak tahu dia sedang bicara dengan skrip. | `:2135-2158`, screenshot 02 |
| F5 | **Catatan offline bocor konteks.** Balasan offline Jepang di mode teks memberi catatan "…saat teman bercerita tentang kuliner **di telepon**". | hasil probe `ja` |
| F6 | **Default kursus `'ja'`** bila tidak ada sinyal kursus — padahal FIEZEL utamanya kursus Inggris. Fallback level juga campur (`'A1'` vs `'N5'`), dan prompt Jepang menulis "JLPT A1". Badge header kursus Jepang menampilkan `A1`. | `:91`, `:94-102`, `:2089`, screenshot 03 |
| F7 | **Riwayat tersimpan ganda & tak terbatas.** Setiap skenario disimpan di dua kunci (`ja_free` dan `free`); setelah `JSON.parse` keduanya jadi array terpisah, jadi ukuran berlipat. Tidak ada batas jumlah pesan per skenario → localStorage terus tumbuh. | `:1320-1330`, `:1347-1377` |
| F8 | **Sinkron panggilan suara membuang ucapan berulang.** Ucapan yang teksnya sama dengan salah satu dari 15 pesan terakhir dianggap duplikat ("yes", "ok", "はい" kedua kalinya hilang). | `:2258-2266` |
| F9 | **Teks SCENARIOS diterjemahkan sekali saat modul dimuat** (`t()` dipanggil di literal objek), jadi ganti bahasa ID↔TH tanpa reload tidak mengubah label/target skenario. | `:114-139` dst. |

## C. UX

| # | Temuan |
|---|---|
| U1 | **Koreksi bersifat menghukum, bukan bersahabat**: kotak merah langsung di bawah setiap kalimat murid — persis kebalikan dari "obrolan mulus". Tidak ada mode "ngobrol saja". |
| U2 | **Koreksi tidak bisa ditindaklanjuti**: tidak ada versi kalimat yang benar ("Yesterday I **went** to the beach and he **liked** it"), tidak ada "coba lagi", tidak ada ringkasan di akhir sesi. Bahasa penjelasan untuk kursus Inggris memakai Inggris ("Add -s or -es…") bagi murid Indonesia A1. |
| U3 | **"Catatan Tata Bahasa" menempel di setiap balasan AI** (di balik tombol Arti) dan isinya mengomentari kalimat AI sendiri — terasa seperti buku pelajaran, bukan teman. |
| U4 | **Suara otomatis selalu nyala** (`autoVoice: true`) tanpa tombol; di kelas/tempat umum mengganggu. |
| U5 | **Target skenario dinilai pakai regex kata kunci** (mis. goal "Ask your partner a follow-up question" tidak benar-benar memeriksa pertanyaan). Bagus sebagai motivasi, tapi bisa centang/tidak centang secara acak. |
| U6 | **Tidak ada indikator status AI** (AI asli / mode hemat / kuota habis). Teman yang tiba-tiba menjawab ngawur tanpa penjelasan merusak kepercayaan. |

## D. UI (dari tangkapan layar 390 px)

| # | Temuan |
|---|---|
| I1 | Kotak hint merah memakai tata letak 2 kolom (judul kiri, isi kanan) → judul patah 3 baris ("Subject-/Verb/Agreement:"). Warna merah = sinyal "salah", terlalu keras untuk mode belajar santai. |
| I2 | Kartu skenario + daftar target memakan ±45% layar pertama sebelum percakapan dimulai; pada 320 px chip skenario terpotong tanpa petunjuk geser. |
| I3 | Label campur bahasa di layar yang sama: "Coach Alex · Native English Speaking Partner" (Inggris), "Target Percakapan Skenario" (Indonesia), "Panggilan" (Indonesia), deskripsi skenario Inggris dengan judul "(Obrolan Bebas)". Untuk murid Thai semuanya non-Thai. |
| I4 | Tidak ada tempat untuk saklar koreksi / suara di header — perlu ruang di bar partner (tombol Panggilan + Reset sudah memenuhi). |
| I5 | Pengucapan nama partner berubah per kursus (フィゼル先生 = "Fiezel-**sensei**" = guru) — bertentangan dengan posisi "teman". |

## E. i18n / aturan repo

- `grep -o "t('chat_…')"` → **340 kunci unik** di `features/interactive-chat/*.js`, **0** terdaftar di
  `features/i18n/copy-id-*.js` / `copy-th-*.js`. Semua teks berjalan dari fallback Indonesia/Inggris
  yang ditulis langsung di modul — melanggar aturan CLAUDE.md "Setiap teks yang dilihat pengguna lahir
  DUA BAHASA". `tests/th-coverage-test.js` tidak menangkapnya karena gerbang itu hanya memindai
  berkas copy, bukan pemanggil `t()` di modul fitur.

---

## Rencana perbaikan yang diusulkan (bertahap)

### Tahap 1 — Backend: task baru `conversation_turn` (inti "LLM khusus bahasa")
- Registry `ai-tasks.js`, input terstruktur (tanpa prompt dari klien, sesuai pola CF):
  `course: 'en'|'ja'`, `scenarioId`, `level`, `message` (≤400), `history` (≤8 giliran terakhir,
  tiap teks ≤300), `correction: boolean`.
- Prompt server: persona teman sebaya, balas **dalam bahasa target**, 1-3 kalimat, nyambung ke
  riwayat, akhiri dengan tanggapan/pertanyaan natural; jangan mengajar.
- Keluaran **JSON**: `{ reply, translation, correction }`.
  - `correction` **hanya diminta bila `correction:true`**; bila `false`, prompt sama sekali tidak
    menyebut kesalahan dan server membuang field itu bila model tetap mengisinya.
  - Bentuk koreksi: `{ corrected, note }` — kalimat murid versi benar + 1 kalimat alasan dalam
    bahasa murid (id/th). `null` bila kalimatnya sudah benar (jangan mengada-ada).
- Gerbang keluaran khusus: rasio aksara Thai hanya untuk `translation`/`note`, bukan `reply`;
  batas kalimat 3 untuk `reply`; tanpa kanon kata Indonesia pada `reply`.
- Model `standard` (bukan 70b), kuota terpisah dari `tutor_turn` (usulan 60/jam).
- Fallback deterministik: tetap `generateOfflineReply`, tapi ditandai `degraded` agar UI jujur.

### Tahap 2 — Frontend
- `state.correctionMode` (default **mati**, tersimpan), dibaca di satu tempat; bila mati:
  tidak ada hint, tidak ada `grammarNote`, tidak ada regex — obrolan bersih.
- Bila hidup: kartu koreksi lembut (bukan merah) di bawah kalimat murid:
  "Lebih natural: Yesterday I **went** … he **liked** it" + catatan singkat; perbedaan kata
  di-highlight; regex lama hanya jadi cadangan offline setelah false positive F2 diperbaiki.
- Kirim riwayat 8 giliran; pakai `translation` dari JSON; buang placeholder & chip saran basi.
- Indikator kecil "mode hemat / kuota habis" saat fallback; batas 200 pesan per skenario; satu
  kunci simpan per skenario; perbaiki dedup panggilan suara (pakai id/timestamp giliran).
- Default kursus ikut kursus aktif (fallback `'en'`).

### Tahap 3 — UI/UX & i18n
- Header: saklar "Koreksi" (ikon centang-pena) + saklar suara; kartu skenario bisa diciutkan.
- Daftarkan ±340 kunci chat ke pasangan baru `copy-id-chat.js` + `copy-th-chat.js`.
- Opsional: ringkasan akhir sesi ("3 kalimat yang bisa lebih natural") — juga hanya bila koreksi hidup.

### Keputusan yang perlu owner
1. Default saklar koreksi: **mati** (obrolan mulus dulu) atau **hidup**?
2. Saat koreksi mati, apakah kesalahan tetap **dicatat diam-diam** ke Braincore (untuk rekomendasi
   latihan), atau benar-benar tidak dianalisis sama sekali?
3. Kuota & model: boleh pakai model `standard` dengan kuota terpisah ±60 pesan/jam?
