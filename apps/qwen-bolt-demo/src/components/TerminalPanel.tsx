'use client';

import React, { useState } from 'react';
import { Terminal as TerminalIcon, Plus, X } from 'lucide-react';

interface TerminalTab {
  id: string;
  name: string;
  content: string[];
}

interface TerminalPanelProps {
  devServerLogs?: string[];
  publishLogs?: string[];
}

export function TerminalPanel({ devServerLogs = [], publishLogs = [] }: TerminalPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('bolt');
  const [terminals, setTerminals] = useState<TerminalTab[]>([
    { id: 'terminal-1', name: 'Terminal', content: [] }
  ]);

  // Add new terminal
  const addTerminal = () => {
    const newId = `terminal-${terminals.length + 1}`;
    setTerminals([...terminals, { id: newId, name: `Terminal ${terminals.length + 1}`, content: [] }]);
    setActiveTab(newId);
  };

  // Remove terminal
  const removeTerminal = (id: string) => {
    const filtered = terminals.filter(t => t.id !== id);
    setTerminals(filtered);
    if (activeTab === id && filtered.length > 0) {
      setActiveTab(filtered[0].id);
    }
  };

  // Get content for active tab
  const getActiveContent = () => {
    if (activeTab === 'bolt') {
      return devServerLogs;
    } else if (activeTab === 'publish') {
      return publishLogs;
    } else {
      const terminal = terminals.find(t => t.id === activeTab);
      return terminal?.content || [];
    }
  };

  const activeContent = getActiveContent();

  return (
    <div className="h-full flex flex-col bg-gray-900 border-t border-gray-700">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-700 bg-gray-800">
        {/* Bolt tab */}
        <button
          onClick={() => setActiveTab('bolt')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
            activeTab === 'bolt'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <span className="text-yellow-400">⚡</span>
          <span>Bolt</span>
        </button>

        {/* Publish Output tab */}
        <button
          onClick={() => setActiveTab('publish')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
            activeTab === 'publish'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <span>📤</span>
          <span>Publish Output</span>
        </button>

        {/* Terminal tabs */}
        {terminals.map((terminal) => (
          <button
            key={terminal.id}
            onClick={() => setActiveTab(terminal.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors group ${
              activeTab === terminal.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <TerminalIcon className="w-3 h-3" />
            <span>{terminal.name}</span>
            {terminals.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeTerminal(terminal.id);
                }}
                className="ml-1 opacity-0 group-hover:opacity-100 hover:bg-gray-600 rounded p-0.5 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </button>
        ))}

        {/* Add terminal button */}
        <button
          onClick={addTerminal}
          className="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
          title="Add Terminal"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-gray-300 bg-gray-950">
        {activeContent.length > 0 ? (
          <div className="space-y-1">
            {activeContent.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap break-all">
                {line}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">
            {activeTab === 'bolt' && 'No development server logs yet'}
            {activeTab === 'publish' && 'No publish output yet'}
            {activeTab.startsWith('terminal-') && 'Terminal ready'}
          </div>
        )}
      </div>
    </div>
  );
}
