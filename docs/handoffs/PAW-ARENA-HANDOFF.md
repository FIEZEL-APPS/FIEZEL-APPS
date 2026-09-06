# PAW ARENA — Handoff (m025-277)

Owner menyerahkan keempat keputusan §10 ke agen ("Aku serahkan semuanya padamu… dengan
melihat repo main sekarang"), lalu meminta wiring view + UI Sinyal/Taruhan. Berikut
keputusan, apa yang sudah dikerjakan, batasannya, dan langkah berikutnya.

## Keputusan (§10)
1. **Tiga permainan**: STORY CHAIN (owner) + **SINYAL** (beri-petunjuk dari kartu & tebak;
   melatih kedalaman kosakata) + **TARUHAN** (bertaruh keyakinan sebelum menjawab; melatih
   kalibrasi lintas-skill). Ketiganya solo-vs-bot offline, nol server, 3–7 menit, tanpa ketik
   bebas, rasa berbeda (kerja sama / deduksi-komunikasi / risiko-kecepatan).
2. **Duel lama diganti**; semangatnya diserap ke Taruhan. `?duel=KODE` tetap hidup lewat
   `readLegacyDuelCode` (FiezelDuel.decode) + jalur duel klasik.
3. **Navigasi opsi (a)**: view `arena` sendiri, tanpa tab baru (hormati m025-246 4 tab).
4. **Kartu aturan penuh per-sesi** + tombol `?` di tengah ronde.

## Sudah dikerjakan (kode, terverifikasi)
- `features/brain/fiezel-arena-bot.js` — bot Braincore **murni** (seed→langkah deterministik;
  nol Date.now/Math.random/DOM/storage/jaringan). 3 persona (Bumi/Kira/Pak Rusa) yang kadang
  ragu/salah. Manifest authority `off` (murni + dimuat + di-precache; belum ada pemanggil
  app.js selain view arena → jujurnya `off`, pola questionAllocation). Dimuat index.html +
  precache sw.js.
- `features/learner-flow/fiezel-paw-arena.js` — orkestrator **lengkap**: lobby (3 kartu) →
  **kartu aturan per-sesi** (SELALU fase `rules`; `USES_TOUR=false`; **tidak** pakai
  `fiezel-tour`) → ronde → hasil. Jalur keluar tunggal `dismissRules()` (m025-88), `?`
  (`openHelp/closeHelp`) tak menyentuh ronde/giliran/skor, `readLegacyDuelCode`. **Tiga UI
  ronde jalan solo-vs-bot**: Story (tantangan→sambung kalimat; artefak ke localStorage),
  Sinyal (pilih 2–3 kartu petunjuk + tebak; peran bergantian), Taruhan (taruhan→jawab→pot).
  Soal dari `FiezelReviewBank`; SFX `uiSfx`; maskot `pawReact`; jeda bot hormat reduced-motion.
- **Wiring `app.js`**: `VALID_VIEWS += 'arena'`, dispatch `arenaView()`, fungsi `arenaView()`,
  **kartu Home** (`learnerFlowHomeMarkup`, `go('arena')`, `data-testid="home-paw-arena"`).
- `features/learner-flow/learner-flow.css` — tata letak arena (nol @keyframes baru; reduced-motion).
- `copy-id/th-pawarena.js` — dwibahasa penuh (th DRAFT AI); di `fiezel-th-loader.js` +
  `locale-assets-th.json`.
- `tests/paw-arena-rules-card-test.js` — gerbang **dibuktikan MERAH** (M1 once-per-lifetime,
  M2 help-hanguskan-giliran); terdaftar di quality.yml.
- Build **m025-277** di 4 tempat; `id-golden-baseline.json` ditulis ulang.

## Mutasi yang diuji (bukti gerbang bisa merah)
- M1 newSession kedua tak lahir `rules` → MERAH. M2 openHelp ubah ronde/giliran → MERAH.
- M3 modul pakai `FiezelTour` untuk kartu aturan → assert KODE (komentar diabaikan) MERAH.

## Verifikasi lokal (Node 20 sandbox; CI pakai 22)
26 gerbang relevan HIJAU: paw-arena, th-coverage (186/186), th-ui-leak, th-bank-purity,
id-golden-snapshot, regression, ui-structure, back-nav, a11y, contrast, view-reachability,
boot-order, splash-first-paint, brain-manifest, brain-page-wiring, braincore-purity,
brain-config, gate-registry, pwa-cache, install-health, pwa-release-coherence,
build-number-uniqueness, lucide-icon-coverage, css-keyframe-uniq, coordination-guard,
secret-scan. Smoke headless: 3 permainan tuntas lobby→aturan→ronde→hasil, artefak tersimpan,
petunjuk mid-ronde tak ubah skor. Suite penuh 259 gerbang (Node 22/Python/Chromium/jaringan)
dijalankan di CI; `cf-live-selftest` merah-diketahui bukan milik perubahan ini.

## Sengaja BELUM dikerjakan (langkah berikutnya)
- **Entri Profil** (§4a "dari Profil"): tinggal satu tombol `go('arena')` di tab Profil —
  ditunda agar tab sosial tak disentuh dulu. Pintu Home + view sudah jalan.
- **Main berdua lewat kode untuk game arena baru**: `?duel=` lama tetap hidup; round-trip kode
  untuk Story/Signal/Stakes menyusul (pola encode/decode duel bisa dipakai ulang).
- **Penghapusan `fiezel-duel.js`**: ditahan sampai transisi selesai.
- **Coach-mark kali-pertama** (opsional, §3.3) sebagai TAMBAHAN kartu per-sesi.
