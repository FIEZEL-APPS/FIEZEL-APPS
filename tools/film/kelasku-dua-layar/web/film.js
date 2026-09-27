// FIEZEL · Film "Satu Kelas, Dua Layar" — naskah waktu, kamera, dan semua gerak.
//
// 72 dtk · 1080×1920 · 30 fps · 100 BPM (1 ketuk = 0,6 dtk = 18 frame, 1 bar = 2,4 dtk).
// TANPA caption. Semua penjelasan lewat VO (lihat VO di bawah + vo-gemini-kelasku.mjs);
// teks di layar hanya yang memang tercetak di panel produk, lalu logo di penutup.
//
// Setiap nilai dihitung MURNI dari t — frame mana pun bisa dirender ulang sendiri.

import * as THREE from 'three';
import { E, clamp, lerp, ramp, spring, press, drift, hash01, mix3, hex, cut, BAR, DURATION } from './lib.js';
import { buildWorld, Panel, gridPos, HUB, MONO_POS, WALL, slotPose, wallSlotOf, ARC_ANG } from './world.js';
import { SAPA_TEXT, UMUM_TEXT, JURNAL_TEXT, ORTU_LINES, GROUPS, CLASS_NAMES } from './ui.js';
import { BrandLayer } from './splash.js';

// ---------------------------------------------------------------------------------------------
// TIMELINE — titik-titik yang dikunci ke musik (events.mjs mengekspornya ke audio/events.json).
export const T = {
  // I · kait (bar 1–2) + monolit (bar 3)
  dimRaka: 1.2, dimYoga: 3.3, dimFajar: 3.6, whip: [4.85, 5.85], monoRise: [4.95, 6.0], dawn: [5.1, 7.0],
  // II · tersambung (bar 4–6)
  kodeIn: 7.2, kodeType: [7.35, 7.75], codeReveal: [7.8, 8.3], copy: 8.4, codeLift: 8.55, cutHigh: 8.9, chips: 8.95,
  cutNadia: 9.6, typeJoin: [9.9, 10.8], join: 11.05, joinSent: 11.25, joinReq: 11.3,
  cutJoin: 12.0, add: [12.55, 12.85, 13.15], cutWave: 13.35, wave: [13.4, 14.3],
  // III · kirim & pulang (bar 7–11)
  cutTugas: 14.4, mode: 15.2, send: 16.35, fold: [16.45, 16.8], cutCrane: 16.8, fly: 16.95,
  cutKerjakan: 19.2, start: 19.95, flip: [20.05, 20.45], pick: 20.85, why: 21.0,
  cutSelesai: 21.6, sent: 22.05, cutBack: 22.3, back: 22.35, hasilIn: 22.55,
  cutYoga: 24.0, away: [24.45, 25.25], cutFocus: 25.3, focus: 25.45, gap1: [26.25, 26.4],
  // IV · dasbor (bar 12–23)
  drop: 26.4, wallRise: [26.5, 27.4], cutRing: 27.7, kpi: [27.95, 28.6],
  sapa: 28.8, rise: [29.15, 29.8], rack: 30.3,
  kartu: 31.2, type: [31.3, 32.65], kirim: 32.9, cutRaka: 33.15, disapa: 33.45,
  heat: 33.6, heatFill: [33.7, 34.9], heatHl: 35.1,
  mis: 36.0, strike: [36.55, 36.9], fix: [37.0, 37.35],
  grp: 38.4, regroup: [38.5, 39.5], mentor: [39.4, 39.9],
  rem: 40.8, lanes: [40.9, 41.7], remPress: 41.9, par: [42.35, 42.95], home: [43.2, 44.1],
  ortu: 43.2, ortuType: [43.3, 44.75], ortuSend: 44.95, ortuFly: [45.1, 45.55],
  absen: 45.6, allHadir: 46.1, rekapIn: 46.75, export: 47.6,
  kur: 48.0, make: 49.2, fan: [49.3, 50.2],
  bc: 50.4, steps: [50.5, 51.6], approve: 52.0,
  umum: 52.8, umumType: [52.85, 53.35], umumSend: 53.5, cutMurid: 53.95, ann: 54.05, stamp: 54.6,
  waktu: 55.2, saved: [55.35, 56.5], jurnalIn: 55.95, jurnalType: [56.1, 57.1], golden: [55.4, 58.0],
  // V · puncak, implosi, merek (bar 25–30)
  climax: 57.6, implode: [60.35, 61.75], orb: [60.9, 61.75, 62.0], black: 62.05, splash: 62.4,
  lock: [64.7, 65.5], kk: [65.55, 66.35], cta: [66.35, 67.1], ctaPress: 69.2, end: 72.0,
};

// VO — 24 baris, satu berkas per baris. `at` = saat baris MULAI; `max` = jendela maksimum.
// `say` = ejaan untuk TTS bila berbeda dari teks tampilannya (dipakai vo-gemini-kelasku.mjs).
export const VO = [
  { id: '01', at: 0.30, text: 'Tiga puluh dua murid. Satu guru.', style: 'pelan, hangat, seperti membuka cerita' },
  { id: '02', at: 2.70, text: 'Siapa yang diam-diam tertinggal?', style: 'bertanya lirih, ikut peduli' },
  { id: '03', at: 5.00, text: 'KelasKu punya jawabannya.', say: 'Kelasku punya jawabannya.', style: 'yakin, hangat, sedikit tersenyum' },
  { id: '04', at: 7.40, text: 'Buat kelas, bagikan satu kode.', style: 'jelas, ringan' },
  { id: '05', at: 9.80, text: 'Murid mengetik kode, lalu Gabung.', style: 'jelas, ringan' },
  { id: '06', at: 12.20, text: 'Kamu yang menyetujui siapa masuk.', style: 'tenang, meyakinkan' },
  { id: '07', at: 14.60, text: 'Kirim tugas atau ujian mini. Sekali ketuk, sampai ke semua murid.', style: 'bersemangat tapi tenang' },
  { id: '08', at: 19.40, text: 'Murid mengerjakannya di KelasKu.', say: 'Murid mengerjakannya di Kelasku.', style: 'ringan' },
  { id: '09', at: 21.80, text: 'Hasilnya pulang sendiri.', style: 'puas, tersenyum' },
  { id: '10', at: 24.20, text: 'Saat ujian, pindah layar pun tercatat.', style: 'tegas, tenang' },
  { id: '11', at: 26.60, text: 'Tiap pagi, KelasKu memberi tahu siapa yang perlu disapa.', say: 'Tiap pagi, Kelasku memberi tahu siapa yang perlu disapa.', style: 'hangat, penuh perhatian' },
  { id: '12', at: 31.40, text: 'Pesannya sudah tertulis. Tinggal kirim.', style: 'ringan, tersenyum' },
  { id: '13', at: 33.80, text: 'Sekali lihat, tahu siapa butuh apa.', style: 'yakin' },
  { id: '14', at: 36.20, text: 'Bukan cuma nilai, tapi letak salahnya.', style: 'tegas, jelas' },
  { id: '15', at: 38.60, text: 'Kelompok belajar tersusun sendiri.', style: 'ringan' },
  { id: '16', at: 41.00, text: 'Remedial dan pengayaan, otomatis.', style: 'ringkas, mantap' },
  { id: '17', at: 43.40, text: 'Laporan orang tua, jadi sendiri.', style: 'ringan, tersenyum' },
  { id: '18', at: 45.80, text: 'Absensi dan rekap e-Rapor, beres.', say: 'Absensi dan rekap e-rapor, beres.', style: 'ringkas, lega' },
  { id: '19', at: 48.20, text: 'Kurikulum Merdeka, langsung jadi tugas.', style: 'yakin' },
  { id: '20', at: 50.60, text: 'Braincore menyarankan. Kamu yang memutuskan.', say: 'Brein-kor menyarankan. Kamu yang memutuskan.', style: 'tenang, menghormati guru' },
  { id: '21', at: 53.50, text: 'Murid pun melihat langkah belajarnya.', style: 'hangat' },
  { id: '22', at: 55.40, text: 'Dan waktumu kembali untuk mengajar.', style: 'hangat, lega, sedikit lebih pelan' },
  { id: '23', at: 57.80, text: 'Satu kelas. Dua layar. Terhubung.', style: 'mantap, pelan, penuh jeda di tiap titik' },
  { id: '24', at: 66.60, text: 'Buka Demo Guru di fiezel.my.id.', say: 'Buka Demo Guru, di fiezel titik my titik id.', style: 'ramah, jelas, mengajak' },
];
VO.forEach((v, i) => { v.max = +((i + 1 < VO.length ? VO[i + 1].at : 71.4) - v.at - 0.15).toFixed(2); });
VO[22].max = +(T.black - 0.12 - VO[22].at).toFixed(2);    // 'Terhubung.' wajib selesai sebelum hening implosi

