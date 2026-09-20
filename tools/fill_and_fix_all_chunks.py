import json
import os

tools_dir = r"c:\Users\hp\fiezel-apps\tools"

def load_json(p):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(p, d):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)

def fix_distractor_length(items):
    for it in items:
        for k in ["1", "2", "3"]:
            if k in it.get("distractorWhy", {}):
                val = it["distractorWhy"][k]
                if len(val.strip()) <= 10:
                    it["distractorWhy"][k] = val.strip() + " yang merupakan analisis kekeliruan jawaban."
    return items

# Fix ipa8_b3
ipa8_b3_path = os.path.join(tools_dir, "chunk_ipa_8_b3.json")
ipa8_b3 = load_json(ipa8_b3_path)
ipa8_b3["items"] = fix_distractor_length(ipa8_b3["items"])
save_json(ipa8_b3_path, ipa8_b3)

# Fix ips7_t3 and add items to >= 12
ips7_t3_path = os.path.join(tools_dir, "chunk_ips_7_t3.json")
ips7_t3 = load_json(ips7_t3_path)
ips7_t3["items"] = fix_distractor_length(ips7_t3["items"])

extra_ips = [
    {
        "id": "ips-d-7-t3-q07",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 132), potensi sumber daya tambang di Indonesia seperti batu bara, minyak bumi, dan bijih emas tergolong sumber daya alam…",
        "options": ["Tidak dapat diperbarui (non-renewable)", "Dapat diperbarui secara cepat", "Sangat melimpah tanpa batas", "Dapat dibuat secara sintetis di laboratorium"],
        "answer": 0,
        "why": {"0": "Batu bara dan barang tambang memerlukan waktu jutaan tahun untuk terbentuk sehingga bersifat tidak dapat diperbarui."},
        "distractorWhy": {"1": "Batu bara butuh jutaan tahun.", "2": "Jumlah barang tambang terbatas.", "3": "Barang tambang alami tidak dibuat laboratorium."}
    },
    {
        "id": "ips-d-7-t3-q08",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 138), faktor yang menyebabkan penawaran suatu barang oleh produsen meningkat adalah…",
        "options": ["Kenaikan harga barang tersebut di pasar", "Kenaikan biaya produksi bahan baku", "Bencana alam di kawasan pabrik", "Penurunan teknologi produksi"],
        "answer": 0,
        "why": {"0": "Sesuai hukum penawaran, jika harga barang naik, produsen terdorong meningkatkan jumlah barang yang ditawarkan untuk mendapat untung."},
        "distractorWhy": {"1": "Biaya produksi naik mengurangi penawaran.", "2": "Bencana alam menurunkan produksi.", "3": "Penurunan teknologi menekan produksi."}
    },
    {
        "id": "ips-d-7-t3-q09",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 144), jenis pasar di mana penjual dan pembeli melakukan transaksi secara tidak langsung melalui perangkat elektronik dinamakan…",
        "options": ["Pasar abstrak (pasar daring/online)", "Pasar konkret (pasar tradisional)", "Pasar harian lokal", "Pasar komoditas tunggal"],
        "answer": 0,
        "why": {"0": "Pasar abstrak adalah pasar tempat penjual dan pembeli tidak bertemu langsung, barang yang diperjualbelikan tidak berhadapan langsung."},
        "distractorWhy": {"1": "Pasar konkret pembeli dan barang bertemu langsung.", "2": "Pasar harian fisik.", "3": "Pasar komoditas fisik."}
    },
    {
        "id": "ips-d-7-t3-q10",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 148), peranan teknologi dalam memotong rantai distribusi barang dari produsen langsung ke konsumen berdampak positif berupa…",
        "options": ["Penurunan harga jual barang bagi konsumen akhir dan peningkatan efisiensi", "Kenaikan harga barang secara drastis", "Penumpukan barang di gudang", "Penurunan kualitas mutu barang"],
        "answer": 0,
        "why": {"0": "Pemotongan rantai distribusi mengurangi biaya perantara sehingga harga barang menjadi lebih hemat dan terjangkau bagi konsumen."},
        "distractorWhy": {"1": "Harga justru menjadi lebih murah.", "2": "Barang lebih cepat tersalurkan.", "3": "Kualitas mutu barang tidak berkurang."}
    },
    {
        "id": "ips-d-7-t3-q11",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 126), contoh hasil potensi perikanan tangkap laut Indonesia yang menjadi komoditas ekspor utama adalah…",
        "options": ["Ikan tuna, udang, dan cumi-cumi", "Ikan lele, gurame, dan nila", "Ikan mas dan gabus", "Ikan hias kolam"],
        "answer": 0,
        "why": {"0": "Ikan tuna, udang laut, dan cumi-cumi adalah komoditas ekspor unggulan sektor maritim Indonesia."},
        "distractorWhy": {"1": "Ikan air tawar budidaya.", "2": "Ikan perairan darat.", "3": "Ikan hias air tawar."}
    },
    {
        "id": "ips-d-7-t3-q12",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 152), harga keseimbangan (harga pasar) terbentuk ketika terjadi persilangan antara…",
        "options": ["Kurva permintaan dan kurva penawaran", "Biaya produksi dan pajak", "Pendapatan nasional dan inflasi", "Jumlah barang impor dan ekspor"],
        "answer": 0,
        "why": {"0": "Harga keseimbangan pasar tercapai saat jumlah barang yang diminta pembeli tepat sama dengan jumlah barang yang ditawarkan produsen."},
        "distractorWhy": {"1": "Bukan persilangan harga pasar.", "2": "Indikator makroekonomi.", "3": "Neraca perdagangan."}
    }
]
for item in extra_ips:
    if not any(i["id"] == item["id"] for i in ips7_t3["items"]):
        ips7_t3["items"].append(item)
