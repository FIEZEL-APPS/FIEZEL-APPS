# Bukti WER pemilihan model TTS Cloudflare (aura-1 vs aura-2-en vs melotts)

**Angka yang dijelaskan berkas ini:** `wer: 0.038` (aura-1) dan `wer: 0.018` (aura-2-en) di
`tools/prerender-tts.mjs:87,96`, yang dipaku oleh gerbang `prerender-plan-test.js:146`.

**Kenapa direktori ini ada.** `reports/add-a10-kepatuhan.md` §2.3 mencatat kedua angka itu
sebagai **"TIDAK ADA BUKTI SAMA SEKALI"**: mereka hidup di `tools/prerender-tts.mjs`, dijaga
satu gerbang, dan dikutip sebagai alasan bunyi yang didengar setiap murid — tetapi
perhitungannya tidak ada di repo, hanya di transkrip percakapan. Kalau owner bertanya
"kenapa aura-1?", jawabannya tidak bisa ditunjukkan. Direktori ini menutup utang itu.

**Statusnya sekarang: TERVERIFIKASI, dengan batas yang ditulis apa adanya di §5.** Artefak
mentahnya ADA (bukan hilang), berhasil ditemukan di `/home/user/workspace/tts-pilot/`, dan
angka 0,038 / 0,018 **direproduksi dari artefak itu** — lihat §3. Tidak ada angka yang
dikarang ulang di sini.

---

## 1. Berkas di direktori ini

| Berkas | Isi | Asal |
|---|---|---|
| `pilot-quality.json` | Hasil bench penuh: 3 model × 4 kalimat = 12 baris, masing-masing dengan `http`, `ms`, `bytes`, `sec`, `wer`, dan transkripsi Whisper (`tx`) | `tts-pilot/quality.json` |
| `whisper-raw-response-c1-sample.json` | SATU respons mentah Whisper apa adanya (termasuk `avg_logprob`, batas kata, VTT) untuk kalimat C1, disimpan sebagai contoh bentuk keluaran alat transkripsi | `tts-pilot/_tx.json` |
| `melotts-error-attempt-1.json`, `melotts-error-attempt-2.json` | Dua respons galat melotts apa adanya (`code: 3043`, "Internal server error") yang menjadi dasar penolakan model itu | `tts-pilot/melotts.json`, `tts-pilot/m.out` |

**Yang SENGAJA TIDAK dibawa masuk repo:** 22 berkas audio (`*.mp3`, `*.raw`, `*.wav`,
`_cf_deepgram_*.bin`) berukuran total **1,71 MB**, plus satu `c1-melotts.raw` 649 KB dan
`c1-melotts.wav` 487 KB sendirian. Repo ini sudah memikul model suara `vendor/supertonic-3`
152 MB; menambahkan 1,7 MB audio biner yang tidak dibaca satu pun gerbang adalah biaya
tanpa pembeli. Yang bernilai bukti adalah **transkripsinya**, dan transkripsi itu ada
lengkap di `pilot-quality.json`. Audio mentahnya tetap ada di `/home/user/workspace/tts-pilot/`
di luar repo; kalau ia hilang, bench harus dijalankan ulang — dan itu ditulis di §5 sebagai
batas, bukan disembunyikan.

## 2. Alat dan bahan

- **Model TTS yang diuji** (Workers AI, lewat REST): `@cf/deepgram/aura-1`,
  `@cf/deepgram/aura-2-en`, `@cf/myshell-ai/melotts`.
- **Alat transkripsi (yang menghasilkan WER):** Whisper di Workers AI
  (`@cf/openai/whisper-large-v3-turbo` — jejaknya terlihat di
  `whisper-raw-response-c1-sample.json`: `transcription_info.language_probability`,
  `segments[].avg_logprob`, `words[]` bertimestamp, `vtt`, `usage.neurons`). Audio hasil TTS
  dikirim ulang ke Whisper, lalu transkripsinya dibandingkan dengan teks aslinya.
- **Bahan uji: 4 kalimat, satu per tingkat** — A1, A2, B1, C1. Teksnya bisa dibaca kembali
  dari kolom `tx` pada baris yang WER-nya 0:
  - A1 — *"Maya has a small garden behind her house. She grows tomatoes and green plants there."*
  - A2 — *"Every morning she gives water to them. Her little brother helps her on Sunday."*
  - B1 — *"The council approved the plan after three long meetings, though several members remained doubtful."*
  - C1 — *"On balance, the evidence suggests that the intervention succeeded, albeit within narrow limits."*
