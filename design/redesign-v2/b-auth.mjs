/* Masuk, daftar, dan seluruh alur perkenalan dalam arah "Lembut". */
import { T, D, S, R, SH, JUDUL, ic, dc, isi, tombol, chip, ikonTombol, bar, eyebrow,
  titik, maskot, bayangan, cahaya, wordmark, TOP_SAFE } from './b-kit.mjs';

/* ---------- Pembuka + pilih bahasa ---------- */
export function Splash() {
  const bendera = (a, b, c) =>
    `<svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">`
    + `<rect width="20" height="14" rx="3" fill="${b}"/>`
    + (c ? `<rect width="20" height="4.6" y="4.7" fill="${c}"/>` : '')
    + `<rect width="20" height="${c ? 4.7 : 7}" rx="3" fill="${a}"/>`
    + `<rect width="20" height="2" y="${c ? 2.7 : 5}" fill="${a}"/></svg>`;

  const bahasa = (flag, nama, on) =>
    `<div style="${S.row(10, ` flex: 1; justify-content: center; height: 54px; border-radius: 22px;`
      + ` background: ${on ? T.kertas : 'transparent'};`
      + (on ? ` ${SH.kecil} box-shadow: inset 0 0 0 2px ${T.aksen}, 0 6px 16px rgba(46,39,36,.06);`
        : ' box-shadow: inset 0 0 0 1.5px #E7DED4;')
      + ` color: ${on ? T.aksen : T.redup}; font-family: ${JUDUL}; font-weight: 700;`
      + ` font-size: 14.5px;`)}">${flag}<span>${nama}</span></div>`;

  const body = `
    ${cahaya(-60, -80, 340, 'rgba(155,58,74,.07)')}
    <div style="position: absolute; inset: ${TOP_SAFE}px 24px 0 24px;">
      <div style="${S.row(0, ' justify-content: center;')}">${wordmark(24)}</div>
      <div style="${S.col(0, ' align-items: center; margin-top: 18px;')}">
        ${maskot('shoulder-wave.webp', 282)}
        ${bayangan(160, .13)}
      </div>
      <h1 style="margin-top: 20px; font-size: 30px; text-align: center; line-height: 1.2;">
        Belajar Inggris bareng<br><span style="color: ${T.aksen};">Mira &amp; Nusa</span></h1>
      <p style="margin-top: 12px; font-size: 14.5px; line-height: 1.55; text-align: center;
        color: ${T.redup};">Sepuluh menit sehari. Kami ikut ritmemu,<br>bukan sebaliknya.</p>
    </div>
    <div style="position: absolute; left: 24px; right: 24px; bottom: 30px;">
      <div style="${S.col(10)}">
        ${eyebrow('Pilih bahasa · เลือกภาษา')}
        <div style="${S.row(11)}">
          ${bahasa(bendera('#D12026', '#FFFFFF'), 'Indonesia', true)}
          ${bahasa(bendera('#A51931', '#FFFFFF', '#2D2A4A'), 'ภาษาไทย', false)}
        </div>
      </div>
      <div style="${S.col(11, ' margin-top: 18px;')}">
        ${tombol('Mulai sekarang')}
        ${tombol('Aku sudah punya akun', { jenis: 'hantu', h: 48, fs: 14.5, icon: null })}
      </div>
    </div>`;
  return dc({ body });
}

