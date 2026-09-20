import json

# Load existing bank data with Bab 1, 2, 3, 4
with open(r'c:\Users\hp\fiezel-apps\content\mapel\mapel-ipa-d.json', 'r', encoding='utf-8') as f:
    bank_data = json.load(f)

print(f"Existing competencies: {len(bank_data['competencies'])}")
total_prev_items = sum(len(c['items']) for c in bank_data['competencies'])
print(f"Total previous items: {total_prev_items}")

# =========================================================================
# BAB 5: Karakteristik dan Klasifikasi Makhluk Hidup (hal. 135-158)
# =========================================================================
bab5_items = [
    {
        "id": "ipa-d-7-b5-q01",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 138-142), robot canggih dapat bergerak dan berbicara dengan manusia, tetapi robot TIDAK dikelompokkan sebagai makhluk hidup karena…",
        "options": [
            "Robot tidak tersusun atas sel biologis, tidak mengalami metabolisme nutrisi, dan tidak dapat bereproduksi menghasilkan keturunan",
            "Robot memiliki massa yang lebih berat daripada tubuh manusia",
            "Robot hanya dapat menggunakan baterai dan tidak membutuhkan aliran listrik",
            "Robot tidak memiliki warna kulit seperti hewan mamalia"
        ],
        "answer": 0,
        "why": {
            "0": "Ciri mutlak makhluk hidup meliputi susunan seluler, metabolisme internal, homeostasis, pertumbuhan, reproduksi, dan respons terhadap rangsangan yang tidak dimiliki mesin robot buatan."
        },
        "distractorWhy": {
            "1": "Massa benda adalah besaran fisis universal dan bukan pembeda antara benda hidup dengan benda mati.",
            "2": "Sumber energi mesin seperti listrik tidak menentukan status biologis makhluk hidup.",
            "3": "Warna kulit adalah variasi pigmen luar dan bukan kriteria dasar sains kehidupan."
        }
    },
    {
        "id": "ipa-d-7-b5-q02",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 140), tumbuhan putri malu (Mimosa pudica) yang mengatupkan daunnya seketika saat disentuh menunjukkan ciri makhluk hidup yaitu…",
        "options": [
            "Peka terhadap rangsang (iritabilitas)",
            "Mengeluarkan zat sisa respirasi (ekskresi)",
            "Menyesuaikan suhu tubuh secara endoterm",
            "Mengalami perubahan bentuk secara kimiawi"
        ],
        "answer": 0,
        "why": {
            "0": "Iritabilitas adalah kemampuan organisme hidup untuk menanggapi impuls rangsangan dari lingkungan luar (seperti sentuhan fisik, cahaya, atau getaran)."
        },
        "distractorWhy": {
            "1": "Ekskresi berkaitan dengan pembuangan sisa metabolit sel, bukan gerak seismonasti respons sentuhan.",
            "2": "Tumbuhan bersifat poikilotermik dan tidak mengatur suhu internal secara endotermik hewan.",
            "3": "Gerak mengatup adalah perubahan turgor sel fisika tumbuhan, bukan reaksi kimia pembentukan zat baru."
        }
    },
    {
        "id": "ipa-d-7-b5-q03",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 156 Ayo Uji Kemampuan No. 1), urutan tingkatan hierarki takson pada klasifikasi makhluk hidup dari yang tertinggi sampai terendah adalah…",
        "options": [
            "Kingdom -> Filum/Divisio -> Kelas -> Ordo -> Famili -> Genus -> Spesies",
            "Spesies -> Genus -> Famili -> Ordo -> Kelas -> Filum -> Kingdom",
            "Kingdom -> Ordo -> Filum -> Kelas -> Famili -> Spesies -> Genus",
            "Filum -> Kingdom -> Kelas -> Famili -> Ordo -> Genus -> Spesies"
        ],
        "answer": 0,
        "why": {
            "0": "Hierarki taksonomi Linnaeus tersusun runtut dari kelompok terbesar: Dunia/Kingdom, Filum (hewan)/Divisi (tumbuhan), Kelas, Bangsa/Ordo, Suku/Famili, Marga/Genus, dan Jenis/Spesies."
        },
        "distractorWhy": {
            "1": "Urutan ini adalah dari tingkatan terendah ke tertinggi, bukan dari tertinggi ke terendah.",
            "2": "Ordo diletakkan sebelum Filum dan Kelas, urutan takson ini keliru.",
            "3": "Filum adalah subkelompok di bawah Kingdom, bukan di atas Kingdom."
        }
    },
    {
        "id": "ipa-d-7-b5-q04",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 156 Ayo Uji Kemampuan No. 2), bagaimana hubungan antara persamaan ciri dan jumlah anggota organisme pada suatu tingkatan takson dari tingkat tertinggi (Kingdom) menuju tingkat terendah (Spesies)?",
        "options": [
            "Jumlah anggota organisme semakin sedikit, tetapi persamaan ciri fisik antaranggotanya semakin banyak dan spesifik",
            "Jumlah anggota organisme semakin banyak dan persamaan cirinya semakin sedikit",
            "Jumlah anggota organisme dan persamaan cirinya sama-sama selalu berjumlah konstan",
            "Persamaan ciri anggota pada tingkat spesies selalu nol persen"
        ],
        "answer": 0,
        "why": {
            "0": "Semakin ke bawah tingkatan takson (mendekati spesies), cakupan anggotanya semakin mengerucut sedikit namun hubungan kekerabatan dan kesamaan cirinya semakin seragam dan identik."
        },
        "distractorWhy": {
            "1": "Jumlah anggota terbanyak berada di tingkat tertinggi Kingdom, bukan di tingkat spesies.",
            "2": "Karakteristik anggota bervariasi sesuai tingkatan taksonomi dan tidak bernilai konstan.",
            "3": "Pada tingkat spesies, seluruh individu memiliki persamaan genetik dan morfologi paling tinggi."
        }
    },
    {
        "id": "ipa-d-7-b5-q05",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 156 Ayo Uji Kemampuan No. 3), perbedaan karakteristik paling mendasar antara kingdom PLANTAE dan kingdom ANIMALIA adalah…",
        "options": [
            "Plantae bersifat autotrof (berklorofil dan berdinding sel selulosa), sedangkan Animalia bersifat heterotrof (tidak berdinding sel dan dapat berpindah tempat aktif)",
            "Plantae tidak memiliki inti sel (prokariotik), sedangkan Animalia memiliki inti sel (eukariotik)",
            "Plantae bernapas menggunakan paru-paru, sedangkan Animalia tidak memerlukan oksigen",
            "Plantae berkembang biak secara eksklusif dengan spora dan tidak pernah berbiji"
        ],
        "answer": 0,
        "why": {
            "0": "Tumbuhan (Plantae) memproduksi makanannya sendiri melalui fotosintesis dengan plastida klorofil dan dinding sel kaku, sedangkan hewan (Animalia) mencerna materi organik lain dan bergerak bebas."
        },
        "distractorWhy": {
            "1": "Baik Plantae maupun Animalia sama-sama tergolong domain organisme eukariotik (memiliki membran inti sel).",
            "2": "Tumbuhan berfotosintesis dan berespirasi melalui stomata, bukan menggunakan organ paru-paru.",
            "3": "Mayoritas kingdom Plantae modern bereproduksi dengan biji (Spermatophyta), bukan spora semata."
        }
    },
    {
        "id": "ipa-d-7-b5-q06",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 156 Ayo Uji Kemampuan No. 4), seorang siswa menemukan tumbuhan di kebun sekolah dengan ciri: memiliki bunga sejati dan tulang daun berbentuk sejajar. Ciri lain yang dipastikan dimiliki oleh tumbuhan tersebut adalah…",
        "options": [
            "Memiliki sistem perakaran serabut, berkas pembuluh pengangkut tersebar, dan biji berkeping satu (Monokotil)",
            "Memiliki akar tunggang berkambium dan biji berkeping dua (Dikotil)",
            "Tidak memiliki jaringan xilem dan floem pengangkut air",
            "Menghasilkan spora di bagian bawah permukaan daunnya"
        ],
        "answer": 0,
        "why": {
            "0": "Tulang daun sejajar adalah ciri khas tumbuhan berkeping biji tunggal (Monokotil/Liliopsida), yang selalu berpasangan dengan akar serabut dan ikatan pembuluh tersebar tanpa kambium."
        },
        "distractorWhy": {
            "1": "Akar tunggang dan kambium adalah ciri khas tumbuhan berkeping biji dua (Dikotil) bertulang daun menyirip/menjari.",
            "2": "Tumbuhan berbunga (Angiospermae) adalah tumbuhan vaskular sejati yang memiliki xilem dan floem.",
            "3": "Spora adalah alat reproduksi tumbuhan paku dan lumut, bukan tumbuhan berbunga."
        }
    },
    {
        "id": "ipa-d-7-b5-q07",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 156 Tabel 5.3), filum hewan yang memiliki karakteristik tubuh lunak, sebagian besar terlindungi oleh cangkang zat kapur, seperti cumi-cumi, kerang, dan siput adalah…",
        "options": [
            "Mollusca",
            "Arthropoda",
            "Echinodermata",
            "Chordata"
        ],
        "answer": 0,
        "why": {
            "0": "Filum Mollusca (dari bahasa Latin mollis = lunak) menaungi hewan triploblastik bertubuh lunak tanpa ruas, sering dilindungi mantel cangkang kalsium karbonat."
        },
        "distractorWhy": {
            "1": "Arthropoda adalah filum hewan beruas dan berkerangka luar kitin (seperti serangga dan udang).",
            "2": "Echinodermata adalah hewan berkulit duri yang hidup di laut (seperti bintang laut).",
            "3": "Chordata adalah filum hewan yang memiliki notokorda/tulang belakang."
        }
    },
    {
        "id": "ipa-d-7-b5-q08",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 156 Tabel 5.3), filum hewan yang memiliki ciri khas kaki beruas-ruas, tubuh bersegmen, dan eksoskeleton dari zat kitin (contoh: belalang, udang, laba-laba, dan kaki seribu) adalah…",
        "options": [
            "Arthropoda",
            "Mollusca",
            "Annelida",
            "Porifera"
        ],
        "answer": 0,
        "why": {
            "0": "Filum Arthropoda (arthros = sendi/ruas, podos = kaki) dicirikan oleh kaki beruas, tubuh bersegmen bilateral simetris, dan kutikula kitin luar yang mengalami molting."
        },
        "distractorWhy": {
            "1": "Mollusca bertubuh lunak tanpa segmen kaki beruas.",
            "2": "Annelida adalah cacing bertubuh gelang tanpa rangka luar kitin keras.",
            "3": "Porifera adalah hewan spons sederhana berpori yang hidup menetap di dasar laut."
        }
    },
    {
        "id": "ipa-d-7-b5-q09",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 156 Tabel 5.3), bintang laut dan bulu babi dikelompokkan ke dalam filum ECHINODERMATA karena memiliki karakteristik utama yaitu…",
        "options": [
            "Tubuh berduri, memiliki sistem saluran air (ambulakral), dan seluruh anggotanya hidup di habitat laut",
            "Tubuh tersusun atas selulosa dan dapat berfotosintesis di darat",
            "Memiliki sayap tipis untuk terbang di udara bebas",
            "Memiliki tulang belakang sejati dan menyusui anaknya"
        ],
        "answer": 0,
        "why": {
            "0": "Echinodermata (echinos = landak/duri, derma = kulit) adalah biota laut bentik dengan simetri radial dewasa, rangka lempeng kapur berduri, dan kaki tabung ambulakral."
        },
        "distractorWhy": {
            "1": "Echinodermata adalah hewan heterotrof sejati tanpa dinding selulosa.",
            "2": "Hewan echinodermata adalah biota dasar laut tanpa organ sayap terbang.",
            "3": "Menyusui anak adalah ciri khas kelas Mamalia pada filum Chordata."
        }
    },
    {
        "id": "ipa-d-7-b5-q10",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 149), organisme mikroskopis bersel tunggal (uniseluler) yang TIDAK memiliki membran inti sel (prokariotik), seperti bakteri Escherichia coli, dimasukkan ke dalam kingdom…",
        "options": [
            "Monera",
            "Protista",
            "Fungi",
            "Plantae"
        ],
        "answer": 0,
        "why": {
            "0": "Kingdom Monera mencakup seluruh organisme prokariotik uniseluler yang materi genetik nukleoidnya tidak dibungkus oleh membran inti sel."
        },
        "distractorWhy": {
            "1": "Protista adalah mikroorganisme yang sudah bersifat eukariotik (memiliki membran inti sel).",
            "2": "Fungi adalah jamur eukariotik berfilamen atau uniseluler yang bersifat heterotrof pengurai.",
            "3": "Plantae adalah organisme eukariotik multiseluler berklorofil."
        }
    },
    {
        "id": "ipa-d-7-b5-q11",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 150), jamur (Fungi) TIDAK DAPAT dimasukkan ke dalam kelompok tumbuhan (Plantae) karena…",
        "options": [
            "Fungi tidak memiliki klorofil sehingga tidak dapat berfotosintesis dan dinding selnya tersusun dari zat kitin, bukan selulosa",
            "Fungi selalu berwujud gas dan tidak menempel di tanah",
            "Fungi dapat terbang aktif seperti serangga",
            "Fungi memiliki tulang belakang dan jantung beruang empat"
        ],
        "answer": 0,
        "why": {
            "0": "Jamur bersifat heterotrof absorptif (menguraikan bahan organik luar dengan enzim) karena tidak memiliki kloroplas, serta dinding selnya mengandung kitin."
        },
        "distractorWhy": {
            "1": "Jamur adalah materi hayati berwujud padat dan tumbuh menempel pada substrat organik.",
            "2": "Jamur tidak memiliki jaringan otot dan saraf untuk berpindah tempat secara mandiri.",
            "3": "Jamur tergolong organisme non-vertebrata tanpa jaringan tulang maupun sistem sirkulasi darah."
        }
    },
    {
        "id": "ipa-d-7-b5-q12",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 146-148), penulisan nama ilmiah organisme menurut sistem Tatanama Ganda (Binomial Nomenclature) yang benar untuk tanaman padi adalah…",
        "options": [
            "Oryza sativa (kata pertama diawali huruf kapital, kata kedua huruf kecil, dan dicetak miring)",
            "oryza Sativa (kata pertama huruf kecil, kata kedua kapital, cetak tegak)",
            "ORYZA SATIVA (seluruh huruf menggunakan kapital cetak tebal)",
            "Oryza-Sativa (diberi tanda hubung garis dan dicetak miring)"
        ],
        "answer": 0,
        "why": {
            "0": "Kaidah Linnaeus: kata pertama menunjukkan Genus dengan huruf awal kapital, kata kedua menunjukkan penunjuk spesies dengan huruf kecil, dan ditulis miring atau digarisbawahi terpisah."
        },
        "distractorWhy": {
            "1": "Nama genus wajib diawali huruf kapital dan penunjuk spesies wajib berhuruf kecil.",
            "2": "Format kapital penuh melanggar konvensi kode internasional tatanama botani/zoologi.",
            "3": "Tanda hubung tidak digunakan pada tatanama binomial dua kata standar."
        }
    },
    {
        "id": "ipa-d-7-b5-q13",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 144 Aktivitas 5.3 Kunci Dikotomi), langkah kerja utama dalam menyusun dan menggunakan kunci determinasi dikotomi untuk mengidentifikasi spesimen makhluk hidup adalah…",
        "options": [
            "Menyajikan dua pilihan karakteristik yang saling berlawanan pada setiap tahapan nomor hingga diperoleh nama takson organisme",
            "Menebak nama hewan secara acak berdasarkan warna kulitnya",
            "Mengurutkan hewan berdasarkan abjad nama daerah setempat",
            "Menimbang massa tubuh hewan dari yang teringan ke terberat"
        ],
        "answer": 0,
        "why": {
            "0": "Kunci dikotomi (dichotomous key) menyajikan pasangan kuplet ciri berlawanan (misal: 1a. bertulang belakang vs 1b. tidak bertulang belakang) yang menuntun pengguna secara logis ke identitas takson."
        },
        "distractorWhy": {
            "1": "Kunci determinasi bertumpu pada morfologi ilmiah objektif, bukan tebakan subjektif.",
            "2": "Nama ilmiah internasional tidak disusun berdasarkan abjad bahasa lokal daerah.",
            "3": "Massa tubuh fluktuatif dan bukan kriteria diagnostik identifikasi taksonomi."
        }
    },
    {
        "id": "ipa-d-7-b5-q14",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 153), Amoeba, Paramecium, dan Euglena dikelompokkan ke dalam kingdom PROTISTA karena…",
        "options": [
            "Merupakan organisme eukariotik bersel tunggal atau koloni sederhana yang tidak membentuk jaringan terdiferensiasi kompleks",
            "Memiliki sistem peredaran darah tertutup dan berkembang biak dengan melahirkan",
            "Merupakan tumbuhan berbiji terbuka yang menghasilkan bunga sejati",
            "Tersusun dari sel mati yang kebal terhadap air mendidih"
        ],
        "answer": 0,
        "why": {
            "0": "Kingdom Protista menaungi organisme eukariotik tingkat rendah (uniseluler atau multiseluler sederhana) yang menyerupai hewan, tumbuhan, atau jamur tanpa diferensiasi jaringan sejati."
        },
        "distractorWhy": {
            "1": "Protista bersel tunggal dan tidak memiliki organ sirkulasi darah maupun sistem reproduksi melahirkan.",
            "2": "Protista bukan tumbuhan berpembuluh berbiji.",
            "3": "Mikroorganisme protista tersusun dari sel hidup aktif bermetabolisme."
        }
    },
    {
        "id": "ipa-d-7-b5-q15",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 154-155), hewan vertebrata yang memiliki suhu tubuh berubah-ubah mengikuti suhu lingkungan luar (poikiloterm) dan mengalami fase metamorfosis dari hidup di air ke darat adalah…",
        "options": [
            "Amfibia (katak dan salamander)",
            "Aves (burung merpati dan elang)",
            "Mamalia (kucing dan kelinci)",
            "Reptilia (kadal dan buaya)"
        ],
        "answer": 0,
        "why": {
            "0": "Amfibia (amphi = dua, bios = hidup) berdarah dingin dan bertelur di air dengan berudu bernapas insang yang bermetamorfosis menjadi individu dewasa bernapas paru-paru dan kulit lembap."
        },
        "distractorWhy": {
            "1": "Aves adalah vertebrata berdarah panas (homoiterm) berbulu tanpa metamorfosis air.",
            "2": "Mamalia adalah hewan berdarah panas yang menyusui anaknya.",
            "3": "Reptilia bertelur di darat dengan cangkang kedap air dan tidak menjalani fase larva berudu di air."
        }
    },
    {
        "id": "ipa-d-7-b5-q16",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 155), kelompok hewan Chordata yang memiliki ciri penutup tubuh berupa bulu, memiliki paruh tanpa gigi, dan bertelur dengan cangkang keras kapur adalah…",
        "options": [
            "Aves (burung)",
            "Pisces (ikan)",
            "Reptilia (reptil)",
            "Mamalia"
        ],
        "answer": 0,
        "why": {
            "0": "Kelas Aves secara eksklusif dicirikan oleh modifikasi tungkai depan menjadi sayap, penutup tubuh berupa bulu keratin sejati, paruh tanduk tanpa gigi, dan tulang berongga ringan."
        },
        "distractorWhy": {
            "1": "Pisces bertubuh sisik lendir dan bernapas dengan insang di perairan.",
            "2": "Reptilia ditutupi oleh sisik zat tanduk kering, bukan bulu.",
            "3": "Mamalia ditutupi oleh rambut, memiliki kelenjar susu, dan melahirkan anak (sebagian besar)."
        }
    }
]

