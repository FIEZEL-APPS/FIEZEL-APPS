import json
import os

tools_dir = r"c:\Users\hp\fiezel-apps\tools"

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# 1. IPA KELAS VIII BAB 3: Usaha, Energi, dan Pesawat Sederhana
ipa8_b3 = {
    "code": "KOMP-IPA-D-8-BAB3-01",
    "grade": 8,
    "name": "Usaha, Energi, dan Pesawat Sederhana",
    "materi": "Konsep Usaha & Energi, Energi Kinetik & Potensial, Keuntungan Mekanis Pesawat Sederhana (Tuas, Katrol, Bidang Miring)",
    "cpRef": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi)",
    "items": [
        {
            "id": "ipa-d-8-b3-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 92-95), besarnya usaha (W) yang dilakukan oleh suatu gaya (F) untuk memindahkan benda sejauh perpindahan (s) dirumuskan sebagai…",
            "options": ["W = F × s", "W = F / s", "W = m × g", "W = F + s"],
            "answer": 0,
            "why": {"0": "Usaha secara fisis adalah hasil kali antara gaya yang searah dengan arah perpindahan benda: W = F × s."},
            "distractorWhy": {"1": "Pembagian F/s keliru.", "2": "m × g adalah rumus gaya berat (w).", "3": "Penjumlahan F + s keliru."}
        },
        {
            "id": "ipa-d-8-b3-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 98), sebuah balok didorong dengan gaya sebesar 50 N sehingga berpindah sejauh 4 meter. Usaha yang dilakukan pada balok tersebut adalah…",
            "options": ["200 Joule", "12,5 Joule", "54 Joule", "20 Joule"],
            "answer": 0,
            "why": {"0": "W = F × s = 50 N × 4 m = 200 Joule."},
            "distractorWhy": {"1": "50 / 4 = 12,5 J.", "2": "50 + 4 = 54 J.", "3": "50 - 4 = 46 J."}
        },
        {
            "id": "ipa-d-8-b3-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 102 Energi Potensial), buah kelapa bermassa 2 kg berada pada ketinggian 10 meter di atas tanah. Jika percepatan gravitasi bumi g = 10 m/s², energi potensial gravitasinya adalah…",
            "options": ["200 Joule", "20 Joule", "100 Joule", "50 Joule"],
            "answer": 0,
            "why": {"0": "Ep = m × g × h = 2 kg × 10 m/s² × 10 m = 200 Joule."},
            "distractorWhy": {"1": "2 × 10 = 20 J.", "2": "2 × 10 × 5 = 100 J.", "3": "200 / 4 = 50 J."}
        },
        {
            "id": "ipa-d-8-b3-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 108 Tuas/Pengungkit), sebuah linggis digunakan untuk mengangkat batu seberat 600 N. Jika lengan beban 0,5 m dan lengan kuasa 1,5 m, gaya kuasa minimum yang diperlukan adalah…",
            "options": ["200 N", "1800 N", "300 N", "1200 N"],
            "answer": 0,
            "why": {"0": "Prinsip tuas: w × lb = F × lk => F = (w × lb) / lk = (600 × 0,5) / 1,5 = 300 / 1,5 = 200 N."},
            "distractorWhy": {"1": "600 × 3 = 1800 N.", "2": "600 × 0,5 = 300 N.", "3": "600 × 2 = 1200 N."}
        },
        {
            "id": "ipa-d-8-b3-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 112 Bidang Miring), bidang miring memudahkan pekerjaan manusia karena…",
            "options": ["Memperkecil gaya kuasa yang dibutuhkan untuk memindahkan benda ke tempat yang lebih tinggi", "Mengurangi total usaha yang dilakukan menjadi nol", "Memperpendek lintasan perpindahan benda", "Menghilangkan gaya gesek secara sempurna"],
            "answer": 0,
            "why": {"0": "Bidang miring memperpanjang lintasan sehingga gaya dorong/tarik (kuasa) yang diperlukan menjadi lebih kecil."},
            "distractorWhy": {"1": "Usaha total tetap sama.", "2": "Lintasan bidang miring justru lebih panjang.", "3": "Gaya gesek tidak dihilangkan."}
        },
        {
            "id": "ipa-d-8-b3-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 115 Katrol), keuntungan mekanis dari sebuah katrol tetap tunggal yang digunakan untuk menimba air di sumur adalah…",
            "options": ["1", "2", "3", "4"],
            "answer": 0,
            "why": {"0": "Katrol tetap tunggal memiliki keuntungan mekanis KM = 1 (hanya mengubah arah gaya)."},
            "distractorWhy": {"1": "KM = 2 adalah milik katrol bebas tunggal.", "2": "KM = 3 milik sistem katrol 3 tali.", "3": "KM = 4 milik sistem katrol 4 tali."}
        },
        {
            "id": "ipa-d-8-b3-q07",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 118 Energi Kinetik), benda bermassa 4 kg bergerak dengan kecepatan v = 5 m/s. Energi kinetik benda tersebut adalah…",
            "options": ["50 Joule", "100 Joule", "20 Joule", "10 Joule"],
            "answer": 0,
            "why": {"0": "Ek = 1/2 × m × v² = 1/2 × 4 kg × (5 m/s)² = 2 × 25 = 50 Joule."},
            "distractorWhy": {"1": "4 × 25 = 100 J.", "2": "4 × 5 = 20 J.", "3": "1/2 × 4 × 5 = 10 J."}
        },
        {
            "id": "ipa-d-8-b3-q08",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 120), pesawat sederhana yang prinsip kerjanya berdasarkan roda berporos contohnya adalah…",
            "options": ["Roda gigi (gear) pada sepeda balap", "Tang pemotong kawat", "Pisau dapur dapur", "Papan seluncur anak-anak"],
            "answer": 0,
            "why": {"0": "Roda gigi sepeda menggunakan prinsip roda berporos untuk mengubah laju putaran dan gaya mekanis."},
            "distractorWhy": {"1": "Tang adalah pengungkit jenis I.", "2": "Pisau adalah bidang miring.", "3": "Papan seluncur adalah bidang miring."}
        },
        {
            "id": "ipa-d-8-b3-q09",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 122), alat berikut yang memanfaatkan prinsip tuas jenis pertama (titik tumpu berada di antara titik beban dan titik kuasa) adalah…",
            "options": ["Gunting kertas dan jungkit-jungkit", "Gerobak dorong roda satu", "Pinset alis", "Pemotong kertas guilotik"],
            "answer": 0,
            "why": {"0": "Gunting memiliki engsel (tumpu) di tengah antara pegangan (kuasa) dan mata gunting (beban)."},
            "distractorWhy": {"1": "Gerobak roda satu adalah tuas jenis II (beban di tengah).", "2": "Pinset adalah tuas jenis III (kuasa di tengah).", "3": "Pemotong kertas adalah tuas jenis II."}
        },
        {
            "id": "ipa-d-8-b3-q10",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 126), keuntungan mekanis bidang miring sepanjang s = 6 meter dengan ketinggian h = 2 meter adalah…",
            "options": ["3", "12", "0,33", "4"],
            "answer": 0,
            "why": {"0": "KM bidang miring = s / h = 6 m / 2 m = 3."},
            "distractorWhy": {"1": "6 × 2 = 12.", "2": "2 / 6 = 0,33.", "3": "6 - 2 = 4."}
        },
        {
            "id": "ipa-d-8-b3-q11",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 100), hukum kekekalan energi mekanik menyatakan bahwa…",
            "options": ["Energi tidak dapat diciptakan dan tidak dapat dimusnahkan, tetapi hanya dapat berubah bentuk dari satu energi ke energi lain", "Energi mekanik selalu berkurang akibat adanya gaya gravitasi", "Energi potensial selalu bernilai sama dengan nol saat benda diam", "Energi kinetik hanya ada pada benda bernyawa"],
            "answer": 0,
            "why": {"0": "Hukum Kekekalan Energi menyatakan energi alam semesta konstan dan berubah bentuk."},
            "distractorWhy": {"1": "Energi mekanik konstan jika tak ada gesekan.", "2": "Ep = mgh tergantung ketinggian.", "3": "Energi kinetik ada pada semua benda bergerak."}
        },
        {
            "id": "ipa-d-8-b3-q12",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 110), tuas jenis kedua ditandai oleh posisi…",
            "options": ["Beban berada di antara titik tumpu dan titik kuasa", "Titik tumpu di antara beban dan kuasa", "Titik kuasa di antara tumpu dan beban", "Titik tumpu dan beban menyatu"],
            "answer": 0,
            "why": {"0": "Tuas jenis II menempatkan beban di tengah (misal gerobak roda satu, pembuka tutup botol)."},
            "distractorWhy": {"1": "Tuas jenis I.", "2": "Tuas jenis III.", "3": "Tidak sesuai jenis tuas."}
        }
    ]
}
save_json(os.path.join(tools_dir, "chunk_ipa_8_b3.json"), ipa8_b3)