/* ---------- Carousel perkenalan ---------- */
function intro({ bg, art, tinggiArt, judul, isi: teks, idx }) {
  const body = `
    <div style="position: absolute; inset: ${TOP_SAFE}px 24px 0 24px;">
      <div style="${S.row(0, ' justify-content: space-between; align-items: center;')}">
        ${wordmark(19)}
        <span style="font-size: 14px; font-weight: 700; color: ${T.redup};">Lewati</span>
      </div>
      <div style="${S.row(0, ` justify-content: center; margin-top: 22px; padding: 22px 0;`
        + ` border-radius: 40px; background: ${T.kertas}; ${SH.kartu}`)}">
        <span style="${S.col(0, ' align-items: center;')}">
          ${maskot(art, tinggiArt)}
          ${bayangan(Math.round(tinggiArt * 0.62), .12)}
        </span>
      </div>
    </div>
    <div style="position: absolute; left: 26px; right: 26px; bottom: 34px;">
      <h1 style="font-size: 31px; line-height: 1.18;">${judul}</h1>
      <p style="margin-top: 14px; font-size: 15px; line-height: 1.6; color: ${T.redup};
        max-width: 292px;">${teks}</p>
      <div style="${S.row(0, ' justify-content: space-between; margin-top: 30px;')}">
        ${titik(3, idx)}
        <span style="${S.row(0, ` justify-content: center; width: 62px; height: 62px;`
          + ` border-radius: 50%; background: ${T.aksen}; ${SH.tombol}`)}">
          ${ic('arrow-right', 24, '#FFFFFF', 2.4)}</span>
      </div>
    </div>`;
  return dc({ bg, body });
}

export const Intro1 = () => intro({
  bg: D.vocab.bg, art: 'teaching.webp', tinggiArt: 232, idx: 0,
  judul: 'Satu sesi,<br>sepuluh menit',
  isi: 'Nusa menyiapkan soal yang pas untuk hari ini — bukan daftar panjang yang bikin nyerah.'
});
export const Intro2 = () => intro({
  bg: D.speak.bg, art: 'highfive.webp', tinggiArt: 262, idx: 1,
  judul: 'Salah itu<br>bagian jalannya',
  isi: 'Setiap jawaban salah dijelaskan pelan — dalam Bahasa Indonesia atau ภาษาไทย.'
});
export const Intro3 = () => intro({
  bg: D.listen.bg, art: 'full-cheer.webp', tinggiArt: 272, idx: 2,
  judul: 'Kemajuanmu<br>kelihatan',
  isi: 'Tingkat CEFR, streak, dan pola salah yang berulang — semua terbaca dalam satu layar.'
});

/* ---------- stepper ---------- */
function langkah(kini, total = 5) {
  const seg = Array.from({ length: total }, (_, i) =>
    `<span style="flex: 1; height: 5px; border-radius: ${R.pil}px;
      background: ${i < kini ? T.aksen : '#EAE0D6'};"></span>`).join('');
  return `<div style="${S.col(11)}">
    <div style="${S.row(0, ' justify-content: space-between; align-items: center;')}">
      <span style="${S.row(8)}">${ic('arrow-left', 19, T.redup, 2.2)}
        <span style="font-size: 13px; font-weight: 700; color: ${T.redup};">Kembali</span></span>
      <span style="font-size: 12.5px; font-weight: 700; color: ${T.samar};">
        Langkah ${kini} dari ${total}</span>
    </div>
    <div style="${S.row(6)}">${seg}</div>
  </div>`;
}

/* ---------- Nama ---------- */
export function ObNama() {
  const body = isi(`
    ${langkah(1)}
    <div style="margin-top: 32px;">
      ${eyebrow('Kenalan dulu')}
      <h1 style="margin-top: 11px; font-size: 30px;">Aku panggil kamu<br>siapa?</h1>
      <p style="margin-top: 12px; font-size: 14.5px; line-height: 1.55; color: ${T.redup};">
        Nama panggilan saja. Ini yang muncul di sapaan dan di papan kelas.</p>
    </div>
    <div style="${S.row(13, ` margin-top: 24px; height: 64px; padding: 0 20px; border-radius: ${R.medan}px;`
      + ` background: ${T.kertas}; box-shadow: inset 0 0 0 2px ${T.aksen}, 0 6px 16px rgba(46,39,36,.06);`)}">
      ${ic('user-round', 20, T.aksen, 2.2)}
      <span style="font-family: ${JUDUL}; font-size: 17px; font-weight: 700;">Rani</span>
      <span style="width: 2px; height: 22px; background: ${T.aksen}; margin-left: -5px;"></span>
    </div>
    <div style="${S.row(11, ` margin-top: 16px; padding: 14px 16px; border-radius: 20px;`
      + ` background: ${T.emasLembut};`)}">
      ${ic('shield-check', 18, T.emas, 2.1)}
      <span style="font-size: 12.5px; font-weight: 600; color: ${T.emas}; line-height: 1.5;">
        Nama ini tersimpan di perangkatmu. Kami tidak minta email di langkah ini.</span>
    </div>
    <div style="${S.row(0, ' position: absolute; left: 0; right: 0; bottom: 30px; align-items: flex-end;')}">
      <span style="${S.col(0, ' align-items: center; flex: none;')}">
        ${maskot('head-happy.webp', 128)}
      </span>
      <span style="flex: 1; margin-bottom: 12px; margin-left: 10px;">${tombol('Lanjut')}</span>
    </div>
  `);
  return dc({ body });
}

