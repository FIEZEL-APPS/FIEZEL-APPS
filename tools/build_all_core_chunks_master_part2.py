import json
import os

tools_dir = r"c:\Users\hp\fiezel-apps\tools"

# 7. BAHASA INDONESIA KELAS VII BAB 2: Kelana Cerita Unik
ind_b2 = {
    "code": "KOMP-IND-D-7-BAB2-01",
    "grade": 7,
    "name": "Bab 2: Kelana Cerita Unik",
    "materi": "Mengenal Puisi Rakyat (Pantun & Gurindam), Cerita Fantasi, Analisis Tokoh & Alur, Unsur Kebahasaan Teks Narasi",
    "cpRef": "Bahasa Indonesia untuk SMP/MTs Kelas VII (Edisi Revisi) — Bab 2",
    "items": [
        {
            "id": "ind-d-7-b2-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 42-45 Puisi Rakyat), ciri-ciri utama pantun karya sastra Melayu lama yang tepat adalah…",
            "options": [
                "Setiap bait terdiri atas 4 baris, bersajak a-b-a-b, baris 1-2 berupa sampiran, dan baris 3-4 berupa isi",
                "Setiap bait terdiri atas 2 baris, bersajak a-a, dan semuanya merupakan isi nasihat",
                "Terdiri dari baris bebas tanpa rima dan bait yang fleksibel",
                "Setiap baris terdiri dari 20 kata dengan sajak a-a-a-a"
            ],
            "answer": 0,
            "why": {"0": "Pantun memiliki aturan baku: 4 baris per bait, sajak silang (a-b-a-b), 8-12 suku kata per baris, 2 baris awal sampiran, 2 baris akhir isi."},
            "distractorWhy": {
                "1": "Ciri 2 baris bersajak a-a merupakan ciri Gurindam.",
                "2": "Ciri bebas tanpa rima adalah ciri puisi modern/bebas.",
                "3": "20 kata per baris terlalu panjang untuk aturan 8-12 suku kata."
            }
        },
        {
            "id": "ind-d-7-b2-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 48 Gurindam), cermati kutipan gurindam berikut:\n'Jika hendak mengenal orang berbangsa,\nLihat kepada budi dan bahasa.'\nPesan atau nilai moral yang terkandung dalam gurindam tersebut adalah…",
            "options": [
                "Kemuliaan dan keutamaan seseorang dapat dinilai dari keluhuran budi pekerti dan tutur bahasanya",
                "Seseorang dianggap berbangsa tinggi jika memiliki harta yang melimpah",
                "Bicara yang keras menunjukkan keberanian seseorang",
                "Bahasa daerah harus dihafalkan oleh setiap suku bangsa"
            ],
            "answer": 0,
            "why": {"0": "Gurindam tersebut mengajarkan bahwa harkat derajat seseorang tampak dari kebaikan budi dan ketertiban bahasanya."},
            "distractorWhy": {
                "1": "Harta kekayaan bukan ukuran budi bahasa gurindam.",
                "2": "Bicara keras bukan pesan positif gurindam.",
                "3": "Penafsiran harfiah yang keliru."
            }
        },
        {
            "id": "ind-d-7-b2-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 55-58 Cerita Fantasi), ciri khas utama dari cerita fantasi dibanding cerita fiksi naratif umum adalah…",
            "options": [
                "Mengandung keajaiban, keanehan, atau keajaiban supranatural yang tidak ada di dunia nyata (seperti sihir atau lorong waktu)",
                "Berdasarkan kisah nyata kehidupan pahlawan nasional",
                "Menggunakan data grafik statistik yang akurat",
                "Ditulis dalam bahasa Latin Kuno"
            ],
            "answer": 0,
            "why": {"0": "Cerita fantasi ditandai oleh daya imajinasi bebas penulis yang menghadirkan hal ajaib/gaib di luar hukum alam nyata."},
            "distractorWhy": {
                "1": "Kisah nyata pahlawan adalah teks biografi/sejarah.",
                "2": "Data statistik adalah ciri teks eksposisi/laporan.",
                "3": "Penggunaan bahasa Latin bukan kriteria cerita fantasi."
            }
        },
        {
            "id": "ind-d-7-b2-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 62 Kebahasaan Teks Fantasi), penggunaan konjungsi urutan waktu yang tepat dalam paragraf narasi cerita fantasi adalah…",
            "options": [
                "Setelah itu, tiba-tiba, kemudian, dan akhirnya",
                "Sebab, karena, oleh karena itu, dan akibatnya",
                "Tetapi, melainkan, namun, dan sedangkan",
                "Jika, apabila, bilamana, dan seandainya"
            ],
            "answer": 0,
            "why": {"0": "Konjungsi urutan waktu (kronologis) menyambungkan alur peristiwa secara berurutan: setelah itu, tiba-tiba, kemudian, akhirnya."},
            "distractorWhy": {
                "1": "Konjungsi kausalitas (sebab-akibat).",
                "2": "Konjungsi pertentangan.",
                "3": "Konjungsi pengandaian/syarat."
            }
        },
        {
            "id": "ind-d-7-b2-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 65), watak tokoh protagonis dalam cerita fantasi biasanya digambarkan sebagai…",
            "options": ["Tokoh utama yang berwatak baik, pemberani, dan penolong", "Tokoh jahat penentang utama yang suka merusak", "Tokoh figuran yang tidak memiliki peran cerita", "Tokoh narator yang tidak terlibat dalam konflik"],
            "answer": 0,
            "why": {"0": "Protagonis adalah tokoh utama pembawa nilai-nilai kebaikan yang diidolakan dalam alur cerita."},
            "distractorWhy": {
                "1": "Tokoh jahat penentang adalah antagonis.",
                "2": "Tokoh figuran adalah figuran/tritagonis.",
                "3": "Tokoh narator adalah pencerita."
            }
        },
        {
            "id": "ind-d-7-b2-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 70 Uji Kemampuan), bagian struktur cerita fantasi yang memuat puncak konflik atau permasalahan tertinggi yang dihadapi tokoh dinamakan…",
            "options": ["Klimaks (Komplikasi puncak)", "Orientasi awal", "Resolusi peleraian", "Koda penutup"],
            "answer": 0,
            "why": {"0": "Klimaks adalah titik balik puncak ketegangan konflik dalam bagian komplikasi sebelum menuju jalan keluar."},
            "distractorWhy": {
                "1": "Orientasi adalah pengenalan latar dan tokoh di awal.",
                "2": "Resolusi adalah penyelesaian masalah.",
                "3": "Koda adalah pesan moral penutup."
            }
        }
    ]
}

