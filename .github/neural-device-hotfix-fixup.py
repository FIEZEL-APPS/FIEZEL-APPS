from pathlib import Path

p=Path('features/neural-voice/fiezel-neural-voice-bootstrap.js')
s=p.read_text()
old="""      lastFallbackReason=lastError;
      circuitOpen=true;audibleVerified=false;phase='error';
      diag({phase:'speak_fallback',reason:lastError,circuitOpen:true});
"""
new="""      lastFallbackReason=lastError;
      diag({phase:'speak_fallback',reason:lastError,circuitOpen:true});
      circuitOpen=true;audibleVerified=false;phase='error';
"""
if s.count(old)!=1:
    raise SystemExit(f'legacy-gate fixup expected 1 match, got {s.count(old)}')
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

# The old static assertion assumed every unprepared call must browser-fallback.
# The hotfix intentionally adds a neural-only mode (allowFallback:false), so the
# permanent regression gate must assert both sides of the new contract.
t=Path('neural-voice-test.js')
ts=t.read_text()
old_test='''  await test('bootstrap does not silently download before opt-in',()=>assert.ok(bootstrap.includes("if(!readStatus().prepared&&!preparedFlag)return browserSpeak")));'''
new_test='''  await test('bootstrap does not silently download before opt-in',()=>assert.ok(bootstrap.includes("if(!readStatus().prepared&&!preparedFlag&&allowFallback)return browserSpeak")&&bootstrap.includes("if(!readStatus().prepared&&!preparedFlag)throw new Error('Neural voice assets are not prepared')")));'''
if ts.count(old_test)!=1:
    raise SystemExit(f'legacy neural opt-in assertion expected 1 match, got {ts.count(old_test)}')
t.write_text(ts.replace(old_test,new_test,1))