# 2. IPA KELAS VIII BAB 4: Tekanan
ipa8_b4 = {
    "code": "KOMP-IPA-D-8-BAB4-01",
    "grade": 8,
    "name": "Tekanan",
    "materi": "Tekanan Zat Padat & Hidrostatis, Hukum Archimedes & Pascal, Tekanan Gas/Udara, Aplikasi pada Makhluk Hidup",
    "cpRef": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi)",
    "items": [
        {
            "id": "ipa-d-8-b4-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 132-135), faktor-faktor yang mempengaruhi besarnya tekanan (P) pada zat padat adalah…",
            "options": ["Gaya tekan (F) dan luas bidang tekan (A)", "Massa jenis dan suhu ruangan", "Volume benda dan warna permukaan", "Ketinggian dan kecepatan gerak"],
            "answer": 0,
            "why": {"0": "Tekanan zat padat berbanding lurus dengan gaya tekan F dan berbanding terbalik dengan luas A: P = F / A."},
            "distractorWhy": {"1": "Suhu bukan faktor langsung zat padat.", "2": "Warna tidak mempengaruhi tekanan.", "3": "Kecepatan gerak bukan faktor P = F/A."}
        },
        {
            "id": "ipa-d-8-b4-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 138), sepatu hak tinggi (high heels) menimbulkan tekanan yang lebih besar pada tanah dibanding sepatu sol datar karena…",
            "options": ["Luas permukaan bidang tekan ujung hak sangat kecil sehingga tekanan menjadi besar", "Massa orang yang memakai hak tinggi bertambah secara drastis", "Gaya gravitasi bekerja lebih kuat pada hak tinggi", "Bahan sepatu terbuat dari logam berat"],
            "answer": 0,
            "why": {"0": "Semakin kecil luas bidang tekan A, semakin besar nilai tekanan P yang dihasilkan."},
            "distractorWhy": {"1": "Massa orang tetap sama.", "2": "Gaya gravitasi tidak berubah.", "3": "Bahan sepatu tidak merubah konsep P = F/A."}
        },
        {
            "id": "ipa-d-8-b4-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 142 Tekanan Hidrostatis), besarnya tekanan hidrostatis di dalam zat cair dipengaruhi oleh…",
            "options": ["Massa jenis zat cair (rho), percepatan gravitasi (g), dan kedalaman (h)", "Bentuk wadah penampung air", "Luas permukaan bagian atas tempat air", "Warna zat cair"],
            "answer": 0,
            "why": {"0": "P_hidrostatis = rho × g × h (makin dalam h, makin besar tekanan)."},
            "distractorWhy": {"1": "Bentuk wadah tidak mempengaruhi (bejana berhubungan).", "2": "Luas permukaan tidak masuk rumus.", "3": "Warna zat cair irrelevan."}
        },
        {
            "id": "ipa-d-8-b4-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 148 Hukum Archimedes), sebuah benda melayang di dalam air jika…",
            "options": ["Massa jenis benda sama dengan massa jenis air (rho_benda = rho_air)", "Massa jenis benda lebih besar dari air", "Massa jenis benda lebih kecil dari air", "Benda tidak memiliki massa jenis"],
            "answer": 0,
            "why": {"0": "Syarat melayang: gaya apung Fa sama dengan berat benda w, yang terjadi saat rho_benda = rho_cair."},
            "distractorWhy": {"1": "Syarat tenggelam.", "2": "Syarat terapung.", "3": "Semua zat bermassa pasti punya massa jenis."}
        },
        {
            "id": "ipa-d-8-b4-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 154 Hukum Pascal), hukum Pascal dimanfaatkan pada alat teknologi yaitu…",
            "options": ["Pompa hidrolik pengangkat mobil dan rem hidrolik", "Teleskop bintang", "Kapal terbang baling-baling", "Termometer raksa"],
            "answer": 0,
            "why": {"0": "Hukum Pascal meneruskan tekanan di ruang tertutup secara merata ke segala arah (mesin hidrolik)."},
            "distractorWhy": {"1": "Teleskop adalah alat optik.", "2": "Baling-baling kapal terbang aerodinamika Bernoulli.", "3": "Termometer adalah pemuaian termal."}
        },
        {
            "id": "ipa-d-8-b4-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 160 Tekanan Gas), alat yang digunakan untuk mengukur tekanan udara luar (atmosfer) dinamakan…",
            "options": ["Barometer", "Manometer", "Hygrometer", "Termometer"],
            "answer": 0,
            "why": {"0": "Barometer (misal barometer Torricelli) mengukur tekanan udara atmosfer."},
            "distractorWhy": {"1": "Manometer mengukur tekanan gas ruang tertutup.", "2": "Hygrometer mengukur kelembapan udara.", "3": "Termometer mengukur suhu."}
        },
        {
            "id": "ipa-d-8-b4-q07",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 165 Aplikasi Biologi), air dan mineral dari tanah dapat naik sampai ke daun pohon yang tinggi akibat adanya…",
            "options": ["Tekanan akar, kapilaritas batang, dan daya isap daun (transpirasi)", "Gaya dorong angin malam", "Pembakaran fotosintesis di akar", "Gerak otot tumbuhan"],
            "answer": 0,
            "why": {"0": "Pengangkutan air pada tumbuhan memanfaatkan kombinasi tekanan kapiler xilem dan daya isap transpirasi daun."},
            "distractorWhy": {"1": "Angin malam bukan faktor internal.", "2": "Fotosintesis di daun bukan di akar.", "3": "Tumbuhan tidak memiliki jaringan otot."}
        },
        {
            "id": "ipa-d-8-b4-q08",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 136), satuan tekanan dalam Sistem Internasional (SI) adalah…",
            "options": ["N/m² atau Pascal (Pa)", "Joule (J)", "Watt (W)", "Newton (N)"],
            "answer": 0,
            "why": {"0": "Tekanan P = F/A memiliki satuan N/m² yang disebut Pascal (Pa)."},
            "distractorWhy": {"1": "Joule adalah satuan energi/usaha.", "2": "Watt adalah satuan daya.", "3": "Newton adalah satuan gaya."}
        },
        {
            "id": "ipa-d-8-b4-q09",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 145), penyelam yang menyelam lebih dalam di laut akan merasakan telinganya sakit karena…",
            "options": ["Tekanan hidrostatis air semakin besar seiring bertambahnya kedalaman", "Suhu air laut menjadi sangat panas", "Kadar garam air laut memudar", "Kandungan oksigen meningkat tajam"],
            "answer": 0,
            "why": {"0": "P = rho × g × h. Makin dalam (h besar), tekanan air pada gendang telinga makin kuat."},
            "distractorWhy": {"1": "Air laut makin dalam justru makin dingin.", "2": "Kadar garam tidak mempengaruhi tekanan gendang telinga.", "3": "Oksigen bukan penyebab tekanan hidrostatis."}
        },
        {
            "id": "ipa-d-8-b4-q10",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 150), kapal laut yang terbuat dari besi baja dapat mengapung di permukaan air laut karena…",
            "options": ["Bentuk lambung kapal berongga sehingga volume total kapal sangat besar dan massa jenis rata-rata kapal lebih kecil dari massa jenis air", "Besi baja dilapisi minyak tebal", "Kapal ditarik oleh arus permukaan", "Air laut menolak logam besi"],
            "answer": 0,
            "why": {"0": "Rongga udara kapal memperbesar volume total sehingga massa jenis rata-rata kapal < rho_air."},
            "distractorWhy": {"1": "Minyak tidak merubah prinsip Archimedes.", "2": "Arus bukan penentu terapung.", "3": "Air tidak menolak besi."}
        },
        {
            "id": "ipa-d-8-b4-q11",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 162), semakin tinggi suatu tempat dari permukaan laut (misal di puncak gunung), maka tekanan udaranya akan…",
            "options": ["Semakin kecil", "Semakin besar", "Tetap sama persis", "Menjadi nol serta merta"],
            "answer": 0,
            "why": {"0": "Ketinggian tempat bertambah => kerapatan dan tebal lapisan udara di atasnya berkurang => tekanan udara mengecil."},
            "distractorWhy": {"1": "Tekanan besar ada di dataran rendah.", "2": "Tekanan bervariasi terhadap ketinggian.", "3": "Tekanan di gunung belum nol."}
        },
        {
            "id": "ipa-d-8-b4-q12",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 168), alat medis sphygmomanometer (tensi darah) bekerja berdasarkan prinsip…",
            "options": ["Tekanan cairan dan gas dalam ruang tertutup (Hukum Pascal)", "Hukum Pembiasan Cahaya Snellius", "Hukum Kekekalan Energi Mekanik", "Gaya Gesek Statis"],
            "answer": 0,
            "why": {"0": "Tensi darah mengukur tekanan pembuluh darah arteri manset tekan berdasarkan transmisi tekanan cair/gas."},
            "distractorWhy": {"1": "Prinsip optik tidak relevan.", "2": "Prinsip energi mekanik bukan dasar tensi.", "3": "Gaya gesek bukan dasar tensi."}
        }
    ]
}
save_json(os.path.join(tools_dir, "chunk_ipa_8_b4.json"), ipa8_b4)

