# Bantuan Cara Jawab Realtime Berbasis Konteks Percakapan AI

Mengubah panel **Bantuan Cara Jawab PAW · Realtime** (`section:nth-of-type(2)`) dari kartu contoh statis berbasis skenario menjadi **mesin asisten jawaban kontekstual secara langsung (real-time)** yang menghasilkan 3 opsi balasan yang benar-benar menjawab ucapan/pertanyaan terakhir PAW dan menyambung dengan jawaban murid sebelumnya.

## User Review & Critical Decisions

> [!IMPORTANT]
> Keputusan berikut telah dikonfirmasi dan akan diterapkan langsung pada komponen **Bantuan Cara Jawab PAW · Realtime**:

- **Pemicu Pembaruan Otomatis**: Kartu bantuan jawaban langsung diperbarui secara otomatis setiap kali PAW selesai berbicara atau menyelesaikan giliran balasan (baik pada mode *Telepon Live WebSocket* maupun *Turn-by-Turn*).
- **Tiga Opsi Jawaban Lengkap Sekaligus**: Panel menampilkan **3 opsi jawaban kontekstual** secara langsung (*Pilihan 1: Singkat & Mudah*, *Pilihan 2: Natural & Kontekstual*, *Pilihan 3: Lengkap & Sopan*) lengkap dengan panduan **Cara Baca (Lafal Mudah)** serta **Arti Kalimat** dalam Bahasa Indonesia / Thailand.
- **Kesadaran Konteks Penuh (Pertanyaan AI + Jawaban Murid Sebelumnya)**: Kalimat bantuan tidak lagi terpaku pada template pembuka skenario, melainkan dianalisis secara real-time dari kalimat tanya terakhir PAW (misalnya saat PAW bertanya balik *"What is your favorite place near your house?"*, *"Who did you go with?"*, *"What topics are you studying today?"*, atau pertanyaan bebas lainnya) serta mempertimbangkan apa yang baru saja dijawab oleh murid.

---

## 1. Overview & Core Concept

- **What It Does**: Setiap kali PAW melontarkan pertanyaan atau tanggapan baru dalam percakapan, sistem langsung membedah maksud kalimat PAW dan riwayat ucapan murid, lalu menyusun 3 kalimat balasan spesifik yang siap dibaca atau dikirim oleh murid pemula.
- **Target Audience / Persona**: Pelajar Bahasa Inggris dan Bahasa Jepang tingkat pemula hingga menengah yang sering kehabisan kata-kata saatAI mengajukan pertanyaan lanjutan (*follow-up question*) di tengah telepon.
- **Key Value**: Murid tidak akan pernah melihat saran jawaban yang "tidak nyambung" dengan pertanyaan AI saat ini. Setiap saran jawaban terasa hidup, relevan dengan topik detik itu juga, dan mudah dilafalkan berkat panduan ejaan fonetik Indonesia.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **PAW Bertanya / Menanggapi**: PAW mengucapkan kalimat baru (misal: *"That sounds like a lovely neighborhood! What is your favorite place near your house, like a park or a local cafe?"*).
  2. **Indikator Sinkronisasi Konteks**: Header pada kartu **Bantuan Cara Jawab PAW · Realtime** menampilkan kutipan pertanyaan terakhir PAW beserta terjemahan maksudnya dan lencana status *Konteks Live Terbarui*.
  3. **Tiga Kartu Bantuan Kontekstual Muncul Sekaligus**:
     - **Opsi 1 (Mudah & Singkat)**: Kalimat pendek yang langsung menjawab inti pertanyaan AI (contoh: *"My favorite place near my house is a cozy local cafe."*).
     - **Opsi 2 (Natural)**: Kalimat percakapan sehari-hari yang menyambung dengan giliran sebelumnya (contoh: *"There is a green park near my house, and I love walking there every afternoon."*).
     - **Opsi 3 (Lengkap & Sopan)**: Kalimat utuh dengan alasan atau detail tambahan untuk melatih struktur tata bahasa target.
  4. **Aksi 1-Klik**: Murid dapat menekan **Dengar**, **0.7x**, **Latih Ucapkan** (membuka mikrofon sambil membaca teks), atau **Pakai Jawaban Ini** untuk langsung mengirim balasan tersebut ke PAW.
