import React from 'react';
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CloudIcon,
  Cog6ToothIcon,
  FolderIcon,
  HomeIcon,
  Squares2X2Icon,
  UserGroupIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const iconRules: Array<[RegExp, IconComponent]> = [
  [/nachricht|message|comment|envelope/, ChatBubbleLeftRightIcon],
  [/stundenplan|kalender|calendar|calendar-days/, CalendarDaysIcon],
  [/video|konferenz|conference|camera/, VideoCameraIcon],
  [/wahl|abstimm|vote|check-square|square-check/, CheckCircleIcon],
  [/vertretung|dsb|clipboard|list-alt/, ClipboardDocumentListIcon],
  [/unterricht|kurs|lernen|lern|anleitung|school|graduation|book/, AcademicCapIcon],
  [/datei|speicher|folder|file/, FolderIcon],
  [/benutzer|gruppe|user|users/, UserGroupIcon],
  [/einstellung|settings|cog|gear/, Cog6ToothIcon],
  [/home|house|start/, HomeIcon],
  [/cloud/, CloudIcon],
];

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
  small: 'h-5 w-5',
  list: 'h-6 w-6',
  grid: 'h-8 w-8',
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
  const searchable = `${name} ${logo || ''}`.toLowerCase();
  const Icon = iconRules.find(([pattern]) => pattern.test(searchable))?.[1];
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
      {Icon ? (
        <Icon className={glyphClasses[size]} strokeWidth={1.8} />
      ) : (
        <span className={clsx(size === 'grid' ? 'text-xl' : 'text-sm')}>
          {name.trim().slice(0, 1).toUpperCase() || <Squares2X2Icon className={glyphClasses[size]} />}
        </span>
      )}
    </span>
  );
};

export default ModuleIcon;
