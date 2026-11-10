import { Browser } from '@capacitor/browser';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isAndroid, LanisNative } from './native';

export async function openBlob(blob: Blob, filename: string): Promise<void> {
  if (!isAndroid) return saveBlob(blob, filename);
  const file = await cacheBlob(blob, filename);
  try {
    await LanisNative.openFile({ uri: file.uri, mimeType: blob.type });
  } catch (error) {
    if ((error as { code?: string })?.code !== 'NO_FILE_VIEWER') throw error;
    await Share.share({ title: filename, url: file.uri, dialogTitle: 'Datei speichern oder teilen' });
  }
}

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
  const file = await cacheBlob(blob, filename);
  await Share.share({ title: filename, url: file.uri, dialogTitle: 'Datei öffnen oder speichern' });
}

async function cacheBlob(blob: Blob, filename: string): Promise<{ uri: string }> {
  // Cache is private; Android grants access to the selected receiving app only.
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Die Datei konnte nicht gelesen werden.'));
    reader.readAsDataURL(blob);
  });
  const safeName = filename.replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 180) || 'LANIS-Datei';
  const path = `lanis-share/${crypto.randomUUID()}/${safeName}`;
  return Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true });
}
