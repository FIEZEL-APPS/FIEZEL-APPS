// FIEZEL · Film "Satu Kelas, Dua Layar" — pelukis panel UI.
//
// Setiap panel di film adalah benda 3D yang mukanya digambar di kanvas 2D. Isinya BUKAN
// karangan: kalimat, warna, pil, dan tata letaknya diambil dari layar asli aplikasi —
//   guru  : features/teacher/teacher-shell.css + fiezel-teacher-shell.js + copy-id-*.js (guru.*)
//   murid : features/class-hub/class-hub.css + copy-id-classjoin.js (kelas.*) + style.css
// Angka di dalam panel adalah data contoh (sama seperti mode Demo Guru aplikasi).
//
// Satuan menggambar = "px CSS" panel (lebar 520). Kanvas memakai skala SCALE px per satuan.

export const SCALE = 2.25;
export const FONT = '"PJS"';

// Token guru — teacher-shell.css (body.fz-teacher-mode)
export const TG = {
  ink: '#12211F', ink2: '#1B2F2C', ink3: '#284440', paper: '#F3EFE6', paper2: '#FBF9F4', line: '#E2DCCE',
  text: '#182220', muted: '#4E5C58', sage: '#1F7A63', sage2: '#166052', sageSoft: '#DDEFE7', amber: '#D98E1F',
  amberSoft: '#FBEBCF', amberText: '#7A4E07', brick: '#B93F2A', brickSoft: '#F7DDD6', mist: '#A9C4BC',
  heatHi: ['#D6EFE5', '#12543F'], heatMid: ['#FBEBCF', '#7A4E07'], heatLo: ['#F7DDD6', '#8C2C1B'],
};
// Token murid — style.css (:root) yang dibaca class-hub.css lewat --panel/--accent/…
export const ST = {
  bg: '#FBF7F3', panel: '#FFFFFF', soft: '#F6F1EA', line: '#EFE7DE', text: '#2E2724', muted: '#6E635C',
  accent: '#9B3A4A', accentDeep: '#7E2D3B', accentSoft: '#F6E9EB', good: '#1F6B4E', goodSoft: '#E9F7F0',
  bad: '#AC3E2A', badSoft: '#FDE3DE', gold: '#C9A24B', info: '#2F5E8E', infoSoft: '#E6EEF7',
};

