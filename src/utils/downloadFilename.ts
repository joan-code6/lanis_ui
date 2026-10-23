/** Read a download's server-supplied filename, including RFC 5987 UTF-8 names. */
export function downloadFilename(disposition: string | undefined): string | null {
  if (!disposition) return null;
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition);
  let filename: string | undefined;
  if (encoded) {
    try {
      filename = decodeURIComponent(encoded[1].trim());
    } catch {
      // A malformed extended name can still have a usable plain fallback.
    }
  }
  if (!filename) {
    const plain = /(?:^|;)\s*filename\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^;]+))/i.exec(disposition);
    filename = plain?.[1]?.replace(/\\(.)/g, '$1') || plain?.[2]?.trim();
  }
  // Treat a filename as a basename even if the upstream sends a path.
  return filename?.split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f]/g, '').trim() || null;
}
