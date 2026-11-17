import { ComponentPropsWithoutRef } from 'react';
import { useBackNavigation } from '../hooks/useBackNavigation';

type BackButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'onClick'> & {
  fallback: string;
};

export default function BackButton({ fallback, ...props }: BackButtonProps) {
  const goBack = useBackNavigation(fallback);
  return <button {...props} type="button" onClick={goBack} />;
}
