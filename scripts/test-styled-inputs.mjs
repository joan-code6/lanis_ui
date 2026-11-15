import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import puppeteer from 'puppeteer-core';

const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React, {useState, useRef} from 'react';
    import {createRoot} from 'react-dom/client';
    import {Select, SelectOption} from './src/components/ui/Select';
    import {TimeInput} from './src/components/ui/TimeInput';
    import {ColorPicker} from './src/components/ui/ColorPicker';
    import {ThemeColorPicker} from './src/components/settings/ThemeColorPicker';
    import {dismissInputPopup} from './src/utils/inputPopups';
    import {useDialogFocus} from './src/hooks/useDialogFocus';
    window.dismissInputPopup = dismissInputPopup;
    function App() {
      const [value,setValue]=useState(''), [time,setTime]=useState('08:05'), [color,setColor]=useState('#123456');
      const [modal,setModal]=useState(false), ref=useRef(null), dialog=useRef(null);
      useDialogFocus(modal, ref, () => setModal(false));
      const choices=<><SelectOption value="">Alle Kategorien</SelectOption>{[
        ['alpha','Alpha'],['disabled','Nicht verfügbar'],['beta','Beta']
      ].map(([value,label])=><SelectOption key={value} value={value} disabled={value==='disabled'}>{label}</SelectOption>)}
        {Array.from({length:60},(_,i)=><SelectOption key={i} value={i}>Eintrag {i}</SelectOption>)}
      </>;
      return <main className="module-page space-y-4">
        <label htmlFor="filter">Kategorie</label><Select id="filter" value={value} onValueChange={setValue}>{choices}</Select>
        <output id="value">{value}</output>
        <Select aria-label="Deaktiviert" value="" onValueChange={setValue} disabled>{choices}</Select>
        <TimeInput id="time" label="Beginn" value={time} onValueChange={setTime}/><output id="time-value">{time}</output>
        <TimeInput aria-label="Leere Zeit" value="" onValueChange={setTime}/>
        <TimeInput aria-label="Deaktivierte Zeit" value="09:00" onValueChange={setTime} disabled/>
        <ColorPicker id="color" aria-label="Kursfarbe" value={color} onValueChange={setColor} onCommit={()=>window.committed=color}/>
        <output id="color-value">{color}</output>
        <ThemeColorPicker id="theme-color" value={color} onChange={setColor}/>
        <button id="open-native-dialog" onClick={()=>dialog.current.showModal()}>Dialog</button>
        <dialog ref={dialog} className="card w-72"><Select id="dialog-filter" aria-label="Dialogauswahl" value={value} onValueChange={setValue}>{choices}</Select><button onClick={()=>dialog.current.close()}>Schließen</button></dialog>
        <button id="open-modal" onClick={()=>setModal(true)}>Modal</button>
        {modal && <div ref={ref} role="dialog" aria-modal="true" aria-label="Modal" style={{position:'fixed',inset:16}} className="card"><Select id="modal-filter" aria-label="Modalauswahl" value={value} onValueChange={setValue}>{choices}</Select><button onClick={()=>setModal(false)}>Schließen</button></div>}
      </main>;
    }
    createRoot(document.getElementById('root')).render(<App/>);
  ` },
  bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' },
});
const css = await postcss([tailwind()]).process(await readFile('src/index.css', 'utf8'), { from: 'src/index.css' });
const firefox = process.env.FIREFOX_PATH;
const browser = await puppeteer.launch({
  browser: firefox ? 'firefox' : 'chrome', executablePath: firefox || process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true, args: firefox ? [] : ['--no-sandbox'],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { errors.push(`Native ${dialog.type()} dialog`); void dialog.dismiss(); });
  await page.setContent('<div id="root"></div>');
  await page.addStyleTag({ content: css.css });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.waitForSelector('#filter');
  for (const width of [390, 1440]) {
    await page.setViewport({ width, height: 900 });
    for (const theme of ['', 'dark', 'dark oled']) {
      await page.evaluate(theme => document.documentElement.className = theme, theme);
      await page.click('#filter');
      await page.waitForSelector('[role="listbox"]');
      assert.equal(await page.$eval('[role="listbox"]', el => {
        const r=el.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth && r.bottom<=innerHeight;
      }), true, `Popup fits ${width}px ${theme}`);
      assert.equal(await page.$eval('[role="option"][aria-disabled="true"]', el => el.textContent), 'Nicht verfügbar');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('[role="listbox"]'));
      assert.equal(await page.evaluate(() => document.activeElement.id), 'filter');
    }
  }
  await page.focus('#filter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('a');
  await page.waitForFunction(() => document.activeElement?.textContent === 'Alpha');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('value').textContent === 'alpha');
  await page.click('#filter');
  await page.keyboard.press('ArrowDown'); // Skip disabled option.
  await page.waitForFunction(() => document.activeElement?.textContent === 'Beta');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('value').textContent === 'beta');
  await page.click('#filter');
  await page.keyboard.press('Home');
  await page.waitForFunction(() => document.activeElement?.textContent === 'Alle Kategorien');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.getElementById('value').textContent === '');

  await page.click('#time [data-type="hour"]');
  await page.keyboard.type('23');
  await page.click('#time [data-type="minute"]');
  await page.keyboard.type('59');
  await page.waitForFunction(() => document.getElementById('time-value').textContent === '23:59');
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => document.getElementById('time-value').textContent === '23:00');
  assert.equal(await page.$eval('#time [data-type="hour"]', el=>el.getAttribute('role')), 'spinbutton');
  assert.equal(await page.$eval('button[aria-label="Deaktiviert"]', el=>el.disabled), true);

  await page.click('#color');
  await page.waitForSelector('#color-hex');
  await page.click('#color-hex');
  await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control');
  await page.keyboard.type('#aabbcc');
  await page.waitForFunction(() => document.getElementById('color-value').textContent === '#aabbcc');
  assert.equal(await page.evaluate(() => window.dismissInputPopup()), true);
  await page.waitForFunction(() => !document.querySelector('[data-input-popup]'));
  assert.equal(await page.evaluate(() => window.committed), '#aabbcc');

  await page.click('#open-native-dialog');
  await page.click('#dialog-filter');
  await page.waitForSelector('dialog[open] [role="listbox"]');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role="listbox"]'));
  assert.equal(await page.$eval('dialog', el=>el.open), true, 'Escape closes select before its native dialog');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));

  await page.click('#open-modal');
  await page.click('#modal-filter');
  await page.waitForSelector('[role="dialog"] [role="listbox"]');
  await page.evaluate(() => window.dismissInputPopup());
  await page.waitForFunction(() => !document.querySelector('[role="listbox"]'));
  assert.ok(await page.$('[role="dialog"]'), 'Android back keeps enclosing modal');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
  assert.equal(await page.evaluate(() => document.activeElement.id), 'open-modal');
  assert.equal(await page.$('input[type="time"], input[type="color"], select:not([aria-hidden="true"])'), null);
  assert.deepEqual(errors, []);
  if (!firefox) {
    const touch = await browser.newPage();
    await touch.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await touch.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div>');
    await touch.addStyleTag({ content: css.css });
    await touch.addScriptTag({ content: bundle.outputFiles[0].text });
    await touch.waitForSelector('#filter');
    await touch.tap('#filter');
    await touch.waitForSelector('[role="listbox"]');
    const options = await touch.$$('[role="option"]');
    const beta = (await Promise.all(options.map(async option => await option.evaluate(el=>el.textContent) === 'Beta' ? option : null))).find(Boolean);
    await beta.tap();
    await touch.waitForFunction(() => document.getElementById('value').textContent === 'beta');
    await touch.tap('#color');
    await touch.waitForSelector('[data-input-popup] .react-colorful');
    await touch.tap('button[aria-label="Farbauswahl schließen"]');
    await touch.waitForFunction(() => !document.querySelector('[data-input-popup]'));
    await touch.close();
  }
  console.log(`${firefox ? 'Firefox' : 'Chromium'}: mobile/desktop light/dark/OLED, selection/reset/disabled/typeahead, time editing, color commit, modal focus and Android back passed.`);
} finally { await browser.close(); }
