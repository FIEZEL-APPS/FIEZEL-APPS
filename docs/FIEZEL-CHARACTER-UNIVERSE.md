# FIEZEL CHARACTER UNIVERSE — Character Bible

> Versi 1.0 · Juni 2026 · Sumber kebenaran tunggal untuk karakter FIEZEL.
> Struktur: **Character Bible → Master Character → Construction System → Pose/Expression Library → Asset Library**.
> Bahasa: Indonesia (bagian 1) · ไทย (bagian 2).

---

# BAGIAN 1 — BAHASA INDONESIA

## 1. Character Bible

### 1.1 Premis dunia
FIEZEL adalah perjalanan menjelajah bahasa. Dunianya adalah **hutan hujan tropis** yang hangat dan rimbun: daun lebar, batang pohon tinggi, kabut teal di kejauhan, cahaya sore keemasan. Belajar bahasa = ekspedisi; setiap kata adalah **ubin kayu** yang ditemukan di sepanjang jalan.

Semesta ini sengaja **netral budaya** (pengguna Indonesia dan Thailand): tidak ada bendera, tulisan, atau simbol negara di aset karakter.

### 1.2 Pemeran (hanya dua — tidak ada cast pendukung)
| Karakter | Peran | Arketipe | Hadir di |
|---|---|---|---|
| **Nusa** | Maskot utama · pemandu murid | Murid yang penasaran, teman sebangku | Semua sisi murid: onboarding, soal, feedback, hasil, progres, gelembung pembimbing |
| **Mira** | Guru petualang · pemandu kelas | Guru yang hangat dan sabar | Landing, Kelas (murid), KelasKu (guru), tim bersama Nusa |

Hubungan: **guru–murid sekaligus rekan satu tim**. Ketika berada dalam satu bingkai, Nusa sering **duduk di pundak Mira**, bertengger di topinya, atau berjalan di sampingnya. Mereka tidak pernah saling menertawakan; Mira menjelaskan, Nusa mencoba, keduanya merayakan.

### 1.3 Gaya ilustrasi (terkunci)
- **Ilustrasi buku cerita anak modern**, vektor 2D.
- **Tanpa outline.** Bentuk dibangun shape-on-shape.
- **Cel-shading dua nada**: satu warna dasar + satu warna bayangan per bidang. Tidak ada gradasi, glow, bokeh, atau efek 3D.
- Warna jenuh dan hangat; latar hutan hanya pada *scene*, karakter mandiri selalu di latar transparan.
- Proporsi **matang, bukan chibi-stiker**: kepala Nusa ± 1/3 tinggi tubuh; Mira ± 3,5 kepala.

### 1.4 Emblem PAW (wajib)
Lambang merek **PAW** dari `assets/brand/fiezel-paw.svg` — **empat batang vertikal membulat di atas satu telapak oval** — adalah satu-satunya emblem yang boleh muncul pada karakter:
- Nusa: emblem krem di **syal marun**.
- Mira: emblem emas pada **pin dada kiri** jaket, dan pada **sampul buku catatan marun**.
Emblem tidak boleh diganti telapak generik, diputar, atau diubah jumlah batangnya.

### 1.5 Palet tertutup
| Nama | Hex | Pemakaian |
|---|---|---|
| Marun | `#8C2233` | Syal Nusa, buku Mira, aksen merek |
| Oker | `#E0A33C` | Bulu Nusa (dasar) |
| Oker gelap | `#B97F2A` | Bayangan bulu Nusa |
| Krem | `#FDFAF3` | Wajah/dada Nusa, kemeja Mira, emblem di syal |
| Emas | `#D8B36B` | Pin PAW Mira, kompas, celana khaki (varian) |
| Hijau hutan | `#2E7D4F` | Jaket lapangan Mira |
| Hijau scrunchie | `#1F7A63` | Ikat rambut Mira, bingkai kartu Mira di UI |
| Kulit Mira | `#FDEFD8` | Kulit hangat terang |
| Rambut Mira | `#4B281E` | Cokelat tua |
| Teal | `#2A9D8F` | Ransel Mira, kedalaman hutan |
| Tinta | `#1B1418` | Mata, detail terkecil |

