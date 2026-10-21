(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FIEZEL_EVOLUTION_LEDGER=api;
})(typeof self!=='undefined'?self:globalThis,function(){
  'use strict';
  const crypto=typeof require==='function'?require('crypto'):self.crypto;
  const LEDGER_SCHEMA='fiezel-evolution-ledger-entry-v1';
  const EVENTS=new Set(['insight','candidate_requested','candidate_created','gate_result','canary_started','promotion_result','adoption_result','rollback','halt','config_change']);
  const DEFAULT_MAX_ENTRIES=5000;
  const sha=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
  const stable=v=>JSON.stringify(v);
  const text=v=>String(v??'').trim();
  const num=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  const bound=(v,max)=>text(v).slice(0,max);
  function sanitizeEntry(raw,prevHash){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
    const event=bound(raw.event,40);
    if(!EVENTS.has(event))return null;
    const entry={
      schema:LEDGER_SCHEMA,
      seq:Math.round(num(raw.seq,1,1e12)),
      event,
      patchId:bound(raw.patchId,160),
      insightId:bound(raw.insightId,160),
      target:bound(raw.target,160),
      decision:bound(raw.decision,40),
      metrics:null,
      prevHash:text(prevHash),
      timestamp:bound(raw.timestamp,40)||new Date().toISOString()
    };
    if(raw.metrics&&typeof raw.metrics==='object'&&!Array.isArray(raw.metrics)){
      const m={};for(const k of Object.keys(raw.metrics).slice(0,16)){const v=raw.metrics[k];if(typeof v==='number')m[bound(k,40)]=Math.round(v*1e6)/1e6;else if(typeof v==='boolean')m[bound(k,40)]=v;else if(typeof v==='string')m[bound(k,40)]=bound(v,120)}
      if(Object.keys(m).length)entry.metrics=m;
    }
    entry.entryHash=sha(stable({...entry,entryHash:undefined}));
    return entry;
  }
  function genesis(now=new Date().toISOString()){
    const entry={schema:LEDGER_SCHEMA,seq:1,event:'config_change',patchId:'',insightId:'',target:'genesis',decision:'init',metrics:{genesis:true},prevHash:'0'.repeat(64),timestamp:now};
    entry.entryHash=sha(stable({...entry,entryHash:undefined}));
    return entry;
  }
  function verifyChain(entries){
    if(!Array.isArray(entries))return{ok:false,reason:'not_array'};
    if(!entries.length)return{ok:true,reason:'empty',hash:null,count:0};
    let prev='0'.repeat(64),prevSeq=0;
    for(const e of entries){
      if(!e||e.schema!==LEDGER_SCHEMA)return{ok:false,reason:'bad_schema',at:e?.seq};
      if(e.seq!==prevSeq+1)return{ok:false,reason:'gap_or_reorder',at:e.seq,expected:prevSeq+1};
      if(e.prevHash!==prev)return{ok:false,reason:'hash_chain_break',at:e.seq};
      const h=sha(stable({...e,entryHash:undefined}));
      if(h!==e.entryHash)return{ok:false,reason:'entry_tampered',at:e.seq};
      prev=e.entryHash;prevSeq=e.seq;
    }
    return{ok:true,reason:'ok',hash:prev,count:entries.length};
  }
  function append(entries,raw,opt={}){
    const maxEntries=(opt.maxEntries===undefined||opt.maxEntries===null)?DEFAULT_MAX_ENTRIES:Math.round(num(opt.maxEntries,1,1e6));
    const chain=Array.isArray(entries)?entries:[];
    const v=verifyChain(chain);
    if(!v.ok&&chain.length)return{ok:false,reason:`chain_${v.reason}`,entry:null};
    const prevHash=chain.length?chain[chain.length-1].entryHash:'0'.repeat(64);
    const seq=chain.length?chain[chain.length-1].seq+1:1;
    const entry=sanitizeEntry({...raw,seq},prevHash);
    if(!entry)return{ok:false,reason:'invalid_entry',entry:null};
    const out=chain.concat(entry);
    if(out.length>maxEntries){
      const drop=out.length-maxEntries;
      const kept=out.slice(drop);
      const re=[];let prev='0'.repeat(64);
      for(const e of kept){const n={...e,seq:re.length+1,prevHash:prev};n.entryHash=sha(stable({...n,entryHash:undefined}));re.push(n);prev=n.entryHash}
      return{ok:true,entry,pruned:drop,entries:re};
    }
    return{ok:true,entry,pruned:0,entries:out};
  }
  return{LEDGER_SCHEMA,EVENTS,DEFAULT_MAX_ENTRIES,sha,stable,genesis,sanitizeEntry,verifyChain,append};
});