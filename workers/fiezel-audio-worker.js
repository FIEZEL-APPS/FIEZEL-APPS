/**
 * m025-150 pengantar aset audio FIEZEL di atas Cloudflare R2.
 *
 * MANDAT V2 pasal 3 Tier A. Biner MP3 hidup di R2, bukan di dalam repositori: katalog audio
 * FIEZEL akan tumbuh ke ribuan berkas, dan Git bukan basis data media.
 *
 * WORKER INI HANYA BISA MEMBACA, dan itu keputusan yang paling penting di berkas ini.
 * Tidak ada endpoint produksi, tidak ada kunci ElevenLabs di binding-nya, tidak ada jalur
 * tulis ke R2. Konsekuensinya: seberapa pun ramainya lalu lintas - termasuk kalau URL-nya
 * bocor dan diserbu orang asing - tidak ada satu kredit pun yang bisa terpakai lewat sini.
 * Produksi hidup di GitHub Actions, di belakang persetujuan manusia (pasal 8 dan 11).
 *
 * Sebuah endpoint /generate akan terasa lebih pintar dan justru itu bahayanya: ia mengubah
 * setiap pengunjung menjadi tombol belanja pada dompet ElevenLabs. Untuk konten kurikulum
 * yang sudah diketahui sejak awal, pra-produksi bukan kompromi - ia jawaban yang benar.
 *
 * Nama objek adalah audioKey yang sudah mengandung hash isinya, jadi satu URL tidak akan
 * pernah berubah isi. Karena itu cache-nya immutable dan berumur satu tahun; pembaruan suara
 * menghasilkan kunci baru, bukan menimpa kunci lama - yang juga menjawab pasal 10 tentang
 * service worker lama yang menahan berkas usang.
 */

const MAX_AGE = 60 * 60 * 24 * 365;
const KEY_PATTERN = /^[0-9a-f]{64}\.mp3$/;

/**
 * Selalu '*', tidak pernah memantulkan Origin pemanggil.
 *
 * Respons aset ditandai immutable selama setahun, jadi tepi Cloudflare menyimpannya beserta
 * header-nya. Kalau Origin dipantulkan, salinan yang tersimpan akan membawa izin milik
 * pengunjung pertama dan disajikan kepada semua orang setelahnya - permintaan lintas-origin
 * lalu gagal secara acak, dengan pola yang mustahil ditebak dari sisi murid. Aset ini memang
 * publik dan tidak membawa kredensial, jadi '*' adalah jawaban yang jujur sekaligus aman.
 */
function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-allow-headers': 'range, if-none-match, if-match',
    'access-control-expose-headers': 'content-length, content-range, etag, accept-ranges',
    vary: 'origin'
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      // Penolakan yang eksplisit, bukan 404. Kalau suatu hari ada yang mencoba PUT ke sini,
      // catatannya harus mengatakan "ditolak", bukan "tidak ditemukan".
      return new Response('read only', { status: 405, headers: cors() });
    }

    if (url.pathname === '/health') {
      return Response.json(
        { schema: 'fiezel-audio-worker-v1', ok: true, writable: false },
        { headers: cors() }
      );
    }

    if (url.pathname === '/manifest.json') {
      const doc = await env.AUDIO.get('manifest.json');
      if (!doc) return new Response('manifest absent', { status: 404, headers: cors() });
      return new Response(doc.body, {
        headers: {
          ...cors(),
          'content-type': 'application/json; charset=utf-8',
          // Manifest BOLEH berubah isi di URL yang sama, jadi ia tidak pernah immutable.
          // Aset yang baru terdaftar harus terlihat oleh murid pada sesi berikutnya.
          'cache-control': 'public, max-age=60, must-revalidate',
          etag: doc.httpEtag
        }
      });
    }

    const name = url.pathname.replace(/^\/a\//, '');
    if (!KEY_PATTERN.test(name)) {
      return new Response('bad key', { status: 400, headers: cors() });
    }

    const object = await env.AUDIO.get(name, { range: request.headers, onlyIf: request.headers });
    if (!object) return new Response('absent', { status: 404, headers: cors() });

    const headers = new Headers(cors());
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', `public, max-age=${MAX_AGE}, immutable`);
    headers.set('content-type', 'audio/mpeg');
    headers.set('accept-ranges', 'bytes');

    // Badan yang absen berarti syarat bersyaratnya menentukan jawabannya, dan dua jawaban
    // yang mungkin itu berlawanan arah. If-None-Match yang cocok berarti "punyamu sudah
    // benar" - 304. If-Match yang TIDAK cocok berarti "punyamu sudah basi" - 412. Menjawab
    // 304 untuk keduanya akan memberi tahu klien bahwa salinan usangnya masih sah.
    if (!('body' in object) || object.body === null) {
      const conditional = request.headers.get('if-none-match') ? 304 : 412;
      return new Response(null, { status: conditional, headers });
    }

    if (request.method === 'HEAD') {
      headers.set('content-length', String(object.size));
      return new Response(null, { status: 200, headers });
    }

    // 206 tanpa Content-Range melanggar protokol, dan elemen <audio> menolaknya. Safari
    // meminta Range untuk setiap pemutaran, bukan hanya saat melompat, jadi tanpa ini
    // seluruh audio FIEZEL diam di iOS.
    if (object.range && typeof object.range.offset === 'number') {
      const start = object.range.offset;
      const length = typeof object.range.length === 'number' ? object.range.length : object.size - start;
      const end = start + length - 1;
      if (start >= object.size) {
        headers.set('content-range', `bytes */${object.size}`);
        return new Response(null, { status: 416, headers });
      }
      headers.set('content-range', `bytes ${start}-${end}/${object.size}`);
      headers.set('content-length', String(length));
      return new Response(object.body, { status: 206, headers });
    }

    headers.set('content-length', String(object.size));
    return new Response(object.body, { status: 200, headers });
  }
};
