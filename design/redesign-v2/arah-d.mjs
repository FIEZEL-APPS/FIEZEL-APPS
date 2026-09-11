/* ARAH D — "Blok Warna".
   Tidak ada kartu sama sekali: layar disusun dari pita warna penuh dari tepi ke
   tepi. Huruf Archivo tebal dengan tracking rapat, warna jenuh, maskot tampil
   besar satu per layar. Paling berani, paling dekat ke referensi kedua. */
import { dcArah, tautanHuruf, maskot, bayangan, S, ic, NAV, TOP_SAFE,
  PHONE_W, PHONE_H } from './arah-kit.mjs';

const HURUF = [['Archivo', [400, 500, 600, 700, 800]]];
const TAUTAN = tautanHuruf(HURUF);
const BADAN = "'Archivo',system-ui,sans-serif";

const T = {
  tinta: '#161310', krem: '#FFF6E4',
  hijau: '#14402F', sun: '#FFC42E', toska: '#3EBFA8', blush: '#FF9DB0',
  ungu: '#B9A7F0', jingga: '#FF9455'
};

const css = `
    body { color: ${T.tinta}; }
    h1, h2, h3 { font-weight: 800; letter-spacing: -0.035em; line-height: 1.02; }
    .pita { padding: 0 22px; }`;

const halaman = (body) => dcArah({ bg: T.krem, huruf: BADAN, tautan: TAUTAN, css, body });

/* Pita: satu blok warna penuh dari tepi ke tepi. */
function pita(bg, isi, opt = {}) {
  const { h = null, pad = '20px 22px', extra = '' } = opt;
  return `<div style="background: ${bg}; padding: ${pad};${h ? ` height: ${h}px;` : ''}`
    + ` position: relative; overflow: hidden; ${extra}">${isi}</div>`;
}

function nav(aktif) {
  const item = NAV.map((n, i) => {
    const on = i === aktif;
    return `<div style="${S.col(4, ' align-items: center; flex: 1;')}">
      ${ic(n.icon, 20, on ? T.sun : 'rgba(255,246,228,.5)', on ? 2.6 : 2)}
      <span style="font-size: 9.5px; font-weight: ${on ? 800 : 500};
        color: ${on ? T.sun : 'rgba(255,246,228,.5)'};">${n.label}</span>
    </div>`;
  }).join('');
  return `<div style="background: ${T.tinta}; height: 80px; padding: 13px 8px 0 8px;
    ${S.row(0, ' justify-content: space-between; align-items: flex-start;')}">${item}</div>`;
}

function kolom(isiHtml) {
  return `<div style="width: ${PHONE_W}px; height: ${PHONE_H}px; display: flex;
    flex-direction: column;">${isiHtml}</div>`;
}

function label(t, warna) {
  return `<span style="font-size: 10.5px; font-weight: 700; letter-spacing: .16em;
    text-transform: uppercase; color: ${warna};">${t}</span>`;
}

