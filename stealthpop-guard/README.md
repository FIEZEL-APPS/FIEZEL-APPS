# 🛡️ StealthPop Guard - Anti Pop-Up Iklan Siluman (Undetected)

Aplikasi/Ekstensi peramban super ringan (**< 50 KB, 0% CPU idle**) yang dirancang khusus untuk memblokir pop-up iklan, popunder, dan jebakan klik (*click-jacking*) saat membuka situs web (situs streaming film, baca komik/manga, download, shortlink, dll.) **tanpa terdeteksi oleh sistem anti-adblock**.

---

## ✨ Fitur Unggulan

1. **Anti-Pendeteksian (100% Siluman / Undetected)**:
   - **Native Function Spoofing**: `Function.prototype.toString.call(window.open)` tetap mengembalikan string fungsi native peramban `"function open() { [native code] }"`.
   - **Dummy Window Proxy**: Saat skrip iklan memanggil `window.open()`, ekstensi mengembalikan objek *Mock Window* dengan properti `closed: false`, `focus()`, `blur()`, dll. Skrip situs mengira iklan berhasil dibuka dan tidak memunculkan notifikasi *"Matikan Adblock Anda"*.
   - **Anti-Adblock Decoys**: Menyuapkan variabel aman seperti `window.canRunAds = true` tanpa merusak elemen halaman web.

2. **Pemberantas Jebakan Klik (Overlay Trap Dismantler)**:
   - Situs streaming/download sering memasang elemen transparan layar penuh (`opacity: 0`, `z-index: 9999999`). Saat Anda mengklik tombol Play atau area layar, klik Anda dicuri untuk memicu iklan.
   - StealthPop Guard mencegat di fase *capture*, memusnahkan layer jebakan seketika, dan meneruskan klik asli Anda langsung ke tombol Play/tujuan tanpa perlu klik ulang.

3. **Pencegat Programmatic Link Hijack (`a.click()`)**:
   - Mencegat skrip nakal yang membuat link `<a target="_blank">` tersembunyi secara otomatis.

4. **Sangat Ringan**:
   - Berjalan murni dengan JavaScript modern native Manifest V3, tanpa dependensi eksternal, tanpa membebani RAM atau CPU.

---

## 🚀 Cara Pemasangan (Hanya 15 Detik)

### Cara Otomatis:
Cukup klik dua kali file **`buka_pengaturan_ekstensi.bat`**. Browser dan folder ekstensi akan terbuka otomatis.

---

### Cara Manual di Microsoft Edge:
1. Buka browser **Microsoft Edge**.
2. Masuk ke alamat: `edge://extensions`
3. Aktifkan saklar **Mode Pengembang** (*Developer mode*) di menu sebelah kiri.
4. Klik tombol **Muat yang belum dibongkar** (*Load unpacked*).
5. Pilih folder:
   `c:\Users\hp\fiezel-apps\stealthpop-guard`
6. Selesai! Ikon perisai hijau StealthPop Guard akan muncul di toolbar browser Anda.

---

### Cara Manual di Google Chrome / Brave:
1. Buka browser **Google Chrome** atau **Brave**.
2. Masuk ke alamat: `chrome://extensions` (atau `brave://extensions`)
3. Aktifkan saklar **Developer mode** di pojok kanan atas.
4. Klik tombol **Load unpacked**.
5. Pilih folder:
   `c:\Users\hp\fiezel-apps\stealthpop-guard`
6. Selesai!

---

### Opsi Tambahan: Menggunakan Tampermonkey / Violentmonkey (Bisa untuk Android)
Jika Anda menggunakan ekstensi Tampermonkey atau memakai browser mobile di HP (seperti Kiwi Browser / Firefox Android):
- Buka dashboard Tampermonkey -> Buat skrip baru -> Salin seluruh isi file **`stealthpop-guard.user.js`** -> Simpan (Save).

---

## 🧪 Cara Menguji Efektivitasnya

Buka file **`test_popunder_adblock.html`** di browser Anda:
- **Uji 1**: Coba klik tombol *window.open*. Pop-up iklan tidak akan terbuka, dan dicatat sebagai diblokir.
- **Uji 2**: Pasang jebakan transparan, lalu klik tombol Play Video. Layer transparan langsung musnah dan video langsung terputar!
- **Uji 3**: Cek pemeriksaan Anti-Adblock. Status akan menunjukkan **TIDAK TERDETEKSI (PASSED - 100% SILUMAN)**.
