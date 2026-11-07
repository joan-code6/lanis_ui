import React, { useLayoutEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AndroidBeta from './AndroidBeta';
import { hasPendingBetaJoin, rememberBetaJoin } from '../../utils/androidBeta';

// Capture before redirects so the explicit request survives login and onboarding.
export default function BetaJoinEntry({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [pending, setPending] = useState(hasPendingBetaJoin);
  const { isAuthenticated } = useAuth();
  const params = new URLSearchParams(location.search);
  const requested = params.has('joinbeta') && !location.pathname.startsWith('/demo');
  useLayoutEffect(() => { if (requested) { rememberBetaJoin(); setPending(true); } }, [requested, location.key]);
  if (requested) {
    params.delete('joinbeta');
    return <Navigate replace to={{ pathname: isAuthenticated ? '/dashboard' : '/login', search: params.toString(), hash: location.hash }} />;
  }
  return <>{children}{pending && isAuthenticated && location.pathname === '/dashboard' && <AndroidBeta explicitJoin onClose={() => setPending(false)} />}</>;
}
