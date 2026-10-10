/**
 * tools/dev/probe-large-assignment-payload.mjs
 *
 * PROBE PLAYWRIGHT EMPIRIS: PENUGASAN MAPEL IPA KURIKULUM NASIONAL (> 40 KB)
 * --------------------------------------------------------------------------
 * 1. Mensimulasikan Guru membuat penugasan IPA Kurikulum Merdeka dengan 30 butir
 *    soal komprehensif (stimulus konteks bacaan ilmiah, prompt fenomena sains,
 *    4 opsi jawaban, dan penjelasan pedagogis distractorWhy lengkap).
 *    Payload JSON yang dihasilkan berukuran ~65 - 75 KB (> 40 KB, target 50-80 KB).
 * 2. Menguji penegakan batas byte secara empiris dalam peramban Chromium Playwright:
 *    - Pembuktian batas lama (32 KB / 32768 byte): request ditolak HTTP 413 (Payload Too Large).
 *    - Pembuktian batas baru (256 KB / 262144 byte di schema.js): request diterima HTTP 200 OK.
 * 3. Mensimulasikan Murid mengambil tugas via routeLearnerClassAssignments:
 *    - Memastikan 100% (30/30) butir soal IPA kurikulum nasional diterima utuh tanpa data loss.
 *    - Memverifikasi integritas seluruh komponen: id, prompt, context bacaan, 4 opsi,
 *      kunci jawaban, dan seluruh alasan distraktor (why).
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

// Import modul core & router server
const { routeClassAssign, routeLearnerClassAssignments } = await import(
  'file://' + path.join(ROOT, 'workers', 'api', 'route-class-sync.js')
);
const { byteLimitFor } = await import(
  'file://' + path.join(ROOT, 'workers', 'api', 'schema.js')
);
const { contentLengthGate } = await import(
  'file://' + path.join(ROOT, 'workers', 'api', 'mw-guard.js')
);

console.log('================================================================');
console.log(' PROBE EMPIRIS PLAYWRIGHT: LARGE ASSIGNMENT PAYLOAD IPA (> 40 KB) ');
console.log('================================================================\n');

/**
 * 1. Generator 30 Butir Soal IPA Kurikulum Nasional
 * Setiap butir memuat stimulus kontekstual, kalimat prompt ilmiah, 4 opsi,
 * dan 4 penjelasan distraktor (why).
 */
