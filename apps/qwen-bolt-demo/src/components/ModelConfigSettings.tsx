'use client';

import { Sliders, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslation } from 'react-i18next';
import type { ModelConfig } from '@/contexts/ProjectContext';
import { Tooltip } from '@/components/ui/Tooltip';
import logger from '@/lib/logger';

export function ModelConfigSettings() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateModelConfig, resetSettings } = useProject();
  const [modelConfig, setModelConfig] = useState<ModelConfig>(settings.modelConfig);
  const [mounted, setMounted] = useState(false);

  // Sync local state when settings update or modal opens
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync local state when settings update or modal opens
  useEffect(() => {
    if (isOpen) {
      setModelConfig(settings.modelConfig);
    }
  }, [settings.modelConfig, isOpen]);

  const handleSave = () => {
    logger.debug('[ModelConfigSettings] Saving config:', modelConfig);
    updateModelConfig(modelConfig);
    setIsOpen(false);
  };

  return (
    <>
      {/* Model Config Button */}
      <Tooltip content={t('modelConfig.title')} side="bottom">
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 transition-colors"
          aria-label="Model configuration"
        >
          <Sliders className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </Tooltip>

      {/* Model Config Modal */}
      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 max-h-[85vh] flex flex-col relative animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('modelConfig.title')}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('projectSettings.authType')}
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  {t('projectSettings.authTypeDesc')}
                </p>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <input
                      type="radio"
                      name="authType"
                      value="qwen-oauth"
                      checked={modelConfig.authType === 'qwen-oauth'}
                      onChange={() => setModelConfig(prev => ({ ...prev, authType: 'qwen-oauth' }))}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Qwen OAuth (Recommended)</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Free with 2,000 daily requests. Browser login required.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <input
                      type="radio"
                      name="authType"
                      value="openai-api-key"
                      checked={modelConfig.authType === 'openai-api-key'}
                      onChange={() => setModelConfig(prev => ({ ...prev, authType: 'openai-api-key' }))}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">OpenAI API Key</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use OpenAI-compatible API with custom endpoint.</div>
                    </div>
                  </label>
                </div>
              </div>

              {modelConfig.authType === 'openai-api-key' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                       {t('projectSettings.apiKey')}
                    </label>
                    <input
                      type="password"
                      value={modelConfig.apiKey}
                      onChange={(e) => setModelConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                       {t('projectSettings.baseUrl')}
                    </label>
                    <input
                      type="text"
                      value={modelConfig.baseUrl}
                      onChange={(e) => setModelConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                      placeholder="https://api.openai.com/v1"
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                   {t('projectSettings.modelSelect')}
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                   {t('projectSettings.modelSelectDesc')}
                </p>
                <select
                  value={modelConfig.model}
                  onChange={(e) => setModelConfig(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                >
                  <optgroup label="Qwen Models">
                    <option value="qwen-coder-plus">Qwen Coder Plus - Most capable coding model</option>
                    <option value="qwen-coder-turbo">Qwen Coder Turbo - Fast and efficient</option>
                    <option value="qwen-plus">Qwen Plus - General purpose</option>
                    <option value="qwen-turbo">Qwen Turbo - Balanced performance</option>
                    <option value="qwen-max">Qwen Max - Maximum capability</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
              <button
                onClick={resetSettings}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                 {t('projectSettings.reset')}
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                   {t('projectSettings.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
                >
                   {t('projectSettings.done')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
