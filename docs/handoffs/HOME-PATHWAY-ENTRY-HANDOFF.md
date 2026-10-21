# Pintu masuk Jalur Ajar di Home (m025-258)

Otoritas: OWNER. Dokumen ini menutup satu regresi navigasi yang terbawa dua
redesign berturut-turut, dan mencatat kontrak yang harus dijaga siapa pun yang
menyentuh Home berikutnya.

## Status

SELESAI di branch `conflict_050926_1529` (PR #348), build `m025-258`.

Kartu **Rencana Hari Ini** dan kartu **undangan Duel** kembali terlihat di Home,
dipasang tepat di bawah hero PAW dan di atas kartu "Hari ini".

## Apa yang rusak, dan kenapa tidak ada yang menangkapnya

`home()` punya dua tata letak. Cabang `else` — satu-satunya yang memanggil
`learnerFlowHomeMarkup()` — sudah mati sejak bendera `todayHome` menyala
(`fiezel-ux-flags.js`, `UX_FALLBACK_FLAGS` di `app.js`). Sejak itu Home selalu
dicat oleh `todayHomeMarkup()`, dan fungsi itu tidak pernah memanggil blok
learner-flow.

Redesign bottombar 5 tab kemudian menghapus sisa jalannya: tab yang ada adalah
Latihan, Kelas, Hari ini, Progres, Profil — tidak ada rute `learn`.

Hasilnya layar `learn` menjadi **yatim**: kodenya, CSS-nya
(`features/learner-flow/`), dan modulnya utuh, tetapi satu-satunya pintu yang
tersisa adalah tautan undangan duel (`?duel=` di boot) dan alur invite sosial.
Tidak ada gerbang yang merah, karena tidak ada gerbang yang pernah menuntut
Home memuat pintu itu — yang diuji hanya "todayHomeMarkup ada" dan "satu tombol
primer per layar".

## Kontrak yang harus dijaga

1. **Setiap layar di `VALID_VIEWS` wajib punya pintu yang bisa diketuk murid.**
   Rute yang hanya bisa dicapai lewat URL atau modal bukan pintu. Saat sebuah
   tata letak Home diganti, periksa dulu blok apa saja yang dipanggil tata letak
   lama — bukan hanya apakah layar barunya enak dilihat.
2. **Kartu Hari ini tetap satu-satunya tombol `.primary` di Home.** Blok
   learner-flow memakai `.launch-card`, bukan `.primary`, jadi gerbang B2
   `tests/ux-redesign-test.js` tetap hijau. Jangan menaikkan salah satu kartu
   itu menjadi tombol primer kedua.
3. **Kartu undangan Duel harus tetap yang pertama di dalam blok**
   (`learnerFlowHomeMarkup()` sudah menaruh `inviteCard` paling depan). Undangan
   itu kedaluwarsa; ia tidak boleh turun ke bawah lipatan.

## Berikutnya

- Pertimbangkan gerbang kecil yang menuntut setiap nama di `VALID_VIEWS` muncul
  sebagai pintu di salah satu layar utama, supaya layar yatim berikutnya
  ketahuan otomatis, bukan lewat laporan owner.
- Ruang Guru (`tutor`) hanya muncul untuk guru terverifikasi lewat blok yang
  sama. Kalau peran guru dipindahkan ke tab sendiri, blok ini harus ikut
  ditinjau supaya tidak ada dua pintu ke satu tujuan.
