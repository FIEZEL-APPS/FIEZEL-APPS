# FIEZEL Audio Lane — WAV Reference dan Saklar A/B Handoff

Tanggal: 2026-08-20 WIB
Lane: audio (neural voice), diserahkan OWNER kepada MASTER pada 2026-08-20
Release: `DIAG_BUILD=m025-64`, `SW_REV=m025-64-wav-reference-probe-20260820-1`
Base: `main@e5a77aa`
Status: instrumen diagnostik, **bukan perbaikan audio**. Tidak ada perilaku pemutaran normal yang diubah.

## MASALAH YANG DIKERJAKAN

Tiga rilis berturut-turut dinyatakan gagal oleh OWNER pada perangkat nyata:

- m025-45 fade/anti-klik
- m025-48 conditioning + buffer lebih dalam + preferensi 44.1 kHz
- m025-51 (M028.2) hapus fade tepi per-chunk di Apple standalone, matikan sentence streaming, naikkan cap ke 128 karakter — **"tidak ada perubahan sama sekali"**

Ketiganya machine-verified. Tidak satu pun bisa menjawab pertanyaan paling dasar: **cacatnya di suara yang dihasilkan model, atau di jalur pemutaran FIEZEL?**

A/B `raw` vs `conditioned` dari T-026 tidak bisa menjawabnya, dan handoff T-026 sendiri sudah menyatakannya: kedua mode tetap melewati WebAudio, worklet, penjadwalan, dan fade yang sama. Ketika keduanya terdengar pecah, hasilnya `INCONCLUSIVE` menurut aturan T-026 sendiri.

Lebih buruk: A/B itu **tidak pernah bisa dijalankan** di perangkat yang punya cacatnya. Modenya hanya bisa dipicu lewat parameter URL, sementara FIEZEL mewajibkan notifikasi dan iOS hanya memberi Notification API ke aplikasi layar-utama — jadi tab Safari, satu-satunya tempat parameter bisa diketik, berhenti di gerbang notifikasi.

## APA YANG DITAMBAHKAN

1. **Mode `wavref`** — PCM yang persis sama dibungkus menjadi WAV 16-bit dan dimainkan lewat elemen `<audio>` biasa. Tanpa AudioContext, tanpa worklet, tanpa penjadwalan, tanpa fade. Gate membuktikan kemandiriannya dengan menjalankan jalur ini di lingkungan yang **tidak punya AudioContext sama sekali**.
2. **Mode tersimpan + saklar di panel Diagnostics** — empat tombol: Normal, RAW, CONDITIONED, WAV REF. Berlaku 24 jam lalu otomatis kembali normal. Panel menyebut mode yang benar-benar aktif, dan dump Diagnostics membawa `pcmMode`.

Bug yang ditemukan saat menyambungkannya: `pcmDiagnosticMode()` keluar lebih awal (`if (!search) return ''`) ketika URL tidak membawa parameter, sehingga mode tersimpan tidak pernah terbaca. Saklar apa pun akan diam-diam tidak berpengaruh. Sekarang penentuannya jatuh ke mode tersimpan, dengan urutan tetap: opsi eksplisit > URL > tersimpan.

## CARA OWNER MENJALANKAN UJI INI

Perangkat, volume, teks, dan voice yang sama untuk semua arm. Setelah menekan tombol mode, **tutup FIEZEL sepenuhnya lalu buka lagi** — mode dibaca saat player dibuat.

**Langkah 0 wajib:** buka Peta Belajar → kartu **Kesehatan Instalasi**. Kalau tertulis shell lama masih dipakai, hentikan; yang sedang diuji bukan build yang dikira. Ini yang tidak ada saat m025-45 → m025-51.

1. Normal → dengarkan satu teks pendek dan satu teks panjang.
2. WAV REF → teks yang sama.
3. RAW → teks yang sama.
4. CONDITIONED → teks yang sama.

Ekspor Diagnostics setelah setiap arm.

## CARA MEMBACA HASILNYA

| Normal | WAV REF | Kesimpulan yang boleh diambil |
|---|---|---|
| pecah | **bersih** | Cacat ada di jalur pemutaran FIEZEL (WebAudio/worklet/penjadwalan/fade). Model dan PCM tidak bersalah. Perbaikan berikutnya di sana. |
| pecah | pecah | Cacat BUKAN pada penjadwalan kita. Fokus pindah ke sumber PCM, resampling perangkat, atau output OS. |
| bersih | bersih | Cacatnya tidak muncul pada kondisi uji ini; ulangi pada teks panjang dan kondisi yang benar-benar pernah gagal. |

RAW vs CONDITIONED tetap berguna sebagai lapis kedua: kalau WAV REF bersih dan Normal pecah, bandingkan keduanya untuk melihat apakah `conditionSamples()` ikut menyumbang.

Yang TIDAK boleh disimpulkan: "vocoder rusak" hanya karena semua arm terdengar pecah. Itu justru menunjuk ke luar penjadwalan kita, bukan ke model secara khusus.

## BATAS

- Tidak ada perbaikan audio di rilis ini. Aturan yang saya tetapkan sendiri masih berlaku: tidak ada tambalan audio buta sebelum A/B ini benar-benar dijalankan di perangkat.
- Jalur produksi normal tidak berubah; `conditionSamples()` tetap berjalan seperti sebelumnya di mode normal, dan gate mengunci itu.
- `encodeWav()` hanya dipanggil dari jalur pembanding — dikunci gate dengan menghitung pemanggilannya.

## LANJUTAN SETELAH HASIL FISIK MASUK

- Normal pecah + WAV REF bersih → audit jalur pemutaran: worklet enqueue, seam antar-chunk, fade, dan underrun. Bukti pendukung sudah ada di #87 (jeda antar kalimat ≈ durasi generate berikutnya; 21 ms di dalam satu panggilan multi-chunk).
- Kedua-duanya pecah → bandingkan PCM yang sama pada perangkat lain untuk memisahkan perangkat/OS dari sumber PCM.
- Apa pun hasilnya, tulis di #87 dan #12 sebelum ada baris kode audio berikutnya yang diubah.
