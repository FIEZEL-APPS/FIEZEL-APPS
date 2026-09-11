/* Lima tab menu utama + pengaturan. */
import { T, DOM, S, ic, dc, btn, chip, card, bar, eyebrow, paw, avatar, iconBtn, navBar,
  appHeader, PHONE_W, PHONE_H, TOP_SAFE } from './kit.mjs';

function sheet(body, pad = 20) {
  return `<div style="position: absolute; inset: ${TOP_SAFE}px ${pad}px 0 ${pad}px;">${body}</div>`;
}

/* Cincin progres — stroke-dashoffset, satu-satunya animasi non-transform yang disepakati. */
function ring(pct, teks, opt = {}) {
  const { size = 54, sw = 7, fill = T.marun, track = T.lineSoft, warna = T.ink } = opt;
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  return `<span style="position: relative; width: ${size}px; height: ${size}px; display: block; flex: none;">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${sw}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${fill}" stroke-width="${sw}"
        stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}"
        stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}"/>
    </svg>
    <span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 12.5px; font-weight: 800; color: ${warna};">${teks}</span>
  </span>`;
}

function sectionHead(judul, kanan = '') {
  return `<div style="${S.row(0, ' justify-content: space-between; align-items: baseline;')}">
    <h3 style="font-size: 17px;">${judul}</h3>
    ${kanan ? `<span style="font-size: 12.5px; font-weight: 800; color: ${T.marun};">${kanan}</span>` : ''}
  </div>`;
}

/* ---------- 11. Hari ini (beranda) ---------- */
/* Satu tata letak, dua bank copy — cerminan pasangan berkas copy-id dan copy-th di app.
   Nilai Thai di sini diambil dari features/i18n/copy-th-*.js kalau kuncinya sudah ada. */
export const ID = {
  sapa: 'Halo, Rani', tanggal: 'Selasa, 11 September',
  fokus: 'Fokus hari ini', judulFokus: 'Present Simple untuk kebiasaan',
  metaFokus: 'Grammar · A2 · 10 soal · lanjut dari kemarin', mulai: 'Mulai sesi',
  sesi: 'Sesi hari ini', sisa: '1 lagi, streak aman', menuju: 'menuju B1',
  lanjutkan: 'Lanjutkan', semua: 'Semua',
  kartu1: 'Makanan &amp; minuman', kartu2: 'Kabar dari Bali', menit: '2 mnt',
  judulSkill: 'Empat skill inti tes',
  skill: ['Menyimak', 'Berbicara', 'Membaca', 'Menulis'],
  nav: ['Latihan', 'KelasKu', 'Hari ini', 'Progres', 'Profil']
};
export const TH = {
  sapa: 'สวัสดี Rani', tanggal: 'อังคาร 11 กันยายน',
  fokus: 'โฟกัสวันนี้', judulFokus: 'Present Simple สำหรับกิจวัตรประจำวัน',
  metaFokus: 'ไวยากรณ์ · A2 · 10 ข้อ · ต่อจากเมื่อวาน', mulai: 'เริ่มบทเรียน',
  sesi: 'บทเรียนวันนี้', sisa: 'อีก 1 ครั้ง สตรีคปลอดภัย', menuju: 'ไปสู่ B1',
  lanjutkan: 'ทำต่อ', semua: 'ทั้งหมด',
  kartu1: 'อาหารและเครื่องดื่ม', kartu2: 'ข่าวจากบาหลี', menit: '2 นาที',
  judulSkill: 'สี่ทักษะหลักของข้อสอบ',
  skill: ['การฟัง', 'การพูด', 'การอ่าน', 'การเขียน'],
  nav: ['ฝึกฝน', 'ห้องเรียน', 'วันนี้', 'คืบหน้า', 'โปรไฟล์']
};

