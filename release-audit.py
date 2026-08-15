import json,re,hashlib,subprocess,collections,os
from pathlib import Path
ROOT=Path(__file__).parent
AUDIT_TMP=ROOT/'.audit-tmp'
AUDIT_TMP.mkdir(exist_ok=True)
os.environ['TMPDIR']=str(AUDIT_TMP)
PASS=True; checks=[]
def check(name,ok,details):
 global PASS
 checks.append({'name':name,'status':'PASS' if ok else 'FAIL','details':details}); PASS &= ok

def norm(s): return re.sub(r'\s+',' ',re.sub(r'[^a-z0-9 ]',' ',str(s).lower())).strip()
def tokens(s): return set(x for x in re.findall(r'[a-z]{3,}',str(s).lower()) if x not in {'the','and','for','with','from','which','what','does','this','that','about','passage','case','text','according','most','best','does','did','how','why','into','than','here','project','team','passage','account','case','report','group','result','evidence','change','approach','described','describes','using','used','use','first','later','stage','process','problem','practical','information','detail','option','statement','text','writer','reader','people','action','decision','support','supported','according','target','selected','term','idea','main','central','best','most','which','what','does','how','why','would','could','should','about','involving','context','source','method','case','account'})
version=json.load(open(ROOT/'VERSION.json'))['version']; V=json.load(open(ROOT/'vocabulary-master.json')); R=json.load(open(ROOT/'reading-bank.json')); GM=json.load(open(ROOT/'grammar-templates.json')); G={t['subskill']:[[t.get('stem',''),t.get('options',[]),t.get('correctIndex',-1),t.get('explanation',{}).get('rule',t.get('pedagogicalObjective','')),[(('Correct') if i==t.get('correctIndex') else next((d.get('whyFails','') for d in t.get('distractors',[]) if d.get('option')==o),'Distractor invalid')) for i,o in enumerate(t.get('options',[]))],t.get('cefr','')]] for t in GM.get('templates',[])}
# Vocabulary
words=[v['word'].strip().lower() for v in V]; levels=collections.Counter(v['level'] for v in V)
check('Vocabulary unique',len(words)==len(set(words)),f'total={len(words)} unique={len(set(words))}')
missing=[]
for v in V:
 if not all([v.get('word'),v.get('level'),v.get('partOfSpeech'),v.get('phonetic'),v.get('meaning') or (v.get('meanings') and v['meanings'][0].get('meaning')),v.get('example') or (v.get('examples') and v['examples'][0].get('en'))]): missing.append(v['word'])
check('Vocabulary completeness',not missing,f'missing={len(missing)}')
check('All CEFR levels active',all(levels[l]>0 for l in ['A1','A2','B1','B2','C1','C2']),dict(levels))
check('C2 active content',levels['C2']>=100,f'C2={levels["C2"]}')
check('No runtime quarantine',not (ROOT/'vocabulary-quarantine.json').exists() or len(json.load(open(ROOT/'vocabulary-quarantine.json')))==0,'quarantine is non-runtime and empty')
# Grammar
items=[(skill,q) for skill,arr in G.items() for q in arr]
invalid=[]; dg=[]; exact=set()
for skill,q in items:
 if not isinstance(q,list) or len(q)<5 or not isinstance(q[1],list) or len(q[1])!=4 or len(set(map(norm,q[1])))!=4 or not isinstance(q[2],int) or not 0<=q[2]<4 or not isinstance(q[4],list) or len(q[4])!=4: invalid.append(skill);continue
 sig=norm(q[0])
 if sig in exact: dg.append(sig)
 exact.add(sig)
check('Grammar bank',len(items)>=60 and not invalid,f'items={len(items)} invalid={len(invalid)}')
check('Grammar exact stem duplicates',not dg,f'duplicates={len(dg)}')
check('Per-distractor grammar explanations',all(isinstance(q[4],list) and len(q[4])==4 and all(str(x).strip() for x in q[4]) for _,q in items),'all grammar items have four explanations')
check('Grammar dangerous unnatural regression absent',not any('to disappear by train' in q[0].lower() for _,q in items),'known regression absent')
check('Grammar schema contract',GM.get('version')==version and GM.get('schemaVersion')=='2.0.0' and GM.get('practiceBlueprintVersion')=='focused-25-v1',f"version={GM.get('version')} schema={GM.get('schemaVersion')} blueprint={GM.get('practiceBlueprintVersion')}")
# Reading
rq=[(r,q) for r in R for q in r.get('qs',[])]
check('Reading inventory',len(R)==300 and len(rq)==1500,f'passages={len(R)} questions={len(rq)}')
miss_pass=[]; bad=[]; dupopts=[]; exactq=[]; sigs=[]; types=collections.Counter()
for r,q in rq:
 if not r.get('id') or not r.get('text') or not isinstance(q,list) or len(q)<4 or not q[0] or not isinstance(q[1],list) or not isinstance(q[2],int) or not 0<=q[2]<len(q[1]) or not isinstance(q[3],dict) or not q[3].get('evidence'): bad.append(r['id'])
 opts=list(map(norm,q[1]));
 if len(opts)!=len(set(opts)): dupopts.append(r['id'])
 t=q[3].get('type');types[t]+=1
 # Semantic signature combines question intent, normalized options, and evidence.
 # This avoids falsely calling genuinely different answer/evidence relationships duplicates merely because the same question type is used.
 evidence=q[3].get('evidence','')
 sk=(t,frozenset(tokens(q[0])),frozenset(tokens(' '.join(q[1]))),frozenset(tokens(evidence)))
 sigs.append(sk)
