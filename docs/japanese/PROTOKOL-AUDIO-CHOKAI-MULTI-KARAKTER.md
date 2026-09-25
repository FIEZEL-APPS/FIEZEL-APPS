# Protokol Wajib: Multi-Character Audio Pipeline untuk Bank Soal Listening (Chokai)

Dokumen ini adalah **standar wajib dan baku** di FIEZEL APPS untuk seluruh pembuatan, regenerasi, dan pemeliharaan audio bank soal listening (JLPT Chokai N5/N4/N3 serta materi percakapan bahasa Jepang/Inggris).

> **Peringatan Keras untuk Seluruh Agent & Subagent:**
> DILARANG KERAS merender naskah dialog percakapan interaktif dua orang atau lebih menggunakan satu suara tunggal (single voice). Setiap percakapan wajib dipecah per giliran bicara (*turn-by-turn speech*) dan disintesis menggunakan persona suara karakter yang berbeda sesuai perannya.

---

## 1. Trinitas Karakter & Standar Vokal

Setiap soal listening Chokai wajib memiliki pembagian suara yang tegas:

| Peran | Persona Vokal | Karakteristik Audio | Peran dalam Soal |
|---|---|---|---|
| **1. Narator / Instruktor Ujian** | Tegas, Dewasa, Berwibawa | Suara berat/matang, tempo tenang, artikulasi formal dan presisi, wibawa pengawas ujian resmi. | Membaca nomor soal, konteks situasi pembuka, dan pertanyaan di akhir dialog. |
| **2. Mahasiswa / Tokoh Laki-Laki** | Pria Muda / Dewasa Muda | Suara pemuda, natural, intonasi percakapan hidup, kasual/semiformal. | Menjawab atau berdiskusi sebagai pembicara pria (`男の人`, `学生`, `店員`, dll.). |
| **3. Mahasiswi / Tokoh Perempuan** | Wanita Muda / Dewasa Muda | Suara mahasiswi, ramah, natural, ekspresif, artikulasi jernih. | Berdialog sebagai pembicara wanita (`女の人`, `学生`, `先生`, dll.). |

---

## 2. Matriks Pemetaan Suara AI (Multi-Engine Matrix)

Pipeline mendukung dua mesin sintesis dengan fallback otomatis tanpa kegagalan:

### A. Engine Utama: Gemini 2.5 Multimodal TTS
Bila kuota Gemini API aktif, gunakan pemetaan suara berikut:

- **Instruktor Ujian**: `Charon` atau `Fenrir` (Deep, authoritative male).
- **Karakter Pria / Mahasiswa**: `Puck` (Youthful, expressive male).
- **Karakter Wanita / Mahasiswi**: `Aoede` atau `Kore` (Clear, natural female).

### B. Engine Fallback Produksi: Microsoft Edge Neural (Zero-Quota)
Bila kuota API habis atau untuk produksi stabil tanpa batas harian:

- **Instruktor Ujian (Tegas & Dewasa)**:
  `voice: ja-JP-KeitaNeural`, `rate: -4%`, `pitch: -18Hz` (Memberikan resonansi dada yang lebih dalam dan tegas layaknya penyiar resmi NHK/JLPT).
- **Karakter Pria / Mahasiswa Laki-laki**:
  `voice: ja-JP-KeitaNeural`, `rate: +3%`, `pitch: +4Hz` (Memberikan kesan pemuda aktif dan natural).
- **Karakter Wanita / Mahasiswi Perempuan**:
  `voice: ja-JP-NanamiNeural`, `rate: +1%`, `pitch: +3Hz` (Memberikan kesan mahasiswi cerdas, ramah, dan artikulatif).

---

## 3. Arsitektur 4-Babak Audio Soal Chokai (*4-Stage Audio Blueprint*)

Setiap file audio yang dihasilkan wajib melalui struktur sekuensial berikut:

```
[Babak 1: Instruksi/Situasi]
   └── Suara: Instruktor Ujian (Keita -18Hz / Fenrir)
   └── Teks: "第X問。男の人と女の人が話しています。" (atau situasi pembuka)
   └── Jeda Nafas: 500ms

[Babak 2: Dialog Percakapan Interaktif]
   ├── Pembicara A: Suara Karakter A (Pria / Wanita)
   ├── Jeda Respon: 350ms - 450ms
   ├── Pembicara B: Suara Karakter B (Wanita / Pria)
   ├── Jeda Respon: 350ms - 450ms
   └── (Saling berbalas hingga percakapan selesai)
   └── Jeda Transisi: 700ms

[Babak 3: Pertanyaan Soal]
   └── Suara: Instruktor Ujian (Tegas & Dewasa)
   └── Teks: Soal yang diajukan ("男の人はこれから何をしますか。")
   └── Jeda Refleksi: 1000ms

[Babak 4: Chime & Thinking Pocket]
   └── Silence buffer 1.5 - 2.0 detik sebelum audio berakhir agar murid tidak terpotong saat berpikir.
```

---

## 4. Alur Kerja Pipeline (Execution Pipeline)

1. **Parsing Dialog**:
   Ekstrak naskah soal dari `scriptJapanese`. Identifikasi tag pembicara (`先生:`, `学生:`, `男の人:`, `女の人:`, dll.) dan pisahkan per baris percakapan.
2. **Voice Routing**:
   Arahkan tiap baris teks ke voice ID dan parameter pitch/rate yang sesuai berdasarkan database persona.
3. **Individual Audio Synthesis**:
   Sintesis tiap baris teks menjadi segmen WAV/MP3 sementara di memori atau folder sementara (`scratch/audio-chunks/`).
4. **Stitching & Assembly (ffmpeg Concat)**:
   Gabungkan seluruh segmen dengan menyelipkan file jeda hening (*silence buffer*) terukur di antaranya.
5. **Mastering & Normalisasi EBU R128**:
   - Sampling rate: 24,000 Hz atau 44,100 Hz.
   - Format: MP3 64-96 kbps Mono.
   - Target Loudness: -16.0 LUFS ± 1.0 LUFS.
   - True Peak: ≤ -1.5 dBFS.
6. **Integritas Bank Soal**:
   Perbarui entri `aiAudioUrl` pada `jlpt-listening-bank-v1.json` dan verifikasi bahwa file tersedia secara fisik di disk.

---

## 5. Pemeriksaan Kepatuhan (Checklist Pengujian)

Sebelum sebuah bank soal dinyatakan selesai atau di-commit:
- [ ] Tidak ada satupun soal dialog yang hanya memiliki satu jenis vokal.
- [ ] Suara instruktor terdengar berbeda jelas (lebih rendah/berwibawa) dibandingkan suara murid.
- [ ] Jeda antar giliran bicara terdengar alami (tidak tabrakan dan tidak jeda terlalu lama).
- [ ] Pertanyaan penutup dibacakan dengan suara instruktor ujian.
- [ ] File MP3 tersimpan di `features/speaking-listening/audio-jlpt/` dengan ukuran proporsional (rata-rata 80KB - 250KB per soal lengkap).
