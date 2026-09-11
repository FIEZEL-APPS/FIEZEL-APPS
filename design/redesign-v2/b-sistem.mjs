/* Lembar sistem desain "Lembut" — rujukan untuk implementasi.
   Landing page website tidak ada di berkas ini maupun di mana pun: redesain
   dibatasi ke aplikasi atas permintaan owner. */
import { T, D, S, R, SH, JUDUL, BADAN, MIN_MASKOT, ic, dc, kartu, tombol, chip, bar, cincin,
  eyebrow, sakelar, titik, wordmark, paw, maskot, inisial } from './b-kit.mjs';

export const SISTEM = { w: 1180, h: 1700 };

export function Sistem() {
  const petak = (nama, hex, tinta = T.tinta) =>
    `<div style="${S.col(0, ' width: 126px;')}">
      <span style="height: 64px; border-radius: 18px; background: ${hex}; display: block;
        box-shadow: inset 0 0 0 1px rgba(46,39,36,.06);"></span>
      <b style="margin-top: 9px; font-size: 12.5px; color: ${tinta};">${nama}</b>
      <span style="font-size: 11.5px; font-weight: 600; color: ${T.samar};
        font-family: ui-monospace, monospace;">${hex}</span>
    </div>`;

  const petakRanah = (d) =>
    `<div style="${S.col(0, ' width: 126px;')}">
      <span style="${S.row(0, ` justify-content: center; height: 64px; border-radius: 18px;`
        + ` background: ${d.bg};`)}">${ic(d.icon, 22, d.ink, 2.1)}</span>
      <b style="margin-top: 9px; font-size: 12.5px;">${d.label}</b>
      <span style="font-size: 11px; font-weight: 600; color: ${T.samar};
        font-family: ui-monospace, monospace;">${d.bg} / ${d.ink}</span>
    </div>`;

  const blok = (judul, dalam, lebar = '1fr') =>
    `<div style="${S.col(0, ` ${lebar === '1fr' ? 'flex: 1; min-width: 0;' : `width: ${lebar}; flex: none;`}`
      + ` padding: 24px; border-radius: ${R.besar}px; background: ${T.kertas}; ${SH.kartu}`)}">
      ${eyebrow(judul)}
      <div style="margin-top: 18px;">${dalam}</div>
    </div>`;

  const baris = (kiri, kanan) =>
    `<div style="${S.row(0, ' justify-content: space-between; padding: 9px 0;')}">
      <span style="font-size: 13px; font-weight: 600; color: ${T.redup};">${kiri}</span>
      <span style="font-size: 12.5px; font-weight: 600; color: ${T.samar};
        font-family: ui-monospace, monospace;">${kanan}</span>
    </div>`;

  const body = `
  <div style="padding: 38px 40px;">
    <div style="${S.row(0, ' justify-content: space-between; align-items: flex-end;')}">
      <div>
        ${eyebrow('FIEZEL · redesain aplikasi')}
        <h1 style="margin-top: 11px; font-size: 38px;">Sistem desain “Lembut”</h1>
        <p style="margin-top: 12px; font-size: 15px; color: ${T.redup}; max-width: 660px;
          line-height: 1.6;">
          Tidak ada garis tepi. Kedalaman datang dari bayangan halus dan ruang kosong, bukan
          dari garis. Huruf membulat, pastel diredam, dan elemen per layar sengaja lebih
          sedikit daripada yang muat.</p>
      </div>
      ${wordmark(28)}
    </div>

    <div style="${S.row(18, ' margin-top: 30px; align-items: stretch;')}">
      ${blok('Warna inti', `<div style="${S.row(16, ' flex-wrap: wrap;')}">
        ${petak('Latar', T.bg)}${petak('Kertas', T.kertas)}${petak('Tinta', T.tinta)}
        ${petak('Redup', T.redup)}${petak('Samar', T.samar)}${petak('Aksen', T.aksen)}
        ${petak('Aksen lembut', T.aksenLembut)}${petak('Berhasil', T.ok)}
      </div>`, '660px')}
      ${blok('Tipografi', `
        <div style="${S.col(12)}">
          <span style="font-family: ${JUDUL}; font-size: 30px; font-weight: 700;
            letter-spacing: -0.015em;">Judul · Quicksand 700</span>
          <span style="font-family: ${JUDUL}; font-size: 20px; font-weight: 700;">Sub · Quicksand 700</span>
          <span style="font-family: ${BADAN}; font-size: 15px; font-weight: 500; color: ${T.redup};">
            Badan · Nunito 500 — 14,5 sampai 15px</span>
          ${eyebrow('Eyebrow · 11px 700 huruf besar')}
          <span style="font-family: ${BADAN}; font-size: 15px; font-weight: 500; color: ${T.redup};">
            ภาษาไทย · Noto Sans Thai</span>
        </div>`)}
    </div>

    <div style="${S.row(18, ' margin-top: 18px; align-items: stretch;')}">
      ${blok('Enam ranah latihan', `<div style="${S.row(16, ' flex-wrap: wrap;')}">
        ${Object.values(D).map(petakRanah).join('')}
      </div>`, '830px')}
      ${blok('Kedalaman', `
        ${baris('Kartu', '0 14px 32px / .07')}
        ${baris('Kecil', '0 6px 16px / .06')}
        ${baris('Angkat', '0 20px 44px / .10')}
        ${baris('Radius kartu · ubin · pil', '28 · 26 · 999')}
        ${baris('Garis tepi', 'tidak ada')}`)}
    </div>

    <div style="${S.row(18, ' margin-top: 18px; align-items: stretch;')}">
      ${blok('Kontrol', `
        <div style="${S.row(14, ' flex-wrap: wrap; align-items: center;')}">
          <span style="width: 160px;">${tombol('Utama', { h: 50, fs: 15, icon: null })}</span>
          <span style="width: 160px;">${tombol('Lembut', { jenis: 'lembut', h: 50, fs: 15, icon: null })}</span>
          <span style="width: 160px;">${tombol('Kalem', { jenis: 'kalem', h: 50, fs: 15, icon: null })}</span>
          ${chip('Chip', { icon: 'flame', warna: T.emas })}
          ${sakelar(true)}${sakelar(false)}
        </div>
        <div style="${S.row(18, ' margin-top: 20px; align-items: center;')}">
          ${cincin(66, '2/3')}
          <span style="width: 200px;">${bar(68)}</span>
          <span style="width: 200px;">${bar(40, { isiWarna: D.speak.ink })}</span>
          ${titik(3, 1)}
          ${inisial('RA', 46)}
        </div>
        <p style="margin-top: 18px; font-size: 12.5px; font-weight: 600; color: ${T.samar};">
          Tinggi tombol bawaan 54px; tidak ada sasaran sentuh di bawah 44px.</p>`)}
    </div>

    <div style="${S.row(18, ' margin-top: 18px; align-items: stretch;')}">
      ${blok('Aturan maskot', `
        <div style="${S.row(24, ' align-items: flex-start;')}">
          <span style="${S.col(0, ' align-items: center; flex: none;')}">
            ${maskot('head-explain.webp', 118)}
          </span>
          <div style="flex: 1;">
            <p style="font-size: 13.5px; line-height: 1.65; color: ${T.redup};">
              <b style="color: ${T.tinta};">1.</b> Maskot berdiri di panggung miliknya sendiri —
              kotak seukuran rasio aspek gambar, jadi tidak ada sisi yang terpotong.<br>
              <b style="color: ${T.tinta};">2.</b> Tidak ada offset negatif. Tidak pernah.<br>
              <b style="color: ${T.tinta};">3.</b> Wadah tidak boleh lebih pendek dari panggungnya.<br>
              <b style="color: ${T.tinta};">4.</b> Hiasan warna memakai gradasi yang meluruh, bukan
              bentuk padat yang dipotong wadah.<br>
              <b style="color: ${T.tinta};">5.</b> Maskot tidak pernah dirender di bawah
              <b style="color: ${T.tinta};">${MIN_MASKOT}px</b> pada sisi panjangnya. Pose seperti
              ini komposisinya lebar — diperkecil ke 34px, wajahnya tinggal belasan piksel.
              Untuk tempat sesempit itu dipakai cap kaki atau inisial, bukan wajah yang diperkecil.
            </p>
            <div style="${S.row(14, ' margin-top: 16px; align-items: center;')}">
              ${paw(26, T.aksen)}${inisial('RA', 40)}
              <span style="font-size: 12.5px; font-weight: 600; color: ${T.samar};">
                pengganti yang sah untuk ukuran kecil</span>
            </div>
          </div>
        </div>`)}
    </div>

    <div style="${S.row(18, ' margin-top: 18px; align-items: stretch;')}">
      ${blok('Aturan yang mengikat desain ini', `
        <div style="${S.row(22, ' align-items: flex-start;')}">
          <div style="flex: 1;">
            <b style="font-size: 14px;">Dua bahasa, satu tata letak</b>
            <p style="margin-top: 8px; font-size: 13px; line-height: 1.65; color: ${T.redup};">
              Setiap teks lahir sebagai pasangan kunci Indonesia dan Thai. Artboard
              “Hari ini (Thai)” memakai tata letak yang sama persis — kalau desain hanya muat
              dalam Bahasa Indonesia, desainnya belum selesai. Quicksand dan Nunito tidak punya
              glif Thai, jadi Noto Sans Thai dipasang di belakangnya.</p>
          </div>
          <div style="flex: 1;">
            <b style="font-size: 14px;">Klaim yang jujur</b>
            <p style="margin-top: 8px; font-size: 13px; line-height: 1.65; color: ${T.redup};">
              Tanpa klaim “sepenuhnya offline”, tanpa jaminan hasil, tanpa angka yang dibulatkan
              ke atas, tanpa klaim sertifikasi CEFR. Materi dan latihan jalan tanpa internet;
              suara neural dan tutor AI butuh jaringan.</p>
          </div>
          <div style="flex: 1;">
            <b style="font-size: 14px;">Kurangi gerak dihormati</b>
            <p style="margin-top: 8px; font-size: 13px; line-height: 1.65; color: ${T.redup};">
              Kalau murid mematikan gerak, maskot berhenti bereaksi — bukan bereaksi lebih pelan.
              Hanya transform dan opacity yang dianimasikan; satu pengecualian yang disepakati
              adalah stroke-dashoffset untuk cincin progres.</p>
          </div>
        </div>`)}
    </div>
  </div>`;
  return dc({ w: SISTEM.w, h: SISTEM.h, body });
}
