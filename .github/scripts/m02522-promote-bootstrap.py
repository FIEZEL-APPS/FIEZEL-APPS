from pathlib import Path

bootstrap = Path('features/neural-voice/fiezel-neural-voice-bootstrap.js')
text = bootstrap.read_text()
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
if old in text:
    text = text.replace(old, new)
elif new not in text:
    raise SystemExit('bootstrap policy block is neither legacy nor m025-22')

if "kokoro.web.js?nv=m025-5" in text:
    raise SystemExit('stale m025-5 vendor URL remains in bootstrap')
if "env?.backends?.onnx?.wasm" in text:
    raise SystemExit('stale fabricated WASM facade path remains in bootstrap')
if "bytes:2136728" not in text:
    raise SystemExit('new vendor byte contract missing')
if "wasmEnv.proxy=true" not in text or "readBack:true" not in text:
    raise SystemExit('fail-closed proxy/readback contract missing')
bootstrap.write_text(text)

diag = Path('features/neural-voice/fiezel-diag-panel.js')
diag_text = diag.read_text()
if "var DIAG_BUILD = 'm025-22';" not in diag_text:
    if "var DIAG_BUILD = 'm025-21';" not in diag_text:
        raise SystemExit('unexpected Diagnostics build marker')
    diag_text = diag_text.replace("var DIAG_BUILD = 'm025-21';", "var DIAG_BUILD = 'm025-22';")
diag.write_text(diag_text)

sw = Path('sw.js')
sw_text = sw.read_text()
new_rev = "const SW_REV='m025-22-real-wasm-proxy-20260817-1';"
if new_rev not in sw_text:
    old_rev = "const SW_REV='m025-21-apple-webgpu-rollback-20260817-1';"
    if old_rev not in sw_text:
        raise SystemExit('unexpected service-worker release marker')
    sw_text = sw_text.replace(old_rev, new_rev)
if 'skipWaiting(' in sw_text:
    raise SystemExit('m025-22 must not introduce eager service-worker takeover')
sw.write_text(sw_text)

gate = Path('neural-voice-test.js')
gate_text = gate.read_text()
new_gate = """  await test('physical Apple production gate is state-aware and evidence-backed',()=>{
    assert.equal(lock.promotion.sourceAndAssetClosure,'PASS');
    const pending=String(lock.candidate?.state||'').includes('PHYSICAL_PENDING');
    if(pending){
      assert.equal(lock.promotion.realDeviceGate,'PENDING','machine-verified candidate must not fabricate a physical PASS');
      assert.equal(lock.promotion.productionClaim,false,'machine-verified candidate must not claim production success before Apple acceptance');
      assert.ok(!lock.promotion.physicalEvidence,'pending candidate must not carry synthetic current physical evidence');
      const historical=lock.promotion.historicalPhysicalBaselineM0255;
      assert.ok(historical&&typeof historical==='object','historical released Apple baseline must remain preserved');
      assert.equal(historical.environment,'Apple standalone PWA');
      assert.equal(historical.terminalPhase,'speak_neural_success');
      assert.equal(historical.requestId,'nv-msvtu4mc-1');
      assert.equal(historical.voice,'af_heart');
      assert.equal(historical.tokenCount,53);
      assert.equal(historical.samples,92400);
      assert.equal(historical.capturedAtAsiaJakarta,'2026-08-16T20:15:00.344+07:00');
      for(const key of ['modelElapsedMs','generationElapsedMs','playbackElapsedMs','totalElapsedMs'])assert.ok(Number.isInteger(historical[key])&&historical[key]>0,key);
      assert.ok(historical.totalElapsedMs>=historical.generationElapsedMs);
      assert.ok(!('prompt' in historical)&&!('phonemes' in historical)&&!('tokens' in historical)&&!('errorMessage' in historical),'historical physical evidence must remain bounded and private');
      return;
    }
    assert.deepStrictEqual([lock.promotion.realDeviceGate,lock.promotion.productionClaim],['PASS',true]);
    const evidence=lock.promotion.physicalEvidence;
    assert.ok(evidence&&typeof evidence==='object','physical evidence required for production claim');
    assert.equal(evidence.environment,'Apple standalone PWA');
    assert.equal(evidence.terminalPhase,'speak_neural_success');
    for(const key of ['modelElapsedMs','generationElapsedMs','playbackElapsedMs','totalElapsedMs'])assert.ok(Number.isInteger(evidence[key])&&evidence[key]>0,key);
    assert.ok(evidence.totalElapsedMs>=evidence.generationElapsedMs);
    assert.ok(!('prompt' in evidence)&&!('phonemes' in evidence)&&!('tokens' in evidence)&&!('errorMessage' in evidence),'physical evidence must remain bounded and private');
  });
"""
if new_gate not in gate_text:
    start_marker="  await test('physical Apple production gate is evidence-backed',()=>{"
    end_marker="  const bundle=await import('./vendor/kokoro-js/kokoro.web.js');"
    start=gate_text.find(start_marker)
    end=gate_text.find(end_marker,start)
    if start < 0 or end < 0:
        raise SystemExit('stale physical gate invariant markers not found')
    gate_text=gate_text[:start]+new_gate+gate_text[end:]
gate.write_text(gate_text)
