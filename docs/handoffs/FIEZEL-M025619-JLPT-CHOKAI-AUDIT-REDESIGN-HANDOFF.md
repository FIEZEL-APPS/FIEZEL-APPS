# Berkas Serah Terima: FIEZEL-M025619-JLPT-CHOKAI-AUDIT-REDESIGN-HANDOFF.md
**Nomor Build:** `m025-619`
**Tanggal:** 20 Oktober 2026
**Cakupan:** Audit Menyeluruh Bank Soal Chōkai (聴解 N5 & N4), Braincore Pedagogical Distractor Feedback (`whyFails`), dan Redesign Antarmuka Multi-Device Responsif (Mobile, Tablet, Desktop)

---

## 1. Ringkasan Eksekutif & Latar Belakang
Pengguna melaporkan adanya inkonsistensi konten pada modul JLPT Chōkai (soal, pilihan jawaban, terjemahan, dan feedback penjelasan Braincore) serta antarmuka (UI/UX) yang berantakan saat dibuka di berbagai perangkat. Melalui orkestrasi 10 subagent spesialis, audit menyeluruh dan perbaikan end-to-end telah diselesaikan:

1. **Audit Konten Bank Soal (30 Butir Soal N5 & N4):**
   - **Mondai 1 (Task-based comprehension):** 8 butir soal divalidasi silang terhadap standar resmi JEES/JLPT. Memperbaiki korupsi `questionRomaji` pada `jlpt-n4-m1-04`, melengkapi 24 opsi pengecoh dengan alasan kegagalan presisi (`whyFails`).
   - **Mondai 2 (Point-based comprehension):** 8 butir soal diperiksa teliti. Memperbaiki 4 `questionRomaji` korup yang sebelumnya terisi teks kanji mentah (`jlpt-n5-m2-03`, `jlpt-n5-m2-04`, `jlpt-n4-m2-01`, `jlpt-n4-m2-02`), memperbaiki terjemahan kata kerja `jlpt-n5-m2-02` ("kuletakkan"), dan menyuntikkan 24 `whyFails`.
   - **Mondai 3 & 4 (Utterance & Quick Response):** 14 butir soal dievaluasi dari sisi pragmatika percakapan lisan Jepang, aizuchi, dan keigo. Memperbaiki `questionRomaji` pada `jlpt-n5-m3-01` dan menyuntikkan 28 `whyFails`.
   - **Zero Missing `whyFails`:** 100% dari 30 butir soal (90+ opsi pengecoh) kini memiliki data diagnostik miskonsepsi lengkap tanpa satupun yang kosong.

2. **Penyelarasan Pedagogis Braincore (Anti-Ghost Answer & Zero-Dumbing):**
   - Menghentikan pemalsuan jawaban murid: banner feedback kini menampilkan secara jujur opsi yang dipilih murid (`Pilihan Anda: Pilihan X ...`), alasan spesifik mengapa opsi tersebut salah (`⚠️ Analisis: ...`), dan kunci jawaban tepat.
   - Mengintegrasikan basis pengetahuan miskonsepsi `JLPT_DISTRACTOR_KB` serta fungsi `resolveWhyFails()` sebagai fail-safe dinamis berakar pada taksonomi partikel dan pragmatika Jepang.
   - Mempertahankan kartu feedback saat murid berpindah mode skrip (ふりがな ↔ 漢字 ↔ Romaji).

3. **Redesign Tipografi & Aksara Jepang (Anti-CLS Furigana):**
   - Mengganti algoritma `formatFuriganaText` lama berbasis naive split-join bertingkat dengan single-pass regex descending length, membasmi pembentukan tag `<ruby><ruby>` bersarang (*nested ruby tag corruption*).
   - Mencegah pergeseran tata letak (*Cumulative Layout Shift*) saat beralih mode dengan deklarasi CSS `visibility: hidden; display: inline;` pada tag `<rt>`, mengunci baseline tinggi baris font Jepang.
   - Menerapkan Japanese native font stack `--fz-font-ja: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif`.

4. **Ergonomi Multi-Device & Tata Letak Split-View:**
   - **Mobile (360px - 414px):** Tombol pilihan ganda memiliki target sentuh $\ge 48\text{px}$ dengan padding jempol nyaman. Segmented control mode aksara dirancang anti-overflow pada layar 360px. Bottom sheet drawer dilengkapi drag-handle 44px dan snap-point fluid.
   - **Tablet (768px - 1024px) & Desktop (1280px+):** Mengubah laci bawah menjadi **Side-Companion Dock** responsif di sisi kanan (lebar 380px–460px) dan kolom panggung kuis di sisi kiri, menghapus peregangan tombol horizontal (*stretched button slop*) di layar lebar.
   - Memperbaiki penempatan `#jlptDetailSheet` sebagai sibling langsung `.listening-modal-box` di dalam `#listeningPanelModal`.

5. **Audio Scrubber & Sinkronisasi Presisi Milidetik:**
   - Menyelesaikan bug penguncian ujian (*exam lockout*): mereset `replayCount = 0` saat berpindah butir soal (next/previous) sehingga murid tidak terkunci di nomor berikutnya.
   - Melindungi highlight giliran percakapan (`speaking-now`) dari pembatalan prematur saat audio seek dijalankan melalui mekanisme `pendingSeekSec`.
   - Mencegah browser uncaught reference error dengan abstraksi aman `safeNotifyMascot()`.

---

## 2. Bukti Pengujian Empiris (Probe-Driven Headless Playwright)

