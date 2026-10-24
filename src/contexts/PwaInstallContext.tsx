import { capture } from '../analytics/client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  getInstallAvailability,
  InstallAvailability,
  subscribeToInstallAvailability,
} from '../utils/pwaInstall';

const STORAGE_KEY = 'lanis_pwa_promotion_v2';
const SESSION_KEY = 'lanis_pwa_session_v2';
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
const REQUIRED_ACTIVE_MS = 30_000;

type PromotionState = {
  version: 2;
  sessionCount: number;
  dismissalCount: number;
  nextEligibleAt: number;
  automaticPromotionsDisabled: boolean;
};

type InstallResult = 'accepted' | 'dismissed' | 'instructions' | 'unavailable';

type PwaInstallContextValue = {
  availability: InstallAvailability;
  canInstall: boolean;
  isInstalling: boolean;
  shouldPromote: boolean;
  dismissPromotion: () => void;
  requestInstall: (source?: 'promotion' | 'settings') => Promise<InstallResult>;
};

const defaultPromotionState: PromotionState = {
  version: 2,
  sessionCount: 0,
  dismissalCount: 0,
  nextEligibleAt: 0,
  automaticPromotionsDisabled: false,
};

const readPromotionState = (): PromotionState => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Partial<PromotionState> | null;
    if (stored?.version === 2) {
      return {
        ...defaultPromotionState,
        ...stored,
        sessionCount: Math.max(0, Number(stored.sessionCount) || 0),
        dismissalCount: Math.max(0, Number(stored.dismissalCount) || 0),
        nextEligibleAt: Math.max(0, Number(stored.nextEligibleAt) || 0),
        automaticPromotionsDisabled: stored.automaticPromotionsDisabled === true,
      };
    }
  } catch {
    // Invalid local state should never prevent installation.
  }

  const legacyPermanentlyDismissed = localStorage.getItem('pwa_permanent_dismiss') === 'true';
  const legacyDismissedDate = localStorage.getItem('pwa_dismissed_date');
  const parsedLegacyDate = legacyDismissedDate
    ? new Date(`${legacyDismissedDate}T00:00:00`).getTime()
    : 0;

  return {
    ...defaultPromotionState,
    nextEligibleAt: Number.isFinite(parsedLegacyDate) ? parsedLegacyDate + SNOOZE_MS : 0,
    automaticPromotionsDisabled: legacyPermanentlyDismissed,
  };
};

const writePromotionState = (state: PromotionState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const PwaInstallContext = createContext<PwaInstallContextValue | undefined>(undefined);

export const PwaInstallProvider: React.FC<{
  children: React.ReactNode;
  automaticPromotion?: boolean;
}> = ({ children, automaticPromotion = true }) => {
  const [availability, setAvailability] = useState<InstallAvailability>(() => getInstallAvailability());
  const [promotionState, setPromotionState] = useState<PromotionState>(() => readPromotionState());
  const [hasEnoughActiveTime, setHasEnoughActiveTime] = useState(false);
  const [hiddenForSession, setHiddenForSession] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const updateAvailability = () => setAvailability(getInstallAvailability());
    const unsubscribe = subscribeToInstallAvailability(updateAvailability);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setPromotionState(readPromotionState());
    };
    const onInstalled = () => {
      setAvailability('installed');
      setHiddenForSession(true);
    };
    const pwa = document.querySelector('pwa-install') as PwaInstallElement | null;

    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('storage', onStorage);
    pwa?.addEventListener('pwa-install-success-event', onInstalled);
    updateAvailability();

    return () => {
      unsubscribe();
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('storage', onStorage);
      pwa?.removeEventListener('pwa-install-success-event', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!automaticPromotion || sessionStorage.getItem(SESSION_KEY) === 'true') return;
    sessionStorage.setItem(SESSION_KEY, 'true');
    setPromotionState(current => {
      const next = { ...current, sessionCount: current.sessionCount + 1 };
      writePromotionState(next);
      return next;
    });
  }, [automaticPromotion]);

  useEffect(() => {
    if (!automaticPromotion || hasEnoughActiveTime) return;
    let visibleActiveTime = 0;
    let lastTick = performance.now();

    const resetTick = () => {
      lastTick = performance.now();
    };
    document.addEventListener('visibilitychange', resetTick);

    const timer = window.setInterval(() => {
      const now = performance.now();
      if (document.visibilityState === 'visible') visibleActiveTime += now - lastTick;
      lastTick = now;
      if (visibleActiveTime >= REQUIRED_ACTIVE_MS) {
        setHasEnoughActiveTime(true);
        window.clearInterval(timer);
      }
    }, 1_000);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', resetTick);
    };
  }, [automaticPromotion, hasEnoughActiveTime]);

  const updatePromotionState = useCallback((update: (current: PromotionState) => PromotionState) => {
    const next = update(readPromotionState());
    writePromotionState(next);
    setPromotionState(next);
  }, []);

  const dismissPromotion = useCallback(() => {
    void capture('install_dismissed', { permanent: readPromotionState().dismissalCount + 1 >= 2 });
    setHiddenForSession(true);
    updatePromotionState(current => {
      const dismissalCount = current.dismissalCount + 1;
      return {
        ...current,
        dismissalCount,
        nextEligibleAt: Date.now() + SNOOZE_MS,
        automaticPromotionsDisabled: dismissalCount >= 2,
      };
    });
  }, [updatePromotionState]);

  const requestInstall = useCallback(async (source: 'promotion' | 'settings' = 'settings'): Promise<InstallResult> => {
    void capture('install_requested', { source });
    if (availability === 'ios-safari' || availability === 'ios-browser') {
      const pwa = document.querySelector('pwa-install') as PwaInstallElement | null;
      if (!pwa) return 'unavailable';
      pwa.showDialog(true);
      if (source === 'promotion') {
        setHiddenForSession(true);
        updatePromotionState(current => ({
          ...current,
          nextEligibleAt: Date.now() + SNOOZE_MS,
        }));
      }
      return 'instructions';
    }

    const prompt = getDeferredInstallPrompt();
    if (availability !== 'native' || !prompt) return 'unavailable';

    setIsInstalling(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      clearDeferredInstallPrompt();
      setHiddenForSession(true);
      if (choice.outcome === 'dismissed') dismissPromotion();
      return choice.outcome;
    } finally {
      setIsInstalling(false);
    }
  }, [availability, dismissPromotion, updatePromotionState]);

  const canInstall = availability === 'native'
    || availability === 'ios-safari'
    || availability === 'ios-browser';
  const shouldPromote = automaticPromotion
    && canInstall
    && promotionState.sessionCount >= 2
    && hasEnoughActiveTime
    && !promotionState.automaticPromotionsDisabled
    && promotionState.nextEligibleAt <= Date.now()
    && !hiddenForSession;

  const value = useMemo<PwaInstallContextValue>(() => ({
    availability,
    canInstall,
    isInstalling,
    shouldPromote,
    dismissPromotion,
    requestInstall,
  }), [availability, canInstall, dismissPromotion, isInstalling, requestInstall, shouldPromote]);

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
};

export const usePwaInstall = () => {
  const context = useContext(PwaInstallContext);
  if (!context) throw new Error('usePwaInstall must be used within PwaInstallProvider');
  return context;
};
