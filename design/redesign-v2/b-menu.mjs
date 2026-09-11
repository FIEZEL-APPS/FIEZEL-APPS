/* Lima tab menu utama + pengaturan, dalam arah "Lembut". */
import { T, D, S, R, SH, JUDUL, ic, dc, isi, kartu, tombol, chip, ikonTombol, bar, cincin,
  eyebrow, judulBagian, barisDaftar, sakelar, nav, NAV_TH, maskot, bayangan, cahaya, inisial,
  paw } from './b-kit.mjs';

/* Satu tata letak, dua bank copy — cerminan pasangan berkas copy-id dan copy-th
   di app. Nilai Thai diambil dari bank yang sudah ada kalau kuncinya tersedia. */
export const ID = {
  tanggal: 'Selasa, 11 September', sapa: 'Halo, Rani',
  fokus: 'Fokus hari ini', judulFokus: 'Present Simple<br>untuk kebiasaan',
  metaFokus: 'Grammar · A2 · 10 soal', mulai: 'Mulai sesi',
  sesi: 'Sesi hari ini', sisa: '1 lagi', menuju: 'menuju B1',
  lanjutkan: 'Lanjutkan', semua: 'Semua',
  kartu1: 'Makanan &amp; minuman', meta1: '12 dari 20',
  kartu2: 'Kabar dari Bali', meta2: '2 menit',
  tanya: 'Tanya Mira', tanyaIsi: 'Bingung soal tadi? Tanya pelan-pelan.',
  nav: null
};
export const TH = {
  tanggal: 'อังคาร 11 กันยายน', sapa: 'สวัสดี Rani',
  fokus: 'โฟกัสวันนี้', judulFokus: 'Present Simple<br>สำหรับกิจวัตรประจำวัน',
  metaFokus: 'ไวยากรณ์ · A2 · 10 ข้อ', mulai: 'เริ่มบทเรียน',
  sesi: 'บทเรียนวันนี้', sisa: 'อีก 1 ครั้ง', menuju: 'ไปสู่ B1',
  lanjutkan: 'ทำต่อ', semua: 'ทั้งหมด',
  kartu1: 'อาหารและเครื่องดื่ม', meta1: '12 จาก 20',
  kartu2: 'ข่าวจากบาหลี', meta2: '2 นาที',
  tanya: 'ถามมีร่า', tanyaIsi: 'งงข้อเมื่อกี้ไหม? ถามได้เลย',
  nav: NAV_TH
};

