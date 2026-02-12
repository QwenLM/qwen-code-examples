'use client';

import { Code2, Maximize2, Minimize2, RotateCcw, Sparkles, RefreshCw, Power } from 'lucide-react';
import { useState } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';

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
  sessionId: string;
  hasFiles: boolean;
  onStartServer: () => void;
  onRefresh: () => void;
  onRestart?: () => void;
  onOpenInNewTab: () => void;
}

export function PreviewPanel({
  previewUrl,
  devServer,
  isStartingServer,
  serverError,
  sessionId,
  hasFiles,
  onStartServer,
  onRefresh,
  onRestart,
  onOpenInNewTab,
}: PreviewPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const showStartButton = false; // Disabled as per requirement to auto-start

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const containerClass = isFullscreen 
    ? "fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col" 
    : "w-full flex flex-col bg-gray-50 dark:bg-gray-900 h-full relative";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Preview {isFullscreen ? '(Fullscreen)' : ''}</h2>
          {devServer && !isFullscreen && ( // Hide details in fullscreen to save space or keep neat
            <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
              {devServer.framework} • Port {devServer.port}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {showStartButton && (
            <Tooltip content="Start Preview" side="bottom">
              <button
                onClick={onStartServer}
                disabled={isStartingServer}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                {isStartingServer ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Start Preview</span>
                  </>
                )}
              </button>
            </Tooltip>
          )}
          {previewUrl && (
            <>
              {onRestart && (
                <Tooltip content="Restart Dev Server" side="bottom">
                  <button
                    onClick={onRestart}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-red-500/70 hover:text-red-600"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </Tooltip>
              )}
              <Tooltip content="Refresh Preview Page" side="bottom">
                <button
                  onClick={onRefresh}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </Tooltip>
              <Tooltip content={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"} side="bottom">
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" /> : <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                </button>
              </Tooltip>
            </>
          )}
        </div>
      </div>

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
              <Code2 className="w-16 h-16 mx-auto mb-4 opacity-30 text-gray-400 dark:text-gray-600" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">No Preview Available</p>
              <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                {hasFiles
                  ? 'Click "Start Preview" to run your app'
                  : 'Start chatting with AI to generate your app'}
              </p>
              {serverError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs text-left">
                  <p className="font-semibold mb-1">Error starting preview:</p>
                  <p className="font-mono">{serverError}</p>
                </div>
              )}
              {isStartingServer && (
                <div className="mt-4 flex items-center justify-center gap-2 text-blue-400">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Starting development server...</span>
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
