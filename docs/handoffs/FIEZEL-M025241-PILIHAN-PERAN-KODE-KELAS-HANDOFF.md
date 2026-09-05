# m025-241 — Pilihan peran Murid/Guru di onboarding + Kode kelas

Dokumen serah-terima untuk PR #328 (branch `conflict_030926_1227`). Rilis ini menambahkan
langkah pemilihan peran di onboarding, kode kelas `FZ-XXXXXX`, dan penataan ulang Home,
lalu menaikkan nomor build ke **m025-241** lewat arbiter.

Kewenangan rilis tetap di **OWNER**. Dokumen ini ditulis dari sisi yang menyelesaikan
konflik dan menyiapkan merge, jadi ia mencatat apa yang sudah terbukti oleh gerbang dan —
sama pentingnya — apa yang **belum** terbukti. Penegakan koordinasi mengikuti prosedur
**MASTER** di `MASTER-BROADCAST.md`.

---

## 1. Kenapa dokumen ini ada

`A13 Handoff Keeper` memblokir PR ini dengan pesan yang tepat:

```
classification: BLOCK
NOTE: handoff_files_changed=0
ERROR: major neural/classroom change has no changed handoff file
```

Gerbang itu menandai perubahan sebagai **major** kalau ada berkas di `features/neural-voice/`
atau `features/tutor-classroom/` tersentuh. Di rilis ini `features/neural-voice/fiezel-diag-panel.js`
memang berubah — tetapi **hanya nomor build** (`DIAG_BUILD`), karena `tools/bump-build.mjs`
menulis keempat tempat sekaligus. Nol baris logika neural-voice berubah.

Meski begitu tuntutannya tetap tepat sasaran: rilis ini mengubah **pintu masuk pertama**
aplikasi untuk setiap pengguna baru. Perubahan sebesar itu tidak boleh mendarat tanpa
jejak yang bisa dibaca sesi berikutnya. Preseden yang sama tercatat di
`FIEZEL-M025239-LEARNER-FLOW-TUTOR-ACTION-CENTER-HANDOFF.md` bagian 1.

---

## 2. Yang mendarat

### 2.1 Pilihan peran di langkah nama

`features/onboarding/fiezel-onboarding.js` menambahkan blok **"Kamu masuk sebagai siapa?"**
di Langkah 1 (nama), dengan dua kartu:

| Kartu | Naskah pendukung |
|---|---|
| **Murid** | Belajar dengan rencana harian, diagnostic, dan duel bersama teman. |
| **Guru / Tutor** | Kelola kelas, lihat pola kesalahan murid, dan buat sesi review dalam 60 detik. |

Memilih **Guru** mengubah tombol lanjut menjadi **"Masuk ke Tutor Action Center"**,
melompati langkah tujuan/penempatan/jadwal (itu langkah belajar, bukan langkah mengajar),
dan mendaratkan guru langsung di layar `tutor`. Memilih **Murid** menjalankan onboarding
seperti biasa. Peran tersimpan lokal dan dapat dibaca modul lain lewat
`FiezelOnboarding.storedRole`. Tersedia dalam Bahasa Indonesia dan Thai.

> **Batas yang harus dibaca apa adanya:** ini **pemilihan peran, bukan sistem login atau
> akun**. Tidak ada autentikasi, tidak ada kata sandi, tidak ada verifikasi server. Siapa
> pun yang membuka aplikasi tetap bisa memilih "Guru" dan membuka Tutor Action Center.
> Yang diselesaikan rilis ini adalah **kebingungan arah** — bukan kontrol akses. Jangan
> tulis di materi apa pun bahwa FIEZEL sudah punya login guru.

### 2.2 Kode kelas `FZ-XXXXXX`

Setiap kelas di Tutor Action Center otomatis memperoleh kode `FZ-XXXXXX`, tampil besar
dengan tombol "Salin kode". Murid mengetiknya di langkah nama (opsional, dan otomatis
tersembunyi begitu peran Guru dipilih). Begitu murid menuntaskan 5 soal diagnostic,
hasilnya masuk ke kelas itu dan muncul di tab **Per murid**.

Kode hasil murid juga membawa kode kelas, sehingga saat guru menempelkan kode hasil dari
perangkat lain, murid otomatis diarahkan ke kelas yang benar.

### 2.3 Penataan Home dan taskbar

Panel "Alur belajar" naik menjadi etalase teratas; skill hub dan fokus harian mengikuti di
bawahnya. Taskbar menjadi pil kaca melayang dengan penanda aktif yang meluncur. Gaya baru
hidup di berkas baru `features/learner-flow/home-polish.css`. Semua aman untuk
`prefers-reduced-motion`.

---

## 3. Konflik dengan `main` dan cara ia diselesaikan

PR ini bercabang dari `bcc3c1bf` — snapshot lama branch learner-flow, sebelum #323 di-merge.
Karena itu ia bertabrakan dengan `main` di dua tempat.

### 3.1 `app.js` — satu baris tata letak Home

Konfliknya menipu dan **hampir membuang fitur milik orang lain**:

| Sisi | Isi |
|---|---|
| #328 | `learnerFlowHomeMarkup()` di atas `skillHubMarkup()` |
| `main` | `skillHubMarkup()`, `learnerFlowHomeMarkup()`, lalu `socialHomeMarkup()` |

`socialHomeMarkup()` **tidak ada sama sekali** di branch #328 — bukan karena dihapus,
melainkan karena berkas itu belum lahir di merge-base `bcc3c1bf`. Diverifikasi dua arah:
`git show bcc3c1bf:app.js | grep -c socialHomeMarkup` → `0`, dan diff `bcc3c1bf..77a8a3ee`
tidak menyentuh baris itu sama sekali.

Kalau sisi #328 diambil mentah-mentah, seksi sosial hilang dari Home. Karena itu **kedua
sisi dipertahankan**, dalam urutan yang dimaksud #328:

```
${learnerFlowHomeMarkup()}
${skillHubMarkup()}
${socialHomeMarkup()}
```

### 3.2 `id-golden-baseline.json`

Diregenerasi dari baseline `main` dengan `node tests/id-golden-snapshot-test.js --write-baseline`,
lalu selisihnya **diperiksa satu per satu**: yang masuk adalah naskah baru milik #328
(kartu peran, kode kelas, panel Alur belajar) — bukan penghapusan naskah lama. Baseline
tidak diregenerasi sekadar supaya hijau.

Field metadata `root` dinormalkan ke `/home/user/FIEZEL-APPS` karena regenerasi dijalankan
dari worktree `/tmp`. Field itu hanya ditulis, tidak pernah di-assert (lihat baris 176-177
`tests/id-golden-snapshot-test.js`); isi `files`/`literals`/`anchors` tidak disentuh.

---

## 4. Nomor build — m025-241, lewat arbiter

Dinaikkan dengan `node tools/bump-build.mjs`, **bukan diketik tangan**. Keempat tempat
selaras: `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`,
`coordination/BUILD-VERSION.json`.

**Kenapa bump ini wajib, bukan formalitas.** PR ini mengubah `app.js`, `index.html`, dan
`features/onboarding/fiezel-onboarding.js` — ketiganya ada di precache `sw.js` — serta
menambah berkas baru `features/learner-flow/home-polish.css`. Tanpa `SW_REV` baru, murid
yang sudah memegang shell `m025-240` **tidak akan pernah menerima pilihan peran itu**:
fiturnya masuk repo tetapi tidak sampai ke satu perangkat pun. Berkas CSS baru sudah
terdaftar di `sw.js` dan dimuat `index.html` (masing-masing 1 rujukan, diverifikasi).

---

## 5. Gerbang

Tiga belas gerbang dijalankan di pohon hasil merge, semuanya **PASS**:

`build-number-uniqueness` · `coordination-guard` · `install-health` ·
`pwa-release-coherence` · `id-golden-snapshot` · `onboarding` · `validator` ·
`boot-order` · `global-name-collision` · `locale-enum` · `th-coverage` · `a11y` · `contrast`

### Verifikasi perilaku di Chromium (390×1400, reduced-motion)

Bukan hanya lolos tes — alurnya dijalankan sungguhan:

| Aksi | Hasil terukur |
|---|---|
| Buka aplikasi → pilih Bahasa Indonesia | Langkah 1 dari 6 tampil |
| Langkah nama | "KAMU MASUK SEBAGAI SIAPA?" + dua kartu peran tampil |
| Klik `[data-testid="ob-role-guru"]` | Tombol berubah jadi "Masuk ke Tutor Action Center"; kolom kode kelas **tersembunyi** |
| Klik `[data-testid="ob-role-murid"]` | Kolom "Kode kelas dari guru (opsional)" **tampil** |
| Konsol | nol error halaman |

---

## 6. Yang BELUM terbukti

Ditulis di sini supaya tidak diklaim sebagai selesai:

- **Bukan autentikasi.** Lihat batas di 2.1. Tidak ada kontrol akses apa pun.
- **Belum diuji di perangkat nyata.** Verifikasi di atas berjalan di Chromium headless,
  bukan di iPhone atau Android. Perilaku papan ketik saat mengetik kode kelas di HP
  belum diamati.
- **Alur dua perangkat belum diuji ujung-ke-ujung di sini.** Jalur "guru buat kelas di HP A
  → murid ketik kode di HP B → hasil diagnostic muncul di HP A" diklaim terverifikasi oleh
  penulis aslinya (commit `6a454c7`), tetapi tidak diulang dalam sesi ini.
- **Belum ada tombol ganti peran.** Murid yang salah memilih "Guru" harus mengulang
  onboarding. Ini tercatat sebagai langkah berikutnya oleh penulis aslinya.

---

## 7. Langkah berikutnya

1. **Ganti peran di Pengaturan** — supaya salah pilih tidak berarti mengulang onboarding.
2. **Uji perangkat nyata** — satu iPhone dan satu Android kelas menengah, khususnya
   pengetikan kode kelas.
3. **Pertimbangkan kontrol akses sungguhan** kalau Tutor Action Center nanti memuat data
   yang tidak boleh dilihat murid. Hari ini isinya berasal dari kode hasil yang murid
   berikan sendiri, jadi risikonya terbatas — tetapi batas itu akan bergeser.