// ---------------------------------------------------------------------------------------------
// KAMERA — segmen bersambung. Arah pandang diinterpolasi sebagai yaw/pitch (bukan titik),
// jadi putaran besar (mis. dari kelas ke monolit) berjalan mulus ke arah yang ditentukan.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SH = [];
function seg(t0, t1, a, b, o = {}) { SH.push({ t0, t1, a, b, e: o.e || E.inOut, turn: o.turn || 0, fd: o.fd, fdPanel: o.fdPanel, ap: o.ap ?? 0, name: o.name || '' }); }
// a/b: { p, l, mm }
seg(0, cut(T.whip[0]), { p: V(3.1, 2.55, -8.6), l: V(-0.2, 0.85, 0.6), mm: 38 }, { p: V(-1.2, 2.1, -7.4), l: V(-0.35, 0.95, 0.2), mm: 42 },
  { e: E.sineInOut, ap: 0.06, fd: (t) => lerp(6.2, 7.2, E.inOut(ramp(t, 1.0, 2.1))), name: 'SH01 kait' });
seg(cut(T.whip[0]), T.kodeIn, { p: V(0.8, 0.95, -5.0), l: V(0.05, 2.4, -8.6), mm: 26 }, { p: V(0.32, 2.2, -4.7), l: V(0.0, 2.25, -8.6), mm: 32 }, { e: E.inOut, ap: 0.012, name: 'SH02 monolit bangkit' });
seg(T.kodeIn, cut(T.cutHigh), { p: V(0.32, 2.2, -4.7), l: V(0.3, 2.06, -8.6), mm: 32 }, { p: V(0.2, 2.12, -4.9), l: V(0.2, 2.08, -8.6), mm: 32 }, { e: E.sineInOut, ap: 0.02, name: 'SH03 kode', fdPanel: 1.9 });
seg(cut(T.cutHigh), cut(T.cutNadia), { p: V(2.7, 4.3, -9.6), l: V(0, 1.6, -2.0), mm: 26 }, { p: V(2.3, 4.6, -9.9), l: V(0, 1.3, -1.4), mm: 26 }, { e: E.sineInOut, name: 'SH03b kode terbang' });
seg(cut(T.cutNadia), cut(T.cutJoin), { p: V(-1.3, 1.5, -2.25), l: V(-0.6, 1.75, -8.6), mm: 36 }, { p: V(-1.315, 1.505, -2.275), l: V(-0.6, 1.75, -8.6), mm: 36 }, { e: E.sineInOut, ap: 0.0042, name: 'SH04 Nadia gabung', fdPanel: 0.5 });
seg(cut(T.cutJoin), cut(T.cutWave), { p: V(-0.35, 2.05, -4.6), l: V(-0.2, 2.0, -8.6), mm: 30 }, { p: V(-0.1, 2.08, -4.8), l: V(-0.2, 2.0, -8.6), mm: 30 }, { e: E.sineInOut, ap: 0.02, name: 'SH05 persetujuan', fdPanel: 1.9 });
seg(cut(T.cutWave), cut(T.cutTugas), { p: V(4.2, 3.6, 5.6), l: V(-0.2, 1.1, -3.2), mm: 26 }, { p: V(3.6, 3.9, 6.2), l: V(-0.1, 1.2, -3.4), mm: 26 }, { e: E.sineInOut, name: 'SH05b tersambung' });
seg(cut(T.cutTugas), cut(T.cutCrane), { p: V(0.75, 2.15, -4.5), l: V(0.35, 2.05, -8.6), mm: 30 }, { p: V(0.5, 2.15, -4.7), l: V(0.35, 2.05, -8.6), mm: 30 }, { e: E.sineInOut, ap: 0.02, name: 'SH06 tugas', fdPanel: 2.0 });
seg(cut(T.cutCrane), cut(T.cutKerjakan), { p: V(1.8, 5.6, -7.9), l: V(0, 0.8, 0.2), mm: 28 }, { p: V(0.9, 3.2, -6.2), l: V(0, 0.95, 1.4), mm: 30 }, { e: E.inOut, name: 'SH07 kapsul' });
seg(cut(T.cutKerjakan), cut(T.cutSelesai), { p: V(-1.28, 1.5, -2.2), l: V(-0.5, 1.7, -8.6), mm: 38 }, { p: V(-1.295, 1.505, -2.225), l: V(-0.5, 1.7, -8.6), mm: 38 }, { e: E.sineInOut, ap: 0.0042, name: 'SH08 kerjakan', fdPanel: 0.5 });
seg(cut(T.cutSelesai), cut(T.cutBack), { p: V(-1.3, 1.52, -2.25), l: V(-0.7, 1.7, -8.6), mm: 38 }, { p: V(-1.32, 1.52, -2.32), l: V(-0.7, 1.7, -8.6), mm: 38 }, { e: E.sineInOut, ap: 0.0042, name: 'SH09 selesai', fdPanel: 0.5 });
seg(cut(T.cutBack), cut(T.cutYoga), { p: V(1.1, 2.7, -7.3), l: V(0, 1.0, 0.8), mm: 30 }, { p: V(0.7, 2.75, -7.0), l: V(0, 1.0, 0.8), mm: 30 }, { e: E.sineInOut, ap: 0.015, name: 'SH09b hasil pulang', fdPanel: 2.25 });
seg(cut(T.cutYoga), cut(T.cutFocus), { p: V(-0.42, 1.24, -6.25), l: V(-0.625, 1.03, -4.025), mm: 50 }, { p: V(-0.48, 1.2, -6.0), l: V(-0.625, 1.03, -4.025), mm: 50 }, { e: E.sineInOut, ap: 0.05, name: 'SH10 Yoga ujian' });
seg(cut(T.cutFocus), cut(T.drop), { p: V(0.4, 2.2, -6.6), l: V(-0.3, 1.2, 0.5), mm: 34 }, { p: V(0.3, 2.25, -6.3), l: V(-0.3, 1.2, 0.5), mm: 34 }, { e: E.sineInOut, ap: 0.02, name: 'SH10b keluar layar', fdPanel: 2.1 });
seg(cut(T.drop), 26.55, { p: V(-0.1, 2.58, -6.55), l: V(-0.25, 2.58, -8.6), mm: 35 }, { p: V(-0.1, 2.58, -6.4), l: V(-0.25, 2.58, -8.6), mm: 35 }, { e: E.sineInOut, name: 'SH11 nav' });
seg(26.55, cut(T.cutRing), { p: V(-0.1, 2.58, -6.4), l: V(-0.25, 2.58, -8.6), mm: 35 }, { p: V(0, 5.0, 1.4), l: V(0, 2.4, -7.2), mm: 26 }, { e: E.expoInOut, name: 'SH11 amfiteater' });
// Beat dasbor: kamera memandang slot panelnya; panel lepas dari dinding ke arah kamera.
const slotCam = (name, back, up, side, mm, drift = 0.25) => {
  const [r, c] = wallSlotOf(name); const s = slotPose(r, c);
  const rgt = new THREE.Vector3(1, 0, 0).applyQuaternion(s.q);
  const p = s.pos.clone().addScaledVector(s.normal, back).addScaledVector(rgt, side); p.y += up;
  const p2 = p.clone().addScaledVector(rgt, drift * 0.6).addScaledVector(s.normal, drift * 0.4);
  return [{ p, l: s.pos.clone(), mm }, { p: p2, l: s.pos.clone(), mm }];
};
{ const [a, b] = slotCam('ringkasan', 4.6, 0.35, 0.3, 35); seg(cut(T.cutRing), cut(T.sapa), a, b, { e: E.sineInOut, ap: 0.02, name: 'SH11b ringkasan', fdPanel: 2.3 }); }
seg(cut(T.sapa), cut(T.kartu), { p: V(1.0, 2.35, -7.0), l: V(-0.3, 0.95, 0.3), mm: 30 }, { p: V(0.8, 2.3, -6.6), l: V(-0.3, 0.95, 0.3), mm: 30 }, { e: E.sineInOut, ap: 0.03, name: 'SH12 disapa',
  fd: (t) => lerp(2.05, 6.9, E.inOut(ramp(t, T.rack, T.rack + 0.5))) });
{ const [a, b] = slotCam('kartusapa', 4.2, -0.6, -0.4, 35); seg(cut(T.kartu), cut(T.cutRaka), a, b, { e: E.sineInOut, ap: 0.02, name: 'SH13 kartu sapa', fdPanel: 2.3 }); }
seg(cut(T.cutRaka), cut(T.heat), { p: V(0.1, 1.9, -4.6), l: V(-0.62, 1.05, -0.575), mm: 40 }, { p: V(0.05, 1.88, -4.4), l: V(-0.62, 1.05, -0.575), mm: 40 }, { e: E.sineInOut, ap: 0.04, name: 'SH13b Raka disapa' });
{ const [a, b] = slotCam('heatmap', 4.4, 0.4, -0.9, 35, 0.9); seg(cut(T.heat), cut(T.mis), a, b, { e: E.sineInOut, ap: 0.02, name: 'SH14 peta panas', fdPanel: 2.5 }); }
{ const [a, b] = slotCam('miskonsepsi', 5.2, -0.5, 0.5, 60, 0.3); seg(cut(T.mis), cut(T.grp), a, b, { e: E.sineInOut, ap: 0.03, name: 'SH15 miskonsepsi', fdPanel: 3.9 }); }
seg(cut(T.grp), cut(T.rem), { p: V(0.0, 7.6, -6.2), l: V(0, 0.4, 0.8), mm: 26 }, { p: V(0.3, 7.9, -5.6), l: V(0, 0.4, 1.0), mm: 26 }, { e: E.sineInOut, name: 'SH16 kelompok' });
seg(cut(T.rem), cut(T.ortu), { p: V(0.4, 5.0, -7.2), l: V(0, 0.6, 0.5), mm: 28 }, { p: V(0.2, 5.2, -6.8), l: V(0, 0.6, 0.5), mm: 28 }, { e: E.sineInOut, name: 'SH17 remedial' });
{ const [a, b] = slotCam('ortu', 4.2, -0.9, 0.3, 38); seg(cut(T.ortu), cut(T.absen), a, b, { e: E.sineInOut, ap: 0.02, name: 'SH18 laporan ortu', fdPanel: 2.4 }); }
seg(cut(T.absen), cut(T.kur), { p: V(0.0, 2.0, -3.2), l: V(0, 1.9, -8.6), mm: 35 }, { p: V(0.15, 2.02, -3.45), l: V(0, 1.9, -8.6), mm: 35 }, { e: E.sineInOut, ap: 0.02, name: 'SH19 absensi & e-Rapor', fdPanel: 2.3 });
{ const [a, b] = slotCam('kurikulum', 4.4, -0.7, -0.3, 35); seg(cut(T.kur), cut(T.bc), a, b, { e: E.sineInOut, ap: 0.02, name: 'SH20 kurikulum', fdPanel: 2.5 }); }
{ const [a, b] = slotCam('braincore', 4.8, -0.6, -0.2, 35); seg(cut(T.bc), cut(T.umum), a, b, { e: E.sineInOut, ap: 0.02, name: 'SH21 braincore', fdPanel: 2.75 }); }
{ const [a, b] = slotCam('pengumuman', 4.2, -0.6, 0.3, 35); seg(cut(T.umum), cut(T.cutMurid), a, b, { e: E.sineInOut, ap: 0.02, name: 'SH22 pengumuman', fdPanel: 2.4 }); }
seg(cut(T.cutMurid), cut(T.waktu), { p: V(-1.28, 1.52, -2.2), l: V(-0.4, 1.8, -8.6), mm: 36 }, { p: V(-1.295, 1.525, -2.225), l: V(-0.4, 1.8, -8.6), mm: 36 }, { e: E.sineInOut, ap: 0.0042, name: 'SH22b murid', fdPanel: 0.5 });
seg(cut(T.waktu), cut(T.climax), { p: V(0.9, 1.3, -5.7), l: V(-0.3, 0.62, -8.6), mm: 45 }, { p: V(0.55, 1.45, -6.05), l: V(-0.3, 0.62, -8.6), mm: 45 }, { e: E.sineInOut, ap: 0.025, name: 'SH23 waktu kembali', fd: (t) => lerp(3.2, 2.2, E.inOut(ramp(t, 55.95, 56.4))) });
seg(cut(T.climax), T.implode[0], { p: V(0, 2.4, 3.4), l: V(0, 1.8, -5.0), mm: 26 }, { p: V(0, 11.5, 8.6), l: V(0, 0.8, -3.2), mm: 22 }, { e: E.inOut, name: 'SH24 terhubung' });
seg(T.implode[0], T.splash, { p: V(0, 11.5, 8.6), l: V(0, 0.8, -3.2), mm: 22 }, { p: V(0, 9.4, 5.9), l: V(0, 2.3, -4.2), mm: 24 }, { e: E.inOut, name: 'SH25 implosi' });
seg(T.splash, DURATION + 1, { p: V(0, 9.4, 5.9), l: V(0, 2.3, -4.2), mm: 24 }, { p: V(0, 9.4, 5.9), l: V(0, 2.3, -4.2), mm: 24 }, { name: 'MEREK' });
export const SHOTS = SH;