function generate30IpaQuestions() {
  const scienceTopics = [
    {
      topic: 'Fotosintesis dan Reaksi Terang-Gelap',
      concept: 'fotolisis air pada tilakoid dan fiksasi CO2 pada stroma kloroplas',
      correct: 'Reaksi terang menghasilkan ATP dan NADPH yang digunakan untuk mereduksi 3-PGA menjadi G3P pada siklus Calvin.',
      d1: 'Reaksi terang berlangsung di stroma dan menghasilkan glukosa secara langsung tanpa membutuhkan donor elektron air.',
      d2: 'Fotolisis air terjadi pada reaksi gelap untuk mengikat karbon dioksida bebas menjadi senyawa karbohidrat.',
      d3: 'Klorofil a hanya menyerap foton pada panjang gelombang hijau dan memantulkan seluruh spektrum biru serta merah.'
    },
    {
      topic: 'Difusi Respirasi pada Alveolus Paru-Paru',
      concept: 'pertukaran gas O2 dan CO2 melalui membran alveolar-kapiler tipis',
      correct: 'Gas oksigen berdifusi menembus epitel pipih selapis alveolus menuju plasma darah karena tekanan parsial O2 di alveolus lebih tinggi.',
      d1: 'Karbondioksida berdifusi secara transpor aktif melawan gradien tekanan parsial dengan mengonsumsi molekul ATP eritrosit.',
      d2: 'Tebal dinding kapiler yang mencapai beberapa sentimeter mempercepat laju pertukaran gas pernapasan manusia.',
      d3: 'Gas nitrogen berikatan kovalen dengan ion ferro hemoglobin untuk menggantikan peran gas oksigen dalam sel otot.'
    },
    {
      topic: 'Hukum II Newton pada Sistem Katrol Majemuk',
      concept: 'keseimbangan gaya tegangan tali dan percepatan massa beban terhubung',
      correct: 'Percepatan gerak beban berbanding lurus dengan resultan gaya total dan berbanding terbalik dengan massa total sistem.',
      d1: 'Massa total yang bertambah dua kali lipat akan melipatgandakan percepatan sistem katrol bebas tanpa gaya tambahan.',
      d2: 'Tegangan pada tali katrol licin selalu bernilai nol karena tidak terjadi gesekan antara tali dan permukaan roda katrol.',
      d3: 'Kecepatan benda yang jatuh bebas pada sistem katrol berkurang secara linier terhadap kuadrat waktu tempuh gravitasi.'
    },
    {
      topic: 'Konservasi Energi Mekanik pada Gerak Parabola',
      concept: 'transformasi energi potensial gravitasi dan energi kinetik tanpa gesekan',
      correct: 'Pada titik tertinggi lintasan parabola, energi potensial mencapai nilai maksimum sedangkan energi kinetik minimum namun tidak nol.',
      d1: 'Energi kinetik proyektil bernilai nol pada puncak parabola karena seluruh komponen kecepatan vertikal dan horizontal terhenti.',
      d2: 'Energi mekanik total bertambah seiring bertambahnya ketinggian proyektil akibat pengaruh gravitasi bumi.',
      d3: 'Energi potensial di titik awal peluncuran memiliki nilai paling tinggi dibandingkan pada titik koordinat lainnya.'
    },
    {
      topic: 'Kesetimbangan Termal dan Asas Black Campuran Kalor',
      concept: 'hukum kekekalan energi kalor antara benda bersuhu tinggi dan bersuhu rendah',
      correct: 'Jumlah kalor yang dilepaskan oleh logam panas sama dengan jumlah kalor yang diserap oleh air dingin hingga tercapai suhu akhir campuran.',
      d1: 'Kalor mengalir secara spontan dari zat yang memiliki kapasitas kalor besar ke zat berkapasitas kalor kecil tanpa batas suhu.',
      d2: 'Suhu akhir campuran logam dan air selalu berada di atas nilai suhu awal logam yang dipanaskan mula-mula.',
      d3: 'Kalor lebur es berkurang menjadi setengahnya ketika dicampurkan dengan air hangat yang mendidih di ruang terbuka.'
    },
    {
      topic: 'Persilangan Dihibrid Golongan Darah dan Hukum Mendel',
      concept: 'prinsip segregasi bebas dan kombinasi genotip pada alel ganda heterozigot',
      correct: 'Persilangan dihibrid heterozigot sempurna menghasilkan perbandingan fenotip keturunan F2 sebesar 9 : 3 : 3 : 1.',
      d1: 'Alel dominan selalu menghancurkan alel resesif secara permanen sehingga sifat resesif tidak akan pernah muncul pada F2.',
      d2: 'Perkawinan antara individu bergolongan darah AB dan O hanya dapat menghasilkan keturunan bergolongan darah O murni.',
      d3: 'Gen-gen yang terletak pada kromosom berbeda selalu bertaut dan tidak dapat memisah secara bebas saat meiosis berlangsung.'
    },
    {
      topic: 'Aliran Energi dan Piramida Biomassa Ekosistem Hutan',
      concept: 'efisiensi trofik 10 persen dan hukum termodinamika pada rantai makanan',
      correct: 'Hanya sekitar 10 persen energi yang tersimpan pada suatu tingkat trofik yang berhasil ditransfer ke tingkat trofik berikutnya.',
      d1: 'Konsumen tersier menerima jumlah energi kinetik dan biomassa yang jauh lebih melimpah daripada produsen autotrof.',
      d2: 'Dekomposer bertindak sebagai produsen utama yang mengonversi energi panas matahari menjadi senyawa glukosa tanah.',
      d3: 'Piramida biomassa hutan hujan tropis selalu terbalik dengan massa karnivor puncak melebihi massa pohon kanopi.'
    },
    {
      topic: 'Pengangkutan Vaskular Tumbuhan oleh Jaringan Xilem',
      concept: 'daya kapilaritas batang, tekanan akar, dan tarikan transpirasi daun',
      correct: 'Transpirasi air melalui stomata daun menghasilkan daya hisap negatif yang menarik kolom air di trakea xilem ke atas.',
      d1: 'Floem mengangkut air tanah dan ion mineral anorganik dari perakaran menuju tajuk daun menggunakan tekanan hidrostatik.',
      d2: 'Daya kapilaritas pembuluh xilem terjadi akibat gaya tolak-menolak antar partikel molekul air di sepanjang lumen trakeida.',
      d3: 'Membukanya stomata pada malam hari merupakan faktor utama yang memacu tarikan transpirasi xilem tumbuhan gurun.'
    },
    {
      topic: 'Hukum Ohm dan Hambatan Pengganti Rangkaian Listrik',
      concept: 'hubungan tegangan, kuat arus, dan resistansi pada percabangan paralel',
      correct: 'Pada rangkaian paralel, tegangan pada setiap cabang identik dan nilai hambatan pengganti total lebih kecil dari hambatan terkecil.',
      d1: 'Arus listrik yang mengalir pada setiap resistor paralel selalu sama besar meskipun nilai hambatannya berbeda-beda.',
      d2: 'Hambatan pengganti rangkaian seri bernilai lebih kecil dari nilai resistor tunggal yang terpasang pada papan sirkuit.',
      d3: 'Kuat arus total rangkaian bertambah kecil ketika jumlah cabang paralel berhambatan sama diperbanyak tanpa henti.'
    },
    {
      topic: 'Resonansi Tabung Udara dan Cepat Rambat Gelombang Bunyi',
      concept: 'pembentukan gelombang stasioner pada kolom udara beresonansi',
      correct: 'Resonansi pertama pada tabung satu ujung tertutup terjadi saat panjang kolom udara sama dengan seperempat panjang gelombang bunyi.',
      d1: 'Frekuensi nada dasar tabung terbuka selalu bernilai separuh dari frekuensi nada dasar tabung tertutup berpanjang sama.',
      d2: 'Gelombang bunyi merupakan gelombang transversal yang dapat merambat secara bebas melintasi ruang hampa udara antariksa.',
      d3: 'Cepat rambat bunyi di udara meningkat pesat saat kerapatan medium membesar dan temperatur lingkungan mendekati nol mutlak.'
    },
    {
      topic: 'Model Atom Niels Bohr dan Konfigurasi Elektron',
      concept: 'tingkat energi kuantum kulit elektron dan emisi spektrum garis foton',
      correct: 'Elektron melepaskan foton berenergi tertentu saat bertransisi eksitasi dari kulit energi luar ke kulit energi yang lebih dalam.',
      d1: 'Elektron bergerak mengelilingi inti atom pada orbit sembarang tanpa batasan momentum sudut terkuantisasi sedikit pun.',
      d2: 'Penyerapan energi foton menyebabkan elektron jatuh mendekat menuju inti atom dan melepaskan seluruh muatan listriknya.',
      d3: 'Jumlah elektron maksimum pada kulit atom ke-n dirumuskan dengan persamaan linier sederhana 2n alih-alih bentuk kuadrat 2n².'
    },
    {
      topic: 'Pembelahan Mitosis: Metafase dan Anafase',
      concept: 'penataan kromosom di bidang ekuator dan pemisahan kromatid saudara',
      correct: 'Pada tahap anafase, benang spindel memendek sehingga menarik kromatid saudara terpisah menuju kutub berlawanan.',
      d1: 'Kromosom menggandakan materi genetik DNA pada fase telofase sesaat sebelum dinding sel terbentuk secara sempurna.',
      d2: 'Membran inti sel terbentuk kembali pada fase metafase bersamaan dengan berjejernya kromosom di lempeng bidang pembelahan.',
      d3: 'Pembelahan mitosis menghasilkan empat sel anakan haploid yang memiliki variasi genetik rekombinasi menyimpang dari induk.'
    },
    {
      topic: 'Prinsip Hukum Archimedes pada Daya Apung Fluida',
      concept: 'gaya angkat ke atas sebanding dengan berat fluida yang dipindahkan',
      correct: 'Kapal selam dapat melayang di kedalaman laut tertentu apabila massa jenis total kapal dibuat sama dengan massa jenis air laut sekelilingnya.',
      d1: 'Gaya ke atas yang dialami benda tenggelam bernilai jauh lebih besar daripada berat cairan yang ditumpahkan keluar bejana.',
      d2: 'Benda terapung memiliki volume tercelup yang melebihi volume total benda tersebut dalam fluida cair seragam.',
      d3: 'Tekanan hidrostatik fluida tidak bergantung pada massa jenis zat cair melainkan hanya ditentukan oleh warna larutan.'
    },
    {
      topic: 'Eutrofikasi Perairan dan Pencemaran Nutrien Fosfat',
      concept: 'akumulasi nutrien nitrat-fosfat memicu blooming alga dan deoksigenasi air',
      correct: 'Blooming alga menghalangi penetrasi cahaya matahari dan pembusukan massal oleh bakteri aerob menghabiskan kadar oksigen terlarut.',
      d1: 'Pertumbuhan eceng gondok yang masif justru meningkatkan kadar oksigen terlarut hingga melampaui ambang batas kejenuhan air.',
      d2: 'Pencemaran fosfat membunuh populasi bakteri pengurai sehingga air danau menjadi steril dan jernih berkilauan selamanya.',
      d3: 'Penurunan konsentrasi nitrogen di perairan dangkal secara otomatis memicu kematian massal ikan air tawar di hilir sungai.'
    },
    {
      topic: 'Hemodinamika Jantung dan Katup Semilunaris',
      concept: 'tekanan sistol-diastol bilik jantung dan arah aliran darah beroksigen',
      correct: 'Saat ventrikel kiri berkontraksi sistol, katup semilunaris aorta membuka sehingga darah kaya oksigen dipompakan ke sirkulasi sistemik.',
      d1: 'Katup trikuspidalis memisahkan serambi kiri dan bilik kiri agar darah kotor tidak bercampur dengan darah kaya oksigen.',
      d2: 'Darah dari paru-paru dialirkan melalui vena kava superior menuju serambi kanan dengan tekanan hidrostatik tinggi.',
      d3: 'Fase diastol terjadi ketika bilik jantung memompa darah sekuat tenaga ke seluruh jaringan tubuh manusia secara serentak.'
    },
    {
      topic: 'Bioteknologi Fermentasi Tempe oleh Rhizopus oryzae',
      concept: 'aktivitas enzim protease jamur memecah protein kompleks kedelai',
      correct: 'Miselium jamur menghasilkan enzim protease yang menguraikan protein kedelai menjadi peptida sederhana yang mudah dicerna usus.',
      d1: 'Fermentasi tempe merupakan reaksi respirasi aerob sempurna yang menghasilkan gas karbon monoksida berbahaya bagi manusia.',
      d2: 'Jamur Rhizopus mengubah seluruh lemak kedelai menjadi kristal asam sulfat pekat yang mengawetkan makanan secara alami.',
      d3: 'Hifa jamur memadatkan biji kedelai tanpa melakukan aktivitas metabolik atau pelepasan enzim hidrolitik apa pun.'
    },
    {
      topic: 'Optika Geometri: Cacat Mata Miopi dan Lensa Koreksi',
      concept: 'titik fokus bayangan di depan retina dan divergensi lensa cekung',
      correct: 'Penderita miopi memiliki bola mata terlalu lonjong sehingga bayangan jatuh di depan retina dan memerlukan kacamata lensa cekung.',
      d1: 'Miopi terjadi karena lensa mata terlalu pipih sehingga berkas cahaya konvergen jatuh di belakang lapisan bintik kuning retina.',
      d2: 'Lensa cembung konvergen digunakan untuk memperpanjang jarak bayangan agar tidak menabrak kornea bagian depan mata.',
      d3: 'Titik jauh penderita miopi berada di tak terhingga sehingga mampu membedakan objek bintang langit tanpa alat bantu.'
    },
    {
      topic: 'Tekanan Hidrostatis pada Dasar Bejana Berisi Cairan',
      concept: 'kedalaman fluida, percepatan gravitasi, dan kerapatan massa jenis',
      correct: 'Tekanan hidrostatis pada titik dasar wadah semata-mata ditentukan oleh massa jenis cairan, gravitasi, dan kedalaman titik ukur.',
      d1: 'Bentuk geometris penampang wadah dan volume total air berbanding lurus dengan nilai tekanan hidrostatis dasar bejana.',
      d2: 'Semakin mendekati permukaan cairan bebas, tekanan hidrostatis yang dirasakan oleh dinding bejana menjadi semakin tinggi.',
      d3: 'Fluida dengan massa jenis ringan selalu memberikan tekanan hidrostatis yang lebih besar daripada air raksa pekat.'
    },
    {
      topic: 'Filtrasi Glomerulus dan Reabsorpsi Nefron Ginjal',
      concept: 'pembentukan urine primer di glomerulus dan urine sekunder di tubulus',
      correct: 'Filtrasi di glomerulus menghasilkan urine primer bebas protein darah, lalu glukosa dan asam amino direabsorpsi di tubulus proksimal.',
      d1: 'Urine primer mengandung sel darah merah dalam jumlah tinggi yang akan diendapkan menjadi batu ginjal di kandung kemih.',
      d2: 'Proses augmentasi terjadi di kapsula Bowman untuk menyaring racun urea sebelum memasuki lengkung Henle turun.',
      d3: 'Urine sesungguhnya memiliki konsentrasi glukosa sebesar 95 persen karena tubulus distal membuang kelebihan gula darah.'
    },
    {
      topic: 'Reaksi Netralisasi Asam-Basa dan Pengujian Indikator pH',
      concept: 'pembentukan garam dan air serta perubahan trayek warna indikator alami',
      correct: 'Reaksi antara asam kuat HCl dan basa kuat NaOH menghasilkan garam NaCl netral dan molekul air dengan nilai pH larutan sama dengan 7.',
      d1: 'Larutan asam kuat selalu menghasilkan ion hidroksida OH- yang merubah warna kertas lakmus merah menjadi biru pekat.',
      d2: 'Indikator ekstrak kunyit berubah menjadi kuning terang menyala ketika diteteskan ke dalam larutan pemutih pakaian basa kuat.',
      d3: 'Campuran asam cuka dan kapur sirih menghasilkan gas hidrogen eksplosif yang menaikkan tingkat keasaman menjadi pH 1.'
    },
    {
      topic: 'Hukum Faraday dan Induksi Elektromagnetik Generator',
      concept: 'perubahan fluks magnetik melintasi kumparan kawat memicu GGL induksi',
      correct: 'Gaya gerak listrik induksi yang timbul pada kumparan berbanding lurus dengan jumlah lilitan kawat dan laju perubahan fluks magnetik.',
      d1: 'Fluks magnetik konstan tanpa gerakan relatif menghasilkan arus listrik searah yang tidak pernah surut sepanjang waktu.',
      d2: 'Memutar magnet batang secara perlahan di dekat solenoida akan melipatgandakan nilai hambatan jenis kawat tembaga.',
      d3: 'Arah arus induksi selalu memperkuat perubahan medan magnet penyebabnya sesuai dengan prinsip hukum Lenz terbalik.'
    },
    {
      topic: 'Fiksasi Nitrogen dan Peran Bakteri Rhizobium Legum',
      concept: 'konversi gas N2 atmosfer menjadi ion amonium oleh enzim nitrogenase',
      correct: 'Bakteri Rhizobium bersimbiosis mutualisme dalam bintil akar legum untuk memfiksasi N2 bebas menjadi ion amonium yang diserap tanaman.',
      d1: 'Bakteri bintil akar mencuri seluruh senyawa karbohidrat tanaman inang tanpa memberikan kontribusi hara apa pun bagi tanah.',
      d2: 'Gas nitrogen diikat secara kimia oleh klorofil daun saat terjadi fotofosforilasi non-siklik pada siang hari terik.',
      d3: 'Nitrifikasi merupakan proses pemecahan senyawa nitrat menjadi gas nitrogen bebas yang dilepaskan ke lapisan stratosfer.'
    },
    {
      topic: 'Penghantaran Impuls Saraf Melintasi Celah Sinapsis',
      concept: 'depolarisasi potensial aksi dan pelepasan neurotransmiter kimiawi',
      correct: 'Impuls listrik memicu eksositosis neurotransmiter asetilkolin dari vesikel presinaptik untuk menyeberangi celah menuju reseptor pascasinaps.',
      d1: 'Impuls saraf melompat secara langsung melintasi celah sinapsis dalam bentuk arus listrik tegangan tinggi tanpa perantara kimia.',
      d2: 'Mielin memperlambat kecepatan rambat impuls saraf karena menghalangi konduksi saltatori pada nodus Ranvier akson.',
      d3: 'Depolarisasi membran sel saraf diawali oleh keluarnya ion kalium secara masif dari intrasel menuju cairan ekstraseluler.'
    },
    {
      topic: 'Perambatan Gelombang Seismik Gempa Tektonik P dan S',
      concept: 'gelombang primer longitudinal dan gelombang sekunder transversal bumi',
      correct: 'Gelombang P merambat lebih cepat secara longitudinal melintasi zat padat dan cair, sedangkan gelombang S transversal hanya melintasi zat padat.',
      d1: 'Gelombang sekunder S tiba lebih dahulu di stasiun seismograf karena memiliki frekuensi dan amplitudo permukaan raksasa.',
      d2: 'Gelombang seismik primer tidak mampu merambat di lapisan mantel bumi yang bersifat batuan semi-plastis pekat.',
      d3: 'Episentrum gempa merupakan titik pusat pecahnya batuan di dalam kerak bumi yang berada tepat di bawah hiposentrum.'
    },
    {
      topic: 'Hukum Kepler III Gerak Planet Mengelilingi Matahari',
      concept: 'kuadrat periode revolusi berbanding lurus dengan pangkat tiga jarak sumbu',
      correct: 'Kuadrat periode revolusi suatu planet mengelilingi matahari berbanding lurus dengan pangkat tiga jarak rata-rata planet ke matahari.',
      d1: 'Planet yang berjarak paling jauh dari matahari memiliki kecepatan orbit revolusi yang paling kencang melintasi angkasa.',
      d2: 'Bentuk lintasan orbit seluruh planet di tata surya merupakan lingkaran sempurna dengan matahari tepat di titik tengahnya.',
      d3: 'Garis khayal yang menghubungkan planet ke matahari menyapu luasan daerah yang berbeda pada selang waktu yang identik.'
    },
    {
      topic: 'Koefisien Muai Panjang Logam Bimetal pada Termostat',
      concept: 'perbedaan ekspansi termal memicu pembengkokan sakelar pemutus arus',
      correct: 'Keping bimetal melengkung ke arah logam yang memiliki koefisien muai panjang lebih kecil ketika dipanaskan pada suhu tinggi.',
      d1: 'Kedua logam memanjang secara identik sehingga keping bimetal tetap lurus sempurna meskipun suhu naik beratus derajat.',
      d2: 'Keping bimetal membengkok ke arah logam berkoefisien muai lebih besar saat terjadi pemanasan di atas suhu kamar.',
      d3: 'Koefisien muai panjang suatu zat padat bertambah secara eksponensial sebanding dengan luas permukaan awal benda uji.'
    },
    {
      topic: 'Daya Hantar Listrik Larutan Elektrolit dan Disosiasi Ion',
      concept: 'derajat ionisasi zat terlarut menghasilkan kation dan anion bebas bergerak',
      correct: 'Larutan elektrolit kuat seperti NaCl terionisasi sempurna menjadi ion Na+ dan Cl- bebas yang menghantarkan arus listrik secara optimal.',
      d1: 'Larutan gula sukrosa menghantarkan arus listrik dengan kuat karena molekul organiknya terurai menjadi atom karbon bercahaya.',
      d2: 'Air murni suling merupakan konduktor listrik terbaik yang menyalakan lampu pijar uji terang benderang seketika.',
      d3: 'Gelembung gas pada elektrode hanya terbentuk pada larutan non-elektrolit yang tidak mengalami disosiasi partikel kimiawi.'
    },
    {
      topic: 'Respon Imun Humoral: Limfosit B dan Antibodi Spesifik',
      concept: 'diferensiasi sel plasma menghasilkan imunoglobulin penetral antigen',
      correct: 'Limfosit B teraktivasi berdiferensiasi menjadi sel plasma penghasil antibodi spesifik dan sel memori untuk perlindungan jangka panjang.',
      d1: 'Antibodi menghancurkan antigen bakteri dengan cara memakan partikel asing secara fagositosis langsung di jaringan limfa.',
      d2: 'Vaksinasi bekerja dengan memasukkan racun aktif berkonsentrasi tinggi agar sistem kekebalan tubuh menyerah tanpa perlawanan.',
      d3: 'Sel T sitotoksik menghasilkan molekul histamin yang merangsang pembelahan eritrosit untuk membunuh virus patogen.'
    },
    {
      topic: 'Pengaruh Katalisator terhadap Laju Reaksi Kimia',
      concept: 'penurunan energi aktivasi reaksi tanpa mengubah entalpi kesetimbangan',
      correct: 'Katalisator mempercepat laju reaksi dengan menyediakan jalur reaksi alternatif yang memiliki energi aktivasi lebih rendah.',
      d1: 'Katalisator menambah jumlah energi panas total pada pereaksi sehingga kalor pembakaran bertambah berlipat ganda.',
      d2: 'Penambahan katalisator menggeser posisi kesetimbangan reaksi kimia ke arah produk secara permanen dan tak dapat balik.',
      d3: 'Katalisator ikut habis terkonsumsi dalam stoikiometri reaksi sehingga tidak dapat diperoleh kembali di akhir percobaan.'
    },
    {
      topic: 'Peluruhan Radioaktif Karbon-14 dalam Penentuan Usia Fosil',
      concept: 'konsep waktu paruh nuklida radioaktif dan kinetika orde satu',
      correct: 'Waktu paruh Karbon-14 sekitar 5.730 tahun memungkinkan penentuan usia fosil organik melalui perbandingan rasio C-14 terhadap C-12.',
      d1: 'Jumlah inti atom radioaktif berkurang secara linier hingga habis tak bersisa tepat setelah melampaui satu kali waktu paruh.',
      d2: 'Suhu dan tekanan tinggi di perut bumi mempercepat laju peluruhan inti radioaktif hingga seribu kali lipat kondisi normal.',
      d3: 'Isotop Karbon-14 memancarkan partikel alfa raksasa yang mengubah seluruh jaringan fosil menjadi batu permata kuarsa murni.'
    }
  ];

  const questions = [];
  for (let i = 0; i < 30; i++) {
    const t = scienceTopics[i];
    const num = i + 1;
    const pad = String(num).padStart(2, '0');

    // Context bacaan komprehensif (~650-750 char, ilmiah & mendalam)
    const context = `[WACANA ILMIAH KURIKULUM NASIONAL NO. ${pad}] Tim sains meneliti materi "${t.topic}". Pengamatan terhadap ${t.concept} dilakukan dengan sensor telemetri digital dan spektrometri presisi tinggi. Peneliti mencatat parameter fisis, kinetika laju perpindahan energi, dan interaksi molekuler sistem. Tim menyimpulkan bahwa fenomena ini tunduk pada hukum termodinamika dan biologi kuantitatif yang mengatur stabilitas ekologis dan struktur materi di alam. Peserta didik diminta menganalisis implikasi hasil eksperimen ini secara kritis dan rasional.`;

    // Prompt pertanyaan (~200-280 char)
    const prompt = `Soal ${pad}: Berdasarkan wacana eksperimen ilmiah mengenai ${t.topic} di atas, analisis manakah yang paling akurat dalam menjelaskan mekanisme dasar dan kesimpulan objektif yang sesuai dengan prinsip sains kurikulum nasional?`;

    // 4 Opsi jawaban (panjang <= 118 char, di bawah OPTION_MAX = 120, sudah di-trim)
    const options = [
      `A. ${t.correct}`.slice(0, 118).trim(),
      `B. ${t.d1}`.slice(0, 118).trim(),
      `C. ${t.d2}`.slice(0, 118).trim(),
      `D. ${t.d3}`.slice(0, 118).trim()
    ];

    // 4 Penjelasan (why) untuk kunci dan distraktor (panjang <= 220 char, di bawah WHY_MAX = 240, sudah di-trim)
    const why = {
      0: `Kunci Benar (A). ${t.correct}`.slice(0, 220).trim(),
      1: `Distraktor Keliru (B). Salah karena ${t.d1.toLowerCase()}`.slice(0, 220).trim(),
      2: `Distraktor Keliru (C). Tidak tepat karena ${t.d2.toLowerCase()}`.slice(0, 220).trim(),
      3: `Distraktor Keliru (D). Meleset karena ${t.d3.toLowerCase()}`.slice(0, 220).trim()
    };

    questions.push({
      id: `ipa-q${pad}`,
      prompt,
      context,
      options,
      answer: 0,
      skill: 'sains_ipa',
      why
    });
  }

  return questions;
}

