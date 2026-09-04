import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginPayload } from '../types/auth';
import { loginApi } from '../api/auth';
import { getErrorMessage } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isViewer: boolean;
  authError: string | null;
  login: (credentials: LoginPayload) => Promise<void>;
  logout: () => void;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('qr_auth_token'));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('qr_auth_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [authError, setAuthError] = useState<string | null>(() => localStorage.getItem('qr_auth_error'));

  useEffect(() => {
    // Sync error from localStorage if set by interceptor
    const handleStorageChange = () => {
      const err = localStorage.getItem('qr_auth_error');
      if (err) {
        setAuthError(err);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (credentials: LoginPayload) => {
    try {
      setAuthError(null);
      localStorage.removeItem('qr_auth_error');
      const data = await loginApi(credentials);
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('qr_auth_token', data.token);
      localStorage.setItem('qr_auth_user', JSON.stringify(data.user));
    } catch (err: any) {
      const message = getErrorMessage(err);
      setAuthError(message);
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('qr_auth_token');
    localStorage.removeItem('qr_auth_user');
    localStorage.removeItem('qr_auth_error');
  };

  const clearAuthError = () => {
    setAuthError(null);
    localStorage.removeItem('qr_auth_error');
  };

  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.role === 'Admin';
  const isViewer = user?.role === 'Viewer';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isViewer,
        authError,
        login,
        logout,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
