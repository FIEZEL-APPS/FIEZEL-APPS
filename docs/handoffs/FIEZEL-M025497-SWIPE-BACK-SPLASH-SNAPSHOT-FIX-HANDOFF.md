# FIEZEL m025-497 — Swipe back mengintip splash gelap + reboot ~3 detik (HANDOFF)

## Keluhan owner
> "saat melakukan swipe back masih memunculkan background splash, dan jeda atau stuck sekitar kurang lebih 3 detik"

## Akar masalah (terbukti empiris)
1. **Potret entri dokumen = splash.** `installBackNav()` memanggil `controller.hold()` (pushState penanda) SAAT BOOT, ketika `#fiezelBootSplash` + `html.fz-booting` (#1B1418) masih menutupi layar. Peramban memotret entri dokumen saat pushState meninggalkannya, jadi potret entri #0 = splash gelap. Gestur swipe back iOS Safari / Android predictive back MENGINTIP potret itu di bawah jari murid.
   - Probe sebelum perbaikan: `history.state` entri #0 = `null`, penanda didorong selagi `fz-booting` aktif.
2. **Reboot ~3 detik.** Dari entri #0 (tumpukan kosong), tekanan berikutnya keluar dokumen (`about:blank`, terbukti di `tools/dev/test-full-back-flow.mjs`: `beforeunload` + FRAMENAV about:blank). Membuka lagi = muat dingin = splash boot penuh (VISIBLE_MS 3560 ms).
3. **Modal Listening JLPT** (`#listeningPanelModal`) tidak terdaftar sebagai lapisan back-nav, jadi swipe back menembus ke view di belakangnya / mempercepat jatuh ke entri #0.

## Perbaikan
| Berkas | Perubahan |
|---|---|
| `features/ui/fiezel-back-nav.js` | `install()` menerima `config.holdWhen()`. Penanda pertama ditunda (poll 120 ms, pagar 20 s) sampai splash hilang, lalu entri dokumen dicap `replaceState({fiezelAppRoot:1})` SEBELUM pushState → potret entri #0 = Home asli. Tanpa `holdWhen` perilaku lama utuh (61 asersi back-nav tetap hijau). |
| `app.js` | `installBackNav()` memasok `holdWhen`: tidak ada `fz-booting` dan tidak ada `.fiezel-splash/#fiezelBootSplash`. |
| `index.html` | `dismiss()` mencap entri dokumen (tidak pernah menimpa penanda back-nav) + `__fiezelBootSplashDismissed`; penjaga `pageshow` (BFCache) membuang splash/`fz-booting` bila halaman dipulihkan; `html`/`body` di luar boot dipaku krem `#FFF9EE` + `overscroll-behavior:none` supaya kanvas gelap tidak bocor saat overscroll. |
| `features/speaking-listening/fiezel-jlpt-listening.js` | Modal listening mendaftar `pushLayer('jlpt-listening')`; tombol tutup memanggil `dismiss()` (nol sentuhan History API). |

## Bukti empiris
`node tools/dev/probe-swipe-splash-snapshot.mjs` (Chromium headless, viewport mobile):
```
First marker push: { booting: false, splash: false, state0: '{"fiezelAppRoot":1}' }
After back from latihan: { view: 'home', holds: true }
Entry #0: { state: { fiezelAppRoot: 1 }, booting: false, splash: false } unloads: 0
PROBE PASS
```
Sebelum perbaikan: pushState terjadi saat `fz-booting`, entri #0 `state:null`.

## Gerbang lokal (semua exit 0)
back-nav, splash-first-paint, splash-choreography, app-interaction-policy, deploy-site-gate, gate-registry, th-ui-leak, id-golden-snapshot, curriculum-cache-version. `bump-build --check`: Selaras.

## Utang tersisa
- Potret swipe iOS/Android tidak bisa direkam headless; verifikasi akhir di perangkat nyata disarankan.
- Keluar PWA dari Home tetap pola "tekan sekali lagi untuk keluar" (disengaja, m025-237).
