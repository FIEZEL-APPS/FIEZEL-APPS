# Fiezel Video Factory: Automated Batch Video Pipeline

Perkakas automasi untuk memproses, memotong, menyelaraskan teks (*subtitle alignment*), dan menghasilkan bank latihan Video Grammar (5 Soal Multi-Checkpoint) berkecepatan tinggi dari materi video penutur asli untuk Tingkat Kemahiran A1 hingga C2.

---

## 1. Fitur Utama

1. **Pemotongan Presisi FFmpeg**: Menghasilkan video H.264 + AAC dengan flag `+faststart` untuk streaming instan HTTP 206 (tanpa jeda *buffering*).
2. **Ekstraksi Poster Otomatis**: Menangkap bingkai visual beresolusi tinggi di detik $t=1.5\text{s}$ untuk poster pemutar video.
3. **Penyelarasan Subtitle & Anti-Bocor**: Menyensor kata kunci target otomatis menjadi `[ ___ ]` sebelum murid menjawab, serta menutup *hardcoded subtitle* dengan bilah masker gelap.
4. **Kompilasi Bank JSON**: Menuliskan metadata lengkap (*skill*, *pauseAt*, *checkpoints*, rumus, alasan, dan trik memori) ke `content/video-grammar-bank-v1.json`.
5. **Katalog Tata Bahasa Terintegrasi**: Menggunakan taksonomi aturan dan distraktor di `grammar_rules_catalog.json` (A1–C2).

---

## 2. Struktur Direktori

```
tools/video-factory/
├── README.md                     # Dokumentasi panduan operasional
├── video_batch_pipeline.py       # Skrip inti generator batch (Python)
├── grammar_rules_catalog.json    # Katalog pola tata bahasa & opsi distraktor A1–C2
├── test_pipeline.py              # Suite pengujian unit generator
└── batch_spec_sample.json        # Contoh cetak biru batch input
```

---

## 3. Cara Penggunaan (Command-Line Interface)

### A. Verifikasi Status Katalog & Direktori
```bash
python tools/video-factory/video_batch_pipeline.py --action verify
```

### B. Memotong Satu Video Tunggal Secara Presisi
```bash
python tools/video-factory/video_batch_pipeline.py --action slice \
  --input "sumber_video.mp4" \
  --start 0.0 \
  --duration 26.0 \
  --output "cake-lucy-5q-exact.mp4"
```
*Output otomatis disimpan di `content/video/cake-lucy-5q-exact.mp4` dan posternya di `content/video/cake-lucy-5q-exact-poster.jpg`.*

### C. Menjalankan Pemrosesan Batch Sekaligus (Misal: 5 hingga 20 Video)
```bash
python tools/video-factory/video_batch_pipeline.py --action batch \
  --batch-file "tools/video-factory/batch_spec_sample.json"
```

---

## 4. Format Spesifikasi Batch (`batch_spec.json`)

```json
{
  "clips": [
    {
      "id": "vg-a1-cake-lucy",
      "level": "A1",
      "skill": "to_be",
      "sourceVideo": "mockups/media/cake-lucy-raw.mp4",
      "startTime": 0.0,
      "duration": 26.0,
      "attribution": {
        "source": "English with Lucy: 100 Common English Questions",
        "url": "https://www.youtube.com/watch?v=kYv_8B7eX_g"
      },
      "subtitles": [
        { "start": 0.0, "end": 1.1, "speaker": "William", "text": "What is your full name?" },
        { "start": 1.1, "end": 3.2, "speaker": "Lucy", "text": "My full name is Lucy Bella Simkins.", "censorPattern": "/\\bis\\b/i", "censorAnswer": "is" }
      ],
      "checkpoints": [
        {
          "id": "lucy-cp-1",
          "pauseAt": 3.2,
          "exercise": {
            "type": "subtitle-cloze",
            "grammarPoint": "To Be (Present): is",
            "question": "Lengkapi to be yang tepat untuk nama lengkap Lucy:",
            "clozeText": "My full name ___ Lucy Bella Simkins.",
            "clozeAnswer": "is",
            "options": ["is", "am", "are", "be"],
            "answerIndex": 0,
            "explain": {
              "why": "'My full name' adalah kata benda tunggal (it), to be yang tepat adalah 'is'.",
              "rule": "Singular Subject + is",
              "memory": "Satu nama lengkap = IS."
            }
          }
        }
      ]
    }
  ]
}
```

---

## 5. Gerbang Validasi Pasca-Eksekusi

Setelah menjalankan pipeline batch, selalu pastikan seluruh gerbang mutu lulus:
```bash
# 1. Uji logika komponen & bank video
node tests/grammar-8-upgrades-full-test.js

# 2. Pastikan video tidak terbuang oleh exclude deploy
node tests/deploy-site-gate-test.js

# 3. Pastikan nol kebocoran naskah bahasa asing
node tests/th-ui-leak-test.js

# 4. Pastikan integritas arsitektur master
node validator.js
```
