require('./app-report-control-path-test.js');
const fs=require('fs'),path=require('path');
const root=__dirname;
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const app=read('app.js'),css=read('style.css'),html=read('index.html'),worker=read('fiezel-report-worker.js'),setup=read('creator-report-setup.html'),dashboard=read('creator-report-dashboard.html');
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};

check(html.includes('./lucide.min.js')&&html.indexOf('./lucide.min.js')<html.indexOf('./app.js'),'Lucide must load locally before app.js');
check(/function buildLearningSnapshot/.test(app)&&/function askCoachAI/.test(app)&&/aiProfileContext/.test(app),'AI skill-profile pipeline missing');
check(/function haptic/.test(app)&&/navigator\.vibrate/.test(app)&&/document\.addEventListener\?\.\('click'/.test(app),'Global haptic system missing');
check(/function playFeedbackSound/.test(app)&&/function answerFeedbackSignal/.test(app)&&/feedbackSounds:true/.test(app),'Correct/wrong answer sound feedback missing');
check(/id="answerBurst"/.test(html)&&/\.answer-burst/.test(css)&&/circle-check-big/.test(app)&&/circle-x/.test(app),'Animated answer popup missing');
check(/document\.startViewTransition/.test(app)&&/\.reduce-motion \*/.test(css),'Motion system or reduced-motion control missing');
check(/launcher-shell/.test(app)&&/launcher-shell/.test(css)&&/coach-preview/.test(css),'Premium launcher surface missing');
check(/VALID_VIEWS=new Set\(\['home','vocab','grammar','reading','skills'/.test(app)&&/FiezelSLAddon\.create/.test(app)&&/speakingListeningController\.destroy/.test(app),'Skills Lab route or lifecycle cleanup missing');
check(/prepareNeuralVoice/.test(app)&&/FiezelVoiceRuntime\.speak/.test(app)&&/Siapkan suara offline/.test(app),'Explicit local neural voice opt-in or runtime routing missing');
check(html.includes('./features/speaking-listening/speaking-listening-addon.css')&&html.includes('./features/neural-voice/fiezel-neural-voice-bootstrap.js'),'Feature assets are not wired into the document');
check(/LOGIN_MESSAGES=\[/.test(app)&&/selectLoginMessage/.test(app)&&/fiezel-last-login-message/.test(app)&&/LEARNER_STAGE/.test(app),'Rotating learner-stage login reminders missing');
check(/requestRequiredNotificationPermission/.test(app)&&/notificationPermission\(\)/.test(app)&&/notification-locked/.test(css)&&/id="notificationGateButton"/.test(html),'Mandatory notification permission gate missing');
check(/checkStudyReminders/.test(app)&&/showStudyNotification/.test(app)&&/NOTIFICATION_REMINDER_INTERVAL_MS/.test(app)&&/notificationclick/.test(read('sw.js')),'Study reminder notification engine missing');
check(/function getCelestialState/.test(app)&&/function getScenePalette/.test(app)&&/SUNRISE_MINUTE/.test(app)&&/global-sky/.test(css)&&/sky-light/.test(css)&&/id="globalSky"/.test(html),'Full-screen real-time sun/moon cycle missing');
check(/GRAMMAR_SESSION_SIZE=25/.test(app)&&/function buildGrammarLessonQuestions/.test(app)&&/count:GRAMMAR_SESSION_SIZE/.test(app),'Grammar lesson contract is not fixed at 25 questions');
check(/NATURAL_AI_STYLE/.test(app)&&/Hindari gaya buku teks/.test(app)&&/readingFocusLabel/.test(app),'Natural Indonesian explanation contract missing');
check(/function buildCreatorReport/.test(app)&&/session_complete/.test(app)&&/daily_access/.test(app),'Automatic access/session reporting missing');
check(/queueCreatorReport/.test(app)&&/flushReportQueue/.test(app),'Report retry queue missing');
check(/reportConsent:false/.test(app)&&/openReportPreview/.test(app),'Explicit reporting consent/privacy preview missing');
check(/hostname\.endsWith\('\.puter\.work'\)/.test(app),'Report endpoint is not restricted to HTTPS Puter Workers');
check(/sanitizeReport/.test(worker)&&/weakSkills:Array\.isArray/.test(worker)&&/MAX_BODY_BYTES/.test(worker),'Worker report whitelist or size validation missing');
check(/CONFIG_LEARNER/.test(worker)&&/boundIds/.test(worker)&&/caller\.identifiers/.test(worker),'Worker is not bound to the first learner account');
check(/isOwner/.test(worker)&&/Creator account required/.test(worker)&&/me\.puter\.kv/.test(worker),'Owner-only centralized report storage missing');
check(/puter\.workers\.create/.test(setup)&&/puter\.fs\.write/.test(setup),'One-click Worker deployment missing');
check(/puter\.workers\.exec/.test(dashboard)&&/fiezel-jahran-report\.csv/.test(dashboard),'Creator dashboard or CSV export missing');

const runtime=[html,app,worker,setup,dashboard,read('report-config.js')].join('\n');
check(!/(AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,})/.test(runtime),'Secret-like credential found in runtime files');
check(!/password\s*[:=]\s*['"][^'"]+['"]/i.test(runtime),'Hard-coded password found');

if(failures.length){
  console.error('FIEZEL experience integration: FAIL');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('FIEZEL experience integration: PASS');
console.log(JSON.stringify({aiSkillProfile:true,haptics:true,answerSounds:true,answerPopups:true,realtimeSky:true,grammarQuestionsPerLesson:25,naturalIndonesian:true,motion:true,creatorHub:true,rotatingLoginReminder:true,mandatoryNotifications:true,studyReminderEngine:true,apiKeyBundled:false}));
