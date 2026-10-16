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
await writeFile(`${output}/ic_lanis.xml`, `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#f43f5e" android:pathData="M0,0h108v108H0z" /><group android:scaleX="2.2" android:scaleY="2.2" android:translateX="27.6" android:translateY="27.6">${glyph('#123446')}</group></vector>\n`);
