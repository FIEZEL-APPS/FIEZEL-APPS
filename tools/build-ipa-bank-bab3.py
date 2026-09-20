import json

# Load existing bank data
with open(r'c:\Users\hp\fiezel-apps\content\mapel\mapel-ipa-d.json', 'r', encoding='utf-8') as f:
    bank_data = json.load(f)

print(f"Existing competencies: {len(bank_data['competencies'])}")
total_prev_items = sum(len(c['items']) for c in bank_data['competencies'])
print(f"Total previous items: {total_prev_items}")

bab3_items = [
    # --- SUBBAB A: Suhu & Termometer (hal. 84-92) ---
    {
        "id": "ipa-d-7-b3-q01",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 92 Ayo Uji Kemampuan No. 1), mengapa telapak atau punggung tangan manusia tidak dapat digunakan sebagai alat pengukur derajat suhu yang baku dan pasti?",
        "options": [
            "Karena indra peraba manusia bersifat subjektif, kualitatif, dan dipengaruhi kondisi suhu lingkungan sebelumnya sehingga tidak memiliki angka skala terkalibrasi",
            "Karena tangan manusia selalu mengeluarkan panas yang menghancurkan suhu benda saat disentuh",
            "Karena kulit manusia hanya dapat mendeteksi zat berwujud gas dan kebal terhadap zat padat",
            "Karena telapak tangan selalu memiliki suhu mutlak nol Kelvin pada segala kondisi cuaca"
        ],
        "answer": 0,
        "why": {
            "0": "Indra peraba manusia hanya mampu memberikan penilaian rasa kualitatif (panas/dingin) yang relatif dan mudah terbiasa, sehingga pengukuran ilmiah memerlukan termometer berskala baku."
        },
        "distractorWhy": {
            "1": "Panas tubuh tangan tidak menghancurkan suhu benda melainkan hanya terjadi transfer kalor kecil saat kontak fisik.",
            "2": "Reseptor kulit raba dapat merasakan sentuhan seluruh wujud materi baik padat, cair, maupun gas.",
            "3": "Suhu tubuh manusia normal berada di kisaran 36-37 derajat Celsius, bukan nol Kelvin (-273 derajat Celsius)."
        }
    },
    {
        "id": "ipa-d-7-b3-q02",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 92 Ayo Uji Kemampuan No. 2), jika termometer Celcius menunjukkan suhu ruangan kelas adalah 30°C, berapakah nilai suhu tersebut jika dikonversikan ke skala Fahrenheit?",
        "options": [
            "86°F",
            "62°F",
            "54°F",
            "102°F"
        ],
        "answer": 0,
        "why": {
            "0": "Konversi dari Celcius ke Fahrenheit menggunakan rumus T_F = (9/5 x T_C) + 32 = (9/5 x 30) + 32 = 54 + 32 = 86°F."
        },
        "distractorWhy": {
            "1": "Nilai 62°F diperoleh dari kesalahan rumus penjumlahan langsung 30 + 32 tanpa mengalikan rasio 9/5.",
            "2": "Nilai 54°F adalah hasil kali 9/5 x 30 sebelum ditambahkan titik beku Fahrenheit 32°F.",
            "3": "Nilai 102°F diperoleh dari perkalian rasio yang keliru."
        }
    },
    {
        "id": "ipa-d-7-b3-q03",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 90-91), penetapan titik tetap bawah (es melebur) dan titik tetap atas (air mendidih) pada skala Celcius (0-100), Reamur (0-80), dan Fahrenheit (32-212) menghasilkan perbandingan rasio skala suhu sebesar…",
        "options": [
            "Celcius : Reamur : Fahrenheit = 5 : 4 : 9",
            "Celcius : Reamur : Fahrenheit = 5 : 5 : 9",
            "Celcius : Reamur : Fahrenheit = 4 : 5 : 9",
            "Celcius : Reamur : Fahrenheit = 10 : 8 : 12"
        ],
        "answer": 0,
        "why": {
            "0": "Rentang titik tetap Celcius adalah 100, Reamur adalah 80, dan Fahrenheit adalah 180 (212-32). Menyederhanakan 100 : 80 : 180 menghasilkan rasio 5 : 4 : 9."
        },
        "distractorWhy": {
            "1": "Rasio Reamur terhadap Celcius adalah 4 berbanding 5, bukan bernilai sama 5 berbanding 5.",
            "2": "Celcius memiliki 100 skala (faktor 5) sedangkan Reamur memiliki 80 skala (faktor 4), urutan ini tertukar.",
            "3": "Rasio 10 : 8 : 12 keliru pada rentang Fahrenheit yang seharusnya 180 bukan 120."
        }
    },
    {
        "id": "ipa-d-7-b3-q04",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 90-91), skala suhu Kelvin disepakati ilmuwan dunia sebagai satuan baku Sistem Internasional (SI) untuk suhu mutlak karena…",
        "options": [
            "Titik nol Kelvin (0 K) merupakan suhu nol mutlak di mana seluruh partikel materi berhenti bergerak dan tidak memiliki energi panas sama sekali",
            "Termometer Kelvin menggunakan zat cair raksa yang berwarna emas berkilau",
            "Skala Kelvin hanya berlaku untuk mengukur suhu planet di luar tata surya",
            "Kelvin tidak dapat diubah ke skala Celcius karena tidak memiliki angka derajat"
        ],
        "answer": 0,
        "why": {
            "0": "Skala Kelvin tidak menggunakan derajat karena merupakan skala termodinamika mutlak, di mana 0 K (-273,15°C) adalah batas terendah energi kinetik materi di alam semesta."
        },
        "distractorWhy": {
            "1": "Penetapan skala termodinamika Kelvin didasarkan pada energi termal partikel, bukan warna cairan pengisi pipa.",
            "2": "Skala Kelvin digunakan di laboratorium fisika bumi dan universal di seluruh cabang sains modern.",
            "3": "Skala Kelvin dapat dikonversi langsung ke Celcius dengan formula T_C = T_K - 273."
        }
    },
    {
        "id": "ipa-d-7-b3-q05",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 91), jika suhu air hangat untuk mandi diukur dengan termometer Celcius menunjukkan angka 45°C, maka suhu air tersebut dalam skala Kelvin adalah…",
        "options": [
            "318 K",
            "228 K",
            "450 K",
            "373 K"
        ],
        "answer": 0,
        "why": {
            "0": "Konversi Celcius ke Kelvin adalah T_K = T_C + 273 = 45 + 273 = 318 K."
        },
        "distractorWhy": {
            "1": "Nilai 228 K diperoleh dari pengurangan keliru 273 - 45.",
            "2": "Nilai 450 K diperoleh dari pengalian angka 45 dengan angka 10.",
            "3": "Nilai 373 K adalah titik didih air pada tekanan 1 atmosfer (100°C)."
        }
    },

    # --- SUBBAB B: Kalor & Perpindahannya (hal. 92-100) ---
    {
        "id": "ipa-d-7-b3-q06",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 92 & 100), perbedaan konsep yang paling mendasar antara SUHU dan KALOR adalah…",
        "options": [
            "Suhu adalah derajat ukuran panas dinginnya suatu zat, sedangkan kalor adalah energi panas yang berpindah dari benda bersuhu lebih tinggi ke lebih rendah",
            "Suhu adalah bentuk energi mekanik, sedangkan kalor adalah besaran kecepatan gerak benda",
            "Suhu dapat diukur dengan kalorimeter, sedangkan kalor diukur dengan termometer kaca",
            "Suhu selalu berpindah ke udara, sedangkan kalor selalu tersimpan diam di dalam zat padat"
        ],
        "answer": 0,
        "why": {
            "0": "Suhu mengukur energi kinetik translasi rata-rata partikel dalam suatu benda, sedangkan kalor adalah aliran energi termal akibat perbedaan suhu."
        },
        "distractorWhy": {
            "1": "Suhu bukan energi mekanik melainkan besaran pokok termodinamika, dan kalor adalah energi panas.",
            "2": "Termometer digunakan untuk mengukur suhu, sedangkan kalorimeter digunakan untuk mengukur jumlah kalor.",
            "3": "Kalor yang berpindah karena perbedaan potensial termal, bukan suhu yang berpindah."
        }
    },
    {
        "id": "ipa-d-7-b3-q07",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 100 Ayo Uji Kemampuan No. 1), mengapa air di dalam panci akan mendidih jauh lebih cepat apabila panci ditutup rapat selama proses pemanasan?",
        "options": [
            "Tutup panci menahan uap panas dan energi kalor agar tidak lepas ke udara luar sehingga energi panas terperangkap menaikkan suhu air secara efisien",
            "Tutup panci bereaksi kimia dengan air sehingga mengubah air langsung menjadi gas pada suhu rendah",
            "Tutup panci menghentikan gaya gravitasi sehingga air tidak dapat mengalir ke dasar",
            "Tutup panci menurunkan massa air menjadi separuh sehingga pemanasan terasa lebih ringan"
        ],
        "answer": 0,
        "why": {
            "0": "Menutup panci mereduksi kehilangan kalor akibat konveksi udara dan penguapan terbuka, menjaga uap panas bertekanan di dalam wadah mempercepat kenaikan suhu air."
        },
        "distractorWhy": {
            "1": "Tutup panci bekerja secara prinsip fisika penahanan energi termal, tanpa reaksi kimia pengubahan wujud instan.",
            "2": "Tutup panci tidak mengubah gaya gravitasi bumi yang tetap bekerja pada cairan.",
            "3": "Massa air tetap kekal di dalam panci tertutup dan tidak berkurang menjadi separuh."
        }
    },
    {
        "id": "ipa-d-7-b3-q08",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 100 Ayo Uji Kemampuan No. 2), mengapa air yang telah dilarutkan banyak garam membutuhkan waktu pemanasan lebih lama untuk mendidih dibanding air murni dengan volume sama?",
        "options": [
            "Partikel garam terlarut mengikat molekul air sehingga meningkatkan titik didih larutan di atas 100°C dan membutuhkan tambahan energi kalor lebih besar",
            "Garam menyerap seluruh nyala api kompor sehingga air tidak menerima kalor sama sekali",
            "Garam mengubah wujud air menjadi logam padat yang kebal terhadap perpindahan panas",
            "Air asin memiliki titik didih pada suhu 0°C sehingga air tidak pernah dapat menghasilkan uap"
        ],
        "answer": 0,
        "why": {
            "0": "Fenomena kenaikan titik didih (sifat koligatif): ion natrium dan klorida terlarut merintangi pelepasan molekul air ke fase uap, sehingga larutan garam mendidih pada suhu lebih tinggi dari 100°C."
        },
        "distractorWhy": {
            "1": "Garam tidak memadamkan api kompor; kalor tetap dihantarkan melalui dasar panci ke larutan.",
            "2": "Larutan garam tetap berwujud cairan homogen dan menghantarkan panas secara konveksi.",
            "3": "Suhu 0°C adalah titik beku air murni, bukan titik didih larutan garam."
        }
    },
    {
        "id": "ipa-d-7-b3-q09",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 94 Tabel 3.1), air memiliki nilai kalor jenis yang sangat tinggi yaitu 4.184 J/(kg·K). Ciri fisis dari materi yang memiliki kalor jenis tinggi adalah…",
        "options": [
            "Dapat menyerap banyak energi kalor dalam jumlah besar tetapi hanya mengalami kenaikan suhu yang relatif sedikit",
            "Sangat cepat mengalami kenaikan suhu ekstrem meskipun hanya diberi kalor yang sangat kecil",
            "Tidak dapat dipanaskan dan langsung membeku ketika diletakkan di atas kompor",
            "Selalu menguap menjadi gas sebelum suhu mencapai 10 derajat Celcius"
        ],
        "answer": 0,
        "why": {
            "0": "Kalor jenis c menyatakan kalor yang diperlukan untuk menaikkan 1 kg zat sebesar 1 K. Semakin besar nilai c, semakin banyak kalor yang diserap untuk perubahan suhu yang sama."
        },
        "distractorWhy": {
            "1": "Zat yang cepat naik suhunya saat diberi sedikit kalor adalah zat berkalor jenis rendah seperti logam.",
            "2": "Pemberian kalor pada zat cair bersuhu kamar akan menaikkan suhunya, bukan memicunya membeku.",
            "3": "Air mendidih dan menguap pada 100°C di tekanan standar, jauh di atas 10°C."
        }
    },
    {
        "id": "ipa-d-7-b3-q10",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan persamaan kalor Q = m · c · ΔT (hal. 95), berapakah kalor yang dilepaskan oleh 2 kg daging sapi (kalor jenis c = 3.500 J/(kg·K)) ketika didinginkan dari suhu 25°C menjadi 5°C di dalam kulkas?",
        "options": [
            "140.000 Joule (140 kJ)",
            "70.000 Joule (70 kJ)",
            "210.000 Joule (210 kJ)",
            "17.500 Joule (17,5 kJ)"
        ],
        "answer": 0,
        "why": {
            "0": "Perhitungan: Q = m x c x ΔT = 2 kg x 3.500 J/(kg·K) x (25 - 5) K = 7.000 x 20 = 140.000 Joule (140 kJ)."
        },
        "distractorWhy": {
            "1": "Nilai 70.000 Joule keliru karena hanya menghitung untuk selisih suhu 10 K (2 x 3.500 x 10).",
            "2": "Nilai 210.000 Joule keliru karena mengalikan selisih suhu 30 K.",
            "3": "Nilai 17.500 Joule diperoleh dari pembagian keliru antara massa dan selisih suhu."
        }
    },
    {
        "id": "ipa-d-7-b3-q11",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 99-100), rasa hangat yang kita rasakan di kulit saat berdiri di dekat api unggun atau di bawah sinar matahari langsung dihantarkan melalui mekanisme…",
        "options": [
            "Radiasi (pancaran gelombang elektromagnetik tanpa memerlukan zat perantara materi)",
            "Konduksi melalui gesekan molekul udara padat",
            "Konveksi air mendidih yang mengalir di udara terbuka",
            "Kondensasi uap es yang jatuh ke permukaan kulit"
        ],
        "answer": 0,
        "why": {
            "0": "Radiasi termal merambat dalam bentuk gelombang elektromagnetik (inframerah) dan dapat melintasi ruang hampa udara antara matahari dan bumi."
        },
        "distractorWhy": {
            "1": "Konduksi memerlukan kontak fisik langsung antarpartikel zat padat, bukan perambatan jarak jauh di udara.",
            "2": "Konveksi membutuhkan aliran massa fluida cair/gas, bukan pancaran radiasi langsung.",
            "3": "Kondensasi adalah perubahan wujud gas menjadi cair, bukan mekanisme perpindahan panas radiasi."
        }
    },
    {
        "id": "ipa-d-7-b3-q12",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 98 Gambar 3.10), perpindahan kalor pada air yang sedang dipanaskan di mana partikel air panas di dasar panci bergerak naik ke atas dan air dingin di atas turun ke bawah disebut…",
        "options": [
            "Konveksi",
            "Konduksi",
            "Radiasi",
            "Refleksi"
        ],
        "answer": 0,
        "why": {
            "0": "Konveksi adalah perpindahan kalor pada zat cair atau gas yang disertai perpindahan fisik partikel-partikel zat tersebut akibat perbedaan massa jenis fluida panas dan dingin."
        },
        "distractorWhy": {
            "1": "Konduksi adalah perpindahan kalor melalui getaran partikel tanpa perpindahan zat perantaranya (umum pada zat padat).",
            "2": "Radiasi adalah pancaran gelombang elektromagnetik tanpa memerlukan zat perantara materi.",
            "3": "Refleksi adalah pemantulan gelombang, bukan mekanisme perambatan kalor materi fluida."
        }
    },

    # --- SUBBAB C: Pemuaian & Bimetal (hal. 101-106) ---
    {
        "id": "ipa-d-7-b3-q13",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 101 Gambar 3.13), mengapa bingkai jendela kaca di rumah sengaja dirancang memiliki celah kelonggaran yang sedikit lebih lebar daripada ukuran kacanya?",
        "options": [
            "Untuk memberi ruang bagi kaca memuai saat terkena terik panas matahari di siang hari sehingga kaca tidak retak atau pecah",
            "Agar angin kencang dapat meniup kaca hingga terlepas dari dudukannya",
            "Untuk mempercepat kaca mencair menjadi cairan pada suhu kamar",
            "Agar kaca dapat digeser dengan mudah tanpa menggunakan engsel jendela"
        ],
        "answer": 0,
        "why": {
            "0": "Zat padat mengalami pertambahan ukuran (pemuaian luas/volume) saat suhunya naik. Celah bingkai mengantisipasi desakan pemuaian kaca saat panas terik."
        },
        "distractorWhy": {
            "1": "Bingkai dirancang untuk menahan kaca dengan kokoh dan aman dari terpaan angin badai.",
            "2": "Kaca jendela memiliki titik leleh sangat tinggi (di atas 1.000°C) dan tidak akan mencair pada suhu cuaca kamar.",
            "3": "Fungsi celah adalah kompensasi termal pemuaian bahan, bukan mekanisme pergeseran jendela."
        }
    },
    {
        "id": "ipa-d-7-b3-q14",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 102 Gambar 3.14), pada sambungan rel kereta api baja dan konstruksi jembatan logam selalu sengaja dipasang dengan memberi celah renggang. Tujuan teknis dari celah tersebut adalah…",
        "options": [
            "Mencegah rel kereta api memuai saling mendesak dan membengkok melengkung pada siang hari yang terik",
            "Mengurangi berat rel kereta api agar bantalan rel tidak ambles ke tanah",
            "Membuat roda kereta api bersuara ritmis saat melintas di atas rel",
            "Menampung air hujan agar air tidak membasahi permukaan bantalan kayu rel"
        ],
        "answer": 0,
        "why": {
            "0": "Baja rel memanjang saat mengalami kenaikan suhu akibat panas matahari dan gesekan roda. Celah ekspansi menampung pertambahan panjang sehingga rel tidak bengkok bergelombang."
        },
        "distractorWhy": {
            "1": "Celah kecil di antara sambungan tidak secara signifikan mengurangi total bobot tonase rel baja.",
            "2": "Suara benturan roda adalah dampak samping sambungan, bukan tujuan rekayasa teknik keselamatan.",
            "3": "Celah sambungan dibuat murni untuk toleransi pemuaian termal panjang logam, bukan saluran drainase air."
        }
    },
    {
        "id": "ipa-d-7-b3-q15",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 106 Ayo Uji Kemampuan No. 2 & Tabel 3.3), sebuah keping bimetal dibuat dari lempeng tembaga (koefisien muai 16,6 x 10⁻⁶/°C) dan kuningan (koefisien muai 19 x 10⁻⁶/°C). Jika bimetal tersebut dipanaskan secara merata, bagaimanakah arah kelengkungannya?",
        "options": [
            "Bimetal melengkung ke arah tembaga, karena kuningan memiliki koefisien muai lebih besar sehingga memanjang lebih panjang dan mendorong tembaga ke sisi dalam lengkungan",
            "Bimetal melengkung ke arah kuningan, karena tembaga memuai lebih panjang daripada kuningan",
            "Bimetal tetap lurus sempurna karena kedua logam menolak pemuaian satu sama lain",
            "Bimetal akan terbelah dua secara otomatis saat terkena nyala api"
        ],
        "answer": 0,
        "why": {
            "0": "Keping bimetal yang dipanaskan selalu melengkung ke arah logam yang koefisien muainya lebih kecil (tembaga), karena logam berkoefisien lebih besar (kuningan) bertambah lebih panjang."
        },
        "distractorWhy": {
            "1": "Tembaga memiliki koefisien muai lebih kecil dari kuningan sehingga sisi tembaga berada di busur dalam (melengkung ke arah tembaga).",
            "2": "Perbedaan pertambahan panjang pada dua logam yang direkatkan erat memaksa keping melengkung, tidak mungkin tetap lurus.",
            "3": "Sambungan rekat bimetal logam dirancang kuat dan tidak terbelah pada batas suhu pemanasan standar."
        }
    },
    {
        "id": "ipa-d-7-b3-q16",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 103), sifat pembengkokan keping bimetal saat terjadi perubahan suhu banyak dimanfaatkan dalam teknologi peralatan rumah tangga sebagai…",
        "options": [
            "Sakelar otomatis (termostat) pengatur suhu pada setrika listrik dan penanak nasi (rice cooker)",
            "Sekring penguat arus listrik tegangan tinggi pada tiang trafo PLN",
            "Elemen pemanas utama yang menghasilkan nyala api di dalam kompor gas",
            "Bahan isolator pembungkus kabel tembaga agar tidak menyengat tangan"
        ],
        "answer": 0,
        "why": {
            "0": "Termostat bimetal memutus kontak listrik saat alat mencapai batas suhu panas maksimal (membengkok membuka sakelar) dan menyambung kembali saat dingin."
        },
        "distractorWhy": {
            "1": "Sekring pengaman arus listrik bekerja dengan melelehkan kawat tipis saat kelebihan beban, bukan prinsip kelengkungan bimetal.",
            "2": "Bimetal bukan penghasil api pembakaran; bimetal berfungsi sebagai sensor dan sakelar mekanik kontrol suhu.",
            "3": "Bimetal tersusun atas konduktor logam ganda, bukan bahan isolator fleksibel pembungkus kabel."
        }
    },
    {
        "id": "ipa-d-7-b3-q17",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan data Tabel 3.3 (hal. 104), di antara logam aluminium (koefisien muai 22,5 x 10⁻⁶/°C), tembaga (16,6 x 10⁻⁶/°C), dan baja (12 x 10⁻⁶/°C), jika ketiga batang logam yang panjang awalnya sama dipanaskan pada rentang kenaikan suhu yang identik, urutan pertambahan panjang dari yang paling besar ke paling kecil adalah…",
        "options": [
            "Aluminium, disusul tembaga, dan paling kecil baja",
            "Baja, disusul tembaga, dan paling kecil aluminium",
            "Tembaga, disusul baja, dan paling kecil aluminium",
            "Ketiga logam mengalami pertambahan panjang yang persis sama"
        ],
        "answer": 0,
        "why": {
            "0": "Rumus pemuaian panjang adalah ΔL = L₀ · α · ΔT. Karena L₀ dan ΔT identik, pertambahan panjang ΔL berbanding lurus dengan koefisien muai panjang α (Aluminium 22,5 > Tembaga 16,6 > Baja 12)."
        },
        "distractorWhy": {
            "1": "Baja memiliki nilai koefisien muai terkecil di antara ketiganya sehingga pertambahan panjangnya paling sedikit, bukan paling besar.",
            "2": "Aluminium memiliki nilai koefisien terbesar sehingga menempati urutan pertama pemuaian.",
            "3": "Zat yang berbeda memiliki struktur ikatan atom yang berbeda sehingga menghasilkan laju pemuaian yang berbeda."
        }
    },
    {
        "id": "ipa-d-7-b3-q18",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 105 & 106 Ayo Uji Kemampuan No. 3), prinsip pemuaian zat gas (udara) yang dimanfaatkan pada penerbangan balon udara atau lampion terbang adalah…",
        "options": [
            "Udara di dalam balon yang dipanaskan akan memuai sehingga massa jenisnya mengecil dan menjadi lebih ringan daripada udara dingin di sekitarnya, menghasilkan gaya apung ke atas",
            "Udara panas menarik molekul oksigen bumi sehingga menciptakan daya dorong roket",
            "Pemanasan udara menghasilkan medan magnet yang menolak permukaan tanah",
            "Balon udara terbang karena udara di dalam balon membeku menjadi es padat yang sangat ringan"
        ],
        "answer": 0,
        "why": {
            "0": "Ketika udara di dalam kantung balon dipanaskan, partikel udara memuai dan bergerak renggang, sehingga massa per volume (massa jenis) di dalam balon turun di bawah massa jenis udara luar."
        },
        "distractorWhy": {
            "1": "Balon udara terbang murni berdasarkan hukum Archimedes dan kerapatan fluida udara, bukan propulsi roket pembakaran.",
            "2": "Pemanasan udara tidak menimbulkan medan gaya tolak-menolak magnetik dengan tanah.",
            "3": "Es berwujud padat dan memiliki massa jenis jauh lebih besar daripada gas udara, tidak mungkin menerbangkan balon."
        }
    },

    # --- SUBBAB D: Pemanfaatan Energi Kalor (hal. 106-109) ---
    {
        "id": "ipa-d-7-b3-q19",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 106 Aktivitas Pemanfaatan Kalor), ketika seseorang menggoreng ayam menggunakan minyak kelapa di dalam wajan logam di atas kompor menyala, jenis perpindahan kalor yang terjadi berturut-turut adalah…",
        "options": [
            "Konduksi dari api kompor menembus wajan logam, konveksi pada sirkulasi cairan minyak panas, dan konduksi kalor meresap ke dalam daging ayam",
            "Radiasi langsung dari api menembus daging ayam tanpa melibatkan wajan dan minyak",
            "Konveksi dari api ke wajan, konduksi pada minyak, dan radiasi pada daging ayam",
            "Perpindahan energi kinetik murni tanpa melibatkan perpindahan energi kalor sama sekali"
        ],
        "answer": 0,
        "why": {
            "0": "Panas api berpindah melalui dinding wajan padat secara konduksi, lalu mengalir memanaskan fluida minyak secara konveksi sirkulasi, dan merambat masuk mematangkan serat daging secara konduksi."
        },
        "distractorWhy": {
            "1": "Wajan dan minyak kelapa merupakan medium fisik utama penghantar panas penggorengan, radiasi api terhalang oleh dasar wajan.",
            "2": "Perambatan kalor pada zat padat wajan adalah konduksi, sedangkan cairan minyak mengalir secara konveksi.",
            "3": "Memasak daging hingga matang merupakan proses termal pemanfaatan energi kalor nyata."
        }
    },
    {
        "id": "ipa-d-7-b3-q20",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 107 Gambar 3.21), pada fasilitas Pembangkit Listrik Tenaga Uap (PLTU), energi kalor dari pembakaran bahan bakar dimanfaatkan secara terpadu untuk…",
        "options": [
            "Mendidihkan air bertekanan tinggi menjadi uap bersuhu tinggi yang diarahkan untuk memutar bilah turbin pemutar generator listrik",
            "Membekukan air sungai agar menjadi es pelindung kabel bawah tanah",
            "Mendinginkan udara turbin agar generator tidak mengeluarkan arus listrik",
            "Membakar tiang listrik saluran transmisi agar kawat listrik memendek"
        ],
        "answer": 0,
        "why": {
            "0": "PLTU mengubah energi kimia/kalor bahan bakar menjadi energi termal uap bertekanan, yang selanjutnya menggerakkan energi kinetik turbin untuk menghasilkan energi listrik pada generator."
        },
        "distractorWhy": {
            "1": "PLTU menghasilkan energi uap panas, bukan instalasi pembekuan es kristal.",
            "2": "Generator dirancang justru untuk menghasilkan pasokan arus listrik dengan putaran turbin bertenaga uap kalor.",
            "3": "Saluran transmisi dijaga agar tidak terbakar demi kontinuitas distribusi listrik nasional."
        }
    },
    {
        "id": "ipa-d-7-b3-q21",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 108), dinding bagian dalam tabung termos air panas dibuat berlapis kaca mengilap seperti cermin dan memiliki ruang hampa udara di antara dua lapis dindingnya. Fungsi utama lapisan cermin mengilap tersebut adalah…",
        "options": [
            "Mencegah pelepasan kalor dari air panas melalui mekanisme radiasi dengan cara memantulkan kembali gelombang panas ke dalam termos",
            "Membuat air di dalam termos terlihat berwarna warni seperti pelangi",
            "Menghantarkan kalor air panas ke udara luar secepat mungkin",
            "Menghasilkan arus listrik untuk menyalakan lampu indikator termos"
        ],
        "answer": 0,
        "why": {
            "0": "Permukaan perak/mengilap memantulkan kembali radiasi inframerah panas ke dalam air, sementara ruang hampa udara menghentikan konduksi dan konveksi, menjaga air tetap panas berjam-jam."
        },
        "distractorWhy": {
            "1": "Cermin termos tertutup rapat di dalam dinding bejana dan berfungsi untuk fungsi termal, bukan estetika tampilan air.",
            "2": "Tujuan termos adalah mempertahankan suhu panas air selama mungkin, bukan melepaskannya keluar.",
            "3": "Termos bekerja secara pasif termodinamika tanpa memerlukan rangkaian arus listrik."
        }
    }
]

print(f"Bab 3 items crafted: {len(bab3_items)}")

# Append Bab 3 competency
new_comp = {
    "code": "KOMP-IPA-D-7-BAB3-01",
    "grade": 7,
    "name": "Suhu, Kalor, dan Pemuaian",
    "materi": "Konsep Suhu & Skala Termometer, Kalor & Perubahan Suhu/Wujud, Pemuaian Zat Padat Cair Gas, Pemanfaatan Energi Kalor",
    "cpRef": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi) — Bab 3",
    "items": bab3_items
}

bank_data['competencies'].append(new_comp)

with open(r'c:\Users\hp\fiezel-apps\content\mapel\mapel-ipa-d.json', 'w', encoding='utf-8') as f:
    json.dump(bank_data, f, ensure_ascii=False, indent=2)

total_now = sum(len(c['items']) for c in bank_data['competencies'])
print(f"BERHASIL! Bank mapel IPA Fase D kini memuat {len(bank_data['competencies'])} bab dan {total_now} butir soal autentik!")
