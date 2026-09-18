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


# ==========================================================================
# GELOMBANG SMA — Fase E (Kelas 10) dan Fase F (Kelas 11–12)
# ==========================================================================
# Mapel inti (Matematika, Bahasa Indonesia, Pendidikan Pancasila) bertambah fasenya;
# mapel peminatan lahir baru. Sejarah dan Informatika ada sejak Fase E; Fisika, Kimia,
# Biologi, Ekonomi, Sosiologi, dan Geografi berdiri sebagai mapel terpisah di Fase F —
# di Fase E muatannya masih menyatu sebagai IPA dan IPS terpadu, yang di repo ini sudah
# diwakili entri IPA/IPS. Itu sebabnya daftar kelasnya berbeda antar mapel, dan bukan
# karena ada yang terlewat.
MAPEL_SMA: dict[str, dict] = {
    "MAT": {
        "cp": {
            ("E", "ALJ"): "Pada akhir Fase E, peserta didik menggunakan sistem persamaan dan pertidaksamaan linear, fungsi kuadrat, serta barisan dan deret untuk memodelkan masalah.",
            ("E", "DAT"): "Pada akhir Fase E, peserta didik merepresentasikan dan menafsirkan data, serta menentukan peluang kejadian majemuk.",
            ("F", "ALJ"): "Pada akhir Fase F, peserta didik menggunakan fungsi eksponen, logaritma, dan trigonometri serta konsep limit dan turunan untuk menyelesaikan masalah.",
            ("F", "DAT"): "Pada akhir Fase F, peserta didik menggunakan distribusi peluang dan penalaran statistis untuk menarik simpulan dari data.",
        },
        "grade": {
            10: {"ALJ": [("Memodelkan masalah dengan fungsi kuadrat dan sistem persamaan",
                          "Menyelesaikan persamaan dan fungsi tingkat dua", [
                              ("Menentukan sifat dan grafik fungsi kuadrat",
                               "Titik puncak, sumbu simetri, diskriminan; membaca grafik sebagai model situasi."),
                              ("Menyelesaikan sistem persamaan linear tiga variabel",
                               "Eliminasi bertahap dan substitusi; konteks: campuran harga tiga barang.")])],
                 "DAT": [("Menentukan peluang kejadian majemuk",
                          "Menghitung peluang gabungan dan bersyarat", [
                              ("Menghitung peluang kejadian saling lepas dan tidak saling lepas",
                               "Aturan penjumlahan; diagram Venn sebagai alat hitung."),
                              ("Menghitung peluang kejadian bersyarat",
                               "P(A|B); kenapa urutan syarat mengubah hasilnya.")])]},
            11: {"ALJ": [("Menggunakan fungsi eksponen dan logaritma",
                          "Memodelkan pertumbuhan dan peluruhan", [
                              ("Menentukan sifat fungsi eksponen dan grafiknya",
                               "Pertumbuhan penduduk dan bunga majemuk sebagai model nyata."),
                              ("Menyelesaikan persamaan logaritma",
                               "Sifat logaritma; logaritma sebagai kebalikan eksponen.")])],
                 "DAT": [("Menggunakan penalaran statistis",
                          "Menafsirkan data dengan ukuran yang tepat", [
                              ("Menentukan ukuran pemusatan dan penyebaran data berkelompok",
                               "Rata-rata, median, simpangan baku dari tabel distribusi frekuensi."),
                              ("Menafsirkan penyajian data yang menyesatkan",
                               "Sumbu terpotong, skala tidak seragam, dan pemilihan sampel yang bias.")])]},
            12: {"ALJ": [("Menggunakan konsep limit dan turunan",
                          "Menentukan limit dan turunan fungsi", [
                              ("Menentukan limit fungsi aljabar",
                               "Limit sebagai kecenderungan nilai; bentuk tak tentu 0/0."),
                              ("Menentukan turunan dan menerapkannya pada masalah maksimum-minimum",
                               "Turunan sebagai laju perubahan; menentukan nilai optimum.")])],
                 "DAT": [("Menggunakan distribusi peluang",
                          "Menghitung peluang dengan distribusi", [
                              ("Menghitung peluang dengan distribusi binomial",
                               "Percobaan berulang dua hasil; konteks: uji kualitas produk."),
                              ("Membaca dan menggunakan distribusi normal",
                               "Kurva normal, nilai baku z; membaca tabel z.")])]},
        },
    },
    "IND": {
        "cp": {
            ("E", "MBC"): "Pada akhir Fase E, peserta didik mengevaluasi informasi dan gagasan dari teks laporan, eksposisi, anekdot, dan hikayat.",
            ("E", "TUL"): "Pada akhir Fase E, peserta didik menulis teks eksposisi dan laporan hasil observasi dengan data pendukung.",
            ("F", "MBC"): "Pada akhir Fase F, peserta didik mengevaluasi dan mengkritisi teks kompleks termasuk teks akademik dan multimodal.",
            ("F", "TUL"): "Pada akhir Fase F, peserta didik menulis karya tulis ilmiah sederhana, esai argumentatif, dan teks kreatif.",
        },
        "grade": {
            10: {"MBC": [("Mengevaluasi teks laporan dan eksposisi",
                          "Menilai kelengkapan dan ketepatan informasi", [
                              ("Mengevaluasi isi dan struktur laporan hasil observasi",
                               "Definisi umum, deskripsi bagian, simpulan; ketepatan data."),
                              ("Menganalisis kritik sosial dalam anekdot dan hikayat",
                               "Sindiran halus; nilai budaya dalam karya sastra lama.")])],
                 "TUL": [("Menulis laporan hasil observasi dan eksposisi",
                          "Menulis teks berbasis data", [
                              ("Menulis laporan hasil observasi dengan data faktual",
                               "Mengumpulkan data sendiri sebelum menulis; memisahkan data dari tafsir."),
                              ("Menulis teks eksposisi dengan argumen berbukti",
                               "Klaim, data, penalaran; menyebut sumber data.")])]},
            11: {"MBC": [("Mengkritisi teks argumentatif dan multimodal",
                          "Menilai kekuatan argumen dan bukti", [
                              ("Mengevaluasi kesahihan argumen dalam teks",
                               "Membedakan bukti dari asumsi; mengenali sesat pikir umum."),
                              ("Menafsirkan teks multimodal",
                               "Infografik dan video: bagaimana visual mengarahkan tafsir pembaca.")])],
                 "TUL": [("Menulis esai argumentatif",
                          "Menyusun argumen panjang yang runtut", [
                              ("Menulis esai dengan tesis dan pengembangan yang konsisten",
                               "Satu tesis, paragraf yang saling menopang, penutup yang menegaskan."),
                              ("Menggunakan kutipan dan daftar pustaka",
                               "Mengutip tanpa menjiplak; menulis sumber dengan format konsisten.")])]},
            12: {"MBC": [("Mengevaluasi teks akademik",
                          "Membaca kritis teks ilmiah", [
                              ("Menganalisis struktur karya tulis ilmiah",
                               "Latar belakang, rumusan masalah, metode, hasil, simpulan."),
                              ("Mengevaluasi kesesuaian simpulan dengan data yang disajikan",
                               "Simpulan yang melampaui data adalah simpulan yang cacat.")])],
                 "TUL": [("Menulis karya tulis ilmiah sederhana",
                          "Menyusun tulisan ilmiah utuh", [
                              ("Menyusun karya tulis ilmiah dengan struktur lengkap",
                               "Dari rumusan masalah sampai simpulan, dengan metode yang disebut."),
                              ("Menulis teks kreatif berdasarkan pengalaman dan bacaan",
                               "Cerpen atau puisi; kebebasan bentuk dengan kesadaran pembaca.")])]},
        },
    },
    "PPKN": {
        "cp": {
            ("E", "PAN"): "Pada akhir Fase E, peserta didik menganalisis kedudukan Pancasila sebagai ideologi terbuka dan penerapannya dalam kehidupan berbangsa.",
            ("E", "UUD"): "Pada akhir Fase E, peserta didik menganalisis sistem hukum dan peradilan serta perlindungan hak asasi manusia.",
            ("F", "PAN"): "Pada akhir Fase F, peserta didik mengevaluasi penerapan Pancasila dalam kebijakan publik dan kehidupan global.",
            ("F", "NKR"): "Pada akhir Fase F, peserta didik menganalisis ancaman terhadap NKRI dan strategi menghadapinya.",
        },
        "grade": {
            10: {"PAN": [("Menganalisis Pancasila sebagai ideologi terbuka",
                          "Menjelaskan sifat dan penerapan ideologi Pancasila", [
                              ("Menjelaskan makna Pancasila sebagai ideologi terbuka",
                               "Nilai dasar tetap, nilai praksis menyesuaikan zaman."),
                              ("Menganalisis penerapan nilai Pancasila dalam kehidupan berbangsa",
                               "Studi kasus kebijakan dan putusan yang mencerminkan sila tertentu.")])],
                 "UUD": [("Menganalisis sistem hukum dan hak asasi manusia",
                          "Menjelaskan sistem hukum dan perlindungan HAM", [
                              ("Menjelaskan sistem hukum dan peradilan di Indonesia",
                               "Jenis peradilan, asas praduga tak bersalah, peran advokat."),
                              ("Menganalisis kasus pelanggaran HAM dan upaya penyelesaiannya",
                               "Instrumen HAM nasional dan internasional; peran Komnas HAM.")])]},
            11: {"PAN": [("Mengevaluasi penerapan Pancasila dalam kebijakan publik",
                          "Menilai kebijakan dari sudut nilai Pancasila", [
                              ("Menganalisis kebijakan publik dari perspektif nilai Pancasila",
                               "Kebijakan subsidi, pendidikan, dan lingkungan sebagai bahan kajian."),
                              ("Menyusun argumen tentang kebijakan yang berkeadilan",
                               "Keadilan distributif; siapa yang diuntungkan dan dirugikan.")])],
                 "NKR": [("Menganalisis ancaman terhadap NKRI",
                          "Mengenali bentuk ancaman dan strateginya", [
                              ("Menganalisis ancaman ideologi, politik, ekonomi, dan sosial budaya",
                               "Ancaman nonmiliter yang sering tidak terlihat sebagai ancaman."),
                              ("Menjelaskan strategi menghadapi ancaman terhadap NKRI",
                               "Sistem pertahanan semesta; peran warga sipil di dalamnya.")])]},
            12: {"PAN": [("Mengamalkan Pancasila dalam kehidupan global",
                          "Menerapkan nilai Pancasila di tengah arus global", [
                              ("Menganalisis peran Indonesia dalam hubungan internasional",
                               "Politik luar negeri bebas aktif; peran di ASEAN dan PBB."),
                              ("Mengevaluasi tantangan nilai Pancasila di era digital",
                               "Polarisasi, disinformasi, dan ruang publik digital.")])],
                 "NKR": [("Berperan aktif menjaga keutuhan NKRI",
                          "Menunjukkan peran nyata sebagai warga negara", [
                              ("Menganalisis peran generasi muda dalam menjaga persatuan",
                               "Literasi digital dan penolakan ujaran kebencian sebagai bela negara."),
                              ("Menyusun rencana aksi kewarganegaraan",
                               "Rencana dengan sasaran, langkah, mitra, dan ukuran keberhasilan.")])]},
        },
    },
}