/* ---------- Hari ini ---------- */
export function Main(L = ID) {
  const ubinLanjut = (d, judul, meta, pct) =>
    `<div style="${S.col(0, ` flex: 1; min-width: 0; padding: 16px; border-radius: ${R.ubin}px;`
      + ` background: ${d.bg};`)}">
      ${ic(d.icon, 19, d.ink, 2.1)}
      <b style="margin-top: 12px; font-family: ${JUDUL}; font-weight: 700; font-size: 14.5px;
        color: ${d.ink}; line-height: 1.25; display: block;">${judul}</b>
      <span style="margin-top: 3px; font-size: 11.5px; font-weight: 600; color: ${d.ink};
        opacity: .72;">${meta}</span>
      <span style="display: block; margin-top: 12px;">
        ${bar(pct, { jalur: 'rgba(255,255,255,.7)', isiWarna: d.ink, h: 5 })}</span>
    </div>`;

  const body = isi(`
    <div style="${S.row(0, ' justify-content: space-between; align-items: flex-start;')}">
      <div>
        <span style="font-size: 12.5px; font-weight: 600; color: ${T.samar};">${L.tanggal}</span>
        <h1 style="margin-top: 5px; font-size: 29px;">${L.sapa}</h1>
      </div>
      ${chip('7', { icon: 'flame', warna: T.emas, bg: T.kertas })}
    </div>

    <div style="position: relative; margin-top: 20px; padding: 20px; border-radius: ${R.besar}px;
      background: ${T.kertas}; ${SH.kartu} overflow: hidden;">
      ${cahaya(168, -72, 262, 'rgba(155,58,74,.09)')}
      <div style="${S.row(6, ' position: relative; align-items: flex-end;')}">
        <div style="${S.col(0, ' flex: 1; min-width: 0;')}">
          ${eyebrow(L.fokus)}
          <h2 style="margin-top: 9px; font-size: 22px;">${L.judulFokus}</h2>
          <p style="margin-top: 8px; font-size: 12px; font-weight: 600; color: ${T.redup};">
            ${L.metaFokus}</p>
          <span style="margin-top: 16px; display: block;">
            ${tombol(L.mulai, { lebar: 'fit-content', h: 48, fs: 15 })}</span>
        </div>
        <span style="${S.col(0, ' align-items: center; flex: none;')}">
          ${maskot('shoulder-wave.webp', 158)}
          ${bayangan(88, .16)}
        </span>
      </div>
    </div>

    <div style="${S.row(12, ' margin-top: 16px;')}">
      ${kartu(`<span style="${S.row(13)}">
        ${cincin(66, '2/3')}
        <span style="${S.col(2, ' min-width: 0;')}">
          <b style="font-size: 13.5px;">${L.sesi}</b>
          <span style="font-size: 11.5px; font-weight: 600; color: ${T.samar};">${L.sisa}</span>
        </span></span>`, { pad: 15, extra: 'flex: 1; min-width: 0;' })}
      ${kartu(`<span style="${S.col(2)}">
        <span style="${S.row(6)}">
          <b style="font-family: ${JUDUL}; font-weight: 700; font-size: 21px;">A2</b>
          <span style="font-size: 11px; font-weight: 700; color: ${D.speak.ink};">68%</span>
        </span>
        <span style="font-size: 11.5px; font-weight: 600; color: ${T.samar};">${L.menuju}</span>
      </span>`, { pad: 15, extra: 'width: 118px; flex: none;' })}
    </div>

    <div style="margin-top: 20px;">${judulBagian(L.lanjutkan, L.semua)}</div>
    <div style="${S.row(12, ' margin-top: 11px;')}">
      ${ubinLanjut(D.vocab, L.kartu1, L.meta1, 60)}
      ${ubinLanjut(D.reading, L.kartu2, L.meta2, 25)}
    </div>

    <div style="margin-top: 16px;">
      ${kartu(`<span style="${S.row(14)}">
        <span style="${S.row(0, ` justify-content: center; width: 52px; height: 52px;`
          + ` border-radius: 50%; background: ${D.reading.bg}; flex: none;`)}">
          ${ic('message-circle-question', 24, D.reading.ink, 2.1)}</span>
        <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
          <b style="font-family: ${JUDUL}; font-weight: 700; font-size: 16px;">${L.tanya}</b>
          <span style="font-size: 11.5px; font-weight: 600; color: ${T.redup}; line-height: 1.4;">
            ${L.tanyaIsi}</span>
        </span>
        ${ic('arrow-right', 19, T.samar, 2.2)}
      </span>`, { pad: 14 })}
    </div>
  `);
  return dc({ body: body + nav(2, L.nav) });
}

