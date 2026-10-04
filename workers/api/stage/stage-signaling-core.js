/**
 * workers/api/stage/stage-signaling-core.js
 * Inti Logika Ruang Siaran dan Pertukaran Sinyal WebRTC (P2P Handshake).
 *
 * Mengelola:
 * 1. Pendaftaran ruang suara dengan ID 4 karakter unik (mis. FZ-8821).
 * 2. Antrean sinyal SDP Offer/Answer dan ICE Candidate antar-peer.
 * 3. Kehadiran (Presence) Host, Pembicara, dan Pendengar di panggung.
 * 4. Pembersihan otomatis ruang usang (TTL 30 menit).
 *
 * Bentuk ekspor ganda: ESM (`export`) dipakai Worker produksi, dan CJS
 * (`module.exports`) dipakai gerbang Node murni di repo ini. Keduanya menunjuk
 * objek yang SAMA, jadi tidak ada dua kebenaran.
 *
 * Catatan naskah: seluruh teks Indonesia di berkas ini sengaja TANPA tanda hubung.
 */

'use strict';

class StageSignalingCore {
  constructor(options = {}) {
    this.rooms = new Map();
    this.ROOM_TTL_MS = options.roomTtlMs || 30 * 60 * 1000; // 30 menit
    this.MAX_PEERS_PER_ROOM = options.maxPeers || 16;
    this.MAX_SPEAKERS = options.maxSpeakers || 3;
    /* Batas antrean sinyal per peer. Tanpa batas ini, klien yang mogok tanpa memanggil
       /api/stage/leave akan membuat antrean peer lain tumbuh tanpa henti sampai TTL 30
       menit habis. Sinyal terlama dibuang lebih dulu: handshake WebRTC selalu butuh
       sinyal TERBARU, bukan yang tertunda lama. */
    this.MAX_SIGNAL_QUEUE = options.maxSignalQueue || 50;
    this.now = typeof options.now === 'function' ? options.now : () => Date.now();
  }

  /** Dorong sinyal ke antrean peer dengan batas keras (buang yang tertua lebih dulu). */
  enqueueSignal(peer, item) {
    peer.signalQueue.push(item);
    while (peer.signalQueue.length > this.MAX_SIGNAL_QUEUE) {
      peer.signalQueue.shift();
    }
  }

