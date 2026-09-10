# m025-141 — Backup berhenti memulihkan jawaban tanpa alasannya

Menutup **B-07**. Restore dulu mengembalikan apa yang murid jawab, tetapi membuang alasan di
baliknya: level yang ia pilih, kebijakan yang pernah dijalankan, hasil yang sudah dinilai, dan
daftar jawaban salahnya.

**Status: SELESAI di branch, menunggu penerimaan fisik OWNER.**

---

## 1. Tiga kehilangan yang diperbaiki

### 1.1 Pilihan level tidak ikut berpindah

`buildBackupPayload()` membuang seluruh `preferences` demi menjaga setting perangkat tetap
tinggal. Niatnya benar, akibatnya tidak: `activeLevel`, `levelMode`, dan `selfAssessedLevel`
ikut terbuang, jadi murid yang restore di perangkat baru jatuh kembali ke hasil placement atau
ke bawaan. Pilihan yang ia buat sendiri hilang tanpa pemberitahuan.

Sekarang **tepat tiga** preferensi itu ikut, lewat allowlist `LEARNING_PREFERENCES` -
bukan blocklist, supaya field perangkat yang ditambahkan nanti tidak otomatis ikut bocor.
Haptics, suara, zona waktu, dan `reportEndpoint` tetap tinggal.

### 1.2 Daftar jawaban salah dari perangkat lama hilang

`payload.wrongAnswers` sudah lama ikut ke berkas backup, tetapi `mergeProgress()` hanya membaca
`local.wrongAnswers` - isi backup-nya dibuang tanpa jejak. Jadi bahan utama review adalah
satu-satunya progres yang TIDAK pulih. Sekarang keduanya digabung dan de-duplikasi.

### 1.3 Buku besar adaptif tidak pulih

`adaptivePolicyMeta`, `policyOutcomeMeta`, dan `contentCanaryMeta` tidak pernah masuk backup.
Ketiganya sekarang ikut, dengan dua batasan yang disengaja:

- **`policyOutcomeMeta.queue` TIDAK ikut.** Antrean kiriman milik perangkat asal dan akan
  dikirim ulang dari sana; membawanya berarti dua perangkat mengirim hasil yang sama.
- Riwayat dibatasi (30 kebijakan, 60 hasil) dan digabung berdasarkan id, jadi restore berulang
  tidak menggandakan apa pun.

## 2. Aturan yang dipegang saat menggabungkan

**Pilihan di perangkat ini menang.** Kalau murid sudah memilih level di perangkat yang sedang
dipakai, restore tidak boleh memindahkannya - membaca berkas backup bukan permintaan untuk
ganti level di tengah belajar. Kalau perangkat ini belum memilih, barulah pilihan dari backup
dipakai.

`mergeProgress()` mengembalikan objek `preferences` yang SUDAH digabung, bukan objek mentah dari
backup. Ini penting karena `applyRestore()` melakukan `state={...state,...merged}`: mengembalikan
preferences mentah akan menimpa seluruh setting perangkat sekaligus.

## 3. Satu tes lama yang berubah, dan kenapa itu bukan pelonggaran

`tests/continuity-test.js` menuntut `payload.preferences === undefined`. Itu benar di bawah kontrak
lama. Sekarang assertion-nya lebih ketat, bukan lebih longgar: preferences wajib ADA, dan
kuncinya wajib **hanya** tiga field belajar itu - setiap field lain yang menyelinap masuk akan
menggagalkan gate. Empat tes baru menutup perilaku restore-nya.

## 4. Bukti

- Seluruh **86 gate** `.github/workflows/quality.yml`: PASS.
- `tests/continuity-test.js` bertambah empat tes; `tests/backup-ui-test.js` tetap hijau.
- Versi naik bersama ke `m025-141`.

## 5. Yang jujur belum tertutup (P2, bukan P1)

- **Restore masih bisa menurunkan total historis.** Backup memotong riwayat ke 500 baris lalu
  menghitung ulang total dari potongan itu. Aturan hitung-ulang itu memang disengaja supaya
  total tidak bisa membengkak, jadi memperbaikinya perlu keputusan tersendiri: menyimpan total
  arsip terpisah, atau menerima bahwa total = riwayat yang tersimpan.
- **`boundedBucket()` belum membatasi jumlah kunci.** Menambah batas berarti memilih progres
  mana yang dibuang, dan itu keputusan produk, bukan pembersihan teknis.
- Sisa P1: B-06, B-11, B-12.
