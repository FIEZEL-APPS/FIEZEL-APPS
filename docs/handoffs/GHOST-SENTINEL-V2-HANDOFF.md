# Ghost Sentinel v2 — Handoff

**Tanggal:** 2026-09-16
**Status:** Siap deploy (Worker perlu KV namespace ID di wrangler.toml)

---

## Masalah yang dipecahkan

Ghost Sentinel v1 mensyaratkan PC Windows menyala 24/7.
Tanpa PC → tidak ada pelacakan. Ini blocker untuk "masyarakat luas."

Ghost Sentinel v2 menghilangkan ketergantungan itu:
**HP melaporkan langsung ke Cloudflare Worker** → owner cek dari mana saja.

---

## Arsitektur baru

```
HP dicuri
  ↓  (lapor langsung setiap 60 dtk)
Cloudflare Worker  →  SENTINEL_KV  (metadata + 200 beacon/device)
  ↑
Dashboard (sentinel.html) — bisa dibuka dari HP mana pun
```

---

## Komponen yang dibangun

| File | Fungsi |
|---|---|
| `workers/sentinel/index.mjs` | Cloudflare Worker backend |
| `workers/sentinel/wrangler.toml` | Config deploy Worker |
| `tools/fiezel-drop/public/track.html` | Tracker PWA (rewrite total) |
| `tools/fiezel-drop/public/sentinel.html` | Dashboard (rewrite total) |
| `website/sentinel/index.html` | Landing page publik |

---

## Cara deploy Worker

```bash
cd workers/sentinel

# 1. Buat KV namespace
wrangler kv namespace create SENTINEL_KV
# Salin ID yang muncul → tempel ke wrangler.toml [[kv_namespaces]] id = "..."

# 2. Set secrets
wrangler secret put SENTINEL_SIGNING_KEY   # 64 char hex random
wrangler secret put SENTINEL_ADMIN_TOKEN   # token admin

# 3. Deploy
wrangler deploy
```

Worker akan tersedia di `sentinel.fiezel.my.id` setelah DNS propagate.

---

## Cara setup perangkat baru (user flow)

1. Buka `https://sentinel.fiezel.my.id/`
2. Klik "Setup Perangkat Baru"
3. Sistem buat `deviceId` + `ownerToken`
4. Scan QR dari HP yang ingin dilindungi
5. "Tambahkan ke Layar Utama"
6. Selesai — pelacak aktif

---

## Fitur tracker v2 (track.html)

- Lapor ke cloud (Cloudflare Worker) + lokal server (opsional)
- GPS setiap 60 dtk (bisa diubah oleh owner: 10–600 dtk)
- Selfie senyap setiap 3× beacon
- Foto lingkungan (kamera belakang) setiap kirim dengan foto
- Alert otomatis: charger dicabut, getaran keras
- Poll perintah dari cloud setiap 30 dtk
- Owner trigger: tap label "v4.1 Calculator Utility" 7× dalam 3 dtk
- Eksekusi perintah: chime, alarm, selfie, environment, lock_msg

---

## Fitur dashboard v2 (sentinel.html)

- Auth via Device ID + Owner Token (tersimpan di localStorage)
- Auto-refresh 30 dtk
- Peta Leaflet: rute + marker + foto thumbnail
- Feed beacon (50 terakhir) dengan highlight alert
- Perintah: Bunyi, Alarm, Foto, Pesan Kunci
- Export bukti TXT (koordinat + foto + IP + waktu)
- Setup wizard built-in

---

## Aturan keamanan yang tidak boleh dilanggar

1. **ownerToken tidak pernah ada di tracker URL** — hanya deviceId
2. **Tracker tidak bisa membaca data** — hanya bisa POST beacon
3. **Foto** dibatasi 120 kB base64 per gambar
4. **Rate limit** 60 req/menit per IP (in-memory, per isolate)
5. **Data TTL** 60 hari di KV, 1 tahun untuk metadata device

---

## Yang belum dibuat (utang teknis)

| Item | Prioritas |
|---|---|
| Push notification (Web Push API) ke HP owner | Tinggi |
| R2 bucket untuk foto resolusi penuh | Sedang |
| Dashboard mobile: PWA agar bisa install | Sedang |
| Trap pages (dana.html, paket.html) — perlu review hukum impersonasi merek | Tinggi |
| Multi-device dalam satu dashboard | Rendah |
| Enkripsi end-to-end beacon | Rendah |

---

## Catatan trap pages

`dana.html` meniru DANA app, `paket.html` meniru layanan kurir.
Impersonasi merek bisa melanggar hukum merek dagang Indonesia.
Saran: ubah ke versi generik ("Dompet Digital", "Lacak Paket") tanpa logo/nama merek nyata.
