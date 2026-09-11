/* Landing page (layar lebar) dan lembar sistem desain. */
import { T, DOM, S, ic, dc, btn, chip, bar, eyebrow, wordmark, paw, FONT } from './kit.mjs';

export const LANDING = { w: 1440, h: 3480 };
export const SISTEM = { w: 1180, h: 1250 };

const WRAP = 'width: 1180px; margin: 0 auto;';

/* ---------- 23. Landing ---------- */
export function Landing() {
  const tautan = (t) => `<span style="font-size: 14.5px; font-weight: 700; color: ${T.ink2};">${t}</span>`;

  const angka = (besar, kecil) =>
    `<div style="${S.col(5, ' align-items: center; flex: 1;')}">
      <b style="font-size: 30px; letter-spacing: -0.03em; color: ${T.marun};">${besar}</b>
      <span style="font-size: 13px; font-weight: 700; color: ${T.ink2}; text-align: center;">${kecil}</span>
    </div>`;

  const langkah = (n, judul, isi, icon, d) =>
    `<div style="${S.col(0, ` flex: 1; padding: 30px; border-radius: 28px; background: ${T.paper};`
      + ` border: 1px solid ${T.line};`)}">
      <span style="${S.row(0, ` justify-content: center; width: 56px; height: 56px; border-radius: 19px;`
        + ` background: ${d.bg};`)}">${ic(icon, 26, d.ink, 2.3)}</span>
      <span style="${S.row(9, ' margin-top: 20px;')}">
        <span style="font-size: 12px; font-weight: 800; color: ${T.ink3};">0${n}</span>
        <h3 style="font-size: 21px;">${judul}</h3>
      </span>
      <p style="margin-top: 11px; font-size: 15px; line-height: 1.6; color: ${T.ink2};">${isi}</p>
    </div>`;

  const kartuSkill = (d, judul, isi) =>
    `<div style="${S.col(0, ` padding: 26px; border-radius: 26px; background: ${d.bg};`)}">
      <span style="${S.row(0, ` justify-content: center; width: 50px; height: 50px; border-radius: 17px;`
        + ` background: rgba(255,255,255,.66);`)}">${ic(d.icon, 24, d.ink, 2.3)}</span>
      <h3 style="margin-top: 18px; font-size: 20px; color: ${d.ink};">${judul}</h3>
      <p style="margin-top: 9px; font-size: 14px; line-height: 1.55; color: ${d.ink}; opacity: .82;">${isi}</p>
    </div>`;

  const poin = (teks) =>
    `<span style="${S.row(11, ' align-items: flex-start;')}">
      <span style="${S.row(0, ` justify-content: center; width: 24px; height: 24px; border-radius: 50%;`
        + ` background: rgba(255,201,79,.22); flex: none; margin-top: 1px;`)}">${ic('check', 14, T.sun, 3)}</span>
      <span style="font-size: 15px; line-height: 1.55; color: ${T.onRimbaMuted};">${teks}</span>
    </span>`;

  const body = `
  <div style="padding: 0 0 0 0;">

    <div style="${S.row(0, ` justify-content: space-between; height: 84px; ${WRAP}`)}">
      ${wordmark(24, T.ink, T.marun)}
      <span style="${S.row(30)}">${tautan('Cara kerja')}${tautan('Keterampilan')}${tautan('KelasKu untuk guru')}${tautan('Kurikulum')}</span>
      <span style="${S.row(12)}">
        <span style="font-size: 14.5px; font-weight: 800; color: ${T.ink};">Masuk</span>
        <span style="${S.row(0, ` justify-content: center; height: 46px; padding: 0 22px; border-radius: 999px;`
          + ` background: ${T.marun}; color: ${T.cream}; font-weight: 800; font-size: 14.5px;`
          + ` box-shadow: 0 4px 0 ${T.marunDeep};`)}">Mulai gratis</span>
      </span>
    </div>

    <div style="${S.row(0, ` ${WRAP} margin-top: 26px; align-items: stretch;`)}">
      <div style="${S.col(0, ' flex: 1; justify-content: center; padding-right: 40px;')}">
        ${chip('Gratis, tanpa langganan', { icon: 'sparkles', bg: T.sunSoft, color: '#7E5606', border: '#F3E1AE', fs: 13.5, pad: '9px 15px' })}
        <h1 style="margin-top: 20px; font-size: 64px; line-height: 1.03; letter-spacing: -0.04em;">
          Bahasa Inggris<br>yang ikut ritme<br><span style="color: ${T.marun};">muridnya</span>
        </h1>
        <p style="margin-top: 22px; font-size: 18px; line-height: 1.6; color: ${T.ink2}; max-width: 470px;">
          Sepuluh menit sehari, materi yang menyesuaikan diri, dan penjelasan yang
          sabar tiap kali jawabanmu salah — dalam Bahasa Indonesia dan ภาษาไทย.
        </p>
        <div style="${S.row(13, ' margin-top: 30px;')}">
          <span style="${S.row(9, ` justify-content: center; height: 58px; padding: 0 30px; border-radius: 999px;`
            + ` background: ${T.marun}; color: ${T.cream}; font-weight: 800; font-size: 16.5px;`
            + ` box-shadow: 0 5px 0 ${T.marunDeep};`)}">
            <span>Mulai belajar</span>${ic('arrow-right', 19, T.cream, 2.6)}
          </span>
          <span style="${S.row(9, ` justify-content: center; height: 58px; padding: 0 26px; border-radius: 999px;`
            + ` background: ${T.paper}; border: 1.5px solid ${T.line}; font-weight: 800; font-size: 16px;`)}">
            ${ic('school', 19, T.ink, 2.4)}<span>Saya guru</span>
          </span>
        </div>
        <p style="margin-top: 24px; font-size: 13.5px; font-weight: 600; line-height: 1.6; color: ${T.ink3}; max-width: 430px;">
          Materi dan latihan bisa dibuka tanpa internet. Suara neural dan tutor AI butuh jaringan.
        </p>
      </div>
      <div style="position: relative; width: 520px; flex: none; border-radius: 36px;
        background: ${T.rimba}; overflow: hidden; height: 520px;">
        <span style="position: absolute; width: 340px; height: 340px; border-radius: 50%;
          background: rgba(216,179,107,.16); left: -90px; top: -80px;"></span>
        <img src="shoulder-wave.webp" alt="Mira dan Nusa" style="position: absolute; left: 50%;
          transform: translateX(-50%); bottom: 0; height: 492px; width: auto;">
        <span style="position: absolute; left: 26px; bottom: 26px; ${S.row(9, ` padding: 11px 16px;`
          + ` border-radius: 999px; background: rgba(20,51,38,.72);`)}">
          ${paw(18, T.sun)}
          <span style="font-size: 13px; font-weight: 800; color: ${T.sun};">Mira &amp; Nusa menemanimu</span>
        </span>
      </div>
    </div>

    <div style="${S.row(0, ` ${WRAP} margin-top: 56px; padding: 30px 20px; border-radius: 28px;`
      + ` background: ${T.paper}; border: 1px solid ${T.line};`)}">
      ${angka('129', 'grammar lesson<br>(3.225 soal)')}
      ${angka('1.765', 'kosakata')}
      ${angka('300', 'bacaan<br>(1.500 soal)')}
      ${angka('36 + 36', 'listening dan speaking')}
      ${angka('A1–C2', 'dipetakan ke CEFR')}
    </div>

    <div style="${WRAP} margin-top: 96px;">
      <div style="${S.col(0, ' align-items: center;')}">
        ${eyebrow('Cara kerja')}
        <h2 style="margin-top: 12px; font-size: 44px; letter-spacing: -0.035em; text-align: center;">
          Tiga hal yang FIEZEL lakukan tiap hari
        </h2>
      </div>
      <div style="${S.row(20, ' margin-top: 40px; align-items: stretch;')}">
        ${langkah(1, 'Menakar dulu', 'Tes awal sepuluh soal menentukan titik mulaimu — bukan tebakan, bukan level yang kamu pilih sendiri.', 'route', DOM.grammar)}
        ${langkah(2, 'Menyetel tiap sesi', 'Soal berikutnya dipilih dari pola salahmu yang berulang, jadi latihan tidak mengulang yang sudah kamu kuasai.', 'brain-circuit', DOM.vocab)}
        ${langkah(3, 'Menjelaskan, bukan menghukum', 'Setiap jawaban salah dapat penjelasan pelan. Kalau masih bingung, tanya Mira langsung di layar itu juga.', 'message-circle-question', DOM.listen)}
      </div>
    </div>

    <div style="${WRAP} margin-top: 96px;">
      <div style="${S.col(0, ' align-items: center;')}">
        ${eyebrow('Keterampilan')}
        <h2 style="margin-top: 12px; font-size: 44px; letter-spacing: -0.035em; text-align: center;">
          Enam ranah latihan dalam satu aplikasi
        </h2>
      </div>
      <div style="${S.grid(3, 20, ' margin-top: 40px;')}">
        ${kartuSkill(DOM.grammar, 'Grammar', '129 lesson berjenjang dengan 3.225 soal, masing-masing punya penjelasan kesalahannya sendiri.')}
        ${kartuSkill(DOM.vocab, 'Kosakata', '1.765 kata dengan pengulangan berjarak — kata yang sering kamu lupakan muncul lebih sering.')}
        ${kartuSkill(DOM.reading, 'Membaca', '300 bacaan dan 1.500 soal pemahaman, dari A1 sampai C2.')}
        ${kartuSkill(DOM.listen, 'Menyimak', '36 latihan dengar. Dengan jaringan, suaranya neural; tanpa jaringan, suara bawaan peranti.')}
        ${kartuSkill(DOM.speak, 'Berbicara', '36 latihan ucap. Rekamanmu diproses di perangkat sendiri.')}
        ${kartuSkill(DOM.write, 'Menulis', 'Prompt menulis mingguan dengan umpan balik terstruktur.')}
      </div>
    </div>

    <div style="${WRAP} margin-top: 96px;">
      <div style="${S.row(0, ` border-radius: 36px; background: ${T.rimba}; overflow: hidden; align-items: stretch;`)}">
        <div style="${S.col(0, ' flex: 1; padding: 56px 0 56px 56px;')}">
          ${eyebrow('KelasKu untuk guru', 'rgba(253,246,232,.55)')}
          <h2 style="margin-top: 14px; font-size: 40px; color: ${T.sun}; letter-spacing: -0.035em; line-height: 1.12;">
            Kelas yang kelihatan,<br>bukan kelas yang ditebak
          </h2>
          <div style="${S.col(14, ' margin-top: 26px; max-width: 470px;')}">
            ${poin('Buat kelas, bagikan kode, murid masuk tanpa perlu email.')}
            ${poin('Beri tugas per lesson dan lihat siapa yang benar-benar mengerjakannya.')}
            ${poin('Pola salah sekelas terkumpul jadi satu — kamu tahu apa yang perlu diulang Senin depan.')}
          </div>
          <span style="${S.row(9, ` margin-top: 32px; width: fit-content; justify-content: center; height: 56px;`
            + ` padding: 0 28px; border-radius: 999px; background: ${T.sun}; color: ${T.rimbaDeep};`
            + ` font-weight: 800; font-size: 16px; box-shadow: 0 5px 0 ${T.sunDeep};`)}">
            <span>Buka Tutor Action Center</span>${ic('arrow-right', 19, T.rimbaDeep, 2.6)}
          </span>
        </div>
        <div style="position: relative; width: 480px; flex: none;">
          <img src="teaching.webp" alt="" style="position: absolute; right: 20px; bottom: 40px;
            width: 440px; height: auto;">
        </div>
      </div>
    </div>

    <div style="${WRAP} margin-top: 96px;">
      <div style="${S.row(24, ` padding: 40px; border-radius: 30px; background: ${T.sunSoft};`
        + ` border: 1px solid #F3E1AE; align-items: flex-start;`)}">
        <span style="${S.row(0, ` justify-content: center; width: 60px; height: 60px; border-radius: 20px;`
          + ` background: ${T.paper}; flex: none;`)}">${ic('shield-check', 28, '#7E5606', 2.3)}</span>
        <div style="flex: 1;">
          <h3 style="font-size: 24px; color: #6E4E08;">Apa yang FIEZEL tidak janjikan</h3>
          <p style="margin-top: 12px; font-size: 15.5px; line-height: 1.65; color: #7E5606; max-width: 900px;">
            FIEZEL bukan lembaga sertifikasi dan tidak berafiliasi dengan CEFR — materinya
            <b>dipetakan</b> ke tingkat A1–C2, dan itu hal yang berbeda. Tidak ada jaminan hasil,
            tidak ada “pasti lulus”. Cangkang aplikasinya jalan tanpa internet, tapi suara neural
            dan tutor AI tetap butuh jaringan. Angka di halaman ini adalah isi bank soal yang
            sebenarnya, tidak dibulatkan ke atas.
          </p>
        </div>
      </div>
    </div>

    <div style="${WRAP} margin-top: 96px; padding-bottom: 80px;">
      <div style="${S.col(0, ` align-items: center; padding: 64px 40px; border-radius: 36px;`
        + ` background: ${T.marun}; position: relative; overflow: hidden;`)}">
        <span style="position: absolute; width: 420px; height: 420px; border-radius: 50%;
          background: rgba(255,201,79,.10); right: -120px; top: -180px;"></span>
        <div style="position: relative; z-index: 2; ${S.col(0, ' align-items: center;')}">
          ${paw(34, T.sun)}
          <h2 style="margin-top: 20px; font-size: 46px; color: ${T.cream}; letter-spacing: -0.035em;
            text-align: center; line-height: 1.1;">
            Sepuluh menit hari ini<br>cukup untuk mulai
          </h2>
          <p style="margin-top: 16px; font-size: 16.5px; color: rgba(253,246,232,.78); text-align: center;">
            Gratis, tanpa langganan, tanpa iklan.
          </p>
          <span style="${S.row(9, ` margin-top: 30px; justify-content: center; height: 60px; padding: 0 34px;`
            + ` border-radius: 999px; background: ${T.sun}; color: ${T.rimbaDeep}; font-weight: 800;`
            + ` font-size: 17px; box-shadow: 0 5px 0 ${T.sunDeep};`)}">
            <span>Mulai sekarang</span>${ic('arrow-right', 20, T.rimbaDeep, 2.6)}
          </span>
        </div>
      </div>
      <div style="${S.row(0, ' justify-content: space-between; margin-top: 40px;')}">
        ${wordmark(20, T.ink3, T.emas)}
        <span style="${S.row(26)}">
          <span style="font-size: 13px; font-weight: 600; color: ${T.ink3};">Privasi</span>
          <span style="font-size: 13px; font-weight: 600; color: ${T.ink3};">Ketentuan</span>
          <span style="font-size: 13px; font-weight: 600; color: ${T.ink3};">Pasang sebagai aplikasi</span>
        </span>
      </div>
    </div>
  </div>`;
  return dc({ w: LANDING.w, h: LANDING.h, bg: T.cream, body });
}

/* ---------- 24. Lembar sistem desain ---------- */
export function Sistem() {
  const swatch = (nama, hex, tinta = T.ink) =>
    `<div style="${S.col(0, ' width: 124px;')}">
      <span style="height: 62px; border-radius: 16px; background: ${hex}; border: 1px solid rgba(34,25,15,.10);
        display: block;"></span>
      <b style="margin-top: 8px; font-size: 12.5px; color: ${tinta};">${nama}</b>
      <span style="font-size: 11.5px; font-weight: 600; color: ${T.ink3}; font-family: ui-monospace, monospace;">${hex}</span>
    </div>`;

  const domSwatch = (d) =>
    `<div style="${S.col(0, ' width: 124px;')}">
      <span style="${S.row(0, ` justify-content: center; height: 62px; border-radius: 16px; background: ${d.bg};`)}">
        ${ic(d.icon, 22, d.ink, 2.3)}
      </span>
      <b style="margin-top: 8px; font-size: 12.5px;">${d.label}</b>
      <span style="font-size: 11.5px; font-weight: 600; color: ${T.ink3}; font-family: ui-monospace, monospace;">
        ${d.bg} / ${d.ink}
      </span>
    </div>`;

  const blok = (judul, isi, lebar = '100%') =>
    `<div style="${S.col(0, ` ${lebar === '1fr' ? 'flex: 1; min-width: 0;' : `width: ${lebar}; flex: none;`}`
      + ` padding: 22px; border-radius: 24px; background: ${T.paper};`
      + ` border: 1px solid ${T.line};`)}">
      ${eyebrow(judul)}
      <div style="margin-top: 16px;">${isi}</div>
    </div>`;

  const baris = (kiri, kanan) =>
    `<div style="${S.row(0, ` justify-content: space-between; padding: 8px 0;`
      + ` border-bottom: 1px solid ${T.lineSoft};`)}">
      <span style="font-size: 13px; font-weight: 700; color: ${T.ink2};">${kiri}</span>
      <span style="font-size: 12.5px; font-weight: 600; color: ${T.ink3};
        font-family: ui-monospace, monospace;">${kanan}</span>
    </div>`;

  const body = `
  <div style="padding: 36px 40px;">
    <div style="${S.row(0, ' justify-content: space-between; align-items: flex-end;')}">
      <div>
        ${eyebrow('FIEZEL · redesign v2')}
        <h1 style="margin-top: 10px; font-size: 38px;">Sistem desain “Ekspedisi”</h1>
        <p style="margin-top: 10px; font-size: 15px; color: ${T.ink2}; max-width: 640px; line-height: 1.55;">
          Marun dan emas dari panduan merek, hijau rimba dan krem dari seni Mira &amp; Nusa,
          enam blok pastel untuk enam ranah latihan.
        </p>
      </div>
      ${wordmark(28, T.ink, T.marun)}
    </div>

    <div style="${S.row(16, ' margin-top: 28px; align-items: stretch;')}">
      ${blok('Warna inti', `<div style="${S.row(14, ' flex-wrap: wrap;')}">
        ${swatch('Marun', T.marun)}${swatch('Marun tekan', T.marunDeep)}${swatch('Emas', T.emas)}
        ${swatch('Matahari', T.sun)}${swatch('Rimba', T.rimba)}${swatch('Rimba dalam', T.rimbaDeep)}
        ${swatch('Krem', T.cream)}${swatch('Krem hangat', T.creamSoft)}
      </div>`, '640px')}
      ${blok('Tipografi', `
        <div style="${S.col(10)}">
          <span style="font-size: 34px; font-weight: 800; letter-spacing: -0.035em;">Display 34 · 800</span>
          <span style="font-size: 21px; font-weight: 800; letter-spacing: -0.02em;">Judul 21 · 800</span>
          <span style="font-size: 15px; font-weight: 500; color: ${T.ink2};">Isi 15 · 500 — Plus Jakarta Sans</span>
          ${eyebrow('Eyebrow 11 · 800 · huruf besar')}
        </div>`, '1fr')}
    </div>

    <div style="${S.row(16, ' margin-top: 16px; align-items: stretch;')}">
      ${blok('Enam ranah latihan', `<div style="${S.row(14, ' flex-wrap: wrap;')}">
        ${Object.values(DOM).map(domSwatch).join('')}
      </div>`, '820px')}
      ${blok('Token gerak', `
        ${baris('Pegas (pop, lompat)', 'cubic-bezier(.34,1.56,.64,1)')}
        ${baris('Keluar (masuk, geser)', 'cubic-bezier(.22,1,.36,1)')}
        ${baris('Cepat · Dasar · Lambat', '120ms · 240ms · 420ms')}
        ${baris('Hanya animasikan', 'transform, opacity')}`, '1fr')}
    </div>

    <div style="${S.row(16, ' margin-top: 16px; align-items: stretch;')}">
      ${blok('Tombol dan kontrol', `
        <div style="${S.row(12, ' flex-wrap: wrap; align-items: center;')}">
          <span style="width: 150px;">${btn('Utama', { h: 50, fs: 15 })}</span>
          <span style="width: 150px;">${btn('Matahari', { fill: T.sun, color: T.rimbaDeep, shadow: T.sunDeep, h: 50, fs: 15 })}</span>
          <span style="width: 150px;">${btn('Garis', { fill: T.paper, color: T.ink, shadow: null, h: 50, fs: 15, border: `1.5px solid ${T.line}` })}</span>
          ${chip('Chip', { icon: 'flame' })}
          ${chip('Aktif', { bg: T.marunSoft, color: T.marun, border: T.marunSoft, icon: 'check' })}
        </div>
        <div style="${S.row(14, ' margin-top: 16px; align-items: center;')}">
          <span style="width: 220px;">${bar(68, { fill: T.marun })}</span>
          <span style="width: 220px;">${bar(40, { fill: T.sun })}</span>
          <span style="font-size: 12.5px; font-weight: 700; color: ${T.ink3};">Radius 999 · tinggi 54 · sentuh ≥ 44px</span>
        </div>`, '1fr')}
    </div>

    <div style="${S.row(16, ' margin-top: 16px; align-items: stretch;')}">
      ${blok('Aturan yang mengikat desain ini', `
        <div style="${S.row(20, ' align-items: flex-start;')}">
          <div style="flex: 1;">
            <b style="font-size: 14px;">Dua bahasa, satu tata letak</b>
            <p style="margin-top: 7px; font-size: 13px; line-height: 1.6; color: ${T.ink2};">
              Setiap teks lahir sebagai pasangan kunci Indonesia dan Thai. Artboard
              “Hari ini (Thai)” memakai tata letak yang sama persis — kalau desain
              hanya muat dalam Bahasa Indonesia, desainnya belum selesai.
            </p>
          </div>
          <div style="flex: 1;">
            <b style="font-size: 14px;">Klaim yang jujur</b>
            <p style="margin-top: 7px; font-size: 13px; line-height: 1.6; color: ${T.ink2};">
              Tanpa klaim “sepenuhnya offline”, tanpa jaminan hasil, tanpa angka
              yang dibulatkan ke atas, tanpa klaim sertifikasi CEFR. Angka di landing
              mengikuti angka resmi di panduan merek.
            </p>
          </div>
          <div style="flex: 1;">
            <b style="font-size: 14px;">Kurangi gerak dihormati</b>
            <p style="margin-top: 7px; font-size: 13px; line-height: 1.6; color: ${T.ink2};">
              Kalau murid mematikan gerak, maskot berhenti bereaksi — bukan bereaksi
              lebih pelan. Hanya transform dan opacity yang dianimasikan.
            </p>
          </div>
        </div>`, '1fr')}
    </div>
  </div>`;
  return dc({ w: SISTEM.w, h: SISTEM.h, bg: T.cream, body });
}