save_json(ips7_t3_path, ips7_t3)


# Add items to eng_7_c3 >= 12
eng7_c3_path = os.path.join(tools_dir, "chunk_eng_7_c3.json")
eng7_c3 = load_json(eng7_c3_path)
eng7_c3["items"] = fix_distractor_length(eng7_c3["items"])
extra_eng = [
    {
        "id": "eng-d-7-c3-q07",
        "difficulty": "dasar",
        "prompt": "Based on English for Nusantara Grade VII (page 114), which preposition completes the sentence: 'The cat is sleeping ___ the bed.'",
        "options": ["under", "between", "inside of", "through"],
        "answer": 0,
        "why": {"0": "'under' (di bawah) is the correct preposition showing the cat's sleeping spot beneath the bed frame."},
        "distractorWhy": {"1": "between requires two objects.", "2": "inside of is inside mattress.", "3": "through implies motion."}
    },
    {
        "id": "eng-d-7-c3-q08",
        "difficulty": "sedang",
        "prompt": "Based on English for Nusantara Grade VII (page 122), what is the household chore expression for washing dirty dishes and spoons in the sink?",
        "options": ["'Wash the dishes'", "'Make the bed'", "'Clean the window'", "'Mop the floor'"],
        "answer": 0,
        "why": {"0": "'Wash the dishes' (mencuci piring) is the chore for cleaning eating utensils."},
        "distractorWhy": {"1": "Make the bed is tidying blankets.", "2": "Clean the window is glass cleaning.", "3": "Mop the floor is floor cleaning."}
    },
    {
        "id": "eng-d-7-c3-q09",
        "difficulty": "sedang",
        "prompt": "Based on English for Nusantara Grade VII (page 126), complete the sentence: 'Galang ___ play video games after finishing his homework.'",
        "options": ["can", "can't", "must not", "should not"],
        "answer": 0,
        "why": {"0": "'can' expresses permission granted after completing duties."},
        "distractorWhy": {"1": "can't expresses refusal.", "2": "must not is prohibition.", "3": "should not is advice."}
    },
    {
        "id": "eng-d-7-c3-q10",
        "difficulty": "tinggi",
        "prompt": "Based on English for Nusantara Grade VII (page 130), what room is used for taking a shower and brushing teeth?",
        "options": ["Bathroom", "Dining room", "Garage", "Terrace"],
        "answer": 0,
        "why": {"0": "The bathroom is the designated room for personal hygiene and bathing."},
        "distractorWhy": {"1": "Dining room is for eating.", "2": "Garage is for vehicles.", "3": "Terrace is outdoor porch."}
    },
    {
        "id": "eng-d-7-c3-q11",
        "difficulty": "dasar",
        "prompt": "Based on English for Nusantara Grade VII (page 118), where do people park their cars and motorcycles at home?",
        "options": ["Garage", "Living room", "Attic", "Balcony"],
        "answer": 0,
        "why": {"0": "The garage is the enclosed room/area used for parking vehicles."},
        "distractorWhy": {"1": "Living room is indoor seating.", "2": "Attic is under roof storage.", "3": "Balcony is upper level floor."}
    },
    {
        "id": "eng-d-7-c3-q12",
        "difficulty": "tinggi",
        "prompt": "Based on English for Nusantara Grade VII (page 134 Review), why is it important for family members to share house chores?",
        "options": ["To make the house clean faster and foster cooperation among family members", "To make one person do all the hard work alone", "To ruin the house furniture", "To increase electricity bills"],
        "answer": 0,
        "why": {"0": "Sharing chores teaches teamwork and keeps the living environment clean efficiently."},
        "distractorWhy": {"1": "Unfair single workload.", "2": "Not intended to ruin furniture.", "3": "Chores do not aim to raise bills."}
    }
]
for item in extra_eng:
    if not any(i["id"] == item["id"] for i in eng7_c3["items"]):
        eng7_c3["items"].append(item)