## 2. Master Character

### 2.1 NUSA — monyet ekor panjang
- **Spesies**: monyet ekor panjang (macaca), disederhanakan dan diramahkan.
- **Bulu**: oker emas; **wajah, dada, dalam telinga** krem.
- **Mata**: bulat besar, iris amber-cokelat, satu titik sorot putih; alis tipis cokelat.
- **Moncong** kecil krem dengan hidung kecil dan senyum lebar.
- **Telinga** bulat di sisi kepala. **Jambul** kecil di puncak kepala.
- **Tangan** mirip manusia, lima jari, warna sedikit lebih merah muda.
- **Ekor** panjang ramping, melengkung membentuk huruf S/spiral longgar, satu.
- **Kostum**: syal marun bersimpul di depan dengan emblem PAW krem; **tas selempang** kulit cokelat kecil di sisi kanan tubuh.
- **Kepribadian**: penasaran, cepat senang, tidak pernah sedih berkepanjangan — "salah" ditanggapi dengan cengiran malu + jempol, bukan air mata.

### 2.2 MIRA — guru petualang
- Perempuan Indonesia muda, **bertubuh bulat dan menggemaskan**, pipi merah muda.
- **Rambut** cokelat tua, **sanggul tinggi** dengan **ikat rambut hijau**.
- **Kacamata bulat** bingkai tipis cokelat (wajib di setiap pose).
- **Kostum petualang**: jaket lapangan hijau hutan lengan digulung dengan saku tutup; kemeja krem; celana pendek khaki; sepatu bot cokelat; **topi jerami penjelajah** berkubah mulus; **kompas kuningan** bertali; **ransel teal** dengan tali di kedua bahu; **pin PAW emas** di dada kiri; **buku catatan marun** ber-emblem PAW.
- Versi **bust (kepala-bahu)** tanpa topi agar kacamata dan sanggul terbaca di ukuran kecil.
- **Kepribadian**: hangat, sabar, senang menjelaskan; merayakan dengan tangan terangkat, berpikir dengan jari di dagu.

## 3. Construction System (aturan yang tidak boleh berubah)
1. **Identitas tetap**: bentuk kepala, penempatan mata, warna tanda tangan, kostum, siluet — hanya pose/ekspresi yang berubah.
2. **Anatomi bersih**: dua tangan lima jari, dua kaki, satu ekor (Nusa), tidak ada bagian ganda/hilang/menyatu/terpotong bingkai.
3. **Aksesori tetap**: Nusa selalu syal + tas; Mira selalu kacamata + pin PAW + kompas; topi Mira hanya pada pose seluruh badan dan tim.
4. **Emblem PAW** selalu 4 batang + 1 telapak.
5. **Latar** karakter mandiri = transparan; scene = hutan dengan ruang kosong untuk teks.
6. **Tanpa teks** di aset (kecuali satu huruf pada ubin kayu).
7. **Reproduksi**: setiap aset baru dirender dari *Character Bible image* (`assets/characters/_reference/*.jpg`) sebagai referensi, dengan instruksi "ubah hanya pose" dan cek anatomi sebelum diterima.

## 4. Pose / Expression Library
### Nusa
| Kunci | Jenis | Deskripsi | State `<fiezel-mascot>` yang memetakannya |
|---|---|---|---|
| `full-neutral` | badan | Berdiri, senyum ramah | idle, curious, listening, lesson-start |
| `full-wave` | badan | Melambai | greeting, welcome-back, speaking |
| `full-celebrate` | badan | Melompat, dua tangan ke atas | celebrating, completion, proud, love, level-up, milestone |
| `full-thinking` | badan | Duduk bersila, tangan di dagu | thinking, hinting |
| `full-oops` | badan | Garuk kepala + jempol, cengiran malu | encouraging, confused, sad |
| `full-sleep` | badan | Tidur di dahan berlumut | sleepy |
| `head-happy` | bust | Senyum lebar | idle, greeting, celebrating, proud, … |
| `head-curious` | bust | Kepala miring, mulut "o" | curious, listening, lesson-start |
| `head-thinking` | bust | Tangan di dagu, alis berkerut | thinking, hinting, sleepy |
| `head-oops` | bust | Satu mata tertutup, garuk kepala | encouraging, confused, sad |

