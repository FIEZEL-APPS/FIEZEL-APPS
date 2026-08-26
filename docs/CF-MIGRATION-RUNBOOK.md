# RUNBOOK MIGRASI CLOUDFLARE — FIEZEL (untuk Owner)

**Untuk siapa:** owner FIEZEL (`fitrajft-ux`), yang menjalankan sendiri langkah dashboard,
registrar, dan terminal. Ditulis supaya bisa diikuti tanpa bertanya ke siapa pun.

**Keputusan owner yang sudah mengikat** (`EXEC-BRIEF-CF.md`):

1. Zona DNS `fiezel.my.id` **dipindah ke Cloudflare**.
2. **Plan GRATIS dulu.** Kalau terbukti tidak cukup, dilaporkan dengan angka — bukan diam-diam
   diandaikan Workers Paid. Ambang keputusan upgrade ada di **Bagian 5** dokumen ini.
3. Kebocoran API key lama sudah diurus owner. Runbook ini tidak menyentuh urusan itu.

---

## ⚠️ PERINGATAN PALING PENTING — BACA SEBELUM APA PUN

**Branch `main` otomatis jadi produksi publik dalam ≤5 menit.** Di server ArenHost ada cron yang
menjalankan `~/auto-deploy-fiezel.sh` tiap 5 menit: skrip membandingkan commit terbaru di GitHub
dengan yang terpasang, dan kalau berbeda ia mengunduh snapshot baru lalu memetakan ulang website
(akar) dan aplikasi (`/app/`) dengan tukar-atomik. Log ada di `~/fiezel-deploy.log`.

Konsekuensi operasional, tanpa dihaluskan:

- **Tidak ada staging.** Tidak ada tombol "approve". Push = rilis.
- Karena itu: **setiap flag klien wajib bernilai `off` sebelum di-push.** Flag di
  `core-config.js` (`FIEZEL_CF_CONFIG`) semuanya default `'off'`. Kalau kamu push dengan flag
  `'on'` sebelum Worker/D1/secret siap, murid yang membuka aplikasi 5 menit kemudian akan kena
  jalur yang belum ada backend-nya.
- **Flag statis bukan kill switch.** `core-config.js` ada di daftar precache service worker dan
  dilayani cache-first, jadi mengubah nilainya **tidak** menjangkau PWA yang sudah terinstal
  sampai `SW_REV` naik dan generasi shell baru terpasang. Kill switch yang nyata adalah
  `GET /api/config` dari server (Bagian 4.6).
- Mematikan auto-deploy sementara (kalau kamu benar-benar butuh jendela tenang):
  `crontab -e` di server, beri komentar `#` pada baris `auto-deploy-fiezel`. **Jangan lupa
  mengaktifkannya kembali** — kalau lupa, kamu akan mengira sudah rilis padahal belum.

> Urutan aman yang dipakai seluruh runbook ini: **infrastruktur dulu (nol dampak murid) → deploy
> Worker → pasang secret → uji dengan curl → baru putar flag dari server.** Bukan sebaliknya.

---

## Bagian 0 — Kenapa zona DNS harus di Cloudflare (jangan dilewati)

Ini bukan preferensi, ini prasyarat yang memblokir hampir semua hal lain.

| Alasan | Sumber di repo |
|---|---|
| Worker butuh **custom domain** `api.fiezel.my.id`. Hari ini tidak ada `routes`/custom domain sama sekali; Worker audio hanya lewat `*.workers.dev` | `reports/cf-a2-cf-existing.md` §(a) baris "Tidak ada `routes`" |
| Custom domain Worker **hanya bisa dibuat kalau zonanya ada di akun Cloudflare yang sama.** Subdomain `fiezel-audio.fitrajft.workers.dev` **bukan** bukti zona | `reports/cf-a2-cf-existing.md` "Perlu konfirmasi owner" #6 |
| Cookie identitas `fz_id` (`HttpOnly; Secure; SameSite=Lax; Domain=fiezel.my.id`) hanya bekerja kalau app dan API satu registrable domain. `fiezel.my.id` + `api.fiezel.my.id` = **same-site** ⇒ `SameSite=Lax` cukup | `reports/cf-b2-identity.md` §1.4 (P0 blocking) |
| CORS API berkredensial **tidak boleh** `*` (ilegal bersama credentials). Butuh allowlist origin eksplisit ⇒ butuh hostname API milik sendiri | `reports/cf-a2-cf-existing.md` rekomendasi #8; `reports/cf-b1-arch-worker.md` §3 `ALLOWED_ORIGINS` |
| Kalau zona **tidak** dipindah: identitas turun ke token opaque di `localStorage`, dan butir "tahan hapus localStorage" **tidak terpenuhi** — harus diakui terbuka, bukan diselundupkan | `reports/cf-b2-identity.md` §1.4 + B2-R1 |

