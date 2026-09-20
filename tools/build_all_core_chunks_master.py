import json
import os

tools_dir = r"c:\Users\hp\fiezel-apps\tools"

# 2. MATEMATIKA KELAS VII BAB 2: Aljabar
mat_b2 = {
    "code": "KOMP-MAT-D-7-BAB2-01",
    "grade": 7,
    "name": "Aljabar",
    "materi": "Unsur Bentuk Aljabar, Penjumlahan & Pengurangan Bentuk Aljabar, Perkalian & Pembagian Bentuk Aljabar, Pemodelan & Penyederhanaan",
    "cpRef": "Matematika untuk SMP/MTs Kelas VII — Bab 2",
    "items": [
        {
            "id": "mat-d-7-b2-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 68-72), koefisien dari variabel x² pada bentuk aljabar 5x³ - 3x² + 7x - 12 adalah…",
            "options": ["-3", "3", "5", "7"],
            "answer": 0,
            "why": {"0": "Koefisien adalah angka pengali yang melekat pada variabel tertentu. Pada suku -3x², koefisien variabel x² adalah -3."},
            "distractorWhy": {
                "1": "Nilai 3 mengabaikan tanda negatif pada suku -3x².",
                "2": "Nilai 5 adalah koefisien suku x³.",
                "3": "Nilai 7 adalah koefisien suku x."
            }
        },
        {
            "id": "mat-d-7-b2-q02",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 75), kelompok suku-suku berikut yang merupakan suku sejenis adalah…",
            "options": ["4x²y dan -7x²y", "3x² dan 3y²", "5a dan 5ab", "2px dan 2py"],
            "answer": 0,
            "why": {"0": "Suku sejenis adalah suku-suku yang memiliki variabel yang sama persis beserta pangkat dari variabelnya (x²y)."},
            "distractorWhy": {
                "1": "Variabel x² dan y² berbeda huruf dasar.",
                "2": "Suku 5a dan 5ab memiliki variabel berbeda (ab mengandung b).",
                "3": "Variabel px dan py tidak sama."
            }
        },
        {
            "id": "mat-d-7-b2-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 80 Ayo Uji Kemampuan), bentuk sederhana dari (7a - 4b) + (3a + 9b) adalah…",
            "options": ["10a + 5b", "10a - 13b", "4a + 5b", "10a + 13b"],
            "answer": 0,
            "why": {"0": "Kelompokkan suku sejenis: (7a + 3a) + (-4b + 9b) = 10a + 5b."},
            "distractorWhy": {
                "1": "Hasil 10a - 13b keliru mengoperasikan (-4b) + (9b) sebagai -13b.",
                "2": "Hasil 4a + 5b keliru mengalikan atau mengurangi suku 7a - 3a.",
                "3": "Hasil 10a + 13b keliru pada penjumlahan mutlak 4b + 9b."
            }
        },
        {
            "id": "mat-d-7-b2-q04",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 84), pengurangan (5x - 3y) dari (8x + 2y) menghasilkan bentuk aljabar…",
            "options": ["3x + 5y", "3x - 5y", "-3x - 5y", "13x - y"],
            "answer": 0,
            "why": {"0": "Frasa 'pengurangan A dari B' berarti B - A: (8x + 2y) - (5x - 3y) = 8x + 2y - 5x + 3y = (8x - 5x) + (2y + 3y) = 3x + 5y."},
            "distractorWhy": {
                "1": "Hasil 3x - 5y keliru tidak mengubah tanda -(-3y) menjadi +3y.",
                "2": "Hasil -3x - 5y keliru membalik arah pengurangan.",
                "3": "Hasil 13x - y terjadi jika dikerjakan sebagai penjumlahan A + B."
            }
        },
        {
            "id": "mat-d-7-b2-q05",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 88), hasil dari perkalian (2x - 3)(3x + 4) adalah…",
            "options": ["6x² - x - 12", "6x² + x - 12", "6x² - 12", "6x² + 17x - 12"],
            "answer": 0,
            "why": {"0": "Perkalian distributif: 2x(3x + 4) - 3(3x + 4) = 6x² + 8x - 9x - 12 = 6x² - x - 12."},
            "distractorWhy": {
                "1": "Hasil 6x² + x - 12 keliru tanda suku tengah +8x - 9x.",
                "2": "Hasil 6x² - 12 mengabaikan suku tengah (8x - 9x).",
                "3": "Hasil 6x² + 17x - 12 keliru menambahkan 8x + 9x tanpa memperhatikan tanda negatif."
            }
        },
        {
            "id": "mat-d-7-b2-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 92), jika x = -2 dan y = 3, maka nilai dari bentuk aljabar 3x² - 2xy + y² adalah…",
            "options": ["33", "15", "-15", "21"],
            "answer": 0,
            "why": {"0": "Substitusi x = -2 dan y = 3: 3(-2)² - 2(-2)(3) + (3)² = 3(4) - (-12) + 9 = 12 + 12 + 9 = 33."},
            "distractorWhy": {
                "1": "Nilai 15 terjadi jika -2(-2)(3) dihitung sebagai -12 alih-alih +12.",
                "2": "Nilai -15 terjadi karena kesalahan kuadrat (-2)² menjadi -4.",
                "3": "Nilai 21 mengabaikan suku tengah -2xy."
            }
        },
        {
            "id": "mat-d-7-b2-q07",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 96 Uji Kompetensi Bab 2), harga 3 buah buku tulis dan 2 buah pensil adalah Rp21.000,00. Jika harga 1 buah pensil dinyatakan sebagai p rupiah, dan harga 1 buah buku tulis adalah Rp2.000,00 lebih mahal dari pensil, persamaan aljabar yang tepat untuk menyatakan total harga tersebut adalah…",
            "options": ["5p + 6.000 = 21.000", "5p + 2.000 = 21.000", "3p + 2.000 = 21.000", "6p + 4.000 = 21.000"],
            "answer": 0,
            "why": {"0": "Misal pensil = p, maka buku = p + 2.000. Total harga = 3(buku) + 2(pensil) = 3(p + 2.000) + 2p = 3p + 6.000 + 2p = 5p + 6.000 = 21.000."},
            "distractorWhy": {
                "1": "Hasil 5p + 2.000 tidak mengalikan selisih Rp2.000 dengan 3 buku.",
                "2": "Hasil 3p + 2.000 mengabaikan harga 2 pensil.",
                "3": "Hasil 6p + 4.000 keliru pemodelan koefisien."
            }
        },
        {
            "id": "mat-d-7-b2-q08",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 70), konstanta pada bentuk aljabar 4a² - 9a + 15 adalah…",
            "options": ["15", "-9", "4", "a²"],
            "answer": 0,
            "why": {"0": "Konstanta adalah suku berupa bilangan murni yang tidak memuat variabel. Suku konstanta adalah +15."},
            "distractorWhy": {
                "1": "Angka -9 adalah koefisien suku a.",
                "2": "Angka 4 adalah koefisien suku a².",
                "3": "Huruf a² adalah variabel."
            }
        },
        {
            "id": "mat-d-7-b2-q09",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 86), pembagian bentuk aljabar (12x²y - 8xy²) : (4xy) menghasilkan…",
            "options": ["3x - 2y", "3x + 2y", "3x² - 2y²", "8x - 4y"],
            "answer": 0,
            "why": {"0": "Masing-masing suku dibagi 4xy: (12x²y / 4xy) - (8xy² / 4xy) = 3x - 2y."},
            "distractorWhy": {
                "1": "Hasil 3x + 2y keliru tanda operasi pengurangan.",
                "2": "Hasil 3x² - 2y² keliru tidak mengurangi pangkat variabel pembagian.",
                "3": "Hasil 8x - 4y keliru mengurangi koefisien 12 - 4 dan 8 - 4 alih-alih membagi."
            }
        },
        {
            "id": "mat-d-7-b2-q10",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 98), keliling sebuah persegi panjang dinyatakan sebagai 4x + 10 cm. Jika panjang persegi panjang tersebut adalah x + 7 cm, maka lebar persegi panjang tersebut dalam variabel x adalah…",
            "options": ["x - 2 cm", "x + 3 cm", "2x - 4 cm", "x + 2 cm"],
            "answer": 0,
            "why": {"0": "Keliling K = 2(p + l) => 4x + 10 = 2(x + 7 + l) => 2x + 5 = x + 7 + l => l = (2x + 5) - (x + 7) = x - 2 cm."},
            "distractorWhy": {
                "1": "Nilai x + 3 cm keliru pengurangan 5 - 7.",
                "2": "Nilai 2x - 4 cm keliru pembagian keliling.",
                "3": "Nilai x + 2 cm keliru tanda operasi."
            }
        },
        {
            "id": "mat-d-7-b2-q11",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 66), variabel dalam bentuk aljabar 8p - 3q + 5 adalah…",
            "options": ["p dan q", "8 dan -3", "5", "p, q, dan 5"],
            "answer": 0,
            "why": {"0": "Variabel adalah lambang pengganti suatu bilangan yang belum diketahui nilainya, dinyatakan dalam huruf (p dan q)."},
            "distractorWhy": {
                "1": "Angka 8 dan -3 adalah koefisien.",
                "2": "Angka 5 adalah konstanta.",
                "3": "Angka 5 bukan variabel."
            }
        },
        {
            "id": "mat-d-7-b2-q12",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 82), penyederhanaan bentuk aljabar 3(2x - 5) - 2(x + 4) adalah…",
            "options": ["4x - 23", "4x - 7", "4x + 23", "8x - 23"],
            "answer": 0,
            "why": {"0": "Jabarkan distributif: 6x - 15 - 2x - 8 = (6x - 2x) + (-15 - 8) = 4x - 23."},
            "distractorWhy": {
                "1": "Hasil 4x - 7 keliru menghitung -15 - 8 menjadi -7 alih-alih -23.",
                "2": "Hasil 4x + 23 keliru tanda positif negatif.",
                "3": "Hasil 8x - 23 keliru penjumlahan 6x + 2x."
            }
        }
    ]
}

