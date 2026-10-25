import { getApiBaseUrl } from '../utils/backendConfig';
import { capture, configureAccountAnalytics, resetAnalyticsIdentity } from '../analytics/client';
import { clearResourceCache } from '../utils/resourceCache';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContextType, LoginRequest, User } from '../types';
import { authAPI, notificationsAPI, unsubscribeBrowserPushSubscription } from '../services/api';
import {
  clearSignedOutAccountData,
  rememberAccountToken,
  isSameAccountIdentity,
  ACCOUNT_DATA_DELETION_RECOVERY_KEY,
  ACCOUNT_DATA_GENERATION_KEY,
  confirmAccountDataDeletion,
  purgeDeletedAccountBrowserData,
  canWriteAccountData,
  captureAccountDataGeneration,
  completeAccountDataDeletion,
  finishAccountDataDeletion,
  hasAccountDataDeletionMarker,
  isAccountDataDeletionConfirmed,
  withAccountDataLifecycleLock,
} from '../utils/accountDataWrites';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRES_KEY = 'auth_expires_at';
const USER_KEY = 'auth_user';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // Build-time public pages have no saved session; browser restoration still
  // blocks mounting until the account lifecycle checks have completed.
  const [isLoading, setIsLoading] = useState(!import.meta.env.SSR);

  useEffect(() => {
    let mounted = true;
    const initializeAuth = async () => {
      try {
        await withAccountDataLifecycleLock(async () => {
          if (hasAccountDataDeletionMarker()) {
            const deletionGeneration = captureAccountDataGeneration();
            if (!isAccountDataDeletionConfirmed(deletionGeneration)) {
              const savedRecovery = localStorage.getItem(ACCOUNT_DATA_DELETION_RECOVERY_KEY);
              const recovery = savedRecovery ? JSON.parse(savedRecovery) as {
                accessToken: string; refreshToken: string;
              } : {
                accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
                refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) || '',
              };
              if (!recovery.accessToken) return;
              const result = await authAPI.recoverAccountDeletion(recovery.accessToken, recovery.refreshToken);
              if (result.state === 'cancelled') {
                // The server rotated the original session while holding its
                // lifecycle lock. The old DELETE can no longer complete.
                localStorage.setItem(ACCESS_TOKEN_KEY, result.access_token);
                localStorage.setItem(TOKEN_EXPIRES_KEY, String(Date.now() + result.expires_in * 1000));
                finishAccountDataDeletion(deletionGeneration);
                const profile = await authAPI.verifySessionForRecovery(result.access_token);
                if (profile.success !== true || !profile.data) return;
                localStorage.setItem(USER_KEY, JSON.stringify(profile.data));
                if (!mounted) return;
                setToken(result.access_token);
                setUser(profile.data);
                setIsAuthenticated(true);
                return;
              }
              // The original persisted session is gone. This only authorizes
              // local cleanup; it does not claim that upstream data was erased.
              confirmAccountDataDeletion(deletionGeneration);
            }
            const cleanupComplete = await purgeDeletedAccountBrowserData();
            if (cleanupComplete) finishAccountDataDeletion(deletionGeneration);
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            return;
          }

          const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
          const savedUser = localStorage.getItem(USER_KEY);
          if (savedToken && savedUser) {
            rememberAccountToken(savedToken);
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
            setIsAuthenticated(true);
          }
        });
      } catch (error) {
        console.warn('Failed to restore a safe authentication state:', error);
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    const recoverOnStorage = (event: StorageEvent) => {
      if (event.key !== ACCOUNT_DATA_GENERATION_KEY) return;
      if (hasAccountDataDeletionMarker()) {
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(true);
      }
      void initializeAuth();
    };
    const recoverOnline = () => {
      if (!hasAccountDataDeletionMarker()) return;
      setIsLoading(true);
      void initializeAuth();
    };
    window.addEventListener('storage', recoverOnStorage);
    window.addEventListener('online', recoverOnline);
    void initializeAuth();
    return () => {
      window.removeEventListener('storage', recoverOnStorage);
      window.removeEventListener('online', recoverOnline);
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      const authKeys = [
        ACCESS_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        TOKEN_EXPIRES_KEY,
        USER_KEY,
      ];
      if (event.key === USER_KEY && event.newValue !== null
        && !isSameAccountIdentity(event.oldValue, event.newValue)) {
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        window.location.reload();
        return;
      }
      if (event.key !== null && !(authKeys.includes(event.key) && event.newValue === null)) {
        return;
      }
      if (
        localStorage.getItem(ACCESS_TOKEN_KEY)
        && localStorage.getItem(REFRESH_TOKEN_KEY)
        && localStorage.getItem(USER_KEY)
      ) {
        return;
      }
      clearResourceCache();
      resetAnalyticsIdentity();
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    if (hasAccountDataDeletionMarker()) return false;
    void capture('login_started');
    let writeGeneration = captureAccountDataGeneration();
    try {
      const response = await authAPI.login(credentials);
      clearResourceCache();

      const expiresAt = Date.now() + response.expires_in * 1000;

      const basicUser = {
        username: response.username,
        school_id: response.school_id,
        encryption_ready: response.encryption_ready.toString(),
        is_first_school_user: String(response.is_first_school_user === true),
      };
      const loginPublished = await withAccountDataLifecycleLock(async () => {
        if (!canWriteAccountData(writeGeneration)) return false;
        if (!completeAccountDataDeletion(writeGeneration)) return false;
        setToken(response.access_token);
        setUser(basicUser);
        setIsAuthenticated(true);
        localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
        rememberAccountToken(response.access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
        localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString());
        localStorage.setItem(USER_KEY, JSON.stringify(basicUser));
        return true;
      });

      if (!loginPublished) {
        try {
          await authAPI.logout(response.access_token);
        } catch {
          // The server may already have revoked this session during deletion.
        }
        return false;
      }
      configureAccountAnalytics(response.access_token, getApiBaseUrl(), `${response.school_id}:${response.username.toLowerCase()}`, authAPI.getValidSessionToken);
      void capture('login_succeeded');
      writeGeneration = captureAccountDataGeneration();

      try {
        const userResponse = await authAPI.getUserProfile(response.access_token);
        if (userResponse.success && canWriteAccountData(writeGeneration)) {
          const accountUser = {
            ...basicUser,
            ...userResponse.data,
            username: response.username,
            school_id: response.school_id,
            encryption_ready: response.encryption_ready.toString(),
            is_first_school_user: basicUser.is_first_school_user,
          };
          setUser(accountUser);
          localStorage.setItem(USER_KEY, JSON.stringify(accountUser));
        }
      } catch (error) {
        console.warn('Failed to fetch user profile:', error);
        if (canWriteAccountData(writeGeneration)) {
          setUser(basicUser);
        }
      }

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      void capture('login_failed');
      return false;
    }
  };

  const refreshToken = useCallback(async (): Promise<boolean> => {
    const writeGeneration = captureAccountDataGeneration();
    const currentAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (currentAccessToken) rememberAccountToken(currentAccessToken);
    const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshTokenValue) return false;

    try {
      const response = await authAPI.refreshToken(refreshTokenValue);

      if (!canWriteAccountData(writeGeneration)
        || localStorage.getItem(REFRESH_TOKEN_KEY) !== refreshTokenValue) return false;

      const expiresAt = Date.now() + response.expires_in * 1000;

      setToken(response.access_token);
      localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString());

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, []);

  const logout = async (shouldClearStorage: () => boolean = () => true) => {
    clearResourceCache();
    const clearStorage = shouldClearStorage();
    // Clear React state even when access to browser storage has been revoked.
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    let logoutToken = token;
    try {
      if (clearStorage) logoutToken = localStorage.getItem(ACCESS_TOKEN_KEY) || token;
    } catch {
      // The context still holds the token needed for best-effort remote logout.
    }
    if (clearStorage) clearSignedOutAccountData();
    const clearedGeneration = captureAccountDataGeneration();
    try {
      if (logoutToken) {
        try {
          const registration = 'serviceWorker' in navigator
            ? await navigator.serviceWorker.getRegistration()
            : undefined;
          const subscription = await registration?.pushManager.getSubscription();
          if (subscription) {
            try {
              const response = await notificationsAPI.unregisterSubscription(logoutToken, subscription.endpoint);
              if (!response.success) {
                console.warn('Push subscription cleanup during logout was rejected.');
              }
            } catch (error) {
              console.warn('Failed to remove push subscription from the server during logout:', error);
            } finally {
              try {
                await unsubscribeBrowserPushSubscription(subscription);
              } catch (error) {
                console.warn('Failed to unsubscribe push notifications during logout:', error);
              }
            }
          }
        } catch (error) {
          console.warn('Failed to remove push subscription during logout:', error);
        }
        await authAPI.logout(logoutToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // A later login owns its own state; delayed remote logout must not clear it.
      if (captureAccountDataGeneration() === clearedGeneration && shouldClearStorage()) {
        void capture('logout_completed').finally(resetAnalyticsIdentity);
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    token,
    user,
    login,
    logout,
    refreshToken,
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-surface-50 dark:bg-surface-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