# Mapel yang baru berdiri di SMA. Sejarah dan Informatika sejak Fase E; sisanya Fase F.
MAPEL_SMA_BARU: dict[str, dict] = {
    "SEJ": {
        "nama": "Sejarah", "urutan": 7,
        "elemen": {"PEM": "Pemahaman Sejarah", "KET": "Keterampilan Berpikir Sejarah"},
        "cp": {
            ("E", "PEM"): "Pada akhir Fase E, peserta didik memahami konsep dasar ilmu sejarah, asal usul nenek moyang, dan kerajaan-kerajaan di Indonesia.",
            ("E", "KET"): "Pada akhir Fase E, peserta didik menerapkan berpikir kronologis, diakronik, dan sinkronik dalam mengkaji peristiwa.",
            ("F", "PEM"): "Pada akhir Fase F, peserta didik memahami pergerakan nasional, proklamasi, dan perkembangan Indonesia kontemporer.",
            ("F", "KET"): "Pada akhir Fase F, peserta didik melakukan penelitian sejarah sederhana berdasarkan sumber yang kredibel.",
        },
        "grade": {
            10: {"PEM": [("Memahami konsep dasar ilmu sejarah",
                          "Menjelaskan konsep waktu dan sumber sejarah", [
                              ("Menjelaskan konsep ruang, waktu, dan perubahan dalam sejarah",
                               "Kronologi, periodisasi, dan kesinambungan."),
                              ("Membedakan sumber primer dan sekunder",
                               "Prasasti dan catatan sezaman vs buku yang menulis ulang.")])],
                 "KET": [("Menerapkan berpikir kronologis dan sinkronik",
                          "Mengkaji peristiwa dari dua sudut", [
                              ("Menyusun kronologi peristiwa sejarah",
                               "Garis waktu; membedakan urutan dari sebab-akibat."),
                              ("Menganalisis peristiwa secara sinkronik",
                               "Memotret satu masa dari banyak aspek sekaligus.")])]},
            11: {"PEM": [("Memahami pergerakan nasional dan proklamasi",
                          "Menjelaskan jalan menuju kemerdekaan", [
                              ("Menganalisis lahirnya pergerakan nasional",
                               "Politik etis, organisasi pergerakan, dan peran pers."),
                              ("Menganalisis peristiwa sekitar proklamasi",
                               "Rengasdengklok, perumusan teks, dan makna proklamasi.")])],
                 "KET": [("Menggunakan sumber sejarah secara kritis",
                          "Menilai kredibilitas sumber", [
                              ("Melakukan kritik sumber internal dan eksternal",
                               "Siapa penulisnya, kapan, dan untuk siapa ditulis."),
                              ("Membandingkan dua versi peristiwa dari sumber berbeda",
                               "Kenapa dua saksi bisa menceritakan hal yang sama secara berbeda.")])]},
            12: {"PEM": [("Memahami Indonesia kontemporer",
                          "Menjelaskan perkembangan Indonesia pascakemerdekaan", [
                              ("Menganalisis perubahan politik Indonesia dari masa ke masa",
                               "Demokrasi liberal, terpimpin, Orde Baru, Reformasi."),
                              ("Menganalisis peran Indonesia dalam dunia internasional",
                               "Konferensi Asia Afrika, Gerakan Non-Blok, misi perdamaian.")])],
                 "KET": [("Melakukan penelitian sejarah sederhana",
                          "Menyusun tulisan sejarah berbasis sumber", [
                              ("Menyusun rancangan penelitian sejarah",
                               "Topik, rumusan masalah, dan sumber yang akan dipakai."),
                              ("Menulis hasil penelitian sejarah dengan rujukan",
                               "Historiografi sederhana; menyebut sumber tiap klaim.")])]},
        },
    },
    "INF": {
        "nama": "Informatika", "urutan": 8,
        "elemen": {"BK": "Berpikir Komputasional", "TIK": "Teknologi Informasi dan Komunikasi"},
        "cp": {
            ("E", "BK"): "Pada akhir Fase E, peserta didik menerapkan berpikir komputasional untuk menyelesaikan persoalan dengan algoritma dan pemrograman dasar.",
            ("E", "TIK"): "Pada akhir Fase E, peserta didik menggunakan perkakas TIK secara efektif dan memahami keamanan serta etika digital.",
            ("F", "BK"): "Pada akhir Fase F, peserta didik merancang program dan menganalisis efisiensi solusi komputasional.",
            ("F", "TIK"): "Pada akhir Fase F, peserta didik mengelola data dan memahami dampak sosial teknologi informasi.",
        },
        "grade": {
            10: {"BK": [("Menerapkan algoritma dan pemrograman dasar",
                         "Menyusun algoritma dan menerjemahkannya ke program", [
                             ("Menyusun algoritma penyelesaian masalah",
                              "Runtutan, percabangan, perulangan; pseudokode sebelum kode."),
                             ("Menulis program sederhana dengan percabangan dan perulangan",
                              "Variabel, kondisi, loop; menguji dengan masukan batas.")])],
                 "TIK": [("Menggunakan perkakas TIK dan menjaga keamanan digital",
                          "Memakai perkakas dan menjaga data pribadi", [
                              ("Mengolah data dengan perangkat lunak lembar kerja",
                               "Rumus, penyaringan, dan grafik; memeriksa hasil rumus."),
                              ("Menerapkan keamanan dan etika digital",
                               "Kata sandi kuat, jejak digital, hak cipta, dan privasi orang lain.")])]},
            11: {"BK": [("Merancang solusi komputasional",
                         "Memecah masalah dan merancang solusinya", [
                             ("Memecah masalah besar menjadi submasalah (dekomposisi)",
                              "Fungsi sebagai wadah submasalah; menamai fungsi dengan jujur."),
                             ("Menggunakan struktur data sederhana",
                              "Larik dan kamus; memilih struktur sesuai bentuk datanya.")])],
                 "TIK": [("Mengelola data terstruktur",
                          "Menyimpan dan mengambil data secara terstruktur", [
                              ("Menyusun dan menanyakan basis data sederhana",
                               "Tabel, kunci, dan kueri dasar."),
                              ("Menyajikan data hasil olahan secara jujur",
                               "Visualisasi yang tidak menyesatkan; menyebut sumber data.")])]},
            12: {"BK": [("Menganalisis efisiensi solusi",
                         "Membandingkan solusi dari segi efisiensi", [
                             ("Membandingkan dua algoritma untuk masalah yang sama",
                              "Banyak langkah terhadap ukuran masukan; kenapa ukuran kecil menipu."),
                             ("Menguji dan memperbaiki program secara sistematis",
                              "Kasus uji normal, batas, dan salah; memperbaiki akar bukan gejala.")])],
                 "TIK": [("Menganalisis dampak sosial teknologi informasi",
                          "Menilai dampak teknologi bagi masyarakat", [
                              ("Menganalisis dampak positif dan negatif teknologi informasi",
                               "Otomasi, pekerjaan, dan kesenjangan digital."),
                              ("Menganalisis isu privasi dan kecerdasan buatan",
                               "Data pribadi sebagai bahan bakar model; persetujuan yang bermakna.")])]},
        },
    },
    "FIS": {
        "nama": "Fisika", "urutan": 9,
        "elemen": {"PEM": "Pemahaman Fisika", "KET": "Keterampilan Proses"},
        "cp": {
            ("F", "PEM"): "Pada akhir Fase F, peserta didik memahami kinematika, dinamika, usaha dan energi, gelombang, listrik, serta fisika modern.",
            ("F", "KET"): "Pada akhir Fase F, peserta didik merancang dan melaksanakan percobaan fisika serta menganalisis datanya secara kuantitatif.",
        },
        "grade": {
            11: {"PEM": [("Memahami kinematika dan dinamika gerak",
                          "Menjelaskan gerak dan penyebabnya", [
                              ("Menganalisis gerak lurus dan gerak parabola",
                               "Kecepatan, percepatan, dan lintasan; memisahkan komponen x dan y."),
                              ("Menerapkan hukum Newton pada sistem benda",
                               "Diagram gaya bebas sebelum menghitung.")])],
                 "KET": [("Merancang percobaan fisika",
                          "Menyusun percobaan dengan variabel terkendali", [
                              ("Merancang percobaan dengan variabel yang terkendali",
                               "Variabel bebas, terikat, kontrol; pengulangan pengukuran."),
                              ("Menganalisis ketidakpastian pengukuran",
                               "Ketelitian alat, angka penting, dan pelaporan hasil.")])]},
            12: {"PEM": [("Memahami listrik, gelombang, dan fisika modern",
                          "Menjelaskan fenomena listrik dan gelombang", [
                              ("Menganalisis rangkaian listrik arus searah dan bolak-balik",
                               "Hukum Ohm dan Kirchhoff; daya listrik di rumah."),
                              ("Menjelaskan gejala gelombang dan konsep fisika modern",
                               "Interferensi dan difraksi; efek fotolistrik sebagai pintu fisika kuantum.")])],
                 "KET": [("Menganalisis data percobaan secara kuantitatif",
                          "Menarik simpulan dari data numerik", [
                              ("Menganalisis data dengan grafik dan gradien",
                               "Gradien grafik sebagai besaran fisis, bukan sekadar garis."),
                              ("Menyusun laporan percobaan yang dapat diulang",
                               "Metode yang cukup rinci agar orang lain memperoleh hasil serupa.")])]},
        },
    },
    "KIM": {
        "nama": "Kimia", "urutan": 10,
        "elemen": {"PEM": "Pemahaman Kimia", "KET": "Keterampilan Proses"},
        "cp": {
            ("F", "PEM"): "Pada akhir Fase F, peserta didik memahami struktur atom, ikatan kimia, stoikiometri, termokimia, laju reaksi, dan kesetimbangan.",
            ("F", "KET"): "Pada akhir Fase F, peserta didik melakukan percobaan kimia dengan prosedur keselamatan dan menganalisis hasilnya.",
        },
        "grade": {
            11: {"PEM": [("Memahami struktur atom dan ikatan kimia",
                          "Menjelaskan struktur atom dan pembentukan ikatan", [
                              ("Menjelaskan konfigurasi elektron dan letak unsur dalam tabel periodik",
                               "Kulit, subkulit, dan hubungan dengan sifat periodik."),
                              ("Menjelaskan pembentukan ikatan ion dan kovalen",
                               "Serah terima vs pemakaian bersama elektron; sifat senyawanya.")])],
                 "KET": [("Melakukan percobaan kimia dengan aman",
                          "Menerapkan prosedur keselamatan laboratorium", [
                              ("Menerapkan prosedur keselamatan kerja di laboratorium",
                               "Simbol bahaya, APD, dan penanganan tumpahan."),
                              ("Melakukan pengukuran dan pencatatan data kimia",
                               "Massa, volume, dan suhu; mencatat sebelum lupa, bukan sesudah.")])]},
            12: {"PEM": [("Memahami stoikiometri, laju reaksi, dan kesetimbangan",
                          "Menghitung dan menjelaskan perubahan kimia", [
                              ("Menyelesaikan perhitungan stoikiometri",
                               "Mol sebagai jembatan massa-partikel; persamaan setara lebih dulu."),
                              ("Menjelaskan faktor yang memengaruhi laju reaksi dan kesetimbangan",
                               "Suhu, konsentrasi, katalis; asas Le Chatelier.")])],
                 "KET": [("Menganalisis hasil percobaan kimia",
                          "Menarik simpulan dari data percobaan", [
                              ("Menganalisis data percobaan laju reaksi",
                               "Grafik konsentrasi terhadap waktu; menentukan orde sederhana."),
                              ("Menyusun laporan percobaan kimia",
                               "Tujuan, prosedur, data, pembahasan, simpulan.")])]},
        },
    },
    "BIO": {
        "nama": "Biologi", "urutan": 11,
        "elemen": {"PEM": "Pemahaman Biologi", "KET": "Keterampilan Proses"},
        "cp": {
            ("F", "PEM"): "Pada akhir Fase F, peserta didik memahami sel, metabolisme, genetika, evolusi, dan ekologi.",
            ("F", "KET"): "Pada akhir Fase F, peserta didik merancang penyelidikan biologi dan mengomunikasikan hasilnya secara ilmiah.",
        },
        "grade": {
            11: {"PEM": [("Memahami sel dan metabolisme",
                          "Menjelaskan struktur sel dan proses metabolisme", [
                              ("Menjelaskan struktur dan fungsi organel sel",
                               "Membran, mitokondria, ribosom; hubungan struktur dan fungsi."),
                              ("Menjelaskan proses metabolisme sel",
                               "Respirasi seluler dan fotosintesis sebagai aliran energi.")])],
                 "KET": [("Merancang penyelidikan biologi",
                          "Menyusun penyelidikan dengan kontrol yang tepat", [
                              ("Merancang penyelidikan dengan kelompok kontrol",
                               "Kenapa tanpa kontrol simpulan tidak boleh ditarik."),
                              ("Menggunakan mikroskop dan membuat preparat sederhana",
                               "Perbesaran, fokus, dan pembuatan preparat basah.")])]},
            12: {"PEM": [("Memahami genetika, evolusi, dan ekologi",
                          "Menjelaskan pewarisan sifat dan interaksi ekosistem", [
                              ("Menjelaskan pewarisan sifat dan persilangan",
                               "Hukum Mendel; papan Punnett dan peluang kemunculan sifat."),
                              ("Menjelaskan mekanisme evolusi dan interaksi dalam ekosistem",
                               "Seleksi alam; rantai makanan dan daya dukung lingkungan.")])],
                 "KET": [("Mengomunikasikan hasil penyelidikan biologi",
                          "Menyajikan temuan secara ilmiah", [
                              ("Menganalisis data biologi secara kuantitatif",
                               "Persentase, rata-rata, dan grafik pertumbuhan."),
                              ("Menyusun laporan ilmiah hasil penyelidikan",
                               "Struktur ilmiah lengkap dengan rujukan.")])]},
        },
    },
    "EKO": {
        "nama": "Ekonomi", "urutan": 12,
        "elemen": {"PEM": "Pemahaman Ekonomi", "KET": "Keterampilan Proses"},
        "cp": {
            ("F", "PEM"): "Pada akhir Fase F, peserta didik memahami konsep kelangkaan, pasar, lembaga keuangan, kebijakan fiskal dan moneter, serta ekonomi internasional.",
            ("F", "KET"): "Pada akhir Fase F, peserta didik mengolah data ekonomi dan menyusun simpulan berdasarkan bukti.",
        },
        "grade": {
            11: {"PEM": [("Memahami pasar dan lembaga keuangan",
                          "Menjelaskan mekanisme pasar dan peran lembaga keuangan", [
                              ("Menjelaskan terbentuknya harga keseimbangan",
                               "Permintaan, penawaran, dan pergeseran kurvanya."),
                              ("Menjelaskan peran bank dan lembaga keuangan",
                               "Fungsi bank, bunga, dan literasi keuangan pribadi.")])],
                 "KET": [("Mengolah data ekonomi",
                          "Membaca dan mengolah indikator ekonomi", [
                              ("Membaca indikator ekonomi dari data resmi",
                               "Inflasi, pengangguran, pertumbuhan; membaca rilis BPS."),
                              ("Menyajikan data ekonomi dalam grafik yang jujur",
                               "Skala dan periode yang tidak dipilih untuk menyesatkan.")])]},
            12: {"PEM": [("Memahami kebijakan ekonomi dan ekonomi internasional",
                          "Menjelaskan kebijakan dan perdagangan antarnegara", [
                              ("Menjelaskan kebijakan fiskal dan moneter",
                               "APBN, pajak, suku bunga; siapa yang terdampak tiap kebijakan."),
                              ("Menjelaskan perdagangan internasional dan kurs",
                               "Ekspor-impor, neraca perdagangan, dan nilai tukar.")])],
                 "KET": [("Menyusun simpulan ekonomi berbasis bukti",
                          "Menarik simpulan dari data ekonomi", [
                              ("Menganalisis hubungan antar indikator ekonomi",
                               "Korelasi bukan sebab-akibat; contoh kesalahan penafsiran."),
                              ("Menyusun laporan analisis ekonomi sederhana",
                               "Masalah, data, analisis, simpulan, dan keterbatasannya.")])]},
        },
    },
    "SOS": {
        "nama": "Sosiologi", "urutan": 13,
        "elemen": {"PEM": "Pemahaman Sosiologi", "KET": "Keterampilan Penelitian Sosial"},
        "cp": {
            ("F", "PEM"): "Pada akhir Fase F, peserta didik memahami kelompok sosial, konflik, perubahan sosial, dan ketimpangan dalam masyarakat.",
            ("F", "KET"): "Pada akhir Fase F, peserta didik melakukan penelitian sosial sederhana dengan metode yang sesuai dan etis.",
        },
        "grade": {
            11: {"PEM": [("Memahami kelompok sosial dan konflik",
                          "Menjelaskan dinamika kelompok dan konflik sosial", [
                              ("Menjelaskan pembentukan dan dinamika kelompok sosial",
                               "In-group dan out-group; bagaimana identitas kelompok terbentuk."),
                              ("Menganalisis sebab dan penyelesaian konflik sosial",
                               "Akar konflik, eskalasi, mediasi, dan integrasi.")])],
                 "KET": [("Merancang penelitian sosial",
                          "Menyusun rancangan penelitian yang etis", [
                              ("Menyusun rancangan penelitian sosial sederhana",
                               "Topik, rumusan masalah, metode kualitatif atau kuantitatif."),
                              ("Menerapkan etika penelitian sosial",
                               "Persetujuan responden, kerahasiaan, dan tidak merugikan subjek.")])]},
            12: {"PEM": [("Memahami perubahan sosial dan ketimpangan",
                          "Menganalisis perubahan dan ketimpangan masyarakat", [
                              ("Menganalisis faktor dan dampak perubahan sosial",
                               "Modernisasi, globalisasi, dan pergeseran nilai."),
                              ("Menganalisis bentuk ketimpangan sosial dan upaya mengatasinya",
                               "Ketimpangan pendidikan, ekonomi, dan akses layanan.")])],
                 "KET": [("Melaksanakan dan melaporkan penelitian sosial",
                          "Mengumpulkan data dan menyusun laporan", [
                              ("Mengumpulkan data melalui wawancara dan observasi",
                               "Panduan wawancara; mencatat tanpa menggiring jawaban."),
                              ("Menyusun laporan penelitian sosial",
                               "Temuan, pembahasan, simpulan, dan keterbatasan penelitian.")])]},
        },
    },
    "GEO": {
        "nama": "Geografi", "urutan": 14,
        "elemen": {"PEM": "Pemahaman Geografi", "KET": "Keterampilan Geografi"},
        "cp": {
            ("F", "PEM"): "Pada akhir Fase F, peserta didik memahami dinamika litosfer, atmosfer, hidrosfer, kependudukan, dan mitigasi bencana.",
            ("F", "KET"): "Pada akhir Fase F, peserta didik menggunakan peta, penginderaan jauh, dan SIG untuk menganalisis fenomena geosfer.",
        },
        "grade": {
            11: {"PEM": [("Memahami dinamika litosfer dan atmosfer",
                          "Menjelaskan proses pembentuk muka bumi dan cuaca", [
                              ("Menjelaskan tenaga endogen dan eksogen pembentuk muka bumi",
                               "Tektonisme, vulkanisme, pelapukan, dan erosi."),
                              ("Menjelaskan unsur cuaca dan iklim serta pengaruhnya",
                               "Suhu, kelembapan, angin; pengaruh pada pertanian.")])],
                 "KET": [("Menggunakan peta dan penginderaan jauh",
                          "Membaca peta dan citra", [
                              ("Membaca peta tematik dan menentukan lokasi",
                               "Skala, legenda, proyeksi, dan koordinat."),
                              ("Menafsirkan citra penginderaan jauh sederhana",
                               "Rona, tekstur, dan pola untuk mengenali objek.")])]},
            12: {"PEM": [("Memahami kependudukan dan mitigasi bencana",
                          "Menganalisis dinamika penduduk dan risiko bencana", [
                              ("Menganalisis dinamika kependudukan Indonesia",
                               "Piramida penduduk, migrasi, dan bonus demografi."),
                              ("Menjelaskan mitigasi bencana berbasis wilayah",
                               "Peta rawan bencana; kesiapsiagaan sebelum, saat, sesudah.")])],
                 "KET": [("Menggunakan SIG untuk analisis wilayah",
                          "Menganalisis data keruangan", [
                              ("Menggunakan sistem informasi geografis sederhana",
                               "Lapisan data, tumpang susun, dan analisis keruangan dasar."),
                              ("Menyusun laporan analisis keruangan",
                               "Peta hasil analisis disertai penjelasan dan sumber data.")])]},
        },
    },
}

