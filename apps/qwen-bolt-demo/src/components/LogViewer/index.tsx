'use client';

import React from 'react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warning' | 'success';
  message: string;
}

interface LogViewerProps {
  logs: LogEntry[];
  onClear?: () => void;
  loading?: boolean;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, onClear, loading = false }) => {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'success':
        return 'text-green-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#1e1e1e] p-4 font-mono text-sm">
      {loading && (
        <div className="mb-2 text-blue-400">
          <span className="animate-pulse">● Executing...</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            No logs yet. Run code to see output.
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1">
              <span className="text-gray-500">[{log.timestamp}]</span>{' '}
              <span className={getLevelColor(log.level)}>{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LogViewer;
