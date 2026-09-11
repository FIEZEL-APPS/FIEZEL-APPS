/* ARAH A — "Kartu Tebal".
   Kartu bergaris tebal dengan bayangan padat tanpa blur, huruf Fredoka yang
   membulat, warna datar terang. Paling ramai dan paling ramah anak. */
import { dcArah, tautanHuruf, isi, maskot, potret, bayangan, S, ic, NAV,
  PHONE_W, PHONE_H } from './arah-kit.mjs';

const HURUF = [['Fredoka', [400, 500, 600, 700]], ['Nunito', [400, 600, 700, 800]]];
const TAUTAN = tautanHuruf(HURUF);
const BADAN = "'Nunito',system-ui,sans-serif";
const JUDUL = "'Fredoka','Nunito',system-ui,sans-serif";

const T = {
  bg: '#FFF6E9', kertas: '#FFFFFF', tinta: '#20160F', redup: '#6B5C4C',
  marun: '#8C2233', sun: '#FFC53D', krem: '#FFF6E9'
};
const D = {
  vocab: { bg: '#FFD96B', icon: 'book-a', label: 'Kosakata' },
  grammar: { bg: '#9AD0F5', icon: 'spell-check-2', label: 'Grammar' },
  reading: { bg: '#C9B8FF', icon: 'book-open', label: 'Membaca' },
  listen: { bg: '#FFACC0', icon: 'headphones', label: 'Menyimak' },
  speak: { bg: '#7EDDC9', icon: 'mic', label: 'Berbicara' },
  write: { bg: '#FFB682', icon: 'book-open-text', label: 'Menulis' }
};

const GARIS = `2.5px solid ${T.tinta}`;
const TEBAL = (dx = 5) => `box-shadow: ${dx}px ${dx}px 0 ${T.tinta};`;

const css = `
    body { color: ${T.tinta}; }
    h1, h2, h3 { font-family: ${JUDUL}; font-weight: 600; letter-spacing: -0.01em; line-height: 1.15; }
    .kartu { background: ${T.kertas}; border: ${GARIS}; border-radius: 22px; }`;

function halaman(body) {
  return dcArah({ bg: T.bg, huruf: BADAN, tautan: TAUTAN, css, body });
}

function pil(teks, opt = {}) {
  const { bg = T.marun, warna = '#FFF6E9', h = 46, icon = 'arrow-right', lebar = 'auto', fs = 15 } = opt;
  return `<span style="${S.row(8, ` justify-content: center; height: ${h}px; padding: 0 20px;`
    + ` width: ${lebar}; background: ${bg}; color: ${warna}; border: ${GARIS}; border-radius: 999px;`
    + ` font-family: ${JUDUL}; font-weight: 600; font-size: ${fs}px; ${TEBAL(4)}`)}">`
    + `<span>${teks}</span>${icon ? ic(icon, 17, warna, 2.6) : ''}</span>`;
}

function nav(aktif) {
  const item = NAV.map((n, i) => {
    const on = i === aktif;
    return `<div style="${S.col(3, ' align-items: center; flex: 1;')}">
      <span style="${S.row(0, ` justify-content: center; width: 42px; height: 30px; border-radius: 10px;`
        + ` background: ${on ? T.sun : 'transparent'}; border: ${on ? GARIS : '2.5px solid transparent'};`)}">
        ${ic(n.icon, 18, T.tinta, on ? 2.6 : 2.1)}</span>
      <span style="font-size: 10px; font-weight: ${on ? 800 : 600};
        color: ${on ? T.tinta : T.redup};">${n.label}</span>
    </div>`;
  }).join('');
  return `<div style="position: absolute; left: 16px; right: 16px; bottom: 16px; height: 72px;
    background: ${T.kertas}; border: ${GARIS}; border-radius: 22px; ${TEBAL(4)}
    ${S.row(0, ' justify-content: space-between; padding: 9px 8px;')}">${item}</div>`;
}