### A. Pengujian Multi-Device Viewport (`tools/dev/probe-chokai-multidevice.mjs`)
Dijalankan menggunakan Chromium headless pada 3 form-factor perangkat:
1. **Mobile (iPhone 14 - 390x844):**
   - Horizontal Overflow: Document 390px (scroll: 390px) -> **PASS**
   - Modal Box: 388px (scroll: 388px) -> **PASS**
   - Jarak Bersih Tombol Opsi: 5px vertikal konsisten -> **PASS (Tanpa Tumpukan)**
   - Drawer Docking: Bottom-Sheet -> **PASS**
2. **Tablet (iPad Air - 820x1180):**
   - Horizontal Overflow: Document 820px (scroll: 820px) -> **PASS**
   - Modal Box: 538px (scroll: 538px) -> **PASS**
   - Drawer Docking: Right-Side Dock (left: 426px, width: 394px, height: 1180px) -> **PASS**
3. **Desktop (Widescreen - 1280x800):**
   - Horizontal Overflow: Document 1280px (scroll: 1280px) -> **PASS**
   - Modal Box: 538px (scroll: 538px) -> **PASS**
   - Drawer Docking: Right-Side Dock (left: 820px, width: 460px, height: 800px) -> **PASS**

### B. Pengujian Fitur Interaktif Chōkai (`tests/jlpt-interactive-features-probe.js`)
1. **Furigana Tri-State Toggle:**
   - Mode Ruby: Terverifikasi (<ruby> furigana aktif pada kanji) -> **PASS**
   - Mode Kanji Asli: Terverifikasi (kanji murni tanpa furigana) -> **PASS**
   - Mode Romaji: Terverifikasi (romaji subtitle aktif) -> **PASS**
2. **Interactive Turn Seeking di Bottom Sheet / Side Dock:**
   - Deteksi giliran percakapan dengan seek pill -> **PASS**
   - Turn seeking melompat dan mengaktifkan highlight karakter (`speaking-now`) -> **PASS**
3. **Timed Exam Simulator (Mode Ujian Resmi):**
   - Banner timer hitung mundur live aktif -> **PASS**
   - Anti-Leak Exam Purity: Tombol intip naskah terkunci total (*disabled*) -> **PASS**

---

## 3. Daftar Berkas yang Diubah & Ringkasan Perubahan

| Berkas | Perubahan |
|---|---|
| `features/speaking-listening/jlpt-listening-bank-v1.json` | 30 butir soal N5 & N4 diaudit menyeluruh: 100% `whyFails` terisi lengkap (76 entri baru), 5 korupsi `questionRomaji` diperbaiki, terjemahan Indonesia disempurnakan. |
| `features/speaking-listening/fiezel-jlpt-listening.js` | Single-pass regex furigana, kamus kanji diperluas, audio scrubber RAF sync, `safeNotifyMascot`, `pendingSeekSec`, `JLPT_DISTRACTOR_KB`, anti-ghost banner, reset `replayCount` saat navigasi soal. |
| `features/speaking-listening/jlpt-listening.css` | Japanese font stack, anti-CLS `<rt>` styling, touch target opsi $\ge 48\text{px}$, responsive 2-column split-view di tablet/desktop ($\ge 768\text{px}$ dan $\ge 1024\text{px}$), tactile scrubber. |
| `index.html` | Penyelarasan tata letak `#jlptDetailSheet` sebagai sibling `.listening-modal-box` di dalam `#listeningPanelModal`. |
| `tests/jlpt-interactive-features-probe.js` | Skrip probe otomatis pengujian furigana, turn seeking, dan mode ujian. |
| `tools/dev/probe-chokai-multidevice.mjs` | Skrip probe otomatis pengujian layout multi-device (Mobile, Tablet, Desktop). |
| `id-golden-baseline.json` | Pembaruan baseline emas literal bahasa Indonesia dengan 29 literal diagnostik `whyFails` baru yang disengaja. |
| `coordination/BUILD-VERSION.json` | Nomor build dinaikkan ke `m025-618`. |
| `sw.js` | `SW_REV` dinaikkan ke `m025-618`. |
| `core-config.js` | `FIEZEL_PAGE_BUILD` dinaikkan ke `m025-618`. |
| `features/neural-voice/fiezel-diag-panel.js` | `DIAG_BUILD` dinaikkan ke `m025-618`. |
| `kurikulum.html` | Cache busting query param diperbarui ke `?v=m025-618`. |
| `misi.html` | Cache busting query param diperbarui ke `?v=m025-618`. |

---

## 4. Status Gerbang Mutu Lokal (Quality Gates)

Semua gerbang mutu lulus 100% (HIJAU):
- `node tests/id-golden-snapshot-test.js` -> **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/th-ui-leak-test.js` -> **PASS (FIEZEL m025-265 kebocoran naskah Indonesia di mode Thai: PASS)**
- `node tests/chokai-multi-voice-protocol-test.js` -> **PASS (30 soal, 139 turns dialog, 3 persona vokal)**
- `node tests/curriculum-cache-version-test.js` -> **PASS (26 penegasan, 2 halaman, build m025-618)**
- `node tests/gate-registry-test.js` -> **PASS (10 pass, 0 fail)**
- `node tools/bump-build.mjs --check` -> **PASS (Selaras untuk 6 titik wajib)**

---

## 5. Catatan Utang Teknis
- **Nol Utang Teknis Baru:** Tidak ada toleransi kebocoran naskah yang dinaikkan. Semua penambahan literal Indonesia dienkapsulasi dengan fungsi terjemahan `t(...)`.
- Seluruh aset dan skrip probe lokal telah diverifikasi sebelum pembuatan Pull Request.
