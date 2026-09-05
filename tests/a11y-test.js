/**
 * FIEZEL R6 gate — accessibility pass.
 *
 * Aksesibilitas rusak diam-diam. Tidak ada yang error, tidak ada yang merah; hanya seseorang
 * yang tidak bisa memakai aplikasinya. Karena itu invarian di bawah dipasang sebagai gate,
 * bukan sebagai catatan di dokumen: cincin fokus, ukuran sentuh, pengumuman untuk pembaca
 * layar, bahasa halaman, dan penghormatan pada permintaan kurangi-gerak.
 */
const assert = require('assert');
const fs = require('fs');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const css = fs.readFileSync('./style.css', 'utf8');
const html = fs.readFileSync('./index.html', 'utf8');
const app = fs.readFileSync('./app.js', 'utf8');

// AI-20 F06 (kategori 2a, UNION-CORPUS): naskah Indonesia boleh PINDAH ke copy-map
// features/i18n/copy-id-*.js tanpa berubah satu byte pun (dijaga tests/id-golden-snapshot-test.js).
// Karena itu pencarian literal dilakukan atas GABUNGAN app.js + seluruh copy-map id.
// Selama domain terkait belum diekstrak, gabungan ini identik dengan app.js — hijau dua arah.
const I18N_DIR = './features/i18n';
const copyIdCorpus = fs.existsSync(I18N_DIR)
  ? fs.readdirSync(I18N_DIR).filter(n => /^copy-id-.*\.js$/.test(n)).sort()
      .map(n => fs.readFileSync(I18N_DIR + '/' + n, 'utf8')).join('\n')
  : '';
const idCorpus = app + '\n' + copyIdCorpus;

// AI-20 F04 (lang-pin -> konstanta): hari ini 'id' adalah satu-satunya locale murid, jadi
// default statis index.html tetap lang="id". Setelah Wave 2 (dukungan th) app.js menyetel
// documentElement.lang = FiezelI18n.getBcp47() saat boot — saat itu TAMBAHKAN asersi untuk
// mekanisme dinamisnya; asersi default statis ini JANGAN dihapus.
const SUPPORTED_LOCALES = ['id'];

test('halaman menyatakan bahasanya, supaya pembaca layar memakai suara yang benar', () => {
  const lang = (/<html[^>]+lang="([a-zA-Z-]+)"/.exec(html) || [])[1];
  assert.ok(lang, 'atribut lang wajib ada di <html>');
  assert.ok(SUPPORTED_LOCALES.includes(lang),
    'lang="' + lang + '" bukan locale murid yang didukung (' + SUPPORTED_LOCALES.join(', ') + ')');
});

test('cincin fokus ada untuk semua kontrol, bukan hanya tombol', () => {
  // Pengguna keyboard kehilangan jejak begitu berpindah ke tautan atau kolom isian kalau
  // hanya tombol yang punya penanda fokus.
  assert.ok(/button:focus-visible\{[^}]*outline:/.test(css), 'tombol');
  for (const selector of ['a:focus-visible', 'input:focus-visible', 'select:focus-visible', 'textarea:focus-visible']) {
    assert.ok(css.indexOf(selector) !== -1, `${selector} tidak punya gaya fokus`);
  }
});

test('setiap outline yang dimatikan punya penanda fokus pengganti', () => {
  // Mematikan outline sah selama ada penggantinya yang terlihat. Yang tidak boleh adalah
  // mematikannya lalu tidak menyediakan apa pun - fokus jadi tidak kelihatan sama sekali.
  const bersih = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const aturan = bersih.match(/([^{}]+)\{[^}]*outline\s*:\s*none[^}]*\}/gi) || [];
  for (const blok of aturan) {
    const selector = blok.slice(0, blok.indexOf('{')).trim().split(',')[0].trim();
    const pengganti = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':focus-visible\\s*\\{[^}]*(outline|box-shadow)\\s*:', 'i');
    assert.ok(pengganti.test(css),
      `${selector} mematikan outline tanpa gaya :focus-visible pengganti`);
  }
});

