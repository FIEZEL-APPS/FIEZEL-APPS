/**
 * FIEZEL gerbang — settings-cache-test.js (spesifikasi reports/desain-test-baru.md §4).
 *
 * Tombol "Bersihkan cache & muat ulang" di Pengaturan menyentuh satu-satunya hal yang
 * paling menakutkan untuk disentuh: penyimpanan murid. Karena itu gerbang ini tidak
 * memeriksa "apakah tombolnya ada", melainkan MENJALANKAN handler-nya di sandbox dengan
 * localStorage palsu berisi ketiga kunci progres, lalu menuntut ketiganya utuh
 * byte-per-byte sesudahnya. Tidak ada DOM, tidak ada jaringan, tidak ada boot aplikasi.
 *
 * Kontrak yang dijaga:
 *   S1 markup   — openSettings() memuat tombol id="settingClearCache" dan mengikatnya ke clearAppCache
 *   S2 statis   — blok clearAppCache() tidak menyebut satu pun kunci/API progres (daftar hitam)
 *   S3 statis   — blok clearAppCache() memang memakai caches.keys( dan caches.delete(
 *   S4 perilaku — jalankan clearAppCache() di vm: localStorage utuh, cache terhapus
 *   S5 regresi  — konstanta kunci progres di app.js masih bernama sama seperti daftar hitam S2
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

let failed = false;
const checks = [];
function check(name, ok, details) {
  checks.push({ name, ok: !!ok, details: ok || details === undefined ? '' : String(details) });
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'} - ${name}${ok || details === undefined ? '' : '\n       ' + details}`);
}

// Pola kanonis repo (grammar-unlock-test.js:22, level-grammar-contract-test.js:57).
function sourceBlock(name, source = app) {
  const start = source.search(new RegExp(`(?:function|async function)\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}

// ---------------------------------------------------------------- S1: markup Settings ---
const settingsBlock = sourceBlock('openSettings') + '\n' + sourceBlock('continuitySettingsMarkup') + '\n' + sourceBlock('settingsFold');
if (!sourceBlock('openSettings')) {
  check('S1 openSettings() bisa diekstrak dari app.js', false, 'sourceBlock("openSettings") kosong — nama fungsi berubah?');
} else {
  check('S1a markup Pengaturan memuat tombol id="settingClearCache"',
    settingsBlock.includes('id="settingClearCache"'),
    'tombol bersihkan-cache tidak ditemukan di markup openSettings()');
  check('S1b tombolnya terikat ke clearAppCache',
    /\$\('settingClearCache'\)[\s\S]{0,120}(confirmClearAppCache|clearAppCache)/.test(settingsBlock),
    'tidak ada binding dari #settingClearCache ke clearAppCache dalam openSettings()');
  check('S1c subteks tombol menjanjikan progres tidak terhapus',
    /progres belajarmu nggak ikut terhapus/i.test(settingsBlock),
    'subteks copy §5 tidak ditemukan di kartu cache');
}

// Lima kelompok accordion: struktur inilah yang membuat panel muat di bawah 900 px, dan
// ia harus <details> (bukan tab) supaya semua input tetap ada di DOM saat Simpan ditekan.
const openSettingsBlock = sourceBlock('openSettings');
check('S1d Pengaturan memakai lima kelompok <details class="settings-fold">',
  /settings-fold/.test(sourceBlock('settingsFold')) &&
  (openSettingsBlock.match(/settingsFold\(/g) || []).length >= 5,
  'jumlah panggilan settingsFold(...) di openSettings(): ' + (openSettingsBlock.match(/settingsFold\(/g) || []).length);

// ------------------------------------------------------------- S2/S3: blok clearAppCache -
const clearBlock = sourceBlock('clearAppCache');
if (!clearBlock) {
  check('S2 clearAppCache() ada di app.js', false, 'sourceBlock("clearAppCache") kosong — handler belum ditulis?');
  check('S3 clearAppCache() memakai CacheStorage', false, 'blok tidak bisa diekstrak');
} else {
  const blacklist = ['activeStateStorageKey', 'ACCOUNT_STATE_PREFIX', 'LEGACY_STATE_KEY',
    'LEGACY_STATE_OWNER_KEY', 'localStorage.clear', 'localStorage.removeItem',
    'localStorage.setItem', 'state.vocab=', 'state.grammar=', 'state.reading=', 'history='];
  const hit = blacklist.filter(token => clearBlock.includes(token));
  check('S2 clearAppCache() tidak menyentuh satu pun jalur progres (daftar hitam)',
    hit.length === 0, 'token terlarang ditemukan: ' + hit.join(', '));
  check('S3 clearAppCache() memakai caches.keys( dan caches.delete(',
    clearBlock.includes('caches.keys(') && clearBlock.includes('caches.delete('),
    'CacheStorage API tidak dipakai — handler ini tidak mungkin membersihkan cache');
  check('S3b cache neural stabil dilindungi dari penghapusan',
    /fiezel-v\$\{self\.FIEZEL_VERSION/.test(clearBlock) && /!==\s*dilindungi|!==\s*protected/.test(clearBlock),
    'tidak terlihat pengecualian untuk cache fiezel-v<versi> (model suara ±152 MB)');
}

// ------------------------------------------------- S4: fixture behavioral (vm, hermetis) -
if (clearBlock) {
  const store = {
    'fiezel-v4-state': '{"level":"B1","xp":1200}',
    'fiezel-v5-state:uuid-123': '{"level":"B2","streak":9,"vocab":["apple"]}',
    'fiezel-v5-legacy-owner': 'uuid-123',
    'fiezel-remote-push': '{"token":"abc"}',
  };
  const before = JSON.stringify(store);
  const deleted = [];
  const toasts = [];
  let updateCalled = 0;
  let reloadScheduled = 0;
  const localStorageMock = {
    getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    key: i => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length; },
  };
  const sandbox = {
    // pola mock caches: puter-auth-coop-test.js:24
    caches: {
      keys: async () => ['fiezel-v5.23.0', 'fiezel-shell-abc'],
      delete: async name => { deleted.push(name); return true; },
      open: async () => ({ put: async () => {}, match: async () => undefined }),
      match: async () => undefined,
    },
    localStorage: localStorageMock,
    navigator: { onLine: true, serviceWorker: { getRegistration: async () => ({ update: async () => { updateCalled++; } }) } },
    showToast: message => { toasts.push(String(message)); },
    enhanceUI: () => {},
    $: () => null,
    location: { reload: () => { reloadScheduled++; } },
    setTimeout: () => 0,
    console,
  };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(clearBlock, sandbox, { timeout: 2000 });
  vm.runInContext('globalThis.__result=clearAppCache()', sandbox, { timeout: 2000 });
  sandbox.__result.then(result => {
    const after = JSON.stringify(store);
    check('S4a keempat kunci localStorage utuh byte-per-byte setelah clearAppCache()',
      before === after, `sebelum=${before}\n       sesudah=${after}`);
    for (const key of ['fiezel-v4-state', 'fiezel-v5-state:uuid-123', 'fiezel-v5-legacy-owner']) {
      check(`S4b kunci progres "${key}" tetap ada dengan nilai sama`,
        localStorageMock.getItem(key) === JSON.parse(before)[key],
        'nilai berubah atau kunci hilang');
    }
    check('S4c caches.delete terpanggil untuk kedua nama cache fiezel-*',
      deleted.includes('fiezel-v5.23.0') && deleted.includes('fiezel-shell-abc'),
      'yang terhapus: ' + JSON.stringify(deleted));
    check('S4d registration.update() dipanggil, service worker TIDAK di-unregister',
      updateCalled === 1 && !/\.unregister\s*\(/.test(clearBlock),
      `update dipanggil ${updateCalled}×; ada pemanggilan .unregister(): ${/\.unregister\s*\(/.test(clearBlock)}`);
    check('S4e murid diberi kabar dan halaman dijadwalkan muat ulang',
      toasts.length === 1 && /cache dibersihkan/i.test(toasts[0]) && Array.isArray(result),
      'toast: ' + JSON.stringify(toasts));

    // ---- S4f: SW belum terdaftar → tetap sukses, pesannya jujur, progres tetap utuh ----
    const store2 = { 'fiezel-v5-state:uuid-9': '{"level":"A2"}' };
    const before2 = JSON.stringify(store2);
    const toasts2 = [];
    const sandbox2 = {
      caches: { keys: async () => ['fiezel-shell-x', 'fiezel-v5.19.0', 'lain-lain'], delete: async n => { toasts2.push('del:' + n); return true; } },
      localStorage: { getItem: k => store2[k] ?? null, setItem: (k, v) => { store2[k] = v; }, removeItem: k => { delete store2[k]; }, clear: () => {} },
      navigator: { onLine: false, serviceWorker: undefined },
      showToast: m => { toasts2.push(String(m)); },
      enhanceUI: () => {}, $: () => null, location: { reload: () => {} }, setTimeout: () => 0, console,
    };
    sandbox2.self = sandbox2; sandbox2.window = sandbox2; sandbox2.globalThis = sandbox2;
    vm.createContext(sandbox2);
    vm.runInContext(clearBlock, sandbox2, { timeout: 2000 });
    vm.runInContext('globalThis.__result=clearAppCache()', sandbox2, { timeout: 2000 });
    return sandbox2.__result.then(() => {
      check('S4f cache neural stabil fiezel-v5.19.0 TIDAK dihapus',
        !toasts2.includes('del:fiezel-v5.19.0') && toasts2.includes('del:fiezel-shell-x'),
        'jejak: ' + JSON.stringify(toasts2));
      check('S4g cache milik pihak lain (tanpa prefix fiezel-) tidak disentuh',
        !toasts2.includes('del:lain-lain'), 'jejak: ' + JSON.stringify(toasts2));
      check('S4h tanpa service worker / saat offline, pesannya jujur bukan diam',
        toasts2.some(m => /Service worker belum terdaftar/i.test(m) && /offline/i.test(m)),
        'jejak: ' + JSON.stringify(toasts2));
      check('S4i progres di fixture kedua juga utuh',
        JSON.stringify(store2) === before2, `sebelum=${before2} sesudah=${JSON.stringify(store2)}`);
      finish();
    });
  }).catch(error => {
    check('S4 fixture behavioral clearAppCache() berjalan tanpa melempar', false, String(error && error.stack || error));
    finish();
  });
} else {
  check('S4 fixture behavioral bisa dijalankan', false, 'blok clearAppCache tidak ada');
  finish();
}

// -------------------------------------------------------- S5: regresi daftar kunci state -
function s5() {
  const konstanta = [
    ["LEGACY_STATE_KEY", "'fiezel-v4-state'"],
    ["ACCOUNT_STATE_PREFIX", "'fiezel-v5-state:'"],
    ["LEGACY_STATE_OWNER_KEY", "'fiezel-v5-legacy-owner'"],
  ];
  for (const [name, value] of konstanta) {
    const re = new RegExp(`${name}\\s*=\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    check(`S5 ${name} masih ${value} (kalau berubah, daftar hitam S2/S4 harus ikut sadar)`,
      re.test(app), 'konstanta tidak ditemukan dengan nilai itu di app.js');
  }
}

function finish() {
  s5();
  const report = {
    gate: 'settings-cache-test',
    spec: 'reports/desain-test-baru.md §4',
    generatedAt: new Date().toISOString(),
    pass: !failed,
    total: checks.length,
    failedCount: checks.filter(c => !c.ok).length,
    checks,
  };
  fs.writeFileSync(path.join(root, 'SETTINGS-CACHE-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
}
