# m025-145 — Speaking berformat ujian, dengan rubrik yang mengakui batasnya

Skills Lab sudah punya latihan bicara yang jujur: ia mengukur cakupan gagasan dan sejak awal
menyatakan tidak menilai pelafalan. Yang belum ada adalah **bentuk ujiannya** - tidak ada cue
card satu menit, tidak ada 15 detik menyiapkan, tidak ada tugas integrated.

**Status: SELESAI di branch, menunggu penerimaan fisik OWNER.**

---

## 1. Sebelas set, tujuh bentuk

| Bentuk | Menyiapkan | Bicara | Set |
|---|---:|---:|---:|
| IELTS Speaking Part 1 | 0 detik | ~40 detik/pertanyaan | 2 |
| IELTS Speaking Part 2 (cue card) | 60 detik | 120 detik | 2 |
| IELTS Speaking Part 3 (diskusi) | 0 detik | ~60 detik/pertanyaan | 2 |
| TOEFL Speaking Task 1 (Independent) | 15 detik | 45 detik | 2 |
| TOEFL Speaking Task 2 (Campus, **adaptasi**) | 30 detik | 60 detik | 1 |
| TOEFL Speaking Task 3 (Akademik, **adaptasi**) | 30 detik | 60 detik | 1 |
| TOEFL Speaking Task 4 (Kuliah, **adaptasi**) | 20 detik | 60 detik | 1 |

Angka-angka itu bukan pilihan desain FIEZEL; ia milik ujiannya, dan gate mengunci setiapnya ke
nilai yang sebenarnya. Latihan yang memberi 60 detik untuk TOEFL Task 1 melatih murid pada
ujian yang tidak ada - dan murid baru tahu di ruang ujian.

Part 2 membawa kartu **empat butir** (butir terakhir yang paling sering terlewat). Part 3
membawa pertanyaan diskusi lanjutan dari topik Part 2, seperti ujian aslinya. Tugas integrated
membawa sumber yang harus diringkas - tanpa sumber, ia hanya jadi soal opini.

## 2. Rubrik yang menyebut batasnya sendiri

Empat kriteria mengikuti keluarga kriteria IELTS Speaking. Yang membedakannya: setiap kriteria
menyatakan **apakah mesin bisa menilainya, dan kenapa**.

| Kriteria | Dinilai mesin? | Alasan |
|---|---|---|
| Kekayaan kosakata | **Ya** | cakupan gagasan bisa dihitung dari transkrip |
| Kelancaran dan keruntutan | Tidak | jeda, ragu, dan pengulangan tidak terukur dari teks |
| Ragam dan ketepatan tata bahasa | Tidak | pengenalan ucapan sering **memperbaiki** tata bahasa saat menuliskannya - menilainya berarti menilai mesinnya, bukan muridnya |
| Pelafalan | **Tidak** | skor pengenalan ucapan naik-turun karena mikrofon, aksen, dan kebisingan; memakainya sebagai nilai pelafalan berarti menghukum murid atas perangkatnya |

Gate menuntut **tepat satu** kriteria diklaim bisa dinilai mesin. Kalau nanti ada yang
menaikkan klaim itu, CI merah.

## 3. Yang tidak diubah

Kontrak privasi Skills Lab berlaku sama: tidak ada audio mentah dan tidak ada transkrip mentah
yang disimpan, dan gate memeriksanya per item. Pengikatan kontrol suara **diekstrak jadi satu
metode bersama** (`bindSpeakingControls`) alih-alih disalin - menyalinnya dua kali berarti
perbaikan privasi atau penanganan galat berikutnya hanya sampai ke salah satu jalur.

Bank ujian dimuat **terpisah dan kegagalannya tidak fatal**: Skills Lab harian tidak boleh mati
hanya karena berkas latihan ujian belum ada di origin. Itu menukar satu fitur baru dengan
seluruh fitur lama.

## 4. Adaptasi yang diakui

TOEFL Speaking Task 2-4 aslinya memakai percakapan dan kuliah **audio**. FIEZEL menyajikannya
tertulis, jadi yang dilatih sintesisnya - bukan menyimaknya. Ketiganya diberi akhiran
`_adapted`, membawa `sourceNote`, dan gate memaksa kata "ADAPTASI" tetap ada baik di kontrak
formatnya maupun di setiap itemnya.

## 5. Bukti

- Seluruh **90 gate** `.github/workflows/quality.yml`: PASS.
- `tests/speaking-exam-test.js`: **26/26 PASS**.
- Satu deskriptor rubrik ditolak gate-nya sendiri ("Belum bisa dinilai." - 19 karakter yang
  tidak mengatakan apa pun) dan ditulis ulang.
- Versi naik bersama ke `m025-145`; bank ujian masuk precache service worker.

## 6. Sisa

- **Listening belum berformat ujian.** IELTS Listening punya empat bagian dengan tipe soal
  sendiri; TOEFL Listening memakai kuliah panjang. Keduanya butuh audio yang benar-benar
  diputar, jadi ia pekerjaan tersendiri - bukan varian dari yang ini.
- Kalibrasi 300 bacaan lama (B-08/B-09) masih terbalik.
- Set Reading berformat ujian baru dua; Speaking baru sebelas.