function eyebrow(t, warna = T.redup) {
  return `<span style="font-size: 10.5px; font-weight: 800; letter-spacing: 0.09em;
    text-transform: uppercase; color: ${warna};">${t}</span>`;
}

/* ---------- Hari ini ---------- */
export function Home() {
  const lanjut = (d, judul, meta, pct) =>
    `<div style="${S.col(0, ` flex: 1; min-width: 0; padding: 13px; border-radius: 20px;`
      + ` background: ${d.bg}; border: ${GARIS}; ${TEBAL(4)}`)}">
      <span style="${S.row(0, ' justify-content: space-between;')}">
        ${ic(d.icon, 18, T.tinta, 2.4)}
        <span style="font-size: 11px; font-weight: 800;">${meta}</span>
      </span>
      <b style="margin-top: 10px; font-family: ${JUDUL}; font-weight: 600; font-size: 14px;
        line-height: 1.2; display: block;">${judul}</b>
      <span style="display: block; margin-top: 9px; height: 8px; border-radius: 999px;
        background: rgba(32,22,15,.14); overflow: hidden;">
        <span style="display: block; width: ${pct}%; height: 100%; background: ${T.tinta};"></span></span>
    </div>`;

  const skill = (d) =>
    `<div style="${S.col(5, ` align-items: center; padding: 10px 6px; border-radius: 16px;`
      + ` background: ${d.bg}; border: ${GARIS};`)}">
      ${ic(d.icon, 18, T.tinta, 2.4)}
      <span style="font-size: 10px; font-weight: 800; white-space: nowrap;">${d.label}</span>
    </div>`;

  const body = isi(`
    <div style="${S.row(0, ' justify-content: space-between;')}">
      <span style="${S.row(11)}">
        <span style="width: 48px; height: 48px; border-radius: 16px; background: ${T.sun};
          border: ${GARIS}; display: flex; align-items: flex-end; justify-content: center;
          overflow: hidden; flex: none;">
          ${maskot('head-happy.webp', 42)}
        </span>
        <span style="${S.col(1)}">
          <b style="font-family: ${JUDUL}; font-weight: 600; font-size: 18px;">Halo, Rani</b>
          <span style="font-size: 11.5px; font-weight: 600; color: ${T.redup};">Selasa, 11 September</span>
        </span>
      </span>
      <span style="${S.row(7, ` padding: 7px 12px; border-radius: 999px; background: ${T.sun};`
        + ` border: ${GARIS};`)}">
        ${ic('flame', 15, T.tinta, 2.6)}<b style="font-size: 13px;">7</b>
      </span>
    </div>

    <div style="${S.row(12, ` margin-top: 14px; padding: 16px; border-radius: 24px; background: ${T.sun};`
      + ` border: ${GARIS}; ${TEBAL()} align-items: flex-end;`)}">
      <div style="${S.col(0, ' flex: 1; min-width: 0;')}">
        ${eyebrow('Fokus hari ini', 'rgba(32,22,15,.62)')}
        <h2 style="margin-top: 7px; font-size: 21px;">Present Simple<br>untuk kebiasaan</h2>
        <p style="margin-top: 7px; font-size: 11.5px; font-weight: 700; color: rgba(32,22,15,.7);">
          Grammar · A2 · 10 soal
        </p>
        <div style="margin-top: 13px;">${pil('Mulai sesi')}</div>
      </div>
      ${maskot('hat-peek.webp', 168)}
    </div>

    <div style="${S.row(10, ' margin-top: 13px;')}">
      <div class="kartu" style="${S.row(10, ' flex: 1; min-width: 0; padding: 11px 13px;')}">
        <span style="${S.row(0, ` justify-content: center; width: 38px; height: 38px; border-radius: 12px;`
          + ` background: ${D.speak.bg}; border: ${GARIS}; font-family: ${JUDUL}; font-weight: 600;`
          + ` font-size: 12.5px; flex: none;`)}">2/3</span>
        <span style="${S.col(1, ' min-width: 0;')}">
          <b style="font-size: 13px;">Sesi hari ini</b>
          <span style="font-size: 10.5px; font-weight: 600; color: ${T.redup};">1 lagi</span>
        </span>
      </div>
      <div class="kartu" style="${S.col(1, ' width: 112px; flex: none; padding: 11px 13px;')}">
        <span style="${S.row(6)}">
          <b style="font-family: ${JUDUL}; font-weight: 600; font-size: 19px;">A2</b>
          <span style="font-size: 10.5px; font-weight: 800; color: ${T.marun};">68%</span>
        </span>
        <span style="font-size: 10.5px; font-weight: 600; color: ${T.redup};">menuju B1</span>
      </div>
    </div>

    <div style="${S.row(0, ' justify-content: space-between; align-items: baseline; margin-top: 15px;')}">
      <h3 style="font-size: 17px;">Lanjutkan</h3>
      <span style="font-size: 12px; font-weight: 800; color: ${T.marun};">Semua</span>
    </div>
    <div style="${S.row(10, ' margin-top: 9px;')}">
      ${lanjut(D.vocab, 'Makanan &amp; minuman', '12/20', 60)}
      ${lanjut(D.reading, 'Kabar dari Bali', '2 mnt', 25)}
    </div>

    <h3 style="font-size: 17px; margin-top: 15px;">Empat skill inti tes</h3>
    <div style="${S.grid(4, 8, ' margin-top: 9px;')}">
      ${skill(D.listen)}${skill(D.speak)}${skill(D.reading)}${skill(D.write)}
    </div>
  `);
  return halaman(body + nav(2));
}

