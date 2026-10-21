/* Unduh huruf Google sekali, simpan di direktori pratinjau, lalu pakai lokal.
   Pratinjau memblokir jaringan supaya render cepat dan tidak bergantung DNS —
   tanpa ini semua arah desain akan tampil dengan huruf cadangan yang sama,
   dan tipografi justru sumbu utama yang sedang dipilih. */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
  + 'Chrome/120.0.0.0 Safari/537.36';

/* Hanya blok subset latin yang diambil — sisanya menggandakan berat tanpa dipakai. */
function blokLatin(css) {
  const out = [];
  const bagian = css.split('/*');
  for (const b of bagian) {
    if (!/^\s*latin\s*\*\//.test(b)) continue;
    const m = b.match(/@font-face\s*\{[^}]*\}/);
    if (m) out.push(m[0]);
  }
  return out;
}

export async function siapkanHuruf(keluarga, dir) {
  mkdirSync(dir, { recursive: true });
  const cacheCss = join(dir, '_fonts.css');
  const kunci = join(dir, '_fonts.key');
  const tanda = JSON.stringify(keluarga);
  if (existsSync(cacheCss) && existsSync(kunci) && readFileSync(kunci, 'utf8') === tanda) {
    return readFileSync(cacheCss, 'utf8');
  }

  let gabungan = '';
  for (const [nama, bobot] of keluarga) {
    const url = 'https://fonts.googleapis.com/css2?family='
      + encodeURIComponent(nama).replace(/%20/g, '+') + ':wght@' + bobot.join(';') + '&display=block';
    const css = await fetch(url, { headers: { 'User-Agent': UA } }).then((r) => {
      if (!r.ok) throw new Error('gagal ambil css ' + nama + ': ' + r.status);
      return r.text();
    });
    for (const blok of blokLatin(css)) {
      const m = blok.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
      if (!m) continue;
      const berkas = nama.replace(/\s+/g, '') + '-' + (blok.match(/font-weight:\s*([\d\s]+)/) || [, 'x'])[1]
        .trim().replace(/\s+/g, '_') + '.woff2';
      if (!existsSync(join(dir, berkas))) {
        const buf = Buffer.from(await fetch(m[1], { headers: { 'User-Agent': UA } })
          .then((r) => r.arrayBuffer()));
        writeFileSync(join(dir, berkas), buf);
      }
      gabungan += blok.replace(m[0], `url('${berkas}')`) + '\n';
    }
  }
  writeFileSync(cacheCss, gabungan);
  writeFileSync(kunci, tanda);
  return gabungan;
}

export const KELUARGA = [
  ['Plus Jakarta Sans', [400, 500, 600, 700, 800]],
  ['Fredoka', [400, 500, 600, 700]],
  ['Nunito', [400, 500, 600, 700, 800]],
  ['Quicksand', [400, 500, 600, 700]],
  ['Lora', [400, 500, 600, 700]],
  ['Work Sans', [400, 500, 600, 700]],
  ['Archivo', [400, 500, 600, 700, 800]],
  ['Noto Sans Thai', [400, 500, 700]]
];
