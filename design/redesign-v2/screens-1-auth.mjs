/* Masuk, daftar, dan seluruh alur perkenalan. */
import { T, S, ic, dc, btn, chip, card, bar, dots, eyebrow, wordmark, paw, avatar, iconBtn,
  PHONE_W, PHONE_H, TOP_SAFE } from './kit.mjs';

/* Kolom isi telepon dengan ruang status bar asli dibiarkan kosong. */
function sheet(body, pad = 22) {
  return `<div style="position: absolute; inset: ${TOP_SAFE}px ${pad}px 0 ${pad}px;">${body}</div>`;
}

/* Ladder CEFR kecil. */
function ladder(now) {
  const lv = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const cells = lv.map((l) => {
    const on = l === now;
    const done = lv.indexOf(l) < lv.indexOf(now);
    return `<span style="${S.row(0, ` justify-content: center; height: 34px; flex: 1; border-radius: 12px;`
      + ` background: ${on ? T.marun : done ? T.marunSoft : T.lineSoft};`
      + ` color: ${on ? T.cream : done ? T.marun : T.ink3}; font-weight: 800; font-size: 13px;`)}">${l}</span>`;
  }).join('');
  return `<div style="${S.row(6)}">${cells}</div>`;
}

/* ---------- 1. Pembuka + pilih bahasa ---------- */
export function Splash() {
  const bendera = (a, b, c) =>
    `<svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true">`
    + `<rect width="20" height="14" rx="2.5" fill="${b}"/>`
    + (c ? `<rect width="20" height="4.6" y="4.7" fill="${c}"/>` : '')
    + `<rect width="20" height="${c ? 4.7 : 7}" rx="2.5" fill="${a}"/>`
    + `<rect width="20" height="2" y="${c ? 2.7 : 5}" fill="${a}"/></svg>`;

  const lang = (flag, name, on) =>
    `<div style="${S.row(10, ` flex: 1; justify-content: center; height: 52px; border-radius: 18px;`
      + ` background: ${on ? T.onRimba : 'rgba(253,246,232,.10)'};`
      + ` border: 1.5px solid ${on ? T.onRimba : 'rgba(253,246,232,.30)'};`
      + ` color: ${on ? T.rimbaDeep : T.onRimba}; font-weight: 800; font-size: 14.5px;`)}">`
    + `${flag}<span>${name}</span></div>`;

  const body = `
    <div style="${S.col(0, ' align-items: center;')}">
      ${wordmark(24, T.onRimba, T.sun)}
    </div>
    <div style="position: absolute; left: 0; right: 0; top: 46px; height: 300px;">
      <img src="shoulder-wave.webp" alt="Mira dan Nusa melambai"
        style="height: 300px; width: auto; margin: 0 auto;">
    </div>
    <div style="position: absolute; left: 0; right: 0; top: 362px;">
      <h1 style="font-size: 31px; color: ${T.sun}; text-align: center; line-height: 1.14;">
        Belajar Inggris<br>bareng Mira &amp; Nusa
      </h1>
      <p style="margin-top: 12px; font-size: 14.5px; line-height: 1.55; text-align: center;
        color: ${T.onRimbaMuted};">
        Sepuluh menit sehari. Kami ikut ritmemu,<br>bukan sebaliknya.
      </p>
      <div style="${S.col(10, ' margin-top: 26px;')}">
        ${eyebrow('Pilih bahasa · เลือกภาษา', 'rgba(253,246,232,.55)')}
        <div style="${S.row(10)}">
          ${lang(bendera('#D12026', '#FFFFFF'), 'Indonesia', true)}
          ${lang(bendera('#A51931', '#FFFFFF', '#2D2A4A'), 'ภาษาไทย', false)}
        </div>
      </div>
      <div style="${S.col(12, ' margin-top: 22px;')}">
        ${btn('Mulai sekarang', { fill: T.sun, color: T.rimbaDeep, shadow: T.sunDeep, icon: 'arrow-right' })}
        ${btn('Aku sudah punya akun', {
          fill: 'transparent', color: T.onRimba, shadow: null, h: 48, fs: 14.5,
          border: `1.5px solid rgba(253,246,232,.35)`
        })}
      </div>
    </div>`;
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.rimba, body: sheet(body) });
}

