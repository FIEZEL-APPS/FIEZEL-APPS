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

PHASE_OF = {1: "A", 2: "A", 3: "B", 4: "B", 5: "C", 6: "C",
            7: "D", 8: "D", 9: "D", 10: "E", 11: "F", 12: "F"}
PHASE_NAME = {"A": ("Fase A", "Kelas 1–2"), "B": ("Fase B", "Kelas 3–4"),
              "C": ("Fase C", "Kelas 5–6"), "D": ("Fase D", "Kelas 7–9"),
              "E": ("Fase E", "Kelas 10"), "F": ("Fase F", "Kelas 11–12")}
PHASE_ORDER = {"A": 1, "B": 2, "C": 3, "D": 4, "E": 5, "F": 6}

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



# ==========================================================================
# GELOMBANG SD — Fase A–C (Kelas 1–6)
# ==========================================================================
# Ditulis sebagai tabel TERPISAH lalu digabung ke MAPEL, bukan disisipkan ke dalamnya.
# Alasannya praktis: entri Fase D di atas sudah panjang, dan menyisipkan enam kelas lagi
# di tengahnya membuat blok yang tidak bisa dibaca siapa pun. Penggabungannya di bawah
# eksplisit dan satu baris, jadi tidak ada keajaiban yang perlu ditelusuri.
MAPEL_SD: dict[str, dict] = {
    "MAT": {
        "cp": {
            ("A", "BIL"): "Pada akhir Fase A, peserta didik membilang, membaca, menulis, dan membandingkan bilangan cacah sampai 100 serta melakukan penjumlahan dan pengurangan sederhana.",
            ("A", "PNG"): "Pada akhir Fase A, peserta didik membandingkan panjang, berat, dan waktu secara langsung serta menggunakan satuan tidak baku.",
            ("B", "BIL"): "Pada akhir Fase B, peserta didik memahami nilai tempat sampai 10.000, melakukan operasi hitung empat operasi, serta mengenal pecahan sederhana.",
            ("B", "PNG"): "Pada akhir Fase B, peserta didik mengukur panjang, berat, dan waktu dengan satuan baku serta menentukan keliling dan luas bangun datar sederhana.",
            ("C", "BIL"): "Pada akhir Fase C, peserta didik mengoperasikan pecahan, desimal, dan persen serta menyelesaikan masalah yang melibatkan perbandingan.",
            ("C", "DAT"): "Pada akhir Fase C, peserta didik mengumpulkan, menyajikan, dan menafsirkan data dalam tabel dan diagram sederhana.",
        },
        "grade": {
            1: {"BIL": [("Membilang dan membandingkan bilangan sampai 20",
                         "Membilang benda dan membandingkan banyaknya", [
                             ("Membilang dan menuliskan bilangan 1-20",
                              "Membilang benda nyata, menulis lambang bilangan, dan mencocokkan jumlah dengan angkanya."),
                             ("Membandingkan dua kumpulan benda dengan lebih banyak/lebih sedikit",
                              "Memasangkan satu-satu sebelum mengenal tanda > dan <.")])],
                "PNG": [("Membandingkan panjang dan berat secara langsung",
                         "Membandingkan ukuran tanpa alat ukur baku", [
                             ("Membandingkan panjang dua benda secara langsung",
                              "Menjajarkan ujung benda; kosakata panjang-pendek, tinggi-rendah."),
                             ("Membandingkan berat dua benda dengan tangan dan neraca sederhana",
                              "Berat-ringan; neraca dari gantungan baju sebagai alat peraga.")])]},
            2: {"BIL": [("Menjumlah dan mengurang bilangan sampai 100",
                         "Melakukan penjumlahan dan pengurangan dua bilangan", [
                             ("Menjumlahkan dua bilangan sampai 100 dengan teknik menyimpan",
                              "Nilai tempat puluhan dan satuan; menyimpan saat satuan melebihi 9."),
                             ("Mengurangkan dua bilangan sampai 100 dengan teknik meminjam",
                              "Meminjam dari puluhan; memeriksa hasil dengan penjumlahan.")])],
                "PNG": [("Mengukur dengan satuan tidak baku dan mengenal waktu",
                         "Mengukur panjang dan membaca waktu", [
                             ("Mengukur panjang dengan satuan tidak baku",
                              "Jengkal, langkah, batang korek; kenapa hasilnya berbeda antar orang."),
                             ("Membaca jam pada waktu tepat dan setengah jam",
                              "Jarum pendek dan panjang; menghubungkan dengan kegiatan harian.")])]},
            3: {"BIL": [("Memahami nilai tempat sampai 1.000",
                         "Membaca, menulis, dan membandingkan bilangan tiga angka", [
                             ("Menentukan nilai tempat ratusan, puluhan, dan satuan",
                              "Menguraikan 472 menjadi 400 + 70 + 2; kartu nilai tempat."),
                             ("Membandingkan dan mengurutkan bilangan sampai 1.000",
                              "Membandingkan dari angka terdepan; tanda >, <, =.")])],
                "PNG": [("Mengukur dengan satuan baku",
                         "Menggunakan alat ukur baku dan satuannya", [
                             ("Mengukur panjang dengan cm dan m",
                              "Membaca mistar dan meteran; mengubah m ke cm."),
                             ("Mengukur berat dengan gram dan kilogram",
                              "Membaca timbangan; memperkirakan berat benda sehari-hari.")])]},
            4: {"BIL": [("Mengoperasikan perkalian dan pembagian",
                         "Menyelesaikan perkalian dan pembagian bilangan cacah", [
                             ("Melakukan perkalian bilangan dua angka",
                              "Perkalian bersusun; sifat komutatif dan distributif sebagai jalan pintas."),
                             ("Melakukan pembagian dengan dan tanpa sisa",
                              "Pembagian bersusun; makna sisa dalam konteks membagi barang.")])],
                "PNG": [("Menentukan keliling dan luas persegi dan persegi panjang",
                         "Menghitung keliling dan luas bangun datar sederhana", [
                             ("Menghitung keliling persegi dan persegi panjang",
                              "Keliling sebagai jumlah semua sisi; konteks pagar dan bingkai."),
                             ("Menghitung luas persegi dan persegi panjang",
                              "Luas sebagai banyaknya petak satuan; satuan cm² dan m².")])]},
            5: {"BIL": [("Mengoperasikan pecahan dan desimal",
                         "Menjumlah dan mengurang pecahan", [
                             ("Menjumlah dan mengurang pecahan berpenyebut berbeda",
                              "Menyamakan penyebut lewat KPK; gambar pita pecahan sebagai bukti."),
                             ("Mengubah pecahan ke desimal dan persen",
                              "Hubungan 1/2 = 0,5 = 50%; konteks nilai ulangan dan diskon.")])],
                "DAT": [("Menyajikan data dalam tabel dan diagram",
                         "Mengumpulkan dan menyajikan data sederhana", [
                             ("Mengumpulkan data dari lingkungan sekitar",
                              "Turus dan tabel frekuensi; contoh: warna kesukaan teman sekelas."),
                             ("Menyajikan data dalam diagram batang dan piktogram",
                              "Memilih skala yang tepat; membaca kembali diagram buatan sendiri.")])]},
            6: {"BIL": [("Menyelesaikan masalah perbandingan dan skala",
                         "Menggunakan perbandingan dalam konteks", [
                             ("Menyelesaikan masalah perbandingan senilai",
                              "Perbandingan jumlah dan harga; tabel perbandingan sebagai alat."),
                             ("Menggunakan skala pada denah dan peta",
                              "Skala 1:100 berarti apa; menghitung jarak sebenarnya.")])],
                "DAT": [("Menafsirkan data dan menentukan rata-rata",
                         "Menghitung dan menafsirkan ukuran pemusatan", [
                             ("Menentukan rata-rata, median, dan modus data sederhana",
                              "Menghitung ketiganya dari data kelas; kapan rata-rata menyesatkan."),
                             ("Menafsirkan diagram lingkaran",
                              "Bagian sebagai persen dari keseluruhan; membaca tanpa menghitung ulang.")])]},
        },
    },
    "IND": {
        "cp": {
            ("A", "MBC"): "Pada akhir Fase A, peserta didik mengenal huruf, membaca kata dan kalimat sederhana, serta memahami gambar dan teks pendek.",
            ("A", "TUL"): "Pada akhir Fase A, peserta didik menulis huruf, kata, dan kalimat sederhana dengan bentuk dan ejaan yang dikenali.",
            ("B", "MBC"): "Pada akhir Fase B, peserta didik memahami informasi tersurat dari teks narasi, deskripsi, dan prosedur sederhana.",
            ("B", "TUL"): "Pada akhir Fase B, peserta didik menulis paragraf sederhana dengan struktur dan ejaan yang tepat.",
            ("C", "MBC"): "Pada akhir Fase C, peserta didik menyimpulkan informasi tersurat dan tersirat dari berbagai jenis teks.",
            ("C", "TUL"): "Pada akhir Fase C, peserta didik menulis teks narasi, deskripsi, dan eksposisi sederhana dengan kaidah kebahasaan yang tepat.",
        },
        "grade": {
            1: {"MBC": [("Mengenal huruf dan membaca kata",
                         "Membaca suku kata dan kata sederhana", [
                             ("Mengenali huruf dan bunyinya",
                              "Huruf besar dan kecil; bunyi awal kata benda di sekitar."),
                             ("Membaca kata berpola suku kata terbuka",
                              "Pola KV-KV seperti ma-ma, bu-ku; membaca dengan menggabung bunyi.")])],
                "TUL": [("Menulis huruf dan kata",
                         "Menulis dengan bentuk huruf yang benar", [
                             ("Menulis huruf dengan bentuk dan arah yang tepat",
                              "Arah goresan, tinggi huruf, jarak antar huruf."),
                             ("Menulis nama diri dan kata benda familiar",
                              "Menyalin lalu menulis mandiri; huruf kapital untuk nama.")])]},
            2: {"MBC": [("Membaca kalimat dan teks pendek",
                         "Memahami isi kalimat dan teks pendek", [
                             ("Membaca kalimat sederhana dengan lancar",
                              "Membaca dengan jeda pada tanda baca; memahami apa yang dibaca."),
                             ("Menjawab pertanyaan tentang isi teks pendek",
                              "Pertanyaan siapa, apa, di mana dari teks 3-5 kalimat.")])],
                "TUL": [("Menulis kalimat sederhana",
                         "Menyusun kalimat dengan ejaan tepat", [
                             ("Menulis kalimat dengan huruf kapital dan tanda titik",
                              "Kapital di awal kalimat dan nama; titik di akhir."),
                             ("Menulis kalimat berdasarkan gambar",
                              "Mengamati gambar lalu menuliskan apa yang terjadi.")])]},
            3: {"MBC": [("Memahami teks narasi dan deskripsi",
                         "Menemukan informasi tersurat dalam teks", [
                             ("Menemukan tokoh, latar, dan urutan kejadian dalam cerita",
                              "Membaca cerita pendek lalu memetakan tokoh dan urutannya."),
                             ("Menemukan ciri benda dari teks deskripsi",
                              "Kata sifat yang dipakai penulis; membayangkan benda dari katanya.")])],
                "TUL": [("Menulis paragraf sederhana",
                         "Menyusun paragraf dengan gagasan utama", [
                             ("Menulis paragraf dengan satu gagasan utama",
                              "Kalimat utama di awal, lalu kalimat penjelas."),
                             ("Menggunakan kata hubung dan tanda baca dalam paragraf",
                              "Dan, tetapi, karena; koma dalam perincian.")])]},
            4: {"MBC": [("Memahami teks prosedur dan informasi",
                         "Mengikuti dan memahami teks prosedur", [
                             ("Mengikuti langkah dalam teks prosedur",
                              "Urutan langkah; akibat jika urutannya ditukar."),
                             ("Menemukan informasi penting dalam teks informasi",
                              "Kata kunci, judul, dan subjudul sebagai penuntun.")])],
                "TUL": [("Menulis teks prosedur dan deskripsi",
                         "Menulis teks dengan struktur yang jelas", [
                             ("Menulis teks prosedur sederhana",
                              "Tujuan, alat bahan, langkah bernomor, kalimat perintah."),
                             ("Menulis teks deskripsi tentang benda atau tempat",
                              "Mengurutkan deskripsi dari umum ke khusus.")])]},
            5: {"MBC": [("Menyimpulkan isi teks",
                         "Menarik simpulan dari bacaan", [
                             ("Menyimpulkan gagasan pokok tiap paragraf",
                              "Mencari kalimat utama; merangkum dengan kalimat sendiri."),
                             ("Membedakan fakta dan pendapat dalam teks",
                              "Penanda pendapat: menurut, sebaiknya, mungkin.")])],
                "TUL": [("Menulis teks eksposisi sederhana",
                         "Menyampaikan pendapat secara tertulis", [
                             ("Menulis pendapat disertai alasan",
                              "Struktur: pendapat, alasan, contoh, penegasan."),
                             ("Menggunakan kalimat efektif dalam tulisan",
                              "Membuang kata berulang; satu kalimat satu maksud.")])]},
            6: {"MBC": [("Menafsirkan teks dan makna tersirat",
                         "Memahami makna yang tidak tertulis langsung", [
                             ("Menyimpulkan makna tersirat dari cerita",
                              "Watak tokoh dari tindakannya, bukan dari kata sifat penulis."),
                             ("Membandingkan informasi dari dua teks",
                              "Persamaan dan perbedaan isi; mana yang lebih lengkap dan kenapa.")])],
                "TUL": [("Menulis teks narasi dan laporan",
                         "Menulis teks panjang dengan struktur utuh", [
                             ("Menulis cerita dengan alur awal, tengah, akhir",
                              "Konflik sebagai penggerak cerita; akhir yang tidak tergesa."),
                             ("Menulis laporan hasil pengamatan",
                              "Objek, waktu, hasil pengamatan, simpulan.")])]},
        },
    },
    "PPKN": {
        "cp": {
            ("A", "PAN"): "Pada akhir Fase A, peserta didik mengenal simbol dan sila Pancasila serta menerapkan sikap baik di rumah dan sekolah.",
            ("A", "BTI"): "Pada akhir Fase A, peserta didik mengenal perbedaan di sekitarnya dan bersikap ramah kepada semua teman.",
            ("B", "PAN"): "Pada akhir Fase B, peserta didik memahami makna sila Pancasila dan menerapkannya dalam kegiatan sehari-hari.",
            ("B", "BTI"): "Pada akhir Fase B, peserta didik menghargai keragaman suku, agama, dan budaya di lingkungannya.",
            ("C", "PAN"): "Pada akhir Fase C, peserta didik menganalisis penerapan nilai Pancasila dalam kehidupan bermasyarakat.",
            ("C", "NKR"): "Pada akhir Fase C, peserta didik memahami wilayah NKRI dan berperan menjaga persatuan di lingkungannya.",
        },
        "grade": {
            1: {"PAN": [("Mengenal simbol dan sila Pancasila",
                         "Menyebut sila dan simbolnya", [
                             ("Menyebutkan kelima sila Pancasila",
                              "Menghafal dengan lagu dan gerakan; menyebut berurutan."),
                             ("Mencocokkan simbol dengan sila yang sesuai",
                              "Bintang, rantai, pohon beringin, kepala banteng, padi dan kapas.")])],
                "BTI": [("Mengenal perbedaan teman",
                         "Bersikap ramah kepada semua teman", [
                             ("Mengenali perbedaan penampilan, bahasa, dan kesukaan teman",
                              "Memetakan perbedaan di kelas sendiri lewat permainan."),
                             ("Bermain bersama tanpa membeda-bedakan",
                              "Mengajak teman yang sendirian; kalimat ajakan yang ramah.")])]},
            2: {"PAN": [("Menerapkan sikap sesuai sila Pancasila di rumah",
                         "Menunjukkan perilaku baik di rumah dan sekolah", [
                             ("Menunjukkan sikap jujur dan tanggung jawab",
                              "Mengakui kesalahan; menyelesaikan tugas sendiri."),
                             ("Menunjukkan sikap tolong-menolong",
                              "Membantu teman dan anggota keluarga tanpa diminta.")])],
                "BTI": [("Menghargai perbedaan di sekolah",
                         "Bergaul dengan semua teman", [
                             ("Menghargai teman yang berbeda agama dan suku",
                              "Menghormati ibadah dan kebiasaan teman."),
                             ("Menyelesaikan perselisihan dengan damai",
                              "Meminta maaf dan memaafkan; meminta bantuan guru bila perlu.")])]},
            3: {"PAN": [("Memahami makna sila Pancasila",
                         "Menjelaskan makna tiap sila", [
                             ("Menjelaskan makna sila pertama dan kedua",
                              "Ketuhanan dan kemanusiaan dalam contoh keseharian."),
                             ("Menjelaskan makna sila ketiga, keempat, dan kelima",
                              "Persatuan, musyawarah, dan keadilan lewat contoh di kelas.")])],
                "BTI": [("Mengenal keragaman budaya Indonesia",
                         "Menyebut dan menghargai budaya daerah", [
                             ("Menyebutkan keragaman budaya di Indonesia",
                              "Rumah adat, pakaian, tarian, makanan khas daerah."),
                             ("Menunjukkan sikap bangga terhadap budaya sendiri dan menghormati budaya lain",
                              "Menceritakan budaya daerah sendiri di depan kelas.")])]},
            4: {"PAN": [("Menerapkan Pancasila dalam kegiatan sekolah",
                         "Menerapkan musyawarah dan keadilan", [
                             ("Melaksanakan musyawarah dalam pengambilan keputusan kelas",
                              "Menyampaikan pendapat, mendengarkan, menerima hasil bersama."),
                             ("Menunjukkan sikap adil dalam pembagian tugas",
                              "Pembagian tugas piket yang merata dan disepakati.")])],
                "BTI": [("Menghargai keberagaman di masyarakat",
                         "Bersikap inklusif di lingkungan sekitar", [
                             ("Menjelaskan manfaat hidup rukun dalam keberagaman",
                              "Gotong royong sebagai contoh kerukunan yang berguna."),
                             ("Menolak sikap membeda-bedakan",
                              "Mengenali ejekan berdasarkan suku atau agama dan cara menghentikannya.")])]},
            5: {"PAN": [("Menganalisis penerapan nilai Pancasila di masyarakat",
                         "Menilai perilaku berdasarkan nilai Pancasila", [
                             ("Menganalisis contoh penerapan nilai Pancasila di masyarakat",
                              "Kerja bakti, pemilihan ketua RT, bantuan bencana."),
                             ("Menilai perilaku yang bertentangan dengan nilai Pancasila",
                              "Curang, memaksakan kehendak, merusak fasilitas umum.")])],
                "NKR": [("Mengenal wilayah NKRI",
                         "Menjelaskan wilayah dan keragaman Indonesia", [
                             ("Menunjukkan letak dan batas wilayah Indonesia pada peta",
                              "Provinsi, pulau besar, dan negara tetangga."),
                             ("Menjelaskan pentingnya menjaga persatuan wilayah",
                              "Kenapa negara kepulauan menuntut persatuan lebih kuat.")])]},
            6: {"PAN": [("Mengamalkan Pancasila dalam kehidupan sehari-hari",
                         "Menunjukkan pengamalan nyata nilai Pancasila", [
                             ("Menyusun contoh pengamalan tiap sila di lingkungannya",
                              "Satu tindakan nyata untuk tiap sila, bukan sekadar contoh buku."),
                             ("Menunjukkan tanggung jawab sebagai warga sekolah",
                              "Menjaga kebersihan, menaati aturan, membela teman yang dirundung.")])],
                "NKR": [("Berperan menjaga keutuhan NKRI",
                         "Menunjukkan peran nyata menjaga persatuan", [
                             ("Menjelaskan peran pelajar dalam menjaga persatuan",
                              "Tindakan kecil yang nyata: tidak menyebar berita bohong."),
                             ("Menyusun rencana kegiatan yang mempererat persatuan",
                              "Kegiatan kelas lintas kelompok dengan sasaran dan waktu jelas.")])]},
        },
    },
}