const yawPitch = (p, l) => { const d = new THREE.Vector3().subVectors(l, p); const dist = d.length(); d.normalize(); return { yaw: Math.atan2(d.x, d.z), pitch: Math.asin(clamp(d.y, -1, 1)), dist }; };
export function camAt(t) {
  let s = SH[SH.length - 1]; for (const q of SH) { if (t >= q.t0 && t < q.t1) { s = q; break; } }
  const k = s.e(ramp(t, s.t0, s.t1));
  const pos = s.a.p.clone().lerp(s.b.p, k);
  const A = yawPitch(s.a.p, s.a.l), B = yawPitch(s.b.p, s.b.l);
  let dy = B.yaw - A.yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
  if (s.turn && Math.sign(dy) !== s.turn) dy += s.turn * 2 * Math.PI;
  const yaw = A.yaw + dy * k, pitch = lerp(A.pitch, B.pitch, k), dist = lerp(A.dist, B.dist, k);
  const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const look = pos.clone().addScaledVector(dir, dist);
  const mm = lerp(s.a.mm, s.b.mm, k);
  // napas kamera: goyang sangat kecil, halus, bukan getar tangan
  pos.x += drift(t, 1.3, 0.012); pos.y += drift(t, 4.1, 0.008);
  return { pos, look, dir, mm, fov: THREE.MathUtils.radToDeg(2 * Math.atan(18 / mm)), focus: s.fd ? s.fd(t) : s.fdPanel || dist, fdPanel: !!s.fdPanel, ap: s.ap, roll: 0, name: s.name };
}

