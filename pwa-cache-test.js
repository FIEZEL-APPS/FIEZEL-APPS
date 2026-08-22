const fs=require('fs'),path=require('path'),vm=require('vm');
const root=__dirname;
const version=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'))).version;
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const expectedShell=['./','./index.html','./style.css','./version.js','./report-config.js','./core-config.js','./content-canary.js','./content-promotion.js','./content-canary-config.js','./lucide.min.js','./app.js','./validator.js','./manifest.json','./vocabulary-master.json','./reading-bank.json','./grammar-templates.json','./favicon-64.png','./apple-touch-icon.png','./instagram.svg','./creator-report-setup.html','./creator-report-dashboard.html','./fiezel-report-worker.js','./features/neural-voice/fiezel-neural-voice-config.js','./features/neural-voice/fiezel-puter-voice.js','./features/neural-voice/fiezel-subtitle.js','./features/neural-voice/fiezel-kokoro-adapter.js','./features/neural-voice/fiezel-neural-voice.js','./features/neural-voice/fiezel-web-audio-player.js','./features/neural-voice/fiezel-neural-voice-bootstrap.js','./features/neural-voice/fiezel-neural-voice-ios-cache-fix.js','./features/neural-voice/fiezel-neural-voice-cache-integrity-repair.js','./features/neural-voice/fiezel-neural-voice-audibility-fix.js','./features/neural-voice/fiezel-diag-panel.js','./features/neural-voice/fiezel-pipeline-device-probe.js','./features/speaking-listening/speaking-listening-config.js','./features/speaking-listening/fiezel-speaking-listening-addon.js','./features/speaking-listening/speaking-listening-addon.css','./features/speaking-listening/listening-bank-v1.json','./features/speaking-listening/speaking-bank-v1.json'];
const match=sw.match(/const ASSETS=(\[[^;]+\]);/s);
let precache=[];
try{precache=match?vm.runInNewContext(match[1]):[]}catch{}
const neuralPrecache=precache.filter(asset=>String(asset).replace(/[?#].*$/,'').includes('/vendor/kokoro-'));
const assets=expectedShell.map(asset=>({asset,exists:asset==='.'?true:fs.existsSync(path.join(root,asset.replace('./',''))),precache:precache.includes(asset)}));
const result={
  version,
  runtimeCacheStable:sw.includes('const CACHE=`fiezel-v${self.FIEZEL_VERSION}`'),
  revisionedShellCache:sw.includes('const SHELL_CACHE=`fiezel-shell-${SW_REV}`'),
  eagerActivationDisabled:!sw.includes('self.skipWaiting()')&&!sw.includes('self.clients.claim()'),
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
