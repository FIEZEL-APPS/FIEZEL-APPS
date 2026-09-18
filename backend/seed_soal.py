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