/* ---------- Tujuan ---------- */
export function ObTujuan() {
  const pilih = (icon, judul, sub, on) =>
    `<div style="${S.row(14, ` padding: 16px; border-radius: 26px;`
      + ` background: ${on ? T.aksenLembut : T.kertas};`
      + (on ? ` box-shadow: inset 0 0 0 2px ${T.aksen};` : ` ${SH.kecil}`))}">
      <span style="${S.row(0, ` justify-content: center; width: 46px; height: 46px; border-radius: 50%;`
        + ` background: ${on ? T.aksen : T.bg}; flex: none;`)}">
        ${ic(icon, 21, on ? '#FFFFFF' : T.redup, 2.1)}</span>
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-family: ${JUDUL}; font-size: 15.5px; font-weight: 700;
          color: ${on ? T.aksen : T.tinta};">${judul}</b>
        <span style="font-size: 12.5px; font-weight: 600; color: ${on ? T.aksen : T.samar};
          line-height: 1.4; opacity: ${on ? .85 : 1};">${sub}</span>
      </span>
      ${on ? ic('circle-check-big', 22, T.aksen, 2.2) : ''}
    </div>`;

  const body = isi(`
    ${langkah(2)}
    <div style="margin-top: 28px;">
      ${eyebrow('Tujuan belajar')}
      <h1 style="margin-top: 11px; font-size: 30px;">Inggrismu buat apa?</h1>
      <p style="margin-top: 10px; font-size: 14px; font-weight: 600; color: ${T.redup};">
        Boleh ganti kapan saja di Pengaturan.</p>
    </div>
    <div style="${S.col(12, ' margin-top: 22px;')}">
      ${pilih('graduation-cap', 'Sekolah &amp; ujian', 'Materi ikut kurikulum kelas', true)}
      ${pilih('users', 'Ngobrol sehari-hari', 'Fokus menyimak dan berbicara', false)}
      ${pilih('brain-circuit', 'Kerja &amp; karier', 'Kosakata kerja dan menulis', false)}
      ${pilih('sparkles', 'Buat diri sendiri', 'Santai, tanpa target ujian', false)}
    </div>
    <div style="position: absolute; left: 0; right: 0; bottom: 30px;">
      ${tombol('Lanjut')}
      <p style="margin-top: 14px; text-align: center; font-size: 13px; font-weight: 700;
        color: ${T.samar};">Lewati langkah ini</p>
    </div>
  `);
  return dc({ body });
}