### Mira
| Kunci | Jenis | Deskripsi |
|---|---|---|
| `full-neutral` | badan | Berdiri, senyum hangat |
| `full-wave` | badan | Melambai |
| `full-explain` | badan | Tangan terbuka ke samping + buku terbuka |
| `full-cheer` | badan | Dua tangan ke atas, mata terpejam gembira |
| `full-thinking` | badan | Jari di dagu, kompas di tangan |
| `head-happy` / `head-explain` / `head-proud` / `head-thinking` | bust | Tanpa topi |

### Tim (Mira + Nusa)
| Kunci | Deskripsi |
|---|---|
| `shoulder-wave` | Nusa di pundak Mira, keduanya melambai |
| `highfive` | Tos! Nusa melompat menepuk telapak Mira |
| `teaching` | Mira berlutut menunjuk buku, Nusa menyimak |
| `hat-peek` | Nusa mengintip dari atas topi Mira |
| `walking` | Berjalan bersama, Nusa memanggul ubin huruf |

### Scene
`hero-landing` (ruang kosong kiri-atas untuk headline) · `onboarding` (vertikal, kanopi atas kosong) · `celebration` (persegi) · `empty-offline` (senja, tenang).

## 5. Asset Library
```
assets/characters/
├── manifest.json                 # ukuran + jalur setiap aset
├── _reference/                   # Character Bible image (sumber render ulang)
├── nusa/ {png, png@1x, webp, svg}/<kunci>.*
├── mira/ {png, png@1x, webp, svg}/<kunci>.*
├── team/ {png, png@1x, webp, svg}/<kunci>.*
└── scenes/ {jpg, webp}/<kunci>.*
```
- **png** = transparan, resolusi penuh (± 600–1000 px). **png@1x** = setengah ukuran untuk UI kecil. **webp** = pemakaian web utama. **svg** = hasil vektorisasi (path warna) untuk cetak/skala besar.
- Runtime: `features/characters/fiezel-characters.js` (`FiezelCharacters.nusa/mira/team/scene`, kulit otomatis di `<fiezel-mascot>`), gaya di `features/characters/fiezel-characters.css`.
- Salinan untuk situs pemasaran: `website/assets/characters/`.
- Galeri visual: `design/fiezel-universe-preview/index.html`.

---

# ส่วนที่ 2 — ภาษาไทย

## 1. Character Bible

### 1.1 โลกของเรื่อง
FIEZEL คือการเดินทางสำรวจภาษา โลกของมันคือ **ป่าฝนเขตร้อน** ที่อบอุ่นและเขียวชอุ่ม: ใบไม้ใหญ่ ลำต้นสูง หมอกสีเขียวอมฟ้าไกลๆ แสงยามเย็นสีทอง การเรียนภาษา = การเดินทางสำรวจ ทุกคำคือ **แผ่นไม้ตัวอักษร** ที่พบระหว่างทาง

จักรวาลนี้ **เป็นกลางทางวัฒนธรรม** โดยตั้งใจ (ผู้ใช้ทั้งอินโดนีเซียและไทย): ไม่มีธง ตัวหนังสือ หรือสัญลักษณ์ประเทศบนสินทรัพย์ตัวละคร

### 1.2 ตัวละคร (มีเพียงสองตัว — ไม่มีตัวประกอบ)
| ตัวละคร | บทบาท | ต้นแบบ | ปรากฏใน |
|---|---|---|---|
| **นูซา (Nusa)** | มาสคอตหลัก · ผู้นำทางนักเรียน | นักเรียนขี้สงสัย เพื่อนร่วมโต๊ะ | ฝั่งนักเรียนทั้งหมด: การเริ่มต้น แบบฝึกหัด ผลตอบรับ ผลลัพธ์ ความก้าวหน้า ฟองโค้ช |
| **มิรา (Mira)** | ครูนักสำรวจ · ผู้นำทางห้องเรียน | ครูที่อบอุ่นและอดทน | หน้าแรกเว็บไซต์ ห้องเรียน (นักเรียน) KelasKu (ครู) ทีมร่วมกับนูซา |

