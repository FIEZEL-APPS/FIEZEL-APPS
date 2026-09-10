# FIEZEL — perkenalan yang tidak bisa lagi mengurung murid (handoff m025-112)

**Status:** selesai pada m025-112. **Cabang:** `ui-perkenalan-jalan-buntu` · **PR:** #162
**Menggantikan:** #132, yang tidak pernah mendarat.
**Penerimaan fisik:** WAIVED_BY_OWNER (izin berdiri untuk PR UI di sesi kerja ini).

---

## 1. Kenapa dokumen ini ada

Perubahan ini menyentuh `features/neural-voice/fiezel-diag-panel.js` — hanya penanda
`DIAG_BUILD`, tetapi gerbang A13 tidak bisa membedakan penanda dari perubahan neural
sungguhan. Ada satu aturan di sini yang memang layak ditulis, jadi handoff-nya dibuat
sungguhan alih-alih diakali.

## 2. Aturan barunya

**Setiap jalan keluar dari sebuah lapisan penuh layar harus lewat SATU fungsi yang sama, dan
fungsi itu yang bertanggung jawab memberi tahu pemanggil.**

Sebelum ini, penyerahan kendali ditulis terpisah di tiap pemanggil:

```js
advance()           -> finish('finish');   opts.onFinish(...)
startPlacementNow() -> finish('placement'); opts.onPlacement(...)
tombol "Lewati"     -> finish('skip');     // <- tidak ada apa-apa
```

Pola itu bekerja sampai seseorang menambah jalan keluar keempat dan lupa barisnya. Dan itu
memang terjadi. Sekarang `finish()` sendiri yang memilih dan memanggil handler-nya, jadi jalan
keluar baru tidak bisa lagi diam.

## 3. Kenapa akibatnya sebesar itu

`afterOnboardingExit()` → `startNotificationGate()` → `openApp()` → **`render()`**.

`render()` di ujung rantai itu adalah **satu-satunya render pada jalur boot**. Jadi satu
callback yang hilang bukan berarti "sebuah callback hilang", melainkan **aplikasinya tidak
pernah tergambar**: murid melihat topbar dan navigasi bawah di atas `#app` yang kosong, dan
satu-satunya jalan keluar adalah memuat ulang halaman.

Siapa pun yang nanti memindahkan `render()` dari sana perlu tahu ini: selama ia berada di
belakang sebuah gerbang, setiap jalur yang melewatkan gerbang itu menghasilkan layar kosong.

## 4. Kenapa bug ini lolos meski file-nya sudah punya tes

`tests/onboarding-test.js` sudah memeriksa tombol "Lewati" — tetapi yang diperiksanya adalah bahwa
perkenalan **berhenti menghadang** (`completed(env) === true`, `show()` berikutnya menolak
tampil). Ia tidak pernah memeriksa bahwa aplikasinya **dilanjutkan**.

Itu pelajaran yang layak dibawa ke tes lain: memeriksa bahwa sesuatu berhenti tidak sama
dengan memeriksa bahwa penggantinya mulai.

Gate baru karena itu memakai mata-mata callback, dan diuji-mutasi: mencabut pemilihan handler
dari `finish()` membuatnya merah.

## 5. Dua jalan buntu lain di alur yang sama

- **`goStep()` menjepit ke 5, tombol lewati-langkah memanggil `goStep(step + 1)`.** Di langkah
  5 itu `goStep(6)` yang dijepit kembali ke 5 lalu mengecat ulang layar yang sama — tombol
  mati tepat di sebelah "Mulai Belajar". `LAST_STEP` kini ditulis sekali supaya penjepit dan
  pemeriksaan ujung tidak bisa menyimpang lagi.
- **`attemptPuterSignIn()` tanpa tenggat.** `setAuthGateState('pending')` mematikan tombolnya,
  dan tidak ada yang menyalakannya kembali kalau `signIn()` tidak pernah selesai. Tenggat 45
  detik, dan **ditangkap seperti kegagalan login lain** — kalau dibiarkan lewat sebagai
  penolakan yang tidak tertangani, tombolnya tetap mati.

## 6. Berkas yang relevan

| Berkas | Peran |
|---|---|
| `features/onboarding/fiezel-onboarding.js` | `finish()` sebagai satu-satunya jalan keluar; `LAST_STEP` |
| `app.js` | `PUTER_SIGNIN_TIMEOUT_MS` dan `Promise.race` di `attemptPuterSignIn()` |
| `tests/onboarding-test.js` | empat gerbang baru, termasuk mata-mata callback |

## 7. Catatan untuk pekerjaan berikutnya

Ritual rilis mewajibkan `DIAG_BUILD` naik, dan penanda itu tinggal di
`features/neural-voice/fiezel-diag-panel.js`. Akibatnya **setiap rilis UI menyentuh berkas
neural**, lalu memicu A13 dan gerbang `audiobook-safari` — yang saat ini merah di `main`
karena `vendor/supertonic-3` sudah dihapus.

Memindahkan `DIAG_BUILD` ke `core-config.js`, bersama dua penanda lainnya yang memang harus
naik bersamaan, akan menghentikan tabrakan lintas-wilayah ini. Itu belum dikerjakan karena
menyentuh wilayah suara.