export function Main(L = ID) {
  const lanjut = (d, judul, meta, pct) =>
    `<div style="${S.col(0, ` flex: 1; min-width: 0; padding: 14px; border-radius: 20px;`
      + ` background: ${d.bg};`)}">
      <span style="${S.row(0, ' justify-content: space-between;')}">
        <span style="${S.row(0, ` justify-content: center; width: 32px; height: 32px; border-radius: 11px;`
          + ` background: rgba(255,255,255,.62);`)}">${ic(d.icon, 17, d.ink, 2.3)}</span>
        <span style="font-size: 11px; font-weight: 800; color: ${d.ink};">${meta}</span>
      </span>
      <b style="margin-top: 11px; font-size: 14px; color: ${d.ink}; letter-spacing: -0.01em;
        display: block; line-height: 1.25;">${judul}</b>
      <span style="display: block; margin-top: 10px;">
        ${bar(pct, { track: 'rgba(255,255,255,.6)', fill: d.ink, h: 6 })}
      </span>
    </div>`;

  const skill = (d, nama, pct) =>
    `<div style="${S.col(7, ` padding: 11px 8px; border-radius: 17px; background: ${d.bg}; align-items: center;`)}">
      ${ic(d.icon, 19, d.ink, 2.3)}
      <span style="font-size: 10.5px; font-weight: 800; color: ${d.ink}; white-space: nowrap;">${nama}</span>
      <span style="display: block; width: 100%;">${bar(pct, { track: 'rgba(255,255,255,.6)', fill: d.ink, h: 5 })}</span>
    </div>`;

  const body = sheet(`
    <div style="${S.row(0, ' justify-content: space-between;')}">
      <span style="${S.row(11)}">
        ${avatar('head-happy.webp', 46, T.sunSoft, 1.6, 10)}
        <span style="${S.col(2)}">
          <b style="font-size: 16.5px; letter-spacing: -0.015em;">${L.sapa}</b>
          <span style="font-size: 12px; font-weight: 600; color: ${T.ink3};">${L.tanggal}</span>
        </span>
      </span>
      <span style="${S.row(8)}">
        ${chip('7', { icon: 'flame', bg: T.sunSoft, color: '#7E5606', border: '#F5E2AE', pad: '8px 12px' })}
        ${iconBtn('bell', { size: 38 })}
      </span>
    </div>

    <div style="position: relative; margin-top: 16px; padding: 18px; border-radius: 26px;
      background: ${T.rimba}; overflow: hidden;">
      <span style="position: absolute; width: 190px; height: 190px; border-radius: 50%;
        background: rgba(216,179,107,.14); right: -56px; top: -70px;"></span>
      <div style="position: relative; z-index: 2; max-width: 224px;">
        ${eyebrow(L.fokus, 'rgba(253,246,232,.6)')}
        <h2 style="margin-top: 9px; font-size: 20px; color: ${T.sun}; line-height: 1.28;">
          ${L.judulFokus}
        </h2>
        <p style="margin-top: 8px; font-size: 12.5px; font-weight: 600; color: ${T.onRimbaMuted};">
          ${L.metaFokus}
        </p>
        <span style="${S.row(8, ` margin-top: 14px; padding: 0 20px; height: 48px; justify-content: center;`
          + ` border-radius: 999px; background: ${T.sun}; color: ${T.rimbaDeep}; font-weight: 800;`
          + ` font-size: 14.5px; box-shadow: 0 4px 0 ${T.sunDeep}; width: fit-content;`)}">
          <span>${L.mulai}</span>${ic('arrow-right', 17, T.rimbaDeep, 2.6)}
        </span>
      </div>
      <img src="hat-peek.webp" alt="" style="position: absolute; right: -20px; bottom: -30px;
        height: 196px; width: auto; z-index: 1;">
    </div>

    <div style="${S.row(10, ' margin-top: 13px;')}">
      <div style="${S.row(12, ` flex: 1; min-width: 0; padding: 12px 14px; border-radius: 19px; background: ${T.paper};`
        + ` border: 1px solid ${T.line};`)}">
        ${ring(66, '2/3')}
        <span style="${S.col(2, ' min-width: 0;')}">
          <b style="font-size: 14px;">${L.sesi}</b>
          <span style="font-size: 11.5px; font-weight: 600; color: ${T.ink3};">${L.sisa}</span>
        </span>
      </div>
      <div style="${S.col(3, ` width: 116px; flex: none; padding: 12px 14px; border-radius: 19px;`
        + ` background: ${T.paper}; border: 1px solid ${T.line};`)}">
        <span style="${S.row(6)}">
          <b style="font-size: 21px; letter-spacing: -0.02em;">A2</b>
          <span style="font-size: 11px; font-weight: 800; color: ${T.ok};">68%</span>
        </span>
        <span style="font-size: 11.5px; font-weight: 600; color: ${T.ink3};">${L.menuju}</span>
      </div>
    </div>

    <div style="margin-top: 16px;">${sectionHead(L.lanjutkan, L.semua)}</div>
    <div style="${S.row(10, ' margin-top: 10px;')}">
      ${lanjut(DOM.vocab, L.kartu1, '12/20', 60)}
      ${lanjut(DOM.reading, L.kartu2, L.menit, 25)}
    </div>

    <div style="margin-top: 15px;">${sectionHead(L.judulSkill)}</div>
    <div style="${S.grid(4, 8, ' margin-top: 10px;')}">
      ${skill(DOM.listen, L.skill[0], 72)}
      ${skill(DOM.speak, L.skill[1], 40)}
      ${skill(DOM.reading, L.skill[2], 55)}
      ${skill(DOM.write, L.skill[3], 30)}
    </div>
  `);

  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body: body + navBar('home', L.nav) });
}