- **Jumlah kalimat: 4. Bukan 40, bukan 400.** Ini angka yang paling penting untuk diketahui
  pembaca, dan itulah sebab §5 ada.

## 3. Cara angkanya dihitung — dan reproduksinya

WER = **jarak edit tingkat KATA** antara teks referensi dan transkripsi Whisper, dibagi
jumlah kata referensi:

\[
\mathrm{WER} = \frac{S + D + I}{N_\text{referensi}}
\]

Perbandingannya **tidak peka huruf besar-kecil dan tidak menghukum tanda baca** — itu bukan
asumsi, itu terbaca dari data: pada baris `b1 / aura-2-en`, `council` → `Council` **tidak**
dihitung sebagai galat, sedangkan `remained` → `remain` dihitung.

**Dua baris yang tidak nol, dengan aritmetikanya:**

| Baris | Referensi | Transkripsi | Galat | N | WER |
|---|---|---|---|---|---|
| `c1 / aura-1` | "**On balance,** the evidence suggests that the intervention succeeded, albeit within narrow limits." | "**Unbalanced,** the evidence suggests …" | 2 kata (`On balance` → `Unbalanced` = 1 substitusi + 1 penghapusan) | 13 | 2/13 = 0,1538 → **0,154** |
| `b1 / aura-2-en` | "… though several members **remained** doubtful." | "… though several members **remain** doubtful." | 1 substitusi | 14 | 1/14 = 0,0714 → **0,071** |

**Angka yang dipakai `tools/prerender-tts.mjs` adalah rata-rata keempat kalimat:**

| Model | WER per kalimat (A1, A2, B1, C1) | Rata-rata sesungguhnya | Angka di kode |
|---|---|---|---|
| `@cf/deepgram/aura-1` | 0,0 · 0,0 · 0,0 · 0,154 | **0,03850** | `wer: 0.038` |
| `@cf/deepgram/aura-2-en` | 0,0 · 0,0 · 0,071 · 0,0 | **0,01775** | `wer: 0.018` |

Reproduksinya satu perintah, langsung dari berkas di direktori ini:

```bash
node -e 'const d=require("./reports/evidence/tts-wer/pilot-quality.json");
for (const m of ["aura-1","aura-2-en"]) {
  const w=d.filter(r=>r.model===m&&r.wer!==null).map(r=>r.wer);
  console.log(m, w, "mean="+(w.reduce((a,b)=>a+b,0)/w.length));
}'
# aura-1     [ 0, 0, 0, 0.154 ] mean=0.0385
# aura-2-en  [ 0, 0, 0.071, 0 ] mean=0.01775
```

**Satu ketidakkonsistenan pembulatan yang harus dikatakan, bukan dirapikan:** 0,03850
dituliskan `0.038` (dipotong) sedangkan 0,01775 dituliskan `0.018` (dibulatkan ke atas).
Dua arah pembulatan yang berbeda pada satu blok data yang sama. Selisihnya tidak mengubah
keputusan apa pun (aura-2-en tetap ±2× lebih akurat pada sampel ini), dan angka di kode
**tidak diubah** oleh berkas ini — mengubahnya akan memutus `prerender-plan-test.js:146`
tanpa satu pengukuran baru pun yang membenarkannya. Yang berubah hanya: sekarang siapa pun
bisa melihat asal pembulatannya.

## 4. Penolakan melotts — juga ada buktinya

`REJECTED_MODELS` di `tools/prerender-tts.mjs` menolak `@cf/myshell-ai/melotts` dengan
alasan "gagal HTTP 500 pada 3 dari 4 kalimat uji walau diulang 3×, dan keluarannya WAV
base64". `pilot-quality.json` mengonfirmasi angkanya: baris melotts untuk A1, A2, B1
semuanya `"http": "500"`, `"bytes": 0`, `"wer": null`; hanya C1 yang `200` — **3 dari 4
gagal, tepat seperti yang diklaim**. Bentuk galatnya bisa dibaca di dua berkas
`melotts-error-attempt-*.json` (`code: 3043`). Petunjuk container WAV: pada C1, melotts
menghasilkan `c1-melotts.wav` (487 KB) di samping `.mp3`, sementara kedua model aura hanya
mengeluarkan MP3 — dan pekerja audio menyajikan objek bernama `<sha256>.mp3`.

## 5. Batas — baca ini sebelum mengutip angkanya

