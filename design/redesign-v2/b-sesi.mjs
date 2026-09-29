/* Alur satu sesi belajar dalam arah "Lembut": peta, soal, umpan balik, hasil, tutor. */
import { T, D, S, R, SH, JUDUL, ic, dc, isi, kartu, tombol, chip, ikonTombol, bar, eyebrow,
  maskot, bayangan, nav, TOP_SAFE } from './b-kit.mjs';

/* ---------- Peta pelajaran ---------- */
export function Peta() {
  const simpul = (cx, cy, status, label, nomor) => {
    const size = status === 'kini' ? 74 : 58;
    const bg = status === 'selesai' ? T.aksen
      : status === 'kini' ? T.kertas : '#F1EAE3';
    const fg = status === 'selesai' ? '#FFFFFF'
      : status === 'kini' ? T.aksen : T.samar;
    const bayang = status === 'kini'
      ? `${SH.angkat} outline: 6px solid ${T.aksenLembut};`
      : status === 'selesai' ? SH.kecil : '';
    const dalam = status === 'selesai' ? ic('check', 24, fg, 3)
      : status === 'kini' ? ic('play', 26, fg, 2.4)
      : ic('lock', 19, fg, 2.2);
    return `<div style="position: absolute; left: ${cx - size / 2}px; top: ${cy - size / 2}px;">
      <span style="${S.row(0, ` justify-content: center; width: ${size}px; height: ${size}px;`
        + ` border-radius: 50%; background: ${bg}; ${bayang}`)}">${dalam}</span>
      ${label ? `<span style="display: block; margin-top: 10px; text-align: center; width: ${size}px;
        font-size: 11px; font-weight: 700; color: ${T.redup};">${label}</span>` : ''}
      ${nomor ? `<span style="position: absolute; top: -4px; right: -4px;
        ${S.row(0, ' justify-content: center;')} width: 24px; height: 24px; border-radius: 50%;
        background: ${T.kertas}; ${SH.kecil} font-family: ${JUDUL}; font-size: 11px;
        font-weight: 700; color: ${T.redup};">${nomor}</span>` : ''}
    </div>`;
  };

  const jalur = `<svg width="342" height="590" viewBox="0 0 342 590" fill="none"
    style="position: absolute; left: 0; top: 0;">
    <path d="M66 540 C 106 518 140 496 172 464 C 210 426 244 418 278 386 C 244 348 202 328 168 300
      C 130 272 94 250 62 216 C 96 184 146 154 182 124"
      stroke="#E4D8CC" stroke-width="6" stroke-linecap="round" stroke-dasharray="1 16"/>
  </svg>`;

  const body = isi(`
    <div style="${S.row(13)}">
      ${ikonTombol('arrow-left')}
      <span style="${S.col(2, ' flex: 1; min-width: 0;')}">
        <b style="font-family: ${JUDUL}; font-size: 17px; font-weight: 700;">Grammar · Unit 3</b>
        <span style="font-size: 12px; font-weight: 600; color: ${T.samar};">Present Simple · A2</span>
      </span>
      ${chip('12/129', { warna: T.redup })}
    </div>
    <div style="margin-top: 14px;">${bar(9, { h: 6 })}</div>

    <div style="position: relative; width: 342px; height: 590px; margin-top: 12px;">
      ${jalur}
      ${simpul(182, 124, 'kunci', '', 6)}
      ${simpul(62, 216, 'kunci', 'Negatif', 5)}
      ${simpul(168, 300, 'kini', 'Tanya jawab', 4)}
      ${simpul(278, 386, 'selesai', 'Orang ke-3', 3)}
      ${simpul(172, 464, 'selesai', 'Jamak', 2)}
      ${simpul(66, 540, 'selesai', 'Dasar', 1)}
      <span style="position: absolute; left: 232px; top: 196px; ${S.col(0, ' align-items: center;')}">
        ${maskot('full-thinking.webp', 96)}
        ${bayangan(62, .12)}
      </span>
    </div>
  `);
  return dc({ body: body + nav(0) });
}

/* ---------- kerangka layar soal ---------- */
function atasSoal(pct = 40, sisa = '4/10') {
  return `<div style="${S.row(13)}">
    ${ikonTombol('x', { size: 42 })}
    <span style="flex: 1;">${bar(pct, { h: 7 })}</span>
    <span style="font-size: 12.5px; font-weight: 700; color: ${T.samar};">${sisa}</span>
  </div>`;
}

function pertanyaan() {
  return `<div style="margin-top: 28px;">
    ${eyebrow('Lengkapi kalimatnya')}
    <div style="${S.row(15, ' margin-top: 14px; align-items: flex-start;')}">
      <span style="${S.row(0, ` justify-content: center; width: 46px; height: 46px; border-radius: 50%;`
        + ` background: ${T.kertas}; ${SH.kecil} flex: none; margin-top: 3px;`)}">
        ${ic('volume-2', 20, T.aksen, 2.2)}</span>
      <p style="font-family: ${JUDUL}; font-weight: 600; font-size: 23px; line-height: 1.45;">
        She <span style="border-bottom: 3px solid ${T.aksen}; padding: 0 16px;">&nbsp;</span>
        to school by bus every morning.</p>
    </div>
  </div>`;
}

function opsi(k, teks, mode) {
  const g = {
    diam: { bg: T.kertas, tinta: T.tinta, kbg: T.bg, ktinta: T.redup, tepi: SH.kecil, tanda: '' },
    pilih: { bg: T.aksenLembut, tinta: T.aksen, kbg: T.aksen, ktinta: '#FFFFFF',
      tepi: `box-shadow: inset 0 0 0 2px ${T.aksen};`, tanda: '' },
    benar: { bg: T.okLembut, tinta: T.ok, kbg: T.ok, ktinta: '#FFFFFF',
      tepi: `box-shadow: inset 0 0 0 2px ${T.ok};`, tanda: ic('check', 20, T.ok, 3) },
    salah: { bg: T.badLembut, tinta: T.bad, kbg: T.bad, ktinta: '#FFFFFF',
      tepi: `box-shadow: inset 0 0 0 2px ${T.bad};`, tanda: ic('x', 20, T.bad, 3) },
    pudar: { bg: T.kertas, tinta: T.samar, kbg: T.bg, ktinta: T.samar, tepi: '', tanda: '' }
  }[mode];
  return `<div style="${S.row(14, ` height: 62px; padding: 0 18px; border-radius: 22px;`
    + ` background: ${g.bg}; ${g.tepi}`)}">
    <span style="${S.row(0, ` justify-content: center; width: 30px; height: 30px; border-radius: 50%;`
      + ` background: ${g.kbg}; color: ${g.ktinta}; font-family: ${JUDUL}; font-weight: 700;`
      + ` font-size: 13px; flex: none;`)}">${k}</span>
    <span style="flex: 1; font-size: 16.5px; font-weight: 600; color: ${g.tinta};">${teks}</span>
    ${g.tanda}
  </div>`;
}

/* ---------- Soal ---------- */
export function Soal() {
  const body = isi(`
    ${atasSoal()}
    ${pertanyaan()}
    <div style="${S.col(11, ' margin-top: 26px;')}">
      ${opsi('A', 'go', 'diam')}${opsi('B', 'goes', 'pilih')}
      ${opsi('C', 'going', 'diam')}${opsi('D', 'is go', 'diam')}
    </div>
    <div style="${S.row(12, ' position: absolute; left: 0; right: 0; bottom: 28px; align-items: flex-end;')}">
      <span style="${S.col(0, ' align-items: center; flex: none;')}">
        ${maskot('full-thinking.webp', 104)}
        ${bayangan(68, .12)}
      </span>
      <span style="flex: 1; margin-bottom: 10px;">
        ${tombol('Periksa', { h: 54, icon: 'check' })}</span>
    </div>
  `);
  return dc({ body });
}

/* ---------- lembar umpan balik ---------- */
function umpan({ warna, lembut, ikon, judul, teks, ekstra = '', art, tinggiArt, label }) {
  return `<div style="position: absolute; left: 0; right: 0; bottom: 0; background: ${lembut};
    border-radius: 36px 36px 0 0; padding: 22px 24px 28px 24px;">
    <div style="${S.row(14, ' align-items: flex-end;')}">
      <div style="${S.col(0, ' flex: 1; min-width: 0;')}">
        <div style="${S.row(11)}">
          <span style="${S.row(0, ` justify-content: center; width: 40px; height: 40px;`
            + ` border-radius: 50%; background: ${warna}; flex: none;`)}">
            ${ic(ikon, 22, '#FFFFFF', 3)}</span>
          <b style="font-family: ${JUDUL}; font-size: 22px; font-weight: 700; color: ${warna};">${judul}</b>
        </div>
        <p style="margin-top: 12px; font-size: 14px; font-weight: 600; line-height: 1.55;
          color: ${warna};">${teks}</p>
        ${ekstra}
        <div style="margin-top: 18px;">
          ${tombol(label, { h: 52, extra: `background: ${warna}; box-shadow: none;` })}</div>
      </div>
      <span style="${S.col(0, ' align-items: center; flex: none;')}">
        ${maskot(art, tinggiArt)}
      </span>
    </div>
  </div>`;
}

/* ---------- Jawaban benar ---------- */
export function Benar() {
  const body = isi(`
    ${atasSoal(50, '5/10')}
    ${pertanyaan()}
    <div style="${S.col(11, ' margin-top: 26px;')}">
      ${opsi('A', 'go', 'pudar')}${opsi('B', 'goes', 'benar')}
      ${opsi('C', 'going', 'pudar')}${opsi('D', 'is go', 'pudar')}
    </div>
  `);
  const lembar = umpan({
    warna: T.ok, lembut: T.okLembut, ikon: 'check', judul: 'Benar!',
    teks: 'Subjek <b>she</b> itu orang ketiga tunggal, jadi kata kerjanya dapat akhiran <b>-s</b>.',
    art: 'full-cheer.webp', tinggiArt: 172, label: 'Lanjut'
  });
  return dc({ body: body + lembar });
}

/* ---------- Jawaban salah ---------- */
export function Salah() {
  const body = isi(`
    ${atasSoal(50, '5/10')}
    ${pertanyaan()}
    <div style="${S.col(11, ' margin-top: 26px;')}">
      ${opsi('A', 'go', 'salah')}${opsi('B', 'goes', 'benar')}
      ${opsi('C', 'going', 'pudar')}${opsi('D', 'is go', 'pudar')}
    </div>
  `);
  const ekstra = `<div style="${S.row(9, ` margin-top: 14px; padding: 12px 14px; border-radius: 18px;`
    + ` background: rgba(255,255,255,.72); width: fit-content;`)}">
    ${ic('message-circle-question', 18, T.bad, 2.2)}
    <span style="font-size: 12.5px; font-weight: 700; color: ${T.bad};">Kenapa begitu? Tanya Mira</span>
  </div>`;
  const lembar = umpan({
    warna: T.bad, lembut: T.badLembut, ikon: 'x', judul: 'Belum tepat',
    teks: 'Jawabannya <b>goes</b>. Kamu pakai bentuk dasar, padahal subjeknya <b>she</b>.',
    ekstra, art: 'full-oops.webp', tinggiArt: 176, label: 'Lanjut'
  });
  return dc({ body: body + lembar });
}

/* ---------- Hasil sesi ---------- */
export function Hasil() {
  const kotak = (n, label, icon, warna, bg) =>
    `<div style="${S.col(6, ` flex: 1; align-items: center; padding: 16px 8px; border-radius: 24px;`
      + ` background: ${bg};`)}">
      ${ic(icon, 19, warna, 2.2)}
      <b style="font-family: ${JUDUL}; font-size: 19px; font-weight: 700; color: ${warna};
        letter-spacing: -0.02em;">${n}</b>
      <span style="font-size: 10.5px; font-weight: 700; color: ${warna}; opacity: .82;">${label}</span>
    </div>`;

  const body = `
    <div style="position: absolute; inset: ${TOP_SAFE}px 24px 0 24px;">
      <div style="${S.col(0, ' align-items: center;')}">
        ${eyebrow('Sesi selesai')}
        <h1 style="margin-top: 12px; font-size: 31px; text-align: center;">
          Sembilan dari<br>sepuluh benar</h1>
        <span style="${S.col(0, ' align-items: center; margin-top: 14px;')}">
          ${maskot('highfive.webp', 236)}
          ${bayangan(150, .14)}
        </span>
      </div>
    </div>
    <div style="position: absolute; left: 24px; right: 24px; bottom: 30px;">
      <div style="${S.row(11)}">
        ${kotak('9/10', 'Benar', 'circle-check-big', T.ok, T.okLembut)}
        ${kotak('4:12', 'Waktu', 'timer', D.grammar.ink, D.grammar.bg)}
        ${kotak('+30', 'Gem', 'sparkles', T.aksen, T.aksenLembut)}
      </div>
      <div style="margin-top: 13px;">
        ${kartu(`
          <div style="${S.row(0, ' justify-content: space-between; align-items: baseline;')}">
            <b style="font-size: 14.5px;">Tingkat A2</b>
            <span style="font-size: 12px; font-weight: 700; color: ${T.ok};">68% → 72%</span>
          </div>
          <div style="margin-top: 11px;">${bar(72, { h: 8 })}</div>
          <div style="${S.row(9, ' margin-top: 13px;')}">
            ${ic('flame', 18, T.emas, 2.2)}
            <span style="font-size: 12.5px; font-weight: 600; color: ${T.redup};">
              Streak 8 hari — rekor terpanjangmu.</span>
          </div>`, { pad: 16 })}
      </div>
      <div style="${S.col(11, ' margin-top: 16px;')}">
        ${tombol('Selesai', { icon: 'check' })}
        ${tombol('Satu sesi lagi', { jenis: 'hantu', h: 48, fs: 14.5, icon: null })}
      </div>
    </div>`;
  return dc({ body });
}

/* ---------- Tanya Mira ----------
   Rombakan atas temuan owner: "mascot di tanya miranya jelek sekali".
   Sebabnya pose head-explain dipakai sebagai avatar 34px di tiap gelembung —
   komposisinya lebar, jadi wajahnya tinggal belasan piksel.
   Sekarang: Mira muncul SEKALI, besar, di kartu pembuka; gelembung sesudahnya
   tidak memakai wajah sama sekali karena posisi dan warna sudah cukup
   memberi tahu siapa yang bicara. */
export function TanyaMira() {
  const dariMira = (dalam, lebar = 268) =>
    `<div style="max-width: ${lebar}px; padding: 14px 16px; border-radius: 22px 22px 22px 8px;
      background: ${T.kertas}; ${SH.kecil} font-size: 14px; font-weight: 600;
      line-height: 1.55;">${dalam}</div>`;

  const dariAku = (teks) =>
    `<div style="${S.row(0, ' justify-content: flex-end;')}">
      <div style="max-width: 250px; padding: 14px 16px; border-radius: 22px 22px 8px 22px;
        background: ${T.aksen}; color: #FFFFFF; font-size: 14px; font-weight: 600;
        line-height: 1.5;">${teks}</div>
    </div>`;

  const contoh = (subjek, bentuk, kalimat) =>
    `<div style="${S.col(4, ` margin-top: 9px; padding: 11px 13px; border-radius: 16px;`
      + ` background: ${D.grammar.bg};`)}">
      <span style="font-size: 12.5px; font-weight: 700; color: ${D.grammar.ink};">
        ${subjek} → ${bentuk}</span>
      <span style="font-size: 12.5px; font-weight: 600; color: ${D.grammar.ink};
        opacity: .85;">${kalimat}</span>
    </div>`;

  const saran = (teks) =>
    `<span style="padding: 10px 15px; border-radius: ${R.pil}px; background: ${T.kertas};
      ${SH.kecil} font-size: 12.5px; font-weight: 700; color: ${T.redup};
      white-space: nowrap;">${teks}</span>`;

  const body = isi(`
    <div style="${S.row(13)}">
      ${ikonTombol('arrow-left')}
      <span style="${S.col(2, ' flex: 1; min-width: 0;')}">
        <b style="font-family: ${JUDUL}; font-size: 17px; font-weight: 700;">Tanya Mira</b>
        <span style="${S.row(6)}">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: ${T.ok};"></span>
          <span style="font-size: 11.5px; font-weight: 700; color: ${T.ok};">siap bantu</span>
        </span>
      </span>
      ${ikonTombol('history')}
    </div>

    <div style="position: absolute; left: 0; right: 0; bottom: 104px; ${S.col(14)}">
      <div style="${S.row(14, ` padding: 16px; border-radius: ${R.besar}px; background: ${T.kertas};`
        + ` ${SH.kartu} align-items: flex-end;`)}">
        <span style="${S.col(3, ' flex: 1; min-width: 0; padding-bottom: 6px;')}">
          ${eyebrow('Pembimbingmu')}
          <span style="font-size: 14.5px; font-weight: 600; line-height: 1.5; color: ${T.tinta};">
            Hai Rani. Kamu lagi di Present Simple.<br>Ada yang bikin bingung?</span>
        </span>
        <span style="${S.col(0, ' align-items: center; flex: none;')}">
          ${maskot('head-explain.webp', 118)}
        </span>
      </div>

      ${dariAku('bedanya don&#39;t sama doesn&#39;t apa sih?')}

      ${dariMira(`Lihat subjeknya dulu, itu kuncinya.
        ${contoh('I / you / we / they', 'don&#39;t', 'They don&#39;t eat meat.')}
        ${contoh('he / she / it', 'doesn&#39;t', 'She doesn&#39;t eat meat.')}
        <span style="display: block; margin-top: 10px; font-size: 12.5px; color: ${T.samar};">
          Ingat: sesudah <b>doesn&#39;t</b>, kata kerjanya polos — tanpa <b>-s</b>.</span>`)}

      <div style="${S.row(9, ' flex-wrap: wrap;')}">
        ${saran('Kasih 3 soal latihan')}
        ${saran('อธิบายเป็นภาษาไทย')}
      </div>
    </div>

    <div style="${S.row(10, ' position: absolute; left: 0; right: 0; bottom: 28px;')}">
      <div style="${S.row(13, ` flex: 1; height: 58px; padding: 0 20px; border-radius: ${R.pil}px;`
        + ` background: ${T.kertas}; ${SH.kecil}`)}">
        <span style="flex: 1; font-size: 15px; font-weight: 600; color: ${T.samar};">
          Tulis pertanyaan…</span>
        ${ic('mic', 20, T.redup, 2.1)}
      </div>
      <span style="${S.row(0, ` justify-content: center; width: 58px; height: 58px; border-radius: 50%;`
        + ` background: ${T.aksen}; ${SH.tombol} flex: none;`)}">
        ${ic('send', 21, '#FFFFFF', 2.3)}</span>
    </div>
  `);
  return dc({ body });
}
