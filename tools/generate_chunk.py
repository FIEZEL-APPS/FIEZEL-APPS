import json
import os

data = {
  "code": "KOMP-IPS-D-7-BAB2-01",
  "grade": 7,
  "name": "Tema 02: Keberagaman Lingkungan Sekitar",
  "materi": "Proses Pembentukan Bumi & Masa Praaksara, Keberagaman Bentang Alam & Lingkungan, Interaksi Manusia & Konservasi SDA, Peran Lembaga Sosial & Ekonomi",
  "cpRef": "Ilmu Pengetahuan Sosial untuk SMP/MTs Kelas VII (Edisi Revisi) — Tema 02",
  "items": [
    {
      "id": "ips-d-7-t2-q01",
      "difficulty": "dasar",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 97 (Evaluasi Tema 02), kemunculan makhluk hidup di permukaan bumi yang menandakan kondisi bumi sudah mulai stabil terjadi sekitar 140 juta tahun lalu pada zaman...",
      "options": [
        "Mesozoikum",
        "Arkaekum",
        "Paleozoikum",
        "Neozoikum"
      ],
      "answer": 0,
      "why": {
        "0": "Zaman Mesozoikum (sekitar 140–65 juta tahun lalu) merupakan masa sekunder saat kondisi bumi mulai stabil dan ditandai oleh munculnya reptil raksasa serta mamalia purba."
      },
      "distractorWhy": {
        "1": "Masa Arkaekum terjadi sekitar 2,5 miliar tahun lalu ketika bumi masih sangat panas dan belum ada tanda-tanda kehidupan.",
        "2": "Masa Paleozoikum terjadi sekitar 340 juta tahun lalu saat organisme bersel satu dan bertulang belakang awal mulai muncul.",
        "3": "Masa Neozoikum terjadi sekitar 60 juta tahun lalu hingga sekarang dan terbagi menjadi zaman tersier serta kuarter."
      }
    },
    {
      "id": "ips-d-7-t2-q02",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 97 (Evaluasi Tema 02), kota-kota metropolitan seperti Jakarta, Surabaya, dan Bandung memiliki tingkat pencemaran udara PM 2.5 berkisar 30–42 mikrogram akibat tingginya penggunaan kendaraan bermotor, sedangkan kota dengan mobilitas kendaraan rendah memiliki tingkat cemaran udara rendah. Hal ini menunjukkan bahwa...",
      "options": [
        "Kota-kota metropolitan memberikan sumbangan yang besar terhadap pencemaran udara dibandingkan dengan kota-kota kecil",
        "Kota-kota metropolitan memberikan sumbangan yang kecil terhadap pencemaran udara dibandingkan dengan kota-kota kecil",
        "Kota-kota metropolitan memiliki tingkat pencemaran udara yang sama persis dengan kota-kota kecil",
        "Penggunaan kendaraan bermotor di kota metropolitan tidak memengaruhi kualitas udara secara signifikan"
      ],
      "answer": 0,
      "why": {
        "0": "Tingginya volume kendaraan bermotor di kawasan metropolitan berbanding lurus dengan jumlah emisi gas buang dan partikel PM 2.5 yang mencemari udara."
      },
      "distractorWhy": {
        "1": "Pernyataan ini berlawanan dengan fakta empiris bahwa emisi kendaraan padat di kota besar menyumbang polusi udara terbesar.",
        "2": "Tingkat polusi udara di kota metropolitan jauh lebih tinggi daripada kota kecil karena perbedaan densitas kendaraan bermotor.",
        "3": "Emisi gas buang dari kendaraan bermotor merupakan penyebab utama penurunan kualitas udara di wilayah perkotaan."
      }
    },
    {
      "id": "ips-d-7-t2-q03",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 98, perhatikan empat aktivitas berikut:\n(1) Menggunakan sarana transportasi umum\n(2) Mengembangkan kendaraan bertenaga listrik\n(3) Menanam pohon-pohon di hutan\n(4) Memakai masker ketika beraktivitas\n\nSolusi yang paling tepat untuk menanggulangi dan memitigasi sumber pencemaran udara dari sektor transportasi adalah...",
      "options": [
        "(1) dan (2)",
        "(2) dan (3)",
        "(3) dan (4)",
        "(1) dan (4)"
      ],
      "answer": 0,
      "why": {
        "0": "Menggunakan transportasi umum menekan jumlah emisi per kapita, sedangkan mengembangkan kendaraan listrik mengurangi ketergantungan pada bahan bakar fosil penyebab polusi."
      },
      'distractorWhy': {
        "1": "Penanaman pohon di hutan menanggulangi deforestasi, tetapi kurang spesifik mengatasi emisi transportasi perkotaan secara langsung.",
        "2": "Memakai masker hanya langkah proteksi diri individu dari paparan polusi, bukan solusi menurunkan sumber polusi udara.",
        "3": "Memakai masker tidak mengurangi jumlah gas buang yang dihasilkan oleh kendaraan bermotor di jalan raya."
      }
    },
    {
      "id": "ips-d-7-t2-q04",
      "difficulty": "dasar",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 98 (Evaluasi Tema 02), faktor internal yang mendukung terjadinya dinamika sosial di dalam masyarakat mencakup hal-hal berikut, KECUALI...",
      "options": [
        "Bencana alam",
        "Dinamika jumlah penduduk",
        "Konflik sosial antar kelompok",
        "Revolusi atau pemberontakan internal"
      ],
      "answer": 0,
      "why": {
        "0": "Bencana alam merupakan faktor eksternal yang berasal dari lingkungan fisik di luar struktur internal masyarakat."
      },
      "distractorWhy": {
        "1": "Perubahan atau dinamika jumlah penduduk merupakan faktor internal yang memicu perubahan struktur sosial.",
        "2": "Konflik sosial di dalam masyarakat merupakan faktor internal penyebab pergeseran dan dinamika sosial.",
        "3": "Revolusi internal merupakan dorongan perubahan sosial yang berasal dari dalam masyarakat itu sendiri."
      }
    },
    {
      "id": "ips-d-7-t2-q05",
      "difficulty": "dasar",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 98, pada era 2000-an penggunaan telepon genggam belum meluas, namun saat ini ketergantungan individu terhadap smartphone sangat tinggi hingga mengubah pola komunikasi dan perilaku masyarakat. Fenomena ini dikategorikan sebagai...",
      "options": [
        "Perubahan sosial",
        "Interaksi sosial",
        "Dinamika sosial",
        "Mobilitas sosial"
      ],
      "answer": 0,
      "why": {
        "0": "Perubahan sosial merujuk pada peralihan pola perilaku, norma, dan peradaban masyarakat akibat perkembangan teknologi informasi."
      },
      "distractorWhy": {
        "1": "Interaksi sosial merujuk pada hubungan timbal balik antarindividu atau kelompok, bukan fenomena peralihan pola budaya akibat teknologi.",
        "2": "Dinamika sosial adalah proses pergerakan internal kelompok, bukan istilah umum untuk perubahan pola hidup masyarakat.",
        "3": "Mobilitas sosial merujuk pada perpindahan status sosial seseorang dalam hierarki masyarakat."
      }
    },
    {
      "id": "ips-d-7-t2-q06",
      "difficulty": "tinggi",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 99, penggunaan bahan kimia seperti pestisida dan pupuk anorganik sejak Revolusi Hijau dapat meningkatkan produksi pertanian, namun dampak jangka panjangnya menyebabkan pencemaran tanah sehingga tanah menjadi tidak subur. Solusi yang tepat untuk memulihkan tanah tercemar tersebut adalah...",
      "options": [
        "Mendegradasi zat pencemar dan racun dalam tanah melalui pemulihan lingkungan",
        "Menambah dosis pupuk kimia sintetis agar unsur hara bertambah cepat",
        "Membiarkan tanah tanpa pengolahan agar zat racun menguap sendiri secara alami",
        "Mengubah seluruh lahan pertanian tercemar menjadi kawasan pemukiman industri"
      ],
      "answer": 0,
      "why": {
        "0": "Degradasi zat pencemar (remediasi/bioremediasi) menguraikan racun kimia sintetis dalam tanah menjadi senyawa tidak berbahaya sehingga kesuburan tanah pulih."
      },
      "distractorWhy": {
        "1": "Menambah pupuk kimia sintetis justru akan memperparah akumulasi racun dan merusak struktur tanah.",
        "2": "Zat cemaran pestisida kimia bersifat persisten di dalam tanah dan tidak mudah hilang tanpa upaya pemulihan aktif.",
        "3": "Mengubah fungsi lahan pertanian mengurangi ketersediaan lahan pangan nasional dan tidak menyelesaikan pencemaran tanah."
      }
    },
    {
      "id": "ips-d-7-t2-q07",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 99, pada masa berburu dan mengumpulkan makanan tingkat sederhana (50.000–10.000 SM), manusia praaksara telah mengenal pembagian kerja berdasarkan jenis kelamin. Peran utama kaum perempuan pada masa tersebut adalah...",
      "options": [
        "Mengumpulkan makanan di sekitar tempat tinggal dan mengasuh anak",
        "Berburu binatang buas berukuran besar di hutan rimba",
        "Membuat alat-alat dari logam dan perunggu untuk bertani",
        "Membuka lahan pertanian skala besar dengan teknik tebang bakar"
      ],
      "answer": 0,
      "why": {
        "0": "Pada masa berburu tingkat sederhana, perempuan bertugas mengumpulkan tumbuh-tumbuhan, buah, dan mengasuh anak di dekat perkemahan sementara kaum laki-laki berburu hewan."
      },
      "distractorWhy": {
        "1": "Berburu binatang buas jarak jauh memerlukan fisik kuat dan merupakan tugas utama kelompok laki-laki.",
        "2": "Teknologi perunggu dan logam baru berkembang pada masa Perundagian ribuan tahun kemudian.",
        "3": "Pembukaan lahan pertanian tebang bakar baru dikenal pada masa bercocok tanam (Neolitikum)."
      }
    },
    {
      "id": "ips-d-7-t2-q08",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 99, jumlah penduduk Indonesia terus meningkat dari 272,6 juta jiwa (2020) menjadi 278,6 juta jiwa (2023). Untuk menjamin kesejahteraan penduduk melalui pemenuhan layanan dasar pendidikan dan kesehatan, program pembangunan diselaraskan dengan SDGs pada pilar...",
      "options": [
        "Pembangunan sosial",
        "Pembangunan ekonomi",
        "Pembangunan lingkungan",
        "Pembangunan tata kelola"
      ],
      "answer": 0,
      "why": {
        "0": "Pilar pembangunan sosial SDGs berfokus pada pemenuhan hak dasar manusia mencakup pengentasan kemiskinan, kesehatan, pendidikan berkualitas, dan kesetaraan."
      },
      "distractorWhy": {
        "1": "Pilar pembangunan ekonomi berfokus pada pertumbuhan ekonomi berkualitas, pekerjaan layak, dan inovasi industri.",
        "2": "Pilar pembangunan lingkungan berfokus pada konservasi ekosistem darat, lautan, serta penanganan perubahan iklim.",
        "3": "Pilar pembangunan tata kelola berfokus pada perdamaian, keadilan, dan kelembagaan yang tangguh."
      }
    },
    {
      "id": "ips-d-7-t2-q09",
      "difficulty": "tinggi",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 100, lonjakan minat dan penggunaan mobil listrik di Indonesia dari 3.205 unit menjadi 20.681 unit direspon pemerintah dan produsen melalui pengembangan teknologi ramah lingkungan. Fenomena ini merupakan bentuk respons terhadap sumber daya minyak bumi yang...",
      "options": [
        "Terbatas dan tidak dapat diperbarui",
        "Jumlahnya tidak terbatas di alam",
        "Sangat mudah didaur ulang secara alami",
        "Tidak memiliki dampak emisi karbon"
      ],
      "answer": 0,
      "why": {
        "0": "Minyak bumi merupakan bahan bakar fosil yang jumlahnya terbatas di alam dan depositnya akan habis sehingga mendorong transisi ke energi listrik."
      },
      "distractorWhy": {
        "1": "Minyak bumi terbentuk dari fosil yang memerlukan waktu jutaan tahun sehingga persediaannya terbatas.",
        "2": "Minyak bumi tidak bisa didaur ulang setelah dibakar menjadi energi emisi.",
        "3": "Pembakaran minyak bumi menghasilkan emisi gas rumah kaca yang memicu pemanasan global."
      }
    },
    {
      "id": "ips-d-7-t2-q10",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 100, produsen UMKM kuliner moci mengalami peningkatan permintaan dua kali lipat sehingga membeli mesin modern untuk menambah kapasitas dan variasi rasa. Hal ini menunjukkan bahwa perkembangan IPTEK dalam kegiatan ekonomi bertujuan untuk...",
      "options": [
        "Memaksimalkan proses produksi serta meningkatkan kualitas dan kuantitas produk",
        "Mengurangi ketergantungan pada konsumen luar daerah",
        "Menghilangkan kebutuhan akan tenaga kerja manusia secara total",
        "Membatasi jumlah barang yang beredar di pasar"
      ],
      "answer": 0,
      "why": {
        "0": "Penerapan IPTEK dan mesin modern mempermudah produsen menghasilkan produk berkualitas lebih baik dalam jumlah yang sesuai kebutuhan pasar."
      },
      "distractorWhy": {
        "1": "Penggunaan teknologi justru membantu UMKM menjangkau pasar konsumen luar daerah yang lebih luas.",
        "2": "Penerapan mesin pada UMKM bertujuan mendukung efisiensi kerja, bukan menghapus seluruh tenaga kerja.",
        "3": "Mesin baru digunakan untuk meningkatkan volume produksi, bukan membatasi barang beredar."
      }
    },
    {
      "id": "ips-d-7-t2-q11",
      "difficulty": "dasar",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 74 (Aktivitas 2), proses perpaduan dua kebudayaan atau lebih yang saling memengaruhi sehingga menghasilkan unsur kebudayaan baru tanpa menghilangkan ciri khas kebudayaan aslinya disebut...",
      "options": [
        "Akulturasi",
        "Asimilasi",
        "Difusi",
        "Internalisasi"
      ],
      "answer": 0,
      "why": {
        "0": "Akulturasi terjadi ketika budaya asing diterima dan diolah ke dalam kebudayaan sendiri tanpa menyebabkan hilangnya kepribadian kebudayaan asli."
      },
      "distractorWhy": {
        "1": "Asimilasi merupakan pembauran dua kebudayaan yang disertai dengan hilangnya ciri khas kebudayaan asli membentuk budaya baru.",
        "2": "Difusi adalah proses penyebaran unsur-unsur kebudayaan dari satu individu/masyarakat ke individu/masyarakat lain.",
        "3": "Internalisasi adalah proses penanaman nilai dan norma ke dalam kepribadian individu sejak kecil."
      }
    },
    {
      "id": "ips-d-7-t2-q12",
      "difficulty": "dasar",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 81 (Aktivitas 4), pembabakan masa praaksara secara arkeologis yang ditandai dengan penggunaan alat batu yang masih kasar dan belum diasah seperti kapak genggam adalah...",
      "options": [
        "Paleolitikum",
        "Mesolitikum",
        "Neolitikum",
        "Perundagian"
      ],
      "answer": 0,
      "why": {
        "0": "Zaman Paleolitikum (zaman batu tua) ditandai oleh alat-alat batu yang dikerjakan secara kasar dan belum dihaluskan untuk berburu."
      },
      "distractorWhy": {
        "1": "Zaman Mesolitikum (zaman batu tengah) ditandai oleh pembuat kapak genggam Sumatra dan mulai menetap di gua-gua.",
        "2": "Zaman Neolitikum (zaman batu baru) ditandai oleh perkakas batu yang sudah diasah halus seperti beliung persegi.",
        "3": "Zaman Perundagian merupakan masa pertukangan logam (perunggu dan besi)."
      }
    },
    {
      "id": "ips-d-7-t2-q13",
      "difficulty": "tinggi",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 86 (Aktivitas 6), manusia praaksara pada masa berburu dan mengumpulkan makanan tingkat lanjut mulai membuat lukisan dinding gua berupa cap-cap tangan dan gambar binatang. Makna utama seni lukis gua tersebut adalah...",
      "options": [
        "Sebagai bagian dari ritual kepercayaan, permohonan perlindungan, dan rekaman pengalaman berburu",
        "Sebagai barang dagangan bernilai ekonomi tinggi untuk ditukarkan dengan suku lain",
        "Sebagai hiasan estetis komersial untuk menarik perhatian kelompok luar",
        "Sebagai alat komunikasi berbasis sistem tulisan alfabet formal"
      ],
      "answer": 0,
      "why": {
        "0": "Lukisan dinding gua pada masa praaksara bernilai magis-religius yang berkaitan dengan simbol permohonan keberhasilan berburu dan penghormatan roh."
      },
      "distractorWhy": {
        "1": "Pada masa batu pertengahan belum terdapat aktivitas perdagangan lukisan komersial.",
        "2": "Lukisan gua dibuat bukan untuk tujuan dekorasi komersial melainkan kebutuhan spritual dan ekspresi pengalaman.",
        "3": "Masa tersebut merupakan masa praaksara sehingga masyarakat belum mengenal sistem aksara tulisan alfabet."
      }
    },
    {
      "id": "ips-d-7-t2-q14",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 87 (Aktivitas 7), pada masa bercocok tanam (Neolitikum), masyarakat membangun berbagai bangunan batu besar seperti dolmen, menhir, dan sarkofagus. Keberadaan bangunan megalitikum ini mencerminkan sistem kepercayaan...",
      "options": [
        "Penghormatan terhadap roh nenek moyang dan pemujaan kekuatan alam",
        "Kepercayaan monoteisme modern berbasis kitab tertulis",
        "Penolakan terhadap semua bentuk bangunan ritual keagamaan",
        "Penyembahan berhala berbasis teknologi manufaktur mesin"
      ],
      "answer": 0,
      "why": {
        "0": "Tradisi megalitikum berkembang karena adanya keyakinan bahwa roh nenek moyang tetap mengawasi dan memengaruhi kehidupan keturunannya."
      },
      "distractorWhy": {
        "1": "Masyarakat praaksara belum mengenal agama monoteisme modern dengan kitab suci.",
        "2": "Bangunan dolmen dan menhir justru membuktikan keberadaan ritual keagamaan yang sangat kuat.",
        "3": "Masyarakat Neolitikum belum menggunakan teknologi mesin manufaktur."
      }
    },
    {
      "id": "ips-d-7-t2-q15",
      "difficulty": "tinggi",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 89 (Aktivitas 8), pada masa Perundagian perdagangan antarpulau semakin ramai dengan memanfaatkan sarana perahu bercadik. Mekanisme transaksi ekonomi yang berlaku pada era tersebut adalah...",
      "options": [
        "Barter atau tukar-menukar barang berupa nekara perunggu, perhiasan, dan hasil bumi",
        "Penggunaan mata uang kertas resmi terbitan bank sentral",
        "Pembayaran menggunakan koin emas berstempel standar internasional",
        "Sistem transfer kredit digital berbasis perbankan"
      ],
      "answer": 0,
      "why": {
        "0": "Meskipun teknologi perunggu sudah maju, alat pembayaran uang resmi belum ada sehingga perdagangan dilakukan secara barter dengan barang bernilai tinggi seperti nekara dan perhiasan."
      },
      "distractorWhy": {
        "1": "Mata uang kertas belum dikenal pada masa praaksara.",
        "2": "Koin emas berskala internasional baru hadir pada era kerajaan Hindu-Buddha dan Islam.",
        "3": "Sistem transfer digital merupakan inovasi teknologi keuangan masa modern."
      }
    },
    {
      "id": "ips-d-7-t2-q16",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 93 (Aktivitas 9), fenomena pemanasan suhu permukaan laut di Samudra Pasifik bagian tengah dan timur yang berakibat pada menurunnya curah hujan drastis dan kekeringan panjang di Indonesia dinamakan...",
      "options": [
        "El Nino",
        "La Nina",
        "Efek rumah kaca",
        "Gelombang tsunami"
      ],
      "answer": 0,
      "why": {
        "0": "El Nino memicu pergeseran awan hujan menjauhi wilayah Indonesia sehingga menyebabkan kemarau panjang dan kekeringan."
      },
      "distractorWhy": {
        "1": "La Nina merupakan fenomena pendinginan suhu muka laut Pasifik yang menyebabkan curah hujan tinggi dan banjir di Indonesia.",
        "2": "Efek rumah kaca adalah proses terperangkapnya panas matahari oleh gas atmosfer secara global.",
        "3": "Tsunami adalah gelombang laut raksasa yang dipicu oleh gempa bumi atau letusan gunung api bawah laut."
      }
    },
    {
      "id": "ips-d-7-t2-q17",
      "difficulty": "tinggi",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 101 (Evaluasi Essay No. 5), perburuan hiu secara masif untuk diambil siripnya memberikan nilai ekonomi tinggi bagi nelayan, namun mengancam kepunahan predator puncak laut. Berdasarkan prinsip pembangunan berkelanjutan, langkah pengelolaan yang tepat adalah...",
      "options": [
        "Menghentikan perburuan hiu liar dan mengembangkan mata pencaharian alternatif berkelanjutan demi menjaga ekosistem laut",
        "Meningkatkan kapasitas kuota penangkapan hiu agar pendapatan nelayan melonjak pesat",
        "Membiarkan perburuan sirip hiu tanpa batasan karena memberikan harga jual tinggi bagi pasar",
        "Memusnahkan seluruh habitat laut agar tidak ada persaingan ekosistem"
      ],
      "answer": 0,
      "why": {
        "0": "Pembangunan berkelanjutan menjamin pemanfaatan sumber daya tanpa mengorbankan kelestarian ekosistem dan keanekaragaman hayati laut bagi generasi mendatang."
      },
      "distractorWhy": {
        "1": "Meningkatkan kuota penangkapan akan mempercepat kepunahan hiu dan merusak keseimbangan ekosistem laut.",
        "2": "Pembiaran perburuan liar bertentangan dengan pilar pembangunan lingkungan SDGs.",
        "3": "Memusnahkan habitat laut akan menghancurkan sumber kehidupan manusia dan biota lingkungan."
      }
    },
    {
      "id": "ips-d-7-t2-q18",
      "difficulty": "dasar",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 65, pada pembabakan sejarah bumi secara geologis, masa Arkaekum yang berlangsung sekitar 2,5 miliar tahun lalu memiliki karakteristik utama yaitu...",
      "options": [
        "Kulit bumi masih sangat panas dan dalam proses pembentukan sehingga belum ada tanda kehidupan",
        "Suhu bumi sudah stabil dan ditumbuhi hutan hujan tropis lebat",
        "Bumi didominasi oleh reptil raksasa dinosaurus",
        "Manusia praaksara mulai hidup menetap di sekitar sungai"
      ],
      "answer": 0,
      "why": {
        "0": "Masa Arkaekum merupakan masa tertua ketika bumi dalam keadaan sangat panas dan belum memungkinkan adanya kehidupan."
      },
      "distractorWhy": {
        "1": "Kondisi bumi yang stabil dengan tumbuhan lebat terjadi pada masa Paleozoikum dan Mesozoikum.",
        "2": "Reptil raksasa hidup pada masa Mesozoikum.",
        "3": "Kehadiran manusia praaksara baru terjadi pada zaman Kuarter di masa Neozoikum."
      }
    },
    {
      "id": "ips-d-7-t2-q19",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 70, pencemaran tanah sering terjadi akibat penumpukan limbah padat non-biodegradable seperti sampah plastik dan limbah B3. Dampak ekologis paling serius dari pencemaran tanah ini adalah...",
      "options": [
        "Menurunnya kesuburan tanah serta rusaknya populasi mikroorganisme pengurai",
        "Meningkatnya kandungan oksigen murni di dalam pori-pori tanah",
        "Mempercepat pematangan tanaman pertanian tanpa perlu penyiraman",
        "Mencegah erosi dan tanah longsor saat musim hujan"
      ],
      "answer": 0,
      "why": {
        "0": "Bahan pencemar mematikan cacing dan mikroorganisme tanah sehingga proses pembentukan humus terganggu dan kesuburan tanah merosot."
      },
      "distractorWhy": {
        "1": "Pencemaran tanah justru menurunkan kualitas aerasi dan mematikan biota tanah.",
        "2": "Limbah beracun merusak akar tanaman dan menurunkan produktivitas pertanian.",
        "3": "Pencemaran tanah merusak struktur tanah sehingga tanah menjadi rawan erosi."
      }
    },
    {
      "id": "ips-d-7-t2-q20",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa IPS Kelas VII hal. 90-91, kerangka Pembangunan Berkelanjutan (SDGs) ditopang oleh empat pilar utama. Pilar yang secara khusus mengatur konservasi ekosistem daratan dan perairan serta penanganan iklim adalah...",
      "options": [
        "Pilar pembangunan lingkungan",
        "Pilar pembangunan ekonomi",
        "Pilar pembangunan sosial",
        "Pilar pembangunan tata kelola"
      ],
      "answer": 0,
      "why": {
        "0": "Pilar pembangunan lingkungan mencakup keberlanjutan sumber daya alam, keanekaragaman hayati darat dan air, serta aksi iklim."
      },
      "distractorWhy": {
        "1": "Pilar pembangunan ekonomi berfokus pada pekerjaan layak, energi bersih, dan inovasi industri.",
        "2": "Pilar pembangunan sosial mencakup bidang pendidikan, kesehatan, dan pengentasan kemiskinan.",
        "3": "Pilar pembangunan tata kelola mencakup penegakan hukum, keadilan, dan perdamaian."
      }
    }
  ]
}

target_file = r"c:\Users\hp\fiezel-apps\tools\chunk_ips_7_t2.json"
os.makedirs(os.path.dirname(target_file), exist_ok=True)

with open(target_file, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Generated:", target_file)