/* ---------- Hari ini ---------- */
export function Home() {
  const kepala = pita(T.hijau, `
    <div style="${S.row(0, ` justify-content: space-between; align-items: center;`
      + ` padding-top: ${TOP_SAFE - 20}px;`)}">
      <div>
        ${label('Selasa, 11 September', 'rgba(255,246,228,.6)')}
        <h2 style="margin-top: 7px; font-size: 26px; color: ${T.krem};">Halo, Rani</h2>
      </div>
      <span style="${S.row(7, ` padding: 9px 14px; background: ${T.sun};`)}">
        ${ic('flame', 15, T.tinta, 2.8)}<b style="font-size: 14px;">7</b>
      </span>
    </div>`, { pad: '0 22px 20px 22px' });

  const fokus = pita(T.sun, `
    <div style="${S.row(0, ' align-items: flex-end; height: 100%;')}">
      <div style="${S.col(0, ' flex: 1; min-width: 0; height: 100%; justify-content: space-between;'
        + ' padding-bottom: 4px;')}">
        ${label('Fokus hari ini', 'rgba(22,19,16,.55)')}
        <div>
        <h1 style="font-size: 34px;">Present<br>Simple</h1>
        <p style="margin-top: 10px; font-size: 12.5px; font-weight: 600; color: rgba(22,19,16,.7);">
          Grammar · A2 · 10 soal</p>
        <span style="${S.row(9, ` margin-top: 16px; width: fit-content; height: 50px; padding: 0 22px;`
          + ` justify-content: center; background: ${T.tinta}; color: ${T.sun};`
          + ` font-weight: 700; font-size: 15px;`)}">
          <span>Mulai sesi</span>${ic('arrow-right', 18, T.sun, 2.8)}</span>
        </div>
      </div>
      <span style="${S.col(0, ' align-items: center; flex: none;')}">
        ${maskot('hat-peek.webp', 226)}
        ${bayangan(120, .18, '22,19,16')}
      </span>
    </div>`, { h: 300, pad: '18px 22px 14px 22px' });

  const angka = `<div style="${S.row(0)}">
    <div style="${S.col(4, ` flex: 1; background: ${T.toska}; padding: 16px 20px;`)}">
      ${label('Sesi hari ini', 'rgba(22,19,16,.55)')}
      <b style="font-size: 30px; font-weight: 800; letter-spacing: -0.03em;">2<span
        style="font-size: 17px; opacity: .55;">/3</span></b>
    </div>
    <div style="${S.col(4, ` flex: 1; background: ${T.blush}; padding: 16px 20px;`)}">
      ${label('Tingkat', 'rgba(22,19,16,.55)')}
      <b style="font-size: 30px; font-weight: 800; letter-spacing: -0.03em;">A2<span
        style="font-size: 15px; opacity: .6;"> 68%</span></b>
    </div>
  </div>`;

  const lanjut = pita(T.krem, `
    ${label('Lanjutkan', 'rgba(22,19,16,.5)')}
    <div style="${S.col(0, ' margin-top: 12px;')}">
      <div style="${S.row(13, ` padding: 13px 0; border-bottom: 2px solid rgba(22,19,16,.1);`)}">
        <span style="${S.row(0, ` justify-content: center; width: 38px; height: 38px;`
          + ` background: ${T.ungu}; flex: none;`)}">${ic('book-a', 18, T.tinta, 2.4)}</span>
        <span style="${S.col(2, ' flex: 1; min-width: 0;')}">
          <b style="font-size: 14.5px; font-weight: 700;">Makanan &amp; minuman</b>
          <span style="font-size: 11.5px; font-weight: 500; color: rgba(22,19,16,.6);">Kosakata · 12 dari 20</span>
        </span>
        ${ic('arrow-right', 18, T.tinta, 2.6)}
      </div>
      <div style="${S.row(13, ` padding: 13px 0; border-bottom: 2px solid rgba(22,19,16,.1);`)}">
        <span style="${S.row(0, ` justify-content: center; width: 38px; height: 38px;`
          + ` background: ${T.jingga}; flex: none;`)}">${ic('book-open', 18, T.tinta, 2.4)}</span>
        <span style="${S.col(2, ' flex: 1; min-width: 0;')}">
          <b style="font-size: 14.5px; font-weight: 700;">Kabar dari Bali</b>
          <span style="font-size: 11.5px; font-weight: 500; color: rgba(22,19,16,.6);">Membaca · 2 menit</span>
        </span>
        ${ic('arrow-right', 18, T.tinta, 2.6)}
      </div>
      <div style="${S.row(13, ' padding: 13px 0;')}">
        <span style="${S.row(0, ` justify-content: center; width: 38px; height: 38px;`
          + ` background: ${T.toska}; flex: none;`)}">${ic('mic', 18, T.tinta, 2.4)}</span>
        <span style="${S.col(2, ' flex: 1; min-width: 0;')}">
          <b style="font-size: 14.5px; font-weight: 700;">Perkenalan diri</b>
          <span style="font-size: 11.5px; font-weight: 500; color: rgba(22,19,16,.6);">Berbicara · 1 menit</span>
        </span>
        ${ic('arrow-right', 18, T.tinta, 2.6)}
      </div>
    </div>`, { extra: 'flex: 1;' });

  return halaman(kolom(kepala + fokus + angka + lanjut + nav(2)));
}

