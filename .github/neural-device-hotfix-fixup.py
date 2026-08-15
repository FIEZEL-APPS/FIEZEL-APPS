from pathlib import Path

p=Path('features/neural-voice/fiezel-neural-voice-bootstrap.js')
s=p.read_text()
old="""      lastFallbackReason=lastError;
      circuitOpen=true;audibleVerified=false;phase='error';
      diag({phase:'speak_fallback',reason:lastError,circuitOpen:true});
"""
new="""      lastFallbackReason=lastError;
      const shouldOpenCircuit=!!service;
      diag({phase:'speak_fallback',reason:lastError,circuitOpen:shouldOpenCircuit});
      circuitOpen=shouldOpenCircuit;audibleVerified=false;if(circuitOpen)phase='error';
"""
if s.count(old)!=1:
    raise SystemExit(f'circuit fixup expected 1 match, got {s.count(old)}')
s=s.replace(old,new,1)
old_guard="if(!readStatus().prepared&&!preparedFlag)return fallbackOrThrow(new Error('Neural voice assets are not prepared'));"
new_guard="""if(!readStatus().prepared&&!preparedFlag&&allowFallback)return browserSpeak(text,options);
    if(!readStatus().prepared&&!preparedFlag)throw new Error('Neural voice assets are not prepared');"""
if s.count(old_guard)!=1:
    raise SystemExit(f'prepared guard fixup expected 1 match, got {s.count(old_guard)}')
s=s.replace(old_guard,new_guard,1)
old_storage="function preparedStorage(){return (phase==='cached'||phase==='ready'||phase==='error')?(storage||readStatus().storage):''}"
new_storage="function preparedStorage(){const stored=readStatus();return (stored.prepared||preparedFlag)?(storage||stored.storage||'cache'):''}"
if s.count(old_storage)!=1:
    raise SystemExit(f'prepared storage fixup expected 1 match, got {s.count(old_storage)}')
s=s.replace(old_storage,new_storage,1)
p.write_text(s)

# Update legacy/new tests to match the intentional neural-only contract.
t=Path('neural-voice-test.js')
ts=t.read_text()
old_test='''  await test('bootstrap does not silently download before opt-in',()=>assert.ok(bootstrap.includes("if(!readStatus().prepared&&!preparedFlag)return browserSpeak")));'''
new_test='''  await test('bootstrap does not silently download before opt-in',()=>assert.ok(bootstrap.includes("if(!readStatus().prepared&&!preparedFlag&&allowFallback)return browserSpeak")&&bootstrap.includes("if(!readStatus().prepared&&!preparedFlag)throw new Error('Neural voice assets are not prepared')")));'''
if ts.count(old_test)!=1:
    raise SystemExit(f'legacy neural opt-in assertion expected 1 match, got {ts.count(old_test)}')
t.write_text(ts.replace(old_test,new_test,1))

h=Path('neural-voice-device-hotfix-test.js')
hs=h.read_text()
old_hot="assert.ok(boot.includes(\"circuitOpen=true;audibleVerified=false\"),'neural timeout/failure must open circuit');"
new_hot="assert.ok(boot.includes(\"const shouldOpenCircuit=!!service\")&&boot.includes(\"circuitOpen=shouldOpenCircuit;audibleVerified=false\"),'speech failure with initialized service must open circuit without blocking late init adoption');"
if hs.count(old_hot)!=1:
    raise SystemExit(f'hotfix circuit assertion expected 1 match, got {hs.count(old_hot)}')
h.write_text(hs.replace(old_hot,new_hot,1))
