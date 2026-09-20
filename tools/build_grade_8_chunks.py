import json
import os

tools_dir = r"c:\Users\hp\fiezel-apps\tools"

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# 1. INDONESIA KELAS VIII BAB 1: Laporan Hasil Observasi
ind8_b1 = {
    "code": "KOMP-IND-D-8-BAB1-01",
    "grade": 8,
    "name": "Bab 1: Laporan Hasil Observasi",
    "materi": "Memahami Teks Laporan Hasil Observasi (LHO), Struktur Teks LHO (Pernyataan Umum, Deskripsi Bagian, Manfaat), Unsur Kebahasaan Teks LHO",
    "cpRef": "Bahasa Indonesia untuk SMP/MTs Kelas VIII (Edisi Revisi)",
    "items": [
        {
            "id": "ind-d-8-b1-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (hal. 6-10 Teks 'Sepeda Motor di Indonesia'), tujuan utama penulisan teks Laporan Hasil Observasi (LHO) adalah…",
            "options": ["Satu cara untuk menyampaikan informasi secara objektif berdasarkan pengamatan atau pengujian sistematis di lapangan", "Menceritakan kisah fantasi rekaan penulis", "Mempengaruhi pembaca agar membeli barang dagangan", "Menjelaskan langkah-langkah membuat kerajinan tangan"],
            "answer": 0,
            "why": {"0": "Teks LHO menyampaikan fakta objektif hasil pengamatan faktual lapangan tanpa opini subjektif."},
            "distractorWhy": {"1": "Teks fiksi fantasi.", "2": "Teks persuasi/iklan.", "3": "Teks prosedur."}
        },
        {
            "id": "ind-d-8-b1-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (hal. 12 Struktur LHO), bagian struktur teks LHO yang memuat pembukaan, pengertian umum, dan pengelompokan awal objek yang diamati dinamakan…",
            "options": ["Pernyataan umum / Klasifikasi awal", "Deskripsi bagian", "Deskripsi manfaat", "Penutup cerita"],
            "answer": 0,
            "why": {"0": "Pernyataan umum berisi batasan definisi awal dan pengategorian objek pengamatan."},
            "distractorWhy": {"1": "Deskripsi bagian merinci ciri fisik.", "2": "Deskripsi manfaat merinci fungsi.", "3": "Penutup bukan istilah baku LHO."}
        },
        {
            "id": "ind-d-8-b1-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (hal. 18 Kebahasaan), kata kerja relasional yang sering digunakan dalam pembuka teks LHO untuk mendefinisikan objek adalah…",
            "options": ["Merupakan, adalah, dan yaitu", "Mendorong, menarik, dan menendang", "Berjalan, berlari, dan melompat", "Sangat, amat, dan sekali"],
            "answer": 0,
            "why": {"0": "Kata kerja relasional (kopula) berfungsi menyambungkan subjek dengan definisi keterangannya."},
            "distractorWhy": {"1": "Kata kerja aksi fisik.", "2": "Kata kerja lokomotor.", "3": "Adverbia penguat."}
        },
        {
            "id": "ind-d-8-b1-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (hal. 22), bagian deskripsi manfaat dalam laporan hasil observasi tentang lidah buaya berisi uraian mengenai…",
            "options": ["Khasiat dan kegunaan gel lidah buaya untuk obat luka bakar serta bahan kosmetik", "Ciri warna hijau dan bentuk daun berduri lidah buaya", "Asal-usul nama latin Aloe vera", "Harga jual lidah buaya di pasar hias"],
            "answer": 0,
            "why": {"0": "Deskripsi manfaat menguraikan nilai guna dan faedah objek observasi bagi manusia/lingkungan."},
            "distractorWhy": {"1": "Bagian deskripsi fisik.", "2": "Bagian pernyataan umum.", "3": "Informasi pasar komersial."}
        },
        {
            "id": "ind-d-8-b1-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (hal. 14), teks Laporan Hasil Observasi harus bersifat ilmiah dan objektif, artinya…",
            "options": ["Ditulis berdasarkan data fakta yang sebenarnya tanpa dipengaruhi pendapat pribadi atau imajinasi penulis", "Diisi dengan prasangka dan emosi pribadi", "Menggunakan bahasa kiasan puisi Melayu", "Mengabaikan hasil pengamatan di lapangan"],
            "answer": 0,
            "why": {"0": "Objektif berarti data laporan sesuai kenyataan fakta yang diukur di lapangan."},
            "distractorWhy": {"1": "Prasangka bertentangan dengan sains.", "2": "Bahasa puisi untuk karya sastra.", "3": "Pengamatan adalah sumber utama."}
        },
        {
            "id": "ind-d-8-b1-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (hal. 26 Uji Kemampuan), kalimat berikut yang merupakan kalimat definisi dalam teks LHO adalah…",
            "options": [
                "Bendi adalah kendaraan bermesin tarik hewan kuda yang biasa digunakan di Minangkabau.",
                "Sungguh elok pemandangan di sore hari itu.",
                "Ayo kita naik bendi bersama-sama!",
                "Mengapa bendi itu berjalan sangat lambat?"
            ],
            "answer": 0,
            "why": {"0": "Kalimat definisi menjelaskan pengertian umum objek menggunakan verba 'adalah'."},
            "distractorWhy": {"1": "Kalimat deskripsi kualitatif opini.", "2": "Kalimat ajakan/persuasi.", "3": "Kalimat tanya."}
        },
        {
            "id": "ind-d-8-b1-q07",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (hal. 28), perbedaan utama antara teks Laporan Hasil Observasi dengan teks Deskripsi terletak pada…",
            "options": ["LHO menggambarkan objek secara umum dan klasifikasi sistematis, sedangkan Teks Deskripsi menggambarkan objek individual secara spesifik", "LHO berupa fiksi, Teks Deskripsi berupa fakta", "LHO hanya berupa gambar tanpa teks", "Teks Deskripsi ditulis oleh ilmuwan luar negeri"],
            "answer": 0,
            "why": {"0": "LHO membahas kelompok objek universal (misal: 'Sepeda Motor'), sedangkan deskripsi melukiskan objek tertentu (misal: 'Sepeda Motor Merah Pak Budi')."},
            "distractorWhy": {"1": "Keduanya berbasis fakta.", "2": "LHO memuat teks laporan ilmiah.", "3": "Penulis teks bebas."}
        },
        {
            "id": "ind-d-8-b1-q08",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (hal. 16), kata ilmiah istilah biologi untuk merujuk pada keanekaragaman flora dan fauna dalam teks LHO adalah…",
            "options": ["Biodiversitas", "Ekosistemik", "Fotosintetik", "Metabolis"],
            "answer": 0,
            "why": {"0": "Biodiversitas merujuk pada keanekaragaman hayati makhluk hidup."},
            "distractorWhy": {"1": "Ekosistemik tatanan lingkungan.", "2": "Fotosintetik proses cahaya.", "3": "Metabolis proses zat."}
        },
        {
            "id": "ind-d-8-b1-q09",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (hal. 20), penggunaan imbuhan pen-an yang tepat pada kata dasar 'darat' membentuk kata…",
            "options": ["Pendaratan", "Pen-daratan", "Pengdarat", "Penyadarat"],
            "answer": 0,
            "why": {"0": "Imbuhan konfiks pe-an pada 'darat' membentuk nomina 'pendaratan'."},
            "distractorWhy": {"1": "Tanda hubung salah.", "2": "Alomor salah.", "3": "Alomor salah."}
        },
        {
            "id": "ind-d-8-b1-q10",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (hal. 30 Uji Kompetensi), langkah pertama dalam menyusun laporan hasil observasi adalah…",
            "options": ["Menentukan topik objek yang akan diamati dan menyusun jadwal observasi", "Langsung menulis simpulan di akhir", "Membuat hiasan sampul buku", "Menjual hasil laporan ke media"],
            "answer": 0,
            "why": {"0": "Menentukan objek observasi adalah tahap perencanaan paling awal."},
            "distractorWhy": {"1": "Simpulan dibuat paling akhir.", "2": "Hiasan sampul sekunder.", "3": "Menjual laporan di luar proses ilmiah."}
        },
        {
            "id": "ind-d-8-b1-q11",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (hal. 24), paragraf yang gagasan utamanya terletak di awal paragraf dinamakan paragraf…",
            "options": ["Deduktif", "Induktif", "Campuran", "Ineratif"],
            "answer": 0,
            "why": {"0": "Paragraf deduktif menempatkan kalimat utama di awal diawali gagasan umum."},
            "distractorWhy": {"1": "Induktif gagasan di akhir.", "2": "Campuran di awal dan akhir.", "3": "Ineratif di tengah."}
        },
        {
            "id": "ind-d-8-b1-q12",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (hal. 32), tanda baca koma (,) digunakan dalam teks LHO untuk…",
            "options": ["Memisahkan rincian unsur-unsur dalam suatu pemerincian atau kata penghubung antarklausa", "Mengakhiri kalimat berita", "Menandai pertanyaan narasumber", "Menggantikan tanda petik ganda"],
            "answer": 0,
            "why": {"0": "Tanda koma berfungsi memisahkan item rincian atau klausa anak."},
            "distractorWhy": {"1": "Fungsi tanda titik (.).", "2": "Fungsi tanda tanya (?).", "3": "Fungsi tanda petik (\"\")."}
        }
    ]
}
save_json(os.path.join(tools_dir, "chunk_ind_8_b1.json"), ind8_b1)

