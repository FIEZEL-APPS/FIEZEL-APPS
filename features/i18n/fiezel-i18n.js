/* FIEZEL i18n runtime — strict locale isolation (th never falls back to id, id never to th). */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(root,require('./fiezel-i18n-strings.js'));
  else root.FiezelI18n=factory(root,root.FIEZEL_TRANSLATIONS);
}(typeof globalThis!=='undefined'?globalThis:this,function(root,strings){
  'use strict';
  const STORAGE_KEY='fiezel-locale';
  const SUPPORTED=Object.freeze(['id','th']);
  const DEFAULT_LOCALE='id';
  const LEGACY_STATE_KEY='fiezel-v4-state';
  const translations={id:{...(strings?.id||{})},th:{...(strings?.th||{})}};
  const missingTranslationKeys=new Set();
  const listeners=new Set();
  let active=null;

  function storage(){try{return root.localStorage||null}catch{return null}}
  function normalizeLocale(value){
    const raw=String(value||'').trim().toLowerCase().replace(/_/g,'-');
    if(!raw)return null;
    const base=raw.split('-')[0];
    if(base==='th')return 'th';
    if(base==='id'||base==='in')return 'id';
    return null;
  }
  function storedLocale(){const s=storage();if(!s)return null;try{return normalizeLocale(s.getItem(STORAGE_KEY))}catch{return null}}
  function hasStoredLocale(){return storedLocale()!==null}
  function hasLegacyState(){const s=storage();if(!s)return false;try{const raw=s.getItem(LEGACY_STATE_KEY);if(!raw)return false;const parsed=JSON.parse(raw);return Number(parsed?.totalAnswered||0)>0||Boolean(parsed?.placementDone)}catch{return false}}
  // Existing learners keep the Indonesian UI they already had; only fresh installs see the picker.
  function migrateLegacy(){if(hasStoredLocale())return storedLocale();if(hasLegacyState()){persist(DEFAULT_LOCALE);return DEFAULT_LOCALE}return null}
  function persist(locale){const s=storage();if(!s)return;try{s.setItem(STORAGE_KEY,locale)}catch{}}
  function needsSelection(){return migrateLegacy()===null}
  function locale(){if(active)return active;active=migrateLegacy()||DEFAULT_LOCALE;return active}
  function applyDocumentLang(){try{if(root.document?.documentElement)root.document.documentElement.lang=locale()}catch{}}
  function setLocale(value){
    const next=normalizeLocale(value);
    if(!next)throw new Error(`unsupported_locale:${value}`);
    active=next;persist(next);applyDocumentLang();
    listeners.forEach(fn=>{try{fn(next)}catch{}});
    try{root.dispatchEvent?.(new root.CustomEvent('fiezel:locale-change',{detail:{locale:next}}))}catch{}
    return next;
  }
  function onChange(fn){if(typeof fn==='function')listeners.add(fn);return()=>listeners.delete(fn)}
  function interpolate(text,params){
    if(!params||typeof text!=='string')return text;
    return text.replace(/\{(\w+)\}/g,(m,k)=>Object.prototype.hasOwnProperty.call(params,k)?String(params[k]):m);
  }
  function has(key,loc=locale()){return Object.prototype.hasOwnProperty.call(translations[loc]||{},key)}
  // Resolution: active locale only. A missing key returns the key itself and is recorded;
  // it is never substituted with text from another human language.
  function getTranslation(key,loc,params){
    const table=translations[loc];
    if(table&&Object.prototype.hasOwnProperty.call(table,key)){const value=table[key];return Array.isArray(value)||typeof value==='object'?value:interpolate(value,params)}
    missingTranslationKeys.add(`${loc}:${key}`);
    if(root.console&&root.FIEZEL_I18N_STRICT!==false)root.console.warn(`[fiezel-i18n] missing translation ${loc}:${key}`);
    return key;
  }
  function t(key,params){return getTranslation(key,locale(),params)}
  function list(key){const v=t(key);return Array.isArray(v)?v:[]}
  // Registers runtime-owned source strings (e.g. app.js constants) for one locale.
  function extend(loc,entries){const target=translations[normalizeLocale(loc)];if(!target||!entries)return;for(const [k,v] of Object.entries(entries))target[k]=v}
  function missingKeysBetween(){
    const idKeys=Object.keys(translations.id),thKeys=Object.keys(translations.th);
    return{th:idKeys.filter(k=>!Object.prototype.hasOwnProperty.call(translations.th,k)),id:thKeys.filter(k=>!Object.prototype.hasOwnProperty.call(translations.id,k))};
  }
  function applyStatic(doc=root.document){
    if(!doc?.querySelectorAll)return 0;let n=0;
    doc.querySelectorAll('[data-i18n]').forEach(el=>{const key=el.getAttribute('data-i18n');const value=t(key);if(typeof value==='string'){if(el.hasAttribute('data-i18n-html'))el.innerHTML=value;else el.textContent=value;n++}});
    doc.querySelectorAll('[data-i18n-aria-label]').forEach(el=>{const value=t(el.getAttribute('data-i18n-aria-label'));if(typeof value==='string'){el.setAttribute('aria-label',value);n++}});
    doc.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{const value=t(el.getAttribute('data-i18n-placeholder'));if(typeof value==='string'){el.setAttribute('placeholder',value);n++}});
    applyDocumentLang();return n;
  }
  function intlLocale(){return locale()==='th'?'th-TH':'id-ID'}
  function reset(){active=null}
  if(root.document)applyDocumentLang();
  const api={STORAGE_KEY,SUPPORTED,DEFAULT_LOCALE,translations,missingTranslationKeys,normalizeLocale,locale,setLocale,hasStoredLocale,needsSelection,onChange,t,list,has,extend,getTranslation,missingKeysBetween,applyStatic,intlLocale,reset};
  root.t=t;
  return api;
}));
