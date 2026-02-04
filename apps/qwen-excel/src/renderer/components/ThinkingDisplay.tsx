import React, { useState } from 'react';
import { ThinkingBlock } from './types';

interface ThinkingDisplayProps {
  thinking: ThinkingBlock;
}

function ThinkingDisplay({ thinking }: ThinkingDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Show preview (first 100 chars)
  const preview = thinking.thinking.substring(0, 100);
  const hasMore = thinking.thinking.length > 100;

  return (
    <div className="my-2 border-l-4 border-purple-400 rounded-md overflow-hidden bg-purple-50">
      <div
        className="px-3 py-2 cursor-pointer hover:bg-purple-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💭</span>
            <span className="font-medium text-purple-700">Thinking</span>
            <span className="text-xs text-purple-600">
              Extended reasoning process
            </span>
          </div>
          <span className="text-purple-400 text-sm">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>

        {/* Show preview when collapsed */}
        {!isExpanded && (
          <div className="mt-1 text-sm text-purple-700 italic">
            {preview}
            {hasMore && '...'}
          </div>
        )}
      </div>

      {/* Expanded thinking view */}
      {isExpanded && (
        <div className="bg-white border-t border-purple-200 px-3 py-2">
          <div className="text-sm text-gray-700 italic whitespace-pre-wrap">
            {thinking.thinking}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThinkingDisplay;
