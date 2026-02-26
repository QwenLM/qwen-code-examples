'use client';

import { Code2, Maximize2, Minimize2, FileCode2, Globe } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '@/components/ui/Tooltip';
import type { ProjectType } from '@/hooks/useDevServer';

interface DevServer {
  port: number;
  framework: string;
  url: string;
}

interface PreviewPanelProps {
  previewUrl: string;
  devServer: DevServer | null;
  isStartingServer: boolean;
  serverError: string;
  hasFiles: boolean;
  onOpenInNewTab: () => void;
  projectType?: ProjectType;
  isChatLoading?: boolean;
}

export function PreviewPanel({
  previewUrl,
  devServer,
  isStartingServer,
  serverError,
  hasFiles,
  onOpenInNewTab,
  projectType = 'empty',
  isChatLoading = false,
}: PreviewPanelProps) {
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const containerClass = isFullscreen 
    ? "fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col" 
    : "w-full flex flex-col bg-gray-50 dark:bg-gray-900 h-full relative";

  return (
    <div className={containerClass}>
      {/* Fullscreen toggle — floating button in top-right corner */}
      {isFullscreen && (
        <div className="absolute top-2 right-2 z-10">
          <Tooltip content={t('preview.exitFullscreen')} side="bottom">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 bg-white/80 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 rounded shadow-md backdrop-blur-sm transition-colors"
            >
              <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </Tooltip>
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 relative ${previewUrl ? 'bg-white' : 'bg-white dark:bg-gray-900'}`}>
        {previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title="Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center px-8">
              {isChatLoading ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <div className="w-10 h-10 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{t('preview.generating')}</p>
                  <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                    {t('preview.generatingDesc')}
                  </p>
                </>
              ) : projectType === 'static-html' ? (
                <>
                  <FileCode2 className="w-16 h-16 mx-auto mb-4 opacity-30 text-blue-400 dark:text-blue-500" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{t('preview.preparingHtml')}</p>
                  <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                    {t('preview.preparingHtmlDesc')}
                  </p>
                </>
              ) : projectType === 'node' && hasFiles ? (
                <>
                  <Globe className="w-16 h-16 mx-auto mb-4 opacity-30 text-green-400 dark:text-green-500" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{t('preview.noPreview')}</p>
                  {isStartingServer ? (
                    <div className="mt-4 flex items-center justify-center gap-2 text-blue-400">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">{t('preview.startingServer')}</span>
                    </div>
                  ) : (
                    <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                      {t('preview.runCommand')}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Code2 className="w-16 h-16 mx-auto mb-4 opacity-30 text-gray-400 dark:text-gray-600" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white">{t('preview.noFiles')}</p>
                  <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                    {t('preview.noFilesDesc')}
                  </p>
                </>
              )}
              {serverError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs text-left">
                  <p className="font-semibold mb-1">{t('preview.serverError')}</p>
                  <p className="font-mono">{serverError}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export type { DevServer };
