"""Seed BANK SOAL — yang mengubah kurikulum dari pohon menjadi pelajaran.

==========================================================================
KENAPA BERKAS INI ADA
==========================================================================
Sesudah empat gelombang isi, bank kurikulum berisi 564 kompetensi di 18 mata pelajaran,
Kelas 1–12, lengkap dengan materi ajar. Dan murid tidak bisa mengerjakan satu pun dari
semuanya.

Sebabnya diukur, bukan dikira:

    kompetensi demo (seed.py)          :  11  ->  7 punya soal (21 soal)
    kompetensi Inggris (seed_english)  : 144  ->  0 punya soal
    kompetensi mapel  (seed_mapel)     : 420  ->  0 punya soal

Mesin belajar mengambil soal dari `db.questions`. Kompetensi tanpa soal adalah simpul
yang bisa dilihat guru di pohon kurikulum dan TIDAK PERNAH bisa dilatih murid. Struktur
lengkap tanpa bank soal adalah daftar isi tanpa bukunya.

Generator yang sudah ada tidak menutup celah ini, dan itu bukan kekurangannya:
`POST /api/questions/generate-candidates` membuat VARIASI dari soal yang sudah terbit.
Kalau sebuah kompetensi belum punya satu soal pun, ia jatuh ke cabang `else` dan
menghasilkan satu soal esai generik ("Jelaskan dengan kalimatmu sendiri: …"). Berguna
sebagai benih sesudah ada isinya; tidak bisa menciptakan bank dari nol.

Jadi soal-soalnya ditulis. Berkas ini tempatnya.

==========================================================================
BENTUK TIAP BUTIR, DAN KENAPA TIAP RUASNYA WAJIB
==========================================================================
Validator di `questions.py` menolak atau memperingatkan butir yang tidak lengkap, dan
tuntutannya bukan formalitas — tiap ruas menutup satu cara soal gagal mengajar:

  stem         pertanyaannya. Minimal 8 karakter, tetapi yang sebenarnya dituntut adalah
               pertanyaan yang bisa dijawab tanpa menebak maksudnya.
  options      minimal 2, dan di sini SELALU 4: pilihan yang terlalu sedikit membuat
               tebakan acak terlalu sering benar dan penguasaan terlihat lebih tinggi
               daripada yang sebenarnya.
  answer_key   huruf yang cocok dengan jumlah opsi.
  explanation  pembahasan. Tanpa ini, murid yang SALAH hanya tahu bahwa ia salah — dan
               itu tepat saat ia paling siap belajar.
  hints        satu petunjuk untuk scaffolding: diberikan saat murid gagal, bukan
               sebelum ia mencoba.
  dm           peta pengecoh -> miskonsepsi. INI yang membuat banknya bernilai diagnostik:
               murid yang memilih B karena mengira tanda hasil mengikuti bilangan pertama
               tidak sama dengan murid yang menebak. Braincore membaca peta ini untuk
               memilih latihan berikutnya, jadi pengecoh yang asal-asalan membuang
               kemampuan adaptif yang sudah dibayar.
  d, cog       kesulitan 1–5 dan tingkat kognitif C1–C6. Dipakai penyusun sesi untuk
               menaikkan tantangan secara bertahap, bukan melompat.

PENGECOHNYA HARUS SALAH KARENA ALASAN YANG NYATA. Pengecoh yang jelas-jelas keliru
("Jakarta" untuk soal perkalian) tidak mengajarkan apa pun dan tidak mendiagnosis apa
pun. Tiap pengecoh di berkas ini adalah jawaban yang BENAR-BENAR diberikan murid ketika
ia salah paham dengan cara tertentu.

Idempoten: butir yang `stem`-nya sudah ada dilewati, jadi penyemai aman dijalankan ulang
dan gelombang berikutnya tidak menggandakan yang sudah masuk.
"""
from fastapi import APIRouter, Depends

from db import db
from auth import teacher_user
from questions import QuestionIn, _dna, validate_doc

router = APIRouter(prefix="/api/seed", tags=["seed"])


def Q(stem, o, k, e, h, d=2, cog="C2", dm=None):
    """Satu butir soal. Ditulis pendek supaya tabelnya terbaca sebagai soal, bukan kode."""
    return {"stem": stem, "o": o, "k": k, "e": e, "h": h, "d": d, "cog": cog, "dm": dm or {}}