# =========================================================================
# BAB 6: Ekologi dan Pelestarian Lingkungan (hal. 159-182)
# =========================================================================
bab6_items = [
    {
        "id": "ipa-d-7-b6-q01",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 161-163), dalam suatu ekosistem kebun sekolah, komponen yang tergolong ke dalam KOMPONEN ABIOTIK adalah…",
        "options": [
            "Intensitas cahaya matahari, kelembapan udara, suhu, dan kadar mineral tanah",
            "Cacing tanah, bakteri pengurai, dan semut hitam",
            "Pohon mangga, rumput teki, dan tanaman tomat",
            "Ulat pemakan daun, burung pipit, dan belalang sembah"
        ],
        "answer": 0,
        "why": {
            "0": "Komponen abiotik mencakup seluruh faktor tak hidup fisik dan kimiawi lingkungan yang memengaruhi kelangsungan hidup organisme di ekosistem."
        },
        "distractorWhy": {
            "1": "Cacing, bakteri, dan semut adalah makhluk hidup penyusun komponen biotik.",
            "2": "Tumbuhan dan rumput adalah organisme autotrof produsen biotik.",
            "3": "Serangga dan burung adalah organisme konsumen biotik."
        }
    },
    {
        "id": "ipa-d-7-b6-q02",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 167), organisme yang menduduki tingkatan trofik pertama (produsen) pada rantai makanan selalu berupa…",
        "options": [
            "Organisme autotrof seperti tumbuhan hijau dan fitoplankton yang mampu memproduksi makanannya sendiri melalui fotosintesis",
            "Hewan karnivora predator puncak seperti harimau dan elang",
            "Bakteri dan jamur dekomposer pengurai zat organik",
            "Hewan herbivora pemakan rumput di padang savana"
        ],
        "answer": 0,
        "why": {
            "0": "Trofik pertama (dasar piramida energi) wajib ditempati organisme produsen yang mampu mengikat energi foton matahari menjadi energi kimia biomassa organik."
        },
        "distractorWhy": {
            "1": "Karnivora puncak menempati tingkatan trofik tertinggi (trofik 3 atau 4).",
            "2": "Dekomposer bertugas mendaur ulang materi dari seluruh tingkatan trofik, bukan fondasi fotosintesis.",
            "3": "Herbivora adalah konsumen primer yang menempati tingkatan trofik kedua."
        }
    },
    {
        "id": "ipa-d-7-b6-q03",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 180 Ayo Uji Kemampuan No. 1), apa dampak ekologis yang akan terjadi apabila dalam suatu jaring-jaring makanan populasi burung hantu dan elang punah secara mendadak akibat perburuan liar?",
        "options": [
            "Populasi tikus dan hama pemakan biji akan meledak tak terkendali sehingga merusak tanaman pertanian secara masif",
            "Seluruh tanaman padi akan tumbuh sepuluh kali lebih subur",
            "Populasi ular sawah akan langsung punah bersamaan pada hari yang sama",
            "Tidak terjadi dampak apa pun karena elang bukan bagian dari ekosistem"
        ],
        "answer": 0,
        "why": {
            "0": "Hilangnya predator alami pemangsa tikus menghilangkan mekanisme kontrol biologis, memicu ledakan populasi mangsa herbivora yang menghancurkan produsen."
        },
        "distractorWhy": {
            "1": "Tanaman pertanian justru rusak parah akibat dimakan oleh populasi hama pengerat yang membeludak.",
            "2": "Ular sawah memiliki hubungan kompetisi atau mangsa dengan elang dan tidak punah serentak.",
            "3": "Setiap spesies dalam jejaring makanan saling terkait menjaga homeostasis ekosistem."
        }
    },
    {
        "id": "ipa-d-7-b6-q04",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 180 Ayo Uji Kemampuan No. 2), seorang ilmuwan menemukan bahwa di Area Hutan A terdapat 10 rantai makanan, sedangkan di Area Hutan B terdapat 50 rantai makanan berbeda. Area yang memiliki stabilitas ekosistem dan keanekaragaman hayati tertinggi adalah…",
        "options": [
            "Area Hutan B, karena jaring-jaring makanannya jauh lebih kompleks sehingga jika satu spesies terganggu, masih tersedia banyak jalur alternatif rantai makanan lain",
            "Area Hutan A, karena semakin sedikit rantai makanan maka hewan semakin cepat kenyang",
            "Kedua area memiliki stabilitas ekosistem yang identik tanpa memandang jumlah rantai makanannya",
            "Area Hutan A, karena rantai makanan sederhana kebal terhadap perubahan iklim"
        ],
        "answer": 0,
        "why": {
            "0": "Semakin kompleks jaring-jaring makanan (biodiversitas tinggi), semakin tinggi daya lentur (resiliensi) ekosistem terhadap gangguan karena aliran energi memiliki banyak jalur alternatif."
        },
        "distractorWhy": {
            "1": "Kenyang tidaknya hewan ditentukan oleh ketersediaan biomassa, bukan penyederhanaan rantai trofik.",
            "2": "Stabilitas ekosistem berbanding lurus dengan kompleksitas interaksi keanekaragaman hayati.",
            "3": "Rantai makanan sederhana justru sangat rentan runtuh jika salah satu mata rantainya terputus."
        }
    },
    {
        "id": "ipa-d-7-b6-q05",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 180 Ayo Uji Kemampuan No. 3), usaha nyata sehari-hari yang dapat dilakukan siswa untuk membantu MENGURANGI JEJAK KARBON (carbon footprint) di Bumi adalah…",
        "options": [
            "Berjalan kaki atau bersepeda ke sekolah, mematikan peralatan listrik yang tidak terpakai, dan menanam pohon penghijauan",
            "Membakar sampah plastik di pekarangan rumah setiap sore hari",
            "Menebang pohon peneduh jalan agar jalanan terlihat lapang",
            "Menyalakan pendingin udara (AC) dengan pintu dan jendela terbuka lebar"
        ],
        "answer": 0,
        "why": {
            "0": "Jejak karbon adalah emisi gas rumah kaca akibat aktivitas manusia. Menghemat listrik, menggunakan transportasi rendah emisi, dan reboisasi pohon menyerap karbon dioksida atmosfer."
        },
        "distractorWhy": {
            "1": "Membakar plastik menghasilkan emisi karbon dioksida dan racun dioksin berbahaya bagi udara.",
            "2": "Penebangan pohon mengurangi penyerap karbon alami dan mempercepat laju pemanasan global.",
            "3": "Menyalakan AC pada ruangan terbuka memboroskan konsumsi energi listrik secara berlebihan."
        }
    },
    {
        "id": "ipa-d-7-b6-q06",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 180 Ayo Uji Kemampuan No. 4 Fakta Sains Wakatobi 2018), kematian seekor paus sperma dengan 5,9 kg sampah plastik di dalam perutnya memberikan pelajaran penting bahwa sampah plastik di laut…",
        "options": [
            "Tidak dapat dicerna dan menyumbat saluran pencernaan satwa laut serta terfragmentasi menjadi mikroplastik yang meracuni rantai makanan bahari",
            "Merupakan makanan alami bernutrisi tinggi bagi seluruh mamalia laut",
            "Dapat terurai secara alami dalam waktu dua menit di air laut asin",
            "Membantu paus berenang lebih cepat di kedalaman samudra"
        ],
        "answer": 0,
        "why": {
            "0": "Plastik bersifat non-biodegradable sintetik. Tertelannya plastik menyebabkan malnutrisi kronis, penyumbatan usus, dan kontaminasi partikel mikroplastik dalam rantai makanan laut."
        },
        "distractorWhy": {
            "1": "Plastik adalah polimer anorganik beracun tanpa nilai gizi nutrisi hayati.",
            "2": "Plastik konvensional membutuhkan ratusan tahun untuk terdegradasi di alam.",
            "3": "Timbunan sampah di lambung melemahkan kondisi fisik dan mengancam nyawa satwa laut."
        }
    },
    {
        "id": "ipa-d-7-b6-q07",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 169), pola interaksi simbiosis antara jamur dan ganggang pada Lichenes (lumut kerak), di mana jamur menyediakan air/mineral dan ganggang menyediakan makanan fotosintesis, merupakan contoh dari…",
        "options": [
            "Simbiosis mutualisme (kedua pihak saling menguntungkan)",
            "Simbiosis parasitisme (satu pihak untung, pihak lain dirugikan)",
            "Simbiosis komensalisme (satu untung, satu tidak terpengaruh)",
            "Predasi pemangsaan antarmakhluk hidup"
        ],
        "answer": 0,
        "why": {
            "0": "Mutualisme adalah hubungan timbal balik antara dua organisme berbeda spesies yang saling memberikan keuntungan esensial bagi kelangsungan hidup keduanya."
        },
        "distractorWhy": {
            "1": "Parasitisme menyebabkan kerugian atau penyakit pada inang, tidak saling memberi nutrisi.",
            "2": "Komensalisme hanya menguntungkan satu pihak tanpa merugikan pihak lain (misal ikan remora dan hiu).",
            "3": "Predasi adalah interaksi pemangsaan di mana satu organisme membunuh dan memakan mangsanya."
        }
    },
    {
        "id": "ipa-d-7-b6-q08",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 169), interaksi antara tanaman anggrek yang menempel pada batang pohon mangga merupakan contoh SIMBIOSIS KOMENSALISME karena…",
        "options": [
            "Tanaman anggrek mendapat tempat menempel untuk menjangkau cahaya matahari, sedangkan pohon mangga tidak merasa dirugikan dan tidak pula diuntungkan",
            "Tanaman anggrek menyedot sari makanan dari pembuluh floem pohon mangga hingga mati",
            "Pohon mangga memakan daun tanaman anggrek sebagai pupuk organik",
            "Keduanya saling bertukar materi genetik melalui akarnya"
        ],
        "answer": 0,
        "why": {
            "0": "Anggrek adalah tumbuhan epifit yang hanya menumpang tempat (substrat) tanpa mengambil nutrisi inang, sehingga inang tidak dirugikan (komensalisme)."
        },
        "distractorWhy": {
            "1": "Menyerap cairan inang adalah sifat tumbuhan parasit benalu/tali putri, bukan anggrek epifit.",
            "2": "Pohon mangga berfotosintesis mandiri dan tidak memangsa tumbuhan lain.",
            "3": "Simbiosis komensalisme tidak melibatkan pertukaran materi genetik antarspesies."
        }
    },
    {
        "id": "ipa-d-7-b6-q09",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 170), hubungan antara kutu rambut yang menghisap darah dari kulit kepala manusia merupakan contoh SIMBIOSIS PARASITISME karena…",
        "options": [
            "Kutu memperoleh nutrisi darah dan tempat tinggal (untung), sementara manusia menderita rasa gatal dan kehilangan darah (rugi)",
            "Manusia dan kutu rambut sama-sama memperoleh keuntungan kesehatan",
            "Kutu rambut menghasilkan vitamin penting bagi kesuburan rambut manusia",
            "Kutu rambut hidup bebas tanpa berinteraksi langsung dengan tubuh manusia"
        ],
        "answer": 0,
        "why": {
            "0": "Parasitisme adalah hubungan hidup bersama di mana parasit mengambil keuntungan nutrisi dari tubuh inang sementara inang dirugikan atau mengalami kerusakan jaringan."
        },
        "distractorWhy": {
            "1": "Manusia menderita iritasi dan kerugian darah, tidak memperoleh keuntungan biologis.",
            "2": "Kutu adalah ektoparasit obligat penghisap darah tanpa fungsi sintesis vitamin.",
            "3": "Kutu hidup menempel permanen dan bergantung penuh pada cairan inang."
        }
    },
    {
        "id": "ipa-d-7-b6-q10",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 168), dalam piramida energi suatu ekosistem alami, efisiensi perpindahan energi rata-rata dari satu tingkatan trofik ke tingkatan trofik di atasnya diperkirakan hanya sebesar…",
        "options": [
            "Sekitar 10%, karena 90% energi lainnya hilang sebagai energi panas metabolisme, aktivitas gerak, dan sisa ekskresi",
            "Seratus persen tanpa ada energi yang hilang sama sekali",
            "Sekitar 90% berpindah utuh ke tingkatan trofik puncak",
            "Nol persen karena energi tidak dapat mengalir di antara makhluk hidup"
        ],
        "answer": 0,
        "why": {
            "0": "Hukum efisiensi energi trofik Lindeman menyatakan rata-rata hanya ~10% energi biomassa yang dikonversi menjadi jaringan tubuh trofik berikutnya, selebihnya terdisipasi sebagai panas respirasi."
        },
        "distractorWhy": {
            "1": "Efisiensi 100% melanggar hukum termodinamika tentang disipasi entropi panas.",
            "2": "Angka 90% adalah porsi energi yang terbuang dan terpakai metabolisme, bukan yang terserap ke trofik atas.",
            "3": "Energi kimia mengalir nyata melalui rantai konsumsi makanan."
        }
    },
    {
        "id": "ipa-d-7-b6-q11",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 174), fenomena EUTROFIKASI di perairan danau yang dipicu oleh limpasan pupuk pertanian berlebih mengakibatkan kematian massal ikan karena…",
        "options": [
            "Ledakan populasi alga (blooming algae) menutupi permukaan air, dan saat alga mati diuraikan oleh bakteri pengurai yang menghabiskan seluruh oksigen terlarut (anoksia)",
            "Pupuk kimia mengubah air danau menjadi bongkahan batu padat",
            "Alga memakan seluruh ikan dan katak di danau secara langsung",
            "Kandungan air danau menguap seluruhnya menjadi gas karbon monoksida"
        ],
        "answer": 0,
        "why": {
            "0": "Eutrofikasi menyebabkan ledakan gulma/alga akibat kelebihan nitrat-fosfat. Dekomposisi biomassa alga yang mati mengonsumsi oksigen terlarut (DO) drastis hingga ikan mati lemas."
        },
        "distractorWhy": {
            "1": "Eutrofikasi terjadi di media air dan tidak mengubah danau menjadi batu padat.",
            "2": "Alga adalah organisme fotosintetik mikroskopis autotrof, bukan predator pemangsa ikan.",
            "3": "Air danau tetap ada namun mengalami penurunan kualitas fisikokimiawi yang fatal bagi fauna air."
        }
    },
    {
        "id": "ipa-d-7-b6-q12",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 176-178), upaya pelestarian keanekaragaman hayati flora dan fauna yang dilakukan secara INSITU adalah…",
        "options": [
            "Pelestarian yang dilakukan langsung di dalam habitat asli alaminya, seperti di Taman Nasional Ujung Kulon dan Cagar Alam",
            "Pelestarian hewan dengan cara menangkar di kebun binatang kota dan akuarium buatan",
            "Penyimpanan benih tanaman di laboratorium kriogenik luar negeri",
            "Pemeliharaan satwa liar langka di dalam kandang rumah pribadi"
        ],
        "answer": 0,
        "why": {
            "0": "Konservasi in situ adalah perlindungan spesies flora dan fauna di dalam ekosistem habitat aslinya (taman nasional, suaka margasatwa, cagar alam) untuk menjaga dinamika populasi alaminya."
        },
        "distractorWhy": {
            "1": "Penangkaran di kebun binatang adalah metode konservasi ex situ (di luar habitat asli).",
            "2": "Penyimpanan plasma nutfah benih di bank gen adalah konservasi ex situ terisolasi.",
            "3": "Memelihara satwa langka di rumah melanggar hukum konservasi dan bukan program pelestarian resmi."
        }
    },
    {
        "id": "ipa-d-7-b6-q13",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 176-178), upaya pelestarian satwa langka yang dilakukan secara EKSITU (ex-situ) adalah…",
        "options": [
            "Pelestarian yang dilakukan di luar habitat aslinya dengan membuat lingkungan buatan, seperti di Kebun Raya Bogor dan Taman Safari",
            "Pelestarian di hutan lindung pedalaman Kalimantan",
            "Pelestarian terumbu karang di kawasan Taman Nasional Bunaken",
            "Membiarkan perburuan liar tanpa pengawasan aparat kehutanan"
        ],
        "answer": 0,
        "why": {
            "0": "Konservasi ex situ dilakukan dengan memindahkan organisme langka keluar dari habitat aslinya yang terancam ke fasilitas penangkaran buatan terkelola seperti kebun binatang dan kebun raya."
        },
        "distractorWhy": {
            "1": "Hutan lindung habitat asli adalah bentuk konservasi in situ.",
            "2": "Taman Nasional perairan asli laut adalah konservasi in situ.",
            "3": "Membiarkan perburuan adalah tindakan destruktif yang memicu kepunahan keanekaragaman hayati."
        }
    },
    {
        "id": "ipa-d-7-b6-q14",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 165), organisme pengurai (DEKOMPOSER) seperti jamur saprofit dan bakteri tanah memegang peranan krusial dalam siklus materi karena…",
        "options": [
            "Menguraikan sisa-sisa jasad makhluk hidup yang mati menjadi senyawa anorganik sederhana penyubur tanah yang dapat diserap kembali oleh produsen",
            "Menghasilkan gas beracun yang mematikan seluruh populasi tumbuhan",
            "Memangsa hewan herbivora yang berkeliaran di padang rumput",
            "Menghentikan daur air dan mineral di permukaan bumi"
        ],
        "answer": 0,
        "why": {
            "0": "Dekomposer menutup siklus biogeokimia dengan memecah materi organik kompleks dari organisme mati menjadi unsur hara mineral tanah yang esensial bagi tumbuhan."
        },
        "distractorWhy": {
            "1": "Dekomposer menghasilkan zat hara yang menyuburkan ekosistem, bukan gas perusak.",
            "2": "Pengurai mencerna detritus sisa jasad mati secara absorpsi, bukan memburu hewan hidup.",
            "3": "Pengurai justru menggerakkan siklus nutrisi dan mineral berjalan berkesinambungan."
        }
    },
    {
        "id": "ipa-d-7-b6-q15",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 173), fenomena akumulasi konsentrasi racun pestisida kimia sintetis yang semakin membesar pada tingkatan trofik tertinggi dalam suatu rantai makanan dikenal dengan istilah…",
        "options": [
            "Biomagnifikasi (pemekatan hayati)",
            "Biodegradasi alami",
            "Bioindikator ekosistem",
            "Bioremediasi mikroba"
        ],
        "answer": 0,
        "why": {
            "0": "Biomagnifikasi adalah peningkatan konsentrasi polutan non-biodegradable (seperti DDT atau merkuri) di sepanjang rantai makanan, menyebabkan predator puncak menerima dosis racun tertinggi."
        },
        "distractorWhy": {
            "1": "Biodegradasi adalah penguraian alami bahan ramah lingkungan oleh mikroorganisme.",
            "2": "Bioindikator adalah spesies yang menjadi tolak ukur biologis kualitas lingkungan hidup.",
            "3": "Bioremediasi adalah pemanfaatan mikroba untuk membersihkan lahan tercemar limbah."
        }
    },
    {
        "id": "ipa-d-7-b6-q16",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 177), satwa endemik Indonesia yang dilindungi ketat di kawasan Taman Nasional Komodo di Provinsi Nusa Tenggara Timur adalah…",
        "options": [
            "Varanus komodoensis (Kadal purba Komodo)",
            "Harimau Siberia",
            "Beruang kutub",
            "Kanguru pohon Australia"
        ],
        "answer": 0,
        "why": {
            "0": "Komodo (Varanus komodoensis) adalah spesies kadal terbesar di dunia yang merupakan fauna endemik asli kepulauan Nusa Tenggara Timur (Pulau Komodo, Rinca, dan Padar)."
        },
        "distractorWhy": {
            "1": "Harimau Siberia adalah fauna asli kawasan beriklim dingin Rusia dan Tiongkok timur.",
            "2": "Beruang kutub adalah mamalia predator arktik lingkaran kutub utara.",
            "3": "Kanguru adalah fauna asli benua Australia dan Papua."
        }
    }
]

