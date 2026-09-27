// FIEZEL · Film "Satu Kelas, Dua Layar" — lapisan merek: splash resmi + lockup KelasKu.
//
// Splash TIDAK digambar ulang dengan tangan. Tiga modul resmi dari repo dimuat apa adanya
// (disalin ke ../brand/ dari features/brand/):
//   fiezel-choreography.js      tabel ketukan (satu jam untuk gerak & bunyi)
//   fiezel-splash-particles.js  awan partikel → huruf F (parametrik terhadap t)
//   fiezel-splash-equalizer.js  dua batang emas sebagai ekualiser (diputar ulang dari 0 ms)
// Geometri logo tajam = logoMarkup() di features/brand/fiezel-splash.js; wordmark = berkas
// assets/brand/fiezel-wordmark.svg. Tanpa cap PAW, tanpa tagline, tanpa glow (aturan owner).
//
// Kanvas merek 1080×1920 digabung SESUDAH tone map, jadi warnanya keluar persis:
// medan radial #2A2126 → #1B1418 → #120C0F, emas #F0C241/#FFD94F, krem #FFF4DA.

import { E, clamp, ramp } from './lib.js';

const CSS_W = 540, CSS_H = 960, K = 2;          // tata letak "layar ponsel" 540×960 css @2x = 1080×1920
const TL = { F_IN0: 820, F_IN1: 944, B_IN0: 1060, B_IN1: 1150, WORD0: 1200, WORD1: 1500, SETTLE: 1900 };

