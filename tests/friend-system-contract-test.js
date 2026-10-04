/**
 * tests/friend-system-contract-test.js
 * Gerbang Kontrak Sistem Pertemanan ala LINE (SLOT 7 sosial) + jembatan Panggung Suara.
 *
 * Menguji, tanpa jaringan dan tanpa DOM nyata:
 * 1. TAUTAN & KODE QR: app.js merakit URL profil kanonik
 *    https://fiezel.my.id/app/?friend=@handle, dan modul QR murni terdaftar di shell.
 * 2. DETEKSI ?friend=@handle: pembaca parameter + lembar konfirmasi + pengiriman permintaan.
 * 3. KOTAK MASUK: seksi permintaan di tab Teman + lencana angka pada tab.
 * 4. JEMBATAN SUARA: tombol "Ajak Main Suara" per baris teman memanggil jalur Panggung Suara.
 * 5. I18N: kunci social3.* yang dipakai app.js SEMUANYA ada di copy-id-friend.js, dan
 *    berkas Thai punya himpunan kunci yang sama persis (paritas).
 * 6. NASKAH: seluruh nilai Indonesia di copy-id-friend.js bebas tanda hubung.
 *
 * Berkas ini hidup di repo-root tests/ dan hanya butuh Node + fs.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const results = [];
let failures = 0;
function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) { failures += 1; console.error(`  FAIL: ${message}`); }
  else console.log(`  PASS: ${message}`);
}
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

const app = read('app.js');
const qr = read('features/social/fiezel-qr.js');
const idCopy = read('features/i18n/copy-id-friend.js');
const thCopy = read('features/i18n/copy-th-friend.js');
const indexHtml = read('index.html');
const sw = read('sw.js');

console.log('--- [GERBANG 1] Kode QR profil: URL kanonik + modul murni terdaftar ---');
{
  assert(/function socialProfileUrl\s*\(/.test(app), 'app.js punya socialProfileUrl()');
  assert(app.indexOf('https://fiezel.my.id/app/?friend=') >= 0,
    'URL profil memakai bentuk kanonik https://fiezel.my.id/app/?friend= (spec owner)');
  assert(/function openProfileQr\s*\(/.test(app), 'app.js punya openProfileQr() (modal Kode QR)');
  assert(/function socialDownloadQr\s*\(/.test(app), 'app.js punya socialDownloadQr() (unduh gambar)');
  assert(/function socialShareProfile\s*\(/.test(app), 'app.js punya socialShareProfile() (bagikan tautan)');
  assert(/function socialCopyId\s*\(/.test(app), 'app.js punya socialCopyId() (salin ID)');
  assert(app.indexOf('data-testid="profile-qr"') >= 0, 'modal QR punya penanda data-testid="profile-qr"');
  assert(app.indexOf('data-testid="show-qr-btn"') >= 0, 'kartu profil punya tombol Tampilkan Kode QR');
  assert(app.indexOf('data-testid="copy-id-btn"') >= 0, 'kartu profil punya tombol Salin ID');

  /* Modul QR murni: dimuat di shell SEBELUM app.js dan ikut precache. */
  assert(indexHtml.indexOf('./features/social/fiezel-qr.js') >= 0, 'fiezel-qr.js dimuat index.html');
  assert(sw.indexOf("'./features/social/fiezel-qr.js'") >= 0, 'fiezel-qr.js ikut precache sw.js');
  assert(root.length > 0 && qr.indexOf('root.FiezelQr') >= 0, 'fiezel-qr.js mengekspor FiezelQr');
  /* Larangan pustaka berat: modul murni tidak boleh MEMUAT apa pun dari luar. */
  assert(!/<script|require\s*\(|unpkg|jsdelivr|cdn\./.test(qr), 'fiezel-qr.js tidak memuat pustaka pihak ketiga');
}