# =========================================================================
# BAB 7: Bumi dan Tata Surya (hal. 183-218)
# =========================================================================
bab7_items = [
    {
        "id": "ipa-d-7-b7-q01",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 226 Ayo Uji Kemampuan No. 1), jarak suatu planet terhadap Matahari memegang peranan krusial terhadap peluang adanya kehidupan karena menentukan…",
        "options": [
            "Suhu permukaan planet yang memungkinkan air berada dalam wujud cair (zona layak huni / habitable zone)",
            "Jumlah cincin gas yang mengitari khatulistiwa planet",
            "Warna cahaya bintang yang terlihat dari permukaan planet",
            "Kecepatan rotasi sumbu magnet planet menjadi bernilai konstan"
        ],
        "answer": 0,
        "why": {
            "0": "Zona laik huni (Goldilocks zone) adalah orbit planet yang tidak terlalu dekat sehingga air menguap habis, dan tidak terlalu jauh sehingga air membeku abadi, memungkinkan eksistensi air cair penopang biokimia kehidupan."
        },
        "distractorWhy": {
            "1": "Cincin planet (seperti cincin Saturnus) dibentuk oleh serpihan debu es dan batuan akibat gaya pasang surut gravitasi, bukan jarak zona hidup.",
            "2": "Warna bintang ditentukan oleh suhu fotosfer bintang induk itu sendiri.",
            "3": "Kecepatan rotasi sumbu ditentukan oleh momentum sudut awal pembentukan planet."
        }
    },
    {
        "id": "ipa-d-7-b7-q02",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 226 Ayo Uji Kemampuan No. 2), jika jarak rata-rata Matahari ke Bumi adalah 150.000.000 km dan kecepatan cahaya adalah 300.000 km/detik, berapakah waktu yang dibutuhkan seberkas cahaya Matahari untuk mencapai Bumi?",
        "options": [
            "500 detik (sekitar 8,3 menit)",
            "50 detik (kurang dari 1 menit)",
            "1.500 detik (sekitar 25 menit)",
            "365 hari penuh"
        ],
        "answer": 0,
        "why": {
            "0": "Rumus waktu tempuh t = jarak / kelajuan cahaya = 150.000.000 km / 300.000 km/s = 500 detik, setara dengan 500 / 60 = 8 menit 20 detik (sekitar 8,3 menit)."
        },
        "distractorWhy": {
            "1": "Nilai 50 detik diperoleh dari salah pembagian faktor nol desimal.",
            "2": "Nilai 1.500 detik diperoleh dari perkalian keliru.",
            "3": "Satu tahun adalah waktu tempuh revolusi bumi mengelilingi matahari, bukan waktu rambat sinar cahaya."
        }
    },
    {
        "id": "ipa-d-7-b7-q03",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 226 Ayo Uji Kemampuan No. 4), sistem Kalender Hijriah dihitung berdasarkan keteraturan siklus revolusi Bulan mengelilingi Bumi. Tanggal 1 Hijriah ditandai oleh fase Bulan Baru (hilal), maka pada tanggal 14-15 Hijriah penampakan Bulan di langit adalah…",
        "options": [
            "Fase Bulan Purnama (Full Moon), di mana piringan Bulan tampak bulat sempurna disinari penuh oleh Matahari",
            "Fase Bulan Sabit awal yang sangat tipis di ufuk barat",
            "Fase Gerhana Matahari total yang menggelapkan bumi",
            "Bulan tidak tampak sama sekali di langit malam hari"
        ],
        "answer": 0,
        "why": {
            "0": "Pada pertengahan periode sinodis bulan (sekitar hari ke-14 atau 15), posisi Bulan berada berseberangan dengan Matahari relatif terhadap Bumi, sehingga seluruh permukaan Bulan yang menghadap Bumi memantulkan cahaya matahari penuh."
        },
        "distractorWhy": {
            "1": "Bulan sabit awal muncul pada awal bulan Hijriah (tanggal 2-4).",
            "2": "Gerhana matahari terjadi saat konjungsi fase Bulan Baru (tanggal 1), bukan saat purnama pertengahan bulan.",
            "3": "Bulan yang tidak tampak sama sekali adalah fase Bulan Mati/Bulan Baru (hari ke-29/30)."
        }
    },
    {
        "id": "ipa-d-7-b7-q04",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 226 Ayo Uji Kemampuan No. 5), gravitasi Bulan sangat memengaruhi kestabilan lautan di Bumi. Jika kekuatan gravitasi Bulan meningkat menjadi 2 kali lebih kuat dari saat ini, fenomena alam yang akan terjadi di Bumi adalah…",
        "options": [
            "Perbedaan pasang naik dan pasang surut air laut di pantai akan menjadi dua kali lipat lebih ekstrem dan gelombang pasang jauh lebih tinggi",
            "Air laut di seluruh samudra akan mengering seketika",
            "Bumi akan berhenti berotasi pada sumbunya seketika itu juga",
            "Gravitasi bumi akan langsung lenyap menjadi nol"
        ],
        "answer": 0,
        "why": {
            "0": "Gaya diferensial pasang surut gravitasi berbanding lurus dengan massa dan tarikan gravitasi Bulan. Peningkatan dua kali lipat akan melipatgandakan amplitudo pasang surut laut secara drastis."
        },
        "distractorWhy": {
            "1": "Air laut tidak menguap lenyap melainkan mengalami dinamika fluktuasi pasang surut fisik.",
            "2": "Rotasi bumi mengalami perlambatan deselerasi pasang surut secara gradual bertahap, tidak berhenti mendadak seketika.",
            "3": "Gravitasi bumi ditentukan oleh massa bumi sendiri dan tidak hilang oleh gaya gravitasi bulan."
        }
    },
    {
        "id": "ipa-d-7-b7-q05",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 234 Ayo Uji Kemampuan Gambar 7.55), analisis grafik suhu rata-rata permukaan Bumi terhadap jumlah sinar radiasi Matahari dalam beberapa dekade terakhir menunjukkan bahwa…",
        "options": [
            "Peningkatan tajam suhu permukaan Bumi terjadi ketika jumlah radiasi Matahari relatif konstan, membuktikan bahwa pemanasan global dipicu oleh peningkatan gas rumah kaca akibat aktivitas manusia",
            "Pemanasan suhu Bumi semata-mata disebabkan oleh lonjakan panas radiasi Matahari",
            "Suhu Bumi tidak mengalami perubahan sama sekali sejak ratusan tahun lalu",
            "Matahari adalah satu-satunya penyebab perubahan iklim modern tanpa peran manusia"
        ],
        "answer": 0,
        "why": {
            "0": "Data ilmiah memverifikasi tren anomali suhu bumi melonjak tinggi sementara variabilitas radiasi surya stabil, mengonfirmasi emisi gas rumah kaca antropogenik sebagai penyebab utama pemanasan global."
        },
        "distractorWhy": {
            "1": "Radiasi matahari stabil dan tidak mengalami lonjakan yang setara dengan kenaikan kurva suhu bumi.",
            "2": "Kurva grafik mencatat kenaikan suhu rata-rata global yang konsisten dan terukur signifikan.",
            "3": "Bukti empiris menunjukkan aktivitas industri emisi karbon manusia mendominasi efek pemanasan atmosfer modern."
        }
    },
    {
        "id": "ipa-d-7-b7-q06",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 195-197), peristiwa pergantian siang dan malam serta gerak semu harian benda langit dari timur ke barat disebabkan oleh…",
        "options": [
            "Rotasi Bumi pada porosnya dari arah barat ke timur",
            "Revolusi Bumi mengelilingi Matahari pada bidang ekliptika",
            "Pergerakan Matahari mengelilingi planet Bumi",
            "Perubahan fase Bulan mengitari bumi setiap malam"
        ],
        "answer": 0,
        "why": {
            "0": "Bumi berputar pada poros rotasinya sekali setiap ~24 jam dari barat ke timur, sehingga separuh bumi menghadap matahari bergantian (siang-malam) dan benda langit tampak terbit di timur tenggelam di barat."
        },
        "distractorWhy": {
            "1": "Revolusi bumi mengelilingi matahari mengakibatkan pergantian musim dan gerak semu tahunan, bukan harian.",
            "2": "Model heliosentris membuktikan bumilah yang berotasi, bukan matahari yang mengitari bumi.",
            "3": "Fase bulan dipicu posisi orbit bulan terhadap penyinaran matahari, bukan penyebab siang malam bumi."
        }
    },
    {
        "id": "ipa-d-7-b7-q07",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 198-200), akibat dari peristiwa REVOLUSI BUMI mengelilingi Matahari dengan kemiringan sumbu rotasi sebesar 23,5 derajat adalah…",
        "options": [
            "Terjadinya pergantian musim di belahan bumi utara dan selatan serta perbedaan lamanya waktu siang dan malam",
            "Terjadinya pasang surut air laut setiap enam jam sekali",
            "Pembelokan arah angin siklon pada garis khatulistiwa",
            "Terjadinya pergantian hari setiap dua puluh empat jam"
        ],
        "answer": 0,
        "why": {
            "0": "Kemiringan sumbu rotasi 23,5° saat bumi berevolusi menyebabkan intensitas penyinaran matahari bergantian lebih condong ke belahan bumi utara atau selatan, melahirkan empat musim siklis tahunan."
        },
        "distractorWhy": {
            "1": "Pasang surut air laut dipicu oleh gaya gravitasi bulan dan matahari.",
            "2": "Pembelokan arah angin (efek Coriolis) adalah akibat rotasi bumi harian.",
            "3": "Pergantian hari 24 jam adalah periode putaran rotasi bumi pada porosnya."
        }
    },
    {
        "id": "ipa-d-7-b7-q08",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 201), peristiwa GERHANA BULAN terjadi ketika posisi benda langit berada pada konfigurasi sejajar berupa…",
        "options": [
            "Matahari - Bumi - Bulan berada pada satu garis lurus, sehingga bayangan gelap Bumi menutupi permukaan Bulan",
            "Matahari - Bulan - Bumi berada pada satu garis lurus saat siang hari",
            "Bulan berada di antara Matahari dan planet Mars",
            "Bumi berada di belakang orbit planet Saturnus"
        ],
        "answer": 0,
        "why": {
            "0": "Gerhana bulan terjadi saat fase bulan purnama ketika bumi melintas tepat di antara matahari dan bulan, menghalangi sinar matahari sehingga bayang-bayang umbra dan penumbra bumi jatuh di bulan."
        },
        "distractorWhy": {
            "1": "Konfigurasi Matahari - Bulan - Bumi menghasilkan gerhana Matahari saat siang hari.",
            "2": "Planet Mars tidak berada di antara matahari dan orbit bulan.",
            "3": "Saturnus berada di luar orbit bumi dan tidak memicu gerhana bulan kebumian."
        }
    },
    {
        "id": "ipa-d-7-b7-q09",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 202), peristiwa GERHANA MATAHARI terjadi ketika…",
        "options": [
            "Bulan berada di antara Matahari dan Bumi pada satu garis lurus, sehingga piringan Bulan menutupi pandangan sinar Matahari ke sebagian wilayah Bumi",
            "Bumi berada di antara Matahari dan Bulan pada malam hari",
            "Matahari padam selama beberapa jam karena kehabisan gas hidrogen",
            "Bulan meluncur jatuh menabrak atmosfer samudra bumi"
        ],
        "answer": 0,
        "why": {
            "0": "Gerhana matahari terjadi saat fase bulan baru ketika bayangan kerucut umbra bulan menyapu permukaan bumi di siang hari, menghalangi cahaya matahari sementara waktu."
        },
        "distractorWhy": {
            "1": "Bumi di antara matahari dan bulan pada malam hari adalah peristiwa gerhana bulan.",
            "2": "Matahari tidak padam; cahayanya terhalang oleh benda padat piringan bulan yang melintas.",
            "3": "Bulan tetap mengorbit stabil di angkasa dan tidak menabrak atmosfer bumi."
        }
    },
    {
        "id": "ipa-d-7-b7-q10",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 186-190), kelompok PLANET DALAM (terestrial) yang memiliki permukaan padat berbatu di tata surya kita terdiri atas…",
        "options": [
            "Merkurius, Venus, Bumi, dan Mars",
            "Yupiter, Saturnus, Uranus, dan Neptunus",
            "Bumi, Jupiter, Saturnus, dan Pluto",
            "Mars, Jupiter, Uranus, dan Matahari"
        ],
        "answer": 0,
        "why": {
            "0": "Planet dalam (terestrial) terletak di antara matahari dan sabuk asteroid utama, tersusun atas batuan silikat dan logam padat berkepadatan tinggi: Merkurius, Venus, Bumi, dan Mars."
        },
        "distractorWhy": {
            "1": "Yupiter, Saturnus, Uranus, dan Neptunus adalah planet luar raksasa gas (jovian).",
            "2": "Jupiter dan Saturnus adalah raksasa gas, sedangkan Pluto diklasifikasikan sebagai planet kerdil.",
            "3": "Matahari adalah bintang pusat tata surya, bukan planet."
        }
    },
    {
        "id": "ipa-d-7-b7-q11",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 191), planet terbesar di tata surya kita yang tersusun dari gas hidrogen dan helium serta memiliki fenomena badai bintik merah raksasa (Great Red Spot) adalah…",
        "options": [
            "Yupiter",
            "Saturnus",
            "Merkurius",
            "Venus"
        ],
        "answer": 0,
        "why": {
            "0": "Yupiter adalah raksasa gas dengan massa lebih dari dua kali gabungan seluruh planet lainnya di tata surya dan memiliki badai antisiklon raksasa Great Red Spot yang telah berlangsung berabad-abad."
        },
        "distractorWhy": {
            "1": "Saturnus terkenal dengan sistem cincin es raksasa spektakulernya.",
            "2": "Merkurius adalah planet terkecil dan terdekat ke matahari yang berbatu tandus.",
            "3": "Venus adalah planet terpanas berselimut awan tebal gas asam sulfat dan CO2."
        }
    },
    {
        "id": "ipa-d-7-b7-q12",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 188), mengapa planet VENUS memiliki suhu permukaan paling panas di tata surya (mencapai sekitar 460°C), padahal jaraknya bukan yang paling dekat dengan Matahari?",
        "options": [
            "Atmosfer Venus sangat tebal dan didominasi oleh gas karbon dioksida (CO2) hingga 96%, memicu efek rumah kaca tak terkendali yang memerangkap panas ekstrem",
            "Venus memiliki inti dari uranium radioaktif yang terbakar terus menerus",
            "Venus berputar sangat cepat sehingga gesekan udaranya menyala membara",
            "Permukaan Venus dilapisi oleh batu bara padat yang mudah menyala"
        ],
        "answer": 0,
        "why": {
            "0": "Atmosfer gas CO2 bertekanan 90 kali lipat bumi di Venus memicu runaway greenhouse effect ekstrem yang menahan radiasi inframerah keluar, menjadikan permukaannya lebih panas dari Merkurius."
        },
        "distractorWhy": {
            "1": "Venus adalah planet batuan silikat biasa tanpa fisi nuklir uranium raksasa.",
            "2": "Rotasi Venus justru sangat lambat (243 hari bumi untuk sekali putaran rotasi).",
            "3": "Permukaan Venus tersusun dari batuan basal vulkanik beku, bukan deposit batu bara organik."
        }
    },
    {
        "id": "ipa-d-7-b7-q13",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 207-209), lapisan atmosfer Bumi yang paling bawah di mana tempat terjadinya berbagai fenomena cuaca seperti awan, hujan, dan angin adalah…",
        "options": [
            "Troposfer",
            "Stratosfer",
            "Mesosfer",
            "Eksosfer"
        ],
        "answer": 0,
        "why": {
            "0": "Troposfer adalah lapisan atmosfer terendah (permukaan tanah hingga ketinggian ~12 km) yang menampung 75-80% massa udara dan hampir seluruh uap air tempat dinamika cuaca berlangsung."
        },
        "distractorWhy": {
            "1": "Stratosfer berada di atas troposfer tempat lapisan ozon penyerap sinar UV berada.",
            "2": "Mesosfer adalah lapisan dingin tempat terbakarnya sebagian besar meteorit angkasa.",
            "3": "Eksosfer adalah lapisan terluar atmosfer yang berbatasan langsung dengan ruang hampa antariksa."
        }
    },
    {
        "id": "ipa-d-7-b7-q14",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 210), lapisan OZON (O3) di lapisan stratosfer memiliki fungsi yang sangat vital bagi kelangsungan hidup di Bumi karena…",
        "options": [
            "Menyerap sebagian besar radiasi sinar ultraviolet (UV-B) berbahaya dari Matahari sebelum sampai ke permukaan Bumi",
            "Menyediakan oksigen untuk bernapas bagi astronot di satelit luar angkasa",
            "Mendinginkan inti bumi agar magma gunung berapi tidak mendidih",
            "Menahan gaya gravitasi bulan agar air laut tidak terlempar ke angkasa"
        ],
        "answer": 0,
        "why": {
            "0": "Molekul ozon (O3) menyerap radiasi foton UV matahari berenergi tinggi, melindungi DNA organisme hidup dari bahaya mutasi genetik, kanker kulit, dan katarak mata."
        },
        "distractorWhy": {
            "1": "Lapisan stratosfer berkonsentrasi ozon tipis dan tidak dapat dihirup manusia tanpa alat bantu.",
            "2": "Ozon atmosfer tidak memengaruhi dinamika konveksi magma mantel kerak bumi.",
            "3": "Gaya gravitasi diatur oleh massa kebumian tanpa kaitan dengan konsentrasi gas ozon."
        }
    },
    {
        "id": "ipa-d-7-b7-q15",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 211-213), wilayah kepulauan Indonesia sangat rawan mengalami gempa bumi tektonik dan memiliki banyak gunung api aktif (Ring of Fire) karena terletak pada…",
        "options": [
            "Pertemuan tiga lempeng tektonik aktif dunia yaitu Lempeng Indo-Australia, Lempeng Eurasia, dan Lempeng Pasifik",
            "Pusat gravitasi kutub magnet utara bumi",
            "Pusat lubang hitam di dasar samudra Hindia",
            "Jalur lintasan komet yang menabrak bumi setiap bulan"
        ],
        "answer": 0,
        "why": {
            "0": "Indonesia berada di zona subduksi aktif pertemuan lempeng tektonik Eurasia di utara, Indo-Australia di selatan, dan Pasifik di timur, memicu seismisitas tinggi dan busur vulkanisme aktif."
        },
        "distractorWhy": {
            "1": "Indonesia berada di kawasan khatulistiwa ekuator, bukan kutub magnet bumi.",
            "2": "Tidak ada lubang hitam di dalam samudra bumi.",
            "3": "Gempa bumi dan gunung api dipicu dinamika litosfer mantel bumi, bukan tabrakan komet."
        }
    },
    {
        "id": "ipa-d-7-b7-q16",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPA Kelas VII (hal. 214), tindakan mitigasi bencana yang paling tepat dan aman saat seseorang berada di dalam ruangan kelas ketika terjadi guncangan GEMPA BUMI kuat adalah…",
        "options": [
            "Berlutut, berlindung di bawah meja yang kokoh (drop, cover, hold on), dan menjauhi jendela kaca serta benda gantung",
            "Segera berlari berebut menuruni tangga darurat secara panik dan berdesakan",
            "Berdiri di dekat lemari kaca yang tinggi agar terlihat oleh tim penyelamat",
            "Melompat keluar melalui jendela lantai dua tanpa pengaman"
        ],
        "answer": 0,
        "why": {
            "0": "Prinsip evakuasi gempa: Drop, Cover, Hold On (merunduk, lindungi kepala di bawah meja kokoh, dan berpegangan) mencegah cedera fatal akibat tertimpa reruntuhan plafon dan pecahan kaca."
        },
        "distractorWhy": {
            "1": "Berlari panik di tangga saat guncangan gempa sangat berisiko terinjak dan jatuh dari tangga.",
            "2": "Lemari kaca mudah roboh dan pecah menimpa tubuh saat guncangan gempa kuat.",
            "3": "Melompat dari lantai atas menyebabkan risiko patah tulang dan cedera parah seketika."
        }
    }
]