with open(os.path.join(tools_dir, "chunk_ind_7_b2.json"), "w", encoding="utf-8") as f:
    json.dump(ind_b2, f, indent=2, ensure_ascii=False)

print("chunk_ind_7_b2.json created.")

# 8. BAHASA INGGRIS KELAS VII CHAPTER 2: Culinary and Me
eng_c2 = {
    "code": "KOMP-ENG-D-7-BAB2-01",
    "grade": 7,
    "name": "Chapter 2: Culinary and Me",
    "materi": "Describing Foods & Drinks (Taste & Texture), Recipe Procedural Text Analysis, Imperative Verbs & Cooking Steps",
    "cpRef": "English for Nusantara SMP/MTs Kelas VII — Chapter 2",
    "items": [
        {
            "id": "eng-d-7-c2-q01",
            "difficulty": "dasar",
            "prompt": "Based on English for Nusantara Grade VII (page 55-60 Unit 1 'Favorite Foods'), how does Monita describe the taste of fried rice with chili?",
            "options": ["'It is spicy and savory.'", "'It is sweet and sour.'", "'It is bitter and salty.'", "'It is cold and creamy.'"],
            "answer": 0,
            "why": {"0": "Fried rice with chili is described as spicy (pedas) and savory (gurih)."},
            "distractorWhy": {
                "1": "Sweet and sour is for certain fruit dishes or tamarind soup.",
                "2": "Bitter is for coffee or herbal medicine.",
                "3": "Cold and creamy is for ice cream."
            }
        },
        {
            "id": "eng-d-7-c2-q02",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VII (page 65 Unit 2 'Secret Recipe'), what imperative verb is used to instructionally separate liquid from solid ingredients when making iced tea?",
            "options": ["Pour the tea into the glass", "Bake the tea in an oven", "Chop the tea with a knife", "Grill the tea on charcoal"],
            "answer": 0,
            "why": {"0": "'Pour' (tuangkan) is the action verb used for liquids into a container."},
            "distractorWhy": {
                "1": "'Bake' is for baking bread/cake in an oven.",
                "2": "'Chop' is for cutting solid food into small pieces.",
                "3": "'Grill' is for cooking on direct heat."
            }
        },
        {
            "id": "eng-d-7-c2-q03",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VII (page 72 Procedural Text Structure), what are the three main parts of a cooking recipe procedural text?",
            "options": ["Goal/Title, Ingredients/Materials, and Steps/Instructions", "Orientation, Complication, and Resolution", "General Statement, Description, and Conclusion", "Thesis, Argument, and Reiteration"],
            "answer": 0,
            "why": {"0": "A procedural recipe text consists of Goal (what to make), Ingredients (materials needed), and Steps (method/instructions)."},
            "distractorWhy": {
                "1": "Structure of narrative text.",
                "2": "Structure of descriptive text.",
                "3": "Structure of analytical exposition text."
            }
        },
        {
            "id": "eng-d-7-c2-q04",
            "difficulty": "tinggi",
            "prompt": "Based on English for Nusantara Grade VII (page 78 Language Focus), choose the sentence that correctly uses sequential action connectors for a recipe:",
            "options": ["First, wash the bananas. Next, peel them. Then, slice them into round pieces. Finally, fry them until golden brown.", "Finally, fry the bananas. First, peel them. Next, buy bananas.", "Because wash bananas, but fry them.", "Although bananas are sweet, wash them."],
            "answer": 0,
            "why": {"0": "The sequence connectors 'First', 'Next', 'Then', and 'Finally' logically structure procedural steps chronological order."},
            "distractorWhy": {
                "1": "Illogical order (starts with Finally before buying).",
                "2": "Incorrect causal connector usage.",
                "3": "Incorrect concession connector usage."
            }
        },
        {
            "id": "eng-d-7-c2-q05",
            "difficulty": "dasar",
            "prompt": "Based on English for Nusantara Grade VII (page 62), what action verb means to cut vegetables into thin small pieces using a knife?",
            "options": ["Slice", "Boil", "Stir", "Freeze"],
            "answer": 0,
            "why": {"0": "'Slice' (iris) means cutting ingredients into thin pieces with a knife."},
            "distractorWhy": {
                "1": "'Boil' means cooking in boiling water.",
                "2": "'Stir' means mixing ingredients with a spoon.",
                "3": "'Freeze' means turning liquid into ice."
            }
        },
        {
            "id": "eng-d-7-c2-q06",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VII (page 80 Unit 3), read the step: 'Add two spoonfuls of sugar into the cup of warm coffee and stir it well.' What is the purpose of adding sugar?",
            "options": ["To make the coffee taste sweet", "To change the color to green", "To cool down the temperature", "To make it spicy"],
            "answer": 0,
            "why": {"0": "Adding sugar to coffee increases sweetness and balances bitter taste."},
            "distractorWhy": {
                "1": "Sugar does not turn coffee green.",
                "2": "Sugar does not cool down temperature.",
                "3": "Sugar does not add spice."
            }
        }
    ]
}

