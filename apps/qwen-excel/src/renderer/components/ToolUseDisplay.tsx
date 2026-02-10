import React, { useState } from 'react';
import {
  getToolMetadata,
  formatToolInput,
  getFriendlyParameterName,
} from './utils/toolMetadata';
import { ToolUseBlock } from './types';

interface ToolUseDisplayProps {
  toolUse: ToolUseBlock;
}

function ToolUseDisplay({ toolUse }: ToolUseDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const metadata = getToolMetadata(toolUse.name);
  const formattedInput = formatToolInput(toolUse.name, toolUse.input);

  // Check if there are any parameters to show
  const hasParameters = formattedInput.length > 0;

  return (
    <div
      className="my-2 border-l-4 rounded-md overflow-hidden"
      style={{ borderLeftColor: metadata.color }}
    >
      <div
        className="bg-gray-50 px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => hasParameters && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{metadata.icon}</span>
            <span className="font-medium text-gray-700">{toolUse.name}</span>
            <span className="text-xs text-gray-500">{metadata.description}</span>
          </div>
          {hasParameters && (
            <span className="text-gray-400 text-sm">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
        </div>

        {/* Show first parameter inline when collapsed */}
        {!isExpanded && hasParameters && formattedInput.length > 0 && (
          <div className="mt-1 text-xs text-gray-600 truncate">
            <span className="font-medium">
              {getFriendlyParameterName(formattedInput[0].key)}:
            </span>{' '}
            {formattedInput[0].value}
          </div>
        )}
      </div>

      {/* Expanded parameters view */}
      {isExpanded && hasParameters && (
        <div className="bg-white border-t border-gray-200">
          {formattedInput.map((param, index) => (
            <div
              key={index}
              className="px-3 py-2 border-b border-gray-100 last:border-b-0"
            >
              <div className="text-xs font-medium text-gray-600 mb-1">
                {getFriendlyParameterName(param.key)}
              </div>
              <div className="text-sm text-gray-800">
                {param.value.includes('\n') ? (
                  <pre className="bg-gray-50 rounded p-2 overflow-x-auto text-xs">
                    <code>{param.value}</code>
                  </pre>
                ) : (
                  <code className="bg-gray-50 rounded px-2 py-1 text-xs break-all">
                    {param.value}
                  </code>
                )}
                {param.truncated && (
                  <span className="text-xs text-gray-500 ml-1">(truncated)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ToolUseDisplay;
