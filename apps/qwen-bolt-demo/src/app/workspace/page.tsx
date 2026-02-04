'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProject } from '@/contexts/ProjectContext';
import { TerminalPanel } from '@/components/TerminalPanel';
import { useChat } from '@/hooks/useChat';
import { useFiles } from '@/hooks/useFiles';
import { useDevServer } from '@/hooks/useDevServer';
import { useResizablePanel } from '@/hooks/useResizablePanel';
import {
  ChatHeader,
  MessageList,
  ChatInput,
  ViewModeToggle,
  CodePanel,
  PreviewPanel,
  ViewMode,
} from '@/components/workspace';

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt') || '';
  const { settings } = useProject();
  
  // UI state
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('code');
  
  // Custom Hooks
  // 1. Files & Session Management
  const { 
    files, 
    activeFile, 
    setActiveFile, 
    sessionId, 
    setSessionId, 
    loadAllFiles 
  } = useFiles();

  // 2. Chat Management
  const {
    input,
    setInput,
    messages,
    isLoading,
    currentResponse,
    attachedFiles,
    setAttachedFiles,
    sendMessage
  } = useChat({
    settings,
    sessionId,
    setSessionId,
    loadAllFiles
  });

  // 3. Dev Server & Preview Management
  const {
    previewUrl,
    setPreviewUrl,
    devServer,
    setDevServer,
    isStartingServer,
    serverError,
    devServerLogs,
    startDevServer,
    refreshPreview,
    isWebContainerLoading,
    webContainerError
  } = useDevServer(sessionId, files);

  // 4. Resizable Terminal Panel
  const { 
    height: terminalHeight, 
    setHeight: setTerminalHeight,
    isDragging, 
    handleDragStart 
  } = useResizablePanel(320);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cleanup: Stop dev server when component unmounts
  // With WebContainer, the browser manages the lifecycle, so explicit server-side cleanup is less critical for the runtime,
  // but we might still want to clean up the session folder on the backend if needed.
  // For now, we'll remove the explicit DELETE /api/dev-server call since we are using WebContainer.
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  // Auto-send initial prompt
  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      sendMessage(initialPrompt);
    }
  }, [initialPrompt, messages.length, sendMessage]);

  // Handle open in new tab
  const handleOpenInNewTab = () => {
    window.open(previewUrl, '_blank');
  };

  // Debug log
  console.log('[Workspace Debug]', {
    sessionId,
    filesCount: Object.keys(files).length,
    previewUrl,
    devServer,
    isStartingServer,
    serverError,
  });

  return (
    <div className="flex h-screen bg-white dark:bg-black text-gray-900 dark:text-white relative transition-colors">
      {/* Left: Chat area */}
      <div className="w-[480px] flex flex-col border-r border-gray-200/60 dark:border-gray-800/60">
        <ChatHeader />
        
        <MessageList
          messages={messages}
          currentResponse={currentResponse}
          messagesEndRef={messagesEndRef}
        />
        
        <ChatInput
          input={input}
          isLoading={isLoading}
          attachedFiles={attachedFiles}
          onInputChange={setInput}
          onSend={() => sendMessage()}
          onFilesAttached={(newFiles) => setAttachedFiles(prev => [...prev, ...newFiles])}
          onFileRemoved={(fileId) => setAttachedFiles(prev => prev.filter(f => f.id !== fileId))}
          onFolderRemoved={(folderName) => setAttachedFiles(prev => prev.filter(f => f.folderName !== folderName))}
        />
      </div>

      {/* Middle & Right: Code editor and Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main content area */}
          <div className={`flex overflow-hidden ${isTerminalOpen ? 'flex-1' : 'h-full'}`}>
            {viewMode === 'code' && (
              <div className="w-full flex overflow-hidden">
                <CodePanel
                  files={files}
                  activeFile={activeFile}
                  sessionId={sessionId}
                  isLoading={isLoading}
                  onSelectFile={setActiveFile}
                  onCodeChange={(code, filename) => console.log('Code changed:', filename)}
                />
              </div>
            )}

            {viewMode === 'preview' && (
              <PreviewPanel
                previewUrl={previewUrl}
                devServer={devServer}
                isStartingServer={isStartingServer}
                serverError={serverError}
                sessionId={sessionId}
                hasFiles={Object.keys(files).length > 0}
                onStartServer={startDevServer}
                onRefresh={refreshPreview}
                onOpenInNewTab={handleOpenInNewTab}
              />
            )}
          </div>

          {/* Terminal Panel with Resizable Handle */}
          <div 
            ref={containerRef}
            className="flex flex-col"
            style={{ height: isTerminalOpen ? terminalHeight : 'auto' }}
          >
            {/* Drag Handle - serves as both border and resize handle */}
            {isTerminalOpen && (
              <>
                <div
                  onMouseDown={handleDragStart}
                  className={`h-2 flex-shrink-0 cursor-ns-resize transition-colors flex items-center justify-center group ${
                    isDragging ? 'bg-blue-500/20' : 'hover:bg-blue-500/10'
                  }`}
                  title="Drag to resize"
                >
                  <div className={`w-12 h-1 rounded-full transition-colors ${
                    isDragging ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-500 group-hover:bg-blue-400'
                  }`} />
                </div>
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              </>
            )}
            {!isTerminalOpen && (
              <div className="h-px bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            )}
            <TerminalPanel 
              devServerLogs={devServerLogs} 
              sessionId={sessionId}
              isOpen={isTerminalOpen}
              onToggle={() => setIsTerminalOpen(!isTerminalOpen)}
              onServerDetected={(port) => {
                console.log('[Workspace] Server detected on port:', port);
                const url = `http://localhost:${port}`;
                setPreviewUrl(url);
                setDevServer({ port, framework: 'Manual', url });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
      <WorkspaceContent />
    </Suspense>
  );
}