with open(os.path.join(tools_dir, "chunk_eng_7_c2.json"), "w", encoding="utf-8") as f:
    json.dump(eng_c2, f, indent=2, ensure_ascii=False)

print("chunk_eng_7_c2.json created.")

# 9. IPS KELAS VII TEMA 02: Keberagaman Lingkungan Sekitar
ips_t2 = {
    "code": "KOMP-IPS-D-7-BAB2-01",
    "grade": 7,
    "name": "Tema 02: Keberagaman Lingkungan Sekitar",
    "materi": "Proses Pembentukan Bumi & Masa Praaksara, Keberagaman Bentang Alam & Lingkungan, Interaksi Manusia & Konservasi SDA, Peran Lembaga Sosial & Ekonomi",
    "cpRef": "Ilmu Pengetahuan Sosial untuk SMP/MTs Kelas VII (Edisi Revisi) — Tema 02",
    "items": [
        {
            "id": "ips-d-7-t2-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 72-76), pencemaran udara akibat gas buang kendaraan bermotor dan cerobong asap pabrik industri dapat memicu fenomena lingkungan yaitu…",
            "options": ["Pemanasan global dan hujan asam", "Peningkatan kesuburan tanah pertanian", "Tsunami dan gempa tektonik", "Penurunan curah hujan secara global"],
            "answer": 0,
            "why": {"0": "Gas efek rumah kaca (CO₂) memicu pemanasan global, sedangkan emisi SO₂/NOx membentuk asam di atmosfer pencetus hujan asam."},
            "distractorWhy": {
                "1": "Pencemaran udara tidak menyuburkan tanah.",
                "2": "Tsunami dan gempa dipicu aktivitas pergerakan lempeng geologi tektonik.",
                "3": "Pencemaran udara justru mengacaukan siklus presipitasi."
            }
        },
        {
            "id": "ips-d-7-t2-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 82-86 Masa Praaksara), pembagian zaman prasejarah berdasarkan hasil kebudayaan batu tempat manusia purba sudah mulai menetap dan bercocok tanam (batu baru/halus) dinamakan zaman…",
            "options": ["Neolitikum (Zaman Batu Muda)", "Paleolitikum (Zaman Batu Tua)", "Mesolitikum (Zaman Batu Tengah)", "Megalitikum (Zaman Batu Besar)"],
            "answer": 0,
            "why": {"0": "Zaman Neolitikum ditandai revolusi kebudayaan bercocok tanam (sedentary) dengan perkakas batu yang sudah dihaluskan (kapak persegi/lonjong)."},
            "distractorWhy": {
                "1": "Paleolitikum bersifat food gathering dan nomad berpindah.",
                "2": "Mesolitikum transisi kehidupan gua (abris sous roche).",
                "3": "Megalitikum ditandai bangunan batu besar pemujaan roh."
            }
        },
        {
            "id": "ips-d-7-t2-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 92 Konservasi SDA), upaya pelestarian hutan magrove di wilayah pesisir pantai bertujuan penting untuk…",
            "options": ["Mencegah abrasi pantai dan menyediakan habitat pemijahan biota laut", "Mempercepat pengikisan tanah oleh gelombang laut", "Menghilangkan sumber oksigen daerah pesisir", "Membuat lahan tambang baru"],
            "answer": 0,
            "why": {"0": "Akar kokoh bakau/mangrove menahan erosi gelombang air laut (abrasi) serta memelihara ekosistem benih ikan/udang."},
            "distractorWhy": {
                "1": "Bakau justru menahan pengikisan, bukan mempercepat.",
                "2": "Bakau menghasilkan O₂ tinggi.",
                "3": "Bakau bukan kawasan tambang."
            }
        },
        {
            "id": "ips-d-7-t2-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 104 Lembaga Ekonomi), peran utama lembaga ekonomi dalam kehidupan masyarakat adalah…",
            "options": [
                "Mengatur tata cara produksi, distribusi, dan konsumsi barang serta jasa guna memenuhi kebutuhan hidup masyarakat",
                "Menyelenggarakan upacara keagamaan dan ibadah",
                "Menjatuhkan sanksi kurungan pidana bagi pelanggar hukum",
                "Mendidik anak dalam menguasai keahlian membaca dan menulis"
            ],
            "answer": 0,
            "why": {"0": "Lembaga ekonomi berfokus pada alokasi dan kelancaran kegiatan perekonomian (produksi, distribusi, konsumsi)."},
            "distractorWhy": {
                "1": "Peran lembaga agama.",
                "2": "Peran lembaga hukum/peradilan.",
                "3": "Peran lembaga pendidikan."
            }
        },
        {
            "id": "ips-d-7-t2-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 78), jenis sumber daya alam yang dapat diperbarui (renewable resources) adalah…",
            "options": ["Hutan, air, tanah, dan sinar matahari", "Minyak bumi, batu bara, dan gas alam", "Emas, perak, dan tembaga", "Biji besi dan aluminium"],
            "answer": 0,
            "why": {"0": "SDA dapat diperbarui memiliki daya pemulihan alami secara berkelanjutan (tumbuhan, air, matahari)."},
            "distractorWhy": {
                "1": "Bahan bakar fosil tidak dapat diperbarui (non-renewable).",
                "2": "Logam mulia tidak dapat diperbarui.",
                "3": "Biji logam tidak dapat diperbarui."
            }
        },
        {
            "id": "ips-d-7-t2-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 110 Evaluasi Tema 02), terasering (sengkedan) yang dibangun di daerah perbukitan bertujuan untuk…",
            "options": ["Mencegah erosi tanah dan tanah longsor saat hujan deras", "Mempercepat laju aliran air hujan ke lembah", "Membuat jalan raya bebas hambatan", "Menghilangkan kadar unsur hara tanah"],
            "answer": 0,
            "why": {"0": "Pembuatan tangga lereng (terasering) mengurangi kemiringan tanah sehingga aliran air melambat dan erosi terhambat."},
            "distractorWhy": {
                "1": "Terasering memperlambat laju aliran air.",
                "2": "Terasering untuk bercocok tanam pertanian lereng.",
                "3": "Terasering menjaga unsur hara tanah."
            }
        }
    ]
}