/* ---------- 2-4. Carousel perkenalan ---------- */
function intro({ bg, art, artH, artTop, judul, isi, idx, tinta = T.ink, halus }) {
  const body = `
    <div style="position: absolute; left: 22px; right: 22px; top: ${TOP_SAFE}px; ${S.row(0, ' justify-content: space-between;')}">
      ${wordmark(19, tinta, T.marun)}
      <span style="font-size: 14px; font-weight: 700; color: ${halus};">Lewati</span>
    </div>
    <img src="${art}" alt="" style="position: absolute; left: 50%; transform: translateX(-50%);
      top: ${artTop}px; height: ${artH}px; width: auto;">
    <div style="position: absolute; left: 26px; right: 26px; bottom: 34px;">
      <h1 style="font-size: 34px; color: ${tinta}; line-height: 1.1; letter-spacing: -0.035em;">${judul}</h1>
      <p style="margin-top: 14px; font-size: 15px; line-height: 1.6; color: ${halus}; max-width: 280px;">${isi}</p>
      <div style="${S.row(0, ' justify-content: space-between; margin-top: 30px;')}">
        ${dots(3, idx, { on: tinta, off: 'rgba(34,25,15,.22)' })}
        <span style="${S.row(0, ` justify-content: center; width: 62px; height: 62px; border-radius: 22px;`
          + ` background: ${T.paper}; box-shadow: 0 6px 18px rgba(34,25,15,.16);`)}">
          ${ic('arrow-right', 24, T.ink, 2.6)}
        </span>
      </div>
    </div>`;
  return dc({ w: PHONE_W, h: PHONE_H, bg, body });
}

export const Intro1 = () => intro({
  bg: DOMSUN, art: 'teaching.webp', artH: 300, artTop: 170, idx: 0,
  judul: 'Satu sesi,<br>sepuluh menit',
  isi: 'Nusa menyiapkan soal yang pas untuk hari ini — bukan daftar panjang yang bikin nyerah.',
  halus: 'rgba(34,25,15,.62)'
});
export const Intro2 = () => intro({
  bg: '#ACE1D9', art: 'highfive.webp', artH: 320, artTop: 156, idx: 1,
  judul: 'Salah itu<br>bagian jalannya',
  isi: 'Setiap jawaban salah dijelaskan pelan — dalam Bahasa Indonesia atau ภาษาไทย.',
  halus: 'rgba(11,54,48,.66)', tinta: '#0B3630'
});
export const Intro3 = () => intro({
  bg: '#FFCED9', art: 'full-cheer.webp', artH: 330, artTop: 150, idx: 2,
  judul: 'Kemajuanmu<br>kelihatan',
  isi: 'Level CEFR, streak, dan pola salah yang berulang — semua terbaca dalam satu layar.',
  halus: 'rgba(76,19,34,.66)', tinta: '#4C1322'
});
const DOMSUN = '#FFC94F';

/* ---------- stepper perkenalan ---------- */
function stepper(now, total = 5) {
  const segs = Array.from({ length: total }, (_, i) =>
    `<span style="flex: 1; height: 5px; border-radius: 999px;
      background: ${i < now ? T.marun : T.lineSoft};"></span>`).join('');
  return `<div style="${S.col(9)}">
    <div style="${S.row(0, ' justify-content: space-between;')}">
      <span style="${S.row(7)}">${ic('arrow-left', 20, T.ink2, 2.4)}
        <span style="font-size: 13px; font-weight: 700; color: ${T.ink2};">Kembali</span></span>
      <span style="font-size: 13px; font-weight: 700; color: ${T.ink3};">Langkah ${now} dari ${total}</span>
    </div>
    <div style="${S.row(5)}">${segs}</div>
  </div>`;
}