# IPAS hanya ada di SD (Fase A–C); di SMP ia terpisah menjadi IPA dan IPS.
MAPEL_BARU: dict[str, dict] = {
    "IPAS": {
        "nama": "Ilmu Pengetahuan Alam dan Sosial",
        "urutan": 6,
        "elemen": {
            "PEM": "Pemahaman IPAS",
            "KET": "Keterampilan Proses",
        },
        "cp": {
            ("B", "PEM"): "Pada akhir Fase B, peserta didik memahami ciri makhluk hidup, wujud zat, gaya sederhana, serta lingkungan sosial dan budaya di sekitarnya.",
            ("B", "KET"): "Pada akhir Fase B, peserta didik melakukan pengamatan sederhana, mencatat hasilnya, dan mengomunikasikannya.",
            ("C", "PEM"): "Pada akhir Fase C, peserta didik memahami sistem organ, energi dan perubahannya, serta kegiatan ekonomi dan keragaman masyarakat Indonesia.",
            ("C", "KET"): "Pada akhir Fase C, peserta didik merancang penyelidikan sederhana dan menyimpulkan hasilnya berdasarkan data.",
        },
        "grade": {
            3: {"PEM": [("Memahami ciri dan kebutuhan makhluk hidup",
                         "Menjelaskan ciri makhluk hidup", [
                             ("Menyebutkan ciri makhluk hidup dan membedakannya dari benda mati",
                              "Bernapas, bergerak, tumbuh, berkembang biak, memerlukan makan."),
                             ("Menjelaskan kebutuhan tumbuhan dan hewan untuk hidup",
                              "Air, udara, cahaya, makanan; percobaan kecambah di tempat gelap.")])],
                "KET": [("Melakukan pengamatan sederhana",
                         "Mengamati dan mencatat hasil", [
                             ("Mengamati objek dengan pancaindra secara aman",
                              "Mengamati tanpa mencicipi benda yang tidak dikenal."),
                             ("Mencatat hasil pengamatan dalam tabel sederhana",
                              "Kolom hari, yang diamati, dan perubahan yang terlihat.")])]},
            4: {"PEM": [("Memahami wujud zat dan gaya",
                         "Menjelaskan wujud zat dan pengaruh gaya", [
                             ("Membedakan wujud padat, cair, dan gas",
                              "Bentuk dan volume tiap wujud; contoh di dapur dan halaman."),
                             ("Menjelaskan pengaruh gaya terhadap gerak benda",
                              "Dorong, tarik, gesek; gaya mengubah arah dan kecepatan.")])],
                "KET": [("Menyajikan hasil pengamatan",
                         "Mengomunikasikan hasil pengamatan", [
                             ("Menyajikan hasil pengamatan dalam gambar dan tabel",
                              "Memilih bentuk penyajian yang paling jelas bagi pembaca."),
                             ("Menceritakan hasil pengamatan di depan kelas",
                              "Menyebut apa yang diamati, bagaimana, dan apa hasilnya.")])]},
            5: {"PEM": [("Memahami sistem organ dan energi",
                         "Menjelaskan organ tubuh dan bentuk energi", [
                             ("Menjelaskan fungsi organ pernapasan dan pencernaan",
                              "Jalur udara dan jalur makanan; menjaga keduanya tetap sehat."),
                             ("Menjelaskan bentuk energi dan perubahannya",
                              "Listrik ke cahaya, gerak ke panas; contoh di rumah.")])],
                "KET": [("Merancang penyelidikan sederhana",
                         "Menyusun langkah penyelidikan", [
                             ("Merumuskan pertanyaan yang dapat diselidiki",
                              "Pertanyaan yang bisa dijawab lewat percobaan, bukan pendapat."),
                             ("Menyusun langkah percobaan sederhana",
                              "Alat, bahan, langkah, dan apa yang akan diukur.")])]},
            6: {"PEM": [("Memahami kegiatan ekonomi dan keragaman Indonesia",
                         "Menjelaskan kegiatan ekonomi dan keragaman masyarakat", [
                             ("Menjelaskan jenis kegiatan ekonomi masyarakat",
                              "Produksi, distribusi, konsumsi; contoh di lingkungan sendiri."),
                             ("Menjelaskan keragaman sosial budaya Indonesia",
                              "Suku, bahasa daerah, dan adat; keragaman sebagai kekayaan.")])],
                "KET": [("Menyimpulkan hasil penyelidikan",
                         "Menarik simpulan berdasarkan data", [
                             ("Menyimpulkan hasil percobaan berdasarkan data",
                              "Simpulan harus cocok dengan data, bukan dengan dugaan awal."),
                             ("Menyusun laporan sederhana hasil penyelidikan",
                              "Tujuan, langkah, data, simpulan, ditulis agar bisa diulang.")])]},
        },
    },
}

# Penggabungan EKSPLISIT: mapel yang sudah ada bertambah fase dan kelasnya, mapel baru
# ditambahkan utuh. Ditulis di sini supaya tidak ada tabel tersembunyi di tempat lain.
for _kode, _tambah in MAPEL_SD.items():
    MAPEL[_kode]["cp"].update(_tambah["cp"])
    MAPEL[_kode]["grade"].update(_tambah["grade"])
MAPEL.update(MAPEL_BARU)

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
            await _node(phase_id, "phase", "KURMER", pname, prange, order=PHASE_ORDER[ph])
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
            "note": "Mapel non-Inggris Fase A–D (Kelas 1–9). Rumusan CP adalah rumusan yang setia "
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
