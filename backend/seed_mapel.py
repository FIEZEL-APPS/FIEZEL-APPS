"""Seed Kurikulum Merdeka — MATA PELAJARAN SELAIN BAHASA INGGRIS.

Bahasa Inggris punya penyemainya sendiri (seed_english.py, Fase A–F/Kelas 1–12) karena ia
mata pelajaran inti FIEZEL dan bentuknya berbeda: tiga elemen yang sama di setiap fase.
Berkas ini untuk sisanya, yang tiap mapelnya punya daftar elemen sendiri.

==========================================================================
KENAPA MESINNYA GENERIK DAN ISINYA TABEL
==========================================================================
Menambah satu mata pelajaran seharusnya menambah DATA, bukan kode. Versi pertama yang
ditulis sebagai fungsi-per-mapel akan melahirkan sepuluh salinan logika penomoran id,
perantaian prasyarat, dan pembuatan topik/materi — sepuluh tempat yang bisa menyimpang
diam-diam, dan sembilan di antaranya tidak akan pernah dibaca ulang siapa pun.

Jadi: satu pembangun, satu tabel. `MAPEL` di bawah adalah seluruh isinya, dan gelombang
berikutnya cukup menambah entri.

==========================================================================
BATAS YANG WAJIB DIKETAHUI PEMBACA BERIKUTNYA — DAN OWNER
==========================================================================
Rumusan Capaian Pembelajaran di sini adalah RUMUSAN YANG SETIA PADA ISINYA, bukan salinan
verbatim Kepmendikbudristek. Ia ditulis supaya bisa dipakai mengajar dan supaya struktur
graf kompetensinya sah, bukan supaya bisa dikutip sebagai dokumen resmi.

Kalau FIEZEL kelak dipakai di luar kelas owner sendiri, teks CP WAJIB diganti dengan
salinan resmi dari dokumen Kemendikbud. Ini utang yang disengaja dan disebut, bukan
kelalaian — dicatat juga di docs/handoffs/KURIKULUM-SEKOLAH-HANDOFF.md.

Prasyarat dirantai vertikal persis seperti seed_english.py: kompetensi ke-n pada elemen
yang sama di kelas sebelumnya menjadi prasyarat kompetensi ke-n di kelas berikutnya.
Idempoten & non-destruktif — node lama tidak diubah.
"""
from fastapi import APIRouter, Depends

from db import db
from auth import teacher_user
from curriculum import NodeIn, create_node

router = APIRouter(prefix="/api/seed", tags=["seed"])

PHASE_OF = {7: "D", 8: "D", 9: "D"}
PHASE_NAME = {"D": ("Fase D", "Kelas 7–9")}