console.log('--- [GERBANG 2] Deteksi tautan masuk ?friend=@handle ---');
{
  assert(/function socialFriendParam\s*\(/.test(app), 'app.js punya socialFriendParam() (baca ?friend=)');
  assert(app.indexOf("get('friend')") >= 0, 'parameter dibaca lewat searchParams.get("friend")');
  assert(/function friendLinkBoot\s*\(/.test(app), 'app.js punya friendLinkBoot() (kait boot)');
  assert(/function socialFriendLinkSheet\s*\(/.test(app), 'app.js punya socialFriendLinkSheet() (dialog konfirmasi)');
  assert(app.indexOf('data-testid="friend-link-send"') >= 0, 'dialog punya tombol Kirim Permintaan');
  assert(/function socialFriendFromLink\s*\(/.test(app), 'app.js punya socialFriendFromLink()');
  assert(/core\.api\.friendAdd\(/.test(app), 'pengiriman permintaan memakai core.api.friendAdd');
  /* Kait boot benar-benar dipanggil di openApp. */
  assert(/try\{friendLinkBoot\(\)\}catch\(_\)\{\}/.test(app), 'friendLinkBoot() dipanggil dari openApp (guarded)');
}

console.log('--- [GERBANG 3] Kotak masuk permintaan + lencana tab Teman ---');
{
  assert(/function friendRequestRow\s*\(/.test(app), 'app.js punya friendRequestRow() (baris permintaan + Terima/Tolak)');
  assert(/core\.api\.friendAccept\(/.test(app) && /core\.api\.friendReject\(/.test(app),
    'Terima/Tolak memakai core.api.friendAccept / friendReject');
  assert(app.indexOf("'social3.req-section-title'") >= 0, 'seksi permintaan memakai kunci social3.req-section-title');
  assert(/function renderFriendRequests\s*\(/.test(app), 'app.js punya renderFriendRequests()');
  assert(/function updateTemanBadge\s*\(/.test(app), 'app.js punya updateTemanBadge()');
  assert(app.indexOf('id="fz3TemanBadge"') >= 0, 'tab Teman punya lencana id="fz3TemanBadge"');
  assert(/function onlineTemanTabLabel\s*\(/.test(app), 'label tab Teman merender lencana');
}

console.log('--- [GERBANG 4] Jembatan "Ajak Main Suara" ke Panggung Suara (SLOT 13) ---');
{
  assert(/async function socialAjakVoice\s*\(/.test(app), 'app.js punya socialAjakVoice()');
  assert(/rtc\.probeFlag\(/.test(app), 'menguji flag suara lewat probeFlag (fail-closed)');
  assert(/window\.openLiveVoiceStage\s*\(/.test(app), 'membuka Panggung Suara lewat openLiveVoiceStage()');
  assert(/function fzStageInviteTo\s*\(/.test(app), 'fzStageInviteTo() menyiapkan undangan ruang terarah');
  assert(app.indexOf("data-testid=\"ajak-voice-") >= 0 || app.indexOf('data-testid=\\"ajak-voice-') >= 0,
    'setiap baris teman punya tombol ajak suara bertanda mikrofon');
  assert(/data-lucide="mic"/.test(app), 'tombol ajak suara memakai ikon mikrofon');
}

console.log('--- [GERBANG 5] Pendaftaran i18n + paritas kunci ID/TH ---');
{
  assert(indexHtml.indexOf('./features/i18n/copy-id-friend.js') >= 0, 'copy-id-friend.js dimuat di index.html');
  assert(sw.indexOf("'./features/i18n/copy-id-friend.js'") >= 0, 'copy-id-friend.js ikut precache sw.js');
  assert(read('features/i18n/fiezel-th-loader.js').indexOf('./features/i18n/copy-th-friend.js') >= 0,
    'copy-th-friend.js dimuat dinamis fiezel-th-loader.js');
  assert(read('features/i18n/locale-assets-th.json').indexOf('copy-th-friend.js') >= 0,
    'copy-th-friend.js terdaftar di locale-assets-th.json');

  /* Muat kedua berkas di atas FiezelI18n tiruan dan bandingkan himpunan kunci. */
  function loadKeys(src) {
    const captured = {};
    const fake = { registerCopy(locale, map) { Object.assign(captured, map); } };
    new Function('self', src)({ FiezelI18n: fake });
    return captured;
  }
  const idMap = loadKeys(idCopy);
  const thMap = loadKeys(thCopy);
  const idKeys = Object.keys(idMap).sort();
  const thKeys = Object.keys(thMap).sort();
  assert(idKeys.length > 0, `copy-id-friend.js mendaftarkan kunci (${idKeys.length})`);
  assert(idKeys.join('|') === thKeys.join('|'),
    'himpunan kunci ID dan TH sama persis' + (idKeys.join('|') === thKeys.join('|') ? '' : ` — beda: ${idKeys.filter(k => !thMap[k]).concat(thKeys.filter(k => !idMap[k])).join(', ')}`));

  /* Setiap kunci social3.* yang DIPAKAI app.js harus terdaftar (tidak ada kunci hantu). */
  const used = new Set();
  const re = /'social3\.[a-z0-9-]+'/g;
  let m;
  while ((m = re.exec(app)) !== null) used.add(m[0].slice(1, -1));
  const missing = [...used].filter(k => !idMap[k]);
  const unusedSample = idKeys.filter(k => k.indexOf('social3.') === 0 && !used.has(k));
  assert(missing.length === 0, `semua kunci social3.* yang dipakai app.js terdaftar (${used.size} dipakai)` + (missing.length ? ` — hilang: ${missing.join(', ')}` : ''));
  /* Kunci terdaftar yang tidak dipakai: boleh ada sedikit (mis. mark), tapi jangan liar. */
  assert(unusedSample.length <= 4, `tidak ada kunci social3.* yatim berlebihan (${unusedSample.length} tak dipakai)` + (unusedSample.length ? `: ${unusedSample.join(', ')}` : ''));
}

console.log('--- [GERBANG 6] Naskah Indonesia bebas tanda hubung ---');
{
  function loadIdValues(src) {
    const captured = {};
    const fake = { registerCopy(locale, map) { if (locale === 'id') Object.assign(captured, map); } };
    new Function('self', src)({ FiezelI18n: fake });
    return captured;
  }
  const idValues = loadIdValues(idCopy);
  const bad = Object.entries(idValues).filter(([, v]) => /[\u2010\u2011\u2012\u2013\u2014\u2015]/.test(String(v)) || /\s-\s/.test(String(v)) || /[a-zA-Z]-[a-zA-Z]/.test(String(v)));
  assert(bad.length === 0, 'seluruh nilai Indonesia bebas tanda hubung (minus, en dash, em dash)' + (bad.length ? ` — pelanggar: ${bad.map(([k]) => k).join(', ')}` : ''));
  /* Kembaran Thai memakai aksara Thai. */
  const thValues = loadIdValues.call(null, thCopy) && (function () {
    const cap = {}; const fake = { registerCopy(locale, map) { if (locale === 'th') Object.assign(cap, map); } };
    new Function('self', thCopy)({ FiezelI18n: fake }); return cap;
  })();
  const nonThai = Object.entries(thValues).filter(([, v]) => !/[\u0E00-\u0E7F]/.test(String(v)));
  assert(nonThai.length === 0, 'seluruh nilai Thai beraksara Thai' + (nonThai.length ? ` — pelanggar: ${nonThai.map(([k]) => k).join(', ')}` : ''));
}

const total = results.length;
if (failures) {
  console.error(`\nFIEZEL friend system contract: GAGAL — ${failures}/${total} assert merah`);
  process.exit(1);
}
console.log(`\nFIEZEL friend system contract: LULUS — ${total}/${total} assert hijau`);