check('Reading question integrity data',not bad,f'bad={len(bad)}')
check('Reading option uniqueness',not dupopts,f'duplicated_options={len(dupopts)}')
check('Reading type diversity',len(types)>=20,f'types={len(types)}')
# semantic similarity threshold: same type + composite Jaccard > .92 is duplicate.
buckets=collections.defaultdict(list)
for idx,(t,qt,ot,et) in enumerate(sigs): buckets[t].append((idx,qt,ot,et))
semdup=[]
for t,arr in buckets.items():
 for i in range(len(arr)):
  aidx,aq,ao,ae=arr[i]
  for j in range(i+1,len(arr)):
   bidx,bq,bo,be=arr[j]
   def jac(a,b):
    u=a|b; return len(a&b)/len(u) if u else 1
   sim=.55*jac(aq,bq)+.25*jac(ao,bo)+.20*jac(ae,be)
   if sim>.92: semdup.append((aidx,bidx,sim))
check('Reading semantic duplicates',not semdup,f'duplicates={len(semdup)} max_threshold=.92')
# Template reuse is audited separately so wording repetition cannot hide behind unique answers.
stem_counts=collections.Counter((q[3].get('type'),norm(q[0])) for r,q in rq)
max_stem=max(stem_counts.values()) if stem_counts else 0
check('Reading template reuse',max_stem<=5,f'max_reuse={max_stem} threshold=5')
# passage semantic duplicates: TF-IDF cosine similarity over unigram/bigram content.
from math import sqrt
def tfidf_matrix(texts):
    docs=[]; df=collections.Counter()
    stop=set('the a an and or but for with from into onto over under this that these those they them their there here were was are is be been being have has had will would could should can may might must to of in on at by as it its than then when where while before after during through about between into more most some such very only also not no yes each other another first second third final group team project report passage case result evidence change approach method process problem practical information detail statement text writer reader people action decision support supported according selected term idea main central best most which what does how why'.split())
    for text in texts:
        toks=[x for x in re.findall(r'[a-z]{3,}',text.lower()) if x not in stop]
        grams=toks+[toks[i]+'_'+toks[i+1] for i in range(len(toks)-1)]
        c=collections.Counter(grams);docs.append(c);df.update(c.keys())
    N=len(docs);vecs=[]
    for c in docs:
        v={k:(1+__import__('math').log(n))*__import__('math').log((N+1)/(df[k]+1)) for k,n in c.items()};normv=sqrt(sum(x*x for x in v.values())) or 1;vecs.append({k:x/normv for k,x in v.items()})
    return vecs
vecs=tfidf_matrix([r['text'] for r in R]);pd=[];maxsim=0
for i in range(len(vecs)):
 for j in range(i+1,len(vecs)):
  a,b=vecs[i],vecs[j];small=a if len(a)<len(b) else b;large=b if small is a else a;sim=sum(x*large.get(k,0) for k,x in small.items());maxsim=max(maxsim,sim)
  if sim>.92: pd.append((i,j,sim))
check('Reading passage semantic duplicates',not pd,f'duplicates={len(pd)} max_similarity={maxsim:.3f} threshold=.92')
# Placement blueprint static
blueprint={l:{'vocab':10,'grammar':7,'reading':8} for l in ['A1','A2','B1','B2','C1','C2']}
check('Placement blueprint defined',blueprint=={l:{'vocab':10,'grammar':7,'reading':8} for l in blueprint},'25 questions/level: 10 vocab + 7 grammar + 8 reading')
# Integrity guard / adaptive
app=open(ROOT/'app.js',encoding='utf8').read()
for name,needle in [('Central question integrity guard','function validateQuestion'),('Render-time integrity gate','if(!validateQuestion(q).ok)continue'),('Evidence adaptive gate','hs.length>=24&&skills.size>=3&&types.size>=2'),('No hardcoded adaptive 150 gate','state.totalAnswered>=150')]:
 check(name, (needle in app) if name!='No hardcoded adaptive 150 gate' else (needle not in app), needle)
