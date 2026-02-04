'use client';

import { Cpu, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';

export function ModelSelector() {
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
  
  const displayName = currentModel.includes('qwen3-coder-plus') || currentModel.includes('qwen-coder-plus')
    ? 'Qwen3 Coder+' 
    : currentModel.includes('qwen3-coder-turbo') || currentModel.includes('qwen-coder-turbo')
    ? 'Qwen3 Coder Turbo'
    : currentModel.includes('qwen3-plus') || currentModel.includes('qwen-plus')
    ? 'Qwen3 Plus'
    : currentModel.includes('qwen3-turbo') || currentModel.includes('qwen-turbo')
    ? 'Qwen3 Turbo'
    : currentModel.includes('qwen3-max')
    ? 'Qwen3 Max'
    : currentModel || 'Qwen3 Coder+';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm"
        title="Select AI Model"
      >
        <Cpu className="w-4 h-4 text-gray-400" />
        <span className="text-gray-300">{displayName}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-gray-900 dark:bg-gray-900 border border-gray-700 dark:border-gray-700 rounded-lg shadow-xl z-[9999] overflow-hidden">
          <div className="p-3">
            <div className="text-xs text-gray-400 px-2 py-1 font-medium mb-2">Qwen Models</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleModelSelect('qwen3-coder-plus')}
                className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                  currentModel.includes('qwen3-coder-plus') || currentModel.includes('qwen-coder-plus')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="font-medium text-xs">Qwen3 Coder+</div>
                <div className="text-xs opacity-70 mt-0.5">Most capable</div>
              </button>
              <button
                onClick={() => handleModelSelect('qwen3-coder-turbo')}
                className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                  currentModel.includes('qwen3-coder-turbo') || currentModel.includes('qwen-coder-turbo')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="font-medium text-xs">Qwen3 Coder Turbo</div>
                <div className="text-xs opacity-70 mt-0.5">Fast & efficient</div>
              </button>
              <button
                onClick={() => handleModelSelect('qwen3-plus')}
                className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                  currentModel.includes('qwen3-plus') || currentModel.includes('qwen-plus')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="font-medium text-xs">Qwen3 Plus</div>
                <div className="text-xs opacity-70 mt-0.5">General purpose</div>
              </button>
              <button
                onClick={() => handleModelSelect('qwen3-turbo')}
                className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                  currentModel.includes('qwen3-turbo') || currentModel.includes('qwen-turbo')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="font-medium text-xs">Qwen3 Turbo</div>
                <div className="text-xs opacity-70 mt-0.5">Balanced</div>
              </button>
              <button
                onClick={() => handleModelSelect('qwen3-max')}
                className={`text-left px-3 py-2 rounded text-sm transition-colors ${
                  currentModel.includes('qwen3-max')
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div className="font-medium text-xs">Qwen3 Max</div>
                <div className="text-xs opacity-70 mt-0.5">Maximum</div>
              </button>
            </div>
          </div>

          <div className="border-t border-gray-700 px-3 py-2">
            <div className="text-xs text-gray-500">
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
