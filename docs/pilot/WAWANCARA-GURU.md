# Panduan Wawancara Guru — 30 menit, sebelum Sprint 2 dibangun

Wewenang: OWNER. Tujuan: menemukan pekerjaan guru yang **wajib, berulang, dan menyakitkan**,
supaya Siklus 24 Jam (PR malam → Briefing pagi → Pemanasan 5 menit) dibangun di atas rasa
sakit yang nyata, bukan tebakan.

## Aturan utama: tanya KEJADIAN, bukan PENDAPAT

Guru akan menjawab pertanyaan pendapat ("apa yang bikin Ibu lelah?") dengan sopan dan
umum. Cerita tentang hari tertentu tidak bisa dipoles. Jadi:

- ❌ "Apakah Ibu butuh aplikasi untuk mengoreksi?" → jawabannya selalu "iya, bagus itu".
- ✅ "Kapan terakhir Ibu mengoreksi PR? Ceritakan dari awal sampai selesai."

Jangan tunjukkan FIEZEL sampai pertanyaan 1–7 selesai. Begitu produk terlihat, guru mulai
menjawab tentang produkmu, bukan tentang pekerjaannya.

## Pertanyaan

1. "Ceritakan apa saja yang Ibu/Bapak kerjakan **Minggu malam kemarin** untuk kelas Senin."
   *Catat: berapa menit, alat apa (kertas, WA, Excel, buku), bagian mana yang ia keluhkan.*
2. "Kapan terakhir memberi PR bahasa Inggris? Bagaimana memeriksanya? Berapa lama?"
3. "Bagaimana Ibu tahu ada murid yang **menyontek PR**? Apa yang Ibu lakukan waktu itu?"
4. "Sebelum mengajar materi baru, bagaimana Ibu tahu bagian mana dari pelajaran kemarin yang
   belum dipahami kelas?" *Kalau jawabannya "tanya di kelas" → itulah celah Briefing pagi.*
5. "Apa yang Ibu lakukan di **5 menit pertama** jam pelajaran minggu lalu?"
6. "Semester kemarin, menulis **deskripsi rapor** butuh berapa malam? Dari mana bahannya?"
   *Dengarkan istilahnya: KKTP, TP, capaian — pakai kata yang sama di produk.*
7. "Kapan terakhir orang tua menanyakan perkembangan anaknya? Lewat apa? Apa yang Ibu jawab?"
8. *(Baru sekarang tunjukkan demo guru.)* "Dari yang Ibu lihat, mana yang akan Ibu pakai
   **besok pagi**? Mana yang tidak?"
9. "Kalau ini hilang setelah dua minggu dipakai, apa yang paling Ibu rindukan?"

## Yang dicatat untuk setiap guru

| Kolom | Isi |
|---|---|
| Menit/minggu menyiapkan + mengoreksi | angka dari pertanyaan 1–2 (ini juga garis dasar pilot) |
| Rasa sakit #1 dengan kata-kata guru sendiri | kutipan persis |
| Pernah menangkap contekan? | ya/tidak + caranya |
| Ritual 5 menit pertama | apa yang dilakukan sekarang |
| Fitur yang akan dipakai besok | dari pertanyaan 8 |

## Keputusan setelah 3 wawancara

- Kalau **2 dari 3** guru menyebut "tidak tahu bagian mana yang belum dipahami" atau
  "mengoreksi PR" sebagai rasa sakit utama → Sprint 2 (Siklus 24 Jam) jalan, dimulai dengan
  uji manual: selama 2 minggu owner membaca tab Hasil tiap pagi lalu mengirim WA
  "3 hal untuk 10 menit pertama" ke guru pilot. Diotomatiskan hanya bila guru memakainya
  ≥3 pagi per minggu.
- Kalau rasa sakit utamanya **rapor/administrasi** → Sprint 3 (rekap KKTP) didahulukan.
- Kalau tidak ada pola → wawancarai 2 guru lagi sebelum membangun apa pun.
