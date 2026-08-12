const fs=require('fs'),path=require('path');
const root=__dirname;
const version=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'))).version;
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const assets=['./','./index.html','./style.css','./version.js','./report-config.js','./core-config.js','./content-canary.js','./content-promotion.js','./content-canary-config.js','./lucide.min.js','./app.js','./validator.js','./manifest.json','./vocabulary-master.json','./reading-bank.json','./grammar-templates.json','./favicon-64.png','./apple-touch-icon.png','./instagram.svg','./creator-report-setup.html','./creator-report-dashboard.html','./fiezel-report-worker.js'];
const result={version,cacheNamePattern:sw.includes('`fiezel-v${self.FIEZEL_VERSION}`'),assets:[],staleInvalidation:sw.includes("k.startsWith('fiezel-')&&k!==CACHE")};
for(const a of assets){const f=path.join(root,a.replace('./',''));result.assets.push({asset:a,exists:a==='.'?true:fs.existsSync(f),precache:sw.includes(`'${a}'`)})}
result.pass=result.cacheNamePattern&&result.staleInvalidation&&result.assets.every(x=>x.exists&&x.precache);
console.log(JSON.stringify(result,null,2));
process.exitCode=result.pass?0:1;
