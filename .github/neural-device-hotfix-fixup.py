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
p.write_text(s)
