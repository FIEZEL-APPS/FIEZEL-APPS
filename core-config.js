/* FIEZEL Core Brain runtime configuration.
 * workerUrl remains empty in distributable source until an operator-owned Puter Worker is deployed.
 * Never put VAPID private keys, cron tokens, or Puter auth tokens here.
 */
// OWNER MEMBALIK m025-34. Bendera ini dulu bernilai true dan artinya harfiah: tanpa izin
// notifikasi yang benar-benar 'granted', aplikasi tidak bisa dimasuki sama sekali. OWNER
// sekarang menilai pola itu sendiri sebagai kerusakannya: "Ini pola dark-pattern yang
// justru bikin app terasa murahan, bukan premium - Duolingo/Spotify minta izin notifikasi
// setelah onboarding, dengan alasan kontekstual, dan tetap bisa dipakai kalau ditolak."
//
// Bendera dipertahankan (bukan dihapus) dengan nilai false supaya modul mana pun yang
// masih membacanya - features/diagnostics/fiezel-diagnostic-register.js salah satunya -
// membaca keputusan yang benar, bukan `undefined` yang bisa berarti apa saja. Notifikasi
// sekarang DIUNDANG, tidak dipaksa: lihat startNotificationInvitation() di app.js.
self.FIEZEL_REQUIRE_NOTIFICATIONS=false;
// m025-61: penanda build halaman, dipakai health check untuk membandingkan versi yang
// benar-benar dimuat dengan shell yang dipegang service worker. Nilainya dijaga gate agar
// selalu sama dengan DIAG_BUILD; kalau keduanya berbeda, install-health-test gagal.
self.FIEZEL_PAGE_BUILD='m025-171';
// m025-150 profil suara ElevenLabs untuk sisi klien.
//
// Isinya sengaja hanya penanda, BUKAN rahasia apa pun: kunci API ElevenLabs hidup di
// GitHub Actions secret dan tidak pernah menyentuh berkas yang disajikan ke browser
// (mandat V2 pasal 6). Yang ada di sini hanya cukup untuk menghitung audioKey.
//
// voiceId dibiarkan kosong sampai owner memilih suaranya. Selama kosong, resolver menjawab
// setiap permintaan dengan ABSENT dan FIEZEL berbunyi persis seperti sebelum rilis ini -
// keadaan aman yang disengaja, bukan konfigurasi yang lupa diisi. Setelah batch pertama
// berjalan, manifest membawa profil yang sebenarnya dan nilai di sini tinggal jadi cadangan
// selama manifest belum termuat.
self.FIEZEL_AUDIO_CONFIG=Object.freeze({
  voiceId:'',
  modelId:'eleven_multilingual_v2',
  settings:Object.freeze({stability:0.5,similarityBoost:0.75,speed:1})
});
self.FIEZEL_CORE_CONFIG=Object.freeze({
  workerUrl:'https://fiezel-core.puter.work',
  protocolVersion:'1.7',
  aiGateway:'core-only',
  remotePushRequired:true,
  deploymentState:'validated'
});
// ── SAKELAR TRANSPORT CLOUDFLARE (m031-flags, cf-b1 §5.3 + cf-b6 pola P1) ────────────
//
// Worker `fiezel-api` SUDAH hidup (D1+KV, `/health` menjawab `protocol 1.7`, `/api/config`
// menjawab semua flag false), TETAPI alamat tetapnya `api.fiezel.my.id` BELUM aktif
// (menunggu nameserver) dan workers.dev sengaja dimatikan. Jadi yang dipasang di sini
// adalah SAKELARNYA DALAM KEADAAN MATI, bukan jalur yang hidup: `base` kosong dan
// `enabled:false`, sehingga `coreWorkerExec` di app.js tidak pernah menyentuh Cloudflare.
//
// FIELD BARU, BUKAN TIMPAAN. `FIEZEL_CORE_CONFIG.workerUrl` di atas TIDAK disentuh:
// `remote-push-test.js:6` mengunci nilainya ke `^https://[a-z0-9-]+\.puter\.work$`, dan
// mengarahkannya ke domain Cloudflare akan memerahkan gerbang push sekaligus memutus jalur
// pengingat yang hari ini berjalan. Alamat CF hidup HANYA di `base` di bawah.
//
// Tiga status per endpoint (cf-b6 "Pola pagar rilis" P1), bukan boolean:
//   'off'    = kode CF ada di bundel tapi tidak pernah dieksekusi. Jalur Puter hari ini
//              melayani semuanya, tanpa satu pun fetch tambahan. Nol dampak murid.
//   'shadow' = jawaban yang DIPAKAI murid tetap dari Puter; salinan permintaan dikirim ke
//              CF dengan penanda dry-run, hasilnya DIBUANG dan hanya dibandingkan di konsol
//              diagnostik. Tidak pernah ditampilkan, tidak pernah menggandakan efek samping.
//   'on'     = CF menyajikan jawaban (dengan `credentials:'include'`).
//
// ROLLBACK SATU NILAI: `enabled:false` mematikan SELURUH jalur CF walau setiap endpoint
// bernilai 'on'. Itu satu-satunya sakelar yang perlu diingat saat insiden di sisi klien.
//
// TAPI SAKELAR STATIS INI BUKAN KILL SWITCH SESUNGGUHNYA. Berkas ini ikut di-precache
// service worker (`sw.js:35`, daftar ASSETS) dan dilayani cache-first, jadi mengubah
// nilainya TIDAK menjangkau PWA yang sudah terpasang sampai `SW_REV` naik dan generasi
// shell baru terpasang. Kill switch yang nyata ada di SERVER: `GET /api/config` pada Worker
// CF (KV `cfg:flags`), dibaca sekali per boot dengan timeout pendek dan default = nilai
// statis di bawah kalau gagal. Flag statis ini lapis KEDUA, bukan yang pertama.
//
// Tidak ada rahasia di blok ini (syarat `release-audit.py:105,130` untuk core-config.js).
self.FIEZEL_CF_CONFIG=Object.freeze({
  enabled:false,
  base:'',
  endpoints:Object.freeze({health:'off',config:'off',auth:'off',quota:'off',ai:'off',tts:'off',usage:'off'})
});
