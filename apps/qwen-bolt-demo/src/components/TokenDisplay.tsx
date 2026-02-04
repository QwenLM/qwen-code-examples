'use client';

import { useToken } from '@/contexts/TokenContext';
import { Zap, ArrowUp, ArrowDown } from 'lucide-react';

export function TokenDisplay() {
  const { tokenStats } = useToken();

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg">
      <Zap className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <ArrowUp className="w-3 h-3 text-green-500 dark:text-green-400" />
          <span className="text-gray-600 dark:text-gray-400">Input:</span>
          <span className="font-medium text-gray-900 dark:text-gray-200">{tokenStats.inputTokens.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <ArrowDown className="w-3 h-3 text-purple-500 dark:text-purple-400" />
          <span className="text-gray-600 dark:text-gray-400">Output:</span>
          <span className="font-medium text-gray-900 dark:text-gray-200">{tokenStats.outputTokens.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1 pl-2 border-l border-gray-300 dark:border-gray-600">
          <span className="text-gray-600 dark:text-gray-400">Total:</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">{tokenStats.totalTokens.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
