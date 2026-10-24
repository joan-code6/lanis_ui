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
assert.equal(policy.sanitizeEventProperties('$identify', {}), null);
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
async function harness({production=true, deferred=false}={}) {
  const storage = new Map(); const sent=[]; const calls=[];
  const browser = new EventTarget(); browser.location={pathname:'/messages'};
  let resolveImport;
  const gate = deferred ? new Promise(resolve=>{resolveImport=resolve}) : Promise.resolve();
  let config; let optedOut=false;
  const instance={
    capture(event, properties) { if(!optedOut) {const result=config.before_send({event, properties:{...properties,token:'PUBLIC',distinct_id:'random_browser_id_12345',$current_url:'PRIVATE', $set:{email:'PRIVATE'}}}); if(result)sent.push(result);}},
    set_config(value){calls.push(['config',value]);},
    opt_in_capturing(){optedOut=false;}, opt_out_capturing(){optedOut=true;calls.push(['optout']);}, reset(){calls.push(['reset']);},
  };
  const sdk={init(key,value){assert.equal(key,'phc_testpublic');config=value;calls.push(['init']);return instance;}};
  const context=vm.createContext({window:browser,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},Event,Promise});
  const policyModule=new vm.SourceTextModule(policyCode,{context}); await policyModule.link(()=>{}); await policyModule.evaluate();
  const sdkModule=new vm.SyntheticModule(['default'],function(){this.setExport('default',sdk)},{context});await sdkModule.link(()=>{});await sdkModule.evaluate();
  const source=await readFile(new URL('../src/analytics/client.ts',import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText.replaceAll('import.meta.env',JSON.stringify({PROD:production,VITE_POSTHOG_KEY:'phc_testpublic',VITE_POSTHOG_HOST:'https://eu.i.posthog.com'}));
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
