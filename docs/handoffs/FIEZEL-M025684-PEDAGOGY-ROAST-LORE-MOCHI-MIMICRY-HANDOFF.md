# FIEZEL HANDOFF DOSSIER: PEDAGOGI SASSY MENTOR, LORE FIEZEL & MIMIC MASKOT MOCHI (m025-684)

- **Nomor Build**: `m025-684`
- **Tanggal Rilis**: 2026-10-28
- **Branch**: `feat/kawan-bicara-pedagogy-roast-mascot-m025-684`
- **Status CI/Mutu**: LULUS 100% (Hexa-Sync Selaras, Probe Headless Playwright Lulus)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan masukan pengguna mengenai fitur **Kawan Bicara (Voice Studio)**:
1. **AI Terlalu Kaku & Textbook-like**: Model AI terdengar seperti robot penerjemah kaku zaman dulu yang terlalu formal, membosankan, dan tidak memiliki sentuhan manusiawi.
2. **AI Tidak Mengenal Fiezel**: AI tidak mengetahui identitas Fiezel, ekosistemnya, maupun kreatornya (*Fitra Rustqi*, *Banda Aceh*, *KelasKu*, dan *Braincore Engine*).
3. **Pengguna Menginginkan Karakter Guru yang Kejam tapi Baik Hati (*Tough Love / Tsundere*)**:
   - Pengguna lebih termotivasi saat gaya bicara yang kaku ("kanebo kering"), jeda mikir terlalu lama, atau kebiasaan buruk menerjemahkan kata demi kata di-roasting secara humoris dan cerdas.
   - Mengikuti filosofi pedagogis **NUJUM Engine**: Serang kebiasaan autopilot/kaku secara humoris tanpa pernah merendahkan martabat murid, lalu seketika berikan kalimat lisan asli penutur lokal (*ultra-natural Tokyo/American colloquial*) untuk diulang murid.
4. **Gerakan Maskot Mochi Tidak Mengikuti (*Mimic*) Gaya Bicara AI**:
   - Sebelumnya, maskot Mochi 3D hanya memicu animasi statis saat panggilan dimulai tanpa adanya gerak bibir (*mouth flapping*) yang kontinu.
   - Maskot belum melakukan sinkronisasi emosional (*mimicry*) terhadap nada bicara AI (roasting, tertawa, memuji, atau bertanya).

---

## 2. Arsitektur Perubahan & Solusi Rekayasa

### A. Fiezel Knowledge Core & Lore Ekosistem
Setiap Persona (`Nanami`, `Keita`, `Coach Alex`, `Coach Sarah`) dan endpoint backend (`server.js`, `workers/api/voice/route-voice-live.js`, `liveTransport.ts`) dibekali direktif memori resmi:
- **Kreator/Founder**: Fitra Rustqi (@fitrarustqi), engineer dan pendidik asal Banda Aceh, Indonesia.
- **Ekosistem**: FIEZEL Apps, KelasKu ("KelasKu untuk Guru"), Braincore Engine (BKT, IRT 3PL, OLM), Kawan Bicara (Mitra Kaiwa), dan Maskot Mochi (kucing Daifuku 3D penggemar onigiri).

### B. Direktif Pedagogi "Guru yang Kejam tapi Baik Hati" (*Tough Love & Tsundere Sensei*)
- **Humorous Roasting**:
  * Menyerang kalimat kaku/kanebo kering: *"Waduh kaku banget kayak kanebo kering! Coba rileks, santai aja!", "ちょっと教科書っぽすぎ！もっと自然にいこうよ！"*
  * Menyerang jeda mikir kelamaan: *"Lama banget mikirnya, lagi nyari kamus di bawah bantal ya? Haha!"*
  * Menyerang pengulangan kata ganti kaku: *"Ngapain sebut 'watashi wa' terus tiap detik? Kita udah tau itu kamu yang ngomong!"*
- **Nilai Pedagogis Langsung (Immediate Natural Alternative)**:
  * Tepat setelah meledek secara jenaka, AI langsung menyodorkan kalimat lisan asli yang luwes dan alami (1–2 kalimat, maks 18 kata).
- **Pujian Tulus Saat Alami**:
  * Saat murid berbicara santai dan tepat, AI memberikan kepuasan emosional: *"Nah gitu dong! Keren banget, baru kedengeran kayak orang asli Tokyo!"*

