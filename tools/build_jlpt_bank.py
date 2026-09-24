# tools/build_jlpt_bank.py
# Generates features/speaking-listening/jlpt-listening-bank-v1.json
import json
import os

items = [
  # --- JLPT N5 MONDAI 1 (Task-based) ---
  {
    'id': 'jlpt-n5-m1-01',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_1',
    'mondaiLabel': 'Mondai 1: Task-based Comprehension (課題理解)',
    'title': 'Instruksi Belajar di Kelas',
    'situation': 'Guru perempuan sedang memberikan instruksi tugas kepada murid laki-laki di dalam kelas.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q1.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 1',
    'scriptJapanese': '先生：みなさん、きょうは じゅっぺーじから じゅうにぺーじまで よんでください。そして、じゅうさんぺーじの もんだいを やってください。\n学生：先生、じゅうさんぺーじの もんだいは ぜんぶですか。\n先生：いいえ、いちばんと にばんだけ やってください。',
    'scriptRomaji': 'Sensei: Minasan, kyou wa juppeji kara juuni-peji made yonde kudasai. Soshite, juusan-peji no mondai o yatte kudasai.\nGakusei: Sensei, juusan-peji no mondai wa zenbu desu ka.\nSensei: Iie, ichi-ban to ni-ban dake yatte kudasai.',
    'scriptIndonesian': 'Guru: Semuanya, hari ini silakan baca dari halaman 10 sampai halaman 12. Lalu, kerjakan soal di halaman 13.\nMurid: Bu Guru, apakah soal di halaman 13 dikerjakan semuanya?\nGuru: Tidak, kerjakan nomor 1 dan nomor 2 saja.',
    'questionJapanese': '学生は はじめに なにを しますか。',
    'questionIndonesian': 'Apa yang harus dilakukan murid terlebih dahulu?',
    'options': [
      {'id': 1, 'text': '10ページから 12ページを よみます', 'textId': 'Membaca halaman 10 sampai 12'},
      {'id': 2, 'text': '13ページの もんだいを ぜんぶ やります', 'textId': 'Mengerjakan semua soal di halaman 13'},
      {'id': 3, 'text': '13ページの 1ばんと 2ばんを やります', 'textId': 'Mengerjakan halaman 13 nomor 1 dan 2 saja'},
      {'id': 4, 'text': '本を とじます', 'textId': 'Menutup buku'}
    ],
    'answerIndex': 0,
    'explain': 'Guru menginstruksikan: "きょうは じゅっぺーじから じゅうにぺーじまで よんでください。そして、じゅうさんぺーじの もんだいを..." (Hari ini baca hal 10-12, kemudian kerjakan soal). Pertanyaan menanyakan apa yang dilakukan \'pertama kali\' (はじめに), sehingga jawabannya membaca halaman 10-12 (Pilihan 1).',
    'vocabularyKey': [
      {'ja': 'ページ (peji)', 'id': 'halaman buku'},
      {'ja': 'はじめに (hajime ni)', 'id': 'pertama-tama / terlebih dahulu'},
      {'ja': '～から～まで', 'id': 'dari ... sampai ...'},
      {'ja': 'だけ (dake)', 'id': 'hanya / saja'}
    ]
  },
  {
    'id': 'jlpt-n5-m1-02',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_1',
    'mondaiLabel': 'Mondai 1: Task-based Comprehension (課題理解)',
    'title': 'Membeli Buah di Supermarket',
    'situation': 'Dua orang mahasiswa laki-laki dan perempuan sedang berbelanja bahan makanan untuk acara makan bersama.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q1.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 1',
    'scriptJapanese': '女の人：りんごが やすいですね。みっつ かいましょうか。\n男の人：でも、きのう バナナを たくさん かいましたよ。\n女の人：そうですか。じゃあ、りんごは ふたつに しましょう。みかんも ひとつ かいますか。\n男の人：いいえ、みかんは いえに まだ あります。',
    'scriptRomaji': 'Onna no hito: Ringo ga yasui desu ne. Mittsu kaimashou ka.\nOtoko no hito: Demo, kinou banana o takusan kaimashita yo.\nOnna no hito: Sou desu ka. Jaa, ringo wa futatsu ni shimashou. Mikan mo hitotsu kaimasu ka.\nOtoko no hito: Iie, mikan wa ie ni mada arimasu.',
    'scriptIndonesian': 'Perempuan: Apelnya murah ya. Mau beli tiga buah?\nLaki-laki: Tapi kemarin kita sudah beli banyak pisang lho.\nPerempuan: Begitu ya. Kalau begitu, apelnya dua buah saja ya. Mau beli jeruk satu juga?\nLaki-laki: Tidak, jeruk di rumah masih ada.',
    'questionJapanese': 'ふたりは なにを いくつ かいますか。',
    'questionIndonesian': 'Apa yang dibeli oleh mereka berdua dan berapa jumlahnya?',
    'options': [
      {'id': 1, 'text': 'りんごを 3つ', 'textId': 'Apel 3 buah'},
      {'id': 2, 'text': 'りんごを 2つ', 'textId': 'Apel 2 buah'},
      {'id': 3, 'text': 'りんごを 2つと みかんを 1つ', 'textId': 'Apel 2 buah dan jeruk 1 buah'},
      {'id': 4, 'text': 'バナナと みかん', 'textId': 'Pisang dan jeruk'}
    ],
    'answerIndex': 1,
    'explain': 'Awalnya perempuan mengajak beli 3 apel, namun laki-laki mengingatkan sudah ada pisang. Perempuan memutuskan: "じゃあ、りんごは ふたつに しましょう" (Kalau begitu apel 2 saja). Jeruk tidak jadi dibeli karena di rumah masih ada. Maka yang dibeli adalah 2 buah apel (Pilihan 2).',
    'vocabularyKey': [
      {'ja': 'ひとつ、ふたつ、みっつ', 'id': 'satu, dua, tiga (penghitung benda bulat/umum)'},
      {'ja': '～に しましょう', 'id': 'memutuskan untuk ...'},
      {'ja': 'まだ (mada)', 'id': 'masih'}
    ]
  },
  {
    'id': 'jlpt-n5-m1-03',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_1',
    'mondaiLabel': 'Mondai 1: Task-based Comprehension (課題理解)',
    'title': 'Janji Bertemu di Stasiun',
    'situation': 'Seorang wanita dan seorang pria menelepon untuk menentukan lokasi bertemu di stasiun kereta.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q1.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 1',
    'scriptJapanese': '男の人：あしたの まちあわせは えきの ひがしぐちで いいですか。\n女の人：ひがしぐちは いま こうじをして いますよ。にしぐちの ほんやの まえに しませんか。\n男の人：わかりました。かいさつぐちの ちかくですね。\n女の人：はい、そうです。',
    'scriptRomaji': 'Otoko no hito: Ashita no machiawase wa eki no higashiguchi de ii desu ka.\nOnna no hito: Higashiguchi wa ima kouji o shite imasu yo. Nishiguchi no hon\'ya no mae ni shimasen ka.\nOtoko no hito: Wakarimashita. Kaisatsuguchi no chikaku desu ne.\nOnna no hito: Hai, sou desu.',
    'scriptIndonesian': 'Pria: Apakah janji temu besok di pintu timur stasiun tidak apa-apa?\nWanita: Pintu timur sekarang sedang ada perbaikan konstruksi lho. Bagaimana kalau di depan toko buku pintu barat?\nPria: Baik, saya mengerti. Dekat gerbang tiket kan?\nWanita: Ya, betul.',
    'questionJapanese': 'ふたりは あした どこで あいますか。',
    'questionIndonesian': 'Di mana mereka berdua akan bertemu besok?',
    'options': [
      {'id': 1, 'text': 'えきの ひがしぐち', 'textId': 'Pintu timur stasiun'},
      {'id': 2, 'text': 'にしぐちの ほんやの まえ', 'textId': 'Di depan toko buku pintu barat'},
      {'id': 3, 'text': 'えきの なかの カフェ', 'textId': 'Kafe di dalam stasiun'},
      {'id': 4, 'text': 'こうじの ばしょ', 'textId': 'Lokasi tempat konstruksi'}
    ],
    'answerIndex': 1,
    'explain': 'Pria mengusulkan pintu timur (ひがしぐち), tetapi wanita menolak karena ada perbaikan (こうじ), dan menyarankan: "にしぐちの ほんやの まえに しませんか" (Bagaimana kalau depan toko buku pintu barat?). Pria menyetujuinya. Jadi tempat bertemunya adalah di depan toko buku pintu barat (Pilihan 2).',
    'vocabularyKey': [
      {'ja': 'まちあわせ (machiawase)', 'id': 'janji bertemu'},
      {'ja': 'ひがしぐち / にしぐち', 'id': 'pintu timur / pintu barat'},
      {'ja': 'ほんや (hon\'ya)', 'id': 'toko buku'},
      {'ja': 'こうじ (kouji)', 'id': 'pekerjaan konstruksi / perbaikan'}
    ]
  },
  {
    'id': 'jlpt-n5-m1-04',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_1',
    'mondaiLabel': 'Mondai 1: Task-based Comprehension (課題理解)',
    'title': 'Memilih Payung Saat Hari Hujan',
    'situation': 'Ibu dan anak laki-lakinya berbicara sebelum anak berangkat ke sekolah saat cuaca mendung.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q1.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 1',
    'scriptJapanese': 'お母さん：たけし、そとは あめが ふりそうよ。かさを もって いきなさい。\n男の子：ぼくの あおい かさは どこ？\nお母さん：あおい かさは こわれて いるわ。げんかんの くろい かさを つかいなさい。\n男の子：うん、わかった。いってきます！',
    'scriptRomaji': 'Okaasan: Takeshi, soto wa ame ga furi-sou yo. Kasa o motte ikinasai.\nOtokonoko: Boku no aoi kasa wa doko?\nOkaasan: Aoi kasa wa kowarete iru wa. Genkan no kuroi kasa o tsukainasai.\nOtokonoko: Un, wakatta. Ittekimasu!',
    'scriptIndonesian': 'Ibu: Takeshi, di luar sepertinya mau hujan lho. Bawalah payung!\nAnak: Payung biruku di mana?\nIbu: Payung yang biru rusak lho. Pakailah payung hitam yang ada di pintu masuk (genkan).\nAnak: Ya, baiklah. Berangkat dulu!',
    'questionJapanese': '男の子は どのかさを もって いきますか。',
    'questionIndonesian': 'Payung mana yang dibawa oleh anak laki-laki?',
    'options': [
      {'id': 1, 'text': 'あおい かさ', 'textId': 'Payung biru'},
      {'id': 2, 'text': 'げんかんの くろい かさ', 'textId': 'Payung hitam di genkan'},
      {'id': 3, 'text': 'しろい かさ', 'textId': 'Payung putih'},
      {'id': 4, 'text': 'かさは もっていかない', 'textId': 'Tidak membawa payung'}
    ],
    'answerIndex': 1,
    'explain': 'Payung biru anak tersebut rusak (こわれている), dan ibunya menyuruh memakai payung hitam yang ada di genkan: "げんかんの くろい かさを つかいなさい". Anak menyetujuinya, sehingga ia membawa payung hitam (Pilihan 2).',
    'vocabularyKey': [
      {'ja': 'あめが ふる (ame ga furu)', 'id': 'hujan turun'},
      {'ja': 'こわれる (kowareru)', 'id': 'rusak'},
      {'ja': 'げんかん (genkan)', 'id': 'area pintu masuk rumah Jepang'},
      {'ja': 'もっていく (motte iku)', 'id': 'membawa pergi'}
    ]
  },

  # --- JLPT N5 MONDAI 2 (Point comprehension) ---
  {
    'id': 'jlpt-n5-m2-01',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_2',
    'mondaiLabel': 'Mondai 2: Point Comprehension (ポイント理解)',
    'title': 'Alasan Tidak Datang ke Pesta',
    'situation': 'Seorang pria bertanya kepada temannya mengapa kemarin temannya tidak hadir di pesta ulang tahun.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q2.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 2',
    'scriptJapanese': '男の人：田中さん、きのうの パーティー、どうして こなかったんですか。\n女の人：いきたかったんですが、きのうは あたまが いたくて、いえで ねて いました。\n男の人：そうですか。もう だいじょうぶですか。\n女の人：ええ、きょうは もう すっかり よくなりました。ありがとう。',
    'scriptRomaji': 'Otoko no hito: Tanaka-san, kinou no paatii, doushite konakatta n desu ka.\nOnna no hito: Ikitakatta n desu ga, kinou wa atama ga itakute, ie de nete imashita.\nOtoko no hito: Sou desu ka. Mou daijoubu desu ka.\nOnna no hito: Ee, kyou wa mou sukkari yoku narimashita. Arigatou.',
    'scriptIndonesian': 'Pria: Tanaka-san, pesta kemarin kenapa tidak datang?\nWanita: Sebenarnya ingin pergi, tapi kemarin kepala saya sakit dan tidur beristirahat di rumah.\nPria: Begitu ya. Apakah sekarang sudah tidak apa-apa?\nWanita: Ya, hari ini sudah sembuh total. Terima kasih.',
    'questionJapanese': '田中さんは どうして きのう パーティーに きませんでしたか。',
    'questionIndonesian': 'Mengapa Tanaka-san kemarin tidak datang ke pesta?',
    'options': [
      {'id': 1, 'text': 'しごとが いそがしかったから', 'textId': 'Karena pekerjaannya sibuk'},
      {'id': 2, 'text': 'あたまが いたかったから', 'textId': 'Karena sakit kepala'},
      {'id': 3, 'text': 'パーティーを わすれていたから', 'textId': 'Karena lupa ada pesta'},
      {'id': 4, 'text': 'ともだちが いえに きたから', 'textId': 'Karena ada teman datang ke rumah'}
    ],
    'answerIndex': 1,
    'explain': 'Wanita tersebut menjelaskan alasannya langsung: "きのうは あたまが いたくて、いえで ねて いました" (Kemarin kepala saya sakit dan tidur di rumah). Maka alasan tidak datang adalah karena sakit kepala (Pilihan 2).',
    'vocabularyKey': [
      {'ja': 'あたまが いたい (atama ga itai)', 'id': 'sakit kepala'},
      {'ja': 'ねる (neru)', 'id': 'tidur / beristirahat'},
      {'ja': 'どうして (doushite)', 'id': 'mengapa / kenapa'},
      {'ja': 'すっかり (sukkari)', 'id': 'sepenuhnya / tuntas'}
    ]
  },
  {
    'id': 'jlpt-n5-m2-02',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_2',
    'mondaiLabel': 'Mondai 2: Point Comprehension (ポイント理解)',
    'title': 'Mencari Kunci Rumah',
    'situation': 'Seorang pria mencari kunci rumahnya yang hilang dan bertanya kepada teman sekamarnya.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q2.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 2',
    'scriptJapanese': '男の人：あれ？ぼくの かぎが ない。つくえの うえに おいたはずなのに。\n女の人：つくえの うえには ほんしか ないわよ。かばんの なかは みた？\n男の人：うん、かばんの なかにも ないよ。\n女の人：あ、いすの したに おちているわよ！\n男の人：あ、ほんとだ。ありがとう！',
    'scriptRomaji': 'Otoko no hito: Are? Boku no kagi ga nai. Tsukue no ue ni oita hazu na noni.\nOnna no hito: Tsukue no ue ni wa hon shika nai wa yo. Kaban no naka wa mita?\nOtoko no hito: Un, kaban no naka ni mo nai yo.\nOnna no hito: A, isu no shita ni ochite iru wa yo!\nOtoko no hito: A, honto da. Arigatou!',
    'scriptIndonesian': 'Pria: Lho? Kunciku tidak ada. Padahal seharusnya kutitipkan di atas meja.\nWanita: Di atas meja cuma ada buku lho. Sudah periksa di dalam tas?\nPria: Ya, di dalam tas juga tidak ada.\nWanita: Ah, ada yang jatuh di bawah kursi tuh!\nPria: Ah, benar sekali. Terima kasih!',
    'questionJapanese': 'かぎは どこに ありましたか。',
    'questionIndonesian': 'Di manakah kunci tersebut berada?',
    'options': [
      {'id': 1, 'text': 'つくえの うえ', 'textId': 'Di atas meja'},
      {'id': 2, 'text': 'かばんの なか', 'textId': 'Di dalam tas'},
      {'id': 3, 'text': 'いすの した', 'textId': 'Di bawah kursi'},
      {'id': 4, 'text': 'ドアの まえ', 'textId': 'Di depan pintu'}
    ],
    'answerIndex': 2,
    'explain': 'Wanita melihat kunci tersebut jatuh di bawah kursi: "あ、いすの したに おちているわよ！" (Ah, jatuh di bawah kursi!). Pria mengonfirmasinya: "ほんとだ" (Benar sekali). Jadi posisinya di bawah kursi (Pilihan 3).',
    'vocabularyKey': [
      {'ja': 'かぎ (kagi)', 'id': 'kunci'},
      {'ja': '～の うえ / した / なか', 'id': 'atas / bawah / dalam'},
      {'ja': 'おちる (ochiru)', 'id': 'jatuh'}
    ]
  },
  {
    'id': 'jlpt-n5-m2-03',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_2',
    'mondaiLabel': 'Mondai 2: Point Comprehension (ポイント理解)',
    'title': 'Jadwal Kursus Bahasa Jepang',
    'situation': 'Seorang siswa asing menanyakan jadwal kursus kepada staf resepsionis sekolah bahasa.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q2.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 2',
    'scriptJapanese': '学生：すみません、にほんごの クラスは なんじから ですか。\n受付：あさの クラスは くじはんに はじまって、じゅういちじはんに おわります。よるの クラスは ろくじはんに はじまります。\n学生：わたしは あさの クラスを うけます。\n受付：では、あしたの くじはんまでに きてください。',
    'scriptRomaji': 'Gakusei: Sumimasen, nihongo no kurasu wa nan-ji kara desu ka.\nUketsuke: Asa no kurasu wa kuji-han ni hajimatte, juuichi-ji-han ni owarimasu. Yoru no kurasu wa rokuji-han ni hajimarimasu.\nGakusei: Watashi wa asa no kurasu o ukemasu.\nUketsuke: Dewa, ashita no kuji-han made ni kite kudasai.',
    'scriptIndonesian': 'Siswa: Permisi, kelas bahasa Jepang mulai jam berapa?\nResepsionis: Kelas pagi dimulai pukul 09:30 dan selesai pukul 11:30. Kelas malam dimulai pukul 18:30.\nSiswa: Saya mengambil kelas pagi.\nResepsionis: Kalau begitu, silakan datang sebelum jam 09:30 besok.',
    'questionJapanese': '学生の クラスは なんじに はじまりますか。',
    'questionIndonesian': 'Pukul berapa kelas siswa tersebut dimulai?',
    'options': [
      {'id': 1, 'text': '9時 (くじ)', 'textId': 'Pukul 09:00'},
      {'id': 2, 'text': '9時半 (くじはん)', 'textId': 'Pukul 09:30'},
      {'id': 3, 'text': '11時半 (じゅういちじはん)', 'textId': 'Pukul 11:30'},
      {'id': 4, 'text': '6時半 (ろくじはん)', 'textId': 'Pukul 18:30'}
    ],
    'answerIndex': 1,
    'explain': 'Siswa memilih kelas pagi (あさのクラス). Resepsionis menyatakan kelas pagi dimulai pukul 9:30: "あさの クラスは くじはんに はじまって". 11:30 adalah waktu selesai (おわります), dan 18:30 adalah kelas malam. Jadi jawabannya 09:30 (Pilihan 2).',
    'vocabularyKey': [
      {'ja': 'なんじから (nan-ji kara)', 'id': 'dari jam berapa'},
      {'ja': '～はん (han)', 'id': 'setengah (30 menit)'},
      {'ja': 'はじまる (hajimaru)', 'id': 'dimulai'},
      {'ja': 'おわる (owaru)', 'id': 'selesai'}
    ]
  },
  {
    'id': 'jlpt-n5-m2-04',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_2',
    'mondaiLabel': 'Mondai 2: Point Comprehension (ポイント理解)',
    'title': 'Minuman Favorit',
    'situation': 'Di sebuah kafe, seorang pria memesan minuman untuk dirinya dan temannya.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q2.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 2',
    'scriptJapanese': '男の人：なにを のむ？コーヒーにする？\n女の人：うーん、わたしは コーヒーは あまり のまないの。おちゃか ジュースが いいな。\n男の人：この みせは りんごジュースが おいしいよ。\n女の人：じゃあ、それに する！',
    'scriptRomaji': 'Otoko no hito: Nani o nomu? Koohii ni suru?\nOnna no hito: Uun, watashi wa koohii wa amari nomanai no. Ocha ka juusu ga ii na.\nOtoko no hito: Kono mise wa ringo juusu ga oishii yo.\nOnna no hito: Jaa, sore ni suru!',
    'scriptIndonesian': 'Pria: Mau minum apa? Mau kopi?\nWanita: Hmm, saya tidak terlalu sering minum kopi. Lebih suka teh atau jus.\nPria: Di toko ini jus apelnya enak lho.\nWanita: Kalau begitu, saya pilih itu!',
    'questionJapanese': '女の人は なにを のみますか。',
    'questionIndonesian': 'Minuman apa yang diminum oleh si wanita?',
    'options': [
      {'id': 1, 'text': 'コーヒー', 'textId': 'Kopi'},
      {'id': 2, 'text': 'おちゃ', 'textId': 'Teh hijau'},
      {'id': 3, 'text': 'りんごジュース', 'textId': 'Jus apel'},
      {'id': 4, 'text': 'みず', 'textId': 'Air putih'}
    ],
    'answerIndex': 2,
    'explain': 'Wanita menolak kopi ("あまり のまない"). Ketika pria merekomendasikan jus apel toko itu enak, wanita menyetujui: "じゃあ、それに する！" (Kalau begitu, saya pesan itu!). Maka yang diminum adalah jus apel (Pilihan 3).',
    'vocabularyKey': [
      {'ja': 'あまり～ない (amari ... nai)', 'id': 'tidak terlalu / jarang'},
      {'ja': '～に する (ni suru)', 'id': 'menentukan pilihan pada ...'},
      {'ja': 'おいしい (oishii)', 'id': 'enak / lezat'}
    ]
  },

  # --- JLPT N5 MONDAI 3 (Utterance expressions) ---
  {
    'id': 'jlpt-n5-m3-01',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_3',
    'mondaiLabel': 'Mondai 3: Utterance Expressions (発話表現)',
    'title': 'Masuk ke Ruang Guru / Kantor',
    'situation': 'Seorang murid hendak mengetuk pintu dan masuk ke dalam ruangan guru.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q3.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 3',
    'scriptJapanese': 'せんせいの へやに はいります。なんと言いますか。',
    'scriptRomaji': 'Sensei no heya ni hairimasu. Nanto iimasu ka.',
    'scriptIndonesian': 'Anda akan masuk ke dalam ruangan guru. Apa yang Anda ucapkan?',
    'questionJapanese': 'へやに はいるとき、なんと言いますか。',
    'questionIndonesian': 'Saat masuk ke dalam ruangan, apa yang diucapkan?',
    'options': [
      {'id': 1, 'text': 'しつれいします', 'textId': 'Shitsurei shimasu (Permisi)'},
      {'id': 2, 'text': 'じゃあ、また', 'textId': 'Jaa, mata (Sampai jumpa lagi)'},
      {'id': 3, 'text': 'ごちそうさまでした', 'textId': 'Gochisousama deshita (Terima kasih atas makanannya)'}
    ],
    'answerIndex': 0,
    'explain': 'Ungkapan sopan standar saat memasuki ruangan orang lain atau kantor guru dalam budaya Jepang adalah "しつれいします" (Shitsurei shimasu - Permisi / Maaf mengganggu). Pilihan 2 untuk pamit berpisah, pilihan 3 setelah makan.',
    'vocabularyKey': [
      {'ja': 'しつれいします (shitsurei shimasu)', 'id': 'permisi (saat masuk ruangan/bertemu)'},
      {'ja': 'はいる (hairu)', 'id': 'masuk'},
      {'ja': 'へや (heya)', 'id': 'kamar / ruangan'}
    ]
  },
  {
    'id': 'jlpt-n5-m3-02',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_3',
    'mondaiLabel': 'Mondai 3: Utterance Expressions (発話表現)',
    'title': 'Berpamitan Meninggalkan Rumah',
    'situation': 'Seorang anak bersiap-siap berangkat sekolah dan berpamitan kepada ibunya di rumah.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q3.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 3',
    'scriptJapanese': 'あさ、いえを でます。かぞくに なんと言いますか。',
    'scriptRomaji': 'Asa, ie o demasu. Kazoku ni nanto iimasu ka.',
    'scriptIndonesian': 'Pagi hari Anda meninggalkan rumah. Apa yang Anda katakan kepada keluarga?',
    'questionJapanese': 'いえを でるとき、なんと言いますか。',
    'questionIndonesian': 'Saat keluar rumah di pagi hari, apa yang diucapkan?',
    'options': [
      {'id': 1, 'text': 'ただいま', 'textId': 'Tadaima (Saya pulang)'},
      {'id': 2, 'text': 'いってきます', 'textId': 'Ittekimasu (Saya berangkat dulu)'},
      {'id': 3, 'text': 'おかえりなさい', 'textId': 'Okaerinasai (Selamat datang kembali)'}
    ],
    'answerIndex': 1,
    'explain': 'Saat seseorang meninggalkan rumah untuk pergi bekerja/sekolah, ia mengucapkan "いってきます" (Ittekimasu - Saya pergi dan akan kembali). Orang yang tinggal menjawab "いってらっしゃい". "Tadaima" diucapkan saat baru pulang ke rumah.',
    'vocabularyKey': [
      {'ja': 'いってきます (ittekimasu)', 'id': 'saya berangkat (diucapkan orang yang pergi)'},
      {'ja': 'いってらっしゃい (itterasshai)', 'id': 'hati-hati di jalan (dijawab orang rumah)'},
      {'ja': 'ただいま (tadaima)', 'id': 'aku pulang'}
    ]
  },
  {
    'id': 'jlpt-n5-m3-03',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_3',
    'mondaiLabel': 'Mondai 3: Utterance Expressions (発話表現)',
    'title': 'Memberikan Hadiah / Oleh-oleh',
    'situation': 'Anda memberikan bingkisan kue oleh-oleh kepada teman Anda.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q3.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 3',
    'scriptJapanese': 'ともだちに プレゼントを わたします。なんと言いますか。',
    'scriptRomaji': 'Tomodachi ni purezento o watashimasu. Nanto iimasu ka.',
    'scriptIndonesian': 'Anda menyerahkan hadiah kepada teman. Apa yang Anda katakan?',
    'questionJapanese': 'プレゼントを わたすとき、なんと言いますか。',
    'questionIndonesian': 'Saat menyerahkan kado, apa yang diucapkan?',
    'options': [
      {'id': 1, 'text': 'これ、どうぞ', 'textId': 'Kore, douzo (Ini, silakan)'},
      {'id': 2, 'text': 'いただきます', 'textId': 'Itadakimasu (Selamat makan / saya terima)'},
      {'id': 3, 'text': 'どういたしまして', 'textId': 'Dou itashimashite (Sama-sama)'}
    ],
    'answerIndex': 0,
    'explain': 'Ketika menyerahkan hadiah atau menawarkan sesuatu kepada orang lain, ungkapan yang paling natural adalah "これ、どうぞ" (Kore, douzo - Ini, silakan untukmu).',
    'vocabularyKey': [
      {'ja': 'どうぞ (douzo)', 'id': 'silakan'},
      {'ja': 'わたす (watasu)', 'id': 'menyerahkan'},
      {'ja': 'プレゼント (purezento)', 'id': 'kado / hadiah'}
    ]
  },

  # --- JLPT N5 MONDAI 4 (Quick response) ---
  {
    'id': 'jlpt-n5-m4-01',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_4',
    'mondaiLabel': 'Mondai 4: Quick Response (即時応答)',
    'title': 'Komentar Cuaca Hari Ini',
    'situation': 'Seseorang menyapa Anda di halte bus membicarakan hawa dingin hari ini.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q4.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 4',
    'scriptJapanese': '男の人：きょうは さむいですね。',
    'scriptRomaji': 'Otoko no hito: Kyou wa samui desu ne.',
    'scriptIndonesian': 'Pria: Hari ini dingin sekali ya.',
    'questionJapanese': 'なんと言って こたえますか。',
    'questionIndonesian': 'Bagaimanakah respons yang tepat?',
    'options': [
      {'id': 1, 'text': 'そうですね。', 'textId': 'Sou desu ne. (Iya, betul sekali ya.)'},
      {'id': 2, 'text': 'どういたしまして。', 'textId': 'Dou itashimashite. (Sama-sama.)'},
      {'id': 3, 'text': 'さようなら。', 'textId': 'Sayounara. (Selamat tinggal.)'}
    ],
    'answerIndex': 0,
    'explain': 'Partikel "ね" di akhir kalimat berfungsi meminta persetujuan. Respon menyetujui yang paling wajar adalah "そうですね" (Sou desu ne - Ya, memang demikian ya).',
    'vocabularyKey': [
      {'ja': 'さむい (samui)', 'id': 'dingin (cuaca/suhu udara)'},
      {'ja': 'そうですね (sou desu ne)', 'id': 'betul juga ya / setuju'}
    ]
  },
  {
    'id': 'jlpt-n5-m4-02',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_4',
    'mondaiLabel': 'Mondai 4: Quick Response (即時応答)',
    'title': 'Menanyakan Kepemilikan Barang',
    'situation': 'Seseorang menunjuk sebuah tas tertinggal di atas bangku kelas.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q4.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 4',
    'scriptJapanese': '女の人：これは だれの かばんですか。',
    'scriptRomaji': 'Onna no hito: Kore wa dare no kaban desu ka.',
    'scriptIndonesian': 'Wanita: Ini tas milik siapa?',
    'questionJapanese': 'なんと言って こたえますか。',
    'questionIndonesian': 'Bagaimanakah respons yang tepat?',
    'options': [
      {'id': 1, 'text': 'あそこです。', 'textId': 'Asoko desu. (Di sebelah sana.)'},
      {'id': 2, 'text': '田中さんのです。', 'textId': 'Tanaka-san no desu. (Milik Sdr. Tanaka.)'},
      {'id': 3, 'text': 'いいえ、ちがいます。', 'textId': 'Iie, chigaimasu. (Bukan, salah.)'}
    ],
    'answerIndex': 1,
    'explain': 'Pertanyaan menanyakan kepemilikan ("だれの" - milik siapa). Jawaban yang menyatakan pemilik adalah "田中さんのです" (Tanaka-san no desu - Milik Tanaka). Pilihan 1 menunjuk tempat, pilihan 3 menjawab pertanyaan apakah.',
    'vocabularyKey': [
      {'ja': 'だれの (dare no)', 'id': 'milik siapa'},
      {'ja': 'かばん (kaban)', 'id': 'tas'}
    ]
  },
  {
    'id': 'jlpt-n5-m4-03',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_4',
    'mondaiLabel': 'Mondai 4: Quick Response (即時応答)',
    'title': 'Ajakan Minum Teh Bersama',
    'situation': 'Teman sekelas mengajak Anda untuk pergi minum teh setelah selesai kuliah.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q4.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 4',
    'scriptJapanese': '女の人：いっしょに おちゃを のみませんか。',
    'scriptRomaji': 'Onna no hito: Issho ni ocha o nomimasen ka.',
    'scriptIndonesian': 'Wanita: Maukah minum teh bersama-sama?',
    'questionJapanese': 'なんと言って こたえますか。',
    'questionIndonesian': 'Bagaimanakah respons yang tepat?',
    'options': [
      {'id': 1, 'text': 'ええ、のみましょう。', 'textId': 'Ee, nomimashou. (Ya, ayo minum bersama.)'},
      {'id': 2, 'text': 'いいえ、のみました。', 'textId': 'Iie, nomimashita. (Tidak, saya sudah minum.)'},
      {'id': 3, 'text': 'はい、おちゃです。', 'textId': 'Hai, ocha desu. (Ya, ini teh.)'}
    ],
    'answerIndex': 0,
    'explain': 'Kalimat "～ませんか" adalah ajakan sopan. Menerima ajakan tersebut direspons dengan "ええ、～ましょう" (Ee, ...-mashou - Ya, ayo kita lakukan). Maka jawabannya "ええ、のみましょう" (Pilihan 1).',
    'vocabularyKey': [
      {'ja': 'いっしょに (issho ni)', 'id': 'bersama-sama'},
      {'ja': '～ませんか (masen ka)', 'id': 'maukah ... (ajakan)'},
      {'ja': '～ましょう (mashou)', 'id': 'mari / ayo ...'}
    ]
  },
  {
    'id': 'jlpt-n5-m4-04',
    'level': 'N5',
    'cefr': 'A1',
    'mondai': 'mondai_4',
    'mondaiLabel': 'Mondai 4: Quick Response (即時応答)',
    'title': 'Menanyakan Hasil Tes Kemarin',
    'situation': 'Teman sekelas menanyakan bagaimana ujian yang baru berlangsung kemarin.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N5Q4.mp3',
    'audioTrack': 'JLPT N5 Vol.2 - Mondai 4',
    'scriptJapanese': '男の人：きのうの テストは どうでしたか。',
    'scriptRomaji': 'Otoko no hito: Kinou no tesuto wa dou deshita ka.',
    'scriptIndonesian': 'Pria: Bagaimana ujian kemarin?',
    'questionJapanese': 'なんと言って こたえますか。',
    'questionIndonesian': 'Bagaimanakah respons yang tepat?',
    'options': [
      {'id': 1, 'text': 'あしたです。', 'textId': 'Ashita desu. (Besok.)'},
      {'id': 2, 'text': 'とても むずかしかったです。', 'textId': 'Totemo muzukashikatta desu. (Sangat sulit.)'},
      {'id': 3, 'text': 'きょうしつに あります。', 'textId': 'Kyoushitsu ni arimasu. (Ada di ruang kelas.)'}
    ],
    'answerIndex': 1,
    'explain': 'Pertanyaan "どうでしたか" menanyakan kesan/keadaan bentuk lampau. Jawaban yang mendeskripsikan keadaan adalah bentuk lampau kata sifat: "とても むずかしかったです" (Sangat sulit - Pilihan 2).',
    'vocabularyKey': [
      {'ja': 'どうでしたか (dou deshita ka)', 'id': 'bagaimana (keadaan lampau)'},
      {'ja': 'むずかしい (muzukashii)', 'id': 'sulit / sukar'},
      {'ja': 'とても (totemo)', 'id': 'sangat'}
    ]
  },

  # --- JLPT N4 MONDAI 1 (Task-based) ---
  {
    'id': 'jlpt-n4-m1-01',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_1',
    'mondaiLabel': 'Mondai 1: Task-based Comprehension (課題理解)',
    'title': 'Tugas Part-time di Restoran',
    'situation': 'Manajer restoran memberikan instruksi persiapan sebelum restoran buka kepada staf paruh waktu baru.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q1.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 1',
    'scriptJapanese': '店長：リーさん、みせが あくまえに、テーブルを ふいて、メニューを ならべてください。\nアルバイト：はい、わかりました。テーブルは もう ふきました。\n店長：あ、ありがとう。じゃあ、メニューを おくまえに、まず おひや（みず）の グラスを カウンターに ならべてくれる？\nアルバイト：はい、すぐ やります！',
    'scriptRomaji': 'Tenchou: Rii-san, mise ga aku mae ni, teeburu o fuite, menyuu o narabete kudasai.\nArubaito: Hai, wakarimashita. Teeburu wa mou fukimashita.\nTenchou: A, arigatou. Jaa, menyuu o oku mae ni, mazu ohiya no gurasu o kauntaa ni narabete kureru?\nArubaito: Hai, sugu yarimasu!',
    'scriptIndonesian': 'Manajer: Lee-san, sebelum toko buka tolong lap meja dan rapikan buku menu.\nStaf: Baik. Kalau meja tadi sudah saya lap.\nManajer: Ah, terima kasih. Kalau begitu sebelum menaruh menu, bisakah tata gelas air minum dulu di meja konter?\nStaf: Baik, segera saya kerjakan!',
    'questionJapanese': 'アルバイトの人は これから まず なにを しますか。',
    'questionIndonesian': 'Apa yang pertama kali harus dilakukan staf tersebut sekarang?',
    'options': [
      {'id': 1, 'text': 'テーブルを ふきます', 'textId': 'Mengelap meja'},
      {'id': 2, 'text': 'メニューを ならべます', 'textId': 'Menata buku menu'},
      {'id': 3, 'text': 'おひやの グラスを カウンターに ならべます', 'textId': 'Menata gelas air minum di konter'},
      {'id': 4, 'text': 'みせの ドアを あけます', 'textId': 'Membuka pintu restoran'}
    ],
    'answerIndex': 2,
    'explain': 'Meja sudah selesai dilap sebelumnya. Manajer meminta: "メニューを おくまえに、まず おひやの グラスを..." (Sebelum menaruh menu, pertama-tama tata gelas air minum). Pertanyaan menanyakan apa yang dilakukan \'pertama kali\' (まず), sehingga jawabannya adalah menata gelas air minum (Pilihan 3).',
    'vocabularyKey': [
      {'ja': 'まず (mazu)', 'id': 'pertama-tama / terlebih dahulu'},
      {'ja': '～まえに (mae ni)', 'id': 'sebelum ...'},
      {'ja': 'ならべる (naraberu)', 'id': 'menata / menyejajarkan'},
      {'ja': 'おひや (ohiya)', 'id': 'air minum dingin (istilah restoran)'}
    ]
  },
  {
    'id': 'jlpt-n4-m1-02',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_1',
    'mondaiLabel': 'Mondai 1: Task-based Comprehension (課題理解)',
    'title': 'Petunjuk Meminum Obat dari Dokter',
    'situation': 'Seorang dokter menjelaskan aturan minum obat flu kepada pasien di klinik.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q1.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 1',
    'scriptJapanese': '医者：くすりを にしゅるい だしておきますね。しろい くすりは あさ、ひる、ばんの ごはんの あとに のんでください。\n患者：あかい くすりは どうですか。\n医者：あかい くすりは ねむくなりますから、よる、ねるまえに ひとつのんでください。ひるまは ぜったいに のまないでくださいね。\n患者：わかりました。',
    'scriptRomaji': 'Isha: Kusuri o ni-shurui dashite okimasu ne. Shiroi kusuri wa asa, hiru, ban no gohan no ato ni nonde kudasai.\nKanja: Akai kusuri wa dou desu ka.\nIsha: Akai kusuri wa nemuku narimasu kara, yoru, neru mae ni hitotsu nonde kudasai. Hiruma wa zettai ni nomanaide kudasai ne.\nKanja: Wakarimashita.',
    'scriptIndonesian': 'Dokter: Saya resepkan dua macam obat ya. Obat putih diminum sesudah makan pagi, siang, dan malam.\nPasien: Obat merah bagaimana Dok?\nDokter: Obat merah menyebabkan kantuk, jadi minumlah satu butir di malam hari sebelum tidur. Siang hari sama sekali jangan diminum ya.\nPasien: Baik, saya mengerti.',
    'questionJapanese': '患者は ひるごはんの あとに どのくすりを のみますか。',
    'questionIndonesian': 'Obat mana yang diminum pasien sesudah makan siang?',
    'options': [
      {'id': 1, 'text': 'しろい くすりだけ', 'textId': 'Obat putih saja'},
      {'id': 2, 'text': 'あかい くすりだけ', 'textId': 'Obat merah saja'},
      {'id': 3, 'text': 'しろい くすりと あかい くすり', 'textId': 'Obat putih dan obat merah'},
      {'id': 4, 'text': 'くすりは のまない', 'textId': 'Tidak minum obat'}
    ],
    'answerIndex': 0,
    'explain': 'Obat putih diminum pagi, siang, dan malam sesudah makan ("あさ、ひる、ばんの ごはんの あと"). Obat merah hanya diminum malam sebelum tidur dan dilarang diminum siang hari ("ひるまは ぜったいに のまないで"). Maka setelah makan siang hanya minum obat putih (Pilihan 1).',
    'vocabularyKey': [
      {'ja': 'にしゅるい (ni-shurui)', 'id': 'dua macam / dua jenis'},
      {'ja': 'ねむくなる (nemuku naru)', 'id': 'menjadi mengantuk'},
      {'ja': 'ぜったいに～ない (zettai ni ... nai)', 'id': 'sama sekali tidak boleh ...'},
      {'ja': '～の あとに (no ato ni)', 'id': 'setelah ...'}
    ]
  },
  {
    'id': 'jlpt-n4-m1-03',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_1',
    'mondaiLabel': 'Mondai 1: Task-based Comprehension (課題理解)',
    'title': 'Memilih Kereta ke Bandara',
    'situation': 'Seorang wanita bertanya kepada staf stasiun tentang kereta tercepat dan termurah menuju bandara Narita.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q1.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 1',
    'scriptJapanese': '女の人：くうこうまで いきたいんですが、とっきゅうと かいそく、どちらが いいですか。\n駅員：とっきゅうは 40ぷんで つきますが、とっきゅうけんが 1500えん ひつようです。かいそくは 1時間かかりますが、ふつううんちんだけで いけますよ。\n女の人：ひこうきの じかんまで まだ 3時間ありますから、いそぎません。\n駅員：それなら、かいそくの ほうが やすくて いいですよ。2ばんせんです。',
    'scriptRomaji': 'Onna no hito: Kuukou made ikitai n desu ga, tokkyuu to kaisoku, dochira ga ii desu ka.\nEkiin: Tokkyuu wa yonjuppun de tsukimasu ga, tokkyuuken ga sen-gohyaku-en hitsuyou desu. Kaisoku wa ichi-jikan kakarimasu ga, futsuu unchin dake de ikemasu yo.\nOnna no hito: Hikouki no jikan made mada san-jikan arimasu kara, isogimasen.\nEkiin: Sore nara, kaisoku no hou ga yasukute ii desu yo. Niban-sen desu.',
    'scriptIndonesian': 'Wanita: Saya ingin pergi ke bandara, antara kereta ekspres terbatas (tokkyuu) dan kereta cepat (kaisoku), mana yang lebih baik?\nPetugas: Kereta ekspres sampai dalam 40 menit, tapi butuh tiket ekspres 1500 yen. Kereta cepat butuh waktu 1 jam, tapi cukup bayar ongkos biasa saja.\nWanita: Waktu penerbangan masih 3 jam lagi, jadi saya tidak terburu-buru.\nPetugas: Kalau begitu, kereta cepat lebih murah dan bagus. Di peron nomor 2.',
    'questionJapanese': '女の人は どの電車に のりますか。',
    'questionIndonesian': 'Kereta mana yang akan dinaiki oleh wanita tersebut?',
    'options': [
      {'id': 1, 'text': 'とっきゅう電車', 'textId': 'Kereta ekspres terbatas (tokkyuu)'},
      {'id': 2, 'text': 'かいそく電車', 'textId': 'Kereta cepat (kaisoku)'},
      {'id': 3, 'text': 'タクシー', 'textId': 'Taksi'},
      {'id': 4, 'text': 'バス', 'textId': 'Bus'}
    ],
    'answerIndex': 1,
    'explain': 'Wanita tidak terburu-buru ("いそぎません") karena waktu terbang masih 3 jam lagi. Petugas menyarankan kaisoku karena lebih murah: "それなら、かいそくの ほうが やすくて いいですよ". Maka ia memilih kereta cepat kaisoku (Pilihan 2).',
    'vocabularyKey': [
      {'ja': 'とっきゅう / かいそく', 'id': 'kereta ekspres terbatas / kereta cepat biasa'},
      {'ja': 'いそぐ (isogu)', 'id': 'terburu-buru / bergegas'},
      {'ja': '～の ほうが (no hou ga)', 'id': 'lebih ... (perbandingan)'},
      {'ja': 'うんちん (unchin)', 'id': 'tarif / ongkos tiket'}
    ]
  },
  {
    'id': 'jlpt-n4-m1-04',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_1',
    'mondaiLabel': 'Mondai 1: Task-based Comprehension (課題理解)',
    'title': 'Persiapan Pesta Perpisahan',
    'situation': 'Dua orang rekan kerja sedang membagi tugas belanja untuk pesta perpisahan seorang kolega.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q1.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 1',
    'scriptJapanese': '男の人：そうべつかいの じゅんびですが、ケーキと おかしは ぼくが かってきますね。\n女の人：ありがとう。じゃあ、わたしは のみものを かってきます。\n男の人：あ、それから、みんなからの メッセージカードを あつめて ください。あした わたしますから。\n女の人：わかりました。かいだしに いくまえに、みんなに かいてもらいます。',
    'scriptRomaji': 'Otoko no hito: Soubetsukai no junbi desu ga, keeki to okashi wa boku ga katte kimasu ne.\nOnna no hito: Arigatou. Jaa, watashi wa nomimono o katte kimasu.\nOtoko no hito: A, sore kara, minna kara no messeeji kaado o atsumete kudasai. Ashita watashimasu kara.\nOnna no hito: Wakarimashita. Kaidashi ni iku mae ni, minna ni kaite moraimasu.',
    'scriptIndonesian': 'Pria: Untuk persiapan pesta perpisahan, kue dan camilan biar saya yang beli ya.\nWanita: Terima kasih. Kalau begitu saya akan pergi beli minuman.\nPria: Ah, satu lagi, tolong kumpulkan kartu pesan dari teman-teman ya, karena besok akan diserahkan.\nWanita: Baik. Sebelum pergi belanja, saya akan minta mereka menulisnya dulu.',
    'questionJapanese': '女の人は これから まず なにを しますか。',
    'questionIndonesian': 'Apa yang akan dilakukan wanita tersebut pertama kali sekarang?',
    'options': [
      {'id': 1, 'text': 'ケーキと おかしを かいに いきます', 'textId': 'Pergi beli kue dan camilan'},
      {'id': 2, 'text': 'のみものを かいに いきます', 'textId': 'Pergi membeli minuman'},
      {'id': 3, 'text': 'メッセージカードを あつめます', 'textId': 'Mengumpulkan kartu pesan'},
      {'id': 4, 'text': 'かいぎしつを そうじします', 'textId': 'Membersihkan ruang rapat'}
    ],
    'answerIndex': 2,
    'explain': 'Wanita mengatakan: "かいだしに いくまえに、みんなに かいてもらいます" (Sebelum pergi belanja, saya akan minta mereka menulis kartu pesan dulu). Jadi hal pertama yang ia kerjakan adalah mengumpulkan kartu pesan (Pilihan 3).',
    'vocabularyKey': [
      {'ja': 'そうべつかい (soubetsukai)', 'id': 'pesta perpisahan'},
      {'ja': 'あつめる (atsumeru)', 'id': 'mengumpulkan'},
      {'ja': 'かいだし (kaidashi)', 'id': 'pergi berbelanja kebutuhan'}
    ]
  },

  # --- JLPT N4 MONDAI 2 (Point comprehension) ---
  {
    'id': 'jlpt-n4-m2-01',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_2',
    'mondaiLabel': 'Mondai 2: Point Comprehension (ポイント理解)',
    'title': 'Alasan Keterlambatan Tiba di Kantor',
    'situation': 'Seorang karyawan laki-laki meminta maaf kepada atasannya karena terlambat tiba di kantor.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q2.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 2',
    'scriptJapanese': '部長：山田くん、きょうは おそかったね。どうしたの？\n山田：すみません、部長。あさ、いえを いつもどおりの じかんに でたんですが、じこで でんしゃが 30ぷんも とまって しまったんです。\n部長：そうか。バスに のりかえられなかったの？\n山田：ええ、バスていも ながい れつが できて いて、のれませんでした。\n部長：なるほど、たいへんだったね。',
    'scriptRomaji': 'Buchou: Yamada-kun, kyou wa osokatta ne. Dou shita no?\nYamada: Sumimasen, buchou. Asa, ie o itsumodoori no jikan ni deta n desu ga, jiko de densha ga sanjuppun mo tomatte shimatta n desu.\nBuchou: Sou ka. Basu ni norikaerarenakatta no?\nYamada: Ee, basutei mo nagai retsu ga dekite ite, noremasen deshita.\nBuchou: Naruhodo, taihen datta ne.',
    'scriptIndonesian': 'Kepala Bagian: Yamada-kun, hari ini terlambat ya. Ada apa?\nYamada: Maaf Pak. Pagi tadi saya keluar rumah tepat waktu seperti biasa, tapi karena kecelakaan kereta mogok sampai 30 menit.\nKepala Bagian: Begitu ya. Tidak bisa ganti naik bus?\nYamada: Iya, di halte bus juga antrean panjang sekali sehingga tidak bisa naik.\nKepala Bagian: Oh begitu, merepotkan sekali ya.',
    'questionJapanese': '山田くんが ちこくした いちばんの りゆうは なんですか。',
    'questionIndonesian': 'Apa alasan utama Yamada terlambat?',
    'options': [
      {'id': 1, 'text': 'あさ ねぼうしたから', 'textId': 'Karena bangun kesiangan'},
      {'id': 2, 'text': 'じこで 電車が とまったから', 'textId': 'Karena kereta berhenti akibat kecelakaan'},
      {'id': 3, 'text': 'バスを まちがえたから', 'textId': 'Karena salah naik bus'},
      {'id': 4, 'text': 'みちに まよったから', 'textId': 'Karena tersesat di jalan'}
    ],
    'answerIndex': 1,
    'explain': 'Yamada keluar rumah tepat waktu seperti biasa ("いつもどおりの じかん"), namun kereta mogok 30 menit karena kecelakaan ("じこで でんしゃが 30ぷんも とまって しまった"). Maka penyebab keterlambatan adalah kereta berhenti akibat kecelakaan (Pilihan 2).',
    'vocabularyKey': [
      {'ja': 'いつもどおり (itsumodoori)', 'id': 'seperti biasanya'},
      {'ja': 'じこ (jiko)', 'id': 'kecelakaan'},
      {'ja': 'とまる (tomaru)', 'id': 'berhenti / terhenti'},
      {'ja': 'のりかえる (norikaeru)', 'id': 'berganti kendaraan'}
    ]
  },
  {
    'id': 'jlpt-n4-m2-02',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_2',
    'mondaiLabel': 'Mondai 2: Point Comprehension (ポイント理解)',
    'title': 'Kesan Menonton Film Bioskop',
    'situation': 'Dua orang teman baru saja keluar dari gedung bioskop dan saling membicarakan film yang mereka tonton.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q2.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 2',
    'scriptJapanese': '女の人：きょうの えいが、アクションが すごかったね！\n男の人：うん、えいぞうは きれいだったけど、ストーリーが ちょっと わかりにくかったな。\n女の人：そう？ さいごの どんでんがえし、すごく おもしろかったじゃない。\n男の人：まあね。でも、おんがくは さいこうだったよ。サウンドトラックを かおうかな。',
    'scriptRomaji': 'Onna no hito: Kyou no eiga, akushon ga sugokatta ne!\nOtoko no hito: Un, eizou wa kirei datta kedo, sutoorii ga chotto wakarinikukatta na.\nOnna no hito: Sou? Saigo no dondengaeshi, sugoku omoshirokatta janai.\nOtoko no hito: Maa ne. Demo, ongaku wa saikou datta yo. Saundotorakku o kaou ka na.',
    'scriptIndonesian': 'Wanita: Film hari ini adegan aksinya luar biasa ya!\nPria: Ya, visualnya indah sih, tapi alur ceritanya agak sulit dipahami ya.\nWanita: Masa sih? Plot twist di akhirnya kan seru banget.\nPria: Ya lumayanlah. Tapi musiknya benar-benar juara. Aku kepikiran mau beli soundtrack-nya deh.',
    'questionJapanese': '男の人は えいがの なにが いちばん よかったと 言っていますか。',
    'questionIndonesian': 'Bagian mana dari film yang menurut pria tersebut paling bagus?',
    'options': [
      {'id': 1, 'text': 'ストーリー', 'textId': 'Alur ceritanya'},
      {'id': 2, 'text': 'アクション', 'textId': 'Adegan aksinya'},
      {'id': 3, 'text': 'おんがく', 'textId': 'Musiknya'},
      {'id': 4, 'text': 'えいがかんの いす', 'textId': 'Kursi bioskopnya'}
    ],
    'answerIndex': 2,
    'explain': 'Pria mengkritik cerita agak sulit dimengerti ("ストーリーが ちょっと わかりにくかった"), tetapi memuji musiknya paling hebat: "おんがくは さいこうだったよ" (Musiknya juara / terbaik). Jadi yang paling disukai adalah musiknya (Pilihan 3).',
    'vocabularyKey': [
      {'ja': 'わかりにくい (wakarinikui)', 'id': 'sulit dipahami'},
      {'ja': 'さいこう (saikou)', 'id': 'paling hebat / terbaik'},
      {'ja': 'えいぞう (eizou)', 'id': 'visual / gambar video'}
    ]
  },
  {
    'id': 'jlpt-n4-m2-03',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_2',
    'mondaiLabel': 'Mondai 2: Point Comprehension (ポイント理解)',
    'title': 'Tempat yang Batal Dikunjungi di Kyoto',
    'situation': 'Seorang wanita menceritakan perjalanan wisatanya ke Kyoto kepada teman kantornya.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q2.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 2',
    'scriptJapanese': '男の人：京都りょこう、どうだった？きんかくじと きよみずでら、両方いけた？\n女の人：きよみずでらは いけたんだけど、きんかくじは じかんが なくなって いけなかったの。\n男の人：そうなんだ。ふしみいなりは？\n女の人：ふしみいなりは あさ はやく いったから、ゆっくり みられたよ。すごく きれいだった！',
    'scriptRomaji': 'Otoko no hito: Kyouto ryokou, dou datta? Kinkakuji to Kiyomizudera, ryouhou iketa?\nOnna no hito: Kiyomizudera wa iketa n dakedo, Kinkakuji wa jikan ga nakunatte ikenakatta no.\nOtoko no hito: Sou nan da. Fushimi Inari wa?\nOnna no hito: Fushimi Inari wa asa hayaku itta kara, yukkuri mirareta yo. Sugoku kirei datta!',
    'scriptIndonesian': 'Pria: Liburan ke Kyoto bagaimana? Kinkakuji dan Kiyomizudera bisa dikunjungi dua-duanya?\nWanita: Ke Kiyomizudera bisa pergi, tapi ke Kinkakuji kehabisan waktu jadi tidak sempat pergi.\nPria: Oh begitu. Kalau Fushimi Inari?\nWanita: Fushimi Inari karena perginya pagi-pagi sekali, jadi bisa dinikmati dengan santai. Indah sekali!',
    'questionJapanese': '女の人が いけなかった ところは どこですか。',
    'questionIndonesian': 'Tempat mana yang TIDAK sempat dikunjungi oleh wanita tersebut?',
    'options': [
      {'id': 1, 'text': 'きよみずでら (Kiyomizudera)', 'textId': 'Kuil Kiyomizudera'},
      {'id': 2, 'text': 'きんかくじ (Kinkakuji)', 'textId': 'Kuil Emas Kinkakuji'},
      {'id': 3, 'text': 'ふしみいなり (Fushimi Inari)', 'textId': 'Kuil Fushimi Inari'},
      {'id': 4, 'text': 'ぜんぶ いけた', 'textId': 'Semua tempat sempat dikunjungi'}
    ],
    'answerIndex': 1,
    'explain': 'Wanita tersebut menyatakan secara jelas: "きんかくじは じかんが なくなって いけなかったの" (Kinkakuji kehabisan waktu jadi tidak sempat pergi). Maka tempat yang batal dikunjungi adalah Kinkakuji (Pilihan 2).',
    'vocabularyKey': [
      {'ja': 'りょうほう (ryouhou)', 'id': 'keduanya / dua-duanya'},
      {'ja': 'じかんが なくなる (jikan ga nakunaru)', 'id': 'kehabisan waktu'},
      {'ja': 'ゆっくり (yukkuri)', 'id': 'santai / perlahan'}
    ]
  },
  {
    'id': 'jlpt-n4-m2-04',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_2',
    'mondaiLabel': 'Mondai 2: Point Comprehension (ポイント理解)',
    'title': 'Kesulitan Belajar Bahasa Jepang',
    'situation': 'Seorang mahasiswa asing berbicara dengan gurunya mengenai bagian tersulit dalam belajar bahasa Jepang.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q2.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 2',
    'scriptJapanese': '先生：ジョンさん、にほんごの べんきょうは どうですか。\nジョン：ぶんぽうや かいわは たのしいですが、やっぱり かんじを おぼえるのが いちばん たいへんです。\n先生：そうですか。ちょうかい（きくこと）は どうですか。\nジョン：ちょうかいは アニメを よく みるから、あまり こまっていません。',
    'scriptRomaji': 'Sensei: Jon-san, nihongo no benkyou wa dou desu ka.\nJon: Bunpou ya kaiwa wa tanoshii desu ga, yappari kanji o oboeru no ga ichiban taihen desu.\nSensei: Sou desu ka. Choukai wa dou desu ka.\nJon: Choukai wa anime o yoku miru kara, amari komatte imasen.',
    'scriptIndonesian': 'Guru: John-san, bagaimana pembelajaran bahasa Jepangmu?\nJohn: Tata bahasa dan percakapan menyenangkan, tapi memang menghafal kanji yang paling berat.\nGuru: Begitu ya. Kalau listening (choukai) bagaimana?\nJohn: Listening karena saya sering menonton anime, jadi tidak terlalu kesulitan.',
    'questionJapanese': 'ジョンさんは なにが いちばん たいへんだと 言っていますか。',
    'questionIndonesian': 'Apa hal yang menurut John paling berat / sulit?',
    'options': [
      {'id': 1, 'text': 'ぶんぽう (tata bahasa)', 'textId': 'Tata bahasa (grammar)'},
      {'id': 2, 'text': 'かいわ (percakapan)', 'textId': 'Percakapan (speaking)'},
      {'id': 3, 'text': 'かんじを おぼえること', 'textId': 'Menghafal Kanji'},
      {'id': 4, 'text': 'ちょうかい (mendengarkan)', 'textId': 'Listening (choukai)'}
    ],
    'answerIndex': 2,
    'explain': 'John menyatakan: "かんじを おぼえるのが いちばん たいへんです" (Menghafal kanji yang paling berat). Bagian listening aman karena sering nonton anime. Maka hal paling berat adalah menghafal kanji (Pilihan 3).',
    'vocabularyKey': [
      {'ja': 'おぼえる (oboeru)', 'id': 'menghafal / mengingat'},
      {'ja': 'たいへん (taihen)', 'id': 'berat / susah / repot'},
      {'ja': 'こまる (komaru)', 'id': 'mengalami kesulitan'}
    ]
  },

  # --- JLPT N4 MONDAI 3 (Utterance expressions) ---
  {
    'id': 'jlpt-n4-m3-01',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_3',
    'mondaiLabel': 'Mondai 3: Utterance Expressions (発話表現)',
    'title': 'Meminta Izin Pulang Lebih Awal',
    'situation': 'Anda sedang berada di tempat kerja paruh waktu dan merasa badan demam sehingga ingin pamit pulang cepat.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q3.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 3',
    'scriptJapanese': 'きぶんが わるいので、はやく かえりたいです。てんちょうに なんと言いますか。',
    'scriptRomaji': 'Kibun ga warui node, hayaku kaeritai desu. Tenchou ni nanto iimasu ka.',
    'scriptIndonesian': 'Karena badan tidak enak, Anda ingin pulang lebih awal. Apa yang Anda katakan kepada manajer?',
    'questionJapanese': 'てんちょうに なんと言って きょかを とりますか。',
    'questionIndonesian': 'Bagaimanakah meminta izin pulang kepada manajer?',
    'options': [
      {'id': 1, 'text': 'きょうは もう かえってください。', 'textId': 'Kyou wa mou kaette kudasai. (Hari ini silakan Anda pulang.)'},
      {'id': 2, 'text': 'きぶんが わるいので、はやく かえっても いいですか。', 'textId': 'Kibun ga warui node, hayaku kaette mo ii desu ka. (Karena badan tidak enak, bolehkah saya pulang lebih awal?)'},
      {'id': 3, 'text': 'きょうは かえらなければ なりませんよ。', 'textId': 'Kyou wa kaeranakereba narimasen yo. (Hari ini Anda harus pulang lho.)'}
    ],
    'answerIndex': 1,
    'explain': 'Pola meminta izin secara sopan adalah "～ても いいですか" (Bolehkah saya ...). Pilihan 1 menyuruh orang lain pulang, pilihan 3 bernada memerintah orang lain. Maka ungkapan yang benar adalah Pilihan 2.',
    'vocabularyKey': [
      {'ja': 'きぶんが わるい (kibun ga warui)', 'id': 'merasa tidak enak badan'},
      {'ja': '～ても いいですか (te mo ii desu ka)', 'id': 'bolehkah saya ... (izin)'},
      {'ja': 'はやく (hayaku)', 'id': 'lebih cepat / lebih awal'}
    ]
  },
  {
    'id': 'jlpt-n4-m3-02',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_3',
    'mondaiLabel': 'Mondai 3: Utterance Expressions (発話表現)',
    'title': 'Menolak Ajakan Secara Sopan',
    'situation': 'Teman mengajak Anda nonton bioskop malam ini, tapi Anda sudah ada janji lain.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q3.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 3',
    'scriptJapanese': 'こんばん えいがに さそわれましたが、ほかに よじが あります。なんと言って ことわりますか。',
    'scriptRomaji': 'Konban eiga ni sasowaremashita ga, hoka ni yoji ga arimasu. Nanto itte kotowarimasu ka.',
    'scriptIndonesian': 'Malam ini diajak nonton film, tapi Anda punya urusan lain. Bagaimana Anda menolaknya secara halus?',
    'questionJapanese': 'なんと言って ていねいに ことわりますか。',
    'questionIndonesian': 'Bagaimanakah cara menolak ajakan dengan sopan?',
    'options': [
      {'id': 1, 'text': 'えいがは だいきらいです。', 'textId': 'Eiga wa daikirai desu. (Saya benci sekali film.)'},
      {'id': 2, 'text': 'こんばんは ちょっと つごうが わるくて...。', 'textId': 'Konban wa chotto tsugou ga warukute... (Malam ini situasinya agak kurang pas bagi saya...)'},
      {'id': 3, 'text': 'ぜったいに いきたくありません。', 'textId': 'Zettai ni ikitaku arimasen. (Saya mutlak tidak mau pergi.)'}
    ],
    'answerIndex': 1,
    'explain': 'Dalam etiket bahasa Jepang, menolak ajakan tidak dilakukan secara frontal. Ungkapan halus yang paling tepat adalah "ちょっと つごうが わるくて..." (Chotto tsugou ga warukute... - Keadaannya agak kurang memungkinkan bagi saya...). Pilihan 1 & 3 sangat kasar.',
    'vocabularyKey': [
      {'ja': 'つごうが わるい (tsugou ga warui)', 'id': 'kondisi/jadwal kurang memungkinkan'},
      {'ja': 'さそう (sasou)', 'id': 'mengajak'},
      {'ja': 'ことわる (kotowaru)', 'id': 'menolak'}
    ]
  },
  {
    'id': 'jlpt-n4-m3-03',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_3',
    'mondaiLabel': 'Mondai 3: Utterance Expressions (発話表現)',
    'title': 'Ucapan Setelah Ditraktir Makan Malam',
    'situation': 'Atasan di kantor mentraktir Anda makan malam di restoran setelah lembur selesai.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q3.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 3',
    'scriptJapanese': 'じょうしに ごはんを ごちそうに なりました。みせを でるとき、なんと言いますか。',
    'scriptRomaji': 'Joushi ni gohan o gochisou ni narimashita. Mise o deru toki, nanto iimasu ka.',
    'scriptIndonesian': 'Anda ditraktir makan oleh atasan. Saat keluar dari restoran, apa yang Anda katakan?',
    'questionJapanese': 'みせを でるとき、じょうしに なんと言いますか。',
    'questionIndonesian': 'Saat keluar dari toko, apa yang diucapkan kepada atasan?',
    'options': [
      {'id': 1, 'text': 'ごちそうさまでした。ありがとうございました。', 'textId': 'Gochisousama deshita. Arigatou gozaimashita. (Terima kasih atas hidangannya.)'},
      {'id': 2, 'text': 'いただきます。', 'textId': 'Itadakimasu. (Selamat makan.)'},
      {'id': 3, 'text': 'おねがいします。', 'textId': 'Onegai shimasu. (Tolong ya.)'}
    ],
    'answerIndex': 0,
    'explain': 'Setelah selesai makan dan ditraktir seseorang, ucapan yang wajib disampaikan adalah "ごちそうさまでした" (Gochisousama deshita) disertai terima kasih "ありがとうございました". "Itadakimasu" diucapkan SEBELUM makan.',
    'vocabularyKey': [
      {'ja': 'ごちそうになる (gochisou ni naru)', 'id': 'ditraktir makanan oleh seseorang'},
      {'ja': 'じょうし (joushi)', 'id': 'atasan kantor'},
      {'ja': 'ごちそうさまでした', 'id': 'terima kasih atas makanannya (sesudah makan)'}
    ]
  },

  # --- JLPT N4 MONDAI 4 (Quick response) ---
  {
    'id': 'jlpt-n4-m4-01',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_4',
    'mondaiLabel': 'Mondai 4: Quick Response (即時応答)',
    'title': 'Menawarkan Bantuan Membawa Barang',
    'situation': 'Rekan kantor melihat Anda membawa banyak kardus dokumen tebal.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q4.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 4',
    'scriptJapanese': '男の人：その にもつ、おもそうですね。もちましょうか。',
    'scriptRomaji': 'Otoko no hito: Sono nimotsu, omosou desu ne. Mochimashou ka.',
    'scriptIndonesian': 'Pria: Barang bawaan itu kelihatannya berat ya. Mau saya bantu bawakan?',
    'questionJapanese': 'なんと言って こたえますか。',
    'questionIndonesian': 'Bagaimanakah respons yang tepat?',
    'options': [
      {'id': 1, 'text': 'すみません、おねがいします。', 'textId': 'Sumimasen, onegai shimasu. (Maaf merepotkan, tolong bantu ya.)'},
      {'id': 2, 'text': 'いいえ、もちません。', 'textId': 'Iie, mochimasen. (Tidak, saya tidak bawa.)'},
      {'id': 3, 'text': 'どういたしまして。', 'textId': 'Dou itashimashite. (Sama-sama.)'}
    ],
    'answerIndex': 0,
    'explain': 'Ketika seseorang menawarkan bantuan ("～ましょうか"), cara menerima bantuan secara santun adalah "すみません、おねがいします" (Sumimasen, onegai shimasu). Pilihan 2 tidak wajar, pilihan 3 jawaban untuk terima kasih.',
    'vocabularyKey': [
      {'ja': 'おもそう (omosou)', 'id': 'kelihatannya berat'},
      {'ja': 'もつ (motsu)', 'id': 'membawa / memegang'},
      {'ja': 'おねがいします (onegai shimasu)', 'id': 'tolong bantu / mohon bantuannya'}
    ]
  },
  {
    'id': 'jlpt-n4-m4-02',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_4',
    'mondaiLabel': 'Mondai 4: Quick Response (即時応答)',
    'title': 'Mengonfirmasi Jam Rapat Besok',
    'situation': 'Rekan kerja bertanya memastikan jam berapa rapat direksi dimulai besok pagi.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q4.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 4',
    'scriptJapanese': '女の人：あしたの かいぎ、なんじからだっけ？',
    'scriptRomaji': 'Onna no hito: Ashita no kaigi, nan-ji kara dakke?',
    'scriptIndonesian': 'Wanita: Rapat besok mulai jam berapa ya?',
    'questionJapanese': 'なんと言って こたえますか。',
    'questionIndonesian': 'Bagaimanakah respons yang tepat?',
    'options': [
      {'id': 1, 'text': '10じからだよ。', 'textId': 'Juuji kara da yo. (Mulai jam 10 kok.)'},
      {'id': 2, 'text': 'かいぎしつだよ。', 'textId': 'Kaigishitsu da yo. (Di ruang rapat kok.)'},
      {'id': 3, 'text': 'きのうだったよ。', 'textId': 'Kinou datta yo. (Kemarin kok.)'}
    ],
    'answerIndex': 0,
    'explain': 'Pertanyaan berakhiran "～だっけ" menanyakan konfirmasi waktu yang lupa ("なんじから" - mulai jam berapa). Jawaban yang menyatakan waktu adalah "10じからだよ" (Mulai jam 10 - Pilihan 1). Pilihan 2 menjawab tempat.',
    'vocabularyKey': [
      {'ja': 'かいぎ (kaigi)', 'id': 'rapat / meeting'},
      {'ja': '～だっけ (dakke)', 'id': '... ya? (memastikan hal yang lupa)'}
    ]
  },
  {
    'id': 'jlpt-n4-m4-03',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_4',
    'mondaiLabel': 'Mondai 4: Quick Response (即時応答)',
    'title': 'Tawaran Tambah Kopi',
    'situation': 'Tuan rumah menawarkan secangkir kopi lagi kepada tamu yang berkunjung.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q4.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 4',
    'scriptJapanese': '女の人：コーヒー、もう いっぱい いかがですか。',
    'scriptRomaji': 'Onna no hito: Koohii, mou ippai ikaga desu ka.',
    'scriptIndonesian': 'Wanita: Mau secangkir kopi lagi?',
    'questionJapanese': 'なんと言って こたえますか。',
    'questionIndonesian': 'Bagaimanakah respons yang tepat?',
    'options': [
      {'id': 1, 'text': 'いいえ、けっこうです。もう おなかいっぱいですから。', 'textId': 'Iie, kekkou desu. Mou onaka ippai desu kara. (Tidak, terima kasih sudah cukup, saya sudah kenyang.)'},
      {'id': 2, 'text': 'はい、いっぱいです。', 'textId': 'Hai, ippai desu. (Ya, penuh.)'},
      {'id': 3, 'text': 'ごちそうさまでした。', 'textId': 'Gochisousama deshita. (Terima kasih makanannya.)'}
    ],
    'answerIndex': 0,
    'explain': 'Tawaran sopan "いかがですか" (Mau ... lagi?) jika ingin menolak secara santun diucapkan dengan "いいえ、けっこうです" (Iie, kekkou desu - Tidak terima kasih, sudah cukup - Pilihan 1).',
    'vocabularyKey': [
      {'ja': 'もう いっぱい (mou ippai)', 'id': 'satu cangkir lagi'},
      {'ja': 'いかがですか (ikaga desu ka)', 'id': 'bagaimana kalau ... (tawaran sopan)'},
      {'ja': 'けっこうです (kekkou desu)', 'id': 'sudah cukup'}
    ]
  },
  {
    'id': 'jlpt-n4-m4-04',
    'level': 'N4',
    'cefr': 'A2',
    'mondai': 'mondai_4',
    'mondaiLabel': 'Mondai 4: Quick Response (即時応答)',
    'title': 'Menanyakan Arah Jalan ke Stasiun',
    'situation': 'Seseorang di jalan menyapa Anda dan menanyakan arah menuju stasiun terdekat.',
    'audioUrl': 'https://www.jlpt.jp/samples/sample2018/mp3/N4Q4.mp3',
    'audioTrack': 'JLPT N4 Vol.2 - Mondai 4',
    'scriptJapanese': '男の人：すみません、えきまでの みちを おしえて いただけませんか。',
    'scriptRomaji': 'Otoko no hito: Sumimasen, eki made no michi o oshiete itadakemasen ka.',
    'scriptIndonesian': 'Pria: Permisi, bisakah Anda memberi tahu jalan menuju stasiun?',
    'questionJapanese': 'なんと言って こたえますか。',
    'questionIndonesian': 'Bagaimanakah respons yang tepat?',
    'options': [
      {'id': 1, 'text': 'ええ、あの しんごうを みぎに まがってください。', 'textId': 'Ee, ano shingou o migi ni magatte kudasai. (Ya, belok kanan di lampu merah itu.)'},
      {'id': 2, 'text': 'はい、おしえました。', 'textId': 'Hai, oshiemashita. (Ya, saya sudah beri tahu.)'},
      {'id': 3, 'text': 'いいえ、わかりません。', 'textId': 'Iie, wakarimasen. (Tidak, saya tidak mengerti.)'}
    ],
    'answerIndex': 0,
    'explain': 'Permintaan bantuan sopan "～て いただけませんか" (Bisakah Anda tolong...) direspons dengan petunjuk arah: "ええ、あの しんごうを みぎに まがってください" (Ya, silakan belok kanan di lampu merah itu - Pilihan 1).',
    'vocabularyKey': [
      {'ja': 'みち (michi)', 'id': 'jalan'},
      {'ja': '～て いただけませんか', 'id': 'sudikah Anda membantu ... (sangat sopan)'},
      {'ja': 'しんごう (shingou)', 'id': 'lampu lalu lintas'},
      {'ja': 'まがる (magaru)', 'id': 'belok'}
    ]
  }
]

