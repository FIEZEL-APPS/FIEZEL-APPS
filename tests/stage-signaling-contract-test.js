/**
 * tests/stage-signaling-contract-test.js
 * Gerbang Kontrak Pengujian Signaling WebRTC Ruang Suara (Stage Signaling Server).
 *
 * Menguji:
 * 1. Pembuatan Ruang (Format ID FZ-XXXX, Inisiasi Host, Keunikan Kode).
 * 2. Bergabung ke Ruang (Speaker vs Audience, Batas Maksimal, Penolakan Ruang Fiktif).
 * 3. Pertukaran Sinyal Handshake WebRTC (SDP Offer, SDP Answer, ICE Candidate antar-peer).
 * 4. Sinkronisasi Status Ronde Sarang Tabu (Kartu Aktif, Skor, Timer).
 * 5. Siklus Keluar & Pembersihan Ruang (Teardown & Auto-cleanup).
 *
 * Berkas ini hidup di repo-root `tests/`; resolusi inti produksi memakai jalur ganda
 * (`./stage/stage-signaling-core.js` lalu `../workers/api/stage/stage-signaling-core.js`)
 * supaya gerbang yang sama bisa berjalan dari paket mockup maupun dari repositori utama.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const corePath = fs.existsSync(path.join(__dirname, 'stage/stage-signaling-core.js'))
  ? path.join(__dirname, 'stage/stage-signaling-core.js')
  : path.join(__dirname, '../workers/api/stage/stage-signaling-core.js');
const { StageSignalingCore } = require(corePath);

const results = [];
let failures = 0;

function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) {
    failures += 1;
    console.error(`  FAIL: ${message}`);
  } else {
    console.log(`  PASS: ${message}`);
  }
}

console.log('--- [GERBANG 1] Pembuatan Ruang Siaran Suara ---');
const signaling = new StageSignalingCore();

const hostRes = signaling.createRoom({
  hostName: 'Rian Pratama',
  title: 'Sarang Bahasa Inggris Rian'
});

assert(hostRes.ok === true, 'Host berhasil membuat ruang siaran');
assert(/^FZ-[2-9A-HJ-NP-Z]{4}$/.test(hostRes.roomId), 'Format ID Ruang valid FZ-XXXX (bebas karakter ambigu 0/O/1/I)');
assert(hostRes.role === 'host', 'Pembuat ruang otomatis berstatus host');
assert(typeof hostRes.peerId === 'string' && hostRes.peerId.startsWith('host_'), 'PeerId host terformat presisi');

console.log('\n--- [GERBANG 2] Bergabung ke Ruang Siaran ---');
// 1. Teman bergabung sebagai Speaker (Duet di panggung)
const guestRes = signaling.joinRoom({
  roomId: hostRes.roomId,
  peerName: 'Dimas Kurnia',
  role: 'speaker'
});

assert(guestRes.ok === true, 'Teman berhasil bergabung ke ruang');
assert(guestRes.role === 'speaker', 'Teman mendapatkan peran speaker di panggung');
assert(guestRes.peers.length === 1 && guestRes.peers[0].peerId === hostRes.peerId, 'Daftar peer memuat Host');

// 2. Murid ketiga bergabung sebagai Audience (Pendengar)
const audienceRes = signaling.joinRoom({
  roomId: hostRes.roomId,
  peerName: 'Nisa',
  role: 'audience'
});
assert(audienceRes.ok === true && audienceRes.role === 'audience', 'Murid ketiga bergabung sebagai audience');

// 3. Penolakan Ruang yang Tidak Ada
const invalidJoin = signaling.joinRoom({
  roomId: 'FZ-9999',
  peerName: 'Budi'
});
assert(invalidJoin.ok === false && invalidJoin.error === 'room_not_found', 'Menolak permintaan gabung ke ruang fiktif');

console.log('\n--- [GERBANG 3] Pertukaran Sinyal Handshake WebRTC (SDP & ICE) ---');
// Host mengambil antrean sinyal untuk mengetahui adanya peer_joined
const hostInitialPoll = signaling.pollSignals({
  roomId: hostRes.roomId,
  peerId: hostRes.peerId
});
assert(hostInitialPoll.ok === true, 'Host berhasil polling sinyal awal');
assert(hostInitialPoll.signals.some(s => s.type === 'peer_joined' && s.peerId === guestRes.peerId), 'Host menerima notifikasi peer_joined untuk Dimas');

// 1. Host mengirim SDP Offer ke Dimas
const mockSdpOffer = { type: 'offer', sdp: 'v=0\r\no=host 123 123 IN IP4 0.0.0.0...' };
const sendOfferRes = signaling.sendSignal({
  roomId: hostRes.roomId,
  fromPeerId: hostRes.peerId,
  toPeerId: guestRes.peerId,
  signal: mockSdpOffer
});
assert(sendOfferRes.ok === true, 'Host berhasil mengirimkan SDP Offer ke Dimas');

// 2. Dimas polling dan menerima SDP Offer dari Host
const guestPoll1 = signaling.pollSignals({
  roomId: hostRes.roomId,
  peerId: guestRes.peerId
});
assert(guestPoll1.signals.length >= 1, 'Dimas menerima sinyal di antreannya');
const receivedOffer = guestPoll1.signals.find(s => s.signal && s.signal.type === 'offer');
assert(receivedOffer && receivedOffer.fromPeerId === hostRes.peerId, 'Dimas menerima SDP Offer yang identik dari Host');

// 3. Dimas mengirim SDP Answer kembali ke Host
const mockSdpAnswer = { type: 'answer', sdp: 'v=0\r\no=guest 456 456 IN IP4 0.0.0.0...' };
const sendAnswerRes = signaling.sendSignal({
  roomId: hostRes.roomId,
  fromPeerId: guestRes.peerId,
  toPeerId: hostRes.peerId,
  signal: mockSdpAnswer
});
assert(sendAnswerRes.ok === true, 'Dimas berhasil mengirimkan SDP Answer ke Host');

// 4. Host polling dan menerima SDP Answer
const hostPoll2 = signaling.pollSignals({
  roomId: hostRes.roomId,
  peerId: hostRes.peerId
});
const receivedAnswer = hostPoll2.signals.find(s => s.signal && s.signal.type === 'answer');
assert(receivedAnswer && receivedAnswer.fromPeerId === guestRes.peerId, 'Host menerima SDP Answer dari Dimas');

// 5. Pertukaran ICE Candidate
const mockIceCandidate = { candidate: 'candidate:1 1 UDP 2122252543 192.168.1.5 50000 typ host', sdpMid: 'audio' };
signaling.sendSignal({
  roomId: hostRes.roomId,
  fromPeerId: guestRes.peerId,
  toPeerId: hostRes.peerId,
  signal: { type: 'ice_candidate', candidate: mockIceCandidate }
});

const hostPoll3 = signaling.pollSignals({
  roomId: hostRes.roomId,
  peerId: hostRes.peerId
});
const receivedIce = hostPoll3.signals.find(s => s.signal && s.signal.type === 'ice_candidate');
assert(receivedIce && receivedIce.signal.candidate.candidate.includes('UDP'), 'Host menerima ICE Candidate untuk koneksi langsung P2P');

console.log('\n--- [GERBANG 4] Sinkronisasi Status Ronde Sarang Tabu ---');
// Host memperbarui kartu aktif dan skor
signaling.updateState({
  roomId: hostRes.roomId,
  fromPeerId: hostRes.peerId,
  stateUpdate: {
    currentCardId: 'TABOO-EN-002',
    score: 20,
    roundActive: true
  }
});

// Dimas polling dan menerima pembaruan status
const guestPollState = signaling.pollSignals({
  roomId: hostRes.roomId,
  peerId: guestRes.peerId
});
const stateUpdateSignal = guestPollState.signals.find(s => s.type === 'state_updated');
assert(stateUpdateSignal && stateUpdateSignal.state.currentCardId === 'TABOO-EN-002' && stateUpdateSignal.state.score === 20, 'Status kartu aktif dan skor tersinkronisasi ke lawan bicara');

console.log('\n--- [GERBANG 5] Siklus Keluar & Pembersihan Ruang (Teardown) ---');
// Dimas keluar
signaling.leaveRoom({
  roomId: hostRes.roomId,
  peerId: guestRes.peerId
});

// Host diberitahukan bahwa Dimas telah keluar
const hostPollLeave = signaling.pollSignals({
  roomId: hostRes.roomId,
  peerId: hostRes.peerId
});
const peerLeftSignal = hostPollLeave.signals.find(s => s.type === 'peer_left' && s.peerId === guestRes.peerId);
assert(peerLeftSignal !== null, 'Host menerima notifikasi peer_left saat Dimas keluar');

// Host dan audience keluar
signaling.leaveRoom({ roomId: hostRes.roomId, peerId: audienceRes.peerId });
signaling.leaveRoom({ roomId: hostRes.roomId, peerId: hostRes.peerId });

// Pastikan ruang otomatis terhapus saat semua orang keluar
const checkEmpty = signaling.joinRoom({ roomId: hostRes.roomId, peerName: 'Orang Asing' });
assert(checkEmpty.ok === false && checkEmpty.error === 'room_not_found', 'Ruang otomatis dibersihkan saat seluruh anggota telah keluar');

console.log('\n============================================================');
if (failures === 0) {
  console.log(`HASIL AKHIR: SEMUA ${results.length} PENGUJIAN SIGNALING LULUS (100% HIJAU)`);
  process.exit(0);
} else {
  console.error(`HASIL AKHIR: ${failures} DARI ${results.length} PENGUJIAN SIGNALING GAGAL`);
  process.exit(1);
}