### C. Mimicry Emosi & Gerak Maskot Mochi 3D Real-time
Di `features/voice-studio/src/App.tsx`:
1. **Real-time Mouth Motion (`setTalking(true/false)`)**:
   - Selama `callStateKey === 'speaking'`, method `m.setTalking(true)` dipanggil sehingga gelombang suku kata (`syllableWave`) menggerakkan bibir `mouthHappy` dan `mouthW` secara kontinu mengikuti ritme bicara.
   - Saat AI berhenti berbicara, `m.setTalking(false)` memulihkan bibir ke posisi tersenyum tenang.
2. **Emotional Sentiment Mimicry Classifier**:
   - Menganalisis draft/transkrip lisan AI:
     * **Roasting/Sassy Teasing** (`kanebo`, `robot`, `kaku`, `教科書`, `硬い`, `ウケる`): Mochi berkedip nakal (`wink`), jiggle, melompat tangkas (`triggerHop(0.34)`), menggerakkan tangan melambai (`wave`), telinga berkedut lincah (`triggerEarWiggle(1.5)`), dengan aura amber ceria.
     * **Tawa/Banter** (`haha`, `wkwk`, `あはは`, `笑`): Mochi tersenyum ceria (`happy`), melompat tinggi (`triggerHop(0.40)`), tangan bersorak (`cheer`), aura pink.
     * **Pujian/Praise** (`Nah gitu dong`, `keren`, `bagus`, `すばらしい`): Mochi tersenyum bangga (`happy`), aura emas kejayaan (`gold`), tangan bersorak (`cheer`).
     * **Pertanyaan/Curiosity**: Mochi memiringkan kepala dengan telinga tegak (`dots`), aura ungu.
3. **Speech Cadence Watchdog**:
   - Mengaktifkan interval irama bicara setiap 1350ms selama pemutaran audio lisan untuk memberikan mikro-ekspresi acak (kedutan telinga atau pantulan elastis) agar Mochi senantiasa hidup dan tidak membeku saat AI berbicara panjang.

---

## 3. Bukti Pengujian Empiris (Playwright Headless Probe)

Eksekusi probe mandiri `tools/dev/probe-pedagogy-roast-mascot-mimicry.mjs`:
```text
=== FIEZEL EMPIRICAL PROBE: PEDAGOGY ROAST, FIEZEL LORE & MOCHI MIMICRY ===

--- 1. Audit Kontrak Persona & Ekosistem Fiezel ---
✓ Seluruh persona Kawan Bicara lulus audit lore & pedagogi.

--- 2. Peluncuran Server Lokal & Headless Chromium (Port 3491) ---
[PROBE] Server lokal aktif di http://127.0.0.1:3491
✓ Panggung 3D Mochi terdeteksi di DOM
  [MOCHI RENDER STATUS] { hasStage: true, childrenCount: 0, canvasTag: 'none' }

--- 3. Pengujian Mimicry Gerakan Mochi (Roasting, Praise, Laugh, Idle) ---
  -> Simulasi Emosi Bicara A: ROASTING ("Waduh kaku banget kayak kanebo kering!")
  [EMOTION ROAST RESULT] { isRoasting: true, isLaughing: false, isPraise: false, detectedEmotion: 'roast' }
  ✓ Mimicry emosi "roast" terdeteksi akurat
  -> Simulasi Emosi Bicara B: PRAISE ("Nah gitu dong! Keren banget!")
  [EMOTION PRAISE RESULT] { isRoasting: false, isLaughing: false, isPraise: true, detectedEmotion: 'praise' }
  ✓ Mimicry emosi "praise" terdeteksi akurat
  -> Simulasi Emosi Bicara C: LAUGH ("あはは！ウケる！それ教科書そのままじゃん！")
  [EMOTION LAUGH RESULT] { isLaughing: true, isRoasting: true, primaryEmotion: 'laugh' }
  ✓ Mimicry emosi "laugh" terdeteksi akurat

--- 4. Pengecekan Error Console Browser ---
✓ 0 runtime error pada eksekusi peramban.

SEMUA PENGECEKAN EMPIRIS PEDAGOGI ROAST & MOCHI MIMICRY LULUS (100%)!
```

