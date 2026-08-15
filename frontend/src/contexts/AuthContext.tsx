import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, clearStoredAuth, getStoredToken, setStoredTokens, API_URL } from '../utils/apiClient';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  status?: string;
  created_at?: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (token: string, user: User, rememberMe?: boolean, refreshToken?: string) => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<any>;
  register: (email: string, name: string, phone: string, password: string) => Promise<any>;
  googleLogin: (email: string, name: string, googleId?: string, credential?: string) => Promise<any>;
  updateUser: (user: User) => void;
  sessionExpiredAlert: boolean;
  dismissSessionAlert: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { API_URL };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionExpiredAlert, setSessionExpiredAlert] = useState<boolean>(false);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Swallowed if offline/network failure during logout
    } finally {
      clearStoredAuth();
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error(e);
      }
      setToken(null);
      setUser(null);
    }
  }, []);

  const deleteAccount = async () => {
    try {
      const res = await apiClient.delete('/auth/account');
      return res.data;
    } finally {
      clearStoredAuth();
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error(e);
      }
      setToken(null);
      setUser(null);
    }
  };

  const dismissSessionAlert = () => setSessionExpiredAlert(false);

  // Listen for session expiration event emitted by apiClient
  useEffect(() => {
    const handleExpired = () => {
      logout();
      setSessionExpiredAlert(true);
    };

    window.addEventListener('finora:session-expired', handleExpired);
    return () => {
      window.removeEventListener('finora:session-expired', handleExpired);
    };
  }, [logout]);

  const login = (jwtToken: string, userData: User, rememberMe: boolean = true, refreshToken?: string) => {
    setStoredTokens(jwtToken, refreshToken, rememberMe);
    setToken(jwtToken);
    setUser(userData);
    setSessionExpiredAlert(false);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const activeToken = getStoredToken();
      if (!activeToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiClient.get('/auth/me');
        const userData = res.data.data || res.data;
        setUser(userData);
        setToken(activeToken);
      } catch (err) {
        console.error('Failed to load user profile:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [logout]);

  const register = async (email: string, name: string, phone: string, password: string) => {
    const res = await apiClient.post('/auth/register', { email, name, phone, password });
    const payload = res.data.data || res.data;
    if (payload.access_token && payload.user) {
      login(payload.access_token, payload.user, true, payload.refresh_token);
    }
    return payload;
  };

  const googleLogin = async (email: string, name: string, googleId?: string, credential?: string) => {
    const res = await apiClient.post('/auth/google', { email, name, google_id: googleId, credential });
    const payload = res.data.data || res.data;
    if (payload.access_token && payload.user) {
      login(payload.access_token, payload.user, true, payload.refresh_token);
    }
    return payload;
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ 
      token, user, loading, login, logout, deleteAccount, register, googleLogin, updateUser, 
      sessionExpiredAlert, dismissSessionAlert 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
