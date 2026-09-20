import json
import os

tools_dir = r"c:\Users\hp\fiezel-apps\tools"

# 1. MATEMATIKA KELAS VII BAB 1: Bilangan Bulat
mat_b1 = {
    "code": "KOMP-MAT-D-7-BAB1-01",
    "grade": 7,
    "name": "Bilangan Bulat",
    "materi": "Operasi Penjumlahan & Pengurangan Bilangan Bulat, Perkalian & Pembagian, Faktor & Kelipatan (KPK/FPB), Penerapan Kontekstual Suhu/Kedalaman",
    "cpRef": "Matematika untuk SMP/MTs Kelas VII — Bab 1",
    "items": [
        {
            "id": "mat-d-7-b1-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 10-14), jika suhu puncak pegunungan pada malam hari adalah -5°C dan pada siang hari naik sebesar 12°C, maka suhu puncak pegunungan pada siang hari adalah…",
            "options": ["7°C", "-17°C", "17°C", "-7°C"],
            "answer": 0,
            "why": {"0": "Kenaikan suhu dihitung dengan penjumlahan bilangan bulat: (-5) + 12 = +7°C."},
            "distractorWhy": {
                "1": "Pengurangan (-5) - 12 = -17°C keliru karena kata 'naik' menunjukkan operasi penjumlahan.",
                "2": "Penjumlahan mutlak |-5| + 12 = 17°C mengabaikan tanda negatif suhu awal.",
                "3": "Hasil -7°C terjadi jika tanda operasi tertukar."
            }
        },
        {
            "id": "mat-d-7-b1-q02",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 18-20), hasil dari operasi perkalian (-8) × (-6) adalah…",
            "options": ["48", "-48", "14", "-14"],
            "answer": 0,
            "why": {"0": "Perkalian dua bilangan negatif menghasilkan bilangan positif: (-a) × (-b) = +(a × b) = 48."},
            "distractorWhy": {
                "1": "Hasil -48 keliru menganggap perkalian dua negatif menghasilkan negatif.",
                "2": "Nilai 14 terjadi akibat kesalahan mengira operasi sebagai penjumlahan.",
                "3": "Nilai -14 terjadi akibat kesalahan penjumlahan tanda."
            }
        },
        {
            "id": "mat-d-7-b1-q03",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 25-28), Kelipatan Persekutuan Terkecil (KPK) dari bilangan 12 dan 18 adalah…",
            "options": ["36", "6", "72", "54"],
            "answer": 0,
            "why": {"0": "Faktorisasi prima 12 = 2² × 3 dan 18 = 2 × 3². KPK mengalikan faktor prima pangkat tertinggi: 2² × 3² = 4 × 9 = 36."},
            "distractorWhy": {
                "1": "Angka 6 adalah FPB (Faktor Persekutuan Terbesar), bukan KPK.",
                "2": "Angka 72 adalah kelipatan bersama tetapi bukan kelipatan terkecil.",
                "3": "Angka 54 bukan kelipatan dari 12."
            }
        },
        {
            "id": "mat-d-7-b1-q04",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 30), seorang penyelam berada pada kedalaman 15 meter di bawah permukaan laut (-15 m). Penyelam tersebut kemudian menyelam lebih dalam sejauh 8 meter, lalu naik kembali sejauh 11 meter. Posisi akhir penyelam berada pada…",
            "options": ["12 meter di bawah permukaan laut (-12 m)", "32 meter di bawah permukaan laut (-32 m)", "4 meter di bawah permukaan laut (-4 m)", "18 meter di bawah permukaan laut (-18 m)"],
            "answer": 0,
            "why": {"0": "Posisi diawali dari -15 m. Menyelam lebih dalam ditambahkan (-8 m), lalu naik ditambahkan (+11 m): (-15) + (-8) + 11 = -23 + 11 = -12 m."},
            "distractorWhy": {
                "1": "Nilai -32 m terjadi jika semua perubahan dianggap menyelam lebih dalam.",
                "2": "Nilai -4 m keliru dalam perhitungan penjumlahan bertahap.",
                "3": "Nilai -18 m keliru memproses arah gerakan naik dan turun."
            }
        },
        {
            "id": "mat-d-7-b1-q05",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 35 Latihan 1.3), hasil dari bentuk campuran (-24) : 4 + (-5) × 3 adalah…",
            "options": ["-21", "3", "-33", "21"],
            "answer": 0,
            "why": {"0": "Operasi pembagian dan perkalian didahulukan daripada penjumlahan: (-24) : 4 = -6, dan (-5) × 3 = -15. Kemudian (-6) + (-15) = -21."},
            "distractorWhy": {
                "1": "Nilai 3 terjadi jika operasi dikerjakan dari kiri ke kanan tanpa hirarki matematika.",
                "2": "Nilai -33 terjadi karena kesalahan perkalian pertengahan.",
                "3": "Nilai 21 terjadi karena pengabaian tanda negatif pada kedua hasil."
            }
        },
        {
            "id": "mat-d-7-b1-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 40), dalam ujian matematika terdiri dari 30 soal, setiap jawaban benar diberi skor 4, salah diberi skor -2, dan tidak dijawab diberi skor 0. Jika Rian menjawab benar 22 soal dan salah 5 soal, total skor Rian adalah…",
            "options": ["78", "88", "68", "73"],
            "answer": 0,
            "why": {"0": "Skor benar: 22 × 4 = 88. Skor salah: 5 × (-2) = -10. Tidak dijawab (30 - 22 - 5 = 3): 3 × 0 = 0. Total skor: 88 + (-10) + 0 = 78."},
            "distractorWhy": {
                "1": "Nilai 88 hanya menghitung skor benar tanpa pengurangan jawaban salah.",
                "2": "Nilai 68 terjadi jika pengurangan skor salah dianggap -4 per soal.",
                "3": "Nilai 73 keliru dalam perhitungan perkalian nilai salah."
            }
        },
        {
            "id": "mat-d-7-b1-q07",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 44 Ayo Uji Kemampuan No. 5), lampu A menyala setiap 8 detik sekali, sedangkan lampu B menyala setiap 12 detik sekali. Jika kedua lampu menyala bersamaan pada pukul 10:00:00, pada pukul berapa kedua lampu akan menyala bersamaan kembali untuk kedua kalinya?",
            "options": ["10:00:48", "10:00:24", "10:01:36", "10:02:00"],
            "answer": 0,
            "why": {"0": "KPK dari 8 dan 12 adalah 24 detik. Lampu menyala bersamaan pertama kali pada detik ke-24 (10:00:24), dan menyala bersamaan untuk kedua kalinya pada 2 × 24 = 48 detik, yaitu pukul 10:00:48."},
            "distractorWhy": {
                "1": "Pukul 10:00:24 adalah saat kedua lampu menyala bersamaan untuk pertama kalinya (bukan kedua kalinya).",
                "2": "Pukul 10:01:36 adalah saat keempat kalinya (96 detik).",
                "3": "Pukul 10:02:00 tidak sesuai dengan kelipatan KPK 24 detik."
            }
        },
        {
            "id": "mat-d-7-b1-q08",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 48), Ibu memiliki 36 buah apel dan 48 buah jeruk yang akan dibagikan ke dalam kantong plastik dengan jumlah setiap buah sama banyak di setiap kantong tanpa sisa. Jumlah kantong plastik terbanyak yang dibutuhkan Ibu adalah…",
            "options": ["12 kantong", "6 kantong", "24 kantong", "144 kantong"],
            "answer": 0,
            "why": {"0": "Jumlah kantong terbanyak ditentukan oleh FPB dari 36 dan 48. Faktorisasi: 36 = 2² × 3², 48 = 2⁴ × 3. FPB = 2² × 3 = 4 × 3 = 12 kantong."},
            "distractorWhy": {
                "1": "Nilai 6 adalah faktor persekutuan tetapi bukan faktor persekutuan terbesar.",
                "2": "Nilai 24 bukan pembagi dari 36.",
                "3": "Nilai 144 adalah KPK dari 36 dan 48, bukan FPB pembagian kantong."
            }
        },
        {
            "id": "mat-d-7-b1-q09",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 52 Uji Kompetensi Bab 1), nilai dari ekspresi berpangkat (-3)⁴ - (-2)³ adalah…",
            "options": ["89", "73", "-73", "81"],
            "answer": 0,
            "why": {"0": "(-3)⁴ = +81 (pangkat genap). (-2)³ = -8 (pangkat ganjil). Maka (-3)⁴ - (-2)³ = 81 - (-8) = 81 + 8 = 89."},
            "distractorWhy": {
                "1": "Nilai 73 terjadi jika pengurangan (-8) dihitung sebagai 81 - 8.",
                "2": "Nilai -73 keliru pada perkalian tanda pemangkatan.",
                "3": "Nilai 81 hanya menghitung (-3)⁴ dan mengabaikan (-2)³."
            }
        },
        {
            "id": "mat-d-7-b1-q10",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 15), jika nilai a = -4, b = 3, dan c = -2, maka nilai dari ekspresi a × b - c adalah…",
            "options": ["-10", "-14", "10", "14"],
            "answer": 0,
            "why": {"0": "Substitusi nilai: (-4) × 3 - (-2) = -12 - (-2) = -12 + 2 = -10."},
            "distractorWhy": {
                "1": "Nilai -14 terjadi jika -12 dikurangi 2 alih-alih ditambah 2.",
                "2": "Nilai 10 terjadi akibat kesalahan tanda pada hasil (-4) × 3.",
                "3": "Nilai 14 terjadi akibat kesalahan tanda bertumpuk."
            }
        },
        {
            "id": "mat-d-7-b1-q11",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 8), sifat komutatif pada penjumlahan bilangan bulat ditunjukkan oleh persamaan…",
            "options": ["a + b = b + a", "(a + b) + c = a + (b + c)", "a × (b + c) = a × b + a × c", "a + 0 = a"],
            "answer": 0,
            "why": {"0": "Sifat komutatif adalah sifat pertukaran letak dua bilangan pada operasi penjumlahan/perkalian: a + b = b + a."},
            "distractorWhy": {
                "1": "(a + b) + c = a + (b + c) adalah sifat asosiatif (pengelompokan).",
                "2": "a × (b + c) = a × b + a × c adalah sifat distributif (penyebaran).",
                "3": "a + 0 = a adalah sifat identitas penjumlahan."
            }
        },
        {
            "id": "mat-d-7-b1-q12",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 22), urutan bilangan bulat berikut dari yang terkecil hingga terbesar adalah…",
            "options": ["-15, -8, -2, 0, 5, 9", "9, 5, 0, -2, -8, -15", "-2, -8, -15, 0, 5, 9", "0, -2, -8, -15, 5, 9"],
            "answer": 0,
            "why": {"0": "Pada garis bilangan, semakin ke kiri nilai bilangan semakin kecil. Maka -15 < -8 < -2 < 0 < 5 < 9."},
            "distractorWhy": {
                "1": "Urutan dari terbesar ke terkecil.",
                "2": "Urutan keliru menganggap -2 lebih kecil dari -15.",
                "3": "Pengurutan acak pada bagian negatif."
            }
        },
        {
            "id": "mat-d-7-b1-q13",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 55), kapal selam berada pada kedalaman 250 m di bawah laut. Kapal bergerak naik 80 m, lalu turun lagi 120 m. Jika posisi permukaan laut dianggap 0 m, posisi akhir kapal selam adalah…",
            "options": ["-290 m", "-210 m", "-450 m", "-90 m"],
            "answer": 0,
            "why": {"0": "Kedalaman awal = -250 m. Naik 80 m (+80), turun 120 m (-120). Posisi = -250 + 80 - 120 = -170 - 120 = -290 m."},
            "distractorWhy": {
                "1": "Nilai -210 m keliru pada perhitungan gerak turun.",
                "2": "Nilai -450 m menganggap semua perubahan sebagai gerakan turun.",
                "3": "Nilai -90 m keliru memproses tanda kedalaman awal."
            }
        },
        {
            "id": "mat-d-7-b1-q14",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 12), invers penjumlahan (lawan) dari bilangan -37 adalah…",
            "options": ["37", "-37", "1/37", "-1/37"],
            "answer": 0,
            "why": {"0": "Invers penjumlahan dari suatu bilangan a adalah -a sehingga a + (-a) = 0. Lawan dari -37 adalah +37."},
            "distractorWhy": {
                "1": "Bilangan -37 adalah bilangan itu sendiri.",
                "2": "Nilai 1/37 adalah invers perkalian (kebalikan), bukan invers penjumlahan.",
                "3": "Nilai -1/37 adalah kebalikan negatif."
            }
        },
        {
            "id": "mat-d-7-b1-q15",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 38), toko grosir menerima pasokan 15 dus mie instan. Setiap dus berisi 40 bungkus mie. Jika mie tersebut dibagikan secara merata kepada 25 panti asuhan, banyak bungkus mie yang diterima tiap panti asuhan adalah…",
            "options": ["24 bungkus", "20 bungkus", "30 bungkus", "15 bungkus"],
            "answer": 0,
            "why": {"0": "Total mie instan = 15 × 40 = 600 bungkus. Mie per panti asuhan = 600 : 25 = 24 bungkus."},
            "distractorWhy": {
                "1": "Nilai 20 bungkus keliru pada pembagian akhir 600 : 25.",
                "2": "Nilai 30 bungkus keliru perkalian total bungkus.",
                "3": "Nilai 15 bungkus hanya mengambil angka jumlah dus."
            }
        },
        {
            "id": "mat-d-7-b1-q16",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 60 Uji Kemampuan), nilai dari (12 + (-8)) × (-5) : (-2) adalah…",
            "options": ["10", "-10", "50", "-50"],
            "answer": 0,
            "why": {"0": "Hitung dalam kurung: 12 + (-8) = 4. Lalu perkalian: 4 × (-5) = -20. Lalu pembagian: (-20) : (-2) = +10."},
            "distractorWhy": {
                "1": "Nilai -10 terjadi jika pembagian dua negatif dihitung sebagai negatif.",
                "2": "Nilai 50 terjadi karena kesalahan hasil penjumlahan dalam kurung.",
                "3": "Nilai -50 terjadi akibat kesalahan tanda ganda."
            }
        }
    ]
}

with open(os.path.join(tools_dir, "chunk_mat_7_b1.json"), "w", encoding="utf-8") as f:
    json.dump(mat_b1, f, indent=2, ensure_ascii=False)

print("chunk_mat_7_b1.json created successfully with 16 authentic items.")
