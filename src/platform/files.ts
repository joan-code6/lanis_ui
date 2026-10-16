import { Browser } from '@capacitor/browser';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isAndroid } from './native';

export async function openExternal(url: string): Promise<void> {
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Dieser Link kann nicht geöffnet werden.');
  if (isAndroid) await Browser.open({ url: parsed.href });
  else window.open(parsed.href, '_blank', 'noopener,noreferrer');
}

export async function saveBlob(blob: Blob, filename: string): Promise<void> {
  if (!isAndroid) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  // Cache is private; Android grants access to the selected receiving app only.
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Die Datei konnte nicht gelesen werden.'));
    reader.readAsDataURL(blob);
  });
  const safeName = filename.replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 180) || 'LANIS-Datei';
  const path = `lanis-share/${Date.now()}-${safeName}`;
  const file = await Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true });
  await Share.share({ title: filename, url: file.uri, dialogTitle: 'Datei öffnen oder speichern' });
}