/* ---------- 5. Nama ---------- */
export function ObNama() {
  const body = sheet(`
    ${stepper(1)}
    <div style="margin-top: 30px;">
      ${eyebrow('Kenalan dulu')}
      <h1 style="font-size: 30px; margin-top: 10px;">Aku panggil kamu<br>siapa?</h1>
      <p style="margin-top: 12px; font-size: 14.5px; line-height: 1.55; color: ${T.ink2};">
        Nama panggilan saja. Ini yang muncul di sapaan dan di papan kelas.
      </p>
    </div>
    <div style="${S.row(12, ` margin-top: 22px; height: 62px; padding: 0 18px; background: ${T.paper};`
      + ` border: 1.5px solid ${T.marun}; border-radius: 20px;`)}">
      ${ic('user-round', 20, T.marun, 2.2)}
      <span style="font-size: 17px; font-weight: 700; color: ${T.ink};">Rani</span>
      <span style="width: 2px; height: 22px; background: ${T.marun}; margin-left: -4px;"></span>
    </div>
    <div style="${S.row(10, ` margin-top: 14px; padding: 12px 14px; border-radius: 16px;`
      + ` background: ${T.sunSoft};`)}">
      ${ic('shield-check', 18, '#8A5E10', 2.2)}
      <span style="font-size: 12.5px; font-weight: 600; color: #7E5606; line-height: 1.45;">
        Nama ini tersimpan di perangkatmu. Kami tidak minta email di langkah ini.
      </span>
    </div>
    <div style="position: absolute; left: 0; right: 0; bottom: 132px;">
      ${btn('Lanjut', { icon: 'arrow-right' })}
    </div>
    <img src="head-happy.webp" alt="" style="position: absolute; right: -18px; bottom: 0; width: 162px; opacity: .95;">
  `);
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body });
}

/* ---------- 6. Tujuan ---------- */
export function ObTujuan() {
  const pilih = (icon, judul, isi, on) =>
    `<div style="${S.row(14, ` padding: 16px; border-radius: 20px; background: ${on ? T.marunSoft : T.paper};`
      + ` border: 1.5px solid ${on ? T.marun : T.line};`)}">
      <span style="${S.row(0, ` justify-content: center; width: 46px; height: 46px; border-radius: 15px;`
        + ` background: ${on ? T.marun : T.creamSoft}; flex: none;`)}">${ic(icon, 22, on ? T.cream : T.ink2, 2.2)}</span>
      <span style="${S.col(3, ' flex: 1; min-width: 0;')}">
        <b style="font-size: 15.5px; letter-spacing: -0.01em;">${judul}</b>
        <span style="font-size: 12.5px; color: ${T.ink2}; line-height: 1.4;">${isi}</span>
      </span>
      ${on ? ic('circle-check-big', 22, T.marun, 2.4) : ''}
    </div>`;

  const body = sheet(`
    ${stepper(2)}
    <div style="margin-top: 26px;">
      ${eyebrow('Tujuan belajar')}
      <h1 style="font-size: 30px; margin-top: 10px;">Inggrismu buat apa?</h1>
      <p style="margin-top: 10px; font-size: 14px; color: ${T.ink2};">Boleh ganti kapan saja di Pengaturan.</p>
    </div>
    <div style="${S.col(11, ' margin-top: 20px;')}">
      ${pilih('graduation-cap', 'Sekolah &amp; ujian', 'Materi ikut kurikulum kelas', true)}
      ${pilih('users', 'Ngobrol sehari-hari', 'Fokus menyimak dan berbicara', false)}
      ${pilih('brain-circuit', 'Kerja &amp; karier', 'Kosakata kerja dan menulis', false)}
      ${pilih('sparkles', 'Buat diri sendiri', 'Santai, tanpa target ujian', false)}
    </div>
    <div style="position: absolute; left: 0; right: 0; bottom: 34px;">
      ${btn('Lanjut', { icon: 'arrow-right' })}
      <p style="margin-top: 12px; text-align: center; font-size: 13px; font-weight: 700; color: ${T.ink3};">
        Lewati langkah ini
      </p>
    </div>
  `);
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body });
}

