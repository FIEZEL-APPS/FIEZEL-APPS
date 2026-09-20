import json

data = {
  "code": "KOMP-IND-D-7-BAB1-01",
  "grade": 7,
  "name": "Bab 1: Jelajah Nusantara",
  "materi": "Mengakses Informasi & Menjelajah Keindahan Alam, Memahami Gaya & Isi Teks Deskripsi, Unsur Kebahasaan: Kata Berimbuhan meN- & Majas Personifikasi",
  "cpRef": "Bahasa Indonesia untuk SMP/MTs Kelas VII (Edisi Revisi) — Bab 1",
  "items": [
    {
      "id": "ind-d-7-b1-q01",
      "difficulty": "dasar",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 4, dalam teks 'Pantan Terong yang Instagramable', objek wisata Pantan Terong terletak di kota...",
      "options": ["Takengon", "Banda Aceh", "Lampung", "Pangandaran"],
      "answer": 0,
      "why": {"0": "Teks deskripsi 'Pantan Terong yang Instagramable' secara eksplisit menyebutkan bahwa Pantan Terong merupakan nama tempat wisata populer yang berada di Kota Takengon, Aceh."},
      "distractorWhy": {
        "1": "Banda Aceh merupakan kota asal keberangkatan rombongan Rafa pada pukul 01.00 siang, bukan lokasi dari objek wisata Pantan Terong.",
        "2": "Lampung merupakan lokasi objek wisata kuliner Gang PU yang dibahas dalam teks deskripsi lain berjudul 'Jelajah Rasa di Lampung'.",
        "3": "Pangandaran merupakan lokasi destinasi wisata Green Canyon dan Sungai Santirah yang dibahas pada bab mengenai pamflet wisata."
      }
    },
    {
      "id": "ind-d-7-b1-q02",
      "difficulty": "dasar",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 5, berapakah ketinggian bukit Pantan Terong di atas permukaan laut?",
      "options": ["1.830 meter dpl", "2.662 meter dpl", "1.500 meter dpl", "3.000 meter dpl"],
      "answer": 0,
      "why": {"0": "Pada teks halaman 5 disebutkan secara rinci bahwa pemandangan cantik di Pantan Terong dinikmati dari ketinggian 1.830 meter di atas permukaan laut."},
      "distractorWhy": {
        "1": "Ketinggian 2.662 mdpl merupakan ketinggian Gunung Papandayan sebagaimana tercantum dalam pamflet wisata Papandayan di halaman 16.",
        "2": "Ketinggian 1.500 meter dpl bukan angka ketinggian yang tercantum dalam teks deskripsi Pantan Terong maupun Gunung Papandayan.",
        "3": "Angka 3.000 merupakan rata-rata curah hujan (mm/tahun) Gunung Papandayan, bukan ukuran ketinggian Pantan Terong di atas permukaan laut."
      }
    },
    {
      "id": "ind-d-7-b1-q03",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 5-6, manakah yang merupakan kalimat perincian untuk menggambarkan keindahan pemandangan alam dari atas Pantan Terong?",
      "options": [
        "Dari ketinggian, terlihat warna langit yang jingga terkena semburat sinar matahari di balik deretan gunung-gunung yang kokoh.",
        "Sebelum pulang, ibuku membeli suvenir yang berbentuk kopi gayo untuk membantu perajin lokal.",
        "Kami berangkat dari Banda Aceh pukul 01.00 siang dan tiba pukul 08.00 malam di rumah Paman.",
        "Jalanan kecil menuju puncak sangat menanjak dan curam dengan tikungan-tikungan yang tajam."
      ],
      "answer": 0,
      "why": {"0": "Kalimat tersebut merinci secara spesifik gambaran visual pemandangan alam (warna langit jingga, semburat matahari, deretan gunung kokoh) yang melibatkan pancaindra penglihatan."},
      "distractorWhy": {
        "1": "Kalimat tentang membeli suvenir merupakan bagian dari ajakan mempromosikan produk/kerajinan lokal, bukan perincian keindahan alam.",
        "2": "Kalimat tersebut menguraikan alur perjalanan waktu dan tempat dari Banda Aceh ke Takengon, bukan kalimat perincian gambaran alam.",
        "3": "Kalimat tentang jalanan menanjak dan curam menggambarkan kondisi medan perjalanan menuju puncak bukit, bukan perincian keindahan pemandangan dari atas."
      }
    },
    {
      "id": "ind-d-7-b1-q04",
      "difficulty": "dasar",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 6, jenis makanan atau minuman khas yang dapat dicicipi wisatawan saat berkunjung ke Pantan Terong di Tanah Gayo adalah...",
      "options": ["Kopi gayo", "Keripik pisang", "Bandrek hangat", "Kue balok lumer"],
      "answer": 0,
      "why": {"0": "Teks menyebutkan bahwa pengunjung dapat mencicipi aneka varian sajian kopi asli Tanah Gayo seperti espresso, cappuccino, mochacino, hingga latte."},
      "distractorWhy": {
        "1": "Keripik pisang merupakan makanan khas yang diulas dalam teks deskripsi lisan 'Jelajah Rasa di Lampung' di Gang PU Bandar Lampung.",
        "2": "Bandrek merupakan sajian minuman hangat yang dijadikan contoh objek latihan deskripsi gambar pada Kegiatan 5a halaman 14.",
        "3": "Kue balok merupakan contoh objek wacana pembanding kalimat perincian rasa dan tekstur makanan pada halaman 12."
      }
    },
    {
      "id": "ind-d-7-b1-q05",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 7, kata 'instagramable' yang digunakan dalam teks deskripsi merupakan istilah yang memiliki makna...",
      "options": [
        "Layak atau indah untuk diunggah dan dijadikan latar berswafoto di media sosial Instagram",
        "Dapat dibeli dengan harga murah sebagai suvenir khas daerah",
        "Memiliki nilai sejarah yang tinggi dan dilindungi pemerintah",
        "Dapat diakses dengan mudah menggunakan kendaraan umum"
      ],
      "answer": 0,
      "why": {"0": "Dalam penjelasan buku hal. 9, instagramable adalah kata serapan bahasa Inggris yang disematkan pada tempat yang indah untuk latar swafoto di Instagram."},
      "distractorWhy": {
        "1": "Makna barang murah yang dijadikan oleh-oleh merujuk pada pengertian suvenir atau cendera mata lokal.",
        "2": "Nilai sejarah dan perlindungan pemerintah merujuk pada objek cagar budaya atau cagar alam, bukan makna istilah instagramable.",
        "3": "Keterjangkauan akses kendaraan umum merupakan aspek aksesibilitas tempat wisata seperti yang dibahas pada analisis pamflet Papandayan."
      }
    },
    {
      "id": "ind-d-7-b1-q06",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 8-9 (Kegiatan 3), perhatikan pencarian makna kata dalam KBBI cetak. Jika kita mencari makna kata dasar 'meredup' dalam KBBI cetak, kata dasar yang harus dicari pada abjad 'R' adalah...",
      "options": ["redup", "meredup", "edup", "redupkan"],
      "answer": 0,
      "why": {"0": "Kaidah pencarian kata dalam KBBI cetak mengharuskan pengguna menemukan kata dasarnya terlebih dahulu. Kata dasar dari kata berimbuhan 'meredup' adalah 'redup'."},
      "distractorWhy": {
        "1": "Pencarian langsung menggunakan kata berimbuhan 'meredup' kurang tepat dalam KBBI cetak karena entri disusun berdasarkan kata dasar.",
        "2": "Bentuk 'edup' bukanlah kata dasar bahasa Indonesia yang valid dari verba meredup.",
        "3": "Bentuk 'redupkan' adalah bentuk kata dasar yang sudah mendapat akhiran -kan, bukan kata dasar murni."
      }
    },
    {
      "id": "ind-d-7-b1-q07",
      "difficulty": "dasar",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 10-11 (Kupas Teori), manakah yang BUKAN merupakan ciri atau tujuan utama dari teks deskripsi?",
      "options": [
        "Menceritakan urutan peristiwa rekaan dengan plot konflik yang rumit",
        "Menggambarkan atau melukiskan suatu benda, tempat, atau suasana tertentu",
        "Melibatkan pancaindra agar pembaca seolah-olah melihat atau merasakan sendiri",
        "Menjelaskan ciri-ciri objek seperti warna, ukuran, dan bentuk secara terperinci"
      ],
      "answer": 0,
      "why": {"0": "Menceritakan urutan peristiwa rekaan dengan konflik rumit merupakan ciri dari teks narasi/fantasi, bukan teks deskripsi yang berfokus melukiskan objek konkret."},
      "distractorWhy": {
        "1": "Pernyataan ini tepat merupakan salah satu poin utama tujuan teks deskripsi pada halaman 9.",
        "2": "Pernyataan ini tepat merupakan ciri teks deskripsi yang melibatkan penglihatan, pendengaran, penciuman, dan perabaan pada halaman 10.",
        "3": "Pernyataan ini tepat merupakan ciri teks deskripsi yang menguraikan rupa dan bentuk objek secara mendetail pada halaman 10."
      }
    },
    {
      "id": "ind-d-7-b1-q08",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 12 (Tabel 1.2), perhatikan kalimat umum: 'Kue balok itu enak sekali.' Manakah kalimat perincian yang tepat untuk mendukung kalimat umum tersebut?",
      "options": [
        "Teksturnya lembut saat digigit dan isian cokelatnya akan lumer di mulutmu.",
        "Kue balok dibeli oleh Paman di toko roti terkenal kemarin sore.",
        "Harganya sangat murah sehingga terjangkau oleh semua kalangan.",
        "Kue tersebut dikemas dalam kotak karton berwarna cokelat tua."
      ],
      "answer": 0,
      "why": {"0": "Teks buku halaman 12 memberikan contoh kalimat perinci untuk rasa kue balok yang enak: 'Teksturnya lembut saat digigit dan isian cokelatnya akan lumer di mulutmu.'"},
      "distractorWhy": {
        "1": "Kalimat ini menjelaskan alur transaksi pembelian kue, bukan perincian citra rasa atau tekstur yang membuktikan kue itu enak.",
        "2": "Kalimat ini menguraikan aspek ekonomis atau harga kue, bukan perincian kelezatan rasa kue balok.",
        "3": "Kalimat ini menggambarkan aspek kemasan luar (wadah), bukan perincian rasa atau kualitas makanan saat dikonsumsi."
      }
    },
    {
      "id": "ind-d-7-b1-q09",
      "difficulty": "dasar",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 13 (Kupas Teori), gaya bahasa yang mengumpamakan benda mati seolah-olah hidup dan dapat berperilaku seperti manusia disebut...",
      "options": ["Majas personifikasi", "Majas metafora", "Majas hiperbola", "Majas asosiasi"],
      "answer": 0,
      "why": {"0": "Kupas Teori halaman 13 mendefinisikan majas personifikasi sebagai gaya bahasa yang mengumpamakan benda mati seolah-olah hidup seperti manusia."},
      "distractorWhy": {
        "1": "Majas metafora adalah pemakaian kata yang bukan arti sebenarnya sebagai pembanding langsung tanpa kata pembanding, bukan penginsanan benda mati.",
        "2": "Majas hiperbola adalah gaya bahasa pengungkapan yang berlebih-lebihan untuk menekankan kesan.",
        "3": "Majas asosiasi adalah perbandingan dua hal yang sifatnya berbeda tetapi dianggap sama dengan kata pembanding seperti bagai, ibarat, bak."
      }
    },
    {
      "id": "ind-d-7-b1-q10",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 13, perhatikan kalimat berikut: 'Angin yang bertiup memainkan rambut dan berputar di sekeliling tubuh.' Kata kerja yang menandai pengumpamaan benda mati seolah-olah hidup pada kalimat tersebut adalah...",
      "options": ["memainkan dan berputar", "bertiup dan sekeliling", "angin dan rambut", "tubuh dan bertiup"],
      "answer": 0,
      "why": {"0": "Kata 'memainkan' dan 'berputar' adalah tindakan manusiawi yang disematkan kepada angin (benda mati) sehingga menciptakan majas personifikasi."},
      "distractorWhy": {
        "1": "Kata 'bertiup' adalah pergerakan alami angin, sedangkan 'sekeliling' adalah kata penunjuk ruang/posisi.",
        "2": "Kata 'angin' dan 'rambut' keduanya merupakan kata benda (nomina), bukan kata kerja penggerak majas.",
        "3": "Kata 'tubuh' adalah nomina dan 'bertiup' adalah verba alami angin, tidak mengandung tindakan personifikasi khas manusia."
      }
    },
    {
      "id": "ind-d-7-b1-q11",
      "difficulty": "tinggi",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 13-14, bacalah kutipan novel 'Misteri Terowongan Kereta' karya Tere Liye: '...Meski si ular besi ini sudah menjadi bagian kehidupan kampung, dengan suara klaksonnya yang tidak pernah alpa, melenguh nyaring setiap subuh buta dan tengah malam...' Ungkapan majas personifikasi dalam kutipan tersebut ditunjukkan oleh ungkapan...",
      "options": [
        "suara klaksonnya yang tidak pernah alpa, melenguh nyaring",
        "perjalanan pertama kalinya aku dan Burlian dengan kereta api",
        "hutan pedalaman Sumatra yang selalu berkabut di pagi hari",
        "bapak tersenyum sambil takzim menatap langit-langit gerbong"
      ],
      "answer": 0,
      "why": {"0": "Klakson kereta api (benda mati) digambarkan memiliki sifat 'tidak pernah alpa' dan dapat 'melenguh nyaring' seperti lembu/hewan bernyawa, yang merupakan majas personifikasi."},
      "distractorWhy": {
        "1": "Kalimat ini menceritakan pengalaman tokoh aku dan Burlian menaiki kereta api, merupakan fakta peristiwa naratif tanpa majas.",
        "2": "Kalimat ini menggambarkan keadaan alam hutan Sumatra yang berkabut, merupakan kenyataan fenomena alamik biasa.",
        "3": "Kalimat ini menceritakan ekspresi dan tindakan manusia (Bapak) yang menatap langit gerbong, bukan personifikasi benda mati."
      }
    },
    {
      "id": "ind-d-7-b1-q12",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 16-17, pamflet wisata 'Taklukkan Puncak Papandayan' memuat informasi detail berupa kelembapan udara 70—80% dan temperatur 10—25°C yang didasarkan pada klasifikasi iklim menurut...",
      "options": ["Schmidt dan Ferguson", "Junghuhn", "Koppen", "Oldeman"],
      "answer": 0,
      "why": {"0": "Dalam teks pamflet wisata Papandayan halaman 16 tertulis eksplisit: 'Menurut klasifikasi Schmidt dan Ferguson, gunung ini memiliki curah hujan rata-rata 3.000 mm/tahun, kelembapan udara 70—80% dan temperatur 10—25° C.'"},
      "distractorWhy": {
        "1": "Klasifikasi Junghuhn didasarkan pada ketinggian tempat dan jenis vegetasi tanaman budidaya, bukan rujukan yang tertulis dalam teks pamflet.",
        "2": "Klasifikasi Koppen didasarkan pada suhu dan curah hujan global, tidak disebutkan dalam teks pamflet Papandayan.",
        "3": "Klasifikasi Oldeman didasarkan pada bulan basah dan bulan kering untuk pertanian tanaman pangan, tidak dirujuk pada pamflet tersebut."
      }
    },
    {
      "id": "ind-d-7-b1-q13",
      "difficulty": "tinggi",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 16, jika seorang wisatawan dari Jakarta ingin mengunjungi Taman Wisata Alam Gunung Papandayan menggunakan bus jurusan Jakarta—Garut, rute angkutan umum lanjutan yang benar dari Terminal Guntur Garut adalah...",
      "options": [
        "Naik angkutan elf jurusan Garut—Cikajang dengan tarif Rp15.000,00",
        "Naik angkutan elf dari Terminal Cicaheum jurusan Bandung—Cikajang",
        "Naik bus Primajasa langsung menuju lokasi tempat perkemahan Pondok Saladah",
        "Naik taksi online langsung menuju gerbang pos 2 Poco Roko"
      ],
      "answer": 0,
      "why": {"0": "Pamflet wisata Papandayan di hal. 16 menyebutkan rute secara presisi: turun di Terminal Guntur—Garut, lalu lanjutkan dengan angkutan elf jurusan Garut—Cikajang dengan tarif Rp15.000,00."},
      "distractorWhy": {
        "1": "Rute Terminal Cicaheum (Bandung) merupakan rute alternatif jika wisatawan berangkat dari Bandung, bukan sambungan dari Terminal Guntur Garut.",
        "2": "Bus Primajasa hanya beroperasi antar kota (Jakarta—Garut) hingga terminal, tidak masuk ke lokasi perkemahan gunung.",
        "3": "Pos 2 Poco Roko merupakan pos pendakian di Desa Wae Rebo NTT (halaman 32-33), bukan lokasi di Gunung Papandayan Garut."
      }
    },
    {
      "id": "ind-d-7-b1-q14",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 21 (Gambar 1.6 dan 1.7), tempat wisata Sungai Santirah yang menyajikan kegiatan River Tubing secara geografis terletak di...",
      "options": [
        "Dusun Giriharja, Desa Selasari, Kecamatan Parigi, Kabupaten Pangandaran",
        "Desa Sirna Jaya dan Desa Kramat Wangi, Kabupaten Garut",
        "Kecamatan Takengon, Kabupaten Aceh Tengah, Provinsi Aceh",
        "Desa Denge, Kecamatan Satarmese Barat, Kabupaten Manggarai"
      ],
      "answer": 0,
      "why": {"0": "Keterangan lokasi pada pamflet Wisata Green Canyon (Gambar 1.7) menyebutkan lokasi Sungai Santirah berada di dusun Giriharja, Desa Selasari, Kecamatan Parigi, Kabupaten Pangandaran, Jawa Barat."},
      "distractorWhy": {
        "1": "Lokasi tersebut merupakan letak kawasan Taman Wisata Alam Gunung Papandayan di Kabupaten Garut.",
        "2": "Kecamatan Takengon Aceh Tengah merupakan lokasi objek wisata Bukit Pantan Terong dan Danau Laut Tawar.",
        "3": "Desa Denge Kabupaten Manggarai NTT merupakan lokasi gerbang awal pendakian menuju Desa Wae Rebo."
      }
    },
    {
      "id": "ind-d-7-b1-q15",
      "difficulty": "tinggi",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 23 (Kupas Teori Awalan meN-), manakah aturan yang BENAR mengenai peluluhan fonem k, p, t, s saat mendapat awalan meN-?",
      "options": [
        "Fonem k, p, t, s luluh jika diikuti kata dasar yang berawalan huruf k, p, t, s tunggal (bukan kluster)",
        "Fonem k, p, t, s tetap luluh meskipun diikuti oleh kata dasar yang berawalan konsonan rangkap (kluster)",
        "Fonem k, p, t, s luluh ketika bergabung dengan kata berimbuhan berawalan k, p, t, s seperti memperluas",
        "Fonem k, p, t, s tidak pernah luluh dalam kondisi penambahan awalan meN- bentuk apa pun"
      ],
      "answer": 0,
      "why": {"0": "Teori bahasa hal. 23 menjelaskan fonem k, p, t, s luluh jika diawali kata dasar berawalan huruf k, p, t, s tunggal (contoh: meN- + pesona -> memesona, meN- + pengaruh -> memengaruhi)."},
      "distractorWhy": {
        "1": "Jika diikuti konsonan rangkap (kluster) seperti pr, kr, kl, fonem k, p, t, s TIDAK luluh (contoh: memprakarsai, mengkriminalkan).",
        "2": "Pada kata berimbuhan yang diawali k, p, t, s seperti memperluas / mempertaruhkan, fonem p atau t TIDAK luluh.",
        "3": "Pernyataan ini salah karena dalam kaidah tata bahasa Indonesia standar fonem k, p, t, s mengalami peluluhan jika memenuhi syarat tertentu."
      }
    },
    {
      "id": "ind-d-7-b1-q16",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 23 (Tantangan), manakah kalimat yang menggunakan kata berimbuhan meN- dengan peluluhan kata dasar yang BENAR?",
      "options": [
        "Kilau sinar matahari yang menerpa permukaan danau itu sangat mengagumkan.",
        "Perajin memroduksi suvenir dalam kegiatan industri rumah tangga skala kecil.",
        "Pemandu wisata itu secara tangkas menterjemahkan paparannya ke bahasa Jerman.",
        "Pendaki gunung tidak memersoalkan kenaikan tarif fasilitas di jalur pendakian."
      ],
      "answer": 0,
      "why": {"0": "Kata 'menerpa' berasal dari awalan meN- + terpa (huruf t luluh menjadi n). Ini merupakan pembentukan kata berimbuhan meN- yang baku dan tepat."},
      "distractorWhy": {
        "1": "Bentuk 'memroduksi' salah; kata dasar 'produksi' berawalan kluster pr- sehingga p TIDAK luluh (seharusnya memproduksi).",
        "2": "Bentuk 'menterjemahkan' salah; kata dasar 'terjemah' berawalan t tunggal sehingga t LULUH menjadi n (seharusnya menerjemahkan).",
        "3": "Bentuk 'memersoalkan' salah; kata asal 'persoal' mendapat imbuhan me-kan pada bentuk dasar soal/persoal (seharusnya mempersoalkan)."
      }
    },
    {
      "id": "ind-d-7-b1-q17",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 25-27 (Menganalisis Informasi Lisan 'Jelajah Wae Rebo'), apakah nama rumah adat tradisional khas Manggarai yang berbentuk kerucut dan memiliki lima tingkat?",
      "options": ["Mbaru Niang", "Tongkonan", "Rumah Gadang", "Honai"],
      "answer": 0,
      "why": {"0": "Teks lisan 'Jelajah Wae Rebo' karya Eugenia Rakhma Subarna menyebutkan bahwa rumah tradisional khas Manggarai yang memiliki 5 tingkat berbentuk kerucut dinamakan Mbaru Niang."},
      "distractorWhy": {
        "1": "Tongkonan merupakan rumah adat tradisional masyarakat suku Toraja di Sulawesi Selatan.",
        "2": "Rumah Gadang merupakan rumah adat tradisional Minangkabau di Sumatera Barat.",
        "3": "Honai merupakan rumah adat tradisional suku-suku di wilayah pegunungan Papua."
      }
    },
    {
      "id": "ind-d-7-b1-q18",
      "difficulty": "tinggi",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 26-27, pada bangunan rumah Mbaru Niang di Desa Wae Rebo, bagian tingkat ketiga yang berfungsi khusus untuk menyimpan benih jagung dan tanaman bercocok tanam dinamakan...",
      "options": ["lentar", "lutur", "lobo", "hempang"],
      "answer": 0,
      "why": {"0": "Dalam penuturan pandu wisata teks Jelajah Wae Rebo di hal. 27 dijelaskan: '...inilah tingkat ketiga atau yang biasa disebut lentar, berfungsi menyimpan benih jagung dan tanaman untuk bercocok tanam...'"},
      "distractorWhy": {
        "1": "Lutur atau tenda adalah tingkat pertama Mbaru Niang yang berfungsi sebagai tempat tinggal dan berkumpul keluarga.",
        "2": "Lobo (tingkat keempat) dan tempat lainnya memiliki fungsi penyimpanan bahan makanan cadangan saat paceklik.",
        "3": "Hempang adalah istilah lain dari susunan konstruksi kayu/perabot, bukan nama struktur tingkat ketiga Mbaru Niang."
      }
    },
    {
      "id": "ind-d-7-b1-q19",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 28-29 ('Jelajah Rasa di Lampung'), apakah nama kawasan yang terkenal sebagai pusat sentra keripik pisang di Jalan Pagar Alam, Kota Bandar Lampung?",
      "options": ["Gang PU", "Gang Malioboro", "Pasar Beringharjo", "Pantan Terong"],
      "answer": 0,
      "why": {"0": "Teks 'Jelajah Rasa di Lampung' menyebutkan bahwa pusat sentra keripik pisang lampung terletak di Jalan Pagar Alam, Kota Bandar Lampung, yang terkenal dengan sebutan Gang PU."},
      "distractorWhy": {
        "1": "Gang Malioboro merupakan kawasan sentra wisata belanja terkenal di Kota Yogyakarta.",
        "2": "Pasar Beringharjo adalah pasar tradisional di Yogyakarta yang dipakai sebagai contoh teks deskripsi lokasi di hal. 10.",
        "3": "Pantan Terong adalah bukit tempat wisata pemandangan alam di Kota Takengon Aceh Tengah."
      }
    },
    {
      "id": "ind-d-7-b1-q20",
      "difficulty": "tinggi",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII hal. 31-32 (Kegiatan 9: Kupas Teori Tanda Baca), manakah kalimat yang menggunakan tanda koma (,) dengan BENAR sesuai kaidah kebahasaan?",
      "options": [
        "Wah, indah sekali pemandangan di Pantan Terong!",
        "Gunung Papandayan telah meletus beberapa kali, Meskipun demikian kawahnya tetap indah.",
        "Ia membeli kopi kain dan tas sebagai oleh-oleh.",
        "Lili mengambil foto sementara Fajar memilih menikmati kopi."
      ],
      "answer": 0,
      "why": {"0": "Halaman 32 menjelaskan bahwa tanda koma dipakai sebelum dan/atau sesudah kata seru (seperti wah, o, ya, aduh) sehingga pemisahan 'Wah, indah sekali...' adalah tepat."},
      "distractorWhy": {
        "1": "Setelah ungkapan penghubung antarkalimat 'Meskipun demikian', WAJIB diikuti tanda koma: 'Meskipun demikian, kawahnya...'.",
        "2": "Pada rincian lebih dari dua unsur (pemerincian), wajib menggunakan tanda koma sebelum kata 'dan': 'kopi, kain, dan tas'.",
        "3": "Pada kalimat majemuk setara dengan pertentangan/penghubung 'sementara', wajib didahului tanda koma sebelum kata 'sementara'."
      }
    }
  ]
}

with open(r'c:\Users\hp\fiezel-apps\tools\chunk_ind_7_b1.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Successfully written 20 items to chunk_ind_7_b1.json")
