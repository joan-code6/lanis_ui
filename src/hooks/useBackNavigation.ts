import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/** Go back within the app, or replace a directly opened page with its fallback. */
export function useBackNavigation(fallback: string) {
  const navigate = useNavigate();
  return useCallback(() => {
    // BrowserRouter starts at index 0 even when the tab has external history.
    const index = window.history.state?.idx;
    if (typeof index === 'number' && index > 0) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  }, [navigate, fallback]);
}
