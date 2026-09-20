import json

# Load existing Bab 1 items
with open(r'c:\Users\hp\fiezel-apps\content\mapel\mapel-ipa-d.json', 'r', encoding='utf-8') as f:
    existing_data = json.load(f)

bab1_items = existing_data['competencies'][0]['items']
print(f"Bab 1 items loaded: {len(bab1_items)}")

bab2_items = [
    # --- SUBBAB A: Wujud Zat dan Model Partikel (hal. 54-55) ---
    {
        "id": "ipa-d-7-b2-q01",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 54 Tabel 2.1 Sifat-Sifat Wujud Materi), zat berwujud padat memiliki bentuk dan volume yang tetap karena…",
        "options": [
            "Partikel-partikelnya tersusun sangat teratur, berdekatan rapat, dan memiliki gaya tarik antarpartikel yang sangat kuat",
            "Partikel-partikelnya bergerak sangat bebas dan saling berjauhan satu sama lain",
            "Partikel-partikelnya mudah dimampatkan sehingga dapat menempati segala bentuk wadah",
            "Partikel-partikelnya tidak memiliki ikatan sama sekali sehingga dapat mengalir bebas"
        ],
        "answer": 0,
        "why": {
            "0": "Partikel zat padat memiliki gaya tarik-menarik antarpartikel yang sangat kuat dan kerapatan tinggi, sehingga posisinya terkunci dan hanya bergetar di tempat."
        },
        "distractorWhy": {
            "1": "Pernyataan ini mencerminkan sifat partikel zat berwujud gas yang bergerak acak bebas.",
            "2": "Karakteristik mudah dimampatkan (kompresibilitas tinggi) adalah sifat zat gas, bukan zat padat.",
            "3": "Materi yang tidak memiliki ikatan kaku dan dapat mengalir adalah sifat zat cair dan gas (fluida)."
        }
    },
    {
        "id": "ipa-d-7-b2-q02",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 54 Ayo Uji Kemampuan No. 1a), mengapa kamu tidak dapat menghancurkan sebatang baja hanya dengan kekuatan tangan kosong?",
        "options": [
            "Ikatan kisi kristal antaratom baja tersusun sangat rapat dan gaya tariknya luar biasa kuat sehingga membutuhkan energi mekanik besar untuk memutusnya",
            "Partikel baja tidak memiliki massa jenis sehingga tidak dapat disentuh oleh tangan",
            "Baja merupakan zat cair yang membeku menjadi gas bertekanan tinggi",
            "Tangan manusia mengeluarkan suhu dingin yang membuat baja semakin mengeras"
        ],
        "answer": 0,
        "why": {
            "0": "Struktur kristal logam baja memiliki ikatan logam antarpartikel yang sangat kuat dan jarak partikel sangat rapat, menjadikannya sangat keras dan tahan tekanan tangan."
        },
        "distractorWhy": {
            "1": "Baja adalah materi nyata bermassa dan memiliki massa jenis logam yang tinggi sekitar 7.900 kg/m³.",
            "2": "Baja adalah logam padat sejati, bukan zat cair yang membeku menjadi gas.",
            "3": "Suhu tangan tidak memengaruhi kekuatan ikatan atom logam baja secara signifikan."
        }
    },
    {
        "id": "ipa-d-7-b2-q03",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 54 Ayo Uji Kemampuan No. 1b), susu murni dapat mengalir dan bentuknya selalu mengikuti wadah yang ditempatinya karena…",
        "options": [
            "Partikel-partikel zat cair memiliki ikatan yang cukup longgar sehingga dapat meluncur dan berpindah tempat melewati partikel lainnya",
            "Partikel zat cair tidak memiliki volume tetap sehingga ukurannya mengecil saat dituang",
            "Susu mengandung zat pengikis yang melarutkan dinding wadah penampungnya",
            "Gaya gravitasi bumi hanya bekerja pada zat berwujud cair dan tidak bekerja pada zat padat"
        ],
        "answer": 0,
        "why": {
            "0": "Gaya tarik antarpartikel zat cair tidak sekaku zat padat, memungkinkan partikel-partikelnya meluncur bebas saling melewati seraya mempertahankan volume tetap."
        },
        "distractorWhy": {
            "1": "Zat cair memiliki volume yang selalu tetap meskipun bentuk luarnya berubah-ubah mengikuti wadah.",
            "2": "Susu tidak mengikis wadah melainkan hanya menyesuaikan diri dengan bentuk ruang wadah penampung.",
            "3": "Gaya gravitasi bekerja secara universal pada seluruh materi baik padat, cair, maupun gas."
        }
    },
    {
        "id": "ipa-d-7-b2-q04",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 54 Ayo Uji Kemampuan No. 1c), seseorang dapat merasakan hembusan angin sejuk menerpa kulit wajahnya karena…",
        "options": [
            "Partikel-partikel gas udara bergerak acak dengan kecepatan tinggi dan menabrak permukaan kulit saat mengalir",
            "Gas udara memiliki ikatan partikel yang sangat kaku dan membentur wajah seperti lempengan besi",
            "Angin adalah zat padat mikro yang menempel permanen pada pori-pori kulit",
            "Udara tidak memiliki partikel sama sekali sehingga menciptakan ruang hampa di depan wajah"
        ],
        "answer": 0,
        "why": {
            "0": "Udara terdiri atas partikel-partikel gas yang bergerak bebas ke segala arah. Perbedaan tekanan udara menciptakan aliran angin yang partikelnya menabrak reseptor peraba di kulit."
        },
        "distractorWhy": {
            "1": "Gas memiliki partikel yang sangat renggang dan bebas bergerak, bukan ikatan kaku seperti besi.",
            "2": "Angin adalah aliran fluida gas materi, bukan butiran zat padat mikro yang menempel permanen.",
            "3": "Udara nyata memiliki massa dan tersusun atas molekul gas nitrogen, oksigen, dan gas lainnya."
        }
    },
    {
        "id": "ipa-d-7-b2-q05",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 54 Ayo Uji Kemampuan No. 2), proses DIFUSI zat berlangsung jauh lebih cepat di dalam medium gas dibandingkan di dalam medium cairan karena…",
        "options": [
            "Partikel gas memiliki jarak antarpartikel yang sangat renggang dan bergerak dengan energi kinetik jauh lebih tinggi dibanding cairan",
            "Partikel cairan tidak dapat bergerak sama sekali karena membeku di suhu ruang",
            "Gas memiliki gaya tarik antarpartikel yang lebih kuat daripada zat padat",
            "Difusi pada cairan membutuhkan wadah yang terbuat dari bahan logam penghantar panas"
        ],
        "answer": 0,
        "why": {
            "0": "Difusi adalah pergerakan partikel dari konsentrasi tinggi ke rendah. Pada gas, ruang kosong antarpartikel sangat besar dan gerakannya sangat cepat sehingga partikel mudah menyusup."
        },
        "distractorWhy": {
            "1": "Partikel cairan tetap bergerak meluncur, hanya saja ruang geraknya lebih terbatas dibanding gas.",
            "2": "Gaya tarik antarpartikel gas justru paling lemah di antara ketiga wujud materi.",
            "3": "Difusi zat cair berlangsung alami pada segala jenis wadah tanpa memerlukan penghantar panas."
        }
    },
    {
        "id": "ipa-d-7-b2-q06",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 54 Ayo Uji Kemampuan No. 3), ketika gula pasir dituangkan dari toples ke dalam mangkuk, bentuk tumpukan gula menyesuaikan mangkuk. Apakah gula pasir termasuk zat padat atau zat cair?",
        "options": [
            "Zat padat, karena setiap butiran kristal gula pasir secara individu mempertahankan bentuk dan volumenya sendiri yang tetap",
            "Zat cair, karena gula pasir dapat mengalir dan permukaannya selalu mendatar sempurna seperti air",
            "Zat gas, karena butiran gula pasir dapat terbang melayang di udara hampa",
            "Perantara zat padat dan cair yang tidak memiliki kepastian wujud materi"
        ],
        "answer": 0,
        "why": {
            "0": "Partikel gula pasir berbentuk butiran kristal padat (granular solid). Tumpukannya tampak mengalir karena ukuran butirannya kecil, tetapi masing-masing butir tidak berubah bentuk."
        },
        "distractorWhy": {
            "1": "Gula pasir bukan zat cair; butiran gula tidak meleleh saat dituang dan tumpukannya membentuk lereng kerucut, bukan mendatar rata.",
            "2": "Gula pasir memiliki massa jenis padatan yang nyata (~1.600 kg/m³) dan tidak berwujud gas.",
            "3": "Wujud materi gula pasir pada suhu kamar terdefinisi secara ilmiah dan tegas sebagai zat padat kristal."
        }
    },
    {
        "id": "ipa-d-7-b2-q07",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 55 Ayo Uji Kemampuan No. 5), Dewi yang baru tiba di depan pintu rumah langsung mencium aroma wangi pengharum ruangan dari ruang keluarga di belakang. Peristiwa ini membuktikan bahwa…",
        "options": [
            "Partikel gas pengharum ruangan mengalami difusi dan bergerak menyebar ke segala arah melalui celah partikel udara",
            "Partikel udara di ruang keluarga mendorong partikel aroma hanya dalam satu garis lurus ke pintu",
            "Molekul aroma mengalami perubahan kimia menjadi zat padat saat tercium oleh hidung",
            "Udara dingin dari luar rumah menyerap partikel aroma dan menghilangkannya seketika"
        ],
        "answer": 0,
        "why": {
            "0": "Partikel gas wewangian menguap dan bergerak secara acak dengan cepat (gerak Brown), menyebar dari area berkonsentrasi tinggi ke konsentrasi lebih rendah melalui proses difusi."
        },
        "distractorWhy": {
            "1": "Difusi partikel gas menyebar ke segala arah secara tiga dimensi, bukan bergerak dalam satu garis lurus terarah.",
            "2": "Mencium aroma wangi adalah peristiwa fisika penangkapan molekul oleh reseptor olfaktori tanpa reaksi kimia perubahan zat.",
            "3": "Udara tidak menyerap dan melenyapkan partikel melainkan menjadi medium perambatan difusi aroma."
        }
    },

    # --- SUBBAB B: Perubahan Wujud Zat, Titik Leleh & Titik Didih (hal. 60-61) ---
    {
        "id": "ipa-d-7-b2-q08",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 60 Aktivitas 2.7 No. 1 & Tabel 2.2), seorang tukang las harus memanaskan besi hingga suhu lebih dari 1.535°C saat menyambung atau membengkokkannya karena…",
        "options": [
            "Suhu 1.535°C adalah titik leleh besi, di mana ikatan partikel padatnya melemah sehingga besi melunak dan dapat dibentuk",
            "Besi akan langsung menguap menjadi gas bertekanan tinggi pada suhu 1.535°C",
            "Pemanasan besi bertujuan menurunkan massa atom besi agar menjadi lebih ringan dari aluminium",
            "Titik leleh besi sama dengan titik leleh lilin yaitu pada suhu 60°C"
        ],
        "answer": 0,
        "why": {
            "0": "Sesuai data Tabel 2.2 Buku Siswa, titik leleh besi murni adalah 1.535°C. Pada suhu tersebut, energi kalor memutuskan sebagian ikatan kisi kristal besi sehingga besi menjadi lentur dan mencair."
        },
        "distractorWhy": {
            "1": "Besi mendidih dan menguap menjadi gas pada suhu 2.750°C, bukan pada 1.535°C.",
            "2": "Massa atom besi bersifat kekal dan pemanasan tidak mengurangi nomor massa atom besi.",
            "3": "Titik leleh lilin adalah 60°C, jauh lebih rendah daripada titik leleh besi 1.535°C."
        }
    },
    {
        "id": "ipa-d-7-b2-q09",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 60 Aktivitas 2.7 No. 2 & Tabel 2.2), jika titik leleh air adalah 0°C dan titik didihnya adalah 100°C pada tekanan normal, bagaimanakah wujud air berturut-turut pada suhu 15°C, 85°C, dan 120°C?",
        "options": [
            "Pada 15°C berwujud cair, pada 85°C berwujud cair, dan pada 120°C berwujud gas (uap air)",
            "Pada 15°C berwujud padat (es), pada 85°C berwujud cair, dan pada 120°C berwujud padat",
            "Pada 15°C berwujud cair, pada 85°C berwujud gas, dan pada 120°C berwujud cair",
            "Pada 15°C berwujud gas, pada 85°C berwujud padat, dan pada 120°C berwujud gas"
        ],
        "answer": 0,
        "why": {
            "0": "Air berwujud padat di bawah 0°C, berwujud cair di antara 0°C sampai 100°C (mencakup 15°C dan 85°C), dan berwujud gas di atas 100°C (120°C)."
        },
        "distractorWhy": {
            "1": "Pada 15°C es sudah mencair menjadi air, dan pada 120°C air sudah melewati titik didih sehingga menjadi uap gas.",
            "2": "Pada 85°C air belum mencapai titik didih 100°C sehingga masih berwujud cair.",
            "3": "Pada 15°C air bukan berwujud gas dan pada 85°C air bukan berwujud padatan."
        }
    },
    {
        "id": "ipa-d-7-b2-q10",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 60 Aktivitas 2.7 No. 3 & Tabel 2.2), aluminium sehari-hari kita jumpai dalam wujud padat pada suhu kamar (sekitar 25°C) karena…",
        "options": [
            "Suhu kamar 25°C berada jauh di bawah titik leleh aluminium (660°C) sehingga partikelnya tetap terikat kuat",
            "Aluminium tidak memiliki titik leleh sehingga tidak pernah dapat mencair",
            "Titik didih aluminium sama dengan suhu kamar yaitu 25°C",
            "Aluminium adalah gas yang dimampatkan ke dalam lembaran tipis"
        ],
        "answer": 0,
        "why": {
            "0": "Titik leleh aluminium adalah 660°C. Karena suhu ruangan (25°C) lebih rendah daripada titik lelehnya, aluminium mempertahankan struktur fase padatnya."
        },
        "distractorWhy": {
            "1": "Aluminium dapat dicairkan pada tanur peleburan industri di atas suhu 660°C.",
            "2": "Titik didih aluminium adalah 1.800°C, bukan 25°C.",
            "3": "Aluminium adalah unsur logam murni berwujud padat, bukan gas kompresi."
        }
    },
    {
        "id": "ipa-d-7-b2-q11",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 61 Aktivitas 2.7 No. 4 & Tabel 2.2), materi manakah di dalam tabel yang membutuhkan suhu paling tinggi untuk berubah dari wujud padat menjadi cairan?",
        "options": [
            "Permata (intan karbon) dengan titik leleh mencapai 3.550°C",
            "Besi dengan titik leleh 1.535°C",
            "Garam dapur dengan titik leleh 804°C",
            "Lilin parafin dengan titik leleh 60°C"
        ],
        "answer": 0,
        "why": {
            "0": "Berdasarkan data Tabel 2.2 Buku Siswa, permata memiliki titik leleh tertinggi yaitu 3.550°C karena memiliki ikatan kovalen raksasa antaratom karbon yang sangat kokoh."
        },
        "distractorWhy": {
            "1": "Titik leleh besi (1.535°C) jauh lebih rendah dibandingkan permata (3.550°C).",
            "2": "Titik leleh garam (804°C) berada di bawah besi dan permata.",
            "3": "Lilin memiliki titik leleh paling rendah di antara pilihan materi tersebut (60°C)."
        }
    },
    {
        "id": "ipa-d-7-b2-q12",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 61 Aktivitas 2.7 No. 5 & Tabel 2.2), jika suhu diturunkan terus-menerus hingga sangat dingin, bagaimanakah urutan pembekuan antara air (titik leleh 0°C), nitrogen (titik leleh -210°C), dan oksigen (titik leleh -218°C) dari yang paling awal membeku?",
        "options": [
            "Air membeku paling awal (0°C), disusul nitrogen (-210°C), dan terakhir oksigen (-218°C)",
            "Oksigen membeku paling awal (-218°C), disusul nitrogen (-210°C), dan terakhir air (0°C)",
            "Nitrogen membeku paling awal (-210°C), disusul oksigen (-218°C), dan air tidak pernah membeku",
            "Ketiganya membeku secara serentak pada suhu 0°C"
        ],
        "answer": 0,
        "why": {
            "0": "Saat pendinginan berlangsung dari suhu ruang turun ke arah nol mutlak, zat dengan titik beku tertinggi akan membeku lebih dulu: air membeku di 0°C, lalu nitrogen di -210°C, dan oksigen di -218°C."
        },
        "distractorWhy": {
            "1": "Oksigen membutuhkan suhu paling dingin (-218°C) sehingga membeku paling akhir, bukan paling awal.",
            "2": "Nitrogen membeku setelah air karena titik bekunya jauh lebih rendah di bawah nol derajat celsius.",
            "3": "Setiap zat memiliki titik beku karakteristik yang unik dan tidak membeku secara bersamaan."
        }
    },

    # --- SUBBAB C: Perubahan Fisika dan Kimia (hal. 65-67) ---
    {
        "id": "ipa-d-7-b2-q13",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 61 & 65 Aktivitas 2.8), perbedaan mendasar antara merobek kertas menjadi potongan kecil dan membakar selembar kertas dengan api adalah…",
        "options": [
            "Merobek kertas adalah perubahan fisika karena tidak menghasilkan zat baru, sedangkan membakar kertas adalah perubahan kimia karena menghasilkan abu, asap, dan gas baru",
            "Merobek kertas adalah perubahan kimia karena bentuk fisiknya berubah",
            "Membakar kertas adalah perubahan fisika karena abu dapat diubah kembali menjadi kertas dengan mudah",
            "Keduanya merupakan perubahan fisika karena massa kedua kertas tetap sama"
        ],
        "answer": 0,
        "why": {
            "0": "Perubahan fisika hanya mengubah bentuk atau ukuran materi tanpa mengubah rumus kimia zatnya. Pembakaran mengubah molekul selulosa menjadi karbon (abu) dan gas CO2 (reaksi kimia ireversibel)."
        },
        "distractorWhy": {
            "1": "Perubahan ukuran fisik tanpa pembentukan senyawa baru merupakan ciri khas perubahan fisika, bukan kimia.",
            "2": "Abu hasil pembakaran tidak dapat dikembalikan menjadi lembaran kertas karena ikatan molekul kimianya telah berubah permanen.",
            "3": "Pembakaran adalah reaksi oksidasi kimiawi, bukan sekadar perubahan fase fisik biasa."
        }
    },
    {
        "id": "ipa-d-7-b2-q14",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 66 Gambar 2.17), ketika larutan timbal (II) nitrat yang bening dicampurkan dengan larutan kalium iodida yang juga bening, terbentuk warna kuning pekat. Hal ini menandakan terjadinya reaksi kimia berupa…",
        "options": [
            "Pembentukan senyawa baru yaitu endapan timbal (II) iodida yang berwarna kuning",
            "Penguapan seluruh pelarut air sehingga menyisakan kristal kalium murni",
            "Pencampuran fisika biasa yang warnanya dapat dihilangkan dengan penyaringan biasa",
            "Penurunan suhu drastis yang membekukan kedua cairan menjadi es kuning"
        ],
        "answer": 0,
        "why": {
            "0": "Reaksi timbal(II) nitrat + kalium iodida -> timbal(II) iodida + kalium nitrat menghasilkan zat baru berwujud padatan mikroskopis kuning (endapan) yang menjadi ciri perubahan kimia."
        },
        "distractorWhy": {
            "1": "Tidak terjadi penguapan pelarut melainkan reaksi pertukaran ion dalam larutan air.",
            "2": "Terbentuknya warna kuning dari dua larutan jernih membuktikan sintesis senyawa baru, bukan campuran fisika yang reversibel.",
            "3": "Perubahan warna ini dipicu pembentukan ikatan senyawa timbal iodida, bukan proses pembekuan es."
        }
    },
    {
        "id": "ipa-d-7-b2-q15",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 66 Gambar 2.18), tanda reaksi kimia yang tampak jelas ketika pita logam magnesium dimasukkan ke dalam tabung reaksi berisi larutan asam klorida adalah…",
        "options": [
            "Munculnya gelembung-gelembung gas hidrogen secara cepat di sekitar permukaan logam",
            "Larutan membeku seketika menjadi bongkahan batu kapur",
            "Logam magnesium berubah menjadi logam emas berkilau",
            "Cairan berubah warna menjadi hitam pekat tanpa gelembung"
        ],
        "answer": 0,
        "why": {
            "0": "Reaksi Mg + 2HCl -> MgCl2 + H2 menghasilkan gas hidrogen yang tampak kasat mata berupa desisan gelembung gas aktif dalam larutan asam."
        },
        "distractorWhy": {
            "1": "Reaksi asam klorida dan magnesium bersifat eksoterm menghasilkan gas, bukan pembekuan es kapur.",
            "2": "Reaksi kimia tidak dapat mengubah unsur magnesium menjadi unsur emas murni.",
            "3": "Larutan tetap jernih dengan pelepasan gelembung gas gas H2, bukan berubah hitam pekat."
        }
    },
    {
        "id": "ipa-d-7-b2-q16",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 66), empat tanda utama yang menunjukkan terjadinya suatu reaksi kimia (perubahan kimia) adalah…",
        "options": [
            "Terjadi perubahan warna, terbentuk gas, terbentuk endapan, dan terjadi perubahan suhu (panas atau dingin)",
            "Terjadi perubahan wujud cair ke padat, perubahan volume wadah, dan pemuaian panjang",
            "Terjadi perpindahan tempat benda, percepatan gerak, dan perubahan massa jenis wadah",
            "Terjadi pelarutan garam, pemotongan kayu, dan penghancuran batu kali"
        ],
        "answer": 0,
        "why": {
            "0": "Buku Siswa secara tegas merangkum empat indikator utama reaksi kimia: perubahan warna, timbulnya gas, munculnya endapan tak larut, dan pelepasan/penyerapan energi kalor (perubahan suhu)."
        },
        "distractorWhy": {
            "1": "Perubahan wujud (seperti membeku/mencair) dan pemuaian panjang adalah gejala perubahan fisika.",
            "2": "Gerak benda dan percepatan adalah konsep kinematika fisika.",
            "3": "Pelarutan garam dan pemotongan kayu adalah contoh perubahan fisika tanpa menghasilkan senyawa baru."
        }
    },

    # --- SUBBAB D: Kerapatan Zat & Massa Jenis (hal. 73-76) ---
    {
        "id": "ipa-d-7-b2-q17",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 73 Tabel 2.4 Massa Jenis), jika massa jenis air murni adalah 1.000 kg/m³ (1 g/cm³), materi manakah yang akan MENGAPUNG saat diletakkan di permukaan air?",
        "options": [
            "Es (massa jenis 920 kg/m³) dan minyak tanah (massa jenis 800 kg/m³)",
            "Aluminium (massa jenis 2.700 kg/m³) dan besi (massa jenis 7.900 kg/m³)",
            "Tembaga (massa jenis 8.900 kg/m³) dan seng (massa jenis 7.140 kg/m³)",
            "Emas (massa jenis 19.300 kg/m³) dan platina (massa jenis 10.500 kg/m³)"
        ],
        "answer": 0,
        "why": {
            "0": "Suatu benda akan mengapung dalam cairan jika massa jenisnya lebih kecil daripada massa jenis cairan tersebut. Es (920 kg/m³) dan minyak (800 kg/m³) lebih kecil dari air (1.000 kg/m³)."
        },
        "distractorWhy": {
            "1": "Aluminium dan besi memiliki massa jenis jauh lebih besar daripada air sehingga pasti tenggelam.",
            "2": "Tembaga dan seng berkerapatan tinggi sehingga tenggelam ke dasar air.",
            "3": "Emas dan platina merupakan logam sangat padat yang akan langsung tenggelam ke dasar bejana."
        }
    },
    {
        "id": "ipa-d-7-b2-q18",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 73 Gambar 2.26 Aktivitas 2.9), jika sirup kental, air berwarna, dan minyak goreng dituangkan perlahan ke dalam satu gelas yang sama, bagaimanakah susunan lapisan cairan tersebut dari paling bawah ke paling atas?",
        "options": [
            "Sirup di lapisan terbawah, air di lapisan tengah, dan minyak goreng di lapisan paling atas",
            "Minyak goreng di lapisan terbawah, air di tengah, dan sirup di paling atas",
            "Air di lapisan terbawah, minyak goreng di tengah, dan sirup di paling atas",
            "Ketiga cairan akan langsung menyatu homogen tanpa membentuk lapisan bertingkat"
        ],
        "answer": 0,
        "why": {
            "0": "Cairan dengan massa jenis terbesar (paling rapat/sirup) menempati dasar bejana, diikuti air di tengah, dan cairan bermassa jenis terkecil (minyak goreng) mengapung di puncak lapisan."
        },
        "distractorWhy": {
            "1": "Minyak goreng memiliki massa jenis lebih rendah daripada air sehingga tidak mungkin berada di lapisan dasar bejana.",
            "2": "Sirup lebih rapat daripada air sehingga air berada di atas sirup, bukan di bawahnya.",
            "3": "Minyak bersifat nonpolar dan tidak larut dalam air/sirup polar, sehingga membentuk lapisan diskret berdasarkan densitas."
        }
    },
    {
        "id": "ipa-d-7-b2-q19",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 74 Aktivitas 2.10 Rumus Massa Jenis), sebuah balok logam kuningan memiliki massa 168 gram dan volumenya diukur sebesar 20 cm³. Massa jenis balok kuningan tersebut adalah…",
        "options": [
            "8,4 g/cm³ (setara 8.400 kg/m³)",
            "0,119 g/cm³ (setara 119 kg/m³)",
            "188 g/cm³ (setara 188.000 kg/m³)",
            "3.360 g/cm³ (setara 3.360.000 kg/m³)"
        ],
        "answer": 0,
        "why": {
            "0": "Rumus massa jenis adalah massa dibagi volume: rho = m / V = 168 gram / 20 cm³ = 8,4 g/cm³, tepat cocok dengan nilai referensi kuningan pada Tabel 2.4."
        },
        "distractorWhy": {
            "1": "Nilai 0,119 g/cm³ diperoleh dari pembagian terbalik volume dibagi massa (20 / 168).",
            "2": "Nilai 188 g/cm³ diperoleh dari penjumlahan keliru massa ditambah volume (168 + 20).",
            "3": "Nilai 3.360 g/cm³ diperoleh dari perkalian massa dikalikan volume (168 x 20)."
        }
    },
    {
        "id": "ipa-d-7-b2-q20",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 76 Ayo Uji Kemampuan Kasus Titanic No. a), kapal Titanic terbuat dari puluhan ribu ton baja tebal (massa jenis baja 7.900 kg/m³). Mengapa kapal tersebut tetap dapat mengapung di permukaan air laut?",
        "options": [
            "Karena kapal dirancang memiliki rongga lambung berisi udara yang sangat besar, sehingga massa jenis total rata-rata kapal lebih kecil dari massa jenis air laut",
            "Karena air laut mengandung garam yang membuat seluruh jenis logam padat otomatis terapung",
            "Karena baling-baling mesin kapal terus berputar mendorong air ke bawah tanpa henti",
            "Karena baja yang digunakan pada kapal Titanic telah diubah menjadi zat cair ringan"
        ],
        "answer": 0,
        "why": {
            "0": "Prinsip Archimedes dan densitas rata-rata: volume lambung kapal yang berongga udara sangat luas menyebabkan rasio total massa terhadap total volume kapal bernilai lebih kecil dari air laut (1,03 g/cm³)."
        },
        "distractorWhy": {
            "1": "Garam air laut hanya sedikit menaikkan massa jenis air laut (~1,03 g/cm³), dan sepotong baja padat tetap akan langsung tenggelam.",
            "2": "Kapal tetap mengapung saat mesin mati bersandar di dermaga karena massa jenis rata-ratanya, bukan dorongan baling-baling.",
            "3": "Baja lambung kapal berwujud padat keras, bukan dicairkan."
        }
    },
    {
        "id": "ipa-d-7-b2-q21",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 76 Ayo Uji Kemampuan Kasus Titanic No. b), mengapa tabrakan dengan gunung es menyebabkan kapal Titanic akhirnya tenggelam dalam waktu sekitar 3 jam?",
        "options": [
            "Robekan akibat benturan es menyebabkan air laut masuk memenuhi kompartemen udara lambung, sehingga massa jenis rata-rata kapal meningkat drastis melebihi massa jenis air laut",
            "Es dari gunung es meleleh dan mendinginkan mesin kapal sehingga mesin kehilangan daya apung",
            "Gunung es memiliki gaya magnet raksasa yang menarik baja kapal menuju dasar samudra",
            "Kapal tenggelam karena bobot gunung es menimpa bagian atas dek kapal secara langsung"
        ],
        "answer": 0,
        "why": {
            "0": "Ketika air laut masuk menggantikan rongga udara di dalam lambung kapal, volume total kapal tetap sementara massanya melonjak hebat. Hal ini menaikkan massa jenis rata-rata hingga melampaui air laut dan kapal tenggelam."
        },
        "distractorWhy": {
            "1": "Daya apung ditentukan oleh hukum fluida dan perpindahan massa jenis, bukan suhu operasional mesin.",
            "2": "Gunung es terbentuk dari kristal air tawar beku dan tidak memiliki medan gaya magnet.",
            "3": "Titanic tidak tertimpa gunung es dari atas, melainkan lambung bawah kanannya robek tergores es bawah air."
        }
    },
    {
        "id": "ipa-d-7-b2-q22",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 76 Ayo Uji Kemampuan No. c), ketika sebuah kapal karam terjadi kebocoran bahan bakar minyak ke laut. Mengapa minyak mengapung di permukaan air dan bagaimana cara kerja alat pembatas minyak (oil boom) menanggulanginya?",
        "options": [
            "Minyak memiliki massa jenis lebih rendah daripada air laut sehingga mengapung di permukaan, dan pelampung pembatas (oil boom) mengurung lapisan minyak agar tidak menyebar sebelum disedot",
            "Minyak memiliki massa jenis lebih tinggi sehingga mengendap ke dasar laut dan ditarik memakai jaring",
            "Minyak bercampur larut sempurna dengan air laut sehingga harus diuapkan dengan cara dipanaskan",
            "Minyak membentuk gas beracun yang hanya dapat ditangkap menggunakan kubah kaca raksasa"
        ],
        "answer": 0,
        "why": {
            "0": "Minyak bakar memiliki massa jenis sekitar 800 kg/m³, lebih ringan dari air laut (1.030 kg/m³). Sifat hidrofobik dan massa jenis rendah membuatnya mengapung di permukaan sehingga dapat dibendung oleh pelampung pembatas (oil boom)."
        },
        "distractorWhy": {
            "1": "Minyak tidak tenggelam ke dasar laut karena densitasnya lebih ringan dari air laut.",
            "2": "Minyak bersifat nonpolar dan tidak bercampur homogen dengan molekul air laut polar.",
            "3": "Bahan bakar cair di permukaan laut berwujud cairan, bukan gas yang menguap seketika."
        }
    }
]

