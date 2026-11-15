import { useCallback, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ColorPickerProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  onCommit?: () => void;
  disabled?: boolean;
  'aria-label': string;
}

export function ColorPicker({ id, value, onValueChange, onCommit, disabled, ...aria }: ColorPickerProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const triggerRef = useCallback((node: HTMLButtonElement | null) => {
    setContainer(node?.closest<HTMLElement>('dialog, [role="dialog"], [aria-modal="true"]') || null);
  }, []);
  return <Popover.Root modal onOpenChange={open => { if (!open) onCommit?.(); }}>
    <Popover.Trigger id={id} ref={triggerRef} disabled={disabled} aria-label={aria['aria-label']} className="flex h-11 w-12 shrink-0 items-center justify-center rounded-xl border border-surface-300 p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 dark:border-surface-600">
      <span className="h-full w-full rounded-lg border border-black/10" style={{ backgroundColor: value }} />
    </Popover.Trigger>
    <Popover.Portal container={container}>
      <Popover.Content data-input-popup aria-label={aria['aria-label']} sideOffset={8} collisionPadding={12} className="app-color-popover theme-color-picker">
        <div className="mb-3 flex items-center justify-between gap-3"><span className="item-title">Farbe auswählen</span><Popover.Close aria-label="Farbauswahl schließen" className="rounded-lg p-2 hover:bg-surface-100 dark:hover:bg-surface-800"><XMarkIcon className="h-5 w-5" /></Popover.Close></div>
        <HexColorPicker color={value} onChange={onValueChange} />
        <label className="label mt-4 block" htmlFor={`${id}-hex`}>Hex</label>
        <HexColorInput id={`${id}-hex`} color={value} onChange={onValueChange} prefixed className="input font-mono" />
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
