'use client';

import { Code2, X } from 'lucide-react';
import { ModelSelector } from '@/components/ModelSelector';
import { ContextSettings } from '@/components/ContextSettings';
import { ModelConfigSettings } from '@/components/ModelConfigSettings';

export function ChatHeader() {
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
        <button 
          onClick={() => window.location.href = '/'}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          title="Back to home"
        >
          <X className="w-5 h-5" />
        </button>
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