with open(os.path.join(tools_dir, "chunk_mat_7_b2.json"), "w", encoding="utf-8") as f:
    json.dump(mat_b2, f, indent=2, ensure_ascii=False)

print("chunk_mat_7_b2.json created.")

# 3. BAHASA INDONESIA KELAS VII BAB 1: Jelajah Nusantara
ind_b1 = {
    "code": "KOMP-IND-D-7-BAB1-01",
    "grade": 7,
    "name": "Bab 1: Jelajah Nusantara",
    "materi": "Mengakses Informasi & Menjelajah Keindahan Alam, Memahami Gaya & Isi Teks Deskripsi, Unsur Kebahasaan: Kata Berimbuhan meN- & Majas Personifikasi",
    "cpRef": "Bahasa Indonesia untuk SMP/MTs Kelas VII (Edisi Revisi) — Bab 1",
    "items": [
        {
            "id": "ind-d-7-b1-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 6-9 Teks 'Pantan Terong yang Instagramable'), objek utama yang dideskripsikan oleh penulis dalam teks tersebut adalah…",
            "options": [
                "Keindahan pemandangan alam dari bukit Pantan Terong di Kota Takengon, Aceh",
                "Sejarah pembangunan dermaga penyeberangan di Danau Toba",
                "Fasilitas penginapan mewah dan arena bermain di Kota Banda Aceh",
                "Rute penerbangan komersial menuju Bandara Sultan Iskandar Muda"
            ],
            "answer": 0,
            "why": {"0": "Teks deskripsi 'Pantan Terong yang Instagramable' memaparkan lanskap keindahan bukit Pantan Terong yang menyuguhkan pemandangan Danau Laut Tawar di Takengon, Aceh."},
            "distractorWhy": {
                "1": "Danau Toba terletak di Sumatera Utara, bukan fokus teks Pantan Terong Aceh.",
                "2": "Teks tidak membahas arena bermain atau penginapan mewah.",
                "3": "Rute penerbangan bukan merupakan isi fisik teks deskripsi wisata alam ini."
            }
        },
        {
            "id": "ind-d-7-b1-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 12), kalimat berikut yang menggunakan majas personifikasi secara tepat adalah…",
            "options": [
                "Angin laut berbisik menyampaikan salam hangat pada dedaunan nyiur di pantai",
                "Pemandangan Gunung Leuser sangat indah bagaikan lukisan surga",
                "Suara ombak Samudra Hindia menggelegar memecah kesunyian malam",
                "Air laut di Teluk Kiluan jernih sekali seperti kaca bening"
            ],
            "answer": 0,
            "why": {"0": "Majas personifikasi memberikan sifat atau perilaku manusia (berbisik menyampaikan salam) kepada benda mati/alam (angin laut)."},
            "distractorWhy": {
                "1": "Kalimat ini menggunakan majas asosiasi/simile (menggunakan kata pembanding 'bagaikan').",
                "2": "Kalimat ini menggunakan ungkapan deskriptif pendengaran (bukan perilaku manusia).",
                "3": "Kalimat ini menggunakan pembanding 'seperti' (simile)."
            }
        },
        {
            "id": "ind-d-7-b1-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 15 Kebahasaan), penulisan kata berimbuhan meN- yang luluh secara benar sesuai kaidah EYD adalah…",
            "options": ["Memesona (meN- + pesona)", "Mempesona (meN- + pesona)", "Mengkristal (meN- + kristal)", "Mensapu (meN- + sapu)"],
            "answer": 0,
            "why": {"0": "Kaidah fonologi: Kata dasar berawalan huruf K, T, S, P yang diikuti huruf vokal akan luluh jika diberi imbuhan meN-. P pada 'pesona' luluh menjadi 'memesona'."},
            "distractorWhy": {
                "1": "Bentuk 'mempesona' tidak luluh dan melanggar kaidah KTSP.",
                "2": "Huruf K pada 'kristal' diikuti konsonan 'r', sehingga tidak luluh (mengkristal benar tapi contoh tidak luluh).",
                "3": "Bentuk 'mensapu' salah karena huruf S harus luluh menjadi 'menyapu'."
            }
        },
        {
            "id": "ind-d-7-b1-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 20-22 'Menjelajah Keindahan Riau'), tujuan utama penulisan teks deskripsi adalah…",
            "options": [
                "Menggambarkan objek secara terperinci sehingga pembaca seolah-olah dapat melihat, mendengar, atau merasakan sendiri objek tersebut",
                "Mempengaruhi pembaca agar membeli produk wisata daerah",
                "Menjelaskan langkah-langkah prosedural menuju tempat wisata",
                "Menceritakan kisah rukun kehidupan tokoh fiktif di daerah wisata"
            ],
            "answer": 0,
            "why": {"0": "Tujuan utama teks deskripsi adalah melukiskan pancaindra objek secara mendalam agar pembaca seakan mengalami langsung objek yang dideskripsikan."},
            "distractorWhy": {
                "1": "Mempengaruhi membeli produk adalah tujuan teks persuasi/iklan.",
                "2": "Menjelaskan langkah prosedural adalah fungsi teks prosedur.",
                "3": "Menceritakan kisah tokoh fiktif adalah fungsi teks cerpen/fantasi."
            }
        },
        {
            "id": "ind-d-7-b1-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 18), kata konkret yang digunakan untuk menggambarkan indra penglihatan dalam deskripsi pantai adalah…",
            "options": ["Pasir putih bersih, kebiruan air laut, dan jajaran pohon kelapa", "Deru ombak menggelegar dan hisikan angin", "Aroma khas garam laut dan wangi ikan bakar", "Tekstur pasir yang halus dan dinginnya tetesan air laut"],
            "answer": 0,
            "why": {"0": "Kata konkret penglihatan melibatkan ciri visual seperti warna (putih, kebiruan) dan bentuk fisik (jajaran pohon)."},
            "distractorWhy": {
                "1": "Deru dan hisikan melibatkan indra pendengaran.",
                "2": "Aroma melibatkan indra penciuman.",
                "3": "Tekstur halus dan dingin melibatkan indra perabaan."
            }
        },
        {
            "id": "ind-d-7-b1-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 24), penggunaan tanda koma (,) yang tepat dalam rincian unsur teks deskripsi adalah…",
            "options": [
                "Ibu membeli buah jeruk, apel, dan mangga di pasar tradisional.",
                "Ibu membeli buah jeruk apel dan mangga, di pasar tradisional.",
                "Ibu membeli buah, jeruk, apel dan mangga di pasar tradisional.",
                "Ibu membeli, buah jeruk, apel, dan mangga di pasar tradisional."
            ],
            "answer": 0,
            "why": {"0": "Tanda koma digunakan di antara unsur-unsur dalam suatu pemerincian atau pembilangan, termasuk sebelum kata hubung 'dan' di akhir rincian."},
            "distractorWhy": {
                "1": "Kurang tanda koma sebelum kata hubung 'dan'.",
                "2": "Penggunaan tanda koma sebelum keterangan tempat salah.",
                "3": "Penggunaan koma setelah kata kerja transitif 'membeli' tidak tepat."
            }
        },
        {
            "id": "ind-d-7-b1-q07",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 28 Uji Kemampuan), kutipan teks: 'Dari kejauhan, perbukitan hijau berdiri kokoh memagari lembah. Kabut tipis menyelimuti puncaknya bagaikan selendang sutra putih.' Struktur bagian teks deskripsi di atas merupakan bagian…",
            "options": ["Deskripsi bagian", "Identifikasi / Gambaran umum", "Simpulan / Kesan umum", "Judul utama"],
            "answer": 0,
            "why": {"0": "Bagian ini merinci kondisi rupa fisik perbukitan dan kabut secara mendalam (rincian pancaindra), yang merupakan ciri struktur 'Deskripsi bagian'."},
            "distractorWhy": {
                "1": "Identifikasi memuat penetapan nama objek, lokasi, dan pernyataan umum awal.",
                "2": "Simpulan berisi ringkasan atau kesan pribadi penulis di akhir teks.",
                "3": "Judul utama berada di kepala teks."
            }
        },
        {
            "id": "ind-d-7-b1-q08",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 14), imbuhan meN- yang bergabung dengan kata dasar 'tulis' membentuk kata…",
            "options": ["Menulis", "Mentulis", "Memtulis", "Mengtulis"],
            "answer": 0,
            "why": {"0": "Kata dasar berawalan huruf 't' (tulis) akan luluh menjadi 'n' saat diberi imbuhan meN-, menghasilkan kata 'menulis'."},
            "distractorWhy": {
                "1": "Bentuk 'mentulis' tidak mengalami peluluhan huruf 't'.",
                "2": "Bentuk 'memtulis' salah penggabungan alomor.",
                "3": "Bentuk 'mengtulis' salah alomor."
            }
        },
        {
            "id": "ind-d-7-b1-q09",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 10), kalimat deskripsi yang melibatkan citraan indra pendengaran adalah…",
            "options": [
                "Gemericik air sungai terdengar jernih menenangkan jiwa di pagi hari",
                "Warna merah menyala bunga mawar menghiasi sudut taman",
                "Bau harum aroma kopi menyengat di sepanjang lorong pasar",
                "Permukaan daun keladi itu sangat licin dan halus saat diusap"
            ],
            "answer": 0,
            "why": {"0": "Kata 'gemericik' dan 'terdengar' menstimulasi indra pendengaran (auditori)."},
            "distractorWhy": {
                "1": "Warna merah menyala menstimulasi penglihatan.",
                "2": "Bau harum menyengat menstimulasi penciuman.",
                "3": "Licin dan halus menstimulasi perabaan."
            }
        },
        {
            "id": "ind-d-7-b1-q10",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 32), kata emotif yang digunakan untuk memperkuat kesan keindahan dalam deskripsi pantai adalah…",
            "options": ["Memukau, menakjubkan, dan memesona", "Besar, tinggi, dan panjang", "Berjalan, berlari, dan melompat", "Satu, dua, dan tiga"],
            "answer": 0,
            "why": {"0": "Kata emotif adalah kata-kata yang memicu emosi atau rasa kagum pembaca, seperti 'memukau', 'menakjubkan', dan 'memesona'."},
            "distractorWhy": {
                "1": "Kata besar, tinggi, dan panjang adalah kata ukuran objektif.",
                "2": "Kata berjalan, berlari, melompat adalah kata kerja aksi.",
                "3": "Kata satu, dua, tiga adalah kata bilangan."
            }
        },
        {
            "id": "ind-d-7-b1-q11",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 16), kata sinonim dari kata 'elok' dalam kalimat 'Pemandangan laut di sore hari sangat elok' adalah…",
            "options": ["Indah / Cantik", "Buruk / Jelek", "Gelap / Suram", "Biasa / Standar"],
            "answer": 0,
            "why": {"0": "Kata 'elok' bermakna indah, cantik, atau bagus dipandang."},
            "distractorWhy": {
                "1": "Buruk/jelek adalah antonim (lawan kata).",
                "2": "Gelap/suram tidak sesuai makna.",
                "3": "Biasa/standar tidak memiliki kadar estetika kata elok."
            }
        },
        {
            "id": "ind-d-7-b1-q12",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 30), penggunaan kata depan 'di' yang benar sebagai penunjuk lokasi/tempat adalah…",
            "options": ["di Takengon", "ditakengon", "di makan", "di baca"],
            "answer": 0,
            "why": {"0": "Kata depan 'di' yang menunjukkan tempat ditulis terpisah dari kata yang mengikutinya (di Takengon)."},
            "distractorWhy": {
                "1": "Bentuk 'ditakengon' salah karena disambung.",
                "2": "Bentuk 'di makan' salah karena di- pada kata kerja harus disambung (dimakan).",
                "3": "Bentuk 'di baca' salah karena di- awalan pasif harus disambung (dibaca)."
            }
        }
    ]
}

