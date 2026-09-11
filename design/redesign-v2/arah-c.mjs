/* ARAH C — "Editorial Rimba".
   Hijau rimba jadi permukaan utama, bukan aksen. Judul berhuruf serif (Lora),
   kartu krem bergaris rambut emas, radius kecil, angka besar. Paling dewasa —
   condong ke murid SMA dan ke guru. CATATAN: serif melanggar BRAND-GUIDE
   ("tidak ada serif"); memilih arah ini berarti panduan dan gerbangnya ikut
   diperbarui. */
import { dcArah, tautanHuruf, isi, maskot, potret, bayangan, cahaya, S, ic, NAV } from './arah-kit.mjs';

const HURUF = [['Lora', [500, 600, 700]], ['Work Sans', [400, 500, 600, 700]]];
const TAUTAN = tautanHuruf(HURUF);
const BADAN = "'Work Sans',system-ui,sans-serif";
const JUDUL = "'Lora',Georgia,serif";

const T = {
  rimba: '#12372A', rimbaDalam: '#0C2620', krem: '#FBF3E4', kertas: '#FFFDF8',
  tinta: '#1E1A14', redup: '#63594A', samar: '#786C5A',
  emas: '#A8842F', emasGaris: 'rgba(168,132,47,.38)', marun: '#8C2233',
  onRimba: '#F6EDD9', onRimbaRedup: 'rgba(246,237,217,.70)'
};
const D = {
  vocab: { titik: '#B8862B', label: 'Kosakata', icon: 'book-a' },
  grammar: { titik: '#2E6285', label: 'Grammar', icon: 'spell-check-2' },
  reading: { titik: '#5B4494', label: 'Membaca', icon: 'book-open' },
  listen: { titik: '#A33A57', label: 'Menyimak', icon: 'headphones' },
  speak: { titik: '#1F6155', label: 'Berbicara', icon: 'mic' },
  write: { titik: '#94501E', label: 'Menulis', icon: 'book-open-text' }
};

const css = `
    body { color: ${T.tinta}; }
    h1, h2, h3 { font-family: ${JUDUL}; font-weight: 600; letter-spacing: -0.01em; line-height: 1.2; }
    .kartu { background: ${T.kertas}; border: 1px solid ${T.emasGaris}; border-radius: 14px; }`;

const halaman = (body, bg = T.krem) =>
  dcArah({ bg, huruf: BADAN, tautan: TAUTAN, css, body });

function nav(aktif) {
  const item = NAV.map((n, i) => {
    const on = i === aktif;
    return `<div style="${S.col(5, ' align-items: center; flex: 1;')}">
      ${ic(n.icon, 19, on ? '#E7C46A' : 'rgba(246,237,217,.55)', on ? 2.3 : 1.9)}
      <span style="font-size: 9.5px; font-weight: ${on ? 700 : 500}; letter-spacing: .02em;
        color: ${on ? '#E7C46A' : 'rgba(246,237,217,.55)'};">${n.label}</span>
    </div>`;
  }).join('');
  return `<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 82px;
    background: ${T.rimbaDalam}; padding: 12px 8px 20px 8px;
    ${S.row(0, ' justify-content: space-between; align-items: flex-start;')}">${item}</div>`;
}

function label(t, warna = T.samar) {
  return `<span style="font-size: 10px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: ${warna};">${t}</span>`;
}