# 3. IPA KELAS VIII BAB 5: Getaran, Gelombang, dan Cahaya
ipa8_b5 = {
    "code": "KOMP-IPA-D-8-BAB5-01",
    "grade": 8,
    "name": "Getaran, Gelombang, dan Cahaya",
    "materi": "Getaran & Frekuensi, Gelombang Transversal & Longitudinal, Gelombang Bunyi & Ekolokasi, Sifat Cahaya & Alat Optik",
    "cpRef": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi)",
    "items": [
        {
            "id": "ipa-d-8-b5-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 175-178), jumlah getaran yang terjadi dalam waktu satu detik dinamakan…",
            "options": ["Frekuensi (f)", "Periode (T)", "Amplitudo (A)", "Panjang gelombang (lambda)"],
            "answer": 0,
            "why": {"0": "Frekuensi (f = n/t) diukur dalam Hertz (Hz) menyatakan banyaknya getaran per detik."},
            "distractorWhy": {"1": "Periode adalah waktu untuk satu getaran penuh.", "2": "Amplitudo adalah simpangan terjauh.", "3": "Panjang gelombang adalah jarak 1 gelombang."}
        },
        {
            "id": "ipa-d-8-b5-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 182), jika sebuah ayunan menghasilkan 60 getaran dalam waktu 15 detik, frekuensi ayunan tersebut adalah…",
            "options": ["4 Hz", "0,25 Hz", "900 Hz", "45 Hz"],
            "answer": 0,
            "why": {"0": "f = n / t = 60 / 15 = 4 Hz."},
            "distractorWhy": {"1": "T = 15 / 60 = 0,25 s (periode).", "2": "60 × 15 = 900.", "3": "60 - 15 = 45."}
        },
        {
            "id": "ipa-d-8-b5-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 186 Gelombang Longitudinal), contoh gelombang longitudinal yang arah rambatnya sejajar dengan arah getarnya adalah…",
            "options": ["Gelombang bunyi dan gelombang slinki (pegas)", "Gelombang permukaan air", "Gelombang cahaya tampak", "Gelombang radio"],
            "answer": 0,
            "why": {"0": "Gelombang bunyi dan slinki terdiri dari rapatan dan renggangan yang berarah sejajar rambatan."},
            "distractorWhy": {"1": "Gelombang air adalah gelombang transversal.", "2": "Cahaya adalah gelombang transversal elektromagnetik.", "3": "Gelombang radio adalah transversal."}
        },
        {
            "id": "ipa-d-8-b5-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 192 Bunyi & Ekolokasi), hewan seperti kelelawar dan lumba-lumba memanfaatkan gelombang bunyi berfrekuensi tinggi di atas 20.000 Hz untuk navigasi dinamakan…",
            "options": ["Ultrasonik", "Infrasonik", "Audiosonik", "Supersonik"],
            "answer": 0,
            "why": {"0": "Bunyi ultrasonik memiliki frekuensi > 20.000 Hz yang dimanfaatkan pada ekolokasi hewan dan USG medis."},
            "distractorWhy": {"1": "Infrasonik < 20 Hz.", "2": "Audiosonik 20 - 20.000 Hz (dengar manusia).", "3": "Supersonik adalah kecepatan melebihi bunyi."}
        },
        {
            "id": "ipa-d-8-b5-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 198 Sifat Cahaya), pensil yang dimasukkan sebagian ke dalam gelas berisi air bening tampak patah/bengkok karena sifat cahaya yaitu…",
            "options": ["Pembiasan cahaya (refraksi)", "Pemantulan cahaya (refleksi)", "Pelenturan cahaya (difraksi)", "Penguraian cahaya (dispersi)"],
            "answer": 0,
            "why": {"0": "Pembiasan terjadi saat cahaya merambat melewati dua medium dengan kerapatan optik berbeda (udara dan air)."},
            "distractorWhy": {"1": "Pemantulan adalah membaliknya arah cahaya.", "2": "Difraksi adalah belokan celah sempit.", "3": "Dispersi adalah pemisahan warna pelangi."}
        },
        {
            "id": "ipa-d-8-b5-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 204 Cermin Cembung), kaca spion kendaraan bermotor menggunakan cermin cembung karena sifat bayangan yang dihasilkan selalu…",
            "options": ["Maya, tegak, dan diperkecil sehingga jangkauan pandangan pengemudi lebih luas", "Nyata, terbalik, dan diperbesar", "Maya, terbalik, dan sama besar", "Nyata, tegak, dan hilang"],
            "answer": 0,
            "why": {"0": "Cermin cembung selalu membentuk bayangan maya, tegak, dan diperkecil untuk memperluas medan pandang."},
            "distractorWhy": {"1": "Sifat cermin cekung jarak tertentu.", "2": "Bayangan maya tidak terbalik.", "3": "Sifat tidak sesuai optik."}
        },
        {
            "id": "ipa-d-8-b5-q07",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 210 Alat Optik Mata), penderita rabun jauh (miopi) tidak dapat melihat benda jauh dengan jelas karena bayangan jatuh di depan retina. Cacatan mata ini ditolong dengan kaca mata berlensa…",
            "options": ["Cekung (lensa negatif / divergen)", "Cembung (lensa positif / konvergen)", "Rangkap (bifokal)", "Silindris"],
            "answer": 0,
            "why": {"0": "Lensa cekung menyebarkan sinar sebelum masuk ke mata agar bayangan bergeser tepat ke retina."},
            "distractorWhy": {"1": "Lensa cembung untuk rabun dekat (hipermetropi).", "2": "Lensa bifokal untuk presbiopi (mata tua).", "3": "Lensa silindris untuk astigmatisme."}
        },
        {
            "id": "ipa-d-8-b5-q08",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 180), rumus hubungan kecepatan rambat gelombang (v), panjang gelombang (lambda), dan frekuensi (f) adalah…",
            "options": ["v = lambda × f", "v = lambda / f", "v = f / lambda", "v = lambda + f"],
            "answer": 0,
            "why": {"0": "Cepat rambat gelombang v merupakan hasil kali panjang gelombang lambda dan frekuensinya f: v = lambda × f."},
            "distractorWhy": {"1": "Pembagian lambda/f keliru.", "2": "f/lambda keliru.", "3": "Penjumlahan keliru."}
        },
        {
            "id": "ipa-d-8-b5-q09",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 190), syarat utama terjadinya gaung atau kerdam pada gedung pertunjukan adalah…",
            "options": ["Bunyi pantul terdengar hampir bersamaan sebelum bunyi asli selesai diucapkan sehingga mengaburkan kata", "Bunyi pantul terdengar jelas setelah bunyi asli selesai", "Terdapat peredam suara dari busa", "Gedung tidak memiliki dinding"],
            "answer": 0,
            "why": {"0": "Gaung timbul bila jarak dinding pantul dekat sehingga bunyi pantul tumpang tindih mengaburkan bunyi asli."},
            "distractorWhy": {"1": "Syarat gema.", "2": "Peredam busa justru mencegah gaung.", "3": "Tanpa dinding tidak ada pemantulan."}
        },
        {
            "id": "ipa-d-8-b5-q10",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 215 Mikroskop Optik), bayangan akhir yang dibentuk oleh mikroskop cahaya pembesar jaringan biologis bersifat…",
            "options": ["Maya, terbalik, dan diperbesar terhadap objek asli", "Nyata, tegak, dan diperkecil", "Maya, tegak, dan sama besar", "Nyata, terbalik, dan sama besar"],
            "answer": 0,
            "why": {"0": "Kombinasi lensa objektif dan okuler mikroskop menghasilkan bayangan akhir maya, terbalik, diperbesar."},
            "distractorWhy": {"1": "Mikroskop memperbesar bayangan.", "2": "Bayangan terbalik.", "3": "Bayangan diperbesar."}
        },
        {
            "id": "ipa-d-8-b5-q11",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 196), bagian mata yang berfungsi mengatur jumlah cahaya yang masuk ke dalam pupil mata adalah…",
            "options": ["Iris (selaput pelangi)", "Retina", "Kornea", "Lensa mata"],
            "answer": 0,
            "why": {"0": "Iris memberi warna mata dan membesar/membendung bukaan pupil untuk mengatur cahaya masuk."},
            "distractorWhy": {"1": "Retina adalah layar pembentuk bayangan.", "2": "Kornea membiaskan cahaya di depan.", "3": "Lensa mata mengatur fokus bayangan (akomodasi)."}
        },
        {
            "id": "ipa-d-8-b5-q12",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 202), pelangi terbentuk di langit setelah hujan akibat fenomena cahaya yaitu…",
            "options": ["Dispersi dan pembiasan cahaya matahari oleh titik-titik air hujan", "Penyerapan penuh cahaya oleh awan", "Pemantulan cermin alam", "Interferensi cahaya lampu"],
            "answer": 0,
            "why": {"0": "Dispersi memisahkan cahaya polikromatik matahari menjadi spektrum warna mejikuhibiniu melalui pembiasan titik air."},
            "distractorWhy": {"1": "Penyerapan tidak menghasilkan warna.", "2": "Bukan pemantulan cermin.", "3": "Lampu tidak membentuk pelangi alam."}
        }
    ]
}
save_json(os.path.join(tools_dir, "chunk_ipa_8_b5.json"), ipa8_b5)

