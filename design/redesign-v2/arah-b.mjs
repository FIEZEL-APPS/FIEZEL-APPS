/* ARAH B — "Lembut".
   Tanpa garis tepi sama sekali: kedalaman datang dari bayangan halus dan ruang
   kosong. Huruf Quicksand yang membulat, pastel yang diredam, elemen lebih
   sedikit per layar. Paling tenang; paling tidak ramai. */
import { dcArah, tautanHuruf, isi, maskot, bayangan, cahaya, S, ic, NAV } from './arah-kit.mjs';

const HURUF = [['Quicksand', [500, 600, 700]], ['Nunito', [400, 500, 600, 700]]];
const TAUTAN = tautanHuruf(HURUF);
const BADAN = "'Nunito',system-ui,sans-serif";
const JUDUL = "'Quicksand','Nunito',system-ui,sans-serif";

const T = {
  bg: '#FBF7F3', kertas: '#FFFFFF', tinta: '#2E2724', redup: '#6E635C', samar: '#7E736B',
  aksen: '#9B3A4A', aksenLembut: '#F6E9EB'
};
const D = {
  vocab: { bg: '#F7EACB', ink: '#7A5512', icon: 'book-a', label: 'Kosakata' },
  grammar: { bg: '#D8E8F4', ink: '#2A566F', icon: 'spell-check-2', label: 'Grammar' },
  reading: { bg: '#E5DDF3', ink: '#523E86', icon: 'book-open', label: 'Membaca' },
  listen: { bg: '#F8DDE3', ink: '#963C54', icon: 'headphones', label: 'Menyimak' },
  speak: { bg: '#D5EBE5', ink: '#1D5C52', icon: 'mic', label: 'Berbicara' },
  write: { bg: '#F8E2D2', ink: '#8C4C1D', icon: 'book-open-text', label: 'Menulis' }
};

const LEMBUT = 'box-shadow: 0 14px 32px rgba(46,39,36,.07), 0 2px 6px rgba(46,39,36,.04);';

const css = `
    body { color: ${T.tinta}; }
    h1, h2, h3 { font-family: ${JUDUL}; font-weight: 700; letter-spacing: -0.015em; line-height: 1.18; }`;

const halaman = (body) => dcArah({ bg: T.bg, huruf: BADAN, tautan: TAUTAN, css, body });

function nav(aktif) {
  const item = NAV.map((n, i) => {
    const on = i === aktif;
    return `<div style="${S.col(5, ' align-items: center; flex: 1;')}">
      ${ic(n.icon, 21, on ? T.aksen : T.samar, on ? 2.4 : 1.9)}
      <span style="width: ${on ? 16 : 0}px; height: 3px; border-radius: 999px;
        background: ${T.aksen}; display: block;"></span>
    </div>`;
  }).join('');
  return `<div style="position: absolute; left: 26px; right: 26px; bottom: 22px; height: 64px;
    background: ${T.kertas}; border-radius: 32px; ${LEMBUT}
    ${S.row(0, ' justify-content: space-between; padding: 0 10px;')}">${item}</div>`;
}

