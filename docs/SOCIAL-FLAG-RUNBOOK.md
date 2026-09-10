# Runbook — menyalakan (dan mematikan) lapisan Online & Teman

Dokumen ini untuk **OWNER**. Isinya perintah yang benar-benar dijalankan untuk menyalakan
lapisan sosial (SLOT 7: profil online, teman, papan) di produksi, cara memverifikasinya, dan
cara mematikannya lagi dalam satu perintah.

**Kode tidak bisa menyalakan fitur ini.** Tidak ada PR yang bisa. Sakelarnya hidup di
Cloudflare (var deploy + KV), bukan di repo — itu memang disengaja, supaya "fitur menyala"
selalu keputusan sadar seseorang, bukan efek samping sebuah merge.

---

## 1. Keadaan sekarang

Gerbangnya **TIGA sakelar AND** (`workers/api/social-config.js` → `SOCIAL_FEATURE_SPEC`,
dieksekusi `featureAllowedFrom()` di `workers/api/feature-gate.js`). Fail-**closed**: KV yang
tidak terbaca = tolak, flag absen/ambigu = mati.

| # | Sakelar | Tempat | Status |
|---|---|---|---|
| 1 | `FEATURE_SOCIAL = "on"` | `workers/api/wrangler.toml` `[vars]` baris 70 | ✅ **sudah on** |
| 2 | `enabled.social === true` | KV `CFG` → kunci `cfg:flags` | ❓ periksa (langkah 2) |
| 3 | `flags.cfSocialEnabled === true` | KV `CFG` → kunci `cfg:flags` | ❓ periksa (langkah 2) |

Jadi yang tersisa hanya **dua nilai di satu kunci KV**. Tidak perlu deploy ulang Worker:
sakelar 1 sudah terpasang, dan 2–3 dibaca dari KV per permintaan (`cacheTtl` 60 detik).

Peran keduanya berbeda dan sengaja dipisah:

- `enabled.social` — **kill switch server**. Mematikannya menutup rute `/api/social/*`.
- `flags.cfSocialEnabled` — flag yang **DILAPORKAN ke klien** lewat `GET /api/config`.
  Inilah yang dibaca `features/social/fiezel-social.js` → `probeFlag()`, dan yang menentukan
  apakah kartu "Online & Teman" muncul di Home.

Klien hanya menerima `=== true` sebagai hidup. Nilai lain — absen, `"true"` sebagai string,
`1` — dibaca **mati**.

---

## 2. Periksa dulu (aman, hanya membaca)

```bash
# Isi flag saat ini
wrangler kv key get --binding=CFG "cfg:flags" --remote

# Apa yang benar-benar dilihat klien
curl -s https://api.fiezel.my.id/api/config | jq '.flags.cfSocialEnabled'
```

`null` atau `false` pada perintah kedua = fitur mati di sisi murid, apa pun isi KV-nya.

---

## 3. Menyalakan

`cfg:flags` adalah **satu objek JSON**. Jangan menimpanya dengan objek yang hanya berisi dua
kunci sosial — itu akan mematikan AI, identitas, dan kuota sekaligus. Baca dulu, sunting, tulis
kembali:

```bash
# 1. Ambil isi sekarang ke berkas
wrangler kv key get --binding=CFG "cfg:flags" --remote > /tmp/flags.json

# 2. Sunting HANYA dua nilai ini (jq menjaga sisanya utuh)
jq '.enabled.social = true | .flags.cfSocialEnabled = true' /tmp/flags.json > /tmp/flags-new.json

# 3. Periksa selisihnya dengan mata sendiri sebelum menulis
diff <(jq -S . /tmp/flags.json) <(jq -S . /tmp/flags-new.json)

# 4. Tulis kembali
wrangler kv key put --binding=CFG "cfg:flags" --path=/tmp/flags-new.json --remote
```

Langkah 3 bukan formalitas: satu `jq` yang salah ketik di sini mematikan lane lain tanpa suara.

---

## 4. Verifikasi

```bash
# Server: harus true
wrangler kv key get --binding=CFG "cfg:flags" --remote | jq '{kill:.enabled.social, klien:.flags.cfSocialEnabled}'

# Klien: harus true (boleh telat sampai ±60 detik karena cacheTtl)
curl -s https://api.fiezel.my.id/api/config | jq '.flags.cfSocialEnabled'

# Rute sosial hidup: BUKAN 403 social_flag_off
curl -s -o /dev/null -w '%{http_code}\n' https://api.fiezel.my.id/api/social/profile/me
```

Di aplikasi: buka Home. Kartu **Online & Teman** muncul dalam satu putaran render sesudah
`/api/config` terbaca. Kalau flag mati, kartu itu **tidak digambar sama sekali** — itu
perilaku yang benar, bukan bug (lihat `socialHomeBody()` di `app.js`).

Jalur lengkap yang layak dicoba sekali: buat profil (handle pseudonim) → undang teman lewat
kode → tukar kode di perangkat kedua → papan Teman terisi.

---

## 5. Mematikan lagi

Satu nilai sudah cukup, dan pilihannya bermakna:

```bash
# Sembunyikan dari klien, rute tetap hidup (paling halus — outbox murid tidak menumpuk galat)
jq '.flags.cfSocialEnabled = false' /tmp/flags.json > /tmp/off.json

# ATAU tutup rutenya sekalian (kill switch penuh)
jq '.enabled.social = false | .flags.cfSocialEnabled = false' /tmp/flags.json > /tmp/off.json

wrangler kv key put --binding=CFG "cfg:flags" --path=/tmp/off.json --remote
```

Berlaku dalam ≤60 detik. **Tidak ada deploy, tidak ada rilis, tidak ada murid yang mengunduh
ulang apa pun.** Belajar tidak pernah bergantung pada lane ini: seluruh pemanggil di `app.js`
membaca `self.FiezelSocial?.…` di belakang `try/catch`, dan matinya flag menghasilkan kartu
jujur, bukan layar galat.

---

## 6. Yang TIDAK dijanjikan dokumen ini

- Ini **tidak** memverifikasi bahwa jalur teman ujung-ke-ujung sudah pernah dicoba dua
  perangkat sungguhan. Sepanjang pengetahuan repo, belum. Nyalakan dulu di jendela yang kamu
  awasi, bukan sebelum tidur.
- Ini tidak menyentuh `FEATURE_TTS`, `FEATURE_COACH`, atau lane bukti belajar per-murid
  (`FEATURE_LEARNER_EVIDENCE`), yang punya pagar persetujuan per-murid tersendiri.
- Angka PB, liga, dan cap harian ditegakkan server; menyalakan flag tidak mengubahnya.