/* ---------- Hari ini ---------- */
export function Home() {
  const baris = (d, judul, meta, pct) =>
    `<div style="${S.row(13, ' padding: 13px 0;')}">
      <span style="width: 8px; height: 8px; border-radius: 50%; background: ${d.titik};
        flex: none;"></span>
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 14px; font-weight: 600;">${judul}</b>
        <span style="font-size: 11.5px; color: ${T.samar};">${d.label} · ${meta}</span>
      </span>
      <span style="${S.row(9)}">
        <span style="width: 54px; height: 4px; border-radius: 999px; background: rgba(30,26,20,.1);
          overflow: hidden;"><span style="display: block; width: ${pct}%; height: 100%;
          background: ${d.titik};"></span></span>
        ${ic('chevron-right', 16, T.samar, 2)}
      </span>
    </div>`;

  /* Maskot hidup DI DALAM pita hijau dan ditambatkan ke dasarnya, jadi tidak ada
     sisi badan yang jatuh melewati batas warna. */
  const atas = `
    <div style="position: absolute; left: 0; right: 0; top: 0; height: 416px;
      background: ${T.rimba}; overflow: hidden;">
      ${cahaya(210, -110, 330, 'rgba(231,196,106,.16)')}
      <span style="position: absolute; right: 20px; bottom: 22px;
        ${S.col(0, ' align-items: center;')}">
        ${maskot('hat-peek.webp', 156)}
      </span>
    </div>`;

  const body = isi(`
    <div style="${S.row(0, ' justify-content: space-between; align-items: center;')}">
      <span style="${S.row(11)}">
        ${potret('head-happy.webp', 44, { bg: 'rgba(246,237,217,.12)', ring: `1.5px solid ${T.emasGaris}` })}
        <span style="${S.col(2)}">
          <span style="font-size: 11px; color: ${T.onRimbaRedup};">Selasa, 11 September</span>
          <b style="font-family: ${JUDUL}; font-weight: 600; font-size: 16px;
            color: ${T.onRimba};">Rani Saputri</b>
        </span>
      </span>
      <span style="${S.row(7, ` padding: 7px 13px; border-radius: 6px;`
        + ` border: 1px solid rgba(231,196,106,.35);`)}">
        ${ic('flame', 14, '#E7C46A', 2.2)}
        <b style="font-size: 12.5px; color: #E7C46A;">7 hari</b>
      </span>
    </div>

    <div style="margin-top: 26px;">
      ${label('Fokus hari ini', 'rgba(231,196,106,.8)')}
      <h1 style="margin-top: 11px; font-size: 29px; color: ${T.onRimba}; max-width: 232px;">
        Present Simple<br>untuk kebiasaan</h1>
      <p style="margin-top: 12px; font-size: 13px; color: ${T.onRimbaRedup}; max-width: 224px;">
        Grammar · Tingkat A2 · 10 soal</p>
    </div>

    <div style="${S.row(14, ' margin-top: 18px;')}">
      <span style="${S.row(9, ` height: 50px; padding: 0 24px; justify-content: center;`
        + ` border-radius: 8px; background: #E7C46A; color: ${T.rimbaDalam};`
        + ` font-weight: 700; font-size: 15px; flex: none;`)}">
        <span>Mulai sesi</span>${ic('arrow-right', 17, T.rimbaDalam, 2.4)}</span>
    </div>

    <div style="${S.row(0, ` margin-top: 98px; padding: 16px 18px; border-radius: 14px;`
      + ` background: ${T.kertas}; border: 1px solid ${T.emasGaris};`)}">
      <span style="${S.col(3, ' flex: 1;')}">
        ${label('Tingkat')}
        <span style="${S.row(7)}">
          <b style="font-family: ${JUDUL}; font-weight: 600; font-size: 26px;">A2</b>
          <span style="font-size: 11.5px; font-weight: 600; color: ${T.speak};">68%</span>
        </span>
      </span>
      <span style="width: 1px; height: 38px; background: ${T.emasGaris};"></span>
      <span style="${S.col(3, ' flex: 1; padding-left: 18px;')}">
        ${label('Sesi hari ini')}
        <b style="font-family: ${JUDUL}; font-weight: 600; font-size: 26px;">2<span
          style="font-size: 15px; color: ${T.samar};">/3</span></b>
      </span>
      <span style="width: 1px; height: 38px; background: ${T.emasGaris};"></span>
      <span style="${S.col(3, ' flex: 1; padding-left: 18px;')}">
        ${label('Gem')}
        <b style="font-family: ${JUDUL}; font-weight: 600; font-size: 26px;">296</b>
      </span>
    </div>

    <div style="${S.row(0, ' justify-content: space-between; align-items: baseline; margin-top: 22px;')}">
      <h3 style="font-size: 19px;">Lanjutkan</h3>
      <span style="font-size: 12px; font-weight: 600; color: ${T.emas};">Lihat semua</span>
    </div>
    <div style="margin-top: 2px;">
      ${baris(D.vocab, 'Makanan &amp; minuman', '12 dari 20', 60)}
      <span style="display: block; height: 1px; background: ${T.emasGaris};"></span>
      ${baris(D.reading, 'Kabar dari Bali', '2 menit', 25)}
      <span style="display: block; height: 1px; background: ${T.emasGaris};"></span>
      ${baris(D.grammar, 'Kata kerja orang ke-3', 'perlu diulang', 35)}
    </div>
    <div style="height: 92px;"></div>
  `, 22);
  return halaman(atas + body + nav(2));
}

/* ---------- Latihan ---------- */
export function Latihan() {
  const baris = (d, meta, pct) =>
    `<div style="${S.row(14, ' padding: 15px 0;')}">
      <span style="${S.row(0, ` justify-content: center; width: 40px; height: 40px; border-radius: 10px;`
        + ` background: ${T.kertas}; border: 1px solid ${T.emasGaris}; flex: none;`)}">
        ${ic(d.icon, 18, d.titik, 2)}</span>
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-family: ${JUDUL}; font-weight: 600; font-size: 16px;">${d.label}</b>
        <span style="font-size: 11.5px; color: ${T.samar};">${meta}</span>
      </span>
      <b style="font-size: 13px; color: ${d.titik};">${pct}%</b>
      ${ic('chevron-right', 17, T.samar, 2)}
    </div>`;

  const body = isi(`
    <div style="${S.row(0, ' justify-content: space-between; align-items: center;')}">
      <h1 style="font-size: 30px;">Latihan</h1>
      <span style="${S.row(6, ` padding: 7px 13px; border-radius: 6px; background: ${T.kertas};`
        + ` border: 1px solid ${T.emasGaris}; font-size: 12px; font-weight: 600;`)}">
        ${ic('sliders-horizontal', 14, T.emas, 2.2)}A2</span>
    </div>

    <div style="${S.row(15, ` margin-top: 18px; padding: 17px; border-radius: 14px;`
      + ` background: ${T.rimba}; align-items: center;`)}">
      <span style="${S.row(0, ` justify-content: center; width: 44px; height: 44px; border-radius: 10px;`
        + ` background: rgba(231,196,106,.16); flex: none;`)}">${ic('zap', 21, '#E7C46A', 2.2)}</span>
      <span style="${S.col(4, ' flex: 1; min-width: 0;')}">
        <b style="font-family: ${JUDUL}; font-weight: 600; font-size: 17px;
          color: ${T.onRimba};">Sesi Kilat</b>
        <span style="font-size: 11.5px; color: ${T.onRimbaRedup};">10 soal campur · 3 menit</span>
      </span>
      ${ic('arrow-right', 19, '#E7C46A', 2.2)}
    </div>

    <div style="margin-top: 22px;">${label('Enam ranah')}</div>
    <div style="margin-top: 4px;">
      ${baris(D.grammar, 'Lesson 12 dari 129', 24)}
      <span style="display: block; height: 1px; background: ${T.emasGaris};"></span>
      ${baris(D.vocab, '18 kata perlu diulang', 64)}
      <span style="display: block; height: 1px; background: ${T.emasGaris};"></span>
      ${baris(D.listen, '3 audio baru', 72)}
      <span style="display: block; height: 1px; background: ${T.emasGaris};"></span>
      ${baris(D.speak, 'Rekaman diproses di perangkat', 40)}
      <span style="display: block; height: 1px; background: ${T.emasGaris};"></span>
      ${baris(D.reading, '1 bacaan baru', 55)}
      <span style="display: block; height: 1px; background: ${T.emasGaris};"></span>
      ${baris(D.write, 'Prompt mingguan', 30)}
    </div>
  `, 22);
  return halaman(body + nav(0));
}

/* ---------- Soal ---------- */
export function Soal() {
  const opsi = (k, teks, on) =>
    `<div style="${S.row(14, ` height: 58px; padding: 0 16px; border-radius: 10px;`
      + ` background: ${on ? '#FFF8E8' : T.kertas};`
      + ` border: 1px solid ${on ? T.emas : T.emasGaris};`
      + (on ? ' box-shadow: 0 0 0 1px ' + T.emas + ';' : ''))}">
      <span style="${S.row(0, ` justify-content: center; width: 28px; height: 28px; border-radius: 50%;`
        + ` border: 1px solid ${on ? T.emas : T.emasGaris}; background: ${on ? T.emas : 'transparent'};`
        + ` color: ${on ? '#FFFDF8' : T.samar}; font-family: ${JUDUL}; font-weight: 600;`
        + ` font-size: 12.5px; flex: none;`)}">${k}</span>
      <span style="font-size: 16px; font-weight: 500;">${teks}</span>
    </div>`;

  const body = isi(`
    <div style="${S.row(13)}">
      <span style="${S.row(0, ` justify-content: center; width: 38px; height: 38px; border-radius: 10px;`
        + ` background: ${T.kertas}; border: 1px solid ${T.emasGaris}; flex: none;`)}">
        ${ic('x', 17, T.redup, 2.1)}</span>
      <span style="flex: 1; height: 5px; border-radius: 999px; background: rgba(30,26,20,.1);
        overflow: hidden;"><span style="display: block; width: 40%; height: 100%;
        background: ${T.emas};"></span></span>
      <span style="font-size: 12px; font-weight: 600; color: ${T.samar};">Soal 4 / 10</span>
    </div>

    <div style="${S.col(0, ` margin-top: 22px; padding: 22px 20px; border-radius: 14px;`
      + ` background: ${T.rimba};`)}">
      ${label('Grammar · lengkapi kalimatnya', 'rgba(231,196,106,.75)')}
      <p style="margin-top: 14px; font-family: ${JUDUL}; font-weight: 500; font-size: 23px;
        line-height: 1.5; color: ${T.onRimba};">
        She <span style="border-bottom: 2px solid #E7C46A; padding: 0 18px;">&nbsp;</span>
        to school by bus every morning.</p>
      <span style="${S.row(8, ` margin-top: 16px; width: fit-content; padding: 8px 14px;`
        + ` border-radius: 999px; border: 1px solid rgba(231,196,106,.4);`)}">
        ${ic('volume-2', 15, '#E7C46A', 2.1)}
        <span style="font-size: 12px; font-weight: 600; color: #E7C46A;">Dengarkan</span></span>
    </div>

    <div style="${S.col(10, ' margin-top: 20px;')}">
      ${opsi('A', 'go', false)}${opsi('B', 'goes', true)}
      ${opsi('C', 'going', false)}${opsi('D', 'is go', false)}
    </div>

    <div style="${S.row(14, ' position: absolute; left: 0; right: 0; bottom: 26px; align-items: flex-end;')}">
      <span style="${S.col(0, ' align-items: center; flex: none;')}">
        ${maskot('full-thinking.webp', 100)}
        ${bayangan(66, .12, '30,26,20')}
      </span>
      <span style="${S.row(9, ` flex: 1; margin-bottom: 10px; height: 52px; justify-content: center;`
        + ` border-radius: 8px; background: ${T.marun}; color: ${T.krem};`
        + ` font-weight: 700; font-size: 16px;`)}">
        <span>Periksa</span>${ic('arrow-right', 18, T.krem, 2.4)}</span>
    </div>
  `, 22);
  return halaman(body);
}