/* ---------- Tes penempatan ---------- */
export function ObTes() {
  const opsi = (k, teks, on) =>
    `<div style="${S.row(14, ` height: 62px; padding: 0 18px; border-radius: 22px;`
      + ` background: ${on ? T.aksenLembut : T.kertas};`
      + (on ? ` box-shadow: inset 0 0 0 2px ${T.aksen};` : ` ${SH.kecil}`))}">
      <span style="${S.row(0, ` justify-content: center; width: 30px; height: 30px; border-radius: 50%;`
        + ` background: ${on ? T.aksen : T.bg}; color: ${on ? '#FFFFFF' : T.redup};`
        + ` font-family: ${JUDUL}; font-weight: 700; font-size: 13px; flex: none;`)}">${k}</span>
      <span style="font-size: 16.5px; font-weight: 600;
        color: ${on ? T.aksen : T.tinta};">${teks}</span>
    </div>`;

  const body = isi(`
    <div style="${S.row(0, ' justify-content: space-between; align-items: center;')}">
      ${chip('Tes awal · 4 dari 10', { icon: 'timer', warna: T.redup })}
      <span style="font-size: 13px; font-weight: 700; color: ${T.samar};">Lewati</span>
    </div>
    <div style="margin-top: 16px;">${bar(40, { h: 6 })}</div>

    <div style="margin-top: 26px;">
      ${eyebrow('Grammar · pilih yang paling pas', D.grammar.ink)}
      <p style="margin-top: 14px; font-family: ${JUDUL}; font-weight: 600; font-size: 22px;
        line-height: 1.45;">
        She <span style="border-bottom: 3px solid ${T.aksen}; padding: 0 16px;">&nbsp;</span>
        to school by bus every morning.</p>
    </div>

    <div style="${S.col(11, ' margin-top: 24px;')}">
      ${opsi('A', 'go', false)}${opsi('B', 'goes', true)}
      ${opsi('C', 'going', false)}${opsi('D', 'is go', false)}
    </div>

    <div style="${S.row(13, ' position: absolute; left: 0; right: 0; bottom: 28px; align-items: flex-end;')}">
      <span style="${S.col(0, ' align-items: center; flex: none;')}">
        ${maskot('full-thinking.webp', 108)}
      </span>
      <div style="${S.col(0, ` flex: 1; padding: 14px 16px; border-radius: 20px 20px 20px 8px;`
        + ` background: ${T.kertas}; ${SH.kecil} margin-bottom: 14px;`)}">
        <span style="font-size: 13.5px; font-weight: 600; color: ${T.redup}; line-height: 1.5;">
          Santai, ini bukan ujian. Aku cuma mau tahu mulai dari mana.</span>
      </div>
    </div>
  `);
  return dc({ body });
}