Laporan akhir menempatkan ini sebagai **Keputusan nomor 1** dan risiko migrasi #2 ("prasyarat DNS
hilang dari rencana fase") — verifikasi status zona **sebelum** membangun Worker apa pun
(`reports/CF-MIGRATION-REPORT.md` §15 dan daftar keputusan #1).

---

## Bagian 1 — PINDAH ZONA DNS KE CLOUDFLARE TANPA MEMATIKAN SITUS

Perkiraan waktu: 20 menit kerja + 5 menit s.d. beberapa jam propagasi.
Risiko kalau langkahnya benar: **nol menit downtime.** Risiko kalau langkah (b) dilewati: situs
dan email bisa mati berjam-jam.

### Fakta origin yang harus kamu pegang

| Hal | Nilai |
|---|---|
| Hosting sekarang | ArenHost / LiteSpeed, cPanel di `195.88.211.212:2083` |
| IP origin (record `A` untuk `@` dan `www`) | **`195.88.211.212`** |
| Nameserver sekarang | **`srv1.arenhost.com`**, **`srv2.arenhost.com`** |
| Sertifikat origin | Let's Encrypt sudah aktif di hosting (`https://fiezel.my.id` sudah HTTPS) |

### (a) Add Site di dashboard Cloudflare — plan Free

1. Masuk ke akun Cloudflare **yang sama** dengan Worker `fiezel-audio` (subdomain
   `fitrajft.workers.dev`). Kalau kamu salah akun, custom domain `api.fiezel.my.id` nanti tidak
   bisa dibuat dan kamu harus mengulang semuanya.
2. **Add a domain** → ketik `fiezel.my.id` (tanpa `https://`, tanpa `www`).
3. Pilih metode **manual / full setup** (bukan partial/CNAME setup) — kita memang mau memindahkan
   zona ([Cloudflare: onboard a domain](https://developers.cloudflare.com/fundamentals/manage-domains/add-site/)).
4. Pilih plan: **Free**. Jangan tergoda tombol Pro; keputusan owner adalah gratis dulu.
5. **JANGAN klik "Continue to activation" / jangan ganti nameserver sekarang.** Berhenti di sini
   dan lanjut ke (b).

### (b) VERIFIKASI HASIL IMPOR RECORD — LANGKAH PALING KRITIS

Cloudflare akan memindai DNS lama dan mengimpor record yang ia temukan. **Impor ini tidak
dijamin lengkap.** Record yang paling sering tertinggal: `MX` (email), `TXT` SPF/DKIM/DMARC,
subdomain cPanel, dan record `A` untuk `mail`. Kalau kamu ganti nameserver sebelum memverifikasi,
yang hilang bukan cuma situs — **email domain berhenti diterima tanpa pesan galat.**

**Ambil dulu daftar record lama sebagai bukti** (jalankan dari komputermu, saat nameserver masih
ArenHost):

```bash
# Snapshot record lama — SIMPAN outputnya ke file, ini jaring pengamanmu
for t in A AAAA CNAME MX TXT NS SOA SRV CAA; do
  echo "=== $t"; dig +noall +answer @srv1.arenhost.com fiezel.my.id $t
done | tee ~/fiezel-dns-sebelum.txt

# Subdomain yang biasa dipakai cPanel — cek satu per satu
for h in www mail ftp cpanel webmail webdisk autodiscover api owner audio; do
  echo "=== $h"; dig +noall +answer @srv1.arenhost.com $h.fiezel.my.id A CNAME
done | tee -a ~/fiezel-dns-sebelum.txt
```

Sekarang bandingkan dengan tabel DNS di dashboard Cloudflare. **Checklist wajib centang semua:**

- [ ] Record `A` untuk `fiezel.my.id` (`@`) menunjuk **`195.88.211.212`**. Kalau isinya IP lain
      atau kosong → **perbaiki manual sekarang**, jangan lanjut.
- [ ] Record untuk `www` ada (boleh `A` ke `195.88.211.212`, boleh `CNAME` ke `fiezel.my.id`).
- [ ] **Semua `MX` tersalin** dengan prioritas yang sama seperti di `~/fiezel-dns-sebelum.txt`.
      Email adalah hal yang paling mudah rusak dan paling lambat kamu sadari.
- [ ] Record `A` untuk `mail` ada (kalau di daftar lama ada).
- [ ] Semua `TXT`: SPF (`v=spf1 …`), DKIM (biasanya `default._domainkey`), DMARC (`_dmarc`).
      SPF yang hilang = email keluar masuk folder spam.
- [ ] Subdomain cPanel yang kamu benar-benar pakai (`cpanel`, `webmail`, `ftp`, `autodiscover`).
- [ ] Record `CAA` kalau ada — kalau CAA hanya mengizinkan satu CA, sertifikat Cloudflare bisa
      gagal diterbitkan.
- [ ] Tidak ada record asing/ganda yang tidak kamu kenali.

Kalau ada yang kurang: tambahkan manual di tabel DNS Cloudflare **sebelum** langkah (c). Sepuluh
menit di sini menghemat berjam-jam pemulihan.

**Turunkan TTL sebelum pindah.** Set TTL record penting jadi **2 menit (Auto juga boleh untuk
record proxied)**. Ini yang membuat rollback di (g) berukuran menit, bukan jam.

### (c) Ganti nameserver di registrar / panel ArenHost

1. Di dashboard Cloudflare, catat dua nameserver yang diberikan untuk zona ini — bentuknya
   `<nama>.ns.cloudflare.com` (mis. `bella.ns.cloudflare.com` + `rick.ns.cloudflare.com`).
   **Pakai yang tertulis di akunmu**, jangan menyalin dari tutorial mana pun.
2. Masuk ke tempat domain `fiezel.my.id` didaftarkan (Domain Manager: `srb4280.srs-x.com/user`,
   atau panel ArenHost tempat domain dikelola).
3. Ubah nameserver **dari** `srv1.arenhost.com` + `srv2.arenhost.com` **menjadi** dua nameserver
   Cloudflare. **Hapus** yang lama — jangan tinggalkan campuran ArenHost + Cloudflare; nameserver
   campur = jawaban DNS acak antara dua sumber, dan gejalanya terlihat seperti hantu.
4. Simpan. Balik ke Cloudflare → **Check nameservers now**.
   Aktivasi biasanya beberapa menit, bisa sampai 24 jam untuk resolver yang keras kepala
   ([Cloudflare: change your nameservers](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)).

**Situs tetap hidup selama proses ini** karena: resolver yang masih memakai ArenHost mendapat
jawaban lama (IP `195.88.211.212`), resolver yang sudah pindah mendapat jawaban Cloudflare yang
**juga** menunjuk `195.88.211.212`. Kedua jalan menuju origin yang sama. Itulah sebabnya langkah
(b) tidak boleh dilewati — kalau record A salah, kedua jalan tidak lagi sama.

### (d) SSL/TLS mode: **Full** — bukan Flexible

Di Cloudflare: **SSL/TLS → Overview → Configure → Custom SSL/TLS → Full.**

Kenapa **Full**: Cloudflare menyamai protokol browser saat menghubungi origin — request HTTPS
diteruskan sebagai HTTPS, tanpa memvalidasi sertifikat origin
([Cloudflare encryption modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)).
Hosting sudah punya Let's Encrypt yang aktif, jadi leg Cloudflare→origin benar-benar terenkripsi.

**Kenapa Flexible BERBAHAYA di kasus kita — dua bahaya nyata:**

1. **Tidak terenkripsi ke origin.** Pada Flexible, trafik browser→Cloudflare boleh HTTPS tapi
   Cloudflare→origin **tidak dienkripsi** — cleartext HTTP
   ([Cloudflare: Flexible mode](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/flexible/)).
   Murid melihat ikon kunci di browser dan percaya koneksinya aman, padahal separuh perjalanan
   terbuka. Untuk aplikasi yang membawa cookie identitas `fz_id`, itu tidak bisa diterima.
2. **Loop redirect (`ERR_TOO_MANY_REDIRECTS`) — situs mati total.** Hosting LiteSpeed dengan
   Let's Encrypt hampir selalu punya aturan `.htaccess` "paksa HTTPS". Alurnya: Cloudflare
   mengirim HTTP ke origin → origin menjawab 301 ke HTTPS → Cloudflare mengirim ulang sebagai
   HTTP → origin 301 lagi → berulang sampai browser menyerah. Gejalanya: **seluruh situs putih /
   error, bukan cuma satu halaman.** Ini kegagalan langsung setelah nameserver aktif, saat kamu
   paling panik.

Cloudflare sendiri merekomendasikan **Full** atau **Full (strict)** dan menyarankan menghindari
Flexible ([encryption modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)).
**Full (strict)** lebih baik lagi (memvalidasi sertifikat origin) dan Let's Encrypt di hosting
memenuhi syaratnya
([Full strict](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)) —
**tapi** kalau sertifikat origin pernah kedaluwarsa atau nama hostnya tidak cocok, Full (strict)
akan menjatuhkan situs dengan Error 526. Rekomendasi runbook ini: **mulai dari Full**, naikkan ke
Full (strict) hanya setelah kamu memverifikasi sertifikat origin sendiri dengan
`curl -vI --resolve fiezel.my.id:443:195.88.211.212 https://fiezel.my.id/`.

Tambahan yang aman dinyalakan bersamaan: **Always Use HTTPS = On**, **Automatic HTTPS Rewrites =
On**. Yang **JANGAN** dinyalakan sekarang: HSTS (kalau salah, tidak bisa dibatalkan cepat di sisi
browser murid), Rocket Loader, dan minifikasi apa pun — ketiganya bisa merusak urutan boot
aplikasi dan service worker.

### (e) Proxy status: mana yang abu-abu (DNS only), mana yang oranye (proxied)

| Record | Status yang benar | Alasan |
|---|---|---|
| `@` (`fiezel.my.id`) → `195.88.211.212` | **Abu-abu — DNS only** pada hari pindah | Zona baru aktif = jangan mengubah dua hal sekaligus. Situs harus terbukti hidup lewat DNS Cloudflare **sebelum** kamu menambahkan lapisan proxy + cache |
| `www` | **Abu-abu**, mengikuti `@` | Sama |
| `mail`, `MX`, `TXT` SPF/DKIM/DMARC | **WAJIB abu-abu (DNS only)** | Cloudflare hanya memproksikan HTTP/HTTPS. Memproksikan `mail` = **email berhenti bekerja**, dan `MX` yang menunjuk hostname proxied juga rusak |
| `cpanel`, `webmail`, `ftp`, `autodiscover`, `webdisk` | **WAJIB abu-abu** | Port non-HTTP (2083, 21, 2077) tidak dilewatkan proxy. Kalau dioranyekan, kamu **kehilangan akses cPanel sendiri** |
| `api.fiezel.my.id` | **Otomatis oranye** (dibuat sebagai Worker custom domain, Bagian 2) | Trafik memang harus masuk ke Worker |

**Risiko khusus PWA / service worker kalau `@` dijadikan oranye (proxied):**

- **Service worker bisa terjebak versi lama.** Cache tepi Cloudflare menyajikan `sw.js`,
  `core-config.js`, dan `index.html` dari edge. Auto-deploy 5 menit akan **berhasil di server**
  tapi murid tetap mendapat berkas lama sampai cache tepi kedaluwarsa. Gejalanya persis seperti
  "deploy tidak jalan", padahal jalan. Karena `core-config.js` juga cache-first di service worker,
  kamu mendapat **dua lapis cache bertumpuk** dan rollback jadi tebak-tebakan.
- **Invarian build tiga titik bisa tampak tidak konsisten sesaat.** `SW_REV`, `DIAG_BUILD`, dan
  `FIEZEL_PAGE_BUILD` harus naik bersama; kalau satu berkas datang dari cache tepi dan satu dari
  origin, aplikasi melihat kombinasi yang tidak pernah dirilis siapa pun.
- **`manifest.json` dan aset neural besar** (`vendor/supertonic-3`, 152 MB) lewat proxy = perilaku
  cache yang harus diatur eksplisit, bukan warisan default.

**Kalau nanti kamu memang mau menyalakan proxy (oranye) untuk `@`** — lakukan sebagai perubahan
**terpisah, di hari lain**, dan bersamaan dengan itu:

1. Buat **Cache Rule**: `Bypass cache` untuk path `/sw.js`, `/core-config.js`, `/version.js`,
   `/index.html`, `/manifest.json`, dan `/audio/manifest.json`.
2. Tambahkan Cache Rule kedua: cache agresif hanya untuk `/vendor/*` dan `/assets/*` (berkas
   berhash-isi, aman).
3. Setelah setiap auto-deploy penting: **Caching → Purge Everything** satu kali, lalu verifikasi
   `SW_REV` dari origin dan dari edge sama.

Sampai ketiga hal itu terpasang, **biarkan abu-abu.** Kamu tidak butuh proxy untuk mendapatkan
`api.fiezel.my.id` — itulah intinya.

### (f) Verifikasi pasca-pindah: perintah curl + apa yang harus terlihat

Jalankan semuanya. Kalau salah satu tidak sesuai, jangan lanjut ke Bagian 2.

```bash
# 1. Nameserver sudah Cloudflare?
dig +short NS fiezel.my.id
# HARUS: dua hostname *.ns.cloudflare.com. Kalau masih srv1/srv2.arenhost.com => belum propagasi.
```

```bash
# 2. Record A masih menunjuk hosting?
dig +short A fiezel.my.id
# HARUS: 195.88.211.212  (kalau DNS only / abu-abu)
# Kalau abu-abu tapi hasilnya IP lain => record A salah, PERBAIKI SEGERA.
# Kalau kamu sengaja memilih oranye => wajar muncul IP Cloudflare (104.x / 172.6x).
```

```bash
# 3. Situs hidup dan dilayani origin yang benar?
curl -sI https://fiezel.my.id/ | head -20
# HARUS: HTTP/2 200
#        server: LiteSpeed        <-- bukti origin ArenHost yang benar
#        content-type: text/html
# Kalau muncul "server: cloudflare" pada mode abu-abu => ada yang salah konfigurasi.
# Kalau HTTP 5xx / 526 / 525 => masalah SSL mode, kembali ke langkah (d).
```

```bash
# 4. Tidak ada loop redirect (deteksi bahaya Flexible)
curl -s -o /dev/null -w "%{http_code} %{num_redirects} -> %{url_effective}\n" -L https://fiezel.my.id/
# HARUS: 200 0 -> https://fiezel.my.id/
# Kalau num_redirects >= 5 atau exit code 47 ("Maximum redirects followed")
# => SSL mode masih Flexible. Ubah ke Full. Ini penyebab situs mati total.
```

```bash
# 5. HTTP diarahkan ke HTTPS, sekali saja
curl -sI http://fiezel.my.id/ | head -5
# HARUS: 301 (atau 308) dengan location: https://fiezel.my.id/
```

```bash
# 6. Aset kunci PWA masih terjangkau + versi build konsisten
for p in /manifest.json /sw.js /core-config.js /app/; do
  printf "%-18s " "$p"; curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "https://fiezel.my.id$p"
done
# HARUS: semuanya 200. sw.js => application/javascript, manifest.json => application/json

curl -s https://fiezel.my.id/sw.js | grep -m1 "SW_REV"
curl -s https://fiezel.my.id/core-config.js | grep -m1 "FIEZEL_PAGE_BUILD"
# HARUS: prefiks versinya sama (mis. m025-167-...) dengan FIEZEL_PAGE_BUILD.
# Kalau berbeda => kamu sedang melihat campuran cache. Jangan lanjut.
```

```bash
# 7. Email tidak rusak — JANGAN LEWATI INI
dig +short MX fiezel.my.id
dig +short TXT fiezel.my.id | grep -i spf
# HARUS: identik dengan isi ~/fiezel-dns-sebelum.txt.
# Lalu uji nyata: kirim satu email dari akun luar (Gmail) ke alamat @fiezel.my.id
# dan pastikan MASUK. DNS yang "kelihatan benar" bukan bukti email jalan.
```

```bash
# 8. Worker audio yang sudah ada tidak terganggu (jalur ini TIDAK boleh berubah)
curl -s https://fiezel-audio.fitrajft.workers.dev/health
# HARUS: respons health yang sehat. Worker ini di *.workers.dev, tidak bergantung zona —
# kalau ia ikut rusak, berarti kamu menyentuh sesuatu yang tidak seharusnya.
```

### (g) Rencana rollback

**Kapan rollback:** situs 5xx/loop redirect lebih dari 10 menit dan kamu tidak yakin penyebabnya,
atau email berhenti masuk, atau record penting ternyata hilang setelah aktivasi.

**Coba yang murah dulu (1-2 menit, tanpa menyentuh nameserver):**

1. Semua record HTTP → **abu-abu (DNS only)**. Ini menghilangkan seluruh lapisan proxy/cache
   dalam hitungan detik.
2. SSL/TLS → **Full** (kalau sedang Flexible atau Full strict).
3. Tambahkan record yang hilang secara manual dari `~/fiezel-dns-sebelum.txt`.
   90% masalah selesai di sini, dan kamu **tidak** kehilangan pekerjaan pindah zona.

**Rollback penuh (kembalikan nameserver):**

1. Di registrar / Domain Manager, ubah nameserver kembali ke
   **`srv1.arenhost.com`** dan **`srv2.arenhost.com`**. Hapus nameserver Cloudflare.
2. **Waktu propagasi:** kembali ke ArenHost mengikuti TTL record NS di registry — biasanya
   **beberapa menit s.d. beberapa jam**, dan sebagian resolver publik bisa memakan **hingga 24
   jam**. TTL 2 menit yang kamu set di langkah (b) mempercepat record biasa, **tapi tidak
   mempercepat NS** — TTL NS dipegang registry, bukan kamu. Ini alasan struktural kenapa
   verifikasi (b) jauh lebih murah daripada rollback.
3. Selama propagasi, **kedua jalur harus tetap benar**: jangan hapus zona di Cloudflare dan jangan
   ubah record A di sana sampai `dig +short NS fiezel.my.id` bersih menunjuk ArenHost. Kalau kamu
   hapus zona lebih awal, resolver yang masih menuju Cloudflare mendapat NXDOMAIN — itu **lebih
   buruk** dari kondisi rusak yang sedang kamu perbaiki.
4. Pantau: `watch -n 30 'dig +short NS fiezel.my.id; curl -sI https://fiezel.my.id/ | head -1'`
5. Baru setelah bersih: hapus zona di Cloudflare (kalau memang menyerah), dan kembalikan TTL ke
   nilai normal (3600) di ArenHost.

**Catat setiap rollback** ke `reports/exec-e8-docs.md` beserta gejala + jam, supaya percobaan
kedua tidak mengulang sebab yang sama.

---

## Bagian 2 — SUBDOMAIN `api.fiezel.my.id` → Worker

**Prasyarat keras:** zona `fiezel.my.id` sudah **Active** di Cloudflare (Bagian 1 selesai, semua
curl di (f) hijau).

### Urutan wajib: deploy Worker DULU, route BELAKANGAN

Kenapa urutannya tidak boleh dibalik:

- Route/custom domain yang menunjuk script Worker yang **belum ada** menghasilkan error
  Cloudflare di hostname itu. Kalau nanti kamu tempelkan ke `fiezel.my.id` (bukan subdomain), itu
  berarti **situs murid** yang error.
- `wrangler deploy` dengan `routes = [{ pattern = "api.fiezel.my.id", custom_domain = true }]` di
  `wrangler.toml` akan **membuat sekaligus** custom domain-nya. Jadi urutan praktisnya: deploy
  pertama **tanpa** blok `routes` (Worker hidup di `workers_dev`/uji internal), verifikasi
  `/health`, **baru** aktifkan route.
- Custom domain menerbitkan sertifikat TLS untuk `api.fiezel.my.id`. Proses itu butuh beberapa
  menit; kalau kamu langsung memutar flag klien ke `on`, murid mendapat kegagalan TLS, bukan
  kegagalan yang bisa ditangani aplikasi.

### Langkah

```bash
cd FIEZEL-APPS/workers/api

# 1. Deploy pertama TANPA custom domain (workers_dev sementara, atau tanpa blok routes)
npx wrangler@3 deploy
# Catat URL *.workers.dev yang dicetak.

# 2. Verifikasi Worker hidup dan protokolnya benar SEBELUM menyentuh DNS
curl -s https://fiezel-api.<subdomain>.workers.dev/health
# HARUS: {"status":...,"protocol":"1.7"}  <-- frontend menolak protocol selain "1.7"
```

Setelah `/health` benar, aktifkan custom domain. **Dua cara, pilih satu:**

**Cara A — lewat `wrangler.toml` (disarankan, karena tercatat di repo):**

```toml
# workers/api/wrangler.toml
workers_dev = false
routes = [
  { pattern = "api.fiezel.my.id", custom_domain = true }
]
```

```bash
npx wrangler@3 deploy
# Wrangler membuat custom domain + record DNS proxied untuk api.fiezel.my.id secara otomatis.
```

**Cara B — lewat dashboard:** Workers & Pages → `fiezel-api` → Settings → Domains & Routes →
**Add** → Custom Domain → `api.fiezel.my.id`.

Lalu verifikasi:

```bash
dig +short A api.fiezel.my.id        # HARUS: IP Cloudflare (proxied), bukan 195.88.211.212
curl -s https://api.fiezel.my.id/health
# HARUS: {"status":...,"protocol":"1.7"}
# Kalau error TLS: tunggu 2-5 menit, sertifikat sedang diterbitkan. JANGAN putar flag dulu.

# CORS untuk API berkredensial: allowlist eksplisit, BUKAN "*"
curl -si -X OPTIONS https://api.fiezel.my.id/api/config \
  -H "Origin: https://fiezel.my.id" \
  -H "Access-Control-Request-Method: GET" | grep -i "access-control"
# HARUS ada: access-control-allow-origin: https://fiezel.my.id
#            access-control-allow-credentials: true
#            vary: Origin
# TIDAK BOLEH: access-control-allow-origin: *   (ilegal bersama credentials)
```

**Untuk dashboard owner**, ulangi pola yang sama dengan Worker `fiezel-owner` dan hostname
`owner.fiezel.my.id` (`reports/CF-MIGRATION-REPORT.md` §11). Cookie `Domain=fiezel.my.id` tetap
terkirim ke subdomain itu.

**JANGAN:** menambahkan route apa pun ke Worker `fiezel-audio`. Worker itu **wajib tetap
read-only** — sifatnya adalah kontrol biaya yang dijaga tiga gerbang CI, dan kata `generate` saja
di berkasnya sudah membuat `audio-asset-pipeline-test.js` merah
(`reports/cf-a2-cf-existing.md` "Peringatan arsitektur").

---

## Bagian 3 — DAFTAR SECRET YANG HARUS DIPASANG OWNER

**Nilai tidak ada di dokumen ini dan tidak boleh pernah masuk ke repo mana pun.** Yang tercatat
hanya **nama** dan **tempat pasangnya**. `wrangler.toml` hanya memuat binding — tidak ada rahasia
di sana (`reports/cf-b1-arch-worker.md` §3).

### 3.1 Cloudflare Secrets (Worker `fiezel-api`)

| Nama secret | Untuk apa | Catatan |
|---|---|---|
| `SESSION_HMAC_KEY_CURRENT` | Menandatangani cookie identitas `fz_id` (HMAC-SHA256) | Acak ≥32 byte. Bocornya = siapa pun bisa memalsukan identitas murid |
| `SESSION_HMAC_KEY_PREVIOUS` | Kunci lama saat rotasi, supaya rotasi **tidak melogout semua murid** | Pasang bersamaan sejak awal (boleh nilai acak berbeda). Rotasi = geser CURRENT → PREVIOUS, lalu isi CURRENT baru |
| `ANALYTICS_PEPPER` | Pepper HMAC untuk `visitor_token` / `install_hash` / `ip_hmac` | **Dirotasi tiap 24 jam** dan pepper lama **dihapus** — inilah yang membuat analytics tidak bisa menghubungkan orang antar hari (KONTRAK ANALYTICS, `EXEC-BRIEF-CF.md`) |
| `OWNER_SUBJECT` | Satu-satunya penentu "siapa owner" di server | **Satu mekanisme, bukan tiga** (`reports/cf-c1-konsistensi.md` K23). Jangan pakai flag klien, jangan daftar hardcoded |
| `TURNSTILE_SECRET` | Verifikasi Turnstile untuk endpoint terbuka (`/api/feedback`) | `/api/feedback` memang terbuka tanpa login atas keputusan owner ⇒ wajib rate limit + Turnstile |
| `CRON_TOKEN` | Pengganti `FIEZEL_REMINDER_CRON_TOKEN` untuk cron rollup/reminder | Bandingkan **constant-time** di Worker; implementasi Puter lama tidak constant-time |
| `VAPID_PUBLIC_KEY` | Push notification (kunci **publik**, disimpan seragam saja) | **Private key JANGAN masuk Worker.** Hanya dispatcher yang memegangnya |

```bash
cd FIEZEL-APPS/workers/api

# Wrangler akan meminta nilainya secara interaktif — nilai TIDAK muncul di shell history.
npx wrangler@3 secret put SESSION_HMAC_KEY_CURRENT
npx wrangler@3 secret put SESSION_HMAC_KEY_PREVIOUS
npx wrangler@3 secret put ANALYTICS_PEPPER
npx wrangler@3 secret put OWNER_SUBJECT
npx wrangler@3 secret put TURNSTILE_SECRET
npx wrangler@3 secret put CRON_TOKEN
npx wrangler@3 secret put VAPID_PUBLIC_KEY

# Verifikasi: hanya menampilkan NAMA, bukan nilai
npx wrangler@3 secret list
```

**Membuat nilai acak yang layak** (jalankan lokal, tempelkan saat wrangler bertanya, jangan
simpan di berkas):

```bash
openssl rand -base64 48
```

### 3.2 Cloudflare Secrets (Worker `fiezel-owner`)

| Nama secret | Untuk apa |
|---|---|
| `OWNER_SUBJECT` | Sama seperti di atas — **nilai identik** di kedua Worker |
| `OWNER_API_TOKEN` | Token **mesin** untuk memanggil endpoint owner dari skrip/cron. Hal yang **berbeda** dari `OWNER_SUBJECT`; jangan dicampur (`reports/cf-c1-konsistensi.md` K23) |

```bash
cd FIEZEL-APPS/workers/owner
npx wrangler@3 secret put OWNER_SUBJECT
npx wrangler@3 secret put OWNER_API_TOKEN
```

Lapis kedua yang disarankan: **Cloudflare Access** di depan `owner.fiezel.my.id`. Dashboard owner
adalah permukaan kebocoran terbesar — satu route yang lupa memeriksa kepemilikan = data murid
terbuka (`reports/cf-b6-migration-plan.md` PHASE G).

### 3.3 GitHub Actions Secrets (repo `fitrajft-ux/FIEZEL-APPS`)

Settings → Secrets and variables → Actions.

| Nama | Sudah ada? | Untuk apa |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | **Sudah ada** | Deploy Worker + tulis R2. **Belum terverifikasi** apakah scope-nya cukup untuk membuat D1/KV/DO + mengaktifkan Workers AI (`reports/cf-a2-cf-existing.md` §(c)) |
| `CLOUDFLARE_API_TOKEN_API` | **Baru** | Token **terpisah** khusus deploy `fiezel-api`/`fiezel-owner`. Rekomendasi eksplisit: jangan pakai ulang token yang boleh menulis bucket audio (`reports/cf-a2-cf-existing.md` rekomendasi #4) |
| `CLOUDFLARE_ACCOUNT_ID` | **Sudah ada** | ID akun |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID` | Sudah ada | Produksi audio (tetap di Actions, **bukan** di Worker) |
| `PUTER_AUTH_TOKEN` | Sudah ada | Jalur Puter lama. **Jangan hapus sampai PHASE M selesai** — ini jalur rollback-mu |
| `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` | Sudah ada | Push. Private key **tetap hanya di Actions**, tidak pindah ke Worker |
| `FIEZEL_REMINDER_CRON_TOKEN` | Sudah ada | Digantikan `CRON_TOKEN` di CF; simpan sampai cron lama dicabut |

**Aturan pemisahan yang tidak boleh dilanggar:** rahasia runtime Worker → **Cloudflare Secrets**.
Rahasia untuk mendeploy/menulis dari CI → **GitHub Actions Secrets**. Jangan ada yang di dua
tempat kecuali memang dibutuhkan di dua tempat (`VAPID_PUBLIC_KEY` satu-satunya pengecualian, dan
itu memang publik).

**Workers AI tidak butuh token sama sekali** — dipanggil lewat binding `env.AI`, jadi nol
kredensial provider yang perlu disimpan (`reports/CF-MIGRATION-REPORT.md` §12).

Satu langkah higienis yang harus ditambahkan sendiri: workflow deploy Worker CF hari ini **tidak
punya gate aktor**, padahal workflow Puter punya. Tambahkan `if: github.actor == 'fitrajft-ux'` ke
workflow deploy `fiezel-api` (`reports/cf-a2-cf-existing.md` rekomendasi #2).

---

## Bagian 4 — CARA DEPLOY

Semua langkah di bagian ini **nol dampak murid** sampai 4.6 (memutar flag). Itu memang desainnya.

### 4.1 Buat D1 + jalankan migrasi

```bash
cd FIEZEL-APPS/workers/api

# Dua database: identitas panas dipisah dari analytics supaya analytics tidak
# menyerialisasi jalur login di jam sibuk (reports/cf-b1-arch-worker.md §3).
npx wrangler@3 d1 create fiezel-core
npx wrangler@3 d1 create fiezel-stats
```

Salin `database_id` yang dicetak ke `workers/api/wrangler.toml`, mengganti placeholder
`<isi setelah wrangler d1 create ...>` pada binding `CORE_DB` dan `STATS_DB`.

```bash
# Migrasi: LOKAL dulu, produksi belakangan. Selalu.
npx wrangler@3 d1 migrations list  --database fiezel-core --local
npx wrangler@3 d1 migrations apply --database fiezel-core --local

# Baru remote
npx wrangler@3 d1 migrations apply --database fiezel-core  --remote
npx wrangler@3 d1 migrations apply --database fiezel-stats --remote

# Verifikasi tabel benar-benar ada
npx wrangler@3 d1 execute fiezel-core --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

**Aturan D1 yang mengikat:** progres belajar murid **tetap di `localStorage`** sebagai sumber
kebenaran. D1 hanya untuk identitas/sesi/entitlement/agregat. Memindahkan progres ke D1 dilarang
desain (`reports/cf-b6-migration-plan.md` P3). Tabel analytics **hanya agregat**
(`metrics_daily`, `usage_daily`, `retention_daily`) dan **dilarang di-join** dengan tabel kuota —
kuota pakai `user_id`, analytics pakai token harian, tanpa kolom penghubung
(KONTRAK ANALYTICS, `EXEC-BRIEF-CF.md`).

### 4.2 Buat KV namespace

```bash
npx wrangler@3 kv namespace create CFG
# Salin id yang dicetak ke [[kv_namespaces]] binding = "CFG" di wrangler.toml
```

KV **hanya** untuk feature flag/config, cermin circuit breaker (`cb:global`, TTL 30-60 detik),
dan cache entitlement. **Bukan** untuk counter kuota: KV eventual-consistent ("up to 60 seconds or
more"), hanya 1 tulis/detik/kunci, dan di plan Free cuma **1.000 tulis/hari** untuk kunci berbeda
([Cloudflare KV limits](https://developers.cloudflare.com/kv/platform/limits/)) — mati di ±10
pengguna kalau dipakai per-request (`reports/CF-MIGRATION-REPORT.md` ringkasan butir 3).

### 4.3 Deploy `workers/api`

```bash
cd FIEZEL-APPS/workers/api
npx wrangler@3 deploy 2>&1 | tee deploy.log
# Pakai `set -o pipefail` kalau memasukkannya ke skrip: tanpa itu kegagalan deploy
# bisa lolos dan kamu mencatat alamat Worker yang tidak pernah ada
# (pelajaran dari audio-deploy-worker.yml).

curl -s https://api.fiezel.my.id/health
# HARUS: {"status":...,"protocol":"1.7"}
```

### 4.4 Deploy `workers/owner`

```bash
cd FIEZEL-APPS/workers/owner
npx wrangler@3 deploy

# Uji gerbang kepemilikan: pemanggil tanpa identitas owner HARUS ditolak
curl -s -o /dev/null -w "%{http_code}\n" https://owner.fiezel.my.id/api/owner/summary
# HARUS: 403 (API) atau 404 (HTML) — TIDAK BOLEH 200.
# Kalau 200 tanpa kredensial: HENTIKAN, hapus route, perbaiki dulu.
```

### 4.5 Isi nilai flag awal di KV (semua `off`)

```bash
cd FIEZEL-APPS/workers/api

# Tulis konfigurasi awal — SEMUA off. Ini yang dibaca GET /api/config.
npx wrangler@3 kv key put --binding=CFG "cfg:flags" \
  '{"transport":"off","tts":"off","identity":"off","quotaUi":"off","analytics":"off"}' \
  --remote

npx wrangler@3 kv key get --binding=CFG "cfg:flags" --remote
curl -s https://api.fiezel.my.id/api/config
# HARUS: semua nilai "off". Ini kondisi aman default.
```

### 4.6 Memutar flag klien: `off` → `shadow` → `on`

Arti tiap status (`reports/cf-b6-migration-plan.md` P1):

| Status | Yang terjadi | Risiko ke murid |
|---|---|---|
| `off` | Kode baru ada di bundel tapi **tidak pernah dieksekusi**. Jalur lama (Puter) melayani semuanya | **Nol.** Aman di-push kapan saja |
| `shadow` | Jalur baru dipanggil, hasilnya **dibuang** dan hanya dicatat/dibandingkan. Yang dilihat murid tetap dari jalur lama | Rendah — tapi **biaya AI/TTS nyata terpakai**. Jangan `shadow` lebih lama dari yang kamu butuh |
| `on` | Jalur baru menyajikan hasil ke murid | Nyata. Ini rilis |

**Dua lapis flag, dan hanya satu yang bisa dipakai untuk rollback cepat:**

- **Statis** di `core-config.js` (`FIEZEL_CF_CONFIG`) — memilih jalur mana yang **ada**.
  Terkunci cache-first di service worker ⇒ **bukan** kill switch. Wajib `off` saat push.
- **Dinamis** dari `GET /api/config` (KV `cfg:flags`) — **override** yang menang, dibaca sekali
  per boot dengan timeout pendek dan default = nilai statis kalau gagal. **Ini kill switch-mu.**

Cara memutar (contoh: transport `off` → `shadow`):

```bash
cd FIEZEL-APPS/workers/api

npx wrangler@3 kv key put --binding=CFG "cfg:flags" \
  '{"transport":"shadow","tts":"off","identity":"off","quotaUi":"off","analytics":"off"}' \
  --remote

# Verifikasi dari luar, seperti murid melihatnya
curl -s https://api.fiezel.my.id/api/config
# Efek terasa dalam <=60 detik (cacheTtl KV). Tidak butuh rilis, tidak butuh push.
```

**Urutan menaikkan `transport` ke `on` — satu endpoint per rilis, paling toleran dulu**
(`reports/cf-b6-migration-plan.md` PHASE H):

`/api/feedback` → `/api/activity` → `/api/policy/*` → `/api/ai/translate` →
`/api/coach/context` → `/api/ai/chat`

Tiga endpoint pertama punya fallback senyap/queue di klien, jadi kegagalannya tidak terlihat
murid. `/api/ai/chat` terakhir karena itu yang paling kelihatan.

Syarat naik dari `shadow` ke `on`: **`shadow` jalan ≥3 hari** dengan tingkat ketidaksesuaian yang
**terukur** — bukan "kelihatannya oke".

**Urutan aman untuk `identity` (paling berisiko dari semuanya):** aktifkan **paling akhir**,
setelah `transport` dan `tts` stabil. Salah pemetaan identitas = **progres murid tampak hilang
massal**, dan tidak bisa dipulihkan dari server karena progres memang tidak pernah ada di server
(`reports/cf-b6-migration-plan.md` PHASE D, risiko #1).

### 4.7 KILL SWITCH — cara mematikan cepat

**Urutan tercepat ke terlambat. Selalu mulai dari nomor 1.**

```bash
# 1. MATIKAN SEMUA JALUR CF — efek <=60 detik, tanpa push, tanpa rilis
cd FIEZEL-APPS/workers/api
npx wrangler@3 kv key put --binding=CFG "cfg:flags" \
  '{"transport":"off","tts":"off","identity":"off","quotaUi":"off","analytics":"off"}' \
  --remote

curl -s https://api.fiezel.my.id/api/config     # konfirmasi semua "off"
```

Setelah ini, klien kembali ke jalur Puter yang **masih hidup penuh** (Worker Puter belum dicabut —
itulah sebabnya PHASE M harus terakhir). Murid tidak melihat apa pun selain fitur AI/TTS kembali
seperti sebelumnya.

```bash
# 2. Kalau Worker itu sendiri yang bermasalah (bukan flag): buka route-nya
#    Dashboard: Workers & Pages -> fiezel-api -> Settings -> Domains & Routes -> hapus
#    api.fiezel.my.id. Klien akan gagal fetch dan jatuh ke fallback.
```

```bash
# 3. Kalau ada perubahan kode Worker yang merusak: rollback ke versi sebelumnya
npx wrangler@3 deployments list
npx wrangler@3 rollback            # atau: npx wrangler@3 rollback <deployment-id>
```

```bash
# 4. Nuklir (hanya kalau 1-3 gagal): hapus Worker
#    npx wrangler@3 delete
#    Nol dampak murid SELAMA flag sudah off dan Puter masih hidup.
```

```bash
# 5. Kalau masalahnya di kode KLIEN yang sudah ter-push (bukan di server):
#    git revert <commit> lalu push. Auto-deploy menyebarkannya dalam <=5 menit.
#    Ini jalur PALING LAMBAT (menit + siklus service worker). Pakai nomor 1 dulu.
```

**Yang JANGAN dilakukan sebagai "kill switch":** mengubah nilai flag di `core-config.js` lalu
push. Berkas itu cache-first di service worker ⇒ PWA yang sudah terinstal **tidak** menerimanya
sampai `SW_REV` naik dan generasi shell baru terpasang. Kamu akan mengira sudah mematikan sesuatu
yang masih hidup.

---

## Bagian 5 — BATAS PLAN GRATIS: TABEL KEPUTUSAN

Owner memilih **Free dulu**. Ini konsekuensinya, jujur: laporan akhir menyebut Workers Paid
US$5/bulan sebagai **prasyarat teknis, bukan optimasi** (`reports/CF-MIGRATION-REPORT.md`
ringkasan butir 3 dan Keputusan #2). Runbook ini tidak menolak keputusan owner — ia memberi
**ambang angka** supaya keputusan upgrade diambil dari data, bukan dari perasaan.

Semua kuota Cloudflare reset **00:00 UTC = 07:00 WIB**. Artinya gejala akan cenderung muncul
**sore/malam WIB** dan hilang sendiri jam 7 pagi. Kalau kamu melihat pola itu, kamu sedang
menabrak batas harian — bukan bug.

### Tabel keputusan

| # | Batas (Free) | Gejala yang **murid** lihat | Cara cek di dashboard | Ambang → UPGRADE Workers Paid US$5/bln |
|---|---|---|---|---|
| 1 | **CPU 10 ms / request** ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/)) | AI/TTS gagal **acak** padahal internet baik: spinner lalu pesan galat, sering saat request pertama setelah idle. Login/`whoami` kadang gagal, kadang tidak. **Tidak konsisten** — inilah tanda khasnya | Workers & Pages → `fiezel-api` → **Metrics**: grafik **CPU Time** (lihat **p99**, bukan rata-rata) + jumlah **Errors**/status 1102 di **Logs** | **p99 CPU > 8 ms** atau ada **satu pun** error 1102 (exceeded CPU) di jam sibuk. Verifikasi HMAC + parse JSON secara dokumentasi memakai **10-20 ms** ⇒ jalur identitas praktis **tidak muat** di 10 ms. **Ini ambang yang paling mungkin tercapai lebih dulu.** Paid = 30 detik CPU |
| 2 | **KV 1.000 tulis/hari** (kunci berbeda) ([KV limits](https://developers.cloudflare.com/kv/platform/limits/)) | Flag/kill switch **tidak mau berubah** saat kamu putar (`kv key put` gagal). Kalau breaker ikut memakai KV: circuit breaker macet di posisi lama ⇒ AI tetap mati padahal sudah sehat, atau tetap hidup padahal harus berhenti | Workers KV → namespace `CFG` → **Metrics** (writes/hari). Atau uji langsung: `wrangler kv key put ... --remote` → kalau error kuota, kamu sudah lewat | **> 700 tulis/hari** (70%). Kalau desainnya benar, KV hanya ditulis **beberapa kali sehari** (flag + breaker), jadi mendekati 1.000 = **ada bug**: sesuatu menulis KV per-request. **Periksa bug itu dulu sebelum upgrade** — upgrade menyembunyikan bug ini, tidak memperbaikinya. Paid = tulis tak terbatas |
| 3 | **Workers AI 10.000 neuron/hari** ([Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)) | Sore/malam WIB: tombol AI menjawab "sedang sibuk"/gagal untuk **semua murid sekaligus**, lalu normal lagi jam 7 pagi. Suara neural berhenti dan jatuh ke suara robot bawaan | AI → **Workers AI** → grafik **Neurons used (today)** | **> 8.000 neuron/hari** (`GLOBAL_NEURON_CAP = 8000` memang disetel di bawah plafon). **Peringatan penting: 10.000 neuron/hari adalah kolam SELURUH AKUN, bukan per murid** — satu penyalahguna mengeringkannya untuk semua orang. Pada aura-1, 10.000 neuron ≈ **7.333 karakter TTS/hari untuk seluruh akun** ⇒ jelas tidak cukup untuk kelas. **Perbaikan yang benar bukan upgrade, tapi PRA-RENDER**: korpus 591.898 karakter = **US$9,07 sekali bayar** vs **US$529/bulan** runtime @1.000 pengguna. Upgrade Paid hanya menaikkan plafon (US$0,011/1.000 neuron di atas 10.000) — pra-render menghapus masalahnya |
| 4 | **50 subrequest / invocation** ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/)) | Operasi berat gagal di tengah: batch pra-render berhenti, sesi listening panjang (mis. audiobook 1.484 kalimat) berhenti separuh jalan. Gejalanya **selalu di operasi besar**, tidak pernah di klik tunggal | Logs → cari exception "Too many subrequests" pada Worker/Cron | Ada **satu pun** "too many subrequests" pada jalur yang dipakai murid. Mitigasi tanpa uang dulu: batasi batch (±200 klip/invocation dengan cursor), dan pastikan **cache-hit TTS tidak melewati Worker** (balas URL public bucket ⇒ nol subrequest). Paid = 10.000 subrequest |
| 5 | **100.000 request/hari** (bonus, jangan diabaikan) ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/)) | **Halaman error Cloudflare 1027** — bukan pesan FIEZEL. Ini melanggar aturan produk "jangan pernah blank screen ke murid" | Workers & Pages → Metrics → **Requests (24h)** | **> 70.000 request/hari.** Kalau belum mau upgrade, set route ke **"fail open"** (request melewati Worker seolah tidak ada Worker) agar murid tidak melihat halaman 1027 |

### Cara mengambil keputusan upgrade (aturan sederhana)

1. **Ambang mana pun tersentuh 2 hari dalam 7 hari** → upgrade Workers Paid US$5/bulan. Jangan
   menunggu 3 kejadian; murid sudah merasakannya sejak yang pertama.
2. **Nomor 2 (KV) tersentuh** → **jangan langsung upgrade.** Cari dulu apa yang menulis KV
   per-request. 999 dari 1.000 kasus ini adalah bug desain, dan uang tidak memperbaikinya.
3. **Nomor 3 (neuron) tersentuh** → **pra-render dulu**, upgrade kemudian. Di sinilah 99% biaya
   berada; menaikkan plafon tanpa pra-render berarti membayar US$529/bulan alih-alih US$9 sekali.
4. **Nomor 1 (CPU) tersentuh** → tidak ada mitigasi arsitektur yang jujur. HMAC + parse memang
   butuh lebih dari 10 ms. **Upgrade, atau turunkan desain identitas ke token opaque di
   `localStorage`** dan akui butir "tahan hapus localStorage" tidak terpenuhi
   (`reports/cf-b2-identity.md` B2-R1). Pilih satu secara sadar; jangan mengambang.
5. **Laporkan angkanya**, bukan kesimpulannya. Format: batas mana, angka hariannya, tanggalnya,
   gejala yang terlihat murid. Itu yang diminta keputusan owner #2.

### Yang harus dipantau tiap hari selama 14 hari pertama

```bash
# Cek kesehatan cepat (bukan pengganti dashboard, tapi cukup untuk pagi hari)
curl -s https://api.fiezel.my.id/health
curl -s https://api.fiezel.my.id/api/config
```

Lalu di dashboard, tiga grafik saja: **CPU Time p99**, **Requests 24h**, **Neurons used today**.
Tiga angka itu yang menentukan keputusan US$5.

---

## Bagian 6 — CHECKLIST PRA-RILIS & PASCA-RILIS

### 6.1 PRA-RILIS (sebelum `git push` ke `main`)

Ingat: push = produksi dalam ≤5 menit. Tidak ada langkah "batalkan sebelum sampai".

**A. Flag & keamanan rilis**

- [ ] Semua flag di `core-config.js` (`FIEZEL_CF_CONFIG`) bernilai **`'off'`**. Cek:
      `grep -n "FIEZEL_CF" core-config.js`
- [ ] KV `cfg:flags` di produksi juga **semua `off`**:
      `curl -s https://api.fiezel.my.id/api/config`
- [ ] Field `workerUrl` di `core-config.js` **tidak diubah** — `remote-push-test.js:6` mengunci
      ke regex `*.puter.work`. Sakelar CF adalah **field baru**, bukan timpaan.
- [ ] Tidak ada nilai secret di diff: `git diff --cached | grep -Ei "api[_-]?key|token|secret|BEGIN .*PRIVATE"`
- [ ] Invarian build tiga titik (`SW_REV`, `DIAG_BUILD`, `FIEZEL_PAGE_BUILD`) — **subagent commit
      tanpa bump; MASTER yang menaikkan saat merge.** Jangan naikkan sendiri.

**B. Gerbang test**

- [ ] `node validator.js`
- [ ] Gerbang yang relevan dengan perubahanmu + wajib: `node regression-test.js`,
      `node ui-structure-test.js`, `node install-health-test.js`
- [ ] `python3 release-audit.py`
- [ ] `git status` **bersih** dari `*-REPORT.json` yang berubah — restore artefak sebelum commit:
      `git checkout -- '*-REPORT.json'`
- [ ] Gerbang audio tidak tersentuh: `node audio-asset-pipeline-test.js` hijau (bukti Worker audio
      tetap read-only)

**C. Sisi Cloudflare (kalau rilis ini menyentuh jalur CF)**

- [ ] `curl -s https://api.fiezel.my.id/health` → `protocol":"1.7"`
- [ ] `npx wrangler@3 secret list` → semua nama secret Bagian 3 ada
- [ ] Migrasi D1 sudah `--remote` dan tabel terverifikasi
- [ ] Worker owner menolak non-owner (403/404, bukan 200)
- [ ] Kamu tahu persis perintah kill switch-nya (4.7 nomor 1) dan sudah menyiapkannya di terminal

**Batalkan rilis (jangan push) kalau:** ada satu gerbang merah, atau flag tidak `off`, atau
`/health` tidak menjawab `protocol":"1.7"`, atau kamu belum tahu cara mematikannya.

### 6.2 PASCA-RILIS (0-15 menit setelah push)

```bash
# T+5 menit: auto-deploy sudah harus mengambil commit-mu
git rev-parse --short HEAD                     # commit yang kamu push
curl -s https://fiezel.my.id/core-config.js | grep -m1 FIEZEL_PAGE_BUILD
curl -s https://fiezel.my.id/sw.js            | grep -m1 SW_REV
# HARUS: prefiks versi cocok satu sama lain dan sesuai rilis ini.
# Belum berubah setelah 6 menit? Cek ~/fiezel-deploy.log di server.
```

```bash
# Situs sehat dari sisi murid
curl -s -o /dev/null -w "%{http_code} redirects=%{num_redirects}\n" -L https://fiezel.my.id/
# HARUS: 200 redirects=0

for p in / /app/ /manifest.json /sw.js /core-config.js /audio/manifest.json; do
  printf "%-22s " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "https://fiezel.my.id$p"
done
# HARUS: semuanya 200
```

```bash
# Jalur CF masih pada posisi aman
curl -s https://api.fiezel.my.id/health
curl -s https://api.fiezel.my.id/api/config     # HARUS masih semua "off" kalau belum diputar
```

```bash
# Worker audio tidak ikut terganggu + tetap read-only
curl -s https://fiezel-audio.fitrajft.workers.dev/health
curl -s -o /dev/null -w "%{http_code}\n" -X PUT https://fiezel-audio.fitrajft.workers.dev/a/x.mp3
# HARUS: 405. Kalau BUKAN 405 => segera hentikan semuanya; kontrol biaya bocor.
```

**Uji manual di perangkat nyata (5 menit, tidak bisa digantikan curl):**

- [ ] Buka `https://fiezel.my.id` di HP **yang sudah pernah menginstal PWA**. Progres murid
      (level, streak, riwayat) **utuh**. Ini pemeriksaan tunggal terpenting.
- [ ] Satu pelajaran berjalan penuh: soal muncul, audio berbunyi, jawaban tercatat.
- [ ] Satu permintaan AI: menjawab atau menampilkan **pesan FIEZEL** yang jelas — bukan teks galat
      mentah, bukan spinner menggantung, bukan halaman error Cloudflare.
- [ ] Mode offline (matikan data): aplikasi tetap bisa dipakai belajar.

### 6.3 Kalau gagal — apa yang dibatalkan, dalam urutan ini

| Gejala | Tindakan pertama | Kalau masih gagal |
|---|---|---|
| Situs 5xx / loop redirect | SSL/TLS → **Full**; semua record HTTP → **abu-abu** | Rollback nameserver (Bagian 1g) |
| Situs 200 tapi tampilan/versi campur | Purge Everything (kalau proxied); verifikasi `SW_REV` vs `FIEZEL_PAGE_BUILD` | Set record `@` ke abu-abu (DNS only) |
| Progres murid tampak hilang | **Kill switch: `identity` → `off`** (4.7 nomor 1). Kunci progres lama tetap dibaca, jadi `off` memulihkan | `git revert` commit identitas + push |
| AI/TTS gagal atau mahal | `transport`/`tts` → `off`. Klien kembali ke Puter yang masih hidup | Periksa neuron & CPU di dashboard (Bagian 5) |
| Endpoint owner menjawab 200 tanpa kredensial | **Hapus route `owner.fiezel.my.id` sekarang** | `wrangler delete` Worker owner |
| Worker error setelah deploy | `wrangler rollback` | Hapus route → flag `off` |
| Email berhenti masuk | Bandingkan `MX`/`TXT` dengan `~/fiezel-dns-sebelum.txt`, perbaiki manual | Rollback nameserver |
| Auto-deploy tidak jalan | Cek `~/fiezel-deploy.log`; pastikan baris cron `auto-deploy-fiezel` tidak dikomentari | Deploy manual dengan `~/deploy-fiezel.sh` |

**Yang TIDAK boleh dilakukan saat panik:**

- Jangan hapus zona Cloudflare saat rollback nameserver masih propagasi (menghasilkan NXDOMAIN —
  lebih buruk dari rusak).
- Jangan hapus `PUTER_AUTH_TOKEN` atau menonaktifkan Worker Puter. Itu jalur rollback-mu sampai
  PHASE M benar-benar selesai.
- Jangan tambahkan apa pun ke `workers/fiezel-audio-worker.js` atau `workers/wrangler.toml` untuk
  "cepat menambal". Tiga gerbang CI akan merah dan kontrol biaya audio hilang.
- Jangan naikkan `SW_REV`/`DIAG_BUILD`/`FIEZEL_PAGE_BUILD` sendiri di luar jalur MASTER.

---

## Lampiran — kejujuran yang harus owner ketahui

Ini bukan pemanis; ini konsekuensi yang wajib tertulis (KONTRAK ANALYTICS, `EXEC-BRIEF-CF.md`):

- **Angka DAU/retention adalah estimasi PERANGKAT, bukan orang.** Satu orang dengan dua perangkat
  dihitung dua kali. Murid yang menghapus data browser muncul sebagai perangkat baru. Ini harga
  yang dibayar untuk desain "hitung orang tanpa mengenali orang" — dan harganya layak.
- **Identitas anonim punya batas matematis.** Hapus cookie, mode private, atau ganti perangkat =
  identitas baru. Itu konsekuensi dari anonimitas, bukan bug.
- **Free tier bisa saja tidak cukup.** Kalau ambang di Bagian 5 tersentuh, itu bukan kegagalan
  keputusan — itu data yang memang diminta untuk memutuskan US$5/bulan.

## Sumber

**Dokumen internal** (di `reports/`): `CF-MIGRATION-REPORT.md` (laporan akhir + 18 keputusan
owner), `cf-a2-cf-existing.md` (inventaris CF yang sudah ada: Worker `fiezel-audio` + bucket R2),
`cf-b1-arch-worker.md` §3 (`wrangler.toml` target + daftar binding + daftar `wrangler secret put`),
`cf-b2-identity.md` §1.4 (P0: zona DNS harus di Cloudflare), `cf-b3-quota.md` (konstanta kuota),
`cf-b5-analytics.md` (skema agregat), `cf-b6-migration-plan.md` (fase, flag tiga-status, kill
switch, urutan endpoint), `cf-c1-konsistensi.md` (putusan kontradiksi + angka kanonik).
Di akar repo: `EXEC-BRIEF-CF.md` (keputusan owner), `FIEZEL-DEPLOY-ARENHOST.md` (hosting).

**Dokumentasi Cloudflare** (batas & mode, diverifikasi 27 Agu 2026):

- Batas Workers (CPU 10 ms Free, 50 subrequest Free vs 10.000 Paid, 100.000 request/hari, Error
  1027, fail open/closed): https://developers.cloudflare.com/workers/platform/limits/
- Batas KV (1.000 tulis/hari Free, 1 tulis/detik/kunci, 100.000 baca/hari):
  https://developers.cloudflare.com/kv/platform/limits/
- Harga Workers AI (10.000 neuron/hari gratis, US$0,011/1.000 neuron di atasnya, reset 00:00 UTC):
  https://developers.cloudflare.com/workers-ai/platform/pricing/
- Mode enkripsi SSL/TLS (Flexible = cleartext ke origin; rekomendasi Full / Full strict):
  https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/
- Full (strict): https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
- Menambahkan domain (Add Site): https://developers.cloudflare.com/fundamentals/manage-domains/add-site/
- Mengganti nameserver (full setup): https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/
