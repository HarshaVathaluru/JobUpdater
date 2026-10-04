"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { auth } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: typeof auth.login;
  register: typeof auth.register;
  logout: typeof auth.logout;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (auth.isAuthenticated()) {
          const profile = await auth.getProfile();
          setUser(profile);
        }
      } catch (error) {
        console.error('Auth check failed', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (...args: Parameters<typeof auth.login>) => {
    const user = await auth.login(...args);
    setUser(user);
    return user;
  };

  const register = async (...args: Parameters<typeof auth.register>) => {
    const user = await auth.register(...args);
    setUser(user);
    return user;
  };

  const logout = () => {
    auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