// ---------------------------------------------------------------------------------------------
// Alat gambar
export class G {
  constructor(ctx) { this.x = ctx; }
  font(w, s) { this.x.font = `${w} ${s}px ${FONT}`; }
  rr(x, y, w, h, r) {
    const c = this.x; r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  fill(x, y, w, h, r, col) { this.rr(x, y, w, h, r); this.x.fillStyle = col; this.x.fill(); }
  stroke(x, y, w, h, r, col, lw = 1.5) { this.rr(x, y, w, h, r); this.x.strokeStyle = col; this.x.lineWidth = lw; this.x.stroke(); }
  card(x, y, w, h, r, bg, line) { this.fill(x, y, w, h, r, bg); if (line) this.stroke(x + 0.75, y + 0.75, w - 1.5, h - 1.5, r, line, 1.5); }
  t(str, x, y, o = {}) {
    const c = this.x; this.font(o.w || 500, o.s || 20);
    c.fillStyle = o.c || '#000'; c.textAlign = o.a || 'left'; c.textBaseline = o.b || 'alphabetic';
    c.letterSpacing = (o.ls || 0) + 'px';
    let s = String(str); if (o.up) s = s.toUpperCase();
    if (o.maxW) { while (s.length > 1 && c.measureText(s).width > o.maxW) s = s.slice(0, -2) + '…'; }
    c.fillText(s, x, y); const wdt = c.measureText(s).width; c.letterSpacing = '0px'; return wdt;
  }
  mw(str, w, s, ls = 0) { this.font(w, s); this.x.letterSpacing = ls + 'px'; const v = this.x.measureText(str).width; this.x.letterSpacing = '0px'; return v; }
  // Teks terbungkus. `shown` = jumlah karakter yang sudah "terketik" (null = semua).
  wrap(str, x, y, maxW, lh, o = {}, shown = null) {
    const words = String(str).split(' '); const lines = []; let cur = '';
    this.font(o.w || 500, o.s || 20);
    for (const wd of words) { const tst = cur ? cur + ' ' + wd : wd; if (this.x.measureText(tst).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = tst; }
    if (cur) lines.push(cur);
    let left = shown == null ? Infinity : shown; let yy = y; let lastX = x, lastY = y;
    for (const ln of lines) {
      if (left <= 0) break;
      const part = ln.slice(0, Math.max(0, Math.min(ln.length, left)));
      const wdt = this.t(part, x, yy, o); lastX = x + wdt; lastY = yy;
      left -= ln.length + 1; yy += lh;
    }
    if (shown != null && o.caret && shown < str.length) { this.x.fillStyle = o.caret; this.x.fillRect(lastX + 2, lastY - (o.s || 20) * 0.8, 2.5, (o.s || 20) * 0.95); }
    return lines.length * lh;
  }
  pill(label, x, y, o = {}) {
    const s = o.s || 14, padX = o.px || 11, h = o.h || s + 12;
    const w = this.mw(o.up ? label.toUpperCase() : label, o.w || 700, s, o.ls || 0) + padX * 2 + (o.dot ? 14 : 0);
    const xx = o.right ? x - w : x;
    this.fill(xx, y, w, h, h / 2, o.bg || TG.sageSoft);
    if (o.line) this.stroke(xx + 0.75, y + 0.75, w - 1.5, h - 1.5, h / 2, o.line, 1.5);
    if (o.dot) { this.x.beginPath(); this.x.arc(xx + padX + 4, y + h / 2, 4, 0, 7); this.x.fillStyle = o.dot; this.x.fill(); }
    this.t(label, xx + padX + (o.dot ? 14 : 0), y + h / 2 + s * 0.36, { w: o.w || 700, s, c: o.fg || TG.sage2, up: o.up, ls: o.ls || 0 });
    return w;
  }
  // Tombol. p = 0..1 kedalaman tekan (dari lib.press), on = keadaan aktif setelah ditekan.
  btn(label, x, y, o = {}) {
    const s = o.s || 18, h = o.h || 46, padX = o.px || 22, ic = o.icon ? s + 8 : 0;
    const w = o.fixedW || this.mw(label, 700, s) + padX * 2 + ic;
    const xx = o.center ? x - w / 2 : o.right ? x - w : x;
    const p = o.p || 0, sc = 1 - 0.05 * p;
    const c = this.x; c.save(); c.translate(xx + w / 2, y + h / 2); c.scale(sc, sc); c.translate(-(xx + w / 2), -(y + h / 2));
    const primary = (o.kind || 'primary') === 'primary';
    if (primary && !o.flat) { c.save(); c.shadowColor = o.shadow || 'rgba(31,122,99,.45)'; c.shadowBlur = 16 * (1 - p); c.shadowOffsetY = 8 * (1 - p); this.fill(xx, y, w, h, h / 2, o.bg || TG.sage); c.restore(); }
    else this.fill(xx, y, w, h, h / 2, o.bg || (primary ? TG.sage : TG.paper2));
    if (!primary) this.stroke(xx + 0.75, y + 0.75, w - 1.5, h - 1.5, h / 2, o.line || TG.line, 1.5);
    if (p > 0.02) this.fill(xx, y, w, h, h / 2, `rgba(0,0,0,${0.12 * p})`);
    const fg = o.fg || (primary ? '#FFFFFF' : TG.text);
    let tx = xx + (w - (this.mw(label, 700, s) + ic)) / 2;
    if (o.icon) { icon(this, o.icon, tx, y + h / 2 - s / 2 - 1, s + 2, fg, 2.1); tx += ic; }
    this.t(label, tx, y + h / 2 + s * 0.36, { w: 700, s, c: fg });
    c.restore(); return w;
  }
  avatar(name, x, y, sz, o = {}) {
    let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    this.fill(x, y, sz, sz, sz * 0.33, `hsl(${h} 34% 42%)`);
    this.t(name.slice(0, 2).toUpperCase(), x + sz / 2, y + sz / 2 + sz * 0.15, { w: 700, s: sz * 0.4, c: '#fff', a: 'center', ls: 0.5 });
  }
  bar(x, y, w, h, v, col, bg) { this.fill(x, y, w, h, h / 2, bg || TG.line); if (v > 0.001) this.fill(x, y, Math.max(h, w * Math.min(1, v)), h, h / 2, col); }
  line(x1, y1, x2, y2, col, lw = 1.5) { const c = this.x; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); }
  kicker(str, x, y, col = TG.muted) { return this.t(str, x, y, { w: 600, s: 15, c: col, up: true, ls: 1.8 }); }
}

// Ikon garis gaya Lucide (digambar tangan, bukan berkas). size = kotak ikon.
export function icon(g, name, x, y, size, col, lw = 2) {
  const c = g.x; c.save(); c.translate(x, y); const k = size / 24; c.scale(k, k);
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw / k * (k > 0.9 ? 1 : 0.9); c.lineCap = 'round'; c.lineJoin = 'round';
  const P = (d) => c.stroke(new Path2D(d));
  switch (name) {
    case 'check': P('M20 6 9 17l-5-5'); break;
    case 'bell': P('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'); P('M10.3 21a1.94 1.94 0 0 0 3.4 0'); break;
    case 'send': P('m22 2-7 20-4-9-9-4Z'); P('M22 2 11 13'); break;
    case 'clock': c.beginPath(); c.arc(12, 12, 10, 0, 7); c.stroke(); P('M12 6v6l4 2'); break;
    case 'users': P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'); c.beginPath(); c.arc(9, 7, 4, 0, 7); c.stroke(); P('M22 21v-2a4 4 0 0 0-3-3.87'); P('M16 3.13a4 4 0 0 1 0 7.75'); break;
    case 'arrow': P('M5 12h14'); P('m12 5 7 7-7 7'); break;
    case 'plus': P('M12 5v14'); P('M5 12h14'); break;
    case 'book': P('M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20'); break;
    case 'calendar': g.stroke(3, 4, 18, 18, 2, col, lw / k); P('M16 2v4'); P('M8 2v4'); P('M3 10h18'); break;
    case 'eye-off': P('M9.88 9.88a3 3 0 1 0 4.24 4.24'); P('M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68'); P('M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61'); P('M2 2l20 20'); break;
    case 'msg': P('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'); break;
    case 'file': P('M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z'); P('M14 2v6h6'); P('M8 13h8'); P('M8 17h8'); break;
    case 'download': P('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'); P('m7 10 5 5 5-5'); P('M12 15V3'); break;
    case 'layers': P('m12 2 10 5-10 5L2 7Z'); P('m2 17 10 5 10-5'); P('m2 12 10 5 10-5'); break;
    case 'target': c.beginPath(); c.arc(12, 12, 10, 0, 7); c.stroke(); c.beginPath(); c.arc(12, 12, 6, 0, 7); c.stroke(); c.beginPath(); c.arc(12, 12, 2, 0, 7); c.stroke(); break;
    case 'home': P('m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'); P('M9 22V12h6v10'); break;
    case 'chart': P('M3 3v18h18'); P('M18 17V9'); P('M13 17V5'); P('M8 17v-3'); break;
    case 'grid': g.stroke(3, 3, 7, 7, 1, col, lw / k); g.stroke(14, 3, 7, 7, 1, col, lw / k); g.stroke(14, 14, 7, 7, 1, col, lw / k); g.stroke(3, 14, 7, 7, 1, col, lw / k); break;
    case 'pen': P('M12 20h9'); P('M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'); break;
    case 'megaphone': P('m3 11 18-5v12L3 14v-3z'); P('M11.6 16.8a3 3 0 1 1-5.8-1.6'); break;
    case 'hourglass': P('M5 22h14'); P('M5 2h14'); P('M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22'); P('M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2'); break;
    case 'shield': P('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10'); P('m9 12 2 2 4-4'); break;
    case 'user': c.beginPath(); c.arc(12, 8, 5, 0, 7); c.stroke(); P('M20 21a8 8 0 0 0-16 0'); break;
    case 'x': P('M18 6 6 18'); P('m6 6 12 12'); break;
    default: break;
  }
  c.restore();
}

// ---------------------------------------------------------------------------------------------
// Latar panel
function paperPanel(g, w, h, o = {}) {
  g.card(0, 0, w, h, o.r || 26, o.bg || TG.paper2, o.line || TG.line);
}
function studentPanel(g, w, h) { g.card(0, 0, w, h, 26, ST.panel, ST.line); }
function head(g, kick, title, x = 30, y = 50, o = {}) {
  g.kicker(kick, x, y, o.kc || TG.muted);
  g.t(title, x, y + (o.ts || 34) + 8, { w: 800, s: o.ts || 34, c: o.tc || TG.text, ls: -0.6, maxW: o.maxW || 460 });
}
function demoChip(g, x, y) { g.pill('Data contoh', x, y, { bg: TG.amberSoft, fg: TG.amberText, s: 13, w: 600, h: 26, px: 10, right: true }); }

// ---------------------------------------------------------------------------------------------
// PANEL — setiap fungsi: (g, s) dengan s = keadaan animasi. Ukuran di PANELS di bawah.

// 1 · Muka monolit guru = sidebar KelasKu untuk Guru (.tg-side)
function monolith(g, s) {
  const w = 520, h = 840; g.fill(0, 0, w, h, 30, TG.ink);
  // merek
  const grd = g.x.createLinearGradient(34, 40, 90, 96); grd.addColorStop(0, '#2C9C80'); grd.addColorStop(1, '#166052');
  g.rr(34, 40, 60, 60, 18); g.x.fillStyle = grd; g.x.fill();
  g.t('K', 64, 84, { w: 800, s: 34, c: '#fff', a: 'center' });
  g.t('KelasKu', 112, 74, { w: 800, s: 34, c: '#FFFFFF', ls: -0.7 });
  g.t('untuk Guru', 112 + g.mw('KelasKu', 800, 34, -0.7) + 8, 74, { w: 600, s: 23, c: '#9DB0CC' });
  g.t('RUANG KERJA GURU', 112, 98, { w: 600, s: 12.5, c: TG.mist, ls: 2 });
  // guru
  g.card(34, 128, w - 68, 76, 16, TG.ink2, TG.ink3);
  icon(g, 'user', 52, 152, 28, TG.mist, 2);
  g.t('Bu Sari', 96, 160, { w: 700, s: 21, c: '#fff' });
  g.t('SMP Nusantara 1', 96, 186, { w: 500, s: 16, c: TG.mist });
  // kelas aktif
  g.t('KELAS AKTIF', 34, 238, { w: 600, s: 13, c: TG.mist, ls: 2 });
  g.card(34, 250, w - 68, 52, 12, TG.ink2, TG.ink3);
  g.t('Kelas 8B · Bahasa Inggris', 52, 283, { w: 600, s: 19, c: '#fff' });
  // nav
  const nav = [['home', 'Ringkasan hari ini'], ['users', 'Ruang Kelas'], ['user', 'Siswa'], ['file', 'Tugas & Ujian'], ['chart', 'Analitik kelas'], ['msg', 'Komunikasi'], ['pen', 'Jurnal Guru']];
  nav.forEach(([ic, lb], i) => {
    const y = 322 + i * 52, act = i === (s.active ?? 0);
    if (act) g.fill(34, y, w - 68, 46, 14, TG.sage);
    icon(g, ic, 52, y + 11, 24, act ? '#fff' : '#C8D6D1', 2);
    g.t(lb, 92, y + 30, { w: act ? 700 : 500, s: 20, c: act ? '#fff' : '#C8D6D1' });
  });
  // waktu dihemat
  g.fill(34, h - 128, w - 68, 92, 16, TG.ink2);
  icon(g, 'hourglass', 54, h - 102, 30, TG.amber, 2.2);
  g.t('WAKTU ADMINISTRASI YANG DIHEMAT', 98, h - 96, { w: 600, s: 12, c: TG.mist, ls: 1.4 });
  g.t(`${s.saved ?? 0} menit`, 98, h - 58, { w: 800, s: 32, c: '#fff', ls: -0.5 });
  g.t('perkiraan', w - 52, h - 58, { w: 500, s: 14, c: TG.mist, a: 'right' });
}

// 2 · Kelas baru + kode kelas
function kode(g, s) {
  const w = 520, h = 560; paperPanel(g, w, h);
  head(g, 'Kelas baru', 'Buat kelas');
  g.t('Nama kelas', 30, 150, { w: 600, s: 16, c: TG.muted });
  g.card(30, 162, w - 60, 54, 14, '#fff', TG.line);
  g.t('Kelas 8B'.slice(0, s.nameTyped ?? 8), 48, 197, { w: 600, s: 21, c: TG.text });
  g.t('Mapel', 30, 250, { w: 600, s: 16, c: TG.muted });
  g.card(30, 262, w - 60, 54, 14, '#fff', TG.line);
  g.t('Bahasa Inggris', 48, 297, { w: 600, s: 21, c: TG.text });
  // kode
  const k = s.code ?? 1;
  g.card(30, 344, w - 60, 132, 20, TG.sageSoft, null);
  g.t('KODE KELAS', 52, 378, { w: 700, s: 14, c: TG.sage2, ls: 2 });
  const code = 'FZ-7K3QPA'; const n = Math.round(code.length * k);
  g.t(code.slice(0, n), 52, 440, { w: 800, s: 50, c: TG.sage2, ls: 3 });
  g.t('murid mengetiknya saat bergabung', 52, 464, { w: 500, s: 14.5, c: TG.sage2 });
  g.btn('Salin Kode', 30, 492, { kind: 'primary', s: 17, h: 46, p: s.pCopy || 0, icon: 'file' });
  g.btn('WhatsApp', w - 30, 492, { kind: 'ghost', s: 17, h: 46, right: true, icon: 'send' });
}

// 3 · Gabung KelasKu (murid) — copy-id-student: social2.class-*
function gabung(g, s) {
  const w = 520, h = 520; studentPanel(g, w, h);
  g.t('KelasKu', 30, 62, { w: 800, s: 30, c: ST.accent, ls: -0.5 });
  g.t('Gabung KelasKu dengan kode guru', 30, 112, { w: 800, s: 25, c: ST.text, ls: -0.4 });
  g.wrap('Minta kode KelasKu dari gurumu. Setelah bergabung, hasil latihanmu ikut terlihat oleh guru.', 30, 148, w - 60, 28, { w: 500, s: 18.5, c: ST.muted });
  g.t('Kode KelasKu', 30, 236, { w: 600, s: 16, c: ST.muted });
  g.card(30, 248, w - 60, 60, 30, '#fff', s.focus ? ST.accent : ST.line);
  const code = 'FZ-7K3QPA';
  g.t(code.slice(0, s.typed ?? 0), 54, 288, { w: 700, s: 24, c: ST.text, ls: 2.5 });
  if ((s.typed ?? 0) < code.length && s.focus) { const cw = g.mw(code.slice(0, s.typed ?? 0), 700, 24, 2.5); g.fill(56 + cw, 266, 3, 26, 1, ST.accent); }
  g.btn('Gabung', 30, 332, { kind: 'primary', bg: ST.accent, shadow: 'rgba(155,58,74,.45)', s: 20, h: 54, fixedW: w - 60, p: s.pJoin || 0 });
  if (s.sent) {
    const a = s.sent; g.x.globalAlpha = a;
    g.card(30, 408, w - 60, 84, 18, ST.goodSoft, null);
    icon(g, 'check', 48, 426, 26, ST.good, 2.6);
    g.wrap('Permintaan bergabung sudah dikirim ke gurumu — tugas muncul otomatis setelah kamu ditambahkan.', 88, 440, w - 140, 24, { w: 600, s: 16.5, c: ST.good });
    g.x.globalAlpha = 1;
  }
}

// 4 · Menunggu persetujuan (guru) — copy-id-classjoin: kelas.menunggu-*
function join(g, s) {
  const w = 520, h = 600; paperPanel(g, w, h);
  head(g, 'Kelas 8B · FZ-7K3QPA', 'Menunggu persetujuan');
  g.wrap('Mereka memasukkan kode kelas ini. Tambahkan yang kamu kenal; yang tidak ditambahkan tidak menerima tugas apa pun.', 30, 140, w - 60, 26, { w: 500, s: 17, c: TG.muted });
  const rows = ['Nadia', 'Raka', 'Putri'];
  rows.forEach((nm, i) => {
    const y = 236 + i * 108, ok = (s.added ?? 0) > i;
    g.card(30, y, w - 60, 92, 18, ok ? TG.sageSoft : '#fff', ok ? null : TG.line);
    g.avatar(nm, 48, y + 22, 48);
    g.t(nm, 110, y + 44, { w: 700, s: 21, c: TG.text });
    g.t(ok ? 'ditambahkan ke Kelas 8B' : 'mengetuk kode · baru saja', 110, y + 70, { w: 500, s: 15, c: ok ? TG.sage2 : TG.muted });
    if (ok) { g.fill(w - 86, y + 24, 44, 44, 22, TG.sage); icon(g, 'check', w - 76, y + 34, 24, '#fff', 3); }
    else {
      g.btn('Tambahkan', w - 48, y + 23, { kind: 'primary', s: 16, h: 44, right: true, px: 16, p: (s.press && s.press[i]) || 0 });
      g.t('Abaikan', w - 48 - 150, y + 51, { w: 600, s: 15, c: TG.muted, a: 'right' });
    }
  });
}

// 5 · Buat tugas / ujian (guru)
function tugas(g, s) {
  const w = 520, h = 760; paperPanel(g, w, h);
  head(g, 'Tugas baru · Kelas 8B', 'Buat tugas / ujian');
  g.t('Judul Tugas / Bab', 30, 150, { w: 600, s: 16, c: TG.muted });
  g.card(30, 162, w - 60, 56, 14, '#fff', TG.line);
  g.t('Review Past Tense — penanda waktu', 48, 198, { w: 600, s: 19.5, c: TG.text, maxW: w - 100 });
  // jumlah soal + tenggat
  g.card(30, 234, 220, 64, 14, '#fff', TG.line); g.t('Jumlah soal', 48, 258, { w: 600, s: 13.5, c: TG.muted }); g.t('10 soal', 48, 286, { w: 800, s: 21, c: TG.text });
  g.card(270, 234, 220, 64, 14, '#fff', TG.line); g.t('Tenggat', 288, 258, { w: 600, s: 13.5, c: TG.muted }); g.t('Jum, 27 Sep', 288, 286, { w: 800, s: 21, c: TG.text });
  g.t('2. ATUR MODE & WAKTU', 30, 334, { w: 700, s: 13.5, c: TG.muted, ls: 1.6 });
  const ujian = (s.mode || 0) > 0.5;
  const modeCard = (y, on, title, sub) => {
    g.card(30, y, w - 60, 104, 18, on ? TG.sageSoft : '#fff', on ? TG.sage : TG.line);
    g.x.beginPath(); g.x.arc(58, y + 34, 11, 0, 7); g.x.strokeStyle = on ? TG.sage : '#B9B2A2'; g.x.lineWidth = 2.5; g.x.stroke();
    if (on) { g.x.beginPath(); g.x.arc(58, y + 34, 6, 0, 7); g.x.fillStyle = TG.sage; g.x.fill(); }
    g.t(title, 80, y + 41, { w: 700, s: 19, c: TG.text });
    g.wrap(sub, 80, y + 68, w - 140, 22, { w: 500, s: 15, c: TG.muted });
  };
  modeCard(348, !ujian, 'Mode Latihan Mandiri', 'Kunci & pembahasan langsung terbuka setelah murid menjawab tiap soal.');
  modeCard(466, ujian, 'Mode Ujian / Kuis Terjadwal', 'Ada timer hitung mundur, urutan soal diacak otomatis, nilai terekam ke rekap guru.');
  if (ujian) { g.pill('Timer 8 menit', 30, 590, { bg: TG.amberSoft, fg: TG.amberText, s: 14, dot: TG.amber }); g.pill('Soal diacak', 30 + 160, 590, { bg: TG.sageSoft, fg: TG.sage2, s: 14 }); }
  g.btn('Kirim ke semua murid', 30, 648, { kind: 'primary', s: 20, h: 60, fixedW: w - 60, p: s.pSend || 0, icon: 'send' });
  g.t('Kirim langsung (notifikasi di aplikasi murid)', w / 2, 734, { w: 500, s: 14, c: TG.muted, a: 'center' });
}

// 6 · KelasKu murid: daftar tugas (siklus Kerjakan/Terlewat/Selesai/Arsip)
function kerjakan(g, s) {
  const w = 520, h = 700; studentPanel(g, w, h);
  g.t('KELASKU · KELAS 8B', 30, 50, { w: 700, s: 14, c: ST.muted, ls: 1.8 });
  g.t('Tugas dari gurumu', 30, 92, { w: 800, s: 30, c: ST.text, ls: -0.5 });
  // lonceng
  icon(g, 'bell', w - 72, 44, 34, ST.text, 2); if (s.badge) { g.fill(w - 50, 38, 24, 24, 12, ST.accent); g.t('1', w - 38, 56, { w: 800, s: 15, c: '#fff', a: 'center' }); }
  // tab
  g.fill(30, 120, w - 60, 56, 28, ST.soft);
  const tabs = ['Kerjakan', 'Terlewat', 'Selesai', 'Arsip']; const tw = (w - 68) / 4;
  tabs.forEach((tb, i) => {
    const x = 34 + i * tw; if (i === (s.tab ?? 0)) { g.x.save(); g.x.shadowColor = 'rgba(0,0,0,.18)'; g.x.shadowBlur = 12; g.x.shadowOffsetY = 4; g.fill(x, 124, tw, 48, 24, ST.panel); g.x.restore(); }
    g.t(tb, x + tw / 2 - (i === 0 && s.badge ? 12 : 0), 155, { w: 700, s: 16, c: i === (s.tab ?? 0) ? ST.text : ST.muted, a: 'center' });
    if (i === 0 && s.badge) { g.fill(x + tw / 2 + 30, 138, 22, 22, 11, ST.accent); g.t('1', x + tw / 2 + 41, 154, { w: 800, s: 13, c: '#fff', a: 'center' }); }
  });
  g.t('HARI INI & BESOK', 30, 214, { w: 700, s: 13, c: ST.muted, ls: 1.6 });
  const a = s.card ?? 1; g.x.globalAlpha = a;
  const y = 228 + (1 - a) * 30;
  g.card(30, y, w - 60, 250, 22, ST.panel, ST.line);
  g.fill(30, y, 6, 250, 3, ST.info);
  g.pill('Ujian mini', 54, y + 22, { bg: ST.infoSoft, fg: ST.info, s: 14 });
  g.pill('2 hari lagi', w - 54, y + 22, { bg: ST.soft, fg: ST.muted, s: 14, right: true });
  g.wrap('Review Past Tense — penanda waktu', 54, y + 96, w - 120, 32, { w: 800, s: 25, c: ST.text, ls: -0.3 });
  g.t('10 soal · 8 menit · soal diacak', 54, y + 170, { w: 500, s: 17, c: ST.muted });
  icon(g, 'user', 54, y + 190, 20, ST.muted, 2); g.t('Bu Sari', 82, y + 206, { w: 600, s: 16, c: ST.muted });
  g.btn('Mulai', w - 54, y + 186, { kind: 'primary', bg: ST.accent, shadow: 'rgba(155,58,74,.45)', s: 18, h: 48, right: true, px: 28, p: s.pStart || 0 });
  g.x.globalAlpha = 1;
  g.t('LATIHAN PILIHANMU', 30, 522, { w: 700, s: 13, c: ST.muted, ls: 1.6 });
  g.card(30, 536, w - 60, 120, 22, ST.soft, null);
  g.t('Bukan tugas dari guru. Kamu yang memilih', 54, 580, { w: 500, s: 16.5, c: ST.muted });
  g.t('kapan mengerjakannya.', 54, 604, { w: 500, s: 16.5, c: ST.muted });
  g.t('Misi pilihanmu →', 54, 638, { w: 700, s: 16.5, c: ST.accent });
}

// 7 · Soal (murid mengerjakan)
function soal(g, s) {
  const w = 520, h = 640; studentPanel(g, w, h);
  g.t('Soal 3 dari 10', 30, 54, { w: 700, s: 17, c: ST.muted });
  g.pill('07:42', w - 30, 32, { bg: ST.infoSoft, fg: ST.info, s: 16, right: true, dot: ST.info });
  g.bar(30, 72, w - 60, 8, 0.3, ST.accent, ST.soft);
  g.t('PAST TENSE', 30, 128, { w: 700, s: 14, c: ST.muted, ls: 1.8 });
  g.wrap('Yesterday I ___ to the market with my mother.', 30, 172, w - 60, 38, { w: 800, s: 29, c: ST.text, ls: -0.4 });
  const ops = ['go', 'went', 'have gone']; const pick = s.pick ?? -1;
  ops.forEach((op, i) => {
    const y = 272 + i * 82, on = pick === i, ok = on && i === 1;
    g.card(30, y, w - 60, 68, 20, ok ? ST.goodSoft : ST.panel, ok ? ST.good : ST.line);
    g.t(String.fromCharCode(65 + i), 62, y + 43, { w: 800, s: 19, c: ok ? ST.good : ST.muted, a: 'center' });
    g.t(op, 96, y + 44, { w: 700, s: 23, c: ok ? ST.good : ST.text });
    if (ok) { g.fill(w - 86, y + 14, 40, 40, 20, ST.good); icon(g, 'check', w - 77, y + 23, 22, '#fff', 3); }
  });
  if ((s.why ?? 0) > 0) {
    g.x.globalAlpha = s.why; g.card(30, 530, w - 60, 84, 18, ST.goodSoft, null);
    g.t('Benar! Mantap.', 52, 564, { w: 800, s: 19, c: ST.good });
    g.t('“Yesterday” menandai masa lalu → verb 2: went.', 52, 594, { w: 500, s: 16, c: ST.good });
    g.x.globalAlpha = 1;
  }
}

// 8 · Selesai (murid) — laporan terkirim ke guru
function selesai(g, s) {
  const w = 520, h = 440; studentPanel(g, w, h);
  g.pill('Selesai', 30, 32, { bg: ST.goodSoft, fg: ST.good, s: 15 });
  g.t('Review Past Tense — penanda waktu', 30, 104, { w: 800, s: 22, c: ST.text, maxW: w - 60 });
  g.t(`${s.score ?? 90}%`, 30, 208, { w: 800, s: 88, c: ST.good, ls: -2 });
  g.t('9 dari 10 benar', 30, 246, { w: 600, s: 18, c: ST.muted });
  const a = s.sent ?? 0; g.x.globalAlpha = 0.25 + 0.75 * a;
  g.card(30, 290, w - 60, 110, 20, ST.soft, null);
  icon(g, 'send', 52, 316, 28, a > 0.5 ? ST.good : ST.muted, 2.2);
  g.t(a > 0.5 ? 'Laporan terakhir terkirim ke guru' : 'Mengirim laporan…', 96, 336, { w: 700, s: 18, c: a > 0.5 ? ST.good : ST.muted });
  g.t('Tugas selesai pindah sendiri ke Arsip.', 96, 366, { w: 500, s: 15.5, c: ST.muted });
  g.x.globalAlpha = 1;
}

// 9 · Hasil per tugas (guru) + penanda keluar layar
const CLS = ['Rina', 'Yoga', 'Sari', 'Bagas', 'Nadia', 'Fikri', 'Ayu', 'Rizky', 'Putri', 'Dimas', 'Intan', 'Aldi', 'Maya', 'Raka', 'Dewi', 'Fajar', 'Laras', 'Bima',
  'Citra', 'Galih', 'Hana', 'Irfan', 'Joko', 'Kirana', 'Lutfi', 'Mega', 'Nanda', 'Oki', 'Salsa', 'Tegar', 'Vina', 'Wulan'];
export const CLASS_NAMES = CLS;
function hasil(g, s) {
  const w = 520, h = 800; paperPanel(g, w, h);
  head(g, 'Hasil per tugas', 'Review Past Tense', 30, 50, { ts: 32 });
  g.pill('Ujian mini', 30, 108, { bg: TG.sageSoft, fg: TG.sage2, s: 14 });
  g.pill('Timer 8 mnt · diacak', 150, 108, { bg: TG.paper, fg: TG.muted, s: 14, line: TG.line });
  const n = Math.round(s.done ?? 0);
  g.t(`${n}`, 30, 212, { w: 800, s: 64, c: TG.sage, ls: -1.5 });
  g.t('/32 selesai', 34 + g.mw(`${n}`, 800, 64, -1.5), 212, { w: 700, s: 24, c: TG.muted });
  g.bar(30, 234, w - 60, 12, n / 32, TG.sage, TG.line);
  const rows = [['Rina', 90], ['Dimas', 80], ['Sari', 100], ['Bagas', 70], ['Yoga', 60], ['Nadia', 90]];
  rows.forEach(([nm, v], i) => {
    const y = 276 + i * 70, vis = (s.rows ?? 6) > i; if (!vis) return;
    g.avatar(nm, 30, y + 6, 40);
    g.t(nm, 84, y + 33, { w: 700, s: 19, c: TG.text });
    const flag = nm === 'Yoga' && (s.focus ?? 0) > 0;
    if (flag) { g.x.globalAlpha = s.focus; g.pill('Keluar layar 1× · 14 dtk', 170, y + 10, { bg: TG.amberSoft, fg: TG.amberText, s: 13.5, dot: TG.amber, h: 30 }); g.x.globalAlpha = 1; }
    const c = v >= 75 ? TG.heatHi : v >= 50 ? TG.heatMid : TG.heatLo;
    g.fill(w - 110, y + 8, 80, 36, 10, c[0]); g.t(v + '%', w - 70, y + 33, { w: 700, s: 18, c: c[1], a: 'center' });
  });
  if ((s.focus ?? 0) > 0) { g.x.globalAlpha = s.focus; g.card(30, 704, w - 60, 72, 16, TG.amberSoft, null); g.wrap('Terdeteksi berpindah dari layar FIEZEL saat sesi berjalan. Tanyakan dulu ke muridnya.', 48, 734, w - 96, 22, { w: 600, s: 15, c: TG.amberText }); g.x.globalAlpha = 1; }
}

// 10 · Ringkasan hari ini (KPI)
function ringkasan(g, s) {
  const w = 520, h = 620; paperPanel(g, w, h);
  g.kicker('Selasa, 24 September', 30, 50);
  g.t('Ringkasan hari ini', 30, 94, { w: 800, s: 36, c: TG.text, ls: -0.8 });
  demoChip(g, w - 30, 30);
  g.t('Kelas 8B · Bahasa Inggris · 32 siswa', 30, 128, { w: 500, s: 17, c: TG.muted });
  const k = s.k ?? 1;
  const kp = [
    ['Perlu dibantu', Math.round(3 * k), '', TG.brick, 'siapa yang perlu disapa hari ini'],
    ['Rata-rata akurasi', Math.round(74 * k), '%', TG.sage, 'naik dari 69% minggu lalu'],
    ['Siswa aktif 7 hari', Math.round(29 * k), '/32', TG.sage, '3 belum belajar minggu ini'],
    ['Tugas berjalan', Math.round(2 * k), '', TG.amber, '1 tenggat hari Jumat'],
  ];
  kp.forEach(([lb, v, suf, col, sub], i) => {
    const x = 30 + (i % 2) * 238, y = 156 + Math.floor(i / 2) * 212, vis = (s.tiles ?? 4) > i; if (!vis) return;
    g.card(x, y, 222, 196, 22, '#fff', TG.line);
    g.fill(x + 20, y + 22, 10, 10, 5, col);
    g.t(lb, x + 38, y + 32, { w: 600, s: 15.5, c: TG.muted, maxW: 170 });
    g.t(String(v), x + 20, y + 112, { w: 800, s: 60, c: TG.text, ls: -2 });
    if (suf) g.t(suf, x + 24 + g.mw(String(v), 800, 60, -2), y + 112, { w: 700, s: 24, c: TG.muted });
    g.wrap(sub, x + 20, y + 150, 186, 20, { w: 500, s: 14.5, c: TG.muted });
  });
}

// 11 · Siapa yang perlu disapa hari ini (risk)
function sapa(g, s) {
  const w = 520, h = 600; paperPanel(g, w, h);
  g.kicker('Deteksi dini', 30, 50);
  g.wrap('Siapa yang perlu disapa hari ini', 30, 94, w - 60, 40, { w: 800, s: 33, c: TG.text, ls: -0.7 });
  const rows = [
    ['Raka', 'risiko', 'Berisiko', '8 hari tidak belajar', 'Kirim Kartu Sapa hari ini'],
    ['Yoga', 'pantau', 'Pantau', 'akurasi 48%', 'Beri 5 soal Past questions'],
    ['Fajar', 'pantau', 'Pantau', '1 tugas lewat tenggat', 'Ingatkan tugas + waktu tambahan'],
  ];
  rows.forEach(([nm, lv, lab, why, act], i) => {
    const y = 172 + i * 136, a = Math.max(0, Math.min(1, (s.rows ?? 3) - i)); if (a <= 0) return;
    g.x.globalAlpha = a;
    g.card(30, y + (1 - a) * 18, w - 60, 122, 20, '#fff', TG.line);
    const yy = y + (1 - a) * 18;
    g.avatar(nm, 50, yy + 22, 52);
    g.t(nm, 118, yy + 46, { w: 800, s: 22, c: TG.text });
    const pw = g.pill(lab, 118 + g.mw(nm, 800, 22) + 12, yy + 26, { bg: lv === 'risiko' ? TG.brickSoft : TG.amberSoft, fg: lv === 'risiko' ? TG.brick : TG.amberText, s: 12.5, up: true, ls: 0.8, h: 26 });
    void pw;
    g.t(why, 118, yy + 76, { w: 600, s: 17, c: lv === 'risiko' ? TG.brick : TG.amberText });
    g.t('→ ' + act, 118, yy + 104, { w: 500, s: 15, c: TG.muted, maxW: w - 170 });
    g.x.globalAlpha = 1;
  });
}

// 12 · Kartu sapa (pesan personal 1 ketuk) — greetingCard() di fiezel-teacher-store.js
export const SAPA_TEXT = 'Hai Raka, ini Bu Sari. Sudah 8 hari FIEZEL-mu sepi, aku kangen lihat progresmu. Nggak perlu lama — 5 soal Past tense saja hari ini (±4 menit). Kalau ada yang bikin berat, cerita ke aku ya.';
function kartusapa(g, s) {
  const w = 520, h = 660; paperPanel(g, w, h);
  g.kicker('Kartu sapa', 30, 50);
  g.t('Pesan personal 1 ketuk', 30, 92, { w: 800, s: 31, c: TG.text, ls: -0.6 });
  g.avatar('Raka', 30, 118, 44); g.t('Untuk: Raka', 86, 148, { w: 700, s: 19, c: TG.text });
  g.pill('8 hari tidak belajar', w - 30, 124, { bg: TG.brickSoft, fg: TG.brick, s: 13.5, right: true, h: 30 });
  g.card(30, 186, w - 60, 330, 20, '#fff', TG.line);
  g.wrap(SAPA_TEXT, 54, 228, w - 108, 31, { w: 500, s: 20, c: TG.text, caret: TG.sage }, s.typed ?? SAPA_TEXT.length);
  g.t('Ubah seperlunya agar terdengar seperti kamu.', 30, 546, { w: 500, s: 14.5, c: TG.muted });
  g.btn('Simpan & salin', 30, 572, { kind: 'ghost', s: 17, h: 54 });
  g.btn('Kirim via WhatsApp', w - 30, 572, { kind: 'primary', s: 17, h: 54, right: true, icon: 'send', p: s.pSend || 0 });
}

// 13 · Peta panas siswa × skill
const HEAT = [
  ['Rina', [20, 20, 90, 40, 60, 60]], ['Dimas', [40, 40, 80, 60, 80, 60]], ['Sari', [80, 100, 90, 40, 60, 60]], ['Bagas', [20, 20, 70, 40, 60, 40]],
  ['Nadia', [100, 100, 90, 60, 80, 60]], ['Fikri', [40, 40, 80, 40, 60, 40]], ['Ayu', [80, 100, 90, 60, 80, 60]], ['Rizky', [20, 20, 70, 40, 60, 40]],
  ['Putri', [100, 100, 90, 60, 80, 80]], ['Yoga', [40, 80, 80, 40, 60, 60]], ['Intan', [80, 100, 90, 60, 80, 60]], ['Aldi', [40, 80, 70, 40, 60, 40]],
];
function heatmap(g, s) {
  const w = 560, h = 800; paperPanel(g, w, h);
  g.kicker('Peta panas', 30, 50); demoChip(g, w - 30, 30);
  g.wrap('Siswa × skill — sekali lihat, tahu siapa butuh apa', 30, 92, w - 60, 36, { w: 800, s: 28, c: TG.text, ls: -0.5 });
  const cols = ['Past\ntense', 'Past\nquestions', 'Vocab', 'Listen', 'Read', 'Speak'];
  const x0 = 126, cw = (w - 30 - x0) / 6, y0 = 196, rh = 46;
  cols.forEach((c, j) => {
    const hl = j === 1 && (s.hl ?? 0) > 0;
    if (hl) { g.x.globalAlpha = s.hl; g.stroke(x0 + j * cw + 2, y0 - 50, cw - 4, rh * HEAT.length + 56, 12, TG.brick, 3); g.x.globalAlpha = 1; }
    const [a, b] = c.split('\n'); g.t(a, x0 + j * cw + cw / 2, y0 - 26 + (b ? 0 : 10), { w: 700, s: 13.5, c: hl ? TG.brick : TG.muted, a: 'center' }); if (b) g.t(b, x0 + j * cw + cw / 2, y0 - 9, { w: 700, s: 13.5, c: hl ? TG.brick : TG.muted, a: 'center' });
  });
  HEAT.forEach(([nm, vals], i) => {
    const y = y0 + i * rh;
    g.t(nm, 30, y + 30, { w: 600, s: 17, c: TG.text });
    vals.forEach((v, j) => {
      const d = (i + j) * 0.055, a = Math.max(0, Math.min(1, ((s.fill ?? 1) - d) * 5)); if (a <= 0) return;
      const c = v >= 75 ? TG.heatHi : v >= 50 ? TG.heatMid : TG.heatLo;
      g.x.globalAlpha = a; const sh = 1 - (1 - a) * 0.4;
      const cx = x0 + j * cw + cw / 2, cy = y + rh / 2;
      g.fill(cx - (cw - 6) * sh / 2, cy - (rh - 6) * sh / 2, (cw - 6) * sh, (rh - 6) * sh, 8, c[0]);
      g.t(v + '%', cx, cy + 6, { w: 700, s: 15, c: c[1], a: 'center' });
      g.x.globalAlpha = 1;
    });
  });
  g.t('+ 20 siswa lainnya', 30, y0 + HEAT.length * rh + 30, { w: 500, s: 15, c: TG.muted });
}

// 14 · Miskonsepsi utama — taksonomi di fiezel-braincore-review.js (MIS, REMEDIATION)
function miskonsepsi(g, s) {
  const w = 520, h = 640; paperPanel(g, w, h);
  g.kicker('Miskonsepsi utama kelas', 30, 50);
  g.t('Past questions', 30, 96, { w: 800, s: 36, c: TG.text, ls: -0.8 });
  g.pill('12 siswa <50%', 30, 118, { bg: TG.brickSoft, fg: TG.brick, s: 14 });
  g.wrap('Penandaan ganda yang mubazir (did + verb 2)', 30, 196, w - 60, 32, { w: 700, s: 24, c: TG.brick });
  // contoh
  g.card(30, 262, w - 60, 176, 20, '#fff', TG.line);
  g.t('Jawaban yang sering muncul', 52, 298, { w: 600, s: 14.5, c: TG.muted });
  const st = s.strike ?? 1;
  const x1 = 52; g.t('Did you ', x1, 344, { w: 700, s: 26, c: TG.text }); const wx = x1 + g.mw('Did you ', 700, 26);
  g.t('went', wx, 344, { w: 700, s: 26, c: TG.brick }); const ww = g.mw('went', 700, 26);
  g.t(' to school?', wx + ww, 344, { w: 700, s: 26, c: TG.text });
  if (st > 0) g.line(wx - 2, 335, wx - 2 + (ww + 4) * st, 335, TG.brick, 3);
  const a = s.fix ?? 1; g.x.globalAlpha = a;
  g.t('Did you ', x1, 404, { w: 700, s: 26, c: TG.text }); g.t('go', wx, 404, { w: 800, s: 26, c: TG.sage }); g.t(' to school?', wx + g.mw('go', 800, 26), 404, { w: 700, s: 26, c: TG.text });
  icon(g, 'check', w - 86, 382, 28, TG.sage, 3);
  g.x.globalAlpha = 1;
  g.t('RENCANA', 30, 482, { w: 700, s: 13.5, c: TG.muted, ls: 1.8 });
  g.card(30, 496, w - 60, 112, 20, TG.sageSoft, null);
  icon(g, 'book', 52, 520, 28, TG.sage2, 2.2);
  g.wrap('Mini lesson: Past Questions (did + verb 1)', 96, 540, w - 150, 26, { w: 700, s: 19, c: TG.sage2 });
  g.t('Buat sesi remedial →', 96, 590, { w: 600, s: 15.5, c: TG.sage });
}

// 15 · Kelompok belajar otomatis — studyGroups() serpentin
export const GROUPS = [['Sari', 'Rizky', 'Aldi', 'Hana'], ['Nadia', 'Rina', 'Joko', 'Mega'], ['Putri', 'Bagas', 'Oki', 'Laras'], ['Ayu', 'Fikri', 'Vina', 'Dewi'],
  ['Intan', 'Yoga', 'Galih', 'Tegar'], ['Maya', 'Dimas', 'Citra', 'Salsa'], ['Kirana', 'Raka', 'Irfan', 'Wulan'], ['Bima', 'Fajar', 'Lutfi', 'Nanda']];
function kelompok(g, s) {
  const w = 520, h = 560; paperPanel(g, w, h);
  g.kicker('Kelompok belajar otomatis', 30, 50);
  g.t('Tiap kelompok punya mentor', 30, 92, { w: 800, s: 30, c: TG.text, ls: -0.6 });
  g.wrap('Siswa yang kuat dipasangkan dengan yang lemah. Menjelaskan ke teman adalah latihan terbaik untuk si mentor sendiri.', 30, 132, w - 60, 24, { w: 500, s: 16, c: TG.muted });
  GROUPS.slice(0, 4).forEach((grp, i) => {
    const x = 30 + (i % 2) * 236, y = 204 + Math.floor(i / 2) * 176, a = Math.max(0, Math.min(1, (s.g ?? 4) - i)); if (a <= 0) return;
    g.x.globalAlpha = a;
    g.card(x, y, 224, 164, 16, TG.paper, TG.line);
    g.t('Kelompok ' + (i + 1), x + 16, y + 30, { w: 700, s: 14, c: TG.muted, up: true, ls: 1 });
    grp.forEach((nm, j) => {
      const yy = y + 60 + j * 27; const m = j === 0;
      if (m) g.fill(x + 10, yy - 20, 204, 28, 9, TG.amberSoft);
      g.t(nm + (m ? ' · mentor' : ''), x + 20, yy, { w: m ? 700 : 500, s: 18, c: m ? TG.amberText : TG.text });
    });
    g.x.globalAlpha = 1;
  });
}

// 16 · Remedial & pengayaan (KKM 75) + kelas paralel
function remedial(g, s) {
  const w = 520, h = 700; paperPanel(g, w, h);
  g.kicker('Remedial & pengayaan otomatis (KKM 75%)', 30, 50);
  g.t('Siapa remedial, siapa pengayaan', 30, 92, { w: 800, s: 28, c: TG.text, ls: -0.6, maxW: w - 60 });
  const col = (x, title, names, bg, fg, n) => {
    g.card(x, 124, 224, 272, 18, bg, null);
    g.t(title, x + 18, 158, { w: 800, s: 17, c: fg });
    g.t(n, x + 18, 214, { w: 800, s: 46, c: fg, ls: -1 }); g.t('siswa', x + 22 + g.mw(n, 800, 46, -1), 214, { w: 600, s: 16, c: fg });
    names.forEach((nm, i) => g.t(nm, x + 18, 252 + i * 26, { w: 500, s: 16, c: TG.text }));
  };
  col(30, 'Perlu remedial', ['Rina · 58%', 'Bagas · 61%', 'Rizky · 55%', 'Fikri · 64%', '+ 5 lainnya'], TG.brickSoft, TG.brick, '9');
  col(266, 'Pengayaan (≥90%)', ['Nadia · 94%', 'Putri · 96%', 'Sari · 92%', 'Ayu · 91%', '+ 3 lainnya'], TG.sageSoft, TG.sage2, '7');
  g.btn('Buat sesi remedial', 30, 418, { kind: 'primary', s: 17, h: 52, p: s.pRem || 0, icon: 'plus' });
  g.btn('Buat pengayaan', w - 30, 418, { kind: 'ghost', s: 17, h: 52, right: true });
  g.t('Terapkan ke kelas paralel (1 klik untuk banyak kelas)', 30, 516, { w: 600, s: 15.5, c: TG.muted });
  ['8A', '8C', '8D'].forEach((k, i) => {
    const on = (s.par ?? 0) > i;
    g.card(30 + i * 156, 534, 144, 64, 16, on ? TG.sage : '#fff', on ? null : TG.line);
    g.t('Kelas ' + k, 30 + i * 156 + 72, 574, { w: 700, s: 18, c: on ? '#fff' : TG.text, a: 'center' });
  });
  g.t(s.par >= 3 ? 'Sesi remedial disalin ke 3 kelas.' : ' ', 30, 640, { w: 600, s: 16, c: TG.sage });
}

// 17 · Laporan orang tua (rapor naratif) — parentReport()
export const ORTU_LINES = [
  ['h', 'Selamat pagi Bapak/Ibu orang tua Nadia,'],
  ['p', 'Berikut laporan singkat belajar Bahasa Inggris Nadia di kelas 8B:'],
  ['b', '• Akurasi keseluruhan: 86% — baik'],
  ['b', '• Kekuatan: Vocabulary (95%)'],
  ['b', '• Perlu latihan: Past questions (60%)'],
  ['b', '• Kehadiran 10 pertemuan terakhir: 100%'],
  ['p', 'Yang bisa dibantu di rumah: tanyakan 1 hal yang dipelajari Nadia kemarin. Cukup 5 menit.'],
];
function ortu(g, s) {
  const w = 520, h = 780; g.card(0, 0, w, h, 14, '#FBF9F4', '#E6DFD0');
  g.kicker('Laporan orang tua', 34, 52);
  g.t('Rapor naratif otomatis', 34, 94, { w: 800, s: 30, c: TG.text, ls: -0.6 });
  g.line(34, 118, w - 34, 118, TG.line, 1.5);
  let y = 158, left = s.typed ?? 9999;
  for (const [k, txt] of ORTU_LINES) {
    if (left <= 0) break;
    const o = k === 'b' ? { w: 700, s: 19, c: TG.text } : k === 'h' ? { w: 700, s: 19, c: TG.text } : { w: 500, s: 18, c: TG.muted };
    const hh = g.wrap(txt, 34, y, w - 68, 28, { ...o, caret: TG.sage }, left);
    left -= txt.length; y += hh + (k === 'b' ? 8 : 16);
  }
  g.t('Bu Sari · Guru Bahasa Inggris', 34, 648, { w: 600, s: 16, c: TG.muted });
  g.btn('Kirim via WhatsApp', 34, 680, { kind: 'primary', s: 18, h: 60, fixedW: w - 68, icon: 'send', p: s.pSend || 0 });
}

// 18 · Absensi hari ini
const ABS = [['Rina', 'H'], ['Dimas', 'H'], ['Sari', 'S'], ['Bagas', 'H'], ['Nadia', 'H'], ['Fikri', 'I'], ['Raka', 'A']];
function absen(g, s) {
  const w = 520, h = 620; paperPanel(g, w, h);
  g.kicker('Selasa, 24 September', 30, 50);
  g.t('Absensi hari ini', 30, 92, { w: 800, s: 32, c: TG.text, ls: -0.6 });
  g.btn('Semua hadir', w - 30, 58, { kind: 'primary', s: 15.5, h: 44, right: true, icon: 'check', p: s.pAll || 0 });
  const colr = { H: [TG.sage, '#fff'], S: [TG.amberSoft, TG.amberText], I: ['#E6EEF7', '#2F5E8E'], A: [TG.brickSoft, TG.brick] };
  ABS.forEach(([nm, v0], i) => {
    const y = 126 + i * 66; const v = (s.all ?? 0) > i * 0.12 + 0.01 ? 'H' : v0;
    g.avatar(nm, 30, y + 10, 42); g.t(nm, 86, y + 38, { w: 700, s: 19, c: TG.text });
    ['H', 'S', 'I', 'A'].forEach((k, j) => {
      const on = v === k, x = w - 30 - (4 - j) * 52 + 4;
      g.fill(x, y + 10, 44, 44, 14, on ? colr[k][0] : '#fff'); if (!on) g.stroke(x + 0.75, y + 10.75, 42.5, 42.5, 14, TG.line, 1.5);
      g.t(k, x + 22, y + 39, { w: 800, s: 17, c: on ? colr[k][1] : '#9A9384', a: 'center' });
    });
  });
  g.t('+ 25 siswa lainnya', 30, 600 - 10, { w: 500, s: 15, c: TG.muted });
}

// 19 · Rekap e-Rapor
function rekap(g, s) {
  const w = 520, h = 640; g.card(0, 0, w, h, 14, '#FFFFFF', '#E0D9C9');
  g.kicker('Rekap e-Rapor', 30, 50);
  g.t('Rekap Nilai — Kelas 8B', 30, 90, { w: 800, s: 28, c: TG.text, ls: -0.5 });
  g.t('Bahasa Inggris · SMP Nusantara 1 · KKM 75', 30, 118, { w: 500, s: 15, c: TG.muted });
  const cols = [['No', 30], ['Nama', 78], ['Nilai', 300], ['Status', 380]];
  g.fill(30, 140, w - 60, 44, 8, TG.paper); cols.forEach(([c, x]) => g.t(c, x + 8, 168, { w: 700, s: 15, c: TG.muted }));
  const rows = [['Rina', 58], ['Dimas', 78], ['Sari', 92], ['Bagas', 61], ['Nadia', 94], ['Fikri', 64], ['Ayu', 91], ['Rizky', 55]];
  rows.forEach(([nm, v], i) => {
    const y = 184 + i * 44, vis = (s.rows ?? 8) > i; if (!vis) return;
    g.line(30, y + 44, w - 30, y + 44, TG.line, 1);
    g.t(String(i + 1), 38, y + 29, { w: 500, s: 16, c: TG.muted }); g.t(nm, 86, y + 29, { w: 600, s: 17, c: TG.text });
    g.t(String(v), 308, y + 29, { w: 700, s: 17, c: TG.text });
    const ok = v >= 75; g.t(ok ? 'Tuntas' : 'Remedial', 388, y + 29, { w: 700, s: 16, c: ok ? TG.sage : TG.brick });
  });
  g.wrap('Dicetak dari KelasKu untuk Guru — siap diunggah ke e-Rapor Kemendikbudristek.', 30, 562, w - 60, 21, { w: 500, s: 14.5, c: TG.muted, });
  g.btn('Ekspor rekap', w - 30, 588 - 2, { kind: 'ghost', s: 14, h: 38, right: true, icon: 'download', p: s.pExp || 0 });
}

// 20 · Kurikulum Merdeka → tugas (fiezel-teacher-curriculum.js: d_g8_recount_independence)
function kurikulum(g, s) {
  const w = 520, h = 780; paperPanel(g, w, h);
  g.kicker('Kurikulum & Kompetensi', 30, 50);
  g.wrap('Kurikulum Merdeka, di dalam kelasmu', 30, 92, w - 60, 38, { w: 800, s: 30, c: TG.text, ls: -0.6 });
  const crumbs = ['Fase D (SMP)', 'Kelas 8', 'Semester 1']; let x = 30;
  crumbs.forEach((c, i) => { x += g.pill(c, x, 150, { bg: i === 2 ? TG.paper : TG.sageSoft, fg: i === 2 ? TG.muted : TG.sage2, s: 14, line: i === 2 ? TG.line : null }) + 8; });
  g.card(30, 196, w - 60, 250, 20, '#fff', TG.line);
  g.t('BAB · RECOUNT TEXT', 52, 230, { w: 700, s: 13.5, c: TG.muted, ls: 1.6 });
  g.wrap('Independence Day & School Memories', 52, 266, w - 110, 30, { w: 800, s: 23, c: TG.text });
  [['1.1', 'Simple Past Tense'], ['1.2', 'Irregular Verbs'], ['1.3', 'Time Connectives']].forEach(([n, tl], i) => {
    const y = 322 + i * 38; g.t(n, 52, y, { w: 700, s: 16, c: TG.sage }); g.t(tl, 96, y, { w: 600, s: 17, c: TG.text });
  });
  g.fill(30, 462, 224, 88, 16, TG.amberSoft);
  g.t('Apersepsi 5 Menit', 48, 498, { w: 800, s: 16, c: TG.amberText }); g.t('win → won, run → ran', 48, 526, { w: 500, s: 14.5, c: TG.amberText });
  g.fill(266, 462, 224, 88, 16, TG.brickSoft);
  g.t('Top Miskonsepsi', 284, 498, { w: 800, s: 16, c: TG.brick }); g.t('verb 1 ↔ verb 2', 284, 526, { w: 500, s: 14.5, c: TG.brick });
  g.t('Soal Siap Pakai di Bab Ini', 30, 590, { w: 600, s: 15.5, c: TG.muted });
  g.t('24', 30, 634, { w: 800, s: 38, c: TG.text }); g.t('soal · kunci & pembahasan', 82, 632, { w: 500, s: 16, c: TG.muted });
  g.btn('+ Buat Tugas', 30, 664 + 20, { kind: 'primary', s: 18, h: 56, p: s.pMake || 0 });
  g.btn('Pilih 10 Soal (Ulangan)', w - 30, 684, { kind: 'ghost', s: 15.5, h: 56, right: true, px: 16 });
}

// 21 · Braincore review — 4 langkah (fiezel-class-hub.js reviewCard)
function braincore(g, s) {
  const w = 520, h = 920; paperPanel(g, w, h);
  g.pill('VISUALISASI KONSEP', w - 30, 30, { bg: TG.ink, fg: '#EAF1EE', s: 12, right: true, ls: 1.4, h: 26, w: 700 });
  g.kicker('Braincore', 30, 50);
  g.wrap('Saran otomatis. Guru memutuskan. Murid belajar.', 30, 92, w - 60, 36, { w: 800, s: 27, c: TG.text, ls: -0.5 });
  const steps = [
    ['1 · Soal asli', () => { g.t('Did she ___ her homework last night?', 52, 0, { w: 700, s: 17.5, c: TG.text }); g.t('A. finish   B. finished   C. finishes', 52, 28, { w: 500, s: 16, c: TG.muted }); }],
    ['2 · Analisis Braincore', () => { let x = 52; x += g.pill('Past questions', x, -18, { s: 13, h: 26, px: 9 }) + 6; x += g.pill('kesulitan 0,42 · sedang', x, -18, { s: 13, h: 26, px: 9, bg: TG.paper, fg: TG.muted, line: TG.line }) + 6; g.t('“finished” — distraktor kuat · menguji: penandaan ganda', 52, 32, { w: 500, s: 15, c: TG.muted, maxW: w - 104 }); }],
    ['3 · Saran perbaikan', () => { g.wrap('Alasan distraktor diisi dari taksonomi miskonsepsi (umpan balik murid).', 52, 0, w - 104, 22, { w: 500, s: 15.5, c: TG.text }); }],
    ['4 · Soal final', () => { g.t('Disetujui guru · masuk ke set tugas', 52, 0, { w: 700, s: 16, c: TG.sage }); }],
  ];
  steps.forEach(([title, body], i) => {
    const y = 160 + i * 178, a = Math.max(0, Math.min(1, (s.step ?? 4) - i)); if (a <= 0) return;
    g.x.globalAlpha = a;
    const fin = i === 3, ap = fin && (s.ok ?? 0) > 0.5;
    g.card(30, y, w - 60, 150, 20, ap ? TG.sageSoft : '#fff', ap ? TG.sage : TG.line);
    g.t(title, 52, y + 38, { w: 800, s: 18, c: fin ? TG.sage2 : TG.text });
    g.x.save(); g.x.translate(0, y + 78); body(); g.x.restore();
    if (fin) { g.fill(w - 164, y + 16, 116, 40, 20, ap ? TG.sage : '#fff'); if (!ap) g.stroke(w - 163, y + 17, 114, 38, 19, TG.line); icon(g, 'check', w - 152, y + 24, 22, ap ? '#fff' : TG.muted, 2.6); g.t('Setujui', w - 122, y + 43, { w: 700, s: 16, c: ap ? '#fff' : TG.text }); }
    if (i < 3) { g.line(w / 2, y + 150, w / 2, y + 178, TG.line, 2.5); }
    g.x.globalAlpha = 1;
  });
}

// 22 · Pengumuman kelas (guru)
export const UMUM_TEXT = 'Besok kita bahas Past Tense lewat cerita liburan kalian. Siapkan 3 kalimat tentang kegiatan minggu lalu ya!';
function pengumuman(g, s) {
  const w = 520, h = 440; paperPanel(g, w, h);
  g.kicker('Pengumuman kelas', 30, 50);
  g.t('Satu pesan, semua kanal', 30, 92, { w: 800, s: 30, c: TG.text, ls: -0.6 });
  g.card(30, 118, w - 60, 186, 20, '#fff', TG.line);
  g.wrap(UMUM_TEXT, 52, 160, w - 104, 30, { w: 500, s: 20, c: TG.text, caret: TG.sage }, s.typed ?? UMUM_TEXT.length);
  g.btn('Kirim ke semua murid', 30, 334, { kind: 'primary', s: 18, h: 58, fixedW: w - 60, icon: 'megaphone', p: s.pSend || 0 });
}

// 23 · KelasKu murid: beranda kelas (pengumuman wali kelas, peta skill, paspor)
function muridhome(g, s) {
  const w = 520, h = 900; studentPanel(g, w, h);
  g.t('KELASKU · KELAS 8B', 30, 50, { w: 700, s: 14, c: ST.muted, ls: 1.8 });
  g.t('Hai, Nadia', 30, 92, { w: 800, s: 32, c: ST.text, ls: -0.6 });
  g.pill('Laporan terakhir terkirim ke guru', 30, 112, { bg: ST.goodSoft, fg: ST.good, s: 13.5, dot: ST.good });
  // pengumuman
  const a = s.ann ?? 1; g.x.globalAlpha = a;
  g.card(30, 164, w - 60, 196, 22, ST.accentSoft, null);
  g.avatar('Bu Sari', 52, 186, 44); g.t('Bu Sari', 108, 206, { w: 700, s: 18, c: ST.text }); g.t('wali kelas · baru saja', 108, 228, { w: 500, s: 14.5, c: ST.muted });
  g.wrap(UMUM_TEXT, 52, 272, w - 104, 27, { w: 500, s: 18, c: ST.text });
  g.x.globalAlpha = 1;
  // peta skill
  g.t('Peta skill', 30, 408, { w: 800, s: 22, c: ST.text });
  const sk = (y, lab, nm, v, col, bg) => {
    g.card(30, y, w - 60, 88, 18, bg, null);
    g.t(lab, 52, y + 32, { w: 700, s: 13, c: col, up: true, ls: 1.2 });
    g.t(nm, 52, y + 64, { w: 800, s: 20, c: ST.text });
    g.t(v + '%', w - 52, y + 62, { w: 800, s: 28, c: col, a: 'right' });
  };
  sk(424, 'Skill terkuat', 'Vocabulary', 95, ST.good, ST.goodSoft);
  sk(524, 'Perlu perhatian', 'Past questions', 46, ST.bad, ST.badSoft);
  // paspor
  g.t('Paspor Kompetensi', 30, 668, { w: 800, s: 22, c: ST.text });
  g.card(30, 684, w - 60, 188, 22, ST.soft, null);
  g.t('Recount Text', 52, 724, { w: 800, s: 20, c: ST.text }); g.t('Kelas 8 · Semester 1', 52, 750, { w: 500, s: 15, c: ST.muted });
  const st = s.stamp ?? 1;
  if (st > 0) {
    const c = g.x; c.save(); c.translate(w - 124, 780); c.rotate(-0.16); const sc = 1 + (1 - Math.min(1, st)) * 0.8; c.scale(sc, sc); c.globalAlpha = Math.min(1, st * 1.4);
    g.stroke(-74, -34, 148, 68, 14, ST.good, 3.5); g.t('TUNTAS', 0, 11, { w: 800, s: 28, c: ST.good, a: 'center', ls: 3 }); c.restore();
  }
  g.t('Bab dikuasai: 3 · Perlu latihan: 1', 52, 850, { w: 600, s: 15.5, c: ST.muted });
}

// 24 · Jurnal guru — refleksi 60 detik
export const JURNAL_TEXT = 'Metode timeline di papan ampuh untuk yesterday/ago. Rizky masih tertukar verb 1/verb 2.';
function jurnal(g, s) {
  const w = 520, h = 520; paperPanel(g, w, h);
  g.kicker('Jurnal Guru', 30, 50);
  g.t('Refleksi 60 detik', 30, 92, { w: 800, s: 32, c: TG.text, ls: -0.6 });
  g.t('Apa yang berhasil hari ini?', 30, 136, { w: 600, s: 18, c: TG.muted });
  g.card(30, 152, w - 60, 196, 20, '#fff', TG.line);
  g.wrap(JURNAL_TEXT, 52, 194, w - 104, 30, { w: 500, s: 20, c: TG.text, caret: TG.sage }, s.typed ?? JURNAL_TEXT.length);
  g.t('Tandai siswa (opsional)', 30, 386, { w: 600, s: 15, c: TG.muted });
  g.pill('Rizky', 30, 400, { bg: TG.sageSoft, fg: TG.sage2, s: 15 });
  g.btn('Simpan refleksi', 30, 448, { kind: 'primary', s: 17, h: 50, icon: 'check' });
}

// 25 · Muka slate murid (32 buah). mode: idle | notif | exam | done | dim
function slate(g, s) {
  const w = 240, h = 320;
  g.fill(0, 0, w, h, 26, s.bg || '#FFFCF6');
  g.avatar(s.name, 22, 24, 52);
  g.t(s.name, 22, 118, { w: 800, s: 34, c: ST.text, ls: -0.6, maxW: w - 40 });
  const m = s.mode || 'idle';
  if (m === 'idle') { g.t('Kelas 8B', 22, 150, { w: 600, s: 18, c: ST.muted }); g.bar(22, 262, w - 44, 10, s.v ?? 0.6, ST.gold, ST.soft); g.t('KelasKu', 22, 298, { w: 800, s: 16, c: ST.accent }); }
  if (m === 'notif') { g.pill('Tugas baru', 22, 142, { bg: ST.accentSoft, fg: ST.accent, s: 15, dot: ST.accent, h: 32 }); g.t('Review Past Tense', 22, 214, { w: 700, s: 18, c: ST.text, maxW: w - 40 }); g.t('10 soal · ujian mini', 22, 240, { w: 500, s: 15.5, c: ST.muted }); icon(g, 'bell', w - 58, 26, 34, ST.accent, 2.2); }
  if (m === 'exam') { g.pill('Ujian mini', 22, 142, { bg: ST.infoSoft, fg: ST.info, s: 15, h: 32 }); g.t(s.timer || '07:42', 22, 238, { w: 800, s: 54, c: ST.info, ls: -1 }); g.bar(22, 266, w - 44, 10, 0.3, ST.info, ST.soft); }
  if (m === 'done') { g.pill('Selesai', 22, 142, { bg: ST.goodSoft, fg: ST.good, s: 15, h: 32 }); g.t((s.score || 90) + '%', 22, 240, { w: 800, s: 60, c: ST.good, ls: -1.5 }); icon(g, 'send', w - 56, 26, 30, ST.good, 2.2); }
  if (m === 'risk') { g.pill(s.label || 'Berisiko', 22, 142, { bg: s.lv === 'pantau' ? TG.amberSoft : TG.brickSoft, fg: s.lv === 'pantau' ? TG.amberText : TG.brick, s: 14, up: true, ls: 0.8, h: 30 }); g.wrap(s.why || '', 22, 212, w - 44, 24, { w: 700, s: 18, c: s.lv === 'pantau' ? TG.amberText : TG.brick }); }
  if (m === 'sapa') { g.pill('Disapa', 22, 142, { bg: TG.sageSoft, fg: TG.sage2, s: 15, h: 32, dot: TG.sage }); g.t('Pesan dari Bu Sari', 22, 214, { w: 700, s: 17, c: ST.text }); }
  if (m === 'mentor') { g.pill('Mentor', 22, 142, { bg: TG.amberSoft, fg: TG.amberText, s: 15, h: 32 }); g.t('Kelompok ' + (s.grp || 1), 22, 214, { w: 700, s: 18, c: ST.text }); }
  if (m === 'ann') { g.pill('Pengumuman', 22, 142, { bg: ST.accentSoft, fg: ST.accent, s: 15, h: 32, dot: ST.accent }); g.t('dari Bu Sari', 22, 214, { w: 700, s: 18, c: ST.text }); g.t('wali kelas', 22, 240, { w: 500, s: 15.5, c: ST.muted }); }
  if (m === 'group') { g.t('Kelompok ' + (s.grp || 1), 22, 150, { w: 600, s: 18, c: ST.muted }); }
}

// 26 · Kartu soal mini (kipas "Buat Tugas" dari bank bab)
const QM = ['Yesterday we ___ the flag ceremony.', 'She ___ a sack race last year.', 'After that, we ___ lunch together.', 'Did you ___ the parade?', 'They ___ very happy that day.', 'I ___ my grandma in August.', 'We ___ home at five.', 'He ___ the prize for class 8B.', 'What did you ___ there?', 'The school ___ decorated.'];
function qmini(g, s) {
  const w = 240, h = 170; g.card(0, 0, w, h, 18, '#fff', TG.line);
  g.t('Soal ' + (s.n || 1), 18, 34, { w: 800, s: 17, c: TG.sage2 });
  g.pill(s.n % 3 === 0 ? 'Tantangan' : s.n % 2 ? 'Dasar' : 'Sedang', w - 16, 14, { bg: TG.paper, fg: TG.muted, s: 11.5, h: 24, px: 8, right: true, line: TG.line });
  g.wrap(QM[((s.n || 1) - 1) % QM.length], 18, 70, w - 36, 22, { w: 600, s: 16, c: TG.text });
  g.bar(18, h - 26, w - 36, 6, 0.25 + 0.07 * (s.n || 1), TG.sage, TG.line);
}

export const PANELS = {
  qmini: { w: 240, h: 170, draw: qmini, scale: 2 },
  monolith: { w: 520, h: 840, draw: monolith },
  kode: { w: 520, h: 560, draw: kode },
  gabung: { w: 520, h: 520, draw: gabung },
  join: { w: 520, h: 600, draw: join },
  tugas: { w: 520, h: 760, draw: tugas },
  kerjakan: { w: 520, h: 700, draw: kerjakan },
  soal: { w: 520, h: 640, draw: soal },
  selesai: { w: 520, h: 440, draw: selesai },
  hasil: { w: 520, h: 800, draw: hasil },
  ringkasan: { w: 520, h: 620, draw: ringkasan },
  sapa: { w: 520, h: 600, draw: sapa },
  kartusapa: { w: 520, h: 660, draw: kartusapa },
  heatmap: { w: 560, h: 800, draw: heatmap },
  miskonsepsi: { w: 520, h: 640, draw: miskonsepsi },
  kelompok: { w: 520, h: 580, draw: kelompok },
  remedial: { w: 520, h: 700, draw: remedial },
  ortu: { w: 520, h: 780, draw: ortu },
  absen: { w: 520, h: 620, draw: absen },
  rekap: { w: 520, h: 640, draw: rekap },
  kurikulum: { w: 520, h: 780, draw: kurikulum },
  braincore: { w: 520, h: 920, draw: braincore },
  pengumuman: { w: 520, h: 440, draw: pengumuman },
  muridhome: { w: 520, h: 900, draw: muridhome },
  jurnal: { w: 520, h: 520, draw: jurnal },
  slate: { w: 240, h: 320, draw: slate, scale: 2 },
};