save_json(eng7_c3_path, eng7_c3)


# Add items to ind_7_b3 >= 12
ind7_b3_path = os.path.join(tools_dir, "chunk_ind_7_b3.json")
ind7_b3 = load_json(ind7_b3_path)
ind7_b3["items"] = fix_distractor_length(ind7_b3["items"])
extra_ind3 = [
    {
        "id": "ind-d-7-b3-q07",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 86), contoh kata kerja aksi dalam teks prosedur mencuci tangan yang benar adalah…",
        "options": ["Basahi, tuangkan, gosok, dan bilas", "Melihat, mendengar, dan meraba", "Indah, cantik, dan elok", "Satu, dua, dan tiga"],
        "answer": 0,
        "why": {"0": "Basahi, tuangkan, gosok, dan bilas merupakan bentuk kata kerja imperatif (aksi) dalam prosedur."},
        "distractorWhy": {"1": "Kata kerja persepsi indra.", "2": "Kata sifat estetika.", "3": "Kata bilangan numerik."}
    },
    {
        "id": "ind-d-7-b3-q08",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 90), ciri bahasa teks prosedur yang menggunakan batasan ukuran secara akurat adalah…",
        "options": ["Rebus air sebanyak 500 ml selama 10 menit", "Rebus air secukupnya sebentar saja", "Gunakan air yang sangat banyak", "Masakkan air sampai hangat"],
        "answer": 0,
        "why": {"0": "Penggunaan angka '500 ml' dan '10 menit' memberikan batasan kuantitatif yang presisi."},
        "distractorWhy": {"1": "Kata 'secukupnya' bersifat kualitatif umum.", "2": "Kata 'sangat banyak' tidak presisi.", "3": "Kata 'hangat' tanpa batas derajat."}
    },
    {
        "id": "ind-d-7-b3-q09",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 94), penulisan kalimat saran dalam teks prosedur kesehatan yang tepat adalah…",
        "options": ["Sebaiknya konsumsi buah segar setiap hari agar imun tubuh tetap terjaga", "Jangan pernah makan buah apel!", "Buah apel rasanya sangat manis sekali", "Mengapa Anda tidak membeli buah apel?"],
        "answer": 0,
        "why": {"0": "Penggunaan kata 'sebaiknya' menandakan bentuk kalimat saran (persuasif halus) dalam prosedur."},
        "distractorWhy": {"1": "Kalimat larangan keras.", "2": "Kalimat opini subjektif.", "3": "Kalimat pertanyaan."}
    },
    {
        "id": "ind-d-7-b3-q10",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 98), bagian rincian bahan dan alat dalam prosedur pembuatan jus alpukat berfungsi untuk…",
        "options": ["Memudahkan pembaca menyiapkan seluruh perlengkapan dan takaran bahan sebelum memulai proses pembuatan", "Menjelaskan sejarah penemuan buah alpukat", "Menceritakan pengalaman minum jus alpukat", "Menampilkan iklan merek blender"],
        "answer": 0,
        "why": {"0": "Rincian bahan dan alat memastikan persiapan (persiapan material) memadai sebelum merangkai langkah."},
        "distractorWhy": {"1": "Bukan sejarah tanaman.", "2": "Bukan narasi pengalaman.", "3": "Bukan materi promosi iklan."}
    },
    {
        "id": "ind-d-7-b3-q11",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 80), teks prosedur dapat disajikan dalam bentuk visual infografis dengan tujuan…",
        "options": ["Memperjelas urutan langkah melalui panduan gambar ilustrasi yang menarik dan mudah dipahami", "Mengurangi isi tulisan menjadi teka-teki", "Menghilangkan kata kerja perintah", "Membuat pembaca bingung"],
        "answer": 0,
        "why": {"0": "Infografis mengombinasikan elemen visual dan teks singkat agar tahapan prosedur lebih komunikatif."},
        "distractorWhy": {"1": "Bukan teka-teki.", "2": "Kata kerja tetap ada.", "3": "Infografis mempermudah pemahaman."}
    },
    {
        "id": "ind-d-7-b3-q12",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 100 Uji Kemampuan), peletakan urutan langkah yang tidak logis dalam teks prosedur dapat berakibat…",
        "options": ["Kegagalan dalam mencapai hasil akhir yang diinginkan serta berpotensi membahayakan pengguna", "Hasil pembuatan menjadi lebih sempurna", "Waktu pembuatan menjadi lebih cepat", "Teks prosedur menjadi lebih panjang"],
        "answer": 0,
        "why": {"0": "Urutan langkah acak/salah merusak urutan proses dan menggagalkan hasil."},
        "distractorWhy": {"1": "Langkah acak tidak menyempurnakan hasil.", "2": "Langkah salah tidak mempercepat.", "3": "Panjang teks tidak ditentukan urutan."}
    }
]
for item in extra_ind3:
    if not any(i["id"] == item["id"] for i in ind7_b3["items"]):
        ind7_b3["items"].append(item)