# Append Bab 5, 6, 7 competencies
new_comps = [
    {
        "code": "KOMP-IPA-D-7-BAB5-01",
        "grade": 7,
        "name": "Karakteristik dan Klasifikasi Makhluk Hidup",
        "materi": "Makhluk Hidup atau Benda Mati?, Mengapa Makhluk Hidup Dikelompokkan?, Kunci Dikotomi & Klasifikasi 5 Kingdom",
        "cpRef": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi) — Bab 5",
        "items": bab5_items
    },
    {
        "code": "KOMP-IPA-D-7-BAB6-01",
        "grade": 7,
        "name": "Ekologi dan Pelestarian Lingkungan",
        "materi": "Pengaruh Lingkungan terhadap Organisme, Interaksi Antarkomponen Ekosistem, Pengaruh Manusia terhadap Ekosistem, Konservasi Keanekaragaman Hayati",
        "cpRef": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi) — Bab 6",
        "items": bab6_items
    },
    {
        "code": "KOMP-IPA-D-7-BAB7-01",
        "grade": 7,
        "name": "Bumi dan Tata Surya",
        "materi": "Sistem Tata Surya & Karakteristik Planet, Pengaruh Pergerakan Bumi & Benda Langit dalam Kehidupan, Perubahan Iklim Bumi",
        "cpRef": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi) — Bab 7",
        "items": bab7_items
    }
]

for nc in new_comps:
    bank_data['competencies'].append(nc)

with open(r'c:\Users\hp\fiezel-apps\content\mapel\mapel-ipa-d.json', 'w', encoding='utf-8') as f:
    json.dump(bank_data, f, ensure_ascii=False, indent=2)

total_now = sum(len(c['items']) for c in bank_data['competencies'])
print("="*60)
print(f"BERHASIL LUAR BIASA! SELURUH 7 BAB BUKU SISWA IPA KELAS VII KINI LENGKAP 100%!")
print(f"Total bab: {len(bank_data['competencies'])}")
print(f"Total butir soal autentik: {total_now} BUTIR SOAL!")
for idx, c in enumerate(bank_data['competencies']):
    print(f"  Bab {idx+1} ({c['code']}): {len(c['items'])} butir - {c['name']}")
print("="*60)