/* ---------- 7. Tes penempatan ---------- */
export function ObTes() {
  const opsi = (k, teks, on) =>
    `<div style="${S.row(14, ` height: 60px; padding: 0 16px; border-radius: 18px;`
      + ` background: ${on ? T.paper : T.paper}; border: 1.5px solid ${on ? T.marun : T.line};`
      + (on ? ` box-shadow: 0 3px 0 ${T.marun};` : ''))}">
      <span style="${S.row(0, ` justify-content: center; width: 32px; height: 32px; border-radius: 11px;`
        + ` background: ${on ? T.marun : T.creamSoft}; color: ${on ? T.cream : T.ink2};`
        + ` font-weight: 800; font-size: 13.5px; flex: none;`)}">${k}</span>
      <span style="font-size: 16.5px; font-weight: 700;">${teks}</span>
    </div>`;

  const body = sheet(`
    <div style="${S.row(0, ' justify-content: space-between;')}">
      ${chip('Tes awal · 4 dari 10', { icon: 'timer', bg: T.paper })}
      <span style="font-size: 13px; font-weight: 700; color: ${T.ink3};">Lewati</span>
    </div>
    ${`<div style="margin-top: 14px;">${bar(40, { fill: T.sun, track: T.lineSoft, h: 6 })}</div>`}
    <div style="margin-top: 22px;">
      ${eyebrow('Grammar · pilih yang paling pas', '#14547E')}
      <div style="${S.col(0, ` margin-top: 12px; padding: 22px 20px; border-radius: 24px;`
        + ` background: ${T.paper}; border: 1px solid ${T.line};`)}">
        <p style="font-size: 21px; font-weight: 700; line-height: 1.45; letter-spacing: -0.01em;">
          She <span style="border-bottom: 3px solid ${T.sun}; padding: 0 14px;">&nbsp;</span> to school
          by bus every morning.
        </p>
      </div>
    </div>
    <div style="${S.col(10, ' margin-top: 18px;')}">
      ${opsi('A', 'go', false)}
      ${opsi('B', 'goes', true)}
      ${opsi('C', 'going', false)}
      ${opsi('D', 'is go', false)}
    </div>
    <div style="${S.row(12, ' position: absolute; left: 0; right: 0; bottom: 30px; align-items: flex-end;')}">
      <img src="full-thinking.webp" alt="" style="width: 86px; flex: none;">
      <div style="${S.col(0, ` flex: 1; padding: 13px 16px; border-radius: 18px 18px 18px 6px;`
        + ` background: ${T.sunSoft}; border: 1px solid #F3DFA6; margin-bottom: 10px;`)}">
        <span style="font-size: 13.5px; font-weight: 600; color: #6E4E08; line-height: 1.5;">
          Santai, ini bukan ujian. Aku cuma mau tahu mulai dari mana.
        </span>
      </div>
    </div>
  `);
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body });
}

/* ---------- 8. Selesai ---------- */
export function ObSelesai() {
  const body = sheet(`
    ${stepper(5)}
    <div style="${S.col(0, ' align-items: center; margin-top: 16px;')}">
      <img src="full-cheer.webp" alt="" style="height: 250px; width: auto;">
    </div>
    <div style="${S.col(0, ' align-items: center; margin-top: 4px;')}">
      ${eyebrow('Hasil tes awal')}
      <h1 style="font-size: 32px; margin-top: 10px; text-align: center;">Kamu mulai dari <span style="color: ${T.marun};">A2</span></h1>
      <p style="margin-top: 11px; font-size: 14.5px; line-height: 1.55; text-align: center; color: ${T.ink2};">
        12 dari 10 soal kejawab benar di tingkat A1.<br>Materinya disetel ke A2 mulai hari ini.
      </p>
    </div>
    <div style="margin-top: 20px;">${ladder('A2')}</div>
    <div style="${S.row(10, ` margin-top: 16px; padding: 13px 15px; border-radius: 16px; background: ${T.okSoft};`)}">
      ${ic('badge-check', 19, T.ok, 2.2)}
      <span style="font-size: 12.5px; font-weight: 600; color: ${T.ok}; line-height: 1.45;">
        Dipetakan ke tingkat CEFR A1–C2. Bukan sertifikasi resmi.
      </span>
    </div>
    <div style="position: absolute; left: 0; right: 0; bottom: 32px;">
      ${btn('Mulai belajar', { icon: 'arrow-right' })}
    </div>
  `);
  return dc({ w: PHONE_W, h: PHONE_H, bg: T.cream, body });
}

/* ---------- 9-10. Masuk &amp; daftar (layar lebar) ---------- */
const AUTH_W = 1120, AUTH_H = 780;

function field(label, icon, isi, opt = {}) {
  const { kanan = null, aktif = false, tebal = false } = opt;
  return `<label style="${S.col(8)}">
    <span style="font-size: 13.5px; font-weight: 800; color: ${T.ink};">${label}</span>
    <span style="${S.row(12, ` height: 58px; padding: 0 16px; border-radius: 16px; background: ${T.paper};`
      + ` border: 1.5px solid ${aktif ? T.marun : T.line};`)}">
      ${ic(icon, 19, aktif ? T.marun : T.ink3, 2.2)}
      <span style="width: 1px; height: 22px; background: ${T.line};"></span>
      <span style="flex: 1; font-size: 15.5px; font-weight: ${tebal ? 800 : 600};
        color: ${isi.startsWith('•') ? T.ink : T.ink}; letter-spacing: ${tebal ? '0.14em' : 'normal'};">${isi}</span>
      ${kanan || ''}
    </span>
  </label>`;
}

function authPanel(judulPanel, isiPanel, art, artStyle) {
  return `<div style="position: relative; width: 468px; height: 100%; border-radius: 28px;
    background: ${T.rimba}; overflow: hidden; flex: none;">
    <div style="position: absolute; left: 34px; top: 32px; z-index: 2;">${wordmark(22, T.onRimba, T.sun)}</div>
    <div style="position: absolute; left: 34px; right: 34px; top: 84px; z-index: 2;">
      <h2 style="font-size: 25px; color: ${T.sun}; line-height: 1.18;">${judulPanel}</h2>
      <p style="margin-top: 10px; font-size: 13.5px; line-height: 1.55; color: ${T.onRimbaMuted}; max-width: 300px;">${isiPanel}</p>
    </div>
    <span style="position: absolute; width: 300px; height: 300px; border-radius: 50%;
      background: rgba(216,179,107,.16); right: -80px; bottom: -70px;"></span>
    <img src="${art}" alt="" style="${artStyle}">
  </div>`;
}

const googleBtn = `<div style="${S.row(10, ` justify-content: center; height: 52px; border-radius: 999px;`
  + ` background: ${T.paper}; border: 1.5px solid ${T.line}; font-weight: 800; font-size: 14.5px;`)}">
  <span style="${S.row(0, ` justify-content: center; width: 24px; height: 24px; border-radius: 50%;`
    + ` border: 1.5px solid ${T.line}; font-size: 13px; font-weight: 800; color: ${T.ink2};`)}">G</span>
  <span>Masuk dengan Google</span>