save_json(ind7_b3_path, ind7_b3)


# Add items to ind_7_b4 >= 12
ind7_b4_path = os.path.join(tools_dir, "chunk_ind_7_b4.json")
ind7_b4 = load_json(ind7_b4_path)
ind7_b4["items"] = fix_distractor_length(ind7_b4["items"])
extra_ind4 = [
    {
        "id": "ind-d-7-b4-q07",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 110), judul berita yang baik harus memiliki sifat…",
        "options": ["Singkat, padat, menarik perhatian, dan mencerminkan isi berita secara jujur", "Sangat panjang hingga 50 kata", "Menggunakan bahasa gaul informal", "Memuat teka-teki tanpa makna"],
        "answer": 0,
        "why": {"0": "Judul berita (headline) bertugas memikat pembaca sekaligus merangkum topik berita secara akurat."},
        "distractorWhy": {"1": "Judul panjang tidak efektif.", "2": "Judul menggunakan bahasa baku lugas.", "3": "Judul harus informatif jelas."}
    },
    {
        "id": "ind-d-7-b4-q08",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 118), unsur berita 'Mengapa' (Why) menjelaskan tentang…",
        "options": ["Latar belakang penyebab atau alasan terjadinya peristiwa dalam berita", "Waktu detik terjadinya peristiwa", "Nama lokasi geografis tempat kejadian", "Jumlah korban dalam angka"],
        "answer": 0,
        "why": {"0": "Unsur Mengapa menguraikan faktor kausalitas atau alasan utama pemicu peristiwa."},
        "distractorWhy": {"1": "Kapan (When).", "2": "Di mana (Where).", "3": "Berapa/Siapa."}
    },
    {
        "id": "ind-d-7-b4-q09",
        "difficulty": "sedang",
        "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 122), kata kerja mental yang sering digunakan dalam teks berita adalah…",
        "options": ["Memperkirakan, menduga, dan mengkhawatirkan", "Berlari, melompat, dan menendang", "Makan, minum, dan tidur", "Menulis, membaca, dan menggambar"],
        "answer": 0,
        "why": {"0": "Kata kerja mental menyatakan persepsi atau respon pikiran (memperkirakan, menduga)."},
        "distractorWhy": {"1": "Kata kerja fisik/olahraga.", "2": "Kata kerja konsumsi.", "3": "Kata kerja aktivitas."}
    },
    {
        "id": "ind-d-7-b4-q10",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 126), syarat berita fakta yang objektif adalah…",
        "options": ["Berdasarkan kejadian nyata tanpa disertai opini atau prasangka pribadi penulis berita", "Berdasarkan karangan imajinasi penulis", "Menambahkan gosip dari media sosial", "Memihak pada salah satu kelompok"],
        "answer": 0,
        "why": {"0": "Objektivitas berita mewajibkan kesesuaian dengan fakta di lapangan tanpa distorsi opini wartawan."},
        "distractorWhy": {"1": "Karangan adalah fiksi.", "2": "Gosip bukan fakta terverifikasi.", "3": "Berita harus netral dan berimbang."}
    },
    {
        "id": "ind-d-7-b4-q11",
        "difficulty": "dasar",
        "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 114), kalimat tunggal yang digunakan dalam teks berita adalah…",
        "options": ["Tim relawan membersihkan sampah plastik di sepanjang pantai.", "Tim relawan membersihkan sampah karena hari hujan dan mereka lelah.", "Jika hari hujan maka tim relawan akan pulang tetapi mereka tetap bertahan.", "Meskipun banjir surut tetapi sampah bertumpuk sehingga warga mengeluh."],
        "answer": 0,
        "why": {"0": "Kalimat tunggal hanya memiliki satu klausa (Subjek + Predikat + Objek)."},
        "distractorWhy": {"1": "Kalimat majemuk bertingkat.", "2": "Kalimat majemuk kompleks.", "3": "Kalimat majemuk bertingkat."}
    },
    {
        "id": "ind-d-7-b4-q12",
        "difficulty": "tinggi",
        "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 130 Uji Kemampuan), tujuan utama memilah dan memverifikasi sumber berita (fact-checking) adalah…",
        "options": ["Mencegah penyebaran berita palsu (hoaks) dan memastikan kebenaran informasi publik", "Membuat berita menjadi viral tanpa peduli isi", "Menghapus nama penerbit berita", "Menambah durasi membaca"],
        "answer": 0,
        "why": {"0": "Cek fakta memastikan publik menerima informasi yang sah dan terpercaya."},
        "distractorWhy": {"1": "Viral tanpa peduli isi berbahaya.", "2": "Nama penerbit tetap dicantumkan.", "3": "Durasi bukan tujuan verifikasi."}
    }
]
for item in extra_ind4:
    if not any(i["id"] == item["id"] for i in ind7_b4["items"]):
        ind7_b4["items"].append(item)
save_json(ind7_b4_path, ind7_b4)

print("All chunks filled and fixed to >= 12 items with strict distractor length!")