/* ---------- Hari ini ---------- */
export function Home() {
  const lanjut = (d, judul, meta, pct) =>
    `<div style="${S.col(0, ` flex: 1; min-width: 0; padding: 16px; border-radius: 26px;`
      + ` background: ${d.bg};`)}">
      ${ic(d.icon, 19, d.ink, 2.1)}
      <b style="margin-top: 12px; font-family: ${JUDUL}; font-weight: 700; font-size: 14.5px;
        color: ${d.ink}; line-height: 1.25; display: block;">${judul}</b>
      <span style="margin-top: 3px; font-size: 11.5px; font-weight: 600; color: ${d.ink};
        opacity: .72;">${meta}</span>
      <span style="display: block; margin-top: 12px; height: 5px; border-radius: 999px;
        background: rgba(255,255,255,.7); overflow: hidden;">
        <span style="display: block; width: ${pct}%; height: 100%; background: ${d.ink};
          opacity: .55;"></span></span>
    </div>`;

  const body = isi(`
    <div style="${S.row(0, ' justify-content: space-between; align-items: flex-start;')}">
      <div>
        <span style="font-size: 12.5px; font-weight: 600; color: ${T.samar};">Selasa, 11 September</span>
        <h1 style="margin-top: 5px; font-size: 29px;">Halo, Rani</h1>
      </div>
      <span style="${S.row(7, ` padding: 9px 14px; border-radius: 999px; background: ${T.kertas}; ${LEMBUT}`)}">
        ${ic('flame', 15, T.aksen, 2.2)}<b style="font-size: 13px;">7</b>
      </span>
    </div>

    <div style="position: relative; margin-top: 20px; padding: 20px; border-radius: 34px;
      background: ${T.kertas}; ${LEMBUT} overflow: hidden;">
      ${cahaya(170, -70, 260, 'rgba(155,58,74,.09)')}
      <div style="${S.row(6, ' position: relative; align-items: flex-end;')}">
        <div style="${S.col(0, ' flex: 1; min-width: 0;')}">
          <span style="font-size: 11px; font-weight: 700; letter-spacing: .08em;
            text-transform: uppercase; color: ${T.samar};">Fokus hari ini</span>
          <h2 style="margin-top: 9px; font-size: 22px;">Present Simple<br>untuk kebiasaan</h2>
          <p style="margin-top: 8px; font-size: 12px; font-weight: 600; color: ${T.redup};">
            Grammar · A2 · 10 soal</p>
          <span style="${S.row(8, ` margin-top: 16px; width: fit-content; height: 48px; padding: 0 22px;`
            + ` justify-content: center; border-radius: 999px; background: ${T.aksen}; color: #FFF;`
            + ` font-family: ${JUDUL}; font-weight: 700; font-size: 15px;`
            + ` box-shadow: 0 8px 18px rgba(155,58,74,.28);`)}">
            <span>Mulai sesi</span>${ic('arrow-right', 17, '#FFF', 2.4)}</span>
        </div>
        <span style="${S.col(0, ' align-items: center; flex: none;')}">
          ${maskot('shoulder-wave.webp', 158)}
          ${bayangan(88, .16, '46,39,36')}
        </span>
      </div>
    </div>

    <div style="${S.row(12, ' margin-top: 16px;')}">
      <div style="${S.row(13, ` flex: 1; min-width: 0; padding: 15px 16px; border-radius: 26px;`
        + ` background: ${T.kertas}; ${LEMBUT}`)}">
        <span style="${S.row(0, ` justify-content: center; width: 44px; height: 44px; border-radius: 50%;`
          + ` background: ${T.aksenLembut}; color: ${T.aksen}; font-family: ${JUDUL}; font-weight: 700;`
          + ` font-size: 13px; flex: none;`)}">2/3</span>
        <span style="${S.col(2, ' min-width: 0;')}">
          <b style="font-size: 13.5px;">Sesi hari ini</b>
          <span style="font-size: 11.5px; font-weight: 600; color: ${T.samar};">1 lagi</span>
        </span>
      </div>
      <div style="${S.col(2, ` width: 118px; flex: none; padding: 15px 16px; border-radius: 26px;`
        + ` background: ${T.kertas}; ${LEMBUT}`)}">
        <span style="${S.row(6)}">
          <b style="font-family: ${JUDUL}; font-weight: 700; font-size: 21px;">A2</b>
          <span style="font-size: 11px; font-weight: 700; color: ${D.speak.ink};">68%</span>
        </span>
        <span style="font-size: 11.5px; font-weight: 600; color: ${T.samar};">menuju B1</span>
      </div>
    </div>

    <div style="${S.row(0, ' justify-content: space-between; align-items: baseline; margin-top: 20px;')}">
      <h3 style="font-size: 18px;">Lanjutkan</h3>
      <span style="font-size: 12.5px; font-weight: 700; color: ${T.aksen};">Semua</span>
    </div>
    <div style="${S.row(12, ' margin-top: 11px;')}">
      ${lanjut(D.vocab, 'Makanan &amp; minuman', '12 dari 20', 60)}
      ${lanjut(D.reading, 'Kabar dari Bali', '2 menit', 25)}
    </div>

    <div style="${S.row(14, ` margin-top: 16px; padding: 15px 18px; border-radius: 28px;`
      + ` background: ${T.kertas}; ${LEMBUT}`)}">
      <span style="${S.col(0, ' align-items: center; flex: none;')}">
        ${maskot('head-explain.webp', 52)}
      </span>
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-family: ${JUDUL}; font-weight: 700; font-size: 15.5px;">Tanya Mira</b>
        <span style="font-size: 11.5px; font-weight: 600; color: ${T.redup}; line-height: 1.4;">
          Bingung soal tadi? Tanya pelan-pelan.</span>
      </span>
      ${ic('arrow-right', 19, T.samar, 2.2)}
    </div>
  `, 24);
  return halaman(body + nav(2));
}

/* ---------- Latihan ---------- */
export function Latihan() {
  const ubin = (d, meta, pct) =>
    `<div style="${S.col(0, ` padding: 18px; border-radius: 28px; background: ${d.bg}; min-height: 132px;`)}">
      <span style="${S.row(0, ` justify-content: center; width: 42px; height: 42px; border-radius: 50%;`
        + ` background: rgba(255,255,255,.75);`)}">${ic(d.icon, 20, d.ink, 2.1)}</span>
      <b style="margin-top: 13px; font-family: ${JUDUL}; font-weight: 700; font-size: 16px;
        color: ${d.ink};">${d.label}</b>
      <span style="margin-top: 3px; font-size: 11.5px; font-weight: 600; color: ${d.ink};
        opacity: .75;">${meta}</span>
      <span style="display: block; margin-top: auto; padding-top: 12px;">
        <span style="display: block; height: 5px; border-radius: 999px; background: rgba(255,255,255,.75);
          overflow: hidden;"><span style="display: block; width: ${pct}%; height: 100%;
          background: ${d.ink}; opacity: .55;"></span></span></span>
    </div>`;

  const body = isi(`
    <h1 style="font-size: 29px;">Latihan</h1>
    <p style="margin-top: 7px; font-size: 14px; font-weight: 600; color: ${T.redup};">
      Pilih satu. Sepuluh menit sudah cukup.</p>

    <div style="${S.row(14, ` margin-top: 20px; padding: 18px; border-radius: 30px; background: ${T.kertas};`
      + ` ${LEMBUT}`)}">
      <span style="${S.row(0, ` justify-content: center; width: 50px; height: 50px; border-radius: 50%;`
        + ` background: ${T.aksenLembut}; flex: none;`)}">${ic('zap', 23, T.aksen, 2.2)}</span>
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-family: ${JUDUL}; font-weight: 700; font-size: 17px;">Sesi Kilat</b>
        <span style="font-size: 12px; font-weight: 600; color: ${T.redup};">10 soal campur · 3 menit</span>
      </span>
      ${ic('arrow-right', 20, T.samar, 2.2)}
    </div>

    <div style="${S.grid(2, 13, ' margin-top: 16px;')}">
      ${ubin(D.grammar, 'Lesson 12', 24)}
      ${ubin(D.vocab, '18 kata diulang', 64)}
      ${ubin(D.listen, '3 audio baru', 72)}
      ${ubin(D.speak, 'Rekam sendiri', 40)}
      ${ubin(D.reading, '1 bacaan baru', 55)}
      ${ubin(D.write, 'Prompt mingguan', 30)}
    </div>
  `, 24);
  return halaman(body + nav(0));
}

/* ---------- Soal ---------- */
export function Soal() {
  const opsi = (k, teks, on) =>
    `<div style="${S.row(14, ` height: 62px; padding: 0 18px; border-radius: 22px;`
      + ` background: ${on ? T.aksenLembut : T.kertas};`
      + (on ? ` box-shadow: inset 0 0 0 2px ${T.aksen};` : ` ${LEMBUT}`))}">
      <span style="${S.row(0, ` justify-content: center; width: 30px; height: 30px; border-radius: 50%;`
        + ` background: ${on ? T.aksen : T.bg}; color: ${on ? '#FFF' : T.redup};`
        + ` font-family: ${JUDUL}; font-weight: 700; font-size: 13px; flex: none;`)}">${k}</span>
      <span style="font-size: 16.5px; font-weight: 600;
        color: ${on ? T.aksen : T.tinta};">${teks}</span>
    </div>`;

  const body = isi(`
    <div style="${S.row(13)}">
      <span style="${S.row(0, ` justify-content: center; width: 42px; height: 42px; border-radius: 50%;`
        + ` background: ${T.kertas}; ${LEMBUT} flex: none;`)}">${ic('x', 18, T.redup, 2.2)}</span>
      <span style="flex: 1; height: 7px; border-radius: 999px; background: #ECE3DA; overflow: hidden;">
        <span style="display: block; width: 40%; height: 100%; background: ${T.aksen};"></span></span>
      <span style="font-size: 12.5px; font-weight: 700; color: ${T.samar};">4/10</span>
    </div>

    <div style="margin-top: 30px;">
      <span style="font-size: 11px; font-weight: 700; letter-spacing: .08em;
        text-transform: uppercase; color: ${T.samar};">Lengkapi kalimatnya</span>
      <div style="${S.row(15, ' margin-top: 14px; align-items: flex-start;')}">
        <span style="${S.row(0, ` justify-content: center; width: 46px; height: 46px; border-radius: 50%;`
          + ` background: ${T.kertas}; ${LEMBUT} flex: none; margin-top: 4px;`)}">
          ${ic('volume-2', 20, T.aksen, 2.2)}</span>
        <p style="font-family: ${JUDUL}; font-weight: 600; font-size: 23px; line-height: 1.45;">
          She <span style="border-bottom: 3px solid ${T.aksen}; padding: 0 16px;">&nbsp;</span>
          to school by bus every morning.</p>
      </div>
    </div>

    <div style="${S.col(11, ' margin-top: 26px;')}">
      ${opsi('A', 'go', false)}${opsi('B', 'goes', true)}
      ${opsi('C', 'going', false)}${opsi('D', 'is go', false)}
    </div>

    <div style="position: absolute; left: 0; right: 0; bottom: 30px;">
      <span style="${S.row(9, ` justify-content: center; height: 56px; border-radius: 999px;`
        + ` background: ${T.aksen}; color: #FFF; font-family: ${JUDUL}; font-weight: 700;`
        + ` font-size: 16.5px; box-shadow: 0 10px 22px rgba(155,58,74,.3);`)}">
        <span>Periksa</span>${ic('check', 18, '#FFF', 2.6)}</span>
    </div>
  `, 24);
  return halaman(body);
}
