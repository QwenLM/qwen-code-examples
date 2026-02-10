'use client';

import { Code2, X, Download } from 'lucide-react';
import { ModelSelector } from '@/components/ModelSelector';
import { ContextSettings } from '@/components/ContextSettings';
import { ModelConfigSettings } from '@/components/ModelConfigSettings';
import { Tooltip } from '@/components/ui/Tooltip';
import { useTranslation } from 'react-i18next';

interface ChatHeaderProps {
  onDownloadProject?: () => void;
}

export function ChatHeader({ onDownloadProject }: ChatHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="border-b border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-black">
      {/* First row: Title and close button */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold">Qwen Coder</span>
        </div>
        <div className="flex items-center gap-2">
          {onDownloadProject && (
            <Tooltip content={t('chat.downloadProject')} side="bottom">
              <button
                onClick={onDownloadProject}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                {t('chat.download')}
              </button>
            </Tooltip>
          )}
          <Tooltip content={t('chat.backToHome')} side="bottom">
            <button 
              onClick={() => window.location.href = '/'}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </Tooltip>
        </div>
      </div>
      
      {/* Second row: Function buttons */}
      <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-100/60 dark:border-gray-800/40">
        <ModelSelector />
        <ContextSettings />
        <ModelConfigSettings />
      </div>
    </div>
  );
}
