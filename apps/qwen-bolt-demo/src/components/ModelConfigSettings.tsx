'use client';

import { Sliders, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import type { ModelConfig } from '@/contexts/ProjectContext';

export function ModelConfigSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateModelConfig, resetSettings } = useProject();
  const [modelConfig, setModelConfig] = useState<ModelConfig>(settings.modelConfig);

  // 当 settings 更新时或打开弹窗时，同步更新本地状态
  useEffect(() => {
    if (isOpen) {
      setModelConfig(settings.modelConfig);
    }
  }, [settings.modelConfig, isOpen]);

  const handleSave = () => {
    updateModelConfig(modelConfig);
    setIsOpen(false);
  };

  return (
    <>
      {/* Model Config Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        aria-label="Model configuration"
        title="Model Configuration - Configure authentication and model settings"
      >
        <Sliders className="w-5 h-5 text-gray-400" />
      </button>

      {/* Model Config Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 border border-gray-200 dark:border-gray-700 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Model Configuration
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Authentication Type
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Choose how to authenticate with the AI service.
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <input
                      type="radio"
                      name="authType"
                      value="qwen-oauth"
                      checked={modelConfig.authType === 'qwen-oauth'}
                      onChange={(e) => setModelConfig(prev => ({ ...prev, authType: e.target.value as 'qwen-oauth' }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Qwen OAuth (Recommended)</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Free with 2,000 daily requests. Browser login required.</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <input
                      type="radio"
                      name="authType"
                      value="openai-api-key"
                      checked={modelConfig.authType === 'openai-api-key'}
                      onChange={(e) => setModelConfig(prev => ({ ...prev, authType: e.target.value as 'openai-api-key' }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">OpenAI API Key</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Use OpenAI-compatible API with custom endpoint.</div>
                    </div>
                  </label>
                </div>
              </div>

              {modelConfig.authType === 'openai-api-key' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={modelConfig.apiKey}
                      onChange={(e) => setModelConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={modelConfig.baseUrl}
                      onChange={(e) => setModelConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                      placeholder="https://api.openai.com/v1"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Select the AI model to use for code generation.
                </p>
                <select
                  value={modelConfig.model}
                  onChange={(e) => setModelConfig(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-100"
                >
                  <optgroup label="Qwen Models">
                    <option value="qwen3-coder-plus">Qwen3 Coder Plus - Most capable coding model</option>
                    <option value="qwen3-coder-turbo">Qwen3 Coder Turbo - Fast and efficient</option>
                    <option value="qwen3-plus">Qwen3 Plus - General purpose</option>
                    <option value="qwen3-turbo">Qwen3 Turbo - Balanced performance</option>
                    <option value="qwen3-max">Qwen3 Max - Maximum capability</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={resetSettings}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Reset All
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
