import { HexColorInput, HexColorPicker } from 'react-colorful';
import { normalizeThemeColor } from '../../utils/themeAssets';
import type { ThemeColor } from '../../types';

export function ThemeColorPicker({ id, value, onChange }: { id: string; value: ThemeColor; onChange: (color: ThemeColor) => void }) {
  const changeColor = (color: string) => {
    const normalized = normalizeThemeColor(color);
    if (normalized) onChange(normalized);
  };
  const firefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
  if (!firefox) return <input id={id} type="color" value={value} onChange={event => onChange(event.target.value as ThemeColor)} className="input mt-2 h-16 w-full cursor-pointer p-2" />;
  return <div className="theme-color-picker mt-2 space-y-4">
    <HexColorPicker color={value} onChange={changeColor} />
    <label className="label block" htmlFor={id}>Hex
      <HexColorInput id={id} color={value} onChange={changeColor} prefixed className="input mt-1 font-mono" />
    </label>
  </div>;
}