# ==========================================================================
# TABEL ISI
# ==========================================================================
# MAPEL[kode] = {
#   "nama": str, "urutan": int,
#   "elemen": { kode_elemen: nama_elemen },
#   "cp":     { (fase, kode_elemen): rumusan CP },
#   "grade":  { kelas: { kode_elemen: [ (tp, indikator, [(kompetensi, materi), ...]) ] } }
# }
MAPEL: dict[str, dict] = {
    "MAT": {
        "nama": "Matematika",
        "urutan": 1,
        "elemen": {
            "BIL": "Bilangan",
            "ALJ": "Aljabar",
            "PNG": "Pengukuran",
            "GEO": "Geometri",
            "DAT": "Analisis Data dan Peluang",
        },
        "cp": {
            ("D", "BIL"): "Pada akhir Fase D, peserta didik menyelesaikan masalah yang berkaitan dengan bilangan bulat, pecahan, rasio, proporsi, serta bilangan berpangkat dan bentuk akar.",
            ("D", "ALJ"): "Pada akhir Fase D, peserta didik menggunakan variabel, bentuk aljabar, persamaan dan pertidaksamaan linear, relasi dan fungsi, serta sistem persamaan linear dua variabel untuk memodelkan masalah.",
            ("D", "PNG"): "Pada akhir Fase D, peserta didik menentukan keliling, luas, luas permukaan, dan volume bangun datar serta bangun ruang, termasuk penggunaan satuan yang tepat.",
            ("D", "GEO"): "Pada akhir Fase D, peserta didik menganalisis hubungan antar sudut, kesebangunan, kekongruenan, dan menerapkan teorema Pythagoras dalam penyelesaian masalah.",
            ("D", "DAT"): "Pada akhir Fase D, peserta didik menyajikan dan menafsirkan data, menentukan ukuran pemusatan dan penyebaran, serta menghitung peluang kejadian sederhana.",
        },
        "grade": {
            7: {
                "BIL": [("Menyelesaikan operasi bilangan bulat dan pecahan dalam konteks",
                         "Menghitung dan menafsirkan hasil operasi bilangan", [
                             ("Melakukan operasi hitung bilangan bulat termasuk bilangan negatif",
                              "Garis bilangan, penjumlahan dan pengurangan bilangan negatif, urutan operasi. Konteks: suhu, ketinggian, saldo."),
                             ("Menyelesaikan operasi pecahan, desimal, dan persen secara terhubung",
                              "Mengubah bentuk pecahan–desimal–persen; operasi campuran. Konteks: diskon, resep masakan, pembagian porsi.")]),
                        ("Menggunakan rasio dan proporsi untuk membandingkan",
                         "Memakai rasio pada situasi sehari-hari", [
                             ("Menyatakan perbandingan dua besaran sebagai rasio yang sah",
                              "Rasio a:b, penyederhanaan, perbandingan senilai. Konteks: skala peta, campuran bahan."),
                             ("Menyelesaikan masalah proporsi senilai dan berbalik nilai",
                              "Proporsi senilai vs berbalik nilai, dan cara membedakannya dari konteks. Konteks: kecepatan, jumlah pekerja.")]),
                        ],
                "ALJ": [("Memodelkan situasi dengan bentuk aljabar dan persamaan linear",
                         "Menyusun dan menyelesaikan persamaan satu variabel", [
                             ("Menyusun bentuk aljabar dari kalimat situasi",
                              "Variabel, koefisien, suku sejenis; menerjemahkan kalimat menjadi bentuk aljabar."),
                             ("Menyelesaikan persamaan linear satu variabel",
                              "Sifat kesetaraan, langkah penyelesaian, dan pemeriksaan jawaban ke situasi asalnya.")]),
                        ],
                "PNG": [("Menentukan keliling dan luas bangun datar",
                         "Menghitung keliling dan luas dengan satuan yang tepat", [
                             ("Menghitung keliling dan luas segitiga dan segi empat",
                              "Rumus keliling dan luas; membedakan keduanya lewat satuan (cm vs cm²)."),
                             ("Menyelesaikan masalah luas gabungan bangun datar",
                              "Memecah bangun majemuk menjadi bangun dasar. Konteks: denah ruang, taman.")]),
                        ],
                "GEO": [("Menganalisis hubungan antar sudut",
                         "Mengenali dan menghitung besar sudut pada konfigurasi garis", [
                             ("Menentukan hubungan sudut berpelurus, berpenyiku, dan bertolak belakang",
                              "Sudut berpelurus 180°, berpenyiku 90°, bertolak belakang sama besar."),
                             ("Menentukan sudut pada dua garis sejajar dipotong transversal",
                              "Sudut sehadap, dalam berseberangan, luar berseberangan, dalam sepihak.")]),
                        ],
                "DAT": [("Menyajikan dan menafsirkan data",
                         "Membaca dan membuat penyajian data yang tepat", [
                             ("Menyajikan data dalam tabel, diagram batang, dan diagram garis",
                              "Memilih bentuk penyajian sesuai jenis data; membaca sumbu dan skala."),
                             ("Menentukan mean, median, dan modus serta menafsirkannya",
                              "Menghitung ketiganya dan memilih yang paling mewakili data pada konteks tertentu.")]),
                        ],
            },
            8: {
                "BIL": [("Menggunakan bilangan berpangkat dan bentuk akar",
                         "Mengoperasikan pangkat dan akar", [
                             ("Menerapkan sifat-sifat bilangan berpangkat bulat",
                              "Sifat perkalian, pembagian, pangkat nol dan pangkat negatif."),
                             ("Menyederhanakan dan mengoperasikan bentuk akar",
                              "Akar kuadrat, penyederhanaan, dan merasionalkan penyebut sederhana.")]),
                        ],
                "ALJ": [("Menggunakan relasi dan fungsi untuk memodelkan hubungan",
                         "Membedakan relasi dan fungsi serta membaca grafiknya", [
                             ("Membedakan relasi dan fungsi dari berbagai penyajian",
                              "Diagram panah, himpunan pasangan berurutan, tabel, grafik; uji garis vertikal."),
                             ("Menentukan persamaan garis lurus dan gradiennya",
                              "y = mx + c, makna gradien sebagai laju perubahan. Konteks: biaya tetap dan variabel.")]),
                        ],
                "PNG": [("Menentukan luas permukaan dan volume bangun ruang sisi datar",
                         "Menghitung luas permukaan dan volume", [
                             ("Menghitung luas permukaan kubus, balok, prisma, dan limas",
                              "Jaring-jaring sebagai jalan memahami luas permukaan, bukan sekadar rumus hafalan."),
                             ("Menghitung volume bangun ruang sisi datar dan masalahnya",
                              "Volume = luas alas × tinggi; konteks wadah, kemasan, dan bak air.")]),
                        ],
                "GEO": [("Menerapkan teorema Pythagoras",
                         "Menggunakan Pythagoras pada segitiga siku-siku", [
                             ("Menentukan panjang sisi segitiga siku-siku dengan Pythagoras",
                              "a² + b² = c²; mengenali sisi miring sebelum menghitung."),
                             ("Menyelesaikan masalah kontekstual dengan Pythagoras",
                              "Jarak terpendek, tinggi tangga bersandar, diagonal layar dan ruangan.")]),
                        ],
                "DAT": [("Menentukan peluang kejadian sederhana",
                         "Menghitung peluang secara empirik dan teoretik", [
                             ("Menentukan ruang sampel suatu percobaan",
                              "Daftar, tabel, dan diagram pohon untuk dadu, koin, dan kartu."),
                             ("Menghitung peluang teoretik dan membandingkannya dengan frekuensi relatif",
                              "P(A) = n(A)/n(S); kenapa hasil percobaan tidak selalu sama dengan peluang teoretiknya.")]),
                        ],
            },
            9: {
                "BIL": [("Menggunakan notasi ilmiah dan bilangan besar",
                         "Menyatakan dan mengoperasikan bilangan sangat besar dan sangat kecil", [
                             ("Menyatakan bilangan dalam notasi ilmiah",
                              "a × 10ⁿ dengan 1 ≤ a < 10. Konteks: jarak antariksa, ukuran sel."),
                             ("Mengoperasikan bilangan dalam notasi ilmiah",
                              "Perkalian dan pembagian notasi ilmiah, serta membaca hasilnya kembali ke konteks.")]),
                        ],
                "ALJ": [("Menyelesaikan persamaan kuadrat dan sistem persamaan linear",
                         "Memodelkan dan menyelesaikan persamaan tingkat lanjut", [
                             ("Menyelesaikan sistem persamaan linear dua variabel",
                              "Substitusi, eliminasi, dan penafsiran titik potong sebagai penyelesaian bersama."),
                             ("Menyelesaikan persamaan kuadrat dengan pemfaktoran dan rumus abc",
                              "Bentuk ax² + bx + c = 0; memilih metode sesuai bentuk soalnya.")]),
                        ],
                "PNG": [("Menentukan luas permukaan dan volume bangun ruang sisi lengkung",
                         "Menghitung tabung, kerucut, dan bola", [
                             ("Menghitung luas permukaan tabung, kerucut, dan bola",
                              "Peran π; membedakan selimut dari luas permukaan seluruhnya."),
                             ("Menghitung volume bangun ruang sisi lengkung dan masalahnya",
                              "Volume tabung, kerucut (⅓), dan bola; konteks kemasan dan tangki.")]),
                        ],
                "GEO": [("Menganalisis kesebangunan dan kekongruenan",
                         "Menentukan kesebangunan dan kekongruenan bangun", [
                             ("Menentukan dua bangun sebangun dan menghitung sisi yang belum diketahui",
                              "Syarat sebangun: sudut sama besar dan sisi sebanding. Konteks: skala, foto, bayangan."),
                             ("Membuktikan kekongruenan dua segitiga",
                              "Kriteria SSS, SAS, ASA; bedanya dengan sebangun.")]),
                        ],
                "DAT": [("Menafsirkan penyebaran data",
                         "Menggunakan ukuran penyebaran untuk membandingkan kelompok", [
                             ("Menentukan jangkauan, kuartil, dan jangkauan antarkuartil",
                              "Q1, Q2, Q3; membaca diagram kotak garis."),
                             ("Membandingkan dua kelompok data dengan ukuran pemusatan dan penyebaran",
                              "Kenapa rata-rata saja bisa menyesatkan tanpa melihat sebarannya.")]),
                        ],
            },
        },
    },
    "IND": {
        "nama": "Bahasa Indonesia",
        "urutan": 2,
        "elemen": {
            "MYK": "Menyimak",
            "MBC": "Membaca dan Memirsa",
            "BIC": "Berbicara dan Mempresentasikan",
            "TUL": "Menulis",
        },
        "cp": {
            ("D", "MYK"): "Pada akhir Fase D, peserta didik memahami informasi, gagasan, pesan, dan pandangan dari teks lisan dan audiovisual pada berbagai jenis teks.",
            ("D", "MBC"): "Pada akhir Fase D, peserta didik memahami, menafsirkan, dan mengevaluasi informasi serta gagasan dari teks deskripsi, narasi, prosedur, eksposisi, dan persuasi.",
            ("D", "BIC"): "Pada akhir Fase D, peserta didik menyampaikan gagasan dan tanggapan secara lisan dengan runtut, santun, dan sesuai konteks.",
            ("D", "TUL"): "Pada akhir Fase D, peserta didik menulis berbagai jenis teks dengan struktur, kaidah kebahasaan, dan ejaan yang tepat.",
        },
        "grade": {
            7: {
                "MYK": [("Menyimak teks deskripsi dan narasi lisan",
                         "Menemukan informasi dan pesan dari teks yang didengar", [
                             ("Menemukan informasi penting dari teks lisan",
                              "Mencatat pokok informasi: siapa, apa, di mana, kapan, mengapa, bagaimana."),
                             ("Menyimpulkan pesan atau amanat dari teks naratif lisan",
                              "Membedakan pesan tersurat dan tersirat dari cerita yang didengar.")]),
                        ],
                "MBC": [("Membaca teks deskripsi dan menemukan strukturnya",
                         "Menganalisis struktur dan ciri kebahasaan teks deskripsi", [
                             ("Mengidentifikasi struktur teks deskripsi",
                              "Identifikasi, deskripsi bagian, simpulan/kesan; ciri: kata sifat dan pancaindra."),
                             ("Menafsirkan makna kata dan kalimat dalam konteks bacaan",
                              "Makna denotatif dan konotatif; menebak makna kata dari konteks kalimatnya.")]),
                        ],
                "BIC": [("Menyampaikan tanggapan secara lisan dengan santun",
                         "Berbicara runtut dan menanggapi pendapat orang lain", [
                             ("Menyampaikan gagasan secara runtut dalam diskusi kelas",
                              "Struktur: pernyataan, alasan, contoh. Intonasi dan kontak mata."),
                             ("Menanggapi pendapat orang lain dengan santun",
                              "Kalimat penanda setuju/tidak setuju yang tidak menyerang pribadi.")]),
                        ],
                "TUL": [("Menulis teks deskripsi",
                         "Menulis deskripsi dengan struktur dan ejaan tepat", [
                             ("Menulis teks deskripsi dengan struktur lengkap",
                              "Kerangka sebelum menulis; mengembangkan tiap bagian jadi paragraf."),
                             ("Menerapkan ejaan dan tanda baca dengan tepat",
                              "Huruf kapital, tanda titik dan koma, kata depan vs awalan.")]),
                        ],
            },
            8: {
                "MYK": [("Menyimak teks eksposisi dan berita lisan",
                         "Membedakan fakta dan opini dari teks lisan", [
                             ("Membedakan fakta dan opini dalam berita yang didengar",
                              "Penanda opini: menurut saya, sebaiknya, mungkin. Penanda fakta: data, angka, waktu."),
                             ("Menyimpulkan gagasan utama teks eksposisi lisan",
                              "Menangkap tesis dan argumen pendukung dari paparan lisan.")]),
                        ],
                "MBC": [("Membaca teks eksposisi dan prosedur",
                         "Menganalisis struktur teks eksposisi dan prosedur", [
                             ("Mengidentifikasi tesis, argumen, dan penegasan ulang",
                              "Struktur eksposisi dan penanda argumentasi: karena, oleh sebab itu, dengan demikian."),
                             ("Mengikuti dan mengevaluasi kelengkapan teks prosedur",
                              "Urutan langkah, kalimat perintah, dan akibat kalau satu langkah hilang.")]),
                        ],
                "BIC": [("Mempresentasikan hasil pengamatan atau bacaan",
                         "Menyampaikan presentasi singkat yang terstruktur", [
                             ("Menyusun dan menyampaikan presentasi singkat",
                              "Pembuka, isi, penutup; alat bantu visual seperlunya."),
                             ("Menjawab pertanyaan audiens dengan relevan",
                              "Mendengarkan pertanyaan sampai selesai sebelum menjawab; mengakui jika tidak tahu.")]),
                        ],
                "TUL": [("Menulis teks eksposisi",
                         "Menulis argumen dengan bukti pendukung", [
                             ("Menulis teks eksposisi dengan tesis dan argumen yang jelas",
                              "Satu paragraf satu gagasan; kalimat topik di awal."),
                             ("Menggunakan konjungsi dan kalimat efektif",
                              "Konjungsi antarkalimat; membuang kata mubazir agar kalimat efektif.")]),
                        ],
            },
            9: {
                "MYK": [("Menyimak teks persuasi dan diskusi",
                         "Mengevaluasi kekuatan argumen yang didengar", [
                             ("Mengenali teknik persuasi dalam teks lisan",
                              "Ajakan, imbauan, dan bukti; mengenali klaim tanpa dasar."),
                             ("Mengevaluasi kekuatan argumen dalam diskusi",
                              "Membedakan argumen berdasar bukti dari yang berdasar perasaan.")]),
                        ],
                "MBC": [("Membaca teks persuasi dan cerita pendek",
                         "Menafsirkan dan mengevaluasi teks sastra dan nonsastra", [
                             ("Mengevaluasi keberpihakan dan bukti dalam teks persuasi",
                              "Mencari data pendukung; membedakan fakta dari klaim penulis."),
                             ("Menganalisis unsur intrinsik cerita pendek",
                              "Tokoh, alur, latar, sudut pandang, dan tema; bagaimana keduanya saling menopang.")]),
                        ],
                "BIC": [("Berdiskusi dan berargumen dalam forum",
                         "Mempertahankan pendapat secara santun dan berbukti", [
                             ("Menyampaikan argumen disertai bukti dalam diskusi",
                              "Klaim, data, dan penalaran; menyebut sumber saat memakai data."),
                             ("Menanggapi sanggahan tanpa menyerang pribadi",
                              "Memisahkan gagasan dari orangnya; kalimat sanggahan yang menjaga hubungan.")]),
                        ],
                "TUL": [("Menulis teks persuasi dan cerita",
                         "Menulis teks dengan tujuan dan pembaca yang jelas", [
                             ("Menulis teks persuasi dengan bukti yang relevan",
                              "Struktur: pengenalan isu, rangkaian argumen, ajakan; bukti sebelum ajakan."),
                             ("Menulis cerita pendek dengan alur yang utuh",
                              "Konflik sebagai penggerak; awal, puncak, dan penyelesaian yang tidak tergesa.")]),
                        ],
            },
        },
    },
    "IPA": {
        "nama": "Ilmu Pengetahuan Alam",
        "urutan": 3,
        "elemen": {
            "PEM": "Pemahaman IPA",
            "KET": "Keterampilan Proses",
        },
        "cp": {
            ("D", "PEM"): "Pada akhir Fase D, peserta didik memahami zat dan perubahannya, energi dan perubahannya, makhluk hidup dan ekosistem, sistem organ tubuh, serta bumi dan tata surya.",
            ("D", "KET"): "Pada akhir Fase D, peserta didik melakukan pengamatan, merumuskan pertanyaan, merancang dan melaksanakan penyelidikan sederhana, serta mengomunikasikan hasilnya.",
        },
        "grade": {
            7: {
                "PEM": [("Memahami zat, wujud, dan perubahannya",
                         "Menjelaskan sifat zat dan perubahan wujud", [
                             ("Membedakan sifat fisika dan sifat kimia suatu zat",
                              "Sifat fisika: wujud, titik leleh, kelarutan. Sifat kimia: mudah terbakar, berkarat."),
                             ("Menjelaskan perubahan wujud zat dan perpindahan kalornya",
                              "Mencair, membeku, menguap, mengembun, menyublim; kalor diserap atau dilepas.")]),
                        ],
                "KET": [("Melakukan pengamatan dan pengukuran",
                         "Mengukur dengan alat dan satuan yang tepat", [
                             ("Melakukan pengukuran dengan alat ukur baku",
                              "Mistar, neraca, gelas ukur, termometer; membaca skala dengan benar."),
                             ("Mencatat dan menyajikan data hasil pengamatan",
                              "Tabel pengamatan, satuan yang konsisten, dan angka penting sederhana.")]),
                        ],
            },
            8: {
                "PEM": [("Memahami sistem organ tubuh manusia",
                         "Menjelaskan struktur dan fungsi sistem organ", [
                             ("Menjelaskan sistem pencernaan dan peran zat gizi",
                              "Organ pencernaan, enzim, dan fungsi karbohidrat, protein, lemak, vitamin."),
                             ("Menjelaskan sistem peredaran darah dan pernapasan",
                              "Jantung, pembuluh, paru-paru; bagaimana oksigen sampai ke sel.")]),
                        ],
                "KET": [("Merancang penyelidikan sederhana",
                         "Menyusun hipotesis dan variabel penyelidikan", [
                             ("Merumuskan pertanyaan dan hipotesis yang dapat diuji",
                              "Pertanyaan yang bisa dijawab data; hipotesis sebagai dugaan berarah."),
                             ("Menentukan variabel bebas, terikat, dan kontrol",
                              "Kenapa variabel kontrol menentukan apakah kesimpulan boleh ditarik.")]),
                        ],
            },
            9: {
                "PEM": [("Memahami energi, listrik, dan tata surya",
                         "Menjelaskan bentuk energi dan sistem tata surya", [
                             ("Menjelaskan rangkaian listrik dan besaran-besarannya",
                              "Arus, tegangan, hambatan; rangkaian seri dan paralel serta akibatnya."),
                             ("Menjelaskan struktur tata surya dan gerak bumi",
                              "Rotasi dan revolusi, gerhana, dan musim; bukan sekadar urutan nama planet.")]),
                        ],
                "KET": [("Mengomunikasikan hasil penyelidikan",
                         "Menyusun simpulan berdasarkan data", [
                             ("Menganalisis data dan menarik simpulan yang didukung data",
                              "Membedakan simpulan yang didukung data dari pendapat pribadi."),
                             ("Menyusun laporan penyelidikan sederhana",
                              "Tujuan, alat bahan, langkah, data, simpulan; ditulis agar bisa diulang orang lain.")]),
                        ],
            },
        },
    },
    "IPS": {
        "nama": "Ilmu Pengetahuan Sosial",
        "urutan": 4,
        "elemen": {
            "PEM": "Pemahaman Konsep",
            "KET": "Keterampilan Proses",
        },
        "cp": {
            ("D", "PEM"): "Pada akhir Fase D, peserta didik memahami keruangan dan interaksi antarwilayah, perkembangan masyarakat dari masa ke masa, kegiatan ekonomi, serta dinamika sosial budaya.",
            ("D", "KET"): "Pada akhir Fase D, peserta didik mengumpulkan, mengolah, dan menyajikan informasi sosial dari berbagai sumber serta menarik simpulan yang berdasar.",
        },
        "grade": {
            7: {
                "PEM": [("Memahami keruangan dan interaksi antarwilayah",
                         "Menjelaskan kondisi geografis dan pengaruhnya", [
                             ("Membaca peta dan menjelaskan letak wilayah Indonesia",
                              "Letak astronomis dan geografis; simbol, skala, dan arah mata angin."),
                             ("Menjelaskan pengaruh kondisi geografis terhadap kehidupan",
                              "Iklim, relief, dan sumber daya terhadap mata pencaharian dan permukiman.")]),
                        ],
                "KET": [("Mengumpulkan informasi dari berbagai sumber",
                         "Memilih dan memeriksa sumber informasi", [
                             ("Mengumpulkan data dari sumber cetak dan digital",
                              "Wawancara, statistik, berita; mencatat sumber saat mengutip."),
                             ("Menilai kredibilitas sumber informasi",
                              "Siapa penulisnya, kapan ditulis, dan apakah ada data pendukungnya.")]),
                        ],
            },
            8: {
                "PEM": [("Memahami kegiatan ekonomi masyarakat",
                         "Menjelaskan produksi, distribusi, dan konsumsi", [
                             ("Menjelaskan kelangkaan dan pilihan ekonomi",
                              "Kebutuhan vs keinginan; biaya peluang dalam keputusan sehari-hari."),
                             ("Menjelaskan peran pelaku ekonomi dan pasar",
                              "Rumah tangga, perusahaan, pemerintah; terbentuknya harga dari permintaan dan penawaran.")]),
                        ],
                "KET": [("Mengolah dan menyajikan data sosial",
                         "Menyajikan data dalam bentuk yang mudah dibaca", [
                             ("Mengolah data sosial menjadi tabel dan diagram",
                              "Memilih bentuk penyajian yang tidak menyesatkan pembaca."),
                             ("Menafsirkan data sosial dalam konteksnya",
                              "Angka yang sama bisa berarti berbeda bergantung waktu dan tempatnya.")]),
                        ],
            },
            9: {
                "PEM": [("Memahami dinamika sosial dan perubahan masyarakat",
                         "Menjelaskan perubahan sosial dan globalisasi", [
                             ("Menjelaskan bentuk dan faktor perubahan sosial",
                              "Perubahan cepat dan lambat; faktor pendorong dan penghambat."),
                             ("Menjelaskan dampak globalisasi bagi masyarakat lokal",
                              "Dampak pada budaya, ekonomi, dan lingkungan; peluang sekaligus risikonya.")]),
                        ],
                "KET": [("Menyusun simpulan dan rekomendasi",
                         "Menarik simpulan berbasis bukti sosial", [
                             ("Menyusun simpulan berdasarkan data yang dikumpulkan",
                              "Simpulan tidak boleh melampaui apa yang ditunjukkan datanya."),
                             ("Menyusun rekomendasi sederhana atas masalah sosial",
                              "Rekomendasi yang menyebut siapa pelaksananya dan apa langkah pertamanya.")]),
                        ],
            },
        },
    },
    "PPKN": {
        "nama": "Pendidikan Pancasila",
        "urutan": 5,
        "elemen": {
            "PAN": "Pancasila",
            "UUD": "Undang-Undang Dasar NRI Tahun 1945",
            "BTI": "Bhinneka Tunggal Ika",
            "NKR": "Negara Kesatuan Republik Indonesia",
        },
        "cp": {
            ("D", "PAN"): "Pada akhir Fase D, peserta didik memahami kedudukan Pancasila sebagai dasar negara dan pandangan hidup bangsa serta menerapkan nilainya dalam kehidupan sehari-hari.",
            ("D", "UUD"): "Pada akhir Fase D, peserta didik memahami norma dan aturan, hak dan kewajiban warga negara, serta kedudukan UUD NRI Tahun 1945.",
            ("D", "BTI"): "Pada akhir Fase D, peserta didik menghargai keragaman suku, agama, budaya, dan golongan sebagai kekayaan bangsa serta bersikap inklusif.",
            ("D", "NKR"): "Pada akhir Fase D, peserta didik memahami wilayah dan kedaulatan NKRI serta berperan menjaga persatuan dalam lingkup sekolah dan masyarakat.",
        },
        "grade": {
            7: {
                "PAN": [("Memahami Pancasila sebagai dasar negara",
                         "Menjelaskan kedudukan dan nilai Pancasila", [
                             ("Menjelaskan proses perumusan dan penetapan Pancasila",
                              "Sidang BPUPKI dan PPKI; kenapa rumusannya berubah sebelum ditetapkan."),
                             ("Menerapkan nilai sila Pancasila dalam kehidupan sehari-hari",
                              "Contoh nyata tiap sila di kelas, rumah, dan lingkungan.")]),
                        ],
                "UUD": [("Memahami norma dan aturan dalam masyarakat",
                         "Membedakan jenis norma dan akibat pelanggarannya", [
                             ("Membedakan norma agama, kesusilaan, kesopanan, dan hukum",
                              "Sumber, sanksi, dan daya paksa masing-masing norma."),
                             ("Menjelaskan pentingnya menaati aturan di lingkungan terdekat",
                              "Aturan sekolah dan lalu lintas sebagai contoh yang terasa langsung.")]),
                        ],
                "BTI": [("Menghargai keragaman di lingkungan sekitar",
                         "Bersikap terbuka terhadap perbedaan", [
                             ("Mengenali keragaman suku, agama, dan budaya di sekitarnya",
                              "Memetakan keragaman nyata di kelas sendiri, bukan hanya di buku."),
                             ("Menunjukkan sikap menghargai perbedaan dalam pergaulan",
                              "Kalimat dan tindakan yang inklusif; mengenali ujaran yang merendahkan.")]),
                        ],
                "NKR": [("Memahami wilayah NKRI",
                         "Menjelaskan wilayah dan makna persatuan", [
                             ("Menjelaskan batas dan wilayah Negara Kesatuan Republik Indonesia",
                              "Wilayah darat, laut, dan udara; makna negara kepulauan."),
                             ("Menunjukkan perilaku menjaga persatuan di sekolah",
                              "Kerja sama lintas kelompok; menyelesaikan perselisihan tanpa kekerasan.")]),
                        ],
            },
            8: {
                "PAN": [("Menerapkan nilai Pancasila dalam kehidupan bernegara",
                         "Menghubungkan nilai Pancasila dengan kebijakan", [
                             ("Menganalisis penerapan nilai Pancasila dalam kehidupan bernegara",
                              "Contoh kebijakan yang mencerminkan sila tertentu."),
                             ("Menilai perilaku yang bertentangan dengan nilai Pancasila",
                              "Korupsi, diskriminasi, dan main hakim sendiri sebagai contoh pelanggaran nilai.")]),
                        ],
                "UUD": [("Memahami hak dan kewajiban warga negara",
                         "Menjelaskan hak dan kewajiban serta keseimbangannya", [
                             ("Menjelaskan hak dan kewajiban warga negara dalam UUD NRI 1945",
                              "Hak atas pendidikan, pekerjaan, dan perlindungan hukum; kewajiban yang menyertainya."),
                             ("Menganalisis keseimbangan hak dan kewajiban dalam kasus nyata",
                              "Kenapa hak seseorang berbatas pada hak orang lain.")]),
                        ],
                "BTI": [("Membangun kerja sama dalam keragaman",
                         "Bekerja sama lintas perbedaan", [
                             ("Menjelaskan manfaat keragaman bagi kemajuan bersama",
                              "Perbedaan sudut pandang sebagai sumber gagasan, bukan hambatan."),
                             ("Menyelesaikan perbedaan pendapat secara damai",
                              "Musyawarah, mendengarkan, dan mencari titik temu.")]),
                        ],
                "NKR": [("Memahami kedaulatan negara",
                         "Menjelaskan bentuk dan pelaksanaan kedaulatan", [
                             ("Menjelaskan makna kedaulatan rakyat",
                              "Pemilu sebagai pelaksanaan kedaulatan; peran lembaga negara."),
                             ("Menjelaskan ancaman terhadap keutuhan NKRI dan cara menghadapinya",
                              "Ancaman dari dalam dan luar; peran pelajar dalam menjaga persatuan.")]),
                        ],
            },
            9: {
                "PAN": [("Mengamalkan Pancasila dalam kehidupan global",
                         "Menerapkan nilai Pancasila menghadapi tantangan zaman", [
                             ("Menganalisis tantangan penerapan Pancasila di era digital",
                              "Hoaks, ujaran kebencian, dan privasi sebagai ujian nilai Pancasila."),
                             ("Menunjukkan peran pelajar dalam mengamalkan Pancasila",
                              "Tindakan konkret di sekolah dan ruang digital.")]),
                        ],
                "UUD": [("Memahami sistem pemerintahan dan lembaga negara",
                         "Menjelaskan tugas lembaga negara", [
                             ("Menjelaskan tugas dan kewenangan lembaga negara",
                              "MPR, DPR, Presiden, MA, MK; pemisahan dan pembagian kekuasaan."),
                             ("Menjelaskan proses pembentukan peraturan perundang-undangan",
                              "Hierarki peraturan dan alur pembentukan undang-undang.")]),
                        ],
                "BTI": [("Bersikap inklusif dalam masyarakat majemuk",
                         "Menolak diskriminasi dalam kehidupan sehari-hari", [
                             ("Menganalisis bentuk diskriminasi dan dampaknya",
                              "Diskriminasi langsung dan tidak langsung; dampaknya pada korban."),
                             ("Menunjukkan sikap inklusif dan anti-perundungan",
                              "Peran saksi (bystander) dalam menghentikan perundungan.")]),
                        ],
                "NKR": [("Berperan menjaga keutuhan NKRI",
                         "Menunjukkan peran nyata dalam bela negara", [
                             ("Menjelaskan makna bela negara bagi pelajar",
                              "Bela negara bukan hanya militer: disiplin, belajar, dan menjaga lingkungan."),
                             ("Menyusun rencana aksi menjaga persatuan di lingkungannya",
                              "Rencana sederhana yang menyebut sasaran, langkah, dan waktunya.")]),
                        ],
            },
        },
    },
}


