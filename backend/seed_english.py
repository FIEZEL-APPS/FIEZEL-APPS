"""Seed Kurikulum Merdeka — BAHASA INGGRIS lengkap Fase A–F (Kelas 1–12).

Tiga elemen resmi:
  LS = Menyimak – Berbicara
  RV = Membaca – Memirsa
  WP = Menulis – Mempresentasikan

Struktur yang dibangun:
  KURMER > FASE > KELAS > Bahasa Inggris > Elemen > CP > TP > Indikator > Kompetensi > Topik > Materi

Prasyarat kompetensi disusun otomatis secara vertikal: kompetensi ke-n pada elemen yang sama di kelas
sebelumnya menjadi prasyarat kompetensi ke-n di kelas berikutnya. Idempoten & non-destruktif —
node lama (mis. TP-ENG-D-7-REC-01 beserta legacy_skill) tidak diubah.
"""
from fastapi import APIRouter, Depends

from db import db
from auth import teacher_user
from curriculum import NodeIn, create_node

router = APIRouter(prefix="/api/seed", tags=["seed"])

ELEMENTS = {
    "LS": "Menyimak – Berbicara",
    "RV": "Membaca – Memirsa",
    "WP": "Menulis – Mempresentasikan",
}

PHASE_OF = {1: "A", 2: "A", 3: "B", 4: "B", 5: "C", 6: "C",
            7: "D", 8: "D", 9: "D", 10: "E", 11: "F", 12: "F"}
PHASE_NAME = {"A": ("Fase A", "Kelas 1–2"), "B": ("Fase B", "Kelas 3–4"),
              "C": ("Fase C", "Kelas 5–6"), "D": ("Fase D", "Kelas 7–9"),
              "E": ("Fase E", "Kelas 10"), "F": ("Fase F", "Kelas 11–12")}

# Capaian Pembelajaran per fase per elemen (ringkas, sesuai rumusan Kurikulum Merdeka)
CP = {
    ("A", "LS"): "Pada akhir Fase A, peserta didik menggunakan bahasa Inggris sederhana untuk berinteraksi dalam situasi sosial dan kelas, merespons instruksi dan pertanyaan sangat sederhana dengan bantuan visual, gestur, serta pengulangan.",
    ("A", "RV"): "Pada akhir Fase A, peserta didik mengenali huruf, bunyi awal, kata, dan frasa yang sangat familiar pada teks bergambar, serta memirsa gambar untuk memahami makna kata.",
    ("A", "WP"): "Pada akhir Fase A, peserta didik menirukan dan menyalin huruf, kata, dan frasa sangat sederhana, serta melabeli gambar dengan bantuan guru.",
    ("B", "LS"): "Pada akhir Fase B, peserta didik menggunakan bahasa Inggris untuk berinteraksi dan bertukar informasi sederhana tentang diri, keluarga, sekolah, dan kegiatan sehari-hari dengan bantuan visual.",
    ("B", "RV"): "Pada akhir Fase B, peserta didik membaca kata, frasa, dan kalimat sederhana serta memirsa teks visual pendek untuk menemukan informasi tersurat.",
    ("B", "WP"): "Pada akhir Fase B, peserta didik menulis kata, frasa, dan kalimat sederhana serta mempresentasikannya dengan bantuan kerangka.",
    ("C", "LS"): "Pada akhir Fase C, peserta didik berkomunikasi tentang topik konkret sehari-hari melalui pertukaran singkat, menyampaikan kemampuan, kewajiban, dan kegiatan yang sedang berlangsung.",
    ("C", "RV"): "Pada akhir Fase C, peserta didik memahami ide pokok dan informasi rinci teks pendek bergambar, termasuk teks prosedur sederhana.",
    ("C", "WP"): "Pada akhir Fase C, peserta didik menulis teks deskriptif dan prosedur sederhana secara terstruktur serta mempresentasikannya.",
    ("D", "LS"): "Pada akhir Fase D, peserta didik menggunakan bahasa Inggris untuk berinteraksi dan bertukar gagasan pada konteks yang dikenal, termasuk memperkenalkan diri, mendeskripsikan, menyampaikan rencana, prosedur, dan pendapat.",
    ("D", "RV"): "Pada akhir Fase D, peserta didik memahami ide utama, informasi rinci, dan makna tersirat teks pendek berjenis deskriptif, recount, prosedur, naratif, dan report.",
    ("D", "WP"): "Pada akhir Fase D, peserta didik menghasilkan teks pendek berjenis deskriptif, recount, prosedur, naratif, report, dan surat semi formal dengan struktur dan tata bahasa dasar yang tepat.",
    ("E", "LS"): "Pada akhir Fase E, peserta didik berdiskusi dan berargumen tentang isu yang dikenal, serta menyampaikan presentasi lisan singkat yang terstruktur.",
    ("E", "RV"): "Pada akhir Fase E, peserta didik memahami dan menganalisis teks otentik pendek berjenis eksposisi, laporan, naratif, dan biografi.",
    ("E", "WP"): "Pada akhir Fase E, peserta didik menulis teks eksposisi analitis dan recount faktual dengan struktur, kohesi, dan bukti pendukung yang jelas.",
    ("F", "LS"): "Pada akhir Fase F, peserta didik bernegosiasi makna dalam berbagai konteks termasuk akademik, mempertahankan posisi secara santun, dan mempresentasikan hasil kajian.",
    ("F", "RV"): "Pada akhir Fase F, peserta didik menganalisis dan mengevaluasi teks otentik yang lebih kompleks serta teks multimodal secara kritis.",
    ("F", "WP"): "Pada akhir Fase F, peserta didik menghasilkan teks multi-paragraf argumentatif, ringkasan/parafrasa, serta laporan formal dengan sudut pandang dan bukti.",
}