// Pose panel yang "dipresentasikan" di depan kamera pada waktu jangkar ta.
// D = jarak; F = lebar panel sebagai pecahan lebar frame; ox/oy dalam pecahan setengah-lebar/tinggi.
function presentPose(ta, D, F, ox = 0, oy = 0, rot = {}) {
  const c = camAt(ta);
  const f = c.dir.clone(), r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize(), u = new THREE.Vector3().crossVectors(r, f).normalize();
  const hw = D * 10.125 / c.mm, hh = D * 18 / c.mm;
  const pos = c.pos.clone().addScaledVector(f, D).addScaledVector(r, ox * hw).addScaledVector(u, oy * hh);
  const m = new THREE.Matrix4().lookAt(c.pos, pos, u);            // -z panel menghadap kamera → pakai basis kamera
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rot.pitch || 0, rot.yaw || 0, rot.roll || 0, 'YXZ')));
  return { pos, q, width: F * 2 * hw };
}
const lerpPose = (a, b, k) => ({ pos: a.pos.clone().lerp(b.pos, k), q: a.q.clone().slerp(b.q, k), width: lerp(a.width, b.width, k) });
function setPose(panel, p, extra = {}) {
  const g = panel.group; g.visible = true; g.position.copy(p.pos); g.quaternion.copy(p.q);
  const s = p.width / panel.w; g.scale.setScalar(Math.max(1e-4, s));
  if (extra.off) g.position.add(extra.off);
  if (extra.rot) g.quaternion.multiply(new THREE.Quaternion().setFromEuler(extra.rot));
}
// Pose di dinding amfiteater: dimuat pas ke kotak 1,5 × 2,0 m.
function wallPose(panel) {
  const [r, c] = wallSlotOf(panel.name); const s = slotPose(r, c);
  const width = Math.min(1.5, 2.0 * panel.w / panel.h);
  return { pos: s.pos.clone(), q: s.q.clone(), width };
}
// Masuk (pegas) / keluar (percepatan) dari arah tertentu, dalam ruang kamera.
function enterExit(t, tin, tout, dir = 'up', amt = 1, size = 1.5) {
  const cam = camAt(clamp(t, tin, tout ? tout - 0.01 : t));
  const f = cam.dir, r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize(), u = new THREE.Vector3().crossVectors(r, f).normalize();
  const kin = spring(t - tin, 12, 0.74), kout = tout ? E.cubicIn(ramp(t, tout - 0.32, tout)) : 0;
  const v = dir === 'up' ? u.clone().multiplyScalar(-1) : dir === 'left' ? r.clone().multiplyScalar(-1) : dir === 'right' ? r.clone() : dir === 'down' ? u.clone() : f.clone().multiplyScalar(-1);
  const off = v.multiplyScalar(((1 - kin) * 1.1 + kout * 1.2) * amt * size);
  const rot = new THREE.Euler((1 - kin) * (dir === 'up' ? 0.5 : 0) - kout * 0.2, (1 - kin) * (dir === 'left' ? -0.5 : dir === 'right' ? 0.5 : 0), 0, 'YXZ');
  return { off, rot, kin };
}

// ---------------------------------------------------------------------------------------------
const NAME_IDX = Object.fromEntries(CLASS_NAMES.map((n, i) => [n, i]));
const RAKA = NAME_IDX.Raka, YOGA = NAME_IDX.Yoga, FAJAR = NAME_IDX.Fajar, NADIA = NAME_IDX.Nadia;
const NOT_DONE = new Set([RAKA, FAJAR, NAME_IDX.Bima]);
const REMED = ['Rina', 'Bagas', 'Rizky', 'Fikri', 'Yoga', 'Raka', 'Fajar', 'Aldi', 'Galih'].map((n) => NAME_IDX[n]);
const ENRICH = ['Nadia', 'Putri', 'Sari', 'Ayu', 'Intan', 'Maya', 'Kirana'].map((n) => NAME_IDX[n]);
const SCORE = (i) => (NOT_DONE.has(i) ? null : [90, 80, 100, 70, 90, 50, 90, 60, 100, 60][i % 10]);
const PC = V(0, 2.4, -4.2);                      // titik implosi
const IVORY = hex('#FFF4DA'), GOLD = hex('#F0C241'), EMER = hex('#2FBF93'), AMB = hex('#E5A028'), BRICK = hex('#D2553B'), DIMC = hex('#8A7A5E');

// Jadwal kapsul: { i (benang), t0, dur, dir (+1 guru→murid / −1 murid→guru), em (emerald?) }
const FLIGHTS = [];
for (let i = 0; i < 32; i++) { const row = Math.floor(i / 4), col = i % 4; FLIGHTS.push({ i, t0: T.chips + row * 0.07 + col * 0.018, dur: 0.62, dir: 1, em: false, code: true }); }
FLIGHTS.push({ i: NADIA, t0: T.joinReq, dur: 0.95, dir: -1, em: true });
for (let i = 0; i < 32; i++) { const row = Math.floor(i / 4), col = i % 4; FLIGHTS.push({ i, t0: T.fly + row * 0.09 + col * 0.02, dur: 0.85, dir: 1, em: false }); }
for (let i = 0; i < 32; i++) { if (NOT_DONE.has(i)) continue; FLIGHTS.push({ i, t0: T.back + ((i * 7) % 32) * 0.036, dur: 0.8, dir: -1, em: true, result: true }); }
FLIGHTS.push({ i: RAKA, t0: T.kirim + 0.2, dur: 0.35, dir: 1, em: true });
for (let i = 0; i < 32; i++) { const row = Math.floor(i / 4); FLIGHTS.push({ i, t0: T.umumSend + 0.15 + row * 0.05, dur: 0.55, dir: 1, em: false }); }
const arrival = (i, pred) => { const f = FLIGHTS.find((x) => x.i === i && pred(x)); return f ? f.t0 + f.dur : Infinity; };
export const FLIGHT_LIST = FLIGHTS;

// Posisi slate per waktu (grid → sorotan → kelompok → jalur remedial → grid → implosi).
function groupPos(i) {
  const nm = CLASS_NAMES[i]; let g = 0, j = 0; GROUPS.forEach((grp, gi) => { const k = grp.indexOf(nm); if (k >= 0) { g = gi; j = k; } });
  const gx = (g % 2 === 0 ? -1.55 : 1.55), gz = (Math.floor(g / 2) - 1.5) * 2.05;
  return { p: V(gx + (j % 2 - 0.5) * 0.86, 1.02, gz + (Math.floor(j / 2) - 0.5) * 0.82), mentor: j === 0, g: g + 1 };
}
function lanePos(i) {
  const r = REMED.indexOf(i), e = ENRICH.indexOf(i);
  if (r >= 0) return { p: V(-2.9 - (r % 2) * 0.9, 1.02, -3.6 + Math.floor(r / 2) * 1.2), lane: 'rem' };
  if (e >= 0) return { p: V(2.9 + (e % 2) * 0.9, 1.02, -3.6 + Math.floor(e / 2) * 1.2), lane: 'enr' };
  const k = [...Array(32).keys()].filter((x) => !REMED.includes(x) && !ENRICH.includes(x)).indexOf(i);
  return { p: V((k % 4 - 1.5) * 0.95, 1.02, -1.4 + Math.floor(k / 4) * 1.0), lane: 'mid' };
}

