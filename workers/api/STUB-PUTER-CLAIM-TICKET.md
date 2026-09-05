# STUB TERDOKUMENTASI — penerbit tiket klaim di sisi Puter (BELUM ADA)

Status: **belum diimplementasikan.** Sisi verifikasi (Cloudflare) SUDAH ada dan
sudah diuji gerbang: `workers/api/route-auth.js` → `verifyClaimTicket()`.
Sisi penerbit hidup di Worker Puter (`fiezel-core-worker.js`) dan **tidak
disentuh oleh paket kerja ini** — berkas itu milik paket kerja lain, dan
mengubahnya di sini akan menabrak aturan satu-penulis-per-berkas.

Sampai penerbit dipasang, `POST /api/auth/claim` selalu menjawab
`401 {"error":"claim_invalid"}`. Itu perilaku yang benar: fitur pengikatan
identitas tanpa penerbit tiket tidak boleh mengikat apa pun.

## Kenapa harus tiket, bukan `{uuid}` dari klien

Worker Cloudflare **tidak bisa** memverifikasi login Puter — tidak ada
`puter.auth.getUser()` di sana. Kalau klien boleh mengirim uuid-nya sendiri,
maka `POST /api/auth/claim {uuid}` menjadi cara mengambil alih identitas, kuota,
dan plan orang lain. Bukti yang sah harus datang dari pihak yang memang bisa
memverifikasi: Worker Puter, yang menurunkan uuid dari sesi platform
(`callerInfo()`, `fiezel-core-worker.js:184`).

## Kontrak tiket (WAJIB sama byte-per-byte dengan verifier)

```
ticket  = b64url(JSON.stringify(payload)) + '.' + b64url(HMAC-SHA256(b64urlPayload, CLAIM_SECRET))

payload = {
  v:   1,
  aud: 'fiezel-api',                       // audiens; verifier menolak nilai lain
  ref: <hex 32..64>,                       // HMAC(uuidPuter, PEPPER) — BUKAN uuid mentah
  jti: <[A-Za-z0-9_-]{8,64}>,              // sekali pakai; anti-replay
  iat: <epoch detik>,
  exp: <iat + 120>                         // verifier menolak exp-iat > 120
}
```

Aturan yang ditegakkan verifier (semua sudah diuji di `tests/cf-api-contract-test.js`):

| Aturan | Jawaban kalau dilanggar |
|---|---|
| dua bagian base64url, JSON objek, kunci persis `{v,aud,ref,jti,iat,exp}` | 401 `claim_invalid` |
| tanda tangan sah terhadap `PUTER_CLAIM_SECRET_CURRENT` **atau** `_PREVIOUS` | 401 |
| `aud === 'fiezel-api'` | 401 |
| `exp > sekarang` | 401 |
| `exp - iat <= 120` detik | 401 |
| `iat` tidak lebih dari 60 s di masa depan | 401 |
| `jti` belum pernah dipakai (KV, TTL 300 s) | 401 |

Semua pelanggaran memakai **body galat yang identik**. Membedakannya akan
memberi penyerang oracle untuk menyetel tiket sampai lolos.

## Yang harus ditulis paket kerja Puter (pseudokode, JANGAN ditempel apa adanya)

```js
// DI WORKER PUTER (fiezel-core-worker.js) — rute BARU, owner tidak perlu terlibat.
router.post('/api/identity/claim-ticket', async ({ user }) => {
  const u = await user.puter.auth.getUser();          // terverifikasi platform
  if (!u || !u.uuid) return new Response('{"error":"unauthenticated"}', { status: 401 });

  const pepper = await me.puter.kv.get('cfg:claim_pepper');   // dipasang owner
  const secret = await me.puter.kv.get('cfg:claim_secret');   // dipasang owner
  if (!pepper || !secret) return new Response('{"error":"not_configured"}', { status: 503 });

  const ref = await hmacHex(pepper, u.uuid);          // uuid mentah TIDAK PERNAH keluar
  const iat = Math.floor(Date.now() / 1000);
  const payload = { v: 1, aud: 'fiezel-api', ref, jti: crypto.randomUUID(), iat, exp: iat + 120 };
  const encoded = b64url(JSON.stringify(payload));
  return { ticket: encoded + '.' + await hmacB64url(secret, encoded), protocol: '1.7' };
});
```

Klien lalu meneruskannya:
`POST https://api.fiezel.my.id/api/auth/claim` dengan body `{ticket}` dan
`credentials:'include'`.

## Biaya kepercayaan yang harus diakui ke owner (jangan disembunyikan)

`CLAIM_SECRET` harus dikenal Worker Puter, jadi ia disimpan di KV Puter lewat
rute konfigurasi owner-only. Itu **memperluas** kepercayaan ke platform Puter.
Mitigasi yang mengikat:

1. Secret ini **hanya** boleh mengotorisasi pengikatan identitas — tidak pernah
   kuota, AI, atau TTS.
2. Umur tiket 120 detik dan `jti` sekali pakai: satu tiket bocor tidak menjadi
   kunci permanen.
3. Secret dirotasi; dua secret aktif (`CURRENT` + `PREVIOUS`) supaya rotasi tidak
   memutus klaim yang sedang berjalan.
4. Seluruh jalur klaim (rute Puter + secret + kolom `legacy_ref_hmac`) **dihapus**
   saat Puter dicabut. Pengenal yang tidak lagi perlu = pelanggaran bab 29.

**Dependensi urutan yang tidak boleh dilanggar:** Worker Puter wajib tetap hidup
selama seluruh jendela klaim. Kalau Puter dicabut lebih dulu, tidak ada lagi
jalan sah untuk mengikat murid lama ke identitas Cloudflare, dan progres mereka
menjadi tak terklaim secara permanen.

## Alternatif kalau owner menolak risiko secret bersama

Kode 6 digit sekali pakai yang ditampilkan di UI sisi Puter dan dimasukkan murid
di sisi FIEZEL. Lebih aman (tidak ada secret bersama), **jauh lebih buruk** untuk
UX anak. Rekomendasi tetap: pakai tiket.