# 4. IPA KELAS VIII BAB 6: Unsur, Senyawa, dan Campuran
ipa8_b6 = {
    "code": "KOMP-IPA-D-8-BAB6-01",
    "grade": 8,
    "name": "Unsur, Senyawa, dan Campuran",
    "materi": "Klasifikasi Materi (Unsur, Senyawa, Campuran), Larutan, Koloid & Suspensi, Metode Pemisahan Campuran (Filtrasi, Distilasi, Kromatografi)",
    "cpRef": "Ilmu Pengetahuan Alam untuk SMP/MTs Kelas VII (Edisi Revisi)",
    "items": [
        {
            "id": "ipa-d-8-b6-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 225-228), zat tunggal yang paling sederhana dan tidak dapat diuraikan lagi menjadi zat lain secara reaksi kimia biasa dinamakan…",
            "options": ["Unsur", "Senyawa", "Campuran homogen", "Suspensi"],
            "answer": 0,
            "why": {"0": "Unsur adalah zat murni paling mendasar dalam tabel periodik (misal Emas/Au, Oksigen/O)."},
            "distractorWhy": {"1": "Senyawa terdiri dari gabungan unsur.", "2": "Campuran terdiri dari gabungan zat.", "3": "Suspensi adalah campuran heterogen."}
        },
        {
            "id": "ipa-d-8-b6-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 232), air (H₂O) dan garam dapur (NaCl) dikelompokkan sebagai senyawa karena…",
            "options": ["Tersusun atas dua jenis unsur atau lebih yang terikat secara kimia dengan perbandingan massa tetap", "Dapat dipisahkan dengan saringan kertas sederhana", "Bersifat keruh dan mengendap", "Memiliki komponen yang mudah menguap"],
            "answer": 0,
            "why": {"0": "Senyawa adalah ikatan kimia antarunsur dengan rumus dan sifat baru yang berbeda dari unsur penyusunnya."},
            "distractorWhy": {"1": "Saringan kertas hanya memisahkan campuran heterogen.", "2": "Air jernih dan NaCl larut sempurna.", "3": "Tidak semua menguap."}
        },
        {
            "id": "ipa-d-8-b6-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 238 Larutan & Koloid), contoh sistem koloid yang memiliki fase terdispersi dalam medium pendispersi (seperti susu dan santan) ditandai oleh…",
            "options": ["Tampak homogen secara kasatmata tetapi heterogen secara mikroskopis dan menunjukkan efek Tyndall", "Mengendap secara cepat saat didiamkan sebentar", "Bening dan bening sempurna menembus cahaya tanpa hamburan", "Dapat disaring dengan kertas saring biasa"],
            "answer": 0,
            "why": {"0": "Koloid menghamburkan berkas cahaya (Efek Tyndall) dan tidak mengendap dalam waktu singkat."},
            "distractorWhy": {"1": "Sifat suspensi kasar.", "2": "Sifat larutan sejati.", "3": "Koloid butuh penyaring ultra."}
        },
        {
            "id": "ipa-d-8-b6-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 245 Metode Pemisahan), pemisahan campuran yang didasarkan pada perbedaan titik didih antara komponen-komponennya (seperti pemisahan minyak bumi atau pembuatan air suling) dinamakan…",
            "options": ["Distilasi (penyulingan)", "Filtrasi (penyaringan)", "Kromatografi", "Kristalisasi"],
            "answer": 0,
            "why": {"0": "Distilasi memanaskan cairan hingga mendidih dan mengembunkan uap zat bermurni titik didih rendah."},
            "distractorWhy": {"1": "Filtrasi berdasarkan perbedaan ukuran partikel.", "2": "Kromatografi berdasarkan kepolaran dan kelajuan rambat.", "3": "Kristalisasi menguapkan pelarut."}
        },
        {
            "id": "ipa-d-8-b6-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 248 Kromatografi), pemisahan zat warna tinta atau pewarna makanan pada kertas saring dinamakan…",
            "options": ["Kromatografi kertas", "Evaporasi", "Sublimasi", "Sentrifugasi"],
            "answer": 0,
            "why": {"0": "Kromatografi kertas menguji kapilaritas dan perambatan perbedaan kecepatan komponen warna tinta."},
            "distractorWhy": {"1": "Evaporasi menguapkan pelarut air.", "2": "Sublimasi perubahan padat ke gas.", "3": "Sentrifugasi pemutaran cepat."}
        },
        {
            "id": "ipa-d-8-b6-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 252 Kristalisasi), pembuatan garam dapur tradisional oleh petani garam di tepi pantai menggunakan metode pemisahan…",
            "options": ["Kristalisasi / Evaporasi (penguapan air laut oleh sinar matahari)", "Penyulingan bertingkat", "Kromatografi lapis tipis", "Penyaringan mikron"],
            "answer": 0,
            "why": {"0": "Sinar matahari menguapkan air laut sehingga meninggalkan kristal garam padat."},
            "distractorWhy": {"1": "Bukan penyulingan distilasi.", "2": "Bukan kromatografi.", "3": "Bukan saringan mekanis."}
        },
        {
            "id": "ipa-d-8-b6-q07",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 256 Sentrifugasi), pemisahan sel darah merah dari plasma darah di laboratorium medis menggunakan alat pemutar berkecepatan tinggi yang menerapkan prinsip…",
            "options": ["Sentrifugasi", "Filtrasi gravitasi", "Sublimasi iodin", "Distilasi vakum"],
            "answer": 0,
            "why": {"0": "Sentrifugasi memutar sampel darah cepat sehingga gaya sentrifugal mengendapkan sel padat ke dasar tabung."},
            "distractorWhy": {"1": "Filtrasi gravitasi terlalu lambat.", "2": "Sublimasi untuk zat padat mudah menyublim.", "3": "Distilasi untuk cairan bermolaritas beda titik didih."}
        },
        {
            "id": "ipa-d-8-b6-q08",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 230), lambang kimia untuk unsur Emas dan Besi secara berurutan adalah…",
            "options": ["Au dan Fe", "Ag dan Cu", "Fe dan Au", "Es dan Bs"],
            "answer": 0,
            "why": {"0": "Au (Aurum = Emas) dan Fe (Ferrum = Besi)."},
            "distractorWhy": {"1": "Ag (Perak) dan Cu (Tembaga).", "2": "Urutan terbalik.", "3": "Singkatan salah."}
        },
        {
            "id": "ipa-d-8-b6-q09",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 235), campuran heterogen antara tepung terigu dengan air yang keruh dan mengendap jika didiamkan dinamakan…",
            "options": ["Suspensi", "Larutan sejati", "Koloid", "Emulsi cair"],
            "answer": 0,
            "why": {"0": "Suspensi adalah campuran heterogen dengan partikel terdispersi besar yang akan mengendap."},
            "distractorWhy": {"1": "Larutan tidak mengendap.", "2": "Koloid stabil.", "3": "Emulsi butuh pengemulsi."}
        },
        {
            "id": "ipa-d-8-b6-q10",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 260), metode pemisahan campuran pasir dan serbuk besi yang paling praktis dan cepat adalah dengan menggunakan…",
            "options": ["Magnet", "Kertas saring", "Corong pemisah", "Lampu pemanas"],
            "answer": 0,
            "why": {"0": "Magnet menarik besi (feromagnetik) keluar dari campuran pasir (non-magnetik)."},
            "distractorWhy": {"1": "Saringan kertas tidak memisahkan padat-padat.", "2": "Corong pemisah untuk cair-cair.", "3": "Pemanas tidak memisahkan besi."}
        },
        {
            "id": "ipa-d-8-b6-q11",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 240), larutan gula dan larutan garam dapur termasuk dalam jenis campuran…",
            "options": ["Homogen (larutan)", "Heterogen", "Suspensi kasar", "Koloid serbuk"],
            "answer": 0,
            "why": {"0": "Campuran homogen memiliki komposisi merata sempurna sehingga zat terlarut tidak dapat dibedakan lagi."},
            "distractorWhy": {"1": "Heterogen komponennya terpisah.", "2": "Suspensi mengendap.", "3": "Koloid menghamburkan cahaya."}
        },
        {
            "id": "ipa-d-8-b6-q12",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPA Kelas VIII (hal. 250), metode pemisahan kapur barus (kamper) dari kotoran pasir memanfaatkan sifat perubahan wujud…",
            "options": ["Sublimasi (padat menjadi gas lalu mengkristal kembali)", "Evaporasi", "Pembekuan", "Kondensasi cair"],
            "answer": 0,
            "why": {"0": "Kapur barus menyublim saat dipanaskan dan mengkristal murni di permukaan dingin penutup."},
            "distractorWhy": {"1": "Evaporasi pelarut air.", "2": "Pembekuan cair ke padat.", "3": "Kondensasi gas ke cair."}
        }
    ]
}
save_json(os.path.join(tools_dir, "chunk_ipa_8_b6.json"), ipa8_b6)