/* ---------- Latihan ---------- */
export function Latihan() {
  const kepala = pita(T.tinta, `
    <div style="padding-top: ${TOP_SAFE - 20}px;">
      ${label('Enam ranah latihan', 'rgba(255,246,228,.55)')}
      <h1 style="margin-top: 9px; font-size: 34px; color: ${T.krem};">Latihan</h1>
    </div>`, { pad: '0 22px 22px 22px' });

  const baris = (bg, icon, nama, meta, angka) =>
    `<div style="${S.row(14, ` background: ${bg}; padding: 17px 22px; flex: 1; min-height: 0;`)}">
      ${ic(icon, 22, T.tinta, 2.5)}
      <span style="${S.col(2, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 17px; font-weight: 800; letter-spacing: -0.02em;">${nama}</b>
        <span style="font-size: 11.5px; font-weight: 500; color: rgba(22,19,16,.65);">${meta}</span>
      </span>
      <b style="font-size: 19px; font-weight: 800; letter-spacing: -0.03em;">${angka}</b>
    </div>`;

  const kilat = pita(T.sun, `
    <div style="${S.row(13, ' align-items: center;')}">
      <span style="${S.row(0, ` justify-content: center; width: 44px; height: 44px;`
        + ` background: ${T.tinta}; flex: none;`)}">${ic('zap', 22, T.sun, 2.6)}</span>
      <span style="${S.col(2, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 19px; font-weight: 800; letter-spacing: -0.025em;">Sesi Kilat</b>
        <span style="font-size: 11.5px; font-weight: 600; color: rgba(22,19,16,.7);">
          10 soal campur · 3 menit</span>
      </span>
      ${ic('arrow-right', 20, T.tinta, 2.8)}
    </div>`, { pad: '18px 22px' });

  const ranah = `<div style="flex: 1; min-height: 0; display: flex; flex-direction: column;">
    ${baris('#9AD7F0', 'spell-check-2', 'Grammar', 'Lesson 12 dari 129', '24%')}
    ${baris(T.sun, 'book-a', 'Kosakata', '18 kata perlu diulang', '64%')}
    ${baris(T.blush, 'headphones', 'Menyimak', '3 audio baru', '72%')}
    ${baris(T.toska, 'mic', 'Berbicara', 'Rekam di perangkat', '40%')}
    ${baris(T.ungu, 'book-open', 'Membaca', '1 bacaan baru', '55%')}
    ${baris(T.jingga, 'book-open-text', 'Menulis', 'Prompt mingguan', '30%')}
  </div>`;
  return halaman(kolom(kepala + kilat + ranah + nav(0)));
}

/* ---------- Soal ---------- */
export function Soal() {
  const atas = pita(T.tinta, `
    <div style="${S.row(13, ` align-items: center; padding-top: ${TOP_SAFE - 18}px;`)}">
      ${ic('x', 20, T.krem, 2.6)}
      <span style="flex: 1; height: 8px; background: rgba(255,246,228,.22); overflow: hidden;">
        <span style="display: block; width: 40%; height: 100%; background: ${T.sun};"></span></span>
      <b style="font-size: 13px; color: ${T.sun};">4/10</b>
    </div>`, { pad: '0 22px 18px 22px' });

  const soal = pita(T.sun, `
    ${label('Lengkapi kalimatnya', 'rgba(22,19,16,.55)')}
    <p style="margin-top: 12px; font-size: 26px; font-weight: 700; letter-spacing: -0.03em;
      line-height: 1.28;">
      She <span style="border-bottom: 4px solid ${T.tinta}; padding: 0 18px;">&nbsp;</span>
      to school by bus every morning.</p>
    <span style="${S.row(8, ` margin-top: 16px; width: fit-content; padding: 9px 15px;`
      + ` background: ${T.tinta}; color: ${T.sun};`)}">
      ${ic('volume-2', 15, T.sun, 2.4)}
      <span style="font-size: 12px; font-weight: 700;">Dengarkan</span></span>`,
    { pad: '20px 22px 22px 22px' });

  const opsi = (bg, k, teks, on) =>
    `<div style="${S.row(14, ` background: ${bg}; padding: 16px 22px; flex: 1; min-height: 0;`
      + (on ? ` box-shadow: inset 0 0 0 4px ${T.tinta};` : ''))}">
      <span style="${S.row(0, ` justify-content: center; width: 30px; height: 30px;`
        + ` background: ${on ? T.tinta : 'rgba(22,19,16,.12)'}; color: ${on ? bg : T.tinta};`
        + ` font-weight: 800; font-size: 13px; flex: none;`)}">${k}</span>
      <span style="font-size: 17px; font-weight: 700; letter-spacing: -0.02em;">${teks}</span>
    </div>`;

  const kaki = `<div style="${S.row(0, ` background: ${T.krem}; height: 156px; flex: none;`
    + ' align-items: flex-end; padding: 0 22px 20px 22px;')}">
    <span style="${S.col(0, ' align-items: center; flex: none;')}">
      ${maskot('full-thinking.webp', 104)}
    </span>
    <span style="${S.row(9, ` flex: 1; height: 54px; justify-content: center; margin-left: 12px;`
      + ` margin-bottom: 6px; background: ${T.tinta}; color: ${T.sun};`
      + ` font-weight: 800; font-size: 16px; letter-spacing: -0.02em;`)}">
      <span>PERIKSA</span>${ic('arrow-right', 18, T.sun, 2.8)}</span>
  </div>`;

  const pilihan = `<div style="flex: 1; min-height: 0; display: flex; flex-direction: column;">
    ${opsi(T.krem, 'A', 'go', false)}
    ${opsi('#FFE9A8', 'B', 'goes', true)}
    ${opsi(T.krem, 'C', 'going', false)}
    ${opsi(T.krem, 'D', 'is go', false)}
  </div>`;
  return halaman(kolom(atas + soal + pilihan + kaki));
}
