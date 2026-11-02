import { useEffect, useState } from 'react';
import { WifiIcon } from '@heroicons/react/24/outline';
import { androidPresentation } from '../../platform/native';

export default function AndroidConnectivity() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  if (!androidPresentation || online) return null;
  return <div role="status" className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200"><WifiIcon className="h-4 w-4 shrink-0" />Offline · Dein gespeicherter Stundenplan bleibt verfügbar.</div>;
}