# 5. MATEMATIKA KELAS VII BAB 3: Rasio dan Proporsi
mat7_b3 = {
    "code": "KOMP-MAT-D-7-BAB3-01",
    "grade": 7,
    "name": "Rasio dan Proporsi",
    "materi": "Konsep Rasio & Perbandingan, Perbandingan Senilai & Berbalik Nilai, Skala Peta, Penerapan Kontekstual Kecepatan & Waktu",
    "cpRef": "Matematika untuk SMP/MTs Kelas VII",
    "items": [
        {
            "id": "mat-d-7-b3-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 102-106), bentuk paling sederhana dari rasio 24 : 36 adalah…",
            "options": ["2 : 3", "4 : 6", "1 : 2", "3 : 4"],
            "answer": 0,
            "why": {"0": "Kedua angka dibagi FPB (12): 24:12 = 2 dan 36:12 = 3. Bentuk sederhana 2 : 3."},
            "distractorWhy": {"1": "4 : 6 belum paling sederhana (masih bisa dibagi 2).", "2": "1 : 2 salah pembagian.", "3": "3 : 4 terbalik."}
        },
        {
            "id": "mat-d-7-b3-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 110 Perbandingan Senilai), harga 5 kg beras adalah Rp60.000,00. Harga 8 kg beras yang sama adalah…",
            "options": ["Rp96.000,00", "Rp80.000,00", "Rp100.000,00", "Rp90.000,00"],
            "answer": 0,
            "why": {"0": "Harga per kg = 60.000 / 5 = 12.000. Harga 8 kg = 8 × 12.000 = Rp96.000,00."},
            "distractorWhy": {"1": "80.000 keliru.", "2": "100.000 keliru.", "3": "90.000 keliru."}
        },
        {
            "id": "mat-d-7-b3-q03",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 118 Perbandingan Berbalik Nilai), sebuah pekerjaan pembangunan gedung dapat diselesaikan oleh 12 pekerja dalam waktu 20 hari. Jika pekerjaan ingin diselesaikan dalam waktu 15 hari, banyak pekerja yang dibutuhkan adalah…",
            "options": ["16 pekerja", "15 pekerja", "18 pekerja", "20 pekerja"],
            "answer": 0,
            "why": {"0": "Perbandingan berbalik nilai: 12 × 20 = x × 15 => x = 240 / 15 = 16 pekerja."},
            "distractorWhy": {"1": "15 pekerja keliru.", "2": "18 pekerja keliru.", "3": "20 pekerja keliru."}
        },
        {
            "id": "mat-d-7-b3-q04",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 125 Skala Peta), jarak antara Kota A dan Kota B pada peta berskala 1 : 2.000.000 adalah 4 cm. Jarak sebenarnya di permukaan bumi adalah…",
            "options": ["80 km", "8 km", "800 km", "50 km"],
            "answer": 0,
            "why": {"0": "Jarak asli = 4 cm × 2.000.000 = 8.000.000 cm = 80 km."},
            "distractorWhy": {"1": "8 km salah konversi cm ke km.", "2": "800 km berlebihan nol.", "3": "50 km keliru perkalian."}
        },
        {
            "id": "mat-d-7-b3-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 108), di dalam sebuah kelas terdapat 15 siswa laki-laki dan 20 siswa perempuan. Rasio siswa laki-laki terhadap seluruh siswa di kelas adalah…",
            "options": ["3 : 7", "3 : 4", "4 : 3", "3 : 5"],
            "answer": 0,
            "why": {"0": "Total siswa = 15 + 20 = 35. Rasio laki-laki : total = 15 : 35 = 3 : 7."},
            "distractorWhy": {"1": "3 : 4 adalah rasio laki-laki : perempuan.", "2": "4 : 3 adalah perempuan : laki-laki.", "3": "3 : 5 salah penyederhanaan."}
        },
        {
            "id": "mat-d-7-b3-q06",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 130 Kecepatan), sebuah mobil melaju dengan kecepatan rata-rata 60 km/jam dan membutuhkan waktu 3 jam untuk sampai di tujuan. Jika mobil melaju dengan kecepatan 90 km/jam, waktu yang dibutuhkan adalah…",
            "options": ["2 jam", "1,5 jam", "2,5 jam", "4 jam"],
            "answer": 0,
            "why": {"0": "Jarak = v × t = 60 × 3 = 180 km. Waktu baru = 180 / 90 = 2 jam."},
            "distractorWhy": {"1": "1,5 jam keliru.", "2": "2,5 jam keliru.", "3": "4 jam keliru."}
        },
        {
            "id": "mat-d-7-b3-q07",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 104), rasio senilai dengan 4 : 5 adalah…",
            "options": ["12 : 15", "8 : 12", "16 : 25", "10 : 12"],
            "answer": 0,
            "why": {"0": "4×3 : 5×3 = 12 : 15."},
            "distractorWhy": {"1": "8:12 = 2:3.", "2": "16:25 = (4/5)².", "3": "10:12 = 5:6."}
        },
        {
            "id": "mat-d-7-b3-q08",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 115), resep kue membutuhkan 200 gram gula untuk 500 gram tepung. Jika Ibu menggunakan 750 gram tepung, gula yang dibutuhkan adalah…",
            "options": ["300 gram", "250 gram", "350 gram", "400 gram"],
            "answer": 0,
            "why": {"0": "Gula = (750 / 500) × 200 = 1,5 × 200 = 300 gram."},
            "distractorWhy": {"1": "250 g keliru.", "2": "350 g keliru.", "3": "400 g keliru."}
        },
        {
            "id": "mat-d-7-b3-q09",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 128 Uji Kemampuan), persediaan makanan untuk 30 ekor sapi cukup untuk 12 hari. Jika sapi bertambah 6 ekor, makanan tersebut akan habis dalam…",
            "options": ["10 hari", "9 hari", "8 hari", "11 hari"],
            "answer": 0,
            "why": {"0": "Total sapi = 36. Berbalik nilai: 30 × 12 = 36 × h => h = 360 / 36 = 10 hari."},
            "distractorWhy": {"1": "9 hari keliru.", "2": "8 hari keliru.", "3": "11 hari keliru."}
        },
        {
            "id": "mat-d-7-b3-q10",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 122), skala foto menunjukan 1 : 20. Jika tinggi rumah pada foto adalah 15 cm, tinggi asli rumah tersebut adalah…",
            "options": ["3 meter (300 cm)", "30 meter", "1,5 meter", "30 cm"],
            "answer": 0,
            "why": {"0": "Tinggi asli = 15 cm × 20 = 300 cm = 3 meter."},
            "distractorWhy": {"1": "30 m berlebihan.", "2": "1,5 m keliru.", "3": "30 cm keliru."}
        },
        {
            "id": "mat-d-7-b3-q11",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 112), rasio jumlah uang Tabungan Ani dan Budi adalah 3 : 5. Jika jumlah uang mereka berdua adalah Rp400.000,00, besar uang Budi adalah…",
            "options": ["Rp250.000,00", "Rp150.000,00", "Rp200.000,00", "Rp300.000,00"],
            "answer": 0,
            "why": {"0": "Uang Budi = (5 / (3+5)) × 400.000 = (5/8) × 400.000 = Rp250.000,00."},
            "distractorWhy": {"1": "150.000 uang Ani.", "2": "200.000 setengahnya.", "3": "300.000 keliru."}
        },
        {
            "id": "mat-d-7-b3-q12",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 132), selisih umur Ayah dan Kaka adalah 24 tahun. Jika rasio umur Ayah dan Kaka adalah 7 : 3, umur Ayah adalah…",
            "options": ["42 tahun", "18 tahun", "36 tahun", "48 tahun"],
            "answer": 0,
            "why": {"0": "Selisih rasio = 7 - 3 = 4 bagian. 1 bagian = 24 / 4 = 6 tahun. Umur Ayah = 7 × 6 = 42 tahun."},
            "distractorWhy": {"1": "18 tahun umur Kaka.", "2": "36 tahun keliru.", "3": "48 tahun keliru."}
        }
    ]
}
save_json(os.path.join(tools_dir, "chunk_mat_7_b3.json"), mat7_b3)

