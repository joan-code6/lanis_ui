import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';

const policySource = await readFile(new URL('../src/analytics/policy.ts', import.meta.url), 'utf8');
const attributionSource = await readFile(new URL('../src/analytics/attribution.ts', import.meta.url), 'utf8');
const attributionCode = ts.transpileModule(attributionSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const attributionURL = `data:text/javascript;base64,${Buffer.from(attributionCode).toString('base64')}`;
const policyCode = ts.transpileModule(policySource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText.replace("'./attribution'", JSON.stringify(attributionURL));
const policy = await import(`data:text/javascript;base64,${Buffer.from(policyCode).toString('base64')}`);
assert.equal(policy.routeLabel('/courses/private-school-course'), '/courses/:id');
assert.equal(policy.routeLabel('/demo/messages'), '/messages');
assert.equal(policy.routeLabel('/settings/arbitrary-private-value'), '/other');
assert.equal(policy.routeLabel('/unknown/person@example.com'), '/other');
assert.equal(policy.routeLabel('/settings/account/'), '/settings/account');
assert.equal(policy.sanitizeEventProperties('$identify', {$set:{email:'PRIVATE'}}).$set, undefined);
assert.equal(policy.sanitizeEventProperties('$snapshot', {}), null);
assert.equal(policy.sanitizeEventProperties('constructor', {}), null);
const dirty = {done:true, subject:'PRIVATE', token:'PRIVATE', $current_url:'PRIVATE', $set:{email:'PRIVATE'}, $exception_message:'PRIVATE', distinct_id:'random_browser_id_12345'};
const clean = policy.sanitizeEventProperties('homework_updated', dirty);
assert.equal(clean.done, true);
assert.equal(JSON.stringify(clean).includes('PRIVATE'), false);
assert.equal(clean.$geoip_disable, true);
assert.equal(clean.$ip, null);
assert.equal(policy.sanitizeEventProperties('api_request_failed', {module:'PRIVATE',failure:'PRIVATE'}).module, undefined);

// Isolated browser/SDK model tests: exercise actual client module and consent races.
async function harness({production=true, deferred=false,host='https://t.lanis.arg-server.de',returnCapture=false,fetcher=async()=>({ok:false})}={}) {
  const storage = new Map(); const sent=[]; const calls=[];
  const browser = new EventTarget(); browser.location={pathname:'/messages',href:'https://lanis.example/messages'};
  let resolveImport;
  const gate = deferred ? new Promise(resolve=>{resolveImport=resolve}) : Promise.resolve();
  let config; let optedOut=false;let distinctId='random_browser_id_12345';
  const instance={
    capture(event, properties) { if(!optedOut) {const result=config.before_send({event, properties:{...properties,token:'PUBLIC',distinct_id:distinctId,$current_url:'PRIVATE', $set:{email:'PRIVATE'}}}); if(result)sent.push(result);if(returnCapture)return result;}},
    get_distinct_id(){return distinctId;},
    identify(reference){const anonymous=distinctId;distinctId=reference;calls.push(['identify',reference]);instance.capture('$identify',{$anon_distinct_id:anonymous});},
    captureException(error,properties){instance.capture('$exception',{...properties,$exception_list:[{type:error.name,value:error.message,stacktrace:{type:'raw',frames:[]}}]});},
    set_config(value){calls.push(['config',value]);},
    opt_in_capturing(){optedOut=false;}, opt_out_capturing(){optedOut=true;calls.push(['optout']);}, reset(){distinctId='random_browser_id_reset';calls.push(['reset']);},
  };
  const sdk={init(key,value){assert.equal(key,'phc_testpublic');config=value;calls.push(['init']);return instance;}};
  const session = new Map();
  const store = map => ({getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)});
  const context=vm.createContext({URL,document:{referrer:''},sessionStorage:store(session),window:browser,localStorage:store(storage),Event,Promise,AbortController,setTimeout,clearTimeout,fetch:fetcher});
  const policyModule=new vm.SourceTextModule(policyCode,{context}); const attributionModule=new vm.SourceTextModule(attributionCode,{context});await attributionModule.link(()=>{});await attributionModule.evaluate();
  await policyModule.link(()=>attributionModule); await policyModule.evaluate();
  const sdkModule=new vm.SyntheticModule(['default'],function(){this.setExport('default',sdk)},{context});await sdkModule.link(()=>{});await sdkModule.evaluate();
  const source=await readFile(new URL('../src/analytics/client.ts',import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText.replaceAll('import.meta.env',JSON.stringify({PROD:production,VITE_POSTHOG_KEY:'phc_testpublic',VITE_POSTHOG_HOST:host}));
  const module=new vm.SourceTextModule(code,{context,importModuleDynamically:async()=>{await gate;return sdkModule;}});
  await module.link(spec=>spec==='./attribution'?attributionModule:policyModule);await module.evaluate();
  return {api:module.namespace,storage,session,sent,calls,browser,resolveImport,getConfig:()=>config};
}
const h=await harness();
await h.api.capture('login_started'); assert.equal(h.calls.length,0,'no SDK before consent');
h.api.setConsent('denied');await h.api.capture('login_started');assert.equal(h.sent.length,0);
h.api.setConsent('granted');await h.api.capture('message_sent',{subject:'PRIVATE'});
assert.equal(h.sent.length,1);assert.equal(h.sent[0].properties.token,'phc_testpublic');
assert.equal(JSON.stringify(h.sent).includes('PRIVATE'),false);
assert.equal(h.getConfig().disable_session_recording,true);assert.equal(h.getConfig().autocapture,false);
await h.api.capturePage();await h.api.capturePage();assert.equal(h.sent.filter(x=>x.event==='$pageview').length,1);
h.api.setConsent('denied');await h.api.capture('message_sent');assert.equal(h.sent.length,2);
h.api.setConsent('granted');await h.api.capture('message_sent');assert.equal(h.sent.length,3,'re-enable after withdrawal');
h.browser.location.pathname='/demo/messages';await h.api.capture('message_sent');assert.equal(h.sent.length,3,'demo excluded');
const dev=await harness({production:false});dev.api.setConsent('granted');await dev.api.capture('message_sent');assert.equal(dev.calls.length,0,'development excluded');
const race=await harness({deferred:true});race.api.setConsent('granted');const pending=race.api.capture('message_sent');race.api.setConsent('denied');race.resolveImport();await pending;assert.equal(race.sent.length,0,'withdraw during SDK import');assert.equal(race.calls.length,0);
console.log('Analytics policy, consent, revocation, re-enable, deduplication, demo/development exclusions and import race checks passed.');

const regrantRace=await harness({deferred:true});regrantRace.api.setConsent('granted');const oldCapture=regrantRace.api.capture('message_sent');regrantRace.api.setConsent('denied');regrantRace.api.setConsent('granted');const freshCapture=regrantRace.api.capture('message_replied');regrantRace.resolveImport();await Promise.all([oldCapture,freshCapture]);assert.equal(regrantRace.sent.length,1);assert.equal(regrantRace.sent[0].event,'message_replied');console.log('Regrant during a pending SDK import passed.');

assert.equal(policy.resultCountBucket(0), '0');
assert.equal(policy.resultCountBucket(1), '1');
assert.equal(policy.resultCountBucket(5), '2-5');
assert.equal(policy.resultCountBucket(20), '6-20');
assert.equal(policy.resultCountBucket(100000), '21+');
assert.equal(policy.searchCategory('PRIVATE'), 'other');
for (const event of Object.keys(policy.eventRules)) {
  const safe = policy.sanitizeEventProperties(event, { query:'PRIVATE', title:'PRIVATE', school_id:'PRIVATE', grade:'PRIVATE', category:'PRIVATE', step:'PRIVATE', feature:'PRIVATE' });
  assert.equal(JSON.stringify(safe).includes('PRIVATE'), false, event);
}
const proxy=await harness({returnCapture:true});proxy.api.setConsent('granted');
await proxy.api.capture('course_opened',{source:'timetable'});
assert.equal(proxy.sent.length,2);assert.equal(proxy.sent[1].event,'feature_engaged');assert.equal(proxy.sent[1].properties.feature,'courses');
assert.equal(proxy.getConfig().api_host,'https://t.lanis.arg-server.de');
await proxy.api.capture('login_failed');assert.equal(proxy.sent.length,3,'failure does not count as engagement');
for(const host of ['https://attacker.invalid','http://t.lanis.arg-server.de','https://t.lanis.arg-server.de/evil']){
 const bad=await harness({host});bad.api.setConsent('granted');await bad.api.capture('login_started');assert.equal(bad.calls.length,0,'untrusted proxy disabled');
}
console.log('Schema v2 vocabulary, result buckets, derived engagement and trusted proxy checks passed.');

assert.equal(policy.searchCategory('__proto__'), 'other');
assert.equal(policy.searchCategory('constructor'), 'other');
let fakeNow=100000;const failures=[];
const errorContext=vm.createContext({Date:{now:()=>fakeNow}});
const captureModule=new vm.SyntheticModule(['capture'],function(){this.setExport('capture',(event,properties)=>failures.push({event,properties}));},{context:errorContext});
await captureModule.link(()=>{});await captureModule.evaluate();
const errorSource=await readFile(new URL('../src/analytics/apiErrors.ts',import.meta.url),'utf8');
const errorModule=new vm.SourceTextModule(ts.transpileModule(errorSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText,{context:errorContext});
await errorModule.link(()=>captureModule);await errorModule.evaluate();
const failure=errorModule.namespace.captureApiFailure;
failure({config:{url:'/nachrichten/private?query=PRIVATE'}});
failure({config:{url:'/stundenplan/view'},response:{status:500}});
failure({config:{url:'/nachrichten/private?query=PRIVATE'}});
assert.equal(failures.length,2,'interleaved failure signatures still throttle');
fakeNow+=10001;failure({config:{url:'/nachrichten/private?query=PRIVATE'}});assert.equal(failures.length,3);
failure({code:'ERR_CANCELED'});assert.equal(failures.length,3);
failure({code:'ETIMEDOUT',config:{url:'/kalender/events'}});assert.equal(failures[3].properties.failure,'timeout');
assert.equal(JSON.stringify(failures).includes('PRIVATE'),false);
console.log('API failure sanitization, independent throttling, cancellation and timeout checks passed.');

const accountRef='la_'+'a'.repeat(32);const anotherRef='la_'+'b'.repeat(32);
const ownBackendRequests=[];
const accounts=await harness({returnCapture:true,fetcher:async(url,options)=>{
 ownBackendRequests.push({url,options});
 return {ok:true,json:async()=>url.endsWith('/identity')?{account_ref:options.headers['X-Session-Token']==='private-token-a'?accountRef:anotherRef}:{diagnostic_id:'ld_'+'d'.repeat(32)}};
}});
accounts.api.configureAccountAnalytics('private-token-a','https://backend.example','private-school:private-student');
await accounts.api.capture('login_succeeded');assert.equal(ownBackendRequests.length,0,'no account lookup before consent');
accounts.api.setConsent('granted');await accounts.api.capture('login_succeeded');
assert.equal(accounts.sent.find(x=>x.event==='login_succeeded').properties.account_ref,accountRef);
assert.equal(accounts.sent.find(x=>x.event==='login_succeeded').properties.distinct_id,accountRef);
assert.equal(accounts.sent.find(x=>x.event==='login_succeeded').properties.$process_person_profile,true);
assert.equal(ownBackendRequests[0].options.headers['X-LANIS-Analytics-Consent'],'account-v2');
assert.equal(JSON.stringify(accounts.sent).includes('private-'),false);
accounts.api.configureAccountAnalytics('private-token-b','https://backend.example','private-school:another-student');
await accounts.api.capture('login_succeeded');assert.equal(accounts.sent.at(-1).properties.account_ref,anotherRef);
accounts.api.resetAnalyticsIdentity();await accounts.api.capture('login_started');assert.equal(accounts.sent.at(-1).properties.account_ref,undefined);
const oldConsent=await harness();oldConsent.storage.set('lanis_analytics_consent_v1','granted');assert.equal(oldConsent.api.getConsent(),null);
oldConsent.storage.set('lanis_analytics_consent_v1','denied');assert.equal(oldConsent.api.getConsent(),'denied');
const unsafeException=policy.sanitizeEventProperties('$exception',{$exception_list:[{type:'TypeError',value:'PRIVATE',stacktrace:{frames:[{filename:'https://app.example/assets/index-ABC123.js?token=PRIVATE',lineno:3,colno:5,vars:{password:'PRIVATE'},function:'PRIVATE'},{filename:'/school/private-student'}]}}]});
assert.equal(JSON.stringify(unsafeException).includes('PRIVATE'),false);assert.equal(unsafeException.$exception_list[0].stacktrace.frames.length,1);
assert.equal(policy.endpointLabel('/meinunterricht/course/PRIVATE?secret=PRIVATE'),'/meinunterricht/course/:id');
console.log('Account linking, account switching, consent upgrade and exception redaction checks passed.');

// API timing, status/body outcome, and revocation must use the original consent epoch.
let enabled=true, epoch=1, clock=100; const requestEvents=[];
const requestContext=vm.createContext({performance:{now:()=>clock},window:{location:{pathname:'/messages'}},crypto:{randomUUID:()=> '12345678-1234-1234-1234-123456789abc'}});
const requestClient=new vm.SyntheticModule(['analyticsEnabled','analyticsEpoch','capture'],function(){
 this.setExport('analyticsEnabled',()=>enabled);this.setExport('analyticsEpoch',()=>epoch);
 this.setExport('capture',(event,props,page)=>requestEvents.push({event,props,page}));
},{context:requestContext});await requestClient.link(()=>{});await requestClient.evaluate();
const requestPolicy=new vm.SyntheticModule(['endpointLabel'],function(){this.setExport('endpointLabel',policy.endpointLabel);},{context:requestContext});await requestPolicy.link(()=>{});await requestPolicy.evaluate();
const requestSource=await readFile(new URL('../src/analytics/requestTelemetry.ts',import.meta.url),'utf8');
const requestModule=new vm.SourceTextModule(ts.transpileModule(requestSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText,{context:requestContext});
const supportModule=new vm.SyntheticModule(['rememberRequest'],function(){this.setExport('rememberRequest',()=>{});},{context:requestContext});await supportModule.link(()=>{});await supportModule.evaluate();
await requestModule.link(spec=>spec==='./client'?requestClient:spec==='./supportContext'?supportModule:requestPolicy);await requestModule.evaluate();
const config={url:'/nachrichten/PRIVATE?query=PRIVATE',method:'post',headers:{}};
requestModule.namespace.startApiRequest(config);clock=350;
assert.equal(config.headers['X-LANIS-Analytics-Consent'],'account-v2');
requestModule.namespace.finishApiRequest(config,{status:200,data:{success:false}});
assert.equal(requestEvents.length,1);assert.equal(requestEvents[0].props.duration_ms,250);
assert.equal(requestEvents[0].props.business_success,false);assert.equal(requestEvents[0].props.outcome,'http_error');
assert.equal(JSON.stringify(requestEvents).includes('PRIVATE'),false);
requestModule.namespace.startApiRequest(config);epoch++;
requestModule.namespace.finishApiRequest(config,{status:200});assert.equal(requestEvents.length,1,'old consent epoch must not reappear after regrant');
enabled=false;requestModule.namespace.startApiRequest(config);
assert.equal(config.headers['X-LANIS-Analytics-Consent'],undefined,'retries strip old consent headers');
assert.equal(config.headers['X-LANIS-Client-Request-ID'],undefined);
console.log('API attempt timing, business outcomes and consent revocation regression checks passed.');

const device=policy.sanitizeEventProperties('$pageview',{$browser:'Chrome',$os:'Linux',$device_type:'Desktop',$browser_version:130.4});assert.equal(device.$browser,'Chrome');assert.equal(device.$browser_version,130);assert.equal(policy.sanitizeEventProperties('$pageview',{$browser:'PRIVATE',$os:'PRIVATE'}).$browser,'Other');

const experienceSource=await readFile(new URL('../src/analytics/experience.ts',import.meta.url),'utf8');
let frames=[];let experienceClock=100;let experienceEpoch=1;const experienceEvents=[];
const experienceContext=vm.createContext({performance:{now:()=>experienceClock},window:{location:{pathname:'/timetable'}},requestAnimationFrame:fn=>frames.push(fn)});
const experienceClient=new vm.SyntheticModule(['analyticsEnabled','analyticsEpoch','capture'],function(){this.setExport('analyticsEnabled',()=>true);this.setExport('analyticsEpoch',()=>experienceEpoch);this.setExport('capture',(event,props,page)=>experienceEvents.push({event,props,page}));},{context:experienceContext});await experienceClient.link(()=>{});await experienceClient.evaluate();
const experienceModule=new vm.SourceTextModule(ts.transpileModule(experienceSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText,{context:experienceContext});await experienceModule.link(()=>experienceClient);await experienceModule.evaluate();
assert.equal(experienceModule.namespace.resourceLabel('dateispeicher-search:PRIVATE'),'dateispeicher-search');
assert.equal(experienceModule.namespace.resourceLabel('["timetable","PRIVATE"]'),'timetable');
const finishView=experienceModule.namespace.startExperience('dateispeicher:PRIVATE');experienceClock=200;finishView('ready',true,300);finishView('failed');
while(frames.length)frames.shift()();assert.equal(experienceEvents[0].props.duration_ms,100);assert.equal(JSON.stringify(experienceEvents).includes('PRIVATE'),false);
const staleView=experienceModule.namespace.startExperience('calendar');staleView('ready');experienceEpoch++;while(frames.length)frames.shift()();assert.equal(experienceEvents.length,1);
const frame=policy.sanitizedExceptionList([{type:'Error',stacktrace:{frames:[{filename:'/assets/app.js',lineno:1,colno:2,chunk_id:'12345678-1234-1234-1234-123456789abc',vars:{secret:'PRIVATE'}}]}}])[0].stacktrace.frames[0];assert.ok(frame.chunk_id);assert.equal(frame.vars,undefined);
console.log('Visible content timing, private resource classification, stale epochs and source-map chunk identifiers passed.');

let supportAllowed=true, supportEpoch=1;
const supportContextModel=vm.createContext({window:{location:{pathname:'/courses/PRIVATE'}}});
const supportClientModel=new vm.SyntheticModule(['analyticsEnabled','analyticsEpoch'],function(){this.setExport('analyticsEnabled',()=>supportAllowed);this.setExport('analyticsEpoch',()=>supportEpoch);},{context:supportContextModel});await supportClientModel.link(()=>{});await supportClientModel.evaluate();
const supportPolicyModel=new vm.SyntheticModule(['routeLabel'],function(){this.setExport('routeLabel',policy.routeLabel);},{context:supportContextModel});await supportPolicyModel.link(()=>{});await supportPolicyModel.evaluate();
const supportSource=await readFile(new URL('../src/analytics/supportContext.ts',import.meta.url),'utf8');
const supportCode=ts.transpileModule(supportSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText.replaceAll('import.meta.env',JSON.stringify({VITE_APP_RELEASE:'abcdef012345'}));
const supportModel=new vm.SourceTextModule(supportCode,{context:supportContextModel});await supportModel.link(spec=>spec==='./client'?supportClientModel:supportPolicyModel);await supportModel.evaluate();
for(let n=0;n<12;n++)supportModel.namespace.rememberRequest(`12345678-1234-1234-1234-${String(n).padStart(12,'0')}`);
assert.equal(supportModel.namespace.supportContext().request_ids.length,10);assert.equal(supportModel.namespace.supportContext().page,'/courses/:id');
supportEpoch++;assert.equal(supportModel.namespace.supportContext().request_ids.length,0);supportAllowed=false;assert.equal(supportModel.namespace.supportContext(),undefined);
console.log('Optional feedback context is bounded, route-sanitized and cleared across consent/account epochs.');

let currentSession='refreshed-private-token';const refreshedRequests=[];
const rotation=await harness({fetcher:async(url,options)=>{refreshedRequests.push(options.headers['X-Session-Token']);return {ok:true,json:async()=>url.endsWith('/identity')?{account_ref:'la_'+'e'.repeat(32)}:{diagnostic_id:'ld_'+'f'.repeat(32)}};}});
rotation.api.configureAccountAnalytics('expired-private-token','https://backend.example','same-account',async()=>currentSession);
rotation.api.setConsent('granted');await rotation.api.capture('login_succeeded');
assert.equal(refreshedRequests[0],'refreshed-private-token');
currentSession='next-private-token';await rotation.api.storeDiagnostic('error',new Error('private'));
assert.equal(refreshedRequests[1],'next-private-token');
let unblockSession;const staleSession=new Promise(resolve=>{unblockSession=resolve});
rotation.api.configureAccountAnalytics('old','https://backend.example','same-account',()=>staleSession);
const staleDiagnostic=rotation.api.storeDiagnostic('error',new Error('private'));
rotation.api.resetAnalyticsIdentity();unblockSession('obsolete');await staleDiagnostic;
assert.equal(refreshedRequests.length,2,'logout while resolving a token cannot send diagnostics');
console.log('Analytics uses refreshed session tokens and rejects stale token resolutions after logout.');

// Attribution uses closed categories, never raw domains/paths/UTM values.
const attribution = await import(attributionURL);
for (const [ref, expected] of [
 ['https://www.google.de/search?q=PRIVATE','google'], ['https://www.bing.com/search?q=PRIVATE','bing'],
 ['https://duckduckgo.com/?q=PRIVATE','other_search'], ['https://l.facebook.com/PRIVATE','social'],
 ['https://google.de.attacker.invalid/PRIVATE','referring_website'], ['https://private-school.example/PRIVATE','referring_website'],
 ['', 'unknown'], ['https://lanis.example/schule/PRIVATE','unknown'], ['invalid','unknown']
]) {
 const touch=attribution.classifyArrival('https://lanis.example/schule/PRIVATE?secret=PRIVATE',ref);
 assert.equal(touch.source,expected);assert.equal(touch.entry,'school_page');assert.equal(JSON.stringify(touch).includes('PRIVATE'),false);
}
const tagged=attribution.classifyArrival('https://lanis.example/?utm_campaign=community&utm_source=community&utm_medium=social','');
assert.equal(tagged.campaign,'community');assert.equal(tagged.source,'unknown');assert.equal(tagged.entry,'shared_link');
for(const query of ['utm_campaign=PRIVATE&utm_source=community&utm_medium=social','utm_campaign=community&utm_source=community&utm_medium=social&utm_source=PRIVATE'])
 assert.equal(attribution.classifyArrival('https://lanis.example/?'+query,'').campaign,undefined);
for(const event of Object.keys(policy.eventRules)) {
 const safe=policy.sanitizeEventProperties(event,{first_source:'PRIVATE',session_entry:'PRIVATE',first_campaign:'PRIVATE',$referrer:'PRIVATE',utm_source:'PRIVATE'});
 assert.equal(JSON.stringify(safe).includes('PRIVATE'),false);
}
const lifecycle=await harness({returnCapture:true,fetcher:async()=>({ok:true,json:async()=>({account_ref:accountRef})})});
await lifecycle.api.capturePage();assert.equal(lifecycle.storage.size,0,'no attribution storage before consent');
lifecycle.api.setConsent('granted');lifecycle.browser.location.href='https://lanis.example/?utm_campaign=community&utm_source=community&utm_medium=social';
await lifecycle.api.capture('login_started');
assert.equal(lifecycle.sent.at(-1).properties.first_campaign,'community');assert.equal(lifecycle.sent.at(-1).properties.identity_kind,'browser');
lifecycle.api.configureAccountAnalytics('private','https://backend.example','account-a');
await lifecycle.api.capture('login_succeeded');
assert.equal(lifecycle.sent.at(-1).properties.first_campaign,'community','anonymous attribution survives first identification');
await lifecycle.api.capture('content_ready',{resource:'courses',outcome:'empty'});
await lifecycle.api.capture('content_ready',{resource:'vertretungsplan-options',outcome:'ready'});
assert.equal(lifecycle.sent.filter(e=>e.event==='account_content_ready').length,0);
await Promise.all([lifecycle.api.capture('content_ready',{resource:'courses',outcome:'ready',cached:true}),lifecycle.api.capture('content_ready',{resource:'courses',outcome:'ready'})]);
assert.equal(lifecycle.sent.filter(e=>e.event==='account_content_ready').length,1,'usable outcome deduplicated');
lifecycle.api.configureAccountAnalytics('rotated','https://backend.example','account-a');
await lifecycle.api.capture('content_ready',{resource:'courses',outcome:'ready'});
assert.equal(lifecycle.sent.filter(e=>e.event==='account_content_ready').length,1,'token rotation preserves outcome');
lifecycle.api.configureAccountAnalytics('other','https://backend.example','account-b');
await lifecycle.api.capture('content_ready',{resource:'courses',outcome:'ready'});
assert.equal(lifecycle.sent.at(-1).properties.first_campaign,undefined,'account switch clears previous attribution');
assert.equal(lifecycle.sent.filter(e=>e.event==='account_content_ready').length,2);
lifecycle.api.setConsent('denied');assert.equal(lifecycle.storage.has('lanis_analytics_first_v1'),false);
console.log('Coarse attribution, campaign allowlist, non-leakage, identity boundaries and usable-outcome deduplication passed.');

// Session persistence, internal navigation, return documents and idle expiration.
const firstStore=new Map(), sessionStore=new Map();let now=100000;
const memoryStore=map=>({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
async function arrivalModel(href,referrer) {
 const ctx=vm.createContext({URL,Date:{now:()=>now},window:{location:{href}},document:{referrer},localStorage:memoryStore(firstStore),sessionStorage:memoryStore(sessionStore)});
 const mod=new vm.SourceTextModule(attributionCode,{context:ctx});await mod.link(()=>{});await mod.evaluate();return {api:mod.namespace,ctx};
}
const a=await arrivalModel('https://lanis.example/schule/PRIVATE','https://google.de/search?q=PRIVATE');
assert.equal(a.api.attributionProperties().first_source,'google');
a.ctx.window.location.href='https://lanis.example/courses/PRIVATE';
assert.equal(a.api.attributionProperties().session_entry,'school_page','internal navigation preserves arrival');
const b=await arrivalModel('https://lanis.example/timetable','https://lanis.example/dashboard');
assert.equal(b.api.attributionProperties().session_source,'google','return document within session preserves touch');
now+=31*60*1000;const c=await arrivalModel('https://lanis.example/','https://bing.com/search?q=PRIVATE');
assert.equal(c.api.attributionProperties().first_source,'google');assert.equal(c.api.attributionProperties().session_source,'bing');
now+=31*60*1000;assert.equal(c.api.attributionProperties().session_source,'unknown','idle open document does not reuse old referrer');
c.api.clearAttribution();assert.equal(firstStore.size,0);assert.equal(sessionStore.size,0);
assert.equal(c.api.attributionProperties().first_source,'unknown','reset cannot replay previous account arrival');
assert.equal(JSON.stringify([...firstStore,...sessionStore]).includes('PRIVATE'),false);
let cancelled=false;const cancelView=experienceModule.namespace.startExperience('courses',()=>cancelled);cancelView('ready');cancelled=true;
while(frames.length)frames.shift()();assert.equal(experienceEvents.length,1,'cancel during paint suppresses stale view');
console.log('Session navigation, return/idle boundaries, storage non-leakage and paint cancellation passed.');

// Run the real AuthContext storage handler: a second tab must clear attribution
// before reloading into the newly selected account. No real account/API is used.
const authSource = await readFile(new URL('../src/contexts/AuthContext.tsx', import.meta.url), 'utf8');
const authTree = ts.createSourceFile('AuthContext.tsx', authSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function findStorageHandler(node) {
 if (ts.isVariableDeclaration(node) && node.name.getText(authTree) === 'handleStorage') handler = node.initializer.getText(authTree);
 ts.forEachChild(node, findStorageHandler);
}
findStorageHandler(authTree);assert.ok(handler);
const secondTab = await harness({returnCapture:true});
secondTab.api.setConsent('granted');
secondTab.browser.location.href = 'https://lanis.example/?utm_campaign=community&utm_source=community&utm_medium=social';
await secondTab.api.capturePage();
assert.ok(secondTab.storage.has('lanis_analytics_first_v1'));
assert.ok(secondTab.session.has('lanis_analytics_session_v1'));
let reloads = 0; const authCalls = [];
const storageContext = vm.createContext({
 window:{location:{reload:()=>{
  assert.equal(secondTab.storage.has('lanis_analytics_first_v1'),false,'first touch cleared before reload');
  assert.equal(secondTab.session.has('lanis_analytics_session_v1'),false,'old tab session cleared before reload');
  authCalls.push('reload');reloads++;
 }}},
 localStorage:{getItem:key=>secondTab.storage.get(key)??null},
 USER_KEY:'auth_user',ACCESS_TOKEN_KEY:'auth_access_token',REFRESH_TOKEN_KEY:'auth_refresh_token',TOKEN_EXPIRES_KEY:'auth_expires_at',
 isSameAccountIdentity:(oldValue,newValue)=>oldValue===newValue,
 resetAnalyticsIdentity:()=>{authCalls.push('reset');secondTab.api.resetAnalyticsIdentity();},
 setToken:()=>authCalls.push('token'),setUser:()=>authCalls.push('user'),setIsAuthenticated:()=>authCalls.push('auth'),clearResourceCache:()=>{},
});
const storageHandler = new vm.SourceTextModule(ts.transpileModule('export const handleStorage = '+handler,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText,{context:storageContext});
await storageHandler.link(()=>{});await storageHandler.evaluate();
storageHandler.namespace.handleStorage({key:'auth_user',oldValue:'same-account',newValue:'same-account'});
assert.equal(authCalls.length,0,'same-account profile event preserves the tab');
storageHandler.namespace.handleStorage({key:'auth_access_token',oldValue:'old-token',newValue:'rotated-token'});
assert.equal(authCalls.length,0,'token rotation preserves attribution');
storageHandler.namespace.handleStorage({key:'auth_user',oldValue:'account-a',newValue:'account-b'});
assert.equal(reloads,1);assert.deepEqual(authCalls,['reset','token','user','auth','reload']);
console.log('Cross-tab account switch clears SDK identity and attribution before the existing reload; token rotation is unchanged.');
