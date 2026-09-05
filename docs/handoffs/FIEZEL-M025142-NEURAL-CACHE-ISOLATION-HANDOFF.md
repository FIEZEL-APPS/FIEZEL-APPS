# m025-142 — Model 152 MB berhenti masuk cache tanpa diminta

Menutup **B-11**. Ini kegagalan senyap dengan bentuk yang paling sulit dilihat: kodenya
terbaca benar, lengkap dengan komentar yang menjelaskan kenapa ia aman.

**Status: SELESAI di branch, menunggu penerimaan fisik OWNER.**

---

## 1. Bug-nya

```js
// m025-100: model lokal dihapus; tidak ada lagi aset neural besar yang disajikan
// dari cache runtime, jadi pencocoknya tidak lagi punya subjek.
const isNeuralAsset=()=>false;
```

Premisnya tidak benar. **Modelnya tidak dihapus**: `vendor/supertonic-3` masih ada, masih
**152 MB** dalam 14 berkas (`vocoder.int8.onnx`, `text_encoder.int8.onnx`,
`sherpa-onnx-wasm-main-tts.wasm`, dan seterusnya), dan masih disajikan dari origin yang sama.

Selama pencocoknya mengembalikan `false`, setiap permintaan ke berkas itu jatuh ke cabang
terakhir `fetch` handler:

```js
responsePromise=caches.match(e.request,{cacheName:CACHE}).then(c=>c||fetch(e.request)
  .then(r=>{if(r&&r.ok&&!isNeuralAsset(e.request)){ /* ditulis ke CACHE */ }}))
```

Penjaga `!isNeuralAsset(...)` di sana tidak pernah menyala. Jadi kontraknya opt-in tetapi
perilakunya otomatis: kuota perangkat murid bisa habis 152 MB tanpa ia pernah menyalakan
suara neural.

## 2. Perbaikannya

`isNeuralAsset()` sekarang benar-benar memeriksa permintaannya, dan batasnya **satu
direktori**, bukan daftar ekstensi:

```js
const isNeuralAsset=request=>{
  if(!request?.url)return false;
  try{return new URL(request.url).pathname.includes('/vendor/')}catch{return false}
};
```

Alasan memilih direktori: seluruh runtime dan model besar hidup di bawah `vendor/`, tidak ada
satu pun entri `vendor/` di `ASSETS`, dan lapisan neural punya cache stabilnya sendiri yang ia
isi saat murid benar-benar meminta. Daftar ekstensi akan meleset begitu ada berkas model baru
dengan akhiran lain - dan meleset ke arah yang salah.

## 3. Gate yang membantah pembacaan

`tests/neural-cache-isolation-test.js` **menjalankan** `fetch` handler `sw.js` yang asli di atas
CacheStorage tiruan. Ini disengaja: bug ini lolos justru karena kodenya terbaca benar. Yang
membantahnya bukan pembacaan, melainkan melihat apa yang tertulis ke cache.

Enam pemeriksaan, dan semuanya diuji dua arah - saya kembalikan sementara `isNeuralAsset`
ke `()=>false` dan memastikan gate-nya **merah**, dengan detail `model masuk cache:
fiezel-v5.19.0`. Gate yang tidak pernah bisa gagal bukan gate.

- Model neural tidak pernah ditulis ke cache mana pun oleh permintaan biasa.
- Permintaannya tetap diteruskan ke jaringan - murid tetap dapat suaranya.
- Setelah lapisan neural menyiapkannya, permintaan dilayani dari cache stabil **tanpa**
  mengunduh ulang. Itulah gunanya cache terpisah.
- Penjaganya tidak terlalu lebar: aset runtime biasa TETAP masuk cache.
- Aset shell tetap di cache shell bereversi.
- Pencocok tanpa argumen ditolak di tingkat sumber.

## 4. Bukti

- Seluruh **87 gate** `.github/workflows/quality.yml`: PASS.
- `tests/neural-cache-isolation-test.js`: **6/6 PASS**, dan terbukti merah pada kode sebelumnya.
- Versi naik bersama ke `m025-142`.

## 5. Sisa

B-06 dan B-12 masih terbuka; Speaking dan Listening belum berformat ujian; kalibrasi 300
bacaan lama masih terbalik.
