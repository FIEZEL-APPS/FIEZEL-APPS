# FIEZEL CHARACTER CONTEXT MAP

> Versi 1.0 · Juni 2026 · Di mana, kapan, dan seberapa besar Nusa & Mira muncul.
> Prinsip: karakter adalah **lapisan emosi**, bukan dekorasi. Ia tidak pernah menutupi soal, tabel, form, atau pengaturan.
> Bahasa: Indonesia (bagian 1) · ไทย (bagian 2).

---

# BAGIAN 1 — BAHASA INDONESIA

## 1. Aturan umum
| Aturan | Isi |
|---|---|
| Satu pintu | Semua reaksi Nusa lewat `FiezelPaw.react(event)` / `setState(state)`. Kulit Nusa memetakan state → pose (lihat Character Bible §4). |
| Ukuran | Bust (kepala) ≤ 56 px di strip/pil; panggung penuh 96–150 px; scene lebar penuh kartu. |
| Kepadatan | **Tidak muncul** di: form, pengaturan, tabel, tabel nilai guru, editor soal, dasbor analitik. |
| Gerak | Mikro-gerak ≤ 9 % translasi, ≤ 5° rotasi, ≥ 0,7 s. Dimatikan oleh `body.reduce-motion` / `prefers-reduced-motion`. |
| Bahasa | Karakter tidak membawa teks; semua copy lewat i18n (`kelas.mira-*`, `coach.*`). |

## 2. Peta konteks

| # | Konteks | Karakter & pose | Pemicu / lokasi kode | Ukuran |
|---|---|---|---|---|
| 1 | **Landing (website)** hero | Nusa `full-wave` (panggung murid, kiri) · Mira `head-happy` mengintip di balik laptop (panggung guru) | `website/index.html`, `website/th/index.html` → `.hero-nusa`, `.mira-img` | 138–236 px / 172 px |
| 2 | **Onboarding** | Nusa bust: `lesson-start`→`head-curious`, `greeting`→`head-happy` saat nama masuk (`onboard`) | `features/onboarding/fiezel-onboarding.js` (`<fiezel-mascot class="fiezel-ob-paw">`), `app.js showOnboarding → pawReact('onboard')` | ≤ 96 px |
| 3 | **Gelembung pembimbing** (mengambang) | Nusa bust mengikuti state: `thinking` saat menjawab, `encouraging` setelahnya | `features/ui/fiezel-coach-bubble.js` (`.fz-coach-mascot`) | 44–56 px |
| 4 | **Panel soal** (kuis) | Nusa bust di `.quiz-mascot` / slot PAW; `question-shown`→`curious`, `hover-answer`→`curious`, `answer-picked`→`thinking` | `app.js` render soal → `FiezelPawSlot.plan('quiz-question')` | 52 px |
| 5 | **Feedback benar** | `correct` → `celebrating` (`head-happy`, mikro-lompat, confetti palet G1 tetap) | `app.js answerFeedbackSignal()` | 52 px |
| 6 | **Feedback salah** | `wrong` → `confused` lalu `encouraging` (`head-oops`: cengiran + jempol, **tidak pernah menghukum**) | `app.js answerFeedbackSignal()` | 52 px |
| 7 | **Panggung materi** (Grammar lesson, Writing) | Nusa badan penuh: `studying`/`reading` → `full-neutral`; `celebrating` saat lesson selesai | `app.js` `.lesson-stage-paw`, `.writing-stage` | 96–150 px |
| 8 | **Hasil sesi** | Nusa bust di ring skor (`proud`/`encouraging`) + **tim** `highfive` (lulus) / `teaching` (perlu review) di atas kartu | `app.js finishQuiz()` → `fzChar('team', …)` `data-testid="result-team-art"` | tim ≤ 240 px |
| 9 | **Progres** | Nusa bust di kartu level + **tim** `walking` di bawah kartu (perjalanan level) | `app.js cefrRoadmapMarkup()` `data-testid="progress-team-art"` | 120–180 px |
| 10 | **Kelas (murid)** | **Kartu Mira** `full-explain` (ada tugas) / `full-wave` (tanpa tugas) + copy `kelas.mira-*` | `features/class-hub/fiezel-class-hub.js renderStudent()` `data-testid="class-mira-card"` | 96 px |
| 11 | **KelasKu (guru)** | **Kartu Mira** `full-explain` di kepala hub guru (`kelas.mira-guru`) | `fiezel-class-hub.js` teacher hub | 96 px |
| 12 | **Empty state** (belum ada materi/prompt) | Nusa badan penuh `sleepy`→`full-sleep`; opsional scene `empty-offline` | `FiezelPawSlot.plan('empty-state')` (skinned otomatis) | 96–150 px |
| 13 | **Offline / gagal muat** | Sama dengan #12; tidak menambah gambar berat saat offline (webp Nusa ada di precache SW) | `sw.js ASSETS` | — |
| 14 | **Streak hilang** | `streak-lost` → `sad`→`encouraging` (`head-oops`) | `app.js home() pawStreakWatch()` | 52 px |
| 15 | **Halaman tes/ujian** | Karakter **diam** (state `idle`, tanpa mikro-gerak) — keputusan produk | `app.js` mode ujian | — |

