'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface UploadedFile {
  id: string;
  name: string;
  path: string;
  content: string;
  type: 'file' | 'folder';
  size: number;
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
    model: 'qwen3-coder-plus',
  },
};

const STORAGE_KEY = 'qwen-project-settings';

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ProjectSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings(parsed);
      } catch (e) {
        console.error('Failed to parse project settings:', e);
      }
    }
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

  return (
    <ProjectContext.Provider
      value={{
        settings,
        updateKnowledge,
        addFiles,
        removeFile,
        clearAllFiles,
        updateModelConfig,
        resetSettings,
      }}
    >
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

// 用于检查是否在 Provider 内部
export function useProjectOptional() {
  return useContext(ProjectContext);
}
