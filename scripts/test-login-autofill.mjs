import assert from 'node:assert/strict';
import { build } from 'esbuild';
import puppeteer from 'puppeteer-core';

// Exercise the real component with only its application services stubbed.
const mocks = {
  '../../contexts/AuthContext': 'export const useAuth = () => ({ login: async credentials => { window.loginRequests.push(credentials); return false; } });',
  '../../contexts/ThemeContext': 'export const useTheme = () => ({ isDark:false, isOled:false, themeMode:"light", setThemeMode(){} });',
  '../../utils/accountDataWrites': 'export const hasAccountDataDeletionMarker = () => false;',
  '../../services/api': 'export const API_BASE_URL = "https://api.test"; export const schoolListAPI = {};',
  '../seo/SEO': 'export default () => null;',
  '../AppIcon': 'export default () => null;',
  'react-router-dom': 'import React from "react"; export const Link = ({to, children, ...props}) => React.createElement("a", {...props, href:to}, children);',
};
const bundle = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import LoginForm from './src/components/auth/LoginForm'; window.loginRequests=[]; createRoot(document.getElementById('root')).render(React.createElement(LoginForm, {fixedSchool:{id:'1234',name:'Test school',location:'Test'}}));`, resolveDir: process.cwd(), loader:'tsx' },
  bundle:true, write:false, format:'iife', define:{'process.env.NODE_ENV':'"production"'},
  plugins:[{name:'services',setup(builder){
    builder.onResolve({filter:/.*/}, args => Object.hasOwn(mocks,args.path) ? {path:args.path,namespace:'mock'} : undefined);
    builder.onLoad({filter:/.*/,namespace:'mock'}, args => ({contents:mocks[args.path],loader:'js',resolveDir:process.cwd()}));
  }}],
});
const browser = await puppeteer.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', request => request.respond({status:200,contentType:'text/html',body:'<div id="root"></div>'}));
  await page.goto('https://login-form.test/');
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.waitForSelector('#password');
  await page.type('#username','typed.user');
  await page.type('#password','old-password');
  // Android autofill can replace the DOM value without a React change event.
  await page.evaluate(() => {
    document.getElementById('username').value='autofilled.user';
    document.getElementById('password').value='new-Password+&"\\123';
  });
  // Revealing the password rerenders the component; it must preserve autofill.
  await page.click('button[aria-label="Passwort anzeigen"]');
  assert.equal(await page.$eval('#password', el=>el.value),'new-Password+&"\\123');
  await page.evaluate(() => document.querySelector('form').requestSubmit());
  await page.waitForFunction(() => window.loginRequests.length===1);
  assert.deepEqual(await page.evaluate(() => window.loginRequests[0]),{school_id:'1234',username:'autofilled.user',password:'new-Password+&"\\123'});
  await page.waitForFunction(() => !document.getElementById('password').disabled);
  // A retry must use the replacement, preserving leading/trailing spaces exactly.
  await page.evaluate(() => {
    document.getElementById('password').value=' replacement password ';
    document.querySelector('form').requestSubmit();
  });
  await page.waitForFunction(() => window.loginRequests.length===2);
  assert.equal(await page.evaluate(() => window.loginRequests[1].password),' replacement password ');
  console.log('Login autofill checks passed: current fields, visibility toggle, retries, exact password characters.');
} finally {
  await browser.close();
}