# 6. MATEMATIKA KELAS VII BAB 4: Bangun Datar
mat7_b4 = {
    "code": "KOMP-MAT-D-7-BAB4-01",
    "grade": 7,
    "name": "Bentuk Geometri dan Bangun Datar",
    "materi": "Sifat Garis & Sudut, Hubungan Antarsudut, Keliling & Luas Segitiga & Segi Empat (Persegi, Persegi Panjang, Jajar Genjang, Trapesium)",
    "cpRef": "Matematika untuk SMP/MTs Kelas VII",
    "items": [
        {
            "id": "mat-d-7-b4-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 140-144), sudut berpelurus (suplemen) memiliki jumlah besar sudut sebesar…",
            "options": ["180°", "90°", "360°", "45°"],
            "answer": 0,
            "why": {"0": "Dua sudut dikatakan berpelurus jika jumlah kedua sudutnya membentuk garis lurus 180°."},
            "distractorWhy": {"1": "90° adalah sudut berpenyiku (komplemen).", "2": "360° adalah sudut satu putaran penuh.", "3": "45° sudut lancip."}
        },
        {
            "id": "mat-d-7-b4-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 150), luas sebuah persegi panjang dengan panjang 12 cm dan lebar 8 cm adalah…",
            "options": ["96 cm²", "40 cm²", "48 cm²", "80 cm²"],
            "answer": 0,
            "why": {"0": "Luas persegi panjang L = p × l = 12 cm × 8 cm = 96 cm²."},
            "distractorWhy": {"1": "40 cm keliling (2(12+8)).", "2": "48 cm² setengahnya.", "3": "80 cm² keliru."}
        },
        {
            "id": "mat-d-7-b4-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 158 Luas Segitiga), sebuah segitiga memiliki alas 10 cm dan tinggi 14 cm. Luas segitiga tersebut adalah…",
            "options": ["70 cm²", "140 cm²", "35 cm²", "48 cm²"],
            "answer": 0,
            "why": {"0": "Luas segitiga L = 1/2 × a × t = 1/2 × 10 cm × 14 cm = 70 cm²."},
            "distractorWhy": {"1": "140 cm² lupa dibagi 2.", "2": "35 cm² keliru.", "3": "48 cm² keliru."}
        },
        {
            "id": "mat-d-7-b4-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 165 Jajar Genjang), jajar genjang memiliki alas a = 15 cm dan tinggi t = 8 cm. Luas jajar genjang tersebut adalah…",
            "options": ["120 cm²", "60 cm²", "46 cm²", "90 cm²"],
            "answer": 0,
            "why": {"0": "Luas jajar genjang L = a × t = 15 cm × 8 cm = 120 cm²."},
            "distractorWhy": {"1": "60 cm² keliru dibagi 2 seperti segitiga.", "2": "46 cm² keliling.", "3": "90 cm² keliru."}
        },
        {
            "id": "mat-d-7-b4-q05",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 172 Trapesium), sebuah trapesium memiliki panjang sisi sejajar a = 12 cm dan b = 18 cm, serta tinggi t = 10 cm. Luas trapesium adalah…",
            "options": ["150 cm²", "300 cm²", "108 cm²", "216 cm²"],
            "answer": 0,
            "why": {"0": "Luas trapesium L = 1/2 × (a + b) × t = 1/2 × (12 + 18) × 10 = 1/2 × 30 × 10 = 150 cm²."},
            "distractorWhy": {"1": "300 cm² lupa dibagi 2.", "2": "108 cm² keliru.", "3": "216 cm² keliru."}
        },
        {
            "id": "mat-d-7-b4-q06",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 148), keliling persegi dengan panjang sisi s = 15 cm adalah…",
            "options": ["60 cm", "225 cm²", "30 cm", "45 cm"],
            "answer": 0,
            "why": {"0": "Keliling persegi K = 4 × s = 4 × 15 cm = 60 cm."},
            "distractorWhy": {"1": "225 cm² adalah Luas (s²).", "2": "30 cm keliru 2s.", "3": "45 cm keliru 3s."}
        },
        {
            "id": "mat-d-7-b4-q07",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 178 Layang-layang), panjang diagonal-diagonal layang-layang adalah d1 = 16 cm dan d2 = 24 cm. Luas layang-layang adalah…",
            "options": ["192 cm²", "384 cm²", "96 cm²", "80 cm²"],
            "answer": 0,
            "why": {"0": "Luas layang-layang L = 1/2 × d1 × d2 = 1/2 × 16 × 24 = 192 cm²."},
            "distractorWhy": {"1": "384 cm² lupa dibagi 2.", "2": "96 cm² keliru.", "3": "80 cm² keliru."}
        },
        {
            "id": "mat-d-7-b4-q08",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 142), dua sudut saling berpenyiku (komplemen). Jika sudut pertama besarnya 35°, besar sudut kedua adalah…",
            "options": ["55°", "145°", "65°", "45°"],
            "answer": 0,
            "why": {"0": "Sudut berpenyiku jumlahnya 90°. Sudut kedua = 90° - 35° = 55°."},
            "distractorWhy": {"1": "145° berpelurus (180 - 35).", "2": "65° keliru.", "3": "45° keliru."}
        },
        {
            "id": "mat-d-7-b4-q09",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 152), bangun datar segi empat yang memiliki dua pasang sisi sama panjang dan kedua diagonalnya saling tegak lurus tetapi tidak sama panjang adalah…",
            "options": ["Layang-layang", "Persegi panjang", "Trapesium sama kaki", "Jajar genjang"],
            "answer": 0,
            "why": {"0": "Layang-layang memiliki sifat 2 pasang sisi berdampingan sama panjang dan diagonal tegak lurus."},
            "distractorWhy": {"1": "Persegi panjang diagonal tidak tegak lurus.", "2": "Trapesium diagonal tidak tegak lurus.", "3": "Jajar genjang tidak tegak lurus."}
        },
        {
            "id": "mat-d-7-b4-q10",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 160), jumlah seluruh sudut dalam pada bangun datar segitiga selalu sama dengan…",
            "options": ["180°", "360°", "90°", "270°"],
            "answer": 0,
            "why": {"0": "Jumlah ketiga sudut dalam segitiga apa saja selalu 180°."},
            "distractorWhy": {"1": "360° sudut dalam segi empat.", "2": "90° sudut siku-siku.", "3": "270° keliru."}
        },
        {
            "id": "mat-d-7-b4-q11",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 182 Uji Kompetensi), sebuah lapangan berbentuk persegi panjang berukuran 30 m × 20 m. Di sekeliling lapangan ditanami pohon dengan jarak antar pohon 5 m. Banyak pohon yang dibutuhkan adalah…",
            "options": ["20 pohon", "100 pohon", "10 pohon", "25 pohon"],
            "answer": 0,
            "why": {"0": "Keliling = 2 × (30 + 20) = 100 m. Banyak pohon = 100 m / 5 m = 20 pohon."},
            "distractorWhy": {"1": "100 pohon keliru.", "2": "10 pohon keliru.", "3": "25 pohon keliru."}
        },
        {
            "id": "mat-d-7-b4-q12",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Matematika Kelas VII (hal. 168), belah ketupat adalah bangun segi empat yang memiliki sifat khusus yaitu…",
            "options": ["Keempat sisinya sama panjang", "Keempat sudutnya siku-siku 90°", "Memiliki satu pasang sisi sejajar", "Hanya memiliki satu simetri lipat"],
            "answer": 0,
            "why": {"0": "Belah ketupat adalah jajar genjang yang keempat sisinya sama panjang."},
            "distractorWhy": {"1": "Sifat persegi.", "2": "Sifat trapesium.", "3": "Layang-layang."}
        }
    ]
}
save_json(os.path.join(tools_dir, "chunk_mat_7_b4.json"), mat7_b4)