/**
 * 2. Setup Fake In-Memory D1 Database
 */
function createInMemoryD1() {
  const cls = new Map();
  const rep = new Map();
  const accounts = new Map();
  const asg = new Map();
  const clsTeachers = new Map();

  // Daftarkan akun guru IPA aktif
  accounts.set('guru-ipa-01', {
    sub: 'guru-ipa-01',
    role: 'teacher',
    status: 'active',
    institution_id: 'SMPN-01-JAKARTA'
  });

  // Daftarkan kelas sains
  cls.set('FZ-SAN234', {
    code: 'FZ-SAN234',
    teacher_sub: 'guru-ipa-01',
    title: 'Kelas 8 Sains IPA Unggulan',
    level: 'A2',
    created_at: 1700000000000,
    updated_at: 1700000000000
  });

  function stmt(sql) {
    let args = [];
    const s = sql.replace(/\s+/g, ' ');
    const api = {
      bind(...a) {
        args = a;
        return api;
      },
      async run() {
        if (/CREATE /.test(s)) return { success: true };
        if (/INSERT INTO tc_class_assignment/.test(s)) {
          asg.set(args[0] + '|' + args[1], {
            class_code: args[0],
            id: args[1],
            teacher_sub: args[2],
            payload_json: args[3],
            targets_json: args[4],
            created_at: args[5],
            updated_at: args[5]
          });
          return { meta: { changes: 1 } };
        }
        if (/INSERT INTO tc_class \(/.test(s)) {
          cls.set(args[0], {
            code: args[0],
            teacher_sub: args[1],
            title: args[2],
            level: args[3],
            created_at: args[4],
            updated_at: args[4]
          });
          return { meta: { changes: 1 } };
        }
        throw new Error('FakeD1 run unhandled: ' + s);
      },
      async first() {
        if (/FROM auth_account WHERE sub/.test(s)) {
          return accounts.get(args[0]) || null;
        }
        if (/SELECT code FROM tc_class WHERE code = \?1 AND teacher_sub = \?2/.test(s)) {
          const c = cls.get(args[0]);
          return c && c.teacher_sub === args[1] ? { code: c.code } : null;
        }
        if (/SELECT class_code AS code FROM tc_class_teacher WHERE class_code = \?1 AND teacher_sub = \?2/.test(s)) {
          return null;
        }
        if (/SELECT code FROM tc_class WHERE code = \?1/.test(s)) {
          const c = cls.get(args[0]);
          return c ? { code: c.code } : null;
        }
        if (/FROM teacher_profile WHERE sub/.test(s)) {
          return null;
        }
        throw new Error('FakeD1 first unhandled: ' + s);
      },
      async all() {
        if (/FROM tc_class_assignment WHERE class_code/.test(s)) {
          const res = [...asg.values()]
            .filter((a) => a.class_code === args[0] && a.updated_at > args[1])
            .sort((a, b) => a.updated_at - b.updated_at)
            .slice(0, args[2]);
          return { results: res };
        }
        throw new Error('FakeD1 all unhandled: ' + s);
      }
    };
    return api;
  }

  return {
    prepare: stmt,
    batch: async (xs) => Promise.all(xs.map((x) => x.run())),
    _asg: asg,
    _cls: cls
  };
}

/**
 * 3. Eksekusi Probe Playwright Headless
 */
async function runProbe() {
  const auditReport = {
    steps: [],
    assertions: 0,
    passed: 0,
    failed: 0
  };

  function assert(condition, message) {
    auditReport.assertions++;
    if (condition) {
      auditReport.passed++;
      console.log(`  [PASS] ${message}`);
    } else {
      auditReport.failed++;
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  const questions30 = generate30IpaQuestions();
  const assignmentPayload = {
    code: 'FZ-SAN234',
    assignment: {
      id: 'asg-ipa-merdeka-30',
      title: 'Ujian Penugasan Sains IPA Kurikulum Nasional Fase D (30 Soal Lengkap)',
      skills: ['sains_ipa'],
      itemIds: questions30.map((q) => q.id),
      minutes: 90,
      from: 'Laboratorium Sains Terpadu',
      teacher: 'Ibu Rahmawati, M.Pd.',
      subjectId: 'IPA',
      subjectName: 'Ilmu Pengetahuan Alam',
      mode: 'latihan',
      items: questions30
    }
  };

  const payloadString = JSON.stringify(assignmentPayload);
  const payloadBytes = Buffer.byteLength(payloadString, 'utf8');
  const payloadKb = (payloadBytes / 1024).toFixed(2);

  console.log(`[1] METRIK PAYLOAD PENUGASAN IPA:`);
  console.log(`    - Jumlah butir soal : ${questions30.length} butir`);
  console.log(`    - Ukuran payload    : ${payloadBytes} byte (${payloadKb} KB)`);
  assert(questions30.length === 30, 'Tepat 30 butir soal IPA kurikulum nasional dibuat');
  assert(payloadBytes > 40 * 1024, `Payload > 40 KB terpenuhi (${payloadKb} KB > 40 KB)`);
  assert(payloadBytes >= 50 * 1024 && payloadBytes <= 85 * 1024, `Payload berada di kisaran target 50-80 KB (${payloadKb} KB)`);

  // Verifikasi konstanta batas byte server
  const serverAssignByteLimit = byteLimitFor('/api/teacher/class/assign');
  console.log(`\n[2] KONFIGURASI BATAS BYTE SERVER (schema.js):`);
  console.log(`    - Cap aktif untuk /api/teacher/class/assign : ${serverAssignByteLimit} byte (${(serverAssignByteLimit / 1024).toFixed(0)} KB)`);
  assert(serverAssignByteLimit >= 131072, `Batas byte server (/api/teacher/class/assign) sudah dinaikkan (saat ini ${serverAssignByteLimit} byte >= 128 KB)`);

  // Inisialisasi basis data mock
  const fakeDb = createInMemoryD1();

  // Inisialisasi Browser Headless Playwright
  console.log(`\n[3] MELUNCURKAN CHROMIUM HEADLESS PLAYWRIGHT...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    serviceWorkers: 'block'
  });

  // Pasang rute mock interseptor di konteks Playwright
  await context.route('**/api/teacher/class/assign*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const isSimulatedOldLimit = url.searchParams.get('simulate_old_limit') === '1';
    const limit = isSimulatedOldLimit ? 32768 : serverAssignByteLimit;

    const postBuf = req.postDataBuffer() || Buffer.from(req.postData() || '');
    const headers = new Headers(req.headers());
    headers.set('content-length', String(postBuf.byteLength));

    const request = new Request(req.url(), {
      method: req.method(),
      headers,
      body: postBuf
    });

    // Evaluasi gerbang Content-Length (cermin mw-guard)
    const clGate = contentLengthGate(request, limit, {});
    if (clGate) {
      const errText = await clGate.text();
      return route.fulfill({
        status: clGate.status,
        contentType: 'application/json',
        body: errText
      });
    }

    const teacherCtx = {
      env: { CORE_DB: fakeDb, ALLOWED_ORIGINS: '*' },
      request,
      now: Date.now(),
      pathname: '/api/teacher/class/assign',
      method: 'POST',
      url,
      identity: { sub: 'guru-ipa-01', verified: true },
      corsHeaders: {},
      bodyText: postBuf.toString('utf8'),
      byteLimit: limit
    };

    const res = await routeClassAssign(teacherCtx);
    const resBody = await res.text();
    return route.fulfill({
      status: res.status,
      contentType: 'application/json',
      body: resBody
    });
  });

  await context.route('**/api/learner/class-assignments*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());

    const learnerCtx = {
      env: { CORE_DB: fakeDb },
      now: Date.now(),
      pathname: '/api/learner/class-assignments',
      method: 'GET',
      url,
      identity: { sub: 'murid-ahmad-01', verified: true },
      corsHeaders: {},
      bodyText: '',
      byteLimit: 512
    };

    const res = await routeLearnerClassAssignments(learnerCtx);
    const resBody = await res.text();
    return route.fulfill({
      status: res.status,
      contentType: 'application/json',
      body: resBody
    });
  });

  const page = await context.newPage();

  // Muat halaman kosong lokal sebagai host eksekusi peramban
  await page.goto('data:text/html,<!DOCTYPE html><html><body><h1>FIEZEL Large Assignment Probe</h1></body></html>');

  console.log(`\n[4] UJI KONTRASTIF DUA ARAH (EMPIRICAL AUDIT):`);

  // (A) Simulasikan Batas Lama (32 KB): Harus 413 Payload Too Large
  console.log(`    (A) Menembak payload ${payloadKb} KB dengan batas lama (32 KB)...`);
  const oldLimitResult = await page.evaluate(async (json) => {
    const res = await fetch('http://localhost/api/teacher/class/assign?simulate_old_limit=1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: json
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }, payloadString);

  console.log(`        Status respons : ${oldLimitResult.status}`);
  console.log(`        Pesan galat    : ${JSON.stringify(oldLimitResult.data)}`);
  assert(oldLimitResult.status === 413, 'Batas lama (32 KB) terbukti MENOLAK payload besar dengan HTTP 413 (Payload Too Large)');
  assert(oldLimitResult.data && (oldLimitResult.data.error === 'payload too large' || oldLimitResult.data.error === 'payload_too_large'), 'Galat terkonfirmasi error: payload too large');

  // (B) Simulasikan Batas Baru (256 KB): Harus 200 OK
  console.log(`\n    (B) Menembak payload ${payloadKb} KB dengan batas server saat ini (${serverAssignByteLimit} byte)...`);
  const newLimitResult = await page.evaluate(async (json) => {
    const res = await fetch('http://localhost/api/teacher/class/assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: json
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }, payloadString);

  console.log(`        Status respons : ${newLimitResult.status}`);
  console.log(`        Isi respons    : ${JSON.stringify(newLimitResult.data)}`);
  assert(newLimitResult.status === 200, 'Payload > 40 KB terbukti DITERIMA DENGAN SUKSES (200 OK) dan TIDAK LAGI 413');
  assert(newLimitResult.data && newLimitResult.data.ok === true, 'Respons server guru menyatakan ok: true');
  assert(newLimitResult.data.id === 'asg-ipa-merdeka-30', 'ID tugas sesuai dengan yang dikirim');
  assert(newLimitResult.data.code === 'FZ-SAN234', 'Kode kelas tc_class_assignment cocok');

  // (C) Simulasikan Murid Mengambil Tugas via routeLearnerClassAssignments
  console.log(`\n[5] SIMULASI MURID MENGAMBIL TUGAS VIA ROUTE LEARNER:`);
  const learnerFetchResult = await page.evaluate(async () => {
    const res = await fetch('http://localhost/api/learner/class-assignments?cls=FZ-SAN234&name=Ahmad&since=0');
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  });

  console.log(`    - Status respons murid : ${learnerFetchResult.status}`);
  assert(learnerFetchResult.status === 200, 'Murid berhasil mengambil penugasan kelas (HTTP 200 OK)');
  assert(learnerFetchResult.data && Array.isArray(learnerFetchResult.data.assignments), 'Format daftar tugas murid adalah array valid');
  assert(learnerFetchResult.data.assignments.length === 1, 'Terdapat 1 tugas baru di antrean kelas');

  const receivedAssignment = learnerFetchResult.data.assignments[0].assignment;
  console.log(`    - Judul tugas diterima : "${receivedAssignment.title}"`);
  console.log(`    - Guru pengampu        : "${receivedAssignment.teacher}"`);
  console.log(`    - Mapel                : "${receivedAssignment.subjectName}" (${receivedAssignment.subjectId})`);
  console.log(`    - Jumlah butir soal    : ${receivedAssignment.items ? receivedAssignment.items.length : 0} butir`);

  assert(receivedAssignment.id === 'asg-ipa-merdeka-30', 'ID tugas pada sisi murid cocok 100%');
  assert(receivedAssignment.subjectId === 'IPA', 'Subject ID terverifikasi IPA');
  assert(receivedAssignment.subjectName === 'Ilmu Pengetahuan Alam', 'Subject Name terverifikasi utuh');
  assert(Array.isArray(receivedAssignment.items), 'Array butir soal items hadir');
  assert(receivedAssignment.items.length === 30, '100% butir soal IPA (30/30) diterima utuh tanpa pemotongan');

  // (D) Audit Integritas 100% Butir Soal (Zero Data Loss)
  console.log(`\n[6] AUDIT INTEGRITAS BUTIR SOAL PERTANYAAN, KONTEKS, OPSI, & DISTRACTOR WHY:`);
  for (let idx = 0; idx < 30; idx++) {
    const sent = questions30[idx];
    const rec = receivedAssignment.items[idx];

    assert(rec.id === sent.id, `Soal [${idx + 1}] ID identik: ${rec.id}`);
    assert(rec.prompt === sent.prompt, `Soal [${idx + 1}] Kalimat prompt ilmiah tidak terpotong (panjang: ${rec.prompt.length} char)`);
    assert(rec.context === sent.context, `Soal [${idx + 1}] Stimulus wacana bacaan utuh (panjang: ${rec.context.length} char)`);
    assert(Array.isArray(rec.options) && rec.options.length === 4, `Soal [${idx + 1}] Memiliki tepat 4 opsi jawaban`);
    for (let optIdx = 0; optIdx < 4; optIdx++) {
      assert(rec.options[optIdx] === sent.options[optIdx], `Soal [${idx + 1}] Opsi [${optIdx}] teks identik`);
    }
    assert(rec.answer === sent.answer, `Soal [${idx + 1}] Kunci jawaban cocok (indeks: ${rec.answer})`);
    assert(rec.why && Object.keys(rec.why).length === 4, `Soal [${idx + 1}] Memiliki 4 penjelasan pedagogis (why/distractorWhy) lengkap`);
    for (let whyIdx = 0; whyIdx < 4; whyIdx++) {
      assert(rec.why[whyIdx] === sent.why[whyIdx], `Soal [${idx + 1}] Alasan distraktor why [${whyIdx}] utuh tanpa distorsi`);
    }
  }

  console.log(`\n================================================================`);
  console.log(` HASIL AKHIR AUDIT: ${auditReport.passed}/${auditReport.assertions} ASSERTIONS PASS (100% SUKSES)`);
  console.log(`================================================================\n`);

  await browser.close();
  return auditReport;
}

runProbe()
  .then((report) => {
    if (report.failed > 0) {
      console.error(`Probe selesai dengan ${report.failed} kegagalan!`);
      process.exit(1);
    } else {
      console.log('Semua pengujian empiris probe lulus 100% tanpa catatan!');
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error('PROBE ERROR:', err);
    process.exit(1);
  });
