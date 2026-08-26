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
self.FIEZEL_PAGE_BUILD='m025-167';
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
