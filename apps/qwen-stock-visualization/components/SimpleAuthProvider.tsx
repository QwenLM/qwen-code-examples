'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { registerUser, loginUser, validateSession, logoutUser, getUserById } from '@/lib/simpleAuth';

type SimpleAuthContextType = {
  user: any | null;
  signUp: (email: string, password: string, nickname?: string) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  isLoading: boolean;
};

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on initial load
    const checkExistingSession = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const { valid, user } = await validateSession(token);
        if (valid && user) {
          setUser(user);
        } else {
          // Clear invalid token
          localStorage.removeItem('auth_token');
        }
      }
      setIsLoading(false);
    };

    checkExistingSession();
  }, []);

  const signUp = async (email: string, password: string, nickname?: string) => {
    const result = await registerUser(email, password, nickname);
    
    if (result.success) {
      // Automatically log in after successful registration
      return await signIn(email, password);
    }
    
    return result;
  };

  const signIn = async (email: string, password: string) => {
    const result = await loginUser(email, password);

    if (result.success) {
      setUser(result.user);
      localStorage.setItem('auth_token', result.token);
    }

    return result;
  };

  const signOut = async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      await logoutUser(token);
      localStorage.removeItem('auth_token');
    }
    setUser(null);
  };

  const value = {
    user,
    signUp,
    signIn,
    signOut,
    isLoading,
  };

  return <SimpleAuthContext.Provider value={value}>{children}</SimpleAuthContext.Provider>;
}

export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
}