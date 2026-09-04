# m025-245 — Lapis akun: guru dan murid akhirnya punya cara masuk

Menyambungkan backend akun yang sudah ada sejak **PR #330** ke aplikasi. Sebelum rilis ini,
`app.js` tidak pernah menyentuh satu pun `/api/account/*`: seluruh rute (`register`, `login`,
`logout`, `me`, `teacher-activate`) hidup dan terpasang di Worker (SLOT 10 `route-slots.js`),
dijaga tiga gerbang, dan **tidak bisa dipakai siapa pun** karena tidak ada pemanggilnya.

Backend tanpa pemanggil adalah janji, bukan fitur — dan janji itu tidak terlihat mati justru
karena semua gerbangnya hijau.

---

## 1. Kenapa `features/neural-voice/` tersentuh (dan A13 memicu)

**Nol logika neural-voice berubah.** Satu-satunya perubahan di sana adalah penanda build
`DIAG_BUILD` m025-244 → m025-245, ditulis oleh `tools/bump-build.mjs` yang wajib menulis
KEEMPAT tempat sekaligus (`sw.js`, `core-config.js`, `fiezel-diag-panel.js`,
`coordination/BUILD-VERSION.json`).

Pola yang sama sudah terjadi di m025-240, m025-243, dan m025-244 — lihat
`FIEZEL-M025244-AJAKAN-PASANG-HOME-SCREEN-HANDOFF.md`. Dokumen ini ada untuk alasan yang sama:
A13 mengklasifikasi setiap sentuhan pada `features/neural-voice/` sebagai perubahan besar, dan
itu klasifikasi yang benar untuk dijaga ketat — lebih baik menulis satu paragraf yang
menjelaskan "hanya nomor build" daripada melunakkan gerbangnya.

---

## 2. Yang dikerjakan

| Berkas | Isi |
|---|---|
| `features/auth/fiezel-account.js` *(baru)* | Inti murni tanpa DOM: `ensureAnon`, `register`, `login`, `logout`, `refresh`, `activateTeacher` |
| `app.js` | Satu lembar **tiga mode** (masuk / daftar / kode undangan guru), pintu masuk di Pengaturan, sesi ditanyakan sekali saat boot |
| `copy-id-feat-d.js` + `copy-th-feat-d.js` | 39 kunci naskah **berpasangan** |
| `account-auth-client-test.js` *(baru)* | 41 assert, terdaftar `quality.yml` |

### Urutan yang tidak boleh dibalik

`POST /api/account/register` **menolak** permintaan tanpa identitas terverifikasi
(`route-account.js:85`), jadi `POST /api/auth/anon` wajib lebih dulu. Itu bukan formalitas:
`sub` dari cookie itulah kunci akunnya, sehingga murid yang sudah belajar berminggu-minggu
secara anonim **tidak kehilangan progresnya** saat mendaftar. Kalau urutannya dibalik, setiap
pendaftaran mencetak `sub` baru dan membuang seluruh riwayat belajar — kegagalan paling mahal
dan paling tidak terlihat sampai murid pertama mengeluh.

---

## 3. Empat invarian, dijaga dengan MENJALANKAN modulnya

Gerbangnya menjalankan modul di `vm` dengan `fetch` tiruan yang mencatat setiap permintaan.
Yang dijaga adalah **apa yang benar-benar berangkat ke server**, bukan ejaan kodenya:

- **A** Body hanya `{handle, password, code}`. Satu field `sub`/`role` saja sudah cukup
  mengubah "daftar" menjadi "minta jadi guru".
- **B** Setiap panggilan membawa `credentials:'include'`. Tanpa itu server menjawab 401 dan
  seluruh lapis akun mati diam — kelas cacat yang hijau di semua gerbang lain karena tidak ada
  yang memeriksa opsi `fetch`.
- **C** Peran, cangkang, dan navigasi disalin apa adanya dari server. Nol cabang yang
  menyimpulkan peran: cangkang guru yang bisa disimpulkan klien adalah cangkang guru yang bisa
  **dipaksa** klien.
- **D** Kata sandi tidak pernah disimpan — modul tidak menyentuh `localStorage`,
  `sessionStorage`, maupun `indexedDB` sama sekali.

Ditambah **anti-drift**: panjang sandi, jumlah kelas karakter, bentuk handle, dan peta cangkang
dibaca dari *sumber server* lalu diadu dengan nilai klien. Cermin yang menyimpang menolak sandi
yang sebenarnya sah — lebih buruk daripada tidak punya cermin.

**Anti-enumerasi sampai ke naskah:** gagal masuk selalu satu kalimat, apa pun sebabnya, dan
login tidak ditolak lebih awal karena bentuk handle aneh — penolakan awal justru memberi tahu
penebak bentuk yang sah.

---

## 4. Kewenangan tetap di OWNER

Rilis ini **tidak** menyalakan apa pun di lapangan. Yang masih di tangan OWNER:

```bash
wrangler d1 execute fiezel-core --remote --file=workers/api/migrations/0011_auth_roles.sql
wrangler d1 execute fiezel-core --remote --file=workers/api/migrations/0012_teacher_content.sql
```

Sampai kedua migrasi itu jalan, lembar akun akan menjawab galat dari server (503/500) — bukan
diam-diam gagal, tetapi juga belum berguna. Undangan guru dicetak lewat rute owner
(`route-owner-teachers.js`) yang bergerbang `OWNER_TOKEN_HASH`.

---

## 5. Verifikasi

Gerbang barunya dibuktikan **menggigit**, bukan sekadar hijau — tiga cacat disuntik satu per
satu, ketiganya merah pada assert yang tepat, lalu pulih:

| Cacat | Hasil |
|---|---|
| kirim `sub` di body register | `FAIL A1` + `A2` |
| buang `credentials` dari `call()` | `FAIL B1` (menyebut ketiga rute) |
| geser panjang sandi klien ke 8 | `FAIL E1 — klien=8 server=10` |

29 gerbang dijalankan lokal dan hijau, termasuk `ui-render-audit` (Chromium sungguhan),
`analytics-client` 190/190, `cf-client-timeout` 72/72, `th-coverage` 143/143,
`coordination-guard` 24/24, `secret-scan` 46/46. `quality` di CI hijau 26m46s.

**Nol CSS baru:** lembar memakai `.field` / `.field-msg` / `.is-error` / `.setup-link` yang
sudah ada, jadi nol warna tambahan untuk diaudit (pelajaran dari m025-243, di mana
`contrast-test` menolak `.social-badge`).

---

## 6. Yang BELUM ditutup

1. **Naskah Thai belum ditinjau penutur asli.** Istilahnya baku (`เข้าสู่ระบบ` / `สมัคร` /
   `รหัสผ่าน`) dan paritas `id`↔`th` ditegakkan `th-coverage-test`, tetapi saklar `th` memang
   belum dirilis — tinjau sebelum menyalakannya.
2. **Migrasi belum jalan di D1 produksi** (§4). Tindakan OWNER, bukan CI.
3. **Dasbor per peran belum dibuat.** Server sudah mengirim `shell` dan `navigation`; klien
   sekarang menyimpannya, belum menggambarnya. Itu paket berikutnya, dan `role-core.js`
   sudah menyediakan `shellOwnerOf()` untuk penjaga navigasinya.
