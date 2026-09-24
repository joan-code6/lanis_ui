import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContextType, LoginRequest, User } from '../types';
import { authAPI, notificationsAPI, unsubscribeBrowserPushSubscription } from '../services/api';
import {
  canWriteAccountData,
  captureAccountDataGeneration,
  completeAccountDataDeletion,
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
    const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }

    setIsLoading(false);
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

      if (!canWriteAccountData(writeGeneration)) {
        try {
          await authAPI.logout(response.access_token);
        } catch {
          // The server may already have revoked this session during deletion.
        }
        return false;
      }

      const expiresAt = Date.now() + response.expires_in * 1000;

      const basicUser = {
        username: response.username,
        school_id: response.school_id,
        encryption_ready: response.encryption_ready.toString(),
      };
      setToken(response.access_token);
      setUser(basicUser);
      setIsAuthenticated(true);

      localStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
      localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString());
      localStorage.setItem(USER_KEY, JSON.stringify(basicUser));
      completeAccountDataDeletion();
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

  const logout = async () => {
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
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRES_KEY);
      localStorage.removeItem(USER_KEY);
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