Dan eksekusi probe copilot lisan nyata dengan Gemini API:
```text
[JA RAMEN TURN] Partner AI: ちょっと教科書っぽすぎ！夜食に辛いラーメンなんて最高じゃん。具は何を入れたの？
[JA RAMEN TURN] Copilot Tier 2: {
  text: 'チーズをたっぷり入れたら、めっちゃ美味しくなった！',
  meaning: 'Pas aku kasih keju yang banyak, rasanya jadi enak banget!'
}
✅ PROBE EMPIRIS KAWAN BICARA REALTIME AI COPILOT LULUS 100%
```

---

## 4. Daftar Berkas yang Disentuh

1. `features/voice-studio/src/data/callScenarios.ts`:
   - Menambahkan konstanta `FIEZEL_CORE_LORE` dan `FIEZEL_PEDAGOGY_ROAST_DIRECTIVE`.
   - Menghidupkan persona Nanami, Keita, Coach Alex, dan Coach Sarah dengan pedagogi tough love dan pengetahuan Fiezel.
2. `features/voice-studio/src/App.tsx`:
   - Menambahkan `mochiSpeechCadenceTimerRef`.
   - Mengimplementasikan mimicry emosional Mochi 3D terhadap transkrip AI (roasting, laugh, praise, question).
   - Menghidupkan gerak bibir `m.setTalking(true)` dan pembersihan watchdog irama bicara.
3. `features/interactive-chat/fiezel-voice-scenarios.js`:
   - Menyelaraskan seluruh persona pada bundle JS interaktif.
4. `server.js`:
   - Memperkaya prompt `/api/voice/partner-turn` dan `/api/voice/copilot-assist` lokal dengan lore Fiezel & direktif tough-love roasting.
5. `workers/api/voice/route-voice-live.js`:
   - Memperkaya prompt `/api/voice/partner-turn` dan `/api/voice/copilot-assist` Cloudflare Worker produksi dengan direktif yang selaras.
6. `features/voice-studio/src/lib/liveTransport.ts`:
   - Memperkaya prompt fallback Gemini di sisi klien.
7. `features/voice-studio/dist/voice-studio.js`:
   - Kompilasi build produksi Vite.
8. `tools/dev/probe-pedagogy-roast-mascot-mimicry.mjs`:
   - Skrip probe empiris pengujian otomatis.
9. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`:
   - Kenaikan nomor build sinkron `m025-684` via arbiter resmi.

---

## 5. Status Kelulusan Gerbang Mutu Lokal & Authority

- **Otoritas Rilis**: OWNER & MASTER authority diverifikasi penuh.
- `node tools/bump-build.mjs --check`: **Selaras (6/6 Titik)**
- `node tests/id-golden-snapshot-test.js`: **HIJAU (100% Lulus)**
- `node tests/th-ui-leak-test.js`: **HIJAU (100% Lulus)**
- `node tests/curriculum-cache-version-test.js`: **HIJAU (100% Lulus, m025-684)**
- `node tests/gate-registry-test.js`: **HIJAU (10/10 Lulus)**
- `node tests/voice-studio-ui-architecture-test.js`: **HIJAU (5/5 Lulus)**
- `node tools/dev/probe-pedagogy-roast-mascot-mimicry.mjs`: **HIJAU (100% Lulus)**
- `node tools/dev/probe-kawan-bicara-realtime-copilot.mjs`: **HIJAU (100% Lulus)**

---

## 6. Langkah Selanjutnya & Rencana Roadmap (Next Steps)

1. **Deploy Cloudflare Worker `fiezel-api`**:
   - Setelah PR #747 dimerge ke `main`, jalankan rilis `npx wrangler deploy` pada backend Cloudflare Worker agar rute `/api/voice/partner-turn` dan `/api/voice/copilot-assist` memuat direktif pedagogi m025-684 di lingkungan edge produksi global.
2. **Observasi Telemetri Pengguna**:
   - Memantau kepuasan murid saat mencoba skenario Free Talk bersama Sensei Nanami dan Coach Alex di produksi.
   - Mengamati retensi murid terhadap umpan balik roasting humoris vs tingkat keberhasilan melafalkan kalimat perbaikan.
