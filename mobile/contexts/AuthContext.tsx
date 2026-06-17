import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService } from '../services/authService';
import { storage } from '../utils/storage';

interface User {
  uid: number;
  username: string;
  nickname: string;
  avatar: string;
  is_admin: boolean;
  is_banned: boolean;
  banned_reason?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (userData: User, tokenStr: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: User) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化：从 AsyncStorage 读取
  useEffect(() => {
    const init = async () => {
      try {
        const savedToken = await storage.getToken();
        const savedUser = await storage.getUser();
        if (savedToken) {
          setToken(savedToken);
          if (savedUser) setUser(savedUser);
        }
      } catch (e) {
        console.warn('Failed to load auth state:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Token 变化时刷新 profile
  useEffect(() => {
    if (!token) return;

    let active = true;
    const doRefresh = async () => {
      try {
        const profile = await authService.getProfile();
        if (!active) return;
        setUser(profile);
        await storage.setUser(profile);
      } catch {
        if (!active) return;
        setUser(null);
        setToken(null);
        await storage.removeToken();
        await storage.removeUser();
      }
    };
    doRefresh();

    return () => { active = false; };
  }, [token]);

  const login = useCallback(async (userData: User, tokenStr: string) => {
    setUser(userData);
    setToken(tokenStr);
    await storage.setToken(tokenStr);
    await storage.setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await storage.clearAll();
  }, []);

  const updateUser = useCallback(async (userData: User) => {
    setUser(userData);
    await storage.setUser(userData);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await authService.getProfile();
      setUser(profile);
      await storage.setUser(profile);
    } catch (e) {
      console.warn('Failed to refresh profile:', e);
    }
  }, []);

  const isLoggedIn = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn, loading, login, logout, updateUser, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