  generateRoomId() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = 'FZ-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  generatePeerId(prefix = 'peer') {
    return `${prefix}_${this.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
  }

  cleanupExpiredRooms() {
    const now = this.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (now - room.lastActivityAt > this.ROOM_TTL_MS || room.peers.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  createRoom({ hostName = 'Host', title = 'Sarang Suara' } = {}) {
    this.cleanupExpiredRooms();

    let roomId = this.generateRoomId();
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomId();
    }

    const hostPeerId = this.generatePeerId('host');
    const now = this.now();

    const room = {
      roomId,
      title: String(title).slice(0, 40),
      createdAt: now,
      lastActivityAt: now,
      hostPeerId,
      state: {
        gameMode: 'sarang_tabu',
        currentCardId: 'TABOO-EN-001',
        score: 0,
        roundActive: false
      },
      peers: new Map([
        [hostPeerId, {
          peerId: hostPeerId,
          name: String(hostName).slice(0, 24),
          role: 'host',
          joinedAt: now,
          lastSeen: now,
          signalQueue: []
        }]
      ])
    };

    this.rooms.set(roomId, room);

    return {
      ok: true,
      roomId,
      peerId: hostPeerId,
      role: 'host',
      title: room.title
    };
  }

  joinRoom({ roomId, peerName = 'Teman', role = 'speaker' } = {}) {
    this.cleanupExpiredRooms();

    const cleanRoomId = String(roomId).toUpperCase().trim();
    const room = this.rooms.get(cleanRoomId);

    if (!room) {
      return { ok: false, error: 'room_not_found', message: 'Ruang siaran tidak ditemukan' };
    }

    if (room.peers.size >= this.MAX_PEERS_PER_ROOM) {
      return { ok: false, error: 'room_full', message: 'Ruang siaran sudah penuh' };
    }

    const speakerCount = Array.from(room.peers.values())
      .filter((p) => p.role === 'speaker' || p.role === 'host').length;
    const assignedRole =
      (role === 'speaker' && speakerCount <= this.MAX_SPEAKERS) ? 'speaker' : 'audience';
    const peerId = this.generatePeerId(assignedRole);
    const now = this.now();

    const newPeer = {
      peerId,
      name: String(peerName).slice(0, 24),
      role: assignedRole,
      joinedAt: now,
      lastSeen: now,
      signalQueue: []
    };

    // Beritahukan seluruh peer yang ada bahwa ada peer baru bergabung
    for (const [, peer] of room.peers.entries()) {
      this.enqueueSignal(peer, {
        type: 'peer_joined',
        peerId,
        name: newPeer.name,
        role: newPeer.role,
        timestamp: now
      });
    }

    room.peers.set(peerId, newPeer);
    room.lastActivityAt = now;

    // Kumpulkan daftar peer yang sedang ada di ruang
    const peerList = [];
    for (const [pId, p] of room.peers.entries()) {
      if (pId !== peerId) {
        peerList.push({ peerId: p.peerId, name: p.name, role: p.role });
      }
    }

    return {
      ok: true,
      roomId: cleanRoomId,
      peerId,
      role: assignedRole,
      title: room.title,
      hostPeerId: room.hostPeerId,
      state: room.state,
      peers: peerList
    };
  }

  sendSignal({ roomId, fromPeerId, toPeerId, signal } = {}) {
    const room = this.rooms.get(String(roomId).toUpperCase().trim());
    if (!room) return { ok: false, error: 'room_not_found' };

    const recipient = room.peers.get(toPeerId);
    if (!recipient) return { ok: false, error: 'peer_not_found' };

    this.enqueueSignal(recipient, {
      fromPeerId,
      signal,
      timestamp: this.now()
    });

    room.lastActivityAt = this.now();
    return { ok: true };
  }

  pollSignals({ roomId, peerId } = {}) {
    const room = this.rooms.get(String(roomId).toUpperCase().trim());
    if (!room) return { ok: false, error: 'room_not_found', signals: [] };

    const peer = room.peers.get(peerId);
    if (!peer) return { ok: false, error: 'peer_not_found', signals: [] };

    peer.lastSeen = this.now();
    room.lastActivityAt = this.now();

    const pending = peer.signalQueue.splice(0, peer.signalQueue.length);
    return {
      ok: true,
      signals: pending,
      roomState: room.state
    };
  }

  updateState({ roomId, fromPeerId, stateUpdate } = {}) {
    const room = this.rooms.get(String(roomId).toUpperCase().trim());
    if (!room) return { ok: false, error: 'room_not_found' };

    Object.assign(room.state, stateUpdate);
    room.lastActivityAt = this.now();

    // Siarkan pembaruan status ke seluruh peer lain
    const now = this.now();
    for (const [pId, peer] of room.peers.entries()) {
      if (pId !== fromPeerId) {
        this.enqueueSignal(peer, {
          type: 'state_updated',
          state: room.state,
          timestamp: now
        });
      }
    }

    return { ok: true, state: room.state };
  }

  leaveRoom({ roomId, peerId } = {}) {
    const cleanRoomId = String(roomId).toUpperCase().trim();
    const room = this.rooms.get(cleanRoomId);
    if (!room) return { ok: true };

    const leavingPeer = room.peers.get(peerId);
    if (!leavingPeer) return { ok: true };

    room.peers.delete(peerId);
    room.lastActivityAt = this.now();

    // Beritahukan peer lain
    const now = this.now();
    for (const [, peer] of room.peers.entries()) {
      this.enqueueSignal(peer, {
        type: 'peer_left',
        peerId,
        name: leavingPeer.name,
        timestamp: now
      });
    }

    // Pakai cleanRoomId supaya penghapusan ruang cocok dengan kunci Map yang sudah diatas-hurufkan
    if (room.peers.size === 0) {
      this.rooms.delete(cleanRoomId);
    }

    return { ok: true };
  }
}

/** Singleton untuk runtime instance (satu isolat Worker = satu peta ruang). */
export const stageSignalingCoreInstance = new StageSignalingCore();
export { StageSignalingCore };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    StageSignalingCore,
    stageSignalingCoreInstance
  };
}