// ---------------------------------------------------------------------------------------------
export class Film {
  constructor(renderer) {
    this.w = buildWorld(renderer); this.scene = this.w.scene; this.camera = this.w.camera;
    this.brand = new BrandLayer(); this.brandCanvas = this.brand.canvas;
    const W = this.w;
    this.hero = {};
    for (const n of ['kode', 'join', 'tugas', 'hasil', 'gabung', 'kerjakan', 'soal', 'selesai', 'muridhome']) this.hero[n] = W.panel(n);
    for (const row of WALL) for (const n of row) if (!this.hero[n]) this.hero[n] = W.panel(n);
    // chip kode (benda 3D kecil) & kartu soal mini
    this.chip = new Panel({ w: 300, h: 90, draw: (g) => { g.card(0, 0, 300, 90, 45, '#DDEFE7', null); g.t('FZ-7K3QPA', 150, 60, { w: 800, s: 38, c: '#166052', a: 'center', ls: 2 }); } }, 0.9, { name: 'chip', depth: 0.05, radius: 0.13, body: '#DDEFE7', glow: 0.6 });
    this.chip.draw({}); this.scene.add(this.chip.group);
    this.qcards = []; for (let n = 1; n <= 10; n++) { const q = new Panel('qmini', 0.5, { key: 'q' + n, depth: 0.02, radius: 0.04, glow: 0.35 }); q.name = 'qmini'; q.draw({ n }); this.scene.add(q.group); this.qcards.push(q); }
  }
  async init() {
    await Promise.all([400, 500, 600, 700, 800].map((w) => document.fonts.load(`${w} 24px "PJS"`)));
    await this.brand.init();
    // gambar ulang semua panel sekarang setelah font siap
    for (const s of this.w.slates) { s.panel.key = null; s.state({ mode: 'idle', v: 0.35 + 0.5 * hash01(s.i, 7) }); }
    this.w.monolith.key = null; this.w.monolith.draw({ active: 0, saved: 0 });
    this.chip.key = null; this.chip.draw({}); this.qcards.forEach((q, n) => { q.key = null; q.draw({ n: n + 1 }); });
  }
  sceneOff(t) { return t >= T.black; }
  samplesAt(t) {
    if (t >= T.black) return 1;
    if ((t >= 9.6 && t < 12.0) || (t >= 19.2 && t < 22.3) || (t >= 53.95 && t < 55.2)) return 8;   // DOF sangat dekat
    if (t < T.whip[0]) return 7;                          // DOF kait
    if (t >= T.whip[0] && t < T.whip[1] + 0.1) return 8;  // putaran cepat: motion blur panjang
    if (t >= 26.5 && t < 27.8) return 8;                  // tarik mundur amfiteater
    if (t >= 57.6) return 7;
    return 6;
  }

  grade(t) {
    const brand = t >= T.black ? 1 : 0;
    return { exposure: 1.0, bloom: t < T.dawn[1] ? 0.5 : t > T.golden[0] ? 0.42 : 0.3, vig: 0.17, grain: 0.022, brand, scene: 1 };
  }