# 2. BAHASA INGGRIS KELAS VIII CHAPTER 1: Celebrating Independence Day
eng8_c1 = {
    "code": "KOMP-ENG-D-8-BAB1-01",
    "grade": 8,
    "name": "Chapter 1: Celebrating Independence Day",
    "materi": "Describing Past Independence Day Events, Recount Text Structure, Simple Past Tense (Regular & Irregular Verbs), Past Time Connectors",
    "cpRef": "English for Nusantara untuk SMP/MTs Kelas VIII",
    "items": [
        {
            "id": "eng-d-8-c1-q01",
            "difficulty": "dasar",
            "prompt": "Based on English for Nusantara Grade VIII (pages 15-20 Unit 1 'School Parade'), what event did Monita and her classmates participate in last August 17th?",
            "options": ["A school parade to celebrate Indonesian Independence Day", "A science fair exhibition at town hall", "A national swimming competition", "A camping trip in the forest"],
            "answer": 0,
            "why": {"0": "Monita and her classmates joined the August 17th school parade celebrating Independence Day."},
            "distractorWhy": {"1": "Science fair not mentioned in Unit 1.", "2": "Swimming competition is in Chapter 2.", "3": "Camping trip is not August 17th event."}
        },
        {
            "id": "eng-d-8-c1-q02",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VIII (page 25 Simple Past Tense), choose the correct regular past form of the verb 'join': 'Galang ___ the marble-in-spoon race last week.'",
            "options": ["joined", "joins", "joining", "will join"],
            "answer": 0,
            "why": {"0": "The regular past tense of 'join' adds -ed ending: 'joined'."},
            "distractorWhy": {"1": "joins is simple present.", "2": "joining is present continuous.", "3": "will join is future."}
        },
        {
            "id": "eng-d-8-c1-q03",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VIII (page 30 Irregular Verbs), choose the correct past form of verb 'win': 'Pipit ___ first place in the sack race contest.'",
            "options": ["won", "winned", "win", "winning"],
            "answer": 0,
            "why": {"0": "The irregular past tense form of 'win' is 'won'."},
            "distractorWhy": {"1": "winned is incorrect regularization.", "2": "win is present tense.", "3": "winning is continuous."}
        },
        {
            "id": "eng-d-8-c1-q04",
            "difficulty": "tinggi",
            "prompt": "Based on English for Nusantara Grade VIII (page 38 Recount Text Structure), what are the three main parts of a recount text structure?",
            "options": ["Orientation, Events, and Reorientation", "Goal, Materials, and Steps", "Thesis, Arguments, and Recommendation", "Title, Complication, and Resolution"],
            "answer": 0,
            "why": {"0": "A personal recount text consists of Orientation (who/where/when), Events (chronological past experiences), and Reorientation (feeling/summary)."},
            "distractorWhy": {"1": "Structure of procedural text.", "2": "Structure of analytical exposition.", "3": "Structure of narrative text."}
        },
        {
            "id": "eng-d-8-c1-q05",
            "difficulty": "dasar",
            "prompt": "Based on English for Nusantara Grade VIII (page 22 Unit 3 'Panjat Pinang'), what traditional game involves climbing a slippery greased nut tree pole to grab prizes at the top?",
            "options": ["Panjat Pinang", "Kelereng (marbles)", "Makan Kerupuk", "Tarik Tambang"],
            "answer": 0,
            "why": {"0": "Panjat Pinang is the traditional Independence Day game where teams climb a greased pole for prizes."},
            "distractorWhy": {"1": "Kelereng is marble race.", "2": "Makan Kerupuk is cracker eating.", "3": "Tarik Tambang is tug of war."}
        },
        {
            "id": "eng-d-8-c1-q06",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VIII (page 42 Time Connectors), choose the correct past connector: '___, Made put on his costume. Next, he walked to the school yard.'",
            "options": ["First", "Finally", "Last year", "Although"],
            "answer": 0,
            "why": {"0": "'First' is the initial time connector used at the start of chronological recount events."},
            "distractorWhy": {"1": "Finally is at the end.", "2": "Last year is time adverb.", "3": "Although is contrast connector."}
        },
        {
            "id": "eng-d-8-c1-q07",
            "difficulty": "tinggi",
            "prompt": "Based on English for Nusantara Grade VIII (page 48 Unit 2 Review), complete the sentence in simple past negative form: 'We ___ win the kerupuk race, but we had a lot of fun.'",
            "options": ["didn't win", "don't win", "wasn't win", "not winning"],
            "answer": 0,
            "why": {"0": "Negative simple past tense uses 'didn't' + base verb: 'didn't win'."},
            "distractorWhy": {"1": "don't win is present tense.", "2": "wasn't win is ungrammatical.", "3": "not winning lacks auxiliary verb."}
        },
        {
            "id": "eng-d-8-c1-q08",
            "difficulty": "dasar",
            "prompt": "Based on English for Nusantara Grade VIII (page 18), what costume did Galang wear during the school parade?",
            "options": ["A traditional warrior costume with a headpiece", "A doctor white coat", "A chef hat and apron", "A pilot uniform"],
            "answer": 0,
            "why": {"0": "Galang wore a traditional Indonesian warrior costume for the cultural parade."},
            "distractorWhy": {"1": "Doctor coat is not Galang's costume.", "2": "Chef hat is not his parade outfit.", "3": "Pilot uniform is incorrect."}
        },
        {
            "id": "eng-d-8-c1-q09",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VIII (page 32), what is the past tense form of 'eat' in the sentence: 'They ___ kerupuk attached to a string.'",
            "options": ["ate", "eaten", "eats", "eating"],
            "answer": 0,
            "why": {"0": "The irregular simple past tense of 'eat' is 'ate'."},
            "distractorWhy": {"1": "eaten is past participle.", "2": "eats is simple present.", "3": "eating is present participle."}
        },
        {
            "id": "eng-d-8-c1-q10",
            "difficulty": "tinggi",
            "prompt": "Based on English for Nusantara Grade VIII (page 52 Review), read the excerpt: 'Yesterday was August 17th. SMP Merdeka held an Independence Day celebration. All students felt happy.' What is the main feeling expressed in the reorientation?",
            "options": ["Joyful and proud", "Sad and disappointed", "Angry and frustrated", "Bored and tired"],
            "answer": 0,
            "why": {"0": "The text states 'felt happy' indicating joy and pride in celebrating Independence Day."},
            "distractorWhy": {"1": "Contradicts 'happy'.", "2": "Contradicts the celebratory mood.", "3": "Contradicts 'happy'."}
        },
        {
            "id": "eng-d-8-c1-q11",
            "difficulty": "dasar",
            "prompt": "Based on English for Nusantara Grade VIII (page 28), what is the past form of 'go'?",
            "options": ["went", "goed", "gone", "going"],
            "answer": 0,
            "why": {"0": "The irregular past tense of 'go' is 'went'."},
            "distractorWhy": {"1": "goed is incorrect regularization.", "2": "gone is past participle.", "3": "going is present participle."}
        },
        {
            "id": "eng-d-8-c1-q12",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VIII (page 35), complete the sentence: 'Pak Rahmansyah ___ a speech at the opening of the school games.'",
            "options": ["gave", "gives", "given", "giving"],
            "answer": 0,
            "why": {"0": "The simple past tense form of 'give' is 'gave'."},
            "distractorWhy": {"1": "gives is present.", "2": "given is past participle.", "3": "giving is continuous."}
        }
    ]
}
save_json(os.path.join(tools_dir, "chunk_eng_8_c1.json"), eng8_c1)

print("Grade 8 chunks built successfully.")
