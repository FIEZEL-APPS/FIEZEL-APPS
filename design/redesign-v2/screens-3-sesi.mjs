/* Alur satu sesi belajar: peta pelajaran, soal, umpan balik, hasil, tutor. */
import { T, DOM, S, ic, dc, btn, chip, bar, eyebrow, avatar, iconBtn, navBar,
  PHONE_W, PHONE_H, TOP_SAFE } from './kit.mjs';

function sheet(body, pad = 20) {
  return `<div style="position: absolute; inset: ${TOP_SAFE}px ${pad}px 0 ${pad}px;">${body}</div>`;
}

/* ---------- 17. Peta pelajaran ---------- */
export function Peta() {
  const simpul = (cx, cy, status, label, nomor) => {
    const size = status === 'kini' ? 74 : 56;
    const bg = status === 'selesai' ? T.marun : status === 'kini' ? T.sun : T.creamSoft;
    const fg = status === 'selesai' ? T.cream : status === 'kini' ? T.rimbaDeep : T.ink3;
    const sh = status === 'selesai' ? `box-shadow: 0 4px 0 ${T.marunDeep};`
      : status === 'kini' ? `box-shadow: 0 5px 0 ${T.sunDeep}, 0 0 0 7px rgba(255,201,79,.28);`
      : `border: 2px dashed ${T.line};`;
    const isi = status === 'selesai' ? ic('check', 24, fg, 3)
      : status === 'kini' ? ic('play', 26, fg, 2.6)
      : ic('lock', 20, fg, 2.4);
    return `<div style="position: absolute; left: ${cx - size / 2}px; top: ${cy - size / 2}px;">
      <span style="${S.row(0, ` justify-content: center; width: ${size}px; height: ${size}px;`
        + ` border-radius: 50%; background: ${bg}; ${sh}`)}">${isi}</span>
      ${label ? `<span style="display: block; margin-top: 9px; text-align: center; width: ${size}px;
        font-size: 11px; font-weight: 800; color: ${T.ink2};">${label}</span>` : ''}
      ${nomor ? `<span style="position: absolute; top: -6px; right: -6px; ${S.row(0, ' justify-content: center;')}
        width: 24px; height: 24px; border-radius: 50%; background: ${T.paper};
        border: 1.5px solid ${T.line}; font-size: 11px; font-weight: 800; color: ${T.ink2};">${nomor}</span>` : ''}
    </div>`;
  };

  const jalur = `<svg width="350" height="600" viewBox="0 0 350 600" fill="none"
    style="position: absolute; left: 0; top: 0;">
    <path d="M68 550 C 110 528 145 505 178 472 C 218 432 252 424 286 392 C 252 352 208 332 172 304
      C 132 276 96 252 64 218 C 100 184 152 154 188 124"
      stroke="${T.emas}" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 14" opacity="0.55"/>
  </svg>`;

  const body = sheet(`
    <div style="${S.row(12)}">
      ${iconBtn('arrow-left')}
      <span style="${S.col(2, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 17px; letter-spacing: -0.015em;">Grammar · Unit 3</b>
        <span style="font-size: 12px; font-weight: 600; color: ${T.ink3};">Present Simple · A2</span>
      </span>
      ${chip('12/129', { icon: 'library-big' })}
    </div>
    <div style="margin-top: 13px;">${bar(9, { fill: T.marun, h: 7 })}</div>

    <div style="position: relative; width: 350px; height: 600px; margin-top: 14px;">
      ${jalur}
      ${simpul(188, 124, 'kunci', '', 6)}
      ${simpul(64, 218, 'kunci', 'Negatif', 5)}
      ${simpul(172, 304, 'kini', 'Tanya jawab', 4)}
      ${simpul(286, 392, 'selesai', 'Orang ke-3', 3)}
      ${simpul(178, 472, 'selesai', 'Jamak', 2)}
      ${simpul(68, 550, 'selesai', 'Dasar', 1)}
      <img src="full-thinking.webp" alt="" style="position: absolute; left: 238px; top: 228px;
        height: 104px; width: auto;">
      <div style="position: absolute; left: 14px; top: 294px; ${S.row(8, ` padding: 9px 13px;`
        + ` border-radius: 14px 14px 4px 14px; background: ${T.rimbaDeep};`)}">
        <span style="font-size: 12px; font-weight: 700; color: ${T.sun};">Lanjut di sini</span>
      </div>
    </div>
  `);
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body: body + navBar('latihan') });
}

/* ---------- kerangka layar soal ---------- */
function soalAtas(progres = 40) {
  return `<div style="${S.row(12)}">
    ${iconBtn('x', { bg: T.creamSoft, border: T.creamSoft })}
    <span style="flex: 1;">${bar(progres, { fill: T.sun, track: T.lineSoft, h: 10 })}</span>
    ${chip('296', { icon: 'sparkles', bg: T.paper, color: T.marun })}
  </div>`;
}

function soalBadan(pilihan) {
  return `
    <div style="margin-top: 22px;">
      ${eyebrow('Lengkapi kalimatnya', DOM.grammar.ink)}
      <div style="${S.row(14, ` margin-top: 11px; padding: 18px; border-radius: 24px;`
        + ` background: ${DOM.grammar.bg};`)}">
        <span style="${S.row(0, ` justify-content: center; width: 46px; height: 46px; border-radius: 50%;`
          + ` background: rgba(255,255,255,.72); flex: none;`)}">${ic('volume-2', 22, DOM.grammar.ink, 2.3)}</span>
        <p style="font-size: 19px; font-weight: 700; line-height: 1.45; color: ${DOM.grammar.ink};
          letter-spacing: -0.01em;">
          She <span style="border-bottom: 3px solid ${DOM.grammar.ink}; padding: 0 16px;">&nbsp;</span>
          to school by bus every morning.
        </p>
      </div>
    </div>
    <div style="${S.col(10, ' margin-top: 18px;')}">${pilihan}</div>`;
}

function opsi(k, teks, mode) {
  const gaya = {
    diam: { bg: T.paper, br: T.line, sh: '', ink: T.ink, kbg: T.creamSoft, kink: T.ink2 },
    pilih: { bg: T.paper, br: T.marun, sh: `box-shadow: 0 3px 0 ${T.marun};`, ink: T.ink, kbg: T.marun, kink: T.cream },
    benar: { bg: T.okSoft, br: T.ok, sh: `box-shadow: 0 3px 0 ${T.ok};`, ink: T.ok, kbg: T.ok, kink: T.cream },
    salah: { bg: T.badSoft, br: T.bad, sh: `box-shadow: 0 3px 0 ${T.bad};`, ink: T.bad, kbg: T.bad, kink: T.cream },
    pudar: { bg: T.paper, br: T.lineSoft, sh: '', ink: T.ink3, kbg: T.lineSoft, kink: T.ink3 }
  }[mode];
  const tanda = mode === 'benar' ? ic('check', 20, T.ok, 3)
    : mode === 'salah' ? ic('x', 20, T.bad, 3) : '';
  return `<div style="${S.row(14, ` height: 60px; padding: 0 16px; border-radius: 18px; background: ${gaya.bg};`
    + ` border: 1.5px solid ${gaya.br}; ${gaya.sh}`)}">
    <span style="${S.row(0, ` justify-content: center; width: 32px; height: 32px; border-radius: 11px;`
      + ` background: ${gaya.kbg}; color: ${gaya.kink}; font-weight: 800; font-size: 13.5px; flex: none;`)}">${k}</span>
    <span style="flex: 1; font-size: 16.5px; font-weight: 700; color: ${gaya.ink};">${teks}</span>
    ${tanda}
  </div>`;
}

/* ---------- 18. Soal ---------- */
export function Soal() {
  const body = sheet(`
    ${soalAtas(40)}
    ${soalBadan([
      opsi('A', 'go', 'diam'),
      opsi('B', 'goes', 'pilih'),
      opsi('C', 'going', 'diam'),
      opsi('D', 'is go', 'diam')
    ].join(''))}
    <img src="full-thinking.webp" alt="" style="position: absolute; left: -12px; bottom: 96px;
      height: 132px; width: auto;">
    <div style="${S.row(11, ' position: absolute; left: 0; right: 0; bottom: 34px;')}">
      <span style="flex: none;">${btn('Petunjuk', {
        fill: T.paper, color: T.ink2, shadow: null, h: 54, fs: 14.5, width: '118px',
        border: `1.5px solid ${T.line}`
      })}</span>
      <span style="flex: 1;">${btn('Periksa', { h: 54 })}</span>
    </div>
  `);
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body });
}

/* ---------- lembar umpan balik ---------- */
function umpan({ warna, warnaSoft, ikon, judul, isi, ekstra = '', art, artStyle, tombol }) {
  return `<div style="position: absolute; left: 0; right: 0; bottom: 0; background: ${warnaSoft};
    border-radius: 28px 28px 0 0; padding: 20px 22px 30px 22px; border-top: 2px solid ${warna};">
    <img src="${art}" alt="" style="${artStyle}">
    <div style="position: relative; z-index: 2;">
      <div style="${S.row(11)}">
        <span style="${S.row(0, ` justify-content: center; width: 40px; height: 40px; border-radius: 50%;`
          + ` background: ${warna}; flex: none;`)}">${ic(ikon, 22, T.cream, 3)}</span>
        <b style="font-size: 22px; color: ${warna}; letter-spacing: -0.02em;">${judul}</b>
      </div>
      <p style="margin-top: 12px; font-size: 14px; font-weight: 600; line-height: 1.55; color: ${warna};
        max-width: 244px;">${isi}</p>
      ${ekstra}
      <div style="margin-top: 16px;">${tombol}</div>
    </div>
  </div>`;
}

/* ---------- 19. Jawaban benar ---------- */
export function Benar() {
  const body = sheet(`
    ${soalAtas(50)}
    ${soalBadan([
      opsi('A', 'go', 'pudar'),
      opsi('B', 'goes', 'benar'),
      opsi('C', 'going', 'pudar'),
      opsi('D', 'is go', 'pudar')
    ].join(''))}
  `);
  const lembar = umpan({
    warna: T.ok, warnaSoft: T.okSoft, ikon: 'check', judul: 'Benar!',
    isi: 'Subjek <b>she</b> itu orang ketiga tunggal, jadi kata kerjanya dapat akhiran <b>-s</b>.',
    art: 'full-cheer.webp',
    artStyle: 'position: absolute; right: 4px; bottom: 0; height: 196px; width: auto; z-index: 1;',
    tombol: `<span style="display: block; width: 220px;">${btn('Lanjut', {
      fill: T.ok, shadow: '#12523A', icon: 'arrow-right', h: 52
    })}</span>`
  });
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body: body + lembar });
}

/* ---------- 20. Jawaban salah ---------- */
export function Salah() {
  const body = sheet(`
    ${soalAtas(50)}
    ${soalBadan([
      opsi('A', 'go', 'salah'),
      opsi('B', 'goes', 'benar'),
      opsi('C', 'going', 'pudar'),
      opsi('D', 'is go', 'pudar')
    ].join(''))}
  `);
  const ekstra = `<div style="${S.row(9, ` margin-top: 13px; padding: 11px 13px; border-radius: 14px;`
    + ` background: rgba(255,255,255,.72); max-width: 250px;`)}">
    ${ic('message-circle-question', 18, T.bad, 2.3)}
    <span style="font-size: 12.5px; font-weight: 800; color: ${T.bad};">Kenapa begitu? Tanya Mira</span>
  </div>`;
  const lembar = umpan({
    warna: T.bad, warnaSoft: T.badSoft, ikon: 'x', judul: 'Belum tepat',
    isi: 'Jawabannya <b>goes</b>. Kamu pakai bentuk dasar, padahal subjeknya <b>she</b>.',
    ekstra,
    art: 'full-oops.webp',
    artStyle: 'position: absolute; right: -12px; bottom: 0; height: 200px; width: auto; z-index: 1;',
    tombol: `<span style="display: block; width: 220px;">${btn('Lanjut', {
      fill: T.bad, shadow: '#8E2419', icon: 'arrow-right', h: 52
    })}</span>`
  });
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body: body + lembar });
}

/* ---------- 21. Hasil sesi ---------- */
export function Hasil() {
  const kotak = (angka, label, icon, warna, bgv) =>
    `<div style="${S.col(6, ` flex: 1; align-items: center; padding: 14px 8px; border-radius: 20px;`
      + ` background: ${bgv};`)}">
      ${ic(icon, 19, warna, 2.4)}
      <b style="font-size: 19px; color: ${warna}; letter-spacing: -0.02em;">${angka}</b>
      <span style="font-size: 10.5px; font-weight: 800; color: ${warna}; opacity: .8;">${label}</span>
    </div>`;

  const body = `
    <div style="position: absolute; inset: ${TOP_SAFE}px 0 0 0;">
      <div style="${S.col(0, ' align-items: center;')}">
        ${eyebrow('Sesi selesai')}
        <h1 style="margin-top: 10px; font-size: 32px; text-align: center;">Sembilan dari<br>sepuluh benar</h1>
        <img src="highfive.webp" alt="" style="margin-top: 10px; height: 244px; width: auto;">
      </div>
    </div>
    <div style="position: absolute; left: 20px; right: 20px; bottom: 34px;">
      <div style="${S.row(10)}">
        ${kotak('9/10', 'Benar', 'circle-check-big', T.ok, T.okSoft)}
        ${kotak('4:12', 'Waktu', 'timer', DOM.grammar.ink, DOM.grammar.bg)}
        ${kotak('+30', 'Gem', 'sparkles', T.marun, T.marunSoft)}
      </div>
      <div style="${S.col(0, ` margin-top: 12px; padding: 15px; border-radius: 21px; background: ${T.paper};`
        + ` border: 1px solid ${T.line};`)}">
        <div style="${S.row(0, ' justify-content: space-between; align-items: baseline;')}">
          <b style="font-size: 14.5px;">Level A2</b>
          <span style="font-size: 12px; font-weight: 800; color: ${T.ok};">68% → 72%</span>
        </div>
        <div style="margin-top: 10px;">${bar(72, { fill: T.marun, h: 9 })}</div>
        <div style="${S.row(9, ' margin-top: 12px;')}">
          ${ic('flame', 18, T.sunDeep, 2.4)}
          <span style="font-size: 12.5px; font-weight: 700; color: ${T.ink2};">
            Streak 8 hari — rekor terpanjangmu.
          </span>
        </div>
      </div>
      <div style="${S.col(10, ' margin-top: 14px;')}">
        ${btn('Selesai', { icon: 'check' })}
        ${btn('Satu sesi lagi', {
          fill: 'transparent', color: T.ink2, shadow: null, h: 48, fs: 14.5,
          border: `1.5px solid ${T.line}`
        })}
      </div>
    </div>`;
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body });
}

/* ---------- 22. Tanya Mira (tutor AI) ---------- */
export function TanyaMira() {
  const dariMira = (isi, lebar = 272) =>
    `<div style="${S.row(9, ' align-items: flex-end;')}">
      ${avatar('head-explain.webp', 34, DOM.reading.bg, 1.5, 8)}
      <div style="max-width: ${lebar}px; padding: 13px 15px; border-radius: 18px 18px 18px 5px;
        background: ${T.paper}; border: 1px solid ${T.line}; font-size: 14px; font-weight: 600;
        line-height: 1.55;">${isi}</div>
    </div>`;

  const dariAku = (isi) =>
    `<div style="${S.row(0, ' justify-content: flex-end;')}">
      <div style="max-width: 250px; padding: 13px 15px; border-radius: 18px 18px 5px 18px;
        background: ${T.marun}; color: ${T.cream}; font-size: 14px; font-weight: 600;
        line-height: 1.5;">${isi}</div>
    </div>`;

  const contoh = (subjek, bentuk, kalimat) =>
    `<div style="${S.col(4, ` margin-top: 8px; padding: 10px 12px; border-radius: 12px;`
      + ` background: ${DOM.grammar.bg};`)}">
      <span style="font-size: 12.5px; font-weight: 800; color: ${DOM.grammar.ink};">
        ${subjek} → ${bentuk}
      </span>
      <span style="font-size: 12.5px; font-weight: 600; color: ${DOM.grammar.ink}; opacity: .85;">${kalimat}</span>
    </div>`;

  const saran = (teks) =>
    `<span style="padding: 9px 13px; border-radius: 999px; background: ${T.paper};
      border: 1px solid ${T.line}; font-size: 12.5px; font-weight: 700; color: ${T.ink2};
      white-space: nowrap;">${teks}</span>`;

  const body = sheet(`
    <div style="${S.row(12)}">
      ${iconBtn('arrow-left')}
      <span style="${S.row(10, ' flex: 1; min-width: 0;')}">
        ${avatar('head-explain.webp', 40, DOM.reading.bg, 1.5, 8)}
        <span style="${S.col(2)}">
          <b style="font-size: 16px; letter-spacing: -0.015em;">Tanya Mira</b>
          <span style="${S.row(5)}">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: ${T.ok};"></span>
            <span style="font-size: 11.5px; font-weight: 700; color: ${T.ok};">siap bantu</span>
          </span>
        </span>
      </span>
      ${iconBtn('history')}
    </div>

    <div style="${S.col(14, ' position: absolute; left: 0; right: 0; bottom: 104px;')}">
      ${dariMira('Hai Rani. Kamu lagi di Present Simple. Ada yang bikin bingung?')}
      ${dariAku('bedanya don&#39;t sama doesn&#39;t apa sih?')}
      ${dariMira(`Lihat subjeknya dulu, itu kuncinya.
        ${contoh('I / you / we / they', 'don&#39;t', 'They don&#39;t eat meat.')}
        ${contoh('he / she / it', 'doesn&#39;t', 'She doesn&#39;t eat meat.')}
        <span style="display: block; margin-top: 9px; font-size: 12.5px; color: ${T.ink3};">
          Ingat: sesudah <b>doesn&#39;t</b>, kata kerjanya polos — tanpa <b>-s</b>.
        </span>`)}
      <div style="${S.row(8, ' margin-left: 43px; flex-wrap: wrap;')}">
        ${saran('Kasih 3 soal latihan')}
        ${saran('อธิบายเป็นภาษาไทย')}
      </div>
    </div>

    <div style="${S.row(9, ' position: absolute; left: 0; right: 0; bottom: 30px;')}">
      <div style="${S.row(12, ` flex: 1; height: 58px; padding: 0 18px; border-radius: 999px;`
        + ` background: ${T.paper}; border: 1px solid ${T.line};`)}">
        <span style="flex: 1; font-size: 15px; font-weight: 600; color: ${T.ink3};">Tulis pertanyaan…</span>
        ${ic('mic', 20, T.ink2, 2.2)}
      </div>
      <span style="${S.row(0, ` justify-content: center; width: 58px; height: 58px; border-radius: 50%;`
        + ` background: ${T.marun}; box-shadow: 0 4px 0 ${T.marunDeep}; flex: none;`)}">
        ${ic('send', 22, T.cream, 2.4)}
      </span>
    </div>
  `);
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body });
}
