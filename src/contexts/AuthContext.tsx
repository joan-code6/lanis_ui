import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContextType, LoginRequest, User } from '../types';
import { authAPI, notificationsAPI, unsubscribeBrowserPushSubscription } from '../services/api';
import {
  CUSTOM_BACKEND_STORAGE_KEY,
  clearBackendScopedStorage,
} from '../utils/backendConfig';
import {
  ACCOUNT_DATA_LIFECYCLE_LOCK_KEY,
  canWriteAccountData,
  captureAccountDataGeneration,
  completeAccountDataDeletion,
  finishAccountDataDeletion,
  hasAccountDataDeletionMarker,
  recordAccountDataDeletion,
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const initializeAuth = async () => {
      try {
        await withAccountDataLifecycleLock(async () => {
          if (hasAccountDataDeletionMarker()) {
            const deletionGeneration = captureAccountDataGeneration();
            const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
            if (savedToken) {
              try {
                const profile = await authAPI.getUserProfile(savedToken);
                finishAccountDataDeletion(deletionGeneration);
                setToken(savedToken);
                setUser(profile.data);
                setIsAuthenticated(true);
                return;
              } catch (error) {
                const status = (error as { response?: { status?: number } })?.response?.status;
                // Only a server rejection confirms that the pending request deleted
                // this session. A network failure must not erase a still-live account.
                if (status !== 401 && status !== 403) return;
              }
            } else {
              // Without a server-verifiable session, a pending marker is not proof
              // that account deletion completed.
              return;
            }
            const customBackendUrl = localStorage.getItem(CUSTOM_BACKEND_STORAGE_KEY);
            recordAccountDataDeletion();
            clearBackendScopedStorage();
            for (let index = localStorage.length - 1; index >= 0; index -= 1) {
              const key = localStorage.key(index);
              if (
                key
                && key !== CUSTOM_BACKEND_STORAGE_KEY
                && key !== '__lanis_account_data_generation'
                && key !== '__lanis_account_deletion_epoch'
                && key !== ACCOUNT_DATA_LIFECYCLE_LOCK_KEY
              ) {
                localStorage.removeItem(key);
              }
            }
            if (customBackendUrl) localStorage.setItem(CUSTOM_BACKEND_STORAGE_KEY, customBackendUrl);

            const cleanupTasks: Promise<unknown>[] = [];
            if ('serviceWorker' in navigator) {
              cleanupTasks.push(Promise.resolve().then(async () => {
                const registration = await navigator.serviceWorker.getRegistration();
                const subscription = await registration?.pushManager.getSubscription();
                if (subscription) await subscription.unsubscribe();
              }));
            }
            if ('caches' in window) {
              cleanupTasks.push(Promise.resolve().then(async () => {
                const names = await caches.keys();
                await Promise.all(
                  names
                    .filter(name => !name.startsWith('lanis-ui-shell-'))
                    .map(name => caches.delete(name)),
                );
              }));
            }
            await Promise.allSettled(cleanupTasks);
            finishAccountDataDeletion(deletionGeneration);
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
            return;
          }

          const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
          const savedUser = localStorage.getItem(USER_KEY);
          if (savedToken && savedUser) {
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

    void initializeAuth();
    return () => {
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
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    let writeGeneration = captureAccountDataGeneration();
    try {
      const response = await authAPI.login(credentials);

      const expiresAt = Date.now() + response.expires_in * 1000;

      const basicUser = {
        username: response.username,
        school_id: response.school_id,
        encryption_ready: response.encryption_ready.toString(),
      };
      const loginPublished = await withAccountDataLifecycleLock(async () => {
        if (!canWriteAccountData(writeGeneration)) return false;
        if (!completeAccountDataDeletion(writeGeneration)) return false;
        setToken(response.access_token);
        setUser(basicUser);
        setIsAuthenticated(true);
        localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
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
      writeGeneration = captureAccountDataGeneration();

      try {
        const userResponse = await authAPI.getUserProfile(response.access_token);
        if (userResponse.success && canWriteAccountData(writeGeneration)) {
          const accountUser = {
            ...userResponse.data,
            username: response.username,
            school_id: response.school_id,
            encryption_ready: response.encryption_ready.toString(),
          };
          setUser(accountUser);
          localStorage.setItem(USER_KEY, JSON.stringify(accountUser));
        }
      } catch (error) {
        console.warn('Failed to fetch user profile:', error);
        if (canWriteAccountData(writeGeneration)) {
          setUser({
            username: response.username,
            school_id: response.school_id,
            encryption_ready: response.encryption_ready.toString(),
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const refreshToken = useCallback(async (): Promise<boolean> => {
    const writeGeneration = captureAccountDataGeneration();
    const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshTokenValue) return false;

    try {
      const response = await authAPI.refreshToken(refreshTokenValue);

      if (!canWriteAccountData(writeGeneration)) return false;

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
    try {
      if (token) {
        try {
          const registration = 'serviceWorker' in navigator
            ? await navigator.serviceWorker.getRegistration()
            : undefined;
          const subscription = await registration?.pushManager.getSubscription();
          if (subscription) {
            try {
              const response = await notificationsAPI.unregisterSubscription(token, subscription.endpoint);
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
        await authAPI.logout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      if (shouldClearStorage()) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRES_KEY);
        localStorage.removeItem(USER_KEY);
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