for _kode, _tambah in MAPEL_SMA.items():
    MAPEL[_kode]["cp"].update(_tambah["cp"])
    MAPEL[_kode]["grade"].update(_tambah["grade"])
MAPEL.update(MAPEL_SMA_BARU)


# ==========================================================================
# GELOMBANG MAPEL LINTAS JENJANG — PJOK, Seni Budaya, Prakarya
# ==========================================================================
# PJOK dan Seni Budaya berjalan dari Kelas 1 sampai 12. Prakarya mulai Kelas 7: di SD
# muatan serupa menyatu dalam Seni Budaya dan IPAS, jadi entri Kelas 1-6 untuknya akan
# menghitung hal yang sama dua kali di cakupan kurikulum.
#
# PENDIDIKAN AGAMA SENGAJA TIDAK ADA DI SINI. Isinya berbeda untuk tiap agama (Islam,
# Kristen, Katolik, Hindu, Buddha, Khonghucu), dan menulis materi keagamaan tanpa arahan
# owner bukan keputusan yang boleh diambil penyemai. Ia menunggu keputusan, bukan
# terlupakan — dicatat di docs/handoffs/KURIKULUM-SEKOLAH-HANDOFF.md.
MAPEL_LINTAS: dict[str, dict] = {
    "PJOK": {
        "nama": "Pendidikan Jasmani, Olahraga, dan Kesehatan", "urutan": 15,
        "elemen": {"GER": "Keterampilan Gerak", "KEB": "Kebugaran dan Kesehatan"},
        "cp": {
            ("A", "GER"): "Pada akhir Fase A, peserta didik menunjukkan gerak dasar lokomotor, nonlokomotor, dan manipulatif sederhana.",
            ("A", "KEB"): "Pada akhir Fase A, peserta didik mengenal kebiasaan hidup bersih dan sehat serta manfaat bergerak aktif.",
            ("B", "GER"): "Pada akhir Fase B, peserta didik mengombinasikan gerak dasar dalam permainan sederhana dan aktivitas senam.",
            ("B", "KEB"): "Pada akhir Fase B, peserta didik memahami unsur kebugaran jasmani dan menjaga kebersihan diri.",
            ("C", "GER"): "Pada akhir Fase C, peserta didik menerapkan kombinasi gerak dalam permainan bola dan atletik sederhana.",
            ("C", "KEB"): "Pada akhir Fase C, peserta didik mengukur kebugaran jasmani dan memahami pola makan bergizi.",
            ("D", "GER"): "Pada akhir Fase D, peserta didik mempraktikkan teknik dasar permainan bola besar, bola kecil, atletik, dan beladiri.",
            ("D", "KEB"): "Pada akhir Fase D, peserta didik menyusun program kebugaran sederhana dan memahami kesehatan reproduksi serta bahaya zat adiktif.",
            ("E", "GER"): "Pada akhir Fase E, peserta didik menerapkan keterampilan gerak dalam permainan dan olahraga dengan strategi sederhana.",
            ("E", "KEB"): "Pada akhir Fase E, peserta didik merancang dan melaksanakan program kebugaran pribadi.",
            ("F", "GER"): "Pada akhir Fase F, peserta didik menerapkan strategi dan taktik permainan serta memimpin aktivitas jasmani.",
            ("F", "KEB"): "Pada akhir Fase F, peserta didik mengevaluasi gaya hidup sehat dan menerapkannya secara berkelanjutan.",
        },
        "grade": {
            1: {"GER": [("Mempraktikkan gerak dasar lokomotor", "Bergerak berpindah tempat dengan aman", [
                    ("Mempraktikkan jalan, lari, dan lompat dengan aman", "Jalan dan lari dengan pandangan ke depan; mendarat dengan lutut menekuk."),
                    ("Mempraktikkan gerak nonlokomotor sederhana", "Membungkuk, memutar, mengayun di tempat.")])],
                "KEB": [("Mengenal kebiasaan hidup bersih", "Menjaga kebersihan diri", [
                    ("Mencuci tangan dengan langkah yang benar", "Enam langkah cuci tangan; kapan harus mencuci tangan."),
                    ("Menjelaskan manfaat bergerak aktif", "Badan bugar, tidur nyenyak, dan mudah berkonsentrasi.")])]},
            2: {"GER": [("Mempraktikkan gerak manipulatif", "Melempar, menangkap, dan menendang", [
                    ("Melempar dan menangkap bola dengan dua tangan", "Posisi tangan menerima bola; pandangan mengikuti bola."),
                    ("Menendang dan menghentikan bola", "Bagian kaki untuk menendang; menghentikan dengan telapak kaki.")])],
                "KEB": [("Menjaga kebersihan diri dan lingkungan", "Membiasakan hidup bersih", [
                    ("Menjaga kebersihan gigi dan tubuh", "Waktu dan cara menyikat gigi; mandi dan mengganti pakaian."),
                    ("Membuang sampah pada tempatnya", "Memilah sampah kering dan basah di kelas.")])]},
            3: {"GER": [("Mengombinasikan gerak dalam permainan sederhana", "Menggabungkan dua gerak dasar", [
                    ("Mengombinasikan lari dan lompat dalam permainan", "Lari lalu melompati rintangan rendah."),
                    ("Mempraktikkan gerak dasar senam lantai", "Guling depan dengan matras dan pendampingan.")])],
                "KEB": [("Memahami unsur kebugaran jasmani", "Mengenal unsur kebugaran", [
                    ("Menjelaskan unsur kekuatan, kelenturan, dan daya tahan", "Contoh latihan untuk tiap unsur."),
                    ("Melakukan pemanasan dan pendinginan", "Kenapa pemanasan mengurangi risiko cedera.")])]},
            4: {"GER": [("Mempraktikkan permainan bola sederhana", "Bermain dengan aturan sederhana", [
                    ("Mempraktikkan permainan bola besar yang dimodifikasi", "Aturan disederhanakan; kerja sama tim lebih dulu daripada skor."),
                    ("Mempraktikkan gerak ritmik mengikuti irama", "Langkah dan ayunan mengikuti hitungan.")])],
                "KEB": [("Menjaga kebersihan dan keselamatan diri", "Mencegah cedera dan penyakit", [
                    ("Menerapkan keselamatan saat beraktivitas jasmani", "Alas kaki, lapangan aman, dan minum cukup."),
                    ("Menjelaskan pentingnya istirahat dan tidur cukup", "Hubungan tidur dengan kebugaran dan belajar.")])]},
            5: {"GER": [("Menerapkan kombinasi gerak dalam atletik", "Melakukan gerak atletik dasar", [
                    ("Mempraktikkan lari jarak pendek dengan teknik dasar", "Start, langkah, dan pengaturan napas."),
                    ("Mempraktikkan lompat jauh gaya jongkok", "Awalan, tolakan, melayang, mendarat.")])],
                "KEB": [("Mengukur kebugaran jasmani", "Mengukur dan menafsirkan kebugaran", [
                    ("Melakukan tes kebugaran sederhana", "Lari 600 m, sit-up, dan push-up dengan pencatatan."),
                    ("Menjelaskan pola makan bergizi seimbang", "Isi piringku; membedakan lapar dari ingin ngemil.")])]},
            6: {"GER": [("Menerapkan gerak dalam permainan bola kecil", "Bermain bola kecil dengan teknik dasar", [
                    ("Mempraktikkan permainan bola kecil yang dimodifikasi", "Kasti atau rounders dengan aturan yang disepakati."),
                    ("Mempraktikkan rangkaian senam lantai sederhana", "Dua gerakan disambung menjadi rangkaian.")])],
                "KEB": [("Menerapkan gaya hidup sehat", "Membiasakan perilaku sehat", [
                    ("Menyusun jadwal aktivitas fisik harian", "Target menit bergerak per hari yang masuk akal."),
                    ("Menjelaskan bahaya rokok dan minuman berpemanis", "Dampak jangka pendek yang bisa dirasakan sendiri.")])]},
            7: {"GER": [("Mempraktikkan teknik dasar permainan bola besar", "Melakukan teknik dasar dengan benar", [
                    ("Mempraktikkan passing dan kontrol dalam sepak bola atau bola voli", "Perkenaan bola dan posisi tubuh."),
                    ("Mempraktikkan teknik dasar bola basket", "Dribbling, chest pass, dan lay-up sederhana.")])],
                "KEB": [("Memahami kebugaran dan kesehatan remaja", "Menjaga kebugaran pada masa remaja", [
                    ("Menyusun latihan kebugaran sederhana", "Frekuensi, intensitas, waktu, dan jenis latihan."),
                    ("Menjelaskan perubahan tubuh pada masa remaja", "Perubahan fisik sebagai hal wajar; menjaga kebersihan diri.")])]},
            8: {"GER": [("Mempraktikkan atletik dan beladiri", "Melakukan teknik atletik dan beladiri dasar", [
                    ("Mempraktikkan tolak peluru atau lempar lembing gaya dasar", "Pegangan, awalan, dan keselamatan area lempar."),
                    ("Mempraktikkan gerak dasar pencak silat", "Kuda-kuda, pukulan, tangkisan; sikap hormat sebelum dan sesudah.")])],
                "KEB": [("Memahami kesehatan reproduksi dan zat adiktif", "Menjaga kesehatan dan menolak zat berbahaya", [
                    ("Menjelaskan kesehatan reproduksi remaja", "Kebersihan, batasan tubuh, dan kepada siapa bertanya."),
                    ("Menjelaskan bahaya zat adiktif dan cara menolaknya", "Rokok, alkohol, NAPZA; kalimat menolak ajakan teman.")])]},
            9: {"GER": [("Menerapkan teknik dan taktik permainan", "Bermain dengan taktik sederhana", [
                    ("Menerapkan taktik menyerang dan bertahan dalam permainan", "Posisi pemain dan pergerakan tanpa bola."),
                    ("Mempraktikkan aktivitas air atau senam irama", "Keselamatan di air; rangkaian gerak berirama.")])],
                "KEB": [("Menyusun program kebugaran pribadi", "Merancang latihan sesuai kebutuhan", [
                    ("Menyusun program latihan kebugaran empat minggu", "Sasaran terukur dan peningkatan bertahap."),
                    ("Mengevaluasi hasil program kebugaran", "Membandingkan tes awal dan akhir dengan jujur.")])]},
            10: {"GER": [("Menerapkan keterampilan gerak dalam olahraga", "Bermain dengan strategi", [
                    ("Menerapkan strategi permainan bola besar", "Formasi dan pembagian peran dalam tim."),
                    ("Mempraktikkan aktivitas atletik dengan teknik lanjutan", "Efisiensi gerak dan irama langkah.")])],
                 "KEB": [("Merancang program kebugaran pribadi", "Menyusun dan menjalankan program", [
                    ("Merancang program kebugaran berdasarkan hasil tes", "Menentukan sasaran dari data, bukan dari keinginan."),
                    ("Menerapkan prinsip latihan yang aman", "Beban bertahap, pemulihan, dan tanda tubuh kelelahan.")])]},
            11: {"GER": [("Menerapkan taktik permainan tingkat lanjut", "Menganalisis dan menerapkan taktik", [
                    ("Menganalisis taktik lawan dalam permainan", "Membaca pola serangan dan menyesuaikan pertahanan."),
                    ("Memimpin pemanasan dan aktivitas kelompok", "Instruksi jelas dan memperhatikan keselamatan peserta.")])],
                 "KEB": [("Mengevaluasi gaya hidup sehat", "Menilai dan memperbaiki kebiasaan", [
                    ("Menganalisis kebiasaan makan dan aktivitas pribadi", "Mencatat asupan dan aktivitas selama sepekan."),
                    ("Menjelaskan pencegahan penyakit tidak menular", "Diabetes, hipertensi, dan obesitas serta faktor risikonya.")])]},
            12: {"GER": [("Memimpin aktivitas jasmani", "Merancang dan memimpin kegiatan", [
                    ("Merancang kegiatan olahraga untuk kelompok", "Jadwal, peran, keselamatan, dan sarana."),
                    ("Memimpin pelaksanaan kegiatan olahraga", "Mengatur peserta dan menangani keadaan darurat sederhana.")])],
                 "KEB": [("Menerapkan gaya hidup sehat berkelanjutan", "Mempertahankan kebiasaan sehat", [
                    ("Menyusun rencana hidup sehat jangka panjang", "Kebiasaan yang bisa dipertahankan sesudah lulus sekolah."),
                    ("Mengevaluasi informasi kesehatan dari media", "Memeriksa sumber sebelum mempercayai klaim kesehatan.")])]},
        },
    },
    "SEN": {
        "nama": "Seni Budaya", "urutan": 16,
        "elemen": {"CIP": "Menciptakan", "APR": "Mengapresiasi"},
        "cp": {
            ("A", "CIP"): "Pada akhir Fase A, peserta didik membuat karya seni sederhana dengan media yang tersedia.",
            ("A", "APR"): "Pada akhir Fase A, peserta didik mengenali dan menanggapi karya seni di sekitarnya.",
            ("B", "CIP"): "Pada akhir Fase B, peserta didik membuat karya seni rupa, musik, tari, atau teater sederhana sesuai gagasannya.",
            ("B", "APR"): "Pada akhir Fase B, peserta didik menanggapi karya seni dengan menyebut unsur yang dilihat dan didengar.",
            ("C", "CIP"): "Pada akhir Fase C, peserta didik menciptakan karya seni dengan teknik dan unsur yang dipilih secara sadar.",
            ("C", "APR"): "Pada akhir Fase C, peserta didik mengapresiasi karya seni daerah dan menjelaskan maknanya.",
            ("D", "CIP"): "Pada akhir Fase D, peserta didik menciptakan karya seni dengan mempertimbangkan unsur, teknik, dan pesan.",
            ("D", "APR"): "Pada akhir Fase D, peserta didik menganalisis karya seni dan hubungannya dengan konteks budaya.",
            ("E", "CIP"): "Pada akhir Fase E, peserta didik menciptakan karya seni dengan gagasan pribadi yang terarah.",
            ("E", "APR"): "Pada akhir Fase E, peserta didik mengevaluasi karya seni berdasarkan unsur dan konteksnya.",
            ("F", "CIP"): "Pada akhir Fase F, peserta didik menciptakan dan mementaskan karya seni untuk publik.",
            ("F", "APR"): "Pada akhir Fase F, peserta didik mengkritisi karya seni dan menyusun argumen apresiatif.",
        },
        "grade": {
            1: {"CIP": [("Membuat karya seni rupa sederhana", "Berkarya dengan media sederhana", [
                    ("Menggambar dan mewarnai objek di sekitar", "Garis, bentuk, dan warna; mengamati sebelum menggambar."),
                    ("Menyanyikan lagu anak dengan nada yang tepat", "Tinggi rendah nada; menyanyi bersama mengikuti ketukan.")])],
                "APR": [("Menanggapi karya seni di sekitar", "Menyebut apa yang dilihat dan didengar", [
                    ("Menyebutkan warna dan bentuk pada karya seni", "Menyebut apa yang terlihat, bukan suka atau tidak suka."),
                    ("Menanggapi lagu yang didengar", "Cepat-lambat dan keras-lembut sebagai kosakata awal.")])]},
            2: {"CIP": [("Membuat karya dengan bahan alam", "Berkarya dengan bahan di sekitar", [
                    ("Membuat karya kolase dari bahan alam", "Daun, biji, dan ranting; menempel dengan rapi."),
                    ("Menirukan gerak tari sederhana", "Gerak mengikuti hitungan dan contoh guru.")])],
                "APR": [("Mengapresiasi karya teman", "Menanggapi karya dengan santun", [
                    ("Menyebut bagian yang menarik dari karya teman", "Memuji hal yang spesifik, bukan sekadar bagus."),
                    ("Menyebut alat musik yang didengar", "Mengenali bunyi alat musik sederhana.")])]},
            3: {"CIP": [("Membuat karya seni dengan teknik tertentu", "Menerapkan teknik berkarya", [
                    ("Membuat karya cetak sederhana", "Cetak penampang dan cap dari bahan sekitar."),
                    ("Memainkan pola irama sederhana", "Tepuk dan alat perkusi mengikuti pola.")])],
                "APR": [("Menanggapi karya seni daerah", "Mengenal seni daerah setempat", [
                    ("Mengenali karya seni daerah setempat", "Motif kain, alat musik, dan tarian daerah."),
                    ("Menceritakan kesan terhadap karya seni", "Menghubungkan karya dengan pengalaman sendiri.")])]},
            4: {"CIP": [("Menciptakan karya seni rupa dua dimensi", "Berkarya dengan unsur rupa", [
                    ("Membuat karya dua dimensi dengan komposisi", "Penempatan objek, ruang kosong, dan keseimbangan."),
                    ("Menyanyikan lagu daerah dengan ekspresi", "Artikulasi dan penghayatan isi lagu.")])],
                "APR": [("Mengapresiasi keragaman seni Indonesia", "Menghargai seni dari berbagai daerah", [
                    ("Membandingkan karya seni dari dua daerah", "Persamaan dan perbedaan motif atau irama."),
                    ("Menjelaskan fungsi seni dalam kehidupan masyarakat", "Seni untuk upacara, hiburan, dan penanda identitas.")])]},
            5: {"CIP": [("Menciptakan karya seni tiga dimensi", "Berkarya dalam bentuk tiga dimensi", [
                    ("Membuat karya tiga dimensi dari bahan lunak", "Membentuk, menyusun, dan merakit."),
                    ("Menampilkan gerak tari kreasi sederhana", "Menyusun gerak sendiri dari pola yang dipelajari.")])],
                "APR": [("Mengapresiasi karya seni dengan unsurnya", "Menganalisis unsur karya seni", [
                    ("Menjelaskan unsur rupa dalam sebuah karya", "Garis, bentuk, warna, tekstur, ruang."),
                    ("Menjelaskan unsur musik dalam lagu", "Melodi, irama, dinamika, dan tempo.")])]},
            6: {"CIP": [("Menciptakan karya seni pertunjukan", "Menyiapkan dan menampilkan karya", [
                    ("Menyusun pertunjukan sederhana secara berkelompok", "Pembagian peran, latihan, dan properti."),
                    ("Menampilkan karya seni di depan penonton", "Kesiapan panggung dan kepercayaan diri.")])],
                "APR": [("Mengapresiasi karya seni daerah dan maknanya", "Menjelaskan makna karya seni", [
                    ("Menjelaskan makna simbol dalam karya seni daerah", "Motif dan warna yang membawa arti tertentu."),
                    ("Menanggapi pertunjukan dengan argumen", "Menyebut alasan di balik tanggapan.")])]},
            7: {"CIP": [("Menciptakan karya seni dengan gagasan sendiri", "Menuangkan gagasan ke dalam karya", [
                    ("Menciptakan karya seni rupa dengan tema tertentu", "Sketsa gagasan sebelum berkarya."),
                    ("Menciptakan aransemen musik sederhana", "Mengubah irama atau menambah suara pengiring.")])],
                "APR": [("Menganalisis karya seni dan konteksnya", "Menghubungkan karya dengan budayanya", [
                    ("Menganalisis unsur dan teknik dalam karya seni", "Membaca karya dari cara pembuatannya."),
                    ("Menjelaskan hubungan karya seni dengan budaya masyarakatnya", "Kenapa bentuk seni berbeda antar daerah.")])]},
            8: {"CIP": [("Menciptakan karya seni dengan teknik pilihan", "Memilih teknik sesuai gagasan", [
                    ("Menciptakan karya seni rupa dengan teknik yang dipilih", "Alasan memilih teknik, bukan sekadar mengikuti contoh."),
                    ("Menampilkan karya tari atau teater berkelompok", "Blocking, ekspresi, dan kerja sama kelompok.")])],
                "APR": [("Mengapresiasi karya seni modern dan tradisional", "Membandingkan dua jenis karya", [
                    ("Membandingkan karya seni tradisional dan modern", "Apa yang berubah dan apa yang bertahan."),
                    ("Menyusun tanggapan tertulis atas sebuah karya", "Deskripsi, analisis, tafsir, penilaian.")])]},
            9: {"CIP": [("Menciptakan karya seni dengan pesan", "Menyampaikan pesan melalui karya", [
                    ("Menciptakan karya seni yang menyampaikan pesan sosial", "Pesan yang jelas tanpa menggurui."),
                    ("Mementaskan karya seni pertunjukan", "Persiapan teknis dan latihan bertahap.")])],
                "APR": [("Mengkritisi karya seni", "Menyusun kritik yang berdasar", [
                    ("Menyusun kritik seni sederhana", "Empat tahap kritik; menghindari penilaian tanpa alasan."),
                    ("Menghargai perbedaan selera dan gaya seni", "Kenapa tidak semua karya harus disukai semua orang.")])]},
            10: {"CIP": [("Menciptakan karya seni dengan gagasan terarah", "Mengembangkan gagasan menjadi karya", [
                    ("Mengembangkan gagasan menjadi karya seni utuh", "Riset kecil, sketsa, revisi, karya akhir."),
                    ("Mendokumentasikan proses berkarya", "Catatan proses sebagai bagian dari karya.")])],
                 "APR": [("Mengevaluasi karya seni", "Menilai karya dengan kriteria", [
                    ("Mengevaluasi karya seni berdasarkan unsur dan konteks", "Kriteria penilaian disebut sebelum menilai."),
                    ("Menjelaskan perkembangan seni di Indonesia", "Garis besar perkembangan dan tokohnya.")])]},
            11: {"CIP": [("Menciptakan karya seni untuk publik", "Menyiapkan karya untuk penonton", [
                    ("Menciptakan karya seni untuk dipamerkan atau dipentaskan", "Mempertimbangkan ruang dan penonton."),
                    ("Menyusun rencana pameran atau pementasan", "Konsep, jadwal, kebutuhan, dan pembagian tugas.")])],
                 "APR": [("Mengkritisi karya seni secara argumentatif", "Menyusun argumen apresiatif", [
                    ("Menulis kritik seni dengan argumen dan bukti", "Menunjuk bagian karya sebagai bukti penilaian."),
                    ("Menganalisis karya seni dari sudut pandang budaya", "Karya sebagai jejak zaman dan masyarakatnya.")])]},
            12: {"CIP": [("Mementaskan karya seni untuk publik", "Melaksanakan pameran atau pementasan", [
                    ("Melaksanakan pameran atau pementasan karya", "Pelaksanaan sesuai rencana; menangani kendala di lapangan."),
                    ("Mengevaluasi hasil pameran atau pementasan", "Umpan balik penonton dan catatan perbaikan.")])],
                 "APR": [("Menyusun apresiasi seni yang utuh", "Menulis apresiasi mendalam", [
                    ("Menyusun tulisan apresiasi seni yang utuh", "Konteks, deskripsi, analisis, tafsir, penilaian."),
                    ("Menghubungkan karya seni dengan isu masa kini", "Seni sebagai tanggapan atas keadaan zamannya.")])]},
        },
    },
    "PRA": {
        "nama": "Prakarya dan Kewirausahaan", "urutan": 17,
        "elemen": {"PRD": "Produksi", "WIR": "Kewirausahaan"},
        "cp": {
            ("D", "PRD"): "Pada akhir Fase D, peserta didik merancang dan membuat produk kerajinan atau pengolahan sederhana dengan memperhatikan bahan dan keselamatan kerja.",
            ("D", "WIR"): "Pada akhir Fase D, peserta didik memahami peluang usaha sederhana dan menghitung biaya produksi.",
            ("E", "PRD"): "Pada akhir Fase E, peserta didik merancang produk berdasarkan kebutuhan pengguna dan menguji hasilnya.",
            ("E", "WIR"): "Pada akhir Fase E, peserta didik menyusun rencana usaha sederhana berdasarkan analisis pasar.",
            ("F", "PRD"): "Pada akhir Fase F, peserta didik mengembangkan produk dengan memperhatikan mutu, kemasan, dan keberlanjutan.",
            ("F", "WIR"): "Pada akhir Fase F, peserta didik menjalankan dan mengevaluasi usaha kecil secara bertanggung jawab.",
        },
        "grade": {
            7: {"PRD": [("Membuat produk kerajinan sederhana", "Merancang dan membuat kerajinan", [
                    ("Merancang produk kerajinan dari bahan alam", "Memilih bahan sesuai fungsi; sketsa sebelum membuat."),
                    ("Membuat produk dengan memperhatikan keselamatan kerja", "Penggunaan alat potong dan perekat dengan aman.")])],
                "WIR": [("Memahami biaya produksi", "Menghitung biaya sebuah produk", [
                    ("Menghitung biaya bahan dan tenaga sebuah produk", "Biaya tetap dan biaya variabel sederhana."),
                    ("Menentukan harga jual yang wajar", "Harga pokok, margin, dan harga pesaing.")])]},
            8: {"PRD": [("Membuat produk pengolahan sederhana", "Mengolah bahan menjadi produk", [
                    ("Mengolah bahan pangan menjadi produk sederhana", "Kebersihan, takaran, dan daya simpan."),
                    ("Mengemas produk agar aman dan menarik", "Fungsi kemasan: melindungi, memberi informasi, menarik.")])],
                "WIR": [("Mengenali peluang usaha", "Menemukan peluang di lingkungan sendiri", [
                    ("Mengidentifikasi kebutuhan yang belum terpenuhi di sekitar", "Mengamati dan bertanya sebelum membuat produk."),
                    ("Menyusun ide usaha sederhana", "Ide, sasaran pembeli, dan apa yang membuatnya berbeda.")])]},
            9: {"PRD": [("Mengembangkan produk berdasarkan umpan balik", "Memperbaiki produk dari masukan", [
                    ("Menguji produk kepada calon pengguna", "Meminta masukan spesifik, bukan sekadar suka atau tidak."),
                    ("Memperbaiki produk berdasarkan umpan balik", "Satu perbaikan satu alasan.")])],
                "WIR": [("Menyusun rencana usaha sederhana", "Merancang usaha kecil", [
                    ("Menyusun rencana usaha sederhana", "Produk, harga, tempat, promosi."),
                    ("Menghitung perkiraan untung dan rugi", "Titik impas sederhana.")])]},
            10: {"PRD": [("Merancang produk berbasis kebutuhan pengguna", "Merancang dari kebutuhan nyata", [
                    ("Menganalisis kebutuhan pengguna sebelum merancang", "Wawancara singkat dengan calon pengguna."),
                    ("Membuat purwarupa produk", "Purwarupa murah dulu sebelum produk jadi.")])],
                 "WIR": [("Menyusun rencana usaha berbasis pasar", "Menganalisis pasar sebelum berusaha", [
                    ("Menganalisis pasar dan pesaing", "Siapa pesaingnya dan apa yang mereka belum layani."),
                    ("Menyusun proposal usaha sederhana", "Latar belakang, produk, pasar, keuangan.")])]},
            11: {"PRD": [("Mengembangkan mutu dan kemasan produk", "Meningkatkan mutu produk", [
                    ("Meningkatkan mutu produk berdasarkan standar", "Konsistensi ukuran, rasa, atau kekuatan."),
                    ("Merancang kemasan yang informatif dan berkelanjutan", "Informasi wajib pada label; bahan kemasan ramah lingkungan.")])],
                 "WIR": [("Menjalankan usaha kecil", "Melaksanakan usaha secara nyata", [
                    ("Melaksanakan penjualan produk secara nyata", "Mencatat penjualan dan biaya sejak hari pertama."),
                    ("Mengelola keuangan usaha sederhana", "Memisahkan uang usaha dari uang pribadi.")])]},
            12: {"PRD": [("Mengembangkan produk berkelanjutan", "Merancang produk yang bertanggung jawab", [
                    ("Menganalisis dampak lingkungan dari produk", "Bahan, limbah, dan daur hidup produk."),
                    ("Mengembangkan produk dengan prinsip keberlanjutan", "Mengurangi, memakai ulang, mendaur ulang.")])],
                 "WIR": [("Mengevaluasi usaha secara bertanggung jawab", "Menilai dan memperbaiki usaha", [
                    ("Mengevaluasi kinerja usaha dari data penjualan", "Produk mana yang menopang dan mana yang membebani."),
                    ("Menyusun laporan dan rencana pengembangan usaha", "Laporan jujur termasuk yang gagal, plus rencana berikutnya.")])]},
        },
    },
}

MAPEL.update(MAPEL_LINTAS)

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
            "note": "17 mapel non-Inggris, Fase A–F (Kelas 1–12). Rumusan CP adalah rumusan yang setia "
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