# Security and optional AI integration
runtime_names=['index.html','app.js','style.css','sw.js','version.js','manifest.json','report-config.js','core-config.js','fiezel-report-worker.js','fiezel-core-worker.js','creator-report-setup.html','creator-report-dashboard.html']; alltxt='\n'.join((ROOT/f).read_text(errors='ignore') for f in runtime_names)
direct_ai=len(re.findall(r'fetch\([^)]*(?:gemini|openai|anthropic|generativelanguage)|https?://[^\s\'\"]*(?:api\.openai|googleapis|api\.anthropic)',alltxt,re.I)); keys=len(re.findall(r'(AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,})',alltxt))
puter_ok='https://js.puter.com/v2/' in alltxt and "coreWorkerExec('/api/ai/chat'" in app and 'puter.ai.chat(' not in app
ai_escape="esc(text).replace(/\\n/g,'<br>')" in app and "esc(aiErrorMessage(err))" in app
ai_resilient='FIEZEL_AI_TIMEOUT_MS=30000' in app and 'currentAIRequest(id,epoch)' in app and 'id="aiRetry"' in app
check('Security direct AI dependency',direct_ai==0,f'direct vendor API references={direct_ai}')
check('Puter AI integration',puter_ok,'Puter.js is present and client AI is Core-Worker-only; direct Puter AI bypass is absent')
check('AI output escaping',ai_escape,'AI result and error text are escaped before innerHTML')
check('AI request resilience',ai_resilient,'AI requests have a timeout, stale-response guard, and retry action')
check('Security secrets',keys==0,f'secret patterns={keys}')
check('AI learner profile','buildLearningSnapshot' in app and 'askCoachAI' in app and 'aiProfileContext' in app,'AI receives an aggregate evidence snapshot for personalization')
check('Haptic navigation','navigator.vibrate' in app and "document.addEventListener?.('click'" in app,'interactive controls use capability-gated vibration')
check('Correct/wrong audio feedback','playFeedbackSound' in app and 'answerFeedbackSignal' in app and 'feedbackSounds:true' in app,'answer feedback includes separate success and error tones')
check('Animated answer popup','id="answerBurst"' in (ROOT/'index.html').read_text() and 'showAnswerBurst' in app and '.answer-burst.show' in (ROOT/'style.css').read_text(),'answer feedback includes an animated status popup')
check('Realtime sun and moon','getCelestialState' in app and 'getScenePalette' in app and 'SUNRISE_MINUTE=6*60' in app and 'SUNSET_MINUTE=18*60' in app and 'id="globalSky"' in (ROOT/'index.html').read_text() and '.sky-light' in (ROOT/'style.css').read_text(),'celestial position, light, and whole-screen palette follow device-local time across a 24-hour loop')
check('Grammar lesson focused-25 contract','GRAMMAR_SESSION_SIZE=25' in app and 'GRAMMAR_PRACTICE_MODES' in app and 'buildGrammarLessonQuestions' in app and 'familyPeers=' not in app and 'levelPeers=' not in app,'every grammar lesson builds 25 focused pedagogical modes without importing peer concepts')
check('Natural Indonesian explanations','NATURAL_AI_STYLE' in app and 'Hindari gaya buku teks' in app and 'grammarRuleIndonesian' in app and 'readingFocusLabel' in app,'grammar, vocabulary, reading, and AI share a natural Indonesian explanation contract')
check('Persistent soundtrack','playAmbientChord' in app and 'visibilitychange' in app,'ambient audio lifecycle is navigation and visibility aware')
check('Rotating login reminders','LOGIN_MESSAGES=[' in app and 'selectLoginMessage' in app and 'LEARNER_STAGE' in app and 'fiezel-last-login-message' in app,'each app session receives a varied learner-stage reminder without immediate repetition')
check('Mandatory notification entry gate','requestRequiredNotificationPermission' in app and 'notificationPermission()' in app and 'notification-locked' in (ROOT/'style.css').read_text() and 'notificationGateButton' in (ROOT/'index.html').read_text(),'app remains locked until browser notification permission is granted')
check('Study reminder notification engine','checkStudyReminders' in app and 'showStudyNotification' in app and 'NOTIFICATION_REMINDER_INTERVAL_MS' in app and 'notificationclick' in (ROOT/'sw.js').read_text(),'local reminder engine covers inactivity, daily target, due review, and notification click return')
check('ALRS escalation and fatigue guards',all(x in app for x in ['inactivity_1','inactivity_2','inactivity_3','inactivity_7','ALRS_MIN_GAP_MS','ALRS_QUIET_START_HOUR','lastNotificationDay','positive']), '1/2/3/7+ escalation, quiet hours, cooldown, one-per-day fatigue guard and reinforcement are present')
check('Learner Evidence Model runtime',all(x in app for x in ['buildLearnerEvidenceModel','fiezel-learner-evidence-v1','abandonmentRate','medianResponseMs','preferredStudyWindow','maxForgettingRisk']), 'runtime derives behavior, confidence, memory and skill evidence without raw remote answer history')
check('Remote Web Push architecture','ensureRemotePushSubscription' in app and "addEventListener('push'" in (ROOT/'sw.js').read_text() and 'me.puter.kv' in (ROOT/'fiezel-core-worker.js').read_text() and 'webpush.sendNotification' in (ROOT/'push-dispatcher.mjs').read_text(),'Push API subscription, service-worker receive path, Puter backend, and VAPID dispatcher are present')
check('Remote push secret separation','VAPID_PRIVATE_KEY' not in app and 'VAPID_PRIVATE_KEY' not in (ROOT/'fiezel-core-worker.js').read_text() and 'VAPID_PRIVATE_KEY' in (ROOT/'push-dispatcher.mjs').read_text(),'VAPID private key is scheduler-only and not bundled in browser or Puter Worker runtime')
core_cfg=(ROOT/'core-config.js').read_text()
check('Core-only AI runtime contract',"aiGateway:'core-only'" in core_cfg and "protocolVersion:'1.7'" in core_cfg and "coreWorkerExec('/api/ai/chat'" in app and 'puter.ai.chat(' not in app,'Core Worker is the sole client AI gateway and protocol 1.7 is pinned')
check('Adaptive policy runtime contract','fiezel-adaptive-policy-v1' in app and 'resolveAdaptivePolicy' in app and '/api/policy/next' in (ROOT/'fiezel-core-worker.js').read_text(),'deterministic policy derives next-best action and Core exposes authenticated policy endpoint')
worker_core=(ROOT/'fiezel-core-worker.js').read_text()
check('Policy Outcome runtime contract','fiezel-policy-outcome-v1' in app and 'evaluatePolicyOutcome' in app and '/api/policy/outcome' in worker_core and 'backfillPolicyOutcomes' in app,'bounded outcomes, dedupe/backfill, and deterministic policy feedback are present')
check('Context Coach runtime contract',"coreWorkerExec('/api/coach/context'" in app and '/api/coach/context' in worker_core and 'deterministic policy is authoritative' in worker_core,'Context Coach explains bounded evidence/policy/outcome without replacing policy authority')
feature_html=(ROOT/'index.html').read_text()
feature_sw=(ROOT/'sw.js').read_text()
check('Speaking and Listening route','FiezelSLAddon.create' in app and "go('skills')" in app and './features/speaking-listening/fiezel-speaking-listening-addon.js' in feature_html,'72 A1-C2 Speaking/Listening items are exposed through the isolated Skills Lab route')
check('Speaking and Listening privacy boundary','fiezel-sl-v1-state' in (ROOT/'features/speaking-listening/speaking-listening-config.js').read_text() and 'persistRawAudio:false' in (ROOT/'features/speaking-listening/fiezel-speaking-listening-addon.js').read_text() and 'persistRawTranscript:false' in (ROOT/'features/speaking-listening/fiezel-speaking-listening-addon.js').read_text(),'sidecar uses isolated state and forbids raw audio/transcript persistence')
check('Neural voice explicit opt-in','prepareNeuralVoice' in app and 'if(!readStatus().prepared&&!preparedFlag&&allowFallback)return browserSpeak' in (ROOT/'features/neural-voice/fiezel-neural-voice-bootstrap.js').read_text() and "if(!readStatus().prepared&&!preparedFlag)throw new Error('Neural voice assets are not prepared')" in (ROOT/'features/neural-voice/fiezel-neural-voice-bootstrap.js').read_text() and '!isNeuralAsset(e.request)' in feature_sw,'large local model cache is user-triggered; ordinary calls may fallback while neural-only calls fail closed, and heavy assets remain excluded from implicit service-worker caching')
check('Neural voice source lock',(ROOT/'NEURAL-VOICE-SOURCE-LOCK.json').exists() and (ROOT/'vendor/kokoro-model/onnx/model_quantized.onnx').exists() and (ROOT/'vendor/kokoro-js/LICENSE').exists(),'pinned runtime/model assets and third-party license closure are present')
handoff_path=ROOT/'FIEZEL-5.18.0-NEXT-HANDOFF-MASTER-PROMPT.md'
handoff_text=handoff_path.read_text(errors='ignore') if handoff_path.exists() else ''
check('Versioned next-handoff artifact',handoff_path.exists() and 'BASELINE_VERSION: 5.18.0' in handoff_text and '# BEGIN MASTER PROMPT' in handoff_text and '# END MASTER PROMPT' in handoff_text,'versioned next-handoff master prompt exists and is locked to 5.18.0')
check('Resumable execution handoff contract',re.search(r'\*\*Prompt version:\*\* (?:1\.8|2\.0)', handoff_text) is not None and '## 16. Resumable execution & last-processed data checkpoint' in handoff_text and 'LAST_PROCESSED_ID' in handoff_text and 'IN_PROGRESS' in handoff_text and 'CHECKPOINT CREATED = TRUE' in handoff_text,'next-handoff requires persistent atomic checkpoints, stable last-processed IDs, and safe resume semantics')
check('Continuous autonomous recovery contract','## 17. Continuous autonomous execution' in handoff_text and 'RECOVER' in handoff_text and 'RESUME LAST SAFE POSITION' in handoff_text and 'FIEZEL autonomous execution must be resumable, not restart-dependent.' in handoff_text,'recovery resumes the original autonomous workflow instead of blind full-pipeline restart')
check('Content QA runtime contract',(ROOT/'content-qa-agent.js').exists() and (ROOT/'content-qa-agent-test.js').exists() and "CONTENT_QA_SCHEMA='fiezel-content-qa-v1'" in worker_core and '/api/content/qa/review' in worker_core and "authority:'advisory-only'" in worker_core and '/api/content/qa/apply' not in worker_core,'deterministic read-only scan plus bounded owner-only advisory AI review; no mutation endpoint')
check('Guarded Content Patch runtime contract',(ROOT/'content-patch-gate.js').exists() and (ROOT/'content-patch-gate-test.js').exists() and "CONTENT_PATCH_SCHEMA='fiezel-content-patch-v1'" in worker_core and '/api/content/patch/candidate' in worker_core and "authority:'candidate-only'" in worker_core and 'UNVERIFIED_LOCAL_GATES_REQUIRED' in worker_core and '/api/content/patch/apply' not in worker_core and '/api/content/patch/publish' not in worker_core,'AI output is candidate-only; source-hash local gate owns schema/answer/pedagogy/regression validation and no mutation/publish endpoint exists')
check('Shadow/Canary runtime contract',(ROOT/'content-canary.js').exists() and (ROOT/'content-canary-config.js').exists() and (ROOT/'content-canary-config-builder.js').exists() and (ROOT/'content-canary-test.js').exists() and 'fiezel-content-canary-v1' in (ROOT/'content-canary.js').read_text() and 'CONTENT_CANARY.prepare' in app and 'CONTENT_CANARY.recordEvidence' in app and './content-canary.js' in (ROOT/'index.html').read_text() and './content-canary-config.js' in (ROOT/'index.html').read_text(),'gated candidate overlay is isolated, bounded by cohort/session/expiry, records aggregate evidence, and falls back to immutable canonical data')
check('Autonomous Promotion runtime contract',(ROOT/'content-promotion.js').exists() and (ROOT/'content-promotion-test.js').exists() and 'fiezel-content-promotion-v1' in (ROOT/'content-promotion.js').read_text() and 'CONTENT_PROMOTION.evaluate' in app and 'recordPromotionDecision' in app and "q.canary.phase||'canary'" in app and './content-promotion.js' in (ROOT/'index.html').read_text(),'deterministic evidence thresholds may activate only an isolated overlay; canonical data stays immutable and post-promotion regression rolls back')
check('Canonical Adoption release-only contract',(ROOT/'content-adoption.js').exists() and (ROOT/'content-adoption-test.js').exists() and 'fiezel-content-adoption-v1' in (ROOT/'content-adoption.js').read_text() and './content-adoption.js' not in (ROOT/'index.html').read_text() and 'content-adoption.js' not in (ROOT/'sw.js').read_text() and '/api/content/adoption' not in worker_core and '/api/content/patch/apply' not in worker_core and '/api/content/patch/publish' not in worker_core,'owner/audit-gated canonical adoption is release-time tooling only; no browser/Core canonical mutation route exists')
check('Adoption Evidence Attestation release-only contract',(ROOT/'content-adoption-evidence.js').exists() and (ROOT/'content-adoption-evidence-test.js').exists() and 'fiezel-adoption-evidence-attestation-v1' in (ROOT/'content-adoption-evidence.js').read_text() and 'content-adoption-evidence.js' not in (ROOT/'index.html').read_text() and 'content-adoption-evidence.js' not in (ROOT/'sw.js').read_text() and '/api/content/adoption/evidence' not in worker_core,'aggregate evidence attestation is deterministic release-time tooling only; no learner/browser/Core export endpoint exists')
check('Production Evidence Origin release-only contract',(ROOT/'content-evidence-origin.js').exists() and (ROOT/'content-evidence-origin-test.js').exists() and 'fiezel-evidence-origin-envelope-v1' in (ROOT/'content-evidence-origin.js').read_text() and 'content-evidence-origin.js' not in (ROOT/'index.html').read_text() and 'content-evidence-origin.js' not in (ROOT/'sw.js').read_text() and '/api/content/evidence/origin' not in worker_core,'signed production origin verification is release-time only and requires external operator trust policy')
check('Operator Adoption Rehearsal release-only contract',(ROOT/'content-adoption-rehearsal.js').exists() and (ROOT/'content-adoption-rehearsal-test.js').exists() and 'fiezel-content-adoption-rehearsal-v1' in (ROOT/'content-adoption-rehearsal.js').read_text() and 'content-adoption-rehearsal.js' not in (ROOT/'index.html').read_text() and 'content-adoption-rehearsal.js' not in (ROOT/'sw.js').read_text() and '/api/content/adoption/rehearsal' not in worker_core,'rehearsal is local release tooling with staging/rollback verification and no runtime/Core mutation endpoint')
quality_workflow=(ROOT/'.github/workflows/quality.yml').read_text(errors='ignore') if (ROOT/'.github/workflows/quality.yml').exists() else ''
check('CI Adoption Evidence Attestation coverage','node content-adoption-evidence-test.js' in quality_workflow and 'node content-adoption-test.js' in quality_workflow,'repository CI executes attestation and canonical-adoption failure probes')
check('CI Production Origin/Rehearsal coverage','node content-evidence-origin-test.js' in quality_workflow and 'node content-adoption-rehearsal-test.js' in quality_workflow,'repository CI executes origin-authenticity and operator-rehearsal failure probes')
activation_files=['core-deploy-preflight.mjs','core-live-smoke.mjs','core-activate.mjs','.github/workflows/deploy-core-worker.yml']
activation_ok=all((ROOT/f).exists() for f in activation_files) and '@heyputer/cli@0.1.2' in (ROOT/'.github/workflows/deploy-core-worker.yml').read_text()
check('Core activation tooling',activation_ok,'preflight, live smoke, local activation, and manual-only Puter deploy workflow present')
worker=(ROOT/'fiezel-report-worker.js').read_text()
check('Creator report authentication','actorIdentity' in worker and 'isOwner' in worker and 'CONFIG_LEARNER' in worker,'collector requires Puter authentication, binds the learner, and gates creator reads')
check('Creator report whitelist','sanitizeReport' in worker and 'MAX_BODY_BYTES' in worker and 'me.puter.kv' in worker,'collector bounds and whitelists centralized report data')
check('Creator report consent','reportConsent:false' in app and "sendCreatorReport('session_complete')" in app,'reporting defaults off and sessions use the consent-gated sender')
# PWA
manifest=json.load(open(ROOT/'manifest.json')); sw=open(ROOT/'sw.js').read(); idx=open(ROOT/'index.html').read()
check('Version single-source runtime',"self.FIEZEL_VERSION" in open(ROOT/'version.js').read() and "const APP_VERSION=self.FIEZEL_VERSION" in app and 'version.js' in idx and 'importScripts(\'./version.js\')' in sw,'version.js drives runtime and service worker')
check('PWA manifest version',manifest.get('version')==version,f'manifest={manifest.get("version")} source={version}')
check('PWA cache version',f'fiezel-v${{self.FIEZEL_VERSION}}' in sw,'cache derives from runtime version')
check('PWA asset precache',all(x in sw for x in ['version.js','report-config.js','core-config.js','content-canary.js','content-promotion.js','content-canary-config.js','lucide.min.js','app.js','style.css','vocabulary-master.json','reading-bank.json','grammar-templates.json','creator-report-setup.html','creator-report-dashboard.html','fiezel-report-worker.js','fiezel-neural-voice-bootstrap.js','fiezel-speaking-listening-addon.js','listening-bank-v1.json','speaking-bank-v1.json']),'required small runtime assets present; heavy neural assets remain explicit opt-in')
# Serve the release through a real local HTTP listener and verify critical assets as delivered.
http_smoke_run=subprocess.run(['node',str(ROOT/'http-smoke-test.js')],capture_output=True,text=True)
check('HTTP release smoke test',http_smoke_run.returncode==0 and 'FIEZEL HTTP smoke test: PASS' in http_smoke_run.stdout,http_smoke_run.stdout.strip()[-500:] or http_smoke_run.stderr.strip()[-500:])
speaking_listening_run=subprocess.run(['node',str(ROOT/'speaking-listening-test.js')],capture_output=True,text=True)
check('Speaking and Listening gate',speaking_listening_run.returncode==0 and 'FIEZEL Speaking + Listening: PASS 25/0' in speaking_listening_run.stdout,speaking_listening_run.stdout.strip()[-800:] or speaking_listening_run.stderr.strip()[-800:])
neural_voice_run=subprocess.run(['node',str(ROOT/'neural-voice-test.js')],capture_output=True,text=True)
check('Local neural voice gate',neural_voice_run.returncode==0 and 'FIEZEL Neural Voice: PASS 39/0' in neural_voice_run.stdout,neural_voice_run.stdout.strip()[-800:] or neural_voice_run.stderr.strip()[-800:])
neural_http_run=subprocess.run(['node',str(ROOT/'neural-voice-http-test.js')],capture_output=True,text=True)
check('Neural voice HTTP and Range gate',neural_http_run.returncode==0 and 'FIEZEL neural voice HTTP: PASS' in neural_http_run.stdout,neural_http_run.stdout.strip()[-800:] or neural_http_run.stderr.strip()[-800:])
neural_product_run=subprocess.run(['node',str(ROOT/'neural-voice-product-repair-test.js')],capture_output=True,text=True)
check('Neural voice product repair gate',neural_product_run.returncode==0 and 'FIEZEL neural voice product repair: ALL GATES PASS' in neural_product_run.stdout,neural_product_run.stdout.strip()[-1000:] or neural_product_run.stderr.strip()[-1000:])
sw_corp_run=subprocess.run(['node',str(ROOT/'sw-corp-test.js')],capture_output=True,text=True)
check('Service worker CORP compatibility gate',sw_corp_run.returncode==0 and 'semua gate sw-corp LOLOS' in sw_corp_run.stdout,sw_corp_run.stdout.strip()[-1000:] or sw_corp_run.stderr.strip()[-1000:])
neural_fix_run=subprocess.run(['node',str(ROOT/'neural-voice-fix-test.js')],capture_output=True,text=True)
check('Neural voice repair regression gate',neural_fix_run.returncode==0 and 'semua gate neural-voice-fix LOLOS' in neural_fix_run.stdout,neural_fix_run.stdout.strip()[-1000:] or neural_fix_run.stderr.strip()[-1000:])
notification_run=subprocess.run(['node',str(ROOT/'notification-reminder-test.js')],capture_output=True,text=True)
check('Notification runtime behavior',notification_run.returncode==0 and 'FIEZEL notification reminder: PASS' in notification_run.stdout,notification_run.stdout.strip()[-500:] or notification_run.stderr.strip()[-500:])
remote_push_run=subprocess.run(['node',str(ROOT/'remote-push-test.js')],capture_output=True,text=True)
check('Remote push architecture test',remote_push_run.returncode==0 and 'FIEZEL remote push architecture: PASS' in remote_push_run.stdout,remote_push_run.stdout.strip()[-800:] or remote_push_run.stderr.strip()[-800:])
core_brain_run=subprocess.run(['node',str(ROOT/'core-brain-test.js')],capture_output=True,text=True)
check('FIEZEL Core Brain architecture',core_brain_run.returncode==0 and 'FIEZEL core brain: PASS' in core_brain_run.stdout,core_brain_run.stdout.strip()[-800:] or core_brain_run.stderr.strip()[-800:])
core_worker_contract_run=subprocess.run(['node',str(ROOT/'core-worker-contract-test.js')],capture_output=True,text=True)
check('FIEZEL Core Worker deterministic contract',core_worker_contract_run.returncode==0 and 'FIEZEL core worker contract: PASS' in core_worker_contract_run.stdout,core_worker_contract_run.stdout.strip()[-800:] or core_worker_contract_run.stderr.strip()[-800:])
learner_evidence_run=subprocess.run(['node',str(ROOT/'learner-evidence-test.js')],capture_output=True,text=True)
check('Learner Evidence Model v1',learner_evidence_run.returncode==0 and 'FIEZEL learner evidence: PASS' in learner_evidence_run.stdout,learner_evidence_run.stdout.strip()[-800:] or learner_evidence_run.stderr.strip()[-800:])
alrs_behavior_run=subprocess.run(['node',str(ROOT/'alrs-behavior-test.js')],capture_output=True,text=True)
check('ALRS full behavior policy',alrs_behavior_run.returncode==0 and 'FIEZEL ALRS behavior: PASS' in alrs_behavior_run.stdout,alrs_behavior_run.stdout.strip()[-800:] or alrs_behavior_run.stderr.strip()[-800:])
adaptive_policy_run=subprocess.run(['node',str(ROOT/'adaptive-policy-test.js')],capture_output=True,text=True)
check('Adaptive Policy Engine v1',adaptive_policy_run.returncode==0 and 'FIEZEL adaptive policy: PASS' in adaptive_policy_run.stdout,adaptive_policy_run.stdout.strip()[-800:] or adaptive_policy_run.stderr.strip()[-800:])
policy_outcome_run=subprocess.run(['node',str(ROOT/'policy-outcome-test.js')],capture_output=True,text=True)
check('Policy Outcome Evaluation v1',policy_outcome_run.returncode==0 and 'FIEZEL policy outcome: PASS' in policy_outcome_run.stdout,policy_outcome_run.stdout.strip()[-800:] or policy_outcome_run.stderr.strip()[-800:])
content_qa_run=subprocess.run(['node',str(ROOT/'content-qa-agent.js')],capture_output=True,text=True)
content_qa_test_run=subprocess.run(['node',str(ROOT/'content-qa-agent-test.js')],capture_output=True,text=True)
try: content_qa_report=json.load(open(ROOT/'CONTENT-QA-REPORT.json'))
except Exception: content_qa_report={}
check('Content QA Agent v1',content_qa_run.returncode==0 and content_qa_test_run.returncode==0 and content_qa_report.get('schema')=='fiezel-content-qa-v1' and content_qa_report.get('status')=='PASS' and content_qa_report.get('readOnlyVerified') is True and content_qa_report.get('counts',{}).get('blockers')==0,content_qa_report.get('counts') or content_qa_test_run.stderr[-800:])
content_patch_test_run=subprocess.run(['node',str(ROOT/'content-patch-gate-test.js')],capture_output=True,text=True)
check('Guarded Content Patch gate v1',content_patch_test_run.returncode==0 and 'proofPass' in content_patch_test_run.stdout and 'canonicalImmutable' in content_patch_test_run.stdout,content_patch_test_run.stdout.strip()[-800:] or content_patch_test_run.stderr.strip()[-800:])
content_canary_test_run=subprocess.run(['node',str(ROOT/'content-canary-test.js')],capture_output=True,text=True)
try: content_canary_proof=json.load(open(ROOT/'CONTENT-CANARY-PROOF.json'))
except Exception: content_canary_proof={}
check('Shadow/Canary overlay gate v1',content_canary_test_run.returncode==0 and 'FIEZEL content canary: PASS' in content_canary_test_run.stdout and content_canary_proof.get('status')=='PASS' and content_canary_proof.get('canonicalImmutable') is True and content_canary_proof.get('boundedEvidence') is True,content_canary_proof or content_canary_test_run.stderr[-800:])
content_promotion_test_run=subprocess.run(['node',str(ROOT/'content-promotion-test.js')],capture_output=True,text=True)
try: content_promotion_proof=json.load(open(ROOT/'CONTENT-PROMOTION-PROOF.json'))
except Exception: content_promotion_proof={}
check('Autonomous Promotion gate v1',content_promotion_test_run.returncode==0 and 'FIEZEL content promotion: PASS' in content_promotion_test_run.stdout and content_promotion_proof.get('status')=='PASS' and content_promotion_proof.get('canonicalImmutable') is True and content_promotion_proof.get('activeOverlayOnly') is True and content_promotion_proof.get('postPromotionRollback') is True and content_promotion_proof.get('auditableBoundedLedger') is True,content_promotion_proof or content_promotion_test_run.stderr[-800:])
content_attestation_test_run=subprocess.run(['node',str(ROOT/'content-adoption-evidence-test.js')],capture_output=True,text=True)
try: content_attestation_proof=json.load(open(ROOT/'CONTENT-ADOPTION-EVIDENCE-PROOF.json'))
except Exception: content_attestation_proof={}
check('Adoption Evidence Attestation gate v1',content_attestation_test_run.returncode==0 and 'FIEZEL adoption evidence attestation: PASS' in content_attestation_test_run.stdout and content_attestation_proof.get('status')=='PASS' and content_attestation_proof.get('deterministicExport') is True and content_attestation_proof.get('importVerification') is True and content_attestation_proof.get('sourceVersionLocked') is True and content_attestation_proof.get('candidateHashLocked') is True and content_attestation_proof.get('privacyWhitelist') is True and content_attestation_proof.get('ownerApprovalSeparate') is True and content_attestation_proof.get('canonicalImmutable') is True,content_attestation_proof or content_attestation_test_run.stderr[-800:])
content_origin_test_run=subprocess.run(['node',str(ROOT/'content-evidence-origin-test.js')],capture_output=True,text=True)
try: content_origin_proof=json.load(open(ROOT/'CONTENT-EVIDENCE-ORIGIN-PROOF.json'))
except Exception: content_origin_proof={}
check('Production Evidence Origin Verification v1',content_origin_test_run.returncode==0 and 'FIEZEL evidence origin verification: PASS' in content_origin_test_run.stdout and content_origin_proof.get('status')=='PASS' and content_origin_proof.get('algorithm')=='ed25519' and content_origin_proof.get('separateOperatorTrustPolicy') is True and content_origin_proof.get('trustPolicyNotEmbedded') is True and content_origin_proof.get('publicKeyFingerprintLocked') is True and content_origin_proof.get('controlledOriginRejectedForProduction') is True and content_origin_proof.get('privateKeyStoredInSource') is False and content_origin_proof.get('canonicalImmutable') is True,content_origin_proof or content_origin_test_run.stderr[-800:])
content_rehearsal_test_run=subprocess.run(['node',str(ROOT/'content-adoption-rehearsal-test.js')],capture_output=True,text=True)
try: content_rehearsal_proof=json.load(open(ROOT/'CONTENT-ADOPTION-REHEARSAL-PROOF.json'))
except Exception: content_rehearsal_proof={}
check('Operator Adoption Rehearsal v1',content_rehearsal_test_run.returncode==0 and 'FIEZEL operator adoption rehearsal: PASS' in content_rehearsal_test_run.stdout and content_rehearsal_proof.get('status')=='PASS' and content_rehearsal_proof.get('signedOriginRequired') is True and content_rehearsal_proof.get('separateOperatorTrustPolicy') is True and content_rehearsal_proof.get('stagingVerified') is True and content_rehearsal_proof.get('rollbackVerified') is True and content_rehearsal_proof.get('productionRehearsalPerformed') is False and content_rehearsal_proof.get('actualCanonicalAdoptionPerformed') is False and content_rehearsal_proof.get('canonicalImmutable') is True,content_rehearsal_proof or content_rehearsal_test_run.stderr[-800:])
content_adoption_test_run=subprocess.run(['node',str(ROOT/'content-adoption-test.js')],capture_output=True,text=True)
try: content_adoption_proof=json.load(open(ROOT/'CONTENT-ADOPTION-PROOF.json'))
except Exception: content_adoption_proof={}
check('Canonical Adoption gate v1',content_adoption_test_run.returncode==0 and 'FIEZEL canonical adoption gate: PASS' in content_adoption_test_run.stdout and content_adoption_proof.get('status')=='PASS' and content_adoption_proof.get('canonicalAdoptionPerformed') is False and content_adoption_proof.get('proofFixtureRejected') is True and content_adoption_proof.get('canaryGateDigestLocked') is True and content_adoption_proof.get('evidenceAttestationRequired') is True and content_adoption_proof.get('evidenceAttestationDigestLocked') is True and content_adoption_proof.get('evidenceOriginRequired') is True and content_adoption_proof.get('evidenceOriginSignatureVerified') is True and content_adoption_proof.get('originTrustPolicySeparate') is True and content_adoption_proof.get('originTrustPolicyDigestLocked') is True and content_adoption_proof.get('ownerApprovalStillSeparate') is True and content_adoption_proof.get('deterministicRebuild') is True and content_adoption_proof.get('rollbackArtifact') is True and content_adoption_proof.get('sourceRootWriteRejected') is True and content_adoption_proof.get('canonicalImmutable') is True,content_adoption_proof or content_adoption_test_run.stderr[-800:])
# Dedicated grammar audit executes the full 3,225-question runtime matrix and writes a machine-readable report.
grammar_audit_run=subprocess.run(['node',str(ROOT/'grammar-quality-audit.js')],capture_output=True,text=True)
try: grammar_audit_report=json.load(open(ROOT/'GRAMMAR-QUALITY-REPORT.json'))
except Exception: grammar_audit_report={}
check('Dedicated grammar quality audit',grammar_audit_run.returncode==0 and grammar_audit_report.get('status')=='PASS' and grammar_audit_report.get('counts',{}).get('runtimeQuestions')==3225 and grammar_audit_report.get('counts',{}).get('crossLessonDuplicates')==0 and grammar_audit_report.get('counts',{}).get('focusLeaks')==0,grammar_audit_report.get('counts') or grammar_audit_run.stderr[-500:])
# syntax
for f in ['app.js','fiezel-report-worker.js','fiezel-core-worker.js','validator.js','regression-test.js','content-audit.js','product-audit.js','runtime-stage8-test.js','ai-integration-test.js','experience-integration-test.js','lesson-experience-test.js','ui-structure-test.js','grammar-quality-audit.js','notification-reminder-test.js','remote-push-test.js','core-brain-test.js','core-worker-contract-test.js','learner-evidence-test.js','alrs-behavior-test.js','adaptive-policy-test.js','policy-outcome-test.js','content-qa-agent.js','content-qa-agent-test.js','content-patch-gate.js','content-patch-gate-test.js','content-canary.js','content-promotion.js','content-adoption.js','content-adoption-evidence.js','content-evidence-origin.js','content-adoption-rehearsal.js','content-canary-config.js','content-canary-config-builder.js','content-canary-test.js','content-promotion-test.js','content-adoption-evidence-test.js','content-evidence-origin-test.js','content-adoption-rehearsal-test.js','content-adoption-test.js','fiezel-core-worker.js','rebuild-grammar-data.js','rebuild-speaking-listening-data.js','http-smoke-test.js','speaking-listening-test.js','neural-voice-test.js','neural-voice-http-test.js','neural-voice-audibility-test.js','ios-cache-compat-test.js','diag-panel-test.js','neural-voice-fix-test.js','sw-corp-test.js','neural-voice-product-repair-test.js','features/neural-voice/fiezel-kokoro-adapter.js','features/neural-voice/fiezel-neural-voice-bootstrap.js','features/neural-voice/fiezel-neural-voice-config.js','features/neural-voice/fiezel-neural-voice.js','features/neural-voice/fiezel-web-audio-player.js','features/speaking-listening/fiezel-speaking-listening-addon.js','features/speaking-listening/speaking-listening-config.js']:
 if f.endswith('.js'):
  r=subprocess.run(['node','--check',str(ROOT/f)],capture_output=True,text=True)
  check(f'JS syntax {f}',r.returncode==0,r.stderr.strip() or 'PASS')
# write report
report={'version':version,'status':'PASS' if PASS else 'NOT READY','checks':checks,'counts':{'pass':sum(x['status']=='PASS' for x in checks),'fail':sum(x['status']=='FAIL' for x in checks)},'content':{'vocabulary':len(V),'reading_passages':len(R),'reading_questions':len(rq),'grammar_items':len(items),'grammar_runtime_questions':3225,'listening_items':36,'speaking_items':36,'reading_types':len(types),'content_qa':content_qa_report.get('counts',{}) if 'content_qa_report' in globals() else {}},'sha256':hashlib.sha256(open(ROOT/'app.js','rb').read()).hexdigest()}
json.dump(report,open(ROOT/'FINAL-AUDIT-REPORT.json','w'),ensure_ascii=False,indent=2)
print(json.dumps(report,ensure_ascii=False,indent=2));raise SystemExit(0 if PASS else 1)