bank = {
  'schema': 'fiezel-jlpt-listening-bank-v1',
  'version': '1.0.0',
  'title': 'Bank Soal Listening Bahasa Jepang JLPT N5 & N4 (日本語能力試験 聴解)',
  'description': 'Koleksi bank soal latihan listening resmi dan terstandarisasi untuk JLPT N5 dan JLPT N4, mencakup Mondai 1 (課題理解 - Task-based), Mondai 2 (ポイント理解 - Point comprehension), Mondai 3 (発話表現 - Utterance expressions), dan Mondai 4 (即時応答 - Quick response). Dilengkapi audio resmi JLPT, transkrip kanji/kana, transliterasi romaji, terjemahan Indonesia, kunci jawaban, dan pembahasan mendalam.',
  'source': {
    'provider': 'Japan Foundation & JEES',
    'officialUrls': {
      'workbookIndex': 'https://www.jlpt.jp/e/samples/sampleindex.html',
      'n5Audios': [
        'https://www.jlpt.jp/samples/sample2018/mp3/N5Q1.mp3',
        'https://www.jlpt.jp/samples/sample2018/mp3/N5Q2.mp3',
        'https://www.jlpt.jp/samples/sample2018/mp3/N5Q3.mp3',
        'https://www.jlpt.jp/samples/sample2018/mp3/N5Q4.mp3'
      ],
      'n4Audios': [
        'https://www.jlpt.jp/samples/sample2018/mp3/N4Q1.mp3',
        'https://www.jlpt.jp/samples/sample2018/mp3/N4Q2.mp3',
        'https://www.jlpt.jp/samples/sample2018/mp3/N4Q3.mp3',
        'https://www.jlpt.jp/samples/sample2018/mp3/N4Q4.mp3'
      ]
    }
  },
  'mondaiTypes': {
    'mondai_1': {
      'id': 'mondai_1',
      'kanji': '課題理解',
      'romaji': 'Kadai Rikai',
      'label': 'Mondai 1: Task-based Comprehension',
      'deskripsi': 'Memahami instruksi konkret apa yang harus dilakukan pembicara selanjutnya.',
      'replays': 1
    },
    'mondai_2': {
      'id': 'mondai_2',
      'kanji': 'ポイント理解',
      'romaji': 'Point Comprehension',
      'label': 'Mondai 2: Point Comprehension',
      'deskripsi': 'Menyaring informasi kunci tertentu (waktu, tempat, alasan, jumlah) dari dialog.',
      'replays': 1
    },
    'mondai_3': {
      'id': 'mondai_3',
      'kanji': '発話表現',
      'romaji': 'Hatsuwa Hyougen',
      'label': 'Mondai 3: Utterance Expressions',
      'deskripsi': 'Memilih ungkapan situasional atau salam yang tepat diucapkan tokoh bertanda panah.',
      'replays': 1
    },
    'mondai_4': {
      'id': 'mondai_4',
      'kanji': '即時応答',
      'romaji': 'Sokuji Outou',
      'label': 'Mondai 4: Quick Response',
      'deskripsi': 'Mendengarkan 1 frasa dan langsung memilih respons cepat yang paling wajar.',
      'replays': 1
    }
  },
  'count': len(items),
  'items': items
}

target_path = os.path.join('features', 'speaking-listening', 'jlpt-listening-bank-v1.json')
with open(target_path, 'w', encoding='utf-8') as f:
    json.dump(bank, f, ensure_ascii=False, indent=2)

print(f'Successfully created {target_path} with {len(items)} questions!')
