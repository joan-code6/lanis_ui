import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export default class AppErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="flex min-h-[100dvh] items-center justify-center bg-surface-50 px-6 py-12 dark:bg-surface-950"><div className="w-full max-w-sm text-center"><ArrowPathIcon className="mx-auto mb-5 h-10 w-10 text-primary-500" /><h1 className="text-2xl font-semibold text-surface-950 dark:text-white">Lass uns neu starten.</h1><p className="mt-3 text-sm leading-relaxed text-surface-500 dark:text-surface-400">Die Ansicht konnte nicht angezeigt werden. Deine gespeicherte Anmeldung bleibt erhalten.</p><button className="btn btn-primary mt-6 min-h-11" onClick={() => window.location.reload()}>Erneut laden</button></div></div>;
  }
}
