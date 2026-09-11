/* Lembar sistem desain.
   Landing page website SENGAJA tidak ada di sini — owner meminta redesain
   dibatasi ke aplikasi saja. */
import { T, DOM, S, ic, dc, btn, chip, bar, eyebrow, wordmark } from './kit.mjs';

export const SISTEM = { w: 1180, h: 1250 };

const WRAP = 'width: 1180px; margin: 0 auto;';

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