# ==========================================================================
# BANK SOAL — GELOMBANG 1: BAHASA INGGRIS KELAS 7
# ==========================================================================
# Kelas 7 lebih dulu karena di sanalah kelas demo FIEZEL berdiri, jadi gelombang pertama
# bisa langsung dipakai dan diuji guru sungguhan alih-alih menunggu banknya penuh.
SOAL: dict[str, list[dict]] = {
    "KOMP-ENG-7-LS-011": [
        Q("Complete the introduction: “Hello, ___ name is Rina.”",
          ["My", "I", "Me", "Mine"], "A",
          "Sebelum kata benda (name) dipakai possessive adjective: my. “I” adalah subjek, “me” objek, “mine” berdiri sendiri tanpa kata benda.",
          ["Kata setelah titik kosong adalah kata benda (name). Kata milik mana yang berdiri sebelum kata benda?"],
          1, "C1", {"B": "MIS-SUBJECT-DIPAKAI-SEBAGAI-POSSESSIVE", "D": "MIS-MINE-DIPAKAI-SEBELUM-NOUN"}),
        # Pengecoh C sengaja memakai urutan "Budi my friend": itu pola bahasa Indonesia
        # ("ini Budi teman saya") yang dipindahkan apa adanya, dan benar-benar muncul di
        # tulisan murid. Versi pertama memakai kalimat yang sama persis dengan pilihan A
        # dan hanya berbeda tanda tanya - validator menandainya `duplicate_options` karena
        # ia menormalkan tanda baca, dan ia benar: pengecoh yang bedanya cuma satu tanda
        # baca menguji ketelitian membaca, bukan penguasaan bahasa.
        Q("You want to introduce your friend Budi to the class. Which sentence is correct?",
          ["This is my friend Budi.", "This my friend Budi.", "This is Budi my friend.", "He is Budi friend."], "A",
          "Perkenalan orang lain memakai pola “This is + orang”, dan kata milik berdiri sebelum kata bendanya: my friend Budi.",
          ["Perkenalan orang lain dimulai dengan “This is…”. Periksa juga apakah kata kerjanya ada."],
          2, "C2", {"B": "MIS-TO-BE-DIHILANGKAN", "C": "MIS-URUTAN-KATA-MENGIKUTI-POLA-INDONESIA", "D": "MIS-POSSESSIVE-TANPA-APOSTROF"}),
        Q("Someone asks: “How do you do?” What is the most appropriate reply in a first meeting?",
          ["How do you do?", "I am fine, thank you.", "I do well.", "Yes, I do."], "A",
          "Pada perkenalan formal, “How do you do?” dibalas dengan kalimat yang sama — ia salam, bukan pertanyaan tentang kabar.",
          ["Kalimat ini bukan menanyakan kabar. Ia salam formal saat pertama kali bertemu."],
          3, "C2", {"B": "MIS-DIANGGAP-PERTANYAAN-KABAR", "D": "MIS-DIJAWAB-SEBAGAI-YES-NO-QUESTION"}),
        Q("Read: “Her name is Sari. She is from Bandung.” Which question does the second sentence answer?",
          ["Where is she from?", "What is her name?", "How old is she?", "Who is she?"], "A",
          "Kalimat kedua menyebut asal (from Bandung), jadi ia menjawab pertanyaan tentang tempat asal.",
          ["Perhatikan kata “from”. Kata tanya apa yang meminta tempat asal?"],
          2, "C2", {"B": "MIS-KALIMAT-PERTAMA-DAN-KEDUA-TERTUKAR"}),
    ],
    "KOMP-ENG-7-LS-012": [
        Q("Choose the correct sentence.",
          ["They are students.", "They is students.", "They am students.", "They be students."], "A",
          "Subjek jamak (they) memakai “are”. “is” untuk he/she/it, “am” hanya untuk I.",
          ["Cocokkan bentuk to be dengan subjeknya: I → am, he/she/it → is, we/you/they → are."],
          1, "C1", {"B": "MIS-IS-DIPAKAI-UNTUK-SUBJEK-JAMAK", "C": "MIS-AM-DIPAKAI-SELAIN-I"}),
        Q("Replace the underlined words with the correct pronoun: “__Rina and I__ are in the library.”",
          ["We", "They", "Us", "Our"], "A",
          "“Rina and I” termasuk pembicara, jadi penggantinya “we”. “They” tidak memasukkan pembicara; “us” objek; “our” kata milik.",
          ["Apakah kelompok itu termasuk dirimu sendiri? Kalau ya, pronoun-nya memasukkan pembicara."],
          2, "C2", {"B": "MIS-PEMBICARA-TIDAK-IKUT-DIHITUNG", "C": "MIS-OBJEK-DIPAKAI-SEBAGAI-SUBJEK"}),
        Q("Complete: “My brother is tall. ___ is a basketball player.”",
          ["He", "She", "It", "They"], "A",
          "“My brother” adalah satu orang laki-laki, jadi pronoun-nya “he”.",
          ["Siapa yang dibicarakan di kalimat pertama? Satu orang atau banyak? Laki-laki atau perempuan?"],
          1, "C1", {"C": "MIS-ORANG-DIRUJUK-DENGAN-IT"}),
        Q("Which sentence is NOT correct?",
          ["The books is on the table.", "The book is on the table.", "The books are on the table.", "It is on the table."], "A",
          "“The books” jamak, jadi harus “are”. Tiga kalimat lainnya sudah cocok antara subjek dan to be.",
          ["Cari kalimat yang subjeknya jamak tetapi to be-nya bentuk tunggal."],
          3, "C4", {"B": "MIS-SALAH-MEMBACA-PERINTAH-SOAL-NOT"}),
    ],
    "KOMP-ENG-7-LS-021": [
        Q("Complete: “An elephant is ___ than a cat.”",
          ["bigger", "big", "biggest", "more big"], "A",
          "Membandingkan dua benda memakai bentuk comparative. Kata sifat pendek memakai akhiran -er, bukan “more”.",
          ["Ada kata “than” di kalimat itu. Bentuk apa yang selalu berpasangan dengan “than”?"],
          2, "C2", {"C": "MIS-SUPERLATIVE-DIPAKAI-UNTUK-DUA-BENDA", "D": "MIS-MORE-DIPAKAI-PADA-ADJECTIVE-PENDEK"}),
        Q("Which sentence uses the adjective correctly?",
          ["She has a beautiful voice.", "She has a voice beautiful.", "She has beautiful a voice.", "She beautiful has a voice."], "A",
          "Dalam bahasa Inggris, adjective berdiri SEBELUM kata benda: a beautiful voice. Urutannya berbeda dari bahasa Indonesia (suara indah).",
          ["Dalam bahasa Indonesia sifat ditulis setelah benda. Bahasa Inggris kebalikannya."],
          2, "C2", {"B": "MIS-URUTAN-ADJECTIVE-MENGIKUTI-POLA-INDONESIA"}),
        Q("Read: “Ani is 150 cm. Budi is 160 cm. Citra is 172 cm.” Who is the tallest?",
          ["Citra", "Budi", "Ani", "Budi and Citra"], "A",
          "Superlative (the tallest) menunjuk satu yang paling di antara tiga atau lebih. 172 cm adalah yang terbesar.",
          ["“Tallest” berarti paling tinggi dari semuanya, bukan lebih tinggi dari satu orang saja."],
          2, "C3", {"B": "MIS-COMPARATIVE-DIBACA-SEBAGAI-SUPERLATIVE"}),
        Q("Complete: “This book is ___ interesting than that one.”",
          ["more", "most", "much", "very"], "A",
          "“Interesting” adalah adjective panjang (tiga suku kata), jadi comparative-nya memakai “more”, bukan akhiran -er.",
          ["Hitung suku kata “interesting”. Kata sifat panjang tidak memakai -er."],
          3, "C2", {"B": "MIS-MOST-DIPAKAI-BERSAMA-THAN", "D": "MIS-VERY-DIANGGAP-PEMBENTUK-COMPARATIVE"}),
    ],
    "KOMP-ENG-7-LS-022": [
        Q("Complete: “___ a book and two pens on the desk.”",
          ["There are", "There is", "It is", "They are"], "A",
          "Bila yang disebut berupa daftar dan benda terakhir jamak (two pens), dipakai “there are”.",
          ["Lihat benda yang disebut sesudah titik kosong. Satu atau lebih dari satu?"],
          3, "C3", {"B": "MIS-THERE-IS-DIPAKAI-UNTUK-DAFTAR-JAMAK", "C": "MIS-IT-IS-DIPAKAI-MENYATAKAN-KEBERADAAN"}),
        Q("Look at the picture description: “The cat is ___ the box.” The cat is inside the box.",
          ["in", "on", "under", "behind"], "A",
          "“In” menyatakan di dalam. “On” di atas permukaan, “under” di bawah, “behind” di belakang.",
          ["Kucingnya berada di dalam kotak, bukan di atas atau di bawahnya."],
          1, "C1", {"B": "MIS-IN-DAN-ON-TERTUKAR"}),
        Q("Which sentence is correct?",
          ["There is a library in my school.", "There are a library in my school.", "There is libraries in my school.", "In my school there a library."], "A",
          "Satu benda tunggal (a library) memakai “there is”. Pilihan lain salah pada kesesuaian jumlah atau kehilangan kata kerja.",
          ["Cocokkan “there is/are” dengan jumlah benda yang disebut sesudahnya."],
          2, "C2", {"B": "MIS-THERE-ARE-DIPAKAI-UNTUK-BENDA-TUNGGAL", "D": "MIS-TO-BE-DIHILANGKAN"}),
        Q("Complete: “The clock is ___ the wall.”",
          ["on", "in", "at", "into"], "A",
          "Benda yang menempel pada permukaan tegak memakai “on the wall”. “In the wall” berarti tertanam di dalam dindingnya.",
          ["Jam menempel di permukaan dinding, tidak tertanam di dalamnya."],
          3, "C2", {"B": "MIS-IN-DIPAKAI-UNTUK-PERMUKAAN"}),
    ],
    "KOMP-ENG-7-RV-011": [
        Q("Read: “My cat is small. It has soft white fur and green eyes. It sleeps all day.” What is the text mainly about?",
          ["A description of the writer's cat", "How to take care of a cat", "Why cats sleep a lot", "The writer's daily activities"], "A",
          "Seluruh kalimat menggambarkan ciri kucing penulis, jadi ide utamanya deskripsi kucing itu — bukan cara merawat atau alasan tidur.",
          ["Ide utama adalah hal yang dibicarakan SEMUA kalimat, bukan hanya satu kalimat terakhir."],
          2, "C2", {"C": "MIS-DETAIL-TERAKHIR-DIANGGAP-IDE-UTAMA"}),
        Q("Read again: “My cat is small. It has soft white fur and green eyes.” What colour are the cat's eyes?",
          ["Green", "White", "Black", "The text does not say"], "A",
          "Informasi rinci terbaca langsung pada teks: green eyes. Putih adalah warna bulunya, bukan matanya.",
          ["Cari kata “eyes” di teks, lalu baca kata tepat sebelumnya."],
          1, "C1", {"B": "MIS-CIRI-SATU-DIPINDAH-KE-CIRI-LAIN"}),
        Q("Read: “Borobudur is a Buddhist temple in Magelang, Central Java. It was built in the 9th century.” Where is Borobudur?",
          ["In Magelang, Central Java", "In Yogyakarta", "In the 9th century", "In a Buddhist temple"], "A",
          "Pertanyaan “where” meminta tempat. “In the 9th century” menjawab “when”, bukan “where”.",
          ["Pertanyaan “where” meminta tempat. Pilihan mana yang menyebut tempat?"],
          2, "C2", {"C": "MIS-JAWABAN-WAKTU-DIPAKAI-UNTUK-PERTANYAAN-TEMPAT"}),
        Q("A descriptive text usually has two parts. What are they?",
          ["Identification and description", "Orientation and reorientation", "Goal and steps", "Thesis and arguments"], "A",
          "Teks deskriptif tersusun dari identification (menyebut apa yang dibahas) dan description (ciri-cirinya). Orientation–reorientation milik recount, goal–steps milik procedure.",
          ["Bagian pertama menyebut APA yang digambarkan; bagian kedua menyebut CIRI-CIRINYA."],
          3, "C1", {"B": "MIS-STRUKTUR-RECOUNT-DIPAKAI-UNTUK-DESKRIPTIF", "C": "MIS-STRUKTUR-PROCEDURE-DIPAKAI-UNTUK-DESKRIPTIF"}),
    ],
    "KOMP-ENG-7-RV-012": [
        Q("Read: “The room is spacious.” What does “spacious” mean?",
          ["Having a lot of space", "Very dirty", "Very dark", "Very expensive"], "A",
          "“Spacious” berasal dari kata “space” (ruang), jadi artinya luas atau lapang.",
          ["Perhatikan kata dasar di dalamnya: space."],
          2, "C2", {"B": "MIS-MAKNA-DITEBAK-TANPA-MELIHAT-KATA-DASAR"}),
        Q("Read: “The library is next to the canteen.” Where is the library?",
          ["Beside the canteen", "Inside the canteen", "Far from the canteen", "Above the canteen"], "A",
          "“Next to” berarti bersebelahan. Ia menyebut posisi bersebelahan, bukan di dalam atau jauh.",
          ["“Next to” menyatakan dua tempat yang bersebelahan."],
          1, "C1", {"B": "MIS-NEXT-TO-DIARTIKAN-DI-DALAM"}),
        Q("Which word describes a place, NOT a character?",
          ["Crowded", "Friendly", "Diligent", "Honest"], "A",
          "“Crowded” (ramai) menggambarkan tempat. Friendly, diligent, dan honest menggambarkan sifat orang.",
          ["Tiga pilihan menggambarkan sifat manusia; satu menggambarkan keadaan tempat."],
          2, "C4", {"B": "MIS-SIFAT-ORANG-DIANGGAP-SIFAT-TEMPAT"}),
        Q("Read: “My uncle's house is quite old, but it is well maintained.” What does the sentence suggest?",
          ["The house is old but in good condition", "The house is new and clean", "The house is old and broken", "The house is being rebuilt"], "A",
          "Kata “but” menandai pertentangan: tua, TETAPI terawat baik. Jadi tua tidak berarti rusak.",
          ["Kata “but” membalik arah makna. Apa yang dipertentangkan di sini?"],
          3, "C3", {"C": "MIS-KATA-BUT-DIABAIKAN-SEHINGGA-MAKNA-DISAMAKAN"}),
    ],
    "KOMP-ENG-7-RV-021": [
        Q("Read: “First, I woke up. Then, I took a bath. Finally, I had breakfast.” What did the writer do second?",
          ["Took a bath", "Woke up", "Had breakfast", "Went to school"], "A",
          "Penanda urutan menunjukkan susunannya: first (bangun), then (mandi), finally (sarapan).",
          ["Cari penanda urutan: first, then, finally. Yang mana menandai kejadian kedua?"],
          1, "C1", {"C": "MIS-FINALLY-DIBACA-SEBAGAI-KEJADIAN-KEDUA"}),
        Q("Which word shows that something happened LAST?",
          ["Finally", "First", "Before", "While"], "A",
          "“Finally” menandai kejadian terakhir. “First” yang pertama, “before” sebelum, “while” bersamaan.",
          ["Penanda mana yang berarti pada akhirnya?"],
          1, "C1", {"B": "MIS-FIRST-DAN-FINALLY-TERTUKAR", "D": "MIS-WHILE-DIBACA-SEBAGAI-URUTAN"}),
        Q("Read: “Before the class started, we cleaned the whiteboard.” Which happened first?",
          ["Cleaning the whiteboard", "The class started", "Both at the same time", "The text does not say"], "A",
          "“Before the class started” berarti membersihkan papan terjadi LEBIH DULU, walau disebut di bagian awal kalimat.",
          ["Urutan dalam kalimat tidak selalu sama dengan urutan kejadian. Baca kata “before”."],
          3, "C3", {"B": "MIS-URUTAN-KALIMAT-DIANGGAP-URUTAN-KEJADIAN"}),
        Q("Read: “While my mother was cooking, I was doing my homework.” What does this mean?",
          ["Both happened at the same time", "Cooking happened first", "Homework happened first", "Neither happened"], "A",
          "“While” menandai dua kejadian yang berlangsung bersamaan.",
          ["Kata “while” menghubungkan dua kejadian yang terjadi pada waktu yang sama."],
          2, "C2", {"B": "MIS-WHILE-DIBACA-SEBAGAI-URUTAN"}),
    ],
    "KOMP-ENG-7-RV-022": [
        Q("Read: “Rina looked at her empty lunch box and sighed.” How does Rina probably feel?",
          ["Disappointed", "Excited", "Angry", "Proud"], "A",
          "Kotak makan kosong ditambah menghela napas (sighed) menyiratkan kekecewaan. Teks tidak menyebutnya langsung — ia disimpulkan dari tindakan.",
          ["Teks tidak menyebut perasaannya. Apa yang ditunjukkan oleh tindakan “sighed”?"],
          3, "C4", {"C": "MIS-SEMUA-PERASAAN-NEGATIF-DISAMAKAN-DENGAN-MARAH"}),
        Q("Read: “Budi put on his raincoat before leaving the house.” What can we infer?",
          ["It was probably raining", "It was very hot", "He was going to swim", "He lost his umbrella"], "A",
          "Memakai jas hujan menyiratkan hujan atau akan hujan. Itu simpulan wajar, bukan yang tertulis.",
          ["Kenapa orang memakai jas hujan? Simpulkan keadaan cuacanya."],
          2, "C4", {"D": "MIS-MENAMBAH-INFORMASI-YANG-TIDAK-ADA-DI-TEKS"}),
        Q("Read: “The classroom was silent. Everyone was writing quickly.” What is probably happening?",
          ["A test", "A break time", "A sports lesson", "A school holiday"], "A",
          "Kelas sunyi dan semua menulis cepat adalah tanda ulangan. Ia disimpulkan dari dua petunjuk sekaligus.",
          ["Gabungkan dua petunjuk: sunyi DAN menulis cepat."],
          2, "C4", {"B": "MIS-SATU-PETUNJUK-DIPAKAI-MENGABAIKAN-YANG-LAIN"}),
        Q("Which statement is an INFERENCE, not a stated fact, from: “Ani wore a jacket and rubbed her hands.”",
          ["Ani felt cold.", "Ani wore a jacket.", "Ani rubbed her hands.", "Ani had two hands."], "A",
          "Dua pilihan lain tertulis langsung di teks. “Ani felt cold” tidak tertulis — ia disimpulkan dari keduanya.",
          ["Mana yang TIDAK tertulis di teks tetapi bisa disimpulkan darinya?"],
          4, "C4", {"B": "MIS-FAKTA-TERSURAT-DIANGGAP-INFERENSI"}),
    ],
    "KOMP-ENG-7-WP-011": [
        Q("You are writing a descriptive text about your school. Which sentence belongs to the IDENTIFICATION part?",
          ["My school is SMP Harapan Bangsa.", "It has twelve classrooms.", "The walls are painted green.", "The garden is full of flowers."], "A",
          "Identification menyebut APA yang digambarkan. Tiga kalimat lain sudah masuk bagian description karena menyebut ciri.",
          ["Bagian pertama teks deskriptif memperkenalkan objeknya, belum merinci cirinya."],
          2, "C3", {"B": "MIS-CIRI-PERTAMA-DIANGGAP-IDENTIFICATION"}),
        Q("Arrange into a good descriptive paragraph: (1) It has a big field. (2) My school is SMP 1 Bandung. (3) Students play football there every Friday.",
          ["2 – 1 – 3", "1 – 2 – 3", "3 – 2 – 1", "2 – 3 – 1"], "A",
          "Identification (2) lebih dulu, lalu ciri umum (1), lalu rincian tentang ciri itu (3).",
          ["Mulai dari kalimat yang memperkenalkan objek, lalu bergerak dari ciri umum ke rincian."],
          3, "C3", {"B": "MIS-DESCRIPTION-DITARUH-SEBELUM-IDENTIFICATION"}),
        Q("Which sentence does NOT belong in a descriptive text about a place?",
          ["Next week I will visit my grandmother.", "The room is very spacious.", "There are two windows.", "The floor is made of wood."], "A",
          "Teks deskriptif menggambarkan keadaan sekarang. Kalimat tentang rencana masa depan keluar dari tujuannya.",
          ["Teks deskriptif menggambarkan APA ADANYA, bukan rencana."],
          3, "C4", {"B": "MIS-PERINTAH-NOT-TERLEWAT-SAAT-MEMBACA-SOAL"}),
        Q("Which is the best closing sentence for a descriptive text about your bedroom?",
          ["I really love my bedroom because it is comfortable.", "First, I clean my bedroom.", "Do you have a bedroom?", "My bedroom is on the second floor."], "A",
          "Penutup deskriptif biasanya berisi kesan penulis. Pilihan lain berupa langkah, pertanyaan, atau ciri yang seharusnya ada di tengah teks.",
          ["Penutup teks deskriptif biasanya menyampaikan kesan atau perasaan penulis."],
          2, "C3", {"D": "MIS-CIRI-DIPAKAI-SEBAGAI-PENUTUP"}),
    ],
    "KOMP-ENG-7-WP-012": [
        Q("Complete: “My father ___ to the office every day.”",
          ["goes", "go", "going", "went"], "A",
          "Simple present dengan subjek tunggal orang ketiga (my father) menuntut akhiran -s/-es. “Went” bentuk lampau, tidak cocok dengan “every day”.",
          ["Perhatikan “every day” — ini kebiasaan. Subjeknya tunggal orang ketiga, jadi kata kerjanya berakhiran apa?"],
          2, "C2", {"B": "MIS-AKHIRAN-S-DILUPAKAN-PADA-ORANG-KETIGA", "D": "MIS-LAMPAU-DIPAKAI-UNTUK-KEBIASAAN"}),
        Q("Which sentence states a general fact?",
          ["Water boils at 100 degrees Celsius.", "I am reading a book now.", "She went to Bali last week.", "They will come tomorrow."], "A",
          "Fakta umum dinyatakan dengan simple present. Pilihan lain menyatakan kegiatan sekarang, masa lalu, atau masa depan.",
          ["Fakta yang selalu benar ditulis dalam bentuk apa?"],
          2, "C2", {"B": "MIS-PRESENT-CONTINUOUS-DIANGGAP-FAKTA-UMUM"}),
        Q("Choose the correct negative sentence.",
          ["She does not like durian.", "She do not like durian.", "She not like durian.", "She does not likes durian."], "A",
          "Bentuk negatif simple present orang ketiga memakai “does not” + kata kerja dasar. Akhiran -s sudah pindah ke “does”.",
          ["Sesudah “does not”, kata kerjanya kembali ke bentuk dasar."],
          3, "C2", {"B": "MIS-DO-DIPAKAI-UNTUK-ORANG-KETIGA", "D": "MIS-AKHIRAN-S-DIPAKAI-DUA-KALI"}),
        Q("Complete: “The sun ___ in the east.”",
          ["rises", "rise", "rose", "is rising"], "A",
          "Fakta alam yang selalu benar memakai simple present, dan subjeknya tunggal orang ketiga, jadi “rises”.",
          ["Ini kebenaran yang selalu berlaku, bukan kejadian sekali."],
          1, "C1", {"C": "MIS-LAMPAU-DIPAKAI-UNTUK-FAKTA-ABADI"}),
    ],
    "KOMP-ENG-7-WP-021": [
        Q("Complete: “Yesterday I ___ to the market with my mother.”",
          ["went", "go", "goes", "gone"], "A",
          "“Yesterday” menandai masa lampau, jadi dipakai past tense: went. “Gone” adalah past participle, tidak berdiri sendiri sebagai kata kerja utama.",
          ["Kata “yesterday” menentukan bentuk waktunya."],
          1, "C1", {"B": "MIS-BENTUK-DASAR-DIPAKAI-UNTUK-LAMPAU", "D": "MIS-PAST-PARTICIPLE-DIPAKAI-TANPA-HAVE"}),
        Q("Which sentence is in the past tense?",
          ["We watched a movie last night.", "We watch a movie every Sunday.", "We are watching a movie.", "We will watch a movie."], "A",
          "Akhiran -ed pada “watched” dan penanda “last night” menunjukkan lampau.",
          ["Cari kata kerja berakhiran -ed atau penanda waktu lampau."],
          2, "C2", {"B": "MIS-KEBIASAAN-DIANGGAP-KEJADIAN-LAMPAU", "C": "MIS-CONTINUOUS-DIANGGAP-LAMPAU"}),
        Q("Complete: “She ___ her homework before dinner.”",
          ["finished", "finish", "finishes", "finishing"], "A",
          "Kejadian yang sudah selesai di masa lampau memakai past tense: finished.",
          ["Kalimat menceritakan kejadian yang sudah selesai."],
          2, "C2", {"C": "MIS-PRESENT-ORANG-KETIGA-DIPAKAI-UNTUK-LAMPAU"}),
        Q("Which past form is IRREGULAR?",
          ["ate", "played", "watched", "visited"], "A",
          "“Eat” berubah menjadi “ate” tanpa akhiran -ed, jadi ia irregular. Tiga lainnya beraturan dengan -ed.",
          ["Bentuk lampau beraturan berakhiran -ed. Mana yang tidak?"],
          3, "C4", {"B": "MIS-SEMUA-BENTUK-LAMPAU-DIANGGAP-BERATURAN"}),
    ],
    "KOMP-ENG-7-WP-022": [
        Q("Make it negative: “He called me last night.”",
          ["He did not call me last night.", "He did not called me last night.", "He not called me last night.", "He does not call me last night."], "A",
          "Negatif lampau memakai “did not” + kata kerja DASAR. Penanda lampau sudah dibawa “did”, jadi “called” kembali ke “call”.",
          ["Sesudah “did not”, kata kerjanya kembali ke bentuk dasar."],
          3, "C2", {"B": "MIS-LAMPAU-DITULIS-DUA-KALI", "D": "MIS-DOES-DIPAKAI-UNTUK-LAMPAU"}),
        Q("Make it a question: “They finished the project.”",
          ["Did they finish the project?", "Did they finished the project?", "Do they finish the project?", "They did finish the project?"], "A",
          "Pertanyaan lampau: Did + subjek + kata kerja dasar. Bentuk lampau hanya muncul sekali, pada “did”.",
          ["Bentuk lampau hanya boleh muncul satu kali dalam kalimat tanya."],
          3, "C2", {"B": "MIS-LAMPAU-DITULIS-DUA-KALI"}),
        Q("Complete: “___ you go to school yesterday?”",
          ["Did", "Do", "Does", "Are"], "A",
          "Pertanyaan lampau diawali “Did” apa pun subjeknya.",
          ["Kata “yesterday” menentukan bentuk waktunya, dan pertanyaan lampau selalu diawali kata yang sama."],
          2, "C2", {"B": "MIS-DO-DIPAKAI-UNTUK-LAMPAU"}),
        Q("Which answer is correct for: “Did she come to the party?”",
          ["No, she did not.", "No, she does not.", "No, she is not.", "No, she not come."], "A",
          "Jawaban pendek mengikuti kata bantu pertanyaannya: did → did not.",
          ["Jawaban pendek memakai kata bantu yang sama dengan pertanyaannya."],
          2, "C2", {"B": "MIS-KATA-BANTU-TIDAK-COCOK-DENGAN-PERTANYAAN"}),
    ],
}

