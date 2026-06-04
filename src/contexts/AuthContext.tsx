import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType, LoginRequest, User } from '../types';
import { authAPI } from '../services/api';

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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth state from localStorage on app start
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginRequest): Promise<boolean> => {
    try {
      const response = await authAPI.login(credentials);
      
      setToken(response.token);
      setIsAuthenticated(true);
      
      // Store auth state in localStorage
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify({
        username: response.username,
        school_id: response.school_id,
        encryption_ready: response.encryption_ready
      }));
      
      // Fetch user profile after login
      try {
        const userResponse = await authAPI.getUserProfile(response.token);
        if (userResponse.success) {
          setUser(userResponse.data);
          localStorage.setItem('auth_user', JSON.stringify(userResponse.data));
        }
      } catch (error) {
        console.warn('Failed to fetch user profile:', error);
        // Continue with basic user info from login response
        setUser({
          username: response.username,
          school_id: response.school_id,
          encryption_ready: response.encryption_ready.toString()
        });
      }
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await authAPI.logout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear auth state regardless of API call result
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    token,
    user,
    login,
    logout,
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-surface-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};