1. **n = 4 kalimat per model.** Ini pilot penyaring model, **bukan** evaluasi WER. Pada
   n=4, satu kalimat yang gagal menggeser rata-rata sebesar 0,25/N-nya sendiri: seluruh
   selisih 0,038 vs 0,018 ditentukan oleh **dua kalimat** (`c1/aura-1` dan `b1/aura-2-en`).
   Menyebutnya "aura-2-en dua kali lebih akurat" adalah pembacaan berlebih atas dua kalimat.
2. **Satu kali jalan, tanpa ulangan.** Tidak ada varians, tidak ada selang kepercayaan.
   Whisper sendiri bukan pengukur sempurna; sebagian "galat" bisa jadi galat pengenal, bukan
   galat pelafalan. `avg_logprob −0,094` pada sampel C1 menunjukkan transkripsi yang percaya
   diri, tapi satu sampel bukan kalibrasi.
3. **Kalimatnya buatan tangan, bukan sampel acak dari korpus.** Keempatnya dipilih untuk
   membentangkan tingkat A1→C1, bukan diambil acak dari 604.962 karakter bank yang benar-benar
   akan dirender. Angka WER di sini **tidak** bisa diperlakukan sebagai perkiraan mutu atas
   korpus itu.
4. **Kolom `ms` di `pilot-quality.json` BUKAN angka probe di kode.** `tools/prerender-tts.mjs`
   memuat `probe: { chars: 84, ms: 961 }` (aura-1) dan `{ chars: 84, ms: 2510 }` (aura-2-en);
   itu pengukuran 84 karakter yang terpisah (jejaknya: `_cf_deepgram_aura-1.bin` 25.704 B dan
   `_cf_deepgram_aura-2-en.bin` 32.688 B, ukuran yang sama dengan `bytes` di kode). Kolom `ms`
   di sini (368–933 ms untuk aura-1, 2.124–3.077 ms untuk aura-2-en) adalah latensi keempat
   kalimat pilot. Keduanya **konsisten arahnya** (aura-2-en 2–6× lebih lambat) tetapi bukan
   angka yang sama — jangan dipertukarkan.
5. **Audio mentahnya tidak berversi di repo** (§1). Verifikasi ulang penuh (kirim ulang audio
   ke Whisper) hanya mungkin selama `/home/user/workspace/tts-pilot/` masih ada. Yang
   berversi di sini adalah transkripsi dan aritmetikanya.
6. **Nol pengujian pendengar manusia.** WER mengukur apakah kata terdengar sebagai kata yang
   benar, bukan apakah suaranya nyaman untuk pelajaran 20 menit. Tidak ada bukti untuk yang
   kedua, dan tidak ada satu pun angka di repo yang mengklaimnya.

## 6. Yang seharusnya dilakukan kalau angka ini mau dijadikan dasar keputusan lebih besar

Keputusan yang ditopang sekarang — **aura-1 sebagai bawaan korpus, aura-2-en dipakai terarah
pada `RISKY_PHRASES`** — memang cukup ditopang oleh 4 kalimat: yang dibuktikan hanyalah
"aura-1 sesekali salah melafalkan frasa tertentu, dan aura-2-en tidak", dan itulah yang
persis dilakukan `RISKY_PHRASES` (frasa `On balance` ada di daftarnya). Kalau nanti ada yang
ingin mengklaim mutu korpus secara umum, atau membayar 2× harga untuk seluruh 604.962
karakter, angka ini **tidak cukup**: yang dibutuhkan minimal 50–100 kalimat yang diambil
acak dari bank sungguhan, dengan ≥3 ulangan, dan skrip WER-nya sendiri masuk repo sebagai
gerbang.

---

## Sumber

- Angka yang dijelaskan: `tools/prerender-tts.mjs:87,96` (`MODELS[].wer`), dijaga
  `prerender-plan-test.js:146`
- Temuan utang bukti: `reports/add-a10-kepatuhan.md` §2.3 ("TIDAK ADA BUKTI SAMA SEKALI") dan §3 R9
- Artefak mentah asal: `/home/user/workspace/tts-pilot/` (`quality.json`, `_tx.json`,
  `melotts.json`, `m.out`, 22 berkas audio yang tidak dibawa masuk)
- Penolakan melotts: `tools/prerender-tts.mjs` `REJECTED_MODELS`
- Alat transkripsi: Workers AI Whisper — dokumentasi model di
  [Cloudflare Workers AI models](https://developers.cloudflare.com/workers-ai/models/)
- Model TTS: [`@cf/deepgram/aura-1`](https://developers.cloudflare.com/workers-ai/models/aura-1/)
