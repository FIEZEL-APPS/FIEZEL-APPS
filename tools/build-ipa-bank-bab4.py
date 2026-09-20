import json

# Load existing bank data
with open(r'c:\Users\hp\fiezel-apps\content\mapel\mapel-ipa-d.json', 'r', encoding='utf-8') as f:
    bank_data = json.load(f)

print(f"Existing competencies: {len(bank_data['competencies'])}")
total_prev_items = sum(len(c['items']) for c in bank_data['competencies'])
print(f"Total previous items: {total_prev_items}")

bab4_items = [
    # --- SUBBAB A: Gerak Benda (hal. 113-124) ---
    {
        "id": "ipa-d-7-b4-q01",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 114-115), perbedaan mendasar antara JARAK dan PERPINDAHAN dalam konsep gerak fisika adalah…",
        "options": [
            "Jarak adalah panjang seluruh lintasan yang ditempuh benda tanpa memperhatikan arah (skalar), sedangkan perpindahan adalah selisih posisi akhir terhadap posisi awal beserta arahnya (vektor)",
            "Jarak selalu memiliki arah kompas, sedangkan perpindahan tidak memiliki arah",
            "Jarak hanya berlaku pada benda diam, sedangkan perpindahan hanya berlaku pada benda jatuh bebas",
            "Jarak dan perpindahan selalu memiliki nilai angka yang sama pada semua jenis lintasan berputar"
        ],
        "answer": 0,
        "why": {
            "0": "Jarak adalah besaran skalar yang mengukur total akumulasi panjang lintasan tempuh, sedangkan perpindahan adalah besaran vektor yang mengukur perubahan posisi garis lurus dari titik awal ke titik akhir."
        },
        "distractorWhy": {
            "1": "Perpindahan yang merupakan besaran vektor terikat pada arah, bukan jarak.",
            "2": "Jarak dan perpindahan sama-sama besaran kinematis untuk mendeskripsikan benda yang bergerak.",
            "3": "Pada lintasan berbelok atau melingkar, nilai jarak tempuh selalu lebih besar daripada nilai perpindahannya."
        }
    },
    {
        "id": "ipa-d-7-b4-q02",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 115), seorang siswa berjalan ke arah timur sejauh 50 meter, kemudian berbalik arah berjalan ke barat sejauh 20 meter dalam waktu 25 sekon. Nilai jarak tempuh dan perpindahan siswa tersebut berturut-turut adalah…",
        "options": [
            "Jarak = 70 meter; Perpindahan = 30 meter ke arah timur",
            "Jarak = 30 meter; Perpindahan = 70 meter ke arah barat",
            "Jarak = 70 meter; Perpindahan = 70 meter ke arah timur",
            "Jarak = 50 meter; Perpindahan = 20 meter ke arah timur"
        ],
        "answer": 0,
        "why": {
            "0": "Total jarak adalah penjumlahan seluruh lintasan: 50 m + 20 m = 70 meter. Perpindahan adalah posisi akhir relatif terhadap awal: 50 m - 20 m = 30 meter ke timur."
        },
        "distractorWhy": {
            "1": "Nilai 30 meter adalah perpindahan dan 70 meter adalah jarak, urutan dan arah pada opsi ini tertukar.",
            "2": "Perpindahan memperhitungkan arah balik sehingga nilainya 30 meter, bukan sama dengan total jarak 70 meter.",
            "3": "Jarak tempuh menjumlahkan kedua segmen gerak sehingga bernilai 70 meter, bukan hanya 50 meter."
        }
    },
    {
        "id": "ipa-d-7-b4-q03",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 115-116), perbedaan konsep antara KELAJUAN dan KECEPATAN adalah…",
        "options": [
            "Kelajuan adalah rasio jarak terhadap waktu tanpa memperhitungkan arah gerak (skalar), sedangkan kecepatan adalah perpindahan per satuan waktu disertai arah gerak (vektor)",
            "Kelajuan diukur dengan GPS satelit sedangkan kecepatan hanya diukur dengan termometer",
            "Kelajuan selalu bernilai negatif sedangkan kecepatan selalu bernilai positif",
            "Kelajuan hanya dimiliki oleh manusia sedangkan kecepatan hanya dimiliki oleh kendaraan bermotor"
        ],
        "answer": 0,
        "why": {
            "0": "Kelajuan (speed) mengukur cepatnya jarak ditempuh tanpa arah, sedangkan kecepatan (velocity) memperhitungkan vektor arah perpindahan benda per satuan waktu."
        },
        "distractorWhy": {
            "1": "Spidometer pada kendaraan mengukur kelajuan instan, sedangkan termometer adalah alat pengukur derajat suhu.",
            "2": "Kelajuan adalah besaran skalar yang selalu bernilai non-negatif (positif atau nol).",
            "3": "Konsep kelajuan dan kecepatan berlaku universal untuk seluruh objek bergerak di alam semesta."
        }
    },
    {
        "id": "ipa-d-7-b4-q04",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 117), sebuah mobil bergerak dengan kelajuan konstan 72 km/jam di jalan tol. Jika kelajuan tersebut dinyatakan dalam satuan Sistem Internasional (m/s), nilainya setara dengan…",
        "options": [
            "20 m/s",
            "72 m/s",
            "25 m/s",
            "15 m/s"
        ],
        "answer": 0,
        "why": {
            "0": "Konversi satuan: 72 km/jam = (72 x 1.000 m) / (3.600 s) = 72.000 / 3.600 = 20 m/s."
        },
        "distractorWhy": {
            "1": "Nilai 72 m/s keliru karena tidak mengonversikan satuan kilometer dan jam ke meter dan sekon.",
            "2": "Nilai 25 m/s adalah konversi dari kelajuan 90 km/jam.",
            "3": "Nilai 15 m/s adalah konversi dari kelajuan 54 km/jam."
        }
    },
    {
        "id": "ipa-d-7-b4-q05",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 123 Aktivitas 4.2 Balapan Mobil Layar), sebuah mobil-mobilan bertenaga angin melintasi lintasan lurus sepanjang 1 meter dalam waktu tempuh 0,5 detik. Kelajuan rata-rata mobil-mobilan tersebut adalah…",
        "options": [
            "2 m/s",
            "0,5 m/s",
            "1 m/s",
            "5 m/s"
        ],
        "answer": 0,
        "why": {
            "0": "Rumus kelajuan rata-rata v = s / t = 1 meter / 0,5 sekon = 2 m/s."
        },
        "distractorWhy": {
            "1": "Nilai 0,5 m/s diperoleh dari pembagian terbalik antara waktu terhadap jarak (0,5 / 1).",
            "2": "Nilai 1 m/s adalah kelajuan jika waktu tempuhnya 1 sekon penuh.",
            "3": "Nilai 5 m/s diperoleh dari pengalian angka yang keliru."
        }
    },
    {
        "id": "ipa-d-7-b4-q06",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 117), sebuah kendaraan yang semula berhenti diam di lampu merah kemudian melaju lurus hingga mencapai kecepatan 20 m/s dalam selang waktu 5 detik. Percepatan rata-rata kendaraan tersebut adalah…",
        "options": [
            "4 m/s²",
            "100 m/s²",
            "15 m/s²",
            "0,25 m/s²"
        ],
        "answer": 0,
        "why": {
            "0": "Rumus percepatan: a = (v_akhir - v_awal) / t = (20 m/s - 0 m/s) / 5 s = 20 / 5 = 4 m/s²."
        },
        "distractorWhy": {
            "1": "Nilai 100 m/s² diperoleh dari perkalian keliru kecepatan dikalikan waktu (20 x 5).",
            "2": "Nilai 15 m/s² diperoleh dari pengurangan kecepatan dikurangi waktu (20 - 5).",
            "3": "Nilai 0,25 m/s² diperoleh dari pembagian terbalik waktu dibagi kecepatan (5 / 20)."
        }
    },

    # --- SUBBAB B: Konsep Gaya (hal. 124-130) ---
    {
        "id": "ipa-d-7-b4-q07",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 124), pengertian GAYA dalam ilmu fisika dan pengaruhnya terhadap benda adalah…",
        "options": [
            "Tarikan atau dorongan yang dapat menyebabkan perubahan kecepatan gerak, arah gerak, maupun bentuk suatu benda",
            "Suhu panas yang memancar dari suatu zat ketika terbakar",
            "Kandungan massa atom yang tidak pernah dapat dipindahkan",
            "Energi kinetik yang hanya bekerja di ruang hampa udara"
        ],
        "answer": 0,
        "why": {
            "0": "Gaya didefinisikan sebagai interaksi berupa tarikan atau dorongan yang bekerja pada benda dan dapat memicu perubahan posisi, kecepatan, maupun bentuk geometri benda."
        },
        "distractorWhy": {
            "1": "Suhu panas yang memancar adalah energi termal radiasi kalor, bukan konsep mekanika gaya.",
            "2": "Kandungan materi berkaitan dengan massa, bukan gaya mekanik luar.",
            "3": "Gaya bekerja secara nyata di segala medium baik di atmosfer udara maupun di ruang hampa antariksa."
        }
    },
    {
        "id": "ipa-d-7-b4-q08",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 125), dua orang siswa mendorong sebuah meja di ruang kelas. Siswa A mendorong dengan gaya 100 N ke arah kanan, sedangkan Siswa B menahan meja dengan gaya 40 N ke arah kiri. Resultan gaya yang bekerja pada meja adalah…",
        "options": [
            "60 N ke arah kanan",
            "140 N ke arah kanan",
            "60 N ke arah kiri",
            "4.000 N ke arah kanan"
        ],
        "answer": 0,
        "why": {
            "0": "Karena kedua gaya berlawanan arah, resultan gaya adalah selisih keduanya: R = F_kanan - F_kiri = 100 N - 40 N = 60 N mengikuti arah gaya yang lebih besar (ke kanan)."
        },
        "distractorWhy": {
            "1": "Nilai 140 N adalah hasil penjumlahan jika kedua gaya bekerja searah ke arah yang sama.",
            "2": "Arah resultan mengikuti gaya terbesar yaitu 100 N ke kanan, bukan ke kiri.",
            "3": "Nilai 4.000 N diperoleh dari perkalian kedua gaya, bukan penjumlahan resultan vektor."
        }
    },
    {
        "id": "ipa-d-7-b4-q09",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 126-127), perbedaan antara GAYA GESEK STATIS dan GAYA GESEK KINETIS pada sebuah balok kayu di atas lantai adalah…",
        "options": [
            "Gaya gesek statis bekerja saat benda masih diam hingga tepat akan bergerak, sedangkan gaya gesek kinetis bekerja saat benda sudah meluncur bergerak",
            "Gaya gesek statis selalu searah dengan gerak benda sedangkan gaya gesek kinetis berlawanan arah",
            "Gaya gesek statis hanya terjadi pada zat cair sedangkan gaya gesek kinetis terjadi pada zat padat",
            "Gaya gesek statis nilainya selalu nol pada semua jenis permukaan lantai"
        ],
        "answer": 0,
        "why": {
            "0": "Gaya gesek statis menahan benda agar tetap diam selama gaya luar belum melampaui gesekan statis maksimum, setelah bergerak gaya gesek berubah menjadi kinetis dengan nilai konstan."
        },
        "distractorWhy": {
            "1": "Semua gaya gesek selalu berlawanan arah dengan kecenderungan gerak atau arah laju benda.",
            "2": "Gesekan statis dan kinetis adalah konsep mekanika kontak antarpermukaan zat padat.",
            "3": "Gaya gesek statis bernilai nyata menyesuaikan besarnya gaya dorong luar hingga batas maksimalnya."
        }
    },
    {
        "id": "ipa-d-7-b4-q10",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 127), contoh penerapan gaya gesek yang MENGUNTUNGKAN dalam kehidupan sehari-hari adalah…",
        "options": [
            "Pembuatan alur pada permukaan ban kendaraan dan karet rem sepeda untuk mencengkeram jalan serta menghentikan laju roda",
            "Gesekan pada rantai dan gir sepeda motor yang membuatnya cepat aus",
            "Gesekan antara piston mesin dengan dinding silinder yang menimbulkan panas berlebih",
            "Gesekan lambung kapal laut dengan air yang memperlambat laju pelayaran"
        ],
        "answer": 0,
        "why": {
            "0": "Alur ban dan karet rem sengaja dirancang memiliki koefisien gesek tinggi untuk mencegah kendaraan tergelincir (slip) dan memungkinkan pengereman yang aman."
        },
        "distractorWhy": {
            "1": "Ausnya rantai gir motor adalah contoh gaya gesek yang merugikan sehingga perlu diberi minyak pelumas.",
            "2": "Keausan piston mesin adalah contoh gesekan merugikan yang menurunkan efisiensi mesin.",
            "3": "Hambatan fluida air pada lambung kapal adalah hambatan gerak yang merugikan efisiensi bahan bakar."
        }
    },
    {
        "id": "ipa-d-7-b4-q11",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 127), teknologi kereta cepat Maglev (Magnetic Levitation) dirancang dapat melaju dengan kelajuan luar biasa tinggi karena…",
        "options": [
            "Kereta melayang di atas rel menggunakan gaya tolak-menolak magnetik sehingga gaya gesek antara roda dan rel kereta menjadi hilang",
            "Kereta menggunakan bahan bakar bensin berkadar oktan seratus persen",
            "Kereta berjalan di dalam pipa hampa air bawah laut",
            "Kereta memiliki massa jenis yang lebih kecil daripada massa jenis udara"
        ],
        "answer": 0,
        "why": {
            "0": "Dengan melayang setinggi beberapa milimeter di atas lintasan melalui levitasi magnetik, kontak fisik roda dan rel ditiadakan sehingga gesekan mekanis nol dan kereta melaju sangat efisien."
        },
        "distractorWhy": {
            "1": "Kereta maglev digerakkan oleh motor induksi linear bertenaga listrik, bukan mesin pembakaran bensin biasa.",
            "2": "Maglev beroperasi di atas jalur rel pemandu permukaan terbuka, bukan pipa hampa air bawah laut.",
            "3": "Bodi maglev terbuat dari paduan logam berat dan kokoh, bukan benda terapung massa jenis rendah."
        }
    },

    # --- SUBBAB C: Hukum-Hukum Newton tentang Gerak (hal. 130-134) ---
    {
        "id": "ipa-d-7-b4-q12",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 129), tubuh penumpang bus kota akan terdorong ke arah depan ketika sopir menginjak rem secara mendadak. Fenomena ini merupakan bukti dari…",
        "options": [
            "Hukum I Newton (prinsip kelembaman atau inersia benda yang cenderung mempertahankan keadaan geraknya)",
            "Hukum III Newton tentang gaya dorong gravitasi bumi",
            "Hukum pemuaian zat padat akibat panas rem bus",
            "Hilangnya massa tubuh penumpang saat bus melambat"
        ],
        "answer": 0,
        "why": {
            "0": "Hukum I Newton menyatakan benda cenderung mempertahankan kecepatannya. Saat bus direm, tubuh penumpang yang semula bergerak maju cenderung terus bergerak maju."
        },
        "distractorWhy": {
            "1": "Terdorong ke depan adalah sifat kelembaman massa penumpang (Hukum I Newton), bukan interaksi gaya aksi-reaksi roket.",
            "2": "Pengereman berkaitan dengan dinamika gerak dan inersia, bukan peristiwa pemuaian luas benda padat.",
            "3": "Massa tubuh penumpang bersifat tetap dan tidak berkurang akibat pengereman mendadak."
        }
    },
    {
        "id": "ipa-d-7-b4-q13",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 129), besaran fisis yang menjadi ukuran tingkat kelembaman (inersia) suatu benda untuk mempertahankan keadaan geraknya adalah…",
        "options": [
            "Massa benda, di mana semakin besar massa suatu benda maka semakin besar kelembamannya dan semakin sulit diubah keadaan geraknya",
            "Warna permukaan benda, di mana warna terang memiliki inersia lebih tinggi",
            "Suhu benda, di mana benda panas tidak memiliki inersia sama sekali",
            "Volume wadah, di mana wadah tinggi selalu bergerak lebih cepat"
        ],
        "answer": 0,
        "why": {
            "0": "Massa inersial adalah ukuran kuantitatif resistensi atau kelembaman suatu benda terhadap perubahan percepatan geraknya."
        },
        "distractorWhy": {
            "1": "Warna permukaan adalah sifat optik visual dan tidak memengaruhi kelembaman mekanis benda.",
            "2": "Inersia bergantung murni pada massa materi benda, bukan derajat suhunya.",
            "3": "Bentuk geometri wadah tidak menentukan kelembaman mekanik tanpa memperhitungkan massanya."
        }
    },
    {
        "id": "ipa-d-7-b4-q14",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 131), Hukum II Newton dirumuskan dengan persamaan F = m · a. Jika sebuah balok kayu bermassa 20 kg didorong di atas lantai licin dengan gaya resultan 60 N, percepatan gerak balok tersebut adalah…",
        "options": [
            "3 m/s²",
            "1.200 m/s²",
            "40 m/s²",
            "0,33 m/s²"
        ],
        "answer": 0,
        "why": {
            "0": "Rumus percepatan Hukum II Newton: a = F / m = 60 N / 20 kg = 3 m/s²."
        },
        "distractorWhy": {
            "1": "Nilai 1.200 m/s² diperoleh dari perkalian keliru antara gaya dan massa (60 x 20).",
            "2": "Nilai 40 m/s² diperoleh dari pengurangan antara gaya dan massa (60 - 20).",
            "3": "Nilai 0,33 m/s² diperoleh dari pembagian terbalik massa dibagi gaya (20 / 60)."
        }
    },
    {
        "id": "ipa-d-7-b4-q15",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 131), jika gaya dorong resultan yang diberikan pada sebuah gerobak diduakalikan (menjadi 2F) sementara total massa gerobak dijaga tetap konstan, bagaimanakah perubahan percepatan gerak gerobak tersebut?",
        "options": [
            "Percepatan gerak gerobak menjadi 2 kali lipat dari percepatan semula",
            "Percepatan gerak gerobak menjadi separuh (1/2 kali) dari semula",
            "Percepatan gerak gerobak tetap sama tidak berubah",
            "Percepatan gerak gerobak langsung menjadi nol seketika"
        ],
        "answer": 0,
        "why": {
            "0": "Berdasarkan Hukum II Newton a = F / m, nilai percepatan berbanding lurus dengan resultan gaya. Jika gaya dilipatgandakan menjadi 2F, maka percepatannya pun meningkat dua kali lipat."
        },
        "distractorWhy": {
            "1": "Percepatan menjadi separuh jika massanya yang dilipatgandakan dengan gaya tetap, bukan saat gaya diperbesar.",
            "2": "Percepatan pasti berubah jika gaya luar yang bekerja mengalami pelipatgandaan nilai.",
            "3": "Percepatan bernilai nol hanya jika resultan gaya luar bernilai nol."
        }
    },
    {
        "id": "ipa-d-7-b4-q16",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 131 Aktivitas 4.4 Gerak pada Bidang Miring), faktor utama yang menyebabkan sebuah bola menggelinding turun dengan percepatan yang semakin besar ketika sudut kemiringan papan dipercuram adalah…",
        "options": [
            "Komponen gaya berat gravitasi yang sejajar dengan bidang miring menjadi semakin besar seiring membesarnya sudut kemiringan",
            "Massa bola bertambah berat secara otomatis saat diletakkan di papan curam",
            "Gaya gravitasi bumi berhenti menarik bola saat papan diposisikan landai",
            "Udara di sekitar papan miring berubah wujud menjadi zat padat pendorong"
        ],
        "answer": 0,
        "why": {
            "0": "Gaya penggerak bola di bidang miring berasal dari komponen gaya gravitasi sejajar lintasan (w sin theta). Semakin curam sudut, gaya penggerak semakin besar sehingga menghasilkan percepatan lebih tinggi."
        },
        "distractorWhy": {
            "1": "Massa bola bersifat konstan dan tidak dipengaruhi oleh kemiringan bidang lintasan.",
            "2": "Gaya gravitasi bumi selalu bekerja ke arah pusat bumi dengan percepatan g konstan.",
            "3": "Udara di sekitar bidang miring tetap berwujud gas fluida biasa dan tidak mengeras menjadi pendorong padat."
        }
    },
    {
        "id": "ipa-d-7-b4-q17",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 132), pernyataan yang paling tepat mengenai sifat pasangan GAYA AKSI-REAKSI menurut Hukum III Newton adalah…",
        "options": [
            "Memiliki nilai besar yang sama, berlawanan arah, dan bekerja pada dua benda yang berbeda sehingga tidak saling meniadakan",
            "Bekerja pada satu benda yang sama sehingga benda selalu berada dalam keadaan diam",
            "Gaya aksi selalu bernilai jauh lebih besar daripada gaya reaksi",
            "Gaya aksi terjadi seketika sedangkan gaya reaksi baru muncul setelah selang waktu satu jam"
        ],
        "answer": 0,
        "why": {
            "0": "Hukum III Newton menetapkan F_aksi = -F_reaksi. Syarat mutlaknya adalah kedua gaya bekerja secara serentak pada dua objek yang berlainan, sehingga keduanya tidak dapat saling menjumlahkan menjadi nol."
        },
        "distractorWhy": {
            "1": "Pasangan aksi-reaksi bekerja pada dua benda berbeda, bukan pada satu benda yang sama.",
            "2": "Besar gaya aksi selalu sama persis dengan besar gaya reaksinya pada tiap interaksi.",
            "3": "Gaya aksi dan reaksi muncul secara simultan bersamaan tanpa ada penundaan waktu."
        }
    },
    {
        "id": "ipa-d-7-b4-q18",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 132), mengapa saat seseorang mencangkul atau menggali tanah yang padat, kedua tangannya merasakan gaya sentakan keras yang melelahkan?",
        "options": [
            "Mata cangkul memberikan gaya aksi ke permukaan tanah, dan tanah secara bersamaan memberikan gaya reaksi yang besarnya sama ke arah cangkul dan tangan pencangkul",
            "Tanah menyerap seluruh energi tubuh pencangkul dan mengubahnya menjadi zat cair",
            "Gaya gravitasi bumi mendadak berbalik arah ke atas saat ujung cangkul mengenai tanah",
            "Kedua tangan pencangkul kehilangan massa otot saat mencangkul tanah kering"
        ],
        "answer": 0,
        "why": {
            "0": "Aplikasi nyata Hukum III Newton: dorongan mata cangkul ke tanah memicu gaya reaksi balik dari partikel tanah padat yang merambat melalui tangkai cangkul ke tangan pemegang."
        },
        "distractorWhy": {
            "1": "Tanah padat tidak menyerap energi menjadi zat cair; kelelahan otot timbul karena kerja mekanik melawan gaya reaksi tanah.",
            "2": "Arah gravitasi bumi tetap mengarah ke bawah menuju pusat bumi tanpa perubahan.",
            "3": "Massa biologis otot tidak hilang saat melakukan aktivitas fisik mencangkul."
        }
    },
    {
        "id": "ipa-d-7-b4-q19",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 132-133 Gambar 4.14 Aktivitas 4.5), sebuah kaleng penyiram tanaman yang digantung dengan tali berputar kencang ketika air memancar keluar dari lubang-lubang miring di bagian bawahnya karena…",
        "options": [
            "Pancaran air yang menyembur keluar memberikan gaya aksi ke satu arah, dan memicu gaya reaksi yang mendorong badan kaleng berputar ke arah sebaliknya",
            "Kaleng ditiup oleh angin topan buatan dari dalam air",
            "Air di dalam kaleng mengalami pemuaian volume ekstrem yang meledakkan wadah",
            "Massa jenis kaleng mendadak menjadi lebih ringan dari udara di atasnya"
        ],
        "answer": 0,
        "why": {
            "0": "Sesuai Hukum III Newton, semburan air yang memiliki momentum memicu gaya dorong reaksi balik pada lubang kaleng sehingga menghasilkan torsi yang memutar kaleng (prinsip kincir air putar)."
        },
        "distractorWhy": {
            "1": "Putaran kaleng murni ditimbulkan oleh dorongan semburan air keluar (aksi-reaksi), bukan oleh terpaan angin luar.",
            "2": "Air mengalir normal karena tekanan hidrostatis tanpa pemuaian ledakan termal.",
            "3": "Kaleng tetap bermassa dan berada di medium udara biasa."
        }
    },
    {
        "id": "ipa-d-7-b4-q20",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 133-134 Gambar 4.15 Proyek Roket Korek Api), prinsip kerja peluncuran roket korek api maupun roket antariksa modern menerapkan Hukum III Newton dengan cara…",
        "options": [
            "Gas panas hasil pembakaran menyembur kencang ke arah bawah (gaya aksi), menghasilkan gaya dorong reaksi yang sama besar mendorong badan roket meluncur ke atas",
            "Roket ditarik oleh medan magnet bintang-bintang di luar angkasa",
            "Alumunium foil mengubah bahan bakar korek api menjadi udara dingin pengapung",
            "Roket meluncur karena massa roket berkurang menjadi nol di udara"
        ],
        "answer": 0,
        "why": {
            "0": "Prinsip propulsi reaksi: gas hasil pembakaran disemburkan berkecepatan tinggi ke belakang/bawah (aksi), sehingga menimbulkan gaya dorong reaksi berkekuatan sama yang melontarkan roket ke depan/atas."
        },
        "distractorWhy": {
            "1": "Peluncuran roket mengandalkan propulsi dorongan massa gas semburan, bukan tarikan medan magnetik antariksa.",
            "2": "Aluminium foil berfungsi mengarahkan semburan gas bertekanan, bukan mengubah wujud bahan bakar menjadi udara dingin.",
            "3": "Badan roket tetap memiliki massa nyata selama penerbangan."
        }
    }
]

print(f"Bab 4 items crafted: {len(bab4_items)}")

# Append Bab 4 competency
new_comp = {
    "code": "KOMP-IPA-D-7-BAB4-01",
    "grade": 7,
    "name": "Gerak dan Gaya",
    "materi": "Gerak Benda: Jarak, Perpindahan, Kelajuan, Kecepatan; Konsep Gaya & Hukum Newton",
    "cpRef": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi) — Bab 4",
    "items": bab4_items
}

bank_data['competencies'].append(new_comp)

with open(r'c:\Users\hp\fiezel-apps\content\mapel\mapel-ipa-d.json', 'w', encoding='utf-8') as f:
    json.dump(bank_data, f, ensure_ascii=False, indent=2)

total_now = sum(len(c['items']) for c in bank_data['competencies'])
print(f"BERHASIL! Bank mapel IPA Fase D kini memuat {len(bank_data['competencies'])} bab dan {total_now} butir soal autentik!")