# 7. BAHASA INDONESIA KELAS VII BAB 3: Hal yang Baik bagi Tubuh
ind7_b3 = {
    "code": "KOMP-IND-D-7-BAB3-01",
    "grade": 7,
    "name": "Bab 3: Hal yang Baik bagi Tubuh",
    "materi": "Memahami Teks Prosedur Kesehatan & Olahraga, Struktur Teks Prosedur (Tujuan, Bahan, Langkah), Unsur Kebahasaan: Kalimat Imperatif & Kata Keterangan",
    "cpRef": "Bahasa Indonesia untuk SMP/MTs Kelas VII (Edisi Revisi)",
    "items": [
        {
            "id": "ind-d-7-b3-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 75-80), tujuan utama penulisan teks prosedur adalah…",
            "options": [
                "Petunjuk atau panduan langkah-langkah dalam membuat atau melakukan sesuatu secara runtut",
                "Menceritakan kisah fiktif tokoh pahlawan",
                "Menggambarkan keindahan alam secara detail",
                "Menyampaikan pendapat pro dan kontra terhadap isu sosial"
            ],
            "answer": 0,
            "why": {"0": "Teks prosedur memberikan petunjuk operasional sistematis membuat/melakukan sesuatu."},
            "distractorWhy": {"1": "Teks narasi.", "2": "Teks deskripsi.", "3": "Teks diskusi."}
        },
        {
            "id": "ind-d-7-b3-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 84 Struktur Prosedur), urutan struktur teks prosedur yang tepat adalah…",
            "options": ["Tujuan -> Alat/Bahan -> Langkah-langkah -> Penutup/Penegasan", "Langkah-langkah -> Tujuan -> Alat/Bahan", "Judul -> Kesimpulan -> Langkah-langkah", "Orientasi -> Komplikasi -> Resolusi"],
            "answer": 0,
            "why": {"0": "Struktur baku teks prosedur diawali Tujuan, Bahan/Alat, Urutan Langkah, dan Penutup."},
            "distractorWhy": {"1": "Urutan acak.", "2": "Struktur tidak baku.", "3": "Struktur cerita fantasi."}
        },
        {
            "id": "ind-d-7-b3-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 88 Kebahasaan), kalimat imperatif (perintah) yang tepat dalam prosedur pembuatan minuman sehat adalah…",
            "options": [
                "Aduk campuran jahe dan madu tersebut hingga larut sempurna!",
                "Apakah jahe tersebut sudah diiris tipis?",
                "Saya sangat menyukai aroma jahe segar.",
                "Jahe adalah tanaman rimpang obat keluarga."
            ],
            "answer": 0,
            "why": {"0": "Kalimat imperatif ditandai kata kerja aksi di awal (aduk) dan akhiran perintah (!)."},
            "distractorWhy": {"1": "Kalimat interogatif (tanya).", "2": "Kalimat deklaratif opini.", "3": "Kalimat deklaratif fakta."}
        },
        {
            "id": "ind-d-7-b3-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 92), penggunaan kata keterangan cara yang tepat dalam teks prosedur olahraga adalah…",
            "options": [
                "Tarik napas secara perlahan-lahan dan hembuskan lewat mulut",
                "Olahraga dilakukan pada pagi hari pukul 06.00 WIB",
                "Gunakan sepatu olahraga ukuran 40",
                "Lakukan gerakan ini sebanyak 10 kali"
            ],
            "answer": 0,
            "why": {"0": "'Secara perlahan-lahan' adalah keterangan cara (adverbia cara) pelaksanaan aksi."},
            "distractorWhy": {"1": "Keterangan waktu.", "2": "Keterangan alat/ukuran.", "3": "Keterangan kuantitas/jumlah."}
        },
        {
            "id": "ind-d-7-b3-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 82), contoh kata penghubung (konjungsi) urutan dalam teks prosedur adalah…",
            "options": ["Pertama, kemudian, selanjutnya, dan akhirnya", "Sebab, karena, dan akibatnya", "Tetapi, namun, dan melainkan", "Jika, seandainya, dan jikalau"],
            "answer": 0,
            "why": {"0": "Konjungsi urutan (kronologis) menyusun langkah bertahap."},
            "distractorWhy": {"1": "Konjungsi kausalitas.", "2": "Konjungsi pertentangan.", "3": "Konjungsi pengandaian."}
        },
        {
            "id": "ind-d-7-b3-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 96 Uji Kemampuan), bagian penutup dalam teks prosedur berfungsi untuk…",
            "options": [
                "Memberikan penegasan ulang ucapan selamat mencoba atau manfaat dari kegiatan yang dipraktikkan",
                "Merinci daftar harga bahan-bahan yang dibeli",
                "Menjelaskan kegagalan yang mungkin terjadi",
                "Menuliskan nama-nama penulis buku"
            ],
            "answer": 0,
            "why": {"0": "Penutup berisi apresiasi 'Selamat mencoba' atau ringkasan manfaat hasil."},
            "distractorWhy": {"1": "Bukan fungsi penutup.", "2": "Bukan fokus penutup.", "3": "Biografi penulis."}
        }
    ]
}
save_json(os.path.join(tools_dir, "chunk_ind_7_b3.json"), ind7_b3)

# 8. BAHASA INDONESIA KELAS VII BAB 4: Aksi Nyata Pelindung Bumi
ind7_b4 = {
    "code": "KOMP-IND-D-7-BAB4-01",
    "grade": 7,
    "name": "Bab 4: Aksi Nyata Pelindung Bumi",
    "materi": "Memahami Teks Berita Lingkungan, Unsur Berita 5W+1H (ADIKSIMBA), Struktur Berita (Kepala, Tubuh, Ekor), Membandingkan Media Cetak & Digital",
    "cpRef": "Bahasa Indonesia untuk SMP/MTs Kelas VII (Edisi Revisi)",
    "items": [
        {
            "id": "ind-d-7-b4-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 105-110 Teks Berita), unsur-unsur utama berita ADIKSIMBA (5W+1H) terdiri atas…",
            "options": [
                "Apa, Di mana, Kapan, Siapa, Mengapa, dan Bagaimana",
                "Awal, Depan, Isi, Kesimpulan, dan Simpulan",
                "Aku, Dia, Kita, Mereka, dan Kami",
                "Alasan, Dampak, Informasi, Karakter, dan Bukti"
            ],
            "answer": 0,
            "why": {"0": "ADIKSIMBA merupakan akronim Apa, Di mana, Kapan, Siapa, Mengapa, Bagaimana."},
            "distractorWhy": {"1": "Bukan unsur berita.", "2": "Kata ganti orang.", "3": "Istilah buatan."}
        },
        {
            "id": "ind-d-7-b4-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 115 Struktur Berita), bagian terpenting berita yang memuat inti informasi paling menarik di paragraf pertama dinamakan…",
            "options": ["Kepala berita (Lead)", "Tubuh berita (Body)", "Ekor berita (Tail)", "Judul berita (Headline)"],
            "answer": 0,
            "why": {"0": "Kepala berita (lead) berada di paling awal berisi ringkasan jawaban unsur utama 5W+1H."},
            "distractorWhy": {"1": "Tubuh berita berisi uraian rincian.", "2": "Ekor berita informasi tambahan kurang penting.", "3": "Judul adalah nama berita."}
        },
        {
            "id": "ind-d-7-b4-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 120), kutipan kalimat: 'Bencana banjir bandang menerjang wilayah Garut pada Selasa (15/10) malam akibat luapan sungai.' Unsur berita yang terdapat pada kata yang dicetak tebal 'Selasa malam' adalah…",
            "options": ["Kapan (When)", "Di mana (Where)", "Siapa (Who)", "Mengapa (Why)"],
            "answer": 0,
            "why": {"0": "'Selasa malam' menunjukkan keterangan waktu terjadinya peristiwa (Kapan)."},
            "distractorWhy": {"1": "Di mana menunjukkan lokasi.", "2": "Siapa menunjukkan subjek.", "3": "Mengapa menunjukkan alasan."}
        },
        {
            "id": "ind-d-7-b4-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 125 Kebahasaan), kalimat langsung yang menyalin wawancara wartawan dengan narasumber secara tepat adalah…",
            "options": [
                '"Masyarakat diimbau tetap waspada terhadap potensi tanah longsor," kata Kepala BPBD.',
                'Kepala BPBD mengatakan bahwa masyarakat diimbau tetap waspada.',
                'Apakah masyarakat diimbau tetap waspada kata Kepala BPBD.',
                'Masyarakat diimbau tetap waspada kata Kepala BPBD tanpa tanda petik.'
            ],
            "answer": 0,
            "why": {"0": "Kalimat langsung menggunakan tanda petik ganda (\"\") mengapit tuturan lisan narasumber."},
            "distractorWhy": {"1": "Kalimat tidak langsung (menggunakan bahwa).", "2": "Tanda baca salah.", "3": "Tanpa tanda petik salah."}
        },
        {
            "id": "ind-d-7-b4-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 112), perbedaan utama antara berita media cetak (koran) dengan berita media digital (daring/online) adalah…",
            "options": [
                "Berita digital dapat diperbarui secara waktu nyata (real-time) dan memuat pranala (hyperlink), sedangkan cetak terbit berkala pada kertas",
                "Berita cetak tidak memiliki judul",
                "Berita digital hanya berisi gambar tanpa teks",
                "Berita cetak selalu bohong"
            ],
            "answer": 0,
            "why": {"0": "Media digital bersifat dinamis, cepat diperbarui, serta terintegrasi dengan tautan multimedia."},
            "distractorWhy": {"1": "Cetak punya judul.", "2": "Digital ada teksnya.", "3": "Pernyataan keliru."}
        },
        {
            "id": "ind-d-7-b4-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VII (hal. 128 Uji Kemampuan), bagian ekor berita memuat rincian yang bersifat…",
            "options": ["Informasi tambahan pendukung yang jika dihilangkan tidak merusak inti berita", "Inti sari utama berita", "Alamat kontak redaksi penerbit", "Daftar riwayat hidup wartawan"],
            "answer": 0,
            "why": {"0": "Ekor berita menggunakan piramida terbalik, memuat suplemen yang dapat dipotong tanpa mengganggu pemahaman."},
            "distractorWhy": {"1": "Inti di kepala berita.", "2": "Kontak redaksi di footer media.", "3": "Riwayat wartawan irrelevan."}
        }
    ]
}
save_json(os.path.join(tools_dir, "chunk_ind_7_b4.json"), ind7_b4)