async def _node(node_id, ntype, parent, name, desc="", order=0, meta=None):
    """Idempoten: node yang sudah ada tidak diubah, jadi penyemai aman dijalankan ulang."""
    ada = await db.curriculum_nodes.find_one({"id": node_id}, {"_id": 0, "id": 1})
    if ada:
        return node_id
    await create_node(NodeIn(id=node_id, type=ntype, parent_id=parent, name=name,
                             description=desc, order=order, meta=meta or {}))
    return node_id


async def seed_mapel_curriculum():
    """Bangun seluruh mapel di tabel MAPEL untuk kelas yang terdaftar di dalamnya."""
    before = await db.curriculum_nodes.count_documents({})
    await _node("KURMER", "curriculum", None, "Kurikulum Merdeka",
                "Struktur resmi: Fase > Kelas > Mapel > Elemen > CP > TP > Indikator > Kompetensi")

    for kode, m in MAPEL.items():
        prev_comp: dict[str, list[str]] = {}
        for grade in sorted(m["grade"]):
            ph = PHASE_OF[grade]
            phase_id = f"FASE-{ph}"
            pname, prange = PHASE_NAME[ph]
            await _node(phase_id, "phase", "KURMER", pname, prange, order=4)
            grade_id = f"KELAS-{grade}"
            await _node(grade_id, "grade", phase_id, f"Kelas {grade}", order=grade)
            subject_id = f"{kode}-{grade}"
            await _node(subject_id, "subject", grade_id, m["nama"], order=m["urutan"])

            this_comp: dict[str, list[str]] = {}
            for ei, (el, el_name) in enumerate(m["elemen"].items(), start=1):
                if el not in m["grade"][grade]:
                    continue
                el_id = f"EL-{kode}-{grade}-{el}"
                await _node(el_id, "element", subject_id, el_name, order=ei)
                cp_id = f"CP-{kode}-{grade}-{el}"
                await _node(cp_id, "cp", el_id, m["cp"][(ph, el)],
                            f"Capaian Pembelajaran {pname} — {el_name}", order=1)

                comp_seq: list[str] = []
                for ti, (tp_name, ind_name, comps) in enumerate(m["grade"][grade][el], start=1):
                    tp_id = f"TP-{kode}-{grade}-{el}-{ti:02d}"
                    await _node(tp_id, "tp", cp_id, tp_name, order=ti)
                    ind_id = f"IND-{kode}-{grade}-{el}-{ti:02d}"
                    await _node(ind_id, "indicator", tp_id, ind_name, order=1)
                    for ci, (comp_name, materi) in enumerate(comps, start=1):
                        comp_id = f"KOMP-{kode}-{grade}-{el}-{ti:02d}{ci}"
                        idx = len(comp_seq)
                        prev = prev_comp.get(el) or []
                        prereq = [prev[idx]] if idx < len(prev) else []
                        await _node(comp_id, "competency", ind_id, comp_name, order=ci,
                                    meta={"prerequisite_competency_ids": prereq,
                                          "materi": materi, "phase": ph, "element": el})
                        topic_id = f"TOP-{kode}-{grade}-{el}-{ti:02d}{ci}"
                        await _node(topic_id, "topic", comp_id, f"Topik: {comp_name}", order=1)
                        await _node(f"MAT-{kode}-{grade}-{el}-{ti:02d}{ci}", "material", topic_id,
                                    f"Materi: {comp_name}", materi, order=1, meta={"materi": materi})
                        comp_seq.append(comp_id)
                this_comp[el] = comp_seq
            prev_comp = this_comp

    after = await db.curriculum_nodes.count_documents({})
    return {"nodes_before": before, "nodes_after": after, "created": after - before,
            "mapel": [m["nama"] for m in MAPEL.values()],
            "note": "Mapel non-Inggris Fase D (Kelas 7–9). Rumusan CP adalah rumusan yang setia "
                    "pada isinya, BUKAN salinan verbatim dokumen Kemendikbud. Node lama tidak diubah."}


@router.post("/mapel")
async def seed_mapel_route(u=Depends(teacher_user)):
    return await seed_mapel_curriculum()


@router.get("/mapel/status")
async def mapel_status():
    kode = list(MAPEL.keys())
    rx = "^KOMP-(" + "|".join(kode) + ")-"
    comp = await db.curriculum_nodes.count_documents({"type": "competency", "id": {"$regex": rx}})
    tp = await db.curriculum_nodes.count_documents({"type": "tp", "id": {"$regex": "^TP-(" + "|".join(kode) + ")-"}})
    mat = await db.curriculum_nodes.count_documents({"type": "material", "id": {"$regex": "^MAT-(" + "|".join(kode) + ")-"}})
    return {"seeded": comp > 0, "tp": tp, "competencies": comp, "materials": mat,
            "mapel": [m["nama"] for m in MAPEL.values()]}
