import type { ThemeColor } from '../../types';

export function ThemeColorPicker({ id, value, onChange }: { id: string; value: ThemeColor; onChange: (color: ThemeColor) => void }) {
  const firefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
  if (!firefox) return <input id={id} type="color" value={value} onChange={event => onChange(event.target.value as ThemeColor)} className="input mt-2 h-16 w-full cursor-pointer p-2" />;
  const channels = [0, 1, 2].map(index => parseInt(value.slice(1 + index * 2, 3 + index * 2), 16));
  return <div id={id} className="mt-2 space-y-3">
    {['Rot', 'Grün', 'Blau'].map((label, index) => <label key={label} className="label flex items-center gap-3">
      <span className="w-10">{label}</span>
      <input type="range" min="0" max="255" value={channels[index]} className="min-w-0 flex-1" onChange={event => {
        const next = [...channels]; next[index] = Number(event.target.value);
        onChange(('#' + next.map(channel => channel.toString(16).padStart(2, '0')).join('')) as ThemeColor);
      }} />
      <span className="w-8 text-right">{channels[index]}</span>
    </label>)}
    <label className="label block">Hex
      <input className="input mt-1" defaultValue={value} key={value} pattern="#[0-9a-fA-F]{6}" maxLength={7} onBlur={event => {
        if (/^#[0-9a-fA-F]{6}$/.test(event.target.value)) onChange(event.target.value.toLowerCase() as ThemeColor);
        else event.target.value = value;
      }} />
    </label>
  </div>;
}
