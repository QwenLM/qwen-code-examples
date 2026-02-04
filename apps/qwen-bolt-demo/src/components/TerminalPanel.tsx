'use client';

import React, { useState } from 'react';
import { Terminal as TerminalIcon, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

interface TerminalTab {
  id: string;
  name: string;
  content: string[];
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
    } else {
      const terminal = terminals.find(t => t.id === activeTab);
      return terminal?.content || [];
    }
  };

  const activeContent = getActiveContent();

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-1">
          {/* Dev Server tab */}
          <button
            onClick={() => setActiveTab('bolt')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
              activeTab === 'bolt'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'
            }`}
          >
            <span className="text-blue-400">🚀</span>
            <span>Dev Server</span>
          </button>

          {/* Terminal tabs */}
          {terminals.map((terminal) => (
            <button
              key={terminal.id}
              onClick={() => setActiveTab(terminal.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors group ${
                activeTab === terminal.id
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'
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
            className="flex items-center justify-center w-6 h-6 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors"
            title="Add Terminal"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Hide/Show button */}
        {onToggle && (
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors"
            title={isOpen ? 'Hide Terminal' : 'Show Terminal'}
          >
            <span>{isOpen ? 'Hide' : 'Show'}</span>
            {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Terminal content */}
      {isOpen && (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-950">
          {/* Output area */}
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-gray-800 dark:text-gray-100">
            {activeContent.length > 0 ? (
              <div className="space-y-1">
                {activeContent.map((line, index) => (
                  <div key={index} className="whitespace-pre-wrap break-all">
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-500 text-center py-8">
                {activeTab === 'bolt' && 'No development server logs yet'}
                {activeTab.startsWith('terminal-') && 'Terminal ready'}
              </div>
            )}
          </div>

          {/* Input area for Terminal tabs only */}
          {activeTab.startsWith('terminal-') && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2">
              <span className="text-green-400 font-mono text-xs">$</span>
              <input
                type="text"
                placeholder="Enter command..."
                className="flex-1 bg-transparent border-none outline-none text-gray-800 dark:text-gray-100 font-mono text-xs placeholder-gray-500 dark:placeholder-gray-400"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget;
                    const command = input.value.trim();
                    if (command) {
                      // Add command to terminal content
                      const terminal = terminals.find(t => t.id === activeTab);
                      if (terminal) {
                        // Show command immediately
                        let updatedTerminals = terminals.map(t =>
                          t.id === activeTab
                            ? { ...t, content: [...t.content, `$ ${command}`] }
                            : t
                        );
                        setTerminals(updatedTerminals);
                        input.value = '';

                        // Execute command via API with streaming
                        if (sessionId) {
                          try {
                            const response = await fetch('/api/terminal', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ sessionId, command }),
                            });

                            if (!response.ok) {
                              throw new Error(`HTTP error! status: ${response.status}`);
                            }

                            // Read the stream
                            const reader = response.body?.getReader();
                            const decoder = new TextDecoder();

                            if (reader) {
                              while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;

                                const chunk = decoder.decode(value);
                                const lines = chunk.split('\n');

                                for (const line of lines) {
                                  if (line.startsWith('data: ')) {
                                    try {
                                      const data = JSON.parse(line.slice(6));
                                      
                                      if (data.type === 'output') {
                                        // Append output in real-time
                                        setTerminals(prev => prev.map(t =>
                                          t.id === activeTab
                                            ? { ...t, content: [...t.content, data.data] }
                                            : t
                                        ));
                                        
                                        // Detect server start with port
                                        const portMatch = data.data.match(/(?:localhost:|port\s+)(\d{4,5})/i);
                                        if (portMatch && onServerDetected) {
                                          const detectedPort = parseInt(portMatch[1]);
                                          if (detectedPort >= 3000 && detectedPort <= 9999) {
                                            onServerDetected(detectedPort);
                                          }
                                        }
                                      } else if (data.type === 'complete') {
                                        // Command completed
                                        setTerminals(prev => prev.map(t =>
                                          t.id === activeTab
                                            ? { 
                                                ...t, 
                                                content: [
                                                  ...t.content, 
                                                  `\n[Process exited with code ${data.exitCode}]`
                                                ] 
                                              }
                                            : t
                                        ));
                                      } else if (data.type === 'error') {
                                        // Error occurred
                                        setTerminals(prev => prev.map(t =>
                                          t.id === activeTab
                                            ? { 
                                                ...t, 
                                                content: [...t.content, `\nError: ${data.error}`] 
                                              }
                                            : t
                                        ));
                                      }
                                    } catch (parseError) {
                                      console.error('Failed to parse SSE data:', parseError);
                                    }
                                  }
                                }
                              }
                            }
                          } catch (error) {
                            // Update with error
                            setTerminals(prev => prev.map(t =>
                              t.id === activeTab
                                ? { 
                                    ...t, 
                                    content: [
                                      ...t.content,
                                      `\nError: ${error instanceof Error ? error.message : 'Failed to execute command'}`
                                    ] 
                                  }
                                : t
                            ));
                          }
                        } else {
                          // No session ID
                          setTerminals(prev => prev.map(t =>
                            t.id === activeTab
                              ? { 
                                  ...t, 
                                  content: [...t.content, '\nError: No session ID available'] 
                                }
                              : t
                          ));
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