export const MainTH = () => Main(TH);

/* ---------- 12. Latihan ---------- */
export function Latihan() {
  const tile = (d, meta, pct) =>
    `<div style="${S.col(0, ` padding: 15px; border-radius: 22px; background: ${d.bg}; min-height: 132px;`)}">
      <span style="${S.row(0, ` justify-content: center; width: 40px; height: 40px; border-radius: 14px;`
        + ` background: rgba(255,255,255,.66);`)}">${ic(d.icon, 20, d.ink, 2.3)}</span>
      <b style="margin-top: 12px; font-size: 16px; color: ${d.ink}; letter-spacing: -0.015em;">${d.label}</b>
      <span style="margin-top: 3px; font-size: 11.5px; font-weight: 700; color: ${d.ink}; opacity: .82;">${meta}</span>
      <span style="${S.row(9, ' margin-top: auto; padding-top: 12px;')}">
        <span style="flex: 1;">${bar(pct, { track: 'rgba(255,255,255,.62)', fill: d.ink, h: 6 })}</span>
        ${ic('arrow-right', 16, d.ink, 2.6)}
      </span>
    </div>`;

  const body = sheet(`
    ${appHeader('Latihan', chip('Level A2', { icon: 'sliders-horizontal' }))}
    <p style="margin-top: 6px; font-size: 14px; color: ${T.ink2};">Pilih skill, mulai dalam satu ketukan.</p>

    <div style="${S.row(14, ` margin-top: 16px; padding: 15px 16px; border-radius: 22px; background: ${T.sun};`
      + ` box-shadow: 0 4px 0 ${T.sunDeep}; position: relative; overflow: hidden;`)}">
      <span style="${S.row(0, ` justify-content: center; width: 46px; height: 46px; border-radius: 15px;`
        + ` background: ${T.rimbaDeep}; flex: none;`)}">${ic('zap', 23, T.sun, 2.4)}</span>
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 16.5px; color: ${T.rimbaDeep}; letter-spacing: -0.015em;">Sesi Kilat</b>
        <span style="font-size: 12px; font-weight: 700; color: rgba(20,51,38,.72); line-height: 1.4;">
          10 soal campur · 3 menit · dari materi yang sudah terbuka
        </span>
      </span>
      ${ic('arrow-right', 20, T.rimbaDeep, 2.6)}
    </div>

    <div style="${S.grid(2, 11, ' margin-top: 16px;')}">
      ${tile(DOM.grammar, 'Lesson 12 dari 129', 24)}
      ${tile(DOM.vocab, '18 kata perlu diulang', 64)}
      ${tile(DOM.listen, '3 audio baru', 72)}
      ${tile(DOM.speak, 'Rekaman disimpan lokal', 40)}
      ${tile(DOM.reading, '1 bacaan baru', 55)}
      ${tile(DOM.write, 'Prompt mingguan', 30)}
    </div>
  `);
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body: body + navBar('latihan') });
}