export const MainThai = () => Main(TH);

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
        ${bar(pct, { jalur: 'rgba(255,255,255,.75)', isiWarna: d.ink, h: 5 })}</span>
    </div>`;

  const body = isi(`
    <h1 style="font-size: 29px;">Latihan</h1>
    <p style="margin-top: 7px; font-size: 14px; font-weight: 600; color: ${T.redup};">
      Pilih satu. Sepuluh menit sudah cukup.</p>

    <div style="margin-top: 20px;">
      ${kartu(`<span style="${S.row(14)}">
        <span style="${S.row(0, ` justify-content: center; width: 50px; height: 50px; border-radius: 50%;`
          + ` background: ${T.aksenLembut}; flex: none;`)}">${ic('zap', 23, T.aksen, 2.2)}</span>
        <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
          <b style="font-family: ${JUDUL}; font-weight: 700; font-size: 17px;">Sesi Kilat</b>
          <span style="font-size: 12px; font-weight: 600; color: ${T.redup};">
            10 soal campur · 3 menit</span>
        </span>
        ${ic('arrow-right', 20, T.samar, 2.2)}
      </span>`, { pad: 18, radius: 30 })}
    </div>

    <div style="${S.grid(2, 13, ' margin-top: 16px;')}">
      ${ubin(D.grammar, 'Lesson 12 dari 129', 24)}
      ${ubin(D.vocab, '18 kata perlu diulang', 64)}
      ${ubin(D.listen, '3 audio baru', 72)}
      ${ubin(D.speak, 'Rekaman di perangkat', 40)}
      ${ubin(D.reading, '1 bacaan baru', 55)}
      ${ubin(D.write, 'Prompt mingguan', 30)}
    </div>
  `);
  return dc({ body: body + nav(0) });
}

/* ---------- KelasKu ---------- */
export function KelasKu() {
  const tugas = (hari, tgl, judul, sub, status) => {
    const w = status === 'telat' ? { bg: T.badLembut, ink: T.bad }
      : status === 'selesai' ? { bg: T.okLembut, ink: T.ok } : { bg: T.emasLembut, ink: T.emas };
    return kartu(`<span style="${S.row(14)}">
      <span style="${S.col(0, ` align-items: center; justify-content: center; width: 48px; height: 48px;`
        + ` border-radius: 50%; background: ${w.bg}; color: ${w.ink}; flex: none;`)}">
        <span style="font-size: 9.5px; font-weight: 700; text-transform: uppercase;">${hari}</span>
        <span style="font-family: ${JUDUL}; font-size: 15px; font-weight: 700; line-height: 1;">${tgl}</span>
      </span>
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 14px; font-weight: 700;">${judul}</b>
        <span style="font-size: 11.5px; font-weight: 600; color: ${T.samar};">${sub}</span>
      </span>
      ${status === 'selesai'
        ? ic('circle-check-big', 21, T.ok, 2.2)
        : `<span style="${S.row(0, ` justify-content: center; height: 36px; padding: 0 16px;`
            + ` border-radius: ${R.pil}px; background: ${T.aksenLembut}; color: ${T.aksen};`
            + ` font-family: ${JUDUL}; font-size: 12.5px; font-weight: 700; flex: none;`)}">Kerjakan</span>`}
    </span>`, { pad: 14, extra: status === 'selesai' ? 'opacity: .62;' : '' });
  };

  const peringkat = (n, ini, nama, xp, aku, w) =>
    `<div style="${S.row(12, ` padding: 9px 10px; border-radius: 18px;`
      + (aku ? ` background: ${T.aksenLembut};` : ''))}">
      <span style="width: 14px; font-size: 12.5px; font-weight: 700;
        color: ${aku ? T.aksen : T.samar};">${n}</span>
      <span style="${S.row(0, ` justify-content: center; width: 32px; height: 32px; border-radius: 50%;`
        + ` background: ${w.bg}; color: ${w.ink}; font-family: ${JUDUL}; font-size: 11.5px;`
        + ` font-weight: 700; flex: none;`)}">${ini}</span>
      <span style="flex: 1; font-size: 13.5px; font-weight: ${aku ? 700 : 600};">${nama}</span>
      <b style="font-size: 13.5px; color: ${aku ? T.aksen : T.tinta};">${xp}</b>
    </div>`;

  const body = isi(`
    <div style="${S.row(0, ' justify-content: space-between; align-items: center;')}">
      <h1 style="font-size: 29px;">KelasKu</h1>
      ${chip('X IPA 2', { icon: 'users', warna: T.redup })}
    </div>

    <div style="${S.row(13, ` margin-top: 18px; padding: 16px; border-radius: 28px;`
      + ` background: ${D.reading.bg};`)}">
      <span style="${S.row(0, ` justify-content: center; width: 44px; height: 44px; border-radius: 50%;`
        + ` background: rgba(255,255,255,.78); color: ${D.reading.ink}; font-family: ${JUDUL};`
        + ` font-size: 13px; font-weight: 700; flex: none;`)}">BS</span>
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 13.5px; font-weight: 700; color: ${D.reading.ink};">Bu Sari · wali kelas</b>
        <span style="font-size: 12.5px; font-weight: 600; color: ${D.reading.ink}; line-height: 1.45;">
          “Minggu ini fokus Present Simple ya. Tes hari Jumat.”</span>
      </span>
    </div>

    <div style="margin-top: 20px;">${judulBagian('Tugas', '2 belum')}</div>
    <div style="${S.col(10, ' margin-top: 11px;')}">
      ${tugas('Kam', '11', 'Grammar · Lesson 12 &amp; 13', 'Present Simple · 20 soal', 'telat')}
      ${tugas('Jum', '12', 'Berbicara · Perkenalan diri', 'Rekam 1 menit · dinilai guru', 'nanti')}
      ${tugas('Rab', '10', 'Kosakata · Makanan', 'Selesai · 18 dari 20', 'selesai')}
    </div>

    <div style="margin-top: 18px;">
      ${kartu(`${judulBagian('Papan kelas', 'minggu ini')}
        <div style="${S.col(2, ' margin-top: 10px;')}">
          ${peringkat(1, 'DA', 'Dara', 340, false, { bg: D.speak.bg, ink: D.speak.ink })}
          ${peringkat(2, 'RF', 'Rafi', 310, false, { bg: D.grammar.bg, ink: D.grammar.ink })}
          ${peringkat(3, 'RA', 'Rani (kamu)', 296, true, { bg: D.listen.bg, ink: D.listen.ink })}
          ${peringkat(4, 'NB', 'Nabil', 250, false, { bg: D.vocab.bg, ink: D.vocab.ink })}
        </div>`, { pad: 16 })}
    </div>
  `);
  return dc({ body: body + nav(1) });
}

/* ---------- Progres ---------- */
export function Progres() {
  const hari = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];
  const isiHari = [1, 1, 2, 1, 1, 1, 0];
  const minggu = hari.map((h, i) => {
    const bg = isiHari[i] === 2 ? T.aksen : isiHari[i] === 1 ? '#E7C3C9' : 'transparent';
    const garis = isiHari[i] === 0 ? 'box-shadow: inset 0 0 0 2px #ECE3DA;' : '';
    return `<span style="${S.col(7, ' align-items: center; flex: 1;')}">
      <span style="width: 100%; height: 36px; border-radius: 13px; background: ${bg}; ${garis}"></span>
      <span style="font-size: 10.5px; font-weight: 700; color: ${T.samar};">${h}</span>
    </span>`;
  }).join('');

  const skl = (d, pct) =>
    `<span style="${S.row(12)}">
      <span style="${S.row(0, ` justify-content: center; width: 36px; height: 36px; border-radius: 50%;`
        + ` background: ${d.bg}; flex: none;`)}">${ic(d.icon, 17, d.ink, 2.1)}</span>
      <span style="width: 70px; font-size: 12.5px; font-weight: 700; color: ${T.redup};">${d.label}</span>
      <span style="flex: 1;">${bar(pct, { isiWarna: d.ink, h: 6 })}</span>
      <b style="width: 34px; text-align: right; font-size: 12.5px;">${pct}%</b>
    </span>`;

  const body = isi(`
    <div style="${S.row(0, ' justify-content: space-between; align-items: center;')}">
      <h1 style="font-size: 29px;">Progres</h1>
      ${chip('Riwayat', { icon: 'history', warna: T.redup })}
    </div>

    <div style="margin-top: 18px;">
      ${kartu(`
        ${eyebrow('Tingkat kamu')}
        <div style="${S.row(14, ' margin-top: 10px; align-items: flex-end;')}">
          <span style="font-family: ${JUDUL}; font-size: 44px; font-weight: 700; line-height: .95;
            letter-spacing: -0.03em; color: ${T.aksen};">A2</span>
          <span style="font-size: 12.5px; font-weight: 600; color: ${T.redup}; line-height: 1.45;
            max-width: 186px; padding-bottom: 4px;">
            68% menuju <b style="color: ${T.tinta};">B1</b>. Sekitar 9 sesi lagi
            kalau tetap 1 sesi sehari.</span>
        </div>
        <div style="margin-top: 16px;">${bar(68, { h: 8 })}</div>`, { pad: 18, radius: R.besar })}
    </div>

    <div style="margin-top: 14px;">
      ${kartu(`${judulBagian('Minggu ini', '7 hari berturut')}
        <div style="${S.row(8, ' margin-top: 13px;')}">${minggu}</div>`, { pad: 16 })}
    </div>

    <div style="margin-top: 14px;">
      ${kartu(`${judulBagian('Penguasaan skill', '30 hari')}
        <div style="${S.col(10, ' margin-top: 12px;')}">
          ${skl(D.listen, 72)}${skl(D.vocab, 64)}${skl(D.reading, 55)}
          ${skl(D.speak, 40)}${skl(D.write, 30)}${skl(D.grammar, 24)}
        </div>`, { pad: 16 })}
    </div>

    <div style="${S.row(13, ` margin-top: 14px; padding: 16px; border-radius: 26px;`
      + ` background: ${T.badLembut};`)}">
      <span style="${S.row(0, ` justify-content: center; width: 40px; height: 40px; border-radius: 50%;`
        + ` background: rgba(255,255,255,.7); flex: none;`)}">${ic('lightbulb', 19, T.bad, 2.1)}</span>
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 13.5px; font-weight: 700; color: ${T.bad};">Akar masalah yang berulang</b>
        <span style="font-size: 12px; font-weight: 600; color: ${T.bad}; opacity: .86; line-height: 1.45;">
          Kata kerja orang ketiga tunggal — 6 salah dari 9 percobaan.</span>
      </span>
    </div>
  `);
  return dc({ body: body + nav(3) });
}

/* ---------- Profil ---------- */
export function Profil() {
  const angka = (n, label, warna) =>
    `<span style="${S.col(1, ' flex: 1; align-items: center;')}">
      <b style="font-family: ${JUDUL}; font-size: 17px; font-weight: 700; color: ${warna};
        letter-spacing: -0.02em;">${n}</b>
      <span style="font-size: 10.5px; font-weight: 600; color: ${T.samar};">${label}</span>
    </span>`;

  const body = isi(`
    <div style="${S.row(0, ' justify-content: space-between; align-items: center;')}">
      <h1 style="font-size: 29px;">Profil</h1>
      ${ikonTombol('settings-2')}
    </div>

    <div style="margin-top: 18px;">
      ${kartu(`
        <span style="${S.row(15)}">
          ${inisial('RA', 62)}
          <span style="${S.col(6, ' flex: 1; min-width: 0;')}">
            <b style="font-family: ${JUDUL}; font-size: 19px; font-weight: 700;">Rani Saputri</b>
            <span style="${S.row(7)}">
              ${chip('A2 · CEFR', { bg: T.aksenLembut, warna: T.aksen, fs: 11.5,
                pad: '5px 11px', bayang: '' })}
              ${chip('X IPA 2', { bg: '#F1EAE3', warna: T.redup, fs: 11.5,
                pad: '5px 11px', bayang: '' })}
            </span>
          </span>
          ${paw(24, T.aksenLembut)}
        </span>
        <span style="display: block; height: 1px; background: #F1EAE3; margin: 15px 0;"></span>
        <span style="${S.row(0)}">
          ${angka('7', 'Hari streak', T.emas)}
          ${angka('296', 'Gem', T.aksen)}
          ${angka('41', 'Lesson tuntas', T.ok)}
        </span>`, { pad: 17, radius: R.besar })}
    </div>

    <div style="margin-top: 15px;">
      ${kartu(`
        ${barisDaftar('user-round', 'Akun dan kata sandi', { kanan: 'rani.sp' })}
        ${barisDaftar('school', 'Kelas dan guru', { kanan: '1 kelas' })}
        ${barisDaftar('bell', 'Pengingat harian', { kanan: '19.00' })}
        ${barisDaftar('languages', 'Bahasa tampilan', { kanan: 'Indonesia' })}
        ${barisDaftar('volume-2', 'Suara dan neural voice')}
        ${barisDaftar('download', 'Unduhan untuk luring')}`, { pad: 16, radius: R.besar })}
    </div>

    <div style="margin-top: 12px;">
      ${kartu(`
        ${barisDaftar('message-circle-question', 'Bantuan')}
        ${barisDaftar('log-out', 'Keluar akun', { warna: T.bad, bgIkon: T.badLembut, warnaIkon: T.bad })}`,
        { pad: 16, radius: R.besar })}
    </div>
  `);
  return dc({ body: body + nav(4) });
}

/* ---------- Pengaturan (lembar di atas Hari ini) ---------- */
export function Pengaturan() {
  const baris = (judul, sub, kontrol) =>
    `<div style="${S.row(14, ' padding: 11px 0;')}">
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 14.5px; font-weight: 700;">${judul}</b>
        <span style="font-size: 12px; font-weight: 600; color: ${T.samar}; line-height: 1.45;">${sub}</span>
      </span>
      ${kontrol}
    </div>`;

  const bahasa = `<span style="${S.row(6)}">
    <span style="${S.row(0, ` justify-content: center; height: 34px; padding: 0 14px;`
      + ` border-radius: ${R.pil}px; background: ${T.aksen}; color: #FFFFFF;`
      + ` font-family: ${JUDUL}; font-size: 12px; font-weight: 700;`)}">ID</span>
    <span style="${S.row(0, ` justify-content: center; height: 34px; padding: 0 14px;`
      + ` border-radius: ${R.pil}px; background: #F1EAE3; color: ${T.redup};`
      + ` font-family: ${JUDUL}; font-size: 12px; font-weight: 700;`)}">TH</span>
  </span>`;

  const belakang = isi(`
    <div style="${S.row(0, ' justify-content: space-between; align-items: flex-start;')}">
      <div>
        <span style="font-size: 12.5px; font-weight: 600; color: ${T.samar};">Selasa, 11 September</span>
        <h1 style="margin-top: 5px; font-size: 29px;">Halo, Rani</h1>
      </div>
      ${chip('7', { icon: 'flame', warna: T.emas })}
    </div>
    <div style="position: relative; margin-top: 20px; height: 150px; border-radius: ${R.besar}px;
      background: ${T.kertas}; ${SH.kartu} overflow: hidden; padding: 20px;">
      ${eyebrow('Fokus hari ini')}
      <h2 style="margin-top: 9px; font-size: 22px;">Present Simple<br>untuk kebiasaan</h2>
    </div>
  `);

  const lembar = `
    <div style="position: absolute; left: 0; right: 0; bottom: 0; height: 690px;
      background: ${T.bg}; border-radius: 36px 36px 0 0; padding: 14px 24px 0 24px;
      box-shadow: 0 -18px 48px rgba(46,39,36,.20);">
      <span style="display: block; width: 46px; height: 5px; border-radius: ${R.pil}px;
        background: #E4DAD0; margin: 0 auto 18px auto;"></span>
      <div style="${S.row(0, ' justify-content: space-between; align-items: center;')}">
        <h1 style="font-size: 25px;">Pengaturan</h1>
        ${ikonTombol('x', { size: 40 })}
      </div>

      <div style="margin-top: 18px;">${eyebrow('Tampilan')}</div>
      <div style="margin-top: 9px;">
        ${kartu(`
          ${baris('Bahasa tampilan', 'Semua teks ada dalam Indonesia dan ภาษาไทย', bahasa)}
          ${baris('Mode gelap', 'Ikut setelan sistem', sakelar(false))}
          ${baris('Kurangi gerak', 'Maskot berhenti bereaksi, bukan melambat', sakelar(true))}`,
          { pad: 18, radius: R.besar })}
      </div>

      <div style="margin-top: 18px;">${eyebrow('Belajar dan suara')}</div>
      <div style="margin-top: 9px;">
        ${kartu(`
          ${baris('Target harian', '1 sesi · sekitar 10 menit',
            `<span style="${S.row(7)}">${chip('1 sesi', { bg: '#F1EAE3', warna: T.redup,
              fs: 12, bayang: '' })}${ic('chevron-right', 18, T.samar, 2.1)}</span>`)}
          ${baris('Pengingat harian', 'Setiap hari pukul 19.00', sakelar(true))}
          ${baris('Suara neural',
            'Butuh jaringan. Tanpa jaringan dipakai suara bawaan peranti.', sakelar(true))}`,
          { pad: 18, radius: R.besar })}
      </div>
    </div>`;

  const tirai = `<div style="position: absolute; inset: 0; background: rgba(46,39,36,.34);"></div>`;
  return dc({ body: belakang + tirai + lembar });
}
