import { useSyncExternalStore } from 'react';
import { savedDataTimestamp, subscribeSavedData } from '../../utils/resourceCache';

export default function SavedDataNotice() {
  const timestamp = useSyncExternalStore(subscribeSavedData, savedDataTimestamp, () => 0);
  if (!timestamp) return null;
  return <div role="status" className="mx-4 mt-3 rounded-lg bg-primary-50 px-4 py-2 text-sm text-primary-800 dark:bg-primary-950 dark:text-primary-200 sm:mx-6">
    Gespeicherter Stand vom {new Date(timestamp).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}.
    {' '}Änderungen erscheinen nach erfolgreicher Aktualisierung.
  </div>;
}