print(f"Bab 2 items crafted: {len(bab2_items)}")

# Update bank data
competencies = [
    {
        "code": "KOMP-IPA-D-7-BAB1-01",
        "grade": 7,
        "name": "Hakikat Ilmu Sains dan Metode Ilmiah",
        "materi": "Apa Itu Sains?, Laboratorium IPA & Keselamatan Kerja, Merancang Percobaan, Pengukuran Besaran & Satuan SI, Pelaporan Hasil Percobaan",
        "cpRef": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi) — Bab 1",
        "items": bab1_items
    },
    {
        "code": "KOMP-IPA-D-7-BAB2-01",
        "grade": 7,
        "name": "Zat dan Perubahannya",
        "materi": "Wujud Zat dan Model Partikel, Perubahan Wujud Zat, Perubahan Fisika dan Kimia, Kerapatan Zat / Massa Jenis",
        "cpRef": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi) — Bab 2",
        "items": bab2_items
    }
]

full_bank = {
    "schema": "fiezel-mapel-bank-v1",
    "subjectId": "IPA",
    "phase": "fase_d",
    "provenance": {
        "dokumen": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi)",
        "penerbit": "Pusat Perbukuan, Badan Standar, Kurikulum, dan Asesmen Pendidikan, Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi",
        "tahun": "2023",
        "isbn": "978-623-118-457-3",
        "diperolehDari": "https://buku.kemendikdasmen.go.id",
        "penyusunButir": "resmi-terverifikasi"
    },
    "competencies": competencies
}

with open(r'c:\Users\hp\fiezel-apps\content\mapel\mapel-ipa-d.json', 'w', encoding='utf-8') as f:
    json.dump(full_bank, f, ensure_ascii=False, indent=2)

print("Berhasil memperbarui mapel-ipa-d.json dengan Bab 1 (38 soal) dan Bab 2 (22 soal) = TOTAL 60 SOAL!")