with open(os.path.join(tools_dir, "chunk_ind_7_b1.json"), "w", encoding="utf-8") as f:
    json.dump(ind_b1, f, indent=2, ensure_ascii=False)

print("chunk_ind_7_b1.json created.")

# 4. BAHASA INGGRIS KELAS VII CHAPTER 1: About Me
eng_c1 = {
    "code": "KOMP-ENG-D-7-BAB1-01",
    "grade": 7,
    "name": "Chapter 1: About Me",
    "materi": "Introducing Oneself and Others, Expressing Hobbies and Preferences, Describing People Physical Traits, Subject & Possessive Pronouns",
    "cpRef": "English for Nusantara SMP/MTs Kelas VII — Chapter 1",
    "items": [
        {
            "id": "eng-d-7-c1-q01",
            "difficulty": "dasar",
            "prompt": "Based on English for Nusantara Grade VII (page 15-18 'Galang from Kalimantan'), Galang introduces himself: 'Hello, my name is Galang. I am 13 years old. I live in Kalimantan.' What expression is used by Galang to state his age?",
            "options": ["'I am 13 years old.'", "'My name is Galang.'", "'I live in Kalimantan.'", "'I like playing basketball.'"],
            "answer": 0,
            "why": {"0": "The phrase 'I am 13 years old' is the standard self-introduction expression used to state one's age."},
            "distractorWhy": {
                "1": "'My name is Galang' states his identity name.",
                "2": "'I live in Kalimantan' states his origin/residence.",
                "3": "'I like playing basketball' states his hobby."
            }
        },
        {
            "id": "eng-d-7-c1-q02",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VII (page 22 Language Focus), choose the correct subject pronoun to complete the sentence: 'Monita loves reading novels. ___ goes to the library every Wednesday.'",
            "options": ["She", "He", "They", "It"],
            "answer": 0,
            "why": {"0": "Monita is a female singular proper noun, so the appropriate subject pronoun is 'She'."},
            "distractorWhy": {
                "1": "'He' is used for male singular subjects.",
                "2": "'They' is used for plural subjects.",
                "3": "'It' is used for non-human objects or animals."
            }
        },
        {
            "id": "eng-d-7-c1-q03",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VII (page 28 Unit 2 'I Love Fishing'), Andre says: 'I like fishing because it is relaxing.' What is Andre's favorite hobby?",
            "options": ["Fishing", "Swimming", "Playing football", "Cycling"],
            "answer": 0,
            "why": {"0": "The text directly states Andre's preference: 'I like fishing'."},
            "distractorWhy": {
                "1": "Swimming is not mentioned as Andre's main hobby.",
                "2": "Football is Galang's hobby in Unit 1.",
                "3": "Cycling is not specified in Andre's text."
            }
        },
        {
            "id": "eng-d-7-c1-q04",
            "difficulty": "tinggi",
            "prompt": "Based on English for Nusantara Grade VII (page 35 Language Focus - Possessive Adjectives), complete the dialogue correctly:\nMade: 'Is this ___ bicycle, Galang?'\nGalang: 'Yes, it is my bicycle.'",
            "options": ["your", "his", "her", "their"],
            "answer": 0,
            "why": {"0": "Made is directly addressing Galang (second person 'you'), so the possessive adjective is 'your'."},
            "distractorWhy": {
                "1": "'his' refers to a third-person male.",
                "2": "'her' refers to a third-person female.",
                "3": "'their' refers to third-person plural."
            }
        },
        {
            "id": "eng-d-7-c1-q05",
            "difficulty": "dasar",
            "prompt": "Based on English for Nusantara Grade VII (page 38 Unit 3 'My Friends and I'), which adjective best describes someone who wears glasses and has curly hair?",
            "options": ["'He wears glasses and has short curly hair.'", "'He is tall with blue eyes.'", "'He has long straight blonde hair.'", "'He is short with no hair.'"],
            "answer": 0,
            "why": {"0": "The sentence 'He wears glasses and has short curly hair' accurately describes physical features of hair type and eyewear."},
            "distractorWhy": {
                "1": "Does not mention glasses or hair texture.",
                "2": "Contradicts 'curly' with 'straight'.",
                "3": "Contradicts having hair."
            }
        },
        {
            "id": "eng-d-7-c1-q06",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VII (page 42 Unit 1 Review), what is the appropriate greeting when meeting someone for the first time in a formal setting?",
            "options": ["'Nice to meet you.'", "'See you later!'", "'Good night, sleep well.'", "'What's up, dude?'"],
            "answer": 0,
            "why": {"0": "'Nice to meet you' is the standard polite expression when introduced to someone for the first time."},
            "distractorWhy": {
                "1": "'See you later' is a leave-taking expression.",
                "2": "'Good night' is a bedtime leave-taking expression.",
                "3": "'What's up, dude?' is informal slang."
            }
        },
        {
            "id": "eng-d-7-c1-q07",
            "difficulty": "tinggi",
            "prompt": "Based on English for Nusantara Grade VII (page 45), fill in the correct form of verb 'to be': 'Galang and his classmates ___ excited about the school scout camp.'",
            "options": ["are", "is", "am", "was"],
            "answer": 0,
            "why": {"0": "'Galang and his classmates' form a plural subject in simple present tense, requiring the plural verb 'are'."},
            "distractorWhy": {
                "1": "'is' is only used for singular subjects (he/she/it).",
                "2": "'am' is only used with first person 'I'.",
                "3": "'was' is past tense."
            }
        },
        {
            "id": "eng-d-7-c1-q08",
            "difficulty": "dasar",
            "prompt": "Based on English for Nusantara Grade VII (page 12), what question should you ask to find out someone's origin or hometown?",
            "options": ["'Where are you from?'", "'What is your favorite color?'", "'How old are you?'", "'What is your hobby?'"],
            "answer": 0,
            "why": {"0": "'Where are you from?' is the standard question used to inquire about origin or home town."},
            "distractorWhy": {
                "1": "Asks about color preference.",
                "2": "Asks about age.",
                "3": "Asks about activities/hobbies."
            }
        },
        {
            "id": "eng-d-7-c1-q09",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VII (page 30), complete the sentence with correct possessive pronoun: 'I have a new cat. ___ fur is white and soft.'",
            "options": ["Its", "It's", "His", "Their"],
            "answer": 0,
            "why": {"0": "'Its' (without apostrophe) is the possessive adjective for animals or non-human entities."},
            "distractorWhy": {
                "1": "'It's' is a contraction of 'It is' or 'It has'.",
                "2": "'His' is for human males.",
                "3": "'Their' is for plural entities."
            }
        },
        {
            "id": "eng-d-7-c1-q10",
            "difficulty": "tinggi",
            "prompt": "Based on English for Nusantara Grade VII (page 48), read the short text: 'Pipit likes drawing comic characters. She draws every afternoon after finishing her homework.' What can be inferred about Pipit?",
            "options": ["Pipit is a disciplined student who manages her time well before pursuing her hobby", "Pipit neglects her school homework to draw comics", "Pipit does not enjoy drawing comics", "Pipit draws comics at school during class hours"],
            "answer": 0,
            "why": {"0": "The phrase 'after finishing her homework' indicates she prioritizes school work before drawing, showing discipline."},
            "distractorWhy": {
                "1": "Contradicts the text which says she finishes homework first.",
                "2": "Contradicts 'likes drawing comic characters'.",
                "3": "Text specifies 'every afternoon', not during school hours."
            }
        },
        {
            "id": "eng-d-7-c1-q11",
            "difficulty": "dasar",
            "prompt": "Based on English for Nusantara Grade VII (page 18), what is the opposite of the physical trait adjective 'tall'?",
            "options": ["Short", "Fat", "Slim", "Young"],
            "answer": 0,
            "why": {"0": "The antonym of 'tall' (tinggi) in physical descriptions is 'short' (pendek)."},
            "distractorWhy": {
                "1": "'Fat' is the opposite of 'thin/slim'.",
                "2": "'Slim' is the opposite of 'chubby/fat'.",
                "3": "'Young' is the opposite of 'old'."
            }
        },
        {
            "id": "eng-d-7-c1-q12",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VII (page 32), complete the expression of leave-taking: 'Good bye, Sinta! ___'",
            "options": ["'See you tomorrow!'", "'I am fine, thank you.'", "'My name is Sinta.'", "'Nice to meet you.'"],
            "answer": 0,
            "why": {"0": "'See you tomorrow!' is a standard leave-taking response that pairs naturally with 'Good bye'."},
            "distractorWhy": {
                "1": "'I am fine' responds to 'How are you?'.",
                "2": "'My name is' is for introduction.",
                "3": "'Nice to meet you' is used upon initial greeting."
            }
        }
    ]
}

