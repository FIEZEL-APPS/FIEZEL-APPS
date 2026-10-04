/**
 * features/speaking-listening/fiezel-webrtc-stage.js
 * Modul Klien WebRTC Audio P2P Panggung Suara Fiezel (transport dua arah).
 *
 * Menghubungkan 2 hingga 4 perangkat peramban secara langsung:
 * 1. Mengambil audio mikrofon lokal (Echo Cancellation + Noise Suppression).
 * 2. Menegosiasikan koneksi WebRTC P2P (SDP Offer/Answer & ICE Candidate lewat signaling).
 * 3. Memutar audio rekan (remote stream) secara otomatis melalui elemen audio.
 * 4. Mendeteksi level energi volume suara untuk animasi denyut avatar berbicara.
 * 5. Mendukung signaling dual mode: HTTP (Cloudflare Worker lewat coreWorkerExec) dan
 *    BroadcastChannel (antar tab tanpa server, untuk mode lokal/mockup).
 *
 * Pola berkas: modul mandiri TANPA import, TANPA menyentuh state belajar app.js.
 * Seluruh pemanggil membaca `self.FiezelWebRtcStage` di belakang try/catch; modul absen
 * berarti fitur diam, bukan aplikasi yang gagal.
 *
 * Transport signaling memakai `coreWorkerExec` milik app.js bila ada (satu pintu transport
 * yang sama dengan fitur lain, termasuk kill switch-nya). Bila tidak ada (halaman mockup
 * tanpa app.js), ia jatuh ke `fetch` langsung ke `FIEZEL_CF_CONFIG.base`. Jalur
 * `/api/stage/*` sengaja TIDAK dipetakan di `CF_ENDPOINT_ROUTES` app.js, jadi
 * `coreWorkerExec` merutekannya lewat jalur Cloudflare yang sama tanpa menambah kunci
 * endpoint baru (kontrak tujuh kunci beku tetap utuh).
 *
 * Catatan naskah: seluruh teks Indonesia di berkas ini sengaja TANPA tanda hubung.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.FiezelWebRtcStage = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function (root) {
  'use strict';
  root = root || (typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));

  // Pembungkus i18n dengan cadangan kata (pola fiezel-class-hub.js): kalimat aslinya
  // berbahasa Indonesia dan menjadi cadangan; kuncinya tetap didaftarkan di copy-map
  // supaya murid Thai punya jalurnya.
  function t(k, fb, params) {
    var s;
    try {
      var I = (typeof self !== 'undefined' ? self : this).FiezelI18n;
      s = I && I.t ? I.t(k, params) : undefined;
    } catch (_) { s = undefined; }
    if (s === undefined || s === k) s = fb == null ? k : fb;
    if (params) s = String(s).replace(/\{(\w+)\}/g, function (m, n) {
      return Object.prototype.hasOwnProperty.call(params, n) ? String(params[n]) : m;
    });
    return s;
  }

  var DEFAULT_RTC_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  var CFG_TTL_MS = 300000; // cermin flag panggung 5 menit, pola kill switch
  var INVITE_ORIGIN = 'https://fiezel.my.id/app/';
  /* Alfabet kode ruang BEBAS karakter ambigu (0/O/1/I/L), sama persis dengan
     `generateRoomId()` di stage-signaling-core.js DAN `ROOM_ID_PATTERN` di route-stage.js.
     Dipakai juga oleh fallback lokal supaya kode ruang yang dibagikan lewat WhatsApp tetap
     bisa dibaca ulang `parseStageParam()` di perangkat teman. */
  var ROOM_ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

  function baseUrl() {
    try {
      var r = root || (typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
      var cfg = (r && r.FIEZEL_CF_CONFIG) || {};
      return String(cfg.base || '').trim().replace(/\/$/, '');
    } catch (_) { return ''; }
  }

  function online() {
    try {
      var r = root || (typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
      return !(r && r.navigator && r.navigator.onLine === false);
    } catch (_) { return true; }
  }

  /** Transport signaling tunggal. Memakai coreWorkerExec app.js bila tersedia. */
  async function transport(path, options) {
    var opts = options || {};
    var r = root || (typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
    if (r && typeof r.coreWorkerExec === 'function') {
      try {
        var viaCore = await r.coreWorkerExec(path, opts);
        if (viaCore) return viaCore;
      } catch (_) { /* jatuh ke fetch langsung */ }
    }
    var base = baseUrl();
    if (!base) throw new Error('stage_base_missing');
    return await fetch(base + String(path), Object.assign(
      { credentials: 'include', mode: 'cors', cache: 'no-store' }, opts
    ));
  }

  // ---------------------------------------------------------------- flag panggung
  // Status: 'on' | 'off' | 'offline' | 'unknown'. `cfStageEnabled` TIDAK ikut daftar enam
  // flag kill switch app.js (daftar itu tertutup dan diuji gerbang), jadi modul ini membaca
  // /api/config sendiri — sekali per 5 menit, di luar jalur boot, tanpa cookie.
  var flagState = { status: 'unknown', at: 0 };
  function flagFresh() { return flagState.at > 0 && (Date.now() - flagState.at) < CFG_TTL_MS; }
  function stageFlag() { return flagState.status; }
  async function probeFlag(force) {
    if (!force && flagFresh()) return flagState.status;
    if (!online()) { flagState = { status: 'offline', at: Date.now() }; return 'offline'; }
    var base = baseUrl();
    if (!base) { flagState = { status: 'off', at: Date.now() }; return 'off'; }
    try {
      var r = await fetch(base + '/api/config', { method: 'GET', cache: 'no-store', mode: 'cors', credentials: 'omit' });
      if (!r || !r.ok) { flagState = { status: 'off', at: Date.now() }; return 'off'; }
      var data = await r.json();
      // Hanya `=== true` yang berarti hidup — flag absen/ambigu = mati (fail-closed).
      var on = data && data.flags && data.flags.cfStageEnabled === true;
      flagState = { status: on ? 'on' : 'off', at: Date.now() };
      return flagState.status;
    } catch (_) {
      flagState = { status: online() ? 'off' : 'offline', at: Date.now() };
      return flagState.status;
    }
  }

  // ---------------------------------------------------------------- identitas anon
  var anonReady = false;
  /** POST /api/auth/anon sekali per sesi — menerbitkan cookie fz_id bila belum ada. */
  async function ensureAnon() {
    if (anonReady) return true;
    var base = baseUrl();
    if (!base) return false;
    try {
      var r = await transport('/api/auth/anon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      });
      anonReady = !!(r && (r.ok || r.status === 409));
      return anonReady;
    } catch (_) { return false; }
  }

  // ---------------------------------------------------------------- URL undangan
  /** URL undangan WhatsApp: https://fiezel.my.id/app/?stage=FZ-XXXX */
  function buildInviteUrl(roomId, text) {
    var url = INVITE_ORIGIN + '?stage=' + encodeURIComponent(String(roomId || ''));
    if (text) return 'https://wa.me/?text=' + encodeURIComponent(String(text) + ' ' + url);
    return url;
  }
  /** Kode ruang lokal 4 karakter dari alfabet bebas ambigu (cermin generateRoomId()). */
  function localRoomCode() {
    var code = '';
    for (var i = 0; i < 4; i++) {
      code += ROOM_ID_ALPHABET.charAt(Math.floor(Math.random() * ROOM_ID_ALPHABET.length));
    }
    return 'FZ-' + code;
  }
  /** PeerId lokal acak berbasis alfabet yang sama, tanpa tanda hubung agar aman di URL. */
  function localPeerId(prefix) {
    var code = '';
    for (var i = 0; i < 6; i++) {
      code += ROOM_ID_ALPHABET.charAt(Math.floor(Math.random() * ROOM_ID_ALPHABET.length));
    }
    return String(prefix || 'peer') + '_' + code;
  }
  /** Membaca parameter ?stage=FZ-XXXX dari string/URLSearchParams. Mengembalikan null bila tidak ada. */
  function parseStageParam(search) {
    try {
      var params = (search instanceof URLSearchParams)
        ? search
        : new URLSearchParams(String(search || ''));
      var raw = params.get('stage');
      if (!raw) return null;
      var id = String(raw).toUpperCase().trim();
      return /^FZ-[2-9A-HJ-NP-Z]{4}$/.test(id) ? id : null;
    } catch (_) { return null; }
  }

  function createAudioMeter(stream, onLevel) {
    if (typeof window === 'undefined') return { stop: function () {} };
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx || !stream) return { stop: function () {} };
    var ctx = null;
    var animId = null;
    try {
      ctx = new AudioCtx();
      var source = ctx.createMediaStreamSource(stream);
      var analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.35;
      source.connect(analyser);
      var data = new Uint8Array(analyser.frequencyBinCount);

      var check = function () {
        analyser.getByteFrequencyData(data);
        var sum = 0;
        for (var i = 0; i < data.length; i++) sum += data[i];
        var avg = sum / data.length;
        var normalized = Math.min(1, Math.max(0, avg / 45));
        onLevel(normalized);
        animId = requestAnimationFrame(check);
      };
      check();
    } catch (e) {
      console.warn('AudioMeter notice:', e);
    }

    return {
      stop: function () {
        if (animId) cancelAnimationFrame(animId);
        if (ctx && ctx.state !== 'closed') ctx.close().catch(function () {});
      }
    };
  }

  class WebRtcStageClient {
    constructor(options) {
      options = options || {};
      this.mode = options.mode || 'auto'; // 'auto' | 'http' | 'channel'
      this.roomId = null;
      this.peerId = null;
      this.peerName = options.peerName || 'User';
      this.role = null; // 'host' | 'speaker' | 'audience'
      this.localStream = null;
      this.isMuted = false;

      this.peerConnections = new Map(); // peerId -> RTCPeerConnection
      this.remoteAudioElements = new Map(); // peerId -> HTMLAudioElement
      this.meters = new Map(); // peerId -> meter instance

      this.broadcastChannel = null;
      this.pollInterval = null;
      this.pollActive = false;

      this.listeners = {
        connected: [],
        peerJoined: [],
        peerLeft: [],
        audioTrackAdded: [],
        connectionStateChange: [],
        error: []
      };
    }

    on(event, callback) {
      if (this.listeners[event]) this.listeners[event].push(callback);
    }

    emit(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(function (fn) { fn(data); });
      }
    }

    // --- 1. Akses Mikrofon Lokal ---
    async initLocalAudio() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        throw new Error('WebRTC/MediaDevices tidak didukung di lingkungan ini');
      }
      if (this.localStream) return this.localStream;

      // Echo cancellation WAJIB: tanpa ini suara lawan bicara yang keluar dari speaker
      // akan masuk lagi ke mikrofon dan menjadi lingkar umpan balik.
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      return this.localStream;
    }

    setMuted(muted) {
      this.isMuted = !!muted;
      if (this.localStream) {
        // `this` hilang di dalam `function` biasa; nilai dibaca dari variabel lokal supaya
        // tombol lawan bicara benar-benar mematikan trek, bukan membalik nilai `undefined`.
        var mutedNow = this.isMuted;
        this.localStream.getAudioTracks().forEach(function (track) {
          track.enabled = !mutedNow;
        });
      }
    }

    // --- 2. Pembuatan & Bergabung ke Ruang Siaran ---
    async createRoom(opts) {
      opts = opts || {};
      var hostName = opts.hostName || 'Host';
      var title = opts.title || t('stage.default-room-title', 'Sarang Suara');
      this.peerName = hostName;
      var data = null;

      if (this.mode !== 'channel') {
        var flag = await probeFlag();
        if (flag === 'off') {
          return { ok: false, error: 'stage_disabled' };
        }
        if (flag !== 'offline') {
          try {
            await ensureAnon();
            var resp = await transport('/api/stage/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ hostName: hostName, title: title })
            });
            var body = await resp.json().catch(function () { return null; });
            if (resp.ok && body && body.ok) data = body;
            else if (body && body.error && body.error !== 'unauthenticated') return { ok: false, error: String(body.error), status: resp.status };
          } catch (e) {
            console.info('Server HTTP tidak terjangkau, memakai BroadcastChannel lokal:', e.message);
          }
        }
      }

      if (!data) {
        // Fallback generator lokal tanpa server (mode tab ganda / mockup).
        var randCode = localRoomCode();
        data = {
          ok: true,
          roomId: randCode,
          peerId: localPeerId('host'),
          role: 'host',
          local: true
        };
        this.initBroadcastChannel(data.roomId);
      }

      this.roomId = data.roomId;
      this.peerId = data.peerId;
      this.role = 'host';
      // Ruang lokal (BroadcastChannel tab ganda / mockup) TIDAK punya catatan di server,
      // jadi leave() harus melewatkan /api/stage/leave supaya tidak memicu 404/400 palsu.
      this.localRoom = !!data.local;

      await this.initLocalAudio().catch(function (e) { console.warn('Izin mic tertunda:', e); });
      this.startSignalPolling();

      return data;
    }

    async joinRoom(opts) {
      opts = opts || {};
      var roomId = opts.roomId;
      var peerName = opts.peerName || 'Teman';
      var role = opts.role || 'speaker';
      this.peerName = peerName;
      var data = null;

      if (this.mode !== 'channel') {
        var flag = await probeFlag();
        if (flag === 'off') {
          return { ok: false, error: 'stage_disabled' };
        }
        if (flag !== 'offline') {
          try {
            await ensureAnon();
            var resp = await transport('/api/stage/join', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ roomId: roomId, peerName: peerName, role: role })
            });
            var body = await resp.json().catch(function () { return null; });
            if (resp.ok && body && body.ok) data = body;
            else if (body && body.error && body.error !== 'unauthenticated') return { ok: false, error: String(body.error), status: resp.status };
          } catch (e) {
            console.info('Server HTTP tidak terjangkau, memakai BroadcastChannel lokal:', e.message);
          }
        }
      }

      if (!data) {
        data = {
          ok: true,
          roomId: roomId,
          peerId: localPeerId('peer'),
          role: role,
          peers: [],
          local: true
        };
        this.initBroadcastChannel(roomId);
        // idem createRoom(): ruang lokal tidak terdaftar di server -> leave() senyap.
        this.localRoom = true;
        if (this.broadcastChannel) {
          this.broadcastChannel.postMessage({
            type: 'peer_joined',
            peerId: data.peerId,
            name: peerName,
            role: role
          });
        }
      }

      this.roomId = data.roomId;
      this.peerId = data.peerId;
      this.role = data.role;
      // idem createRoom(): ruang lokal tidak terdaftar di server -> leave() senyap.
      this.localRoom = !!data.local;

      if (this.role === 'speaker' || this.role === 'host') {
        await this.initLocalAudio().catch(function (e) { console.warn('Izin mic tertunda:', e); });
      }

      this.startSignalPolling();

      if (Array.isArray(data.peers)) {
        for (var i = 0; i < data.peers.length; i++) {
          var remotePeer = data.peers[i];
          if (remotePeer.role === 'host' || remotePeer.role === 'speaker') {
            this.initPeerConnection(remotePeer.peerId, false);
          }
        }
      }

      return data;
    }

    // --- BroadcastChannel Local Inter-Tab Sync ---
    initBroadcastChannel(roomId) {
      if (typeof window === 'undefined' || !window.BroadcastChannel) return;
      if (this.broadcastChannel) return;

      var self = this;
      this.broadcastChannel = new BroadcastChannel('fz-stage-' + roomId);
      this.broadcastChannel.onmessage = function (event) {
        var item = event.data;
        if (!item) return;
        // Jangan proses pesan dari diri sendiri
        if (item.fromPeerId === self.peerId || item.peerId === self.peerId) return;
        // Jika pesan ditujukan untuk peer tertentu dan bukan kita, abaikan
        if (item.toPeerId && item.toPeerId !== self.peerId) return;
        self.handleIncomingSignal(item);
      };
    }

    // --- 3. Manajemen RTCPeerConnection ---
    initPeerConnection(remotePeerId, isInitiator) {
      if (this.peerConnections.has(remotePeerId)) {
        return this.peerConnections.get(remotePeerId);
      }

      var self = this;
      var pc = new RTCPeerConnection(DEFAULT_RTC_CONFIG);
      this.peerConnections.set(remotePeerId, pc);

      if (this.localStream) {
        this.localStream.getTracks().forEach(function (track) {
          pc.addTrack(track, self.localStream);
        });
      }

      pc.onicecandidate = function (event) {
        if (event.candidate) {
          self.sendSignalToPeer(remotePeerId, { type: 'ice_candidate', candidate: event.candidate });
        }
      };

      pc.ontrack = function (event) {
        var remoteStream = event.streams[0] || new MediaStream([event.track]);
        self.playRemoteStream(remotePeerId, remoteStream);
        self.emit('audioTrackAdded', { peerId: remotePeerId, stream: remoteStream });
      };

      pc.onconnectionstatechange = function () {
        self.emit('connectionStateChange', { peerId: remotePeerId, state: pc.connectionState });
        if (pc.connectionState === 'connected') {
          self.emit('connected', { peerId: remotePeerId });
        }
      };

      if (isInitiator) {
        pc.createOffer({ offerToReceiveAudio: true })
          .then(function (offer) { return pc.setLocalDescription(offer); })
          .then(function () {
            self.sendSignalToPeer(remotePeerId, { type: 'offer', sdp: pc.localDescription });
          })
          .catch(function (err) { console.warn('Gagal membuat offer (akan dicoba lewat BroadcastChannel):', err); });
      }

      return pc;
    }

    playRemoteStream(remotePeerId, stream) {
      if (typeof document === 'undefined') return;
      var audioEl = this.remoteAudioElements.get(remotePeerId);
      if (!audioEl) {
        audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        audioEl.style.display = 'none';
        document.body.appendChild(audioEl);
        this.remoteAudioElements.set(remotePeerId, audioEl);
      }
      audioEl.srcObject = stream;
      audioEl.play().catch(function (e) { console.warn('Autoplay audio browser notice:', e); });
    }

    // --- 4. Signaling Handshake Loop ---
    async sendSignalToPeer(toPeerId, signal) {
      if (!this.roomId || !this.peerId) return;

      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          roomId: this.roomId,
          fromPeerId: this.peerId,
          toPeerId: toPeerId,
          signal: signal
        });
        return;
      }

      try {
        await transport('/api/stage/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: this.roomId,
            fromPeerId: this.peerId,
            toPeerId: toPeerId,
            signal: signal
          })
        });
      } catch (err) {
        console.warn('Gagal kirim sinyal:', err);
      }
    }

    /** Sinkronisasi status ronde ke peer lain lewat jalur yang sama dengan sinyal. */
    async sendStateUpdate(stateUpdate) {
      if (!this.roomId || !this.peerId) return;
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'state_updated',
          fromPeerId: this.peerId,
          state: stateUpdate
        });
        return;
      }
      try {
        await transport('/api/stage/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: this.roomId, fromPeerId: this.peerId, stateUpdate: stateUpdate })
        });
      } catch (err) {
        console.warn('Gagal kirim status:', err);
      }
    }

    startSignalPolling() {
      if (this.pollActive || this.broadcastChannel) return;
      var self = this;
      this.pollActive = true;

      var pollStep = async function () {
        if (!self.pollActive || !self.roomId || !self.peerId) return;
        try {
          var resp = await transport(
            '/api/stage/poll?roomId=' + encodeURIComponent(self.roomId) +
            '&peerId=' + encodeURIComponent(self.peerId),
            { method: 'GET' }
          );
          var data = await resp.json().catch(function () { return null; });
          if (data && data.ok && Array.isArray(data.signals)) {
            for (var i = 0; i < data.signals.length; i++) {
              await self.handleIncomingSignal(data.signals[i]);
            }
          }
        } catch (e) {
          // Gagal diam tanpa memutus koneksi suara P2P yang sudah aktif
        }
        if (self.pollActive) {
          self.pollInterval = setTimeout(pollStep, 800);
        }
      };

      pollStep();
    }

    async handleIncomingSignal(item) {
      if (!item) return;
      if (item.type === 'peer_joined') {
        this.emit('peerJoined', { peerId: item.peerId, name: item.name, role: item.role });
        // Jika kita host atau pembicara yang sudah ada, inisiasi koneksi ke peer baru
        if (this.role === 'host' || this.role === 'speaker') {
          this.initPeerConnection(item.peerId, true);
        }
        return;
      }
      if (item.type === 'peer_left') {
        this.cleanupPeer(item.peerId);
        this.emit('peerLeft', { peerId: item.peerId, name: item.name });
        return;
      }
      if (item.type === 'state_updated') {
        this.emit('connectionStateChange', { peerId: null, state: 'state_updated', roomState: item.state });
        return;
      }

      var fromPeerId = item.fromPeerId;
      var signal = item.signal;
      if (!fromPeerId || !signal) return;

      var pc = this.initPeerConnection(fromPeerId, false);

      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        var answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignalToPeer(fromPeerId, { type: 'answer', sdp: pc.localDescription });
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === 'ice_candidate') {
        if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate))
            .catch(function (e) { console.warn('ICE candidate notice:', e); });
        }
      }
    }

    cleanupPeer(peerId) {
      var pc = this.peerConnections.get(peerId);
      if (pc) {
        pc.close();
        this.peerConnections.delete(peerId);
      }
      var audioEl = this.remoteAudioElements.get(peerId);
      if (audioEl) {
        audioEl.srcObject = null;
        audioEl.remove();
        this.remoteAudioElements.delete(peerId);
      }
      var meter = this.meters.get(peerId);
      if (meter) {
        meter.stop();
        this.meters.delete(peerId);
      }
    }

    leave() {
      this.pollActive = false;
      if (this.pollInterval) {
        clearTimeout(this.pollInterval);
        this.pollInterval = null;
      }

      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'peer_left',
          peerId: this.peerId,
          name: this.peerName
        });
        this.broadcastChannel.close();
        this.broadcastChannel = null;
      }

      for (var peerId of this.peerConnections.keys()) {
        this.cleanupPeer(peerId);
      }

      if (this.localStream) {
        this.localStream.getTracks().forEach(function (track) { track.stop(); });
        this.localStream = null;
      }

      if (this.roomId && this.peerId && !this.localRoom) {
        var roomId = this.roomId;
        var peerIdSelf = this.peerId;
        transport('/api/stage/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: roomId, peerId: peerIdSelf })
        }).catch(function () {});
      }

      this.roomId = null;
      this.peerId = null;
    }
  }

  return {
    WebRtcStageClient: WebRtcStageClient,
    createAudioMeter: createAudioMeter,
    buildInviteUrl: buildInviteUrl,
    parseStageParam: parseStageParam,
    probeFlag: probeFlag,
    stageFlag: stageFlag,
    ensureAnon: ensureAnon
  };
});
