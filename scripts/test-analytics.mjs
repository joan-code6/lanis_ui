import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';

const policySource = await readFile(new URL('../src/analytics/policy.ts', import.meta.url), 'utf8');
const policyCode = ts.transpileModule(policySource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
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
  const browser = new EventTarget(); browser.location={pathname:'/messages'};
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
  const context=vm.createContext({window:browser,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},Event,Promise,AbortController,setTimeout,clearTimeout,fetch:fetcher});
  const policyModule=new vm.SourceTextModule(policyCode,{context}); await policyModule.link(()=>{}); await policyModule.evaluate();
  const sdkModule=new vm.SyntheticModule(['default'],function(){this.setExport('default',sdk)},{context});await sdkModule.link(()=>{});await sdkModule.evaluate();
  const source=await readFile(new URL('../src/analytics/client.ts',import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText.replaceAll('import.meta.env',JSON.stringify({PROD:production,VITE_POSTHOG_KEY:'phc_testpublic',VITE_POSTHOG_HOST:host}));
  const module=new vm.SourceTextModule(code,{context,importModuleDynamically:async()=>{await gate;return sdkModule;}});
  await module.link(()=>policyModule);await module.evaluate();
  return {api:module.namespace,storage,sent,calls,browser,resolveImport,getConfig:()=>config};
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
const finishView=experienceModule.namespace.startExperience('dateispeicher:PRIVATE');experienceClock=200;finishView('ready',true,300);
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