## 3. Kapan Mira dan Nusa satu bingkai
Gunakan aset **tim** hanya di momen "bersama": hasil sesi (tos), progres (berjalan), landing (Nusa di pundak). Di layar kerja (soal, tugas) hanya **satu** karakter hadir supaya fokus tidak terbagi.

## 4. Cara memanggil
```js
FiezelCharacters.nusa('full-wave', {alt:'Nusa', cls:'my-class'});   // <picture> webp+png
FiezelCharacters.mira('head-explain');
FiezelCharacters.team('shoulder-wave');
FiezelCharacters.scene('onboarding', {alt:'…'});
FiezelPaw.react('correct');           // kulit Nusa mengikuti otomatis
```
Di `app.js` pakai pembungkus `fzChar(kind, pose, opts)` dan `fzMiraCard(kicker, text, pose, testid)`.

## 5. Larangan
- Jangan menaruh dua maskot berbeda gaya (rig SVG lama vs Nusa) di satu layar: kulit Nusa menyembunyikan rig lama secara otomatis.
- Jangan menaruh karakter di atas teks soal atau opsi jawaban.
- Jangan menskalakan bust > 64 px di strip; pakai badan penuh untuk panggung.
- Jangan menambah bendera/negara/teks ke aset.

---

# ส่วนที่ 2 — ภาษาไทย

## 1. กฎทั่วไป
| กฎ | รายละเอียด |
|---|---|
| ประตูเดียว | ปฏิกิริยาทั้งหมดของนูซาผ่าน `FiezelPaw.react(event)` / `setState(state)` สกินนูซาแมปสถานะ → ท่า (ดู Character Bible §4) |
| ขนาด | บัสต์ (หัว) ≤ 56 px ในแถบ/เม็ดยา; เวทีเต็ม 96–150 px; ฉากกว้างเต็มการ์ด |
| ความหนาแน่น | **ไม่ปรากฏ** ใน: ฟอร์ม การตั้งค่า ตาราง ตารางคะแนนครู ตัวแก้ไขข้อสอบ แดชบอร์ดวิเคราะห์ |
| การเคลื่อนไหว | ไมโครโมชัน ≤ 9 % การเลื่อน ≤ 5° การหมุน ≥ 0.7 วินาที ปิดโดย `body.reduce-motion` / `prefers-reduced-motion` |
| ภาษา | ตัวละครไม่มีข้อความ ทุกสำเนาผ่าน i18n (`kelas.mira-*`, `coach.*`) |

## 2. แผนที่บริบท

