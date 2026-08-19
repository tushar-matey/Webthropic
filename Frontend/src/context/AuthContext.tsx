import React, { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api.js';
import type { User } from '../Types/types.js';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (token: string, password: string) => Promise<User>;
  verifyEmail: (token: string) => Promise<User>;
  resendVerification: (email?: string) => Promise<{ success: boolean; message: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch currently authenticated user via session cookie
  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await api.get<{ authenticated: boolean; user: User | null }>('/api/auth/me');
      if (response.data.authenticated && response.data.user) {
        setUser(response.data.user);
        return response.data.user;
      } else {
        setUser(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await api.post<{ success: boolean; user: User }>('/api/auth/login', {
      email,
      password
    });
    const loggedInUser = response.data.user;
    setUser(loggedInUser);
    return loggedInUser;
  };

  const signup = async (name: string, email: string, password: string): Promise<User> => {
    const response = await api.post<{ success: boolean; user: User }>('/api/auth/register', {
      name,
      email,
      password
    });
    const registeredUser = response.data.user;
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
    }
  };

  const forgotPassword = async (email: string) => {
    const response = await api.post<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      email
    });
    return response.data;
  };

  const resetPassword = async (token: string, password: string): Promise<User> => {
    const response = await api.post<{ success: boolean; user: User }>('/api/auth/reset-password', {
      token,
      password
    });
    const updatedUser = response.data.user;
    setUser(updatedUser);
    return updatedUser;
  };

  const verifyEmail = async (token: string): Promise<User> => {
    const response = await api.post<{ success: boolean; user: User }>('/api/auth/verify-email', {
      token
    });
    const verifiedUser = response.data.user;
    setUser(verifiedUser);
    return verifiedUser;
  };

  const resendVerification = async (email?: string) => {
    const response = await api.post<{ success: boolean; message: string }>('/api/auth/resend-verification', {
      email
    });
    return response.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshUser,
        forgotPassword,
        resetPassword,
        verifyEmail,
        resendVerification
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
