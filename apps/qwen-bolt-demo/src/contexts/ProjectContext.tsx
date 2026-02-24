'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface UploadedFile {
  id: string;
  name: string;
  path: string;
  content: string;
  type: 'file' | 'folder';
  size: number;
  folderName?: string; // Original folder name if uploaded as part of a folder
}

export interface ModelConfig {
  authType: 'qwen-oauth' | 'openai-api-key';
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ProjectSettings {
  knowledge: string;
  uploadedFiles: UploadedFile[];
  modelConfig: ModelConfig;
}

interface ProjectContextType {
  settings: ProjectSettings;
  isLoaded: boolean;
  updateKnowledge: (knowledge: string) => void;
  addFiles: (files: UploadedFile[]) => void;
  removeFile: (fileId: string) => void;
  clearAllFiles: () => void;
  updateModelConfig: (config: Partial<ModelConfig>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: ProjectSettings = {
  knowledge: '',
  uploadedFiles: [],
  modelConfig: {
    authType: 'qwen-oauth',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'qwen-coder-plus',
  },
};

const STORAGE_KEY = 'qwen-project-settings';

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        console.log('[ProjectContext] Loading settings from localStorage:', stored);
        const parsed = JSON.parse(stored);
        // Merge with default settings to ensure new fields are present
        setSettings(prev => ({
            ...prev,
            ...parsed,
            modelConfig: { ...prev.modelConfig, ...parsed.modelConfig }
        }));
      } catch (e) {
        console.error('Failed to parse project settings:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateKnowledge = useCallback((knowledge: string) => {
    setSettings(prev => ({ ...prev, knowledge }));
  }, []);

  const addFiles = useCallback((files: UploadedFile[]) => {
    setSettings(prev => ({
      ...prev,
      uploadedFiles: [...prev.uploadedFiles, ...files],
    }));
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setSettings(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter(f => f.id !== fileId),
    }));
  }, []);

  const clearAllFiles = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      uploadedFiles: [],
    }));
  }, []);

  const updateModelConfig = useCallback((config: Partial<ModelConfig>) => {
    console.log('[ProjectContext] updateModelConfig called with:', config);
    setSettings(prev => {
      const newSettings = {
        ...prev,
        modelConfig: { ...prev.modelConfig, ...config },
      };
      console.log('[ProjectContext] New settings:', newSettings);
      return newSettings;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = React.useMemo(() => ({
    settings,
    isLoaded,
    updateKnowledge,
    addFiles,
    removeFile,
    clearAllFiles,
    updateModelConfig,
    resetSettings,
  }), [settings, isLoaded, updateKnowledge, addFiles, removeFile, clearAllFiles, updateModelConfig, resetSettings]);

  // Delay rendering children until settings are loaded from localStorage.
  // This prevents hydration mismatch: SSR renders with DEFAULT_SETTINGS,
  // but the client may load different settings from localStorage, causing
  // components like ModelSelector to render different content.
  if (!isLoaded) {
    return (
      <ProjectContext.Provider value={value}>
        {null}
      </ProjectContext.Provider>
    );
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

// Check whether we are inside a Provider
export function useProjectOptional() {
  return useContext(ProjectContext);
}
