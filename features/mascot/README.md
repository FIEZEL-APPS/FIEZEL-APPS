# features/mascot — motion system PAW

## Isi

| Berkas | Status |
| --- | --- |
| `fiezel-mascot.js` | DIPAKAI. Custom element `<fiezel-mascot>`, 14 state, SVG inline (tanpa fetch). Dimuat `defer` di `index.html` SEBELUM `fiezel-coach-bubble.js` dan `app.js`. Ikut di-precache `sw.js`. |
| `fiezel-motion.css` | DIPAKAI. Token gerak + animasi 14 state + penempatan di aplikasi. Dimuat PALING AKHIR di antara stylesheet. Ikut di-precache. |
| `micro-ui.css` | REFERENSI, BELUM DIPAKAI. Tidak dimuat `index.html`, tidak di-precache. Berisi toast, ring progres, checkmark, skeleton. Baca sebelum membuat komponen serupa dari nol. |

## Cara memanggil

Satu pintu, `self.FiezelPaw`:

```js
FiezelPaw.react('correct');                       // laporkan kejadian, komponen pilih state
FiezelPaw.setState('thinking', { hold: 0 });      // hold 0 = tahan sampai diganti
FiezelPaw.ready();                                // custom element benar-benar terdaftar?
FiezelPaw.faceMarkup('fz-coach-face', fallback);  // markup wajah + cadangan
```

Di `app.js` pakai pembungkusnya (`pawReact`, `pawSetState`, `pawFaceMarkup`) — pembungkus itu
yang menghormati pengaturan kurangi-gerak. Memanggil `FiezelPaw` langsung dari `app.js`
melewati gerbang itu.

Jangan memanggil elemennya langsung (`document.querySelector('fiezel-mascot').react(...)`).
Ada lebih dari satu maskot hidup di halaman dan keduanya harus bereaksi bersamaan.

## Titik pasang saat ini

| Tempat | Kejadian |
| --- | --- |
| `app.js` `answerFeedbackSignal()` | `correct` / `wrong` |
| `app.js` `finishQuiz()` setelah `uiSfx('celebrate')` | `lesson-complete` |
| `app.js` `skillsLab()` setelah `controller.open()` | `listening-start` / `question-shown` |
| `app.js` `renderInner()` saat controller dibubarkan | `listening-stop` |
| `app.js` `showOnboarding()` `onName` | `onboard` |
| `app.js` `home()` lewat `pawStreakWatch()` | `streak-lost` |
| `fiezel-coach-bubble.js` `open()` | `onboard` |
| `fiezel-coach-bubble.js` `ask()` | `thinking` → `encouraging` |

Titik pasang TIDAK dipasang di lapisan data (`record()`, `completeActiveSession()`,
`recomputeMeaningfulDays()`). Fungsi-fungsi itu juga berjalan saat tidak ada layar yang tampil,
dan reaksi gerak dari sana akan menyala di waktu yang salah.

## Perubahan dari paket aslinya

`fiezel-motion.css` tidak salinan verbatim. Ada empat adaptasi wajib, semuanya ditandai
`[ADAPTASI]` di kepala berkas, semuanya karena berkas ini hidup berdampingan dengan `style.css`
yang sudah punya token dan kelas bernama sama. `fiezel-mascot.js` salinan verbatim ditambah
satu blok corong `self.FiezelPaw` di bawahnya.