with open(os.path.join(tools_dir, "chunk_eng_7_c1.json"), "w", encoding="utf-8") as f:
    json.dump(eng_c1, f, indent=2, ensure_ascii=False)

print("chunk_eng_7_c1.json created.")

# 5. IPS KELAS VII TEMA 01: Keberadaan Diri dan Keluarga
ips_t1 = {
    "code": "KOMP-IPS-D-7-BAB1-01",
    "grade": 7,
    "name": "Tema 01: Keberadaan Diri dan Keluarga",
    "materi": "Mengenal Sejarah Keluarga & Silsilah, Pemahaman Lokasi pada Peta & Komponen Peta, Interaksi Sosial & Agen Sosialisasi, Pemenuhan Kebutuhan Manusia",
    "cpRef": "Ilmu Pengetahuan Sosial untuk SMP/MTs Kelas VII (Edisi Revisi) — Tema 01",
    "items": [
        {
            "id": "ips-d-7-t1-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 8-12), silsilah keluarga sangat penting dipelajari oleh setiap individu karena bertujuan untuk…",
            "options": [
                "Mengetahui asal-usul leluhur, silsilah keturunan, serta tradisi dan nilai yang diwariskan dalam keluarga",
                "Menghitung jumlah harta kekayaan yang dimiliki oleh kerabat keluarga",
                "Membandingkan status sosial keluarga sendiri dengan keluarga tetangga",
                "Determinisasi pekerjaan formal yang wajib dipilih oleh generasi muda"
            ],
            "answer": 0,
            "why": {"0": "Silsilah keluarga membantu individu memahami identitas historis, silsilah keturunan, dan jati diri nilai-nilai leluhur."},
            "distractorWhy": {
                "1": "Menghitung kekayaan bukan tujuan ilmiah silsilah keluarga.",
                "2": "Membandingkan status sosial bertentangan dengan nilai sosialisasi positif.",
                "3": "Pekerjaan formal adalah pilihan bebas individu dewasa."
            }
        },
        {
            "id": "ips-d-7-t1-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 15-18 Pemahaman Lokasi pada Peta), letak astronomis Indonesia berada pada 6° LU - 11° LS dan 95° BT - 141° BT. Pernyataan letak tersebut merupakan contoh dari…",
            "options": ["Lokasi absolut (mutlak)", "Lokasi relatif", "Lokasi geografis strategis", "Lokasi geologis"],
            "answer": 0,
            "why": {"0": "Lokasi absolut adalah letak suatu tempat berdasarkan garis lintang dan garis bujur pada peta/globe yang sifatnya tetap."},
            "distractorWhy": {
                "1": "Lokasi relatif bergantung pada tempat sekitar (misal Indonesia terletak di antara 2 benua).",
                "2": "Lokasi strategis adalah dampak ekonomi geografi.",
                "3": "Lokasi geologis berhubungan dengan lempeng tektonik."
            }
        },
        {
            "id": "ips-d-7-t1-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 24 Komponen Peta), jika skala pada sebuah peta adalah 1 : 500.000, artinya…",
            "options": [
                "1 cm pada peta mewakili 500.000 cm (atau 5 km) jarak sebenarnya di lapangan",
                "1 km pada peta mewakili 500.000 cm di lapangan",
                "500.000 cm pada peta sama dengan 1 meter di lapangan",
                "Skala tersebut merupakan skala grafik bukan skala angka"
            ],
            "answer": 0,
            "why": {"0": "Skala angka 1 : 500.000 berarti 1 unit panjang di peta setara dengan 500.000 unit panjang sama (500.000 cm = 5 km) di permukaan bumi."},
            "distractorWhy": {
                "1": "Satuan standar pembanding peta adalah sentimeter.",
                "2": "Pembacaan terbalik.",
                "3": "Format angka rasio adalah contoh skala angka (numerik)."
            }
        },
        {
            "id": "ips-d-7-t1-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 32-35 Agen Sosialisasi), lembaga pertama dan utama yang berperan dalam membentuk kepribadian, nilai moral, dan norma dasar seorang anak adalah…",
            "options": ["Keluarga", "Sekolah", "Kelompok bermain (peer group)", "Media massa"],
            "answer": 0,
            "why": {"0": "Keluarga merupakan agen sosialisasi primer pertama tempat anak belajar nilai interaksi, afeksi, dan moralitas dasar."},
            "distractorWhy": {
                "1": "Sekolah adalah agen sosialisasi sekunder.",
                "2": "Kelompok bermain merupakan agen pergaulan sebaya.",
                "3": "Media massa adalah agen sosialisasi sekunder modern."
            }
        },
        {
            "id": "ips-d-7-t1-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 42 Kebutuhan Manusia), kebutuhan dasar yang harus dipenuhi manusia untuk mempertahankan kelangsungan hidupnya (seperti makanan, pakaian, dan tempat tinggal) disebut…",
            "options": ["Kebutuhan primer", "Kebutuhan sekunder", "Kebutuhan tersier", "Kebutuhan jasmani mutlak"],
            "answer": 0,
            "why": {"0": "Kebutuhan primer (pangan, sandang, papan) adalah kebutuhan pokok utama manusia untuk bertahan hidup."},
            "distractorWhy": {
                "1": "Kebutuhan sekunder dipenuhi setelah primer (misal elektronik, transportasi).",
                "2": "Kebutuhan tersier adalah kebutuhan barang mewah.",
                "3": "Jasmani mutlak bukan istilah baku klasifikasi ekonomi."
            }
        },
        {
            "id": "ips-d-7-t1-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 48 Interaksi Sosial), syarat utama terjadinya interaksi sosial antara dua individu atau kelompok adalah adanya…",
            "options": ["Kontak sosial dan komunikasi", "Uang dan barang dagangan", "Persamaan latar belakang suku", "Kekuasaan politik yang seimbang"],
            "answer": 0,
            "why": {"0": "Interaksi sosial mensyaratkan dua hal mutlak: terjadinya kontak sosial (langsung/tidak langsung) dan komunikasi (penyampaian pesan)."},
            "distractorWhy": {
                "1": "Uang adalah alat transaksi ekonomi, bukan syarat umum interaksi sosial.",
                "2": "Persamaan suku bukan syarat interaksi.",
                "3": "Kekuasaan politik tidak mutlak."
            }
        },
        {
            "id": "ips-d-7-t1-q07",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 56 Lembar Aktivitas 8), faktor utama yang menyebabkan perbedaan kebutuhan antara satu individu dengan individu lainnya adalah…",
            "options": [
                "Tingkat pendapatan, lingkungan tempat tinggal, tingkat pendidikan, dan status sosial",
                "Warna kulit dan jenis rambut keturunan",
                "Jumlah anggota keluarga kerabat jauh",
                "Jarak geografis menuju ibu kota negara"
            ],
            "answer": 0,
            "why": {"0": "Kebutuhan manusia bervariasi dipengaruhi oleh kondisi ekonomi (pendapatan), geografis lingkungan, pendidikan, dan peran sosial."},
            "distractorWhy": {
                "1": "Ciri fisik rasial tidak menentukan ragam kebutuhan hidup.",
                "2": "Jumlah kerabat jauh tidak berdampak langsung.",
                "3": "Jarak ke ibu kota bukan faktor penentu utama."
            }
        },
        {
            "id": "ips-d-7-t1-q08",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 20), garis khayal pada peta yang membujur dari Kutub Utara ke Kutub Selatan dinamakan…",
            "options": ["Garis bujur (meridian)", "Garis lintang (paralel)", "Garis khatulistiwa (ekuador)", "Garis kontur"],
            "answer": 0,
            "why": {"0": "Garis bujur (meridian) menghubungkan Kutub Utara dan Kutub Selatan, berfungsi menentukan zona waktu."},
            "distractorWhy": {
                "1": "Garis lintang sejajar dengan ekuador (barat ke timur).",
                "2": "Khatulistiwa adalah garis lintang 0°.",
                "3": "Garis kontur menghubungkan ketinggian sama."
            }
        },
        {
            "id": "ips-d-7-t1-q09",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 38), proses sosial asosiatif yang ditandai dengan usaha bersama antara individu atau kelompok untuk mencapai tujuan bersama dinamakan…",
            "options": ["Kerja sama (cooperation)", "Persaingan (competition)", "Pertentangan (conflict)", "Akomodasi paksaan"],
            "answer": 0,
            "why": {"0": "Kerja sama adalah bentuk interaksi sosial asosiatif di mana pihak-pihak bersatu padu mencapai tujuan bersama."},
            "distractorWhy": {
                "1": "Persaingan adalah bentuk disosiatif.",
                "2": "Pertentangan/konflik adalah bentuk disosiatif.",
                "3": "Akomodasi paksaan (coercion) menggunakan tekanan."
            }
        },
        {
            "id": "ips-d-7-t1-q10",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 62 Evaluasi Tema 01), barang yang jumlahnya terbatas sehingga untuk mendapatkannya memerlukan pengorbanan sumber daya dinamakan…",
            "options": ["Barang ekonomi", "Barang bebas", "Barang ilith", "Barang komplementer"],
            "answer": 0,
            "why": {"0": "Barang ekonomi adalah barang yang memerlukan pengorbanan materi/tenaga untuk diperoleh karena jumlahnya terbatas dibanding kebutuhan."},
            "distractorWhy": {
                "1": "Barang bebas melimpah di alam tanpa pengorbanan (misal udara segar).",
                "2": "Barang ilith berlebihan hingga merugikan (misal air banjir).",
                "3": "Barang komplementer adalah barang pelengkap."
            }
        },
        {
            "id": "ips-d-7-t1-q11",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 26), legenda pada peta berfungsi untuk…",
            "options": [
                "Menjelaskan arti simbol-simbol yang digunakan di dalam peta",
                "Menunjukkan arah mata angin pada peta",
                "Menjelaskan pembuat peta dan tahun penerbitan",
                "Menghitung perbandingan jarak pada peta dengan jarak asli"
            ],
            "answer": 0,
            "why": {"0": "Legenda memuat keterangan semua simbol (jalan, sungai, kota, batas) agar peta mudah dibaca."},
            "distractorWhy": {
                "1": "Menunjukkan arah adalah fungsi orientasi peta.",
                "2": "Pembuat dan tahun adalah inset/sumber peta.",
                "3": "Menghitung perbandingan adalah fungsi skala peta."
            }
        },
        {
            "id": "ips-d-7-t1-q12",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 50), norma sosial yang memiliki sanksi paling tegas berupa hukuman pidana atau denda resmi dari negara adalah…",
            "options": ["Norma hukum", "Norma kesopanan", "Norma kesusilaan", "Norma adat/kebiasaan"],
            "answer": 0,
            "why": {"0": "Norma hukum dibuat oleh lembaga resmi negara (pemerintah/DPR) dan dilengkapi sanksi tegas (penjara/denda)."},
            "distractorWhy": {
                "1": "Sanksi norma kesopanan berupa celaan/pengucilan sosial.",
                "2": "Sanksi norma kesusilaan berupa rasa penyesalan/bersalah.",
                "3": "Sanksi norma adat berupa sanksi adat masyarakat lokal."
            }
        }
    ]
}

