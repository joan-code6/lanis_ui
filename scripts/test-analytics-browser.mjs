import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

// Vite development module with production analytics gate enabled only in this test.
// Every remote request is intercepted. No verification data reaches PostHog.
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox']});
try {
 const page=await browser.newPage();
 await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');
 const outbound=[];const errors=[];let sdkURL;
 page.on('pageerror',e=>errors.push(e.message));
 await page.setRequestInterception(true);
 page.on('request',async request=>{
  const url=request.url();
  if(url.includes('/.vite/deps/posthog-js.js')) sdkURL=url;
  if(url.includes('/src/analytics/client.ts')){
   const response=await fetch(url);let body=await response.text();
   body=body.replace('"PROD": false','"PROD": true').replace(/"VITE_POSTHOG_KEY": "[^"]+"/,'"VITE_POSTHOG_KEY": "phc_testpublic"');
   await request.respond({status:200,contentType:'application/javascript',body});
  } else if(url.startsWith('http://127.0.0.1:5198/') || url.startsWith('data:')) await request.continue();
  else {outbound.push({url,body:request.postData()});await request.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'{"status":1}'});}
 });
 await page.goto('http://127.0.0.1:5198/privacy-policy?private=SECRET',{waitUntil:'networkidle0'});
 assert.equal(outbound.some(r=>(new URL(r.url).hostname === 't.lanis.arg-server.de' || new URL(r.url).hostname.endsWith('.posthog.com'))),false,'no PostHog traffic before consent');
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('ph_'))),false);
 await page.evaluate(async()=>{
  const client=await import('/src/analytics/client.ts');client.setConsent('granted');await client.initializeAnalytics();
 });
 assert.ok(sdkURL);
 const captured=await page.evaluate(async sdkURL=>{
  const {default:posthog}=await import(sdkURL);
  posthog.set_config({disable_compression:true,request_batching:false,opt_out_useragent_filter:true});
  const result=posthog.capture('message_sent',{subject:'SECRET',url:'SECRET',token:'SECRET'},{send_instantly:true});
  return result;
 },sdkURL);
 await new Promise(r=>setTimeout(r,300));
 const requests=outbound.filter(r=>(new URL(r.url).hostname === 't.lanis.arg-server.de' || new URL(r.url).hostname.endsWith('.posthog.com')));
 console.log('PostHog request paths:',requests.map(r=>new URL(r.url).pathname));
 assert.ok(requests.length>0,'SDK sends event through configured proxy after consent');
 assert.ok(requests.every(r=>new URL(r.url).origin==='https://t.lanis.arg-server.de'));
 assert.equal(JSON.stringify(requests).includes('SECRET'),false,'URLs, subjects and query strings excluded');
 assert.equal(requests.some(r=>r.url.includes('/s/') || r.url.includes('/flags') || r.url.includes('/config')),false,'replay and remote config disabled');
 const event=captured;
 assert.equal(JSON.stringify(event).includes('SECRET'),false,'SDK capture result contains no private values');
 assert.ok(event,'real SDK message payload captured');assert.equal(event.properties.token,'phc_testpublic');
 assert.equal(typeof event.properties.distinct_id,'string','ingestion retains random distinct ID');
 assert.equal(typeof event.properties.$session_id,'string','session metadata retained');
 assert.equal(event.properties.page,'/privacy-policy');assert.equal(event.properties.$geoip_disable,true);
 assert.equal(event.properties.$current_url,undefined);assert.equal(event.properties.$set,undefined);
 await page.evaluate(async sdkURL=>{const {default:ph}=await import(sdkURL);if(ph.config.request_batching!==false)throw new Error('Batching must be disabled');ph.capture('message_replied');},sdkURL);
 await new Promise(r=>setTimeout(r,300));
 const before=outbound.length;
 await page.evaluate(async()=>{const c=await import('/src/analytics/client.ts');c.setConsent('denied');await c.capture('message_sent');});
 await new Promise(r=>setTimeout(r,3500));assert.equal(outbound.length,before,'no queued or new captures after withdrawal');
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('ph_') && k.endsWith('_posthog'))),false,'withdrawal clears identity storage');
 await page.evaluate(async sdkURL=>{const c=await import('/src/analytics/client.ts');c.setConsent('granted');await c.capture('message_replied');const {default:ph}=await import(sdkURL);ph.capture('message_sent',{}, {send_instantly:true});},sdkURL);
 await new Promise(r=>setTimeout(r,300));assert.ok(outbound.length>before,'capture resumes after regrant');
 assert.deepEqual(errors,[]);
 console.log('Real SDK browser checks passed: no pre-consent requests/storage, sanitized payloads, no replay/config, withdrawal, storage removal, regrant.');
} finally {await browser.close();}
