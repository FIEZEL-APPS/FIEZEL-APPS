const {genesis,append,verifyChain,sha,stable}=require('./fiezel-evolution-ledger.js');
let pass=0,fail=0;
function check(name,ok,details){if(ok){pass++}else{fail++;console.error(`FAIL ${name}: ${details}`)}}
{
  const g=genesis();
  check('genesis valid',verifyChain([g]).ok,JSON.stringify(verifyChain([g])));
  check('genesis prevHash zero',g.prevHash==='0'.repeat(64),g.prevHash);
}
{
  let chain=[genesis()];
  const r1=append(chain,{event:'insight',insightId:'weak-a',target:'grammar-past',metrics:{accuracy:50}});
  chain=r1.entries;
  const r2=append(chain,{event:'candidate_created',patchId:'p1',decision:'candidate',metrics:{ok:true}});
  chain=r2.entries;
  const r3=append(chain,{event:'halt',decision:'halt'});
  chain=r3.entries;
  const v=verifyChain(chain);
  check('chain grows and verifies',v.ok&&v.count===4,JSON.stringify({ok:v.ok,count:v.count}));
  check('seq continuous',chain.every((e,i)=>e.seq===i+1),chain.map(e=>e.seq).join(','));
}
{
  let chain=[genesis()];
  chain=append(chain,{event:'insight'}).entries;
  const tampered=JSON.parse(JSON.stringify(chain));
  tampered[1].metrics={accuracy:99};
  const v=verifyChain(tampered);
  check('tamper detected',!v.ok&&v.reason==='entry_tampered',JSON.stringify(v));
}
{
  let chain=[genesis()];
  chain=append(chain,{event:'insight'}).entries;
  const bad=[chain[0],{...chain[1],prevHash:'deadbeef'}];
  check('chain break detected',!verifyChain(bad).ok,JSON.stringify(verifyChain(bad)));
  const reorder=[chain[1],chain[0]];
  check('reorder detected',!verifyChain(reorder).ok,JSON.stringify(verifyChain(reorder)));
  const dup=[chain[0],chain[0]];
  check('duplicate seq detected',!verifyChain(dup).ok,JSON.stringify(verifyChain(dup)));
}
{
  const r=append([],{event:'nonsense'});
  check('unknown event rejected',!r.ok&&r.reason==='invalid_entry',JSON.stringify(r));
  const r2=append([],{event:'insight',metrics:{rawAnswers:['secret answer']}});
  check('metrics bounded strings',r2.ok&&r2.entry.metrics===null,JSON.stringify(r2.entry));
  const r3=append([],{event:'insight',metrics:{a:1,b:'x'.repeat(5000)}});
  check('metrics bounded length',r3.ok&&r3.entry.metrics.b.length<=120,r3.entry?.metrics?.b?.length);
}
{
  const T='2026-08-13T00:00:00Z';
  const g=genesis();
  const r=append([g],{event:'insight',timestamp:T});
  check('append preserves genesis chain',verifyChain(r.entries).ok,JSON.stringify(verifyChain(r.entries)));
  check('entry hash deterministic',append([g],{event:'insight',timestamp:T}).entry.entryHash===r.entry.entryHash,'hash differs');
}
{
  const T='2026-08-13T00:00:00Z';
  const g=genesis();
  let chain=[g];
  for(let i=0;i<12;i++)chain=append(chain,{event:'insight',timestamp:T}).entries;
  const small=append(chain,{event:'insight',metrics:{x:1},timestamp:T},{maxEntries:5});
  const v=verifyChain(small.entries);
  check('prune re-chains and verifies',v.ok&&small.entries.length===5&&small.pruned>0,JSON.stringify({ok:v.ok,count:small.entries.length,pruned:small.pruned}));
}
{
  const T='2026-08-13T00:00:00Z';
  const a=append([genesis(T)],{event:'gate_result',patchId:'p1',metrics:{blockers:0},timestamp:T});
  const b=append([genesis(T)],{event:'gate_result',patchId:'p1',metrics:{blockers:0},timestamp:T});
  check('deterministic append',a.entry.entryHash===b.entry.entryHash,'differs');
}
{
  const r=append([],{event:'halt',decision:'halt'});
  const chain=[r.entry];
  check('halt recorded and verifiable',verifyChain(chain).ok&&r.entry.event==='halt',JSON.stringify(r.entry));
}
console.log(`FIEZEL Evolution Ledger: ${pass} PASS / ${fail} FAIL`);
process.exitCode=fail?1:0;