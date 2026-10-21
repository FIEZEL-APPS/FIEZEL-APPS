# Login wajib: layar Selamat datang · Masuk · Daftar (m025-367)

Otoritas: OWNER, 24 September 2026. Lahir dari audit login & onboarding
(https://claude.ai/artifact/Ucq5fvGRYbrKVTJUGuv8c4) atas keluhan owner:

> "User masih bisa masuk tanpa harus membuat akun, itu sangat fatal, karena saat ini aku
> ingin data siswa yang penting-penting bisa tersimpan di server, dan user bisa login di HP
> mana saja cukup menggunakan login dari Gmail."

Lalu tiga aturan susulan, dengan tiga gambar referensi (hero kontur topografi + gelombang):

1. Pilihan **murid atau guru tidak lagi ada di onboarding**. Pilihan itu ada di layar masuk.
2. **Kode KelasKu** juga diisi di layar masuk.
3. Onboarding menanyakan **kursus**: Bahasa Inggris atau Bahasa Jepang.

## Alur sesudah build ini

```
splash → [LAYAR MASUK] → perkenalan (nama → kursus → tujuan → tes awal) → Home
                │
                ├─ tab Murid: Google (utama) · akun FIEZEL (cadangan) · kode KelasKu opsional
                └─ tab Guru : akun FIEZEL guru · Daftar = aktivasi dengan kode undangan
                              · "Lihat demo Ruang Guru" → ?teacher=preview (tanpa login)
```

- Murid yang mengisi kode KelasKu langsung diantar ke kelasnya sesudah memilih kursus.
  Langkah tujuan dan tes awal dilewati, sama dengan perilaku kode kelas di perkenalan lama.
- Guru yang masuk mendarat di Ruang Guru (`state.view='tutor'`), tanpa perkenalan murid.
- Ganti bahasa id/th tersedia di hero di setiap layar.
- Pilihan yang dibuat di layar masuk dihitung sebagai pilihan bahasa perkenalan
  (`markLocaleSelected`).

## Berkas

| Berkas | Isi |
| --- | --- |
| `features/auth/fiezel-auth-screen.js` | `FiezelAuthScreen`: markup, `show()`, penanda sesi, `checkServer()`, `normalizeClassCode()` |
| `app.js` | `authGateNeeded()` / `showAuthGate()` / `verifyAuthSession()` / `teacherPreviewActive()`; gerbang di `proceed()` milik `startWelcomeExperience()`; kedua jalur keluar memasang gerbang lagi; `onCourse` di `showOnboarding()`; `load({kontenSaja:true})` |
| `features/onboarding/fiezel-onboarding.js` | `COURSE_STEP=7`, `COURSES`, `courseMarkup()`; urutan `[1,7,3,4]` / `[1,7,2,3,4,5,6]`; pemilih peran, kolom kode kelas, dan blok masuk DIHAPUS |
| `workers/api/route-auth-google.js` | `GET /api/auth/session` → `{ok, signedIn, via:'akun'\|'google'\|null, role:'murid'\|'guru'\|null}` |
| `features/i18n/copy-{id,th}-google.js` | 47 kunci `auth.layar.*` |
| `features/i18n/copy-{id,th}-feat-b.js` | kunci `onboarding.course-*` |
| `style.css` | blok `.fz-auth*`, `.fiezel-course-*`, pengecualian `.fz-plain` di aturan tombol global |
| `tests/auth-screen-test.js` | gerbang Node (A1-A5, B1-B6) + Chromium (C1-C4, SKIP tanpa Playwright) |

## Kontrak yang harus dijaga

**1. `fiezel-auth-v1` adalah penanda tampilan, bukan bukti.**
Bentuknya persis `{v:1, signedIn:true, at, role:'murid'|'guru', via:'google'|'akun'}`.
Isinya tidak pernah berupa sandi, nama pengguna, email, atau token (gerbang A1). Sesi yang sah
tetap cookie HttpOnly `fz_id` milik server.

**2. Hanya jawaban server `signedIn:false` yang mencabut penanda.**
Kondisi "tidak tahu" dibaca `null`, dan `null` tidak pernah dibaca sebagai "belum masuk".
Yang termasuk: offline, galat jaringan, server lama yang belum punya rute (404), atau bentuk
jawaban asing. Tanpa aturan ini, deploy klien yang mendahului deploy Worker mengunci semua
murid (gerbang A4, B3).

**3. Pengguna lama tidak dipaksa masuk ulang.**
`authGateNeeded()` meloloskan dua kelompok dan menulis penandanya sekali:
- perangkat yang `FiezelAccount.signedIn()`;
- perangkat yang punya email Google yang diingat (`FiezelGoogle.rememberedEmail()`).

Murid anonim murni tetap melihat layar masuk. Mendaftar dari perangkat itu memakai `sub`
anonim yang sama (`register()` dan tautan Google tidak menerbitkan `sub` baru; lihat
`GOOGLE-AUTH-HANDOFF.md` kontrak 1), jadi kelas, laporan, dan temannya ikut.

**4. Demo guru tidak pernah dihadang.**
Yang masuk tanpa login: `?teacher=preview` atau `sessionStorage['fz-teacher-preview']==='1'`.

**5. Kata sandi hanya dijaga di memori, dan hanya di layar yang sama.**
Salah ketik kode KelasKu tidak menghapus kolom sandi. Ganti layar atau peran mengosongkannya
(`lupakanSandi()`).

## Jebakan yang sudah ditemui

- **`load()` diakhiri `startWelcomeExperience()`.** Mengganti kursus di tengah perkenalan dulu
  membuka perkenalan KEDUA di atas yang pertama, sehingga murid terlempar ke langkah nama.
  `onCourse` sekarang memanggil `load({kontenSaja:true})`, yang berhenti sebelum ekor boot
  (gerbang B5).
- **Tombol global `html.fiezel-ui-v6 body button:not(...)` (0,13,3)** menimpa tab, tautan,
  dan tombol mata di layar ini. Kontrol datar diberi kelas `fz-plain`, yang dikecualikan di
  kedua aturan itu.
- **`body.fz-lux input[type="text"]` (0,2,2)** membuat kolom tampil sebagai kotak putih.
  Selektornya `.fz-auth .fz-auth-input input[name]` (0,3,1).
- **`.fiezel-goal-card`** menumpuk isi ke bawah dan mengecilkan semua `span` ke 13px. Kartu
  kursus memakai selektor `.fiezel-ob .fiezel-course-card ...`.
- **Tombol Google gagal dimuat** (jaringan sekolah, adblock): slot kosong disembunyikan dan
  catatan "pakai akun FIEZEL" muncul. Kegagalan diingat selama sesi (`googleGagal`). Tanpa
  Client ID, garis "atau" ikut disembunyikan.
- **Judul Thai bergaris bawah** terputus di huruf berkaki (`สู่`). Karena itu dipasang
  `text-decoration-skip-ink:none`.

## Yang belum (tahap berikutnya dari audit)

1. **Tahap 0, keamanan:**
   - `verifyIdentity` belum memeriksa `iat`, sehingga sesi tidak pernah kedaluwarsa atau
     dicabut dari server.
   - Keluar belum memisahkan data lokal per akun: di HP bersama, murid berikutnya melihat
     progres murid sebelumnya.
   - Nonce Google masih dibuat klien.
   - Kunci rem laju login belum per akun.
2. **Tahap 2, sinkron progres ke server:** profil, level, dan riwayat belajar. Tanpa ini,
   "login di HP mana saja" baru memindahkan identitas, belum progresnya.
3. **Tahap 3:**
   - Halaman privasi masih menjanjikan "progres tetap di perangkat"; ubah sebelum Tahap 2
     dirilis.
   - Persetujuan orang tua untuk murid di bawah umur.
4. **Tujuan belajar khusus kursus Jepang:** langkah tujuan masih menawarkan "Fondasi
   IELTS/TOEFL" dan "Bahasa Inggris harian" kepada murid kursus Jepang
   (`FiezelPersonalJourney.GOAL_IDS`).
5. **Pemulihan kata sandi murid:** belum ada, jadi layar masuk mengarahkan ke Google atau guru.
