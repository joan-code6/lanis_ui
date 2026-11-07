const fs=require('fs'), http=require('http'), path=require('path');
const root=path.resolve(__dirname, '..');
const esbuild=require(root+'/node_modules/esbuild');
const puppeteer=require(root+'/node_modules/puppeteer-core');
(async()=>{
const bundle=await esbuild.build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import AndroidBeta from './src/components/beta/AndroidBeta';import BetaJoinEntry from './src/components/beta/BetaJoinEntry';import{BrowserRouter,Routes,Route}from'react-router-dom';createRoot(document.getElementById('root')).render(<BrowserRouter><BetaJoinEntry><Routes><Route path='/login' element={<p>Login fixture</p>}/><Route path='*' element={location.search.includes('dashboard-error') ? <p>Dashboard module error</p> : <AndroidBeta manual={location.search.includes('manual')}/>}/></Routes></BetaJoinEntry></BrowserRouter>);`,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',plugins:[{name:'mock',setup(build){build.onLoad({filter:/contexts\/AuthContext.tsx$/},()=>({contents:"export const useAuth=()=>({token:'test',isAuthenticated:!location.search.includes('signedout')});",loader:'ts'}));build.onLoad({filter:/services\/api.ts$/},()=>({contents:'export const androidBetaAPI=window.betaAPI;',loader:'ts'}));}}]});
const css=fs.readdirSync(root+'/dist/assets').find(x=>x.startsWith('index-')&&x.endsWith('.css'));
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':req.url==='/style.css'?'text/css':'text/html');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].text:req.url==='/style.css'?fs.readFileSync(root+'/dist/assets/'+css):'<html><head><link rel="stylesheet" href="/style.css"></head><body class="bg-surface-50 dark:bg-surface-950"><main id="root" class="p-4 mx-auto max-w-3xl"></main><script src="/bundle.js"></script></body></html>')});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
const page=await browser.newPage();page.on('pageerror',e=>{throw e});await page.setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile Safari/537.36');
await page.evaluateOnNewDocument(()=>{
window.betaState={available:!location.search.includes('disabled'),group_url:'https://groups.google.com/g/lanis-beta/about',join_url:'https://play.google.com/apps/testing/de.joancode.lanis',dismissed:false,prompt_after:0,invitation_due:true};
if(location.search.includes('dismissed')){window.betaState.dismissed=true;window.betaState.invitation_due=false;}
window.calls=[];window.fail=location.search.includes('offline');
window.betaAPI={get:async()=>{if(window.fail)throw Error('offline');return {...window.betaState}},change:async(token,action)=>{window.calls.push({action});if(window.fail)throw Error('offline');window.betaState.invitation_due=false;if(action==='dismiss')window.betaState.dismissed=true;return {...window.betaState}}};
if(location.search.includes('native'))window.Capacitor={isNativePlatform:()=>true};
});
const url='http://127.0.0.1:'+server.address().port;
await page.setViewport({width:390,height:844});await page.goto(url);await page.waitForSelector('dialog[open]');
await page.screenshot({path:'/tmp/lanis-beta-groups-mobile.png'});
if(await page.$$eval('dialog button',nodes=>nodes.length)!==1)throw Error('Expected one dismiss button');
const links=await page.$$eval('dialog a',nodes=>nodes.map(n=>n.href));
if(JSON.stringify(links)!==JSON.stringify(['https://accounts.google.com/AccountChooser?hl=de&continue=https%3A%2F%2Fgroups.google.com%2Fg%2Flanis-beta%2Fabout','https://play.google.com/apps/testing/de.joancode.lanis']))throw Error('Wrong two-step links');
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
await page.setViewport({width:1440,height:900});await page.goto(url);await page.waitForSelector('dialog[open]');await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:'/tmp/lanis-beta-groups-desktop.png'});
await page.goto(url+'?offline');await new Promise(r=>setTimeout(r,1800));if(await page.$('dialog[open]'))throw Error('Failed preference load invited user');
await page.evaluate(()=>{window.fail=false;window.dispatchEvent(new Event('focus'))});await page.waitForSelector('dialog[open]');
await page.goto(url+'?native');await new Promise(r=>setTimeout(r,1800));if(await page.$('dialog[open]'))throw Error('Native app invited');
await page.goto(url+'?disabled');await new Promise(r=>setTimeout(r,1800));if(await page.$('dialog[open]'))throw Error('Disabled campaign invited');
await page.goto(url);await page.evaluate(()=>document.documentElement.classList.add('onboarding-active'));await new Promise(r=>setTimeout(r,1800));if(await page.$('dialog[open]'))throw Error('Overlaps onboarding');
await page.evaluate(()=>{document.documentElement.classList.remove('onboarding-active');const modal=document.createElement('div');modal.setAttribute('role','dialog');modal.id='other';document.body.append(modal)});await new Promise(r=>setTimeout(r,1800));if(await page.$('dialog[open]'))throw Error('Overlaps other modal');
await page.evaluate(()=>document.getElementById('other').remove());await page.waitForSelector('dialog[open]');await page.evaluate(()=>[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Nicht mehr anzeigen').click());await page.waitForFunction(()=>!document.querySelector('dialog[open]'));if(!await page.evaluate(()=>window.betaState.dismissed))throw Error('Permanent dismissal missing');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await new Promise(r=>setTimeout(r,1800));if(await page.$('dialog[open]'))throw Error('Dismissed invitation reopened');
await page.goto(url+'?manual&dismissed');await page.waitForSelector('section button:not([disabled])');await new Promise(r=>setTimeout(r,1800));if(await page.$('dialog[open]'))throw Error('Manual card auto-opened');
await page.click('section button');await page.waitForSelector('dialog[open]');if(await page.evaluate(()=>window.calls.some(c=>c.action==='presented')))throw Error('Manual open changed automatic invitation acknowledgement');
await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'));if(!await page.evaluate(()=>document.activeElement?.textContent==='Beta ansehen'))throw Error('Focus did not return to help card');
if(!await page.evaluate(()=>window.betaState.dismissed))throw Error('Manual open reset permanent dismissal');
await page.goto(url+'?manual&disabled');await page.waitForSelector('section button[disabled]');if(await page.$('dialog[open]'))throw Error('Manual campaign gate bypassed');
await page.goto(url+'?manual&offline');await page.waitForSelector('section [role=alert]');await page.evaluate(()=>{window.fail=false;[...document.querySelectorAll('button')].find(b=>b.textContent==='Erneut versuchen').click()});await page.waitForSelector('section button:not([disabled])');
// Explicit shared links bypass automatic dismissal, survive login, and are consumed once.
await page.setUserAgent('Mozilla/5.0 Desktop Chrome');
await page.goto(url+'?joinbeta&dismissed&dashboard-error&keep=1#example');await page.waitForSelector('dialog[open]');
if(new URL(page.url()).searchParams.has('joinbeta')||!page.url().includes('keep=1')||!page.url().endsWith('#example'))throw Error('Join URL was not cleaned safely');
if(await page.evaluate(()=>window.calls.some(c=>c.action==='presented')))throw Error('Explicit link changed automatic cooldown');
await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await new Promise(r=>setTimeout(r,1800));if(await page.$('dialog[open]'))throw Error('Explicit invitation reopened after dismissal');
await page.goto(url+'/dashboard?dismissed');await new Promise(r=>setTimeout(r,1800));if(await page.$('dialog[open]'))throw Error('Consumed join request survived reload');
await page.goto(url+'?joinbeta&signedout&dismissed');await page.waitForFunction(()=>location.pathname==='/login');
if(await page.$('dialog[open]'))throw Error('Unauthenticated join showed popup');
await page.goto(url+'/dashboard?dismissed');await page.waitForSelector('dialog[open]');
await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
await page.goto(url+'?joinbeta&dismissed&offline&dashboard-error');await page.waitForSelector('[role=alert]');
await page.evaluate(()=>{window.fail=false;[...document.querySelectorAll('button')].find(b=>b.textContent==='Erneut versuchen').click()});await page.waitForSelector('dialog[open]');
console.log('Shared-link checks passed: desktop explicit intent, permanent-dismissal override, URL cleanup, one-time consumption, login and reload persistence.');
console.log('Browser checks passed: two-step links, no email, presentation/cooldown/dismissal, save failures/local close and load recovery, native exclusion, activation gate, onboarding/modal arbitration, mobile and desktop dark layout.');
}finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
