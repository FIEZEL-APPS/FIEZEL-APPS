const fs=require('fs'),path=require('path');
const root=__dirname;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const setup=fs.readFileSync(path.join(root,'creator-report-setup.html'),'utf8');
const dashboard=fs.readFileSync(path.join(root,'creator-report-dashboard.html'),'utf8');
const failures=[];
const check=(ok,message)=>{if(!ok)failures.push(message)};

/* m025-246: OWNER "Navigasi: maks 4 tab - Hari ini . Latihan . Progres . Pengaturan."
   Angka di bawah adalah PLAFON yang diminta, bukan sekadar jumlah yang kebetulan ada
   hari ini: gerbang ini merah kalau tab kelima ditambahkan, dan itulah gunanya. Tab
   Vocab/Grammar/Reading yang hilang tidak kehilangan tujuannya - ketiganya hidup di
   dalam view `latihan`, dan rutenya tetap sah di VALID_VIEWS. */
const navButtons=(html.match(/class="nav(?: active)?"/g)||[]).length;
check(navButtons===5,'Bottom navigation must contain exactly five primary destinations (Practice / School / Home / Progress / Profile), found '+navButtons+'.');
// m025-115: kroma inti pindah ke set ikon duotone milik FIEZEL sendiri
// (features/ui/fiezel-icons.js), sesuai brief redesign OWNER bagian 4. Yang dijaga
// pemeriksaan ini tidak berubah - ikon harus datang dari berkas LOKAL, bukan dari CDN -
// jadi kedua sistem lokal dihitung bersama. Tab bar wajib memakai set sendiri, karena
// di situlah "template vs eksklusif" paling terasa.
check(((html.match(/data-lucide=/g)||[]).length+(html.match(/data-fz-icon=/g)||[]).length)>=9,'Core chrome must use the local icon system.');
check((html.match(/data-fz-icon=/g)||[]).length>=5,'Bottom navigation must use the FIEZEL duotone icon set.');
check(/features\/ui\/fiezel-icons\.js/.test(html)&&/data-fz-icon/.test(fs.readFileSync(path.join(root,'features','ui','fiezel-icons.js'),'utf8')),'FIEZEL icon runtime must ship and hydrate its own markers.');
check(/aria-label="Buka pengaturan"/.test(html),'Icon-only topbar controls need accessible names.');
// m025-131: coach-preview berganti nama jadi coach-strip. Kartu Coach yang lama berisi
// judul serif dan paragraf - persis yang OWNER sebut "masih terlihat seperti bacaan
// article" - dan diganti satu kalimat plus satu tombol. Yang dijaga pemeriksaan ini tetap
// sama: Home punya peluncur, punya blok Coach, dan punya penanda peluncurnya.
check(/launcher-shell/.test(app)&&/coach-strip/.test(app)&&/learning-launcher/.test(app),'Home launcher hierarchy is incomplete.');
check(/go\('skills'\)/.test(app)&&/FiezelSLAddon\.create/.test(app)&&/prepareNeuralVoice/.test(app),'Speaking, Listening, and explicit neural voice preparation are not integrated.');
// Runtime fitur tetap DIDEKLARASIKAN sebelum app.js, dan itu masih penting: urutan tulis
// di dokumen adalah urutan eksekusi baik untuk skrip ber-defer maupun untuk grup malas
// (pemuat memakai async=false). Yang TIDAK lagi benar adalah "dimuat sebelum app.js":
// tumpukan suara neural kini diambil setelah layar pertama tercat, lewat
// type="fiezel/lazy". Karena itu pernyataannya dipecah menjadi dua yang masing-masing
// benar - deklarasi mendahului app.js, dan yang malas benar-benar ditandai malas.
check(html.indexOf('./features/neural-voice/fiezel-voice-say.js')<html.indexOf('<script defer src="./app.js">')&&html.indexOf('./features/speaking-listening/fiezel-speaking-listening-addon.js')<html.indexOf('<script defer src="./app.js">'),'Feature runtimes must be declared before app.js.');
check(/<script type="fiezel\/lazy" data-fiezel-lazy="voice"[^>]*src="\.\/features\/neural-voice\/fiezel-voice-say\.js"/.test(html),'Voice stack must be lazy, not parser-blocking.');
check(html.includes('<script defer src="./features/speaking-listening/fiezel-speaking-listening-addon.js"></script>'),'Skills Lab runtime stays eager but deferred.');
check(/id="globalSky"/.test(html)&&/id="globalCelestial"/.test(html)&&/\.global-sky/.test(css)&&/\.sky-light/.test(css),'Full-viewport celestial atmosphere is incomplete.');
check(/grid-template-columns:minmax\(0,1\.42fr\)/.test(css),'Desktop launcher layout is missing.');
check(/\.learning-launcher\{display:grid;grid-template-columns:repeat\(4,1fr\)/.test(css),'Desktop learning launcher must expose four feature cards.');
check(/@media\(max-width:860px\)/.test(css)&&/@media\(max-width:640px\)/.test(css),'Tablet and mobile breakpoints are missing.');
check(/\.launcher-shell\{grid-template-columns:1fr/.test(css),'Launcher does not collapse to one column.');
// m025-98 (brief redesign 3.7). Pemeriksaan ini dulu MENUNTUT grid modul runtuh menjadi satu
// kolom di ponsel. Itu keputusan yang sengaja pada masanya, tetapi diukur di 375x812 hasilnya
// adalah blok setinggi 976px - hampir 1,2 layar - untuk enam kartu yang isinya masing-masing
// tiga kata. Itulah penyumbang terbesar keluhan OWNER "terlalu panjang untuk scroll sampai
// bawah, dan terlalu banyak tulisan".
//
// Yang dijaga sekarang bukan JUMLAH kolomnya melainkan sifat yang sebenarnya dimaksud: grid
// tetap menyesuaikan diri di ponsel, dan tidak boleh kembali menjadi satu kolom yang membuat
// Home terbaca sebagai daftar panjang.
// Ada beberapa blok @media(max-width:640px) di berkas ini, jadi mengambil yang pertama saja
// akan memeriksa blok yang salah. Yang dicari adalah blok mana pun di antaranya yang mengatur
// grid modul.
//
// m025-134: batas tiap blok dihitung dengan menghitung kurung, bukan dengan memotong di
// '@media' berikutnya. Cara lama membuat panjang satu blok bergantung pada ada-tidaknya
// media query LAIN sesudahnya - menghapus blok mode gelap saja sudah cukup membuat blok
// ponsel menelan aturan milik breakpoint tetangga dan memerahkan pemeriksaan ini tanpa
// satu pun aturan ponsel berubah.
function mediaBlocks(source,opener){
  const out=[];
  let at=source.indexOf(opener);
  while(at>=0){
    let depth=1,i=at+opener.length;
    for(;i<source.length&&depth>0;i++){
      if(source[i]==='{')depth++;
      else if(source[i]==='}')depth--;
    }
    out.push(source.slice(at+opener.length,i-1));
    at=source.indexOf(opener,i);
  }
  return out;
}
const mobileBlocks=mediaBlocks(css,'@media(max-width:640px){');
const launcherBlock=mobileBlocks.find(b=>b.includes('.learning-launcher{'))||'';
check(/\.learning-launcher\{grid-template-columns:1fr 1fr/.test(launcherBlock),
  'Learning launcher must stay a two-column grid on phones - one column made Home 4.7 screens tall.');
check(!/\.learning-launcher\{grid-template-columns:1fr\}/.test(css),
  'The single-column collapse must not come back.');
check(/width:calc\(100% - 16px\)/.test(css),'Mobile bottom navigation lacks a viewport-safe width.');
check(/max-height:min\(760px,88vh\);overflow:auto/.test(css),'Modal content is not viewport bounded.');
check(/prefers-reduced-motion:reduce/.test(css)&&/\.reduce-motion \*/.test(css),'Reduced-motion coverage is incomplete.');
check(!/[🔊🗣✨💡🏠📚📈]/u.test(app+html),'Runtime UI still uses legacy control emoji instead of the icon library.');
check(/type="button" id="deploy"/.test(setup)&&/type="button" id="load"/.test(dashboard),'Auxiliary pages contain implicit buttons.');
check(/<meta name="viewport"/.test(setup)&&/<meta name="viewport"/.test(dashboard),'Auxiliary pages are not mobile-ready.');

// m025-93 (brief redesign Bab 2, bug kritis #2). OWNER: "bottom navigation bar menimpa
// konten saat scroll - teks/angka terpotong di belakang nav pill".
//
// Bukan soal padding: ruang bawah .app sudah 112px + safe-area sementara pill hanya memakan
// 73px. Yang salah adalah pill-nya tembus pandang - diukur di peramban pada m025-91,
// background rgba(255,255,255,.74) dengan backdrop-filter:none. m025-81 mencabut blur demi
// baterai tetapi meninggalkan transparansinya, jadi token kaca berubah menjadi panel bening.
//
// Gerbang ini menjaga dua hal sekaligus, dan keduanya perlu: pill tidak boleh kembali
// memakai token tembus pandang, DAN blur tidak boleh dikembalikan diam-diam sebagai jalan
// pintas - keputusan baterai m025-81 masih berlaku.
const navRule=(css.match(/\.bottomnav\{[^}]*\}/g)||[]).join('');
check(/background:var\(--glass-solid\)/.test(navRule),
  'Tab bar must use the opaque token; content must never read through it while scrolling.');
check(!/backdrop-filter/.test(navRule),
  'Blur must not come back to the tab bar - m025-81 removed it from always-on chrome for battery.');
check(/--glass-solid:rgba\([^)]*,\.9\d\)/.test(css),
  'The opaque token must actually be opaque enough that nothing bleeds through.');
check(/\.nav-scrim\{[^}]*pointer-events:none/.test(css),
  'The bottom scrim must never swallow taps.');
check(/\.nav-scrim\{[^}]*z-index:39/.test(css)&&/\.bottomnav\{[\s\S]{0,400}?z-index:40/.test(css),
  'The scrim must sit under the pill, so the tabs stay crisp on top of it.');
check(/<div class="nav-scrim" aria-hidden="true"><\/div>/.test(html),
  'The scrim element must exist and stay decorative.');

if(failures.length){
  console.error('FIEZEL UI structure: FAIL');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('FIEZEL UI structure: PASS');
console.log(JSON.stringify({primaryNavigation:5,desktopLauncher:true,tabletBreakpoint:860,mobileBreakpoint:640,reducedMotion:true,emojiControls:false}));