with open(os.path.join(tools_dir, "chunk_ips_7_t1.json"), "w", encoding="utf-8") as f:
    json.dump(ips_t1, f, indent=2, ensure_ascii=False)

print("chunk_ips_7_t1.json created.")

# 6. IPA KELAS VIII BAB 1: Pengenalan Sel
ipa8_b1 = {
    "code": "KOMP-IPA-D-8-BAB1-01",
    "grade": 8,
    "name": "Pengenalan Sel",
    "materi": "Struktur & Fungsi Organel Sel, Perbedaan Sel Tumbuhan & Sel Hewan, Spesialisasi Sel & Penggunaan Mikroskop",
    "cpRef": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VIII (Edisi Revisi) — Bab 1",
    "items": [
        {
            "id": "ipa-d-8-b1-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 6-10), organel sel yang berfungsi sebagai pusat pengendali seluruh aktivitas sel serta menyimpan informasi genetik (DNA) adalah…",
            "options": ["Nukleus (inti sel)", "Mitokondria", "Ribosom", "Lisosom"],
            "answer": 0,
            "why": {"0": "Nukleus (inti sel) mengandungi materi genetik (DNA/kromosom) dan mengatur sintesis protein serta pembelahan sel."},
            "distractorWhy": {
                "1": "Mitokondria adalah tempat pembentukan energi (respirasi sel).",
                "2": "Ribosom adalah tempat sintesis protein.",
                "3": "Lisosom berisi enzim pencernaan intraseluler."
            }
        },
        {
            "id": "ipa-d-8-b1-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 14-16 Perbedaan Sel Tumbuhan dan Sel Hewan), organel sel berikut yang HANYA ditemukan pada sel tumbuhan dan TIDAK ada pada sel hewan adalah…",
            "options": ["Dinding sel dan kloroplas", "Mitokondria dan membran sel", "Nukleus dan sitoplasma", "Ribosom dan retikulum endoplasma"],
            "answer": 0,
            "why": {"0": "Sel tumbuhan memiliki dinding sel kaku (selulosa) dan kloroplas (fotosintesis) yang tidak dimiliki sel hewan."},
            "distractorWhy": {
                "1": "Mitokondria dan membran sel ada pada sel tumbuhan dan sel hewan.",
                "2": "Nukleus dan sitoplasma dimiliki oleh kedua jenis sel eukariotik.",
                "3": "Ribosom dan RE ada pada sel hewan dan tumbuhan."
            }
        },
        {
            "id": "ipa-d-8-b1-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 18 Spesialisasi Sel), sel tumbuhan yang terspesialisasi memiliki rambut-rambut halus untuk memperluas bidang penyerapan air dan garam mineral dari tanah adalah…",
            "options": ["Sel akar rambut (epidermis akar)", "Sel stomata daun", "Sel xilem pembuluh kayu", "Sel floem pembuluh tapis"],
            "answer": 0,
            "why": {"0": "Sel rambut akar merupakan modifikasi epidermis akar yang berfungsi meningkatkan luas permukaan absorpsi air tanah."},
            "distractorWhy": {
                "1": "Stomata berfungsi untuk pertukaran gas O₂/CO₂ dan transpirasi.",
                "2": "Xilem mengangkut air dari akar ke daun.",
                "3": "Floem mengangkut hasil fotosintesis dari daun ke seluruh tubuh."
            }
        },
        {
            "id": "ipa-d-8-b1-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 22 Mikroskop), saat mengamati preparat sel gabus menggunakan mikroskop cahaya, jika objek terlihat buram dan kurang jelas, bagian mikroskop yang harus diputar untuk memperjelas fokus bayangan secara halus adalah…",
            "options": ["Mikrometer (pemutar halus)", "Makrometer (pemutar kasar)", "Revolver pemutar lensa", "Diafragma pengatur cahaya"],
            "answer": 0,
            "why": {"0": "Mikrometer (pemutar halus) digunakan untuk menajamkan fokus bayangan objek preparat secara presisi."},
            "distractorWhy": {
                "1": "Makrometer digunakan untuk menaik-turunkan tabung/meja secara cepat untuk mencari fokus awal.",
                "2": "Revolver untuk mengganti perbesaran lensa objektif.",
                "3": "Diafragma untuk mengatur intensitas cahaya yang masuk."
            }
        },
        {
            "id": "ipa-d-8-b1-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 8), organel sel yang dikenal sebagai 'pabrik energi' tempat berlangsungnya respirasi seluler untuk menghasilkan ATP adalah…",
            "options": ["Mitokondria", "Badan Golgi", "Vakuola", "Peroksisom"],
            "answer": 0,
            "why": {"0": "Mitokondria mengoksidasi glukosa menjadi energi kimia dalam bentuk ATP melalui proses respirasi sel."},
            "distractorWhy": {
                "1": "Badan Golgi memodifikasi dan mengemas protein/lipid.",
                "2": "Vakuola menyimpan cadangan makanan dan zat sisa.",
                "3": "Peroksisom menetralkan racun hidrogen peroksida."
            }
        },
        {
            "id": "ipa-d-8-b1-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 25 Spesialisasi Sel Hewan), sel darah merah (eritrosit) manusia memiliki bentuk bikonkaf dan tidak memiliki inti sel saat dewasa. Adaptasi struktur ini bertujuan untuk…",
            "options": [
                "Memaksimalkan ruang untuk mengikat molekul hemoglobin dan mengangkut oksigen secara efisien",
                "Memudahkan sel bergerak aktif memakan bakteri patogen",
                "Mempercepat pembekuan darah saat terjadi luka",
                "Menghasilkan antibodi kekebalan tubuh"
            ],
            "answer": 0,
            "why": {"0": "Hilangnya inti sel memberi ruang maksimum bagi hemoglobin untuk mengikat O₂ dari paru-paru ke jaringan tubuh."},
            "distractorWhy": {
                "1": "Memakan bakteri adalah fungsi sel darah putih (leukosit fagosit).",
                "2": "Pembekuan darah dilakukan oleh keping darah (trombosit).",
                "3": "Antibodi dihasilkan oleh limfosit B (sel darah putih)."
            }
        },
        {
            "id": "ipa-d-8-b1-q07",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 28 Uji Kemampuan Bab 1), urutan tingkat organisasi kehidupan dari yang terkecil hingga terbesar adalah…",
            "options": ["Sel -> Jaringan -> Organ -> Sistem Organ -> Organisme", "Organisme -> Sistem Organ -> Organ -> Jaringan -> Sel", "Jaringan -> Sel -> Organ -> Organisme -> Sistem Organ", "Sel -> Organ -> Jaringan -> Organisme -> Sistem Organ"],
            "answer": 0,
            "why": {"0": "Tingkat hirarki biologis diawali dari unit terkecil sel, kumpulan sel sejenis membentuk jaringan, jaringan membentuk organ, organ menyusun sistem organ, dan seluruh sistem membentuk organisme."},
            "distractorWhy": {
                "1": "Urutan terbalik dari terbesar ke terkecil.",
                "2": "Jaringan berada di atas sel.",
                "3": "Organ berada setelah jaringan."
            }
        },
        {
            "id": "ipa-d-8-b1-q08",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 12), cairan sel yang mengisi ruangan di antara membran sel dan inti sel tempat organel-organel berada dinamakan…",
            "options": ["Sitoplasma", "Nukleoplasma", "Cairan selulosa", "Serum biologis"],
            "answer": 0,
            "why": {"0": "Sitoplasma adalah matriks koloid berisi air, garam, dan molekul organik yang menjadi tempat organel melayang."},
            "distractorWhy": {
                "1": "Nukleoplasma adalah cairan khusus di dalam inti sel (nukleus).",
                "2": "Selulosa adalah penyusun dinding sel tumbuhan.",
                "3": "Serum adalah bagian cairan darah tanpa fibrinogen."
            }
        },
        {
            "id": "ipa-d-8-b1-q09",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 20), perbesaran total sebuah mikroskop jika lensa okuler memiliki perbesaran 10x dan lensa objektif yang digunakan memiliki perbesaran 40x adalah…",
            "options": ["400x", "50x", "30x", "4000x"],
            "answer": 0,
            "why": {"0": "Perbesaran total mikroskop = perbesaran okuler × perbesaran objektif = 10 × 40 = 400x."},
            "distractorWhy": {
                "1": "Nilai 50x terjadi karena salah mengoperasikan penjumlahan 10 + 40.",
                "2": "Nilai 30x terjadi karena pengurangan 40 - 10.",
                "3": "Nilai 4000x salah perkalian."
            }
        },
        {
            "id": "ipa-d-8-b1-q10",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 30 Bab 1), proses masuknya molekul air dari daerah konsentrasi air tinggi (hipotonis) ke konsentrasi air rendah (hipertonis) melalui membran semipermeabel dinamakan…",
            "options": ["Osmosis", "Difusi terfasilitasi", "Endositosis", "Transpor aktif eksositosis"],
            "answer": 0,
            "why": {"0": "Osmosis adalah pergerakan khusus molekul pelarut (air) melintasi membran selektif permeabel mengikuti gradien konsentrasi."},
            "distractorWhy": {
                "1": "Difusi terfasilitasi melibatkan molekul terlarut dengan bantuan protein pembawa.",
                "2": "Endositosis adalah pembungkusan partikel besar oleh membran.",
                "3": "Transpor aktif membutuhkan energi ATP."
            }
        },
        {
            "id": "ipa-d-8-b1-q11",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 15), zat warna hijau (pigmen) yang terdapat di dalam kloroplas dan berperan menyerap energi cahaya matahari saat fotosintesis adalah…",
            "options": ["Klorofil", "Karotenoid", "Antosianin", "Fukosantin"],
            "answer": 0,
            "why": {"0": "Klorofil adalah pigmen hijau utama pada sel tumbuhan untuk mengabsorpsi spektrum cahaya matahari."},
            "distractorWhy": {
                "1": "Karotenoid adalah pigmen oranye/kuning.",
                "2": "Antosianin adalah pigmen merah/ungu.",
                "3": "Fukosantin adalah pigmen cokelat pada alga."
            }
        },
        {
            "id": "ipa-d-8-b1-q12",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 26), vakuola pada sel tumbuhan berukuran besar (vakuola sentral) yang berfungsi utama untuk…",
            "options": [
                "Menyimpan air, cadangan makanan, pigmen, dan menjaga tekanan turgor sel",
                "Menghasilkan energi listrik kimia sel",
                "Mencerna kuman patogen yang masuk ke dalam sel",
                "Membentuk serabut benang spindel saat pembelahan"
            ],
            "answer": 0,
            "why": {"0": "Vakuola sentral tumbuhan berfungsi menampung cairan sel, metabolit sekunder, dan mempertahankan ketegaran (turgiditas) sel."},
            "distractorWhy": {
                "1": "Fungsi mitokondria.",
                "2": "Fungsi lisosom.",
                "3": "Fungsi sentriol."
            }
        }
    ]
}

with open(os.path.join(tools_dir, "chunk_ipa_8_b1.json"), "w", encoding="utf-8") as f:
    json.dump(ipa8_b1, f, indent=2, ensure_ascii=False)

print("chunk_ipa_8_b1.json created.")

print("All master core chunk files written successfully!")