/* ---------- Latihan ---------- */
export function Latihan() {
  const ubin = (d, meta) =>
    `<div style="${S.col(0, ` padding: 14px; border-radius: 20px; background: ${d.bg};`
      + ` border: ${GARIS}; ${TEBAL(4)} min-height: 126px;`)}">
      <span style="${S.row(0, ` justify-content: center; width: 38px; height: 38px; border-radius: 12px;`
        + ` background: ${T.kertas}; border: ${GARIS};`)}">${ic(d.icon, 19, T.tinta, 2.4)}</span>
      <b style="margin-top: 11px; font-family: ${JUDUL}; font-weight: 600; font-size: 16px;">${d.label}</b>
      <span style="margin-top: 2px; font-size: 11px; font-weight: 700; color: rgba(32,22,15,.72);">${meta}</span>
      <span style="${S.row(0, ' margin-top: auto; justify-content: flex-end;')}">${ic('arrow-right', 17, T.tinta, 2.8)}</span>
    </div>`;

  const body = isi(`
    <div style="${S.row(0, ' justify-content: space-between; align-items: center;')}">
      <h1 style="font-size: 28px;">Latihan</h1>
      <span style="${S.row(6, ` padding: 8px 13px; border-radius: 999px; background: ${T.kertas};`
        + ` border: ${GARIS}; font-size: 12.5px; font-weight: 800;`)}">
        ${ic('sliders-horizontal', 14, T.tinta, 2.6)}Level A2</span>
    </div>
    <p style="margin-top: 5px; font-size: 13.5px; font-weight: 600; color: ${T.redup};">
      Pilih skill, mulai dalam satu ketukan.</p>

    <div style="${S.row(12, ` margin-top: 14px; padding: 14px; border-radius: 22px; background: ${T.sun};`
      + ` border: ${GARIS}; ${TEBAL()}`)}">
      <span style="${S.row(0, ` justify-content: center; width: 44px; height: 44px; border-radius: 14px;`
        + ` background: ${T.tinta}; flex: none;`)}">${ic('zap', 22, T.sun, 2.6)}</span>
      <span style="${S.col(2, ' flex: 1; min-width: 0;')}">
        <b style="font-family: ${JUDUL}; font-weight: 600; font-size: 17px;">Sesi Kilat</b>
        <span style="font-size: 11.5px; font-weight: 700; color: rgba(32,22,15,.72);">
          10 soal campur · 3 menit</span>
      </span>
      ${ic('arrow-right', 20, T.tinta, 2.8)}
    </div>

    <div style="${S.grid(2, 11, ' margin-top: 14px;')}">
      ${ubin(D.grammar, 'Lesson 12 dari 129')}
      ${ubin(D.vocab, '18 kata diulang')}
      ${ubin(D.listen, '3 audio baru')}
      ${ubin(D.speak, 'Rekam di perangkat')}
      ${ubin(D.reading, '1 bacaan baru')}
      ${ubin(D.write, 'Prompt mingguan')}
    </div>
  `);
  return halaman(body + nav(0));
}

