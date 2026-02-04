'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSound } from '@/hooks/useSound';

interface NotificationSettings {
  soundEnabled: boolean;
  volume: number;
}

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  playNotification: () => void;
  playSuccess: () => void;
  playError: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'qwen-notification-settings';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<NotificationSettings>({
    soundEnabled: true,
    volume: 0.5,
  });

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse notification settings:', e);
      }
    }
  }, []);

  const { playNotification, playSuccess, playError, setIsEnabled } = useSound({
    volume: settings.volume,
    enabled: settings.soundEnabled,
  });

  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (newSettings.soundEnabled !== undefined) {
        setIsEnabled(newSettings.soundEnabled);
      }
      return updated;
    });
  }, [setIsEnabled]);

  return (
    <NotificationContext.Provider
      value={{
        settings,
        updateSettings,
        playNotification,
        playSuccess,
        playError,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