/* ---------- 13. KelasKu ---------- */
export function KelasKu() {
  const tugas = (hari, tgl, judul, isi, status) => {
    const warna = status === 'telat' ? { bg: T.badSoft, ink: T.bad }
      : status === 'selesai' ? { bg: T.okSoft, ink: T.ok } : { bg: T.sunSoft, ink: '#7E5606' };
    return `<div style="${S.row(13, ` padding: 12px 14px; border-radius: 19px; background: ${T.paper};`
      + ` border: 1px solid ${T.line};${status === 'selesai' ? ' opacity: .62;' : ''}`)}">
      <span style="${S.col(0, ` align-items: center; justify-content: center; width: 46px; height: 46px;`
        + ` border-radius: 15px; background: ${warna.bg}; color: ${warna.ink}; flex: none;`)}">
        <span style="font-size: 10px; font-weight: 800; text-transform: uppercase;">${hari}</span>
        <span style="font-size: 15px; font-weight: 800; line-height: 1;">${tgl}</span>
      </span>
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 14.5px; letter-spacing: -0.01em;">${judul}</b>
        <span style="font-size: 11.5px; font-weight: 600; color: ${T.ink3};">${isi}</span>
      </span>
      ${status === 'selesai' ? ic('circle-check-big', 20, T.ok, 2.4)
        : `<span style="${S.row(0, ` justify-content: center; height: 36px; padding: 0 15px; border-radius: 999px;`
          + ` background: ${T.marun}; color: ${T.cream}; font-size: 12.5px; font-weight: 800; flex: none;`)}">Kerjakan</span>`}
    </div>`;
  };

  const peringkat = (n, inisial, nama, xp, aku, warna) =>
    `<div style="${S.row(11, ` padding: 7px 10px; border-radius: 14px;`
      + (aku ? ` background: ${T.marunSoft};` : ''))}">
      <span style="width: 16px; font-size: 12.5px; font-weight: 800; color: ${aku ? T.marun : T.ink3};">${n}</span>
      <span style="${S.row(0, ` justify-content: center; width: 30px; height: 30px; border-radius: 50%;`
        + ` background: ${warna.bg}; color: ${warna.ink}; font-size: 11px; font-weight: 800; flex: none;`)}">${inisial}</span>
      <span style="flex: 1; font-size: 13.5px; font-weight: ${aku ? 800 : 600};">${nama}</span>
      <b style="font-size: 13.5px; color: ${aku ? T.marun : T.ink};">${xp}</b>
    </div>`;

  const body = sheet(`
    ${appHeader('KelasKu', chip('X IPA 2', { icon: 'users' }))}

    <div style="${S.row(12, ` margin-top: 14px; padding: 14px; border-radius: 20px; background: ${DOM.reading.bg};`)}">
      <span style="${S.row(0, ` justify-content: center; width: 42px; height: 42px; border-radius: 50%;`
        + ` background: rgba(255,255,255,.7); color: ${DOM.reading.ink}; font-size: 13px; font-weight: 800; flex: none;`)}">BS</span>
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 14px; color: ${DOM.reading.ink};">Bu Sari · wali kelas</b>
        <span style="font-size: 12.5px; font-weight: 600; color: ${DOM.reading.ink}; line-height: 1.4;">
          “Minggu ini fokus Present Simple ya. Tes hari Jumat.”
        </span>
      </span>
    </div>

    <div style="margin-top: 16px;">${sectionHead('Tugas', '2 belum')}</div>
    <div style="${S.col(9, ' margin-top: 10px;')}">
      ${tugas('Kam', '11', 'Grammar · Lesson 12 &amp; 13', 'Present Simple + Plural · 20 soal', 'telat')}
      ${tugas('Jum', '12', 'Berbicara · Perkenalan diri', 'Rekam 1 menit · dinilai guru', 'nanti')}
      ${tugas('Rab', '10', 'Kosakata · Makanan', 'Selesai · 18 dari 20', 'selesai')}
    </div>

    <div style="${S.col(0, ` margin-top: 16px; padding: 15px; border-radius: 21px; background: ${T.paper};`
      + ` border: 1px solid ${T.line};`)}">
      ${sectionHead('Papan kelas · minggu ini')}
      <div style="${S.col(2, ' margin-top: 8px;')}">
        ${peringkat(1, 'DA', 'Dara', 340, false, { bg: DOM.speak.bg, ink: DOM.speak.ink })}
        ${peringkat(2, 'RF', 'Rafi', 310, false, { bg: DOM.grammar.bg, ink: DOM.grammar.ink })}
        ${peringkat(3, 'RA', 'Rani (kamu)', 296, true, { bg: DOM.listen.bg, ink: DOM.listen.ink })}
        ${peringkat(4, 'NB', 'Nabil', 250, false, { bg: DOM.vocab.bg, ink: DOM.vocab.ink })}
      </div>
    </div>
  `);
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body: body + navBar('kelas') });
}

/* ---------- 14. Progres ---------- */
export function Progres() {
  const hari = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];
  const isi = [1, 1, 2, 1, 1, 1, 0];
  const minggu = hari.map((h, i) => {
    const bgv = isi[i] === 2 ? T.sunDeep : isi[i] === 1 ? T.sun : 'transparent';
    const br = isi[i] === 0 ? `border: 2px dashed ${T.line};` : '';
    return `<span style="${S.col(6, ' align-items: center; flex: 1;')}">
      <span style="width: 100%; height: 34px; border-radius: 11px; background: ${bgv}; ${br}"></span>
      <span style="font-size: 10.5px; font-weight: 800; color: ${T.ink3};">${h}</span>
    </span>`;
  }).join('');

  const skl = (d, pct) =>
    `<span style="${S.row(11)}">
      <span style="${S.row(0, ` justify-content: center; width: 34px; height: 34px; border-radius: 12px;`
        + ` background: ${d.bg}; flex: none;`)}">${ic(d.icon, 17, d.ink, 2.3)}</span>
      <span style="width: 68px; font-size: 12.5px; font-weight: 700; color: ${T.ink2};">${d.label}</span>
      <span style="flex: 1;">${bar(pct, { track: T.lineSoft, fill: d.ink, h: 7 })}</span>
      <b style="width: 34px; text-align: right; font-size: 12.5px;">${pct}%</b>
    </span>`;

  const body = sheet(`
    ${appHeader('Progres', chip('Riwayat', { icon: 'history' }))}

    <div style="position: relative; margin-top: 14px; padding: 17px; border-radius: 24px;
      background: ${T.rimbaDeep}; overflow: hidden;">
      ${eyebrow('Level kamu', 'rgba(253,246,232,.55)')}
      <div style="${S.row(13, ' margin-top: 8px;')}">
        <span style="font-size: 42px; font-weight: 800; color: ${T.sun}; line-height: 1; letter-spacing: -0.03em;">A2</span>
        <span style="font-size: 12.5px; font-weight: 600; color: ${T.onRimbaMuted}; line-height: 1.45; max-width: 190px;">
          68% menuju <b style="color: ${T.onRimba};">B1</b>. Sekitar 9 sesi lagi kalau tetap 1 sesi sehari.
        </span>
      </div>
      <div style="margin-top: 14px;">${bar(68, { track: 'rgba(253,246,232,.16)', fill: T.sun, h: 8 })}</div>
    </div>

    <div style="${S.col(0, ` margin-top: 13px; padding: 15px; border-radius: 21px; background: ${T.paper};`
      + ` border: 1px solid ${T.line};`)}">
      ${sectionHead('Minggu ini', '7 hari berturut')}
      <div style="${S.row(7, ' margin-top: 12px;')}">${minggu}</div>
    </div>

    <div style="${S.col(0, ` margin-top: 13px; padding: 15px; border-radius: 21px; background: ${T.paper};`
      + ` border: 1px solid ${T.line};`)}">
      ${sectionHead('Penguasaan skill', '30 hari')}
      <div style="${S.col(9, ' margin-top: 11px;')}">
        ${skl(DOM.listen, 72)}
        ${skl(DOM.vocab, 64)}
        ${skl(DOM.reading, 55)}
        ${skl(DOM.speak, 40)}
        ${skl(DOM.write, 30)}
        ${skl(DOM.grammar, 24)}
      </div>
    </div>

    <div style="${S.row(12, ` margin-top: 13px; padding: 14px; border-radius: 19px; background: ${T.badSoft};`)}">
      ${ic('lightbulb', 20, T.bad, 2.2)}
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 13.5px; color: ${T.bad};">Akar masalah yang berulang</b>
        <span style="font-size: 12px; font-weight: 600; color: ${T.bad}; opacity: .85; line-height: 1.4;">
          Kata kerja orang ketiga tunggal — 6 salah dari 9 percobaan.
        </span>
      </span>
    </div>
  `);
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body: body + navBar('progres') });
}

/* ---------- 15. Profil ---------- */
export function Profil() {
  const stat = (angka, label, warna) =>
    `<div style="${S.col(3, ` flex: 1; align-items: center; padding: 13px 8px; border-radius: 18px;`
      + ` background: ${T.paper}; border: 1px solid ${T.line};`)}">
      <b style="font-size: 19px; color: ${warna}; letter-spacing: -0.02em;">${angka}</b>
      <span style="font-size: 11px; font-weight: 700; color: ${T.ink3};">${label}</span>
    </div>`;

  const baris = (icon, judul, kanan = '', warna = T.ink2) =>
    `<div style="${S.row(13, ' padding: 13px 2px;')}">
      <span style="${S.row(0, ` justify-content: center; width: 36px; height: 36px; border-radius: 12px;`
        + ` background: ${T.creamSoft}; flex: none;`)}">${ic(icon, 18, warna, 2.2)}</span>
      <span style="flex: 1; font-size: 14.5px; font-weight: 700; color: ${warna === T.bad ? T.bad : T.ink};">${judul}</span>
      ${kanan ? `<span style="font-size: 12.5px; font-weight: 700; color: ${T.ink3};">${kanan}</span>` : ''}
      ${ic('chevron-right', 18, T.ink3, 2.2)}
    </div>`;

  const body = sheet(`
    ${appHeader('Profil', iconBtn('settings-2'))}

    <div style="${S.row(14, ` margin-top: 14px; padding: 16px; border-radius: 24px; background: ${T.paper};`
      + ` border: 1px solid ${T.line};`)}">
      ${avatar('head-happy.webp', 66, T.sunSoft, 1.6, 10)}
      <span style="${S.col(5, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 19px; letter-spacing: -0.02em;">Rani Saputri</b>
        <span style="${S.row(7)}">
          ${chip('A2 · CEFR', { bg: T.marunSoft, color: T.marun, border: T.marunSoft, fs: 11.5, pad: '5px 10px' })}
          ${chip('X IPA 2', { bg: T.creamSoft, color: T.ink2, border: T.creamSoft, fs: 11.5, pad: '5px 10px' })}
        </span>
      </span>
      ${paw(26, T.emas)}
    </div>

    <div style="${S.row(9, ' margin-top: 12px;')}">
      ${stat('7', 'Hari streak', T.sunDeep)}
      ${stat('296', 'Gem', T.marun)}
      ${stat('41', 'Lesson tuntas', T.ok)}
    </div>

    <div style="${S.col(0, ` margin-top: 14px; padding: 4px 14px; border-radius: 22px; background: ${T.paper};`
      + ` border: 1px solid ${T.line};`)}">
      ${baris('user-round', 'Akun dan kata sandi', 'rani.sp')}
      <span style="height: 1px; background: ${T.lineSoft};"></span>
      ${baris('school', 'Kelas dan guru', '1 kelas')}
      <span style="height: 1px; background: ${T.lineSoft};"></span>
      ${baris('bell', 'Pengingat harian', '19.00')}
      <span style="height: 1px; background: ${T.lineSoft};"></span>
      ${baris('languages', 'Bahasa tampilan', 'Indonesia')}
      <span style="height: 1px; background: ${T.lineSoft};"></span>
      ${baris('volume-2', 'Suara dan neural voice')}
      <span style="height: 1px; background: ${T.lineSoft};"></span>
      ${baris('download', 'Unduhan untuk luring')}
    </div>

    <div style="${S.col(0, ` margin-top: 11px; padding: 4px 14px; border-radius: 22px; background: ${T.paper};`
      + ` border: 1px solid ${T.line};`)}">
      ${baris('message-circle-question', 'Bantuan')}
      <span style="height: 1px; background: ${T.lineSoft};"></span>
      ${baris('log-out', 'Keluar akun', '', T.bad)}
    </div>
  `);
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body: body + navBar('profil') });
}

/* ---------- 16. Pengaturan (lembar di atas Hari ini) ---------- */
export function Pengaturan() {
  const sakelar = (on) =>
    `<span style="width: 48px; height: 28px; border-radius: 999px; flex: none;
      background: ${on ? T.marun : T.line}; position: relative; display: block;">
      <span style="position: absolute; top: 3px; ${on ? 'right: 3px;' : 'left: 3px;'}
        width: 22px; height: 22px; border-radius: 50%; background: ${T.paper};
        box-shadow: 0 1px 3px rgba(34,25,15,.25);"></span>
    </span>`;

  const baris = (judul, isi, kontrol) =>
    `<div style="${S.row(13, ' padding: 13px 0;')}">
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 14.5px; letter-spacing: -0.01em;">${judul}</b>
        <span style="font-size: 12px; font-weight: 600; color: ${T.ink3}; line-height: 1.4;">${isi}</span>
      </span>
      ${kontrol}
    </div>`;

  const pilihanBahasa = `<span style="${S.row(5)}">
    <span style="${S.row(0, ` justify-content: center; height: 32px; padding: 0 13px; border-radius: 999px;`
      + ` background: ${T.marun}; color: ${T.cream}; font-size: 12px; font-weight: 800;`)}">ID</span>
    <span style="${S.row(0, ` justify-content: center; height: 32px; padding: 0 13px; border-radius: 999px;`
      + ` background: ${T.creamSoft}; color: ${T.ink2}; font-size: 12px; font-weight: 800;`)}">TH</span>
  </span>`;

  const lembar = `
    <div style="position: absolute; left: 0; right: 0; bottom: 0; height: 700px; background: ${T.cream};
      border-radius: 30px 30px 0 0; box-shadow: 0 -12px 40px rgba(34,25,15,.22); padding: 14px 22px 0 22px;">
      <span style="display: block; width: 46px; height: 5px; border-radius: 999px; background: ${T.line};
        margin: 0 auto 16px auto;"></span>
      <div style="${S.row(0, ' justify-content: space-between;')}">
        <h1 style="font-size: 24px;">Pengaturan</h1>
        ${iconBtn('x', { bg: T.creamSoft, border: T.creamSoft, size: 36 })}
      </div>

      <div style="margin-top: 16px;">${eyebrow('Tampilan')}</div>
      <div style="${S.col(0, ` margin-top: 8px; padding: 2px 15px; border-radius: 20px; background: ${T.paper};`
        + ` border: 1px solid ${T.line};`)}">
        ${baris('Bahasa tampilan', 'Semua teks ada dalam Indonesia dan ภาษาไทย', pilihanBahasa)}
        <span style="height: 1px; background: ${T.lineSoft};"></span>
        ${baris('Mode gelap', 'Ikut setelan sistem', sakelar(false))}
        <span style="height: 1px; background: ${T.lineSoft};"></span>
        ${baris('Kurangi gerak', 'Maskot berhenti bereaksi, bukan melambat', sakelar(true))}
      </div>

      <div style="margin-top: 16px;">${eyebrow('Belajar')}</div>
      <div style="${S.col(0, ` margin-top: 8px; padding: 2px 15px; border-radius: 20px; background: ${T.paper};`
        + ` border: 1px solid ${T.line};`)}">
        ${baris('Target harian', '1 sesi · sekitar 10 menit',
          `<span style="${S.row(6)}">${chip('1 sesi', { bg: T.creamSoft, border: T.creamSoft, fs: 12 })}
            ${ic('chevron-right', 18, T.ink3, 2.2)}</span>`)}
        <span style="height: 1px; background: ${T.lineSoft};"></span>
        ${baris('Pengingat harian', 'Setiap hari pukul 19.00', sakelar(true))}
      </div>

      <div style="margin-top: 16px;">${eyebrow('Suara')}</div>
      <div style="${S.col(0, ` margin-top: 8px; padding: 2px 15px; border-radius: 20px; background: ${T.paper};`
        + ` border: 1px solid ${T.line};`)}">
        ${baris('Suara neural', 'Butuh jaringan. Tanpa jaringan dipakai suara bawaan peranti.', sakelar(true))}
      </div>
    </div>`;

  const belakang = sheet(`
    <div style="${S.row(0, ' justify-content: space-between;')}">
      <span style="${S.row(11)}">
        ${avatar('head-happy.webp', 46, T.sunSoft, 1.6, 10)}
        <span style="${S.col(2)}">
          <b style="font-size: 16.5px; letter-spacing: -0.015em;">Halo, Rani</b>
          <span style="font-size: 12px; font-weight: 600; color: ${T.ink3};">Selasa, 11 September</span>
        </span>
      </span>
      <span style="${S.row(8)}">
        ${chip('7', { icon: 'flame', bg: T.sunSoft, color: '#7E5606', border: '#F5E2AE', pad: '8px 12px' })}
        ${iconBtn('settings-2', { size: 38, bg: T.marunSoft, border: T.marunSoft, color: T.marun })}
      </span>
    </div>
    <div style="position: relative; margin-top: 16px; height: 150px; border-radius: 26px;
      background: ${T.rimba}; overflow: hidden;">
      <div style="padding: 18px; max-width: 224px;">
        ${eyebrow('Fokus hari ini', 'rgba(253,246,232,.6)')}
        <h2 style="margin-top: 9px; font-size: 20px; color: ${T.sun}; line-height: 1.22;">
          Present Simple untuk kebiasaan
        </h2>
      </div>
      <img src="hat-peek.webp" alt="" style="position: absolute; right: -20px; bottom: -30px;
        height: 168px; width: auto;">
    </div>
  `);
  const latar = `<div style="position: absolute; inset: 0; background: rgba(20,51,38,.46);"></div>`;
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body: belakang + latar + lembar });
}