ความสัมพันธ์: **ครู–นักเรียน และเพื่อนร่วมทีม** เมื่ออยู่ในเฟรมเดียวกัน นูซามัก **นั่งบนบ่าของมิรา** เกาะบนหมวก หรือเดินเคียงข้าง ทั้งคู่ไม่เคยหัวเราะเยาะกัน มิราอธิบาย นูซาลองทำ แล้วทั้งคู่ฉลองด้วยกัน

### 1.3 สไตล์ภาพประกอบ (ล็อกแล้ว)
- **ภาพประกอบหนังสือเด็กสมัยใหม่** เวกเตอร์ 2D
- **ไม่มีเส้นขอบ** สร้างรูปทรงซ้อนรูปทรง
- **เซลเชดสองโทน**: สีพื้นหนึ่ง + สีเงาหนึ่งต่อพื้นที่ ไม่มีเกรเดียนต์ แสงเรือง โบเก้ หรือเอฟเฟกต์ 3D
- สีอิ่มและอบอุ่น พื้นหลังป่ามีเฉพาะใน *ฉาก* ตัวละครเดี่ยวอยู่บนพื้นหลังโปร่งใสเสมอ
- สัดส่วน **สมบูรณ์ ไม่ใช่สติกเกอร์จิบิ**: หัวนูซา ≈ 1/3 ของความสูง มิรา ≈ 3.5 หัว

### 1.4 ตราสัญลักษณ์ PAW (บังคับ)
ตราแบรนด์ **PAW** จาก `assets/brand/fiezel-paw.svg` — **แท่งแนวตั้งปลายมนสี่แท่งเหนือฝ่าเท้ารูปไข่หนึ่งอัน** — เป็นตราเดียวที่ปรากฏบนตัวละครได้:
- นูซา: ตราสีครีมบน **ผ้าพันคอสีแดงเลือดหมู**
- มิรา: ตราสีทองบน **เข็มกลัดอกซ้าย** ของแจ็กเก็ต และบน **ปกสมุดบันทึกสีแดงเลือดหมู**
ห้ามแทนด้วยรอยเท้าทั่วไป ห้ามหมุน ห้ามเปลี่ยนจำนวนแท่ง

### 1.5 ชุดสี (ปิด)
| ชื่อ | Hex | การใช้ |
|---|---|---|
| แดงเลือดหมู | `#8C2233` | ผ้าพันคอนูซา สมุดมิรา สำเนียงแบรนด์ |
| เหลืองอมน้ำตาล | `#E0A33C` | ขนนูซา (พื้น) |
| เหลืองอมน้ำตาลเข้ม | `#B97F2A` | เงาขนนูซา |
| ครีม | `#FDFAF3` | หน้า/อกนูซา เสื้อมิรา ตราบนผ้าพันคอ |
| ทอง | `#D8B36B` | เข็มกลัด PAW ของมิรา เข็มทิศ กางเกงกากี |
| เขียวป่า | `#2E7D4F` | แจ็กเก็ตสนามของมิรา |
| เขียวยางรัดผม | `#1F7A63` | ยางรัดผมของมิรา กรอบการ์ดมิราใน UI |
| สีผิวมิรา | `#FDEFD8` | ผิวสว่างอุ่น |
| สีผมมิรา | `#4B281E` | น้ำตาลเข้ม |
| เขียวอมฟ้า | `#2A9D8F` | กระเป๋าเป้ของมิรา ความลึกของป่า |
| หมึก | `#1B1418` | ดวงตา รายละเอียดเล็กสุด |

## 2. Master Character

