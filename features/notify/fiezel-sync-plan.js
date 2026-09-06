/**
 * FIEZEL — fiezel-sync-plan.js · SATU ATURAN DETAK UNTUK DUA PAPAN.
 *
 * KENAPA MODUL INI ADA
 * --------------------
 * Ruang Guru dan tab Kelas murid sama-sama harus menyegarkan dirinya sendiri, dan keduanya
 * pernah gagal dengan cara yang sama: keputusan "boleh menyentuh jaringan sekarang atau
 * tidak" ditulis di dalam pemasang timer masing-masing, bercampur dengan DOM dan jam.
 * Akibatnya satu baris di sisi guru (`if (syncAvailable() !== 'ok') return;` SEBELUM timer
 * dipasang) mematikan seluruh detak untuk sisa sesi — dan tidak ada satu pun gerbang yang
 * bisa menangkapnya, karena untuk mengujinya orang harus memalsukan seluruh cangkang.
 *
 * Modul ini memisahkan keputusan itu menjadi FUNGSI MURNI: tanpa DOM, tanpa jaringan, tanpa
 * penyimpanan, tanpa jam internal. Semua yang berubah masuk sebagai argumen, jadi tiap cabang
 * bisa diuji di Node dalam satu baris — termasuk cabang "akun belum siap", yang justru cabang
 * paling sering terjadi di lapangan dan paling jarang diuji.
 *
 * ATURAN YANG DITEGAKKAN, dan alasannya:
 *
 *   'idle'  papan tidak terpasang. Tidak ada yang perlu disegarkan.
 *   'reset' ronde sebelumnya menggantung melewati STUCK_MS. Satu permintaan yang tidak pernah
 *           selesai (jaringan seluler yang menggantung, tab yang dibekukan di tengah fetch)
 *           mengunci penanda "sedang menyinkron" selamanya, dan sesudah itu setiap detak
 *           berikutnya melihat kunci itu lalu pulang. Papan berhenti hidup tanpa satu pun
 *           pesan. Kuncinya dilepas di sini, bukan diandaikan tidak pernah tersangkut.
 *   'skip'  ronde sebelumnya masih berjalan wajar, layar tidak dipandang (menanyai server
 *           untuk layar yang tidak dilihat hanya membakar baterai murid), atau rem menanjak
 *           sesudah gagal beruntun.
 *   'wait'  akun/koneksi belum siap. JANGAN sentuh jaringan — tapi detaknya TETAP berdenyut,
 *           supaya begitu sesi akun mendarat (ia dipulihkan asinkron, sering sesudah papan
 *           dipasang) ronde berikutnya jalan sendiri tanpa campur tangan siapa pun.
 *   'sync'  jalankan ronde jaringan sekarang.
 *
 * Urutannya bagian dari kontrak: 'reset' diperiksa sebelum 'skip' supaya kunci yang
 * tersangkut selalu bisa lepas, dan 'hidden' diperiksa sebelum 'wait' supaya layar yang
 * tidak dipandang tidak sibuk mengecek status akun.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FiezelSyncPlan = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'fiezel-sync-plan-v1';
  // Batas ronde yang menggantung. Lebih longgar daripada timeout jaringan mana pun yang dipakai
  // klien (8 detik untuk jalur CF), jadi ia hanya menangkap yang benar-benar tidak akan kembali.
  var STUCK_MS = 45000;
  // Rem menanjak: satu ronde dilewati per kegagalan beruntun, sampai 10. Server yang sakit
  // tidak dihujani sampai ia pulih — tetapi detaknya tidak pernah berhenti sama sekali.
  var BACKOFF_MAX = 10;

  function num(v) { var n = Number(v); return Number.isFinite(n) ? n : 0; }

  /**
   * plan(o) -> 'idle' | 'reset' | 'skip' | 'wait' | 'sync'
   * o = { mounted, syncing, syncingSince, hidden, ready, failStreak, tickIndex, now }
   * `ready` = akun/koneksi siap (guru: syncAvailable() === 'ok'; murid: ada kode kelas + online).
   */
  function plan(o) {
    if (!o || !o.mounted) return 'idle';
    if (o.syncing) return (num(o.now) - num(o.syncingSince)) > STUCK_MS ? 'reset' : 'skip';
    if (o.hidden) return 'skip';
    if (!o.ready) return 'wait';
    var streak = Math.max(0, Math.round(num(o.failStreak)));
    if (streak > 0 && Math.round(num(o.tickIndex)) % (Math.min(streak, BACKOFF_MAX) + 1) !== 0) return 'skip';
    return 'sync';
  }

  return { SCHEMA: SCHEMA, STUCK_MS: STUCK_MS, BACKOFF_MAX: BACKOFF_MAX, plan: plan };
});
