'use strict';
const fs=require('fs');
const path=require('path');
const http=require('http');

const root=__dirname;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.wasm':'application/wasm','.onnx':'application/octet-stream','.bin':'application/octet-stream'};
const server=http.createServer((request,response)=>{
  const pathname=new URL(request.url,'http://127.0.0.1').pathname;
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
  const target=path.resolve(root,relative);
  if(!target.startsWith(`${root}${path.sep}`)){response.writeHead(403);return response.end('Forbidden')}
  fs.stat(target,(error,stat)=>{
    if(error||!stat.isFile()){response.writeHead(error?.code==='ENOENT'?404:500);return response.end(error?.message||'Not a file')}
    const headers={'Content-Type':mime[path.extname(target)]||'application/octet-stream','Accept-Ranges':'bytes'};
    if(request.method==='HEAD'){response.writeHead(200,{...headers,'Content-Length':stat.size});return response.end()}
    const match=/^bytes=(\d+)-(\d*)$/.exec(String(request.headers.range||''));
    if(match){const start=Number(match[1]),end=Math.min(stat.size-1,match[2]?Number(match[2]):stat.size-1);if(start> end||start>=stat.size){response.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return response.end()}response.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${stat.size}`});return fs.createReadStream(target,{start,end}).pipe(response)}
    response.writeHead(200,{...headers,'Content-Length':stat.size});fs.createReadStream(target).pipe(response);
  });
});

server.listen(0,'127.0.0.1',async()=>{
  const {port}=server.address(),base=`http://127.0.0.1:${port}`;
  try{
    const small=['/','/features/speaking-listening/speaking-listening-addon.css','/features/speaking-listening/fiezel-speaking-listening-addon.js','/features/speaking-listening/listening-bank-v1.json','/features/speaking-listening/speaking-bank-v1.json','/features/neural-voice/fiezel-neural-voice-bootstrap.js'];
    const responses=await Promise.all(small.map(item=>fetch(base+item)));
    if(responses.some(response=>!response.ok))throw new Error(`small asset status ${responses.map(r=>r.status).join(',')}`);
    const index=await responses[0].text();
    if(!index.includes('./features/speaking-listening/fiezel-speaking-listening-addon.js')||!index.includes('./features/neural-voice/fiezel-neural-voice-bootstrap.js'))throw new Error('feature scripts missing from index');
    if(index.indexOf('./features/neural-voice/fiezel-neural-voice-bootstrap.js')>index.indexOf('./app.js'))throw new Error('voice bootstrap must load before app.js');
    const modelPath='/vendor/kokoro-model/onnx/model_quantized.onnx',wasmPath='/vendor/kokoro-js/wasm/ort-wasm-simd-threaded.jsep.wasm';
    const [modelHead,wasmHead,modelRange]=await Promise.all([fetch(base+modelPath,{method:'HEAD'}),fetch(base+wasmPath,{method:'HEAD'}),fetch(base+modelPath,{headers:{Range:'bytes=0-1023'}})]);
    if(!modelHead.ok||Number(modelHead.headers.get('content-length'))!==92361116)throw new Error('model HEAD contract failed');
    if(!wasmHead.ok||wasmHead.headers.get('content-type')!=='application/wasm'||Number(wasmHead.headers.get('content-length'))!==21596019)throw new Error('WASM HEAD contract failed');
    if(modelRange.status!==206||Number(modelRange.headers.get('content-length'))!==1024||(await modelRange.arrayBuffer()).byteLength!==1024)throw new Error('model Range contract failed');
    console.log('FIEZEL neural voice HTTP: PASS');
    console.log(JSON.stringify({status:'PASS',smallAssets:small.length,modelBytes:92361116,wasmBytes:21596019,rangeBytes:1024}));
  }catch(error){console.error(`FIEZEL neural voice HTTP: FAIL\n${error.stack}`);process.exitCode=1}
  finally{server.close()}
});
