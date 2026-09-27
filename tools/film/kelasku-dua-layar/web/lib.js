// FIEZEL · Film "Satu Kelas, Dua Layar" — pustaka kecil: waktu, easing, pegas, acak berseed.
// Semua gerak di film dihitung MURNI dari t (detik), jadi frame mana pun bisa dirender ulang
// persis sama, di urutan apa pun. Tidak ada Math.random di film ini.

export const FPS = 30;
export const BPM = 100;
export const BEAT = 60 / BPM;          // 0,6 dtk = 18 frame
export const BAR = BEAT * 4;           // 2,4 dtk = 72 frame
export const DURATION = 72.0;          // 30 bar
export const W = 1080, H = 1920;

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, k) => a + (b - a) * k;
export const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const ramp = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const smoother = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
export const win = (t, a, b) => t >= a && t < b;

// cubic-bezier (sama dengan CSS) — diselesaikan Newton + bisection.
export function bezier(p1x, p1y, p2x, p2y) {
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
  const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const sx = (u) => ((ax * u + bx) * u + cx) * u;
  const sy = (u) => ((ay * u + by) * u + cy) * u;
  const dx = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (x) => {
    x = clamp(x);
    let u = x;
    for (let i = 0; i < 8; i++) { const e = sx(u) - x; const d = dx(u); if (Math.abs(e) < 1e-6) return sy(u); if (Math.abs(d) < 1e-6) break; u -= e / d; }
    let lo = 0, hi = 1; u = x;
    for (let i = 0; i < 30; i++) { const v = sx(u); if (Math.abs(v - x) < 1e-6) break; if (x > v) lo = u; else hi = u; u = (lo + hi) / 2; }
    return sy(u);
  };
}

// Easing bernama. fzOut/fzSpring = token gerak aplikasi FIEZEL (--fz-out, --fz-spring).
export const E = {
  fzOut: bezier(0.22, 1, 0.36, 1),
  fzSpring: bezier(0.34, 1.56, 0.64, 1),
  inOut: bezier(0.65, 0, 0.35, 1),
  cubicIn: (x) => { x = clamp(x); return x * x * x; },
  cubicOut: (x) => { x = clamp(x); return 1 - Math.pow(1 - x, 3); },
  quintOut: (x) => { x = clamp(x); return 1 - Math.pow(1 - x, 5); },
  expoInOut: (x) => { x = clamp(x); if (x === 0 || x === 1) return x; return x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; },
  sineInOut: (x) => { x = clamp(x); return -(Math.cos(Math.PI * x) - 1) / 2; },
};

// Respons tangga pegas teredam (0 → 1). omega = kekakuan (rad/dtk), zeta = redaman.
export function spring(t, omega = 14, zeta = 0.62) {
  if (t <= 0) return 0;
  if (zeta >= 1) { const e = Math.exp(-omega * t); return 1 - e * (1 + omega * t); }
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const e = Math.exp(-zeta * omega * t);
  return 1 - e * (Math.cos(wd * t) + (zeta * omega / wd) * Math.sin(wd * t));
}
// Pegas dari waktu mulai t0: nilai 0 sebelum t0, lalu mengayun ke 1.
export const springAt = (t, t0, omega, zeta) => spring(t - t0, omega, zeta);

// Tekan: turun lalu kembali dengan pegas (0 → puncak → 0). Untuk tombol yang ditekan.
export function press(t, t0, depth = 1) {
  const u = t - t0;
  if (u < 0) return 0;
  if (u < 0.07) return depth * E.cubicOut(u / 0.07);
  const r = u - 0.07;
  return depth * Math.exp(-r * 9) * Math.cos(r * 18);
}

// mulberry32 — acak deterministik.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let z = a;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash01 = (i, seed = 1) => mulberry32((i * 2654435761 + seed * 97) >>> 0)();

export function halton(i, b) { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; }
// Titik Vogel di cakram satuan (untuk DOF lensa tipis).
export function vogel(i, n) { const g = 2.39996323; const r = Math.sqrt((i + 0.5) / n); const a = i * g; return [r * Math.cos(a), r * Math.sin(a)]; }

// Potongan keras antar-frame: waktu potong dibulatkan ke tengah dua frame.
export const cut = (t) => (Math.round(t * FPS) - 0.5) / FPS;

// Warna
export function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
export function rgba(c, a) { const [r, g, b] = hex(c); return `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`; }

// Sebaran kecil untuk "hidup" (goyang pelan, bukan tangan kamera): jumlah tiga sinus.
export const drift = (t, seed = 0, amp = 1) => amp * (Math.sin(t * 0.37 + seed) * 0.5 + Math.sin(t * 0.61 + seed * 2.1) * 0.3 + Math.sin(t * 1.13 + seed * 3.7) * 0.2);
