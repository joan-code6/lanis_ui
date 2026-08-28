import React from 'react';
import clsx from 'clsx';

const normalizeColor = (color?: string) => {
  const value = color?.trim() || '';
  if (/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value)) return `#${value}`;
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value)) return value;
  if (/^(rgb|hsl)a?\([^;]+\)$/i.test(value)) return value;
  return '#64748b';
};

const foregroundFor = (background: string) => {
  const match = background.match(/^#([0-9a-f]{6})$/i);
  if (!match) return '#ffffff';

  const value = Number.parseInt(match[1], 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const luminance = (red * 299 + green * 587 + blue * 114) / 255000;
  return luminance > 0.72 ? '#172033' : '#ffffff';
};

const sizeClasses = {
  small: 'h-10 w-10 rounded-xl',
  list: 'h-12 w-12 rounded-2xl',
  grid: 'h-16 w-16 rounded-2xl',
};

const glyphClasses = {
  small: 'text-lg',
  list: 'text-xl',
  grid: 'text-2xl',
};

interface ModuleIconProps {
  name: string;
  logo?: string;
  color?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}

const ModuleIcon: React.FC<ModuleIconProps> = ({
  name,
  logo,
  color,
  size = 'list',
  className,
}) => {
  const logoClasses = logo?.replace(/\r?\n/g, '').replace(/\s+/g, ' ').trim() || '';
  const backgroundColor = normalizeColor(color);
  const foregroundColor = foregroundFor(backgroundColor);

  return (
    <span
      aria-hidden="true"
      className={clsx(
        'flex shrink-0 items-center justify-center overflow-hidden font-semibold shadow-sm ring-1 ring-black/10 dark:ring-white/10',
        sizeClasses[size],
        className,
      )}
      style={{ backgroundColor, color: foregroundColor }}
    >
      {logoClasses ? (
        <i className={clsx(logoClasses, glyphClasses[size])} />
      ) : (
        <span className={clsx(size === 'grid' ? 'text-xl' : 'text-sm')}>
          {name.trim().slice(0, 1).toUpperCase() || '?'}
        </span>
      )}
    </span>
  );
};

export default ModuleIcon;