with open(os.path.join(tools_dir, "chunk_ips_7_t2.json"), "w", encoding="utf-8") as f:
    json.dump(ips_t2, f, indent=2, ensure_ascii=False)

print("chunk_ips_7_t2.json created.")

# 10. IPA KELAS VIII BAB 2: Struktur dan Fungsi Tubuh Makhluk Hidup
ipa8_b2 = {
    "code": "KOMP-IPA-D-8-BAB2-01",
    "grade": 8,
    "name": "Struktur dan Fungsi Tubuh Makhluk Hidup",
    "materi": "Sistem Pencernaan & Nutrisi, Sistem Peredaran Darah & Jantung, Sistem Pernapasan & Paru-paru, Sistem Ekskresi & Ginjal",
    "cpRef": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VIII (Edisi Revisi) — Bab 2",
    "items": [
        {
            "id": "ipa-d-8-b2-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 42-46 Sistem Pencernaan), enzim ptialin (amilase mulut) yang dihasilkan oleh kelenjar ludah berfungsi untuk mencerna…",
            "options": ["Karbohidrat (amilum) menjadi gula sederhana (maltosa)", "Protein menjadi pepton", "Lemak menjadi asam lemak dan gliserol", "Vitamin menjadi asam amino"],
            "answer": 0,
            "why": {"0": "Enzim amilase/ptialin dalam rongga mulut memecah polisakarida pati (amilum) menjadi disakarida maltosa."},
            "distractorWhy": {
                "1": "Pencernaan protein oleh enzim pepsin lambung.",
                "2": "Pencernaan lemak oleh enzim lipase pankreas/usus.",
                "3": "Vitamin tidak dipecah menjadi asam amino."
            }
        },
        {
            "id": "ipa-d-8-b2-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 52-56 Sistem Peredaran Darah), ruang jantung manusia yang berfungsi memompa darah kaya oksigen (O₂) ke seluruh tubuh melalui pembuluh darah aorta adalah…",
            "options": ["Bilik kiri (ventrikel kiri)", "Serambi kanan (atrium kanan)", "Bilik kanan (ventrikel kanan)", "Serambi kiri (atrium kiri)"],
            "answer": 0,
            "why": {"0": "Ventricle kiri memiliki otot dinding tertebal untuk memompa darah bersih bersirkulasi ke seluruh sistemik tubuh."},
            "distractorWhy": {
                "1": "Serambi kanan menerima darah kotor kaya CO₂ dari seluruh tubuh.",
                "2": "Bilik kanan memompa darah kotor ke paru-paru.",
                "3": "Serambi kiri menerima darah bersih dari paru-paru."
            }
        },
        {
            "id": "ipa-d-8-b2-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 65 Sistem Pernapasan), proses pertukaran gas oksigen (O₂) dan karbondioksida (CO₂) secara difusi di dalam paru-paru terjadi pada struktur…",
            "options": ["Alveolus", "Bronkus", "Trakea", "Laring"],
            "answer": 0,
            "why": {"0": "Alveolus berupa kantung udara berdinding tipis yang dikelilingi kapiler darah tempat pertukaran gas difusi."},
            "distractorWhy": {
                "1": "Bronkus adalah cabang batang tenggorokan.",
                "2": "Trakea adalah saluran pipa pernapasan utama.",
                "3": "Laring adalah pangkal tenggorokan pita suara."
            }
        },
        {
            "id": "ipa-d-8-b2-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 74-78 Sistem Ekskresi), proses pembentukan urine di dalam ginjal yang terjadi pada bagian glomerulus berupa penyaringan sel-sel darah dan protein dinamakan…",
            "options": ["Filtrasi (penyaringan)", "Reabsorpsi (penyerapan kembali)", "Augmentasi (pengeluaran zat sisa)", "Defekasi (pembuangan feses)"],
            "answer": 0,
            "why": {"0": "Filtrasi glomerulus menghasilkan urine primer yang bebas dari sel darah dan molekul protein besar."},
            "distractorWhy": {
                "1": "Reabsorpsi terjadi di tubulus kontortus proksimal (menyerap zat berguna).",
                "2": "Augmentasi terjadi di tubulus kontortus distal (membentuk urine sebenarnya).",
                "3": "Defekasi adalah pembuangan sisa pencernaan usus besar."
            }
        },
        {
            "id": "ipa-d-8-b2-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 48), organ pencernaan yang berfungsi utama menyerap air dan garam mineral dari sisa makanan serta membentuk feses adalah…",
            "options": ["Usus besar (kolon)", "Usus halus (ileum)", "Lambung", "Kerongkongan (esofagus)"],
            "answer": 0,
            "why": {"0": "Usus besar mengabsorpsi sisa air dan pembusukan materi makanan oleh bakteri E. coli."},
            "distractorWhy": {
                "1": "Usus halus menyerap sari-sari makanan (nutrisi).",
                "2": "Lambung mencerna makanan secara kimiawi dan mekanis.",
                "3": "Kerongkongan menyalurkan makanan via gerak peristaltik."
            }
        },
        {
            "id": "ipa-d-8-b2-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 82 Uji Kemampuan Bab 2), gangguan pada sistem peredaran darah berupa penyumbatan pembuluh darah arteri koroner jantung oleh endapan lemak/kolesterol dinamakan…",
            "options": ["Aterosklerosis (penyakit jantung koroner)", "Anemia", "Leukemia", "Hemofilia"],
            "answer": 0,
            "why": {"0": "Aterosklerosis adalah penyempitan arteri akibat plak kolesterol yang mengganggu pasokan O₂ ke otot jantung."},
            "distractorWhy": {
                "1": "Anemia adalah kekurangan sel darah merah / hemoglobin.",
                "2": "Leukemia adalah kanker sel darah putih berlebihan.",
                "3": "Hemofilia adalah kelainan darah sulit membeku."
            }
        }
    ]
}

with open(os.path.join(tools_dir, "chunk_ind_7_b2.json"), "w", encoding="utf-8") as f:
    json.dump(ind_b2, f, indent=2, ensure_ascii=False)

with open(os.path.join(tools_dir, "chunk_eng_7_c2.json"), "w", encoding="utf-8") as f:
    json.dump(eng_c2, f, indent=2, ensure_ascii=False)

with open(os.path.join(tools_dir, "chunk_ips_7_t2.json"), "w", encoding="utf-8") as f:
    json.dump(ips_t2, f, indent=2, ensure_ascii=False)

with open(os.path.join(tools_dir, "chunk_ipa_8_b2.json"), "w", encoding="utf-8") as f:
    json.dump(ipa8_b2, f, indent=2, ensure_ascii=False)

print("Part 2 chunks (ind_7_b2, eng_7_c2, ips_7_t2, ipa_8_b2) created successfully!")
