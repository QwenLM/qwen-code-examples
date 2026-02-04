'use client';

import { Eye, FileCode } from 'lucide-react';
import { EditorSettings } from '@/components/EditorSettings';
import { ThemeToggle } from '@/components/ThemeToggle';

type ViewMode = 'code' | 'preview';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200/60 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200/60 dark:border-gray-700/60">
        <button
          onClick={() => onViewModeChange('code')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
            viewMode === 'code'
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50'
          }`}
          title="Code View"
        >
          <FileCode className="w-4 h-4" />
          <span>Code</span>
        </button>
        <button
          onClick={() => onViewModeChange('preview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
            viewMode === 'preview'
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700/50'
          }`}
          title="Preview View"
        >
          <Eye className="w-4 h-4" />
          <span>Preview</span>
        </button>
      </div>
      <div className="flex items-center gap-2">
        <EditorSettings />
        <ThemeToggle />
      </div>
    </div>
  );
}

export type { ViewMode };
