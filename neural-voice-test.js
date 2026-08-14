'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=__dirname;
const lock=JSON.parse(fs.readFileSync(path.join(root,'NEURAL-VOICE-SOURCE-LOCK.json'),'utf8'));
const config=require(path.join(root,'features','neural-voice','fiezel-neural-voice-config.js'));
const core=require(path.join(root,'features','neural-voice','fiezel-neural-voice.js'));
const adapterApi=require(path.join(root,'features','neural-voice','fiezel-kokoro-adapter.js'));
const player=require(path.join(root,'features','neural-voice','fiezel-web-audio-player.js'));
const bootstrap=fs.readFileSync(path.join(root,'features','neural-voice','fiezel-neural-voice-bootstrap.js'),'utf8');
let pass=0;
async function test(name,fn){await fn();pass++;console.log('PASS',name)}
function file(rel){return path.join(root,rel)}
function sha(rel){return crypto.createHash('sha256').update(fs.readFileSync(file(rel))).digest('hex')}
function verifyAsset(asset){assert.ok(fs.existsSync(file(asset.path)),asset.path);assert.equal(fs.statSync(file(asset.path)).size,asset.sizeBytes,asset.path);assert.equal(sha(asset.path),asset.sha256,asset.path)}

(async()=>{
  await test('source lock schema',()=>assert.equal(lock.schema,'fiezel-neural-voice-source-lock-v1'));
  await test('Kokoro source commit is full and pinned',()=>assert.match(lock.provider.commit,/^[a-f0-9]{40}$/));
  await test('provider version remains 1.2.1',()=>assert.equal(lock.provider.version,'1.2.1'));
  await test('runtime bundle integrity',()=>verifyAsset(lock.runtime.bundle));
  await test('WASM module integrity',()=>verifyAsset(lock.runtime.wasmModule));
  await test('WASM binary integrity',()=>verifyAsset(lock.runtime.wasmBinary));
  await test('model integrity',()=>verifyAsset(lock.model));
  await test('model stays below GitHub single-file limit',()=>assert.ok(lock.model.sizeBytes<100*1024*1024));
  await test('all six voice hashes match',()=>{for(const voice of lock.voices){const rel=`vendor/kokoro-model/voices/${voice.id}.bin`;assert.equal(sha(rel),voice.sha256)}});
  await test('support JSON parses',()=>{for(const rel of ['vendor/kokoro-model/config.json','vendor/kokoro-model/tokenizer.json','vendor/kokoro-model/tokenizer_config.json'])JSON.parse(fs.readFileSync(file(rel),'utf8'))});
  await test('required licenses are present',()=>{for(const rel of ['vendor/kokoro-js/LICENSE','vendor/kokoro-model/LICENSE','vendor/kokoro-js/licenses/HUGGINGFACE-TRANSFORMERS-APACHE-2.0.txt','vendor/kokoro-js/licenses/PHONEMIZER-APACHE-2.0.txt','vendor/kokoro-js/licenses/ONNXRUNTIME-MIT.txt'])assert.ok(fs.statSync(file(rel)).size>500,rel)});
  await test('zero paid runtime policy',()=>assert.deepStrictEqual([lock.policy.paidRuntime,lock.policy.vendorApiKey,lock.policy.remoteInference,lock.policy.crossOriginTtsRequests],[false,false,false,false]));
  await test('explicit same-origin warmup policy',()=>assert.deepStrictEqual([lock.policy.sameOriginExplicitWarmup,lock.policy.offlineAfterWarmRequired],[true,true]));
  await test('config pins source and runtime dependencies',()=>assert.deepStrictEqual([config.schema,config.providerVersion,config.providerSourceCommit,config.transformersVersion,config.onnxRuntimeWebVersion],['fiezel-neural-voice-v2','1.2.1',lock.provider.commit,'3.5.1','1.22.0-dev.20250409-89f8206ba4']));
  await test('adapter rejects cross-origin paths',()=>assert.throws(()=>adapterApi.assertLocalPath('https://example.com/model'),'must be same-origin/local'));
  await test('adapter forces local routing before model load',async()=>{const env={allowRemoteModels:true,allowLocalModels:false,localModelPath:'',wasmPaths:''};let voiceBase='',captured=null;const KokoroTTS={from_pretrained:async(id,options)=>{captured={id,options,remote:env.allowRemoteModels,local:env.allowLocalModels,path:env.localModelPath,wasm:env.wasmPaths,voiceBase};return{generate:async()=>({data:new Float32Array([0]),sampling_rate:24000})}}};const adapter=adapterApi.createKokoroAdapter({KokoroTTS,kokoroEnv:env,setVoiceDataUrl:value=>{voiceBase=value},modelId:'kokoro-model',localModelPath:'./vendor/',voiceBaseUrl:'./vendor/kokoro-model/voices',wasmBasePath:'./vendor/kokoro-js/wasm/'});await adapter.initialize();assert.deepStrictEqual(captured,{id:'kokoro-model',options:{dtype:'q8',device:'wasm'},remote:false,local:true,path:'./vendor/',wasm:'./vendor/kokoro-js/wasm/',voiceBase:'./vendor/kokoro-model/voices'})});
  await test('voice service rejects empty input',()=>assert.throws(()=>core.normalizeText('',100),'empty'));
  await test('voice service bounds input',()=>assert.throws(()=>core.normalizeText('x'.repeat(101),100),'bounded'));
  await test('web audio accepts Kokoro Float32 payload',()=>assert.ok(player.pickSamples({data:new Float32Array([0,.1])}) instanceof Float32Array));
  await test('bootstrap uses dynamic same-origin vendor import',()=>assert.ok(bootstrap.includes("absolute('vendor/kokoro-js/kokoro.web.js')")&&bootstrap.includes("credentials:'same-origin'")&&bootstrap.includes("cache:'no-store'")));
  await test('bootstrap does not silently download before opt-in',()=>assert.ok(bootstrap.includes("if(!readStatus().prepared)return browserSpeak")));
  await test('bootstrap verifies complete cache before ready flag',()=>assert.ok(bootstrap.indexOf('verifyCachedAssets()')<bootstrap.indexOf('writeStatus(true)')));
  await test('stale prepared state fails closed to browser TTS',()=>assert.ok(bootstrap.includes('if(!(await verifyCachedAssets())){writeStatus(false)')));
  await test('bootstrap contains no vendor endpoint or credential',()=>assert.ok(!/https?:\/\//i.test(bootstrap)&&!/(?:api[_-]?key|bearer\s+[a-z0-9._-]{12,}|sk-[a-z0-9_-]{12,})/i.test(bootstrap)));
  await test('production claim remains false pending device gates',()=>assert.deepStrictEqual([lock.promotion.sourceAndAssetClosure,lock.promotion.realDeviceGate,lock.promotion.productionClaim],['PASS','PENDING',false]));
  const bundle=await import('./vendor/kokoro-js/kokoro.web.js');
  await test('browser bundle exports patched controls',()=>assert.ok(bundle.KokoroTTS&&bundle.env&&bundle.setVoiceDataUrl&&'allowRemoteModels'in bundle.env&&'allowLocalModels'in bundle.env&&'localModelPath'in bundle.env&&'wasmPaths'in bundle.env));
  console.log(`FIEZEL Neural Voice: PASS ${pass}/0`);
})().catch(error=>{console.error('FIEZEL Neural Voice: FAIL',error.stack||error);process.exit(1)});
