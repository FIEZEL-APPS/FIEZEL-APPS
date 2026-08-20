# FIEZEL 5.22 — R5 Adoption Receipt dan Replay Protection Handoff

Tanggal: 2026-08-20 WIB
Lane: R5 (roadmap `FIEZEL-PRODUCT-ROADMAP-2026-2027.md`)
Base: `main@3e0075a` (R4 slice pertama)
Rilis: `DIAG_BUILD=m025-58`, `SW_REV=m025-58-adoption-receipt-20260820-1`.

Catatan koreksi: slice ini semula dikirim tanpa menaikkan marker, dengan alasan tidak ada perubahan runtime produk. A7 dan A11 menolaknya dengan bukti eksplisit (`base=57 head=57 expected=58`) — verifier memperlakukan perubahan berkas repo di luar dokumen sebagai product deploy, dan aturan itu yang berlaku, bukan penilaian saya. Marker dinaikkan. Konsekuensinya nomor m025-58 terpakai di sini, sehingga **alokasi bebas berikutnya untuk lane audio adalah m025-59.**
Otoritas: OWNER memerintahkan roadmap dilanjutkan sampai ter-deploy.

## KENAPA INI YANG DIKERJAKAN LEBIH DULU

R5 punya lima butir. Empat di antaranya sudah punya implementasi di repo: QA queue dengan severity dan evidence (`content-qa-agent.js`), patch preview dengan dampak duplikasi (`content-patch-gate.js`, `content-qa-agent.js`), shadow cohort dan canary overlay yang dapat dihentikan (`content-canary.js`, `content-promotion.js`), serta rangkaian provenance (`content-evidence-origin.js`, `content-adoption-evidence.js`, `content-adoption.js`).

Satu butir tidak punya implementasi sama sekali: **Adoption Receipt dan replay protection**. Kata `receipt` dan `replay` tidak muncul di satu pun berkas JavaScript sebelum ini.

Itu celah nyata, bukan celah dokumen. Setiap gate di pipeline menilai satu permintaan secara terpisah. Permintaan yang sah bulan lalu akan tetap terlihat sah bulan ini, karena tidak ada yang mengingat bahwa permintaan itu sudah dipakai. Tanpa ingatan itu, satu payload adopsi lama bisa diputar ulang untuk menulis kembali konten kanonik yang sudah bergerak maju.

## APA YANG DITAMBAHKAN

`content-adoption-receipt.js` — murni, tanpa menyentuh berkas kanonik, tanpa mutasi runtime:

- `issueReceipt()` — hanya untuk adopsi berstatus `adopt`. Receipt adalah BUKTI adopsi, bukan izin adopsi.
- `verifyReceipt()` — receipt yang diubah setelah terbit tidak lagi cocok dengan `receiptId`-nya.
- `checkReplay()` — menolak tiga bentuk pengulangan.
- `appendToLedger()` / `verifyLedger()` — ledger berantai, setiap entri membawa hash entri sebelumnya.

## TIGA BENTUK REPLAY YANG DITOLAK

1. **Replay persis** — receipt yang sama diajukan dua kali. Ditolak, tetapi penambahannya idempotent: ledger dikembalikan apa adanya, bukan digandakan, dan bukan dianggap kegagalan.
2. **Replay basi** — patch yang sama sudah pernah diadopsi, lalu diajukan lagi untuk versi target lain. Ini bentuk paling halus: payload-nya terlihat baru karena versinya berbeda.
3. **Replay di luar urutan** — receipt dibuat dari versi sumber yang bukan versi kanonik sekarang.

Ditambah satu pemeriksaan kontinuitas: adopsi berikutnya harus menyambung ke keadaan kanonik terakhir (`canonicalBefore` entri baru = `canonicalAfter` entri terakhir), sehingga cabang diam-diam tidak bisa masuk.

## KEPUTUSAN YANG PERLU DIWARISKAN

1. **Rantai, bukan sekadar hash per entri.** Kalau tiap entri hanya di-hash sendiri, entri yang DIHAPUS tidak terdeteksi. Dengan rantai, penghapusan dan penyisipan memutus tautan dan titik putusnya dilaporkan.
2. **Waktu terbit bukan bagian identitas.** `receiptId` dihitung dari subjek adopsi saja, jadi menerbitkan ulang receipt yang sama pada waktu berbeda tetap menghasilkan id yang sama — itulah yang membuat deteksi replay persis bekerja.
3. **Adopsi tanpa perubahan tidak mendapat receipt.** `canonicalBefore === canonicalAfter` ditolak: bukti perubahan tidak boleh terbit untuk sesuatu yang tidak berubah.
4. **Ledger rusak menolak adopsi baru.** Kalau rantainya cacat, jawabannya bukan "terima saja"; adopsi baru ditolak dengan alasan yang menyebut ledger, bukan receipt.
5. **Receipt tidak pernah memuat isi soal.** Hanya identitas dan hash. Gate memeriksa daftar kunci subjeknya secara eksplisit.

## GATE

`node content-adoption-receipt-test.js` — 15 kasus, masuk `quality.yml`: penerbitan hanya untuk `adopt`, kontrak `now`, stabilitas `receiptId` terhadap urutan properti, penolakan adopsi tanpa perubahan, subjek tidak lengkap, deteksi receipt yang dipalsukan, entri genesis, replay persis + idempotensi, replay basi, replay di luar urutan, kontinuitas kanonik, rantai putus karena entri dihapus atau diubah, ledger rusak menolak adopsi, pemulihan ledger asing, dan batas ledger + tidak ada isi soal di receipt.

## LANJUTAN

1. **Sambungkan receipt ke `content-adoption.js`**: setelah status `adopt`, terbitkan receipt dan simpan ledger-nya bersama artefak rilis. Ini butuh keputusan tempat penyimpanan ledger (berkas repo vs artefak rilis), jadi sengaja dipisah dari slice ini.
2. **Reviewer decision** pada QA queue: `content-qa-agent.js` sudah menghasilkan severity dan evidence, tetapi belum merekam keputusan reviewer sebagai bagian dari provenance.
3. R6 (5.23) Reliability and Multi-Device Continuity — perlu keputusan arsitektur dan consent terpisah; cloud sync tidak boleh aktif implisit.
4. Setelah seluruh roadmap ter-deploy: retest fisik neural voice oleh OWNER.