# 9. BAHASA INGGRIS KELAS VII CHAPTER 3: Home Sweet Home
eng7_c3 = {
    "code": "KOMP-ENG-D-7-BAB3-01",
    "grade": 7,
    "name": "Chapter 3: Home Sweet Home",
    "materi": "Rooms & Furniture in a House, Describing House Chores & Cleaning Activities, Prepositions of Place (in, on, under, next to), Rules and Abilities (can/can't)",
    "cpRef": "English for Nusantara untuk SMP/MTs Kelas VII",
    "items": [
        {
            "id": "eng-d-7-c3-q01",
            "difficulty": "dasar",
            "prompt": "Based on English for Nusantara Grade VII (pages 105-110 Unit 1 'My House'), which room is primarily used for cooking meals and preparing drinks?",
            "options": ["Kitchen", "Bedroom", "Bathroom", "Living room"],
            "answer": 0,
            "why": {"0": "The kitchen is the room in a house dedicated to cooking and food preparation."},
            "distractorWhy": {"1": "Bedroom is for sleeping.", "2": "Bathroom is for bathing.", "3": "Living room is for family gathering."}
        },
        {
            "id": "eng-d-7-c3-q02",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VII (page 115 Prepositions of Place), look at the sentence: 'Galang puts his school bag ___ the desk in his bedroom.' What is the correct preposition?",
            "options": ["on", "under", "behind", "in"],
            "answer": 0,
            "why": {"0": "'on' is used when an object is supported by a flat horizontal surface (on the desk)."},
            "distractorWhy": {"1": "under means beneath.", "2": "behind means at the back.", "3": "in means inside an enclosed space."}
        },
        {
            "id": "eng-d-7-c3-q03",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VII (page 120 Unit 2 'House Chores'), what expression describes Monita's daily cleaning activity of using a broom on the floor?",
            "options": ["'She sweeps the floor.'", "'She washes the dishes.'", "'She waters the plants.'", "'She irons the clothes.'"],
            "answer": 0,
            "why": {"0": "'sweeps the floor' (menyapu lantai) is the chore associated with a broom."},
            "distractorWhy": {"1": "Washing dishes is for plates/cups.", "2": "Watering plants is for garden.", "3": "Ironing clothes is for garments."}
        },
        {
            "id": "eng-d-7-c3-q04",
            "difficulty": "tinggi",
            "prompt": "Based on English for Nusantara Grade VII (page 128 Language Focus - Modals for Rules), choose the correct sentence to state a household rule about cleanliness:",
            "options": ["'We must keep our bedroom clean and tidy.'", "'We can throw trash on the floor.'", "'We cannot sleep at night.'", "'We must break the window.'"],
            "answer": 0,
            "why": {"0": "'must keep our bedroom clean' states a positive house rule requirement."},
            "distractorWhy": {"1": "Contradicts cleanliness rules.", "2": "Illogical rule.", "3": "Destructive behavior."}
        },
        {
            "id": "eng-d-7-c3-q05",
            "difficulty": "dasar",
            "prompt": "Based on English for Nusantara Grade VII (page 112), what piece of furniture is typically found in the living room for people to sit comfortably?",
            "options": ["Sofa", "Stove", "Refrigerator", "Wardrobe"],
            "answer": 0,
            "why": {"0": "A sofa is comfortable seating furniture in a living room."},
            "distractorWhy": {"1": "Stove is in the kitchen.", "2": "Refrigerator is for food cold storage.", "3": "Wardrobe is in bedroom for clothes."}
        },
        {
            "id": "eng-d-7-c3-q06",
            "difficulty": "sedang",
            "prompt": "Based on English for Nusantara Grade VII (page 132 Unit 3 Review), complete the sentence with 'can' or 'can't': 'Sinta ___ cook fried rice because her mother taught her last week.'",
            "options": ["can", "can't", "must not", "should not"],
            "answer": 0,
            "why": {"0": "'can' expresses learned ability/capability in the present."},
            "distractorWhy": {"1": "can't expresses inability.", "2": "must not expresses prohibition.", "3": "should not expresses negative advice."}
        }
    ]
}
save_json(os.path.join(tools_dir, "chunk_eng_7_c3.json"), eng7_c3)

# 10. IPS KELAS VII TEMA 03: Potensi Ekonomi Lingkungan
ips7_t3 = {
    "code": "KOMP-IPS-D-7-BAB3-01",
    "grade": 7,
    "name": "Tema 03: Potensi Ekonomi Lingkungan",
    "materi": "Potensi Sumber Daya Alam (Hutan, Tambang, Laut), Kegiatan Ekonomi (Produksi, Distribusi, Konsumsi), Hukum Permintaan & Penawaran, Pasar & Peran Teknologi",
    "cpRef": "Ilmu Pengetahuan Sosial untuk SMP/MTs Kelas VII (Edisi Revisi)",
    "items": [
        {
            "id": "ips-d-7-t3-q01",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 125-130), potensi sumber daya laut Indonesia yang sangat besar mencakup hasil perikanan, terumbu karang, serta potensi energi terbarukan yaitu…",
            "options": ["Energi gelombang laut dan pasang surut", "Batu bara bawah tanah", "Gas alam daratan", "Minyak sawit laut"],
            "answer": 0,
            "why": {"0": "Wilayah laut Indonesia memiliki potensi energi gelombang dan pasang surut air laut (ocean energy)."},
            "distractorWhy": {"1": "Batu bara adalah SDA darat.", "2": "Gas alam darat di daratan.", "3": "Minyak sawit dari perkebunan darat."}
        },
        {
            "id": "ips-d-7-t3-q02",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 135 Kegiatan Ekonomi), kegiatan mengubah bahan mentah menjadi barang jadi atau barang setengah jadi dinamakan…",
            "options": ["Produksi", "Distribusi", "Konsumsi", "Investasi"],
            "answer": 0,
            "why": {"0": "Produksi adalah kegiatan menciptakan atau meningkatkan nilai guna suatu barang/jasa."},
            "distractorWhy": {"1": "Distribusi menyalurkan barang.", "2": "Konsumsi menggunakan/menghabiskan barang.", "3": "Investasi penanaman modal."}
        },
        {
            "id": "ips-d-7-t3-q03",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 142 Hukum Permintaan), hukum permintaan menyatakan bahwa jika harga suatu barang naik, maka jumlah barang yang diminta pembeli akan…",
            "options": ["Semakin berkurang", "Semakin bertambah banyak", "Tetap tidak berubah", "Menjadi nol serta merta"],
            "answer": 0,
            "why": {"0": "Hukum permintaan berbanding terbalik: Harga naik => jumlah permintaan turun."},
            "distractorWhy": {"1": "Sifat hukum penawaran.", "2": "Permintaan responsif terhadap harga.", "3": "Tidak langsung nol."}
        },
        {
            "id": "ips-d-7-t3-q04",
            "difficulty": "tinggi",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 150 Pasar & Teknologi), dampak positif kemajuan teknologi informasi e-commerce bagi produsen UMKM lokal adalah…",
            "options": [
                "Memperluas jangkauan pasar penjualan hingga ke seluruh pelosok tanpa batas wilayah fisik",
                "Menghilangkan kebutuhan akan kualitas barang",
                "Membuat biaya produksi menjadi lebih mahal secara berlebihan",
                "Menutup kesempatan interaksi dengan konsumen"
            ],
            "answer": 0,
            "why": {"0": "E-commerce membuka akses pasar nasional/global bagi UMKM secara efisien."},
            "distractorWhy": {"1": "Kualitas tetap utama.", "2": "E-commerce justru menekan biaya pemasaran.", "3": "Interaksi makin luas secara digital."}
        },
        {
            "id": "ips-d-7-t3-q05",
            "difficulty": "dasar",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 128 Potensi Hutan), fungsi ekologis hutan hujan tropis Indonesia sebagai 'paru-paru dunia' adalah…",
            "options": ["Menghasilkan oksigen (O₂) dan menyerap karbondioksida (CO₂) di atmosfer", "Menyediakan kayu untuk dieksploitasi tanpa batas", "Menjadi tempat tumpukan sampah plastik", "Menghalang aliran sungai"],
            "answer": 0,
            "why": {"0": "Fotosintesis vegetasi hutan menyerap CO₂ dan melepaskan O₂ menjaga iklim global."},
            "distractorWhy": {"1": "Fungsi ekonomis destruktif.", "2": "Pencemaran lingkungan.", "3": "Erosi."}
        },
        {
            "id": "ips-d-7-t3-q06",
            "difficulty": "sedang",
            "prompt": "Berdasarkan Buku Siswa IPS Kelas VII (hal. 155 Evaluasi Tema 03), lembaga yang menjembatani hubungan antara produsen pembuat barang dan konsumen pemakai barang dinamakan…",
            "options": ["Distributor (pedagang/agen)", "Produsen", "Konsumen akhir", "Pengawas pemerintah"],
            "answer": 0,
            "why": {"0": "Distributor (pedagang besar/eceran) menyalurkan produk dari tempat produksi ke tangan pemakai."},
            "distractorWhy": {"1": "Produsen pembuat.", "2": "Konsumen pemakai.", "3": "Pengawas regulator."}
        }
    ]
}
save_json(os.path.join(tools_dir, "chunk_ips_7_t3.json"), ips7_t3)

print("All remaining Phase D chunks created successfully!")