# ==========================================================================
# GELOMBANG 2: BAHASA INGGRIS KELAS 8
# ==========================================================================
# Tiap butir menempel pada MATERI AJAR kompetensinya, bukan pada topik umum kelas 8.
# Soal yang tidak menguji materinya sendiri membuat penguasaan terlihat naik-turun tanpa
# sebab, dan Braincore memilih latihan berikutnya dari angka yang keliru itu.
SOAL_ENG8: dict[str, list[dict]] = {
    "KOMP-ENG-8-LS-011": [
        Q("Your friend suddenly drops her books. You say: “I ___ help you!”",
          ["will", "am going to", "was going to", "would"], "A",
          "Keputusan yang diambil SEKETIKA memakai “will”. “Be going to” untuk rencana yang sudah disusun sebelumnya.",
          ["Apakah kamu sudah merencanakan ini sebelum bukunya jatuh, atau memutuskan saat itu juga?"],
          2, "C2", {"B": "MIS-BE-GOING-TO-DIPAKAI-UNTUK-KEPUTUSAN-SPONTAN"}),
        Q("Complete: “I have bought the ticket. I ___ watch the concert tomorrow.”",
          ["am going to", "will", "was", "would"], "A",
          "Tiketnya sudah dibeli, jadi rencananya sudah disusun sebelumnya — dipakai “be going to”.",
          ["Ada tanda bahwa rencana ini sudah disiapkan. Bentuk mana yang menandai rencana?"],
          3, "C3", {"B": "MIS-WILL-DIPAKAI-UNTUK-RENCANA-YANG-SUDAH-DISUSUN"}),
        Q("Look at the dark clouds. Which sentence is the best prediction?",
          ["It is going to rain.", "It rains.", "It rained.", "It would rain."], "A",
          "Prediksi dengan bukti yang terlihat sekarang memakai “be going to”.",
          ["Ada bukti yang bisa dilihat. Prediksi berbukti memakai bentuk yang mana?"],
          3, "C3", {"B": "MIS-SIMPLE-PRESENT-DIPAKAI-UNTUK-PREDIKSI"}),
        Q("Which sentence is grammatically correct?",
          ["She is going to join the English club.", "She is going to joins the English club.", "She going to join the English club.", "She will to join the English club."], "A",
          "Pola: be + going to + kata kerja DASAR. “To be” tidak boleh hilang, dan “will” tidak diikuti “to”.",
          ["Sesudah “going to” kata kerjanya bentuk dasar, dan “to be” harus ada."],
          2, "C2", {"B": "MIS-AKHIRAN-S-DITAMBAHKAN-SESUDAH-TO", "C": "MIS-TO-BE-DIHILANGKAN", "D": "MIS-WILL-DIIKUTI-TO"}),
    ],
    "KOMP-ENG-8-LS-012": [
        Q("Which sentence is an INVITATION?",
          ["Would you like to come to my party?", "I came to your party.", "The party was great.", "She likes parties."], "A",
          "“Would you like to …?” adalah pola mengajak. Tiga kalimat lain menceritakan, bukan mengajak.",
          ["Ajakan selalu ditujukan kepada lawan bicara dan menawarkan sesuatu."],
          1, "C1", {}),
        Q("Someone says: “Let's study together tonight.” Which reply ACCEPTS the invitation?",
          ["Sure, I'd love to.", "Sorry, I can't.", "Maybe next time.", "I don't think so."], "A",
          "“Sure, I'd love to.” menerima ajakan. Tiga pilihan lain menolak dengan halus.",
          ["Mana yang menyatakan kesediaan, bukan penolakan?"],
          1, "C1", {"C": "MIS-PENOLAKAN-HALUS-DIBACA-SEBAGAI-PENERIMAAN"}),
        Q("Complete the polite refusal: “Sorry, I can't. I ___ my little brother tonight.”",
          ["have to look after", "look", "am looking", "looked"], "A",
          "Penolakan sopan biasanya disertai alasan berupa kewajiban: “have to …”.",
          ["Penolakan yang sopan menyebut alasan. Bentuk mana yang menyatakan kewajiban?"],
          3, "C3", {}),
        Q("Which invitation is the MOST polite?",
          ["Would you like to join us for lunch?", "Join us.", "You come with us.", "Lunch now."], "A",
          "Bentuk pertanyaan dengan “would you like” memberi ruang menolak, dan itulah yang membuatnya sopan.",
          ["Ajakan yang sopan memberi ruang bagi lawan bicara untuk menolak."],
          2, "C4", {"B": "MIS-PERINTAH-DIANGGAP-AJAKAN-SOPAN"}),
    ],
    "KOMP-ENG-8-LS-021": [
        Q("Which sentence uses an IMPERATIVE correctly?",
          ["Pour the water into the glass.", "You pouring the water.", "The water is poured by you.", "Pouring the water."], "A",
          "Kalimat perintah dimulai dengan kata kerja dasar tanpa subjek: Pour …",
          ["Kalimat perintah tidak memakai subjek dan dimulai dengan kata kerja dasar."],
          1, "C1", {"C": "MIS-PASIF-DIPAKAI-SEBAGAI-PERINTAH"}),
        Q("Put in order: (1) Next, add sugar. (2) First, boil the water. (3) Finally, stir it well.",
          ["2 – 1 – 3", "1 – 2 – 3", "2 – 3 – 1", "3 – 1 – 2"], "A",
          "Penanda urutan menentukan susunannya: first, next, finally.",
          ["Baca penanda urutan di awal tiap kalimat."],
          2, "C3", {}),
        Q("Which word does NOT show sequence?",
          ["Because", "First", "Next", "After that"], "A",
          "“Because” menyatakan sebab, bukan urutan. Tiga lainnya penanda urutan.",
          ["Satu kata menjelaskan ALASAN, bukan urutan langkah."],
          2, "C4", {}),
        Q("When explaining how to make tea, which part comes FIRST?",
          ["The goal: how to make a cup of tea", "The steps", "The result", "The materials you used yesterday"], "A",
          "Penjelasan langkah dimulai dari tujuan, lalu alat/bahan, lalu langkah-langkahnya.",
          ["Pendengar perlu tahu APA yang akan dibuat sebelum mendengar caranya."],
          2, "C2", {"B": "MIS-LANGKAH-DIMULAI-TANPA-MENYEBUT-TUJUAN"}),
    ],
    "KOMP-ENG-8-LS-022": [
        Q("You did not hear your teacher clearly. What do you say?",
          ["Sorry, could you repeat that?", "I know.", "Yes, of course.", "That is wrong."], "A",
          "Meminta pengulangan secara sopan memakai “Sorry, could you repeat that?”.",
          ["Kamu perlu MEMINTA pengulangan, bukan menanggapi isinya."],
          1, "C1", {}),
        Q("Your friend explains a plan. To check that you understand, you say:",
          ["Do you mean we meet at seven?", "I don't care.", "Say it again and again.", "That is not important."], "A",
          "“Do you mean …?” memastikan pemahaman dengan menyebut ulang isinya — itulah klarifikasi.",
          ["Klarifikasi mengulang ISI yang kamu tangkap untuk dicek, bukan sekadar minta diulang."],
          2, "C2", {"C": "MIS-MEMINTA-PENGULANGAN-DIANGGAP-KLARIFIKASI-ISI"}),
        Q("Which sentence is a PARAPHRASE to check understanding?",
          ["So, we should bring our own pencils, right?", "Please repeat.", "I did not listen.", "Speak louder."], "A",
          "Parafrasa menyebut ulang isi dengan kata sendiri lalu meminta konfirmasi (“right?”).",
          ["Parafrasa menyebut ulang isinya dengan kata-katamu sendiri."],
          3, "C3", {}),
        Q("Why is clarifying important in a conversation?",
          ["It prevents misunderstanding before it causes problems", "It makes the conversation longer", "It shows you are not listening", "It ends the conversation"], "A",
          "Klarifikasi menangkap salah paham saat masih murah diperbaiki, sebelum berakibat.",
          ["Apa yang terjadi kalau salah paham TIDAK diperiksa lebih awal?"],
          2, "C4", {}),
    ],
    "KOMP-ENG-8-RV-011": [
        Q("What is the purpose of a procedure text?",
          ["To tell how to do or make something", "To describe a person", "To tell a past experience", "To argue an opinion"], "A",
          "Teks prosedur bertujuan memberi petunjuk cara melakukan atau membuat sesuatu.",
          ["Lihat nama jenis teksnya: prosedur berarti langkah."],
          1, "C1", {"C": "MIS-TUJUAN-RECOUNT-DIPAKAI-UNTUK-PROSEDUR"}),
        Q("Which part of a procedure text lists what you need?",
          ["Materials", "Goal", "Steps", "Resolution"], "A",
          "Bagian materials menyebut alat dan bahan. Goal menyebut tujuan, steps langkahnya.",
          ["Bagian mana yang menyebut alat dan bahan sebelum mengerjakan?"],
          1, "C1", {}),
        Q("Read: “How to Make Fried Rice.” Which part of the text is this?",
          ["The goal", "The materials", "The steps", "The conclusion"], "A",
          "Judul yang menyebut apa yang akan dibuat adalah bagian goal.",
          ["Bagian ini menyebut APA yang akan dibuat, belum caranya."],
          2, "C2", {}),
        Q("Which language feature is typical in a procedure text?",
          ["Imperative verbs", "Past tense verbs", "Comparative adjectives", "Direct speech"], "A",
          "Teks prosedur banyak memakai kata kerja perintah: cut, add, stir.",
          ["Bahasa apa yang dipakai saat menyuruh orang melakukan langkah?"],
          2, "C2", {"B": "MIS-CIRI-RECOUNT-DIPAKAI-UNTUK-PROSEDUR"}),
    ],
    "KOMP-ENG-8-RV-012": [
        Q("You see a notice: “KEEP OFF THE GRASS”. What does it mean?",
          ["Do not walk on the grass", "Cut the grass", "The grass is for sale", "Plant more grass"], "A",
          "“Keep off” berarti jangan menginjak atau memasuki area itu.",
          ["“Keep off” adalah larangan mendekat atau menginjak."],
          1, "C1", {"B": "MIS-KEEP-OFF-DIARTIKAN-MERAWAT"}),
        Q("A notice “NO PARKING” in front of a hospital gate is intended for:",
          ["Drivers", "Doctors only", "Patients only", "Children"], "A",
          "Larangan parkir ditujukan kepada siapa pun yang mengemudikan kendaraan.",
          ["Siapa yang melakukan tindakan “parking”?"],
          2, "C4", {"B": "MIS-SASARAN-DIBATASI-PADA-ORANG-DI-TEMPAT-ITU"}),
        Q("Read the label: “Store in a cool, dry place.” What should you do?",
          ["Keep it away from heat and moisture", "Put it in the freezer", "Leave it in the rain", "Warm it before use"], "A",
          "“Cool and dry” berarti sejuk dan kering — bukan beku, dan bukan lembap.",
          ["“Cool” tidak sama dengan beku; “dry” berarti tidak lembap."],
          3, "C3", {"B": "MIS-COOL-DIARTIKAN-BEKU"}),
        Q("An announcement says: “The library will be closed on Friday for cleaning.” What is the purpose?",
          ["To inform readers about a schedule change", "To invite readers to clean", "To sell books", "To describe the library"], "A",
          "Pengumuman itu memberi tahu perubahan jadwal, bukan mengajak atau menggambarkan.",
          ["Pengumuman menyampaikan informasi yang perlu diketahui orang banyak."],
          2, "C2", {"B": "MIS-INFORMASI-DIBACA-SEBAGAI-AJAKAN"}),
    ],
    "KOMP-ENG-8-RV-021": [
        Q("Which part of a narrative introduces the characters and setting?",
          ["Orientation", "Complication", "Resolution", "Coda"], "A",
          "Orientation memperkenalkan tokoh, tempat, dan waktu sebelum masalah muncul.",
          ["Bagian mana yang memperkenalkan siapa dan di mana?"],
          1, "C1", {"B": "MIS-COMPLICATION-DIANGGAP-PEMBUKA"}),
        Q("Read: “Suddenly, a big dog appeared and blocked their way.” Which part is this?",
          ["Complication", "Orientation", "Resolution", "Description"], "A",
          "Munculnya masalah yang mengganggu jalan cerita adalah complication.",
          ["Bagian ini memunculkan MASALAH, bukan memperkenalkan atau menyelesaikan."],
          2, "C2", {"C": "MIS-MASALAH-DIANGGAP-PENYELESAIAN"}),
        Q("A narrative without a complication would be:",
          ["Not really a story, because nothing happens", "Better, because it is peaceful", "A procedure text", "A descriptive text"], "A",
          "Konflik adalah penggerak cerita. Tanpa masalah, tidak ada yang perlu diselesaikan.",
          ["Apa yang membuat pembaca ingin tahu kelanjutan cerita?"],
          3, "C4", {}),
        Q("Read: “At last, they found the way home and arrived safely.” Which part is this?",
          ["Resolution", "Orientation", "Complication", "Materials"], "A",
          "Masalah selesai dan cerita ditutup — itu resolution.",
          ["Bagian ini menyelesaikan masalah yang muncul sebelumnya."],
          1, "C1", {}),
    ],
    "KOMP-ENG-8-RV-022": [
        Q("Complete: “While she ___ in the forest, she saw a fox.”",
          ["was walking", "walks", "walked", "will walk"], "A",
          "Past continuous (was/were + V-ing) dipakai sebagai LATAR kejadian lain yang tiba-tiba muncul.",
          ["Kejadian mana yang sedang berlangsung, dan mana yang tiba-tiba muncul?"],
          2, "C2", {"C": "MIS-SIMPLE-PAST-DIPAKAI-UNTUK-LATAR-BERKELANJUTAN"}),
        Q("Read: “They were cooking when the lights went out.” What happened FIRST?",
          ["They started cooking", "The lights went out", "Both started together", "The text does not say"], "A",
          "Kegiatan dalam past continuous (cooking) sudah berlangsung ketika kejadian mendadak (lights went out) terjadi.",
          ["Bentuk continuous menandai kegiatan yang SUDAH berlangsung lebih dulu."],
          3, "C3", {"B": "MIS-KEJADIAN-MENDADAK-DIANGGAP-TERJADI-LEBIH-DULU"}),
        # Stem WAJIB khas per butir. Versi pertama memakai "Choose the correct sentence."
        # yang sudah dipakai KOMP-ENG-7-LS-012, dan karena penyemai membuang duplikat
        # berdasarkan stem, butir ini TIDAK PERNAH MASUK - tanpa satu pun galat.
        Q("Choose the correct past continuous sentence.",
          ["I was reading a book at eight last night.", "I was read a book at eight last night.", "I were reading a book at eight last night.", "I am reading a book at eight last night."], "A",
          "Subjek “I” memakai “was”, lalu kata kerja ber-ing: was reading.",
          ["Cocokkan was/were dengan subjeknya, lalu pastikan kata kerjanya ber-ing."],
          2, "C2", {"B": "MIS-VERB-ING-DIGANTI-BENTUK-DASAR", "C": "MIS-WERE-DIPAKAI-UNTUK-I"}),
        Q("Which sentence shows TWO actions happening at the same time in the past?",
          ["While I was studying, my sister was singing.", "I studied and then slept.", "I will study tonight.", "I study every day."], "A",
          "Dua past continuous yang dihubungkan “while” menandai dua kegiatan berbarengan.",
          ["Cari kalimat dengan dua kegiatan yang sama-sama sedang berlangsung."],
          3, "C4", {"B": "MIS-URUTAN-DIANGGAP-BERSAMAAN"}),
    ],
    "KOMP-ENG-8-WP-011": [
        Q("Which is the BEST step in a procedure text?",
          ["Cut the onions into small pieces.", "The onions are cut by someone.", "Maybe you can cut onions.", "Onions."], "A",
          "Langkah yang baik: satu kalimat perintah, kata kerja tindakan yang spesifik, tanpa subjek.",
          ["Langkah harus jelas dan bisa langsung dikerjakan tanpa menebak."],
          2, "C3", {"C": "MIS-LANGKAH-DITULIS-SEBAGAI-SARAN"}),
        Q("Rewrite as an imperative: “You should turn on the stove.”",
          ["Turn on the stove.", "Turning on the stove.", "The stove is turned on.", "You turning on the stove."], "A",
          "Imperative membuang subjek dan modal, menyisakan kata kerja dasar.",
          ["Buang “you should”, sisakan kata kerjanya."],
          2, "C3", {}),
        Q("Why should each step contain only ONE instruction?",
          ["So the reader does not miss any action", "To make the text longer", "To use more verbs", "Because it looks neat"], "A",
          "Satu langkah satu tindakan membuat pembaca tidak melewatkan bagian saat mengerjakan sambil membaca.",
          ["Bayangkan orang membaca sambil memasak. Apa yang terjadi kalau satu langkah berisi tiga perintah?"],
          3, "C4", {"D": "MIS-ALASAN-FUNGSIONAL-DIGANTI-ALASAN-ESTETIKA"}),
        Q("Which verb is the most SPECIFIC for a procedure step?",
          ["Chop", "Do", "Make", "Handle"], "A",
          "“Chop” menyebut tindakan yang tepat. “Do”, “make”, dan “handle” terlalu umum untuk diikuti.",
          ["Kata kerja mana yang membuat pembaca tahu persis gerakan apa yang harus dilakukan?"],
          3, "C4", {}),
    ],
    "KOMP-ENG-8-WP-012": [
        Q("Which materials list is written correctly?",
          ["2 eggs, 100 grams of flour, 1 cup of milk", "eggs, flour, milk (how many?)", "some things from the kitchen", "you need materials"], "A",
          "Daftar bahan menyebut JUMLAH dan satuannya, supaya hasilnya bisa diulang orang lain.",
          ["Daftar bahan harus bisa diikuti tanpa menebak takarannya."],
          2, "C3", {"B": "MIS-BAHAN-DISEBUT-TANPA-TAKARAN"}),
        Q("Complete: “First, wash the rice. ___, cook it for 20 minutes.”",
          ["Then", "Because", "But", "However"], "A",
          "“Then” menandai langkah berikutnya. Tiga lainnya menyatakan sebab atau pertentangan.",
          ["Kata penghubung mana yang menandai langkah berikutnya?"],
          1, "C1", {"C": "MIS-KONJUNGSI-PERTENTANGAN-DIPAKAI-UNTUK-URUTAN"}),
        Q("Which sequence of connectors is correct?",
          ["First – Then – After that – Finally", "Finally – First – Then – After that", "Then – Finally – First", "After that – Finally – First"], "A",
          "Urutannya dari pembuka sampai penutup: first, then, after that, finally.",
          ["Mulai dari penanda yang berarti pertama, akhiri dengan yang berarti terakhir."],
          2, "C2", {}),
        Q("Why do we write the materials BEFORE the steps?",
          ["So the reader can prepare everything first", "To make the text longer", "Because it is a rule without reason", "To hide the steps"], "A",
          "Bahan ditulis lebih dulu supaya pembaca tidak berhenti di tengah langkah karena ada yang belum disiapkan.",
          ["Apa yang terjadi kalau bahan baru diketahui saat langkah ketiga?"],
          3, "C4", {"C": "MIS-ATURAN-DIANGGAP-TANPA-ALASAN"}),
    ],
    "KOMP-ENG-8-WP-021": [
        Q("You are writing a story. Which sentence belongs to the ORIENTATION?",
          ["Once upon a time, a poor farmer lived in a small village.", "Suddenly, the bridge collapsed.", "Finally, they were safe at home.", "The moral is to be honest."], "A",
          "Orientation memperkenalkan tokoh, tempat, dan waktu di awal cerita.",
          ["Bagian pembuka memperkenalkan siapa dan di mana, belum ada masalah."],
          2, "C3", {"B": "MIS-COMPLICATION-DITARUH-DI-PEMBUKA"}),
        Q("Arrange the story parts: (1) They found the lost goat. (2) A goat disappeared from the farm. (3) A farmer lived with his family.",
          ["3 – 2 – 1", "1 – 2 – 3", "2 – 3 – 1", "3 – 1 – 2"], "A",
          "Orientation (3), complication (2), resolution (1).",
          ["Mulai dari perkenalan, lalu masalah, lalu penyelesaian."],
          2, "C3", {}),
        Q("A good resolution should:",
          ["Solve the problem in a way that makes sense", "Introduce a new problem", "Repeat the orientation", "List the materials"], "A",
          "Penyelesaian harus masuk akal dan benar-benar menjawab masalah yang dimunculkan.",
          ["Penyelesaian yang tiba-tiba tanpa alasan membuat pembaca merasa dibohongi."],
          3, "C4", {"B": "MIS-MASALAH-BARU-DIANGGAP-PENYELESAIAN"}),
        Q("Which sentence is the strongest COMPLICATION?",
          ["On the way home, they realised the map was missing.", "They walked home.", "The weather was nice.", "They had lunch."], "A",
          "Complication memunculkan masalah yang mengancam tujuan tokoh. Tiga lainnya kejadian biasa tanpa konflik.",
          ["Mana yang menimbulkan masalah bagi tokohnya?"],
          3, "C4", {}),
    ],
    "KOMP-ENG-8-WP-022": [
        # Opsi TIDAK BOLEH berbeda hanya pada tanda baca: validator menormalkan tanda baca
        # sebelum membandingkan, jadi empat kalimat yang hanya berbeda koma dan kutip
        # menjadi satu opsi yang sama empat kali. Keterampilan yang diuji tetap letak tanda
        # baca, tetapi pilihannya dibedakan lewat KATA, bukan lewat tanda baca itu sendiri.
        Q("Complete the direct speech: “I am lost___ said the boy.",
          ['," — koma di dalam tanda kutip penutup',
           '" — tanpa koma sama sekali',
           '." — titik di dalam tanda kutip penutup',
           ', — koma tanpa tanda kutip penutup'], "A",
          "Ucapan yang diikuti keterangan pembicara ditutup dengan KOMA, dan komanya berada di DALAM tanda kutip: “I am lost,” said the boy.",
          ["Ucapannya belum selesai sebagai kalimat penuh — masih ada “said the boy”. Tanda apa yang dipakai, dan di sisi mana tanda kutipnya?"],
          3, "C2", {"B": "MIS-KOMA-DIHILANGKAN", "C": "MIS-TITIK-DIPAKAI-PADAHAL-KALIMAT-BELUM-SELESAI", "D": "MIS-KUTIP-PENUTUP-DILUPAKAN"}),
        Q("Complete: “Where are you going?” ___ her mother.",
          ["asked", "said", "told", "spoke"], "A",
          "Kalimat langsung berupa pertanyaan dilaporkan dengan “asked”, bukan “said”.",
          ["Kalimat dalam kutipan itu pertanyaan. Kata kerja mana yang cocok?"],
          2, "C2", {"B": "MIS-SAID-DIPAKAI-UNTUK-PERTANYAAN"}),
        Q("Why do writers use direct speech in a story?",
          ["To make the characters feel alive", "To make the story shorter", "To avoid punctuation", "To replace the orientation"], "A",
          "Kalimat langsung menghadirkan suara tokoh apa adanya, sehingga terasa hidup.",
          ["Apa bedanya membaca “dia bilang dia takut” dengan membaca kata-katanya sendiri?"],
          2, "C4", {}),
        Q("Which punctuation mark goes INSIDE the quotation marks?",
          ["The comma or the full stop that ends the speech", "The name of the speaker", "Nothing at all", "Only the question mark of the whole sentence"], "A",
          "Tanda baca penutup ucapan berada di dalam tanda kutip, sebelum penutupnya.",
          ["Tanda baca yang mengakhiri ucapan itu bagian dari ucapannya."],
          4, "C2", {}),
    ],
}

