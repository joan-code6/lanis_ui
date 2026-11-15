import { HexColorInput, HexColorPicker } from 'react-colorful';
import { normalizeThemeColor } from '../../utils/themeAssets';
import type { ThemeColor } from '../../types';

export function ThemeColorPicker({ id, value, onChange }: { id: string; value: ThemeColor; onChange: (color: ThemeColor) => void }) {
  const changeColor = (color: string) => {
    const normalized = normalizeThemeColor(color);
    if (normalized) onChange(normalized);
  };
  return <div className="theme-color-picker mt-2 space-y-4">
    <HexColorPicker color={value} onChange={changeColor} />
    <label className="label block" htmlFor={id}>Hex
      <HexColorInput id={id} color={value} onChange={changeColor} prefixed className="input mt-1 font-mono" />
    </label>
  </div>;
}
