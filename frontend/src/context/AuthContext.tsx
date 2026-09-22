import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  language: 'en' | 'ta' | 'hi' | 'te' | 'ml';
  setLanguage: (lang: 'en' | 'ta' | 'hi' | 'te' | 'ml') => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  demoLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('phytovision_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('phytovision_token'));
  const [language, setLanguageState] = useState<'en' | 'ta' | 'hi' | 'te' | 'ml'>(() => {
    return (localStorage.getItem('phytovision_lang') as any) || 'en';
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
          localStorage.setItem('phytovision_user', JSON.stringify(userData));
          if (userData.language) {
            setLanguageState(userData.language as any);
            localStorage.setItem('phytovision_lang', userData.language);
          }
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  const setLanguage = (lang: 'en' | 'ta' | 'hi' | 'te' | 'ml') => {
    setLanguageState(lang);
    localStorage.setItem('phytovision_lang', lang);
    if (user) {
      authApi.updateSettings({ language: lang }).catch(() => {});
    }
  };

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authApi.login(username, password);
      localStorage.setItem('phytovision_token', data.access_token);
      localStorage.setItem('phytovision_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      if (data.user.language) {
        setLanguageState(data.user.language as any);
        localStorage.setItem('phytovision_lang', data.user.language);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async () => {
    await login('demo_farmer', 'farmer123');
  };

  const logout = () => {
    localStorage.removeItem('phytovision_token');
    localStorage.removeItem('phytovision_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        language,
        setLanguage,
        login,
        logout,
        isLoading,
        demoLogin,
      }}
    >
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
