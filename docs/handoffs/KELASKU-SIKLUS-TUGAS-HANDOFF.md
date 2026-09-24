# KelasKu: siklus hidup tugas (Kerjakan · Terlewat · Selesai · Arsip)

Otoritas: OWNER. Lahir dari audit KelasKu 24 September 2026 atas keluhan owner: "soal
yang telah diterbitkan dan diselesaikan murid menumpuk sangat berantakan seperti sampah,
tidak bisa diarsipkan atau dihapus". Laporan audit lengkap (temuan K1-K3, T1-T4, S1-S3,
riset Google Classroom / Microsoft Teams / Khan Academy):
https://claude.ai/artifact/BFY9gQYw3Gzsh5NXJ86exV

Owner menyerahkan empat keputusan ("kamu saja yang putuskan"). Yang dipakai:

| Keputusan | Nilai | Di kode |
| --- | --- | --- |
| Tugas selesai pindah ke Arsip | 14 hari setelah dikerjakan | `ARSIP_SELESAI_HARI` |
| Tugas terlewat pindah ke Arsip | 30 hari setelah tenggat | `ARSIP_TERLEWAT_HARI` |
| Murid boleh menghapus? | Tidak. Hanya arsipkan + pulihkan (hasil juga milik laporan guru) | `pulihkan()`, tanpa aksi hapus |
| Murid diberi tahu saat tugas ditarik? | Ya, satu toast + catatan "Ditarik guru" di Arsip | tahap 2 |

## Status

- **Tahap 1 — sisi murid (build `m025-364`, PR #464): SELESAI.**
  `features/class-hub/fiezel-class-hub.js` blok "SIKLUS HIDUP TUGAS MURID". Gerbang:
  `tests/kelasku-arsip-test.js`.
- **Tahap 2 — sisi guru + server (build `m025-366`): SELESAI.** Rute
  `POST /api/teacher/class/retract` (hanya guru pengirim; menimpa payload baris dengan
  `{ t:'retract' }` dan menaikkan `updated_at`, jadi kursor murid yang ada membawanya tanpa
  migrasi). Kotak masuk murid (`features/notify/fiezel-inbox.js` `tarik`) mengeluarkan tugas
  dari antrean, mencatatnya di Arsip sebagai `oleh:'guru'`, dan `app.js` memberi satu toast
  `notif.tugas-ditarik`. Ruang Guru: tab Aktif / Lewat tenggat / Arsip, Tarik dari murid,
  hapus permanen hanya dari Arsip (dua langkah, tanpa `confirm()`). Gerbang:
  `tests/kelasku-tarik-test.js` + `tests/class-sync-test.js` §2b.

## Kontrak data (jangan dipecah tanpa memperbarui kedua sisi)

- `fiezel-class-archive-v1` (localStorage murid):
  `{ v:1, ids:{ <id>: { arsip:<ms> } | { pulih:<ms> } }, missed:[ <tugas> + { arsipAt, oleh } ] }`.
  `oleh` bernilai `'otomatis'` (disapu 30 hari), `'murid'`, atau `'guru'` (ditarik — tidak bisa
  dipulihkan murid). Kunci ini dipakai `fiezel-class-hub.js` DAN `features/notify/fiezel-inbox.js`.
- `fiezel-class-submissions-v1` tidak lagi dipotong `slice(-30)`: 60 kiriman terbaru lengkap,
  yang lebih tua diringkas (`ringkas:true`, tanpa `results/items/itemIds`), batas keras 400.
- Kiriman baru membawa `isMission` dan `source` (filter mapel untuk tugas selesai).

## Jebakan yang sudah ditemui

- Tarikan menimpa payload yang sama, jadi baris tarikan TIDAK membawa `items`. Pembaca kotak
  masuk harus memeriksa `t === 'retract'` sebelum menormalkan tugas, bukan sesudahnya.
- Arsipkan-semua di Ruang Guru hanya menyentuh tugas yang terlihat di tab itu (mis. terfilter
  kelas), bukan seluruh daftar — jangan melebarkannya ke tugas guru lain di perangkat bersama.

- Tombol global `html.fiezel-ui-v6 body button:not(...)` (spesifisitas 0,13,3) menimpa gaya
  kontrol KelasKu. Kontrol datar diberi kelas `ch-plain` (sudah dikecualikan di `style.css`)
  dan selektor ber-awalan `.ch` supaya menang atas `body.fz-lux button` (0,1,2).
- Nama fungsi yang mengandung `puter` (mis. `sapuTerlewat`) memerahkan `class-hub-test`
  (larangan ketergantungan Puter) — makanya `rapikanTerlewat`.
- Bump build menyentuh `features/neural-voice/fiezel-diag-panel.js`, jadi A13 Handoff Keeper
  memperlakukan PR KelasKu sebagai perubahan besar: berkas ini yang memenuhinya.

## Langkah berikutnya (roadmap)

1. Tahap 3 — lebur "Hasilku" ke tab Progres aplikasi, pakai ulang tugas dari Arsip guru,
   arsip otomatis akhir semester.
2. Uji dengan 3-5 murid sungguhan (Indonesia dan Thailand): minta mereka menemukan tugas
   terdekat dan tugas yang terlewat tanpa bantuan.