/* ---------- Selesai ---------- */
export function ObSelesai() {
  const tangga = (kini) => {
    const lv = ['A1', 'A2', 'B1', 'B2', 'C1'];
    return `<div style="${S.row(8)}">${lv.map((l) => {
      const on = l === kini, lewat = lv.indexOf(l) < lv.indexOf(kini);
      return `<span style="${S.row(0, ` justify-content: center; height: 38px; flex: 1;`
        + ` border-radius: 14px; background: ${on ? T.aksen : lewat ? T.aksenLembut : '#F1EAE3'};`
        + ` color: ${on ? '#FFFFFF' : lewat ? T.aksen : T.samar}; font-family: ${JUDUL};`
        + ` font-weight: 700; font-size: 13px;`)}">${l}</span>`;
    }).join('')}</div>`;
  };

  const body = isi(`
    ${langkah(5)}
    <div style="${S.col(0, ' align-items: center; margin-top: 12px;')}">
      ${maskot('full-cheer.webp', 236)}
      ${bayangan(146, .13)}
    </div>
    <div style="${S.col(0, ' align-items: center; margin-top: 8px;')}">
      ${eyebrow('Hasil tes awal')}
      <h1 style="margin-top: 11px; font-size: 31px; text-align: center;">
        Kamu mulai dari <span style="color: ${T.aksen};">A2</span></h1>
      <p style="margin-top: 12px; font-size: 14.5px; line-height: 1.55; text-align: center;
        color: ${T.redup};">Tujuh dari sepuluh soal A1 kejawab benar.<br>
        Materinya disetel ke A2 mulai hari ini.</p>
    </div>
    <div style="margin-top: 22px;">${tangga('A2')}</div>
    <div style="${S.row(11, ` margin-top: 16px; padding: 14px 16px; border-radius: 20px;`
      + ` background: ${T.okLembut};`)}">
      ${ic('badge-check', 19, T.ok, 2.1)}
      <span style="font-size: 12.5px; font-weight: 600; color: ${T.ok}; line-height: 1.5;">
        Dipetakan ke tingkat CEFR A1–C2. Bukan sertifikasi resmi.</span>
    </div>
    <div style="position: absolute; left: 0; right: 0; bottom: 30px;">
      ${tombol('Mulai belajar')}
    </div>
  `);
  return dc({ body });
}

/* ---------- Masuk &amp; daftar (layar lebar) ---------- */
export const AUTH = { w: 1120, h: 780 };

function medan(label, icon, nilai, opt = {}) {
  const { kanan = null, aktif = false } = opt;
  return `<label style="${S.col(9)}">
    <span style="font-size: 13px; font-weight: 700; color: ${T.redup};">${label}</span>
    <span style="${S.row(13, ` height: 60px; padding: 0 20px; border-radius: ${R.medan}px;`
      + ` background: ${T.kertas};`
      + (aktif ? ` box-shadow: inset 0 0 0 2px ${T.aksen}, 0 6px 16px rgba(46,39,36,.06);`
        : ` ${SH.kecil}`))}">
      ${ic(icon, 19, aktif ? T.aksen : T.samar, 2.1)}
      <span style="flex: 1; font-size: 15.5px; font-weight: 600;">${nilai}</span>
      ${kanan || ''}
    </span>
  </label>`;
}

function panel(judul, teks, art, tinggiArt) {
  return `<div style="position: relative; width: 462px; height: 100%; border-radius: 34px;
    background: ${D.vocab.bg}; overflow: hidden; flex: none; padding: 34px;
    ${S.col(0, ' justify-content: space-between;')}">
    ${cahaya(250, -90, 320, 'rgba(255,255,255,.55)')}
    <div style="position: relative;">
      ${wordmark(22)}
      <h2 style="margin-top: 26px; font-size: 26px; line-height: 1.25; max-width: 330px;">${judul}</h2>
      <p style="margin-top: 12px; font-size: 13.5px; line-height: 1.6; color: ${T.redup};
        max-width: 330px;">${teks}</p>
    </div>
    <span style="${S.col(0, ' align-items: center; position: relative;')}">
      ${maskot(art, tinggiArt)}
      ${bayangan(Math.round(tinggiArt * 0.6), .12)}
    </span>
  </div>`;
}

const tombolGoogle = `<div style="${S.row(11, ` justify-content: center; height: 54px;`
  + ` border-radius: ${R.pil}px; background: ${T.kertas}; ${SH.kecil}`
  + ` font-family: ${JUDUL}; font-weight: 700; font-size: 14.5px;`)}">
  <span style="${S.row(0, ` justify-content: center; width: 24px; height: 24px; border-radius: 50%;`
    + ` background: ${T.bg}; font-size: 12.5px; font-weight: 700; color: ${T.redup};`)}">G</span>
  <span>Masuk dengan Google</span>
