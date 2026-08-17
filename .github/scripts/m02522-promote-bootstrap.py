from pathlib import Path

p = Path('features/neural-voice/fiezel-neural-voice-bootstrap.js')
text = p.read_text()
text = text.replace(
    "{path:'vendor/kokoro-js/kokoro.web.js?nv=m025-5',bytes:2136684}",
    "{path:'vendor/kokoro-js/kokoro.web.js?nv=m025-22',bytes:2136728}",
)
old = """      const kokoro=await dynamicImport(absolute('vendor/kokoro-js/kokoro.web.js?nv=m025-5'));
      try{
        const wasmEnv=kokoro.env?.backends?.onnx?.wasm;
        const appleStandalone=root.navigator?.standalone===true;
        if(wasmEnv&&typeof wasmEnv==='object'){
          if(appleStandalone||root.crossOriginIsolated!==true)wasmEnv.numThreads=1;
          if(appleStandalone)wasmEnv.proxy=false;
          wasmPolicy=appleStandalone?'apple-standalone-single-thread-direct':(root.crossOriginIsolated===true?'auto-threaded':'single-thread');
          diag({phase:'wasm_policy',policy:wasmPolicy,numThreads:Number(wasmEnv.numThreads||0),proxy:!!wasmEnv.proxy});
        }
      }catch{}
"""
new = """      const kokoro=await dynamicImport(absolute('vendor/kokoro-js/kokoro.web.js?nv=m025-22'));
      const appleStandalone=root.navigator?.standalone===true||!!root.matchMedia?.('(display-mode: standalone)')?.matches;
      let wasmEnv=null;
      try{wasmEnv=kokoro.env?.wasmEnv||null}catch(error){
        diag({phase:'wasm_policy_error',policy:'m025-22-real-wasm-proxy',errorKind:String(error?.name||'error').slice(0,80)});
        if(appleStandalone)throw new Error('Apple neural WASM proxy environment is unavailable');
      }
      if(wasmEnv&&typeof wasmEnv==='object'){
        if(appleStandalone||root.crossOriginIsolated!==true)wasmEnv.numThreads=1;
        if(appleStandalone)wasmEnv.proxy=true;
        const proxyReadBack=wasmEnv.proxy===true;
        const threadsReadBack=Number(wasmEnv.numThreads||0);
        if(appleStandalone&&(!proxyReadBack||threadsReadBack!==1)){
          diag({phase:'wasm_policy_error',policy:'apple-standalone-single-thread-proxy-worker',numThreads:threadsReadBack,proxy:proxyReadBack,errorKind:'proxy_readback_failed'});
          throw new Error('Apple neural WASM proxy policy did not apply');
        }
        wasmPolicy=appleStandalone?'apple-standalone-single-thread-proxy-worker':(root.crossOriginIsolated===true?'auto-threaded':'single-thread');
        diag({phase:'wasm_policy',policy:wasmPolicy,numThreads:threadsReadBack,proxy:proxyReadBack,readBack:true});
      }else if(appleStandalone){
        diag({phase:'wasm_policy_error',policy:'apple-standalone-single-thread-proxy-worker',errorKind:'wasm_env_missing'});
        throw new Error('Apple neural WASM proxy environment is unavailable');
      }
"""
if old not in text:
    if new not in text:
        raise SystemExit('bootstrap legacy policy block not found')
else:
    text = text.replace(old, new)

if "kokoro.web.js?nv=m025-5" in text:
    raise SystemExit('stale m025-5 vendor URL remains in bootstrap')
if "env?.backends?.onnx?.wasm" in text:
    raise SystemExit('stale fabricated WASM facade path remains in bootstrap')
if "bytes:2136728" not in text:
    raise SystemExit('new vendor byte contract missing')
if "wasmEnv.proxy=true" not in text or "readBack:true" not in text:
    raise SystemExit('fail-closed proxy/readback contract missing')

p.write_text(text)
