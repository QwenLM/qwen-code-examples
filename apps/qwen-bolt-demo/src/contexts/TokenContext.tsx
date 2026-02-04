'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface TokenStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface TokenContextType {
  tokenStats: TokenStats;
  addTokenUsage: (inputTokens: number, outputTokens: number) => void;
  resetTokenUsage: () => void;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const [tokenStats, setTokenStats] = useState<TokenStats>({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  });

  const addTokenUsage = useCallback((inputTokens: number, outputTokens: number) => {
    setTokenStats((prev) => ({
      inputTokens: prev.inputTokens + inputTokens,
      outputTokens: prev.outputTokens + outputTokens,
      totalTokens: prev.totalTokens + inputTokens + outputTokens,
    }));
  }, []);

  const resetTokenUsage = useCallback(() => {
    setTokenStats({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });
  }, []);

  return (
    <TokenContext.Provider value={{ tokenStats, addTokenUsage, resetTokenUsage }}>
      {children}
    </TokenContext.Provider>
  );
}

export function useToken() {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
}