SOAL.update(SOAL_ENG8)


async def seed_soal_bank(actor="seed-soal"):
    """Tulis butir yang belum ada. Idempoten lewat pencocokan `stem`."""
    dibuat = 0
    dilewati = 0
    tanpa_kompetensi: list[str] = []

    for komp_id, butir in SOAL.items():
        # Kompetensi WAJIB ada lebih dulu. Soal yang menunjuk kompetensi yang tidak ada
        # adalah soal yatim: ia masuk basis data, tidak pernah terambil sesi mana pun, dan
        # tidak ada yang merah karenanya. Dilaporkan, bukan didiamkan.
        komp = await db.curriculum_nodes.find_one({"id": komp_id, "type": "competency"}, {"_id": 0})
        if not komp:
            tanpa_kompetensi.append(komp_id)
            continue
        for row in butir:
            ada = await db.questions.find_one({"stem": row["stem"], "is_current": True}, {"_id": 0})
            if ada:
                dilewati += 1
                continue
            body = QuestionIn(
                competency_id=komp_id, stem=row["stem"], options=row["o"],
                answer_key=row["k"], explanation=row["e"], hints=row["h"],
                difficulty=row["d"], cognitive_level=row["cog"],
                distractor_misconceptions=row["dm"],
                misconception_id=(list(row["dm"].values()) or [None])[0],
                estimated_time=60 + 20 * row["d"],
                question_type="mcq", status="PUBLISHED", source="seed-soal")
            doc = await _dna(body, actor)
            doc["issues"] = await validate_doc(doc)
            await db.questions.insert_one(dict(doc))
            dibuat += 1

    return {"created": dibuat, "skipped_existing": dilewati,
            "competencies_covered": len(SOAL) - len(tanpa_kompetensi),
            "missing_competencies": tanpa_kompetensi,
            "note": "Bank soal gelombang 1: Bahasa Inggris Kelas 7. Semai kurikulum lebih dulu "
                    "kalau ada kompetensi yang dilaporkan hilang."}


@router.post("/soal")
async def seed_soal_route(u=Depends(teacher_user)):
    return await seed_soal_bank()


@router.get("/soal/status")
async def soal_status():
    total = await db.questions.count_documents({"is_current": True})
    terbit = await db.questions.count_documents({"is_current": True, "status": "PUBLISHED"})
    komp_total = await db.curriculum_nodes.count_documents({"type": "competency"})
    berisi = len(await db.questions.distinct("competency_id", {"is_current": True}))
    return {"seeded": terbit > 0, "questions": total, "published": terbit,
            "competencies_with_questions": berisi, "competencies_total": komp_total,
            "in_this_wave": sum(len(v) for v in SOAL.values())}
