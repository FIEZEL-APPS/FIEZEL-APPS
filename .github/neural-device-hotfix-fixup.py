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
p.write_text(s.replace(old,new,1))
