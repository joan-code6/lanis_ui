import { Children, Fragment, isValidElement, useCallback, useState, type ReactNode } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface OptionProps {
  value: string | number;
  disabled?: boolean;
  children: ReactNode;
}

// Declarative options keep dynamic school-provided choices next to their control.
export function SelectOption(_props: OptionProps) { return null; }

function optionsFrom(children: ReactNode): OptionProps[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement(child)) return [];
    if (child.type === Fragment) return optionsFrom(child.props.children);
    return child.type === SelectOption ? [child.props as OptionProps] : [];
  });
}

interface SelectProps {
  id?: string;
  name?: string;
  value: string | number;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

export function Select({ value, onValueChange, children, className, id, name, disabled, required, ...aria }: SelectProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const triggerRef = useCallback((node: HTMLButtonElement | null) => {
    setContainer(node?.closest<HTMLElement>('dialog, [role="dialog"], [aria-modal="true"]') || null);
  }, []);
  const options = optionsFrom(children);
  // Radix reserves the empty string for placeholders. Prefix every value so an
  // empty option remains selectable, even after choosing a non-empty value.
  const encode = (option: string | number) => `value:${option}`;
  return <SelectPrimitive.Root value={encode(value)} onValueChange={next => onValueChange(next.slice(6))} name={name} disabled={disabled} required={required}>
    <SelectPrimitive.Trigger
      ref={triggerRef}
      id={id} {...aria} className={clsx('app-select input flex items-center gap-2', className)}
    >
      <span className="min-w-0 flex-1 truncate text-left"><SelectPrimitive.Value /></span>
      <SelectPrimitive.Icon><ChevronDownIcon className="h-4 w-4 shrink-0 text-surface-400" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Content data-input-popup position="popper" sideOffset={6} collisionPadding={12} className="app-select-menu">
        <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center"><ChevronUpIcon className="h-4 w-4" /></SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1">
          {options.map(option => <SelectPrimitive.Item key={encode(option.value)} value={encode(option.value)} disabled={option.disabled} className="app-select-option">
            <SelectPrimitive.ItemText>{option.children}</SelectPrimitive.ItemText>
            <SelectPrimitive.ItemIndicator className="absolute right-3"><CheckIcon className="h-4 w-4" /></SelectPrimitive.ItemIndicator>
          </SelectPrimitive.Item>)}
        </SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex h-7 items-center justify-center"><ChevronDownIcon className="h-4 w-4" /></SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>;
}
