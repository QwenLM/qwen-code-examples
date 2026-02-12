'use client';

import { useState, useRef, useEffect } from 'react';
import Terminal from './Terminal';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TerminalPanelProps {
  devServerLogs?: string[];
  sessionId?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  onServerDetected?: (port: number) => void;
}

export function TerminalPanel({ 
  devServerLogs = [], 
  isOpen = true, 
  onToggle 
}: TerminalPanelProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'output'>('terminal');
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (activeTab === 'output' && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [devServerLogs, activeTab]);

  return (
    <div className="flex flex-col h-full w-full bg-[#1a1b26]">
      {/* Header */}
      <div className="flex items-center justify-between h-9 px-4 border-b border-gray-800 bg-[#1a1b26] flex-none">
        <div className="flex items-center gap-4 h-full text-sm">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`h-full border-b-2 px-2 transition-colors ${
              activeTab === 'terminal'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Terminal
          </button>
          <button
            onClick={() => setActiveTab('output')}
            className={`h-full border-b-2 px-2 transition-colors ${
              activeTab === 'output'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Output ({devServerLogs.length})
          </button>
        </div>
        
        {onToggle && (
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition-colors"
            title={isOpen ? "Minimize" : "Maximize"}
          >
            {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {/* Terminal Tab - Always kept active for process persistence */}
        <div 
          className="absolute inset-0 w-full h-full bg-[#1a1b26]"
          style={{ 
            visibility: activeTab === 'terminal' ? 'visible' : 'hidden',
            zIndex: activeTab === 'terminal' ? 10 : 0,
            display: activeTab === 'terminal' ? 'block' : 'none'
          }}
        >
          <Terminal />
        </div>

        {/* Output Tab */}
        <div 
          ref={outputRef}
          className="absolute inset-0 w-full h-full p-4 overflow-auto bg-[#1a1b26] font-mono text-sm"
          style={{ 
            visibility: activeTab === 'output' ? 'visible' : 'hidden',
            zIndex: activeTab === 'output' ? 10 : 0 
          }}
        >
          {devServerLogs.length === 0 ? (
            <div className="text-gray-500 italic">No output logs yet...</div>
          ) : (
            devServerLogs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap mb-1 text-gray-300">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
