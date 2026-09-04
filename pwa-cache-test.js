const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__dirname;
const version=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'))).version;
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const expectedShell=['./','./index.html','./style.css','./version.js','./report-config.js','./core-config.js','./content-canary.js','./content-promotion.js','./content-canary-config.js','./lucide.min.js','./app.js','./validator.js','./manifest.json','./vocabulary-master.json','./reading-bank.json','./grammar-templates.json','./grammar-curriculum-v1.json','./favicon-64.png','./apple-touch-icon.png','./instagram.svg','./creator-report-setup.html','./creator-report-dashboard.html','./fiezel-report-worker.js','./features/neural-voice/fiezel-neural-voice-config.js','./features/neural-voice/fiezel-puter-voice.js','./features/neural-voice/fiezel-subtitle.js','./features/neural-voice/fiezel-subtitle-translate.js','./features/neural-voice/fiezel-voice-say.js','./features/neural-voice/fiezel-diag-panel.js','./features/speaking-listening/speaking-listening-config.js','./features/speaking-listening/fiezel-speaking-listening-addon.js','./features/speaking-listening/speaking-listening-addon.css','./features/speaking-listening/listening-bank-v1.json','./features/speaking-listening/speaking-bank-v1.json'];
const match=sw.match(/const ASSETS=(\[[^;]+\]);/s);
let precache=[];
try{precache=match?vm.runInNewContext(match[1]):[]}catch{}
const neuralPrecache=precache.filter(asset=>String(asset).replace(/[?#].*$/,'').includes('/vendor/kokoro-'));
const assets=expectedShell.map(asset=>({asset,exists:asset==='.'?true:fs.existsSync(path.join(root,asset.replace('./',''))),precache:precache.includes(asset)}));
const result={
  version,
  runtimeCacheStable:sw.includes('const CACHE=`fiezel-v${self.FIEZEL_VERSION}`'),
  revisionedShellCache:sw.includes('const SHELL_CACHE=`fiezel-shell-${SW_REV}`'),
  /* m025-212: yang dijaga di sini bukan kata "skipWaiting" melainkan satu sifat - service
   * worker tidak boleh mengambil alih klien yang sedang jalan ATAS KEMAUANNYA SENDIRI, karena
   * itulah yang menukar generasi controller di tengah sesi murid. Sifat itu utuh: install dan
   * activate tetap nol, clients.claim tetap nol, dan satu-satunya penyebutan duduk di balik
   * pagar FIEZEL_SKIP_WAITING - yaitu saat murid sendiri menekan "Perbarui sekarang" di kartu
   * pembaruan. Larangan buta atas kata itu membuat kartu pembaruan mustahil dibuat, padahal
   * kartu itulah yang membuat penantian ini berakhir atas keputusan murid, bukan diam-diam. */
  eagerActivationDisabled:(()=>{
    const kode=sw.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/(^|[^:])\/\/[^\n]*/g,'$1 ');
    const pagar=/if\(event\?\.data\?\.type==='FIEZEL_SKIP_WAITING'\)\{self\.skipWaiting\(\);return\}/.test(kode);
    const install=(kode.match(/addEventListener\('install'[\s\S]{0,400}/)||[''])[0];
    const activate=(kode.match(/addEventListener\('activate'[\s\S]{0,800}/)||[''])[0];
    return (kode.match(/skipWaiting/g)||[]).length===1&&pagar
      &&!/skipWaiting/.test(install)&&!/skipWaiting/.test(activate)
      &&!/clients\s*\.\s*claim/.test(kode);
  })(),
  staleShellOnlyInvalidation:sw.includes("k.startsWith('fiezel-shell-')&&k!==SHELL_CACHE"),
  stableRuntimeNotInvalidated:!sw.includes("k.startsWith('fiezel-')&&k!==CACHE"),
  navigationFallbackCurrentShell:sw.includes("caches.match('./index.html',{cacheName:SHELL_CACHE})"),
  shellReloadInstall:sw.includes("new Request(asset,{cache:'reload'})"),
  neuralInstallPrecacheExcluded:neuralPrecache.length===0,
  neuralRuntimeLookupStable:sw.includes('caches.match(e.request,{cacheName:CACHE})'),
  heavyImplicitCacheExcluded:sw.includes('!isNeuralAsset(e.request)'),
  assets,
  neuralPrecache
};
result.pass=result.runtimeCacheStable&&result.revisionedShellCache&&result.eagerActivationDisabled&&result.staleShellOnlyInvalidation&&result.stableRuntimeNotInvalidated&&result.navigationFallbackCurrentShell&&result.shellReloadInstall&&result.neuralInstallPrecacheExcluded&&result.neuralRuntimeLookupStable&&result.heavyImplicitCacheExcluded&&result.assets.every(x=>x.exists&&x.precache);
console.log(JSON.stringify(result,null,2));
process.exitCode=result.pass?0:1;
