'use client';

import React, { useState, useEffect } from 'react';
import { Terminal as TerminalIcon, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import Terminal from './Terminal';

interface TerminalTab {
  id: string;
  name: string;
}

interface TerminalPanelProps {
  devServerLogs?: string[];
  sessionId?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  onServerDetected?: (port: number) => void;
}

export function TerminalPanel({ devServerLogs = [], sessionId, isOpen = true, onToggle, onServerDetected }: TerminalPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('bolt');
  // 默认不创建 Terminal，用户需要时再添加，或者自动添加一个 Terminal-1 但要确保它拿到 sessionId
  const [terminals, setTerminals] = useState<TerminalTab[]>([]);

  // 监听 sessionId 变化，一旦有了 sessionId，如果列表为空，自动创建一个连接到该 session 的终端
  useEffect(() => {
    if (sessionId && terminals.length === 0) {
       setTerminals([{ id: 'terminal-1', name: 'Terminal 1' }]);
    }
  }, [sessionId]);

  // Trigger resize when opening/switching tabs to ensure xterm fits
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  }, [isOpen, activeTab]);

  // Add new terminal
  const addTerminal = () => {
    if (!sessionId) return;
    const newId = `terminal-${terminals.length + 1}`;
    setTerminals([...terminals, { id: newId, name: `Terminal ${terminals.length + 1}` }]);
    setActiveTab(newId);
  };

  // Remove terminal
  const removeTerminal = (id: string) => {
    const filtered = terminals.filter(t => t.id !== id);
    setTerminals(filtered);
    if (activeTab === id && filtered.length > 0) {
      setActiveTab(filtered[0].id);
    } else if (activeTab === id) {
      setActiveTab('bolt');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {/* Dev Server tab */}
          <button
            onClick={() => setActiveTab('bolt')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors ${
              activeTab === 'bolt'
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <span className="text-lg leading-none">🚀</span>
            <span>Dev Server</span>
          </button>

          {/* Terminal tabs */}
          {terminals.map((terminal) => (
            <button
              key={terminal.id}
              onClick={() => setActiveTab(terminal.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors group relative pr-7 ${
                activeTab === terminal.id
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-b-2 border-blue-500'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              <TerminalIcon className="w-3 h-3" />
              <span>{terminal.name}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  removeTerminal(terminal.id);
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
              >
                <X className="w-3 h-3" />
              </span>
            </button>
          ))}

          {/* Add terminal button */}
          <button
            onClick={addTerminal}
            disabled={!sessionId}
            className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded transition-colors ${
              !sessionId 
                ? 'opacity-50 cursor-not-allowed text-gray-400' 
                : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500'
            }`}
            title={sessionId ? "Add Terminal" : "Start a chat to enable terminal"}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Hide/Show button */}
        {onToggle && (
          <button
            onClick={onToggle}
            className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 px-2 transition-colors"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Content Area */}
      {isOpen && (
        <div className="flex-1 min-h-0 bg-white dark:bg-[#1e1e1e] relative">
          {/* Dev Server Logs */}
          <div 
            className={`absolute inset-0 overflow-y-auto p-4 font-mono text-xs text-gray-800 dark:text-gray-300 space-y-1 ${
              activeTab === 'bolt' ? 'block' : 'hidden'
            }`}
          >
            {devServerLogs.length > 0 ? (
              devServerLogs.map((line, index) => (
                <div key={index} className="whitespace-pre-wrap break-all border-b border-gray-100 dark:border-white/5 pb-0.5 mb-0.5 last:border-0">
                  {line}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                <div className="p-3 bg-white/5 rounded-full">
                  <span className="text-2xl">🚀</span>
                </div>
                <p>Ready to start development server...</p>
              </div>
            )}
          </div>

          {/* Terminals */}
          {terminals.map((terminal) => (
            <div 
              key={terminal.id} 
              className="absolute inset-0"
              style={{ 
                visibility: activeTab === terminal.id ? 'visible' : 'hidden',
                zIndex: activeTab === terminal.id ? 10 : 0 
              }}
            >
              <Terminal 
                containerId={terminal.id} 
                socketUrl="" 
                theme={'dark'} // 暂时强制使用 dark 主题，避免 SSR 错误
                sessionId={sessionId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
