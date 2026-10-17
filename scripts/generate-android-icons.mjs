import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Reuse the existing MIT-licensed Heroicons academic cap across Android surfaces.
const source = await readFile(require.resolve('@heroicons/react/24/solid/AcademicCapIcon'), 'utf8');
const paths = [...source.matchAll(/d: "([^"]+)"/g)].map(match => match[1]);
if (paths.length !== 3) throw new Error('Academic cap SVG paths changed; review before regenerating icons.');
const output = 'android/app/src/main/res/drawable';
const glyph = color => paths.map(path => `<path android:fillColor="${color}" android:pathData="${path}" />`).join('');
await writeFile(`${output}/ic_stat_lanis.xml`, `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">${glyph('#ffffff')}</vector>\n`);
// Launcher assets come from the same official generated artwork used by the web UI.
const { mkdir, copyFile, rm } = await import('node:fs/promises');
const themes = ['emerald', 'sapphire', 'amethyst', 'ruby', 'amber', 'cyan', 'coral', 'blush', 'moss'];
await mkdir('android/app/src/main/res/drawable-nodpi', { recursive: true });
await rm('android/app/src/main/res/mipmap-anydpi-v26', { recursive: true, force: true });
await rm(`${output}/ic_lanis.xml`, { force: true });
for (const theme of themes) {
  await copyFile(`public/favicon/themes/${theme}/android-chrome-512x512.png`, `android/app/src/main/res/drawable-nodpi/ic_lanis_${theme}.png`);
  await writeFile(`android/app/src/main/res/mipmap-anydpi/ic_launcher_${theme}.xml`, `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/icon_${theme}" /><foreground android:drawable="@drawable/ic_lanis_${theme}" /></adaptive-icon>\n`);
}
await rm('android/app/src/main/res/drawable-nodpi/ic_lanis.png', { force: true });
await writeFile(`${output}/ic_lanis.xml`, '<bitmap xmlns:android="http://schemas.android.com/apk/res/android" android:src="@drawable/ic_lanis_ruby" android:gravity="fill" />\n');
await writeFile('android/app/src/main/res/values/icon_colors.xml', `<resources><color name="icon_emerald">#10b981</color><color name="icon_sapphire">#3b82f6</color><color name="icon_amethyst">#a855f7</color><color name="icon_ruby">#f43f5e</color><color name="icon_amber">#f59e0b</color><color name="icon_cyan">#01bcd6</color><color name="icon_coral">#f88379</color><color name="icon_blush">#fee3ea</color><color name="icon_moss">#4b573f</color></resources>\n`);
