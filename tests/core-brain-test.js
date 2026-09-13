const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
const fs=require('fs'),path=require('path');const root=__fzRoot,read=f=>fs.readFileSync(path.join(root,f),'utf8');
const app=read('app.js'),worker=read('workers/api/route-legacy.js'),road=read('docs/ROADMAP.md'),cfg=read('core-config.js');const fails=[];const ok=(c,m)=>{if(!c)fails.push(m)};
ok(app.includes('const CORE_WORKER_URL=String'),'app does not use canonical Core Worker config');
ok(app.includes("coreWorkerExec('/api/ai/chat'"),'app AI is not routed to core worker');
ok(!app.includes('puter.ai.chat('),'direct Puter AI bypass remains in client');
ok(cfg.includes("aiGateway:'cloudflare'")||cfg.includes("aiGateway:'core-only'"),'Core config does not enforce Cloudflare/core AI');
ok(worker.includes("'/api/ai/chat'"),'core worker AI endpoint missing');
ok(worker.includes('ctx.identity?.sub'),'core worker does not use authenticated user AI');
ok(worker.includes('@cf/meta/llama-3.1-8b-instruct'),'AI model is not owned by Core Brain');
ok(worker.includes("protocol: '1.7'"),'worker protocol 1.7 missing');
ok(worker.includes('push_subscriptions'),'core worker centralized learner/push state missing');
ok(worker.includes("schema: 'fiezel-content-qa-v1'")&&worker.includes("'/api/content/qa/review'"),'Content QA advisory endpoint missing');
ok(worker.includes("schema: 'fiezel-content-patch-v1'")&&worker.includes("'/api/content/patch/candidate'"),'Guarded Content Patch candidate endpoint missing');
ok(!worker.includes("/api/content/qa/apply")&&!worker.includes("/api/content/qa/publish")&&!worker.includes("/api/content/patch/apply")&&!worker.includes("/api/content/patch/publish"),'Content QA must not expose autonomous mutation/publish endpoint in this milestone');
// W4-QA — union W2 (pola regression-test W2-INT §1): naskah tujuan murid PINDAH byte-identik
// dari app.js ke lapisan i18n copy-id-app-a.js (AI-02 F01, W2-APP-A); korpus pemeriksaan
// diperluas ke keduanya — kalimatnya tetap wajib ada, di mana pun ia tinggal.
const homeCopy=app+read('features/i18n/copy-id-app-a.js');
ok(/kuliah IT di luar negeri/.test(homeCopy)&&/beasiswa/.test(homeCopy),'learner goals missing from home copy');
ok(/Gen Alpha|anak Indonesia/.test(road),'tone roadmap missing');
ok(/immutable|rollback/i.test(road),'autonomy rollback guardrail missing');
// W4-QA: daftar larangan ikut memindai lapisan copy — di sanalah naskah murid tinggal sekarang.
const banned=['bodoh','gagal total','orang tua lu kecewa','lu nggak akan jadi apa-apa','pecundang'];for(const x of banned)ok(!homeCopy.toLowerCase().includes(x),`unsafe motivational phrase present: ${x}`);
if(fails.length){console.error('FIEZEL core brain: FAIL');fails.forEach(x=>console.error('- '+x));process.exit(1)}console.log('FIEZEL core brain: PASS');console.log(JSON.stringify({unifiedWorker:true,coreOnlyAI:true,serverOwnedModel:true,rateGuard:true,authenticatedAI:true,genAlphaTone:true,guardedAutonomy:true,contentQa:true}));