# (tp, indikator, [(kompetensi, materi ajar)])
G: dict[int, dict[str, list]] = {
    1: {
        "LS": [
            ("Merespons sapaan dan instruksi kelas sederhana secara lisan",
             "Merespons sapaan, perkenalan, dan instruksi guru", [
                 ("Menyapa dan memperkenalkan diri secara lisan",
                  "Greetings & self-introduction: Hello / Good morning / My name is Ali / I am seven. Latihan dialog dua baris dengan gestur."),
                 ("Merespons instruksi kelas dengan tindakan yang tepat",
                  "Classroom instructions: Stand up, Sit down, Open your book, Listen, Look at me. Total Physical Response.")]),
            ("Menyebutkan nama benda, warna, dan angka di sekitar",
             "Menyebutkan kosakata konkret di lingkungan kelas", [
                 ("Menyebutkan angka 1–10 dan warna dasar",
                  "Numbers one–ten; colours red, blue, yellow, green, black, white. Pola: It is red. / There are three books."),
                 ("Menamai benda kelas dengan pola This is a …",
                  "Classroom objects: pencil, book, bag, ruler, chair. Pola: This is a pencil. That is a bag. Artikel a/an.")],),
        ],
        "RV": [
            ("Mengenali huruf dan bunyi awal kata",
             "Mengenali bentuk huruf dan bunyi awal", [
                 ("Mengenali huruf A–Z beserta bunyinya",
                  "Alfabet A–Z, huruf besar dan kecil; bunyi awal /b/ untuk ball, /k/ untuk cat. Latihan letter–sound matching."),
                 ("Membaca kata bergambar berpola sederhana (CVC)",
                  "Kata CVC: cat, bag, pen, dog, sun. Membaca dengan blending bunyi dan dukungan gambar.")]),
            ("Memirsa gambar dan mencocokkan dengan kata",
             "Memaknai gambar dan label kata", [
                 ("Mencocokkan kata dengan gambar benda familiar",
                  "Word–picture matching untuk benda kelas, hewan, dan makanan sederhana."),
                 ("Membaca label dan tanda sederhana di sekolah",
                  "Label: toilet, library, canteen, exit. Memaknai tanda melalui gambar + kata.")]),
        ],
        "WP": [
            ("Menyalin huruf dan kata sederhana",
             "Menyalin bentuk huruf dan kata dengan benar", [
                 ("Menulis huruf besar dan kecil dengan bentuk tepat",
                  "Handwriting A–Z / a–z: arah tulis, tinggi huruf, spasi antar huruf."),
                 ("Menyalin kata benda familiar dengan ejaan tepat",
                  "Menyalin: book, bag, pen, cat, sun. Fokus urutan huruf dan kerapian.")]),
            ("Menuliskan identitas diri paling sederhana",
             "Menulis data diri dengan pola yang disediakan", [
                 ("Menulis nama, usia, dan kelas dengan pola",
                  "Pola: My name is …. I am … years old. I am in class 1. Huruf kapital pada nama."),
                 ("Melengkapi kata rumpang pada kalimat bergambar",
                  "Cloze bergambar: This is a b_ _k. Fokus ejaan dan kosakata inti.")]),
        ],
    },
    2: {
        "LS": [
            ("Bertanya-jawab tentang keluarga dan hewan kesayangan",
             "Bertukar informasi sederhana tentang orang dan hewan", [
                 ("Menyebutkan anggota keluarga dengan pola This is my …",
                  "Family: father, mother, brother, sister, grandmother. Pola: This is my mother. She is a teacher."),
                 ("Menyatakan kepemilikan sederhana dengan have/has",
                  "Pola: I have a cat. She has two dogs. Kontras have/has untuk I/you vs he/she/it.")]),
            ("Merespons lagu, chant, dan cerita bergambar",
             "Menangkap kata kunci dari teks lisan pendek", [
                 ("Mengenali kosakata hewan dan bunyinya dari teks lisan",
                  "Animals: cat, cow, duck, goat, lion + bunyi/ciri. Listen and point / listen and circle."),
                 ("Menjawab pertanyaan yes/no dari cerita bergambar",
                  "Yes/No questions: Is it a cat? Does the boy run? Jawaban pendek Yes, it is. / No, it isn't.")]),
        ],
        "RV": [
            ("Membaca kata dan frasa yang familiar",
             "Membaca kata frekuensi tinggi dan frasa benda", [
                 ("Membaca sight words frekuensi tinggi",
                  "Sight words: the, is, my, this, and, in, on. Dibaca cepat tanpa penguraian bunyi."),
                 ("Membaca frasa benda + warna/ukuran",
                  "Frasa: a red ball, a big bag, two small cats. Urutan artikel + adjective + noun.")]),
            ("Menemukan informasi dari gambar berlabel",
             "Menemukan informasi tersurat pada teks bergambar", [
                 ("Membaca kalimat sederhana bergambar",
                  "Kalimat: The cat is on the box. Fokus preposisi in/on/under dan to be."),
                 ("Mencocokkan kalimat dengan gambar yang tepat",
                  "Sentence–picture matching; membedakan detail (jumlah, warna, posisi).")]),
        ],
        "WP": [
            ("Menulis frasa dan kalimat sangat sederhana",
             "Menulis kalimat berpola dengan tanda baca dasar", [
                 ("Menulis kalimat berpola I like … / This is …",
                  "Pola: I like apples. This is my bag. Kosakata makanan & benda pribadi."),
                 ("Menggunakan huruf kapital awal dan titik akhir",
                  "Mekanika dasar: kapital di awal kalimat & nama, titik di akhir kalimat.")]),
            ("Melabeli gambar dengan kata yang tepat",
             "Melabeli dan menyusun kata menjadi frasa", [
                 ("Melabeli anggota tubuh dan anggota keluarga",
                  "Body: head, hand, foot, eye, ear. Family labels pada pohon keluarga sederhana."),
                 ("Menyusun kata acak menjadi frasa/kalimat benar",
                  "Scrambled words: (ball / a / red) → a red ball. Melatih urutan kata.")]),
        ],
    },
    3: {
        "LS": [
            ("Berinteraksi tentang aktivitas sehari-hari di rumah dan sekolah",
             "Menyampaikan kegiatan rutin dan waktu", [
                 ("Menyatakan kegiatan rutin dengan simple present",
                  "Simple present: I go to school. I get up at six. Kosakata daily routine + adverb of frequency always/usually."),
                 ("Menyebutkan waktu dengan pola o'clock dan half past",
                  "Telling time: It's seven o'clock. It's half past six. Pertanyaan What time is it?")]),
            ("Menyampaikan kesukaan dan permintaan sederhana",
             "Menyatakan suka/tidak suka dan meminta sesuatu", [
                 ("Menyatakan suka dan tidak suka dengan like / don't like",
                  "Pola: I like milk. I don't like onions. Do you like …? Yes, I do. / No, I don't."),
                 ("Meminta dan memberi barang secara sopan",
                  "Expressions: Can I have a pencil, please? Here you are. Thank you. You're welcome.")]),
        ],
        "RV": [
            ("Membaca kalimat sederhana dan menemukan informasi tersurat",
             "Menemukan siapa, apa, dan di mana pada teks pendek", [
                 ("Membaca kalimat simple present dan memahami maknanya",
                  "Teks 3–4 kalimat tentang rutinitas; fokus kata kerja + objek."),
                 ("Menemukan informasi siapa/apa/di mana dari teks",
                  "Strategi scanning: menandai nama, benda, dan tempat pada teks pendek.")]),
            ("Memirsa teks visual pendek berupa jadwal dan daftar",
             "Membaca informasi pada tabel dan daftar sederhana", [
                 ("Membaca jadwal pelajaran dan menyebut hari",
                  "Days: Monday–Sunday; membaca jadwal: We have English on Monday."),
                 ("Membaca daftar belanja dan angka hingga 100",
                  "Numbers to 100, satuan sederhana; membaca daftar: two kilos of rice.")]),
        ],
        "WP": [
            ("Menulis kalimat sederhana tentang diri dan keluarga",
             "Menulis beberapa kalimat runtut tentang diri", [
                 ("Menulis 3–4 kalimat identitas diri dan keluarga",
                  "Kerangka: name, age, school, family. Contoh: My name is Sari. I am nine years old."),
                 ("Menggunakan am/is/are dengan tepat",
                  "To be: I am, he/she/it is, we/you/they are. Latihan kalimat positif dan negatif.")]),
            ("Menyusun daftar dan label bergambar",
             "Menyusun daftar kegiatan/benda dengan ejaan tepat", [
                 ("Membuat daftar kegiatan harian atau benda",
                  "Membuat to-do list / shopping list; penggunaan huruf kapital pada awal item."),
                 ("Menuliskan kata frekuensi tinggi dengan ejaan benar",
                  "Spelling drill kata frekuensi tinggi: because, friend, school, favourite.")]),
        ],
    },
    4: {
        "LS": [
            ("Menanyakan dan memberi informasi tentang sekolah dan lingkungan",
             "Mengajukan pertanyaan informasi dan menjawabnya", [
                 ("Menggunakan wh-questions sederhana",
                  "What / Where / Who / When: Where is the library? Who is your teacher?"),
                 ("Menyebutkan posisi benda dengan preposisi tempat",
                  "Prepositions: in, on, under, behind, next to, between. Pola: The ball is under the table.")]),
            ("Mendeskripsikan orang dan benda secara lisan",
             "Mendeskripsikan ciri fisik dan jumlah", [
                 ("Menggunakan adjective untuk ciri fisik dan sifat",
                  "Adjectives: tall, short, kind, clever, new, old. Pola: My father is tall and kind."),
                 ("Menyatakan keberadaan dengan there is / there are",
                  "There is a clock on the wall. There are five chairs. Kontras tunggal–jamak.")]),
        ],
        "RV": [
            ("Memahami teks deskriptif sangat pendek",
             "Menemukan ide utama dan detail teks deskriptif", [
                 ("Menemukan ide utama teks 3–5 kalimat",
                  "Strategi: kalimat pertama sering memuat topik; menandai kata kunci berulang."),
                 ("Memaknai kosakata deskriptif dari konteks",
                  "Kosakata sifat, ukuran, warna, bahan; menebak makna dari gambar dan kalimat sekitar.")]),
            ("Membaca instruksi bergambar",
             "Memahami instruksi dan urutan langkah", [
                 ("Memahami kalimat imperatif pada instruksi",
                  "Imperative: Cut the paper. Don't run. Kata kerja di awal kalimat tanpa subjek."),
                 ("Mengurutkan langkah dengan penanda first/then/finally",
                  "Sequence markers: first, then, next, finally. Latihan menyusun 4 langkah.")]),
        ],
        "WP": [
            ("Menulis deskripsi pendek berbantuan kerangka",
             "Menulis paragraf deskriptif sederhana", [
                 ("Menulis 4–5 kalimat deskripsi orang/benda/tempat",
                  "Kerangka: nama & jenis, ciri fisik, kebiasaan/kegunaan, pendapat singkat."),
                 ("Menghubungkan kalimat dengan and, but, because",
                  "Konjungsi: and (menambah), but (kontras), because (alasan). Contoh: She is kind and clever.")]),
            ("Menulis pesan dan ucapan sederhana",
             "Menulis pesan singkat dengan mekanika tepat", [
                 ("Menulis greeting card dan pesan singkat",
                  "Struktur: sapaan, isi singkat, penutup, nama. Contoh: Happy birthday, Rina! Best wishes, Ali."),
                 ("Menggunakan tanda tanya, tanda seru, dan kapitalisasi",
                  "Mekanika: ? untuk pertanyaan, ! untuk seruan, kapital untuk nama hari/bulan/orang.")]),
        ],
    },
    5: {
        "LS": [
            ("Bertukar informasi tentang kegiatan yang sedang berlangsung",
             "Menyatakan dan menanyakan kegiatan saat ini", [
                 ("Menggunakan present continuous untuk kegiatan berlangsung",
                  "Pola: I am reading. She is cooking. am/is/are + verb-ing; ejaan -ing (run → running)."),
                 ("Menanyakan kegiatan dengan What are you doing?",
                  "Pertanyaan & jawaban: What are you doing? I'm doing my homework. Now, at the moment.")]),
            ("Menyampaikan kemampuan dan kewajiban",
             "Menyatakan kemampuan, larangan, dan kewajiban", [
                 ("Menyatakan kemampuan dengan can / can't",
                  "Pola: I can swim. He can't ride a bike. Can you …? Yes, I can."),
                 ("Menyatakan kewajiban dengan must / have to",
                  "Pola: We must wear uniforms. You have to be quiet in the library. Larangan: mustn't.")]),
        ],
        "RV": [
            ("Menemukan informasi rinci dari teks pendek bergambar",
             "Menemukan detail spesifik pada teks informatif", [
                 ("Menemukan detail who/when/how many/how much",
                  "Strategi scanning angka, nama, dan waktu; menandai kata tanya pada soal lebih dulu."),
                 ("Memahami kosakata tema makanan, kesehatan, dan lingkungan",
                  "Kosakata: healthy, vegetables, exercise, rubbish, recycle; kolokasi dasar.")]),
            ("Memahami teks prosedur sederhana",
             "Mengenali tujuan dan struktur teks prosedur", [
                 ("Mengenali struktur teks prosedur (goal, materials, steps)",
                  "Struktur: tujuan, bahan/alat, langkah. Ciri: imperative + sequence markers."),
                 ("Memahami penanda urutan dan kata kerja instruksi",
                  "Kata kerja: mix, pour, cut, boil, add. Penanda: first, after that, finally.")]),
        ],
        "WP": [
            ("Menulis teks deskriptif pendek terstruktur",
             "Menulis deskripsi dengan struktur yang jelas", [
                 ("Menulis identifikasi dan deskripsi dalam satu paragraf",
                  "Struktur: identification (apa/siapa) + description (ciri, bagian, kebiasaan)."),
                 ("Menyusun frasa adjective dengan urutan tepat",
                  "Urutan sederhana: opinion–size–colour–noun. Contoh: a beautiful small blue bird.")]),
            ("Menulis teks prosedur sederhana",
             "Menulis langkah kerja yang dapat diikuti", [
                 ("Menulis langkah resep atau kerajinan",
                  "Menulis 5–7 langkah dengan imperative dan bahan yang jelas."),
                 ("Menggunakan konjungsi urutan dalam tulisan",
                  "First, next, then, after that, finally. Satu langkah satu kalimat.")]),
        ],
    },
    6: {
        "LS": [
            ("Bercerita pengalaman sederhana secara lisan",
             "Menceritakan kejadian lampau secara runtut", [
                 ("Menggunakan simple past pada verba beraturan",
                  "Pola: I visited my grandma. We played football. Ejaan -ed dan pelafalan /t/ /d/ /ɪd/."),
                 ("Menggunakan penanda waktu lampau",
                  "Penanda: yesterday, last week, two days ago, in 2023. Posisi di awal atau akhir kalimat.")]),
            ("Berdialog transaksional sederhana",
             "Melakukan transaksi dan meminta izin", [
                 ("Menggunakan ungkapan meminta izin dan menawarkan bantuan",
                  "May I go out? Could you help me? Would you like some water? Respon sopan."),
                 ("Bertransaksi jual beli sederhana",
                  "How much is it? It's ten thousand rupiah. I'll take two, please.")]),
        ],
        "RV": [
            ("Memahami teks recount pendek",
             "Menemukan urutan kejadian pada teks recount", [
                 ("Mengurutkan kejadian pada teks recount",
                  "Ciri recount: orientation lalu events berurutan; menandai penanda waktu."),
                 ("Memahami kosakata kegiatan liburan dan sekolah",
                  "Kosakata: holiday, camping, beach, museum, field trip; kolokasi go camping / visit a museum.")]),
            ("Menyimpulkan makna kata dari konteks",
             "Menggunakan strategi konteks untuk memaknai kata", [
                 ("Menebak makna kata baru dari context clues",
                  "Petunjuk: definisi, contoh, kontras, dan gambar di sekitar kata."),
                 ("Mengenali sinonim dan antonim dasar",
                  "Pasangan: big–large, happy–sad, cheap–expensive. Latihan substitusi dalam kalimat.")]),
        ],
        "WP": [
            ("Menulis recount pengalaman pribadi",
             "Menulis recount dengan struktur dan tenses tepat", [
                 ("Menulis orientation dan events secara runtut",
                  "Struktur: orientation (siapa, kapan, di mana) + events + penutup/kesan."),
                 ("Menggunakan simple past secara konsisten dalam tulisan",
                  "Konsistensi tenses; verba tak beraturan umum: go→went, see→saw, eat→ate.")]),
            ("Menulis pesan digital singkat",
             "Menulis pesan digital yang jelas dan sopan", [
                 ("Menulis chat atau email pendek",
                  "Struktur email pendek: salam, isi 2–3 kalimat, penutup, nama."),
                 ("Menggunakan ejaan dan tanda baca dasar dengan tepat",
                  "Menghindari singkatan tak baku pada tulisan sekolah; koma dan titik pada daftar.")]),
        ],
    },
    7: {
        "LS": [
            ("Memperkenalkan diri dan orang lain dalam interaksi",
             "Memperkenalkan diri dan orang lain secara lisan", [
                 ("Memperkenalkan diri dan orang lain",
                  "Pola: I'd like to introduce my friend, Rina. She is from Bandung. Nice to meet you."),
                 ("Menggunakan subject pronoun dan to be dengan tepat",
                  "I am / you are / he is / she is / it is / we are / they are; bentuk negatif dan tanya.")]),
            ("Mendeskripsikan orang, benda, dan tempat secara lisan",
             "Mendeskripsikan objek dan tempat secara rinci", [
                 ("Menggunakan adjective dan tingkat perbandingan sederhana",
                  "Comparative & superlative: taller than, the tallest; more beautiful than."),
                 ("Menyatakan keberadaan dan posisi dengan there is/are + preposisi",
                  "There are two windows next to the door. Preposisi: in front of, beside, across from.")]),
        ],
        "RV": [
            ("Memahami teks deskriptif pendek",
             "Menemukan ide utama dan detail teks deskriptif", [
                 ("Menemukan ide utama dan informasi rinci teks deskriptif",
                  "Ide utama biasanya pada identification; detail pada bagian description."),
                 ("Memaknai kosakata sifat dan tempat",
                  "Kosakata deskriptif tempat: crowded, quiet, historical, spacious.")]),
            ("Memahami teks recount pendek",
             "Menafsirkan urutan dan makna tersirat", [
                 ("Menentukan urutan kejadian dan penanda waktu",
                  "Menandai first, then, after that, finally serta keterangan waktu lampau."),
                 ("Menyimpulkan makna tersirat sederhana",
                  "Inferensi: perasaan penulis dan alasan kejadian dari bukti kalimat.")]),
        ],
        "WP": [
            ("Menulis teks deskriptif pendek",
             "Menulis deskripsi dengan struktur dan tata bahasa tepat", [
                 ("Menulis struktur identification–description",
                  "Paragraf 1: apa/siapa; Paragraf 2: ciri, bagian, kebiasaan. 6–8 kalimat."),
                 ("Menggunakan simple present untuk menyatakan fakta",
                  "Simple present: adds -s/-es untuk he/she/it; do/does untuk tanya dan negatif.")]),
            ("Menulis recount pengalaman",
             "Menulis recount dengan bentuk lampau yang tepat", [
                 ("Menulis kalimat pernyataan bentuk lampau",
                  "Pola: I went to Bali last month. Verba tak beraturan umum dan penanda waktu."),
                 ("Membentuk pertanyaan dan kalimat negatif bentuk lampau",
                  "Did + subject + verb1: Did you visit the museum? Negatif: I didn't go.")]),
        ],
    },
    8: {
        "LS": [
            ("Berinteraksi menyampaikan rencana dan ajakan",
             "Menyampaikan rencana, ajakan, dan responsnya", [
                 ("Menyatakan rencana dengan will dan be going to",
                  "will untuk keputusan spontan/prediksi; be going to untuk rencana. I'm going to join the club."),
                 ("Mengajak dan merespons ajakan",
                  "Let's …, How about …?, Would you like to …? Respon: Sure, I'd love to. / Sorry, I can't.")]),
            ("Menjelaskan cara melakukan sesuatu secara lisan",
             "Menjelaskan langkah dan meminta klarifikasi", [
                 ("Menjelaskan langkah dengan imperative dan penanda urutan",
                  "Struktur penjelasan lisan: tujuan, alat, langkah; penanda first/next/after that."),
                 ("Meminta dan memberi klarifikasi",
                  "Sorry, could you repeat that? Do you mean …? Parafrasa untuk memastikan pemahaman.")]),
        ],
        "RV": [
            ("Memahami teks prosedur dan notice",
             "Mengenali tujuan sosial dan struktur teks fungsional", [
                 ("Menentukan tujuan dan struktur teks prosedur",
                  "Tujuan: memberi petunjuk. Struktur: goal, materials, steps; ciri kebahasaan imperative."),
                 ("Memahami notice, label, dan pengumuman singkat",
                  "Notice: No parking, Keep off the grass; menyimpulkan siapa sasaran dan tujuannya.")]),
            ("Memahami teks naratif pendek",
             "Menganalisis alur, tokoh, dan pesan cerita", [
                 ("Menentukan alur dan tokoh pada teks naratif",
                  "Struktur naratif: orientation, complication, resolution; ciri tokoh & latar."),
                 ("Memahami penggunaan past continuous dalam cerita",
                  "Pola: While she was walking, she saw a fox. was/were + verb-ing sebagai latar kejadian.")]),
        ],
        "WP": [
            ("Menulis teks prosedur",
             "Menulis prosedur yang lengkap dan dapat diikuti", [
                 ("Menulis langkah kerja dengan imperative",
                  "Satu langkah satu kalimat; verba tindakan spesifik; hindari subjek."),
                 ("Menulis daftar bahan/alat dan konjungsi urutan",
                  "Materials list dengan satuan; konjungsi: first, then, after that, finally.")]),
            ("Menulis teks naratif pendek",
             "Menulis cerita dengan struktur naratif lengkap", [
                 ("Menulis struktur orientation–complication–resolution",
                  "Kerangka cerita 3 paragraf; konflik jelas dan penyelesaian logis."),
                 ("Menggunakan kalimat langsung sederhana dalam cerita",
                  "Direct speech: \"I am lost,\" said the boy. Tanda kutip dan koma sebelum penutup.")]),
        ],
    },
    9: {
        "LS": [
            ("Berdiskusi menyatakan pendapat dan persetujuan",
             "Menyatakan pendapat, alasan, dan persetujuan", [
                 ("Menggunakan ungkapan menyatakan pendapat",
                  "In my opinion, I think, I believe; menyanggah santun: I see your point, but …"),
                 ("Menyatakan alasan dengan because, so, therefore",
                  "Hubungan sebab-akibat: I agree because it saves money. So/therefore untuk akibat.")]),
            ("Menyampaikan pengumuman dan laporan lisan singkat",
             "Menyampaikan informasi faktual secara lisan", [
                 ("Menyampaikan pengumuman dengan struktur jelas",
                  "Struktur: sapaan, isi (apa, kapan, di mana), penutup. Bahasa lugas dan singkat."),
                 ("Menggunakan intonasi dan penekanan informatif",
                  "Penekanan pada kata kunci; intonasi turun untuk pernyataan, naik untuk yes/no question.")]),
        ],
        "RV": [
            ("Memahami teks report dan eksposisi pendek",
             "Membedakan fakta, opini, dan struktur teks report", [
                 ("Membedakan fakta dan opini dalam teks",
                  "Fakta: dapat diverifikasi; opini: memuat penilaian (should, best, beautiful)."),
                 ("Memahami kosakata akademik dasar",
                  "Kosakata: research, data, increase, decrease, cause, effect; kolokasi akademik.")]),
            ("Menyimpulkan dan menafsirkan informasi teks",
             "Menarik inferensi dan menelusuri rujukan kata", [
                 ("Menarik kesimpulan dari bukti dalam teks",
                  "Menghubungkan dua informasi untuk simpulan yang tidak dinyatakan langsung."),
                 ("Menentukan rujukan kata ganti",
                  "Reference: it, they, this, those merujuk frasa nomina sebelumnya.")]),
        ],
        "WP": [
            ("Menulis teks report pendek",
             "Menulis report faktual dengan struktur tepat", [
                 ("Menulis general classification dan description",
                  "Struktur report: klasifikasi umum lalu deskripsi bagian/kebiasaan/fungsi."),
                 ("Menggunakan kalimat pasif sederhana",
                  "Passive: Rice is grown in Java. be + verb3; dipakai saat pelaku tidak penting.")]),
            ("Menulis surat atau email semi formal",
             "Menulis surat semi formal yang santun dan runtut", [
                 ("Menulis struktur surat dan salam yang tepat",
                  "Struktur: salam, pembuka, isi, penutup, tanda tangan. Dear Sir/Madam, Yours sincerely."),
                 ("Menggunakan degrees of comparison dalam tulisan",
                  "Perbandingan: as … as, less than, the most …; menjaga kesejajaran struktur.")]),
        ],
    },
    10: {
        "LS": [
            ("Berdiskusi tentang isu yang dikenal dengan argumen",
             "Berargumen dan menanggapi pendapat lain", [
                 ("Menggunakan ungkapan berargumen dan menyanggah",
                  "Firstly, moreover, on the other hand, however; menyanggah dengan bukti bukan penilaian pribadi."),
                 ("Menggunakan konjungsi kontras dan konsesi",
                  "although, even though, whereas, despite + noun phrase.")]),
            ("Melakukan presentasi lisan singkat",
             "Menyusun dan menyampaikan presentasi terstruktur", [
                 ("Menyusun struktur presentasi dan signposting",
                  "Opening, outline, body, closing; signposting: Let me start with…, Moving on to…"),
                 ("Menanggapi pertanyaan audiens",
                  "Strategi: parafrasa pertanyaan, jawab ringkas, tawarkan detail. That's a good question…")]),
        ],
        "RV": [
            ("Memahami teks eksposisi analitis",
             "Menganalisis tesis, argumen, dan bukti", [
                 ("Mengidentifikasi thesis, arguments, dan reiteration",
                  "Struktur analytical exposition dan penanda tiap bagian."),
                 ("Mengidentifikasi bukti pendukung argumen",
                  "Jenis bukti: data, contoh, kutipan ahli; menilai relevansi bukti terhadap klaim.")]),
            ("Memahami teks naratif dan biografi otentik",
             "Menafsirkan karakter, pesan, dan kronologi", [
                 ("Menganalisis karakterisasi dan pesan moral",
                  "Karakterisasi langsung vs tidak langsung; menyimpulkan tema dari tindakan tokoh."),
                 ("Memahami past perfect dalam narasi",
                  "had + verb3 untuk kejadian yang lebih dahulu: She had left before I arrived.")]),
        ],
        "WP": [
            ("Menulis analytical exposition sederhana",
             "Menulis eksposisi dengan tesis dan argumen berbukti", [
                 ("Menyusun tesis dan dua argumen pendukung",
                  "Satu paragraf satu argumen: klaim, penjelasan, bukti, penutup mini."),
                 ("Menjaga kohesi antarparagraf",
                  "Kohesi: kata transisi, pengulangan kata kunci terkontrol, rujukan yang jelas.")]),
            ("Menulis recount faktual dan biografi",
             "Menulis teks faktual kronologis", [
                 ("Menulis kronologi dengan penanda waktu tepat",
                  "Penanda: in 1998, two years later, by the end of; konsistensi urutan waktu."),
                 ("Memvariasikan struktur kalimat",
                  "Variasi: kalimat majemuk dengan when/while/after; hindari kalimat berpola sama.")]),
        ],
    },
    11: {
        "LS": [
            ("Bernegosiasi makna dalam diskusi kelompok",
             "Menegosiasi makna dan menjaga kesantunan", [
                 ("Menggunakan ungkapan negosiasi dan klarifikasi",
                  "What I mean is…, Could we agree that…?, Let me rephrase; memastikan pemahaman bersama."),
                 ("Menggunakan hedging dan bahasa santun",
                  "Hedging: it seems, perhaps, it might be; melembutkan ketidaksetujuan.")]),
            ("Melakukan wawancara dan dialog interaktif",
             "Mengelola tanya jawab lanjutan", [
                 ("Mengajukan pertanyaan lanjutan (follow-up)",
                  "Probing: Why do you think so? Can you give an example? Menggali jawaban."),
                 ("Melaporkan ucapan orang lain secara lisan",
                  "Reported speech: He said (that) he was busy; pergeseran tenses dan kata rujukan.")]),
        ],
        "RV": [
            ("Menganalisis teks hortatory exposition dan opini",
             "Mengevaluasi sudut pandang dan bukti penulis", [
                 ("Mengidentifikasi bias dan sudut pandang penulis",
                  "Penanda bias: pilihan kata bermuatan, generalisasi, data selektif."),
                 ("Mengevaluasi kekuatan bukti dan penalaran",
                  "Menilai kecukupan, relevansi, dan kemutakhiran bukti; mengenali sesat pikir umum.")]),
            ("Membandingkan dua teks bertopik sama",
             "Menyintesis informasi antar teks", [
                 ("Menyintesis informasi dari dua teks",
                  "Tabel banding: klaim, bukti, kesimpulan; menemukan kesamaan dan perbedaan."),
                 ("Menggunakan kosakata evaluatif",
                  "Kosakata: convincing, questionable, significant, limited; kolokasi akademik.")]),
        ],
        "WP": [
            ("Menulis hortatory exposition",
             "Menulis teks persuasif dengan rekomendasi", [
                 ("Menyusun rekomendasi dengan modalitas persuasif",
                  "should, ought to, need to; rekomendasi spesifik dan dapat dilakukan."),
                 ("Menulis paragraf argumentatif berbukti",
                  "Pola PEEL: point, evidence, explanation, link.")]),
            ("Menulis ringkasan dan parafrasa",
             "Meringkas dan memparafrasa secara etis", [
                 ("Memparafrasa tanpa plagiarisme",
                  "Teknik: ubah struktur kalimat dan kosakata, pertahankan makna, sebutkan sumber."),
                 ("Meringkas berdasarkan ide utama",
                  "Ringkasan 1:5 dari teks asli; hanya ide utama dan bukti kunci.")]),
        ],
    },
    12: {
        "LS": [
            ("Berdiskusi akademik dan mempertahankan posisi",
             "Berdebat dengan struktur argumen yang kuat", [
                 ("Menyusun argumen claim–warrant–evidence",
                  "Claim (posisi), warrant (penalaran), evidence (bukti); menutup dengan dampak."),
                 ("Menanggapi sanggahan secara kritis dan santun",
                  "Rebuttal: acknowledge, counter, conclude; menjaga fokus pada argumen bukan pribadi.")]),
            ("Mempresentasikan hasil kajian sederhana",
             "Menyajikan data dan temuan secara lisan", [
                 ("Menyajikan data secara lisan",
                  "Bahasa data: the chart shows, increased sharply, remained stable."),
                 ("Menggunakan bahasa visual dan transisi presentasi",
                  "Merujuk slide: as you can see here; transisi: turning to, in summary.")]),
        ],
        "RV": [
            ("Mengevaluasi teks otentik kompleks",
             "Mengevaluasi tujuan dan strategi retoris penulis", [
                 ("Menentukan tujuan penulis dan strategi retoris",
                  "Strategi: repetition, rhetorical question, appeal to authority/emotion."),
                 ("Menarik inferensi tingkat lanjut",
                  "Inferensi implikatur: menyimpulkan asumsi tersembunyi dan konsekuensi tak tersurat.")]),
            ("Membaca kritis teks multimodal",
             "Membaca data visual dan menilai kredibilitas", [
                 ("Membaca grafik, tabel, dan infografis",
                  "Membaca sumbu, satuan, tren; membedakan korelasi dan sebab-akibat."),
                 ("Menilai kredibilitas sumber informasi",
                  "Kriteria: penulis, kemutakhiran, rujukan, potensi kepentingan.")]),
        ],
        "WP": [
            ("Menulis esai argumentatif multi-paragraf",
             "Menulis esai utuh dengan bukti dan kohesi", [
                 ("Menulis tesis, paragraf isi, dan kesimpulan berbukti",
                  "Struktur 5 paragraf: hook, tesis, 3 isi (PEEL), kesimpulan sintesis."),
                 ("Menjaga kohesi dan variasi sintaksis",
                  "Variasi klausa, nominalisasi terukur, penanda wacana yang tepat.")]),
            ("Menulis laporan atau proposal sederhana",
             "Menulis teks formal dengan register tepat", [
                 ("Menulis struktur laporan formal",
                  "Struktur: pendahuluan, metode/isi, temuan, simpulan, rekomendasi."),
                 ("Menggunakan sitasi dan register formal",
                  "Register formal: hindari kontraksi & slang; sitasi sederhana (penulis, tahun).")]),
        ],
    },
}