</div>`;

export function Login() {
  const kanan = `
    <div style="flex: 1; min-width: 0; padding: 0 48px; position: relative;
      ${S.col(0, ' justify-content: center;')}">
      <div style="position: absolute; right: 0; top: 0;">${ikonTombol('x', { size: 42 })}</div>
      <div style="max-width: 388px; margin: 0 auto; width: 100%;">
        <div style="${S.col(0, ' align-items: center;')}">
          <h1 style="font-size: 36px;">Masuk</h1>
          <p style="margin-top: 11px; font-size: 14px; color: ${T.redup}; text-align: center;
            line-height: 1.55;">Akunmu menyimpan progres, streak, dan kelasmu<br>
            supaya tetap sama di setiap perangkat.</p>
        </div>
        <div style="${S.col(16, ' margin-top: 26px;')}">
          ${medan('Nama', 'user-round', 'rani.sp', { aktif: true })}
          ${medan('Kata sandi', 'lock', '••••••••', { kanan: ic('eye-off', 19, T.samar, 2.1) })}
        </div>
        <p style="margin-top: 12px; text-align: right; font-size: 13px; font-weight: 700;
          color: ${T.aksen};">Lupa kata sandi?</p>
        <div style="margin-top: 18px;">${tombol('Masuk', { h: 56, fs: 16.5, icon: null })}</div>
        <div style="${S.row(14, ' margin-top: 22px;')}">
          <span style="flex: 1; height: 1px; background: #EAE0D6;"></span>
          <span style="font-size: 12.5px; font-weight: 700; color: ${T.samar};">atau</span>
          <span style="flex: 1; height: 1px; background: #EAE0D6;"></span>
        </div>
        <div style="${S.col(11, ' margin-top: 18px;')}">
          ${tombolGoogle}
          ${tombol('Lanjutkan dengan Puter', { jenis: 'lembut', h: 54, fs: 14.5, icon: 'key-round' })}
        </div>
        <p style="margin-top: 22px; text-align: center; font-size: 14px; font-weight: 600;
          color: ${T.redup};">Belum punya akun?
          <b style="color: ${T.aksen};">Daftar di sini</b></p>
        <p style="margin-top: 13px; text-align: center; font-size: 12.5px; font-weight: 700;
          color: ${T.samar};">Lanjut tanpa akun</p>
      </div>
    </div>`;

  const body = `<div style="${S.row(0, ' height: 100%; padding: 24px;')}">
    ${panel('Ekspedisi bahasamu<br>dimulai di sini',
      'Materi dan latihan bisa dibuka tanpa internet. Suara neural dan tutor AI butuh jaringan.',
      'hat-peek.webp', 372)}
    ${kanan}
  </div>`;
  return dc({ w: AUTH.w, h: AUTH.h, body });
}

export function Daftar() {
  const kanan = `
    <div style="flex: 1; min-width: 0; padding: 0 48px; position: relative;
      ${S.col(0, ' justify-content: center;')}">
      <div style="position: absolute; right: 0; top: 0;">${ikonTombol('x', { size: 42 })}</div>
      <div style="max-width: 388px; margin: 0 auto; width: 100%;">
        <div style="${S.col(0, ' align-items: center;')}">
          <h1 style="font-size: 36px;">Buat akun</h1>
          <p style="margin-top: 11px; font-size: 14px; color: ${T.redup}; text-align: center;
            line-height: 1.55;">Cukup nama dan kata sandi. Tanpa email,<br>
            tanpa verifikasi, tanpa langganan.</p>
        </div>
        <div style="${S.col(14, ' margin-top: 24px;')}">
          ${medan('Nama', 'user-round', 'rani.sp', { aktif: true })}
          ${medan('Kata sandi', 'lock', '••••••••', { kanan: ic('eye-off', 19, T.samar, 2.1) })}
          ${medan('Ulangi kata sandi', 'lock', '••••••••', { kanan: ic('check', 19, T.ok, 2.6) })}
        </div>
        <div style="${S.row(11, ` margin-top: 16px; padding: 14px 16px; border-radius: 20px;`
          + ` background: ${T.emasLembut};`)}">
          ${ic('triangle-alert', 18, T.emas, 2.1)}
          <span style="font-size: 12.5px; font-weight: 600; color: ${T.emas}; line-height: 1.5;">
            Tanpa email, kata sandi tidak bisa dipulihkan. Catat baik-baik.</span>
        </div>
        <div style="margin-top: 18px;">${tombol('Buat akun', { h: 56, fs: 16.5, icon: null })}</div>
        <p style="margin-top: 18px; text-align: center; font-size: 14px; font-weight: 600;
          color: ${T.redup};">Sudah punya akun?
          <b style="color: ${T.aksen};">Masuk</b></p>
        <p style="margin-top: 13px; text-align: center; font-size: 12px; color: ${T.samar};
          line-height: 1.55;">Semua materi dan latihan tetap jalan tanpa akun — tutor AI dan
          suara neural<br>baru bisa dipakai kalau kamu masuk dan ada jaringan.</p>
      </div>
    </div>`;

  const body = `<div style="${S.row(0, ' height: 100%; padding: 24px;')}">
    ${panel('Gratis, selamanya,<br>tanpa langganan',
      '129 grammar lesson · 1.765 kosakata · 300 bacaan · 36 listening + 36 speaking.',
      'highfive.webp', 300)}
    ${kanan}
  </div>`;
  return dc({ w: AUTH.w, h: AUTH.h, body });
}
