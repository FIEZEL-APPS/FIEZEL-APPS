/**
 * FIEZEL — fiezel-social-notify.js · KOTAK MASUK SOSIAL SISI KLIEN.
 *
 * Pola berkas: gems-core / fiezel-social.js — mandiri, tanpa import, gagal DIAM.
 *
 * ==========================================================================
 * KENAPA KOTAK MASUKNYA DI KLIEN, DAN KAPAN IA PINDAH KE SERVER
 * ==========================================================================
 * `workers/api/social/notify-core.js` sudah memuat kebijakan pusat notifikasi
 * server (§25) beserta gerbangnya (`tests/social-notify-test.js`) — TETAPI ia belum
 * punya rute, belum punya tabel, dan belum punya satu pun pemanggil. Sampai
 * OWNER menurunkan migrasi + kunci VAPID, TIDAK ADA push server yang bisa
 * dijanjikan, dan berpura-pura ada akan melahirkan fitur yang tidak pernah
 * berbunyi.
 *
 * Yang BISA dijanjikan hari ini, dengan endpoint yang sudah hidup
 * (`GET /api/social/friends`), adalah SELISIH: aplikasi menyimpan potret daftar
 * teman, lalu membandingkannya tiap kali ia dibuka. Teman baru = undanganmu
 * diterima. Sorakan bertambah = temanmu menyorakimu. Keduanya kabar nyata yang
 * sebelumnya HILANG sama sekali.
 *
 * Konsekuensi yang disadari: kabar baru muncul saat aplikasi dibuka atau kembali
 * terlihat, BUKAN saat layar terkunci. Itu batas jujur dari jalur tanpa push, dan
 * naskah di app.js tidak boleh menjanjikan lebih.
 *
 * ENUM `kind` SENGAJA SAMA PERSIS dengan NOTIFY_KIND di notify-core.js. Saat lane
 * server menyala, kotak masuk server tinggal menggantikan sumbernya — nol
 * penggantian nama, nol naskah yang perlu ditulis ulang.
 *
 * PRIVASI: yang disimpan hanya enum + handle pseudonim + hari. NOL teks bebas —
 * satu kolom pesan bebas akan menjadi saluran chat antar anak dalam satu rilis.
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ konstanta beku */

  // Cermin NOTIFY_KIND (workers/api/social/notify-core.js). Hanya tiga yang bisa
  // DIHITUNG dari selisih daftar teman; sisanya menunggu lane server.
  var KIND = Object.freeze({
    FRIEND_ACCEPTED: 'friend_accepted',
    CHEER_RECEIVED: 'cheer_received',
    FRIEND_MILESTONE: 'friend_milestone'
  });
  var KINDS = Object.freeze([KIND.FRIEND_ACCEPTED, KIND.CHEER_RECEIVED, KIND.FRIEND_MILESTONE]);

  var SNAPSHOT_KEY = 'fiezel-social-snapshot-v1';
  var INBOX_KEY = 'fiezel-social-inbox-v1';
  // Cermin NOTIFY_LIMITS server, dikecilkan ke ukuran yang wajar untuk satu perangkat.
  var INBOX_MAX = 40;
  var RETENTION_MS = 30 * 86400000;
  // Berapa banyak kabar yang boleh MENGANGKAT notifikasi sistem sekali muncul. Sisanya
  // tetap masuk kotak masuk. Sepuluh sorakan sekaligus adalah satu kabar, bukan sepuluh.
  var NOTIFY_BURST_MAX = 3;

  /* ------------------------------------------------------------------ util dasar */

  function storage() { try { return root.localStorage || null; } catch (_) { return null; } }
  function readJson(key, fallback) {
    try {
      var s = storage(); if (!s) return fallback;
      var raw = s.getItem(key); if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (_) { return fallback; }
  }
  function writeJson(key, value) {
    try { var s = storage(); if (!s) return false; s.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }
  function now(nowMs) { var t = Number(nowMs); return isFinite(t) && t > 0 ? t : Date.now(); }
  function handleOf(x) { return String((x && x.handle) || '').toLowerCase().slice(0, 20); }

  /* ------------------------------------------------------------------ potret */

  /**
   * Ringkas jawaban `GET /api/social/friends` menjadi potret sekecil mungkin:
   * daftar handle + jumlah sorakan per pengirim + milestone terakhir per teman.
   * Bentuk asing / field asing DIBUANG — potret ini dibaca lagi setelah pembaruan
   * aplikasi, jadi ia harus tahan terhadap perubahan bentuk respons.
   */
  function snapshotOf(data, nowMs) {
    var friends = (data && Array.isArray(data.friends)) ? data.friends : [];
    var cheersToday = (data && Array.isArray(data.cheersToday)) ? data.cheersToday : [];
    var handles = [], milestones = {}, cheers = {};
    for (var i = 0; i < friends.length; i += 1) {
      var h = handleOf(friends[i]);
      if (!h || handles.indexOf(h) >= 0) continue;
      handles.push(h);
      var list = friends[i] && Array.isArray(friends[i].milestones) ? friends[i].milestones : [];
      if (list.length && list[0] && typeof list[0].kind === 'string') milestones[h] = String(list[0].kind).slice(0, 40);
    }
    for (var j = 0; j < cheersToday.length; j += 1) {
      var ch = handleOf(cheersToday[j]);
      if (!ch) continue;
      var n = Math.max(0, Math.floor(Number(cheersToday[j].cnt) || 0));
      cheers[ch] = (cheers[ch] || 0) + n;
    }
    handles.sort();
    return { handles: handles, cheers: cheers, milestones: milestones, at: now(nowMs) };
  }

  /**
   * Selisih dua potret → daftar kabar. MURNI: tanpa storage, tanpa jam.
   *
   * Potret PERTAMA (prev null/kosong) sengaja menghasilkan NOL kabar: murid yang
   * baru memasang aplikasi tidak boleh disambut dua puluh notifikasi tentang teman
   * yang sudah lama ada.
   */
  function diff(prev, next) {
    var out = [];
    if (!next) return out;
    var before = prev && Array.isArray(prev.handles) ? prev.handles : null;
    if (!before) return out;                       // potret pertama = garis dasar, bukan kabar

    var seen = {};
    for (var i = 0; i < before.length; i += 1) seen[before[i]] = true;
    var handles = Array.isArray(next.handles) ? next.handles : [];
    for (var j = 0; j < handles.length; j += 1) {
      if (!seen[handles[j]]) out.push({ kind: KIND.FRIEND_ACCEPTED, handle: handles[j] });
    }

    var prevCheers = (prev && prev.cheers) || {};
    var nextCheers = (next && next.cheers) || {};
    for (var h in nextCheers) {
      if (!Object.prototype.hasOwnProperty.call(nextCheers, h)) continue;
      var gain = Math.max(0, Number(nextCheers[h] || 0) - Number(prevCheers[h] || 0));
      if (gain > 0) out.push({ kind: KIND.CHEER_RECEIVED, handle: h, count: gain });
    }

    var prevMs = (prev && prev.milestones) || {};
    var nextMs = (next && next.milestones) || {};
    for (var m in nextMs) {
      if (!Object.prototype.hasOwnProperty.call(nextMs, m)) continue;
      // Milestone hanya dilaporkan untuk teman yang SUDAH ada sebelumnya: teman baru
      // sudah punya kabarnya sendiri di atas, dan dua kabar untuk satu peristiwa
      // membuat kotak masuk terasa berisik.
      if (!seen[m]) continue;
      if (String(prevMs[m] || '') !== String(nextMs[m])) out.push({ kind: KIND.FRIEND_MILESTONE, handle: m, milestone: String(nextMs[m]) });
    }
    return out;
  }

  function readSnapshot() { var s = readJson(SNAPSHOT_KEY, null); return s && Array.isArray(s.handles) ? s : null; }
  function writeSnapshot(snapshot) { return snapshot ? writeJson(SNAPSHOT_KEY, snapshot) : false; }
  function resetSnapshot() { try { var s = storage(); if (s) s.removeItem(SNAPSHOT_KEY); return true; } catch (_) { return false; } }

  /* ------------------------------------------------------------------ kotak masuk */

  /** Buang yang lewat retensi lalu potong ke cap — pola pruneInbox notify-core. */
  function prune(items, nowMs) {
    var t = now(nowMs), out = [];
    for (var i = 0; i < (Array.isArray(items) ? items.length : 0); i += 1) {
      var it = items[i];
      if (!it || KINDS.indexOf(it.kind) < 0) continue;
      if (t - Number(it.at || 0) > RETENTION_MS) continue;
      out.push(it);
    }
    out.sort(function (a, b) { return Number(b.at || 0) - Number(a.at || 0); });
    return out.slice(0, INBOX_MAX);
  }

  /** Tambahkan kabar ke kotak masuk. Mengembalikan kabar yang BENAR-BENAR baru. */
  function push(events, nowMs) {
    var t = now(nowMs);
    var list = Array.isArray(events) ? events : [];
    var added = [];
    var box = prune(readJson(INBOX_KEY, []), t);
    for (var i = 0; i < list.length; i += 1) {
      var e = list[i];
      if (!e || KINDS.indexOf(e.kind) < 0) continue;
      var entry = { kind: e.kind, handle: handleOf(e), at: t, read: false };
      if (e.count != null) entry.count = Math.max(1, Math.floor(Number(e.count) || 1));
      if (e.milestone) entry.milestone = String(e.milestone).slice(0, 40);
      box.unshift(entry);
      added.push(entry);
    }
    if (!added.length) return [];
    writeJson(INBOX_KEY, prune(box, t));
    return added;
  }
  function inbox(nowMs) { return prune(readJson(INBOX_KEY, []), nowMs); }
  function unreadCount(nowMs) {
    var box = inbox(nowMs), n = 0;
    for (var i = 0; i < box.length; i += 1) if (!box[i].read) n += 1;
    return n;
  }
  function markAllRead(nowMs) {
    var box = inbox(nowMs);
    for (var i = 0; i < box.length; i += 1) box[i].read = true;
    return writeJson(INBOX_KEY, box);
  }
  function clearInbox() { try { var s = storage(); if (s) s.removeItem(INBOX_KEY); return true; } catch (_) { return false; } }

  /**
   * Kabar mana yang layak MENGANGKAT notifikasi sistem, dan berapa banyak.
   * Cermin PUSHABLE_KINDS server: milestone teman TIDAK mengangkat notifikasi —
   * kabar baik yang bisa menunggu, bukan gangguan layar kunci.
   */
  function notifiable(events) {
    var out = [];
    for (var i = 0; i < (Array.isArray(events) ? events.length : 0) && out.length < NOTIFY_BURST_MAX; i += 1) {
      var e = events[i];
      if (!e) continue;
      if (e.kind === KIND.FRIEND_ACCEPTED || e.kind === KIND.CHEER_RECEIVED) out.push(e);
    }
    return out;
  }

  /* ------------------------------------------------------------------ ekspor */

  root.FiezelSocialNotify = Object.freeze({
    KIND: KIND,
    KINDS: KINDS,
    INBOX_MAX: INBOX_MAX,
    NOTIFY_BURST_MAX: NOTIFY_BURST_MAX,
    snapshotOf: snapshotOf,
    diff: diff,
    readSnapshot: readSnapshot,
    writeSnapshot: writeSnapshot,
    resetSnapshot: resetSnapshot,
    push: push,
    inbox: inbox,
    prune: prune,
    unreadCount: unreadCount,
    markAllRead: markAllRead,
    clearInbox: clearInbox,
    notifiable: notifiable,
    _snapshotKey: SNAPSHOT_KEY,
    _inboxKey: INBOX_KEY
  });
})(typeof self !== 'undefined' ? self : this);
