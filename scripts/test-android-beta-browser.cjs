const fs=require('fs'), http=require('http'), path=require('path');
const root=path.resolve(__dirname, '..');
const esbuild=require(root+'/node_modules/esbuild');
const puppeteer=require(root+'/node_modules/puppeteer-core');
(async()=>{
const bundle=await esbuild.build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import AndroidBeta from './src/components/beta/AndroidBeta';createRoot(document.getElementById('root')).render(<AndroidBeta settings={location.search.includes('settings')}/>);`,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',plugins:[{name:'mock',setup(build){build.onLoad({filter:/contexts\/AuthContext.tsx$/},()=>({contents:"export const useAuth=()=>({token:'test'});",loader:'ts'}));build.onLoad({filter:/services\/api.ts$/},()=>({contents:'export const androidBetaAPI=window.betaAPI;',loader:'ts'}));}}]});
const css=fs.readdirSync(root+'/dist/assets').find(x=>x.startsWith('index-')&&x.endsWith('.css'));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':req.url==='/style.css'?'text/css':'text/html');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].text:req.url==='/style.css'?fs.readFileSync(root+'/dist/assets/'+css):'<html><head><link rel="stylesheet" href="/style.css"></head><body class="bg-surface-50 dark:bg-surface-950"><main id="root" class="p-4 mx-auto max-w-3xl"></main><script src="/bundle.js"></script></body></html>')});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
const page=await browser.newPage();page.on('pageerror',e=>{throw e});await page.setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36');
await page.evaluateOnNewDocument(()=>{
window.betaState={available:!location.search.includes('disabled'),group_url:'https://groups.google.com/g/lanis-beta/about',join_url:'https://play.google.com/apps/testing/de.joancode.lanis',dismissed:false,prompt_after:0,invitation_due:true};
window.calls=[];window.fail=false;
window.betaAPI={get:async()=>{if(window.fail)throw Error('offline');return {...window.betaState}},change:async(token,action)=>{window.calls.push({action});if(window.fail)throw Error('offline');window.betaState.invitation_due=false;if(action==='dismiss')window.betaState.dismissed=true;return {...window.betaState}}};
if(location.search.includes('native'))window.Capacitor={isNativePlatform:()=>true};
});
const url='http://127.0.0.1:'+server.address().port;
await page.setViewport({width:390,height:844});await page.goto(url);await page.waitForSelector('dialog[open]');
await page.screenshot({path:'/tmp/lanis-beta-groups-mobile.png'});
const links=await page.$$eval('dialog a',nodes=>nodes.map(n=>n.href));
if(JSON.stringify(links)!==JSON.stringify(['https://groups.google.com/g/lanis-beta/about','https://play.google.com/apps/testing/de.joancode.lanis']))throw Error('Wrong two-step links');
if(await page.$('input[type=email]'))throw Error('Email collection remains');
if(!await page.evaluate(()=>window.calls.some(c=>c.action==='presented')))throw Error('Presentation cooldown missing');
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
await page.evaluate(()=>{window.fail=true;window.betaState.invitation_due=true});await page.keyboard.press('Escape');await page.waitForSelector('dialog[open] [role=alert]');
const callsBeforeClose=await page.evaluate(()=>window.calls.length);
await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
if(await page.evaluate(()=>window.calls.length)!==callsBeforeClose)throw Error('Local Escape tried to save again');
await page.evaluate(()=>{window.fail=false;window.dispatchEvent(new Event('focus'))});await new Promise(r=>setTimeout(r,1800));
if(await page.$('dialog[open]'))throw Error('Failed save reopened locally closed dialog');
if(!await page.evaluate(()=>window.betaState.invitation_due&&!window.betaState.dismissed))throw Error('Local close falsely saved preferences');
await page.goto(url);await page.waitForSelector('dialog[open]');await page.evaluate(()=>{window.fail=true;[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Nicht mehr anzeigen').click()});await page.waitForSelector('dialog[open] [role=alert]');
await page.evaluate(()=>[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Ohne Speichern schließen').click());await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
if(await page.evaluate(()=>window.betaState.dismissed))throw Error('Failed permanent dismissal claimed success');
await page.goto(url+'?settings&disabled');await page.waitForSelector('section a');
if(await page.$$eval('section a',nodes=>nodes.length)!==2)throw Error('Settings lost permanent links');
await page.setViewport({width:1440,height:900});await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:'/tmp/lanis-beta-groups-settings-desktop.png'});
await page.evaluate(()=>{window.fail=true;window.dispatchEvent(new Event('focus'))});await page.waitForSelector('[role=alert]');
if(await page.$$eval('section a',nodes=>nodes.length)!==2)throw Error('Settings links lost during error');
await page.evaluate(()=>{window.fail=false;[...document.querySelectorAll('button')].find(b=>b.textContent==='Erneut versuchen').click()});await page.waitForFunction(()=>!document.querySelector('[role=alert]'));
await page.goto(url+'?native');await new Promise(r=>setTimeout(r,1800));if(await page.$('dialog[open]'))throw Error('Native app invited');
await page.goto(url+'?disabled');await new Promise(r=>setTimeout(r,1800));if(await page.$('dialog[open]'))throw Error('Disabled campaign invited');
await page.goto(url);await page.evaluate(()=>document.documentElement.classList.add('onboarding-active'));await new Promise(r=>setTimeout(r,1800));if(await page.$('dialog[open]'))throw Error('Overlaps onboarding');
await page.evaluate(()=>{document.documentElement.classList.remove('onboarding-active');const modal=document.createElement('div');modal.setAttribute('role','dialog');modal.id='other';document.body.append(modal)});await new Promise(r=>setTimeout(r,1800));if(await page.$('dialog[open]'))throw Error('Overlaps other modal');
await page.evaluate(()=>document.getElementById('other').remove());await page.waitForSelector('dialog[open]');await page.evaluate(()=>[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Nicht mehr anzeigen').click());await page.waitForFunction(()=>!document.querySelector('dialog[open]'));if(!await page.evaluate(()=>window.betaState.dismissed))throw Error('Permanent dismissal missing');
console.log('Browser checks passed: two-step links, no email, presentation/cooldown/dismissal, failures/retry, permanent Settings links, native exclusion, activation gate, onboarding/modal arbitration, mobile and desktop dark layout.');
}finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
