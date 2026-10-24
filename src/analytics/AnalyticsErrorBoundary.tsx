import React from 'react';
import { reportException } from './errors';

export default class AnalyticsErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { void reportException(error, 'react'); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="flex min-h-screen items-center justify-center bg-surface-50 p-6 text-surface-900 dark:bg-surface-950 dark:text-surface-100">
      <section className="card max-w-md space-y-4">
        <h1 className="section-title">Lanis konnte diese Ansicht nicht laden</h1>
        <p className="text-sm">Bitte lade die Seite erneut. Wenn du der Analyse zugestimmt hast, hilft uns ein technischer Fehlerbericht bei der Behebung.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Neu laden</button>
      </section>
    </main>;
  }
}