### 2.1 นูซา — ลิงหางยาว
- **สายพันธุ์**: ลิงหางยาว (macaca) ทำให้เรียบง่ายและเป็นมิตร
- **ขน**: เหลืองทอง; **หน้า อก ด้านในหู** สีครีม
- **ตา**: กลมโต ม่านตาสีอำพัน-น้ำตาล จุดไฮไลต์ขาวหนึ่งจุด คิ้วบางสีน้ำตาล
- **ปาก** เล็กสีครีม จมูกเล็ก ยิ้มกว้าง
- **หู** กลมด้านข้างหัว **ปอยผม** เล็กบนหัว
- **มือ** เหมือนมนุษย์ ห้านิ้ว สีชมพูอ่อนกว่าเล็กน้อย
- **หาง** ยาวเรียว โค้งเป็นรูป S/ก้นหอยหลวม มีหนึ่งเส้น
- **เครื่องแต่งกาย**: ผ้าพันคอสีแดงเลือดหมูผูกด้านหน้า มีตรา PAW สีครีม; **กระเป๋าสะพาย** หนังน้ำตาลใบเล็กด้านขวาของตัว
- **บุคลิก**: ขี้สงสัย ดีใจง่าย ไม่เศร้านาน — เมื่อ "ผิด" จะยิ้มเขินและยกนิ้วโป้ง ไม่ใช่ร้องไห้

### 2.2 มิรา — ครูนักสำรวจ
- หญิงอินโดนีเซียวัยสาว **รูปร่างกลมน่ารัก** แก้มชมพู
- **ผม** น้ำตาลเข้ม **มวยสูง** พร้อม **ยางรัดผมสีเขียว**
- **แว่นกลม** กรอบบางสีน้ำตาล (บังคับทุกท่า)
- **ชุดนักสำรวจ**: แจ็กเก็ตสนามสีเขียวป่าพับแขน มีกระเป๋าฝาปิด; เสื้อเชิ้ตครีม; กางเกงขาสั้นกากี; รองเท้าบูตน้ำตาล; **หมวกฟางนักสำรวจ** ทรงโดมเรียบ; **เข็มทิศทองเหลือง** มีสาย; **เป้สีเขียวอมฟ้า** สายพาดสองบ่า; **เข็มกลัด PAW สีทอง** ที่อกซ้าย; **สมุดบันทึกสีแดงเลือดหมู** มีตรา PAW
- เวอร์ชัน **บัสต์ (หัว-ไหล่)** ไม่ใส่หมวก เพื่อให้แว่นและมวยผมอ่านง่ายในขนาดเล็ก
- **บุคลิก**: อบอุ่น อดทน ชอบอธิบาย ฉลองด้วยการชูแขน คิดด้วยนิ้วแตะคาง

## 3. Construction System (กฎที่ห้ามเปลี่ยน)
1. **อัตลักษณ์คงที่**: รูปหัว ตำแหน่งตา สีประจำตัว เครื่องแต่งกาย เงาร่าง — เปลี่ยนได้เฉพาะท่าทาง/สีหน้า
2. **กายวิภาคสะอาด**: สองมือห้านิ้ว สองขา หางหนึ่งเส้น (นูซา) ไม่มีส่วนซ้ำ/หาย/ติดกัน/ถูกตัดขอบ
3. **เครื่องประกอบคงที่**: นูซามีผ้าพันคอ + กระเป๋าเสมอ; มิรามีแว่น + เข็มกลัด PAW + เข็มทิศเสมอ; หมวกของมิราเฉพาะท่าเต็มตัวและท่าทีม
4. **ตรา PAW** 4 แท่ง + 1 ฝ่าเท้าเสมอ
5. **พื้นหลัง** ตัวละครเดี่ยว = โปร่งใส; ฉาก = ป่าที่มีที่ว่างสำหรับข้อความ
6. **ไม่มีข้อความ** ในสินทรัพย์ (ยกเว้นตัวอักษรเดียวบนแผ่นไม้)
7. **การผลิตซ้ำ**: สินทรัพย์ใหม่ทุกชิ้นเรนเดอร์จาก *ภาพ Character Bible* (`assets/characters/_reference/*.jpg`) ด้วยคำสั่ง "เปลี่ยนเฉพาะท่าทาง" และตรวจกายวิภาคก่อนรับ

