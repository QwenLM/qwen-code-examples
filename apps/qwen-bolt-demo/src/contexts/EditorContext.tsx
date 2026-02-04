'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface EditorSettings {
  fontSize: number;
  lineHeight: number;
  theme: 'light' | 'dark' | 'auto';
}

interface EditorContextType {
  settings: EditorSettings;
  updateSettings: (settings: Partial<EditorSettings>) => void;
  resetSettings: () => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  lineHeight: 1.6,
  theme: 'auto',
};

const STORAGE_KEY = 'qwen-editor-settings';

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse editor settings:', e);
      }
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<EditorSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }, []);

  return (
    <EditorContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}
