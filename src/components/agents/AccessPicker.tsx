import React, { useId } from 'react';
import { AccessMode, AgentScope, AccessPresets } from '../../services/api';

export const accessLabels: Record<AccessMode, string> = {
  restricted: 'Eingeschränkt', full: 'Vollzugriff', custom: 'Benutzerdefiniert',
};
export function describeAccess(scopes: string[], presets: AccessPresets): AccessMode {
  if (presets.full && scopes.length === presets.full.length && scopes.every(s => presets.full!.includes(s))) return 'full';
  if (scopes.length === presets.restricted.length && scopes.every(s => presets.restricted.includes(s))) return 'restricted';
  return 'custom';
}

interface Props {
  mode: AccessMode; onMode: (mode: AccessMode) => void;
  scopes: string[]; onScopes: (scopes: string[]) => void;
  available: (AgentScope & { id: string })[]; presets: AccessPresets; disabled?: boolean;
}
export default function AccessPicker({ mode, onMode, scopes, onScopes, available, presets, disabled }: Props) {
  const groupName = useId();
  const options: { id: AccessMode; description: string }[] = [
    { id: 'restricted', description: 'Nur lesen. Keine Noten oder Fehlzeiten.' },
    { id: 'full', description: 'Lesen und ändern. Auch Noten und Fehlzeiten.' },
    { id: 'custom', description: 'Berechtigungen selbst auswählen.' },
  ];
  const groups = [...new Set(available.map(s => s.group || 'Zugriff'))];
  return <fieldset disabled={disabled} className="space-y-2">
    <legend className="sr-only">Zugriff wählen</legend>
    {options.map(option => {
      const unavailable = option.id === 'full' && !presets.full || option.id === 'restricted' && !presets.restricted.length;
      return <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${mode === option.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30' : 'border-surface-200 dark:border-surface-700'} ${unavailable ? 'cursor-not-allowed opacity-50' : ''}`}>
        <input type="radio" name={groupName} value={option.id} checked={mode === option.id} disabled={unavailable} onChange={() => onMode(option.id)} className="mt-1 h-4 w-4 shrink-0 accent-primary-600" />
        <span><span className="block text-sm font-medium">{accessLabels[option.id]}</span><span className="mt-0.5 block text-xs text-surface-500 dark:text-surface-400">{unavailable ? 'Vom Agenten nicht angefragt.' : option.description}</span></span>
      </label>;
    })}
    {mode === 'custom' && <div className="space-y-4 pt-4" aria-label="Einzelne Berechtigungen">
      {groups.map(group => <div key={group}><p className="mb-2 text-xs font-medium text-surface-500">{group}</p><div className="space-y-2">{available.filter(s => (s.group || 'Zugriff') === group).map(s => <label key={s.id} className="flex cursor-pointer items-center justify-between gap-4 text-sm"><span>{s.title}</span><input type="checkbox" checked={scopes.includes(s.id)} onChange={e => onScopes(e.target.checked ? [...scopes, s.id] : scopes.filter(v => v !== s.id))} className="h-4 w-4 shrink-0 accent-primary-600" /></label>)}</div></div>)}
    </div>}
  </fieldset>;
}