export class BrandLayer {
  constructor() {
    this.canvas = document.createElement('canvas'); this.canvas.width = 1080; this.canvas.height = 1920;
    this.x = this.canvas.getContext('2d');
    this.pc = document.createElement('canvas'); this.pc.width = CSS_W; this.pc.height = CSS_H;
    this.ready = false;
  }
  async init() {
    const P = window.FiezelSplashParticles, C = window.FiezelChoreography;
    // Modul partikel membaca devicePixelRatio (dibatasi 2) — dipaku 2 supaya bitmap = 1080×1920.
    const had = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => 2 });
    P.init(this.pc, {});
    if (had) Object.defineProperty(window, 'devicePixelRatio', had); else delete window.devicePixelRatio;
    this.layout = P.getLayout();
    this.beats = C.BEATS;
    this.word = await loadImg('../brand/fiezel-wordmark.svg');
    this.ready = true;
  }

  // Level ekualiser: port 1:1 makeGetLevels() dari fiezel-splash.js (fungsi itu hidup di dalam
  // closure orkestrator, jadi tidak bisa dipanggil dari luar).
  makeGetLevels() {
    const hits = [[], []];
    for (const b of this.beats) { if (b.bar !== 1 && b.bar !== 2) continue; hits[b.bar - 1].push({ at: b.at, dur: b.dur, gain: b.gain || 1 }); }
    const ss = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
    return (u) => {
      const lv = [0, 0];
      for (let k = 0; k < 2; k++) {
        let acc = 0;
        for (const h of hits[k]) { const dt = u - h.at; if (dt < 0) continue; const atk = dt < 70 ? ss(dt / 70) : 1; const rel = Math.exp(-Math.max(0, dt - 70) / Math.max(80, h.dur / 3)); acc += h.gain * atk * rel; }
        let level = 1 - Math.exp(-1.35 * acc); level *= 1 - ss((u - TL.SETTLE) / 200); lv[k] = level;
      }
      return lv;
    };
  }
  // Skala batang pada waktu ms: modul ekualiser resmi diputar ulang dari awal @60 Hz dengan
  // elemen tiruan (modul hanya menulis style.transform), persis seperti di aplikasi.
  barScales(ms) {
    const EQ = window.FiezelSplashEqualizer;
    const el = [{ style: {} }, { style: {} }];
    const host = { querySelector: (s) => (s === '.fz-bar1' ? el[0] : s === '.fz-bar2' ? el[1] : null) };
    EQ.init(host, { beats: this.beats, beatsAbsolute: true, getLevels: this.makeGetLevels(), idleShimmer: true, reduceMotion: false });
    let started = false, settled = false;
    const step = 1000 / 60;
    for (let t = 0; t <= ms + 1e-6; t += step) {
      if (!started && t >= 1150) { EQ.start(t); started = true; }
      if (started && !settled && t >= TL.SETTLE) { EQ.settle(TL.SETTLE); settled = true; }
      EQ.update(t, step);
    }
    const rd = (e) => { const m = /scaleY\(([-0-9.]+)\)/.exec(e.style.transform || ''); return m ? parseFloat(m[1]) : 1; };
    return [rd(el[0]), rd(el[1])];
  }

  // Gambar satu frame. ms = waktu splash (0 = frame pertama splash). lock = 0..1 transisi lockup.
  draw(ms, o = {}) {
    const x = this.x; x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1;
    // medan
    const cx = 1080 * 0.3, cy = 1920 * 0.18, R = Math.hypot(1080 - cx, 1920 - cy);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, R); g.addColorStop(0, '#2A2126'); g.addColorStop(0.55, '#1B1418'); g.addColorStop(1, '#120C0F');
    x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
    if (!this.ready || ms < 0) return;
    const L = this.layout, sc = L.scale * K, ox = L.offX * K, oy = L.offY * K;   // ruang-512 → px
    const lock = o.lock || 0, lk = E.fzOut(lock);
    // transformasi lockup untuk tanda: pusat logo (259,256) bergerak ke y = 700 px dan mengecil
    const mark0 = { x: ox + 259 * sc, y: oy + 256 * sc }, mark1 = { x: 540, y: 660 }, s1 = 0.7;
    const mx = mark0.x + (mark1.x - mark0.x) * lk, my = mark0.y + (mark1.y - mark0.y) * lk, ms_ = 1 + (s1 - 1) * lk;
    x.save(); x.translate(mx, my); x.scale(ms_, ms_); x.translate(-mark0.x, -mark0.y);
    // partikel (parametrik, hanya sampai DONE)
    if (ms < 1320) { window.FiezelSplashParticles.update(ms, 16.7); x.drawImage(this.pc, 0, 0, 1080, 1920); }
    // F tajam
    const aF = E.cubicOut(ramp(ms, TL.F_IN0, TL.F_IN1));
    if (aF > 0) { x.globalAlpha = aF; x.fillStyle = '#FFF4DA'; for (const r of [[136, 148, 42, 216, 20], [136, 148, 128, 42, 20], [136, 230, 102, 40, 19]]) rr(x, ox + r[0] * sc, oy + r[1] * sc, r[2] * sc, r[3] * sc, r[4] * sc); x.globalAlpha = 1; }
    // batang emas (poros bawah, gradien per-batang seperti objectBoundingBox SVG)
    const aB = ramp(ms, TL.B_IN0, TL.B_IN1);
    if (aB > 0) {
      const [s1b, s2b] = this.barScales(ms);
      x.globalAlpha = aB;
      [[298, 200, 34, 112, 17, s1b], [348, 166, 34, 180, 17, s2b]].forEach(([bx, by, bw, bh, br, s]) => {
        const X = ox + bx * sc, Y = oy + by * sc, Wd = bw * sc, Hd = bh * sc; const bottom = Y + Hd; const Hs = Hd * s, Ys = bottom - Hs;
        const gg = x.createLinearGradient(0, Ys, 0, bottom); gg.addColorStop(0, '#FFD94F'); gg.addColorStop(1, '#F0C241'); x.fillStyle = gg;
        rr(x, X, Ys, Wd, Hs, Math.min(br * sc, Hs / 2, Wd / 2));
      });
      x.globalAlpha = 1;
    }
    x.restore();
    // wordmark kecil: naik 1200–1500 ms (translateY 14 css → 0)
    const pw = E.cubicOut(ramp(ms, TL.WORD0, TL.WORD1));
    if (pw > 0 && this.word) {
      const w0 = 132 * K, h0 = w0 * 260 / 1000;
      const y0 = 1920 - (67.2 + 29) * K - h0 + (1 - pw) * 14 * K;          // posisi resmi (tanpa tagline)
      const w1 = 380, h1 = w1 * 260 / 1000, y1 = 930;                        // posisi lockup
      const ww = w0 + (w1 - w0) * lk, hh = h0 + (h1 - h0) * lk, yy = y0 + (y1 - y0) * lk;
      x.globalAlpha = pw; x.drawImage(this.word, 540 - ww / 2, yy, ww, hh); x.globalAlpha = 1;
    }
    // Lockup: KelasKu untuk Guru + tombol Buka Demo Guru + alamat
    if (o.kk > 0) {
      const a = E.fzOut(o.kk); x.globalAlpha = clamp(o.kk * 1.6);
      const dy = (1 - a) * 30;
      x.font = '800 104px "PJS"'; x.letterSpacing = '-2px'; const w1 = x.measureText('KelasKu').width;
      x.font = '600 71px "PJS"'; x.letterSpacing = '0px'; const gap = 104 * 0.13; const w2 = x.measureText('untuk Guru').width;
      const X0 = 540 - (w1 + gap + w2) / 2, base = 1206 + dy;
      x.font = '800 104px "PJS"'; x.letterSpacing = '-2px'; x.fillStyle = '#FFF4DA'; x.textAlign = 'left'; x.fillText('KelasKu', X0, base);
      x.font = '600 71px "PJS"'; x.letterSpacing = '0px'; x.fillStyle = '#F0C241'; x.fillText('untuk Guru', X0 + w1 + gap, base);
      x.globalAlpha = 1; x.letterSpacing = '0px';
    }
    if (o.cta > 0) {
      const a = E.fzOut(o.cta); x.globalAlpha = clamp(o.cta * 1.6);
      const p = o.ctaPress || 0, s = 1 - 0.04 * p;
      const bw = 660, bh = 132, bx = 540 - bw / 2, by = 1318 + (1 - a) * 26;
      x.save(); x.translate(540, by + bh / 2); x.scale(s, s); x.translate(-540, -(by + bh / 2));
      x.fillStyle = '#1F7A63'; rr(x, bx, by, bw, bh, bh / 2);
      x.strokeStyle = 'rgba(255,244,218,0.22)'; x.lineWidth = 3; rrs(x, bx + 1.5, by + 1.5, bw - 3, bh - 3, bh / 2);
      x.font = '700 52px "PJS"'; x.fillStyle = '#FFF4DA'; x.textAlign = 'center'; x.fillText('Buka Demo Guru  →', 540, by + bh / 2 + 18);
      x.restore();
      x.globalAlpha = clamp((o.cta - 0.25) * 1.6);
      x.font = '600 50px "PJS"'; x.fillStyle = 'rgba(255,244,218,0.86)'; x.textAlign = 'center'; x.fillText('fiezel.my.id', 540, 1566 + (1 - a) * 20);
      x.globalAlpha = 1; x.textAlign = 'left';
    }
  }
}

function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); x.fill(); }
function rrs(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); x.stroke(); }
function loadImg(src) { return new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; }); }