  // ------------------------------------------------------------------------------------------
  applyTime(t) {
    const W = this.w, cam = camAt(t);
    // ===== cahaya & suasana: malam → fajar → hari → senja keemasan → gelap ================
    const dawn = E.inOut(ramp(t, T.dawn[0], T.dawn[1]));
    const gold = E.inOut(ramp(t, T.golden[0], T.golden[1]));
    const imp = E.cubicIn(ramp(t, T.implode[0], T.implode[1]));
    const day = dawn * (1 - E.inOut(ramp(t, 60.6, 61.9)));
    const bg = mix3(mix3(hex('#120C0F'), hex('#EFE6D7'), day), hex('#E9D4B6'), gold * day);
    W.scene.background.setRGB(...bg, THREE.SRGBColorSpace); W.scene.fog.color.copy(W.scene.background);
    W.scene.fog.near = lerp(9, 18, day); W.scene.fog.far = lerp(30, 56, day);
    W.sun.intensity = 2.5 * day + 0.5 * gold * day; W.sun.color.setRGB(...mix3(hex('#FFE9CF'), hex('#FFD29A'), gold), THREE.SRGBColorSpace);
    W.sun.position.set(lerp(-6.5, -9.0, gold), lerp(11.5, 7.5, gold), lerp(5.5, 3.0, gold));
    W.hemi.intensity = 0.06 + 0.9 * day; W.scene.environmentIntensity = 0.05 + 0.3 * day;
    W.night.intensity = 1.6 * (1 - dawn); W.kk.intensity = (2.6 * E.inOut(ramp(t, 5.2, 6.2)) * (1 - 0.7 * ramp(t, 6.4, 7.6))) * (1 - imp);
    W.poolMat.opacity = 0.55 * (1 - dawn); W.pillarMat.color.setRGB(...mix3(hex('#241B1F'), hex('#EADFCD'), day), THREE.SRGBColorSpace);
    W.floorMat.color.setRGB(...mix3(hex('#2A2024'), hex('#E7DAC6'), day), THREE.SRGBColorSpace);

    // lampu isi ikut kamera (softbox)
    W.camFill.position.copy(cam.pos).add(V(0.6, 1.2, 0)); W.camFill.target.position.copy(cam.look); W.camFill.intensity = 0.55 * day;
    // ===== monolit ===========================================================================
    const rise = spring(t - T.monoRise[0], 7.5, 0.82);
    const monoOn = t >= T.monoRise[0] - 0.05;
    W.monolith.group.visible = monoOn;
    const mpos = MONO_POS.clone(); mpos.y = lerp(-2.4, MONO_POS.y, clamp(rise, 0, 1.2));
    W.monolith.group.position.copy(mpos.lerp(PC, imp)); W.monolith.group.scale.setScalar(Math.max(1e-4, 1 - imp));
    W.monolith.group.quaternion.identity();
    W.monolith.glow = 0.55 + 0.3 * (1 - dawn);
    const active = t < 7.2 ? 0 : t < 14.4 ? 2 : t < 26.4 ? 3 : t < 31.2 ? 0 : t < 33.6 ? 5 : t < 43.2 ? 4 : t < 45.6 ? 5 : t < 48 ? 2 : t < 52.8 ? 3 : t < 55.2 ? 5 : 6;
    let saved = 0; if (t > T.disapa) saved += 3; if (t > 39.5) saved += 15; if (t > T.ortuSend) saved += 8; if (t > T.export) saved += 10; if (t > T.approve) saved += 6; if (t > T.umumSend) saved += 3;
    if (t > T.saved[0]) saved = Math.round(lerp(saved, 186, E.inOut(ramp(t, T.saved[0], T.saved[1]))));
    W.monolith.draw({ active, saved });
    W.ring.material.opacity = (0.9 * E.inOut(ramp(t, 5.3, 6.2))) * (1 - imp) * (t < 7.6 ? 1 : 0.5);
    const beamI = Math.sin(Math.PI * ramp(t, T.monoRise[0] - 0.1, 6.6)) * 1.6; W.beam.visible = beamI > 0.01; W.beamMat.uniforms.uI.value = beamI;

    // ===== slate murid =======================================================================
    const connected = (i) => { const row = Math.floor(i / 4); return t >= T.wave[0] + row * 0.1 + (i % 4) * 0.02; };
    W.slates.forEach((s, i) => {
      let p = s.home.clone(); let lift = 0; let yawOff = 0; let rimC = IVORY, rimI = 0.1 + 0.62 * dawn; let glow = lerp(0.78, 0.36, dawn);
      // kait: yang meredup
      const dimAt = i === RAKA ? T.dimRaka : i === YOGA ? T.dimYoga : i === FAJAR ? T.dimFajar : null;
      if (dimAt !== null && t < T.whip[1]) { const k = E.inOut(ramp(t, dimAt, dimAt + (i === RAKA ? 1.0 : 0.6))); glow *= lerp(1, i === RAKA ? 0.12 : 0.4, k); if (i === RAKA) { p.z += 0.22 * k; lift -= 0.1 * k; } }
      if (connected(i)) { rimC = GOLD; rimI = 0.95 + 1.1 * Math.exp(-(t - (T.wave[0] + Math.floor(i / 4) * 0.1)) * 3); }
      // mode tekstur
      let st = { mode: 'idle', v: 0.35 + 0.5 * hash01(i, 7) };
      const tNotif = arrival(i, (f) => f.t0 >= T.fly && f.dir === 1 && f.t0 < T.fly + 2);
      if (t >= tNotif && t < T.back) st = { mode: 'notif' };
      const tRes = arrival(i, (f) => f.result); const tSend = tRes - 0.8;
      if (!NOT_DONE.has(i) && t >= tSend && t < T.drop) st = { mode: 'done', score: SCORE(i) };
      if (i === YOGA && t >= T.cutYoga - 0.1 && t < T.drop) { const sec = 462 - Math.floor(t - T.cutYoga); st = { mode: 'exam', timer: `0${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` }; }
      if (i === YOGA && t >= T.away[0] && t < T.away[1]) { const k = Math.sin(Math.PI * ramp(t, T.away[0], T.away[1])); yawOff = 1.35 * E.inOut(clamp(k * 1.4)); glow *= 1 - 0.6 * k; }
      // sorotan "perlu disapa"
      const risk = { [RAKA]: ['risiko', 'Berisiko', '8 hari tidak belajar'], [YOGA]: ['pantau', 'Pantau', 'akurasi 48%'], [FAJAR]: ['pantau', 'Pantau', '1 tugas lewat tenggat'] }[i];
      if (risk && t >= T.rise[0] && t < T.grp) {
        const k = spring(t - T.rise[0] - (i === RAKA ? 0 : i === YOGA ? 0.12 : 0.24), 11, 0.7) * (1 - E.inOut(ramp(t, T.grp - 0.4, T.grp)));
        lift += 0.32 * k; st = { mode: 'risk', lv: risk[0], label: risk[1], why: risk[2] };
        rimC = risk[0] === 'risiko' ? BRICK : AMB; rimI = 1.6 + 0.6 * Math.sin(t * 6);
        if (i === RAKA && t >= T.disapa) { st = { mode: 'sapa' }; rimC = EMER; rimI = 1.4 + 2.5 * Math.exp(-(t - T.disapa) * 4); }
      }
      // kelompok belajar
      if (t >= T.regroup[0] && t < T.rem + 0.3) {
        const gp = groupPos(i); const k = E.inOut(ramp(t, T.regroup[0] + (i % 8) * 0.03, T.regroup[1])) ;
        const back = E.inOut(ramp(t, T.rem, T.rem + 0.3));
        p.lerp(gp.p, k * (1 - back)); st = gp.mentor && t >= T.mentor[0] ? { mode: 'mentor', grp: gp.g } : { mode: 'group', grp: gp.g };
        if (gp.mentor) { lift += 0.26 * spring(t - T.mentor[0] - gp.g * 0.05, 12, 0.7) * (1 - back); if (t >= T.mentor[0]) { rimC = AMB; rimI = 2.0; } }
      }
      // jalur remedial / pengayaan
      if (t >= T.lanes[0] && t < T.home[1]) {
        const lp = lanePos(i); const k = E.inOut(ramp(t, T.lanes[0] + (i % 6) * 0.04, T.lanes[1])) * (1 - E.inOut(ramp(t, T.home[0], T.home[1])));
        p.lerp(lp.p, k);
        if (lp.lane === 'rem') { rimC = BRICK; rimI = 1.2 * k + rimI * (1 - k); } else if (lp.lane === 'enr') { rimC = EMER; rimI = 1.6 * k + rimI * (1 - k); } else { glow *= 1 - 0.35 * k; rimI *= 1 - 0.6 * k; }
      }
      // pengumuman sampai
      const tAnn = arrival(i, (f) => f.t0 >= T.umumSend);
      if (t >= tAnn && t < T.climax) st = { mode: 'ann' };
      // kapsul tiba → kilat bingkai
      for (const f of FLIGHTS) { if (f.i === i && f.dir === 1) { const a = t - (f.t0 + f.dur); if (a >= 0 && a < 0.6) rimI += 2.2 * Math.exp(-a * 7); } }
      if (t >= T.climax) { rimC = mix3(GOLD, EMER, 0.5 + 0.5 * Math.sin(i * 1.7 + t * 2)); rimI = 1.6 + 0.8 * gold; }
      // implosi
      p.y += lift + Math.sin(t * 1.1 + i * 0.7) * 0.018;
      p.lerp(PC, imp);
      s.group.position.copy(p); s.group.rotation.set(-0.1, Math.PI + yawOff, 0, 'YXZ');
      s.group.scale.setScalar(Math.max(1e-4, 1 - imp));
      s.state(st); s.panel.glow = glow;
      s.rimMat.color.setRGB(rimC[0] * rimI, rimC[1] * rimI, rimC[2] * rimI);
      s.pool.position.set(p.x, 0.006, p.z - 0.2); s.pool.scale.setScalar(Math.max(1e-4, (1 - imp) * glow / 1.05));
      s.pos = p;
    });

    // ===== benang ============================================================================
    const hub = HUB.clone().lerp(PC, imp);
    W.threads.forEach((th, i) => {
      const s = W.slates[i]; const end = s.pos.clone(); end.y += 0.52 * (1 - imp);
      th.set(hub, end, 1 - imp);
      const row = Math.floor(i / 4);
      const rev = E.cubicOut(ramp(t, T.wave[0] + row * 0.1 + (i % 4) * 0.02, T.wave[0] + row * 0.1 + 0.55));
      th.u.uReveal.value = rev; th.u.uStart.value = 0;
      let I = 0.55 + 0.25 * day;
      if (t < T.wave[1] + 0.6) I += 1.4 * Math.exp(-Math.max(0, t - T.wave[0] - row * 0.1) * 2.5) * (rev > 0 ? 1 : 0);
      if (t >= T.climax) I = 0.9 + 1.2 * gold;
      if (t >= T.grp && t < T.home[1]) I *= 0.45;                      // redup saat formasi berubah
      const presenting = t >= T.cutRing && t < T.climax && !(t >= T.grp && t < T.ortu);
      if (presenting) I *= 0.4;                                           // jangan menyilang teks panel
      I *= 1 - imp;
      th.u.uIntensity.value = I; th.u.uTime.value = t; th.u.uFlow.value = t >= T.climax ? 1.4 : 0.6;
      th.mesh.visible = rev > 0.001 && imp < 0.999;
    });

    // ===== kapsul data =======================================================================
    let ci = 0; const tmp = V(0, 0, 0), tmp2 = V(0, 0, 0);
    const useCap = (thr, u, em, sc) => {
      if (ci >= W.capsules.length) return; const m = W.capsules[ci++]; m.visible = true;
      thr.at(clamp(u), tmp); thr.at(clamp(u + 0.01), tmp2); m.position.copy(tmp); m.lookAt(tmp2); m.rotateY(Math.PI / 2);
      m.material = em ? W.capMatE : W.capMatG; m.scale.setScalar(sc);
    };
    for (const f of FLIGHTS) {
      if (t < f.t0 || t > f.t0 + f.dur) continue;
      if (f.code) continue;                                             // chip kode digambar terpisah
      const k = E.inOut(ramp(t, f.t0, f.t0 + f.dur)); const u = f.dir > 0 ? k : 1 - k;
      useCap(W.threads[f.i], u, f.em, 0.9 + 0.3 * Math.sin(Math.PI * k));
    }
    if (t >= T.climax && t < T.implode[1]) {
      for (let i = 0; i < 32 && ci < W.capsules.length - 2; i++) for (let k = 0; k < 2; k++) {
        const ph = ((t - T.climax) / 1.35 + hash01(i * 2 + k, 3)) % 1; const u = k ? ph : 1 - ph;
        useCap(W.threads[i], u, k === 0, (1 - imp) * 0.85 * clamp((t - T.climax) * 3));
      }
    }
    for (; ci < W.capsules.length; ci++) W.capsules[ci].visible = false;

    // ===== chip kode (SH03) + serpihan kode ke 32 slate =====================================
    const chip = this.chip; chip.group.visible = false;
    if (t >= T.codeLift && t < T.chips + 1.2) {
      const kode = this.hero.kode; const base = kode.group.position.clone();
      if (t < T.chips) { // naik dari panel
        const k = E.fzOut(ramp(t, T.codeLift, T.cutHigh)); chip.group.visible = true;
        chip.group.position.copy(base).add(V(0, -0.1 + 0.9 * k, 0.25 + 0.2 * k)); chip.group.quaternion.copy(kode.group.quaternion); chip.group.scale.setScalar(0.62);
      } else {
        // serpihan chip terbang lewat kurva benang ke tiap slate
        for (const f of FLIGHTS) { if (!f.code || t < f.t0 || t > f.t0 + f.dur) continue;
          const k = E.inOut(ramp(t, f.t0, f.t0 + f.dur)); const th = W.threads[f.i];
          if (ci < W.capsules.length) { /* noop: kapsul penuh */ }
          const m = W.capsules[(f.i + 40) % W.capsules.length]; m.visible = true; m.material = W.capMatE; th.at(k, tmp); m.position.copy(tmp); m.scale.setScalar(1.7);
        }
      }
    }

    // ===== panel pahlawan & amfiteater =======================================================
    const H = this.hero; for (const k in H) H[k].group.visible = false; this._focus = null;
    for (const q of this.qcards) q.group.visible = false;
    const wallOn = t >= T.wallRise[0] && t < T.implode[1] + 0.05;
    if (wallOn) {
      WALL.forEach((row, r) => row.forEach((n, c) => {
        const P = H[n]; const wp = wallPose(P);
        const d = Math.abs(ARC_ANG[c]) / 70 * 0.55 + r * 0.12;          // gelombang dari tengah ke tepi
        const k = spring(t - T.wallRise[0] - d, 9, 0.78);
        wp.pos.y = lerp(-1.6, wp.pos.y, clamp(k, 0, 1.3));
        wp.pos.lerp(PC, imp); wp.width *= Math.max(1e-4, 1 - imp);
        setPose(P, wp); P.glow = 0.3 + 0.25 * (1 - day);
        P.draw(this.panelState(n, t));
      }));
    }
    // presentasi (lepas dari dinding bila dinding sudah ada)
    const show = (n, tin, tout, ta, D, F, ox, oy, o = {}) => {
      if (t < tin - 0.02 || t > tout + 0.62) return;
      const P = H[n]; const pres = presentPose(ta, D, F, ox, oy, o.rot || {});
      let pose;
      if (wallOn && wallSlotOf(n)) {
        const k = E.fzOut(ramp(t, tin, tin + 0.6)) * (1 - E.fzOut(ramp(t, tout, tout + 0.6)));
        pose = lerpPose(wallPose(P), pres, k);
        setPose(P, pose);
      } else {
        if (t > tout) return;
        const ee = enterExit(t, tin, o.noExit ? 0 : tout, o.from || 'up', o.amt ?? 1, pres.width);
        setPose(P, pres, { off: ee.off, rot: ee.rot });
      }
      P.glow = o.glow ?? 0.26; P.draw(this.panelState(n, t));
      if (t >= tin && t <= tout) this._focus = P;
    };
    // I–III (sebelum amfiteater): panel berdiri sendiri
    show('kode', T.kodeIn, cut(T.cutHigh), 7.9, 1.9, 0.84, 0, -0.02, { noExit: true });
    show('gabung', cut(T.cutNadia), cut(T.cutJoin), 10.6, 0.5, 0.8, 0.02, 0.02, { noExit: true, from: 'down' });
    show('join', cut(T.cutJoin), cut(T.cutWave), 12.6, 1.9, 0.84, 0, 0, { noExit: true, from: 'right' });
    if (t < T.fold[0]) show('tugas', cut(T.cutTugas), cut(T.cutCrane), 15.6, 2.0, 0.8, 0, 0, { noExit: true });
    else if (t < T.fold[1]) { // tugas terlipat menjadi kapsul dan melesat ke puncak monolit
      const P = H.tugas; const pres = presentPose(15.6, 2.0, 0.8, 0, 0); const k = E.cubicIn(ramp(t, T.fold[0], T.fold[1]));
      pres.pos.lerp(HUB, k); pres.width *= lerp(1, 0.05, k); setPose(P, pres); P.draw(this.panelState('tugas', t)); P.glow = 0.32 + 2 * k;
    }
    // kerjakan ↔ soal: berbalik
    if (t >= cut(T.cutKerjakan) && t < cut(T.cutSelesai)) {
      const fl = ramp(t, T.flip[0], T.flip[1]);
      const ang = fl < 0.5 ? E.cubicIn(fl * 2) * Math.PI / 2 : -(1 - E.cubicOut((fl - 0.5) * 2)) * Math.PI / 2;
      const n = fl < 0.5 ? 'kerjakan' : 'soal';
      const pres = presentPose(19.9, 0.5, 0.82, 0.02, 0.0);
      const ee = enterExit(t, cut(T.cutKerjakan), 0, 'down', 0.8, pres.width);
      setPose(H[n], pres, { off: n === 'kerjakan' ? ee.off : null, rot: new THREE.Euler(0, ang, 0) }); H[n].glow = 0.34; H[n].draw(this.panelState(n, t)); this._focus = H[n];
    }
    show('selesai', cut(T.cutSelesai), cut(T.cutBack), 21.9, 0.5, 0.78, 0.02, 0.04, { noExit: true, from: 'down' });
    if (!wallOn) {
      show('hasil', T.hasilIn, cut(T.cutYoga), 23.0, 2.25, 0.72, -0.06, 0.22, { noExit: true, from: 'left' });
      show('hasil', cut(T.cutFocus), cut(T.drop), 25.8, 2.1, 0.8, 0, 0.05, { noExit: true, from: 'right' });
    }
    // IV · dasbor
    show('ringkasan', cut(T.cutRing), cut(T.sapa), 28.3, 2.3, 0.84, 0, 0.0);
    show('sapa', cut(T.sapa), cut(T.kartu), 29.6, 2.05, 0.74, -0.04, 0.24);
    show('kartusapa', cut(T.kartu), cut(T.cutRaka), 32.2, 2.3, 0.84, 0, 0.0);
    show('heatmap', cut(T.heat), cut(T.mis), 34.8, 2.5, 0.86, 0, 0.0, { rot: { yaw: 0.22 } });
    show('miskonsepsi', cut(T.mis), cut(T.grp), 37.2, 3.9, 0.86, 0, 0.0, { rot: { yaw: -0.14 } });
    show('kelompok', cut(T.grp), cut(T.rem), 39.3, 2.2, 0.56, 0, 0.42);
    show('remedial', cut(T.rem), cut(T.ortu), 41.7, 2.3, 0.54, 0, 0.44);
    if (t < T.ortuFly[0]) show('ortu', cut(T.ortu), cut(T.absen), 44.3, 2.4, 0.8, 0, 0.0, { rot: { pitch: -0.12 } });
    else if (t < cut(T.absen)) { const P = H.ortu; const pres = presentPose(44.3, 2.4, 0.8, 0, 0, { pitch: -0.12 }); const k = E.cubicIn(ramp(t, T.ortuFly[0], T.ortuFly[1])); pres.pos.add(V(1.8 * k, 2.6 * k, -1.0 * k)); pres.q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.9 * k, 0.4 * k, 0.5 * k))); pres.width *= 1 - 0.6 * k; setPose(P, pres); P.draw(this.panelState('ortu', t)); }
    show('absen', cut(T.absen), T.rekapIn + 0.35, 46.3, 2.35, 0.8, -0.04, 0.02);
    show('rekap', T.rekapIn, cut(T.kur), 47.4, 2.2, 0.8, 0.04, -0.02);
    show('kurikulum', cut(T.kur), cut(T.bc), 49.0, 2.5, 0.8, 0, 0.02);
    show('braincore', cut(T.bc), cut(T.umum), 51.6, 2.75, 0.78, 0, 0.0);
    show('pengumuman', cut(T.umum), cut(T.cutMurid), 53.4, 2.4, 0.84, 0, 0.0);
    show('muridhome', cut(T.cutMurid), cut(T.waktu), 54.5, 0.5, 0.78, 0.02, 0.0, { noExit: true, from: 'down' });
    show('jurnal', T.jurnalIn, cut(T.climax), 56.8, 2.2, 0.72, 0.08, 0.24, { from: 'right' });
    // kipas kartu soal dari bank bab (SH20)
    if (t >= T.fan[0] && t < cut(T.bc)) {
      const base = presentPose(49.0, 2.5, 0.8, 0, 0.02);
      this.qcards.forEach((q, n) => {
        const k = E.fzOut(ramp(t, T.fan[0] + n * 0.06, T.fan[0] + n * 0.06 + 0.55));
        const ang = (n - 4.5) * 0.19; const cam = camAt(49.0);
        const r = new THREE.Vector3().crossVectors(cam.dir, new THREE.Vector3(0, 1, 0)).normalize();
        const pos = base.pos.clone().addScaledVector(cam.dir, -0.7 * k).addScaledVector(r, Math.sin(ang) * 0.95 * k).add(V(0, (-0.42 + Math.cos(ang) * 0.22) * k - 0.1, 0));
        q.group.visible = k > 0.01; q.group.position.copy(pos); q.group.quaternion.copy(base.q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0, -ang * 0.8)));
        q.group.scale.setScalar(Math.max(1e-4, k * 0.72));
      });
    }

    // ===== inti implosi ======================================================================
    const [o0, o1, o2] = T.orb; const orbR = t < o1 ? E.cubicOut(ramp(t, o0, o1)) * 0.3 : (1 - E.cubicIn(ramp(t, o1, o2))) * 0.3;
    W.orbCore.visible = orbR > 0.002 && t < T.black; W.orbCore.position.copy(PC); W.orbCore.scale.setScalar(Math.max(1e-4, orbR / 0.2));

    // ===== autofokus: kunci bidang fokus ke panel yang sedang dipresentasikan ================
    if (this._focus && (cam.fdPanel || (cam.name.startsWith('SH23') && t > T.jurnalIn + 0.35))) {
      const d = new THREE.Vector3().subVectors(this._focus.group.position, cam.pos).dot(cam.dir);
      if (d > 0.1) cam.focus = cam.name.startsWith('SH23') ? lerp(cam.focus, d, E.inOut(ramp(t, T.jurnalIn + 0.35, T.jurnalIn + 0.8))) : d;
    }
    // ===== lapisan merek =====================================================================
    if (t >= T.black) {
      const ms = (t - T.splash) * 1000;
      this.brand.draw(t < T.splash ? -1 : ms, { lock: ramp(t, T.lock[0], T.lock[1]), kk: ramp(t, T.kk[0], T.kk[1]), cta: ramp(t, T.cta[0], T.cta[1]), ctaPress: press(t, T.ctaPress, 1) });
    }
    return cam;
  }

  // Keadaan isi panel per waktu (dipakai presentasi DAN dinding).
  panelState(n, t) {
    const typed = (txt, a, b) => Math.round(txt.length * clamp((t - a) / (b - a), 0, 1));
    switch (n) {
      case 'kode': return { nameTyped: Math.round(8 * ramp(t, ...T.kodeType)), code: ramp(t, ...T.codeReveal), pCopy: +press(t, T.copy).toFixed(2) };
      case 'gabung': return { typed: Math.round(9 * ramp(t, ...T.typeJoin)), focus: t > T.typeJoin[0] - 0.2, pJoin: +press(t, T.join).toFixed(2), sent: +E.fzOut(ramp(t, T.joinSent, T.joinSent + 0.3)).toFixed(2) };
      case 'join': return { added: T.add.filter((a) => t >= a + 0.12).length, press: T.add.map((a) => +press(t, a).toFixed(2)) };
      case 'tugas': return { mode: ramp(t, T.mode, T.mode + 0.1), pSend: +press(t, T.send).toFixed(2) };
      case 'kerjakan': return { tab: 0, badge: true, card: 1, pStart: +press(t, T.start).toFixed(2) };
      case 'soal': return { pick: t >= T.pick ? 1 : -1, why: +E.fzOut(ramp(t, T.why, T.why + 0.3)).toFixed(2) };
      case 'selesai': return { score: Math.round(90 * E.cubicOut(ramp(t, 21.62, 21.95))), sent: +ramp(t, T.sent, T.sent + 0.15).toFixed(2) };
      case 'hasil': {
        const done = FLIGHTS.filter((f) => f.result && t >= f.t0 + f.dur).length;
        return { done: t < T.back ? 0 : done, rows: t < T.hasilIn ? 0 : Math.min(7, Math.floor((t - T.hasilIn) / 0.12)), focus: +E.fzOut(ramp(t, T.focus, T.focus + 0.3)).toFixed(2) };
      }
      case 'ringkasan': return { k: +E.cubicOut(ramp(t, ...T.kpi)).toFixed(3), tiles: 4 };
      case 'sapa': return { rows: +clamp((t - T.rise[0]) / 0.18, 0, 3).toFixed(2) };
      case 'kartusapa': return { typed: t < T.kartu ? SAPA_TEXT.length : typed(SAPA_TEXT, ...T.type), pSend: +press(t, T.kirim).toFixed(2) };
      case 'heatmap': return { fill: t < T.heat ? 2 : +(ramp(t, ...T.heatFill) * 1.62).toFixed(3), hl: +ramp(t, T.heatHl, T.heatHl + 0.25).toFixed(2) };
      case 'miskonsepsi': return { strike: t < T.mis ? 1 : +E.inOut(ramp(t, ...T.strike)).toFixed(2), fix: t < T.mis ? 1 : +E.fzOut(ramp(t, ...T.fix)).toFixed(2) };
      case 'kelompok': return { g: t < T.grp ? 4 : +clamp((t - T.regroup[0]) / 0.25, 0, 4).toFixed(2) };
      case 'remedial': return { pRem: +press(t, T.remPress).toFixed(2), par: t < T.rem ? 0 : Math.floor(clamp((t - T.par[0]) / 0.2 + 1, 0, 3)) };
      case 'ortu': { const all = ORTU_LINES.reduce((a, l) => a + l[1].length, 0); return { typed: t < T.ortu ? all : Math.round(all * ramp(t, ...T.ortuType)), pSend: +press(t, T.ortuSend).toFixed(2) }; }
      case 'absen': return { pAll: +press(t, T.allHadir).toFixed(2), all: t < T.absen ? 0 : +clamp((t - T.allHadir - 0.05) / 0.5, 0, 1).toFixed(2) };
      case 'rekap': return { rows: t < T.rekapIn ? 8 : Math.min(8, Math.floor((t - T.rekapIn) / 0.07)), pExp: +press(t, T.export).toFixed(2) };
      case 'kurikulum': return { pMake: +press(t, T.make).toFixed(2) };
      case 'braincore': return { step: t < T.bc ? 4 : +clamp((t - T.steps[0]) / 0.27, 0, 4).toFixed(2), ok: t >= T.approve ? 1 : 0 };
      case 'pengumuman': return { typed: t < T.umum ? UMUM_TEXT.length : typed(UMUM_TEXT, ...T.umumType), pSend: +press(t, T.umumSend).toFixed(2) };
      case 'muridhome': return { ann: +E.fzOut(ramp(t, T.ann, T.ann + 0.3)).toFixed(2), stamp: +ramp(t, T.stamp, T.stamp + 0.25).toFixed(2) };
      case 'jurnal': return { typed: t < T.jurnalIn ? JURNAL_TEXT.length : typed(JURNAL_TEXT, ...T.jurnalType) };
      default: return {};
    }
  }
}
