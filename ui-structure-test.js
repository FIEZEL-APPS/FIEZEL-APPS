const fs=require('fs'),path=require('path');
const root=__dirname;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const setup=fs.readFileSync(path.join(root,'creator-report-setup.html'),'utf8');
const dashboard=fs.readFileSync(path.join(root,'creator-report-dashboard.html'),'utf8');
const failures=[];
const check=(ok,message)=>{if(!ok)failures.push(message)};

check((html.match(/class="nav(?: active)?"/g)||[]).length===5,'Bottom navigation must contain exactly five primary destinations.');
check((html.match(/data-lucide=/g)||[]).length>=9,'Core chrome must use the local icon system.');
check(/aria-label="Buka pengaturan"/.test(html)&&/aria-label="Atur soundtrack"/.test(html),'Icon-only topbar controls need accessible names.');
check(/launcher-shell/.test(app)&&/coach-preview/.test(app)&&/learning-launcher/.test(app),'Home launcher hierarchy is incomplete.');
check(/go\('skills'\)/.test(app)&&/FiezelSLAddon\.create/.test(app)&&/prepareNeuralVoice/.test(app),'Speaking, Listening, and explicit neural voice preparation are not integrated.');
check(html.indexOf('./features/neural-voice/fiezel-neural-voice-bootstrap.js')<html.indexOf('./app.js')&&html.indexOf('./features/speaking-listening/fiezel-speaking-listening-addon.js')<html.indexOf('./app.js'),'Feature runtimes must load before app.js.');
check(/id="globalSky"/.test(html)&&/id="globalCelestial"/.test(html)&&/\.global-sky/.test(css)&&/\.sky-light/.test(css),'Full-viewport celestial atmosphere is incomplete.');
check(/grid-template-columns:minmax\(0,1\.42fr\)/.test(css),'Desktop launcher layout is missing.');
check(/\.learning-launcher\{display:grid;grid-template-columns:repeat\(4,1fr\)/.test(css),'Desktop learning launcher must expose four feature cards.');
check(/@media\(max-width:860px\)/.test(css)&&/@media\(max-width:640px\)/.test(css),'Tablet and mobile breakpoints are missing.');
check(/\.launcher-shell\{grid-template-columns:1fr/.test(css),'Launcher does not collapse to one column.');
check(/\.learning-launcher\{grid-template-columns:1fr\}/.test(css),'Learning launcher does not collapse for mobile.');
check(/width:calc\(100% - 16px\)/.test(css),'Mobile bottom navigation lacks a viewport-safe width.');
check(/max-height:min\(760px,88vh\);overflow:auto/.test(css),'Modal content is not viewport bounded.');
check(/prefers-reduced-motion:reduce/.test(css)&&/\.reduce-motion \*/.test(css),'Reduced-motion coverage is incomplete.');
check(!/[🔊🗣✨💡🏠📚📈]/u.test(app+html),'Runtime UI still uses legacy control emoji instead of the icon library.');
check(/type="button" id="deploy"/.test(setup)&&/type="button" id="load"/.test(dashboard),'Auxiliary pages contain implicit buttons.');
check(/<meta name="viewport"/.test(setup)&&/<meta name="viewport"/.test(dashboard),'Auxiliary pages are not mobile-ready.');

if(failures.length){
  console.error('FIEZEL UI structure: FAIL');
  failures.forEach(x=>console.error('- '+x));
  process.exit(1);
}
console.log('FIEZEL UI structure: PASS');
console.log(JSON.stringify({primaryNavigation:5,desktopLauncher:true,tabletBreakpoint:860,mobileBreakpoint:640,reducedMotion:true,emojiControls:false}));