| # | บริบท | ตัวละคร & ท่า | ตัวกระตุ้น / ตำแหน่งโค้ด | ขนาด |
|---|---|---|---|---|
| 1 | **หน้าแรก (เว็บไซต์)** ฮีโร่ | นูซา `full-wave` (เวทีนักเรียน ซ้าย) · มิรา `head-happy` โผล่หลังแล็ปท็อป (เวทีครู) | `website/index.html`, `website/th/index.html` → `.hero-nusa`, `.mira-img` | 138–236 px / 172 px |
| 2 | **การเริ่มต้นใช้งาน** | นูซาบัสต์: `lesson-start`→`head-curious`, `greeting`→`head-happy` เมื่อกรอกชื่อ (`onboard`) | `features/onboarding/fiezel-onboarding.js`, `app.js showOnboarding → pawReact('onboard')` | ≤ 96 px |
| 3 | **ฟองโค้ช** (ลอย) | นูซาบัสต์ตามสถานะ: `thinking` ขณะตอบ, `encouraging` หลังจากนั้น | `features/ui/fiezel-coach-bubble.js` (`.fz-coach-mascot`) | 44–56 px |
| 4 | **แผงคำถาม** (ควิซ) | นูซาบัสต์ใน `.quiz-mascot` / สล็อต PAW; `question-shown`→`curious`, `hover-answer`→`curious`, `answer-picked`→`thinking` | `app.js` → `FiezelPawSlot.plan('quiz-question')` | 52 px |
| 5 | **ผลตอบรับถูก** | `correct` → `celebrating` (`head-happy`, กระโดดเล็ก, คอนเฟตตีชุดสี G1) | `app.js answerFeedbackSignal()` | 52 px |
| 6 | **ผลตอบรับผิด** | `wrong` → `confused` แล้ว `encouraging` (`head-oops`: ยิ้มเขิน + นิ้วโป้ง **ไม่ลงโทษ**) | `app.js answerFeedbackSignal()` | 52 px |
| 7 | **เวทีบทเรียน** (Grammar, Writing) | นูซาเต็มตัว: `studying`/`reading` → `full-neutral`; `celebrating` เมื่อจบบทเรียน | `app.js` `.lesson-stage-paw`, `.writing-stage` | 96–150 px |
| 8 | **ผลลัพธ์เซสชัน** | นูซาบัสต์ในวงแหวนคะแนน (`proud`/`encouraging`) + **ทีม** `highfive` (ผ่าน) / `teaching` (ต้องทบทวน) เหนือการ์ด | `app.js finishQuiz()` → `fzChar('team', …)` `data-testid="result-team-art"` | ทีม ≤ 240 px |
| 9 | **ความก้าวหน้า** | นูซาบัสต์ในการ์ดระดับ + **ทีม** `walking` ใต้การ์ด (การเดินทางของระดับ) | `app.js cefrRoadmapMarkup()` `data-testid="progress-team-art"` | 120–180 px |
| 10 | **ห้องเรียน (นักเรียน)** | **การ์ดมิรา** `full-explain` (มีงาน) / `full-wave` (ไม่มีงาน) + สำเนา `kelas.mira-*` | `fiezel-class-hub.js renderStudent()` `data-testid="class-mira-card"` | 96 px |
| 11 | **KelasKu (ครู)** | **การ์ดมิรา** `full-explain` ที่หัวฮับครู (`kelas.mira-guru`) | `fiezel-class-hub.js` ฮับครู | 96 px |
| 12 | **สถานะว่าง** (ยังไม่มีเนื้อหา) | นูซาเต็มตัว `sleepy`→`full-sleep`; ฉาก `empty-offline` (ทางเลือก) | `FiezelPawSlot.plan('empty-state')` (สกินอัตโนมัติ) | 96–150 px |
| 13 | **ออฟไลน์ / โหลดไม่สำเร็จ** | เหมือน #12; ไม่เพิ่มภาพหนักขณะออฟไลน์ (webp นูซาอยู่ใน precache SW) | `sw.js ASSETS` | — |
| 14 | **สตรีคหาย** | `streak-lost` → `sad`→`encouraging` (`head-oops`) | `app.js home() pawStreakWatch()` | 52 px |
| 15 | **หน้าสอบ** | ตัวละคร **นิ่ง** (สถานะ `idle` ไม่มีไมโครโมชัน) — การตัดสินใจของผลิตภัณฑ์ | `app.js` โหมดสอบ | — |

## 3. เมื่อมิราและนูซาอยู่เฟรมเดียวกัน
ใช้สินทรัพย์ **ทีม** เฉพาะช่วงเวลา "ด้วยกัน": ผลลัพธ์เซสชัน (ไฮไฟว์) ความก้าวหน้า (เดิน) หน้าแรก (นูซาบนบ่า) ในหน้าจอทำงาน (ข้อสอบ งาน) ให้มี **ตัวละครเดียว** เพื่อไม่แบ่งสมาธิ

## 4. วิธีเรียกใช้
```js
FiezelCharacters.nusa('full-wave', {alt:'Nusa', cls:'my-class'});   // <picture> webp+png
FiezelCharacters.mira('head-explain');
FiezelCharacters.team('shoulder-wave');
FiezelCharacters.scene('onboarding', {alt:'…'});
FiezelPaw.react('correct');           // สกินนูซาตามอัตโนมัติ
```
ใน `app.js` ใช้ตัวห่อ `fzChar(kind, pose, opts)` และ `fzMiraCard(kicker, text, pose, testid)`

## 5. ข้อห้าม
- ห้ามวางมาสคอตสองสไตล์ (ริก SVG เก่า กับ นูซา) ในหน้าจอเดียว: สกินนูซาซ่อนริกเก่าอัตโนมัติ
- ห้ามวางตัวละครทับข้อความคำถามหรือตัวเลือกคำตอบ
- ห้ามขยายบัสต์ > 64 px ในแถบ ใช้เต็มตัวสำหรับเวที
- ห้ามเพิ่มธง/ประเทศ/ข้อความลงในสินทรัพย์
