/** Format elapsed time using days, hours and minutes, omitting empty units. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'Unbekannt';
  const totalMinutes = Math.max(0, Math.floor(seconds / 60));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor(totalMinutes % 1440 / 60);
  const minutes = totalMinutes % 60;
  return [
    days ? `${days} ${days === 1 ? 'Tag' : 'Tage'}` : '',
    hours ? `${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}` : '',
    minutes || !totalMinutes ? `${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}` : '',
  ].filter(Boolean).join(' ');
}
