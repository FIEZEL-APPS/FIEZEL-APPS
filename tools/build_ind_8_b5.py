import json
import os

data = {
  "code": "KOMP-IND-D-8-BAB5-01",
  "grade": 8,
  "name": "Bab 5: Teks Drama",
  "materi": "Mengenal Pertunjukan & Naskah Drama, Unsur Intrinsik Drama (Tokoh, Dialog, Kramagung, Konflik), Pementasan Drama",
  "cpRef": "Bahasa Indonesia untuk SMP/MTs Kelas VIII (Edisi Revisi)",
  "items": [
    {
      "id": "ind-d-8-b5-q01",
      "difficulty": "dasar",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Drama), pengertian drama secara umum adalah karya sastra dan seni pertunjukan yang bertujuan untuk…",
      "options": [
        "Menggambarkan kehidupan dan watak manusia melalui tingkah laku (akting) dan dialog yang dipentaskan di atas panggung",
        "Menyampaikan fakta objektif hasil observasi lapangan secara sistematis",
        "Menyajikan gagasan argumentatif dalam bentuk bait-bait berirama",
        "Menjelaskan petunjuk langkah-langkah teknis pembuatan suatu barang"
      ],
      "answer": 0,
      "why": {
        "0": "Drama merupakan karya seni yang melukiskan realitas kehidupan dan karakter manusia lewat peragaan akting serta dialog pemeran."
      },
      "distractorWhy": {
        "1": "Teks Laporan Hasil Observasi.",
        "2": "Teks Puisi.",
        "3": "Teks Prosedur."
      }
    },
    {
      "id": "ind-d-8-b5-q02",
      "difficulty": "dasar",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Unsur Drama), perbedaan fisik paling mendasar antara naskah drama dengan cerpen atau novel terletak pada…",
      "options": [
        "Penyajian cerita yang didominasi oleh dialog antartokoh dan petunjuk lakuan (kramagung)",
        "Penggunaan bait dan rima yang terikat oleh aturan larik",
        "Struktur teks yang hanya terdiri atas tesis dan rekomendasi",
        "Penulisan paragraf deskriptif tanpa keterlibatan penokohan"
      ],
      "answer": 0,
      "why": {
        "0": "Naskah drama ditulis dalam format naskah dialog lengkap dengan petunjuk tindakan/ekspresi (kramagung)."
      },
      "distractorWhy": {
        "1": "Ciri khas karya puisi.",
        "2": "Struktur teks eksposisi.",
        "3": "Teks laporan deskriptif."
      }
    },
    {
      "id": "ind-d-8-b5-q03",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Struktur Dialog), tuturan atau kata-kata yang harus diucapkan oleh pemeran tokoh dalam dialog naskah drama dinamakan…",
      "options": [
        "Wawancang",
        "Kramagung",
        "Prolog",
        "Epilog"
      ],
      "answer": 0,
      "why": {
        "0": "Wawancang adalah ucapan/dialog langsung yang dituturkan oleh para tokoh drama."
      },
      "distractorWhy": {
        "1": "Kramagung adalah petunjuk tindakan/ekspresi fisik.",
        "2": "Prolog adalah kata pengantar pembuka drama.",
        "3": "Epilog adalah kata penutup drama."
      }
    },
    {
      "id": "ind-d-8-b5-q04",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Unsur Naskah Drama), petunjuk tindakan, peragaan, atau ekspresi tokoh yang biasanya ditulis dalam tanda kurung atau dicetak miring dinamakan…",
      "options": [
        "Kramagung",
        "Wawancang",
        "Monolog",
        "Solilokui"
      ],
      "answer": 0,
      "why": {
        "0": "Kramagung merupakan petunjuk teknis pementasan atau aksi fisik tokoh di panggung."
      },
      "distractorWhy": {
        "1": "Wawancang adalah bagian kata-kata yang diucapkan.",
        "2": "Monolog adalah percakapan tokoh dengan dirinya sendiri.",
        "3": "Solilokui adalah ungkapan pikiran batin tokoh."
      }
    },
    {
      "id": "ind-d-8-b5-q05",
      "difficulty": "sedang",
      "prompt": "Cermatilah kutipan naskah drama berikut:\nAris: (Mengepalkan tangan dan menatap tajam ke arah Budi) \"Jangan sekali-kali kau mengambil buku itu tanpa izinku!\"\nBerdasarkan kutipan tersebut, kalimat dalam tanda kurung '(Mengepalkan tangan dan menatap tajam ke arah Budi)' berfungsi sebagai…",
      "options": [
        "Kramagung yang memberi petunjuk ekspresi fisik dan emosi pemeran Aris",
        "Wawancang yang harus diucapkan oleh pemeran Budi",
        "Prolog pembuka yang dibacakan oleh narator",
        "Epilog simpulan cerita di akhir pementasan"
      ],
      "answer": 0,
      "why": {
        "0": "Teks dalam kurung tersebut memuat panduan lakuan gestur dan raut wajah (kramagung) bagi pemain."
      },
      "distractorWhy": {
        "1": "Bukan ucapan lisan (wawancang).",
        "2": "Bukan narasi pembuka adegan.",
        "3": "Bukan kalimat penutup drama."
      }
    },
    {
      "id": "ind-d-8-b5-q06",
      "difficulty": "tinggi",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Alur Drama), bagian struktur dialog tempat dimulainya kemunculan masalah atau pertentangan antartokoh dinamakan…",
      "options": [
        "Komplikasi",
        "Orientasi",
        "Resolusi",
        "Klimaks"
      ],
      "answer": 0,
      "why": {
        "0": "Komplikasi berisi pengembangan konflik dan munculnya rintangan yang dihadapi tokoh utama."
      },
      "distractorWhy": {
        "1": "Orientasi merupakan tahap pengenalan tokoh dan latar.",
        "2": "Resolusi merupakan tahap penyelesaian masalah.",
        "3": "Klimaks merupakan puncak tertinggi konflik."
      }
    },
    {
      "id": "ind-d-8-b5-q07",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Penokohan), tokoh dalam drama yang berkedudukan sebagai penentang tokoh utama dan memicu munculnya konflik cerita disebut…",
      "options": [
        "Tokoh antagonis",
        "Tokoh protagonis",
        "Tokoh tritagonis",
        "Tokoh figuran"
      ],
      "answer": 0,
      "why": {
        "0": "Tokoh antagonis membawa penolakan/hambatan yang menimbulkan pertentangan terhadap tokoh protagonis."
      },
      "distractorWhy": {
        "1": "Tokoh protagonis adalah pembawa ide utama/pemeran utama positif.",
        "2": "Tokoh tritagonis adalah penengah konflik.",
        "3": "Tokoh figuran adalah pemeran pelengkap latar."
      }
    },
    {
      "id": "ind-d-8-b5-q08",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Penokohan Drama), fungsi utama tokoh tritagonis dalam jalinan cerita drama adalah…",
      "options": [
        "Sebagai penengah atau pendamai jika terjadi perselisihan antara protagonis dan antagonis",
        "Sebagai musuh utama yang menghancurkan cita-cita protagonis",
        "Sebagai pengatur pencahayaan di luar naskah drama",
        "Sebagai narator tunggal pembaca prolog drama"
      ],
      "answer": 0,
      "why": {
        "0": "Tritagonis berperan sebagai pihak ketiga penengah yang memberikan nasihat atau jalan keluar netral."
      },
      "distractorWhy": {
        "1": "Fungsi tokoh antagonis.",
        "2": "Fungsi penata panggung/tata lampu.",
        "3": "Fungsi narator/dalang."
      }
    },
    {
      "id": "ind-d-8-b5-q09",
      "difficulty": "tinggi",
      "prompt": "Cermatilah dialog berikut:\nRina: \"Mengapa kamu selalu menuduhku mengambil dompetmu, Maya? Kita sudah bersahabat sejak kecil!\"\nMaya: \"Semua bukti mengarah kepadamu! Hanya kamu yang berada di kelas saat barang itu hilang!\"\nBerdasarkan petikan dialog tersebut, jenis konflik yang terjadi adalah…",
      "options": [
        "Konflik eksternal (antarmanusia/antartokoh) akibat kesalahpahaman dan tuduhan",
        "Konflik batin internal dalam diri Rina mengenai cita-cita masa depan",
        "Konflik fisik manusia melawan keganasan alam",
        "Konflik kebudayaan antara tradisi modern dan tradisional"
      ],
      "answer": 0,
      "why": {
        "0": "Dialog menunjukkan percekcokan terbuka antara dua tokoh (Rina dan Maya) sehingga termasuk konflik eksternal antartokoh."
      },
      "distractorWhy": {
        "1": "Bukan konflik batin pribadi.",
        "2": "Bukan pertentangan dengan unsur alam.",
        "3": "Tidak membahas benturan budaya."
      }
    },
    {
      "id": "ind-d-8-b5-q10",
      "difficulty": "tinggi",
      "prompt": "Cermatilah petikan naskah drama berikut:\nPak Hadi: (Duduk termenung di sudut meja, memegang kepalanya) \"Haruskah aku menjual tanah warisan orang tuaku ini demi biaya pengobatan anakku, atau membiarkannya tetap utuh? Sungguh pilihan yang sangat berat…\"\nBerdasarkan kutipan tersebut, jenis konflik yang dialami Pak Hadi adalah…",
      "options": [
        "Konflik batin (internal) karena pergulatan perasaan dalam mengambil keputusan sulit",
        "Konflik sosial eksternal akibat bentrok warga desa",
        "Konflik ideologi antarpartai politik",
        "Konflik fisik perkelahian di atas panggung"
      ],
      "answer": 0,
      "why": {
        "0": "Pak Hadi mengalami perebutan batin dan keraguan dilematis di dalam dirinya sendiri."
      },
      "distractorWhy": {
        "1": "Tidak ada bentrokan dengan warga lain.",
        "2": "Tidak berkaitan dengan paham politik.",
        "3": "Tidak ada pertarungan fisik."
      }
    },
    {
      "id": "ind-d-8-b5-q11",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Alur dan Plot), titik puncak ketegangan cerita dalam naskah drama ketika masalah mencapai tingkat paling intens dinamakan…",
      "options": [
        "Klimaks",
        "Antiklimaks / Peleraian",
        "Orientasi",
        "Resolusi"
      ],
      "answer": 0,
      "why": {
        "0": "Klimaks adalah puncak ketegangan di mana nasib tokoh utama ditentukan."
      },
      "distractorWhy": {
        "1": "Antiklimaks adalah tahap meredanya ketegangan.",
        "2": "Orientasi adalah tahap awal cerita.",
        "3": "Resolusi adalah penyelesaian akhir."
      }
    },
    {
      "id": "ind-d-8-b5-q12",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Latar Drama), unsur latar (setting) dalam pertunjukan drama mencakup tiga hal utama, yaitu…",
      "options": [
        "Latar tempat, latar waktu, dan latar suasana",
        "Latar belakang penulis, latar pendidikan, dan latar usia",
        "Latar musik, latar kamera, dan latar penonton",
        "Latar sampul, latar halaman, dan latar cetakan"
      ],
      "answer": 0,
      "why": {
        "0": "Setting drama membentuk gambaran lokasi kejadian, masa berlangsungnya cerita, dan situasi emosional pentas."
      },
      "distractorWhy": {
        "1": "Merupakan biografi pengarang.",
        "2": "Istilah produksi audio visual.",
        "3": "Istilah tata letak buku."
      }
    },
    {
      "id": "ind-d-8-b5-q13",
      "difficulty": "tinggi",
      "prompt": "Cermatilah deskripsi adegan berikut:\nSuara gemuruh petir bersahut-sahutan diiringi tiupan angin kencang. Cahaya lampu panggung temaram kebiruan. Para warga berlarian ke sana kemari sambil berteriak ketakutan.\nBerdasarkan deskripsi adegan tersebut, latar suasana yang tercipta adalah…",
      "options": [
        "Mencekam dan penuh kecemasan",
        "Gembira dan penuh suka cita",
        "Hening dan penuh kedamaian",
        "Lucu dan mengundang gelak tawa"
      ],
      "answer": 0,
      "why": {
        "0": "Kombinasi bunyi petir, lampu temaram, dan jeritan warga menciptakan nuansa genting mencekam."
      },
      "distractorWhy": {
        "1": "Bertentangan dengan situasi bahaya.",
        "2": "Keadaan sangat bising dan kacau.",
        "3": "Tidak ada unsur humor."
      }
    },
    {
      "id": "ind-d-8-b5-q14",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Kebahasaan Drama), ragam bahasa yang dominan digunakan dalam dialog naskah drama adalah…",
      "options": [
        "Bahasa lisan yang komunikatif menggunakan kalimat langsung dan kata sapaan",
        "Bahasa baku ilmiah lugas seperti karya tulis penelitian formal",
        "Bahasa rumus matematika dan simbol logika",
        "Bahasa hukum perundang-undangan resmi"
      ],
      "answer": 0,
      "why": {
        "0": "Dialog drama merepresentasikan percakapan nyata antarmanusia sehingga menggunakan tuturan langsung serta kata sapaan."
      },
      "distractorWhy": {
        "1": "Bahasa karya ilmiah laras akademik.",
        "2": "Bahasa notasi eksakta.",
        "3": "Bahasa laras hukum formal."
      }
    },
    {
      "id": "ind-d-8-b5-q15",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Kaidah Kebahasaan), kata kerja aksi (action verbs) sering ditemukan pada bagian kramagung untuk menggambarkan…",
      "options": [
        "Tindakan atau perbuatan fisik yang harus dilakukan oleh pemain di panggung",
        "Pengertian definisi kata menurut kamus",
        "Sifat abstrak seperti kejujuran dan keberanian",
        "Urutan angka statistik pementasan"
      ],
      "answer": 0,
      "why": {
        "0": "Kata kerja aksi (seperti 'melangkah', 'menunjuk', 'berlutut') menuntun gerakan nyata pemeran."
      },
      "distractorWhy": {
        "1": "Fungsi kalimat definisi.",
        "2": "Nomina abstrak.",
        "3": "Data kuantitatif."
      }
    },
    {
      "id": "ind-d-8-b5-q16",
      "difficulty": "tinggi",
      "prompt": "Cermatilah prolog berikut:\n\"Setelah tiga tahun merantau di negeri orang, akhirnya Danu melangkah kembali ke kampung halamannya. Kemudian, ia tertegun melihat rumah tuanya telah kosong…\"\nPenggunaan kata 'setelah' dan 'kemudian' dalam prolog naskah drama tersebut menandakan kaidah kebahasaan berupa…",
      "options": [
        "Konjungsi kronologis (urutan waktu)",
        "Kata kerja relasional definisi",
        "Kalimat tanya retoris",
        "Kata ganti penanya"
      ],
      "answer": 0,
      "why": {
        "0": "Kata 'setelah' dan 'kemudian' memuat keterhubungan urutan kejadian secara kronologis."
      },
      "distractorWhy": {
        "1": "Verba definisi menggunakan 'adalah'.",
        "2": "Bukan bentuk pertanyaan.",
        "3": "Bukan kata tanya."
      }
    },
    {
      "id": "ind-d-8-b5-q17",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Penyuntingan Drama), tujuan utama kegiatan menyunting naskah drama sebelum dipentaskan adalah…",
      "options": [
        "Memperbaiki kesalahan ejaan, tanda baca, kelogisan dialog, serta keselarasan kramagung",
        "Mengubah naskah drama menjadi artikel ilmiah populer",
        "Menghilangkan seluruh dialog tokoh sehingga hanya tersisa musik penutup",
        "Menjual hak cipta naskah kepada sutradara asing"
      ],
      "answer": 0,
      "why": {
        "0": "Menyunting bertujuan menyempurnakan keutuhan naskah dari segi EBI, keterbacaan dialog, dan instruksi teknis kramagung."
      },
      "distractorWhy": {
        "1": "Mengubah jenis genre teks.",
        "2": "Menghancurkan struktur naskah drama.",
        "3": "Tindakan transaksi bisnis."
      }
    },
    {
      "id": "ind-d-8-b5-q18",
      "difficulty": "dasar",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Pementasan Drama), sosok yang bertanggung jawab memimpin proses latihan, menafsirkan naskah, dan mengarahkan akting para pemain di panggung adalah…",
      "options": [
        "Sutradara",
        "Produser",
        "Penata panggung",
        "Penonton"
      ],
      "answer": 0,
      "why": {
        "0": "Sutradara adalah pemimpin artistik utama yang mengatur jalannya adegan dan akting pemain."
      },
      "distractorWhy": {
        "1": "Produser bertanggung jawab pada pendanaan.",
        "2": "Penata panggung mengurus properti dan dekorasi.",
        "3": "Penonton adalah penikmat pertunjukan."
      }
    },
    {
      "id": "ind-d-8-b5-q19",
      "difficulty": "sedang",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Unsur Pementasan), unsur tata panggung (scenery) dan penataan lampu (lighting) dalam pertunjukan drama berfungsi untuk…",
      "options": [
        "Mendukung keutuhan latar tempat, waktu, dan suasana adegan agar terasa hidup bagi penonton",
        "Menggantikan peran actor dalam menyampaikan dialog utama",
        "Menghitung penjualan tiket penonton pementasan",
        "Menulis ulang naskah drama di balik panggung"
      ],
      "answer": 0,
      "why": {
        "0": "Dekorasi panggung dan pencahayaan memperkuat efek visual konteks tempat serta emosi adegan."
      },
      "distractorWhy": {
        "1": "Pemeran utama tetap menyampaikan dialog.",
        "2": "Tugas seksi tiket/bendahara.",
        "3": "Tugas penulis naskah."
      }
    },
    {
      "id": "ind-d-8-b5-q20",
      "difficulty": "tinggi",
      "prompt": "Berdasarkan Buku Siswa Bahasa Indonesia Kelas VIII (Bab 5 Evaluasi Pementasan), sebuah pementasan drama dinilai berhasil dan memukau apabila…",
      "options": [
        "Para pemain mampu menghayati karakter tokoh, menyampaikan dialog secara jelas, serta menyelaraskan ekspresi dengan petunjuk kramagung",
        "Pemain hafal naskah tetapi tampil kaku tanpa penjiwaan emosi",
        "Tata lampu padam total selama pertunjukan berlangsung",
        "Dialog diucapkan secara terburu-buru tanpa memperhatikan jeda intonasi"
      ],
      "answer": 0,
      "why": {
        "0": "Keberhasilan pertunjukan drama ditentukan oleh kedalaman penghayatan peran, kejernihan vokal, dan keserasian ekspresi fisik."
      },
      "distractorWhy": {
        "1": "Penampilan kaku mengurangi kualitas akting.",
        "2": "Lampu padam menghalangi pengamatan penonton.",
        "3": "Intonasi terburu-buru merusak penyampaian pesan."
      }
    }
  ]
}

file_path = r"c:\Users\hp\fiezel-apps\tools\chunk_ind_8_b5.json"
with open(file_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Saved chunk_ind_8_b5.json successfully. Total items:", len(data["items"]))
