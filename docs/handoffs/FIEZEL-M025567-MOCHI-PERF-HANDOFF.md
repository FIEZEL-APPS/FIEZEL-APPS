# M025-567 — Satu Mochi 3D bersama + pengaman HP (atasi lag PWA Android/iPhone)

## Keluhan
"Aplikasi FIEZEL di PWA Android dan iPhone sangat lambat dan super ngelag."

## Akar masalah (terukur, Chromium emulasi HP, CPU 4× lebih lambat, layar pertama)
| | Mochi aktif (m025-566) | Mochi mati (reduced motion) |
|---|---|---|
| Long task main thread | 2,58 dtk (12) | 0,88 dtk (6) |
| Konteks WebGL | 2 | 0 |
| Skrip termahal | `three.module.js` ~1,1 dtk | `app.js` ~0,46 dtk |

1. **Setiap `<fiezel-mascot>` punya renderer WebGL sendiri** (sejak m025-503, `isPracticeHost()` selalu `true`),
   masing-masing dengan loop 60 fps dan `MutationObserver` sendiri atas seluruh `body`.
2. **Setiap soal kuis membangun Mochi dari nol**: `setApp()` menimpa layar → konteks GL lama dibuang, yang
   baru dibuat (geometri, tekstur kulit, kompilasi shader). Ini jeda di tiap ketukan "Lanjut".
3. **m025-542 mencabut pengaman HP**: MSAA, DPR 2, mesh 128×96, kulit 1024² dilukis ulang + diunggah ke GPU
   di setiap `setMood` (dua kali per jawaban), lencana 512×320 diunggah ulang 20×/dtk.
4. `destroy()` tidak memanggil `forceContextLoss()`, dan membatalkan timer tidur dengan `cancelAnimationFrame`
   sehingga loop instance yang sudah dihancurkan bisa hidup lagi.

## Perubahan
`features/mascot/fiezel-mochi-companion.js`
- Satu instance Mochi untuk seluruh aplikasi. Ia dipindah (bukan dibangun ulang) ke host yang paling baru
  dan wadahnya tampil. Saat seri, host yang lebih besar menang. `attach(host)` eksplisit selalu menang.
- Tanpa host tersisa: Mochi diparkir (dijeda), lalu dibebaskan setelah 45 dtk.
- Satu `MutationObserver` global yang hanya bereaksi pada `<fiezel-mascot>` baru atau host aktif yang lepas.
  Ia berjalan sebelum paint, sehingga soal baru tidak lagi berkedip tanpa maskot ~60 ms.
- Kelayakan host dinilai dari wadah induknya: CSS menyembunyikan `.writing-mascot`/`.path-mascot` sampai
  memegang viewport. Host di dalam wadah tersembunyi (mis. `.coach-strip-face`) tidak lagi memakan konteks GL.
- `react()` kembali meneruskan semua event ke rig 2D bila host tidak (lagi) memegang Mochi.
- Kegagalan WebGL dicatat sekali; tidak dicoba ulang di setiap scan.
- `reduced motion` aktif di tengah sesi → instance dibebaskan.

`mochi-mascot/fiezel-mochi.js`
- Pengaman HP dipulihkan: tanpa MSAA, DPR ≤ 1,5, mesh 56×42, kulit 512², lencana 256×160.
- **Bug lama yang membuat 512² tampak "tidak HD" (alasan m025-542) diperbaiki**: kulit dilukis dalam
  koordinat 1024 tanpa skala, jadi di kanvas 512 hanya seperempat kiri-atas yang masuk dan rona pipi meleset.
  Sekarang dilukis lewat `setTransform(512/1024)`.
- `setMood` hanya melukis ulang kulit bila tampilan pout/non-pout berubah.
- `pause()`/`resume()`, timer tidur terpisah dari `rafId`, `forceContextLoss()` di `destroy()`.

## Kompromi yang perlu diketahui OWNER
- Di HP, Mochi sedikit kurang tajam dibanding m025-542 (DPR 1,5, tanpa MSAA). Kalau terlalu lembut, kenop
  pertama yang aman dinaikkan adalah DPR ke 2 (`IS_MOBILE ? 1.5 : 2`). Biaya terbesar sudah hilang lewat pooling.
- Di layar dengan dua maskot yang sama-sama tampil, hanya satu yang memegang Mochi 3D. CSS (`AUDIT FIX 1`)
  menyembunyikan rig 2D di mana-mana, jadi host lainnya kosong.

## Gerbang
- `tests/test-all-practices-mochi-wire.js`: 10/10 PASS (JLPT, kuis, writing, skills lab, funnel pawReact, 0 error konsol).
- install-health, pwa-release-coherence, boot-order, paw-mascot, mascot-reduced-motion, pwa-cache, regression,
  th-coverage: PASS.