test('ukuran sentuh minimum ditegaskan, bukan kebetulan hasil padding', () => {
  // Padding yang kebetulan menghasilkan 44px bisa menyusut hanya karena ukuran huruf diubah.
  const aturan = /button,\.nav[^{]*\{[^}]*min-height:\s*44px/.test(css);
  assert.ok(aturan, 'tombol dan navigasi harus punya min-height 44px eksplisit');
  assert.ok(/input\[type="checkbox"\][^{]*\{[^}]*min-(width|height):\s*24px/.test(css),
    'kotak centang perlu ukuran sentuh yang layak');
});

test('permintaan kurangi-gerak dari sistem dihormati, tidak hanya dari pengaturan aplikasi', () => {
  assert.ok(/@media\s*\(?prefers-reduced-motion:\s*reduce\)?\s*\{\s*\*\{[^}]*animation-duration/.test(css.replace(/\s+/g, m => m.includes('\n') ? '\n' : ' ')) ||
    /prefers-reduced-motion:reduce\)\{\n?\s*\*\{/.test(css),
    'harus ada blok global yang mematikan animasi');
  // View transition sebelumnya hanya melihat preferensi di dalam aplikasi, sehingga pengguna
  // yang sudah meminta kurangi-gerak di tingkat sistem tetap mendapat animasi perpindahan.
  assert.ok(/function prefersReducedMotion\(\)/.test(app), 'app.js harus membaca preferensi sistem');
  assert.ok(/startViewTransition&&state\.preferences\?\.motion!==false&&!prefersReducedMotion\(\)/.test(app),
    'perpindahan halaman harus menghormati preferensi sistem');
});

test('perubahan yang tidak terlihat tetap diumumkan ke pembaca layar', () => {
  assert.ok(/id="toast"[^>]*role="status"/.test(html), 'toast harus berupa live region');
  assert.ok(/id="toast"[^>]*aria-live="polite"/.test(html));
});

test('tombol yang hanya berisi ikon punya nama yang bisa dibacakan', () => {
  // Navigasi utama adalah ikon + label pendek; tanpa aria-label, pembaca layar hanya
  // mendengar nama ikonnya atau tidak sama sekali.
  // m025-246: pola lama `class="nav"` MELEWATKAN tab yang sedang aktif (`class="nav active"`),
  // jadi selama ini justru satu tombol navigasi yang tidak pernah diperiksa aria-label-nya.
  // Pola di bawah menangkap keduanya. Ambangnya 4 karena tab bar sekarang berisi empat
  // tujuan (Hari ini / Latihan / Progres / Pengaturan).
  const nav = html.match(/<button[^>]*class="nav(?: active)?"[^>]*>/g) || [];
  assert.ok(nav.length >= 4, 'navigasi utama harus ada (ditemukan ' + nav.length + ')');
  for (const tag of nav) assert.ok(/aria-label="/.test(tag), `tombol navigasi tanpa aria-label: ${tag.slice(0, 80)}`);
  const kunci = html.match(/<input[^>]*type="checkbox"[^>]*disabled[^>]*>/g) || [];
  for (const tag of kunci) assert.ok(/aria-label="/.test(tag), `kotak centang terkunci tanpa nama: ${tag.slice(0, 80)}`);
});

test('teks sekunder tetap cukup kontras terhadap latarnya', () => {
  // Warna redup adalah tempat kontras paling sering jatuh di bawah ambang.
  const nilai = key => {
    const m = new RegExp('--' + key + ':\\s*(#[0-9a-f]{6})', 'i').exec(css);
    return m ? m[1] : null;
  };
  const luminance = hex => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const rasio = (a, b) => {
    const l1 = luminance(a), l2 = luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const muted = nilai('muted'), bg = nilai('bg'), text = nilai('text'), panel = nilai('panel');
  assert.ok(muted && bg && text && panel, 'token warna harus tetap terbaca dari CSS');
  assert.ok(rasio(muted, bg) >= 4.5, `teks redup di latar halaman hanya ${rasio(muted, bg).toFixed(2)}:1`);
  assert.ok(rasio(muted, panel) >= 4.5, `teks redup di panel hanya ${rasio(muted, panel).toFixed(2)}:1`);
  assert.ok(rasio(text, bg) >= 7, `teks utama hanya ${rasio(text, bg).toFixed(2)}:1`);
});

test('kartu roadmap baru memakai teks, bukan hanya warna, untuk menyampaikan status', () => {
  // Status yang hanya dibedakan warna tidak sampai ke pengguna buta warna maupun pembaca layar.
  // AI-20 F06: identifier peta label TETAP dicek di app.js (identifier tidak diekstrak —
  // larangan rename ada di handoff W2-APP); nilai teksnya dicek di union-corpus karena
  // kalimatnya boleh pindah ke copy-map tanpa berubah byte.
  assert.ok(/HEALTH_SEVERITY_LABELS/.test(app) && /'Aman'/.test(idCorpus), 'kesehatan instalasi punya label teks');
  assert.ok(/READINESS_STATUS_LABELS/.test(app) && /'Sudah terpenuhi'/.test(idCorpus), 'kesiapan akademik punya label teks');
  assert.ok(/Belum terhubung/.test(idCorpus) && /Belum diukur/.test(idCorpus), 'peta skill menyatakan statusnya dengan kata');
});

console.log('');
if (failures) { console.error('FIEZEL accessibility: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL accessibility: PASS');