</div>`;

export function Login() {
  const kanan = `
    <div style="flex: 1; min-width: 0; padding: 8px 52px 0 52px; position: relative;">
      <div style="position: absolute; right: 8px; top: 0;">${iconBtn('x', { bg: T.creamSoft, border: T.creamSoft })}</div>
      <div style="max-width: 402px; margin: 0 auto;">
        <div style="${S.col(0, ' align-items: center; margin-top: 26px;')}">
          <h1 style="font-size: 38px;">Masuk</h1>
          <p style="margin-top: 10px; font-size: 14.5px; color: ${T.ink2}; text-align: center; line-height: 1.5;">
            Akunmu menyimpan progres, streak, dan kelasmu<br>supaya tetap sama di setiap perangkat.
          </p>
        </div>
        <div style="${S.col(16, ' margin-top: 28px;')}">
          ${field('Nama', 'user-round', 'rani.sp', { aktif: true })}
          ${field('Kata sandi', 'lock', '••••••••', { kanan: ic('eye-off', 19, T.ink3, 2.2) })}
        </div>
        <p style="margin-top: 11px; text-align: right; font-size: 13px; font-weight: 800; color: ${T.marun};">
          Lupa kata sandi?
        </p>
        <div style="margin-top: 16px;">${btn('Masuk', { h: 56, fs: 16.5 })}</div>
        <div style="${S.row(14, ' margin-top: 22px;')}">
          <span style="flex: 1; height: 1px; background: ${T.line};"></span>
          <span style="font-size: 12.5px; font-weight: 700; color: ${T.ink3};">atau</span>
          <span style="flex: 1; height: 1px; background: ${T.line};"></span>
        </div>
        <div style="${S.col(11, ' margin-top: 18px;')}">
          ${googleBtn}
          ${btn('Lanjutkan dengan Puter', {
            fill: T.paper, color: T.ink, shadow: null, h: 52, fs: 14.5,
            border: `1.5px solid ${T.line}`, icon: 'key-round'
          })}
        </div>
        <p style="margin-top: 22px; text-align: center; font-size: 14px; font-weight: 600; color: ${T.ink2};">
          Belum punya akun? <b style="color: ${T.marun};">Daftar di sini</b>
        </p>
        <p style="margin-top: 14px; text-align: center; font-size: 12.5px; font-weight: 700; color: ${T.ink3};">
          Lanjut tanpa akun
        </p>
      </div>
    </div>`;

  const body = `<div style="${S.row(0, ' height: 100%; padding: 24px;')}">
    ${authPanel('Ekspedisi bahasamu<br>dimulai di sini',
      'Materi dan latihan bisa dibuka tanpa internet. Suara neural dan tutor AI butuh jaringan.',
      'hat-peek.webp',
      'position: absolute; left: 50%; transform: translateX(-50%); bottom: -14px; height: 420px; width: auto; z-index: 1;')}
    ${kanan}
  </div>`;
  return dc({ w: AUTH_W, h: AUTH_H, bg: T.cream, body });
}

export function Daftar() {
  const kanan = `
    <div style="flex: 1; min-width: 0; padding: 8px 52px 0 52px; position: relative;">
      <div style="position: absolute; right: 8px; top: 0;">${iconBtn('x', { bg: T.creamSoft, border: T.creamSoft })}</div>
      <div style="max-width: 402px; margin: 0 auto;">
        <div style="${S.col(0, ' align-items: center; margin-top: 18px;')}">
          <h1 style="font-size: 38px;">Buat akun</h1>
          <p style="margin-top: 10px; font-size: 14.5px; color: ${T.ink2}; text-align: center; line-height: 1.5;">
            Cukup nama dan kata sandi. Tanpa email,<br>tanpa verifikasi, tanpa langganan.
          </p>
        </div>
        <div style="${S.col(15, ' margin-top: 24px;')}">
          ${field('Nama', 'user-round', 'rani.sp', { aktif: true })}
          ${field('Kata sandi', 'lock', '••••••••', { kanan: ic('eye-off', 19, T.ink3, 2.2) })}
          ${field('Ulangi kata sandi', 'lock', '••••••••', { kanan: ic('check', 19, T.ok, 2.6) })}
        </div>
        <div style="${S.row(10, ` margin-top: 16px; padding: 13px 15px; border-radius: 15px; background: ${T.sunSoft};`)}">
          ${ic('triangle-alert', 18, '#8A5E10', 2.2)}
          <span style="font-size: 12.5px; font-weight: 600; color: #7E5606; line-height: 1.45;">
            Tanpa email, kata sandi tidak bisa dipulihkan. Catat baik-baik.
          </span>
        </div>
        <div style="margin-top: 18px;">${btn('Buat akun', { h: 56, fs: 16.5 })}</div>
        <p style="margin-top: 18px; text-align: center; font-size: 14px; font-weight: 600; color: ${T.ink2};">
          Sudah punya akun? <b style="color: ${T.marun};">Masuk</b>
        </p>
        <p style="margin-top: 14px; text-align: center; font-size: 12px; color: ${T.ink3}; line-height: 1.5;">
          Semua materi dan latihan tetap jalan tanpa akun — tutor AI dan suara neural<br>
          baru bisa dipakai kalau kamu masuk dan ada jaringan.
        </p>
      </div>
    </div>`;

  const body = `<div style="${S.row(0, ' height: 100%; padding: 24px;')}">
    ${authPanel('Gratis, selamanya,<br>tanpa langganan',
      '129 grammar lesson · 1.765 kosakata · 300 bacaan · 36 listening + 36 speaking.',
      'highfive.webp',
      'position: absolute; left: 50%; transform: translateX(-50%); bottom: 18px; height: 340px; width: auto; z-index: 1;')}
    ${kanan}
  </div>`;
  return dc({ w: AUTH_W, h: AUTH_H, bg: T.cream, body });
}

export const AUTH_SIZE = { w: AUTH_W, h: AUTH_H };