## 4. Pose / Expression Library
### นูซา
| คีย์ | ประเภท | คำอธิบาย | สถานะ `<fiezel-mascot>` ที่แมป |
|---|---|---|---|
| `full-neutral` | เต็มตัว | ยืน ยิ้มเป็นมิตร | idle, curious, listening, lesson-start |
| `full-wave` | เต็มตัว | โบกมือ | greeting, welcome-back, speaking |
| `full-celebrate` | เต็มตัว | กระโดด ชูสองมือ | celebrating, completion, proud, love, level-up, milestone |
| `full-thinking` | เต็มตัว | นั่งขัดสมาธิ มือแตะคาง | thinking, hinting |
| `full-oops` | เต็มตัว | เกาหัว + นิ้วโป้ง ยิ้มเขิน | encouraging, confused, sad |
| `full-sleep` | เต็มตัว | นอนบนกิ่งไม้มีมอส | sleepy |
| `head-happy` | บัสต์ | ยิ้มกว้าง | idle, greeting, celebrating, proud, … |
| `head-curious` | บัสต์ | เอียงหัว ปาก "o" | curious, listening, lesson-start |
| `head-thinking` | บัสต์ | มือแตะคาง คิ้วขมวด | thinking, hinting, sleepy |
| `head-oops` | บัสต์ | หลับตาข้างหนึ่ง เกาหัว | encouraging, confused, sad |

### มิรา
| คีย์ | ประเภท | คำอธิบาย |
|---|---|---|
| `full-neutral` | เต็มตัว | ยืน ยิ้มอบอุ่น |
| `full-wave` | เต็มตัว | โบกมือ |
| `full-explain` | เต็มตัว | มือเปิดออกด้านข้าง + สมุดเปิด |
| `full-cheer` | เต็มตัว | ชูสองมือ หลับตาดีใจ |
| `full-thinking` | เต็มตัว | นิ้วแตะคาง เข็มทิศในมือ |
| `head-happy` / `head-explain` / `head-proud` / `head-thinking` | บัสต์ | ไม่ใส่หมวก |

### ทีม (มิรา + นูซา)
| คีย์ | คำอธิบาย |
|---|---|
| `shoulder-wave` | นูซาบนบ่ามิรา ทั้งคู่โบกมือ |
| `highfive` | ไฮไฟว์! นูซากระโดดตบมือมิรา |
| `teaching` | มิราคุกเข่าชี้สมุด นูซาตั้งใจฟัง |
| `hat-peek` | นูซาแอบมองจากบนหมวกมิรา |
| `walking` | เดินด้วยกัน นูซาถือแผ่นไม้ตัวอักษร |

### ฉาก
`hero-landing` (ที่ว่างซ้ายบนสำหรับหัวเรื่อง) · `onboarding` (แนวตั้ง ยอดไม้ด้านบนว่าง) · `celebration` (สี่เหลี่ยมจัตุรัส) · `empty-offline` (ยามเย็น สงบ)

## 5. Asset Library
```
assets/characters/
├── manifest.json                 # ขนาด + พาธของทุกสินทรัพย์
├── _reference/                   # ภาพ Character Bible (ต้นทางการเรนเดอร์ซ้ำ)
├── nusa/ {png, png@1x, webp, svg}/<คีย์>.*
├── mira/ {png, png@1x, webp, svg}/<คีย์>.*
├── team/ {png, png@1x, webp, svg}/<คีย์>.*
└── scenes/ {jpg, webp}/<คีย์>.*
```
- **png** = โปร่งใส ความละเอียดเต็ม (≈ 600–1000 px) **png@1x** = ครึ่งขนาดสำหรับ UI เล็ก **webp** = ใช้บนเว็บเป็นหลัก **svg** = ผลเวกเตอร์ไรซ์ (เส้นทางสี) สำหรับพิมพ์/ขยายใหญ่
- รันไทม์: `features/characters/fiezel-characters.js` (`FiezelCharacters.nusa/mira/team/scene` และสกินอัตโนมัติบน `<fiezel-mascot>`) สไตล์ที่ `features/characters/fiezel-characters.css`
- สำเนาสำหรับเว็บไซต์การตลาด: `website/assets/characters/`
- แกลเลอรีภาพ: `design/fiezel-universe-preview/index.html`