/* ---------- Soal ---------- */
export function Soal() {
  const opsi = (k, teks, on) =>
    `<div style="${S.row(13, ` height: 58px; padding: 0 15px; border-radius: 18px;`
      + ` background: ${on ? T.sun : T.kertas}; border: ${GARIS}; ${TEBAL(on ? 4 : 3)}`)}">
      <span style="${S.row(0, ` justify-content: center; width: 30px; height: 30px; border-radius: 10px;`
        + ` background: ${on ? T.tinta : T.bg}; color: ${on ? T.sun : T.tinta}; border: ${GARIS};`
        + ` font-family: ${JUDUL}; font-weight: 600; font-size: 13px; flex: none;`)}">${k}</span>
      <span style="font-size: 16px; font-weight: 700;">${teks}</span>
    </div>`;

  const body = isi(`
    <div style="${S.row(11)}">
      <span style="${S.row(0, ` justify-content: center; width: 40px; height: 40px; border-radius: 13px;`
        + ` background: ${T.kertas}; border: ${GARIS}; flex: none;`)}">${ic('x', 18, T.tinta, 2.6)}</span>
      <span style="flex: 1; height: 14px; border-radius: 999px; background: ${T.kertas};
        border: ${GARIS}; overflow: hidden;">
        <span style="display: block; width: 40%; height: 100%; background: ${T.sun};
          border-right: ${GARIS};"></span></span>
      <span style="${S.row(6, ` padding: 7px 12px; border-radius: 999px; background: ${T.kertas};`
        + ` border: ${GARIS}; font-size: 12.5px; font-weight: 800;`)}">
        ${ic('sparkles', 14, T.marun, 2.6)}296</span>
    </div>

    <div style="margin-top: 20px;">
      ${eyebrow('Lengkapi kalimatnya')}
      <div style="${S.row(13, ` margin-top: 10px; padding: 17px; border-radius: 22px;`
        + ` background: ${D.grammar.bg}; border: ${GARIS}; ${TEBAL()}`)}">
        <span style="${S.row(0, ` justify-content: center; width: 44px; height: 44px; border-radius: 50%;`
          + ` background: ${T.kertas}; border: ${GARIS}; flex: none;`)}">
          ${ic('volume-2', 20, T.tinta, 2.5)}</span>
        <p style="font-family: ${JUDUL}; font-weight: 500; font-size: 19px; line-height: 1.4;">
          She <span style="border-bottom: 3px solid ${T.tinta}; padding: 0 14px;">&nbsp;</span>
          to school by bus every morning.</p>
      </div>
    </div>

    <div style="${S.col(10, ' margin-top: 16px;')}">
      ${opsi('A', 'go', false)}${opsi('B', 'goes', true)}
      ${opsi('C', 'going', false)}${opsi('D', 'is go', false)}
    </div>

    <div style="${S.row(12, ' position: absolute; left: 0; right: 0; bottom: 28px; align-items: flex-end;')}">
      <span style="${S.col(2, ' align-items: center; flex: none;')}">
        ${maskot('full-thinking.webp', 108)}
        ${bayangan(70)}
      </span>
      <span style="flex: 1; margin-bottom: 8px;">${pil('Periksa', { lebar: '100%', h: 52, fs: 16, icon: 'check' })}</span>
    </div>
  `);
  return halaman(body);
}