async def _node(node_id, ntype, parent, name, desc="", order=0, meta=None):
    ex = await db.curriculum_nodes.find_one({"id": node_id}, {"_id": 0})
    if ex:
        return ex
    return await create_node(NodeIn(id=node_id, code=node_id, type=ntype, parent_id=parent,
                                    name=name, description=desc, order=order, meta=meta or {}),
                             actor="seed_english")


async def seed_english_curriculum() -> dict:
    created_before = await db.curriculum_nodes.count_documents({})
    await _node("KURMER", "curriculum", None, "Kurikulum Merdeka",
                "Struktur resmi: Fase > Kelas > Mapel > Elemen > CP > TP > Indikator > Kompetensi")
    prev_comp: dict[str, list[str]] = {}   # elemen -> daftar competency_id kelas sebelumnya

    for grade in range(1, 13):
        ph = PHASE_OF[grade]
        phase_id = f"FASE-{ph}"
        pname, prange = PHASE_NAME[ph]
        await _node(phase_id, "phase", "KURMER", pname, prange, order=ord(ph) - 64)
        grade_id = f"KELAS-{grade}"
        await _node(grade_id, "grade", phase_id, f"Kelas {grade}", order=grade)
        subject_id = f"ENG-{grade}"
        await _node(subject_id, "subject", grade_id, "Bahasa Inggris", order=2)

        this_comp: dict[str, list[str]] = {}
        for ei, (el, el_name) in enumerate(ELEMENTS.items(), start=1):
            el_id = f"EL-ENG-{grade}-{el}"
            await _node(el_id, "element", subject_id, el_name, order=ei)
            cp_id = f"CP-ENG-{grade}-{el}"
            await _node(cp_id, "cp", el_id, CP[(ph, el)],
                        f"Capaian Pembelajaran {pname} — {el_name}", order=1)

            comp_seq: list[str] = []
            for ti, (tp_name, ind_name, comps) in enumerate(G[grade][el], start=1):
                tp_id = f"TP-ENG-{grade}-{el}-{ti:02d}"
                await _node(tp_id, "tp", cp_id, tp_name, order=ti)
                ind_id = f"IND-ENG-{grade}-{el}-{ti:02d}"
                await _node(ind_id, "indicator", tp_id, ind_name, order=1)
                for ci, (comp_name, materi) in enumerate(comps, start=1):
                    comp_id = f"KOMP-ENG-{grade}-{el}-{ti:02d}{ci}"
                    prereq: list[str] = []
                    idx = len(comp_seq)
                    prev = prev_comp.get(el) or []
                    if idx < len(prev):
                        prereq = [prev[idx]]
                    await _node(comp_id, "competency", ind_id, comp_name, order=ci,
                                meta={"prerequisite_competency_ids": prereq,
                                      "materi": materi, "phase": ph, "element": el})
                    topic_id = f"TOP-ENG-{grade}-{el}-{ti:02d}{ci}"
                    await _node(topic_id, "topic", comp_id, f"Topik: {comp_name}", order=1)
                    await _node(f"MAT-ENG-{grade}-{el}-{ti:02d}{ci}", "material", topic_id,
                                f"Materi: {comp_name}", materi, order=1,
                                meta={"materi": materi})
                    comp_seq.append(comp_id)
            this_comp[el] = comp_seq
        prev_comp = this_comp

    total = await db.curriculum_nodes.count_documents({})
    counts = {}
    for t in ("phase", "grade", "subject", "element", "cp", "tp", "indicator",
              "competency", "topic", "material"):
        counts[t] = await db.curriculum_nodes.count_documents({"type": t, "id": {"$regex": "ENG|FASE|KELAS"}})
    return {"nodes_before": created_before, "nodes_after": total,
            "created": total - created_before, "counts": counts,
            "note": "Kurikulum Merdeka Bahasa Inggris Fase A–F (Kelas 1–12), 3 elemen, "
                    "lengkap CP/TP/indikator/kompetensi/topik/materi. Node lama tidak diubah."}


@router.post("/english")
async def seed_english_route(u=Depends(teacher_user)):
    return await seed_english_curriculum()


@router.get("/english/status")
async def english_status():
    tp = await db.curriculum_nodes.count_documents({"type": "tp", "id": {"$regex": "^TP-ENG-"}})
    comp = await db.curriculum_nodes.count_documents({"type": "competency", "id": {"$regex": "^KOMP-ENG-"}})
    mat = await db.curriculum_nodes.count_documents({"type": "material", "id": {"$regex": "^MAT-ENG-"}})
    return {"seeded": tp > 0, "tp": tp, "competencies": comp, "materials": mat}
