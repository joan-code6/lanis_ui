import { DateInput, DateSegment, I18nProvider, Label, TimeField } from 'react-aria-components';
import { parseTime } from '@internationalized/date';

interface TimeInputProps {
  id?: string;
  label?: string;
  'aria-label'?: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/** Segmented, keyboard-editable 24-hour time without a browser/OS picker. */
export function TimeInput({ id, label, value, onValueChange, disabled, required, className = 'input', ...aria }: TimeInputProps) {
  const time = /^\d{2}:\d{2}(:\d{2})?$/.test(value) ? parseTime(value) : null;
  return <I18nProvider locale="de-DE">
    <TimeField id={id} aria-label={aria['aria-label']} value={time} onChange={next => onValueChange(next ? next.toString().slice(0, 5) : '')} isDisabled={disabled} isRequired={required} hourCycle={24} granularity="minute" className="min-w-0">
      {label && <Label className="label">{label}</Label>}
      <DateInput className={`app-time-input ${className}`}>
        {segment => <DateSegment segment={segment} className="app-time-segment" />}
      </DateInput>
    </TimeField>
  </I18nProvider>;
}
