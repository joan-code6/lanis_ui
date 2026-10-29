import React from 'react';
import clsx from 'clsx';

interface SettingsSwitchProps {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}

const SettingsSwitch: React.FC<SettingsSwitchProps> = ({ checked, disabled = false, label, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={onChange}
    className={clsx(
      'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-surface-900',
      checked ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-700',
    )}
  >
    <span className={clsx('absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform', checked && 'translate-x-5')} />
  </button>
);

export default SettingsSwitch;
