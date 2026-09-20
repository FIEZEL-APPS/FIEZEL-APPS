import json

questions = [
    # --- HALAMAN 8-9: AYO UJI KEMAMPUAN (APA ITU SAINS?) ---
    {
        "id": "ipa-d-7-b1-q01",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 8 Ayo Uji Kemampuan No. 1a), Yosua mempelajari kebiasaan makan sapi. Cabang ilmu sains yang mempelajari kegiatan Yosua adalah…",
        "options": [
            "Zoologi (cabang Biologi tentang hewan)",
            "Botani (cabang Biologi tentang tumbuhan)",
            "Geologi tentang struktur batuan bumi",
            "Fisika tentang dinamika gaya gerak"
        ],
        "answer": 0,
        "why": {
            "0": "Zoologi adalah cabang biologi yang secara khusus mempelajari seluk-beluk hewan, termasuk fisiologi dan pola makannya."
        },
        "distractorWhy": {
            "1": "Botani mengkaji dunia tumbuhan, bukan kebiasaan dan fisiologi hewan mamalia sapi.",
            "2": "Geologi mengkaji susunan lapisan kerak bumi dan bebatuan, bukan biologi hewan.",
            "3": "Fisika mekanika mengkaji materi dan energi serta gaya gerak benda mati."
        }
    },
    {
        "id": "ipa-d-7-b1-q02",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 8 Ayo Uji Kemampuan No. 1b), Dewi mencoba menciptakan plastik yang dapat terurai oleh alam (biodegradable). Cabang ilmu sains yang ditekuni Dewi adalah…",
        "options": [
            "Kimia polimer dan material",
            "Astronomi benda-benda langit",
            "Geofisika lapisan lempeng bumi",
            "Mekanika fluida zat cair"
        ],
        "answer": 0,
        "why": {
            "0": "Kimia polimer mempelajari sintesis, modifikasi struktur molekul zat, dan reaksi degradasi senyawa plastik organik."
        },
        "distractorWhy": {
            "1": "Astronomi meneliti benda antariksa seperti bintang dan planet, bukan rekayasa bahan plastik.",
            "2": "Geofisika meneliti sifat fisik batuan dan gelombang seismik perut bumi.",
            "3": "Mekanika fluida mengkaji aliran zat cair dan gas, bukan reaksi sintesis molekul polimer."
        }
    },
    {
        "id": "ipa-d-7-b1-q03",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 8 Ayo Uji Kemampuan No. 1c), Farhan menyelidiki aliran listrik dalam sirkuit televisi. Cabang ilmu sains yang ditekuni Farhan adalah…",
        "options": [
            "Fisika (khususnya Elektronika dan Listrik)",
            "Mikrobiologi mikroorganisme renik",
            "Meteorologi prakiraan dinamika cuaca",
            "Sitologi struktur sel hayati"
        ],
        "answer": 0,
        "why": {
            "0": "Elektronika adalah cabang fisika terapan yang mempelajari pergerakan dan pengendalian arus muatan listrik dalam sirkuit."
        },
        "distractorWhy": {
            "1": "Mikrobiologi mengkaji bakteri dan virus renik, bukan sirkuit arus listrik.",
            "2": "Meteorologi mempelajari fenomena atmosfer cuaca, bukan komponen elektronika televisi.",
            "3": "Sitologi adalah cabang biologi yang mempelajari struktur internal sel organisme."
        }
    },
    {
        "id": "ipa-d-7-b1-q04",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 9 Ayo Uji Kemampuan No. 1d), Bagas mempelajari lintasan pergerakan planet mengelilingi matahari. Cabang ilmu sains yang ditekuni Bagas adalah…",
        "options": [
            "Astronomi (Ilmu Tata Surya)",
            "Taksonomi klasifikasi tumbuhan",
            "Mineralogi kristal batu bumi",
            "Histologi jaringan tubuh hewan"
        ],
        "answer": 0,
        "why": {
            "0": "Astronomi adalah ilmu alam yang meneliti benda antariksa, pergerakan orbit planet, bintang, dan sistem galaksi."
        },
        "distractorWhy": {
            "1": "Taksonomi berfokus pada pengelompokan hierarkis makhluk hidup hayati.",
            "2": "Mineralogi mengkaji sifat fisik kristal dan unsur kimia bebatuan bumi.",
            "3": "Histologi meneliti struktur mikroskopis jaringan organ tubuh biologis."
        }
    },
    {
        "id": "ipa-d-7-b1-q05",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 9 Ayo Uji Kemampuan No. 1e), Vania menyelidiki dampak pencemaran limbah sampah plastik terhadap biota hewan laut. Cabang ilmu sains yang ditekuni Vania adalah…",
        "options": [
            "Ekologi Kelautan (Biologi Lingkungan Bahari)",
            "Vulkanologi dinamika gunung berapi",
            "Geodesi pengukuran pemetaan wilayah",
            "Termodinamika konversi energi kalor"
        ],
        "answer": 0,
        "why": {
            "0": "Ekologi kelautan mempelajari interaksi timbal balik antara organisme laut dengan lingkungan habitatnya termasuk polutan."
        },
        "distractorWhy": {
            "1": "Vulkanologi mengkaji aktivitas magma dan erupsi vulkanik gunung berapi.",
            "2": "Geodesi adalah cabang geosains untuk pemetaan koordinat permukaan bumi.",
            "3": "Termodinamika membahas hukum perpindahan panas dan kerja sistem energi."
        }
    },
    {
        "id": "ipa-d-7-b1-q06",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 9 Ayo Uji Kemampuan No. 2a), ilmuwan yang mendalami bidang BIOKIMIA berfokus pada kajian perpaduan antara…",
        "options": [
            "Biologi dan Kimia (proses reaksi kimiawi di dalam tubuh makhluk hidup)",
            "Bumi dan Kimia (komposisi mineral batuan kerak benua)",
            "Bintang dan Kimia (unsur gas pada fotosfer matahari)",
            "Bakteri dan Fisika (kecepatan gerak flagela mikroba)"
        ],
        "answer": 0,
        "why": {
            "0": "Biokimia memadukan ilmu biologi dan kimia untuk memahami reaksi molekuler seperti metabolisme sel, DNA, dan enzim."
        },
        "distractorWhy": {
            "1": "Kajian komposisi mineral batuan kerak bumi dipelajari dalam cabang geokimia.",
            "2": "Kajian komposisi gas pada bintang dipelajari dalam cabang astrokimia.",
            "3": "Kajian mekanika gerak mikroba merupakan bidang biofisika, bukan biokimia."
        }
    },
    {
        "id": "ipa-d-7-b1-q07",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 9 Ayo Uji Kemampuan No. 2b), ilmuwan yang mendalami bidang GEOFISIKA menerapkan prinsip sains untuk…",
        "options": [
            "Geologi dan Fisika (meneliti struktur fisik bumi melalui gelombang seismik dan medan magnet)",
            "Geografi dan Farmasi (pemetaan penyebaran tanaman obat tradisional)",
            "Genetika dan Fisika (pengaruh sinar rontgen terhadap mutasi genetik)",
            "Geometri dan Fisika (perhitungan luas sudut permukaan bidang miring)"
        ],
        "answer": 0,
        "why": {
            "0": "Geofisika menggabungkan konsep fisika (gelombang, gravitasi, magnetik) untuk memetakan struktur bawah permukaan bumi."
        },
        "distractorWhy": {
            "1": "Penyebaran tanaman obat adalah kajian biogeografi dan etnofarmasi.",
            "2": "Pengaruh radiasi pada genetik dipelajari dalam genetika radiasi atau radiobiologi.",
            "3": "Perhitungan geometri adalah bagian murni matematika terapan pada mekanika dasar."
        }
    },
    {
        "id": "ipa-d-7-b1-q08",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 9 Ayo Uji Kemampuan No. 2c), kajian OSEANOGRAFI sebagai ilmu multidisiplin mempelajari fenomena…",
        "options": [
            "Lautan luas secara terpadu mencakup aspek fisika arus, kimia salinitas, geologi dasar laut, dan biologi bahari",
            "Atmosfer udara lapisan troposfer hingga stratosfer bumi",
            "Orbit benda-benda antariksa di luar angkasa hampa udara",
            "Struktur fosil purba vertebrata darat zaman purbakala"
        ],
        "answer": 0,
        "why": {
            "0": "Oseanografi mengkaji samudra secara komprehensif dari arus laut, kadar garam, topografi palung, hingga biota laut."
        },
        "distractorWhy": {
            "1": "Kajian atmosfer dipelajari dalam meteorologi dan klimatologi.",
            "2": "Benda antariksa di luar angkasa dipelajari dalam astronomi.",
            "3": "Kajian fosil purba dipelajari dalam bidang paleontologi."
        }
    },

    # --- HALAMAN 12-13: AYO UJI KEMAMPUAN (LABORATORIUM IPA) ---
    {
        "id": "ipa-d-7-b1-q09",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 12 Ayo Uji Kemampuan No. 1a), alat laboratorium manakah yang paling tepat digunakan untuk mengukur volume air sebanyak 25 mL dengan teliti?",
        "options": [
            "Gelas ukur kaca dengan skala presisi",
            "Gelas kimia (beaker) bibir lebar",
            "Labu Erlenmeyer dasar rata",
            "Tabung reaksi standar polos"
        ],
        "answer": 0,
        "why": {
            "0": "Gelas ukur dirancang dengan skala tera presisi untuk mengukur volume zat cair secara kuantitatif akurat."
        },
        "distractorWhy": {
            "1": "Gelas kimia berfungsi menampung larutan dan garis volumenya hanya perkiraan kasar.",
            "2": "Labu Erlenmeyer dirancang untuk mencampur bahan dan titrasi, bukan pengukuran volume presisi.",
            "3": "Tabung reaksi tidak memiliki garis ukur pembacaan volume."
        }
    },
    {
        "id": "ipa-d-7-b1-q10",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 12 Ayo Uji Kemampuan No. 1b), peralatan laboratorium yang digunakan bersama-sama untuk memanaskan air di laboratorium IPA adalah…",
        "options": [
            "Gelas kimia berisi air yang diletakkan di atas kawat kasa, kaki tiga, dan pembakar spiritus",
            "Gelas ukur yang dipanaskan langsung di atas semburan api bunsen",
            "Tabung reaksi tanpa penjepit kayu yang dipegang langsung di atas nyala api",
            "Termometer kaca yang diletakkan langsung menyentuh lidah api bunsen"
        ],
        "answer": 0,
        "why": {
            "0": "Rangkaian pemanasan air standar menggunakan gelas kimia tahan panas di atas kawat kasa yang disangga kaki tiga."
        },
        "distractorWhy": {
            "1": "Gelas ukur tidak boleh dipanaskan karena panas dapat merusak kalibrasi ketelitian skala volumenya.",
            "2": "Memegang tabung reaksi langsung dengan tangan saat dipanaskan menyebabkan luka bakar serius.",
            "3": "Termometer tidak boleh disentuhkan langsung ke lidah api karena cairan raksa/alkohol akan memuai berlebih dan pecah."
        }
    },
    {
        "id": "ipa-d-7-b1-q11",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 12 Ayo Uji Kemampuan No. 1c), alat laboratorium yang digunakan untuk mengukur derajat suhu air setelah dipanaskan adalah…",
        "options": [
            "Termometer laboratorium skala celsius",
            "Barometer tekanan udara bejana",
            "Higrometer kelembapan relatif",
            "Mistar penggaris baja datar"
        ],
        "answer": 0,
        "why": {
            "0": "Termometer laboratorium mengukur derajat panas atau dinginnya suatu zat berdasarkan pemuaian cairan pengukur."
        },
        "distractorWhy": {
            "1": "Barometer digunakan untuk mengukur tekanan atmosfer udara.",
            "2": "Higrometer digunakan untuk mengukur tingkat kelembapan uap air di udara.",
            "3": "Mistar penggaris digunakan untuk mengukur dimensi panjang benda."
        }
    },
    {
        "id": "ipa-d-7-b1-q12",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 12 Ayo Uji Kemampuan No. 1d), alat laboratorium yang paling sesuai digunakan untuk mencampur larutan bahan kimia dalam jumlah yang sedikit adalah…",
        "options": [
            "Tabung reaksi kaca",
            "Gelas kimia 500 mL",
            "Labu alas bulat 1 liter",
            "Cawan porselen lebar"
        ],
        "answer": 0,
        "why": {
            "0": "Tabung reaksi dirancang khusus untuk menampung, mereaksikan, dan mencampur larutan kimia dalam volume kecil (kurang dari 10 mL)."
        },
        "distractorWhy": {
            "1": "Gelas kimia 500 mL terlalu besar dan tidak efisien untuk reaksi cairan dalam jumlah sedikit.",
            "2": "Labu alas bulat 1 liter digunakan untuk proses destilasi larutan bervolume besar.",
            "3": "Cawan porselen digunakan untuk proses penguapan kristalisasi, bukan pencampuran larutan rutin."
        }
    },
    {
        "id": "ipa-d-7-b1-q13",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 12 Ayo Uji Kemampuan No. 1e), alat laboratorium yang digunakan untuk mengambil zat padat garam dari botol bahan sebelum ditimbang adalah…",
        "options": [
            "Spatula laboratorium (logam atau porselen)",
            "Pipet tetes kaca bervolume",
            "Batang pengaduk kaca silinder",
            "Pinset penjepit kawat halus"
        ],
        "answer": 0,
        "why": {
            "0": "Spatula berfungsi seperti sendok kecil untuk mengambil sampel bahan kimia padat, kristal, atau serbuk."
        },
        "distractorWhy": {
            "1": "Pipet tetes digunakan untuk mengambil cairan, tidak dapat menyendok zat padat bubuk.",
            "2": "Batang pengaduk berbentuk silinder lurus tanpa lekukan sendok sehingga tidak bisa menyendok serbuk.",
            "3": "Pinset digunakan untuk menjepit benda padat tunggal, bukan menyendok butiran serbuk garam."
        }
    },
    {
        "id": "ipa-d-7-b1-q14",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 12 Ayo Uji Kemampuan No. 1f), alat laboratorium yang digunakan untuk mengaduk garam agar dapat larut merata dalam air adalah…",
        "options": [
            "Batang pengaduk kaca pejal",
            "Termometer alkohol laboratorium",
            "Pipa kaca bengkok kapiler",
            "Spatula besi runcing"
        ],
        "answer": 0,
        "why": {
            "0": "Batang pengaduk kaca tahan korosi digunakan khusus untuk mengaduk larutan tanpa risiko bereaksi kimia."
        },
        "distractorWhy": {
            "1": "Termometer tidak boleh digunakan sebagai pengaduk karena bohlam reservoir kaca sangat tipis dan mudah pecah.",
            "2": "Pipa kaca kapiler memiliki rongga sempit di dalamnya dan mudah patah jika dipakai mengaduk.",
            "3": "Spatula besi dapat bereaksi dengan larutan garam korosif dan mengotori kemurnian larutan."
        }
    },
    {
        "id": "ipa-d-7-b1-q15",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 13 Ayo Uji Kemampuan No. 2a), perbandingan antara BATANG PENGADUK dan SPATULA laboratorium yang benar adalah…",
        "options": [
            "Persamaan: keduanya alat bantu tangan; Perbedaan: batang pengaduk untuk mengaduk cairan, sedangkan spatula untuk mengambil zat padat",
            "Persamaan: keduanya terbuat dari plastik; Perbedaan: batang pengaduk tahan panas, spatula tidak tahan panas",
            "Persamaan: keduanya digunakan mengukur suhu; Perbedaan: batang pengaduk memakai skala celcius",
            "Persamaan: keduanya wadah penampung; Perbedaan: batang pengaduk berkapasitas 100 mL"
        ],
        "answer": 0,
        "why": {
            "0": "Batang pengaduk berbentuk silinder kaca untuk menghomogenkan cairan, sedangkan spatula berujung pipih seperti sendok untuk mengambil serbuk padatan."
        },
        "distractorWhy": {
            "1": "Batang pengaduk laboratorium umumnya terbuat dari kaca borosilikat pejal, bukan plastik biasa.",
            "2": "Keduanya bukan alat pengukur suhu (fungsi termometer).",
            "3": "Keduanya bukan wadah penampung bervolume."
        }
    },
    {
        "id": "ipa-d-7-b1-q16",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 13 Ayo Uji Kemampuan No. 2b), perbandingan antara GELAS KIMIA (beaker) dan LABU ERLENMEYER adalah…",
        "options": [
            "Persamaan: keduanya wadah penampung larutan; Perbedaan: Erlenmeyer memiliki leher sempit untuk meminimalkan percikan saat mengocok atau titrasi",
            "Persamaan: keduanya alat pengukur volume presisi tinggi; Perbedaan: Erlenmeyer tidak memiliki skala tera sama sekali",
            "Persamaan: keduanya terbuat dari besi tempa; Perbedaan: gelas kimia tidak dapat dipanaskan di atas api",
            "Persamaan: keduanya wadah penguapan kristal; Perbedaan: gelas kimia bermulut tertutup rapat"
        ],
        "answer": 0,
        "why": {
            "0": "Gelas kimia memiliki bibir silinder lebar untuk menuang, sedangkan leher sempit kerucut Erlenmeyer mencegah tumpahan saat diguncang."
        },
        "distractorWhy": {
            "1": "Keduanya bukan alat ukur volume presisi tinggi (alat ukur presisi adalah buret atau labu ukur).",
            "2": "Keduanya terbuat dari kaca borosilikat tahan panas, bukan besi tempa.",
            "3": "Gelas kimia bermulut terbuka lebar, bukan tertutup rapat."
        }
    },
    {
        "id": "ipa-d-7-b1-q17",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 13 Ayo Uji Kemampuan No. 2c), perbandingan antara KAWAT KASA dan SEGITIGA PORSELEN pada proses pemanasan adalah…",
        "options": [
            "Persamaan: keduanya penyangga wadah di atas kaki tiga; Perbedaan: kawat kasa untuk wadah dasar rata (gelas kimia), segitiga porselen untuk krusibel porselen dasar bulat",
            "Persamaan: keduanya wadah penampung zat cair; Perbedaan: segitiga porselen terbuat dari kawat baja lentur",
            "Persamaan: keduanya menghasilkan api pemanas; Perbedaan: kawat kasa memakai bahan bakar spiritus",
            "Persamaan: keduanya penjepit tabung reaksi; Perbedaan: kawat kasa memakai pegas mekanik"
        ],
        "answer": 0,
        "why": {
            "0": "Kawat kasa mendistribusikan panas merata pada bejana kaca dasar datar, sedangkan segitiga porselen menopang mangkuk krusibel tahan api tinggi."
        },
        "distractorWhy": {
            "1": "Keduanya adalah penyangga pemanas, bukan wadah penampung zat cair.",
            "2": "Keduanya bukan sumber penghasil api pemanas (sumber api adalah pembakar bunsen/spiritus).",
            "3": "Keduanya bukan penjepit tabung reaksi (penjepit adalah klem/gegep kayu)."
        }
    },
    {
        "id": "ipa-d-7-b1-q18",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 13 Ayo Uji Kemampuan No. 2d), perbandingan antara TABUNG REAKSI dan CAWAN PENGUAP (evaporating dish) adalah…",
        "options": [
            "Persamaan: keduanya wadah perlakuan zat kimia; Perbedaan: tabung reaksi untuk mereaksikan zat bervolume kecil, cawan penguap untuk memisahkan pelarut melalui evaporasi",
            "Persamaan: keduanya terbuat dari kaca tipis; Perbedaan: cawan penguap tidak boleh dipanaskan di atas api",
            "Persamaan: keduanya alat pengukur volume air; Perbedaan: cawan penguap memiliki skala mililiter presisi",
            "Persamaan: keduanya wadah titrasi asam basa; Perbedaan: tabung reaksi berdasar rata lebar"
        ],
        "answer": 0,
        "why": {
            "0": "Tabung reaksi digunakan untuk pengujian reaksi kecil, sedangkan cawan porselen berbibir lebar memudahkan penguapan cepat cairan."
        },
        "distractorWhy": {
            "1": "Cawan penguap terbuat dari porselen tahan panas tinggi dan memang dirancang khusus untuk dipanaskan.",
            "2": "Keduanya tidak memiliki skala volume mililiter presisi.",
            "3": "Wadah titrasi adalah labu Erlenmeyer, dan tabung reaksi berdasar bulat bukan berdasar rata lebar."
        }
    },
    {
        "id": "ipa-d-7-b1-q19",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 13 Ayo Uji Kemampuan No. 3), jika seorang siswa melihat temannya memanaskan cairan kimia dengan mulut tabung reaksi diarahkan ke teman di sebelahnya, tindakan keselamatan yang tepat adalah…",
        "options": [
            "Menegur dan meminta segera mengarahkan mulut tabung reaksi ke arah dinding kosong yang aman",
            "Membiarkan saja karena cairan kimia di laboratorium sekolah pasti tidak berbahaya",
            "Mendekatkan wajah ke tabung reaksi untuk memeriksa apakah cairan sudah mendidih",
            "Menutup mulut tabung reaksi rapat-rapat dengan ibu jari tangan secara langsung"
        ],
        "answer": 0,
        "why": {
            "0": "Mulut tabung reaksi yang dipanaskan dapat meletupkan cairan mendidih atau uap beracun, sehingga harus selalu diarahkan ke area kosong aman."
        },
        "distractorWhy": {
            "1": "Bahan kimia di laboratorium memiliki risiko bahaya iritasi dan luka bakar bila memercik ke tubuh.",
            "2": "Mendekatkan wajah sangat berisiko terkena semburan kimia langsung pada mata.",
            "3": "Menutup dengan ibu jari dapat membakar kulit jari dan meningkatkan tekanan gas yang meledak."
        }
    },

    # --- HALAMAN 24-25: AYO UJI KEMAMPUAN (MERANCANG PERCOBAAN & METODE ILMIAH) ---
    {
        "id": "ipa-d-7-b1-q20",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 24 Ayo Uji Kemampuan No. 1a), apakah pernyataan 'Mobil berwarna putih lebih bagus daripada mobil berwarna hitam' dapat diselidiki secara metode ilmiah?",
        "options": [
            "Tidak dapat diselidiki, karena kata 'lebih bagus' adalah penilaian selera estetika subjektif yang tidak memiliki tolak ukur sains",
            "Dapat diselidiki, karena warna mobil dapat diamati langsung menggunakan mata telanjang",
            "Dapat diselidiki, dengan cara menghitung jumlah seluruh mobil putih di tempat parkir",
            "Dapat diselidiki, karena pabrik mobil selalu memproduksi mobil warna putih lebih banyak"
        ],
        "answer": 0,
        "why": {
            "0": "Metode ilmiah menuntut variabel yang objektif dan terukur. Kata 'bagus' merupakan opini selera subjektif tanpa batasan ilmiah."
        },
        "distractorWhy": {
            "1": "Meskipun warna dapat dilihat mata, kebagusannya tetap persepsi estetika subjektif tiap individu.",
            "2": "Jumlah mobil di tempat parkir mengukur populasi mobil, bukan membuktikan nilai estetika kebagusan.",
            "3": "Volume produksi pabrik adalah keputusan bisnis pasar, bukan hukum ilmiah pembuktian keindahan."
        }
    },
    {
        "id": "ipa-d-7-b1-q21",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 24 Ayo Uji Kemampuan No. 1b), apakah pernyataan 'Kelelawar suka berkumpul di tempat yang gelap daripada tempat yang terang' dapat diselidiki secara metode ilmiah?",
        "options": [
            "Dapat diselidiki, karena intensitas cahaya (gelap/terang) dan jumlah populasi kelelawar dapat diukur serta diuji secara empiris",
            "Tidak dapat diselidiki, karena kelelawar hanya terbang pada malam hari sehingga mustahil dihitung",
            "Tidak dapat diselidiki, karena manusia tidak bisa mengetahui isi hati dan kesukaan kelelawar",
            "Dapat diselidiki, tetapi hanya melalui wawancara dengan penduduk sekitar gua"
        ],
        "answer": 0,
        "why": {
            "0": "Intensitas cahaya dapat diukur dengan luxmeter, dan frekuensi keberadaan kelelawar dapat dihitung secara kuantitatif."
        },
        "distractorWhy": {
            "1": "Kelelawar malam hari dapat diamati dan dihitung menggunakan kamera inframerah atau sensor gerak.",
            "2": "Perilaku hewan diuji dari preferensi lokasi habitat terukur, bukan membaca perasaan batin.",
            "3": "Metode ilmiah mengandalkan observasi dan eksperimen data langsung, bukan sekadar opini wawancara."
        }
    },
    {
        "id": "ipa-d-7-b1-q22",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 24 Ayo Uji Kemampuan No. 1c), apakah pernyataan 'Musik dangdut lebih baik daripada musik rock' dapat diselidiki secara metode ilmiah?",
        "options": [
            "Tidak dapat diselidiki, karena frasa 'lebih baik' bergantung pada preferensi selera musik individu tanpa besaran fisis terukur",
            "Dapat diselidiki, dengan mengukur volume kekerasan suara speaker dalam satuan desibel",
            "Dapat diselidiki, dengan menghitung jumlah penonton konser dangdut terbanyak",
            "Dapat diselidiki, karena alat musik gendang lebih tradisional dibanding gitar listrik"
        ],
        "answer": 0,
        "why": {
            "0": "Pertanyaan mengenai preferensi genre musik bersifat nilai estetika emosional dan tidak dapat dibuktikan secara empiris sains."
        },
        "distractorWhy": {
            "1": "Kekerasan desibel mengukur intensitas bunyi, bukan membuktikan genre mana yang lebih baik secara mutlak.",
            "2": "Jumlah penonton mencerminkan popularitas tren pasar, bukan tolok ukur kualitas ilmiah.",
            "3": "Asal tradisi instrumen tidak membuktikan superioritas kualitas musikal ilmiah."
        }
    },
    {
        "id": "ipa-d-7-b1-q23",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 24 Ayo Uji Kemampuan No. 1d), apakah pernyataan 'Senar yang tipis memiliki suara yang lebih melengking dibandingkan senar yang tebal' dapat diselidiki secara metode ilmiah?",
        "options": [
            "Dapat diselidiki, karena ketebalan senar (diameter) dan frekuensi getaran suara (pitch) dapat diukur secara presisi",
            "Tidak dapat diselidiki, karena suara melengking hanya bisa dinilai oleh penyanyi profesional",
            "Tidak dapat diselidiki, karena semua senar gitar terbuat dari bahan kawat yang sama",
            "Dapat diselidiki, tetapi hanya berlaku untuk alat musik biola dan bukan gitar"
        ],
        "answer": 0,
        "why": {
            "0": "Tinggi nada bunyi berhubungan langsung dengan frekuensi gelombang (Hertz) dan ketebalan senar dapat diukur dengan mikrometer sekrup."
        },
        "distractorWhy": {
            "1": "Frekuensi nada dapat diukur objektif menggunakan osiloskop atau aplikasi frekuensi audio.",
            "2": "Ketebalan senar yang berbeda menghasilkan frekuensi berbeda sesuai hukum Mersenne.",
            "3": "Prinsip getaran senar berlaku universal pada semua instrumen dawai berdawai."
        }
    },
    {
        "id": "ipa-d-7-b1-q24",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 24 Ayo Uji Kemampuan No. 1e), apakah pernyataan 'Manusia saat ini lebih tinggi daripada manusia purba' dapat diselidiki secara metode ilmiah?",
        "options": [
            "Dapat diselidiki, melalui pengukuran panjang fosil kerangka tulang manusia purba dibandingkan data tinggi rata-rata manusia modern",
            "Tidak dapat diselidiki, karena manusia purba sudah punah seluruhnya ratusan ribu tahun lalu",
            "Tidak dapat diselidiki, karena tinggi badan manusia modern bervariasi di setiap negara",
            "Dapat diselidiki, hanya dengan membaca cerita legenda kuno nenek moyang"
        ],
        "answer": 0,
        "why": {
            "0": "Antropologi fisik dapat merekonstruksi tinggi badan manusia purba secara ilmiah dari rasio panjang tulang paha (femur)."
        },
        "distractorWhy": {
            "1": "Kepunahan manusia purba meninggalkan bukti fosil keras yang dapat diukur secara metrik.",
            "2": "Variasi tinggi badan dapat dianalisis menggunakan metode statistika rata-rata populasi.",
            "3": "Legenda kuno adalah mitos tutur, bukan data empiris pengukuran antropologis."
        }
    },
    {
        "id": "ipa-d-7-b1-q25",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 24 Ayo Uji Kemampuan No. 2a), dalam percobaan menyelidiki apakah banyaknya pupuk memengaruhi pertumbuhan tanaman, VARIABEL BEBASNYA adalah…",
        "options": [
            "Banyaknya atau dosis pupuk yang ditambahkan pada tanaman",
            "Pertambahan tinggi batang tanaman yang diukur mingguan",
            "Jenis tanaman dan jenis tanah yang digunakan",
            "Jumlah volume air siraman yang diberikan setiap pagi"
        ],
        "answer": 0,
        "why": {
            "0": "Variabel bebas (independen) adalah faktor yang sengaja diubah-ubah nilainya oleh peneliti untuk melihat pengaruhnya."
        },
        "distractorWhy": {
            "1": "Pertambahan tinggi tanaman adalah variabel terikat yang merespons perlakuan.",
            "2": "Jenis tanaman dan tanah adalah variabel kontrol yang harus disamakan.",
            "3": "Volume air siraman adalah variabel kontrol perlakuan lingkungan."
        }
    },
    {
        "id": "ipa-d-7-b1-q26",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 24 Ayo Uji Kemampuan No. 2b), cara paling tepat untuk MENGUKUR VARIABEL TERIKAT pada percobaan pertumbuhan tanaman tersebut adalah…",
        "options": [
            "Mengukur pertambahan tinggi batang tanaman dari permukaan tanah memakai mistar atau meteran secara berkala",
            "Menghitung jumlah butir pupuk yang tersisa di dalam tanah setiap hari",
            "Memperkirakan kesuburan daun hanya dengan melihat warna hijaunya secara sekilas",
            "Menimbang berat pot tanaman beserta air siramannya di atas neraca duduk"
        ],
        "answer": 0,
        "why": {
            "0": "Pertumbuhan tanaman (variabel terikat) diukur secara objektif kuantitatif melalui pertambahan tinggi batang berkala."
        },
        "distractorWhy": {
            "1": "Menghitung sisa butir pupuk tidak mengukur variabel pertumbuhan biologis tanaman.",
            "2": "Melihat warna hijau sekilas bersifat kualitatif dan kurang akurat dalam mengukur pertumbuhan tinggi tanaman.",
            "3": "Berat pot dipengaruhi kelembapan air tanah, bukan murni biomassa tanaman."
        }
    },
    {
        "id": "ipa-d-7-b1-q27",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 24 Ayo Uji Kemampuan No. 2c), hal-hal yang WAJIB dijadikan VARIABEL KONTROL pada percobaan pertumbuhan tanaman tersebut adalah…",
        "options": [
            "Jenis tanaman, jenis tanah, ukuran wadah pot, volume air penyiraman, dan paparan cahaya matahari",
            "Dosis pupuk urea yang diberikan pada masing-masing pot perlakuan",
            "Tinggi akhir tanaman jagung pada hari terakhir pengamatan",
            "Jumlah daun yang tumbuh pada masing-masing tanaman uji"
        ],
        "answer": 0,
        "why": {
            "0": "Variabel kontrol adalah semua faktor perlakuan luar yang dijaga identik agar hasil eksperimen murni dipicu oleh variabel bebas."
        },
        "distractorWhy": {
            "1": "Dosis pupuk adalah variabel bebas yang sengaja dibuat berbeda.",
            "2": "Tinggi akhir tanaman adalah variabel terikat hasil pengukuran.",
            "3": "Jumlah daun adalah variabel terikat respons tanaman."
        }
    },
    {
        "id": "ipa-d-7-b1-q28",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 24 Ayo Uji Kemampuan No. 2d), rumusan HIPOTESIS yang tepat untuk menyatakan hubungan antara variabel bebas dan terikat adalah…",
        "options": [
            "Semakin banyak takaran pupuk yang ditambahkan (hingga batas optimal), maka laju pertambahan tinggi tanaman akan semakin cepat",
            "Apakah banyaknya pupuk memengaruhi pertumbuhan tanaman menjadi lebih besar?",
            "Tanaman membutuhkan pupuk dan air untuk proses fotosintesis setiap hari",
            "Pupuk kimia lebih mahal harganya dibanding pupuk kandang alami"
        ],
        "answer": 0,
        "why": {
            "0": "Hipotesis adalah dugaan sementara ilmiah yang menghubungkan variabel bebas dengan variabel terikat dalam pernyataan sebab-akibat."
        },
        "distractorWhy": {
            "1": "Bentuk kalimat tanya adalah rumusan masalah/tujuan percobaan, bukan hipotesis.",
            "2": "Pernyataan kebutuhan fotosintesis adalah fakta umum, bukan dugaan sementara percobaan.",
            "3": "Perbandingan harga pupuk adalah informasi ekonomi, bukan hipotesis eksperimen biologi."
        }
    },
    {
        "id": "ipa-d-7-b1-q29",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 24 Tabel Pengamatan), pada penyelidikan: 'Berapa waktu yang dibutuhkan untuk sampah organik yang berbeda-beda dapat terurai di dalam tanah?', variabel bebasnya adalah…",
        "options": [
            "Jenis bahan sampah organik yang diuji (dedaunan kering, kulit sayuran, dan sisa makanan)",
            "Lama waktu yang dibutuhkan hingga sampah terurai sempurna di tanah",
            "Kedalaman lubang tanah dan jenis mikroorganisme pengurai tanah",
            "Kelembapan udara di sekitar lokasi penimbunan sampah organik"
        ],
        "answer": 0,
        "why": {
            "0": "Variabel bebasnya adalah jenis bahan sampah organik yang bervariasi untuk diteliti perbedaannya."
        },
        "distractorWhy": {
            "1": "Lama waktu penguraian adalah variabel terikat yang diamati dan diukur nilainya.",
            "2": "Kedalaman lubang tanah adalah variabel kontrol yang harus diseragamkan.",
            "3": "Kelembapan tanah adalah variabel kontrol lingkungan."
        }
    },
    {
        "id": "ipa-d-7-b1-q30",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 24 Tabel Pengamatan), pada penyelidikan: 'Bagaimana pengaruh jenis tanah yang digunakan terhadap kecepatan tumbuh tanaman cabe?', variabel terikatnya adalah…",
        "options": [
            "Kecepatan tumbuh atau laju pertambahan tinggi tanaman cabe per satuan waktu",
            "Variasi jenis tanah media tanam (tanah humus, pasir, dan lempung)",
            "Volume air penyiraman yang disiramkan setiap pagi dan sore",
            "Jumlah benih biji cabe yang disemaikan pada masing-masing wadah"
        ],
        "answer": 0,
        "why": {
            "0": "Variabel terikat adalah kecepatan tumbuh tanaman cabe yang nilainya dipengaruhi oleh jenis tanah yang digunakan."
        },
        "distractorWhy": {
            "1": "Jenis tanah adalah variabel bebas yang sengaja dibedakan pada tiap kelompok.",
            "2": "Volume air penyiraman adalah variabel kontrol yang wajib dibuat sama.",
            "3": "Jumlah benih cabe adalah variabel kontrol awal penyemaian."
        }
    },

    # --- HALAMAN 35: AYO UJI KEMAMPUAN (PENGUKURAN) ---
    {
        "id": "ipa-d-7-b1-q31",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 35 Ayo Uji Kemampuan No. 1), mengapa hasil perkiraan (estimasi) indra manusia sering kali berbeda atau jauh dari hasil pengukuran alat ukur ilmiah?",
        "options": [
            "Karena indra manusia bersifat kualitatif dan subjektif serta dipengaruhi persepsi pribadi, sedangkan alat ukur menghasilkan nilai kuantitatif terstandarisasi",
            "Karena alat ukur laboratorium selalu mengalami kerusakan teknis saat digunakan",
            "Karena indra manusia memiliki ketelitian milimeter yang jauh melampaui alat ukur",
            "Karena perkiraan manusia selalu menggunakan satuan baku Sistem Internasional"
        ],
        "answer": 0,
        "why": {
            "0": "Indra manusia (peraba, penglihatan) tidak memiliki skala baku terkalibrasi sehingga pengukuran ilmiah wajib menggunakan alat ukur standar."
        },
        "distractorWhy": {
            "1": "Alat ukur ilmiah terkalibrasi justru dirancang untuk memberikan data terpercaya dan stabil.",
            "2": "Indra manusia tidak memiliki skala metrik mikro yang presisi dan mudah terkecoh ilusi.",
            "3": "Perkiraan indra bersifat taksiran kasar tanpa satuan baku pasti."
        }
    },
    {
        "id": "ipa-d-7-b1-q32",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 35 Ayo Uji Kemampuan No. 2), esensi utama yang dipelajari mengenai pengukuran dalam metode ilmiah sains adalah…",
        "options": [
            "Pengukuran menyediakan data kuantitatif objektif berupa angka dan satuan baku yang dapat diverifikasi ulang oleh orang lain",
            "Pengukuran bertujuan membuktikan bahwa perkiraan awal peneliti selalu benar tanpa cela",
            "Pengukuran hanya diperlukan jika data kualitatif deskripsi kata-kata tidak mencukupi",
            "Pengukuran menghasilkan kesimpulan mutlak yang tidak boleh diuji kembali oleh ilmuwan lain"
        ],
        "answer": 0,
        "why": {
            "0": "Sains bertumpu pada bukti empiris kuantitatif yang dapat diukur secara akurat dan diuji ulang (replikasi) secara terbuka."
        },
        "distractorWhy": {
            "1": "Pengukuran dilakukan untuk menguji kebenaran hipotesis secara objektif, bukan membela perkiraan awal.",
            "2": "Pengukuran kuantitatif adalah pilar utama eksperimen sains, bukan sekadar pelengkap cadangan.",
            "3": "Prinsip sains selalu terbuka untuk diuji ulang dan disempurnakan melalui penelitian lanjutan."
        }
    },
    {
        "id": "ipa-d-7-b1-q33",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 35 Ayo Uji Kemampuan No. 3), mengapa ilmuwan sains melakukan pengukuran secara BERULANG dan bagaimana cara mengolah datanya?",
        "options": [
            "Pengukuran berulang dilakukan untuk meminimalkan kesalahan acak, dan datanya diolah dengan menghitung nilai rata-rata (mean)",
            "Pengukuran berulang dilakukan untuk memilih satu angka hasil pengukuran yang paling disukai peneliti",
            "Pengukuran berulang dilakukan untuk menjumlahkan semua angka agar nilainya terlihat sangat besar",
            "Pengukuran berulang dilakukan hanya jika alat ukur yang digunakan tidak memiliki jarum penunjuk"
        ],
        "answer": 0,
        "why": {
            "0": "Pengukuran berulang dan perhitungan nilai rata-rata mereduksi galat acak (random error) sehingga menghasilkan nilai yang lebih akurat."
        },
        "distractorWhy": {
            "1": "Memilih data yang disukai melanggar kode etik kejujuran ilmiah sains.",
            "2": "Menjumlahkan tanpa membagi dengan banyaknya pengulangan menghasilkan total akumulatif yang keliru.",
            "3": "Pengukuran berulang adalah kaidah baku pada semua jenis alat ukur analog maupun digital."
        }
    },
    {
        "id": "ipa-d-7-b1-q34",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 35 Eksperimen Pengukuran), untuk mengukur volume batu yang bentuknya tidak beraturan, sebuah gelas ukur mula-mula diisi air 50 mL. Setelah batu dimasukkan seluruhnya, permukaan air naik ke 78 mL. Volume batu tersebut adalah…",
        "options": [
            "28 mL (28 cm³)",
            "128 mL (128 cm³)",
            "50 mL (50 cm³)",
            "78 mL (78 cm³)"
        ],
        "answer": 0,
        "why": {
            "0": "Volume batu tak beraturan dihitung dari selisih kenaikan cairan: Volume akhir - Volume awal = 78 mL - 50 mL = 28 mL setara 28 cm³."
        },
        "distractorWhy": {
            "1": "Nilai 128 mL keliru karena menjumlahkan volume air awal dengan volume akhir (50 + 78).",
            "2": "Nilai 50 mL adalah volume air awal sebelum batu dicelupkan.",
            "3": "Nilai 78 mL adalah volume total air ditambah batu, bukan volume batu murni."
        }
    },

    # --- HALAMAN 42: AYO UJI KEMAMPUAN (PELAPORAN HASIL PERCOBAAN) ---
    {
        "id": "ipa-d-7-b1-q35",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 42 Ayo Uji Kemampuan No. 1), Dian memanaskan air dan mencatat suhunya setiap menit. Aturan penyusunan tabel data percobaan yang baku adalah…",
        "options": [
            "Kolom sebelah kiri memuat variabel bebas (Waktu dalam satuan menit), dan kolom sebelah kanan memuat variabel terikat (Suhu dalam satuan °C)",
            "Kolom sebelah kiri memuat nama peneliti dan kolom sebelah kanan memuat merk pembakar spiritus",
            "Variabel terikat selalu diletakkan di kolom paling kiri sebelum variabel bebas",
            "Data pengukuran dicatat dalam paragraf cerita narasi tanpa garis batas kolom"
        ],
        "answer": 0,
        "why": {
            "0": "Konvensi tabel sains menempatkan variabel bebas di kolom kiri dan variabel terikat respons di kolom sebelah kanan disertai satuan bakunya."
        },
        "distractorWhy": {
            "1": "Tabel data eksperimen menyajikan data fisis variabel ukur, bukan merk peralatan.",
            "2": "Standar ilmiah meletakkan input variabel bebas di kolom kiri dan output variabel terikat di kolom kanan.",
            "3": "Tabel memerlukan format berkolom terstruktur agar pola angka mudah dibaca dan dianalisis."
        }
    },
    {
        "id": "ipa-d-7-b1-q36",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 42 Ayo Uji Kemampuan No. 2a), data Dian mencatat: suhu awal 28°C, menit ke-1 (35°C), menit ke-2 (42°C), menit ke-3 (49°C). Nilai rata-rata laju kenaikan suhu air per menit adalah…",
        "options": [
            "7°C per menit",
            "14°C per menit",
            "21°C per menit",
            "28°C per menit"
        ],
        "answer": 0,
        "why": {
            "0": "Kenaikan suhu tiap menit konsisten: 35-28=7°C, 42-35=7°C, 49-42=7°C. Rata-rata laju kenaikan suhu adalah 7°C per menit."
        },
        "distractorWhy": {
            "1": "Nilai 14°C adalah kenaikan suhu kumulatif selama dua menit pertama (42°C - 28°C).",
            "2": "Nilai 21°C adalah total pertambahan suhu selama tiga menit pemanasan penuh (49°C - 28°C).",
            "3": "Nilai 28°C adalah suhu awal air dingin sebelum dipanaskan di atas api."
        }
    },
    {
        "id": "ipa-d-7-b1-q37",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 42 Ayo Uji Kemampuan No. 2b), jenis grafik yang paling tepat digunakan untuk menyajikan data perubahan suhu air Dian terhadap waktu adalah…",
        "options": [
            "Grafik garis (line graph), dengan waktu pada sumbu-x dan suhu pada sumbu-y",
            "Diagram lingkaran (pie chart), karena menunjukkan porsi pecahan air",
            "Grafik batang horizontal terpisah tanpa hubungan urutan waktu",
            "Diagram gambar piktogram dengan simbol gelas kimia"
        ],
        "answer": 0,
        "why": {
            "0": "Grafik garis paling ideal untuk memvisualisasikan data kontinu yang berubah secara teratur terhadap waktu, memperlihatkan tren kenaikan suhu."
        },
        "distractorWhy": {
            "1": "Diagram lingkaran digunakan untuk proporsi bagian dari 100%, bukan data perkembangan berkala.",
            "2": "Grafik batang terpisah lebih cocok untuk data kategori diskret, bukan variabel waktu kontinu.",
            "3": "Diagram piktogram adalah visualisasi ilustrasi sederhana, bukan standar grafik analisis eksperimen laboratorium."
        }
    },
    {
        "id": "ipa-d-7-b1-q38",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 42 Ayo Uji Kemampuan Kesimpulan), rumusan kesimpulan ilmiah yang paling tepat berdasarkan data percobaan Dian adalah…",
        "options": [
            "Suhu air meningkat secara teratur sebesar 7°C setiap menitnya seiring bertambahnya lamanya waktu pemanasan",
            "Pemanasan air menyebabkan air mendidih seketika pada menit ke-1",
            "Air tidak mengalami perubahan suhu sama sekali selama pemanasan berlangsung",
            "Gelas kimia yang digunakan Dian memiliki ketahanan yang buruk terhadap panas api"
        ],
        "answer": 0,
        "why": {
            "0": "Kesimpulan ilmiah merangkum hubungan nyata antara variabel bebas dan terikat yang didukung langsung oleh tren data percobaan (kenaikan konstan 7°C/menit)."
        },
        "distractorWhy": {
            "1": "Data menunjukkan suhu pada menit ke-1 baru mencapai 35°C, jauh di bawah titik didih 100°C.",
            "2": "Pernyataan ini bertentangan dengan data yang mencatat suhu naik dari 28°C hingga 49°C.",
            "3": "Ketahanan gelas kimia bukan variabel yang diselidiki dalam percobaan pemanasan air tersebut."
        }
    }
]

bank_data = {
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
    "competencies": [
        {
            "code": "KOMP-IPA-D-7-BAB1-01",
            "grade": 7,
            "name": "Hakikat Ilmu Sains dan Metode Ilmiah",
            "materi": "Apa Itu Sains?, Laboratorium IPA & Keselamatan Kerja, Merancang Percobaan, Pengukuran Besaran & Satuan SI, Pelaporan Hasil Percobaan",
            "cpRef": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi) — Bab 1",
            "items": questions
        }
    ]
}

with open(r'c:\Users\hp\fiezel-apps\content\mapel\mapel-ipa-d.json', 'w', encoding='utf-8') as f:
    json.dump(bank_data, f, ensure_ascii=False, indent=2)

print(f"Berhasil menulis {len(questions)} butir soal ke mapel-ipa-d.json!")
