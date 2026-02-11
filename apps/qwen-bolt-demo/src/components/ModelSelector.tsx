'use client';

import { Cpu, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@/components/ui/Tooltip';

export function ModelSelector({ align = 'right' }: { align?: 'left' | 'right' }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateModelConfig } = useProject();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleModelSelect = (model: string) => {
    console.log('[ModelSelector] Selecting model:', model);
    console.log('[ModelSelector] Current model before update:', settings.modelConfig.model);
    updateModelConfig({ model });
    console.log('[ModelSelector] updateModelConfig called');
    setIsOpen(false);
  };

  const currentModel = settings.modelConfig.model;
  
  // Debug log
  useEffect(() => {
    console.log('[ModelSelector] Current model changed to:', currentModel);
  }, [currentModel]);
  
  const displayName = currentModel.includes('qwen-coder-plus')
    ? 'Qwen Coder+' 
    : currentModel.includes('qwen-coder-turbo')
    ? 'Qwen Coder Turbo'
    : currentModel.includes('qwen-plus')
    ? 'Qwen Plus'
    : currentModel.includes('qwen-turbo')
    ? 'Qwen Turbo'
    : currentModel.includes('qwen-max')
    ? 'Qwen Max'
    : currentModel || 'Qwen Coder+';

  return (
    <div className="relative" ref={dropdownRef}>
      <Tooltip content={t('projectSettings.modelSelect')} side="bottom">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 transition-colors text-sm text-gray-600 dark:text-gray-300"
        >
          <Cpu className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span>{displayName}</span>
          <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        </button>
      </Tooltip>

      {isOpen && (
        <div className={`absolute top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999] overflow-hidden ${align === 'left' ? 'left-0' : 'right-0'}`}>
          <div className="p-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 font-medium mb-2">Qwen Models</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleModelSelect('qwen-coder-plus')}
                className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                  currentModel.includes('qwen-coder-plus')
                    ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                }`}
              >
                <div className="font-medium text-xs">Qwen Coder+</div>
                <div className="text-xs opacity-70 mt-0.5">Most capable</div>
              </button>
              <button
                onClick={() => handleModelSelect('qwen-coder-turbo')}
                className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                  currentModel.includes('qwen-coder-turbo')
                    ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                }`}
              >
                <div className="font-medium text-xs">Qwen Coder Turbo</div>
                <div className="text-xs opacity-70 mt-0.5">Fast & efficient</div>
              </button>
              <button
                onClick={() => handleModelSelect('qwen-plus')}
                className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                  currentModel.includes('qwen-plus')
                    ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                }`}
              >
                <div className="font-medium text-xs">Qwen Plus</div>
                <div className="text-xs opacity-70 mt-0.5">General purpose</div>
              </button>
              <button
                onClick={() => handleModelSelect('qwen-turbo')}
                className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                  currentModel.includes('qwen-turbo')
                    ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                }`}
              >
                <div className="font-medium text-xs">Qwen Turbo</div>
                <div className="text-xs opacity-70 mt-0.5">Balanced</div>
              </button>
              <button
                onClick={() => handleModelSelect('qwen-max')}
                className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                  currentModel.includes('qwen-max')
                    ? 'bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                }`}
              >
                <div className="font-medium text-xs">Qwen3 Max</div>
                <div className="text-xs opacity-70 mt-0.5">Maximum</div>
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {settings.modelConfig.authType === 'qwen-oauth' ? (
                <span>✓ Using Qwen OAuth (Free)</span>
              ) : (
                <span>✓ Using OpenAI API Key</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