- **Visual Identity & Theme**:
  - Mempertahankan **Palet Khas FIEZEL** (*Warm Paper* `#FFF9EE`, *Crisp White* `#FFFFFF`, *Solar Gold* `#FFC700`, *FIEZEL Maroon* `#8C2233`, *Emerald* `#2E8B69`, dan *Warm Ink* `#241A11`) beserta ornamen resmi (`FiezelPawStamp`, `FiezelSparkleOrnament`, `FiezelCornerOrnament`, dan pita kiri `.fz-solar-ribbon`).
  - Tata letak kartu bantuan menampilkan **ketiga opsi secara langsung** (tanpa menyembunyikan opsi ke-3 di balik tombol lipat) dengan desain responsif yang rapi dan mudah dipindai mata.
- **Interactive Feedback & Motion**:
  - Saat PAW sedang menyusun balasan atau baru selesai berbicara, kartu bantuan menampilkan transisi halus (*fade & scale*) yang menandakan bahwa ketiga opsi jawaban telah diperbarui mengikuti kalimat terbaru PAW.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Arsitektur Generator Bantuan Kontekstual Berlapis (AI Live + Contextual Linguistic Engine)**
  - *Chosen Approach*: Menggabungkan **Dynamic Gemini Structured Output (`gemini-3.8-flash`)** yang menghasilkan 3 opsi balasan kontekstual (`easy`, `mission`, `complete`) lengkap dengan ejaan fonetik (`pronunciation`) dan arti (`hintId`, `hintTh`) berdasarkan riwayat percakapan, ditambah **Contextual Question-Intent Parser** di sisi klien yang secara cerdas menganalisis kata tanya (`where`, `who`, `what`, `when`, `how long`, `why`, `do you`, `apakah`, `どこ`, `だれ`, `なに`, `いつ`, `どう`) dan topik kalimat AI saat ini.
  - *Why*: Menjamin bantuan jawaban **selalu 100% relevan dengan kalimat terakhir AI** baik ketika terhubung ke server Gemini, Cloudflare Worker, maupun saat berjalan mandiri di hosting statis.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PAW AI VOICE CALL STUDIO                         │
│  (Ucapan Terakhir AI + Transkrip Jawaban Murid Sebelumnya + Skenario)   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             REALTIME CONTEXTUAL ANSWER GENERATOR PIPELINE               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ 1. Live Turn / Stream Completion Trigger                          │  │
│  │    Mendeteksi setiap kali teks ucapan AI selesai diperbarui       │  │
│  ├───────────────────────────────────────────────────────────────────┤  │
│  │ 2. Contextual AI Coach Endpoint & Semantic Question Analyzer      │  │
│  │    • Mengekstrak inti pertanyaan AI (Where / Who / What / Why /   │  │
│  │      How long / Opinion / Preference / Follow-up)                 │  │
│  │    • Mengaitkan dengan entitas pada jawaban murid sebelumnya      │  │
│  │    • Menghasilkan 3 kartu: Mudah, Natural, dan Lengkap            │  │
│  │      beserta Cara Baca Fonetik & Terjemahan ID/TH                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│         PANEL BANTUAN CARA JAWAB PAW · REALTIME (section #2)            │
│  ┌─────────────────────┬─────────────────────┬───────────────────────┐  │
│  │  Opsi 1 · Mudah     │  Opsi 2 · Natural   │  Opsi 3 · Lengkap     │  │
│  │  • Kalimat Target   │  • Kalimat Target   │  • Kalimat Target     │  │
│  │  • Cara Baca Lafal  │  • Cara Baca Lafal  │  • Cara Baca Lafal    │  │
│  │  • Arti Terjemahan  │  • Arti Terjemahan  │  • Arti Terjemahan    │  │
│  │  [Dengar] [Pakai]   │  [Dengar] [Pakai]   │  [Dengar] [Pakai]     │  │
│  └─────────────────────┴─────────────────────┴───────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - Setiap item `BeginnerReplyCard` memuat `id`, `tier` (`easy` | `mission` | `rescue`), `badgeId`, `badgeTh`, `text` (kalimat target yang langsung menjawab AI), `pronunciation` (cara baca fonetik ramah pemula), `hintId`, dan `hintTh`.
- **Interactive Component & State Mapping**:
  - Setiap kali giliran percakapan bertambah (`turns` berubah) atau `liveAiDraft` selesai menjadi giliran penuh (`turn_complete`), aplikasi memperbarui `nextSuggestedReplies` secara real-time dari respons evaluasi giliran dan/atau memanggil generator bantuan kontekstual sehingga ketiga kartu pada `BeginnerAnswerAssistant` langsung berganti mengikuti pertanyaan baru PAW.
